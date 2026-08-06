#!/usr/bin/env node
import childProcess from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import process from "node:process";
import {
  buildBootstrapManifest,
  createQualificationReceipt,
  qualifyPublicSeed,
  resolvePublicDns,
  validateQualificationReceipt,
} from "./lib/void_public_seed_qualification_v1.mjs";

const MARKER = "VOID_PUBLIC_SEED_QUALIFICATION_V1_PROOF";
const UPSTREAM_PORT = 43000 + (process.pid % 1000) * 2;
const GATEWAY_PORT = UPSTREAM_PORT + 1;

function fail(message) {
  console.error(`[FAIL] ${message}`);
  process.exitCode = 1;
  throw new Error(message);
}
function pass(message) {
  console.log(`[PASS] ${message}`);
}
function assert(condition, message) {
  if (!condition) fail(message);
}
function expectThrow(fn, pattern, message) {
  try {
    fn();
  } catch (error) {
    if (pattern && !pattern.test(String(error?.message || error))) {
      fail(`${message}: unexpected error ${error?.message || error}`);
    }
    pass(message);
    return;
  }
  fail(`${message}: expected failure`);
}
async function expectReject(promise, pattern, message) {
  try {
    await promise;
  } catch (error) {
    if (pattern && !pattern.test(String(error?.message || error))) {
      fail(`${message}: unexpected error ${error?.message || error}`);
    }
    pass(message);
    return;
  }
  fail(`${message}: expected rejection`);
}
async function listen(server, port) {
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", resolve);
  });
}
async function close(server) {
  await new Promise((resolve) => server.close(resolve));
}
async function waitForGateway(child, timeoutMs = 10_000) {
  let output = "";
  child.stdout.on("data", (chunk) => { output += chunk; });
  child.stderr.on("data", (chunk) => { output += chunk; });
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (output.includes("VOID_PUBLIC_SEED_GATEWAY_V1_READY")) return output;
    if (child.exitCode !== null) fail(`gateway exited early: ${output}`);
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  fail(`gateway readiness timeout: ${output}`);
}
async function jsonResponse(url, options) {
  const response = await fetch(url, options);
  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch (error) {
    json = null;
  }
  return { response, text, json };
}

for (const [path, needles] of [
  ["tools/void-public-seed-gateway-v1.mjs", ["numeric loopback literal", "Math.min(999", "upstream_response_too_large", "upstream_redirect_not_allowed"]],
  ["scripts/lib/void_public_seed_common_v1.mjs", ["temporary tunnel provider hostnames cannot qualify", "NON_PUBLIC_V4", "NON_PUBLIC_V6"]],
  ["scripts/lib/void_public_seed_probe_v1.mjs", ["pinnedAddresses", "connected_addresses", "unexpected address"]],
  ["scripts/lib/void_public_seed_receipt_v1.mjs", ["private_tailnet_endpoints_published", "qualification_id", "temporary provider cannot qualify"]],
  ["scripts/qualify_void_public_seed_v1.mjs", ["VOID_PUBLIC_SEED_QUALIFICATION_V1_GREEN", "temporary_provider=false"]],
  ["scripts/build_void_public_bootstrap_manifest_v1.mjs", ["temporary_seeds_published=false", "private_tailnet_endpoints_published=false"]],
]) {
  const text = fs.readFileSync(path, "utf8");
  for (const needle of needles) assert(text.includes(needle), `${path} missing ${needle}`);
}
pass("static qualification, publication, and authority markers");

await expectReject(
  resolvePublicDns("mixed-dns.example", {
    lookup: async () => [
      { address: "1.1.1.1", family: 4 },
      { address: "100.64.0.9", family: 4 },
    ],
  }),
  /non-public address 100\.64\.0\.9/,
  "mixed public/private DNS is rejected before connection",
);

const unsafeBind = childProcess.spawnSync(
  process.execPath,
  ["tools/void-public-seed-gateway-v1.mjs"],
  {
    env: {
      ...process.env,
      VOID_PUBLIC_SEED_BIND: "localhost",
      VOID_PUBLIC_SEED_PORT: String(GATEWAY_PORT),
    },
    encoding: "utf8",
  },
);
assert(unsafeBind.status !== 0, "gateway accepted hostname-based bind");
assert(
  `${unsafeBind.stdout || ""}${unsafeBind.stderr || ""}`.includes("numeric loopback literal"),
  "gateway hostname-bind failure marker missing",
);
pass("gateway rejects hostname-based loopback ambiguity");

