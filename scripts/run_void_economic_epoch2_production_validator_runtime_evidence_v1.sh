#!/usr/bin/env bash
set -Eeuo pipefail

BESU_IMAGE="hyperledger/besu@sha256:6f3f21ce533383fcc8db3bce02252b59d5a9e776b72b5a1c8ecd2db011600042"
PLUGIN_NAME="VoidEpoch2RawTransactionDomainPlugin"
EXPECTED_PLUGIN_SHA="6637c57b64666e7761a8e254e7968a60f4a80bef05e070be8e8b934d887d5518"

role="${1:?usage: $0 ROLE PLUGIN_JAR OUTPUT_JSON [PROVENANCE_DIR]}"
plugin_jar="${2:?usage: $0 ROLE PLUGIN_JAR OUTPUT_JSON [PROVENANCE_DIR]}"
output="${3:?usage: $0 ROLE PLUGIN_JAR OUTPUT_JSON [PROVENANCE_DIR]}"
provenance_dir="${4:-}"

case "$role" in
  precision|nimo|xiphos) ;;
  *) echo "unsupported machine role: $role" >&2; exit 2 ;;
esac

repo="$PWD"
test -d "$repo/.git"
test "$(git branch --show-current)" = "main"
test -z "$(git status --porcelain=v1 --untracked-files=all)"
test -f "$plugin_jar"
test ! -L "$plugin_jar"
test ! -e "$output"

