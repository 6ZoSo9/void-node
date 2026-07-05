#!/usr/bin/env bash
set -euo pipefail

marker="VOID_PUBLIC_NODE_OPERATOR_TRIAL_TESTER_LAUNCH_ANNOUNCEMENT_PUBLISH_READY_STATUS_CARD_V1"
green="VOID_PUBLIC_NODE_OPERATOR_TRIAL_TESTER_LAUNCH_ANNOUNCEMENT_PUBLISH_READY_STATUS_CARD_V1_GREEN"

json="public/public-node/public-node-operator-trial-tester-launch-announcement-publish-ready-status-card-v1.json"
html="public/public-node/public-node-operator-trial-tester-launch-announcement-publish-ready-status-card-v1.html"
doc="docs/public-node/public-node-operator-trial-tester-launch-announcement-publish-ready-status-card-v1.md"
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

marker = "VOID_PUBLIC_NODE_OPERATOR_TRIAL_TESTER_LAUNCH_ANNOUNCEMENT_PUBLISH_READY_STATUS_CARD_V1"
green = "VOID_PUBLIC_NODE_OPERATOR_TRIAL_TESTER_LAUNCH_ANNOUNCEMENT_PUBLISH_READY_STATUS_CARD_V1_GREEN"

card = json.loads(Path("public/public-node/public-node-operator-trial-tester-launch-announcement-publish-ready-status-card-v1.json").read_text())
index = json.loads(Path("public/public-node/index.json").read_text())

assert card["marker"] == marker
assert card["expected_green_marker"] == green
assert card["status"] == "tester_launch_announcement_publish_ready_status_card_ready"
assert card["public_safe"] is True
assert card["read_only"] is True
assert card["boundary"]["publish_ready_status_card_only"] is True
assert card["boundary"]["external_posting_authority"] is False
assert card["boundary"]["operator_review_required_for_real_receipts"] is True

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
    assert card["boundary"][key] is False, key

status = card["publish_ready_status"]
assert status["tester_launch_announcement_publish_ready_status_card_ready"] is True
assert status["publish_terminal_closeout_complete"] is True
assert status["publish_terminal_final_sealed"] is True
assert status["publish_checklist_closeout_ready"] is True
assert status["external_posting_authority"] is False
assert status["live_authority_enabled"] is False
assert status["tester_receipts_are_network_truth"] is False

entry = index["public_node_operator_trial_tester_launch_announcement_publish_ready_status_card"]
assert entry["marker"] == marker
assert entry["expected_green_marker"] == green
assert entry["status"] == "tester_launch_announcement_publish_ready_status_card_ready"
assert entry["html"] == "/public-node/public-node-operator-trial-tester-launch-announcement-publish-ready-status-card-v1.html"
assert entry["json"] == "/public-node/public-node-operator-trial-tester-launch-announcement-publish-ready-status-card-v1.json"

assert index["links"]["public_node_operator_trial_tester_launch_announcement_publish_ready_status_card"] == "/public-node/public-node-operator-trial-tester-launch-announcement-publish-ready-status-card-v1.html"
assert index["links"]["public_node_operator_trial_tester_launch_announcement_publish_ready_status_card_json"] == "/public-node/public-node-operator-trial-tester-launch-announcement-publish-ready-status-card-v1.json"
assert index["route_markers"]["public_node_operator_trial_tester_launch_announcement_publish_ready_status_card"] == marker

routes = index["routes"]
assert any(item == "/public-node/public-node-operator-trial-tester-launch-announcement-publish-ready-status-card-v1.html" or (isinstance(item, dict) and item.get("route") == "/public-node/public-node-operator-trial-tester-launch-announcement-publish-ready-status-card-v1.html") for item in routes)
assert any(item == "/public-node/public-node-operator-trial-tester-launch-announcement-publish-ready-status-card-v1.json" or (isinstance(item, dict) and item.get("route") == "/public-node/public-node-operator-trial-tester-launch-announcement-publish-ready-status-card-v1.json") for item in routes)

print("trial tester launch announcement publish ready status card/index assertions passed")
PY

printf '%s\n' "$green"
