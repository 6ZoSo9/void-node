#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import net from "node:net";
import vm from "node:vm";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { canonicalJson, objectWithId, sha256Hex } from "./lib/void_public_seed_common_v1.mjs";

import {
  assertNoManualBootstrapOverridesV1,
  assertNoTailnetMachineV1,
  isTailnetCgnatIpv4V1,
  validateBootstrapManifestNoTailnetV1,
  validateHeadSnapshotV1,
  validatePeersSnapshotV1,
  validateReadySnapshotV1,
} from "../tools/void-nimo-no-tailnet-acceptance-v1.mjs";

function throws(fn, pattern) {
  assert.throws(fn, pattern);
}

const authority = Object.freeze({
  private_routes_exposed: false,
  wallet_authority: false,
  signer_authority: false,
  validator_authority: false,
  treasury_authority: false,
  work_credit_authority: false,
  money_movement_authority: false,
});

const seal = value => objectWithId("voidpbm1_", value, "manifest_id");
const proofNow = Date.now();
const peerSourcePaths = ["src/node_core.ts", "src/http/p2p_routes.ts", "src/p2p/auth_v1.ts",
  "src/p2p/verified_peer_cache_v1.ts", "src/types/p2p.ts"];
const peerSourceText = new Map();
const peerSourceIdentities = peerSourcePaths.map(path => {
  const bytes = fs.readFileSync(path);
  const raw = spawnSync("/usr/bin/git", ["--no-replace-objects", "show", `HEAD:${path}`],
    { timeout: 10_000, maxBuffer: 2 * 1024 * 1024 });
  assert.equal(raw.status, 0, `peer producer source unavailable: ${path}`);
  assert(bytes.equals(raw.stdout), `peer producer working bytes differ from HEAD: ${path}`);
  peerSourceText.set(path, bytes.toString("utf8"));
  return { path, sha256: sha256Hex(bytes), git_blob: crypto.createHash("sha1")
    .update(Buffer.from(`blob ${bytes.length}\0`)).update(bytes).digest("hex") };
});
const projections = peerSourceText.get("src/node_core.ts").match(/^  peersSnapshot\(\) \{[\s\S]*?^  \}/gm);
assert.equal(projections?.length, 1, "exact peer projection is unavailable");
const routes = peerSourceText.get("src/http/p2p_routes.ts").match(/app\.get\("\/p2p\/peers",[\s\S]*?\n  \}\);/g);
assert.equal(routes?.length, 1);
assert.match(routes[0], /res\.json\(\{ ok: true, \.\.\.snap \}\)/);
assert(peerSourceText.get("src/p2p/auth_v1.ts").includes("const NODE_ID_RE = /^[0-9a-f]{32}$/;"));
assert(peerSourceText.get("src/p2p/auth_v1.ts").includes("const MAX_LISTEN_ADDRS = 32;"));
assert(peerSourceText.get("src/p2p/verified_peer_cache_v1.ts").includes("MAX_PEERS_V1 = 128;"));
assert(peerSourceText.get("src/p2p/verified_peer_cache_v1.ts").includes("MAX_ADDRS_PER_PEER_V1 = 8;"));
assert(peerSourceText.get("src/types/p2p.ts").includes("MAX_PEER_ADDRESS_CHARS = 512;"));
const peerA = "a".repeat(32), peerB = "b".repeat(32);
const connectedPeer = (id = peerA) => ({ id, addr: `${id}.example:4700`, listens: [`${id}.example:4700`], outbound: true });
const verifiedPeer = (id = peerA) => ({ node_id: id, addresses: [`${id}.example:4700`], last_authenticated_at_ms: proofNow });
function projectPeers(connected = [connectedPeer()], verified = [verifiedPeer()]) {
  const state = { peers: new Map(connected.map((p, i) => [String(i), p])),
    verifiedPeerCacheRecords: verified, knownAddrs: new Set(["peer.example:4700"]) };
  // Execute only the actual pure projection, not a Node constructor or its I/O.
  const snapshot = vm.runInNewContext(`({${projections[0]}}).peersSnapshot.call(state)`, { state },
    { timeout: 1000, contextCodeGeneration: { strings: false, wasm: false } });
  return JSON.parse(JSON.stringify({ ok: true, ...snapshot }));
}
const peerFixture = projectPeers();
const stable = seal({
  schema: "void_public_bootstrap_v1",
  network: "VOID Network",
  chain_id: 2050,
  status: "stable_https_seed",
  private_tailnet_endpoints_published: false,
  authority,
  generated_at: new Date(proofNow - 1000).toISOString(),
  expires_at: new Date(proofNow + 72 * 60 * 60 * 1000).toISOString(),
  notes: "Hermetic target-admission fixture",
  sync_endpoints: [
    {
      transport: "https",
      base: "https://seed.voidchain.org",
      priority: 1,
      enabled: true,
      temporary: false,
      qualification_id: `voidpsq1_${"1".repeat(64)}`,
      qualified_at: new Date(proofNow - 2000).toISOString(),
      qualified_head: 1951058,
    },
  ],
  onion_endpoints: [],
});

const stableDecision = validateBootstrapManifestNoTailnetV1(stable);
assert.equal(stableDecision.stable, true);
assert.equal(stableDecision.endpoint_count, 1);

const hold = {
  ...stable,
  status: "hold_no_stable_seed",
  sync_endpoints: [],
};
assert.deepEqual(
  validateBootstrapManifestNoTailnetV1(hold, { requireStable: false }),
  { stable: false, endpoint_count: 0 },
);
throws(
  () => validateBootstrapManifestNoTailnetV1(hold),
  /stable public HTTPS seed is not published/,
);

throws(
  () => validateBootstrapManifestNoTailnetV1(seal({
    ...stable,
    private_tailnet_endpoints_published: true,
  })),
  /publishes private Tailnet endpoints/,
);

throws(
  () => validateBootstrapManifestNoTailnetV1(seal({
    ...stable,
    sync_endpoints: [{ ...stable.sync_endpoints[0], base: "https://100.100.1.2" }],
  })),
  /not acceptable public HTTPS/,
);

throws(
  () => validateBootstrapManifestNoTailnetV1(seal({
    ...stable,
    sync_endpoints: [{ ...stable.sync_endpoints[0], base: "https://seed.example.ts.net" }],
  })),
  /not acceptable public HTTPS/,
);

assert.equal(isTailnetCgnatIpv4V1("100.64.0.1"), true);
assert.equal(isTailnetCgnatIpv4V1("100.127.255.254"), true);
assert.equal(isTailnetCgnatIpv4V1("100.128.0.1"), false);
assert.equal(isTailnetCgnatIpv4V1("8.8.8.8"), false);

const cleanMachine = assertNoTailnetMachineV1({
  interfaces: [
    {
      ifname: "eth0",
      addr_info: [
        { family: "inet", local: "192.168.1.50" },
        { family: "inet6", local: "2001:4860:4860::8888" },
      ],
    },
  ],
  processText: "systemd\nnode void-node",
  tailscaleBinaryPresent: false,
  environment: {},
});
assert.equal(cleanMachine.tailnet_address_present, false);

throws(
  () => assertNoTailnetMachineV1({ tailscaleBinaryPresent: true }),
  /tailscale executable is present/,
);
throws(
  () => assertNoTailnetMachineV1({
    interfaces: [{ ifname: "tailscale0", addr_info: [] }],
  }),
  /Tailnet interface present/,
);
throws(
  () => assertNoTailnetMachineV1({
    interfaces: [{ ifname: "eth0", addr_info: [{ local: "100.88.2.3" }] }],
  }),
  /Tailnet\/CGNAT local address present/,
);
throws(
  () => assertNoTailnetMachineV1({
    environment: { BOOTSTRAP_ADDRS: "100.122.245.125:4700" },
  }),
  /BOOTSTRAP_ADDRS manual bootstrap override must be absent/,
);
throws(
  () => assertNoTailnetMachineV1({
    environment: { VOID_MAIN_BASE: "https://node.example.ts.net" },
  }),
  /VOID_MAIN_BASE manual bootstrap override must be absent/,
);

assert.equal(validateHeadSnapshotV1({ number: 1951058 }), 1951058);
throws(() => validateHeadSnapshotV1({ number: 0 }), /positive safe integer/);

validateReadySnapshotV1({ ready: true, gap: 0, txroot_live: 1, reasons: [] });
throws(
  () => validateReadySnapshotV1({ ready: true, gap: 1, txroot_live: 1, reasons: [] }),
  /gap is not zero/,
);
throws(
  () => validateReadySnapshotV1({ ready: true, gap: 0, txroot_live: 0, reasons: [] }),
  /txroot_live is not 1/,
);

assert.deepEqual(
  validatePeersSnapshotV1(peerFixture),
  { connected_count: 1, verified_count: 1, verified_connected_count: 1 },
);
throws(
  () => validatePeersSnapshotV1({ ok: true, connected: [], verifiedPeers: [] }),
  /no connected P2P peer/,
);
throws(
  () => validatePeersSnapshotV1({ ok: true, connected: [connectedPeer()], verifiedPeers: [] }),
  /no verified P2P peer/,
);

