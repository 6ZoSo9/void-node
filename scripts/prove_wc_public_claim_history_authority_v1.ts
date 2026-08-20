import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

function configure(tmp: string): void {
  process.env.DATA_DIR = tmp;
  process.env.VOID_DATA_DIR = tmp;
  process.env.VOID_WC_PUBLIC_EARNING_PILOT_ENABLED = "1";
  process.env.VOID_WC_PUBLIC_TICKET_CLAIM_ENABLED = "1";
  process.env.VOID_WC_PUBLIC_TICKET_CLAIM_DATASET_ID =
    "ds_public_claim_history_authority_v1";
  process.env.VOID_WC_PUBLIC_TICKET_CLAIM_EXPECTED_INPUT_HASH =
    "9".repeat(64);
  process.env.VOID_WC_PUBLIC_TICKET_CLAIM_TTL_MS = "300000";
  process.env.VOID_WC_PUBLIC_TICKET_CLAIM_CLOCK_SKEW_MS = "300000";
  process.env.VOID_WC_PUBLIC_TICKET_CLAIM_COOLDOWN_MS = "60000";
  process.env.VOID_WC_PUBLIC_TICKET_CLAIM_MAX_PER_24H = "10";
  process.env.VOID_WC_PUBLIC_TICKET_CLAIM_GLOBAL_ACTIVE_CAP = "10";
  process.env.VOID_WC_PUBLIC_TICKET_CLAIM_GLOBAL_MAX_PER_24H = "100";
  process.env.VOID_WC_PUBLIC_EARNING_PILOT_PER_ACCOUNT_CAP = "1";
  process.env.VOID_WC_PUBLIC_EARNING_PILOT_GLOBAL_CAP = "100000";
}

function pilotRoot(tmp: string): string {
  return path.join(
    tmp,
    "wc_v1",
    "public-earning-pilot-v1",
  );
}

function ensureHistoryDirs(tmp: string): {
  issued: string;
  consumed: string;
  claims: string;
} {
  const root = pilotRoot(tmp);
  const result = {
    issued: path.join(root, "issued"),
    consumed: path.join(root, "consumed"),
    claims: path.join(root, "public-claims"),
  };
  for (const dir of Object.values(result)) {
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  }
  return result;
}

function replaceHistoryRecordCanonically(
  authority: any,
  file: string,
  content: string | Buffer,
): void {
  const bytes = Buffer.isBuffer(content)
    ? content
    : Buffer.from(content, "utf8");
  const tmp = `${file}.proof-replace-${process.pid}-${Math.random()
    .toString(16)
    .slice(2)}`;
  let fd: number | null = null;
  try {
    fd = fs.openSync(tmp, "wx", 0o600);
    const written = fs.writeSync(
      fd,
      bytes,
      0,
      bytes.length,
      null,
    );
    assert.equal(written, bytes.length);
    fs.fdatasyncSync(fd);
    fs.closeSync(fd);
    fd = null;

    authority.publishWcPublicClaimHistoryMutationForFileV1(
      file,
    );
    fs.renameSync(tmp, file);

    const dirFd = fs.openSync(path.dirname(file), "r");
    try {
      fs.fsyncSync(dirFd);
    } finally {
      fs.closeSync(dirFd);
    }
  } finally {
    if (fd !== null) {
      try {
        fs.closeSync(fd);
      } catch (closeError) {
        void closeError;
      }
    }
    try {
      fs.unlinkSync(tmp);
    } catch (error: any) {
      if (String(error?.code || "") !== "ENOENT") {
        throw error;
      }
    }
  }
}

function hex(value: number, width: number): string {
  return value
    .toString(16)
    .padStart(width, "0")
    .slice(-width);
}

function dirStamp(dir: string): {
  ino: string;
  mtime_ns: string;
  ctime_ns: string;
} {
  const stat: any = fs.statSync(
    dir,
    { bigint: true } as any,
  );
  return {
    ino: String(stat.ino),
    mtime_ns: String(stat.mtimeNs),
    ctime_ns: String(stat.ctimeNs),
  };
}

