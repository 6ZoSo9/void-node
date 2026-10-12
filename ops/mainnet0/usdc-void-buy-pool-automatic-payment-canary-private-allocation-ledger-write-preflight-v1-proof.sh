#!/usr/bin/env bash
set -euo pipefail

echo "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_PRIVATE_ALLOCATION_LEDGER_WRITE_PREFLIGHT_V1_PROOF_BEGIN"

n="usdc-void-buy-pool-automatic-payment-canary-private-allocation-ledger-write-preflight-v1"
doc="docs/private/$n.md"
policy="fixtures/private/$n-policy.example.json"
gate="ops/mainnet0/$n.py"

upstream_proof="ops/mainnet0/usdc-void-buy-pool-automatic-payment-canary-allocation-record-creation-gate-v1-proof.sh"
alloc_out="/tmp/void-canary-allocation-record-creation-gate-v1-output.json"
preflight_out="/tmp/void-canary-private-allocation-ledger-write-preflight-v1-output.json"

test -f "$doc"
test -f "$policy"
test -x "$gate"
test -x "$upstream_proof"
python3 - "$gate" <<'PYCOMPILE'
import pathlib
import sys

path = pathlib.Path(sys.argv[1])
compile(path.read_text(encoding="utf-8"), str(path), "exec")
PYCOMPILE
python3 -m json.tool "$policy" >/tmp/void-canary-private-ledger-preflight-policy.pretty.json
echo "automatic_payment_canary_private_allocation_ledger_write_preflight_files_exist=true"

grep -q 'VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_PRIVATE_ALLOCATION_LEDGER_WRITE_PREFLIGHT_V1' "$doc"
grep -q 'VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_PRIVATE_ALLOCATION_LEDGER_WRITE_PREFLIGHT_V1' "$gate"
grep -q 'VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_PRIVATE_ALLOCATION_LEDGER_WRITE_PREFLIGHT_V1' "$policy"
echo "automatic_payment_canary_private_allocation_ledger_write_preflight_marker_green=true"

bash "$upstream_proof" >/tmp/void-canary-private-ledger-preflight-upstream-proof.log
test -f "$alloc_out"

CANARY_ALLOCATION_RECORD_CREATION_OUTPUT_JSON="$alloc_out" \
CANARY_PRIVATE_ALLOCATION_LEDGER_WRITE_PREFLIGHT_POLICY_JSON="$policy" \
python3 "$gate" > "$preflight_out"

python3 - "$preflight_out" <<'PY'
import json
import sys

with open(sys.argv[1], "r", encoding="utf-8") as f:
    d = json.load(f)

assert d["marker"] == "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_PRIVATE_ALLOCATION_LEDGER_WRITE_PREFLIGHT_V1"

g = d["private_allocation_ledger_write_preflight"]
assert g["ok"] is True
assert g["state"] == "eligible_pending_separate_private_allocation_ledger_write_packet"

a = d["authority"]
assert a["preflight_passed"] is True
assert a["private_allocation_ledger_write_now"] is False
assert a["private_allocation_ledger_mutation"] is False
assert a["fulfillment_execution"] is False
assert a["wallet_signing"] is False
assert a["void_transfer"] is False
assert a["public_mutation"] is False
assert a["public_buyer_execution"] is False

p = d["preflight"]
assert p["preflight_status"] == "eligible_pending_separate_private_allocation_ledger_write_packet"
assert p["reserved_void_amount"] == "200"
assert p["inventory_remaining_before"] == "200"
assert p["inventory_remaining_after"] == "0"
assert p["allocation_record_id"].startswith("void_canary_allocation_record_")
assert p["canonical_payment_identity"]
assert p["canary"]["allocation_record_limit"] == 1
assert p["canary"]["allocation_records_preflighted_after"] == 1
assert p["operator_review_required_before_actual_ledger_write"] is True
assert p["downstream_authority"]["private_allocation_ledger_write_now"] is False
assert p["downstream_authority"]["private_allocation_ledger_mutation"] is False
assert p["downstream_authority"]["fulfillment_execution"] is False
assert p["downstream_authority"]["wallet_signing"] is False
assert p["downstream_authority"]["void_transfer"] is False
assert p["downstream_authority"]["public_mutation"] is False
assert p["downstream_authority"]["public_buyer_execution"] is False

print("automatic_payment_canary_private_allocation_ledger_write_preflight_semantics_green=true")
PY

