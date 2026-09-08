import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import net from "node:net";

const sourcePath = path.resolve("src/index.ts");
const source = fs.readFileSync(sourcePath, "utf8");
const lines = source.split("\n");
const agentRegion = lines.slice(24899, 27150).join("\n");
const buggySplit = '.split("\\\\n")';
const fixedSplit = '.split("\\n")';
const buggyJoin = '.join("\\\\n")';
const fixedJoin = '.join("\\n")';

assert.equal(agentRegion.includes(buggySplit), false, "literal backslash-n JSONL split remains in live agent job family");
assert.equal(agentRegion.includes(buggyJoin), false, "literal backslash-n JSONL join remains in live agent job family");
const fixedSplitCount = agentRegion.split(fixedSplit).length - 1;
assert.ok(fixedSplitCount >= 1, "expected repaired newline JSONL readers");

const forbiddenLegacyWholeFileReaders = [
  'fs.readFileSync(FILE_LEASES,"utf8").split("\\n")',
  'fs.readFileSync(FILE_RESULTS,"utf8").split("\\n")',
  'fs.readFileSync(FILE_JOBS,"utf8").split("\\n")',
];
for (const reader of forbiddenLegacyWholeFileReaders) {
  assert.equal(
    agentRegion.includes(reader),
    false,
    `legacy Agent-v0 whole-file JSONL reader remains: ${reader}`,
  );
}
assert.ok(
  agentRegion.includes("legacyAgentV0SnapshotV1"),
  "bounded legacy Agent-v0 semantic snapshot integration missing",
);
assert.ok(
  agentRegion.includes("legacyAgentV0ResultSnapshotV1"),
  "bounded legacy Agent-v0 result snapshot integration missing",
);
assert.ok(
  agentRegion.includes("legacyAgentV0MetricsSnapshotV1"),
  "bounded legacy Agent-v0 metrics snapshot integration missing",
);
assert.equal(
  agentRegion.includes("function safeLines(f)"),
  false,
  "legacy Agent-v0 v2 metrics safeLines whole-file reader remains",
);
assert.equal(
  agentRegion.includes("function countSet(file)"),
  false,
  "legacy Agent-v0 v2 metrics countSet whole-file reader remains",
);
assert.equal(
  agentRegion.includes('fs.readFileSync(FILE_RECEIPTS,"utf8").split("\\n")'),
  false,
  "legacy Agent-v0 receipt metrics whole-file JSONL reader remains",
);
assert.ok(agentRegion.split(fixedJoin).length - 1 >= 10, "expected repaired newline JSONL writers/metrics joins");

const badReceiptsTail = String.raw`lines.join("\n")+"\\n"`;
const goodReceiptsTail = String.raw`lines.join("\n")+"\n"`;
const badLeaseMetricsTail = String.raw`out.join("\n")+"\\n"`;
const goodLeaseMetricsTail = String.raw`out.join("\n")+"\n"`;
const badLeaseErrorTail = String.raw`send("# error "+(e?.message||"internal")+"\\n");`;
const goodLeaseErrorTail = String.raw`send("# error "+(e?.message||"internal")+"\n");`;
assert.equal(source.includes(badReceiptsTail), false, "receipts metrics still appends a literal backslash-n tail");
assert.equal(source.includes(goodReceiptsTail), true, "receipts metrics real newline tail missing");
assert.equal(source.includes(badLeaseMetricsTail), false, "lease metrics still appends a literal backslash-n tail");
assert.equal(source.includes(goodLeaseMetricsTail), true, "lease metrics real newline tail missing");
assert.equal(source.includes(badLeaseErrorTail), false, "lease metrics error response still appends a literal backslash-n tail");
assert.equal(source.includes(goodLeaseErrorTail), true, "lease metrics error response real newline tail missing");

const unsafeHeader = 'const n = Number((await selfJson(`/blocks/latest/number2.json`)).number);';
const safeHeader = 'const n = Number((await selfJson(`/blocks/latest/number2.json`))?.number);';
assert.equal(source.includes(unsafeHeader), false, "Header3 poller still dereferences synthetic null response");
assert.equal(source.includes(safeHeader), true, "Header3 poller null-safe boundary missing");

