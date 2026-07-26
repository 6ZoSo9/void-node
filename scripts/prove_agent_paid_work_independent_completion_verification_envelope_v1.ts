import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  AGENT_PAID_WORK_INDEPENDENT_COMPLETION_VERIFICATION_MARKER,
  canonicalJson,
  computeAgentPaidWorkIndependentCompletionVerificationId,
  materializeAgentPaidWorkIndependentCompletionVerification,
  validateAgentPaidWorkIndependentCompletionVerificationDraft,
  validateAgentPaidWorkIndependentCompletionVerificationEnvelope,
  type AgentPaidWorkIndependentCompletionVerificationDraft,
} from "./agent_paid_work_independent_completion_verification_envelope_v1.js";

function assertCondition(
  condition: unknown,
  message: string,
): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function expectReject(label: string, action: () => void): void {
  let rejected = false;
  try {
    action();
  } catch {
    rejected = true;
  }
  assertCondition(rejected, `${label} was unexpectedly accepted`);
}

function readText(path: string): string {
  return readFileSync(resolve(path), "utf8");
}

function readJson(path: string): unknown {
  return JSON.parse(readText(path)) as unknown;
}

function reverseObjectKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(reverseObjectKeys);
  }
  if (typeof value !== "object" || value === null) {
    return value;
  }
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .reverse()
      .map(([key, child]) => [key, reverseObjectKeys(child)]),
  );
}

const workOrder = readJson(
  "examples/agent-paid-work-order-envelope-v1.example.json",
);
const quote = readJson(
  "examples/agent-paid-work-quote-envelope-v1.example.json",
);
const acceptance = readJson(
  "examples/agent-paid-work-acceptance-envelope-v1.example.json",
);
const paymentIntent = readJson(
  "examples/agent-paid-work-payment-intent-envelope-v1.example.json",
);
const paymentExecutionAuthorization = readJson(
  "examples/agent-paid-work-payment-execution-authorization-envelope-v1.example.json",
);
const paymentReceipt = readJson(
  "examples/agent-paid-work-payment-receipt-envelope-v1.example.json",
);
const paymentConfirmation = readJson(
  "examples/agent-paid-work-independent-payment-confirmation-envelope-v1.example.json",
);
const workExecutionAuthorization = readJson(
  "examples/agent-paid-work-execution-authorization-envelope-v1.example.json",
);
const completionReceipt = readJson(
  "examples/agent-paid-work-completion-receipt-envelope-v1.example.json",
);
const verificationValue = readJson(
  "examples/agent-paid-work-independent-completion-verification-envelope-v1.example.json",
);

validateAgentPaidWorkIndependentCompletionVerificationEnvelope(
  workOrder,
  quote,
  acceptance,
  paymentIntent,
  paymentExecutionAuthorization,
  paymentReceipt,
  paymentConfirmation,
  workExecutionAuthorization,
  completionReceipt,
  verificationValue,
);

const verificationRecord =
  verificationValue as unknown as Record<string, unknown>;
const {
  independent_completion_verification_id: committedVerificationId,
  ...draftValue
} = verificationRecord;

validateAgentPaidWorkIndependentCompletionVerificationDraft(
  workOrder,
  quote,
  acceptance,
  paymentIntent,
  paymentExecutionAuthorization,
  paymentReceipt,
  paymentConfirmation,
  workExecutionAuthorization,
  completionReceipt,
  draftValue,
);

const draft =
  draftValue as unknown as AgentPaidWorkIndependentCompletionVerificationDraft;

const materialized =
  materializeAgentPaidWorkIndependentCompletionVerification(
    workOrder,
    quote,
    acceptance,
    paymentIntent,
    paymentExecutionAuthorization,
    paymentReceipt,
    paymentConfirmation,
    workExecutionAuthorization,
    completionReceipt,
    draft,
  );

assertCondition(
  materialized.independent_completion_verification_id ===
    committedVerificationId,
  "committed independent verification ID is not reproducible",
);
assertCondition(
  materialized.independent_completion_verification_id ===
    computeAgentPaidWorkIndependentCompletionVerificationId(draft),
  "computed independent verification ID mismatch",
);

