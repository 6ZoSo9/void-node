#!/usr/bin/env bash
set -euo pipefail

LOCAL_BASE="${LOCAL_BASE:-http://127.0.0.1:4100}"
OUT="${OUT:-/tmp/public-node-first-external-tester-wc-award-policy-card-proof-$(date -u +%Y%m%d-%H%M%S)}"

mkdir -p "$OUT"

echo "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_AWARD_POLICY_CARD_PROOF_V1"
echo "checked_at_utc=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "head=$(git rev-parse --short HEAD)"
echo "tag=$(git tag --points-at HEAD | head -1)"
echo "local_base=$LOCAL_BASE"
echo "out=$OUT"

grep -Fq "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_AWARD_POLICY_UI_V1" src/index.ts
grep -Fq "publicNodeFirstExternalTesterWcAwardPolicyCard" src/index.ts
grep -Fq "publicNodeFirstExternalTesterWcAwardPolicyLink" src/index.ts
grep -Fq "publicNodeFirstExternalTesterWcAwardPolicyReviewChecklistLink" src/index.ts
grep -Fq "WC Award Policy: First External Tester" src/index.ts
grep -Fq "draft_public_read_only" src/index.ts
grep -Fq "Review record created now:" src/index.ts
grep -Fq "Review outcome now:" src/index.ts
grep -Fq "not_decided" src/index.ts
grep -Fq "Award decision now:" src/index.ts
grep -Fq "Award created now:" src/index.ts
grep -Fq "WC ledger mutated now:" src/index.ts
grep -Fq "WC credit delta now:" src/index.ts
grep -Fq "WC review record write:" src/index.ts
grep -Fq "WC ledger write:" src/index.ts
grep -Fq "WC credit award:" src/index.ts
grep -Fq "WC→VOID swap:" src/index.ts
grep -Fq "first_external_tester_wc_award_policy_green=true" src/index.ts
grep -Fq "/public-node/first-external-tester-wc-award-policy.json" src/index.ts
grep -Fq "/public-node/first-external-tester-wc-review-checklist.json" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_AWARD_POLICY_CARD_DOC_V1" docs/public/public-node-first-external-tester-wc-award-policy-card.md

bash -n ops/mainnet0/public-node-first-external-tester-wc-award-policy-card-proof.sh

echo "source_markers_green=true"
echo "ui_marker=VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_AWARD_POLICY_UI_V1"
echo "card_id=publicNodeFirstExternalTesterWcAwardPolicyCard"
echo "award_policy_link=/public-node/first-external-tester-wc-award-policy.json"
echo "review_checklist_link=/public-node/first-external-tester-wc-review-checklist.json"
echo "policy_state=draft_public_read_only"
echo "review_record_created_now=false"
echo "review_outcome_now=not_decided"
echo "award_decision_now=not_decided"
echo "award_created_now=false"
echo "wc_ledger_mutated_now=false"
echo "wc_credit_delta_now=0"
echo "wc_review_record_write=false"
echo "wc_ledger_write=false"
echo "wc_credit_award=false"
echo "wc_to_void_swap=false"
echo "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_AWARD_POLICY_CARD_PROOF_V1_GREEN"
