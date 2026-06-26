#!/usr/bin/env bash
set -euo pipefail

DOC="docs/work-credits/void-datanet-wc-availability-public-earn-status-static-route-artifact-hold-v1.md"
SCHEMA="fixtures/work-credits/void-datanet-wc-availability-public-earn-status-static-route-artifact-hold-schema-v1.json"
STATIC="public/public-node/work-credits/datanet-wc-availability/earn-status-card-v1.json"
SOURCE="fixtures/work-credits/void-datanet-wc-availability-public-earn-status-route-patch-readiness-hold-example-v1.json"
MARKER="VOID_DATANET_WC_AVAILABILITY_PUBLIC_EARN_STATUS_STATIC_ROUTE_ARTIFACT_HOLD_V1"

fail() {
  echo "void_datanet_wc_availability_public_earn_status_static_route_artifact_hold_v1_proof=FAIL reason=$1"
  exit 1
}

[ -f "$DOC" ] || fail "missing_doc"
[ -f "$SCHEMA" ] || fail "missing_schema"
[ -f "$STATIC" ] || fail "missing_static_json"
[ -f "$SOURCE" ] || fail "missing_source_route_patch_readiness"

grep -Fq "$MARKER" "$DOC" || fail "missing_marker_doc"
grep -Fq "$MARKER" "$SCHEMA" || fail "missing_marker_schema"
grep -Fq "$MARKER" "$STATIC" || fail "missing_marker_static"

grep -Fq "Static public route artifact hold only" "$DOC" || fail "missing_static_hold_status_doc"
grep -Fq "This artifact is a static JSON artifact hold only." "$DOC" || fail "missing_static_hold_boundary_doc"

python3 - "$SCHEMA" "$STATIC" "$SOURCE" <<'PY'
import json
import sys

schema_path, static_path, source_path = sys.argv[1], sys.argv[2], sys.argv[3]
schema = json.load(open(schema_path, "r", encoding="utf-8"))
static = json.load(open(static_path, "r", encoding="utf-8"))
source = json.load(open(source_path, "r", encoding="utf-8"))

marker = "VOID_DATANET_WC_AVAILABILITY_PUBLIC_EARN_STATUS_STATIC_ROUTE_ARTIFACT_HOLD_V1"
source_marker = "VOID_DATANET_WC_AVAILABILITY_PUBLIC_EARN_STATUS_ROUTE_PATCH_READINESS_HOLD_V1"
route = "/public-node/work-credits/datanet-wc-availability/earn-status-card-v1.json"

assert schema["marker"] == marker
assert static["marker"] == marker
assert source["marker"] == source_marker
assert schema["source_marker"] == source_marker
assert static["source_marker"] == source_marker

assert schema["intended_public_route"] == route
assert static["intended_public_route"] == route
assert schema["static_artifact_path"] == static_path
assert static["static_artifact_path"] == static_path
assert static["packet_kind"] == schema["packet_kind"]

for field in schema["required_fields"]:
    assert field in static, f"missing static field: {field}"

for field in schema["forbidden_public_fields"]:
    assert field not in static, f"forbidden public field present: {field}"

assert source["readiness_status"] == "ready_for_future_separate_route_patch"
assert source["candidate_route"] == route
assert source["runtime_route_status"] == "not_added"
assert source["wc_issuance_status"] == "not_issued"
assert source["wc_ledger_write_status"] == "not_written"
assert source["execute_gate_status"] == "held_execute_gate_closed"

assert static["artifact_status"] == "created_static_json_artifact"
assert static["source_readiness_status"] == source["readiness_status"]
assert static["route_registry_status"] == "not_mutated"
assert static["runtime_route_status"] == "not_added"
assert static["public_index_status"] == "not_mutated"
assert static["wc_issuance_status"] == "not_issued"
assert static["wc_ledger_write_status"] == "not_written"
assert static["execute_gate_status"] == "held_execute_gate_closed"

for section, keys in [
    ("public_safety_boundary", schema["public_safety_boundary_required_false"]),
    ("route_boundary", schema["route_boundary_required_false"]),
    ("wc_boundary", schema["wc_boundary_required_false"]),
    ("authority_boundary", schema["authority_boundary_required_false"])
]:
    for key in keys:
        assert static[section][key] is False, f"{section}.{key} not false"

print("schema_json_green=true")
print("static_route_artifact_json_green=true")
print("source_route_patch_readiness_binding_green=true")
print("static_artifact_boundary_green=true")
print("public_safety_boundary_green=true")
print("forbidden_private_public_fields_absent_green=true")
PY

echo "void_datanet_wc_availability_public_earn_status_static_route_artifact_hold_v1_proof=GREEN marker=$MARKER"
