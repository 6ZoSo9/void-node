import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  AGENT_PAID_WORK_ORDER_MARKER,
  canonicalJson,
  computeAgentPaidWorkOrderId,
  materializeAgentPaidWorkOrder,
  validateAgentPaidWorkOrderDraft,
  validateAgentPaidWorkOrderEnvelope,
  type AgentPaidWorkOrderDraft,
} from "./agent_paid_work_order_envelope_v1.js";

function assertCondition(condition: unknown, message: string): asserts condition {
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

function requireRecord(
  value: unknown,
  label: string,
): Record<string, unknown> {
  assertCondition(
    typeof value === "object" && value !== null && !Array.isArray(value),
    `${label} must be an object`,
  );
  return value as Record<string, unknown>;
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
  const entries = Object.entries(value as Record<string, unknown>).reverse();
  return Object.fromEntries(
    entries.map(([key, child]) => [key, reverseObjectKeys(child)]),
  );
}

const examplePath = "examples/agent-paid-work-order-envelope-v1.example.json";
const schemaPath = "schemas/agent-paid-work-order-envelope-v1.schema.json";
const docsPath = "docs/public/agent-paid-work-order-envelope-v1.md";
const workflowPath = ".github/workflows/agent-paid-work-order-envelope-v1.yml";
const modulePath = "scripts/agent_paid_work_order_envelope_v1.ts";

const example = readJson(examplePath);
validateAgentPaidWorkOrderEnvelope(example);

const exampleRecord = example as Record<string, unknown>;
const { work_order_id: committedId, ...draftUnknown } = exampleRecord;
validateAgentPaidWorkOrderDraft(draftUnknown);
const draft = draftUnknown as AgentPaidWorkOrderDraft;

const materialized = materializeAgentPaidWorkOrder(draft);
assertCondition(
  materialized.work_order_id === committedId,
  "committed example work_order_id is not reproducible",
);
assertCondition(
  materialized.work_order_id === computeAgentPaidWorkOrderId(draft),
  "materialized work_order_id mismatch",
);

const reordered = reverseObjectKeys(draft);
validateAgentPaidWorkOrderDraft(reordered);
const reorderedMaterialized = materializeAgentPaidWorkOrder(reordered);
assertCondition(
  reorderedMaterialized.work_order_id === materialized.work_order_id,
  "canonical ID changed when object key order changed",
);
assertCondition(
  canonicalJson(reordered) === canonicalJson(draft),
  "canonical JSON changed when object key order changed",
);

const changedObjective = structuredClone(draft);
changedObjective.service.objective = `${changedObjective.service.objective} Additional proof.`;
const changedMaterialized = materializeAgentPaidWorkOrder(changedObjective);
assertCondition(
  changedMaterialized.work_order_id !== materialized.work_order_id,
  "work_order_id did not change when the requested work changed",
);

const badId = structuredClone(materialized);
badId.work_order_id =
  "voidawo1_0000000000000000000000000000000000000000000000000000000000000000";
expectReject("tampered work_order_id", () =>
  validateAgentPaidWorkOrderEnvelope(badId),
);

const moneyMovement = structuredClone(draft) as unknown as Record<string, unknown>;
(
  (moneyMovement.execution_limits as Record<string, unknown>)
).money_movement_allowed = true;
expectReject("money movement", () =>
  validateAgentPaidWorkOrderDraft(moneyMovement),
);

const walletAccess = structuredClone(draft) as unknown as Record<string, unknown>;
(
  (walletAccess.execution_limits as Record<string, unknown>)
).wallet_access_allowed = true;
expectReject("wallet access", () =>
  validateAgentPaidWorkOrderDraft(walletAccess),
);


const externalSideEffects = structuredClone(draft) as unknown as Record<string, unknown>;
(
  (externalSideEffects.execution_limits as Record<string, unknown>)
).external_side_effects_allowed = true;
expectReject("external side effects", () =>
  validateAgentPaidWorkOrderDraft(externalSideEffects),
);

const unpaidExecution = structuredClone(draft) as unknown as Record<string, unknown>;
(
  (unpaidExecution.commercial as Record<string, unknown>)
).payment_required_before_execution = false;
expectReject("execution before payment", () =>
  validateAgentPaidWorkOrderDraft(unpaidExecution),
);

const insecureCallback = structuredClone(draft);
insecureCallback.requester.callback_uri = "http://agent.example.invalid/callback";
expectReject("non-HTTPS callback", () =>
  validateAgentPaidWorkOrderDraft(insecureCallback),
);

const credentialCallback = structuredClone(draft);
credentialCallback.requester.callback_uri =
  "https://user:password@agent.example.invalid/callback";
expectReject("credential-bearing callback", () =>
  validateAgentPaidWorkOrderDraft(credentialCallback),
);

const fragmentCallback = structuredClone(draft);
fragmentCallback.requester.callback_uri =
  "https://agent.example.invalid/callback#fragment";
expectReject("callback fragment", () =>
  validateAgentPaidWorkOrderDraft(fragmentCallback),
);

const unsafeOutput = structuredClone(draft);
unsafeOutput.service.expected_outputs = ["../../result.json"];
expectReject("unsafe output label", () =>
  validateAgentPaidWorkOrderDraft(unsafeOutput),
);

const zeroBudget = structuredClone(draft) as unknown as Record<string, unknown>;
((zeroBudget.commercial as Record<string, unknown>)).max_total = "0";
expectReject("zero max_total", () =>
  validateAgentPaidWorkOrderDraft(zeroBudget),
);


const oversizedBudget = structuredClone(draft) as unknown as Record<string, unknown>;
((oversizedBudget.commercial as Record<string, unknown>)).max_total =
  "123456789012345678901234567890123";
expectReject("oversized max_total", () =>
  validateAgentPaidWorkOrderDraft(oversizedBudget),
);

const expired = structuredClone(draft);
expired.expires_at_utc = expired.created_at_utc;
expectReject("non-forward expiry", () =>
  validateAgentPaidWorkOrderDraft(expired),
);

const schemaValue = readJson(schemaPath);
const schemaRoot = requireRecord(schemaValue, "schema");
assertCondition(
  schemaRoot.$schema === "https://json-schema.org/draft/2020-12/schema",
  "schema draft declaration mismatch",
);
const schemaProperties = requireRecord(schemaRoot.properties, "schema.properties");
const requesterSchema = requireRecord(
  schemaProperties.requester,
  "schema.properties.requester",
);
const requesterProperties = requireRecord(
  requesterSchema.properties,
  "schema requester properties",
);
const callbackSchema = requireRecord(
  requesterProperties.callback_uri,
  "schema callback_uri",
);
assertCondition(
  callbackSchema.pattern === "^https://[^\\s#]+$",
  "schema callback_uri must require lowercase HTTPS and reject fragments",
);

const serviceSchema = requireRecord(
  schemaProperties.service,
  "schema.properties.service",
);
const serviceProperties = requireRecord(
  serviceSchema.properties,
  "schema service properties",
);
const expectedOutputsSchema = requireRecord(
  serviceProperties.expected_outputs,
  "schema expected_outputs",
);
const expectedOutputItems = requireRecord(
  expectedOutputsSchema.items,
  "schema expected_outputs items",
);
assertCondition(
  expectedOutputItems.pattern === "^[A-Za-z0-9][A-Za-z0-9._:-]{0,255}$",
  "schema expected_outputs must require machine-safe logical labels",
);

const commercialSchema = requireRecord(
  schemaProperties.commercial,
  "schema.properties.commercial",
);
const commercialProperties = requireRecord(
  commercialSchema.properties,
  "schema commercial properties",
);
const maxTotalSchema = requireRecord(
  commercialProperties.max_total,
  "schema max_total",
);
assertCondition(
  maxTotalSchema.maxLength === 51,
  "schema max_total length bound mismatch",
);

const schema = readText(schemaPath);
const docs = readText(docsPath);
const workflow = readText(workflowPath);
const moduleSource = readText(modulePath);

for (const [label, content, required] of [
  ["schema", schema, AGENT_PAID_WORK_ORDER_MARKER],
  ["docs", docs, AGENT_PAID_WORK_ORDER_MARKER],
  ["module", moduleSource, AGENT_PAID_WORK_ORDER_MARKER],
  ["workflow", workflow, "prove_agent_paid_work_order_envelope_v1.ts"],
] as const) {
  assertCondition(content.includes(required), `${label} is missing ${required}`);
}

const normalizedDocs = docs.replace(/\s+/g, " ");

for (const requiredBoundary of [
  "no wallet access",
  "no money movement",
  "no Work Credit mutation",
  "no Buy VOID fulfillment",
  "no automatic acceptance",
]) {
  assertCondition(
    normalizedDocs.includes(requiredBoundary),
    `documentation is missing boundary: ${requiredBoundary}`,
  );
}

assertCondition(
  schema.includes('"payment_required_before_execution"'),
  "schema does not require payment-before-execution truth",
);
assertCondition(
  schema.includes('"const": false'),
  "schema does not lock side-effect flags false",
);

console.log(`marker=${AGENT_PAID_WORK_ORDER_MARKER}`);
console.log(`example_work_order_id=${materialized.work_order_id}`);
console.log(`canonical_bytes=${Buffer.byteLength(canonicalJson(draft), "utf8")}`);
console.log("tampered_id_rejected=yes");
console.log("money_movement_rejected=yes");
console.log("wallet_access_rejected=yes");
console.log("external_side_effects_rejected=yes");
console.log("execution_before_payment_rejected=yes");
console.log("unsafe_callback_rejected=yes");
console.log("unsafe_output_label_rejected=yes");
console.log("zero_budget_rejected=yes");
console.log("oversized_budget_rejected=yes");
console.log("non_forward_expiry_rejected=yes");
console.log("schema_parse_and_hardening_checks=yes");
console.log("VOID_AGENT_PAID_WORK_ORDER_ENVELOPE_V1_PROOF_GREEN");
