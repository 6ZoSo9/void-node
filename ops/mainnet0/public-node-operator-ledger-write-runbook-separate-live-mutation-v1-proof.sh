#!/usr/bin/env bash
set -euo pipefail

SRC="src/index.ts"
DOC="docs/public/public-node-operator-ledger-write-runbook-separate-live-mutation-v1.md"

MARKER="VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_SEPARATE_LIVE_MUTATION_V1"
ROUTE_MARKER="VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_SEPARATE_LIVE_MUTATION_ROUTE_V1"
UI_MARKER="VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_SEPARATE_LIVE_MUTATION_UI_V1"
DOC_MARKER="VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_SEPARATE_LIVE_MUTATION_DOC_V1"
GREEN_MARKER="VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_SEPARATE_LIVE_MUTATION_PROOF_V1_GREEN"

ROUTE="/public-node/operator-ledger-write-runbook-separate-live-mutation-v1.json"

grep -Fq "$MARKER" "$SRC"
grep -Fq "$ROUTE_MARKER" "$SRC"
grep -Fq "$UI_MARKER" "$SRC"
grep -Fq "$ROUTE" "$SRC"

test -f "$DOC"
grep -Fq "$DOC_MARKER" "$DOC"
grep -Fq "$ROUTE" "$DOC"
grep -Fq "src/http/datanet_routes.ts" "$DOC"
grep -Fq "src/index.ts" "$DOC"

python3 - <<'PY'
from pathlib import Path
import hashlib
s = Path("src/index.ts").read_text()
start = s.index('APP.get("/public-node/operator-ledger-write-runbook-separate-live-mutation-v1.json"')
end = s.index('APP.get("/public-node/operator-ledger-write-runbook-final-apply-v1.json"', start)
chunk = s[start:end]
required = [
    'separate_live_mutation_reviewed: true',
    'mutation_path_identified: true',
    'final_apply_reviewed: true',
    'final_apply_review_passed: true',
    'requested_now: true',
    'live_write_unlocked_for_final_apply: true',
    'selected_wc_delta: 1',
    'selected_wc_delta_unit: "WC"',
    'mutation_requires_new_explicit_operator_command: true',
    'mutation_requires_runtime_write_enable: true',
    'mutation_requires_duplicate_guard_recheck: true',
    'mutation_requires_pre_mutation_backup: true',
    'mutation_requires_post_mutation_receipt: true',
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
    'separate_live_mutation_recorded_for_next_gate: true',
    'operator_must_run_dry_mutation_plan_after_this_gate: true',
    'next_gate: "operator_ledger_write_runbook_dry_mutation_plan_v1"',
]
missing = [x for x in required if x not in chunk]
if missing:
    raise SystemExit("missing route fields: " + ", ".join(missing))
print("operator_ledger_write_runbook_separate_live_mutation_sha256=" + hashlib.sha256(chunk.encode()).hexdigest())
PY

echo "VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_SEPARATE_LIVE_MUTATION_PROOF_V1"
echo "operator_ledger_write_runbook_separate_live_mutation_reviewed=true"
echo "operator_ledger_write_runbook_separate_live_mutation_path_identified=true"
echo "operator_ledger_write_runbook_separate_live_mutation_requested_now=true"
echo "operator_ledger_write_runbook_separate_live_mutation_live_runtime_write=false"
echo "operator_ledger_write_runbook_separate_live_mutation_wc_ledger_write=false"
echo "operator_ledger_write_runbook_separate_live_mutation_wc_credit_delta_now=0"
echo "operator_ledger_write_runbook_separate_live_mutation_next_gate=operator_ledger_write_runbook_dry_mutation_plan_v1"
echo "$GREEN_MARKER"
