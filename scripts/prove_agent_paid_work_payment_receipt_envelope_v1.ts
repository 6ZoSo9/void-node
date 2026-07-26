import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  AGENT_PAID_WORK_PAYMENT_RECEIPT_MARKER,
  canonicalJson,
  computeAgentPaidWorkPaymentReceiptId,
  materializeAgentPaidWorkPaymentReceipt,
  validateAgentPaidWorkPaymentReceiptDraft,
  validateAgentPaidWorkPaymentReceiptEnvelope,
  type AgentPaidWorkPaymentReceiptDraft,
} from "./agent_paid_work_payment_receipt_envelope_v1.js";
import {
  validateAgentPaidWorkOrderEnvelope,
} from "./agent_paid_work_order_envelope_v1.js";
import {
  validateAgentPaidWorkQuoteEnvelope,
} from "./agent_paid_work_quote_envelope_v1.js";
import {
  validateAgentPaidWorkAcceptanceEnvelope,
} from "./agent_paid_work_acceptance_envelope_v1.js";
import {
  validateAgentPaidWorkPaymentIntentEnvelope,
} from "./agent_paid_work_payment_intent_envelope_v1.js";
import {
  validateAgentPaidWorkPaymentExecutionAuthorizationEnvelope,
} from "./agent_paid_work_payment_execution_authorization_envelope_v1.js";

function assertCondition(
  condition: unknown,
  message: string,
): asserts condition {
  if (!condition) throw new Error(message);
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
  if (Array.isArray(value)) return value.map(reverseObjectKeys);
  if (typeof value !== "object" || value === null) return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .reverse()
      .map(([key, child]) => [key, reverseObjectKeys(child)]),
  );
}

const work = readJson(
  "examples/agent-paid-work-order-envelope-v1.example.json",
);
const quote = readJson(
  "examples/agent-paid-work-quote-envelope-v1.example.json",
);
const acceptance = readJson(
  "examples/agent-paid-work-acceptance-envelope-v1.example.json",
);
const intent = readJson(
  "examples/agent-paid-work-payment-intent-envelope-v1.example.json",
);
const authorization = readJson(
  "examples/agent-paid-work-payment-execution-authorization-envelope-v1.example.json",
);
const receiptValue = readJson(
  "examples/agent-paid-work-payment-receipt-envelope-v1.example.json",
);

validateAgentPaidWorkOrderEnvelope(work);
validateAgentPaidWorkQuoteEnvelope(work, quote);
validateAgentPaidWorkAcceptanceEnvelope(work, quote, acceptance);
validateAgentPaidWorkPaymentIntentEnvelope(
  work,
  quote,
  acceptance,
  intent,
);
validateAgentPaidWorkPaymentExecutionAuthorizationEnvelope(
  work,
  quote,
  acceptance,
  intent,
  authorization,
);
validateAgentPaidWorkPaymentReceiptEnvelope(
  work,
  quote,
  acceptance,
  intent,
  authorization,
  receiptValue,
);

const record = receiptValue as unknown as Record<string, unknown>;
const { payment_receipt_id: committedId, ...draftUnknown } = record;
validateAgentPaidWorkPaymentReceiptDraft(
  work,
  quote,
  acceptance,
  intent,
  authorization,
  draftUnknown,
);
const draft = draftUnknown as AgentPaidWorkPaymentReceiptDraft;

const materialized = materializeAgentPaidWorkPaymentReceipt(
  work,
  quote,
  acceptance,
  intent,
  authorization,
  draft,
);
assertCondition(
  materialized.payment_receipt_id === committedId,
  "committed receipt ID is not reproducible",
);
assertCondition(
  materialized.payment_receipt_id ===
    computeAgentPaidWorkPaymentReceiptId(draft),
  "computed receipt ID mismatch",
);

const reordered = reverseObjectKeys(draft);
validateAgentPaidWorkPaymentReceiptDraft(
  work,
  quote,
  acceptance,
  intent,
  authorization,
  reordered,
);
assertCondition(
  materializeAgentPaidWorkPaymentReceipt(
    work,
    quote,
    acceptance,
    intent,
    authorization,
    reordered,
  ).payment_receipt_id === materialized.payment_receipt_id,
  "canonical receipt ID changed when object key order changed",
);
assertCondition(
  canonicalJson(reordered) === canonicalJson(draft),
  "canonical receipt JSON changed when object key order changed",
);

