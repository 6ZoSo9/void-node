#!/usr/bin/env bash
set -euo pipefail

BASE="${BASE:-http://127.0.0.1:4100}"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
OUT="${OUT:-/tmp/public-node-datanet-challenge-receipt-intake-v1-proof-$STAMP}"

mkdir -p "$OUT"

echo "=== VOID Public Node DataNet Challenge Receipt Intake v1 Proof ==="
echo "marker=VOID_DATANET_CHALLENGE_RECEIPT_INTAKE_PROOF_V1"
echo "head=$(git rev-parse --short=8 HEAD)"
echo "base=$BASE"
echo "out=$OUT"

test -f src/index.ts
test -f docs/public/public-node-datanet-challenge-receipt-intake-v1.md

grep -Fq "VOID_DATANET_CHALLENGE_TESTER_RESULT_RECEIPT_ROUTE_V1" src/index.ts
grep -Fq "VOID_DATANET_CHALLENGE_RECEIPT_INTAKE_STATUS_ROUTE_V1" src/index.ts
grep -Fq "VOID_DATANET_CHALLENGE_TESTER_RESULT_RECEIPT_V1" src/index.ts
grep -Fq "VOID_DATANET_CHALLENGE_RECEIPT_INTAKE_STATUS_V1" src/index.ts
grep -Fq "operator_local_intake_only: true" src/index.ts
grep -Fq "public_submit_route_enabled: false" src/index.ts
grep -Fq "ledger_write: false" src/index.ts
grep -Fq "wc_credit_award: false" src/index.ts
grep -Fq "mutation: false" src/index.ts
grep -Fq "VOID_DATANET_CHALLENGE_RECEIPT_INTAKE_DOC_V1" docs/public/public-node-datanet-challenge-receipt-intake-v1.md

npm run build

curl -fsS "$BASE/public-node/datanet/challenge-tester-result-receipt-v1.json" > "$OUT/tester-result-receipt.json"
curl -fsS "$BASE/public-node/datanet/challenge-receipt-intake-status-v1.json" > "$OUT/receipt-intake-status.json"
curl -fsS "$BASE/public-node/route-index.json" > "$OUT/route-index.json"

grep -Fq '"marker":"VOID_DATANET_CHALLENGE_TESTER_RESULT_RECEIPT_V1"' "$OUT/tester-result-receipt.json"
grep -Fq '"marker":"VOID_DATANET_CHALLENGE_RECEIPT_INTAKE_STATUS_V1"' "$OUT/receipt-intake-status.json"
grep -Fq '"dataset_id":"demo003-folder-fixture-v1"' "$OUT/tester-result-receipt.json"
grep -Fq '"dataset_id":"demo003-folder-fixture-v1"' "$OUT/receipt-intake-status.json"
grep -Fq '"operator_local_intake_only":true' "$OUT/tester-result-receipt.json"
grep -Fq '"operator_local_intake_only":true' "$OUT/receipt-intake-status.json"
grep -Fq '"public_submit_route_enabled":false' "$OUT/receipt-intake-status.json"
grep -Fq '"ledger_write":false' "$OUT/tester-result-receipt.json"
grep -Fq '"ledger_write":false' "$OUT/receipt-intake-status.json"
grep -Fq '"wc_credit_award":false' "$OUT/tester-result-receipt.json"
grep -Fq '"wc_credit_award":false' "$OUT/receipt-intake-status.json"
grep -Fq '"mutation":false' "$OUT/tester-result-receipt.json"
grep -Fq '"mutation":false' "$OUT/receipt-intake-status.json"
grep -Fq 'VOID_DATANET_CHALLENGE_TESTER_RESULT_RECEIPT_RETURN_V1' "$OUT/tester-result-receipt.json"
grep -Fq '/public-node/datanet/challenge-tester-result-receipt-v1.json' "$OUT/route-index.json"
grep -Fq '/public-node/datanet/challenge-receipt-intake-status-v1.json' "$OUT/route-index.json"

echo "datanet_challenge_tester_result_receipt_route_green=true"
echo "datanet_challenge_receipt_intake_status_route_green=true"
echo "datanet_challenge_receipt_intake_operator_local_only=true"
echo "datanet_challenge_receipt_intake_public_submit_route_enabled=false"
echo "datanet_challenge_receipt_intake_ledger_write=false"
echo "datanet_challenge_receipt_intake_wc_credit_award=false"
echo "VOID_DATANET_CHALLENGE_RECEIPT_INTAKE_PROOF_V1_GREEN"
