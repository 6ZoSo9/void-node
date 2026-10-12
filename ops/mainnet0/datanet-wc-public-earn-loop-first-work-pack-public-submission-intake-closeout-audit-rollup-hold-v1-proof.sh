#!/usr/bin/env bash
set -euo pipefail

BRICK="datanet-wc-public-earn-loop-first-work-pack-public-submission-intake-closeout-audit-rollup-hold-v1"
MARKER="VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_PUBLIC_SUBMISSION_INTAKE_CLOSEOUT_AUDIT_ROLLUP_HOLD_V1"
KEY="datanet_wc_public_earn_loop_first_work_pack_public_submission_intake_closeout_audit_rollup"

INTAKE_MARKER="VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_PUBLIC_SUBMISSION_INTAKE_PACKET_HOLD_V1"
EVIDENCE_EXAMPLE_CLOSEOUT_MARKER="VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_REVIEWER_EVIDENCE_EXAMPLE_CLOSEOUT_AUDIT_ROLLUP_HOLD_V1"

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
intake_marker = "$INTAKE_MARKER"
evidence_example_closeout_marker = "$EVIDENCE_EXAMPLE_CLOSEOUT_MARKER"

record = json.loads(Path("$RECORD").read_text())
wc_index = json.loads(Path("$WC_INDEX").read_text())
root_index = json.loads(Path("$ROOT_INDEX").read_text())
doc = Path("$DOC").read_text()
blob = json.dumps(record, sort_keys=True)

need(record["marker"] == marker, "record marker mismatch")
need(intake_marker in blob, "intake marker missing from record")
need(evidence_example_closeout_marker in blob, "evidence example closeout marker missing from record")
need(marker in doc, "marker missing from doc")
need(intake_marker in doc, "intake marker missing from doc")
need(evidence_example_closeout_marker in doc, "evidence example closeout marker missing from doc")

need(key in wc_index, "WC index key missing")
need(wc_index[key]["marker"] == marker, "WC index marker mismatch")
need(key in root_index, "root index key missing")
need(root_index[key]["marker"] == marker, "root index marker mismatch")

closeout = record["closeout_assertions"]
need(closeout["public_submission_intake_packet_exists"] is True, "intake packet should exist")
need(closeout["worker_can_prepare_packet"] is True, "worker packet prep should be true")
need(closeout["operator_review_required"] is True, "operator review required should be true")
need(closeout["public_submission_open"] is False, "public submission must be false")
need(closeout["public_form_route_created"] is False, "public form route must be false")
need(closeout["server_side_submission_endpoint_created"] is False, "server endpoint must be false")

policy = record["work_credit_policy"]
need(policy["wc_supply_policy"] == "unlimited_uncapped_accounting_units_for_useful_verifiable_work", "WC supply policy mismatch")
need(policy["issues_work_credits"] is False, "issues_work_credits must be false")
need(policy["writes_work_credit_ledger"] is False, "writes_work_credit_ledger must be false")
need(policy["creates_reward"] is False, "creates_reward must be false")
need(policy["creates_void_transfer"] is False, "creates_void_transfer must be false")

submission = record["submission_boundary"]
need(submission["public_submission_open"] is False, "submission public_submission_open must be false")
need(submission["public_form_route_created"] is False, "public form route must be false")
need(submission["server_side_submission_endpoint_created"] is False, "server endpoint must be false")
need(submission["wallet_connect_enabled"] is False, "wallet connect must be false")
need(submission["automatic_scoring_enabled"] is False, "automatic scoring must be false")
need(submission["automatic_award_enabled"] is False, "automatic award must be false")
need(submission["ledger_append_enabled"] is False, "ledger append must be false")
need(submission["operator_review_required"] is True, "operator review required must be true")

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

print("public_submission_intake_closeout_binding_green=true")
PY

echo "== forbidden WC cap wording scan =="
if grep -R "100,000,000 WC\|100000000 WC\|lifetime WC cap\|WC cap" "$DOC" "$RECORD" "$WC_INDEX" "$ROOT_INDEX"; then
  echo "forbidden_wc_cap_language_found=true"
  exit 1
fi
echo "forbidden_wc_cap_scan_green=true"

echo "== result =="
echo "VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_PUBLIC_SUBMISSION_INTAKE_CLOSEOUT_AUDIT_ROLLUP_HOLD_V1_GREEN"
