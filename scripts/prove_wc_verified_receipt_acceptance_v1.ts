import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  acceptVerifiedReceiptOnce,
  findVerifiedReceiptById,
  inspectVerifiedReceiptAcceptance,
  readCanonicalWcState,
  recoverFailedCapabilityReceiptOnce,
  VerifiedReceiptAcceptanceError,
  VOID_WC_VERIFIED_RECEIPT_ACCEPTANCE_AWARD_WC,
} from "../src/economic/wc_verified_receipt_acceptance_v1.js";

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "void-wc-verified-acceptance-v1-"));

function append(file: string, value: any): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.appendFileSync(file, JSON.stringify(value) + "\n");
}

function persistTruth(receipt: any, root: string = tmp): void {
  append(path.join(root, "agent_v1", "receipts.jsonl"), receipt);
  append(path.join(root, "agent", "jobs.jsonl"), {
    job_id: receipt.job_id,
    account: receipt.account,
    kind: receipt.kind,
    status: "queued",
    dataset_id: receipt.dataset_id,
  });
  append(path.join(root, "agent_v1", "job_state.jsonl"), {
    job_id: receipt.job_id,
    status: "completed",
    receipt_id: receipt.receipt_id,
    dataset_id: receipt.dataset_id,
    input_hash: receipt.input_hash,
    output_hash: receipt.output_hash,
    verified: true,
  });
}

function makeReceipt(
  account: string,
  jobId: string,
  receiptId: string,
  datasetId: string,
  inputChar: string,
  outputChar: string,
): any {
  const inputHash = inputChar.repeat(64);
  return {
    receipt_id: receiptId,
    job_id: jobId,
    account,
    kind: "datanet_fetch_verify",
    status: "completed",
    dataset_id: datasetId,
    input_hash: inputHash,
    output_hash: outputChar.repeat(64),
    output: {
      verified: true,
      fetched_input_hash: inputHash,
      bytes: 65,
    },
    ts_ms: Date.now(),
  };
}

