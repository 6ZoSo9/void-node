import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  AGENT_PAID_WORK_WC_AWARD_AUTHORIZATION_MARKER,
  canonicalJson,
  computeAgentPaidWorkWcAwardAuthorizationId,
  materializeAgentPaidWorkWcAwardAuthorization,
  validateAgentPaidWorkWcAwardAuthorizationDraft,
  validateAgentPaidWorkWcAwardAuthorizationEnvelope,
  type AgentPaidWorkWcAwardAuthorizationDraft,
} from "./agent_paid_work_wc_award_authorization_envelope_v1.js";
import {
  materializeAgentPaidWorkIndependentCompletionVerification,
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
const independentVerificationValue = readJson(
  "examples/agent-paid-work-independent-completion-verification-envelope-v1.example.json",
);
const awardAuthorizationValue = readJson(
  "examples/agent-paid-work-wc-award-authorization-envelope-v1.example.json",
);

validateAgentPaidWorkWcAwardAuthorizationEnvelope(
  workOrder,
  quote,
  acceptance,
  paymentIntent,
  paymentExecutionAuthorization,
  paymentReceipt,
  paymentConfirmation,
  workExecutionAuthorization,
  completionReceipt,
  independentVerificationValue,
  awardAuthorizationValue,
);

const authorizationRecord =
  awardAuthorizationValue as unknown as Record<string, unknown>;
const {
  wc_award_authorization_id: committedAuthorizationId,
  ...draftValue
} = authorizationRecord;

validateAgentPaidWorkWcAwardAuthorizationDraft(
  workOrder,
  quote,
  acceptance,
  paymentIntent,
  paymentExecutionAuthorization,
  paymentReceipt,
  paymentConfirmation,
  workExecutionAuthorization,
  completionReceipt,
  independentVerificationValue,
  draftValue,
);

const draft =
  draftValue as unknown as AgentPaidWorkWcAwardAuthorizationDraft;

const materialized = materializeAgentPaidWorkWcAwardAuthorization(
  workOrder,
  quote,
  acceptance,
  paymentIntent,
  paymentExecutionAuthorization,
  paymentReceipt,
  paymentConfirmation,
  workExecutionAuthorization,
  completionReceipt,
  independentVerificationValue,
  draft,
);

assertCondition(
  materialized.wc_award_authorization_id === committedAuthorizationId,
  "committed WC award authorization ID is not reproducible",
);
assertCondition(
  materialized.wc_award_authorization_id ===
    computeAgentPaidWorkWcAwardAuthorizationId(draft),
  "computed WC award authorization ID mismatch",
);

const reordered = reverseObjectKeys(draft);
validateAgentPaidWorkWcAwardAuthorizationDraft(
  workOrder,
  quote,
  acceptance,
  paymentIntent,
  paymentExecutionAuthorization,
  paymentReceipt,
  paymentConfirmation,
  workExecutionAuthorization,
  completionReceipt,
  independentVerificationValue,
  reordered,
);
assertCondition(
  materializeAgentPaidWorkWcAwardAuthorization(
    workOrder,
    quote,
    acceptance,
    paymentIntent,
    paymentExecutionAuthorization,
    paymentReceipt,
    paymentConfirmation,
    workExecutionAuthorization,
    completionReceipt,
    independentVerificationValue,
    reordered,
  ).wc_award_authorization_id ===
    materialized.wc_award_authorization_id,
  "canonical authorization ID changed when object key order changed",
);
assertCondition(
  canonicalJson(reordered) === canonicalJson(draft),
  "canonical authorization JSON changed when object key order changed",
);

const badId = structuredClone(materialized);
badId.wc_award_authorization_id =
  `voidawwcaa1_${"0".repeat(64)}`;
expectReject("tampered WC award authorization ID", () =>
  validateAgentPaidWorkWcAwardAuthorizationEnvelope(
    workOrder,
    quote,
    acceptance,
    paymentIntent,
    paymentExecutionAuthorization,
    paymentReceipt,
    paymentConfirmation,
    workExecutionAuthorization,
    completionReceipt,
    independentVerificationValue,
    badId,
  ),
);

function rejectDraft(
  label: string,
  candidate: unknown,
  verification: unknown = independentVerificationValue,
): void {
  expectReject(label, () =>
    validateAgentPaidWorkWcAwardAuthorizationDraft(
      workOrder,
      quote,
      acceptance,
      paymentIntent,
      paymentExecutionAuthorization,
      paymentReceipt,
      paymentConfirmation,
      workExecutionAuthorization,
      completionReceipt,
      verification,
      candidate,
    ),
  );
}

const lineageMutations: Array<
  [
    string,
    keyof Pick<
      AgentPaidWorkWcAwardAuthorizationDraft,
      | "work_order_id"
      | "quote_id"
      | "acceptance_id"
      | "payment_intent_id"
      | "payment_execution_authorization_id"
      | "payment_receipt_id"
      | "payment_confirmation_id"
      | "work_execution_authorization_id"
      | "work_completion_receipt_id"
      | "independent_completion_verification_id"
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
  [
    "independent-verification binding",
    "independent_completion_verification_id",
    `voidawicv1_${"0".repeat(64)}`,
  ],
];

for (const [label, key, replacement] of lineageMutations) {
  const candidate = structuredClone(draft);
  candidate[key] = replacement;
  rejectDraft(label, candidate);
}

for (const [label, mutate] of [
  [
    "beneficiary executor binding",
    (candidate: AgentPaidWorkWcAwardAuthorizationDraft) => {
      candidate.beneficiary.executor_id = "void.executor.other";
    },
  ],
  [
    "beneficiary provider binding",
    (candidate: AgentPaidWorkWcAwardAuthorizationDraft) => {
      candidate.beneficiary.provider_id = "void.provider.other";
    },
  ],
  [
    "verified-completion verifier binding",
    (candidate: AgentPaidWorkWcAwardAuthorizationDraft) => {
      candidate.verified_completion.verifier_id = "void.verifier.other";
    },
  ],
  [
    "verified-completion policy binding",
    (candidate: AgentPaidWorkWcAwardAuthorizationDraft) => {
      candidate.verified_completion.verification_policy_id =
        "void.policy.other";
    },
  ],
] as const) {
  const candidate = structuredClone(draft);
  mutate(candidate);
  rejectDraft(label, candidate);
}

const authorizationPredatesVerification = structuredClone(draft);
authorizationPredatesVerification.authorized_at_utc =
  "2026-07-25T22:58:59Z";
authorizationPredatesVerification.expires_at_utc =
  "2026-07-25T23:13:59Z";
rejectDraft(
  "WC award authorization predates independent verification",
  authorizationPredatesVerification,
);

const expiresAtAuthorizationTime = structuredClone(draft);
expiresAtAuthorizationTime.expires_at_utc =
  expiresAtAuthorizationTime.authorized_at_utc;
rejectDraft(
  "authorization expiration not after authorization time",
  expiresAtAuthorizationTime,
);

const excessiveLifetime = structuredClone(draft);
excessiveLifetime.expires_at_utc = "2026-07-25T23:15:01Z";
rejectDraft("authorization lifetime over 900 seconds", excessiveLifetime);

const zeroAward = structuredClone(draft);
zeroAward.award.amount_wc = 0;
rejectDraft("zero WC award", zeroAward);

const negativeAward = structuredClone(draft);
negativeAward.award.amount_wc = -1;
rejectDraft("negative WC award", negativeAward);

const awardOverCap = structuredClone(draft);
awardOverCap.award.amount_wc = 4;
rejectDraft("WC award exceeds maximum authorized amount", awardOverCap);

const zeroMaximum = structuredClone(draft);
zeroMaximum.award.maximum_authorized_amount_wc = 0;
rejectDraft("zero maximum authorized WC amount", zeroMaximum);

const wrongDenomination =
  structuredClone(draft) as unknown as Record<string, unknown>;
(wrongDenomination.award as Record<string, unknown>).denomination = "VOID";
rejectDraft("non-WC denomination", wrongDenomination);

const invalidReason = structuredClone(draft);
invalidReason.award.award_reason_code = "Verified Paid Work";
rejectDraft("invalid award reason code", invalidReason);

const policyMismatch = structuredClone(draft);
policyMismatch.authorizer.authority_policy_id =
  "void.policy.other";
rejectDraft("authorizer and award policy mismatch", policyMismatch);

const destinationMismatch = structuredClone(draft);
destinationMismatch.ledger_target.destination_account_id =
  "void-paid-work-other-account";
rejectDraft("ledger destination and beneficiary mismatch", destinationMismatch);

const uniquenessMismatch = structuredClone(draft);
uniquenessMismatch.ledger_target.uniqueness_key =
  `paid-work-verification:voidawicv1_${"0".repeat(64)}`;
rejectDraft("ledger uniqueness key mismatch", uniquenessMismatch);

const wrongEntryType =
  structuredClone(draft) as unknown as Record<string, unknown>;
(wrongEntryType.ledger_target as Record<string, unknown>).entry_type =
  "debit";
rejectDraft("non-earn ledger entry type", wrongEntryType);

for (const [label, replacement] of [
  ["authorizer equals executor", draft.beneficiary.executor_id],
  ["authorizer equals provider", draft.beneficiary.provider_id],
  ["authorizer equals verifier", draft.verified_completion.verifier_id],
] as const) {
  const candidate = structuredClone(draft);
  candidate.authorizer.authority_id = replacement;
  rejectDraft(label, candidate);
}

const invalidSignatureScheme =
  structuredClone(draft) as unknown as Record<string, unknown>;
(
  invalidSignatureScheme.authorizer as Record<string, unknown>
).signature_scheme = "secp256k1";
rejectDraft("invalid authorizer signature scheme", invalidSignatureScheme);

for (const key of Object.keys(draft.authorization)) {
  const candidate =
    structuredClone(draft) as unknown as Record<string, unknown>;
  (candidate.authorization as Record<string, unknown>)[key] = false;
  rejectDraft(`authorization ${key}`, candidate);
}

const independentVerificationRecord =
  independentVerificationValue as unknown as Record<string, unknown>;
const {
  independent_completion_verification_id: _verificationId,
  ...independentVerificationDraftValue
} = independentVerificationRecord;
const independentVerificationDraft =
  independentVerificationDraftValue as unknown as
    AgentPaidWorkIndependentCompletionVerificationDraft;

const rejectedVerificationDraft =
  structuredClone(independentVerificationDraft);
rejectedVerificationDraft.checks.result_payload_schema_valid = false;
rejectedVerificationDraft.checks.completion_requirements_satisfied = false;
rejectedVerificationDraft.decision.status = "rejected";
rejectedVerificationDraft.decision.completion_verified = false;
rejectedVerificationDraft.decision.failure_reason_code =
  "result.payload.schema.invalid";
rejectedVerificationDraft.decision.decision_final = true;

const rejectedVerification =
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
    rejectedVerificationDraft,
  );

