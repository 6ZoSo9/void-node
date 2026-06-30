#!/usr/bin/env bash
set -euo pipefail

BRICK="datanet-wc-public-earn-loop-first-work-pack-wc-award-public-status-closeout-audit-rollup-hold-v1"
MARKER="VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_WC_AWARD_PUBLIC_STATUS_CLOSEOUT_AUDIT_ROLLUP_HOLD_V1"
KEY="datanet_wc_public_earn_loop_first_work_pack_wc_award_public_status_closeout_audit_rollup"

AWARD_STATUS_MARKER="VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_WC_AWARD_PUBLIC_STATUS_ROLLUP_HOLD_V1"
APPROVAL_CLOSEOUT_MARKER="VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_WC_LEDGER_WRITE_APPROVAL_CLOSEOUT_AUDIT_ROLLUP_HOLD_V1"
LEDGER_CLOSEOUT_MARKER="VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_WC_LEDGER_WRITE_CLOSEOUT_AUDIT_ROLLUP_HOLD_V1"
AMOUNT_CLOSEOUT_MARKER="VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_WC_AMOUNT_RECOMMENDATION_CLOSEOUT_AUDIT_ROLLUP_HOLD_V1"
DECISION_CLOSEOUT_MARKER="VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_OPERATOR_INTAKE_REVIEW_DECISION_CLOSEOUT_AUDIT_ROLLUP_HOLD_V1"
PUBLIC_INTAKE_CLOSEOUT_MARKER="VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_PUBLIC_SUBMISSION_INTAKE_CLOSEOUT_AUDIT_ROLLUP_HOLD_V1"
FIRST_PACK_MARKER="VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_HOLD_V1"

DOC="docs/public-node/work-credits/${BRICK}.md"
RECORD="public/public-node/work-credits/${BRICK}.json"
WC_INDEX="public/public-node/work-credits/index.json"
ROOT_INDEX="public/public-node/index.json"

echo "== JSON parse / binding =="
python3 - <<PY
import json
from pathlib import Path

def need(condition, message):
    if not condition:
        raise AssertionError(message)

marker = "$MARKER"
key = "$KEY"
required_markers = [
    "$AWARD_STATUS_MARKER",
    "$APPROVAL_CLOSEOUT_MARKER",
    "$LEDGER_CLOSEOUT_MARKER",
    "$AMOUNT_CLOSEOUT_MARKER",
    "$DECISION_CLOSEOUT_MARKER",
    "$PUBLIC_INTAKE_CLOSEOUT_MARKER",
    "$FIRST_PACK_MARKER"
]

record = json.loads(Path("$RECORD").read_text())
wc_index = json.loads(Path("$WC_INDEX").read_text())
root_index = json.loads(Path("$ROOT_INDEX").read_text())
doc = Path("$DOC").read_text()
blob = json.dumps(record, sort_keys=True)

need(record["marker"] == marker, "record marker mismatch")
need(marker in doc, "marker missing from doc")

for source_marker in required_markers:
    need(source_marker in blob, f"source marker missing from record: {source_marker}")
    need(source_marker in doc, f"source marker missing from doc: {source_marker}")

need(key in wc_index, "WC index key missing")
need(wc_index[key]["marker"] == marker, "WC index marker mismatch")
need(key in root_index, "root index key missing")
need(root_index[key]["marker"] == marker, "root index marker mismatch")

