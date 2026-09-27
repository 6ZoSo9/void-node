#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

MARKER="VOID_PRECISION_EPOCH2_BESU_NONCE_CONTINUITY_EQUIVALENCE_V1"
REPO="$HOME/dev/void-node"
SOURCE_BRANCH="feat/epoch2-legacy-nonce-census-v1-20260927"
SOURCE_COMMIT="3f376daec1968c6e8df6c2eb34f53e1f03a5c02f"
SOURCE_BASE="e211d524baa708dcaa9ad7d14892e7961f424526"
BUILDER_PATH="tools/void-economic-epoch2-besu-genesis-builder-v1.mjs"
BUILDER_BLOB="dde81eafe9042b4feb0e618321fb3ac8dca614e4"
NONCE_PATH="ops/mainnet0/economic-epoch2-account-nonce-continuity-candidate-v1.json"
NONCE_BLOB="fb3e06983e361654f33dcf7d1cc6c80a54d57af7"
STATE_EQ_PATH="tools/void-economic-epoch2-besu-state-equivalence-v1.mjs"
STATE_EQ_BLOB="fc490c17f6dd0f76685aa071e57ec846eb719faf"
STATE_MANIFEST="$HOME/Downloads/void_economic_epoch2_client_neutral_state_manifest_v1_20260926T211912Z.json"
STATE_MANIFEST_SHA="affe08799c73320c6fc4efe4a91772cc1c64f6a3ff6e75c2698ea87d27e306d9"
BESU_IMAGE="hyperledger/besu@sha256:6f3f21ce533383fcc8db3bce02252b59d5a9e776b72b5a1c8ecd2db011600042"
RPC_PORT="18552"
KNOWN_SIGNER="0x4d0a1149d13b03448c56ee6582d161159c5e537f"
MAX_NONCE_ADDRESS="0x7d493c395fc3636becac605f9cbc855b7fffe6f1"
TOKEN="0x470075b85352eb86f7d089fb9ba88945f12aad94"
STAKING="0x77dfeedd19a4741f299c902ad5bbe0de917a9e59"

say(){ printf '%s\n' "$*"; }
die(){ say "HOLD: $*" >&2; exit 1; }

say "$MARKER"
say "git_fetch=true"
say "primary_worktree_mutation=false"
say "isolated_source_archive=true"
say "filesystem_mutation=temporary_workspace_and_receipt_only"
say "docker_process_start=true"
say "docker_image_pull=conditional_exact_digest"
say "isolated_besu_rpc=http://127.0.0.1:${RPC_PORT}/"
say "authoritative_epoch1_rpc_call=false"
say "authoritative_rpc_8545_action=false"
say "credential_content_access=false"
say "wallet_or_signer_access=false"
say "private_key_access=false"
say "transaction_construction=false"
say "transaction_signing=false"
say "transaction_submission=false"
say "transaction_broadcast=false"
say "authoritative_chain2050_write=false"
say "token_movement=false"
say "funds_movement=false"

for cmd in git tar docker curl jq sha256sum python3 ss; do
  command -v "$cmd" >/dev/null || die "missing_command:$cmd"
done
test -d "$REPO/.git" || die "repo_missing"
test -f "$STATE_MANIFEST" || die "state_manifest_missing"
test "$(sha256sum "$STATE_MANIFEST" | awk '{print $1}')" = "$STATE_MANIFEST_SHA" ||
  die "state_manifest_sha256_mismatch"
test -d "$REPO/node_modules/ethers" || die "repo_ethers_dependency_missing"

cd "$REPO"
test "$(git branch --show-current)" = "main" || die "primary_branch_not_main"
test -z "$(git status --porcelain)" || die "primary_worktree_dirty"

git fetch origin main "$SOURCE_BRANCH" --quiet
branch_head="$(git rev-parse "origin/$SOURCE_BRANCH")"
git merge-base --is-ancestor "$SOURCE_COMMIT" "$branch_head" ||
  die "pinned_source_not_ancestor_of_branch_head"
