#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

MARKER="VOID_PRECISION_EPOCH2_LEGACY_NONCE_CENSUS_V1"
REPO="${HOME}/dev/void-node"
EXPECTED_MAIN="e211d524baa708dcaa9ad7d14892e7961f424526"
STATE="${HOME}/.local/state/void-economic-genesis-archive-v1/block-37392-final-candidate-v1/chain2050-block-37392-c251d3d92a0f3729f008fb7911243da0e4e2939af73f98fab2234a050c95a906.anvil-dump-state.hex"
EXPECTED_STATE_SHA="94b25d36990d32616a7328f5419f5075fee757c15a955617c79ef30497a14505"
EXPECTED_STATE_BYTES="161576656"
KNOWN_SIGNER="0x4d0a1149d13b03448c56ee6582d161159c5e537f"
KNOWN_RAW_NONCE="0"
KNOWN_RAW_TX_HASH="0x8da8cc5a8e126158bdc0e003c5521699939d95a26a72a933969cf6de15d88dd4"
KNOWN_RAW_FILE_SHA="96b5d004284e511c12b40f2de627c9a214656e025883b8cd7adec1b82348334d"
KNOWN_INCLUDED_BLOCK="37379"

say(){ printf '%s\n' "$*"; }
die(){ say "HOLD: $*" >&2; exit 1; }

nonce_rows_v1() {
  python3 -c '
import json
import re
import sys

class NumberToken(str):
    pass

def parse_number(raw):
    return NumberToken(raw)

def object_without_duplicate_keys(pairs):
    value = {}
    for key, item in pairs:
        if key in value:
            raise ValueError(f"duplicate_json_key:{key}")
        value[key] = item
    return value

def hold(message):
    print(f"HOLD: {message}", file=sys.stderr)
    raise SystemExit(5)

try:
    root = json.load(
        sys.stdin,
        parse_int=parse_number,
        parse_float=parse_number,
        object_pairs_hook=object_without_duplicate_keys,
    )
except (json.JSONDecodeError, ValueError, TypeError) as error:
    hold(f"nonce_json_parse_invalid:{error}")

if type(root) is not dict or type(root.get("accounts")) is not dict:
    hold("accounts_object_missing")

for address, account in root["accounts"].items():
    if type(address) is not str or re.fullmatch(r"0x[0-9a-f]{40}", address) is None:
        hold("nonce_account_address_not_canonical")
    if type(account) is not dict:
        hold("nonce_account_must_be_object")
    if "nonce" not in account:
        continue

    raw_nonce = account["nonce"]
    if type(raw_nonce) is not NumberToken:
        hold("nonce_value_must_be_json_integer")
    if re.fullmatch(r"(?:0|[1-9][0-9]*)", raw_nonce) is None:
        hold("nonce_value_not_canonical_unsigned_decimal_integer")

    nonce = int(raw_nonce, 10)
    if nonce > 9007199254740991:
        hold("nonce_value_out_of_safe_unsigned_integer_range")

    print(f"{address}\t{nonce}")
'
}
assert_nonce_accounting_v1() {
  local rows="$1" leaf_count unique_count
  leaf_count="$(wc -l < "$rows" | tr -d ' ')"
  unique_count="$(cut -f1 "$rows" | LC_ALL=C sort -u | wc -l | tr -d ' ')"
  test "$leaf_count" -gt 0 || die "nonce_leaf_count_zero"
  test "$leaf_count" = "$unique_count" ||
    die "nonce_leaf_unique_account_mismatch:${leaf_count}:${unique_count}"
}

