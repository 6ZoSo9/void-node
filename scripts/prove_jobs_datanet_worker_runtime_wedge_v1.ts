import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { readFileSync } from "node:fs";
import { JobsDatanetWorkerRuntimeIndexV1 } from "../src/http/jobs_datanet_worker_runtime_index_v1.js";

const ID = "VOID_JOBS_DATANET_WORKER_RUNTIME_WEDGE_V1";
const root = fs.mkdtempSync(path.join(os.tmpdir(), "void-jobs-worker-index-"));
const jobsFile = path.join(root, "jobs.jsonl");
const receiptsFile = path.join(root, "receipts.jsonl");
const jobStateFile = path.join(root, "job_state.jsonl");

function fail(name: string, detail: string): never {
  console.error(`[FAIL] ${name}: ${detail}`);
  process.exit(1);
}
function pass(name: string, detail: string): void {
  console.log(`[PASS] ${name}: ${detail}`);
}
function assert(cond: unknown, name: string, detail: string): void {
  if (!cond) fail(name, detail);
  pass(name, detail);
}
function repeatToBytes(line: string, bytes: number): string {
  const one = Buffer.byteLength(line, "utf8");
  const count = Math.max(1, Math.ceil(bytes / one));
  return line.repeat(count);
}
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

try {
  const completedLine =
    JSON.stringify({ job_id: "job_done", status: "completed" }) + "\n";
  const queuedFiller =
    JSON.stringify({ job_id: "completion_filler", status: "queued" }) + "\n";
  fs.writeFileSync(
    receiptsFile,
    completedLine + repeatToBytes(queuedFiller, 256 * 1024),
  );
  fs.writeFileSync(
    jobStateFile,
    repeatToBytes(queuedFiller, 256 * 1024),
  );

  const jobs: string[] = [];
  jobs.push(JSON.stringify({
    job_id: "job_done",
    status: "queued",
    account: "proof",
    kind: "datanet_publish",
    input: { plaintext: "done" },
  }));
  for (let i = 0; i < 9000; i += 1) {
    jobs.push(JSON.stringify({
      job_id: `job_${String(i).padStart(6, "0")}`,
      status: "queued",
      account: "proof",
      kind: "datanet_publish",
      input: { plaintext: `payload_${i}` },
    }));
  }
  fs.writeFileSync(jobsFile, jobs.join("\n") + "\n");

  const index = new JobsDatanetWorkerRuntimeIndexV1({
    maxScanBytesPerTick: 32 * 1024,
    maxJobsPerTick: 4,
    maxSyncCompletionRebuildBytes: 32 * 1024,
    completionRebuildBackoffMs: 5,
  });

  const input = { jobsFile, receiptsFile, jobStateFile };

  let eventLoopTicks = 0;
  const ticker = setInterval(() => { eventLoopTicks += 1; }, 1);

  const firstStarted = Date.now();
  let snapshot = index.scan(input);
  const firstMs = Date.now() - firstStarted;

  assert(
    snapshot.ready === false,
    "large-completion-first-scan-holds",
    `ready=${snapshot.ready} first_ms=${firstMs}`,
  );
  assert(
    snapshot.bytesReadThisTick === 0,
    "hold-does-not-scan-jobs-history",
    `bytes=${snapshot.bytesReadThisTick}`,
  );

  for (let i = 0; i < 500 && !snapshot.ready; i += 1) {
    await sleep(2);
    snapshot = index.scan(input);
  }
  clearInterval(ticker);

  assert(
    snapshot.ready === true,
    "completion-warm-eventually-ready",
    `ready=${snapshot.ready}`,
  );
  assert(
    eventLoopTicks > 0,
    "async-completion-warm-yields",
    `timer_ticks=${eventLoopTicks}`,
  );
  assert(
    Number(snapshot.completionIo?.sync_bytes_read_total || 0) === 0,
    "large-completion-history-not-sync-read",
    `sync_bytes=${snapshot.completionIo?.sync_bytes_read_total || 0}`,
  );
  assert(
    snapshot.doneTruthHas("job_done") === true,
    "completed-truth-preserved",
    "job_done=true",
  );
  assert(
    snapshot.jobs.every((x) => x.jobId !== "job_done"),
    "completed-job-not-requeued",
    `jobs=${snapshot.jobs.map((x) => x.jobId).join(",")}`,
  );
  assert(
    snapshot.bytesReadThisTick <= 32 * 1024,
    "jobs-scan-byte-budget",
    `bytes=${snapshot.bytesReadThisTick}`,
  );
  assert(
    snapshot.jobs.length <= 4,
    "jobs-per-tick-budget",
    `jobs=${snapshot.jobs.length}`,
  );
  assert(
    snapshot.scanComplete === false,
    "large-jobs-backlog-incremental",
    `scan_complete=${snapshot.scanComplete}`,
  );

  const firstBatch = snapshot.jobs.map((x) => x.jobId);
  const firstChunkBytesTotal = snapshot.bytesReadTotal;
  for (const jobId of firstBatch) index.markDone(jobId);
  let next = index.scan(input);
  assert(
    next.bytesReadThisTick === 0,
    "pending-backlog-pauses-ledger-advance",
    `bytes=${next.bytesReadThisTick}`,
  );
  assert(
    next.bytesReadTotal === firstChunkBytesTotal,
    "pending-backlog-preserves-ledger-byte-total",
    `before=${firstChunkBytesTotal} after=${next.bytesReadTotal}`,
  );
  assert(
    next.jobs.length > 0 && next.jobs.length <= 4,
    "pending-backlog-remains-process-bounded",
    `jobs=${next.jobs.length}`,
  );
  assert(
    next.jobs.every((x) => !firstBatch.includes(x.jobId)),
    "locally-done-jobs-not-requeued",
    `first=${firstBatch.length} next=${next.jobs.length}`,
  );

  let drainTicks = 0;
  while (next.bytesReadThisTick === 0 && drainTicks < 1000) {
    for (const item of next.jobs) index.markDone(item.jobId);
    next = index.scan(input);
    drainTicks += 1;
  }
  assert(
    drainTicks > 0 && drainTicks < 1000,
    "pending-backlog-drains-within-proof-bound",
    `drain_ticks=${drainTicks}`,
  );
  assert(
    next.bytesReadThisTick > 0 &&
      next.bytesReadThisTick <= 32 * 1024,
    "ledger-advance-resumes-after-pending-drain",
    `bytes=${next.bytesReadThisTick}`,
  );
  assert(
    next.bytesReadTotal > firstChunkBytesTotal,
    "ledger-byte-total-advances-after-pending-drain",
    `before=${firstChunkBytesTotal} after=${next.bytesReadTotal}`,
  );

  // One malformed newline-terminated row must not abort the already-consumed
  // chunk and permanently skip a valid row that follows it.
  const malformedJobsFile = path.join(root, "jobs-malformed.jsonl");
  const malformedReceiptsFile = path.join(root, "receipts-malformed.jsonl");
  const malformedJobStateFile = path.join(root, "job-state-malformed.jsonl");
  fs.writeFileSync(malformedReceiptsFile, "");
  fs.writeFileSync(malformedJobStateFile, "");
  const validBefore = JSON.stringify({
    job_id: "malformed_valid_before",
    status: "queued",
    account: "proof",
    kind: "datanet_publish",
    input: { plaintext: "before" },
  });
  const invalidMiddle = '{"job_id":"malformed_broken",';
  const validAfter = JSON.stringify({
    job_id: "malformed_valid_after",
    status: "queued",
    account: "proof",
    kind: "datanet_publish",
    input: { plaintext: "after" },
  });
  const malformedFixture =
    [validBefore, invalidMiddle, validAfter].join("\n") + "\n";
  fs.writeFileSync(malformedJobsFile, malformedFixture);

  const malformedIndex = new JobsDatanetWorkerRuntimeIndexV1({
    maxScanBytesPerTick: 64 * 1024,
    maxJobsPerTick: 8,
    maxSyncCompletionRebuildBytes: 1024 * 1024,
    completionRebuildBackoffMs: 5,
  });
  const malformedSnapshot = malformedIndex.scan({
    jobsFile: malformedJobsFile,
    receiptsFile: malformedReceiptsFile,
    jobStateFile: malformedJobStateFile,
  });
  const malformedIds = malformedSnapshot.jobs.map((x) => x.jobId);
  assert(
    malformedSnapshot.ready === true,
    "malformed-row-scan-remains-ready",
    `ready=${malformedSnapshot.ready}`,
  );
  assert(
    malformedSnapshot.scanComplete === true,
    "malformed-row-same-chunk-consumed",
    `scan_complete=${malformedSnapshot.scanComplete} bytes=${malformedSnapshot.bytesReadThisTick}`,
  );
  assert(
    malformedIds.includes("malformed_valid_before"),
    "valid-before-malformed-row-preserved",
    `jobs=${malformedIds.join(",")}`,
  );
  assert(
    malformedIds.includes("malformed_valid_after"),
    "valid-after-malformed-row-preserved",
    `jobs=${malformedIds.join(",")}`,
  );
  assert(
    !malformedIds.includes("malformed_broken"),
    "malformed-row-not-materialized",
    `jobs=${malformedIds.join(",")}`,
  );

  const indexSource = readFileSync("src/index.ts", "utf8");
  const workerStart = indexSource.indexOf("  function startWorker(){");
  const workerEnd = indexSource.indexOf("  function mount(){", workerStart);
  if (workerStart < 0 || workerEnd < 0) {
    fail("automatic-worker-source-located", `start=${workerStart} end=${workerEnd}`);
  }
  const automaticWorker = indexSource.slice(workerStart, workerEnd);

  assert(
    automaticWorker.includes("getBackgroundWorkerIndexV1"),
    "automatic-worker-uses-bounded-index",
    "getBackgroundWorkerIndexV1 present",
  );
  assert(
    !automaticWorker.includes("scanQueuedJobsIncremental()"),
    "automatic-worker-no-legacy-incremental-entry",
    "legacy incremental call absent",
  );
  assert(
    !automaticWorker.includes("listQueuedJobsFullScan()"),
    "automatic-worker-no-full-scan-fallback",
    "full scan fallback absent",
  );
  assert(
    automaticWorker.includes("processJob(jobId, {"),
    "automatic-worker-passes-resolved-context",
    "resolved job/completion context passed",
  );

  const processStart = indexSource.indexOf("  async function processJob(jobId:string, workerCtx:any=null){");
  const processEnd = indexSource.indexOf("\n  function startWorker(){", processStart);
  if (processStart < 0 || processEnd < 0) {
    fail("process-job-source-located", `start=${processStart} end=${processEnd}`);
  }
  const processSource = indexSource.slice(processStart, processEnd);
  assert(
    processSource.includes("workerCompletedTruthHas"),
    "process-job-context-completion-truth",
    "workerCompletedTruthHas present",
  );
  assert(
    processSource.includes("VOID_JOBS_DATANET_WORKER_COMPLETION_HOLD"),
    "process-job-completion-hold-rethrows",
    "completion hold is not converted to failed job state",
  );

  const helperSource = readFileSync(
    "src/http/jobs_datanet_worker_runtime_index_v1.ts",
    "utf8",
  );
  assert(
    !helperSource.includes("readFileSync("),
    "runtime-index-no-whole-file-read",
    "readFileSync absent",
  );
  assert(
    helperSource.includes("maxScanBytesPerTick"),
    "runtime-index-byte-budget-source",
    "maxScanBytesPerTick present",
  );
  assert(
    helperSource.includes("VOID_JOBS_DATANET_WORKER_MALFORMED_ROW_SKIP_V1"),
    "runtime-index-malformed-row-skip-source",
    "per-row malformed JSON skip marker present",
  );
  assert(
    helperSource.includes("VOID_JOBS_DATANET_WORKER_PENDING_BACKPRESSURE_V1"),
    "runtime-index-pending-backpressure-source",
    "pending backlog pauses history advancement",
  );

  const semanticSource = readFileSync(
    "src/http/agent_pick2_jsonl_semantic_index_v1.ts",
    "utf8",
  );
  assert(
    semanticSource.includes("completionTruthSnapshotV1(files: string[])"),
    "semantic-completion-only-api-present",
    "completionTruthSnapshotV1 present",
  );

  console.log(
    `${ID}_GREEN ` +
      JSON.stringify({
        event_loop_ticks: eventLoopTicks,
        first_scan_ms: firstMs,
        first_batch_jobs: snapshot.jobs.length,
        jobs_scan_bytes: snapshot.bytesReadThisTick,
        completion_sync_history_bytes:
          Number(snapshot.completionIo?.sync_bytes_read_total || 0),
        live_runtime_mutation_performed: false,
      }),
  );
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
