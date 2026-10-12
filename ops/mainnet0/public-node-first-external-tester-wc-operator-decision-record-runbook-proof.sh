#!/usr/bin/env bash
set -euo pipefail

LOCAL_BASE="${LOCAL_BASE:-http://127.0.0.1:4100}"
OUT="${OUT:-/tmp/public-node-first-external-tester-wc-operator-decision-record-runbook-proof-$(date -u +%Y%m%d-%H%M%S)}"
DATA_DIR="${DATA_DIR:-.runtime/mainnet0}"

mkdir -p "$OUT"

echo "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_OPERATOR_DECISION_RECORD_RUNBOOK_PROOF_V1"
echo "checked_at_utc=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "head=$(git rev-parse --short HEAD)"
echo "tag=$(git tag --points-at HEAD | head -1)"
echo "local_base=$LOCAL_BASE"
echo "data_dir=$DATA_DIR"
echo "out=$OUT"

DOC="docs/public/public-node-first-external-tester-wc-operator-decision-record-runbook.md"
SCRIPT="ops/mainnet0/public-node-first-external-tester-wc-operator-decision-record-runbook.sh"
DRAFT_RUNBOOK="ops/mainnet0/public-node-first-external-tester-wc-operator-decision-draft-live-runbook.sh"
REVIEW_RUNBOOK="ops/mainnet0/public-node-first-external-tester-wc-operator-review-record-runbook.sh"

test -f "$DOC"
test -x "$SCRIPT"
test -x "$DRAFT_RUNBOOK"
test -x "$REVIEW_RUNBOOK"

grep -Fq "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_OPERATOR_DECISION_RECORD_RUNBOOK_V1" "$DOC"
grep -Fq "CONFIRM_DECISION_RECORD_WRITE=I_UNDERSTAND_DECISION_RECORD_ONLY" "$DOC"
grep -Fq "decision_record_written=true" "$DOC"
grep -Fq "wc_ledger_write=false" "$DOC"
grep -Fq "wc_credit_award=false" "$DOC"
grep -Fq "wc_to_void_swap=false" "$DOC"

bash -n "$SCRIPT"
bash -n "$DRAFT_RUNBOOK"
bash -n "$REVIEW_RUNBOOK"

REFUSAL_OUT="$OUT/refusal"
mkdir -p "$REFUSAL_OUT"

set +e
LOCAL_BASE="$LOCAL_BASE" \
DATA_DIR="$OUT/refusal-runtime" \
OUT="$REFUSAL_OUT" \
DECISION_OUTCOME="deferred" \
"$SCRIPT" > "$REFUSAL_OUT/refusal.log" 2>&1
REFUSAL_STATUS=$?
set -e

test "$REFUSAL_STATUS" -ne 0
grep -Fq "explicit_confirmation_required=true" "$REFUSAL_OUT/refusal.log"
grep -Fq "confirmation_string_green=false" "$REFUSAL_OUT/refusal.log"
grep -Fq "decision_record_written=false" "$REFUSAL_OUT/refusal.log"

echo "decision_runbook_refuses_without_confirmation_green=true"

DRAFT_OUT="$OUT/source-draft"
mkdir -p "$DRAFT_OUT"

CONFIRM_LIVE_DRAFT_WRITE="I_UNDERSTAND_DRAFT_ONLY" \
LOCAL_BASE="$LOCAL_BASE" \
DATA_DIR="$DATA_DIR" \
OUT="$DRAFT_OUT" \
DECISION_STATE="deferred" \
DECISION_REASON="operator decision record proof source draft; no award or ledger write" \
OPERATOR_ID="zoso-local-operator" \
"$DRAFT_RUNBOOK" | tee "$OUT/source-draft.log"

grep -Fq "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_OPERATOR_DECISION_DRAFT_LIVE_RUNBOOK_V1_GREEN" "$OUT/source-draft.log"
grep -Fq "wc_ledger_write=false" "$OUT/source-draft.log"
grep -Fq "wc_credit_award=false" "$OUT/source-draft.log"
grep -Fq "wc_to_void_swap=false" "$OUT/source-draft.log"

echo "decision_runbook_source_draft_green=true"

REVIEW_OUT="$OUT/source-review"
mkdir -p "$REVIEW_OUT"

CONFIRM_REVIEW_RECORD_WRITE="I_UNDERSTAND_REVIEW_RECORD_ONLY" \
LOCAL_BASE="$LOCAL_BASE" \
DATA_DIR="$DATA_DIR" \
OUT="$REVIEW_OUT" \
REVIEW_OUTCOME="deferred" \
REVIEW_REASON="operator decision record proof source review; no award or ledger write" \
REVIEWER_ID="zoso-local-reviewer" \
"$REVIEW_RUNBOOK" | tee "$OUT/source-review.log"

