#!/usr/bin/env node
import assert from "node:assert/strict";
import http from "node:http";
import { execFileSync, spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const htmlPath = resolve(ROOT, "public/void-public-frontdoor-v1/index.html");
const serverPath = resolve(ROOT, "ops/public/void-public-frontdoor-v1.mjs");
const cutoverPath = resolve(ROOT, "ops/public/void-public-frontdoor-cutover-v1.sh");
const html = readFileSync(htmlPath, "utf8");
const source = readFileSync(serverPath, "utf8");
const cutover = readFileSync(cutoverPath, "utf8");

assert.match(html, /VOID_PUBLIC_FRONTDOOR_V1/);
assert.match(html, /VOID_UI_VISUAL_UNIFICATION_V1/);
assert.match(html, /<title>VOID \/ Public Node<\/title>/);
assert.match(html, /<strong>VOID<\/strong><span>Public Node<\/span>/);
assert.match(html, /A decentralized data network for AI agents/);
assert.match(html, /href="\/app\/"[^>]*>Enter VOID</);
assert.match(html, /href="\/participant"[^>]*>Participate</);
assert.equal((html.match(/class="button(?: primary)?"/g) || []).length, 2);
assert.equal((html.match(/class="card"/g) || []).length, 3);
for (const token of [
  "--bg:#050506",
  "--surface:#0b0b0e",
  "--line:#2a2a31",
  "--text:#f2f2f4",
  "--secondary:#c8c8cf",
  "--muted:#9898a3",
  "background-size:32px 32px",
]) {
  assert.ok(html.includes(token), `unified VOID visual token missing: ${token}`);
}
assert.match(html, /a:focus-visible\{outline:2px solid var\(--text\);outline-offset:4px\}/);
assert.doesNotMatch(html, /border-radius\s*:|box-shadow\s*:/i);
for (const old of [
  "VOID Network is live",
  "Fund VOID",
  "Inspect Public Proof",
  "EXACT-GREEN HINT",
  "TXROOT LIVE",
  "Operator controls are not exposed",
]) {
  assert.ok(!html.includes(old), `legacy root clutter must be absent: ${old}`);
}
assert.doesNotMatch(html, /<script\b/i);
assert.doesNotMatch(html, /<form\b|<input\b/i);

assert.match(source, /const BIND = process\.env\.VOID_PUBLIC_FRONTDOOR_BIND \|\| "127\.0\.0\.1"/);
assert.match(source, /if \(BIND !== "127\.0\.0\.1"\) throw new Error/);
assert.match(source, /UPSTREAM_HOST = "127\.0\.0\.1"/);
assert.match(source, /VOID_PUBLIC_FRONTDOOR_UPSTREAM_PORT/);
assert.match(source, /req\.pipe\(upstream\)/);
assert.doesNotMatch(source, /child_process|exec\(|spawn\(|writeFile|appendFile/);

assert.match(cutover, /VOID_PUBLIC_FRONTDOOR_CUTOVER_V1/);
assert.match(cutover, /canonical_funnel_root_ports_from_text/);
assert.match(cutover, /https:\/\/\$\{dns\}:8443/);
assert.match(cutover, /127\.0\.0\.1:8082/);
assert.match(cutover, /127\.0\.0\.1:4188/);
assert.match(cutover, /canonical_443_port=8082/);
assert.match(cutover, /auxiliary_8443_ignored=true/);
assert.match(cutover, /tailscale funnel status --json/);
assert.match(cutover, /tailscale funnel --https=443 --bg --yes/);
assert.match(cutover, /--rollback/);
assert.match(cutover, /node_service_restart=false/);
assert.match(cutover, /composition_gateway_restart=false/);
assert.doesNotMatch(cutover, /expected exactly one simple root Funnel proxy target/);
assert.doesNotMatch(cutover, /tailscale funnel reset/);
assert.doesNotMatch(cutover, /systemctl --user (restart|stop|start) void-node/);
assert.doesNotMatch(cutover, /src\/index\.ts/);

const parserSelfTest = execFileSync("bash", [cutoverPath, "--parser-self-test"], {
  cwd: ROOT,
  encoding: "utf8",
});
assert.match(parserSelfTest, /VOID_PUBLIC_FRONTDOOR_CUTOVER_V1_PARSER_SELF_TEST_GREEN/);
assert.match(parserSelfTest, /canonical_443_port=8082/);
assert.match(parserSelfTest, /auxiliary_8443_ignored=true/);

const upstreamPort = 18082;
const frontdoorPort = 18083;
const upstream = http.createServer((req, res) => {
  const chunks = [];
  req.on("data", (chunk) => chunks.push(chunk));
  req.on("end", () => {
    const body = Buffer.concat(chunks).toString("utf8");
    const out = Buffer.from(JSON.stringify({
      marker: "MOCK_UPSTREAM_V1",
      method: req.method,
      url: req.url,
      body,
      frontdoor: req.headers["x-void-frontdoor"] || null,
    }));
    res.writeHead(200, {
      "content-type": "application/json",
      "content-length": out.byteLength,
      "x-mock-upstream": "true",
    });
    res.end(out);
  });
});
await new Promise((resolvePromise, reject) => {
  upstream.once("error", reject);
  upstream.listen(upstreamPort, "127.0.0.1", resolvePromise);
});

const child = spawn(process.execPath, [serverPath], {
  cwd: ROOT,
  env: {
    ...process.env,
    VOID_PUBLIC_FRONTDOOR_HOME: htmlPath,
    VOID_PUBLIC_FRONTDOOR_BIND: "127.0.0.1",
    VOID_PUBLIC_FRONTDOOR_PORT: String(frontdoorPort),
    VOID_PUBLIC_FRONTDOOR_UPSTREAM_PORT: String(upstreamPort),
  },
  stdio: ["ignore", "pipe", "pipe"],
});

let stdout = "";
let stderr = "";
child.stdout.on("data", (d) => { stdout += d; });
child.stderr.on("data", (d) => { stderr += d; });

try {
  const deadline = Date.now() + 5000;
  while (!stdout.includes("VOID_PUBLIC_FRONTDOOR_V1_READY")) {
    if (child.exitCode !== null) throw new Error(`frontdoor exited early: ${stderr}`);
    if (Date.now() > deadline) throw new Error(`frontdoor start timeout: ${stdout} ${stderr}`);
    await new Promise((r) => setTimeout(r, 25));
  }

  const rootResponse = await fetch(`http://127.0.0.1:${frontdoorPort}/`);
  assert.equal(rootResponse.status, 200);
  assert.equal(rootResponse.headers.get("x-void-frontdoor"), "VOID_PUBLIC_FRONTDOOR_V1");
  assert.match(await rootResponse.text(), /VOID_PUBLIC_FRONTDOOR_V1/);

  const statusResponse = await fetch(`http://127.0.0.1:${frontdoorPort}/__void/frontdoor/status.json`);
  const status = await statusResponse.json();
  assert.equal(status.marker, "VOID_PUBLIC_FRONTDOOR_V1");
  assert.equal(status.ready, true);
  assert.equal(status.upstream, `http://127.0.0.1:${upstreamPort}`);

  const proxyResponse = await fetch(`http://127.0.0.1:${frontdoorPort}/app/test?x=1`);
  assert.equal(proxyResponse.status, 200);
  assert.equal(proxyResponse.headers.get("x-mock-upstream"), "true");
  const proxyJson = await proxyResponse.json();
  assert.equal(proxyJson.method, "GET");
  assert.equal(proxyJson.url, "/app/test?x=1");
  assert.equal(proxyJson.frontdoor, "VOID_PUBLIC_FRONTDOOR_V1");

  const postResponse = await fetch(`http://127.0.0.1:${frontdoorPort}/buy-void`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ test: true }),
  });
  const postJson = await postResponse.json();
  assert.equal(postJson.method, "POST");
  assert.equal(postJson.url, "/buy-void");
  assert.equal(postJson.body, '{"test":true}');

  const rootPost = await fetch(`http://127.0.0.1:${frontdoorPort}/`, {
    method: "POST",
    body: "root-post",
  });
  const rootPostJson = await rootPost.json();
  assert.equal(rootPostJson.method, "POST");
  assert.equal(rootPostJson.url, "/");
  assert.equal(rootPostJson.body, "root-post");
} finally {
  child.kill("SIGTERM");
  await new Promise((r) => child.once("exit", r));
  await new Promise((r) => upstream.close(r));
}

console.log("VOID_PUBLIC_FRONTDOOR_V1_PROOF_GREEN");
console.log("unified_visual_contract=true");
console.log("hero_primary_exits=2");
console.log("capability_paths=3");
console.log("legacy_root_clutter=false");
console.log("canonical_443_funnel_selection_proved=true");
console.log("auxiliary_8443_funnel_ignored=true");
console.log("root_static_get_head_only=true");
console.log("non_root_proxy_behavior_executed=true");
console.log("post_passthrough_executed=true");
console.log("loopback_only=true");
console.log("rollback_contract_present=true");
console.log("node_runtime_mutated=false");
