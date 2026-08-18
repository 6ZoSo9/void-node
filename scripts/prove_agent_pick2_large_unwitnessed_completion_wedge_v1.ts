import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import {
  AgentPick2JsonlSemanticIndexV1,
  VOID_AGENT_PICK2_JSONL_MAX_SYNC_COMPLETION_REBUILD_BYTES_V1,
  VOID_AGENT_PICK2_JSONL_COMPLETION_REBUILD_BACKOFF_MS_V1,
  appendAgentPick2JsonlCanonicalV1,
} from "../src/http/agent_pick2_jsonl_semantic_index_v1.js";

const MARKER = "VOID_AGENT_PICK2_LARGE_UNWITNESSED_COMPLETION_WEDGE_V1";
const LIVE_RECEIPTS_BYTES = 81_932_427;
const LIVE_JOB_STATE_BYTES = 67_206_102;
const TEST_LIMIT = 32 * 1024;
const TEST_BACKOFF_MS = 60_000;
const root = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-agent-pick2-large-completion-wedge-v1-"),
);

type Fixture = {
  dir: string;
  jobs: string;
  results: string;
  leases: string;
  completion: string;
};

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

function writeLargeCompletion(file: string, minBytes: number) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const fd = fs.openSync(file, "w");
  let bytes = 0;
  let i = 0;
  try {
    while (bytes < minBytes) {
      const line =
        JSON.stringify({
          id: `complete-${i}`,
          status: "completed",
          pad: "x".repeat(256),
        }) + "\n";
      fs.writeSync(fd, line);
      bytes += Buffer.byteLength(line);
      i += 1;
    }
  } finally {
    fs.closeSync(fd);
  }
}

function fixture(label: string): Fixture {
  const dir = path.join(root, label);
  const f = {
    dir,
    jobs: path.join(dir, "agent", "jobs.jsonl"),
    results: path.join(dir, "agent", "results.jsonl"),
    leases: path.join(dir, "agent", "leases.jsonl"),
    completion: path.join(dir, "agent_v1", "job_state.jsonl"),
  };
  writeJsonl(f.jobs, 4, (i) => ({ id: `job-${i}`, status: "queued", ts: i + 1 }));
  writeJsonl(f.results, 2, (i) => ({ id: `result-${i}`, ts: i + 1 }));
  writeJsonl(f.leases, 2, (i) => ({ id: `lease-${i}`, ts: 1, worker: "proof" }));
  writeLargeCompletion(f.completion, TEST_LIMIT * 4);
  return f;
}

function snap(index: AgentPick2JsonlSemanticIndexV1, f: Fixture) {
  return index.snapshot({
    jobsFile: f.jobs,
    resultsFile: f.results,
    leasesFile: f.leases,
    completionFiles: [f.completion],
    scanMax: 64,
    leaseMs: 30_000,
    nowMs: Date.now() + 100,
  });
}

function messageOf(fn: () => unknown): string {
  try {
    fn();
  } catch (err: any) {
    return String(err?.message || err);
  }
  throw new Error("expected operation to throw");
}