const reordered = reverseObjectKeys(draft);
validateAgentPaidWorkIndependentCompletionVerificationDraft(
  workOrder,
  quote,
  acceptance,
  paymentIntent,
  paymentExecutionAuthorization,
  paymentReceipt,
  paymentConfirmation,
  workExecutionAuthorization,
  completionReceipt,
  reordered,
);
assertCondition(
  materializeAgentPaidWorkIndependentCompletionVerification(
    workOrder,
    quote,
    acceptance,
    paymentIntent,
    paymentExecutionAuthorization,
    paymentReceipt,
    paymentConfirmation,
    workExecutionAuthorization,
    completionReceipt,
    reordered,
  ).independent_completion_verification_id ===
    materialized.independent_completion_verification_id,
  "canonical verification ID changed when object key order changed",
);
assertCondition(
  canonicalJson(reordered) === canonicalJson(draft),
  "canonical verification JSON changed when object key order changed",
);

const badId = structuredClone(materialized);
badId.independent_completion_verification_id =
  `voidawicv1_${"0".repeat(64)}`;
expectReject("tampered independent verification ID", () =>
  validateAgentPaidWorkIndependentCompletionVerificationEnvelope(
    workOrder,
    quote,
    acceptance,
    paymentIntent,
    paymentExecutionAuthorization,
    paymentReceipt,
    paymentConfirmation,
    workExecutionAuthorization,
    completionReceipt,
    badId,
  ),
);

function rejectDraft(
  label: string,
  candidate: unknown,
): void {
  expectReject(label, () =>
    validateAgentPaidWorkIndependentCompletionVerificationDraft(
      workOrder,
      quote,
      acceptance,
      paymentIntent,
      paymentExecutionAuthorization,
      paymentReceipt,
      paymentConfirmation,
      workExecutionAuthorization,
      completionReceipt,
      candidate,
    ),
  );
}

const idMutations: Array<
  [
    string,
    keyof Pick<
      AgentPaidWorkIndependentCompletionVerificationDraft,
      | "work_order_id"
      | "quote_id"
      | "acceptance_id"
      | "payment_intent_id"
      | "payment_execution_authorization_id"
      | "payment_receipt_id"
      | "payment_confirmation_id"
      | "work_execution_authorization_id"
      | "work_completion_receipt_id"
    >,
    string,
  ]
> = [
  ["work-order binding", "work_order_id", `voidawo1_${"0".repeat(64)}`],
  ["quote binding", "quote_id", `voidawq1_${"0".repeat(64)}`],
  ["acceptance binding", "acceptance_id", `voidawa1_${"0".repeat(64)}`],
  ["payment-intent binding", "payment_intent_id", `voidawpi1_${"0".repeat(64)}`],
  [
    "payment-execution-authorization binding",
    "payment_execution_authorization_id",
    `voidawpea1_${"0".repeat(64)}`,
  ],
  ["payment-receipt binding", "payment_receipt_id", `voidawper1_${"0".repeat(64)}`],
  [
    "payment-confirmation binding",
    "payment_confirmation_id",
    `voidawpc1_${"0".repeat(64)}`,
  ],
  [
    "work-execution-authorization binding",
    "work_execution_authorization_id",
    `voidawwea1_${"0".repeat(64)}`,
  ],
  [
    "completion-receipt binding",
    "work_completion_receipt_id",
    `voidawcr1_${"0".repeat(64)}`,
  ],
];

for (const [label, key, replacement] of idMutations) {
  const candidate = structuredClone(draft);
  candidate[key] = replacement;
  rejectDraft(label, candidate);
}

for (const [label, mutate] of [
  [
    "executor subject binding",
    (candidate: AgentPaidWorkIndependentCompletionVerificationDraft) => {
      candidate.subject.executor_id = "void.executor.other";
    },
  ],
  [
    "provider subject binding",
    (candidate: AgentPaidWorkIndependentCompletionVerificationDraft) => {
      candidate.subject.provider_id = "void.provider.other";
    },
  ],
  [
    "execution identifier binding",
    (candidate: AgentPaidWorkIndependentCompletionVerificationDraft) => {
      candidate.subject.execution_id = "void.execution.other";
    },
  ],
  [
    "execution status binding",
    (candidate: AgentPaidWorkIndependentCompletionVerificationDraft) => {
      candidate.subject.execution_status = "failed";
    },
  ],
] as const) {
  const candidate = structuredClone(draft);
  mutate(candidate);
  rejectDraft(label, candidate);
}

for (const [key, replacement] of [
  ["task_type", "other_task"],
  ["task_spec_sha256", `sha256:${"0".repeat(64)}`],
  ["input_manifest_sha256", `sha256:${"0".repeat(64)}`],
  ["expected_output_schema_sha256", `sha256:${"0".repeat(64)}`],
  ["result_delivery_channel_id", "void.delivery.other"],
] as const) {
  const candidate = structuredClone(draft);
  candidate.work_contract[key] = replacement;
  rejectDraft(`work-contract binding ${key}`, candidate);
}

