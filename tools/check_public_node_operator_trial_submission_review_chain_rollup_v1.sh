#!/usr/bin/env bash
set -euo pipefail
marker="VOID_PUBLIC_NODE_OPERATOR_TRIAL_SUBMISSION_REVIEW_CHAIN_ROLLUP_V1"
green="VOID_PUBLIC_NODE_OPERATOR_TRIAL_SUBMISSION_REVIEW_CHAIN_ROLLUP_V1_GREEN"
json="public/public-node/public-node-operator-trial-submission-review-chain-rollup-v1.json"
html="public/public-node/public-node-operator-trial-submission-review-chain-rollup-v1.html"
doc="docs/public-node/public-node-operator-trial-submission-review-chain-rollup-v1.md"
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
marker="VOID_PUBLIC_NODE_OPERATOR_TRIAL_SUBMISSION_REVIEW_CHAIN_ROLLUP_V1"
green="VOID_PUBLIC_NODE_OPERATOR_TRIAL_SUBMISSION_REVIEW_CHAIN_ROLLUP_V1_GREEN"
record=json.loads(Path("public/public-node/public-node-operator-trial-submission-review-chain-rollup-v1.json").read_text())
index=json.loads(Path("public/public-node/index.json").read_text())
assert record["marker"]==marker
assert record["expected_green_marker"]==green
assert record["public_safe"] is True
assert record["read_only"] is True
assert record["status"]=="trial_submission_review_chain_rollup_ready"
for key in ["public_queue_mutation_enabled","public_upload_route_enabled","public_form_enabled","mutation_route_enabled","wallet_send_enabled","money_movement_enabled","buy_void_fulfillment_enabled","wc_issuance_enabled","wc_to_void_swap_enabled","wc_ledger_write_enabled","validator_admission_enabled","validator_mutation_enabled","runtime_truth_claim","tester_receipts_are_network_truth"]:
  assert record["boundary"][key] is False, key
status=record["rollup_status"]
assert status["submission_intake_bound"] is True
assert status["submission_review_queue_bound"] is True
assert status["submission_review_decision_example_bound"] is True
assert status["queue_mutation_enabled"] is False
assert status["live_authority_enabled"] is False
required=["submission_intake","submission_review_queue","submission_review_decision_example","review_checklist","decision_template","trial_closeout_rollup","trial_root_link"]
assert [item["key"] for item in record["components"]]==required
entry=index["public_node_operator_trial_submission_review_chain_rollup"]
assert entry["marker"]==marker
assert entry["expected_green_marker"]==green
assert entry["status"]=="trial_submission_review_chain_rollup_ready"
assert index["links"]["public_node_operator_trial_submission_review_chain_rollup"]=="/public-node/public-node-operator-trial-submission-review-chain-rollup-v1.html"
assert index["links"]["public_node_operator_trial_submission_review_chain_rollup_json"]=="/public-node/public-node-operator-trial-submission-review-chain-rollup-v1.json"
assert index["route_markers"]["public_node_operator_trial_submission_review_chain_rollup"]==marker
assert index["public_node_operator_trial_submission_review_queue"]["trial_submission_review_chain_rollup"]=="/public-node/public-node-operator-trial-submission-review-chain-rollup-v1.html"
routes=index["routes"]
def has_route(route):
  return any(item==route or (isinstance(item,dict) and item.get("route")==route) for item in routes)
assert has_route("/public-node/public-node-operator-trial-submission-review-chain-rollup-v1.html")
assert has_route("/public-node/public-node-operator-trial-submission-review-chain-rollup-v1.json")
print("trial submission review chain rollup/index assertions passed")
CHECKPY
printf '%s\n' "$green"