const changedEvidence = structuredClone(draft);
changedEvidence.evidence.payment_evidence_sha256 =
  `sha256:${"b2".repeat(32)}`;
assertCondition(
  materializeAgentPaidWorkPaymentReceipt(
    work,
    quote,
    acceptance,
    intent,
    authorization,
    changedEvidence,
  ).payment_receipt_id !== materialized.payment_receipt_id,
  "receipt ID did not change when evidence changed",
);

const badId = structuredClone(materialized);
badId.payment_receipt_id =
  `voidawper1_${"0".repeat(64)}`;
expectReject("tampered payment receipt ID", () =>
  validateAgentPaidWorkPaymentReceiptEnvelope(
    work,
    quote,
    acceptance,
    intent,
    authorization,
    badId,
  ),
);

for (const [label, mutate] of [
  ["work order binding", (x: AgentPaidWorkPaymentReceiptDraft) => {
    x.work_order_id = `voidawo1_${"0".repeat(64)}`;
  }],
  ["quote binding", (x: AgentPaidWorkPaymentReceiptDraft) => {
    x.quote_id = `voidawq1_${"0".repeat(64)}`;
  }],
  ["acceptance binding", (x: AgentPaidWorkPaymentReceiptDraft) => {
    x.acceptance_id = `voidawa1_${"0".repeat(64)}`;
  }],
  ["payment intent binding", (x: AgentPaidWorkPaymentReceiptDraft) => {
    x.payment_intent_id = `voidawpi1_${"0".repeat(64)}`;
  }],
  ["authorization binding", (x: AgentPaidWorkPaymentReceiptDraft) => {
    x.payment_execution_authorization_id =
      `voidawpea1_${"0".repeat(64)}`;
  }],
  ["requester binding", (x: AgentPaidWorkPaymentReceiptDraft) => {
    x.requester.agent_id = "agent.example.other";
  }],
  ["provider binding", (x: AgentPaidWorkPaymentReceiptDraft) => {
    x.provider.provider_id = "void.provider.other";
  }],
  ["executor binding", (x: AgentPaidWorkPaymentReceiptDraft) => {
    x.executor.executor_id = "void.executor.other";
  }],
  ["authorizer binding", (x: AgentPaidWorkPaymentReceiptDraft) => {
    x.authorizer.authority_id = "void.authority.other";
  }],
  ["policy binding", (x: AgentPaidWorkPaymentReceiptDraft) => {
    x.authorizer.authority_policy_id = "void.policy.other";
  }],
  ["resolver binding", (x: AgentPaidWorkPaymentReceiptDraft) => {
    x.resolution.resolver_id = "void.resolver.other";
  }],
  ["rail resolution binding", (x: AgentPaidWorkPaymentReceiptDraft) => {
    x.resolution.payment_rail_resolution_id = "void.prr.other";
  }],
  ["destination binding", (x: AgentPaidWorkPaymentReceiptDraft) => {
    x.resolution.provider_destination_binding_id = "void.pdb.other";
  }],
  ["asset binding", (x: AgentPaidWorkPaymentReceiptDraft) => {
    x.commercial.quote_asset = "VOID";
  }],
  ["service total binding", (x: AgentPaidWorkPaymentReceiptDraft) => {
    x.commercial.service_total = "3.51";
  }],
  ["rail binding", (x: AgentPaidWorkPaymentReceiptDraft) => {
    x.commercial.payment_rail_id = "void.other.rail";
  }],
] as const) {
  const candidate = structuredClone(draft);
  mutate(candidate);
  expectReject(label, () =>
    validateAgentPaidWorkPaymentReceiptDraft(
      work,
      quote,
      acceptance,
      intent,
      authorization,
      candidate,
    ),
  );
}

const excessiveFee = structuredClone(draft);
excessiveFee.commercial.actual_fee_total = "0.21";
excessiveFee.commercial.payment_total = "3.71";
expectReject("actual fee over authorization ceiling", () =>
  validateAgentPaidWorkPaymentReceiptDraft(
    work,
    quote,
    acceptance,
    intent,
    authorization,
    excessiveFee,
  ),
);

