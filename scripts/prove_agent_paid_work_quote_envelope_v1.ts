import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  AGENT_PAID_WORK_QUOTE_MARKER,
  canonicalJson,
  comparePositiveDecimals,
  computeAgentPaidWorkQuoteId,
  materializeAgentPaidWorkQuote,
  validateAgentPaidWorkQuoteDraft,
  validateAgentPaidWorkQuoteEnvelope,
  type AgentPaidWorkQuoteDraft,
} from "./agent_paid_work_quote_envelope_v1.js";
import {
  validateAgentPaidWorkOrderEnvelope,
} from "./agent_paid_work_order_envelope_v1.js";

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
const schemaPath =
  "schemas/agent-paid-work-quote-envelope-v1.schema.json";
const docsPath =
  "docs/public/agent-paid-work-quote-envelope-v1.md";
const workflowPath =
  ".github/workflows/agent-paid-work-quote-envelope-v1.yml";
const modulePath =
  "scripts/agent_paid_work_quote_envelope_v1.ts";

const workOrder = readJson(workOrderPath);
validateAgentPaidWorkOrderEnvelope(workOrder);

const quote = readJson(quotePath);
validateAgentPaidWorkQuoteEnvelope(workOrder, quote);

const quoteRecord = quote as unknown as Record<string, unknown>;
const { quote_id: committedId, ...draftUnknown } = quoteRecord;
validateAgentPaidWorkQuoteDraft(workOrder, draftUnknown);
const draft = draftUnknown as AgentPaidWorkQuoteDraft;

const materialized = materializeAgentPaidWorkQuote(workOrder, draft);
assertCondition(
  materialized.quote_id === committedId,
  "committed example quote_id is not reproducible",
);
assertCondition(
  materialized.quote_id === computeAgentPaidWorkQuoteId(draft),
  "materialized quote_id mismatch",
);

const reordered = reverseObjectKeys(draft);
validateAgentPaidWorkQuoteDraft(workOrder, reordered);
const reorderedMaterialized =
  materializeAgentPaidWorkQuote(workOrder, reordered);
assertCondition(
  reorderedMaterialized.quote_id === materialized.quote_id,
  "canonical quote ID changed when object key order changed",
);
assertCondition(
  canonicalJson(reordered) === canonicalJson(draft),
  "canonical quote JSON changed when object key order changed",
);

assertCondition(comparePositiveDecimals("3.50", "5.00") < 0, "decimal less-than failed");
assertCondition(comparePositiveDecimals("5.0", "5.00") === 0, "decimal equality failed");
assertCondition(comparePositiveDecimals("10.00", "9.99") > 0, "decimal greater-than failed");

const changedTotal = structuredClone(draft);
changedTotal.commercial.total = "3.51";
assertCondition(
  materializeAgentPaidWorkQuote(workOrder, changedTotal).quote_id !==
    materialized.quote_id,
  "quote_id did not change when total changed",
);

const badId = structuredClone(materialized);
badId.quote_id =
  "voidawq1_0000000000000000000000000000000000000000000000000000000000000000";
expectReject("tampered quote_id", () =>
  validateAgentPaidWorkQuoteEnvelope(workOrder, badId),
);

const badWorkOrder = structuredClone(draft);
badWorkOrder.work_order_id =
  "voidawo1_0000000000000000000000000000000000000000000000000000000000000000";
expectReject("mismatched work_order_id", () =>
  validateAgentPaidWorkQuoteDraft(workOrder, badWorkOrder),
);

const badCapability = structuredClone(draft);
badCapability.provider.capability_id = "datanet.other";
expectReject("mismatched capability", () =>
  validateAgentPaidWorkQuoteDraft(workOrder, badCapability),
);

const badAsset = structuredClone(draft);
badAsset.commercial.quote_asset = "VOID";
expectReject("mismatched quote asset", () =>
  validateAgentPaidWorkQuoteDraft(workOrder, badAsset),
);

const overBudget = structuredClone(draft);
overBudget.commercial.total = "5.000000000000000001";
expectReject("over-budget quote", () =>
  validateAgentPaidWorkQuoteDraft(workOrder, overBudget),
);

