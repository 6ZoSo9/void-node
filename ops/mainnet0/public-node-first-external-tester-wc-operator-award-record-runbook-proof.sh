#!/usr/bin/env bash
set -euo pipefail

LOCAL_BASE="${LOCAL_BASE:-http://127.0.0.1:4100}"
OUT="${OUT:-/tmp/public-node-first-external-tester-wc-operator-award-record-runbook-proof-$(date -u +%Y%m%d-%H%M%S)}"
DATA_DIR="${DATA_DIR:-.runtime/mainnet0}"

mkdir -p "$OUT"

echo "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_OPERATOR_AWARD_RECORD_RUNBOOK_PROOF_V1"
echo "checked_at_utc=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "head=$(git rev-parse --short HEAD)"
echo "tag=$(git tag --points-at HEAD | head -1)"
echo "local_base=$LOCAL_BASE"
echo "data_dir=$DATA_DIR"
echo "out=$OUT"

DOC="docs/public/public-node-first-external-tester-wc-operator-award-record-runbook.md"
SCRIPT="ops/mainnet0/public-node-first-external-tester-wc-operator-award-record-runbook.sh"
DRAFT_RUNBOOK="ops/mainnet0/public-node-first-external-tester-wc-operator-decision-draft-live-runbook.sh"
REVIEW_RUNBOOK="ops/mainnet0/public-node-first-external-tester-wc-operator-review-record-runbook.sh"
DECISION_RUNBOOK="ops/mainnet0/public-node-first-external-tester-wc-operator-decision-record-runbook.sh"
INTENT_RUNBOOK="ops/mainnet0/public-node-first-external-tester-wc-operator-award-intent-packet-runbook.sh"

test -f "$DOC"
test -x "$SCRIPT"
test -x "$DRAFT_RUNBOOK"
test -x "$REVIEW_RUNBOOK"
test -x "$DECISION_RUNBOOK"
test -x "$INTENT_RUNBOOK"

grep -Fq "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_OPERATOR_AWARD_RECORD_RUNBOOK_V1" "$DOC"
grep -Fq "CONFIRM_AWARD_RECORD_WRITE=I_UNDERSTAND_AWARD_RECORD_ONLY" "$DOC"
grep -Fq "award_record_written=true" "$DOC"
grep -Fq "wc_ledger_write=false" "$DOC"
grep -Fq "wc_credit_award=false" "$DOC"
grep -Fq "wc_to_void_swap=false" "$DOC"

bash -n "$SCRIPT"
bash -n "$DRAFT_RUNBOOK"
bash -n "$REVIEW_RUNBOOK"
bash -n "$DECISION_RUNBOOK"
bash -n "$INTENT_RUNBOOK"

REFUSAL_OUT="$OUT/refusal"
mkdir -p "$REFUSAL_OUT"

set +e
LOCAL_BASE="$LOCAL_BASE" \
DATA_DIR="$OUT/refusal-runtime" \
OUT="$REFUSAL_OUT" \
AWARD_RECORD_STATE="deferred" \
"$SCRIPT" > "$REFUSAL_OUT/refusal.log" 2>&1
REFUSAL_STATUS=$?
set -e

test "$REFUSAL_STATUS" -ne 0
grep -Fq "explicit_confirmation_required=true" "$REFUSAL_OUT/refusal.log"
grep -Fq "confirmation_string_green=false" "$REFUSAL_OUT/refusal.log"
grep -Fq "award_record_written=false" "$REFUSAL_OUT/refusal.log"

echo "award_record_runbook_refuses_without_confirmation_green=true"

DRAFT_OUT="$OUT/source-draft"
mkdir -p "$DRAFT_OUT"

CONFIRM_LIVE_DRAFT_WRITE="I_UNDERSTAND_DRAFT_ONLY" \
LOCAL_BASE="$LOCAL_BASE" \
DATA_DIR="$DATA_DIR" \
OUT="$DRAFT_OUT" \
DECISION_STATE="deferred" \
DECISION_REASON="award record proof source draft; no ledger write" \
OPERATOR_ID="zoso-local-operator" \
"$DRAFT_RUNBOOK" | tee "$OUT/source-draft.log"

