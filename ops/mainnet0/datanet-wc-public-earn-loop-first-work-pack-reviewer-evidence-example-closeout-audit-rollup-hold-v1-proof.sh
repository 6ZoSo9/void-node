#!/usr/bin/env bash
set -euo pipefail

BRICK="datanet-wc-public-earn-loop-first-work-pack-reviewer-evidence-example-closeout-audit-rollup-hold-v1"
MARKER="VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_REVIEWER_EVIDENCE_EXAMPLE_CLOSEOUT_AUDIT_ROLLUP_HOLD_V1"
KEY="datanet_wc_public_earn_loop_first_work_pack_reviewer_evidence_example_closeout_audit_rollup"

TEMPLATE_MARKER="VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_REVIEWER_EVIDENCE_PACKET_TEMPLATE_HOLD_V1"
TEMPLATE_CLOSEOUT_MARKER="VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_REVIEWER_EVIDENCE_TEMPLATE_CLOSEOUT_AUDIT_ROLLUP_HOLD_V1"
EXAMPLE_MARKER="VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_REVIEWER_EVIDENCE_PACKET_EXAMPLE_HOLD_V1"

RECORD="public/public-node/work-credits/${BRICK}.json"
DOC="docs/public-node/work-credits/${BRICK}.md"
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

template_marker = "$TEMPLATE_MARKER"
template_closeout_marker = "$TEMPLATE_CLOSEOUT_MARKER"
example_marker = "$EXAMPLE_MARKER"

record_path = Path("$RECORD")
doc_path = Path("$DOC")
wc_index_path = Path("$WC_INDEX")
root_index_path = Path("$ROOT_INDEX")

record = json.loads(record_path.read_text())
wc_index = json.loads(wc_index_path.read_text())
root_index = json.loads(root_index_path.read_text())
blob = json.dumps(record, sort_keys=True)

need(record.get("marker") == marker, "record marker mismatch")
need(template_marker in blob, "template marker missing from JSON record")
need(template_closeout_marker in blob, "template closeout marker missing from JSON record")
need(example_marker in blob, "example marker missing from JSON record")

need(key in wc_index, "WC index key missing")
need(wc_index[key].get("marker") == marker, "WC index marker mismatch")
need(key in root_index, "root index key missing")
need(root_index[key].get("marker") == marker, "root index marker mismatch")

doc = doc_path.read_text()
need(marker in doc, "closeout marker missing from doc")
need(template_marker in doc, "template marker missing from doc")
need(template_closeout_marker in doc, "template closeout marker missing from doc")
need(example_marker in doc, "example marker missing from doc")

policy = record["work_credit_policy"]
need(policy["wc_supply_policy"] == "unlimited_uncapped_accounting_units_for_useful_verifiable_work", "WC supply policy mismatch")
need(policy["issues_work_credits"] is False, "issues_work_credits must be false")
need(policy["writes_work_credit_ledger"] is False, "writes_work_credit_ledger must be false")
need(policy["creates_reward"] is False, "creates_reward must be false")
need(policy["creates_void_transfer"] is False, "creates_void_transfer must be false")

submission = record["submission_boundary"]
need(submission["public_submission_open"] is False, "public_submission_open must be false")
need(submission["public_form_route_created"] is False, "public_form_route_created must be false")
need(submission["wallet_connect_enabled"] is False, "wallet_connect_enabled must be false")
need(submission["automatic_scoring_enabled"] is False, "automatic_scoring_enabled must be false")
need(submission["automatic_award_enabled"] is False, "automatic_award_enabled must be false")
need(submission["ledger_append_enabled"] is False, "ledger_append_enabled must be false")

safety = record["safety_boundary"]
need(safety["work_credits_unlimited_uncapped"] is True, "work_credits_unlimited_uncapped must be true")
need(safety["no_wc_issuance"] is True, "no_wc_issuance must be true")
need(safety["no_wc_ledger_write"] is True, "no_wc_ledger_write must be true")
need(safety["no_reward_creation"] is True, "no_reward_creation must be true")
need(safety["no_void_transfer"] is True, "no_void_transfer must be true")
need(safety["no_wallet_connect"] is True, "no_wallet_connect must be true")
need(safety["no_public_submission_route"] is True, "no_public_submission_route must be true")
need(safety["no_runtime_mutation_route"] is True, "no_runtime_mutation_route must be true")

print("evidence_example_closeout_binding_green=true")
PY

echo "== forbidden WC cap wording scan =="
if grep -R "100,000,000 WC\|100000000 WC\|lifetime WC cap\|WC cap" "$RECORD" "$DOC" "$WC_INDEX" "$ROOT_INDEX"; then
  echo "forbidden_wc_cap_language_found=true"
  exit 1
fi
echo "forbidden_wc_cap_scan_green=true"

echo "== result =="
echo "VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_REVIEWER_EVIDENCE_EXAMPLE_CLOSEOUT_AUDIT_ROLLUP_HOLD_V1_GREEN"
