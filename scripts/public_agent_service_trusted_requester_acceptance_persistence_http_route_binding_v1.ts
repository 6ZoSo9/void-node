import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_RUNTIME_COMMAND_MARKER,
  PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_RUNTIME_CONFIRMATION,
  PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_RUNTIME_RESULT_MARKER,
  executePublicAgentServiceTrustedRequesterAcceptancePersistenceRuntimeBindingV1,
  loadPublicAgentServiceTrustedRequesterAcceptancePersistenceRuntimeConfigFromEnvironmentV1,
  type PublicAgentServiceTrustedRequesterAcceptancePersistenceRuntimeConfigV1,
  type PublicAgentServiceTrustedRequesterAcceptancePersistenceRuntimeResultV1,
} from "./public_agent_service_trusted_requester_acceptance_persistence_runtime_binding_v1.js";

export const PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_BINDING_MARKER =
  "VOID_PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_BINDING_V1" as const;
export const PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_CONFIG_MARKER =
  "VOID_PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_CONFIG_V1" as const;
export const PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_REQUEST_MARKER =
  "VOID_PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_REQUEST_V1" as const;
export const PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_RESPONSE_MARKER =
  "VOID_PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_RESPONSE_V1" as const;
export const PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_STATUS_MARKER =
  "VOID_PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_STATUS_V1" as const;
export const PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_RESULT_MARKER =
  "VOID_PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_RESULT_V1" as const;
export const PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ERROR_MARKER =
  "VOID_PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ERROR_V1" as const;
export const PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_EXAMPLE_MARKER =
  "VOID_PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_EXAMPLE_V1" as const;
export const PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_VERSION =
  1 as const;

export const PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_STATUS_PATH =
  "/__void/operator/public-agent-service-trusted-requester-acceptance-persistence-runtime-v1/status" as const;
export const PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_COMMAND_PATH =
  "/__void/operator/public-agent-service-trusted-requester-acceptance-persistence-runtime-v1/command" as const;
export const PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_ENABLED_ENV =
  "VOID_PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_ENABLED" as const;
export const PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_MAX_BODY_BYTES_ENV =
  "VOID_PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_MAX_BODY_BYTES" as const;

const DEFAULT_MAX_BODY_BYTES = 4 * 1024 * 1024;
const MIN_MAX_BODY_BYTES = 1024;
const MAX_MAX_BODY_BYTES = 16 * 1024 * 1024;
const MAX_EXAMPLE_JSON_BYTES = 32 * 1024 * 1024;

export interface PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteConfigV1 {
  marker:
    typeof PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_CONFIG_MARKER;
  version:
    typeof PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_VERSION;
  enabled: boolean;
  max_body_bytes: number;
}

export interface PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRequestV1 {
  marker:
    typeof PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_REQUEST_MARKER;
  version:
    typeof PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_VERSION;
  method: string;
  path: string;
  remote_address: string;
  headers: Record<string, string>;
  body: string;
}

export interface PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpResponseV1 {
  marker:
    typeof PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_RESPONSE_MARKER;
  version:
    typeof PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_VERSION;
  status_code: number;
  headers: Record<string, string>;
  body: string;
  route_enabled: boolean;
  runtime_config_loaded: boolean;
  runtime_invoked: boolean;
  runtime_status:
    | PublicAgentServiceTrustedRequesterAcceptancePersistenceRuntimeResultV1["status"]
    | null;
}

export interface PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteDependenciesV1 {
  loadRuntimeConfig: (
    environment: NodeJS.ProcessEnv,
  ) => PublicAgentServiceTrustedRequesterAcceptancePersistenceRuntimeConfigV1;
  executeRuntime: (
    config: PublicAgentServiceTrustedRequesterAcceptancePersistenceRuntimeConfigV1,
    command: unknown,
    trustedReplayPlanInputProvider: () => unknown,
  ) => PublicAgentServiceTrustedRequesterAcceptancePersistenceRuntimeResultV1;
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
    `${label} length is outside the allowed range`,
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
      && Number.isSafeInteger(value),
    `${label} must be a safe integer`,
  );
  assertCondition(
    value >= minimum
      && value <= maximum,
    `${label} is outside the allowed range`,
  );
  return value;
}

