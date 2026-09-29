#!/usr/bin/env bash
set -Eeuo pipefail

if [[ "${BASH_SOURCE[0]}" != "$0" ]]; then
  echo "run this proof with bash; do not source it" >&2
  return 2
fi

MARKER="VOID_PRECISION_EPOCH2_PRODUCTION_SUCCESSOR_EQUIVALENCE_V1"
REPO="${VOID_NODE_ROOT:-$HOME/dev/void-node}"
EXPECTED_HOST="zoso-Precision-Tower-7810"
STATE_MANIFEST="${VOID_EPOCH2_STATE_MANIFEST:-$HOME/Downloads/void_economic_epoch2_client_neutral_state_manifest_v1_20260926T211912Z.json}"
STATE_MANIFEST_SHA="affe08799c73320c6fc4efe4a91772cc1c64f6a3ff6e75c2698ea87d27e306d9"
QBFT_EXTRA_DATA="$REPO/ops/mainnet0/economic-epoch2-qbft-production-extra-data-v1.json"
QBFT_EXTRA_DATA_FILE_SHA="c4a98142cc09ddc2c2a2036ffe5a59a1f7e06ff4b213a2d09f39d20bb698adee"
QBFT_BINDING="$REPO/ops/mainnet0/economic-epoch2-qbft-validator-binding-candidate-v1.json"
QBFT_BINDING_FILE_SHA="32b4bac996c952286e7005bac27dbccbaa81f4adc9c6072bff7f9485122e1143"
EXTRA_DATA_SHA="3449e754ec65555e90ea70cdf830f4a8a18946ee5b6221fcf5ad1a748a98c181"
NONCE_EQ="$REPO/ops/mainnet0/economic-epoch2-besu-nonce-continuity-evidence-v1.json"
NONCE_EQ_FILE_SHA="b89723b6e67a05d7e79b0d5d3c90b32d91dcdb3d08de3b8f685309f887cdd876"
NONCE_STATE_ROOT="0x7aef6c030a691569cdb0d033f1b9333c1a07cdc9de0c0fbfb952fddbd96cc2b"
NONCE_MANIFEST="$REPO/ops/mainnet0/economic-epoch2-account-nonce-continuity-candidate-v1.json"
BESU_IMAGE="hyperledger/besu@sha256:6f3f21ce533383fcc8db3bce02252b59d5a9e776b72b5a1c8ecd2db011600042"
RPC_PORT="18552"
OUTPUT="${1:?usage: $0 OUTPUT_JSON}"

say(){ printf '%s\n' "$*"; }
die(){ say "HOLD: $*" >&2; exit 1; }

say "$MARKER"
say "production_rpc_contact=false"
say "authoritative_chain2050_write=false"
say "wallet_access=false"
say "private_key_access=false"
say "transaction_construction=false"
say "transaction_signing=false"
say "transaction_submission=false"
say "transaction_broadcast=false"
say "token_movement=false"
say "funds_movement=false"

for cmd in git docker curl jq sha256sum python3 ss; do
  command -v "$cmd" >/dev/null || die "missing_command:$cmd"
done

test "$(hostname)" = "$EXPECTED_HOST" || die "wrong_host"
test -d "$REPO/.git" || die "repo_missing"
test -f "$STATE_MANIFEST" || die "state_manifest_missing"
test -f "$QBFT_EXTRA_DATA" || die "qbft_extra_data_missing"
test -f "$QBFT_BINDING" || die "qbft_binding_missing"
test -f "$NONCE_EQ" || die "nonce_equivalence_missing"
test -f "$NONCE_MANIFEST" || die "nonce_manifest_missing"
test ! -e "$OUTPUT" || die "output_already_exists"

test "$(sha256sum "$STATE_MANIFEST" | awk '{print $1}')" = "$STATE_MANIFEST_SHA" ||
  die "state_manifest_sha256_mismatch"
test "$(sha256sum "$QBFT_EXTRA_DATA" | awk '{print $1}')" = "$QBFT_EXTRA_DATA_FILE_SHA" ||
  die "qbft_extra_data_file_sha256_mismatch"
test "$(sha256sum "$QBFT_BINDING" | awk '{print $1}')" = "$QBFT_BINDING_FILE_SHA" ||
  die "qbft_binding_file_sha256_mismatch"
test "$(sha256sum "$NONCE_EQ" | awk '{print $1}')" = "$NONCE_EQ_FILE_SHA" ||
  die "nonce_equivalence_file_sha256_mismatch"

