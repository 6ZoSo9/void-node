import assert from "node:assert/strict";
import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import {
  VOID_WC_PROCESS_INSTANCE_LOCK_V1,
  acquireWcProcessInstanceLockV1,
  releaseWcProcessInstanceLockV1,
  wcProcessStartTicksForProofV1,
  wcProcessStartTicksFromStatTextForProofV1,
  WcProcessInstanceLockError,
} from "../src/economic/wc_process_instance_lock_v1.js";

const childMode = process.argv.includes("--hold-child");

async function child(): Promise<void> {
  const dir = String(process.env.VOID_WC_LOCK_PROOF_DIR || "");
  const name = String(process.env.VOID_WC_LOCK_PROOF_NAME || "");
  const lock = await acquireWcProcessInstanceLockV1(dir, name);
  process.stdout.write(
    `LOCKED ${lock.file} ${lock.generation}\n`,
  );
  // An unresolved Promise alone does not keep Node alive. Hold one real
  // event-loop handle so this fixture is a genuinely live owner until
  // the parent deliberately SIGKILLs it.
  setInterval(() => undefined, 60_000);
  await new Promise<void>(() => undefined);
}

async function expectCode(
  fn: () => Promise<unknown>,
  code: string,
): Promise<void> {
  await assert.rejects(
    fn,
    (error: any) =>
      error instanceof WcProcessInstanceLockError &&
      error.code === code,
  );
}

function genFile(
  dir: string,
  name: string,
  generation: number,
): string {
  return path.join(
    dir,
    `${name}.${String(generation).padStart(16, "0")}.lock`,
  );
}

