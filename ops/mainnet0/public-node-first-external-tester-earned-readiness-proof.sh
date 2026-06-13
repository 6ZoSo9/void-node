#!/usr/bin/env bash
set -euo pipefail

LOCAL_BASE="${LOCAL_BASE:-http://127.0.0.1:4100}"
OUT="${OUT:-/tmp/public-node-first-external-tester-earned-readiness-proof-$(date -u +%Y%m%d-%H%M%S)}"

mkdir -p "$OUT"

echo "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_EARNED_READINESS_PROOF_V1"
echo "checked_at_utc=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "head=$(git rev-parse --short HEAD)"
echo "tag=$(git tag --points-at HEAD | head -1)"
echo "local_base=$LOCAL_BASE"
echo "out=$OUT"

grep -Fq "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_EARNED_READINESS_ROUTE_V1" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_EARNED_READINESS_V1" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_EARNED_READINESS_DOC_V1" docs/public/public-node-first-external-tester-earned-readiness.md
grep -Fq "/public-node/first-external-tester-earned-readiness.json" src/index.ts
grep -Fq "eligible_evidence_for_future_accounting: true" src/index.ts
grep -Fq "award_created_now: false" src/index.ts
grep -Fq "wc_ledger_mutated_now: false" src/index.ts
grep -Fq "wc_credit_delta_now: 0" src/index.ts
grep -Fq "payout_created_now: false" src/index.ts
grep -Fq "redeemable_now: false" src/index.ts
grep -Fq "wc_to_void_swap: false" src/index.ts
grep -Fq "wallet_send: false" src/index.ts
grep -Fq "buy_void_fulfillment: false" src/index.ts
grep -Fq "validator_mutation: false" src/index.ts
bash -n ops/mainnet0/public-node-first-external-tester-earned-readiness-proof.sh

echo "source_markers_green=true"
echo "route=/public-node/first-external-tester-earned-readiness.json"
echo "marker=VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_EARNED_READINESS_V1"
echo "route_marker=VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_EARNED_READINESS_ROUTE_V1"
echo "eligible_evidence_for_future_accounting=true"
echo "award_created_now=false"
echo "wc_ledger_mutated_now=false"
echo "wc_credit_delta_now=0"
echo "payout_created_now=false"
echo "wc_to_void_swap=false"
echo "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_EARNED_READINESS_PROOF_V1_GREEN"
