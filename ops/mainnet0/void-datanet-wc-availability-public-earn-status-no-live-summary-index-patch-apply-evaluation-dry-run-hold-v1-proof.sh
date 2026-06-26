#!/usr/bin/env bash
set -euo pipefail

DOC="docs/work-credits/void-datanet-wc-availability-public-earn-status-no-live-summary-index-patch-apply-evaluation-dry-run-hold-v1.md"
SCHEMA="fixtures/work-credits/void-datanet-wc-availability-public-earn-status-no-live-summary-index-patch-apply-evaluation-dry-run-hold-schema-v1.json"
EXAMPLE="fixtures/work-credits/void-datanet-wc-availability-public-earn-status-no-live-summary-index-patch-apply-evaluation-dry-run-hold-example-v1.json"
PREFLIGHT="fixtures/work-credits/void-datanet-wc-availability-public-earn-status-no-live-summary-index-patch-apply-preflight-hold-example-v1.json"
INDEX_TARGET="public/public-node/work-credits/index.json"
MARKER="VOID_DATANET_WC_AVAILABILITY_PUBLIC_EARN_STATUS_NO_LIVE_SUMMARY_INDEX_PATCH_APPLY_EVALUATION_DRY_RUN_HOLD_V1"

fail() {
  echo "void_datanet_wc_availability_public_earn_status_no_live_summary_index_patch_apply_evaluation_dry_run_hold_v1_proof=FAIL reason=$1"
  exit 1
}

[ -f "$DOC" ] || fail "missing_doc"
[ -f "$SCHEMA" ] || fail "missing_schema"
[ -f "$EXAMPLE" ] || fail "missing_example"
[ -f "$PREFLIGHT" ] || fail "missing_source_apply_preflight"

grep -Fq "$MARKER" "$DOC" || fail "missing_marker_doc"
grep -Fq "$MARKER" "$SCHEMA" || fail "missing_marker_schema"
grep -Fq "$MARKER" "$EXAMPLE" || fail "missing_marker_example"
grep -Fq "It does not modify \`public/public-node/work-credits/index.json\`." "$DOC" || fail "missing_no_index_modify_doc"
grep -Fq "It does not publish the candidate listing." "$DOC" || fail "missing_no_publish_doc"

python3 - "$SCHEMA" "$EXAMPLE" "$PREFLIGHT" "$INDEX_TARGET" <<'PY'
import json
import pathlib
import sys

schema_path, example_path, preflight_path, index_target = sys.argv[1:]
schema = json.load(open(schema_path, "r", encoding="utf-8"))
example = json.load(open(example_path, "r", encoding="utf-8"))
preflight = json.load(open(preflight_path, "r", encoding="utf-8"))
index_path = pathlib.Path(index_target)

marker = "VOID_DATANET_WC_AVAILABILITY_PUBLIC_EARN_STATUS_NO_LIVE_SUMMARY_INDEX_PATCH_APPLY_EVALUATION_DRY_RUN_HOLD_V1"
preflight_marker = "VOID_DATANET_WC_AVAILABILITY_PUBLIC_EARN_STATUS_NO_LIVE_SUMMARY_INDEX_PATCH_APPLY_PREFLIGHT_HOLD_V1"
route = "/public-node/work-credits/datanet-wc-availability/earn-status-card-v1.json"
index_target_expected = "public/public-node/work-credits/index.json"

assert schema["marker"] == marker
assert example["marker"] == marker
assert schema["source_marker"] == preflight_marker
assert example["source_marker"] == preflight_marker
assert preflight["marker"] == preflight_marker

for field in schema["required_fields"]:
    assert field in example, f"missing example field: {field}"

for field in schema["forbidden_public_fields"]:
    assert field not in example, f"forbidden public field present: {field}"

entry = example["proposed_index_entry"]
preflight_entry = preflight["proposed_index_entry"]
for field in schema["proposed_index_entry_required_fields"]:
    assert field in entry, f"missing proposed index entry field: {field}"

assert example["packet_kind"] == schema["packet_kind"]
assert example["source_apply_preflight_status"] == preflight["apply_preflight_status"] == "ready_for_future_separate_apply_evaluation"
assert example["source_patch_apply_status"] == preflight["patch_apply_status"] == "not_applied"
assert example["patch_apply_status"] == "not_applied"