const wrongTotal = structuredClone(draft);
wrongTotal.commercial.payment_total = "3.69";
expectReject("incorrect payment total", () =>
  validateAgentPaidWorkPaymentReceiptDraft(
    work,
    quote,
    acceptance,
    intent,
    authorization,
    wrongTotal,
  ),
);

const beforeAuthorization = structuredClone(draft);
beforeAuthorization.executed_at_utc = "2026-07-25T22:49:59Z";
expectReject("execution before authorization", () =>
  validateAgentPaidWorkPaymentReceiptDraft(
    work,
    quote,
    acceptance,
    intent,
    authorization,
    beforeAuthorization,
  ),
);

const afterExpiry = structuredClone(draft);
afterExpiry.executed_at_utc = "2026-07-25T23:00:01Z";
afterExpiry.observed_at_utc = "2026-07-25T23:00:02Z";
expectReject("execution after authorization expiry", () =>
  validateAgentPaidWorkPaymentReceiptDraft(
    work,
    quote,
    acceptance,
    intent,
    authorization,
    afterExpiry,
  ),
);

const observedBefore = structuredClone(draft);
observedBefore.observed_at_utc = "2026-07-25T22:51:59Z";
expectReject("observation before execution", () =>
  validateAgentPaidWorkPaymentReceiptDraft(
    work,
    quote,
    acceptance,
    intent,
    authorization,
    observedBefore,
  ),
);

const delayedObservation = structuredClone(draft);
delayedObservation.observed_at_utc = "2026-07-25T22:57:01Z";
expectReject("observation delay over 300 seconds", () =>
  validateAgentPaidWorkPaymentReceiptDraft(
    work,
    quote,
    acceptance,
    intent,
    authorization,
    delayedObservation,
  ),
);

const trueKeys = [
  "payment_execution_succeeded",
  "exact_authorization_consumed",
  "one_time_use_verified",
  "duplicate_payment_prevention_verified",
  "replay_protection_verified",
  "atomic_consumption_verified",
  "executor_authentication_required",
  "executor_signature_required",
  "payment_rail_confirmation_required",
  "independent_confirmation_required",
  "receipt_is_not_independent_confirmation",
  "receipt_is_not_work_execution_instruction",
  "work_execution_authorization_separate",
  "actual_fee_evidence_required",
  "unused_fee_not_charged",
  "provider_destination_binding_revalidated",
  "rail_asset_compatibility_revalidated",
  "resolution_records_current_unrevoked_unsuperseded_verified",
  "payment_amount_within_authorization",
  "service_total_exact",
  "payment_total_exact",
  "receipt_is_not_transaction_signature",
  "receipt_is_not_funds_reservation",
  "single_success_receipt_per_authorization_required",
  "executor_attempt_id_unique_required",
  "authorization_consumption_id_unique_required",
  "rail_receipt_id_unique_required",
  "executor_signature_binds_receipt_and_evidence",
  "receipt_immutable_and_non_superseding",
  "failure_receipt_separate_required",
] as const;

for (const key of trueKeys) {
  const candidate =
    structuredClone(draft) as unknown as Record<string, unknown>;
  (candidate.attestation as Record<string, unknown>)[key] = false;
  expectReject(`attestation ${key}`, () =>
    validateAgentPaidWorkPaymentReceiptDraft(
      work,
      quote,
      acceptance,
      intent,
      authorization,
      candidate,
    ),
  );
}

const workGranted =
  structuredClone(draft) as unknown as Record<string, unknown>;
(
  workGranted.attestation as Record<string, unknown>
).work_execution_authorization_granted = true;
expectReject("work execution authority granted", () =>
  validateAgentPaidWorkPaymentReceiptDraft(
    work,
    quote,
    acceptance,
    intent,
    authorization,
    workGranted,
  ),
);

for (const [label, section, key, value] of [
  ["raw destination injection", "resolution", "destination", "wallet:0xdead"],
  ["wallet injection", "evidence", "wallet_address", "0xdead"],
  ["transaction payload injection", "evidence", "transaction_payload", "0x01"],
  ["private key injection", "executor", "private_key", "secret"],
] as const) {
  const candidate =
    structuredClone(draft) as unknown as Record<string, unknown>;
  (candidate[section] as Record<string, unknown>)[key] = value;
  expectReject(label, () =>
    validateAgentPaidWorkPaymentReceiptDraft(
      work,
      quote,
      acceptance,
      intent,
      authorization,
      candidate,
    ),
  );
}

