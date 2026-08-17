import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import {
  AgentPick2JsonlSemanticIndexV1,
} from "../src/http/agent_pick2_jsonl_semantic_index_v1.js";

const moduleSourcePath = path.resolve(
  "src/http/agent_pick2_jsonl_semantic_index_v1.ts",
);
const moduleSource = fs.readFileSync(moduleSourcePath, "utf8");
assert.ok(
  moduleSource.includes("VOID_AGENT_PICK2_JSONL_ISOLATION_RECOVERY_V1"),
  "durable isolation recovery marker is missing",
);
assert.ok(
  moduleSource.includes("writeIsolationIntentV1(file, isolatedPath"),
  "append isolation is not preceded by a recovery intent",
);
assert.ok(
  moduleSource.includes("recoverCanonicalAppendIsolationV1(file)"),
  "semantic reads do not recover interrupted append isolation",
);
assert.ok(
  moduleSource.includes("recoverCanonicalAppendIsolationUnderLockV1(file)"),
  "canonical append does not recover an interrupted predecessor before O_CREAT",
);
assert.ok(
  moduleSource.includes("afterAppendBeforeRestore"),
  "post-append/pre-restore crash hook is missing",
);

const root = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-agent-pick2-isolation-crash-recovery-v1-"),
);
const moduleUrl = pathToFileURL(moduleSourcePath).href;
const now = Date.now();
const SCAN_MAX = 64;
const LEASE_MS = 30_000;

type Target = "completion" | "results" | "leases" | "jobs";
type Phase = "before_write" | "after_durable_append";

type Fixture = {
  dir: string;
  jobs: string;
  results: string;
  leases: string;
  receipt: string;
  receiptV1: string;
  stateV1: string;
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

function createFixture(label: string): Fixture {
  const dir = path.join(root, label);
  const agent = path.join(dir, "agent");
  const agentV1 = path.join(dir, "agent_v1");
  const fixture: Fixture = {
    dir,
    jobs: path.join(agent, "jobs.jsonl"),
    results: path.join(agent, "results.jsonl"),
    leases: path.join(agent, "leases.jsonl"),
    receipt: path.join(agent, "receipts.jsonl"),
    receiptV1: path.join(agentV1, "receipts.jsonl"),
    stateV1: path.join(agentV1, "job_state.jsonl"),
  };

  writeJsonl(fixture.jobs, 80, (i) => ({
    id: `old-job-${i}`,
    status: "queued",
    ts: now - i,
  }));
  writeJsonl(fixture.results, 80, (i) => ({
    id: i === 79 ? "old-result" : `old-result-${i}`,
    ts: now - i,
  }));
  writeJsonl(fixture.leases, 80, (i) => ({
    id: i === 79 ? "old-active" : `old-lease-${i}`,
    ts: now - i,
    worker: "old-worker",
  }));
  writeJsonl(fixture.receipt, 80, (i) => ({
    id: i === 79 ? "old-complete" : `old-receipt-${i}`,
    status: i === 79 ? "completed" : "pending",
  }));
  writeJsonl(fixture.receiptV1, 2, (i) => ({
    job_id: `stable-receipt-v1-${i}`,
    status: "pending",
  }));
  writeJsonl(fixture.stateV1, 2, (i) => ({
    job_id: `stable-state-v1-${i}`,
    status: "pending",
  }));
  return fixture;
}

function targetPath(fixture: Fixture, target: Target): string {
  if (target === "completion") return fixture.receipt;
  if (target === "results") return fixture.results;
  if (target === "leases") return fixture.leases;
  return fixture.jobs;
}

function appendedRow(target: Target): Record<string, unknown> {
  if (target === "completion") {
    return { id: "crash-new-complete", status: "completed" };
  }
  if (target === "results") {
    return { id: "crash-new-result", ts: now + 100 };
  }
  if (target === "leases") {
    return { id: "crash-new-active", ts: now + 100, worker: "new-worker" };
  }
  return { id: "crash-new-job", status: "queued", ts: now + 100 };
}

function appendedId(target: Target): string {
  if (target === "completion") return "crash-new-complete";
  if (target === "results") return "crash-new-result";
  if (target === "leases") return "crash-new-active";
  return "crash-new-job";
}

function countId(file: string, id: string): number {
  return fs
    .readFileSync(file, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line))
    .filter((row) => String(row?.id || row?.job_id || "") === id)
    .length;
}

function assertOldTruth(target: Target, snapshot: any) {
  if (target === "completion") {
    assert.equal(snapshot.doneTruthHas("old-complete"), true);
  } else if (target === "results") {
    assert.equal(snapshot.done.has("old-result"), true);
  } else if (target === "leases") {
    assert.equal(snapshot.active.has("old-active"), true);
  } else {
    assert.equal(snapshot.latestRunnableById.has("old-job-0"), true);
  }
}

function assertAppendedTruth(target: Target, snapshot: any, expected: boolean) {
  if (target === "completion") {
    assert.equal(snapshot.doneTruthHas("crash-new-complete"), expected);
  } else if (target === "results") {
    assert.equal(snapshot.done.has("crash-new-result"), expected);
  } else if (target === "leases") {
    assert.equal(snapshot.active.has("crash-new-active"), expected);
  } else {
    // Jobs preserve first-SCAN_MAX semantics, so an append after the cap is
    // intentionally absent from the semantic head even when durably present.
    assert.equal(snapshot.latestRunnableById.has("crash-new-job"), false);
  }
}

