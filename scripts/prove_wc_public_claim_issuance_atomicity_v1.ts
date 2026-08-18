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

  console.log(
    "VOID_WC_PUBLIC_CLAIM_ISSUANCE_ATOMICITY_V1_GREEN",
  );
  console.log("same_account_double_issue=false");
  console.log("global_active_cap_double_issue=false");
  console.log(
    "issuance_audit_failure_strands_capability=false",
  );
  console.log("plaintext_capability_persisted=false");
  console.log("crash_replay_recovery_deferred_to_v24=true");
}

main().catch((error) => {
  console.error(error?.stack || String(error));
  process.exit(1);
});