jq -e --arg root "$NONCE_STATE_ROOT" '
  .marker == "VOID_ECONOMIC_EPOCH2_BESU_NONCE_CONTINUITY_EVIDENCE_V1" and
  .status == "BESU_NONCE_CONTINUITY_AND_ECONOMIC_STATE_EQUIVALENCE_GREEN" and
  .besu.genesis_state_root == $root and
  .state_equivalence.alloc_account_count == 156 and
  .state_equivalence.economic_state_account_count == 4 and
  .state_equivalence.verified_storage_entry_count == 1268 and
  .state_equivalence.client_specific_state_equivalence_proven == true and
  .nonce_continuity.frozen_epoch1_nonzero_nonce_account_count == 154 and
  .nonce_continuity.nonce_only_alloc_account_count == 152 and
  .nonce_continuity.maximum_preserved_nonce == "273" and
  .nonce_continuity.all_nonce_readbacks_exact == true and
  .nonce_continuity.all_nonce_only_native_balances_zero == true and
  .nonce_continuity.all_retired_nonce_only_code_absent == true and
  .gates.production_validator_set_bound == false and
  .gates.offline_successor_equivalence_proven == false
' "$NONCE_EQ" >/dev/null || die "nonce_equivalence_invalid"

jq -e --arg sha "$EXTRA_DATA_SHA" '
  .marker == "VOID_ECONOMIC_EPOCH2_QBFT_PRODUCTION_EXTRA_DATA_EVIDENCE_V1" and
  .status == "PRODUCTION_QBFT_EXTRA_DATA_BUILT_GENESIS_BINDING_HOLD" and
  .validator_count == 3 and
  .extra_data_sha256 == $sha and
  .decoded.validator_order_exact == true and
  .decoded.independently_reencoded_exact == true
' "$QBFT_EXTRA_DATA" >/dev/null || die "qbft_extra_data_semantics_invalid"

cd "$REPO"
test "$(git branch --show-current)" = "main" || die "primary_branch_not_main"
test -z "$(git status --porcelain=v1 --untracked-files=all)" || die "primary_worktree_dirty"
source_commit="$(git rev-parse HEAD)"
case "$source_commit" in
  [0-9a-f][0-9a-f]*) ;;
  *) die "source_commit_invalid" ;;
esac
test "${#source_commit}" = "40" || die "source_commit_length_invalid"

if ss -ltn 2>/dev/null | awk '{print $4}' | grep -Eq "(^|:)${RPC_PORT}$"; then
  die "isolated_rpc_port_in_use"
fi

node_bin="$(command -v node || true)"
test -n "$node_bin" && test -x "$node_bin" || die "node_runtime_missing"
node_bin="$(readlink -f "$node_bin")"
say "node_version=$("$node_bin" --version)"
say "source_commit=$source_commit"

work="$(mktemp -d "${TMPDIR:-/tmp}/void-e2-production-successor-equivalence.XXXXXX")"
chmod 0700 "$work"
container="void-e2-prod-successor-eq-$$"
volume="void-e2-prod-successor-eq-$$"
cleanup(){
  docker rm -f "$container" >/dev/null 2>&1 || true
  docker volume rm "$volume" >/dev/null 2>&1 || true
  rm -rf "$work"
}
trap cleanup EXIT INT TERM

"$node_bin" tools/void-economic-epoch2-besu-genesis-builder-v1.mjs \
  --state-manifest "$STATE_MANIFEST" \
  --qbft-production-extra-data "$QBFT_EXTRA_DATA" \
  --out-genesis "$work/genesis.json" \
  --out-evidence "$work/builder-evidence.json" \
  --apply \
  --confirmation buildEpoch2BesuGenesisCandidate \
  >"$work/builder-output.json"

test -s "$work/genesis.json" || die "production_genesis_missing"
test -s "$work/builder-evidence.json" || die "builder_evidence_missing"

jq -e --arg extra "$EXTRA_DATA_SHA" '
  .status == "BESU_PRODUCTION_GENESIS_CANDIDATE_BUILT_VALIDATOR_RUNTIME_HOLD" and
  .consensus.mode == "production_validator_extra_data" and
  .consensus.production_qbft_extra_data_bound_into_genesis == true and
  .consensus.production_extra_data_sha256 == $extra and
  (.consensus.production_validator_addresses | length) == 3 and
  .state.alloc_account_count == 156 and
  .state.economic_state_account_count == 4 and
  .state.nonce_continuity_account_count == 154 and
  .state.nonce_only_alloc_account_count == 152 and
  .state.maximum_preserved_nonce == "273" and
  .state.known_retained_raw_transaction_stale_under_exact_nonce_continuity == true
