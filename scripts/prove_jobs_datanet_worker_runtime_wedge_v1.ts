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

  // A fixed-size read must not decode a partial UTF-8 code point. Build one
  // record whose four-byte payload character straddles the 4096-byte boundary.
  const utf8JobsFile = path.join(root, "jobs-utf8.jsonl");
  const utf8ReceiptsFile = path.join(root, "receipts-utf8.jsonl");
  const utf8JobStateFile = path.join(root, "job-state-utf8.jsonl");
  fs.writeFileSync(utf8ReceiptsFile, "");
  fs.writeFileSync(utf8JobStateFile, "");
  let utf8Line = "";
  let utf8Plaintext = "";
  for (let filler = 3800; filler < 4200; filler += 1) {
    utf8Plaintext = "x".repeat(filler) + "💥tail";
    utf8Line = JSON.stringify({
      job_id: "utf8_split_job",
      status: "queued",
      account: "proof",
      kind: "datanet_publish",
      input: { plaintext: utf8Plaintext },
    });
    if (Buffer.from(utf8Line).indexOf(Buffer.from("💥")) === 4094) break;
  }
  assert(
    Buffer.from(utf8Line).indexOf(Buffer.from("💥")) === 4094,
    "utf8-fixture-crosses-chunk-boundary",
    `emoji_offset=${Buffer.from(utf8Line).indexOf(Buffer.from("💥"))}`,
  );
  fs.writeFileSync(utf8JobsFile, utf8Line + "\n");
  const utf8Index = new JobsDatanetWorkerRuntimeIndexV1({
    maxScanBytesPerTick: 4096,
    maxJobsPerTick: 4,
    maxSyncCompletionRebuildBytes: 1024 * 1024,
  });
  const utf8Input = {
    jobsFile: utf8JobsFile,
    receiptsFile: utf8ReceiptsFile,
    jobStateFile: utf8JobStateFile,
  };
  const utf8First = utf8Index.scan(utf8Input);
  assert(
    utf8First.jobs.length === 0 && utf8First.retainedState.carryBytes === 4096,
    "split-codepoint-held-as-bytes",
    `jobs=${utf8First.jobs.length} carry=${utf8First.retainedState.carryBytes}`,
  );
  const utf8Second = utf8Index.scan(utf8Input);
  assert(
    utf8Second.jobs.length === 1 &&
      utf8Second.jobs[0]?.job?.input?.plaintext === utf8Plaintext,
    "split-codepoint-round-trips-exactly",
    `jobs=${utf8Second.jobs.length} exact=${utf8Second.jobs[0]?.job?.input?.plaintext === utf8Plaintext}`,
  );

  const carryRewriteJobsFile = path.join(root, "jobs-carry-rewrite.jsonl");
  const carryA = utf8Line;
  const carryB = utf8Line.replace("utf8_split_job", "utf8_split_new");
  assert(
    Buffer.byteLength(carryA) === Buffer.byteLength(carryB),
    "carry-rewrite-fixture-equal-size",
    `bytes=${Buffer.byteLength(carryA)}`,
  );
  fs.writeFileSync(carryRewriteJobsFile, carryA + "\n");
  const carryRewriteIndex = new JobsDatanetWorkerRuntimeIndexV1({
    maxScanBytesPerTick: 4096,
    maxJobsPerTick: 4,
    maxSyncCompletionRebuildBytes: 1024 * 1024,
  });
  const carryRewriteInput = {
    jobsFile: carryRewriteJobsFile,
    receiptsFile: utf8ReceiptsFile,
    jobStateFile: utf8JobStateFile,
  };
  const carryFirst = carryRewriteIndex.scan(carryRewriteInput);
  assert(
    carryFirst.jobs.length === 0 && carryFirst.retainedState.carryBytes === 4096,
    "partial-record-buffered-before-growth",
    `carry=${carryFirst.retainedState.carryBytes}`,
  );
  fs.writeFileSync(
    carryRewriteJobsFile,
    carryB + "\n" +
      JSON.stringify({ job_id: "carry_append", status: "completed" }) + "\n",
  );
  const carrySecond = carryRewriteIndex.scan(carryRewriteInput);
  assert(
    carrySecond.jobs.length === 0 && carrySecond.bytesReadThisTick === 4096,
    "changed-partial-record-resets-before-append",
    `jobs=${carrySecond.jobs.length} bytes=${carrySecond.bytesReadThisTick}`,
  );
  const carryThird = carryRewriteIndex.scan(carryRewriteInput);
  assert(
    carryThird.jobs[0]?.jobId === "utf8_split_new",
    "changed-partial-record-replayed-from-zero",
    `job=${carryThird.jobs[0]?.jobId}`,
  );

  const invalidUtf8JobsFile = path.join(root, "jobs-invalid-utf8.jsonl");
  const invalidPrefix = Buffer.from(
    '{"job_id":"invalid_utf8","status":"queued","input":{"plaintext":"',
    "utf8",
  );
  const invalidSuffix = Buffer.from('"}}\n', "utf8");
  fs.writeFileSync(
    invalidUtf8JobsFile,
    Buffer.concat([invalidPrefix, Buffer.from([0xc3, 0x28]), invalidSuffix]),
  );
  const invalidUtf8Index = new JobsDatanetWorkerRuntimeIndexV1({
    maxScanBytesPerTick: 4096,
    maxSyncCompletionRebuildBytes: 1024 * 1024,
  });
  let invalidUtf8Held = false;
  try {
    invalidUtf8Index.scan({
      jobsFile: invalidUtf8JobsFile,
      receiptsFile: utf8ReceiptsFile,
      jobStateFile: utf8JobStateFile,
    });
  } catch (error: any) {
    invalidUtf8Held = String(error?.message || error).includes(
      "VOID_JOBS_DATANET_WORKER_INVALID_UTF8",
    );
  }
  assert(
    invalidUtf8Held,
    "invalid-utf8-fails-closed",
    `held=${invalidUtf8Held}`,
  );

  // Same-inode, equal-size replacement must invalidate already-materialized
  // pending work and make the replacement record visible from offset zero.
  const rewriteJobsFile = path.join(root, "jobs-rewrite.jsonl");
  const rewriteReceiptsFile = path.join(root, "receipts-rewrite.jsonl");
  const rewriteJobStateFile = path.join(root, "job-state-rewrite.jsonl");
  fs.writeFileSync(rewriteReceiptsFile, "");
  fs.writeFileSync(rewriteJobStateFile, "");
  const rewriteLineA = JSON.stringify({
    job_id: "rewrite_job_a",
    status: "queued",
    account: "proof",
    kind: "datanet_publish",
    input: { plaintext: "payload_a" },
  }) + "\n";
  const rewriteLineB = rewriteLineA
    .replace("rewrite_job_a", "rewrite_job_b")
    .replace("payload_a", "payload_b");
  assert(
    Buffer.byteLength(rewriteLineA) === Buffer.byteLength(rewriteLineB),
    "rewrite-fixture-equal-size",
    `bytes=${Buffer.byteLength(rewriteLineA)}`,
  );
  fs.writeFileSync(rewriteJobsFile, rewriteLineA);
  const rewriteIno = fs.statSync(rewriteJobsFile).ino;
  const rewriteIndex = new JobsDatanetWorkerRuntimeIndexV1({
    maxScanBytesPerTick: 4096,
    maxJobsPerTick: 4,
    maxSyncCompletionRebuildBytes: 1024 * 1024,
  });
  const rewriteInput = {
    jobsFile: rewriteJobsFile,
    receiptsFile: rewriteReceiptsFile,
    jobStateFile: rewriteJobStateFile,
  };
  const rewriteFirst = rewriteIndex.scan(rewriteInput);
  assert(
    rewriteFirst.jobs[0]?.jobId === "rewrite_job_a",
    "rewrite-original-materialized",
    `job=${rewriteFirst.jobs[0]?.jobId}`,
  );
  fs.writeFileSync(rewriteJobsFile, rewriteLineB);
  const rewriteInoAfter = fs.statSync(rewriteJobsFile).ino;
  assert(
    rewriteInoAfter === rewriteIno,
    "rewrite-fixture-preserves-inode",
    `before=${rewriteIno} after=${rewriteInoAfter}`,
  );
  const rewriteSecond = rewriteIndex.scan(rewriteInput);
  assert(
    rewriteSecond.jobs.length === 1 &&
      rewriteSecond.jobs[0]?.jobId === "rewrite_job_b" &&
      rewriteSecond.jobs[0]?.job?.input?.plaintext === "payload_b",
    "equal-size-rewrite-invalidates-stale-pending",
    `jobs=${rewriteSecond.jobs.map((item) => item.jobId).join(",")}`,
  );

  // The transient done bridge is pruned as soon as durable completion truth
  // observes the corresponding record; retained identity state cannot grow
  // with total process-lifetime history.
  const retainedJobsFile = path.join(root, "jobs-retained.jsonl");
  const retainedReceiptsFile = path.join(root, "receipts-retained.jsonl");
  const retainedJobStateFile = path.join(root, "job-state-retained.jsonl");
  fs.writeFileSync(retainedJobsFile, "");
  fs.writeFileSync(retainedReceiptsFile, "");
  fs.writeFileSync(retainedJobStateFile, "");
  const retainedIndex = new JobsDatanetWorkerRuntimeIndexV1({
    maxScanBytesPerTick: 4096,
    maxJobsPerTick: 1,
    maxLocallyDoneIds: 64,
    maxSyncCompletionRebuildBytes: 1024 * 1024,
  });
  const retainedInput = {
    jobsFile: retainedJobsFile,
    receiptsFile: retainedReceiptsFile,
    jobStateFile: retainedJobStateFile,
  };
  let maxRetainedDone = 0;
  for (let i = 0; i < 256; i += 1) {
    const jobId = `retained_${String(i).padStart(4, "0")}`;
    fs.appendFileSync(
      retainedJobsFile,
      JSON.stringify({
        job_id: jobId,
        status: "queued",
        account: "proof",
        kind: "datanet_publish",
        input: { plaintext: `retained_payload_${i}` },
      }) + "\n",
    );
    const queued = retainedIndex.scan(retainedInput);
    if (!queued.ready || queued.jobs[0]?.jobId !== jobId) {
      fail(
        "retained-history-job-materialized",
        `i=${i} ready=${queued.ready} job=${queued.jobs[0]?.jobId}`,
      );
    }
    fs.appendFileSync(
      retainedJobStateFile,
      JSON.stringify({ job_id: jobId, status: "completed" }) + "\n",
    );
    retainedIndex.markDone(jobId);
    const pruned = retainedIndex.scan(retainedInput);
    if (!pruned.ready) {
      fail("retained-history-completion-ready", `i=${i}`);
    }
    maxRetainedDone = Math.max(
      maxRetainedDone,
      pruned.retainedState.locallyDoneIds,
    );
  }
  const retainedFinal = retainedIndex.scan(retainedInput);
  assert(
    maxRetainedDone === 0 &&
      retainedFinal.retainedState.locallyDoneIds === 0 &&
      retainedFinal.retainedState.pendingIds === 0,
    "retained-identity-state-independent-of-history",
    `max_local_done=${maxRetainedDone} final=${JSON.stringify(retainedFinal.retainedState)}`,
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
  assert(
    !helperSource.includes("jobsSeen"),
    "runtime-index-no-history-sized-seen-set",
    "jobsSeen absent",
  );
  assert(
    helperSource.includes("VOID_JOBS_DATANET_WORKER_EQUAL_SIZE_REWRITE_RESET_V1") &&
      helperSource.includes("VOID_JOBS_DATANET_WORKER_PENDING_SOURCE_WITNESS_V1") &&
      helperSource.includes("VOID_JOBS_DATANET_WORKER_CARRY_SOURCE_WITNESS_V1"),
    "runtime-index-source-continuity-guards",
    "rewrite reset and pending source witness present",
  );
  assert(
    helperSource.includes("VOID_JOBS_DATANET_WORKER_INVALID_UTF8") &&
      helperSource.includes("maxLocallyDoneIds"),
    "runtime-index-byte-and-retention-guards",
    "fatal UTF-8 and retained-ID cap present",
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
