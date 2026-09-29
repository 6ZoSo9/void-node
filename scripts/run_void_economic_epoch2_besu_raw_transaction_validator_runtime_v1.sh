#!/usr/bin/env bash
set -Eeuo pipefail

BESU_IMAGE="${BESU_IMAGE:-hyperledger/besu@sha256:6f3f21ce533383fcc8db3bce02252b59d5a9e776b72b5a1c8ecd2db011600042}"
plugin_root="besu-plugins/epoch2-raw-transaction-domain-v1"
jar_name="void-epoch2-raw-transaction-domain-plugin-v1.jar"
work="${RUNNER_TEMP:?RUNNER_TEMP required}/void-besu-raw-domain-runtime-v1"
validator="$work/validator"
config_dir="$work/config"
plugins_dir="$work/plugins"
container="void-besu-raw-domain-runtime-v1-${GITHUB_RUN_ID:-local}-${GITHUB_RUN_ATTEMPT:-1}"

mkdir -p "$validator" "$config_dir" "$plugins_dir"
chmod 0777 "$validator"

cleanup() {
  if docker inspect "$container" >/dev/null 2>&1; then
    docker logs "$container" > "$work/besu.log" 2>&1 || true
    docker rm -f "$container" >/dev/null 2>&1 || true
  fi
  rm -f "$validator/key"
  rm -rf "$plugin_root/target"
}
trap cleanup EXIT INT TERM

echo "VOID_ECONOMIC_EPOCH2_BESU_RAW_TRANSACTION_VALIDATOR_RUNTIME_V1"
echo "besu_image=$BESU_IMAGE"
echo "plugin_installation_scope=hosted_disposable_container_only"
echo "production_rpc_contact=false"
echo "user_wallet_access=false"
echo "transaction_broadcast_to_production=false"
echo "authoritative_chain2050_write=false"
echo "validator_mutation=false"
echo "funds_movement=false"

docker pull "$BESU_IMAGE"
BESU_REPODIGEST="$(docker inspect --format='{{index .RepoDigests 0}}' "$BESU_IMAGE")"
test "$BESU_REPODIGEST" = "hyperledger/besu@sha256:6f3f21ce533383fcc8db3bce02252b59d5a9e776b72b5a1c8ecd2db011600042"

mvn -B -ntp -f "$plugin_root/pom.xml" clean test package
jar_path="$plugin_root/target/$jar_name"
test -s "$jar_path"
cp "$jar_path" "$work/plugin-first-build.jar"
first_sha="$(sha256sum "$work/plugin-first-build.jar" | awk '{print $1}')"

mvn -B -ntp -f "$plugin_root/pom.xml" clean test package
test -s "$jar_path"
second_sha="$(sha256sum "$jar_path" | awk '{print $1}')"
test "$first_sha" = "$second_sha"
echo "maven_reproducible_build_proven=true"
echo "plugin_jar_sha256=$second_sha"

install -m 0444 "$jar_path" "$plugins_dir/$jar_name"

service_path="META-INF/services/org.hyperledger.besu.plugin.BesuPlugin"
expected_service="org.voidnetwork.besu.epoch2.VoidEpoch2RawTransactionDomainPlugin"
jar tf "$plugins_dir/$jar_name" | grep -Fx "$service_path"
service_tmp="$(mktemp -d)"
(
  cd "$service_tmp"
  jar xf "$OLDPWD/$plugins_dir/$jar_name" "$service_path"
)
test "$(cat "$service_tmp/$service_path")" = "$expected_service"
rm -rf "$service_tmp"
echo "plugin_service_loader_verified=true"

umask 077
openssl rand -hex 32 > "$validator/key"
chmod 0444 "$validator/key"
test "$(wc -c < "$validator/key")" -eq 65

validator_address="$(
  node - "$validator/key" <<'NODE'