for (const key of Object.keys(draft.observed_result_commitments) as Array<
  keyof AgentPaidWorkIndependentCompletionVerificationDraft[
    "observed_result_commitments"
  ]
>) {
  const candidate = structuredClone(draft);
  candidate.observed_result_commitments[key] =
    `sha256:${"0".repeat(64)}`;
  rejectDraft(`observed result commitment ${key}`, candidate);
}

const verifierMismatch = structuredClone(draft);
verifierMismatch.verifier.verifier_id = "void.verifier.other";
rejectDraft("authorized verifier identity binding", verifierMismatch);

const verifierPolicyMismatch = structuredClone(draft);
verifierPolicyMismatch.verifier.verification_policy_id =
  "void.policy.other";
rejectDraft("verification policy binding", verifierPolicyMismatch);

const verifierEqualsExecutor = structuredClone(draft);
verifierEqualsExecutor.verifier.verifier_id =
  verifierEqualsExecutor.subject.executor_id;
verifierEqualsExecutor.verifier_authentication.signer_id =
  verifierEqualsExecutor.subject.executor_id;
rejectDraft("verifier equals executor", verifierEqualsExecutor);

const verifierEqualsProvider = structuredClone(draft);
verifierEqualsProvider.verifier.verifier_id =
  verifierEqualsProvider.subject.provider_id;
verifierEqualsProvider.verifier_authentication.signer_id =
  verifierEqualsProvider.subject.provider_id;
rejectDraft("verifier equals provider", verifierEqualsProvider);

const verifierEqualsAuthorizer = structuredClone(draft);
verifierEqualsAuthorizer.verifier.verifier_id =
  "void.authority.work.operator";
verifierEqualsAuthorizer.verifier_authentication.signer_id =
  "void.authority.work.operator";
rejectDraft("verifier equals authorizer", verifierEqualsAuthorizer);

const verifierSignerMismatch = structuredClone(draft);
verifierSignerMismatch.verifier_authentication.signer_id =
  "void.verifier.other";
rejectDraft("verifier signer mismatch", verifierSignerMismatch);

const verificationPredatesReceipt = structuredClone(draft);
verificationPredatesReceipt.verified_at_utc = "2026-07-25T22:57:09Z";
rejectDraft(
  "verification predates completion receipt",
  verificationPredatesReceipt,
);

for (const key of Object.keys(draft.checks) as Array<
  keyof AgentPaidWorkIndependentCompletionVerificationDraft["checks"]
>) {
  const candidate = structuredClone(draft);
  candidate.checks[key] = false;
  rejectDraft(`verified decision with failed check ${key}`, candidate);
}

const verifiedOnFailedExecution = structuredClone(draft);
verifiedOnFailedExecution.subject.execution_status = "failed";
rejectDraft(
  "verified decision on non-success execution",
  verifiedOnFailedExecution,
);

const verifiedCompletionFalse = structuredClone(draft);
verifiedCompletionFalse.decision.completion_verified = false;
rejectDraft(
  "verified decision with completion_verified=false",
  verifiedCompletionFalse,
);

const verifiedWithFailureReason = structuredClone(draft);
verifiedWithFailureReason.decision.failure_reason_code =
  "verification.unexpected";
rejectDraft(
  "verified decision with failure reason",
  verifiedWithFailureReason,
);

const verifiedNonFinal = structuredClone(draft);
verifiedNonFinal.decision.decision_final = false;
rejectDraft("verified decision marked non-final", verifiedNonFinal);

const rejected = structuredClone(draft);
rejected.checks.result_payload_schema_valid = false;
rejected.checks.completion_requirements_satisfied = false;
rejected.decision.status = "rejected";
rejected.decision.completion_verified = false;
rejected.decision.failure_reason_code =
  "result.payload.schema.invalid";
rejected.decision.decision_final = true;

validateAgentPaidWorkIndependentCompletionVerificationDraft(
  workOrder,
  quote,
  acceptance,
  paymentIntent,
  paymentExecutionAuthorization,
  paymentReceipt,
  paymentConfirmation,
  workExecutionAuthorization,
  completionReceipt,
  rejected,
);

