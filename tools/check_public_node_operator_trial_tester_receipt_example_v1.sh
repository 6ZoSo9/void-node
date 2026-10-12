#!/usr/bin/env bash
set -euo pipefail

marker="VOID_PUBLIC_NODE_OPERATOR_TRIAL_TESTER_RECEIPT_EXAMPLE_V1"
green="VOID_PUBLIC_NODE_OPERATOR_TRIAL_TESTER_RECEIPT_EXAMPLE_V1_GREEN"
template_marker="VOID_PUBLIC_NODE_OPERATOR_TRIAL_TESTER_RECEIPT_TEMPLATE_V1"

json="public/public-node/public-node-operator-trial-tester-receipt-example-v1.json"
html="public/public-node/public-node-operator-trial-tester-receipt-example-v1.html"
doc="docs/public-node/public-node-operator-trial-tester-receipt-example-v1.md"
index="public/public-node/index.json"

python3 -m json.tool "$json" >/dev/null
python3 -m json.tool "$index" >/dev/null

grep -F "$marker" "$json" >/dev/null
grep -F "$green" "$json" >/dev/null
grep -F "$template_marker" "$json" >/dev/null
grep -F "$marker" "$html" >/dev/null
grep -F "$green" "$html" >/dev/null
grep -F "$marker" "$doc" >/dev/null
grep -F "$green" "$doc" >/dev/null

python3 - <<'PY'
import json
from pathlib import Path

marker = "VOID_PUBLIC_NODE_OPERATOR_TRIAL_TESTER_RECEIPT_EXAMPLE_V1"
green = "VOID_PUBLIC_NODE_OPERATOR_TRIAL_TESTER_RECEIPT_EXAMPLE_V1_GREEN"
template_marker = "VOID_PUBLIC_NODE_OPERATOR_TRIAL_TESTER_RECEIPT_TEMPLATE_V1"

receipt = json.loads(Path("public/public-node/public-node-operator-trial-tester-receipt-example-v1.json").read_text())
index = json.loads(Path("public/public-node/index.json").read_text())

assert receipt["marker"] == marker
assert receipt["expected_green_marker"] == green
assert receipt["status"] == "tester_receipt_example_ready"
assert receipt["public_safe"] is True
assert receipt["read_only"] is True
assert receipt["boundary"]["example_fixture_only"] is True
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

example = receipt["example_receipt"]
assert example["kind"] == "public_node_operator_trial_tester_receipt_v1"
assert example["template_source_marker"] == template_marker
assert example["example_fixture"] is True
assert example["tester_alias"] == "example-public-tester"
assert example["requested_review_action"] == "informational"
assert isinstance(example["public_routes_checked"], list) and example["public_routes_checked"]
assert isinstance(example["commands_run"], list) and example["commands_run"]
assert isinstance(example["observed_results"], list) and example["observed_results"]

assert receipt["source_tester_receipt_template_route"] == "/public-node/public-node-operator-trial-tester-receipt-template-v1.json"
assert receipt["source_tester_instruction_pack_route"] == "/public-node/public-node-operator-trial-tester-instruction-pack-v1.json"
assert receipt["source_submission_intake_route"] == "/public-node/public-node-operator-trial-submission-intake-v1.json"
assert receipt["source_submission_review_queue_route"] == "/public-node/public-node-operator-trial-submission-review-queue-v1.json"
assert receipt["source_terminal_final_seal_route"] == "/public-node/public-node-operator-trial-terminal-final-seal-v1.json"

entry = index["public_node_operator_trial_tester_receipt_example"]
assert entry["marker"] == marker
assert entry["expected_green_marker"] == green
assert entry["status"] == "tester_receipt_example_ready"
assert entry["html"] == "/public-node/public-node-operator-trial-tester-receipt-example-v1.html"
assert entry["json"] == "/public-node/public-node-operator-trial-tester-receipt-example-v1.json"
assert entry["example_fixture_only"] is True

assert index["links"]["public_node_operator_trial_tester_receipt_example"] == "/public-node/public-node-operator-trial-tester-receipt-example-v1.html"
assert index["links"]["public_node_operator_trial_tester_receipt_example_json"] == "/public-node/public-node-operator-trial-tester-receipt-example-v1.json"
assert index["route_markers"]["public_node_operator_trial_tester_receipt_example"] == marker

assert index["public_node_operator_trial_tester_receipt_template"]["tester_receipt_example_ready"] is True
assert index["public_node_operator_trial_tester_instruction_pack"]["tester_receipt_example_ready"] is True
assert index["public_node_operator_trial_submission_intake"]["tester_receipt_example_ready"] is True

routes = index["routes"]

def has_route(route):
    return any(item == route or (isinstance(item, dict) and item.get("route") == route) for item in routes)

assert has_route("/public-node/public-node-operator-trial-tester-receipt-example-v1.html")
assert has_route("/public-node/public-node-operator-trial-tester-receipt-example-v1.json")

print("trial tester receipt example/index assertions passed")
PY

printf '%s\n' "$green"