const toolText = fs.readFileSync("tools/void-nimo-no-tailnet-acceptance-v1.mjs", "utf8");
const docText = fs.readFileSync("docs/operations/void-nimo-no-tailnet-onboarding-v1.md", "utf8");
const workflowText = fs.readFileSync(".github/workflows/void-nimo-no-tailnet-acceptance-v1.yml", "utf8");

for (const forbidden of [
  "tailscale up",
  "systemctl restart",
  "systemctl start",
  "apt-get install tailscale",
  "100.122.245.125",
  "100.122.198.38",
  "100.122.79.39",
]) {
  assert.equal(toolText.includes(forbidden), false, `tool contains forbidden live dependency: ${forbidden}`);
}

assert.match(docText, /VOID_PUBLIC_BOOTSTRAP_REQUIRE=1 \.\/run-void-node\.sh/);
assert.match(docText, /Do not set `BOOTSTRAP_ADDRS` manually/);
assert.match(docText, /public_onboarding_accepted=false/);
assert.match(workflowText, /node-version: \[22, 24, 26\]/);
assert.match(workflowText, /prove_void_nimo_no_tailnet_acceptance_v1\.mjs/);
for (const path of peerSourcePaths) {
  assert.equal(workflowText.split(`'${path}'`).length - 1, 2, `peer source must trigger PR and main proof: ${path}`);
}


