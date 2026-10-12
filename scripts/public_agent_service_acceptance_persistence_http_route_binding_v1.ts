import { createHash } from "node:crypto";

import {
  PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_RUNTIME_COMMAND_MARKER,
  PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_RUNTIME_DEFAULT_DEPENDENCIES_V1,
  PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_RUNTIME_VERSION,
  executePublicAgentServiceAcceptancePersistenceRuntimeBindingV1,
  loadPublicAgentServiceAcceptancePersistenceRuntimeConfigFromEnvironmentV1,
  type PublicAgentServiceAcceptancePersistenceRuntimeConfigV1,
  type PublicAgentServiceAcceptancePersistenceRuntimeResultV1,
} from "./public_agent_service_acceptance_persistence_runtime_binding_v1.js";

export const PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_BINDING_MARKER =
  "VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_BINDING_V1" as const;
export const PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_CONFIG_MARKER =
  "VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_CONFIG_V1" as const;
export const PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_REQUEST_MARKER =
  "VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_REQUEST_V1" as const;
export const PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_RESPONSE_MARKER =
  "VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_RESPONSE_V1" as const;
export const PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_STATUS_MARKER =
  "VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_STATUS_V1" as const;
export const PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_RESULT_MARKER =
  "VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_RESULT_V1" as const;
export const PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ERROR_MARKER =
  "VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ERROR_V1" as const;
export const PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_VERSION =
  1 as const;

export const PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_STATUS_PATH =
  "/__void/operator/public-agent-service-acceptance-persistence-runtime-v1/status" as const;
export const PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_COMMAND_PATH =
  "/__void/operator/public-agent-service-acceptance-persistence-runtime-v1/command" as const;
export const PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_ENABLED_ENV =
  "VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_ENABLED" as const;
export const PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_MAX_BODY_BYTES_ENV =
  "VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_MAX_BODY_BYTES" as const;

const DEFAULT_MAX_BODY_BYTES = 4 * 1024 * 1024;
const MIN_MAX_BODY_BYTES = 1024;
const MAX_MAX_BODY_BYTES = 16 * 1024 * 1024;
const INTEGER_TEXT = /^[1-9][0-9]*$/;
const LOOPBACK_ADDRESSES = new Set([
  "127.0.0.1",
  "::1",
  "::ffff:127.0.0.1",
]);
const FORWARDED_HEADERS = new Set([
  "forwarded",
  "x-forwarded-for",
  "x-real-ip",
]);

export interface PublicAgentServiceAcceptancePersistenceHttpRouteConfigV1 {
  marker:
    typeof PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_CONFIG_MARKER;
  version:
    typeof PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_VERSION;
  enabled: boolean;
  max_body_bytes: number;
}

export interface PublicAgentServiceAcceptancePersistenceHttpRequestV1 {
  marker:
    typeof PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_REQUEST_MARKER;
  version:
    typeof PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_VERSION;
  method: string;
  path: string;
  remote_address: string;
  headers: Record<string, string>;
  body: string;
}

export interface PublicAgentServiceAcceptancePersistenceHttpResponseV1 {
  marker:
    typeof PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_RESPONSE_MARKER;
  version:
    typeof PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_VERSION;
  status_code: number;
  headers: Record<string, string>;
  body: string;
  route_enabled: boolean;
  loopback_verified: boolean;
  runtime_config_loaded: boolean;
  runtime_invoked: boolean;
  runtime_status:
    | null
    | PublicAgentServiceAcceptancePersistenceRuntimeResultV1["status"];
}

export interface PublicAgentServiceAcceptancePersistenceHttpRouteDependenciesV1 {
  loadRuntimeConfig: (
    environment: NodeJS.ProcessEnv,
  ) => PublicAgentServiceAcceptancePersistenceRuntimeConfigV1;
  executeRuntime: (
    config: unknown,
    command: unknown,
    trustedContextProvider: () => unknown,
  ) => PublicAgentServiceAcceptancePersistenceRuntimeResultV1;
  sha256Text: (value: string) => string;
}

