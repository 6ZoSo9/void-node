// @ts-nocheck
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import {
  AgentPick2JsonlSemanticIndexV1,
  appendAgentPick2JsonlCanonicalV1,
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
  moduleSource.includes("VOID_AGENT_PICK2_JSONL_APPEND_CLAIM_V1"),
  "immutable append claim marker is missing",
);
assert.ok(
  moduleSource.includes("writeIsolationIntentV1(file, isolatedPath"),
  "append isolation is not preceded by a recovery intent",
);
assert.ok(
  moduleSource.includes("append_sha256"),
  "recovery intent does not bind the exact append payload",
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
  moduleSource.includes("afterPayloadWriteProgress"),
  "partial-payload crash hook is missing",
);
assert.ok(
  moduleSource.includes("afterAppendBeforeRestore"),
  "post-append/pre-restore crash hook is missing",
);
assert.ok(
  moduleSource.includes("afterPayloadBeforeFdatasync"),
  "complete-payload/pre-fdatasync crash hook is missing",
);
assert.ok(
  moduleSource.includes("VOID_AGENT_PICK2_JSONL_APPEND_COMMIT_V1"),
  "durable append commit witness is missing",
);
assert.ok(
  moduleSource.includes("VOID_AGENT_PICK2_JSONL_APPEND_COMMIT_AMBIGUOUS"),
  "ambiguous append commit evidence does not fail closed",
);
assert.equal(
  moduleSource.includes("if (opts.durable) fs.fdatasyncSync(fd)"),
  false,
  "canonical append durability is still optional",
);
assert.ok(
  moduleSource.includes("beforeIntentRetire"),
  "post-restore intent-retirement fault hook is missing",
);
assert.ok(
  moduleSource.includes("process_instance"),
  "append claim is not bound to a process instance",
);

assert.ok(
  moduleSource.includes("afterRecoveryIsolatedValidated"),
  "recovery publication identity hook is missing",
);

assert.ok(
  moduleSource.includes("beforeLockClaimReleaseUnlink"),
  "release-failure recovery hook is missing",
);
assert.ok(
  moduleSource.includes("VOID_AGENT_PICK2_JSONL_APPEND_CLAIM_RELEASE_V1"),
  "cross-process claim release witness is missing",
);

assert.ok(
  moduleSource.includes("beforeFirstCanonicalCreateDirectorySync"),
  "first-create directory durability fault hook is missing",
);
assert.ok(
  moduleSource.includes("afterFirstCanonicalCreateDirectorySync"),
  "first-create directory durability observation hook is missing",
);

assert.ok(
  moduleSource.includes("VOID_AGENT_PICK2_JSONL_APPEND_TERMINAL_V1"),
  "terminal retry witness is missing",
);

const root = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-agent-pick2-isolation-crash-recovery-v1-"),
);
const moduleUrl = pathToFileURL(moduleSourcePath).href;
const now = Date.now();
const SCAN_MAX = 64;
const LEASE_MS = 30_000;

type Target = "completion" | "results" | "leases" | "jobs";
type Phase =
  | "before_write"
  | "partial_write"
  | "complete_write_before_fsync"
  | "after_durable_append";

type Fixture = {
  dir: string;
  jobs: string;
  results: string;
  leases: string;
  receipt: string;
  receiptV1: string;
  stateV1: string;
};

function sleepMs(ms: number) {
  const sab = new SharedArrayBuffer(4);
  Atomics.wait(new Int32Array(sab), 0, 0, Math.max(1, ms));
}

function waitFor(predicate: () => boolean, label: string, timeoutMs = 5_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) return;
    sleepMs(10);
  }
  assert.fail(`timed out waiting for ${label}`);
}

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

function appendedRow(target: Target, suffix = "crash"): Record<string, unknown> {
  if (target === "completion") {
    return { id: `${suffix}-new-complete`, status: "completed", pad: "x".repeat(64) };
  }
  if (target === "results") {
    return { id: `${suffix}-new-result`, ts: now + 100, pad: "x".repeat(64) };
  }
  if (target === "leases") {
    return {
      id: `${suffix}-new-active`,
      ts: now + 100,
      worker: "new-worker",
      pad: "x".repeat(64),
    };
  }
  return {
    id: `${suffix}-new-job`,
    status: "queued",
    ts: now + 100,
    pad: "x".repeat(64),
  };
}

