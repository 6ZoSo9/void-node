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

const zeroBudget = structuredClone(draft) as unknown as Record<string, unknown>;
((zeroBudget.commercial as Record<string, unknown>)).max_total = "0";
expectReject("zero max_total", () =>
  validateAgentPaidWorkOrderDraft(zeroBudget),
);

const expired = structuredClone(draft);
expired.expires_at_utc = expired.created_at_utc;
expectReject("non-forward expiry", () =>
  validateAgentPaidWorkOrderDraft(expired),
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
console.log("zero_budget_rejected=yes");
console.log("non_forward_expiry_rejected=yes");
console.log("VOID_AGENT_PAID_WORK_ORDER_ENVELOPE_V1_PROOF_GREEN");
