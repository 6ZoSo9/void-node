import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

async function main(): Promise<void> {
  const tmp = fs.mkdtempSync(
    path.join(os.tmpdir(), "void-wc-public-earning-pilot-v1-"),
  );
  process.env.DATA_DIR = tmp;
  process.env.VOID_DATA_DIR = tmp;

  const pilot = await import(
    "../src/economic/wc_public_earning_pilot_v1.js"
  );
  const acceptance = await import(
    "../src/economic/wc_verified_receipt_acceptance_v1.js"
  );
  const claimAuthority = await import(
    "../src/economic/wc_public_claim_history_authority_v1.js"
  );
  const remoteIndex = await import(
    "../src/economic/wc_public_remote_truth_jsonl_index_v1.js"
  );
  const block = await import("../src/chain/block.js");

  const { privateKey, publicKey } = crypto.generateKeyPairSync("ed25519");
  const pubPEM = publicKey
    .export({ type: "spki", format: "pem" })
    .toString();
  const executorNodeId = block.nodeIdFromPubPEM(pubPEM);

  const publicWorkBytes = Buffer.from(
    "VOID_WC_PUBLIC_WORK_REFERENCE_V1\n",
    "utf8",
  );
  const publicWorkHash = crypto
    .createHash("sha256")
    .update(publicWorkBytes)
    .digest("hex");
  const publicWorkFile = path.join(
    tmp,
    "public-work-reference-v1.bin",
  );
  fs.writeFileSync(
    publicWorkFile,
    publicWorkBytes,
    { mode: 0o600 },
  );
  process.env.VOID_WC_PUBLIC_TICKET_CLAIM_DATASET_FILE =
    publicWorkFile;

  const envelope = {
    ticket_id: "a".repeat(32),
    account: "outside-operator-pilot-v1",
    task_class: "datanet_fetch_verify",
    executor_node_id: executorNodeId,
    executor_pubkey: pubPEM,
    executor_http_base: "http://100.64.0.2:4101",
    dataset_id: "ds_remote_executor_runtime_v1",
    expected_input_hash: "b".repeat(64),
    job_id: "job_remote_executor_runtime_v1",
    receipt_id: "rcpt_remote_executor_runtime_v1",
    input_hash: "b".repeat(64),
    output_hash: "c".repeat(64),
    fetched_input_hash: "b".repeat(64),
    receipt_ts_ms: Date.now(),
  };

  const signed = pilot.signPilotResultEnvelope(envelope, privateKey);
  const verified = pilot.verifyPilotResultEnvelope(
    signed.envelope,
    signed.signature,
  );

  assert.equal(verified.executor_node_id, executorNodeId);
  assert.equal(verified.dataset_id, envelope.dataset_id);
  assert.equal(verified.expected_input_hash, envelope.expected_input_hash);

  const now = Date.now();
  const ticketRecord = {
    marker: "VOID_WC_PUBLIC_EARNING_PILOT_V1",
    version: 1 as const,
    ticket_id: envelope.ticket_id,
    account: envelope.account,
    task_class: envelope.task_class,
    executor_node_id: envelope.executor_node_id,
    executor_http_base: envelope.executor_http_base,
    dataset_id: envelope.dataset_id,
    expected_input_hash: envelope.expected_input_hash,
    token_sha256: "e".repeat(64),
    nonce: "f".repeat(32),
    issued_at_ms: now - 1_000,
    expires_at_ms: now + 60_000,
    max_uses: 1 as const,
    status: "issued",
    public_submit_route: "/wc/public-earning-pilot-v1/submit-result",
    local_execute_route: "/wc/public-earning-pilot-v1/execute-local",
  };
  pilot.assertPilotTicketEnvelopeMatch(ticketRecord, verified);
  assert.throws(
    () =>
      pilot.assertPilotTicketEnvelopeMatch(ticketRecord, {
        ...verified,
        receipt_ts_ms: now - 10 * 60_000,
      }),
    /receipt_timestamp_before_ticket/,
  );
  assert.throws(
    () =>
      pilot.assertPilotTicketEnvelopeMatch(ticketRecord, {
        ...verified,
        receipt_ts_ms: now + 10 * 60_000,
      }),
    /receipt_timestamp_after_ticket/,
  );

  const remoteJob = {
    job_id: envelope.job_id,
    account: envelope.account,
    kind: envelope.task_class,
    dataset_id: envelope.dataset_id,
    plaintext: JSON.stringify({
      dataset_id: envelope.dataset_id,
      expected_input_hash: envelope.expected_input_hash,
      capability_ticket_id: envelope.ticket_id,
      executor_node_id: envelope.executor_node_id,
    }),
    meta: {
      selected_dataset_id: envelope.dataset_id,
      capability_ticket_id: envelope.ticket_id,
      executor_node_id: envelope.executor_node_id,
    },
  };
  pilot.assertRemoteJobTruth(remoteJob, verified);
  assert.throws(
    () =>
      pilot.assertRemoteJobTruth(
        {
          ...remoteJob,
          plaintext: JSON.stringify({
            dataset_id: envelope.dataset_id,
            expected_input_hash: "d".repeat(64),
            capability_ticket_id: envelope.ticket_id,
            executor_node_id: envelope.executor_node_id,
          }),
        },
        verified,
      ),
    /remote_job_expected_input_hash_mismatch/,
  );
  assert.throws(
    () =>
      pilot.assertRemoteJobTruth(
        {
          ...remoteJob,
          plaintext: JSON.stringify({
            dataset_id: envelope.dataset_id,
            expected_input_hash: envelope.expected_input_hash,
            capability_ticket_id: "8".repeat(32),
            executor_node_id: envelope.executor_node_id,
          }),
        },
        verified,
      ),
    /remote_job_capability_ticket_mismatch/,
  );
  assert.throws(
    () =>
      pilot.assertRemoteJobTruth(
        {
          ...remoteJob,
          plaintext: JSON.stringify({
            dataset_id: envelope.dataset_id,
            expected_input_hash: envelope.expected_input_hash,
            capability_ticket_id: envelope.ticket_id,
            executor_node_id: "7".repeat(32),
          }),
        },
        verified,
      ),
    /remote_job_executor_node_mismatch/,
  );

  const remoteReceipt = {
    receipt_id: envelope.receipt_id,
    job_id: envelope.job_id,
    account: envelope.account,
    kind: envelope.task_class,
    status: "completed",
    dataset_id: envelope.dataset_id,
    input_hash: envelope.input_hash,
    output_hash: envelope.output_hash,
    output: {
      verified: true,
      fetched_input_hash: envelope.fetched_input_hash,
    },
    ts_ms: envelope.receipt_ts_ms,
  };
  pilot.assertRemoteReceiptTruth(remoteReceipt, verified);
  assert.throws(
    () =>
      pilot.assertRemoteReceiptTruth(
        {
          ...remoteReceipt,
          ts_ms: envelope.receipt_ts_ms - 1,
        },
        verified,
      ),
    /remote_receipt_timestamp_mismatch/,
  );
  assert.throws(
    () =>
      pilot.assertRemoteReceiptTruth(
        {
          ...remoteReceipt,
          ts_ms: 0,
        },
        verified,
      ),
    /remote_receipt_timestamp_invalid/,
  );

  const lockTicketId = "9".repeat(32);
  const ownedLock = await pilot.acquirePilotTicketLock(lockTicketId, tmp);
  await assert.rejects(
    () => pilot.acquirePilotTicketLock(lockTicketId, tmp),
    /ticket_inflight/,
  );
  await pilot.releasePilotTicketLock(ownedLock);

  assert.throws(
    () =>
      pilot.verifyPilotResultEnvelope(
        {
          ...signed.envelope,
          output_hash: "d".repeat(64),
        },
        signed.signature,
      ),
    /executor_signature_invalid/,
  );

  const other = crypto.generateKeyPairSync("ed25519");
  const wrongSig = crypto
    .sign(
      null,
      pilot.pilotResultSigningBytes(signed.envelope),
      other.privateKey,
    )
    .toString("hex");

  assert.throws(
    () =>
      pilot.verifyPilotResultEnvelope(signed.envelope, {
        ...signed.signature,
        sig: wrongSig,
      }),
    /executor_signature_invalid/,
  );

  const imported = await pilot.persistImportedRemoteTruthOnce(
    signed.envelope,
    signed.signature,
    tmp,
  );
  assert.equal(imported.appended.receipt, true);
  assert.equal(imported.appended.job, true);
  assert.equal(imported.appended.completed, true);

  const importedAgain = await pilot.persistImportedRemoteTruthOnce(
    signed.envelope,
    signed.signature,
    tmp,
  );
  assert.equal(importedAgain.appended.receipt, false);
  assert.equal(importedAgain.appended.job, false);
  assert.equal(importedAgain.appended.completed, false);

  const raceTmp = fs.mkdtempSync(
    path.join(os.tmpdir(), "void-wc-public-earning-pilot-import-race-v1-"),
  );
  const raceEnvelope = {
    ...envelope,
    ticket_id: "6".repeat(32),
    job_id: "job_remote_executor_runtime_race_v1",
    receipt_id: "rcpt_remote_executor_runtime_race_v1",
    receipt_ts_ms: Date.now() + 1,
  };
  const raceSigned = pilot.signPilotResultEnvelope(
    raceEnvelope,
    privateKey,
  );
  const [raceOne, raceTwo] = await Promise.all([
    pilot.persistImportedRemoteTruthOnce(
      raceSigned.envelope,
      raceSigned.signature,
      raceTmp,
    ),
    pilot.persistImportedRemoteTruthOnce(
      raceSigned.envelope,
      raceSigned.signature,
      raceTmp,
    ),
  ]);
  const raced = [raceOne.appended, raceTwo.appended];
  for (const entry of raced) {
    const allTrue =
      entry.receipt === true &&
      entry.job === true &&
      entry.completed === true;
    const allFalse =
      entry.receipt === false &&
      entry.job === false &&
      entry.completed === false;
    assert.equal(
      allTrue || allFalse,
      true,
      "concurrent imported-truth result was partially appended",
    );
  }
  assert.equal(
    raced.filter(
      (entry) =>
        entry.receipt === true &&
        entry.job === true &&
        entry.completed === true,
    ).length,
    1,
  );
  assert.equal(
    raced.filter(
      (entry) =>
        entry.receipt === false &&
        entry.job === false &&
        entry.completed === false,
    ).length,
    1,
  );

  for (const file of [
    path.join(raceTmp, "agent_v1", "receipts.jsonl"),
    path.join(raceTmp, "agent", "jobs.jsonl"),
    path.join(raceTmp, "agent_v1", "job_state.jsonl"),
  ]) {
    const rows = fs
      .readFileSync(file, "utf8")
      .trim()
      .split(/\r?\n/)
      .filter(Boolean);
    assert.equal(
      rows.length,
      1,
      `concurrent imported truth duplicated ${file}`,
    );
  }

  remoteIndex.resetWcPublicRemoteTruthJsonlIndexForProofV1();
  const coldTmp = fs.mkdtempSync(
    path.join(os.tmpdir(), "void-wc-public-earning-pilot-cold-index-v1-"),
  );
  const coldPad = "x".repeat(768);
  const seedCold = (
    file: string,
    makeRow: (i: number) => Record<string, unknown>,
  ) => {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const fd = fs.openSync(file, "w", 0o600);
    try {
      for (let i = 0; i < 12_000; i++) {
        fs.writeSync(fd, JSON.stringify(makeRow(i)) + "\n");
      }
      fs.fdatasyncSync(fd);
    } finally {
      fs.closeSync(fd);
    }
  };
  const coldReceiptFile = path.join(
    coldTmp,
    "agent_v1",
    "receipts.jsonl",
  );
  const coldJobFile = path.join(coldTmp, "agent", "jobs.jsonl");
  const coldCompletedFile = path.join(
    coldTmp,
    "agent_v1",
    "job_state.jsonl",
  );
  seedCold(coldReceiptFile, (i) => ({
    receipt_id: `cold-seed-receipt-${i}`,
    job_id: `cold-seed-job-r-${i}`,
    account: "cold-seed",
    kind: "datanet_fetch_verify",
    status: "completed",
    dataset_id: "cold-seed",
    input_hash: "1".repeat(64),
    output_hash: "2".repeat(64),
    pad: coldPad,
  }));
  seedCold(coldJobFile, (i) => ({
    id: `cold-seed-job-${i}`,
    job_id: `cold-seed-job-${i}`,
    account: "cold-seed",
    kind: "datanet_fetch_verify",
    status: "queued",
    dataset_id: "cold-seed",
    pad: coldPad,
  }));
  seedCold(coldCompletedFile, (i) => ({
    job_id: `cold-seed-state-job-${i}`,
    receipt_id: `cold-seed-state-receipt-${i}`,
    status: "completed",
    dataset_id: "cold-seed",
    input_hash: "1".repeat(64),
    output_hash: "2".repeat(64),
    pad: coldPad,
  }));

  const coldEnvelope = {
    ...envelope,
    ticket_id: "4".repeat(32),
    job_id: "job_remote_executor_runtime_cold_v1",
    receipt_id: "rcpt_remote_executor_runtime_cold_v1",
    dataset_id: "ds_remote_executor_runtime_cold_v1",
    receipt_ts_ms: Date.now() + 2,
  };
  const coldSigned = pilot.signPilotResultEnvelope(
    coldEnvelope,
    privateKey,
  );
  const coldStarted = Date.now();
  const coldSettled = await Promise.allSettled(
    Array.from({ length: 4 }, () =>
      pilot.persistImportedRemoteTruthOnce(
        coldSigned.envelope,
        coldSigned.signature,
        coldTmp,
      ),
    ),
  );
  assert.ok(
    Date.now() - coldStarted < 3_000,
    "cold participant persistence calls waited behind full history warm",
  );
  assert.equal(
    coldSettled.every(
      (result) =>
        result.status === "rejected" &&
        String(
          (result as PromiseRejectedResult).reason?.message ||
            (result as PromiseRejectedResult).reason,
        ).includes("VOID_WC_REMOTE_TRUTH_INDEX_WARMING"),
    ),
    true,
    "cold participant persistence did not return deterministic warming HOLD",
  );

  const coldMetrics =
    remoteIndex.wcPublicRemoteTruthJsonlIndexMetricsV1().filter(
      (metric: any) => String(metric.file || "").startsWith(coldTmp),
    );
  assert.equal(coldMetrics.length, 3);
  for (const metric of coldMetrics) {
    assert.equal(
      metric.warm_starts_total,
      1,
      `cold participant path started duplicate warm generation: ${metric.file}`,
    );
    assert.equal(metric.canonical_appends_total, 0);
  }

  await Promise.all([
    remoteIndex.waitForWcPublicRemoteTruthJsonlIndexWarmForProofV1(
      coldReceiptFile,
      ["receipt_id"],
    ),
    remoteIndex.waitForWcPublicRemoteTruthJsonlIndexWarmForProofV1(
      coldJobFile,
      ["job_id"],
    ),
    remoteIndex.waitForWcPublicRemoteTruthJsonlIndexWarmForProofV1(
      coldCompletedFile,
      ["job_id", "receipt_id"],
    ),
  ]);

  const coldImported = await pilot.persistImportedRemoteTruthOnce(
    coldSigned.envelope,
    coldSigned.signature,
    coldTmp,
  );
  assert.equal(coldImported.appended.receipt, true);
  assert.equal(coldImported.appended.job, true);
  assert.equal(coldImported.appended.completed, true);

  const coldDuplicate = await pilot.persistImportedRemoteTruthOnce(
    coldSigned.envelope,
    coldSigned.signature,
    coldTmp,
  );
  assert.equal(coldDuplicate.appended.receipt, false);
  assert.equal(coldDuplicate.appended.job, false);
  assert.equal(coldDuplicate.appended.completed, false);

  const accepted = await acceptance.acceptVerifiedReceiptOnce(
    imported.receipt,
    {
      dataDir: tmp,
      expectedAccount: envelope.account,
      expectedJobId: envelope.job_id,
      expectedReceiptId: envelope.receipt_id,
      capabilityTicketId: envelope.ticket_id,
      source: "wc_public_earning_pilot_v1",
    },
  );

  assert.equal(accepted.credited, true);
  assert.equal(accepted.duplicate, false);
  assert.equal(accepted.award_wc, 3);
  assert.equal(accepted.entry.delta, 3);
  assert.equal(
    accepted.entry.reward_meta.capability_ticket_id,
    envelope.ticket_id,
  );
  assert.equal(
    accepted.entry.reward_meta.caller,
    "wc_public_earning_pilot_v1",
  );

  const duplicate = await acceptance.acceptVerifiedReceiptOnce(
    imported.receipt,
    {
      dataDir: tmp,
      expectedAccount: envelope.account,
      expectedJobId: envelope.job_id,
      expectedReceiptId: envelope.receipt_id,
      capabilityTicketId: envelope.ticket_id,
      source: "wc_public_earning_pilot_v1",
    },
  );

  assert.equal(duplicate.credited, false);
  assert.equal(duplicate.duplicate, true);
  assert.equal(duplicate.award_wc, 3);

  const state = await acceptance.readCanonicalWcState(
    envelope.account,
    tmp,
  );
  assert.equal(state.earned, 3);
  assert.equal(state.redeemable, 3);

  const ledger = fs
    .readFileSync(path.join(tmp, "wc_v1", "ledger.jsonl"), "utf8")
    .trim()
    .split(/\r?\n/)
    .map((line) => JSON.parse(line));

  assert.equal(ledger.length, 1);
  assert.equal(ledger[0].receipt_id, envelope.receipt_id);
  assert.equal(ledger[0].job_id, envelope.job_id);
  assert.equal(ledger[0].delta, 3);
  assert.equal(
    ledger[0].reward_meta.capability_ticket_id,
    envelope.ticket_id,
  );

  const receipts = fs
    .readFileSync(
      path.join(tmp, "agent_v1", "receipts.jsonl"),
      "utf8",
    )
    .trim()
    .split(/\r?\n/)
    .map((line) => JSON.parse(line));

  assert.equal(receipts.length, 1);
  assert.equal(
    receipts[0].remote_executor_provenance.executor_node_id,
    executorNodeId,
  );
  assert.equal(
    receipts[0].remote_executor_provenance.verified_remote_health,
    true,
  );
  assert.equal(
    receipts[0].remote_executor_provenance.verified_remote_job,
    true,
  );
  assert.equal(
    receipts[0].remote_executor_provenance.verified_remote_receipt,
    true,
  );


  process.env.VOID_WC_PUBLIC_EARNING_PILOT_ENABLED = "1";

  const jsonNamesForProofV28 = (
    dir: string,
  ): string[] => {
    if (!fs.existsSync(dir)) return [];
    return fs
      .readdirSync(dir)
      .filter((name) => name.endsWith(".json"))
      .sort();
  };

  const makeResponse = () => {
    const state: any = { statusCode: 0, payload: null };
    state.status = (code: number) => {
      state.statusCode = code;
      return state;
    };
    state.json = (payload: any) => {
      state.payload = payload;
      return payload;
    };
    return state;
  };

  const setupSubmit = (
    root: string,
    suffix: string,
    account = "ticket-transaction-account",
  ) => {
    process.env.DATA_DIR = root;
    process.env.VOID_DATA_DIR = root;
    const ticketId = crypto
      .createHash("md5")
      .update(`ticket-${suffix}`)
      .digest("hex");
    const secret = `secret_${suffix}`
      .replace(/[^A-Za-z0-9_-]/g, "x")
      .padEnd(24, "x");
    const token = `wcep1.${ticketId}.${secret}`;
    const nowSubmit = Date.now();
    const submitEnvelope = {
      ticket_id: ticketId,
      account,
      task_class: "datanet_fetch_verify",
      executor_node_id: executorNodeId,
      executor_pubkey: pubPEM,
      executor_http_base: "",
      transport_mode: "outbound_bundle" as const,
      dataset_id: `ds_${suffix}`,
      expected_input_hash: "a".repeat(64),
      job_id: `job_${suffix}`,
      receipt_id: `rcpt_${suffix}`,
      input_hash: "a".repeat(64),
      output_hash: "b".repeat(64),
      fetched_input_hash: "a".repeat(64),
      receipt_ts_ms: nowSubmit,
    };
    const submitSigned = pilot.signPilotResultEnvelope(
      submitEnvelope,
      privateKey,
    );
    const issued = path.join(
      root,
      "wc_v1",
      "public-earning-pilot-v1",
      "issued",
      `${ticketId}.json`,
    );
    fs.mkdirSync(path.dirname(issued), { recursive: true });
    fs.writeFileSync(
      issued,
      JSON.stringify(
        {
          marker: "VOID_WC_PUBLIC_EARNING_PILOT_V1",
          version: 1,
          ticket_id: ticketId,
          account,
          task_class: "datanet_fetch_verify",
          executor_node_id: executorNodeId,
          executor_http_base: "",
          transport_mode: "outbound_bundle",
          dataset_id: submitEnvelope.dataset_id,
          expected_input_hash: submitEnvelope.expected_input_hash,
          token_sha256: crypto
            .createHash("sha256")
            .update(token)
            .digest("hex"),
          nonce: "f".repeat(32),
          issued_at_ms: nowSubmit - 1000,
          expires_at_ms: nowSubmit + 60_000,
          max_uses: 1,
          status: "issued",
          public_submit_route:
            "/wc/public-earning-pilot-v1/submit-result",
          local_execute_route:
            "/wc/public-earning-pilot-v1/execute-local",
        },
        null,
        2,
      ) + "\n",
    );
    const job = {
      job_id: submitEnvelope.job_id,
      account,
      kind: "datanet_fetch_verify",
      dataset_id: submitEnvelope.dataset_id,
      plaintext: JSON.stringify({
        dataset_id: submitEnvelope.dataset_id,
        expected_input_hash: submitEnvelope.expected_input_hash,
        capability_ticket_id: ticketId,
        executor_node_id: executorNodeId,
      }),
      meta: {
        selected_dataset_id: submitEnvelope.dataset_id,
        capability_ticket_id: ticketId,
        executor_node_id: executorNodeId,
      },
    };
    const receipt = {
      receipt_id: submitEnvelope.receipt_id,
      job_id: submitEnvelope.job_id,
      account,
      kind: "datanet_fetch_verify",
      status: "completed",
      dataset_id: submitEnvelope.dataset_id,
      input_hash: submitEnvelope.input_hash,
      output_hash: submitEnvelope.output_hash,
      output: {
        verified: true,
        fetched_input_hash: submitEnvelope.fetched_input_hash,
      },
      ts_ms: submitEnvelope.receipt_ts_ms,
    };
    const proof_bundle = {
      marker: "VOID_WC_PUBLIC_EARNING_PILOT_V1",
      version: 1,
      transport_mode: "outbound_bundle",
      ticket_id: ticketId,
      executor_node_id: executorNodeId,
      job_id: submitEnvelope.job_id,
      receipt_id: submitEnvelope.receipt_id,
      health: { ok: true, nodeId: executorNodeId },
      job,
      receipt,
    };
    const req = {
      headers: { authorization: `Bearer ${token}` },
      body: {
        envelope: submitSigned.envelope,
        signature: submitSigned.signature,
        proof_bundle,
      },
    };
    return {
      ticketId,
      token,
      submitEnvelope,
      submitSigned,
      proof_bundle,
      req,
    };
  };

  const setupSubmitFromPublicClaim = (
    root: string,
    issuedClaim: any,
    suffix: string,
    provePossession = true,
  ) => {
    process.env.DATA_DIR = root;
    process.env.VOID_DATA_DIR = root;
    const ticketId = String(
      issuedClaim.ticket.ticket_id,
    );
    const token = String(
      issuedClaim.capability_token,
    );
    const account = String(
      issuedClaim.ticket.account,
    );
    const nowSubmit = Date.now();
    const submitEnvelope = {
      ticket_id: ticketId,
      account,
      task_class: "datanet_fetch_verify",
      executor_node_id: executorNodeId,
      executor_pubkey: pubPEM,
      executor_http_base: "",
      transport_mode: "outbound_bundle" as const,
      dataset_id: String(
        issuedClaim.ticket.dataset_id,
      ),
      expected_input_hash: String(
        issuedClaim.ticket.expected_input_hash,
      ),
      job_id: `job_${suffix}`,
      receipt_id: `rcpt_${suffix}`,
      input_hash: String(
        issuedClaim.ticket.expected_input_hash,
      ),
      output_hash: provePossession
        ? pilot.publicWorkPossessionProofV1(
            token,
            ticketId,
            publicWorkBytes,
          )
        : "b".repeat(64),
      fetched_input_hash: String(
        issuedClaim.ticket.expected_input_hash,
      ),
      receipt_ts_ms: nowSubmit,
    };
    const submitSigned =
      pilot.signPilotResultEnvelope(
        submitEnvelope,
        privateKey,
      );
    const job = {
      job_id: submitEnvelope.job_id,
      account,
      kind: "datanet_fetch_verify",
      dataset_id: submitEnvelope.dataset_id,
      plaintext: JSON.stringify({
        dataset_id: submitEnvelope.dataset_id,
        expected_input_hash:
          submitEnvelope.expected_input_hash,
        capability_ticket_id: ticketId,
        executor_node_id: executorNodeId,
      }),
      meta: {
        selected_dataset_id:
          submitEnvelope.dataset_id,
        capability_ticket_id: ticketId,
        executor_node_id: executorNodeId,
      },
    };
    const receipt = {
      receipt_id: submitEnvelope.receipt_id,
      job_id: submitEnvelope.job_id,
      account,
      kind: "datanet_fetch_verify",
      status: "completed",
      dataset_id: submitEnvelope.dataset_id,
      input_hash: submitEnvelope.input_hash,
      output_hash: submitEnvelope.output_hash,
      output: {
        verified: true,
        fetched_input_hash:
          submitEnvelope.fetched_input_hash,
      },
      ts_ms: submitEnvelope.receipt_ts_ms,
    };
    const proof_bundle = {
      marker: "VOID_WC_PUBLIC_EARNING_PILOT_V1",
      version: 1,
      transport_mode: "outbound_bundle",
      ticket_id: ticketId,
      executor_node_id: executorNodeId,
      job_id: submitEnvelope.job_id,
      receipt_id: submitEnvelope.receipt_id,
      health: {
        ok: true,
        nodeId: executorNodeId,
      },
      job,
      receipt,
    };
    return {
      req: {
        headers: {
          authorization: `Bearer ${token}`,
        },
        body: {
          envelope: submitSigned.envelope,
          signature: submitSigned.signature,
          proof_bundle,
        },
      },
      ticketId,
      token,
    };
  };

  // Acceptance-safety falsifier: a valid public ticket/key plus the old
  // fully self-consistent participant-authored bundle must earn and import
  // nothing when the selected dataset bytes were never possessed.
  {
    const root = fs.mkdtempSync(
      path.join(
        os.tmpdir(),
        "void-wc-self-attested-no-work-v1-",
      ),
    );
    process.env.DATA_DIR = root;
    process.env.VOID_DATA_DIR = root;
    process.env.VOID_WC_PUBLIC_EARNING_PILOT_ENABLED =
      "1";
    process.env.VOID_WC_PUBLIC_TICKET_CLAIM_ENABLED =
      "1";
    process.env.VOID_WC_PUBLIC_TICKET_CLAIM_DATASET_ID =
      "ds_self_attested_no_work_v1";
    process.env.VOID_WC_PUBLIC_TICKET_CLAIM_EXPECTED_INPUT_HASH =
      publicWorkHash;
    process.env.VOID_WC_PUBLIC_TICKET_CLAIM_TTL_MS =
      "300000";
    process.env.VOID_WC_PUBLIC_TICKET_CLAIM_CLOCK_SKEW_MS =
      "300000";
    process.env.VOID_WC_PUBLIC_TICKET_CLAIM_COOLDOWN_MS =
      "60000";
    process.env.VOID_WC_PUBLIC_TICKET_CLAIM_MAX_PER_24H =
      "10";
    process.env.VOID_WC_PUBLIC_TICKET_CLAIM_GLOBAL_ACTIVE_CAP =
      "10";
    process.env.VOID_WC_PUBLIC_TICKET_CLAIM_GLOBAL_MAX_PER_24H =
      "100";

    claimAuthority.primeWcPublicClaimHistoryAuthorityV1(
      root,
    );
    await claimAuthority.waitForWcPublicClaimHistoryWarmForProofV1(
      root,
    );

    const account = "self-attested-no-work-account";
    const nowClaim = Date.now();
    const signedClaim = pilot.signPublicTicketClaim(
      {
        domain:
          "void:mainnet-0:wc-public-ticket-claim-v1",
        marker: "VOID_WC_PUBLIC_TICKET_CLAIM_V1",
        version: 1,
        account,
        executor_node_id: executorNodeId,
        executor_pubkey: pubPEM,
        claim_nonce: "e".repeat(32),
        claim_ts_ms: nowClaim,
      },
      privateKey,
    );
    const issued =
      await pilot.issuePublicTicketClaim(
        signedClaim,
        root,
        nowClaim,
      );

    const fabricated =
      setupSubmitFromPublicClaim(
        root,
        issued,
        "self_attested_without_dataset",
        false,
      );
    remoteIndex.resetWcPublicRemoteTruthJsonlIndexForProofV1();

    const rejected = makeResponse();
    await pilot.submitRemoteResult(
      fabricated.req,
      rejected,
    );
    assert.equal(rejected.statusCode, 422);
    assert.equal(
      rejected.payload.error,
      "useful_work_possession_invalid",
    );

    for (const file of [
      path.join(root, "agent_v1", "receipts.jsonl"),
      path.join(root, "agent", "jobs.jsonl"),
      path.join(root, "agent_v1", "job_state.jsonl"),
      path.join(root, "wc_v1", "ledger.jsonl"),
    ]) {
      assert.equal(
        fs.existsSync(file),
        false,
        `self-attested no-work submission published ${file}`,
      );
    }

    const pilotRoot = path.join(
      root,
      "wc_v1",
      "public-earning-pilot-v1",
    );
    assert.equal(
      fs.existsSync(
        path.join(
          pilotRoot,
          "result-transactions",
          `${fabricated.ticketId}.json`,
        ),
      ),
      false,
    );
    assert.equal(
      fs.existsSync(
        path.join(
          pilotRoot,
          "consumed",
          `${fabricated.ticketId}.json`,
        ),
      ),
      false,
    );
    assert.equal(
      fs.existsSync(
        path.join(
          pilotRoot,
          "issued",
          `${fabricated.ticketId}.json`,
        ),
      ),
      true,
    );

    // The exact same live capability may still do the selected work once.
    const legitimate =
      setupSubmitFromPublicClaim(
        root,
        issued,
        "real_dataset_possession",
        true,
      );
    const accepted = makeResponse();
    await pilot.submitRemoteResult(
      legitimate.req,
      accepted,
    );
    assert.equal(accepted.statusCode, 200);
    assert.equal(accepted.payload.wc.delta, 3);
    assert.equal(
      accepted.payload.independent_useful_work_verified,
      true,
    );
    assert.equal(
      accepted.payload.useful_work_proof_mode,
      "capability_hmac_over_verified_dataset_bytes_v1",
    );

    const ledgerRows = fs
      .readFileSync(
        path.join(root, "wc_v1", "ledger.jsonl"),
        "utf8",
      )
      .trim()
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => JSON.parse(line));
    assert.equal(ledgerRows.length, 1);
    assert.equal(ledgerRows[0].delta, 3);

    fs.rmSync(root, {
      recursive: true,
      force: true,
    });
  }

  for (const phase of [
    "after_intent_prepared",
    "after_truth_imported",
    "after_acceptance_before_journal",
    "after_credit",
    "after_consumed_projection",
  ]) {
    const root = fs.mkdtempSync(
      path.join(os.tmpdir(), `void-wc-ticket-txn-${phase}-`),
    );
    remoteIndex.resetWcPublicRemoteTruthJsonlIndexForProofV1();
    const fx = setupSubmit(root, phase);
    pilot.setPilotTransactionFaultForProofV1(phase);
    const first = makeResponse();
    await pilot.submitRemoteResult(fx.req, first);
    assert.equal(
      first.statusCode,
      422,
      `fault phase did not stop: ${phase}`,
    );
    pilot.setPilotTransactionFaultForProofV1("");

    const retry = makeResponse();
    await pilot.submitRemoteResult(fx.req, retry);
    assert.equal(
      retry.statusCode,
      200,
      `exact retry did not recover: ${phase}`,
    );

    const again = makeResponse();
    await pilot.submitRemoteResult(fx.req, again);
    assert.equal(
      again.statusCode,
      200,
      `terminal retry failed: ${phase}`,
    );
    assert.equal(again.payload.idempotent, true);

    const ledgerPath = path.join(root, "wc_v1", "ledger.jsonl");
    const rows = fs
      .readFileSync(ledgerPath, "utf8")
      .trim()
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => JSON.parse(line));
    assert.equal(rows.length, 1, `duplicate credit after ${phase}`);
    assert.equal(
      rows[0].reward_meta.capability_ticket_id,
      fx.ticketId,
    );

    const consumed = path.join(
      root,
      "wc_v1",
      "public-earning-pilot-v1",
      "consumed",
      `${fx.ticketId}.json`,
    );
    const issued = path.join(
      root,
      "wc_v1",
      "public-earning-pilot-v1",
      "issued",
      `${fx.ticketId}.json`,
    );
    const journal = path.join(
      root,
      "wc_v1",
      "public-earning-pilot-v1",
      "result-transactions",
      `${fx.ticketId}.json`,
    );
    assert.equal(fs.existsSync(consumed), true);
    const consumedRecord = JSON.parse(
      fs.readFileSync(consumed, "utf8"),
    );
    assert.equal(consumedRecord.wc_delta, 3);
    assert.equal(fs.existsSync(issued), false);
    assert.equal(
      JSON.parse(fs.readFileSync(journal, "utf8")).phase,
      "completed",
    );
    fs.rmSync(root, { recursive: true, force: true });
  }

  {
    const root = fs.mkdtempSync(
      path.join(os.tmpdir(), "void-wc-ticket-txn-audit-"),
    );
    remoteIndex.resetWcPublicRemoteTruthJsonlIndexForProofV1();
    const fx = setupSubmit(root, "audit");
    pilot.setPilotTransactionFaultForProofV1(
      "audit_after_commit",
    );
    const response = makeResponse();
    await pilot.submitRemoteResult(fx.req, response);
    pilot.setPilotTransactionFaultForProofV1("");
    assert.equal(
      response.statusCode,
      200,
      "post-terminal audit fault replaced success",
    );
    const rows = fs
      .readFileSync(
        path.join(root, "wc_v1", "ledger.jsonl"),
        "utf8",
      )
      .trim()
      .split(/\r?\n/)
      .filter(Boolean);
    assert.equal(rows.length, 1);
    fs.rmSync(root, { recursive: true, force: true });
  }

  {
    const root = fs.mkdtempSync(
      path.join(
        os.tmpdir(),
        "void-wc-ticket-txn-same-account-",
      ),
    );
    remoteIndex.resetWcPublicRemoteTruthJsonlIndexForProofV1();
    const one = setupSubmit(
      root,
      "same-account-one",
      "same-account",
    );
    const two = setupSubmit(
      root,
      "same-account-two",
      "same-account",
    );
    const resOne = makeResponse();
    const resTwo = makeResponse();
    await Promise.all([
      pilot.submitRemoteResult(one.req, resOne),
      pilot.submitRemoteResult(two.req, resTwo),
    ]);

    const attempts = [
      { fixture: one, response: resOne },
      { fixture: two, response: resTwo },
    ];
    for (const attempt of attempts) {
      assert.equal(
        attempt.response.statusCode === 200 ||
          attempt.response.statusCode === 409,
        true,
        `unexpected concurrent status ${attempt.response.statusCode}`,
      );
      if (attempt.response.statusCode === 200) {
        assert.equal(attempt.response.payload.wc.delta, 3);
        continue;
      }
      assert.equal(
        attempt.response.payload.error === "acceptance_busy" ||
          attempt.response.payload.error ===
            "wc_process_lock_contention_retry_exhausted",
        true,
        `unexpected retryable contention ${attempt.response.payload.error}`,
      );
      const retry = makeResponse();
      await pilot.submitRemoteResult(attempt.fixture.req, retry);
      assert.equal(
        retry.statusCode,
        200,
        "retryable same-account contention did not recover",
      );
      assert.equal(retry.payload.wc.delta, 3);
    }
    const sameState = await acceptance.readCanonicalWcState(
      "same-account",
      root,
    );
    assert.equal(sameState.redeemable, 6);
    assert.equal(sameState.redeemable_exact, "6");
    assert.equal(sameState.redeemable_quanta, "6000000000");
    fs.rmSync(root, { recursive: true, force: true });
  }

  {
    const root = fs.mkdtempSync(
      path.join(os.tmpdir(), "void-wc-ticket-txn-high-balance-"),
    );
    remoteIndex.resetWcPublicRemoteTruthJsonlIndexForProofV1();
    const account = "ticket-high-balance";
    const ledgerFile = path.join(root, "wc_v1", "ledger.jsonl");
    fs.mkdirSync(path.dirname(ledgerFile), { recursive: true });
    fs.appendFileSync(
      ledgerFile,
      JSON.stringify({
        kind: "credit",
        account,
        delta: Number.MAX_SAFE_INTEGER,
      }) + "\n",
    );
    fs.appendFileSync(
      ledgerFile,
      JSON.stringify({
        kind: "credit",
        account,
        delta: 1,
      }) + "\n",
    );
    const fx = setupSubmit(root, "high-balance", account);
    const response = makeResponse();
    await pilot.submitRemoteResult(fx.req, response);
    assert.equal(response.statusCode, 200);
    assert.equal(response.payload.wc.delta, 3);
    assert.equal(
      response.payload.wc.before_exact,
      "9007199254740992",
    );
    assert.equal(
      response.payload.wc.after_local_exact,
      "9007199254740995",
    );
    assert.equal(response.payload.wc.before, null);
    assert.equal(response.payload.wc.after_local, null);

    const highConsumedFile = path.join(
      root,
      "wc_v1",
      "public-earning-pilot-v1",
      "consumed",
      `${fx.ticketId}.json`,
    );
    const highConsumed = JSON.parse(
      fs.readFileSync(highConsumedFile, "utf8"),
    );
    assert.equal(
      highConsumed.canonical_redeemable_after_local,
      null,
    );
    assert.equal(
      highConsumed.canonical_redeemable_after_local_exact,
      "9007199254740995",
    );

    const replay = makeResponse();
    await pilot.submitRemoteResult(fx.req, replay);
    assert.equal(replay.statusCode, 200);
    assert.equal(replay.payload.idempotent, true);
    assert.equal(
      replay.payload.wc.canonical_redeemable_after_local,
      null,
    );
    assert.equal(
      replay.payload.wc
        .canonical_redeemable_after_local_exact,
      "9007199254740995",
    );

    const exactState = await acceptance.readCanonicalWcState(
      account,
      root,
    );
    assert.equal(
      exactState.redeemable_exact,
      "9007199254740995",
    );
    assert.equal(exactState.redeemable, null);
    fs.rmSync(root, { recursive: true, force: true });
  }

  {
    const root = fs.mkdtempSync(
      path.join(os.tmpdir(), "void-wc-ticket-txn-conflict-"),
    );
    remoteIndex.resetWcPublicRemoteTruthJsonlIndexForProofV1();
    const fx = setupSubmit(root, "conflict");
    const success = makeResponse();
    await pilot.submitRemoteResult(fx.req, success);
    assert.equal(success.statusCode, 200);

    const altEnvelope = {
      ...fx.submitSigned.envelope,
      job_id: "job_conflict_alt",
      receipt_id: "rcpt_conflict_alt",
      receipt_ts_ms:
        fx.submitSigned.envelope.receipt_ts_ms + 1,
    };
    const altSigned = pilot.signPilotResultEnvelope(
      altEnvelope,
      privateKey,
    );
    const altReq = {
      ...fx.req,
      body: {
        ...fx.req.body,
        envelope: altSigned.envelope,
        signature: altSigned.signature,
      },
    };
    const conflict = makeResponse();
    await pilot.submitRemoteResult(altReq, conflict);
    assert.equal(conflict.statusCode, 409);
    assert.equal(
      conflict.payload.error,
      "capability_result_conflict",
    );
    const rows = fs
      .readFileSync(
        path.join(root, "wc_v1", "ledger.jsonl"),
        "utf8",
      )
      .trim()
      .split(/\r?\n/)
      .filter(Boolean);
    assert.equal(rows.length, 1);
    fs.rmSync(root, { recursive: true, force: true });
  }


  {
    const root = fs.mkdtempSync(
      path.join(os.tmpdir(), "void-wc-remote-truth-public-warming-"),
    );
    remoteIndex.resetWcPublicRemoteTruthJsonlIndexForProofV1();
    const fx = setupSubmit(root, "public-warming");
    const receiptFile = path.join(root, "agent_v1", "receipts.jsonl");
    const jobFile = path.join(root, "agent", "jobs.jsonl");
    const completedFile = path.join(root, "agent_v1", "job_state.jsonl");
    for (const [file, row] of [
      [
        receiptFile,
        {
          receipt_id: "seed-public-warming-receipt",
          job_id: "seed-public-warming-job",
          account: "seed-public-warming",
          status: "completed",
        },
      ],
      [
        jobFile,
        {
          job_id: "seed-public-warming-job",
          account: "seed-public-warming",
          status: "queued",
        },
      ],
      [
        completedFile,
        {
          job_id: "seed-public-warming-job",
          receipt_id: "seed-public-warming-receipt",
          status: "completed",
        },
      ],
    ] as const) {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, JSON.stringify(row) + "\n");
    }

    const response = makeResponse();
    await pilot.submitRemoteResult(fx.req, response);
    assert.equal(response.statusCode, 503);
    assert.equal(response.payload.error, "remote_truth_warming");
    const publicText = JSON.stringify(response.payload);
    assert.equal(publicText.includes(root), false);
    assert.equal(publicText.includes("file="), false);
    assert.equal(publicText.includes("VOID_WC_REMOTE_TRUTH_"), false);

    await Promise.allSettled([
      remoteIndex.waitForWcPublicRemoteTruthJsonlIndexWarmForProofV1(
        receiptFile,
        ["receipt_id"],
      ),
      remoteIndex.waitForWcPublicRemoteTruthJsonlIndexWarmForProofV1(
        jobFile,
        ["job_id"],
      ),
      remoteIndex.waitForWcPublicRemoteTruthJsonlIndexWarmForProofV1(
        completedFile,
        ["job_id", "receipt_id"],
      ),
    ]);
    fs.rmSync(root, { recursive: true, force: true });
  }

  {
    const root = fs.mkdtempSync(
      path.join(os.tmpdir(), "void-wc-remote-truth-public-malformed-"),
    );
    remoteIndex.resetWcPublicRemoteTruthJsonlIndexForProofV1();
    const fx = setupSubmit(root, "public-malformed");
    const receiptFile = path.join(root, "agent_v1", "receipts.jsonl");
    const jobFile = path.join(root, "agent", "jobs.jsonl");
    const completedFile = path.join(root, "agent_v1", "job_state.jsonl");

    fs.mkdirSync(path.dirname(receiptFile), { recursive: true });
    fs.writeFileSync(receiptFile, '{"broken":\n');
    fs.mkdirSync(path.dirname(jobFile), { recursive: true });
    fs.writeFileSync(
      jobFile,
      JSON.stringify({
        job_id: "seed-public-malformed-job",
        account: "seed-public-malformed",
        status: "queued",
      }) + "\n",
    );
    fs.mkdirSync(path.dirname(completedFile), { recursive: true });
    fs.writeFileSync(
      completedFile,
      JSON.stringify({
        job_id: "seed-public-malformed-job",
        receipt_id: "seed-public-malformed-receipt",
        status: "completed",
      }) + "\n",
    );

    const warming = makeResponse();
    await pilot.submitRemoteResult(fx.req, warming);
    assert.equal(warming.statusCode, 503);
    assert.equal(warming.payload.error, "remote_truth_warming");

    await Promise.allSettled([
      remoteIndex.waitForWcPublicRemoteTruthJsonlIndexWarmForProofV1(
        receiptFile,
        ["receipt_id"],
      ),
      remoteIndex.waitForWcPublicRemoteTruthJsonlIndexWarmForProofV1(
        jobFile,
        ["job_id"],
      ),
      remoteIndex.waitForWcPublicRemoteTruthJsonlIndexWarmForProofV1(
        completedFile,
        ["job_id", "receipt_id"],
      ),
    ]);

    const malformed = makeResponse();
    await pilot.submitRemoteResult(fx.req, malformed);
    assert.equal(malformed.statusCode, 503);
    assert.equal(malformed.payload.error, "remote_truth_history_invalid");
    const publicText = JSON.stringify(malformed.payload);
    assert.equal(publicText.includes(root), false);
    assert.equal(publicText.includes("file="), false);
    assert.equal(publicText.includes("VOID_WC_REMOTE_TRUTH_"), false);

    const audit = fs.readFileSync(
      path.join(
        root,
        "wc_v1",
        "public-earning-pilot-v1",
        "audit.jsonl",
      ),
      "utf8",
    );
    assert.equal(audit.includes(root), true);
    assert.equal(
      fs.existsSync(path.join(root, "wc_v1", "ledger.jsonl")),
      false,
    );
    fs.rmSync(root, { recursive: true, force: true });
  }


  {
    const root = fs.mkdtempSync(
      path.join(
        os.tmpdir(),
        "void-wc-claim-recovery-vs-real-submit-",
      ),
    );
    process.env.DATA_DIR = root;
    process.env.VOID_DATA_DIR = root;
    process.env.VOID_WC_PUBLIC_EARNING_PILOT_ENABLED =
      "1";
    process.env.VOID_WC_PUBLIC_TICKET_CLAIM_ENABLED =
      "1";
    process.env.VOID_WC_PUBLIC_TICKET_CLAIM_DATASET_ID =
      "ds_recovery_vs_real_submit";
    process.env.VOID_WC_PUBLIC_TICKET_CLAIM_EXPECTED_INPUT_HASH =
      publicWorkHash;
    process.env.VOID_WC_PUBLIC_TICKET_CLAIM_TTL_MS =
      "120000";
    process.env.VOID_WC_PUBLIC_TICKET_CLAIM_CLOCK_SKEW_MS =
      "30000";
    process.env.VOID_WC_PUBLIC_TICKET_CLAIM_COOLDOWN_MS =
      "60000";
    process.env.VOID_WC_PUBLIC_TICKET_CLAIM_MAX_PER_24H =
      "10";
    process.env.VOID_WC_PUBLIC_TICKET_CLAIM_GLOBAL_ACTIVE_CAP =
      "10";
    process.env.VOID_WC_PUBLIC_TICKET_CLAIM_GLOBAL_MAX_PER_24H =
      "100";

    claimAuthority.primeWcPublicClaimHistoryAuthorityV1(
      root,
    );
    await claimAuthority.waitForWcPublicClaimHistoryWarmForProofV1(
      root,
    );

    const signedClaim = pilot.signPublicTicketClaim(
      {
        domain:
          "void:mainnet-0:wc-public-ticket-claim-v1",
        marker: "VOID_WC_PUBLIC_TICKET_CLAIM_V1",
        version: 1,
        account: "recovery-real-submit-account",
        executor_node_id: executorNodeId,
        executor_pubkey: pubPEM,
        claim_nonce: "9".repeat(32),
        claim_ts_ms: Date.now(),
      },
      privateKey,
    );
    const issuedClaim =
      await pilot.issuePublicTicketClaim(
        signedClaim,
        root,
      );
    await claimAuthority.waitForWcPublicClaimHistoryWarmForProofV1(
      root,
    );

    const submit = setupSubmitFromPublicClaim(
      root,
      issuedClaim,
      "recovery_real_submit",
    );

    let reachedResolve!: () => void;
    let releaseResolve!: () => void;
    const reached = new Promise<void>(
      (resolve) => {
        reachedResolve = resolve;
      },
    );
    const release = new Promise<void>(
      (resolve) => {
        releaseResolve = resolve;
      },
    );

    pilot.setPublicClaimRecoveryBeforeTicketLockHookForProofV1(
      async () => {
        reachedResolve();
        await release;
      },
    );

    const replayPromise =
      pilot.issuePublicTicketClaim(
        signedClaim,
        root,
      );
    await reached;

    remoteIndex.resetWcPublicRemoteTruthJsonlIndexForProofV1();
    const submitResponse = makeResponse();
    await pilot.submitRemoteResult(
      submit.req,
      submitResponse,
    );
    assert.equal(
      submitResponse.statusCode,
      200,
      "real submission did not consume ticket while recovery paused",
    );
    assert.equal(
      submitResponse.payload.wc.delta,
      3,
    );

    releaseResolve();
    try {
      await assert.rejects(
        () => replayPromise,
        /public_claim_capability_consumed/,
      );
    } finally {
      pilot.setPublicClaimRecoveryBeforeTicketLockHookForProofV1(
        null,
      );
    }

    const ledgerRows = fs
      .readFileSync(
        path.join(
          root,
          "wc_v1",
          "ledger.jsonl",
        ),
        "utf8",
      )
      .trim()
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => JSON.parse(line));
    assert.equal(ledgerRows.length, 1);
    assert.equal(ledgerRows[0].delta, 3);
    assert.equal(
      ledgerRows[0].reward_meta
        .capability_ticket_id,
      issuedClaim.ticket.ticket_id,
    );
    assert.equal(
      fs.existsSync(
        path.join(
          root,
          "wc_v1",
          "public-earning-pilot-v1",
          "issued",
          `${issuedClaim.ticket.ticket_id}.json`,
        ),
      ),
      false,
    );
    assert.equal(
      fs.existsSync(
        path.join(
          root,
          "wc_v1",
          "public-earning-pilot-v1",
          "consumed",
          `${issuedClaim.ticket.ticket_id}.json`,
        ),
      ),
      true,
    );

    fs.rmSync(root, {
      recursive: true,
      force: true,
    });
  }

  {
    const root = fs.mkdtempSync(
      path.join(
        os.tmpdir(),
        "void-wc-claim-recovery-wins-before-submit-",
      ),
    );
    process.env.DATA_DIR = root;
    process.env.VOID_DATA_DIR = root;
    process.env.VOID_WC_PUBLIC_EARNING_PILOT_ENABLED =
      "1";
    process.env.VOID_WC_PUBLIC_TICKET_CLAIM_ENABLED =
      "1";
    process.env.VOID_WC_PUBLIC_TICKET_CLAIM_DATASET_ID =
      "ds_recovery_wins_before_submit";
    process.env.VOID_WC_PUBLIC_TICKET_CLAIM_EXPECTED_INPUT_HASH =
      publicWorkHash;
    process.env.VOID_WC_PUBLIC_TICKET_CLAIM_TTL_MS =
      "120000";
    process.env.VOID_WC_PUBLIC_TICKET_CLAIM_CLOCK_SKEW_MS =
      "30000";
    process.env.VOID_WC_PUBLIC_TICKET_CLAIM_COOLDOWN_MS =
      "60000";
    process.env.VOID_WC_PUBLIC_TICKET_CLAIM_MAX_PER_24H =
      "10";
    process.env.VOID_WC_PUBLIC_TICKET_CLAIM_GLOBAL_ACTIVE_CAP =
      "10";
    process.env.VOID_WC_PUBLIC_TICKET_CLAIM_GLOBAL_MAX_PER_24H =
      "100";

    claimAuthority.primeWcPublicClaimHistoryAuthorityV1(
      root,
    );
    await claimAuthority.waitForWcPublicClaimHistoryWarmForProofV1(
      root,
    );

    const signedClaim = pilot.signPublicTicketClaim(
      {
        domain:
          "void:mainnet-0:wc-public-ticket-claim-v1",
        marker: "VOID_WC_PUBLIC_TICKET_CLAIM_V1",
        version: 1,
        account: "recovery-wins-account",
        executor_node_id: executorNodeId,
        executor_pubkey: pubPEM,
        claim_nonce: "8".repeat(32),
        claim_ts_ms: Date.now(),
      },
      privateKey,
    );
    const issuedClaim =
      await pilot.issuePublicTicketClaim(
        signedClaim,
        root,
      );
    await claimAuthority.waitForWcPublicClaimHistoryWarmForProofV1(
      root,
    );

    const recovered =
      await pilot.issuePublicTicketClaim(
        signedClaim,
        root,
      );
    assert.equal(
      recovered.capability_token,
      issuedClaim.capability_token,
    );
    assert.equal(
      recovered.ticket.ticket_id,
      issuedClaim.ticket.ticket_id,
    );

    const submit = setupSubmitFromPublicClaim(
      root,
      recovered,
      "recovery_wins",
    );
    remoteIndex.resetWcPublicRemoteTruthJsonlIndexForProofV1();
    const response = makeResponse();
    await pilot.submitRemoteResult(
      submit.req,
      response,
    );
    assert.equal(response.statusCode, 200);
    assert.equal(response.payload.wc.delta, 3);

    const ledgerRows = fs
      .readFileSync(
        path.join(
          root,
          "wc_v1",
          "ledger.jsonl",
        ),
        "utf8",
      )
      .trim()
      .split(/\r?\n/)
      .filter(Boolean);
    assert.equal(ledgerRows.length, 1);

    fs.rmSync(root, {
      recursive: true,
      force: true,
    });
  }


  {
    const root = fs.mkdtempSync(
      path.join(
        os.tmpdir(),
        "void-wc-claim-recovery-daily-turnover-",
      ),
    );
    process.env.DATA_DIR = root;
    process.env.VOID_DATA_DIR = root;
    process.env.VOID_WC_PUBLIC_EARNING_PILOT_ENABLED =
      "1";
    process.env.VOID_WC_PUBLIC_TICKET_CLAIM_ENABLED =
      "1";
    process.env.VOID_WC_PUBLIC_TICKET_CLAIM_DATASET_ID =
      "ds_recovery_daily-turnover";
    process.env.VOID_WC_PUBLIC_TICKET_CLAIM_EXPECTED_INPUT_HASH =
      publicWorkHash;
    process.env.VOID_WC_PUBLIC_TICKET_CLAIM_TTL_MS =
      "120000";
    process.env.VOID_WC_PUBLIC_TICKET_CLAIM_CLOCK_SKEW_MS =
      "30000";
    process.env.VOID_WC_PUBLIC_TICKET_CLAIM_COOLDOWN_MS =
      "60000";
    process.env.VOID_WC_PUBLIC_TICKET_CLAIM_MAX_PER_24H =
      "1";
    process.env.VOID_WC_PUBLIC_TICKET_CLAIM_GLOBAL_ACTIVE_CAP =
      "10";
    process.env.VOID_WC_PUBLIC_TICKET_CLAIM_GLOBAL_MAX_PER_24H =
      "100";

    claimAuthority.primeWcPublicClaimHistoryAuthorityV1(
      root,
    );
    await claimAuthority.waitForWcPublicClaimHistoryWarmForProofV1(
      root,
    );

    const oldClaim = pilot.signPublicTicketClaim(
      {
        domain:
          "void:mainnet-0:wc-public-ticket-claim-v1",
        marker: "VOID_WC_PUBLIC_TICKET_CLAIM_V1",
        version: 1,
        account: "recovery-real-daily-turnover",
        executor_node_id: executorNodeId,
        executor_pubkey: pubPEM,
        claim_nonce: "4".repeat(32),
        claim_ts_ms: Date.now(),
      },
      privateKey,
    );

    pilot.setPilotTransactionFaultForProofV1(
      "public_claim_after_reservation",
    );
    try {
      await assert.rejects(
        () =>
          pilot.issuePublicTicketClaim(
            oldClaim,
            root,
          ),
        /VOID_WC_PILOT_PROOF_FAULT_public_claim_after_reservation/,
      );
    } finally {
      pilot.setPilotTransactionFaultForProofV1("");
    }

    await claimAuthority.waitForWcPublicClaimHistoryWarmForProofV1(
      root,
    );

    const winnerClaim = pilot.signPublicTicketClaim(
      {
        domain:
          "void:mainnet-0:wc-public-ticket-claim-v1",
        marker: "VOID_WC_PUBLIC_TICKET_CLAIM_V1",
        version: 1,
        account: "recovery-real-daily-turnover",
        executor_node_id: executorNodeId,
        executor_pubkey: pubPEM,
        claim_nonce: "5".repeat(32),
        claim_ts_ms: Date.now(),
      },
      privateKey,
    );
    const winner =
      await pilot.issuePublicTicketClaim(
        winnerClaim,
        root,
      );
    await claimAuthority.waitForWcPublicClaimHistoryWarmForProofV1(
      root,
    );

    const submit = setupSubmitFromPublicClaim(
      root,
      winner,
      "recovery_daily-turnover_winner",
    );
    remoteIndex.resetWcPublicRemoteTruthJsonlIndexForProofV1();
    const submitResponse = makeResponse();
    await pilot.submitRemoteResult(
      submit.req,
      submitResponse,
    );
    assert.equal(submitResponse.statusCode, 200);
    assert.equal(submitResponse.payload.wc.delta, 3);

    await claimAuthority.waitForWcPublicClaimHistoryWarmForProofV1(
      root,
    );
    const policy =
      claimAuthority.wcPublicClaimHistorySnapshotV1(
        root,
        Date.now(),
        "recovery-real-daily-turnover",
        executorNodeId,
        30000,
      );
    assert.equal(policy.active, 0);
    assert.equal(policy.active_account, 0);
    assert.equal(policy.account_24h, 1);
    assert.equal(policy.executor_24h, 1);

    await assert.rejects(
      () =>
        pilot.issuePublicTicketClaim(
          oldClaim,
          root,
        ),
      /public_claim_account_daily_cap_reached/,
    );

    const ledgerRows = fs
      .readFileSync(
        path.join(
          root,
          "wc_v1",
          "ledger.jsonl",
        ),
        "utf8",
      )
      .trim()
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => JSON.parse(line));
    assert.equal(ledgerRows.length, 1);
    assert.equal(ledgerRows[0].delta, 3);
    assert.equal(
      jsonNamesForProofV28(
        path.join(
          root,
          "wc_v1",
          "public-earning-pilot-v1",
          "issued",
        ),
      ).length,
      0,
    );

    fs.rmSync(root, {
      recursive: true,
      force: true,
    });
  }

  {
    const root = fs.mkdtempSync(
      path.join(
        os.tmpdir(),
        "void-wc-claim-recovery-cooldown-turnover-",
      ),
    );
    process.env.DATA_DIR = root;
    process.env.VOID_DATA_DIR = root;
    process.env.VOID_WC_PUBLIC_EARNING_PILOT_ENABLED =
      "1";
    process.env.VOID_WC_PUBLIC_TICKET_CLAIM_ENABLED =
      "1";
    process.env.VOID_WC_PUBLIC_TICKET_CLAIM_DATASET_ID =
      "ds_recovery_cooldown-turnover";
    process.env.VOID_WC_PUBLIC_TICKET_CLAIM_EXPECTED_INPUT_HASH =
      publicWorkHash;
    process.env.VOID_WC_PUBLIC_TICKET_CLAIM_TTL_MS =
      "120000";
    process.env.VOID_WC_PUBLIC_TICKET_CLAIM_CLOCK_SKEW_MS =
      "30000";
    process.env.VOID_WC_PUBLIC_TICKET_CLAIM_COOLDOWN_MS =
      "60000";
    process.env.VOID_WC_PUBLIC_TICKET_CLAIM_MAX_PER_24H =
      "10";
    process.env.VOID_WC_PUBLIC_TICKET_CLAIM_GLOBAL_ACTIVE_CAP =
      "10";
    process.env.VOID_WC_PUBLIC_TICKET_CLAIM_GLOBAL_MAX_PER_24H =
      "100";

    claimAuthority.primeWcPublicClaimHistoryAuthorityV1(
      root,
    );
    await claimAuthority.waitForWcPublicClaimHistoryWarmForProofV1(
      root,
    );

    const oldClaim = pilot.signPublicTicketClaim(
      {
        domain:
          "void:mainnet-0:wc-public-ticket-claim-v1",
        marker: "VOID_WC_PUBLIC_TICKET_CLAIM_V1",
        version: 1,
        account: "recovery-real-cooldown-turnover",
        executor_node_id: executorNodeId,
        executor_pubkey: pubPEM,
        claim_nonce: "6".repeat(32),
        claim_ts_ms: Date.now(),
      },
      privateKey,
    );

    pilot.setPilotTransactionFaultForProofV1(
      "public_claim_after_publishing_journal",
    );
    try {
      await assert.rejects(
        () =>
          pilot.issuePublicTicketClaim(
            oldClaim,
            root,
          ),
        /VOID_WC_PILOT_PROOF_FAULT_public_claim_after_publishing_journal/,
      );
    } finally {
      pilot.setPilotTransactionFaultForProofV1("");
    }

    await claimAuthority.waitForWcPublicClaimHistoryWarmForProofV1(
      root,
    );

    const winnerClaim = pilot.signPublicTicketClaim(
      {
        domain:
          "void:mainnet-0:wc-public-ticket-claim-v1",
        marker: "VOID_WC_PUBLIC_TICKET_CLAIM_V1",
        version: 1,
        account: "recovery-real-cooldown-turnover",
        executor_node_id: executorNodeId,
        executor_pubkey: pubPEM,
        claim_nonce: "7".repeat(32),
        claim_ts_ms: Date.now(),
      },
      privateKey,
    );
    const winner =
      await pilot.issuePublicTicketClaim(
        winnerClaim,
        root,
      );
    await claimAuthority.waitForWcPublicClaimHistoryWarmForProofV1(
      root,
    );

    const submit = setupSubmitFromPublicClaim(
      root,
      winner,
      "recovery_cooldown-turnover_winner",
    );
    remoteIndex.resetWcPublicRemoteTruthJsonlIndexForProofV1();
    const submitResponse = makeResponse();
    await pilot.submitRemoteResult(
      submit.req,
      submitResponse,
    );
    assert.equal(submitResponse.statusCode, 200);
    assert.equal(submitResponse.payload.wc.delta, 3);

    await claimAuthority.waitForWcPublicClaimHistoryWarmForProofV1(
      root,
    );
    const policy =
      claimAuthority.wcPublicClaimHistorySnapshotV1(
        root,
        Date.now(),
        "recovery-real-cooldown-turnover",
        executorNodeId,
        30000,
      );
    assert.equal(policy.active, 0);
    assert.equal(policy.active_account, 0);
    assert.equal(policy.account_24h, 1);
    assert.equal(policy.executor_24h, 1);

    await assert.rejects(
      () =>
        pilot.issuePublicTicketClaim(
          oldClaim,
          root,
        ),
      /public_claim_account_cooldown/,
    );

    const ledgerRows = fs
      .readFileSync(
        path.join(
          root,
          "wc_v1",
          "ledger.jsonl",
        ),
        "utf8",
      )
      .trim()
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => JSON.parse(line));
    assert.equal(ledgerRows.length, 1);
    assert.equal(ledgerRows[0].delta, 3);
    assert.equal(
      jsonNamesForProofV28(
        path.join(
          root,
          "wc_v1",
          "public-earning-pilot-v1",
          "issued",
        ),
      ).length,
      0,
    );

    fs.rmSync(root, {
      recursive: true,
      force: true,
    });
  }

  // A successful public submit may leave issued residue when best-effort
  // cleanup fails. Consumed truth must dominate that residue in claim-history
  // active accounting so the next claim is not blocked after cooldown.
  {
    const root = fs.mkdtempSync(
      path.join(
        os.tmpdir(),
        "void-wc-consumed-issued-residue-real-submit-",
      ),
    );
    process.env.DATA_DIR = root;
    process.env.VOID_DATA_DIR = root;
    process.env.VOID_WC_PUBLIC_EARNING_PILOT_ENABLED =
      "1";
    process.env.VOID_WC_PUBLIC_TICKET_CLAIM_ENABLED =
      "1";
    process.env.VOID_WC_PUBLIC_TICKET_CLAIM_DATASET_ID =
      "ds_consumed_issued_residue";
    process.env.VOID_WC_PUBLIC_TICKET_CLAIM_EXPECTED_INPUT_HASH =
      publicWorkHash;
    process.env.VOID_WC_PUBLIC_TICKET_CLAIM_TTL_MS =
      "300000";
    process.env.VOID_WC_PUBLIC_TICKET_CLAIM_CLOCK_SKEW_MS =
      "300000";
    process.env.VOID_WC_PUBLIC_TICKET_CLAIM_COOLDOWN_MS =
      "60000";
    process.env.VOID_WC_PUBLIC_TICKET_CLAIM_MAX_PER_24H =
      "10";
    process.env.VOID_WC_PUBLIC_TICKET_CLAIM_GLOBAL_ACTIVE_CAP =
      "10";
    process.env.VOID_WC_PUBLIC_TICKET_CLAIM_GLOBAL_MAX_PER_24H =
      "100";

    claimAuthority.primeWcPublicClaimHistoryAuthorityV1(
      root,
    );
    await claimAuthority.waitForWcPublicClaimHistoryWarmForProofV1(
      root,
    );

    const account =
      "consumed-issued-residue-real-account";
    const t0 = Date.now();
    const firstClaim = pilot.signPublicTicketClaim(
      {
        domain:
          "void:mainnet-0:wc-public-ticket-claim-v1",
        marker: "VOID_WC_PUBLIC_TICKET_CLAIM_V1",
        version: 1,
        account,
        executor_node_id: executorNodeId,
        executor_pubkey: pubPEM,
        claim_nonce: "a".repeat(32),
        claim_ts_ms: t0,
      },
      privateKey,
    );
    const first =
      await pilot.issuePublicTicketClaim(
        firstClaim,
        root,
        t0,
      );
    await claimAuthority.waitForWcPublicClaimHistoryWarmForProofV1(
      root,
    );

    const submit = setupSubmitFromPublicClaim(
      root,
      first,
      "consumed_issued_residue",
    );
    remoteIndex.resetWcPublicRemoteTruthJsonlIndexForProofV1();

    const issuedPath = path.join(
      root,
      "wc_v1",
      "public-earning-pilot-v1",
      "issued",
      `${first.ticket.ticket_id}.json`,
    );
    const consumedPath = path.join(
      root,
      "wc_v1",
      "public-earning-pilot-v1",
      "consumed",
      `${first.ticket.ticket_id}.json`,
    );
    const resolvedIssuedPath = path.resolve(
      issuedPath,
    );
    const originalUnlinkSync = fs.unlinkSync;
    let cleanupFailureInjected = false;

    (fs as any).unlinkSync = function (
      target: any,
    ): void {
      if (
        !cleanupFailureInjected &&
        path.resolve(String(target)) ===
          resolvedIssuedPath
      ) {
        cleanupFailureInjected = true;
        const error: any = new Error(
          "VOID_WC_PROOF_ISSUED_CLEANUP_FAILURE",
        );
        error.code = "EIO";
        throw error;
      }
      return originalUnlinkSync(target);
    };

    const submitResponse = makeResponse();
    try {
      await pilot.submitRemoteResult(
        submit.req,
        submitResponse,
      );
    } finally {
      (fs as any).unlinkSync =
        originalUnlinkSync;
    }

    assert.equal(cleanupFailureInjected, true);
    assert.equal(submitResponse.statusCode, 200);
    assert.equal(submitResponse.payload.wc.delta, 3);
    assert.equal(
      submitResponse.payload.capability_consumed,
      true,
    );
    assert.equal(fs.existsSync(consumedPath), true);
    assert.equal(
      fs.existsSync(issuedPath),
      true,
      "issued residue must remain for adversary",
    );

    // Model restart/full rebuild rather than relying on an in-memory watcher.
    await claimAuthority.waitForWcPublicClaimHistoryWarmForProofV1(
      root,
    );
    claimAuthority.resetWcPublicClaimHistoryAuthorityForProofV1(
      root,
    );
    claimAuthority.primeWcPublicClaimHistoryAuthorityV1(
      root,
    );
    await claimAuthority.waitForWcPublicClaimHistoryWarmForProofV1(
      root,
    );

    const nextNow = t0 + 60_001;
    const history =
      claimAuthority.wcPublicClaimHistorySnapshotV1(
        root,
        nextNow,
        account,
        executorNodeId,
        300_000,
      );
    assert.equal(history.consumed, 1);
    assert.equal(history.active, 0);
    assert.equal(history.active_account, 0);
    assert.equal(history.active_executor, 0);

    const secondClaim =
      pilot.signPublicTicketClaim(
        {
          domain:
            "void:mainnet-0:wc-public-ticket-claim-v1",
          marker:
            "VOID_WC_PUBLIC_TICKET_CLAIM_V1",
          version: 1,
          account,
          executor_node_id: executorNodeId,
          executor_pubkey: pubPEM,
          claim_nonce: "b".repeat(32),
          claim_ts_ms: nextNow,
        },
        privateKey,
      );
    const second =
      await pilot.issuePublicTicketClaim(
        secondClaim,
        root,
        nextNow,
      );
    assert.equal(second.ok, true);
    assert.notEqual(
      second.ticket.ticket_id,
      first.ticket.ticket_id,
    );

    const ledgerRows = fs
      .readFileSync(
        path.join(
          root,
          "wc_v1",
          "ledger.jsonl",
        ),
        "utf8",
      )
      .trim()
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => JSON.parse(line));
    assert.equal(ledgerRows.length, 1);
    assert.equal(ledgerRows[0].delta, 3);
    assert.equal(
      ledgerRows[0].reward_meta
        .capability_ticket_id,
      first.ticket.ticket_id,
    );

    fs.rmSync(root, {
      recursive: true,
      force: true,
    });
  }

  // A fresh public-WC state tree may leave a just-created directory visible
  // when its parent fsync fails. The failed request must publish no claim or
  // ticket; exact retry must re-fsync that same visible link before success.
  {
    const root = fs.mkdtempSync(
      path.join(
        os.tmpdir(),
        "void-wc-public-state-dir-durability-v1-",
      ),
    );
    process.env.DATA_DIR = root;
    process.env.VOID_DATA_DIR = root;
    process.env.VOID_WC_PUBLIC_EARNING_PILOT_ENABLED =
      "1";
    process.env.VOID_WC_PUBLIC_TICKET_CLAIM_ENABLED =
      "1";
    process.env.VOID_WC_PUBLIC_TICKET_CLAIM_DATASET_ID =
      "ds_public_state_dir_durability";
    process.env.VOID_WC_PUBLIC_TICKET_CLAIM_EXPECTED_INPUT_HASH =
      publicWorkHash;
    process.env.VOID_WC_PUBLIC_TICKET_CLAIM_TTL_MS =
      "300000";
    process.env.VOID_WC_PUBLIC_TICKET_CLAIM_CLOCK_SKEW_MS =
      "300000";
    process.env.VOID_WC_PUBLIC_TICKET_CLAIM_COOLDOWN_MS =
      "60000";
    process.env.VOID_WC_PUBLIC_TICKET_CLAIM_MAX_PER_24H =
      "10";
    process.env.VOID_WC_PUBLIC_TICKET_CLAIM_GLOBAL_ACTIVE_CAP =
      "10";
    process.env.VOID_WC_PUBLIC_TICKET_CLAIM_GLOBAL_MAX_PER_24H =
      "100";

    claimAuthority.primeWcPublicClaimHistoryAuthorityV1(
      root,
    );
    await claimAuthority.waitForWcPublicClaimHistoryWarmForProofV1(
      root,
    );

    const pilotRoot = path.join(
      root,
      "wc_v1",
      "public-earning-pilot-v1",
    );
    const resultTransactions = path.join(
      pilotRoot,
      "result-transactions",
    );
    const issuedDir = path.join(
      pilotRoot,
      "issued",
    );
    const claimsDir = path.join(
      pilotRoot,
      "public-claims",
    );

    const now = Date.now();
    const account = "directory-durability-account";
    const signedClaim = pilot.signPublicTicketClaim(
      {
        domain:
          "void:mainnet-0:wc-public-ticket-claim-v1",
        marker: "VOID_WC_PUBLIC_TICKET_CLAIM_V1",
        version: 1,
        account,
        executor_node_id: executorNodeId,
        executor_pubkey: pubPEM,
        claim_nonce: "c".repeat(32),
        claim_ts_ms: now,
      },
      privateKey,
    );

    let failedOnce = false;
    pilot.setWcPublicEarningPilotDirectoryParentFsyncHookForProofV1(
      (
        phase: "before" | "after",
        _parent: string,
        child: string,
      ) => {
        if (
          !failedOnce &&
          phase === "before" &&
          path.resolve(child) ===
            path.resolve(resultTransactions)
        ) {
          failedOnce = true;
          throw new Error(
            "VOID_WC_PROOF_PUBLIC_STATE_PARENT_FSYNC_FAILURE",
          );
        }
      },
    );
    try {
      await assert.rejects(
        () =>
          pilot.issuePublicTicketClaim(
            signedClaim,
            root,
            now,
          ),
        /VOID_WC_PROOF_PUBLIC_STATE_PARENT_FSYNC_FAILURE/,
      );
    } finally {
      pilot.setWcPublicEarningPilotDirectoryParentFsyncHookForProofV1(
        null,
      );
    }

    assert.equal(failedOnce, true);
    assert.equal(
      fs.existsSync(resultTransactions),
      true,
      "fault must leave ambiguous visible result-transactions directory",
    );
    assert.equal(
      fs
        .readdirSync(issuedDir)
        .filter((name) => name.endsWith(".json"))
        .length,
      0,
    );
    assert.equal(
      fs
        .readdirSync(claimsDir)
        .filter((name) => name.endsWith(".json"))
        .length,
      0,
    );

    let successfulResyncs = 0;
    pilot.setWcPublicEarningPilotDirectoryParentFsyncHookForProofV1(
      (
        phase: "before" | "after",
        _parent: string,
        child: string,
      ) => {
        if (
          phase === "after" &&
          path.resolve(child) ===
            path.resolve(resultTransactions)
        ) {
          successfulResyncs += 1;
        }
      },
    );
    let issued: any;
    try {
      issued =
        await pilot.issuePublicTicketClaim(
          signedClaim,
          root,
          now,
        );
    } finally {
      pilot.setWcPublicEarningPilotDirectoryParentFsyncHookForProofV1(
        null,
      );
    }

    assert.ok(
      successfulResyncs >= 1,
      "retry did not re-establish visible directory parent durability",
    );
    assert.equal(issued.ok, true);
    assert.equal(
      fs
        .readdirSync(issuedDir)
        .filter((name) => name.endsWith(".json"))
        .length,
      1,
    );
    assert.equal(
      fs
        .readdirSync(claimsDir)
        .filter((name) => name.endsWith(".json"))
        .length,
      1,
    );

    await claimAuthority.waitForWcPublicClaimHistoryWarmForProofV1(
      root,
    );

    const submit = setupSubmitFromPublicClaim(
      root,
      issued,
      "directory_durability",
    );
    remoteIndex.resetWcPublicRemoteTruthJsonlIndexForProofV1();
    const response = makeResponse();
    await pilot.submitRemoteResult(
      submit.req,
      response,
    );
    assert.equal(response.statusCode, 200);
    assert.equal(response.payload.wc.delta, 3);
    assert.equal(
      response.payload.capability_consumed,
      true,
    );
    assert.equal(
      fs.existsSync(
        path.join(
          resultTransactions,
          `${issued.ticket.ticket_id}.json`,
        ),
      ),
      true,
    );
    assert.equal(
      fs.existsSync(
        path.join(
          pilotRoot,
          "consumed",
          `${issued.ticket.ticket_id}.json`,
        ),
      ),
      true,
    );

    const ledgerRows = fs
      .readFileSync(
        path.join(
          root,
          "wc_v1",
          "ledger.jsonl",
        ),
        "utf8",
      )
      .trim()
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => JSON.parse(line));
    assert.equal(ledgerRows.length, 1);
    assert.equal(ledgerRows[0].delta, 3);

    fs.rmSync(root, {
      recursive: true,
      force: true,
    });
  }

  console.log(
    "public_claim_recovery_consumption_race=false",
  );
  console.log(
    "public_claim_recovery_then_submit_once=true",
  );
  console.log(
    "public_claim_recovery_daily_turnover_bypass=false",
  );
  console.log(
    "public_claim_recovery_cooldown_turnover_bypass=false",
  );
  console.log(
    "consumed_ticket_cleanup_residue_active=false",
  );
  console.log(
    "public_state_directory_parent_fsync_durable=true",
  );
  console.log(
    "public_state_directory_failed_fsync_resynced=true",
  );
  console.log(
    "self_attested_no_dataset_credit=false",
  );
  console.log(
    "self_attested_no_dataset_import=false",
  );
  console.log(
    "independent_useful_work_possession_verified=true",
  );
  console.log(
    "legitimate_public_work_exact_3_wc=true",
  );
  console.log(
    "VOID_WC_PUBLIC_EARNING_PILOT_RUNTIME_V1_GREEN",
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