grep -Fq "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_OPERATOR_DECISION_DRAFT_LIVE_RUNBOOK_V1_GREEN" "$OUT/source-draft.log"
grep -Fq "wc_ledger_write=false" "$OUT/source-draft.log"
grep -Fq "wc_credit_award=false" "$OUT/source-draft.log"
grep -Fq "wc_to_void_swap=false" "$OUT/source-draft.log"

echo "award_record_runbook_source_draft_green=true"

REVIEW_OUT="$OUT/source-review"
mkdir -p "$REVIEW_OUT"

CONFIRM_REVIEW_RECORD_WRITE="I_UNDERSTAND_REVIEW_RECORD_ONLY" \
LOCAL_BASE="$LOCAL_BASE" \
DATA_DIR="$DATA_DIR" \
OUT="$REVIEW_OUT" \
REVIEW_OUTCOME="deferred" \
REVIEW_REASON="award record proof source review; no ledger write" \
REVIEWER_ID="zoso-local-reviewer" \
"$REVIEW_RUNBOOK" | tee "$OUT/source-review.log"

grep -Fq "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_OPERATOR_REVIEW_RECORD_RUNBOOK_V1_GREEN" "$OUT/source-review.log"
grep -Fq "award_created_now=false" "$OUT/source-review.log"
grep -Fq "wc_ledger_write=false" "$OUT/source-review.log"
grep -Fq "wc_credit_award=false" "$OUT/source-review.log"
grep -Fq "wc_to_void_swap=false" "$OUT/source-review.log"

echo "award_record_runbook_source_review_record_green=true"

DECISION_OUT="$OUT/source-decision"
mkdir -p "$DECISION_OUT"

CONFIRM_DECISION_RECORD_WRITE="I_UNDERSTAND_DECISION_RECORD_ONLY" \
LOCAL_BASE="$LOCAL_BASE" \
DATA_DIR="$DATA_DIR" \
OUT="$DECISION_OUT" \
DECISION_OUTCOME="deferred" \
DECISION_REASON="award record proof source decision; no ledger write" \
DECIDER_ID="zoso-local-decider" \
"$DECISION_RUNBOOK" | tee "$OUT/source-decision.log"

grep -Fq "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_OPERATOR_DECISION_RECORD_RUNBOOK_V1_GREEN" "$OUT/source-decision.log"
grep -Fq "decision_record_written=true" "$OUT/source-decision.log"
grep -Fq "award_created_now=false" "$OUT/source-decision.log"
grep -Fq "award_write_allowed_now=false" "$OUT/source-decision.log"
grep -Fq "wc_ledger_write=false" "$OUT/source-decision.log"
grep -Fq "wc_credit_award=false" "$OUT/source-decision.log"
grep -Fq "wc_to_void_swap=false" "$OUT/source-decision.log"

echo "award_record_runbook_source_decision_record_green=true"

INTENT_OUT="$OUT/source-award-intent"
mkdir -p "$INTENT_OUT"

CONFIRM_AWARD_INTENT_WRITE="I_UNDERSTAND_AWARD_INTENT_ONLY" \
LOCAL_BASE="$LOCAL_BASE" \
DATA_DIR="$DATA_DIR" \
OUT="$INTENT_OUT" \
AWARD_INTENT_STATE="deferred" \
PROPOSED_WC_DELTA="0" \
INTENT_REASON="award record proof source intent; no ledger write" \
OPERATOR_ID="zoso-local-award-intent-operator" \
"$INTENT_RUNBOOK" | tee "$OUT/source-award-intent.log"

grep -Fq "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_OPERATOR_AWARD_INTENT_PACKET_RUNBOOK_V1_GREEN" "$OUT/source-award-intent.log"
grep -Fq "award_intent_packet_written=true" "$OUT/source-award-intent.log"
grep -Fq "award_created_now=false" "$OUT/source-award-intent.log"
grep -Fq "award_write_allowed_now=false" "$OUT/source-award-intent.log"
grep -Fq "wc_ledger_write=false" "$OUT/source-award-intent.log"
grep -Fq "wc_credit_award=false" "$OUT/source-award-intent.log"
grep -Fq "wc_to_void_swap=false" "$OUT/source-award-intent.log"