grep -Fq "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_OPERATOR_REVIEW_RECORD_RUNBOOK_V1_GREEN" "$OUT/source-review.log"
grep -Fq "review_record_written=true" "$OUT/source-review.log"
grep -Fq "award_created_now=false" "$OUT/source-review.log"
grep -Fq "wc_ledger_write=false" "$OUT/source-review.log"
grep -Fq "wc_credit_award=false" "$OUT/source-review.log"
grep -Fq "wc_to_void_swap=false" "$OUT/source-review.log"

echo "decision_runbook_source_review_record_green=true"

DECISION_OUT="$OUT/decision-run"
mkdir -p "$DECISION_OUT"

CONFIRM_DECISION_RECORD_WRITE="I_UNDERSTAND_DECISION_RECORD_ONLY" \
LOCAL_BASE="$LOCAL_BASE" \
DATA_DIR="$DATA_DIR" \
OUT="$DECISION_OUT" \
DECISION_OUTCOME="deferred" \
DECISION_REASON="operator local decision record proof; no award or ledger write" \
DECIDER_ID="zoso-local-decider" \
"$SCRIPT" | tee "$OUT/decision-run.log"

grep -Fq "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_OPERATOR_DECISION_RECORD_RUNBOOK_V1_GREEN" "$OUT/decision-run.log"
grep -Fq "operator_decision_record_runbook_green=true" "$OUT/decision-run.log"
grep -Fq "decision_record_written=true" "$OUT/decision-run.log"
grep -Fq "decision_record_created_now=true" "$OUT/decision-run.log"
grep -Fq "decision_record_only=true" "$OUT/decision-run.log"
grep -Fq "operator_local_only=true" "$OUT/decision-run.log"
grep -Fq "operator_decision_created_now=false" "$OUT/decision-run.log"
grep -Fq "review_record_created_now=false" "$OUT/decision-run.log"
grep -Fq "award_created_now=false" "$OUT/decision-run.log"
grep -Fq "wc_ledger_mutated_now=false" "$OUT/decision-run.log"
grep -Fq "wc_credit_delta_now=0" "$OUT/decision-run.log"
grep -Fq "wc_ledger_write=false" "$OUT/decision-run.log"
grep -Fq "wc_credit_award=false" "$OUT/decision-run.log"
grep -Fq "wc_to_void_swap=false" "$OUT/decision-run.log"
grep -Fq "automatic_ledger_write_allowed=false" "$OUT/decision-run.log"
grep -Fq "award_write_allowed_now=false" "$OUT/decision-run.log"
grep -Fq "public_upload=false" "$OUT/decision-run.log"
grep -Fq "trusted_as_network_truth=false" "$OUT/decision-run.log"
grep -Fq "money_movement=false" "$OUT/decision-run.log"
grep -Fq "wallet_send=false" "$OUT/decision-run.log"
grep -Fq "buy_void_fulfillment=false" "$OUT/decision-run.log"
grep -Fq "validator_mutation=false" "$OUT/decision-run.log"

LATEST="$DATA_DIR/public-node/first-external-tester-wc-decision-records/latest-decision-record.json"
test -f "$LATEST"

python3 - "$LATEST" <<'PY2'
import json
import sys
from pathlib import Path

decision = json.loads(Path(sys.argv[1]).read_text())

assert decision.get("marker") == "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_OPERATOR_DECISION_RECORD_V1"
assert decision.get("candidate_id") == "first-external-tester-n153b-demo003-standalone-smoke-v1"
assert decision.get("decision_record_only") is True
assert decision.get("operator_local_only") is True
assert decision.get("decision_outcome") == "deferred"
assert decision.get("decider_id") == "zoso-local-decider"
assert decision.get("award_decision") == "not_created"
assert decision.get("award_write_allowed_now") is False
assert decision.get("source_review_record_marker") == "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_OPERATOR_REVIEW_RECORD_V1"

safety = decision.get("safety_boundary", {})
assert safety.get("decision_record_created_now") is True
assert safety.get("wc_credit_delta_now") == 0

for key in [
    "operator_decision_created_now",
    "review_record_created_now",
    "award_created_now",
    "wc_ledger_mutated_now",
    "wc_ledger_write",
    "wc_credit_award",
    "wc_to_void_swap",
    "automatic_ledger_write_allowed",
    "award_write_allowed_now",
    "public_upload",
    "trusted_as_network_truth",
    "money_movement",
    "wallet_send",
    "buy_void_fulfillment",
    "validator_mutation",
]:
    assert safety.get(key) is False, (key, safety.get(key))

print("decision_runbook_latest_decision_record_json_green=true")
PY2

echo "operator_decision_record_runbook_proof_green=true"
echo "decision_runbook_explicit_confirmation_green=true"
echo "local_decision_record_written=true"
echo "decision_record_created_now=true"
echo "operator_decision_created_now=false"
echo "review_record_created_now=false"
echo "award_created_now=false"
echo "wc_ledger_mutated_now=false"
echo "wc_credit_delta_now=0"
echo "wc_ledger_write=false"
echo "wc_credit_award=false"
echo "wc_to_void_swap=false"
echo "award_write_allowed_now=false"
echo "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_OPERATOR_DECISION_RECORD_RUNBOOK_PROOF_V1_GREEN"
