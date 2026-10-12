#!/usr/bin/env bash
set -euo pipefail

BASE="${BASE:-http://127.0.0.1:4100}"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
OUT="${OUT:-/tmp/public-node-datanet-challenge-imported-tester-receipt-fixture-v1-proof-$STAMP}"

mkdir -p "$OUT"

echo "=== VOID Public Node DataNet Challenge Imported Tester Receipt Fixture v1 Proof ==="
echo "marker=VOID_DATANET_CHALLENGE_IMPORTED_TESTER_RECEIPT_FIXTURE_PROOF_V1"
echo "head=$(git rev-parse --short=8 HEAD)"
echo "base=$BASE"
echo "out=$OUT"

test -f src/index.ts
test -f docs/public/public-node-datanet-challenge-imported-tester-receipt-fixture-v1.md

grep -Fq "VOID_DATANET_CHALLENGE_IMPORTED_TESTER_RECEIPT_FIXTURE_ROUTE_V1" src/index.ts
grep -Fq "VOID_DATANET_CHALLENGE_IMPORTED_TESTER_RECEIPT_FIXTURE_V1" src/index.ts
grep -Fq "VOID_DATANET_CHALLENGE_IMPORTED_TESTER_RECEIPT_FIXTURE_DOC_V1" docs/public/public-node-datanet-challenge-imported-tester-receipt-fixture-v1.md
grep -Fq "fixture_state: \"operator_local_fixture_only\"" src/index.ts
grep -Fq "public_submit_route_enabled: false" src/index.ts
grep -Fq "ledger_write: false" src/index.ts
grep -Fq "wc_credit_award: false" src/index.ts
grep -Fq "mutation: false" src/index.ts

npm run build

curl -fsS "$BASE/public-node/datanet/challenge-imported-tester-receipt-fixture-v1.json" > "$OUT/imported-receipt-fixture.json"
curl -fsS "$BASE/public-node/route-index.json" > "$OUT/route-index.json"

grep -Fq '"marker":"VOID_DATANET_CHALLENGE_IMPORTED_TESTER_RECEIPT_FIXTURE_V1"' "$OUT/imported-receipt-fixture.json"
grep -Fq '"ok":true' "$OUT/imported-receipt-fixture.json"
grep -Fq '"dataset_id":"demo003-folder-fixture-v1"' "$OUT/imported-receipt-fixture.json"
grep -Fq '"fixture_state":"operator_local_fixture_only"' "$OUT/imported-receipt-fixture.json"
grep -Fq '"receipt_marker":"VOID_DATANET_CHALLENGE_TESTER_RESULT_RECEIPT_RETURN_V1"' "$OUT/imported-receipt-fixture.json"
grep -Fq '"green_marker_seen":"VOID_DATANET_CHALLENGE_OFFLINE_VERIFY_PACK_SMOKE_V1_GREEN"' "$OUT/imported-receipt-fixture.json"
grep -Fq '"ledger_write_false_seen":true' "$OUT/imported-receipt-fixture.json"
grep -Fq '"wc_credit_award_false_seen":true' "$OUT/imported-receipt-fixture.json"
grep -Fq '"public_submit_route_enabled":false' "$OUT/imported-receipt-fixture.json"
grep -Fq '"operator_local_intake_only":true' "$OUT/imported-receipt-fixture.json"
grep -Fq '"ledger_write":false' "$OUT/imported-receipt-fixture.json"
grep -Fq '"wc_credit_award":false' "$OUT/imported-receipt-fixture.json"
grep -Fq '"mutation":false' "$OUT/imported-receipt-fixture.json"
grep -Fq '/public-node/datanet/challenge-imported-tester-receipt-fixture-v1.json' "$OUT/route-index.json"

echo "datanet_challenge_imported_tester_receipt_fixture_route_green=true"
echo "datanet_challenge_imported_tester_receipt_fixture_operator_local_only=true"
echo "datanet_challenge_imported_tester_receipt_fixture_public_submit_route_enabled=false"
echo "datanet_challenge_imported_tester_receipt_fixture_ledger_write=false"
echo "datanet_challenge_imported_tester_receipt_fixture_wc_credit_award=false"
echo "VOID_DATANET_CHALLENGE_IMPORTED_TESTER_RECEIPT_FIXTURE_PROOF_V1_GREEN"
