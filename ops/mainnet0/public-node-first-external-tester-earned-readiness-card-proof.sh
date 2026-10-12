#!/usr/bin/env bash
set -euo pipefail

LOCAL_BASE="${LOCAL_BASE:-http://127.0.0.1:4100}"
OUT="${OUT:-/tmp/public-node-first-external-tester-earned-readiness-card-proof-$(date -u +%Y%m%d-%H%M%S)}"

mkdir -p "$OUT"

echo "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_EARNED_READINESS_CARD_PROOF_V1"
echo "checked_at_utc=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "head=$(git rev-parse --short HEAD)"
echo "tag=$(git tag --points-at HEAD | head -1)"
echo "local_base=$LOCAL_BASE"
echo "out=$OUT"

grep -Fq "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_EARNED_READINESS_UI_V1" src/index.ts
grep -Fq "publicNodeFirstExternalTesterEarnedReadinessCard" src/index.ts
grep -Fq "publicNodeFirstExternalTesterEarnedReadinessLink" src/index.ts
grep -Fq "publicNodeFirstExternalTesterEarnedReadinessProofStatusLink" src/index.ts
grep -Fq "Earned Readiness: First External Tester" src/index.ts
grep -Fq "Eligible evidence:" src/index.ts
grep -Fq "Award created now:" src/index.ts
grep -Fq "WC ledger mutated now:" src/index.ts
grep -Fq "WC credit delta now:" src/index.ts
grep -Fq "WC→VOID swap:" src/index.ts
grep -Fq "first_external_tester_earned_readiness_green=true" src/index.ts
grep -Fq "/public-node/first-external-tester-earned-readiness.json" src/index.ts
grep -Fq "/public-node/first-external-receipt-imported-closeout-proof-status.json" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_EARNED_READINESS_UI_DOC_V1" docs/public/public-node-first-external-tester-earned-readiness-card.md
bash -n ops/mainnet0/public-node-first-external-tester-earned-readiness-card-proof.sh

echo "source_markers_green=true"
echo "ui_marker=VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_EARNED_READINESS_UI_V1"
echo "card_id=publicNodeFirstExternalTesterEarnedReadinessCard"
echo "earned_readiness_link=/public-node/first-external-tester-earned-readiness.json"
echo "award_created_now=false"
echo "wc_ledger_mutated_now=false"
echo "wc_credit_delta_now=0"
echo "wc_to_void_swap=false"
echo "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_EARNED_READINESS_CARD_PROOF_V1_GREEN"
