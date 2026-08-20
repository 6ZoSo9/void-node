import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
  AgentPick2JsonlSemanticIndexV1,
} from "../src/http/agent_pick2_jsonl_semantic_index_v1.js";
import {
  appendWcPublicRemoteTruthJsonlExactOnceV1,
  resetWcPublicRemoteTruthJsonlIndexForProofV1,
  waitForWcPublicRemoteTruthJsonlIndexWarmForProofV1,
  wcPublicRemoteTruthJsonlIndexMetricsV1,
} from "../src/economic/wc_public_remote_truth_jsonl_index_v1.js";

const MIB = 1024 * 1024;
const COLD_REQUEST_BOUND_MS = 2_000;
const realSize = process.env.VOID_PICK2_EXTERNAL_WRITER_REAL_SIZE === "1";
const receiptTarget = (realSize ? 82 : 8) * MIB;
const jobStateTarget = (realSize ? 67 : 7) * MIB;
const jobsTarget = (realSize ? 3 : 1) * MIB;
const iterations = realSize ? 24 : 12;

function need(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(
      `VOID_AGENT_PICK2_EXTERNAL_WRITER_CACHE_WEDGE_V1_FAIL: ${message}`,
    );
  }
}

function writeSizedJsonl(
  file: string,
  targetBytes: number,
  makeRow: (n: number, padding: string) => Record<string, any>,
): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const fd = fs.openSync(file, "w", 0o600);
  const padding = "x".repeat(768);
  let written = 0;
  let n = 0;
  try {
    while (written < targetBytes) {
      const line = Buffer.from(
        JSON.stringify(makeRow(n++, padding)) + "\n",
      );
      fs.writeSync(fd, line);
      written += line.length;
    }
    fs.fdatasyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
}

function statBytes(file: string): number {
  return fs.statSync(file).size;
}

async function expectWarming<T>(
  promise: Promise<T>,
  label: string,
): Promise<void> {
  await assert.rejects(
    promise,
    (error: any) => {
      need(
        String(error?.message || error).includes(
          "VOID_WC_REMOTE_TRUTH_INDEX_WARMING",
        ),
        `${label} did not return warming HOLD`,
      );
      return true;
    },
  );
}

async function warmHelper(
  file: string,
  value: Record<string, any>,
  idFields: string[],
) {
  const started = Date.now();
  await expectWarming(
    appendWcPublicRemoteTruthJsonlExactOnceV1(file, value, idFields),
    file,
  );
  need(
    Date.now() - started < COLD_REQUEST_BOUND_MS,
    `cold request did not fail fast: ${file}`,
  );
  await waitForWcPublicRemoteTruthJsonlIndexWarmForProofV1(file, idFields);
  return appendWcPublicRemoteTruthJsonlExactOnceV1(file, value, idFields);
}

async function warmSemantic(
  semantic: AgentPick2JsonlSemanticIndexV1,
  input: any,
): Promise<any> {
  for (let attempt = 0; attempt < 8; attempt++) {
    try {
      return semantic.snapshot(input);
    } catch (error: any) {
      const message = String(error?.message || error);
      need(
        /VOID_AGENT_PICK2_JSONL_(COMPLETION_WARMING_HOLD|UNWITNESSED_COMPLETION_GROWTH_HOLD|COMPLETION_REBUILD_BACKOFF)/.test(
          message,
        ),
        `unexpected semantic warm error: ${message}`,
      );
      for (const file of input.completionFiles) {
        await semantic.waitForCompletionWarmForProofV1(file);
      }
    }
  }
  throw new Error("semantic warm did not converge");
}

