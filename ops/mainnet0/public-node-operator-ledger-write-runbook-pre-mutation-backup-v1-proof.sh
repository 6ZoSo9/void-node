#!/usr/bin/env bash
set -euo pipefail

SRC="src/index.ts"
DOC="docs/public/public-node-operator-ledger-write-runbook-pre-mutation-backup-v1.md"

MARKER="VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_PRE_MUTATION_BACKUP_V1"
ROUTE_MARKER="VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_PRE_MUTATION_BACKUP_ROUTE_V1"
UI_MARKER="VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_PRE_MUTATION_BACKUP_UI_V1"
DOC_MARKER="VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_PRE_MUTATION_BACKUP_DOC_V1"
GREEN_MARKER="VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_PRE_MUTATION_BACKUP_PROOF_V1_GREEN"

ROUTE="/public-node/operator-ledger-write-runbook-pre-mutation-backup-v1.json"

grep -Fq "$MARKER" "$SRC"
grep -Fq "$ROUTE_MARKER" "$SRC"
grep -Fq "$UI_MARKER" "$SRC"
grep -Fq "$ROUTE" "$SRC"

test -f "$DOC"
grep -Fq "$DOC_MARKER" "$DOC"
grep -Fq "$ROUTE" "$DOC"
grep -Fq "does not create a backup file yet" "$DOC"
grep -Fq "Backup execution is deferred" "$DOC"

python3 - <<'PY'
from pathlib import Path
import hashlib
s = Path("src/index.ts").read_text()
start = s.index('APP.get("/public-node/operator-ledger-write-runbook-pre-mutation-backup-v1.json"')
end = s.index('APP.get("/public-node/operator-ledger-write-runbook-dry-mutation-plan-v1.json"', start)
chunk = s[start:end]
required = [
    'pre_mutation_backup_reviewed: true',
    'backup_required: true',
    'backup_plan_reviewed: true',
    'backup_execution_deferred: true',
    'backup_created_now: false',
    'backup_file_created_now: false',
    'ledger_snapshot_created_now: false',
    'dry_mutation_plan_reviewed: true',
    'dry_run_only: true',
    'planned_wc_delta: 1',
    'planned_wc_delta_unit: "WC"',
    'actual_write_path_selected: false',
    'write_path_selected: "none_yet"',
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
    'pre_mutation_backup_recorded_for_next_gate: true',
    'next_gate: "operator_ledger_write_runbook_pre_mutation_backup_execute_v1"',
]
missing = [x for x in required if x not in chunk]
if missing:
    raise SystemExit("missing route fields: " + ", ".join(missing))
print("operator_ledger_write_runbook_pre_mutation_backup_sha256=" + hashlib.sha256(chunk.encode()).hexdigest())
PY

echo "VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_PRE_MUTATION_BACKUP_PROOF_V1"
echo "operator_ledger_write_runbook_pre_mutation_backup_reviewed=true"
echo "operator_ledger_write_runbook_pre_mutation_backup_required=true"
echo "operator_ledger_write_runbook_pre_mutation_backup_execution_deferred=true"
echo "operator_ledger_write_runbook_pre_mutation_backup_created_now=false"
echo "operator_ledger_write_runbook_pre_mutation_backup_live_runtime_write=false"
echo "operator_ledger_write_runbook_pre_mutation_backup_wc_ledger_write=false"
echo "operator_ledger_write_runbook_pre_mutation_backup_wc_credit_delta_now=0"
echo "operator_ledger_write_runbook_pre_mutation_backup_next_gate=operator_ledger_write_runbook_pre_mutation_backup_execute_v1"
echo "$GREEN_MARKER"
