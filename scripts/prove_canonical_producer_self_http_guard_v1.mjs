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
  "VOID_CANONICAL_SELF_HTTP_TEARDOWN_TIMEOUT_MS",
  "/__void/metrics/proposer.commit-direct.v2fs/commit",
  "/proposer/auto/start",
  "/blocks/empty-policy/set",
  "/tx/merge/cap/set",
  "/tx/dev/burst",
  "wrapResponseBodyLifetime",
  "body_complete",
  "caller_abort",
  "teardownDeadlineHits",
  "teardownErrors",
  'url.search === "?empty=1"',
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
    VOID_CANONICAL_SELF_HTTP_TEARDOWN_TIMEOUT_MS: "200",
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

const preHeaderTeardown = fixture(
  "pre-header abort retains slot until fetch teardown settles",
  String.raw`
    let calls = 0;
    global.fetch = (input, init = {}) => {
      calls++;
      return new Promise((resolve, reject) => {
        void resolve;
        init.signal?.addEventListener("abort", () => {
          setTimeout(() => reject(init.signal.reason || new Error("aborted")), 80);
        }, {once:true});
      });
    };
    require(process.env.MODULE_PATH);
    (async () => {
      const first = fetch("http://127.0.0.1:4100/head.txt").catch(e => e);
      await new Promise(r => setTimeout(r, 70));
      const inflightDuringTeardown = global.__voidCanonicalSelfHttpGuardV1.inflight;
      let limitedDuringTeardown = false;
      try { await fetch("http://127.0.0.1:4100/blocks/latest/number2.json"); } catch (e) { limitedDuringTeardown = String(e).includes("_LIMIT"); }
      const firstError = await first;
      await new Promise(r => setImmediate(r));
      console.log(JSON.stringify({calls, inflightDuringTeardown, limitedDuringTeardown, firstTimedOut:String(firstError).includes("_TIMEOUT"), state:global.__voidCanonicalSelfHttpGuardV1}));
    })().catch(e => { console.error(e); process.exit(1); });
  `,
  {
    ...canonicalEnv,
    VOID_CANONICAL_SELF_HTTP_MAX_INFLIGHT: "1",
    VOID_CANONICAL_SELF_HTTP_TIMEOUT_MS: "50",
    VOID_CANONICAL_SELF_HTTP_TEARDOWN_TIMEOUT_MS: "200",
  },
);
if (
  preHeaderTeardown.calls !== 1 ||
  preHeaderTeardown.inflightDuringTeardown !== 1 ||
  preHeaderTeardown.limitedDuringTeardown !== true ||
  preHeaderTeardown.firstTimedOut !== true ||
  preHeaderTeardown.state.inflight !== 0 ||
  preHeaderTeardown.state.cleanups !== 1 ||
  preHeaderTeardown.state.teardownDeadlineHits !== 0
) {
  throw new Error("pre-header abort released the diagnostic slot before fetch teardown settled");
}

const bodyCancelTeardown = fixture(
  "body abort retains slot until asynchronous cancellation settles",
  String.raw`
    let calls = 0;
    let releaseCancel;
    global.fetch = () => {
      calls++;
      return Promise.resolve(new Response(new ReadableStream({
        cancel() { return new Promise(resolve => { releaseCancel = resolve; }); }
      })));
    };
    require(process.env.MODULE_PATH);
    (async () => {
      await fetch("http://127.0.0.1:4100/head.txt");
      await new Promise(r => setTimeout(r, 70));
      const inflightDuringCancel = global.__voidCanonicalSelfHttpGuardV1.inflight;
      let limitedDuringCancel = false;
      try { await fetch("http://127.0.0.1:4100/blocks/latest/number2.json"); } catch (e) { limitedDuringCancel = String(e).includes("_LIMIT"); }
      releaseCancel();
      await new Promise(r => setImmediate(r));
      console.log(JSON.stringify({calls, inflightDuringCancel, limitedDuringCancel, state:global.__voidCanonicalSelfHttpGuardV1}));
    })().catch(e => { console.error(e); process.exit(1); });
  `,
  {
    ...canonicalEnv,
    VOID_CANONICAL_SELF_HTTP_MAX_INFLIGHT: "1",
    VOID_CANONICAL_SELF_HTTP_TIMEOUT_MS: "50",
    VOID_CANONICAL_SELF_HTTP_TEARDOWN_TIMEOUT_MS: "200",
  },
);
if (
  bodyCancelTeardown.calls !== 1 ||
  bodyCancelTeardown.inflightDuringCancel !== 1 ||
  bodyCancelTeardown.limitedDuringCancel !== true ||
  bodyCancelTeardown.state.inflight !== 0 ||
  bodyCancelTeardown.state.cleanups !== 1 ||
  bodyCancelTeardown.state.teardownDeadlineHits !== 0
) {
  throw new Error("asynchronous response cancellation released the diagnostic slot early");
}

