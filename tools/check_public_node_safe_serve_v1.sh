#!/usr/bin/env bash
set -euo pipefail

node - <<'NODE'
const fs = require("fs");
const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
if (pkg.scripts?.["public-node:serve"] !== "node tools/public-node-safe-serve-v1.mjs") {
  throw new Error("missing public-node:serve script");
}
if (!fs.existsSync("tools/public-node-safe-serve-v1.mjs")) {
  throw new Error("missing tools/public-node-safe-serve-v1.mjs");
}
NODE

npm run public-node:serve -- --check | grep -q 'VOID_PUBLIC_NODE_SAFE_SERVE_V1_GREEN'

PORT=18088
node tools/public-node-safe-serve-v1.mjs --host 127.0.0.1 --port "$PORT" >/tmp/void-public-node-safe-serve.out 2>&1 &
pid=$!
trap 'kill "$pid" 2>/dev/null || true' EXIT

for i in $(seq 1 40); do
  if grep -q 'VOID_PUBLIC_NODE_SAFE_SERVE_V1_READY' /tmp/void-public-node-safe-serve.out; then
    break
  fi
  sleep 0.25
done

grep -q 'VOID_PUBLIC_NODE_SAFE_SERVE_V1_READY' /tmp/void-public-node-safe-serve.out

node - <<NODE
const http = require("http");
const port = Number(process.env.PORT || "$PORT");

http.get({ hostname: "127.0.0.1", port, path: "/public-node/index.json" }, (res) => {
  const chunks = [];
  res.on("data", c => chunks.push(c));
  res.on("end", () => {
    if (res.statusCode !== 200) throw new Error("bad status " + res.statusCode);
    JSON.parse(Buffer.concat(chunks).toString("utf8"));
    console.log("serve fetch ok");
  });
}).on("error", (err) => {
  throw err;
});
NODE

kill "$pid" 2>/dev/null || true
trap - EXIT

echo "VOID_PUBLIC_NODE_SAFE_SERVE_V1_GREEN"
