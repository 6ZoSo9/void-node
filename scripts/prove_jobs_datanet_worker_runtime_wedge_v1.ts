import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import * as vm from "node:vm";
import { readFileSync } from "node:fs";
import { JobsDatanetWorkerRuntimeIndexV1 } from "../src/http/jobs_datanet_worker_runtime_index_v1.js";
import {
  VOID_AGENT_PICK2_JSONL_MAX_RECORD_BYTES_V1,
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
    semanticSource.includes("COMPLETION_SNAPSHOT_EXPIRED") &&
      helperSource.includes("assertCompletionGenerationV1(completion)") &&
      helperSource.includes(
        '"VOID_JOBS_DATANET_WORKER_COMPLETION_HOLD " + message',
      ) &&
      helperSource.includes("completionGeneration: completion.generation"),
    "completion-generation-lease-source-present",
    "immutable completion identity and pre-effect expiry guard present",
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
