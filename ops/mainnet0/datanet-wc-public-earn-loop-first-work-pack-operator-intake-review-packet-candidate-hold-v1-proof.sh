#!/usr/bin/env bash
set -euo pipefail

BRICK="datanet-wc-public-earn-loop-first-work-pack-operator-intake-review-packet-candidate-hold-v1"
MARKER="VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_OPERATOR_INTAKE_REVIEW_PACKET_CANDIDATE_HOLD_V1"
KEY="datanet_wc_public_earn_loop_first_work_pack_operator_intake_review_packet_candidate"

FIRST_PACK_MARKER="VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_HOLD_V1"
PUBLIC_INTAKE_MARKER="VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_PUBLIC_SUBMISSION_INTAKE_PACKET_HOLD_V1"
PUBLIC_INTAKE_CLOSEOUT_MARKER="VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_PUBLIC_SUBMISSION_INTAKE_CLOSEOUT_AUDIT_ROLLUP_HOLD_V1"
REVIEWER_HANDOFF_MARKER="VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_REVIEWER_HANDOFF_PACKET_HOLD_V1"

DOC="docs/public-node/work-credits/${BRICK}.md"
SCHEMA="schemas/public-node/work-credits/${BRICK}.schema.json"
EXAMPLE="examples/public-node/work-credits/${BRICK}.example.json"
RECORD="public/public-node/work-credits/${BRICK}.json"
HTML="public/public-node/work-credits/${BRICK}.html"
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
    "$FIRST_PACK_MARKER",
    "$PUBLIC_INTAKE_MARKER",
    "$PUBLIC_INTAKE_CLOSEOUT_MARKER",
    "$REVIEWER_HANDOFF_MARKER"
]

record = json.loads(Path("$RECORD").read_text())
schema = json.loads(Path("$SCHEMA").read_text())
example = json.loads(Path("$EXAMPLE").read_text())
wc_index = json.loads(Path("$WC_INDEX").read_text())
root_index = json.loads(Path("$ROOT_INDEX").read_text())
doc = Path("$DOC").read_text()
html = Path("$HTML").read_text()
blob = json.dumps(record, sort_keys=True)

need(record["marker"] == marker, "record marker mismatch")
need(schema["properties"]["marker"]["const"] == marker, "schema marker mismatch")
need(example["marker"] == marker, "example marker mismatch")
need(marker in doc, "marker missing from doc")
need(marker in html, "marker missing from html")

for source_marker in required_markers:
    need(source_marker in blob, f"source marker missing from record: {source_marker}")
    need(source_marker in doc, f"source marker missing from doc: {source_marker}")

need(key in wc_index, "WC index key missing")
need(wc_index[key]["marker"] == marker, "WC index marker mismatch")
need(key in root_index, "root index key missing")
need(root_index[key]["marker"] == marker, "root index marker mismatch")

op = record["operator_intake_review"]
need(op["review_packet_candidate_created"] is True, "review packet candidate should be true")
need(op["operator_can_copy_worker_packet_into_review_shape"] is True, "operator copy shape should be true")
need(op["operator_review_required"] is True, "operator review required should be true")
need(op["decision_fixture_created_here"] is False, "decision fixture must be false")
need(op["accept_reject_decision_created_here"] is False, "accept/reject decision must be false")
need(op["ledger_write_candidate_created_here"] is False, "ledger write candidate must be false")
need(op["public_submission_open"] is False, "public submission must be false")
need(op["runtime_review_endpoint_created"] is False, "runtime endpoint must be false")

review = record["review_boundary"]
need(review["operator_review_packet_candidate_only"] is True, "candidate-only must be true")
need(review["decision_fixture_created"] is False, "decision fixture must be false")
need(review["acceptance_created"] is False, "acceptance must be false")
need(review["rejection_created"] is False, "rejection must be false")
need(review["wc_amount_approved"] is False, "WC amount approved must be false")
need(review["ledger_write_candidate_created"] is False, "ledger write candidate must be false")
need(review["ledger_append_enabled"] is False, "ledger append must be false")

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

print("operator_intake_review_packet_candidate_binding_green=true")
PY

echo "== forbidden WC cap wording scan =="
if grep -R "100,000,000 WC\|100000000 WC\|lifetime WC cap\|WC cap" "$DOC" "$SCHEMA" "$EXAMPLE" "$RECORD" "$HTML"; then
  echo "forbidden_wc_cap_language_found=true"
  exit 1
fi
echo "forbidden_wc_cap_scan_green=true"

echo "== result =="
echo "VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_OPERATOR_INTAKE_REVIEW_PACKET_CANDIDATE_HOLD_V1_GREEN"
