import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { readFileSync } from "node:fs";
import { JobsDatanetWorkerRuntimeIndexV1 } from "../src/http/jobs_datanet_worker_runtime_index_v1.js";
import { appendAgentPick2JsonlCanonicalV1 } from "../src/http/agent_pick2_jsonl_semantic_index_v1.js";

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
    carrySecond.ready === false && carrySecond.bytesReadThisTick === 0,
    "changed-partial-record-growth-holds-first",
    `ready=${carrySecond.ready} hold=${carrySecond.holdReason}`,
  );
  const carryThird = carryRewriteIndex.scan(carryRewriteInput);
  assert(
    carryThird.jobs.length === 0 && carryThird.bytesReadThisTick === 4096,
    "changed-partial-record-resets-before-replay",
    `jobs=${carryThird.jobs.length} bytes=${carryThird.bytesReadThisTick}`,
  );
  const carryFourth = carryRewriteIndex.scan(carryRewriteInput);
  assert(
    carryFourth.jobs[0]?.jobId === "utf8_split_new",
    "changed-partial-record-replayed-from-zero",
    `job=${carryFourth.jobs[0]?.jobId}`,
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
    const invalid = invalidUtf8Index.scan({
      jobsFile: invalidUtf8JobsFile,
      receiptsFile: utf8ReceiptsFile,
      jobStateFile: utf8JobStateFile,
    });
    invalidUtf8Held =
      invalid.ready === false &&
      String(invalid.holdReason || "").includes("COMPLETION_INVALID_UTF8");
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
    rewriteSecond.ready === false,
    "equal-size-rewrite-holds-first",
    `ready=${rewriteSecond.ready} hold=${rewriteSecond.holdReason}`,
  );
  const rewriteThird = rewriteIndex.scan(rewriteInput);
  assert(
    rewriteThird.jobs.length === 1 &&
      rewriteThird.jobs[0]?.jobId === "rewrite_job_b" &&
      rewriteThird.jobs[0]?.job?.input?.plaintext === "payload_b",
    "equal-size-rewrite-invalidates-stale-pending",
    `jobs=${rewriteThird.jobs.map((item) => item.jobId).join(",")}`,
  );

  // Reproduce the production scan -> completion check -> cached-payload use
  // sequence. A canonical mutation after the completion check but before the
  // first job-property use must revoke the returned capability, clear stale
  // pending state, and prevent the simulated side effect.
  const checkUseJobsFile = path.join(root, "jobs-check-use.jsonl");
  const checkUseReceiptsFile = path.join(root, "receipts-check-use.jsonl");
  const checkUseJobStateFile = path.join(root, "job-state-check-use.jsonl");
  fs.writeFileSync(checkUseReceiptsFile, "");
  fs.writeFileSync(checkUseJobStateFile, "");
  const checkUseLineA = JSON.stringify({
    job_id: "check_use_job_a",
    status: "queued",
    account: "proof",
    kind: "datanet_publish",
    input: { plaintext: "payload_a" },
  }) + "\n";
  const checkUseLineB = checkUseLineA
    .replace("check_use_job_a", "check_use_job_b")
    .replace("payload_a", "payload_b");
  assert(
    Buffer.byteLength(checkUseLineA) === Buffer.byteLength(checkUseLineB),
    "check-use-fixture-equal-size",
    `bytes=${Buffer.byteLength(checkUseLineA)}`,
  );
  fs.writeFileSync(checkUseJobsFile, checkUseLineA);
  const checkUseIndex = new JobsDatanetWorkerRuntimeIndexV1({
    maxScanBytesPerTick: 4096,
    maxSyncCompletionRebuildBytes: 1024 * 1024,
  });
  const checkUseInput = {
    jobsFile: checkUseJobsFile,
    receiptsFile: checkUseReceiptsFile,
    jobStateFile: checkUseJobStateFile,
  };
  const checkUseBatch = checkUseIndex.scan(checkUseInput);
  const checkUseItem = checkUseBatch.jobs[0];
  assert(
    checkUseItem?.jobId === "check_use_job_a" &&
      checkUseIndex.completionHasV1(checkUseInput, checkUseItem.jobId) === false,
    "check-use-original-authority-admitted",
    `job=${checkUseItem?.jobId}`,
  );
  fs.writeFileSync(checkUseJobsFile, checkUseLineB);
  let checkUseHeld = false;
  let simulatedSideEffects = 0;
  try {
    if (String(checkUseItem.job.status || "") === "queued") {
      simulatedSideEffects += 1;
    }
  } catch (error: any) {
    checkUseHeld = String(error?.message || error).includes(
      "VOID_JOBS_DATANET_WORKER_PENDING_USE_AUTHORITY_CHANGED",
    );
  }
  assert(
    checkUseHeld && simulatedSideEffects === 0,
    "pending-use-boundary-revalidates-canonical-generation",
    `held=${checkUseHeld} side_effects=${simulatedSideEffects}`,
  );
  const checkUseReplacement = checkUseIndex.scan(checkUseInput);
  assert(
    checkUseReplacement.ready &&
      checkUseReplacement.jobs[0]?.jobId === "check_use_job_b" &&
      checkUseReplacement.jobs[0]?.job?.input?.plaintext === "payload_b",
    "pending-use-race-quarantines-stale-and-rescans",
    `ready=${checkUseReplacement.ready} job=${checkUseReplacement.jobs[0]?.jobId}`,
  );

  // A fixed tail sample is not sufficient append authority. Rewrite an older
  // row outside the final 8 KiB, preserve the tail exactly, then append a new
  // queued row with an uncooperative writer. The runtime must HOLD before it
  // can advance from the previously admitted cursor.
  const prefixJobsFile = path.join(root, "jobs-prefix-authority.jsonl");
  const prefixReceiptsFile = path.join(root, "receipts-prefix-authority.jsonl");
  const prefixJobStateFile = path.join(root, "job-state-prefix-authority.jsonl");
  fs.writeFileSync(prefixReceiptsFile, "");
  fs.writeFileSync(prefixJobStateFile, "");
  const prefixRows = Array.from({ length: 320 }, (_, i) =>
    JSON.stringify({
      job_id: `prefix_${String(i).padStart(4, "0")}`,
      status: "completed",
      payload: "x".repeat(64),
    }),
  );
  fs.writeFileSync(prefixJobsFile, prefixRows.join("\n") + "\n");
  assert(
    fs.statSync(prefixJobsFile).size > 16 * 1024,
    "prefix-authority-fixture-exceeds-tail-window",
    `bytes=${fs.statSync(prefixJobsFile).size}`,
  );
  const prefixIndex = new JobsDatanetWorkerRuntimeIndexV1({
    maxScanBytesPerTick: 64 * 1024,
    maxSyncCompletionRebuildBytes: 1024 * 1024,
  });
  const prefixInput = {
    jobsFile: prefixJobsFile,
    receiptsFile: prefixReceiptsFile,
    jobStateFile: prefixJobStateFile,
  };
  const prefixFirst = prefixIndex.scan(prefixInput);
  assert(
    prefixFirst.ready && prefixFirst.scanComplete,
    "prefix-authority-baseline-admitted",
    `ready=${prefixFirst.ready} complete=${prefixFirst.scanComplete}`,
  );
  const prefixOriginal = Buffer.from(prefixRows[0], "utf8");
  const prefixMutated = Buffer.from(
    prefixRows[0].replace("prefix_0000", "mutant_0000"),
    "utf8",
  );
  assert(
    prefixOriginal.length === prefixMutated.length,
    "prefix-authority-rewrite-equal-size",
    `bytes=${prefixOriginal.length}`,
  );
  const prefixFd = fs.openSync(prefixJobsFile, "r+");
  try {
    fs.writeSync(prefixFd, prefixMutated, 0, prefixMutated.length, 0);
  } finally {
    fs.closeSync(prefixFd);
  }
  fs.appendFileSync(
    prefixJobsFile,
    JSON.stringify({ job_id: "prefix_attack_append", status: "queued" }) + "\n",
  );
  const prefixHeld = prefixIndex.scan(prefixInput);
  assert(
    prefixHeld.ready === false && prefixHeld.jobs.length === 0,
    "older-prefix-rewrite-plus-growth-holds",
    `ready=${prefixHeld.ready} hold=${prefixHeld.holdReason}`,
  );

  const canonicalJobsFile = path.join(root, "jobs-canonical-growth.jsonl");
  const canonicalReceiptsFile = path.join(root, "receipts-canonical-growth.jsonl");
  const canonicalJobStateFile = path.join(root, "job-state-canonical-growth.jsonl");
  fs.writeFileSync(canonicalJobsFile, "");
  fs.writeFileSync(canonicalReceiptsFile, "");
  fs.writeFileSync(canonicalJobStateFile, "");
  const canonicalIndex = new JobsDatanetWorkerRuntimeIndexV1({
    maxScanBytesPerTick: 4096,
    maxSyncCompletionRebuildBytes: 1024 * 1024,
  });
  const canonicalInput = {
    jobsFile: canonicalJobsFile,
    receiptsFile: canonicalReceiptsFile,
    jobStateFile: canonicalJobStateFile,
  };
  assert(
    canonicalIndex.scan(canonicalInput).ready,
    "canonical-growth-baseline-admitted",
    "empty generation ready",
  );
  appendAgentPick2JsonlCanonicalV1(
    canonicalJobsFile,
    JSON.stringify({ job_id: "canonical_append", status: "queued" }) + "\n",
  );
  const canonicalGrowth = canonicalIndex.scan(canonicalInput);
  assert(
    canonicalGrowth.ready && canonicalGrowth.jobs[0]?.jobId === "canonical_append",
    "canonical-witnessed-growth-advances",
    `ready=${canonicalGrowth.ready} job=${canonicalGrowth.jobs[0]?.jobId}`,
  );

  // A large completion warm owns one monotonic generation and catches up
  // canonical append deltas. Legitimate active appends must not restart the
  // full-history scan from byte zero.
  const warmJobsFile = path.join(root, "jobs-warm-growth.jsonl");
  const warmReceiptsFile = path.join(root, "receipts-warm-growth.jsonl");
  const warmJobStateFile = path.join(root, "job-state-warm-growth.jsonl");
  fs.writeFileSync(warmJobsFile, "");
  fs.writeFileSync(warmReceiptsFile, "");
  fs.writeFileSync(
    warmJobStateFile,
    repeatToBytes(
      JSON.stringify({ job_id: "warm_filler", status: "queued" }) + "\n",
      512 * 1024,
    ),
  );
  const warmIndex = new JobsDatanetWorkerRuntimeIndexV1({
    maxScanBytesPerTick: 4096,
    maxSyncCompletionRebuildBytes: 4096,
    completionRebuildBackoffMs: 5,
  });
  const warmInput = {
    jobsFile: warmJobsFile,
    receiptsFile: warmReceiptsFile,
    jobStateFile: warmJobStateFile,
  };
  const warmFirst = warmIndex.scan(warmInput);
  assert(
    warmFirst.ready === false,
    "active-append-warm-starts-held",
    `hold=${warmFirst.holdReason}`,
  );
  const warmInitialFullHistoryStarts = Number(
    warmFirst.completionIo?.async_full_history_starts_total || 0,
  );
  assert(
    warmInitialFullHistoryStarts === 1,
    "active-append-warm-records-one-byte-zero-start",
    `full_starts=${warmInitialFullHistoryStarts}`,
  );
  let lastWarmId = "";
  for (let i = 0; i < 40; i += 1) {
    lastWarmId = `warm_completed_${String(i).padStart(3, "0")}`;
    appendAgentPick2JsonlCanonicalV1(
      warmJobStateFile,
      JSON.stringify({ job_id: lastWarmId, status: "completed" }) + "\n",
    );
    if (i % 4 === 0) await sleep(0);
  }
  let warmReady = warmIndex.scan(warmInput);
  for (let i = 0; i < 1000 && !warmReady.ready; i += 1) {
    await sleep(1);
    warmReady = warmIndex.scan(warmInput);
  }
  assert(
    warmReady.ready && warmReady.doneTruthHas(lastWarmId),
    "active-append-warm-catches-up",
    `ready=${warmReady.ready} last_done=${warmReady.doneTruthHas(lastWarmId)}`,
  );
  assert(
    Number(warmReady.completionIo?.async_full_history_starts_total || 0) ===
      warmInitialFullHistoryStarts,
    "active-append-warm-does-not-reread-prefix-from-zero",
    `full_starts=${warmReady.completionIo?.async_full_history_starts_total} warms=${warmReady.completionIo?.async_warms_total}`,
  );

  // Deterministically land a second canonical append after admitSourceV1's
  // first path stamp but before its semantic-authority/current sample. The
  // exact witness chain must advance the owned warm without rejection,
  // backoff, or a later byte-zero restart.
  const admissionRaceJobsFile = path.join(root, "jobs-admission-race.jsonl");
  const admissionRaceReceiptsFile = path.join(
    root,
    "receipts-admission-race.jsonl",
  );
  const admissionRaceJobStateFile = path.join(
    root,
    "job-state-admission-race.jsonl",
  );
  fs.writeFileSync(admissionRaceJobsFile, "");
  fs.writeFileSync(admissionRaceReceiptsFile, "");
  fs.writeFileSync(
    admissionRaceJobStateFile,
    repeatToBytes(
      JSON.stringify({ job_id: "admission_race_filler", status: "queued" }) +
        "\n",
      512 * 1024,
    ),
  );
  let admissionRaceArmed = false;
  let admissionRaceFired = false;
  const admissionRaceSecondId = "admission_race_second_append";
  const admissionRaceIndex = new JobsDatanetWorkerRuntimeIndexV1({
    maxScanBytesPerTick: 4096,
    maxSyncCompletionRebuildBytes: 4096,
    completionRebuildBackoffMs: 5000,
    testHooks: {
      afterSourceObserved: ({ file }) => {
        if (
          !admissionRaceArmed ||
          admissionRaceFired ||
          path.resolve(file) !== path.resolve(admissionRaceJobStateFile)
        ) return;
        admissionRaceFired = true;
        appendAgentPick2JsonlCanonicalV1(
          admissionRaceJobStateFile,
          JSON.stringify({
            job_id: admissionRaceSecondId,
            status: "completed",
          }) + "\n",
        );
      },
    },
  });
  const admissionRaceInput = {
    jobsFile: admissionRaceJobsFile,
    receiptsFile: admissionRaceReceiptsFile,
    jobStateFile: admissionRaceJobStateFile,
  };
  const admissionRaceFirst = admissionRaceIndex.scan(admissionRaceInput);
  assert(
    admissionRaceFirst.ready === false &&
      Number(
        admissionRaceFirst.completionIo?.async_full_history_starts_total || 0,
      ) === 1,
    "append-admission-race-warm-starts-once",
    `ready=${admissionRaceFirst.ready} io=${JSON.stringify(admissionRaceFirst.completionIo)}`,
  );
  admissionRaceArmed = true;
  const admissionRaceFirstId = "admission_race_first_append";
  appendAgentPick2JsonlCanonicalV1(
    admissionRaceJobStateFile,
    JSON.stringify({
      job_id: admissionRaceFirstId,
      status: "completed",
    }) + "\n",
  );
  let admissionRaceReady = admissionRaceIndex.scan(admissionRaceInput);
  for (let i = 0; i < 1000 && !admissionRaceReady.ready; i += 1) {
    await sleep(1);
    admissionRaceReady = admissionRaceIndex.scan(admissionRaceInput);
  }
  assert(
    admissionRaceFired &&
      admissionRaceReady.ready &&
      admissionRaceReady.doneTruthHas(admissionRaceFirstId) &&
      admissionRaceReady.doneTruthHas(admissionRaceSecondId),
    "append-admission-race-catches-up-exact-chain",
    `fired=${admissionRaceFired} ready=${admissionRaceReady.ready} first=${admissionRaceReady.doneTruthHas(admissionRaceFirstId)} second=${admissionRaceReady.doneTruthHas(admissionRaceSecondId)} hold=${admissionRaceReady.holdReason}`,
  );
  assert(
    Number(
      admissionRaceReady.completionIo?.async_full_history_starts_total || 0,
    ) === 1,
    "append-admission-race-does-not-restart-from-zero",
    `io=${JSON.stringify(admissionRaceReady.completionIo)}`,
  );

  // A later warm may legitimately start again when it begins at the exact
  // prior admitted size. Prove that task count and full-history restart count
  // are distinct contracts.
  const incrementalWarmId = "warm_incremental_second_task";
  appendAgentPick2JsonlCanonicalV1(
    warmJobStateFile,
    JSON.stringify({
      job_id: incrementalWarmId,
      status: "completed",
      payload: "i".repeat(8192),
    }) + "\n",
  );
  let incrementalWarm = warmIndex.scan(warmInput);
  assert(
    incrementalWarm.ready === false,
    "incremental-second-warm-starts-held",
    `ready=${incrementalWarm.ready} hold=${incrementalWarm.holdReason}`,
  );
  for (let i = 0; i < 1000 && !incrementalWarm.ready; i += 1) {
    await sleep(1);
    incrementalWarm = warmIndex.scan(warmInput);
  }
  assert(
    incrementalWarm.ready &&
      incrementalWarm.doneTruthHas(incrementalWarmId) &&
      Number(incrementalWarm.completionIo?.async_warms_total || 0) >= 2 &&
      Number(
        incrementalWarm.completionIo?.async_incremental_starts_total || 0,
      ) >= 1 &&
      Number(
        incrementalWarm.completionIo?.async_full_history_starts_total || 0,
      ) === warmInitialFullHistoryStarts,
    "incremental-second-warm-does-not-count-as-history-restart",
    `ready=${incrementalWarm.ready} io=${JSON.stringify(incrementalWarm.completionIo)}`,
  );

  // An uncooperative mutation while the warm owns its generation must not
  // publish stale completion truth. The task rejects into a bounded backoff
  // HOLD instead of silently accepting the rewritten prefix.
  const hostileWarmJobsFile = path.join(root, "jobs-hostile-warm.jsonl");
  const hostileWarmReceiptsFile = path.join(root, "receipts-hostile-warm.jsonl");
  const hostileWarmJobStateFile = path.join(root, "job-state-hostile-warm.jsonl");
  fs.writeFileSync(hostileWarmJobsFile, "");
  fs.writeFileSync(hostileWarmReceiptsFile, "");
  fs.writeFileSync(
    hostileWarmJobStateFile,
    repeatToBytes(
      JSON.stringify({ job_id: "hostile_filler", status: "queued" }) + "\n",
      512 * 1024,
    ),
  );
  const hostileWarmIndex = new JobsDatanetWorkerRuntimeIndexV1({
    maxScanBytesPerTick: 4096,
    maxSyncCompletionRebuildBytes: 4096,
    completionRebuildBackoffMs: 5000,
  });
  const hostileWarmInput = {
    jobsFile: hostileWarmJobsFile,
    receiptsFile: hostileWarmReceiptsFile,
    jobStateFile: hostileWarmJobStateFile,
  };
  assert(
    hostileWarmIndex.scan(hostileWarmInput).ready === false,
    "hostile-warm-starts-held",
    "large generation warming",
  );
  const hostileFd = fs.openSync(hostileWarmJobStateFile, "r+");
  try {
    const replacement = Buffer.from("{\"job_id\":\"hostile_mutation\"}", "utf8");
    fs.writeSync(hostileFd, replacement, 0, replacement.length, 0);
  } finally {
    fs.closeSync(hostileFd);
  }
  let hostileHeld = hostileWarmIndex.scan(hostileWarmInput);
  for (
    let i = 0;
    i < 200 &&
    !String(hostileHeld.holdReason || "").includes("REBUILD_BACKOFF");
    i += 1
  ) {
    await sleep(1);
    hostileHeld = hostileWarmIndex.scan(hostileWarmInput);
  }
  assert(
    hostileHeld.ready === false &&
      String(hostileHeld.holdReason || "").includes("REBUILD_BACKOFF"),
    "hostile-warm-mutation-fails-closed",
    `ready=${hostileHeld.ready} hold=${hostileHeld.holdReason}`,
  );

  // A rejected incremental warm must not advance its rejected observation to
  // the admission baseline. Hold hostile B stable through backoff and prove
  // that recovery starts from byte zero instead of self-authorizing B -> B as
  // an incremental successor to the still-readable trusted G authority.
  const rejectedRetryJobsFile = path.join(root, "jobs-rejected-retry.jsonl");
  const rejectedRetryReceiptsFile = path.join(
    root,
    "receipts-rejected-retry.jsonl",
  );
  const rejectedRetryStateFile = path.join(
    root,
    "job-state-rejected-retry.jsonl",
  );
  fs.writeFileSync(rejectedRetryJobsFile, "");
  fs.writeFileSync(rejectedRetryReceiptsFile, "");
  const rejectedBaseId = "rejected_base_a";
  const rejectedMutatedId = "rejected_base_b";
  const rejectedTailId = "rejected_tail";
  const rejectedBaseLine =
    JSON.stringify({ job_id: rejectedBaseId, status: "completed" }) + "\n";
  const rejectedMutatedLine =
    JSON.stringify({ job_id: rejectedMutatedId, status: "completed" }) + "\n";
  assert(
    Buffer.byteLength(rejectedBaseLine) === Buffer.byteLength(rejectedMutatedLine),
    "rejected-retry-prefix-fixture-equal-size",
    `base=${Buffer.byteLength(rejectedBaseLine)} mutated=${Buffer.byteLength(rejectedMutatedLine)}`,
  );
  fs.writeFileSync(rejectedRetryStateFile, rejectedBaseLine);
  let rejectedPrefixMutated = false;
  const rejectedRetryIndex = new JobsDatanetWorkerRuntimeIndexV1({
    maxScanBytesPerTick: 4096,
    maxSyncCompletionRebuildBytes: 4096,
    completionRebuildBackoffMs: 5,
    testHooks: {
      beforeCompletionDeltaLeafWrite: ({ file, id }) => {
        if (
          rejectedPrefixMutated ||
          file !== rejectedRetryStateFile ||
          id !== rejectedTailId
        ) {
          return;
        }
        rejectedPrefixMutated = true;
        const fd = fs.openSync(rejectedRetryStateFile, "r+");
        try {
          const replacement = Buffer.from(rejectedMutatedLine, "utf8");
          fs.writeSync(fd, replacement, 0, replacement.length, 0);
        } finally {
          fs.closeSync(fd);
        }
      },
    },
  });
  const rejectedRetryInput = {
    jobsFile: rejectedRetryJobsFile,
    receiptsFile: rejectedRetryReceiptsFile,
    jobStateFile: rejectedRetryStateFile,
  };
  const rejectedTrustedG = rejectedRetryIndex.scan(rejectedRetryInput);
  assert(
    rejectedTrustedG.ready &&
      rejectedTrustedG.doneTruthHas(rejectedBaseId) &&
      !rejectedTrustedG.doneTruthHas(rejectedMutatedId) &&
      !rejectedTrustedG.doneTruthHas(rejectedTailId),
    "rejected-retry-trusted-generation-established",
    `ready=${rejectedTrustedG.ready}`,
  );
  appendAgentPick2JsonlCanonicalV1(
    rejectedRetryStateFile,
    JSON.stringify({
      job_id: rejectedTailId,
      status: "completed",
      payload: "r".repeat(8192),
    }) + "\n",
  );
  let rejectedRetry = rejectedRetryIndex.scan(rejectedRetryInput);
  assert(
    rejectedRetry.ready === false,
    "rejected-retry-incremental-warm-starts-held",
    `hold=${rejectedRetry.holdReason}`,
  );
  for (
    let i = 0;
    i < 1000 &&
    !String(rejectedRetry.holdReason || "").includes("REBUILD_BACKOFF");
    i += 1
  ) {
    await sleep(1);
    rejectedRetry = rejectedRetryIndex.scan(rejectedRetryInput);
  }
  const rejectedIncrementalStarts = Number(
    rejectedRetry.completionIo?.async_incremental_starts_total || 0,
  );
  const rejectedFullStarts = Number(
    rejectedRetry.completionIo?.async_full_history_starts_total || 0,
  );
  assert(
    rejectedPrefixMutated &&
      rejectedRetry.ready === false &&
      String(rejectedRetry.holdReason || "").includes("REBUILD_BACKOFF") &&
      rejectedTrustedG.doneTruthHas(rejectedBaseId) &&
      !rejectedTrustedG.doneTruthHas(rejectedMutatedId) &&
      !rejectedTrustedG.doneTruthHas(rejectedTailId),
    "rejected-retry-first-rejection-preserves-trusted-generation",
    `mutated=${rejectedPrefixMutated} hold=${rejectedRetry.holdReason}`,
  );
  await sleep(10);
  rejectedRetry = rejectedRetryIndex.scan(rejectedRetryInput);
  assert(
    rejectedRetry.ready === false &&
      Number(
        rejectedRetry.completionIo?.async_incremental_starts_total || 0,
      ) === rejectedIncrementalStarts &&
      Number(
        rejectedRetry.completionIo?.async_full_history_starts_total || 0,
      ) === rejectedFullStarts + 1,
    "rejected-retry-recovery-starts-from-byte-zero",
    `ready=${rejectedRetry.ready} io=${JSON.stringify(rejectedRetry.completionIo)}`,
  );
  for (let i = 0; i < 1000 && !rejectedRetry.ready; i += 1) {
    await sleep(1);
    rejectedRetry = rejectedRetryIndex.scan(rejectedRetryInput);
  }
  assert(
    rejectedRetry.ready &&
      !rejectedRetry.doneTruthHas(rejectedBaseId) &&
      rejectedRetry.doneTruthHas(rejectedMutatedId) &&
      rejectedRetry.doneTruthHas(rejectedTailId) &&
      Number(
        rejectedRetry.completionIo?.async_incremental_starts_total || 0,
      ) === rejectedIncrementalStarts,
    "rejected-retry-hostile-generation-never-self-rebases-incrementally",
    `ready=${rejectedRetry.ready} io=${JSON.stringify(rejectedRetry.completionIo)}`,
  );

  // Append-witness retention is intentionally finite. If a dormant reader
  // misses more events than the bounded authority window can prove, it must
  // HOLD rather than infer continuity from an incomplete event suffix.
  const witnessLimitJobsFile = path.join(root, "jobs-witness-limit.jsonl");
  const witnessLimitReceiptsFile = path.join(root, "receipts-witness-limit.jsonl");
  const witnessLimitJobStateFile = path.join(root, "job-state-witness-limit.jsonl");
  fs.writeFileSync(witnessLimitJobsFile, "");
  fs.writeFileSync(witnessLimitReceiptsFile, "");
  fs.writeFileSync(witnessLimitJobStateFile, "");
  const witnessLimitIndex = new JobsDatanetWorkerRuntimeIndexV1({
    maxScanBytesPerTick: 4096,
    maxSyncCompletionRebuildBytes: 1024 * 1024,
  });
  const witnessLimitInput = {
    jobsFile: witnessLimitJobsFile,
    receiptsFile: witnessLimitReceiptsFile,
    jobStateFile: witnessLimitJobStateFile,
  };
  assert(
    witnessLimitIndex.scan(witnessLimitInput).ready,
    "witness-limit-baseline-admitted",
    "empty generation ready",
  );
  for (let i = 0; i < 8200; i += 1) {
    appendAgentPick2JsonlCanonicalV1(
      witnessLimitJobsFile,
      JSON.stringify({ job_id: `witness_${i}`, status: "completed" }) + "\n",
    );
  }
  const witnessLimitHeld = witnessLimitIndex.scan(witnessLimitInput);
  assert(
    witnessLimitHeld.ready === false && witnessLimitHeld.jobs.length === 0,
    "expired-append-authority-fails-closed",
    `ready=${witnessLimitHeld.ready} hold=${witnessLimitHeld.holdReason}`,
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
    appendAgentPick2JsonlCanonicalV1(
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
    appendAgentPick2JsonlCanonicalV1(
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

  // Completion truth is exact but disk-backed: establishing H historical IDs
  // must not retain H JS identities, and one witnessed append must index/read
  // only its delta rather than enumerate or clone the prior population.
  const authorityJobsFile = path.join(root, "jobs-completion-authority.jsonl");
  const authorityReceiptsFile = path.join(
    root,
    "receipts-completion-authority.jsonl",
  );
  const authorityJobStateFile = path.join(
    root,
    "job-state-completion-authority.jsonl",
  );
  fs.writeFileSync(authorityJobsFile, "");
  fs.writeFileSync(authorityReceiptsFile, "");
  const authorityHistory = Array.from({ length: 4096 }, (_, i) =>
    JSON.stringify({
      job_id: `authority_history_${String(i).padStart(5, "0")}`,
      status: "completed",
    }),
  ).join("\n") + "\n";
  fs.writeFileSync(authorityJobStateFile, authorityHistory);
  const authorityIndex = new JobsDatanetWorkerRuntimeIndexV1({
    maxScanBytesPerTick: 4096,
    maxSyncCompletionRebuildBytes: 1024 * 1024,
  });
  const authorityInput = {
    jobsFile: authorityJobsFile,
    receiptsFile: authorityReceiptsFile,
    jobStateFile: authorityJobStateFile,
  };
  const authorityBaseline = authorityIndex.scan(authorityInput);
  assert(
    authorityBaseline.ready &&
      authorityBaseline.doneTruthHas("authority_history_00000") &&
      authorityBaseline.doneTruthHas("authority_history_04095"),
    "completion-authority-large-history-exact",
    `ready=${authorityBaseline.ready} hold=${authorityBaseline.holdReason}`,
  );
  assert(
    authorityBaseline.retainedState.completionResidentIds === 0 &&
      authorityBaseline.retainedState.completionAuthorities <= 3,
    "completion-authority-resident-state-finite",
    JSON.stringify(authorityBaseline.retainedState),
  );
  const authorityRecordsBefore = Number(
    authorityBaseline.completionIo?.authority_records_indexed_total || 0,
  );
  const authorityBytesBefore = Number(
    authorityBaseline.completionIo?.bytes_read_total || 0,
  );
  const authorityAppendId = "authority_history_appended";
  const authorityAppend =
    JSON.stringify({ job_id: authorityAppendId, status: "completed" }) + "\n";
  appendAgentPick2JsonlCanonicalV1(authorityJobStateFile, authorityAppend);
  const authorityIncremental = authorityIndex.scan(authorityInput);
  assert(
    authorityIncremental.ready &&
      authorityIncremental.doneTruthHas("authority_history_00000") &&
      authorityIncremental.doneTruthHas(authorityAppendId),
    "completion-authority-incremental-truth-exact",
    `ready=${authorityIncremental.ready} hold=${authorityIncremental.holdReason}`,
  );
  assert(
    Number(
      authorityIncremental.completionIo?.authority_records_indexed_total || 0,
    ) - authorityRecordsBefore === 1 &&
      Number(authorityIncremental.completionIo?.bytes_read_total || 0) -
        authorityBytesBefore ===
        Buffer.byteLength(authorityAppend) &&
      authorityIncremental.retainedState.completionResidentIds === 0,
    "completion-authority-append-work-is-delta-only",
    `records_delta=${Number(authorityIncremental.completionIo?.authority_records_indexed_total || 0) - authorityRecordsBefore} bytes_delta=${Number(authorityIncremental.completionIo?.bytes_read_total || 0) - authorityBytesBefore} retained=${JSON.stringify(authorityIncremental.retainedState)}`,
  );

  // The disk authority is an explicitly bounded cache, not an unbounded
  // relocation of H identities from the JS heap into tmpfs. At the accepted
  // boundary, duplicate truth remains readable without another leaf. The next
  // unique identity must HOLD before creating either shard or leaf.
  const capacityJobsFile = path.join(root, "jobs-completion-capacity.jsonl");
  const capacityReceiptsFile = path.join(
    root,
    "receipts-completion-capacity.jsonl",
  );
  const capacityJobStateFile = path.join(
    root,
    "job-state-completion-capacity.jsonl",
  );
  fs.writeFileSync(capacityJobsFile, "");
  fs.writeFileSync(capacityReceiptsFile, "");
  const capacityIds = ["cap_a", "cap_b", "cap_c"];
  fs.writeFileSync(
    capacityJobStateFile,
    capacityIds
      .map((job_id) => JSON.stringify({ job_id, status: "completed" }))
      .join("\n") + "\n",
  );
  const capacityIndex = new JobsDatanetWorkerRuntimeIndexV1({
    maxScanBytesPerTick: 4096,
    maxSyncCompletionRebuildBytes: 4096,
    maxCompletionAuthorityIds: capacityIds.length,
    maxCompletionAuthorityIdBytes: capacityIds.reduce(
      (sum, id) => sum + Buffer.byteLength(id),
      0,
    ),
    maxCompletionSourceBytes: 4096,
  });
  const capacityInput = {
    jobsFile: capacityJobsFile,
    receiptsFile: capacityReceiptsFile,
    jobStateFile: capacityJobStateFile,
  };
  const capacityAccepted = capacityIndex.scan(capacityInput);
  const capacityObjects = Number(
    capacityAccepted.completionIo?.authority_objects_high_water || 0,
  );
  assert(
    capacityAccepted.ready &&
      capacityIds.every((id) => capacityAccepted.doneTruthHas(id)) &&
      capacityAccepted.retainedState.completionAuthorityIds ===
        capacityIds.length &&
      capacityAccepted.retainedState.completionAuthorityIdBytes ===
        capacityIds.reduce((sum, id) => sum + Buffer.byteLength(id), 0) &&
      capacityObjects >= capacityIds.length + 3 &&
      capacityObjects <= 3 + capacityIds.length * 5,
    "completion-authority-capacity-bound-accepted",
    `ready=${capacityAccepted.ready} io=${JSON.stringify(capacityAccepted.completionIo)} retained=${JSON.stringify(capacityAccepted.retainedState)}`,
  );
  const capacityRecords = Number(
    capacityAccepted.completionIo?.authority_records_indexed_total || 0,
  );
  appendAgentPick2JsonlCanonicalV1(
    capacityJobStateFile,
    JSON.stringify({ job_id: "cap_b", status: "completed" }) + "\n",
  );
  const capacityDuplicate = capacityIndex.scan(capacityInput);
  assert(
    capacityDuplicate.ready &&
      capacityDuplicate.doneTruthHas("cap_b") &&
      Number(
        capacityDuplicate.completionIo?.authority_records_indexed_total || 0,
      ) === capacityRecords &&
      Number(capacityDuplicate.completionIo?.authority_objects_high_water || 0) ===
        capacityObjects,
    "completion-authority-capacity-duplicate-is-zero-growth",
    `io=${JSON.stringify(capacityDuplicate.completionIo)}`,
  );
  appendAgentPick2JsonlCanonicalV1(
    capacityJobStateFile,
    JSON.stringify({ job_id: "cap_d", status: "completed" }) + "\n",
  );
  const capacityHeld = capacityIndex.scan(capacityInput);
  assert(
    !capacityHeld.ready &&
      String(capacityHeld.holdReason || "").includes(
        "COMPLETION_AUTHORITY_CAPACITY_HOLD",
      ) &&
      Number(capacityHeld.completionIo?.authority_capacity_holds_total || 0) ===
        1 &&
      Number(capacityHeld.completionIo?.authority_ids_high_water || 0) ===
        capacityIds.length &&
      Number(capacityHeld.completionIo?.authority_objects_high_water || 0) ===
        capacityObjects &&
      capacityAccepted.doneTruthHas("cap_a") &&
      capacityAccepted.doneTruthHas("cap_c") &&
      !capacityAccepted.doneTruthHas("cap_d"),
    "completion-authority-capacity-holds-before-object-growth",
    `ready=${capacityHeld.ready} hold=${capacityHeld.holdReason} io=${JSON.stringify(capacityHeld.completionIo)}`,
  );
  pass(
    "completion-authority-capacity-hold-preserves-prior-generation",
    "G truth remains readable and G+1 identity remains absent",
  );

  const asyncCapacityJobsFile = path.join(
    root,
    "jobs-completion-capacity-async.jsonl",
  );
  const asyncCapacityReceiptsFile = path.join(
    root,
    "receipts-completion-capacity-async.jsonl",
  );
  const asyncCapacityStateFile = path.join(
    root,
    "job-state-completion-capacity-async.jsonl",
  );
  fs.writeFileSync(asyncCapacityJobsFile, "");
  fs.writeFileSync(asyncCapacityReceiptsFile, "");
  fs.writeFileSync(
    asyncCapacityStateFile,
    JSON.stringify({ job_id: "async_cap_a", status: "completed" }) + "\n",
  );
  const asyncCapacityIndex = new JobsDatanetWorkerRuntimeIndexV1({
    maxScanBytesPerTick: 4096,
    maxSyncCompletionRebuildBytes: 4096,
    maxCompletionAuthorityIds: 1,
    maxCompletionAuthorityIdBytes: Buffer.byteLength("async_cap_a"),
    maxCompletionSourceBytes: 64 * 1024,
    completionRebuildBackoffMs: 5,
  });
  const asyncCapacityInput = {
    jobsFile: asyncCapacityJobsFile,
    receiptsFile: asyncCapacityReceiptsFile,
    jobStateFile: asyncCapacityStateFile,
  };
  const asyncCapacityAccepted = asyncCapacityIndex.scan(asyncCapacityInput);
  assert(
    asyncCapacityAccepted.ready &&
      asyncCapacityAccepted.doneTruthHas("async_cap_a"),
    "completion-authority-async-capacity-base-accepted",
    `ready=${asyncCapacityAccepted.ready}`,
  );
  appendAgentPick2JsonlCanonicalV1(
    asyncCapacityStateFile,
    repeatToBytes(
      JSON.stringify({ job_id: "async_capacity_filler", status: "queued" }) +
        "\n",
      8192,
    ) +
      JSON.stringify({ job_id: "async_cap_b", status: "completed" }) +
      "\n",
  );
  let asyncCapacityHeld = asyncCapacityIndex.scan(asyncCapacityInput);
  for (
    let i = 0;
    i < 500 &&
    Number(
      asyncCapacityHeld.completionIo?.authority_capacity_holds_total || 0,
    ) < 1;
    i += 1
  ) {
    await sleep(2);
    asyncCapacityHeld = asyncCapacityIndex.scan(asyncCapacityInput);
  }
  assert(
    !asyncCapacityHeld.ready &&
      Number(
        asyncCapacityHeld.completionIo?.authority_capacity_holds_total || 0,
      ) === 1 &&
      asyncCapacityAccepted.doneTruthHas("async_cap_a") &&
      !asyncCapacityAccepted.doneTruthHas("async_cap_b") &&
      Number(
        asyncCapacityHeld.completionIo?.authority_records_indexed_total || 0,
      ) === 1,
    "completion-authority-async-capacity-hold-preserves-prior-generation",
    `ready=${asyncCapacityHeld.ready} hold=${asyncCapacityHeld.holdReason} io=${JSON.stringify(asyncCapacityHeld.completionIo)}`,
  );

  // Generation publication is a single accepted-marker transition. A failure
  // after one provisional delta leaf exists must leave G logically and
  // numerically unchanged; a later successful retry publishes a new immutable
  // generation without changing the retained G closure.
  const atomicJobsFile = path.join(root, "jobs-completion-atomic.jsonl");
  const atomicReceiptsFile = path.join(
    root,
    "receipts-completion-atomic.jsonl",
  );
  const atomicStateFile = path.join(root, "job-state-completion-atomic.jsonl");
  fs.writeFileSync(atomicJobsFile, "");
  fs.writeFileSync(atomicReceiptsFile, "");
  fs.writeFileSync(
    atomicStateFile,
    JSON.stringify({ job_id: "atomic_a", status: "completed" }) + "\n",
  );
  let injectAtomicFailure = true;
  const atomicIndex = new JobsDatanetWorkerRuntimeIndexV1({
    maxScanBytesPerTick: 4096,
    maxSyncCompletionRebuildBytes: 4096,
    maxCompletionAuthorityIds: 8,
    maxCompletionAuthorityIdBytes: 1024,
    maxCompletionSourceBytes: 64 * 1024,
    testHooks: {
      beforeCompletionDeltaLeafWrite: ({ file, stagedIds }) => {
        if (
          injectAtomicFailure &&
          file === atomicStateFile &&
          stagedIds === 1
        ) {
          injectAtomicFailure = false;
          throw new Error("VOID_TEST_COMPLETION_DELTA_SECOND_LEAF_FAILURE");
        }
      },
    },
  });
  const atomicInput = {
    jobsFile: atomicJobsFile,
    receiptsFile: atomicReceiptsFile,
    jobStateFile: atomicStateFile,
  };
  const atomicG = atomicIndex.scan(atomicInput);
  const atomicGObjects = atomicG.retainedState.completionAuthorityObjects;
  assert(
    atomicG.ready && atomicG.doneTruthHas("atomic_a"),
    "completion-authority-atomic-base-accepted",
    `ready=${atomicG.ready}`,
  );
  appendAgentPick2JsonlCanonicalV1(
    atomicStateFile,
    ["atomic_b", "atomic_c"]
      .map((job_id) => JSON.stringify({ job_id, status: "completed" }))
      .join("\n") + "\n",
  );
  const atomicHeld = atomicIndex.scan(atomicInput);
  assert(
    !atomicHeld.ready &&
      String(atomicHeld.holdReason || "").includes(
        "VOID_TEST_COMPLETION_DELTA_SECOND_LEAF_FAILURE",
      ) &&
      atomicG.doneTruthHas("atomic_a") &&
      !atomicG.doneTruthHas("atomic_b") &&
      !atomicG.doneTruthHas("atomic_c") &&
      atomicHeld.retainedState.completionAuthorityIds === 1 &&
      atomicHeld.retainedState.completionStagedAuthorityIds === 0 &&
      atomicHeld.retainedState.completionStagedAuthorityIdBytes === 0 &&
      atomicHeld.retainedState.completionStagedAuthorityObjects === 0 &&
      atomicHeld.retainedState.completionAuthorityObjects === atomicGObjects,
    "completion-authority-sync-partial-publication-fails-atomic",
    `ready=${atomicHeld.ready} hold=${atomicHeld.holdReason} retained=${JSON.stringify(atomicHeld.retainedState)}`,
  );
  const atomicPublished = atomicIndex.scan(atomicInput);
  assert(
    atomicPublished.ready &&
      atomicPublished.doneTruthHas("atomic_a") &&
      atomicPublished.doneTruthHas("atomic_b") &&
      atomicPublished.doneTruthHas("atomic_c") &&
      atomicG.doneTruthHas("atomic_a") &&
      !atomicG.doneTruthHas("atomic_b") &&
      !atomicG.doneTruthHas("atomic_c"),
    "completion-authority-success-publishes-immutable-generation",
    `ready=${atomicPublished.ready} retained=${JSON.stringify(atomicPublished.retainedState)}`,
  );

  const asyncAtomicJobsFile = path.join(
    root,
    "jobs-completion-atomic-async.jsonl",
  );
  const asyncAtomicReceiptsFile = path.join(
    root,
    "receipts-completion-atomic-async.jsonl",
  );
  const asyncAtomicStateFile = path.join(
    root,
    "job-state-completion-atomic-async.jsonl",
  );
  fs.writeFileSync(asyncAtomicJobsFile, "");
  fs.writeFileSync(asyncAtomicReceiptsFile, "");
  fs.writeFileSync(
    asyncAtomicStateFile,
    JSON.stringify({ job_id: "async_atomic_a", status: "completed" }) + "\n",
  );
  let injectAsyncAtomicFailure = true;
  const asyncAtomicIndex = new JobsDatanetWorkerRuntimeIndexV1({
    maxScanBytesPerTick: 4096,
    maxSyncCompletionRebuildBytes: 4096,
    maxCompletionAuthorityIds: 8,
    maxCompletionAuthorityIdBytes: 1024,
    maxCompletionSourceBytes: 64 * 1024,
    completionRebuildBackoffMs: 5,
    testHooks: {
      beforeCompletionDeltaLeafWrite: ({ file, stagedIds }) => {
        if (
          injectAsyncAtomicFailure &&
          file === asyncAtomicStateFile &&
          stagedIds === 1
        ) {
          injectAsyncAtomicFailure = false;
          throw new Error("VOID_TEST_ASYNC_DELTA_SECOND_LEAF_FAILURE");
        }
      },
    },
  });
  const asyncAtomicInput = {
    jobsFile: asyncAtomicJobsFile,
    receiptsFile: asyncAtomicReceiptsFile,
    jobStateFile: asyncAtomicStateFile,
  };
  const asyncAtomicG = asyncAtomicIndex.scan(asyncAtomicInput);
  const asyncAtomicObjects =
    asyncAtomicG.retainedState.completionAuthorityObjects;
  appendAgentPick2JsonlCanonicalV1(
    asyncAtomicStateFile,
    ["async_atomic_b", "async_atomic_c"]
      .map((job_id) => JSON.stringify({ job_id, status: "completed" }))
      .join("\n") +
      "\n" +
      repeatToBytes(
        JSON.stringify({ job_id: "async_atomic_filler", status: "queued" }) +
          "\n",
        8192,
      ),
  );
  let asyncAtomicHeld = asyncAtomicIndex.scan(asyncAtomicInput);
  for (
    let i = 0;
    i < 500 &&
    !String(asyncAtomicHeld.holdReason || "").includes("REBUILD_BACKOFF");
    i += 1
  ) {
    await sleep(2);
    asyncAtomicHeld = asyncAtomicIndex.scan(asyncAtomicInput);
  }
  assert(
    !asyncAtomicHeld.ready &&
      asyncAtomicG.doneTruthHas("async_atomic_a") &&
      !asyncAtomicG.doneTruthHas("async_atomic_b") &&
      !asyncAtomicG.doneTruthHas("async_atomic_c") &&
      asyncAtomicHeld.retainedState.completionAuthorityIds === 1 &&
      asyncAtomicHeld.retainedState.completionStagedAuthorityIds === 0 &&
      asyncAtomicHeld.retainedState.completionStagedAuthorityObjects === 0 &&
      asyncAtomicHeld.retainedState.completionAuthorityObjects ===
        asyncAtomicObjects,
    "completion-authority-async-partial-publication-fails-atomic",
    `ready=${asyncAtomicHeld.ready} hold=${asyncAtomicHeld.holdReason} retained=${JSON.stringify(asyncAtomicHeld.retainedState)}`,
  );

  // Pause an incremental async generation after its exact IDs are disk-staged
  // but before the accepted marker is created. The in-flight resource view must
  // report zero JS-resident IDs and exact provisional disk counts, then return
  // every staged counter to zero after publication.
  const telemetryJobsFile = path.join(
    root,
    "jobs-completion-staging-telemetry.jsonl",
  );
  const telemetryReceiptsFile = path.join(
    root,
    "receipts-completion-staging-telemetry.jsonl",
  );
  const telemetryStateFile = path.join(
    root,
    "job-state-completion-staging-telemetry.jsonl",
  );
  fs.writeFileSync(telemetryJobsFile, "");
  fs.writeFileSync(telemetryReceiptsFile, "");
  fs.writeFileSync(
    telemetryStateFile,
    JSON.stringify({ job_id: "telemetry_a", status: "completed" }) + "\n",
  );
  let releaseTelemetryBarrier!: () => void;
  const telemetryBarrier = new Promise<void>((resolve) => {
    releaseTelemetryBarrier = resolve;
  });
  let telemetryEnteredResolve!: () => void;
  const telemetryEntered = new Promise<void>((resolve) => {
    telemetryEnteredResolve = resolve;
  });
  let telemetryBarrierUsed = false;
  const telemetryIndex = new JobsDatanetWorkerRuntimeIndexV1({
    maxScanBytesPerTick: 4096,
    maxSyncCompletionRebuildBytes: 4096,
    maxCompletionAuthorityIds: 8,
    maxCompletionAuthorityIdBytes: 1024,
    maxCompletionSourceBytes: 64 * 1024,
    completionRebuildBackoffMs: 5,
    testHooks: {
      beforeAsyncCompletionDeltaCommit: async ({ file }) => {
        if (file !== telemetryStateFile || telemetryBarrierUsed) return;
        telemetryBarrierUsed = true;
        telemetryEnteredResolve();
        await telemetryBarrier;
      },
    },
  });
  const telemetryInput = {
    jobsFile: telemetryJobsFile,
    receiptsFile: telemetryReceiptsFile,
    jobStateFile: telemetryStateFile,
  };
  const telemetryG = telemetryIndex.scan(telemetryInput);
  appendAgentPick2JsonlCanonicalV1(
    telemetryStateFile,
    ["telemetry_b", "telemetry_c"]
      .map((job_id) => JSON.stringify({ job_id, status: "completed" }))
      .join("\n") +
      "\n" +
      repeatToBytes(
        JSON.stringify({ job_id: "telemetry_filler", status: "queued" }) +
          "\n",
        8192,
      ),
  );
  const telemetryWarm = telemetryIndex.scan(telemetryInput);
  assert(
    !telemetryWarm.ready,
    "completion-authority-staging-telemetry-warm-starts",
    `hold=${telemetryWarm.holdReason}`,
  );
  await telemetryEntered;
  const telemetryPaused = telemetryIndex.scan(telemetryInput);
  const telemetryBytes =
    Buffer.byteLength("telemetry_b") + Buffer.byteLength("telemetry_c");
  assert(
    !telemetryPaused.ready &&
      telemetryPaused.retainedState.completionResidentIds === 0 &&
      telemetryPaused.retainedState.completionStagedAuthorityIds === 2 &&
      telemetryPaused.retainedState.completionStagedAuthorityIdBytes ===
        telemetryBytes &&
      telemetryPaused.retainedState.completionStagedAuthorityObjects >= 2,
    "completion-authority-inflight-disk-staging-accounted",
    `retained=${JSON.stringify(telemetryPaused.retainedState)}`,
  );
  releaseTelemetryBarrier();
  let telemetryPublished = telemetryPaused;
  for (let i = 0; i < 500 && !telemetryPublished.ready; i += 1) {
    await sleep(2);
    telemetryPublished = telemetryIndex.scan(telemetryInput);
  }
  assert(
    telemetryPublished.ready &&
      telemetryPublished.doneTruthHas("telemetry_b") &&
      telemetryPublished.doneTruthHas("telemetry_c") &&
      telemetryPublished.retainedState.completionResidentIds === 0 &&
      telemetryPublished.retainedState.completionStagedAuthorityIds === 0 &&
      telemetryPublished.retainedState.completionStagedAuthorityIdBytes === 0 &&
      telemetryPublished.retainedState.completionStagedAuthorityObjects === 0 &&
      telemetryG.doneTruthHas("telemetry_a") &&
      !telemetryG.doneTruthHas("telemetry_b") &&
      !telemetryG.doneTruthHas("telemetry_c"),
    "completion-authority-staging-counters-clear-on-publication",
    `ready=${telemetryPublished.ready} retained=${JSON.stringify(telemetryPublished.retainedState)}`,
  );

  const idBytesJobsFile = path.join(root, "jobs-completion-id-bytes.jsonl");
  const idBytesReceiptsFile = path.join(
    root,
    "receipts-completion-id-bytes.jsonl",
  );
  const idBytesJobStateFile = path.join(
    root,
    "job-state-completion-id-bytes.jsonl",
  );
  fs.writeFileSync(idBytesJobsFile, "");
  fs.writeFileSync(idBytesReceiptsFile, "");
  fs.writeFileSync(
    idBytesJobStateFile,
    ["bytes_a", "bytes_b"]
      .map((job_id) => JSON.stringify({ job_id, status: "completed" }))
      .join("\n") + "\n",
  );
  const idBytesIndex = new JobsDatanetWorkerRuntimeIndexV1({
    maxScanBytesPerTick: 4096,
    maxSyncCompletionRebuildBytes: 4096,
    maxCompletionAuthorityIds: 10,
    maxCompletionAuthorityIdBytes: Buffer.byteLength("bytes_a"),
    maxCompletionSourceBytes: 4096,
  });
  const idBytesHeld = idBytesIndex.scan({
    jobsFile: idBytesJobsFile,
    receiptsFile: idBytesReceiptsFile,
    jobStateFile: idBytesJobStateFile,
  });
  assert(
    !idBytesHeld.ready &&
      String(idBytesHeld.holdReason || "").includes(
        "COMPLETION_AUTHORITY_CAPACITY_HOLD",
      ) &&
      Number(idBytesHeld.completionIo?.authority_id_bytes_high_water || 0) ===
        Buffer.byteLength("bytes_a"),
    "completion-authority-payload-bytes-have-hard-cap",
    `ready=${idBytesHeld.ready} hold=${idBytesHeld.holdReason} io=${JSON.stringify(idBytesHeld.completionIo)}`,
  );

  const sourceCapJobsFile = path.join(root, "jobs-completion-source-cap.jsonl");
  const sourceCapReceiptsFile = path.join(
    root,
    "receipts-completion-source-cap.jsonl",
  );
  const sourceCapJobStateFile = path.join(
    root,
    "job-state-completion-source-cap.jsonl",
  );
  fs.writeFileSync(sourceCapJobsFile, "");
  fs.writeFileSync(sourceCapReceiptsFile, "");
  fs.writeFileSync(
    sourceCapJobStateFile,
    repeatToBytes(
      JSON.stringify({ job_id: "source_cap_filler", status: "queued" }) +
        "\n",
      512,
    ),
  );
  const sourceCapIndex = new JobsDatanetWorkerRuntimeIndexV1({
    maxScanBytesPerTick: 4096,
    maxSyncCompletionRebuildBytes: 4096,
    maxCompletionAuthorityIds: 10,
    maxCompletionAuthorityIdBytes: 1024,
    maxCompletionSourceBytes: 128,
  });
  const sourceCapHeld = sourceCapIndex.scan({
    jobsFile: sourceCapJobsFile,
    receiptsFile: sourceCapReceiptsFile,
    jobStateFile: sourceCapJobStateFile,
  });
  assert(
    !sourceCapHeld.ready &&
      String(sourceCapHeld.holdReason || "").includes(
        "COMPLETION_SOURCE_CAPACITY_HOLD",
      ) &&
      Number(sourceCapHeld.completionIo?.completion_source_capacity_holds_total || 0) ===
        1 &&
      Number(sourceCapHeld.completionIo?.bytes_read_total || 0) === 0,
    "completion-cold-rebuild-source-bytes-have-hard-cap",
    `ready=${sourceCapHeld.ready} hold=${sourceCapHeld.holdReason} io=${JSON.stringify(sourceCapHeld.completionIo)}`,
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
    helperSource.includes(
      "VOID_JOBS_DATANET_WORKER_COMPLETION_CAPACITY_CONTRACT_V1",
    ) &&
      helperSource.includes("maxCompletionAuthorityIds") &&
      helperSource.includes("maxCompletionAuthorityIdBytes") &&
      helperSource.includes("maxCompletionSourceBytes"),
    "runtime-index-completion-capacity-contract-source",
    "record, payload-byte, and cold-source caps present",
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
      helperSource.includes("VOID_JOBS_DATANET_WORKER_APPEND_CONTINUITY_AUTHORITY_V1"),
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
