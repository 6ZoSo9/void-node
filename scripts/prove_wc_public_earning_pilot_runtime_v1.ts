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
  const remoteIndex = await import(
    "../src/economic/wc_public_remote_truth_jsonl_index_v1.js"
  );
  const block = await import("../src/chain/block.js");

  const { privateKey, publicKey } = crypto.generateKeyPairSync("ed25519");
  const pubPEM = publicKey
    .export({ type: "spki", format: "pem" })
    .toString();
  const executorNodeId = block.nodeIdFromPubPEM(pubPEM);

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
    const exactState = await acceptance.readCanonicalWcState(
      account,
      root,
    );
    assert.equal(
      exactState.redeemable_exact,
      "9007199254740995",
    );
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

  console.log(
    "VOID_WC_PUBLIC_EARNING_PILOT_RUNTIME_V1_GREEN",
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
