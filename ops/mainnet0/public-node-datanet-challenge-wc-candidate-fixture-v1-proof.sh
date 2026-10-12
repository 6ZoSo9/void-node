#!/usr/bin/env bash
set -euo pipefail

BASE="${BASE:-http://127.0.0.1:4100}"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
OUT="${OUT:-/tmp/public-node-datanet-challenge-wc-candidate-fixture-v1-proof-$STAMP}"

mkdir -p "$OUT"

echo "=== VOID Public Node DataNet Challenge WC Candidate Fixture v1 Proof ==="
echo "marker=VOID_DATANET_CHALLENGE_WC_CANDIDATE_FIXTURE_PROOF_V1"
echo "head=$(git rev-parse --short=8 HEAD)"
echo "base=$BASE"
echo "out=$OUT"

test -f src/index.ts
test -f docs/public/public-node-datanet-challenge-wc-candidate-fixture-v1.md

grep -Fq "VOID_DATANET_CHALLENGE_WC_CANDIDATE_FIXTURE_ROUTE_V1" src/index.ts
grep -Fq "VOID_DATANET_CHALLENGE_WC_CANDIDATE_FIXTURE_V1" src/index.ts
grep -Fq "VOID_DATANET_CHALLENGE_WC_CANDIDATE_FIXTURE_DOC_V1" docs/public/public-node-datanet-challenge-wc-candidate-fixture-v1.md
grep -Fq "candidate_status: \"candidate_only_not_awarded\"" src/index.ts
grep -Fq "wc_award_decision_now: \"not_decided\"" src/index.ts
grep -Fq "wc_award_decision_final: false" src/index.ts
grep -Fq "wc_delta_now: 0" src/index.ts
grep -Fq "award_record_created_now: false" src/index.ts
grep -Fq "ledger_entry_created_now: false" src/index.ts
grep -Fq "public_submit_route_enabled: false" src/index.ts
grep -Fq "ledger_write: false" src/index.ts
grep -Fq "wc_credit_award: false" src/index.ts
grep -Fq "mutation: false" src/index.ts

npm run build

curl -fsS "$BASE/public-node/datanet/challenge-wc-candidate-fixture-v1.json" > "$OUT/wc-candidate-fixture.json"
curl -fsS "$BASE/public-node/route-index.json" > "$OUT/route-index.json"

grep -Fq '"marker":"VOID_DATANET_CHALLENGE_WC_CANDIDATE_FIXTURE_V1"' "$OUT/wc-candidate-fixture.json"
grep -Fq '"ok":true' "$OUT/wc-candidate-fixture.json"
grep -Fq '"dataset_id":"demo003-folder-fixture-v1"' "$OUT/wc-candidate-fixture.json"
grep -Fq '"fixture_state":"wc_candidate_fixture_only"' "$OUT/wc-candidate-fixture.json"
grep -Fq '"candidate_status":"candidate_only_not_awarded"' "$OUT/wc-candidate-fixture.json"
grep -Fq '"review_record_marker":"VOID_DATANET_CHALLENGE_OPERATOR_REVIEW_RECORD_FIXTURE_V1"' "$OUT/wc-candidate-fixture.json"
grep -Fq '"review_decision_state":"accepted_for_future_wc_review"' "$OUT/wc-candidate-fixture.json"
grep -Fq '"wc_award_decision_now":"not_decided"' "$OUT/wc-candidate-fixture.json"
grep -Fq '"wc_award_decision_final":false' "$OUT/wc-candidate-fixture.json"
grep -Fq '"wc_delta_now":0' "$OUT/wc-candidate-fixture.json"
grep -Fq '"award_record_created_now":false' "$OUT/wc-candidate-fixture.json"
grep -Fq '"ledger_entry_created_now":false' "$OUT/wc-candidate-fixture.json"
grep -Fq '"public_submit_route_enabled":false' "$OUT/wc-candidate-fixture.json"
grep -Fq '"operator_local_intake_only":true' "$OUT/wc-candidate-fixture.json"
grep -Fq '"ledger_write":false' "$OUT/wc-candidate-fixture.json"
grep -Fq '"wc_credit_award":false' "$OUT/wc-candidate-fixture.json"
grep -Fq '"mutation":false' "$OUT/wc-candidate-fixture.json"
grep -Fq '/public-node/datanet/challenge-wc-candidate-fixture-v1.json' "$OUT/route-index.json"

echo "datanet_challenge_wc_candidate_fixture_route_green=true"
echo "datanet_challenge_wc_candidate_fixture_status=candidate_only_not_awarded"
echo "datanet_challenge_wc_candidate_fixture_wc_delta_now=0"
echo "datanet_challenge_wc_candidate_fixture_award_record_created_now=false"
echo "datanet_challenge_wc_candidate_fixture_ledger_entry_created_now=false"
echo "datanet_challenge_wc_candidate_fixture_ledger_write=false"
echo "datanet_challenge_wc_candidate_fixture_wc_credit_award=false"
echo "VOID_DATANET_CHALLENGE_WC_CANDIDATE_FIXTURE_PROOF_V1_GREEN"
