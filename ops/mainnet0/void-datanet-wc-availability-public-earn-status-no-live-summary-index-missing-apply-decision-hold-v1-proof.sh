#!/usr/bin/env bash
set -euo pipefail

DOC="docs/work-credits/void-datanet-wc-availability-public-earn-status-no-live-summary-index-missing-apply-decision-hold-v1.md"
SCHEMA="fixtures/work-credits/void-datanet-wc-availability-public-earn-status-no-live-summary-index-missing-apply-decision-hold-schema-v1.json"
EXAMPLE="fixtures/work-credits/void-datanet-wc-availability-public-earn-status-no-live-summary-index-missing-apply-decision-hold-example-v1.json"
DRYRUN="fixtures/work-credits/void-datanet-wc-availability-public-earn-status-no-live-summary-index-patch-apply-evaluation-dry-run-hold-example-v1.json"
INDEX_TARGET="public/public-node/work-credits/index.json"
MARKER="VOID_DATANET_WC_AVAILABILITY_PUBLIC_EARN_STATUS_NO_LIVE_SUMMARY_INDEX_MISSING_APPLY_DECISION_HOLD_V1"

fail() {
  echo "void_datanet_wc_availability_public_earn_status_no_live_summary_index_missing_apply_decision_hold_v1_proof=FAIL reason=$1"
  exit 1
}

[ -f "$DOC" ] || fail "missing_doc"
[ -f "$SCHEMA" ] || fail "missing_schema"
[ -f "$EXAMPLE" ] || fail "missing_example"
[ -f "$DRYRUN" ] || fail "missing_source_dry_run"

grep -Fq "$MARKER" "$DOC" || fail "missing_marker_doc"
grep -Fq "$MARKER" "$SCHEMA" || fail "missing_marker_schema"
grep -Fq "$MARKER" "$EXAMPLE" || fail "missing_marker_example"
grep -Fq "This artifact does not create the index." "$DOC" || fail "missing_no_index_create_doc"
grep -Fq "It does not apply the patch." "$DOC" || fail "missing_no_apply_patch_doc"
grep -Fq "It does not publish the candidate listing." "$DOC" || fail "missing_no_publish_doc"

python3 - "$SCHEMA" "$EXAMPLE" "$DRYRUN" "$INDEX_TARGET" <<'PY'
import json
import pathlib
import sys

schema_path, example_path, dryrun_path, index_target = sys.argv[1:]
schema = json.load(open(schema_path, "r", encoding="utf-8"))
example = json.load(open(example_path, "r", encoding="utf-8"))
dryrun = json.load(open(dryrun_path, "r", encoding="utf-8"))
index_path = pathlib.Path(index_target)

marker = "VOID_DATANET_WC_AVAILABILITY_PUBLIC_EARN_STATUS_NO_LIVE_SUMMARY_INDEX_MISSING_APPLY_DECISION_HOLD_V1"
dryrun_marker = "VOID_DATANET_WC_AVAILABILITY_PUBLIC_EARN_STATUS_NO_LIVE_SUMMARY_INDEX_PATCH_APPLY_EVALUATION_DRY_RUN_HOLD_V1"
route = "/public-node/work-credits/datanet-wc-availability/earn-status-card-v1.json"
index_target_expected = "public/public-node/work-credits/index.json"

assert schema["marker"] == marker
assert example["marker"] == marker
assert schema["source_marker"] == dryrun_marker
assert example["source_marker"] == dryrun_marker
assert dryrun["marker"] == dryrun_marker

for field in schema["required_fields"]:
    assert field in example, f"missing example field: {field}"

for field in schema["forbidden_public_fields"]:
    assert field not in example, f"forbidden public field present: {field}"

entry = example["proposed_index_entry"]
dryrun_entry = dryrun["proposed_index_entry"]
for field in schema["proposed_index_entry_required_fields"]:
    assert field in entry, f"missing proposed index entry field: {field}"

assert example["packet_kind"] == schema["packet_kind"]
assert example["apply_decision_status"] == "held_missing_public_index_requires_separate_index_creation_policy"
assert example["apply_decision_status"] in schema["allowed_apply_decision_status"]
assert example["decision_result"] == "do_not_apply_patch"
assert example["required_next_gate"] == "separate_public_index_creation_policy_or_existing_index_required"

assert dryrun["public_index_exists"] is False
assert index_path.exists() is False
assert example["source_public_index_exists"] is False
assert example["source_public_index_exists"] == dryrun["public_index_exists"]
assert example["source_evaluation_status"] == dryrun["evaluation_status"] == "candidate_shape_valid_index_unchanged_duplicate_route_pending_operator_review"
assert example["source_duplicate_route_check_status"] == dryrun["duplicate_route_check_status"] == "public_index_missing_route_check_not_performed"
assert example["source_candidate_shape_check_status"] == dryrun["candidate_shape_check_status"] == "candidate_shape_valid"

