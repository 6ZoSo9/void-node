#!/usr/bin/env bash
set -Eeuo pipefail

BESU_IMAGE="${BESU_IMAGE:-hyperledger/besu@sha256:6f3f21ce533383fcc8db3bce02252b59d5a9e776b72b5a1c8ecd2db011600042}"
EXPECTED_PLUGIN_SHA="6637c57b64666e7761a8e254e7968a60f4a80bef05e070be8e8b934d887d5518"
plugin_root="besu-plugins/epoch2-raw-transaction-domain-v1"
jar_name="void-epoch2-raw-transaction-domain-plugin-v1.jar"
work="${RUNNER_TEMP:?RUNNER_TEMP required}/void-besu-raw-domain-peer-import-v1"
producer_data="$work/producer-data"
observer_data="$work/observer-data"
plugins_dir="$work/plugins"
network="void-besu-peer-import-${GITHUB_RUN_ID:-local}-${GITHUB_RUN_ATTEMPT:-1}"
producer_container="$network-producer"
observer_container="$network-observer"
evidence="$work/void-economic-epoch2-besu-raw-transaction-validator-peer-import-v1.json"

cleanup() {
  for container in "$observer_container" "$producer_container"; do
    if docker inspect "$container" >/dev/null 2>&1; then
      docker logs "$container" > "$work/${container##*-}.log" 2>&1 || true
      docker rm -f "$container" >/dev/null 2>&1 || true
    fi
  done
  docker network rm "$network" >/dev/null 2>&1 || true
  rm -f "$producer_data/key"
  rm -rf "$plugin_root/target"
}
trap cleanup EXIT INT TERM

mkdir -p "$work" "$producer_data" "$observer_data" "$plugins_dir"
chmod 0777 "$producer_data" "$observer_data"

echo "VOID_ECONOMIC_EPOCH2_BESU_RAW_TRANSACTION_VALIDATOR_PEER_IMPORT_V1"
echo "besu_image=$BESU_IMAGE"
echo "canonical_plugin_sha256=$EXPECTED_PLUGIN_SHA"
echo "runtime_scope=hosted_disposable_two_node_qbft"
echo "production_rpc_contact=false"
echo "user_wallet_access=false"
echo "production_validator_mutation=false"
echo "authoritative_chain2050_write=false"
echo "cross_epoch_replay_protection_proven=false"
echo "funds_movement=false"

docker pull "$BESU_IMAGE"
BESU_REPODIGEST="$(docker inspect --format='{{index .RepoDigests 0}}' "$BESU_IMAGE")"
test "$BESU_REPODIGEST" = "$BESU_IMAGE"

mvn -B -ntp -f "$plugin_root/pom.xml" clean test package
jar_path="$plugin_root/target/$jar_name"
test -s "$jar_path"
plugin_sha="$(sha256sum "$jar_path" | awk '{print $1}')"
test "$plugin_sha" = "$EXPECTED_PLUGIN_SHA"
install -m 0444 "$jar_path" "$plugins_dir/$jar_name"

service_path="META-INF/services/org.hyperledger.besu.plugin.BesuPlugin"
service_tmp="$(mktemp -d)"
(
  cd "$service_tmp"
  jar xf "$OLDPWD/$plugins_dir/$jar_name" "$service_path"
)
test "$(cat "$service_tmp/$service_path")" =   "org.voidnetwork.besu.epoch2.VoidEpoch2RawTransactionDomainPlugin"
rm -rf "$service_tmp"

umask 077
openssl rand -hex 32 > "$producer_data/key"
chmod 0444 "$producer_data/key"
test "$(wc -c < "$producer_data/key")" -eq 65

validator_address="$(
  node - "$producer_data/key" <<'NODE'
const fs = require("node:fs");
const { computeAddress } = require("ethers");
const key = fs.readFileSync(process.argv[2], "utf8").trim();
if (!/^[0-9a-fA-F]{64}$/.test(key)) throw new Error("validator_key_format_invalid");
process.stdout.write(computeAddress("0x" + key).toLowerCase());
NODE
)"
printf '%s\n' "$validator_address" | grep -Eq '^0x[0-9a-f]{40}$'

printf '["%s"]\n' "$validator_address" > "$work/validators.json"
chmod 0444 "$work/validators.json"

docker run --rm   -v "$work:/work:ro"   "$BESU_IMAGE"   rlp encode   --from=/work/validators.json   --type=QBFT_EXTRA_DATA   > "$work/qbft-extra-data.txt"
grep -Eq '^0x[0-9a-fA-F]+$' "$work/qbft-extra-data.txt"