// Execute the actual CLI module. Only OS, resolver and HTTP boundaries are
// substituted; no production function is rewritten or replaced by an oracle.
async function runCli(sourceText, options = {}) {
  const output = [], errors = [], trace = [], waits = [];
  const http = [], httpTimers = [], allocations = [];
  let largestRetained = 0;
  let clock = proofNow, wallShift = 0, opened = 0, resolverCalls = 0, requestCount = 0, exitCode = 0;
  const files = new Map(), timers = new Set();
  const manifest = options.manifest || stable;
  const raw = Buffer.from(JSON.stringify(manifest, null, 2) + "\n");
  const file = `${process.cwd()}/tools/void-nimo-no-tailnet-acceptance-v1.mjs`;
  const stop = new Error("hermetic CLI exit");
  class Clock extends Date { static now() { return clock + wallShift; } }
  const fixtureFs = {
    constants: fs.constants,
    readFileSync(name) { // exact predecessor API
      assert.equal(name, "public/bootstrap/v1.json"); return raw.toString("utf8");
    },
    openSync(name, flags) {
      assert.equal(name, "public/bootstrap/v1.json");
      assert.equal(flags, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
      opened += 1;
      let bytes = raw;
      if (opened >= (options.changeAtRead || Infinity)) {
        bytes = Buffer.from(JSON.stringify(seal({ ...manifest, notes: "changed generation" }), null, 2) + "\n");
      }
      if (opened >= (options.rewriteAtRead || Infinity)) bytes = Buffer.from(JSON.stringify(manifest));
      files.set(opened, bytes); return opened;
    },
    fstatSync(fd) {
      const bytes = files.get(fd); assert(bytes);
      return { isFile: () => true, nlink: 1, size: bytes.length, dev: 1, ino: 2, mode: 0o100644, mtimeMs: 1, ctimeMs: 1 };
    },
    readSync(fd, buffer, offset, length, position) {
      return files.get(fd).copy(buffer, offset, position, position + length);
    },
    closeSync(fd) { assert(files.delete(fd)); },
  };
  const fixtureProcess = {
    argv: [process.execPath, file, options.mode || "--post-sync"],
    execPath: process.execPath, env: options.environment || {}, cwd: () => process.cwd(),
    exit(code) { exitCode = code; throw stop; },
  };
  const result = (stdout = "", stderr = "", status = 0) => ({ stdout, stderr, status });
  const child = { spawnSync(command, args, settings) {
    trace.push({ command, args, settings });
    if (command === "git") {
      const key = args.join(" ");
      if (key === "rev-parse --show-toplevel") return result(process.cwd());
      if (key === "branch --show-current") return result("main");
      if (key === "rev-parse HEAD" || key === "rev-parse origin/main") return result("f".repeat(40));
      if (key === "status --porcelain=v1 --untracked-files=all") return result();
      throw new Error(`unexpected Git operation: ${key}`);
    }
    if (command === "ip") return result("[]");
    if (command === "ps") return result("node hermetic-fixture");
    if (command === "/bin/sh") return result();
    assert.equal(command, process.execPath, "unexpected child process");
    assert.deepEqual(Array.from(args), ["scripts/resolve_void_public_bootstrap_v1.mjs", "--verify-only"]);
    resolverCalls += 1;
    const id = options.resolverId || (resolverCalls === 2 && options.finalResolverId) || manifest.manifest_id;
    const lines = ["marker=VOID_PUBLIC_BOOTSTRAP_RESOLVER_V1", "manifest_source=remote_https",
      `manifest_id=${id}`, "status=stable_https_seed", "trust_material_verified=true",
      "live_seed_probe_performed=false", "VOID_PUBLIC_BOOTSTRAP_RESOLVER_V1_VERIFY_GREEN"];
    if (options.duplicateResolverId) lines.push(`manifest_id=${id}`);
    if (options.missingResolverId) lines.splice(2, 1);
    if (options.missingResolverGreen) lines.pop();
    if (resolverCalls === 2 && options.expireAtFinalResolver) clock = Date.parse(manifest.expires_at);
    if (resolverCalls === options.injectEnvironmentAtResolver) {
      Object.assign(fixtureProcess.env, options.injectEnvironment);
    }
    return result("https://seed.voidchain.org\n", lines.join("\n"), options.resolverStatus || 0);
  } };
  const fetch = async (url, settings) => {
    assert.equal(new URL(url).origin, options.expectedOrigin || "http://127.0.0.1:4100");
    assert.equal(settings.redirect, "error");
    const route = new URL(url).pathname, index = Math.floor(requestCount / 4);
    requestCount += 1;
    if (requestCount === options.injectEnvironmentAtRequest) {
      Object.assign(fixtureProcess.env, options.injectEnvironment);
    }
    const observed = (options.heads || [1951058, 1951058, 1951058])[index];
    let body;
    if (route === "/health") body = { ok: options.healthOk !== false };
    else if (route === "/__void/ready.json") {
      body = { ready: true, gap: 0, txroot_live: 1, reasons: [], head: observed, ...options.ready };
    } else if (route === "/blocks/latest/number2.json") body = { number: options.latestHead ?? observed };
    else if (route === "/p2p/peers") body = options.peersBySample ? options.peersBySample[index] :
      Object.hasOwn(options, "peers") ? options.peers : peerFixture;
    else throw new Error(`unexpected HTTP route ${route}`);
    const spec = requestCount === (options.http?.atRequest || 1) ? (options.http || {}) : {};
    const record = { request: requestCount, reads: 0, acquired_bytes: 0, reader_acquired: 0,
      cancelled: 0, released: 0, aborted: false, array_buffer_calls: 0, array_buffer_bytes: 0 };
    http.push(record);
    settings.signal.addEventListener("abort", () => { record.aborted = true; }, { once: true });
    if (spec.stallHeaders) return new Promise(() => {});
    const payload = spec.raw ?? Buffer.from(JSON.stringify(body));
    const headers = new Headers({ "content-type": "application/json", ...spec.headers });
    for (const name of spec.omitHeaders || []) headers.delete(name);
    const scripted = spec.chunks || spec.raw || spec.stallReadAt || spec.emptyReads || spec.readErrorAt || spec.invalidChunk;
    const native = scripted ? undefined : new Response(payload).body;
    let nativeReader, chunkIndex = 0;
    const chunks = spec.chunks || [payload];
    const cancel = () => {
      record.cancelled += 1;
      if (spec.cancel === "stall") return new Promise(() => {});
      if (spec.cancel === "throw") throw new Error("fixture cancellation threw");
      if (spec.cancel === "reject") return Promise.reject(new Error("fixture cancellation rejected"));
      return nativeReader ? nativeReader.cancel() : native?.cancel();
    };
    const bodyStream = {
      cancel,
      getReader() {
        record.reader_acquired += 1;
        nativeReader = native?.getReader();
        return { cancel,
          releaseLock() { record.released += 1; nativeReader?.releaseLock(); },
          async read() {
            record.reads += 1;
            if (spec.advancePerRead) clock += spec.advancePerRead;
            if (spec.wallClockRollback) wallShift -= 60_000;
            if (record.reads === spec.stallReadAt) return new Promise(() => {});
            if (record.reads === spec.readErrorAt) throw new Error("fixture body read failed");
            if (spec.emptyReads) return { done: false, value: new Uint8Array() };
            if (spec.invalidChunk) return { done: false, value: "not bytes" };
            const row = nativeReader ? await nativeReader.read() :
              chunkIndex < chunks.length ? { done: false, value: chunks[chunkIndex++] } : { done: true };
            if (!row.done) record.acquired_bytes += row.value.byteLength;
            return row;
          },
        };
      },
    };
    if (spec.advanceAtHeaders) clock += spec.advanceAtHeaders;
    return {
      status: spec.status || 200, ok: (spec.status || 200) >= 200 && (spec.status || 200) < 300,
      redirected: spec.redirected || false, headers, body: spec.missingBody ? null : bodyStream,
      async arrayBuffer() { // predecessor only: measure its post-retention check
        record.array_buffer_calls += 1;
        const bytes = Buffer.concat(chunks);
        record.array_buffer_bytes += bytes.length;
        return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
      },
    };
  };
  const observedBuffer = new Proxy(Buffer, { get(target, key) {
    if (key !== "alloc") return Reflect.get(target, key);
    return size => {
      allocations.push(size);
      const buffer = Buffer.alloc(size);
      buffer.set = (chunk, offset = 0) => {
        largestRetained = Math.max(largestRetained, offset + chunk.byteLength);
        return Uint8Array.prototype.set.call(buffer, chunk, offset);
      };
      return buffer;
    };
  } });
  const context = vm.createContext({ Buffer: observedBuffer, Uint8Array, TextDecoder,
    URL, Date: Clock, performance: { now: () => clock - proofNow }, structuredClone, AbortController, fetch,
    setTimeout(callback, delay) {
      if (delay === 1000) { clock += delay; waits.push(delay); }
      if (delay === 10_000 || delay === 250) httpTimers.push(delay);
      const targetRequest = options.http?.atRequest || 1;
      const accelerated = options.fastHttpDeadlines && (
        (delay === 10_000 && requestCount + 1 === targetRequest &&
          (options.http.stallHeaders || options.http.stallReadAt)) ||
        (delay === 250 && requestCount === targetRequest && options.http.cancel === "stall"));
      const timer = setTimeout(() => {
        timers.delete(timer);
        if (accelerated) clock += delay;
        callback();
      }, delay === 1000 ? 0 : accelerated ? 5 : delay);
      timers.add(timer); return timer;
    },
    clearTimeout(timer) { clearTimeout(timer); timers.delete(timer); },
    console: { log: value => output.push(String(value)), error: value => errors.push(String(value)) },
  });
  const builtins = { "node:fs": fixtureFs, "node:net": { isIP: net.isIP, BlockList: net.BlockList },
    "node:process": fixtureProcess, "node:child_process": child,
    "node:crypto": { createHash: crypto.createHash },
    "node:dns": { promises: { lookup() { throw new Error("real DNS is forbidden in the CLI fixture"); } } } };
  const cache = new Map();
  const entry = new vm.SourceTextModule(sourceText, { context, identifier: `file://${file}`,
    initializeImportMeta: meta => { meta.url = `file://${file}`; } });
  await entry.link((specifier, parent) => {
    const key = specifier.startsWith("node:") ? specifier : new URL(specifier, parent.identifier).href;
    if (cache.has(key)) return cache.get(key);
    let module;
    if (specifier.startsWith("node:")) {
      const value = builtins[specifier]; assert(value, `unexpected builtin ${specifier}`);
      const keys = [...new Set(["default", ...Object.keys(value)])];
      module = new vm.SyntheticModule(keys, function() {
        this.setExport("default", value);
        for (const [name, item] of Object.entries(value)) this.setExport(name, item);
      }, { context });
    } else {
      assert(key.endsWith("/scripts/lib/void_public_seed_common_v1.mjs"), `unexpected module ${key}`);
      module = new vm.SourceTextModule(fs.readFileSync(new URL(key), "utf8"), { context, identifier: key });
    }
    cache.set(key, module); return module;
  });
  try { await entry.evaluate(); }
  catch (error) { if (error !== stop) throw error; }
  finally {
    const leaked = timers.size;
    for (const timer of timers) clearTimeout(timer);
    assert.equal(leaked, 0, "CLI timer leaked");
  }
  assert.equal(files.size, 0, "manifest descriptor leaked");
  return { output, errors, exitCode, opened, resolverCalls, requestCount, waits, trace,
    http, httpTimers, allocations, largestRetained, elapsed: clock - proofNow };
}

const legacy = spawnSync("/usr/bin/git", ["--no-replace-objects", "show",
  "25d9f3a06e79e4b9db0407a0a24f89be806b2806:tools/void-nimo-no-tailnet-acceptance-v1.mjs"],
  { encoding: "utf8", timeout: 10_000, maxBuffer: 64 * 1024 });
assert.equal(legacy.status, 0, "exact historical falsifier source is unavailable");
assert.equal(sha256Hex(legacy.stdout), "dc4f615cc8689865b6d01ac75868ff6300896c961229b46fdc5efcb01ded84a4");
const legacyResult = await runCli(legacy.stdout, { heads: [196802] });
assert.equal(legacyResult.exitCode, 0);
assert(legacyResult.output.includes("VOID_NIMO_NO_TAILNET_POST_SYNC_V1_GREEN"), "historical false green not reproduced");

const GREEN = "VOID_NIMO_NO_TAILNET_TARGET_OBSERVATIONS_V1_GREEN";
const cases = [];
async function rejectsCli(name, options, reason) {
  const r = await runCli(toolText, options);
  assert.equal(r.exitCode, 2, name);
  assert.equal(r.output.some(line => line.endsWith("_GREEN")), false, name);
  assert.match(r.errors.join("\n"), reason, name);
  cases.push({ id: name, observed: "HOLD" });
}
async function acceptsCli(name, options = {}) {
  const r = await runCli(toolText, options);
  assert.equal(r.exitCode, 0, `${name}: ${r.errors.join("\n")}`);
  assert(r.output.includes(GREEN), name);
  assert(!r.output.includes("VOID_NIMO_NO_TAILNET_POST_SYNC_V1_GREEN"), "old whole-join terminal emitted");
  assert(r.output.includes("public_onboarding_accepted=false"));
  assert(r.output.includes("runtime_session_bound=false"));
  assert.equal(r.requestCount, 12); assert.equal(r.resolverCalls, 2);
  assert.deepEqual(r.waits, [1000, 1000]);
  for (const row of r.trace.filter(row => row.command === process.execPath)) {
    assert.equal(row.settings.timeout, 60_000);
    assert.equal(row.settings.env.VOID_PUBLIC_BOOTSTRAP_ALLOW_LOOPBACK_FIXTURE, "0");
  }
  cases.push({ id: name, observed: "TARGET_OBSERVATIONS_ONLY" });
  return r;
}
await rejectsCli("empirical-behind-qualified-head", { heads: [196802] }, /below qualified target 1951058/);
for (const [id, head] of [["missing", undefined], ["string", "1951058"], ["boolean", true],
  ["zero", 0], ["negative", -1], ["fractional", 1.5], ["unsafe", Number.MAX_SAFE_INTEGER + 1], ["null", null]]) {
  await rejectsCli(`readiness-head-${id}`, { ready: { head } }, /readiness head must be a positive safe integer/);
}
for (const [id, head] of [["string", "1951058"], ["boolean", true], ["fractional", 1.5], ["unsafe", Number.MAX_SAFE_INTEGER + 1]]) {
  await rejectsCli(`latest-head-${id}`, { latestHead: head }, /head snapshot number must be a positive safe integer/);
}
await rejectsCli("cross-surface-head-mismatch", { ready: { head: 1951059 } }, /ready\/head mismatch/);
await rejectsCli("second-sample-below-target", { heads: [1951058, 196802] }, /below qualified target/);
await rejectsCli("third-sample-below-target", { heads: [1951058, 1951058, 196802] }, /below qualified target/);
await rejectsCli("resolver-different-generation", { resolverId: `voidpbm1_${"a".repeat(64)}` }, /resolver-admitted manifest identity differs/);
await rejectsCli("resolver-duplicate-identity", { duplicateResolverId: true }, /resolver-admitted manifest identity differs/);
await rejectsCli("resolver-missing-identity", { missingResolverId: true }, /resolver-admitted manifest identity differs/);
await rejectsCli("resolver-no-verify-terminal", { missingResolverGreen: true }, /resolver result lacks exact/);
await rejectsCli("resolver-unsuccessful-exit", { resolverStatus: 2 }, /canonical public bootstrap resolver failed/);
await rejectsCli("resolver-final-generation-change", { finalResolverId: `voidpbm1_${"a".repeat(64)}` }, /resolver-admitted manifest identity differs/);
await rejectsCli("local-manifest-generation-change", { changeAtRead: 4 }, /target generation changed/);
await rejectsCli("local-manifest-byte-rewrite", { rewriteAtRead: 4 }, /target generation changed/);
await rejectsCli("manifest-expiry-during-terminal-check", { expireAtFinalResolver: true }, /expired/);
for (const [id, head] of [["missing", undefined], ["string", "1951058"], ["fractional", 1.5], ["unsafe", Number.MAX_SAFE_INTEGER + 1]]) {
  const endpoint = { ...stable.sync_endpoints[0], qualified_head: head };
  if (head === undefined) delete endpoint.qualified_head;
  const altered = seal({ ...stable, sync_endpoints: [endpoint] });
  await rejectsCli(`qualified-head-${id}`, { manifest: altered }, /qualified_head must be a positive safe integer/);
}
const badContentId = structuredClone(stable); badContentId.sync_endpoints[0].qualified_head -= 1;
await rejectsCli("local-manifest-forged-content-id", { manifest: badContentId }, /content ID mismatch/);
await rejectsCli("health-hold-preserved", { healthOk: false }, /local health is not green/);
await rejectsCli("readiness-hold-preserved", { ready: { ready: false } }, /not ready/);
await rejectsCli("gap-hold-preserved", { ready: { gap: 1 } }, /gap is not zero/);
await rejectsCli("txroot-hold-preserved", { ready: { txroot_live: 0 } }, /txroot_live is not 1/);
await rejectsCli("peer-hold-preserved", { peers: { ok: true, connected: [], verifiedPeers: [] } }, /no connected P2P peer/);
await acceptsCli("target-reached-and-sustained");
await acceptsCli("target-exceeded-and-sustained", { heads: [1951059, 1951060, 1951061] });
const multiple = seal({ ...stable, sync_endpoints: [stable.sync_endpoints[0],
  { ...stable.sync_endpoints[0], base: "https://seed2.voidchain.org", qualified_head: 2000000 }] });
await rejectsCli("maximum-qualified-target-required", { manifest: multiple }, /below qualified target 2000000/);
const maximum = await acceptsCli("maximum-qualified-target-reached", { manifest: multiple, heads: [2000000, 2000000, 2000000] });
assert(maximum.output.includes("qualified_target_head=2000000"));
const preflight = await runCli(toolText, { mode: "--preflight" });
assert.equal(preflight.exitCode, 0); assert(preflight.output.includes("qualified_target_head=1951058"));
assert.equal(preflight.requestCount, 0); assert.equal(preflight.resolverCalls, 1);
cases.push({ id: "preflight-binds-qualified-target", observed: "PREFLIGHT_ONLY" });
assert.equal(cases.length, 40);
assert.equal(new Set(cases.map(row => row.id)).size, cases.length);
console.log(canonicalJson({ marker: "VOID_NIMO_QUALIFIED_TARGET_CLI_PROOF_V1", node: process.version,
  historical_false_green_reproduced: true, case_count: cases.length, cases,
  real_network_requests: 0, node_started: false, runtime_session_bound: false, public_onboarding_accepted: false }));

// HTTP admission controls remain a separate closed population from the 40
// target-generation cases above. All execute the unchanged CLI entry path.
const HTTP_LIMIT = 2 * 1024 * 1024;
const healthBytes = Buffer.from('{"ok":true}');
const paddedHealth = size => Buffer.concat([healthBytes, Buffer.alloc(size - healthBytes.length, 0x20)]);
const oversized = paddedHealth(HTTP_LIMIT + 1);
const httpPredecessor = spawnSync("/usr/bin/git", ["--no-replace-objects", "show",
  "8f112ec2273f18b387bdc1142412671b3660c6d1:tools/void-nimo-no-tailnet-acceptance-v1.mjs"],
  { encoding: "utf8", timeout: 10_000, maxBuffer: 64 * 1024 });
assert.equal(httpPredecessor.status, 0);
assert.equal(sha256Hex(httpPredecessor.stdout), "901d1cba902b5668b29899e4341a386d2a9c0118e60788170b94f1849ae1e80b");
const historicalBody = await runCli(httpPredecessor.stdout, { http: { raw: oversized } });
assert.equal(historicalBody.exitCode, 2);
assert.match(historicalBody.errors.join("\n"), /exceeded response ceiling/);
assert.equal(historicalBody.http[0].array_buffer_bytes, HTTP_LIMIT + 1,
  "predecessor must retain oversized body before rejecting it");

const httpCases = [];
function boundedHttp(r) {
  assert(r.allocations.every(size => size <= HTTP_LIMIT), "oversized retention allocation");
  assert(r.largestRetained <= HTTP_LIMIT, "chunk copied beyond retention ceiling");
  for (const row of r.http) {
    assert.equal(row.array_buffer_calls, 0, "whole-body acquisition returned");
    assert.equal(row.released, row.reader_acquired, "reader lock leaked");
    assert.equal(row.aborted, true, "request signal not retired");
    assert(row.reads <= 1024, "read count exceeded");
  }
}
async function rejectHttp(id, spec, reason, expected = {}, options = {}) {
  const r = await runCli(toolText, { http: spec, ...options });
  assert.equal(r.exitCode, 2, `${id}: ${r.errors.join("\n")}`);
  assert.equal(r.output.some(line => line.endsWith("_GREEN")), false, id);
  assert.match(r.errors.join("\n"), reason, id);
  assert.equal(r.requestCount, spec.atRequest || 1, "read continued after rejection");
  boundedHttp(r);
  const last = r.http.at(-1);
  assert.equal(last.cancelled, spec.stallHeaders || spec.missingBody ? 0 : 1, "rejection cancellation count");
  for (const [key, value] of Object.entries(expected)) assert.equal(last[key], value, `${id}: ${key}`);
  httpCases.push({ id, observed: "HOLD", reads: last.reads, retained_bytes: r.largestRetained,
    cancelled: last.cancelled, released: last.released });
  return r;
}
async function acceptHttp(id, spec, expected = {}) {
  const r = await runCli(toolText, { http: spec });
  assert.equal(r.exitCode, 0, `${id}: ${r.errors.join("\n")}`);
  assert(r.output.includes(GREEN));
  assert(r.output.includes("public_onboarding_accepted=false"));
  assert(r.output.includes("runtime_session_bound=false"));
  assert.equal(r.requestCount, 12); assert.equal(r.resolverCalls, 2);
  assert.deepEqual(r.waits, [1000, 1000]);
  boundedHttp(r);
  assert(r.http.every(row => row.reader_acquired === 1 && row.cancelled === 0));
  for (const [key, value] of Object.entries(expected)) assert.equal(r.http[0][key], value, `${id}: ${key}`);
  httpCases.push({ id, observed: "TARGET_OBSERVATIONS_ONLY", reads: r.http[0].reads,
    retained_bytes: r.largestRetained, cancelled: 0, released: 1 });
}
await rejectHttp("declared-oversize-before-read", { headers: { "content-length": String(HTTP_LIMIT + 1) } },
  /declared length exceeds/, { reads: 0, reader_acquired: 0, acquired_bytes: 0 });
for (const [id, value] of [["negative", "-1"], ["fractional", "1.5"], ["exponent", "2e6"],
  ["hex", "0x10"], ["leading-zero", "011"], ["duplicate", "11, 11"], ["unsafe", "9007199254740992"]]) {
  await rejectHttp(`declared-length-${id}`, { headers: { "content-length": value } },
    /content length is noncanonical/, { reads: 0, reader_acquired: 0 });
}
await rejectHttp("declared-empty", { headers: { "content-length": "0" } }, /declared length/, { reads: 0 });
await rejectHttp("single-chunk-over-ceiling", { raw: oversized }, /streamed body exceeded/,
  { reads: 1, acquired_bytes: HTTP_LIMIT + 1 });
assert.equal(httpCases.at(-1).retained_bytes, 0, "oversized first chunk was retained");
await rejectHttp("stream-over-ceiling-stops-at-first-extra-byte",
  { chunks: [paddedHealth(HTTP_LIMIT), Buffer.from(" "), Buffer.from("must never be read")] },
  /streamed body exceeded/, { reads: 2, acquired_bytes: HTTP_LIMIT + 1 });
assert.equal(httpCases.at(-1).retained_bytes, HTTP_LIMIT);
await rejectHttp("body-over-declared-length", { raw: healthBytes, headers: { "content-length": "10" } },
  /body exceeds declared/, { reads: 1 });
await rejectHttp("body-shorter-than-declared", { raw: healthBytes, headers: { "content-length": "12" } },
  /body length mismatch/, { reads: 2 });
for (const [id, spec, reads] of [
  ["headers-stall", { stallHeaders: true }, 0],
  ["first-body-read-stall", { stallReadAt: 1 }, 1],
  ["body-stall-after-prefix", { chunks: [Buffer.from('{"ok":')], stallReadAt: 2 }, 2],
]) {
  const r = await rejectHttp(id, spec, /HTTP request deadline exceeded/, { reads }, { fastHttpDeadlines: true });
  assert.equal(r.elapsed, 10_000); assert(r.httpTimers.includes(10_000));
}
await rejectHttp("slow-drip-crosses-total-deadline",
  { chunks: [Buffer.from(" "), Buffer.from(" "), healthBytes], advancePerRead: 4000 },
  /HTTP request deadline exceeded/, { reads: 3 });
await rejectHttp("wall-clock-rollback-cannot-extend-deadline",
  { chunks: [Buffer.from(" "), Buffer.from(" "), healthBytes], advancePerRead: 4000, wallClockRollback: true },
  /HTTP request deadline exceeded/, { reads: 3 });
await rejectHttp("headers-arrive-at-deadline-and-body-is-cancelled", { advanceAtHeaders: 10_000 },
  /HTTP request deadline exceeded/, { reads: 0, reader_acquired: 0 });
const fullTimeout = await rejectHttp("read-and-cleanup-both-stall", { stallReadAt: 1, cancel: "stall" },
  /HTTP request deadline exceeded/, { reads: 1 }, { fastHttpDeadlines: true });
assert.equal(fullTimeout.elapsed, 10_250);
await rejectHttp("empty-chunk-stream-hits-read-ceiling", { emptyReads: true }, /exceeded read ceiling/, { reads: 1024 });
await rejectHttp("missing-eof-at-read-ceiling", { chunks: Array.from({ length: 1024 }, () => Buffer.from(" ")) },
  /exceeded read ceiling/, { reads: 1024 });
await rejectHttp("truncated-json", { raw: Buffer.from('{"ok":') }, /JSON|Unexpected|position/);
await rejectHttp("invalid-utf8", { raw: Buffer.from([0xff]) }, /encoded data|encoding/);
await rejectHttp("json-bom-rejected", { raw: Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), healthBytes]) }, /JSON|Unexpected/);
await rejectHttp("non-json-body", { raw: Buffer.from("<html>broken</html>") }, /JSON|Unexpected/);
await rejectHttp("empty-body", { raw: Buffer.alloc(0) }, /length mismatch or empty/);
await rejectHttp("body-read-error", { readErrorAt: 1 }, /fixture body read failed/, { reads: 1 });
await rejectHttp("body-error-after-prefix", { chunks: [Buffer.from('{"ok":')], readErrorAt: 2 },
  /fixture body read failed/, { reads: 2 });