' "$work/builder-evidence.json" >/dev/null ||
  die "production_builder_evidence_invalid"

mkdir -p "$work/besu-config"
cp "$work/genesis.json" "$work/besu-config/genesis.json"
chmod 0644 "$work/besu-config/genesis.json"

if ! docker image inspect "$BESU_IMAGE" >/dev/null 2>&1; then
  docker pull "$BESU_IMAGE" >/dev/null
fi
observed_digest="$(docker inspect --format='{{index .RepoDigests 0}}' "$BESU_IMAGE")"
test "$observed_digest" = "$BESU_IMAGE" || die "besu_image_digest_mismatch"

docker volume create "$volume" >/dev/null
docker run -d \
  --name "$container" \
  -v "$work/besu-config/genesis.json:/config/genesis.json:ro" \
  -v "$volume:/var/lib/besu" \
  -p "127.0.0.1:${RPC_PORT}:8545" \
  "$BESU_IMAGE" \
  --genesis-file=/config/genesis.json \
  --data-path=/var/lib/besu \
  --network-id=2050 \
  --p2p-enabled=false \
  --discovery-enabled=false \
  --rpc-http-enabled=true \
  --rpc-http-host=0.0.0.0 \
  --rpc-http-port=8545 \
  --rpc-http-api=ETH,NET,WEB3,QBFT \
  --host-allowlist='*' \
  --min-gas-price=0 \
  --tx-pool-enable-balance-check=false \
  >"$work/container-id.txt" ||
  die "isolated_besu_container_create_failed"

rpc(){
  curl -fsS --max-time 10 \
    -H 'content-type: application/json' \
    --data "$1" \
    "http://127.0.0.1:${RPC_PORT}/"
}

ready=false
for _ in $(seq 1 120); do
  if rpc '{"jsonrpc":"2.0","id":1,"method":"eth_chainId","params":[]}' \
    >"$work/chain.json" 2>/dev/null
  then
    if test "$(jq -r '.result // ""' "$work/chain.json")" = "0x802"; then
      ready=true
      break
    fi
  fi
  sleep 0.25
done
if test "$ready" != true; then
  docker logs "$container" >&2 || true
  die "isolated_besu_not_ready"
fi

rpc '{"jsonrpc":"2.0","id":2,"method":"net_version","params":[]}' \
  >"$work/net.json"
rpc '{"jsonrpc":"2.0","id":3,"method":"eth_getBlockByNumber","params":["0x0",false]}' \
  >"$work/block0.json"
rpc '{"jsonrpc":"2.0","id":4,"method":"qbft_getValidatorsByBlockNumber","params":["0x0"]}' \
  >"$work/validators.json"

"$node_bin" tools/void-economic-epoch2-besu-state-equivalence-v1.mjs \
  --state-manifest "$STATE_MANIFEST" \
  --apply \
  --confirmation verifyEpoch2BesuGenesisStateEquivalence \
  >"$work/state-equivalence.json"

jq -e '
  .status == "BESU_CLIENT_SPECIFIC_STATE_EQUIVALENCE_GREEN" and
  .classification.client_specific_state_equivalence_proven == true and
  .classification.production_validator_set_bound == false and
  .classification.offline_successor_equivalence_proven == false and
  .observation.verified_storage_entry_count == 1268 and
  .observation.native_balance_sum_wei == "0" and
  .observation.token_total_supply_atoms == "333333333000000000000000000" and
  .observation.successor_holder_sum_atoms == "333333333000000000000000000"
' "$work/state-equivalence.json" >/dev/null ||
  die "economic_state_equivalence_not_green"

WORK="$work" \
QBFT_EXTRA_DATA="$QBFT_EXTRA_DATA" \
NONCE_STATE_ROOT="$NONCE_STATE_ROOT" \
"$node_bin" --input-type=module <<'NODE'
import fs from "node:fs";
import path from "node:path";

const work=process.env.WORK;
const read=(name)=>JSON.parse(fs.readFileSync(path.join(work,name),"utf8"));
const chain=read("chain.json");
const net=read("net.json");
const block=read("block0.json");
const validators=read("validators.json");
const qbft=JSON.parse(fs.readFileSync(process.env.QBFT_EXTRA_DATA,"utf8"));