const largeBody = JSON.stringify({ payload: "x".repeat(2 * 1024 * 1024) });
const upstream = http.createServer((req, res) => {
  const url = new URL(req.url || "/", `http://127.0.0.1:${UPSTREAM_PORT}`);
  res.setHeader("content-type", "application/json; charset=utf-8");
  if (url.pathname === "/api/health") {
    res.setHeader("content-type", "text/plain; charset=utf-8");
    res.end("ok\n");
    return;
  }
  if (url.pathname === "/__void/ready.json") {
    res.end(JSON.stringify({ ready: true, head: 2000, gap: 0, txroot_live: 1 }));
    return;
  }
  if (url.pathname === "/blocks/latest/number2.json") {
    res.end(JSON.stringify({ number: 2000 }));
    return;
  }
  if (url.pathname === "/blocks/range") {
    const from = Number(url.searchParams.get("from"));
    const to = Number(url.searchParams.get("to"));
    res.end(JSON.stringify({ blocks: [{ number: from }, { number: to }] }));
    return;
  }
  if (url.pathname === "/__void/demo/summary.json") {
    res.setHeader("content-length", Buffer.byteLength(largeBody));
    res.end(largeBody);
    return;
  }
  if (url.pathname === "/head") {
    res.statusCode = 302;
    res.setHeader("location", "http://127.0.0.1/private");
    res.end(JSON.stringify({ ok: false, redirect: true }));
    return;
  }
  if (url.pathname === "/api/health") {
    res.end(JSON.stringify({ ok: true }));
    return;
  }
  res.statusCode = 404;
  res.end(JSON.stringify({ ok: false, error: "not_found" }));
});