await rejectHttp("missing-body", { missingBody: true }, /body is missing/, { reads: 0 });
await rejectHttp("non-byte-chunk", { invalidChunk: true }, /chunk is not bytes/, { reads: 1 });
for (const status of [206, 302, 500]) {
  await rejectHttp(`status-${status}-before-read`, { status }, /unredirected status 200/, { reads: 0 });
}
await rejectHttp("redirected-response", { redirected: true }, /unredirected status 200/, { reads: 0 });
for (const [id, value] of [["html", "text/html"], ["wrong-charset", "application/json; charset=utf-16"],
  ["duplicate", "application/json, application/json"]]) {
  await rejectHttp(`media-type-${id}`, { headers: { "content-type": value } }, /requires application\/json/, { reads: 0 });
}
await rejectHttp("media-type-missing", { omitHeaders: ["content-type"] }, /requires application\/json/, { reads: 0 });
await rejectHttp("compressed-evidence", { headers: { "content-encoding": "gzip" } }, /encoding is unsupported/, { reads: 0 });
await rejectHttp("duplicate-content-encoding", { headers: { "content-encoding": "identity, identity" } }, /encoding is unsupported/, { reads: 0 });
await rejectHttp("conflicting-transfer-framing", { headers: { "content-length": "11", "transfer-encoding": "chunked" } },
  /transfer framing/, { reads: 0 });
