import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  canonicalJson,
  materializeAgentPaidWorkOrder,
  validateAgentPaidWorkOrderEnvelope,
  type AgentPaidWorkOrderDraft,
  type AgentPaidWorkOrderEnvelope,
} from "./agent_paid_work_order_envelope_v1.js";

export const PUBLIC_AGENT_SERVICE_ORDER_REQUEST_MARKER =
  "VOID_PUBLIC_AGENT_SERVICE_ORDER_REQUEST_V1" as const;
export const PUBLIC_AGENT_SERVICE_ORDER_REQUEST_VERSION = 1 as const;
export const PUBLIC_AGENT_SERVICES_CATALOG_ID =
  "void.public-agent-services.v1" as const;

const MAX_JSON_BYTES = 4 * 1024 * 1024;
const SERVICE_ID_PATTERN = /^void\.[a-z0-9.-]+\.v1$/;
const ISO_UTC_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
const AGENT_ID_PATTERN =
  /^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$/;
const OUTPUT_PATTERN =
  /^[A-Za-z0-9][A-Za-z0-9._:-]{0,255}$/;
const ASSET_PATTERN = /^[A-Z][A-Z0-9._:-]{0,31}$/;
const AMOUNT_PATTERN =
  /^(?:0|[1-9]\d{0,31})(?:\.\d{1,18})?$/;
const NONCE_PATTERN = /^[A-Za-z0-9._:-]{8,128}$/;

export type PublicAgentServiceOrderRequestV1 = {
  marker: typeof PUBLIC_AGENT_SERVICE_ORDER_REQUEST_MARKER;
  version: typeof PUBLIC_AGENT_SERVICE_ORDER_REQUEST_VERSION;
  catalog_id: typeof PUBLIC_AGENT_SERVICES_CATALOG_ID;
  catalog_fingerprint_sha256: string;
  service_id: string;
  created_at_utc: string;
  expires_at_utc: string;
  requester: {
    agent_id: string;
    callback_uri: string;
  };
  objective: string;
  input_refs: string[];
  expected_outputs: string[];
  commercial: {
    quote_asset: string;
    max_total: string;
  };
  execution_limits: {
    max_runtime_seconds: number;
    max_output_bytes: number;
  };
  nonce: string;
};

export type PublicAgentServiceOrderMaterializationV1 = {
  service_id: string;
  capability_id: string;
  catalog_fingerprint_sha256: string;
  order: AgentPaidWorkOrderEnvelope;
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

function requireString(
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

function requireStringArray(
  value: unknown,
  label: string,
  maximumItems: number,
  maximumLength: number,
): string[] {
  assertCondition(Array.isArray(value), `${label} must be an array`);
  assertCondition(
    value.length >= 1 && value.length <= maximumItems,
    `${label} item count is outside bounds`,
  );
  const result = value.map((child, index) =>
    requireString(child, `${label}[${index}]`, 1, maximumLength),
  );
  assertCondition(
    new Set(result).size === result.length,
    `${label} must contain unique values`,
  );
  return result;
}

function requireSafeInteger(
  value: unknown,
  label: string,
  minimum: number,
  maximum: number,
): number {
  assertCondition(
    Number.isSafeInteger(value),
    `${label} must be a safe integer`,
  );
  const numberValue = value as number;
  assertCondition(
    numberValue >= minimum && numberValue <= maximum,
    `${label} is outside bounds`,
  );
  return numberValue;
}

function requireIsoUtc(
  value: unknown,
  label: string,
): string {
  const text = requireString(value, label, 20, 20);
  assertCondition(
    ISO_UTC_PATTERN.test(text),
    `${label} must use YYYY-MM-DDTHH:MM:SSZ`,
  );
  assertCondition(
    Number.isFinite(Date.parse(text)),
    `${label} must be a real UTC timestamp`,
  );
  return text;
}

function requireHttpsCallback(
  value: unknown,
  label: string,
): string {
  const text = requireString(value, label, 12, 2048);
  assertCondition(
    /^https:\/\/[^\s#]+$/.test(text),
    `${label} must use lowercase HTTPS and contain no fragment`,
  );
  const parsed = new URL(text);
  assertCondition(
    parsed.protocol === "https:",
    `${label} must use HTTPS`,
  );
  assertCondition(
    !parsed.username && !parsed.password,
    `${label} must not contain credentials`,
  );
  assertCondition(!parsed.hash, `${label} must not contain a fragment`);
  return text;
}

function sortJson(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((child) => sortJson(child));
  }
  if (isRecord(value)) {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, sortJson(value[key])]),
    );
  }
  assertCondition(
    value === null
    || typeof value === "string"
    || typeof value === "number"
    || typeof value === "boolean",
    "catalog contains a non-JSON value",
  );
  return value;
}

