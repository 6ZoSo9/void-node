#!/usr/bin/env bash
set -euo pipefail

SRC="src/index.ts"
DOC="docs/public/public-node-operator-ledger-write-runbook-explicit-operator-ledger-write-allowance-v1.md"

MARKER="VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_EXPLICIT_OPERATOR_LEDGER_WRITE_ALLOWANCE_V1"
ROUTE_MARKER="VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_EXPLICIT_OPERATOR_LEDGER_WRITE_ALLOWANCE_ROUTE_V1"
UI_MARKER="VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_EXPLICIT_OPERATOR_LEDGER_WRITE_ALLOWANCE_UI_V1"
DOC_MARKER="VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_EXPLICIT_OPERATOR_LEDGER_WRITE_ALLOWANCE_DOC_V1"
GREEN_MARKER="VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_EXPLICIT_OPERATOR_LEDGER_WRITE_ALLOWANCE_PROOF_V1_GREEN"

ROUTE="/public-node/operator-ledger-write-runbook-explicit-operator-ledger-write-allowance-v1.json"

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
start = s.index('APP.get("/public-node/operator-ledger-write-runbook-explicit-operator-ledger-write-allowance-v1.json"')
end = s.index('APP.get("/public-node/operator-ledger-write-runbook-ledger-write-allowed-boundary-v1.json"', start)
chunk = s[start:end]
required = [
    'explicit_operator_ledger_write_allowance_reviewed: true',
    'ledger_write_allowed_boundary_reviewed: true',
    'all_required_gates_green: true',
    'ready_for_ledger_write: true',
    'selected_wc_delta: 1',
    'selected_wc_delta_unit: "WC"',
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
    'operator_explicit_allowance_recorded_for_next_gate: true',
    'operator_must_confirm_write_after_this_gate: true',
    'next_gate: "operator_ledger_write_runbook_final_live_write_preflight_v1"',
]
missing = [x for x in required if x not in chunk]
if missing:
    raise SystemExit("missing route fields: " + ", ".join(missing))
print("operator_ledger_write_runbook_explicit_operator_ledger_write_allowance_sha256=" + hashlib.sha256(chunk.encode()).hexdigest())
PY

echo "VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_EXPLICIT_OPERATOR_LEDGER_WRITE_ALLOWANCE_PROOF_V1"
echo "operator_ledger_write_runbook_explicit_operator_ledger_write_allowance_reviewed=true"
echo "operator_ledger_write_runbook_explicit_operator_ledger_write_allowance_only=true"
echo "operator_ledger_write_runbook_explicit_operator_ledger_write_allowance_state=explicit_operator_allowance_no_live_write"
echo "operator_ledger_write_runbook_explicit_operator_ledger_write_allowance_delta=1"
echo "operator_ledger_write_runbook_explicit_operator_ledger_write_allowance_delta_unit=WC"
echo "operator_ledger_write_runbook_explicit_operator_ledger_write_allowance_live_runtime_write=false"
echo "operator_ledger_write_runbook_explicit_operator_ledger_write_allowance_ledger_write_allowed_now=false"
echo "operator_ledger_write_runbook_explicit_operator_ledger_write_allowance_wc_ledger_write=false"
echo "operator_ledger_write_runbook_explicit_operator_ledger_write_allowance_wc_credit_delta_now=0"
echo "operator_ledger_write_runbook_explicit_operator_ledger_write_allowance_next_gate=operator_ledger_write_runbook_final_live_write_preflight_v1"
echo "$GREEN_MARKER"
