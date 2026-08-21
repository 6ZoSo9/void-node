import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import {
  AgentPick2JsonlSemanticIndexV1,
  VOID_AGENT_PICK2_JSONL_SEMANTIC_INDEX_V1,
  VOID_AGENT_PICK2_JSONL_MAX_RECORD_BYTES_V1,
  VOID_AGENT_PICK2_JSONL_MAX_TAIL_SCAN_BYTES_V1,
  appendAgentPick2JsonlCanonicalV1,
} from "../src/http/agent_pick2_jsonl_semantic_index_v1.js";

const SOURCE_MARKER = "VOID_AGENT_PICK2_JSONL_SEMANTIC_INDEX_V1";
const sourcePath = path.resolve("src/index.ts");
const source = fs.readFileSync(sourcePath, "utf8");

const moduleSourcePath = path.resolve(
  "src/http/agent_pick2_jsonl_semantic_index_v1.ts",
);
const moduleSource = fs.readFileSync(moduleSourcePath, "utf8");
const appendHelperStart = moduleSource.indexOf(
  "export function appendAgentPick2JsonlCanonicalV1(",
);
const appendHelperEnd = moduleSource.indexOf(
  "\nfunction parseEntryV1(",
  appendHelperStart,
);
assert.notEqual(appendHelperStart, -1, "canonical append helper missing");
assert.notEqual(appendHelperEnd, -1, "canonical append helper end missing");
const appendHelperSource = moduleSource.slice(
  appendHelperStart,
  appendHelperEnd,
);
assert.equal(
  appendHelperSource.includes("readSync("),
  false,
  "ordinary canonical append rereads historical ledger bytes",
);
assert.equal(
  appendHelperSource.includes("createHash("),
  false,
  "ordinary canonical append hashes historical ledger bytes",
);
assert.ok(
  moduleSource.includes("acquireCanonicalAppendLockV1(file)"),
  "canonical append cross-process lock is missing",
);
assert.ok(
  moduleSource.includes("seedCanonicalWriterStateV1(file, after)"),
  "canonical writer generation state is not advanced after append",
);

assert.ok(
  moduleSource.includes("VOID_AGENT_PICK2_JSONL_MAX_RECORD_BYTES_V1"),
  "semantic index does not define a hard JSONL record ceiling",
);
assert.ok(
  moduleSource.includes("VOID_AGENT_PICK2_JSONL_MAX_TAIL_SCAN_BYTES_V1"),
  "semantic index does not define a bounded tail scan window",
);
assert.equal(
  moduleSource.includes("Buffer.concat([chunk, buffer])"),
  false,
  "tail rebuild still contains unbounded prepend-concat growth",
);
assert.ok(
  appendHelperSource.includes("fs.renameSync(file, isolatedPath)"),
  "canonical append does not isolate the trusted inode before writing",
);
assert.ok(
  appendHelperSource.includes("afterIsolatedTrusted"),
  "late prewrite isolation hook is missing",
);
assert.ok(
  appendHelperSource.includes("noncanonical-quarantine"),
  "racing noncanonical same-path mutations are not quarantined",
);

assert.ok(
  source.includes(
    'import { AgentPick2JsonlSemanticIndexV1, appendAgentPick2JsonlCanonicalV1 } from "./http/agent_pick2_jsonl_semantic_index_v1.js"; // VOID_AGENT_PICK2_JSONL_SEMANTIC_INDEX_V1_IMPORT',
  ),
  "pick2 semantic-index import missing from src/index.ts",
);

const v2StartMarker =
  "// ---------------- [ADD] Agent v0: pick2 epoch cutoff v2 (PRUNE existing pick2, hard last-wins) ----------------";
const v2EndMarker =
  "// ---------------- [ADD] Agent v0: prune + re-register /__void/agent/pick2_impl (v1) ----------------";
const v2Start = source.indexOf(v2StartMarker);
const v2End = source.indexOf(v2EndMarker, v2Start + 1);
assert.notEqual(v2Start, -1, "final pick2 v2 marker missing");
assert.notEqual(v2End, -1, "final pick2 v2 end marker missing");
const v2 = source.slice(v2Start, v2End);

assert.ok(
  v2.includes("const semanticIndex = new AgentPick2JsonlSemanticIndexV1();"),
  "shared pick2 semantic-index instance missing",
);
assert.ok(
  v2.includes("const semantic = semanticIndex.snapshot({"),
  "final pick2 handler does not consume semantic snapshot",
);
assert.ok(
  v2.includes("doneTruthHas(id)"),
  "final pick2 completion truth is not routed through cached semantic lookup",
);

const handlerStart = v2.indexOf(
  'app.post("/agent/v0/pick2", requireAgentAuth, (req:any, res:any)=>{',
);
const handlerEnd = v2.indexOf(
  'console.log("[agent.pick2.epochCutoff.v2] ready (pruned old pick2)")',
  handlerStart,
);
assert.notEqual(handlerStart, -1, "final public pick2 handler missing");
assert.notEqual(handlerEnd, -1, "final public pick2 handler end missing");
const handler = v2.slice(handlerStart, handlerEnd);
assert.equal(
  handler.includes('fs.readFileSync(file,"utf8")'),
  false,
  "final pick2 handler still contains whole-file safeLines reads",
);
assert.equal(
  handler.includes("safeLines("),
  false,
  "final pick2 handler still reparses safeLines per request",
);