function fingerprintJson(value: unknown): string {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(sortJson(value)))
    .digest("hex");
}

export function validatePublicAgentServiceOrderRequestV1(
  value: unknown,
): PublicAgentServiceOrderRequestV1 {
  const root = requireRecord(value, "service order request");
  assertExactKeys(
    root,
    [
      "marker",
      "version",
      "catalog_id",
      "catalog_fingerprint_sha256",
      "service_id",
      "created_at_utc",
      "expires_at_utc",
      "requester",
      "objective",
      "input_refs",
      "expected_outputs",
      "commercial",
      "execution_limits",
      "nonce",
    ],
    "service order request",
  );

  assertCondition(
    root.marker === PUBLIC_AGENT_SERVICE_ORDER_REQUEST_MARKER,
    "service order request marker mismatch",
  );
  assertCondition(
    root.version === PUBLIC_AGENT_SERVICE_ORDER_REQUEST_VERSION,
    "service order request version mismatch",
  );
  assertCondition(
    root.catalog_id === PUBLIC_AGENT_SERVICES_CATALOG_ID,
    "service order request catalog_id mismatch",
  );

  const catalogFingerprint = requireString(
    root.catalog_fingerprint_sha256,
    "catalog_fingerprint_sha256",
    64,
    64,
  );
  assertCondition(
    /^[0-9a-f]{64}$/.test(catalogFingerprint),
    "catalog_fingerprint_sha256 must be lowercase SHA-256",
  );

  const serviceId = requireString(root.service_id, "service_id", 8, 160);
  assertCondition(
    SERVICE_ID_PATTERN.test(serviceId),
    "service_id is not a valid VOID service identifier",
  );

  const createdAt = requireIsoUtc(root.created_at_utc, "created_at_utc");
  const expiresAt = requireIsoUtc(root.expires_at_utc, "expires_at_utc");
  assertCondition(
    Date.parse(expiresAt) > Date.parse(createdAt),
    "expires_at_utc must be later than created_at_utc",
  );

  const requester = requireRecord(root.requester, "requester");
  assertExactKeys(requester, ["agent_id", "callback_uri"], "requester");
  const agentId = requireString(
    requester.agent_id,
    "requester.agent_id",
    3,
    128,
  );
  assertCondition(
    AGENT_ID_PATTERN.test(agentId),
    "requester.agent_id contains unsupported characters",
  );
  const callbackUri = requireHttpsCallback(
    requester.callback_uri,
    "requester.callback_uri",
  );

  const objective = requireString(root.objective, "objective", 1, 4000);
  const inputRefs = requireStringArray(
    root.input_refs,
    "input_refs",
    64,
    2048,
  );
  const expectedOutputs = requireStringArray(
    root.expected_outputs,
    "expected_outputs",
    64,
    256,
  );
  for (const [index, output] of expectedOutputs.entries()) {
    assertCondition(
      OUTPUT_PATTERN.test(output),
      `expected_outputs[${index}] must be a machine-safe label`,
    );
  }

  const commercial = requireRecord(root.commercial, "commercial");
  assertExactKeys(
    commercial,
    ["quote_asset", "max_total"],
    "commercial",
  );
  const quoteAsset = requireString(
    commercial.quote_asset,
    "commercial.quote_asset",
    1,
    32,
  );
  assertCondition(
    ASSET_PATTERN.test(quoteAsset),
    "commercial.quote_asset is invalid",
  );
  const maxTotal = requireString(
    commercial.max_total,
    "commercial.max_total",
    1,
    51,
  );
  assertCondition(
    AMOUNT_PATTERN.test(maxTotal),
    "commercial.max_total must be a canonical decimal amount",
  );

  const executionLimits = requireRecord(
    root.execution_limits,
    "execution_limits",
  );
  assertExactKeys(
    executionLimits,
    ["max_runtime_seconds", "max_output_bytes"],
    "execution_limits",
  );
  const maxRuntimeSeconds = requireSafeInteger(
    executionLimits.max_runtime_seconds,
    "execution_limits.max_runtime_seconds",
    1,
    86400,
  );
  const maxOutputBytes = requireSafeInteger(
    executionLimits.max_output_bytes,
    "execution_limits.max_output_bytes",
    1,
    100000000,
  );

  const nonce = requireString(root.nonce, "nonce", 8, 128);
  assertCondition(
    NONCE_PATTERN.test(nonce),
    "nonce contains unsupported characters",
  );

  return {
    marker: PUBLIC_AGENT_SERVICE_ORDER_REQUEST_MARKER,
    version: PUBLIC_AGENT_SERVICE_ORDER_REQUEST_VERSION,
    catalog_id: PUBLIC_AGENT_SERVICES_CATALOG_ID,
    catalog_fingerprint_sha256: catalogFingerprint,
    service_id: serviceId,
    created_at_utc: createdAt,
    expires_at_utc: expiresAt,
    requester: {
      agent_id: agentId,
      callback_uri: callbackUri,
    },
    objective,
    input_refs: inputRefs,
    expected_outputs: expectedOutputs,
    commercial: {
      quote_asset: quoteAsset,
      max_total: maxTotal,
    },
    execution_limits: {
      max_runtime_seconds: maxRuntimeSeconds,
      max_output_bytes: maxOutputBytes,
    },
    nonce,
  };
}

