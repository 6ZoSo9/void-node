import { createHash } from "node:crypto";

import {
  VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_CAPABILITY_FINGERPRINT_V1,
  VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_CAPABILITY_V1,
  createExternalOpportunityAgentIntakeCapabilityV1,
  validateExternalOpportunityAgentIntakeCapabilityV1,
  type ExternalOpportunityAgentIntakeCapabilityV1,
} from "./agent_intake_capability_v1.js";

export const VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_READONLY_DISCOVERY_ROUTE_V1 =
  "VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_READONLY_DISCOVERY_ROUTE_V1" as const;

export const VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_READONLY_DISCOVERY_ROUTE_SCHEMA_V1 =
  "void-external-opportunity-agent-intake-readonly-discovery-route-v1" as const;

export const VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_DISCOVERY_PATH_V1 =
  "/.well-known/void-agent-intake-capability-v1.json" as const;

export const VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_DISCOVERY_ETAG_V1 =
  `"sha256-${VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_CAPABILITY_FINGERPRINT_V1}"` as const;

export const VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_DISCOVERY_CACHE_CONTROL_V1 =
  "public, max-age=300, must-revalidate" as const;

export const VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_DISCOVERY_ALLOW_V1 =
  "GET, HEAD" as const;

export type ExternalOpportunityAgentIntakeDiscoveryMethodV1 =
  | "GET"
  | "HEAD"
  | string;

export interface ExternalOpportunityAgentIntakeDiscoveryRequestV1 {
  method: ExternalOpportunityAgentIntakeDiscoveryMethodV1;
  path: string;
  headers?: Record<string, string | string[] | undefined>;
}

export interface ExternalOpportunityAgentIntakeDiscoveryResponseV1 {
  status: 200 | 304 | 404 | 405 | 500;
  headers: Record<string, string>;
  body: string;
}

export interface ExternalOpportunityAgentIntakeDiscoveryContractV1 {
  schema:
    typeof VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_READONLY_DISCOVERY_ROUTE_SCHEMA_V1;
  marker:
    typeof VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_READONLY_DISCOVERY_ROUTE_V1;
  version: 1;
  route: {
    path: typeof VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_DISCOVERY_PATH_V1;
    methods: ["GET", "HEAD"];
    allow: typeof VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_DISCOVERY_ALLOW_V1;
    cors_origin: "*";
    content_type: "application/json; charset=utf-8";
    cache_control:
      typeof VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_DISCOVERY_CACHE_CONTROL_V1;
    etag: typeof VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_DISCOVERY_ETAG_V1;
    conditional_header: "If-None-Match";
    conditional_status: 304;
    unsupported_method_status: 405;
    noncanonical_path_status: 404;
  };
  capability_binding: {
    marker: typeof VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_CAPABILITY_V1;
    manifest_fingerprint_sha256:
      typeof VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_CAPABILITY_FINGERPRINT_V1;
    response_body_sha256: string;
  };
  behavior: {
    get_body: true;
    head_body: false;
    conditional_get: true;
    conditional_head: true;
    strong_etag: true;
    weak_if_none_match_accepted: true;
    wildcard_if_none_match_accepted: true;
    exact_path_only: true;
    pure_handler_contract: true;
    route_binding: false;
    network_listener: false;
    deployment: false;
  };
}

export interface ExternalOpportunityAgentIntakeDiscoveryContractValidationV1 {
  ok: boolean;
  errors: string[];
}

const CONTENT_TYPE_V1 = "application/json; charset=utf-8";
const CORS_ORIGIN_V1 = "*";
const EXPOSE_HEADERS_V1 = "ETag, Cache-Control, Content-Length, Allow";
const SHA256_V1 = /^[0-9a-f]{64}$/;

