import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  AGENT_PAID_WORK_PAYMENT_EXECUTION_AUTHORIZATION_MARKER,
  canonicalJson,
  computeAgentPaidWorkPaymentExecutionAuthorizationId,
  materializeAgentPaidWorkPaymentExecutionAuthorization,
  validateAgentPaidWorkPaymentExecutionAuthorizationDraft,
  validateAgentPaidWorkPaymentExecutionAuthorizationEnvelope,
  type AgentPaidWorkPaymentExecutionAuthorizationDraft,
} from "./agent_paid_work_payment_execution_authorization_envelope_v1.js";
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
const authorizationValue = readJson(
  "examples/agent-paid-work-payment-execution-authorization-envelope-v1.example.json",
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
  authorizationValue,
);

const record = authorizationValue as unknown as Record<string, unknown>;
const {
  payment_execution_authorization_id: committedId,
  ...draftUnknown
} = record;
validateAgentPaidWorkPaymentExecutionAuthorizationDraft(
  work,
  quote,
  acceptance,
  intent,
  draftUnknown,
);
const draft =
  draftUnknown as AgentPaidWorkPaymentExecutionAuthorizationDraft;

const materialized =
  materializeAgentPaidWorkPaymentExecutionAuthorization(
    work,
    quote,
    acceptance,
    intent,
    draft,
  );
assertCondition(
  materialized.payment_execution_authorization_id === committedId,
  "committed authorization ID is not reproducible",
);
assertCondition(
  materialized.payment_execution_authorization_id ===
    computeAgentPaidWorkPaymentExecutionAuthorizationId(draft),
  "computed authorization ID mismatch",
);

const reordered = reverseObjectKeys(draft);
validateAgentPaidWorkPaymentExecutionAuthorizationDraft(
  work,
  quote,
  acceptance,
  intent,
  reordered,
);
assertCondition(
  materializeAgentPaidWorkPaymentExecutionAuthorization(
    work,
    quote,
    acceptance,
    intent,
    reordered,
  ).payment_execution_authorization_id ===
    materialized.payment_execution_authorization_id,
  "canonical ID changed when object key order changed",
);
assertCondition(
  canonicalJson(reordered) === canonicalJson(draft),
  "canonical JSON changed when object key order changed",
);

const changedExecutor = structuredClone(draft);
changedExecutor.executor.executor_id = "void.executor.payment.alternate";
assertCondition(
  materializeAgentPaidWorkPaymentExecutionAuthorization(
    work,
    quote,
    acceptance,
    intent,
    changedExecutor,
  ).payment_execution_authorization_id !==
    materialized.payment_execution_authorization_id,
  "authorization ID did not change when executor changed",
);

const badId = structuredClone(materialized);
badId.payment_execution_authorization_id =
  "voidawpea1_0000000000000000000000000000000000000000000000000000000000000000";
expectReject("tampered authorization ID", () =>
  validateAgentPaidWorkPaymentExecutionAuthorizationEnvelope(
    work,
    quote,
    acceptance,
    intent,
    badId,
  ),
);

for (const [label, mutate] of [
  ["work order binding", (x: AgentPaidWorkPaymentExecutionAuthorizationDraft) => {
    x.work_order_id = `voidawo1_${"0".repeat(64)}`;
  }],
  ["quote binding", (x: AgentPaidWorkPaymentExecutionAuthorizationDraft) => {
    x.quote_id = `voidawq1_${"0".repeat(64)}`;
  }],
  ["acceptance binding", (x: AgentPaidWorkPaymentExecutionAuthorizationDraft) => {
    x.acceptance_id = `voidawa1_${"0".repeat(64)}`;
  }],
  ["payment intent binding", (x: AgentPaidWorkPaymentExecutionAuthorizationDraft) => {
    x.payment_intent_id = `voidawpi1_${"0".repeat(64)}`;
  }],
  ["requester binding", (x: AgentPaidWorkPaymentExecutionAuthorizationDraft) => {
    x.requester.agent_id = "agent.example.other";
  }],
  ["provider binding", (x: AgentPaidWorkPaymentExecutionAuthorizationDraft) => {
    x.provider.provider_id = "void.provider.other";
  }],
  ["asset binding", (x: AgentPaidWorkPaymentExecutionAuthorizationDraft) => {
    x.commercial.quote_asset = "VOID";
  }],
  ["service total binding", (x: AgentPaidWorkPaymentExecutionAuthorizationDraft) => {
    x.commercial.service_total = "3.51";
  }],
  ["rail binding", (x: AgentPaidWorkPaymentExecutionAuthorizationDraft) => {
    x.commercial.payment_rail_id = "void.other.rail";
  }],
] as const) {
  const candidate = structuredClone(draft);
  mutate(candidate);
  expectReject(label, () =>
    validateAgentPaidWorkPaymentExecutionAuthorizationDraft(
      work,
      quote,
      acceptance,
      intent,
      candidate,
    ),
  );
}

