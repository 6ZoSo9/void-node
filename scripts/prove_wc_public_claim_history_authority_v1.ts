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
    const issuedGeneration =
      authority.wcPublicClaimHistoryWatchGenerationForProofV1(
        tmp,
      );
    fs.writeFileSync(
      issuedFile,
      ticketB,
      { mode: 0o600 },
    );
    const issuedDirAfter = dirStamp(d.issued);
    assert.deepEqual(
      issuedDirAfter,
      issuedDirBefore,
      "in-place issued-record rewrite unexpectedly changed parent directory stamp",
    );
    await authority.waitForWcPublicClaimHistoryWatchAdvanceForProofV1(
      tmp,
      issuedGeneration,
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
    const claimGeneration =
      authority.wcPublicClaimHistoryWatchGenerationForProofV1(
        tmp,
      );
    fs.writeFileSync(
      claimFile,
      claimTextB,
      { mode: 0o600 },
    );
    const claimsDirAfter = dirStamp(d.claims);
    assert.deepEqual(
      claimsDirAfter,
      claimsDirBefore,
      "in-place claim rewrite unexpectedly changed parent directory stamp",
    );
    await authority.waitForWcPublicClaimHistoryWatchAdvanceForProofV1(
      tmp,
      claimGeneration,
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

    const malformedGeneration =
      authority.wcPublicClaimHistoryWatchGenerationForProofV1(
        tmp,
      );
    const issuedDirBeforeMalformed =
      dirStamp(d.issued);
    fs.writeFileSync(
      issuedFile,
      "{broken\n",
      { mode: 0o600 },
    );
    assert.deepEqual(
      dirStamp(d.issued),
      issuedDirBeforeMalformed,
      "valid-to-malformed in-place rewrite unexpectedly changed parent directory stamp",
    );
    await authority.waitForWcPublicClaimHistoryWatchAdvanceForProofV1(
      tmp,
      malformedGeneration,
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
}

main().catch((error) => {
  console.error(error?.stack || String(error));
  process.exit(1);
});