interface SanitizedRuntimeResultV1 {
  marker:
    typeof PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_RESULT_MARKER;
  version:
    typeof PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_VERSION;
  status:
    PublicAgentServiceAcceptancePersistenceRuntimeResultV1["status"];
  enabled: boolean;
  apply: boolean;
  confirmation_verified: boolean;
  trusted_context_loaded: boolean;
  store_inspected: boolean;
  persistence_attempted: boolean;
  persistence_status:
    PublicAgentServiceAcceptancePersistenceRuntimeResultV1["persistence_status"];
  root_fingerprint_sha256: string | null;
  generation_count_before: number | null;
  plan_id: string | null;
  acceptance_id: string | null;
  transaction_id: string | null;
  before_state_id: string | null;
  after_state_id: string | null;
  before_revision: number | null;
  after_revision: number | null;
  generation_id: string | null;
  operation_id: string | null;
  acceptance_materialized_in_memory: boolean;
  acceptance_persisted: boolean;
  requester_authentication_replay_write: boolean;
  provider_authentication_replay_write: boolean;
  acceptance_replay_write: boolean;
  single_active_acceptance_per_quote_enforced: boolean;
  authority:
    PublicAgentServiceAcceptancePersistenceRuntimeResultV1["authority"];
}

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
  assertCondition(
    isRecord(value),
    `${label} must be an object`,
  );
  return value;
}

function requireExactKeys(
  value: Record<string, unknown>,
  label: string,
  keys: readonly string[],
): void {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  assertCondition(
    JSON.stringify(actual)
      === JSON.stringify(expected),
    `${label} must contain exactly: ${expected.join(", ")}`,
  );
}

function requireString(
  value: unknown,
  label: string,
  minimum: number,
  maximum: number,
): string {
  assertCondition(
    typeof value === "string",
    `${label} must be a string`,
  );
  assertCondition(
    value.length >= minimum
      && value.length <= maximum,
    `${label} length out of range`,
  );
  return value;
}

function requireBoolean(
  value: unknown,
  label: string,
): boolean {
  assertCondition(
    typeof value === "boolean",
    `${label} must be boolean`,
  );
  return value;
}

function requireInteger(
  value: unknown,
  label: string,
  minimum: number,
  maximum: number,
): number {
  assertCondition(
    typeof value === "number"
      && Number.isSafeInteger(value)
      && value >= minimum
      && value <= maximum,
    `${label} is outside the allowed range`,
  );
  return value;
}

function parseFlag(
  value: string | undefined,
  label: string,
  fallback: boolean,
): boolean {
  if (value === undefined || value === "") return fallback;
  assertCondition(
    value === "0" || value === "1",
    `${label} must be 0 or 1`,
  );
  return value === "1";
}

function parseBoundedInteger(
  value: string | undefined,
  label: string,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  if (value === undefined || value === "") return fallback;
  assertCondition(
    INTEGER_TEXT.test(value),
    `${label} must be a positive base-10 integer`,
  );
  const parsed = Number(value);
  return requireInteger(
    parsed,
    label,
    minimum,
    maximum,
  );
}

function canonicalJson(value: unknown): string {
  return `${JSON.stringify(value)}\n`;
}

function responseHeaders(
  body: string,
  extra: Record<string, string> = {},
): Record<string, string> {
  return {
    "cache-control": "no-store",
    "content-length": String(
      Buffer.byteLength(body, "utf8"),
    ),
    "content-type": "application/json; charset=utf-8",
    "x-content-type-options": "nosniff",
    ...extra,
  };
}

function response(
  statusCode: number,
  body: string,
  routeEnabled: boolean,
  loopbackVerified: boolean,
  runtimeConfigLoaded: boolean,
  runtimeInvoked: boolean,
  runtimeStatus:
    PublicAgentServiceAcceptancePersistenceRuntimeResultV1["status"] | null,
  extraHeaders: Record<string, string> = {},
): PublicAgentServiceAcceptancePersistenceHttpResponseV1 {
  return {
    marker:
      PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_RESPONSE_MARKER,
    version:
      PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_VERSION,
    status_code:
      statusCode,
    headers:
      responseHeaders(body, extraHeaders),
    body,
    route_enabled:
      routeEnabled,
    loopback_verified:
      loopbackVerified,
    runtime_config_loaded:
      runtimeConfigLoaded,
    runtime_invoked:
      runtimeInvoked,
    runtime_status:
      runtimeStatus,
  };
}

