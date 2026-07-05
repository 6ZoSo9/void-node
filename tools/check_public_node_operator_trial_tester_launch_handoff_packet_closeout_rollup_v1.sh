#!/usr/bin/env bash
set -euo pipefail

marker="VOID_PUBLIC_NODE_OPERATOR_TRIAL_TESTER_LAUNCH_HANDOFF_PACKET_CLOSEOUT_ROLLUP_V1"
green="VOID_PUBLIC_NODE_OPERATOR_TRIAL_TESTER_LAUNCH_HANDOFF_PACKET_CLOSEOUT_ROLLUP_V1_GREEN"

json="public/public-node/public-node-operator-trial-tester-launch-handoff-packet-closeout-rollup-v1.json"
html="public/public-node/public-node-operator-trial-tester-launch-handoff-packet-closeout-rollup-v1.html"
doc="docs/public-node/public-node-operator-trial-tester-launch-handoff-packet-closeout-rollup-v1.md"
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

marker = "VOID_PUBLIC_NODE_OPERATOR_TRIAL_TESTER_LAUNCH_HANDOFF_PACKET_CLOSEOUT_ROLLUP_V1"
green = "VOID_PUBLIC_NODE_OPERATOR_TRIAL_TESTER_LAUNCH_HANDOFF_PACKET_CLOSEOUT_ROLLUP_V1_GREEN"

rollup = json.loads(Path("public/public-node/public-node-operator-trial-tester-launch-handoff-packet-closeout-rollup-v1.json").read_text())
index = json.loads(Path("public/public-node/index.json").read_text())

assert rollup["marker"] == marker
assert rollup["expected_green_marker"] == green
assert rollup["status"] == "tester_launch_handoff_packet_closeout_rollup_ready"
assert rollup["public_safe"] is True
assert rollup["read_only"] is True
assert rollup["boundary"]["closeout_rollup_only"] is True
assert rollup["boundary"]["handoff_packet_closeout_only"] is True
assert rollup["boundary"]["operator_review_required_for_real_receipts"] is True
assert rollup["boundary"]["no_private_keys_required"] is True
assert rollup["boundary"]["no_secrets_required"] is True
assert rollup["boundary"]["no_pii_required"] is True

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
    assert rollup["boundary"][key] is False, key

required = [
    "tester_launch_handoff_packet",
    "tester_launch_checklist_closeout_rollup",
    "tester_launch_checklist",
    "tester_kit_public_entrypoint_link_closeout_rollup",
    "tester_kit_public_entrypoint_link",
    "tester_kit_closeout_rollup",
    "tester_instruction_pack",
    "tester_receipt_template",
    "tester_receipt_example",
    "submission_intake",
    "submission_review_queue"
]
assert [item["key"] for item in rollup["sealed_components"]] == required

status = rollup["closeout_status"]
assert status["tester_launch_handoff_packet_ready"] is True
assert status["tester_launch_handoff_packet_closeout_rollup_ready"] is True
assert status["tester_kit_discoverable"] is True
assert status["operator_review_required_for_real_receipts"] is True
assert status["live_authority_enabled"] is False
assert status["tester_receipts_are_network_truth"] is False

entry = index["public_node_operator_trial_tester_launch_handoff_packet_closeout_rollup"]
assert entry["marker"] == marker
assert entry["expected_green_marker"] == green
assert entry["status"] == "tester_launch_handoff_packet_closeout_rollup_ready"
assert entry["html"] == "/public-node/public-node-operator-trial-tester-launch-handoff-packet-closeout-rollup-v1.html"
assert entry["json"] == "/public-node/public-node-operator-trial-tester-launch-handoff-packet-closeout-rollup-v1.json"

assert index["links"]["public_node_operator_trial_tester_launch_handoff_packet_closeout_rollup"] == "/public-node/public-node-operator-trial-tester-launch-handoff-packet-closeout-rollup-v1.html"
assert index["links"]["public_node_operator_trial_tester_launch_handoff_packet_closeout_rollup_json"] == "/public-node/public-node-operator-trial-tester-launch-handoff-packet-closeout-rollup-v1.json"
assert index["route_markers"]["public_node_operator_trial_tester_launch_handoff_packet_closeout_rollup"] == marker

for key in [
    "public_node_operator_trial_tester_launch_handoff_packet",
    "public_node_operator_trial_tester_launch_checklist_closeout_rollup",
    "public_node_operator_trial_tester_launch_checklist",
    "public_node_operator_trial_tester_kit_public_entrypoint_link_closeout_rollup",
    "public_node_operator_trial_tester_kit_public_entrypoint_link",
    "public_node_operator_trial_tester_kit_closeout_rollup",
    "public_node_operator_trial_tester_instruction_pack",
    "public_node_operator_trial_tester_receipt_template",
    "public_node_operator_trial_tester_receipt_example",
    "public_node_operator_trial_submission_intake",
    "public_node_operator_trial_submission_review_queue"
]:
    assert index[key]["tester_launch_handoff_packet_closeout_rollup_ready"] is True, key

routes = index["routes"]

def has_route(route):
    return any(item == route or (isinstance(item, dict) and item.get("route") == route) for item in routes)

assert has_route("/public-node/public-node-operator-trial-tester-launch-handoff-packet-closeout-rollup-v1.html")
assert has_route("/public-node/public-node-operator-trial-tester-launch-handoff-packet-closeout-rollup-v1.json")

print("trial tester launch handoff packet closeout rollup/index assertions passed")
PY

printf '%s\n' "$green"