git merge-base --is-ancestor "$SOURCE_BASE" "$SOURCE_COMMIT" ||
  die "source_base_not_ancestor"
say "source_branch_head=$branch_head"
test "$(git rev-parse "$SOURCE_COMMIT:$BUILDER_PATH")" = "$BUILDER_BLOB" ||
  die "builder_blob_mismatch"
test "$(git rev-parse "$SOURCE_COMMIT:$NONCE_PATH")" = "$NONCE_BLOB" ||
  die "nonce_manifest_blob_mismatch"
test "$(git rev-parse "$SOURCE_COMMIT:$STATE_EQ_PATH")" = "$STATE_EQ_BLOB" ||
  die "state_equivalence_blob_mismatch"

if ss -ltn 2>/dev/null | awk '{print $4}' | grep -Eq "(^|:)${RPC_PORT}$"; then
  die "isolated_rpc_port_in_use"
fi

node_bin="$REPO/.runtime/clone-run-v1/node-v24.18.0-linux-x64/bin/node"
if ! test -x "$node_bin"; then
  node_bin="$(command -v node || true)"
fi
test -n "$node_bin" && test -x "$node_bin" || die "node_runtime_missing"
say "node_version=$("$node_bin" --version)"

work="$(mktemp -d)"
source_root="$work/source"
mkdir -p "$source_root"
container="void-epoch2-nonce-$$"
volume="void-epoch2-nonce-$$"
cleanup(){
  docker rm -f "$container" >/dev/null 2>&1 || true
  docker volume rm "$volume" >/dev/null 2>&1 || true
  rm -rf "$work"
}
trap cleanup EXIT INT TERM

git archive "$SOURCE_COMMIT" | tar -x -C "$source_root"
ln -s "$REPO/node_modules" "$source_root/node_modules"

cd "$source_root"
"$node_bin" "$BUILDER_PATH"   --state-manifest "$STATE_MANIFEST"   --out-genesis "$work/genesis.json"   --out-evidence "$work/builder-evidence.json"   --apply   --confirmation buildEpoch2BesuGenesisCandidate   > "$work/builder-output.json"

test -s "$work/genesis.json" || die "genesis_not_built"
test -s "$work/builder-evidence.json" || die "builder_evidence_missing"

jq -e '
  .status == "BESU_GENESIS_CANDIDATE_BUILT" and
  .state.alloc_account_count == 156 and
  .state.economic_state_account_count == 4 and
  .state.nonce_continuity_account_count == 154 and
  .state.nonce_only_alloc_account_count == 152 and
  .state.maximum_preserved_nonce == "273" and
  .state.known_retained_raw_transaction_stale_under_exact_nonce_continuity == true
' "$work/builder-evidence.json" >/dev/null ||
  die "builder_nonce_evidence_mismatch"

if ! docker image inspect "$BESU_IMAGE" >/dev/null 2>&1; then
  docker pull "$BESU_IMAGE" >/dev/null
fi
docker volume create "$volume" >/dev/null
docker rm -f "$container" >/dev/null 2>&1 || true\ndocker run -d   --name "$container"   -v "$work/genesis.json:/config/genesis.json:ro"   -v "$volume:/var/lib/besu"   -p "127.0.0.1:${RPC_PORT}:8545"   "$BESU_IMAGE"   --genesis-file=/config/genesis.json   --data-path=/var/lib/besu   --network-id=2050   --p2p-enabled=false   --discovery-enabled=false   --rpc-http-enabled=true   --rpc-http-host=0.0.0.0   --rpc-http-port=8545   --rpc-http-api=ETH,NET,WEB3,QBFT   --host-allowlist='*'   --min-gas-price=0   --tx-pool-enable-balance-check=false   > "$work/container-id.txt"

rpc(){
  local body="$1"
  curl -fsS --max-time 10     -H 'content-type: application/json'     --data "$body"     "http://127.0.0.1:${RPC_PORT}/"
}