if(chain.result!=="0x802") throw new Error("chain_id_mismatch");
if(net.result!=="2050") throw new Error("network_id_mismatch");
if(!block.result) throw new Error("block0_missing");
if(
  String(block.result.extraData||"").toLowerCase()!==
  String(qbft.extra_data_hex||"").toLowerCase()
) throw new Error("block0_extra_data_mismatch");
if(
  String(block.result.stateRoot||"").toLowerCase()!==
  String(process.env.NONCE_STATE_ROOT||"").toLowerCase()
) throw new Error("production_state_root_mismatch");
if(!Array.isArray(validators.result)) throw new Error("validator_result_shape");

const observed=validators.result.map(x=>String(x).toLowerCase()).sort();
const expected=qbft.validators.map(x=>String(x).toLowerCase()).sort();
if(JSON.stringify(observed)!==JSON.stringify(expected)){
  throw new Error("validator_roster_set_mismatch");
}
console.log("production_block0_extra_data_exact=true");
console.log("production_state_root_matches_nonce_continuity_equivalence=true");
console.log("production_validator_roster_readback_exact=true");
NODE

nonce_count=0
nonce_only_count=0
maximum_nonce=""
while IFS=$'\t' read -r address expected; do
  test -n "$address" && test -n "$expected" || die "nonce_manifest_row_invalid"

  nonce_json="$(rpc "$(printf '{"jsonrpc":"2.0","id":21,"method":"eth_getTransactionCount","params":["%s","0x0"]}' "$address")")"
  nonce_hex="$(printf '%s' "$nonce_json" | jq -er '.result')"
  nonce_dec="$(printf '%d' "$nonce_hex")"
  test "$nonce_dec" = "$expected" ||
    die "nonce_readback_mismatch:$address:expected=$expected:observed=$nonce_dec"

  balance_json="$(rpc "$(printf '{"jsonrpc":"2.0","id":22,"method":"eth_getBalance","params":["%s","0x0"]}' "$address")")"
  balance_hex="$(printf '%s' "$balance_json" | jq -er '.result')"
  test "$(printf '%d' "$balance_hex")" = "0" ||
    die "native_balance_nonzero:$address"

  if test "$address" != "0x470075b85352eb86f7d089fb9ba88945f12aad94" &&
     test "$address" != "0x77dfeedd19a4741f299c902ad5bbe0de917a9e59"
  then
    code_json="$(rpc "$(printf '{"jsonrpc":"2.0","id":23,"method":"eth_getCode","params":["%s","0x0"]}' "$address")")"
    test "$(printf '%s' "$code_json" | jq -er '.result')" = "0x" ||
      die "retired_code_resurrected:$address"
    nonce_only_count=$((nonce_only_count+1))
  fi

  if [ "$expected" -gt "${maximum_nonce:-0}" ]; then
    maximum_nonce="$expected"
  fi
  nonce_count=$((nonce_count+1))
done < <(jq -r '.accounts[] | [.address,.frozen_final_nonce] | @tsv' "$NONCE_MANIFEST")

test "$nonce_count" = "154" || die "nonce_readback_count_mismatch:$nonce_count"
test "$nonce_only_count" = "152" || die "nonce_only_count_mismatch:$nonce_only_count"
test "$maximum_nonce" = "273" || die "maximum_nonce_mismatch:$maximum_nonce"

genesis_sha="$(sha256sum "$work/genesis.json" | awk '{print $1}')"
builder_sha="$(sha256sum "$work/builder-evidence.json" | awk '{print $1}')"
state_eq_sha="$(sha256sum "$work/state-equivalence.json" | awk '{print $1}')"
block_hash="$(jq -er '.result.hash' "$work/block0.json")"
state_root="$(jq -er '.result.stateRoot' "$work/block0.json")"
test "${state_root,,}" = "${NONCE_STATE_ROOT,,}" || die "state_root_mismatch"

observed_at="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
facts="$work/facts.json"

python3 - \
  "$facts" "$EXPECTED_HOST" "$source_commit" \
  "$STATE_MANIFEST_SHA" "$QBFT_BINDING_FILE_SHA" \
  "$QBFT_EXTRA_DATA_FILE_SHA" "$EXTRA_DATA_SHA" "$BESU_IMAGE" \
  "$genesis_sha" "$builder_sha" "$state_eq_sha" \
  "$block_hash" "$state_root" "$NONCE_STATE_ROOT" <<'PY'
