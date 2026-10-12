#!/usr/bin/env bash
set -euo pipefail

VERIFY="ops/mainnet0/public-node-local-data-drop-demo002-verify-smoke-receipt.sh"
SMOKE="ops/mainnet0/public-node-local-data-drop-demo002-tester-smoke.sh"
SHA="264e0d3832fbad60f3a5bd574794148a0db313583717c4b6bedb94e7db75e871"
OBJECT_ID="live-import-demo-002.txt"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
OUT="/tmp/public-node-local-data-drop-demo002-verify-smoke-receipt-proof-$STAMP"

mkdir -p "$OUT"

echo "=== VOID Public Node Demo 002 Verify Smoke Receipt Proof v1 ==="
echo "marker=VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO002_VERIFY_SMOKE_RECEIPT_PROOF_V1"
echo "head=$(git rev-parse --short=8 HEAD)"
echo "out=$OUT"
echo "no_source_mutation=true"

test -x "$VERIFY"
test -x "$SMOKE"
bash -n "$VERIFY"
bash -n "$SMOKE"

PUBLIC_NODE_BASE="${BASE:-http://127.0.0.1:4100}" OUT="$OUT/smoke-run" "$SMOKE" | tee "$OUT/smoke.log"

RECEIPT="$(grep '^receipt=' "$OUT/smoke.log" | tail -n 1 | cut -d= -f2-)"
test -f "$RECEIPT"

"$VERIFY" "$RECEIPT" | tee "$OUT/verify-good.log"

grep -q "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO002_VERIFY_SMOKE_RECEIPT_V1_GREEN" "$OUT/verify-good.log"
grep -q "offline_verify=true" "$OUT/verify-good.log"
grep -q "network_fetch=false" "$OUT/verify-good.log"
grep -q "$SHA" "$OUT/verify-good.log"
grep -q "$OBJECT_ID" "$OUT/verify-good.log"

node - "$RECEIPT" "$OUT/bad-receipt.json" <<'NODE'
const fs = require("fs");
const good = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
good.object_by_id_sha256 = "bad";
fs.writeFileSync(process.argv[3], JSON.stringify(good, null, 2) + "\n");
NODE

if "$VERIFY" "$OUT/bad-receipt.json" > "$OUT/verify-bad.log" 2>&1; then
  echo "[fail] bad receipt verified unexpectedly" >&2
  exit 1
fi

if git diff --name-only -- src/index.ts | grep -q .; then
  echo "unexpected_source_diff=true"
  exit 1
fi

echo "valid_receipt_verified=true"
echo "bad_receipt_rejected=true"
echo "offline_verify=true"
echo "network_fetch=false"
echo "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO002_VERIFY_SMOKE_RECEIPT_PROOF_V1_GREEN"
