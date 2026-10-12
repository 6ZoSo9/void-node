#!/usr/bin/env bash
set -euo pipefail

RUN_PORT="${RUN_PORT:-4139}"
BASE="${BASE:-http://127.0.0.1:${RUN_PORT}}"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
OUT="/tmp/public-node-outside-tester-smoke-surface-v1-proof-$STAMP"
mkdir -p "$OUT/data"

openssl genpkey -algorithm ED25519 -out "$OUT/nodeA.key" >/dev/null 2>&1
chmod 600 "$OUT/nodeA.key"

echo "=== Public Node Outside Tester Smoke Surface v1 proof ==="
echo "out=$OUT"

grep -Fq "VOID_PUBLIC_NODE_OUTSIDE_TESTER_SMOKE_SURFACE_ROUTE_V1" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_OUTSIDE_TESTER_SMOKE_SURFACE_V1" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_OUTSIDE_TESTER_SMOKE_SURFACE_UI_V1" src/index.ts
grep -Fq "/public-node/outside-tester-smoke.json" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_OUTSIDE_TESTER_SMOKE_SURFACE_DOC_V1" docs/public/public-node-outside-tester-smoke-surface.md
grep -Fq "VOID_PUBLIC_NODE_OUTSIDE_TESTER_SMOKE_V1_GREEN" ops/mainnet0/public-node-outside-tester-smoke.sh
grep -Fq "/public-node/real-data-import-lane-status.json" ops/mainnet0/public-node-outside-tester-smoke.sh
echo "[ok] source/docs/smoke markers"

npm run build
echo "[ok] build"

PIDS="$(lsof -tiTCP:${RUN_PORT} -sTCP:LISTEN 2>/dev/null || true)"
if [ -n "$PIDS" ]; then kill $PIDS 2>/dev/null || true; sleep 1; fi

(
  export DATA_DIR="$OUT/data"
  export P2P_PORT=4739
  export NODE_PRIVKEY_PATH="$OUT/nodeA.key"
  export PORT="${RUN_PORT}"
  export HTTP_PORT="${RUN_PORT}"
  export VOID_HTTP_PORT="${RUN_PORT}"
  export HOST=127.0.0.1
  export PUBLIC_NODE_EXTERNAL_BASE_URL="$BASE"
  npm start
) > "$OUT/server.log" 2>&1 &

PID="$!"
trap 'kill "$PID" 2>/dev/null || true' EXIT

for i in $(seq 1 100); do
  if curl --max-time 10 -fsS "$BASE/public-node/outside-tester-smoke.json" > "$OUT/outside-tester-smoke-surface.json" 2>/dev/null; then
    echo "[ok] npm start server live"
    break
  fi
  sleep 0.25
done

curl --max-time 10 -fsS "$BASE/public-node" > "$OUT/public-node.html"
curl --max-time 10 -fsS "$BASE/public-node/route-index.json" > "$OUT/route-index.json"
curl --max-time 10 -fsS "$BASE/public-node/tester-loop-status.json" > "$OUT/tester-loop-status.json"

node - "$OUT/outside-tester-smoke-surface.json" "$OUT/route-index.json" "$OUT/tester-loop-status.json" <<'NODE'
const fs = require("fs");
const surface = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const idx = JSON.parse(fs.readFileSync(process.argv[3], "utf8"));
const loop = JSON.parse(fs.readFileSync(process.argv[4], "utf8"));

function ok(x, msg) {
  if (!x) {
    console.error("[fail]", msg);
    process.exit(1);
  }
}

ok(surface.marker === "VOID_PUBLIC_NODE_OUTSIDE_TESTER_SMOKE_SURFACE_V1", "surface marker");
ok(surface.purpose === "public_node_outside_tester_smoke_command_surface", "purpose");
ok(surface.effective_base_url === "http://127.0.0.1:4139", "effective base url");
ok(surface.script_path === "ops/mainnet0/public-node-outside-tester-smoke.sh", "script path");
ok(String(surface.command || "").includes("PUBLIC_NODE_BASE=http://127.0.0.1:4139"), "command base");
ok(String(surface.command || "").includes("ops/mainnet0/public-node-outside-tester-smoke.sh"), "command script");
ok(surface.expected_green_marker === "VOID_PUBLIC_NODE_OUTSIDE_TESTER_SMOKE_V1_GREEN", "expected green marker");
ok(Array.isArray(surface.checked_routes), "checked routes array");
ok(surface.checked_routes.includes("/public-node/outside-tester-smoke.json") === false, "surface route not self-required");
ok(surface.checked_routes.includes("/public-node/tester-loop-status.json"), "loop route checked");
ok(surface.checked_routes.includes("/public-node/real-data-import-lane-status.json"), "real data status route checked");
ok(surface.checked_routes.includes("/proofs"), "proofs checked");

ok(surface.policy.public_routes_only === true, "public routes only");
ok(surface.policy.read_only === true, "read only");
ok(surface.policy.money_movement === false, "no money movement");
ok(surface.policy.wallet_send === false, "no wallet send");
ok(surface.policy.wc_to_void_swap === false, "no wc swap");
ok(surface.policy.buy_void_fulfillment === false, "no buy fulfillment");
ok(surface.policy.validator_mutation === false, "no validator mutation");

ok(idx.routes.some(r => r.path === "/public-node/outside-tester-smoke.json" && r.marker === "VOID_PUBLIC_NODE_OUTSIDE_TESTER_SMOKE_SURFACE_V1"), "route index surface entry");
ok(loop.marker === "VOID_PUBLIC_NODE_TESTER_LOOP_STATUS_V1", "loop status still works");
ok(loop.loop_ready === true, "loop ready still true");

console.log("[ok] json outside tester smoke surface");
NODE

grep -Fq "VOID_PUBLIC_NODE_OUTSIDE_TESTER_SMOKE_SURFACE_UI_V1" "$OUT/public-node.html"
grep -Fq "/public-node/outside-tester-smoke.json" "$OUT/public-node.html"
grep -Fq "VOID_PUBLIC_NODE_OUTSIDE_TESTER_SMOKE_SURFACE_DOC_V1" docs/public/public-node-outside-tester-smoke-surface.md

echo "marker=VOID_PUBLIC_NODE_OUTSIDE_TESTER_SMOKE_SURFACE_V1"
echo "route=/public-node/outside-tester-smoke.json"
echo "ui_marker=VOID_PUBLIC_NODE_OUTSIDE_TESTER_SMOKE_SURFACE_UI_V1"
echo "doc=docs/public/public-node-outside-tester-smoke-surface.md"
echo "npm_start=true"
echo "public_node_base=$BASE"
echo "expected_green_marker=VOID_PUBLIC_NODE_OUTSIDE_TESTER_SMOKE_V1_GREEN"
echo "real_data_status_route_smoke_surface_green=true"
echo "public_routes_only=true"
echo "read_only=true"
echo "money_movement=false"
echo "wallet_send=false"
echo "wc_to_void_swap=false"
echo "buy_void_fulfillment=false"
echo "validator_mutation=false"
echo "out=$OUT"
echo "VOID_PUBLIC_NODE_OUTSIDE_TESTER_SMOKE_SURFACE_V1_GREEN"