const zeroTotal = structuredClone(draft);
zeroTotal.commercial.total = "0.00";
expectReject("zero total", () =>
  validateAgentPaidWorkQuoteDraft(workOrder, zeroTotal),
);

const oversizedTotal = structuredClone(draft);
oversizedTotal.commercial.total =
  "123456789012345678901234567890123.00";
expectReject("oversized total", () =>
  validateAgentPaidWorkQuoteDraft(workOrder, oversizedTotal),
);

const lateExpiry = structuredClone(draft);
lateExpiry.expires_at_utc = "2026-07-26T22:30:01Z";
expectReject("quote expiry after work-order expiry", () =>
  validateAgentPaidWorkQuoteDraft(workOrder, lateExpiry),
);

const earlyCreation = structuredClone(draft);
earlyCreation.created_at_utc = "2026-07-25T22:29:59Z";
expectReject("quote before work order", () =>
  validateAgentPaidWorkQuoteDraft(workOrder, earlyCreation),
);

const excessiveRuntime = structuredClone(draft);
excessiveRuntime.execution_commitment.max_runtime_seconds = 301;
expectReject("runtime over request", () =>
  validateAgentPaidWorkQuoteDraft(workOrder, excessiveRuntime),
);

const excessiveOutput = structuredClone(draft);
excessiveOutput.execution_commitment.max_output_bytes = 1048577;
expectReject("output bytes over request", () =>
  validateAgentPaidWorkQuoteDraft(workOrder, excessiveOutput),
);

const missingOutput = structuredClone(draft);
missingOutput.execution_commitment.output_labels = [
  "verification_result.json",
];
expectReject("incomplete outputs", () =>
  validateAgentPaidWorkQuoteDraft(workOrder, missingOutput),
);

const reorderedOutputs = structuredClone(draft);
reorderedOutputs.execution_commitment.output_labels.reverse();
expectReject("reordered outputs", () =>
  validateAgentPaidWorkQuoteDraft(workOrder, reorderedOutputs),
);

const pathLikeOutput = structuredClone(draft) as unknown as Record<string, unknown>;
(
  (
    pathLikeOutput.execution_commitment as Record<string, unknown>
  ).output_labels as unknown[]
)[0] = "../result.json";
expectReject("path-like output label", () =>
  validateAgentPaidWorkQuoteDraft(workOrder, pathLikeOutput),
);

const sideEffects = structuredClone(draft) as unknown as Record<string, unknown>;
(
  sideEffects.execution_commitment as Record<string, unknown>
).external_side_effects_allowed = true;
expectReject("external side effects", () =>
  validateAgentPaidWorkQuoteDraft(workOrder, sideEffects),
);

const walletAccess = structuredClone(draft) as unknown as Record<string, unknown>;
(
  walletAccess.execution_commitment as Record<string, unknown>
).wallet_access_allowed = true;
expectReject("wallet access", () =>
  validateAgentPaidWorkQuoteDraft(workOrder, walletAccess),
);

const moneyMovement = structuredClone(draft) as unknown as Record<string, unknown>;
(
  moneyMovement.execution_commitment as Record<string, unknown>
).money_movement_allowed = true;
expectReject("money movement", () =>
  validateAgentPaidWorkQuoteDraft(workOrder, moneyMovement),
);

const noAcceptance = structuredClone(draft) as unknown as Record<string, unknown>;
(noAcceptance.terms as Record<string, unknown>).separate_acceptance_required = false;
expectReject("execution without acceptance", () =>
  validateAgentPaidWorkQuoteDraft(workOrder, noAcceptance),
);

const noPrepayment = structuredClone(draft) as unknown as Record<string, unknown>;
(noPrepayment.terms as Record<string, unknown>).payment_required_before_execution = false;
expectReject("execution before payment", () =>
  validateAgentPaidWorkQuoteDraft(workOrder, noPrepayment),
);

