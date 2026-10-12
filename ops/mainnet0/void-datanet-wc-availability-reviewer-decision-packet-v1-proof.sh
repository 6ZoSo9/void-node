#!/usr/bin/env bash

DOC="docs/work-credits/void-datanet-wc-availability-reviewer-decision-packet-v1.md"
SCHEMA="fixtures/work-credits/void-datanet-wc-availability-reviewer-decision-packet-schema-v1.json"
EXAMPLE="fixtures/work-credits/void-datanet-wc-availability-reviewer-decision-packet-example-v1.json"
MARKER="VOID_DATANET_WC_AVAILABILITY_REVIEWER_DECISION_PACKET_V1"

fail() {
  echo "void_datanet_wc_availability_reviewer_decision_packet_v1_proof=FAIL reason=$1"
  exit 1
}

[ -f "$DOC" ] || fail "missing_doc"
[ -f "$SCHEMA" ] || fail "missing_schema"
[ -f "$EXAMPLE" ] || fail "missing_example"

grep -Fq "$MARKER" "$DOC" || fail "missing_marker_doc"
grep -Fq "$MARKER" "$SCHEMA" || fail "missing_marker_schema"
grep -Fq "$MARKER" "$EXAMPLE" || fail "missing_marker_example"

grep -Fq "Reviewer-decision/proof-only; no WC issuance." "$DOC" || fail "missing_status"
grep -Fq "This packet does not award Work Credits by itself." "$DOC" || fail "missing_no_award_clause"
grep -Fq "Only \`approved_for_wc_review\` may feed a later separate WC award recommendation packet." "$DOC" || fail "missing_later_award_boundary"

grep -Fq "it does not issue WC" "$DOC" || fail "missing_no_wc_issue_doc"
grep -Fq "it does not write the WC ledger" "$DOC" || fail "missing_no_wc_ledger_doc"
grep -Fq "it does not allocate or transfer VOID" "$DOC" || fail "missing_no_void_doc"
grep -Fq "it does not activate public mutation" "$DOC" || fail "missing_no_public_mutation_doc"
grep -Fq "it does not grant signer or wallet access" "$DOC" || fail "missing_no_signer_wallet_doc"
grep -Fq "it does not authorize execution" "$DOC" || fail "missing_no_execution_doc"

python3 - "$SCHEMA" "$EXAMPLE" <<'PY'
import json
import sys

schema_path, example_path = sys.argv[1], sys.argv[2]
schema = json.load(open(schema_path, "r", encoding="utf-8"))
example = json.load(open(example_path, "r", encoding="utf-8"))

marker = "VOID_DATANET_WC_AVAILABILITY_REVIEWER_DECISION_PACKET_V1"
assert schema["marker"] == marker
assert example["marker"] == marker
assert schema["status"] == "reviewer_decision_proof_only_no_wc_issuance"
assert example["packet_kind"] == schema["packet_kind"]
assert example["evidence_packet_kind"] == schema["evidence_packet_kind"]
assert example["evidence_packet_marker"] == schema["evidence_packet_marker"]

for field in schema["required_fields"]:
    assert field in example, f"missing required field: {field}"

assert example["decision"] in schema["allowed_decisions"]

checks = example["reviewer_checks"]
for check in schema["required_reviewer_checks"]:
    assert checks.get(check) is True, f"reviewer check not true: {check}"

for key in schema["wc_boundary_required_false"]:
    assert example["wc_boundary"][key] is False, f"wc boundary not false: {key}"

for key in schema["authority_boundary_required_false"]:
    assert example["authority_boundary"][key] is False, f"authority boundary not false: {key}"

assert example["decision"] == "approved_for_wc_review"
assert example["wc_boundary"]["issues_work_credits"] is False
assert example["wc_boundary"]["writes_wc_ledger"] is False

print("schema_json_green=true")
print("example_decision_packet_green=true")
PY

if grep -R "issues_work_credits.*true\|writes_wc_ledger.*true\|allocates_void.*true\|transfers_void.*true\|automatic_reward.*true\|bypasses_reviewer_approval.*true\|activates_public_mutation.*true\|grants_signer_wallet_access.*true\|authorizes_execution.*true\|moves_funds.*true" "$SCHEMA" "$EXAMPLE" "$DOC" >/tmp/void_datanet_wc_reviewer_decision_forbidden_true.txt; then
  cat /tmp/void_datanet_wc_reviewer_decision_forbidden_true.txt
  fail "forbidden_true_flag"
fi

echo "void_datanet_wc_availability_reviewer_decision_packet_v1_proof=GREEN marker=$MARKER"
