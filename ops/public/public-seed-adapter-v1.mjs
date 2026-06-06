#!/usr/bin/env node
import http from "node:http";

const UPSTREAM = (process.env.VOID_SEED_UPSTREAM || "http://127.0.0.1:4100").replace(/\/+$/, "");
const HOST = process.env.VOID_ADAPTER_HOST || "127.0.0.1";
const PORT = Number(process.env.VOID_ADAPTER_PORT || "4111");

const exactAllow = new Set([
  "/",
  "/__void/ready.json",
  "/__void/public-bootstrap.json",
  "/__void/adapter.json",
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
