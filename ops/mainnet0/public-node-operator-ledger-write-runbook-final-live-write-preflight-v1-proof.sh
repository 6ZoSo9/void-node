#!/usr/bin/env bash
set -euo pipefail

SRC="src/index.ts"
DOC="docs/public/public-node-operator-ledger-write-runbook-final-live-write-preflight-v1.md"

MARKER="VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_FINAL_LIVE_WRITE_PREFLIGHT_V1"
ROUTE_MARKER="VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_FINAL_LIVE_WRITE_PREFLIGHT_ROUTE_V1"
UI_MARKER="VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_FINAL_LIVE_WRITE_PREFLIGHT_UI_V1"
DOC_MARKER="VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_FINAL_LIVE_WRITE_PREFLIGHT_DOC_V1"
GREEN_MARKER="VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_FINAL_LIVE_WRITE_PREFLIGHT_PROOF_V1_GREEN"

ROUTE="/public-node/operator-ledger-write-runbook-final-live-write-preflight-v1.json"

grep -Fq "$MARKER" "$SRC"
grep -Fq "$ROUTE_MARKER" "$SRC"
grep -Fq "$UI_MARKER" "$SRC"
grep -Fq "$ROUTE" "$SRC"

test -f "$DOC"
grep -Fq "$DOC_MARKER" "$DOC"
grep -Fq "$ROUTE" "$DOC"

python3 - <<'PY'
from pathlib import Path
import hashlib

s = Path("src/index.ts").read_text()
start = s.index('APP.get("/public-node/operator-ledger-write-runbook-final-live-write-preflight-v1.json"')
end = s.index('APP.get("/public-node/operator-ledger-write-runbook-explicit-operator-ledger-write-allowance-v1.json"', start)
chunk = s[start:end]

required = [
    'final_live_write_preflight_reviewed: true',
    'explicit_operator_ledger_write_allowance_reviewed: true',
    'operator_explicit_allowance_recorded_for_next_gate: true',
    'ledger_write_allowed_boundary_reviewed: true',
    'all_required_gates_green: true',
    'ready_for_ledger_write: true',
    'selected_wc_delta: 1',
    'selected_wc_delta_unit: "WC"',
    'manual_terminal_execution_required: true',
    'final_operator_confirmation_required_at_execute_time: true',
    'idempotency_key_required_for_future_write: true',
    'source_hash_chain_required: true',
    'duplicate_ledger_entry_check_required: true',
    'no_http_write_route: true',
    'no_post_route: true',
    'ready_for_credit_award: false',
    'final_live_write_unlock: false',
    'live_runtime_write: false',
    'ledger_write_allowed_now: false',
    'ledger_record_created_now: false',
    'ledger_entry_created_now: false',
    'award_record_created_now: false',
    'award_created_now: false',
    'wc_ledger_write: false',
    'wc_ledger_mutated_now: false',
    'wc_credit_award: false',
    'wc_credit_delta_now: 0',
    'wc_to_void_swap: false',
    'wallet_send: false',
    'validator_mutation_open: false',
    'money_movement_open: false',
    'automatic_ledger_write_allowed: false',
    'next_gate: "operator_ledger_write_runbook_manual_live_write_execute_v1"',
]
missing = [x for x in required if x not in chunk]
if missing:
    raise SystemExit("missing route fields: " + ", ".join(missing))

print("operator_ledger_write_runbook_final_live_write_preflight_sha256=" + hashlib.sha256(chunk.encode()).hexdigest())
PY

echo "VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_FINAL_LIVE_WRITE_PREFLIGHT_PROOF_V1"
echo "operator_ledger_write_runbook_final_live_write_preflight_reviewed=true"
echo "operator_ledger_write_runbook_final_live_write_preflight_only=true"
echo "operator_ledger_write_runbook_final_live_write_preflight_state=final_live_write_preflight_no_live_write"
echo "operator_ledger_write_runbook_final_live_write_preflight_delta=1"
echo "operator_ledger_write_runbook_final_live_write_preflight_delta_unit=WC"
echo "operator_ledger_write_runbook_final_live_write_preflight_manual_terminal_execution_required=true"
echo "operator_ledger_write_runbook_final_live_write_preflight_no_http_write_route=true"
echo "operator_ledger_write_runbook_final_live_write_preflight_no_post_route=true"
echo "operator_ledger_write_runbook_final_live_write_preflight_final_live_write_unlock=false"
echo "operator_ledger_write_runbook_final_live_write_preflight_live_runtime_write=false"
echo "operator_ledger_write_runbook_final_live_write_preflight_ledger_write_allowed_now=false"
echo "operator_ledger_write_runbook_final_live_write_preflight_wc_ledger_write=false"
echo "operator_ledger_write_runbook_final_live_write_preflight_wc_credit_delta_now=0"
echo "operator_ledger_write_runbook_final_live_write_preflight_next_gate=operator_ledger_write_runbook_manual_live_write_execute_v1"
echo "$GREEN_MARKER"
