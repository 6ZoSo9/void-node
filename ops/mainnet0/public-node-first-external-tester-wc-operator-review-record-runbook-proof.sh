#!/usr/bin/env bash
set -euo pipefail

LOCAL_BASE="${LOCAL_BASE:-http://127.0.0.1:4100}"
OUT="${OUT:-/tmp/public-node-first-external-tester-wc-operator-review-record-runbook-proof-$(date -u +%Y%m%d-%H%M%S)}"
DATA_DIR="${DATA_DIR:-.runtime/mainnet0}"

mkdir -p "$OUT"

echo "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_OPERATOR_REVIEW_RECORD_RUNBOOK_PROOF_V1"
echo "checked_at_utc=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "head=$(git rev-parse --short HEAD)"
echo "tag=$(git tag --points-at HEAD | head -1)"
echo "local_base=$LOCAL_BASE"
echo "data_dir=$DATA_DIR"
echo "out=$OUT"

DOC="docs/public/public-node-first-external-tester-wc-operator-review-record-runbook.md"
SCRIPT="ops/mainnet0/public-node-first-external-tester-wc-operator-review-record-runbook.sh"
DRAFT_RUNBOOK="ops/mainnet0/public-node-first-external-tester-wc-operator-decision-draft-live-runbook.sh"

test -f "$DOC"
test -x "$SCRIPT"
test -x "$DRAFT_RUNBOOK"

grep -Fq "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_OPERATOR_REVIEW_RECORD_RUNBOOK_V1" "$DOC"
grep -Fq "CONFIRM_REVIEW_RECORD_WRITE=I_UNDERSTAND_REVIEW_RECORD_ONLY" "$DOC"
grep -Fq "review_record_written=true" "$DOC"
grep -Fq "wc_ledger_write=false" "$DOC"
grep -Fq "wc_credit_award=false" "$DOC"
grep -Fq "wc_to_void_swap=false" "$DOC"

bash -n "$SCRIPT"
bash -n "$DRAFT_RUNBOOK"

REFUSAL_OUT="$OUT/refusal"
mkdir -p "$REFUSAL_OUT"

set +e
LOCAL_BASE="$LOCAL_BASE" \
DATA_DIR="$OUT/refusal-runtime" \
OUT="$REFUSAL_OUT" \
REVIEW_OUTCOME="deferred" \
"$SCRIPT" > "$REFUSAL_OUT/refusal.log" 2>&1
REFUSAL_STATUS=$?
set -e

test "$REFUSAL_STATUS" -ne 0
grep -Fq "explicit_confirmation_required=true" "$REFUSAL_OUT/refusal.log"
grep -Fq "confirmation_string_green=false" "$REFUSAL_OUT/refusal.log"
grep -Fq "review_record_written=false" "$REFUSAL_OUT/refusal.log"

echo "review_runbook_refuses_without_confirmation_green=true"

DRAFT_OUT="$OUT/source-draft"
mkdir -p "$DRAFT_OUT"

CONFIRM_LIVE_DRAFT_WRITE="I_UNDERSTAND_DRAFT_ONLY" \
LOCAL_BASE="$LOCAL_BASE" \
DATA_DIR="$DATA_DIR" \
OUT="$DRAFT_OUT" \
DECISION_STATE="deferred" \
DECISION_REASON="operator review record proof source draft; no award or ledger write" \
OPERATOR_ID="zoso-local-operator" \
"$DRAFT_RUNBOOK" | tee "$OUT/source-draft.log"

grep -Fq "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_OPERATOR_DECISION_DRAFT_LIVE_RUNBOOK_V1_GREEN" "$OUT/source-draft.log"
grep -Fq "live_runtime_draft_written=true" "$OUT/source-draft.log"
grep -Fq "wc_ledger_write=false" "$OUT/source-draft.log"
grep -Fq "wc_credit_award=false" "$OUT/source-draft.log"
grep -Fq "wc_to_void_swap=false" "$OUT/source-draft.log"

echo "review_runbook_source_draft_green=true"

