#!/usr/bin/env bash
set -euo pipefail

marker="VOID_PUBLIC_NODE_OPERATOR_TRIAL_PACKET_V1_GREEN"

json="public/public-node/public-node-operator-trial-packet-v1.json"
html="public/public-node/public-node-operator-trial-packet-v1.html"
doc="docs/public-node/public-node-operator-trial-packet-v1.md"
index="public/public-node/index.json"

python3 -m json.tool "$json" >/dev/null
python3 -m json.tool "$index" >/dev/null

grep -F "VOID_PUBLIC_NODE_OPERATOR_TRIAL_PACKET_V1" "$json" >/dev/null
grep -F "$marker" "$json" >/dev/null
grep -F "VOID_PUBLIC_NODE_OPERATOR_TRIAL_PACKET_V1" "$html" >/dev/null
grep -F "$marker" "$html" >/dev/null
grep -F "VOID_PUBLIC_NODE_OPERATOR_TRIAL_PACKET_V1" "$doc" >/dev/null
grep -F "$marker" "$doc" >/dev/null

python3 - <<'PY'
import json
from pathlib import Path

packet = json.loads(Path("public/public-node/public-node-operator-trial-packet-v1.json").read_text())
index = json.loads(Path("public/public-node/index.json").read_text())

assert packet["marker"] == "VOID_PUBLIC_NODE_OPERATOR_TRIAL_PACKET_V1"
assert packet["expected_green_marker"] == "VOID_PUBLIC_NODE_OPERATOR_TRIAL_PACKET_V1_GREEN"
assert packet["public_safe"] is True
assert packet["read_only"] is True

boundary = packet["boundary"]
for key in [
    "mutation_route_enabled",
    "wallet_send_enabled",
    "money_movement_enabled",
    "buy_void_fulfillment_enabled",
    "wc_issuance_enabled",
    "wc_to_void_swap_enabled",
    "validator_admission_enabled",
    "validator_mutation_enabled",
    "runtime_truth_claim",
    "tester_receipts_are_network_truth"
]:
    assert boundary[key] is False, key

assert boundary["operator_review_required"] is True
assert boundary["read_only"] is True
assert boundary["public_routes_only"] is True

entry = index["public_node_operator_trial_packet"]
assert entry["marker"] == "VOID_PUBLIC_NODE_OPERATOR_TRIAL_PACKET_V1"
assert entry["expected_green_marker"] == "VOID_PUBLIC_NODE_OPERATOR_TRIAL_PACKET_V1_GREEN"
assert entry["status"] == "trial_packet_ready"

links = index["links"]
assert links["public_node_operator_trial_packet"] == "/public-node/public-node-operator-trial-packet-v1.html"
assert links["public_node_operator_trial_packet_html"] == "/public-node/public-node-operator-trial-packet-v1.html"
assert links["public_node_operator_trial_packet_json"] == "/public-node/public-node-operator-trial-packet-v1.json"

route_markers = index["route_markers"]
assert route_markers["public_node_operator_trial_packet"] == "VOID_PUBLIC_NODE_OPERATOR_TRIAL_PACKET_V1"

routes = index["routes"]
assert "/public-node/public-node-operator-trial-packet-v1.html" in routes
assert "/public-node/public-node-operator-trial-packet-v1.json" in routes

for required in [
    "quickstart",
    "connect_pack",
    "receipt_template",
    "handoff_packet",
    "review_lane_rollup",
    "operator_dashboard"
]:
    assert required in packet["pairs_with"], required

print("packet/index assertions passed")
PY

printf '%s\n' "$marker"
