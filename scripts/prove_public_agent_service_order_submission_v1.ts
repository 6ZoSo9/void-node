import fs from "node:fs";
import path from "node:path";
import {
  materializePublicAgentServiceOrderSubmissionV1,
  validateAgentPaidWorkSubmissionRequestV1,
  validatePublicAgentServiceOrderSubmissionV1,
  verifyPublicAgentServiceOrderSubmissionV1,
} from "./public_agent_service_order_submission_v1.js";
import {
  canonicalJson,
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
  const fileStat = fs.lstatSync(resolved);
  assertCondition(!fileStat.isSymbolicLink(), `symlink forbidden: ${relative}`);
  assertCondition(fileStat.isFile(), `regular file required: ${relative}`);
  return JSON.parse(fs.readFileSync(resolved, "utf8")) as unknown;
}

function readText(relative: string): string {
  const resolved = path.resolve(relative);
  const fileStat = fs.lstatSync(resolved);
  assertCondition(!fileStat.isSymbolicLink(), `symlink forbidden: ${relative}`);
  assertCondition(fileStat.isFile(), `regular file required: ${relative}`);
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

const inputPath =
  "examples/public-agent-service-order-submission-v1.example.json";
const schemaPath =
  "schemas/public-agent-service-order-submission-v1.schema.json";
const docsPath =
  "docs/public-agent/public-agent-service-order-submission-v1.md";
const adapterPath =
  "scripts/public_agent_service_order_submission_v1.ts";
const proofPath =
  "scripts/prove_public_agent_service_order_submission_v1.ts";
const workflowPath =
  ".github/workflows/public-agent-service-order-submission-v1.yml";
const catalogPath =
  "ops/public/agent-services-v1/catalog.json";
const receiverSchemaPath =
  "schemas/agent-paid-work-submission-request-v1.schema.json";
const receiverPath =
  "scripts/agent_paid_work_submission_receiver_v1.ts";
const clientPath =
  "tools/void-ai-agent-paid-work-client-v1.mjs";

const input = readJson(inputPath);
const catalog = readJson(catalogPath);
validatePublicAgentServiceOrderSubmissionV1(input);

const materialized =
  materializePublicAgentServiceOrderSubmissionV1(
    input,
    catalog,
  );
validateAgentPaidWorkSubmissionRequestV1(
  materialized.request,
);
verifyPublicAgentServiceOrderSubmissionV1(
  input,
  catalog,
  materialized.request,
);

assertCondition(
  materialized.route
    === "/__void/agents/paid-work/submissions/v1",
  "submission route changed",
);
assertCondition(
  materialized.service_id
    === "void.datanet.fetch-verify.v1",
  "service_id mapping changed",
);
assertCondition(
  materialized.capability_id === "datanet.fetch_verify",
  "capability_id mapping changed",
);
assertCondition(
  materialized.work_order_id
    === "voidawo1_a328fbbee6ea0822c8fe5212e19cba23b889c489a39235a2529243d8f19fc106",
  "catalog-bound work_order_id changed",
);
assertCondition(
  /^voidawsr1_[0-9a-f]{64}$/.test(
    materialized.submission_id,
  ),
  "submission_id format mismatch",
);
assertCondition(
  /^[0-9a-f]{64}$/.test(materialized.request_sha256),
  "request_sha256 format mismatch",
);
assertCondition(
  materialized.request.marker
    === "VOID_AGENT_PAID_WORK_SUBMISSION_REQUEST_V1",
  "receiver request marker mismatch",
);
assertCondition(
  Object.keys(materialized.request).sort().join(",")
    === "marker,submission_id,version,work_order",
  "receiver request contains unexpected fields",
);
assertCondition(
  materialized.request.work_order.commercial
    .payment_required_before_execution === true,
  "payment-before-execution truth changed",
);
assertCondition(
  materialized.request.work_order.execution_limits
    .external_side_effects_allowed === false,
  "external side effects became allowed",
);
assertCondition(
  materialized.request.work_order.execution_limits
    .wallet_access_allowed === false,
  "wallet access became allowed",
);
assertCondition(
  materialized.request.work_order.execution_limits
    .money_movement_allowed === false,
  "money movement became allowed",
);

const reordered = clone(input) as Record<string, unknown>;
const reorderedInput = {
  order_request: reordered.order_request,
  submission_nonce: reordered.submission_nonce,
  version: reordered.version,
  marker: reordered.marker,
};
const reorderedMaterialized =
  materializePublicAgentServiceOrderSubmissionV1(
    reorderedInput,
    catalog,
  );
assertCondition(
  reorderedMaterialized.submission_id
    === materialized.submission_id,
  "input key order changed submission_id",
);
assertCondition(
  reorderedMaterialized.request_sha256
    === materialized.request_sha256,
  "input key order changed request_sha256",
);

const changedNonce = clone(input) as Record<string, unknown>;
changedNonce.submission_nonce =
  "submission-example-20300101-0002";
const changedNonceMaterialized =
  materializePublicAgentServiceOrderSubmissionV1(
    changedNonce,
    catalog,
  );
assertCondition(
  changedNonceMaterialized.submission_id
    !== materialized.submission_id,
  "changed nonce did not change submission_id",
);
assertCondition(
  changedNonceMaterialized.work_order_id
    === materialized.work_order_id,
  "changed submission nonce changed work_order_id",
);

const changedObjective = clone(input) as Record<string, unknown>;
(
  changedObjective.order_request as Record<string, unknown>
).objective =
  "Fetch and verify a different deterministic DataNet proof target.";
const changedObjectiveMaterialized =
  materializePublicAgentServiceOrderSubmissionV1(
    changedObjective,
    catalog,
  );
assertCondition(
  changedObjectiveMaterialized.work_order_id
    !== materialized.work_order_id,
  "changed objective did not change work_order_id",
);
assertCondition(
  changedObjectiveMaterialized.submission_id
    !== materialized.submission_id,
  "changed objective did not change submission_id",
);

const nonOrderable = clone(input) as Record<string, unknown>;
(
  nonOrderable.order_request as Record<string, unknown>
).service_id =
  "void.agent-paid-work.protocol-discovery.v1";
expectReject("non-orderable catalog service", () =>
  materializePublicAgentServiceOrderSubmissionV1(
    nonOrderable,
    catalog,
  ),
);

const staleCatalog = clone(input) as Record<string, unknown>;
(
  staleCatalog.order_request as Record<string, unknown>
).catalog_fingerprint_sha256 = "0".repeat(64);
expectReject("stale catalog fingerprint", () =>
  materializePublicAgentServiceOrderSubmissionV1(
    staleCatalog,
    catalog,
  ),
);

const unsafeNonce = clone(input) as Record<string, unknown>;
unsafeNonce.submission_nonce = "../../unsafe";
expectReject("unsafe submission nonce", () =>
  validatePublicAgentServiceOrderSubmissionV1(
    unsafeNonce,
  ),
);

const tamperedRequest = clone(materialized.request);
tamperedRequest.work_order.service.objective =
  `${tamperedRequest.work_order.service.objective} Tampered.`;
expectReject("tampered receiver request", () =>
  verifyPublicAgentServiceOrderSubmissionV1(
    input,
    catalog,
    tamperedRequest,
  ),
);

const schema = readJson(schemaPath) as Record<string, unknown>;
assertCondition(
  schema.$schema
    === "https://json-schema.org/draft/2020-12/schema",
  "schema draft mismatch",
);
assertCondition(
  schema.x_void_marker
    === "VOID_PUBLIC_AGENT_SERVICE_ORDER_SUBMISSION_SCHEMA_V1",
  "schema marker mismatch",
);

const docs = readText(docsPath);
const adapter = readText(adapterPath);
const proof = readText(proofPath);
const workflow = readText(workflowPath);
const receiverSchema = readText(receiverSchemaPath);
const receiver = readText(receiverPath);
const client = readText(clientPath);

assertCondition(
  docs.includes(
    "VOID_PUBLIC_AGENT_SERVICE_ORDER_SUBMISSION_V1",
  ),
  "docs adapter marker missing",
);
assertCondition(
  docs.includes(
    "VOID_AGENT_PAID_WORK_SUBMISSION_REQUEST_V1",
  ),
  "docs receiver marker missing",
);
assertCondition(
  docs.includes(
    "/__void/agents/paid-work/submissions/v1",
  ),
  "docs route missing",
);
assertCondition(
  workflow.includes(
    "prove_public_agent_service_order_submission_v1.ts",
  ),
  "workflow proof command missing",
);
assertCondition(
  /uses:\s*actions\/checkout@v4\s+with:\s+fetch-depth:\s*0/.test(
    workflow,
  ),
  "workflow must use full-history checkout",
);
assertCondition(
  receiverSchema.includes(
    '"const": "VOID_AGENT_PAID_WORK_SUBMISSION_REQUEST_V1"',
  ),
  "receiver schema marker changed",
);
assertCondition(
  receiverSchema.includes(
    '"$ref": "agent-paid-work-order-envelope-v1.schema.json"',
  ),
  "receiver schema work-order reference changed",
);
assertCondition(
  receiver.includes(
    "validateAgentPaidWorkOrderEnvelope",
  ),
  "receiver no longer validates the order envelope",
);
assertCondition(
  receiver.includes('const prefix = "Bearer "'),
  "receiver bearer authentication contract changed",
);
assertCondition(
  client.includes(
    'const SUBMISSION_PATH = "/__void/agents/paid-work/submissions/v1"',
  ),
  "public client route changed",
);
assertCondition(
  !/from\s+["']node:(?:http|https|net|tls|child_process)["']/.test(
    adapter,
  ),
  "adapter imports network or subprocess authority",
);
assertCondition(
  !/\bfetch\s*\(/.test(adapter),
  "adapter performs an HTTP request",
);
assertCondition(
  proof.includes("tampered receiver request"),
  "proof does not test tamper rejection",
);
assertCondition(
  canonicalJson(materialized.request)
    === canonicalJson(
      validateAgentPaidWorkSubmissionRequestV1(
        materialized.request,
      ),
    ),
  "receiver request validation changed canonical content",
);

console.log(
  JSON.stringify(
    {
      marker:
        "VOID_PUBLIC_AGENT_SERVICE_ORDER_SUBMISSION_ADAPTER_V1",
      input_marker:
        "VOID_PUBLIC_AGENT_SERVICE_ORDER_SUBMISSION_V1",
      output_marker:
        "VOID_AGENT_PAID_WORK_SUBMISSION_REQUEST_V1",
      route:
        "/__void/agents/paid-work/submissions/v1",
      service_id: materialized.service_id,
      capability_id: materialized.capability_id,
      catalog_fingerprint_sha256:
        materialized.catalog_fingerprint_sha256,
      work_order_id: materialized.work_order_id,
      submission_id: materialized.submission_id,
      request_sha256: materialized.request_sha256,
      payment_required_before_execution: true,
      external_side_effects_allowed: false,
      wallet_access_allowed: false,
      money_movement_allowed: false,
      http_submission: false,
      credential_change: false,
      provider_selection: false,
      quote_generation: false,
      payment_execution: false,
      work_dispatch: false,
      transaction_broadcast: false,
      runtime_mutation: false,
      service_mutation: false,
      proof: "green",
    },
    null,
    2,
  ),
);
