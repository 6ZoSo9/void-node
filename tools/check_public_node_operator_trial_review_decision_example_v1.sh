#!/usr/bin/env bash
set -euo pipefail

marker="VOID_PUBLIC_NODE_OPERATOR_TRIAL_REVIEW_DECISION_EXAMPLE_V1"
green="VOID_PUBLIC_NODE_OPERATOR_TRIAL_REVIEW_DECISION_EXAMPLE_V1_GREEN"
json="public/public-node/public-node-operator-trial-review-decision-example-v1.json"
html="public/public-node/public-node-operator-trial-review-decision-example-v1.html"
doc="docs/public-node/public-node-operator-trial-review-decision-example-v1.md"
index="public/public-node/index.json"

python3 -m json.tool "$json" >/dev/null
python3 -m json.tool "$index" >/dev/null

grep -F "$marker" "$json" >/dev/null
grep -F "$green" "$json" >/dev/null
grep -F "$marker" "$html" >/dev/null
grep -F "$green" "$html" >/dev/null
grep -F "$marker" "$doc" >/dev/null
grep -F "$green" "$doc" >/dev/null

python3 - <<'CHECKPY'
import json
from pathlib import Path

marker = "VOID_PUBLIC_NODE_OPERATOR_TRIAL_REVIEW_DECISION_EXAMPLE_V1"
green = "VOID_PUBLIC_NODE_OPERATOR_TRIAL_REVIEW_DECISION_EXAMPLE_V1_GREEN"

decision = json.loads(Path("public/public-node/public-node-operator-trial-review-decision-example-v1.json").read_text())
index = json.loads(Path("public/public-node/index.json").read_text())

assert decision["marker"] == marker
assert decision["expected_green_marker"] == green
assert decision["public_safe"] is True
assert decision["read_only"] is True

boundary = decision["boundary"]
for key in [
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
    assert boundary[key] is False, key

assert boundary["public_routes_only"] is True
assert boundary["read_only"] is True
assert boundary["operator_review_required_for_real_receipts"] is True

result = decision["decision_example"]
assert result["decision_status"] == "example_not_applied"
assert result["decision"] == "informational"
assert result["accepted_as_evidence"] is False
assert result["informational_only"] is True
assert result["work_credit_awarded"] is False
assert result["work_credit_amount"] == 0
assert result["wc_ledger_write_authorized"] is False
assert result["buy_void_fulfillment_authorized"] is False
assert result["validator_admission_authorized"] is False
assert result["network_truth_claim"] is False

for key in ["trial_packet", "trial_receipt_example", "decision_template", "review_checklist", "review_lane_rollup", "operator_dashboard"]:
    assert decision["pairs_with"].get(key), key

entry = index["public_node_operator_trial_review_decision_example"]
assert entry["marker"] == marker
assert entry["expected_green_marker"] == green
assert entry["status"] == "trial_review_decision_example_ready"

assert index["links"]["public_node_operator_trial_review_decision_example"] == "/public-node/public-node-operator-trial-review-decision-example-v1.html"
assert index["links"]["public_node_operator_trial_review_decision_example_html"] == "/public-node/public-node-operator-trial-review-decision-example-v1.html"
assert index["links"]["public_node_operator_trial_review_decision_example_json"] == "/public-node/public-node-operator-trial-review-decision-example-v1.json"

assert index["route_markers"]["public_node_operator_trial_review_decision_example"] == marker

routes = index["routes"]

def has_route(route):
    return any(
        item == route or (isinstance(item, dict) and item.get("route") == route)
        for item in routes
    )

assert has_route("/public-node/public-node-operator-trial-review-decision-example-v1.html")
assert has_route("/public-node/public-node-operator-trial-review-decision-example-v1.json")

print("trial review decision example/index assertions passed")
CHECKPY

printf '%s\n' "$green"
