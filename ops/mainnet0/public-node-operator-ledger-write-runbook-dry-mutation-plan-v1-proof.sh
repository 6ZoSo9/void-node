#!/usr/bin/env bash
set -euo pipefail

SRC="src/index.ts"
DOC="docs/public/public-node-operator-ledger-write-runbook-dry-mutation-plan-v1.md"

MARKER="VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_DRY_MUTATION_PLAN_V1"
ROUTE_MARKER="VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_DRY_MUTATION_PLAN_ROUTE_V1"
UI_MARKER="VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_DRY_MUTATION_PLAN_UI_V1"
DOC_MARKER="VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_DRY_MUTATION_PLAN_DOC_V1"
GREEN_MARKER="VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_DRY_MUTATION_PLAN_PROOF_V1_GREEN"

ROUTE="/public-node/operator-ledger-write-runbook-dry-mutation-plan-v1.json"

grep -Fq "$MARKER" "$SRC"
grep -Fq "$ROUTE_MARKER" "$SRC"
grep -Fq "$UI_MARKER" "$SRC"
grep -Fq "$ROUTE" "$SRC"

test -f "$DOC"
grep -Fq "$DOC_MARKER" "$DOC"
grep -Fq "$ROUTE" "$DOC"
grep -Fq "planned delta: \`1 WC\`" "$DOC"
grep -Fq "No actual write path is selected" "$DOC"

python3 - <<'PY'
from pathlib import Path
import hashlib
s = Path("src/index.ts").read_text()
start = s.index('APP.get("/public-node/operator-ledger-write-runbook-dry-mutation-plan-v1.json"')
end = s.index('APP.get("/public-node/operator-ledger-write-runbook-separate-live-mutation-v1.json"', start)
chunk = s[start:end]
required = [
    'dry_mutation_plan_reviewed: true',
    'dry_run_only: true',
    'separate_live_mutation_reviewed: true',
    'mutation_path_identified: true',
    'final_apply_reviewed: true',
    'requested_now: true',
    'planned_entry_kind: "wc_delta"',
    'planned_wc_delta: 1',
    'planned_wc_delta_unit: "WC"',
    'actual_write_path_selected: false',
    'write_path_selected: "none_yet"',
    'dry_plan_has_no_side_effects: true',
    'duplicate_guard_recheck_required: true',
    'pre_mutation_backup_required: true',
    'runtime_write_enable_required: true',
    'explicit_operator_live_mutation_command_required: true',
    'post_mutation_receipt_required: true',
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
    'dry_mutation_plan_recorded_for_next_gate: true',
    'next_gate: "operator_ledger_write_runbook_pre_mutation_backup_v1"',
]
missing = [x for x in required if x not in chunk]
if missing:
    raise SystemExit("missing route fields: " + ", ".join(missing))
print("operator_ledger_write_runbook_dry_mutation_plan_sha256=" + hashlib.sha256(chunk.encode()).hexdigest())
PY

echo "VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_DRY_MUTATION_PLAN_PROOF_V1"
echo "operator_ledger_write_runbook_dry_mutation_plan_reviewed=true"
echo "operator_ledger_write_runbook_dry_mutation_plan_dry_run_only=true"
echo "operator_ledger_write_runbook_dry_mutation_plan_planned_wc_delta=1"
echo "operator_ledger_write_runbook_dry_mutation_plan_actual_write_path_selected=false"
echo "operator_ledger_write_runbook_dry_mutation_plan_live_runtime_write=false"
echo "operator_ledger_write_runbook_dry_mutation_plan_wc_ledger_write=false"
echo "operator_ledger_write_runbook_dry_mutation_plan_wc_credit_delta_now=0"
echo "operator_ledger_write_runbook_dry_mutation_plan_next_gate=operator_ledger_write_runbook_pre_mutation_backup_v1"
echo "$GREEN_MARKER"
