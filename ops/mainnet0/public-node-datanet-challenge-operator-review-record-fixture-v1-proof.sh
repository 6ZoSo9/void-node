#!/usr/bin/env bash
set -euo pipefail

BASE="${BASE:-http://127.0.0.1:4100}"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
OUT="${OUT:-/tmp/public-node-datanet-challenge-operator-review-record-fixture-v1-proof-$STAMP}"

mkdir -p "$OUT"

echo "=== VOID Public Node DataNet Challenge Operator Review Record Fixture v1 Proof ==="
echo "marker=VOID_DATANET_CHALLENGE_OPERATOR_REVIEW_RECORD_FIXTURE_PROOF_V1"
echo "head=$(git rev-parse --short=8 HEAD)"
echo "base=$BASE"
echo "out=$OUT"

test -f src/index.ts
test -f docs/public/public-node-datanet-challenge-operator-review-record-fixture-v1.md

grep -Fq "VOID_DATANET_CHALLENGE_OPERATOR_REVIEW_RECORD_FIXTURE_ROUTE_V1" src/index.ts
grep -Fq "VOID_DATANET_CHALLENGE_OPERATOR_REVIEW_RECORD_FIXTURE_V1" src/index.ts
grep -Fq "VOID_DATANET_CHALLENGE_OPERATOR_REVIEW_RECORD_FIXTURE_DOC_V1" docs/public/public-node-datanet-challenge-operator-review-record-fixture-v1.md
grep -Fq "review_decision_state: \"accepted_for_future_wc_review\"" src/index.ts
grep -Fq "review_decision_final: false" src/index.ts
grep -Fq "wc_delta_now: 0" src/index.ts
grep -Fq "public_submit_route_enabled: false" src/index.ts
grep -Fq "ledger_write: false" src/index.ts
grep -Fq "wc_credit_award: false" src/index.ts
grep -Fq "mutation: false" src/index.ts

npm run build

curl -fsS "$BASE/public-node/datanet/challenge-operator-review-record-fixture-v1.json" > "$OUT/operator-review-record-fixture.json"
curl -fsS "$BASE/public-node/route-index.json" > "$OUT/route-index.json"

grep -Fq '"marker":"VOID_DATANET_CHALLENGE_OPERATOR_REVIEW_RECORD_FIXTURE_V1"' "$OUT/operator-review-record-fixture.json"
grep -Fq '"ok":true' "$OUT/operator-review-record-fixture.json"
grep -Fq '"dataset_id":"demo003-folder-fixture-v1"' "$OUT/operator-review-record-fixture.json"
grep -Fq '"fixture_state":"review_record_fixture_only"' "$OUT/operator-review-record-fixture.json"
grep -Fq '"review_decision_state":"accepted_for_future_wc_review"' "$OUT/operator-review-record-fixture.json"
grep -Fq '"review_decision_final":false' "$OUT/operator-review-record-fixture.json"
grep -Fq '"reviewed_receipt_fixture_marker":"VOID_DATANET_CHALLENGE_IMPORTED_TESTER_RECEIPT_FIXTURE_V1"' "$OUT/operator-review-record-fixture.json"
grep -Fq '"wc_award_decision_now":"not_decided"' "$OUT/operator-review-record-fixture.json"
grep -Fq '"wc_delta_now":0' "$OUT/operator-review-record-fixture.json"
grep -Fq '"public_submit_route_enabled":false' "$OUT/operator-review-record-fixture.json"
grep -Fq '"operator_local_intake_only":true' "$OUT/operator-review-record-fixture.json"
grep -Fq '"ledger_write":false' "$OUT/operator-review-record-fixture.json"
grep -Fq '"wc_credit_award":false' "$OUT/operator-review-record-fixture.json"
grep -Fq '"mutation":false' "$OUT/operator-review-record-fixture.json"
grep -Fq '/public-node/datanet/challenge-operator-review-record-fixture-v1.json' "$OUT/route-index.json"

echo "datanet_challenge_operator_review_record_fixture_route_green=true"
echo "datanet_challenge_operator_review_record_fixture_decision_state=accepted_for_future_wc_review"
echo "datanet_challenge_operator_review_record_fixture_wc_delta_now=0"
echo "datanet_challenge_operator_review_record_fixture_public_submit_route_enabled=false"
echo "datanet_challenge_operator_review_record_fixture_ledger_write=false"
echo "datanet_challenge_operator_review_record_fixture_wc_credit_award=false"
echo "VOID_DATANET_CHALLENGE_OPERATOR_REVIEW_RECORD_FIXTURE_PROOF_V1_GREEN"
