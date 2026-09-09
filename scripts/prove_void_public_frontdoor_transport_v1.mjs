#!/usr/bin/env node
import assert from "node:assert/strict";
import http from "node:http";
import { once } from "node:events";
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const FRONTDOOR = resolve(ROOT, "ops/public/void-public-frontdoor-v1.mjs");
const COMPOSITION = resolve(ROOT, "ops/public/void-public-app-composition-gateway-v1.mjs");
const children = [];
const servers = [];
const timeout = setTimeout(() => { throw new Error("frontdoor transport proof deadline"); }, 25000);
let cases = 0;
const listen = async (server) => {
  servers.push(server);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  return server.address().port;
};
const freePort = async () => {
  const server = http.createServer();
  const port = await listen(server);
  await new Promise((r) => server.close(r));
  return port;
};
const start = async (file, env, marker) => {
  const child = spawn(process.execPath, [file], {
    cwd: ROOT, env: { ...process.env, ...env }, stdio: ["ignore", "pipe", "pipe"],
  });
  children.push(child);
  let text = "";
  child.stdout.on("data", d => { text = (text + d).slice(-32768); });
  child.stderr.on("data", d => { text = (text + d).slice(-32768); });
  const until = Date.now() + 4000;
  while (!text.includes(marker)) {
    assert.equal(child.exitCode, null, text);
    assert.ok(Date.now() < until, text);
    await new Promise(r => setTimeout(r, 10));
  }
  return child;
};
const request = (port, path, headers = {}, method = "GET") => new Promise((resolvePromise, reject) => {
  const req = http.request({ hostname: "127.0.0.1", port, path, headers, method, agent: false }, res => {
    let data = "";
    res.on("data", chunk => { data += chunk; });
    res.on("error", reject);
    res.on("aborted", () => reject(new Error("response aborted")));
    res.on("end", () => resolvePromise({ status: res.statusCode, headers: res.headers, data }));
  });
  req.on("error", reject);
  req.setTimeout(2000, () => req.destroy(new Error("test request timed out")));
  req.end();
});

let responseConnection = "close";
let lastHeaders = null;
let received = 0;
let downstreamAbortObserved = false;
const appHtml = readFileSync(resolve(ROOT, "public/void-app-wave1-v1/index.html"));
const upstream = http.createServer((req, res) => {
  received += 1;
  lastHeaders = req.headers;
  req.resume();
  if (req.url === "/app/") {
    res.writeHead(200, { "content-type": "text/html", "content-length": appHtml.length });
    res.end(appHtml);
    return;
  }
  if (req.url === "/partial") {
    res.writeHead(200, { "content-type": "text/plain", "content-length": "100" });
    res.write("prefix");
    setTimeout(() => res.destroy(), 20);
    return;
  }
  if (req.url === "/downstream-abort") {
    res.on("close", () => { downstreamAbortObserved = true; });
    res.writeHead(200, { "content-type": "text/plain" });
    res.write("prefix");
    return;
  }
  res.writeHead(200, {
    connection: responseConnection,
    "x-hop-response": "must-not-cross",
    "x-another-hop": "also-must-not-cross",
    "x-end-to-end": "preserved",
  });
  res.end("complete");
});

