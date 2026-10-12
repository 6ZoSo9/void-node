import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  VOID_AI_AGENT_DISCOVERY_RUNTIME_ROUTE_V1,
  mountAiAgentDiscoveryRuntimeRouteV1,
  voidAiAgentDiscoveryRuntimeRoutesV1,
} from "../src/ai-agent-discovery-runtime-route-v1.js";

type JsonPrimitive = string | number | boolean | null;
type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | { [key: string]: JsonValue };

type RegisteredHandler = {
  method: "GET" | "ALL";
  route: string;
  handler: (req: unknown, res: FakeResponse) => unknown;
};

class FakeResponse {
  statusCode = 200;
  headers = new Map<string, string>();
  body: unknown = undefined;
  bodyKind: "none" | "json" | "send" = "none";

  status(code: number): FakeResponse {
    this.statusCode = code;
    return this;
  }

  set(field: string, value: string): FakeResponse {
    this.headers.set(field.toLowerCase(), value);
    return this;
  }

  json(payload: unknown): unknown {
    this.body = payload;
    this.bodyKind = "json";
    return payload;
  }

  send(payload: string | Buffer): unknown {
    this.body = payload;
    this.bodyKind = "send";
    return payload;
  }
}

function assertCondition(
  condition: unknown,
  message: string,
): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function canonicalize(value: unknown): JsonValue {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return value as JsonPrimitive;
  }

  if (typeof value === "number") {
    assertCondition(
      Number.isFinite(value) && Number.isSafeInteger(value),
      "canonical JSON numbers must be finite safe integers",
    );
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }

  assertCondition(
    typeof value === "object" && value !== null,
    "canonical JSON value must be JSON-compatible",
  );

  const record = value as Record<string, unknown>;
  const result: Record<string, JsonValue> = {};
  for (const key of Object.keys(record).sort()) {
    const child = record[key];
    assertCondition(
      child !== undefined,
      "canonical JSON rejects undefined",
    );
    result[key] = canonicalize(child);
  }
  return result;
}

