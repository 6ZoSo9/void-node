#!/usr/bin/env bash
set -euo pipefail

DOC="docs/work-credits/void-datanet-wc-availability-public-earn-status-route-patch-readiness-hold-v1.md"
SCHEMA="fixtures/work-credits/void-datanet-wc-availability-public-earn-status-route-patch-readiness-hold-schema-v1.json"
EXAMPLE="fixtures/work-credits/void-datanet-wc-availability-public-earn-status-route-patch-readiness-hold-example-v1.json"
SOURCE="fixtures/work-credits/void-datanet-wc-availability-public-earn-status-route-candidate-hold-example-v1.json"
MARKER="VOID_DATANET_WC_AVAILABILITY_PUBLIC_EARN_STATUS_ROUTE_PATCH_READINESS_HOLD_V1"
CANDIDATE_ROUTE="/public-node/work-credits/datanet-wc-availability/earn-status-card-v1.json"

fail() {
  echo "void_datanet_wc_availability_public_earn_status_route_patch_readiness_hold_v1_proof=FAIL reason=$1"
  exit 1
}

[ -f "$DOC" ] || fail "missing_doc"
[ -f "$SCHEMA" ] || fail "missing_schema"
[ -f "$EXAMPLE" ] || fail "missing_example"
[ -f "$SOURCE" ] || fail "missing_source_route_candidate"

grep -Fq "$MARKER" "$DOC" || fail "missing_marker_doc"
grep -Fq "$MARKER" "$SCHEMA" || fail "missing_marker_schema"
grep -Fq "$MARKER" "$EXAMPLE" || fail "missing_marker_example"

grep -Fq "Public earn-status route patch readiness hold only; no route creation, no route registry mutation, no runtime route, no WC issuance, and no WC ledger write." "$DOC" || fail "missing_status_doc"
grep -Fq "$CANDIDATE_ROUTE" "$DOC" || fail "missing_candidate_route_doc"
grep -Fq "ready for a later separate route patch" "$DOC" || fail "missing_readiness_doc"
grep -Fq "This artifact is a route patch readiness hold only." "$DOC" || fail "missing_hold_boundary_doc"

python3 - "$SCHEMA" "$EXAMPLE" "$SOURCE" "$CANDIDATE_ROUTE" <<'PY'
import json
import sys

schema_path, example_path, source_path, candidate_route = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
schema = json.load(open(schema_path, "r", encoding="utf-8"))
example = json.load(open(example_path, "r", encoding="utf-8"))
source = json.load(open(source_path, "r", encoding="utf-8"))

marker = "VOID_DATANET_WC_AVAILABILITY_PUBLIC_EARN_STATUS_ROUTE_PATCH_READINESS_HOLD_V1"
source_marker = "VOID_DATANET_WC_AVAILABILITY_PUBLIC_EARN_STATUS_ROUTE_CANDIDATE_HOLD_V1"

assert schema["marker"] == marker
assert example["marker"] == marker
assert schema["source_marker"] == source_marker
assert example["source_marker"] == source_marker
assert source["marker"] == source_marker

assert schema["candidate_route"] == candidate_route
assert example["candidate_route"] == candidate_route
assert schema["status"] == "public_earn_status_route_patch_readiness_hold_only_no_route_creation_no_registry_mutation_no_runtime_route_no_wc_issuance_no_wc_ledger_write"
assert example["packet_kind"] == schema["packet_kind"]

for field in schema["required_fields"]:
    assert field in example, f"missing required field: {field}"

for field in schema["forbidden_public_fields"]:
    assert field not in example, f"forbidden top-level public field present: {field}"

assert source["candidate_status"] == "candidate_held_not_created"
assert source["candidate_route"] == candidate_route
assert source["route_creation_status"] == "not_created"
assert source["route_registry_status"] == "not_mutated"
assert source["runtime_route_status"] == "not_added"
assert source["public_index_status"] == "not_mutated"
assert source["wc_issuance_status"] == "not_issued"
assert source["wc_ledger_write_status"] == "not_written"
assert source["execute_gate_status"] == "held_execute_gate_closed"

assert example["readiness_status"] in schema["allowed_readiness_status"]
assert example["readiness_status"] == "ready_for_future_separate_route_patch"
assert example["route_patch_status"] in schema["allowed_route_patch_status"]
assert example["route_patch_status"] == "held_for_future_separate_patch"
assert example["route_registry_patch_status"] in schema["allowed_route_registry_patch_status"]
assert example["route_registry_patch_status"] == "held_for_future_separate_patch"
assert example["runtime_route_status"] in schema["allowed_runtime_route_status"]
assert example["runtime_route_status"] == "not_added"
assert example["public_index_patch_status"] in schema["allowed_public_index_patch_status"]
assert example["public_index_patch_status"] == "held_for_future_separate_patch"
assert example["wc_issuance_status"] == source["wc_issuance_status"]
assert example["wc_ledger_write_status"] == source["wc_ledger_write_status"]
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
print("example_public_earn_status_route_patch_readiness_green=true")
print("source_public_earn_status_route_candidate_binding_green=true")
print("route_patch_readiness_boundary_green=true")
print("public_safety_boundary_green=true")
print("forbidden_private_public_fields_absent_green=true")
PY

if grep -R "creates_public_route.*true\|adds_runtime_route.*true\|mutates_route_registry.*true\|mutates_public_index.*true\|changes_runtime_behavior.*true\|activates_public_mutation.*true\|issues_work_credits.*true\|writes_wc_ledger.*true\|creates_ledger_line.*true\|appends_to_ledger_file.*true\|allocates_void.*true\|transfers_void.*true\|automatic_reward.*true\|approves_ledger_write.*true\|executes_ledger_write.*true\|authorizes_ledger_write_execution.*true\|opens_execute_gate.*true\|performs_ledger_mutation.*true\|mutates_claim_state.*true\|grants_signer_wallet_access.*true\|authorizes_execution.*true\|moves_funds.*true\|exposes_participant_identifier.*true\|exposes_object_id.*true\|exposes_content_root.*true\|exposes_reviewer_identifier.*true\|exposes_operator_identifier.*true\|exposes_proposed_ledger_entry_id.*true\|exposes_private_object_material.*true" "$SCHEMA" "$EXAMPLE" "$DOC" >/tmp/void_datanet_wc_public_earn_status_route_patch_readiness_forbidden_true.txt; then
  cat /tmp/void_datanet_wc_public_earn_status_route_patch_readiness_forbidden_true.txt
  fail "forbidden_true_flag"
fi

echo "void_datanet_wc_availability_public_earn_status_route_patch_readiness_hold_v1_proof=GREEN marker=$MARKER"
