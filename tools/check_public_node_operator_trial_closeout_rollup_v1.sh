#!/usr/bin/env bash
set -euo pipefail

marker="VOID_PUBLIC_NODE_OPERATOR_TRIAL_CLOSEOUT_ROLLUP_V1"
green="VOID_PUBLIC_NODE_OPERATOR_TRIAL_CLOSEOUT_ROLLUP_V1_GREEN"
json="public/public-node/public-node-operator-trial-closeout-rollup-v1.json"
html="public/public-node/public-node-operator-trial-closeout-rollup-v1.html"
doc="docs/public-node/public-node-operator-trial-closeout-rollup-v1.md"
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

marker = "VOID_PUBLIC_NODE_OPERATOR_TRIAL_CLOSEOUT_ROLLUP_V1"
green = "VOID_PUBLIC_NODE_OPERATOR_TRIAL_CLOSEOUT_ROLLUP_V1_GREEN"

rollup = json.loads(Path("public/public-node/public-node-operator-trial-closeout-rollup-v1.json").read_text())
index = json.loads(Path("public/public-node/index.json").read_text())

assert rollup["marker"] == marker
assert rollup["expected_green_marker"] == green
assert rollup["public_safe"] is True
assert rollup["read_only"] is True
assert rollup["status"] == "trial_closeout_rollup_ready"

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
    assert rollup["boundary"][key] is False, key

status = rollup["closeout_status"]
assert status["root_visible"] is True
assert status["public_start_here_ready"] is True
assert status["dashboard_linked"] is True
assert status["final_sealed"] is True
assert status["live_authority_enabled"] is False

required = [
    "root_link",
    "public_entrypoint",
    "dashboard_link",
    "final_seal",
    "lane_rollup",
    "review_decision_example",
    "receipt_example",
    "trial_packet"
]
assert [item["key"] for item in rollup["sealed_components"]] == required

entry = index["public_node_operator_trial_closeout_rollup"]
assert entry["marker"] == marker
assert entry["expected_green_marker"] == green
assert entry["status"] == "trial_closeout_rollup_ready"

assert index["links"]["public_node_operator_trial_closeout_rollup"] == "/public-node/public-node-operator-trial-closeout-rollup-v1.html"
assert index["links"]["public_node_operator_trial_closeout_rollup_json"] == "/public-node/public-node-operator-trial-closeout-rollup-v1.json"
assert index["route_markers"]["public_node_operator_trial_closeout_rollup"] == marker
assert index["public_node_operator_trial_public_entrypoint"]["trial_closeout_ready"] is True

routes = index["routes"]

def has_route(route):
    return any(
        item == route or (isinstance(item, dict) and item.get("route") == route)
        for item in routes
    )

assert has_route("/public-node/public-node-operator-trial-closeout-rollup-v1.html")
assert has_route("/public-node/public-node-operator-trial-closeout-rollup-v1.json")

print("trial closeout rollup/index assertions passed")
CHECKPY

printf '%s\n' "$green"
