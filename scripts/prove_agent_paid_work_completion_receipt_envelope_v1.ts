import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  AGENT_PAID_WORK_COMPLETION_RECEIPT_MARKER,
  canonicalJson,
  computeAgentPaidWorkCompletionReceiptId,
  materializeAgentPaidWorkCompletionReceipt,
  validateAgentPaidWorkCompletionReceiptDraft,
  validateAgentPaidWorkCompletionReceiptEnvelope,
  type AgentPaidWorkCompletionReceiptDraft,
} from "./agent_paid_work_completion_receipt_envelope_v1.js";

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
const completionReceiptValue = readJson(
  "examples/agent-paid-work-completion-receipt-envelope-v1.example.json",
);

validateAgentPaidWorkCompletionReceiptEnvelope(
  workOrder,
  quote,
  acceptance,
  paymentIntent,
  paymentExecutionAuthorization,
  paymentReceipt,
  paymentConfirmation,
  workExecutionAuthorization,
  completionReceiptValue,
);

const receiptRecord =
  completionReceiptValue as unknown as Record<string, unknown>;
const {
  work_completion_receipt_id: committedReceiptId,
  ...draftValue
} = receiptRecord;

validateAgentPaidWorkCompletionReceiptDraft(
  workOrder,
  quote,
  acceptance,
  paymentIntent,
  paymentExecutionAuthorization,
  paymentReceipt,
  paymentConfirmation,
  workExecutionAuthorization,
  draftValue,
);

const draft =
  draftValue as unknown as AgentPaidWorkCompletionReceiptDraft;

const materialized = materializeAgentPaidWorkCompletionReceipt(
  workOrder,
  quote,
  acceptance,
  paymentIntent,
  paymentExecutionAuthorization,
  paymentReceipt,
  paymentConfirmation,
  workExecutionAuthorization,
  draft,
);

assertCondition(
  materialized.work_completion_receipt_id === committedReceiptId,
  "committed completion receipt ID is not reproducible",
);
assertCondition(
  materialized.work_completion_receipt_id ===
    computeAgentPaidWorkCompletionReceiptId(draft),
  "computed completion receipt ID mismatch",
);

const reordered = reverseObjectKeys(draft);
validateAgentPaidWorkCompletionReceiptDraft(
  workOrder,
  quote,
  acceptance,
  paymentIntent,
  paymentExecutionAuthorization,
  paymentReceipt,
  paymentConfirmation,
  workExecutionAuthorization,
  reordered,
);
assertCondition(
  materializeAgentPaidWorkCompletionReceipt(
    workOrder,
    quote,
    acceptance,
    paymentIntent,
    paymentExecutionAuthorization,
    paymentReceipt,
    paymentConfirmation,
    workExecutionAuthorization,
    reordered,
  ).work_completion_receipt_id ===
    materialized.work_completion_receipt_id,
  "canonical receipt ID changed when object key order changed",
);
assertCondition(
  canonicalJson(reordered) === canonicalJson(draft),
  "canonical receipt JSON changed when object key order changed",
);

const badId = structuredClone(materialized);
badId.work_completion_receipt_id =
  `voidawcr1_${"0".repeat(64)}`;
expectReject("tampered work completion receipt ID", () =>
  validateAgentPaidWorkCompletionReceiptEnvelope(
    workOrder,
    quote,
    acceptance,
    paymentIntent,
    paymentExecutionAuthorization,
    paymentReceipt,
    paymentConfirmation,
    workExecutionAuthorization,
    badId,
  ),
);

