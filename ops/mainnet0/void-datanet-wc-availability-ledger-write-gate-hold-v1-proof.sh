#!/usr/bin/env bash

DOC="docs/work-credits/void-datanet-wc-availability-ledger-write-gate-hold-v1.md"
SCHEMA="fixtures/work-credits/void-datanet-wc-availability-ledger-write-gate-hold-schema-v1.json"
EXAMPLE="fixtures/work-credits/void-datanet-wc-availability-ledger-write-gate-hold-example-v1.json"
MARKER="VOID_DATANET_WC_AVAILABILITY_LEDGER_WRITE_GATE_HOLD_V1"

fail() {
  echo "void_datanet_wc_availability_ledger_write_gate_hold_v1_proof=FAIL reason=$1"
  exit 1
}

[ -f "$DOC" ] || fail "missing_doc"
[ -f "$SCHEMA" ] || fail "missing_schema"
[ -f "$EXAMPLE" ] || fail "missing_example"

grep -Fq "$MARKER" "$DOC" || fail "missing_marker_doc"
grep -Fq "$MARKER" "$SCHEMA" || fail "missing_marker_schema"
grep -Fq "$MARKER" "$EXAMPLE" || fail "missing_marker_example"

grep -Fq "Ledger-write gate/hold only; no WC issuance and no WC ledger write." "$DOC" || fail "missing_status"
grep -Fq "This gate does not issue Work Credits and does not write the WC ledger." "$DOC" || fail "missing_no_issue_or_ledger_clause"
grep -Fq "A later WC ledger write packet would still be required before any Work Credits exist." "$DOC" || fail "missing_later_ledger_packet_boundary"
grep -Fq "A later operator approval packet would still be required before any ledger write packet can be executed." "$DOC" || fail "missing_later_operator_approval_boundary"

python3 - "$SCHEMA" "$EXAMPLE" <<'PY'
import json
import sys

schema_path, example_path = sys.argv[1], sys.argv[2]
schema = json.load(open(schema_path, "r", encoding="utf-8"))
example = json.load(open(example_path, "r", encoding="utf-8"))

marker = "VOID_DATANET_WC_AVAILABILITY_LEDGER_WRITE_GATE_HOLD_V1"
assert schema["marker"] == marker
assert example["marker"] == marker
assert schema["status"] == "ledger_write_gate_hold_only_no_wc_issuance_no_wc_ledger_write"
assert example["packet_kind"] == schema["packet_kind"]

for field in schema["required_fields"]:
    assert field in example, f"missing required field: {field}"

required = schema["required_upstream_markers"]
for key, value in required.items():
    assert example["required_upstream_markers"][key] == value, f"upstream marker mismatch: {key}"

assert example["reviewer_decision"] == "approved_for_wc_review"
assert example["duplicate_guard_result"] == "not_duplicate"
assert example["recommendation_status"] == "award_recommendation_hold_present"
assert example["rollup_status"] == "ready_for_future_wc_ledger_review"
assert example["gate_status"] in schema["allowed_gate_status"]
assert example["gate_status"] == "held_ready_for_future_operator_review"
assert example["later_ledger_packet_id"] is None
assert example["later_operator_approval"] is False

for key in schema["wc_boundary_required_false"]:
    assert example["wc_boundary"][key] is False, f"wc boundary not false: {key}"

for key in schema["authority_boundary_required_false"]:
    assert example["authority_boundary"][key] is False, f"authority boundary not false: {key}"

print("schema_json_green=true")
print("example_ledger_write_gate_hold_green=true")
PY

if grep -R "issues_work_credits.*true\|writes_wc_ledger.*true\|creates_ledger_line.*true\|allocates_void.*true\|transfers_void.*true\|automatic_reward.*true\|activates_public_mutation.*true\|grants_signer_wallet_access.*true\|authorizes_execution.*true\|moves_funds.*true" "$SCHEMA" "$EXAMPLE" "$DOC" >/tmp/void_datanet_wc_ledger_write_gate_hold_forbidden_true.txt; then
  cat /tmp/void_datanet_wc_ledger_write_gate_hold_forbidden_true.txt
  fail "forbidden_true_flag"
fi

echo "void_datanet_wc_availability_ledger_write_gate_hold_v1_proof=GREEN marker=$MARKER"
