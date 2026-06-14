#!/usr/bin/env bash
set -euo pipefail

LOCAL_BASE="${LOCAL_BASE:-http://127.0.0.1:4100}"
OUT="${OUT:-/tmp/public-node-first-external-tester-wc-duplicate-ledger-entry-check-design-proof-$(date -u +%Y%m%d-%H%M%S)}"

mkdir -p "$OUT"

echo "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_DUPLICATE_LEDGER_ENTRY_CHECK_DESIGN_PROOF_V1"
echo "checked_at_utc=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "head=$(git rev-parse --short HEAD)"
echo "tag=$(git tag --points-at HEAD | head -1)"
echo "local_base=$LOCAL_BASE"
echo "out=$OUT"

SRC="src/index.ts"
DOC="docs/public/public-node-first-external-tester-wc-duplicate-ledger-entry-check-design.md"

test -f "$SRC"
test -f "$DOC"

grep -Fq "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_DUPLICATE_LEDGER_ENTRY_CHECK_DESIGN_V1" "$SRC"
grep -Fq "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_DUPLICATE_LEDGER_ENTRY_CHECK_DESIGN_ROUTE_V1" "$SRC"
grep -Fq "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_DUPLICATE_LEDGER_ENTRY_CHECK_DESIGN_UI_V1" "$SRC"
grep -Fq "publicNodeFirstExternalTesterWcDuplicateLedgerEntryCheckDesignCard" "$SRC"
grep -Fq "/public-node/first-external-tester-wc-duplicate-ledger-entry-check-design.json" "$SRC"
grep -Fq "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_DUPLICATE_LEDGER_ENTRY_CHECK_DESIGN_DOC_V1" "$DOC"

echo "duplicate_ledger_entry_check_design_source_markers_green=true"

curl -fsS "$LOCAL_BASE/public-node/first-external-tester-wc-duplicate-ledger-entry-check-design.json" > "$OUT/duplicate-check-design.json"
curl -fsS "$LOCAL_BASE/public-node/first-external-tester-wc-ledger-write-readiness-status.json" > "$OUT/readiness-status.json"
curl -fsS "$LOCAL_BASE/public-node" > "$OUT/public-node.html"
curl -fsS "$LOCAL_BASE/public-node/route-index.json" > "$OUT/route-index.json"
curl -fsS "$LOCAL_BASE/public-node/self-check-snapshot.json" > "$OUT/self-check-snapshot.json"
curl -fsS "$LOCAL_BASE/public-node/route-manifest.json" > "$OUT/route-manifest.json"

python3 - "$OUT/duplicate-check-design.json" "$OUT/readiness-status.json" "$OUT/route-index.json" "$OUT/self-check-snapshot.json" "$OUT/route-manifest.json" <<'PY'
import json
import sys
from pathlib import Path

design = json.loads(Path(sys.argv[1]).read_text())
readiness = json.loads(Path(sys.argv[2]).read_text())
route_index = json.loads(Path(sys.argv[3]).read_text())
self_check = json.loads(Path(sys.argv[4]).read_text())
route_manifest = json.loads(Path(sys.argv[5]).read_text())

route = "/public-node/first-external-tester-wc-duplicate-ledger-entry-check-design.json"

assert design["marker"] == "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_DUPLICATE_LEDGER_ENTRY_CHECK_DESIGN_V1"
assert design["route_marker"] == "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_DUPLICATE_LEDGER_ENTRY_CHECK_DESIGN_ROUTE_V1"
assert design["route"] == route
assert design["candidate_id"] == "first-external-tester-n153b-demo003-standalone-smoke-v1"
assert design["design_state"] == "duplicate_ledger_entry_check_design_only"
assert design["duplicate_ledger_entry_check_ready"] is False
assert design["duplicate_ledger_entry_check_run_now"] is False
assert design["duplicate_ledger_entry_detected_now"] is False
assert design["duplicate_ledger_entry_check_result_now"] == "not_run_design_only"
assert design["duplicate_ledger_entry_check_required_before_ledger_write"] is True

for dim in [
    "candidate_id",
    "lane_id",
    "source_award_record_sha256",
    "source_ledger_entry_preview_sha256",
    "operator_id",
    "wc_delta",
    "ledger_record_type",
    "created_for_boundary_version",
]:
    assert dim in design["future_duplicate_dimensions"]

on_dup = design["future_fail_closed_outputs_on_duplicate"]
assert on_dup["duplicate_ledger_entry_check_green"] is False
assert on_dup["duplicate_ledger_entry_detected"] is True
assert on_dup["ledger_record_created_now"] is False
assert on_dup["wc_ledger_write"] is False
assert on_dup["wc_credit_award"] is False
assert on_dup["wc_to_void_swap"] is False

not_run = design["future_fail_closed_outputs_when_not_run"]
assert not_run["duplicate_ledger_entry_check_green"] is False
assert not_run["duplicate_ledger_entry_check_run_now"] is False
assert not_run["ledger_record_created_now"] is False
assert not_run["wc_ledger_write"] is False
assert not_run["wc_credit_award"] is False
assert not_run["wc_to_void_swap"] is False