function rowId(row: Record<string, unknown>): string {
  return String((row as any)?.id || (row as any)?.job_id || "");
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

function claimFiles(file: string): string[] {
  const prefix = `${path.basename(file)}.void-pick2-append-claim-`;
  return fs
    .readdirSync(path.dirname(file))
    .filter((name) => name.startsWith(prefix) && name.endsWith(".json"));
}

function claimTempFiles(file: string): string[] {
  const prefix = `${path.basename(file)}.void-pick2-append-claim-tmp-`;
  return fs
    .readdirSync(path.dirname(file))
    .filter((name) => name.startsWith(prefix));
}

function claimReleaseFiles(file: string): string[] {
  const prefix = `${path.basename(file)}.void-pick2-append-release-`;
  return fs
    .readdirSync(path.dirname(file))
    .filter((name) => name.startsWith(prefix) && name.endsWith(".json"));
}

function isolatedFiles(file: string): string[] {
  const prefix = `${path.basename(file)}.void-pick2-isolated-`;
  return fs.readdirSync(path.dirname(file)).filter((name) => name.startsWith(prefix));
}

function intentPath(file: string): string {
  return `${file}.void-pick2-isolation-recovery-v1.json`;
}

function snapshot(fixture: Fixture, at = now + 200) {
  const index = new AgentPick2JsonlSemanticIndexV1({ chunkBytes: 4096 });
  return index.snapshot({
    jobsFile: fixture.jobs,
    resultsFile: fixture.results,
    leasesFile: fixture.leases,
    completionFiles: [fixture.receipt, fixture.receiptV1, fixture.stateV1],
    scanMax: SCAN_MAX,
    leaseMs: LEASE_MS,
    nowMs: at,
  });
}

function seedWriterState(fixture: Fixture) {
  snapshot(fixture, now);
}

function assertOldTruth(target: Target, semantic: any) {
  if (target === "completion") {
    assert.equal(semantic.doneTruthHas("old-complete"), true);
  } else if (target === "results") {
    assert.equal(semantic.done.has("old-result"), true);
  } else if (target === "leases") {
    assert.equal(semantic.active.has("old-active"), true);
  } else {
    assert.equal(semantic.latestRunnableById.has("old-job-0"), true);
  }
}

function assertAppendedTruth(
  target: Target,
  semantic: any,
  id: string,
  expected: boolean,
) {
  if (target === "completion") {
    assert.equal(semantic.doneTruthHas(id), expected);
  } else if (target === "results") {
    assert.equal(semantic.done.has(id), expected);
  } else if (target === "leases") {
    assert.equal(semantic.active.has(id), expected);
  } else {
    // Jobs preserve first-SCAN_MAX semantics, so an append after the cap is
    // intentionally absent from the semantic head even when durably present.
    assert.equal(semantic.latestRunnableById.has(id), false);
  }
}

function spawnCrash(fixture: Fixture, target: Target, phase: Phase, row: any, seed = true) {
  const targetFile = targetPath(fixture, target);
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
    seed,
  };

  fs.writeFileSync(
    childPath,
    `import { AgentPick2JsonlSemanticIndexV1, appendAgentPick2JsonlCanonicalV1 } from ${JSON.stringify(moduleUrl)};\n` +
      `const spec = ${JSON.stringify(spec)};\n` +
      `const index = new AgentPick2JsonlSemanticIndexV1({ chunkBytes: 4096 });\n` +
      `if (spec.seed) index.snapshot({ jobsFile: spec.jobs, resultsFile: spec.results, leasesFile: spec.leases, completionFiles: spec.completionFiles, scanMax: spec.scanMax, leaseMs: spec.leaseMs, nowMs: spec.now });\n` +
      `appendAgentPick2JsonlCanonicalV1(spec.targetFile, JSON.stringify(spec.row) + "\\n", { durable: true, testHooks: {\n` +
      `  payloadWriteChunkBytes: spec.phase === "partial_write" ? 1 : undefined,\n` +
      `  afterIsolatedTrusted() { if (spec.phase === "before_write") process.kill(process.pid, "SIGKILL"); },\n` +
      `  afterPayloadWriteProgress(ctx) { if (spec.phase === "partial_write" && ctx.bytes_written < ctx.bytes_total) process.kill(process.pid, "SIGKILL"); },\n` +
      `  afterPayloadBeforeFdatasync() { if (spec.phase === "complete_write_before_fsync") process.kill(process.pid, "SIGKILL"); },\n` +
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

function runCrashCase(target: Target, phase: Phase, seed = true) {
  const fixture = createFixture(`${target}-${phase}-${seed ? "seeded" : "unseeded"}`);
  const targetFile = targetPath(fixture, target);
  const beforeBytes = fs.statSync(targetFile).size;
  const row = appendedRow(target, `crash-${phase}`);
  const id = rowId(row);

  spawnCrash(fixture, target, phase, row, seed);

  assert.equal(
    fs.existsSync(targetFile),
    false,
    `crash fixture unexpectedly restored canonical path for ${target}/${phase}`,
  );
  assert.equal(
    fs.existsSync(intentPath(targetFile)),
    true,
    `crash fixture did not persist recovery intent for ${target}/${phase}`,
  );
  assert.ok(
    claimFiles(targetFile).length >= 1,
    `crash fixture did not leave a stale writer claim for ${target}/${phase}`,
  );
  assert.equal(
    isolatedFiles(targetFile).length,
    1,
    `crash fixture did not leave exactly one isolated generation for ${target}/${phase}`,
  );

  const semantic = snapshot(fixture);

  assert.equal(fs.existsSync(targetFile), true, "canonical history was not recovered");
  assert.equal(
    fs.existsSync(intentPath(targetFile)),
    false,
    "recovery intent was not retired",
  );
  assert.equal(claimFiles(targetFile).length, 0, "stale writer claim was not retired");
  assert.equal(
    isolatedFiles(targetFile).length,
    0,
    "isolated ledger remained split from canonical history after restart",
  );
  assert.ok(
    fs.statSync(targetFile).size >= beforeBytes,
    "recovery lost historical ledger bytes",
  );

  assertOldTruth(target, semantic);
  const shouldContainAppend = phase === "after_durable_append";
  assert.equal(
    countId(targetFile, id),
    shouldContainAppend ? 1 : 0,
    `append commit boundary was not exactly-once for ${target}/${phase}`,
  );
  assertAppendedTruth(target, semantic, id, shouldContainAppend);
}

function runAmbiguousCommitWitnessCase(
  kind: "malformed" | "replacement" | "symlink",
) {
  if (kind === "symlink" && process.platform === "win32") return;
  const fixture = createFixture(`ambiguous-commit-witness-${kind}`);
  const targetFile = fixture.results;
  const row = appendedRow("results", `ambiguous-commit-${kind}`);
  const id = rowId(row);
  spawnCrash(fixture, "results", "after_durable_append", row);

  const intent = JSON.parse(fs.readFileSync(intentPath(targetFile), "utf8"));
  const targetDir = path.dirname(targetFile);
  const commitPath = path.join(targetDir, intent.commit_basename);
  const pinnedPath = path.join(targetDir, intent.pin_basename);
  const isolatedPath = path.join(targetDir, intent.isolated_basename);
  const originalCommit = fs.readFileSync(commitPath);
  const authoritativeSize = fs.statSync(pinnedPath).size;
  assert.equal(fs.statSync(isolatedPath).size, authoritativeSize);
  assert.equal(countId(isolatedPath, id), 1, "durable crash fixture omitted appended row");

  if (kind === "malformed") {
    fs.writeFileSync(commitPath, "{not-json}\n", "utf8");
  } else if (kind === "replacement") {
    fs.unlinkSync(commitPath);
    fs.writeFileSync(
      commitPath,
      JSON.stringify({
        marker: "VOID_AGENT_PICK2_JSONL_APPEND_COMMIT_V1",
        version: 1,
        append_bytes: intent.append_bytes,
        append_sha256: "0".repeat(64),
      }) + "\n",
      "utf8",
    );
  } else {
    const target = path.join(fixture.dir, "untrusted-commit-target.json");
    fs.writeFileSync(target, originalCommit);
    fs.unlinkSync(commitPath);
    fs.symlinkSync(target, commitPath);
  }

  let held = false;
  try {
    snapshot(fixture);
  } catch (err: any) {
    held = /VOID_AGENT_PICK2_JSONL_APPEND_COMMIT_AMBIGUOUS/.test(
      String(err?.message || err),
    );
  }
  assert.equal(held, true, `${kind} commit witness did not HOLD`);
  assert.equal(fs.existsSync(targetFile), false, `${kind} HOLD published canonical history`);
  assert.equal(fs.existsSync(intentPath(targetFile)), true, `${kind} HOLD retired intent`);
  assert.equal(fs.existsSync(pinnedPath), true, `${kind} HOLD lost recovery pin`);
  assert.equal(fs.statSync(pinnedPath).size, authoritativeSize, `${kind} HOLD truncated pin`);
  assert.equal(fs.statSync(isolatedPath).size, authoritativeSize, `${kind} HOLD truncated history`);
  assert.equal(countId(isolatedPath, id), 1, `${kind} HOLD erased durable row`);

  fs.rmSync(commitPath, { recursive: true, force: true });
  fs.writeFileSync(commitPath, originalCommit, { mode: 0o600 });
  const recovered = snapshot(fixture);
  assert.equal(fs.existsSync(intentPath(targetFile)), false, `${kind} retry retained intent`);
  assert.equal(countId(targetFile, id), 1, `${kind} retry did not recover exactly once`);
  assert.equal(recovered.done.has(id), true, `${kind} retry omitted semantic truth`);
}

function runLocalPartialFailure(target: Target) {
  const fixture = createFixture(`local-partial-${target}`);
  const targetFile = targetPath(fixture, target);
  seedWriterState(fixture);
  const row = appendedRow(target, "local-partial");
  const id = rowId(row);
  let threw = false;
  try {
    appendAgentPick2JsonlCanonicalV1(
      targetFile,
      JSON.stringify(row) + "\n",
      {
        durable: true,
        testHooks: {
          payloadWriteChunkBytes: 1,
          afterPayloadWriteProgress(ctx) {
            if (ctx.bytes_written < ctx.bytes_total) {
              throw new Error("INJECT_PARTIAL_PAYLOAD_FAILURE");
            }
          },
        },
      },
    );
  } catch (_err) {
    threw = true;
  }
  assert.equal(threw, true, `partial payload failure did not throw for ${target}`);
  assert.equal(countId(targetFile, id), 0, `partial row survived local rollback for ${target}`);
  assert.equal(fs.existsSync(intentPath(targetFile)), false);
  assert.equal(isolatedFiles(targetFile).length, 0);
  assert.equal(claimFiles(targetFile).length, 0);
  const semantic = snapshot(fixture);
  assertOldTruth(target, semantic);
}

function runClaimPublicationFailure(phase: "after_create" | "partial_body") {
  const fixture = createFixture(`claim-publication-${phase}`);
  seedWriterState(fixture);
  const targetFile = fixture.results;
  let threw = false;
  try {
    appendAgentPick2JsonlCanonicalV1(
      targetFile,
      JSON.stringify({ id: `bad-${phase}`, ts: now }) + "\n",
      {
        testHooks: phase === "after_create"
          ? {
              afterLockClaimTempCreated() {
                throw new Error("INJECT_CLAIM_AFTER_CREATE_FAILURE");
              },
            }
          : {
              afterLockClaimWriteProgress(ctx) {
                if (ctx.bytes_written < ctx.bytes_total) {
                  throw new Error("INJECT_CLAIM_PARTIAL_BODY_FAILURE");
                }
              },
            },
      },
    );
  } catch (_err) {
    threw = true;
  }
  assert.equal(threw, true, `claim publication failure did not throw: ${phase}`);
  assert.equal(claimFiles(targetFile).length, 0, `published orphan claim survived: ${phase}`);
  assert.equal(claimTempFiles(targetFile).length, 0, `partial claim temp survived: ${phase}`);

  const goodId = `good-${phase}`;
  appendAgentPick2JsonlCanonicalV1(
    targetFile,
    JSON.stringify({ id: goodId, ts: now + 1 }) + "\n",
  );
  assert.equal(countId(targetFile, goodId), 1, `next append stayed wedged: ${phase}`);
}

function linuxProcessInstance(pid: number): string {
  const boot = fs.readFileSync("/proc/sys/kernel/random/boot_id", "utf8").trim();
  const raw = fs.readFileSync(`/proc/${pid}/stat`, "utf8");
  const end = raw.lastIndexOf(")");
  assert.ok(end >= 0, "cannot parse /proc stat");
  const fields = raw.slice(end + 1).trim().split(/\s+/);
  const startTicks = fields[19];
  assert.match(String(startTicks || ""), /^\d+$/);
  return `linux:${boot}:${startTicks}`;
}

function writeClaim(
  file: string,
  pid: number,
  processInstance: string,
  token = crypto.randomBytes(16).toString("hex"),
): string {
  const claim = path.join(
    path.dirname(file),
    `${path.basename(file)}.void-pick2-append-claim-${token}.json`,
  );
  fs.writeFileSync(
    claim,
    JSON.stringify({
      marker: "VOID_AGENT_PICK2_JSONL_APPEND_CLAIM_V1",
      version: 1,
      pid,
      process_instance: processInstance,
      token,
      created_ms: Date.now(),
    }) + "\n",
    { mode: 0o600 },
  );
  return claim;
}

function runPidReuseIdentityCase() {
  if (
    process.platform !== "linux" ||
    !fs.existsSync(`/proc/${process.pid}/stat`)
  ) return;
  const fixture = createFixture("pid-instance-reuse");
  seedWriterState(fixture);
  const targetFile = fixture.results;
  const stale = writeClaim(
    targetFile,
    process.pid,
    "linux:recorded-prior-process-instance:1",
  );
  appendAgentPick2JsonlCanonicalV1(
    targetFile,
    JSON.stringify({ id: "pid-reuse-recovered", ts: now + 1 }) + "\n",
  );
  assert.equal(fs.existsSync(stale), false, "PID-reused stale claim was not reclaimed");
  assert.equal(countId(targetFile, "pid-reuse-recovered"), 1);
}

function runLiveClaimInterleavingCase() {
  if (
    process.platform !== "linux" ||
    !fs.existsSync(`/proc/${process.pid}/stat`)
  ) return;
  const fixture = createFixture("live-claim-interleaving");
  seedWriterState(fixture);
  const targetFile = fixture.results;

  // This stale claim models a delayed reclaimer candidate. Its unique pathname
  // can be retired without ever touching the concurrently live claim pathname.
  const stale = writeClaim(targetFile, 999_999_999, "linux:dead-instance:1");

  const ready = path.join(fixture.dir, "live-claim.ready");
  const release = path.join(fixture.dir, "live-claim.release");
  const info = path.join(fixture.dir, "live-claim.path");
  const childPath = path.join(fixture.dir, "live-claim-child.mjs");
  fs.writeFileSync(
    childPath,
    `import fs from "node:fs";\n` +
      `import path from "node:path";\n` +
      `import crypto from "node:crypto";\n` +
      `const file=${JSON.stringify(targetFile)};\n` +
      `const ready=${JSON.stringify(ready)};\n` +
      `const release=${JSON.stringify(release)};\n` +
      `const info=${JSON.stringify(info)};\n` +
      `const boot=fs.readFileSync("/proc/sys/kernel/random/boot_id","utf8").trim();\n` +
      `const raw=fs.readFileSync("/proc/"+process.pid+"/stat","utf8");\n` +
      `const end=raw.lastIndexOf(")");\n` +
      `const fields=raw.slice(end+1).trim().split(/\\s+/);\n` +
      `const instance="linux:"+boot+":"+fields[19];\n` +
      `const token=crypto.randomBytes(16).toString("hex");\n` +
      `const claim=path.join(path.dirname(file),path.basename(file)+".void-pick2-append-claim-"+token+".json");\n` +
      `fs.writeFileSync(claim,JSON.stringify({marker:"VOID_AGENT_PICK2_JSONL_APPEND_CLAIM_V1",version:1,pid:process.pid,process_instance:instance,token,created_ms:Date.now()})+"\\n",{mode:0o600});\n` +
      `fs.writeFileSync(info,claim);\n` +
      `fs.writeFileSync(ready,"1");\n` +
      `const sab=new SharedArrayBuffer(4);const a=new Int32Array(sab);\n` +
      `while(!fs.existsSync(release)) Atomics.wait(a,0,0,10);\n` +
      `fs.unlinkSync(claim);\n`,
    "utf8",
  );

  const child = spawn(process.execPath, [childPath], {
    cwd: process.cwd(),
    stdio: ["ignore", "pipe", "pipe"],
  });
  try {
    waitFor(() => fs.existsSync(ready), "live child claim publication");
    const live = fs.readFileSync(info, "utf8");
    assert.equal(fs.existsSync(live), true, "live child claim disappeared before race");

    let blocked = false;
    try {
      appendAgentPick2JsonlCanonicalV1(
        targetFile,
        JSON.stringify({ id: "must-remain-blocked", ts: now }) + "\n",
      );
    } catch (err: any) {
      blocked = /VOID_AGENT_PICK2_JSONL_CANONICAL_APPEND_LOCKED/.test(
        String(err?.message || err),
      );
    }
    assert.equal(blocked, true, "live foreign claim did not exclude concurrent append");
    assert.equal(fs.existsSync(stale), false, "stale unique claim was not reclaimed");
    assert.equal(
      fs.existsSync(live),
      true,
      "stale reclamation deleted a freshly live replacement claim",
    );

    fs.writeFileSync(release, "1");
    waitFor(() => !fs.existsSync(live), "live child claim release");

    appendAgentPick2JsonlCanonicalV1(
      targetFile,
      JSON.stringify({ id: "after-live-release", ts: now + 1 }) + "\n",
    );
    assert.equal(countId(targetFile, "after-live-release"), 1);
  } finally {
    try { fs.writeFileSync(release, "1"); } catch (err) {
      console.warn("release-signal cleanup failed", err);
    }
    if (child.exitCode === null) child.kill("SIGTERM");
  }
}

function runIntentRetirementFailureCase() {
  const fixture = createFixture("intent-retirement-failure");
  seedWriterState(fixture);
  const targetFile = fixture.results;
  const id = "intent-retirement-committed";
  const payload = JSON.stringify({ id, ts: now + 1 }) + "\n";

  const result = appendAgentPick2JsonlCanonicalV1(
    targetFile,
    payload,
    {
      durable: true,
      testHooks: {
        beforeIntentRetire() {
          throw new Error("INJECT_INTENT_RETIREMENT_FAILURE");
        },
      },
    },
  );
  assert.ok(result, "known committed append was reported as a failure");
  assert.equal(countId(targetFile, id), 1);
  assert.equal(
    fs.existsSync(intentPath(targetFile)),
    true,
    "intent-retirement injection did not preserve the stale intent",
  );

  const semantic = snapshot(fixture);
  assert.equal(fs.existsSync(intentPath(targetFile)), false);
  assert.equal(countId(targetFile, id), 1, "stale intent recovery duplicated committed row");
  assert.equal(semantic.done.has(id), true);

  // A caller retry after a reader sealed the recovered terminal truth must not
  // append the same committed payload a second time.
  appendAgentPick2JsonlCanonicalV1(targetFile, payload, { durable: true });
  assert.equal(countId(targetFile, id), 1, "terminal retry witness did not suppress duplicate");

  const interveningId = "intent-retirement-intervening";
  appendAgentPick2JsonlCanonicalV1(
    targetFile,
    JSON.stringify({ id: interveningId, ts: now + 2 }) + "\n",
  );
  appendAgentPick2JsonlCanonicalV1(targetFile, payload);
  appendAgentPick2JsonlCanonicalV1(targetFile, payload);
  assert.equal(countId(targetFile, interveningId), 1);
  assert.equal(
    countId(targetFile, id),
    1,
    "content-addressed terminal witness did not survive A/B/retry(A)/retry(A)",
  );
}

function runReleaseFailureCase() {
  const fixture = createFixture("release-failure");
  seedWriterState(fixture);
  const targetFile = fixture.results;

  const firstId = "release-failure-first";
  appendAgentPick2JsonlCanonicalV1(
    targetFile,
    JSON.stringify({ id: firstId, ts: now + 1 }) + "\n",
    {
      durable: true,
      testHooks: {
        beforeLockClaimReleaseUnlink() {
          throw new Error("INJECT_RELEASE_UNLINK_FAILURE");
        },
      },
    },
  );
  assert.equal(countId(targetFile, firstId), 1);
  assert.ok(claimFiles(targetFile).length >= 1, "release fault did not leave self-owned claim");

  const secondId = "release-failure-second";
  appendAgentPick2JsonlCanonicalV1(
    targetFile,
    JSON.stringify({ id: secondId, ts: now + 2 }) + "\n",
    { durable: true },
  );
  assert.equal(countId(targetFile, secondId), 1, "next append stayed self-wedged after release fault");
  assert.equal(claimFiles(targetFile).length, 0, "self-owned release orphan was not retired");

  const crashFixture = createFixture("release-failure-after-recovery");
  const crashTarget = crashFixture.results;
  const crashRow = appendedRow("results", "release-recovery");
  const crashId = rowId(crashRow);
  spawnCrash(crashFixture, "results", "after_durable_append", crashRow);

  appendAgentPick2JsonlCanonicalV1(
    crashTarget,
    JSON.stringify(crashRow) + "\n",
    {
      durable: true,
      testHooks: {
        beforeLockClaimReleaseUnlink() {
          throw new Error("INJECT_RECOVERY_RELEASE_UNLINK_FAILURE");
        },
      },
    },
  );
  assert.equal(countId(crashTarget, crashId), 1, "recovered committed row duplicated");
  assert.ok(claimFiles(crashTarget).length >= 1, "recovery release fault did not leave claim");

  const afterId = "after-recovery-release-fault";
  appendAgentPick2JsonlCanonicalV1(
    crashTarget,
    JSON.stringify({ id: afterId, ts: now + 3 }) + "\n",
    { durable: true },
  );
  assert.equal(countId(crashTarget, afterId), 1, "post-recovery append stayed self-wedged");
  assert.equal(claimFiles(crashTarget).length, 0);
}

function runCrossProcessReleaseCase(
  mode: "fault_after_release" | "pause_before_release",
  afterRecovery: boolean,
) {
  const fixture = createFixture(`cross-process-release-${mode}-${afterRecovery}`);
  const targetFile = fixture.results;
  const ownerRow = appendedRow(
    "results",
    afterRecovery ? "cross-release-recovery-owner" : "cross-release-owner",
  );
  const ownerId = rowId(ownerRow);
  if (afterRecovery) {
    spawnCrash(fixture, "results", "after_durable_append", ownerRow);
  }

  const beforeRelease = path.join(fixture.dir, "before-release");
  const continueRelease = path.join(fixture.dir, "continue-release");
  const idle = path.join(fixture.dir, "owner-idle");
  const stop = path.join(fixture.dir, "owner-stop");
  const exited = path.join(fixture.dir, "owner-exited");
  const childPath = path.join(fixture.dir, "release-owner-child.mjs");
  fs.writeFileSync(
    childPath,
    `import fs from "node:fs";\n` +
      `import { appendAgentPick2JsonlCanonicalV1 } from ${JSON.stringify(moduleUrl)};\n` +
      `const file=${JSON.stringify(targetFile)};\n` +
      `const payload=${JSON.stringify(JSON.stringify(ownerRow) + "\n")};\n` +
      `const beforeRelease=${JSON.stringify(beforeRelease)};\n` +
      `const continueRelease=${JSON.stringify(continueRelease)};\n` +
      `const idle=${JSON.stringify(idle)};\n` +
      `const stop=${JSON.stringify(stop)};\n` +
      `const exited=${JSON.stringify(exited)};\n` +
      `const mode=${JSON.stringify(mode)};\n` +
      `const wait=(file)=>{const sab=new SharedArrayBuffer(4);const a=new Int32Array(sab);while(!fs.existsSync(file))Atomics.wait(a,0,0,10);};\n` +
      `appendAgentPick2JsonlCanonicalV1(file,payload,{durable:true,testHooks:{\n` +
      ` beforeLockClaimReleasePublish(){if(mode==="pause_before_release"){fs.writeFileSync(beforeRelease,"1");wait(continueRelease);}},\n` +
      ` beforeLockClaimReleaseUnlink(){if(mode==="fault_after_release")throw new Error("INJECT_CROSS_PROCESS_RELEASE_UNLINK_FAILURE");},\n` +
      `}});\n` +
      `fs.writeFileSync(idle,"1");wait(stop);fs.writeFileSync(exited,"1");\n`,
    "utf8",
  );

  let stderr = "";
  const child = spawn(process.execPath, ["--import", "tsx", childPath], {
    cwd: process.cwd(),
    stdio: ["ignore", "ignore", "pipe"],
  });
  child.stderr.setEncoding("utf8");
  child.stderr.on("data", (chunk) => { stderr += chunk; });
  try {
    if (mode === "pause_before_release") {
      waitFor(
        () => fs.existsSync(beforeRelease) || child.exitCode !== null,
        "owner pre-release hold",
      );
      assert.equal(fs.existsSync(beforeRelease), true, `owner failed before hold: ${stderr}`);
      let blocked = false;
      try {
        appendAgentPick2JsonlCanonicalV1(
          targetFile,
          JSON.stringify({ id: "must-block-before-release", ts: now + 2 }) + "\n",
        );
      } catch (err: any) {
        blocked = /VOID_AGENT_PICK2_JSONL_CANONICAL_APPEND_LOCKED/.test(
          String(err?.message || err),
        );
      }
      assert.equal(blocked, true, "foreign writer entered before logical release");
      assert.equal(claimReleaseFiles(targetFile).length, 0, "release witness published early");
      fs.writeFileSync(continueRelease, "1");
    }

    waitFor(
      () => fs.existsSync(idle) || child.exitCode !== null,
      "released owner idle state",
    );
    assert.equal(fs.existsSync(idle), true, `owner failed before idle: ${stderr}`);
    assert.equal(child.exitCode, null, "released owner did not remain alive");
    if (mode === "fault_after_release") {
      assert.equal(claimFiles(targetFile).length, 1, "release fault omitted owner claim");
      assert.equal(
        claimReleaseFiles(targetFile).length,
        1,
        "release fault omitted cross-process witness",
      );
    }

    const successorId = `cross-release-successor-${mode}-${afterRecovery}`;
    appendAgentPick2JsonlCanonicalV1(
      targetFile,
      JSON.stringify({ id: successorId, ts: now + 3 }) + "\n",
      { durable: true },
    );
    assert.equal(countId(targetFile, ownerId), 1, "owner append/recovery was not exact once");
    assert.equal(countId(targetFile, successorId), 1, "foreign successor append was not exact once");
    assert.equal(claimFiles(targetFile).length, 0, "foreign successor retained a claim");
    assert.equal(claimReleaseFiles(targetFile).length, 0, "release witness was not retired");
  } finally {
    try { fs.writeFileSync(continueRelease, "1"); } catch (_err) {
      // Test cleanup only; the child may already be past this gate.
    }
    try { fs.writeFileSync(stop, "1"); } catch (_err) {
      // Test cleanup only; the child may already have exited.
    }
    waitFor(
      () => fs.existsSync(exited),
      "release-owner child exit",
    );
    if (child.exitCode === null && child.signalCode === null) child.kill("SIGTERM");
  }
}

function runFirstCreateDirectoryDurabilityCase(target: Target) {
  const success = createFixture(`first-create-success-${target}`);
  const successFile = targetPath(success, target);
  fs.unlinkSync(successFile);
  let beforeSync = false;
  let afterSync = false;
  const row = appendedRow(target, "first-create");
  const id = rowId(row);
  appendAgentPick2JsonlCanonicalV1(
    successFile,
    JSON.stringify(row) + "\n",
    {
      durable: true,
      testHooks: {
        beforeFirstCanonicalCreateDirectorySync() {
          beforeSync = true;
        },
        afterFirstCanonicalCreateDirectorySync() {
          afterSync = true;
        },
      },
    },
  );
  assert.equal(beforeSync, true, `first-create pre-directory-sync seam missed for ${target}`);
  assert.equal(afterSync, true, `first-create directory sync not reached for ${target}`);
  assert.equal(countId(successFile, id), 1, `first durable append missing for ${target}`);

  const failure = createFixture(`first-create-dir-sync-failure-${target}`);
  const failureFile = targetPath(failure, target);
  fs.unlinkSync(failureFile);
  const failedRow = appendedRow(target, "first-create-failed");
  const failedId = rowId(failedRow);
  let threw = false;
  let afterFailureSync = false;
  try {
    appendAgentPick2JsonlCanonicalV1(
      failureFile,
      JSON.stringify(failedRow) + "\n",
      {
        durable: true,
        testHooks: {
          beforeFirstCanonicalCreateDirectorySync() {
            throw new Error("INJECT_FIRST_CREATE_DIRECTORY_SYNC_FAILURE");
          },
          afterFirstCanonicalCreateDirectorySync() {
            afterFailureSync = true;
          },
        },
      },
    );
  } catch (err: any) {
    threw = /INJECT_FIRST_CREATE_DIRECTORY_SYNC_FAILURE/.test(
      String(err?.message || err),
    );
  }
  assert.equal(threw, true, `first-create directory sync failure was not surfaced for ${target}`);
  assert.equal(afterFailureSync, false, `first-create failure falsely crossed directory sync for ${target}`);
  assert.equal(countId(failureFile, failedId), 0, `failed first-create append reported bytes for ${target}`);

  appendAgentPick2JsonlCanonicalV1(
    failureFile,
    JSON.stringify(failedRow) + "\n",
    { durable: true },
  );
  assert.equal(countId(failureFile, failedId), 1, `first-create retry did not recover for ${target}`);
}

function runRecoveryPathSwapCase(
  replacement: "regular" | "symlink",
  canonicalConflict: boolean,
) {
  if (replacement === "symlink" && process.platform === "win32") return;
  const fixture = createFixture(`recovery-path-swap-${replacement}-${canonicalConflict}`);
  const targetFile = fixture.results;
  const crashRow = appendedRow("results", `path-swap-${replacement}`);
  spawnCrash(fixture, "results", "before_write", crashRow);

  if (canonicalConflict) {
    fs.writeFileSync(
      targetFile,
      JSON.stringify({ id: "noncanonical-conflict", ts: now + 50 }) + "\n",
      "utf8",
    );
  }

  let swapped = false;
  const replacementTarget = path.join(fixture.dir, `replacement-target-${replacement}.jsonl`);
  fs.writeFileSync(
    replacementTarget,
    JSON.stringify({ id: "replacement-should-never-publish", ts: now + 60 }) + "\n",
    "utf8",
  );

  const afterId = `after-path-swap-${replacement}`;
  appendAgentPick2JsonlCanonicalV1(
    targetFile,
    JSON.stringify({ id: afterId, ts: now + 70 }) + "\n",
    {
      durable: true,
      testHooks: {
        afterRecoveryIsolatedValidated(ctx) {
          assert.equal(fs.existsSync(ctx.pinned_path), true, "validated recovery pin is missing");
          try { fs.unlinkSync(ctx.isolated_path); } catch (err) {
            console.warn("isolated-path fault setup cleanup failed", err);
          }
          if (replacement === "regular") {
            fs.copyFileSync(replacementTarget, ctx.isolated_path);
          } else {
            fs.symlinkSync(replacementTarget, ctx.isolated_path);
          }
          swapped = true;
        },
      },
    },
  );

  assert.equal(swapped, true, "recovery pathname swap hook did not run");
  assert.equal(countId(targetFile, "old-result"), 1, "authoritative historical result was lost");
  assert.equal(countId(targetFile, afterId), 1, "subsequent append did not remain a separate JSONL row");
  assert.equal(
    countId(targetFile, "replacement-should-never-publish"),
    0,
    "unvalidated pathname replacement became canonical history",
  );
  assert.equal(
    countId(targetFile, "noncanonical-conflict"),
    0,
    "noncanonical same-path conflict displaced authoritative history",
  );
  assert.equal(fs.existsSync(intentPath(targetFile)), false, "recovery intent was falsely retained");
  assert.equal(isolatedFiles(targetFile).length, 0, "isolated pathname survived identity-safe recovery");
}

try {
  for (const target of ["completion", "results", "leases", "jobs"] as const) {
    runCrashCase(target, "before_write");
    runCrashCase(target, "partial_write");
    runCrashCase(target, "complete_write_before_fsync");
    runCrashCase(target, "after_durable_append");
    runCrashCase(target, "before_write", false);
    runCrashCase(target, "partial_write", false);
    runCrashCase(target, "complete_write_before_fsync", false);
    runCrashCase(target, "after_durable_append", false);
    runLocalPartialFailure(target);
    runFirstCreateDirectoryDurabilityCase(target);
  }

  runClaimPublicationFailure("after_create");
  runClaimPublicationFailure("partial_body");
  runPidReuseIdentityCase();
  runLiveClaimInterleavingCase();
  runIntentRetirementFailureCase();
  runReleaseFailureCase();
  runCrossProcessReleaseCase("fault_after_release", false);
  runCrossProcessReleaseCase("fault_after_release", true);
  runCrossProcessReleaseCase("pause_before_release", false);
  runAmbiguousCommitWitnessCase("malformed");
  runAmbiguousCommitWitnessCase("replacement");
  runAmbiguousCommitWitnessCase("symlink");
  runRecoveryPathSwapCase("regular", false);
  runRecoveryPathSwapCase("symlink", true);

  console.log("VOID_AGENT_PICK2_JSONL_ISOLATION_CRASH_RECOVERY_V1_PROOF_GREEN");
  console.log("child_sigkill_before_write_all_inputs=true");
  console.log("child_sigkill_partial_payload_all_inputs=true");
  console.log("child_sigkill_complete_payload_before_fsync_rolls_back=true");
  console.log("child_sigkill_after_durable_append_all_inputs=true");
  console.log("partial_payload_local_failure_rolls_back=true");
  console.log("unseeded_first_append_crash_recovery_all_inputs=true");
  console.log("first_create_parent_directory_durable_all_inputs=true");
  console.log("first_create_directory_sync_failure_no_false_success=true");
  console.log("canonical_history_recovered_before_empty_interpretation=true");
  console.log("immutable_unique_append_claims=true");
  console.log("append_claim_publication_failure_atomic=true");
  console.log("pid_reuse_process_instance_recovered=true");
  console.log("live_claim_not_deleted_by_stale_reclaimer=true");
  console.log("append_commit_boundary_absent_or_exactly_once=true");
  console.log("ambiguous_append_commit_witness_fails_closed=true");
  console.log("post_restore_intent_retirement_failure_terminal_truth=true");
  console.log("terminal_retry_witness_content_addressed_set=true");
  console.log("release_failure_self_recovery=true");
  console.log("release_failure_cross_process_recovery=true");
  console.log("pre_release_foreign_writer_excluded=true");
  console.log("isolated_recovery_publication_identity_pinned=true");
  console.log("path_swap_regular_and_symlink_never_publish=true");
  console.log("split_history_after_restart=false");
  console.log("old_completion_result_lease_job_truth_preserved=true");
  console.log("live_runtime_mutation_performed=false");
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
