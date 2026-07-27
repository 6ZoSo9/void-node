import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  acceptPaidWorkEntitlementOnce,
  inspectPaidWorkEntitlementAcceptance,
  PaidWorkEntitlementAcceptanceError,
  readCanonicalWcState,
  VOID_WC_PAID_WORK_ENTITLEMENT_ACCEPTANCE_AWARD_WC,
  VOID_WC_PAID_WORK_ENTITLEMENT_ACCEPTANCE_CONFIRMATION,
  VOID_WC_PAID_WORK_ENTITLEMENT_ACCEPTANCE_MARKER,
  VOID_WC_PAID_WORK_ENTITLEMENT_ACCEPTANCE_TASK,
} from "../src/economic/wc_verified_receipt_acceptance_v1.js";

function canonical(value: any): any {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    const out: Record<string, any> = {};
    for (const key of Object.keys(value).sort()) out[key] = canonical(value[key]);
    return out;
  }
  return value;
}

function canonicalBytes(value: any): Buffer {
  return Buffer.from(JSON.stringify(canonical(value)), "utf8");
}

function sha256(value: string | Buffer): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function signRecord(
  core: Record<string, any>,
  privateKey: crypto.KeyObject,
  serviceFingerprint: string,
): Record<string, any> {
  return {
    ...core,
    service_key_fingerprint_sha256: serviceFingerprint,
    service_signature_base64: crypto.sign(
      null,
      canonicalBytes(core),
      privateKey,
    ).toString("base64"),
  };
}

const tmp = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-wc-paid-work-entitlement-v1-"),
);