function canonicalJson(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

function readText(relativePath: string): string {
  return readFileSync(resolve(relativePath), "utf8");
}

function readJson(relativePath: string): unknown {
  return JSON.parse(readText(relativePath)) as unknown;
}

function requireRecord(
  value: unknown,
  label: string,
): Record<string, unknown> {
  assertCondition(
    typeof value === "object" &&
      value !== null &&
      !Array.isArray(value),
    `${label} must be an object`,
  );
  return value as Record<string, unknown>;
}

function requireArray(
  value: unknown,
  label: string,
): unknown[] {
  assertCondition(Array.isArray(value), `${label} must be an array`);
  return value;
}

function invokeGet(
  registrations: RegisteredHandler[],
  route: string,
): FakeResponse {
  const matches = registrations.filter(
    (registration) =>
      registration.method === "GET" &&
      registration.route === route,
  );
  assertCondition(
    matches.length === 1,
    `expected exactly one GET handler for ${route}, found ${matches.length}`,
  );

  const response = new FakeResponse();
  matches[0].handler({}, response);
  return response;
}

function assertExactFileResponse(
  registrations: RegisteredHandler[],
  route: string,
  relativePath: string,
): Record<string, unknown> {
  const expected = readText(relativePath);
  const response = invokeGet(registrations, route);

  assertCondition(
    response.statusCode === 200,
    `${route} status must be 200`,
  );
  assertCondition(
    response.headers.get("cache-control") === "no-store",
    `${route} must use Cache-Control: no-store`,
  );
  assertCondition(
    response.headers.get("content-type") ===
      "application/json; charset=utf-8",
    `${route} content type mismatch`,
  );
  assertCondition(
    response.bodyKind === "send",
    `${route} must send exact file text`,
  );
  assertCondition(
    typeof response.body === "string",
    `${route} response body must be a string`,
  );
  assertCondition(
    response.body === expected,
    `${route} did not serve exact repository bytes`,
  );

  return requireRecord(
    JSON.parse(response.body) as unknown,
    `${route} JSON`,
  );
}

const registrations: RegisteredHandler[] = [];

const fakeApp = {
  get(
    route: string,
    handler: RegisteredHandler["handler"],
  ): void {
    registrations.push({
      method: "GET",
      route,
      handler,
    });
  },

  all(
    route: string,
    handler: RegisteredHandler["handler"],
  ): void {
    registrations.push({
      method: "ALL",
      route,
      handler,
    });
  },
};

mountAiAgentDiscoveryRuntimeRouteV1(fakeApp);
const registrationCountAfterFirstMount = registrations.length;
mountAiAgentDiscoveryRuntimeRouteV1(fakeApp);

assertCondition(
  registrations.length === registrationCountAfterFirstMount,
  "router mount must be idempotent",
);

const advertisedRoutePairs = [
  [
    "/public-node/agents/discovery-v1.json",
    "public/public-node/agents/discovery-v1.json",
  ],
  [
    "/public-node/agents/discovery-v1.schema.json",
    "public/public-node/agents/discovery-v1.schema.json",
  ],
  [
    "/public-node/agents/paid-work-v1.json",
    "public/public-node/agents/paid-work-v1.json",
  ],
  [
    "/public-node/agents/paid-work-v1.schema.json",
    "public/public-node/agents/paid-work-v1.schema.json",
  ],
  [
    "/.well-known/void-agent-discovery.json",
    "public/.well-known/void-agent-discovery.json",
  ],
  [
    "/.well-known/void-agent-discovery.schema.json",
    "public/.well-known/void-agent-discovery.schema.json",
  ],
  [
    "/public-node/agents/capabilities-v1.json",
    "public/public-node/agents/capabilities-v1.json",
  ],
  [
    "/public-node/agents/capabilities-v1.schema.json",
    "public/public-node/agents/capabilities-v1.schema.json",
  ],
  [
    "/.well-known/void-agent-capabilities.json",
    "public/.well-known/void-agent-capabilities.json",
  ],
  [
    "/.well-known/void-agent-capabilities.schema.json",
    "public/.well-known/void-agent-capabilities.schema.json",
  ],
  [
    "/.well-known/void-network-authenticity.json",
    "public/.well-known/void-network-authenticity.json",
  ],
  [
    "/.well-known/void-network-authenticity.schema.json",
    "public/.well-known/void-network-authenticity.schema.json",
  ],
] as const;

assertCondition(
  voidAiAgentDiscoveryRuntimeRoutesV1.length === 13,
  "AI-agent discovery runtime route table must contain thirteen routes",
);

for (const [route, relativePath] of advertisedRoutePairs) {
  const tableMatches = voidAiAgentDiscoveryRuntimeRoutesV1.filter(
    (entry) =>
      entry.route === route &&
      entry.relativePath === relativePath,
  );
  assertCondition(
    tableMatches.length === 1,
    `route table binding mismatch for ${route}`,
  );
}

const canonical = assertExactFileResponse(
  registrations,
  "/public-node/agents/discovery-v1.json",
  "public/public-node/agents/discovery-v1.json",
);
const canonicalSchema = assertExactFileResponse(
  registrations,
  "/public-node/agents/discovery-v1.schema.json",
  "public/public-node/agents/discovery-v1.schema.json",
);
const runtimeDiscovery = assertExactFileResponse(
  registrations,
  "/public-node/agents/paid-work-v1.json",
  "public/public-node/agents/paid-work-v1.json",
);
const runtimeSchema = assertExactFileResponse(
  registrations,
  "/public-node/agents/paid-work-v1.schema.json",
  "public/public-node/agents/paid-work-v1.schema.json",
);

assertCondition(
  canonical.marker === "VOID_AI_AGENT_DISCOVERY_CONTRACT_WALL_V1",
  "canonical discovery marker mismatch",
);
assertCondition(
  canonical.protocol === "void-agent-discovery/1",
  "canonical discovery protocol mismatch",
);

const canonicalAuthority = requireRecord(
  canonical.authority,
  "canonical authority",
);
assertCondition(
  canonicalAuthority.default === "read_only",
  "canonical default authority must be read_only",
);
assertCondition(
  canonicalAuthority.mutation_authority_granted === false,
  "canonical discovery must not grant mutation authority",
);
assertCondition(
  JSON.stringify(canonicalAuthority.granted_http_methods) ===
    JSON.stringify(["GET", "HEAD"]),
  "canonical discovery must grant only GET and HEAD",
);

const entrypoints = requireRecord(
  canonical.entrypoints,
  "canonical entrypoints",
);
assertCondition(
  entrypoints.paid_work_protocol ===
    "/public-node/agents/paid-work-v1.json",
  "canonical paid-work entrypoint mismatch",
);

const capabilities = requireArray(
  canonical.capabilities,
  "canonical capabilities",
).map((value, index) =>
  requireRecord(value, `canonical capability ${index}`),
);
const paidWorkCapabilities = capabilities.filter(
  (capability) =>
    capability.id === "paid_work_protocol_discovery",
);
assertCondition(
  paidWorkCapabilities.length === 1,
  "canonical discovery must contain one paid-work capability",
);
assertCondition(
  paidWorkCapabilities[0].state === "live",
  "paid-work discovery capability must be live",
);
assertCondition(
  paidWorkCapabilities[0].authority === "read_only",
  "paid-work discovery capability must remain read_only",
);
assertCondition(
  paidWorkCapabilities[0].discovery ===
    "/public-node/agents/paid-work-v1.json",
  "paid-work discovery capability route mismatch",
);

const agentOnboarding = requireRecord(
  canonical.agent_onboarding,
  "canonical agent_onboarding",
);
const onboardingSteps = requireArray(
  agentOnboarding.steps,
  "canonical onboarding steps",
).map((value, index) =>
  requireRecord(value, `canonical onboarding step ${index}`),
);

const paidWorkSteps = onboardingSteps.filter(
  (step) =>
    step.path === "/public-node/agents/paid-work-v1.json",
);
assertCondition(
  paidWorkSteps.length === 1,
  "canonical onboarding must contain one paid-work fetch step",
);
assertCondition(
  paidWorkSteps[0].action === "fetch" &&
    paidWorkSteps[0].method === "GET" &&
    paidWorkSteps[0].required === false,
  "paid-work onboarding step must be optional GET-only discovery",
);

for (let index = 0; index < onboardingSteps.length; index += 1) {
  assertCondition(
    onboardingSteps[index].order === index + 1,
    "canonical onboarding order must remain contiguous",
  );
}

assertCondition(
  canonicalSchema.additionalProperties === false,
  "canonical discovery schema must remain closed",
);
const canonicalSchemaProperties = requireRecord(
  canonicalSchema.properties,
  "canonical schema properties",
);
const entrypointsSchema = requireRecord(
  canonicalSchemaProperties.entrypoints,
  "canonical entrypoints schema",
);
assertCondition(
  requireArray(
    entrypointsSchema.required,
    "canonical entrypoints required",
  ).includes("paid_work_protocol"),
  "canonical schema must require paid_work_protocol",
);

const canonicalCapabilitiesSchema = requireRecord(
  canonicalSchemaProperties.capabilities,
  "canonical capabilities schema",
);
assertCondition(
  canonicalCapabilitiesSchema.minContains === 1 &&
    canonicalCapabilitiesSchema.maxContains === 1,
  "canonical schema must require exactly one paid-work capability",
);

const runtimeMarker = runtimeDiscovery.marker;
assertCondition(
  runtimeMarker === "VOID_AGENT_PAID_WORK_RUNTIME_DISCOVERY_V1",
  "runtime discovery marker mismatch",
);
assertCondition(
  runtimeDiscovery.protocol ===
    "void-agent-paid-work-runtime-discovery/1",
  "runtime discovery protocol mismatch",
);
assertCondition(
  runtimeDiscovery.status ===
    "read_only_protocol_discovery_live",
  "runtime discovery status mismatch",
);

const runtimeAuthority = requireRecord(
  runtimeDiscovery.authority,
  "runtime authority",
);
assertCondition(
  runtimeAuthority.default === "read_only",
  "runtime discovery default authority must be read_only",
);
assertCondition(
  runtimeAuthority.mutation_authority_granted === false,
  "runtime discovery must not grant mutation authority",
);
assertCondition(
  runtimeAuthority.credentials_required === false,
  "runtime discovery must not require credentials",
);
assertCondition(
  JSON.stringify(runtimeAuthority.granted_http_methods) ===
    JSON.stringify(["GET", "HEAD"]),
  "runtime discovery must grant only GET and HEAD",
);

const repositoryBinding = requireRecord(
  runtimeDiscovery.repository_binding,
  "runtime repository binding",
);
const sourceManifestText = readText(
  "docs/public/agent-paid-work-public-discovery-v1.json",
);
const sourceManifest = requireRecord(
  JSON.parse(sourceManifestText) as unknown,
  "source paid-work manifest",
);

assertCondition(
  repositoryBinding.manifest_id ===
    sourceManifest.public_discovery_manifest_id,
  "runtime repository manifest ID mismatch",
);
assertCondition(
  repositoryBinding.manifest_sha256 ===
    createHash("sha256")
      .update(sourceManifestText)
      .digest("hex"),
  "runtime repository manifest SHA-256 mismatch",
);
assertCondition(
  repositoryBinding.stage_count === 12 &&
    repositoryBinding.artifact_count === 60,
  "runtime repository stage or artifact count mismatch",
);
assertCondition(
  repositoryBinding
    .embedded_manifest_is_immutable_repository_snapshot === true,
  "runtime must identify embedded repository snapshot as immutable",
);
assertCondition(
  repositoryBinding
    .runtime_adapter_does_not_rewrite_repository_snapshot === true,
  "runtime adapter must not rewrite repository snapshot",
);
assertCondition(
  canonicalJson(runtimeDiscovery.repository_manifest) ===
    canonicalJson(sourceManifest),
  "embedded repository manifest differs from reviewed source manifest",
);

const runtimeCapabilities = requireRecord(
  runtimeDiscovery.runtime_capabilities,
  "runtime capabilities",
);
for (const key of [
  "protocol_discovery",
  "artifact_integrity_verification",
  "schema_inspection",
  "offline_validation",
  "offline_focused_proofs",
]) {
  assertCondition(
    runtimeCapabilities[key] === "available",
    `${key} must be available`,
  );
}
for (const key of [
  "live_work_order_submission",
  "live_quote_exchange",
  "live_payment_execution",
  "live_work_dispatch",
  "live_completion_verification_service",
  "live_wc_award_authorization",
  "live_wc_ledger_write",
  "wc_to_void_settlement",
  "buy_void_auto_fulfillment",
]) {
  assertCondition(
    runtimeCapabilities[key] === "unavailable",
    `${key} must remain unavailable`,
  );
}

const {
  runtime_discovery_id: committedRuntimeId,
  ...runtimeDraft
} = runtimeDiscovery;
assertCondition(
  typeof committedRuntimeId === "string",
  "runtime discovery ID must be a string",
);
const computedRuntimeId =
  "voidawprd1_" +
  createHash("sha256")
    .update(canonicalJson(runtimeDraft))
    .digest("hex");
assertCondition(
  committedRuntimeId === computedRuntimeId,
  "runtime discovery ID is not reproducible",
);

assertCondition(
  runtimeSchema.additionalProperties === false,
  "runtime schema must remain closed",
);
const runtimeSchemaProperties = requireRecord(
  runtimeSchema.properties,
  "runtime schema properties",
);
assertCondition(
  requireRecord(
    runtimeSchemaProperties.marker,
    "runtime marker schema",
  ).const === "VOID_AGENT_PAID_WORK_RUNTIME_DISCOVERY_V1",
  "runtime schema marker constraint mismatch",
);
assertCondition(
  requireRecord(
    runtimeSchemaProperties.protocol,
    "runtime protocol schema",
  ).const === "void-agent-paid-work-runtime-discovery/1",
  "runtime schema protocol constraint mismatch",
);

const missingRouteRegistrations = registrations.filter(
  (registration) =>
    registration.method === "GET" &&
    registration.route ===
      "/public-node/agents/paid-work-v1.json",
);
assertCondition(
  missingRouteRegistrations.length === 1,
  "paid-work route must register exactly once",
);

console.log(
  `marker=${VOID_AI_AGENT_DISCOVERY_RUNTIME_ROUTE_V1}`,
);
console.log(
  `runtime_discovery_id=${committedRuntimeId}`,
);
console.log(
  `repository_manifest_id=${
    sourceManifest.public_discovery_manifest_id
  }`,
);
console.log(
  `registered_get_route_count=${
    registrations.filter((entry) => entry.method === "GET").length
  }`,
);
console.log("route_table_binding_verified=yes");
console.log("router_mount_idempotence_verified=yes");
console.log("exact_repository_bytes_verified=yes");
console.log("cache_control_no_store_verified=yes");
console.log("content_type_json_verified=yes");
console.log("canonical_paid_work_entrypoint_verified=yes");
console.log("canonical_paid_work_capability_verified=yes");
console.log("canonical_optional_onboarding_step_verified=yes");
console.log("canonical_schema_paid_work_constraints_verified=yes");
console.log("runtime_discovery_identity_reproduced=yes");
console.log("embedded_repository_manifest_exact_match=yes");
console.log("repository_manifest_stage_count=12");
console.log("repository_manifest_artifact_count=60");
console.log("read_only_get_head_authority_verified=yes");
console.log("live_submission_payment_wc_settlement_unavailable=yes");
console.log("src_index_mutation=none");
console.log("service_restart=none");
console.log("deployment=none");
console.log(
  "VOID_AGENT_PAID_WORK_RUNTIME_DISCOVERY_ROUTE_V1_PROOF_GREEN",
);
