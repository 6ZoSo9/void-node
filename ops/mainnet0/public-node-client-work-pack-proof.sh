#!/usr/bin/env bash
set -euo pipefail
BASE="${BASE:-http://127.0.0.1:4100}"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
OUT="/tmp/public-node-client-work-pack-v1-proof-$STAMP"
mkdir -p "$OUT"

echo "=== Public Node Client Work Pack v1 proof ==="
echo "out=$OUT"

grep -Fq "VOID_PUBLIC_NODE_CLIENT_WORK_PACK_ROUTE_V1" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_CLIENT_WORK_PACK_V1" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_CLIENT_WORK_PACK_UI_V1" src/index.ts
grep -Fq "/public-node/client-work-pack.json" src/index.ts
grep -Fq "verify_proofs" src/index.ts
grep -Fq "avoid_private_owner_routes" src/index.ts
echo "[ok] source markers"

npm run build
echo "[ok] build"

PIDS="$(lsof -tiTCP:4100 -sTCP:LISTEN 2>/dev/null || true)"
if [ -n "$PIDS" ]; then kill $PIDS 2>/dev/null || true; sleep 1; fi

PORT=4100 VOID_HTTP_PORT=4100 HOST=127.0.0.1 node dist/index.js > "$OUT/server.log" 2>&1 &
PID="$!"
trap 'kill "$PID" 2>/dev/null || true' EXIT

for i in $(seq 1 80); do
  if curl --max-time 10 -fsS "$BASE/public-node/client-work-pack.json" > "$OUT/client-work-pack.json" 2>/dev/null; then
    echo "[ok] server live"
    break
  fi
  sleep 0.25
done

curl --max-time 15 -fsS "$BASE/public-node" > "$OUT/public-node.html"

node - "$OUT/client-work-pack.json" <<'NODE'
const fs = require("fs");
const j = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
function ok(x,m){ if(!x) throw new Error(m); }
ok(j.ok === true, "ok");
ok(j.marker === "VOID_PUBLIC_NODE_CLIENT_WORK_PACK_V1", "marker");
ok(j.route === "/public-node/client-work-pack.json", "route");
ok(j.purpose === "agent_and_client_bootstrap_pack", "purpose");
ok(j.public_routes.includes("/public-node"), "public node route");
ok(j.public_routes.includes("/public-node/intelligence.json"), "intelligence");
ok(j.public_routes.includes("/public-node/ai-readiness.json"), "ai readiness");
ok(j.public_routes.includes("/public-node/requester-work-policy.json"), "requester policy");
ok(j.public_routes.includes("/proofs"), "proofs");
ok(j.node_serves.includes("proofs"), "proofs");
ok(j.node_serves.includes("chunks"), "chunks");
ok(j.node_serves.includes("manifests"), "manifests");
ok(j.node_serves.includes("minimal_indexes"), "indexes");
ok(j.node_serves.includes("bounded_summaries"), "summaries");
ok(j.client_should.includes("fetch_public_routes"), "fetch");
ok(j.client_should.includes("verify_proofs"), "verify");
ok(j.client_should.includes("check_link_health"), "health");
ok(j.client_should.includes("rank_results_locally"), "rank");
ok(j.client_should.includes("cache_results_locally"), "cache");
ok(j.client_should.includes("retry_failed_public_links"), "retry");
ok(j.client_should.includes("avoid_private_owner_routes"), "avoid private");
ok(j.requester_work_default === true, "requester default");
ok(j.policy.public_pack_only === true, "pack only");
ok(j.policy.local_path_exposure === false, "no path");
ok(j.policy.raw_filesystem_url_exposure === false, "no raw fs");
ok(j.policy.mutation === false, "no mutation");
ok(j.safety.read_only === true, "read only");
ok(j.safety.money_movement === false, "no money");
ok(j.safety.wallet_send === false, "no wallet");
ok(j.safety.wc_to_void_swap === false, "no swap");
ok(j.safety.buy_void_fulfillment === false, "no buy");
ok(j.safety.validator_mutation === false, "no validator");
console.log("purpose=" + j.purpose);
console.log("public_routes_count=" + j.public_routes.length);
console.log("client_should_count=" + j.client_should.length);
console.log("requester_work_default=" + j.requester_work_default);
NODE

grep -Fq "VOID_PUBLIC_NODE_CLIENT_WORK_PACK_UI_V1" "$OUT/public-node.html"
grep -Fq "Client work pack" "$OUT/public-node.html"
grep -Fq "/public-node/client-work-pack.json" "$OUT/public-node.html"

if grep -Fq "$(pwd)" "$OUT/client-work-pack.json"; then echo "[fail] cwd path exposed"; exit 1; fi
if grep -Fq "$HOME" "$OUT/client-work-pack.json"; then echo "[fail] home path exposed"; exit 1; fi
if grep -Fq "file://" "$OUT/client-work-pack.json"; then echo "[fail] file url exposed"; exit 1; fi
if grep -Fq "<form" "$OUT/public-node.html"; then echo "[fail] form exposed"; exit 1; fi
if grep -Fq "/__void/participant" "$OUT/public-node.html"; then echo "[fail] private api exposed"; exit 1; fi
if grep -Fq "/__void/buy-void" "$OUT/public-node.html"; then echo "[fail] buy api exposed"; exit 1; fi

echo "route=/public-node/client-work-pack.json"
echo "marker=VOID_PUBLIC_NODE_CLIENT_WORK_PACK_V1"
echo "purpose=agent_and_client_bootstrap_pack"
echo "requester_work_default=true"
echo "client_should=fetch_public_routes,verify_proofs,check_link_health,rank_results_locally,cache_results_locally,retry_failed_public_links,avoid_private_owner_routes"
echo "read_only=true"
echo "money_movement=false"
echo "wallet_send=false"
echo "wc_to_void_swap=false"
echo "buy_void_fulfillment=false"
echo "validator_mutation=false"
echo "out=$OUT"
echo "VOID_PUBLIC_NODE_CLIENT_WORK_PACK_V1_GREEN"
