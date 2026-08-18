import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import {
  appendWcPublicRemoteTruthJsonlExactOnceV1,
  prepareWcPublicRemoteTruthJsonlExactOnceV1,
  resetWcPublicRemoteTruthJsonlIndexForProofV1,
  waitForWcPublicRemoteTruthJsonlIndexWarmForProofV1,
} from "../src/economic/wc_public_remote_truth_jsonl_index_v1.js";

const childMode = process.argv.includes("--child");
const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

async function waitForFile(file: string, timeoutMs = 10_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (!fs.existsSync(file)) {
    if (Date.now() >= deadline) throw new Error(`timeout:${file}`);
    await sleep(5);
  }
}

async function ensureReady(file: string, ids: string[]): Promise<void> {
  try {
    await prepareWcPublicRemoteTruthJsonlExactOnceV1(file, ids);
    return;
  } catch (error: any) {
    if (!String(error?.message || error).includes("INDEX_WARMING")) {
      throw error;
    }
  }
  await waitForWcPublicRemoteTruthJsonlIndexWarmForProofV1(file, ids);
  await prepareWcPublicRemoteTruthJsonlExactOnceV1(file, ids);
}

async function child(): Promise<void> {
  const file = String(process.env.VOID_REMOTE_TRUTH_FILE || "");
  const ready = String(process.env.VOID_REMOTE_TRUTH_READY || "");
  const release = String(process.env.VOID_REMOTE_TRUTH_RELEASE || "");
  const resultFile = String(process.env.VOID_REMOTE_TRUTH_RESULT || "");
  const ids = JSON.parse(String(process.env.VOID_REMOTE_TRUTH_IDS || "[]"));
  const value = JSON.parse(String(process.env.VOID_REMOTE_TRUTH_VALUE || "{}"));

  await ensureReady(file, ids);
  let output: any;
  try {
    const result = await appendWcPublicRemoteTruthJsonlExactOnceV1(
      file,
      value,
      ids,
      {
        durable: true,
        mode: 0o600,
        testHooks: {
          beforeCrossProcessAuthority: async () => {
            fs.writeFileSync(ready, "ready\n");
            await waitForFile(release);
          },
        },
      },
    );
    output = { ok: true, result };
  } catch (error: any) {
    output = { ok: false, error: String(error?.message || error) };
  }
  fs.writeFileSync(resultFile, JSON.stringify(output) + "\n");
}

function seed(file: string, row: any): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(row) + "\n", { mode: 0o600 });
}

function rows(file: string): any[] {
  return fs
    .readFileSync(file, "utf8")
    .trim()
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function spawnBarrierChild(
  file: string,
  value: any,
  ids: string[],
  ready: string,
  release: string,
  result: string,
) {
  const tsx = path.resolve("node_modules/.bin/tsx");
  return spawn(tsx, [path.resolve(process.argv[1]), "--child"], {
    env: {
      ...process.env,
      VOID_REMOTE_TRUTH_FILE: file,
      VOID_REMOTE_TRUTH_READY: ready,
      VOID_REMOTE_TRUTH_RELEASE: release,
      VOID_REMOTE_TRUTH_RESULT: result,
      VOID_REMOTE_TRUTH_IDS: JSON.stringify(ids),
      VOID_REMOTE_TRUTH_VALUE: JSON.stringify(value),
    },
    stdio: ["ignore", "inherit", "inherit"],
  });
}

async function waitExit(proc: ReturnType<typeof spawn>): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    proc.once("error", reject);
    proc.once("exit", (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`child_exit code=${code} signal=${signal}`));
    });
  });
}

async function runTwoProcessRace(
  root: string,
  suffix: string,
  leftValue: any,
  rightValue: any,
): Promise<{ file: string; left: any; right: any }> {
  const file = path.join(root, `${suffix}.jsonl`);
  seed(file, {
    receipt_id: `seed-${suffix}`,
    job_id: `seed-job-${suffix}`,
    account: "seed-account",
    status: "completed",
  });

  const release = path.join(root, `${suffix}.release`);
  const leftReady = path.join(root, `${suffix}.left.ready`);
  const rightReady = path.join(root, `${suffix}.right.ready`);
  const leftResult = path.join(root, `${suffix}.left.result.json`);
  const rightResult = path.join(root, `${suffix}.right.result.json`);

  const leftProc = spawnBarrierChild(
    file,
    leftValue,
    ["receipt_id"],
    leftReady,
    release,
    leftResult,
  );
  const rightProc = spawnBarrierChild(
    file,
    rightValue,
    ["receipt_id"],
    rightReady,
    release,
    rightResult,
  );

  await Promise.all([waitForFile(leftReady), waitForFile(rightReady)]);
  fs.writeFileSync(release, "go\n");
  await Promise.all([waitExit(leftProc), waitExit(rightProc)]);

  return {
    file,
    left: JSON.parse(fs.readFileSync(leftResult, "utf8")),
    right: JSON.parse(fs.readFileSync(rightResult, "utf8")),
  };
}

