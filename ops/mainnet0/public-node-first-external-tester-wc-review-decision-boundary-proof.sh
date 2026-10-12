#!/usr/bin/env bash
set -euo pipefail

LOCAL_BASE="${LOCAL_BASE:-http://127.0.0.1:4100}"
OUT="${OUT:-/tmp/public-node-first-external-tester-wc-review-decision-boundary-proof-$(date -u +%Y%m%d-%H%M%S)}"

mkdir -p "$OUT"

echo "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_REVIEW_DECISION_BOUNDARY_PROOF_V1"
echo "checked_at_utc=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "head=$(git rev-parse --short HEAD)"
echo "tag=$(git tag --points-at HEAD | head -1)"
echo "local_base=$LOCAL_BASE"
echo "out=$OUT"

grep -Fq "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_REVIEW_DECISION_BOUNDARY_V1" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_REVIEW_DECISION_BOUNDARY_ROUTE_V1" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_REVIEW_DECISION_BOUNDARY_UI_V1" src/index.ts
grep -Fq "/public-node/first-external-tester-wc-review-decision-boundary.json" src/index.ts
grep -Fq "publicNodeFirstExternalTesterWcReviewDecisionBoundaryCard" src/index.ts
grep -Fq "allowed_states_only_no_decision_record_created" src/index.ts
grep -Fq 'allowed_decision_states: ["accepted", "rejected", "deferred"]' src/index.ts
grep -Fq 'current_decision_state: "not_decided"' src/index.ts
grep -Fq "decision_record_created_now: false" src/index.ts
grep -Fq "review_record_created_now: false" src/index.ts
grep -Fq "award_created_now: false" src/index.ts
grep -Fq "wc_decision_record_write: false" src/index.ts
grep -Fq "wc_review_record_write: false" src/index.ts
grep -Fq "wc_ledger_write: false" src/index.ts
grep -Fq "wc_credit_award: false" src/index.ts
grep -Fq "wc_to_void_swap: false" src/index.ts
grep -Fq "automatic_ledger_write_allowed: false" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_REVIEW_DECISION_BOUNDARY_DOC_V1" docs/public/public-node-first-external-tester-wc-review-decision-boundary.md

bash -n ops/mainnet0/public-node-first-external-tester-wc-review-decision-boundary-proof.sh

echo "source_markers_green=true"
echo "route=/public-node/first-external-tester-wc-review-decision-boundary.json"
echo "ui_marker=VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_REVIEW_DECISION_BOUNDARY_UI_V1"
echo "card_id=publicNodeFirstExternalTesterWcReviewDecisionBoundaryCard"
echo "boundary_state=allowed_states_only_no_decision_record_created"
echo "allowed_decision_states=accepted,rejected,deferred"
echo "current_decision_state=not_decided"
echo "decision_record_created_now=false"
echo "review_record_created_now=false"
echo "award_created_now=false"
echo "wc_decision_record_write=false"
echo "wc_review_record_write=false"
echo "wc_ledger_write=false"
echo "wc_credit_award=false"
echo "wc_to_void_swap=false"
echo "automatic_ledger_write_allowed=false"
echo "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_REVIEW_DECISION_BOUNDARY_PROOF_V1_GREEN"