protected = design["protected_boundary"]
assert protected["duplicate_ledger_entry_check_design_only"] is True
assert protected["duplicate_ledger_entry_check_run_now"] is False
assert protected["duplicate_ledger_entry_detected_now"] is False
assert protected["ledger_write_allowed_now"] is False
assert protected["ledger_record_created_now"] is False
assert protected["ledger_entry_preview_created_now"] is False
assert protected["award_record_created_now"] is False
assert protected["award_created_now"] is False
assert protected["award_write_allowed_now"] is False
assert protected["wc_ledger_mutated_now"] is False
assert protected["wc_credit_delta_now"] == 0
assert protected["wc_ledger_write"] is False
assert protected["wc_credit_award"] is False
assert protected["wc_to_void_swap"] is False
assert protected["automatic_ledger_write_allowed"] is False
assert protected["money_movement"] is False
assert protected["wallet_send"] is False
assert protected["buy_void_fulfillment"] is False
assert protected["validator_mutation"] is False

assert readiness["readiness_state"] == "blocked_not_ready_for_ledger_write"
assert readiness["required_checks"]["duplicate_ledger_entry_check_green"] is False
assert readiness["protected_boundary"]["ledger_write_allowed_now"] is False
assert readiness["protected_boundary"]["ledger_record_created_now"] is False
assert readiness["protected_boundary"]["wc_ledger_write"] is False
assert readiness["protected_boundary"]["wc_credit_award"] is False
assert readiness["protected_boundary"]["wc_to_void_swap"] is False

route_blob = json.dumps(route_index, sort_keys=True)
self_blob = json.dumps(self_check, sort_keys=True)
manifest_blob = json.dumps(route_manifest, sort_keys=True)

route_index_contains_duplicate_check_design = route in route_blob
self_check_contains_duplicate_check_design = route in self_blob
route_manifest_contains_duplicate_check_design = route in manifest_blob

print(f"route_index_contains_duplicate_check_design={str(route_index_contains_duplicate_check_design).lower()}")
print(f"self_check_contains_duplicate_check_design={str(self_check_contains_duplicate_check_design).lower()}")
print(f"route_manifest_contains_duplicate_check_design={str(route_manifest_contains_duplicate_check_design).lower()}")

assert route_index_contains_duplicate_check_design
assert self_check_contains_duplicate_check_design
assert route_manifest_contains_duplicate_check_design

print("duplicate_ledger_entry_check_design_json_green=true")
print("duplicate_ledger_entry_check_design_readiness_still_blocked_green=true")
print("duplicate_ledger_entry_check_design_discovery_green=true")
PY

grep -Fq "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_DUPLICATE_LEDGER_ENTRY_CHECK_DESIGN_UI_V1" "$OUT/public-node.html"
grep -Fq "publicNodeFirstExternalTesterWcDuplicateLedgerEntryCheckDesignCard" "$OUT/public-node.html"
grep -Fq "publicNodeFirstExternalTesterWcDuplicateLedgerEntryCheckDesignLink" "$OUT/public-node.html"
grep -Fq "Duplicate Ledger Entry Check Design" "$OUT/public-node.html"
grep -Fq "duplicate_ledger_entry_check_design_only" "$OUT/public-node.html"
grep -Fq "Duplicate check run now:" "$OUT/public-node.html"
grep -Fq "Ledger record created now:" "$OUT/public-node.html"
grep -Fq "WC ledger write:" "$OUT/public-node.html"
grep -Fq "WC credit award:" "$OUT/public-node.html"
grep -Fq "WC→VOID swap:" "$OUT/public-node.html"

echo "route=/public-node/first-external-tester-wc-duplicate-ledger-entry-check-design.json"
echo "ui_marker=VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_DUPLICATE_LEDGER_ENTRY_CHECK_DESIGN_UI_V1"
echo "card_id=publicNodeFirstExternalTesterWcDuplicateLedgerEntryCheckDesignCard"
echo "design_state=duplicate_ledger_entry_check_design_only"
echo "duplicate_ledger_entry_check_ready=false"
echo "duplicate_ledger_entry_check_run_now=false"
echo "duplicate_ledger_entry_detected_now=false"
echo "duplicate_ledger_entry_check_result_now=not_run_design_only"
echo "duplicate_ledger_entry_check_required_before_ledger_write=true"
echo "duplicate_dimension_candidate_id=true"
echo "duplicate_dimension_lane_id=true"
echo "duplicate_dimension_source_award_record_sha256=true"
echo "duplicate_dimension_source_ledger_entry_preview_sha256=true"
echo "duplicate_dimension_operator_id=true"
echo "duplicate_dimension_wc_delta=true"
echo "duplicate_dimension_ledger_record_type=true"
echo "duplicate_dimension_created_for_boundary_version=true"
echo "ledger_write_allowed_now=false"
echo "ledger_record_created_now=false"
echo "ledger_entry_preview_created_now=false"
echo "award_record_created_now=false"
echo "award_created_now=false"
echo "award_write_allowed_now=false"
echo "wc_ledger_mutated_now=false"
echo "wc_credit_delta_now=0"
echo "wc_ledger_write=false"
echo "wc_credit_award=false"
echo "wc_to_void_swap=false"
echo "automatic_ledger_write_allowed=false"
echo "money_movement=false"
echo "wallet_send=false"
echo "buy_void_fulfillment=false"
echo "validator_mutation=false"
echo "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_DUPLICATE_LEDGER_ENTRY_CHECK_DESIGN_PROOF_V1_GREEN"
