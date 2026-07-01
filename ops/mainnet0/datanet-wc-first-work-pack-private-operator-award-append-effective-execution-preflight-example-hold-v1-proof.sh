#!/usr/bin/env bash
set -euo pipefail

BRICK="datanet-wc-first-work-pack-private-operator-award-append-effective-execution-preflight-example-hold-v1"
MARKER="VOID_DATANET_WC_FIRST_WORK_PACK_PRIVATE_OPERATOR_AWARD_APPEND_EFFECTIVE_EXECUTION_PREFLIGHT_EXAMPLE_HOLD_V1"

EFFECTIVE_EXECUTION_PREFLIGHT_MARKER="VOID_DATANET_WC_FIRST_WORK_PACK_PRIVATE_OPERATOR_AWARD_APPEND_EFFECTIVE_EXECUTION_PREFLIGHT_HOLD_V1"
FINAL_EXECUTION_CLOSEOUT_MARKER="VOID_DATANET_WC_FIRST_WORK_PACK_PRIVATE_OPERATOR_AWARD_APPEND_FINAL_EXECUTION_CLOSEOUT_AUDIT_ROLLUP_HOLD_V1"
FINAL_EXECUTION_CANDIDATE_MARKER="VOID_DATANET_WC_FIRST_WORK_PACK_PRIVATE_OPERATOR_AWARD_APPEND_FINAL_EXECUTION_CANDIDATE_HOLD_V1"
FINAL_EXECUTION_EXAMPLE_MARKER="VOID_DATANET_WC_FIRST_WORK_PACK_PRIVATE_OPERATOR_AWARD_APPEND_FINAL_EXECUTION_EXAMPLE_HOLD_V1"
LEDGER_APPEND_CLOSEOUT_MARKER="VOID_DATANET_WC_FIRST_WORK_PACK_PRIVATE_OPERATOR_LEDGER_APPEND_CLOSEOUT_AUDIT_ROLLUP_HOLD_V1"
LEDGER_LINE_CLOSEOUT_MARKER="VOID_DATANET_WC_FIRST_WORK_PACK_PRIVATE_OPERATOR_LEDGER_LINE_CLOSEOUT_AUDIT_ROLLUP_HOLD_V1"
LEDGER_AUTH_CLOSEOUT_MARKER="VOID_DATANET_WC_FIRST_WORK_PACK_PRIVATE_OPERATOR_LEDGER_WRITE_AUTHORIZATION_CLOSEOUT_AUDIT_ROLLUP_HOLD_V1"
APPROVAL_CLOSEOUT_MARKER="VOID_DATANET_WC_FIRST_WORK_PACK_PRIVATE_OPERATOR_AWARD_APPEND_APPROVAL_CLOSEOUT_AUDIT_ROLLUP_HOLD_V1"
DECISION_CLOSEOUT_MARKER="VOID_DATANET_WC_FIRST_WORK_PACK_PRIVATE_OPERATOR_AWARD_APPEND_DECISION_CLOSEOUT_AUDIT_ROLLUP_HOLD_V1"
PREFLIGHT_CLOSEOUT_MARKER="VOID_DATANET_WC_FIRST_WORK_PACK_PRIVATE_OPERATOR_AWARD_APPEND_PREFLIGHT_CLOSEOUT_AUDIT_ROLLUP_HOLD_V1"
PUBLIC_STATUS_CLOSEOUT_MARKER="VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_WC_AWARD_PUBLIC_STATUS_CLOSEOUT_AUDIT_ROLLUP_HOLD_V1"
PUBLIC_LEDGER_APPROVAL_CLOSEOUT_MARKER="VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_WC_LEDGER_WRITE_APPROVAL_CLOSEOUT_AUDIT_ROLLUP_HOLD_V1"
PUBLIC_LEDGER_CLOSEOUT_MARKER="VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_WC_LEDGER_WRITE_CLOSEOUT_AUDIT_ROLLUP_HOLD_V1"
AMOUNT_CLOSEOUT_MARKER="VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_WC_AMOUNT_RECOMMENDATION_CLOSEOUT_AUDIT_ROLLUP_HOLD_V1"
FIRST_PACK_MARKER="VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_HOLD_V1"

DOC="docs/operator/work-credits/${BRICK}.md"
SCHEMA="schemas/operator/work-credits/${BRICK}.schema.json"
EXAMPLE="examples/operator/work-credits/${BRICK}.example.json"
PRIVATE_RECORD="ops/private/work-credits/${BRICK}.json"
WC_INDEX="public/public-node/work-credits/index.json"
ROOT_INDEX="public/public-node/index.json"

