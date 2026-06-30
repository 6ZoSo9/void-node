#!/usr/bin/env bash
set -euo pipefail

BRICK="datanet-wc-public-earn-loop-first-work-pack-operator-intake-review-decision-example-hold-v1"
MARKER="VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_OPERATOR_INTAKE_REVIEW_DECISION_EXAMPLE_HOLD_V1"
KEY="datanet_wc_public_earn_loop_first_work_pack_operator_intake_review_decision_example"

DECISION_CANDIDATE_MARKER="VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_OPERATOR_INTAKE_REVIEW_DECISION_CANDIDATE_HOLD_V1"
OP_REVIEW_EXAMPLE_MARKER="VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_OPERATOR_INTAKE_REVIEW_PACKET_EXAMPLE_HOLD_V1"
PUBLIC_INTAKE_MARKER="VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_PUBLIC_SUBMISSION_INTAKE_PACKET_HOLD_V1"

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
    "$DECISION_CANDIDATE_MARKER",
    "$OP_REVIEW_EXAMPLE_MARKER",
    "$PUBLIC_INTAKE_MARKER"
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

op = record["operator_decision_example"]
need(op["example_decision_packets_created"] is True, "example packets should be true")
need(op["decision_options_demonstrated"] == ["accept", "reject", "needs_more_info"], "decision options mismatch")
need(op["operator_review_required"] is True, "operator review required must be true")
need(op["decision_fixture_created_here"] is False, "decision fixture must be false")
need(op["accepted_here"] is False, "accepted_here must be false")
need(op["rejected_here"] is False, "rejected_here must be false")
need(op["needs_more_info_here"] is False, "needs_more_info_here must be false")
need(op["wc_amount_approved_here"] is False, "WC amount approved must be false")
need(op["ledger_write_candidate_created_here"] is False, "ledger write candidate must be false")
need(op["runtime_decision_endpoint_created"] is False, "runtime endpoint must be false")

examples = record["operator_review_decision_examples"]
expected = {
    "accept_example": "accept",
    "reject_example": "reject",
    "needs_more_info_example": "needs_more_info"
}
for key_name, option in expected.items():
    need(key_name in examples, f"missing {key_name}")
    packet = examples[key_name]
    need(packet["selected_option"] == option, f"{key_name} selected option mismatch")
    need(packet["example_only"] is True, f"{key_name} must be example-only")
    need(packet["decision_fixture_created_here"] is False, f"{key_name} decision fixture must be false")
    need(packet["wc_amount_approved_here"] is False, f"{key_name} WC amount must be false")
    need(packet["ledger_write_candidate_created_here"] is False, f"{key_name} ledger candidate must be false")

boundary = record["decision_boundary"]
need(boundary["decision_example_only"] is True, "decision example only must be true")
need(boundary["decision_fixture_created"] is False, "decision fixture must be false")
need(boundary["acceptance_created"] is False, "acceptance must be false")
need(boundary["rejection_created"] is False, "rejection must be false")
need(boundary["needs_more_info_created"] is False, "needs_more_info must be false")
need(boundary["wc_amount_approved"] is False, "WC amount approved must be false")
need(boundary["ledger_write_candidate_created"] is False, "ledger write candidate must be false")
need(boundary["ledger_append_enabled"] is False, "ledger append must be false")

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

print("operator_intake_review_decision_example_binding_green=true")
PY

echo "== forbidden WC cap wording scan =="
if grep -R "100,000,000 WC\|100000000 WC\|lifetime WC cap\|WC cap" "$DOC" "$SCHEMA" "$EXAMPLE" "$RECORD" "$HTML"; then
  echo "forbidden_wc_cap_language_found=true"
  exit 1
fi
echo "forbidden_wc_cap_scan_green=true"

echo "== result =="
echo "VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_OPERATOR_INTAKE_REVIEW_DECISION_EXAMPLE_HOLD_V1_GREEN"
