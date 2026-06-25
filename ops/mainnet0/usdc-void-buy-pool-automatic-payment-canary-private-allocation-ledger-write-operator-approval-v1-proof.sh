#!/usr/bin/env bash
set -euo pipefail

echo "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_PRIVATE_ALLOCATION_LEDGER_WRITE_OPERATOR_APPROVAL_V1_PROOF_BEGIN"

n="usdc-void-buy-pool-automatic-payment-canary-private-allocation-ledger-write-operator-approval-v1"
doc="docs/private/$n.md"
approve_fixture="fixtures/private/$n-approve.example.json"
hold_fixture="fixtures/private/$n-hold.example.json"
gate="ops/mainnet0/$n.py"

packet_hold_proof="ops/mainnet0/usdc-void-buy-pool-automatic-payment-canary-private-allocation-ledger-write-packet-hold-v1-proof.sh"
packet_hold_out="/tmp/void-canary-private-allocation-ledger-write-packet-hold-v1-output.json"

approve_out="/tmp/void-canary-private-allocation-ledger-write-operator-approval-v1-approve-output.json"
hold_out="/tmp/void-canary-private-allocation-ledger-write-operator-approval-v1-hold-output.json"
reject_fixture="/tmp/void-canary-private-allocation-ledger-write-operator-approval-v1-reject-fixture.json"
reject_out="/tmp/void-canary-private-allocation-ledger-write-operator-approval-v1-reject-output.json"
bad_fixture="/tmp/void-canary-private-allocation-ledger-write-operator-approval-v1-bad-fixture.json"

test -f "$doc"
test -f "$approve_fixture"
test -f "$hold_fixture"
test -x "$gate"
test -x "$packet_hold_proof"

python3 - "$gate" <<'PYCOMPILE'
import pathlib
import sys
path = pathlib.Path(sys.argv[1])
compile(path.read_text(encoding="utf-8"), str(path), "exec")
PYCOMPILE

python3 -m json.tool "$approve_fixture" >/tmp/void-ledger-write-approval-approve.pretty.json
python3 -m json.tool "$hold_fixture" >/tmp/void-ledger-write-approval-hold.pretty.json
echo "automatic_payment_canary_private_allocation_ledger_write_operator_approval_files_exist=true"

grep -q 'VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_PRIVATE_ALLOCATION_LEDGER_WRITE_OPERATOR_APPROVAL_V1' "$doc"
grep -q 'VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_PRIVATE_ALLOCATION_LEDGER_WRITE_OPERATOR_APPROVAL_V1' "$gate"
echo "automatic_payment_canary_private_allocation_ledger_write_operator_approval_marker_green=true"

bash "$packet_hold_proof" >/tmp/void-ledger-write-operator-approval-upstream-packet-proof.log
test -f "$packet_hold_out"

CANARY_PRIVATE_ALLOCATION_LEDGER_WRITE_PACKET_HOLD_OUTPUT_JSON="$packet_hold_out" \
CANARY_PRIVATE_ALLOCATION_LEDGER_WRITE_OPERATOR_DECISION_JSON="$approve_fixture" \
python3 "$gate" > "$approve_out"

CANARY_PRIVATE_ALLOCATION_LEDGER_WRITE_PACKET_HOLD_OUTPUT_JSON="$packet_hold_out" \
CANARY_PRIVATE_ALLOCATION_LEDGER_WRITE_OPERATOR_DECISION_JSON="$hold_fixture" \
python3 "$gate" > "$hold_out"

cat > "$reject_fixture" <<'JSON'
{
  "operator_private_allocation_ledger_write_decision": "reject_private_allocation_ledger_write_packet",
  "reviewer": "operator",
  "review_note": "canary private allocation ledger write packet rejected by operator",
  "max_packet_count": 1
}
JSON

CANARY_PRIVATE_ALLOCATION_LEDGER_WRITE_PACKET_HOLD_OUTPUT_JSON="$packet_hold_out" \
CANARY_PRIVATE_ALLOCATION_LEDGER_WRITE_OPERATOR_DECISION_JSON="$reject_fixture" \
python3 "$gate" > "$reject_out"

python3 - "$approve_out" "$hold_out" "$reject_out" <<'PY'
import json
import sys

approve = json.load(open(sys.argv[1], "r", encoding="utf-8"))
hold = json.load(open(sys.argv[2], "r", encoding="utf-8"))
reject = json.load(open(sys.argv[3], "r", encoding="utf-8"))

marker = "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_PRIVATE_ALLOCATION_LEDGER_WRITE_OPERATOR_APPROVAL_V1"

assert approve["marker"] == marker
assert approve["ok"] is True
assert approve["operator_approval"]["state"] == "approved_pending_separate_private_allocation_ledger_write_execute"
assert approve["operator_approval"]["decision"] == "approve_for_separate_private_allocation_ledger_write_execute"
assert approve["operator_approval"]["approved_for_separate_private_allocation_ledger_write_execute"] is True
assert approve["authority"]["private_allocation_ledger_write_execute_approved"] is True

