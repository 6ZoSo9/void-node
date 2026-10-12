#!/usr/bin/env bash

DOC="docs/work-credits/void-datanet-wc-availability-public-no-write-closeout-summary-v1.md"
SCHEMA="fixtures/work-credits/void-datanet-wc-availability-public-no-write-closeout-summary-schema-v1.json"
EXAMPLE="fixtures/work-credits/void-datanet-wc-availability-public-no-write-closeout-summary-example-v1.json"
SOURCE="fixtures/work-credits/void-datanet-wc-availability-ledger-write-no-write-closeout-rollup-example-v1.json"
MARKER="VOID_DATANET_WC_AVAILABILITY_PUBLIC_NO_WRITE_CLOSEOUT_SUMMARY_V1"

fail() {
  echo "void_datanet_wc_availability_public_no_write_closeout_summary_v1_proof=FAIL reason=$1"
  exit 1
}

[ -f "$DOC" ] || fail "missing_doc"
[ -f "$SCHEMA" ] || fail "missing_schema"
[ -f "$EXAMPLE" ] || fail "missing_example"
[ -f "$SOURCE" ] || fail "missing_source_closeout_example"

grep -Fq "$MARKER" "$DOC" || fail "missing_marker_doc"
grep -Fq "$MARKER" "$SCHEMA" || fail "missing_marker_schema"
grep -Fq "$MARKER" "$EXAMPLE" || fail "missing_marker_example"

grep -Fq "Public-safe no-write closeout summary only; no WC issuance and no WC ledger write." "$DOC" || fail "missing_status"
grep -Fq "This artifact is safe to show publicly because it contains no participant identifier" "$DOC" || fail "missing_public_safety_clause"
grep -Fq "A later actual WC ledger write packet and execution proof would still be required before any Work Credits exist." "$DOC" || fail "missing_later_actual_write_boundary"

python3 - "$SCHEMA" "$EXAMPLE" "$SOURCE" <<'PY'
import json
import sys

schema_path, example_path, source_path = sys.argv[1], sys.argv[2], sys.argv[3]
schema = json.load(open(schema_path, "r", encoding="utf-8"))
example = json.load(open(example_path, "r", encoding="utf-8"))
source = json.load(open(source_path, "r", encoding="utf-8"))

marker = "VOID_DATANET_WC_AVAILABILITY_PUBLIC_NO_WRITE_CLOSEOUT_SUMMARY_V1"
assert schema["marker"] == marker
assert example["marker"] == marker
assert schema["status"] == "public_safe_no_write_closeout_summary_only_no_wc_issuance_no_wc_ledger_write"
assert example["packet_kind"] == schema["packet_kind"]

for field in schema["required_fields"]:
    assert field in example, f"missing required field: {field}"

for field in schema["forbidden_public_fields"]:
    assert field not in example, f"forbidden public field present: {field}"

for key, value in schema["source_markers"].items():
    assert example["source_markers"][key] == value, f"source marker mismatch: {key}"

assert source["closeout_status"] == "closed_no_write_execute_gate_held"
assert source["ledger_write_performed"] is False
assert source["ledger_file_append_performed"] is False
assert source["wc_issued"] is False
assert source["execute_gate_open"] is False
assert source["ledger_write_execution_allowed"] is False

assert example["public_summary_status"] in schema["allowed_public_summary_status"]
assert example["public_summary_status"] == "public_safe_no_write_closeout_summary"
assert example["earn_status"] in schema["allowed_earn_status"]
assert example["earn_status"] == "reviewed_work_ready_for_future_operator_review_no_wc_issued"
assert example["wc_issuance_status"] == "not_issued"
assert example["wc_ledger_write_status"] == "not_written"
assert example["execute_gate_status"] == "held_execute_gate_closed"
assert example["blocked_result_status"] == "blocked_execute_gate_closed"
assert example["source_closeout_status"] == "closed_no_write_execute_gate_held"
assert example["ledger_write_performed"] is False
assert example["ledger_file_append_performed"] is False
assert example["wc_issued"] is False

for key in schema["wc_boundary_required_false"]:
    assert example["wc_boundary"][key] is False, f"wc boundary not false: {key}"

for key in schema["authority_boundary_required_false"]:
    assert example["authority_boundary"][key] is False, f"authority boundary not false: {key}"

for key in schema["public_safety_boundary_required_false"]:
    assert example["public_safety_boundary"][key] is False, f"public safety boundary not false: {key}"

print("schema_json_green=true")
print("example_public_no_write_closeout_summary_green=true")
print("source_no_write_closeout_binding_green=true")
print("public_safety_boundary_green=true")
PY

python3 - "$SCHEMA" "$EXAMPLE" <<'PY_PUBLIC_FORBIDDEN'
import json
import sys

schema_path, example_path = sys.argv[1], sys.argv[2]
schema = json.load(open(schema_path, "r", encoding="utf-8"))
example = json.load(open(example_path, "r", encoding="utf-8"))

for field in schema["forbidden_public_fields"]:
    assert field not in example, f"forbidden top-level public field present: {field}"

print("forbidden_private_public_fields_absent_green=true")
PY_PUBLIC_FORBIDDEN

if grep -R "issues_work_credits.*true\|writes_wc_ledger.*true\|creates_ledger_line.*true\|appends_to_ledger_file.*true\|allocates_void.*true\|transfers_void.*true\|automatic_reward.*true\|approves_ledger_write.*true\|executes_ledger_write.*true\|authorizes_ledger_write_execution.*true\|opens_execute_gate.*true\|performs_ledger_mutation.*true\|mutates_claim_state.*true\|activates_public_mutation.*true\|grants_signer_wallet_access.*true\|authorizes_execution.*true\|moves_funds.*true\|exposes_participant_identifier.*true\|exposes_object_id.*true\|exposes_content_root.*true\|exposes_reviewer_identifier.*true\|exposes_operator_identifier.*true\|exposes_proposed_ledger_entry_id.*true\|exposes_private_object_material.*true" "$SCHEMA" "$EXAMPLE" "$DOC" >/tmp/void_datanet_wc_public_summary_forbidden_true.txt; then
  cat /tmp/void_datanet_wc_public_summary_forbidden_true.txt
  fail "forbidden_true_flag"
fi

echo "void_datanet_wc_availability_public_no_write_closeout_summary_v1_proof=GREEN marker=$MARKER"