await rejectHttp("unsupported-transfer-framing", { headers: { "transfer-encoding": "gzip" } }, /transfer framing/, { reads: 0 });
for (const [id, spec] of [["header-rejection", { status: 500 }], ["body-rejection", { raw: oversized }]]) {
  const r = await rejectHttp(`cancel-stall-${id}`, { ...spec, cancel: "stall" },
    /status 200|streamed body exceeded/, {}, { fastHttpDeadlines: true });
  assert.equal(r.elapsed, 250); assert(r.httpTimers.includes(250));
}
for (const cancel of ["throw", "reject"]) {
  await rejectHttp(`cancel-${cancel}-preserves-hold`, { raw: oversized, cancel }, /streamed body exceeded/);
}
await rejectHttp("third-observation-body-stall", { atRequest: 9, stallReadAt: 1 },
  /HTTP request deadline exceeded/, { reads: 1 }, { fastHttpDeadlines: true });
for (const size of [HTTP_LIMIT - 1, HTTP_LIMIT]) {
  await acceptHttp(`unknown-length-${size}-bytes`, { raw: paddedHealth(size) }, { reads: 2, acquired_bytes: size });
}
await acceptHttp("exact-ceiling-declared-body", { raw: paddedHealth(HTTP_LIMIT), headers: { "content-length": String(HTTP_LIMIT) } },
  { reads: 2, acquired_bytes: HTTP_LIMIT });
const unicodeHealth = Buffer.from('{"ok":true,"label":"€"}');
const split = unicodeHealth.indexOf(Buffer.from("€")) + 1;
await acceptHttp("utf8-codepoint-split-across-chunks", { chunks: [unicodeHealth.subarray(0, split), unicodeHealth.subarray(split)] }, { reads: 3 });
await acceptHttp("eof-at-exact-read-ceiling", { chunks: [...Array.from({ length: 1022 }, () => Buffer.alloc(0)), healthBytes] }, { reads: 1024 });
await acceptHttp("json-utf8-identity-headers", { headers: { "content-type": 'Application/JSON; charset="UTF-8"', "content-encoding": "identity" } });
await acceptHttp("chunked-without-declared-length", { headers: { "transfer-encoding": "chunked" } });
assert.equal(httpCases.length, 55);
assert.equal(new Set(httpCases.map(row => row.id)).size, httpCases.length);
console.log(canonicalJson({ marker: "VOID_NIMO_HTTP_ADMISSION_CLI_PROOF_V1", node: process.version,
  predecessor_overretention_reproduced: true, predecessor_retained_bytes: HTTP_LIMIT + 1,
  retention_ceiling_bytes: HTTP_LIMIT, read_ceiling: 1024, request_deadline_ms: 10_000,
  rejection_cleanup_ms: 250, case_count: httpCases.length, cases: httpCases,
  real_network_requests: 0, node_started: false, runtime_session_bound: false, public_onboarding_accepted: false }));

const peerPredecessor = spawnSync("/usr/bin/git", ["--no-replace-objects", "show",
  "449b28bd1b0f7fbce770fc3d399d2c1ea764ef4f:tools/void-nimo-no-tailnet-acceptance-v1.mjs"],
  { encoding: "utf8", timeout: 10_000, maxBuffer: 64 * 1024 });
assert.equal(peerPredecessor.status, 0);
assert.equal(sha256Hex(peerPredecessor.stdout), "5ff31a9ccd8a4e494c5ba9280596764ae64ac6fc26fe5b479ad8fbd16a3ba4a2");
const malformedPeers = { ok: false, connected: [null], verifiedPeers: [false] };
const historicalPeers = await runCli(peerPredecessor.stdout, { peers: malformedPeers });
assert.equal(historicalPeers.exitCode, 0);
assert(historicalPeers.output.includes(GREEN), "predecessor malformed-peer false green not reproduced");
assert(historicalPeers.output.includes("connected_peer_count=1"));
assert(historicalPeers.output.includes("verified_peer_count=1"));

const peerCases = [];
async function rejectPeerCase(id, peers, reason = /peer/, sample = 0) {
  const options = sample ? { peersBySample: [peerFixture, peerFixture, peerFixture].map((p, i) => i === sample ? peers : p) } : { peers };
  const r = await runCli(toolText, options);
  assert.equal(r.exitCode, 2, `${id}: ${r.errors.join("\n")}`);
  assert.equal(r.output.some(line => line.endsWith("_GREEN")), false, id);
  assert.match(r.errors.join("\n"), reason, id);
  assert.equal(r.requestCount, (sample + 1) * 4, "peer validation continued after rejection");
  boundedHttp(r);
  peerCases.push({ id, observed: "HOLD", sample: sample + 1 });
}
async function acceptPeerCase(id, peers, expected) {
  const r = await runCli(toolText, { peers });
  assert.equal(r.exitCode, 0, `${id}: ${r.errors.join("\n")}`);
  assert(r.output.includes(GREEN));
  for (const [key, value] of Object.entries(expected)) assert(r.output.includes(`${key}=${value}`), `${id}: ${key}`);
  for (const key of ["public_onboarding_accepted", "runtime_session_bound", "fresh_join_proven"]) {
    assert(r.output.includes(`${key}=false`));
  }
  assert.equal(r.requestCount, 12); assert.equal(r.resolverCalls, 2);
  assert.deepEqual(r.waits, [1000, 1000]);
  boundedHttp(r);
  peerCases.push({ id, observed: "TARGET_OBSERVATIONS_ONLY", ...expected });
}
const peerPatch = (group, fields) => ({ ...structuredClone(peerFixture),
  [group]: [{ ...peerFixture[group][0], ...fields }] });
