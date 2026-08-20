import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn, execFileSync } from "node:child_process";
import {
  VOID_WC_PROCESS_INSTANCE_LOCK_V1,
  acquireWcProcessInstanceLockV1,
  releaseWcProcessInstanceLockV1,
  setWcProcessInstanceLockBeforeRecordReadHookForProofV1,
  setWcProcessInstanceLockPublicationSyncFailuresForProofV1,
  setWcProcessInstanceLockReleasePublicationFaultForProofV1,
  wcProcessInstanceLockMetricsForProofV1,
  wcProcessInstanceLockNamespaceForProofV1,
  wcProcessStartTicksForProofV1,
  wcProcessStartTicksFromStatTextForProofV1,
  WcProcessInstanceLockError,
  type WcProcessInstanceLockV1,
} from "../src/economic/wc_process_instance_lock_v1.js";

const childMode = process.argv.includes("--hold-child");
const releaseFaultChildMode = process.argv.includes(
  "--release-fault-child",
);

async function child(): Promise<void> {
  const dir = String(process.env.VOID_WC_LOCK_PROOF_DIR || "");
  const name = String(process.env.VOID_WC_LOCK_PROOF_NAME || "");
  const lock = await acquireWcProcessInstanceLockV1(dir, name);
  process.stdout.write(`LOCKED ${lock.file} ${lock.generation}\n`);
  setInterval(() => undefined, 60_000);
  await new Promise<void>(() => undefined);
}

async function releaseFaultChild(): Promise<void> {
  const dir = String(process.env.VOID_WC_LOCK_PROOF_DIR || "");
  const name = String(process.env.VOID_WC_LOCK_PROOF_NAME || "");
  const lock = await acquireWcProcessInstanceLockV1(dir, name);
  setWcProcessInstanceLockReleasePublicationFaultForProofV1(true);
  await releaseWcProcessInstanceLockV1(lock);
  setWcProcessInstanceLockReleasePublicationFaultForProofV1(false);
  process.stdout.write(`RELEASED ${lock.file} ${lock.generation}\n`);
  setInterval(() => undefined, 60_000);
  await new Promise<void>(() => undefined);
}

async function expectCode(
  fn: () => Promise<unknown>,
  code: string | RegExp,
): Promise<void> {
  await assert.rejects(fn, (error: any) => {
    const actual = String(error?.code || error?.message || error);
    return typeof code === "string" ? actual === code : code.test(actual);
  });
}

function genFile(namespace: string, generation: number, kind: "lock" | "released"): string {
  return path.join(
    namespace,
    `${String(generation).padStart(16, "0")}.${kind}`,
  );
}

