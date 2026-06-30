#!/usr/bin/env bash
set -euo pipefail

BRICK="datanet-wc-public-earn-loop-first-work-pack-wc-amount-recommendation-candidate-hold-v1"
MARKER="VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_WC_AMOUNT_RECOMMENDATION_CANDIDATE_HOLD_V1"
KEY="datanet_wc_public_earn_loop_first_work_pack_wc_amount_recommendation_candidate"

DECISION_CLOSEOUT_MARKER="VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_OPERATOR_INTAKE_REVIEW_DECISION_CLOSEOUT_AUDIT_ROLLUP_HOLD_V1"
DECISION_CANDIDATE_MARKER="VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_OPERATOR_INTAKE_REVIEW_DECISION_CANDIDATE_HOLD_V1"
DECISION_EXAMPLE_MARKER="VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_OPERATOR_INTAKE_REVIEW_DECISION_EXAMPLE_HOLD_V1"
FIRST_PACK_MARKER="VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_HOLD_V1"

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
    "$DECISION_CLOSEOUT_MARKER",
    "$DECISION_CANDIDATE_MARKER",
    "$DECISION_EXAMPLE_MARKER",
    "$FIRST_PACK_MARKER"
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

candidate = record["wc_amount_recommendation_candidate"]
need(candidate["amount_recommendation_candidate_created"] is True, "amount recommendation candidate should be true")
need(candidate["requires_accepted_decision"] is True, "accepted decision requirement must be true")
need(candidate["suggested_starter_amount_wc"] == 100, "starter amount should be 100")
need(candidate["suggested_amount_is_not_supply_limit"] is True, "starter amount must not be supply limit")
need(candidate["recommended_amount_approved_here"] is False, "recommended amount approved must be false")
need(candidate["wc_issuance_created_here"] is False, "WC issuance must be false")
need(candidate["wc_ledger_write_created_here"] is False, "WC ledger write must be false")
need(candidate["ledger_write_candidate_created_here"] is False, "ledger write candidate must be false")
need(candidate["void_transfer_created_here"] is False, "VOID transfer must be false")
need(candidate["operator_review_required"] is True, "operator review required must be true")
need(candidate["runtime_recommendation_endpoint_created"] is False, "runtime endpoint must be false")

amount = record["amount_boundary"]
need(amount["amount_recommendation_candidate_only"] is True, "amount candidate only must be true")
need(amount["amount_recommendation_fixture_created"] is False, "amount fixture must be false")
need(amount["wc_amount_approved"] is False, "WC amount approved must be false")
need(amount["wc_issuance_created"] is False, "WC issuance created must be false")
need(amount["wc_ledger_write_created"] is False, "WC ledger write created must be false")
need(amount["ledger_write_candidate_created"] is False, "ledger candidate created must be false")
need(amount["ledger_append_enabled"] is False, "ledger append enabled must be false")
need(amount["void_transfer_created"] is False, "VOID transfer created must be false")

template = record["wc_amount_recommendation_template"]
need(template["recommended_wc_amount"]["suggested_starter_amount"] == 100, "template starter amount mismatch")
need(template["recommended_wc_amount"]["amount_is_recommendation_only"] is True, "template recommendation-only must be true")
need(template["recommended_wc_amount"]["amount_is_not_approved_here"] is True, "template amount not approved must be true")
need(template["recommended_wc_amount"]["amount_is_not_supply_limit"] is True, "template amount not supply limit must be true")
need(template["wc_amount_recommendation_created_here"] is False, "template recommendation fixture must be false")
need(template["wc_amount_approved_here"] is False, "template WC amount approval must be false")
need(template["ledger_write_candidate_created_here"] is False, "template ledger candidate must be false")

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

print("wc_amount_recommendation_candidate_binding_green=true")
PY

echo "== forbidden WC cap wording scan =="
if grep -R "100,000,000 WC\|100000000 WC\|lifetime WC cap\|WC cap" "$DOC" "$SCHEMA" "$EXAMPLE" "$RECORD" "$HTML"; then
  echo "forbidden_wc_cap_language_found=true"
  exit 1
fi
echo "forbidden_wc_cap_scan_green=true"

echo "== result =="
echo "VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_WC_AMOUNT_RECOMMENDATION_CANDIDATE_HOLD_V1_GREEN"
