#!/usr/bin/env bash
set -euo pipefail

echo "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_ALLOCATION_RECORD_CREATION_GATE_V1_PROOF_BEGIN"

n="usdc-void-buy-pool-automatic-payment-canary-allocation-record-creation-gate-v1"
doc="docs/private/$n.md"
policy="fixtures/private/$n-policy.example.json"
gate="ops/mainnet0/$n.py"
prev_proof="ops/mainnet0/usdc-void-buy-pool-automatic-payment-canary-inventory-reserve-actual-execute-v1-proof.sh"
actual_out="/tmp/void-canary-inventory-reserve-actual-execute-stdout.json"
record_out="/tmp/void-canary-allocation-record-creation-gate-v1-output.json"

test -f "$doc"
test -f "$policy"
test -x "$gate"
test -x "$prev_proof"
echo "automatic_payment_canary_allocation_record_creation_gate_files_exist=true"

grep -q 'VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_ALLOCATION_RECORD_CREATION_GATE_V1' "$doc"
grep -q 'VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_ALLOCATION_RECORD_CREATION_GATE_V1' "$gate"
echo "automatic_payment_canary_allocation_record_creation_gate_marker_green=true"

bash "$prev_proof" >/tmp/void-canary-allocation-record-creation-upstream-proof.log

test -f "$actual_out"

CANARY_INVENTORY_RESERVE_ACTUAL_EXECUTE_OUTPUT_JSON="$actual_out" \
CANARY_ALLOCATION_RECORD_CREATION_POLICY_JSON="$policy" \
python3 "$gate" > "$record_out"

python3 - "$record_out" <<'PY'
import json
import sys

path = sys.argv[1]
with open(path, "r", encoding="utf-8") as f:
    d = json.load(f)

assert d["marker"] == "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_ALLOCATION_RECORD_CREATION_GATE_V1"
assert d["allocation_record_creation_gate"]["ok"] is True
assert d["allocation_record_creation_gate"]["state"] == "allocation_record_created_pending_private_allocation_ledger_write_gate"

auth = d["authority"]
assert auth["inventory_already_reserved"] is True
assert auth["allocation_record_created"] is True
assert auth["private_allocation_ledger_write"] is False
assert auth["fulfillment_execution"] is False
assert auth["wallet_signing"] is False
assert auth["void_transfer"] is False
assert auth["public_mutation"] is False
assert auth["public_buyer_execution"] is False

r = d["allocation_record"]
assert r["allocation_record_status"] == "allocation_record_created_pending_private_allocation_ledger_write_gate"
assert r["reserved_void_amount"] == "200"
assert r["inventory_remaining_before"] == "200"
assert r["inventory_remaining_after"] == "0"
assert r["canonical_payment_identity"]
assert r["allocation_record_id"].startswith("void_canary_allocation_record_")
assert r["canary"]["candidate_limit"] == 1
assert r["canary"]["allocation_record_count_after"] == 1
assert r["canary"]["operator_review_required_after_record_creation"] is True
assert r["downstream_authority"]["private_allocation_ledger_write"] is False
assert r["downstream_authority"]["fulfillment_execution"] is False
assert r["downstream_authority"]["wallet_signing"] is False
assert r["downstream_authority"]["void_transfer"] is False
assert r["downstream_authority"]["public_mutation"] is False

print("automatic_payment_canary_allocation_record_creation_gate_semantics_green=true")
PY

tmp_bad_policy="/tmp/void-canary-allocation-record-creation-bad-policy.json"
python3 - <<'PY' > "$tmp_bad_policy"
import json
p = {
  "marker": "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_ALLOCATION_RECORD_CREATION_GATE_V1_BAD_POLICY",
  "expected_actual_execute_state": "inventory_reserved_and_decremented",
  "expected_actual_execute_result_status": "inventory_reserved_pending_allocation_record_gate",
  "canary_candidate_limit": 1,
  "canary_allocation_records_already_created": 0,
  "allow_allocation_record_creation": True,
  "allow_private_allocation_ledger_write": True,
  "allow_fulfillment_execution": False,
  "allow_wallet_signing": False,
  "allow_void_transfer": False,
  "allow_public_mutation": False,
  "operator_review_required_after_record_creation": True
}
print(json.dumps(p, indent=2, sort_keys=True))
PY

if CANARY_INVENTORY_RESERVE_ACTUAL_EXECUTE_OUTPUT_JSON="$actual_out" \
CANARY_ALLOCATION_RECORD_CREATION_POLICY_JSON="$tmp_bad_policy" \
python3 "$gate" >/tmp/void-canary-allocation-record-creation-bad-policy-output.json 2>/dev/null; then
  echo "automatic_payment_canary_allocation_record_creation_bad_policy_unexpected_pass=true"
  exit 1
else
  echo "automatic_payment_canary_allocation_record_creation_bad_policy_rejected=true"
fi

tmp_exhausted_policy="/tmp/void-canary-allocation-record-creation-exhausted-policy.json"
python3 - <<'PY' > "$tmp_exhausted_policy"
import json
p = {
  "marker": "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_ALLOCATION_RECORD_CREATION_GATE_V1_EXHAUSTED_POLICY",
  "expected_actual_execute_state": "inventory_reserved_and_decremented",
  "expected_actual_execute_result_status": "inventory_reserved_pending_allocation_record_gate",
  "canary_candidate_limit": 1,
  "canary_allocation_records_already_created": 1,
  "allow_allocation_record_creation": True,
  "allow_private_allocation_ledger_write": False,
  "allow_fulfillment_execution": False,
  "allow_wallet_signing": False,
  "allow_void_transfer": False,
  "allow_public_mutation": False,
  "operator_review_required_after_record_creation": True
}
print(json.dumps(p, indent=2, sort_keys=True))
PY

exhausted_out="$(CANARY_INVENTORY_RESERVE_ACTUAL_EXECUTE_OUTPUT_JSON="$actual_out" CANARY_ALLOCATION_RECORD_CREATION_POLICY_JSON="$tmp_exhausted_policy" python3 "$gate")"
printf '%s\n' "$exhausted_out" >/tmp/void-canary-allocation-record-creation-exhausted-output.json

python3 - <<'PY'
import json
with open("/tmp/void-canary-allocation-record-creation-exhausted-output.json", "r", encoding="utf-8") as f:
    d = json.load(f)
assert d["allocation_record_creation_gate"]["ok"] is True
assert d["allocation_record_creation_gate"]["state"] == "blocked_canary_allocation_record_limit_exhausted"
assert d["allocation_record"] is None
assert d["authority"]["allocation_record_created"] is False
assert d["authority"]["private_allocation_ledger_write"] is False
print("automatic_payment_canary_allocation_record_creation_limit_block_green=true")
PY

grep -RInE 'PRIVATE_KEY|MNEMONIC|SEED' "$doc" "$policy" "$gate" && {
  echo "automatic_payment_canary_allocation_record_creation_secret_word_leak_found=true"
  exit 1
} || echo "automatic_payment_canary_allocation_record_creation_secret_word_leak_absent=true"

grep -RInE '0x[a-fA-F0-9]{64}' "$doc" "$policy" "$gate" && {
  echo "automatic_payment_canary_allocation_record_creation_raw_key_like_hex_found=true"
  exit 1
} || echo "automatic_payment_canary_allocation_record_creation_raw_key_like_hex_absent=true"

echo "automatic_payment_canary_allocation_record_creation_secret_leak_absent=true"
echo "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_ALLOCATION_RECORD_CREATION_GATE_V1_GREEN"
