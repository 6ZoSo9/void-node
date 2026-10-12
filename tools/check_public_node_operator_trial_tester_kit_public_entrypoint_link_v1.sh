#!/usr/bin/env bash
set -euo pipefail

marker="VOID_PUBLIC_NODE_OPERATOR_TRIAL_TESTER_KIT_PUBLIC_ENTRYPOINT_LINK_V1"
green="VOID_PUBLIC_NODE_OPERATOR_TRIAL_TESTER_KIT_PUBLIC_ENTRYPOINT_LINK_V1_GREEN"

json="public/public-node/public-node-operator-trial-tester-kit-public-entrypoint-link-v1.json"
html="public/public-node/public-node-operator-trial-tester-kit-public-entrypoint-link-v1.html"
doc="docs/public-node/public-node-operator-trial-tester-kit-public-entrypoint-link-v1.md"
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

marker = "VOID_PUBLIC_NODE_OPERATOR_TRIAL_TESTER_KIT_PUBLIC_ENTRYPOINT_LINK_V1"
green = "VOID_PUBLIC_NODE_OPERATOR_TRIAL_TESTER_KIT_PUBLIC_ENTRYPOINT_LINK_V1_GREEN"

link = json.loads(Path("public/public-node/public-node-operator-trial-tester-kit-public-entrypoint-link-v1.json").read_text())
index = json.loads(Path("public/public-node/index.json").read_text())

assert link["marker"] == marker
assert link["expected_green_marker"] == green
assert link["status"] == "tester_kit_public_entrypoint_link_ready"
assert link["public_safe"] is True
assert link["read_only"] is True
assert link["boundary"]["public_entrypoint_link_only"] is True
assert link["boundary"]["operator_review_required_for_real_receipts"] is True

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
    assert link["boundary"][key] is False, key

required = [
    "tester_kit_closeout_rollup",
    "tester_kit_final_seal",
    "tester_kit_rollup",
    "tester_instruction_pack",
    "tester_receipt_template",
    "tester_receipt_example",
    "trial_public_entrypoint",
    "trial_dashboard_link",
    "trial_root_link"
]
assert [item["key"] for item in link["linked_components"]] == required

status = link["link_status"]
assert status["tester_kit_public_entrypoint_link_ready"] is True
assert status["trial_public_entrypoint_ready"] is True
assert status["trial_dashboard_link_ready"] is True
assert status["trial_root_link_ready"] is True
assert status["operator_review_required_for_real_receipts"] is True
assert status["live_authority_enabled"] is False
assert status["tester_receipts_are_network_truth"] is False

entry = index["public_node_operator_trial_tester_kit_public_entrypoint_link"]
assert entry["marker"] == marker
assert entry["expected_green_marker"] == green
assert entry["status"] == "tester_kit_public_entrypoint_link_ready"
assert entry["html"] == "/public-node/public-node-operator-trial-tester-kit-public-entrypoint-link-v1.html"
assert entry["json"] == "/public-node/public-node-operator-trial-tester-kit-public-entrypoint-link-v1.json"

assert index["links"]["public_node_operator_trial_tester_kit_public_entrypoint_link"] == "/public-node/public-node-operator-trial-tester-kit-public-entrypoint-link-v1.html"
assert index["links"]["public_node_operator_trial_tester_kit_public_entrypoint_link_json"] == "/public-node/public-node-operator-trial-tester-kit-public-entrypoint-link-v1.json"
assert index["route_markers"]["public_node_operator_trial_tester_kit_public_entrypoint_link"] == marker

for key in [
    "public_node_operator_trial_public_entrypoint",
    "public_node_operator_trial_lane_dashboard_link",
    "public_node_operator_trial_root_link",
    "public_node_operator_trial_tester_kit_closeout_rollup",
    "public_node_operator_trial_tester_kit_final_seal",
    "public_node_operator_trial_tester_kit_rollup",
    "public_node_operator_trial_tester_instruction_pack",
    "public_node_operator_trial_tester_receipt_template",
    "public_node_operator_trial_tester_receipt_example"
]:
    assert index[key]["tester_kit_public_entrypoint_link_ready"] is True, key

routes = index["routes"]

def has_route(route):
    return any(item == route or (isinstance(item, dict) and item.get("route") == route) for item in routes)

assert has_route("/public-node/public-node-operator-trial-tester-kit-public-entrypoint-link-v1.html")
assert has_route("/public-node/public-node-operator-trial-tester-kit-public-entrypoint-link-v1.json")

print("trial tester kit public entrypoint link/index assertions passed")
PY

printf '%s\n' "$green"
