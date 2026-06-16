#!/usr/bin/env bash
set -euo pipefail

BASE="${BASE:-http://127.0.0.1:4100}"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
OUT="${OUT:-/tmp/public-node-datanet-challenge-award-intent-packet-fixture-v1-proof-$STAMP}"

mkdir -p "$OUT"

echo "=== VOID Public Node DataNet Challenge Award Intent Packet Fixture v1 Proof ==="
echo "marker=VOID_DATANET_CHALLENGE_AWARD_INTENT_PACKET_FIXTURE_PROOF_V1"
echo "head=$(git rev-parse --short=8 HEAD)"
echo "base=$BASE"
echo "out=$OUT"

test -f src/index.ts
test -f docs/public/public-node-datanet-challenge-award-intent-packet-fixture-v1.md

grep -Fq "VOID_DATANET_CHALLENGE_AWARD_INTENT_PACKET_FIXTURE_ROUTE_V1" src/index.ts
grep -Fq "VOID_DATANET_CHALLENGE_AWARD_INTENT_PACKET_FIXTURE_V1" src/index.ts
grep -Fq "VOID_DATANET_CHALLENGE_AWARD_INTENT_PACKET_FIXTURE_DOC_V1" docs/public/public-node-datanet-challenge-award-intent-packet-fixture-v1.md
grep -Fq "award_intent_packet_present: true" src/index.ts
grep -Fq "award_intent_packet_state: \"intent_only_not_final_not_awarded\"" src/index.ts
grep -Fq "selected_positive_wc_delta_fixture: true" src/index.ts
grep -Fq "proposed_wc_delta_fixture: 100" src/index.ts
grep -Fq "proposed_wc_delta_final: false" src/index.ts
grep -Fq "award_intent_created_now: false" src/index.ts
grep -Fq "award_intent_signed_now: false" src/index.ts
grep -Fq "award_intent_operator_approved_now: false" src/index.ts
grep -Fq "wc_delta_now: 0" src/index.ts
grep -Fq "wc_award_decision_final: false" src/index.ts
grep -Fq "award_record_created_now: false" src/index.ts
grep -Fq "ledger_entry_created_now: false" src/index.ts
grep -Fq "ledger_write: false" src/index.ts
grep -Fq "wc_credit_award: false" src/index.ts
grep -Fq "mutation: false" src/index.ts

npm run build

curl -fsS "$BASE/public-node/datanet/challenge-award-intent-packet-fixture-v1.json" > "$OUT/award-intent-packet-fixture.json"
curl -fsS "$BASE/public-node/route-index.json" > "$OUT/route-index.json"

grep -Fq '"marker":"VOID_DATANET_CHALLENGE_AWARD_INTENT_PACKET_FIXTURE_V1"' "$OUT/award-intent-packet-fixture.json"
grep -Fq '"ok":true' "$OUT/award-intent-packet-fixture.json"
grep -Fq '"dataset_id":"demo003-folder-fixture-v1"' "$OUT/award-intent-packet-fixture.json"
grep -Fq '"fixture_state":"award_intent_packet_fixture_only"' "$OUT/award-intent-packet-fixture.json"
grep -Fq '"award_intent_packet_present":true' "$OUT/award-intent-packet-fixture.json"
grep -Fq '"award_intent_packet_state":"intent_only_not_final_not_awarded"' "$OUT/award-intent-packet-fixture.json"
grep -Fq '"positive_wc_delta_selection_marker":"VOID_DATANET_CHALLENGE_POSITIVE_WC_DELTA_SELECTION_FIXTURE_V1"' "$OUT/award-intent-packet-fixture.json"
grep -Fq '"selected_positive_wc_delta_fixture":true' "$OUT/award-intent-packet-fixture.json"
grep -Fq '"proposed_wc_delta_fixture":100' "$OUT/award-intent-packet-fixture.json"
grep -Fq '"proposed_wc_delta_final":false' "$OUT/award-intent-packet-fixture.json"
grep -Fq '"award_intent_created_now":false' "$OUT/award-intent-packet-fixture.json"
grep -Fq '"award_intent_signed_now":false' "$OUT/award-intent-packet-fixture.json"
grep -Fq '"award_intent_operator_approved_now":false' "$OUT/award-intent-packet-fixture.json"
grep -Fq '"wc_award_decision_final":false' "$OUT/award-intent-packet-fixture.json"
grep -Fq '"wc_delta_now":0' "$OUT/award-intent-packet-fixture.json"
grep -Fq '"award_record_created_now":false' "$OUT/award-intent-packet-fixture.json"
grep -Fq '"ledger_entry_created_now":false' "$OUT/award-intent-packet-fixture.json"
grep -Fq '"ledger_write":false' "$OUT/award-intent-packet-fixture.json"
grep -Fq '"wc_credit_award":false' "$OUT/award-intent-packet-fixture.json"
grep -Fq '"mutation":false' "$OUT/award-intent-packet-fixture.json"
grep -Fq '/public-node/datanet/challenge-award-intent-packet-fixture-v1.json' "$OUT/route-index.json"

echo "datanet_challenge_award_intent_packet_fixture_route_green=true"
echo "datanet_challenge_award_intent_packet_fixture_present=true"
echo "datanet_challenge_award_intent_packet_fixture_state=intent_only_not_final_not_awarded"
echo "datanet_challenge_award_intent_packet_fixture_proposed_wc_delta=100"
echo "datanet_challenge_award_intent_packet_fixture_wc_delta_now=0"
echo "datanet_challenge_award_intent_packet_fixture_award_record_created_now=false"
echo "datanet_challenge_award_intent_packet_fixture_ledger_entry_created_now=false"
echo "datanet_challenge_award_intent_packet_fixture_ledger_write=false"
echo "datanet_challenge_award_intent_packet_fixture_wc_credit_award=false"
echo "VOID_DATANET_CHALLENGE_AWARD_INTENT_PACKET_FIXTURE_PROOF_V1_GREEN"
