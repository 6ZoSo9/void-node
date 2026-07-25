import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  AGENT_PAID_WORK_ACCEPTANCE_MARKER,
  canonicalJson,
  computeAgentPaidWorkAcceptanceId,
  materializeAgentPaidWorkAcceptance,
  validateAgentPaidWorkAcceptanceDraft,
  validateAgentPaidWorkAcceptanceEnvelope,
  type AgentPaidWorkAcceptanceDraft,
} from "./agent_paid_work_acceptance_envelope_v1.js";
import {
  validateAgentPaidWorkOrderEnvelope,
} from "./agent_paid_work_order_envelope_v1.js";
import {
  validateAgentPaidWorkQuoteEnvelope,
} from "./agent_paid_work_quote_envelope_v1.js";

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

const workOrderPath =
  "examples/agent-paid-work-order-envelope-v1.example.json";
const quotePath =
  "examples/agent-paid-work-quote-envelope-v1.example.json";
const acceptancePath =
  "examples/agent-paid-work-acceptance-envelope-v1.example.json";
const schemaPath =
  "schemas/agent-paid-work-acceptance-envelope-v1.schema.json";
const docsPath =
  "docs/public/agent-paid-work-acceptance-envelope-v1.md";
const workflowPath =
  ".github/workflows/agent-paid-work-acceptance-envelope-v1.yml";
const modulePath =
  "scripts/agent_paid_work_acceptance_envelope_v1.ts";

const workOrder = readJson(workOrderPath);
validateAgentPaidWorkOrderEnvelope(workOrder);

const quote = readJson(quotePath);
validateAgentPaidWorkQuoteEnvelope(workOrder, quote);

const acceptance = readJson(acceptancePath);
validateAgentPaidWorkAcceptanceEnvelope(
  workOrder,
  quote,
  acceptance,
);

const acceptanceRecord =
  acceptance as unknown as Record<string, unknown>;
const {
  acceptance_id: committedId,
  ...draftUnknown
} = acceptanceRecord;
validateAgentPaidWorkAcceptanceDraft(
  workOrder,
  quote,
  draftUnknown,
);
const draft = draftUnknown as AgentPaidWorkAcceptanceDraft;

const materialized = materializeAgentPaidWorkAcceptance(
  workOrder,
  quote,
  draft,
);
assertCondition(
  materialized.acceptance_id === committedId,
  "committed example acceptance_id is not reproducible",
);
assertCondition(
  materialized.acceptance_id ===
    computeAgentPaidWorkAcceptanceId(draft),
  "materialized acceptance_id mismatch",
);

const reordered = reverseObjectKeys(draft);
validateAgentPaidWorkAcceptanceDraft(
  workOrder,
  quote,
  reordered,
);
const reorderedMaterialized =
  materializeAgentPaidWorkAcceptance(
    workOrder,
    quote,
    reordered,
  );
assertCondition(
  reorderedMaterialized.acceptance_id ===
    materialized.acceptance_id,
  "canonical acceptance ID changed when object key order changed",
);
assertCondition(
  canonicalJson(reordered) === canonicalJson(draft),
  "canonical acceptance JSON changed when object key order changed",
);

const changedNonce = structuredClone(draft);
changedNonce.nonce = "acceptance-example-20260725-0002";
assertCondition(
  materializeAgentPaidWorkAcceptance(
    workOrder,
    quote,
    changedNonce,
  ).acceptance_id !== materialized.acceptance_id,
  "acceptance_id did not change when nonce changed",
);

const badId = structuredClone(materialized);
badId.acceptance_id =
  "voidawa1_0000000000000000000000000000000000000000000000000000000000000000";
expectReject("tampered acceptance_id", () =>
  validateAgentPaidWorkAcceptanceEnvelope(
    workOrder,
    quote,
    badId,
  ),
);

const badWorkOrderId = structuredClone(draft);
badWorkOrderId.work_order_id =
  "voidawo1_0000000000000000000000000000000000000000000000000000000000000000";
expectReject("mismatched work_order_id", () =>
  validateAgentPaidWorkAcceptanceDraft(
    workOrder,
    quote,
    badWorkOrderId,
  ),
);

const badQuoteId = structuredClone(draft);
badQuoteId.quote_id =
  "voidawq1_0000000000000000000000000000000000000000000000000000000000000000";
