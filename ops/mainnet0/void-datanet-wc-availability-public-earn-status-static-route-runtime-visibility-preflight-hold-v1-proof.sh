#!/usr/bin/env bash
set -euo pipefail

DOC="docs/work-credits/void-datanet-wc-availability-public-earn-status-static-route-runtime-visibility-preflight-hold-v1.md"
SCHEMA="fixtures/work-credits/void-datanet-wc-availability-public-earn-status-static-route-runtime-visibility-preflight-hold-schema-v1.json"
EXAMPLE="fixtures/work-credits/void-datanet-wc-availability-public-earn-status-static-route-runtime-visibility-preflight-hold-example-v1.json"
STATIC="public/public-node/work-credits/datanet-wc-availability/earn-status-card-v1.json"
MARKER="VOID_DATANET_WC_AVAILABILITY_PUBLIC_EARN_STATUS_STATIC_ROUTE_RUNTIME_VISIBILITY_PREFLIGHT_HOLD_V1"
SOURCE_MARKER="VOID_DATANET_WC_AVAILABILITY_PUBLIC_EARN_STATUS_STATIC_ROUTE_ARTIFACT_HOLD_V1"

fail() {
  echo "void_datanet_wc_availability_public_earn_status_static_route_runtime_visibility_preflight_hold_v1_proof=FAIL reason=$1"
  exit 1
}

[ -f "$DOC" ] || fail "missing_doc"
[ -f "$SCHEMA" ] || fail "missing_schema"
[ -f "$EXAMPLE" ] || fail "missing_example"
[ -f "$STATIC" ] || fail "missing_static_artifact"

grep -Fq "$MARKER" "$DOC" || fail "missing_marker_doc"
grep -Fq "$MARKER" "$SCHEMA" || fail "missing_marker_schema"
grep -Fq "$MARKER" "$EXAMPLE" || fail "missing_marker_example"
grep -Fq "Runtime visibility preflight hold only" "$DOC" || fail "missing_preflight_status_doc"
grep -Fq "not claiming that the route is live" "$DOC" || fail "missing_no_runtime_claim_doc"

python3 - "$SCHEMA" "$EXAMPLE" "$STATIC" <<'PY'
import json
import sys

schema_path, example_path, static_path = sys.argv[1], sys.argv[2], sys.argv[3]
schema = json.load(open(schema_path, "r", encoding="utf-8"))
example = json.load(open(example_path, "r", encoding="utf-8"))
static = json.load(open(static_path, "r", encoding="utf-8"))

marker = "VOID_DATANET_WC_AVAILABILITY_PUBLIC_EARN_STATUS_STATIC_ROUTE_RUNTIME_VISIBILITY_PREFLIGHT_HOLD_V1"
source_marker = "VOID_DATANET_WC_AVAILABILITY_PUBLIC_EARN_STATUS_STATIC_ROUTE_ARTIFACT_HOLD_V1"
route = "/public-node/work-credits/datanet-wc-availability/earn-status-card-v1.json"

assert schema["marker"] == marker
assert example["marker"] == marker
assert schema["source_marker"] == source_marker
assert example["source_marker"] == source_marker
assert static["marker"] == source_marker

assert schema["static_artifact_path"] == static_path
assert example["static_artifact_path"] == static_path
assert schema["intended_public_route"] == route
assert example["intended_public_route"] == route
assert static["intended_public_route"] == route

for field in schema["required_fields"]:
    assert field in example, f"missing example field: {field}"

for field in schema["forbidden_public_fields"]:
    assert field not in example, f"forbidden public field present: {field}"

assert example["packet_kind"] == schema["packet_kind"]
assert example["preflight_status"] in schema["allowed_preflight_status"]
assert example["preflight_status"] == "static_artifact_ready_for_future_runtime_visibility_check"
assert example["runtime_visibility_claim_status"] == "not_claimed_live"
assert example["runtime_observation_status"] == "not_observed"
assert example["route_registry_status"] == "not_mutated"
assert example["public_index_status"] == "not_mutated"
assert example["wc_issuance_status"] == "not_issued"
assert example["wc_ledger_write_status"] == "not_written"
assert example["execute_gate_status"] == "held_execute_gate_closed"

assert static["artifact_status"] == "created_static_json_artifact"
assert static["route_registry_status"] == "not_mutated"
assert static["runtime_route_status"] == "not_added"
assert static["public_index_status"] == "not_mutated"
assert static["wc_issuance_status"] == "not_issued"
assert static["wc_ledger_write_status"] == "not_written"
assert static["execute_gate_status"] == "held_execute_gate_closed"

for section, keys in [
    ("public_safety_boundary", schema["public_safety_boundary_required_false"]),
    ("runtime_boundary", schema["runtime_boundary_required_false"]),
    ("route_boundary", schema["route_boundary_required_false"]),
    ("wc_boundary", schema["wc_boundary_required_false"]),
    ("authority_boundary", schema["authority_boundary_required_false"])
]:
    for key in keys:
        assert example[section][key] is False, f"{section}.{key} not false"

print("schema_json_green=true")
print("example_json_green=true")
print("static_artifact_source_binding_green=true")
print("runtime_visibility_preflight_boundary_green=true")
print("public_safety_boundary_green=true")
print("forbidden_private_public_fields_absent_green=true")
PY

if grep -R "claims_route_live.*true\|performs_runtime_request.*true\|observes_runtime_route.*true\|adds_runtime_route.*true\|changes_runtime_behavior.*true\|mutates_route_registry.*true\|mutates_public_index.*true\|activates_public_mutation.*true\|issues_work_credits.*true\|writes_wc_ledger.*true\|creates_ledger_line.*true\|appends_to_ledger_file.*true\|allocates_void.*true\|transfers_void.*true\|approves_ledger_write.*true\|executes_ledger_write.*true\|authorizes_ledger_write_execution.*true\|opens_execute_gate.*true\|grants_signer_wallet_access.*true\|moves_funds.*true\|exposes_private_objects.*true" "$DOC" "$SCHEMA" "$EXAMPLE" >/tmp/void_wc_runtime_visibility_forbidden_true.txt; then
  cat /tmp/void_wc_runtime_visibility_forbidden_true.txt
  fail "forbidden_true_flag"
fi

echo "void_datanet_wc_availability_public_earn_status_static_route_runtime_visibility_preflight_hold_v1_proof=GREEN marker=$MARKER"
