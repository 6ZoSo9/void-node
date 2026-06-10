#!/usr/bin/env bash
set -euo pipefail

RUN_PORT="${RUN_PORT:-4132}"
BASE="${BASE:-http://127.0.0.1:${RUN_PORT}}"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
OUT="/tmp/public-node-quickstart-v1-proof-$STAMP"
mkdir -p "$OUT/data"

openssl genpkey -algorithm ED25519 -out "$OUT/nodeA.key" >/dev/null 2>&1
chmod 600 "$OUT/nodeA.key"

echo "=== Public Node Quickstart v1 proof ==="
echo "out=$OUT"

grep -Fq "VOID_PUBLIC_NODE_QUICKSTART_ROUTE_V1" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_QUICKSTART_V1" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_QUICKSTART_UI_V1" src/index.ts
grep -Fq "/public-node/quickstart.json" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_QUICKSTART_DOC_V1" docs/public/public-node-quickstart.md
echo "[ok] source/docs markers"

npm run build
echo "[ok] build"

PIDS="$(lsof -tiTCP:${RUN_PORT} -sTCP:LISTEN 2>/dev/null || true)"
if [ -n "$PIDS" ]; then kill $PIDS 2>/dev/null || true; sleep 1; fi

DATA_DIR="$OUT/data"
P2P_PORT=4732
NODE_PRIVKEY_PATH="$OUT/nodeA.key"
PORT="${RUN_PORT}"
HTTP_PORT="${RUN_PORT}"
VOID_HTTP_PORT="${RUN_PORT}"
HOST=127.0.0.1
PUBLIC_NODE_EXTERNAL_BASE_URL="https://example.void.test"
(
  export DATA_DIR="$OUT/data"
  export P2P_PORT=4732
  export NODE_PRIVKEY_PATH="$OUT/nodeA.key"
  export PORT="${RUN_PORT}"
  export HTTP_PORT="${RUN_PORT}"
  export VOID_HTTP_PORT="${RUN_PORT}"
  export HOST=127.0.0.1
  export PUBLIC_NODE_EXTERNAL_BASE_URL="https://example.void.test"
  npm start
) > "$OUT/server.log" 2>&1 &

PID="$!"
trap 'kill "$PID" 2>/dev/null || true' EXIT

for i in $(seq 1 100); do
if curl --max-time 10 -fsS "$BASE/public-node/quickstart.json" > "$OUT/quickstart.json" 2>/dev/null; then
echo "[ok] npm start server live"
break
fi
sleep 0.25
done

curl --max-time 10 -fsS "$BASE/public-node" > "$OUT/public-node.html"
curl --max-time 10 -fsS "$BASE/public-node/route-index.json" > "$OUT/route-index.json"
curl --max-time 10 -fsS "$BASE/public-node/public-exposure-smoke-pack.json" > "$OUT/public-exposure-smoke-pack.json"

node - "$OUT/quickstart.json" "$OUT/route-index.json" "$OUT/public-exposure-smoke-pack.json" <<'NODE'
const fs = require("fs");
const quick = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const idx = JSON.parse(fs.readFileSync(process.argv[3], "utf8"));
const smoke = JSON.parse(fs.readFileSync(process.argv[4], "utf8"));

function ok(x, msg) {
if (!x) {
console.error("[fail]", msg);
process.exit(1);
}
}

ok(quick.marker === "VOID_PUBLIC_NODE_QUICKSTART_V1", "quickstart marker");
ok(quick.purpose === "public_node_outside_tester_quickstart", "purpose");
ok(quick.effective_base_url === "https://example.void.test", "effective external base URL");
ok(String(quick.local_start_command || "").includes("NODE_PRIVKEY_PATH=.runtime/public-node/node.key"), "local key command");
ok(String(quick.local_start_command || "").includes("npm start"), "npm start command");
ok(String(quick.smoke_command || "").includes("/public-node/quickstart.json"), "quickstart smoke command");
ok(quick.policy && quick.policy.public_routes_only === true, "public routes only");
ok(quick.policy && quick.policy.read_only === true, "read only");
ok(quick.policy && quick.policy.money_movement === false, "no money movement");
ok(quick.policy && quick.policy.wallet_send === false, "no wallet send");
ok(quick.policy && quick.policy.wc_to_void_swap === false, "no wc swap");
ok(quick.policy && quick.policy.buy_void_fulfillment === false, "no buy fulfillment");
ok(quick.policy && quick.policy.validator_mutation === false, "no validator mutation");

ok(Array.isArray(idx.routes), "route index routes");
ok(idx.routes.some(r => r.path === "/public-node/quickstart.json" && r.marker === "VOID_PUBLIC_NODE_QUICKSTART_V1"), "route index quickstart entry");
ok(smoke.marker === "VOID_PUBLIC_NODE_PUBLIC_EXPOSURE_SMOKE_PACK_V1", "smoke pack still works");

console.log("[ok] json quickstart");
NODE

grep -Fq "VOID_PUBLIC_NODE_QUICKSTART_UI_V1" "$OUT/public-node.html"
grep -Fq "/public-node/quickstart.json" "$OUT/public-node.html"
grep -Fq "VOID_PUBLIC_NODE_QUICKSTART_DOC_V1" docs/public/public-node-quickstart.md

echo "marker=VOID_PUBLIC_NODE_QUICKSTART_V1"
echo "route=/public-node/quickstart.json"
echo "ui_marker=VOID_PUBLIC_NODE_QUICKSTART_UI_V1"
echo "doc=docs/public/public-node-quickstart.md"
echo "npm_start=true"
echo "external_base_url=https://example.void.test"
echo "public_routes_only=true"
echo "read_only=true"
echo "money_movement=false"
echo "wallet_send=false"
echo "wc_to_void_swap=false"
echo "buy_void_fulfillment=false"
echo "validator_mutation=false"
echo "out=$OUT"
echo "VOID_PUBLIC_NODE_QUICKSTART_V1_GREEN"