function errorResponse(
  statusCode: number,
  code: string,
  routeEnabled: boolean,
  loopbackVerified: boolean,
  runtimeConfigLoaded: boolean,
  runtimeInvoked: boolean,
  extraHeaders: Record<string, string> = {},
): PublicAgentServiceAcceptancePersistenceHttpResponseV1 {
  const body = canonicalJson({
    marker:
      PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ERROR_MARKER,
    version:
      PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_VERSION,
    error:
      code,
  });
  return response(
    statusCode,
    body,
    routeEnabled,
    loopbackVerified,
    runtimeConfigLoaded,
    runtimeInvoked,
    null,
    extraHeaders,
  );
}

function notFoundResponse(
  routeEnabled: boolean,
): PublicAgentServiceAcceptancePersistenceHttpResponseV1 {
  return errorResponse(
    404,
    "not_found",
    routeEnabled,
    false,
    false,
    false,
  );
}

function normalizeHeaders(
  value: unknown,
): Record<string, string> {
  const root = requireRecord(
    value,
    "HTTP headers",
  );
  const normalized: Record<string, string> = {};
  for (const [rawName, rawValue] of Object.entries(root)) {
    const name = rawName.toLowerCase();
    assertCondition(
      /^[a-z0-9!#$%&'*+.^_`|~-]+$/.test(name),
      "HTTP header name is invalid",
    );
    assertCondition(
      !(name in normalized),
      "duplicate normalized HTTP header",
    );
    normalized[name] = requireString(
      rawValue,
      `HTTP header ${name}`,
      0,
      8192,
    );
  }
  return normalized;
}

function validateRequest(
  value: unknown,
): PublicAgentServiceAcceptancePersistenceHttpRequestV1 {
  const root = requireRecord(
    value,
    "acceptance persistence HTTP request",
  );
  requireExactKeys(
    root,
    "acceptance persistence HTTP request",
    [
      "marker",
      "version",
      "method",
      "path",
      "remote_address",
      "headers",
      "body",
    ],
  );
  assertCondition(
    root.marker
      === PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_REQUEST_MARKER,
    "acceptance persistence HTTP request marker mismatch",
  );
  assertCondition(
    root.version
      === PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_VERSION,
    "acceptance persistence HTTP request version mismatch",
  );
  const method = requireString(
    root.method,
    "HTTP method",
    1,
    16,
  );
  assertCondition(
    /^[A-Z]+$/.test(method),
    "HTTP method must be uppercase ASCII",
  );
  return {
    marker:
      PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_REQUEST_MARKER,
    version:
      PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_VERSION,
    method,
    path:
      requireString(
        root.path,
        "HTTP path",
        1,
        4096,
      ),
    remote_address:
      requireString(
        root.remote_address,
        "remote_address",
        1,
        128,
      ),
    headers:
      normalizeHeaders(root.headers),
    body:
      requireString(
        root.body,
        "HTTP body",
        0,
        MAX_MAX_BODY_BYTES,
      ),
  };
}

function isLoopback(
  remoteAddress: string,
): boolean {
  return LOOPBACK_ADDRESSES.has(remoteAddress);
}

function containsForwardingHeaders(
  headers: Record<string, string>,
): boolean {
  return Object.keys(headers).some(
    (name) => FORWARDED_HEADERS.has(name),
  );
}

function contentTypeAccepted(
  headers: Record<string, string>,
): boolean {
  const contentType = (
    headers["content-type"] ?? ""
  ).trim().toLowerCase();
  return contentType === "application/json"
    || contentType === "application/json; charset=utf-8";
}

function contentLengthMatches(
  headers: Record<string, string>,
  body: string,
): boolean {
  const value = headers["content-length"];
  if (value === undefined) return true;
  if (!/^(0|[1-9][0-9]*)$/.test(value)) return false;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed)
    && parsed === Buffer.byteLength(body, "utf8");
}

function sha256TextV1(
  value: string,
): string {
  return createHash("sha256")
    .update(value, "utf8")
    .digest("hex");
}

