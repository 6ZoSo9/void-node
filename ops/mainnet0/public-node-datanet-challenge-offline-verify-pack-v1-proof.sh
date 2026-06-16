#!/usr/bin/env bash
set -euo pipefail

BASE="${BASE:-http://127.0.0.1:4100}"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
OUT="${OUT:-/tmp/public-node-datanet-challenge-offline-verify-pack-v1-proof-$STAMP}"

mkdir -p "$OUT"

echo "=== VOID Public Node DataNet Challenge Offline Verify Pack v1 Proof ==="
echo "marker=VOID_DATANET_CHALLENGE_OFFLINE_VERIFY_PACK_PROOF_V1"
echo "head=$(git rev-parse --short=8 HEAD)"
echo "base=$BASE"
echo "out=$OUT"

test -f src/index.ts
test -f docs/public/public-node-datanet-challenge-offline-verify-pack-v1.md

grep -Fq "VOID_DATANET_CHALLENGE_OFFLINE_VERIFY_PACK_ROUTE_V1" src/index.ts
grep -Fq "VOID_DATANET_CHALLENGE_OFFLINE_VERIFY_PACK_V1" src/index.ts
grep -Fq "/public-node/datanet/challenge-offline-verify-pack-v1.json" src/index.ts
grep -Fq "/public-node/datanet/challenge/:dataset_id" src/index.ts
grep -Fq "path_from_dataset_id: false" src/index.ts
grep -Fq "filesystem_path_built_from_dataset_id: false" src/index.ts
grep -Fq "ledger_write: false" src/index.ts
grep -Fq "wc_credit_award: false" src/index.ts
grep -Fq "mutation: false" src/index.ts
grep -Fq "VOID_DATANET_CHALLENGE_OFFLINE_VERIFY_PACK_DOC_V1" docs/public/public-node-datanet-challenge-offline-verify-pack-v1.md

npm run build

curl -fsS "$BASE/public-node/datanet/challenge-offline-verify-pack-v1.json" > "$OUT/pack.json"

grep -Fq '"marker":"VOID_DATANET_CHALLENGE_OFFLINE_VERIFY_PACK_V1"' "$OUT/pack.json"
grep -Fq '"ok":true' "$OUT/pack.json"
grep -Fq '"dataset_id":"demo003-folder-fixture-v1"' "$OUT/pack.json"
grep -Fq '"path_from_dataset_id":false' "$OUT/pack.json"
grep -Fq '"filesystem_path_built_from_dataset_id":false' "$OUT/pack.json"
grep -Fq '"ledger_write":false' "$OUT/pack.json"
grep -Fq '"wc_credit_award":false' "$OUT/pack.json"
grep -Fq '"mutation":false' "$OUT/pack.json"
grep -Fq 'VOID_DATANET_CHALLENGE_OFFLINE_VERIFY_PACK_SMOKE_V1_GREEN' "$OUT/pack.json"
grep -Fq '/public-node/datanet/challenge/:dataset_id' "$OUT/pack.json"

embedded_cmd="$(python3 - "$OUT/pack.json" <<'PY'
import json
import sys

with open(sys.argv[1], "r", encoding="utf-8") as f:
    pack = json.load(f)

cmd = pack.get("offline_verify_command", "")
if not cmd:
    raise SystemExit("missing offline_verify_command")

print(cmd)
PY
)"

bash -lc "$embedded_cmd" > "$OUT/embedded-smoke.log" 2>&1

grep -Fq "VOID_DATANET_CHALLENGE_OFFLINE_VERIFY_PACK_SMOKE_V1_GREEN" "$OUT/embedded-smoke.log"

echo "datanet_challenge_offline_verify_pack_route_green=true"
echo "datanet_challenge_offline_verify_pack_embedded_command_green=true"
echo "datanet_challenge_offline_verify_pack_ledger_write=false"
echo "datanet_challenge_offline_verify_pack_wc_credit_award=false"
echo "VOID_DATANET_CHALLENGE_OFFLINE_VERIFY_PACK_PROOF_V1_GREEN"
