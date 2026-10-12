#!/usr/bin/env bash
set -euo pipefail

marker="VOID_PUBLIC_NODE_OPERATOR_TRIAL_LANE_ROLLUP_V1"
green="VOID_PUBLIC_NODE_OPERATOR_TRIAL_LANE_ROLLUP_V1_GREEN"
json="public/public-node/public-node-operator-trial-lane-rollup-v1.json"
html="public/public-node/public-node-operator-trial-lane-rollup-v1.html"
doc="docs/public-node/public-node-operator-trial-lane-rollup-v1.md"
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

marker = "VOID_PUBLIC_NODE_OPERATOR_TRIAL_LANE_ROLLUP_V1"
green = "VOID_PUBLIC_NODE_OPERATOR_TRIAL_LANE_ROLLUP_V1_GREEN"

rollup = json.loads(Path("public/public-node/public-node-operator-trial-lane-rollup-v1.json").read_text())
index = json.loads(Path("public/public-node/index.json").read_text())

assert rollup["marker"] == marker
assert rollup["expected_green_marker"] == green
assert rollup["public_safe"] is True
assert rollup["read_only"] is True
assert rollup["status"] == "trial_lane_rollup_ready"

boundary = rollup["boundary"]
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

required = [
    "trial_packet",
    "trial_receipt_example",
    "trial_review_decision_example",
    "review_checklist",
    "decision_template",
    "review_lane_rollup",
    "operator_dashboard"
]

found = [item["key"] for item in rollup["trial_chain"]]
assert found == required, found

entry = index["public_node_operator_trial_lane_rollup"]
assert entry["marker"] == marker
assert entry["expected_green_marker"] == green
assert entry["status"] == "trial_lane_rollup_ready"
assert entry["trial_chain_components"] == required

assert index["links"]["public_node_operator_trial_lane_rollup"] == "/public-node/public-node-operator-trial-lane-rollup-v1.html"
assert index["links"]["public_node_operator_trial_lane_rollup_html"] == "/public-node/public-node-operator-trial-lane-rollup-v1.html"
assert index["links"]["public_node_operator_trial_lane_rollup_json"] == "/public-node/public-node-operator-trial-lane-rollup-v1.json"

assert index["route_markers"]["public_node_operator_trial_lane_rollup"] == marker

routes = index["routes"]

def has_route(route):
    return any(
        item == route or (isinstance(item, dict) and item.get("route") == route)
        for item in routes
    )

assert has_route("/public-node/public-node-operator-trial-lane-rollup-v1.html")
assert has_route("/public-node/public-node-operator-trial-lane-rollup-v1.json")

print("trial lane rollup/index assertions passed")
CHECKPY

printf '%s\n' "$green"
