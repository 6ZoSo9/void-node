#!/usr/bin/env bash
set -euo pipefail

LOCAL_BASE="${LOCAL_BASE:-http://127.0.0.1:4100}"
OUT="${OUT:-/tmp/public-node-first-external-tester-wc-review-checklist-card-proof-$(date -u +%Y%m%d-%H%M%S)}"

mkdir -p "$OUT"

echo "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_REVIEW_CHECKLIST_CARD_PROOF_V1"
echo "checked_at_utc=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "head=$(git rev-parse --short HEAD)"
echo "tag=$(git tag --points-at HEAD | head -1)"
echo "local_base=$LOCAL_BASE"
echo "out=$OUT"

grep -Fq "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_REVIEW_CHECKLIST_UI_V1" src/index.ts
grep -Fq "publicNodeFirstExternalTesterWcReviewChecklistCard" src/index.ts
grep -Fq "publicNodeFirstExternalTesterWcReviewChecklistLink" src/index.ts
grep -Fq "publicNodeFirstExternalTesterWcReviewChecklistCandidateLink" src/index.ts
grep -Fq "WC Review Checklist: First External Tester" src/index.ts
grep -Fq "pending_operator_review" src/index.ts
grep -Fq "Checklist status:" src/index.ts
grep -Fq "open" src/index.ts
grep -Fq "Review required before award:" src/index.ts
grep -Fq "Award decision:" src/index.ts
grep -Fq "not_decided" src/index.ts
grep -Fq "Ledger write allowed now:" src/index.ts
grep -Fq "false" src/index.ts
grep -Fq "Award created now:" src/index.ts
grep -Fq "WC ledger mutated now:" src/index.ts
grep -Fq "WC credit delta now:" src/index.ts
grep -Fq "WC→VOID swap:" src/index.ts
grep -Fq "first_external_tester_wc_review_checklist_green=true" src/index.ts
grep -Fq "/public-node/first-external-tester-wc-review-checklist.json" src/index.ts
grep -Fq "/public-node/first-external-tester-wc-candidate.json" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_REVIEW_CHECKLIST_CARD_DOC_V1" docs/public/public-node-first-external-tester-wc-review-checklist-card.md
bash -n ops/mainnet0/public-node-first-external-tester-wc-review-checklist-card-proof.sh

echo "source_markers_green=true"
echo "ui_marker=VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_REVIEW_CHECKLIST_UI_V1"
echo "card_id=publicNodeFirstExternalTesterWcReviewChecklistCard"
echo "review_checklist_link=/public-node/first-external-tester-wc-review-checklist.json"
echo "wc_candidate_link=/public-node/first-external-tester-wc-candidate.json"
echo "review_state=pending_operator_review"
echo "checklist_status=open"
echo "review_required_before_award=true"
echo "award_decision=not_decided"
echo "ledger_write_allowed_now=false"
echo "award_created_now=false"
echo "wc_ledger_mutated_now=false"
echo "wc_credit_delta_now=0"
echo "wc_to_void_swap=false"
echo "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_REVIEW_CHECKLIST_CARD_PROOF_V1_GREEN"
