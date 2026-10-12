#!/usr/bin/env bash
set -euo pipefail
marker="VOID_PUBLIC_NODE_OPERATOR_TRIAL_TESTER_INSTRUCTION_PACK_V1"
green="VOID_PUBLIC_NODE_OPERATOR_TRIAL_TESTER_INSTRUCTION_PACK_V1_GREEN"
json="public/public-node/public-node-operator-trial-tester-instruction-pack-v1.json"
html="public/public-node/public-node-operator-trial-tester-instruction-pack-v1.html"
doc="docs/public-node/public-node-operator-trial-tester-instruction-pack-v1.md"
index="public/public-node/index.json"
python3 -m json.tool "$json" >/dev/null
python3 -m json.tool "$index" >/dev/null
grep -F "$marker" "$json" >/dev/null
grep -F "$green" "$json" >/dev/null
grep -F "$marker" "$html" >/dev/null
grep -F "$green" "$html" >/dev/null
grep -F "$marker" "$doc" >/dev/null
grep -F "$green" "$doc" >/dev/null
grep -F "Public upload route enabled: false" "$html" >/dev/null
grep -F "Submitted receipts are not network truth" "$html" >/dev/null
python3 - <<'CHECKPY'
import json
from pathlib import Path
marker="VOID_PUBLIC_NODE_OPERATOR_TRIAL_TESTER_INSTRUCTION_PACK_V1"
green="VOID_PUBLIC_NODE_OPERATOR_TRIAL_TESTER_INSTRUCTION_PACK_V1_GREEN"
record=json.loads(Path("public/public-node/public-node-operator-trial-tester-instruction-pack-v1.json").read_text())
index=json.loads(Path("public/public-node/index.json").read_text())
assert record["marker"]==marker
assert record["expected_green_marker"]==green
assert record["public_safe"] is True
assert record["read_only"] is True
assert record["status"]=="trial_tester_instruction_pack_ready"
for key in ["public_queue_mutation_enabled","public_upload_route_enabled","public_form_enabled","mutation_route_enabled","wallet_send_enabled","money_movement_enabled","buy_void_fulfillment_enabled","wc_issuance_enabled","wc_to_void_swap_enabled","wc_ledger_write_enabled","validator_admission_enabled","validator_mutation_enabled","runtime_truth_claim","tester_receipts_are_network_truth"]:
    assert record["boundary"][key] is False, key
policy=record["submission_policy"]
assert policy["operator_provided_submission_channel_required"] is True
assert policy["manual_operator_review_required"] is True
assert policy["public_upload_route_enabled"] is False
assert policy["public_form_enabled"] is False
assert policy["public_queue_mutation_enabled"] is False
assert policy["submitted_receipts_are_not_network_truth"] is True
for key in ["terminal_final_seal","public_entrypoint","trial_packet","connect_pack","receipt_template","submission_intake","submission_review_queue"]:
    assert key in record["routes"], key
for field in ["tester_alias_or_handle","receipt_template_version","timestamp_utc","boundary_acknowledgement","requested_operator_review_outcome"]:
    assert field in record["required_receipt_fields"], field
for forbidden in ["private keys","seed phrases","wallet secrets"]:
    assert forbidden in record["do_not_include"], forbidden
entry=index["public_node_operator_trial_tester_instruction_pack"]
assert entry["marker"]==marker
assert entry["expected_green_marker"]==green
assert entry["status"]=="trial_tester_instruction_pack_ready"
assert index["links"]["public_node_operator_trial_tester_instruction_pack"]=="/public-node/public-node-operator-trial-tester-instruction-pack-v1.html"
assert index["links"]["public_node_operator_trial_human_start"]=="/public-node/public-node-operator-trial-tester-instruction-pack-v1.html"
assert index["route_markers"]["public_node_operator_trial_tester_instruction_pack"]==marker
assert index["route_markers"]["public_node_operator_trial_human_start"]==marker
assert index["public_node_operator_trial_terminal_final_seal"]["trial_tester_instruction_pack"]=="/public-node/public-node-operator-trial-tester-instruction-pack-v1.html"
routes=index["routes"]
def has_route(route):
    return any(item==route or (isinstance(item,dict) and item.get("route")==route) for item in routes)
assert has_route("/public-node/public-node-operator-trial-tester-instruction-pack-v1.html")
assert has_route("/public-node/public-node-operator-trial-tester-instruction-pack-v1.json")
print("trial tester instruction pack/index assertions passed")
CHECKPY
printf '%s\n' "$green"
