#!/usr/bin/env bash
set -euo pipefail

BRICK="datanet-wc-first-work-pack-private-operator-ledger-line-candidate-hold-v1"
MARKER="VOID_DATANET_WC_FIRST_WORK_PACK_PRIVATE_OPERATOR_LEDGER_LINE_CANDIDATE_HOLD_V1"

LEDGER_AUTH_CLOSEOUT_MARKER="VOID_DATANET_WC_FIRST_WORK_PACK_PRIVATE_OPERATOR_LEDGER_WRITE_AUTHORIZATION_CLOSEOUT_AUDIT_ROLLUP_HOLD_V1"
LEDGER_AUTH_CANDIDATE_MARKER="VOID_DATANET_WC_FIRST_WORK_PACK_PRIVATE_OPERATOR_LEDGER_WRITE_AUTHORIZATION_CANDIDATE_HOLD_V1"
LEDGER_AUTH_EXAMPLE_MARKER="VOID_DATANET_WC_FIRST_WORK_PACK_PRIVATE_OPERATOR_LEDGER_WRITE_AUTHORIZATION_EXAMPLE_HOLD_V1"
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

echo "== JSON parse / private ledger-line candidate binding =="
python3 - <<PY
import json
from pathlib import Path

def need(condition, message):
    if not condition:
        raise AssertionError(message)