for (const [label, mutate] of [
  [
    "work-order binding",
    (candidate: AgentPaidWorkCompletionReceiptDraft) => {
      candidate.work_order_id = `voidawo1_${"0".repeat(64)}`;
    },
  ],
  [
    "quote binding",
    (candidate: AgentPaidWorkCompletionReceiptDraft) => {
      candidate.quote_id = `voidawq1_${"0".repeat(64)}`;
    },
  ],
  [
    "acceptance binding",
    (candidate: AgentPaidWorkCompletionReceiptDraft) => {
      candidate.acceptance_id = `voidawa1_${"0".repeat(64)}`;
    },
  ],
  [
    "payment-intent binding",
    (candidate: AgentPaidWorkCompletionReceiptDraft) => {
      candidate.payment_intent_id = `voidawpi1_${"0".repeat(64)}`;
    },
  ],
  [
    "payment-execution-authorization binding",
    (candidate: AgentPaidWorkCompletionReceiptDraft) => {
      candidate.payment_execution_authorization_id =
        `voidawpea1_${"0".repeat(64)}`;
    },
  ],
  [
    "payment-receipt binding",
    (candidate: AgentPaidWorkCompletionReceiptDraft) => {
      candidate.payment_receipt_id = `voidawper1_${"0".repeat(64)}`;
    },
  ],
  [
    "payment-confirmation binding",
    (candidate: AgentPaidWorkCompletionReceiptDraft) => {
      candidate.payment_confirmation_id =
        `voidawpc1_${"0".repeat(64)}`;
    },
  ],
  [
    "work-execution-authorization binding",
    (candidate: AgentPaidWorkCompletionReceiptDraft) => {
      candidate.work_execution_authorization_id =
        `voidawwea1_${"0".repeat(64)}`;
    },
  ],
  [
    "executor binding",
    (candidate: AgentPaidWorkCompletionReceiptDraft) => {
      candidate.executor.executor_id = "void.executor.other";
    },
  ],
  [
    "provider binding",
    (candidate: AgentPaidWorkCompletionReceiptDraft) => {
      candidate.executor.provider_id = "void.provider.other";
    },
  ],
] as const) {
  const candidate = structuredClone(draft);
  mutate(candidate);
  expectReject(label, () =>
    validateAgentPaidWorkCompletionReceiptDraft(
      workOrder,
      quote,
      acceptance,
      paymentIntent,
      paymentExecutionAuthorization,
      paymentReceipt,
      paymentConfirmation,
      workExecutionAuthorization,
      candidate,
    ),
  );
}

for (const key of [
  "task_type",
  "task_spec_sha256",
  "input_manifest_sha256",
  "expected_output_schema_sha256",
  "result_delivery_channel_id",
] as const) {
  const candidate = structuredClone(draft);
  if (key === "task_type") {
    candidate.work_contract.task_type = "other_task";
  } else if (key === "result_delivery_channel_id") {
    candidate.work_contract.result_delivery_channel_id =
      "void.delivery.other";
  } else {
    candidate.work_contract[key] = `sha256:${"0".repeat(64)}`;
  }
  expectReject(`work-contract binding ${key}`, () =>
    validateAgentPaidWorkCompletionReceiptDraft(
      workOrder,
      quote,
      acceptance,
      paymentIntent,
      paymentExecutionAuthorization,
      paymentReceipt,
      paymentConfirmation,
      workExecutionAuthorization,
      candidate,
    ),
  );
}

const signerMismatch = structuredClone(draft);
signerMismatch.executor_authentication.signer_id =
  "void.executor.other";
expectReject("executor signer mismatch", () =>
  validateAgentPaidWorkCompletionReceiptDraft(
    workOrder,
    quote,
    acceptance,
    paymentIntent,
    paymentExecutionAuthorization,
    paymentReceipt,
    paymentConfirmation,
    workExecutionAuthorization,
    signerMismatch,
  ),
);

for (const [label, mutate] of [
  [
    "authorization consumed before authorization creation",
    (candidate: AgentPaidWorkCompletionReceiptDraft) => {
      candidate.execution.authorization_consumed_at_utc =
        "2026-07-25T22:53:59Z";
    },
  ],
  [
    "authorization consumed after expiration",
    (candidate: AgentPaidWorkCompletionReceiptDraft) => {
      candidate.execution.authorization_consumed_at_utc =
        "2026-07-25T23:09:01Z";
      candidate.execution.started_at_utc = "2026-07-25T23:09:01Z";
      candidate.execution.finished_at_utc = "2026-07-25T23:11:01Z";
      candidate.receipt_created_at_utc = "2026-07-25T23:11:10Z";
    },
  ],
  [
    "execution start before authorization consumption",
    (candidate: AgentPaidWorkCompletionReceiptDraft) => {
      candidate.execution.started_at_utc = "2026-07-25T22:54:59Z";
      candidate.resource_usage.wall_clock_seconds = 121;
    },
  ],
  [
    "execution start after authorization expiration",
    (candidate: AgentPaidWorkCompletionReceiptDraft) => {
      candidate.execution.authorization_consumed_at_utc =
        "2026-07-25T23:09:00Z";
      candidate.execution.started_at_utc = "2026-07-25T23:09:01Z";
      candidate.execution.finished_at_utc = "2026-07-25T23:11:01Z";
      candidate.receipt_created_at_utc = "2026-07-25T23:11:10Z";
    },
  ],
  [
    "execution finish before start",
    (candidate: AgentPaidWorkCompletionReceiptDraft) => {
      candidate.execution.finished_at_utc = "2026-07-25T22:54:59Z";
    },
  ],
  [
    "receipt created before finish",
    (candidate: AgentPaidWorkCompletionReceiptDraft) => {
      candidate.receipt_created_at_utc = "2026-07-25T22:56:59Z";
    },
  ],
  [
    "measured wall clock mismatch",
    (candidate: AgentPaidWorkCompletionReceiptDraft) => {
      candidate.resource_usage.wall_clock_seconds = 119;
    },
  ],
] as const) {
  const candidate = structuredClone(draft);
  mutate(candidate);
  expectReject(label, () =>
    validateAgentPaidWorkCompletionReceiptDraft(
      workOrder,
      quote,
      acceptance,
      paymentIntent,
      paymentExecutionAuthorization,
      paymentReceipt,
      paymentConfirmation,
      workExecutionAuthorization,
      candidate,
    ),
  );
}

