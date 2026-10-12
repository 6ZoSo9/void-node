import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  canonicalJson,
  validateAgentPaidWorkOrderEnvelope,
  type AgentPaidWorkOrderEnvelope,
} from "./agent_paid_work_order_envelope_v1.js";
import {
  materializePublicAgentServiceOrderV1,
  validatePublicAgentServiceOrderRequestV1,
  verifyPublicAgentServiceOrderV1,
  type PublicAgentServiceOrderRequestV1,
} from "./public_agent_service_order_adapter_v1.js";

export const PUBLIC_AGENT_SERVICE_ORDER_SUBMISSION_MARKER =
  "VOID_PUBLIC_AGENT_SERVICE_ORDER_SUBMISSION_V1" as const;
export const PUBLIC_AGENT_SERVICE_ORDER_SUBMISSION_VERSION = 1 as const;
export const AGENT_PAID_WORK_SUBMISSION_REQUEST_MARKER =
  "VOID_AGENT_PAID_WORK_SUBMISSION_REQUEST_V1" as const;
export const AGENT_PAID_WORK_SUBMISSION_REQUEST_VERSION = 1 as const;
export const PUBLIC_AGENT_SERVICE_SUBMISSION_ID_PREFIX =
  "voidawsr1_" as const;
export const AGENT_PAID_WORK_SUBMISSION_ROUTE =
  "/__void/agents/paid-work/submissions/v1" as const;

const MAX_JSON_BYTES = 4 * 1024 * 1024;
const NONCE_PATTERN = /^[A-Za-z0-9._:-]{8,128}$/;
const SUBMISSION_ID_PATTERN = /^voidawsr1_[0-9a-f]{64}$/;

export type PublicAgentServiceOrderSubmissionV1 = {
  marker: typeof PUBLIC_AGENT_SERVICE_ORDER_SUBMISSION_MARKER;
  version: typeof PUBLIC_AGENT_SERVICE_ORDER_SUBMISSION_VERSION;
  submission_nonce: string;
  order_request: PublicAgentServiceOrderRequestV1;
};

export type AgentPaidWorkSubmissionRequestV1 = {
  marker: typeof AGENT_PAID_WORK_SUBMISSION_REQUEST_MARKER;
  version: typeof AGENT_PAID_WORK_SUBMISSION_REQUEST_VERSION;
  submission_id: string;
  work_order: AgentPaidWorkOrderEnvelope;
};

export type PublicAgentServiceOrderSubmissionMaterializationV1 = {
  route: typeof AGENT_PAID_WORK_SUBMISSION_ROUTE;
  service_id: string;
  capability_id: string;
  catalog_fingerprint_sha256: string;
  work_order_id: string;
  submission_id: string;
  request_sha256: string;
  request: AgentPaidWorkSubmissionRequestV1;
};

function fail(message: string): never {
  throw new Error(message);
}

function assertCondition(
  condition: unknown,
  message: string,
): asserts condition {
  if (!condition) fail(message);
}

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return Boolean(
    value
    && typeof value === "object"
    && !Array.isArray(value),
  );
}

function requireRecord(
  value: unknown,
  label: string,
): Record<string, unknown> {
  assertCondition(isRecord(value), `${label} must be an object`);
  return value;
}

function assertExactKeys(
  value: Record<string, unknown>,
  keys: readonly string[],
  label: string,
): void {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  assertCondition(
    JSON.stringify(actual) === JSON.stringify(expected),
    `${label} must contain exactly: ${expected.join(", ")}`,
  );
}

function requireTrimmedString(
  value: unknown,
  label: string,
  minimum: number,
  maximum: number,
): string {
  assertCondition(typeof value === "string", `${label} must be a string`);
  assertCondition(value === value.trim(), `${label} must be trimmed`);
  assertCondition(
    value.length >= minimum && value.length <= maximum,
    `${label} length is outside bounds`,
  );
  return value;
}