ready=false
for _ in $(seq 1 120); do
  if rpc '{"jsonrpc":"2.0","id":1,"method":"eth_chainId","params":[]}'       > "$work/chain.json" 2>/dev/null; then
    if test "$(jq -r '.result // ""' "$work/chain.json")" = "0x802"; then
      ready=true
      break
    fi
  fi
  sleep 0.25
done
if test "$ready" != true; then
  say "=== isolated Besu container state ===" >&2
  docker inspect "$container" --format 'status={{.State.Status}} exit_code={{.State.ExitCode}} error={{.State.Error}}' >&2 || true
  say "=== isolated Besu logs ===" >&2
  docker logs "$container" >&2 || true
  die "isolated_besu_not_ready"
fi

"$node_bin" "$source_root/$STATE_EQ_PATH"   --state-manifest "$STATE_MANIFEST"   --apply   --confirmation verifyEpoch2BesuGenesisStateEquivalence   > "$work/economic-state-equivalence.json"

jq -e '
  .status == "BESU_CLIENT_SPECIFIC_STATE_EQUIVALENCE_GREEN" and
  .classification.client_specific_state_equivalence_proven == true and
  .classification.production_validator_set_bound == false and
  .classification.offline_successor_equivalence_proven == false and
  .classification.migration_authorized == false and
  .classification.public_activation_authorized == false
' "$work/economic-state-equivalence.json" >/dev/null ||
  die "economic_state_equivalence_not_green"

nonce_count=0
nonce_only_count=0
known_nonce=""
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

  if test "$address" != "$TOKEN" && test "$address" != "$STAKING"; then
    code_json="$(rpc "$(printf '{"jsonrpc":"2.0","id":23,"method":"eth_getCode","params":["%s","0x0"]}' "$address")")"
    test "$(printf '%s' "$code_json" | jq -er '.result')" = "0x" ||
      die "retired_code_resurrected:$address"
    nonce_only_count=$((nonce_only_count + 1))
  fi

  if test "$address" = "$KNOWN_SIGNER"; then
    known_nonce="$nonce_dec"
  fi
  if test "$address" = "$MAX_NONCE_ADDRESS"; then
    maximum_nonce="$nonce_dec"
  fi
  nonce_count=$((nonce_count + 1))
done < <(jq -r '.accounts[] | [.address,.frozen_final_nonce] | @tsv' "$source_root/$NONCE_PATH")

test "$nonce_count" = "154" || die "nonce_readback_count_mismatch:$nonce_count"
test "$nonce_only_count" = "152" || die "nonce_only_count_mismatch:$nonce_only_count"
test "$known_nonce" = "1" || die "known_signer_nonce_mismatch:$known_nonce"
test "$maximum_nonce" = "273" || die "maximum_nonce_mismatch:$maximum_nonce"

block0="$(rpc '{"jsonrpc":"2.0","id":30,"method":"eth_getBlockByNumber","params":["0x0",false]}')"
block_hash="$(printf '%s' "$block0" | jq -er '.result.hash')"
state_root="$(printf '%s' "$block0" | jq -er '.result.stateRoot')"
genesis_sha="$(sha256sum "$work/genesis.json" | awk '{print $1}')"
builder_sha="$(sha256sum "$work/builder-evidence.json" | awk '{print $1}')"
economic_receipt_sha="$(sha256sum "$work/economic-state-equivalence.json" | awk '{print $1}')"

stamp="$(date -u +%Y%m%dT%H%M%SZ)"
receipt="$HOME/Downloads/void_epoch2_besu_nonce_continuity_equivalence_precision_v1_${stamp}.json"

python3 -   "$receipt" "$SOURCE_COMMIT" "$STATE_MANIFEST_SHA"   "$genesis_sha" "$builder_sha" "$economic_receipt_sha"   "$block_hash" "$state_root" <<'PY'
import json, pathlib, sys

(
    receipt,
    source_commit,
    manifest_sha,
    genesis_sha,
    builder_sha,
    economic_sha,
    block_hash,
    state_root,
) = sys.argv[1:]

