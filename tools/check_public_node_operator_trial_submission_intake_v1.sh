#!/usr/bin/env bash
set -euo pipefail

marker="VOID_PUBLIC_NODE_OPERATOR_TRIAL_SUBMISSION_INTAKE_V1"
green="VOID_PUBLIC_NODE_OPERATOR_TRIAL_SUBMISSION_INTAKE_V1_GREEN"
json="public/public-node/public-node-operator-trial-submission-intake-v1.json"
html="public/public-node/public-node-operator-trial-submission-intake-v1.html"
doc="docs/public-node/public-node-operator-trial-submission-intake-v1.md"
index="public/public-node/index.json"

python3 -m json.tool "$json" >/dev/null
python3 -m json.tool "$index" >/dev/null

grep -F "$marker" "$json" >/dev/null
grep -F "$green" "$json" >/dev/null
grep -F "$marker" "$html" >/dev/null
grep -F "$green" "$html" >/dev/null
grep -F "$marker" "$doc" >/dev/null
grep -F "$green" "$doc" >/dev/null
grep -F "Public upload route enabled: false" "$html" >/dev/null
grep -F "operator_provided_submission_channel_required" "$json" >/dev/null

python3 - <<'CHECKPY'
import json
from pathlib import Path

marker = "VOID_PUBLIC_NODE_OPERATOR_TRIAL_SUBMISSION_INTAKE_V1"
green = "VOID_PUBLIC_NODE_OPERATOR_TRIAL_SUBMISSION_INTAKE_V1_GREEN"

record = json.loads(Path("public/public-node/public-node-operator-trial-submission-intake-v1.json").read_text())
index = json.loads(Path("public/public-node/index.json").read_text())

assert record["marker"] == marker
assert record["expected_green_marker"] == green
assert record["public_safe"] is True
assert record["read_only"] is True
assert record["status"] == "trial_submission_intake_ready"

for key in [
    "public_upload_route_enabled",
    "public_form_enabled",
    "mutation_route_enabled",
    "wallet_send_enabled",
    "money_movement_enabled",
    "buy_void_fulfillment_enabled",
    "wc_issuance_enabled",
    "wc_to_void_swap_enabled",
    "wc_ledger_write_enabled",
    "validator_admission_enabled",
    "validator_mutation_enabled",
    "runtime_truth_claim",
    "tester_receipts_are_network_truth"
]:
    assert record["boundary"][key] is False, key

policy = record["submission_policy"]
assert policy["manual_operator_review_required"] is True
assert policy["operator_provided_submission_channel_required"] is True
assert policy["public_upload_route_enabled"] is False
assert policy["public_form_enabled"] is False
assert policy["submitted_receipts_are_not_network_truth"] is True
assert policy["work_credit_award_not_authorized_by_submission"] is True
assert policy["ledger_write_not_authorized_by_submission"] is True
assert policy["validator_admission_not_authorized_by_submission"] is True

required_routes = [
    "trial_root_link",
    "trial_closeout_rollup",
    "trial_public_entrypoint",
    "operator_dashboard",
    "trial_packet",
    "receipt_template",
    "trial_receipt_example",
    "review_checklist",
    "decision_template"
]
for key in required_routes:
    assert key in record["routes"], key

for field in [
    "tester_alias_or_handle",
    "receipt_template_version",
    "timestamp_utc",
    "boundary_acknowledgement",
    "requested_operator_review_outcome"
]:
    assert field in record["required_submission_fields"], field

entry = index["public_node_operator_trial_submission_intake"]
assert entry["marker"] == marker
assert entry["expected_green_marker"] == green
assert entry["status"] == "trial_submission_intake_ready"

assert index["links"]["public_node_operator_trial_submission_intake"] == "/public-node/public-node-operator-trial-submission-intake-v1.html"
assert index["links"]["public_node_operator_trial_submission_intake_json"] == "/public-node/public-node-operator-trial-submission-intake-v1.json"
assert index["route_markers"]["public_node_operator_trial_submission_intake"] == marker

assert index["public_node_operator_trial_public_entrypoint"]["trial_submission_intake"] == "/public-node/public-node-operator-trial-submission-intake-v1.html"
assert index["public_node_operator_trial_closeout_rollup"]["trial_submission_intake"] == "/public-node/public-node-operator-trial-submission-intake-v1.html"

routes = index["routes"]

def has_route(route):
    return any(
        item == route or (isinstance(item, dict) and item.get("route") == route)
        for item in routes
    )

assert has_route("/public-node/public-node-operator-trial-submission-intake-v1.html")
assert has_route("/public-node/public-node-operator-trial-submission-intake-v1.json")

print("trial submission intake/index assertions passed")
CHECKPY

printf '%s
' "$green"
