#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const MARKER = "VOID_CANONICAL_PRODUCER_SELF_HTTP_GUARD_V1";
const modulePath = path.resolve("runtime/canonical-producer-self-http-guard-v1.cjs");

function read(file) {
  return fs.readFileSync(file, "utf8");
}
function need(source, token, label) {
  if (!source.includes(token)) throw new Error(`${label} missing token: ${token}`);
}
function fixture(name, body, env = {}) {
  const result = spawnSync(process.execPath, ["-e", body], {
    env: { ...process.env, MODULE_PATH: modulePath, ...env },
    encoding: "utf8",
    timeout: 5000,
  });
  if (result.status !== 0) {
    throw new Error(`${name} failed status=${result.status}: ${result.stderr || result.stdout}`);
  }
  const lines = result.stdout.trim().split(/\n/).filter(Boolean);
  try {
    return JSON.parse(lines.at(-1));
  } catch {
    throw new Error(`${name} did not emit JSON: ${result.stdout}`);
  }
}

const runtimeGuard = read("runtime/canonical-producer-self-http-guard-v1.cjs");
const runner = read("ops/run-void-node-live-v1.sh");
const producerGuard = read("ops/guard-canonical-producer-liveness-v1.sh");
const installer = read("ops/mainnet0/install-canonical-producer-liveness-v1.sh");
const runtime = read("src/index.ts");

for (const token of [
  "VOID_CANONICAL_PRODUCER_ROLE",
  "VOID_CANONICAL_SELF_HTTP_GUARD",
  "VOID_CANONICAL_SELF_HTTP_MAX_INFLIGHT",
  "VOID_CANONICAL_SELF_HTTP_TIMEOUT_MS",
  "/__void/metrics/proposer.commit-direct.v2fs/commit",
  "/proposer/auto/start",
  "/blocks/empty-policy/set",
  "/tx/merge/cap/set",
  "/tx/dev/burst",
  "wrapResponseBodyLifetime",
  "body_complete",
  "caller_abort",
]) need(runtimeGuard, token, "runtime self-http guard");

for (const token of [
  'test "${VOID_CANONICAL_SELF_HTTP_GUARD:-0}" = "1"',
  'test -z "${NODE_OPTIONS:-}"',
  '--require "$ROOT/runtime/canonical-producer-self-http-guard-v1.cjs"',
  'export NODE_OPTIONS="${canonical_self_http_preload[*]}"',
]) need(runner, token, "live runner");
need(producerGuard, "require_eq VOID_CANONICAL_SELF_HTTP_GUARD 1", "producer prestart guard");
for (const token of [
  "Environment=VOID_CANONICAL_SELF_HTTP_GUARD=1",
  "Environment=VOID_CANONICAL_SELF_HTTP_MAX_INFLIGHT=8",
  "Environment=VOID_CANONICAL_SELF_HTTP_TIMEOUT_MS=1500",
]) need(installer, token, "canonical producer installer");

for (const token of [
  "(function Header3MatchExporter(){",
  "async function fetchSetter(){",
  "(function proposerActivityGauge(){",
  "/proposer/auto/start?ms=2000",
  "/__void/metrics/proposer.commit-direct.v2fs/commit?empty=1",
]) need(runtime, token, "runtime incident source");

const canonicalEnv = {
  VOID_CANONICAL_PRODUCER_ROLE: "1",
  VOID_CANONICAL_SELF_HTTP_GUARD: "1",
};

const noncanonical = fixture(
  "noncanonical pass-through",
  String.raw`
    let calls = 0;
    global.fetch = async () => { calls++; return new Response("ok"); };
    require(process.env.MODULE_PATH);
    (async () => {
      const r = await fetch("http://127.0.0.1:4100/head.txt");
      console.log(JSON.stringify({calls, status:r.status, state:global.__voidCanonicalSelfHttpGuardV1}));
    })().catch(e => { console.error(e); process.exit(1); });
  `,
  { VOID_CANONICAL_PRODUCER_ROLE: "0", VOID_CANONICAL_SELF_HTTP_GUARD: "1" },
);
if (noncanonical.calls !== 1 || noncanonical.state.enabled !== false) {
  throw new Error("noncanonical runtime did not remain pass-through");
}