async function malformedHistoryCase(
  root: string,
  relative: string,
  idFields: string[],
  value: Record<string, any>,
): Promise<void> {
  resetWcPublicRemoteTruthJsonlIndexForProofV1();
  const file = path.join(root, relative);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(
    file,
    JSON.stringify({ seed: true }) +
      "\n" +
      `{"${idFields[0]}":"${String(value[idFields[0]] || "target")}"` +
      "\n",
  );
  const before = fs.statSync(file).size;
  await expectWarming(
    appendWcPublicRemoteTruthJsonlExactOnceV1(file, value, idFields),
    `malformed-${relative}`,
  );
  await assert.rejects(
    () => waitForWcPublicRemoteTruthJsonlIndexWarmForProofV1(file, idFields),
    /VOID_WC_REMOTE_TRUTH_(INDEX_WARM_FAILED|MALFORMED_HISTORY)/,
  );
  need(
    fs.statSync(file).size === before,
    `${relative} mutated on malformed history`,
  );
  await assert.rejects(
    () => appendWcPublicRemoteTruthJsonlExactOnceV1(file, value, idFields),
    /VOID_WC_REMOTE_TRUTH_INDEX_WARM_FAILED/,
  );
  const metric = wcPublicRemoteTruthJsonlIndexMetricsV1().find(
    (x) => x.file === path.resolve(file),
  );
  need(!!metric, `${relative} metric missing`);
  need(
    metric!.canonical_appends_total === 0,
    `${relative} appended despite malformed history`,
  );
}

