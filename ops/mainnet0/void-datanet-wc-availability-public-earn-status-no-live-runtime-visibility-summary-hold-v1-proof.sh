#!/usr/bin/env bash
set -euo pipefail

DOC="docs/work-credits/void-datanet-wc-availability-public-earn-status-no-live-runtime-visibility-summary-hold-v1.md"
SCHEMA="fixtures/work-credits/void-datanet-wc-availability-public-earn-status-no-live-runtime-visibility-summary-hold-schema-v1.json"
EXAMPLE="fixtures/work-credits/void-datanet-wc-availability-public-earn-status-no-live-runtime-visibility-summary-hold-example-v1.json"
STATIC="public/public-node/work-credits/datanet-wc-availability/earn-status-card-v1.json"
PREFLIGHT="fixtures/work-credits/void-datanet-wc-availability-public-earn-status-static-route-runtime-visibility-preflight-hold-example-v1.json"
OBS="fixtures/work-credits/void-datanet-wc-availability-public-earn-status-static-route-local-runtime-observation-hold-example-v1.json"
MARKER="VOID_DATANET_WC_AVAILABILITY_PUBLIC_EARN_STATUS_NO_LIVE_RUNTIME_VISIBILITY_SUMMARY_HOLD_V1"

fail() {
  echo "void_datanet_wc_availability_public_earn_status_no_live_runtime_visibility_summary_hold_v1_proof=FAIL reason=$1"
  exit 1
}

[ -f "$DOC" ] || fail "missing_doc"
[ -f "$SCHEMA" ] || fail "missing_schema"
[ -f "$EXAMPLE" ] || fail "missing_example"
[ -f "$STATIC" ] || fail "missing_static_artifact"
[ -f "$PREFLIGHT" ] || fail "missing_runtime_visibility_preflight"
[ -f "$OBS" ] || fail "missing_local_runtime_observation"

grep -Fq "$MARKER" "$DOC" || fail "missing_marker_doc"
grep -Fq "$MARKER" "$SCHEMA" || fail "missing_marker_schema"
grep -Fq "$MARKER" "$EXAMPLE" || fail "missing_marker_example"
grep -Fq "no live-route claim" "$DOC" || fail "missing_no_live_claim_doc"
grep -Fq "No Work Credits have been issued from this card" "$DOC" || fail "missing_no_wc_doc"

python3 - "$SCHEMA" "$EXAMPLE" "$STATIC" "$PREFLIGHT" "$OBS" <<'PY'
import json
import sys

schema_path, example_path, static_path, preflight_path, obs_path = sys.argv[1:]
schema = json.load(open(schema_path, "r", encoding="utf-8"))
example = json.load(open(example_path, "r", encoding="utf-8"))
static = json.load(open(static_path, "r", encoding="utf-8"))
preflight = json.load(open(preflight_path, "r", encoding="utf-8"))
obs = json.load(open(obs_path, "r", encoding="utf-8"))

marker = "VOID_DATANET_WC_AVAILABILITY_PUBLIC_EARN_STATUS_NO_LIVE_RUNTIME_VISIBILITY_SUMMARY_HOLD_V1"
static_marker = "VOID_DATANET_WC_AVAILABILITY_PUBLIC_EARN_STATUS_STATIC_ROUTE_ARTIFACT_HOLD_V1"
preflight_marker = "VOID_DATANET_WC_AVAILABILITY_PUBLIC_EARN_STATUS_STATIC_ROUTE_RUNTIME_VISIBILITY_PREFLIGHT_HOLD_V1"
obs_marker = "VOID_DATANET_WC_AVAILABILITY_PUBLIC_EARN_STATUS_STATIC_ROUTE_LOCAL_RUNTIME_OBSERVATION_HOLD_V1"
route = "/public-node/work-credits/datanet-wc-availability/earn-status-card-v1.json"

assert schema["marker"] == marker
assert example["marker"] == marker
assert static["marker"] == static_marker
assert preflight["marker"] == preflight_marker
assert obs["marker"] == obs_marker

assert schema["static_artifact_marker"] == static_marker
assert example["static_artifact_marker"] == static_marker
assert schema["runtime_visibility_preflight_marker"] == preflight_marker
assert example["runtime_visibility_preflight_marker"] == preflight_marker
assert schema["local_runtime_observation_marker"] == obs_marker
assert example["local_runtime_observation_marker"] == obs_marker

