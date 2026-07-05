#!/usr/bin/env bash
set -euo pipefail

marker="VOID_PUBLIC_NODE_OPERATOR_TRIAL_SUBMISSION_REVIEW_DECISION_EXAMPLE_V1"
green="VOID_PUBLIC_NODE_OPERATOR_TRIAL_SUBMISSION_REVIEW_DECISION_EXAMPLE_V1_GREEN"
json="public/public-node/public-node-operator-trial-submission-review-decision-example-v1.json"
html="public/public-node/public-node-operator-trial-submission-review-decision-example-v1.html"
doc="docs/public-node/public-node-operator-trial-submission-review-decision-example-v1.md"
index="public/public-node/index.json"

python3 -m json.tool "$json" >/dev/null
python3 -m json.tool "$index" >/dev/null

grep -F "$marker" "$json" >/dev/null
grep -F "$green" "$json" >/dev/null
grep -F "$marker" "$html" >/dev/null
grep -F "$green" "$html" >/dev/null
grep -F "$marker" "$doc" >/dev/null
grep -F "$green" "$doc" >/dev/null
grep -F "Queue mutation authorized: false" "$html" >/dev/null
grep -F "example_not_applied" "$json" >/dev/null

python3 - <<'CHECKPY'
import json
from pathlib import Path

marker = "VOID_PUBLIC_NODE_OPERATOR_TRIAL_SUBMISSION_REVIEW_DECISION_EXAMPLE_V1"
green = "VOID_PUBLIC_NODE_OPERATOR_TRIAL_SUBMISSION_REVIEW_DECISION_EXAMPLE_V1_GREEN"

record = json.loads(Path("public/public-node/public-node-operator-trial-submission-review-decision-example-v1.json").read_text())
index = json.loads(Path("public/public-node/index.json").read_text())

assert record["marker"] == marker
assert record["expected_green_marker"] == green
assert record["public_safe"] is True
assert record["read_only"] is True
assert record["status"] == "trial_submission_review_decision_example_ready"

for key in [
    "decision_applied",
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

decision = record["decision_example"]
assert decision["decision_status"] == "example_not_applied"
assert decision["queue_status_before"] == "received_pending_operator_review"
assert decision["queue_status_after"] == "informational_only"
assert decision["accepted_as_public_safe_evidence"] is False
assert decision["informational_only"] is True
assert decision["work_credit_awarded"] is False
assert decision["work_credit_amount"] == 0
assert decision["wc_ledger_write_authorized"] is False
assert decision["wallet_send_authorized"] is False
assert decision["money_movement_authorized"] is False
assert decision["buy_void_fulfillment_authorized"] is False
assert decision["validator_admission_authorized"] is False
assert decision["network_truth_claim"] is False
assert decision["queue_mutation_authorized"] is False

for key in [
    "submission_review_queue",
    "submission_intake",
    "review_checklist",
    "decision_template",
    "trial_receipt_example",
    "operator_dashboard"
]:
    assert key in record["routes"], key

entry = index["public_node_operator_trial_submission_review_decision_example"]
assert entry["marker"] == marker
assert entry["expected_green_marker"] == green
assert entry["status"] == "trial_submission_review_decision_example_ready"

assert index["links"]["public_node_operator_trial_submission_review_decision_example"] == "/public-node/public-node-operator-trial-submission-review-decision-example-v1.html"
assert index["links"]["public_node_operator_trial_submission_review_decision_example_json"] == "/public-node/public-node-operator-trial-submission-review-decision-example-v1.json"
assert index["route_markers"]["public_node_operator_trial_submission_review_decision_example"] == marker

assert index["public_node_operator_trial_submission_review_queue"]["trial_submission_review_decision_example"] == "/public-node/public-node-operator-trial-submission-review-decision-example-v1.html"
assert index["public_node_operator_trial_submission_intake"]["trial_submission_review_decision_example"] == "/public-node/public-node-operator-trial-submission-review-decision-example-v1.html"

routes = index["routes"]

def has_route(route):
    return any(
        item == route or (isinstance(item, dict) and item.get("route") == route)
        for item in routes
    )

assert has_route("/public-node/public-node-operator-trial-submission-review-decision-example-v1.html")
assert has_route("/public-node/public-node-operator-trial-submission-review-decision-example-v1.json")

print("trial submission review decision example/index assertions passed")
CHECKPY

printf '%s\n' "$green"
