import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

async function main(): Promise<void> {
  const tmp = fs.mkdtempSync(
    path.join(os.tmpdir(), "void-wc-public-ticket-claim-v1-"),
  );

  process.env.DATA_DIR = tmp;
  process.env.VOID_DATA_DIR = tmp;
  process.env.VOID_WC_PUBLIC_EARNING_PILOT_ENABLED = "1";
  process.env.VOID_WC_PUBLIC_TICKET_CLAIM_ENABLED = "1";
  process.env.VOID_WC_PUBLIC_TICKET_CLAIM_DATASET_ID =
    "ds_public_ticket_claim_v1_proof";
  process.env.VOID_WC_PUBLIC_TICKET_CLAIM_EXPECTED_INPUT_HASH =
    "2".repeat(64);
  process.env.VOID_WC_PUBLIC_TICKET_CLAIM_TTL_MS = "300000";
  process.env.VOID_WC_PUBLIC_TICKET_CLAIM_CLOCK_SKEW_MS = "300000";
  process.env.VOID_WC_PUBLIC_TICKET_CLAIM_COOLDOWN_MS = "60000";
  process.env.VOID_WC_PUBLIC_TICKET_CLAIM_MAX_PER_24H = "2";
  process.env.VOID_WC_PUBLIC_TICKET_CLAIM_GLOBAL_ACTIVE_CAP = "10";
  process.env.VOID_WC_PUBLIC_TICKET_CLAIM_GLOBAL_MAX_PER_24H = "10";
  process.env.VOID_WC_PUBLIC_EARNING_PILOT_PER_ACCOUNT_CAP = "1";
  process.env.VOID_WC_PUBLIC_EARNING_PILOT_GLOBAL_CAP = "1";

  const pilot = await import(
    "../src/economic/wc_public_earning_pilot_v1.js"
  );
  const authority = await import(
    "../src/economic/wc_public_claim_history_authority_v1.js"
  );
  const block = await import("../src/chain/block.js");

  const root = path.join(
    tmp,
    "wc_v1",
    "public-earning-pilot-v1",
  );
  for (const dir of [
    root,
    path.join(root, "issued"),
    path.join(root, "consumed"),
    path.join(root, "public-claims"),
  ]) {
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  }

  async function warm(forceReset = false): Promise<void> {
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

  function replaceHistoryRecordCanonically(
    file: string,
    value: unknown,
  ): void {
    const tmpFile =
      `${file}.proof-replace-${process.pid}-${crypto
        .randomBytes(6)
        .toString("hex")}`;
    let fd: number | null = null;
    try {
      fd = fs.openSync(tmpFile, "wx", 0o600);
      const bytes = Buffer.from(
        JSON.stringify(value, null, 2) + "\n",
        "utf8",
      );
      let offset = 0;
      while (offset < bytes.length) {
        const written = fs.writeSync(
          fd,
          bytes,
          offset,
          bytes.length - offset,
          null,
        );
        assert.ok(written > 0);
        offset += written;
      }
      fs.fdatasyncSync(fd);
      fs.closeSync(fd);
      fd = null;

      assert.equal(
        authority.publishWcPublicClaimHistoryMutationForFileV1(
          file,
        ),
        true,
        "proof replacement did not publish claim-history mutation witness",
      );
      fs.renameSync(tmpFile, file);

      const dirFd = fs.openSync(
        path.dirname(file),
        "r",
      );
      try {
        fs.fsyncSync(dirFd);
      } finally {
        fs.closeSync(dirFd);
      }
    } finally {
      if (fd !== null) {
        try {
          fs.closeSync(fd);
        } catch {}
      }
      try {
        fs.unlinkSync(tmpFile);
      } catch (error: any) {
        if (String(error?.code || "") !== "ENOENT") {
          throw error;
        }
      }
    }
  }

  await warm();

  const { privateKey, publicKey } =
    crypto.generateKeyPairSync("ed25519");
  const pubPEM = publicKey
    .export({ type: "spki", format: "pem" })
    .toString();
  const executorNodeId = block.nodeIdFromPubPEM(pubPEM);
  const account = "public-ticket-claim-proof-v1";

  function signed(
    nonce: string,
    claimAccount = account,
    ts = Date.now(),
  ) {
    return pilot.signPublicTicketClaim(
      {
        domain: "void:mainnet-0:wc-public-ticket-claim-v1",
        marker: "VOID_WC_PUBLIC_TICKET_CLAIM_V1",
        version: 1,
        account: claimAccount,
        executor_node_id: executorNodeId,
        executor_pubkey: pubPEM,
        claim_nonce: nonce,
        claim_ts_ms: ts,
      },
      privateKey,
    );
  }

  const policy = pilot.publicTicketClaimPolicySnapshot();
  assert.equal(policy.marker, "VOID_WC_PUBLIC_TICKET_CLAIM_V1");
  assert.equal(policy.enabled, true);
  assert.equal(policy.available, true);
  assert.equal(policy.fixed_award_wc, 3);
  assert.equal(policy.transport_mode, "outbound_bundle");
  assert.equal(policy.server_selected_work, true);
  assert.equal(policy.proof_of_executor_key_possession_required, true);
  assert.equal(policy.claim_nonce_replay_protection, true);
  assert.equal(policy.one_active_ticket_per_account, true);
  assert.equal(policy.one_active_ticket_per_executor, true);
  assert.equal(policy.participant_selected_dataset, false);
  assert.equal(policy.participant_selected_input_hash, false);
  assert.equal(policy.participant_selected_award, false);
  assert.equal(policy.money_movement, false);

  const firstSigned = signed("1".repeat(32));
  const verified = pilot.verifyPublicTicketClaim(
    firstSigned.claim,
    firstSigned.signature,
  );
  assert.equal(verified.account, account);
  assert.equal(verified.executor_node_id, executorNodeId);

  assert.throws(
    () =>
      pilot.verifyPublicTicketClaim(
        firstSigned.claim,
        {
          ...firstSigned.signature,
          sig: "0".repeat(128),
        },
      ),
    /claim_executor_signature_invalid/,
  );

  await assert.rejects(
    () =>
      pilot.issuePublicTicketClaim(
        {
          ...firstSigned,
          dataset_id: "participant-selected-dataset",
        },
        tmp,
      ),
    /unexpected_claim_request_body_field/,
  );

  const first = await pilot.issuePublicTicketClaim(
    firstSigned,
    tmp,
  );
  assert.equal(first.ok, true);
  assert.equal(first.marker, "VOID_WC_PUBLIC_TICKET_CLAIM_V1");
  assert.equal(first.claim_request_verified, true);
  assert.equal(first.executor_key_possession_verified, true);
  assert.equal(first.server_selected_work, true);
  assert.equal(first.fixed_award_wc, 3);
  assert.equal(first.participant_selected_dataset, false);
  assert.equal(first.participant_selected_input_hash, false);
  assert.equal(first.participant_selected_award, false);
  assert.equal(first.money_movement, false);
  assert.match(first.claim_id, /^[0-9a-f]{64}$/);
  assert.match(
    first.capability_token,
    /^wcep1\.[0-9a-f]{32}\.[A-Za-z0-9_-]{43}$/,
  );
  assert.equal(first.ticket.account, account);
  assert.equal(first.ticket.executor_node_id, executorNodeId);
  assert.equal(first.ticket.executor_http_base, "");
  assert.equal(first.ticket.transport_mode, "outbound_bundle");
  assert.equal(
    first.ticket.dataset_id,
    "ds_public_ticket_claim_v1_proof",
  );
  assert.equal(
    first.ticket.expected_input_hash,
    "2".repeat(64),
  );
  assert.equal(first.ticket.task_class, "datanet_fetch_verify");
  assert.equal(first.ticket.fixed_award_wc, 3);
  assert.equal(first.ticket.issuance_source, "public_claim");
  assert.equal(first.ticket.public_claim_id, first.claim_id);
  assert.equal(first.ticket.status, "issued");
  assert.equal(
    crypto
      .createHash("sha256")
      .update(first.capability_token)
      .digest("hex"),
    first.ticket.token_sha256,
  );

  const firstClaimFile = path.join(
    root,
    "public-claims",
    `${first.claim_id}.json`,
  );
  const firstClaimRecord = JSON.parse(
    fs.readFileSync(firstClaimFile, "utf8"),
  );
  assert.equal(firstClaimRecord.status, "issued");
  assert.equal(
    firstClaimRecord.ticket_id,
    first.ticket.ticket_id,
  );
  assert.equal(
    JSON.stringify(firstClaimRecord).includes(
      first.capability_token,
    ),
    false,
  );
  assert.equal(
    fs.readFileSync(
      path.join(
        root,
        "issued",
        `${first.ticket.ticket_id}.json`,
      ),
      "utf8",
    ).includes(first.capability_token),
    false,
  );

  await warm();

  const firstReplay =
    await pilot.issuePublicTicketClaim(
      firstSigned,
      tmp,
    );
  assert.equal(firstReplay.ok, true);
  assert.equal(
    firstReplay.recovered_claim_replay,
    true,
  );
  assert.equal(
    firstReplay.ticket.ticket_id,
    first.ticket.ticket_id,
  );
  assert.equal(
    firstReplay.capability_token,
    first.capability_token,
  );
  assert.equal(
    fs.readdirSync(path.join(root, "issued"))
      .filter((name) => name.endsWith(".json"))
      .length,
    1,
  );

  await assert.rejects(
    () =>
      pilot.issuePublicTicketClaim(
        signed(
          "3".repeat(32),
          "other-account-proof-v1",
        ),
        tmp,
      ),
    /public_claim_executor_active/,
  );

  // Failed reservation cleanup changes directory generation.
  await warm();

  await assert.rejects(
    () =>
      pilot.issuePublicTicketClaim(
        signed("4".repeat(32)),
        tmp,
      ),
    /public_claim_account_active/,
  );

  const firstIssuedPath = path.join(
    root,
    "issued",
    `${first.ticket.ticket_id}.json`,
  );
  const firstConsumedPath = path.join(
    root,
    "consumed",
    `${first.ticket.ticket_id}.json`,
  );
  const firstTicketRecord = JSON.parse(
    fs.readFileSync(firstIssuedPath, "utf8"),
  );
  fs.writeFileSync(
    firstConsumedPath,
    JSON.stringify(
      {
        ...firstTicketRecord,
        status: "completed",
        completed_at_ms: Date.now(),
      },
      null,
      2,
    ) + "\n",
    { mode: 0o600 },
  );
  fs.unlinkSync(firstIssuedPath);

  await warm(true);

  await assert.rejects(
    () =>
      pilot.issuePublicTicketClaim(
        signed("5".repeat(32)),
        tmp,
      ),
    /public_claim_account_cooldown/,
  );

  firstClaimRecord.issued_at_ms =
    Date.now() - 120_000;
  replaceHistoryRecordCanonically(
    firstClaimFile,
    firstClaimRecord,
  );

  // The canonical proof replacement advances the same durable mutation
  // witness as production before pathname publication; rebuild from that
  // current generation for the next cooldown/daily-cap assertion.
  await warm(true);

  const second = await pilot.issuePublicTicketClaim(
    signed("6".repeat(32)),
    tmp,
  );
  assert.equal(second.ok, true);
  assert.equal(second.ticket.account, account);
  assert.equal(second.ticket.executor_node_id, executorNodeId);
  assert.equal(
    second.ticket.issuance_source,
    "public_claim",
  );
  assert.notEqual(
    second.ticket.ticket_id,
    first.ticket.ticket_id,
  );

  const secondIssuedPath = path.join(
    root,
    "issued",
    `${second.ticket.ticket_id}.json`,
  );
  const secondConsumedPath = path.join(
    root,
    "consumed",
    `${second.ticket.ticket_id}.json`,
  );
  const secondTicketRecord = JSON.parse(
    fs.readFileSync(secondIssuedPath, "utf8"),
  );
  fs.writeFileSync(
    secondConsumedPath,
    JSON.stringify(
      {
        ...secondTicketRecord,
        status: "completed",
        completed_at_ms: Date.now(),
      },
      null,
      2,
    ) + "\n",
    { mode: 0o600 },
  );
  fs.unlinkSync(secondIssuedPath);

  await warm(true);

  await assert.rejects(
    () =>
      pilot.issuePublicTicketClaim(
        signed("7".repeat(32)),
        tmp,
      ),
    /public_claim_account_daily_cap_reached/,
  );

  for (const name of fs.readdirSync(
    path.join(root, "public-claims"),
  )) {
    const text = fs.readFileSync(
      path.join(root, "public-claims", name),
      "utf8",
    );
    assert.equal(text.includes("wcep1."), false);
  }

  console.log("VOID_WC_PUBLIC_TICKET_CLAIM_V1_GREEN");
  console.log("bounded_history_authority=true");
  console.log("malformed_history_fail_closed=true");
  fs.rmSync(tmp, { recursive: true, force: true });
}

main().catch((error) => {
  console.error(error?.stack || String(error));
  process.exitCode = 1;
});