function validateCatalog(
  value: unknown,
): Record<string, unknown> {
  const catalog = requireRecord(value, "catalog");
  assertCondition(
    catalog.schema === "void.public-agent-services-catalog.v1",
    "catalog schema mismatch",
  );
  assertCondition(
    catalog.marker === "VOID_PUBLIC_AGENT_SERVICES_CATALOG_V1",
    "catalog marker mismatch",
  );
  assertCondition(
    catalog.catalog_id === PUBLIC_AGENT_SERVICES_CATALOG_ID,
    "catalog_id mismatch",
  );
  assertCondition(
    catalog.catalog_status === "descriptive_only",
    "catalog must remain descriptive_only",
  );

  const committedFingerprint = requireString(
    catalog.catalog_fingerprint_sha256,
    "catalog.catalog_fingerprint_sha256",
    64,
    64,
  );
  const copy = { ...catalog };
  delete copy.catalog_fingerprint_sha256;
  assertCondition(
    fingerprintJson(copy) === committedFingerprint,
    "catalog fingerprint is not reproducible",
  );

  const honesty = requireRecord(catalog.honesty, "catalog.honesty");
  for (const key of [
    "external_paid_work_execution_available",
    "automatic_payment_execution_available",
    "wallet_access",
    "credential_issuance",
    "signing",
    "transaction_broadcast",
    "money_movement",
    "runtime_mutation",
    "service_mutation",
  ]) {
    assertCondition(
      honesty[key] === false,
      `catalog authority must remain false: ${key}`,
    );
  }

  assertCondition(
    Array.isArray(catalog.services),
    "catalog.services must be an array",
  );
  return catalog;
}

