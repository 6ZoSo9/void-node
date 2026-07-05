#!/usr/bin/env bash
set -euo pipefail

marker="VOID_PUBLIC_NODE_OPERATOR_TRIAL_SUBMISSION_REVIEW_QUEUE_V1"
green="VOID_PUBLIC_NODE_OPERATOR_TRIAL_SUBMISSION_REVIEW_QUEUE_V1_GREEN"
json="public/public-node/public-node-operator-trial-submission-review-queue-v1.json"
html="public/public-node/public-node-operator-trial-submission-review-queue-v1.html"
doc="docs/public-node/public-node-operator-trial-submission-review-queue-v1.md"
index="public/public-node/index.json"

python3 -m json.tool "$json" >/dev/null
python3 -m json.tool "$index" >/dev/null

grep -F "$marker" "$json" >/dev/null
grep -F "$green" "$json" >/dev/null
grep -F "$marker" "$html" >/dev/null
grep -F "$green" "$html" >/dev/null
grep -F "$marker" "$doc" >/dev/null
grep -F "$green" "$doc" >/dev/null
grep -F "Public queue mutation enabled: false" "$html" >/dev/null
grep -F "queue_item_creation_enabled" "$json" >/dev/null

python3 - <<'CHECKPY'
import json
from pathlib import Path

marker = "VOID_PUBLIC_NODE_OPERATOR_TRIAL_SUBMISSION_REVIEW_QUEUE_V1"
green = "VOID_PUBLIC_NODE_OPERATOR_TRIAL_SUBMISSION_REVIEW_QUEUE_V1_GREEN"

record = json.loads(Path("public/public-node/public-node-operator-trial-submission-review-queue-v1.json").read_text())
index = json.loads(Path("public/public-node/index.json").read_text())

assert record["marker"] == marker
assert record["expected_green_marker"] == green
assert record["public_safe"] is True
assert record["read_only"] is True
assert record["status"] == "trial_submission_review_queue_ready"

for key in [
    "public_queue_mutation_enabled",
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

policy = record["queue_policy"]
assert policy["definition_only"] is True
assert policy["manual_operator_review_required"] is True
assert policy["public_queue_mutation_enabled"] is False
assert policy["public_upload_route_enabled"] is False
assert policy["public_form_enabled"] is False
assert policy["queue_item_creation_enabled"] is False
assert policy["submitted_receipts_are_not_network_truth"] is True
assert policy["queue_status_does_not_authorize_wc"] is True
assert policy["queue_status_does_not_authorize_ledger_write"] is True
assert policy["queue_status_does_not_authorize_validator_admission"] is True

for field in [
    "queue_item_id",
    "submission_timestamp_utc",
    "tester_alias_or_handle",
    "operator_review_status",
    "decision_template_route",
    "public_safe_notes"
]:
    assert field in record["queue_fields"], field

for status in [
    "received_pending_operator_review",
    "needs_changes",
    "accepted_as_public_safe_evidence",
    "rejected",
    "informational_only"
]:
    assert status in record["allowed_queue_statuses"], status

assert record["empty_queue_example"]["queue_status"] == "definition_only_empty"
assert record["empty_queue_example"]["pending_items"] == []

entry = index["public_node_operator_trial_submission_review_queue"]
assert entry["marker"] == marker
assert entry["expected_green_marker"] == green
assert entry["status"] == "trial_submission_review_queue_ready"

assert index["links"]["public_node_operator_trial_submission_review_queue"] == "/public-node/public-node-operator-trial-submission-review-queue-v1.html"
assert index["links"]["public_node_operator_trial_submission_review_queue_json"] == "/public-node/public-node-operator-trial-submission-review-queue-v1.json"
assert index["route_markers"]["public_node_operator_trial_submission_review_queue"] == marker

assert index["public_node_operator_trial_submission_intake"]["trial_submission_review_queue"] == "/public-node/public-node-operator-trial-submission-review-queue-v1.html"
assert index["public_node_operator_trial_closeout_rollup"]["trial_submission_review_queue"] == "/public-node/public-node-operator-trial-submission-review-queue-v1.html"

routes = index["routes"]

def has_route(route):
    return any(
        item == route or (isinstance(item, dict) and item.get("route") == route)
        for item in routes
    )

assert has_route("/public-node/public-node-operator-trial-submission-review-queue-v1.html")
assert has_route("/public-node/public-node-operator-trial-submission-review-queue-v1.json")

print("trial submission review queue/index assertions passed")
CHECKPY

printf '%s\n' "$green"