nonce_parser_self_test_v1() (
  set -Eeuo pipefail
  local tmp canonical duplicate fixture
  tmp="$(mktemp -d)"
  trap 'rm -rf "$tmp"' EXIT
  canonical="$tmp/canonical.tsv"

  printf '%s' '{"accounts":{"0x0000000000000000000000000000000000000001":{"nonce":0},"0x0000000000000000000000000000000000000002":{"nonce":273}}}' |
    nonce_rows_v1 | LC_ALL=C sort > "$canonical"
  assert_nonce_accounting_v1 "$canonical"
  test "$(sed -n '1p' "$canonical")" = $'0x0000000000000000000000000000000000000001\t0'
  test "$(sed -n '2p' "$canonical")" = $'0x0000000000000000000000000000000000000002\t273'

  for fixture in \
    '{"accounts":{"0x0000000000000000000000000000000000000001":{"nonce":true}}}' \
    '{"accounts":{"0x0000000000000000000000000000000000000001":{"nonce":null}}}' \
    '{"accounts":{"0x0000000000000000000000000000000000000001":{"nonce":"1"}}}' \
    '{"accounts":{"0x0000000000000000000000000000000000000001":{"nonce":[1]}}}' \
    '{"accounts":{"0x0000000000000000000000000000000000000001":{"nonce":{"value":1}}}}' \
    '{"accounts":{"0x0000000000000000000000000000000000000001":{"nonce":-1}}}' \
    '{"accounts":{"0x0000000000000000000000000000000000000001":{"nonce":1.5}}}' \
    '{"accounts":{"0x0000000000000000000000000000000000000001":{"nonce":9007199254740992}}}' \
    '{"accounts":{"0x0000000000000000000000000000000000000001":{"nonce":"0x"}}}' \
    '{"accounts":{"0x0000000000000000000000000000000000000001":{"nonce":1e0}}}' \
    '{"accounts":{"0x0000000000000000000000000000000000000001":{"nonce":1e2}}}' \
    '{"accounts":{"0x0000000000000000000000000000000000000001":{"nonce":1.0}}}' \
    '{"accounts":{"0x0000000000000000000000000000000000000001":{"nonce":0.0}}}' \
    '{"accounts":{"0x0000000000000000000000000000000000000001":{"nonce":-0}}}' \
    '{"accounts":{"0x0000000000000000000000000000000000000001":{"nonce":01}}}'
  do
    if printf '%s' "$fixture" | nonce_rows_v1 >/dev/null 2>&1; then
      die "noncanonical_nonce_fixture_accepted:$fixture"
    fi
  done

  duplicate="$tmp/duplicate.tsv"
  if printf '%s' '{"accounts":{"0x0000000000000000000000000000000000000001":{"nonce":1},"0x0000000000000000000000000000000000000001":{"nonce":2}}}' |
    nonce_rows_v1 > "$duplicate" 2>/dev/null; then
    die "duplicate_nonce_account_accepted"
  fi

  say "nonce_json_type=canonical_unsigned_decimal_integer"
  say "nonce_minimum=0"
  say "nonce_maximum=9007199254740991"
  say "nonce_malformed_controls=15"
  say "nonce_lexical_form_preserved=true"
  say "nonce_leaf_unique_account_accounting=true"
)

if [[ "${1:-}" == "--self-test" ]]; then
  for cmd in jq python3 sort mktemp wc cut tr sed; do
    command -v "$cmd" >/dev/null || die "missing_command:$cmd"
  done
  nonce_parser_self_test_v1
  say "${MARKER}_SELF_TEST_GREEN"
  exit 0
fi

say "$MARKER"
say "filesystem_mutation=receipt_only"
say "git_fetch=false"
say "git_mutation=false"
say "service_action=false"
say "process_start=false"
say "rpc_call=false"
say "credential_content_access=false"
say "wallet_or_signer_access=false"
say "private_key_access=false"
say "transaction_construction=false"
say "transaction_signing=false"
say "transaction_broadcast=false"
say "chain2050_write=false"
say "funds_movement=false"

test -d "$REPO/.git" || die "repo_missing"
cd "$REPO"
test "$(git branch --show-current)" = "main" || die "primary_branch_not_main"
test -z "$(git status --porcelain)" || die "primary_worktree_dirty"
test "$(git rev-parse HEAD)" = "$EXPECTED_MAIN" || die "main_head_mismatch"

for cmd in xxd gzip jq python3 sha256sum sort mktemp; do
  command -v "$cmd" >/dev/null || die "missing_command:$cmd"
done

test -f "$STATE" || die "frozen_state_missing"
test "$(stat -c '%s' "$STATE")" = "$EXPECTED_STATE_BYTES" || die "frozen_state_size_mismatch"
test "$(sha256sum "$STATE" | awk '{print $1}')" = "$EXPECTED_STATE_SHA" || die "frozen_state_sha256_mismatch"

tx_evidence="$REPO/ops/mainnet0/chain2050-role-authority-signed-transaction-verification-precision-v1.json"
block_evidence="$REPO/ops/mainnet0/chain2050-role-authority-checkpoint-request-precision-evidence-v1.json"
snapshot="$REPO/ops/mainnet0/economic-genesis-archive-final-snapshot-v1.json"

test -f "$tx_evidence" || die "signed_transaction_evidence_missing"
test -f "$block_evidence" || die "included_block_evidence_missing"
test -f "$snapshot" || die "final_snapshot_evidence_missing"