function capabilityIdForServiceId(serviceId: string): string {
  const match = /^void\.(.+)\.v1$/.exec(serviceId);
  assertCondition(Boolean(match), "service_id cannot map to capability_id");
  return match![1].replaceAll("-", "_");
}

function selectOrderableService(
  catalog: Record<string, unknown>,
  request: PublicAgentServiceOrderRequestV1,
): string {
  const services = catalog.services as unknown[];
  const service = services.find(
    (candidate) =>
      isRecord(candidate)
      && candidate.service_id === request.service_id,
  );
  assertCondition(
    isRecord(service),
    "requested service_id is not present in the catalog",
  );

  assertCondition(
    service.category === "verifiable_work",
    "requested service is not a verifiable-work service",
  );
  assertCondition(
    service.maturity === "contract_defined",
    "requested service is not contract-defined",
  );
  assertCondition(
    service.availability === "contract_only",
    "requested service is not available for contract-only ordering",
  );

  const capabilityId = capabilityIdForServiceId(request.service_id);
  const interfaceValue = requireRecord(
    service.interface,
    "catalog service interface",
  );
  assertCondition(
    interfaceValue.kind === "work_type",
    "requested service is not a work_type",
  );
  assertCondition(
    interfaceValue.method === null,
    "work_type service method must be null",
  );
  assertCondition(
    interfaceValue.path === capabilityId.replaceAll(".", "_"),
    "catalog work_type path does not match derived capability_id",
  );

  const pricing = requireRecord(service.pricing, "catalog service pricing");
  assertCondition(
    pricing.status === "not_published"
    || pricing.status === "quote_required",
    "requested service does not support quote-based ordering",
  );
  assertCondition(
    pricing.amount === null && pricing.currency === null,
    "catalog must not publish a binding amount for this service",
  );
  assertCondition(
    pricing.payment_execution_available === false,
    "catalog must not claim payment execution",
  );

  const execution = requireRecord(
    service.execution,
    "catalog service execution",
  );
  assertCondition(
    execution.external_available === false,
    "catalog must not claim external execution",
  );
  assertCondition(
    execution.mode === "contract_only",
    "requested service must remain contract_only",
  );
  assertCondition(
    execution.mutation_authority === false,
    "catalog must not grant mutation authority",
  );

  const verification = requireRecord(
    service.verification,
    "catalog service verification",
  );
  assertCondition(
    verification.deterministic_receipts === true,
    "requested service must support deterministic receipts",
  );

  assertCondition(
    request.catalog_fingerprint_sha256
      === catalog.catalog_fingerprint_sha256,
    "request catalog fingerprint does not match current catalog",
  );

  return capabilityId;
}

function draftFromRequest(
  request: PublicAgentServiceOrderRequestV1,
  capabilityId: string,
): AgentPaidWorkOrderDraft {
  return {
    marker: "VOID_AGENT_PAID_WORK_ORDER_ENVELOPE_V1",
    version: 1,
    created_at_utc: request.created_at_utc,
    expires_at_utc: request.expires_at_utc,
    requester: {
      agent_id: request.requester.agent_id,
      callback_uri: request.requester.callback_uri,
    },
    service: {
      capability_id: capabilityId,
      objective: request.objective,
      input_refs: [...request.input_refs],
      expected_outputs: [...request.expected_outputs],
    },
    commercial: {
      quote_asset: request.commercial.quote_asset,
      max_total: request.commercial.max_total,
      payment_required_before_execution: true,
    },
    execution_limits: {
      max_runtime_seconds:
        request.execution_limits.max_runtime_seconds,
      max_output_bytes:
        request.execution_limits.max_output_bytes,
      external_side_effects_allowed: false,
      wallet_access_allowed: false,
      money_movement_allowed: false,
    },
    nonce: request.nonce,
  };
}

