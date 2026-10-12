#!/usr/bin/env bash
set -euo pipefail

SRC="src/index.ts"
DOC="docs/public/public-node-operator-ledger-write-runbook-pre-mutation-backup-execute-v1.md"
EXEC="ops/mainnet0/public-node-operator-ledger-write-runbook-pre-mutation-backup-execute-v1.sh"

MARKER="VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_PRE_MUTATION_BACKUP_EXECUTE_V1"
ROUTE_MARKER="VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_PRE_MUTATION_BACKUP_EXECUTE_ROUTE_V1"
UI_MARKER="VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_PRE_MUTATION_BACKUP_EXECUTE_UI_V1"
DOC_MARKER="VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_PRE_MUTATION_BACKUP_EXECUTE_DOC_V1"
GREEN_MARKER="VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_PRE_MUTATION_BACKUP_EXECUTE_PROOF_V1_GREEN"

ROUTE="/public-node/operator-ledger-write-runbook-pre-mutation-backup-execute-v1.json"

grep -Fq "$MARKER" "$SRC"
grep -Fq "$ROUTE_MARKER" "$SRC"
grep -Fq "$UI_MARKER" "$SRC"
grep -Fq "$ROUTE" "$SRC"

test -f "$DOC"
grep -Fq "$DOC_MARKER" "$DOC"
grep -Fq "$ROUTE" "$DOC"
grep -Fq "only allowed write is a backup/snapshot" "$DOC"

test -x "$EXEC"
bash -n "$EXEC"

python3 - <<'PY'
from pathlib import Path
import hashlib
s = Path("src/index.ts").read_text()
start = s.index('APP.get("/public-node/operator-ledger-write-runbook-pre-mutation-backup-execute-v1.json"')
end = s.index('APP.get("/public-node/operator-ledger-write-runbook-pre-mutation-backup-v1.json"', start)
chunk = s[start:end]
required = [
    'backup_execute_script_present: true',
    'backup_only_write_allowed: true',
    'ledger_snapshot_created_by_script: true',
    'backup_execution_deferred: false',
    'planned_wc_delta: 1',
    'planned_wc_delta_unit: "WC"',
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
    'next_gate: "operator_ledger_write_runbook_duplicate_guard_recheck_v1"',
]
missing = [x for x in required if x not in chunk]
if missing:
    raise SystemExit("missing route fields: " + ", ".join(missing))
print("operator_ledger_write_runbook_pre_mutation_backup_execute_route_sha256=" + hashlib.sha256(chunk.encode()).hexdigest())
PY

RUN_LOG="$(mktemp)"
"$EXEC" > "$RUN_LOG"

grep -Fq "VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_PRE_MUTATION_BACKUP_EXECUTE_V1_GREEN" "$RUN_LOG"
grep -Fq "operator_ledger_write_runbook_pre_mutation_backup_execute_backup_created_now=true" "$RUN_LOG"
grep -Fq "operator_ledger_write_runbook_pre_mutation_backup_execute_backup_file_created_now=true" "$RUN_LOG"
grep -Fq "operator_ledger_write_runbook_pre_mutation_backup_execute_ledger_snapshot_created_now=true" "$RUN_LOG"
grep -Fq "operator_ledger_write_runbook_pre_mutation_backup_execute_live_runtime_write=false" "$RUN_LOG"
grep -Fq "operator_ledger_write_runbook_pre_mutation_backup_execute_wc_ledger_write=false" "$RUN_LOG"
grep -Fq "operator_ledger_write_runbook_pre_mutation_backup_execute_wc_credit_delta_now=0" "$RUN_LOG"

cat "$RUN_LOG"

echo "VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_PRE_MUTATION_BACKUP_EXECUTE_PROOF_V1"
echo "operator_ledger_write_runbook_pre_mutation_backup_execute_proof_green=true"
echo "operator_ledger_write_runbook_pre_mutation_backup_execute_live_runtime_write=false"
echo "operator_ledger_write_runbook_pre_mutation_backup_execute_wc_ledger_write=false"
echo "operator_ledger_write_runbook_pre_mutation_backup_execute_wc_credit_delta_now=0"
echo "operator_ledger_write_runbook_pre_mutation_backup_execute_next_gate=operator_ledger_write_runbook_duplicate_guard_recheck_v1"
echo "$GREEN_MARKER"
