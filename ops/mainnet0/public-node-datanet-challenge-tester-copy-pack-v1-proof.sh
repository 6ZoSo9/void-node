#!/usr/bin/env bash
set -euo pipefail

BASE="${PUBLIC_NODE_BASE:-http://127.0.0.1:4100}"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
OUT="${OUT:-/tmp/public-node-datanet-challenge-tester-copy-pack-v1-proof-$STAMP}"

mkdir -p "$OUT"

echo "=== VOID Public Node DataNet Challenge Tester Copy Pack v1 Proof ==="
echo "marker=VOID_DATANET_CHALLENGE_TESTER_COPY_PACK_PROOF_V1"
echo "head=$(git rev-parse --short HEAD)"
echo "base=$BASE"
echo "out=$OUT"

grep -Fq "VOID_DATANET_CHALLENGE_TESTER_COPY_PACK_ROUTE_V1" src/index.ts
grep -Fq "VOID_DATANET_CHALLENGE_TESTER_COPY_PACK_V1" src/index.ts
grep -Fq "VOID_DATANET_CHALLENGE_TESTER_COPY_PACK_DOC_V1" docs/public/public-node-datanet-challenge-v1.md
grep -Fq "wc_credit_award: false" src/index.ts
grep -Fq "path_from_dataset_id: false" src/index.ts
grep -Fq "filesystem_path_built_from_dataset_id: false" src/index.ts

curl -fsS --max-time 8 "$BASE/public-node/datanet/challenge-tester-copy-pack-v1.json" > "$OUT/copy-pack.json"
curl -fsS --max-time 8 "$BASE/public-node/datanet/challenge/demo003-folder-fixture-v1" > "$OUT/challenge.json"
curl -fsS --max-time 8 "$BASE/public-node/local-data-drop/folder/demo003-folder-fixture-v1/manifest.json" > "$OUT/manifest.json"
curl -fsS --max-time 8 "$BASE/public-node/route-index.json" > "$OUT/route-index.json"

grep -Fq '"marker":"VOID_DATANET_CHALLENGE_TESTER_COPY_PACK_V1"' "$OUT/copy-pack.json"
grep -Fq '"dataset_id":"demo003-folder-fixture-v1"' "$OUT/copy-pack.json"
grep -Fq '/public-node/datanet/challenge/demo003-folder-fixture-v1' "$OUT/copy-pack.json"
grep -Fq '/public-node/local-data-drop/folder/demo003-folder-fixture-v1/manifest.json' "$OUT/copy-pack.json"
grep -Fq 'VOID_DATANET_CHALLENGE_TESTER_COPY_PACK_SMOKE_V1_GREEN' "$OUT/copy-pack.json"
grep -Fq '"public_read_only":true' "$OUT/copy-pack.json"
grep -Fq '"path_from_dataset_id":false' "$OUT/copy-pack.json"
grep -Fq '"filesystem_path_built_from_dataset_id":false' "$OUT/copy-pack.json"
grep -Fq '"mutation":false' "$OUT/copy-pack.json"
grep -Fq '"ledger_write":false' "$OUT/copy-pack.json"
grep -Fq '"wc_credit_award":false' "$OUT/copy-pack.json"

grep -Fq '"marker":"VOID_DATANET_CHALLENGE_V1"' "$OUT/challenge.json"
grep -Fq '"ok":true' "$OUT/challenge.json"
grep -Fq '"path_from_dataset_id":false' "$OUT/challenge.json"
grep -Fq '"filesystem_path_built_from_dataset_id":false' "$OUT/challenge.json"
grep -Fq '"wc_credit_award":false' "$OUT/challenge.json"

grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO003_FOLDER" "$OUT/manifest.json"
grep -Fq "/public-node/datanet/challenge-tester-copy-pack-v1.json" "$OUT/route-index.json"
grep -Fq "VOID_DATANET_CHALLENGE_TESTER_COPY_PACK_V1" "$OUT/route-index.json"

node - "$OUT/copy-pack.json" "$OUT/smoke.sh" <<'NODE'
const fs = require("fs");
const j = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
if (!j.smoke_command || !j.smoke_command.includes("VOID_DATANET_CHALLENGE_TESTER_COPY_PACK_SMOKE_V1_GREEN")) {
  throw new Error("missing smoke command marker");
}
fs.writeFileSync(process.argv[3], j.smoke_command + "\n");
NODE

bash "$OUT/smoke.sh" > "$OUT/smoke.log"

grep -Fq "VOID_DATANET_CHALLENGE_TESTER_COPY_PACK_SMOKE_V1_GREEN" "$OUT/smoke.log"

npm run build

echo "datanet_challenge_tester_copy_pack_route_green=true"
echo "datanet_challenge_tester_copy_pack_smoke_command_green=true"
echo "datanet_challenge_tester_copy_pack_route_index_green=true"
echo "datanet_challenge_tester_copy_pack_path_from_dataset_id=false"
echo "datanet_challenge_tester_copy_pack_wc_credit_award=false"
echo "VOID_DATANET_CHALLENGE_TESTER_COPY_PACK_PROOF_V1_GREEN"