const authorizerEqualsExecutor = structuredClone(draft);
authorizerEqualsExecutor.authorizer.authority_id =
  authorizerEqualsExecutor.executor.executor_id;
expectReject("authorizer equals executor", () =>
  validateAgentPaidWorkPaymentExecutionAuthorizationDraft(
    work,
    quote,
    acceptance,
    intent,
    authorizerEqualsExecutor,
  ),
);

const authorizerEqualsResolver = structuredClone(draft);
authorizerEqualsResolver.authorizer.authority_id =
  authorizerEqualsResolver.resolution.resolver_id;
expectReject("authorizer equals resolver", () =>
  validateAgentPaidWorkPaymentExecutionAuthorizationDraft(
    work,
    quote,
    acceptance,
    intent,
    authorizerEqualsResolver,
  ),
);

const executorEqualsResolver = structuredClone(draft);
executorEqualsResolver.executor.executor_id =
  executorEqualsResolver.resolution.resolver_id;
expectReject("executor equals resolver", () =>
  validateAgentPaidWorkPaymentExecutionAuthorizationDraft(
    work,
    quote,
    acceptance,
    intent,
    executorEqualsResolver,
  ),
);

const excessiveFee = structuredClone(draft);
excessiveFee.commercial.max_fee_total = "0.26";
excessiveFee.commercial.max_payment_total = "3.76";
expectReject("authorization fee over payment-intent fee ceiling", () =>
  validateAgentPaidWorkPaymentExecutionAuthorizationDraft(
    work,
    quote,
    acceptance,
    intent,
    excessiveFee,
  ),
);

const wrongMaximum = structuredClone(draft);
wrongMaximum.commercial.max_payment_total = "3.71";
expectReject("incorrect max payment total", () =>
  validateAgentPaidWorkPaymentExecutionAuthorizationDraft(
    work,
    quote,
    acceptance,
    intent,
    wrongMaximum,
  ),
);

const tooLong = structuredClone(draft);
tooLong.expires_at_utc = "2026-07-25T23:05:01Z";
expectReject("authorization lifetime over 900 seconds", () =>
  validateAgentPaidWorkPaymentExecutionAuthorizationDraft(
    work,
    quote,
    acceptance,
    intent,
    tooLong,
  ),
);

const beforeIntent = structuredClone(draft);
beforeIntent.created_at_utc = "2026-07-25T22:44:59Z";
expectReject("authorization before payment intent", () =>
  validateAgentPaidWorkPaymentExecutionAuthorizationDraft(
    work,
    quote,
    acceptance,
    intent,
    beforeIntent,
  ),
);

const resolutionAfterAuthorization = structuredClone(draft);
resolutionAfterAuthorization.resolution.resolved_at_utc =
  "2026-07-25T22:50:01Z";
expectReject("resolution after authorization creation", () =>
  validateAgentPaidWorkPaymentExecutionAuthorizationDraft(
    work,
    quote,
    acceptance,
    intent,
    resolutionAfterAuthorization,
  ),
);

const trueKeys = [
  "payment_execution_authorized",
  "exact_payment_intent_only",
  "one_time_use_required",
  "duplicate_payment_prevention_required",
  "replay_protection_required",
  "atomic_consumption_required",
  "single_active_execution_authorization_per_intent_required",
  "requester_authentication_required",
  "provider_authentication_required",
  "executor_authentication_required",
  "resolver_authentication_required",
  "authorizer_authentication_required",
  "authorization_signature_required",
  "authority_policy_binding_required",
  "authorizer_executor_separation_required",
  "authorizer_resolver_separation_required",
  "executor_resolver_separation_required",
  "destination_binding_verified",
  "allowlisted_payment_rail_required",
  "rail_asset_compatibility_verified",
  "resolution_records_current_required",
  "resolution_records_unrevoked_required",
  "resolution_records_not_superseded_required",
  "executor_resolution_revalidation_at_execution_required",
  "service_total_exact",
  "actual_fee_not_to_exceed_max_required",
  "actual_fee_evidence_required",
  "unused_fee_not_chargeable",
  "payment_amount_not_to_exceed_max_total",
  "payment_receipt_required",
  "payment_confirmation_required_before_work_execution",
  "failure_must_not_grant_partial_authority",
  "work_execution_authorization_separate",
  "authorization_is_not_payment_receipt",
  "authorization_is_not_work_execution_instruction",
  "authorization_is_not_funds_reservation",
  "authorization_is_not_transaction_signature",
] as const;

for (const key of trueKeys) {
  const candidate =
    structuredClone(draft) as unknown as Record<string, unknown>;
  (candidate.authorization as Record<string, unknown>)[key] = false;
  expectReject(`authorization ${key}`, () =>
    validateAgentPaidWorkPaymentExecutionAuthorizationDraft(
      work,
      quote,
      acceptance,
      intent,
      candidate,
    ),
  );
}

const workGranted =
  structuredClone(draft) as unknown as Record<string, unknown>;