async function main(): Promise<void> {
  if (childMode) return child();

  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), "void-wc-process-instance-lock-v1-"),
  );
  const name = "proof-lock";
  try {
    const tsx = path.resolve("node_modules/.bin/tsx");
    const proc = spawn(
      tsx,
      [path.resolve(process.argv[1]), "--hold-child"],
      {
        env: {
          ...process.env,
          VOID_WC_LOCK_PROOF_DIR: root,
          VOID_WC_LOCK_PROOF_NAME: name,
        },
        stdio: ["ignore", "pipe", "inherit"],
      },
    );
    const locked = await new Promise<{
      file: string;
      generation: number;
    }>((resolve, reject) => {
      let buffer = "";
      const timer = setTimeout(
        () => reject(new Error("child_lock_timeout")),
        10_000,
      );
      proc.stdout.setEncoding("utf8");
      proc.stdout.on("data", (chunk) => {
        buffer += chunk;
        const line = buffer
          .split(/\r?\n/)
          .find((x) => x.startsWith("LOCKED "));
        if (line) {
          clearTimeout(timer);
          const [, file, generation] = line.split(" ");
          resolve({ file, generation: Number(generation) });
        }
      });
      proc.on("exit", (code) => {
        clearTimeout(timer);
        if (code !== null) {
          reject(new Error(`child_exited_${code}`));
        }
      });
    });

    assert.equal(fs.existsSync(locked.file), true);
    const ancient = new Date(Date.now() - 24 * 60 * 60_000);
    fs.utimesSync(locked.file, ancient, ancient);
    await expectCode(
      () => acquireWcProcessInstanceLockV1(root, name),
      "wc_process_lock_busy",
    );
    assert.equal(fs.existsSync(locked.file), true);

    const authoritativeOwner = JSON.parse(
      fs.readFileSync(locked.file, "utf8"),
    );
    const authoritativeOwnerPid = Number(authoritativeOwner.pid || 0);
    assert.equal(
      Number.isSafeInteger(authoritativeOwnerPid) && authoritativeOwnerPid > 0,
      true,
      "lock generation did not publish a valid owner PID",
    );
    assert.equal(
      String(authoritativeOwner.process_start_ticks || "").length > 0,
      true,
      "lock generation did not publish owner process generation",
    );

    // Kill the process that actually owns the lock generation, not merely the
    // tsx launcher. tsx may execute the TypeScript body in a child process on
    // some Node/runner combinations.
    process.kill(authoritativeOwnerPid, "SIGKILL");

    const ownerDeadline = Date.now() + 10_000;
    for (;;) {
      const liveTicks = await wcProcessStartTicksForProofV1(
        authoritativeOwnerPid,
      );
      if (liveTicks === null) break;
      if (Date.now() >= ownerDeadline) {
        throw new Error("authoritative_lock_owner_did_not_exit");
      }
      await new Promise<void>((resolve) => setTimeout(resolve, 5));
    }

    // Best-effort reap/terminate the launcher wrapper too, but it is not the
    // authority decision. Recovery is keyed to the PID stored in the lock.
    if (proc.exitCode === null && proc.signalCode === null) {
      proc.kill("SIGKILL");
    }
    if (proc.exitCode === null && proc.signalCode === null) {
      await Promise.race([
        new Promise<void>((resolve) =>
          proc.once("exit", () => resolve()),
        ),
        new Promise<void>((resolve) => setTimeout(resolve, 2_000)),
      ]);
    }

    const recovered = await acquireWcProcessInstanceLockV1(
      root,
      name,
    );
    assert.ok(recovered.generation > locked.generation);
    await releaseWcProcessInstanceLockV1(recovered);

    const currentTicks = await wcProcessStartTicksForProofV1(
      process.pid,
    );
    assert.ok(currentTicks);
    const fakeGeneration = recovered.generation + 1;
    const fakeFile = genFile(root, name, fakeGeneration);
    fs.writeFileSync(
      fakeFile,
      JSON.stringify({
        marker: VOID_WC_PROCESS_INSTANCE_LOCK_V1,
        version: 1,
        name,
        generation: fakeGeneration,
        pid: process.pid,
        process_start_ticks: String(BigInt(currentTicks!) + 1n),
        created_at_ms: Date.now(),
      }) + "\n",
    );
    const pidReuseRecovered = await acquireWcProcessInstanceLockV1(
      root,
      name,
    );
    assert.ok(pidReuseRecovered.generation > fakeGeneration);
    await releaseWcProcessInstanceLockV1(pidReuseRecovered);

    const runningFields = [
      "R",
      ...Array.from({ length: 18 }, () => "0"),
      "424242",
    ];
    const zombieFields = [
      "Z",
      ...Array.from({ length: 18 }, () => "0"),
      "424242",
    ];
    const deadFields = [
      "X",
      ...Array.from({ length: 18 }, () => "0"),
      "424242",
    ];
    assert.equal(
      wcProcessStartTicksFromStatTextForProofV1(
        `123 (proof-running) ${runningFields.join(" ")}`,
      ),
      "424242",
      "running proc-stat generation was not preserved",
    );
    assert.equal(
      wcProcessStartTicksFromStatTextForProofV1(
        `124 (proof-zombie) ${zombieFields.join(" ")}`,
      ),
      null,
      "zombie proc-stat remained eligible as lock owner",
    );
    assert.equal(
      wcProcessStartTicksFromStatTextForProofV1(
        `125 (proof-dead) ${deadFields.join(" ")}`,
      ),
      null,
      "dead proc-stat remained eligible as lock owner",
    );

    const orphanTemp = path.join(
      root,
      `.${name}.orphan-publication.tmp`,
    );
    fs.writeFileSync(orphanTemp, "{partial-generation\n");
    const tempIgnored = await acquireWcProcessInstanceLockV1(
      root,
      name,
    );
    assert.equal(
      fs.existsSync(orphanTemp),
      true,
      "orphan publication temp unexpectedly became authority",
    );
    await releaseWcProcessInstanceLockV1(tempIgnored);
    await fsp.unlink(orphanTemp);

    const old = await acquireWcProcessInstanceLockV1(root, name);
    await releaseWcProcessInstanceLockV1(old);
    const replacement = await acquireWcProcessInstanceLockV1(
      root,
      name,
    );
    await releaseWcProcessInstanceLockV1(old);
    await expectCode(
      () => acquireWcProcessInstanceLockV1(root, name),
      "wc_process_lock_busy",
    );
    await releaseWcProcessInstanceLockV1(replacement);

    const malformedGeneration = replacement.generation + 1;
    const malformed = genFile(
      root,
      name,
      malformedGeneration,
    );
    fs.writeFileSync(malformed, "{broken\n");
    await expectCode(
      () => acquireWcProcessInstanceLockV1(root, name),
      "wc_process_lock_ambiguous_generation",
    );
    assert.equal(fs.existsSync(malformed), true);
    await fsp.unlink(malformed);

    console.log("VOID_WC_PROCESS_INSTANCE_LOCK_V1_GREEN");
    console.log("age_based_live_owner_eviction=false");
    console.log("dead_owner_generation_advanced=true");
    console.log("authoritative_lock_owner_pid_terminated=true");
    const helperSource = fs.readFileSync(
      path.resolve("src/economic/wc_process_instance_lock_v1.ts"),
      "utf8",
    );
    assert.equal(
      helperSource.includes('code === "ENOENT" || code === "ESRCH"'),
      true,
      "procfs owner disappearance does not accept ESRCH",
    );
    console.log("procfs_esrch_owner_disappearance_handled=true");
    console.log("pid_reuse_generation_advanced=true");
    console.log("zombie_process_state_ineligible=true");
    console.log("dead_process_state_ineligible=true");
    console.log("old_release_replacement_delete=false");
    console.log("partial_generation_publication_not_authoritative=true");
    console.log("malformed_current_generation_fail_closed=true");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
