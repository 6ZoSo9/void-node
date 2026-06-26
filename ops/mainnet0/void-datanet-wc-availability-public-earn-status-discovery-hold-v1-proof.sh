#!/usr/bin/env bash
set -euo pipefail

DOC="docs/work-credits/void-datanet-wc-availability-public-earn-status-discovery-hold-v1.md"
SCHEMA="fixtures/work-credits/void-datanet-wc-availability-public-earn-status-discovery-hold-schema-v1.json"
EXAMPLE="fixtures/work-credits/void-datanet-wc-availability-public-earn-status-discovery-hold-example-v1.json"
SOURCE="fixtures/work-credits/void-datanet-wc-availability-public-earn-status-card-hold-example-v1.json"
MARKER="VOID_DATANET_WC_AVAILABILITY_PUBLIC_EARN_STATUS_DISCOVERY_HOLD_V1"

fail() {
  echo "void_datanet_wc_availability_public_earn_status_discovery_hold_v1_proof=FAIL reason=$1"
  exit 1
}

[ -f "$DOC" ] || fail "missing_doc"
[ -f "$SCHEMA" ] || fail "missing_schema"
[ -f "$EXAMPLE" ] || fail "missing_example"
[ -f "$SOURCE" ] || fail "missing_source_public_earn_status_card"

grep -Fq "$MARKER" "$DOC" || fail "missing_marker_doc"
grep -Fq "$MARKER" "$SCHEMA" || fail "missing_marker_schema"
grep -Fq "$MARKER" "$EXAMPLE" || fail "missing_marker_example"

grep -Fq "Public earn-status discovery hold only; no public route mutation, no WC issuance, and no WC ledger write." "$DOC" || fail "missing_status_doc"
grep -Fq "without creating or mutating any public route" "$DOC" || fail "missing_no_route_mutation_doc"
grep -Fq "This discovery hold must not expose:" "$DOC" || fail "missing_public_safety_doc"
grep -Fq "This artifact is a discovery hold only." "$DOC" || fail "missing_hold_boundary_doc"

python3 - "$SCHEMA" "$EXAMPLE" "$SOURCE" <<'PY'
import json
import sys

schema_path, example_path, source_path = sys.argv[1], sys.argv[2], sys.argv[3]
schema = json.load(open(schema_path, "r", encoding="utf-8"))
example = json.load(open(example_path, "r", encoding="utf-8"))
source = json.load(open(source_path, "r", encoding="utf-8"))

marker = "VOID_DATANET_WC_AVAILABILITY_PUBLIC_EARN_STATUS_DISCOVERY_HOLD_V1"
source_marker = "VOID_DATANET_WC_AVAILABILITY_PUBLIC_EARN_STATUS_CARD_HOLD_V1"

assert schema["marker"] == marker
assert example["marker"] == marker
assert schema["source_marker"] == source_marker
assert example["source_marker"] == source_marker
assert source["marker"] == source_marker

assert schema["status"] == "public_earn_status_discovery_hold_only_no_route_mutation_no_wc_issuance_no_wc_ledger_write"
assert example["packet_kind"] == schema["packet_kind"]

for field in schema["required_fields"]:
    assert field in example, f"missing required field: {field}"

for field in schema["forbidden_public_fields"]:
    assert field not in example, f"forbidden top-level public field present: {field}"

assert source["card_status"] == "public_earn_status_card_held"
assert source["earn_status"] == "reviewed_work_ready_for_future_operator_review_no_wc_issued"
assert source["wc_issuance_status"] == "not_issued"
assert source["wc_ledger_write_status"] == "not_written"
assert source["execute_gate_status"] == "held_execute_gate_closed"

assert example["discovery_status"] in schema["allowed_discovery_status"]
assert example["discovery_status"] == "held_for_future_public_discovery"
assert example["route_mutation_status"] in schema["allowed_route_mutation_status"]
assert example["route_mutation_status"] == "not_mutated"
assert example["index_mutation_status"] in schema["allowed_index_mutation_status"]
assert example["index_mutation_status"] == "not_mutated"
assert example["wc_issuance_status"] in schema["allowed_wc_issuance_status"]
assert example["wc_issuance_status"] == source["wc_issuance_status"]
assert example["wc_ledger_write_status"] in schema["allowed_wc_ledger_write_status"]
assert example["wc_ledger_write_status"] == source["wc_ledger_write_status"]
assert example["execute_gate_status"] in schema["allowed_execute_gate_status"]
assert example["execute_gate_status"] == source["execute_gate_status"]

for key in schema["public_safety_boundary_required_false"]:
    assert example["public_safety_boundary"][key] is False, f"public safety boundary not false: {key}"

for key in schema["route_boundary_required_false"]:
    assert example["route_boundary"][key] is False, f"route boundary not false: {key}"

for key in schema["wc_boundary_required_false"]:
    assert example["wc_boundary"][key] is False, f"wc boundary not false: {key}"

for key in schema["authority_boundary_required_false"]:
    assert example["authority_boundary"][key] is False, f"authority boundary not false: {key}"

print("schema_json_green=true")
print("example_public_earn_status_discovery_green=true")
print("source_public_earn_status_card_binding_green=true")
print("route_boundary_green=true")
print("public_safety_boundary_green=true")
print("forbidden_private_public_fields_absent_green=true")
PY

if grep -R "creates_public_route.*true\|mutates_public_index.*true\|activates_public_mutation.*true\|adds_runtime_route.*true\|changes_route_registry.*true\|issues_work_credits.*true\|writes_wc_ledger.*true\|creates_ledger_line.*true\|appends_to_ledger_file.*true\|allocates_void.*true\|transfers_void.*true\|automatic_reward.*true\|approves_ledger_write.*true\|executes_ledger_write.*true\|authorizes_ledger_write_execution.*true\|opens_execute_gate.*true\|performs_ledger_mutation.*true\|mutates_claim_state.*true\|grants_signer_wallet_access.*true\|authorizes_execution.*true\|moves_funds.*true\|exposes_participant_identifier.*true\|exposes_object_id.*true\|exposes_content_root.*true\|exposes_reviewer_identifier.*true\|exposes_operator_identifier.*true\|exposes_proposed_ledger_entry_id.*true\|exposes_private_object_material.*true" "$SCHEMA" "$EXAMPLE" "$DOC" >/tmp/void_datanet_wc_public_earn_status_discovery_forbidden_true.txt; then
  cat /tmp/void_datanet_wc_public_earn_status_discovery_forbidden_true.txt
  fail "forbidden_true_flag"
fi

echo "void_datanet_wc_availability_public_earn_status_discovery_hold_v1_proof=GREEN marker=$MARKER"