const tsxBin = path.resolve("node_modules/.bin/tsx");
assert.ok(fs.existsSync(tsxBin), "tsx runtime missing; run npm ci before the behavioral proof");

function writeJsonl(file, rows) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, rows.map((row) => JSON.stringify(row)).join("\n") + "\n", "utf8");
}

function seedAgentState(root) {
  const agentDir = path.join(root, "agent");
  const now = Date.now();
  writeJsonl(path.join(agentDir, "jobs.jsonl"), [
    { id: "job-a", ts: now - 4000, status: "queued" },
    { id: "job-b", ts: now - 3000, status: "queued" },
    { id: "job-c", ts: now - 2000, status: "queued" },
    { id: "job-d", ts: now - 1000, status: "queued" },
  ]);
  writeJsonl(path.join(agentDir, "results.jsonl"), [
    { id: "job-c", ts: now - 500, ok: true },
    { id: "result-extra", ts: now - 400, ok: true },
  ]);
  writeJsonl(path.join(agentDir, "receipts.jsonl"), [
    { id: "job-c", ts: now - 300, status: "completed" },
    { id: "receipt-extra", ts: now - 200, status: "completed" },
  ]);
  writeJsonl(path.join(agentDir, "leases.jsonl"), [
    { id: "job-b", ts: now - 100, worker: "proof-worker" },
    { id: "lease-extra", ts: now - 50, worker: "proof-worker" },
  ]);
}

async function reservePort() {
  return await new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.once("error", reject);
    server.listen({ host: "127.0.0.1", port: 0 }, () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      server.close((err) => (err ? reject(err) : resolve(port)));
    });
  });
}

function boundedLogBuffer() {
  let text = "";
  return {
    add(chunk) {
      text += String(chunk || "");
      if (text.length > 24000) text = text.slice(-24000);
    },
    get() {
      return text;
    },
  };
}