function sanitizeRuntimeResult(
  runtimeResult: PublicAgentServiceAcceptancePersistenceRuntimeResultV1,
  dependencies: PublicAgentServiceAcceptancePersistenceHttpRouteDependenciesV1,
): SanitizedRuntimeResultV1 {
  return {
    marker:
      PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_RESULT_MARKER,
    version:
      PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_VERSION,
    status:
      runtimeResult.status,
    enabled:
      runtimeResult.enabled,
    apply:
      runtimeResult.apply,
    confirmation_verified:
      runtimeResult.confirmation_verified,
    trusted_context_loaded:
      runtimeResult.trusted_context_loaded,
    store_inspected:
      runtimeResult.store_inspected,
    persistence_attempted:
      runtimeResult.persistence_attempted,
    persistence_status:
      runtimeResult.persistence_status,
    root_fingerprint_sha256:
      runtimeResult.root_realpath === null
        ? null
        : dependencies.sha256Text(
            runtimeResult.root_realpath,
          ),
    generation_count_before:
      runtimeResult.generation_count_before,
    plan_id:
      runtimeResult.plan_id,
    acceptance_id:
      runtimeResult.acceptance_id,
    transaction_id:
      runtimeResult.transaction_id,
    before_state_id:
      runtimeResult.before_state_id,
    after_state_id:
      runtimeResult.after_state_id,
    before_revision:
      runtimeResult.before_revision,
    after_revision:
      runtimeResult.after_revision,
    generation_id:
      runtimeResult.generation_id,
    operation_id:
      runtimeResult.operation_id,
    acceptance_materialized_in_memory:
      runtimeResult.acceptance_materialized_in_memory,
    acceptance_persisted:
      runtimeResult.acceptance_persisted,
    requester_authentication_replay_write:
      runtimeResult.requester_authentication_replay_write,
    provider_authentication_replay_write:
      runtimeResult.provider_authentication_replay_write,
    acceptance_replay_write:
      runtimeResult.acceptance_replay_write,
    single_active_acceptance_per_quote_enforced:
      runtimeResult.single_active_acceptance_per_quote_enforced,
    authority:
      runtimeResult.authority,
  };
}

function statusBody(
  runtimeConfig: PublicAgentServiceAcceptancePersistenceRuntimeConfigV1,
): string {
  return canonicalJson({
    marker:
      PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_STATUS_MARKER,
    version:
      PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_VERSION,
    route_enabled:
      true,
    loopback_only:
      true,
    runtime_enabled:
      runtimeConfig.enabled,
    apply_confirmation_required:
      true,
    server_store_selection:
      true,
    server_trusted_context:
      true,
    dry_run_supported:
      true,
    raw_persistence_root_exposed:
      false,
    production_http_route_mounted:
      false,
    payment_authorization:
      false,
    payment_execution:
      false,
    execution_authorization:
      false,
    work_dispatch:
      false,
    production_signing:
      false,
    transaction_broadcast:
      false,
    work_credit_write:
      false,
    money_movement:
      false,
  });
}

export function validatePublicAgentServiceAcceptancePersistenceHttpRouteConfigV1(
  value: unknown,
): PublicAgentServiceAcceptancePersistenceHttpRouteConfigV1 {
  const root = requireRecord(
    value,
    "acceptance persistence HTTP route config",
  );
  requireExactKeys(
    root,
    "acceptance persistence HTTP route config",
    [
      "marker",
      "version",
      "enabled",
      "max_body_bytes",
    ],
  );
  assertCondition(
    root.marker
      === PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_CONFIG_MARKER,
    "acceptance persistence HTTP route config marker mismatch",
  );
  assertCondition(
    root.version
      === PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_VERSION,
    "acceptance persistence HTTP route config version mismatch",
  );
  return {
    marker:
      PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_CONFIG_MARKER,
    version:
      PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_VERSION,
    enabled:
      requireBoolean(
        root.enabled,
        "enabled",
      ),
    max_body_bytes:
      requireInteger(
        root.max_body_bytes,
        "max_body_bytes",
        MIN_MAX_BODY_BYTES,
        MAX_MAX_BODY_BYTES,
      ),
  };
}