await rejectPeerCase("empirical-malformed-record-false-green", malformedPeers, /ok must be true/);
for (const [id, ok] of [["missing", undefined], ["false", false], ["number", 1], ["string", "true"], ["null", null]]) {
  await rejectPeerCase(`ok-${id}`, { ...peerFixture, ok }, /ok must be true/);
}
for (const group of ["connected", "verifiedPeers"]) {
  for (const [id, value] of [["missing", undefined], ["null", null], ["string", "peer"], ["object", {}], ["empty", []]]) {
    await rejectPeerCase(`${group}-array-${id}`, { ...peerFixture, [group]: value }, /no (connected|verified) P2P peer/);
  }
  for (const [id, value] of [["null", null], ["false", false], ["true", true], ["number", 7], ["string", "peer"], ["array", []], ["empty-object", {}]]) {
    await rejectPeerCase(`${group}-record-${id}`, { ...peerFixture, [group]: [value] }, /peer must be an object|peer fields/);
    await rejectPeerCase(`${group}-mixed-${id}`, { ...peerFixture, [group]: [peerFixture[group][0], value] }, /peer must be an object|peer fields/);
  }
  for (const key of Object.keys(peerFixture[group][0])) {
    const missing = structuredClone(peerFixture); delete missing[group][0][key];
    await rejectPeerCase(`${group}-field-${key}-missing`, missing, /peer fields/);
  }
  await rejectPeerCase(`${group}-unknown-field`, peerPatch(group, { unreviewed: true }), /peer fields/);
  const identity = group === "connected" ? "id" : "node_id";
  for (const [id, value] of [["null", null], ["number", 7], ["boolean", true], ["empty", ""],
    ["uppercase", "A".repeat(32)], ["short", "a".repeat(31)], ["long", "a".repeat(33)], ["nonhex", "g".repeat(32)],
    ["trailing-newline", "a".repeat(32) + "\n"]]) {
    await rejectPeerCase(`${group}-identity-${id}`, peerPatch(group, { [identity]: value }), /peer (id|node_id) is invalid/);
  }
  await rejectPeerCase(`${group}-duplicate-identity`, { ...peerFixture, [group]: [peerFixture[group][0], peerFixture[group][0]] }, /duplicate .*peer/);
}
for (const [id, addr] of [["null", null], ["number", 7], ["empty", ""], ["oversize", "x".repeat(513)],
  ["space", "peer .example:4700"], ["control", "peer\0.example:4700"]]) {
  await rejectPeerCase(`connected-address-${id}`, peerPatch("connected", { addr }), /bounded nonempty address text/);
}
for (const [id, outbound] of [["null", null], ["number", 0], ["string", "false"], ["object", {}]]) {
  await rejectPeerCase(`outbound-${id}`, peerPatch("connected", { outbound }), /outbound must be a boolean/);
}
for (const [group, field, limit] of [["connected", "listens", 32], ["verifiedPeers", "addresses", 8]]) {
  for (const [id, value] of [["null", null], ["object", {}], ["string", "peer.example:4700"],
    ["over-limit", Array.from({ length: limit + 1 }, (_, i) => `peer${i}.example:4700`)],
    ["mixed-null", ["peer.example:4700", null]], ["mixed-number", ["peer.example:4700", 7]],
    ["empty-string", [""]], ["duplicate", ["peer.example:4700", "peer.example:4700"]], ["oversize-string", ["x".repeat(513)]]]) {
    await rejectPeerCase(`${field}-${id}`, peerPatch(group, { [field]: value }), /address count|address text|duplicate addresses/);
  }
}
await rejectPeerCase("verified-addresses-empty", peerPatch("verifiedPeers", { addresses: [] }), /address count/);
for (const [id, value] of [["null", null], ["string", String(proofNow)], ["boolean", true], ["negative", -1],
  ["fractional", 1.5], ["unsafe", Number.MAX_SAFE_INTEGER + 1]]) {
  await rejectPeerCase(`authentication-timestamp-${id}`, peerPatch("verifiedPeers", { last_authenticated_at_ms: value }), /nonnegative safe integer/);
}
await rejectPeerCase("ambiguous-cache-address-ownership", { ...peerFixture,
  verifiedPeers: [verifiedPeer(), { ...verifiedPeer(peerB), addresses: verifiedPeer().addresses }] }, /ambiguous identity ownership/);
await rejectPeerCase("connected-and-cached-identities-disjoint", projectPeers([connectedPeer()], [verifiedPeer(peerB)]), /matching verified record/);
const ids = Array.from({ length: 4097 }, (_, i) => (i + 1).toString(16).padStart(32, "0"));
await rejectPeerCase("connected-record-ceiling", projectPeers(ids.map(connectedPeer), [verifiedPeer(ids[0])]), /record count/);
await rejectPeerCase("verified-record-ceiling", projectPeers([connectedPeer(ids[0])], ids.slice(0, 129).map(verifiedPeer)), /record count/);
await rejectPeerCase("second-sample-malformed-record", peerPatch("connected", { outbound: "true" }), /outbound must be a boolean/, 1);
await rejectPeerCase("third-sample-loses-verified-intersection", projectPeers([connectedPeer()], [verifiedPeer(peerB)]), /matching verified record/, 2);
await acceptPeerCase("current-producer-projection", peerFixture,
  { connected_peer_count: 1, verified_peer_count: 1, verified_connected_peer_count: 1 });
await acceptPeerCase("inbound-peer-with-empty-listens", projectPeers([{ ...connectedPeer(), outbound: false, listens: [] }]),
  { connected_peer_count: 1, verified_peer_count: 1, verified_connected_peer_count: 1 });
await acceptPeerCase("relay-transport-label", projectPeers([{ ...connectedPeer(), addr: `relay:${peerB}:stream-1` }]),
  { connected_peer_count: 1, verified_peer_count: 1, verified_connected_peer_count: 1 });
await acceptPeerCase("partial-identity-intersection", projectPeers(ids.slice(0, 3).map(connectedPeer), ids.slice(1, 4).map(verifiedPeer)),
  { connected_peer_count: 3, verified_peer_count: 3, verified_connected_peer_count: 2 });
await acceptPeerCase("exact-record-count-ceilings", projectPeers(ids.slice(0, 4096).map(connectedPeer), ids.slice(0, 128).map(verifiedPeer)),
  { connected_peer_count: 4096, verified_peer_count: 128, verified_connected_peer_count: 128 });
await acceptPeerCase("exact-address-count-ceilings", projectPeers([{ ...connectedPeer(), listens: Array.from({ length: 32 }, (_, i) => `peer${i}.example:4700`) }],
  [{ ...verifiedPeer(), addresses: Array.from({ length: 8 }, (_, i) => `peer${i}.example:4700`) }]),
  { connected_peer_count: 1, verified_peer_count: 1, verified_connected_peer_count: 1 });
await acceptPeerCase("producer-excludes-unidentified-connection", projectPeers([connectedPeer(), connectedPeer("?-pending")]),
  { connected_peer_count: 1, verified_peer_count: 1, verified_connected_peer_count: 1 });
assert.equal(new Set(peerCases.map(row => row.id)).size, peerCases.length);
assert.equal(peerCases.length, 121);
console.log(canonicalJson({ marker: "VOID_NIMO_PEER_SCHEMA_CLI_PROOF_V1", node: process.version,
  predecessor_malformed_peer_false_green_reproduced: true, producer_projection_executed: true,
  producer_sources: peerSourceIdentities, case_count: peerCases.length, cases: peerCases,
  real_network_requests: 0, node_started: false, runtime_session_bound: false, public_onboarding_accepted: false }));

// Bind the fixed endpoint profile to the committed ordinary startup default.
// This inspects shell source only; it does not execute startup or load .env.
const startupPath = "run-void-node.sh";
const startupBytes = fs.readFileSync(startupPath);
const startupHead = spawnSync("/usr/bin/git", ["--no-replace-objects", "show", `HEAD:${startupPath}`],
  { timeout: 10_000, maxBuffer: 2 * 1024 * 1024 });
assert.equal(startupHead.status, 0);
assert(startupBytes.equals(startupHead.stdout), "startup source differs from HEAD");
assert.equal(startupBytes.toString("utf8").split('export HTTP_PORT="${HTTP_PORT:-4100}"').length - 1, 1,
  "canonical HTTP default changed; reassess the fixed endpoint profile");
assert.equal(workflowText.split(`'${startupPath}'`).length - 1, 2);
const startupIdentity = { path: startupPath, sha256: sha256Hex(startupBytes),
  git_blob: crypto.createHash("sha1").update(Buffer.from(`blob ${startupBytes.length}\0`)).update(startupBytes).digest("hex") };