const interventions = fixture(
  "legacy intervention suppression",
  String.raw`
    let calls = 0;
    global.fetch = async () => { calls++; return new Response("original"); };
    require(process.env.MODULE_PATH);
    (async () => {
      const paths = ["/proposer/auto/start?ms=2000", "/blocks/empty-policy/set?enabled=true&fill=true", "/tx/merge/cap/set?enabled=true&max=2", "/tx/dev/burst?n=1"];
      const statuses = [];
      for (const p of paths) statuses.push((await fetch("http://127.0.0.1:4100" + p, {method:"POST"})).status);
      const getResponse = await fetch("http://127.0.0.1:4100/proposer/auto/start?ms=2000");
      const getStatus = getResponse.status;
      await getResponse.text();
      console.log(JSON.stringify({calls, statuses, getStatus, state:global.__voidCanonicalSelfHttpGuardV1}));
    })().catch(e => { console.error(e); process.exit(1); });
  `,
  canonicalEnv,
);
if (interventions.calls !== 1 || interventions.statuses.some((s) => s !== 204)) {
  throw new Error("legacy self-POST interventions were not suppressed without socket fetches");
}
if (interventions.state.suppressedInterventions !== 4 || interventions.state.inflight !== 0) {
  throw new Error("suppressed intervention accounting or GET cleanup is not exact");
}

const cap = fixture(
  "pre-header self-http concurrency cap",
  String.raw`
    const pending = [];
    let calls = 0;
    global.fetch = (input, init = {}) => {
      calls++;
      return new Promise((resolve, reject) => {
        pending.push(resolve);
        init.signal?.addEventListener("abort", () => reject(init.signal.reason || new Error("aborted")), {once:true});
      });
    };
    require(process.env.MODULE_PATH);
    (async () => {
      const p1 = fetch("http://127.0.0.1:4100/head.txt");
      const p2 = fetch("http://localhost:4100/blocks/latest/number2.json");
      let limited = false;
      try { await fetch("http://127.0.0.1:4100/__void/metrics/txroot4/setter.prom"); } catch (e) { limited = String(e).includes("_LIMIT"); }
      pending.splice(0).forEach(r => r(new Response("ok")));
      const responses = await Promise.all([p1, p2]);
      await Promise.all(responses.map(r => r.text()));
      console.log(JSON.stringify({calls, limited, state:global.__voidCanonicalSelfHttpGuardV1}));
    })().catch(e => { console.error(e); process.exit(1); });
  `,
  {
    ...canonicalEnv,
    VOID_CANONICAL_SELF_HTTP_MAX_INFLIGHT: "2",
    VOID_CANONICAL_SELF_HTTP_TIMEOUT_MS: "1000",
  },
);
if (cap.calls !== 2 || cap.limited !== true || cap.state.limited !== 1 || cap.state.inflight !== 0 || cap.state.cleanups !== 2) {
  throw new Error("canonical pre-header self-http concurrency cap did not fail closed");
}

const bodyTimeout = fixture(
  "headers-resolved stalled-body timeout",
  String.raw`
    let calls = 0;
    global.fetch = (input, init = {}) => {
      calls++;
      const body = new ReadableStream({
        start(controller) {
          init.signal?.addEventListener("abort", () => controller.error(init.signal.reason || new Error("aborted")), {once:true});
        }
      });
      return Promise.resolve(new Response(body, {status:200}));
    };
    require(process.env.MODULE_PATH);
    (async () => {
      const first = await fetch("http://127.0.0.1:4100/head.txt");
      const inflightAtHeaders = global.__voidCanonicalSelfHttpGuardV1.inflight;
      let limitedWhileBodyLive = false;
      try { await fetch("http://127.0.0.1:4100/blocks/latest/number2.json"); } catch (e) { limitedWhileBodyLive = String(e).includes("_LIMIT"); }
      let bodyTimedOut = false;
      try { await first.text(); } catch (e) { bodyTimedOut = String(e).includes("_TIMEOUT"); }
      await new Promise(r => setImmediate(r));
      console.log(JSON.stringify({calls, inflightAtHeaders, limitedWhileBodyLive, bodyTimedOut, state:global.__voidCanonicalSelfHttpGuardV1}));
    })().catch(e => { console.error(e); process.exit(1); });
  `,
  {
    ...canonicalEnv,
    VOID_CANONICAL_SELF_HTTP_MAX_INFLIGHT: "1",
    VOID_CANONICAL_SELF_HTTP_TIMEOUT_MS: "50",
  },
);
if (
  bodyTimeout.calls !== 1 ||
  bodyTimeout.inflightAtHeaders !== 1 ||
  bodyTimeout.limitedWhileBodyLive !== true ||
  bodyTimeout.bodyTimedOut !== true ||
  bodyTimeout.state.timedOut !== 1 ||
  bodyTimeout.state.inflight !== 0 ||
  bodyTimeout.state.cleanups !== 1 ||
  bodyTimeout.state.lastCleanupReason !== "timeout"
) {
  throw new Error("stalled response body was not bounded through its full lifetime");
}

const successCleanup = fixture(
  "successful body cleanup exactly once",
  String.raw`
    global.fetch = async () => new Response("ok");
    require(process.env.MODULE_PATH);
    (async () => {
      const response = await fetch("http://127.0.0.1:4100/head.txt");
      const text = await response.text();
      await new Promise(r => setImmediate(r));
      console.log(JSON.stringify({text, state:global.__voidCanonicalSelfHttpGuardV1}));
    })().catch(e => { console.error(e); process.exit(1); });
  `,
  canonicalEnv,
);
if (successCleanup.text !== "ok" || successCleanup.state.inflight !== 0 || successCleanup.state.cleanups !== 1) {
  throw new Error("successful response body cleanup was not exactly once");
}