import json, pathlib, sys
(
    out, hostname, source_commit,
    state_manifest_sha, binding_sha, extra_file_sha, extra_sha, besu_image,
    genesis_sha, builder_sha, state_eq_sha,
    block_hash, state_root, prior_state_root,
)=sys.argv[1:]

value={
  "marker":"VOID_ECONOMIC_EPOCH2_PRODUCTION_SUCCESSOR_EQUIVALENCE_FACTS_V1",
  "version":1,
  "hostname":hostname,
  "source_commit":source_commit,
  "state_manifest_file_sha256":state_manifest_sha,
  "state_manifest_material_sha256":"286034e3adb1654c13899b959075fcfa2504a6942c83ec52febb156bd0ea2a4f",
  "qbft_binding_file_sha256":binding_sha,
  "qbft_extra_data_evidence_file_sha256":extra_file_sha,
  "qbft_extra_data_sha256":extra_sha,
  "besu_image":besu_image,
  "genesis_file_sha256":genesis_sha,
  "builder_evidence_file_sha256":builder_sha,
  "state_equivalence_receipt_sha256":state_eq_sha,
  "nonce_continuity_evidence_file_sha256":"b89723b6e67a05d7e79b0d5d3c90b32d91dcdb3d08de3b8f685309f887cdd876",
  "chain_id":2050,
  "network_id":"2050",
  "block_number":"0",
  "block_hash":block_hash.lower(),
  "state_root":state_root.lower(),
  "nonce_continuity_state_root":prior_state_root.lower(),
  "state_root_matches_nonce_continuity_equivalence":True,
  "block0_extra_data_exact":True,
  "production_qbft_extra_data_bound_into_genesis":True,
  "validator_roster_readback_exact":True,
  "production_validator_count":3,
  "required_validator_quorum":2,
  "byzantine_fault_tolerance":0,
  "validators":[
    "0xf00436d7e27cec6cd24723ee5a78ce24c0ef5863",
    "0x02f967953386188397b992c208239d3a25180db6",
    "0x461bf06270d9d28962f7570182c061b828799b66",
  ],
  "client_specific_state_equivalence_proven":True,
  "verified_storage_entry_count":1268,
  "native_balance_sum_wei":"0",
  "successor_total_supply_atoms":"333333333000000000000000000",
  "successor_holder_sum_atoms":"333333333000000000000000000",
  "nonce_continuity_account_count":154,
  "nonce_only_alloc_account_count":152,
  "maximum_nonce":"273",
  "all_nonce_readbacks_exact":True,
  "all_nonce_only_native_balances_zero":True,
  "all_retired_nonce_only_code_absent":True,
  "known_retained_raw_transaction_stale_under_exact_nonce_continuity":True,
  "production_validator_set_bound":True,
  "offline_successor_equivalence_proven":True,
  "rpc_scope":"isolated_loopback_disposable_besu",
  "p2p_enabled":False,
  "discovery_enabled":False,
  "transaction_construction":False,
  "transaction_signing":False,
  "transaction_submission":False,
  "transaction_broadcast":False,
  "authoritative_chain2050_write":False,
  "wallet_access":False,
  "private_key_access":False,
  "credential_content_access":False,
  "validator_mutation":False,
  "token_movement":False,
  "funds_movement":False,
  "migration_authorized":False,
  "public_activation_authorized":False,
}
pathlib.Path(out).write_text(json.dumps(value,indent=2)+"\n",encoding="utf-8")
PY

"$node_bin" tools/void-economic-epoch2-production-successor-equivalence-evidence-v1.mjs \
  --facts "$facts" \
  --observed-at-utc "$observed_at" \
  --output "$OUTPUT"

test -s "$OUTPUT" || die "evidence_output_missing"
test -z "$(git status --porcelain=v1 --untracked-files=all)" ||
  die "primary_worktree_changed"

say "genesis_file_sha256=$genesis_sha"
say "builder_evidence_file_sha256=$builder_sha"
say "state_equivalence_receipt_sha256=$state_eq_sha"
say "production_block_hash=$block_hash"
say "production_state_root=$state_root"
say "production_validator_set_bound=true"
say "offline_successor_equivalence_proven=true"
say "cross_epoch_replay_protection_proven=true"
say "successor_state_root_public_void_anchor_ready=false"
say "public_balance_receipt_code_verification_ready=false"
say "authoritative_chain2050_write=false"
say "migration_authorized=false"
say "public_activation_authorized=false"
say "funds_movement=false"
say "evidence_output=$OUTPUT"
say "${MARKER}_GREEN"