async function main(): Promise<void> {
  const tmp = fs.mkdtempSync(
    path.join(os.tmpdir(), "void-pick2-external-writer-wedge-v1-"),
  );
  const receipts = path.join(tmp, "agent_v1", "receipts.jsonl");
  const jobState = path.join(tmp, "agent_v1", "job_state.jsonl");
  const jobs = path.join(tmp, "agent", "jobs.jsonl");
  const results = path.join(tmp, "agent", "results.jsonl");
  const leases = path.join(tmp, "agent", "leases.jsonl");

  writeSizedJsonl(receipts, receiptTarget, (n, padding) => ({
    receipt_id: `seed-receipt-${n}`,
    job_id: `seed-job-r-${n}`,
    account: "seed-account",
    kind: "datanet_fetch_verify",
    status: "completed",
    dataset_id: "seed-dataset",
    input_hash: "a".repeat(64),
    output_hash: "b".repeat(64),
    output: { verified: true, padding },
    ts_ms: n + 1,
  }));
  writeSizedJsonl(jobState, jobStateTarget, (n, padding) => ({
    job_id: `seed-state-job-${n}`,
    receipt_id: `seed-state-receipt-${n}`,
    status: "completed",
    dataset_id: "seed-dataset",
    input_hash: "a".repeat(64),
    output_hash: "b".repeat(64),
    verified: true,
    padding,
    completed_at_ms: n + 1,
  }));
  writeSizedJsonl(jobs, jobsTarget, (n, padding) => ({
    id: `seed-job-${n}`,
    job_id: `seed-job-${n}`,
    account: "seed-account",
    kind: "datanet_fetch_verify",
    status: "queued",
    dataset_id: "seed-dataset",
    ts_ms: n + 1,
    padding,
  }));
  fs.mkdirSync(path.dirname(results), { recursive: true });
  fs.writeFileSync(results, "");
  fs.writeFileSync(leases, "");

  const semantic = new AgentPick2JsonlSemanticIndexV1({
    chunkBytes: 64 * 1024,
    maxSyncCompletionRebuildBytes: 1024 * 1024,
  });
  const input = {
    jobsFile: jobs,
    resultsFile: results,
    leasesFile: leases,
    completionFiles: [receipts, jobState],
    scanMax: 1000,
    leaseMs: 60_000,
    nowMs: Date.now(),
  };

  let semanticWarmTimerTicks = 0;
  const semanticWarmTimer = setInterval(() => {
    semanticWarmTimerTicks += 1;
  }, 5);
  const baseline = await warmSemantic(semantic, input);
  clearInterval(semanticWarmTimer);
  need(
    Number(
      (semantic as any).metrics.by_kind?.completion_full?.bytes_read || 0,
    ) === 0,
    "cold semantic completion warm performed synchronous history reads",
  );
  if (realSize) {
    need(
      semanticWarmTimerTicks >= 5,
      `semantic async warm starved timers: ${semanticWarmTimerTicks}`,
    );
  }
  const baselineRebuilds = baseline.io.rebuilds_total;
  const baselineWitnessMisses = baseline.io.append_witness_misses_total;

  resetWcPublicRemoteTruthJsonlIndexForProofV1();

  let timerTicks = 0;
  const timer = setInterval(() => {
    timerTicks += 1;
  }, 5);

  const receiptValue = {
    receipt_id: "p0-receipt-0",
    job_id: "p0-job-0",
    account: "p0-account",
    kind: "datanet_fetch_verify",
    status: "completed",
    dataset_id: "p0-dataset",
    input_hash: "c".repeat(64),
    output_hash: "d".repeat(64),
    output: { verified: true },
    ts_ms: Date.now(),
  };
  const jobValue = {
    id: "p0-job-0",
    job_id: "p0-job-0",
    account: "p0-account",
    kind: "datanet_fetch_verify",
    status: "queued",
    dataset_id: "p0-dataset",
    ts_ms: Date.now(),
  };
  const completionValue = {
    job_id: "p0-job-0",
    receipt_id: "p0-receipt-0",
    status: "completed",
    dataset_id: "p0-dataset",
    input_hash: "c".repeat(64),
    output_hash: "d".repeat(64),
    verified: true,
    completed_at_ms: Date.now(),
  };

  const receiptAppend = await warmHelper(
    receipts,
    receiptValue,
    ["receipt_id"],
  );
  const jobAppend = await warmHelper(jobs, jobValue, ["job_id"]);
  const completionAppend = await warmHelper(
    jobState,
    completionValue,
    ["job_id", "receipt_id"],
  );
  clearInterval(timer);

  need(receiptAppend.witnessed, "receipt append witness missing");
  need(jobAppend.witnessed, "job append witness missing");
  need(completionAppend.witnessed, "completion append witness missing");
  if (realSize) {
    need(timerTicks >= 5, `background warm starved timers: ${timerTicks}`);
  }

  let afterFirst = semantic.snapshot({ ...input, nowMs: Date.now() });
  need(
    afterFirst.io.append_witness_misses_total === baselineWitnessMisses,
    "witness miss after indexed append",
  );
  need(
    afterFirst.io.rebuilds_total === baselineRebuilds,
    "historical rebuild after indexed append",
  );

  const helperBaseline = wcPublicRemoteTruthJsonlIndexMetricsV1();
  for (const metric of helperBaseline) {
    need(
      metric.full_scans_total === 1,
      `helper did not warm exactly once: ${metric.file}`,
    );
    need(
      metric.warm_starts_total === 1,
      `helper warm count wrong: ${metric.file}`,
    );
  }
  const helperBytesBaseline = helperBaseline.reduce(
    (n, x) => n + x.bytes_read_total,
    0,
  );
  const semanticBytesBaseline = afterFirst.io.bytes_read_total;

  for (let i = 1; i <= iterations; i++) {
    const receiptId = `p0-receipt-${i}`;
    const jobId = `p0-job-${i}`;
    const inputHash =
      `${i.toString(16).padStart(2, "0")}${"e".repeat(62)}`.slice(0, 64);
    const outputHash =
      `${i.toString(16).padStart(2, "0")}${"f".repeat(62)}`.slice(0, 64);

    const r = await appendWcPublicRemoteTruthJsonlExactOnceV1(
      receipts,
      {
        receipt_id: receiptId,
        job_id: jobId,
        account: "p0-account",
        kind: "datanet_fetch_verify",
        status: "completed",
        dataset_id: "p0-dataset",
        input_hash: inputHash,
        output_hash: outputHash,
        output: { verified: true },
        ts_ms: Date.now(),
      },
      ["receipt_id"],
    );
    const j = await appendWcPublicRemoteTruthJsonlExactOnceV1(
      jobs,
      {
        id: jobId,
        job_id: jobId,
        account: "p0-account",
        kind: "datanet_fetch_verify",
        status: "queued",
        dataset_id: "p0-dataset",
        ts_ms: Date.now(),
      },
      ["job_id"],
    );
    const c = await appendWcPublicRemoteTruthJsonlExactOnceV1(
      jobState,
      {
        job_id: jobId,
        receipt_id: receiptId,
        status: "completed",
        dataset_id: "p0-dataset",
        input_hash: inputHash,
        output_hash: outputHash,
        verified: true,
        completed_at_ms: Date.now(),
      },
      ["job_id", "receipt_id"],
    );
    need(
      r.witnessed && j.witnessed && c.witnessed,
      `witness missing iteration ${i}`,
    );

    afterFirst = semantic.snapshot({ ...input, nowMs: Date.now() });
    need(
      afterFirst.io.append_witness_misses_total === baselineWitnessMisses,
      `pick2 witness miss iteration ${i}`,
    );
    need(
      afterFirst.io.rebuilds_total === baselineRebuilds,
      `pick2 rebuild iteration ${i}`,
    );
  }

  const helperAfter = wcPublicRemoteTruthJsonlIndexMetricsV1();
  const helperDelta =
    helperAfter.reduce((n, x) => n + x.bytes_read_total, 0) -
    helperBytesBaseline;
  const semanticDelta =
    afterFirst.io.bytes_read_total - semanticBytesBaseline;
  const deltaBudget = iterations * 3 * 64 * 1024;
  need(
    helperDelta < deltaBudget,
    `helper post-warm read too large: ${helperDelta}`,
  );
  need(
    semanticDelta < deltaBudget,
    `semantic post-warm read too large: ${semanticDelta}`,
  );

  const queueFile = path.join(tmp, "queue", "receipts.jsonl");
  writeSizedJsonl(
    queueFile,
    realSize ? 20 * MIB : 8 * MIB,
    (n, padding) => ({
      receipt_id: `queue-seed-${n}`,
      job_id: `queue-job-${n}`,
      status: "completed",
      padding,
    }),
  );
  resetWcPublicRemoteTruthJsonlIndexForProofV1();
  const queueValue = {
    receipt_id: "queue-new",
    job_id: "queue-new-job",
    status: "completed",
  };
  const queueStarted = Date.now();
  const queued = await Promise.allSettled(
    Array.from({ length: 8 }, () =>
      appendWcPublicRemoteTruthJsonlExactOnceV1(
        queueFile,
        queueValue,
        ["receipt_id"],
      ),
    ),
  );
  need(
    Date.now() - queueStarted < COLD_REQUEST_BOUND_MS,
    "concurrent cold requests queued behind history warm",
  );
  need(
    queued.every(
      (result) =>
        result.status === "rejected" &&
        String(
          (result as PromiseRejectedResult).reason?.message ||
            (result as PromiseRejectedResult).reason,
        ).includes("VOID_WC_REMOTE_TRUTH_INDEX_WARMING"),
    ),
    "cold concurrent requests did not all return warming HOLD",
  );
  const queueMetric = wcPublicRemoteTruthJsonlIndexMetricsV1().find(
    (x) => x.file === path.resolve(queueFile),
  );
  need(
    queueMetric?.warm_starts_total === 1,
    "more than one cold warm generation started",
  );
  await waitForWcPublicRemoteTruthJsonlIndexWarmForProofV1(
    queueFile,
    ["receipt_id"],
  );
  const queueRetry = await appendWcPublicRemoteTruthJsonlExactOnceV1(
    queueFile,
    queueValue,
    ["receipt_id"],
  );
  need(queueRetry.appended === true, "retry after warm did not append");
  const queueDuplicate = await appendWcPublicRemoteTruthJsonlExactOnceV1(
    queueFile,
    queueValue,
    ["receipt_id"],
  );
  need(
    queueDuplicate.appended === false,
    "exact retry after warm was not duplicate-safe",
  );

  const malformedRoot = path.join(tmp, "malformed");
  await malformedHistoryCase(
    malformedRoot,
    path.join("agent_v1", "receipts.jsonl"),
    ["receipt_id"],
    { receipt_id: "target-r", job_id: "target-j", status: "completed" },
  );
  await malformedHistoryCase(
    malformedRoot,
    path.join("agent", "jobs.jsonl"),
    ["job_id"],
    { job_id: "target-j", account: "a", status: "queued" },
  );
  await malformedHistoryCase(
    malformedRoot,
    path.join("agent_v1", "job_state.jsonl"),
    ["job_id", "receipt_id"],
    {
      job_id: "target-j",
      receipt_id: "target-r",
      status: "completed",
    },
  );

  const runnerTmp = fs.mkdtempSync(
    path.join(os.tmpdir(), "void-pick2-datanet-runner-recovery-v1-"),
  );
  const runnerJobs = path.join(runnerTmp, "agent", "jobs.jsonl");
  const runnerResults = path.join(runnerTmp, "agent", "results.jsonl");
  const runnerLeases = path.join(runnerTmp, "agent", "leases.jsonl");
  const runnerReceipts = path.join(runnerTmp, "agent", "receipts.jsonl");
  const runnerReceiptsV1 = path.join(
    runnerTmp,
    "agent_v1",
    "receipts.jsonl",
  );
  fs.mkdirSync(path.dirname(runnerJobs), { recursive: true });
  fs.mkdirSync(path.dirname(runnerReceiptsV1), { recursive: true });
  fs.writeFileSync(runnerResults, "");
  fs.writeFileSync(runnerLeases, "");
  fs.writeFileSync(runnerReceipts, "");
  writeSizedJsonl(runnerReceiptsV1, 2 * MIB, (n, padding) => ({
    receipt_id: `runner-seed-${n}`,
    job_id: `runner-seed-job-${n}`,
    status: "completed",
    padding,
  }));
  const runnerJobId = "cross-process-datanet-job-v1";
  fs.writeFileSync(
    runnerJobs,
    JSON.stringify({
      id: runnerJobId,
      job_id: runnerJobId,
      account: "runner-proof",
      kind: "datanet_publish",
      status: "queued",
      plaintext: "cross process proof",
    }) + "\n",
  );

  const runnerSemantic = new AgentPick2JsonlSemanticIndexV1({
    chunkBytes: 4096,
    maxSyncCompletionRebuildBytes: 1024 * 1024,
  });
  const runnerInput = {
    jobsFile: runnerJobs,
    resultsFile: runnerResults,
    leasesFile: runnerLeases,
    completionFiles: [runnerReceipts, runnerReceiptsV1],
    scanMax: 100,
    leaseMs: 60_000,
    nowMs: Date.now(),
  };
  await warmSemantic(runnerSemantic, runnerInput);

  const runnerScript = path.resolve("ops/datanet-job-runner-v1.cjs");
  const child = spawnSync(process.execPath, [runnerScript], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      DATA_DIR: runnerTmp,
      VOID_DATA_DIR: runnerTmp,
      VOID_REPO: runnerTmp,
    },
    encoding: "utf8",
    timeout: 30_000,
  });
  need(
    child.status === 0,
    `datanet runner failed: ${child.stderr || child.stdout}`,
  );

  const runnerSyncBefore = Number(
    (runnerSemantic as any).metrics.sync_bytes_read_total || 0,
  );
  let runnerHold = "";
  try {
    runnerSemantic.snapshot({ ...runnerInput, nowMs: Date.now() });
  } catch (error: any) {
    runnerHold = String(error?.message || error);
  }
  need(
    /VOID_AGENT_PICK2_JSONL_(UNWITNESSED_COMPLETION_GROWTH_HOLD|COMPLETION_WARMING_HOLD)/.test(
      runnerHold,
    ),
    `cross-process writer did not trigger bounded recovery: ${runnerHold}`,
  );
  const runnerSyncDelta =
    Number((runnerSemantic as any).metrics.sync_bytes_read_total || 0) -
    runnerSyncBefore;
  need(
    runnerSyncDelta <= 1024 * 1024,
    `cross-process recovery exceeded synchronous budget: ${runnerSyncDelta}`,
  );

  for (const file of runnerInput.completionFiles) {
    await runnerSemantic.waitForCompletionWarmForProofV1(file);
  }
  const runnerReady = await warmSemantic(runnerSemantic, {
    ...runnerInput,
    nowMs: Date.now(),
  });
  need(
    runnerReady.doneTruthHas(runnerJobId),
    "async recovery did not observe DataNet runner completion",
  );

  console.log(
    "VOID_AGENT_PICK2_EXTERNAL_WRITER_CACHE_WEDGE_V1_GREEN",
    JSON.stringify({
      real_size: realSize,
      fixture_bytes: {
        receipts: statBytes(receipts),
        job_state: statBytes(jobState),
        jobs: statBytes(jobs),
      },
      timer_ticks_during_semantic_warm: semanticWarmTimerTicks,
      timer_ticks_during_async_writer_warm: timerTicks,
      helper_post_warm_bytes_read: helperDelta,
      pick2_post_warm_bytes_read: semanticDelta,
      pick2_witness_misses: afterFirst.io.append_witness_misses_total,
      cold_request_bound_ms: COLD_REQUEST_BOUND_MS,
      cold_concurrent_warm_generations: queueMetric?.warm_starts_total,
      malformed_history_fail_closed: true,
      datanet_runner_cross_process_async_recovery: true,
      datanet_runner_sync_recovery_bytes: runnerSyncDelta,
    }),
  );

  fs.rmSync(runnerTmp, { recursive: true, force: true });
  fs.rmSync(tmp, { recursive: true, force: true });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
