import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import {
  AgentPick2JsonlSemanticIndexV1,
  VOID_AGENT_PICK2_JSONL_SEMANTIC_INDEX_V1,
} from "../src/http/agent_pick2_jsonl_semantic_index_v1.js";

const SOURCE_MARKER = "VOID_AGENT_PICK2_JSONL_SEMANTIC_INDEX_V1";
const sourcePath = path.resolve("src/index.ts");
const source = fs.readFileSync(sourcePath, "utf8");

assert.ok(
  source.includes(
    'import { AgentPick2JsonlSemanticIndexV1 } from "./http/agent_pick2_jsonl_semantic_index_v1.js"; // VOID_AGENT_PICK2_JSONL_SEMANTIC_INDEX_V1_IMPORT',
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
  fs.appendFileSync(file, JSON.stringify(row) + "\n", "utf8");
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
  console.log("historical_jsonl_reread_per_pick=false");
  console.log("live_runtime_mutation_performed=false");
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