function sha256Text(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function validatePublicAgentServiceOrderSubmissionV1(
  value: unknown,
): PublicAgentServiceOrderSubmissionV1 {
  const root = requireRecord(value, "service order submission");
  assertExactKeys(
    root,
    [
      "marker",
      "version",
      "submission_nonce",
      "order_request",
    ],
    "service order submission",
  );

  assertCondition(
    root.marker === PUBLIC_AGENT_SERVICE_ORDER_SUBMISSION_MARKER,
    "service order submission marker mismatch",
  );
  assertCondition(
    root.version === PUBLIC_AGENT_SERVICE_ORDER_SUBMISSION_VERSION,
    "service order submission version mismatch",
  );

  const submissionNonce = requireTrimmedString(
    root.submission_nonce,
    "submission_nonce",
    8,
    128,
  );
  assertCondition(
    NONCE_PATTERN.test(submissionNonce),
    "submission_nonce contains unsupported characters",
  );

  const orderRequest = validatePublicAgentServiceOrderRequestV1(
    root.order_request,
  );

  return {
    marker: PUBLIC_AGENT_SERVICE_ORDER_SUBMISSION_MARKER,
    version: PUBLIC_AGENT_SERVICE_ORDER_SUBMISSION_VERSION,
    submission_nonce: submissionNonce,
    order_request: orderRequest,
  };
}

function computeSubmissionId(
  input: PublicAgentServiceOrderSubmissionV1,
  order: AgentPaidWorkOrderEnvelope,
): string {
  const identity = {
    marker: PUBLIC_AGENT_SERVICE_ORDER_SUBMISSION_MARKER,
    version: PUBLIC_AGENT_SERVICE_ORDER_SUBMISSION_VERSION,
    submission_nonce: input.submission_nonce,
    catalog_fingerprint_sha256:
      input.order_request.catalog_fingerprint_sha256,
    service_id: input.order_request.service_id,
    work_order_id: order.work_order_id,
  };
  return (
    PUBLIC_AGENT_SERVICE_SUBMISSION_ID_PREFIX
    + sha256Text(canonicalJson(identity))
  );
}

export function validateAgentPaidWorkSubmissionRequestV1(
  value: unknown,
): AgentPaidWorkSubmissionRequestV1 {
  const root = requireRecord(value, "submission request");
  assertExactKeys(
    root,
    [
      "marker",
      "version",
      "submission_id",
      "work_order",
    ],
    "submission request",
  );

  assertCondition(
    root.marker === AGENT_PAID_WORK_SUBMISSION_REQUEST_MARKER,
    "submission request marker mismatch",
  );
  assertCondition(
    root.version === AGENT_PAID_WORK_SUBMISSION_REQUEST_VERSION,
    "submission request version mismatch",
  );

  const submissionId = requireTrimmedString(
    root.submission_id,
    "submission_id",
    3,
    128,
  );
  assertCondition(
    SUBMISSION_ID_PATTERN.test(submissionId),
    "submission_id must use voidawsr1_ plus lowercase SHA-256",
  );

  validateAgentPaidWorkOrderEnvelope(
    root.work_order,
  );
  const workOrder =
    root.work_order as AgentPaidWorkOrderEnvelope;

  return {
    marker: AGENT_PAID_WORK_SUBMISSION_REQUEST_MARKER,
    version: AGENT_PAID_WORK_SUBMISSION_REQUEST_VERSION,
    submission_id: submissionId,
    work_order: workOrder,
  };
}

export function materializePublicAgentServiceOrderSubmissionV1(
  inputValue: unknown,
  catalogValue: unknown,
): PublicAgentServiceOrderSubmissionMaterializationV1 {
  const input = validatePublicAgentServiceOrderSubmissionV1(inputValue);
  const orderMaterialization = materializePublicAgentServiceOrderV1(
    input.order_request,
    catalogValue,
  );
  const workOrder = orderMaterialization.order;
  const submissionId = computeSubmissionId(input, workOrder);
  const request: AgentPaidWorkSubmissionRequestV1 = {
    marker: AGENT_PAID_WORK_SUBMISSION_REQUEST_MARKER,
    version: AGENT_PAID_WORK_SUBMISSION_REQUEST_VERSION,
    submission_id: submissionId,
    work_order: workOrder,
  };
  validateAgentPaidWorkSubmissionRequestV1(request);
  const requestSha256 = sha256Text(canonicalJson(request));

  return {
    route: AGENT_PAID_WORK_SUBMISSION_ROUTE,
    service_id: orderMaterialization.service_id,
    capability_id: orderMaterialization.capability_id,
    catalog_fingerprint_sha256:
      orderMaterialization.catalog_fingerprint_sha256,
    work_order_id: workOrder.work_order_id,
    submission_id: submissionId,
    request_sha256: requestSha256,
    request,
  };
}

export function verifyPublicAgentServiceOrderSubmissionV1(
  inputValue: unknown,
  catalogValue: unknown,
  requestValue: unknown,
): PublicAgentServiceOrderSubmissionMaterializationV1 {
  const expected = materializePublicAgentServiceOrderSubmissionV1(
    inputValue,
    catalogValue,
  );
  const request = validateAgentPaidWorkSubmissionRequestV1(
    requestValue,
  );
  verifyPublicAgentServiceOrderV1(
    validatePublicAgentServiceOrderSubmissionV1(inputValue)
      .order_request,
    catalogValue,
    request.work_order,
  );
  assertCondition(
    canonicalJson(request) === canonicalJson(expected.request),
    "submission request does not match the catalog-bound order input",
  );
  return expected;
}

function readJson(file: string): unknown {
  const resolved = path.resolve(file);
  const fileStat = fs.lstatSync(resolved);
  assertCondition(!fileStat.isSymbolicLink(), "symlink input forbidden");
  assertCondition(fileStat.isFile(), "regular file input required");
  assertCondition(fileStat.size <= MAX_JSON_BYTES, "JSON input too large");
  return JSON.parse(fs.readFileSync(resolved, "utf8")) as unknown;
}

function usage(): never {
  return fail(
    [
      "usage:",
      "  tsx scripts/public_agent_service_order_submission_v1.ts materialize <input.json> <submission-request.json>",
      "  tsx scripts/public_agent_service_order_submission_v1.ts verify <input.json> <submission-request.json>",
    ].join("\n"),
  );
}

function main(): void {
  const [mode, inputPath, requestPath, ...extra] =
    process.argv.slice(2);
  assertCondition(extra.length === 0, "unexpected arguments");
  assertCondition(
    Boolean(inputPath && requestPath),
    "input and submission-request paths are required",
  );

  const catalog = readJson(
    "ops/public/agent-services-v1/catalog.json",
  );
  const input = readJson(inputPath!);

  if (mode === "materialize") {
    const result = materializePublicAgentServiceOrderSubmissionV1(
      input,
      catalog,
    );
    fs.writeFileSync(
      path.resolve(requestPath!),
      `${JSON.stringify(result.request, null, 2)}\n`,
      { encoding: "utf8", flag: "wx", mode: 0o600 },
    );
    console.log(`route=${result.route}`);
    console.log(`service_id=${result.service_id}`);
    console.log(`capability_id=${result.capability_id}`);
    console.log(`work_order_id=${result.work_order_id}`);
    console.log(`submission_id=${result.submission_id}`);
    console.log(`request_sha256=${result.request_sha256}`);
    console.log(`output=${path.resolve(requestPath!)}`);
    console.log("http_submission=false");
    console.log("credential_change=false");
    console.log("provider_selection=false");
    console.log("quote_generation=false");
    console.log("payment_execution=false");
    console.log("work_dispatch=false");
    console.log("transaction_broadcast=false");
    console.log("money_movement=false");
    return;
  }

  if (mode === "verify") {
    const request = readJson(requestPath!);
    const result = verifyPublicAgentServiceOrderSubmissionV1(
      input,
      catalog,
      request,
    );
    console.log(`route=${result.route}`);
    console.log(`service_id=${result.service_id}`);
    console.log(`capability_id=${result.capability_id}`);
    console.log(`work_order_id=${result.work_order_id}`);
    console.log(`submission_id=${result.submission_id}`);
    console.log(`request_sha256=${result.request_sha256}`);
    console.log("catalog_bound_submission_request=yes");
    console.log("http_submission=false");
    console.log("credential_change=false");
    console.log("provider_selection=false");
    console.log("quote_generation=false");
    console.log("payment_execution=false");
    console.log("work_dispatch=false");
    console.log("transaction_broadcast=false");
    console.log("money_movement=false");
    return;
  }

  usage();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
