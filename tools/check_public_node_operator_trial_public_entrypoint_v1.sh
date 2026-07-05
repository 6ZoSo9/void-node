#!/usr/bin/env bash
set -euo pipefail

marker="VOID_PUBLIC_NODE_OPERATOR_TRIAL_PUBLIC_ENTRYPOINT_V1"
green="VOID_PUBLIC_NODE_OPERATOR_TRIAL_PUBLIC_ENTRYPOINT_V1_GREEN"
json="public/public-node/public-node-operator-trial-public-entrypoint-v1.json"
html="public/public-node/public-node-operator-trial-public-entrypoint-v1.html"
doc="docs/public-node/public-node-operator-trial-public-entrypoint-v1.md"
index="public/public-node/index.json"

python3 -m json.tool "$json" >/dev/null
python3 -m json.tool "$index" >/dev/null

grep -F "$marker" "$json" >/dev/null
grep -F "$green" "$json" >/dev/null
grep -F "$marker" "$html" >/dev/null
grep -F "$green" "$html" >/dev/null
grep -F "$marker" "$doc" >/dev/null
grep -F "$green" "$doc" >/dev/null
grep -F "/public-node/public-node-operator-trial-lane-final-seal-v1.html" "$html" >/dev/null
grep -F "/public-node/connect/public-node-connect-receipt-template-v1.html" "$html" >/dev/null

python3 - <<'CHECKPY'
import json
from pathlib import Path

marker = "VOID_PUBLIC_NODE_OPERATOR_TRIAL_PUBLIC_ENTRYPOINT_V1"
green = "VOID_PUBLIC_NODE_OPERATOR_TRIAL_PUBLIC_ENTRYPOINT_V1_GREEN"

entrypoint = json.loads(Path("public/public-node/public-node-operator-trial-public-entrypoint-v1.json").read_text())
index = json.loads(Path("public/public-node/index.json").read_text())

assert entrypoint["marker"] == marker
assert entrypoint["expected_green_marker"] == green
assert entrypoint["public_safe"] is True
assert entrypoint["read_only"] is True
assert entrypoint["status"] == "trial_public_entrypoint_ready"

boundary = entrypoint["boundary"]
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
    "operator_dashboard",
    "trial_lane_final_seal",
    "trial_lane_rollup",
    "trial_packet",
    "connect_pack",
    "receipt_template",
    "trial_receipt_example",
    "trial_review_decision_example",
    "dashboard_link"
]

for key in required:
    assert key in entrypoint["routes"], key
    assert entrypoint["routes"][key]["html"].startswith("/public-node/"), key
    assert entrypoint["routes"][key]["json"].startswith("/public-node/"), key

assert entrypoint["routes"]["trial_lane_final_seal"]["marker"] == "VOID_PUBLIC_NODE_OPERATOR_TRIAL_LANE_FINAL_SEAL_V1"
assert entrypoint["routes"]["trial_packet"]["marker"] == "VOID_PUBLIC_NODE_OPERATOR_TRIAL_PACKET_V1"
assert entrypoint["routes"]["receipt_template"]["html"] == "/public-node/connect/public-node-connect-receipt-template-v1.html"

entry = index["public_node_operator_trial_public_entrypoint"]
assert entry["marker"] == marker
assert entry["expected_green_marker"] == green
assert entry["status"] == "trial_public_entrypoint_ready"

assert index["links"]["public_node_operator_trial_public_entrypoint"] == "/public-node/public-node-operator-trial-public-entrypoint-v1.html"
assert index["links"]["public_node_operator_trial_public_entrypoint_html"] == "/public-node/public-node-operator-trial-public-entrypoint-v1.html"
assert index["links"]["public_node_operator_trial_public_entrypoint_json"] == "/public-node/public-node-operator-trial-public-entrypoint-v1.json"
assert index["route_markers"]["public_node_operator_trial_public_entrypoint"] == marker

dashboard = index["public_node_operator_dashboard"]
assert dashboard["trial_public_entrypoint"] == "/public-node/public-node-operator-trial-public-entrypoint-v1.html"

routes = index["routes"]

def has_route(route):
    return any(
        item == route or (isinstance(item, dict) and item.get("route") == route)
        for item in routes
    )

assert has_route("/public-node/public-node-operator-trial-public-entrypoint-v1.html")
assert has_route("/public-node/public-node-operator-trial-public-entrypoint-v1.json")

print("trial public entrypoint/index assertions passed")
CHECKPY

printf '%s\n' "$green"
