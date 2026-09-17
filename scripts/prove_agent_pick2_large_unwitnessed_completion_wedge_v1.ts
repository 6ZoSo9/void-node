import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import {
  AgentPick2JsonlSemanticIndexV1,
  VOID_AGENT_PICK2_JSONL_MAX_SYNC_COMPLETION_REBUILD_BYTES_V1,
  appendAgentPick2JsonlCanonicalV1,
} from "../src/http/agent_pick2_jsonl_semantic_index_v1.js";

const MARKER = "VOID_AGENT_PICK2_LARGE_UNWITNESSED_COMPLETION_WEDGE_V1";
const LIVE_RECEIPTS_BYTES = 81_932_427;
const LIVE_JOB_STATE_BYTES = 67_206_102;
const TEST_LIMIT = 32 * 1024;
const root = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-agent-pick2-large-completion-wedge-v1-"),
);

type Fixture = {
  jobs: string;
  results: string;
  leases: string;
  completion: string;
};

function writeJsonl(
  file: string,
  count: number,
  row: (i: number) => Record<string, unknown>,
): void {
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

function writeLargeCompletion(file: string, minBytes: number): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const fd = fs.openSync(file, "w");
  let bytes = 0;
  let i = 0;
  try {
    while (bytes < minBytes) {
      const line =
        JSON.stringify({
          id: `complete-${i++}`,
          status: "completed",
          pad: "x".repeat(256),
        }) + "\n";
      fs.writeSync(fd, line);
      bytes += Buffer.byteLength(line);
    }
  } finally {
    fs.closeSync(fd);
  }
}

function fixture(label: string, multiplier: number): Fixture {
  const dir = path.join(root, label);
  const f = {
    jobs: path.join(dir, "agent", "jobs.jsonl"),
    results: path.join(dir, "agent", "results.jsonl"),
    leases: path.join(dir, "agent", "leases.jsonl"),
    completion: path.join(dir, "agent_v1", "job_state.jsonl"),
  };
  writeJsonl(f.jobs, 4, (i) => ({ id: `job-${i}`, status: "queued", ts: i + 1 }));
  writeJsonl(f.results, 2, (i) => ({ id: `result-${i}`, ts: i + 1 }));
  writeJsonl(f.leases, 2, (i) => ({ id: `lease-${i}`, ts: 1, worker: "proof" }));
  writeLargeCompletion(f.completion, TEST_LIMIT * multiplier);
  return f;
}

function snapshotInput(f: Fixture) {
  return {
    jobsFile: f.jobs,
    resultsFile: f.results,
    leasesFile: f.leases,
    completionFiles: [f.completion],
    scanMax: 64,
    leaseMs: 30_000,
    nowMs: Date.now(),
  };
}

function thrown(fn: () => unknown): string {
  try {
    fn();
  } catch (error: any) {
    return String(error?.message || error);
  }
  throw new Error("expected operation to throw");
}

async function warm(
  index: AgentPick2JsonlSemanticIndexV1,
  f: Fixture,
): Promise<any> {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return index.snapshot(snapshotInput(f));
    } catch (error: any) {
      const message = String(error?.message || error);
      assert.match(
        message,
        /VOID_AGENT_PICK2_JSONL_(COMPLETION_WARMING_HOLD|COMPLETION_REBUILD_BACKOFF|UNWITNESSED_COMPLETION_GROWTH_HOLD)/,
      );
      await index.waitForCompletionWarmForProofV1(f.completion);
    }
  }
  throw new Error("semantic warm did not converge");
}

