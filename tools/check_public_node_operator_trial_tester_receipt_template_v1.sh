#!/usr/bin/env bash
set -euo pipefail

marker="VOID_PUBLIC_NODE_OPERATOR_TRIAL_TESTER_RECEIPT_TEMPLATE_V1"
green="VOID_PUBLIC_NODE_OPERATOR_TRIAL_TESTER_RECEIPT_TEMPLATE_V1_GREEN"

json="public/public-node/public-node-operator-trial-tester-receipt-template-v1.json"
html="public/public-node/public-node-operator-trial-tester-receipt-template-v1.html"
doc="docs/public-node/public-node-operator-trial-tester-receipt-template-v1.md"
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

marker = "VOID_PUBLIC_NODE_OPERATOR_TRIAL_TESTER_RECEIPT_TEMPLATE_V1"
green = "VOID_PUBLIC_NODE_OPERATOR_TRIAL_TESTER_RECEIPT_TEMPLATE_V1_GREEN"

receipt = json.loads(Path("public/public-node/public-node-operator-trial-tester-receipt-template-v1.json").read_text())
index = json.loads(Path("public/public-node/index.json").read_text())

assert receipt["marker"] == marker
assert receipt["expected_green_marker"] == green
assert receipt["status"] == "tester_receipt_template_ready"
assert receipt["public_safe"] is True
assert receipt["read_only"] is True
assert receipt["boundary"]["copy_template_only"] is True
assert receipt["boundary"]["operator_review_required_for_real_receipts"] is True
assert receipt["boundary"]["no_private_keys_required"] is True
assert receipt["boundary"]["no_secrets_required"] is True
assert receipt["boundary"]["no_pii_required"] is True

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
    "tester_receipt_is_network_truth"
]:
    assert receipt["boundary"][key] is False, key

required_fields = [
    "tester_alias",
    "tester_contact_optional",
    "run_id",
    "timestamp_utc",
    "node_version_or_commit",
    "environment_os",
    "hardware_summary_optional",
    "network_mode",
    "public_routes_checked",
    "commands_run",
    "observed_results",
    "failures_or_warnings",
    "evidence_links_or_hashes",
    "tester_attestation",
    "requested_review_action"
]

assert [item["key"] for item in receipt["receipt_fields"]] == required_fields
for key in required_fields:
    assert key in receipt["copy_template"], key

assert receipt["source_tester_instruction_pack_route"] == "/public-node/public-node-operator-trial-tester-instruction-pack-v1.json"
assert receipt["source_submission_intake_route"] == "/public-node/public-node-operator-trial-submission-intake-v1.json"
assert receipt["source_submission_review_queue_route"] == "/public-node/public-node-operator-trial-submission-review-queue-v1.json"
assert receipt["source_terminal_final_seal_route"] == "/public-node/public-node-operator-trial-terminal-final-seal-v1.json"

entry = index["public_node_operator_trial_tester_receipt_template"]
assert entry["marker"] == marker
assert entry["expected_green_marker"] == green
assert entry["status"] == "tester_receipt_template_ready"
assert entry["html"] == "/public-node/public-node-operator-trial-tester-receipt-template-v1.html"
assert entry["json"] == "/public-node/public-node-operator-trial-tester-receipt-template-v1.json"

assert index["links"]["public_node_operator_trial_tester_receipt_template"] == "/public-node/public-node-operator-trial-tester-receipt-template-v1.html"
assert index["links"]["public_node_operator_trial_tester_receipt_template_json"] == "/public-node/public-node-operator-trial-tester-receipt-template-v1.json"
assert index["route_markers"]["public_node_operator_trial_tester_receipt_template"] == marker

assert index["public_node_operator_trial_tester_instruction_pack"]["tester_receipt_template_ready"] is True
assert index["public_node_operator_trial_submission_intake"]["tester_receipt_template_ready"] is True

routes = index["routes"]

def has_route(route):
    return any(item == route or (isinstance(item, dict) and item.get("route") == route) for item in routes)

assert has_route("/public-node/public-node-operator-trial-tester-receipt-template-v1.html")
assert has_route("/public-node/public-node-operator-trial-tester-receipt-template-v1.json")

print("trial tester receipt template/index assertions passed")
PY

printf '%s\n' "$green"