function spawnCrash(
  fixture: Fixture,
  target: Target,
  phase: Phase,
) {
  const targetFile = targetPath(fixture, target);
  const row = appendedRow(target);
  const childPath = path.join(fixture.dir, `child-${target}-${phase}.mjs`);
  const spec = {
    jobs: fixture.jobs,
    results: fixture.results,
    leases: fixture.leases,
    completionFiles: [fixture.receipt, fixture.receiptV1, fixture.stateV1],
    targetFile,
    row,
    now,
    scanMax: SCAN_MAX,
    leaseMs: LEASE_MS,
    phase,
  };

  fs.writeFileSync(
    childPath,
    `import { AgentPick2JsonlSemanticIndexV1, appendAgentPick2JsonlCanonicalV1 } from ${JSON.stringify(moduleUrl)};\n` +
      `const spec = ${JSON.stringify(spec)};\n` +
      `const index = new AgentPick2JsonlSemanticIndexV1({ chunkBytes: 4096 });\n` +
      `index.snapshot({ jobsFile: spec.jobs, resultsFile: spec.results, leasesFile: spec.leases, completionFiles: spec.completionFiles, scanMax: spec.scanMax, leaseMs: spec.leaseMs, nowMs: spec.now });\n` +
      `appendAgentPick2JsonlCanonicalV1(spec.targetFile, JSON.stringify(spec.row) + "\\n", { durable: true, testHooks: {\n` +
      `  afterIsolatedTrusted() { if (spec.phase === "before_write") process.kill(process.pid, "SIGKILL"); },\n` +
      `  afterAppendBeforeRestore() { if (spec.phase === "after_durable_append") process.kill(process.pid, "SIGKILL"); },\n` +
      `} });\n` +
      `throw new Error("crash hook did not terminate child");\n`,
    "utf8",
  );

  const child = spawnSync(
    process.execPath,
    ["--import", "tsx", childPath],
    { cwd: process.cwd(), encoding: "utf8" },
  );
  assert.equal(
    child.signal,
    "SIGKILL",
    `child did not die at ${phase} for ${target}: status=${child.status} stderr=${child.stderr}`,
  );
}

function runCrashCase(target: Target, phase: Phase) {
  const fixture = createFixture(`${target}-${phase}`);
  const targetFile = targetPath(fixture, target);
  const beforeBytes = fs.statSync(targetFile).size;
  const id = appendedId(target);

  spawnCrash(fixture, target, phase);

  const intent = `${targetFile}.void-pick2-isolation-recovery-v1.json`;
  const lock = `${targetFile}.void-pick2-append.lock`;
  const isolatedPrefix = `${path.basename(targetFile)}.void-pick2-isolated-`;
  const isolatedBeforeRecovery = fs
    .readdirSync(path.dirname(targetFile))
    .filter((name) => name.startsWith(isolatedPrefix));

  assert.equal(
    fs.existsSync(targetFile),
    false,
    `crash fixture unexpectedly restored canonical path for ${target}/${phase}`,
  );
  assert.equal(
    fs.existsSync(intent),
    true,
    `crash fixture did not persist recovery intent for ${target}/${phase}`,
  );
  assert.equal(
    fs.existsSync(lock),
    true,
    `crash fixture did not leave a stale writer lock for ${target}/${phase}`,
  );
  assert.equal(
    isolatedBeforeRecovery.length,
    1,
    `crash fixture did not leave exactly one isolated generation for ${target}/${phase}`,
  );

  const restarted = new AgentPick2JsonlSemanticIndexV1({ chunkBytes: 4096 });
  const snapshot = restarted.snapshot({
    jobsFile: fixture.jobs,
    resultsFile: fixture.results,
    leasesFile: fixture.leases,
    completionFiles: [fixture.receipt, fixture.receiptV1, fixture.stateV1],
    scanMax: SCAN_MAX,
    leaseMs: LEASE_MS,
    nowMs: now + 200,
  });

  assert.equal(fs.existsSync(targetFile), true, "canonical history was not recovered");
  assert.equal(fs.existsSync(intent), false, "recovery intent was not retired");
  assert.equal(fs.existsSync(lock), false, "stale writer lock was not retired");
  assert.equal(
    fs.readdirSync(path.dirname(targetFile)).filter((name) =>
      name.startsWith(isolatedPrefix)
    ).length,
    0,
    "isolated ledger remained split from canonical history after restart",
  );
  assert.ok(
    fs.statSync(targetFile).size >= beforeBytes,
    "recovery lost historical ledger bytes",
  );

  assertOldTruth(target, snapshot);
  const shouldContainAppend = phase === "after_durable_append";
  assert.equal(
    countId(targetFile, id),
    shouldContainAppend ? 1 : 0,
    `append commit boundary was not exactly-once for ${target}/${phase}`,
  );
  assertAppendedTruth(target, snapshot, shouldContainAppend);
}

try {
  for (const target of ["completion", "results", "leases", "jobs"] as const) {
    runCrashCase(target, "before_write");
    runCrashCase(target, "after_durable_append");
  }

  console.log("VOID_AGENT_PICK2_JSONL_ISOLATION_CRASH_RECOVERY_V1_PROOF_GREEN");
  console.log("child_sigkill_before_write_all_inputs=true");
  console.log("child_sigkill_after_durable_append_all_inputs=true");
  console.log("canonical_history_recovered_before_empty_interpretation=true");
  console.log("stale_append_lock_recovered=true");
  console.log("append_commit_boundary_absent_or_exactly_once=true");
  console.log("split_history_after_restart=false");
  console.log("old_completion_result_lease_job_truth_preserved=true");
  console.log("live_runtime_mutation_performed=false");
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