function readJson(file: string): Record<string, any> {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function writeJson(file: string, value: Record<string, any>): void {
  fs.writeFileSync(file, JSON.stringify(value) + "\n", { mode: 0o600 });
}

function nextUuid(raw: string): string {
  const first = raw[0] === "0" ? "1" : "0";
  return first + raw.slice(1);
}

async function main(): Promise<void> {
  if (childMode) return child();
  if (releaseFaultChildMode) return releaseFaultChild();

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
        if (code !== null) reject(new Error(`child_exited_${code}`));
      });
    });

    assert.equal(fs.existsSync(locked.file), true);
    const ancient = new Date(Date.now() - 24 * 60 * 60_000);
    fs.utimesSync(locked.file, ancient, ancient);
    await expectCode(
      () => acquireWcProcessInstanceLockV1(root, name),
      "wc_process_lock_busy",
    );

    const authoritativeOwner = readJson(locked.file);
    const ownerPid = Number(authoritativeOwner.pid);
    assert.ok(ownerPid > 0);
    process.kill(ownerPid, "SIGKILL");
    const ownerDeadline = Date.now() + 10_000;
    for (;;) {
      if ((await wcProcessStartTicksForProofV1(ownerPid)) === null) break;
      if (Date.now() >= ownerDeadline) {
        throw new Error("authoritative_lock_owner_did_not_exit");
      }
      await new Promise<void>((resolve) => setTimeout(resolve, 5));
    }
    if (proc.exitCode === null && proc.signalCode === null) proc.kill("SIGKILL");

    const recovered = await acquireWcProcessInstanceLockV1(root, name);
    assert.ok(recovered.generation > locked.generation);
    await releaseWcProcessInstanceLockV1(recovered);

    // A transient release-publication fault must retain one bounded shared
    // publication obligation. A foreign process converges after storage
    // recovery even while the releasing process stays alive and never
    // reacquires the lock.
    {
      const releaseName = "release-cross-process-recovery";
      const releaseProc = spawn(
        tsx,
        [path.resolve(process.argv[1]), "--release-fault-child"],
        {
          env: {
            ...process.env,
            VOID_WC_LOCK_PROOF_DIR: root,
            VOID_WC_LOCK_PROOF_NAME: releaseName,
          },
          stdio: ["ignore", "pipe", "inherit"],
        },
      );
      const released = await new Promise<{
        file: string;
        generation: number;
      }>((resolve, reject) => {
        let buffer = "";
        const timer = setTimeout(
          () => reject(new Error("release_child_timeout")),
          10_000,
        );
        releaseProc.stdout.setEncoding("utf8");
        releaseProc.stdout.on("data", (chunk) => {
          buffer += chunk;
          const line = buffer
            .split(/\r?\n/)
            .find((value) => value.startsWith("RELEASED "));
          if (!line) return;
          clearTimeout(timer);
          const [, file, generation] = line.split(" ");
          resolve({ file, generation: Number(generation) });
        });
        releaseProc.on("exit", (code) => {
          clearTimeout(timer);
          if (code !== null) {
            reject(new Error(`release_child_exited_${code}`));
          }
        });
      });
      assert.equal(fs.existsSync(released.file), true);

      let successor: WcProcessInstanceLockV1 | null = null;
      const deadline = Date.now() + 10_000;
      while (!successor && Date.now() < deadline) {
        try {
          successor = await acquireWcProcessInstanceLockV1(
            root,
            releaseName,
          );
        } catch (error: any) {
          assert.equal(error?.code, "wc_process_lock_busy");
          await new Promise<void>((resolve) => setTimeout(resolve, 10));
        }
      }
      assert.ok(successor, "foreign process did not converge after release recovery");
      assert.equal(successor.generation, released.generation + 1);
      await releaseWcProcessInstanceLockV1(successor);
      if (releaseProc.exitCode === null && releaseProc.signalCode === null) {
        releaseProc.kill("SIGKILL");
      }
    }

    const currentTicks = await wcProcessStartTicksForProofV1(process.pid);
    assert.ok(currentTicks);

    // PID reuse is not authority: same numeric PID with the wrong process
    // generation must be reclaimable.
    {
      const generation = recovered.generation + 1;
      writeJson(genFile(recovered.namespace_dir, generation, "lock"), {
        marker: VOID_WC_PROCESS_INSTANCE_LOCK_V1,
        version: 1,
        name,
        generation,
        pid: process.pid,
        process_start_ticks: String(BigInt(currentTicks!) + 1n),
        boot_id: recovered.boot_id,
        owner_nonce: "1".repeat(64),
        created_at_ms: Date.now(),
      });
      const next = await acquireWcProcessInstanceLockV1(root, name);
      assert.ok(next.generation > generation);
      await releaseWcProcessInstanceLockV1(next);
    }

    // A reboot epoch mismatch also makes an otherwise live PID/tick tuple
    // ineligible as owner.
    {
      const base = await acquireWcProcessInstanceLockV1(root, "boot-epoch");
      await releaseWcProcessInstanceLockV1(base);
      const generation = base.generation + 1;
      writeJson(genFile(base.namespace_dir, generation, "lock"), {
        marker: VOID_WC_PROCESS_INSTANCE_LOCK_V1,
        version: 1,
        name: "boot-epoch",
        generation,
        pid: process.pid,
        process_start_ticks: currentTicks,
        boot_id: nextUuid(base.boot_id),
        owner_nonce: "2".repeat(64),
        created_at_ms: Date.now(),
      });
      const next = await acquireWcProcessInstanceLockV1(root, "boot-epoch");
      assert.ok(next.generation > generation);
      await releaseWcProcessInstanceLockV1(next);
    }

    const runningFields = ["R", ...Array.from({ length: 18 }, () => "0"), "424242"];
    const zombieFields = ["Z", ...Array.from({ length: 18 }, () => "0"), "424242"];
    const deadFields = ["X", ...Array.from({ length: 18 }, () => "0"), "424242"];
    assert.equal(
      wcProcessStartTicksFromStatTextForProofV1(
        `123 (proof-running) ${runningFields.join(" ")}`,
      ),
      "424242",
    );
    assert.equal(
      wcProcessStartTicksFromStatTextForProofV1(
        `124 (proof-zombie) ${zombieFields.join(" ")}`,
      ),
      null,
    );
    assert.equal(
      wcProcessStartTicksFromStatTextForProofV1(
        `125 (proof-dead) ${deadFields.join(" ")}`,
      ),
      null,
    );

    // A fixed number of deterministic shards bounds lifetime disk artifacts.
    // Histories for unrelated names never inflate one shard beyond its exact
    // current generation pair.
    for (let index = 0; index < 80; index += 1) {
      const unrelated = await acquireWcProcessInstanceLockV1(
        root,
        `unrelated-${index}`,
      );
      await releaseWcProcessInstanceLockV1(unrelated);
    }
    const isolated = await acquireWcProcessInstanceLockV1(root, "isolated-target");
    assert.ok(
      wcProcessInstanceLockMetricsForProofV1().last_namespace_entries_scanned <= 2,
    );
    await releaseWcProcessInstanceLockV1(isolated);

    // Distinct names that collide in the primary 12-bit shard must retain
    // independent live ownership. A collision is a placement concern, not a
    // reason for one ticket/claim to inherit another name's busy terminal.
    {
      const firstName = "collision-proof-3";
      const secondName = "collision-proof-153";
      assert.equal(
        wcProcessInstanceLockNamespaceForProofV1(
          root,
          firstName,
        ),
        wcProcessInstanceLockNamespaceForProofV1(
          root,
          secondName,
        ),
        "fixture no longer collides in the primary shard",
      );

      const first = await acquireWcProcessInstanceLockV1(
        root,
        firstName,
      );
      const second = await acquireWcProcessInstanceLockV1(
        root,
        secondName,
      );
      assert.notEqual(
        second.namespace_dir,
        first.namespace_dir,
        "colliding unrelated names shared one live namespace",
      );
      await expectCode(
        () =>
          acquireWcProcessInstanceLockV1(
            root,
            firstName,
          ),
        "wc_process_lock_busy",
      );
      await releaseWcProcessInstanceLockV1(second);
      await releaseWcProcessInstanceLockV1(first);
    }

    // A lock pathname that becomes visible before its directory fsync fails
    // must not self-wedge the publishing process. The next immutable
    // generation completes durability and retires the uncertain predecessor.
    setWcProcessInstanceLockPublicationSyncFailuresForProofV1(1);
    const publicationRecovered =
      await acquireWcProcessInstanceLockV1(root, "post-link-sync");
    assert.ok(publicationRecovered.generation >= 2);
    await releaseWcProcessInstanceLockV1(publicationRecovered);

    // Publication temps are non-authoritative, bounded, and reclaimed only
    // when their exact boot/PID/process generation is no longer live.
    {
      const owner = await acquireWcProcessInstanceLockV1(
        root,
        "temp-cleanup",
      );
      await releaseWcProcessInstanceLockV1(owner);
      const tempDir = path.join(
        path.dirname(owner.namespace_dir),
        "tmp",
      );
      const staleTemp = path.join(
        tempDir,
        `lock.${nextUuid(owner.boot_id)}.${process.pid}.${currentTicks}.${"a".repeat(32)}.tmp`,
      );
      const liveTemp = path.join(
        tempDir,
        `lock.${owner.boot_id}.${process.pid}.${currentTicks}.${"b".repeat(32)}.tmp`,
      );
      fs.writeFileSync(staleTemp, "stale", { mode: 0o600 });
      fs.writeFileSync(liveTemp, "live", { mode: 0o600 });
      const next = await acquireWcProcessInstanceLockV1(
        root,
        "temp-cleanup",
      );
      assert.equal(fs.existsSync(staleTemp), false);
      assert.equal(fs.existsSync(liveTemp), true);
      fs.unlinkSync(liveTemp);
      await releaseWcProcessInstanceLockV1(next);
    }

    // Directory enumeration itself is cap+1 bounded. Neither a corrupted
    // state directory nor abandoned publication-temp history can be fully
    // materialized before the participant-critical acquisition returns HOLD.
    {
      const stateOwner = await acquireWcProcessInstanceLockV1(
        root,
        "state-overflow",
      );
      await releaseWcProcessInstanceLockV1(stateOwner);
      for (const entry of fs.readdirSync(stateOwner.namespace_dir)) {
        fs.unlinkSync(path.join(stateOwner.namespace_dir, entry));
      }
      for (let generation = 1; generation <= 130; generation += 1) {
        fs.writeFileSync(
          genFile(stateOwner.namespace_dir, generation, "lock"),
          "{}\n",
          { mode: 0o600 },
        );
      }
      await expectCode(
        () => acquireWcProcessInstanceLockV1(root, "state-overflow"),
        "wc_process_lock_namespace_overflow",
      );
      for (const entry of fs.readdirSync(stateOwner.namespace_dir)) {
        fs.unlinkSync(path.join(stateOwner.namespace_dir, entry));
      }

      const tempOwner = await acquireWcProcessInstanceLockV1(
        root,
        "temp-overflow",
      );
      await releaseWcProcessInstanceLockV1(tempOwner);
      const tempDir = path.join(
        path.dirname(tempOwner.namespace_dir),
        "tmp",
      );
      for (let index = 0; index < 129; index += 1) {
        fs.writeFileSync(
          path.join(
            tempDir,
            `lock.${tempOwner.boot_id}.${process.pid}.${currentTicks}.${index
              .toString(16)
              .padStart(32, "0")}.tmp`,
          ),
          "live",
          { mode: 0o600 },
        );
      }
      await expectCode(
        () => acquireWcProcessInstanceLockV1(root, "temp-overflow"),
        "wc_process_lock_publication_temp_overflow",
      );
      for (const entry of fs.readdirSync(tempDir)) {
        fs.unlinkSync(path.join(tempDir, entry));
      }
    }

    // A disappearing generation is a bounded rescan, not a permanent
    // ambiguity. The proof advances N -> N+1 under the read hook.
    {
      const old = await acquireWcProcessInstanceLockV1(root, "turnover");
      await releaseWcProcessInstanceLockV1(old);
      let fired = false;
      setWcProcessInstanceLockBeforeRecordReadHookForProofV1(
        async (file, label) => {
          if (
            fired ||
            label !== "wc_process_lock_record" ||
            file !== old.file
          ) {
            return;
          }
          fired = true;
          fs.unlinkSync(old.file);
          fs.unlinkSync(old.released_file);
          const generation = old.generation + 1;
          const lockRecord = {
            marker: VOID_WC_PROCESS_INSTANCE_LOCK_V1,
            version: 1,
            name: "turnover",
            generation,
            pid: old.pid,
            process_start_ticks: old.process_start_ticks,
            boot_id: old.boot_id,
            owner_nonce: "3".repeat(64),
            created_at_ms: Date.now(),
          };
          writeJson(genFile(old.namespace_dir, generation, "lock"), lockRecord);
          writeJson(genFile(old.namespace_dir, generation, "released"), {
            marker: VOID_WC_PROCESS_INSTANCE_LOCK_V1,
            version: 1,
            name: "turnover",
            generation,
            pid: lockRecord.pid,
            process_start_ticks: lockRecord.process_start_ticks,
            boot_id: lockRecord.boot_id,
            owner_nonce: lockRecord.owner_nonce,
            released_at_ms: Date.now(),
          });
        },
      );
      const next = await acquireWcProcessInstanceLockV1(root, "turnover");
      setWcProcessInstanceLockBeforeRecordReadHookForProofV1(null);
      assert.equal(fired, true);
      assert.ok(next.generation >= old.generation + 2);
      await releaseWcProcessInstanceLockV1(next);
    }

    // Strict current-generation records reject coercible schemas, symlinks,
    // FIFOs, oversized payloads, and release tuples for another owner.
    async function malformedCase(
      caseName: string,
      writer: (lock: WcProcessInstanceLockV1, generation: number, file: string) => void,
      code: RegExp,
    ): Promise<void> {
      const prior = await acquireWcProcessInstanceLockV1(root, caseName);
      await releaseWcProcessInstanceLockV1(prior);
      const generation = prior.generation + 1;
      const file = genFile(prior.namespace_dir, generation, "lock");
      writer(prior, generation, file);
      await expectCode(
        () => acquireWcProcessInstanceLockV1(root, caseName),
        code,
      );
    }

    await malformedCase(
      "wrong-type",
      (prior, generation, file) => {
        writeJson(file, {
          marker: VOID_WC_PROCESS_INSTANCE_LOCK_V1,
          version: 1,
          name: "wrong-type",
          generation,
          pid: [process.pid],
          process_start_ticks: currentTicks,
          boot_id: prior.boot_id,
          owner_nonce: "4".repeat(64),
          created_at_ms: Date.now(),
        });
      },
      /wc_process_lock_record_schema_invalid/,
    );

    await malformedCase(
      "symlink-record",
      (_prior, _generation, file) => {
        const target = path.join(root, "symlink-record-target");
        fs.writeFileSync(target, "{}\n", { mode: 0o600 });
        fs.symlinkSync(target, file);
      },
      /wc_process_lock_ambiguous_generation|wc_process_lock_record_invalid_file_type/,
    );

    if (process.platform === "linux") {
      await malformedCase(
        "fifo-record",
        (_prior, _generation, file) => {
          execFileSync("mkfifo", [file]);
        },
        /wc_process_lock_ambiguous_generation|wc_process_lock_record_invalid_file_type/,
      );
    }

    await malformedCase(
      "oversized-record",
      (_prior, _generation, file) => {
        fs.writeFileSync(file, "x".repeat(5 * 1024), { mode: 0o600 });
      },
      /wc_process_lock_record_size_invalid/,
    );

    {
      const owner = await acquireWcProcessInstanceLockV1(root, "release-tuple");
      writeJson(owner.released_file, {
        marker: VOID_WC_PROCESS_INSTANCE_LOCK_V1,
        version: 1,
        name: owner.name,
        generation: owner.generation,
        pid: owner.pid,
        process_start_ticks: owner.process_start_ticks,
        boot_id: owner.boot_id,
        owner_nonce: "f".repeat(64),
        released_at_ms: Date.now(),
      });
      await expectCode(
        () => acquireWcProcessInstanceLockV1(root, "release-tuple"),
        /wc_process_lock_release_owner_mismatch/,
      );
      fs.unlinkSync(owner.released_file);
      await releaseWcProcessInstanceLockV1(owner);
    }

    // Release-publication failure is owner-local and bounded. Exact known
    // generations remain self-recoverable, while a new fallback beyond the
    // reviewed process-lifetime cap fails visibly instead of evicting older
    // release truth and silently reintroducing a self-wedge.
    //
    // Use a dedicated authority root. Earlier malformed-record adversaries
    // intentionally leave ambiguous namespaces behind. Open-addressing must
    // fail closed if one of those namespaces appears in a later name's probe
    // set, so reusing that poisoned root would test fixture contamination
    // rather than release-fallback capacity.
    {
      const fallbackRoot = path.join(
        root,
        "release-fallback-proof-root",
      );
      fs.mkdirSync(fallbackRoot, { mode: 0o700 });
      const originalWarn = console.warn;
      try {
        setWcProcessInstanceLockReleasePublicationFaultForProofV1(true);
        console.warn = () => undefined;
        const fallbackNames: string[] = [];
        const fallbackNamespaces = new Set<string>();
        for (let index = 0; fallbackNames.length < 256; index += 1) {
          const candidate = `fallback-${index}`;
          const namespace = wcProcessInstanceLockNamespaceForProofV1(
            fallbackRoot,
            candidate,
          );
          if (fallbackNamespaces.has(namespace)) continue;
          fallbackNamespaces.add(namespace);
          fallbackNames.push(candidate);
          const fallback = await acquireWcProcessInstanceLockV1(
            fallbackRoot,
            candidate,
          );
          await releaseWcProcessInstanceLockV1(fallback);
        }
        assert.equal(
          wcProcessInstanceLockMetricsForProofV1()
            .local_release_namespaces,
          256,
        );

        let overflowName = "";
        for (let index = 0; !overflowName; index += 1) {
          const candidate = `fallback-overflow-${index}`;
          const namespace = wcProcessInstanceLockNamespaceForProofV1(
            fallbackRoot,
            candidate,
          );
          if (!fallbackNamespaces.has(namespace)) overflowName = candidate;
        }
        const overflow = await acquireWcProcessInstanceLockV1(
          fallbackRoot,
          overflowName,
        );
        await expectCode(
          () => releaseWcProcessInstanceLockV1(overflow),
          "wc_process_lock_local_release_capacity_exhausted",
        );
        setWcProcessInstanceLockReleasePublicationFaultForProofV1(false);
        await releaseWcProcessInstanceLockV1(overflow);

        const self = await acquireWcProcessInstanceLockV1(
          fallbackRoot,
          fallbackNames[0],
        );
        assert.ok(self.generation >= 2);
        await releaseWcProcessInstanceLockV1(self);
      } finally {
        setWcProcessInstanceLockReleasePublicationFaultForProofV1(false);
        console.warn = originalWarn;
      }
    }

    const pilotSource = fs.readFileSync(
      path.resolve("src/economic/wc_public_earning_pilot_v1.ts"),
      "utf8",
    );
    const issuanceStart = pilotSource.indexOf(
      "async function acquirePublicClaimIssuanceLockV1(",
    );
    const issuanceEnd = pilotSource.indexOf(
      "\nasync function releasePublicClaimIssuanceLockV1(",
      issuanceStart,
    );
    assert.ok(issuanceStart >= 0 && issuanceEnd > issuanceStart);
    const issuanceSource = pilotSource.slice(issuanceStart, issuanceEnd);
    assert.equal(issuanceSource.includes("process.hrtime.bigint()"), true);
    assert.equal(issuanceSource.includes("Date.now()"), false);
    assert.equal(
      issuanceSource.includes(
        "await releaseWcProcessInstanceLockV1(lock)",
      ),
      true,
    );

    const workflowSource = fs.readFileSync(
      path.resolve(".github/workflows/wc-public-ticket-claim-v1.yml"),
      "utf8",
    );
    for (const required of [
      '"src/economic/wc_process_instance_lock_v1.ts"',
      '"scripts/prove_wc_process_instance_lock_v1.ts"',
      "npx tsx scripts/prove_wc_process_instance_lock_v1.ts",
    ]) {
      assert.equal(workflowSource.includes(required), true, required);
    }

    console.log("VOID_WC_PROCESS_INSTANCE_LOCK_V1_GREEN");
    console.log("age_based_live_owner_eviction=false");
    console.log("dead_owner_generation_advanced=true");
    console.log("authoritative_lock_owner_pid_terminated=true");
    console.log("procfs_esrch_owner_disappearance_handled=true");
    console.log("pid_reuse_generation_advanced=true");
    console.log("boot_epoch_bound=true");
    console.log("zombie_process_state_ineligible=true");
    console.log("dead_process_state_ineligible=true");
    console.log("lock_namespace_shards_bounded=true");
    console.log("unrelated_history_scan_bounded=true");
    console.log("colliding_live_lock_names_isolated=true");
    console.log("adversarial_lock_fixture_roots_isolated=true");
    console.log("turnover_generation_rescanned=true");
    console.log("strict_lock_record_schema=true");
    console.log("strict_release_owner_tuple=true");
    console.log("lock_record_no_follow=true");
    console.log("lock_record_byte_cap=true");
    console.log("post_link_publication_self_wedge=false");
    console.log("dead_publication_temp_reclaimed=true");
    console.log("live_publication_temp_preserved=true");
    console.log("bounded_directory_iteration=true");
    console.log("release_failure_self_wedge=false");
    console.log("local_release_memory_bounded=true");
    console.log("local_release_overflow_fails_closed=true");
    console.log("issuance_wait_monotonic=true");
    console.log("workflow_binds_process_lock=true");
  } finally {
    setWcProcessInstanceLockBeforeRecordReadHookForProofV1(null);
    setWcProcessInstanceLockPublicationSyncFailuresForProofV1(0);
    setWcProcessInstanceLockReleasePublicationFaultForProofV1(false);
    fs.rmSync(root, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error?.stack || String(error));
  process.exit(1);
});