const retryCountMismatch = structuredClone(draft);
retryCountMismatch.resource_usage.retry_count = 1;
expectReject("retry count and attempt mismatch", () =>
  validateAgentPaidWorkCompletionReceiptDraft(
    workOrder,
    quote,
    acceptance,
    paymentIntent,
    paymentExecutionAuthorization,
    paymentReceipt,
    paymentConfirmation,
    workExecutionAuthorization,
    retryCountMismatch,
  ),
);

const excessiveAttempt = structuredClone(draft);
excessiveAttempt.execution.attempt_number = 3;
excessiveAttempt.resource_usage.retry_count = 2;
expectReject("attempt exceeds authorization retry count", () =>
  validateAgentPaidWorkCompletionReceiptDraft(
    workOrder,
    quote,
    acceptance,
    paymentIntent,
    paymentExecutionAuthorization,
    paymentReceipt,
    paymentConfirmation,
    workExecutionAuthorization,
    excessiveAttempt,
  ),
);

for (const [label, mutate] of [
  [
    "wall-clock limit",
    (candidate: AgentPaidWorkCompletionReceiptDraft) => {
      candidate.execution.finished_at_utc = "2026-07-25T23:00:01Z";
      candidate.receipt_created_at_utc = "2026-07-25T23:00:10Z";
      candidate.resource_usage.wall_clock_seconds = 301;
    },
  ],
  [
    "CPU limit",
    (candidate: AgentPaidWorkCompletionReceiptDraft) => {
      candidate.resource_usage.cpu_seconds = 181;
    },
  ],
  [
    "memory limit",
    (candidate: AgentPaidWorkCompletionReceiptDraft) => {
      candidate.resource_usage.peak_memory_bytes = 536870913;
    },
  ],
  [
    "output limit",
    (candidate: AgentPaidWorkCompletionReceiptDraft) => {
      candidate.resource_usage.output_bytes = 10485761;
    },
  ],
  [
    "network-request limit",
    (candidate: AgentPaidWorkCompletionReceiptDraft) => {
      candidate.resource_usage.network_requests = 21;
    },
  ],
] as const) {
  const candidate = structuredClone(draft);
  mutate(candidate);
  expectReject(`successful execution exceeds ${label}`, () =>
    validateAgentPaidWorkCompletionReceiptDraft(
      workOrder,
      quote,
      acceptance,
      paymentIntent,
      paymentExecutionAuthorization,
      paymentReceipt,
      paymentConfirmation,
      workExecutionAuthorization,
      candidate,
    ),
  );
}

const falseCleanLimitObservation = structuredClone(draft);
falseCleanLimitObservation.policy_observation.resource_limits_observed = false;
expectReject("false resource-limit observation", () =>
  validateAgentPaidWorkCompletionReceiptDraft(
    workOrder,
    quote,
    acceptance,
    paymentIntent,
    paymentExecutionAuthorization,
    paymentReceipt,
    paymentConfirmation,
    workExecutionAuthorization,
    falseCleanLimitObservation,
  ),
);

const truthfulFailedAttempt = structuredClone(draft);
truthfulFailedAttempt.execution.status = "failed";
truthfulFailedAttempt.execution.exit_code = 1;
truthfulFailedAttempt.execution.failure_reason_code =
  "resource.cpu.limit.exceeded";
truthfulFailedAttempt.resource_usage.cpu_seconds = 181;
truthfulFailedAttempt.policy_observation.resource_limits_observed = false;

validateAgentPaidWorkCompletionReceiptDraft(
  workOrder,
  quote,
  acceptance,
  paymentIntent,
  paymentExecutionAuthorization,
  paymentReceipt,
  paymentConfirmation,
  workExecutionAuthorization,
  truthfulFailedAttempt,
);

