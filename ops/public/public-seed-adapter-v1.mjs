#!/usr/bin/env node
import http from "node:http";

const UPSTREAM = (process.env.VOID_SEED_UPSTREAM || "http://127.0.0.1:4100").replace(/\/+$/, "");
const HOST = process.env.VOID_ADAPTER_HOST || "127.0.0.1";
const PORT = Number(process.env.VOID_ADAPTER_PORT || "4111");

const exactAllow = new Set([
  "/",
  "/funding",
  "/buy-void",
  "/__void/ready.json",
  "/__void/public-bootstrap.json",
  "/__void/adapter.json",
  "/__void/funding/status.json",
  "/__void/buy-void/config.json",
  "/__void/buy-void/request.json",
  "/__void/buy-void/status.json",
  "/__void/public-seed-adapter/status.json",
  "/datanet/materialized-status",
]);

const prefixAllow = [
  "/participant",
  "/download",
  "/site/voidchain",
  "/docs/public",
];

const blocked = [
  "/rpc",
  "/admin",
  "/operator",
  "/validator/admin",
  "/debug",
  "/.env",
  "/keys",
  "/wallet",
  "/secrets",
];

function allowed(pathname) {
  if (blocked.some((x) => pathname === x || pathname.startsWith(x + "/"))) return false;
  if (exactAllow.has(pathname)) return true;
  return prefixAllow.some((x) => pathname === x || pathname.startsWith(x + "/"));
}

const server = http.createServer(async (req, res) => {

  // VOID_PUBLIC_EDGE_LANDING_ROOT_V1
  const __voidPublicEdgeLandingPath = new URL(req.url || "/", "http://void.local").pathname;
  if (__voidPublicEdgeLandingPath === "/") {
    res.writeHead(200, {
      "content-type": "text/html; charset=utf-8",
      "x-void-public-seed-adapter": "v1",
      "cache-control": "no-store"
    });
    res.end(`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>VOID Network</title>
<style>
body{margin:0;background:#050814;color:#e5e7eb;font-family:system-ui,-apple-system,Segoe UI,sans-serif;line-height:1.45}
main{max-width:980px;margin:0 auto;padding:38px 18px}
.hero{border:1px solid #263244;background:linear-gradient(135deg,#0d1321,#111827);border-radius:18px;padding:24px;margin:16px 0}
.card{border:1px solid #263244;background:#0b1020;border-radius:16px;padding:18px;margin:14px 0}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px}
a{color:#93c5fd;text-decoration:none}.btn{display:inline-block;background:#1d4ed8;color:#fff;padding:10px 14px;border-radius:10px;margin:6px 8px 6px 0;text-decoration:none}.btn.secondary{background:#1f2937;color:#dbeafe;border:1px solid #334155}.badge{display:inline-block;border:1px solid #334155;border-radius:999px;padding:4px 10px;margin:4px 6px 4px 0;color:#cbd5e1}.ok{color:#86efac}.warn{color:#fbbf24}code{background:#111827;padding:2px 5px;border-radius:5px}small{color:#94a3b8}
</style>
</head>
<body>
<main>
<section class="hero"><!-- VOID_PUBLIC_LANDING_ROOT_V1 --><!-- VOID_PUBLIC_EDGE_LANDING_ROOT_V1 -->
  <h1>VOID Network is live</h1>
  <p>VOID is a public-safe seed surface: participant access, bootstrap discovery, readiness status, and guarded USDC → VOID funding.</p>
  <p>
    <a class="btn" href="/participant">Open Participant Page</a>
    <a class="btn" href="/funding">Buy VOID / Fund Development</a>
    <a class="btn secondary" href="/__void/public-seed-adapter/status.json">Seed Status JSON</a>
  </p>
  <span class="badge">public seed online</span>
  <span class="badge">ready endpoint live</span>
  <span class="badge">/rpc blocked</span>
  <span class="badge">guarded funding only</span>
</section>

<section class="grid">
  <div class="card">
    <h2>Start here</h2>
    <p>Use the participant page to inspect VOID, wallet/onboarding surfaces, Work Credits, DataNet, and the guarded funding path.</p>
    <p><a href="/participant">Go to participant page →</a></p>
  </div>

  <div class="card">
    <h2>Funding</h2>
    <p>Funding is the guarded <b>USDC → VOID</b> path. Manual review is required.</p>
    <p class="warn">No automatic token delivery. No investment return promised.</p>
    <p><a href="/funding">Open funding page →</a></p>
  </div>

  <div class="card">
    <h2>Public proof</h2>
    <p><a href="/__void/adapter.json">Adapter manifest</a></p>
    <p><a href="/__void/ready.json">Readiness JSON</a></p>
    <p><a href="/__void/public-bootstrap.json">Public bootstrap JSON</a></p>
    <p><a href="/__void/funding/status.json">Funding status JSON</a></p>
  </div>

  <div class="card">
    <h2>Safety</h2>
    <ul>
      <li class="ok"><code>/rpc</code> is blocked.</li>
      <li class="ok">Wallet/key/admin/operator/secret routes are blocked.</li>
      <li class="ok">Private JSON-RPC is not public.</li>
      <li class="ok">Public surface is allowlisted.</li>
    </ul>
  </div>
</section>

<section class="card">
  <h2>Current public seed URL</h2>
  <p><a href="https://zoso-alienware-aurora-r7.taila47fd.ts.net">https://zoso-alienware-aurora-r7.taila47fd.ts.net</a></p>
  <small>Custom domains are optional wrappers. The seed proves itself through public JSON routes.</small>
</section>
</main>
</body>
</html>`);
    return;
  }

  try {
    if (req.method !== "GET" && req.method !== "HEAD") {
      res.writeHead(405, { "content-type": "text/plain" });
      res.end("method_not_allowed\n");
      return;
    }

    const url = new URL(req.url || "/", "http://adapter.local");
    if (!allowed(url.pathname)) {
      res.writeHead(404, { "content-type": "text/plain" });
      res.end("not_public\n");
      return;
    }

    if (url.pathname === "/__void/adapter.json") {
      res.writeHead(200, {
        "content-type": "application/json",
        "x-void-public-seed-adapter": "v1"
      });
      res.end(JSON.stringify({
        adapter: "void_public_seed_adapter",
        version: 1,
        mode: "read_only_allowlist_proxy",
        upstream_private: true,
        exact_allow: Array.from(exactAllow).sort(),
        prefix_allow: prefixAllow.slice().sort(),
        blocked: blocked.slice().sort(),
        private_rpc_public: false
      }, null, 2) + "\n");
      return;
    }

    const upstreamUrl = `${UPSTREAM}${url.pathname}${url.search}`;
    const r = await fetch(upstreamUrl, { method: req.method, redirect: "manual" });

    const headers = {};
    for (const [k, v] of r.headers.entries()) {
      if (!["connection", "keep-alive", "transfer-encoding"].includes(k.toLowerCase())) headers[k] = v;
    }
    headers["x-void-public-seed-adapter"] = "v1";

    res.writeHead(r.status, headers);
    if (req.method === "HEAD") return res.end();

    const body = Buffer.from(await r.arrayBuffer());
    res.end(body);
  } catch {
    res.writeHead(502, { "content-type": "text/plain" });
    res.end("adapter_upstream_error\n");
  }
});

server.listen(PORT, HOST, () => {
  console.log(`void_public_seed_adapter_v1 host=${HOST} port=${PORT} upstream=${UPSTREAM}`);
});
