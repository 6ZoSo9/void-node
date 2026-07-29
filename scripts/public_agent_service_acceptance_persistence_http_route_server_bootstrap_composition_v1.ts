import { createHash } from "node:crypto";

import {
  PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_REQUEST_MARKER,
  PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_ENABLED_ENV,
  PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_VERSION,
  type PublicAgentServiceAcceptancePersistenceHttpRequestV1,
  type PublicAgentServiceAcceptancePersistenceHttpResponseV1,
} from "./public_agent_service_acceptance_persistence_http_route_binding_v1.js";
import {
  PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_CONFIRMATION,
  PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_ENABLED_ENV,
} from "./public_agent_service_acceptance_persistence_http_route_server_mount_binding_v1.js";
import {
  PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_COMMAND_MARKER,
  PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_CONFIRMATION,
  PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_ENABLED_ENV,
  PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_VERSION,
  executePublicAgentServiceAcceptancePersistenceHttpRouteServerRegistrarIntegrationFromEnvironmentV1,
  type PublicAgentServiceAcceptancePersistenceHttpRouteServerRegistrarIntegrationResultV1,
  type PublicAgentServiceAcceptancePersistenceHttpRouteServerRegistryCompareAndSwapReceiptV1,
  type PublicAgentServiceAcceptancePersistenceHttpRouteServerRegistryEntryV1,
  type PublicAgentServiceAcceptancePersistenceHttpRouteServerRegistrySnapshotV1,
  type PublicAgentServiceAcceptancePersistenceHttpRouteServerRegistryV1,
} from "./public_agent_service_acceptance_persistence_http_route_server_registrar_integration_v1.js";

export const PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_COMPOSITION_MARKER =
  "VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_COMPOSITION_V1" as const;
export const PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_COMPOSITION_CONFIG_MARKER =
  "VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_COMPOSITION_CONFIG_V1" as const;
export const PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_COMPOSITION_COMMAND_MARKER =
  "VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_COMPOSITION_COMMAND_V1" as const;
export const PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_COMPOSITION_RESULT_MARKER =
  "VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_COMPOSITION_RESULT_V1" as const;
export const PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_COMPOSITION_EXAMPLE_MARKER =
  "VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_COMPOSITION_EXAMPLE_V1" as const;
export const PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_COMPOSITION_ERROR_MARKER =
  "VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_COMPOSITION_ERROR_V1" as const;
export const PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_COMPOSITION_VERSION =
  1 as const;

export const PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_COMPOSITION_ENABLED_ENV =
  "VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_COMPOSITION_ENABLED" as const;
export const PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_COMPOSITION_CONFIRMATION =
  "bootstrapAcceptancePersistenceHttpRouteServerCompositionV1" as const;
export const PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_COMPOSITION_ADAPTER_ID =
  "void.public-agent-service-acceptance-persistence-http-route-server-bootstrap-composition.v1" as const;

const MAX_ROUTE_COUNT = 4096;
const MAX_REQUEST_BODY_BYTES = 16 * 1024 * 1024;
const CANONICAL_PATHS = new Set([
  "/__void/operator/public-agent-service-acceptance-persistence-runtime-v1/status",
  "/__void/operator/public-agent-service-acceptance-persistence-runtime-v1/command",
]);
const APP_STATES = new WeakMap<object, ExpressRegistryStateV1>();
const FUNCTION_IDS = new WeakMap<Function, string>();
let nextFunctionId = 1;

export interface PublicAgentServiceAcceptancePersistenceHttpRouteServerBootstrapCompositionConfigV1 {
  marker:
    typeof PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_COMPOSITION_CONFIG_MARKER;
  version:
    typeof PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_COMPOSITION_VERSION;
  enabled: boolean;
}

export interface PublicAgentServiceAcceptancePersistenceHttpRouteServerBootstrapCompositionCommandV1 {
  marker:
    typeof PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_COMPOSITION_COMMAND_MARKER;
  version:
    typeof PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_COMPOSITION_VERSION;
  apply: boolean;
  confirmation: string;
  integration_confirmation: string;
  mount_confirmation: string;
}

export interface PublicAgentServiceAcceptancePersistenceExpressRequestLikeV1 {
  method?: unknown;
  path?: unknown;
  originalUrl?: unknown;
  url?: unknown;
  headers?: unknown;
  rawBody?: unknown;
  body?: unknown;
  readableEnded?: unknown;
  complete?: unknown;
  socket?: { remoteAddress?: unknown } | null;
  connection?: { remoteAddress?: unknown } | null;
  ip?: unknown;
  on?: (event: string, listener: (...args: unknown[]) => void) => unknown;
  off?: (event: string, listener: (...args: unknown[]) => void) => unknown;
  pause?: () => unknown;
}

export interface PublicAgentServiceAcceptancePersistenceExpressResponseLikeV1 {
  headersSent?: boolean;
  writableEnded?: boolean;
  statusCode?: number;
  setHeader?: (name: string, value: string) => unknown;
  end?: (body?: string) => unknown;
}

export type PublicAgentServiceAcceptancePersistenceExpressNextV1 =
  (error?: unknown) => unknown;

export type PublicAgentServiceAcceptancePersistenceExpressMiddlewareV1 = (
  request: PublicAgentServiceAcceptancePersistenceExpressRequestLikeV1,
  response: PublicAgentServiceAcceptancePersistenceExpressResponseLikeV1,
  next: PublicAgentServiceAcceptancePersistenceExpressNextV1,
) => unknown;

