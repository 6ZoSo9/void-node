#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import net from "node:net";
import vm from "node:vm";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { canonicalJson, objectWithId, sha256Hex } from "./lib/void_public_seed_common_v1.mjs";

import {
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
  /BOOTSTRAP_ADDRS contains Tailnet\/Tailscale transport state/,
);
throws(
  () => assertNoTailnetMachineV1({
    environment: { VOID_MAIN_BASE: "https://node.example.ts.net" },
  }),
  /VOID_MAIN_BASE contains Tailnet\/Tailscale transport state/,
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
  validatePeersSnapshotV1({
    connected: [{ id: "peer-a" }],
    verifiedPeers: [{ node_id: "peer-a" }],
  }),
  { connected_count: 1, verified_count: 1 },
);
throws(
  () => validatePeersSnapshotV1({ connected: [], verifiedPeers: [] }),
  /no connected P2P peer/,
);
throws(
  () => validatePeersSnapshotV1({ connected: [{ id: "peer-a" }], verifiedPeers: [] }),
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


// Execute the actual CLI module. Only OS, resolver and HTTP boundaries are
// substituted; no production function is rewritten or replaced by an oracle.
async function runCli(sourceText, options = {}) {
  const output = [], errors = [], trace = [], waits = [];
  let clock = proofNow, opened = 0, resolverCalls = 0, requestCount = 0, exitCode = 0;
  const files = new Map(), timers = new Set();
  const manifest = options.manifest || stable;
  const raw = Buffer.from(JSON.stringify(manifest, null, 2) + "\n");
  const file = `${process.cwd()}/tools/void-nimo-no-tailnet-acceptance-v1.mjs`;
  const stop = new Error("hermetic CLI exit");
  class Clock extends Date { static now() { return clock; } }
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
    execPath: process.execPath, env: {}, cwd: () => process.cwd(),
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
    return result("https://seed.voidchain.org\n", lines.join("\n"), options.resolverStatus || 0);
  } };
  const fetch = async url => {
    assert.equal(new URL(url).origin, "http://127.0.0.1:4100");
    const route = new URL(url).pathname, index = Math.floor(requestCount / 4);
    requestCount += 1;
    const observed = (options.heads || [1951058, 1951058, 1951058])[index];
    let body;
    if (route === "/health") body = { ok: options.healthOk !== false };
    else if (route === "/__void/ready.json") {
      body = { ready: true, gap: 0, txroot_live: 1, reasons: [], head: observed, ...options.ready };
    } else if (route === "/blocks/latest/number2.json") body = { number: options.latestHead ?? observed };
    else if (route === "/p2p/peers") body = options.peers || { connected: [{ id: "peer" }], verifiedPeers: [{ node_id: "peer" }] };
    else throw new Error(`unexpected HTTP route ${route}`);
    return new Response(JSON.stringify(body));
  };
  const context = vm.createContext({ Buffer, URL, Date: Clock, structuredClone, AbortController, fetch,
    setTimeout(callback, delay) {
      if (delay === 1000) { clock += delay; waits.push(delay); }
      const timer = setTimeout(callback, delay === 1000 ? 0 : delay); timers.add(timer); return timer;
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
  finally { for (const timer of timers) clearTimeout(timer); }
  assert.equal(files.size, 0, "manifest descriptor leaked");
  return { output, errors, exitCode, opened, resolverCalls, requestCount, waits, trace };
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
await rejectsCli("peer-hold-preserved", { peers: { connected: [], verifiedPeers: [] } }, /no connected P2P peer/);
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

console.log("VOID_NIMO_NO_TAILNET_ACCEPTANCE_V1_PROOF_GREEN");
console.log("tailscale_required=false");
console.log("private_100x_bootstrap_accepted=false");
console.log("stable_public_https_seed_required=true");
console.log("ready_gap_zero_required=true");
console.log("txroot_live_required=true");
console.log("verified_p2p_peer_required=true");
console.log("runtime_mutation_authority=false");
console.log("wallet_signer_validator_wc_money_authority=0");
