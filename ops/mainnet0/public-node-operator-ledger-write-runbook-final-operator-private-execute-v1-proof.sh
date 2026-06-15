#!/usr/bin/env bash
set -euo pipefail

SRC="src/index.ts"
DOC="docs/public/public-node-operator-ledger-write-runbook-final-operator-private-execute-v1.md"
DUP="ops/mainnet0/public-node-operator-ledger-write-runbook-duplicate-guard-recheck-v1.sh"

MARKER="VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_FINAL_OPERATOR_PRIVATE_EXECUTE_V1"
ROUTE_MARKER="VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_FINAL_OPERATOR_PRIVATE_EXECUTE_ROUTE_V1"
UI_MARKER="VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_FINAL_OPERATOR_PRIVATE_EXECUTE_UI_V1"
DOC_MARKER="VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_FINAL_OPERATOR_PRIVATE_EXECUTE_DOC_V1"
GREEN_MARKER="VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_FINAL_OPERATOR_PRIVATE_EXECUTE_PROOF_V1_GREEN"

ROUTE="/public-node/operator-ledger-write-runbook-final-operator-private-execute-v1.json"

grep -Fq "$MARKER" "$SRC"
grep -Fq "$ROUTE_MARKER" "$SRC"
grep -Fq "$UI_MARKER" "$SRC"
grep -Fq "$ROUTE" "$SRC"

test -f "$DOC"
grep -Fq "$DOC_MARKER" "$DOC"
grep -Fq "$ROUTE" "$DOC"
grep -Fq "does not reveal, print, execute, or allow execution" "$DOC"
grep -Fq "does not reveal, print, execute, or allow execution" "$SRC"

test -x "$DUP"
bash -n "$DUP"

python3 - <<'PY'
from pathlib import Path
import hashlib
s = Path("src/index.ts").read_text()
start = s.index('APP.get("/public-node/operator-ledger-write-runbook-final-operator-private-execute-v1.json"')
end = s.index('APP.get("/public-node/operator-ledger-write-runbook-private-live-mutation-command-hold-v1.json"', start)
chunk = s[start:end]
required = [
    'final_operator_private_execute_boundary: true',
    'final_operator_private_execute_checkpoint_recorded: true',
    'private_execute_readiness_recorded: true',
    'private_operator_execute_required_later: true',
    'private_operator_command_held_outside_public_route: true',
    'private_operator_command_publicly_withheld: true',
    'private_operator_command_revealed_publicly: false',
    'private_operator_command_printed_now: false',
    'private_operator_command_executed_now: false',
    'private_operator_execution_performed_now: false',
    'command_execution_allowed_now: false',
    'automatic_execute_allowed: false',
    'command_channel_public_safe: true',
    'public_route_contains_secret: false',
    'public_route_contains_private_command: false',
    'private_live_mutation_command_hold_green_required: true',
    'private_live_mutation_command_request_green_required: true',
    'final_live_mutation_execute_packet_green_required: true',
    'final_mutation_command_hold_green_required: true',
    'pre_mutation_backup_execute_green_required: true',
    'duplicate_guard_recheck_green_required: true',
    'duplicate_found_by_expected_clean_scan: false',
    'duplicate_blocked_by_expected_clean_scan: false',
    'planned_wc_delta: 1',
    'planned_wc_delta_unit: "WC"',
    'planned_entry_kind: "wc_delta"',
    'planned_subject: "first_external_tester_operator_ledger_write_readiness_fixture"',
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
    'next_gate: "operator_ledger_write_runbook_operator_terminal_execute_review_v1"',
]
missing = [x for x in required if x not in chunk]
if missing:
    raise SystemExit("missing route fields: " + ", ".join(missing))
print("operator_ledger_write_runbook_final_operator_private_execute_route_sha256=" + hashlib.sha256(chunk.encode()).hexdigest())
PY

RUN_LOG="$(mktemp)"
"$DUP" > "$RUN_LOG"

grep -Fq "operator_ledger_write_runbook_duplicate_guard_recheck_duplicate_found=false" "$RUN_LOG"
grep -Fq "operator_ledger_write_runbook_duplicate_guard_recheck_blocked=false" "$RUN_LOG"
grep -Fq "operator_ledger_write_runbook_duplicate_guard_recheck_read_only_scan=true" "$RUN_LOG"
grep -Fq "operator_ledger_write_runbook_duplicate_guard_recheck_live_runtime_write=false" "$RUN_LOG"
grep -Fq "operator_ledger_write_runbook_duplicate_guard_recheck_wc_ledger_write=false" "$RUN_LOG"
grep -Fq "operator_ledger_write_runbook_duplicate_guard_recheck_wc_credit_delta_now=0" "$RUN_LOG"

cat "$RUN_LOG"

echo "VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_FINAL_OPERATOR_PRIVATE_EXECUTE_PROOF_V1"
echo "operator_ledger_write_runbook_final_operator_private_execute_boundary=true"
echo "operator_ledger_write_runbook_final_operator_private_execute_checkpoint_recorded=true"
echo "operator_ledger_write_runbook_final_operator_private_execute_private_command_held_outside_public_route=true"
echo "operator_ledger_write_runbook_final_operator_private_execute_private_command_publicly_withheld=true"
echo "operator_ledger_write_runbook_final_operator_private_execute_private_command_revealed_publicly=false"
echo "operator_ledger_write_runbook_final_operator_private_execute_private_command_printed_now=false"
echo "operator_ledger_write_runbook_final_operator_private_execute_private_command_executed_now=false"
echo "operator_ledger_write_runbook_final_operator_private_execute_execution_performed_now=false"
echo "operator_ledger_write_runbook_final_operator_private_execute_execution_allowed_now=false"
echo "operator_ledger_write_runbook_final_operator_private_execute_automatic_execute_allowed=false"
echo "operator_ledger_write_runbook_final_operator_private_execute_public_route_contains_secret=false"
echo "operator_ledger_write_runbook_final_operator_private_execute_public_route_contains_private_command=false"
echo "operator_ledger_write_runbook_final_operator_private_execute_duplicate_found=false"
echo "operator_ledger_write_runbook_final_operator_private_execute_live_runtime_write=false"
echo "operator_ledger_write_runbook_final_operator_private_execute_wc_ledger_write=false"
echo "operator_ledger_write_runbook_final_operator_private_execute_wc_credit_delta_now=0"
echo "operator_ledger_write_runbook_final_operator_private_execute_next_gate=operator_ledger_write_runbook_operator_terminal_execute_review_v1"
echo "$GREEN_MARKER"