export function materializePublicAgentServiceOrderV1(
  requestValue: unknown,
  catalogValue: unknown,
): PublicAgentServiceOrderMaterializationV1 {
  const request =
    validatePublicAgentServiceOrderRequestV1(requestValue);
  const catalog = validateCatalog(catalogValue);
  const capabilityId = selectOrderableService(catalog, request);
  const order = materializeAgentPaidWorkOrder(
    draftFromRequest(request, capabilityId),
  );
  validateAgentPaidWorkOrderEnvelope(order);

  return {
    service_id: request.service_id,
    capability_id: capabilityId,
    catalog_fingerprint_sha256:
      request.catalog_fingerprint_sha256,
    order,
  };
}

export function verifyPublicAgentServiceOrderV1(
  requestValue: unknown,
  catalogValue: unknown,
  orderValue: unknown,
): PublicAgentServiceOrderMaterializationV1 {
  const materialized = materializePublicAgentServiceOrderV1(
    requestValue,
    catalogValue,
  );
  validateAgentPaidWorkOrderEnvelope(orderValue);
  assertCondition(
    canonicalJson(orderValue) === canonicalJson(materialized.order),
    "order envelope does not match the catalog-bound request",
  );
  return materialized;
}

function readJson(file: string): unknown {
  const resolved = path.resolve(file);
  const stat = fs.lstatSync(resolved);
  assertCondition(!stat.isSymbolicLink(), "symlink input forbidden");
  assertCondition(stat.isFile(), "regular file input required");
  assertCondition(stat.size <= MAX_JSON_BYTES, "JSON input too large");
  return JSON.parse(fs.readFileSync(resolved, "utf8")) as unknown;
}

function usage(): never {
  return fail(
    [
      "usage:",
      "  tsx scripts/public_agent_service_order_adapter_v1.ts materialize <request.json> <order.json>",
      "  tsx scripts/public_agent_service_order_adapter_v1.ts verify <request.json> <order.json>",
    ].join("\n"),
  );
}

function main(): void {
  const [mode, requestPath, orderPath, ...extra] =
    process.argv.slice(2);
  assertCondition(extra.length === 0, "unexpected arguments");
  assertCondition(
    Boolean(requestPath && orderPath),
    "request and order paths are required",
  );

  const catalog = readJson(
    path.resolve("ops/public/agent-services-v1/catalog.json"),
  );
  const request = readJson(requestPath!);

  if (mode === "materialize") {
    const result = materializePublicAgentServiceOrderV1(
      request,
      catalog,
    );
    fs.writeFileSync(
      path.resolve(orderPath!),
      `${JSON.stringify(result.order, null, 2)}\n`,
      { encoding: "utf8", flag: "wx", mode: 0o600 },
    );
    console.log(`service_id=${result.service_id}`);
    console.log(`capability_id=${result.capability_id}`);
    console.log(
      `catalog_fingerprint_sha256=${result.catalog_fingerprint_sha256}`,
    );
    console.log(`work_order_id=${result.order.work_order_id}`);
    console.log(`output=${path.resolve(orderPath!)}`);
    console.log("payment_execution=false");
    console.log("transaction_broadcast=false");
    console.log("money_movement=false");
    return;
  }

  if (mode === "verify") {
    const order = readJson(orderPath!);
    const result = verifyPublicAgentServiceOrderV1(
      request,
      catalog,
      order,
    );
    console.log(`service_id=${result.service_id}`);
    console.log(`capability_id=${result.capability_id}`);
    console.log(`work_order_id=${result.order.work_order_id}`);
    console.log("catalog_bound_order=yes");
    console.log("payment_execution=false");
    console.log("transaction_broadcast=false");
    console.log("money_movement=false");
    return;
  }

  usage();
}

const invokedPath = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href
  : "";
if (import.meta.url === invokedPath) {
  main();
}
