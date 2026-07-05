#!/usr/bin/env bash
set -euo pipefail

marker="VOID_PUBLIC_NODE_OPERATOR_TRIAL_LANE_FINAL_SEAL_V1"
green="VOID_PUBLIC_NODE_OPERATOR_TRIAL_LANE_FINAL_SEAL_V1_GREEN"
json="public/public-node/public-node-operator-trial-lane-final-seal-v1.json"
html="public/public-node/public-node-operator-trial-lane-final-seal-v1.html"
doc="docs/public-node/public-node-operator-trial-lane-final-seal-v1.md"
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

marker = "VOID_PUBLIC_NODE_OPERATOR_TRIAL_LANE_FINAL_SEAL_V1"
green = "VOID_PUBLIC_NODE_OPERATOR_TRIAL_LANE_FINAL_SEAL_V1_GREEN"

seal = json.loads(Path("public/public-node/public-node-operator-trial-lane-final-seal-v1.json").read_text())
index = json.loads(Path("public/public-node/index.json").read_text())

assert seal["marker"] == marker
assert seal["expected_green_marker"] == green
assert seal["public_safe"] is True
assert seal["read_only"] is True
assert seal["status"] == "trial_lane_final_seal_ready"

boundary = seal["boundary"]
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
    "trial_lane_rollup"
]

found = [item["key"] for item in seal["sealed_chain"]]
assert found == required, found

statement = seal["seal_statement"]
assert statement["trial_packet_bound"] is True
assert statement["trial_receipt_example_bound"] is True
assert statement["trial_review_decision_example_bound"] is True
assert statement["trial_lane_rollup_bound"] is True
assert statement["final_seal_is_public_safe"] is True
assert statement["final_seal_is_read_only"] is True
assert statement["operator_review_required_for_real_receipts"] is True

entry = index["public_node_operator_trial_lane_final_seal"]
assert entry["marker"] == marker
assert entry["expected_green_marker"] == green
assert entry["status"] == "trial_lane_final_seal_ready"
assert entry["sealed_chain_components"] == required

assert index["links"]["public_node_operator_trial_lane_final_seal"] == "/public-node/public-node-operator-trial-lane-final-seal-v1.html"
assert index["links"]["public_node_operator_trial_lane_final_seal_html"] == "/public-node/public-node-operator-trial-lane-final-seal-v1.html"
assert index["links"]["public_node_operator_trial_lane_final_seal_json"] == "/public-node/public-node-operator-trial-lane-final-seal-v1.json"

assert index["route_markers"]["public_node_operator_trial_lane_final_seal"] == marker

routes = index["routes"]

def has_route(route):
    return any(
        item == route or (isinstance(item, dict) and item.get("route") == route)
        for item in routes
    )

assert has_route("/public-node/public-node-operator-trial-lane-final-seal-v1.html")
assert has_route("/public-node/public-node-operator-trial-lane-final-seal-v1.json")

print("trial lane final seal/index assertions passed")
CHECKPY

printf '%s\n' "$green"