for field in schema["required_fields"]:
    assert field in example, f"missing example field: {field}"

for field in schema["forbidden_public_fields"]:
    assert field not in example, f"forbidden public field present: {field}"

assert example["packet_kind"] == schema["packet_kind"]
assert example["static_artifact_path"] == static_path
assert schema["static_artifact_path"] == static_path
assert example["intended_public_route"] == route
assert schema["intended_public_route"] == route
assert static["intended_public_route"] == route
assert preflight["intended_public_route"] == route
assert obs["intended_public_route"] == route

assert example["summary_status"] == "static_card_exists_local_runtime_not_observed_no_live_claim"
assert example["summary_status"] in schema["allowed_summary_status"]
assert example["static_artifact_status"] == static["artifact_status"] == "created_static_json_artifact"
assert example["runtime_visibility_preflight_status"] == preflight["preflight_status"] == "static_artifact_ready_for_future_runtime_visibility_check"
assert example["local_runtime_observation_status"] == obs["observation_status"] == "local_runtime_route_not_observed_service_inactive_curl_rc_7"

assert example["runtime_live_claim"] is False
assert example["runtime_route_observed"] is False
assert obs["runtime_live_claim"] is False
assert obs["runtime_route_observed"] is False
assert preflight["runtime_visibility_claim_status"] == "not_claimed_live"
assert preflight["runtime_observation_status"] == "not_observed"

assert example["wc_issuance_status"] == "not_issued"
assert example["wc_ledger_write_status"] == "not_written"
assert example["execute_gate_status"] == "held_execute_gate_closed"
assert static["wc_issuance_status"] == "not_issued"
assert static["wc_ledger_write_status"] == "not_written"
assert preflight["wc_issuance_status"] == "not_issued"
assert preflight["wc_ledger_write_status"] == "not_written"
assert obs["wc_issuance_status"] == "not_issued"
assert obs["wc_ledger_write_status"] == "not_written"

for section, keys in [
    ("public_safety_boundary", schema["public_safety_boundary_required_false"]),
    ("runtime_boundary", schema["runtime_boundary_required_false"]),
    ("route_boundary", schema["route_boundary_required_false"]),
    ("wc_boundary", schema["wc_boundary_required_false"]),
    ("authority_boundary", schema["authority_boundary_required_false"])
]:
    for key in keys:
        assert example[section][key] is False, f"{section}.{key} not false"

assert "No Work Credits have been issued" in example["public_summary_text"]
assert "no WC ledger write has occurred" in example["public_summary_text"]
assert "no live-route claim is made" in example["public_summary_text"]

print("schema_json_green=true")
print("example_json_green=true")
print("static_artifact_binding_green=true")
print("runtime_preflight_binding_green=true")
print("local_runtime_observation_binding_green=true")
print("public_no_live_summary_boundary_green=true")
print("wc_no_issuance_no_ledger_write_green=true")
PY

if grep -R "claims_route_live.*true\|performs_runtime_request.*true\|starts_service.*true\|restarts_service.*true\|adds_runtime_route.*true\|changes_runtime_behavior.*true\|mutates_route_registry.*true\|mutates_public_index.*true\|activates_public_mutation.*true\|issues_work_credits.*true\|writes_wc_ledger.*true\|creates_ledger_line.*true\|appends_to_ledger_file.*true\|allocates_void.*true\|transfers_void.*true\|approves_ledger_write.*true\|executes_ledger_write.*true\|authorizes_ledger_write_execution.*true\|opens_execute_gate.*true\|grants_signer_wallet_access.*true\|moves_funds.*true\|exposes_private_objects.*true" "$DOC" "$SCHEMA" "$EXAMPLE" >/tmp/void_wc_no_live_runtime_summary_forbidden_true.txt; then
  cat /tmp/void_wc_no_live_runtime_summary_forbidden_true.txt
  fail "forbidden_true_flag"
fi

echo "void_datanet_wc_availability_public_earn_status_no_live_runtime_visibility_summary_hold_v1_proof=GREEN marker=$MARKER"
