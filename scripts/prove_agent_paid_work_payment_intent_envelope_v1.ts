import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  AGENT_PAID_WORK_PAYMENT_INTENT_MARKER,
  addDecimals,
  canonicalJson,
  compareDecimals,
  computeAgentPaidWorkPaymentIntentId,
  materializeAgentPaidWorkPaymentIntent,
  validateAgentPaidWorkPaymentIntentDraft,
  validateAgentPaidWorkPaymentIntentEnvelope,
  type AgentPaidWorkPaymentIntentDraft,
} from "./agent_paid_work_payment_intent_envelope_v1.js";
import { validateAgentPaidWorkOrderEnvelope } from "./agent_paid_work_order_envelope_v1.js";
import { validateAgentPaidWorkQuoteEnvelope } from "./agent_paid_work_quote_envelope_v1.js";
import { validateAgentPaidWorkAcceptanceEnvelope } from "./agent_paid_work_acceptance_envelope_v1.js";

function assertCondition(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function expectReject(label: string, action: () => void): void {
  let rejected = false;
  try { action(); } catch { rejected = true; }
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

const work = readJson("examples/agent-paid-work-order-envelope-v1.example.json");
const quote = readJson("examples/agent-paid-work-quote-envelope-v1.example.json");
const acceptance = readJson("examples/agent-paid-work-acceptance-envelope-v1.example.json");
const intentValue = readJson("examples/agent-paid-work-payment-intent-envelope-v1.example.json");
validateAgentPaidWorkOrderEnvelope(work);
validateAgentPaidWorkQuoteEnvelope(work, quote);
validateAgentPaidWorkAcceptanceEnvelope(work, quote, acceptance);
validateAgentPaidWorkPaymentIntentEnvelope(work, quote, acceptance, intentValue);

const record = intentValue as unknown as Record<string, unknown>;
const { payment_intent_id: committedId, ...draftUnknown } = record;
validateAgentPaidWorkPaymentIntentDraft(work, quote, acceptance, draftUnknown);
const draft = draftUnknown as AgentPaidWorkPaymentIntentDraft;
const materialized = materializeAgentPaidWorkPaymentIntent(work, quote, acceptance, draft);
assertCondition(materialized.payment_intent_id === committedId, "committed ID is not reproducible");
assertCondition(
  materialized.payment_intent_id === computeAgentPaidWorkPaymentIntentId(draft),
  "computed ID mismatch",
);

const reordered = reverseObjectKeys(draft);
validateAgentPaidWorkPaymentIntentDraft(work, quote, acceptance, reordered);
assertCondition(
  materializeAgentPaidWorkPaymentIntent(work, quote, acceptance, reordered)
    .payment_intent_id === materialized.payment_intent_id,
  "canonical ID changed with object key order",
);
assertCondition(canonicalJson(reordered) === canonicalJson(draft), "canonical JSON changed");

assertCondition(addDecimals("3.50", "0.25") === "3.75", "decimal addition failed");
assertCondition(compareDecimals("3.75", "5.00") < 0, "decimal comparison failed");
assertCondition(compareDecimals("5.0", "5.00") === 0, "decimal equality failed");

const changedFee = structuredClone(draft);
changedFee.commercial.max_fee_total = "0.26";
assertCondition(
  materializeAgentPaidWorkPaymentIntent(work, quote, acceptance, changedFee)
    .payment_intent_id !== materialized.payment_intent_id,
  "ID did not change when fee changed",
);

const badId = structuredClone(materialized);
badId.payment_intent_id =
  "voidawpi1_0000000000000000000000000000000000000000000000000000000000000000";
expectReject("tampered payment_intent_id", () =>
  validateAgentPaidWorkPaymentIntentEnvelope(work, quote, acceptance, badId),
);

for (const [label, mutate] of [
  ["work order binding", (x: AgentPaidWorkPaymentIntentDraft) => {
    x.work_order_id = "voidawo1_" + "0".repeat(64);
  }],
  ["quote binding", (x: AgentPaidWorkPaymentIntentDraft) => {
    x.quote_id = "voidawq1_" + "0".repeat(64);
  }],
  ["acceptance binding", (x: AgentPaidWorkPaymentIntentDraft) => {
    x.acceptance_id = "voidawa1_" + "0".repeat(64);
  }],
  ["requester binding", (x: AgentPaidWorkPaymentIntentDraft) => {
    x.requester.agent_id = "agent.example.other";
  }],
  ["provider binding", (x: AgentPaidWorkPaymentIntentDraft) => {
    x.provider.provider_id = "void.provider.other";
  }],
  ["asset binding", (x: AgentPaidWorkPaymentIntentDraft) => {
    x.commercial.quote_asset = "VOID";
  }],
  ["total binding", (x: AgentPaidWorkPaymentIntentDraft) => {
    x.commercial.total = "3.51";
  }],
  ["rail binding", (x: AgentPaidWorkPaymentIntentDraft) => {
    x.commercial.payment_rail_id = "void.other.rail";
  }],
] as const) {
  const candidate = structuredClone(draft);
  mutate(candidate);
  expectReject(label, () =>
    validateAgentPaidWorkPaymentIntentDraft(work, quote, acceptance, candidate),
  );
}

const overBudget = structuredClone(draft);
overBudget.commercial.max_fee_total = "1.51";
expectReject("total plus fee over max_total", () =>
  validateAgentPaidWorkPaymentIntentDraft(work, quote, acceptance, overBudget),
);

const beforeAcceptance = structuredClone(draft);
beforeAcceptance.created_at_utc = "2026-07-25T22:39:59Z";
expectReject("intent before acceptance", () =>
  validateAgentPaidWorkPaymentIntentDraft(work, quote, acceptance, beforeAcceptance),
);
const lateExpiry = structuredClone(draft);
lateExpiry.expires_at_utc = "2026-07-26T20:00:01Z";
expectReject("intent after acceptance expiry", () =>
  validateAgentPaidWorkPaymentIntentDraft(work, quote, acceptance, lateExpiry),
);

const trueKeys = [
  "payment_authorization_requested",
  "exact_quote_total_only",
  "max_fee_enforced",
  "one_time_use_required",
  "replay_protection_required",
  "single_active_payment_intent_per_acceptance_required",
  "requester_authentication_required",
  "provider_authentication_required",
  "destination_resolution_required",
  "allowlisted_payment_rail_required",
  "separate_payment_execution_required",
  "separate_work_execution_authorization_required",
  "intent_is_not_payment_receipt",
  "intent_is_not_funds_transfer",
  "intent_is_not_funds_reservation",
] as const;
for (const key of trueKeys) {
  const candidate = structuredClone(draft) as unknown as Record<string, unknown>;
  (candidate.authorization as Record<string, unknown>)[key] = false;
  expectReject(`authorization ${key}`, () =>
    validateAgentPaidWorkPaymentIntentDraft(work, quote, acceptance, candidate),
  );
}

for (const key of [
  "payment_execution_granted",
  "work_execution_authorization_granted",
] as const) {
  const candidate = structuredClone(draft) as unknown as Record<string, unknown>;
  (candidate.authorization as Record<string, unknown>)[key] = true;
  expectReject(`forbidden ${key}`, () =>
    validateAgentPaidWorkPaymentIntentDraft(work, quote, acceptance, candidate),
  );
}

const destinationInjected = structuredClone(draft) as unknown as Record<string, unknown>;
(destinationInjected.commercial as Record<string, unknown>).destination = "wallet:0xdead";
expectReject("destination injection", () =>
  validateAgentPaidWorkPaymentIntentDraft(work, quote, acceptance, destinationInjected),
);

const schemaText = readText("schemas/agent-paid-work-payment-intent-envelope-v1.schema.json");
const docs = readText("docs/public/agent-paid-work-payment-intent-envelope-v1.md");
const workflow = readText(".github/workflows/agent-paid-work-payment-intent-envelope-v1.yml");
const moduleSource = readText("scripts/agent_paid_work_payment_intent_envelope_v1.ts");
const schema = JSON.parse(schemaText) as Record<string, unknown>;
assertCondition(
  schema.$schema === "https://json-schema.org/draft/2020-12/schema",
  "schema draft mismatch",
);
assertCondition(schemaText.includes(AGENT_PAID_WORK_PAYMENT_INTENT_MARKER), "schema marker missing");
assertCondition(docs.includes(AGENT_PAID_WORK_PAYMENT_INTENT_MARKER), "docs marker missing");
assertCondition(workflow.includes("--strict") && workflow.includes("--skipLibCheck"), "typecheck flags missing");
assertCondition(
  moduleSource.includes("./agent_paid_work_acceptance_envelope_v1.js"),
  "acceptance validator binding missing",
);

const normalized = docs.replace(/\s+/g, " ");
for (const boundary of [
  "does not resolve a destination",
  "payment_execution_granted=false",
  "total + max_fee_total <= work_order.max_total",
  "At most one active payment intent per acceptance",
  "No wallet address, destination URI, invoice, or transaction payload field",
  "does not add a public HTTP route",
  "or activate Buy VOID fulfillment",
]) {
  assertCondition(normalized.includes(boundary), `documentation boundary missing: ${boundary}`);
}

console.log(`marker=${AGENT_PAID_WORK_PAYMENT_INTENT_MARKER}`);
console.log(`example_work_order_id=${materialized.work_order_id}`);
console.log(`example_quote_id=${materialized.quote_id}`);
console.log(`example_acceptance_id=${materialized.acceptance_id}`);
console.log(`example_payment_intent_id=${materialized.payment_intent_id}`);
console.log(`canonical_bytes=${Buffer.byteLength(canonicalJson(draft), "utf8")}`);
console.log("tampered_payment_intent_id_rejected=yes");
console.log("work_order_quote_acceptance_binding_verified=yes");
console.log("requester_provider_binding_verified=yes");
console.log("exact_total_and_rail_binding_verified=yes");
console.log("total_plus_fee_budget_guard=yes");
console.log("expiry_window_guard=yes");
console.log("one_time_and_replay_protection_required=yes");
console.log("single_active_intent_per_acceptance_required=yes");
console.log("authentication_and_allowlisted_resolution_required=yes");
console.log("payment_execution_separate_and_ungranted=yes");
console.log("work_execution_separate_and_ungranted=yes");
console.log("no_destination_or_transaction_payload=yes");
console.log("schema_parse_and_boundary_checks=yes");
console.log("VOID_AGENT_PAID_WORK_PAYMENT_INTENT_ENVELOPE_V1_PROOF_GREEN");
