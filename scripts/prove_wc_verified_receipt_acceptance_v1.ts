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
import {
  projectWcProductionBalance,
} from "../src/economic/wc_production_visibility_projection_v1.js";

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
  assert.equal(accepted.accepted_delta_wc, 3);
  assert.equal(accepted.accepted_delta_quanta, "3000000000");
  assert.equal(accepted.canonical_redeemable_before_exact, "0");
  assert.equal(accepted.canonical_redeemable_after_local_exact, "3");
  assert.equal(accepted.entry.reason, "verified_receipt_acceptance_v1");
  assert.equal(accepted.entry.reward_meta.server_controlled_award, true);

  const state = await readCanonicalWcState(account, tmp);
  assert.equal(state.earned, 3);
  assert.equal(state.redeemable, 3);
  assert.equal(state.earned_exact, "3");
  assert.equal(state.redeemable_exact, "3");
  assert.equal(state.earned_quanta, "3000000000");
  assert.equal(state.numeric_authority, "nano_wc_fixed_point_v1");

  const duplicate = await acceptVerifiedReceiptOnce(loaded, {
    dataDir: tmp,
    expectedAccount: account,
    expectedJobId: jobId,
    expectedReceiptId: receiptId,
  });
  assert.equal(duplicate.credited, false);
  assert.equal(duplicate.duplicate, true);
  assert.equal(duplicate.accepted_delta_wc, 0);
  assert.equal(duplicate.accepted_delta_quanta, "0");

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


  const sameTicketConflictReceipt = makeReceipt(
    account,
    "job_same_ticket_conflict_v1",
    "rcpt_same_ticket_conflict_v1",
    "ds_same_ticket_conflict_v1",
    "6",
    "7",
  );
  persistTruth(sameTicketConflictReceipt);
  await assert.rejects(
    () =>
      acceptVerifiedReceiptOnce(sameTicketConflictReceipt, {
        dataDir: tmp,
        expectedAccount: account,
        expectedJobId: sameTicketConflictReceipt.job_id,
        expectedReceiptId: sameTicketConflictReceipt.receipt_id,
        capabilityTicketId: ticketId,
        source: "same_ticket_conflict_proof",
      }),
    (error: any) =>
      error instanceof VerifiedReceiptAcceptanceError &&
      error.code === "duplicate_credit_conflict",
  );

  for (const [label, bad, code] of [
    ["numeric_string", "3", "ledger_delta_not_exact_number"],
    ["numeric_array", [3], "ledger_delta_not_exact_number"],
    ["numeric_10dp", 0.0000000001, "wc_number_precision_exceeds_9dp"],
    [
      "numeric_unsafe",
      Number.MAX_SAFE_INTEGER + 1,
      "ledger_delta_not_exact_number",
    ],
  ] as const) {
    const root = path.join(tmp, `strict-${label}`);
    const file = path.join(root, "wc_v1", "ledger.jsonl");
    append(file, {
      kind: "credit",
      account: `strict-${label}`,
      delta: bad,
    });
    await assert.rejects(
      () => readCanonicalWcState(`strict-${label}`, root),
      (error: any) =>
        error instanceof VerifiedReceiptAcceptanceError &&
        error.code === code,
    );
  }

  const fractionalRoot = path.join(tmp, "strict-fractional");
  append(path.join(fractionalRoot, "wc_v1", "ledger.jsonl"), {
    kind: "credit",
    account: "strict-fractional",
    delta: 1.25,
  });
  append(path.join(fractionalRoot, "wc_v1", "redeemed.jsonl"), {
    account: "strict-fractional",
    amount: 0.1,
  });
  const fractional = await readCanonicalWcState(
    "strict-fractional",
    fractionalRoot,
  );
  assert.equal(fractional.earned_exact, "1.25");
  assert.equal(fractional.redeemed_exact, "0.1");
  assert.equal(fractional.redeemable_exact, "1.15");
  assert.equal(fractional.redeemable_quanta, "1150000000");
  assert.equal(fractional.redeemable, 1.15);

  const highRoot = path.join(tmp, "strict-high-balance");
  const highAccount = "strict-high-balance";
  append(path.join(highRoot, "wc_v1", "ledger.jsonl"), {
    kind: "credit",
    account: highAccount,
    delta: Number.MAX_SAFE_INTEGER,
  });
  append(path.join(highRoot, "wc_v1", "ledger.jsonl"), {
    kind: "credit",
    account: highAccount,
    delta: 1,
  });
  const highBefore = await readCanonicalWcState(highAccount, highRoot);
  assert.equal(highBefore.redeemable_exact, "9007199254740992");
  assert.equal(highBefore.redeemable, null);

  const highReceipt = makeReceipt(
    highAccount,
    "job_high_balance_v1",
    "rcpt_high_balance_v1",
    "ds_high_balance_v1",
    "8",
    "9",
  );
  persistTruth(highReceipt, highRoot);
  const highAccepted = await acceptVerifiedReceiptOnce(highReceipt, {
    dataDir: highRoot,
    expectedAccount: highAccount,
    expectedJobId: highReceipt.job_id,
    expectedReceiptId: highReceipt.receipt_id,
    capabilityTicketId: "d".repeat(32),
    source: "high_balance_exact_delta_proof",
  });
  assert.equal(highAccepted.accepted_delta_wc, 3);
  assert.equal(
    highAccepted.canonical_redeemable_before_exact,
    "9007199254740992",
  );
  assert.equal(
    highAccepted.canonical_redeemable_after_local_exact,
    "9007199254740995",
  );
  assert.equal(
    highAccepted.canonical_redeemable_before,
    null,
  );
  assert.equal(
    highAccepted.canonical_redeemable_after_local,
    null,
  );
  const highAfter = await readCanonicalWcState(highAccount, highRoot);
  assert.equal(highAfter.redeemable_exact, "9007199254740995");
  assert.equal(highAfter.redeemable, null);

  const highProjection = await projectWcProductionBalance(
    highAccount,
    highRoot,
    "VOID_WC_PRODUCTION_BALANCE_V1",
  );
  assert.equal(highProjection.status, 200);
  assert.equal(highProjection.body["balance"], null);
  assert.equal(
    highProjection.body["balance_exact"],
    "9007199254740995",
  );
  assert.equal(highProjection.body["redeemable"], true);
  assert.equal(highProjection.body["redeemable_wc"], null);
  assert.equal(
    highProjection.body["redeemable_wc_exact"],
    "9007199254740995",
  );
  assert.equal(
    highProjection.body["numeric_authority"],
    "nano_wc_fixed_point_v1",
  );

  const highRecoveryTicketId = "b".repeat(32);
  const highRecoveryJobId = "job_high_recovery_v1";
  const highRecoveryReceiptId = "rcpt_high_recovery_v1";
  const highRecoveryReceipt = makeReceipt(
    highAccount,
    highRecoveryJobId,
    highRecoveryReceiptId,
    "ds_high_recovery_v1",
    "a",
    "b",
  );
  persistTruth(highRecoveryReceipt, highRoot);
  const highRecoveryConsumedFile = path.join(
    highRoot,
    "wc_v1",
    "public-capabilities-v1",
    "consumed",
    `${highRecoveryTicketId}.json`,
  );
  fs.mkdirSync(
    path.dirname(highRecoveryConsumedFile),
    { recursive: true },
  );
  fs.writeFileSync(
    highRecoveryConsumedFile,
    JSON.stringify(
      {
        marker: "VOID_WC_PUBLIC_CAPABILITY_V1",
        ticket_id: highRecoveryTicketId,
        account: highAccount,
        task_class: "datanet_fetch_verify",
        status: "failed",
        failure_reason: "high_balance_projection_proof",
      },
      null,
      2,
    ) + "\n",
    { mode: 0o600 },
  );

  const highRecovery = await recoverFailedCapabilityReceiptOnce({
    dataDir: highRoot,
    ticketId: highRecoveryTicketId,
    account: highAccount,
    jobId: highRecoveryJobId,
    receiptId: highRecoveryReceiptId,
    apply: true,
    confirmation: "wcCapabilityFailedReceiptRecovery",
  });
  assert.equal(highRecovery.ticket_status, "recovered");
  assert.equal(highRecovery.wc.redeemable, null);
  assert.equal(
    highRecovery.wc.redeemable_exact,
    "9007199254740998",
  );
  const highRecoveredRecord = JSON.parse(
    fs.readFileSync(
      highRecoveryConsumedFile,
      "utf8",
    ),
  );
  assert.equal(
    highRecoveredRecord.canonical_redeemable_after,
    null,
  );
  assert.equal(
    highRecoveredRecord.canonical_redeemable_after_exact,
    "9007199254740998",
  );
  assert.equal(
    highRecoveredRecord.numeric_authority,
    "nano_wc_fixed_point_v1",
  );
  const highRecoveryReplay =
    await recoverFailedCapabilityReceiptOnce({
      dataDir: highRoot,
      ticketId: highRecoveryTicketId,
      account: highAccount,
      jobId: highRecoveryJobId,
      receiptId: highRecoveryReceiptId,
      apply: true,
      confirmation: "wcCapabilityFailedReceiptRecovery",
    });
  assert.equal(highRecoveryReplay.idempotent, true);
  assert.equal(highRecoveryReplay.wc.redeemable, null);
  assert.equal(
    highRecoveryReplay.wc.redeemable_exact,
    "9007199254740998",
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