assert example["proposed_public_index_target"] == schema["proposed_public_index_target"] == dryrun["proposed_public_index_target"] == index_target_expected
assert entry["route"] == schema["proposed_index_entry_route"] == dryrun_entry["route"] == route
assert entry["title"] == dryrun_entry["title"]
assert entry["status"] == dryrun_entry["status"] == "static_card_exists_local_runtime_not_observed_no_live_claim"

assert example["public_index_creation_status"] == "not_created"
assert example["public_index_mutation_status"] == "not_mutated"
assert example["public_index_file_write_status"] == "not_written"
assert example["listing_publication_status"] == "not_published"
assert example["listing_live_claim"] is False
assert example["route_registry_mutation_status"] == "not_mutated"
assert example["runtime_route_status"] == "not_added"
assert example["runtime_live_claim"] is False
assert example["runtime_route_observed"] is False
assert example["wc_issuance_status"] == "not_issued"
assert example["wc_ledger_write_status"] == "not_written"
assert example["execute_gate_status"] == "held_execute_gate_closed"

assert dryrun["public_index_mutation_status"] == "not_mutated"
assert dryrun["public_index_file_write_status"] == "not_written"
assert dryrun["patch_apply_status"] == "not_applied"
assert dryrun["listing_publication_status"] == "not_published"
assert dryrun["listing_live_claim"] is False
assert dryrun["runtime_live_claim"] is False
assert dryrun["runtime_route_observed"] is False
assert dryrun["wc_issuance_status"] == "not_issued"
assert dryrun["wc_ledger_write_status"] == "not_written"

for key in ["runtime_live_claim", "runtime_route_observed"]:
    assert entry[key] is False
    assert dryrun_entry[key] is False

for key in ["wc_issuance_status", "wc_ledger_write_status", "execute_gate_status"]:
    assert entry[key] == dryrun_entry[key]

for section, keys in [
    ("public_safety_boundary", schema["public_safety_boundary_required_false"]),
    ("index_missing_decision_boundary", schema["index_missing_decision_boundary_required_false"]),
    ("index_creation_boundary", schema["index_creation_boundary_required_false"]),
    ("index_patch_boundary", schema["index_patch_boundary_required_false"]),
    ("runtime_boundary", schema["runtime_boundary_required_false"]),
    ("route_boundary", schema["route_boundary_required_false"]),
    ("wc_boundary", schema["wc_boundary_required_false"]),
    ("authority_boundary", schema["authority_boundary_required_false"])
]:
    for key in keys:
        assert example[section][key] is False, f"{section}.{key} not false"

print("schema_json_green=true")
print("example_json_green=true")
print("source_dry_run_binding_green=true")
print("actual_public_index_absent_green=true")
print("decision_hold_green=true")
print("public_index_not_created_not_mutated_green=true")
print("public_safety_boundary_green=true")
print("wc_no_issuance_no_ledger_write_green=true")
PY

if [ -e "$INDEX_TARGET" ]; then
  ls -l "$INDEX_TARGET"
  fail "public_index_target_exists_unexpectedly"
fi

if [ -n "$(git diff --name-only -- "$INDEX_TARGET" || true)" ]; then
  git diff --name-only -- "$INDEX_TARGET"
  fail "public_index_has_worktree_diff"
fi

if [ -n "$(git status --short -- "$INDEX_TARGET" || true)" ]; then
  git status --short -- "$INDEX_TARGET"
  fail "public_index_has_status_change"
fi

if grep -R "creates_public_index.*true\|applies_patch.*true\|applies_diff.*true\|mutates_public_index.*true\|writes_public_index_file.*true\|activates_public_index.*true\|publishes_listing.*true\|claims_listing_live.*true\|activates_public_discovery.*true\|claims_route_live.*true\|performs_runtime_request.*true\|starts_service.*true\|restarts_service.*true\|adds_runtime_route.*true\|changes_runtime_behavior.*true\|mutates_route_registry.*true\|activates_public_mutation.*true\|issues_work_credits.*true\|writes_wc_ledger.*true\|creates_ledger_line.*true\|appends_to_ledger_file.*true\|allocates_void.*true\|transfers_void.*true\|approves_ledger_write.*true\|executes_ledger_write.*true\|authorizes_ledger_write_execution.*true\|opens_execute_gate.*true\|grants_signer_wallet_access.*true\|moves_funds.*true\|exposes_private_objects.*true" "$DOC" "$SCHEMA" "$EXAMPLE" >/tmp/void_wc_no_live_summary_index_missing_apply_decision_forbidden_true.txt; then
  cat /tmp/void_wc_no_live_summary_index_missing_apply_decision_forbidden_true.txt
  fail "forbidden_true_flag"
fi

echo "void_datanet_wc_availability_public_earn_status_no_live_summary_index_missing_apply_decision_hold_v1_proof=GREEN marker=$MARKER"