function sha256V1(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function normalizeMethodV1(method: unknown): string {
  if (typeof method !== "string") {
    return "";
  }
  return method.trim().toUpperCase();
}

function headerValuesV1(
  headers: Record<string, string | string[] | undefined> | undefined,
  name: string,
): string[] {
  if (headers === undefined) {
    return [];
  }

  const target = name.toLowerCase();
  const values: string[] = [];

  for (const [rawName, rawValue] of Object.entries(headers)) {
    if (rawName.toLowerCase() !== target || rawValue === undefined) {
      continue;
    }

    if (Array.isArray(rawValue)) {
      for (const value of rawValue) {
        values.push(value);
      }
    } else {
      values.push(rawValue);
    }
  }

  return values;
}

function normalizeEntityTagForWeakComparisonV1(value: string): string {
  const trimmed = value.trim();
  if (trimmed.startsWith("W/")) {
    return trimmed.slice(2).trim();
  }
  return trimmed;
}

function ifNoneMatchMatchesV1(
  headers: Record<string, string | string[] | undefined> | undefined,
): boolean {
  const current = normalizeEntityTagForWeakComparisonV1(
    VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_DISCOVERY_ETAG_V1,
  );

  for (const headerValue of headerValuesV1(headers, "if-none-match")) {
    for (const candidate of headerValue.split(",")) {
      const trimmed = candidate.trim();
      if (trimmed === "*") {
        return true;
      }

      if (normalizeEntityTagForWeakComparisonV1(trimmed) === current) {
        return true;
      }
    }
  }

  return false;
}

function commonHeadersV1(): Record<string, string> {
  return {
    "access-control-allow-origin": CORS_ORIGIN_V1,
    "access-control-allow-methods":
      VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_DISCOVERY_ALLOW_V1,
    "access-control-expose-headers": EXPOSE_HEADERS_V1,
    "cache-control":
      VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_DISCOVERY_CACHE_CONTROL_V1,
    etag: VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_DISCOVERY_ETAG_V1,
  };
}

function jsonResponseV1(
  status: 200 | 404 | 405 | 500,
  payload: unknown,
  headOnly = false,
  extraHeaders: Record<string, string> = {},
): ExternalOpportunityAgentIntakeDiscoveryResponseV1 {
  const body = `${JSON.stringify(payload)}\n`;
  return {
    status,
    headers: {
      ...commonHeadersV1(),
      "content-type": CONTENT_TYPE_V1,
      "content-length": String(Buffer.byteLength(body, "utf8")),
      ...extraHeaders,
    },
    body: headOnly ? "" : body,
  };
}

function errorPayloadV1(
  status: 404 | 405 | 500,
  code: "not_found" | "method_not_allowed" | "manifest_invalid",
): Record<string, unknown> {
  return {
    schema: VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_READONLY_DISCOVERY_ROUTE_SCHEMA_V1,
    marker: VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_READONLY_DISCOVERY_ROUTE_V1,
    version: 1,
    status,
    code,
    path: VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_DISCOVERY_PATH_V1,
  };
}

export function serializeExternalOpportunityAgentIntakeCapabilityV1(
  capability: ExternalOpportunityAgentIntakeCapabilityV1 =
    createExternalOpportunityAgentIntakeCapabilityV1(),
): string {
  return `${JSON.stringify(capability)}\n`;
}

export function createExternalOpportunityAgentIntakeDiscoveryContractV1():
  ExternalOpportunityAgentIntakeDiscoveryContractV1 {
  const body = serializeExternalOpportunityAgentIntakeCapabilityV1();

  return {
    schema:
      VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_READONLY_DISCOVERY_ROUTE_SCHEMA_V1,
    marker:
      VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_READONLY_DISCOVERY_ROUTE_V1,
    version: 1,
    route: {
      path: VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_DISCOVERY_PATH_V1,
      methods: ["GET", "HEAD"],
      allow: VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_DISCOVERY_ALLOW_V1,
      cors_origin: CORS_ORIGIN_V1,
      content_type: CONTENT_TYPE_V1,
      cache_control:
        VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_DISCOVERY_CACHE_CONTROL_V1,
      etag: VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_DISCOVERY_ETAG_V1,
      conditional_header: "If-None-Match",
      conditional_status: 304,
      unsupported_method_status: 405,
      noncanonical_path_status: 404,
    },
    capability_binding: {
      marker: VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_CAPABILITY_V1,
      manifest_fingerprint_sha256:
        VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_CAPABILITY_FINGERPRINT_V1,
      response_body_sha256: sha256V1(body),
    },
    behavior: {
      get_body: true,
      head_body: false,
      conditional_get: true,
      conditional_head: true,
      strong_etag: true,
      weak_if_none_match_accepted: true,
      wildcard_if_none_match_accepted: true,
      exact_path_only: true,
      pure_handler_contract: true,
      route_binding: false,
      network_listener: false,
      deployment: false,
    },
  };
}

export function validateExternalOpportunityAgentIntakeDiscoveryContractV1(
  value: unknown,
): ExternalOpportunityAgentIntakeDiscoveryContractValidationV1 {
  const errors: string[] = [];

  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return { ok: false, errors: ["contract must be an object"] };
  }

  const contract = value as Partial<
    ExternalOpportunityAgentIntakeDiscoveryContractV1
  >;
  const expected = createExternalOpportunityAgentIntakeDiscoveryContractV1();

  if (contract.schema !== expected.schema) {
    errors.push("schema must match the V1 discovery contract");
  }
  if (contract.marker !== expected.marker) {
    errors.push("marker must match the V1 discovery contract");
  }
  if (contract.version !== 1) {
    errors.push("version must equal 1");
  }

  const actualJson = JSON.stringify(contract);
  const expectedJson = JSON.stringify(expected);
  if (actualJson !== expectedJson) {
    errors.push("contract must match the deterministic V1 discovery contract");
  }

  const responseBodySha =
    contract.capability_binding?.response_body_sha256 ?? "";
  if (!SHA256_V1.test(responseBodySha)) {
    errors.push("response_body_sha256 must be a lowercase SHA-256");
  }

  return {
    ok: errors.length === 0,
    errors,
  };
}