try {
  const account = "outside-operator-1";
  const jobId = "job_runtime_v1";
  const receiptId = "rcpt_runtime_v1";
  const datasetId = "ds_runtime_v1";
  const ticketId = "c".repeat(32);
  const receipt = makeReceipt(
    account,
    jobId,
    receiptId,
    datasetId,
    "a",
    "b",
  );
  persistTruth(receipt);

  const loaded = await findVerifiedReceiptById(receiptId, tmp);
  assert.equal(loaded.receipt_id, receiptId);

  const inspection = await inspectVerifiedReceiptAcceptance(loaded, {
    dataDir: tmp,
    expectedAccount: account,
    expectedJobId: jobId,
    expectedReceiptId: receiptId,
  });
  assert.equal(inspection.eligible, true);
  assert.equal(inspection.duplicate, false);
  assert.equal(inspection.award_wc, 3);

  const accepted = await acceptVerifiedReceiptOnce(loaded, {
    dataDir: tmp,
    expectedAccount: account,
    expectedJobId: jobId,
    expectedReceiptId: receiptId,
    capabilityTicketId: ticketId,
    source: "proof",
  });
  assert.equal(accepted.credited, true);
  assert.equal(accepted.duplicate, false);
  assert.equal(
    accepted.award_wc,
    VOID_WC_VERIFIED_RECEIPT_ACCEPTANCE_AWARD_WC,
  );
  assert.equal(accepted.entry.delta, 3);
  assert.equal(accepted.entry.reason, "verified_receipt_acceptance_v1");
  assert.equal(accepted.entry.reward_meta.server_controlled_award, true);

  const state = await readCanonicalWcState(account, tmp);
  assert.equal(state.earned, 3);
  assert.equal(state.redeemable, 3);

  const duplicate = await acceptVerifiedReceiptOnce(loaded, {
    dataDir: tmp,
    expectedAccount: account,
    expectedJobId: jobId,
    expectedReceiptId: receiptId,
  });
  assert.equal(duplicate.credited, false);
  assert.equal(duplicate.duplicate, true);

  const firstLedger = fs
    .readFileSync(path.join(tmp, "wc_v1", "ledger.jsonl"), "utf8")
    .trim()
    .split(/\r?\n/)
    .map((line) => JSON.parse(line));
  assert.equal(firstLedger.length, 1);
  assert.equal(firstLedger[0].receipt_id, receiptId);
  assert.equal(firstLedger[0].job_id, jobId);

  const malformedSafeRoot = path.join(tmp, "malformed-unrelated");
  const malformedSafeAccount = "outside-operator-malformed-safe";
  const malformedSafeJobId = "job_malformed_safe_v1";
  const malformedSafeReceiptId = "rcpt_malformed_safe_v1";
  const malformedSafeReceipt = makeReceipt(
    malformedSafeAccount,
    malformedSafeJobId,
    malformedSafeReceiptId,
    "ds_malformed_safe_v1",
    "2",
    "3",
  );
  persistTruth(malformedSafeReceipt, malformedSafeRoot);
  const malformedSafeLedger = path.join(
    malformedSafeRoot,
    "wc_v1",
    "ledger.jsonl",
  );
  fs.mkdirSync(path.dirname(malformedSafeLedger), { recursive: true });
  fs.appendFileSync(malformedSafeLedger, '{"legacy_broken":\n');

  const malformedSafeInspection = await inspectVerifiedReceiptAcceptance(
    malformedSafeReceipt,
    {
      dataDir: malformedSafeRoot,
      expectedAccount: malformedSafeAccount,
      expectedJobId: malformedSafeJobId,
      expectedReceiptId: malformedSafeReceiptId,
    },
  );
  assert.equal(malformedSafeInspection.eligible, true);
  assert.equal(malformedSafeInspection.duplicate, false);
  assert.equal(malformedSafeInspection.historical_malformed_ledger_lines, 1);

  const malformedSafeAccepted = await acceptVerifiedReceiptOnce(
    malformedSafeReceipt,
    {
      dataDir: malformedSafeRoot,
      expectedAccount: malformedSafeAccount,
      expectedJobId: malformedSafeJobId,
      expectedReceiptId: malformedSafeReceiptId,
      source: "malformed_tolerance_proof",
    },
  );
  assert.equal(malformedSafeAccepted.credited, true);
  assert.equal(malformedSafeAccepted.historical_malformed_ledger_lines, 1);

  const malformedSafeState = await readCanonicalWcState(
    malformedSafeAccount,
    malformedSafeRoot,
  );
  assert.equal(malformedSafeState.earned, 3);
  assert.equal(malformedSafeState.redeemable, 3);
  assert.equal(malformedSafeState.historical_malformed_ledger_lines, 1);

  const ambiguousRoot = path.join(tmp, "malformed-ambiguous");
  const ambiguousAccount = "outside-operator-malformed-ambiguous";
  const ambiguousJobId = "job_malformed_ambiguous_v1";
  const ambiguousReceiptId = "rcpt_malformed_ambiguous_v1";
  const ambiguousReceipt = makeReceipt(
    ambiguousAccount,
    ambiguousJobId,
    ambiguousReceiptId,
    "ds_malformed_ambiguous_v1",
    "4",
    "5",
  );
  persistTruth(ambiguousReceipt, ambiguousRoot);
  const ambiguousLedger = path.join(ambiguousRoot, "wc_v1", "ledger.jsonl");
  fs.mkdirSync(path.dirname(ambiguousLedger), { recursive: true });
  fs.appendFileSync(
    ambiguousLedger,
    `{"kind":"credit","account":"${ambiguousAccount}","job_id":"${ambiguousJobId}","receipt_id":"${ambiguousReceiptId}"\n`,
  );

  await assert.rejects(
    () =>
      inspectVerifiedReceiptAcceptance(ambiguousReceipt, {
        dataDir: ambiguousRoot,
        expectedAccount: ambiguousAccount,
        expectedJobId: ambiguousJobId,
        expectedReceiptId: ambiguousReceiptId,
      }),
    (error: any) =>
      error instanceof VerifiedReceiptAcceptanceError &&
      error.code === "ambiguous_malformed_ledger_line",
  );

  const badReceipt = {
    ...receipt,
    receipt_id: "rcpt_bad_hash",
    output: { ...receipt.output, fetched_input_hash: "d".repeat(64) },
  };
  append(path.join(tmp, "agent_v1", "receipts.jsonl"), badReceipt);
  await assert.rejects(
    () =>
      inspectVerifiedReceiptAcceptance(badReceipt, {
        dataDir: tmp,
        expectedAccount: account,
      }),
    (error: any) =>
      error instanceof VerifiedReceiptAcceptanceError &&
      error.code === "verified_input_hash_mismatch",
  );

  const recoveryAccount = "outside-operator-recovery-1";
  const recoveryJobId = "job_recovery_v1";
  const recoveryReceiptId = "rcpt_recovery_v1";
  const recoveryDatasetId = "ds_recovery_v1";
  const recoveryTicketId = "e".repeat(32);
  const recoveryReceipt = makeReceipt(
    recoveryAccount,
    recoveryJobId,
    recoveryReceiptId,
    recoveryDatasetId,
    "f",
    "1",
  );
  persistTruth(recoveryReceipt);

  const consumedFile = path.join(
    tmp,
    "wc_v1",
    "public-capabilities-v1",
    "consumed",
    `${recoveryTicketId}.json`,
  );
  fs.mkdirSync(path.dirname(consumedFile), { recursive: true });
  fs.writeFileSync(
    consumedFile,
    JSON.stringify(
      {
        marker: "VOID_WC_PUBLIC_CAPABILITY_V1",
        ticket_id: recoveryTicketId,
        account: recoveryAccount,
        task_class: "datanet_fetch_verify",
        status: "failed",
        failure_reason: "non_json_response",
      },
      null,
      2,
    ) + "\n",
    { mode: 0o600 },
  );

  const recoveryDry = await recoverFailedCapabilityReceiptOnce({
    dataDir: tmp,
    ticketId: recoveryTicketId,
    account: recoveryAccount,
    jobId: recoveryJobId,
    receiptId: recoveryReceiptId,
    apply: false,
  });
  assert.equal(recoveryDry.dry, true);
  assert.equal(recoveryDry.mutated, false);
  assert.equal(recoveryDry.inspection.duplicate, false);
  assert.equal(recoveryDry.inspection.would_credit, true);

  await assert.rejects(
    () =>
      recoverFailedCapabilityReceiptOnce({
        dataDir: tmp,
        ticketId: recoveryTicketId,
        account: recoveryAccount,
        jobId: recoveryJobId,
        receiptId: recoveryReceiptId,
        apply: true,
        confirmation: "wrong",
      }),
    (error: any) =>
      error instanceof VerifiedReceiptAcceptanceError &&
      error.code === "explicit_confirmation_required",
  );

  const recoveryApply = await recoverFailedCapabilityReceiptOnce({
    dataDir: tmp,
    ticketId: recoveryTicketId,
    account: recoveryAccount,
    jobId: recoveryJobId,
    receiptId: recoveryReceiptId,
    apply: true,
    confirmation: "wcCapabilityFailedReceiptRecovery",
  });
  assert.equal(recoveryApply.ticket_status, "recovered");
  assert.equal(recoveryApply.acceptance.credited, true);
  assert.equal(recoveryApply.acceptance.duplicate, false);
  assert.equal(recoveryApply.wc.redeemable, 3);

  const recovered = JSON.parse(fs.readFileSync(consumedFile, "utf8"));
  assert.equal(recovered.status, "recovered");
  assert.equal(recovered.wc_delta, 3);
  assert.equal(recovered.original_failure_reason, "non_json_response");

  const recoveryAgain = await recoverFailedCapabilityReceiptOnce({
    dataDir: tmp,
    ticketId: recoveryTicketId,
    account: recoveryAccount,
    jobId: recoveryJobId,
    receiptId: recoveryReceiptId,
    apply: true,
    confirmation: "wcCapabilityFailedReceiptRecovery",
  });
  assert.equal(recoveryAgain.idempotent, true);
  assert.equal(recoveryAgain.mutated, false);

  const finalLedger = fs
    .readFileSync(path.join(tmp, "wc_v1", "ledger.jsonl"), "utf8")
    .trim()
    .split(/\r?\n/)
    .map((line) => JSON.parse(line));
  assert.equal(finalLedger.length, 2);
  assert.equal(
    finalLedger.filter((entry) => entry.receipt_id === recoveryReceiptId).length,
    1,
  );
  assert.equal(
    finalLedger.filter((entry) => entry.job_id === recoveryJobId).length,
    1,
  );

  console.log("VOID_WC_VERIFIED_RECEIPT_ACCEPTANCE_V1_GREEN");
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
