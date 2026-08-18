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

    proc.kill("SIGKILL");
    await new Promise<void>((resolve) =>
      proc.once("exit", () => resolve()),
    );

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
    console.log("pid_reuse_generation_advanced=true");
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