assert.ok(
  source.includes("appendAgentPick2JsonlCanonicalV1"),
  "canonical append witness helper is not integrated into src/index.ts",
);
assert.equal(
  handler.includes("fs.appendFileSync(FILE_LEASES"),
  false,
  "final pick2 lease writer bypasses canonical append witness",
);
assert.ok(
  handler.includes("appendAgentPick2JsonlCanonicalV1(FILE_LEASES"),
  "final pick2 lease writer is not witness-bound",
);
const witnessWriterCallCount =
  source.split("appendAgentPick2JsonlCanonicalV1(").length - 1;
assert.ok(
  witnessWriterCallCount >= 8,
  `expected at least eight canonical JSONL writer bindings, found ${witnessWriterCallCount}`,
);

function writeJsonl(
  file: string,
  count: number,
  row: (i: number) => Record<string, unknown>,
) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const fd = fs.openSync(file, "w");
  try {
    for (let i = 0; i < count; i++) {
      fs.writeSync(fd, JSON.stringify(row(i)) + "\n");
    }
  } finally {
    fs.closeSync(fd);
  }
}

function appendJsonl(file: string, row: Record<string, unknown>) {
  appendAgentPick2JsonlCanonicalV1(file, JSON.stringify(row) + "\n");
}

function writeExactSizePath(
  file: string,
  row: Record<string, unknown>,
  exactBytes: number,
) {
  const target = Math.max(1, Math.floor(exactBytes));
  const line = JSON.stringify(row) + "\n";
  const lineBytes = Buffer.byteLength(line);
  assert.ok(lineBytes + 1 <= target);
  const body = line + " ".repeat(target - lineBytes - 1) + "\n";
  assert.equal(Buffer.byteLength(body), target);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, body, "utf8");
}

function writeRaw(file: string, body: string | Buffer) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, body);
}

function rewriteSameInodeLarger(
  file: string,
  rows: Record<string, unknown>[],
  minBytes: number,
) {
  const before = fs.statSync(file);
  const fd = fs.openSync(file, "w");
  try {
    let bytes = 0;
    let i = 0;
    while (bytes <= minBytes) {
      const row = rows[i % rows.length];
      const line = JSON.stringify({ ...row, pad: "x".repeat(96), seq: i++ }) + "\n";
      bytes += Buffer.byteLength(line);
      fs.writeSync(fd, line);
    }
  } finally {
    fs.closeSync(fd);
  }
  const after = fs.statSync(file);
  assert.equal(after.ino, before.ino, "same-inode rewrite fixture changed inode");
  assert.ok(after.size > minBytes, "same-inode rewrite fixture did not grow");
}

function rewriteSameInodeExactSize(
  file: string,
  row: Record<string, unknown>,
  exactBytes: number,
) {
  const target = Math.max(1, Math.floor(exactBytes));
  const line = JSON.stringify(row) + "\n";
  const lineBytes = Buffer.byteLength(line);
  assert.ok(
    lineBytes + 1 <= target,
    `exact-size rewrite fixture too small target=${target} line=${lineBytes}`,
  );
  const body = line + " ".repeat(target - lineBytes - 1) + "\n";
  assert.equal(Buffer.byteLength(body), target);

  const before = fs.statSync(file);
  const fd = fs.openSync(file, "w");
  try {
    const bytes = Buffer.from(body, "utf8");
    let off = 0;
    while (off < bytes.length) {
      const n = fs.writeSync(fd, bytes, off, bytes.length - off);
      if (n <= 0) throw new Error("exact-size rewrite short write");
      off += n;
    }
  } finally {
    fs.closeSync(fd);
  }

  const after = fs.statSync(file);
  assert.equal(after.ino, before.ino, "exact-size rewrite fixture changed inode");
  assert.equal(after.size, target, "exact-size rewrite fixture changed size");
}

const root = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-agent-pick2-jsonl-semantic-index-v1-"),
);
const agentDir = path.join(root, "agent");
const agentV1Dir = path.join(root, "agent_v1");

const jobsFile = path.join(agentDir, "jobs.jsonl");
const resultsFile = path.join(agentDir, "results.jsonl");
const leasesFile = path.join(agentDir, "leases.jsonl");
const receiptsFile = path.join(agentDir, "receipts.jsonl");
const receiptsV1File = path.join(agentV1Dir, "receipts.jsonl");
const jobStateV1File = path.join(agentV1Dir, "job_state.jsonl");

const now = Date.now();
const SCAN_MAX = 5000;
const LEASE_MS = 30_000;

