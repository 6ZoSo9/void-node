import fs from "node:fs";
import path from "node:path";
import {
  materializePublicAgentServiceOrderV1,
  validatePublicAgentServiceOrderRequestV1,
  verifyPublicAgentServiceOrderV1,
} from "./public_agent_service_order_adapter_v1.js";
import {
  validateAgentPaidWorkOrderEnvelope,
} from "./agent_paid_work_order_envelope_v1.js";

function fail(message: string): never {
  throw new Error(message);
}

function assertCondition(
  condition: unknown,
  message: string,
): asserts condition {
  if (!condition) fail(message);
}

function readJson(relative: string): unknown {
  const resolved = path.resolve(relative);
  const stat = fs.lstatSync(resolved);
  assertCondition(!stat.isSymbolicLink(), `symlink forbidden: ${relative}`);
  assertCondition(stat.isFile(), `regular file required: ${relative}`);
  return JSON.parse(fs.readFileSync(resolved, "utf8")) as unknown;
}

function readText(relative: string): string {
  const resolved = path.resolve(relative);
  const stat = fs.lstatSync(resolved);
  assertCondition(!stat.isSymbolicLink(), `symlink forbidden: ${relative}`);
  assertCondition(stat.isFile(), `regular file required: ${relative}`);
  return fs.readFileSync(resolved, "utf8");
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function expectReject(
  label: string,
  action: () => unknown,
): void {
  let rejected = false;
  try {
    action();
  } catch {
    rejected = true;
  }
  assertCondition(rejected, `${label} was not rejected`);
}

const requestPath =
  "examples/public-agent-service-order-request-v1.example.json";
const requestSchemaPath =
  "schemas/public-agent-service-order-request-v1.schema.json";
const adapterPath =
  "scripts/public_agent_service_order_adapter_v1.ts";
const proofPath =
  "scripts/prove_public_agent_service_order_adapter_v1.ts";
const docsPath =
  "docs/public-agent/public-agent-service-order-adapter-v1.md";
const workflowPath =
  ".github/workflows/public-agent-service-order-adapter-v1.yml";
const catalogPath =
  "ops/public/agent-services-v1/catalog.json";

const request = readJson(requestPath);
const catalog = readJson(catalogPath);
validatePublicAgentServiceOrderRequestV1(request);

const result = materializePublicAgentServiceOrderV1(request, catalog);
validateAgentPaidWorkOrderEnvelope(result.order);
verifyPublicAgentServiceOrderV1(request, catalog, result.order);

assertCondition(
  result.service_id === "void.datanet.fetch-verify.v1",
  "service_id mapping changed",
);
assertCondition(
  result.capability_id === "datanet.fetch_verify",
  "capability_id mapping changed",
);
assertCondition(
  result.order.service.capability_id === "datanet.fetch_verify",
  "order capability_id mismatch",
);
assertCondition(
  result.order.commercial.payment_required_before_execution === true,
  "payment-before-execution truth changed",
);
assertCondition(
  result.order.execution_limits.external_side_effects_allowed === false,
  "external side effects became allowed",
);
assertCondition(
  result.order.execution_limits.wallet_access_allowed === false,
  "wallet access became allowed",
);
assertCondition(
  result.order.execution_limits.money_movement_allowed === false,
  "money movement became allowed",
);

const reordered = clone(request) as Record<string, unknown>;
const reorderedRequest = {
  nonce: reordered.nonce,
  execution_limits: reordered.execution_limits,
  commercial: reordered.commercial,
  expected_outputs: reordered.expected_outputs,
  input_refs: reordered.input_refs,
  objective: reordered.objective,
  requester: reordered.requester,
  expires_at_utc: reordered.expires_at_utc,
  created_at_utc: reordered.created_at_utc,
  service_id: reordered.service_id,
  catalog_fingerprint_sha256:
    reordered.catalog_fingerprint_sha256,
  catalog_id: reordered.catalog_id,
  version: reordered.version,
  marker: reordered.marker,
};
const reorderedResult = materializePublicAgentServiceOrderV1(
  reorderedRequest,
  catalog,
);
assertCondition(
  reorderedResult.order.work_order_id === result.order.work_order_id,
  "request key order changed work_order_id",
);

const changedObjective = clone(request) as Record<string, unknown>;
changedObjective.objective =
  `${String(changedObjective.objective)} Additional bounded proof.`;
const changedResult = materializePublicAgentServiceOrderV1(
  changedObjective,
  catalog,
);
assertCondition(
  changedResult.order.work_order_id !== result.order.work_order_id,
  "changed objective did not change work_order_id",
);

const unknownService = clone(request) as Record<string, unknown>;
unknownService.service_id = "void.unknown.service.v1";
expectReject("unknown service", () =>
  materializePublicAgentServiceOrderV1(unknownService, catalog),
);

const nonOrderable = clone(request) as Record<string, unknown>;
nonOrderable.service_id =
  "void.agent-paid-work.protocol-discovery.v1";
expectReject("non-orderable discovery service", () =>
  materializePublicAgentServiceOrderV1(nonOrderable, catalog),
);

const badFingerprint = clone(request) as Record<string, unknown>;
badFingerprint.catalog_fingerprint_sha256 = "0".repeat(64);
expectReject("stale catalog fingerprint", () =>
  materializePublicAgentServiceOrderV1(badFingerprint, catalog),
);

const insecureCallback = clone(request) as Record<string, unknown>;
(insecureCallback.requester as Record<string, unknown>).callback_uri =
  "http://agent.example.invalid/callback";
expectReject("insecure callback", () =>
  validatePublicAgentServiceOrderRequestV1(insecureCallback),
);

const unsafeOutput = clone(request) as Record<string, unknown>;
unsafeOutput.expected_outputs = ["../../result.json"];
expectReject("unsafe output label", () =>
  validatePublicAgentServiceOrderRequestV1(unsafeOutput),
);

const tamperedOrder = clone(result.order);
tamperedOrder.service.objective =
  `${tamperedOrder.service.objective} Tampered.`;
expectReject("tampered order envelope", () =>
  verifyPublicAgentServiceOrderV1(request, catalog, tamperedOrder),
);

const requestSchema =
  readJson(requestSchemaPath) as Record<string, unknown>;
assertCondition(
  requestSchema.$schema
    === "https://json-schema.org/draft/2020-12/schema",
  "request schema draft mismatch",
);
assertCondition(
  requestSchema.x_void_marker
    === "VOID_PUBLIC_AGENT_SERVICE_ORDER_REQUEST_SCHEMA_V1",
  "request schema marker mismatch",
);

const adapterText = readText(adapterPath);
const proofText = readText(proofPath);
const docsText = readText(docsPath);
const workflowText = readText(workflowPath);

assertCondition(
  adapterText.includes("payment_required_before_execution: true"),
  "adapter does not lock payment-before-execution true",
);
for (const marker of [
  "external_side_effects_allowed: false",
  "wallet_access_allowed: false",
  "money_movement_allowed: false",
]) {
  assertCondition(
    adapterText.includes(marker),
    `adapter missing safety lock: ${marker}`,
  );
}
assertCondition(
  !/from\s+["']node:(?:http|https|net|tls|child_process)["']/.test(
    adapterText,
  ),
  "adapter imports network or subprocess authority",
);
assertCondition(
  docsText.includes("VOID_PUBLIC_AGENT_SERVICE_ORDER_REQUEST_V1"),
  "docs marker missing",
);
assertCondition(
  workflowText.includes(
    "prove_public_agent_service_order_adapter_v1.ts",
  ),
  "workflow proof command missing",
);
assertCondition(
  /uses:\s*actions\/checkout@v4\s+with:\s+fetch-depth:\s*0/.test(
    workflowText,
  ),
  "workflow must use full-history checkout",
);
assertCondition(
  proofText.includes("non-orderable discovery service"),
  "proof does not reject a non-orderable catalog service",
);

console.log(
  JSON.stringify(
    {
      marker: "VOID_PUBLIC_AGENT_SERVICE_ORDER_ADAPTER_V1",
      service_id: result.service_id,
      capability_id: result.capability_id,
      catalog_fingerprint_sha256:
        result.catalog_fingerprint_sha256,
      work_order_id: result.order.work_order_id,
      payment_required_before_execution: true,
      external_side_effects_allowed: false,
      wallet_access_allowed: false,
      money_movement_allowed: false,
      runtime_mutation: false,
      service_mutation: false,
      credential_change: false,
      payment_execution: false,
      transaction_broadcast: false,
      proof: "green",
    },
    null,
    2,
  ),
);