try {
  assert.equal(
    VOID_WC_PAID_WORK_ENTITLEMENT_ACCEPTANCE_MARKER,
    "VOID_WC_PAID_WORK_ENTITLEMENT_ACCEPTANCE_V1",
  );
  assert.equal(
    VOID_WC_PAID_WORK_ENTITLEMENT_ACCEPTANCE_TASK,
    "void-public-agent-integration-evidence-v1",
  );
  assert.equal(VOID_WC_PAID_WORK_ENTITLEMENT_ACCEPTANCE_AWARD_WC, 3);

  const { privateKey, publicKey } = crypto.generateKeyPairSync("ed25519");
  const publicKeyPem = publicKey.export({
    type: "spki",
    format: "pem",
  }).toString();
  const publicDer = publicKey.export({
    type: "spki",
    format: "der",
  }) as Buffer;
  const serviceFingerprint = sha256(publicDer);

  const submissionId = "voids_" + "a".repeat(32);
  const account = "void-external-paid-work-proof-v1";
  const agentFingerprint = "b".repeat(64);

  const review = signRecord({
    schema: "void-agent-paid-work-review-v1",
    submission_id: submissionId,
    task_id: VOID_WC_PAID_WORK_ENTITLEMENT_ACCEPTANCE_TASK,
    agent_id: account,
    agent_key_fingerprint_sha256: agentFingerprint,
    decision: "approve",
    status: "approved_pilot_wc_entitlement_issued",
    award_type: "pilot_wc_entitlement",
    award_wc: 3,
    canonical_wc_ledger_credit_performed: false,
    void_settlement_performed: false,
  }, privateKey, serviceFingerprint);

  const entitlement = signRecord({
    schema: "void-agent-paid-work-entitlement-v1",
    submission_id: submissionId,
    task_id: VOID_WC_PAID_WORK_ENTITLEMENT_ACCEPTANCE_TASK,
    agent_key_fingerprint_sha256: agentFingerprint,
    status: "pilot_wc_entitlement_issued",
    award_wc: 3,
    canonical_wc_ledger_credit_performed: false,
    void_settlement_performed: false,
  }, privateKey, serviceFingerprint);

  const reviewRaw = JSON.stringify(review, null, 2) + "\n";
  const entitlementRaw = JSON.stringify(entitlement, null, 2) + "\n";
  const authority = {
    reviewRaw,
    entitlementRaw,
    servicePublicKeyPem: publicKeyPem,
  };
  const options = {
    dataDir: tmp,
    expectedSubmissionId: submissionId,
    expectedTaskId: VOID_WC_PAID_WORK_ENTITLEMENT_ACCEPTANCE_TASK,
    expectedAgentId: account,
    expectedAgentKeyFingerprintSha256: agentFingerprint,
    expectedReviewSha256: sha256(reviewRaw),
    expectedEntitlementSha256: sha256(entitlementRaw),
    source: "proof",
  };

  const dry = await inspectPaidWorkEntitlementAcceptance(authority, options);
  assert.equal(dry.eligible, true);
  assert.equal(dry.duplicate, false);
  assert.equal(dry.would_credit, true);
  assert.equal(dry.mutated, false);
  assert.equal(dry.award_wc, 3);

  const ledger = path.join(tmp, "wc_v1", "ledger.jsonl");
  assert.equal(fs.existsSync(ledger), false);

  await assert.rejects(
    () => acceptPaidWorkEntitlementOnce(authority, {
      ...options,
      apply: true,
      confirmation: "wrong",
    }),
    (error: any) =>
      error instanceof PaidWorkEntitlementAcceptanceError &&
      error.code === "explicit_confirmation_required",
  );
  assert.equal(fs.existsSync(ledger), false);

  const applied = await acceptPaidWorkEntitlementOnce(authority, {
    ...options,
    apply: true,
    confirmation: VOID_WC_PAID_WORK_ENTITLEMENT_ACCEPTANCE_CONFIRMATION,
  });
  assert.equal(applied.credited, true);
  assert.equal(applied.duplicate, false);
  assert.equal(applied.mutated, true);
  assert.equal(applied.wc.earned, 3);
  assert.equal(applied.wc.redeemable, 3);
  assert.equal(applied.entry.reason, "paid_work_entitlement_acceptance_v1");
  assert.deepEqual(
    applied.entry.reward_meta.duplicate_guard,
    ["submission_id", "entitlement_sha256", "idempotency_key"],
  );
  assert.equal(
    applied.entry.reward_meta.canonical_wc_ledger_credit_automatic,
    false,
  );
  assert.equal(
    applied.entry.reward_meta.void_settlement_performed,
    false,
  );
  assert.equal(
    applied.entry.reward_meta.wallet_transaction_payment_performed,
    false,
  );

  const duplicate = await acceptPaidWorkEntitlementOnce(authority, {
    ...options,
    apply: true,
    confirmation: VOID_WC_PAID_WORK_ENTITLEMENT_ACCEPTANCE_CONFIRMATION,
  });
  assert.equal(duplicate.credited, false);
  assert.equal(duplicate.duplicate, true);
  assert.equal(duplicate.mutated, false);
  assert.equal(duplicate.wc.redeemable, 3);

  const lines = fs.readFileSync(ledger, "utf8")
    .trim()
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
  assert.equal(lines.length, 1);
  assert.equal(lines[0].submission_id, submissionId);
  assert.equal(lines[0].entitlement_sha256, sha256(entitlementRaw));

  const finalState = await readCanonicalWcState(account, tmp);
  assert.equal(finalState.earned, 3);
  assert.equal(finalState.redeemable, 3);

  const malformedHistoryRoot = path.join(tmp, "malformed-history");
  const malformedHistoryLedger = path.join(
    malformedHistoryRoot,
    "wc_v1",
    "ledger.jsonl",
  );
  fs.mkdirSync(path.dirname(malformedHistoryLedger), {
    recursive: true,
    mode: 0o700,
  });
  fs.writeFileSync(
    malformedHistoryLedger,
    "{historical-malformed-line}\n",
    { encoding: "utf8", mode: 0o600 },
  );

  const malformedHistoryDry =
    await inspectPaidWorkEntitlementAcceptance(
      authority,
      {
        ...options,
        dataDir: malformedHistoryRoot,
      },
    );
  assert.equal(malformedHistoryDry.eligible, true);
  assert.equal(malformedHistoryDry.duplicate, false);
  assert.equal(malformedHistoryDry.would_credit, true);
  assert.equal(malformedHistoryDry.mutated, false);
  assert.equal(
    malformedHistoryDry.historical_malformed_ledger_lines,
    1,
  );
  assert.equal(
    fs.readFileSync(malformedHistoryLedger, "utf8"),
    "{historical-malformed-line}\n",
  );

  const tampered = JSON.parse(entitlementRaw);
  tampered.award_wc = 999;
  await assert.rejects(
    () => inspectPaidWorkEntitlementAcceptance(
      {
        ...authority,
        entitlementRaw: JSON.stringify(tampered, null, 2) + "\n",
      },
      {
        ...options,
        expectedEntitlementSha256: undefined,
      },
    ),
    (error: any) =>
      error instanceof PaidWorkEntitlementAcceptanceError &&
      (
        error.code === "entitlement_service_signature_invalid" ||
        error.code === "entitlement_award_wc_mismatch"
      ),
  );

  const source = fs.readFileSync(
    path.join(
      process.cwd(),
      "src",
      "economic",
      "wc_verified_receipt_acceptance_v1.ts",
    ),
    "utf8",
  );
  assert.equal(source.includes('app.post("/wc/credit"'), false);
  assert.equal(source.includes("req?.body?.delta"), false);
  assert.equal(source.includes("req?.body?.wc_award"), false);

  console.log("VOID_WC_PAID_WORK_ENTITLEMENT_ACCEPTANCE_V1_PROOF_GREEN");
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
