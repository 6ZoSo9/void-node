#!/usr/bin/env bash
set -euo pipefail

LOCAL_BASE="${LOCAL_BASE:-http://127.0.0.1:4100}"
OUT="${OUT:-/tmp/public-node-first-external-tester-wc-review-checklist-proof-$(date -u +%Y%m%d-%H%M%S)}"

mkdir -p "$OUT"

echo "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_REVIEW_CHECKLIST_PROOF_V1"
echo "checked_at_utc=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "head=$(git rev-parse --short HEAD)"
echo "tag=$(git tag --points-at HEAD | head -1)"
echo "local_base=$LOCAL_BASE"
echo "out=$OUT"

grep -Fq "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_REVIEW_CHECKLIST_V1" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_REVIEW_CHECKLIST_ROUTE_V1" src/index.ts
grep -Fq "/public-node/first-external-tester-wc-review-checklist.json" src/index.ts
grep -Fq "first-external-tester-n153b-demo003-standalone-smoke-v1" src/index.ts
grep -Fq "review_state: \"pending_operator_review\"" src/index.ts
grep -Fq "checklist_status: \"open\"" src/index.ts
grep -Fq "review_required_before_award: true" src/index.ts
grep -Fq "award_decision: \"not_decided\"" src/index.ts
grep -Fq "manual_operator_acceptance_required: true" src/index.ts
grep -Fq "ledger_write_allowed_now: false" src/index.ts
grep -Fq "confirm_no_existing_award: true" src/index.ts
grep -Fq "award_created_now: false" src/index.ts
grep -Fq "wc_ledger_mutated_now: false" src/index.ts
grep -Fq "wc_credit_delta_now: 0" src/index.ts
grep -Fq "proposed_wc_credit_delta: null" src/index.ts
grep -Fq "wc_to_void_swap: false" src/index.ts
grep -Fq "money_movement: false" src/index.ts
grep -Fq "wallet_send: false" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_REVIEW_CHECKLIST_DOC_V1" docs/public/public-node-first-external-tester-wc-review-checklist.md
bash -n ops/mainnet0/public-node-first-external-tester-wc-review-checklist-proof.sh

echo "source_markers_green=true"
echo "route=/public-node/first-external-tester-wc-review-checklist.json"
echo "candidate_id=first-external-tester-n153b-demo003-standalone-smoke-v1"
echo "review_state=pending_operator_review"
echo "checklist_status=open"
echo "review_required_before_award=true"
echo "award_decision=not_decided"
echo "ledger_write_allowed_now=false"
echo "award_created_now=false"
echo "wc_ledger_mutated_now=false"
echo "wc_credit_delta_now=0"
echo "wc_to_void_swap=false"
echo "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_REVIEW_CHECKLIST_PROOF_V1_GREEN"