export function loadPublicAgentServiceAcceptancePersistenceHttpRouteConfigFromEnvironmentV1(
  environment: NodeJS.ProcessEnv,
): PublicAgentServiceAcceptancePersistenceHttpRouteConfigV1 {
  return validatePublicAgentServiceAcceptancePersistenceHttpRouteConfigV1({
    marker:
      PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_CONFIG_MARKER,
    version:
      PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_VERSION,
    enabled:
      parseFlag(
        environment[
          PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_ENABLED_ENV
        ],
        PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_ENABLED_ENV,
        false,
      ),
    max_body_bytes:
      parseBoundedInteger(
        environment[
          PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_MAX_BODY_BYTES_ENV
        ],
        PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_MAX_BODY_BYTES_ENV,
        DEFAULT_MAX_BODY_BYTES,
        MIN_MAX_BODY_BYTES,
        MAX_MAX_BODY_BYTES,
      ),
  });
}

function executeRuntimeDefaultV1(
  config: unknown,
  command: unknown,
  trustedContextProvider: () => unknown,
): PublicAgentServiceAcceptancePersistenceRuntimeResultV1 {
  return executePublicAgentServiceAcceptancePersistenceRuntimeBindingV1(
    config,
    command,
    trustedContextProvider,
    PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_RUNTIME_DEFAULT_DEPENDENCIES_V1,
  );
}

export const PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_DEFAULT_DEPENDENCIES_V1:
  PublicAgentServiceAcceptancePersistenceHttpRouteDependenciesV1 = Object.freeze({
    loadRuntimeConfig:
      loadPublicAgentServiceAcceptancePersistenceRuntimeConfigFromEnvironmentV1,
    executeRuntime:
      executeRuntimeDefaultV1,
    sha256Text:
      sha256TextV1,
  });

export function publicAgentServiceAcceptancePersistenceHttpRouteDefaultDependencyIdentityV1(): {
  load_runtime_config_exact: true;
  execute_runtime_exact: true;
  runtime_default_dependencies_bound: true;
  sha256_text_exact: true;
} {
  assertCondition(
    PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_DEFAULT_DEPENDENCIES_V1
      .loadRuntimeConfig
      === loadPublicAgentServiceAcceptancePersistenceRuntimeConfigFromEnvironmentV1,
    "default runtime-config loader changed",
  );
  assertCondition(
    PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_DEFAULT_DEPENDENCIES_V1
      .executeRuntime
      === executeRuntimeDefaultV1,
    "default runtime executor changed",
  );
  assertCondition(
    PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_DEFAULT_DEPENDENCIES_V1
      .sha256Text
      === sha256TextV1,
    "default SHA-256 dependency changed",
  );
  return {
    load_runtime_config_exact:
      true,
    execute_runtime_exact:
      true,
    runtime_default_dependencies_bound:
      true,
    sha256_text_exact:
      true,
  };
}