async function main(): Promise<void> {
  const authority = await import(
    "../src/economic/wc_public_claim_history_authority_v1.js"
  );
  const pilot = await import(
    "../src/economic/wc_public_earning_pilot_v1.js"
  );
  const block = await import("../src/chain/block.js");
  const stateDirectoryAuthority = await import(
    "../src/economic/wc_public_state_directory_authority_v1.js"
  );

  {
    const tmp = fs.mkdtempSync(
      path.join(
        os.tmpdir(),
        "void-public-claim-history-large-v1-",
      ),
    );
    configure(tmp);
    const d = ensureHistoryDirs(tmp);

    const account = "history-target-account";
    const executor = "a".repeat(32);
    const now = Date.now();

    for (let i = 1; i <= 1200; i += 1) {
      const ticketId = hex(i, 32);
      fs.writeFileSync(
        path.join(d.consumed, `${ticketId}.json`),
        JSON.stringify({
          marker: "VOID_WC_PUBLIC_EARNING_PILOT_V1",
          version: 1,
          ticket_id: ticketId,
          account:
            i % 17 === 0
              ? account
              : `history-account-${i % 89}`,
          executor_node_id:
            i % 19 === 0
              ? executor
              : hex(i + 5000, 32),
          expires_at_ms: now + 60_000,
          status: "completed",
        }) + "\n",
        { mode: 0o600 },
      );
    }

    for (let i = 1; i <= 1200; i += 1) {
      const claimId = hex(i + 100_000, 64);
      fs.writeFileSync(
        path.join(d.claims, `${claimId}.json`),
        JSON.stringify({
          marker: "VOID_WC_PUBLIC_TICKET_CLAIM_V1",
          version: 1,
          claim_id: claimId,
          status: "issued",
          issued_at_ms:
            i === 1200
              ? now - 30_000
              : now -
                3 * 24 * 60 * 60_000 -
                i,
          account:
            i === 1200
              ? account
              : `claim-account-${i % 97}`,
          executor_node_id:
            i === 1200
              ? executor
              : hex(i + 9000, 32),
        }) + "\n",
        { mode: 0o600 },
      );
    }

    let timerTicks = 0;
    const timer = setInterval(() => {
      timerTicks += 1;
    }, 1);

    authority.primeWcPublicClaimHistoryAuthorityV1(tmp);
    await authority.waitForWcPublicClaimHistoryWarmForProofV1(
      tmp,
    );
    clearInterval(timer);

    assert.ok(
      timerTicks > 0,
      "large history warm monopolized event loop",
    );

    const decisionMetricsBefore =
      authority.wcPublicClaimHistoryDecisionMetricsForProofV1(
        tmp,
      );
    const concurrentDecisions = 32;
    await Promise.all(
      Array.from(
        { length: concurrentDecisions },
        () =>
          authority.prepareWcPublicClaimHistoryDecisionV1(
            tmp,
          ),
      ),
    );
    const decisionMetricsAfter =
      authority.wcPublicClaimHistoryDecisionMetricsForProofV1(
        tmp,
      );
    assert.equal(
      decisionMetricsAfter.decision_checks_total -
        decisionMetricsBefore.decision_checks_total,
      concurrentDecisions,
    );
    assert.equal(
      decisionMetricsAfter.mutation_generation_reads_total -
        decisionMetricsBefore.mutation_generation_reads_total,
      concurrentDecisions,
    );
    assert.ok(
      decisionMetricsAfter.record_generation_stats_total -
        decisionMetricsBefore.record_generation_stats_total >=
        2400,
      "exact record-generation barrier did not cover warmed history",
    );

    const snapshot =
      authority.wcPublicClaimHistorySnapshotV1(
        tmp,
        now,
        account,
        executor,
        300_000,
      );

    assert.equal(snapshot.consumed, 1200);
    assert.equal(snapshot.active, 0);
    assert.equal(snapshot.account_24h, 1);
    assert.equal(snapshot.executor_24h, 1);
    assert.equal(
      snapshot.synchronous_history_files_read,
      0,
    );
    assert.ok(snapshot.scanned_files_at_warm >= 2400);

    const originalReaddirSync = fs.readdirSync;
    const originalReadFileSync = fs.readFileSync;
    let forbiddenHistoryReads = 0;

    (fs as any).readdirSync = function (...args: any[]) {
      const target = String(args[0] || "");
      if (
        target.includes("/consumed") ||
        target.includes("/public-claims")
      ) {
        forbiddenHistoryReads += 1;
      }
      return (originalReaddirSync as any)(...args);
    };
    (fs as any).readFileSync = function (...args: any[]) {
      const target = String(args[0] || "");
      if (
        target.includes("/consumed/") ||
        target.includes("/public-claims/")
      ) {
        forbiddenHistoryReads += 1;
      }
      return (originalReadFileSync as any)(...args);
    };

    try {
      const status = pilot.publicStatusForProofV1(
        account,
        tmp,
      );
      assert.equal(status.ok, true);
      assert.equal(status.caps.consumed, 1200);
      assert.equal(
        status.caps.synchronous_history_files_read,
        0,
      );
    } finally {
      (fs as any).readdirSync = originalReaddirSync;
      (fs as any).readFileSync = originalReadFileSync;
    }

    assert.equal(
      forbiddenHistoryReads,
      0,
      "status request synchronously walked retained history",
    );

    console.log(
      `large_history_event_loop_timer_ticks=${timerTicks}`,
    );
    fs.rmSync(tmp, { recursive: true, force: true });
  }

  {
    const tmp = fs.mkdtempSync(
      path.join(
        os.tmpdir(),
        "void-public-claim-history-active-v1-",
      ),
    );
    configure(tmp);
    const d = ensureHistoryDirs(tmp);

    const { privateKey, publicKey } =
      crypto.generateKeyPairSync("ed25519");
    const pubPEM = publicKey
      .export({ type: "spki", format: "pem" })
      .toString();
    const executor = block.nodeIdFromPubPEM(pubPEM);
    const account = "active-history-account";
    const now = Date.now();
    const activeTicketId = "d".repeat(32);

    fs.writeFileSync(
      path.join(d.issued, `${activeTicketId}.json`),
      JSON.stringify({
        marker: "VOID_WC_PUBLIC_EARNING_PILOT_V1",
        version: 1,
        ticket_id: activeTicketId,
        account,
        executor_node_id: executor,
        expires_at_ms: now + 300_000,
        status: "issued",
      }) + "\n",
      { mode: 0o600 },
    );

    authority.resetWcPublicClaimHistoryAuthorityForProofV1(
      tmp,
    );
    authority.primeWcPublicClaimHistoryAuthorityV1(tmp);
    await authority.waitForWcPublicClaimHistoryWarmForProofV1(
      tmp,
    );

    const signed = pilot.signPublicTicketClaim(
      {
        domain: "void:mainnet-0:wc-public-ticket-claim-v1",
        marker: "VOID_WC_PUBLIC_TICKET_CLAIM_V1",
        version: 1,
        account,
        executor_node_id: executor,
        executor_pubkey: pubPEM,
        claim_nonce: "1".repeat(32),
        claim_ts_ms: now,
      },
      privateKey,
    );

    const originalReaddirSync = fs.readdirSync;
    const originalReadFileSync = fs.readFileSync;
    let forbiddenHistoryReads = 0;

    (fs as any).readdirSync = function (...args: any[]) {
      const target = String(args[0] || "");
      if (
        target.includes("/consumed") ||
        target.includes("/public-claims")
      ) {
        forbiddenHistoryReads += 1;
      }
      return (originalReaddirSync as any)(...args);
    };
    (fs as any).readFileSync = function (...args: any[]) {
      const target = String(args[0] || "");
      if (
        target.includes("/consumed/") ||
        target.includes("/public-claims/")
      ) {
        forbiddenHistoryReads += 1;
      }
      return (originalReadFileSync as any)(...args);
    };

    try {
      await assert.rejects(
        () =>
          pilot.issuePublicTicketClaim(
            signed,
            tmp,
            now,
          ),
        /public_claim_account_active/,
      );
    } finally {
      (fs as any).readdirSync = originalReaddirSync;
      (fs as any).readFileSync = originalReadFileSync;
    }

    assert.equal(
      forbiddenHistoryReads,
      0,
      "claim cap decision synchronously walked retained history",
    );

    fs.rmSync(tmp, { recursive: true, force: true });
  }

  {
    const tmp = fs.mkdtempSync(
      path.join(
        os.tmpdir(),
        "void-public-claim-history-malformed-v1-",
      ),
    );
    configure(tmp);
    const d = ensureHistoryDirs(tmp);

    fs.writeFileSync(
      path.join(
        d.consumed,
        `${"e".repeat(32)}.json`,
      ),
      "{broken\n",
      { mode: 0o600 },
    );

    authority.resetWcPublicClaimHistoryAuthorityForProofV1(
      tmp,
    );
    authority.primeWcPublicClaimHistoryAuthorityV1(tmp);

    await assert.rejects(
      () =>
        authority.waitForWcPublicClaimHistoryWarmForProofV1(
          tmp,
        ),
      /VOID_WC_PUBLIC_CLAIM_HISTORY_INVALID/,
    );

    assert.throws(
      () =>
        authority.wcPublicClaimHistorySnapshotV1(
          tmp,
          Date.now(),
        ),
      /VOID_WC_PUBLIC_CLAIM_HISTORY_INVALID/,
    );

    fs.rmSync(tmp, { recursive: true, force: true });
  }


  {
    const tmp = fs.mkdtempSync(
      path.join(
        os.tmpdir(),
        "void-public-claim-history-record-generation-v1-",
      ),
    );
    configure(tmp);
    const d = ensureHistoryDirs(tmp);
    const now = Date.now();

    const ticketId = "a".repeat(32);
    const accountA = "record-account-a";
    const accountB = "record-account-b";
    const executor = "b".repeat(32);
    const issuedFile = path.join(
      d.issued,
      `${ticketId}.json`,
    );

    function ticketRecord(account: string): string {
      return (
        JSON.stringify({
          marker: "VOID_WC_PUBLIC_EARNING_PILOT_V1",
          version: 1,
          ticket_id: ticketId,
          account,
          executor_node_id: executor,
          expires_at_ms: now + 300_000,
          status: "issued",
        }) + "\n"
      );
    }

    const ticketA = ticketRecord(accountA);
    const ticketB = ticketRecord(accountB);
    assert.equal(
      Buffer.byteLength(ticketA),
      Buffer.byteLength(ticketB),
      "record-generation adversary must preserve byte length",
    );
    fs.writeFileSync(
      issuedFile,
      ticketA,
      { mode: 0o600 },
    );

    const claimId = "c".repeat(64);
    const claimA = "claim-account-a";
    const claimB = "claim-account-b";
    const claimFile = path.join(
      d.claims,
      `${claimId}.json`,
    );

    function claimRecord(account: string): string {
      return (
        JSON.stringify({
          marker: "VOID_WC_PUBLIC_TICKET_CLAIM_V1",
          version: 1,
          claim_id: claimId,
          status: "issued",
          issued_at_ms: now - 30_000,
          account,
          executor_node_id: executor,
        }) + "\n"
      );
    }

    const claimTextA = claimRecord(claimA);
    const claimTextB = claimRecord(claimB);
    assert.equal(
      Buffer.byteLength(claimTextA),
      Buffer.byteLength(claimTextB),
      "claim-generation adversary must preserve byte length",
    );
    fs.writeFileSync(
      claimFile,
      claimTextA,
      { mode: 0o600 },
    );

    authority.resetWcPublicClaimHistoryAuthorityForProofV1(
      tmp,
    );
    authority.primeWcPublicClaimHistoryAuthorityV1(
      tmp,
    );
    await authority.waitForWcPublicClaimHistoryWarmForProofV1(
      tmp,
    );

    let snapshot =
      authority.wcPublicClaimHistorySnapshotV1(
        tmp,
        now,
        accountA,
        executor,
        300_000,
      );
    assert.equal(snapshot.active_account, 1);

    const issuedDirBefore = dirStamp(d.issued);
    replaceHistoryRecordCanonically(
      authority,
      issuedFile,
      ticketB,
    );
    const issuedDirAfter = dirStamp(d.issued);
    assert.notDeepEqual(
      issuedDirAfter,
      issuedDirBefore,
      "canonical issued-record replacement did not change parent directory stamp",
    );
    assert.throws(
      () =>
        authority.wcPublicClaimHistorySnapshotV1(
          tmp,
          now,
          accountA,
          executor,
          300_000,
        ),
      /VOID_WC_PUBLIC_CLAIM_HISTORY_WARMING/,
    );
    await authority.waitForWcPublicClaimHistoryWarmForProofV1(
      tmp,
    );
    snapshot =
      authority.wcPublicClaimHistorySnapshotV1(
        tmp,
        now,
        accountA,
        executor,
        300_000,
      );
    assert.equal(snapshot.active_account, 0);
    assert.equal(
      authority.wcPublicClaimHistorySnapshotV1(
        tmp,
        now,
        accountB,
        executor,
        300_000,
      ).active_account,
      1,
    );

    const claimsDirBefore = dirStamp(d.claims);
    replaceHistoryRecordCanonically(
      authority,
      claimFile,
      claimTextB,
    );
    const claimsDirAfter = dirStamp(d.claims);
    assert.notDeepEqual(
      claimsDirAfter,
      claimsDirBefore,
      "canonical claim replacement did not change parent directory stamp",
    );
    assert.throws(
      () =>
        authority.wcPublicClaimHistorySnapshotV1(
          tmp,
          now,
          claimA,
          executor,
          300_000,
        ),
      /VOID_WC_PUBLIC_CLAIM_HISTORY_WARMING/,
    );
    await authority.waitForWcPublicClaimHistoryWarmForProofV1(
      tmp,
    );
    assert.equal(
      authority.wcPublicClaimHistorySnapshotV1(
        tmp,
        now,
        claimA,
        executor,
        300_000,
      ).account_24h,
      0,
    );
    assert.equal(
      authority.wcPublicClaimHistorySnapshotV1(
        tmp,
        now,
        claimB,
        executor,
        300_000,
      ).account_24h,
      1,
    );

    const issuedDirBeforeMalformed =
      dirStamp(d.issued);
    replaceHistoryRecordCanonically(
      authority,
      issuedFile,
      "{broken\n",
    );
    assert.notDeepEqual(
      dirStamp(d.issued),
      issuedDirBeforeMalformed,
      "valid-to-malformed canonical replacement did not change parent directory stamp",
    );
    assert.throws(
      () =>
        authority.wcPublicClaimHistorySnapshotV1(
          tmp,
          now,
          accountB,
          executor,
          300_000,
        ),
      /VOID_WC_PUBLIC_CLAIM_HISTORY_WARMING/,
    );
    await assert.rejects(
      () =>
        authority.waitForWcPublicClaimHistoryWarmForProofV1(
          tmp,
        ),
      /VOID_WC_PUBLIC_CLAIM_HISTORY_INVALID/,
    );
    assert.throws(
      () =>
        authority.wcPublicClaimHistorySnapshotV1(
          tmp,
          now,
          accountB,
          executor,
          300_000,
        ),
      /VOID_WC_PUBLIC_CLAIM_HISTORY_INVALID/,
    );

    fs.rmSync(tmp, {
      recursive: true,
      force: true,
    });
  }

  // Cache reuse must remain bound to the exact immediate-parent generation
  // whose child link crossed fsync. Reparenting the exact cached child inode
  // into a fresh, unsynced parent must not inherit old durability authority.
  {
    const tmp = fs.mkdtempSync(
      path.join(
        os.tmpdir(),
        "void-public-state-cached-child-reparent-v1-",
      ),
    );
    const parent = path.join(
      tmp,
      "wc_v1",
      "public-earning-pilot-v1",
    );
    const target = path.join(parent, "issued");
    const displaced = `${parent}.displaced`;

    stateDirectoryAuthority.ensureWcPublicStateDurableDirectoryV1(
      target,
      tmp,
    );
    const childBefore: any = fs.statSync(
      target,
      { bigint: true } as any,
    );
    const parentBefore: any = fs.statSync(
      parent,
      { bigint: true } as any,
    );

    fs.renameSync(parent, displaced);
    fs.mkdirSync(parent, { mode: 0o700 });
    fs.renameSync(
      path.join(displaced, "issued"),
      target,
    );

    const childAfter: any = fs.statSync(
      target,
      { bigint: true } as any,
    );
    const parentAfter: any = fs.statSync(
      parent,
      { bigint: true } as any,
    );
    assert.equal(String(childAfter.ino), String(childBefore.ino));
    assert.notEqual(String(parentAfter.ino), String(parentBefore.ino));
    assert.throws(
      () =>
        stateDirectoryAuthority.ensureWcPublicStateDurableDirectoryV1(
          target,
          tmp,
        ),
      /wc_public_state_directory_parent_generation_changed/,
    );

    fs.rmSync(tmp, { recursive: true, force: true });
  }

  {
    const tmp = fs.mkdtempSync(
      path.join(
        os.tmpdir(),
        "void-public-claim-history-stat-read-race-v1-",
      ),
    );
    configure(tmp);
    const d = ensureHistoryDirs(tmp);
    const now = Date.now();
    const ticketId = "d".repeat(32);
    const executor = "e".repeat(32);
    const accountA = "race-account-a";
    const accountB = "race-account-b";
    const file = path.join(
      d.issued,
      `${ticketId}.json`,
    );

    function record(account: string): string {
      return (
        JSON.stringify({
          marker: "VOID_WC_PUBLIC_EARNING_PILOT_V1",
          version: 1,
          ticket_id: ticketId,
          account,
          executor_node_id: executor,
          expires_at_ms: now + 300_000,
          status: "issued",
        }) + "\n"
      );
    }

    const first = record(accountA);
    const second = record(accountB);
    assert.equal(
      Buffer.byteLength(first),
      Buffer.byteLength(second),
    );
    fs.writeFileSync(
      file,
      first,
      { mode: 0o600 },
    );

    authority.resetWcPublicClaimHistoryAuthorityForProofV1(
      tmp,
    );

    let injected = false;
    authority.setWcPublicClaimHistoryBeforeRecordReadHookForProofV1(
      async (target: string, label: string) => {
        if (
          injected ||
          target !== file ||
          label !== "issued_ticket_history"
        ) {
          return;
        }
        injected = true;
        fs.writeFileSync(
          file,
          second,
          { mode: 0o600 },
        );
      },
    );

    try {
      authority.primeWcPublicClaimHistoryAuthorityV1(
        tmp,
      );
      await authority.waitForWcPublicClaimHistoryWarmForProofV1(
        tmp,
      );
    } finally {
      authority.setWcPublicClaimHistoryBeforeRecordReadHookForProofV1(
        null,
      );
    }

    assert.equal(injected, true);
    assert.equal(
      authority.wcPublicClaimHistorySnapshotV1(
        tmp,
        now,
        accountA,
        executor,
        300_000,
      ).active_account,
      0,
    );
    assert.equal(
      authority.wcPublicClaimHistorySnapshotV1(
        tmp,
        now,
        accountB,
        executor,
        300_000,
      ).active_account,
      1,
    );

    fs.rmSync(tmp, {
      recursive: true,
      force: true,
    });
  }

  // Durable consumed truth dominates a stale same-ID issued projection.
  // A distinct issued ticket must remain active as a positive control.
  {
    const tmp = fs.mkdtempSync(
      path.join(
        os.tmpdir(),
        "void-public-claim-history-consumed-dominates-issued-v1-",
      ),
    );
    configure(tmp);
    const d = ensureHistoryDirs(tmp);
    const now = Date.now();
    const account = "consumed-dominates-issued-account";
    const executor = "f".repeat(32);
    const consumedTicketId = "1".repeat(32);
    const otherIssuedTicketId = "2".repeat(32);

    const ticketRecord = (
      ticketId: string,
      status: "issued" | "completed",
    ) => ({
      marker: "VOID_WC_PUBLIC_EARNING_PILOT_V1",
      version: 1,
      ticket_id: ticketId,
      account,
      executor_node_id: executor,
      expires_at_ms: now + 300_000,
      status,
    });

    fs.writeFileSync(
      path.join(
        d.issued,
        `${consumedTicketId}.json`,
      ),
      JSON.stringify(
        ticketRecord(consumedTicketId, "issued"),
      ) + "\n",
      { mode: 0o600 },
    );
    fs.writeFileSync(
      path.join(
        d.consumed,
        `${consumedTicketId}.json`,
      ),
      JSON.stringify(
        ticketRecord(consumedTicketId, "completed"),
      ) + "\n",
      { mode: 0o600 },
    );
    fs.writeFileSync(
      path.join(
        d.issued,
        `${otherIssuedTicketId}.json`,
      ),
      JSON.stringify(
        ticketRecord(otherIssuedTicketId, "issued"),
      ) + "\n",
      { mode: 0o600 },
    );

    authority.resetWcPublicClaimHistoryAuthorityForProofV1(
      tmp,
    );
    authority.primeWcPublicClaimHistoryAuthorityV1(tmp);
    await authority.waitForWcPublicClaimHistoryWarmForProofV1(
      tmp,
    );

    let snapshot =
      authority.wcPublicClaimHistorySnapshotV1(
        tmp,
        now,
        account,
        executor,
        300_000,
      );
    assert.equal(snapshot.consumed, 1);
    assert.equal(snapshot.active, 1);
    assert.equal(snapshot.active_account, 1);
    assert.equal(snapshot.active_executor, 1);

    // Remove the unrelated active control. The stale issued residue for the
    // consumed ticket remains on disk; a fresh restart-style warm must still
    // report zero active capacity.
    fs.unlinkSync(
      path.join(
        d.issued,
        `${otherIssuedTicketId}.json`,
      ),
    );
    authority.resetWcPublicClaimHistoryAuthorityForProofV1(
      tmp,
    );
    authority.primeWcPublicClaimHistoryAuthorityV1(tmp);
    await authority.waitForWcPublicClaimHistoryWarmForProofV1(
      tmp,
    );

    snapshot =
      authority.wcPublicClaimHistorySnapshotV1(
        tmp,
        now,
        account,
        executor,
        300_000,
      );
    assert.equal(snapshot.consumed, 1);
    assert.equal(snapshot.active, 0);
    assert.equal(snapshot.active_account, 0);
    assert.equal(snapshot.active_executor, 0);
    assert.equal(
      fs.existsSync(
        path.join(
          d.issued,
          `${consumedTicketId}.json`,
        ),
      ),
      true,
      "proof must retain stale issued residue",
    );

    // Model the issued entry disappearing and reappearing after a restart:
    // consumed authority must still dominate on the next full warm.
    const residueFile = path.join(
      d.issued,
      `${consumedTicketId}.json`,
    );
    const residue = fs.readFileSync(
      residueFile,
      "utf8",
    );
    fs.unlinkSync(residueFile);
    authority.resetWcPublicClaimHistoryAuthorityForProofV1(
      tmp,
    );
    authority.primeWcPublicClaimHistoryAuthorityV1(tmp);
    await authority.waitForWcPublicClaimHistoryWarmForProofV1(
      tmp,
    );
    fs.writeFileSync(
      residueFile,
      residue,
      { mode: 0o600 },
    );
    authority.resetWcPublicClaimHistoryAuthorityForProofV1(
      tmp,
    );
    authority.primeWcPublicClaimHistoryAuthorityV1(tmp);
    await authority.waitForWcPublicClaimHistoryWarmForProofV1(
      tmp,
    );

    snapshot =
      authority.wcPublicClaimHistorySnapshotV1(
        tmp,
        now,
        account,
        executor,
        300_000,
      );
    assert.equal(snapshot.active, 0);
    assert.equal(snapshot.active_account, 0);
    assert.equal(snapshot.active_executor, 0);

    fs.rmSync(tmp, {
      recursive: true,
      force: true,
    });
  }

  // A normal consume transition can remove issued/<T> after readdir()
  // but before the warm opens that pathname. That is generation churn, not
  // malformed authority: retry the warm and converge to consumed truth.
  {
    const tmp = fs.mkdtempSync(
      path.join(
        os.tmpdir(),
        "void-public-claim-history-remove-before-open-v1-",
      ),
    );
    configure(tmp);
    const d = ensureHistoryDirs(tmp);
    const now = Date.now();
    const ticketId = "3".repeat(32);
    const account = "remove-before-open-account";
    const executor = "4".repeat(32);
    const issuedFile = path.join(
      d.issued,
      `${ticketId}.json`,
    );
    const consumedFile = path.join(
      d.consumed,
      `${ticketId}.json`,
    );

    const baseTicket = {
      marker: "VOID_WC_PUBLIC_EARNING_PILOT_V1",
      version: 1,
      ticket_id: ticketId,
      account,
      executor_node_id: executor,
      expires_at_ms: now + 300_000,
    };

    fs.writeFileSync(
      issuedFile,
      JSON.stringify({
        ...baseTicket,
        status: "issued",
      }) + "\n",
      { mode: 0o600 },
    );

    authority.resetWcPublicClaimHistoryAuthorityForProofV1(
      tmp,
    );

    let injected = false;
    authority.setWcPublicClaimHistoryBeforeRecordOpenHookForProofV1(
      async (target: string, label: string) => {
        if (
          injected ||
          target !== issuedFile ||
          label !== "issued_ticket_history"
        ) {
          return;
        }
        injected = true;
        fs.writeFileSync(
          consumedFile,
          JSON.stringify({
            ...baseTicket,
            status: "completed",
            completed_at_ms: now,
          }) + "\n",
          { mode: 0o600 },
        );
        fs.unlinkSync(issuedFile);
      },
    );

    try {
      authority.primeWcPublicClaimHistoryAuthorityV1(
        tmp,
      );
      await authority.waitForWcPublicClaimHistoryWarmForProofV1(
        tmp,
      );
    } finally {
      authority.setWcPublicClaimHistoryBeforeRecordOpenHookForProofV1(
        null,
      );
    }

    assert.equal(injected, true);
    const snapshot =
      authority.wcPublicClaimHistorySnapshotV1(
        tmp,
        now,
        account,
        executor,
        300_000,
      );
    assert.equal(snapshot.consumed, 1);
    assert.equal(snapshot.active, 0);
    assert.equal(snapshot.active_account, 0);
    assert.equal(snapshot.active_executor, 0);
    assert.equal(fs.existsSync(issuedFile), false);
    assert.equal(fs.existsSync(consumedFile), true);

    fs.rmSync(tmp, {
      recursive: true,
      force: true,
    });
  }

  // Durability-authoritative policy numerics are exact JSON numerics:
  // no Number(...) coercion, booleans, arrays, strings, fractions, or unsafe
  // integer timestamps may enter active/cooldown/daily authority.
  {
    const now = Date.now();

    type InvalidHistoryCase = {
      label: string;
      kind: "issued" | "consumed" | "claim";
      record: Record<string, any>;
    };

    const baseTicket = (
      ticketId: string,
    ): Record<string, any> => ({
      marker: "VOID_WC_PUBLIC_EARNING_PILOT_V1",
      version: 1,
      ticket_id: ticketId,
      account: "numeric-schema-account",
      executor_node_id: "5".repeat(32),
      expires_at_ms: now + 300_000,
      status: "issued",
    });

    const baseClaim = (
      claimId: string,
    ): Record<string, any> => ({
      marker: "VOID_WC_PUBLIC_TICKET_CLAIM_V1",
      version: 1,
      claim_id: claimId,
      status: "issued",
      issued_at_ms: now - 30_000,
      account: "numeric-schema-account",
      executor_node_id: "5".repeat(32),
    });

    const cases: InvalidHistoryCase[] = [
      {
        label: "issued-version-string",
        kind: "issued",
        record: {
          ...baseTicket("6".repeat(32)),
          version: "1",
        },
      },
      {
        label: "issued-version-boolean",
        kind: "issued",
        record: {
          ...baseTicket("7".repeat(32)),
          version: true,
        },
      },
      {
        label: "issued-version-array",
        kind: "issued",
        record: {
          ...baseTicket("8".repeat(32)),
          version: [1],
        },
      },
      {
        label: "issued-expiry-string",
        kind: "issued",
        record: {
          ...baseTicket("9".repeat(32)),
          expires_at_ms: String(now + 300_000),
        },
      },
      {
        label: "issued-expiry-array",
        kind: "issued",
        record: {
          ...baseTicket("a".repeat(32)),
          expires_at_ms: [now + 300_000],
        },
      },
      {
        label: "issued-expiry-fraction",
        kind: "issued",
        record: {
          ...baseTicket("b".repeat(32)),
          expires_at_ms: now + 300_000.5,
        },
      },
      {
        label: "issued-expiry-unsafe",
        kind: "issued",
        record: {
          ...baseTicket("c".repeat(32)),
          expires_at_ms: Number.MAX_SAFE_INTEGER + 1,
        },
      },
      {
        label: "consumed-expiry-string",
        kind: "consumed",
        record: {
          ...baseTicket("d".repeat(32)),
          status: "completed",
          expires_at_ms: String(now + 300_000),
        },
      },
      {
        label: "consumed-version-boolean",
        kind: "consumed",
        record: {
          ...baseTicket("e".repeat(32)),
          status: "completed",
          version: true,
        },
      },
      {
        label: "claim-version-string",
        kind: "claim",
        record: {
          ...baseClaim("6".repeat(64)),
          version: "1",
        },
      },
      {
        label: "claim-version-boolean",
        kind: "claim",
        record: {
          ...baseClaim("7".repeat(64)),
          version: true,
        },
      },
      {
        label: "claim-version-array",
        kind: "claim",
        record: {
          ...baseClaim("8".repeat(64)),
          version: [1],
        },
      },
      {
        label: "claim-issued-at-string",
        kind: "claim",
        record: {
          ...baseClaim("9".repeat(64)),
          issued_at_ms: String(now - 30_000),
        },
      },
      {
        label: "claim-issued-at-array",
        kind: "claim",
        record: {
          ...baseClaim("a".repeat(64)),
          issued_at_ms: [now - 30_000],
        },
      },
      {
        label: "claim-issued-at-fraction",
        kind: "claim",
        record: {
          ...baseClaim("b".repeat(64)),
          issued_at_ms: now - 30_000 + 0.5,
        },
      },
      {
        label: "claim-issued-at-unsafe",
        kind: "claim",
        record: {
          ...baseClaim("c".repeat(64)),
          issued_at_ms: Number.MAX_SAFE_INTEGER + 1,
        },
      },
      {
        label: "reserving-version-string",
        kind: "claim",
        record: {
          ...baseClaim("d".repeat(64)),
          status: "reserving",
          version: "1",
        },
      },
    ];

    for (const testCase of cases) {
      const tmp = fs.mkdtempSync(
        path.join(
          os.tmpdir(),
          `void-public-claim-history-numeric-${testCase.label}-`,
        ),
      );
      configure(tmp);
      const d = ensureHistoryDirs(tmp);
      const id = String(
        testCase.record.ticket_id ||
          testCase.record.claim_id,
      );
      const dir =
        testCase.kind === "issued"
          ? d.issued
          : testCase.kind === "consumed"
            ? d.consumed
            : d.claims;
      fs.writeFileSync(
        path.join(dir, `${id}.json`),
        JSON.stringify(testCase.record) + "\n",
        { mode: 0o600 },
      );

      authority.resetWcPublicClaimHistoryAuthorityForProofV1(
        tmp,
      );
      authority.primeWcPublicClaimHistoryAuthorityV1(tmp);

      await assert.rejects(
        () =>
          authority.waitForWcPublicClaimHistoryWarmForProofV1(
            tmp,
          ),
        /VOID_WC_PUBLIC_CLAIM_HISTORY_INVALID/,
        testCase.label,
      );
      assert.throws(
        () =>
          authority.wcPublicClaimHistorySnapshotV1(
            tmp,
            now,
          ),
        /VOID_WC_PUBLIC_CLAIM_HISTORY_INVALID/,
        testCase.label,
      );

      authority.resetWcPublicClaimHistoryAuthorityForProofV1(
        tmp,
      );
      fs.rmSync(tmp, {
        recursive: true,
        force: true,
      });
    }

    // Fail-closed history must stop a new public capability from being
    // published, not merely make the background proof fail.
    for (const kind of ["issued", "claim"] as const) {
      const tmp = fs.mkdtempSync(
        path.join(
          os.tmpdir(),
          `void-public-claim-history-numeric-issue-gate-${kind}-`,
        ),
      );
      configure(tmp);
      const d = ensureHistoryDirs(tmp);
      const { privateKey, publicKey } =
        crypto.generateKeyPairSync("ed25519");
      const pubPEM = publicKey
        .export({
          type: "spki",
          format: "pem",
        })
        .toString();
      const executor =
        block.nodeIdFromPubPEM(pubPEM);
      const account =
        `numeric-issue-gate-${kind}`;

      if (kind === "issued") {
        const badTicketId = "e".repeat(32);
        fs.writeFileSync(
          path.join(
            d.issued,
            `${badTicketId}.json`,
          ),
          JSON.stringify({
            marker:
              "VOID_WC_PUBLIC_EARNING_PILOT_V1",
            version: "1",
            ticket_id: badTicketId,
            account,
            executor_node_id: executor,
            expires_at_ms: now + 300_000,
            status: "issued",
          }) + "\n",
          { mode: 0o600 },
        );
      } else {
        const badClaimId = "e".repeat(64);
        fs.writeFileSync(
          path.join(
            d.claims,
            `${badClaimId}.json`,
          ),
          JSON.stringify({
            marker:
              "VOID_WC_PUBLIC_TICKET_CLAIM_V1",
            version: 1,
            claim_id: badClaimId,
            status: "issued",
            issued_at_ms:
              String(now - 30_000),
            account,
            executor_node_id: executor,
          }) + "\n",
          { mode: 0o600 },
        );
      }

      authority.resetWcPublicClaimHistoryAuthorityForProofV1(
        tmp,
      );
      authority.primeWcPublicClaimHistoryAuthorityV1(tmp);
      await assert.rejects(
        () =>
          authority.waitForWcPublicClaimHistoryWarmForProofV1(
            tmp,
          ),
        /VOID_WC_PUBLIC_CLAIM_HISTORY_INVALID/,
      );

      const issuedBefore = fs
        .readdirSync(d.issued)
        .filter((name) => name.endsWith(".json"))
        .sort();
      const claimsBefore = fs
        .readdirSync(d.claims)
        .filter((name) => name.endsWith(".json"))
        .sort();

      const signed =
        pilot.signPublicTicketClaim(
          {
            domain:
              "void:mainnet-0:wc-public-ticket-claim-v1",
            marker:
              "VOID_WC_PUBLIC_TICKET_CLAIM_V1",
            version: 1,
            account,
            executor_node_id: executor,
            executor_pubkey: pubPEM,
            claim_nonce:
              (kind === "issued" ? "f" : "1").repeat(32),
            claim_ts_ms: now,
          },
          privateKey,
        );

      await assert.rejects(
        () =>
          pilot.issuePublicTicketClaim(
            signed,
            tmp,
            now,
          ),
        /VOID_WC_PUBLIC_CLAIM_HISTORY_INVALID/,
      );

      assert.deepEqual(
        fs
          .readdirSync(d.issued)
          .filter((name) => name.endsWith(".json"))
          .sort(),
        issuedBefore,
      );
      assert.deepEqual(
        fs
          .readdirSync(d.claims)
          .filter((name) => name.endsWith(".json"))
          .sort(),
        claimsBefore,
      );

      authority.resetWcPublicClaimHistoryAuthorityForProofV1(
        tmp,
      );
      fs.rmSync(tmp, {
        recursive: true,
        force: true,
      });
    }
  }

  // First-use claim-history directory links must cross a successful
  // parent-directory fsync before the authority can warm. A visible mkdir
  // left behind by a failed fsync must be re-synced on exact retry.
  {
    const tmp = fs.mkdtempSync(
      path.join(
        os.tmpdir(),
        "void-public-claim-history-dir-durability-v1-",
      ),
    );
    configure(tmp);

    const afterChildren = new Set<string>();
    authority.setWcPublicClaimHistoryDirectoryParentFsyncHookForProofV1(
      (
        phase: "before" | "after",
        _parent: string,
        child: string,
      ) => {
        if (phase === "after") {
          afterChildren.add(path.resolve(child));
        }
      },
    );
    try {
      authority.primeWcPublicClaimHistoryAuthorityV1(
        tmp,
      );
      await authority.waitForWcPublicClaimHistoryWarmForProofV1(
        tmp,
      );
    } finally {
      authority.setWcPublicClaimHistoryDirectoryParentFsyncHookForProofV1(
        null,
      );
    }

    const root = pilotRoot(tmp);
    for (const expected of [
      path.join(tmp, "wc_v1"),
      root,
      path.join(root, "issued"),
      path.join(root, "consumed"),
      path.join(root, "public-claims"),
    ]) {
      assert.equal(
        afterChildren.has(path.resolve(expected)),
        true,
        `missing successful parent fsync for ${expected}`,
      );
    }

    authority.resetWcPublicClaimHistoryAuthorityForProofV1(
      tmp,
    );
    fs.rmSync(tmp, {
      recursive: true,
      force: true,
    });
  }

  {
    const tmp = fs.mkdtempSync(
      path.join(
        os.tmpdir(),
        "void-public-claim-history-dir-resync-v1-",
      ),
    );
    configure(tmp);
    const root = pilotRoot(tmp);
    const claims = path.join(
      root,
      "public-claims",
    );
    let failedOnce = false;

    authority.setWcPublicClaimHistoryDirectoryParentFsyncHookForProofV1(
      (
        phase: "before" | "after",
        _parent: string,
        child: string,
      ) => {
        if (
          !failedOnce &&
          phase === "before" &&
          path.resolve(child) ===
            path.resolve(claims)
        ) {
          failedOnce = true;
          throw new Error(
            "VOID_WC_PROOF_HISTORY_PARENT_FSYNC_FAILURE",
          );
        }
      },
    );
    try {
      assert.throws(
        () =>
          authority.primeWcPublicClaimHistoryAuthorityV1(
            tmp,
          ),
        /VOID_WC_PROOF_HISTORY_PARENT_FSYNC_FAILURE/,
      );
    } finally {
      authority.setWcPublicClaimHistoryDirectoryParentFsyncHookForProofV1(
        null,
      );
    }

    assert.equal(failedOnce, true);
    assert.equal(
      fs.existsSync(claims),
      true,
      "fault must leave ambiguous visible directory",
    );

    let successfulResyncs = 0;
    authority.setWcPublicClaimHistoryDirectoryParentFsyncHookForProofV1(
      (
        phase: "before" | "after",
        _parent: string,
        child: string,
      ) => {
        if (
          phase === "after" &&
          path.resolve(child) ===
            path.resolve(claims)
        ) {
          successfulResyncs += 1;
        }
      },
    );
    try {
      authority.primeWcPublicClaimHistoryAuthorityV1(
        tmp,
      );
      await authority.waitForWcPublicClaimHistoryWarmForProofV1(
        tmp,
      );
    } finally {
      authority.setWcPublicClaimHistoryDirectoryParentFsyncHookForProofV1(
        null,
      );
    }

    assert.ok(
      successfulResyncs >= 1,
      "visible directory was not re-synced after prior parent fsync failure",
    );
    assert.equal(
      authority.wcPublicClaimHistorySnapshotV1(
        tmp,
        Date.now(),
      ).active,
      0,
    );

    authority.resetWcPublicClaimHistoryAuthorityForProofV1(
      tmp,
    );
    fs.rmSync(tmp, {
      recursive: true,
      force: true,
    });
  }

  // Durability-authoritative string/identity fields must be literal JSON
  // strings. Values that only stringify to a canonical value are invalid.
  {
    const now = Date.now();
    type StringSchemaCase = {
      label: string;
      kind: "issued" | "consumed" | "claim";
      file_id: string;
      record: Record<string, any>;
    };

    const ticketId = "1".repeat(32);
    const claimId = "2".repeat(64);
    const account = "string-schema-account";
    const executor = "3".repeat(32);

    const canonicalTicket = {
      marker: "VOID_WC_PUBLIC_EARNING_PILOT_V1",
      version: 1,
      ticket_id: ticketId,
      account,
      executor_node_id: executor,
      expires_at_ms: now + 300_000,
      status: "issued",
    };
    const canonicalClaim = {
      marker: "VOID_WC_PUBLIC_TICKET_CLAIM_V1",
      version: 1,
      claim_id: claimId,
      status: "issued",
      issued_at_ms: now - 30_000,
      account,
      executor_node_id: executor,
    };

    const cases: StringSchemaCase[] = [
      {
        label: "issued-marker-array",
        kind: "issued",
        file_id: ticketId,
        record: {
          ...canonicalTicket,
          marker: ["VOID_WC_PUBLIC_EARNING_PILOT_V1"],
        },
      },
      {
        label: "issued-status-array",
        kind: "issued",
        file_id: ticketId,
        record: {
          ...canonicalTicket,
          status: ["issued"],
        },
      },
      {
        label: "issued-ticket-id-array",
        kind: "issued",
        file_id: ticketId,
        record: {
          ...canonicalTicket,
          ticket_id: [ticketId],
        },
      },
      {
        label: "issued-account-array",
        kind: "issued",
        file_id: ticketId,
        record: {
          ...canonicalTicket,
          account: [account],
        },
      },
      {
        label: "issued-executor-array",
        kind: "issued",
        file_id: ticketId,
        record: {
          ...canonicalTicket,
          executor_node_id: [executor],
        },
      },
      {
        label: "issued-account-boolean",
        kind: "issued",
        file_id: ticketId,
        record: {
          ...canonicalTicket,
          account: true,
        },
      },
      {
        label: "consumed-status-issued",
        kind: "consumed",
        file_id: ticketId,
        record: {
          ...canonicalTicket,
          status: "issued",
        },
      },
      {
        label: "consumed-marker-array",
        kind: "consumed",
        file_id: ticketId,
        record: {
          ...canonicalTicket,
          status: "completed",
          marker: ["VOID_WC_PUBLIC_EARNING_PILOT_V1"],
        },
      },
      {
        label: "claim-marker-array",
        kind: "claim",
        file_id: claimId,
        record: {
          ...canonicalClaim,
          marker: ["VOID_WC_PUBLIC_TICKET_CLAIM_V1"],
        },
      },
      {
        label: "claim-status-array",
        kind: "claim",
        file_id: claimId,
        record: {
          ...canonicalClaim,
          status: ["issued"],
        },
      },
      {
        label: "claim-id-array",
        kind: "claim",
        file_id: claimId,
        record: {
          ...canonicalClaim,
          claim_id: [claimId],
        },
      },
      {
        label: "claim-account-array",
        kind: "claim",
        file_id: claimId,
        record: {
          ...canonicalClaim,
          account: [account],
        },
      },
      {
        label: "claim-executor-array",
        kind: "claim",
        file_id: claimId,
        record: {
          ...canonicalClaim,
          executor_node_id: [executor],
        },
      },
      {
        label: "claim-status-object",
        kind: "claim",
        file_id: claimId,
        record: {
          ...canonicalClaim,
          status: { value: "issued" },
        },
      },
    ];

    for (const testCase of cases) {
      const tmp = fs.mkdtempSync(
        path.join(
          os.tmpdir(),
          `void-public-claim-history-string-${testCase.label}-`,
        ),
      );
      configure(tmp);
      const d = ensureHistoryDirs(tmp);
      const dir =
        testCase.kind === "issued"
          ? d.issued
          : testCase.kind === "consumed"
            ? d.consumed
            : d.claims;
      fs.writeFileSync(
        path.join(dir, `${testCase.file_id}.json`),
        JSON.stringify(testCase.record) + "\n",
        { mode: 0o600 },
      );

      authority.resetWcPublicClaimHistoryAuthorityForProofV1(
        tmp,
      );
      authority.primeWcPublicClaimHistoryAuthorityV1(tmp);

      await assert.rejects(
        () =>
          authority.waitForWcPublicClaimHistoryWarmForProofV1(
            tmp,
          ),
        /VOID_WC_PUBLIC_CLAIM_HISTORY_INVALID/,
        testCase.label,
      );

      authority.resetWcPublicClaimHistoryAuthorityForProofV1(
        tmp,
      );
      fs.rmSync(tmp, {
        recursive: true,
        force: true,
      });
    }

    // Wrong-typed string authority must block a new capability publication.
    for (const kind of ["issued", "claim"] as const) {
      const tmp = fs.mkdtempSync(
        path.join(
          os.tmpdir(),
          `void-public-claim-history-string-issue-gate-${kind}-`,
        ),
      );
      configure(tmp);
      const d = ensureHistoryDirs(tmp);
      const { privateKey, publicKey } =
        crypto.generateKeyPairSync("ed25519");
      const pubPEM = publicKey
        .export({
          type: "spki",
          format: "pem",
        })
        .toString();
      const executorNode =
        block.nodeIdFromPubPEM(pubPEM);
      const issueAccount =
        `string-issue-gate-${kind}`;

      if (kind === "issued") {
        const badTicketId = "4".repeat(32);
        fs.writeFileSync(
          path.join(
            d.issued,
            `${badTicketId}.json`,
          ),
          JSON.stringify({
            marker:
              "VOID_WC_PUBLIC_EARNING_PILOT_V1",
            version: 1,
            ticket_id: badTicketId,
            account: [issueAccount],
            executor_node_id: executorNode,
            expires_at_ms: now + 300_000,
            status: "issued",
          }) + "\n",
          { mode: 0o600 },
        );
      } else {
        const badClaimId = "5".repeat(64);
        fs.writeFileSync(
          path.join(
            d.claims,
            `${badClaimId}.json`,
          ),
          JSON.stringify({
            marker:
              "VOID_WC_PUBLIC_TICKET_CLAIM_V1",
            version: 1,
            claim_id: badClaimId,
            status: ["issued"],
            issued_at_ms: now - 30_000,
            account: issueAccount,
            executor_node_id: executorNode,
          }) + "\n",
          { mode: 0o600 },
        );
      }

      authority.resetWcPublicClaimHistoryAuthorityForProofV1(
        tmp,
      );
      authority.primeWcPublicClaimHistoryAuthorityV1(tmp);
      await assert.rejects(
        () =>
          authority.waitForWcPublicClaimHistoryWarmForProofV1(
            tmp,
          ),
        /VOID_WC_PUBLIC_CLAIM_HISTORY_INVALID/,
      );

      const issuedBefore = fs
        .readdirSync(d.issued)
        .filter((name) => name.endsWith(".json"))
        .sort();
      const claimsBefore = fs
        .readdirSync(d.claims)
        .filter((name) => name.endsWith(".json"))
        .sort();

      const signed =
        pilot.signPublicTicketClaim(
          {
            domain:
              "void:mainnet-0:wc-public-ticket-claim-v1",
            marker:
              "VOID_WC_PUBLIC_TICKET_CLAIM_V1",
            version: 1,
            account: issueAccount,
            executor_node_id: executorNode,
            executor_pubkey: pubPEM,
            claim_nonce:
              (kind === "issued" ? "6" : "7").repeat(32),
            claim_ts_ms: now,
          },
          privateKey,
        );

      await assert.rejects(
        () =>
          pilot.issuePublicTicketClaim(
            signed,
            tmp,
            now,
          ),
        /VOID_WC_PUBLIC_CLAIM_HISTORY_INVALID/,
      );

      assert.deepEqual(
        fs
          .readdirSync(d.issued)
          .filter((name) => name.endsWith(".json"))
          .sort(),
        issuedBefore,
      );
      assert.deepEqual(
        fs
          .readdirSync(d.claims)
          .filter((name) => name.endsWith(".json"))
          .sort(),
        claimsBefore,
      );

      authority.resetWcPublicClaimHistoryAuthorityForProofV1(
        tmp,
      );
      fs.rmSync(tmp, {
        recursive: true,
        force: true,
      });
    }
  }

  // Post-warm correctness must not depend on fs.watch completeness. Warm
  // seals projections read-only; canonical replacement advances one durable
  // token, and exact async generation validation covers missed notifications.
  {
    const tmp = fs.mkdtempSync(
      path.join(
        os.tmpdir(),
        "void-public-claim-history-bounded-generation-v1-",
      ),
    );
    configure(tmp);
    const d = ensureHistoryDirs(tmp);
    const now = Date.now();
    const ticketId = "f".repeat(32);
    const executor = "6".repeat(32);
    const accountA = "bounded-account-a";
    const accountB = "bounded-account-b";
    const issuedFile = path.join(
      d.issued,
      `${ticketId}.json`,
    );

    const recordText = (account: string) =>
      JSON.stringify({
        marker: "VOID_WC_PUBLIC_EARNING_PILOT_V1",
        version: 1,
        ticket_id: ticketId,
        account,
        executor_node_id: executor,
        expires_at_ms: now + 300_000,
        status: "issued",
      }) + "\n";

    fs.writeFileSync(
      issuedFile,
      recordText(accountA),
      { mode: 0o600 },
    );

    authority.resetWcPublicClaimHistoryAuthorityForProofV1(
      tmp,
    );
    authority.primeWcPublicClaimHistoryAuthorityV1(tmp);
    await authority.waitForWcPublicClaimHistoryWarmForProofV1(
      tmp,
    );
    await authority.prepareWcPublicClaimHistoryDecisionV1(
      tmp,
    );

    const sealedMode =
      fs.statSync(issuedFile).mode & 0o777;
    assert.equal(
      sealedMode & 0o222,
      0,
      "published history projection remained writable in place",
    );
    assert.throws(
      () => {
        const fd = fs.openSync(issuedFile, "r+");
        fs.closeSync(fd);
      },
      (error: any) =>
        ["EACCES", "EPERM"].includes(
          String(error?.code || ""),
        ),
      "read-only projection still admitted ordinary in-place mutation",
    );

    let snapshot =
      authority.wcPublicClaimHistorySnapshotV1(
        tmp,
        now,
        accountA,
        executor,
        300_000,
      );
    assert.equal(snapshot.active_account, 1);

    const watchBefore =
      authority.wcPublicClaimHistoryWatchGenerationForProofV1(
        tmp,
      );
    authority.suppressWcPublicClaimHistoryWatchForProofV1(
      tmp,
    );
    replaceHistoryRecordCanonically(
      authority,
      issuedFile,
      recordText(accountB),
    );
    assert.equal(
      authority.wcPublicClaimHistoryWatchGenerationForProofV1(
        tmp,
      ),
      watchBefore,
      "suppressed watcher unexpectedly advanced generation",
    );

    let canonicalReplacementStartedWarm = false;
    await assert.rejects(
      async () => {
        try {
          await authority.prepareWcPublicClaimHistoryDecisionV1(
            tmp,
          );
        } catch (error) {
          canonicalReplacementStartedWarm = String(
            (error as any)?.message || error,
          ).includes("VOID_WC_PUBLIC_CLAIM_HISTORY_WARMING");
          throw error;
        }
      },
      /VOID_WC_PUBLIC_CLAIM_HISTORY_(?:WARMING|WATCH_(?:CHALLENGE_TIMEOUT|INVALID))/,
    );

    if (canonicalReplacementStartedWarm) {
      await authority.waitForWcPublicClaimHistoryWarmForProofV1(
        tmp,
      );
    }

    authority.resetWcPublicClaimHistoryAuthorityForProofV1(
      tmp,
    );
    authority.primeWcPublicClaimHistoryAuthorityV1(tmp);
    await authority.waitForWcPublicClaimHistoryWarmForProofV1(
      tmp,
    );
    await authority.prepareWcPublicClaimHistoryDecisionV1(
      tmp,
    );
    snapshot =
      authority.wcPublicClaimHistorySnapshotV1(
        tmp,
        now,
        accountA,
        executor,
        300_000,
      );
    assert.equal(snapshot.active_account, 0);
    assert.equal(
      authority.wcPublicClaimHistorySnapshotV1(
        tmp,
        now,
        accountB,
        executor,
        300_000,
      ).active_account,
      1,
    );

    // A live watcher may acknowledge its sentinel even when one ordinary
    // mutation notification is absent. Exact record generations, rather
    // than sentinel liveness, must still reject cached account-B policy.
    const directoryBeforeUncooperative = dirStamp(d.issued);
    const mutationBeforeUncooperative =
      await authority.readWcPublicClaimHistoryMutationGenerationForProofV1(
        tmp,
      );
    const recordBeforeUncooperative: any = fs.statSync(
      issuedFile,
      { bigint: true } as any,
    );
    authority.suppressWcPublicClaimHistoryMutationNotificationsForProofV1(
      tmp,
    );
    fs.chmodSync(issuedFile, 0o600);
    fs.writeFileSync(
      issuedFile,
      recordText(accountA),
      { mode: 0o600 },
    );
    fs.chmodSync(issuedFile, 0o400);
    const recordAfterUncooperative: any = fs.statSync(
      issuedFile,
      { bigint: true } as any,
    );
    assert.equal(
      String(recordAfterUncooperative.ino),
      String(recordBeforeUncooperative.ino),
    );
    assert.notEqual(
      String(recordAfterUncooperative.ctimeNs),
      String(recordBeforeUncooperative.ctimeNs),
    );
    assert.deepEqual(
      dirStamp(d.issued),
      directoryBeforeUncooperative,
    );
    assert.equal(
      await authority.readWcPublicClaimHistoryMutationGenerationForProofV1(
        tmp,
      ),
      mutationBeforeUncooperative,
    );
    let droppedMutationStartedWarm = false;
    try {
      await assert.rejects(
        async () => {
          try {
            await authority.prepareWcPublicClaimHistoryDecisionV1(
              tmp,
            );
          } catch (error) {
            droppedMutationStartedWarm = String(
              (error as any)?.message || error,
            ).includes("VOID_WC_PUBLIC_CLAIM_HISTORY_WARMING");
            throw error;
          }
        },
        /VOID_WC_PUBLIC_CLAIM_HISTORY_WARMING/,
      );
    } finally {
      authority.suppressWcPublicClaimHistoryMutationNotificationsForProofV1(
        tmp,
        false,
      );
    }

    assert.equal(droppedMutationStartedWarm, true);
    await authority.waitForWcPublicClaimHistoryWarmForProofV1(
      tmp,
    );

    authority.resetWcPublicClaimHistoryAuthorityForProofV1(
      tmp,
    );
    authority.primeWcPublicClaimHistoryAuthorityV1(tmp);
    await authority.waitForWcPublicClaimHistoryWarmForProofV1(
      tmp,
    );
    await authority.prepareWcPublicClaimHistoryDecisionV1(
      tmp,
    );
    assert.equal(
      authority.wcPublicClaimHistorySnapshotV1(
        tmp,
        now,
        accountA,
        executor,
        300_000,
      ).active_account,
      1,
    );
    assert.equal(
      authority.wcPublicClaimHistorySnapshotV1(
        tmp,
        now,
        accountB,
        executor,
        300_000,
      ).active_account,
      0,
    );

    // Canonical valid -> malformed replacement with watch delivery
    // suppressed must likewise fail closed into the existing single-flight
    // background rebuild.
    const validBytes = fs.readFileSync(issuedFile);
    const invalidBytes = Buffer.from(validBytes);
    invalidBytes[0] = 0x5b;

    const watchBeforeInvalid =
      authority.wcPublicClaimHistoryWatchGenerationForProofV1(
        tmp,
      );
    authority.suppressWcPublicClaimHistoryWatchForProofV1(
      tmp,
    );
    replaceHistoryRecordCanonically(
      authority,
      issuedFile,
      invalidBytes,
    );
    assert.equal(
      authority.wcPublicClaimHistoryWatchGenerationForProofV1(
        tmp,
      ),
      watchBeforeInvalid,
    );
    let malformedReplacementStartedWarm = false;
    await assert.rejects(
      async () => {
        try {
          await authority.prepareWcPublicClaimHistoryDecisionV1(
            tmp,
          );
        } catch (error) {
          malformedReplacementStartedWarm = String(
            (error as any)?.message || error,
          ).includes("VOID_WC_PUBLIC_CLAIM_HISTORY_WARMING");
          throw error;
        }
      },
      /VOID_WC_PUBLIC_CLAIM_HISTORY_(?:WARMING|WATCH_(?:CHALLENGE_TIMEOUT|INVALID))/,
    );
    if (!malformedReplacementStartedWarm) {
      authority.resetWcPublicClaimHistoryAuthorityForProofV1(
        tmp,
      );
      authority.primeWcPublicClaimHistoryAuthorityV1(tmp);
    }
    await assert.rejects(
      () =>
        authority.waitForWcPublicClaimHistoryWarmForProofV1(
          tmp,
        ),
      /VOID_WC_PUBLIC_CLAIM_HISTORY_INVALID/,
    );

    authority.resetWcPublicClaimHistoryAuthorityForProofV1(
      tmp,
    );
    fs.rmSync(tmp, {
      recursive: true,
      force: true,
    });
  }

  // The O(1) mutation-generation witness is policy authority too:
  // reject symlinks, non-canonical length, and pathname substitution.
  {
    const tmp = fs.mkdtempSync(
      path.join(
        os.tmpdir(),
        "void-public-claim-history-mutation-witness-v1-",
      ),
    );
    configure(tmp);
    ensureHistoryDirs(tmp);
    const generationFile = path.join(
      pilotRoot(tmp),
      ".claim-history-mutation-generation-v1",
    );

    authority.resetWcPublicClaimHistoryAuthorityForProofV1(tmp);
    const initial =
      await authority.readWcPublicClaimHistoryMutationGenerationForProofV1(
        tmp,
      );
    assert.match(initial, /^[0-9a-f]{64}$/);
    assert.equal(fs.statSync(generationFile).size, 65);

    const target = path.join(tmp, "witness-target.txt");
    fs.writeFileSync(
      target,
      `${"a".repeat(64)}\n`,
      { mode: 0o600 },
    );
    fs.unlinkSync(generationFile);
    fs.symlinkSync(target, generationFile);
    await assert.rejects(
      () =>
        authority.readWcPublicClaimHistoryMutationGenerationForProofV1(
          tmp,
        ),
      /VOID_WC_PUBLIC_CLAIM_HISTORY_MUTATION_GENERATION_INVALID/,
    );
    fs.unlinkSync(generationFile);

    fs.writeFileSync(
      generationFile,
      `${"b".repeat(64)}xx`,
      { mode: 0o600 },
    );
    await assert.rejects(
      () =>
        authority.readWcPublicClaimHistoryMutationGenerationForProofV1(
          tmp,
        ),
      /VOID_WC_PUBLIC_CLAIM_HISTORY_MUTATION_GENERATION_INVALID/,
    );

    fs.writeFileSync(
      generationFile,
      `${"c".repeat(64)}\n`,
      { mode: 0o600 },
    );
    const displaced = `${generationFile}.displaced`;
    let swapped = false;
    authority.setWcPublicClaimHistoryMutationGenerationReadHookForProofV1(
      async (phase: string, file: string) => {
        if (
          swapped ||
          phase !== "after_read" ||
          file !== generationFile
        ) {
          return;
        }
        swapped = true;
        fs.renameSync(generationFile, displaced);
        fs.writeFileSync(
          generationFile,
          `${"d".repeat(64)}\n`,
          { mode: 0o600 },
        );
      },
    );
    await assert.rejects(
      () =>
        authority.readWcPublicClaimHistoryMutationGenerationForProofV1(
          tmp,
        ),
      /VOID_WC_PUBLIC_CLAIM_HISTORY_MUTATION_GENERATION_CHANGED/,
    );
    authority.setWcPublicClaimHistoryMutationGenerationReadHookForProofV1(
      null,
    );
    assert.equal(swapped, true);
    assert.equal(
      await authority.readWcPublicClaimHistoryMutationGenerationForProofV1(
        tmp,
      ),
      "d".repeat(64),
    );

    fs.rmSync(tmp, { recursive: true, force: true });
  }

  console.log(
    "VOID_WC_PUBLIC_CLAIM_HISTORY_AUTHORITY_V1_GREEN",
  );
  console.log(
    "participant_status_retained_history_sync_scan=false",
  );
  console.log(
    "participant_claim_retained_history_sync_scan=false",
  );
  console.log("malformed_history_fail_closed=true");
  console.log("background_rebuild_yields_event_loop=true");
  console.log("record_generation_bound=true");
  console.log("in_place_rewrite_invalidates_cache=true");
  console.log("stat_read_generation_toctou_closed=true");
  console.log("consumed_ticket_dominates_issued_residue=true");
  console.log("record_remove_before_open_retried=true");
  console.log("claim_history_numeric_schema_exact=true");
  console.log("coercible_history_numeric_fields_rejected=true");
  console.log("history_directory_parent_fsync_durable=true");
  console.log("history_directory_failed_fsync_resynced=true");
  console.log("cached_child_parent_link_generation_bound=true");
  console.log("claim_history_string_schema_exact=true");
  console.log("coercible_history_string_fields_rejected=true");
  console.log("fs_watch_ordered_liveness_barrier=true");
  console.log("history_record_projection_in_place_mutation_denied=true");
  console.log("post_warm_mutation_generation_checked_before_decision=true");
  console.log("missed_watch_canonical_mutation_stale_cache=false");
  console.log("missed_watch_valid_to_invalid_fails_closed=true");
  console.log("missed_watch_uncooperative_in_place_rewrite_fails_closed=true");
  console.log("per_decision_retained_record_content_read=false");
  console.log("decision_mutation_generation_reads_per_request=1");
  console.log("decision_record_generation_validation=single_flight_async");
  console.log("mutation_generation_no_follow=true");
  console.log("mutation_generation_regular_file_only=true");
  console.log("mutation_generation_exact_65_bytes=true");
  console.log("mutation_generation_path_generation_bound=true");
}

main().catch((error) => {
  console.error(error?.stack || String(error));
  process.exit(1);
});
