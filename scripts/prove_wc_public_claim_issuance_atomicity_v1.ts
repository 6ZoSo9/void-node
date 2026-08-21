import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

type SignedClaim = {
  claim: Record<string, any>;
  signature: Record<string, any>;
};

function configure(
  tmp: string,
  globalActiveCap = 10,
): void {
  process.env.DATA_DIR = tmp;
  process.env.VOID_DATA_DIR = tmp;
  process.env.VOID_WC_PUBLIC_EARNING_PILOT_ENABLED = "1";
  process.env.VOID_WC_PUBLIC_TICKET_CLAIM_ENABLED = "1";
  process.env.VOID_WC_PUBLIC_TICKET_CLAIM_DATASET_ID =
    "ds_public_claim_issuance_atomicity_v1";
  process.env.VOID_WC_PUBLIC_TICKET_CLAIM_EXPECTED_INPUT_HASH =
    "7".repeat(64);
  process.env.VOID_WC_PUBLIC_TICKET_CLAIM_TTL_MS = "300000";
  process.env.VOID_WC_PUBLIC_TICKET_CLAIM_CLOCK_SKEW_MS = "300000";
  process.env.VOID_WC_PUBLIC_TICKET_CLAIM_COOLDOWN_MS = "60000";
  process.env.VOID_WC_PUBLIC_TICKET_CLAIM_MAX_PER_24H = "10";
  process.env.VOID_WC_PUBLIC_TICKET_CLAIM_GLOBAL_ACTIVE_CAP =
    String(globalActiveCap);
  process.env.VOID_WC_PUBLIC_TICKET_CLAIM_GLOBAL_MAX_PER_24H = "100";
  process.env.VOID_WC_PUBLIC_EARNING_PILOT_PER_ACCOUNT_CAP = "1";
  process.env.VOID_WC_PUBLIC_EARNING_PILOT_GLOBAL_CAP = "1";
}

function rootDir(tmp: string): string {
  return path.join(
    tmp,
    "wc_v1",
    "public-earning-pilot-v1",
  );
}

function ensureRoot(tmp: string): void {
  for (const dir of [
    rootDir(tmp),
    path.join(rootDir(tmp), "issued"),
    path.join(rootDir(tmp), "consumed"),
    path.join(rootDir(tmp), "public-claims"),
    path.join(rootDir(tmp), "locks"),
  ]) {
    fs.mkdirSync(dir, {
      recursive: true,
      mode: 0o700,
    });
  }
}

function jsonNames(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((name) => name.endsWith(".json"))
    .sort();
}