try {
  assert.ok(
    LIVE_RECEIPTS_BYTES > VOID_AGENT_PICK2_JSONL_MAX_SYNC_COMPLETION_REBUILD_BYTES_V1,
  );
  assert.ok(
    LIVE_JOB_STATE_BYTES > VOID_AGENT_PICK2_JSONL_MAX_SYNC_COMPLETION_REBUILD_BYTES_V1,
  );
  assert.equal(
    VOID_AGENT_PICK2_JSONL_COMPLETION_REBUILD_BACKOFF_MS_V1,
    30_000,
  );

  const raw = fixture("unwitnessed");
  const rawIndex = new AgentPick2JsonlSemanticIndexV1({
    chunkBytes: 4096,
    maxSyncCompletionRebuildBytes: TEST_LIMIT,
    completionRebuildBackoffMs: TEST_BACKOFF_MS,
  });
  const first = snap(rawIndex, raw);
  assert.equal(first.doneTruthHas("complete-0"), true);
  const beforeRawHold = Number((rawIndex as any).metrics.bytes_read_total || 0);
  fs.appendFileSync(
    raw.completion,
    JSON.stringify({ id: "raw-external-complete", status: "completed" }) + "\n",
  );

  const holdMessage = messageOf(() => snap(rawIndex, raw));
  assert.match(
    holdMessage,
    /VOID_AGENT_PICK2_JSONL_UNWITNESSED_COMPLETION_GROWTH_HOLD/,
  );
  assert.equal(
    Number((rawIndex as any).metrics.bytes_read_total || 0),
    beforeRawHold,
    "unwitnessed large growth reread historical bytes before HOLD",
  );

  const backoffMessage = messageOf(() => snap(rawIndex, raw));
  assert.match(
    backoffMessage,
    /VOID_AGENT_PICK2_JSONL_COMPLETION_REBUILD_BACKOFF/,
  );
  assert.equal(
    Number((rawIndex as any).metrics.bytes_read_total || 0),
    beforeRawHold,
    "backoff request reread historical completion bytes",
  );

  const witnessed = fixture("witnessed");
  const witnessedIndex = new AgentPick2JsonlSemanticIndexV1({
    chunkBytes: 4096,
    maxSyncCompletionRebuildBytes: TEST_LIMIT,
    completionRebuildBackoffMs: TEST_BACKOFF_MS,
  });
  snap(witnessedIndex, witnessed);
  const beforeWitnessRefresh = Number(
    (witnessedIndex as any).metrics.bytes_read_total || 0,
  );
  const appendResult = appendAgentPick2JsonlCanonicalV1(
    witnessed.completion,
    JSON.stringify({ id: "witnessed-complete", status: "completed" }) + "\n",
    { durable: true, mode: 0o600 },
  );
  assert.equal(appendResult.witnessed, true);
  const witnessSnapshot = snap(witnessedIndex, witnessed);
  assert.equal(witnessSnapshot.doneTruthHas("witnessed-complete"), true);
  const witnessRefreshBytes =
    Number((witnessedIndex as any).metrics.bytes_read_total || 0) -
    beforeWitnessRefresh;
  assert.ok(
    witnessRefreshBytes < 4096,
    `witnessed append reread too many bytes: ${witnessRefreshBytes}`,
  );

  const unstable = fixture("unstable");
  let mutated = false;
  const unstableIndex = new AgentPick2JsonlSemanticIndexV1({
    chunkBytes: 4096,
    maxSyncCompletionRebuildBytes: TEST_LIMIT,
    completionRebuildBackoffMs: TEST_BACKOFF_MS,
    testHooks: {
      afterReadChunk(ctx) {
        if (
          mutated ||
          ctx.file !== unstable.completion ||
          ctx.kind !== "completion_full" ||
          ctx.chunkIndex !== 0
        ) {
          return;
        }
        mutated = true;
        fs.appendFileSync(
          unstable.completion,
          JSON.stringify({ id: "midscan-growth", status: "completed" }) + "\n",
        );
      },
    },
  });
  const unstableMessage = messageOf(() => snap(unstableIndex, unstable));
  assert.match(unstableMessage, /VOID_AGENT_PICK2_JSONL_UNSTABLE_SCAN/);
  assert.equal(mutated, true);
  assert.equal(
    Number((unstableIndex as any).metrics.coherent_scan_retries_total || 0),
    1,
    "large completion rebuild retried synchronously more than once",
  );
  const unstableBackoff = messageOf(() => snap(unstableIndex, unstable));
  assert.match(
    unstableBackoff,
    /VOID_AGENT_PICK2_JSONL_COMPLETION_REBUILD_BACKOFF/,
  );

  const pilotSource = fs.readFileSync(
    path.resolve("src/economic/wc_public_earning_pilot_v1.ts"),
    "utf8",
  );
  const readStart = pilotSource.indexOf("async function readJsonlMatches(");
  const exactStart = pilotSource.indexOf("async function appendExactOnce(");
  const exactEnd = pilotSource.indexOf(
    "\nexport async function persistImportedRemoteTruthOnce(",
    exactStart,
  );
  assert.notEqual(readStart, -1);
  assert.notEqual(exactStart, -1);
  assert.notEqual(exactEnd, -1);
  const readBlock = pilotSource.slice(readStart, exactStart);
  const exactBlock = pilotSource.slice(exactStart, exactEnd);
  assert.ok(readBlock.includes("await fsp.stat(file)"));
  assert.ok(readBlock.includes("fs.createReadStream(file"));
  assert.ok(readBlock.includes("end: size - 1"));
  assert.ok(readBlock.includes("for await (const raw of lines)"));
  assert.equal(readBlock.includes("readFileSync("), false);
  assert.ok(exactBlock.includes("const matches = await readJsonlMatches("));
  assert.ok(exactBlock.includes("appendAgentPick2JsonlCanonicalV1("));
  assert.equal(exactBlock.includes("appendJsonl(file, value);"), false);
  assert.ok(
    pilotSource.includes(
      "const imported = await persistImportedRemoteTruthOnce(",
    ),
  );

  console.log(`${MARKER}_PROOF_GREEN`);
  console.log(`live_receipts_bytes=${LIVE_RECEIPTS_BYTES}`);
  console.log(`live_job_state_bytes=${LIVE_JOB_STATE_BYTES}`);
  console.log("large_unwitnessed_growth_holds_before_history_reread=true");
  console.log("large_completion_rebuild_single_attempt=true");
  console.log("completion_rebuild_backoff_fast_fail=true");
  console.log("witnessed_completion_append_incremental=true");
  console.log(`witnessed_refresh_bytes=${witnessRefreshBytes}`);
  console.log("wc_public_exact_once_writer_witness_bound=true");
  console.log("wc_public_exact_once_history_scan_streamed_async=true");
  console.log("wc_public_history_scan_generation_bounded=true");
  console.log("live_runtime_mutation_performed=false");
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
