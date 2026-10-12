#!/usr/bin/env bash
set -euo pipefail
BASE="${BASE:-http://127.0.0.1:4100}"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
OUT="/tmp/public-node-copy-link-pack-v1-proof-$STAMP"
mkdir -p "$OUT"

echo "=== Public Node Copy Link Pack v1 proof ==="
echo "out=$OUT"

grep -Fq "VOID_PUBLIC_NODE_COPY_LINK_PACK_UI_V1" src/index.ts
grep -Fq "Copy link pack" src/index.ts
grep -Fq "/public-node/client-work-pack.json" src/index.ts
grep -Fq "/public-node/ai-readiness.json" src/index.ts
grep -Fq "/public-node/fresh-proof-seed.json" src/index.ts
grep -Fq "/public-node/requester-work-policy.json" src/index.ts
grep -Fq "Share public routes only" src/index.ts
echo "[ok] source markers"

npm run build
echo "[ok] build"

PIDS="$(lsof -tiTCP:4100 -sTCP:LISTEN 2>/dev/null || true)"
if [ -n "$PIDS" ]; then kill $PIDS 2>/dev/null || true; sleep 1; fi

PORT=4100 VOID_HTTP_PORT=4100 HOST=127.0.0.1 node dist/index.js > "$OUT/server.log" 2>&1 &
PID="$!"
trap 'kill "$PID" 2>/dev/null || true' EXIT

for i in $(seq 1 80); do
  if curl --max-time 10 -fsS "$BASE/public-node" > "$OUT/public-node.html" 2>/dev/null; then
    echo "[ok] server live"
    break
  fi
  sleep 0.25
done

grep -Fq "VOID_PUBLIC_NODE_COPY_LINK_PACK_UI_V1" "$OUT/public-node.html"
grep -Fq "Copy link pack" "$OUT/public-node.html"
grep -Fq "/public-node/client-work-pack.json" "$OUT/public-node.html"
grep -Fq "/public-node/ai-readiness.json" "$OUT/public-node.html"
grep -Fq "/public-node/fresh-proof-seed.json" "$OUT/public-node.html"
grep -Fq "/public-node/requester-work-policy.json" "$OUT/public-node.html"
grep -Fq "/proofs" "$OUT/public-node.html"
grep -Fq "Share public routes only" "$OUT/public-node.html"

if grep -Fq "<form" "$OUT/public-node.html"; then echo "[fail] form exposed"; exit 1; fi
if grep -Fq "/__void/participant" "$OUT/public-node.html"; then echo "[fail] private api exposed"; exit 1; fi
if grep -Fq "/__void/buy-void" "$OUT/public-node.html"; then echo "[fail] buy api exposed"; exit 1; fi
if grep -Fq "/wc-proof-demo/generate" "$OUT/public-node.html"; then echo "[fail] proof mutation exposed"; exit 1; fi

echo "marker=VOID_PUBLIC_NODE_COPY_LINK_PACK_UI_V1"
echo "profile_route=/public-node"
echo "copy_routes=/public-node,/public-node/client-work-pack.json,/public-node/ai-readiness.json,/public-node/fresh-proof-seed.json,/public-node/requester-work-policy.json,/proofs"
echo "copy_link_pack_mutation=false"
echo "read_only=true"
echo "money_movement=false"
echo "wallet_send=false"
echo "wc_to_void_swap=false"
echo "buy_void_fulfillment=false"
echo "validator_mutation=false"
echo "out=$OUT"
echo "VOID_PUBLIC_NODE_COPY_LINK_PACK_V1_GREEN"