export function handlePublicAgentServiceAcceptancePersistenceHttpRouteV1(
  routeConfigValue: unknown,
  requestValue: unknown,
  runtimeEnvironment: NodeJS.ProcessEnv,
  trustedContextProvider: () => unknown,
  dependencies:
    PublicAgentServiceAcceptancePersistenceHttpRouteDependenciesV1 =
      PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_DEFAULT_DEPENDENCIES_V1,
): PublicAgentServiceAcceptancePersistenceHttpResponseV1 {
  const routeConfig =
    validatePublicAgentServiceAcceptancePersistenceHttpRouteConfigV1(
      routeConfigValue,
    );

  if (!routeConfig.enabled) {
    return notFoundResponse(false);
  }

  let request: PublicAgentServiceAcceptancePersistenceHttpRequestV1;
  try {
    request = validateRequest(requestValue);
  } catch {
    return errorResponse(
      400,
      "invalid_request",
      true,
      false,
      false,
      false,
    );
  }

  if (
    !isLoopback(request.remote_address)
    || containsForwardingHeaders(request.headers)
  ) {
    return notFoundResponse(true);
  }

  const loopbackVerified = true;
  const canonicalStatus =
    request.path
      === PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_STATUS_PATH;
  const canonicalCommand =
    request.path
      === PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_COMMAND_PATH;

  if (!canonicalStatus && !canonicalCommand) {
    return errorResponse(
      404,
      "not_found",
      true,
      loopbackVerified,
      false,
      false,
    );
  }

  if (canonicalStatus) {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return errorResponse(
        405,
        "method_not_allowed",
        true,
        loopbackVerified,
        false,
        false,
        { allow: "GET, HEAD" },
      );
    }

    let runtimeConfig: PublicAgentServiceAcceptancePersistenceRuntimeConfigV1;
    try {
      runtimeConfig = dependencies.loadRuntimeConfig(
        runtimeEnvironment,
      );
    } catch {
      return errorResponse(
        503,
        "runtime_config_unavailable",
        true,
        loopbackVerified,
        false,
        false,
      );
    }

    const getBody = statusBody(runtimeConfig);
    const body = request.method === "HEAD" ? "" : getBody;
    return {
      ...response(
        200,
        body,
        true,
        loopbackVerified,
        true,
        false,
        null,
      ),
      headers: {
        ...responseHeaders(getBody),
      },
    };
  }

  if (request.method !== "POST") {
    return errorResponse(
      405,
      "method_not_allowed",
      true,
      loopbackVerified,
      false,
      false,
      { allow: "POST" },
    );
  }

  if (!contentTypeAccepted(request.headers)) {
    return errorResponse(
      415,
      "unsupported_media_type",
      true,
      loopbackVerified,
      false,
      false,
    );
  }
  if (
    request.headers["content-encoding"] !== undefined
    && request.headers["content-encoding"].trim().toLowerCase()
      !== "identity"
  ) {
    return errorResponse(
      415,
      "unsupported_content_encoding",
      true,
      loopbackVerified,
      false,
      false,
    );
  }

  const bodyBytes = Buffer.byteLength(
    request.body,
    "utf8",
  );
  if (bodyBytes > routeConfig.max_body_bytes) {
    return errorResponse(
      413,
      "payload_too_large",
      true,
      loopbackVerified,
      false,
      false,
    );
  }
  if (!contentLengthMatches(request.headers, request.body)) {
    return errorResponse(
      400,
      "content_length_mismatch",
      true,
      loopbackVerified,
      false,
      false,
    );
  }

  let command: unknown;
  try {
    command = JSON.parse(request.body);
  } catch {
    return errorResponse(
      400,
      "invalid_json",
      true,
      loopbackVerified,
      false,
      false,
    );
  }

  let runtimeConfig: PublicAgentServiceAcceptancePersistenceRuntimeConfigV1;
  try {
    runtimeConfig = dependencies.loadRuntimeConfig(
      runtimeEnvironment,
    );
  } catch {
    return errorResponse(
      503,
      "runtime_config_unavailable",
      true,
      loopbackVerified,
      false,
      false,
    );
  }

  let runtimeResult: PublicAgentServiceAcceptancePersistenceRuntimeResultV1;
  try {
    runtimeResult = dependencies.executeRuntime(
      runtimeConfig,
      command,
      trustedContextProvider,
    );
  } catch {
    return errorResponse(
      400,
      "command_rejected",
      true,
      loopbackVerified,
      true,
      true,
    );
  }

  const sanitized = sanitizeRuntimeResult(
    runtimeResult,
    dependencies,
  );
  const body = canonicalJson(sanitized);
  const statusCode = runtimeResult.status === "disabled"
    ? 503
    : runtimeResult.status === "persisted"
      ? 201
      : 200;
  return response(
    statusCode,
    body,
    true,
    loopbackVerified,
    true,
    true,
    runtimeResult.status,
  );
}

export function handlePublicAgentServiceAcceptancePersistenceHttpRouteFromEnvironmentV1(
  environment: NodeJS.ProcessEnv,
  requestValue: unknown,
  trustedContextProvider: () => unknown,
  dependencies:
    PublicAgentServiceAcceptancePersistenceHttpRouteDependenciesV1 =
      PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_DEFAULT_DEPENDENCIES_V1,
): PublicAgentServiceAcceptancePersistenceHttpResponseV1 {
  const routeConfig =
    loadPublicAgentServiceAcceptancePersistenceHttpRouteConfigFromEnvironmentV1(
      environment,
    );
  return handlePublicAgentServiceAcceptancePersistenceHttpRouteV1(
    routeConfig,
    requestValue,
    environment,
    trustedContextProvider,
    dependencies,
  );
}

export function publicAgentServiceAcceptancePersistenceHttpRouteCommandMarkerV1(): string {
  return PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_RUNTIME_COMMAND_MARKER;
}

export function publicAgentServiceAcceptancePersistenceHttpRouteRuntimeVersionV1(): number {
  return PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_RUNTIME_VERSION;
}