(
  workGranted.authorization as Record<string, unknown>
).work_execution_authorization_granted = true;
expectReject("work execution authority granted", () =>
  validateAgentPaidWorkPaymentExecutionAuthorizationDraft(
    work,
    quote,
    acceptance,
    intent,
    workGranted,
  ),
);

for (const [label, section, key, value] of [
  ["raw destination injection", "resolution", "destination", "wallet:0xdead"],
  ["raw wallet injection", "resolution", "wallet_address", "0xdead"],
  ["transaction payload injection", "commercial", "transaction_payload", "0x01"],
  ["signer injection", "executor", "private_key", "secret"],
] as const) {
  const candidate =
    structuredClone(draft) as unknown as Record<string, unknown>;
  (candidate[section] as Record<string, unknown>)[key] = value;
  expectReject(label, () =>
    validateAgentPaidWorkPaymentExecutionAuthorizationDraft(
      work,
      quote,
      acceptance,
      intent,
      candidate,
    ),
  );
}

const schemaText = readText(
  "schemas/agent-paid-work-payment-execution-authorization-envelope-v1.schema.json",
);
const docs = readText(
  "docs/public/agent-paid-work-payment-execution-authorization-envelope-v1.md",
);
const workflowText = readText(
  ".github/workflows/agent-paid-work-payment-execution-authorization-envelope-v1.yml",
);
const moduleSource = readText(
  "scripts/agent_paid_work_payment_execution_authorization_envelope_v1.ts",
);
const schema = JSON.parse(schemaText) as Record<string, unknown>;

assertCondition(
  schema.$schema === "https://json-schema.org/draft/2020-12/schema",
  "schema draft mismatch",
);
assertCondition(
  schemaText.includes(
    AGENT_PAID_WORK_PAYMENT_EXECUTION_AUTHORIZATION_MARKER,
  ),
  "schema marker missing",
);
assertCondition(
  docs.includes(
    AGENT_PAID_WORK_PAYMENT_EXECUTION_AUTHORIZATION_MARKER,
  ),
  "docs marker missing",
);
assertCondition(
  workflowText.includes("--strict") &&
    workflowText.includes("--skipLibCheck"),
  "workflow typecheck flags missing",
);
assertCondition(
  moduleSource.includes(
    "./agent_paid_work_payment_intent_envelope_v1.js",
  ),
  "payment-intent validator binding missing",
);

const normalizedDocs = docs.replace(/\s+/g, " ");
for (const boundary of [
  "grants payment-execution authority within those exact limits",
  "does not execute payment",
  "opaque identifiers for separately authenticated records",
  "authenticate an explicit `authority_id`",
  "verify an `authority_policy_id`",
  "not a transaction signature",
  "separation of duties",
  "revalidated immediately before payment execution",
  "Short execution lifetime of at most 900 seconds",
  "At most one active execution authorization per payment intent",
  "Unused fee allowance must remain uncharged",
  "Payment confirmation required before any work-execution authorization",
  "does not add a public HTTP route",
  "or activate Buy VOID fulfillment",
]) {
  assertCondition(
    normalizedDocs.includes(boundary),
    `documentation boundary missing: ${boundary}`,
  );
}

console.log(
  `marker=${AGENT_PAID_WORK_PAYMENT_EXECUTION_AUTHORIZATION_MARKER}`,
);
console.log(`example_work_order_id=${materialized.work_order_id}`);
console.log(`example_quote_id=${materialized.quote_id}`);
console.log(`example_acceptance_id=${materialized.acceptance_id}`);
console.log(`example_payment_intent_id=${materialized.payment_intent_id}`);
console.log(
  `example_payment_execution_authorization_id=${materialized.payment_execution_authorization_id}`,
);
console.log(
  `canonical_bytes=${Buffer.byteLength(canonicalJson(draft), "utf8")}`,
);
console.log("tampered_authorization_id_rejected=yes");
console.log("full_paid_work_lineage_binding_verified=yes");
console.log("requester_provider_executor_binding_verified=yes");
console.log("authorizer_identity_and_policy_binding_required=yes");
console.log("authorizer_executor_resolver_separation_required=yes");
console.log("authorization_signature_required=yes");
console.log("resolution_records_current_unrevoked_unsuperseded_required=yes");
console.log("executor_resolution_revalidation_at_execution_required=yes");
console.log("opaque_resolution_records_required=yes");
console.log("fee_and_max_payment_caps_verified=yes");
console.log("short_execution_window_guard=yes");
console.log("one_time_replay_atomic_duplicate_controls_required=yes");
console.log("single_active_authorization_per_intent_required=yes");
console.log("actual_fee_evidence_and_unused_fee_protection_required=yes");
console.log("payment_receipt_required=yes");
console.log("payment_confirmation_before_work_execution_required=yes");
console.log("work_execution_authority_separate_and_ungranted=yes");
console.log("raw_destination_wallet_signer_transaction_payload_rejected=yes");
console.log("schema_parse_and_boundary_checks=yes");
console.log(
  "VOID_AGENT_PAID_WORK_PAYMENT_EXECUTION_AUTHORIZATION_ENVELOPE_V1_PROOF_GREEN",
);