async function startEphemeralNode(entryFile, root) {
  const httpPort = await reservePort();
  const p2pPort = await reservePort();
  const keyPath = path.join(root, ".nodekey");
  fs.writeFileSync(keyPath, "11".repeat(32) + "\n", { mode: 0o600 });

  const env = {
    ...process.env,
    NODE_ENV: "test",
    DATA_DIR: root,
    VOID_DATA_DIR: root,
    HTTP_HOST: "127.0.0.1",
    VOID_HTTP_HOST: "127.0.0.1",
    HTTP_PORT: String(httpPort),
    VOID_HTTP_PORT: String(httpPort),
    P2P_HOST: "127.0.0.1",
    VOID_P2P_HOST: "127.0.0.1",
    P2P_PORT: String(p2pPort),
    VOID_P2P_PORT: String(p2pPort),
    PUBLIC_HTTP_BASE: `http://127.0.0.1:${httpPort}`,
    NODE_PRIVKEY_PATH: keyPath,
    BOOTSTRAP_ADDRS: "",
    BOOTSTRAP: "",
    ALLOW_EMPTY_BLOCKS: "0",
    VOID_QUARANTINE_HOT_RUNTIME: "1",
    VOID_DISABLE_WRAPPER_STORM: "1",
    VOID_DISABLE_TERMINAL_SAVEBLOCK: "1",
    VOID_DISABLE_TERMINAL_SAVEBLOCK_V2: "1",
    VOID_DISABLE_TXROOT_CORE_BUCKET: "1",
    VOID_DISABLE_TXROOT_HEADER_NOOP: "1",
    VOID_DISABLE_EARLY_WRAPPER_FAMILY: "1",
    VOID_DISABLE_DEDUPE_TRUTHFIX_FORENSICS: "1",
    VOID_DISABLE_SAVEBLOCK_TAIL: "1",
    VOID_DISABLE_FINALIZE_WAL_COMMIT: "1",
    VOID_TXROOT_OBSERVER_DISABLE: "1",
    VOID_TXROOT_FORENSICS_STICKY_DISABLE: "1",
    VOID_DISABLE_TXROOT_PERSIST: "1",
    TXROOT_PERSIST: "0",
    VOID_DISABLE_DRIFT: "1",
    VOID_DRIFT_DISABLE: "1",
    VOID_P2P_RELAY_SERVER_ENABLED: "0",
    VOID_P2P_UDP_SWARM_RUNTIME_ENABLED: "0",
    VOID_PUBLIC_BOOTSTRAP_REQUIRE: "0",
    VOID_AUTO_PROPOSE: "0",
    VOID_PROPOSER_ENABLED: "0",
  };

  const stdout = boundedLogBuffer();
  const stderr = boundedLogBuffer();
  const child = spawn(tsxBin, [entryFile], {
    cwd: process.cwd(),
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.on("data", (chunk) => stdout.add(chunk));
  child.stderr.on("data", (chunk) => stderr.add(chunk));

  return { child, httpPort, p2pPort, stdout, stderr };
}

async function stopEphemeralNode(runtime) {
  const { child } = runtime;
  if (child.exitCode !== null || child.signalCode !== null) return;
  child.kill("SIGTERM");
  await Promise.race([
    new Promise((resolve) => child.once("exit", resolve)),
    new Promise((resolve) => setTimeout(resolve, 1500)),
  ]);
  if (child.exitCode === null && child.signalCode === null) {
    child.kill("SIGKILL");
    await new Promise((resolve) => child.once("exit", resolve));
  }
}

async function fetchAgentMetrics(runtime) {
  const deadline = Date.now() + 30000;
  let last = "route not ready";
  while (Date.now() < deadline) {
    if (runtime.child.exitCode !== null || runtime.child.signalCode !== null) {
      throw new Error(
        `ephemeral node exited before agent_jobs metrics became ready; exit=${runtime.child.exitCode} signal=${runtime.child.signalCode}\n` +
        `stdout:\n${runtime.stdout.get()}\nstderr:\n${runtime.stderr.get()}`
      );
    }
    try {
      const response = await fetch(`http://127.0.0.1:${runtime.httpPort}/__void/metrics/agent_jobs.prom`, {
        signal: AbortSignal.timeout(1500),
      });
      const text = await response.text();
      if (response.ok && text.includes("void_agent_jobs_total")) return text;
      last = `status=${response.status} body=${text.slice(0, 500)}`;
    } catch (err) {
      last = String(err?.message || err);
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(
    `timed out waiting for production agent_jobs metrics: ${last}\nstdout:\n${runtime.stdout.get()}\nstderr:\n${runtime.stderr.get()}`
  );
}

function metric(text, name) {
  const match = text.match(new RegExp(`^${name}\\s+(-?[0-9]+(?:\\.[0-9]+)?)$`, "m"));
  assert.ok(match, `metric missing: ${name}\n${text}`);
  return Number(match[1]);
}

function assertProductionBehavior(text) {
  assert.equal(metric(text, "void_agent_jobs_total"), 4, "production jobs.jsonl reader did not recover all four records");
  assert.equal(metric(text, "void_agent_results_total"), 2, "production results.jsonl reader did not recover both records");
  assert.equal(metric(text, "void_agent_receipts_file_total"), 2, "production receipts.jsonl reader did not recover both records");
  assert.equal(metric(text, "void_agent_jobs_queued"), 2, "production rebuildIndex did not exclude one leased and one completed job");
  assert.equal(text.includes("\\n"), false, "production metrics response contains literal backslash-n separators");
  assert.equal(text.endsWith("\n"), true, "production metrics response is missing terminal newline");
}

async function runProductionScenario(entryFile, label) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), `void-live-agent-jsonl-${label}-`));
  seedAgentState(root);
  const runtime = await startEphemeralNode(entryFile, root);
  try {
    const text = await fetchAgentMetrics(runtime);
    return { text, runtime };
  } finally {
    await stopEphemeralNode(runtime);
    fs.rmSync(root, { recursive: true, force: true });
  }
}

