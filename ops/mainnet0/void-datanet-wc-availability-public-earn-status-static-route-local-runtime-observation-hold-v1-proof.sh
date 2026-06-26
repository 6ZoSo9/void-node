#!/usr/bin/env bash
set -euo pipefail

DOC="docs/work-credits/void-datanet-wc-availability-public-earn-status-static-route-local-runtime-observation-hold-v1.md"
SCHEMA="fixtures/work-credits/void-datanet-wc-availability-public-earn-status-static-route-local-runtime-observation-hold-schema-v1.json"
EXAMPLE="fixtures/work-credits/void-datanet-wc-availability-public-earn-status-static-route-local-runtime-observation-hold-example-v1.json"
STATIC="public/public-node/work-credits/datanet-wc-availability/earn-status-card-v1.json"
PREFLIGHT="fixtures/work-credits/void-datanet-wc-availability-public-earn-status-static-route-runtime-visibility-preflight-hold-example-v1.json"
MARKER="VOID_DATANET_WC_AVAILABILITY_PUBLIC_EARN_STATUS_STATIC_ROUTE_LOCAL_RUNTIME_OBSERVATION_HOLD_V1"

fail() {
  echo "void_datanet_wc_availability_public_earn_status_static_route_local_runtime_observation_hold_v1_proof=FAIL reason=$1"
  exit 1
}

[ -f "$DOC" ] || fail "missing_doc"
[ -f "$SCHEMA" ] || fail "missing_schema"
[ -f "$EXAMPLE" ] || fail "missing_example"
[ -f "$STATIC" ] || fail "missing_static_artifact"
[ -f "$PREFLIGHT" ] || fail "missing_runtime_visibility_preflight"

git ls-files --error-unmatch "$STATIC" >/dev/null 2>&1 || fail "static_artifact_not_tracked"

grep -Fq "$MARKER" "$DOC" || fail "missing_marker_doc"
grep -Fq "$MARKER" "$SCHEMA" || fail "missing_marker_schema"
grep -Fq "$MARKER" "$EXAMPLE" || fail "missing_marker_example"
grep -Fq "local runtime route not observed" "$DOC" || fail "missing_not_observed_doc"
grep -Fq "void-node-live.service" "$DOC" || fail "missing_service_doc"
grep -Fq "local curl rc: \`7\`" "$DOC" || fail "missing_curl_rc_doc"

python3 - "$SCHEMA" "$EXAMPLE" "$STATIC" "$PREFLIGHT" <<'PY'
import json
import sys

schema_path, example_path, static_path, preflight_path = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
schema = json.load(open(schema_path, "r", encoding="utf-8"))
example = json.load(open(example_path, "r", encoding="utf-8"))
static = json.load(open(static_path, "r", encoding="utf-8"))
preflight = json.load(open(preflight_path, "r", encoding="utf-8"))

marker = "VOID_DATANET_WC_AVAILABILITY_PUBLIC_EARN_STATUS_STATIC_ROUTE_LOCAL_RUNTIME_OBSERVATION_HOLD_V1"
preflight_marker = "VOID_DATANET_WC_AVAILABILITY_PUBLIC_EARN_STATUS_STATIC_ROUTE_RUNTIME_VISIBILITY_PREFLIGHT_HOLD_V1"
static_marker = "VOID_DATANET_WC_AVAILABILITY_PUBLIC_EARN_STATUS_STATIC_ROUTE_ARTIFACT_HOLD_V1"
route = "/public-node/work-credits/datanet-wc-availability/earn-status-card-v1.json"
target = "http://127.0.0.1:3000/public-node/work-credits/datanet-wc-availability/earn-status-card-v1.json"

assert schema["marker"] == marker
assert example["marker"] == marker
assert schema["source_marker"] == preflight_marker
assert example["source_marker"] == preflight_marker
assert schema["static_artifact_marker"] == static_marker
assert example["static_artifact_marker"] == static_marker
assert static["marker"] == static_marker
assert preflight["marker"] == preflight_marker

for field in schema["required_fields"]:
    assert field in example, f"missing example field: {field}"

assert example["packet_kind"] == schema["packet_kind"]
assert example["static_artifact_path"] == static_path
assert schema["static_artifact_path"] == static_path
assert example["intended_public_route"] == route
assert schema["intended_public_route"] == route
assert static["intended_public_route"] == route
assert preflight["intended_public_route"] == route
assert example["local_curl_target"] == target
assert schema["local_curl_target"] == target

assert example["observation_status"] in schema["allowed_observation_status"]
assert example["observation_status"] == "local_runtime_route_not_observed_service_inactive_curl_rc_7"
assert example["service_checked"] == "void-node-live.service"
assert example["service_state_observed"] == "inactive"
assert example["service_active_rc"] == 4
assert example["local_curl_rc"] == 7
assert example["observed_json_status"] == "absent_or_empty"
assert example["runtime_route_observed"] is False
assert example["runtime_live_claim"] is False

assert example["wc_issuance_status"] == "not_issued"
assert example["wc_ledger_write_status"] == "not_written"
assert example["execute_gate_status"] == "held_execute_gate_closed"

assert static["artifact_status"] == "created_static_json_artifact"
assert static["wc_issuance_status"] == "not_issued"
assert static["wc_ledger_write_status"] == "not_written"
assert preflight["preflight_status"] == "static_artifact_ready_for_future_runtime_visibility_check"
assert preflight["runtime_visibility_claim_status"] == "not_claimed_live"
assert preflight["runtime_observation_status"] == "not_observed"

for section, keys in [
    ("runtime_boundary", schema["runtime_boundary_required_false"]),
    ("route_boundary", schema["route_boundary_required_false"]),
    ("wc_boundary", schema["wc_boundary_required_false"]),
    ("authority_boundary", schema["authority_boundary_required_false"])
]:
    for key in keys:
        assert example[section][key] is False, f"{section}.{key} not false"

print("schema_json_green=true")
print("example_json_green=true")
print("static_artifact_tracked_source_binding_green=true")
print("runtime_preflight_binding_green=true")
print("local_runtime_no_observation_boundary_green=true")
print("wc_no_issuance_no_ledger_write_green=true")
PY

if grep -R "starts_service.*true\|restarts_service.*true\|claims_route_live.*true\|performs_mutating_runtime_request.*true\|adds_runtime_route.*true\|changes_runtime_behavior.*true\|mutates_route_registry.*true\|mutates_public_index.*true\|activates_public_mutation.*true\|issues_work_credits.*true\|writes_wc_ledger.*true\|creates_ledger_line.*true\|appends_to_ledger_file.*true\|allocates_void.*true\|transfers_void.*true\|approves_ledger_write.*true\|executes_ledger_write.*true\|authorizes_ledger_write_execution.*true\|opens_execute_gate.*true\|grants_signer_wallet_access.*true\|moves_funds.*true\|exposes_private_objects.*true" "$DOC" "$SCHEMA" "$EXAMPLE" >/tmp/void_wc_local_runtime_observation_forbidden_true.txt; then
  cat /tmp/void_wc_local_runtime_observation_forbidden_true.txt
  fail "forbidden_true_flag"
fi

echo "void_datanet_wc_availability_public_earn_status_static_route_local_runtime_observation_hold_v1_proof=GREEN marker=$MARKER"
