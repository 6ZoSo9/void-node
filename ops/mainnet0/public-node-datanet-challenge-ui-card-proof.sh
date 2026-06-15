#!/usr/bin/env bash
set -euo pipefail

BASE="${PUBLIC_NODE_BASE:-http://127.0.0.1:4100}"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
OUT="${OUT:-/tmp/public-node-datanet-challenge-ui-card-proof-$STAMP}"

mkdir -p "$OUT"

echo "=== VOID Public Node DataNet Challenge UI Card Proof v1 ==="
echo "marker=VOID_DATANET_CHALLENGE_UI_PROOF_V1"
echo "head=$(git rev-parse --short HEAD)"
echo "base=$BASE"
echo "out=$OUT"

grep -Fq "VOID_DATANET_CHALLENGE_UI_V1" src/index.ts
grep -Fq "publicNodeDatanetChallengeCard" src/index.ts
grep -Fq "publicNodeDatanetChallengeOpenLink" src/index.ts
grep -Fq "publicNodeDatanetChallengeManifestLink" src/index.ts
grep -Fq "path_from_dataset_id=false" src/index.ts
grep -Fq "wc_credit_award=false" src/index.ts
grep -Fq "VOID_DATANET_CHALLENGE_UI_DOC_V1" docs/public/public-node-datanet-challenge-v1.md

curl -fsS --max-time 8 "$BASE/public-node" > "$OUT/public-node.html"
curl -fsS --max-time 8 "$BASE/public-node/datanet/challenge/demo003-folder-fixture-v1" > "$OUT/challenge.json"
curl -fsS --max-time 8 "$BASE/public-node/route-index.json" > "$OUT/route-index.json"

grep -Fq "VOID_DATANET_CHALLENGE_UI_V1" "$OUT/public-node.html"
grep -Fq "publicNodeDatanetChallengeCard" "$OUT/public-node.html"
grep -Fq "/public-node/datanet/challenge/demo003-folder-fixture-v1" "$OUT/public-node.html"
grep -Fq "/public-node/local-data-drop/folder/demo003-folder-fixture-v1/manifest.json" "$OUT/public-node.html"
grep -Fq "path_from_dataset_id=false" "$OUT/public-node.html"
grep -Fq "wc_credit_award=false" "$OUT/public-node.html"

grep -Fq '"marker":"VOID_DATANET_CHALLENGE_V1"' "$OUT/challenge.json"
grep -Fq '"ok":true' "$OUT/challenge.json"
grep -Fq '"path_from_dataset_id":false' "$OUT/challenge.json"
grep -Fq '"filesystem_path_built_from_dataset_id":false' "$OUT/challenge.json"
grep -Fq '"mutation":false' "$OUT/challenge.json"
grep -Fq '"ledger_write":false' "$OUT/challenge.json"
grep -Fq '"wc_credit_award":false' "$OUT/challenge.json"

grep -Fq "/public-node/datanet/challenge/:dataset_id" "$OUT/route-index.json"
grep -Fq "VOID_DATANET_CHALLENGE_V1" "$OUT/route-index.json"

echo "datanet_challenge_ui_card_present=true"
echo "datanet_challenge_ui_link_present=true"
echo "datanet_challenge_manifest_link_present=true"
echo "datanet_challenge_route_index_discovery_green=true"
echo "datanet_challenge_ui_path_from_dataset_id=false"
echo "datanet_challenge_ui_wc_credit_award=false"
echo "VOID_DATANET_CHALLENGE_UI_PROOF_V1_GREEN"