echo "== JSON parse / private effective execution preflight example binding =="
python3 - <<PY
import json
from pathlib import Path

def need(condition, message):
    if not condition:
        raise AssertionError(message)

marker = "$MARKER"
required_markers = [
    "$EFFECTIVE_EXECUTION_PREFLIGHT_MARKER",
    "$FINAL_EXECUTION_CLOSEOUT_MARKER",
    "$FINAL_EXECUTION_CANDIDATE_MARKER",
    "$FINAL_EXECUTION_EXAMPLE_MARKER",
    "$LEDGER_APPEND_CLOSEOUT_MARKER",
    "$LEDGER_LINE_CLOSEOUT_MARKER",
    "$LEDGER_AUTH_CLOSEOUT_MARKER",
    "$APPROVAL_CLOSEOUT_MARKER",
    "$DECISION_CLOSEOUT_MARKER",
    "$PREFLIGHT_CLOSEOUT_MARKER",
    "$PUBLIC_STATUS_CLOSEOUT_MARKER",
    "$PUBLIC_LEDGER_APPROVAL_CLOSEOUT_MARKER",
    "$PUBLIC_LEDGER_CLOSEOUT_MARKER",
    "$AMOUNT_CLOSEOUT_MARKER",
    "$FIRST_PACK_MARKER"
]

record = json.loads(Path("$PRIVATE_RECORD").read_text())
schema = json.loads(Path("$SCHEMA").read_text())
example = json.loads(Path("$EXAMPLE").read_text())
doc = Path("$DOC").read_text()
wc_index = json.loads(Path("$WC_INDEX").read_text())
root_index = json.loads(Path("$ROOT_INDEX").read_text())
blob = json.dumps(record, sort_keys=True)

need(record["marker"] == marker, "record marker mismatch")
need(schema["properties"]["marker"]["const"] == marker, "schema marker mismatch")
need(example["marker"] == marker, "example marker mismatch")
need(marker in doc, "marker missing from doc")

for source_marker in required_markers:
    need(source_marker in blob, f"source marker missing from record: {source_marker}")
    need(source_marker in doc, f"source marker missing from doc: {source_marker}")

need(record["visibility"] == "private_operator_only", "visibility private")
need(record["public_route_created"] is False, "public route false")

preflight = record["private_operator_effective_execution_preflight_example"]
need(preflight["effective_execution_preflight_example_packet_created"] is True, "preflight example packet")
need(preflight["private_operator_only"] is True, "private")
need(preflight["requires_private_effective_execution_preflight"] is True, "effective preflight required")
need(preflight["requires_private_final_execution_closeout"] is True, "final closeout required")
need(preflight["requires_private_ledger_append_closeout"] is True, "append closeout required")
need(preflight["requires_private_ledger_line_closeout"] is True, "line closeout required")
need(preflight["requires_private_ledger_write_authorization_closeout"] is True, "auth closeout required")
need(preflight["requires_private_approval_closeout"] is True, "approval closeout required")
need(preflight["requires_private_decision_closeout"] is True, "decision closeout required")
need(preflight["requires_private_preflight_closeout"] is True, "preflight closeout required")
need(preflight["example_preflight_is_not_authorization"] is True, "example not authorization")
need(preflight["example_execution_is_not_effective"] is True, "example not effective")
need(preflight["example_execution_is_not_performed"] is True, "example not performed")
need(preflight["example_append_is_not_performed"] is True, "example append not performed")
need(preflight["example_ledger_line_is_not_created"] is True, "example line not created")
need(preflight["example_amount_wc"] == 100, "example amount")
need(preflight["example_amount_is_not_approved_here"] is True, "amount not approved")
need(preflight["example_amount_is_not_supply_limit"] is True, "amount not supply limit")

for key in [
    "effective_execution_authorized_here",
    "effective_execution_performed_here",
    "effective_ledger_append_performed_here",
    "effective_ledger_line_created_here",
    "effective_ledger_write_authorization_created_here",
    "effective_operator_approval_created_here",
    "operator_append_decision_created_here",
    "award_created_here",
    "award_approved_here",
    "ledger_write_authorized_here",
    "ledger_line_created_here",
    "ledger_append_performed_here",
    "ledger_mutation_performed_here",
    "wc_issuance_created_here",
    "wc_ledger_write_created_here",
    "reward_created_here",
    "void_transfer_created_here",
    "runtime_append_endpoint_created"
]:
    need(preflight[key] is False, f"preflight false expected: {key}")