try {
  writeJsonl(jobsFile, 100_000, (i) => ({
    id: `job-${i}`,
    ts: now - i,
    status: "queued",
    task_class: i % 2 === 0 ? "datanet_fetch_verify" : "publish",
    dataset_id: `dataset-${i}`,
    network_need_score: i % 100,
    stale_for_ms: i % 5000,
  }));
  writeJsonl(resultsFile, 80_000, (i) => ({
    id: `done-${i}`,
    ts: now - i,
    ok: true,
  }));
  writeJsonl(leasesFile, 80_000, (i) => ({
    id: `lease-${i}`,
    ts: now - 100_000 - i,
    worker: "historical-worker",
    selected_task_class: i % 2 === 0 ? "publish" : "datanet_fetch_verify",
  }));
  writeJsonl(receiptsFile, 80_000, (i) => ({
    id: `receipt-${i}`,
    status: i === 79_999 ? "completed" : "pending",
  }));
  writeJsonl(receiptsV1File, 80_000, (i) => ({
    job_id: `receipt-v1-${i}`,
    status: i === 79_999 ? "done" : "pending",
  }));
  writeJsonl(jobStateV1File, 80_000, (i) => ({
    job_id: `state-v1-${i}`,
    status: i === 79_999 ? "ok" : "pending",
  }));

  const jobsBytes = fs.statSync(jobsFile).size;
  const resultsBytes = fs.statSync(resultsFile).size;
  const leasesBytes = fs.statSync(leasesFile).size;

  const index = new AgentPick2JsonlSemanticIndexV1({ chunkBytes: 64 * 1024 });
  const first = index.snapshot({
    jobsFile,
    resultsFile,
    leasesFile,
    completionFiles: [receiptsFile, receiptsV1File, jobStateV1File],
    scanMax: SCAN_MAX,
    leaseMs: LEASE_MS,
    nowMs: now,
  });

  assert.equal(
    first.latestRunnableById.size,
    SCAN_MAX,
    "first-SCAN_MAX jobs semantics changed",
  );
  assert.equal(first.latestRunnableById.has("job-0"), true);
  assert.equal(first.latestRunnableById.has(`job-${SCAN_MAX - 1}`), true);
  assert.equal(
    first.latestRunnableById.has(`job-${SCAN_MAX}`),
    false,
    "jobs beyond first SCAN_MAX became visible",
  );
  assert.equal(
    first.done.has("done-79999"),
    true,
    "results tail did not retain newest completed result",
  );
  assert.equal(
    first.done.has("done-0"),
    false,
    "results older than tail SCAN_MAX unexpectedly retained",
  );
  assert.equal(first.doneTruthHas("receipt-79999"), true);
  assert.equal(first.doneTruthHas("receipt-v1-79999"), true);
  assert.equal(first.doneTruthHas("state-v1-79999"), true);
  assert.equal(first.active.size, 0, "expired historical leases became active");

  const firstJobsRead =
    first.io.by_kind.jobs_head_rebuild?.bytes_read ?? Number.MAX_SAFE_INTEGER;
  const firstTailRead =
    first.io.by_kind.tail_rebuild?.bytes_read ?? Number.MAX_SAFE_INTEGER;

  assert.ok(
    firstJobsRead < jobsBytes / 10,
    `jobs head reader consumed too much history: read=${firstJobsRead} size=${jobsBytes}`,
  );
  assert.ok(
    firstTailRead < (resultsBytes + leasesBytes) / 4,
    `tail readers consumed too much history: read=${firstTailRead} size=${resultsBytes + leasesBytes}`,
  );

  const firstBytes = first.io.bytes_read_total;
  const second = index.snapshot({
    jobsFile,
    resultsFile,
    leasesFile,
    completionFiles: [receiptsFile, receiptsV1File, jobStateV1File],
    scanMax: SCAN_MAX,
    leaseMs: LEASE_MS,
    nowMs: now,
  });
  const unchangedReadBytes = second.io.bytes_read_total - firstBytes;
  assert.equal(
    unchangedReadBytes,
    0,
    "unchanged second pick reread JSONL ledger bytes",
  );

  appendJsonl(resultsFile, { id: "done-new", ts: now, ok: true });
  appendJsonl(leasesFile, {
    id: "lease-new",
    ts: now,
    worker: "proof-worker",
    selected_task_class: "datanet_fetch_verify",
  });
  appendJsonl(receiptsFile, {
    id: "receipt-new",
    status: "completed",
  });
  appendJsonl(jobsFile, {
    id: "job-after-cap",
    ts: now + 1,
    status: "queued",
    task_class: "publish",
  });

  const beforeAppendRefresh = second.io.bytes_read_total;
  const third = index.snapshot({
    jobsFile,
    resultsFile,
    leasesFile,
    completionFiles: [receiptsFile, receiptsV1File, jobStateV1File],
    scanMax: SCAN_MAX,
    leaseMs: LEASE_MS,
    nowMs: now,
  });
  const appendRefreshBytes = third.io.bytes_read_total - beforeAppendRefresh;

  assert.equal(third.done.has("done-new"), true);
  assert.equal(third.active.has("lease-new"), true);
  assert.equal(third.doneTruthHas("receipt-new"), true);
  assert.equal(third.recentLeases.at(-1)?.id, "lease-new");
  assert.equal(
    third.latestRunnableById.has("job-after-cap"),
    false,
    "capped first-SCAN_MAX job semantics changed after append",
  );
  assert.ok(
    appendRefreshBytes < 4096,
    `append refresh reread historical ledgers: bytes=${appendRefreshBytes}`,
  );

  fs.writeFileSync(
    resultsFile,
    JSON.stringify({ id: "done-after-rotate", ts: now + 2, ok: true }) + "\n",
    "utf8",
  );
  const fourth = index.snapshot({
    jobsFile,
    resultsFile,
    leasesFile,
    completionFiles: [receiptsFile, receiptsV1File, jobStateV1File],
    scanMax: SCAN_MAX,
    leaseMs: LEASE_MS,
    nowMs: now,
  });
  assert.equal(
    fourth.done.has("done-new"),
    false,
    "truncated/replaced result history did not rebuild fail-closed",
  );
  assert.equal(fourth.done.has("done-after-rotate"), true);

  // Same-inode truncate+rewrite-to-larger must never inherit prior semantics.
  const rewriteRoot = path.join(root, "same-inode-rewrite");
  const rewriteAgent = path.join(rewriteRoot, "agent");
  const rewriteV1 = path.join(rewriteRoot, "agent_v1");
  const rJobs = path.join(rewriteAgent, "jobs.jsonl");
  const rResults = path.join(rewriteAgent, "results.jsonl");
  const rLeases = path.join(rewriteAgent, "leases.jsonl");
  const rReceipt = path.join(rewriteAgent, "receipts.jsonl");
  const rReceiptV1 = path.join(rewriteV1, "receipts.jsonl");
  const rStateV1 = path.join(rewriteV1, "job_state.jsonl");
  const rewriteScanMax = 64;

  writeJsonl(rJobs, 256, (i) => ({
    id: `old-job-${i}`,
    ts: now - i,
    status: "queued",
  }));
  writeJsonl(rResults, 256, (i) => ({
    id: i === 255 ? "old-result" : `old-result-${i}`,
    ts: now - i,
  }));
  writeJsonl(rLeases, 256, (i) => ({
    id: i === 255 ? "old-active" : `old-lease-${i}`,
    ts: now,
    worker: "old-worker",
  }));
  writeJsonl(rReceipt, 256, (i) => ({
    id: i === 255 ? "old-complete" : `old-receipt-${i}`,
    status: i === 255 ? "completed" : "pending",
  }));
  writeJsonl(rReceiptV1, 8, (i) => ({
    job_id: `stable-v1-${i}`,
    status: "pending",
  }));
  writeJsonl(rStateV1, 8, (i) => ({
    job_id: `stable-state-${i}`,
    status: "pending",
  }));

  const rewriteIndex = new AgentPick2JsonlSemanticIndexV1({
    chunkBytes: 4096,
  });
  const rewriteFirst = rewriteIndex.snapshot({
    jobsFile: rJobs,
    resultsFile: rResults,
    leasesFile: rLeases,
    completionFiles: [rReceipt, rReceiptV1, rStateV1],
    scanMax: rewriteScanMax,
    leaseMs: LEASE_MS,
    nowMs: now,
  });
  assert.equal(rewriteFirst.doneTruthHas("old-complete"), true);
  assert.equal(rewriteFirst.done.has("old-result"), true);
  assert.equal(rewriteFirst.active.has("old-active"), true);
  assert.equal(rewriteFirst.latestRunnableById.has("old-job-0"), true);

  const priorReceiptSize = fs.statSync(rReceipt).size;
  const priorResultSize = fs.statSync(rResults).size;
  const priorLeaseSize = fs.statSync(rLeases).size;
  const priorJobsSize = fs.statSync(rJobs).size;

  rewriteSameInodeLarger(
    rReceipt,
    [{ id: "new-complete", status: "completed" }],
    priorReceiptSize + 4096,
  );
  rewriteSameInodeLarger(
    rResults,
    [{ id: "new-result", ts: now + 10 }],
    priorResultSize + 4096,
  );
  rewriteSameInodeLarger(
    rLeases,
    [{ id: "new-active", ts: now + 10, worker: "new-worker" }],
    priorLeaseSize + 4096,
  );
  rewriteSameInodeLarger(
    rJobs,
    [{ id: "new-job", ts: now + 10, status: "queued" }],
    priorJobsSize + 4096,
  );

  const rewriteSecond = rewriteIndex.snapshot({
    jobsFile: rJobs,
    resultsFile: rResults,
    leasesFile: rLeases,
    completionFiles: [rReceipt, rReceiptV1, rStateV1],
    scanMax: rewriteScanMax,
    leaseMs: LEASE_MS,
    nowMs: now + 20,
  });
  assert.equal(
    rewriteSecond.doneTruthHas("old-complete"),
    false,
    "same-inode larger rewrite retained stale completion truth",
  );
  assert.equal(rewriteSecond.doneTruthHas("new-complete"), true);
  assert.equal(
    rewriteSecond.done.has("old-result"),
    false,
    "same-inode larger rewrite retained stale result tail",
  );
  assert.equal(rewriteSecond.done.has("new-result"), true);
  assert.equal(
    rewriteSecond.active.has("old-active"),
    false,
    "same-inode larger rewrite retained stale active lease",
  );
  assert.equal(rewriteSecond.active.has("new-active"), true);
  assert.equal(
    rewriteSecond.latestRunnableById.has("old-job-0"),
    false,
    "same-inode larger rewrite retained stale capped jobs head",
  );
  assert.equal(rewriteSecond.latestRunnableById.has("new-job"), true);
  assert.ok(
    rewriteSecond.io.append_witness_misses_total >= 4,
    "same-inode rewrite did not fail closed through append-witness misses",
  );

  // Atomic pathname replacement after the first chunk must never mix generations.
  const replaceRoot = path.join(root, "mid-scan-replace");
  const replaceAgent = path.join(replaceRoot, "agent");
  const replaceV1 = path.join(replaceRoot, "agent_v1");
  const pJobs = path.join(replaceAgent, "jobs.jsonl");
  const pResults = path.join(replaceAgent, "results.jsonl");
  const pLeases = path.join(replaceAgent, "leases.jsonl");
  const pReceipt = path.join(replaceAgent, "receipts.jsonl");
  const pReceiptV1 = path.join(replaceV1, "receipts.jsonl");
  const pStateV1 = path.join(replaceV1, "job_state.jsonl");

  writeJsonl(pJobs, 4, (i) => ({ id: `p-job-${i}`, status: "queued", ts: now }));
  writeJsonl(pResults, 4, (i) => ({ id: `p-result-${i}`, ts: now }));
  writeJsonl(pLeases, 4, (i) => ({ id: `p-lease-${i}`, ts: now - LEASE_MS * 2 }));
  writeJsonl(pReceipt, 600, (i) => ({
    id: i === 599 ? "old-generation-complete" : `old-generation-${i}`,
    status: i === 599 ? "completed" : "pending",
    pad: "o".repeat(128),
  }));
  writeJsonl(pReceiptV1, 2, (i) => ({ job_id: `p-v1-${i}`, status: "pending" }));
  writeJsonl(pStateV1, 2, (i) => ({ job_id: `p-state-${i}`, status: "pending" }));

  let replacedMidScan = false;
  const replacementPath = pReceipt + ".replacement";
  const replaceIndex = new AgentPick2JsonlSemanticIndexV1({
    chunkBytes: 4096,
    testHooks: {
      afterReadChunk(ctx) {
        if (
          replacedMidScan ||
          ctx.file !== pReceipt ||
          ctx.kind !== "completion_full" ||
          ctx.chunkIndex !== 0
        ) return;
        replacedMidScan = true;
        writeJsonl(replacementPath, 700, (i) => ({
          id: i === 699 ? "new-generation-complete" : `new-generation-${i}`,
          status: i === 699 ? "completed" : "pending",
          pad: "n".repeat(128),
        }));
        fs.renameSync(replacementPath, pReceipt);
      },
    },
  });

  const replaceSnapshot = replaceIndex.snapshot({
    jobsFile: pJobs,
    resultsFile: pResults,
    leasesFile: pLeases,
    completionFiles: [pReceipt, pReceiptV1, pStateV1],
    scanMax: 64,
    leaseMs: LEASE_MS,
    nowMs: now,
  });
  assert.equal(replacedMidScan, true, "mid-scan replacement hook did not execute");
  assert.equal(
    replaceSnapshot.doneTruthHas("old-generation-complete"),
    false,
    "cross-chunk pathname replacement leaked old-generation completion truth",
  );
  assert.equal(
    replaceSnapshot.doneTruthHas("new-generation-complete"),
    true,
    "coherent retry did not publish replacement generation",
  );
  assert.ok(
    replaceSnapshot.io.coherent_scan_retries_total >= 1,
    "mid-scan path replacement was not detected and retried",
  );

  // The append witness creator must not bless a concurrent same-inode rewrite
  // that happens after its trusted before-state check but before the O_APPEND write.
  const witnessRaceRoot = path.join(root, "append-witness-race");
  const witnessRaceAgent = path.join(witnessRaceRoot, "agent");
  const witnessRaceV1 = path.join(witnessRaceRoot, "agent_v1");
  const wJobs = path.join(witnessRaceAgent, "jobs.jsonl");
  const wResults = path.join(witnessRaceAgent, "results.jsonl");
  const wLeases = path.join(witnessRaceAgent, "leases.jsonl");
  const wReceipt = path.join(witnessRaceAgent, "receipts.jsonl");
  const wReceiptV1 = path.join(witnessRaceV1, "receipts.jsonl");
  const wStateV1 = path.join(witnessRaceV1, "job_state.jsonl");
  const witnessRaceScanMax = 64;

  writeJsonl(wJobs, 256, (i) => ({
    id: `w-old-job-${i}`,
    status: "queued",
    ts: now - i,
  }));
  writeJsonl(wResults, 256, (i) => ({
    id: i === 255 ? "w-old-result" : `w-old-result-${i}`,
    ts: now - i,
  }));
  writeJsonl(wLeases, 256, (i) => ({
    id: i === 255 ? "w-old-active" : `w-old-lease-${i}`,
    ts: now,
    worker: "w-old-worker",
  }));
  writeJsonl(wReceipt, 256, (i) => ({
    id: i === 255 ? "w-old-complete" : `w-old-receipt-${i}`,
    status: i === 255 ? "completed" : "pending",
  }));
  writeJsonl(wReceiptV1, 8, (i) => ({
    job_id: `w-stable-v1-${i}`,
    status: "pending",
  }));
  writeJsonl(wStateV1, 8, (i) => ({
    job_id: `w-stable-state-${i}`,
    status: "pending",
  }));

  const witnessRaceIndex = new AgentPick2JsonlSemanticIndexV1({
    chunkBytes: 4096,
  });
  const witnessRaceFirst = witnessRaceIndex.snapshot({
    jobsFile: wJobs,
    resultsFile: wResults,
    leasesFile: wLeases,
    completionFiles: [wReceipt, wReceiptV1, wStateV1],
    scanMax: witnessRaceScanMax,
    leaseMs: LEASE_MS,
    nowMs: now,
  });
  assert.equal(witnessRaceFirst.doneTruthHas("w-old-complete"), true);
  assert.equal(witnessRaceFirst.done.has("w-old-result"), true);
  assert.equal(witnessRaceFirst.active.has("w-old-active"), true);
  assert.equal(witnessRaceFirst.latestRunnableById.has("w-old-job-0"), true);

  function adversarialAppend(
    file: string,
    replacement: Record<string, unknown>,
    appended: Record<string, unknown>,
  ) {
    const oldSize = fs.statSync(file).size;
    let hookRan = false;
    const result = appendAgentPick2JsonlCanonicalV1(
      file,
      JSON.stringify(appended) + "\n",
      {
        testHooks: {
          afterTrustedBefore() {
            hookRan = true;
            rewriteSameInodeExactSize(file, replacement, oldSize);
          },
        },
      },
    );
    assert.equal(hookRan, true, `append race hook did not execute for ${file}`);
    assert.equal(
      result.witnessed,
      false,
      `append race incorrectly minted witness for ${file}`,
    );
  }

  adversarialAppend(
    wReceipt,
    { id: "w-new-complete", status: "completed" },
    { id: "w-appended-complete", status: "completed" },
  );
  adversarialAppend(
    wResults,
    { id: "w-new-result", ts: now + 100 },
    { id: "w-appended-result", ts: now + 101 },
  );
  adversarialAppend(
    wLeases,
    { id: "w-new-active", ts: now + 100, worker: "w-new-worker" },
    { id: "w-appended-active", ts: now + 101, worker: "w-appended-worker" },
  );
  adversarialAppend(
    wJobs,
    { id: "w-new-job", status: "queued", ts: now + 100 },
    { id: "w-appended-job", status: "queued", ts: now + 101 },
  );

  const witnessRaceSecond = witnessRaceIndex.snapshot({
    jobsFile: wJobs,
    resultsFile: wResults,
    leasesFile: wLeases,
    completionFiles: [wReceipt, wReceiptV1, wStateV1],
    scanMax: witnessRaceScanMax,
    leaseMs: LEASE_MS,
    nowMs: now + 200,
  });

  assert.equal(
    witnessRaceSecond.doneTruthHas("w-old-complete"),
    false,
    "append witness race retained stale completion truth",
  );
  assert.equal(witnessRaceSecond.doneTruthHas("w-new-complete"), true);
  assert.equal(witnessRaceSecond.doneTruthHas("w-appended-complete"), true);

  assert.equal(
    witnessRaceSecond.done.has("w-old-result"),
    false,
    "append witness race retained stale result tail",
  );
  assert.equal(witnessRaceSecond.done.has("w-new-result"), true);
  assert.equal(witnessRaceSecond.done.has("w-appended-result"), true);

  assert.equal(
    witnessRaceSecond.active.has("w-old-active"),
    false,
    "append witness race retained stale active lease",
  );
  assert.equal(witnessRaceSecond.active.has("w-new-active"), true);
  assert.equal(witnessRaceSecond.active.has("w-appended-active"), true);

  assert.equal(
    witnessRaceSecond.latestRunnableById.has("w-old-job-0"),
    false,
    "append witness race retained stale capped jobs head",
  );
  assert.equal(witnessRaceSecond.latestRunnableById.has("w-new-job"), true);
  assert.equal(witnessRaceSecond.latestRunnableById.has("w-appended-job"), true);
  assert.ok(
    witnessRaceSecond.io.append_witness_misses_total >= 4,
    "append witness race did not force coherent rebuilds",
  );


  // A direct same-path writer that races after the final isolated validation
  // cannot mutate the trusted inode. Its replacement file is quarantined and
  // the helper declines an append witness so the next snapshot rebuilds.
  const lateRoot = path.join(root, "late-same-path-race");
  const lateAgent = path.join(lateRoot, "agent");
  const lateV1 = path.join(lateRoot, "agent_v1");
  const lJobs = path.join(lateAgent, "jobs.jsonl");
  const lResults = path.join(lateAgent, "results.jsonl");
  const lLeases = path.join(lateAgent, "leases.jsonl");
  const lReceipt = path.join(lateAgent, "receipts.jsonl");
  const lReceiptV1 = path.join(lateV1, "receipts.jsonl");
  const lStateV1 = path.join(lateV1, "job_state.jsonl");
  const lateScanMax = 64;

  writeJsonl(lJobs, 256, (i) => ({ id: `l-old-job-${i}`, status: "queued", ts: now - i }));
  writeJsonl(lResults, 256, (i) => ({ id: i === 255 ? "l-old-result" : `l-old-result-${i}`, ts: now - i }));
  writeJsonl(lLeases, 256, (i) => ({ id: i === 255 ? "l-old-active" : `l-old-lease-${i}`, ts: now, worker: "l-old-worker" }));
  writeJsonl(lReceipt, 256, (i) => ({ id: i === 255 ? "l-old-complete" : `l-old-receipt-${i}`, status: i === 255 ? "completed" : "pending" }));
  writeJsonl(lReceiptV1, 8, (i) => ({ job_id: `l-v1-${i}`, status: "pending" }));
  writeJsonl(lStateV1, 8, (i) => ({ job_id: `l-state-${i}`, status: "pending" }));

  const lateIndex = new AgentPick2JsonlSemanticIndexV1({ chunkBytes: 4096 });
  const lateFirst = lateIndex.snapshot({
    jobsFile: lJobs,
    resultsFile: lResults,
    leasesFile: lLeases,
    completionFiles: [lReceipt, lReceiptV1, lStateV1],
    scanMax: lateScanMax,
    leaseMs: LEASE_MS,
    nowMs: now,
  });
  assert.equal(lateFirst.doneTruthHas("l-old-complete"), true);
  assert.equal(lateFirst.done.has("l-old-result"), true);
  assert.equal(lateFirst.active.has("l-old-active"), true);
  assert.equal(lateFirst.latestRunnableById.has("l-old-job-0"), true);

  function lateSamePathAppend(
    file: string,
    replacement: Record<string, unknown>,
    appended: Record<string, unknown>,
  ) {
    const oldSize = fs.statSync(file).size;
    let hookRan = false;
    const result = appendAgentPick2JsonlCanonicalV1(
      file,
      JSON.stringify(appended) + "\n",
      {
        testHooks: {
          afterIsolatedTrusted() {
            hookRan = true;
            writeExactSizePath(file, replacement, oldSize);
          },
        },
      },
    );
    assert.equal(hookRan, true, `late isolated hook did not execute for ${file}`);
    assert.equal(result.witnessed, false, `late same-path race minted witness for ${file}`);
    const quarantines = fs.readdirSync(path.dirname(file)).filter((name) =>
      name.includes(`${path.basename(file)}.void-pick2-noncanonical-quarantine-`)
    );
    assert.ok(quarantines.length >= 1, `late same-path replacement was not quarantined for ${file}`);
  }

  lateSamePathAppend(
    lReceipt,
    { id: "l-noncanonical-complete", status: "completed" },
    { id: "l-appended-complete", status: "completed" },
  );
  lateSamePathAppend(
    lResults,
    { id: "l-noncanonical-result", ts: now + 100 },
    { id: "l-appended-result", ts: now + 101 },
  );
  lateSamePathAppend(
    lLeases,
    { id: "l-noncanonical-active", ts: now + 100, worker: "l-bad-worker" },
    { id: "l-appended-active", ts: now + 101, worker: "l-good-worker" },
  );
  lateSamePathAppend(
    lJobs,
    { id: "l-noncanonical-job", status: "queued", ts: now + 100 },
    { id: "l-appended-job", status: "queued", ts: now + 101 },
  );

  const lateSecond = lateIndex.snapshot({
    jobsFile: lJobs,
    resultsFile: lResults,
    leasesFile: lLeases,
    completionFiles: [lReceipt, lReceiptV1, lStateV1],
    scanMax: lateScanMax,
    leaseMs: LEASE_MS,
    nowMs: now + 200,
  });
  assert.equal(lateSecond.doneTruthHas("l-old-complete"), true);
  assert.equal(lateSecond.doneTruthHas("l-appended-complete"), true);
  assert.equal(lateSecond.doneTruthHas("l-noncanonical-complete"), false);
  assert.equal(lateSecond.done.has("l-old-result"), true);
  assert.equal(lateSecond.done.has("l-appended-result"), true);
  assert.equal(lateSecond.done.has("l-noncanonical-result"), false);
  assert.equal(lateSecond.active.has("l-old-active"), true);
  assert.equal(lateSecond.active.has("l-appended-active"), true);
  assert.equal(lateSecond.active.has("l-noncanonical-active"), false);
  assert.equal(lateSecond.latestRunnableById.has("l-old-job-0"), true);
  assert.equal(lateSecond.latestRunnableById.has("l-noncanonical-job"), false);
  assert.ok(
    lateSecond.io.append_witness_misses_total >= 4,
    "late same-path races did not force coherent rebuilds",
  );

  function semanticHoldFixture(
    label: string,
    target: "completion" | "results" | "leases" | "jobs",
    body: string | Buffer,
    expected: RegExp,
  ) {
    const dir = path.join(root, `hold-${label}`);
    const a = path.join(dir, "agent");
    const v1 = path.join(dir, "agent_v1");
    const jobs = path.join(a, "jobs.jsonl");
    const results = path.join(a, "results.jsonl");
    const leases = path.join(a, "leases.jsonl");
    const receipt = path.join(a, "receipts.jsonl");
    const receiptV1 = path.join(v1, "receipts.jsonl");
    const stateV1 = path.join(v1, "job_state.jsonl");

    writeJsonl(jobs, 4, (i) => ({ id: `${label}-job-${i}`, status: "queued", ts: now }));
    writeJsonl(results, 4, (i) => ({ id: `${label}-result-${i}`, ts: now }));
    writeJsonl(leases, 4, (i) => ({ id: `${label}-lease-${i}`, ts: now - LEASE_MS * 2 }));
    writeJsonl(receipt, 4, (i) => ({ id: `${label}-receipt-${i}`, status: "pending" }));
    writeJsonl(receiptV1, 2, (i) => ({ job_id: `${label}-v1-${i}`, status: "pending" }));
    writeJsonl(stateV1, 2, (i) => ({ job_id: `${label}-state-${i}`, status: "pending" }));

    const targetPath =
      target === "completion" ? receipt :
      target === "results" ? results :
      target === "leases" ? leases : jobs;
    writeRaw(targetPath, body);

    const holdIndex = new AgentPick2JsonlSemanticIndexV1({ chunkBytes: 4096 });
    let held = false;
    try {
      holdIndex.snapshot({
        jobsFile: jobs,
        resultsFile: results,
        leasesFile: leases,
        completionFiles: [receipt, receiptV1, stateV1],
        scanMax: 64,
        leaseMs: LEASE_MS,
        nowMs: now,
      });
    } catch (err) {
      held = true;
      assert.match(String((err as any)?.message || err), expected);
    }
    assert.equal(held, true, `${label} did not fail closed`);
    const readBytes = Number((holdIndex as any).metrics?.bytes_read_total || 0);
    assert.ok(
      readBytes <= VOID_AGENT_PICK2_JSONL_MAX_RECORD_BYTES_V1 + 256 * 1024,
      `${label} read too much before HOLD: ${readBytes}`,
    );
  }

  const oversized =
    JSON.stringify({ id: "oversized", status: "completed", pad: "x".repeat(VOID_AGENT_PICK2_JSONL_MAX_RECORD_BYTES_V1) }) + "\n";
  for (const target of ["completion", "results", "leases", "jobs"] as const) {
    semanticHoldFixture(
      `oversized-${target}`,
      target,
      oversized,
      /VOID_AGENT_PICK2_JSONL_RECORD_TOO_LARGE/,
    );
  }

  const unterminated = JSON.stringify({ id: "unterminated", status: "completed" });
  for (const target of ["completion", "results", "leases", "jobs"] as const) {
    semanticHoldFixture(
      `unterminated-${target}`,
      target,
      unterminated,
      /VOID_AGENT_PICK2_JSONL_UNTERMINATED_RECORD/,
    );
  }

  assert.equal(VOID_AGENT_PICK2_JSONL_MAX_RECORD_BYTES_V1, 1024 * 1024);
  assert.equal(VOID_AGENT_PICK2_JSONL_MAX_TAIL_SCAN_BYTES_V1, 32 * 1024 * 1024);

  console.log("VOID_AGENT_PICK2_JSONL_SEMANTIC_INDEX_V1_PROOF_GREEN");
  console.log(`marker=${VOID_AGENT_PICK2_JSONL_SEMANTIC_INDEX_V1}`);
  console.log(`source_marker=${SOURCE_MARKER}`);
  console.log(`large_jobs_bytes=${jobsBytes}`);
  console.log(`large_results_bytes=${resultsBytes}`);
  console.log(`large_leases_bytes=${leasesBytes}`);
  console.log(`first_jobs_head_bytes_read=${firstJobsRead}`);
  console.log(`first_results_leases_tail_bytes_read=${firstTailRead}`);
  console.log(`unchanged_second_pick_bytes_read=${unchangedReadBytes}`);
  console.log(`append_refresh_bytes_read=${appendRefreshBytes}`);
  console.log("first_scan_max_semantics_preserved=true");
  console.log("tail_scan_max_semantics_preserved=true");
  console.log("completion_truth_cached=true");
  console.log("lease_expiry_semantics_preserved=true");
  console.log("append_only_refresh_incremental=true");
  console.log("truncate_or_replace_rebuilds=true");
  console.log("same_inode_rewrite_growth_rebuilds=true");
  console.log("coherent_single_fd_scan=true");
  console.log("mid_scan_path_replacement_retried=true");
  console.log("canonical_append_witness_required=true");
  console.log("canonical_append_cross_process_lock=true");
  console.log("canonical_append_historical_bytes_read=0");
  console.log("canonical_mutation_generation_contract=true");
  console.log("append_witness_concurrent_same_inode_rewrite_rejected=true");
  console.log("late_same_path_race_quarantined=true");
  console.log("oversized_record_hold_all_inputs=true");
  console.log("unterminated_record_hold_all_inputs=true");
  console.log("jsonl_max_record_bytes=1048576");
  console.log("jsonl_max_tail_scan_bytes=33554432");
  console.log("historical_jsonl_reread_per_pick=false");
  console.log("live_runtime_mutation_performed=false");
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
