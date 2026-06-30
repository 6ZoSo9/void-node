#!/usr/bin/env bash
set -euo pipefail

BRICK="datanet-wc-public-earn-loop-first-work-pack-wc-ledger-write-approval-closeout-audit-rollup-hold-v1"
MARKER="VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_WC_LEDGER_WRITE_APPROVAL_CLOSEOUT_AUDIT_ROLLUP_HOLD_V1"
KEY="datanet_wc_public_earn_loop_first_work_pack_wc_ledger_write_approval_closeout_audit_rollup"

APPROVAL_CANDIDATE_MARKER="VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_WC_LEDGER_WRITE_APPROVAL_CANDIDATE_HOLD_V1"
APPROVAL_EXAMPLE_MARKER="VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_WC_LEDGER_WRITE_APPROVAL_EXAMPLE_HOLD_V1"
LEDGER_CLOSEOUT_MARKER="VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_WC_LEDGER_WRITE_CLOSEOUT_AUDIT_ROLLUP_HOLD_V1"
LEDGER_CANDIDATE_MARKER="VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_WC_LEDGER_WRITE_CANDIDATE_HOLD_V1"
LEDGER_EXAMPLE_MARKER="VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_WC_LEDGER_WRITE_CANDIDATE_EXAMPLE_HOLD_V1"
AMOUNT_CLOSEOUT_MARKER="VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_WC_AMOUNT_RECOMMENDATION_CLOSEOUT_AUDIT_ROLLUP_HOLD_V1"
DECISION_CLOSEOUT_MARKER="VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_OPERATOR_INTAKE_REVIEW_DECISION_CLOSEOUT_AUDIT_ROLLUP_HOLD_V1"
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
    "$APPROVAL_CANDIDATE_MARKER",
    "$APPROVAL_EXAMPLE_MARKER",
    "$LEDGER_CLOSEOUT_MARKER",
    "$LEDGER_CANDIDATE_MARKER",
    "$LEDGER_EXAMPLE_MARKER",
    "$AMOUNT_CLOSEOUT_MARKER",
    "$DECISION_CLOSEOUT_MARKER",
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
need(closeout["approval_candidate_shape_exists"] is True, "approval candidate should exist")
need(closeout["approval_example_exists"] is True, "approval example should exist")
need(closeout["requires_future_ledger_write_candidate"] is True, "future ledger candidate required")
need(closeout["requires_future_approved_wc_amount"] is True, "future approved amount required")
need(closeout["requires_operator_final_review"] is True, "operator final review required")
need(closeout["example_amount_wc"] == 100, "example amount should be 100")
need(closeout["example_amount_is_not_approved_here"] is True, "example amount not approved")
need(closeout["example_amount_is_not_supply_limit"] is True, "example amount not supply limit")
need(closeout["approval_decision_created"] is False, "approval decision must be false")
need(closeout["ledger_write_authorized"] is False, "ledger authorization must be false")
need(closeout["ledger_write_candidate_instantiated"] is False, "ledger candidate instantiated must be false")
need(closeout["ledger_line_created"] is False, "ledger line must be false")
need(closeout["ledger_append_performed"] is False, "ledger append must be false")
need(closeout["wc_issuance_created"] is False, "WC issuance must be false")
need(closeout["wc_ledger_write_created"] is False, "WC ledger write must be false")
need(closeout["reward_created"] is False, "reward must be false")
need(closeout["void_transfer_created"] is False, "VOID transfer must be false")
need(closeout["runtime_ledger_endpoint_created"] is False, "runtime endpoint must be false")

approval = record["approval_boundary"]
need(approval["approval_closeout_only"] is True, "approval closeout only must be true")
need(approval["approval_decision_created"] is False, "approval decision created must be false")
need(approval["ledger_write_authorized"] is False, "ledger write authorized must be false")
need(approval["ledger_write_candidate_instantiated"] is False, "ledger candidate instantiated must be false")
need(approval["ledger_line_created"] is False, "ledger line created must be false")
need(approval["ledger_append_performed"] is False, "ledger append performed must be false")
need(approval["wc_issuance_created"] is False, "WC issuance created must be false")
need(approval["wc_ledger_write_created"] is False, "WC ledger write created must be false")
need(approval["reward_created"] is False, "reward created must be false")
need(approval["void_transfer_created"] is False, "VOID transfer created must be false")

policy = record["work_credit_policy"]
need(policy["wc_supply_policy"] == "unlimited_uncapped_accounting_units_for_useful_verifiable_work", "WC supply policy mismatch")
need(policy["issues_work_credits"] is False, "issues_work_credits must be false")
need(policy["writes_work_credit_ledger"] is False, "writes_work_credit_ledger must be false")
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
need(safety["no_reward_creation"] is True, "no reward creation must be true")
need(safety["no_void_transfer"] is True, "no VOID transfer must be true")
need(safety["no_wallet_connect"] is True, "no wallet connect must be true")
need(safety["no_public_submission_route"] is True, "no public submission route must be true")
need(safety["no_runtime_mutation_route"] is True, "no runtime mutation route must be true")
need(safety["no_secret_material"] is True, "no secret material must be true")

print("wc_ledger_write_approval_closeout_binding_green=true")
PY

echo "== forbidden WC cap wording scan =="
if grep -R "100,000,000 WC\|100000000 WC\|lifetime WC cap\|WC cap" "$DOC" "$RECORD" "$WC_INDEX" "$ROOT_INDEX"; then
  echo "forbidden_wc_cap_language_found=true"
  exit 1
fi
echo "forbidden_wc_cap_scan_green=true"

echo "== result =="
echo "VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_WC_LEDGER_WRITE_APPROVAL_CLOSEOUT_AUDIT_ROLLUP_HOLD_V1_GREEN"