assertCondition(
  materializeAgentPaidWorkCompletionReceipt(
    workOrder,
    quote,
    acceptance,
    paymentIntent,
    paymentExecutionAuthorization,
    paymentReceipt,
    paymentConfirmation,
    workExecutionAuthorization,
    truthfulFailedAttempt,
  ).work_completion_receipt_id !==
    materialized.work_completion_receipt_id,
  "truthful failed-attempt evidence did not alter receipt identity",
);

const failedWithoutReason = structuredClone(truthfulFailedAttempt);
failedWithoutReason.execution.failure_reason_code = null;
expectReject("failed attempt without failure reason", () =>
  validateAgentPaidWorkCompletionReceiptDraft(
    workOrder,
    quote,
    acceptance,
    paymentIntent,
    paymentExecutionAuthorization,
    paymentReceipt,
    paymentConfirmation,
    workExecutionAuthorization,
    failedWithoutReason,
  ),
);

const failedWithExitZero = structuredClone(truthfulFailedAttempt);
failedWithExitZero.execution.exit_code = 0;
expectReject("failed attempt with exit code zero", () =>
  validateAgentPaidWorkCompletionReceiptDraft(
    workOrder,
    quote,
    acceptance,
    paymentIntent,
    paymentExecutionAuthorization,
    paymentReceipt,
    paymentConfirmation,
    workExecutionAuthorization,
    failedWithExitZero,
  ),
);

const successWithFailureReason = structuredClone(draft);
successWithFailureReason.execution.failure_reason_code =
  "unexpected.failure";
expectReject("successful attempt with failure reason", () =>
  validateAgentPaidWorkCompletionReceiptDraft(
    workOrder,
    quote,
    acceptance,
    paymentIntent,
    paymentExecutionAuthorization,
    paymentReceipt,
    paymentConfirmation,
    workExecutionAuthorization,
    successWithFailureReason,
  ),
);

const successWithNonzeroExit = structuredClone(draft);
successWithNonzeroExit.execution.exit_code = 1;
expectReject("successful attempt with nonzero exit", () =>
  validateAgentPaidWorkCompletionReceiptDraft(
    workOrder,
    quote,
    acceptance,
    paymentIntent,
    paymentExecutionAuthorization,
    paymentReceipt,
    paymentConfirmation,
    workExecutionAuthorization,
    successWithNonzeroExit,
  ),
);

for (const key of [
  "sandbox_enforced",
  "input_integrity_verified",
  "capability_allowlist_observed",
  "network_allowlist_observed",
  "resource_limits_observed",
] as const) {
  const candidate = structuredClone(draft);
  candidate.policy_observation[key] = false;
  expectReject(`successful receipt safeguard ${key}`, () =>
    validateAgentPaidWorkCompletionReceiptDraft(
      workOrder,
      quote,
      acceptance,
      paymentIntent,
      paymentExecutionAuthorization,
      paymentReceipt,
      paymentConfirmation,
      workExecutionAuthorization,
      candidate,
    ),
  );
}

for (const key of [
  "secrets_accessed",
  "wallet_accessed",
  "payment_state_mutated",
  "work_credits_mutated",
  "buy_void_fulfillment_mutated",
  "runtime_administered",
  "host_filesystem_written",
  "unapproved_external_side_effects_observed",
] as const) {
  const candidate = structuredClone(draft);
  candidate.policy_observation[key] = true;
  expectReject(`successful receipt forbidden effect ${key}`, () =>
    validateAgentPaidWorkCompletionReceiptDraft(
      workOrder,
      quote,
      acceptance,
      paymentIntent,
      paymentExecutionAuthorization,
      paymentReceipt,
      paymentConfirmation,
      workExecutionAuthorization,
      candidate,
    ),
  );
}

for (const key of Object.keys(draft.attestation)) {
  const candidate =
    structuredClone(draft) as unknown as Record<string, unknown>;
  const attestation =
    candidate.attestation as Record<string, unknown>;
  attestation[key] = !attestation[key];
  expectReject(`attestation ${key}`, () =>
    validateAgentPaidWorkCompletionReceiptDraft(
      workOrder,
      quote,
      acceptance,
      paymentIntent,
      paymentExecutionAuthorization,
      paymentReceipt,
      paymentConfirmation,
      workExecutionAuthorization,
      candidate,
    ),
  );
}

for (const key of Object.keys(draft.result_commitments)) {
  const candidate = structuredClone(draft);
  (
    candidate.result_commitments as unknown as Record<string, unknown>
  )[key] = `sha256:${"0".repeat(64)}`;

  assertCondition(
    materializeAgentPaidWorkCompletionReceipt(
      workOrder,
      quote,
      acceptance,
      paymentIntent,
      paymentExecutionAuthorization,
      paymentReceipt,
      paymentConfirmation,
      workExecutionAuthorization,
      candidate,
    ).work_completion_receipt_id !==
      materialized.work_completion_receipt_id,
    `result commitment ${key} did not alter receipt identity`,
  );
}