const callerAbortTeardown = fixture(
  "caller abort retains slot until body cancellation settles",
  String.raw`
    let releaseCancel;
    global.fetch = () => Promise.resolve(new Response(new ReadableStream({
      cancel() { return new Promise(resolve => { releaseCancel = resolve; }); }
    })));
    require(process.env.MODULE_PATH);
    (async () => {
      const caller = new AbortController();
      await fetch("http://127.0.0.1:4100/head.txt", {signal:caller.signal});
      caller.abort(new Error("caller-stop"));
      await new Promise(r => setImmediate(r));
      const inflightDuringCancel = global.__voidCanonicalSelfHttpGuardV1.inflight;
      let limitedDuringCancel = false;
      try { await fetch("http://127.0.0.1:4100/blocks/latest/number2.json"); } catch (e) { limitedDuringCancel = String(e).includes("_LIMIT"); }
      releaseCancel();
      await new Promise(r => setImmediate(r));
      console.log(JSON.stringify({inflightDuringCancel, limitedDuringCancel, state:global.__voidCanonicalSelfHttpGuardV1}));
    })().catch(e => { console.error(e); process.exit(1); });
  `,
  {
    ...canonicalEnv,
    VOID_CANONICAL_SELF_HTTP_MAX_INFLIGHT: "1",
    VOID_CANONICAL_SELF_HTTP_TIMEOUT_MS: "1000",
    VOID_CANONICAL_SELF_HTTP_TEARDOWN_TIMEOUT_MS: "200",
  },
);
if (
  callerAbortTeardown.inflightDuringCancel !== 1 ||
  callerAbortTeardown.limitedDuringCancel !== true ||
  callerAbortTeardown.state.inflight !== 0 ||
  callerAbortTeardown.state.cleanups !== 1 ||
  callerAbortTeardown.state.lastCleanupReason !== "caller_abort"
) {
  throw new Error("caller abort released the diagnostic slot before body cancellation settled");
}

const teardownDeadline = fixture(
  "hung response cancellation reaches bounded teardown deadline",
  String.raw`
    global.fetch = () => Promise.resolve(new Response(new ReadableStream({
      cancel() { return new Promise(() => {}); }
    })));
    require(process.env.MODULE_PATH);
    (async () => {
      await fetch("http://127.0.0.1:4100/head.txt");
      await new Promise(r => setTimeout(r, 70));
      const inflightBeforeDeadline = global.__voidCanonicalSelfHttpGuardV1.inflight;
      await new Promise(r => setTimeout(r, 100));
      console.log(JSON.stringify({inflightBeforeDeadline, state:global.__voidCanonicalSelfHttpGuardV1}));
    })().catch(e => { console.error(e); process.exit(1); });
  `,
  {
    ...canonicalEnv,
    VOID_CANONICAL_SELF_HTTP_MAX_INFLIGHT: "1",
    VOID_CANONICAL_SELF_HTTP_TIMEOUT_MS: "50",
    VOID_CANONICAL_SELF_HTTP_TEARDOWN_TIMEOUT_MS: "100",
  },
);
if (
  teardownDeadline.inflightBeforeDeadline !== 1 ||
  teardownDeadline.state.inflight !== 0 ||
  teardownDeadline.state.cleanups !== 1 ||
  teardownDeadline.state.teardownDeadlineHits !== 1 ||
  teardownDeadline.state.lastCleanupReason !== "timeout_teardown_deadline"
) {
  throw new Error("hung teardown did not reach a bounded truthful terminal deadline");
}

