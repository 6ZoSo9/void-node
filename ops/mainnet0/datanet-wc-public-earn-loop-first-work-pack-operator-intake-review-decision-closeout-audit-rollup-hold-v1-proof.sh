#!/usr/bin/env bash
set -euo pipefail

BRICK="datanet-wc-public-earn-loop-first-work-pack-operator-intake-review-decision-closeout-audit-rollup-hold-v1"
MARKER="VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_OPERATOR_INTAKE_REVIEW_DECISION_CLOSEOUT_AUDIT_ROLLUP_HOLD_V1"
KEY="datanet_wc_public_earn_loop_first_work_pack_operator_intake_review_decision_closeout_audit_rollup"

DECISION_CANDIDATE_MARKER="VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_OPERATOR_INTAKE_REVIEW_DECISION_CANDIDATE_HOLD_V1"
DECISION_EXAMPLE_MARKER="VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_OPERATOR_INTAKE_REVIEW_DECISION_EXAMPLE_HOLD_V1"
OP_REVIEW_EXAMPLE_MARKER="VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_OPERATOR_INTAKE_REVIEW_PACKET_EXAMPLE_HOLD_V1"
PUBLIC_INTAKE_MARKER="VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_PUBLIC_SUBMISSION_INTAKE_PACKET_HOLD_V1"

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
    "$DECISION_CANDIDATE_MARKER",
    "$DECISION_EXAMPLE_MARKER",
    "$OP_REVIEW_EXAMPLE_MARKER",
    "$PUBLIC_INTAKE_MARKER"
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
need(closeout["decision_candidate_exists"] is True, "decision candidate should exist")
need(closeout["decision_example_exists"] is True, "decision example should exist")
need(closeout["decision_options_bound"] == ["accept", "reject", "needs_more_info"], "decision options mismatch")
need(closeout["operator_review_required"] is True, "operator review required must be true")
need(closeout["decision_fixture_created"] is False, "decision fixture must be false")
need(closeout["acceptance_created"] is False, "acceptance must be false")
need(closeout["rejection_created"] is False, "rejection must be false")
need(closeout["needs_more_info_created"] is False, "needs_more_info must be false")
need(closeout["wc_amount_approved"] is False, "WC amount approved must be false")
need(closeout["ledger_write_candidate_created"] is False, "ledger write candidate must be false")
need(closeout["runtime_decision_endpoint_created"] is False, "runtime endpoint must be false")

boundary = record["decision_boundary"]
need(boundary["decision_closeout_only"] is True, "decision closeout only must be true")
need(boundary["decision_fixture_created"] is False, "boundary decision fixture must be false")
need(boundary["acceptance_created"] is False, "boundary acceptance must be false")
need(boundary["rejection_created"] is False, "boundary rejection must be false")
need(boundary["needs_more_info_created"] is False, "boundary needs_more_info must be false")
need(boundary["wc_amount_approved"] is False, "boundary WC amount approved must be false")
need(boundary["ledger_write_candidate_created"] is False, "boundary ledger candidate must be false")
need(boundary["ledger_append_enabled"] is False, "boundary ledger append must be false")

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
need(safety["no_reward_creation"] is True, "no reward creation must be true")
need(safety["no_void_transfer"] is True, "no VOID transfer must be true")
need(safety["no_wallet_connect"] is True, "no wallet connect must be true")
need(safety["no_public_submission_route"] is True, "no public submission route must be true")
need(safety["no_runtime_mutation_route"] is True, "no runtime mutation route must be true")
need(safety["no_secret_material"] is True, "no secret material must be true")

print("operator_intake_review_decision_closeout_binding_green=true")
PY

echo "== forbidden WC cap wording scan =="
if grep -R "100,000,000 WC\|100000000 WC\|lifetime WC cap\|WC cap" "$DOC" "$RECORD" "$WC_INDEX" "$ROOT_INDEX"; then
  echo "forbidden_wc_cap_language_found=true"
  exit 1
fi
echo "forbidden_wc_cap_scan_green=true"

echo "== result =="
echo "VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_OPERATOR_INTAKE_REVIEW_DECISION_CLOSEOUT_AUDIT_ROLLUP_HOLD_V1_GREEN"