const schemaText = readText(
  "schemas/agent-paid-work-payment-receipt-envelope-v1.schema.json",
);
const docs = readText(
  "docs/public/agent-paid-work-payment-receipt-envelope-v1.md",
);
const workflowText = readText(
  ".github/workflows/agent-paid-work-payment-receipt-envelope-v1.yml",
);
const moduleSource = readText(
  "scripts/agent_paid_work_payment_receipt_envelope_v1.ts",
);
const schema = JSON.parse(schemaText) as Record<string, unknown>;

assertCondition(
  schema.$schema === "https://json-schema.org/draft/2020-12/schema",
  "schema draft mismatch",
);
assertCondition(
  schemaText.includes(AGENT_PAID_WORK_PAYMENT_RECEIPT_MARKER),
  "schema marker missing",
);
assertCondition(
  docs.includes(AGENT_PAID_WORK_PAYMENT_RECEIPT_MARKER),
  "documentation marker missing",
);
assertCondition(
  workflowText.includes("--strict") &&
    workflowText.includes("--skipLibCheck"),
  "workflow typecheck flags missing",
);
assertCondition(
  moduleSource.includes(
    "./agent_paid_work_payment_execution_authorization_envelope_v1.js",
  ),
  "authorization validator binding missing",
);

const normalizedDocs = docs.replace(/\s+/g, " ");
for (const boundary of [
  "records a successful executor outcome only",
  "does not execute payment",
  "independently confirm settlement",
  "A separate independent payment-confirmation lane verifies settlement",
  "no more than 300 seconds later",
  "Actual fee at or below the authorized fee ceiling",
  "At most one successful receipt per payment-execution authorization",
  "must be unique in the downstream receipt registry",
  "signature that binds the canonical receipt ID and payment evidence digest",
  "immutable and cannot supersede one another",
  "failed attempts require a separate failure-receipt contract",
  "Independent payment confirmation remains required",
  "Work-execution authority remains separate and ungranted",
  "does not add a public HTTP route",
  "or activate Buy VOID fulfillment",
]) {
  assertCondition(
    normalizedDocs.includes(boundary),
    `documentation boundary missing: ${boundary}`,
  );
}

console.log(`marker=${AGENT_PAID_WORK_PAYMENT_RECEIPT_MARKER}`);
console.log(`example_work_order_id=${materialized.work_order_id}`);
console.log(`example_quote_id=${materialized.quote_id}`);
console.log(`example_acceptance_id=${materialized.acceptance_id}`);
console.log(`example_payment_intent_id=${materialized.payment_intent_id}`);
console.log(
  `example_payment_execution_authorization_id=${materialized.payment_execution_authorization_id}`,
);
console.log(`example_payment_receipt_id=${materialized.payment_receipt_id}`);
console.log(
  `canonical_bytes=${Buffer.byteLength(canonicalJson(draft), "utf8")}`,
);
console.log("tampered_payment_receipt_id_rejected=yes");
console.log("full_paid_work_lineage_binding_verified=yes");
console.log("identity_policy_resolution_binding_verified=yes");
console.log("execution_window_and_observation_delay_guard=yes");
console.log("actual_fee_and_payment_total_caps_verified=yes");
console.log("authorization_atomic_consumption_verified=yes");
console.log("replay_and_duplicate_payment_prevention_verified=yes");
console.log("opaque_rail_receipt_and_evidence_digest_required=yes");
console.log("executor_authentication_and_signature_required=yes");
console.log("single_success_receipt_per_authorization_required=yes");
console.log("receipt_registry_uniqueness_required=yes");
console.log("executor_signature_binds_receipt_and_evidence=yes");
console.log("receipt_immutable_non_superseding=yes");
console.log("failure_receipt_separate_required=yes");
console.log("independent_payment_confirmation_still_required=yes");
console.log("work_execution_authority_separate_and_ungranted=yes");
console.log("raw_destination_wallet_signer_transaction_payload_rejected=yes");
console.log("schema_parse_and_boundary_checks=yes");
console.log(
  "VOID_AGENT_PAID_WORK_PAYMENT_RECEIPT_ENVELOPE_V1_PROOF_GREEN",
);