rejectDraft(
  "WC award from rejected completion verification",
  draft,
  rejectedVerification,
);

const inconclusiveVerificationDraft =
  structuredClone(independentVerificationDraft);
inconclusiveVerificationDraft.checks.evidence_bundle_verified = false;
inconclusiveVerificationDraft.decision.status = "inconclusive";
inconclusiveVerificationDraft.decision.completion_verified = false;
inconclusiveVerificationDraft.decision.failure_reason_code =
  "verification.evidence.unavailable";
inconclusiveVerificationDraft.decision.decision_final = false;

const inconclusiveVerification =
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
    inconclusiveVerificationDraft,
  );

rejectDraft(
  "WC award from inconclusive completion verification",
  draft,
  inconclusiveVerification,
);

for (const [label, mutate] of [
  [
    "score-basis commitment",
    (candidate: AgentPaidWorkWcAwardAuthorizationDraft) => {
      candidate.award.score_basis_sha256 =
        `sha256:${"0".repeat(64)}`;
    },
  ],
  [
    "ledger expected-prestate commitment",
    (candidate: AgentPaidWorkWcAwardAuthorizationDraft) => {
      candidate.ledger_target.expected_prestate_sha256 =
        `sha256:${"0".repeat(64)}`;
    },
  ],
  [
    "authorizer signed-payload commitment",
    (candidate: AgentPaidWorkWcAwardAuthorizationDraft) => {
      candidate.authorizer.signed_payload_sha256 =
        `sha256:${"0".repeat(64)}`;
    },
  ],
  [
    "authorizer signature-evidence commitment",
    (candidate: AgentPaidWorkWcAwardAuthorizationDraft) => {
      candidate.authorizer.signature_evidence_sha256 =
        `sha256:${"0".repeat(64)}`;
    },
  ],
] as const) {
  const candidate = structuredClone(draft);
  mutate(candidate);
  const altered = materializeAgentPaidWorkWcAwardAuthorization(
    workOrder,
    quote,
    acceptance,
    paymentIntent,
    paymentExecutionAuthorization,
    paymentReceipt,
    paymentConfirmation,
    workExecutionAuthorization,
    completionReceipt,
    independentVerificationValue,
    candidate,
  );
  assertCondition(
    altered.wc_award_authorization_id !==
      materialized.wc_award_authorization_id,
    `${label} did not alter the authorization identity`,
  );
}