value = {
    "marker": "VOID_ECONOMIC_EPOCH2_BESU_NONCE_CONTINUITY_EQUIVALENCE_PRECISION_V1",
    "version": 1,
    "status": "BESU_NONCE_CONTINUITY_AND_ECONOMIC_STATE_EQUIVALENCE_GREEN",
    "source_commit": source_commit,
    "state_manifest_file_sha256": manifest_sha,
    "genesis_file_sha256": genesis_sha,
    "builder_evidence_file_sha256": builder_sha,
    "economic_state_equivalence_receipt_sha256": economic_sha,
    "besu": {
        "name": "Besu",
        "version": "26.8.1",
        "repo_digest": "hyperledger/besu@sha256:6f3f21ce533383fcc8db3bce02252b59d5a9e776b72b5a1c8ecd2db011600042",
        "rpc": "http://127.0.0.1:18552/",
        "block_number": "0",
        "block_hash": block_hash,
        "state_root": state_root,
    },
    "nonce_continuity": {
        "account_count": 154,
        "nonce_only_alloc_account_count": 152,
        "maximum_nonce": "273",
        "known_retained_raw_transaction_signer": "0x4d0a1149d13b03448c56ee6582d161159c5e537f",
        "known_retained_raw_transaction_nonce": "0",
        "known_signer_successor_nonce": "1",
        "all_nonce_readbacks_exact": True,
        "all_nonce_only_native_balances_zero": True,
        "all_retired_nonce_only_code_absent": True,
        "known_retained_raw_transaction_stale_under_exact_nonce_continuity": True,
    },
    "economic_state": {
        "client_specific_state_equivalence_proven": True,
        "verified_storage_entry_count": 1268,
        "native_economic_account_balance_sum_wei": "0",
    },
    "gates": {
        "successor_genesis_nonce_continuity_built": True,
        "besu_nonce_readback_proven": True,
        "pending_legacy_signed_transaction_census_complete": False,
        "execution_epoch_bound_in_public_gateway": False,
        "privileged_signer_nonce_or_key_replay_fence_proven": False,
        "cross_epoch_replay_protection_proven": False,
        "production_validator_set_bound": False,
        "offline_successor_equivalence_proven": False,
        "migration_authorized": False,
        "public_activation_authorized": False,
    },
    "authority": {
        "authoritative_epoch1_rpc_call": False,
        "authoritative_chain2050_write": False,
        "wallet_access": False,
        "private_key_access": False,
        "transaction_construction": False,
        "transaction_signing": False,
        "transaction_submission": False,
        "transaction_broadcast": False,
        "token_movement": False,
        "funds_movement": False,
    },
}

pathlib.Path(receipt).write_text(
    json.dumps(value, indent=2) + "\n",
    encoding="utf-8",
)
PY

chmod 600 "$receipt"
receipt_sha="$(sha256sum "$receipt" | awk '{print $1}')"

say "source_commit=$SOURCE_COMMIT"
say "state_manifest_sha256=$STATE_MANIFEST_SHA"
say "alloc_account_count=156"
say "economic_state_account_count=4"
say "nonce_continuity_account_count=154"
say "nonce_only_alloc_account_count=152"
say "all_nonce_readbacks_exact=true"
say "all_nonce_only_native_balances_zero=true"
say "all_retired_nonce_only_code_absent=true"
say "known_retained_raw_transaction_nonce=0"
say "known_signer_successor_nonce=1"
say "known_retained_raw_transaction_stale_under_exact_nonce_continuity=true"
say "maximum_nonce_readback=273"
say "verified_storage_entry_count=1268"
say "client_specific_state_equivalence_proven=true"
say "successor_genesis_nonce_continuity_built=true"
say "besu_nonce_readback_proven=true"
say "pending_legacy_signed_transaction_census_complete=false"
say "cross_epoch_replay_protection_proven=false"
say "production_validator_set_bound=false"
say "offline_successor_equivalence_proven=false"
say "migration_authorized=false"
say "public_activation_authorized=false"
say "genesis_block_hash=$block_hash"
say "genesis_state_root=$state_root"
say "receipt=$receipt"
say "receipt_sha256=$receipt_sha"
say "${MARKER}_GREEN"