closeout = record["closeout_assertions"]
need(closeout["award_public_status_rollup_exists"] is True, "award public status rollup should exist")
need(closeout["public_status"] == "ready_shape_documented_not_live_award", "public status mismatch")
need(closeout["example_amount_wc"] == 100, "example amount should be 100")
need(closeout["example_amount_is_not_approved_here"] is True, "example amount must not be approved")
need(closeout["example_amount_is_not_supply_limit"] is True, "example amount must not be supply limit")
need(closeout["public_submission_open"] is False, "public submission must be false")
need(closeout["operator_review_required"] is True, "operator review required")
need(closeout["award_created"] is False, "award created must be false")
need(closeout["award_approved"] is False, "award approved must be false")
need(closeout["approval_decision_created"] is False, "approval decision must be false")
need(closeout["ledger_write_authorized"] is False, "ledger authorization must be false")
need(closeout["ledger_write_candidate_instantiated"] is False, "ledger candidate must be false")
need(closeout["ledger_line_created"] is False, "ledger line must be false")
need(closeout["ledger_append_performed"] is False, "ledger append must be false")
need(closeout["wc_issuance_created"] is False, "WC issuance must be false")
need(closeout["wc_ledger_write_created"] is False, "WC ledger write must be false")
need(closeout["reward_created"] is False, "reward must be false")
need(closeout["void_transfer_created"] is False, "VOID transfer must be false")
need(closeout["runtime_award_endpoint_created"] is False, "runtime award endpoint must be false")

award = record["award_boundary"]
need(award["award_public_status_closeout_only"] is True, "award public status closeout only must be true")
need(award["award_created"] is False, "award created must be false")
need(award["award_approved"] is False, "award approved must be false")
need(award["approval_decision_created"] is False, "approval decision must be false")
need(award["ledger_write_authorized"] is False, "ledger authorization must be false")
need(award["ledger_write_candidate_instantiated"] is False, "ledger candidate must be false")
need(award["ledger_line_created"] is False, "ledger line must be false")
need(award["ledger_append_performed"] is False, "ledger append must be false")
need(award["wc_issuance_created"] is False, "WC issuance must be false")
need(award["wc_ledger_write_created"] is False, "WC ledger write must be false")
need(award["reward_created"] is False, "reward must be false")
need(award["void_transfer_created"] is False, "VOID transfer must be false")

policy = record["work_credit_policy"]
need(policy["wc_supply_policy"] == "unlimited_uncapped_accounting_units_for_useful_verifiable_work", "WC supply policy mismatch")
need(policy["issues_work_credits"] is False, "issues_work_credits must be false")
need(policy["writes_work_credit_ledger"] is False, "writes_work_credit_ledger must be false")
need(policy["creates_award"] is False, "creates_award must be false")
need(policy["creates_reward"] is False, "creates_reward must be false")
need(policy["creates_void_transfer"] is False, "creates_void_transfer must be false")

safety = record["safety_boundary"]
need(safety["work_credits_unlimited_uncapped"] is True, "WC unlimited/uncapped must be true")
need(safety["no_wc_issuance"] is True, "no WC issuance must be true")
need(safety["no_wc_ledger_write"] is True, "no WC ledger write must be true")
need(safety["no_ledger_line_creation"] is True, "no ledger line creation must be true")
need(safety["no_ledger_append"] is True, "no ledger append must be true")
need(safety["no_ledger_write_authorization"] is True, "no ledger authorization must be true")
need(safety["no_approval_decision"] is True, "no approval decision must be true")
need(safety["no_award_creation"] is True, "no award creation must be true")
need(safety["no_reward_creation"] is True, "no reward creation must be true")
need(safety["no_void_transfer"] is True, "no VOID transfer must be true")
need(safety["no_wallet_connect"] is True, "no wallet connect must be true")
need(safety["no_public_submission_route"] is True, "no public submission route must be true")
need(safety["no_runtime_mutation_route"] is True, "no runtime mutation route must be true")
need(safety["no_secret_material"] is True, "no secret material must be true")

print("wc_award_public_status_closeout_binding_green=true")
PY

echo "== forbidden WC cap wording scan =="
if grep -R "100,000,000 WC\|100000000 WC\|lifetime WC cap\|WC cap" "$DOC" "$RECORD" "$WC_INDEX" "$ROOT_INDEX"; then
  echo "forbidden_wc_cap_language_found=true"
  exit 1
fi
echo "forbidden_wc_cap_scan_green=true"

echo "== result =="
echo "VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_WC_AWARD_PUBLIC_STATUS_CLOSEOUT_AUDIT_ROLLUP_HOLD_V1_GREEN"