packet = record["effective_execution_preflight_example_packet"]
need(packet["effective_execution_preflight_example_packet_created_here"] is True, "packet created")
need(packet["example_preflight_is_not_authorization"] is True, "packet not auth")
need(packet["example_execution_is_not_effective"] is True, "packet not effective")
need(packet["example_execution_is_not_performed"] is True, "packet not performed")
need(packet["example_append_is_not_performed"] is True, "packet append not performed")
need(packet["example_ledger_line_is_not_created"] is True, "packet line not created")
for key in [
    "effective_execution_authorized_here",
    "effective_execution_performed_here",
    "effective_ledger_append_performed_here",
    "effective_ledger_line_created_here",
    "effective_ledger_write_authorization_created_here",
    "effective_operator_approval_created_here",
    "operator_append_decision_created_here",
    "award_created_here",
    "award_approved_here",
    "ledger_write_authorized_here",
    "ledger_line_created_here",
    "ledger_append_performed_here",
    "ledger_mutation_performed_here",
    "wc_issuance_created_here",
    "wc_ledger_write_created_here",
    "reward_created_here",
    "void_transfer_created_here"
]:
    need(packet[key] is False, f"packet false expected: {key}")

private = record["private_boundary"]
need(private["operator_only"] is True, "operator only")
for key in [
    "public_route_created",
    "public_index_mutated",
    "root_public_index_mutated",
    "wallet_connect_enabled",
    "server_side_submission_endpoint_created",
    "runtime_mutation_route_created"
]:
    need(private[key] is False, f"private false expected: {key}")

execution = record["execution_boundary"]
need(execution["effective_execution_preflight_example_only"] is True, "example only")
for key in [
    "effective_execution_authorized",
    "effective_execution_performed",
    "effective_ledger_append_performed",
    "effective_ledger_line_created",
    "effective_ledger_write_authorization_created",
    "effective_operator_approval_created",
    "operator_append_decision_created",
    "award_created",
    "award_approved",
    "ledger_write_authorized",
    "ledger_line_created",
    "ledger_append_performed",
    "ledger_mutation_performed",
    "wc_issuance_created",
    "wc_ledger_write_created",
    "reward_created",
    "void_transfer_created"
]:
    need(execution[key] is False, f"execution false expected: {key}")

policy = record["work_credit_policy"]
need(policy["wc_supply_policy"] == "unlimited_uncapped_accounting_units_for_useful_verifiable_work", "WC policy")
for key in ["issues_work_credits", "writes_work_credit_ledger", "creates_award", "creates_reward", "creates_void_transfer"]:
    need(policy[key] is False, f"policy false expected: {key}")

safety = record["safety_boundary"]
for key in [
    "work_credits_unlimited_uncapped",
    "no_wc_issuance",
    "no_wc_ledger_write",
    "no_ledger_line_creation",
    "no_ledger_append",
    "no_ledger_mutation",
    "no_effective_execution_authorization",
    "no_effective_execution",
    "no_ledger_write_authorization",
    "no_effective_approval",
    "no_award_creation",
    "no_reward_creation",
    "no_void_transfer",
    "no_wallet_connect",
    "no_public_submission_route",
    "no_runtime_mutation_route",
    "no_secret_material"
]:
    need(safety[key] is True, f"safety failed: {key}")

need(all(marker not in json.dumps(obj) for obj in [wc_index, root_index]), "private marker must not appear in public indices")

print("private_operator_effective_execution_preflight_example_binding_green=true")
PY

echo "== forbidden public mutation scan =="
if grep -R "$MARKER" public/public-node docs/public-node examples/public-node 2>/dev/null; then
  echo "private_effective_execution_preflight_example_marker_leaked_to_public_tree=true"
  exit 1
fi
echo "private_effective_execution_preflight_example_marker_not_in_public_tree_green=true"

echo "== forbidden WC cap wording scan =="
if grep -R "100,000,000 WC\|100000000 WC\|lifetime WC cap\|WC cap" "$DOC" "$SCHEMA" "$EXAMPLE" "$PRIVATE_RECORD"; then
  echo "forbidden_wc_cap_language_found=true"
  exit 1
fi
echo "forbidden_wc_cap_scan_green=true"

echo "== result =="
echo "VOID_DATANET_WC_FIRST_WORK_PACK_PRIVATE_OPERATOR_AWARD_APPEND_EFFECTIVE_EXECUTION_PREFLIGHT_EXAMPLE_HOLD_V1_GREEN"