export function handleExternalOpportunityAgentIntakeDiscoveryV1(
  request: ExternalOpportunityAgentIntakeDiscoveryRequestV1,
): ExternalOpportunityAgentIntakeDiscoveryResponseV1 {
  if (
    typeof request.path !== "string" ||
    request.path !==
      VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_DISCOVERY_PATH_V1
  ) {
    return jsonResponseV1(404, errorPayloadV1(404, "not_found"));
  }

  const method = normalizeMethodV1(request.method);
  if (method !== "GET" && method !== "HEAD") {
    return jsonResponseV1(
      405,
      errorPayloadV1(405, "method_not_allowed"),
      false,
      {
        allow: VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_DISCOVERY_ALLOW_V1,
      },
    );
  }

  const capability = createExternalOpportunityAgentIntakeCapabilityV1();
  const validation =
    validateExternalOpportunityAgentIntakeCapabilityV1(capability);

  if (
    !validation.ok ||
    validation.fingerprint_sha256 !==
      VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_CAPABILITY_FINGERPRINT_V1
  ) {
    return jsonResponseV1(
      500,
      errorPayloadV1(500, "manifest_invalid"),
      method === "HEAD",
    );
  }

  const body = serializeExternalOpportunityAgentIntakeCapabilityV1(capability);
  const headers: Record<string, string> = {
    ...commonHeadersV1(),
    "content-type": CONTENT_TYPE_V1,
    "content-length": String(Buffer.byteLength(body, "utf8")),
  };

  if (ifNoneMatchMatchesV1(request.headers)) {
    return {
      status: 304,
      headers,
      body: "",
    };
  }

  return {
    status: 200,
    headers,
    body: method === "HEAD" ? "" : body,
  };
}
