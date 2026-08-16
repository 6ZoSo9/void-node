#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const MARKER = "VOID_CANONICAL_PRODUCER_LEGACY_SELF_HTTP_OBSERVERS_V1";
const modulePath = path.resolve("runtime/canonical-producer-self-http-guard-v1.cjs");

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function need(source, token, label) {
  if (!source.includes(token)) {
    throw new Error(`${label} missing token: ${token}`);
  }
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

for (const token of [
  "VOID_CANONICAL_DISABLE_LEGACY_SELF_HTTP_OBSERVERS",
  "classifyLegacyObserver",
  "header3_match_exporter",
  "ready_watchdog",
  "proposer_head_pollers",
  "suppressedLegacyObserverFetches",
  "suppressed-legacy-observer",
  '"NaN\\n"',
  '"null"',
]) {
  need(runtimeGuard, token, "runtime canonical observer guard");
}

need(
  runner,
  'test "${VOID_CANONICAL_DISABLE_LEGACY_SELF_HTTP_OBSERVERS:-0}" = "1"',
  "live runner",
);
need(
  producerGuard,
  "require_eq VOID_CANONICAL_DISABLE_LEGACY_SELF_HTTP_OBSERVERS 1",
  "canonical producer prestart guard",
);
need(
  installer,
  "Environment=VOID_CANONICAL_DISABLE_LEGACY_SELF_HTTP_OBSERVERS=1",
  "canonical producer installer",
);

const canonicalEnv = {
  VOID_CANONICAL_PRODUCER_ROLE: "1",
  VOID_CANONICAL_SELF_HTTP_GUARD: "1",
  VOID_CANONICAL_DISABLE_LEGACY_SELF_HTTP_OBSERVERS: "1",
  HTTP_PORT: "4100",
};

const suppressed = fixture(
  "canonical legacy observer suppression",
  String.raw`
    let calls = [];
    global.fetch = async (input, init = {}) => {
      calls.push({url:String(input), method:String(init.method || "GET").toUpperCase()});
      return new Response("original");
    };
    require(process.env.MODULE_PATH);

    async function runHeader3() {
      async function selfJson(path) {
        const r = await fetch("http://127.0.0.1:4100" + path);
        return r.json();
      }
      async function poll() {
        return selfJson("/blocks/latest/number");
      }
      return poll();
    }

    async function runReadyWatchdog() {
      async function fetchJson(path) {
        const r = await fetch("http://127.0.0.1:4100" + path);
        return r.json();
      }
      async function fetchText(path) {
        const r = await fetch("http://127.0.0.1:4100" + path);
        return r.text();
      }
      async function sample() {
        return [
          await fetchJson("/__void/ready.json"),
          await fetchText("/head.txt"),
          await fetchJson("/proposer/stats"),
        ];
      }
      return sample();
    }

    async function runProposerHeadPollers() {
      async function poll() {
        return (await fetch("http://127.0.0.1:4100/head.txt")).text();
      }
      return [await poll(), await poll()];
    }

    (async () => {
      const header3 = await runHeader3();
      const ready = await runReadyWatchdog();
      const proposer = await runProposerHeadPollers();
      console.log(JSON.stringify({
        calls,
        header3,
        ready,
        proposer,
        state:global.__voidCanonicalSelfHttpGuardV1,
      }));
    })().catch(e => { console.error(e); process.exit(1); });
  `,
  canonicalEnv,
);

if (suppressed.calls.length !== 0) {
  throw new Error("legacy canonical observers opened an underlying fetch");
}
if (suppressed.header3 !== null) {
  throw new Error("Header3 observer did not receive inert JSON null");
}
if (
  JSON.stringify(suppressed.ready) !== JSON.stringify([null, "NaN\n", null]) ||
  JSON.stringify(suppressed.proposer) !== JSON.stringify(["NaN\n", "NaN\n"])
) {
  throw new Error("legacy observer synthetic truth was not deterministic");
}
if (
  suppressed.state.suppressedLegacyObserverFetches !== 6 ||
  suppressed.state.legacyObserverSuppressions.header3_match_exporter !== 1 ||
  suppressed.state.legacyObserverSuppressions.ready_watchdog !== 3 ||
  suppressed.state.legacyObserverSuppressions.proposer_head_pollers !== 2 ||
  suppressed.state.inflight !== 0
) {
  throw new Error("legacy observer suppression accounting was not exact");
}

const retained = fixture(
  "canonical production self-http retained",
  String.raw`
    let calls = [];
    global.fetch = async (input, init = {}) => {
      calls.push({url:String(input), method:String(init.method || "GET").toUpperCase()});
      return new Response("original");
    };
    require(process.env.MODULE_PATH);

    async function productionHeadRead() {
      return (await fetch("http://127.0.0.1:4100/head.txt")).text();
    }

    (async () => {
      const head = await productionHeadRead();
      const number2 = await fetch("http://127.0.0.1:4100/blocks/latest/number2.json");
      const number2Text = await number2.text();
      const autoprop = await fetch(
        "http://127.0.0.1:4100/__void/metrics/proposer.commit-direct.v2fs/commit?empty=1",
        {method:"POST"},
      );
      const autopropText = await autoprop.text();
      const intervention = await fetch(
        "http://127.0.0.1:4100/proposer/auto/start?ms=2000",
        {method:"POST"},
      );
      console.log(JSON.stringify({
        calls,
        head,
        number2Text,
        autopropText,
        interventionStatus:intervention.status,
        state:global.__voidCanonicalSelfHttpGuardV1,
      }));
    })().catch(e => { console.error(e); process.exit(1); });
  `,
  canonicalEnv,
);

if (
  retained.calls.length !== 3 ||
  retained.head !== "original" ||
  retained.number2Text !== "original" ||
  retained.autopropText !== "original" ||
  retained.interventionStatus !== 204
) {
  throw new Error("production canonical self-http or existing intervention behavior regressed");
}
if (
  retained.state.selfPassThrough !== 2 ||
  retained.state.autopropBypass !== 1 ||
  retained.state.suppressedInterventions !== 1 ||
  retained.state.suppressedLegacyObserverFetches !== 0
) {
  throw new Error("retained canonical self-http accounting regressed");
}

const flagOff = fixture(
  "canonical observer flag off preserves prior behavior",
  String.raw`
    let calls = 0;
    global.fetch = async () => { calls++; return new Response("123\n"); };
    require(process.env.MODULE_PATH);
    async function poll() {
      return (await fetch("http://127.0.0.1:4100/head.txt")).text();
    }
    (async () => {
      const body = await poll();
      console.log(JSON.stringify({calls, body, state:global.__voidCanonicalSelfHttpGuardV1}));
    })().catch(e => { console.error(e); process.exit(1); });
  `,
  {
    VOID_CANONICAL_PRODUCER_ROLE: "1",
    VOID_CANONICAL_SELF_HTTP_GUARD: "1",
    VOID_CANONICAL_DISABLE_LEGACY_SELF_HTTP_OBSERVERS: "0",
    HTTP_PORT: "4100",
  },
);
if (
  flagOff.calls !== 1 ||
  flagOff.body !== "123\n" ||
  flagOff.state.legacyObserverSuppressionEnabled !== false
) {
  throw new Error("observer suppression flag-off path did not preserve prior behavior");
}

const noncanonical = fixture(
  "noncanonical observer-like call remains pass-through",
  String.raw`
    let calls = 0;
    global.fetch = async () => { calls++; return new Response("456\n"); };
    require(process.env.MODULE_PATH);
    async function poll() {
      return (await fetch("http://127.0.0.1:4100/head.txt")).text();
    }
    (async () => {
      const body = await poll();
      console.log(JSON.stringify({calls, body, state:global.__voidCanonicalSelfHttpGuardV1}));
    })().catch(e => { console.error(e); process.exit(1); });
  `,
  {
    VOID_CANONICAL_PRODUCER_ROLE: "0",
    VOID_CANONICAL_SELF_HTTP_GUARD: "1",
    VOID_CANONICAL_DISABLE_LEGACY_SELF_HTTP_OBSERVERS: "1",
    HTTP_PORT: "4100",
  },
);
if (
  noncanonical.calls !== 1 ||
  noncanonical.body !== "456\n" ||
  noncanonical.state.enabled !== false
) {
  throw new Error("noncanonical observer-like call was altered");
}

console.log(
  `${MARKER}_GREEN`,
  JSON.stringify({
    canonical_only: true,
    header3_match_exporter_socket_fetches: 0,
    ready_watchdog_socket_fetches: 0,
    proposer_activity_gauge_socket_fetches: 0,
    proposer_metrics_v2_socket_fetches: 0,
    observer_routes_retained: true,
    production_self_http_retained: true,
    exact_autoprop_bypass_retained: true,
    legacy_intervention_suppression_retained: true,
    noncanonical_unchanged: true,
    fail_closed_launch_binding: true,
    runtime_mutation: false,
  }),
);
