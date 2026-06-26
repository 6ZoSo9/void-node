#!/usr/bin/env bash

DOC="docs/work-credits/void-datanet-wc-availability-duplicate-guard-v1.md"
SCHEMA="fixtures/work-credits/void-datanet-wc-availability-duplicate-guard-schema-v1.json"
EXAMPLE="fixtures/work-credits/void-datanet-wc-availability-duplicate-guard-example-v1.json"
MARKER="VOID_DATANET_WC_AVAILABILITY_DUPLICATE_GUARD_V1"

fail() {
  echo "void_datanet_wc_availability_duplicate_guard_v1_proof=FAIL reason=$1"
  exit 1
}

[ -f "$DOC" ] || fail "missing_doc"
[ -f "$SCHEMA" ] || fail "missing_schema"
[ -f "$EXAMPLE" ] || fail "missing_example"

grep -Fq "$MARKER" "$DOC" || fail "missing_marker_doc"
grep -Fq "$MARKER" "$SCHEMA" || fail "missing_marker_schema"
grep -Fq "$MARKER" "$EXAMPLE" || fail "missing_marker_example"

grep -Fq "Duplicate-guard/proof-only; no WC issuance." "$DOC" || fail "missing_status"
grep -Fq "This guard does not issue Work Credits by itself." "$DOC" || fail "missing_no_issue_clause"
grep -Fq "A later WC ledger write packet would still be required before any Work Credits exist." "$DOC" || fail "missing_later_ledger_boundary"

grep -Fq "write a duplicate registry" "$DOC" || fail "missing_no_duplicate_registry_write_doc"
grep -Fq "mutate claim state" "$DOC" || fail "missing_no_claim_mutation_doc"
grep -Fq "automatically reject a claim" "$DOC" || fail "missing_no_auto_reject_doc"
grep -Fq "issue Work Credits" "$DOC" || fail "missing_no_wc_issue_doc"
grep -Fq "write the WC ledger" "$DOC" || fail "missing_no_wc_ledger_doc"
grep -Fq "allocate VOID" "$DOC" || fail "missing_no_void_allocation_doc"
grep -Fq "transfer VOID" "$DOC" || fail "missing_no_void_transfer_doc"
grep -Fq "activate public mutation" "$DOC" || fail "missing_no_public_mutation_doc"
grep -Fq "grant signer or wallet access" "$DOC" || fail "missing_no_signer_wallet_doc"
grep -Fq "authorize execution" "$DOC" || fail "missing_no_execution_doc"

python3 - "$SCHEMA" "$EXAMPLE" <<'PY'
import json
import sys

schema_path, example_path = sys.argv[1], sys.argv[2]
schema = json.load(open(schema_path, "r", encoding="utf-8"))
example = json.load(open(example_path, "r", encoding="utf-8"))

marker = "VOID_DATANET_WC_AVAILABILITY_DUPLICATE_GUARD_V1"
assert schema["marker"] == marker
assert example["marker"] == marker
assert schema["status"] == "duplicate_guard_proof_only_no_wc_issuance"
assert example["packet_kind"] == schema["packet_kind"]

up = schema["upstream_markers"]
assert example["evidence_packet_marker"] == up["evidence_packet_marker"]
assert example["reviewer_decision_marker"] == up["reviewer_decision_marker"]
assert example["award_recommendation_marker"] == up["award_recommendation_marker"]

for field in schema["required_fields"]:
    assert field in example, f"missing required field: {field}"

assert example["duplicate_guard_result"] in schema["allowed_duplicate_guard_results"]
assert example["proposed_uniqueness_key"].startswith("sha256:")
assert example["claimed_work_actions_hash"].startswith("sha256:")

for key in schema["duplicate_boundary_required_false"]:
    assert example["duplicate_boundary"][key] is False, f"duplicate boundary not false: {key}"

for key in schema["wc_boundary_required_false"]:
    assert example["wc_boundary"][key] is False, f"wc boundary not false: {key}"

for key in schema["authority_boundary_required_false"]:
    assert example["authority_boundary"][key] is False, f"authority boundary not false: {key}"

print("schema_json_green=true")
print("example_duplicate_guard_green=true")
PY

if grep -R "writes_duplicate_registry.*true\|mutates_claim_state.*true\|automatically_rejects_claim.*true\|issues_work_credits.*true\|writes_wc_ledger.*true\|allocates_void.*true\|transfers_void.*true\|automatic_reward.*true\|activates_public_mutation.*true\|grants_signer_wallet_access.*true\|authorizes_execution.*true\|moves_funds.*true" "$SCHEMA" "$EXAMPLE" "$DOC" >/tmp/void_datanet_wc_duplicate_guard_forbidden_true.txt; then
  cat /tmp/void_datanet_wc_duplicate_guard_forbidden_true.txt
  fail "forbidden_true_flag"
fi

echo "void_datanet_wc_availability_duplicate_guard_v1_proof=GREEN marker=$MARKER"