function parseBooleanEnvironment(
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

function parseIntegerEnvironment(
  value: string | undefined,
  label: string,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  if (value === undefined || value === "") return fallback;
  assertCondition(
    /^(?:0|[1-9][0-9]*)$/.test(value),
    `${label} must be a canonical decimal integer`,
  );
  return requireInteger(
    Number(value),
    label,
    minimum,
    maximum,
  );
}

function normalizeJsonValue(
  value: unknown,
): unknown {
  if (
    value === null
    || typeof value === "string"
    || typeof value === "boolean"
  ) {
    return value;
  }
  if (typeof value === "number") {
    assertCondition(
      Number.isFinite(value),
      "canonical JSON forbids non-finite numbers",
    );
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(normalizeJsonValue);
  }
  const record = requireRecord(
    value,
    "canonical JSON value",
  );
  const normalized: Record<string, unknown> = {};
  for (const key of Object.keys(record).sort()) {
    const item = record[key];
    assertCondition(
      item !== undefined,
      "canonical JSON forbids undefined",
    );
    normalized[key] =
      normalizeJsonValue(item);
  }
  return normalized;
}

export function canonicalPublicAgentServiceTrustedRequesterAcceptancePersistenceHttpJsonV1(
  value: unknown,
): string {
  return JSON.stringify(
    normalizeJsonValue(value),
  );
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
  runtimeConfigLoaded: boolean,
  runtimeInvoked: boolean,
  runtimeStatus:
    PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpResponseV1[
      "runtime_status"
    ],
  extraHeaders: Record<string, string> = {},
): PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpResponseV1 {
  return {
    marker:
      PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_RESPONSE_MARKER,
    version:
      PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_VERSION,
    status_code:
      statusCode,
    headers:
      responseHeaders(
        body,
        extraHeaders,
      ),
    body,
    route_enabled:
      routeEnabled,
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
  runtimeConfigLoaded: boolean,
  runtimeInvoked: boolean,
  extraHeaders: Record<string, string> = {},
): PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpResponseV1 {
  const body =
    canonicalPublicAgentServiceTrustedRequesterAcceptancePersistenceHttpJsonV1(
      {
        marker:
          PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ERROR_MARKER,
        version:
          PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_VERSION,
        code,
      },
    );
  return response(
    statusCode,
    body,
    routeEnabled,
    runtimeConfigLoaded,
    runtimeInvoked,
    null,
    extraHeaders,
  );
}

function normalizeHeaders(
  value: unknown,
): Record<string, string> {
  const record = requireRecord(
    value,
    "HTTP headers",
  );
  const normalized: Record<string, string> = {};
  for (const [rawName, rawValue] of Object.entries(record)) {
    const name = rawName.trim().toLowerCase();
    assertCondition(
      /^[a-z0-9!#$%&'*+\-.^_`|~]+$/.test(name),
      "HTTP header name is invalid",
    );
    const headerValue =
      requireString(
        rawValue,
        `HTTP header ${name}`,
        0,
        8192,
      );
    assertCondition(
      !/[\r\n]/.test(headerValue),
      "HTTP header value contains a line break",
    );
    assertCondition(
      normalized[name] === undefined,
      "duplicate normalized HTTP header",
    );
    normalized[name] = headerValue;
  }
  return normalized;
}

export function validatePublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRequestV1(
  value: unknown,
): PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRequestV1 {
  const root = requireRecord(
    value,
    "trusted requester acceptance persistence HTTP request",
  );
  requireExactKeys(
    root,
    "trusted requester acceptance persistence HTTP request",
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
      === PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_REQUEST_MARKER,
    "trusted requester acceptance persistence HTTP request marker mismatch",
  );
  assertCondition(
    root.version
      === PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_VERSION,
    "trusted requester acceptance persistence HTTP request version mismatch",
  );
  const method =
    requireString(
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
      PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_REQUEST_MARKER,
    version:
      PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_VERSION,
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
        "remote address",
        1,
        256,
      ),
    headers:
      normalizeHeaders(
        root.headers,
      ),
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
  value: string,
): boolean {
  const address = value.trim().toLowerCase();
  return address === "127.0.0.1"
    || address === "::1"
    || address === "[::1]"
    || address === "::ffff:127.0.0.1";
}

function containsForwardingHeaders(
  headers: Record<string, string>,
): boolean {
  return [
    "forwarded",
    "x-forwarded-for",
    "x-forwarded-host",
    "x-forwarded-proto",
    "x-real-ip",
    "x-client-ip",
  ].some((name) => headers[name] !== undefined);
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
  if (!/^(?:0|[1-9][0-9]*)$/.test(value)) return false;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed)
    && parsed === Buffer.byteLength(body, "utf8");
}

function rootFingerprint(
  root: string | null,
): string | null {
  if (root === null) return null;
  return crypto
    .createHash("sha256")
    .update(
      Buffer.from(root, "utf8"),
    )
    .digest("hex");
}

function sanitizedRuntimeResult(
  runtimeResult:
    PublicAgentServiceTrustedRequesterAcceptancePersistenceRuntimeResultV1,
): Record<string, unknown> {
  assertCondition(
    runtimeResult.marker
      === PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_RUNTIME_RESULT_MARKER,
    "trusted requester runtime result marker mismatch",
  );
  return {
    marker:
      PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_RESULT_MARKER,
    version:
      PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_VERSION,
    status:
      runtimeResult.status,
    enabled:
      runtimeResult.enabled,
    apply:
      runtimeResult.apply,
    confirmation_verified:
      runtimeResult.confirmation_verified,
    trusted_input_provider_invoked:
      runtimeResult.trusted_input_provider_invoked,
    trusted_replay_plan_verified:
      runtimeResult.trusted_replay_plan_verified,
    requester_binding_provenance_verified:
      runtimeResult.requester_binding_provenance_verified,
    persistence_handoff_packet_validated:
      runtimeResult.persistence_handoff_packet_validated,
    store_inspected:
      runtimeResult.store_inspected,
    persistence_attempted:
      runtimeResult.persistence_attempted,
    persistence_status:
      runtimeResult.persistence_status,
    root_fingerprint:
      rootFingerprint(
        runtimeResult.root_realpath,
      ),
    generation_count_before:
      runtimeResult.generation_count_before,
    requester_authentication_id:
      runtimeResult.requester_authentication_id,
    provider_authentication_id:
      runtimeResult.provider_authentication_id,
    quote_id:
      runtimeResult.quote_id,
    work_order_id:
      runtimeResult.work_order_id,
    requester_agent_id:
      runtimeResult.requester_agent_id,
    provider_id:
      runtimeResult.provider_id,
    acceptance_nonce:
      runtimeResult.acceptance_nonce,
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
    quote_acceptance_recorded:
      runtimeResult.quote_acceptance_recorded,
    operator_owned_persistence_config:
      runtimeResult.operator_owned_persistence_config,
    server_replay_state_injected:
      runtimeResult.server_replay_state_injected,
    direct_verified_packet_provider:
      runtimeResult.direct_verified_packet_provider,
    runtime_binding_enabled:
      runtimeResult.runtime_binding_enabled,
    runtime_confirmation_verified:
      runtimeResult.runtime_confirmation_verified,
    composition_invoked:
      runtimeResult.composition_invoked,
    composition_confirmation_injected:
      runtimeResult.composition_confirmation_injected,
    trusted_input_provider_forwarded:
      runtimeResult.trusted_input_provider_forwarded,
    authority:
      runtimeResult.authority,
  };
}

function statusBody(
  runtimeConfig:
    PublicAgentServiceTrustedRequesterAcceptancePersistenceRuntimeConfigV1,
): string {
  return canonicalPublicAgentServiceTrustedRequesterAcceptancePersistenceHttpJsonV1(
    {
      marker:
        PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_STATUS_MARKER,
      version:
        PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_VERSION,
      route_enabled:
        true,
      runtime_enabled:
        runtimeConfig.enabled,
      status_path:
        PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_STATUS_PATH,
      command_path:
        PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_COMMAND_PATH,
      apply_confirmation_required:
        PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_RUNTIME_CONFIRMATION,
      trusted_input_provider_server_owned:
        true,
      operator_owned_persistence_config:
        true,
      raw_persistence_root_exposed:
        false,
      production_http_route_mounted:
        false,
      network_listener_created:
        false,
      route_registrar_modified:
        false,
      src_index_modified:
        false,
      runtime_configuration_installed:
        false,
      production_acceptance_persistence_performed:
        false,
      production_replay_write_performed:
        false,
      production_signing:
        false,
      transaction_broadcast:
        false,
      runtime_mutation:
        false,
      service_restart:
        false,
      deployment:
        false,
      money_movement:
        false,
    },
  );
}

export function validatePublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteConfigV1(
  value: unknown,
): PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteConfigV1 {
  const root = requireRecord(
    value,
    "trusted requester acceptance persistence HTTP route config",
  );
  requireExactKeys(
    root,
    "trusted requester acceptance persistence HTTP route config",
    [
      "marker",
      "version",
      "enabled",
      "max_body_bytes",
    ],
  );
  assertCondition(
    root.marker
      === PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_CONFIG_MARKER,
    "trusted requester acceptance persistence HTTP route config marker mismatch",
  );
  assertCondition(
    root.version
      === PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_VERSION,
    "trusted requester acceptance persistence HTTP route config version mismatch",
  );
  return {
    marker:
      PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_CONFIG_MARKER,
    version:
      PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_VERSION,
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

export function loadPublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteConfigFromEnvironmentV1(
  environment: NodeJS.ProcessEnv = process.env,
): PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteConfigV1 {
  return validatePublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteConfigV1(
    {
      marker:
        PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_CONFIG_MARKER,
      version:
        PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_VERSION,
      enabled:
        parseBooleanEnvironment(
          environment[
            PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_ENABLED_ENV
          ],
          PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_ENABLED_ENV,
          false,
        ),
      max_body_bytes:
        parseIntegerEnvironment(
          environment[
            PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_MAX_BODY_BYTES_ENV
          ],
          PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_MAX_BODY_BYTES_ENV,
          DEFAULT_MAX_BODY_BYTES,
          MIN_MAX_BODY_BYTES,
          MAX_MAX_BODY_BYTES,
        ),
    },
  );
}

export const PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_DEFAULT_DEPENDENCIES_V1:
  PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteDependenciesV1 = {
    loadRuntimeConfig:
      loadPublicAgentServiceTrustedRequesterAcceptancePersistenceRuntimeConfigFromEnvironmentV1,
    executeRuntime:
      (
        config,
        command,
        trustedReplayPlanInputProvider,
      ) =>
        executePublicAgentServiceTrustedRequesterAcceptancePersistenceRuntimeBindingV1(
          config,
          command,
          trustedReplayPlanInputProvider,
        ),
  };

export function publicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteDefaultDependencyIdentityV1(): {
  load_runtime_config_exact: true;
  execute_runtime_exact: true;
  trusted_provider_separate_from_command: true;
} {
  assertCondition(
    PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_DEFAULT_DEPENDENCIES_V1
      .loadRuntimeConfig
      === loadPublicAgentServiceTrustedRequesterAcceptancePersistenceRuntimeConfigFromEnvironmentV1,
    "default runtime-config loader changed",
  );
  assertCondition(
    typeof PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_DEFAULT_DEPENDENCIES_V1
      .executeRuntime
      === "function",
    "default runtime executor changed",
  );
  return {
    load_runtime_config_exact:
      true,
    execute_runtime_exact:
      true,
    trusted_provider_separate_from_command:
      true,
  };
}

export function handlePublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteV1(
  routeConfigValue: unknown,
  requestValue: unknown,
  runtimeEnvironment: NodeJS.ProcessEnv,
  trustedReplayPlanInputProvider: () => unknown,
  dependencies:
    PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteDependenciesV1 =
      PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_DEFAULT_DEPENDENCIES_V1,
): PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpResponseV1 {
  const routeConfig =
    validatePublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteConfigV1(
      routeConfigValue,
    );

  if (!routeConfig.enabled) {
    return errorResponse(
      404,
      "not_found",
      false,
      false,
      false,
    );
  }

  let request:
    PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRequestV1;
  try {
    request =
      validatePublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRequestV1(
        requestValue,
      );
  } catch {
    return errorResponse(
      400,
      "invalid_request",
      true,
      false,
      false,
    );
  }

  if (
    !isLoopback(request.remote_address)
    || containsForwardingHeaders(request.headers)
  ) {
    return errorResponse(
      404,
      "not_found",
      true,
      false,
      false,
    );
  }

  const isStatus =
    request.path
      === PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_STATUS_PATH;
  const isCommand =
    request.path
      === PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_COMMAND_PATH;

  if (!isStatus && !isCommand) {
    return errorResponse(
      404,
      "not_found",
      true,
      false,
      false,
    );
  }

  if (isStatus) {
    if (
      request.method !== "GET"
      && request.method !== "HEAD"
    ) {
      return errorResponse(
        405,
        "method_not_allowed",
        true,
        false,
        false,
        {
          allow:
            "GET, HEAD",
        },
      );
    }

    let runtimeConfig:
      PublicAgentServiceTrustedRequesterAcceptancePersistenceRuntimeConfigV1;
    try {
      runtimeConfig =
        dependencies.loadRuntimeConfig(
          runtimeEnvironment,
        );
    } catch {
      return errorResponse(
        503,
        "runtime_config_unavailable",
        true,
        false,
        false,
      );
    }

    const getBody =
      statusBody(
        runtimeConfig,
      );
    const body =
      request.method === "HEAD"
        ? ""
        : getBody;
    const result =
      response(
        200,
        body,
        true,
        true,
        false,
        null,
      );
    if (request.method === "HEAD") {
      result.headers = {
        ...result.headers,
        ...responseHeaders(getBody),
      };
    }
    return result;
  }

  if (request.method !== "POST") {
    return errorResponse(
      405,
      "method_not_allowed",
      true,
      false,
      false,
      {
        allow:
          "POST",
      },
    );
  }

  if (!contentTypeAccepted(request.headers)) {
    return errorResponse(
      415,
      "unsupported_media_type",
      true,
      false,
      false,
    );
  }

  if (
    request.headers["content-encoding"] !== undefined
    && request.headers["content-encoding"]
      .trim()
      .toLowerCase()
      !== "identity"
  ) {
    return errorResponse(
      415,
      "unsupported_content_encoding",
      true,
      false,
      false,
    );
  }

  const bodyBytes =
    Buffer.byteLength(
      request.body,
      "utf8",
    );
  if (bodyBytes > routeConfig.max_body_bytes) {
    return errorResponse(
      413,
      "body_too_large",
      true,
      false,
      false,
    );
  }

  if (
    !contentLengthMatches(
      request.headers,
      request.body,
    )
  ) {
    return errorResponse(
      400,
      "content_length_mismatch",
      true,
      false,
      false,
    );
  }

  let command: unknown;
  try {
    command = JSON.parse(
      request.body,
    ) as unknown;
  } catch {
    return errorResponse(
      400,
      "invalid_json",
      true,
      false,
      false,
    );
  }

  let runtimeConfig:
    PublicAgentServiceTrustedRequesterAcceptancePersistenceRuntimeConfigV1;
  try {
    runtimeConfig =
      dependencies.loadRuntimeConfig(
        runtimeEnvironment,
      );
  } catch {
    return errorResponse(
      503,
      "runtime_config_unavailable",
      true,
      false,
      false,
    );
  }

  if (
    typeof trustedReplayPlanInputProvider
      !== "function"
  ) {
    return errorResponse(
      503,
      "trusted_input_provider_unavailable",
      true,
      true,
      false,
    );
  }

  let runtimeResult:
    PublicAgentServiceTrustedRequesterAcceptancePersistenceRuntimeResultV1;
  try {
    runtimeResult =
      dependencies.executeRuntime(
        runtimeConfig,
        command,
        trustedReplayPlanInputProvider,
      );
  } catch {
    return errorResponse(
      400,
      "runtime_rejected_command",
      true,
      true,
      true,
    );
  }

  const body =
    canonicalPublicAgentServiceTrustedRequesterAcceptancePersistenceHttpJsonV1(
      sanitizedRuntimeResult(
        runtimeResult,
      ),
    );
  const statusCode =
    runtimeResult.status === "disabled"
      ? 503
      : runtimeResult.status === "persisted"
        ? 201
        : runtimeResult.status === "example_only"
          ? 200
          : 200;

  return response(
    statusCode,
    body,
    true,
    true,
    true,
    runtimeResult.status,
  );
}

export function handlePublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteFromEnvironmentV1(
  requestValue: unknown,
  environment: NodeJS.ProcessEnv,
  trustedReplayPlanInputProvider: () => unknown,
  dependencies:
    PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteDependenciesV1 =
      PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_DEFAULT_DEPENDENCIES_V1,
): PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpResponseV1 {
  const routeConfig =
    loadPublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteConfigFromEnvironmentV1(
      environment,
    );
  return handlePublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteV1(
    routeConfig,
    requestValue,
    environment,
    trustedReplayPlanInputProvider,
    dependencies,
  );
}

function readJsonFile(
  file: string,
): unknown {
  const resolved = path.resolve(file);
  const stat = fs.lstatSync(resolved);
  assertCondition(
    !stat.isSymbolicLink(),
    "symlink input forbidden",
  );
  assertCondition(
    stat.isFile(),
    "regular file input required",
  );
  assertCondition(
    stat.size <= MAX_EXAMPLE_JSON_BYTES,
    "JSON input too large",
  );
  return JSON.parse(
    fs.readFileSync(
      resolved,
      "utf8",
    ),
  ) as unknown;
}

function main(): void {
  const [
    mode,
    runtimeExamplePath,
    ...extra
  ] = process.argv.slice(2);
  assertCondition(
    extra.length === 0,
    "unexpected arguments",
  );
  if (
    mode !== "example"
    || runtimeExamplePath === undefined
  ) {
    fail(
      "usage: tsx scripts/public_agent_service_trusted_requester_acceptance_persistence_http_route_binding_v1.ts example <trusted-runtime-example.json>",
    );
  }

  const runtimeExample =
    requireRecord(
      readJsonFile(
        runtimeExamplePath,
      ),
      "trusted requester persistence runtime example",
    );
  const runtimeConfig =
    runtimeExample.config;
  const runtimeCommand =
    runtimeExample.command;
  const runtimeResult =
    runtimeExample.result;
  const trustedInput =
    runtimeExample.trusted_replay_plan_input;

  const routeConfig = {
    marker:
      PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_CONFIG_MARKER,
    version:
      PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_VERSION,
    enabled:
      true,
    max_body_bytes:
      DEFAULT_MAX_BODY_BYTES,
  };
  const commandBody =
    JSON.stringify(
      runtimeCommand,
    );
  const request = {
    marker:
      PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_REQUEST_MARKER,
    version:
      PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_VERSION,
    method:
      "POST",
    path:
      PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_COMMAND_PATH,
    remote_address:
      "127.0.0.1",
    headers: {
      "content-type":
        "application/json",
      "content-length":
        String(
          Buffer.byteLength(
            commandBody,
            "utf8",
          ),
        ),
    },
    body:
      commandBody,
  };
  const responseValue =
    handlePublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteV1(
      routeConfig,
      request,
      {},
      () => trustedInput,
      {
        loadRuntimeConfig:
          () =>
            runtimeConfig as PublicAgentServiceTrustedRequesterAcceptancePersistenceRuntimeConfigV1,
        executeRuntime:
          () =>
            runtimeResult as PublicAgentServiceTrustedRequesterAcceptancePersistenceRuntimeResultV1,
      },
    );

  process.stdout.write(
    `${JSON.stringify(
      {
        marker:
          PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_EXAMPLE_MARKER,
        version:
          PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_VERSION,
        example_only:
          true,
        route_config:
          routeConfig,
        request,
        server_owned_trusted_input_present:
          true,
        response:
          responseValue,
      },
      null,
      2,
    )}\n`,
  );
}

if (
  process.argv[1] !== undefined
  && import.meta.url
    === pathToFileURL(
      path.resolve(process.argv[1]),
    ).href
) {
  main();
}