try {
  const upstreamPort = await listen(upstream);
  const frontdoorPort = await freePort();
  await start(FRONTDOOR, {
    VOID_PUBLIC_FRONTDOOR_PORT: String(frontdoorPort),
    VOID_PUBLIC_FRONTDOOR_UPSTREAM_PORT: String(upstreamPort),
  }, "VOID_PUBLIC_FRONTDOOR_V1_READY");

  for (const connection of ["x-hop-request", "X-Hop-Request, x-another-hop", " \tx-hop-request\t, X-HOP-REQUEST, , x-another-hop "] ) {
    const result = await request(frontdoorPort, "/headers", {
      connection, "x-hop-request": "must-stop", "x-another-hop": "also-stop", "x-end-to-end": "keep",
    });
    assert.equal(result.status, 200);
    assert.equal(lastHeaders["x-hop-request"], undefined);
    if (connection.toLowerCase().includes("x-another-hop")) assert.equal(lastHeaders["x-another-hop"], undefined);
    assert.equal(lastHeaders["x-end-to-end"], "keep");
    assert.equal(lastHeaders["x-void-frontdoor"], "VOID_PUBLIC_FRONTDOOR_V1");
    cases += 1;
  }
  for (const connection of ["x-hop-response", " X-HOP-RESPONSE, x-another-hop ", "x-hop-response,x-hop-response"]) {
    responseConnection = connection;
    const result = await request(frontdoorPort, "/headers");
    assert.equal(result.headers["x-hop-response"], undefined);
    if (connection.includes("x-another-hop")) assert.equal(result.headers["x-another-hop"], undefined);
    assert.equal(result.headers["x-end-to-end"], "preserved");
    assert.equal(result.headers["x-void-frontdoor"], "VOID_PUBLIC_FRONTDOOR_V1");
    cases += 1;
  }
  for (const bad of ["x-hop request", '"x-hop-request"', "x-hop-request;other", ", ,"]) {
    const before = received;
    assert.equal((await request(frontdoorPort, "/headers", { connection: bad })).status, 400);
    assert.equal(received, before);
    responseConnection = bad;
    assert.equal((await request(frontdoorPort, "/headers")).status, 502);
    cases += 2;
  }
  responseConnection = "close";
  const started = Date.now();
  await assert.rejects(request(frontdoorPort, "/partial"), /aborted|socket|reset|closed/i);
  assert.ok(Date.now() - started < 1500, "partial upstream did not terminate downstream");
  assert.equal((await request(frontdoorPort, "/recover")).data, "complete");
  cases += 2;

  await new Promise((resolvePromise, reject) => {
    const req = http.get({ hostname: "127.0.0.1", port: frontdoorPort, path: "/downstream-abort", agent: false }, res => {
      res.once("data", () => { res.destroy(); resolvePromise(); });
      res.on("error", () => { /* Client intentionally ends this generation. */ });
    });
    req.on("error", reject);
  });
  const until = Date.now() + 1200;
  while (!downstreamAbortObserved && Date.now() < until) await new Promise(r => setTimeout(r, 10));
  assert.equal(downstreamAbortObserved, true, "downstream abort left detached upstream");
  assert.equal((await request(frontdoorPort, "/recover")).data, "complete");
  cases += 2;

  // Real current composition producer, not a fixture-provided identity marker.
  const compositionPort = await freePort();
  await start(COMPOSITION, {
    VOID_COMPOSITION_HOST: "127.0.0.1", VOID_COMPOSITION_PORT: String(compositionPort),
    VOID_PUBLIC_GATEWAY_UPSTREAM: `http://127.0.0.1:${upstreamPort}`,
    VOID_NODE_UPSTREAM: `http://127.0.0.1:${upstreamPort}`,
    VOID_AI_AGENT_GATEWAY_UPSTREAM: "", VOID_OPERATOR_WEBHOOK_RECEIVER_UPSTREAM: "",
  }, "VOID_PUBLIC_APP_COMPOSITION_GATEWAY_V1");
  const readOnlyPort = await freePort();
  await start(FRONTDOOR, {
    VOID_PUBLIC_FRONTDOOR_PORT: String(readOnlyPort),
    VOID_PUBLIC_FRONTDOOR_UPSTREAM_PORT: String(compositionPort),
    VOID_PUBLIC_FRONTDOOR_STATUS_TIMEOUT_MS: "1000", VOID_PUBLIC_FRONTDOOR_READ_ONLY: "1",
  }, "VOID_PUBLIC_FRONTDOOR_V1_READY");
  const actual = await request(readOnlyPort, "/app/");
  assert.equal(actual.status, 200);
  assert.equal(actual.headers["x-void-public-app-composition"], "v1");
  assert.match(actual.data, /public-mode\.js/);
  const status = JSON.parse((await request(readOnlyPort, "/__void/frontdoor/status.json")).data);
  assert.equal(status.ready, true);
  assert.equal(status.read_only, true);
  const before = received;
  for (const method of ["POST", "PUT", "PATCH", "DELETE", "OPTIONS"]) {
    const response = await request(readOnlyPort, "/__void/buy-void/request", {}, method);
    assert.equal(response.status, 405);
    assert.equal(response.headers.allow, "GET, HEAD");
    cases += 1;
  }
  assert.equal(received, before, "recovery method rejection contacted upstream");
  cases += 1;
  console.log("VOID_PUBLIC_FRONTDOOR_TRANSPORT_V1_GREEN");
  console.log(`cases=${cases}`);
  console.log("real_composition_to_frontdoor_compatibility=true");
  console.log("read_only_recovery_mutation_methods_blocked=true");
} finally {
  clearTimeout(timeout);
  for (const child of children) {
    if (child.exitCode === null && child.signalCode === null) {
      const exited = once(child, "exit");
      child.kill("SIGTERM");
      await exited;
    }
  }
  for (const server of servers) {
    if (server.listening) {
      server.closeAllConnections();
      await new Promise(r => server.close(r));
    }
  }
}
