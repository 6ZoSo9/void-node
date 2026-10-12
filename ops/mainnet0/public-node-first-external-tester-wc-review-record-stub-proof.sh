#!/usr/bin/env bash
set -euo pipefail

LOCAL_BASE="${LOCAL_BASE:-http://127.0.0.1:4100}"
OUT="${OUT:-/tmp/public-node-first-external-tester-wc-review-record-stub-proof-$(date -u +%Y%m%d-%H%M%S)}"

mkdir -p "$OUT"

echo "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_REVIEW_RECORD_STUB_PROOF_V1"
echo "checked_at_utc=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "head=$(git rev-parse --short HEAD)"
echo "tag=$(git tag --points-at HEAD | head -1)"
echo "local_base=$LOCAL_BASE"
echo "out=$OUT"

grep -Fq "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_REVIEW_RECORD_STUB_V1" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_REVIEW_RECORD_STUB_ROUTE_V1" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_REVIEW_RECORD_STUB_UI_V1" src/index.ts
grep -Fq "/public-node/first-external-tester-wc-review-record-stub.json" src/index.ts
grep -Fq "publicNodeFirstExternalTesterWcReviewRecordStubCard" src/index.ts
grep -Fq "template_only_no_review_record_created" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_REVIEW_RECORD_V1" src/index.ts
grep -Fq "review_record_created_now: false" src/index.ts
grep -Fq "review_outcome_now: \"not_decided\"" src/index.ts
grep -Fq "award_decision_now: \"not_decided\"" src/index.ts
grep -Fq "award_created_now: false" src/index.ts
grep -Fq "wc_ledger_mutated_now: false" src/index.ts
grep -Fq "wc_credit_delta_now: 0" src/index.ts
grep -Fq "wc_review_record_write: false" src/index.ts
grep -Fq "wc_ledger_write: false" src/index.ts
grep -Fq "wc_credit_award: false" src/index.ts
grep -Fq "wc_to_void_swap: false" src/index.ts
grep -Fq "automatic_ledger_write_allowed: false" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_REVIEW_RECORD_STUB_DOC_V1" docs/public/public-node-first-external-tester-wc-review-record-stub.md

bash -n ops/mainnet0/public-node-first-external-tester-wc-review-record-stub-proof.sh

echo "source_markers_green=true"
echo "route=/public-node/first-external-tester-wc-review-record-stub.json"
echo "ui_marker=VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_REVIEW_RECORD_STUB_UI_V1"
echo "card_id=publicNodeFirstExternalTesterWcReviewRecordStubCard"
echo "stub_state=template_only_no_review_record_created"
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
echo "automatic_ledger_write_allowed=false"
echo "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_REVIEW_RECORD_STUB_PROOF_V1_GREEN"