for k in [
    "private_allocation_ledger_write_now",
    "private_allocation_ledger_mutation",
    "fulfillment_execution",
    "wallet_signing",
    "void_transfer",
    "public_mutation",
    "public_buyer_execution"
]:
    assert approve["authority"][k] is False, k

packet = approve["private_allocation_ledger_write_packet"]
assert packet["packet_status"] == "held_pending_separate_operator_private_allocation_ledger_write_review"
assert packet["packet_id"].startswith("void_canary_private_allocation_ledger_write_packet_")
assert packet["allocation_record_id"].startswith("void_canary_allocation_record_")
assert packet["reserved_void_amount"] == "200"
assert packet["inventory_remaining_before"] == "200"
assert packet["inventory_remaining_after"] == "0"

assert hold["ok"] is True
assert hold["operator_approval"]["state"] == "held_for_operator_review"
assert hold["operator_approval"]["approved_for_separate_private_allocation_ledger_write_execute"] is False
assert hold["authority"]["private_allocation_ledger_write_execute_approved"] is False
assert hold["authority"]["private_allocation_ledger_write_now"] is False
assert hold["authority"]["private_allocation_ledger_mutation"] is False
assert hold["authority"]["void_transfer"] is False

assert reject["ok"] is True
assert reject["operator_approval"]["state"] == "rejected_by_operator"
assert reject["operator_approval"]["approved_for_separate_private_allocation_ledger_write_execute"] is False
assert reject["authority"]["private_allocation_ledger_write_execute_approved"] is False
assert reject["authority"]["private_allocation_ledger_write_now"] is False
assert reject["authority"]["private_allocation_ledger_mutation"] is False
assert reject["authority"]["void_transfer"] is False

print("automatic_payment_canary_private_allocation_ledger_write_operator_approval_semantics_green=true")
PY

cat > "$bad_fixture" <<'JSON'
{
  "operator_private_allocation_ledger_write_decision": "approve_and_write_private_allocation_ledger_now",
  "reviewer": "operator",
  "review_note": "bad decision tries to approve immediate private ledger write",
  "max_packet_count": 1
}
JSON

if CANARY_PRIVATE_ALLOCATION_LEDGER_WRITE_PACKET_HOLD_OUTPUT_JSON="$packet_hold_out" \
CANARY_PRIVATE_ALLOCATION_LEDGER_WRITE_OPERATOR_DECISION_JSON="$bad_fixture" \
python3 "$gate" >/tmp/void-ledger-write-operator-approval-bad-output.json 2>/dev/null; then
  echo "automatic_payment_canary_private_allocation_ledger_write_operator_approval_bad_decision_unexpected_pass=true"
  exit 1
else
  echo "automatic_payment_canary_private_allocation_ledger_write_operator_approval_bad_decision_rejected=true"
fi

bad_reviewer_fixture="/tmp/void-canary-private-allocation-ledger-write-operator-approval-v1-bad-reviewer-fixture.json"
cat > "$bad_reviewer_fixture" <<'JSON'
{
  "operator_private_allocation_ledger_write_decision": "approve_for_separate_private_allocation_ledger_write_execute",
  "reviewer": "not_operator",
  "review_note": "bad reviewer",
  "max_packet_count": 1
}
JSON

if CANARY_PRIVATE_ALLOCATION_LEDGER_WRITE_PACKET_HOLD_OUTPUT_JSON="$packet_hold_out" \
CANARY_PRIVATE_ALLOCATION_LEDGER_WRITE_OPERATOR_DECISION_JSON="$bad_reviewer_fixture" \
python3 "$gate" >/tmp/void-ledger-write-operator-approval-bad-reviewer-output.json 2>/dev/null; then
  echo "automatic_payment_canary_private_allocation_ledger_write_operator_approval_bad_reviewer_unexpected_pass=true"
  exit 1
else
  echo "automatic_payment_canary_private_allocation_ledger_write_operator_approval_bad_reviewer_rejected=true"
fi

grep -RInE 'PRIVATE_KEY|MNEMONIC|SEED' "$doc" "$approve_fixture" "$hold_fixture" "$gate" && {
  echo "automatic_payment_canary_private_allocation_ledger_write_operator_approval_secret_word_leak_found=true"
  exit 1
} || echo "automatic_payment_canary_private_allocation_ledger_write_operator_approval_secret_word_leak_absent=true"

grep -RInE '0x[a-fA-F0-9]{64}' "$doc" "$approve_fixture" "$hold_fixture" "$gate" && {
  echo "automatic_payment_canary_private_allocation_ledger_write_operator_approval_raw_key_like_hex_found=true"
  exit 1
} || echo "automatic_payment_canary_private_allocation_ledger_write_operator_approval_raw_key_like_hex_absent=true"

echo "automatic_payment_canary_private_allocation_ledger_write_operator_approval_secret_leak_absent=true"
echo "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_PRIVATE_ALLOCATION_LEDGER_WRITE_OPERATOR_APPROVAL_V1_GREEN"
