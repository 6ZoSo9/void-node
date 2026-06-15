#!/usr/bin/env bash
set -euo pipefail

BASE="${BASE:-http://127.0.0.1:4100}"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
OUT="${OUT:-/tmp/public-node-datanet-challenge-v1-proof-$STAMP}"

mkdir -p "$OUT"

echo "=== VOID Public Node DataNet Challenge v1 Proof ==="
echo "marker=VOID_DATANET_CHALLENGE_PROOF_V1"
echo "head=$(git rev-parse --short=8 HEAD)"
echo "base=$BASE"
echo "out=$OUT"

test -f src/index.ts
test -f docs/public/public-node-datanet-challenge-v1.md

grep -Fq "VOID_DATANET_CHALLENGE_ROUTE_V1" src/index.ts
grep -Fq "VOID_DATANET_CHALLENGE_V1" src/index.ts
grep -Fq "filesystem_path_built_from_dataset_id: false" src/index.ts
grep -Fq "wc_credit_award: false" src/index.ts
grep -Fq "ledger_write: false" src/index.ts
grep -Fq "VOID_DATANET_CHALLENGE_DOC_V1" docs/public/public-node-datanet-challenge-v1.md

curl -fsS "$BASE/public-node/datanet/challenge/demo003-folder-fixture-v1" > "$OUT/success.json"

grep -Fq '"marker":"VOID_DATANET_CHALLENGE_V1"' "$OUT/success.json"
grep -Fq '"ok":true' "$OUT/success.json"
grep -Fq '"dataset_id":"demo003-folder-fixture-v1"' "$OUT/success.json"
grep -Fq '"challenge_status":"ready"' "$OUT/success.json"
grep -Fq '"sha256_algorithm":"sha256"' "$OUT/success.json"
grep -Fq '"bounded_read_existing_public_manifest_route":"/public-node/local-data-drop/folder/demo003-folder-fixture-v1/manifest.json"' "$OUT/success.json"
grep -Fq '"path_from_dataset_id":false' "$OUT/success.json"
grep -Fq '"filesystem_path_built_from_dataset_id":false' "$OUT/success.json"
grep -Fq '"public_read_only":true' "$OUT/success.json"
grep -Fq '"mutation":false' "$OUT/success.json"
grep -Fq '"live_runtime_write":false' "$OUT/success.json"
grep -Fq '"ledger_write":false' "$OUT/success.json"
grep -Fq '"wc_credit_award":false' "$OUT/success.json"
grep -Fq '"trusted_as_network_truth":false' "$OUT/success.json"
grep -Eq '"canonical_json_sha256":"[0-9a-f]{64}"' "$OUT/success.json"

curl -fsS "$BASE/public-node/local-data-drop/folder/demo003-folder-fixture-v1/manifest.json" > "$OUT/demo003-manifest.json"
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO003_FOLDER" "$OUT/demo003-manifest.json"

set +e
curl -sS -o "$OUT/missing.json" -w "%{http_code}" "$BASE/public-node/datanet/challenge/void-missing-dataset-fixture-v1" > "$OUT/missing.status"
MISSING_STATUS="$(cat "$OUT/missing.status")"

curl -sS -o "$OUT/malformed.json" -w "%{http_code}" "$BASE/public-node/datanet/challenge/..%2Fsecret" > "$OUT/malformed.status"
MALFORMED_STATUS="$(cat "$OUT/malformed.status")"

curl -sS -X POST -o "$OUT/post.json" -w "%{http_code}" "$BASE/public-node/datanet/challenge/demo003-folder-fixture-v1" > "$OUT/post.status"
POST_STATUS="$(cat "$OUT/post.status")"
set -e

test "$MISSING_STATUS" = "404"
grep -Fq '"error":"dataset_not_found"' "$OUT/missing.json"
grep -Fq '"path_from_dataset_id":false' "$OUT/missing.json"

test "$MALFORMED_STATUS" = "400"
grep -Fq '"error":"malformed_dataset_id"' "$OUT/malformed.json"
grep -Fq '"filesystem_path_built_from_dataset_id":false' "$OUT/malformed.json"

test "$POST_STATUS" = "404"

npm run build

if git diff --name-only -- src/index.ts docs/public/public-node-datanet-challenge-v1.md ops/mainnet0/public-node-datanet-challenge-v1-proof.sh | grep -q '^$'; then
  :
fi

echo "datanet_challenge_success_fixture_green=true"
echo "datanet_challenge_missing_fixture_rejected=true"
echo "datanet_challenge_malformed_dataset_rejected=true"
echo "datanet_challenge_post_rejected=true"
echo "datanet_challenge_path_from_dataset_id=false"
echo "datanet_challenge_wc_credit_award=false"
echo "VOID_DATANET_CHALLENGE_V1_GREEN"