const alternateBoundAccount = structuredClone(draft);
alternateBoundAccount.beneficiary.wc_account_id =
  "void-paid-work-executor-nimo-alternate";
alternateBoundAccount.ledger_target.destination_account_id =
  "void-paid-work-executor-nimo-alternate";

const alternateAccountEnvelope =
  materializeAgentPaidWorkWcAwardAuthorization(
    workOrder,
    quote,
    acceptance,
    paymentIntent,
    paymentExecutionAuthorization,
    paymentReceipt,
    paymentConfirmation,
    workExecutionAuthorization,
    completionReceipt,
    independentVerificationValue,
    alternateBoundAccount,
  );

assertCondition(
  alternateAccountEnvelope.wc_award_authorization_id !==
    materialized.wc_award_authorization_id,
  "beneficiary WC account change did not alter authorization identity",
);

for (const [section, key, value] of [
  ["beneficiary", "wallet_address", "0xdead"],
  ["award", "void_amount", 1],
  ["ledger_target", "execute_now", true],
  ["authorizer", "private_key", "secret"],
  ["authorization", "ledger_write_completed", true],
] as const) {
  const candidate =
    structuredClone(draft) as unknown as Record<string, unknown>;
  (candidate[section] as Record<string, unknown>)[key] = value;
  rejectDraft(`${section}.${key} injection`, candidate);
}