const fs = require("node:fs");
const { computeAddress } = require("ethers");
const key = fs.readFileSync(process.argv[2], "utf8").trim();
if (!/^[0-9a-fA-F]{64}$/.test(key)) {
  throw new Error("validator key format invalid");
}
process.stdout.write(computeAddress("0x" + key).toLowerCase());
NODE
)"
printf '%s\n' "$validator_address" | grep -Eq '^0x[0-9a-f]{40}$'

printf '["%s"]\n' "$validator_address" > "$work/validators.json"
chmod 0444 "$work/validators.json"

docker run --rm \
  -v "$work:/work:ro" \
  "$BESU_IMAGE" \
  rlp encode \
  --from=/work/validators.json \
  --type=QBFT_EXTRA_DATA \
  > "$work/qbft-extra-data.txt"

grep -Eq '^0x[0-9a-fA-F]+$' "$work/qbft-extra-data.txt"

node scripts/prove_void_economic_epoch2_besu_raw_transaction_validator_runtime_v1.mjs \
  prepare \
  "$work" \
  "$validator_address" \
  "$work/qbft-extra-data.txt"

install -m 0444 "$work/genesis.json" "$config_dir/genesis.json"

docker run -d \
  --name "$container" \
  -e 'BESU_OPTS=-Dbesu.plugins.dir=/plugins' \
  -p 127.0.0.1:18553:8545 \
  -v "$validator:/data" \
  -v "$config_dir:/config:ro" \
  -v "$plugins_dir:/plugins:ro" \
  "$BESU_IMAGE" \
  --Xplugins-external-enabled=true \
  --plugins=VoidEpoch2RawTransactionDomainPlugin \
  --genesis-file=/config/genesis.json \
  --data-path=/data \
  --network-id=2050 \
  --rpc-http-enabled=true \
  --rpc-http-host=0.0.0.0 \
  --rpc-http-port=8545 \
  --rpc-http-api=ETH,NET,QBFT \
  --host-allowlist='*' \
  --min-gas-price=0 \
  --tx-pool-enable-balance-check=false \
  --discovery-enabled=false \
  --p2p-host=127.0.0.1 \
  --p2p-port=30303 \
  --logging=INFO \
  --revert-reason-enabled=true \
  > "$work/container-id.txt"

ready=false
for _ in $(seq 1 120); do
  chain_reply="$(
    curl -fsS --max-time 5 \
      -H 'content-type: application/json' \
      --data '{"jsonrpc":"2.0","id":1,"method":"eth_chainId","params":[]}' \
      http://127.0.0.1:18553/ 2>/dev/null || true
  )"
  if printf '%s' "$chain_reply" | grep -q '"0x802"'; then
    ready=true
    break
  fi
  sleep 0.5
done

if [ "$ready" != "true" ]; then
  docker logs "$container" || true
  exit 1
fi

docker logs "$container" > "$work/besu.log" 2>&1
grep -F "Registered plugin of type org.voidnetwork.besu.epoch2.VoidEpoch2RawTransactionDomainPlugin" "$work/besu.log"
grep -F "Registered new transaction validator rule" "$work/besu.log"
echo "plugin_runtime_registration_verified=true"

node scripts/prove_void_economic_epoch2_besu_raw_transaction_validator_runtime_v1.mjs \
  verify \
  http://127.0.0.1:18553/ \
  "$work/capability-result.json"

docker logs "$container" > "$work/besu.log" 2>&1

node scripts/prove_void_economic_epoch2_besu_raw_transaction_validator_runtime_v1.mjs \
  finalize \
  "$work" \
  "$BESU_REPODIGEST"

test -s "$work/void-economic-epoch2-besu-raw-transaction-validator-runtime-v1.json"
test -s "$plugins_dir/$jar_name"

rm -f "$validator/key"
rm -rf "$plugin_root/target"
test ! -e "$validator/key"
test -z "$(git status --porcelain=v1 --untracked-files=all)"

echo "VOID_ECONOMIC_EPOCH2_BESU_RAW_TRANSACTION_VALIDATOR_RUNTIME_V1_GREEN"
