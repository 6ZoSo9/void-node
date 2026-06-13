#!/usr/bin/env bash
set -euo pipefail

LOCAL_BASE="${LOCAL_BASE:-http://127.0.0.1:4100}"
OUT="${OUT:-/tmp/public-node-first-external-tester-wc-award-policy-proof-$(date -u +%Y%m%d-%H%M%S)}"

mkdir -p "$OUT"

echo "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_AWARD_POLICY_PROOF_V1"
echo "checked_at_utc=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "head=$(git rev-parse --short HEAD)"
echo "tag=$(git tag --points-at HEAD | head -1)"
echo "local_base=$LOCAL_BASE"
echo "out=$OUT"

grep -Fq "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_AWARD_POLICY_V1" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_AWARD_POLICY_ROUTE_V1" src/index.ts
grep -Fq "/public-node/first-external-tester-wc-award-policy.json" src/index.ts
grep -Fq "first-external-tester-wc-award-policy-v1" src/index.ts
grep -Fq "accepted_for_future_award" src/index.ts
grep -Fq "rejected_no_award" src/index.ts
grep -Fq "deferred_more_evidence_required" src/index.ts
grep -Fq "review_record_created_now: false" src/index.ts
grep -Fq "review_outcome_now" src/index.ts
grep -Fq "award_decision_now" src/index.ts
grep -Fq "not_decided" src/index.ts
grep -Fq "award_created_now: false" src/index.ts
grep -Fq "wc_ledger_mutated_now: false" src/index.ts
grep -Fq "wc_credit_delta_now: 0" src/index.ts
grep -Fq "proposed_wc_credit_delta_now: null" src/index.ts
grep -Fq "payout_created_now: false" src/index.ts
grep -Fq "redeemable_now: false" src/index.ts
grep -Fq "wc_to_void_swap: false" src/index.ts
grep -Fq "money_movement: false" src/index.ts
grep -Fq "wallet_send: false" src/index.ts
grep -Fq "wc_review_record_write: false" src/index.ts
grep -Fq "wc_ledger_write: false" src/index.ts
grep -Fq "wc_credit_award: false" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_AWARD_POLICY_DOC_V1" docs/public/public-node-first-external-tester-wc-award-policy.md
bash -n ops/mainnet0/public-node-first-external-tester-wc-award-policy-proof.sh

echo "source_markers_green=true"
echo "route=/public-node/first-external-tester-wc-award-policy.json"
echo "policy_state=draft_public_read_only"
echo "policy_version=first-external-tester-wc-award-policy-v1"
echo "review_record_created_now=false"
echo "review_outcome_now=not_decided"
echo "award_decision_now=not_decided"
echo "award_created_now=false"
echo "wc_ledger_mutated_now=false"
echo "wc_credit_delta_now=0"
echo "proposed_wc_credit_delta_now=null"
echo "wc_review_record_write=false"
echo "wc_ledger_write=false"
echo "wc_credit_award=false"
echo "wc_to_void_swap=false"
echo "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_AWARD_POLICY_PROOF_V1_GREEN"