const errorCleanup = fixture(
  "errored body cleanup exactly once",
  String.raw`
    global.fetch = async () => new Response(new ReadableStream({
      start(controller) { setImmediate(() => controller.error(new Error("body-failure"))); }
    }));
    require(process.env.MODULE_PATH);
    (async () => {
      const response = await fetch("http://127.0.0.1:4100/head.txt");
      let failed = false;
      try { await response.text(); } catch (e) { failed = String(e).includes("body-failure"); }
      await new Promise(r => setImmediate(r));
      console.log(JSON.stringify({failed, state:global.__voidCanonicalSelfHttpGuardV1}));
    })().catch(e => { console.error(e); process.exit(1); });
  `,
  canonicalEnv,
);
if (errorCleanup.failed !== true || errorCleanup.state.inflight !== 0 || errorCleanup.state.cleanups !== 1) {
  throw new Error("errored response body cleanup was not exactly once");
}

const callerAbort = fixture(
  "caller abort cleanup exactly once",
  String.raw`
    global.fetch = (input, init = {}) => Promise.resolve(new Response(new ReadableStream({
      start(controller) {
        init.signal?.addEventListener("abort", () => controller.error(init.signal.reason || new Error("aborted")), {once:true});
      }
    })));
    require(process.env.MODULE_PATH);
    (async () => {
      const caller = new AbortController();
      await fetch("http://127.0.0.1:4100/head.txt", {signal:caller.signal});
      const inflightAtHeaders = global.__voidCanonicalSelfHttpGuardV1.inflight;
      caller.abort(new Error("caller-stop"));
      await new Promise(r => setImmediate(r));
      console.log(JSON.stringify({inflightAtHeaders, state:global.__voidCanonicalSelfHttpGuardV1}));
    })().catch(e => { console.error(e); process.exit(1); });
  `,
  canonicalEnv,
);
if (
  callerAbort.inflightAtHeaders !== 1 ||
  callerAbort.state.inflight !== 0 ||
  callerAbort.state.cleanups !== 1 ||
  callerAbort.state.lastCleanupReason !== "caller_abort"
) {
  throw new Error("caller abort cleanup was not exactly once");
}

const bypass = fixture(
  "autoprop and external bypass",
  String.raw`
    let calls = 0;
    let release;
    global.fetch = (input, init = {}) => {
      calls++;
      const u = String(input);
      if (u.includes("proposer.commit-direct.v2fs/commit") || u.startsWith("https://example.com/")) return Promise.resolve(new Response("ok"));
      return new Promise((resolve, reject) => {
        release = resolve;
        init.signal?.addEventListener("abort", () => reject(init.signal.reason || new Error("aborted")), {once:true});
      });
    };
    require(process.env.MODULE_PATH);
    (async () => {
      const diagnostic = fetch("http://127.0.0.1:4100/head.txt");
      const autoprop = await fetch("http://127.0.0.1:4100/__void/metrics/proposer.commit-direct.v2fs/commit?empty=1", {method:"POST"});
      const external = await fetch("https://example.com/ping");
      release(new Response("ok"));
      const diagnosticResponse = await diagnostic;
      await diagnosticResponse.text();
      console.log(JSON.stringify({calls, autoprop:autoprop.status, external:external.status, state:global.__voidCanonicalSelfHttpGuardV1}));
    })().catch(e => { console.error(e); process.exit(1); });
  `,
  {
    ...canonicalEnv,
    VOID_CANONICAL_SELF_HTTP_MAX_INFLIGHT: "1",
    VOID_CANONICAL_SELF_HTTP_TIMEOUT_MS: "1000",
  },
);
if (bypass.calls !== 3 || bypass.autoprop !== 200 || bypass.external !== 200) {
  throw new Error("autoprop or external fetch was throttled by diagnostic containment");
}
if (bypass.state.autopropBypass !== 1 || bypass.state.externalPassThrough !== 1 || bypass.state.inflight !== 0) {
  throw new Error("bypass accounting or diagnostic cleanup is not exact");
}

console.log(
  `${MARKER}_GREEN`,
  JSON.stringify({
    canonical_only: true,
    runner_controlled_preload: true,
    exact_process_argv_preserved: true,
    self_http_max_inflight_bounded: true,
    self_http_timeout_covers_response_body: true,
    body_cleanup_exact_once: true,
    legacy_watchdog_interventions_suppressed: true,
    canonical_autoprop_exempt: true,
    external_fetches_unaffected: true,
    noncanonical_fetches_unaffected: true,
    incident_source_bound: true,
    runtime_mutation_performed: false,
  }),
);