export interface PublicAgentServiceAcceptancePersistenceExpressAppLikeV1 {
  use: (
    middleware:
      PublicAgentServiceAcceptancePersistenceExpressMiddlewareV1,
  ) => unknown;
  _router?: { stack?: unknown[] } | null;
  router?: { stack?: unknown[] } | null;
}

export interface PublicAgentServiceAcceptancePersistenceHttpRouteServerBootstrapCompositionDependenciesV1 {
  executeIntegration:
    typeof executePublicAgentServiceAcceptancePersistenceHttpRouteServerRegistrarIntegrationFromEnvironmentV1;
}

export interface PublicAgentServiceAcceptancePersistenceHttpRouteServerBootstrapCompositionAuthorityV1 {
  express_app_provider_access: boolean;
  express_route_stack_snapshot_read: boolean;
  express_dispatcher_installation: boolean;
  server_route_registry_snapshot_read: boolean;
  server_route_registry_compare_and_swap: boolean;
  network_listener_creation: false;
  external_http_submission: false;
  production_acceptance_persistence: false;
  production_replay_write: false;
  payment_authorization: false;
  payment_execution: false;
  execution_authorization: false;
  work_dispatch: false;
  production_signing: false;
  transaction_broadcast: false;
  work_credit_write: false;
  money_movement: false;
}

export interface PublicAgentServiceAcceptancePersistenceHttpRouteServerBootstrapCompositionResultV1 {
  marker:
    typeof PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_COMPOSITION_RESULT_MARKER;
  version:
    typeof PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_COMPOSITION_VERSION;
  status:
    | "disabled"
    | "integration_disabled"
    | "mount_disabled"
    | "route_disabled"
    | "planned"
    | "mounted"
    | "already_mounted";
  enabled: boolean;
  apply: boolean;
  confirmation_verified: boolean;
  integration_confirmation_verified: boolean;
  mount_confirmation_verified: boolean;
  app_provider_invoked: boolean;
  registry_created: boolean;
  route_stack_snapshot_count: number;
  compare_and_swap_attempt_count: number;
  compare_and_swap_apply_count: number;
  dispatcher_install_count: number;
  exact_managed_route_count: number;
  integration:
    PublicAgentServiceAcceptancePersistenceHttpRouteServerRegistrarIntegrationResultV1 | null;
  authority:
    PublicAgentServiceAcceptancePersistenceHttpRouteServerBootstrapCompositionAuthorityV1;
}

interface ExpressRegistryObservationV1 {
  stack_snapshot_count: number;
  compare_and_swap_attempt_count: number;
  compare_and_swap_apply_count: number;
  dispatcher_install_count: number;
  exact_managed_route_count: number;
}

interface ExpressRegistryStateV1 {
  managedRoutes:
    readonly PublicAgentServiceAcceptancePersistenceHttpRouteServerRegistryEntryV1[];
  dispatcher:
    PublicAgentServiceAcceptancePersistenceExpressMiddlewareV1 | null;
  sentinels:
    Map<string, PublicAgentServiceAcceptancePersistenceHttpRouteServerRegistryEntryV1["handle"]>;
  stackSnapshotCount: number;
  compareAndSwapAttemptCount: number;
  compareAndSwapApplyCount: number;
  dispatcherInstallCount: number;
}