node scripts/prove_void_economic_epoch2_besu_raw_transaction_validator_peer_import_v1.mjs   prepare   "$work"   "$validator_address"   "$work/qbft-extra-data.txt"

docker network create "$network" >/dev/null

common_args=(
  --genesis-file=/work/genesis.json
  --network-id=2050
  --rpc-http-enabled=true
  --rpc-http-host=0.0.0.0
  --rpc-http-port=8545
  --rpc-http-api=ETH,NET,QBFT,ADMIN,DEBUG
  --host-allowlist=*
  --min-gas-price=0
  --tx-pool-enable-balance-check=false
  --discovery-enabled=false
  --p2p-host=0.0.0.0
  --p2p-port=30303
  --logging=INFO
  --revert-reason-enabled=true
)

docker run -d   --name "$producer_container"   --network "$network"   -p 127.0.0.1:18554:8545   -v "$producer_data:/data"   -v "$work:/work:ro"   "$BESU_IMAGE"   --data-path=/data   "${common_args[@]}"   > "$work/producer-container-id.txt"

docker run -d   --name "$observer_container"   --network "$network"   -e 'BESU_OPTS=-Dbesu.plugins.dir=/plugins'   -p 127.0.0.1:18555:8545   -v "$observer_data:/data"   -v "$work:/work:ro"   -v "$plugins_dir:/plugins:ro"   "$BESU_IMAGE"   --Xplugins-external-enabled=true   --plugins=VoidEpoch2RawTransactionDomainPlugin   --data-path=/data   "${common_args[@]}"   > "$work/observer-container-id.txt"

for port in 18554 18555; do
  ready=false
  for _ in $(seq 1 120); do
    reply="$(
      curl -fsS --max-time 5         -H 'content-type: application/json'         --data '{"jsonrpc":"2.0","id":1,"method":"eth_chainId","params":[]}'         "http://127.0.0.1:$port/" 2>/dev/null || true
    )"
    if printf '%s' "$reply" | grep -q '"0x802"'; then
      ready=true
      break
    fi
    sleep 0.5
  done
  if [ "$ready" != "true" ]; then
    docker logs "$producer_container" || true
    docker logs "$observer_container" || true
    exit 1
  fi
done

docker logs "$observer_container" > "$work/observer.log" 2>&1
grep -F   "Registered plugin of type org.voidnetwork.besu.epoch2.VoidEpoch2RawTransactionDomainPlugin"   "$work/observer.log"
grep -F "Registered new transaction validator rule" "$work/observer.log"

producer_ip="$(
  docker inspect     --format='{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}'     "$producer_container"
)"
printf '%s\n' "$producer_ip" | grep -Eq '^[0-9]+(\.[0-9]+){3}$'

node scripts/prove_void_economic_epoch2_besu_raw_transaction_validator_peer_import_v1.mjs   verify   http://127.0.0.1:18554/   http://127.0.0.1:18555/   "$producer_ip"   "$evidence"   "$plugin_sha"   "$BESU_REPODIGEST"

test -s "$evidence"
node - "$evidence" <<'NODE'
const fs = require("node:fs");
const x = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
if (x.status !== "PEER_IMPORTED_UNMARKED_BLOCK_REJECTED") process.exit(1);
if (x.gates?.exact_plugin_peer_import_protocol_rejection_proven !== true) process.exit(1);
if (x.gates?.all_production_validators_epoch_domain_enforced !== false) process.exit(1);
if (x.gates?.cross_epoch_replay_protection_proven !== false) process.exit(1);
NODE

docker stop --time 10 "$observer_container" >/dev/null
docker stop --time 10 "$producer_container" >/dev/null
docker logs "$observer_container" > "$work/observer.log" 2>&1
docker logs "$producer_container" > "$work/producer.log" 2>&1
docker rm "$observer_container" "$producer_container" >/dev/null
docker network rm "$network" >/dev/null

rm -f "$producer_data/key"
rm -rf "$plugin_root/target"
test ! -e "$producer_data/key"
test -z "$(git status --porcelain=v1 --untracked-files=all)"

echo "VOID_ECONOMIC_EPOCH2_BESU_RAW_TRANSACTION_VALIDATOR_PEER_IMPORT_V1_GREEN"
echo "exact_plugin_peer_import_protocol_rejection_proven=true"
echo "all_production_validators_epoch_domain_enforced=false"
echo "cross_epoch_replay_protection_proven=false"
echo "authoritative_chain2050_write=false"
echo "funds_movement=false"
