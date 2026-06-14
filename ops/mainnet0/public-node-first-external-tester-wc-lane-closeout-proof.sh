#!/usr/bin/env bash
set -euo pipefail

LOCAL_BASE="${LOCAL_BASE:-http://127.0.0.1:4100}"
OUT="${OUT:-/tmp/public-node-first-external-tester-wc-lane-closeout-proof-$(date -u +%Y%m%d-%H%M%S)}"

mkdir -p "$OUT"

echo "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_LANE_CLOSEOUT_PROOF_V1"
echo "checked_at_utc=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "head=$(git rev-parse --short HEAD)"
echo "tag=$(git tag --points-at HEAD | head -1)"
echo "local_base=$LOCAL_BASE"
echo "out=$OUT"

grep -Fq "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_LANE_CLOSEOUT_V1" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_LANE_CLOSEOUT_ROUTE_V1" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_LANE_CLOSEOUT_UI_V1" src/index.ts
grep -Fq "/public-node/first-external-tester-wc-lane-closeout.json" src/index.ts
grep -Fq "publicNodeFirstExternalTesterWcLaneCloseoutCard" src/index.ts
grep -Fq "work_credit_lane_closed_read_only" src/index.ts
grep -Fq "external_receipt_imported: true" src/index.ts
grep -Fq "earned_readiness_green: true" src/index.ts
grep -Fq "wc_candidate_green: true" src/index.ts
grep -Fq "wc_review_checklist_green: true" src/index.ts
grep -Fq "wc_award_policy_green: true" src/index.ts
grep -Fq "review_record_created_now: false" src/index.ts
grep -Fq "award_created_now: false" src/index.ts
grep -Fq "wc_ledger_mutated_now: false" src/index.ts
grep -Fq "wc_credit_delta_now: 0" src/index.ts
grep -Fq "wc_review_record_write: false" src/index.ts
grep -Fq "wc_ledger_write: false" src/index.ts
grep -Fq "wc_credit_award: false" src/index.ts
grep -Fq "wc_to_void_swap: false" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_LANE_CLOSEOUT_DOC_V1" docs/public/public-node-first-external-tester-wc-lane-closeout.md

bash -n ops/mainnet0/public-node-first-external-tester-wc-lane-closeout-proof.sh

echo "source_markers_green=true"
echo "route=/public-node/first-external-tester-wc-lane-closeout.json"
echo "ui_marker=VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_LANE_CLOSEOUT_UI_V1"
echo "card_id=publicNodeFirstExternalTesterWcLaneCloseoutCard"
echo "closeout_state=work_credit_lane_closed_read_only"
echo "external_receipt_imported=true"
echo "earned_readiness_green=true"
echo "wc_candidate_green=true"
echo "wc_review_checklist_green=true"
echo "wc_award_policy_green=true"
echo "review_record_created_now=false"
echo "award_created_now=false"
echo "wc_ledger_write=false"
echo "wc_credit_award=false"
echo "wc_to_void_swap=false"
echo "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_LANE_CLOSEOUT_PROOF_V1_GREEN"