expectReject("mismatched quote_id", () =>
  validateAgentPaidWorkAcceptanceDraft(
    workOrder,
    quote,
    badQuoteId,
  ),
);

const badRequester = structuredClone(draft);
badRequester.requester.agent_id = "agent.example.other";
expectReject("mismatched requester", () =>
  validateAgentPaidWorkAcceptanceDraft(
    workOrder,
    quote,
    badRequester,
  ),
);

const badProvider = structuredClone(draft);
badProvider.provider.provider_id = "void.provider.other";
expectReject("mismatched provider", () =>
  validateAgentPaidWorkAcceptanceDraft(
    workOrder,
    quote,
    badProvider,
  ),
);

const badCapability = structuredClone(draft);
badCapability.provider.capability_id = "datanet.other";
expectReject("mismatched capability", () =>
  validateAgentPaidWorkAcceptanceDraft(
    workOrder,
    quote,
    badCapability,
  ),
);

const badAsset = structuredClone(draft);
badAsset.commercial.quote_asset = "VOID";
expectReject("mismatched quote asset", () =>
  validateAgentPaidWorkAcceptanceDraft(
    workOrder,
    quote,
    badAsset,
  ),
);

const badTotal = structuredClone(draft);
badTotal.commercial.total = "3.51";
expectReject("mismatched total", () =>
  validateAgentPaidWorkAcceptanceDraft(
    workOrder,
    quote,
    badTotal,
  ),
);

const badRail = structuredClone(draft);
badRail.commercial.payment_rail_id = "void.other.rail";
expectReject("mismatched payment rail", () =>
  validateAgentPaidWorkAcceptanceDraft(
    workOrder,
    quote,
    badRail,
  ),
);

const beforeQuote = structuredClone(draft);
beforeQuote.created_at_utc = "2026-07-25T22:34:59Z";
expectReject("acceptance before quote", () =>
  validateAgentPaidWorkAcceptanceDraft(
    workOrder,
    quote,
    beforeQuote,
  ),
);

const afterQuoteExpiry = structuredClone(draft);
afterQuoteExpiry.expires_at_utc = "2026-07-26T20:30:01Z";
expectReject("acceptance after quote expiry", () =>
  validateAgentPaidWorkAcceptanceDraft(
    workOrder,
    quote,
    afterQuoteExpiry,
  ),
);

const noQuoteAcceptance =
  structuredClone(draft) as unknown as Record<string, unknown>;
(
  noQuoteAcceptance.terms as Record<string, unknown>
).quote_terms_accepted = false;
expectReject("quote terms not accepted", () =>
  validateAgentPaidWorkAcceptanceDraft(
    workOrder,
    quote,
    noQuoteAcceptance,
  ),
);

const noRequesterAuth =
  structuredClone(draft) as unknown as Record<string, unknown>;
(
  noRequesterAuth.terms as Record<string, unknown>
).requester_authentication_required = false;
expectReject("requester authentication disabled", () =>
  validateAgentPaidWorkAcceptanceDraft(
    workOrder,
    quote,
    noRequesterAuth,
  ),
);

const noProviderAuth =
  structuredClone(draft) as unknown as Record<string, unknown>;
(
  noProviderAuth.terms as Record<string, unknown>
).provider_authentication_required = false;
expectReject("provider authentication disabled", () =>
  validateAgentPaidWorkAcceptanceDraft(
    workOrder,
    quote,
    noProviderAuth,
  ),
);

const noSeparatePayment =
  structuredClone(draft) as unknown as Record<string, unknown>;
(
  noSeparatePayment.terms as Record<string, unknown>
).separate_payment_authorization_required = false;
expectReject("payment authorization merged into acceptance", () =>
  validateAgentPaidWorkAcceptanceDraft(
    workOrder,
    quote,
    noSeparatePayment,
  ),
);

const noSeparateExecution =
  structuredClone(draft) as unknown as Record<string, unknown>;
(
  noSeparateExecution.terms as Record<string, unknown>
).separate_execution_authorization_required = false;
expectReject("execution authorization merged into acceptance", () =>
  validateAgentPaidWorkAcceptanceDraft(
    workOrder,
    quote,
    noSeparateExecution,
  ),
);

const paymentInstruction =
  structuredClone(draft) as unknown as Record<string, unknown>;