jq -e \
  --arg signer "$KNOWN_SIGNER" \
  --arg tx "$KNOWN_RAW_TX_HASH" \
  --arg file_sha "$KNOWN_RAW_FILE_SHA" \
  --arg nonce "$KNOWN_RAW_NONCE" \
  '.signer_address == $signer and
   .signed_transaction_hash == $tx and
   .signed_transaction_file_sha256 == $file_sha and
   .nonce == $nonce and
   .chain_id == "2050"' \
  "$tx_evidence" >/dev/null || die "signed_transaction_evidence_mismatch"

jq -e \
  --arg tx "$KNOWN_RAW_TX_HASH" \
  --arg block "$KNOWN_INCLUDED_BLOCK" \
  '.signed_transaction_hash == $tx and
   .deployment_block_number == $block' \
  "$block_evidence" >/dev/null || die "included_block_evidence_mismatch"

jq -e \
  --arg state_sha "$EXPECTED_STATE_SHA" \
  '.status == "FINAL_EPOCH1_SNAPSHOT" and
   .execution_epoch == 1 and
   .chain_id == 2050 and
   .final_block_number == "37392" and
   .durable_archive_checkpoint.state_sha256 == $state_sha and
   .freeze.write_freeze_proven == true' \
  "$snapshot" >/dev/null || die "final_snapshot_evidence_mismatch"

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
all_tsv="$tmp/all-nonces.tsv"
tsv="$tmp/nonzero-nonces.tsv"

tail -c +3 "$STATE" |
xxd -r -p |
gzip -dc |
nonce_rows_v1 |
LC_ALL=C sort > "$all_tsv"

assert_nonce_accounting_v1 "$all_tsv"
total_nonce_leaf_count="$(wc -l < "$all_tsv" | tr -d ' ')"
unique_nonce_account_count="$(cut -f1 "$all_tsv" | LC_ALL=C sort -u | wc -l | tr -d ' ')"
awk -F '\t' '$2 != "0"' "$all_tsv" > "$tsv"

count="$(wc -l < "$tsv" | tr -d ' ')"
test "$count" = "154" || die "nonzero_nonce_account_count_mismatch:$count"

known_final_nonce="$(awk -F '\t' -v a="$KNOWN_SIGNER" '$1==a{print $2}' "$tsv")"
test "$known_final_nonce" = "1" || die "known_signer_final_nonce_mismatch:$known_final_nonce"

dist_1="$(awk -F '\t' '$2=="1"{n++} END{print n+0}' "$tsv")"
dist_3="$(awk -F '\t' '$2=="3"{n++} END{print n+0}' "$tsv")"
dist_9="$(awk -F '\t' '$2=="9"{n++} END{print n+0}' "$tsv")"
dist_111="$(awk -F '\t' '$2=="111"{n++} END{print n+0}' "$tsv")"
dist_127="$(awk -F '\t' '$2=="127"{n++} END{print n+0}' "$tsv")"
dist_130="$(awk -F '\t' '$2=="130"{n++} END{print n+0}' "$tsv")"
dist_273="$(awk -F '\t' '$2=="273"{n++} END{print n+0}' "$tsv")"
test "$dist_1:$dist_3:$dist_9:$dist_111:$dist_127:$dist_130:$dist_273" = "24:125:1:1:1:1:1" ||
  die "nonce_distribution_mismatch"

tsv_sha="$(sha256sum "$tsv" | awk '{print $1}')"
test "$tsv_sha" = "c8d316a3ca3739c644bfc7626715144762138cad3fb4d68bbd0e132b0dc42b70" ||
  die "canonical_nonce_tsv_sha256_mismatch:$tsv_sha"

stamp="$(date -u +%Y%m%dT%H%M%SZ)"
receipt="$HOME/Downloads/void_epoch2_legacy_nonce_census_precision_v1_${stamp}.json"

python3 - \
  "$tsv" "$receipt" "$EXPECTED_MAIN" "$EXPECTED_STATE_SHA" "$tsv_sha" \
  "$KNOWN_SIGNER" "$KNOWN_RAW_TX_HASH" "$KNOWN_RAW_FILE_SHA" "$KNOWN_INCLUDED_BLOCK" <<'PY'
import json, pathlib, sys

(
    tsv_path,
    receipt_path,
    source_commit,
    state_sha,
    tsv_sha,
    known_signer,
    known_tx,
    known_file_sha,
    known_block,
) = sys.argv[1:]

