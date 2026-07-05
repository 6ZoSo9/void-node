#!/usr/bin/env bash
set -euo pipefail

marker="VOID_PUBLIC_NODE_OPERATOR_TRIAL_RECEIPT_EXAMPLE_V1_GREEN"

json="public/public-node/public-node-operator-trial-receipt-example-v1.json"
html="public/public-node/public-node-operator-trial-receipt-example-v1.html"
doc="docs/public-node/public-node-operator-trial-receipt-example-v1.md"
index="public/public-node/index.json"

python3 -m json.tool "$json" >/dev/null
python3 -m json.tool "$index" >/dev/null

grep -F "VOID_PUBLIC_NODE_OPERATOR_TRIAL_RECEIPT_EXAMPLE_V1" "$json" >/dev/null
grep -F "$marker" "$json" >/dev/null
grep -F "VOID_PUBLIC_NODE_OPERATOR_TRIAL_RECEIPT_EXAMPLE_V1" "$html" >/dev/null
grep -F "$marker" "$html" >/dev/null
grep -F "VOID_PUBLIC_NODE_OPERATOR_TRIAL_RECEIPT_EXAMPLE_V1" "$doc" >/dev/null
grep -F "$marker" "$doc" >/dev/null

python3 - <<'PY'
import json
from pathlib import Path

receipt = json.loads(Path("public/public-node/public-node-operator-trial-receipt-example-v1.json").read_text())
index = json.loads(Path("public/public-node/index.json").read_text())

boundary = receipt["boundary"]
disabled = ["mutation_route_enabled","wallet_send_enabled","money_movement_enabled","buy_void_fulfillment_enabled","wc_issuance_enabled","wc_to_void_swap_enabled","validator_admission_enabled","validator_mutation_enabled","runtime_truth_claim","tester_receipts_are_network_truth"]
required_pairs = {"trial_packet","connect_receipt_template","handoff_packet","review_checklist","decision_template","dashboard"}
routes = index["routes"]
links = index["links"]
route_markers = index["route_markers"]
entry = index["public_node_operator_trial_receipt_example"]
example = receipt["example_receipt"]
review = receipt["operator_review_result"]

assert receipt["marker"] == "VOID_PUBLIC_NODE_OPERATOR_TRIAL_RECEIPT_EXAMPLE_V1"
assert receipt["expected_green_marker"] == "VOID_PUBLIC_NODE_OPERATOR_TRIAL_RECEIPT_EXAMPLE_V1_GREEN"
assert receipt["public_safe"] is True
assert receipt["read_only"] is True
assert all(boundary[key] is False for key in disabled), boundary
assert boundary["operator_review_required"] is True
assert boundary["read_only"] is True
assert boundary["public_routes_only"] is True
assert example["receipt_status"] == "example_not_submitted"
assert example["requested_operator_classification"] == "informational_example"
assert example["safe_environment_summary"]["secrets_disclosed"] is False
assert example["safe_environment_summary"]["private_ip_disclosed"] is False
assert review["decision_status"] == "not_reviewed_example"
assert review["example_recommended_decision"] == "informational"
assert required_pairs <= set(receipt["pairs_with"]), receipt["pairs_with"]
assert entry["marker"] == "VOID_PUBLIC_NODE_OPERATOR_TRIAL_RECEIPT_EXAMPLE_V1"
assert entry["expected_green_marker"] == "VOID_PUBLIC_NODE_OPERATOR_TRIAL_RECEIPT_EXAMPLE_V1_GREEN"
assert entry["status"] == "trial_receipt_example_ready"
assert links["public_node_operator_trial_receipt_example"] == "/public-node/public-node-operator-trial-receipt-example-v1.html"
assert links["public_node_operator_trial_receipt_example_html"] == "/public-node/public-node-operator-trial-receipt-example-v1.html"
assert links["public_node_operator_trial_receipt_example_json"] == "/public-node/public-node-operator-trial-receipt-example-v1.json"
assert route_markers["public_node_operator_trial_receipt_example"] == "VOID_PUBLIC_NODE_OPERATOR_TRIAL_RECEIPT_EXAMPLE_V1"
assert "/public-node/public-node-operator-trial-receipt-example-v1.html" in routes
assert "/public-node/public-node-operator-trial-receipt-example-v1.json" in routes

print("trial receipt example/index assertions passed")
PY

printf '%s\n' "$marker"