async function main(): Promise<void> {
  const pilot = await import(
    "../src/economic/wc_public_earning_pilot_v1.js"
  );
  const authority = await import(
    "../src/economic/wc_public_claim_history_authority_v1.js"
  );
  const block = await import("../src/chain/block.js");

  async function warm(
    tmp: string,
    forceReset = false,
  ): Promise<void> {
    if (forceReset) {
      await authority.waitForWcPublicClaimHistoryWarmForProofV1(
        tmp,
      );
      authority.resetWcPublicClaimHistoryAuthorityForProofV1(
        tmp,
      );
    }
    authority.primeWcPublicClaimHistoryAuthorityV1(tmp);
    await authority.waitForWcPublicClaimHistoryWarmForProofV1(
      tmp,
    );
  }

  function signer() {
    const { privateKey, publicKey } =
      crypto.generateKeyPairSync("ed25519");
    const pubPEM = publicKey
      .export({ type: "spki", format: "pem" })
      .toString();
    return {
      privateKey,
      pubPEM,
      executor: block.nodeIdFromPubPEM(pubPEM),
    };
  }

  function signed(
    signing: ReturnType<typeof signer>,
    account: string,
    nonce: string,
  ): SignedClaim {
    return pilot.signPublicTicketClaim(
      {
        domain: "void:mainnet-0:wc-public-ticket-claim-v1",
        marker: "VOID_WC_PUBLIC_TICKET_CLAIM_V1",
        version: 1,
        account,
        executor_node_id: signing.executor,
        executor_pubkey: signing.pubPEM,
        claim_nonce: nonce,
        claim_ts_ms: Date.now(),
      },
      signing.privateKey,
    );
  }

  function readJson(file: string): Record<string, any> {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  }

  function consumeTicketForClaimPolicyProof(
    tmp: string,
    ticketId: string,
  ): void {
    const issued = path.join(
      rootDir(tmp),
      "issued",
      `${ticketId}.json`,
    );
    const consumed = path.join(
      rootDir(tmp),
      "consumed",
      `${ticketId}.json`,
    );
    const ticket = readJson(issued);
    fs.writeFileSync(
      consumed,
      JSON.stringify(
        {
          ...ticket,
          status: "completed",
          completed_at_ms: Date.now(),
        },
        null,
        2,
      ) + "\n",
      { mode: 0o600 },
    );
    fs.unlinkSync(issued);
  }

  async function barrierTwo(): Promise<void> {
    let ready = 0;
    let release!: () => void;
    const barrier = new Promise<void>((resolve) => {
      release = resolve;
    });
    pilot.setPublicClaimBeforeIssuanceLockHookForProofV1(
      async () => {
        ready += 1;
        if (ready === 2) release();
        await barrier;
      },
    );
  }

  // Same account/executor, distinct nonces: both requests establish
  // pre-lock readiness before either may publish. Only one may issue.
  {
    const tmp = fs.mkdtempSync(
      path.join(
        os.tmpdir(),
        "void-public-claim-issuance-same-account-",
      ),
    );
    configure(tmp, 10);
    ensureRoot(tmp);
    await warm(tmp);

    const signing = signer();
    const first = signed(
      signing,
      "same-account-concurrency",
      "1".repeat(32),
    );
    const second = signed(
      signing,
      "same-account-concurrency",
      "2".repeat(32),
    );

    await barrierTwo();
    const results = await Promise.allSettled([
      pilot.issuePublicTicketClaim(first, tmp),
      pilot.issuePublicTicketClaim(second, tmp),
    ]);
    pilot.setPublicClaimBeforeIssuanceLockHookForProofV1(
      null,
    );

    const fulfilled = results.filter(
      (entry) => entry.status === "fulfilled",
    ) as PromiseFulfilledResult<any>[];
    const rejected = results.filter(
      (entry) => entry.status === "rejected",
    ) as PromiseRejectedResult[];

    assert.equal(fulfilled.length, 1);
    assert.equal(rejected.length, 1);
    assert.match(
      String(
        rejected[0].reason?.message ||
          rejected[0].reason,
      ),
      /VOID_WC_PUBLIC_CLAIM_HISTORY_WARMING|public_claim_(account_active|executor_active|global_active_cap_reached)/,
    );

    assert.equal(
      jsonNames(path.join(rootDir(tmp), "issued")).length,
      1,
    );
    assert.equal(
      jsonNames(
        path.join(rootDir(tmp), "public-claims"),
      ).length,
      1,
    );
    assert.match(
      String(fulfilled[0].value.capability_token || ""),
      /^wcep1\./,
    );

    await warm(tmp);
    const loser =
      results[0].status === "rejected" ? first : second;
    await assert.rejects(
      () =>
        pilot.issuePublicTicketClaim(
          loser,
          tmp,
        ),
      /public_claim_(account_active|executor_active)/,
    );

    fs.rmSync(tmp, {
      recursive: true,
      force: true,
    });
  }

  // Global cap=1 with different accounts and executors.
  {
    const tmp = fs.mkdtempSync(
      path.join(
        os.tmpdir(),
        "void-public-claim-issuance-global-cap-",
      ),
    );
    configure(tmp, 1);
    ensureRoot(tmp);
    await warm(tmp);

    const a = signer();
    const b = signer();
    const first = signed(
      a,
      "global-cap-account-a",
      "3".repeat(32),
    );
    const second = signed(
      b,
      "global-cap-account-b",
      "4".repeat(32),
    );

    await barrierTwo();
    const results = await Promise.allSettled([
      pilot.issuePublicTicketClaim(first, tmp),
      pilot.issuePublicTicketClaim(second, tmp),
    ]);
    pilot.setPublicClaimBeforeIssuanceLockHookForProofV1(
      null,
    );

    assert.equal(
      results.filter(
        (entry) => entry.status === "fulfilled",
      ).length,
      1,
    );
    assert.equal(
      results.filter(
        (entry) => entry.status === "rejected",
      ).length,
      1,
    );
    assert.equal(
      jsonNames(path.join(rootDir(tmp), "issued")).length,
      1,
    );

    await warm(tmp);
    const loser =
      results[0].status === "rejected" ? first : second;
    await assert.rejects(
      () =>
        pilot.issuePublicTicketClaim(
          loser,
          tmp,
        ),
      /public_claim_global_active_cap_reached/,
    );

    fs.rmSync(tmp, {
      recursive: true,
      force: true,
    });
  }

  // Both issuance audits are non-authoritative: injected audit failure
  // after durable publication may not strand an inaccessible ticket.
  {
    const tmp = fs.mkdtempSync(
      path.join(
        os.tmpdir(),
        "void-public-claim-issuance-audit-",
      ),
    );
    configure(tmp, 10);
    ensureRoot(tmp);
    await warm(tmp);

    const signing = signer();
    const request = signed(
      signing,
      "audit-isolation-account",
      "5".repeat(32),
    );

    pilot.setPilotTransactionFaultForProofV1(
      "audit_after_commit",
    );
    const issued =
      await pilot.issuePublicTicketClaim(
        request,
        tmp,
      );
    pilot.setPilotTransactionFaultForProofV1("");

    assert.equal(issued.ok, true);
    assert.match(
      String(issued.capability_token || ""),
      /^wcep1\./,
    );

    const issuedNames = jsonNames(
      path.join(rootDir(tmp), "issued"),
    );
    const claimNames = jsonNames(
      path.join(rootDir(tmp), "public-claims"),
    );
    assert.equal(issuedNames.length, 1);
    assert.equal(claimNames.length, 1);

    const ticket = JSON.parse(
      fs.readFileSync(
        path.join(
          rootDir(tmp),
          "issued",
          issuedNames[0],
        ),
        "utf8",
      ),
    );
    const claim = JSON.parse(
      fs.readFileSync(
        path.join(
          rootDir(tmp),
          "public-claims",
          claimNames[0],
        ),
        "utf8",
      ),
    );
    assert.equal(claim.status, "issued");
    assert.equal(claim.ticket_id, ticket.ticket_id);
    assert.equal(
      crypto
        .createHash("sha256")
        .update(issued.capability_token)
        .digest("hex"),
      ticket.token_sha256,
    );
    assert.equal(
      JSON.stringify(ticket).includes(
        issued.capability_token,
      ),
      false,
    );
    assert.equal(
      JSON.stringify(claim).includes(
        issued.capability_token,
      ),
      false,
    );

    fs.rmSync(tmp, {
      recursive: true,
      force: true,
    });
  }


  async function recoveryScenario(
    phase: string,
    label: string,
    expectedStatus: "reserving" | "publishing" | "issued",
    expectTicketBeforeReplay: boolean,
  ): Promise<void> {
    const tmp = fs.mkdtempSync(
      path.join(
        os.tmpdir(),
        `void-public-claim-recovery-${label}-`,
      ),
    );
    configure(tmp, 10);
    ensureRoot(tmp);
    await warm(tmp);

    const signing = signer();
    const request = signed(
      signing,
      `recovery-${label}-account`,
      crypto
        .createHash("sha256")
        .update(`recovery-${label}`)
        .digest("hex")
        .slice(0, 32),
    );

    pilot.setPilotTransactionFaultForProofV1(
      phase,
    );
    try {
      await assert.rejects(
        () =>
          pilot.issuePublicTicketClaim(
            request,
            tmp,
          ),
        new RegExp(
          `VOID_WC_PILOT_PROOF_FAULT_${phase}`,
        ),
      );
    } finally {
      pilot.setPilotTransactionFaultForProofV1(
        "",
      );
    }

    const claimDir = path.join(
      rootDir(tmp),
      "public-claims",
    );
    const issuedDir = path.join(
      rootDir(tmp),
      "issued",
    );
    const claimNames = jsonNames(claimDir);
    const beforeIssued = jsonNames(issuedDir);
    assert.equal(claimNames.length, 1);
    assert.equal(
      beforeIssued.length,
      expectTicketBeforeReplay ? 1 : 0,
    );

    const claimBefore = JSON.parse(
      fs.readFileSync(
        path.join(claimDir, claimNames[0]),
        "utf8",
      ),
    );
    assert.equal(
      claimBefore.status,
      expectedStatus,
    );
    assert.equal(
      JSON.stringify(claimBefore).includes(
        "wcep1.",
      ),
      false,
    );

    await warm(tmp);

    const replay =
      await pilot.issuePublicTicketClaim(
        request,
        tmp,
      );
    assert.equal(replay.ok, true);
    assert.equal(
      replay.recovered_claim_replay,
      true,
    );
    assert.match(
      String(replay.capability_token || ""),
      /^wcep1\./,
    );

    const afterIssued = jsonNames(issuedDir);
    assert.equal(afterIssued.length, 1);
    assert.equal(
      afterIssued[0],
      `${replay.ticket.ticket_id}.json`,
    );

    if (
      expectedStatus === "publishing" ||
      expectedStatus === "issued"
    ) {
      assert.equal(
        replay.ticket.ticket_id,
        String(claimBefore.ticket_id || ""),
      );
      assert.equal(
        crypto
          .createHash("sha256")
          .update(replay.capability_token)
          .digest("hex"),
        String(claimBefore.token_sha256 || ""),
      );
    }

    const claimAfter = JSON.parse(
      fs.readFileSync(
        path.join(claimDir, claimNames[0]),
        "utf8",
      ),
    );
    assert.equal(claimAfter.status, "issued");
    assert.equal(
      claimAfter.ticket_id,
      replay.ticket.ticket_id,
    );
    assert.equal(
      JSON.stringify(claimAfter).includes(
        replay.capability_token,
      ),
      false,
    );

    const issuedAfter = JSON.parse(
      fs.readFileSync(
        path.join(
          issuedDir,
          `${replay.ticket.ticket_id}.json`,
        ),
        "utf8",
      ),
    );
    assert.equal(
      JSON.stringify(issuedAfter).includes(
        replay.capability_token,
      ),
      false,
    );
    assert.equal(
      issuedAfter.token_sha256,
      crypto
        .createHash("sha256")
        .update(replay.capability_token)
        .digest("hex"),
    );

    await warm(tmp);
    const exactReplay =
      await pilot.issuePublicTicketClaim(
        request,
        tmp,
      );
    assert.equal(
      exactReplay.capability_token,
      replay.capability_token,
    );
    assert.equal(
      exactReplay.ticket.ticket_id,
      replay.ticket.ticket_id,
    );
    assert.equal(
      jsonNames(issuedDir).length,
      1,
    );

    fs.rmSync(tmp, {
      recursive: true,
      force: true,
    });
  }

  await recoveryScenario(
    "public_claim_after_reservation",
    "reservation",
    "reserving",
    false,
  );
  await recoveryScenario(
    "public_claim_after_publishing_journal",
    "publishing-journal",
    "publishing",
    false,
  );
  await recoveryScenario(
    "public_claim_after_ticket_published",
    "ticket-published",
    "publishing",
    true,
  );
  await recoveryScenario(
    "public_claim_after_claim_issued_before_return",
    "claim-issued",
    "issued",
    true,
  );

  // Crash-recovery journals and their embedded ticket are durability
  // authority. JSON values that merely stringify like timestamps must HOLD
  // before any issued ticket is published.
  for (const [label, mutate] of [
    [
      "reserved-string",
      (claim: Record<string, any>) => {
        claim.reserved_at_ms = String(claim.reserved_at_ms);
      },
    ],
    [
      "claim-expiry-array",
      (claim: Record<string, any>) => {
        claim.claim_expires_at_ms = [claim.claim_expires_at_ms];
      },
    ],
    [
      "issued-boolean",
      (claim: Record<string, any>) => {
        claim.issued_at_ms = true;
      },
    ],
    [
      "expiry-object",
      (claim: Record<string, any>) => {
        claim.expires_at_ms = { value: claim.expires_at_ms };
      },
    ],
    [
      "ticket-issued-string",
      (claim: Record<string, any>) => {
        claim.ticket_record.issued_at_ms = String(
          claim.ticket_record.issued_at_ms,
        );
      },
    ],
    [
      "ticket-expiry-array",
      (claim: Record<string, any>) => {
        claim.ticket_record.expires_at_ms = [
          claim.ticket_record.expires_at_ms,
        ];
      },
    ],
  ] as const) {
    const tmp = fs.mkdtempSync(
      path.join(
        os.tmpdir(),
        `void-public-claim-exact-numeric-${label}-`,
      ),
    );
    configure(tmp, 10);
    ensureRoot(tmp);
    await warm(tmp);

    const signing = signer();
    const request = signed(
      signing,
      `exact-numeric-${label}`,
      crypto
        .createHash("sha256")
        .update(`exact-numeric-${label}`)
        .digest("hex")
        .slice(0, 32),
    );
    pilot.setPilotTransactionFaultForProofV1(
      "public_claim_after_publishing_journal",
    );
    try {
      await assert.rejects(
        () => pilot.issuePublicTicketClaim(request, tmp),
        /VOID_WC_PILOT_PROOF_FAULT_public_claim_after_publishing_journal/,
      );
    } finally {
      pilot.setPilotTransactionFaultForProofV1("");
    }

    const claimDir = path.join(rootDir(tmp), "public-claims");
    const claimFile = path.join(claimDir, jsonNames(claimDir)[0]);
    const claim = readJson(claimFile);
    mutate(claim);
    fs.writeFileSync(
      claimFile,
      JSON.stringify(claim, null, 2) + "\n",
      { mode: 0o600 },
    );

    await assert.rejects(
      () => pilot.issuePublicTicketClaim(request, tmp),
      /public_claim_(?:numeric_schema_invalid|recovery_ticket_invalid)/,
    );
    assert.equal(
      jsonNames(path.join(rootDir(tmp), "issued")).length,
      0,
      `${label} recovery published an issued ticket`,
    );
    fs.rmSync(tmp, { recursive: true, force: true });
  }


  // Journaled recovery stays valid after claim-skew expiry while its ticket
  // lifetime remains live.
  {
    const tmp = fs.mkdtempSync(
      path.join(
        os.tmpdir(),
        "void-public-claim-recovery-stale-signature-",
      ),
    );
    configure(tmp, 10);
    process.env.VOID_WC_PUBLIC_TICKET_CLAIM_CLOCK_SKEW_MS =
      "30000";
    process.env.VOID_WC_PUBLIC_TICKET_CLAIM_TTL_MS =
      "120000";
    ensureRoot(tmp);
    await warm(tmp);

    const signing = signer();
    const request = signed(
      signing,
      "stale-recovery-account",
      "a".repeat(32),
    );
    const t0 = Number(request.claim.claim_ts_ms);

    pilot.setPilotTransactionFaultForProofV1(
      "public_claim_after_publishing_journal",
    );
    try {
      await assert.rejects(
        () =>
          pilot.issuePublicTicketClaim(
            request,
            tmp,
            t0,
          ),
        /VOID_WC_PILOT_PROOF_FAULT_public_claim_after_publishing_journal/,
      );
    } finally {
      pilot.setPilotTransactionFaultForProofV1("");
    }

    const claimName = jsonNames(
      path.join(rootDir(tmp), "public-claims"),
    )[0];
    const before = readJson(
      path.join(
        rootDir(tmp),
        "public-claims",
        claimName,
      ),
    );
    assert.equal(before.status, "publishing");

    await warm(tmp);
    const recovered =
      await pilot.issuePublicTicketClaim(
        request,
        tmp,
        t0 + 30_001,
      );
    assert.equal(recovered.ok, true);
    assert.equal(
      recovered.recovered_claim_replay,
      true,
    );
    assert.equal(
      recovered.ticket.ticket_id,
      before.ticket_id,
    );

    fs.rmSync(tmp, {
      recursive: true,
      force: true,
    });
  }

  // The same old signature without a journal remains invalid for new issue.
  {
    const tmp = fs.mkdtempSync(
      path.join(
        os.tmpdir(),
        "void-public-claim-stale-fresh-issue-",
      ),
    );
    configure(tmp, 10);
    process.env.VOID_WC_PUBLIC_TICKET_CLAIM_CLOCK_SKEW_MS =
      "30000";
    process.env.VOID_WC_PUBLIC_TICKET_CLAIM_TTL_MS =
      "120000";
    ensureRoot(tmp);
    await warm(tmp);

    const signing = signer();
    const request = signed(
      signing,
      "stale-new-claim-account",
      "b".repeat(32),
    );
    const t0 = Number(request.claim.claim_ts_ms);
    await assert.rejects(
      () =>
        pilot.issuePublicTicketClaim(
          request,
          tmp,
          t0 + 30_001,
        ),
      /claim_timestamp_outside_window/,
    );
    assert.equal(
      jsonNames(
        path.join(rootDir(tmp), "issued"),
      ).length,
      0,
    );
    assert.equal(
      jsonNames(
        path.join(rootDir(tmp), "public-claims"),
      ).length,
      0,
    );

    fs.rmSync(tmp, {
      recursive: true,
      force: true,
    });
  }

  // A crashed publishing journal cannot resurrect a second active ticket
  // after another claim has taken the account/executor/global capacity.
  {
    const tmp = fs.mkdtempSync(
      path.join(
        os.tmpdir(),
        "void-public-claim-recovery-capacity-conflict-",
      ),
    );
    configure(tmp, 1);
    ensureRoot(tmp);
    await warm(tmp);

    const signing = signer();
    const first = signed(
      signing,
      "recovery-capacity-account",
      "c".repeat(32),
    );
    pilot.setPilotTransactionFaultForProofV1(
      "public_claim_after_publishing_journal",
    );
    try {
      await assert.rejects(
        () =>
          pilot.issuePublicTicketClaim(
            first,
            tmp,
          ),
        /VOID_WC_PILOT_PROOF_FAULT_public_claim_after_publishing_journal/,
      );
    } finally {
      pilot.setPilotTransactionFaultForProofV1("");
    }

    await warm(tmp);
    const second = signed(
      signing,
      "recovery-capacity-account",
      "d".repeat(32),
    );
    const winner =
      await pilot.issuePublicTicketClaim(
        second,
        tmp,
      );
    assert.equal(winner.ok, true);
    await warm(tmp);

    await assert.rejects(
      () =>
        pilot.issuePublicTicketClaim(
          first,
          tmp,
        ),
      /public_claim_recovery_capacity_conflict/,
    );
    const issuedNames = jsonNames(
      path.join(rootDir(tmp), "issued"),
    );
    assert.equal(issuedNames.length, 1);
    assert.equal(
      issuedNames[0],
      `${winner.ticket.ticket_id}.json`,
    );

    fs.rmSync(tmp, {
      recursive: true,
      force: true,
    });
  }

  // A durable recovery reservation does not reserve future daily quota.
  // Once another same-account/executor claim issues and is consumed, replay
  // of the old pre-ticket reservation must not mint another ticket.
  {
    const tmp = fs.mkdtempSync(
      path.join(
        os.tmpdir(),
        "void-public-claim-recovery-daily-turnover-",
      ),
    );
    configure(tmp, 10);
    process.env.VOID_WC_PUBLIC_TICKET_CLAIM_MAX_PER_24H =
      "1";
    process.env.VOID_WC_PUBLIC_TICKET_CLAIM_COOLDOWN_MS =
      "60000";
    ensureRoot(tmp);
    await warm(tmp);

    const signing = signer();
    const oldClaim = signed(
      signing,
      "recovery-policy-daily-account",
      "e".repeat(32),
    );
    pilot.setPilotTransactionFaultForProofV1(
      "public_claim_after_reservation",
    );
    try {
      await assert.rejects(
        () =>
          pilot.issuePublicTicketClaim(
            oldClaim,
            tmp,
          ),
        /VOID_WC_PILOT_PROOF_FAULT_public_claim_after_reservation/,
      );
    } finally {
      pilot.setPilotTransactionFaultForProofV1("");
    }

    await warm(tmp);
    const winnerClaim = signed(
      signing,
      "recovery-policy-daily-account",
      "1".repeat(32),
    );
    const winner =
      await pilot.issuePublicTicketClaim(
        winnerClaim,
        tmp,
      );
    assert.equal(winner.ok, true);
    consumeTicketForClaimPolicyProof(
      tmp,
      winner.ticket.ticket_id,
    );
    await warm(tmp);

    const history =
      authority.wcPublicClaimHistorySnapshotV1(
        tmp,
        Date.now(),
        "recovery-policy-daily-account",
        signing.executor,
        300000,
      );
    assert.equal(history.active, 0);
    assert.equal(history.active_account, 0);
    assert.equal(history.account_24h, 1);
    assert.equal(history.executor_24h, 1);

    await assert.rejects(
      () =>
        pilot.issuePublicTicketClaim(
          oldClaim,
          tmp,
        ),
      /public_claim_account_daily_cap_reached/,
    );
    assert.equal(
      jsonNames(
        path.join(rootDir(tmp), "issued"),
      ).length,
      0,
    );

    fs.rmSync(tmp, {
      recursive: true,
      force: true,
    });
  }

  // The same turnover is also bound by cooldown when daily quota remains.
  {
    const tmp = fs.mkdtempSync(
      path.join(
        os.tmpdir(),
        "void-public-claim-recovery-cooldown-turnover-",
      ),
    );
    configure(tmp, 10);
    process.env.VOID_WC_PUBLIC_TICKET_CLAIM_MAX_PER_24H =
      "10";
    process.env.VOID_WC_PUBLIC_TICKET_CLAIM_COOLDOWN_MS =
      "60000";
    ensureRoot(tmp);
    await warm(tmp);

    const signing = signer();
    const oldClaim = signed(
      signing,
      "recovery-policy-cooldown-account",
      "2".repeat(32),
    );
    pilot.setPilotTransactionFaultForProofV1(
      "public_claim_after_publishing_journal",
    );
    try {
      await assert.rejects(
        () =>
          pilot.issuePublicTicketClaim(
            oldClaim,
            tmp,
          ),
        /VOID_WC_PILOT_PROOF_FAULT_public_claim_after_publishing_journal/,
      );
    } finally {
      pilot.setPilotTransactionFaultForProofV1("");
    }

    await warm(tmp);
    const winnerClaim = signed(
      signing,
      "recovery-policy-cooldown-account",
      "3".repeat(32),
    );
    const winner =
      await pilot.issuePublicTicketClaim(
        winnerClaim,
        tmp,
      );
    assert.equal(winner.ok, true);
    consumeTicketForClaimPolicyProof(
      tmp,
      winner.ticket.ticket_id,
    );
    await warm(tmp);

    const history =
      authority.wcPublicClaimHistorySnapshotV1(
        tmp,
        Date.now(),
        "recovery-policy-cooldown-account",
        signing.executor,
        300000,
      );
    assert.equal(history.active, 0);
    assert.equal(history.account_24h, 1);
    assert.ok(history.last_account_at > 0);

    await assert.rejects(
      () =>
        pilot.issuePublicTicketClaim(
          oldClaim,
          tmp,
        ),
      /public_claim_account_cooldown/,
    );
    assert.equal(
      jsonNames(
        path.join(rootDir(tmp), "issued"),
      ).length,
      0,
    );

    fs.rmSync(tmp, {
      recursive: true,
      force: true,
    });
  }

  // If the first issued-directory fsync fails after rename, exact retry must
  // perform a successful issued-directory fsync before returning the token.
  {
    const tmp = fs.mkdtempSync(
      path.join(
        os.tmpdir(),
        "void-public-claim-issued-dir-fsync-recovery-",
      ),
    );
    configure(tmp, 10);
    ensureRoot(tmp);
    await warm(tmp);

    const signing = signer();
    const request = signed(
      signing,
      "recovery-fsync-account",
      "f".repeat(32),
    );
    const issuedDir = path.join(
      rootDir(tmp),
      "issued",
    );
    const resolvedIssuedDir = path.resolve(
      issuedDir,
    );
    const originalFsyncSync = fs.fsyncSync;
    let failedOnce = false;

    (fs as any).fsyncSync = function (
      fd: number,
    ): void {
      let target = "";
      try {
        target = path.resolve(
          fs.readlinkSync(
            `/proc/self/fd/${fd}`,
          ),
        );
      } catch (error) {
        void error;
      }
      if (
        !failedOnce &&
        target === resolvedIssuedDir
      ) {
        failedOnce = true;
        throw new Error(
          "VOID_WC_PROOF_ISSUED_DIR_FSYNC_FAILURE",
        );
      }
      return originalFsyncSync(fd);
    };

    try {
      await assert.rejects(
        () =>
          pilot.issuePublicTicketClaim(
            request,
            tmp,
          ),
        /VOID_WC_PROOF_ISSUED_DIR_FSYNC_FAILURE/,
      );
    } finally {
      (fs as any).fsyncSync =
        originalFsyncSync;
    }
    assert.equal(failedOnce, true);
    assert.equal(
      jsonNames(issuedDir).length,
      1,
    );
    const claimName = jsonNames(
      path.join(rootDir(tmp), "public-claims"),
    )[0];
    assert.equal(
      readJson(
        path.join(
          rootDir(tmp),
          "public-claims",
          claimName,
        ),
      ).status,
      "publishing",
    );

    await warm(tmp);
    let successfulIssuedDirFsyncs = 0;
    (fs as any).fsyncSync = function (
      fd: number,
    ): void {
      let target = "";
      try {
        target = path.resolve(
          fs.readlinkSync(
            `/proc/self/fd/${fd}`,
          ),
        );
      } catch (error) {
        void error;
      }
      if (target === resolvedIssuedDir) {
        successfulIssuedDirFsyncs += 1;
      }
      return originalFsyncSync(fd);
    };

    let recovered: any;
    try {
      recovered =
        await pilot.issuePublicTicketClaim(
          request,
          tmp,
        );
    } finally {
      (fs as any).fsyncSync =
        originalFsyncSync;
    }
    assert.equal(recovered.ok, true);
    assert.ok(
      successfulIssuedDirFsyncs >= 1,
      "recovery returned without re-fsyncing issued directory",
    );

    fs.rmSync(tmp, {
      recursive: true,
      force: true,
    });
  }

  console.log(
    "VOID_WC_PUBLIC_CLAIM_ISSUANCE_ATOMICITY_V1_GREEN",
  );
  console.log("same_account_double_issue=false");
  console.log("global_active_cap_double_issue=false");
  console.log(
    "issuance_audit_failure_strands_capability=false",
  );
  console.log("plaintext_capability_persisted=false");
  console.log("crash_replay_recovery=true");
  console.log("same_capability_exact_replay=true");
  console.log("orphan_active_ticket=false");
  console.log("recovery_survives_claim_skew=true");
  console.log("fresh_stale_claim_rejected=true");
  console.log("recovery_capacity_resurrection=false");
  console.log("recovery_daily_quota_bypass=false");
  console.log("recovery_cooldown_bypass=false");
  console.log("issued_directory_durability_reestablished=true");
}

main().catch((error) => {
  console.error(error?.stack || String(error));
  process.exit(1);
});