(
  paymentInstruction.terms as Record<string, unknown>
).acceptance_is_not_payment_instruction = false;
expectReject("acceptance treated as payment instruction", () =>
  validateAgentPaidWorkAcceptanceDraft(
    workOrder,
    quote,
    paymentInstruction,
  ),
);

const executionInstruction =
  structuredClone(draft) as unknown as Record<string, unknown>;
(
  executionInstruction.terms as Record<string, unknown>
).acceptance_is_not_execution_instruction = false;
expectReject("acceptance treated as execution instruction", () =>
  validateAgentPaidWorkAcceptanceDraft(
    workOrder,
    quote,
    executionInstruction,
  ),
);

const paymentGranted =
  structuredClone(draft) as unknown as Record<string, unknown>;
(
  paymentGranted.terms as Record<string, unknown>
).payment_authorization_granted = true;
expectReject("payment authority granted", () =>
  validateAgentPaidWorkAcceptanceDraft(
    workOrder,
    quote,
    paymentGranted,
  ),
);

const executionGranted =
  structuredClone(draft) as unknown as Record<string, unknown>;
(
  executionGranted.terms as Record<string, unknown>
).execution_authorization_granted = true;
expectReject("execution authority granted", () =>
  validateAgentPaidWorkAcceptanceDraft(
    workOrder,
    quote,
    executionGranted,
  ),
);

const schemaText = readText(schemaPath);
const docs = readText(docsPath);
const workflow = readText(workflowPath);
const moduleSource = readText(modulePath);
const schema = JSON.parse(schemaText) as Record<string, unknown>;

assertCondition(
  schema.$schema ===
    "https://json-schema.org/draft/2020-12/schema",
  "schema draft identifier mismatch",
);
assertCondition(
  schemaText.includes(AGENT_PAID_WORK_ACCEPTANCE_MARKER),
  "schema marker missing",
);
assertCondition(
  docs.includes(AGENT_PAID_WORK_ACCEPTANCE_MARKER),
  "documentation marker missing",
);
assertCondition(
  workflow.includes(
    "prove_agent_paid_work_acceptance_envelope_v1.ts",
  ),
  "workflow focused proof missing",
);
assertCondition(
  workflow.includes("--strict") &&
    workflow.includes("--skipLibCheck"),
  "workflow focused typecheck flags missing",
);
assertCondition(
  moduleSource.includes(
    "./agent_paid_work_order_envelope_v1.js",
  ),
  "acceptance module is not bound to the work-order validator",
);
assertCondition(
  moduleSource.includes(
    "./agent_paid_work_quote_envelope_v1.js",
  ),
  "acceptance module is not bound to the quote validator",
);

const normalizedDocs = docs.replace(/\s+/g, " ");
for (const boundary of [
  "An acceptance is not a payment instruction",
  "is not an execution instruction",
  "grants no authority to debit funds",
  "requester_authentication_required=true",
  "provider_authentication_required=true",
  "payment_authorization_granted=false",
  "execution_authorization_granted=false",
  "does not add a public HTTP route",
  "or activate Buy VOID fulfillment",
]) {
  assertCondition(
    normalizedDocs.includes(boundary),
    `documentation boundary missing: ${boundary}`,
  );
}

console.log(`marker=${AGENT_PAID_WORK_ACCEPTANCE_MARKER}`);
console.log(`example_work_order_id=${materialized.work_order_id}`);
console.log(`example_quote_id=${materialized.quote_id}`);
console.log(`example_acceptance_id=${materialized.acceptance_id}`);
console.log(
  `canonical_bytes=${Buffer.byteLength(
    canonicalJson(draft),
    "utf8",
  )}`,
);
console.log("tampered_acceptance_id_rejected=yes");
console.log("work_order_binding_verified=yes");
console.log("quote_binding_verified=yes");
console.log("requester_binding_verified=yes");
console.log("provider_binding_verified=yes");
console.log("commercial_binding_verified=yes");
console.log("expiry_window_guard=yes");
console.log("requester_authentication_required=yes");
console.log("provider_authentication_required=yes");
console.log("payment_authorization_separate_and_ungranted=yes");
console.log("execution_authorization_separate_and_ungranted=yes");
console.log("acceptance_not_payment_instruction=yes");
console.log("acceptance_not_execution_instruction=yes");
console.log("schema_parse_and_boundary_checks=yes");
console.log(
  "VOID_AGENT_PAID_WORK_ACCEPTANCE_ENVELOPE_V1_PROOF_GREEN",
);
