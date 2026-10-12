#!/usr/bin/env bash
set -euo pipefail

marker="VOID_PUBLIC_NODE_OPERATOR_TRIAL_LANE_DASHBOARD_LINK_V1"
green="VOID_PUBLIC_NODE_OPERATOR_TRIAL_LANE_DASHBOARD_LINK_V1_GREEN"
json="public/public-node/public-node-operator-trial-lane-dashboard-link-v1.json"
html="public/public-node/public-node-operator-trial-lane-dashboard-link-v1.html"
doc="docs/public-node/public-node-operator-trial-lane-dashboard-link-v1.md"
index="public/public-node/index.json"
dashboard_json="public/public-node/public-node-operator-dashboard-v1.json"
dashboard_html="public/public-node/public-node-operator-dashboard-v1.html"

python3 -m json.tool "$json" >/dev/null
python3 -m json.tool "$index" >/dev/null
python3 -m json.tool "$dashboard_json" >/dev/null

grep -F "$marker" "$json" >/dev/null
grep -F "$green" "$json" >/dev/null
grep -F "$marker" "$html" >/dev/null
grep -F "$green" "$html" >/dev/null
grep -F "$marker" "$doc" >/dev/null
grep -F "$green" "$doc" >/dev/null
grep -F "$marker" "$dashboard_html" >/dev/null
grep -F "/public-node/public-node-operator-trial-lane-final-seal-v1.html" "$dashboard_html" >/dev/null

python3 - <<'CHECKPY'
import json
from pathlib import Path

marker = "VOID_PUBLIC_NODE_OPERATOR_TRIAL_LANE_DASHBOARD_LINK_V1"
green = "VOID_PUBLIC_NODE_OPERATOR_TRIAL_LANE_DASHBOARD_LINK_V1_GREEN"

record = json.loads(Path("public/public-node/public-node-operator-trial-lane-dashboard-link-v1.json").read_text())
index = json.loads(Path("public/public-node/index.json").read_text())
dashboard = json.loads(Path("public/public-node/public-node-operator-dashboard-v1.json").read_text())

assert record["marker"] == marker
assert record["expected_green_marker"] == green
assert record["public_safe"] is True
assert record["read_only"] is True
assert record["status"] == "trial_lane_dashboard_link_ready"

boundary = record["boundary"]
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

linked = record["linked_trial_lane"]
assert linked["final_seal_marker"] == "VOID_PUBLIC_NODE_OPERATOR_TRIAL_LANE_FINAL_SEAL_V1"
assert linked["rollup_marker"] == "VOID_PUBLIC_NODE_OPERATOR_TRIAL_LANE_ROLLUP_V1"

entry = index["public_node_operator_trial_lane_dashboard_link"]
assert entry["marker"] == marker
assert entry["expected_green_marker"] == green
assert entry["status"] == "trial_lane_dashboard_link_ready"

assert index["links"]["public_node_operator_trial_lane_dashboard_link"] == "/public-node/public-node-operator-trial-lane-dashboard-link-v1.html"
assert index["links"]["public_node_operator_trial_lane_dashboard_link_html"] == "/public-node/public-node-operator-trial-lane-dashboard-link-v1.html"
assert index["links"]["public_node_operator_trial_lane_dashboard_link_json"] == "/public-node/public-node-operator-trial-lane-dashboard-link-v1.json"
assert index["route_markers"]["public_node_operator_trial_lane_dashboard_link"] == marker

assert dashboard["trial_lane_dashboard_link"]["marker"] == marker
assert dashboard["trial_lane_dashboard_link"]["final_seal_html"] == "/public-node/public-node-operator-trial-lane-final-seal-v1.html"

routes = index["routes"]

def has_route(route):
    return any(
        item == route or (isinstance(item, dict) and item.get("route") == route)
        for item in routes
    )

assert has_route("/public-node/public-node-operator-trial-lane-dashboard-link-v1.html")
assert has_route("/public-node/public-node-operator-trial-lane-dashboard-link-v1.json")

print("trial lane dashboard link/index assertions passed")
CHECKPY

printf '%s\n' "$green"