let gateway;
try {
  await listen(upstream, UPSTREAM_PORT);
  gateway = childProcess.spawn(process.execPath, ["tools/void-public-seed-gateway-v1.mjs"], {
    env: {
      ...process.env,
      VOID_PUBLIC_SEED_PORT: String(GATEWAY_PORT),
      VOID_PUBLIC_SEED_UPSTREAM: `http://127.0.0.1:${UPSTREAM_PORT}`,
      VOID_PUBLIC_SEED_MAX_RESPONSE_BYTES: String(1024 * 1024),
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  const gatewayOutput = await waitForGateway(gateway);
  assert(gatewayOutput.includes("private_mutation_routes_exposed=false"), "gateway authority marker missing");

  const base = `http://127.0.0.1:${GATEWAY_PORT}`;
  const ready = await jsonResponse(`${base}/__void/ready.json`);
  assert(ready.response.status === 200 && ready.json?.ready === true, "gateway readiness failed");
  assert(
    ready.response.headers.get("x-void-public-seed-gateway") === "v1",
    "gateway identity header missing",
  );

  const admin = await jsonResponse(`${base}/admin`);
  assert(admin.response.status === 404 && admin.json?.error === "route_not_public", "admin route exposed");
  const mutation = await jsonResponse(`${base}/follower/start`, { method: "POST", body: "{}" });
  assert(
    mutation.response.status === 405 && mutation.json?.error === "method_not_allowed",
    "mutation method exposed",
  );
  const queryPollution = await jsonResponse(`${base}/__void/ready.json?peer=http://127.0.0.1`);
  assert(queryPollution.response.status === 404, "query pollution was accepted");
  const tooWide = await jsonResponse(`${base}/blocks/range?from=1&to=1000`);
  assert(tooWide.response.status === 404, "1000-block range was accepted");
  const duplicate = await jsonResponse(`${base}/blocks/range?from=1&from=2&to=2`);
  assert(duplicate.response.status === 404, "duplicate range parameters were accepted");
  const redirected = await jsonResponse(`${base}/head`);
  assert(
    redirected.response.status === 502 && redirected.json?.error === "upstream_redirect_not_allowed",
    "upstream redirect was not rejected",
  );
  const oversized = await jsonResponse(`${base}/__void/demo/summary.json`);
  assert(
    oversized.response.status === 502 && oversized.json?.error === "upstream_response_too_large",
    "oversized upstream response was not rejected",
  );
  const nonJson = await jsonResponse(`${base}/api/health`);
  assert(
    nonJson.response.status === 502 && nonJson.json?.error === "upstream_content_type_not_json",
    "non-JSON upstream response was not rejected",
  );
  pass("restricted gateway runtime boundary");

  const fixtureReceipt = await qualifyPublicSeed(base, {
    sampleCount: 2,
    intervalMs: 10,
    allowLoopbackFixture: true,
    timeoutMs: 5000,
    maxBytes: 1024 * 1024,
  });
  assert(fixtureReceipt.sample_count === 2, "fixture qualification sample count mismatch");
  assert(fixtureReceipt.loopback_fixture === true, "fixture receipt did not preserve fixture status");
  expectThrow(
    () => buildBootstrapManifest([fixtureReceipt]),
    /loopback fixture cannot qualify/,
    "loopback receipt cannot publish",
  );
  pass("live multi-sample qualifier against restricted gateway");

  const nowMs = Date.now();
  const sampleTemplate = fixtureReceipt.samples[0];
  const samples = [0, 60_000, 120_000].map((offset, index) => ({
    ...sampleTemplate,
    observed_at: new Date(nowMs - 120_000 + offset).toISOString(),
    ready_head: 3000 + index,
    head: 3000 + index,
    range_head: 3000 + index,
    dns_addresses: ["1.1.1.1", "2606:4700:4700::1111"],
    connected_addresses: ["1.1.1.1"],
  }));
  const stableReceipt = createQualificationReceipt({
    endpoint: "https://seed.bootstrap.example.com",
    samples,
    generatedAt: new Date(nowMs).toISOString(),
  });
  const validated = validateQualificationReceipt(stableReceipt, { nowMs });
  assert(validated.latest_head === 3002, "stable qualification latest head mismatch");
  const manifest = buildBootstrapManifest([stableReceipt], { nowMs });
  assert(manifest.schema === "void_public_bootstrap_v1", "manifest schema mismatch");
  assert(manifest.chain_id === 2050, "manifest chain ID mismatch");
  assert(manifest.status === "stable_https_seed", "manifest status mismatch");
  assert(manifest.sync_endpoints.length === 1, "manifest endpoint count mismatch");
  assert(manifest.sync_endpoints[0].temporary === false, "manifest published temporary endpoint");
  assert(manifest.sync_endpoints[0].qualification_id === stableReceipt.qualification_id, "manifest receipt binding mismatch");
  assert(manifest.private_tailnet_endpoints_published === false, "manifest published Tailnet endpoints");
  pass("fresh stable qualification builds bounded manifest");

  const temporaryReceipt = createQualificationReceipt({
    endpoint: "https://fixture.trycloudflare.com",
    samples,
    generatedAt: new Date(nowMs).toISOString(),
    allowTemporaryFixture: true,
  });
  expectThrow(
    () => buildBootstrapManifest([temporaryReceipt], { nowMs }),
    /temporary tunnel provider|temporary provider/,
    "temporary tunnel cannot publish",
  );

  const privateDnsReceipt = createQualificationReceipt({
    endpoint: "https://seed.private.example.com",
    samples: samples.map((sample) => ({ ...sample, dns_addresses: ["100.64.1.2"] })),
    generatedAt: new Date(nowMs).toISOString(),
  });
  expectThrow(
    () => buildBootstrapManifest([privateDnsReceipt], { nowMs }),
    /non-public DNS address/,
    "Tailnet or CGNAT DNS cannot publish",
  );

  const shortReceipt = createQualificationReceipt({
    endpoint: "https://seed.short.example.com",
    samples: samples.map((sample, index) => ({
      ...sample,
      observed_at: new Date(nowMs - 2000 + index * 1000).toISOString(),
    })),
    generatedAt: new Date(nowMs).toISOString(),
  });
  expectThrow(
    () => buildBootstrapManifest([shortReceipt], { nowMs }),
    /observation span/,
    "short observation window cannot publish",
  );

  const tampered = structuredClone(stableReceipt);
  tampered.samples[0].head += 1;
  expectThrow(
    () => buildBootstrapManifest([tampered], { nowMs }),
    /qualification ID/,
    "tampered receipt cannot publish",
  );

  const futureGeneratedReceipt = createQualificationReceipt({
    endpoint: "https://seed.future-generated.example.com",
    samples,
    generatedAt: new Date(nowMs + 60 * 60 * 1000).toISOString(),
  });
  expectThrow(
    () => buildBootstrapManifest([futureGeneratedReceipt], { nowMs }),
    /generated_at is from the future/,
    "future-generated receipt cannot publish",
  );

  const staleSamples = samples.map((sample) => ({
    ...sample,
    observed_at: new Date(Date.parse(sample.observed_at) - 4 * 60 * 60 * 1000).toISOString(),
  }));
  const staleReceipt = createQualificationReceipt({
    endpoint: "https://seed.stale.example.com",
    samples: staleSamples,
    generatedAt: new Date(nowMs - 4 * 60 * 60 * 1000).toISOString(),
  });
  expectThrow(
    () => buildBootstrapManifest([staleReceipt], { nowMs }),
    /stale/,
    "stale qualification cannot publish",
  );
  pass("publication gate rejects temporary, private, short, tampered, future, and stale evidence");
} finally {
  if (gateway && gateway.exitCode === null) {
    gateway.kill("SIGTERM");
    await new Promise((resolve) => gateway.once("exit", resolve));
  }
  await close(upstream).catch(() => {});
}

console.log(`${MARKER}_GREEN`);
console.log("stable_seed_published=false");
console.log("temporary_seed_accepted=false");
console.log("private_tailnet_endpoint_accepted=false");
console.log("private_mutation_routes_exposed=false");
console.log("wallet_authority=false");
console.log("signer_authority=false");
console.log("validator_authority=false");
console.log("treasury_authority=false");
console.log("work_credit_authority=false");
console.log("money_movement_authority=false");