async function main(): Promise<void> {
  assert.ok(
    LIVE_RECEIPTS_BYTES >
      VOID_AGENT_PICK2_JSONL_MAX_SYNC_COMPLETION_REBUILD_BYTES_V1,
  );
  assert.ok(
    LIVE_JOB_STATE_BYTES >
      VOID_AGENT_PICK2_JSONL_MAX_SYNC_COMPLETION_REBUILD_BYTES_V1,
  );

  const cold = fixture("cold", 4);
  const coldIndex = new AgentPick2JsonlSemanticIndexV1({
    chunkBytes: 4096,
    maxSyncCompletionRebuildBytes: TEST_LIMIT,
  });
  const coldBefore = Number((coldIndex as any).metrics.sync_bytes_read_total || 0);
  const coldHold = thrown(() => coldIndex.snapshot(snapshotInput(cold)));
  assert.match(coldHold, /VOID_AGENT_PICK2_JSONL_COMPLETION_WARMING_HOLD/);
  assert.equal(
    Number((coldIndex as any).metrics.sync_bytes_read_total || 0),
    coldBefore,
    "cold large completion performed synchronous history I/O",
  );
  await coldIndex.waitForCompletionWarmForProofV1(cold.completion);
  assert.equal(
    coldIndex.snapshot(snapshotInput(cold)).doneTruthHas("complete-0"),
    true,
  );

  const huge = fixture("huge", 64);
  const hugeIndex = new AgentPick2JsonlSemanticIndexV1({
    chunkBytes: 4096,
    maxSyncCompletionRebuildBytes: TEST_LIMIT,
  });
  const hugeBefore = Number((hugeIndex as any).metrics.sync_bytes_read_total || 0);
  const hugeHold = thrown(() => hugeIndex.snapshot(snapshotInput(huge)));
  assert.match(hugeHold, /VOID_AGENT_PICK2_JSONL_COMPLETION_WARMING_HOLD/);
  assert.equal(
    Number((hugeIndex as any).metrics.sync_bytes_read_total || 0),
    hugeBefore,
    "larger-than-live-relative fixture synchronously scanned history",
  );
  await hugeIndex.waitForCompletionWarmForProofV1(huge.completion);
  assert.equal(
    hugeIndex.snapshot(snapshotInput(huge)).doneTruthHas("complete-0"),
    true,
  );

  const raw = fixture("unwitnessed", 4);
  const rawIndex = new AgentPick2JsonlSemanticIndexV1({
    chunkBytes: 4096,
    maxSyncCompletionRebuildBytes: TEST_LIMIT,
  });
  await warm(rawIndex, raw);
  fs.appendFileSync(
    raw.completion,
    JSON.stringify({ id: "raw-external-complete", status: "completed" }) + "\n",
  );
  (rawIndex as any).completionRebuildHoldUntil.set(raw.completion, Date.now() - 1);
  const rawBefore = Number((rawIndex as any).metrics.sync_bytes_read_total || 0);
  const rawHold = thrown(() => rawIndex.snapshot(snapshotInput(raw)));
  assert.match(
    rawHold,
    /VOID_AGENT_PICK2_JSONL_UNWITNESSED_COMPLETION_GROWTH_HOLD/,
  );
  assert.equal(
    Number((rawIndex as any).metrics.sync_bytes_read_total || 0),
    rawBefore,
    "post-backoff unwitnessed growth synchronously scanned history",
  );
  await rawIndex.waitForCompletionWarmForProofV1(raw.completion);
  assert.equal(
    rawIndex.snapshot(snapshotInput(raw)).doneTruthHas("raw-external-complete"),
    true,
  );

  const witnessed = fixture("witnessed", 4);
  const witnessedIndex = new AgentPick2JsonlSemanticIndexV1({
    chunkBytes: 4096,
    maxSyncCompletionRebuildBytes: TEST_LIMIT,
  });
  await warm(witnessedIndex, witnessed);
  const witnessBefore = Number(
    (witnessedIndex as any).metrics.sync_bytes_read_total || 0,
  );
  const appended = appendAgentPick2JsonlCanonicalV1(
    witnessed.completion,
    JSON.stringify({ id: "witnessed-complete", status: "completed" }) + "\n",
    { durable: true, mode: 0o600 },
  );
  assert.equal(appended.witnessed, true);
  const witnessedSnapshot = witnessedIndex.snapshot(snapshotInput(witnessed));
  assert.equal(witnessedSnapshot.doneTruthHas("witnessed-complete"), true);
  const witnessSyncBytes =
    Number((witnessedIndex as any).metrics.sync_bytes_read_total || 0) -
    witnessBefore;
  assert.ok(witnessSyncBytes < 4096);

  console.log(`${MARKER}_PROOF_GREEN`);
  console.log(`live_receipts_bytes=${LIVE_RECEIPTS_BYTES}`);
  console.log(`live_job_state_bytes=${LIVE_JOB_STATE_BYTES}`);
  console.log("cold_large_completion_sync_history_bytes=0");
  console.log("post_backoff_large_completion_sync_history_bytes=0");
  console.log("larger_than_live_sync_history_bytes=0");
  console.log("large_completion_async_warm=true");
  console.log("witnessed_completion_append_incremental=true");
  console.log(`witnessed_sync_refresh_bytes=${witnessSyncBytes}`);
  console.log("live_runtime_mutation_performed=false");
}

main()
  .finally(() => fs.rmSync(root, { recursive: true, force: true }))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
