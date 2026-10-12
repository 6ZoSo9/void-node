#!/usr/bin/env bash
set -euo pipefail

marker="VOID_PUBLIC_NODE_OPERATOR_TRIAL_TESTER_LAUNCH_READY_INDEX_PIN_V1"
green="VOID_PUBLIC_NODE_OPERATOR_TRIAL_TESTER_LAUNCH_READY_INDEX_PIN_V1_GREEN"

json="public/public-node/public-node-operator-trial-tester-launch-ready-index-pin-v1.json"
html="public/public-node/public-node-operator-trial-tester-launch-ready-index-pin-v1.html"
doc="docs/public-node/public-node-operator-trial-tester-launch-ready-index-pin-v1.md"
index="public/public-node/index.json"

python3 -m json.tool "$json" >/dev/null
python3 -m json.tool "$index" >/dev/null

grep -F "$marker" "$json" >/dev/null
grep -F "$green" "$json" >/dev/null
grep -F "$marker" "$html" >/dev/null
grep -F "$green" "$html" >/dev/null
grep -F "$marker" "$doc" >/dev/null
grep -F "$green" "$doc" >/dev/null

python3 - <<'PY'
import json
from pathlib import Path

marker = "VOID_PUBLIC_NODE_OPERATOR_TRIAL_TESTER_LAUNCH_READY_INDEX_PIN_V1"
green = "VOID_PUBLIC_NODE_OPERATOR_TRIAL_TESTER_LAUNCH_READY_INDEX_PIN_V1_GREEN"

pin = json.loads(Path("public/public-node/public-node-operator-trial-tester-launch-ready-index-pin-v1.json").read_text())
index = json.loads(Path("public/public-node/index.json").read_text())

assert pin["marker"] == marker
assert pin["expected_green_marker"] == green
assert pin["status"] == "outside_tester_launch_ready_index_pinned"
assert pin["public_safe"] is True
assert pin["read_only"] is True
assert pin["boundary"]["index_pin_only"] is True
assert pin["boundary"]["operator_review_required_for_real_receipts"] is True

for key in [
    "mutation_route_enabled",
    "submission_endpoint_enabled",
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
    assert pin["boundary"][key] is False, key

status = pin["ready_status"]
assert status["outside_tester_launch_ready_index_pinned"] is True
assert status["outside_tester_launch_ready"] is True
assert status["terminal_closeout_complete"] is True
assert status["terminal_final_sealed"] is True
assert status["operator_review_required_for_real_receipts"] is True
assert status["live_authority_enabled"] is False
assert status["tester_receipts_are_network_truth"] is False

assert pin["pinned_routes"]["start_here"] == "/public-node/public-node-operator-trial-tester-launch-terminal-closeout-rollup-v1.html"
assert pin["pinned_routes"]["handoff_packet_json"] == "/public-node/public-node-operator-trial-tester-launch-handoff-packet-v1.json"

entry = index["public_node_operator_trial_tester_launch_ready_index_pin"]
assert entry["marker"] == marker
assert entry["expected_green_marker"] == green
assert entry["status"] == "outside_tester_launch_ready_index_pinned"
assert entry["html"] == "/public-node/public-node-operator-trial-tester-launch-ready-index-pin-v1.html"
assert entry["json"] == "/public-node/public-node-operator-trial-tester-launch-ready-index-pin-v1.json"

assert index["links"]["public_node_operator_trial_tester_launch_ready_index_pin"] == "/public-node/public-node-operator-trial-tester-launch-ready-index-pin-v1.html"
assert index["links"]["public_node_operator_trial_tester_launch_ready_index_pin_json"] == "/public-node/public-node-operator-trial-tester-launch-ready-index-pin-v1.json"
assert index["links"]["public_node_operator_trial_tester_launch_start_here"] == "/public-node/public-node-operator-trial-tester-launch-terminal-closeout-rollup-v1.html"
assert index["route_markers"]["public_node_operator_trial_tester_launch_ready_index_pin"] == marker

for key in [
    "public_node_operator_trial_tester_launch_terminal_closeout_rollup",
    "public_node_operator_trial_tester_launch_terminal_final_seal",
    "public_node_operator_trial_tester_launch_status_card_closeout_rollup",
    "public_node_operator_trial_tester_launch_status_card",
    "public_node_operator_trial_tester_launch_handoff_packet_closeout_rollup",
    "public_node_operator_trial_tester_launch_handoff_packet",
    "public_node_operator_trial_tester_launch_checklist_closeout_rollup",
    "public_node_operator_trial_tester_launch_checklist",
    "public_node_operator_trial_tester_receipt_template",
    "public_node_operator_trial_tester_receipt_example",
    "public_node_operator_trial_submission_intake",
    "public_node_operator_trial_submission_review_queue"
]:
    assert index[key]["tester_launch_ready_index_pinned"] is True, key

routes = index["routes"]

def has_route(route):
    return any(item == route or (isinstance(item, dict) and item.get("route") == route) for item in routes)

assert has_route("/public-node/public-node-operator-trial-tester-launch-ready-index-pin-v1.html")
assert has_route("/public-node/public-node-operator-trial-tester-launch-ready-index-pin-v1.json")

print("trial tester launch ready index pin/index assertions passed")
PY

printf '%s\n' "$green"
