#!/usr/bin/env bash
set -euo pipefail

LOCAL_BASE="${LOCAL_BASE:-http://127.0.0.1:4100}"
OUT="${OUT:-/tmp/public-node-first-external-tester-wc-ledger-write-readiness-status-proof-$(date -u +%Y%m%d-%H%M%S)}"

mkdir -p "$OUT"

echo "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_LEDGER_WRITE_READINESS_STATUS_PROOF_V1"
echo "checked_at_utc=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "head=$(git rev-parse --short HEAD)"
echo "tag=$(git tag --points-at HEAD | head -1)"
echo "local_base=$LOCAL_BASE"
echo "out=$OUT"

SRC="src/index.ts"
DOC="docs/public/public-node-first-external-tester-wc-ledger-write-readiness-status.md"

test -f "$SRC"
test -f "$DOC"

grep -Fq "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_LEDGER_WRITE_READINESS_STATUS_V1" "$SRC"
grep -Fq "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_LEDGER_WRITE_READINESS_STATUS_ROUTE_V1" "$SRC"
grep -Fq "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_LEDGER_WRITE_READINESS_STATUS_UI_V1" "$SRC"
grep -Fq "publicNodeFirstExternalTesterWcLedgerWriteReadinessStatusCard" "$SRC"
grep -Fq "/public-node/first-external-tester-wc-ledger-write-readiness-status.json" "$SRC"
grep -Fq "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_LEDGER_WRITE_READINESS_STATUS_DOC_V1" "$DOC"

echo "readiness_status_source_markers_green=true"

curl -fsS "$LOCAL_BASE/public-node/first-external-tester-wc-ledger-write-readiness-status.json" > "$OUT/readiness-status.json"
curl -fsS "$LOCAL_BASE/public-node/first-external-tester-wc-ledger-write-boundary.json" > "$OUT/ledger-write-boundary.json"
curl -fsS "$LOCAL_BASE/public-node" > "$OUT/public-node.html"
curl -fsS "$LOCAL_BASE/public-node/route-index.json" > "$OUT/route-index.json"
curl -fsS "$LOCAL_BASE/public-node/self-check-snapshot.json" > "$OUT/self-check-snapshot.json"
curl -fsS "$LOCAL_BASE/public-node/route-manifest.json" > "$OUT/route-manifest.json"

python3 - "$OUT/readiness-status.json" "$OUT/ledger-write-boundary.json" "$OUT/route-index.json" "$OUT/self-check-snapshot.json" "$OUT/route-manifest.json" <<'PY'
import json
import sys
from pathlib import Path

status = json.loads(Path(sys.argv[1]).read_text())
boundary = json.loads(Path(sys.argv[2]).read_text())
route_index = json.loads(Path(sys.argv[3]).read_text())
self_check = json.loads(Path(sys.argv[4]).read_text())
route_manifest = json.loads(Path(sys.argv[5]).read_text())

route = "/public-node/first-external-tester-wc-ledger-write-readiness-status.json"

assert status["marker"] == "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_LEDGER_WRITE_READINESS_STATUS_V1"
assert status["route_marker"] == "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_LEDGER_WRITE_READINESS_STATUS_ROUTE_V1"
assert status["route"] == route
assert status["candidate_id"] == "first-external-tester-n153b-demo003-standalone-smoke-v1"
assert status["readiness_state"] == "blocked_not_ready_for_ledger_write"
assert status["ready_for_ledger_write"] is False
assert status["ready_for_credit_award"] is False
assert status["current_review_state"] == "pending_operator_review"
assert status["current_decision_state"] == "not_approved"
assert status["current_award_intent_state"] == "deferred"
assert status["current_award_record_state"] == "deferred"
assert status["current_ledger_preview_state"] == "deferred"
assert status["current_ledger_write_state"] == "not_allowed"

approvals = status["required_approvals"]
assert approvals["operator_review_record_approved"] is False
assert approvals["operator_decision_record_approved"] is False
assert approvals["operator_award_intent_packet_approved"] is False
assert approvals["operator_award_record_approved"] is False
assert approvals["operator_ledger_entry_preview_reviewed"] is False

