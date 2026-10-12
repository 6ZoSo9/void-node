#!/usr/bin/env bash
set -euo pipefail

LOCAL_BASE="${LOCAL_BASE:-http://127.0.0.1:4100}"
OUT="${OUT:-/tmp/public-node-first-external-tester-wc-candidate-card-proof-$(date -u +%Y%m%d-%H%M%S)}"

mkdir -p "$OUT"

echo "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_CANDIDATE_CARD_PROOF_V1"
echo "checked_at_utc=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "head=$(git rev-parse --short HEAD)"
echo "tag=$(git tag --points-at HEAD | head -1)"
echo "local_base=$LOCAL_BASE"
echo "out=$OUT"

grep -Fq "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_CANDIDATE_UI_V1" src/index.ts
grep -Fq "publicNodeFirstExternalTesterWcCandidateCard" src/index.ts
grep -Fq "publicNodeFirstExternalTesterWcCandidateLink" src/index.ts
grep -Fq "publicNodeFirstExternalTesterWcCandidateEarnedReadinessLink" src/index.ts
grep -Fq "WC Candidate: First External Tester" src/index.ts
grep -Fq "Candidate status:" src/index.ts
grep -Fq "pending_operator_review" src/index.ts
grep -Fq "Review required before award:" src/index.ts
grep -Fq "Award created now:" src/index.ts
grep -Fq "WC ledger mutated now:" src/index.ts
grep -Fq "WC credit delta now:" src/index.ts
grep -Fq "WC→VOID swap:" src/index.ts
grep -Fq "first_external_tester_wc_candidate_green=true" src/index.ts
grep -Fq "/public-node/first-external-tester-wc-candidate.json" src/index.ts
grep -Fq "/public-node/first-external-tester-earned-readiness.json" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_CANDIDATE_UI_DOC_V1" docs/public/public-node-first-external-tester-wc-candidate-card.md
bash -n ops/mainnet0/public-node-first-external-tester-wc-candidate-card-proof.sh

echo "source_markers_green=true"
echo "ui_marker=VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_CANDIDATE_UI_V1"
echo "card_id=publicNodeFirstExternalTesterWcCandidateCard"
echo "wc_candidate_link=/public-node/first-external-tester-wc-candidate.json"
echo "candidate_status=pending_operator_review"
echo "review_required_before_award=true"
echo "award_created_now=false"
echo "wc_ledger_mutated_now=false"
echo "wc_credit_delta_now=0"
echo "wc_to_void_swap=false"
echo "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_CANDIDATE_CARD_PROOF_V1_GREEN"
