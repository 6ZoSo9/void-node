#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const MARKER = "VOID_CANONICAL_PRODUCER_LEGACY_SELF_HTTP_OBSERVERS_V1";
const EXPECTED_SOURCE_BLOB_SHA = "44f403701b074d71b456f3eb5d4acc2349b1e030";
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
  "ready_bit_exporter",
  "ready_watchdog",
  "proposer_head_pollers",
  "mempool_gc_head",
  "blockcount_v2_head",
  "blockcount_v2b",
  "txroot_core_v2_synth",
  "txroot_core_v2_synth_self",
  "head_gauge_v2",
  "seals_v3_head",
  "forensics_v4_head",
  "ready_bit_v21_head",
  "lastmile_v4b_head",
  "txroot_setter_watcher_v2",
  "seals_v3_poller_head",
  "seals_v3_heartbeat_head",
  "inProcessDurableHeadReads",
  "in-process-durable-head",
  "suppressedLegacyObserverFetches",
  "suppressed-legacy-observer",
  '"NaN\\n"',
  '"null"',
]) {
  need(runtimeGuard, token, "runtime canonical observer guard");
}

for (const token of [
  "(function Header3MatchExporter(){",
  "(function readyBitExporterV2(){",
  "(function readyWatchdogV1(){",
  "(function proposerActivityGauge(){",
  "(function proposerMetricsV2(){",
  "(function mempoolGcAndFull3(){",
  "(function BlockcountV2(){",
  "(function BlockcountV2b(){",
  "(function txrootCoreV2Synth(){",
  "(function txrootCoreV2SynthSelf(){",
  "(function addHeadGaugeExporterV2(){",
  "// --- SEALS_V3_BOOTSAFE_BEGIN ---",
  "(function txrootForensicsDescriptorV4(){",
  "(function readyBitExporterV21(){",
  "(function lastMileV4b(){",
  "(function txrootSetterWatcherV2(){",
  "// --- SEALS_V3_POLLER_BEGIN ---",
  "// --- SEALS_V3_HEARTBEAT_FIX_BEGIN ---",
  "/blocks/latest/number2.json",
  "/__void/metrics/void.basics.v2.prom",
  "/__void/metrics/lastmile.v4b.prom",
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
      const readyBitCases = contract.callsites.ready_bit_exporter.map((line) => {
        const row = lineText(line);
        if (row.includes("/blocks/latest/number2.json")) {
          return [line, "http://127.0.0.1:4100/blocks/latest/number2.json"];
        }
        if (row.includes("/head.txt")) {
          return [line, "http://127.0.0.1:4100/head.txt"];
        }
        if (row.includes('fetch(base + "/head")')) {
          return [line, "http://127.0.0.1:4100/head"];
        }
        if (row.includes("/__void/metrics/txroot4/setter.prom")) {
          return [line, "http://127.0.0.1:4100/__void/metrics/txroot4/setter.prom"];
        }
        throw new Error("unmapped ready-bit callsite line=" + line + " row=" + row);
      });
      if (readyBitCases.length !== 8) {
        throw new Error("ready-bit case count drifted: " + readyBitCases.length);
      }
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
        ...readyBitCases,
        [readyNumber2Line, "http://127.0.0.1:4100/blocks/latest/number2.json"],
        [readyHeadTxtLine, "http://127.0.0.1:4100/head.txt"],
        [readyHeadJsonLine, "http://127.0.0.1:4100/head"],
        [readySetterLine, "http://127.0.0.1:4100/__void/metrics/txroot4/setter.prom"],
        [proposerActivityLine, "http://127.0.0.1:4100/head.txt"],
        [proposerMetricsLine, "http://127.0.0.1:4100/head.txt"],
      ]) {
        const response = await atLine(line, 'fetch(' + JSON.stringify(url) + ')');
        results.push({
          line,
          url,
          body: await response.text(),
          guard: response.headers.get("x-void-self-http-guard"),
          family:
            response.headers.get("x-void-self-http-family") ||
            response.headers.get("x-void-legacy-observer-family"),
        });
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
if (provenance.results.length !== 17) throw new Error("targeted source-provenance fixture count drifted");
let provenanceReadyV21 = 0;
for (const result of provenance.results) {
  const expectedBody = result.url.endsWith("/head.txt") ? "NaN\n" : "null";
  const readyBitExporterDurable =
    result.family === "ready_bit_exporter" &&
    (
      result.url.endsWith("/blocks/latest/number2.json") ||
      result.url.endsWith("/head.txt")
    );
  const expectedGuard =
    result.family === "ready_bit_v21_head" || readyBitExporterDurable
      ? "in-process-durable-head"
      : "suppressed-legacy-observer";
  if (
    result.body !== expectedBody ||
    !result.family ||
    result.guard !== expectedGuard
  ) {
    throw new Error(
      `targeted callsite was not deterministically routed: ${JSON.stringify(result)}`,
    );
  }
  if (result.family === "ready_bit_v21_head") provenanceReadyV21 += 1;
}
if (provenanceReadyV21 !== 1) {
  throw new Error(
    `ready-bit v2.1 provenance overlap was not exact: ${provenanceReadyV21}`,
  );
}
if (
  provenance.state.suppressedLegacyObserverFetches !== 13 ||
  provenance.state.legacyObserverSuppressions.header3_match_exporter !== 3 ||
  provenance.state.legacyObserverSuppressions.ready_bit_exporter !== 4 ||
  provenance.state.legacyObserverSuppressions.ready_watchdog !== 4 ||
  provenance.state.legacyObserverSuppressions.proposer_head_pollers !== 2 ||
  provenance.state.inProcessDurableHeadReads !== 0 ||
  provenance.state.inProcessDurableHeadReadFailures !== 4 ||
  provenance.state.inProcessDurableHeadFamilies.ready_bit_exporter !== 0 ||
  provenance.state.inProcessDurableHeadFamilies.ready_bit_v21_head !== 0 ||
  provenance.state.selfPassThrough !== 1
) {
  throw new Error("source-provenance routing accounting was not exact");
}

const maintenanceHeadRoot = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-canonical-maintenance-head-"),
);
try {
  fs.writeFileSync(
    path.join(maintenanceHeadRoot, "head.txt"),
    "4242\n",
    "utf8",
  );

  const maintenance = fixture(
    "canonical maintenance head reads stay in-process",
    String.raw`
      const fs = require("node:fs");
      const vm = require("node:vm");
      let calls = [];
      global.fetch = async (input, init = {}) => {
        calls.push({
          url:String(input),
          method:String(init.method || "GET").toUpperCase(),
        });
        return new Response("underlying");
      };
      require(process.env.MODULE_PATH);
      const state = global.__voidCanonicalSelfHttpGuardV1;
      const contract = state.legacyObserverSourceContract;
      const sourceLines = fs.readFileSync(contract.sourcePath, "utf8").split(/\n/);

      function lineText(n) { return sourceLines[n - 1] || ""; }
      function firstTokenLine(family, token) {
        const hits = contract.callsites[family].filter((n) =>
          lineText(n).includes(token)
        );
        if (!hits.length) {
          throw new Error(
            "missing token callsite " + family + " token=" + token,
          );
        }
        return Math.min(...hits);
      }

      function atLine(line, expression) {
        return vm.runInThisContext(expression, {
          filename: contract.sourcePath,
          lineOffset: line - 1,
        });
      }

      (async () => {
        if (!contract.ready) {
          throw new Error("source contract not ready: " + contract.reason);
        }
        if (contract.callsites.mempool_gc_head.length !== 2) {
          throw new Error("mempool gc callsite count drifted");
        }
        if (contract.callsites.blockcount_v2_head.length !== 2) {
          throw new Error("blockcount callsite count drifted");
        }

        const mempoolLine =
          Math.max(...contract.callsites.mempool_gc_head);
        const blockcountLine =
          Math.max(...contract.callsites.blockcount_v2_head);
        const readyBitV2NumberLine = firstTokenLine(
          "ready_bit_exporter",
          "/blocks/latest/number2.json",
        );
        const readyBitV2HeadLine = firstTokenLine(
          "ready_bit_exporter",
          "/head.txt",
        );

        const mempool = await atLine(
          mempoolLine,
          'fetch("http://127.0.0.1:4100/blocks/latest/number")',
        );
        const blockcount = await atLine(
          blockcountLine,
          'fetch("http://127.0.0.1:4100/head.txt")',
        );
        const readyBitV2Number = await atLine(
          readyBitV2NumberLine,
          'fetch("http://127.0.0.1:4100/blocks/latest/number2.json")',
        );
        const readyBitV2Head = await atLine(
          readyBitV2HeadLine,
          'fetch("http://127.0.0.1:4100/head.txt")',
        );

        console.log(JSON.stringify({
          calls,
          mempool:{
            status:mempool.status,
            body:await mempool.text(),
            guard:mempool.headers.get("x-void-self-http-guard"),
            family:mempool.headers.get("x-void-self-http-family"),
          },
          blockcount:{
            status:blockcount.status,
            body:await blockcount.text(),
            guard:blockcount.headers.get("x-void-self-http-guard"),
            family:blockcount.headers.get("x-void-self-http-family"),
          },
          readyBitV2Number:{
            status:readyBitV2Number.status,
            body:await readyBitV2Number.text(),
            guard:readyBitV2Number.headers.get("x-void-self-http-guard"),
            family:readyBitV2Number.headers.get("x-void-self-http-family"),
          },
          readyBitV2Head:{
            status:readyBitV2Head.status,
            body:await readyBitV2Head.text(),
            guard:readyBitV2Head.headers.get("x-void-self-http-guard"),
            family:readyBitV2Head.headers.get("x-void-self-http-family"),
          },
          state,
        }));
      })().catch(e => { console.error(e); process.exit(1); });
    `,
    {
      ...canonicalEnv,
      DATA_DIR: maintenanceHeadRoot,
    },
  );

  if (maintenance.calls.length !== 0) {
    throw new Error("maintenance head reads opened underlying self-http");
  }
  for (const [name, family] of [
    ["mempool", "mempool_gc_head"],
    ["blockcount", "blockcount_v2_head"],
    ["readyBitV2Head", "ready_bit_exporter"],
  ]) {
    const result = maintenance[name];
    if (
      result.status !== 200 ||
      result.body !== "4242\n" ||
      result.guard !== "in-process-durable-head" ||
      result.family !== family
    ) {
      throw new Error(
        "maintenance in-process durable head mismatch: " +
          JSON.stringify({ name, result }),
      );
    }
  }
  if (
    maintenance.readyBitV2Number.status !== 200 ||
    maintenance.readyBitV2Number.body !== '{"number":4242}\n' ||
    maintenance.readyBitV2Number.guard !== "in-process-durable-head" ||
    maintenance.readyBitV2Number.family !== "ready_bit_exporter"
  ) {
    throw new Error(
      "ready-bit v2 in-process JSON head mismatch: " +
        JSON.stringify(maintenance.readyBitV2Number),
    );
  }

  if (
    maintenance.state.inProcessDurableHeadReads !== 4 ||
    maintenance.state.inProcessDurableHeadReadFailures !== 0 ||
    maintenance.state.inProcessDurableHeadFamilies.mempool_gc_head !== 1 ||
    maintenance.state.inProcessDurableHeadFamilies.blockcount_v2_head !== 1 ||
    maintenance.state.inProcessDurableHeadFamilies.ready_bit_exporter !== 2 ||
    maintenance.state.selfPassThrough !== 0
  ) {
    throw new Error("maintenance in-process accounting mismatch");
  }

  const missingHead = fixture(
    "missing durable head fails closed without self-http",
    String.raw`
      const vm = require("node:vm");
      let calls = 0;
      global.fetch = async () => {
        calls++;
        return new Response("underlying");
      };
      require(process.env.MODULE_PATH);
      const state = global.__voidCanonicalSelfHttpGuardV1;
      const contract = state.legacyObserverSourceContract;
      const line = Math.max(...contract.callsites.mempool_gc_head);
      (async () => {
        const response = await vm.runInThisContext(
          'fetch("http://127.0.0.1:4100/blocks/latest/number")',
          {
            filename: contract.sourcePath,
            lineOffset: line - 1,
          },
        );
        console.log(JSON.stringify({
          calls,
          status:response.status,
          body:await response.text(),
          guard:response.headers.get("x-void-self-http-guard"),
          state,
        }));
      })().catch(e => { console.error(e); process.exit(1); });
    `,
    {
      ...canonicalEnv,
      DATA_DIR: path.join(maintenanceHeadRoot, "missing"),
    },
  );

  if (
    missingHead.calls !== 0 ||
    missingHead.status !== 503 ||
    missingHead.body !== "NaN\n" ||
    missingHead.guard !== "in-process-durable-head" ||
    missingHead.state.inProcessDurableHeadReads !== 0 ||
    missingHead.state.inProcessDurableHeadReadFailures !== 1
  ) {
    throw new Error("missing durable head did not fail closed in-process");
  }
} finally {
  fs.rmSync(maintenanceHeadRoot, { recursive: true, force: true });
}

