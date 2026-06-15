#!/usr/bin/env bash
set -euo pipefail

SRC="src/index.ts"
DOC="docs/public/public-node-operator-ledger-write-runbook-duplicate-guard-recheck-v1.md"
SCAN="ops/mainnet0/public-node-operator-ledger-write-runbook-duplicate-guard-recheck-v1.sh"

MARKER="VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_DUPLICATE_GUARD_RECHECK_V1"
ROUTE_MARKER="VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_DUPLICATE_GUARD_RECHECK_ROUTE_V1"
UI_MARKER="VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_DUPLICATE_GUARD_RECHECK_UI_V1"
DOC_MARKER="VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_DUPLICATE_GUARD_RECHECK_DOC_V1"
GREEN_MARKER="VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_DUPLICATE_GUARD_RECHECK_PROOF_V1_GREEN"

ROUTE="/public-node/operator-ledger-write-runbook-duplicate-guard-recheck-v1.json"

grep -Fq "$MARKER" "$SRC"
grep -Fq "$ROUTE_MARKER" "$SRC"
grep -Fq "$UI_MARKER" "$SRC"
grep -Fq "$ROUTE" "$SRC"

test -f "$DOC"
grep -Fq "$DOC_MARKER" "$DOC"
grep -Fq "$ROUTE" "$DOC"
grep -Fq "read-only scan" "$DOC"

test -x "$SCAN"
bash -n "$SCAN"

python3 - <<'PY'
from pathlib import Path
import hashlib
s = Path("src/index.ts").read_text()
start = s.index('APP.get("/public-node/operator-ledger-write-runbook-duplicate-guard-recheck-v1.json"')
end = s.index('APP.get("/public-node/operator-ledger-write-runbook-pre-mutation-backup-execute-v1.json"', start)
chunk = s[start:end]
required = [
    'duplicate_guard_recheck_script_present: true',
    'target_subject: "first_external_tester_operator_ledger_write_readiness_fixture"',
    'target_kind: "wc_delta"',
    'target_delta: 1',
    'duplicate_guard_recheck_reviewed: true',
    'duplicate_found_by_expected_clean_scan: false',
    'duplicate_blocked_by_expected_clean_scan: false',
    'read_only_scan: true',
    'planned_wc_delta: 1',
    'planned_wc_delta_unit: "WC"',
    'pre_mutation_backup_execute_green_required: true',
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
    'next_gate: "operator_ledger_write_runbook_final_mutation_command_hold_v1"',
]
missing = [x for x in required if x not in chunk]
if missing:
    raise SystemExit("missing route fields: " + ", ".join(missing))
print("operator_ledger_write_runbook_duplicate_guard_recheck_route_sha256=" + hashlib.sha256(chunk.encode()).hexdigest())
PY

RUN_LOG="$(mktemp)"
"$SCAN" > "$RUN_LOG"

grep -Fq "VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_DUPLICATE_GUARD_RECHECK_V1_GREEN" "$RUN_LOG"
grep -Fq "operator_ledger_write_runbook_duplicate_guard_recheck_duplicate_found=false" "$RUN_LOG"
grep -Fq "operator_ledger_write_runbook_duplicate_guard_recheck_blocked=false" "$RUN_LOG"
grep -Fq "operator_ledger_write_runbook_duplicate_guard_recheck_read_only_scan=true" "$RUN_LOG"
grep -Fq "operator_ledger_write_runbook_duplicate_guard_recheck_live_runtime_write=false" "$RUN_LOG"
grep -Fq "operator_ledger_write_runbook_duplicate_guard_recheck_wc_ledger_write=false" "$RUN_LOG"
grep -Fq "operator_ledger_write_runbook_duplicate_guard_recheck_wc_credit_delta_now=0" "$RUN_LOG"

cat "$RUN_LOG"

echo "VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_DUPLICATE_GUARD_RECHECK_PROOF_V1"
echo "operator_ledger_write_runbook_duplicate_guard_recheck_proof_green=true"
echo "operator_ledger_write_runbook_duplicate_guard_recheck_duplicate_found=false"
echo "operator_ledger_write_runbook_duplicate_guard_recheck_blocked=false"
echo "operator_ledger_write_runbook_duplicate_guard_recheck_read_only_scan=true"
echo "operator_ledger_write_runbook_duplicate_guard_recheck_live_runtime_write=false"
echo "operator_ledger_write_runbook_duplicate_guard_recheck_wc_ledger_write=false"
echo "operator_ledger_write_runbook_duplicate_guard_recheck_wc_credit_delta_now=0"
echo "operator_ledger_write_runbook_duplicate_guard_recheck_next_gate=operator_ledger_write_runbook_final_mutation_command_hold_v1"
echo "$GREEN_MARKER"
