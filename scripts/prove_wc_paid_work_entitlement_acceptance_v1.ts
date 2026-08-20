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

  const paidWorkUnsignedCore = (
    record: Record<string, any>,
  ): Record<string, any> => {
    const core = { ...record };
    delete core.service_key_fingerprint_sha256;
    delete core.service_signature_base64;
    return core;
  };

  const invalidSignedAwardValues: Array<
    [string, unknown, boolean]
  > = [
    ["missing", undefined, true],
    ["null", null, false],
    ["string", "3", false],
    ["array", [3], false],
    ["boolean", true, false],
    ["fractional", 3.5, false],
    ["unsafe", Number.MAX_SAFE_INTEGER + 1, false],
  ];

  for (const target of ["review", "entitlement"] as const) {
    for (const [label, value, remove] of invalidSignedAwardValues) {
      const caseRoot = fs.mkdtempSync(
        path.join(
          os.tmpdir(),
          `void-wc-paid-work-${target}-award-${label}-`,
        ),
      );
      const reviewCore = paidWorkUnsignedCore(review);
      const entitlementCore = paidWorkUnsignedCore(entitlement);
      const selected = target === "review" ? reviewCore : entitlementCore;
      if (remove) delete selected.award_wc;
      else selected.award_wc = value;

      const hostileReview = signRecord(
        reviewCore,
        privateKey,
        serviceFingerprint,
      );
      const hostileEntitlement = signRecord(
        entitlementCore,
        privateKey,
        serviceFingerprint,
      );
      const hostileReviewRaw =
        JSON.stringify(hostileReview, null, 2) + "\n";
      const hostileEntitlementRaw =
        JSON.stringify(hostileEntitlement, null, 2) + "\n";
      const hostileAuthority = {
        reviewRaw: hostileReviewRaw,
        entitlementRaw: hostileEntitlementRaw,
        servicePublicKeyPem: publicKeyPem,
      };
      const hostileOptions = {
        ...options,
        dataDir: caseRoot,
        expectedReviewSha256: sha256(hostileReviewRaw),
        expectedEntitlementSha256: sha256(hostileEntitlementRaw),
      };
      const expectedCode =
        target === "review"
          ? "review_award_wc_mismatch"
          : "entitlement_award_wc_mismatch";

      await assert.rejects(
        () =>
          inspectPaidWorkEntitlementAcceptance(
            hostileAuthority,
            hostileOptions,
          ),
        (error: any) =>
          error instanceof PaidWorkEntitlementAcceptanceError &&
          error.code === expectedCode,
        `${target} ${label} signed award was accepted by dry-run`,
      );
      await assert.rejects(
        () =>
          acceptPaidWorkEntitlementOnce(hostileAuthority, {
            ...hostileOptions,
            apply: true,
            confirmation:
              VOID_WC_PAID_WORK_ENTITLEMENT_ACCEPTANCE_CONFIRMATION,
          }),
        (error: any) =>
          error instanceof PaidWorkEntitlementAcceptanceError &&
          error.code === expectedCode,
        `${target} ${label} signed award was accepted by apply`,
      );
      assert.equal(
        fs.existsSync(
          path.join(caseRoot, "wc_v1", "ledger.jsonl"),
        ),
        false,
        `${target} ${label} signed award published WC credit`,
      );
      fs.rmSync(caseRoot, { recursive: true, force: true });
    }
  }

  const assertSignedAuthorityRejected = async (
    label: string,
    mutateCore: (
      reviewCore: Record<string, any>,
      entitlementCore: Record<string, any>,
    ) => void,
    expectedCode: string,
    mutateSigned?: (
      hostileReview: Record<string, any>,
      hostileEntitlement: Record<string, any>,
    ) => void,
  ): Promise<void> => {
    const caseRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), `void-wc-paid-work-${label}-`),
    );
    try {
      const reviewCore = paidWorkUnsignedCore(review);
      const entitlementCore = paidWorkUnsignedCore(entitlement);
      mutateCore(reviewCore, entitlementCore);
      const hostileReview = signRecord(
        reviewCore,
        privateKey,
        serviceFingerprint,
      );
      const hostileEntitlement = signRecord(
        entitlementCore,
        privateKey,
        serviceFingerprint,
      );
      mutateSigned?.(hostileReview, hostileEntitlement);

      const hostileReviewRaw =
        JSON.stringify(hostileReview, null, 2) + "\n";
      const hostileEntitlementRaw =
        JSON.stringify(hostileEntitlement, null, 2) + "\n";
      const hostileAuthority = {
        reviewRaw: hostileReviewRaw,
        entitlementRaw: hostileEntitlementRaw,
        servicePublicKeyPem: publicKeyPem,
      };
      const hostileOptions = {
        ...options,
        dataDir: caseRoot,
        expectedReviewSha256: sha256(hostileReviewRaw),
        expectedEntitlementSha256: sha256(hostileEntitlementRaw),
      };

      for (const apply of [false, true]) {
        const operation = apply
          ? () =>
              acceptPaidWorkEntitlementOnce(hostileAuthority, {
                ...hostileOptions,
                apply: true,
                confirmation:
                  VOID_WC_PAID_WORK_ENTITLEMENT_ACCEPTANCE_CONFIRMATION,
              })
          : () =>
              inspectPaidWorkEntitlementAcceptance(
                hostileAuthority,
                hostileOptions,
              );
        await assert.rejects(
          operation,
          (error: any) =>
            error instanceof PaidWorkEntitlementAcceptanceError &&
            error.code === expectedCode,
          `${label} was accepted by ${apply ? "apply" : "inspect"}`,
        );
      }
      assert.equal(
        fs.existsSync(
          path.join(caseRoot, "wc_v1", "ledger.jsonl"),
        ),
        false,
        `${label} published WC credit`,
      );
    } finally {
      fs.rmSync(caseRoot, { recursive: true, force: true });
    }
  };

  for (const target of ["review", "entitlement"] as const) {
    const canonicalSchema =
      target === "review"
        ? "void-agent-paid-work-review-v1"
        : "void-agent-paid-work-entitlement-v1";
    const swappedSchema =
      target === "review"
        ? "void-agent-paid-work-entitlement-v1"
        : "void-agent-paid-work-review-v1";
    const schemaCases: Array<[string, unknown, boolean]> = [
      ["missing", undefined, true],
      ["null", null, false],
      ["wrong", "void-agent-paid-work-unknown-v1", false],
      ["swapped", swappedSchema, false],
      ["array", [canonicalSchema], false],
      ["boolean", true, false],
    ];
    for (const [label, value, remove] of schemaCases) {
      await assertSignedAuthorityRejected(
        `${target}-schema-${label}`,
        (reviewCore, entitlementCore) => {
          const selected =
            target === "review" ? reviewCore : entitlementCore;
          if (remove) delete selected.schema;
          else selected.schema = value;
        },
        target === "review"
          ? "review_schema_invalid"
          : "entitlement_schema_invalid",
      );
    }
  }

  const signedStringCases: Array<
    [
      string,
      "review" | "entitlement",
      string,
      unknown,
      string,
    ]
  > = [
    ["review-submission", "review", "submission_id", submissionId, "submission_id_required"],
    ["review-task", "review", "task_id", VOID_WC_PAID_WORK_ENTITLEMENT_ACCEPTANCE_TASK, "paid_work_task_mismatch"],
    ["review-agent", "review", "agent_id", account, "agent_id_required"],
    ["review-fingerprint", "review", "agent_key_fingerprint_sha256", agentFingerprint, "agent_key_fingerprint_invalid"],
    ["review-decision", "review", "decision", "approve", "review_decision_not_approve"],
    ["review-status", "review", "status", "approved_pilot_wc_entitlement_issued", "review_status_invalid"],
    ["review-award-type", "review", "award_type", "pilot_wc_entitlement", "review_award_type_invalid"],
    ["entitlement-submission", "entitlement", "submission_id", submissionId, "entitlement_submission_id_mismatch"],
    ["entitlement-task", "entitlement", "task_id", VOID_WC_PAID_WORK_ENTITLEMENT_ACCEPTANCE_TASK, "entitlement_task_id_mismatch"],
    ["entitlement-agent", "entitlement", "agent_id", account, "entitlement_agent_id_mismatch"],
    ["entitlement-fingerprint", "entitlement", "agent_key_fingerprint_sha256", agentFingerprint, "entitlement_agent_key_fingerprint_mismatch"],
    ["entitlement-status", "entitlement", "status", "pilot_wc_entitlement_issued", "entitlement_status_invalid"],
    ["entitlement-award-type", "entitlement", "award_type", "pilot_wc_entitlement", "entitlement_award_type_invalid"],
  ];
  for (const [label, target, field, canonical, expectedCode] of signedStringCases) {
    await assertSignedAuthorityRejected(
      `${label}-array`,
      (reviewCore, entitlementCore) => {
        const selected =
          target === "review" ? reviewCore : entitlementCore;
        selected[field] = [canonical];
      },
      expectedCode,
    );
  }

  for (const target of ["review", "entitlement"] as const) {
    await assertSignedAuthorityRejected(
      `${target}-service-fingerprint-array`,
      () => undefined,
      `${target}_service_key_fingerprint_mismatch`,
      (hostileReview, hostileEntitlement) => {
        const selected =
          target === "review" ? hostileReview : hostileEntitlement;
        selected.service_key_fingerprint_sha256 = [serviceFingerprint];
      },
    );
    await assertSignedAuthorityRejected(
      `${target}-service-signature-array`,
      () => undefined,
      `${target}_service_signature_invalid_base64`,
      (hostileReview, hostileEntitlement) => {
        const selected =
          target === "review" ? hostileReview : hostileEntitlement;
        selected.service_signature_base64 = [
          selected.service_signature_base64,
        ];
      },
    );
  }

  const entitlementSha256 = sha256(entitlementRaw);
  const idempotencyKey =
    `paid-work-entitlement:${submissionId}:` +
    `${entitlementSha256}:award-3`;
  const appendLedgerRow = (
    root: string,
    row: Record<string, any>,
  ): void => {
    const file = path.join(root, "wc_v1", "ledger.jsonl");
    fs.mkdirSync(path.dirname(file), {
      recursive: true,
      mode: 0o700,
    });
    fs.appendFileSync(file, `${JSON.stringify(row)}\n`, {
      encoding: "utf8",
      mode: 0o600,
    });
  };

  const allAliasRoot = path.join(tmp, "idempotency-all-alias");
  appendLedgerRow(allAliasRoot, {
    kind: "credit",
    account: [account],
    delta: 3,
    reason: ["paid_work_entitlement_acceptance_v1"],
    submission_id: [submissionId],
    entitlement_sha256: [entitlementSha256],
    idempotency_key: [idempotencyKey],
  });
  const allAlias = await inspectPaidWorkEntitlementAcceptance(
    authority,
    { ...options, dataDir: allAliasRoot },
  );
  assert.equal(allAlias.duplicate, false);
  assert.equal(allAlias.would_credit, true);
  assert.equal(
    (await readCanonicalWcState(account, allAliasRoot)).redeemable_quanta,
    "0",
  );

  for (const [label, patch] of [
    ["account-array", { account: [account] }],
    ["delta-string", { delta: "3" }],
    [
      "reason-array",
      { reason: ["paid_work_entitlement_acceptance_v1"] },
    ],
  ] as const) {
    const root = path.join(tmp, `idempotency-${label}`);
    appendLedgerRow(root, {
      kind: "credit",
      account,
      delta: 3,
      reason: "paid_work_entitlement_acceptance_v1",
      submission_id: submissionId,
      entitlement_sha256: entitlementSha256,
      idempotency_key: idempotencyKey,
      ...patch,
    });
    await assert.rejects(
      () =>
        inspectPaidWorkEntitlementAcceptance(
          authority,
          { ...options, dataDir: root },
        ),
      (error: any) =>
        error instanceof PaidWorkEntitlementAcceptanceError &&
        error.code === "duplicate_credit_conflict",
      label,
    );
  }

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

  console.log("signed_review_schema_identity_exact=true");
  console.log("signed_entitlement_schema_identity_exact=true");
  console.log("signed_paid_work_string_schema_exact=true");
  console.log("signed_service_metadata_schema_exact=true");
  console.log("signed_review_award_numeric_schema_exact=true");
  console.log("signed_entitlement_award_numeric_schema_exact=true");
  console.log("wrong_typed_signed_schema_wc_credit_rows=0");
  console.log("wrong_typed_signed_award_wc_credit_rows=0");
  console.log("VOID_WC_PAID_WORK_ENTITLEMENT_ACCEPTANCE_V1_PROOF_GREEN");
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