const backgroundHeadRoot = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-canonical-background-head-"),
);
try {
  fs.writeFileSync(
    path.join(backgroundHeadRoot, "head.txt"),
    "4242\n",
    "utf8",
  );

  const background = fixture(
    "canonical background observer self-http collapses in-process",
    String.raw`
      const fs = require("node:fs");
      const vm = require("node:vm");
      let calls = [];
      global.fetch = async (input, init = {}) => {
        calls.push({
          url:String(input),
          method:String(init.method || "GET").toUpperCase(),
        });
        return new Response("underlying");
      };
      require(process.env.MODULE_PATH);
      const state = global.__voidCanonicalSelfHttpGuardV1;
      const contract = state.legacyObserverSourceContract;
      const sourceLines = fs.readFileSync(contract.sourcePath, "utf8").split(/\n/);

      function lineText(n) { return sourceLines[n - 1] || ""; }
      function onlyLine(family) {
        const lines = contract.callsites[family];
        if (!Array.isArray(lines) || lines.length !== 1) {
          throw new Error("expected one callsite for " + family + ": " + JSON.stringify(lines));
        }
        return lines[0];
      }
      function tokenLine(family, token) {
        const hits = contract.callsites[family].filter((n) => lineText(n).includes(token));
        if (hits.length !== 1) {
          throw new Error("expected exact token callsite " + family + " token=" + token + " hits=" + hits.length);
        }
        return hits[0];
      }
      function orderedLines(family) {
        return [...contract.callsites[family]].sort((a,b)=>a-b);
      }
      function atLine(line, expression) {
        return vm.runInThisContext(expression, {
          filename: contract.sourcePath,
          lineOffset: line - 1,
        });
      }
      async function probe(line, url) {
        const response = await atLine(
          line,
          'fetch(' + JSON.stringify(url) + ')',
        );
        return {
          url,
          status: response.status,
          body: await response.text(),
          guard: response.headers.get("x-void-self-http-guard"),
          family:
            response.headers.get("x-void-self-http-family") ||
            response.headers.get("x-void-legacy-observer-family"),
        };
      }

      (async () => {
        if (!contract.ready) throw new Error("source contract not ready: " + contract.reason);

        const synth = onlyLine("txroot_core_v2_synth");
        const synthSelf = onlyLine("txroot_core_v2_synth_self");
        const headGauge = onlyLine("head_gauge_v2");
        const forensic = onlyLine("forensics_v4_head");
        const sealsNumber = tokenLine("seals_v3_head", "/blocks/latest/number");
        const readyV21Number = tokenLine(
          "ready_bit_v21_head",
          "/blocks/latest/number2.json",
        );
        const lastMileV4b = orderedLines("lastmile_v4b_head");
        if (lastMileV4b.length !== 2) {
          throw new Error("lastmile v4b callsite cardinality drifted");
        }
        const txrootSetterV2 = orderedLines("txroot_setter_watcher_v2");
        if (
          txrootSetterV2.length !== 2 ||
          !lineText(txrootSetterV2[0]).includes("async function getText") ||
          !lineText(txrootSetterV2[1]).includes("async function getJSON")
        ) {
          throw new Error("txroot setter v2 callsite identity drifted");
        }
        const sealsPollerHead = onlyLine("seals_v3_poller_head");
        const sealsHeartbeatHead = onlyLine("seals_v3_heartbeat_head");
        const blockcount = orderedLines("blockcount_v2_head");
        const blockcountB = orderedLines("blockcount_v2b");
        if (blockcount.length !== 2 || blockcountB.length !== 2) {
          throw new Error("blockcount callsite cardinality drifted");
        }

        const results = {
          synthHead: await probe(synth, "http://127.0.0.1:4100/head.txt"),
          synthHeader: await probe(synth, "http://127.0.0.1:4100/blocks/4242/header"),
          synthSelfHead: await probe(synthSelf, "http://127.0.0.1:4100/head.txt"),
          synthSelfHeader: await probe(synthSelf, "http://127.0.0.1:4100/blocks/4242/header"),
          headGauge: await probe(headGauge, "http://127.0.0.1:4100/head.txt"),
          seals: await probe(sealsNumber, "http://127.0.0.1:4100/blocks/latest/number"),
          forensic: await probe(forensic, "http://127.0.0.1:4100/blocks/latest/number2.json"),
          readyV21: await probe(readyV21Number, "http://127.0.0.1:4100/blocks/latest/number2.json"),
          lastMileV4bHead: await probe(lastMileV4b[0], "http://localhost:4100/blocks/latest/number"),
          txrootSetterV2Head: await probe(txrootSetterV2[0], "http://127.0.0.1:4100/head.txt"),
          txrootSetterV2Inspector: await probe(txrootSetterV2[1], "http://127.0.0.1:4100/__void/txroot/v4/header/4242"),
          txrootSetterV2Full2: await probe(txrootSetterV2[1], "http://127.0.0.1:4100/blocks/4242/full2"),
          sealsPollerHead: await probe(sealsPollerHead, "http://127.0.0.1:4100/head.txt"),
          sealsHeartbeatHead: await probe(sealsHeartbeatHead, "http://127.0.0.1:4100/blocks/latest/number"),
          blockcountHead: await probe(blockcount[1], "http://127.0.0.1:4100/head.txt"),
          blockcountDetail: await probe(blockcount[0], "http://127.0.0.1:4100/blocks/4242/persisted"),
          blockcountBHead: await probe(blockcountB[1], "http://127.0.0.1:4100/head.txt"),
          blockcountBDetail: await probe(blockcountB[0], "http://127.0.0.1:4100/blocks/4242/full2"),
        };

        console.log(JSON.stringify({calls, results, state}));
      })().catch(e => { console.error(e); process.exit(1); });
    `,
    {
      ...canonicalEnv,
      DATA_DIR: backgroundHeadRoot,
    },
  );

  if (background.calls.length !== 0) {
    throw new Error(
      "background observer fixture opened underlying self-http: " +
        JSON.stringify(background.calls),
    );
  }

  for (const name of [
    "synthHead",
    "synthSelfHead",
    "headGauge",
    "seals",
    "lastMileV4bHead",
    "txrootSetterV2Head",
    "sealsPollerHead",
    "sealsHeartbeatHead",
    "blockcountHead",
    "blockcountBHead",
  ]) {
    const result = background.results[name];
    if (
      result.status !== 200 ||
      result.body !== "4242\n" ||
      result.guard !== "in-process-durable-head" ||
      !result.family
    ) {
      throw new Error(
        "background durable head response mismatch: " +
          JSON.stringify({ name, result }),
      );
    }
  }

  for (const [name, family] of [
    ["forensic", "forensics_v4_head"],
    ["readyV21", "ready_bit_v21_head"],
  ]) {
    const result = background.results[name];
    if (
      result.status !== 200 ||
      result.body !== '{"number":4242}\n' ||
      result.guard !== "in-process-durable-head" ||
      result.family !== family
    ) {
      throw new Error(
        "background JSON durable head response mismatch: " +
          JSON.stringify({ name, result }),
      );
    }
  }

  for (const name of [
    "synthHeader",
    "synthSelfHeader",
    "txrootSetterV2Inspector",
    "txrootSetterV2Full2",
    "blockcountDetail",
    "blockcountBDetail",
  ]) {
    const result = background.results[name];
    if (
      result.status !== 200 ||
      result.body !== "null" ||
      result.guard !== "suppressed-legacy-observer" ||
      !result.family
    ) {
      throw new Error(
        "background detail suppression mismatch: " +
          JSON.stringify({ name, result }),
      );
    }
  }

  if (
    background.state.inProcessDurableHeadReads !== 12 ||
    background.state.inProcessDurableHeadReadFailures !== 0 ||
    background.state.inProcessDurableHeadFamilies.txroot_core_v2_synth !== 1 ||
    background.state.inProcessDurableHeadFamilies.txroot_core_v2_synth_self !== 1 ||
    background.state.inProcessDurableHeadFamilies.head_gauge_v2 !== 1 ||
    background.state.inProcessDurableHeadFamilies.seals_v3_head !== 1 ||
    background.state.inProcessDurableHeadFamilies.forensics_v4_head !== 1 ||
    background.state.inProcessDurableHeadFamilies.ready_bit_v21_head !== 1 ||
    background.state.inProcessDurableHeadFamilies.lastmile_v4b_head !== 1 ||
    background.state.inProcessDurableHeadFamilies.txroot_setter_watcher_v2 !== 1 ||
    background.state.inProcessDurableHeadFamilies.seals_v3_poller_head !== 1 ||
    background.state.inProcessDurableHeadFamilies.seals_v3_heartbeat_head !== 1 ||
    background.state.inProcessDurableHeadFamilies.blockcount_v2_head !== 1 ||
    background.state.inProcessDurableHeadFamilies.blockcount_v2b !== 1 ||
    background.state.suppressedLegacyObserverFetches !== 6 ||
    background.state.legacyObserverSuppressions.txroot_core_v2_synth !== 1 ||
    background.state.legacyObserverSuppressions.txroot_core_v2_synth_self !== 1 ||
    background.state.legacyObserverSuppressions.txroot_setter_watcher_v2 !== 2 ||
    background.state.legacyObserverSuppressions.blockcount_v2_head !== 1 ||
    background.state.legacyObserverSuppressions.blockcount_v2b !== 1 ||
    background.state.selfPassThrough !== 0
  ) {
    throw new Error(
      "background observer accounting mismatch: " +
        JSON.stringify(background.state),
    );
  }
} finally {
  fs.rmSync(backgroundHeadRoot, { recursive: true, force: true });
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
        "http://127.0.0.1:4100/__void/metrics/proposer.commit-direct.v2fs/commit?empty=0",
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
    ready_bit_exporter_socket_fetches: 0,
    ready_bit_v2_head_reads_in_process: true,
    mempool_gc_head_socket_fetches: 0,
    blockcount_v2_head_socket_fetches: 0,
    blockcount_v2b_socket_fetches: 0,
    txroot_core_v2_synth_socket_fetches: 0,
    txroot_core_v2_synth_self_socket_fetches: 0,
    head_gauge_v2_socket_fetches: 0,
    seals_v3_head_socket_fetches: 0,
    forensics_v4_head_socket_fetches: 0,
    ready_bit_v21_head_socket_fetches: 0,
    lastmile_v4b_head_socket_fetches: 0,
    txroot_setter_watcher_v2_socket_fetches: 0,
    seals_v3_poller_head_socket_fetches: 0,
    seals_v3_heartbeat_head_socket_fetches: 0,
    overlap_head_poller_socket_fetches: 0,
    late_background_head_socket_fetches: 0,
    background_observer_self_http_socket_fetches: 0,
    maintenance_head_reads_in_process: true,
    missing_durable_head_fails_closed_without_socket: true,
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
