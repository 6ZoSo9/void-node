import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  AgentPick2JsonlSemanticIndexV1,
} from "../src/http/agent_pick2_jsonl_semantic_index_v1.js";
import {
  appendWcPublicRemoteTruthJsonlExactOnceV1,
  resetWcPublicRemoteTruthJsonlIndexForProofV1,
  wcPublicRemoteTruthJsonlIndexMetricsV1,
} from "../src/economic/wc_public_remote_truth_jsonl_index_v1.js";

const MIB = 1024 * 1024;
const realSize = process.env.VOID_PICK2_EXTERNAL_WRITER_REAL_SIZE === "1";
const receiptTarget = (realSize ? 82 : 8) * MIB;
const jobStateTarget = (realSize ? 67 : 7) * MIB;
const jobsTarget = (realSize ? 3 : 1) * MIB;
const iterations = realSize ? 24 : 12;

function need(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(`VOID_AGENT_PICK2_EXTERNAL_WRITER_CACHE_WEDGE_V1_FAIL: ${message}`);
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
      const row = makeRow(n++, padding);
      const line = Buffer.from(JSON.stringify(row) + "\n", "utf8");
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

  need(statBytes(receipts) >= receiptTarget, "receipt fixture is undersized");
  need(statBytes(jobState) >= jobStateTarget, "job-state fixture is undersized");
  need(statBytes(jobs) >= jobsTarget, "jobs fixture is undersized");

  const semantic = new AgentPick2JsonlSemanticIndexV1({ chunkBytes: 64 * 1024 });
  const snapshotInput = {
    jobsFile: jobs,
    resultsFile: results,
    leasesFile: leases,
    completionFiles: [receipts, jobState],
    scanMax: 1000,
    leaseMs: 60_000,
    nowMs: Date.now(),
  };

  const baseline = semantic.snapshot(snapshotInput);
  const baselineRebuilds = baseline.io.rebuilds_total;
  const baselineWitnessMisses = baseline.io.append_witness_misses_total;
  const baselineSemanticBytes = baseline.io.bytes_read_total;
  need(
    baselineSemanticBytes >= receiptTarget + jobStateTarget,
    "baseline did not exercise real completion history",
  );

  resetWcPublicRemoteTruthJsonlIndexForProofV1();

  let timerTicks = 0;
  const timer = setInterval(() => {
    timerTicks += 1;
  }, 5);

  const first = {
    receipt: await appendWcPublicRemoteTruthJsonlExactOnceV1(
      receipts,
      {
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
      },
      ["receipt_id"],
    ),
    job: await appendWcPublicRemoteTruthJsonlExactOnceV1(
      jobs,
      {
        id: "p0-job-0",
        job_id: "p0-job-0",
        account: "p0-account",
        kind: "datanet_fetch_verify",
        status: "queued",
        dataset_id: "p0-dataset",
        ts_ms: Date.now(),
      },
      ["job_id"],
    ),
    completed: await appendWcPublicRemoteTruthJsonlExactOnceV1(
      jobState,
      {
        job_id: "p0-job-0",
        receipt_id: "p0-receipt-0",
        status: "completed",
        dataset_id: "p0-dataset",
        input_hash: "c".repeat(64),
        output_hash: "d".repeat(64),
        verified: true,
        completed_at_ms: Date.now(),
      },
      ["job_id", "receipt_id"],
    ),
  };
  clearInterval(timer);

  need(first.receipt.witnessed, "receipt append did not join pick2 witness chain");
  need(first.job.witnessed, "job append did not join pick2 witness chain");
  need(first.completed.witnessed, "completion append did not join pick2 witness chain");
  if (realSize) {
    need(timerTicks >= 5, `async history warm starved timers ticks=${timerTicks}`);
  }

  let afterFirst = semantic.snapshot({ ...snapshotInput, nowMs: Date.now() });
  need(
    afterFirst.io.append_witness_misses_total === baselineWitnessMisses,
    "first external writer append caused a witness miss",
  );
  need(
    afterFirst.io.rebuilds_total === baselineRebuilds,
    "first external writer append caused a historical rebuild",
  );

  const helperBaseline = wcPublicRemoteTruthJsonlIndexMetricsV1();
  need(helperBaseline.length === 3, "expected exactly three remote-truth indexes");
  for (const metric of helperBaseline) {
    need(metric.full_scans_total === 1, `index did not warm exactly once: ${metric.file}`);
  }
  const fullScansBaseline = helperBaseline.reduce((n, x) => n + x.full_scans_total, 0);
  const helperBytesBaseline = helperBaseline.reduce((n, x) => n + x.bytes_read_total, 0);
  const semanticBytesAfterFirst = afterFirst.io.bytes_read_total;

  for (let i = 1; i <= iterations; i++) {
    const receiptId = `p0-receipt-${i}`;
    const jobId = `p0-job-${i}`;
    const inputHash = `${i.toString(16).padStart(2, "0")}${"e".repeat(62)}`.slice(0, 64);
    const outputHash = `${i.toString(16).padStart(2, "0")}${"f".repeat(62)}`.slice(0, 64);

    const receiptAppend = await appendWcPublicRemoteTruthJsonlExactOnceV1(
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
    const jobAppend = await appendWcPublicRemoteTruthJsonlExactOnceV1(
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
    const completionAppend = await appendWcPublicRemoteTruthJsonlExactOnceV1(
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

    need(receiptAppend.witnessed, `receipt witness missing at iteration ${i}`);
    need(jobAppend.witnessed, `job witness missing at iteration ${i}`);
    need(completionAppend.witnessed, `completion witness missing at iteration ${i}`);

    const snap = semantic.snapshot({ ...snapshotInput, nowMs: Date.now() });
    need(
      snap.io.append_witness_misses_total === baselineWitnessMisses,
      `pick2 witness miss after external append iteration=${i}`,
    );
    need(
      snap.io.rebuilds_total === baselineRebuilds,
      `pick2 historical rebuild after external append iteration=${i}`,
    );
    afterFirst = snap;
  }

  const helperAfter = wcPublicRemoteTruthJsonlIndexMetricsV1();
  const fullScansAfter = helperAfter.reduce((n, x) => n + x.full_scans_total, 0);
  const helperBytesAfter = helperAfter.reduce((n, x) => n + x.bytes_read_total, 0);
  need(
    fullScansAfter === fullScansBaseline,
    `remote writer rescanned history fullScans=${fullScansAfter} baseline=${fullScansBaseline}`,
  );

  const helperDeltaBytes = helperBytesAfter - helperBytesBaseline;
  const semanticDeltaBytes = afterFirst.io.bytes_read_total - semanticBytesAfterFirst;
  const boundedDeltaBudget = iterations * 3 * 64 * 1024;
  need(
    helperDeltaBytes < boundedDeltaBudget,
    `remote writer read too much post-warm history bytes=${helperDeltaBytes} budget=${boundedDeltaBudget}`,
  );
  need(
    semanticDeltaBytes < boundedDeltaBudget,
    `pick2 read too much post-warm history bytes=${semanticDeltaBytes} budget=${boundedDeltaBudget}`,
  );

  const duplicate = await appendWcPublicRemoteTruthJsonlExactOnceV1(
    receipts,
    {
      receipt_id: `p0-receipt-${iterations}`,
      job_id: `p0-job-${iterations}`,
      account: "p0-account",
      kind: "datanet_fetch_verify",
      status: "completed",
      dataset_id: "p0-dataset",
      input_hash: `${iterations.toString(16).padStart(2, "0")}${"e".repeat(62)}`.slice(0, 64),
      output_hash: `${iterations.toString(16).padStart(2, "0")}${"f".repeat(62)}`.slice(0, 64),
    },
    ["receipt_id"],
  );
  need(duplicate.appended === false, "exact-once duplicate guard regressed");

  const moduleText = fs.readFileSync(
    path.join(process.cwd(), "src", "economic", "wc_public_earning_pilot_v1.ts"),
    "utf8",
  );
  const helperText = fs.readFileSync(
    path.join(process.cwd(), "src", "economic", "wc_public_remote_truth_jsonl_index_v1.ts"),
    "utf8",
  );
  need(!moduleText.includes("function readJsonlMatches("), "legacy O(history) duplicate scanner remains");
  need(
    moduleText.includes("appendWcPublicRemoteTruthJsonlExactOnceV1"),
    "pilot writer does not use bounded exact-once index",
  );
  need(
    helperText.includes("appendAgentPick2JsonlCanonicalV1"),
    "remote writer bypasses canonical pick2 append contract",
  );
  need(
    !helperText.includes('fs.readFileSync(file, "utf8")'),
    "helper reintroduced synchronous full-file read",
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
      timer_ticks_during_async_writer_warm: timerTicks,
      helper_post_warm_bytes_read: helperDeltaBytes,
      pick2_post_warm_bytes_read: semanticDeltaBytes,
      pick2_rebuilds: afterFirst.io.rebuilds_total,
      pick2_witness_misses: afterFirst.io.append_witness_misses_total,
    }),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