for (const [section, key, value] of [
  ["executor", "private_key", "secret"],
  ["execution", "shell_command", "rm -rf /"],
  ["executor_authentication", "signature", "raw-signature"],
  ["resource_usage", "unbounded", true],
] as const) {
  const candidate =
    structuredClone(draft) as unknown as Record<string, unknown>;
  (candidate[section] as Record<string, unknown>)[key] = value;
  expectReject(`${section}.${key} injection`, () =>
    validateAgentPaidWorkCompletionReceiptDraft(
      workOrder,
      quote,
      acceptance,
      paymentIntent,
      paymentExecutionAuthorization,
      paymentReceipt,
      paymentConfirmation,
      workExecutionAuthorization,
      candidate,
    ),
  );
}

const schemaText = readText(
  "schemas/agent-paid-work-completion-receipt-envelope-v1.schema.json",
);
const docs = readText(
  "docs/public/agent-paid-work-completion-receipt-envelope-v1.md",
);
const moduleSource = readText(
  "scripts/agent_paid_work_completion_receipt_envelope_v1.ts",
);
const schema = JSON.parse(schemaText) as Record<string, unknown>;

assertCondition(
  schema.$schema === "https://json-schema.org/draft/2020-12/schema",
  "schema draft mismatch",
);
assertCondition(
  schemaText.includes(AGENT_PAID_WORK_COMPLETION_RECEIPT_MARKER),
  "schema marker missing",
);
assertCondition(
  schemaText.includes('"status": {'),
  "schema execution status constraint missing",
);
assertCondition(
  schemaText.includes('"allOf": ['),
  "schema success/failure conditional missing",
);
assertCondition(
  docs.includes(AGENT_PAID_WORK_COMPLETION_RECEIPT_MARKER),
  "documentation marker missing",
);
assertCondition(
  moduleSource.includes(
    "./agent_paid_work_execution_authorization_envelope_v1.js",
  ),
  "work-execution-authorization validator binding missing",
);

const normalizedDocs = docs.replace(/\s+/g, " ");
for (const boundary of [
  "The receipt records what the executor reports happened.",
  "V1 covers step 9 only.",
  "Failed attempts must not be rewritten as clean successes.",
  "`correctness_verified=false`",
  "`work_credit_award_authorized=false`",
  "`payment_instruction_authorized=false`",
  "`payment_state_mutation_authorized=false`",
  "`wallet_or_signer_access_authorized=false`",
  "`runtime_administration_authorized=false`",
  "`buy_void_fulfillment_authorized=false`",
  "does not independently prove correctness",
  "does not add a public HTTP route",
  "or activate Buy VOID",
]) {
  assertCondition(
    normalizedDocs.includes(boundary),
    `documentation boundary missing: ${boundary}`,
  );
}

console.log(
  `marker=${AGENT_PAID_WORK_COMPLETION_RECEIPT_MARKER}`,
);
console.log(
  `example_work_execution_authorization_id=${materialized.work_execution_authorization_id}`,
);
console.log(
  `example_work_completion_receipt_id=${materialized.work_completion_receipt_id}`,
);
console.log(`example_execution_id=${materialized.execution.execution_id}`);
console.log(`example_execution_status=${materialized.execution.status}`);
console.log(
  `canonical_bytes=${Buffer.byteLength(canonicalJson(draft), "utf8")}`,
);
console.log("tampered_completion_receipt_id_rejected=yes");
console.log("complete_paid_work_lineage_binding_verified=yes");
console.log("exact_work_execution_authorization_binding_verified=yes");
console.log("atomic_authorization_consumption_recorded=yes");
console.log("authorization_window_and_timestamp_ordering_enforced=yes");
console.log("executor_provider_and_signer_binding_verified=yes");
console.log("task_input_output_contract_binding_verified=yes");
console.log("result_and_evidence_commitments_bound=yes");
console.log("measured_resource_usage_and_limits_verified=yes");
console.log("successful_receipt_requires_clean_policy_observation=yes");
console.log("truthful_failed_attempt_with_violation_evidence_accepted=yes");
console.log("completion_receipt_is_not_correctness_verification=yes");
console.log("payment_wc_wallet_runtime_authorities_forbidden=yes");
console.log("schema_parse_and_documentation_boundaries_verified=yes");
console.log(
  "VOID_AGENT_PAID_WORK_COMPLETION_RECEIPT_ENVELOPE_V1_PROOF_GREEN",
);
