import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import * as vm from "node:vm";
import { readFileSync } from "node:fs";
import {
  JobsDatanetWorkerRuntimeIndexV1,
  VOID_JOBS_DATANET_WORKER_MAX_JOB_ID_UTF8_BYTES_V1,
  VOID_JOBS_DATANET_WORKER_MAX_LOCALLY_DONE_JOB_IDS_V1,
  VOID_JOBS_DATANET_WORKER_MAX_SEEN_JOB_IDS_V1,
  normalizeMaxLocallyDoneJobIdsV1,
  normalizeMaxSeenJobIdsV1,
} from "../src/http/jobs_datanet_worker_runtime_index_v1.js";
import {
  AgentPick2JsonlSemanticIndexV1,
  VOID_AGENT_PICK2_JSONL_MAX_COMPLETION_ID_CHARS_V1,
  VOID_AGENT_PICK2_JSONL_MAX_COMPLETION_IDS_PER_FILE_V1,
  VOID_AGENT_PICK2_JSONL_MAX_RECORD_BYTES_V1,
  normalizeMaxCompletionIdsPerFileV1,
  appendAgentPick2JsonlCanonicalV1,
} from "../src/http/agent_pick2_jsonl_semantic_index_v1.js";

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

  // Completion snapshots retain the published copy-on-write membership rather
  // than cloning the full Set. A witnessed append must publish a distinct
  // membership generation without mutating the already-captured snapshot.
  const zeroCopyCompletionFile = path.join(
    root,
    "receipts-completion-zero-copy.jsonl",
  );
  const zeroCopySeed = appendAgentPick2JsonlCanonicalV1(
    zeroCopyCompletionFile,
    JSON.stringify({ job_id: "zero_copy_a", status: "completed" }) + "\n",
  );
  assert(
    zeroCopySeed.witnessed === false,
    "zero-copy-completion-baseline-seeded",
    `witnessed=${zeroCopySeed.witnessed}`,
  );
  const zeroCopyIndex = new AgentPick2JsonlSemanticIndexV1({
    maxSyncCompletionRebuildBytes: 1024 * 1024,
    completionRebuildBackoffMs: 5,
  });
  const zeroCopyG = zeroCopyIndex.completionTruthSnapshotV1([
    zeroCopyCompletionFile,
  ]);
  assert(
    zeroCopyG.ready === true &&
      zeroCopyG.doneTruthHas("zero_copy_a") === true &&
      zeroCopyG.doneTruthHas("zero_copy_b") === false,
    "zero-copy-snapshot-g-captures-original-membership",
    `ready=${zeroCopyG.ready} generation=${zeroCopyG.generation || ""}`,
  );
  const zeroCopyAppend = appendAgentPick2JsonlCanonicalV1(
    zeroCopyCompletionFile,
    JSON.stringify({ job_id: "zero_copy_b", status: "completed" }) + "\n",
  );
  assert(
    zeroCopyAppend.witnessed === true,
    "zero-copy-completion-append-witnessed",
    `witnessed=${zeroCopyAppend.witnessed}`,
  );
  const zeroCopyG1 = zeroCopyIndex.completionTruthSnapshotV1([
    zeroCopyCompletionFile,
  ]);
  assert(
    zeroCopyG1.ready === true &&
      zeroCopyG1.doneTruthHas("zero_copy_a") === true &&
      zeroCopyG1.doneTruthHas("zero_copy_b") === true &&
      zeroCopyG1.generation !== zeroCopyG.generation,
    "zero-copy-snapshot-g1-publishes-distinct-membership",
    `g=${zeroCopyG.generation || ""} g1=${zeroCopyG1.generation || ""}`,
  );
  assert(
    zeroCopyG.doneTruthHas("zero_copy_b") === false,
    "zero-copy-old-snapshot-membership-remains-immutable",
    "old_snapshot_zero_copy_b=false",
  );
  let zeroCopyExpired = false;
  try {
    zeroCopyG.assertGeneration();
  } catch (error) {
    zeroCopyExpired = String((error as Error)?.message || error).includes(
      "COMPLETION_SNAPSHOT_EXPIRED",
    );
  }
  assert(
    zeroCopyExpired,
    "zero-copy-old-snapshot-generation-still-expires",
    `expired=${zeroCopyExpired}`,
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

  // A valid multibyte UTF-8 code point split across the exact scan boundary
  // must remain byte-identical until the complete newline-terminated record is
  // available for fatal decoding.
  const utf8JobsFile = path.join(root, "jobs-utf8-split.jsonl");
  const utf8ReceiptsFile = path.join(root, "receipts-utf8-split.jsonl");
  const utf8JobStateFile = path.join(root, "job-state-utf8-split.jsonl");
  fs.writeFileSync(utf8ReceiptsFile, "");
  fs.writeFileSync(utf8JobStateFile, "");
  const utf8Prefix =
    '{"job_id":"utf8_split","status":"queued","account":"proof",' +
    '"kind":"datanet_publish","input":{"plaintext":"';
  const utf8Suffix = '"}}\n';
  const splitTarget = 4095;
  const fillerBytes = splitTarget - Buffer.byteLength(utf8Prefix, "utf8");
  assert(
    fillerBytes > 0,
    "utf8-split-fixture-prefix",
    `filler_bytes=${fillerBytes}`,
  );
  const utf8Fixture =
    utf8Prefix + "a".repeat(fillerBytes) + "🙂" + utf8Suffix;
  const emojiOffset = Buffer.from(utf8Fixture).indexOf(Buffer.from("🙂"));
  assert(
    emojiOffset === splitTarget,
    "utf8-split-boundary-exact",
    `emoji_offset=${emojiOffset}`,
  );
  fs.writeFileSync(utf8JobsFile, utf8Fixture);

  const utf8Index = new JobsDatanetWorkerRuntimeIndexV1({
    maxScanBytesPerTick: 4096,
    maxJobsPerTick: 8,
    maxSyncCompletionRebuildBytes: 1024 * 1024,
    completionRebuildBackoffMs: 5,
  });
  const utf8Input = {
    jobsFile: utf8JobsFile,
    receiptsFile: utf8ReceiptsFile,
    jobStateFile: utf8JobStateFile,
  };
  const utf8First = utf8Index.scan(utf8Input);
  assert(
    utf8First.ready === true &&
      utf8First.jobs.length === 0 &&
      utf8First.scanComplete === false,
    "utf8-split-first-chunk-held-as-incomplete-record",
    `jobs=${utf8First.jobs.length} complete=${utf8First.scanComplete}`,
  );
  const utf8Second = utf8Index.scan(utf8Input);
  assert(
    utf8Second.jobs.some(
      (entry) =>
        entry.jobId === "utf8_split" &&
        String(entry.job?.input?.plaintext || "").endsWith("🙂"),
    ),
    "utf8-split-record-preserved",
    `jobs=${utf8Second.jobs.map((entry) => entry.jobId).join(",")}`,
  );

  // Invalid UTF-8 in a complete byte frame is an integrity HOLD rather than
  // replacement-character normalization followed by JSON parsing.
  const invalidUtf8JobsFile = path.join(root, "jobs-invalid-utf8.jsonl");
  const invalidUtf8ReceiptsFile = path.join(root, "receipts-invalid-utf8.jsonl");
  const invalidUtf8JobStateFile = path.join(root, "job-state-invalid-utf8.jsonl");
  fs.writeFileSync(invalidUtf8ReceiptsFile, "");
  fs.writeFileSync(invalidUtf8JobStateFile, "");
  fs.writeFileSync(
    invalidUtf8JobsFile,
    Buffer.concat([
      Buffer.from(
        '{"job_id":"invalid_utf8","status":"queued","input":{"plaintext":"',
        "utf8",
      ),
      Buffer.from([0xff]),
      Buffer.from('"}}\n', "utf8"),
    ]),
  );
  const invalidUtf8Index = new JobsDatanetWorkerRuntimeIndexV1({
    maxScanBytesPerTick: 4096,
    maxJobsPerTick: 8,
    maxSyncCompletionRebuildBytes: 1024 * 1024,
    completionRebuildBackoffMs: 5,
  });
  let invalidUtf8Held = false;
  try {
    invalidUtf8Index.scan({
      jobsFile: invalidUtf8JobsFile,
      receiptsFile: invalidUtf8ReceiptsFile,
      jobStateFile: invalidUtf8JobStateFile,
    });
  } catch (error) {
    invalidUtf8Held =
      String((error as Error)?.message || error).includes(
        "VOID_JOBS_DATANET_WORKER_INVALID_UTF8",
      );
  }
  assert(
    invalidUtf8Held,
    "invalid-utf8-generation-holds",
    `held=${invalidUtf8Held}`,
  );

  // The shared record ceiling applies to exact framed bytes before optional
  // CR normalization. A MAX+1 raw frame must HOLD even when the extra byte is CR.
  const crCeilingJobsFile = path.join(root, "jobs-cr-ceiling.jsonl");
  const crCeilingReceiptsFile = path.join(root, "receipts-cr-ceiling.jsonl");
  const crCeilingJobStateFile = path.join(root, "job-state-cr-ceiling.jsonl");
  fs.writeFileSync(crCeilingReceiptsFile, "");
  fs.writeFileSync(crCeilingJobStateFile, "");
  fs.writeFileSync(
    crCeilingJobsFile,
    Buffer.concat([
      Buffer.alloc(VOID_AGENT_PICK2_JSONL_MAX_RECORD_BYTES_V1, 0x20),
      Buffer.from("\r\n", "ascii"),
    ]),
  );
  const crCeilingIndex = new JobsDatanetWorkerRuntimeIndexV1({
    maxScanBytesPerTick: 4 * 1024 * 1024,
    maxJobsPerTick: 8,
    // Keep this fixture below the independent completion-warm ceiling so the
    // scan reaches the jobs-frame admission path under test.
    maxSyncCompletionRebuildBytes: 2 * 1024 * 1024,
    completionRebuildBackoffMs: 5,
  });
  let crCeilingHeld = false;
  let crCeilingReason = "";
  try {
    crCeilingIndex.scan({
      jobsFile: crCeilingJobsFile,
      receiptsFile: crCeilingReceiptsFile,
      jobStateFile: crCeilingJobStateFile,
    });
  } catch (error) {
    crCeilingReason = String((error as Error)?.message || error);
    crCeilingHeld =
      crCeilingReason.includes("VOID_AGENT_PICK2_JSONL_RECORD_TOO_LARGE") ||
      crCeilingReason.includes("VOID_JOBS_DATANET_WORKER_RECORD_TOO_LARGE");
  }
  assert(
    crCeilingHeld,
    "cr-normalization-cannot-bypass-record-byte-ceiling",
    `held=${crCeilingHeld} reason=${crCeilingReason}`,
  );

  // Only the shared canonical writer may advance an already-admitted jobs
  // generation. Direct same-inode growth is rejected before completion truth
  // is derived from the changed source.
  const authorityJobsFile = path.join(root, "jobs-authority.jsonl");
  const authorityReceiptsFile = path.join(root, "receipts-authority.jsonl");
  const authorityJobStateFile = path.join(root, "job-state-authority.jsonl");
  fs.writeFileSync(authorityReceiptsFile, "");
  fs.writeFileSync(authorityJobStateFile, "");
  const authoritySeed = appendAgentPick2JsonlCanonicalV1(
    authorityJobsFile,
    JSON.stringify({
      job_id: "authority_seed",
      status: "queued",
      account: "proof",
      kind: "datanet_publish",
      input: { plaintext: "seed" },
    }) + "\n",
  );
  assert(
    authoritySeed.witnessed === false,
    "first-canonical-generation-is-baseline-only",
    `witnessed=${authoritySeed.witnessed}`,
  );
  const authorityIndex = new JobsDatanetWorkerRuntimeIndexV1({
    maxScanBytesPerTick: 64 * 1024,
    maxJobsPerTick: 8,
    maxSyncCompletionRebuildBytes: 1024 * 1024,
    completionRebuildBackoffMs: 5,
  });
  const authorityInput = {
    jobsFile: authorityJobsFile,
    receiptsFile: authorityReceiptsFile,
    jobStateFile: authorityJobStateFile,
  };
  const authorityFirst = authorityIndex.scan(authorityInput);
  assert(
    authorityFirst.ready &&
      authorityFirst.jobs.some((entry) => entry.jobId === "authority_seed"),
    "initial-jobs-generation-admitted",
    `ready=${authorityFirst.ready} jobs=${authorityFirst.jobs.map((entry) => entry.jobId).join(",")}`,
  );
  authorityIndex.markDone("authority_seed");

  const authorityAppend = appendAgentPick2JsonlCanonicalV1(
    authorityJobsFile,
    JSON.stringify({
      job_id: "authority_canonical",
      status: "queued",
      account: "proof",
      kind: "datanet_publish",
      input: { plaintext: "canonical" },
    }) + "\n",
  );
  assert(
    authorityAppend.witnessed === true,
    "canonical-append-mints-generation-witness",
    `witnessed=${authorityAppend.witnessed}`,
  );
  const authoritySecond = authorityIndex.scan(authorityInput);
  assert(
    authoritySecond.ready &&
      authoritySecond.jobs.some(
        (entry) => entry.jobId === "authority_canonical",
      ),
    "witnessed-canonical-append-admitted",
    `ready=${authoritySecond.ready} hold=${authoritySecond.holdReason || ""}`,
  );

  fs.appendFileSync(
    authorityJobsFile,
    JSON.stringify({
      job_id: "authority_unwitnessed",
      status: "queued",
      account: "proof",
      kind: "datanet_publish",
      input: { plaintext: "unwitnessed" },
    }) + "\n",
  );
  const authorityRejected = authorityIndex.scan(authorityInput);
  assert(
    authorityRejected.ready === false &&
      authorityRejected.holdReason === "jobs_unwitnessed_source_change" &&
      authorityRejected.doneTruthHas("authority_unwitnessed") === false,
    "unwitnessed-growth-held-before-completion-derivation",
    `ready=${authorityRejected.ready} hold=${authorityRejected.holdReason}`,
  );
  const authorityRejectedAgain = authorityIndex.scan(authorityInput);
  assert(
    authorityRejectedAgain.ready === false &&
      authorityRejectedAgain.holdReason === "jobs_unwitnessed_source_change",
    "rejected-generation-cannot-self-authorize",
    `ready=${authorityRejectedAgain.ready} hold=${authorityRejectedAgain.holdReason}`,
  );

  // A job returned to the worker is a generation-bound view. Mutation after
  // scan but before the first job-field read must fail closed at use time.
  const pendingJobsFile = path.join(root, "jobs-pending-authority.jsonl");
  const pendingReceiptsFile = path.join(root, "receipts-pending-authority.jsonl");
  const pendingJobStateFile = path.join(root, "job-state-pending-authority.jsonl");
  fs.writeFileSync(pendingReceiptsFile, "");
  fs.writeFileSync(pendingJobStateFile, "");
  appendAgentPick2JsonlCanonicalV1(
    pendingJobsFile,
    JSON.stringify({
      job_id: "pending_authority_seed",
      status: "queued",
      account: "proof",
      kind: "datanet_publish",
      input: { plaintext: "pending" },
    }) + "\n",
  );
  const pendingIndex = new JobsDatanetWorkerRuntimeIndexV1({
    maxScanBytesPerTick: 64 * 1024,
    maxJobsPerTick: 8,
    maxSyncCompletionRebuildBytes: 1024 * 1024,
    completionRebuildBackoffMs: 5,
  });
  const pendingInput = {
    jobsFile: pendingJobsFile,
    receiptsFile: pendingReceiptsFile,
    jobStateFile: pendingJobStateFile,
  };
  const pendingSnapshot = pendingIndex.scan(pendingInput);
  const pendingEntry = pendingSnapshot.jobs.find(
    (entry) => entry.jobId === "pending_authority_seed",
  );
  assert(
    !!pendingEntry,
    "pending-generation-bound-job-returned",
    `jobs=${pendingSnapshot.jobs.map((entry) => entry.jobId).join(",")}`,
  );
  const capturedPendingJob = {
    status: pendingEntry!.job.status,
    kind: pendingEntry!.job.kind,
    account: pendingEntry!.job.account,
    plaintext: pendingEntry!.job.input?.plaintext,
  };
  assert(
    capturedPendingJob.status === "queued" &&
      capturedPendingJob.kind === "datanet_publish" &&
      capturedPendingJob.plaintext === "pending",
    "pending-fields-captured-before-generation-change",
    `status=${capturedPendingJob.status} kind=${capturedPendingJob.kind}`,
  );

  const pendingAppend = appendAgentPick2JsonlCanonicalV1(
    pendingJobsFile,
    JSON.stringify({
      job_id: "pending_authority_next",
      status: "queued",
      account: "proof",
      kind: "datanet_publish",
      input: { plaintext: "next" },
    }) + "\n",
  );
  assert(
    pendingAppend.witnessed === true,
    "pending-fixture-canonical-transition-witnessed",
    `witnessed=${pendingAppend.witnessed}`,
  );
  let pendingUseHeld = false;
  let payloadEffect = false;
  let receiptEffect = false;
  let jobStateEffect = false;
  try {
    // Simulate the consumer after ordinary fields have already been copied.
    // The explicit guard must stop every later effect boundary.
    pendingEntry!.assertGeneration();
    payloadEffect = true;
    receiptEffect = true;
    jobStateEffect = true;
  } catch (error) {
    pendingUseHeld = String((error as Error)?.message || error).includes(
      "VOID_JOBS_DATANET_WORKER_PENDING_USE_AUTHORITY_CHANGED",
    );
  }
  assert(
    pendingUseHeld &&
      !payloadEffect &&
      !receiptEffect &&
      !jobStateEffect,
    "post-capture-generation-change-blocks-all-effects",
    `held=${pendingUseHeld} payload=${payloadEffect} receipt=${receiptEffect} job_state=${jobStateEffect}`,
  );

  // Completion truth is an immutable disk-stamped generation. A later
  // witnessed append publishes G+1 without mutating G, and the existing job
  // effect guard rejects G as expired before any payload or ledger write.
  const generationJobsFile = path.join(root, "jobs-completion-generation.jsonl");
  const generationReceiptsFile = path.join(
    root,
    "receipts-completion-generation.jsonl",
  );
  const generationJobStateFile = path.join(
    root,
    "job-state-completion-generation.jsonl",
  );
  appendAgentPick2JsonlCanonicalV1(
    generationJobsFile,
    JSON.stringify({
      job_id: "completion_generation_job",
      status: "queued",
      account: "proof",
      kind: "datanet_publish",
      input: { plaintext: "generation" },
    }) + "\n",
  );
  appendAgentPick2JsonlCanonicalV1(
    generationReceiptsFile,
    JSON.stringify({ job_id: "completed_a", status: "completed" }) + "\n",
  );
  fs.writeFileSync(generationJobStateFile, "");

  const generationIndex = new JobsDatanetWorkerRuntimeIndexV1({
    maxScanBytesPerTick: 64 * 1024,
    maxJobsPerTick: 8,
    maxSyncCompletionRebuildBytes: 1024 * 1024,
    completionRebuildBackoffMs: 5,
  });
  const generationInput = {
    jobsFile: generationJobsFile,
    receiptsFile: generationReceiptsFile,
    jobStateFile: generationJobStateFile,
  };
  const generationG = generationIndex.scan(generationInput);
  const generationGEntry = generationG.jobs.find(
    (entry) => entry.jobId === "completion_generation_job",
  );
  assert(
    !!generationGEntry &&
      generationG.doneTruthHas("completed_a") === true &&
      generationG.doneTruthHas("completed_b") === false,
    "completion-generation-g-captured",
    `jobs=${generationG.jobs.map((entry) => entry.jobId).join(",")}`,
  );
  const generationConsumerJob = JSON.parse(JSON.stringify(generationGEntry!.job));

  const generationAppend = appendAgentPick2JsonlCanonicalV1(
    generationReceiptsFile,
    JSON.stringify({ job_id: "completed_b", status: "completed" }) + "\n",
  );
  assert(
    generationAppend.witnessed === true,
    "completion-generation-append-witnessed",
    `witnessed=${generationAppend.witnessed}`,
  );
  assert(
    generationG.doneTruthHas("completed_b") === false,
    "completion-generation-g-membership-immutable",
    `completed_b=${generationG.doneTruthHas("completed_b")}`,
  );

  let completionGenerationHeld = false;
  let completionGenerationReason = "";
  let completionPayloadEffect = false;
  let completionReceiptEffect = false;
  let completionJobStateEffect = false;
  try {
    generationGEntry!.assertGeneration();
    completionPayloadEffect = true;
    completionReceiptEffect = true;
    completionJobStateEffect = true;
  } catch (error) {
    completionGenerationReason = String(
      (error as Error)?.message || error,
    );
    completionGenerationHeld =
      completionGenerationReason.includes(
        "VOID_JOBS_DATANET_WORKER_COMPLETION_HOLD",
      ) &&
      completionGenerationReason.includes("COMPLETION_SNAPSHOT_EXPIRED");
  }
  assert(
    completionGenerationHeld &&
      !completionPayloadEffect &&
      !completionReceiptEffect &&
      !completionJobStateEffect,
    "expired-completion-generation-blocks-all-effects",
    `held=${completionGenerationHeld} payload=${completionPayloadEffect} receipt=${completionReceiptEffect} job_state=${completionJobStateEffect} reason=${completionGenerationReason}`,
  );

  const generationG1 = generationIndex.scan(generationInput);
  const generationG1Entry = generationG1.jobs.find(
    (entry) => entry.jobId === "completion_generation_job",
  );
  let generationG1Current = false;
  try {
    generationG1Entry!.assertGeneration();
    generationG1Current = true;
  } catch {
    generationG1Current = false;
  }
  assert(
    !!generationG1Entry &&
      generationG1.doneTruthHas("completed_b") === true &&
      generationG1Entry.completionGeneration !==
        generationGEntry!.completionGeneration &&
      generationG1Current,
    "completion-generation-g1-published-and-current",
    `old=${generationGEntry!.completionGeneration} new=${generationG1Entry?.completionGeneration || ""}`,
  );

  // Locally-done IDs are only a transient replay fence while durable
  // completion truth has not caught up. Once the canonical completion ledger
  // contains the ID, the runtime must retire the duplicate in-memory key.
  const transientDoneJobsFile = path.join(root, "jobs-transient-done.jsonl");
  const transientDoneReceiptsFile = path.join(
    root,
    "receipts-transient-done.jsonl",
  );
  const transientDoneJobStateFile = path.join(
    root,
    "job-state-transient-done.jsonl",
  );
  appendAgentPick2JsonlCanonicalV1(
    transientDoneJobsFile,
    JSON.stringify({
      job_id: "transient_done_job",
      status: "queued",
      account: "proof",
      kind: "datanet_publish",
      input: { plaintext: "transient-done" },
    }) + "\n",
  );
  fs.writeFileSync(transientDoneReceiptsFile, "");
  fs.writeFileSync(transientDoneJobStateFile, "");
  const transientDoneIndex = new JobsDatanetWorkerRuntimeIndexV1({
    maxScanBytesPerTick: 64 * 1024,
    maxJobsPerTick: 8,
    maxSyncCompletionRebuildBytes: 1024 * 1024,
    completionRebuildBackoffMs: 5,
    maxCompletionIdsPerFile: 8,
  });
  const transientDoneInput = {
    jobsFile: transientDoneJobsFile,
    receiptsFile: transientDoneReceiptsFile,
    jobStateFile: transientDoneJobStateFile,
  };
  const transientDoneFirst = transientDoneIndex.scan(transientDoneInput);
  assert(
    transientDoneFirst.jobs.some(
      (entry) => entry.jobId === "transient_done_job",
    ),
    "transient-done-job-first-admitted",
    `jobs=${transientDoneFirst.jobs.map((x) => x.jobId).join(",")}`,
  );
  transientDoneIndex.markDone("transient_done_job");
  assert(
    (transientDoneIndex as any).locallyDone.has("transient_done_job") === true,
    "transient-done-replay-fence-present-before-durable-truth",
    `size=${(transientDoneIndex as any).locallyDone.size}`,
  );
  const transientDoneAppend = appendAgentPick2JsonlCanonicalV1(
    transientDoneReceiptsFile,
    JSON.stringify({
      job_id: "transient_done_job",
      status: "completed",
    }) + "\n",
  );
  assert(
    transientDoneAppend.witnessed === true,
    "transient-done-durable-completion-witnessed",
    `witnessed=${transientDoneAppend.witnessed}`,
  );
  const transientDoneDurable = transientDoneIndex.scan(transientDoneInput);
  assert(
    transientDoneDurable.ready === true &&
      transientDoneDurable.doneTruthHas("transient_done_job") === true &&
      transientDoneDurable.jobs.every(
        (entry) => entry.jobId !== "transient_done_job",
      ) &&
      (transientDoneIndex as any).locallyDone.has("transient_done_job") ===
        false,
    "durable-completion-retires-transient-done-key",
    `ready=${transientDoneDurable.ready} local_size=${(transientDoneIndex as any).locallyDone.size}`,
  );

  // Completion history remains exact, but an in-memory source cannot grow
  // without bound. Duplicates do not consume distinct-ID budget; the next new
  // completion ID fails closed before any queued job is surfaced.
  assert(
    VOID_AGENT_PICK2_JSONL_MAX_COMPLETION_IDS_PER_FILE_V1 === 250_000,
    "completion-cardinality-default-pinned",
    `default=${VOID_AGENT_PICK2_JSONL_MAX_COMPLETION_IDS_PER_FILE_V1}`,
  );
  assert(
    normalizeMaxCompletionIdsPerFileV1(undefined) === 250_000 &&
      normalizeMaxCompletionIdsPerFileV1("") === 250_000 &&
      normalizeMaxCompletionIdsPerFileV1("not-a-number") === 250_000 &&
      normalizeMaxCompletionIdsPerFileV1(0) === 250_000 &&
      normalizeMaxCompletionIdsPerFileV1(-1) === 250_000 &&
      normalizeMaxCompletionIdsPerFileV1(2.5) === 250_000 &&
      normalizeMaxCompletionIdsPerFileV1(5_000_000) === 250_000 &&
      normalizeMaxCompletionIdsPerFileV1(2) === 2,
    "completion-cardinality-runtime-config-cannot-raise-ceiling",
    [
      `undefined=${normalizeMaxCompletionIdsPerFileV1(undefined)}`,
      `empty=${normalizeMaxCompletionIdsPerFileV1("")}`,
      `invalid=${normalizeMaxCompletionIdsPerFileV1("not-a-number")}`,
      `zero=${normalizeMaxCompletionIdsPerFileV1(0)}`,
      `negative=${normalizeMaxCompletionIdsPerFileV1(-1)}`,
      `fractional=${normalizeMaxCompletionIdsPerFileV1(2.5)}`,
      `raised=${normalizeMaxCompletionIdsPerFileV1(5_000_000)}`,
      `lowered=${normalizeMaxCompletionIdsPerFileV1(2)}`,
    ].join(" "),
  );
  assert(
    VOID_AGENT_PICK2_JSONL_MAX_COMPLETION_ID_CHARS_V1 === 192,
    "completion-id-length-default-pinned",
    `max_chars=${VOID_AGENT_PICK2_JSONL_MAX_COMPLETION_ID_CHARS_V1}`,
  );
  const completionIdJobsFile = path.join(root, "jobs-completion-id-length.jsonl");
  const completionIdReceiptsFile = path.join(
    root,
    "receipts-completion-id-length.jsonl",
  );
  const completionIdJobStateFile = path.join(
    root,
    "job-state-completion-id-length.jsonl",
  );
  appendAgentPick2JsonlCanonicalV1(
    completionIdJobsFile,
    JSON.stringify({
      job_id: "completion_id_length_job",
      status: "queued",
      account: "proof",
      kind: "datanet_publish",
      input: { plaintext: "id-length" },
    }) + "\n",
  );
  fs.writeFileSync(completionIdJobStateFile, "");
  fs.writeFileSync(
    completionIdReceiptsFile,
    JSON.stringify({
      job_id: "x".repeat(VOID_AGENT_PICK2_JSONL_MAX_COMPLETION_ID_CHARS_V1),
      status: "completed",
    }) + "\n",
  );
  const completionIdBoundaryIndex = new JobsDatanetWorkerRuntimeIndexV1({
    maxScanBytesPerTick: 64 * 1024,
    maxJobsPerTick: 8,
    maxSyncCompletionRebuildBytes: 1024 * 1024,
    completionRebuildBackoffMs: 5,
    maxCompletionIdsPerFile: 8,
  });
  const completionIdInput = {
    jobsFile: completionIdJobsFile,
    receiptsFile: completionIdReceiptsFile,
    jobStateFile: completionIdJobStateFile,
  };
  const completionIdBoundary = completionIdBoundaryIndex.scan(
    completionIdInput,
  );
  assert(
    completionIdBoundary.ready === true &&
      completionIdBoundary.jobs.some(
        (entry) => entry.jobId === "completion_id_length_job",
      ),
    "completion-id-length-exact-boundary-admitted",
    `ready=${completionIdBoundary.ready} jobs=${completionIdBoundary.jobs.map((x) => x.jobId).join(",")}`,
  );

  fs.writeFileSync(
    completionIdReceiptsFile,
    JSON.stringify({
      job_id: "x".repeat(
        VOID_AGENT_PICK2_JSONL_MAX_COMPLETION_ID_CHARS_V1 + 1,
      ),
      status: "completed",
    }) + "\n",
  );
  const completionIdOverflowIndex = new JobsDatanetWorkerRuntimeIndexV1({
    maxScanBytesPerTick: 64 * 1024,
    maxJobsPerTick: 8,
    maxSyncCompletionRebuildBytes: 1024 * 1024,
    completionRebuildBackoffMs: 5,
    maxCompletionIdsPerFile: 8,
  });
  const completionIdOverflow = completionIdOverflowIndex.scan(
    completionIdInput,
  );
  assert(
    completionIdOverflow.ready === false &&
      completionIdOverflow.jobs.length === 0 &&
      String(completionIdOverflow.holdReason || "").includes(
        "VOID_AGENT_PICK2_JSONL_COMPLETION_ID_LENGTH_HOLD",
      ),
    "completion-id-length-overflow-holds-before-jobs",
    `ready=${completionIdOverflow.ready} jobs=${completionIdOverflow.jobs.length} reason=${completionIdOverflow.holdReason}`,
  );
  const completionIdOverflowBytes = Number(
    completionIdOverflow.completionIo?.bytes_read_total || 0,
  );
  const completionIdOverflowRepeat = completionIdOverflowIndex.scan(
    completionIdInput,
  );
  assert(
    completionIdOverflowRepeat.ready === false &&
      completionIdOverflowRepeat.jobs.length === 0 &&
      Number(completionIdOverflowRepeat.completionIo?.bytes_read_total || 0) ===
        completionIdOverflowBytes &&
      String(completionIdOverflowRepeat.holdReason || "").includes(
        "kind=cached_generation",
      ),
    "completion-id-length-same-generation-hold-does-not-reread",
    `before_bytes=${completionIdOverflowBytes} after_bytes=${completionIdOverflowRepeat.completionIo?.bytes_read_total || 0} reason=${completionIdOverflowRepeat.holdReason}`,
  );
  fs.writeFileSync(
    completionIdReceiptsFile,
    JSON.stringify({
      job_id: "x".repeat(VOID_AGENT_PICK2_JSONL_MAX_COMPLETION_ID_CHARS_V1),
      status: "completed",
    }) + "\n",
  );
  const completionIdRecovered = completionIdOverflowIndex.scan(
    completionIdInput,
  );
  assert(
    completionIdRecovered.ready === true &&
      completionIdRecovered.jobs.some(
        (entry) => entry.jobId === "completion_id_length_job",
      ),
    "completion-id-length-generation-change-clears-cached-hold",
    `ready=${completionIdRecovered.ready} jobs=${completionIdRecovered.jobs.map((x) => x.jobId).join(",")}`,
  );

  const cardinalityJobsFile = path.join(root, "jobs-completion-cardinality.jsonl");
  const cardinalityReceiptsFile = path.join(
    root,
    "receipts-completion-cardinality.jsonl",
  );
  const cardinalityJobStateFile = path.join(
    root,
    "job-state-completion-cardinality.jsonl",
  );
  appendAgentPick2JsonlCanonicalV1(
    cardinalityJobsFile,
    JSON.stringify({
      job_id: "completion_cardinality_job",
      status: "queued",
      account: "proof",
      kind: "datanet_publish",
      input: { plaintext: "cardinality" },
    }) + "\n",
  );
  appendAgentPick2JsonlCanonicalV1(
    cardinalityReceiptsFile,
    [
      JSON.stringify({ job_id: "cardinality_a", status: "completed" }),
      JSON.stringify({ job_id: "cardinality_a", status: "completed" }),
      JSON.stringify({ job_id: "cardinality_b", status: "completed" }),
      "",
    ].join("\n"),
  );
  fs.writeFileSync(cardinalityJobStateFile, "");

  const cardinalityIndex = new JobsDatanetWorkerRuntimeIndexV1({
    maxScanBytesPerTick: 64 * 1024,
    maxJobsPerTick: 8,
    maxSyncCompletionRebuildBytes: 1024 * 1024,
    completionRebuildBackoffMs: 5,
    maxCompletionIdsPerFile: 2,
  });
  const cardinalityInput = {
    jobsFile: cardinalityJobsFile,
    receiptsFile: cardinalityReceiptsFile,
    jobStateFile: cardinalityJobStateFile,
  };
  const cardinalityBoundary = cardinalityIndex.scan(cardinalityInput);
  assert(
    cardinalityBoundary.ready === true &&
      cardinalityBoundary.jobs.some(
        (entry) => entry.jobId === "completion_cardinality_job",
      ) &&
      cardinalityBoundary.doneTruthHas("cardinality_a") === true &&
      cardinalityBoundary.doneTruthHas("cardinality_b") === true,
    "completion-cardinality-distinct-boundary-admitted",
    `ready=${cardinalityBoundary.ready} jobs=${cardinalityBoundary.jobs.map((x) => x.jobId).join(",")}`,
  );

  const cardinalityOverflowAppend = appendAgentPick2JsonlCanonicalV1(
    cardinalityReceiptsFile,
    JSON.stringify({ job_id: "cardinality_c", status: "completed" }) + "\n",
  );
  assert(
    cardinalityOverflowAppend.witnessed === true,
    "completion-cardinality-overflow-append-witnessed",
    `witnessed=${cardinalityOverflowAppend.witnessed}`,
  );
  const cardinalityOverflow = cardinalityIndex.scan(cardinalityInput);
  assert(
    cardinalityOverflow.ready === false &&
      cardinalityOverflow.jobs.length === 0 &&
      String(cardinalityOverflow.holdReason || "").includes(
        "VOID_AGENT_PICK2_JSONL_COMPLETION_CARDINALITY_HOLD",
      ),
    "completion-cardinality-incremental-overflow-holds-before-jobs",
    `ready=${cardinalityOverflow.ready} jobs=${cardinalityOverflow.jobs.length} reason=${cardinalityOverflow.holdReason}`,
  );
  const cardinalityOverflowBytes = Number(
    cardinalityOverflow.completionIo?.bytes_read_total || 0,
  );
  const cardinalityOverflowRepeat = cardinalityIndex.scan(cardinalityInput);
  assert(
    cardinalityOverflowRepeat.ready === false &&
      cardinalityOverflowRepeat.jobs.length === 0 &&
      Number(cardinalityOverflowRepeat.completionIo?.bytes_read_total || 0) ===
        cardinalityOverflowBytes &&
      String(cardinalityOverflowRepeat.holdReason || "").includes(
        "kind=cached_generation",
      ),
    "completion-cardinality-same-generation-hold-does-not-reread",
    `before_bytes=${cardinalityOverflowBytes} after_bytes=${cardinalityOverflowRepeat.completionIo?.bytes_read_total || 0} reason=${cardinalityOverflowRepeat.holdReason}`,
  );

  fs.writeFileSync(
    cardinalityReceiptsFile,
    JSON.stringify({ job_id: "cardinality_a", status: "completed" }) + "\n",
  );
  const cardinalityRecovered = cardinalityIndex.scan(cardinalityInput);
  assert(
    cardinalityRecovered.ready === true &&
      cardinalityRecovered.jobs.some(
        (entry) => entry.jobId === "completion_cardinality_job",
      ) &&
      cardinalityRecovered.doneTruthHas("cardinality_a") === true &&
      cardinalityRecovered.doneTruthHas("cardinality_c") === false,
    "completion-cardinality-generation-change-clears-cached-hold",
    `ready=${cardinalityRecovered.ready} jobs=${cardinalityRecovered.jobs.map((x) => x.jobId).join(",")}`,
  );

  const cardinalityFreshReceiptsFile = path.join(
    root,
    "receipts-completion-cardinality-fresh-overflow.jsonl",
  );
  fs.writeFileSync(
    cardinalityFreshReceiptsFile,
    [
      JSON.stringify({ job_id: "cardinality_a", status: "completed" }),
      JSON.stringify({ job_id: "cardinality_b", status: "completed" }),
      JSON.stringify({ job_id: "cardinality_c", status: "completed" }),
      "",
    ].join("\n"),
  );
  const cardinalityFreshIndex = new JobsDatanetWorkerRuntimeIndexV1({
    maxScanBytesPerTick: 64 * 1024,
    maxJobsPerTick: 8,
    maxSyncCompletionRebuildBytes: 1024 * 1024,
    completionRebuildBackoffMs: 5,
    maxCompletionIdsPerFile: 2,
  });
  const cardinalityFreshInput = {
    ...cardinalityInput,
    receiptsFile: cardinalityFreshReceiptsFile,
  };
  const cardinalityFreshOverflow = cardinalityFreshIndex.scan(
    cardinalityFreshInput,
  );
  assert(
    cardinalityFreshOverflow.ready === false &&
      cardinalityFreshOverflow.jobs.length === 0 &&
      String(cardinalityFreshOverflow.holdReason || "").includes(
        "VOID_AGENT_PICK2_JSONL_COMPLETION_CARDINALITY_HOLD",
      ),
    "completion-cardinality-full-rebuild-overflow-holds-before-jobs",
    `ready=${cardinalityFreshOverflow.ready} jobs=${cardinalityFreshOverflow.jobs.length} reason=${cardinalityFreshOverflow.holdReason}`,
  );

  const cardinalityRaceFile = path.join(
    root,
    "completion-cardinality-race.jsonl",
  );
  fs.writeFileSync(
    cardinalityRaceFile,
    [
      JSON.stringify({ job_id: "race_a", status: "completed" }),
      JSON.stringify({ job_id: "race_b", status: "completed" }),
      JSON.stringify({ job_id: "race_c", status: "completed" }),
      "",
    ].join("\n"),
  );
  let cardinalityRaceReplaced = false;
  const cardinalityRaceIndex = new AgentPick2JsonlSemanticIndexV1({
    chunkBytes: 4096,
    maxSyncCompletionRebuildBytes: 1024 * 1024,
    completionRebuildBackoffMs: 5,
    maxCompletionIdsPerFile: 2,
    testHooks: {
      afterReadChunk: ({ file, kind, chunkIndex }) => {
        if (
          !cardinalityRaceReplaced &&
          file === cardinalityRaceFile &&
          kind === "completion_full" &&
          chunkIndex === 0
        ) {
          cardinalityRaceReplaced = true;
          const replacement = `${cardinalityRaceFile}.replacement`;
          fs.writeFileSync(
            replacement,
            JSON.stringify({ job_id: "race_replacement", status: "completed" }) +
              "\n",
          );
          fs.renameSync(replacement, cardinalityRaceFile);
        }
      },
    },
  });
  const cardinalityRaceOld = cardinalityRaceIndex.completionTruthSnapshotV1([
    cardinalityRaceFile,
  ]);
  assert(
    cardinalityRaceReplaced &&
      cardinalityRaceOld.ready === false &&
      String(cardinalityRaceOld.holdReason || "").includes(
        "VOID_AGENT_PICK2_JSONL_COMPLETION_CARDINALITY_HOLD",
      ),
    "completion-cardinality-racing-replacement-old-scan-holds",
    `replaced=${cardinalityRaceReplaced} ready=${cardinalityRaceOld.ready} reason=${cardinalityRaceOld.holdReason}`,
  );
  const cardinalityRaceReplacement =
    cardinalityRaceIndex.completionTruthSnapshotV1([cardinalityRaceFile]);
  assert(
    cardinalityRaceReplacement.ready === true &&
      cardinalityRaceReplacement.doneTruthHas("race_replacement") === true &&
      cardinalityRaceReplacement.doneTruthHas("race_a") === false,
    "completion-cardinality-racing-replacement-not-cache-poisoned",
    `ready=${cardinalityRaceReplacement.ready} replacement=${cardinalityRaceReplacement.doneTruthHas("race_replacement")}`,
  );

  assert(
    VOID_JOBS_DATANET_WORKER_MAX_SEEN_JOB_IDS_V1 === 250_000,
    "seen-job-cardinality-default-pinned",
    `max_seen=${VOID_JOBS_DATANET_WORKER_MAX_SEEN_JOB_IDS_V1}`,
  );
  assert(
    VOID_JOBS_DATANET_WORKER_MAX_JOB_ID_UTF8_BYTES_V1 === 192,
    "seen-job-id-byte-ceiling-pinned",
    `max_bytes=${VOID_JOBS_DATANET_WORKER_MAX_JOB_ID_UTF8_BYTES_V1}`,
  );
  assert(
    normalizeMaxSeenJobIdsV1(undefined) ===
      VOID_JOBS_DATANET_WORKER_MAX_SEEN_JOB_IDS_V1 &&
      normalizeMaxSeenJobIdsV1("") ===
        VOID_JOBS_DATANET_WORKER_MAX_SEEN_JOB_IDS_V1 &&
      normalizeMaxSeenJobIdsV1("not-a-number") ===
        VOID_JOBS_DATANET_WORKER_MAX_SEEN_JOB_IDS_V1 &&
      normalizeMaxSeenJobIdsV1(0) ===
        VOID_JOBS_DATANET_WORKER_MAX_SEEN_JOB_IDS_V1 &&
      normalizeMaxSeenJobIdsV1(5_000_000) ===
        VOID_JOBS_DATANET_WORKER_MAX_SEEN_JOB_IDS_V1 &&
      normalizeMaxSeenJobIdsV1(2) === 2,
    "seen-job-cardinality-config-cannot-raise-ceiling",
    [
      `default=${normalizeMaxSeenJobIdsV1(undefined)}`,
      `invalid=${normalizeMaxSeenJobIdsV1("not-a-number")}`,
      `zero=${normalizeMaxSeenJobIdsV1(0)}`,
      `raised=${normalizeMaxSeenJobIdsV1(5_000_000)}`,
      `lowered=${normalizeMaxSeenJobIdsV1(2)}`,
    ].join(" "),
  );
  assert(
    VOID_JOBS_DATANET_WORKER_MAX_LOCALLY_DONE_JOB_IDS_V1 === 250_000,
    "locally-done-cardinality-default-pinned",
    `max_local=${VOID_JOBS_DATANET_WORKER_MAX_LOCALLY_DONE_JOB_IDS_V1}`,
  );
  assert(
    normalizeMaxLocallyDoneJobIdsV1(undefined) ===
      VOID_JOBS_DATANET_WORKER_MAX_LOCALLY_DONE_JOB_IDS_V1 &&
      normalizeMaxLocallyDoneJobIdsV1("") ===
        VOID_JOBS_DATANET_WORKER_MAX_LOCALLY_DONE_JOB_IDS_V1 &&
      normalizeMaxLocallyDoneJobIdsV1("not-a-number") ===
        VOID_JOBS_DATANET_WORKER_MAX_LOCALLY_DONE_JOB_IDS_V1 &&
      normalizeMaxLocallyDoneJobIdsV1(0) ===
        VOID_JOBS_DATANET_WORKER_MAX_LOCALLY_DONE_JOB_IDS_V1 &&
      normalizeMaxLocallyDoneJobIdsV1(5_000_000) ===
        VOID_JOBS_DATANET_WORKER_MAX_LOCALLY_DONE_JOB_IDS_V1 &&
      normalizeMaxLocallyDoneJobIdsV1(2) === 2,
    "locally-done-cardinality-config-cannot-raise-ceiling",
    [
      `default=${normalizeMaxLocallyDoneJobIdsV1(undefined)}`,
      `invalid=${normalizeMaxLocallyDoneJobIdsV1("not-a-number")}`,
      `zero=${normalizeMaxLocallyDoneJobIdsV1(0)}`,
      `raised=${normalizeMaxLocallyDoneJobIdsV1(5_000_000)}`,
      `lowered=${normalizeMaxLocallyDoneJobIdsV1(2)}`,
    ].join(" "),
  );

  // Locally-completed replay truth crosses admitted jobs-file generations.
  // It must remain exact while bounded, and overflow must HOLD before a new
  // queued job can be returned to the worker.
  const localDoneJobsFile = path.join(root, "jobs-local-done-bound.jsonl");
  const localDoneReceiptsFile = path.join(root, "receipts-local-done-bound.jsonl");
  const localDoneJobStateFile = path.join(root, "job-state-local-done-bound.jsonl");
  fs.writeFileSync(localDoneReceiptsFile, "");
  fs.writeFileSync(localDoneJobStateFile, "");
  const localDoneIndex = new JobsDatanetWorkerRuntimeIndexV1({
    maxScanBytesPerTick: 64 * 1024,
    maxJobsPerTick: 8,
    maxSeenJobIds: 8,
    maxLocallyDoneJobIds: 2,
    maxSyncCompletionRebuildBytes: 1024 * 1024,
    completionRebuildBackoffMs: 5,
  });
  const localDoneInput = {
    jobsFile: localDoneJobsFile,
    receiptsFile: localDoneReceiptsFile,
    jobStateFile: localDoneJobStateFile,
  };
  const writeLocalDoneGeneration = (ids: string[]) => {
    fs.writeFileSync(
      localDoneJobsFile,
      ids.map((jobId) => JSON.stringify({ job_id: jobId, status: "queued" }))
        .join("\n") + "\n",
    );
  };
  const resetLocalDoneGeneration = () => {
    if (fs.existsSync(localDoneJobsFile)) fs.unlinkSync(localDoneJobsFile);
    const empty = localDoneIndex.scan(localDoneInput);
    assert(
      empty.ready === true && empty.jobs.length === 0,
      "locally-done-explicit-source-lifecycle-reset-green",
      `ready=${empty.ready} jobs=${empty.jobs.length}`,
    );
  };

  writeLocalDoneGeneration(["local_done_a"]);
  const localDoneA = localDoneIndex.scan(localDoneInput);
  assert(
    localDoneA.jobs.map((item) => item.jobId).join(",") === "local_done_a",
    "locally-done-generation-a-admitted",
    `jobs=${localDoneA.jobs.map((item) => item.jobId).join(",")}`,
  );
  localDoneIndex.markDone("local_done_a");

  resetLocalDoneGeneration();
  writeLocalDoneGeneration(["local_done_a", "local_done_b"]);
  const localDoneB = localDoneIndex.scan(localDoneInput);
  assert(
    localDoneB.jobs.map((item) => item.jobId).join(",") === "local_done_b" &&
      (localDoneIndex as any).locallyDone.has("local_done_a") === true,
    "locally-done-replay-fence-survives-generation-reset",
    `jobs=${localDoneB.jobs.map((item) => item.jobId).join(",")} local_size=${(localDoneIndex as any).locallyDone.size}`,
  );
  localDoneIndex.markDone("local_done_b");
  assert(
    (localDoneIndex as any).locallyDone.size === 2,
    "locally-done-budget-filled-exactly",
    `size=${(localDoneIndex as any).locallyDone.size}`,
  );

  resetLocalDoneGeneration();
  writeLocalDoneGeneration(["local_done_c"]);
  let localDoneOverflowReason = "";
  try {
    localDoneIndex.scan(localDoneInput);
  } catch (error) {
    localDoneOverflowReason = String((error as Error)?.message || error);
  }
  assert(
    localDoneOverflowReason.includes(
      "VOID_JOBS_DATANET_WORKER_LOCALLY_DONE_CARDINALITY_HOLD",
    ) && localDoneOverflowReason.includes("limit=2"),
    "locally-done-overflow-holds-before-new-job-return",
    `reason=${localDoneOverflowReason}`,
  );
  const localDoneAfterHold = localDoneIndex.scan(localDoneInput);
  assert(
    localDoneAfterHold.ready === false &&
      localDoneAfterHold.jobs.length === 0 &&
      localDoneAfterHold.holdReason === "jobs_locally_done_cardinality_hold" &&
      (localDoneIndex as any).locallyDone.has("local_done_a") === true &&
      (localDoneIndex as any).locallyDone.has("local_done_b") === true &&
      (localDoneIndex as any).locallyDone.has("local_done_c") === false,
    "locally-done-overflow-quarantines-without-eviction",
    `ready=${localDoneAfterHold.ready} reason=${localDoneAfterHold.holdReason} local_size=${(localDoneIndex as any).locallyDone.size}`,
  );

  resetLocalDoneGeneration();
  writeLocalDoneGeneration(["local_done_a"]);
  const localDoneReplay = localDoneIndex.scan(localDoneInput);
  assert(
    localDoneReplay.ready === true &&
      localDoneReplay.jobs.length === 0 &&
      (localDoneIndex as any).locallyDone.size === 2,
    "locally-done-old-membership-remains-authoritative-after-reset",
    `ready=${localDoneReplay.ready} jobs=${localDoneReplay.jobs.length} local_size=${(localDoneIndex as any).locallyDone.size}`,
  );

  const seenDupJobsFile = path.join(root, "jobs-seen-duplicate-budget.jsonl");
  const seenDupReceiptsFile = path.join(
    root,
    "receipts-seen-duplicate-budget.jsonl",
  );
  const seenDupJobStateFile = path.join(
    root,
    "job-state-seen-duplicate-budget.jsonl",
  );
  fs.writeFileSync(seenDupReceiptsFile, "");
  fs.writeFileSync(seenDupJobStateFile, "");
  fs.writeFileSync(
    seenDupJobsFile,
    [
      JSON.stringify({
        job_id: "seen_dup_a",
        status: "queued",
        kind: "datanet_publish",
        input: { plaintext: "a1" },
      }),
      JSON.stringify({
        job_id: "seen_dup_a",
        status: "queued",
        kind: "datanet_publish",
        input: { plaintext: "a2" },
      }),
      JSON.stringify({
        job_id: "seen_dup_b",
        status: "queued",
        kind: "datanet_publish",
        input: { plaintext: "b" },
      }),
      "",
    ].join("\n"),
  );
  const seenDupIndex = new JobsDatanetWorkerRuntimeIndexV1({
    maxScanBytesPerTick: 64 * 1024,
    maxJobsPerTick: 8,
    maxSeenJobIds: 2,
    maxSyncCompletionRebuildBytes: 1024 * 1024,
    completionRebuildBackoffMs: 5,
  });
  const seenDupSnapshot = seenDupIndex.scan({
    jobsFile: seenDupJobsFile,
    receiptsFile: seenDupReceiptsFile,
    jobStateFile: seenDupJobStateFile,
  });
  assert(
    seenDupSnapshot.ready === true &&
      seenDupSnapshot.scanComplete === true &&
      seenDupSnapshot.jobs.length === 2 &&
      seenDupSnapshot.jobs.map((item) => item.jobId).join(",") ===
        "seen_dup_a,seen_dup_b",
    "seen-job-duplicates-do-not-spend-cardinality",
    `ready=${seenDupSnapshot.ready} complete=${seenDupSnapshot.scanComplete} jobs=${seenDupSnapshot.jobs.map((item) => item.jobId).join(",")}`,
  );

  const seenOverflowJobsFile = path.join(
    root,
    "jobs-seen-cardinality-overflow.jsonl",
  );
  const seenOverflowReceiptsFile = path.join(
    root,
    "receipts-seen-cardinality-overflow.jsonl",
  );
  const seenOverflowJobStateFile = path.join(
    root,
    "job-state-seen-cardinality-overflow.jsonl",
  );
  fs.writeFileSync(seenOverflowReceiptsFile, "");
  fs.writeFileSync(seenOverflowJobStateFile, "");
  fs.writeFileSync(
    seenOverflowJobsFile,
    [
      JSON.stringify({ job_id: "seen_a", status: "queued" }),
      JSON.stringify({ job_id: "seen_b", status: "queued" }),
      JSON.stringify({ job_id: "seen_c", status: "queued" }),
      "",
    ].join("\n"),
  );
  const seenOverflowIndex = new JobsDatanetWorkerRuntimeIndexV1({
    maxScanBytesPerTick: 64 * 1024,
    maxJobsPerTick: 8,
    maxSeenJobIds: 2,
    maxSyncCompletionRebuildBytes: 1024 * 1024,
    completionRebuildBackoffMs: 5,
  });
  let seenOverflowReason = "";
  try {
    seenOverflowIndex.scan({
      jobsFile: seenOverflowJobsFile,
      receiptsFile: seenOverflowReceiptsFile,
      jobStateFile: seenOverflowJobStateFile,
    });
  } catch (error) {
    seenOverflowReason = String((error as Error)?.message || error);
  }
  assert(
    seenOverflowReason.includes(
      "VOID_JOBS_DATANET_WORKER_SEEN_JOB_CARDINALITY_HOLD",
    ) && seenOverflowReason.includes("limit=2"),
    "seen-job-cardinality-overflow-holds-before-third-id",
    `reason=${seenOverflowReason}`,
  );

  const sameStampJobsFile = path.join(
    root,
    "jobs-seen-cardinality-same-stamp.jsonl",
  );
  const sameStampReceiptsFile = path.join(
    root,
    "receipts-seen-cardinality-same-stamp.jsonl",
  );
  const sameStampJobStateFile = path.join(
    root,
    "job-state-seen-cardinality-same-stamp.jsonl",
  );
  fs.writeFileSync(sameStampReceiptsFile, "");
  fs.writeFileSync(sameStampJobStateFile, "");
  const sameStampRows = [
    JSON.stringify({
      job_id: "same_stamp_a",
      status: "queued",
      input: { plaintext: "a".repeat(1850) },
    }),
    JSON.stringify({
      job_id: "same_stamp_b",
      status: "queued",
      input: { plaintext: "b".repeat(1850) },
    }),
    JSON.stringify({
      job_id: "same_stamp_c",
      status: "queued",
      input: { plaintext: "c".repeat(1850) },
    }),
  ];
  const firstTwoBytes = Buffer.byteLength(
    sameStampRows[0] + "\n" + sameStampRows[1] + "\n",
    "utf8",
  );
  const sameStampBytes = Buffer.byteLength(
    sameStampRows.join("\n") + "\n",
    "utf8",
  );
  assert(
    firstTwoBytes < 4096 && sameStampBytes > 4096,
    "seen-job-same-stamp-fixture-crosses-scan-boundary",
    `first_two=${firstTwoBytes} total=${sameStampBytes}`,
  );
  fs.writeFileSync(sameStampJobsFile, sameStampRows.join("\n") + "\n");
  const sameStampIndex = new JobsDatanetWorkerRuntimeIndexV1({
    maxScanBytesPerTick: 4096,
    maxJobsPerTick: 8,
    maxSeenJobIds: 2,
    maxSyncCompletionRebuildBytes: 1024 * 1024,
    completionRebuildBackoffMs: 5,
  });
  const sameStampInput = {
    jobsFile: sameStampJobsFile,
    receiptsFile: sameStampReceiptsFile,
    jobStateFile: sameStampJobStateFile,
  };
  const sameStampFirst = sameStampIndex.scan(sameStampInput);
  assert(
    sameStampFirst.ready === true &&
      sameStampFirst.jobs.length === 2 &&
      sameStampFirst.scanComplete === false,
    "seen-job-same-stamp-first-chunk-admitted",
    `ready=${sameStampFirst.ready} jobs=${sameStampFirst.jobs.length} complete=${sameStampFirst.scanComplete}`,
  );
  const staleSameStampJob = sameStampFirst.jobs[0]!.job;
  for (const item of sameStampFirst.jobs) sameStampIndex.markDone(item.jobId);

  let sameStampOverflowReason = "";
  try {
    sameStampIndex.scan(sameStampInput);
  } catch (error) {
    sameStampOverflowReason = String((error as Error)?.message || error);
  }
  assert(
    sameStampOverflowReason.includes(
      "VOID_JOBS_DATANET_WORKER_SEEN_JOB_CARDINALITY_HOLD",
    ),
    "seen-job-same-stamp-later-chunk-overflow-holds",
    `reason=${sameStampOverflowReason}`,
  );

  let staleSameStampUseReason = "";
  try {
    void staleSameStampJob.status;
  } catch (error) {
    staleSameStampUseReason = String((error as Error)?.message || error);
  }
  assert(
    staleSameStampUseReason.includes(
      "VOID_JOBS_DATANET_WORKER_PENDING_USE_AUTHORITY_CHANGED",
    ),
    "seen-job-overflow-invalidates-earlier-same-stamp-job-proxy",
    `reason=${staleSameStampUseReason}`,
  );

  const sameStampAfterHold = sameStampIndex.scan(sameStampInput);
  assert(
    sameStampAfterHold.ready === false &&
      sameStampAfterHold.jobs.length === 0 &&
      sameStampAfterHold.holdReason ===
        "jobs_seen_job_cardinality_hold",
    "seen-job-overflow-quarantines-current-generation",
    `ready=${sameStampAfterHold.ready} jobs=${sameStampAfterHold.jobs.length} reason=${sameStampAfterHold.holdReason}`,
  );

  const seenLongJobsFile = path.join(root, "jobs-seen-overlong-id.jsonl");
  const seenLongReceiptsFile = path.join(
    root,
    "receipts-seen-overlong-id.jsonl",
  );
  const seenLongJobStateFile = path.join(
    root,
    "job-state-seen-overlong-id.jsonl",
  );
  fs.writeFileSync(seenLongReceiptsFile, "");
  fs.writeFileSync(seenLongJobStateFile, "");
  const multibyteJobId = "é".repeat(97);
  assert(
    multibyteJobId.length < VOID_JOBS_DATANET_WORKER_MAX_JOB_ID_UTF8_BYTES_V1 &&
      Buffer.byteLength(multibyteJobId, "utf8") >
        VOID_JOBS_DATANET_WORKER_MAX_JOB_ID_UTF8_BYTES_V1,
    "seen-job-id-fixture-proves-byte-not-character-bound",
    `chars=${multibyteJobId.length} bytes=${Buffer.byteLength(multibyteJobId, "utf8")}`,
  );
  fs.writeFileSync(
    seenLongJobsFile,
    JSON.stringify({ job_id: multibyteJobId, status: "queued" }) + "\n",
  );
  const seenLongIndex = new JobsDatanetWorkerRuntimeIndexV1({
    maxScanBytesPerTick: 64 * 1024,
    maxJobsPerTick: 8,
    maxSeenJobIds: 2,
    maxSyncCompletionRebuildBytes: 1024 * 1024,
    completionRebuildBackoffMs: 5,
  });
  let seenLongReason = "";
  try {
    seenLongIndex.scan({
      jobsFile: seenLongJobsFile,
      receiptsFile: seenLongReceiptsFile,
      jobStateFile: seenLongJobStateFile,
    });
  } catch (error) {
    seenLongReason = String((error as Error)?.message || error);
  }
  assert(
    seenLongReason.includes("VOID_JOBS_DATANET_WORKER_JOB_ID_TOO_LARGE"),
    "seen-job-overlong-id-holds-before-set-insert",
    `reason=${seenLongReason}`,
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

  // Execute the exact processJob source with filesystem-backed effect stubs.
  // The stale completion generation must traverse the real catch path and
  // rethrow before running, failed, receipt, payload, or done-marker effects.
  const executableProcessSource = processSource
    .trim()
    .replace(/([A-Za-z_$][A-Za-z0-9_$]*):(string|any)\b/g, "$1")
    .replace(/\s+as any\b/g, "");
  const consumerEffectsRoot = path.join(root, "consumer-process-effects");
  const consumerPayloadRoot = path.join(consumerEffectsRoot, "payloads");
  const consumerReceiptsFile = path.join(consumerEffectsRoot, "receipts.jsonl");
  const consumerJobStateFile = path.join(consumerEffectsRoot, "job-state.jsonl");
  fs.mkdirSync(consumerPayloadRoot, { recursive: true });
  fs.writeFileSync(consumerReceiptsFile, "");
  fs.writeFileSync(consumerJobStateFile, "");
  let consumerDoneMarker = false;
  const PROCESS_MARK = "proof_mark";
  const processContext = {
    require: (specifier: string) => {
      if (specifier === "node:fs") return fs;
      if (specifier === "node:path") return path;
      throw new Error(`unexpected require: ${specifier}`);
    },
    Buffer,
    latestJobById: () => null,
    hasCompletedTruth: () => false,
    markJobDone: () => {
      consumerDoneMarker = true;
    },
    safeStr: (value: unknown, max: number) =>
      String(value ?? "").slice(0, max),
    replaceJobState: (_jobId: string, row: unknown) => {
      fs.appendFileSync(consumerJobStateFile, JSON.stringify(row) + "\n");
    },
    nowMs: () => 1_700_000_000_000,
    voidIndexEmptyCatchVisibilityWindow59401_78300V1: () => undefined,
    sha256Hex: async () => "0".repeat(64),
    datanetDir: () => consumerPayloadRoot,
    appendJsonl: (_file: string, row: unknown) => {
      fs.appendFileSync(consumerReceiptsFile, JSON.stringify(row) + "\n");
    },
    receiptsFile: () => consumerReceiptsFile,
    tryFetchDatasetFromPeers: async () => ({
      ok: false,
      path: "",
      error: "not_used",
    }),
    G: { [PROCESS_MARK]: {} },
    MARK: PROCESS_MARK,
  };
  const executableProcessJob = vm.runInNewContext(
    `(${executableProcessSource})`,
    processContext,
  ) as (
    jobId: string,
    workerCtx: {
      job: any;
      assertGeneration: () => void;
      doneTruthHas: (id: string) => boolean;
    },
  ) => Promise<void>;

  let consumerProcessHeld = false;
  let consumerProcessReason = "";
  try {
    await executableProcessJob("completion_generation_job", {
      job: generationConsumerJob,
      assertGeneration: generationGEntry!.assertGeneration,
      doneTruthHas: generationG.doneTruthHas,
    });
  } catch (error) {
    consumerProcessReason = String((error as Error)?.message || error);
    consumerProcessHeld =
      consumerProcessReason.includes(
        "VOID_JOBS_DATANET_WORKER_COMPLETION_HOLD",
      ) &&
      consumerProcessReason.includes("COMPLETION_SNAPSHOT_EXPIRED");
  }
  assert(
    consumerProcessHeld &&
      fs.readdirSync(consumerPayloadRoot).length === 0 &&
      fs.readFileSync(consumerReceiptsFile, "utf8") === "" &&
      fs.readFileSync(consumerJobStateFile, "utf8") === "" &&
      consumerDoneMarker === false,
    "expired-completion-generation-crosses-real-consumer-with-zero-effects",
    `held=${consumerProcessHeld} payloads=${fs.readdirSync(consumerPayloadRoot).length} receipts=${fs.statSync(consumerReceiptsFile).size} job_state=${fs.statSync(consumerJobStateFile).size} done=${consumerDoneMarker} reason=${consumerProcessReason}`,
  );

  assert(
    processSource.includes("workerCompletedTruthHas"),
    "process-job-context-completion-truth",
    "workerCompletedTruthHas present",
  );
  assert(
    automaticWorker.includes("assertGeneration: item.assertGeneration") &&
      automaticWorker.includes("item.assertGeneration();"),
    "automatic-worker-passes-generation-assertion",
    "explicit generation assertion crosses the consumer boundary",
  );
  assert(
    processSource.includes("const assertWorkerGeneration = () =>"),
    "process-job-generation-assertion-present",
    "processJob has an explicit post-capture authority guard",
  );
  const processLines = processSource.split("\n");
  const previousNonemptyLine = (index: number) => {
    for (let i = index - 1; i >= 0; i -= 1) {
      const line = processLines[i].trim();
      if (line) return line;
    }
    return "";
  };
  const effectLines = processLines
    .map((line, index) => ({ line: line.trim(), index }))
    .filter(({ line }) =>
      line.startsWith("fs.writeFileSync(") ||
      line.startsWith("appendJsonl(") ||
      line.startsWith("replaceJobState(") ||
      line.startsWith("markJobDone(")
    );
  assert(
    effectLines.length >= 11 &&
      effectLines.every(
        ({ index }) =>
          previousNonemptyLine(index) === "assertWorkerGeneration();",
      ),
    "process-job-every-effect-is-generation-guarded",
    `effects=${effectLines.length}`,
  );
  const awaitedEffectInputs = processLines
    .map((line, index) => ({ line: line.trim(), index }))
    .filter(({ line }) =>
      line.includes("await sha256Hex(") ||
      line.includes("await tryFetchDatasetFromPeers(")
    );
  assert(
    awaitedEffectInputs.length === 8 &&
      awaitedEffectInputs.every(
        ({ index }) =>
          String(processLines[index + 1] || "").trim() ===
          "assertWorkerGeneration();",
      ),
    "process-job-every-await-revalidates-generation",
    `awaits=${awaitedEffectInputs.length}`,
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
    helperSource.includes("VOID_JOBS_DATANET_WORKER_PENDING_USE_AUTHORITY_CHANGED"),
    "runtime-index-pending-use-generation-source",
    "pending jobs revalidate the admitted source before use",
  );
  assert(
    helperSource.includes("jobs_unwitnessed_source_change"),
    "runtime-index-unwitnessed-transition-hold-source",
    "unwitnessed source transitions hold before completion derivation",
  );
  assert(
    helperSource.includes("VOID_JOBS_DATANET_WORKER_PENDING_BACKPRESSURE_V1"),
    "runtime-index-pending-backpressure-source",
    "pending backlog pauses history advancement",
  );
  assert(
    helperSource.includes('new TextDecoder("utf-8", { fatal: true })'),
    "runtime-index-fatal-utf8-source",
    "fatal TextDecoder present",
  );
  assert(
    helperSource.includes("framed[index] !== 0x0a"),
    "runtime-index-byte-framing-source",
    "newline framing occurs on exact bytes",
  );
  assert(
    !helperSource.includes('buffer.subarray(0, done).toString("utf8")'),
    "runtime-index-no-preframe-utf8-decode",
    "chunk-level replacement decoding absent",
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
  assert(
    semanticSource.includes("VOID_AGENT_PICK2_JSONL_COMPLETION_CARDINALITY_HOLD") &&
      semanticSource.includes("addCompletionIdBoundedV1") &&
      semanticSource.includes("completionCardinalityHoldStamps") &&
      semanticSource.includes("completionIdLengthHoldStamps") &&
      semanticSource.includes("normalizeMaxCompletionIdsPerFileV1") &&
      semanticSource.includes("VOID_AGENT_PICK2_JSONL_COMPLETION_ID_LENGTH_HOLD") &&
      helperSource.includes("VOID_JOBS_WORKER_MAX_COMPLETION_IDS_PER_FILE") &&
      helperSource.includes("this.locallyDone.delete(id)"),
    "completion-cardinality-guard-source-present",
    "semantic cardinality guard and worker configuration seam present",
  );
  assert(
    helperSource.includes("VOID_JOBS_DATANET_WORKER_MAX_SEEN_JOB_IDS_V1") &&
      helperSource.includes("VOID_JOBS_WORKER_MAX_SEEN_JOB_IDS") &&
      helperSource.includes(
        "VOID_JOBS_DATANET_WORKER_SEEN_JOB_CARDINALITY_HOLD",
      ) &&
      helperSource.includes("VOID_JOBS_DATANET_WORKER_JOB_ID_TOO_LARGE") &&
      helperSource.includes('Buffer.byteLength(jobId, "utf8")') &&
      helperSource.includes("this.jobsSeen.size >= this.maxSeenJobIds") &&
      helperSource.includes("this.jobsSourceRejected = true") &&
      helperSource.includes("jobs_seen_job_cardinality_hold"),
    "seen-job-cardinality-guard-source-present",
    "per-generation seen-job Set has bounded count and UTF-8 ID bytes",
  );
  assert(
    helperSource.includes(
      "VOID_JOBS_DATANET_WORKER_MAX_LOCALLY_DONE_JOB_IDS_V1",
    ) &&
      helperSource.includes("VOID_JOBS_WORKER_MAX_LOCALLY_DONE_JOB_IDS") &&
      helperSource.includes(
        "VOID_JOBS_DATANET_WORKER_LOCALLY_DONE_CARDINALITY_HOLD",
      ) &&
      helperSource.includes("this.maxLocallyDoneJobIds - this.locallyDone.size") &&
      helperSource.includes(
        'this.rejectJobsSourceV1("jobs_locally_done_cardinality_hold")',
      ) &&
      !helperSource.includes("this.locallyDone.clear()"),
    "locally-done-cardinality-guard-source-present",
    "cross-generation locallyDone Set is exact, bounded, and never evicted",
  );
  assert(
    semanticSource.includes("completed: ReadonlySet<string>") &&
      semanticSource.includes("completed: state.completed") &&
      semanticSource.includes("const nextCompleted = new Set(prior.completed)") &&
      semanticSource.includes("nextCompleted.add(id)") &&
      !semanticSource.includes("completed: new Set(state.completed)") &&
      !semanticSource.includes("state.completed.add(id)"),
    "completion-snapshot-zero-copy-copy-on-write-source-present",
    "published completion membership is readonly/copy-on-write and snapshot cloning is absent",
  );
  assert(
    semanticSource.includes("COMPLETION_SNAPSHOT_EXPIRED") &&
      helperSource.includes("assertCompletionGenerationV1(completion)") &&
      helperSource.includes(
        '"VOID_JOBS_DATANET_WORKER_COMPLETION_HOLD " + message',
      ) &&
      helperSource.includes("completionGeneration: completion.generation"),
    "completion-generation-lease-source-present",
    "immutable completion identity and pre-effect expiry guard present",
  );

  console.log("completion_snapshot_zero_copy_membership=true");
  console.log("completion_state_copy_on_write=true");
  console.log("old_completion_snapshot_membership_immutable=true");
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