marker = "$MARKER"
required_markers = [
    "$LEDGER_AUTH_CLOSEOUT_MARKER",
    "$LEDGER_AUTH_CANDIDATE_MARKER",
    "$LEDGER_AUTH_EXAMPLE_MARKER",
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

need(record["visibility"] == "private_operator_only", "visibility must be private operator only")
need(record["public_route_created"] is False, "public route must be false")

candidate = record["private_operator_ledger_line_candidate"]
need(candidate["ledger_line_candidate_shape_created"] is True, "ledger-line candidate shape must be true")
need(candidate["private_operator_only"] is True, "private operator only must be true")
need(candidate["requires_private_ledger_write_authorization_closeout"] is True, "ledger auth closeout required")
need(candidate["requires_private_approval_closeout"] is True, "approval closeout required")
need(candidate["requires_private_decision_closeout"] is True, "decision closeout required")
need(candidate["requires_private_preflight_closeout"] is True, "preflight closeout required")
need(candidate["requires_future_effective_ledger_line_creation"] is True, "future ledger line required")
need(candidate["requires_future_effective_ledger_write_authorization"] is True, "future ledger auth required")
need(candidate["requires_future_ledger_append"] is True, "future ledger append required")
need(candidate["requires_operator_final_review"] is True, "operator final review required")
need(candidate["example_amount_wc"] == 100, "example amount must be 100")
need(candidate["example_amount_is_not_approved_here"] is True, "example amount not approved")
need(candidate["example_amount_is_not_supply_limit"] is True, "example amount not supply limit")
need(candidate["effective_ledger_line_created_here"] is False, "effective ledger line must be false")
need(candidate["effective_ledger_write_authorization_created_here"] is False, "effective ledger auth must be false")
need(candidate["effective_operator_approval_created_here"] is False, "effective approval must be false")
need(candidate["operator_append_decision_created_here"] is False, "append decision must be false")
need(candidate["award_created_here"] is False, "award created must be false")
need(candidate["award_approved_here"] is False, "award approved must be false")
need(candidate["ledger_write_authorized_here"] is False, "ledger auth must be false")
need(candidate["ledger_line_created_here"] is False, "ledger line created must be false")
need(candidate["ledger_append_performed_here"] is False, "ledger append must be false")
need(candidate["wc_issuance_created_here"] is False, "WC issuance must be false")
need(candidate["wc_ledger_write_created_here"] is False, "WC ledger write must be false")
need(candidate["reward_created_here"] is False, "reward must be false")
need(candidate["void_transfer_created_here"] is False, "VOID transfer must be false")
need(candidate["runtime_append_endpoint_created"] is False, "runtime endpoint must be false")

template = record["ledger_line_candidate_template"]
need(template["ledger_line_candidate_shape_created_here"] is True, "template candidate shape created")
need(template["effective_ledger_line_created_here"] is False, "template effective ledger line false")
need(template["effective_ledger_write_authorization_created_here"] is False, "template effective auth false")
need(template["effective_operator_approval_created_here"] is False, "template effective approval false")
need(template["operator_append_decision_created_here"] is False, "template append decision false")
need(template["award_created_here"] is False, "template award created false")
need(template["award_approved_here"] is False, "template award approved false")
need(template["ledger_write_authorized_here"] is False, "template ledger auth false")
need(template["ledger_line_created_here"] is False, "template ledger line false")
need(template["ledger_append_performed_here"] is False, "template ledger append false")
need(template["wc_issuance_created_here"] is False, "template WC issuance false")
need(template["wc_ledger_write_created_here"] is False, "template WC ledger write false")
need(template["reward_created_here"] is False, "template reward false")
need(template["void_transfer_created_here"] is False, "template VOID transfer false")
need(template["candidate_ledger_line"]["amount"] == 100, "template amount must be 100")
need(template["candidate_ledger_line"]["amount_is_not_approved_here"] is True, "template amount not approved")
need(template["candidate_ledger_line"]["amount_is_not_supply_limit"] is True, "template amount not supply limit")

private = record["private_boundary"]
need(private["operator_only"] is True, "operator-only must be true")
need(private["public_route_created"] is False, "public route must be false")
need(private["public_index_mutated"] is False, "public index mutated must be false")
need(private["root_public_index_mutated"] is False, "root public index mutated must be false")
need(private["wallet_connect_enabled"] is False, "wallet connect must be false")
need(private["server_side_submission_endpoint_created"] is False, "server endpoint must be false")
need(private["runtime_mutation_route_created"] is False, "runtime mutation route must be false")

ll = record["ledger_line_boundary"]
need(ll["ledger_line_candidate_shape_only"] is True, "ledger-line candidate shape only must be true")
need(ll["effective_ledger_line_created"] is False, "effective ledger line must be false")
need(ll["effective_ledger_write_authorization_created"] is False, "effective ledger auth must be false")
need(ll["effective_operator_approval_created"] is False, "effective approval must be false")
need(ll["operator_append_decision_created"] is False, "append decision must be false")
need(ll["award_created"] is False, "award created must be false")
need(ll["award_approved"] is False, "award approved must be false")
need(ll["ledger_write_authorized"] is False, "ledger write authorized must be false")
need(ll["ledger_line_created"] is False, "ledger line created must be false")
need(ll["ledger_append_performed"] is False, "ledger append performed must be false")
need(ll["wc_issuance_created"] is False, "WC issuance must be false")
need(ll["wc_ledger_write_created"] is False, "WC ledger write must be false")
need(ll["reward_created"] is False, "reward must be false")
need(ll["void_transfer_created"] is False, "VOID transfer must be false")

policy = record["work_credit_policy"]
need(policy["wc_supply_policy"] == "unlimited_uncapped_accounting_units_for_useful_verifiable_work", "WC supply policy mismatch")
need(policy["issues_work_credits"] is False, "issues WC must be false")
need(policy["writes_work_credit_ledger"] is False, "writes ledger must be false")
need(policy["creates_award"] is False, "creates award must be false")
need(policy["creates_reward"] is False, "creates reward must be false")
need(policy["creates_void_transfer"] is False, "creates transfer must be false")

safety = record["safety_boundary"]
for key in [
    "work_credits_unlimited_uncapped",
    "no_wc_issuance",
    "no_wc_ledger_write",
    "no_ledger_line_creation",
    "no_ledger_append",
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
    need(safety[key] is True, f"safety boundary failed: {key}")

need(all(marker not in json.dumps(obj) for obj in [wc_index, root_index]), "private marker must not appear in public indices")

print("private_operator_ledger_line_candidate_binding_green=true")
PY

echo "== forbidden public mutation scan =="
if grep -R "$MARKER" public/public-node docs/public-node examples/public-node 2>/dev/null; then
  echo "private_ledger_line_candidate_marker_leaked_to_public_tree=true"
  exit 1
fi
echo "private_ledger_line_candidate_marker_not_in_public_tree_green=true"

echo "== forbidden WC cap wording scan =="
if grep -R "100,000,000 WC\|100000000 WC\|lifetime WC cap\|WC cap" "$DOC" "$SCHEMA" "$EXAMPLE" "$PRIVATE_RECORD"; then
  echo "forbidden_wc_cap_language_found=true"
  exit 1
fi
echo "forbidden_wc_cap_scan_green=true"

echo "== result =="
echo "VOID_DATANET_WC_FIRST_WORK_PACK_PRIVATE_OPERATOR_LEDGER_LINE_CANDIDATE_HOLD_V1_GREEN"