const teardownReject = fixture(
  "response cancellation rejection is recorded without leaking slot",
  String.raw`
    global.fetch = () => Promise.resolve(new Response(new ReadableStream({
      cancel() { return Promise.reject(new Error("cancel-failure")); }
    })));
    require(process.env.MODULE_PATH);
    (async () => {
      await fetch("http://127.0.0.1:4100/head.txt");
      await new Promise(r => setTimeout(r, 80));
      console.log(JSON.stringify({state:global.__voidCanonicalSelfHttpGuardV1}));
    })().catch(e => { console.error(e); process.exit(1); });
  `,
  {
    ...canonicalEnv,
    VOID_CANONICAL_SELF_HTTP_TIMEOUT_MS: "50",
    VOID_CANONICAL_SELF_HTTP_TEARDOWN_TIMEOUT_MS: "200",
  },
);
if (
  teardownReject.state.inflight !== 0 ||
  teardownReject.state.cleanups !== 1 ||
  teardownReject.state.teardownErrors !== 1 ||
  !teardownReject.state.lastTeardownError.includes("cancel-failure")
) {
  throw new Error("teardown cancellation failure was not recorded and contained");
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

const alreadyAborted = fixture(
  "already-aborted caller cleanup exactly once",
  String.raw`
    let calls = 0;
    global.fetch = (input, init = {}) => {
      calls++;
      if (init.signal?.aborted) return Promise.reject(init.signal.reason || new Error("aborted"));
      return Promise.resolve(new Response("unexpected"));
    };
    require(process.env.MODULE_PATH);
    (async () => {
      const caller = new AbortController();
      caller.abort(new Error("already-stopped"));
      let rejected = false;
      try { await fetch("http://127.0.0.1:4100/head.txt", {signal:caller.signal}); } catch (e) { rejected = String(e).includes("already-stopped"); }
      await new Promise(r => setTimeout(r, 80));
      console.log(JSON.stringify({calls, rejected, state:global.__voidCanonicalSelfHttpGuardV1}));
    })().catch(e => { console.error(e); process.exit(1); });
  `,
  {
    ...canonicalEnv,
    VOID_CANONICAL_SELF_HTTP_TIMEOUT_MS: "50",
  },
);
if (
  alreadyAborted.calls !== 1 ||
  alreadyAborted.rejected !== true ||
  alreadyAborted.state.inflight !== 0 ||
  alreadyAborted.state.cleanups !== 1 ||
  alreadyAborted.state.timedOut !== 0 ||
  alreadyAborted.state.lastCleanupReason !== "caller_abort"
) {
  throw new Error("already-aborted caller leaked a slot or timeout");
}

const bypass = fixture(
  "exact autoprop and external bypass",
  String.raw`
    let calls = 0;
    let release;
    global.fetch = (input, init = {}) => {
      calls++;
      const u = String(input);
      if (u === "http://127.0.0.1:4100/__void/metrics/proposer.commit-direct.v2fs/commit?empty=1" && String(init.method || "GET").toUpperCase() === "POST") {
        return Promise.resolve(new Response("ok"));
      }
      if (u.startsWith("https://example.com/")) return Promise.resolve(new Response("ok"));
      return new Promise((resolve, reject) => {
        release = resolve;
        init.signal?.addEventListener("abort", () => reject(init.signal.reason || new Error("aborted")), {once:true});
      });
    };
    require(process.env.MODULE_PATH);
    (async () => {
      const diagnostic = fetch("http://127.0.0.1:4100/head.txt");
      const exact = await fetch("http://127.0.0.1:4100/__void/metrics/proposer.commit-direct.v2fs/commit?empty=1", {method:"POST"});
      const nearMisses = [
        ["http://127.0.0.1:4100/__void/metrics/proposer.commit-direct.v2fs/commit?empty=1&extra=1", {method:"POST"}],
        ["http://127.0.0.1:4100/__void/metrics/proposer.commit-direct.v2fs/commit?empty=1&empty=0", {method:"POST"}],
        ["http://127.0.0.1:4100/__void/metrics/proposer.commit-direct.v2fs/commit?empty=0", {method:"POST"}],
        ["http://127.0.0.1:4100/__void/metrics/proposer.commit-direct.v2fs/commit", {method:"POST"}],
        ["http://127.0.0.1:4100/__void/metrics/proposer.commit-direct.v2fs/commit?empty=1", {method:"GET"}],
      ];
      let limitedNearMisses = 0;
      for (const [url, init] of nearMisses) {
        try { await fetch(url, init); } catch (e) { if (String(e).includes("_LIMIT")) limitedNearMisses++; }
      }
      const external = await fetch("https://example.com/ping");
      release(new Response("ok"));
      const diagnosticResponse = await diagnostic;
      await diagnosticResponse.text();
      console.log(JSON.stringify({calls, exact:exact.status, external:external.status, limitedNearMisses, nearMissCount:nearMisses.length, state:global.__voidCanonicalSelfHttpGuardV1}));
    })().catch(e => { console.error(e); process.exit(1); });
  `,
  {
    ...canonicalEnv,
    VOID_CANONICAL_SELF_HTTP_MAX_INFLIGHT: "1",
    VOID_CANONICAL_SELF_HTTP_TIMEOUT_MS: "1000",
  },
);
if (bypass.calls !== 3 || bypass.exact !== 200 || bypass.external !== 200) {
  throw new Error("exact autoprop or external fetch was throttled by diagnostic containment");
}
if (bypass.limitedNearMisses !== bypass.nearMissCount || bypass.nearMissCount !== 5) {
  throw new Error("autoprop near-matches escaped ordinary diagnostic limiting");
}
if (
  bypass.state.autopropBypass !== 1 ||
  bypass.state.limited !== 5 ||
  bypass.state.externalPassThrough !== 1 ||
  bypass.state.inflight !== 0
) {
  throw new Error("exact autoprop bypass accounting or diagnostic cleanup is not exact");
}

console.log(
  `${MARKER}_GREEN`,
  JSON.stringify({
    canonical_only: true,
    runner_controlled_preload: true,
    exact_process_argv_preserved: true,
    self_http_max_inflight_bounded: true,
    self_http_timeout_covers_response_body: true,
    preheader_abort_teardown_slot_retained: true,
    response_cancel_teardown_slot_retained: true,
    caller_abort_teardown_slot_retained: true,
    teardown_deadline_bounded: true,
    teardown_failure_recorded: true,
    body_cleanup_exact_once: true,
    already_aborted_caller_exact_once: true,
    legacy_watchdog_interventions_suppressed: true,
    canonical_autoprop_exempt: true,
    autoprop_bypass_exact_query: true,
    autoprop_near_matches_contained: true,
    external_fetches_unaffected: true,
    noncanonical_fetches_unaffected: true,
    incident_source_bound: true,
    runtime_mutation_performed: false,
  }),
);