assert example["proposed_public_index_target"] == schema["proposed_public_index_target"] == preflight["proposed_public_index_target"] == index_target_expected
assert entry["route"] == schema["proposed_index_entry_route"] == preflight_entry["route"] == route
assert entry["title"] == preflight_entry["title"]
assert entry["status"] == preflight_entry["status"] == "static_card_exists_local_runtime_not_observed_no_live_claim"

actual_index_exists = index_path.exists()
assert example["public_index_exists"] is actual_index_exists

if actual_index_exists:
    index_text = index_path.read_text(encoding="utf-8")
    if route in index_text:
        assert example["duplicate_route_check_status"] == "candidate_route_already_present_requires_operator_review"
        assert example["evaluation_status"] == "candidate_shape_valid_index_unchanged_duplicate_route_pending_operator_review"
    else:
        assert example["duplicate_route_check_status"] == "candidate_route_absent_from_index"
        assert example["evaluation_status"] == "candidate_shape_valid_index_unchanged_candidate_route_absent"
else:
    assert example["duplicate_route_check_status"] == "public_index_missing_route_check_not_performed"
    assert example["evaluation_status"] == "candidate_shape_valid_index_unchanged_duplicate_route_pending_operator_review"

assert example["candidate_shape_check_status"] == "candidate_shape_valid"
assert example["public_index_worktree_status"] == "unchanged_required"
assert example["public_index_write_status"] == "not_written"
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

for key in ["runtime_live_claim", "runtime_route_observed"]:
    assert entry[key] is False
    assert preflight_entry[key] is False

for key in ["wc_issuance_status", "wc_ledger_write_status", "execute_gate_status"]:
    assert entry[key] == preflight_entry[key]

assert preflight["public_index_mutation_status"] == "not_mutated"
assert preflight["public_index_file_write_status"] == "not_written"
assert preflight["patch_apply_status"] == "not_applied"
assert preflight["runtime_live_claim"] is False
assert preflight["runtime_route_observed"] is False
assert preflight["wc_issuance_status"] == "not_issued"
assert preflight["wc_ledger_write_status"] == "not_written"

for section, keys in [
    ("public_safety_boundary", schema["public_safety_boundary_required_false"]),
    ("evaluation_dry_run_boundary", schema["evaluation_dry_run_boundary_required_false"]),
    ("apply_preflight_boundary", schema["apply_preflight_boundary_required_false"]),
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
print("source_apply_preflight_binding_green=true")
print("candidate_shape_valid_green=true")
print(f"public_index_exists_actual={str(actual_index_exists).lower()}")
print("public_index_not_mutated_green=true")
print("evaluation_dry_run_boundary_green=true")
print("public_safety_boundary_green=true")
print("wc_no_issuance_no_ledger_write_green=true")
PY

if [ -n "$(git diff --name-only -- "$INDEX_TARGET" || true)" ]; then
  git diff --name-only -- "$INDEX_TARGET"
  fail "public_index_has_worktree_diff"
fi

if [ -n "$(git status --short -- "$INDEX_TARGET" || true)" ]; then
  git status --short -- "$INDEX_TARGET"
  fail "public_index_has_status_change"
fi

if grep -R "applies_patch.*true\|applies_diff.*true\|mutates_public_index.*true\|writes_public_index_file.*true\|publishes_listing.*true\|claims_listing_live.*true\|activates_public_discovery.*true\|claims_route_live.*true\|performs_runtime_request.*true\|starts_service.*true\|restarts_service.*true\|adds_runtime_route.*true\|changes_runtime_behavior.*true\|mutates_route_registry.*true\|activates_public_mutation.*true\|issues_work_credits.*true\|writes_wc_ledger.*true\|creates_ledger_line.*true\|appends_to_ledger_file.*true\|allocates_void.*true\|transfers_void.*true\|approves_ledger_write.*true\|executes_ledger_write.*true\|authorizes_ledger_write_execution.*true\|opens_execute_gate.*true\|grants_signer_wallet_access.*true\|moves_funds.*true\|exposes_private_objects.*true" "$DOC" "$SCHEMA" "$EXAMPLE" >/tmp/void_wc_no_live_summary_index_patch_apply_evaluation_dry_run_forbidden_true.txt; then
  cat /tmp/void_wc_no_live_summary_index_patch_apply_evaluation_dry_run_forbidden_true.txt
  fail "forbidden_true_flag"
fi

echo "void_datanet_wc_availability_public_earn_status_no_live_summary_index_patch_apply_evaluation_dry_run_hold_v1_proof=GREEN marker=$MARKER"
