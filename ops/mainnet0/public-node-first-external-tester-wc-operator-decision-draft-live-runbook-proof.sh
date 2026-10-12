#!/usr/bin/env bash
set -euo pipefail

LOCAL_BASE="${LOCAL_BASE:-http://127.0.0.1:4100}"
OUT="${OUT:-/tmp/public-node-first-external-tester-wc-operator-decision-draft-live-runbook-proof-$(date -u +%Y%m%d-%H%M%S)}"
DATA_DIR="${DATA_DIR:-.runtime/mainnet0}"

mkdir -p "$OUT"

echo "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_OPERATOR_DECISION_DRAFT_LIVE_RUNBOOK_PROOF_V1"
echo "checked_at_utc=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "head=$(git rev-parse --short HEAD)"
echo "tag=$(git tag --points-at HEAD | head -1)"
echo "local_base=$LOCAL_BASE"
echo "data_dir=$DATA_DIR"
echo "out=$OUT"

DOC="docs/public/public-node-first-external-tester-wc-operator-decision-draft-live-runbook.md"
SCRIPT="ops/mainnet0/public-node-first-external-tester-wc-operator-decision-draft-live-runbook.sh"

test -f "$DOC"
test -x "$SCRIPT"

grep -Fq "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_OPERATOR_DECISION_DRAFT_LIVE_RUNBOOK_V1" "$DOC"
grep -Fq "CONFIRM_LIVE_DRAFT_WRITE=I_UNDERSTAND_DRAFT_ONLY" "$DOC"
grep -Fq "live_runtime_draft_written=true" "$DOC"
grep -Fq "wc_ledger_write=false" "$DOC"
grep -Fq "wc_credit_award=false" "$DOC"
grep -Fq "wc_to_void_swap=false" "$DOC"

bash -n "$SCRIPT"

REFUSAL_OUT="$OUT/refusal"
mkdir -p "$REFUSAL_OUT"

set +e
LOCAL_BASE="$LOCAL_BASE" \
DATA_DIR="$OUT/refusal-runtime" \
OUT="$REFUSAL_OUT" \
DECISION_STATE="deferred" \
"$SCRIPT" > "$REFUSAL_OUT/refusal.log" 2>&1
REFUSAL_STATUS=$?
set -e

test "$REFUSAL_STATUS" -ne 0
grep -Fq "explicit_confirmation_required=true" "$REFUSAL_OUT/refusal.log"
grep -Fq "confirmation_string_green=false" "$REFUSAL_OUT/refusal.log"
grep -Fq "live_runtime_draft_written=false" "$REFUSAL_OUT/refusal.log"

echo "live_runbook_refuses_without_confirmation_green=true"

LIVE_OUT="$OUT/live-run"
mkdir -p "$LIVE_OUT"

CONFIRM_LIVE_DRAFT_WRITE="I_UNDERSTAND_DRAFT_ONLY" \
LOCAL_BASE="$LOCAL_BASE" \
DATA_DIR="$DATA_DIR" \
OUT="$LIVE_OUT" \
DECISION_STATE="deferred" \
DECISION_REASON="operator local live draft proof; no award or ledger write" \
OPERATOR_ID="zoso-local-operator" \
"$SCRIPT" | tee "$OUT/live-run.log"

grep -Fq "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_OPERATOR_DECISION_DRAFT_LIVE_RUNBOOK_V1_GREEN" "$OUT/live-run.log"
grep -Fq "operator_decision_draft_live_runbook_green=true" "$OUT/live-run.log"
grep -Fq "live_runtime_draft_written=true" "$OUT/live-run.log"
grep -Fq "explicit_confirmation_required=true" "$OUT/live-run.log"
grep -Fq "confirmation_string_green=true" "$OUT/live-run.log"
grep -Fq "draft_only=true" "$OUT/live-run.log"
grep -Fq "operator_local_only=true" "$OUT/live-run.log"
grep -Fq "operator_decision_created_now=false" "$OUT/live-run.log"
grep -Fq "review_record_created_now=false" "$OUT/live-run.log"
grep -Fq "decision_record_created_now=false" "$OUT/live-run.log"
grep -Fq "award_created_now=false" "$OUT/live-run.log"
grep -Fq "wc_ledger_mutated_now=false" "$OUT/live-run.log"
grep -Fq "wc_credit_delta_now=0" "$OUT/live-run.log"
grep -Fq "wc_ledger_write=false" "$OUT/live-run.log"
grep -Fq "wc_credit_award=false" "$OUT/live-run.log"
grep -Fq "wc_to_void_swap=false" "$OUT/live-run.log"
grep -Fq "automatic_ledger_write_allowed=false" "$OUT/live-run.log"
grep -Fq "public_upload=false" "$OUT/live-run.log"
grep -Fq "trusted_as_network_truth=false" "$OUT/live-run.log"
grep -Fq "money_movement=false" "$OUT/live-run.log"
grep -Fq "wallet_send=false" "$OUT/live-run.log"
grep -Fq "buy_void_fulfillment=false" "$OUT/live-run.log"
grep -Fq "validator_mutation=false" "$OUT/live-run.log"

LATEST="$DATA_DIR/public-node/first-external-tester-wc-operator-decision-drafts/latest-draft.json"
test -f "$LATEST"

python3 - "$LATEST" <<'PY2'
import json
import sys
from pathlib import Path

latest = json.loads(Path(sys.argv[1]).read_text())
assert latest.get("marker") == "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_OPERATOR_DECISION_DRAFT_V1"
assert latest.get("draft_only") is True
assert latest.get("operator_local_only") is True
assert latest.get("decision_state") == "deferred"
assert latest.get("operator_id") == "zoso-local-operator"
assert latest.get("write_runtime_requested") is True

safety = latest.get("safety_boundary", {})
assert safety.get("wc_credit_delta_now") == 0

for key in [
    "operator_decision_created_now",
    "review_record_created_now",
    "decision_record_created_now",
    "award_created_now",
    "wc_ledger_mutated_now",
    "wc_ledger_write",
    "wc_credit_award",
    "wc_to_void_swap",
    "automatic_ledger_write_allowed",
    "public_upload",
    "trusted_as_network_truth",
    "money_movement",
    "wallet_send",
    "buy_void_fulfillment",
    "validator_mutation",
]:
    assert safety.get(key) is False, (key, safety.get(key))

print("live_runbook_latest_draft_json_green=true")
PY2

echo "operator_decision_draft_live_runbook_proof_green=true"
echo "live_runbook_explicit_confirmation_green=true"
echo "live_runtime_draft_written=true"
echo "operator_decision_created_now=false"
echo "review_record_created_now=false"
echo "decision_record_created_now=false"
echo "award_created_now=false"
echo "wc_ledger_mutated_now=false"
echo "wc_credit_delta_now=0"
echo "wc_ledger_write=false"
echo "wc_credit_award=false"
echo "wc_to_void_swap=false"
echo "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_OPERATOR_DECISION_DRAFT_LIVE_RUNBOOK_PROOF_V1_GREEN"