const originPredecessor = spawnSync("/usr/bin/git", ["--no-replace-objects", "show",
  "5271688c084e2f35c0648c75d5962c00a5c06b7f:tools/void-nimo-no-tailnet-acceptance-v1.mjs"],
  { encoding: "utf8", timeout: 10_000, maxBuffer: 64 * 1024 });
assert.equal(originPredecessor.status, 0);
assert.equal(sha256Hex(originPredecessor.stdout), "af2dc30eadf98079aea6d529672f23c2ae562e9e9317f9dbe10d49583c54e4f8");
const remoteOrigin = "https://foreign-responder.example";
const historicalOrigin = await runCli(originPredecessor.stdout, {
  environment: { VOID_NIMO_LOCAL_HTTP_BASE: remoteOrigin }, expectedOrigin: remoteOrigin,
});
assert.equal(historicalOrigin.exitCode, 0);
assert(historicalOrigin.output.includes(GREEN), "remote-responder false green not reproduced");
assert.equal(historicalOrigin.requestCount, 12);
boundedHttp(historicalOrigin);

const originCases = [];
async function rejectOrigin(id, environment, proxy = false, mode = "--post-sync") {
  const r = await runCli(toolText, { environment, mode });
  assert.equal(r.exitCode, 2, id);
  assert.deepEqual(r.output, [], id);
  assert.deepEqual(r.errors, ["VOID_NIMO_NO_TAILNET_ACCEPTANCE_V1_HOLD: " + (proxy ?
    "local HTTP observations require HTTP proxy environment keys to be absent" :
    "VOID_NIMO_LOCAL_HTTP_BASE must be exactly http://127.0.0.1:4100 or absent")], id);
  assert.equal(r.requestCount, 0, id); assert.equal(r.resolverCalls, 0, id);
  assert.equal(r.opened, 0, id); assert.equal(r.trace.length, 0, id);
  assert.equal(r.allocations.length, 0, id); assert.equal(r.httpTimers.length, 0, id);
  originCases.push({ id, observed: "HOLD", http_requests: 0, resolver_calls: 0, child_processes: 0 });
}
for (const [id, value] of [
  ["foreign-perfect-responder", remoteOrigin], ["remote-http", "http://foreign-responder.example"],
  ["lan", "http://192.168.1.50:4100"], ["tailnet", "http://100.64.0.1:4100"],
  ["localhost-dns", "http://localhost:4100"], ["host-suffix", "http://127.0.0.1.example:4100"],
  ["ipv6-loopback", "http://[::1]:4100"], ["mapped-ipv4", "http://[::ffff:127.0.0.1]:4100"],
  ["short-ipv4", "http://127.1:4100"], ["integer-ipv4", "http://2130706433:4100"],
  ["hex-ipv4", "http://0x7f000001:4100"], ["octal-ipv4", "http://0177.0.0.1:4100"],
  ["other-loopback", "http://127.0.0.2:4100"], ["wildcard", "http://0.0.0.0:4100"],
  ["custom-port", "http://127.0.0.1:4101"], ["missing-port", "http://127.0.0.1"],
  ["padded-port", "http://127.0.0.1:04100"], ["https-loopback", "https://127.0.0.1:4100"],
  ["trailing-slash", "http://127.0.0.1:4100/"], ["path", "http://127.0.0.1:4100/health"],
  ["dot-path", "http://127.0.0.1:4100/a/.."], ["query", "http://127.0.0.1:4100?x=1"],
  ["fragment", "http://127.0.0.1:4100#x"], ["userinfo", "http://fixture-user@127.0.0.1:4100"],
  ["userinfo-host-trick", "http://127.0.0.1:4100@foreign-responder.example"],
  ["encoded-host", "http://%31%32%37.0.0.1:4100"], ["uppercase-scheme", "HTTP://127.0.0.1:4100"],
  ["leading-space", " http://127.0.0.1:4100"], ["trailing-space", "http://127.0.0.1:4100 "],
  ["trailing-newline", "http://127.0.0.1:4100\n"], ["empty-override", ""],
]) await rejectOrigin(id, { VOID_NIMO_LOCAL_HTTP_BASE: value });
for (const key of ["HTTP_PROXY", "HTTPS_PROXY", "ALL_PROXY", "http_proxy", "https_proxy", "all_proxy"]) {
  await rejectOrigin(`proxy-empty-${key}`, { [key]: "" }, true);
  const environment = { NO_PROXY: "*", no_proxy: "127.0.0.1" };
  Object.defineProperty(environment, key, { enumerable: true,
    get() { throw new Error("proxy value must never be read"); } });
  await rejectOrigin(`proxy-presence-without-value-read-${key}`, environment, true);
}
await rejectOrigin("preflight-foreign-responder", { VOID_NIMO_LOCAL_HTTP_BASE: remoteOrigin }, false, "--preflight");
await rejectOrigin("preflight-proxy-present", { HTTPS_PROXY: "" }, true, "--preflight");
for (const [id, environment, mode] of [
  ["absent-override", {}, "--post-sync"],
  ["exact-canonical-override", { VOID_NIMO_LOCAL_HTTP_BASE: "http://127.0.0.1:4100" }, "--post-sync"],
  ["no-proxy-bypass-list-alone", { NO_PROXY: "*", no_proxy: "127.0.0.1" }, "--post-sync"],
  ["preflight-canonical-origin", {}, "--preflight"],
]) {
  const r = await runCli(toolText, { environment, mode });
  assert.equal(r.exitCode, 0, `${id}: ${r.errors.join("\n")}`);
  assert(r.output.includes("local_http_base=http://127.0.0.1:4100"));
  assert(r.output.includes("local_http_process_bound=false"));
  const preflightOnly = mode === "--preflight";
  assert(r.output.includes(preflightOnly ? "VOID_NIMO_NO_TAILNET_PREFLIGHT_V1_GREEN" : GREEN));
  assert.equal(r.requestCount, preflightOnly ? 0 : 12);
  assert.equal(r.resolverCalls, preflightOnly ? 1 : 2);
  if (!preflightOnly) {
    for (const key of ["runtime_session_bound", "fresh_join_proven", "public_onboarding_accepted"])
      assert(r.output.includes(`${key}=false`));
    boundedHttp(r);
  }
  originCases.push({ id, observed: preflightOnly ? "PREFLIGHT_ONLY" : "TARGET_OBSERVATIONS_ONLY",
    http_requests: r.requestCount, resolver_calls: r.resolverCalls });
}
assert.equal(originCases.length, 49);
assert.equal(new Set(originCases.map(row => row.id)).size, originCases.length);
console.log(canonicalJson({ marker: "VOID_NIMO_LOCAL_HTTP_ORIGIN_CLI_PROOF_V1", node: process.version,
  predecessor_remote_responder_false_green_reproduced: true, predecessor_http_requests: 12,
  canonical_http_base: "http://127.0.0.1:4100", startup_source: startupIdentity,
  case_count: originCases.length, cases: originCases, proxy_values_read: 0,
  real_network_requests: 0, node_started: false, local_http_process_bound: false,
  runtime_session_bound: false, public_onboarding_accepted: false }));

// These are known address-input seams, not a claim to have captured the running
// node's effective configuration or all of its discovery paths.
const manualConsumers = {
  "src/index.ts": ["BOOTSTRAP_ADDRS", "BOOTSTRAP", "VOID_MAIN_BASE", "VOID_DRIFT_PEER",
    "VOID_SITE_BUNDLE_PEERS", "VOID_DATANET_SITE_BUNDLE_PEERS", "VOID_DATANET_PEERS"],
  "src/node_core.ts": ["BOOTSTRAP_ADDRS", "VOID_FOLLOWER_LEGACY_V2FS_ORIGINS"],
  "src/http/follower_routes.ts": ["VOID_FOLLOWER_AUTOSTART_PEERS", "VOID_FOLLOWER_AUTOSTART_PEER"],
  "scripts/run_void_public_bootstrap_supervisor_v1.mjs": ["VOID_PUBLIC_SEED_CLIENT_PEERS"],
  "scripts/run_void_tor_public_bootstrap_supervisor_v1.mjs": ["VOID_TOR_PUBLIC_SEED_CLIENT_PEERS"],
  "scripts/run_void_multipath_public_bootstrap_supervisor_v1.mjs": ["VOID_PUBLIC_SEED_CLIENT_PEERS", "VOID_TOR_PUBLIC_SEED_CLIENT_PEERS"],
  "run-void-node.sh": ["VOID_PUBLIC_SEED_CLIENT_PEERS", "VOID_TOR_PUBLIC_SEED_CLIENT_PEERS"],
};
const manualKeys = [...new Set(Object.values(manualConsumers).flat())].sort();
assert.equal(manualKeys.length, 12);
const consumerTexts = new Map();
const manualSourceIdentities = Object.entries(manualConsumers).map(([path, keys]) => {
  assert(fs.statSync(path).size <= 8 * 1024 * 1024, `consumer source too large: ${path}`);
  const bytes = fs.readFileSync(path);
  const raw = spawnSync("/usr/bin/git", ["--no-replace-objects", "show", `HEAD:${path}`],
    { timeout: 10_000, maxBuffer: 8 * 1024 * 1024 });
  assert.equal(raw.status, 0, `consumer source unavailable: ${path}`);
  assert(bytes.equals(raw.stdout), `consumer source differs from HEAD: ${path}`);
  const text = bytes.toString("utf8"); consumerTexts.set(path, text);
  for (const key of keys) assert(text.includes(key), `reviewed input disappeared: ${path} ${key}`);
  assert.equal(workflowText.split(`'${path}'`).length - 1, 2, `consumer source must trigger PR and main: ${path}`);
  return { path, sha256: sha256Hex(bytes), git_blob: crypto.createHash("sha1")
    .update(Buffer.from(`blob ${bytes.length}\0`)).update(bytes).digest("hex") };
});
const followerText = consumerTexts.get("src/http/follower_routes.ts");
const followerOriginSource = followerText.slice(followerText.indexOf("function publicFollowerOrigins()"),
  followerText.indexOf("export function registerFollowerRoutes"))
  .replace("function publicFollowerOrigins(): string[]", "function publicFollowerOrigins()")
  .replace("const origins: string[]", "const origins")
  .replace("catch (error: any)", "catch (error)");
