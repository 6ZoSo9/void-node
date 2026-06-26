#!/usr/bin/env bash

DOC="docs/work-credits/void-datanet-wc-availability-ledger-write-execution-authorization-hold-v1.md"
SCHEMA="fixtures/work-credits/void-datanet-wc-availability-ledger-write-execution-authorization-hold-schema-v1.json"
EXAMPLE="fixtures/work-credits/void-datanet-wc-availability-ledger-write-execution-authorization-hold-example-v1.json"
MARKER="VOID_DATANET_WC_AVAILABILITY_LEDGER_WRITE_EXECUTION_AUTHORIZATION_HOLD_V1"

fail() {
  echo "void_datanet_wc_availability_ledger_write_execution_authorization_hold_v1_proof=FAIL reason=$1"
  exit 1
}

[ -f "$DOC" ] || fail "missing_doc"
[ -f "$SCHEMA" ] || fail "missing_schema"
[ -f "$EXAMPLE" ] || fail "missing_example"

grep -Fq "$MARKER" "$DOC" || fail "missing_marker_doc"
grep -Fq "$MARKER" "$SCHEMA" || fail "missing_marker_schema"
grep -Fq "$MARKER" "$EXAMPLE" || fail "missing_marker_example"

grep -Fq "Ledger-write execution authorization hold only; no WC issuance and no WC ledger write." "$DOC" || fail "missing_status"
grep -Fq "This artifact does not authorize execution, issue Work Credits, write the WC ledger, create a ledger line, or append to a ledger file." "$DOC" || fail "missing_no_authorization_or_mutation_clause"
grep -Fq "A later operator approval packet would still be required before execution can be authorized." "$DOC" || fail "missing_later_operator_boundary"
grep -Fq "A later actual WC ledger write packet and execution proof would still be required before any Work Credits exist." "$DOC" || fail "missing_later_actual_write_boundary"

python3 - "$SCHEMA" "$EXAMPLE" <<'PY'
import json
import sys

schema_path, example_path = sys.argv[1], sys.argv[2]
schema = json.load(open(schema_path, "r", encoding="utf-8"))
example = json.load(open(example_path, "r", encoding="utf-8"))

marker = "VOID_DATANET_WC_AVAILABILITY_LEDGER_WRITE_EXECUTION_AUTHORIZATION_HOLD_V1"
assert schema["marker"] == marker
assert example["marker"] == marker
assert schema["status"] == "ledger_write_execution_authorization_hold_only_no_wc_issuance_no_wc_ledger_write"
assert example["packet_kind"] == schema["packet_kind"]

for field in schema["required_fields"]:
    assert field in example, f"missing required field: {field}"

for key, value in schema["required_upstream_markers"].items():
    assert example["required_upstream_markers"][key] == value, f"upstream marker mismatch: {key}"

assert example["reviewer_decision"] == "approved_for_wc_review"
assert example["duplicate_guard_result"] == "not_duplicate"
assert example["recommendation_status"] == "award_recommendation_hold_present"
assert example["rollup_status"] == "ready_for_future_wc_ledger_review"
assert example["gate_status"] == "held_ready_for_future_operator_review"
assert example["approval_status"] == "held_operator_review_required"
assert example["operator_approval_granted"] is False
assert example["packet_status"] == "held_packet_shape_only"
assert example["preflight_status"] == "held_waiting_operator_approval"
assert example["execution_authorization_status"] in schema["allowed_execution_authorization_status"]
assert example["execution_authorization_status"] == "held_execution_authorization_required"
assert example["execution_authorization_granted"] is False
assert isinstance(example["proposed_wc_amount"], int)
assert example["proposed_wc_amount"] > 0
assert isinstance(example["proposed_ledger_entry_id"], str)
assert example["proposed_ledger_entry_id"]
assert example["proposed_ledger_append_mode"] in schema["allowed_ledger_append_modes"]

for key in schema["wc_boundary_required_false"]:
    assert example["wc_boundary"][key] is False, f"wc boundary not false: {key}"

for key in schema["authority_boundary_required_false"]:
    assert example["authority_boundary"][key] is False, f"authority boundary not false: {key}"

print("schema_json_green=true")
print("example_ledger_write_execution_authorization_hold_green=true")
PY

if grep -R "issues_work_credits.*true\|writes_wc_ledger.*true\|creates_ledger_line.*true\|appends_to_ledger_file.*true\|allocates_void.*true\|transfers_void.*true\|automatic_reward.*true\|approves_ledger_write.*true\|executes_ledger_write.*true\|authorizes_ledger_write_execution.*true\|activates_public_mutation.*true\|grants_signer_wallet_access.*true\|authorizes_execution.*true\|moves_funds.*true" "$SCHEMA" "$EXAMPLE" "$DOC" >/tmp/void_datanet_wc_ledger_write_execution_authorization_hold_forbidden_true.txt; then
  cat /tmp/void_datanet_wc_ledger_write_execution_authorization_hold_forbidden_true.txt
  fail "forbidden_true_flag"
fi

echo "void_datanet_wc_availability_ledger_write_execution_authorization_hold_v1_proof=GREEN marker=$MARKER"
