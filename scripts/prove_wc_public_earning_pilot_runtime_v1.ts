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

  process.env.VOID_WC_PUBLIC_EARNING_PILOT_LOCK_STALE_MS = "60000";
  const lockTicketId = "9".repeat(32);
  const lockDir = path.join(
    tmp,
    "wc_v1",
    "public-earning-pilot-v1",
    "locks",
  );
  fs.mkdirSync(lockDir, { recursive: true });
  const staleLockFile = path.join(lockDir, `${lockTicketId}.lock`);
  fs.writeFileSync(
    staleLockFile,
    JSON.stringify({
      marker: "VOID_WC_PUBLIC_EARNING_PILOT_V1",
      ticket_id: lockTicketId,
      pid: 999999,
      created_at_ms: now - 10 * 60_000,
    }) + "\n",
  );
  const oldTime = new Date(now - 10 * 60_000);
  fs.utimesSync(staleLockFile, oldTime, oldTime);

  const recoveredLock = await pilot.acquirePilotTicketLock(lockTicketId, tmp);
  assert.equal(recoveredLock.file, staleLockFile);
  const auditText = fs.readFileSync(
    path.join(tmp, "wc_v1", "public-earning-pilot-v1", "audit.jsonl"),
    "utf8",
  );
  assert.match(auditText, /"event":"stale_lock_recovered"/);
  await assert.rejects(
    () => pilot.acquirePilotTicketLock(lockTicketId, tmp),
    /ticket_inflight/,
  );
  await pilot.releasePilotTicketLock(recoveredLock);
  assert.equal(fs.existsSync(staleLockFile), false);

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

  console.log(
    "VOID_WC_PUBLIC_EARNING_PILOT_RUNTIME_V1_GREEN",
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