const grantsAuthority = structuredClone(draft) as unknown as Record<string, unknown>;
(grantsAuthority.terms as Record<string, unknown>).quote_grants_no_execution_authority = false;
expectReject("quote execution authority", () =>
  validateAgentPaidWorkQuoteDraft(workOrder, grantsAuthority),
);

const noProviderAuthentication =
  structuredClone(draft) as unknown as Record<string, unknown>;
(
  noProviderAuthentication.terms as Record<string, unknown>
).provider_authentication_required = false;
expectReject("unauthenticated provider acceptance", () =>
  validateAgentPaidWorkQuoteDraft(workOrder, noProviderAuthentication),
);

const paymentInstruction =
  structuredClone(draft) as unknown as Record<string, unknown>;
(
  paymentInstruction.terms as Record<string, unknown>
).quote_is_not_payment_instruction = false;
expectReject("quote treated as payment instruction", () =>
  validateAgentPaidWorkQuoteDraft(workOrder, paymentInstruction),
);

const unsafeRail = structuredClone(draft);
unsafeRail.commercial.payment_rail_id = "file:tmp";
expectReject("unsafe payment rail identifier", () =>
  validateAgentPaidWorkQuoteDraft(workOrder, unsafeRail),
);

const schemaText = readText(schemaPath);
const docs = readText(docsPath);
const workflow = readText(workflowPath);
const moduleSource = readText(modulePath);
const schema = JSON.parse(schemaText) as Record<string, unknown>;

assertCondition(
  schema.$schema === "https://json-schema.org/draft/2020-12/schema",
  "schema draft identifier mismatch",
);
assertCondition(
  schemaText.includes(AGENT_PAID_WORK_QUOTE_MARKER),
  "schema marker missing",
);
assertCondition(
  docs.includes(AGENT_PAID_WORK_QUOTE_MARKER),
  "documentation marker missing",
);
assertCondition(
  workflow.includes("prove_agent_paid_work_quote_envelope_v1.ts"),
  "workflow focused proof missing",
);
assertCondition(
  workflow.includes("--strict") && workflow.includes("--skipLibCheck"),
  "workflow focused typecheck flags missing",
);
assertCondition(
  moduleSource.includes("./agent_paid_work_order_envelope_v1.js"),
  "quote module is not bound to the work-order validator",
);

const normalizedDocs = docs.replace(/\s+/g, " ");
for (const boundary of [
  "does not receive payment",
  "does not start work",
  "grants no authority to execute",
  "provider through a separately signed transport",
  "not a URI, wallet, payment destination, invoice, or authorization to pay",
  "authenticated and allowlisted payment-rail registry",
  "No wallet access",
  "No money movement",
  "No external side effects",
  "does not add a public HTTP route",
  "or activate Buy VOID fulfillment",
]) {
  assertCondition(
    normalizedDocs.includes(boundary),
    `documentation boundary missing: ${boundary}`,
  );
}

console.log(`marker=${AGENT_PAID_WORK_QUOTE_MARKER}`);
console.log(`example_work_order_id=${materialized.work_order_id}`);
console.log(`example_quote_id=${materialized.quote_id}`);
console.log(`canonical_bytes=${Buffer.byteLength(canonicalJson(draft), "utf8")}`);
console.log("tampered_quote_id_rejected=yes");
console.log("work_order_binding_verified=yes");
console.log("capability_binding_verified=yes");
console.log("asset_binding_verified=yes");
console.log("exact_decimal_budget_guard=yes");
console.log("expiry_window_guard=yes");
console.log("execution_limit_guard=yes");
console.log("output_commitment_guard=yes");
console.log("side_effects_rejected=yes");
console.log("wallet_access_rejected=yes");
console.log("money_movement_rejected=yes");
console.log("separate_acceptance_required=yes");
console.log("provider_authentication_required=yes");
console.log("quote_is_not_payment_instruction=yes");
console.log("payment_before_execution_required=yes");
console.log("schema_parse_and_boundary_checks=yes");
console.log("VOID_AGENT_PAID_WORK_QUOTE_ENVELOPE_V1_PROOF_GREEN");