REVIEW_OUT="$OUT/review-run"
mkdir -p "$REVIEW_OUT"

CONFIRM_REVIEW_RECORD_WRITE="I_UNDERSTAND_REVIEW_RECORD_ONLY" \
LOCAL_BASE="$LOCAL_BASE" \
DATA_DIR="$DATA_DIR" \
OUT="$REVIEW_OUT" \
REVIEW_OUTCOME="deferred" \
REVIEW_REASON="operator local review record proof; no award or ledger write" \
REVIEWER_ID="zoso-local-reviewer" \
"$SCRIPT" | tee "$OUT/review-run.log"

grep -Fq "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_OPERATOR_REVIEW_RECORD_RUNBOOK_V1_GREEN" "$OUT/review-run.log"
grep -Fq "operator_review_record_runbook_green=true" "$OUT/review-run.log"
grep -Fq "review_record_written=true" "$OUT/review-run.log"
grep -Fq "review_record_created_now=true" "$OUT/review-run.log"
grep -Fq "review_record_only=true" "$OUT/review-run.log"
grep -Fq "operator_local_only=true" "$OUT/review-run.log"
grep -Fq "operator_decision_created_now=false" "$OUT/review-run.log"
grep -Fq "decision_record_created_now=false" "$OUT/review-run.log"
grep -Fq "award_created_now=false" "$OUT/review-run.log"
grep -Fq "wc_ledger_mutated_now=false" "$OUT/review-run.log"
grep -Fq "wc_credit_delta_now=0" "$OUT/review-run.log"
grep -Fq "wc_ledger_write=false" "$OUT/review-run.log"
grep -Fq "wc_credit_award=false" "$OUT/review-run.log"
grep -Fq "wc_to_void_swap=false" "$OUT/review-run.log"
grep -Fq "automatic_ledger_write_allowed=false" "$OUT/review-run.log"
grep -Fq "public_upload=false" "$OUT/review-run.log"
grep -Fq "trusted_as_network_truth=false" "$OUT/review-run.log"
grep -Fq "money_movement=false" "$OUT/review-run.log"
grep -Fq "wallet_send=false" "$OUT/review-run.log"
grep -Fq "buy_void_fulfillment=false" "$OUT/review-run.log"
grep -Fq "validator_mutation=false" "$OUT/review-run.log"

LATEST="$DATA_DIR/public-node/first-external-tester-wc-review-records/latest-review-record.json"
test -f "$LATEST"

python3 - "$LATEST" <<'PY2'
import json
import sys
from pathlib import Path

review = json.loads(Path(sys.argv[1]).read_text())

assert review.get("marker") == "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_OPERATOR_REVIEW_RECORD_V1"
assert review.get("candidate_id") == "first-external-tester-n153b-demo003-standalone-smoke-v1"
assert review.get("review_record_only") is True
assert review.get("operator_local_only") is True
assert review.get("review_outcome") == "deferred"
assert review.get("reviewer_id") == "zoso-local-reviewer"
assert review.get("award_decision") == "not_decided"
assert review.get("source_draft_marker") == "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_OPERATOR_DECISION_DRAFT_V1"

safety = review.get("safety_boundary", {})
assert safety.get("review_record_created_now") is True
assert safety.get("wc_credit_delta_now") == 0

for key in [
    "operator_decision_created_now",
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

print("review_runbook_latest_review_record_json_green=true")
PY2

echo "operator_review_record_runbook_proof_green=true"
echo "review_runbook_explicit_confirmation_green=true"
echo "local_review_record_written=true"
echo "review_record_created_now=true"
echo "operator_decision_created_now=false"
echo "decision_record_created_now=false"
echo "award_created_now=false"
echo "wc_ledger_mutated_now=false"
echo "wc_credit_delta_now=0"
echo "wc_ledger_write=false"
echo "wc_credit_award=false"
echo "wc_to_void_swap=false"
echo "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_OPERATOR_REVIEW_RECORD_RUNBOOK_PROOF_V1_GREEN"
