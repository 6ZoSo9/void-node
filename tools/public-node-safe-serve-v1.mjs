#!/usr/bin/env node
import http from "node:http";
import { existsSync, readFileSync, statSync } from "node:fs";
import { hostname } from "node:os";
import { extname, join, resolve, sep } from "node:path";

const args = process.argv.slice(2);
let port = Number(process.env.VOID_PUBLIC_NODE_PORT || "8088");
let bindHost = process.env.VOID_PUBLIC_NODE_BIND || "0.0.0.0";
let checkOnly = false;

for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === "--check") checkOnly = true;
  else if (a === "--port") port = Number(args[++i]);
  else if (a === "--host" || a === "--bind") bindHost = args[++i] || bindHost;
  else if (/^\d+$/.test(a)) port = Number(a);
}

const root = resolve(process.cwd(), "public");
const publicNodeIndex = resolve(root, "public-node", "index.json");

function fail(message) {
  console.error("VOID_PUBLIC_NODE_SAFE_SERVE_V1_FAIL");
  console.error(message);
  process.exit(1);
}

function safeResolve(urlPath) {
  const cleanPath = decodeURIComponent(urlPath.split("?")[0] || "/");
  const rel = cleanPath.replace(/^\/+/, "");
  const target = resolve(root, rel);

  if (target !== root && !target.startsWith(root + sep)) {
    return null;
  }

  return target;
}

function contentType(path) {
  const ext = extname(path).toLowerCase();
  if (ext === ".html") return "text/html; charset=utf-8";
  if (ext === ".json") return "application/json; charset=utf-8";
  if (ext === ".txt") return "text/plain; charset=utf-8";
  if (ext === ".md") return "text/markdown; charset=utf-8";
  if (ext === ".css") return "text/css; charset=utf-8";
  if (ext === ".js" || ext === ".mjs") return "text/javascript; charset=utf-8";
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".svg") return "image/svg+xml";
  return "application/octet-stream";
}

function preflight() {
  if (!existsSync(root)) fail(`public root missing: ${root}`);
  if (!existsSync(publicNodeIndex)) fail(`public-node index missing: ${publicNodeIndex}`);

  try {
    JSON.parse(readFileSync(publicNodeIndex, "utf8"));
  } catch (err) {
    fail(`public-node index JSON parse failed: ${err.message}`);
  }

  console.log("VOID_PUBLIC_NODE_SAFE_SERVE_V1_GREEN");
  console.log(`host=${hostname()}`);
  console.log(`root=${root}`);
  console.log(`public_node_index=${publicNodeIndex}`);
}

if (checkOnly) {
  preflight();
  process.exit(0);
}

preflight();

const server = http.createServer((req, res) => {
  if (!["GET", "HEAD"].includes(req.method || "")) {
    res.writeHead(405, { "content-type": "text/plain; charset=utf-8" });
    res.end("method not allowed\n");
    return;
  }

  const target = safeResolve(req.url || "/");
  if (!target) {
    res.writeHead(403, { "content-type": "text/plain; charset=utf-8" });
    res.end("forbidden\n");
    return;
  }

  let file = target;
  if (existsSync(file) && statSync(file).isDirectory()) {
    file = join(file, "index.html");
  }

  if (!existsSync(file) || !statSync(file).isFile()) {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    res.end("not found\n");
    return;
  }

  const body = readFileSync(file);
  res.writeHead(200, {
    "content-type": contentType(file),
    "content-length": body.length,
    "cache-control": "no-store",
  });

  if (req.method === "HEAD") res.end();
  else res.end(body);
});

server.listen(port, bindHost, () => {
  console.log("VOID_PUBLIC_NODE_SAFE_SERVE_V1_READY");
  console.log(`host=${hostname()}`);
  console.log(`bind=${bindHost}`);
  console.log(`port=${port}`);
  console.log(`root=${root}`);
  console.log(`local_url=http://127.0.0.1:${port}/public-node/index.json`);
  console.log("dangerous_paths_touched=false");
});
