#!/usr/bin/env bash
set -euo pipefail

SRC="src/index.ts"
DOC="docs/public/public-node-operator-ledger-write-runbook-live-write-unlock-v1.md"

MARKER="VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_LIVE_WRITE_UNLOCK_V1"
ROUTE_MARKER="VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_LIVE_WRITE_UNLOCK_ROUTE_V1"
UI_MARKER="VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_LIVE_WRITE_UNLOCK_UI_V1"
DOC_MARKER="VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_LIVE_WRITE_UNLOCK_DOC_V1"
GREEN_MARKER="VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_LIVE_WRITE_UNLOCK_PROOF_V1_GREEN"

ROUTE="/public-node/operator-ledger-write-runbook-live-write-unlock-v1.json"

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
start = s.index('APP.get("/public-node/operator-ledger-write-runbook-live-write-unlock-v1.json"')
end = s.index('APP.get("/public-node/operator-ledger-write-runbook-operator-requested-write-v1.json"', start)
chunk = s[start:end]
required = [
    'live_write_unlock_reviewed: true',
    'operator_requested_write_reviewed: true',
    'requested_now: true',
    'exact_operator_execute_command_present_now: true',
    'selected_wc_delta: 1',
    'selected_wc_delta_unit: "WC"',
    'live_write_unlocked_for_final_apply: true',
    'ready_for_credit_award: false',
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
    'operator_live_write_unlock_recorded_for_next_gate: true',
    'operator_must_perform_final_apply_after_this_gate: true',
    'next_gate: "operator_ledger_write_runbook_final_apply_v1"',
]
missing = [x for x in required if x not in chunk]
if missing:
    raise SystemExit("missing route fields: " + ", ".join(missing))
print("operator_ledger_write_runbook_live_write_unlock_sha256=" + hashlib.sha256(chunk.encode()).hexdigest())
PY

echo "VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_LIVE_WRITE_UNLOCK_PROOF_V1"
echo "operator_ledger_write_runbook_live_write_unlock_reviewed=true"
echo "operator_ledger_write_runbook_live_write_unlock_requested_now=true"
echo "operator_ledger_write_runbook_live_write_unlock_unlocked_for_final_apply=true"
echo "operator_ledger_write_runbook_live_write_unlock_live_runtime_write=false"
echo "operator_ledger_write_runbook_live_write_unlock_wc_ledger_write=false"
echo "operator_ledger_write_runbook_live_write_unlock_wc_credit_delta_now=0"
echo "operator_ledger_write_runbook_live_write_unlock_next_gate=operator_ledger_write_runbook_final_apply_v1"
echo "$GREEN_MARKER"