function rewriteSameLength(file: string, value: any): void {
  const next = Buffer.from(JSON.stringify(value) + "\n", "utf8");
  const prior = fs.readFileSync(file);
  assert.equal(next.length, prior.length, "rewrite fixture length drifted");
  const fd = fs.openSync(file, "r+");
  try {
    const written = fs.writeSync(fd, next, 0, next.length, 0);
    assert.equal(written, next.length);
    fs.fdatasyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
}

async function main(): Promise<void> {
  if (childMode) return child();

  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), "void-wc-remote-truth-atomicity-v1-"),
  );
  try {
    const same = {
      receipt_id: "race-same-id",
      job_id: "race-job-id",
      account: "race-account",
      status: "completed",
      dataset_id: "race-dataset",
    };
    const sameRace = await runTwoProcessRace(root, "same", same, same);
    const sameResults = [sameRace.left, sameRace.right];
    assert.equal(
      sameResults.filter(
        (entry) => entry.ok === true && entry.result.appended === true,
      ).length,
      1,
    );
    assert.equal(
      sameResults.filter(
        (entry) => entry.ok === true && entry.result.appended === false,
      ).length,
      1,
    );
    assert.equal(
      rows(sameRace.file).filter(
        (row) => row.receipt_id === same.receipt_id,
      ).length,
      1,
    );

    const conflictRace = await runTwoProcessRace(
      root,
      "conflict",
      {
        receipt_id: "race-conflict-id",
        job_id: "race-conflict-job-a",
        account: "race-account-a",
        status: "completed",
      },
      {
        receipt_id: "race-conflict-id",
        job_id: "race-conflict-job-b",
        account: "race-account-b",
        status: "completed",
      },
    );
    const conflictResults = [conflictRace.left, conflictRace.right];
    assert.equal(
      conflictResults.filter(
        (entry) => entry.ok === true && entry.result.appended === true,
      ).length,
      1,
    );
    assert.equal(
      conflictResults.filter(
        (entry) =>
          entry.ok === false &&
          /^remote_truth_(account|job_id)_conflict$/.test(entry.error),
      ).length,
      1,
    );
    assert.equal(
      rows(conflictRace.file).filter(
        (row) => row.receipt_id === "race-conflict-id",
      ).length,
      1,
    );

    resetWcPublicRemoteTruthJsonlIndexForProofV1();

    const fixedTime = new Date(1_700_000_000_000);
    const alpha = {
      receipt_id: "alpha-0001",
      job_id: "job-alpha1",
      account: "acct-alpha",
      status: "completed",
    };
    const bravo = {
      receipt_id: "bravo-0001",
      job_id: "job-bravo1",
      account: "acct-bravo",
      status: "completed",
    };
    assert.equal(
      Buffer.byteLength(JSON.stringify(alpha)),
      Buffer.byteLength(JSON.stringify(bravo)),
    );

    const staleAbsenceFile = path.join(root, "ctime-stale-absence.jsonl");
    seed(staleAbsenceFile, alpha);
    fs.utimesSync(staleAbsenceFile, fixedTime, fixedTime);
    await ensureReady(staleAbsenceFile, ["receipt_id"]);
    const beforeAbsence = fs.statSync(
      staleAbsenceFile,
      { bigint: true } as any,
    );
    await sleep(10);
    rewriteSameLength(staleAbsenceFile, bravo);
    fs.utimesSync(staleAbsenceFile, fixedTime, fixedTime);
    const afterAbsence = fs.statSync(
      staleAbsenceFile,
      { bigint: true } as any,
    );
    assert.equal(beforeAbsence.mtimeNs, afterAbsence.mtimeNs);
    assert.notEqual(beforeAbsence.ctimeNs, afterAbsence.ctimeNs);

    await assert.rejects(
      () =>
        appendWcPublicRemoteTruthJsonlExactOnceV1(
          staleAbsenceFile,
          bravo,
          ["receipt_id"],
        ),
      /VOID_WC_REMOTE_TRUTH_INDEX_WARMING/,
    );
    assert.equal(rows(staleAbsenceFile).length, 1);
    await waitForWcPublicRemoteTruthJsonlIndexWarmForProofV1(
      staleAbsenceFile,
      ["receipt_id"],
    );
    const bravoExisting = await appendWcPublicRemoteTruthJsonlExactOnceV1(
      staleAbsenceFile,
      bravo,
      ["receipt_id"],
    );
    assert.equal(bravoExisting.appended, false);

    const stalePresenceFile = path.join(root, "ctime-stale-presence.jsonl");
    seed(stalePresenceFile, alpha);
    fs.utimesSync(stalePresenceFile, fixedTime, fixedTime);
    await ensureReady(stalePresenceFile, ["receipt_id"]);
    const beforePresence = fs.statSync(
      stalePresenceFile,
      { bigint: true } as any,
    );
    await sleep(10);
    rewriteSameLength(stalePresenceFile, bravo);
    fs.utimesSync(stalePresenceFile, fixedTime, fixedTime);
    const afterPresence = fs.statSync(
      stalePresenceFile,
      { bigint: true } as any,
    );
    assert.equal(beforePresence.mtimeNs, afterPresence.mtimeNs);
    assert.notEqual(beforePresence.ctimeNs, afterPresence.ctimeNs);

    await assert.rejects(
      () =>
        appendWcPublicRemoteTruthJsonlExactOnceV1(
          stalePresenceFile,
          alpha,
          ["receipt_id"],
        ),
      /VOID_WC_REMOTE_TRUTH_INDEX_WARMING/,
    );
    assert.equal(rows(stalePresenceFile).length, 1);
    await waitForWcPublicRemoteTruthJsonlIndexWarmForProofV1(
      stalePresenceFile,
      ["receipt_id"],
    );
    const alphaReintroduced =
      await appendWcPublicRemoteTruthJsonlExactOnceV1(
        stalePresenceFile,
        alpha,
        ["receipt_id"],
      );
    assert.equal(alphaReintroduced.appended, true);
    assert.equal(rows(stalePresenceFile).length, 2);

    console.log("VOID_WC_PUBLIC_REMOTE_TRUTH_ATOMICITY_V1_GREEN");
    console.log("cross_process_same_identity_duplicate_rows=0");
    console.log("cross_process_conflict_duplicate_rows=0");
    console.log("same_inode_restored_mtime_ctime_alias_rejected=true");
    console.log("stale_absence_cache_hit=false");
    console.log("stale_presence_cache_hit=false");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