const schemaText = readText(
  "schemas/agent-paid-work-wc-award-authorization-envelope-v1.schema.json",
);
const docs = readText(
  "docs/public/agent-paid-work-wc-award-authorization-envelope-v1.md",
);
const moduleSource = readText(
  "scripts/agent_paid_work_wc_award_authorization_envelope_v1.ts",
);
const schema = JSON.parse(schemaText) as Record<string, unknown>;

assertCondition(
  schema.$schema === "https://json-schema.org/draft/2020-12/schema",
  "schema draft mismatch",
);
assertCondition(
  schemaText.includes(AGENT_PAID_WORK_WC_AWARD_AUTHORIZATION_MARKER),
  "schema marker missing",
);
assertCondition(
  schemaText.includes('"denomination": {'),
  "schema WC denomination constraint missing",
);
assertCondition(
  schemaText.includes('"entry_type": {'),
  "schema ledger entry-type constraint missing",
);
assertCondition(
  docs.includes(AGENT_PAID_WORK_WC_AWARD_AUTHORIZATION_MARKER),
  "documentation marker missing",
);
assertCondition(
  moduleSource.includes(
    "./agent_paid_work_independent_completion_verification_envelope_v1.js",
  ),
  "independent verification validator binding missing",
);

const normalizedDocs = docs.replace(/\s+/g, " ");
for (const boundary of [
  "V1 covers step 11 only.",
  "A rejected, inconclusive, non-final, superseded, mismatched, or unverified completion cannot receive this authorization.",
  "The ledger destination account must equal the beneficiary WC account.",
  "`amount_wc` must be greater than zero",
  "Authorization consumption and ledger mutation must occur atomically.",
  "No WC is earned merely because the authorization envelope exists.",
  "This envelope grants no authority to debit WC, mint or transfer VOID",
  "`wc_to_void_settlement_separate=true`",
  "`payment_mutation_forbidden=true`",
  "`wallet_access_forbidden=true`",
  "`runtime_administration_forbidden=true`",
  "`buy_void_fulfillment_forbidden=true`",
  "`authorization_is_not_ledger_write=true`",
  "`authorization_is_not_wc_to_void_settlement=true`",
  "`authorization_is_not_payment_instruction=true`",
  "does not add a public HTTP route",
  "or activate Buy VOID fulfillment",
]) {
  assertCondition(
    normalizedDocs.includes(boundary),
    `documentation boundary missing: ${boundary}`,
  );
}

console.log(
  `marker=${AGENT_PAID_WORK_WC_AWARD_AUTHORIZATION_MARKER}`,
);
console.log(
  `example_independent_completion_verification_id=${
    materialized.independent_completion_verification_id
  }`,
);
console.log(
  `example_wc_award_authorization_id=${
    materialized.wc_award_authorization_id
  }`,
);
console.log(`example_wc_account_id=${materialized.beneficiary.wc_account_id}`);
console.log(`example_amount_wc=${materialized.award.amount_wc}`);
console.log(
  `canonical_bytes=${Buffer.byteLength(canonicalJson(draft), "utf8")}`,
);
console.log("tampered_wc_award_authorization_id_rejected=yes");
console.log("complete_paid_work_lineage_binding_verified=yes");
console.log("final_verified_completion_required=yes");
console.log("rejected_and_inconclusive_verifications_rejected=yes");
console.log("beneficiary_executor_provider_and_account_binding_verified=yes");
console.log("positive_bounded_wc_award_enforced=yes");
console.log("ledger_destination_and_uniqueness_binding_verified=yes");
console.log("authorization_window_enforced=yes");
console.log("authorizer_executor_provider_verifier_separation_required=yes");
console.log("award_and_authorizer_policy_binding_verified=yes");
console.log("one_time_atomic_replay_and_ledger_receipt_controls_required=yes");
console.log("ledger_write_and_wc_to_void_settlement_remain_separate=yes");
console.log("payment_wallet_runtime_buy_void_authorities_forbidden=yes");
console.log("schema_parse_and_documentation_boundaries_verified=yes");
console.log(
  "VOID_AGENT_PAID_WORK_WC_AWARD_AUTHORIZATION_ENVELOPE_V1_PROOF_GREEN",
);