tmp_bad_policy="/tmp/void-canary-private-ledger-preflight-bad-policy.json"
python3 - <<'PY' > "$tmp_bad_policy"
import json
p = {
  "marker": "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_PRIVATE_ALLOCATION_LEDGER_WRITE_PREFLIGHT_V1_BAD_POLICY",
  "expected_allocation_record_creation_state": "allocation_record_created_pending_private_allocation_ledger_write_gate",
  "expected_allocation_record_status": "allocation_record_created_pending_private_allocation_ledger_write_gate",
  "canary_allocation_record_limit": 1,
  "canary_allocation_records_already_preflighted": 0,
  "allow_private_allocation_ledger_write_preflight": True,
  "allow_private_allocation_ledger_write_now": True,
  "allow_fulfillment_execution": False,
  "allow_wallet_signing": False,
  "allow_void_transfer": False,
  "allow_public_mutation": False,
  "operator_review_required_before_actual_ledger_write": True
}
print(json.dumps(p, indent=2, sort_keys=True))
PY

if CANARY_ALLOCATION_RECORD_CREATION_OUTPUT_JSON="$alloc_out" \
CANARY_PRIVATE_ALLOCATION_LEDGER_WRITE_PREFLIGHT_POLICY_JSON="$tmp_bad_policy" \
python3 "$gate" >/tmp/void-canary-private-ledger-preflight-bad-policy-output.json 2>/dev/null; then
  echo "automatic_payment_canary_private_allocation_ledger_write_preflight_bad_policy_unexpected_pass=true"
  exit 1
else
  echo "automatic_payment_canary_private_allocation_ledger_write_preflight_bad_policy_rejected=true"
fi

tmp_exhausted_policy="/tmp/void-canary-private-ledger-preflight-exhausted-policy.json"
python3 - <<'PY' > "$tmp_exhausted_policy"
import json
p = {
  "marker": "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_PRIVATE_ALLOCATION_LEDGER_WRITE_PREFLIGHT_V1_EXHAUSTED_POLICY",
  "expected_allocation_record_creation_state": "allocation_record_created_pending_private_allocation_ledger_write_gate",
  "expected_allocation_record_status": "allocation_record_created_pending_private_allocation_ledger_write_gate",
  "canary_allocation_record_limit": 1,
  "canary_allocation_records_already_preflighted": 1,
  "allow_private_allocation_ledger_write_preflight": True,
  "allow_private_allocation_ledger_write_now": False,
  "allow_fulfillment_execution": False,
  "allow_wallet_signing": False,
  "allow_void_transfer": False,
  "allow_public_mutation": False,
  "operator_review_required_before_actual_ledger_write": True
}
print(json.dumps(p, indent=2, sort_keys=True))
PY

CANARY_ALLOCATION_RECORD_CREATION_OUTPUT_JSON="$alloc_out" \
CANARY_PRIVATE_ALLOCATION_LEDGER_WRITE_PREFLIGHT_POLICY_JSON="$tmp_exhausted_policy" \
python3 "$gate" >/tmp/void-canary-private-ledger-preflight-exhausted-output.json

python3 - <<'PY'
import json
with open("/tmp/void-canary-private-ledger-preflight-exhausted-output.json", "r", encoding="utf-8") as f:
    d = json.load(f)
assert d["private_allocation_ledger_write_preflight"]["ok"] is True
assert d["private_allocation_ledger_write_preflight"]["state"] == "blocked_canary_preflight_limit_exhausted"
assert d["preflight"] is None
assert d["authority"]["preflight_passed"] is False
assert d["authority"]["private_allocation_ledger_write_now"] is False
assert d["authority"]["private_allocation_ledger_mutation"] is False
print("automatic_payment_canary_private_allocation_ledger_write_preflight_limit_block_green=true")
PY

grep -RInE 'PRIVATE_KEY|MNEMONIC|SEED' "$doc" "$policy" "$gate" && {
  echo "automatic_payment_canary_private_allocation_ledger_write_preflight_secret_word_leak_found=true"
  exit 1
} || echo "automatic_payment_canary_private_allocation_ledger_write_preflight_secret_word_leak_absent=true"

grep -RInE '0x[a-fA-F0-9]{64}' "$doc" "$policy" "$gate" && {
  echo "automatic_payment_canary_private_allocation_ledger_write_preflight_raw_key_like_hex_found=true"
  exit 1
} || echo "automatic_payment_canary_private_allocation_ledger_write_preflight_raw_key_like_hex_absent=true"

echo "automatic_payment_canary_private_allocation_ledger_write_preflight_secret_leak_absent=true"
echo "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_PRIVATE_ALLOCATION_LEDGER_WRITE_PREFLIGHT_V1_GREEN"
