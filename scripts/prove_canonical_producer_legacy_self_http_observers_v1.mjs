#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const MARKER = "VOID_CANONICAL_PRODUCER_LEGACY_SELF_HTTP_OBSERVERS_V1";
const EXPECTED_SOURCE_BLOB_SHA = "79a93842f286cc3e6464d5eae02769172192367a";
const modulePath = path.resolve("runtime/canonical-producer-self-http-guard-v1.cjs");
const sourcePath = path.resolve("src/index.ts");

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function need(source, token, label) {
  if (!source.includes(token)) throw new Error(`${label} missing token: ${token}`);
}

function gitBlobSha(source) {
  const body = Buffer.from(source, "utf8");
  return crypto
    .createHash("sha1")
    .update(`blob ${body.length}\0`, "utf8")
    .update(body)
    .digest("hex");
}

function fixture(name, body, env = {}, cwd = process.cwd()) {
  const result = spawnSync(process.execPath, ["-e", body], {
    cwd,
    env: { ...process.env, MODULE_PATH: modulePath, ...env },
    encoding: "utf8",
    timeout: 7000,
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
const source = read(sourcePath);

for (const token of [
  "VOID_CANONICAL_DISABLE_LEGACY_SELF_HTTP_OBSERVERS",
  "LEGACY_SOURCE_BLOB_SHA",
  EXPECTED_SOURCE_BLOB_SHA,
  "legacyObserverSourceContract",
  "stackMatchesCallsites",
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

for (const token of [
  "(function Header3MatchExporter(){",
  "(function readyWatchdogV1(){",
  "(function proposerActivityGauge(){",
  "(function proposerMetricsV2(){",
  "/blocks/latest/number2.json",
  "/__void/metrics/txroot4/setter.prom",
]) {
  need(source, token, "canonical producer source");
}

if (gitBlobSha(source) !== EXPECTED_SOURCE_BLOB_SHA) {
  throw new Error(
    `canonical producer source blob drifted expected=${EXPECTED_SOURCE_BLOB_SHA} actual=${gitBlobSha(source)}`,
  );
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

const provenance = fixture(
  "canonical source-provenance observer suppression",
  String.raw`
    const fs = require("node:fs");
    const vm = require("node:vm");
    let calls = [];
    global.fetch = async (input, init = {}) => {
      calls.push({url:String(input), method:String(init.method || "GET").toUpperCase()});
      return new Response("original");
    };
    require(process.env.MODULE_PATH);
    const state = global.__voidCanonicalSelfHttpGuardV1;
    const contract = state.legacyObserverSourceContract;
    const sourceLines = fs.readFileSync(contract.sourcePath, "utf8").split(/\n/);

    function lineText(n) { return sourceLines[n - 1] || ""; }
    function firstLine(family, token) {
      const hit = contract.callsites[family].find((n) => lineText(n).includes(token));
      if (!hit) throw new Error("missing callsite " + family + " token=" + token);
      return hit;
    }
    function exactLine(family, token) {
      const hits = contract.callsites[family].filter((n) => lineText(n).includes(token));
      if (hits.length !== 1) throw new Error("non-exact callsite " + family + " token=" + token + " hits=" + hits.length);
      return hits[0];
    }
    function atLine(line, expression) {
      return vm.runInThisContext(expression, {
        filename: contract.sourcePath,
        lineOffset: line - 1,
      });
    }

    (async () => {
      if (!contract.ready) throw new Error("source contract not ready: " + contract.reason);
      if (contract.actualBlobSha !== contract.expectedBlobSha) throw new Error("source blob contract mismatch");

      const headerLine = firstLine("header3_match_exporter", "fetch");
      const readyNumber2Line = exactLine("ready_watchdog", "/blocks/latest/number2.json");
      const readyHeadTxtLine = exactLine("ready_watchdog", "/head.txt");
      const readyHeadJsonLine = exactLine("ready_watchdog", 'fetch(base()+"/head");');
      const readySetterLine = exactLine("ready_watchdog", "/__void/metrics/txroot4/setter.prom");
      const proposerActivityLine = exactLine("proposer_head_pollers", "process.env.HTTP_PORT||'4100'");
      const proposerMetricsLine = exactLine("proposer_head_pollers", "'+port+'/head.txt");

      const results = [];
      for (const [line, url] of [
        [headerLine, "http://127.0.0.1:4100/blocks/latest/number2.json"],
        [headerLine, "http://127.0.0.1:4100/blocks/77/header3"],
        [headerLine, "http://127.0.0.1:4100/dev/txroot/77"],
        [readyNumber2Line, "http://127.0.0.1:4100/blocks/latest/number2.json"],
        [readyHeadTxtLine, "http://127.0.0.1:4100/head.txt"],
        [readyHeadJsonLine, "http://127.0.0.1:4100/head"],
        [readySetterLine, "http://127.0.0.1:4100/__void/metrics/txroot4/setter.prom"],
        [proposerActivityLine, "http://127.0.0.1:4100/head.txt"],
        [proposerMetricsLine, "http://127.0.0.1:4100/head.txt"],
      ]) {
        const response = await atLine(line, 'fetch(' + JSON.stringify(url) + ')');
        results.push({url, body:await response.text(), family:response.headers.get("x-void-legacy-observer-family")});
      }

      const allTargetLines = new Set(Object.values(contract.callsites).flat());
      let adversarialLine = 1;
      while (allTargetLines.has(adversarialLine)) adversarialLine++;
      const unrelated = await atLine(
        adversarialLine,
        '(async function poll(){ return (await fetch("http://127.0.0.1:4100/head.txt")).text(); })()',
      );

      console.log(JSON.stringify({calls, results, unrelated, state}));
    })().catch(e => { console.error(e); process.exit(1); });
  `,
  canonicalEnv,
);

if (provenance.calls.length !== 1 || provenance.calls[0].url !== "http://127.0.0.1:4100/head.txt") {
  throw new Error("source-provenance suppression opened an unexpected underlying fetch");
}
if (provenance.unrelated !== "original") {
  throw new Error("unrelated canonical poll() did not pass through unchanged");
}
if (provenance.results.length !== 9) throw new Error("targeted source-provenance fixture count drifted");
for (const result of provenance.results) {
  const expectedBody = result.url.endsWith("/head.txt") ? "NaN\n" : "null";
  if (result.body !== expectedBody || !result.family) {
    throw new Error(`targeted callsite was not deterministically suppressed: ${JSON.stringify(result)}`);
  }
}
if (
  provenance.state.suppressedLegacyObserverFetches !== 9 ||
  provenance.state.legacyObserverSuppressions.header3_match_exporter !== 3 ||
  provenance.state.legacyObserverSuppressions.ready_watchdog !== 4 ||
  provenance.state.legacyObserverSuppressions.proposer_head_pollers !== 2 ||
  provenance.state.selfPassThrough !== 1
) {
  throw new Error("source-provenance suppression accounting was not exact");
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

const driftRoot = fs.mkdtempSync(path.join(os.tmpdir(), "void-legacy-observer-drift-"));
try {
  fs.mkdirSync(path.join(driftRoot, "src"), { recursive: true });
  fs.writeFileSync(path.join(driftRoot, "src/index.ts"), source + "\n// adversarial source drift\n", "utf8");
  const drift = spawnSync(
    process.execPath,
    ["-e", 'global.fetch=async()=>new Response("x"); require(process.env.MODULE_PATH);'],
    {
      cwd: driftRoot,
      env: { ...process.env, MODULE_PATH: modulePath, ...canonicalEnv },
      encoding: "utf8",
      timeout: 5000,
    },
  );
  if (drift.status === 0 || !`${drift.stderr}\n${drift.stdout}`.includes("LEGACY_SOURCE_CONTRACT_FAIL")) {
    throw new Error(`source drift did not fail closed: status=${drift.status} stderr=${drift.stderr}`);
  }
} finally {
  fs.rmSync(driftRoot, { recursive: true, force: true });
}

console.log(
  `${MARKER}_GREEN`,
  JSON.stringify({
    canonical_only: true,
    source_blob_pinned: EXPECTED_SOURCE_BLOB_SHA,
    provenance_bound_callsites: true,
    source_drift_fails_closed: true,
    unrelated_canonical_poll_passes_through: true,
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