const baseline = await runProductionScenario(sourcePath, "baseline");
assertProductionBehavior(baseline.text);

const semanticSourcePath = path.resolve(
  "src/http/agent_pick2_jsonl_semantic_index_v1.ts",
);
const semanticSource = fs.readFileSync(semanticSourcePath, "utf8");
const scannerStartAnchor = "  private scanLegacyAgentV0RangeLinesFd(";
const scannerEndAnchor = "  private rebuildLegacyAgentV0Jobs(";
const scannerStart = semanticSource.indexOf(scannerStartAnchor);
const scannerEnd = semanticSource.indexOf(scannerEndAnchor, scannerStart);
assert.notEqual(scannerStart, -1, "legacy semantic newline scanner seam missing");
assert.notEqual(scannerEnd, -1, "legacy semantic newline scanner end seam missing");

const scannerWindow = semanticSource.slice(scannerStart, scannerEnd);
const productionLfGuard = "if (data[i] !== 0x0a) continue;";
const mutantCrGuard = "if (data[i] !== 0x0d) continue;";
const scannerGuardCount =
  scannerWindow.split(productionLfGuard).length - 1;
assert.equal(
  scannerGuardCount,
  1,
  `expected exactly one LF delimiter guard in legacy semantic scanner, found ${scannerGuardCount}`,
);

const mutantScannerWindow = scannerWindow.replace(
  productionLfGuard,
  mutantCrGuard,
);
assert.equal(
  mutantScannerWindow.includes(mutantCrGuard),
  true,
  "semantic newline-scanner mutation was not applied",
);
const mutantSemanticSource =
  semanticSource.slice(0, scannerStart)
  + mutantScannerWindow
  + semanticSource.slice(scannerEnd);

const originalSemanticImport =
  '"./http/agent_pick2_jsonl_semantic_index_v1.js"';
const mutantSemanticImport =
  '"./http/__void_agent_pick2_jsonl_semantic_index_mutant_v1.js"';
assert.equal(
  source.split(originalSemanticImport).length - 1,
  1,
  "production semantic-index import seam changed",
);
const mutantSource = source.replace(
  originalSemanticImport,
  mutantSemanticImport,
);
assert.equal(
  mutantSource.includes(mutantSemanticImport),
  true,
  "mutant production entrypoint did not bind mutant semantic index",
);

const mutantSemanticPath = path.join(
  path.dirname(semanticSourcePath),
  "__void_agent_pick2_jsonl_semantic_index_mutant_v1.ts",
);
const mutantPath = path.join(
  path.dirname(sourcePath),
  "__void_live_agent_jsonl_runtime_wedge_mutant_v1.ts",
);
fs.writeFileSync(mutantSemanticPath, mutantSemanticSource, "utf8");
fs.writeFileSync(mutantPath, mutantSource, "utf8");
try {
  const mutant = await runProductionScenario(mutantPath, "semantic-mutant");
  let rejected = false;
  try {
    assertProductionBehavior(mutant.text);
  } catch {
    rejected = true;
  }
  assert.equal(
    rejected,
    true,
    "behavioral proof failed to reject production semantic newline-scanner mutant",
  );
} finally {
  fs.rmSync(mutantPath, { force: true });
  fs.rmSync(mutantSemanticPath, { force: true });
}

console.log("VOID_LIVE_AGENT_JSONL_RUNTIME_WEDGE_V1_PROOF_GREEN");
console.log("agent_jsonl_real_newline_split=true");
console.log("agent_jsonl_real_newline_join=true");
console.log("production_agent_jobs_route_exercised=true");
console.log("multi_record_jobs_results_receipts_leases_recovered=true");
console.log("production_metrics_terminal_newline=true");
console.log("semantic_newline_scanner_mutant_rejected=true");
console.log("header3_synthetic_null_safe=true");
console.log("live_runtime_mutation_performed=false");