if [ -n "$provenance_dir" ]; then
  case "$provenance_dir" in
    /*) ;;
    *) echo "provenance directory must be absolute" >&2; exit 2 ;;
  esac
  test ! -e "$provenance_dir"
  provenance_parent="$(dirname "$provenance_dir")"
  test -d "$provenance_parent"
  test ! -L "$provenance_parent"
  repo_real="$(realpath "$repo")"
  provenance_real="$(realpath -m "$provenance_dir")"
  case "$provenance_real" in
    "$repo_real"|"$repo_real"/*)
      echo "provenance directory must be outside repository" >&2
      exit 2
      ;;
  esac
fi

identity="ops/mainnet0/economic-epoch2-qbft-node-identity-${role}-v1.json"
binding="ops/mainnet0/economic-epoch2-qbft-validator-binding-candidate-v1.json"
test -f "$identity"
test -f "$binding"

mapfile -t canonical < <(
  node --input-type=module - "$role" <<'NODE'
import fs from "node:fs";
const role=process.argv[2];
const identity=JSON.parse(fs.readFileSync(
  `ops/mainnet0/economic-epoch2-qbft-node-identity-${role}-v1.json`,
  "utf8",
));
const binding=JSON.parse(fs.readFileSync(
  "ops/mainnet0/economic-epoch2-qbft-validator-binding-candidate-v1.json",
  "utf8",
));
const entry=binding.qbft.production_binding_entries.find((x)=>x.machine_role===role);
if(!entry) throw new Error("canonical_binding_entry_missing");
for(const value of [
  identity.hostname,
  identity.node_base,
  entry.void_node_id,
  entry.besu_public_key,
  entry.besu_validator_address,
  entry.node_identity_attestation_sha256,
]){
  console.log(String(value));
}
NODE
)

canonical_hostname="${canonical[0]}"
node_base="${canonical[1]}"
expected_node_id="${canonical[2]}"
expected_public_key="${canonical[3]}"
expected_validator_address="${canonical[4]}"
expected_attestation_sha="${canonical[5]}"

test "$(hostname)" = "$canonical_hostname"
case "$node_base" in
  http://127.0.0.1:*|http://localhost:*) ;;
  *) echo "canonical node base is not loopback: $node_base" >&2; exit 2 ;;
esac

health="$(curl -fsS --max-time 5 "${node_base%/}/health")"
health_node_id="$(
  printf '%s' "$health" | node --input-type=module -e '
    let s="";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data",d=>s+=d);
    process.stdin.on("end",()=>{
      const x=JSON.parse(s);
      if(x?.ok!==true) throw new Error("health_not_ok");
      const id=String(x.nodeId??x.node_id??x?.node?.id??"")
        .toLowerCase().replace(/^0x/,"");
      if(!/^[0-9a-f]{32}$/.test(id)) throw new Error("health_node_id_invalid");
      process.stdout.write(id);
    });
  '
)"
test "$health_node_id" = "$expected_node_id"

key_path="$HOME/.local/share/void/epoch2-qbft-validator-identity-v1/$role/nodekey"
test -f "$key_path"
test ! -L "$key_path"
key_mode="$(stat -c '%a' "$key_path")"
case "$key_mode" in 400|600) ;; *) echo "invalid nodekey mode: $key_mode" >&2; exit 2 ;; esac

mapfile -t derived < <(
  node - "$key_path" <<'NODE'
const fs=require("node:fs");
const {SigningKey,computeAddress}=require("ethers");
const raw=fs.readFileSync(process.argv[2],"utf8").trim().toLowerCase().replace(/^0x/,"");
if(!/^[0-9a-f]{64}$/.test(raw)) throw new Error("nodekey_shape_invalid");
const key=new SigningKey("0x"+raw);
const publicKey=key.publicKey.toLowerCase();
console.log(publicKey);
console.log(computeAddress(publicKey).toLowerCase());
NODE
)
derived_public_key="${derived[0]}"
derived_validator_address="${derived[1]}"
test "$derived_public_key" = "$expected_public_key"
test "$derived_validator_address" = "$expected_validator_address"

plugin_sha="$(sha256sum "$plugin_jar" | awk '{print $1}')"
test "$plugin_sha" = "$EXPECTED_PLUGIN_SHA"

work="$(mktemp -d "${TMPDIR:-/tmp}/void-e2-validator-evidence-${role}.XXXXXX")"
chmod 0755 "$work"
container="void-e2-validator-evidence-${role}-$$"

cleanup() {
  docker rm -f "$container" >/dev/null 2>&1 || true
  rm -rf "$work"
}
trap cleanup EXIT INT TERM

mkdir -p "$work/config" "$work/plugins" "$work/data" "$work/fail-data" "$work/empty-plugins"
chmod 0755 "$work/config" "$work/plugins" "$work/empty-plugins"
chmod 0777 "$work/data" "$work/fail-data"
install -m 0444 "$plugin_jar" "$work/plugins/void-epoch2-raw-transaction-domain-plugin-v1.jar"

echo "VOID_ECONOMIC_EPOCH2_PRODUCTION_VALIDATOR_RUNTIME_EVIDENCE_V1"
echo "machine_role=$role"
echo "hostname=$(hostname)"
echo "void_node_id=$expected_node_id"
echo "besu_validator_address=$expected_validator_address"
echo "node_private_key_path=$key_path"
echo "node_private_key_mode=$key_mode"
echo "node_private_key_content_exported=false"
echo "node_private_key_stdout=false"
echo "production_rpc_contact=false"
echo "authoritative_chain2050_write=false"
echo "validator_mutation=false"
echo "funds_movement=false"

docker pull "$BESU_IMAGE" >/dev/null
observed_image="$(docker inspect --format='{{index .RepoDigests 0}}' "$BESU_IMAGE")"
test "$observed_image" = "$BESU_IMAGE"

printf '["%s"]\n' "$expected_validator_address" > "$work/validators.json"
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
  "$expected_validator_address" \
  "$work/qbft-extra-data.txt"

chmod 0444 "$work/genesis.json"

# Prove requested-plugin startup fails closed when the canonical plugin is absent.
set +e
timeout 20s docker run --rm \
  -e 'BESU_OPTS=-Dbesu.plugins.dir=/plugins' \
  -v "$key_path:/key/nodekey:ro" \
  -v "$work/fail-data:/data" \
  -v "$work/genesis.json:/config/genesis.json:ro" \
  -v "$work/empty-plugins:/plugins:ro" \
  "$BESU_IMAGE" \
  --Xplugins-external-enabled=true \
  --plugins="$PLUGIN_NAME" \
  --node-private-key-file=/key/nodekey \
  --genesis-file=/config/genesis.json \
  --data-path=/data \
  --network-id=2050 \
  --rpc-http-enabled=false \
  --discovery-enabled=false \
  --p2p-host=127.0.0.1 \
  --p2p-port=30303 \
  --min-gas-price=0 \
  --tx-pool-enable-balance-check=false \
  > "$work/fail-closed.log" 2>&1
fail_status=$?
set -e

if [ "$fail_status" -eq 0 ] || [ "$fail_status" -eq 124 ]; then
  cat "$work/fail-closed.log" >&2
  echo "requested plugin absence did not fail closed" >&2
  exit 1
fi
grep -F "$PLUGIN_NAME" "$work/fail-closed.log" >/dev/null
echo "startup_fail_closed_on_plugin_mismatch=true"

rpc_port="$(
  python3 - <<'PY'
import socket
s=socket.socket()
s.bind(("127.0.0.1",0))
print(s.getsockname()[1])
s.close()
PY
)"

docker run -d \
  --name "$container" \
  -e 'BESU_OPTS=-Dbesu.plugins.dir=/plugins' \
  -p "127.0.0.1:${rpc_port}:8545" \
  -v "$key_path:/key/nodekey:ro" \
  -v "$work/data:/data" \
  -v "$work/genesis.json:/config/genesis.json:ro" \
  -v "$work/plugins:/plugins:ro" \
  "$BESU_IMAGE" \
  --Xplugins-external-enabled=true \
  --plugins="$PLUGIN_NAME" \
  --node-private-key-file=/key/nodekey \
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
  >/dev/null

port_binding="$(docker port "$container" 8545/tcp)"
test "$port_binding" = "127.0.0.1:$rpc_port"
echo "raw_public_rpc_disabled=true"
echo "external_p2p_exposure=false"

rpc="http://127.0.0.1:${rpc_port}/"
ready=false
for _ in $(seq 1 120); do
  reply="$(
    curl -fsS --max-time 5 \
      -H 'content-type: application/json' \
      --data '{"jsonrpc":"2.0","id":1,"method":"eth_chainId","params":[]}' \
      "$rpc" 2>/dev/null || true
  )"
  if printf '%s' "$reply" | grep -q '"0x802"'; then
    ready=true
    break
  fi
  sleep 0.5
done
if [ "$ready" != true ]; then
  docker logs "$container" >&2 || true
  exit 1
fi

docker logs "$container" > "$work/besu.log" 2>&1
grep -F "Registered plugin of type org.voidnetwork.besu.epoch2.VoidEpoch2RawTransactionDomainPlugin" "$work/besu.log" >/dev/null
grep -F "Registered new transaction validator rule" "$work/besu.log" >/dev/null

node scripts/prove_void_economic_epoch2_besu_raw_transaction_validator_runtime_v1.mjs \
  verify \
  "$rpc" \
  "$work/capability-result.json"

docker logs "$container" > "$work/besu.log" 2>&1
docker stop --time 10 "$container" >/dev/null
docker rm "$container" >/dev/null

runtime_sha="$(sha256sum "$work/capability-result.json" | awk '{print $1}')"
besu_log_sha="$(sha256sum "$work/besu.log" | awk '{print $1}')"
observed_at="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
valid_until="$(date -u -d "$observed_at + 1 hour" +%Y-%m-%dT%H:%M:%SZ)"

ROLE="$role" \
HOSTNAME_NOW="$(hostname)" \
NODE_ID="$expected_node_id" \
VALIDATOR_ADDRESS="$expected_validator_address" \
PUBLIC_KEY="$expected_public_key" \
KEY_PATH="$key_path" \
KEY_MODE="$key_mode" \
BESU_IMAGE_NOW="$observed_image" \
PLUGIN_NAME_NOW="$PLUGIN_NAME" \
PLUGIN_SHA_NOW="$plugin_sha" \
RUNTIME_SHA="$runtime_sha" \
LOG_SHA="$besu_log_sha" \
node --input-type=module <<'NODE' > "$work/runtime-facts.json"
const x={
  marker:"VOID_ECONOMIC_EPOCH2_PRODUCTION_VALIDATOR_LOCAL_RUNTIME_FACTS_V1",
  version:1,
  machine_role:process.env.ROLE,
  hostname:process.env.HOSTNAME_NOW,
  void_node_id:process.env.NODE_ID,
  besu_validator_address:process.env.VALIDATOR_ADDRESS,
  besu_public_key:process.env.PUBLIC_KEY,
  node_private_key_path:process.env.KEY_PATH,
  node_private_key_mode:process.env.KEY_MODE,
  node_private_key_matches_canonical_identity:true,
  node_private_key_content_exported:false,
  node_private_key_stdout:false,
  void_health_loopback_verified:true,
  besu_image:process.env.BESU_IMAGE_NOW,
  plugin_name:process.env.PLUGIN_NAME_NOW,
  plugin_jar_sha256:process.env.PLUGIN_SHA_NOW,
  plugin_loaded:true,
  transaction_validation_rule_registered:true,
  local_unmarked_raw_transaction_rejected:true,
  raw_public_rpc_disabled:true,
  rpc_host_binding:"127.0.0.1",
  external_p2p_exposure:false,
  startup_fail_closed_on_plugin_mismatch:true,
  production_rpc_contact:false,
  authoritative_chain2050_write:false,
  validator_mutation:false,
  funds_movement:false,
  runtime_result_sha256:process.env.RUNTIME_SHA,
  besu_log_sha256:process.env.LOG_SHA,
};
process.stdout.write(JSON.stringify(x,null,2)+"\n");
NODE

node tools/void-economic-epoch2-production-validator-runtime-evidence-candidate-v1.mjs \
  --machine-role "$role" \
  --runtime-result "$work/capability-result.json" \
  --facts "$work/runtime-facts.json" \
  --plugin-jar "$plugin_jar" \
  --besu-log "$work/besu.log" \
  --observed-at-utc "$observed_at" \
  --valid-until-utc "$valid_until" \
  --output "$output"

test -s "$output"

if [ -n "$provenance_dir" ]; then
  log_bytes="$(stat -c '%s' "$work/besu.log")"
  test "$log_bytes" -gt 0
  test "$log_bytes" -le 8388608

  mkdir -m 0700 "$provenance_dir"
  install -m 0600 "$output" "$provenance_dir/candidate.json"
  install -m 0600     "$work/capability-result.json"     "$provenance_dir/runtime-result.json"
  install -m 0600     "$work/runtime-facts.json"     "$provenance_dir/runtime-facts.json"
  install -m 0600 "$work/besu.log" "$provenance_dir/besu.log"

  candidate_sha="$(sha256sum "$provenance_dir/candidate.json" | awk '{print $1}')"
  persisted_runtime_sha="$(sha256sum "$provenance_dir/runtime-result.json" | awk '{print $1}')"
  facts_sha="$(sha256sum "$provenance_dir/runtime-facts.json" | awk '{print $1}')"
  persisted_log_sha="$(sha256sum "$provenance_dir/besu.log" | awk '{print $1}')"
  source_head="$(git rev-parse HEAD)"

  test "$persisted_runtime_sha" = "$runtime_sha"
  test "$persisted_log_sha" = "$besu_log_sha"

  ROLE="$role"   HOSTNAME_NOW="$(hostname)"   SOURCE_HEAD="$source_head"   OBSERVED_AT="$observed_at"   VALID_UNTIL="$valid_until"   PLUGIN_SHA="$plugin_sha"   CANDIDATE_SHA="$candidate_sha"   RUNTIME_SHA="$persisted_runtime_sha"   FACTS_SHA="$facts_sha"   LOG_SHA="$persisted_log_sha"   node --input-type=module <<'NODE' > "$work/provenance-manifest.json"
import crypto from "node:crypto";

const compare=(a,b)=>a<b?-1:a>b?1:0;
const canonical=(value)=>{
  if(value===null)return "null";
  if(typeof value==="string")return JSON.stringify(value);
  if(typeof value==="boolean")return value?"true":"false";
  if(typeof value==="number"&&Number.isSafeInteger(value))return String(value);
  if(Array.isArray(value))return "["+value.map(canonical).join(",")+"]";
  if(value&&typeof value==="object"){
    return "{"+Object.keys(value).sort(compare).map(
      (key)=>JSON.stringify(key)+":"+canonical(value[key]),
    ).join(",")+"}";
  }
  throw new Error("invalid_manifest_value");
};
const body={
  marker:"VOID_ECONOMIC_EPOCH2_PRODUCTION_VALIDATOR_RUNTIME_EVIDENCE_PROVENANCE_V1",
  version:1,
  machine_role:process.env.ROLE,
  hostname:process.env.HOSTNAME_NOW,
  source_head:process.env.SOURCE_HEAD,
  observed_at_utc:process.env.OBSERVED_AT,
  valid_until_utc:process.env.VALID_UNTIL,
  plugin_jar_sha256:process.env.PLUGIN_SHA,
  files:{
    candidate_sha256:process.env.CANDIDATE_SHA,
    runtime_result_sha256:process.env.RUNTIME_SHA,
    runtime_facts_sha256:process.env.FACTS_SHA,
    besu_log_sha256:process.env.LOG_SHA,
  },
  node_private_key_content_persisted:false,
  plugin_jar_persisted:false,
  production_rpc_contact:false,
  authoritative_chain2050_write:false,
  validator_mutation:false,
  funds_movement:false,
};
const bundleId="voide2vp1_"+crypto.createHash("sha256")
  .update(canonical(body)).digest("hex");
process.stdout.write(JSON.stringify({...body,bundle_id:bundleId},null,2)+"\n");
NODE
  install -m 0600     "$work/provenance-manifest.json"     "$provenance_dir/manifest.json"

  test "$(find "$provenance_dir" -mindepth 1 -maxdepth 1 -type f | wc -l)" = "5"
  test "$(find "$provenance_dir" -mindepth 1 -maxdepth 1 ! -type f | wc -l)" = "0"
fi

test -z "$(git status --porcelain=v1 --untracked-files=all)"

echo "VOID_ECONOMIC_EPOCH2_PRODUCTION_VALIDATOR_RUNTIME_EVIDENCE_V1_GREEN"
echo "machine_role=$role"
echo "runtime_result_sha256=$runtime_sha"
echo "besu_log_sha256=$besu_log_sha"
echo "evidence_output=$output"
if [ -n "$provenance_dir" ]; then
  echo "provenance_bundle_dir=$provenance_dir"
  echo "provenance_bundle_created=true"
else
  echo "provenance_bundle_created=false"
fi
echo "node_private_key_content_exported=false"
echo "node_private_key_content_persisted=false"
echo "plugin_jar_persisted=false"
echo "production_rpc_contact=false"
echo "authoritative_chain2050_write=false"
echo "validator_mutation=false"
echo "funds_movement=false"