const rejectedEnvelope =
  materializeAgentPaidWorkIndependentCompletionVerification(
    workOrder,
    quote,
    acceptance,
    paymentIntent,
    paymentExecutionAuthorization,
    paymentReceipt,
    paymentConfirmation,
    workExecutionAuthorization,
    completionReceipt,
    rejected,
  );

assertCondition(
  rejectedEnvelope.independent_completion_verification_id !==
    materialized.independent_completion_verification_id,
  "rejected decision did not alter verification identity",
);

const rejectedWithoutFailure = structuredClone(rejected);
rejectedWithoutFailure.decision.failure_reason_code = null;
rejectDraft(
  "rejected decision without failure reason",
  rejectedWithoutFailure,
);

const rejectedNonFinal = structuredClone(rejected);
rejectedNonFinal.decision.decision_final = false;
rejectDraft("rejected decision marked non-final", rejectedNonFinal);

const rejectedCompletionTrue = structuredClone(rejected);
rejectedCompletionTrue.decision.completion_verified = true;
rejectDraft(
  "rejected decision with completion_verified=true",
  rejectedCompletionTrue,
);

const rejectedWithAllChecksTrue = structuredClone(draft);
rejectedWithAllChecksTrue.decision.status = "rejected";
rejectedWithAllChecksTrue.decision.completion_verified = false;
rejectedWithAllChecksTrue.decision.failure_reason_code =
  "verification.rejected.without.failed.check";
rejectDraft(
  "rejected decision without a failed check",
  rejectedWithAllChecksTrue,
);

const inconclusive = structuredClone(draft);
inconclusive.checks.evidence_bundle_verified = false;
inconclusive.decision.status = "inconclusive";
inconclusive.decision.completion_verified = false;
inconclusive.decision.failure_reason_code =
  "verification.evidence.unavailable";
inconclusive.decision.decision_final = false;

validateAgentPaidWorkIndependentCompletionVerificationDraft(
  workOrder,
  quote,
  acceptance,
  paymentIntent,
  paymentExecutionAuthorization,
  paymentReceipt,
  paymentConfirmation,
  workExecutionAuthorization,
  completionReceipt,
  inconclusive,
);

const inconclusiveEnvelope =
  materializeAgentPaidWorkIndependentCompletionVerification(
    workOrder,
    quote,
    acceptance,
    paymentIntent,
    paymentExecutionAuthorization,
    paymentReceipt,
    paymentConfirmation,
    workExecutionAuthorization,
    completionReceipt,
    inconclusive,
  );

assertCondition(
  inconclusiveEnvelope.independent_completion_verification_id !==
    materialized.independent_completion_verification_id,
  "inconclusive decision did not alter verification identity",
);

const inconclusiveFinal = structuredClone(inconclusive);
inconclusiveFinal.decision.decision_final = true;
rejectDraft("inconclusive decision marked final", inconclusiveFinal);

const inconclusiveWithoutFailure = structuredClone(inconclusive);
inconclusiveWithoutFailure.decision.failure_reason_code = null;
rejectDraft(
  "inconclusive decision without failure reason",
  inconclusiveWithoutFailure,
);

const supersedingVerification =
  structuredClone(draft) as unknown as Record<string, unknown>;
(
  supersedingVerification.decision as Record<string, unknown>
).supersedes_verification_id =
  `voidawicv1_${"0".repeat(64)}`;
rejectDraft(
  "superseding verification inside V1 envelope",
  supersedingVerification,
);

for (const key of Object.keys(draft.verification_evidence) as Array<
  keyof AgentPaidWorkIndependentCompletionVerificationDraft[
    "verification_evidence"
  ]
>) {
  const candidate = structuredClone(draft);
  candidate.verification_evidence[key] =
    `sha256:${"0".repeat(64)}`;
  const altered =
    materializeAgentPaidWorkIndependentCompletionVerification(
      workOrder,
      quote,
      acceptance,
      paymentIntent,
      paymentExecutionAuthorization,
      paymentReceipt,
      paymentConfirmation,
      workExecutionAuthorization,
      completionReceipt,
      candidate,
    );
  assertCondition(
    altered.independent_completion_verification_id !==
      materialized.independent_completion_verification_id,
    `verification evidence ${key} did not alter verification identity`,
  );
}

for (const key of Object.keys(draft.attestation)) {
  const candidate =
    structuredClone(draft) as unknown as Record<string, unknown>;
  const attestation =
    candidate.attestation as Record<string, unknown>;
  attestation[key] = !attestation[key];
  rejectDraft(`attestation ${key}`, candidate);
}