checks = status["required_checks"]
assert checks["positive_nonzero_wc_delta_selected_by_operator"] is False
assert checks["duplicate_ledger_entry_check_green"] is False
assert checks["source_hash_chain_green"] is False
assert checks["explicit_operator_ledger_write_confirmation_present"] is False
assert checks["ledger_write_runbook_exists"] is False
assert checks["ledger_write_runbook_proof_green"] is False

for blocker in [
    "operator_review_record_not_approved",
    "operator_decision_record_not_approved",
    "operator_award_intent_packet_not_approved",
    "operator_award_record_not_approved",
    "operator_ledger_entry_preview_not_reviewed",
    "positive_nonzero_wc_delta_not_selected",
    "duplicate_ledger_entry_check_not_run",
    "source_hash_chain_not_promoted_to_approved",
    "explicit_operator_ledger_write_confirmation_missing",
    "ledger_write_runbook_absent",
    "ledger_write_runbook_proof_absent",
]:
    assert blocker in status["current_blockers"]

protected = status["protected_boundary"]
assert protected["ledger_write_readiness_status_only"] is True
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

boundary_protected = boundary["protected_boundary"]
assert boundary["current_ledger_write_state"] == "not_allowed"
assert boundary_protected["ledger_write_allowed_now"] is False
assert boundary_protected["ledger_record_created_now"] is False
assert boundary_protected["wc_ledger_write"] is False
assert boundary_protected["wc_credit_award"] is False
assert boundary_protected["wc_to_void_swap"] is False

route_blob = json.dumps(route_index, sort_keys=True)
self_blob = json.dumps(self_check, sort_keys=True)
manifest_blob = json.dumps(route_manifest, sort_keys=True)

route_index_contains_readiness_status = route in route_blob
self_check_contains_readiness_status = route in self_blob
route_manifest_contains_readiness_status = route in manifest_blob

print(f"route_index_contains_readiness_status={str(route_index_contains_readiness_status).lower()}")
print(f"self_check_contains_readiness_status={str(self_check_contains_readiness_status).lower()}")
print(f"route_manifest_contains_readiness_status={str(route_manifest_contains_readiness_status).lower()}")

assert route_index_contains_readiness_status
assert self_check_contains_readiness_status
assert route_manifest_contains_readiness_status

print("ledger_write_readiness_status_json_green=true")
print("ledger_write_readiness_status_boundary_still_locked_green=true")
print("ledger_write_readiness_status_discovery_green=true")
PY

grep -Fq "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_LEDGER_WRITE_READINESS_STATUS_UI_V1" "$OUT/public-node.html"
grep -Fq "publicNodeFirstExternalTesterWcLedgerWriteReadinessStatusCard" "$OUT/public-node.html"
grep -Fq "publicNodeFirstExternalTesterWcLedgerWriteReadinessStatusLink" "$OUT/public-node.html"
grep -Fq "Ledger Write Readiness Status" "$OUT/public-node.html"
grep -Fq "blocked_not_ready_for_ledger_write" "$OUT/public-node.html"
grep -Fq "Ready for ledger write:" "$OUT/public-node.html"
grep -Fq "Ledger write runbook exists:" "$OUT/public-node.html"
grep -Fq "WC ledger write:" "$OUT/public-node.html"
grep -Fq "WC credit award:" "$OUT/public-node.html"
grep -Fq "WC→VOID swap:" "$OUT/public-node.html"

echo "route=/public-node/first-external-tester-wc-ledger-write-readiness-status.json"
echo "ui_marker=VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_LEDGER_WRITE_READINESS_STATUS_UI_V1"
echo "card_id=publicNodeFirstExternalTesterWcLedgerWriteReadinessStatusCard"
echo "readiness_state=blocked_not_ready_for_ledger_write"
echo "ready_for_ledger_write=false"
echo "ready_for_credit_award=false"
echo "operator_review_record_approved=false"
echo "operator_decision_record_approved=false"
echo "operator_award_intent_packet_approved=false"
echo "operator_award_record_approved=false"
echo "operator_ledger_entry_preview_reviewed=false"
echo "positive_nonzero_wc_delta_selected_by_operator=false"
echo "duplicate_ledger_entry_check_green=false"
echo "source_hash_chain_green=false"
echo "explicit_operator_ledger_write_confirmation_present=false"
echo "ledger_write_runbook_exists=false"
echo "ledger_write_runbook_proof_green=false"
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
echo "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_LEDGER_WRITE_READINESS_STATUS_PROOF_V1_GREEN"