interface ScannedRouteV1 {
  method: string;
  path: string;
  signature: string;
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

function isObjectLike(
  value: unknown,
): value is Record<string, unknown> | Function {
  return Boolean(
    value
      && (typeof value === "object" || typeof value === "function"),
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
    JSON.stringify(actual) === JSON.stringify(expected),
    `${label} must contain exactly: ${expected.join(", ")}`,
  );
}

function requireString(
  value: unknown,
  label: string,
  maximum: number,
): string {
  assertCondition(
    typeof value === "string",
    `${label} must be a string`,
  );
  assertCondition(
    value.length <= maximum,
    `${label} is too long`,
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

function parseFlag(
  value: string | undefined,
  label: string,
): boolean {
  if (value === undefined || value === "") return false;
  assertCondition(
    value === "0" || value === "1",
    `${label} must be 0 or 1`,
  );
  return value === "1";
}

function sha256Text(value: string): string {
  return createHash("sha256")
    .update(value, "utf8")
    .digest("hex");
}

function functionIdentity(value: Function): string {
  const existing = FUNCTION_IDS.get(value);
  if (existing) return existing;
  const created = `fn-${nextFunctionId}`;
  nextFunctionId += 1;
  FUNCTION_IDS.set(value, created);
  return created;
}

function normalizePath(value: unknown): string | null {
  if (typeof value !== "string") return null;
  if (!value.startsWith("/")) return null;
  if (value.length > 4096 || /[\u0000-\u001f\u007f]/.test(value)) return null;
  return value;
}

function normalizeMethod(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const method = value.toUpperCase();
  return /^[A-Z]+$/.test(method) ? method : null;
}

function appStack(
  app: PublicAgentServiceAcceptancePersistenceExpressAppLikeV1,
): unknown[] {
  const stack = app._router?.stack ?? app.router?.stack;
  if (stack === undefined) return [];
  assertCondition(
    Array.isArray(stack),
    "Express route stack must be an array",
  );
  return stack;
}

function routePaths(value: unknown): string[] {
  if (typeof value === "string") {
    const normalized = normalizePath(value);
    return normalized ? [normalized] : [];
  }
  if (Array.isArray(value)) {
    return value.flatMap((entry) => routePaths(entry));
  }
  return [];
}

function routeMethods(value: unknown): string[] {
  if (!isRecord(value)) return [];
  const methods = Object.entries(value)
    .filter(([, enabled]) => enabled === true)
    .map(([method]) => method === "_all" ? "ALL" : method.toUpperCase())
    .filter((method) => /^[A-Z]+$/.test(method));
  return [...new Set(methods)].sort();
}

function scanRouteLayers(
  stack: readonly unknown[],
): {
  routes: ScannedRouteV1[];
  stackSignature: string;
} {
  const routes: ScannedRouteV1[] = [];
  const descriptors: unknown[] = [];
  const seenStacks = new Set<readonly unknown[]>();

  const visit = (
    layers: readonly unknown[],
    depth: number,
  ): void => {
    assertCondition(
      depth <= 12,
      "Express route stack nesting exceeds limit",
    );
    if (seenStacks.has(layers)) return;
    seenStacks.add(layers);

    layers.forEach((rawLayer, index) => {
      const layer = isRecord(rawLayer) ? rawLayer : {};
      const route = isRecord(layer.route) ? layer.route : null;
      const handle = typeof layer.handle === "function" ? layer.handle : null;
      const handleStack = handle
        ? (handle as unknown as { stack?: unknown }).stack
        : undefined;
      const nested = Array.isArray(handleStack)
        ? handleStack
        : isRecord(layer.handle) && Array.isArray(layer.handle.stack)
          ? layer.handle.stack
          : null;
      const layerDescriptor: Record<string, unknown> = {
        depth,
        index,
        name: typeof layer.name === "string" ? layer.name : "",
        regexp: layer.regexp instanceof RegExp ? String(layer.regexp) : "",
        handle: handle ? functionIdentity(handle) : "",
      };

      if (route) {
        const paths = routePaths(route.path);
        const methods = routeMethods(route.methods);
        const routeStack = Array.isArray(route.stack) ? route.stack : [];
        const handlerIds = routeStack.map((entry) => {
          const record = isRecord(entry) ? entry : {};
          return typeof record.handle === "function"
            ? functionIdentity(record.handle)
            : "";
        });
        layerDescriptor.route = {
          paths,
          methods,
          handler_ids: handlerIds,
        };
        for (const path of paths) {
          for (const method of methods) {
            routes.push({
              method,
              path,
              signature: sha256Text(
                JSON.stringify({
                  depth,
                  index,
                  method,
                  path,
                  handlerIds,
                }),
              ),
            });
          }
        }
      }

      descriptors.push(layerDescriptor);
      if (nested) visit(nested, depth + 1);
    });
  };

  visit(stack, 0);
  return {
    routes,
    stackSignature: sha256Text(JSON.stringify(descriptors)),
  };
}

function stateFor(
  app: PublicAgentServiceAcceptancePersistenceExpressAppLikeV1,
): ExpressRegistryStateV1 {
  const key = app as object;
  const existing = APP_STATES.get(key);
  if (existing) return existing;
  const created: ExpressRegistryStateV1 = {
    managedRoutes: Object.freeze([]),
    dispatcher: null,
    sentinels: new Map(),
    stackSnapshotCount: 0,
    compareAndSwapAttemptCount: 0,
    compareAndSwapApplyCount: 0,
    dispatcherInstallCount: 0,
  };
  APP_STATES.set(key, created);
  return created;
}

function sentinelHandle(
  state: ExpressRegistryStateV1,
  key: string,
): PublicAgentServiceAcceptancePersistenceHttpRouteServerRegistryEntryV1["handle"] {
  const existing = state.sentinels.get(key);
  if (existing) return existing;
  const created = () => fail("unmanaged Express route sentinel cannot be invoked");
  state.sentinels.set(key, created);
  return created;
}

function snapshotFor(
  app: PublicAgentServiceAcceptancePersistenceExpressAppLikeV1,
  state: ExpressRegistryStateV1,
  countRead: boolean,
): PublicAgentServiceAcceptancePersistenceHttpRouteServerRegistrySnapshotV1 {
  if (countRead) state.stackSnapshotCount += 1;
  const stack = appStack(app);
  const scanned = scanRouteLayers(stack);
  const grouped = new Map<string, string[]>();

  for (const route of scanned.routes) {
    const key = `${route.method}\n${route.path}`;
    const values = grouped.get(key) ?? [];
    values.push(route.signature);
    grouped.set(key, values);
  }

  const unmanaged: PublicAgentServiceAcceptancePersistenceHttpRouteServerRegistryEntryV1[] = [];
  const canonicalConflicts = new Set<string>();

  for (const [key, signatures] of grouped) {
    const separator = key.indexOf("\n");
    const method = key.slice(0, separator);
    const path = key.slice(separator + 1);
    if (CANONICAL_PATHS.has(path)) {
      canonicalConflicts.add(path);
      continue;
    }
    const handlerId = `void.express-unmanaged-route.${sha256Text(
      JSON.stringify([...signatures].sort()),
    ).slice(0, 32)}`;
    unmanaged.push(Object.freeze({
      method,
      path,
      handler_id: handlerId,
      handle: sentinelHandle(state, `${method}\n${path}\n${handlerId}`),
    }));
  }

  const canonical: PublicAgentServiceAcceptancePersistenceHttpRouteServerRegistryEntryV1[] = [];
  for (const route of state.managedRoutes) {
    if (canonicalConflicts.has(route.path)) {
      const handlerId = `void.express-unmanaged-canonical-conflict.${sha256Text(route.path).slice(0, 24)}`;
      canonical.push(Object.freeze({
        method: "ALL",
        path: route.path,
        handler_id: handlerId,
        handle: sentinelHandle(state, `ALL\n${route.path}\n${handlerId}`),
      }));
    } else {
      canonical.push(route);
    }
  }

  if (state.managedRoutes.length === 0) {
    for (const path of [...canonicalConflicts].sort()) {
      const handlerId = `void.express-unmanaged-canonical-conflict.${sha256Text(path).slice(0, 24)}`;
      canonical.push(Object.freeze({
        method: "ALL",
        path,
        handler_id: handlerId,
        handle: sentinelHandle(state, `ALL\n${path}\n${handlerId}`),
      }));
    }
  }

  const routes = Object.freeze([
    ...unmanaged.sort((left, right) =>
      `${left.method}\n${left.path}`.localeCompare(`${right.method}\n${right.path}`)),
    ...canonical.sort((left, right) => left.path.localeCompare(right.path)),
  ]);
  assertCondition(
    routes.length <= MAX_ROUTE_COUNT,
    "Express route snapshot exceeds route-count limit",
  );

  const revision = sha256Text(JSON.stringify({
    stack: scanned.stackSignature,
    managed: state.managedRoutes.map((route) => ({
      method: route.method,
      path: route.path,
      handler_id: route.handler_id,
      handle: functionIdentity(route.handle),
    })),
  }));

  return Object.freeze({
    revision,
    routes,
  });
}

function assertEntrySequenceExact(
  expected: readonly PublicAgentServiceAcceptancePersistenceHttpRouteServerRegistryEntryV1[],
  actual: readonly PublicAgentServiceAcceptancePersistenceHttpRouteServerRegistryEntryV1[],
): void {
  assertCondition(
    expected.length === actual.length,
    "route sequence length changed",
  );
  expected.forEach((entry, index) => {
    const candidate = actual[index];
    assertCondition(
      candidate !== undefined
        && candidate.method === entry.method
        && candidate.path === entry.path
        && candidate.handler_id === entry.handler_id
        && candidate.handle === entry.handle,
      `route sequence changed at index ${index}`,
    );
  });
}

function requestPath(
  request: PublicAgentServiceAcceptancePersistenceExpressRequestLikeV1,
): string {
  const direct = normalizePath(request.path);
  if (direct) return direct;
  const raw = typeof request.originalUrl === "string"
    ? request.originalUrl
    : typeof request.url === "string"
      ? request.url
      : "/";
  try {
    return new URL(raw, "http://127.0.0.1").pathname;
  } catch {
    return "/";
  }
}

function requestHeaders(
  value: unknown,
): Record<string, string> {
  if (!isRecord(value)) return {};
  const headers: Record<string, string> = {};
  for (const [rawName, rawValue] of Object.entries(value)) {
    const name = rawName.toLowerCase();
    if (rawValue === undefined) continue;
    if (Array.isArray(rawValue)) {
      headers[name] = rawValue.map((entry) => String(entry)).join(", ");
    } else {
      headers[name] = String(rawValue);
    }
  }
  return headers;
}

function bufferedBody(
  request: PublicAgentServiceAcceptancePersistenceExpressRequestLikeV1,
): { body: string; reconstructed: boolean } | null {
  const raw = request.rawBody;
  if (typeof raw === "string") return { body: raw, reconstructed: false };
  if (Buffer.isBuffer(raw)) return { body: raw.toString("utf8"), reconstructed: false };

  const ended = request.readableEnded === true || request.complete === true;
  if (!ended) return null;
  const body = request.body;
  if (body === undefined || body === null) return { body: "", reconstructed: false };
  if (typeof body === "string") return { body, reconstructed: false };
  if (Buffer.isBuffer(body)) return { body: body.toString("utf8"), reconstructed: false };
  return { body: JSON.stringify(body), reconstructed: true };
}

function collectBody(
  request: PublicAgentServiceAcceptancePersistenceExpressRequestLikeV1,
): Promise<{ body: string; reconstructed: boolean }> {
  const immediate = bufferedBody(request);
  if (immediate) return Promise.resolve(immediate);
  if (typeof request.on !== "function") {
    return Promise.resolve({ body: "", reconstructed: false });
  }

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let total = 0;
    let settled = false;

    const cleanup = (): void => {
      if (typeof request.off !== "function") return;
      request.off("data", onData);
      request.off("end", onEnd);
      request.off("error", onError);
      request.off("aborted", onAborted);
    };
    const finish = (
      action: () => void,
    ): void => {
      if (settled) return;
      settled = true;
      cleanup();
      action();
    };
    const onData = (value: unknown): void => {
      const chunk = Buffer.isBuffer(value)
        ? value
        : Buffer.from(String(value), "utf8");
      total += chunk.length;
      if (total > MAX_REQUEST_BODY_BYTES) {
        try { request.pause?.(); } catch { /* no authority added */ }
        finish(() => reject(new Error("request body exceeds hard adapter limit")));
        return;
      }
      chunks.push(chunk);
    };
    const onEnd = (): void => finish(() => resolve({
      body: Buffer.concat(chunks).toString("utf8"),
      reconstructed: false,
    }));
    const onError = (error: unknown): void => finish(() => reject(error));
    const onAborted = (): void => finish(() => reject(new Error("request aborted")));

    request.on?.("data", onData);
    request.on?.("end", onEnd);
    request.on?.("error", onError);
    request.on?.("aborted", onAborted);
  });
}

function normalizedRequest(
  request: PublicAgentServiceAcceptancePersistenceExpressRequestLikeV1,
  body: string,
  reconstructed: boolean,
): PublicAgentServiceAcceptancePersistenceHttpRequestV1 {
  const method = normalizeMethod(request.method) ?? "GET";
  const headers = requestHeaders(request.headers);
  if (reconstructed) {
    headers["content-length"] = String(Buffer.byteLength(body, "utf8"));
  }
  const remoteAddress = [
    request.socket?.remoteAddress,
    request.connection?.remoteAddress,
    request.ip,
  ].find((value) => typeof value === "string" && value.length > 0);

  return {
    marker: PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_REQUEST_MARKER,
    version: PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_VERSION,
    method,
    path: requestPath(request),
    remote_address:
      typeof remoteAddress === "string" ? remoteAddress : "0.0.0.0",
    headers,
    body,
  };
}

function errorBody(code: string): string {
  return `${JSON.stringify({
    marker:
      PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_COMPOSITION_ERROR_MARKER,
    version:
      PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_COMPOSITION_VERSION,
    error: code,
  })}\n`;
}

function sendAdapterError(
  response: PublicAgentServiceAcceptancePersistenceExpressResponseLikeV1,
  statusCode: number,
  code: string,
): void {
  const body = errorBody(code);
  response.statusCode = statusCode;
  response.setHeader?.("cache-control", "no-store");
  response.setHeader?.("content-type", "application/json; charset=utf-8");
  response.setHeader?.("content-length", String(Buffer.byteLength(body, "utf8")));
  response.setHeader?.("x-content-type-options", "nosniff");
  response.end?.(body);
}

function sendRouteResponse(
  response: PublicAgentServiceAcceptancePersistenceExpressResponseLikeV1,
  routeResponse: PublicAgentServiceAcceptancePersistenceHttpResponseV1,
): void {
  assertCondition(
    Number.isInteger(routeResponse.status_code)
      && routeResponse.status_code >= 100
      && routeResponse.status_code <= 599,
    "sealed route returned invalid HTTP status",
  );
  assertCondition(
    typeof routeResponse.body === "string",
    "sealed route returned invalid body",
  );
  assertCondition(
    isRecord(routeResponse.headers),
    "sealed route returned invalid headers",
  );
  response.statusCode = routeResponse.status_code;
  for (const [name, value] of Object.entries(routeResponse.headers)) {
    assertCondition(
      typeof value === "string",
      "sealed route returned non-string header",
    );
    response.setHeader?.(name, value);
  }
  response.end?.(routeResponse.body);
}

function createDispatcher(
  routes:
    readonly PublicAgentServiceAcceptancePersistenceHttpRouteServerRegistryEntryV1[],
): PublicAgentServiceAcceptancePersistenceExpressMiddlewareV1 {
  const byPath = new Map(routes.map((route) => [route.path, route.handle] as const));
  return (
    request,
    response,
    next,
  ) => {
    const handle = byPath.get(requestPath(request));
    if (!handle) return next();
    void collectBody(request)
      .then(({ body, reconstructed }) => {
        if (response.writableEnded === true) return;
        const routeResponse = handle(
          normalizedRequest(request, body, reconstructed),
        );
        sendRouteResponse(response, routeResponse);
      })
      .catch((error) => {
        if (response.headersSent === true || response.writableEnded === true) {
          next(error);
          return;
        }
        const message = error instanceof Error ? error.message : String(error);
        sendAdapterError(
          response,
          message.includes("hard adapter limit") ? 413 : 400,
          message.includes("hard adapter limit")
            ? "payload_too_large"
            : "request_body_unavailable",
        );
      });
    return undefined;
  };
}

function removeDispatcherLayer(
  app: PublicAgentServiceAcceptancePersistenceExpressAppLikeV1,
  dispatcher: PublicAgentServiceAcceptancePersistenceExpressMiddlewareV1,
): void {
  const stack = appStack(app);
  for (let index = stack.length - 1; index >= 0; index -= 1) {
    const rawLayer = stack[index];
    const layer: Record<string, unknown> = isRecord(rawLayer)
      ? rawLayer
      : {};
    if (layer.handle === dispatcher) stack.splice(index, 1);
  }
}

export function createPublicAgentServiceAcceptancePersistenceHttpRouteServerExpressRegistryV1(
  appValue: unknown,
): {
  registry:
    PublicAgentServiceAcceptancePersistenceHttpRouteServerRegistryV1;
  observe: () => ExpressRegistryObservationV1;
} {
  assertCondition(
    isObjectLike(appValue),
    "Express app must be an object or callable function",
  );
  const app = appValue as unknown as
    PublicAgentServiceAcceptancePersistenceExpressAppLikeV1;
  assertCondition(
    typeof app.use === "function",
    "Express app.use must be callable",
  );
  const state = stateFor(app);

  const registry:
    PublicAgentServiceAcceptancePersistenceHttpRouteServerRegistryV1 =
      Object.freeze({
        readExactRouteSnapshot: () => snapshotFor(app, state, true),
        compareAndSwapExactRouteSnapshot:
          (
            expectedRevision: string,
            routesValue:
              readonly PublicAgentServiceAcceptancePersistenceHttpRouteServerRegistryEntryV1[],
          ) => {
            state.compareAndSwapAttemptCount += 1;
            assertCondition(
              typeof expectedRevision === "string"
                && expectedRevision.length === 64,
              "expected route revision must be a SHA-256 string",
            );
            assertCondition(
              Array.isArray(routesValue),
              "next route snapshot must be an array",
            );
            const current = snapshotFor(app, state, false);
            assertCondition(
              current.revision === expectedRevision,
              "stale Express route revision",
            );
            assertCondition(
              state.managedRoutes.length === 0,
              "Express dispatcher is already installed",
            );
            assertCondition(
              routesValue.length === current.routes.length + 2,
              "Express route compare-and-swap must append exactly two routes",
            );
            assertEntrySequenceExact(
              current.routes,
              routesValue.slice(0, current.routes.length),
            );
            const additions = routesValue.slice(current.routes.length);
            assertCondition(
              additions.every((entry) =>
                entry.method === "ALL"
                  && CANONICAL_PATHS.has(entry.path)
                  && typeof entry.handle === "function"),
              "Express route compare-and-swap additions are not canonical",
            );
            assertCondition(
              new Set(additions.map((entry) => entry.path)).size === 2,
              "Express route compare-and-swap canonical path set changed",
            );
            assertCondition(
              additions[0]?.handle === additions[1]?.handle,
              "Express route compare-and-swap requires one exact handler",
            );

            const dispatcher = createDispatcher(additions);
            const beforeLayers = [...appStack(app)];
            try {
              app.use(dispatcher);
              const afterLayers = appStack(app);
              const existingOrder = beforeLayers.every(
                (layer, index) => afterLayers[index] === layer,
              );
              const dispatcherLayers = afterLayers.filter((rawLayer) => {
                const layer = isRecord(rawLayer) ? rawLayer : {};
                return layer.handle === dispatcher;
              });
              assertCondition(
                existingOrder,
                "Express app.use reordered existing route layers",
              );
              assertCondition(
                dispatcherLayers.length === 1,
                "Express dispatcher installation was not exactly once",
              );
            } catch (error) {
              removeDispatcherLayer(app, dispatcher);
              throw error;
            }

            state.managedRoutes = Object.freeze(additions.map((entry) =>
              Object.freeze({
                method: entry.method,
                path: entry.path,
                handler_id: entry.handler_id,
                handle: entry.handle,
              })));
            state.dispatcher = dispatcher;
            state.compareAndSwapApplyCount += 1;
            state.dispatcherInstallCount += 1;
            const next = snapshotFor(app, state, false);

            return Object.freeze({
              applied: true,
              previous_revision: current.revision,
              next_revision: next.revision,
              route_count: routesValue.length,
            } satisfies PublicAgentServiceAcceptancePersistenceHttpRouteServerRegistryCompareAndSwapReceiptV1);
          },
      });

  return Object.freeze({
    registry,
    observe: () => Object.freeze({
      stack_snapshot_count: state.stackSnapshotCount,
      compare_and_swap_attempt_count: state.compareAndSwapAttemptCount,
      compare_and_swap_apply_count: state.compareAndSwapApplyCount,
      dispatcher_install_count: state.dispatcherInstallCount,
      exact_managed_route_count: state.managedRoutes.length,
    }),
  });
}

export function validatePublicAgentServiceAcceptancePersistenceHttpRouteServerBootstrapCompositionConfigV1(
  value: unknown,
): PublicAgentServiceAcceptancePersistenceHttpRouteServerBootstrapCompositionConfigV1 {
  const root = requireRecord(
    value,
    "acceptance persistence HTTP route server bootstrap composition config",
  );
  requireExactKeys(root, "acceptance persistence HTTP route server bootstrap composition config", [
    "marker",
    "version",
    "enabled",
  ]);
  assertCondition(
    root.marker
      === PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_COMPOSITION_CONFIG_MARKER,
    "server bootstrap composition config marker mismatch",
  );
  assertCondition(
    root.version
      === PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_COMPOSITION_VERSION,
    "server bootstrap composition config version mismatch",
  );
  return {
    marker:
      PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_COMPOSITION_CONFIG_MARKER,
    version:
      PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_COMPOSITION_VERSION,
    enabled: requireBoolean(root.enabled, "enabled"),
  };
}

export function validatePublicAgentServiceAcceptancePersistenceHttpRouteServerBootstrapCompositionCommandV1(
  value: unknown,
): PublicAgentServiceAcceptancePersistenceHttpRouteServerBootstrapCompositionCommandV1 {
  const root = requireRecord(
    value,
    "acceptance persistence HTTP route server bootstrap composition command",
  );
  requireExactKeys(root, "acceptance persistence HTTP route server bootstrap composition command", [
    "marker",
    "version",
    "apply",
    "confirmation",
    "integration_confirmation",
    "mount_confirmation",
  ]);
  assertCondition(
    root.marker
      === PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_COMPOSITION_COMMAND_MARKER,
    "server bootstrap composition command marker mismatch",
  );
  assertCondition(
    root.version
      === PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_COMPOSITION_VERSION,
    "server bootstrap composition command version mismatch",
  );
  return {
    marker:
      PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_COMPOSITION_COMMAND_MARKER,
    version:
      PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_COMPOSITION_VERSION,
    apply: requireBoolean(root.apply, "apply"),
    confirmation: requireString(root.confirmation, "confirmation", 128),
    integration_confirmation:
      requireString(root.integration_confirmation, "integration_confirmation", 128),
    mount_confirmation:
      requireString(root.mount_confirmation, "mount_confirmation", 128),
  };
}

export function loadPublicAgentServiceAcceptancePersistenceHttpRouteServerBootstrapCompositionConfigFromEnvironmentV1(
  environment: NodeJS.ProcessEnv,
): PublicAgentServiceAcceptancePersistenceHttpRouteServerBootstrapCompositionConfigV1 {
  return validatePublicAgentServiceAcceptancePersistenceHttpRouteServerBootstrapCompositionConfigV1({
    marker:
      PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_COMPOSITION_CONFIG_MARKER,
    version:
      PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_COMPOSITION_VERSION,
    enabled: parseFlag(
      environment[
        PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_COMPOSITION_ENABLED_ENV
      ],
      PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_COMPOSITION_ENABLED_ENV,
    ),
  });
}

export const PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_COMPOSITION_DEFAULT_DEPENDENCIES_V1:
  PublicAgentServiceAcceptancePersistenceHttpRouteServerBootstrapCompositionDependenciesV1 =
    Object.freeze({
      executeIntegration:
        executePublicAgentServiceAcceptancePersistenceHttpRouteServerRegistrarIntegrationFromEnvironmentV1,
    });

export function publicAgentServiceAcceptancePersistenceHttpRouteServerBootstrapCompositionDefaultDependencyIdentityV1(): {
  execute_integration_exact: boolean;
} {
  return Object.freeze({
    execute_integration_exact:
      PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_COMPOSITION_DEFAULT_DEPENDENCIES_V1.executeIntegration
        === executePublicAgentServiceAcceptancePersistenceHttpRouteServerRegistrarIntegrationFromEnvironmentV1,
  });
}

function emptyObservation(): ExpressRegistryObservationV1 {
  return Object.freeze({
    stack_snapshot_count: 0,
    compare_and_swap_attempt_count: 0,
    compare_and_swap_apply_count: 0,
    dispatcher_install_count: 0,
    exact_managed_route_count: 0,
  });
}

function authority(
  appProviderInvoked: boolean,
  observation: ExpressRegistryObservationV1,
  integration:
    PublicAgentServiceAcceptancePersistenceHttpRouteServerRegistrarIntegrationResultV1 | null,
): PublicAgentServiceAcceptancePersistenceHttpRouteServerBootstrapCompositionAuthorityV1 {
  return Object.freeze({
    express_app_provider_access: appProviderInvoked,
    express_route_stack_snapshot_read:
      observation.stack_snapshot_count > 0,
    express_dispatcher_installation:
      observation.dispatcher_install_count > 0,
    server_route_registry_snapshot_read:
      integration?.authority.server_route_registry_snapshot_read ?? false,
    server_route_registry_compare_and_swap:
      integration?.authority.server_route_registry_compare_and_swap ?? false,
    network_listener_creation: false,
    external_http_submission: false,
    production_acceptance_persistence: false,
    production_replay_write: false,
    payment_authorization: false,
    payment_execution: false,
    execution_authorization: false,
    work_dispatch: false,
    production_signing: false,
    transaction_broadcast: false,
    work_credit_write: false,
    money_movement: false,
  });
}

function result(
  status:
    PublicAgentServiceAcceptancePersistenceHttpRouteServerBootstrapCompositionResultV1["status"],
  enabled: boolean,
  apply: boolean,
  confirmationVerified: boolean,
  integrationConfirmationVerified: boolean,
  mountConfirmationVerified: boolean,
  appProviderInvoked: boolean,
  registryCreated: boolean,
  observation: ExpressRegistryObservationV1,
  integration:
    PublicAgentServiceAcceptancePersistenceHttpRouteServerRegistrarIntegrationResultV1 | null,
): PublicAgentServiceAcceptancePersistenceHttpRouteServerBootstrapCompositionResultV1 {
  return Object.freeze({
    marker:
      PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_COMPOSITION_RESULT_MARKER,
    version:
      PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_COMPOSITION_VERSION,
    status,
    enabled,
    apply,
    confirmation_verified: confirmationVerified,
    integration_confirmation_verified: integrationConfirmationVerified,
    mount_confirmation_verified: mountConfirmationVerified,
    app_provider_invoked: appProviderInvoked,
    registry_created: registryCreated,
    route_stack_snapshot_count: observation.stack_snapshot_count,
    compare_and_swap_attempt_count: observation.compare_and_swap_attempt_count,
    compare_and_swap_apply_count: observation.compare_and_swap_apply_count,
    dispatcher_install_count: observation.dispatcher_install_count,
    exact_managed_route_count: observation.exact_managed_route_count,
    integration,
    authority: authority(appProviderInvoked, observation, integration),
  });
}

function inertRegistry(): PublicAgentServiceAcceptancePersistenceHttpRouteServerRegistryV1 {
  return Object.freeze({
    readExactRouteSnapshot: () => fail("disabled or dry-run composition accessed route registry"),
    compareAndSwapExactRouteSnapshot: () => fail("disabled or dry-run composition mutated route registry"),
  });
}

function mapStatus(
  integration: PublicAgentServiceAcceptancePersistenceHttpRouteServerRegistrarIntegrationResultV1,
): PublicAgentServiceAcceptancePersistenceHttpRouteServerBootstrapCompositionResultV1["status"] {
  return integration.status === "disabled"
    ? "integration_disabled"
    : integration.status;
}

export function executePublicAgentServiceAcceptancePersistenceHttpRouteServerBootstrapCompositionV1(
  configValue: unknown,
  commandValue: unknown,
  environment: NodeJS.ProcessEnv,
  appProvider: () => unknown,
  trustedContextProvider: () => unknown,
  dependencies:
    PublicAgentServiceAcceptancePersistenceHttpRouteServerBootstrapCompositionDependenciesV1 =
      PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_COMPOSITION_DEFAULT_DEPENDENCIES_V1,
): PublicAgentServiceAcceptancePersistenceHttpRouteServerBootstrapCompositionResultV1 {
  const config =
    validatePublicAgentServiceAcceptancePersistenceHttpRouteServerBootstrapCompositionConfigV1(
      configValue,
    );
  if (!config.enabled) {
    return result(
      "disabled",
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      emptyObservation(),
      null,
    );
  }

  const command =
    validatePublicAgentServiceAcceptancePersistenceHttpRouteServerBootstrapCompositionCommandV1(
      commandValue,
    );
  const confirmationVerified = !command.apply
    || command.confirmation
      === PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_COMPOSITION_CONFIRMATION;
  const integrationConfirmationVerified = !command.apply
    || command.integration_confirmation
      === PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_CONFIRMATION;
  const mountConfirmationVerified = !command.apply
    || command.mount_confirmation
      === PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_CONFIRMATION;
  assertCondition(
    confirmationVerified,
    "applied server bootstrap composition requires exact confirmation",
  );
  assertCondition(
    integrationConfirmationVerified,
    "applied server bootstrap composition requires exact integration confirmation",
  );
  assertCondition(
    mountConfirmationVerified,
    "applied server bootstrap composition requires exact mount confirmation",
  );
  assertCondition(
    command.apply
      || (
        command.confirmation === ""
        && command.integration_confirmation === ""
        && command.mount_confirmation === ""
      ),
    "dry-run server bootstrap composition confirmations must be empty",
  );

  const integrationCommand = Object.freeze({
    marker:
      PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_COMMAND_MARKER,
    version:
      PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_VERSION,
    apply: command.apply,
    confirmation: command.integration_confirmation,
    mount_confirmation: command.mount_confirmation,
  });

  const allUpstreamEnabled =
    environment[
      PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_ENABLED_ENV
    ] === "1"
    && environment[
      PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_ENABLED_ENV
    ] === "1"
    && environment[
      PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_ENABLED_ENV
    ] === "1";

  if (!command.apply || !allUpstreamEnabled) {
    const integration = dependencies.executeIntegration(
      environment,
      integrationCommand,
      trustedContextProvider,
      inertRegistry(),
    );
    return result(
      mapStatus(integration),
      true,
      command.apply,
      confirmationVerified,
      integrationConfirmationVerified,
      mountConfirmationVerified,
      false,
      false,
      emptyObservation(),
      integration,
    );
  }

  const app = appProvider();
  const adapted =
    createPublicAgentServiceAcceptancePersistenceHttpRouteServerExpressRegistryV1(
      app,
    );
  const integration = dependencies.executeIntegration(
    environment,
    integrationCommand,
    trustedContextProvider,
    adapted.registry,
  );
  const observation = adapted.observe();

  return result(
    mapStatus(integration),
    true,
    true,
    confirmationVerified,
    integrationConfirmationVerified,
    mountConfirmationVerified,
    true,
    true,
    observation,
    integration,
  );
}

export function executePublicAgentServiceAcceptancePersistenceHttpRouteServerBootstrapCompositionFromEnvironmentV1(
  environment: NodeJS.ProcessEnv,
  commandValue: unknown,
  appProvider: () => unknown,
  trustedContextProvider: () => unknown,
  dependencies:
    PublicAgentServiceAcceptancePersistenceHttpRouteServerBootstrapCompositionDependenciesV1 =
      PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_COMPOSITION_DEFAULT_DEPENDENCIES_V1,
): PublicAgentServiceAcceptancePersistenceHttpRouteServerBootstrapCompositionResultV1 {
  return executePublicAgentServiceAcceptancePersistenceHttpRouteServerBootstrapCompositionV1(
    loadPublicAgentServiceAcceptancePersistenceHttpRouteServerBootstrapCompositionConfigFromEnvironmentV1(
      environment,
    ),
    commandValue,
    environment,
    appProvider,
    trustedContextProvider,
    dependencies,
  );
}

export function publicAgentServiceAcceptancePersistenceHttpRouteServerBootstrapCompositionSourceTopologyV1(): {
  expected_app_creation: "const app = express();";
  expected_app_export: "(globalThis as any).__void_http_app = app;";
  expected_listener_owner: "src/index.ts";
  modifies_index: false;
} {
  return Object.freeze({
    expected_app_creation: "const app = express();",
    expected_app_export: "(globalThis as any).__void_http_app = app;",
    expected_listener_owner: "src/index.ts",
    modifies_index: false,
  });
}