// Execute only the real origin-selection function after erasing its three type
// annotations. No route registration, node, timers or follower pulls execute.
for (const key of ["VOID_FOLLOWER_AUTOSTART_PEERS", "VOID_FOLLOWER_AUTOSTART_PEER"]) {
  const origins = vm.runInNewContext(`${followerOriginSource}; publicFollowerOrigins()`, {
    process: { env: { [key]: "http://192.168.1.10:4100" } }, console: { error() { assert.fail("valid fixture rejected"); } }, URL,
  }, { timeout: 1000, contextCodeGeneration: { strings: false, wasm: false } });
  assert.deepEqual(Array.from(origins), ["http://192.168.1.10:4100"]);
}
assert(consumerTexts.get("src/index.ts").includes('firstEnv("BOOTSTRAP_ADDRS", "BOOTSTRAP")'));

const manualPredecessor = spawnSync("/usr/bin/git", ["--no-replace-objects", "show",
  "153ca9a16d4b87ee772dd9dee401152fee192f46:tools/void-nimo-no-tailnet-acceptance-v1.mjs"],
  { encoding: "utf8", timeout: 10_000, maxBuffer: 64 * 1024 });
assert.equal(manualPredecessor.status, 0);
assert.equal(sha256Hex(manualPredecessor.stdout), "546e2ec34498cf9973c3968b888530cff9806962e9d1265c3021b918e5a57791");
const manualFalsifiers = [
  ["rfc1918-bootstrap", { BOOTSTRAP_ADDRS: "192.168.1.10:4700" }],
  ["public-bootstrap", { BOOTSTRAP_ADDRS: "operator.example:4700" }],
  ["legacy-bootstrap-alias", { BOOTSTRAP: "operator.example:4700" }],
  ["public-follower", { VOID_FOLLOWER_AUTOSTART_PEERS: "https://operator.example" }],
  ["singular-follower-alias", { VOID_FOLLOWER_AUTOSTART_PEER: "https://operator.example" }],
];
const historicalManual = [];
for (const [id, environment] of manualFalsifiers) for (const mode of ["--preflight", "--post-sync"]) {
  const r = await runCli(manualPredecessor.stdout, { environment: { ...environment }, mode });
  assert.equal(r.exitCode, 0, id);
  assert(r.output.includes(mode === "--preflight" ? "VOID_NIMO_NO_TAILNET_PREFLIGHT_V1_GREEN" : GREEN));
  historicalManual.push({ id, mode, observed: "MANUAL_OVERRIDE_FALSE_GREEN" });
}

const manualCases = [];
async function rejectManual(id, options, key, expected = { requestCount: 0, resolverCalls: 0, opened: 0 }) {
  const r = await runCli(toolText, options);
  assert.equal(r.exitCode, 2, id); assert.deepEqual(r.output, [], id);
  assert.deepEqual(r.errors, [`VOID_NIMO_NO_TAILNET_ACCEPTANCE_V1_HOLD: ${key} manual bootstrap override must be absent`], id);
  for (const [field, value] of Object.entries(expected)) assert.equal(r[field], value, `${id}: ${field}`);
  if (r.resolverCalls === 0) assert.equal(r.trace.length, 0, id);
  boundedHttp(r);
  manualCases.push({ id, observed: "HOLD", http_requests: r.requestCount, resolver_calls: r.resolverCalls });
}
for (const [id, environment] of manualFalsifiers) for (const mode of ["--preflight", "--post-sync"]) {
  await rejectManual(`${id}-${mode.slice(2)}`, { environment: { ...environment }, mode }, Object.keys(environment)[0]);
}
for (const key of manualKeys) {
  for (const [label, value] of [["empty", ""], ["whitespace", " \t\n"], ["private-address", "http://192.168.1.10:4100"],
    ["public-address", "https://operator.example"], ["tailnet-address", "http://100.64.0.1:4100"]]) {
    await rejectManual(`${key}-${label}`, { environment: { [key]: value } }, key);
  }
  const environment = {};
  Object.defineProperty(environment, key, { enumerable: true, get() { throw new Error("manual address value must not be read"); } });
  assert.throws(() => assertNoManualBootstrapOverridesV1(environment), /manual bootstrap override must be absent/);
  await rejectManual(`${key}-presence-without-value-read`, { environment }, key);
}
await rejectManual("adapter-flag-cannot-authorize-caller-follower", { environment: {
  VOID_PUBLIC_BOOTSTRAP_CLIENT_ADAPTER_ACTIVE: "1", VOID_FOLLOWER_AUTOSTART_PEERS: "http://127.0.0.1:4500",
} }, "VOID_FOLLOWER_AUTOSTART_PEERS");
for (const request of [1, 4, 8, 12]) {
  await rejectManual(`override-appears-after-request-${request}`, { environment: {}, injectEnvironmentAtRequest: request,
    injectEnvironment: { BOOTSTRAP: "operator.example:4700" } }, "BOOTSTRAP", { requestCount: request, resolverCalls: 1 });
}
for (const [id, mode, resolver, requests] of [["preflight-terminal", "--preflight", 1, 0],
  ["first-resolver", "--post-sync", 1, 0], ["final-resolver", "--post-sync", 2, 12]]) {
  await rejectManual(`override-appears-at-${id}`, { environment: {}, mode, injectEnvironmentAtResolver: resolver,
    injectEnvironment: { VOID_FOLLOWER_AUTOSTART_PEER: "https://operator.example" } },
  "VOID_FOLLOWER_AUTOSTART_PEER", { requestCount: requests, resolverCalls: resolver });
}
for (const mode of ["--preflight", "--post-sync"]) {
  const environment = { VOID_PUBLIC_BOOTSTRAP_REQUIRE: "1" };
  const before = { ...environment };
  const r = await runCli(toolText, { environment, mode });
  assert.equal(r.exitCode, 0); assert.deepEqual(environment, before, "checker mutated its environment");
  assert(r.output.includes(mode === "--preflight" ? "VOID_NIMO_NO_TAILNET_PREFLIGHT_V1_GREEN" : GREEN));
  if (mode === "--post-sync") {
    assert(r.output.includes("runtime_session_bound=false"));
    assert(r.output.includes("public_onboarding_accepted=false"));
    boundedHttp(r);
  }
  manualCases.push({ id: `canonical-require-flag-${mode.slice(2)}`, observed: mode === "--preflight" ? "PREFLIGHT_ONLY" : "TARGET_OBSERVATIONS_ONLY" });
}
assert.equal(manualCases.length, 92);
assert.equal(new Set(manualCases.map(row => row.id)).size, manualCases.length);
console.log(canonicalJson({ marker: "VOID_NIMO_MANUAL_BOOTSTRAP_CLI_PROOF_V1", node: process.version,
  predecessor_false_greens: historicalManual, consumer_sources: manualSourceIdentities,
  follower_origin_selector_executed: true, checked_keys: manualKeys, case_count: manualCases.length, cases: manualCases,
  override_values_read: 0, real_network_requests: 0, node_started: false,
  runtime_configuration_bound: false, runtime_session_bound: false, public_onboarding_accepted: false }));

console.log("VOID_NIMO_NO_TAILNET_ACCEPTANCE_V1_PROOF_GREEN");
console.log("tailscale_required=false");
console.log("private_100x_bootstrap_accepted=false");
console.log("stable_public_https_seed_required=true");
console.log("ready_gap_zero_required=true");
console.log("txroot_live_required=true");
console.log("verified_p2p_peer_required=true");
console.log("runtime_mutation_authority=false");
console.log("wallet_signer_validator_wc_money_authority=0");
