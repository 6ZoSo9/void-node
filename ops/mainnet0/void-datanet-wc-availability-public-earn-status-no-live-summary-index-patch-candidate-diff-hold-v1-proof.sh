#!/usr/bin/env bash
set -euo pipefail

DOC="docs/work-credits/void-datanet-wc-availability-public-earn-status-no-live-summary-index-patch-candidate-diff-hold-v1.md"
SCHEMA="fixtures/work-credits/void-datanet-wc-availability-public-earn-status-no-live-summary-index-patch-candidate-diff-hold-schema-v1.json"
EXAMPLE="fixtures/work-credits/void-datanet-wc-availability-public-earn-status-no-live-summary-index-patch-candidate-diff-hold-example-v1.json"
READINESS="fixtures/work-credits/void-datanet-wc-availability-public-earn-status-no-live-summary-index-patch-readiness-hold-example-v1.json"
INDEX_TARGET="public/public-node/work-credits/index.json"
MARKER="VOID_DATANET_WC_AVAILABILITY_PUBLIC_EARN_STATUS_NO_LIVE_SUMMARY_INDEX_PATCH_CANDIDATE_DIFF_HOLD_V1"

fail() {
  echo "void_datanet_wc_availability_public_earn_status_no_live_summary_index_patch_candidate_diff_hold_v1_proof=FAIL reason=$1"
  exit 1
}

[ -f "$DOC" ] || fail "missing_doc"
[ -f "$SCHEMA" ] || fail "missing_schema"
[ -f "$EXAMPLE" ] || fail "missing_example"
[ -f "$READINESS" ] || fail "missing_source_readiness"

grep -Fq "$MARKER" "$DOC" || fail "missing_marker_doc"
grep -Fq "$MARKER" "$SCHEMA" || fail "missing_marker_schema"
grep -Fq "$MARKER" "$EXAMPLE" || fail "missing_marker_example"
grep -Fq "It does not apply the diff." "$DOC" || fail "missing_no_apply_doc"
grep -Fq 'It does not modify `public/public-node/work-credits/index.json`.' "$DOC" || fail "missing_no_index_modify_doc"
grep -Fq "candidate_diff_recorded_not_applied" "$DOC" || fail "missing_candidate_diff_status_doc"

python3 - "$SCHEMA" "$EXAMPLE" "$READINESS" <<'PY'
import json
import sys

schema_path, example_path, readiness_path = sys.argv[1:]
schema = json.load(open(schema_path, "r", encoding="utf-8"))
example = json.load(open(example_path, "r", encoding="utf-8"))
readiness = json.load(open(readiness_path, "r", encoding="utf-8"))

marker = "VOID_DATANET_WC_AVAILABILITY_PUBLIC_EARN_STATUS_NO_LIVE_SUMMARY_INDEX_PATCH_CANDIDATE_DIFF_HOLD_V1"
readiness_marker = "VOID_DATANET_WC_AVAILABILITY_PUBLIC_EARN_STATUS_NO_LIVE_SUMMARY_INDEX_PATCH_READINESS_HOLD_V1"
route = "/public-node/work-credits/datanet-wc-availability/earn-status-card-v1.json"
index_target = "public/public-node/work-credits/index.json"

assert schema["marker"] == marker
assert example["marker"] == marker
assert schema["source_marker"] == readiness_marker
assert example["source_marker"] == readiness_marker
assert readiness["marker"] == readiness_marker

for field in schema["required_fields"]:
    assert field in example, f"missing example field: {field}"

for field in schema["forbidden_public_fields"]:
    assert field not in example, f"forbidden public field present: {field}"

entry = example["proposed_index_entry"]
for field in schema["proposed_index_entry_required_fields"]:
    assert field in entry, f"missing proposed index entry field: {field}"

assert example["packet_kind"] == schema["packet_kind"]
assert example["patch_candidate_status"] in schema["allowed_patch_candidate_status"]
assert example["patch_candidate_status"] == "candidate_diff_recorded_not_applied"

assert example["source_readiness_status"] == readiness["readiness_status"] == "ready_for_future_separate_public_index_patch"
assert example["source_discovery_status"] == readiness["source_discovery_status"] == "candidate_for_future_public_index_listing_no_live_claim"

assert example["proposed_public_index_target"] == schema["proposed_public_index_target"] == readiness["proposed_public_index_target"] == index_target
assert entry["route"] == schema["proposed_index_entry_route"] == readiness["proposed_index_entry_route"] == route
assert entry["title"] == readiness["proposed_index_entry_title"]
assert entry["status"] == readiness["proposed_index_entry_status"] == "static_card_exists_local_runtime_not_observed_no_live_claim"

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

assert entry["runtime_live_claim"] is False
assert entry["runtime_route_observed"] is False
assert entry["wc_issuance_status"] == "not_issued"
assert entry["wc_ledger_write_status"] == "not_written"
assert entry["execute_gate_status"] == "held_execute_gate_closed"

assert readiness["public_index_mutation_status"] == "not_mutated"
assert readiness["index_patch_status"] == "held_for_future_separate_patch"
assert readiness["runtime_live_claim"] is False
assert readiness["runtime_route_observed"] is False
assert readiness["wc_issuance_status"] == "not_issued"
assert readiness["wc_ledger_write_status"] == "not_written"

for section, keys in [
    ("public_safety_boundary", schema["public_safety_boundary_required_false"]),
    ("candidate_diff_boundary", schema["candidate_diff_boundary_required_false"]),
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
print("source_readiness_binding_green=true")
print("candidate_diff_boundary_green=true")
print("public_index_not_mutated_green=true")
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

if grep -R "applies_diff.*true\|mutates_public_index.*true\|writes_public_index_file.*true\|publishes_listing.*true\|claims_listing_live.*true\|activates_public_discovery.*true\|claims_route_live.*true\|performs_runtime_request.*true\|starts_service.*true\|restarts_service.*true\|adds_runtime_route.*true\|changes_runtime_behavior.*true\|mutates_route_registry.*true\|activates_public_mutation.*true\|issues_work_credits.*true\|writes_wc_ledger.*true\|creates_ledger_line.*true\|appends_to_ledger_file.*true\|allocates_void.*true\|transfers_void.*true\|approves_ledger_write.*true\|executes_ledger_write.*true\|authorizes_ledger_write_execution.*true\|opens_execute_gate.*true\|grants_signer_wallet_access.*true\|moves_funds.*true\|exposes_private_objects.*true" "$DOC" "$SCHEMA" "$EXAMPLE" >/tmp/void_wc_no_live_summary_index_patch_candidate_diff_forbidden_true.txt; then
  cat /tmp/void_wc_no_live_summary_index_patch_candidate_diff_forbidden_true.txt
  fail "forbidden_true_flag"
fi

echo "void_datanet_wc_availability_public_earn_status_no_live_summary_index_patch_candidate_diff_hold_v1_proof=GREEN marker=$MARKER"
