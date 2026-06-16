#!/usr/bin/env bash
set -euo pipefail

BASE="${BASE:-http://127.0.0.1:4100}"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
OUT="${OUT:-/tmp/public-node-datanet-challenge-positive-wc-delta-selection-fixture-v1-proof-$STAMP}"

mkdir -p "$OUT"

echo "=== VOID Public Node DataNet Challenge Positive WC Delta Selection Fixture v1 Proof ==="
echo "marker=VOID_DATANET_CHALLENGE_POSITIVE_WC_DELTA_SELECTION_FIXTURE_PROOF_V1"
echo "head=$(git rev-parse --short=8 HEAD)"
echo "base=$BASE"
echo "out=$OUT"

test -f src/index.ts
test -f docs/public/public-node-datanet-challenge-positive-wc-delta-selection-fixture-v1.md

grep -Fq "VOID_DATANET_CHALLENGE_POSITIVE_WC_DELTA_SELECTION_FIXTURE_ROUTE_V1" src/index.ts
grep -Fq "VOID_DATANET_CHALLENGE_POSITIVE_WC_DELTA_SELECTION_FIXTURE_V1" src/index.ts
grep -Fq "VOID_DATANET_CHALLENGE_POSITIVE_WC_DELTA_SELECTION_FIXTURE_DOC_V1" docs/public/public-node-datanet-challenge-positive-wc-delta-selection-fixture-v1.md
grep -Fq "selected_positive_wc_delta_fixture: true" src/index.ts
grep -Fq "proposed_wc_delta_fixture: 100" src/index.ts
grep -Fq "proposed_wc_delta_final: false" src/index.ts
grep -Fq "wc_delta_now: 0" src/index.ts
grep -Fq "wc_award_decision_final: false" src/index.ts
grep -Fq "award_record_created_now: false" src/index.ts
grep -Fq "ledger_entry_created_now: false" src/index.ts
grep -Fq "ledger_write: false" src/index.ts
grep -Fq "wc_credit_award: false" src/index.ts
grep -Fq "mutation: false" src/index.ts

npm run build

curl -fsS "$BASE/public-node/datanet/challenge-positive-wc-delta-selection-fixture-v1.json" > "$OUT/positive-wc-delta-selection-fixture.json"
curl -fsS "$BASE/public-node/route-index.json" > "$OUT/route-index.json"

grep -Fq '"marker":"VOID_DATANET_CHALLENGE_POSITIVE_WC_DELTA_SELECTION_FIXTURE_V1"' "$OUT/positive-wc-delta-selection-fixture.json"
grep -Fq '"ok":true' "$OUT/positive-wc-delta-selection-fixture.json"
grep -Fq '"dataset_id":"demo003-folder-fixture-v1"' "$OUT/positive-wc-delta-selection-fixture.json"
grep -Fq '"fixture_state":"positive_wc_delta_selection_fixture_only"' "$OUT/positive-wc-delta-selection-fixture.json"
grep -Fq '"wc_candidate_marker":"VOID_DATANET_CHALLENGE_WC_CANDIDATE_FIXTURE_V1"' "$OUT/positive-wc-delta-selection-fixture.json"
grep -Fq '"selected_positive_wc_delta_fixture":true' "$OUT/positive-wc-delta-selection-fixture.json"
grep -Fq '"proposed_wc_delta_fixture":100' "$OUT/positive-wc-delta-selection-fixture.json"
grep -Fq '"proposed_wc_delta_final":false' "$OUT/positive-wc-delta-selection-fixture.json"
grep -Fq '"wc_delta_now":0' "$OUT/positive-wc-delta-selection-fixture.json"
grep -Fq '"wc_award_decision_final":false' "$OUT/positive-wc-delta-selection-fixture.json"
grep -Fq '"award_record_created_now":false' "$OUT/positive-wc-delta-selection-fixture.json"
grep -Fq '"ledger_entry_created_now":false' "$OUT/positive-wc-delta-selection-fixture.json"
grep -Fq '"ledger_write":false' "$OUT/positive-wc-delta-selection-fixture.json"
grep -Fq '"wc_credit_award":false' "$OUT/positive-wc-delta-selection-fixture.json"
grep -Fq '"mutation":false' "$OUT/positive-wc-delta-selection-fixture.json"
grep -Fq '/public-node/datanet/challenge-positive-wc-delta-selection-fixture-v1.json' "$OUT/route-index.json"

echo "datanet_challenge_positive_wc_delta_selection_fixture_route_green=true"
echo "datanet_challenge_positive_wc_delta_selection_fixture_selected=true"
echo "datanet_challenge_positive_wc_delta_selection_fixture_proposed_wc_delta=100"
echo "datanet_challenge_positive_wc_delta_selection_fixture_wc_delta_now=0"
echo "datanet_challenge_positive_wc_delta_selection_fixture_award_record_created_now=false"
echo "datanet_challenge_positive_wc_delta_selection_fixture_ledger_entry_created_now=false"
echo "datanet_challenge_positive_wc_delta_selection_fixture_ledger_write=false"
echo "datanet_challenge_positive_wc_delta_selection_fixture_wc_credit_award=false"
echo "VOID_DATANET_CHALLENGE_POSITIVE_WC_DELTA_SELECTION_FIXTURE_PROOF_V1_GREEN"