entries = []
for line in pathlib.Path(tsv_path).read_text(encoding="utf-8").splitlines():
    address, nonce = line.split("\t")
    entries.append({"address": address, "final_nonce": nonce})

values = [int(x["final_nonce"], 0) for x in entries]
distribution = {}
for value in values:
    distribution[str(value)] = distribution.get(str(value), 0) + 1

known = next((x for x in entries if x["address"] == known_signer), None)
if known is None or known["final_nonce"] != "1":
    raise SystemExit("known signer continuity mismatch")

receipt = {
    "marker": "VOID_ECONOMIC_EPOCH2_LEGACY_ACCOUNT_NONCE_CENSUS_PRECISION_V1",
    "version": 1,
    "status": "FROZEN_EPOCH1_NONZERO_NONCE_CENSUS_GREEN",
    "source_commit": source_commit,
    "observed_on_host": "Precision",
    "source_snapshot": {
        "execution_epoch": 1,
        "chain_id": 2050,
        "block_number": "37392",
        "block_hash": "0x739679fd9f9b6f96213c440350980a1b590324c9152b7c394c81ce3627c94f52",
        "checkpoint_id_sha256": "c251d3d92a0f3729f008fb7911243da0e4e2939af73f98fab2234a050c95a906",
        "state_sha256": state_sha,
        "state_bytes": 161576656,
        "write_rpc_frozen": True,
    },
    "census": {
        "nonzero_nonce_account_count": len(entries),
        "canonical_tsv_sha256": tsv_sha,
        "nonce_distribution": dict(sorted(distribution.items(), key=lambda kv: int(kv[0]))),
        "maximum_nonce": str(max(values)),
        "accounts": entries,
    },
    "known_retained_raw_transaction": {
        "signed_transaction_hash": known_tx,
        "signed_transaction_file_sha256": known_file_sha,
        "signer_address": known_signer,
        "transaction_nonce": "0",
        "frozen_final_account_nonce": known["final_nonce"],
        "included_in_epoch1_block": known_block,
        "historical_transaction_nonce_below_frozen_final_nonce": True,
    },
    "interpretation": {
        "exact_nonce_continuity_candidate_ready": True,
        "known_retained_raw_transaction_stale_under_exact_nonce_continuity": True,
        "pending_legacy_signed_transaction_census_complete": False,
        "execution_epoch_bound_in_public_gateway": False,
        "privileged_signer_nonce_or_key_replay_fence_proven": False,
        "cross_epoch_replay_protection_proven": False,
        "migration_authorized": False,
        "public_activation_authorized": False,
    },
    "authority": {
        "filesystem_mutation": "receipt_only",
        "git_mutation": False,
        "service_action": False,
        "process_start": False,
        "rpc_call": False,
        "credential_content_access": False,
        "wallet_or_signer_access": False,
        "private_key_access": False,
        "transaction_construction": False,
        "transaction_signing": False,
        "transaction_broadcast": False,
        "chain2050_write": False,
        "funds_movement": False,
    },
}

pathlib.Path(receipt_path).write_text(
    json.dumps(receipt, indent=2) + "\n",
    encoding="utf-8",
)
PY

chmod 600 "$receipt"
receipt_sha="$(sha256sum "$receipt" | awk '{print $1}')"

say "state_sha256=$EXPECTED_STATE_SHA"
say "total_nonce_leaf_count=$total_nonce_leaf_count"
say "unique_nonce_account_count=$unique_nonce_account_count"
say "nonzero_nonce_account_count=$count"
say "nonce_1_count=$dist_1"
say "nonce_3_count=$dist_3"
say "nonce_9_count=$dist_9"
say "nonce_111_count=$dist_111"
say "nonce_127_count=$dist_127"
say "nonce_130_count=$dist_130"
say "nonce_273_count=$dist_273"
say "maximum_nonce=273"
say "canonical_nonce_tsv_sha256=$tsv_sha"
say "known_retained_raw_transaction_signer=$KNOWN_SIGNER"
say "known_retained_raw_transaction_nonce=$KNOWN_RAW_NONCE"
say "known_signer_frozen_final_nonce=$known_final_nonce"
say "known_retained_raw_transaction_stale_under_exact_nonce_continuity=true"
say "pending_legacy_signed_transaction_census_complete=false"
say "cross_epoch_replay_protection_proven=false"
say "receipt=$receipt"
say "receipt_sha256=$receipt_sha"
say "${MARKER}_GREEN"