echo "award_record_runbook_source_award_intent_packet_green=true"

AWARD_OUT="$OUT/award-record-run"
mkdir -p "$AWARD_OUT"

CONFIRM_AWARD_RECORD_WRITE="I_UNDERSTAND_AWARD_RECORD_ONLY" \
LOCAL_BASE="$LOCAL_BASE" \
DATA_DIR="$DATA_DIR" \
OUT="$AWARD_OUT" \
AWARD_RECORD_STATE="deferred" \
AWARD_REASON="operator local award record proof; no WC ledger write" \
OPERATOR_ID="zoso-local-award-record-operator" \
"$SCRIPT" | tee "$OUT/award-record-run.log"

grep -Fq "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_OPERATOR_AWARD_RECORD_RUNBOOK_V1_GREEN" "$OUT/award-record-run.log"
grep -Fq "operator_award_record_runbook_green=true" "$OUT/award-record-run.log"
grep -Fq "award_record_written=true" "$OUT/award-record-run.log"
grep -Fq "award_record_created_now=true" "$OUT/award-record-run.log"
grep -Fq "award_record_only=true" "$OUT/award-record-run.log"
grep -Fq "operator_local_only=true" "$OUT/award-record-run.log"
grep -Fq "award_created_now=false" "$OUT/award-record-run.log"
grep -Fq "award_write_allowed_now=false" "$OUT/award-record-run.log"
grep -Fq "wc_ledger_mutated_now=false" "$OUT/award-record-run.log"
grep -Fq "wc_credit_delta_now=0" "$OUT/award-record-run.log"
grep -Fq "proposed_wc_delta_only=true" "$OUT/award-record-run.log"
grep -Fq "ledger_record_created_now=false" "$OUT/award-record-run.log"
grep -Fq "wc_ledger_write=false" "$OUT/award-record-run.log"
grep -Fq "wc_credit_award=false" "$OUT/award-record-run.log"
grep -Fq "wc_to_void_swap=false" "$OUT/award-record-run.log"
grep -Fq "automatic_ledger_write_allowed=false" "$OUT/award-record-run.log"
grep -Fq "public_upload=false" "$OUT/award-record-run.log"
grep -Fq "trusted_as_network_truth=false" "$OUT/award-record-run.log"

LATEST="$DATA_DIR/public-node/first-external-tester-wc-award-records/latest-award-record.json"
test -f "$LATEST"

python3 - "$LATEST" <<'PY2'
import json
import sys
from pathlib import Path

award = json.loads(Path(sys.argv[1]).read_text())

assert award.get("marker") == "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_OPERATOR_AWARD_RECORD_V1"
assert award.get("candidate_id") == "first-external-tester-n153b-demo003-standalone-smoke-v1"
assert award.get("award_record_only") is True
assert award.get("operator_local_only") is True
assert award.get("award_record_state") == "deferred"
assert award.get("proposed_wc_delta_only") is True
assert award.get("ledger_write_required_before_credit") is True
assert award.get("ledger_record_created_now") is False
assert award.get("credited_wc_delta") == 0
assert award.get("source_award_intent_packet_marker") == "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_OPERATOR_AWARD_INTENT_PACKET_V1"

safety = award.get("safety_boundary", {})
assert safety.get("award_record_created_now") is True
assert safety.get("wc_credit_delta_now") == 0

for key in [
    "operator_decision_created_now",
    "review_record_created_now",
    "decision_record_created_now",
    "award_intent_packet_created_now",
    "award_created_now",
    "award_write_allowed_now",
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

print("award_record_runbook_latest_record_json_green=true")
PY2

echo "operator_award_record_runbook_proof_green=true"
echo "award_record_runbook_explicit_confirmation_green=true"
echo "local_award_record_written=true"
echo "award_record_created_now=true"
echo "award_created_now=false"
echo "award_write_allowed_now=false"
echo "wc_ledger_mutated_now=false"
echo "wc_credit_delta_now=0"
echo "ledger_record_created_now=false"
echo "wc_ledger_write=false"
echo "wc_credit_award=false"
echo "wc_to_void_swap=false"
echo "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_OPERATOR_AWARD_RECORD_RUNBOOK_PROOF_V1_GREEN"