for (const [section, key, value] of [
  ["verifier", "private_key", "secret"],
  ["verification_evidence", "raw_evidence", "embedded"],
  ["decision", "wc_award_amount", 3],
  ["verifier_authentication", "signature", "raw-signature"],
] as const) {
  const candidate =
    structuredClone(draft) as unknown as Record<string, unknown>;
  (candidate[section] as Record<string, unknown>)[key] = value;
  rejectDraft(`${section}.${key} injection`, candidate);
}

const schemaText = readText(
  "schemas/agent-paid-work-independent-completion-verification-envelope-v1.schema.json",
);
const docs = readText(
  "docs/public/agent-paid-work-independent-completion-verification-envelope-v1.md",
);
const moduleSource = readText(
  "scripts/agent_paid_work_independent_completion_verification_envelope_v1.ts",
);
const schema = JSON.parse(schemaText) as Record<string, unknown>;

assertCondition(
  schema.$schema === "https://json-schema.org/draft/2020-12/schema",
  "schema draft mismatch",
);
assertCondition(
  schemaText.includes(
    AGENT_PAID_WORK_INDEPENDENT_COMPLETION_VERIFICATION_MARKER,
  ),
  "schema marker missing",
);
assertCondition(
  schemaText.includes('"allOf": ['),
  "schema decision conditionals missing",
);
assertCondition(
  docs.includes(
    AGENT_PAID_WORK_INDEPENDENT_COMPLETION_VERIFICATION_MARKER,
  ),
  "documentation marker missing",
);
assertCondition(
  moduleSource.includes(
    "./agent_paid_work_completion_receipt_envelope_v1.js",
  ),
  "completion-receipt validator binding missing",
);

const normalizedDocs = docs.replace(/\s+/g, " ");
for (const boundary of [
  "V1 covers step 10 only.",
  "The verifier must be independent from:",
  "A `verified` decision requires every check to be `true`.",
  "Rejected evidence must remain visible",
  "An inconclusive result is not a failed verification",
  "A final verified or rejected decision cannot be silently replaced.",
  "`work_credit_award_separate=true`",
  "`completion_receipt_mutation_authorized=false`",
  "`work_credit_award_authorized=false`",
  "`payment_mutation_authorized=false`",
  "`wallet_or_signer_access_authorized=false`",
  "`runtime_administration_authorized=false`",
  "`buy_void_fulfillment_authorized=false`",
  "it is not itself an award instruction.",
  "does not add a public HTTP route",
  "or activate Buy VOID fulfillment",
]) {
  assertCondition(
    normalizedDocs.includes(boundary),
    `documentation boundary missing: ${boundary}`,
  );
}

console.log(
  `marker=${
    AGENT_PAID_WORK_INDEPENDENT_COMPLETION_VERIFICATION_MARKER
  }`,
);
console.log(
  `example_work_completion_receipt_id=${
    materialized.work_completion_receipt_id
  }`,
);
console.log(
  `example_independent_completion_verification_id=${
    materialized.independent_completion_verification_id
  }`,
);
console.log(`example_decision_status=${materialized.decision.status}`);
console.log(
  `example_completion_verified=${
    materialized.decision.completion_verified
  }`,
);
console.log(
  `canonical_bytes=${Buffer.byteLength(canonicalJson(draft), "utf8")}`,
);
console.log("tampered_verification_id_rejected=yes");
console.log("complete_paid_work_lineage_binding_verified=yes");
console.log("exact_completion_receipt_binding_verified=yes");
console.log("verifier_policy_and_signer_binding_verified=yes");
console.log("verifier_executor_provider_authorizer_separation_required=yes");
console.log("task_and_result_commitment_binding_verified=yes");
console.log("verification_timestamp_ordering_enforced=yes");
console.log("verified_requires_all_checks_and_successful_execution=yes");
console.log("rejected_decision_with_failure_evidence_accepted=yes");
console.log("inconclusive_nonfinal_decision_with_failure_evidence_accepted=yes");
console.log("finality_and_no_superseding_boundary_enforced=yes");
console.log("verification_evidence_commitments_bound=yes");
console.log("receipt_wc_payment_wallet_runtime_mutations_forbidden=yes");
console.log("schema_parse_and_documentation_boundaries_verified=yes");
console.log(
  "VOID_AGENT_PAID_WORK_INDEPENDENT_COMPLETION_VERIFICATION_"
  + "ENVELOPE_V1_PROOF_GREEN",
);
