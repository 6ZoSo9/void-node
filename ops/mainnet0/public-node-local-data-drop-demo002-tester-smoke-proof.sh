#!/usr/bin/env bash
set -euo pipefail

SCRIPT="ops/mainnet0/public-node-local-data-drop-demo002-tester-smoke.sh"
BASE="${BASE:-http://127.0.0.1:4100}"
SHA="264e0d3832fbad60f3a5bd574794148a0db313583717c4b6bedb94e7db75e871"
OBJECT_ID="live-import-demo-002.txt"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
OUT="/tmp/public-node-local-data-drop-demo002-tester-smoke-proof-$STAMP"

mkdir -p "$OUT"

echo "=== VOID Public Node Local Data Drop Demo 002 Tester Smoke Proof v1 ==="
echo "marker=VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO002_TESTER_SMOKE_PROOF_V1"
echo "head=$(git rev-parse --short=8 HEAD)"
echo "base=$BASE"
echo "out=$OUT"
echo "no_source_mutation=true"

test -x "$SCRIPT"
bash -n "$SCRIPT"

grep -q "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO002_TESTER_SMOKE_V1" "$SCRIPT"
grep -q "PUBLIC_NODE_BASE" "$SCRIPT"
grep -q "$OBJECT_ID" "$SCRIPT"
grep -q "$SHA" "$SCRIPT"
grep -q "public_routes_only=true" "$SCRIPT"
grep -q "read_only=true" "$SCRIPT"
grep -q "mutation=false" "$SCRIPT"
grep -q "money_movement=false" "$SCRIPT"
grep -q "wallet_send=false" "$SCRIPT"
grep -q "validator_mutation=false" "$SCRIPT"

PUBLIC_NODE_BASE="$BASE" OUT="$OUT/run" "$SCRIPT" | tee "$OUT/smoke.log"

grep -q "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO002_TESTER_SMOKE_V1_GREEN" "$OUT/smoke.log"
grep -q "ok /version" "$OUT/smoke.log"
grep -q "ok /public-node/local-data-drop/$OBJECT_ID" "$OUT/smoke.log"
grep -q "ok /public-node/local-data-drop/by-sha256/$SHA" "$OUT/smoke.log"
grep -q "ok /public-node/local-data-drop/proof/$SHA.json" "$OUT/smoke.log"
grep -q "object_by_id_sha256=$SHA" "$OUT/smoke.log"
grep -q "object_by_sha256_sha256=$SHA" "$OUT/smoke.log"
grep -q "objects_match=true" "$OUT/smoke.log"
grep -q "proof_json_verified=true" "$OUT/smoke.log"

if git diff --name-only -- src/index.ts | grep -q .; then
  echo "unexpected_source_diff=true"
  exit 1
fi

echo "demo002_tester_smoke_verified=true"
echo "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO002_TESTER_SMOKE_PROOF_V1_GREEN"
