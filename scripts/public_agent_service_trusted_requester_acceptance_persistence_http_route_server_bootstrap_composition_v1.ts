import { createHash } from "node:crypto";

import {
  PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_ENABLED_ENV,
  PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_REQUEST_MARKER,
  PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_VERSION,
  PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_STATUS_PATH,
  PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_COMMAND_PATH,
  type PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRequestV1,
  type PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpResponseV1,
} from "./public_agent_service_trusted_requester_acceptance_persistence_http_route_binding_v1.js";
import {
  PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_HANDLER_ID,
  PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_METHOD,
  PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_CONFIRMATION,
  PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_ENABLED_ENV,
  type PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerMountDependenciesV1,
} from "./public_agent_service_trusted_requester_acceptance_persistence_http_route_server_mount_binding_v1.js";
import {
  PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_COMMAND_MARKER,
  PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_CONFIRMATION,
  PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_ENABLED_ENV,
  PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_VERSION,
  executePublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerRegistrarIntegrationFromEnvironmentV1,
  type PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerRegistrarIntegrationResultV1,
  type PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerRegistryEntryV1,
  type PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerRegistryV1,
} from "./public_agent_service_trusted_requester_acceptance_persistence_http_route_server_registrar_integration_v1.js";
export const PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_COMPOSITION_MARKER =
  "VOID_PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_COMPOSITION_V1" as const;
export const PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_COMPOSITION_CONFIG_MARKER =
  "VOID_PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_COMPOSITION_CONFIG_V1" as const;
export const PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_COMPOSITION_COMMAND_MARKER =
  "VOID_PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_COMPOSITION_COMMAND_V1" as const;
export const PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_COMPOSITION_RESULT_MARKER =
  "VOID_PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_COMPOSITION_RESULT_V1" as const;
export const PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_COMPOSITION_EXAMPLE_MARKER =
  "VOID_PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_COMPOSITION_EXAMPLE_V1" as const;
export const PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_COMPOSITION_VERSION =
  1 as const;

export const PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_COMPOSITION_ENABLED_ENV =
  "VOID_PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_COMPOSITION_ENABLED" as const;
export const PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_COMPOSITION_CONFIRMATION =
  "bootstrapTrustedRequesterAcceptancePersistenceHttpRouteServerCompositionV1" as const;
export const PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_COMPOSITION_ADAPTER_ID =
  "void.public-agent-service-trusted-requester-acceptance-persistence-http-route-server-bootstrap-composition.v1" as const;

const MAX_CONFIRMATION_LENGTH = 160;
const MAX_ROUTE_COUNT = 512;
const MAX_STACK_DEPTH = 8;
const MAX_REQUEST_BODY_BYTES = 16 * 1024 * 1024;
const LOOPBACK_FALLBACK = "127.0.0.1";

export interface PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerBootstrapCompositionConfigV1 {
  marker:
    typeof PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_COMPOSITION_CONFIG_MARKER;
  version:
    typeof PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_COMPOSITION_VERSION;
  enabled: boolean;
}

export interface PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerBootstrapCompositionCommandV1 {
  marker:
    typeof PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_COMPOSITION_COMMAND_MARKER;
  version:
    typeof PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_COMPOSITION_VERSION;
  apply: boolean;
  confirmation: string;
  integration_confirmation: string;
  mount_confirmation: string;
}

export interface PublicAgentServiceTrustedRequesterAcceptancePersistenceExpressRequestLikeV1 {
  method?: string;
  path?: string;
  originalUrl?: string;
  url?: string;
  headers?: Record<string, string | readonly string[] | undefined>;
  body?: unknown;
  socket?: { remoteAddress?: string | null } | null;
  connection?: { remoteAddress?: string | null } | null;
  pause?: () => unknown;
}

export interface PublicAgentServiceTrustedRequesterAcceptancePersistenceExpressResponseLikeV1 {
  statusCode?: number;
  writableEnded?: boolean;
  setHeader?: (name: string, value: string) => unknown;
  end?: (body?: string) => unknown;
}

export type PublicAgentServiceTrustedRequesterAcceptancePersistenceExpressNextV1 =
  (error?: unknown) => unknown;

export type PublicAgentServiceTrustedRequesterAcceptancePersistenceExpressMiddlewareV1 = (
  request:
    PublicAgentServiceTrustedRequesterAcceptancePersistenceExpressRequestLikeV1,
  response:
    PublicAgentServiceTrustedRequesterAcceptancePersistenceExpressResponseLikeV1,
  next:
    PublicAgentServiceTrustedRequesterAcceptancePersistenceExpressNextV1,
) => unknown;

export interface PublicAgentServiceTrustedRequesterAcceptancePersistenceExpressAppLikeV1 {
  use: (
    middleware:
      PublicAgentServiceTrustedRequesterAcceptancePersistenceExpressMiddlewareV1,
  ) => unknown;
  _router?: { stack?: unknown[] } | null;
  router?: { stack?: unknown[] } | null;
}

export interface PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerBootstrapCompositionDependenciesV1 {
  executeRegistrarIntegration:
    typeof executePublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerRegistrarIntegrationFromEnvironmentV1;
}

export interface PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerBootstrapCompositionAuthorityV1 {
  source_level_express_registry_adapter: true;
  express_app_provider_access: boolean;
  express_route_stack_snapshot_read: boolean;
  express_dispatcher_installation: boolean;
  server_route_registry_snapshot_read: boolean;
  server_route_registry_compare_and_swap: boolean;
  production_http_route_mount: false;
  network_listener_creation: false;
  live_route_registry_integration: false;
  bootstrap_callsite_integration: false;
  src_index_modification: false;
  production_http_submission: false;
  production_acceptance_persistence: false;
  production_replay_write: false;
  payment_authorization: false;
  payment_execution: false;
  work_execution_authorization: false;
  work_dispatch: false;
  work_credit_write: false;
  work_credit_settlement: false;
  wallet_or_signer_access: false;
  production_signing: false;
  transaction_broadcast: false;
  credential_issue: false;
  credential_change: false;
  runtime_mutation: false;
  service_restart: false;
  deployment: false;
  money_movement: false;
}

export interface PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerBootstrapCompositionResultV1 {
  marker:
    typeof PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_COMPOSITION_RESULT_MARKER;
  version:
    typeof PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_COMPOSITION_VERSION;
  status:
    | "disabled"
    | "upstream_disabled"
    | "planned"
    | "mount_disabled"
    | "route_disabled"
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
  trusted_input_provider_deferred: boolean;
  integration:
    PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerRegistrarIntegrationResultV1
    | null;
  authority:
    PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerBootstrapCompositionAuthorityV1;
}

interface ScannedRouteV1 {
  method: string;
  path: string;
  signature: string;
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
    PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerRegistryEntryV1[];
  stackSnapshotCount: number;
  compareAndSwapAttemptCount: number;
  compareAndSwapApplyCount: number;
  dispatcherInstallCount: number;
  unmanagedSentinels:
    Map<
      string,
      (
        request:
          PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRequestV1,
      ) => PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpResponseV1
    >;
}

const EXPRESS_REGISTRY_STATES =
  new WeakMap<object, ExpressRegistryStateV1>();

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
  expected: readonly string[],
): void {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  assertCondition(
    JSON.stringify(actual) === JSON.stringify(wanted),
    `${label} keys mismatch`,
  );
}

function requireString(
  value: unknown,
  label: string,
  maxLength: number,
): string {
  assertCondition(
    typeof value === "string"
      && value.length <= maxLength,
    `${label} must be a bounded string`,
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

function sha256Text(value: string): string {
  return createHash("sha256")
    .update(value, "utf8")
    .digest("hex");
}

function normalizePath(value: string): string {
  const withoutQuery = value.split("?", 1)[0] ?? value;
  return withoutQuery.startsWith("/")
    ? withoutQuery
    : `/${withoutQuery}`;
}

function routePaths(value: unknown): string[] {
  if (typeof value === "string") return [normalizePath(value)];
  if (Array.isArray(value)) {
    return value.flatMap((entry) => routePaths(entry));
  }
  return [];
}

function routeMethods(value: unknown): string[] {
  if (!isRecord(value)) return [];
  return Object.entries(value)
    .filter(([, enabled]) => enabled === true)
    .map(([method]) => method.toUpperCase())
    .sort();
}

const functionIds = new WeakMap<Function, string>();
let nextFunctionId = 1;

function functionIdentity(value: unknown): string {
  if (typeof value !== "function") return "non-function";
  const existing = functionIds.get(value);
  if (existing) return existing;
  const created = `fn-${nextFunctionId}`;
  nextFunctionId += 1;
  functionIds.set(value, created);
  return created;
}

function stackFor(
  app:
    PublicAgentServiceTrustedRequesterAcceptancePersistenceExpressAppLikeV1,
): unknown[] {
  const stack = app._router?.stack ?? app.router?.stack;
  assertCondition(
    Array.isArray(stack),
    "Express route stack must be an array",
  );
  return stack;
}

function scanExpressStack(
  stack: readonly unknown[],
): {
  descriptors: readonly unknown[];
  routes: readonly ScannedRouteV1[];
} {
  const descriptors: unknown[] = [];
  const routes: ScannedRouteV1[] = [];
  let visited = 0;

  const walk = (
    values: readonly unknown[],
    depth: number,
  ): void => {
    assertCondition(
      depth <= MAX_STACK_DEPTH,
      "Express route stack nesting exceeds limit",
    );
    for (const rawLayer of values) {
      visited += 1;
      assertCondition(
        visited <= MAX_ROUTE_COUNT,
        "Express route stack exceeds route-count limit",
      );
      const layer = isRecord(rawLayer) ? rawLayer : {};
      const route = isRecord(layer.route) ? layer.route : null;
      const handle = layer.handle;
      const descriptor: Record<string, unknown> = {
        name:
          typeof layer.name === "string"
            ? layer.name
            : "",
        handle:
          functionIdentity(handle),
      };

      if (route) {
        const paths = routePaths(route.path);
        const methods = routeMethods(route.methods);
        const routeStack =
          Array.isArray(route.stack)
            ? route.stack
            : [];
        const handlerIds =
          routeStack.map((entry) => {
            const record =
              isRecord(entry)
                ? entry
                : {};
            return functionIdentity(record.handle);
          });
        descriptor.route = {
          paths,
          methods,
          handler_ids:
            handlerIds,
        };
        for (const pathValue of paths) {
          for (const method of methods) {
            routes.push({
              method,
              path:
                pathValue,
              signature:
                sha256Text(
                  JSON.stringify({
                    method,
                    path:
                      pathValue,
                    handler_ids:
                      handlerIds,
                  }),
                ),
            });
          }
        }
      }

      const nested =
        isRecord(handle)
        && Array.isArray(handle.stack)
          ? handle.stack
          : null;
      if (nested) {
        descriptor.nested_count =
          nested.length;
        walk(nested, depth + 1);
      }
      descriptors.push(descriptor);
    }
  };

  walk(stack, 0);
  return {
    descriptors:
      Object.freeze(descriptors),
    routes:
      Object.freeze(routes),
  };
}

function routeKey(
  method: string,
  routePath: string,
): string {
  return `${method}\0${routePath}`;
}

function canonicalPath(
  routePath: string,
): boolean {
  return routePath
      === PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_STATUS_PATH
    || routePath
      === PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_COMMAND_PATH;
}

function sentinelHandler(label: string): (
  request:
    PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRequestV1,
) => PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpResponseV1 {
  return () => fail(
    `unmanaged Express route sentinel cannot be invoked: ${label}`,
  );
}

function normalizeHeaders(
  value:
    Record<string, string | readonly string[] | undefined>
    | undefined,
): Record<string, string> {
  const output: Record<string, string> = {};
  for (const [rawName, rawValue] of Object.entries(value ?? {})) {
    const name = rawName.trim().toLowerCase();
    if (name === "") continue;
    if (typeof rawValue === "string") {
      output[name] = rawValue;
    } else if (Array.isArray(rawValue)) {
      output[name] = rawValue.join(", ");
    }
  }
  return output;
}

function serializeBody(value: unknown): string {
  if (value === undefined || value === null) return "";
  if (typeof value === "string") return value;
  if (value instanceof Uint8Array) {
    return Buffer.from(value).toString("utf8");
  }
  return JSON.stringify(value);
}

function normalizeExpressRequest(
  request:
    PublicAgentServiceTrustedRequesterAcceptancePersistenceExpressRequestLikeV1,
): PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRequestV1 {
  const body = serializeBody(request.body);
  assertCondition(
    Buffer.byteLength(body, "utf8")
      <= MAX_REQUEST_BODY_BYTES,
    "Express request body exceeds composition limit",
  );
  const headers =
    normalizeHeaders(request.headers);
  headers["content-length"] =
    String(Buffer.byteLength(body, "utf8"));

  return {
    marker:
      PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_REQUEST_MARKER,
    version:
      PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_VERSION,
    method:
      String(request.method ?? "GET").toUpperCase(),
    path:
      normalizePath(
        request.path
        ?? request.originalUrl
        ?? request.url
        ?? "/",
      ),
    remote_address:
      request.socket?.remoteAddress
      ?? request.connection?.remoteAddress
      ?? LOOPBACK_FALLBACK,
    headers,
    body,
  };
}

function sendRouteResponse(
  response:
    PublicAgentServiceTrustedRequesterAcceptancePersistenceExpressResponseLikeV1,
  routeResponse:
    PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpResponseV1,
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
  response.statusCode =
    routeResponse.status_code;
  for (const [name, value] of Object.entries(routeResponse.headers)) {
    assertCondition(
      typeof value === "string",
      "sealed route returned non-string header",
    );
    response.setHeader?.(name, value);
  }
  response.end?.(routeResponse.body);
}

function dispatcherFor(
  routes:
    readonly PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerRegistryEntryV1[],
): PublicAgentServiceTrustedRequesterAcceptancePersistenceExpressMiddlewareV1 {
  const byPath =
    new Map(
      routes.map(
        (route) => [
          route.path,
          route.handle,
        ] as const,
      ),
    );
  return (
    request,
    response,
    next,
  ) => {
    const requestPath =
      normalizePath(
        request.path
        ?? request.originalUrl
        ?? request.url
        ?? "/",
      );
    const handle =
      byPath.get(requestPath);
    if (!handle) {
      return next();
    }
    try {
      request.pause?.();
    } catch {
      // Pausing is a best-effort containment action and adds no authority.
    }
    try {
      const routeResponse =
        handle(
          normalizeExpressRequest(
            request,
          ),
        );
      sendRouteResponse(
        response,
        routeResponse,
      );
      return undefined;
    } catch (error) {
      return next(error);
    }
  };
}

export function createPublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerExpressRegistryV1(
  app:
    PublicAgentServiceTrustedRequesterAcceptancePersistenceExpressAppLikeV1,
): {
  registry:
    PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerRegistryV1;
  observe: () => ExpressRegistryObservationV1;
} {
  assertCondition(
    app !== null
      && typeof app === "object",
    "Express app unavailable",
  );
  assertCondition(
    typeof app.use === "function",
    "Express app.use must be callable",
  );
  let state =
    EXPRESS_REGISTRY_STATES.get(
      app as object,
    );
  if (!state) {
    state = {
      managedRoutes: [],
      stackSnapshotCount: 0,
      compareAndSwapAttemptCount: 0,
      compareAndSwapApplyCount: 0,
      dispatcherInstallCount: 0,
      unmanagedSentinels:
        new Map(),
    };
    EXPRESS_REGISTRY_STATES.set(
      app as object,
      state,
    );
  }

  const unmanagedSentinel = (
    label: string,
  ) => {
    const existing =
      state.unmanagedSentinels.get(label);
    if (existing) return existing;
    const created =
      sentinelHandler(label);
    state.unmanagedSentinels.set(
      label,
      created,
    );
    return created;
  };

  const snapshot = (
    count: boolean,
  ): {
    revision: string;
    routes:
      readonly PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerRegistryEntryV1[];
  } => {
    if (count) {
      state.stackSnapshotCount += 1;
    }
    const stack = stackFor(app);
    const scanned =
      scanExpressStack(stack);
    const grouped =
      new Map<string, ScannedRouteV1[]>();
    for (const route of scanned.routes) {
      const method =
        canonicalPath(route.path)
          ? PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_METHOD
          : route.method;
      const key =
        routeKey(method, route.path);
      const bucket =
        grouped.get(key)
        ?? [];
      bucket.push(route);
      grouped.set(key, bucket);
    }

    const unmanaged:
      PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerRegistryEntryV1[] =
      [...grouped.entries()]
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, values]) => {
          const separator = key.indexOf("\0");
          const method = key.slice(0, separator);
          const routePath = key.slice(separator + 1);
          const signatures =
            values.map((entry) => entry.signature).sort();
          const handlerId =
            canonicalPath(routePath)
              ? `void.express-unmanaged-canonical-conflict.${sha256Text(
                  `${method}\n${routePath}\n${signatures.join("\n")}`,
                ).slice(0, 24)}`
              : `void.express-unmanaged-route.${sha256Text(
                  `${method}\n${routePath}\n${signatures.join("\n")}`,
                ).slice(0, 24)}`;
          return {
            method,
            path:
              routePath,
            handler_id:
              handlerId,
            handle:
              unmanagedSentinel(
                `${method}\n${routePath}\n${handlerId}`,
              ),
          };
        });

    const routes = Object.freeze([
      ...unmanaged,
      ...state.managedRoutes,
    ]);
    assertCondition(
      routes.length <= MAX_ROUTE_COUNT,
      "Express route snapshot exceeds route-count limit",
    );
    const revision =
      sha256Text(
        JSON.stringify({
          stack:
            scanned.descriptors,
          unmanaged:
            unmanaged.map(
              ({ method, path, handler_id }) => ({
                method,
                path,
                handler_id,
              }),
            ),
          managed:
            state.managedRoutes.map(
              ({ method, path, handler_id, handle }) => ({
                method,
                path,
                handler_id,
                handle:
                  functionIdentity(handle),
              }),
            ),
        }),
      );
    return {
      revision,
      routes,
    };
  };

  return {
    registry: {
      readExactRouteSnapshot() {
        return snapshot(true);
      },
      compareAndSwapExactRouteSnapshot(
        expectedRevision,
        routesValue,
      ) {
        state.compareAndSwapAttemptCount += 1;
        assertCondition(
          /^[0-9a-f]{64}$/.test(expectedRevision),
          "expected route revision must be a SHA-256 string",
        );
        assertCondition(
          Array.isArray(routesValue),
          "next route snapshot must be an array",
        );
        const current =
          snapshot(false);
        assertCondition(
          current.revision === expectedRevision,
          "stale Express route revision",
        );
        assertCondition(
          routesValue.length
            === current.routes.length + 2,
          "Express route compare-and-swap must append exactly two routes",
        );
        for (let index = 0; index < current.routes.length; index += 1) {
          const previous = current.routes[index]!;
          const candidate = routesValue[index]!;
          assertCondition(
            candidate.method === previous.method
              && candidate.path === previous.path
              && candidate.handler_id === previous.handler_id
              && candidate.handle === previous.handle,
            `route sequence changed at index ${index}`,
          );
        }

        const additions =
          routesValue.slice(
            current.routes.length,
          );
        assertCondition(
          additions.length === 2,
          "Express route compare-and-swap omitted canonical additions",
        );
        const expectedPaths =
          new Set([
            PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_STATUS_PATH,
            PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_COMMAND_PATH,
          ]);
        const observedPaths =
          new Set(
            additions.map(
              (entry) => entry.path,
            ),
          );
        assertCondition(
          additions.every(
            (entry) =>
              entry.method
                === PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_METHOD
              && entry.handler_id
                === PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_HANDLER_ID
              && expectedPaths.has(entry.path),
          ),
          "Express route compare-and-swap additions are not canonical",
        );
        assertCondition(
          observedPaths.size === expectedPaths.size
            && [...expectedPaths].every(
              (routePath) => observedPaths.has(routePath),
            ),
          "Express route compare-and-swap canonical path set changed",
        );
        assertCondition(
          additions[0]!.handle === additions[1]!.handle,
          "Express route compare-and-swap requires one exact handler",
        );

        const stack =
          stackFor(app);
        const stackBefore =
          [...stack];
        const managedBefore =
          [...state.managedRoutes];
        const dispatcher =
          dispatcherFor(additions);
        try {
          app.use(dispatcher);
          const stackAfter =
            stackFor(app);
          assertCondition(
            stackAfter.length === stackBefore.length + 1,
            "Express app.use did not append exactly one dispatcher",
          );
          for (let index = 0; index < stackBefore.length; index += 1) {
            assertCondition(
              stackAfter[index] === stackBefore[index],
              "Express app.use reordered existing route layers",
            );
          }
          state.managedRoutes =
            additions.map((entry) => ({
              method:
                entry.method,
              path:
                entry.path,
              handler_id:
                entry.handler_id,
              handle:
                entry.handle,
            }));
          state.dispatcherInstallCount += 1;
          state.compareAndSwapApplyCount += 1;
          const next =
            snapshot(false);
          return {
            applied:
              true,
            previous_revision:
              current.revision,
            next_revision:
              next.revision,
            route_count:
              routesValue.length,
          };
        } catch (error) {
          stack.splice(
            0,
            stack.length,
            ...stackBefore,
          );
          state.managedRoutes =
            managedBefore;
          throw error;
        }
      },
    },
    observe() {
      return {
        stack_snapshot_count:
          state.stackSnapshotCount,
        compare_and_swap_attempt_count:
          state.compareAndSwapAttemptCount,
        compare_and_swap_apply_count:
          state.compareAndSwapApplyCount,
        dispatcher_install_count:
          state.dispatcherInstallCount,
        exact_managed_route_count:
          state.managedRoutes.length,
      };
    },
  };
}

export function validatePublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerBootstrapCompositionConfigV1(
  value: unknown,
): PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerBootstrapCompositionConfigV1 {
  const root =
    requireRecord(
      value,
      "trusted requester server bootstrap composition config",
    );
  requireExactKeys(
    root,
    "trusted requester server bootstrap composition config",
    [
      "marker",
      "version",
      "enabled",
    ],
  );
  assertCondition(
    root.marker
      === PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_COMPOSITION_CONFIG_MARKER,
    "trusted requester server bootstrap composition config marker mismatch",
  );
  assertCondition(
    root.version
      === PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_COMPOSITION_VERSION,
    "trusted requester server bootstrap composition config version mismatch",
  );
  return {
    marker:
      PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_COMPOSITION_CONFIG_MARKER,
    version:
      PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_COMPOSITION_VERSION,
    enabled:
      requireBoolean(
        root.enabled,
        "enabled",
      ),
  };
}

export function validatePublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerBootstrapCompositionCommandV1(
  value: unknown,
): PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerBootstrapCompositionCommandV1 {
  const root =
    requireRecord(
      value,
      "trusted requester server bootstrap composition command",
    );
  requireExactKeys(
    root,
    "trusted requester server bootstrap composition command",
    [
      "marker",
      "version",
      "apply",
      "confirmation",
      "integration_confirmation",
      "mount_confirmation",
    ],
  );
  assertCondition(
    root.marker
      === PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_COMPOSITION_COMMAND_MARKER,
    "trusted requester server bootstrap composition command marker mismatch",
  );
  assertCondition(
    root.version
      === PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_COMPOSITION_VERSION,
    "trusted requester server bootstrap composition command version mismatch",
  );
  return {
    marker:
      PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_COMPOSITION_COMMAND_MARKER,
    version:
      PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_COMPOSITION_VERSION,
    apply:
      requireBoolean(
        root.apply,
        "apply",
      ),
    confirmation:
      requireString(
        root.confirmation,
        "confirmation",
        MAX_CONFIRMATION_LENGTH,
      ),
    integration_confirmation:
      requireString(
        root.integration_confirmation,
        "integration_confirmation",
        MAX_CONFIRMATION_LENGTH,
      ),
    mount_confirmation:
      requireString(
        root.mount_confirmation,
        "mount_confirmation",
        MAX_CONFIRMATION_LENGTH,
      ),
  };
}

export function loadPublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerBootstrapCompositionConfigFromEnvironmentV1(
  environment: NodeJS.ProcessEnv = process.env,
): PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerBootstrapCompositionConfigV1 {
  return validatePublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerBootstrapCompositionConfigV1({
    marker:
      PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_COMPOSITION_CONFIG_MARKER,
    version:
      PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_COMPOSITION_VERSION,
    enabled:
      parseBooleanEnvironment(
        environment[
          PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_COMPOSITION_ENABLED_ENV
        ],
        PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_COMPOSITION_ENABLED_ENV,
        false,
      ),
  });
}

export const PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_COMPOSITION_DEFAULT_DEPENDENCIES_V1:
  PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerBootstrapCompositionDependenciesV1 = {
    executeRegistrarIntegration:
      executePublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerRegistrarIntegrationFromEnvironmentV1,
  };

export function publicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerBootstrapCompositionDefaultDependencyIdentityV1(): {
  execute_registrar_integration_exact: true;
  sealed_registrar_integration_bound: true;
} {
  assertCondition(
    PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_COMPOSITION_DEFAULT_DEPENDENCIES_V1
      .executeRegistrarIntegration
      === executePublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerRegistrarIntegrationFromEnvironmentV1,
    "default trusted registrar-integration executor changed",
  );
  return {
    execute_registrar_integration_exact:
      true,
    sealed_registrar_integration_bound:
      true,
  };
}

function emptyObservation(): ExpressRegistryObservationV1 {
  return {
    stack_snapshot_count:
      0,
    compare_and_swap_attempt_count:
      0,
    compare_and_swap_apply_count:
      0,
    dispatcher_install_count:
      0,
    exact_managed_route_count:
      0,
  };
}

function authority(
  appProviderInvoked: boolean,
  observation: ExpressRegistryObservationV1,
  integration:
    PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerRegistrarIntegrationResultV1
    | null,
): PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerBootstrapCompositionAuthorityV1 {
  return {
    source_level_express_registry_adapter:
      true,
    express_app_provider_access:
      appProviderInvoked,
    express_route_stack_snapshot_read:
      observation.stack_snapshot_count > 0,
    express_dispatcher_installation:
      observation.dispatcher_install_count > 0,
    server_route_registry_snapshot_read:
      integration?.authority.server_route_registry_snapshot_read
      ?? false,
    server_route_registry_compare_and_swap:
      integration?.authority.server_route_registry_compare_and_swap
      ?? false,
    production_http_route_mount:
      false,
    network_listener_creation:
      false,
    live_route_registry_integration:
      false,
    bootstrap_callsite_integration:
      false,
    src_index_modification:
      false,
    production_http_submission:
      false,
    production_acceptance_persistence:
      false,
    production_replay_write:
      false,
    payment_authorization:
      false,
    payment_execution:
      false,
    work_execution_authorization:
      false,
    work_dispatch:
      false,
    work_credit_write:
      false,
    work_credit_settlement:
      false,
    wallet_or_signer_access:
      false,
    production_signing:
      false,
    transaction_broadcast:
      false,
    credential_issue:
      false,
    credential_change:
      false,
    runtime_mutation:
      false,
    service_restart:
      false,
    deployment:
      false,
    money_movement:
      false,
  };
}

function result(
  status:
    PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerBootstrapCompositionResultV1["status"],
  enabled: boolean,
  apply: boolean,
  confirmationVerified: boolean,
  integrationConfirmationVerified: boolean,
  mountConfirmationVerified: boolean,
  appProviderInvoked: boolean,
  registryCreated: boolean,
  observation: ExpressRegistryObservationV1,
  integration:
    PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerRegistrarIntegrationResultV1
    | null,
): PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerBootstrapCompositionResultV1 {
  return {
    marker:
      PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_COMPOSITION_RESULT_MARKER,
    version:
      PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_COMPOSITION_VERSION,
    status,
    enabled,
    apply,
    confirmation_verified:
      confirmationVerified,
    integration_confirmation_verified:
      integrationConfirmationVerified,
    mount_confirmation_verified:
      mountConfirmationVerified,
    app_provider_invoked:
      appProviderInvoked,
    registry_created:
      registryCreated,
    route_stack_snapshot_count:
      observation.stack_snapshot_count,
    compare_and_swap_attempt_count:
      observation.compare_and_swap_attempt_count,
    compare_and_swap_apply_count:
      observation.compare_and_swap_apply_count,
    dispatcher_install_count:
      observation.dispatcher_install_count,
    exact_managed_route_count:
      observation.exact_managed_route_count,
    trusted_input_provider_deferred:
      integration?.trusted_input_provider_deferred
      ?? true,
    integration,
    authority:
      authority(
        appProviderInvoked,
        observation,
        integration,
      ),
  };
}

function failRegistry():
  PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerRegistryV1 {
  return {
    readExactRouteSnapshot() {
      return fail(
        "disabled or dry-run bootstrap composition accessed route registry",
      );
    },
    compareAndSwapExactRouteSnapshot() {
      return fail(
        "disabled or dry-run bootstrap composition mutated route registry",
      );
    },
  };
}

function environmentFlagEnabled(
  environment: NodeJS.ProcessEnv,
  name: string,
): boolean {
  return environment[name] === "1";
}

export function executePublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerBootstrapCompositionV1(
  configValue: unknown,
  commandValue: unknown,
  environment: NodeJS.ProcessEnv,
  trustedReplayPlanInputProvider: () => unknown,
  appProvider: () =>
    PublicAgentServiceTrustedRequesterAcceptancePersistenceExpressAppLikeV1,
  mountDependencies:
    PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerMountDependenciesV1,
  dependencies:
    PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerBootstrapCompositionDependenciesV1 =
      PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_COMPOSITION_DEFAULT_DEPENDENCIES_V1,
): PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerBootstrapCompositionResultV1 {
  const config =
    validatePublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerBootstrapCompositionConfigV1(
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
    validatePublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerBootstrapCompositionCommandV1(
      commandValue,
    );

  const confirmationVerified =
    !command.apply
    || command.confirmation
      === PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_COMPOSITION_CONFIRMATION;
  const integrationConfirmationVerified =
    !command.apply
    || command.integration_confirmation
      === PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_CONFIRMATION;
  const mountConfirmationVerified =
    !command.apply
    || command.mount_confirmation
      === PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_CONFIRMATION;

  assertCondition(
    confirmationVerified,
    "applied trusted requester server bootstrap composition requires exact confirmation",
  );
  assertCondition(
    integrationConfirmationVerified,
    "applied trusted requester server bootstrap composition requires exact integration confirmation",
  );
  assertCondition(
    mountConfirmationVerified,
    "applied trusted requester server bootstrap composition requires exact mount confirmation",
  );
  assertCondition(
    command.apply
      || (
        command.confirmation === ""
        && command.integration_confirmation === ""
        && command.mount_confirmation === ""
      ),
    "dry-run trusted requester server bootstrap composition confirmations must be empty",
  );

  const integrationCommand = {
    marker:
      PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_COMMAND_MARKER,
    version:
      PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_VERSION,
    apply:
      command.apply,
    confirmation:
      command.integration_confirmation,
    mount_confirmation:
      command.mount_confirmation,
  };

  const allUpstreamEnabled =
    environmentFlagEnabled(
      environment,
      PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_ENABLED_ENV,
    )
    && environmentFlagEnabled(
      environment,
      PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_ENABLED_ENV,
    )
    && environmentFlagEnabled(
      environment,
      PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_ENABLED_ENV,
    )
;

  if (!command.apply || !allUpstreamEnabled) {
    const integration =
      dependencies.executeRegistrarIntegration(
        integrationCommand,
        environment,
        trustedReplayPlanInputProvider,
        failRegistry(),
        mountDependencies,
      );
    const mappedStatus:
      PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerBootstrapCompositionResultV1["status"] =
        integration.status === "planned"
          ? "planned"
          : integration.status === "mount_disabled"
            ? "mount_disabled"
            : integration.status === "route_disabled"
              ? "route_disabled"
              : integration.status === "disabled"
                ? "upstream_disabled"
                : integration.status;
    return result(
      mappedStatus,
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

  assertCondition(
    typeof trustedReplayPlanInputProvider === "function",
    "trusted replay-plan input provider unavailable",
  );
  assertCondition(
    typeof appProvider === "function",
    "Express app provider unavailable",
  );
  const app =
    appProvider();
  const adapted =
    createPublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerExpressRegistryV1(
      app,
    );
  const integration =
    dependencies.executeRegistrarIntegration(
      integrationCommand,
      environment,
      trustedReplayPlanInputProvider,
      adapted.registry,
      mountDependencies,
    );
  const observation =
    adapted.observe();

  return result(
    integration.status,
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

export function executePublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerBootstrapCompositionFromEnvironmentV1(
  commandValue: unknown,
  environment: NodeJS.ProcessEnv,
  trustedReplayPlanInputProvider: () => unknown,
  appProvider: () =>
    PublicAgentServiceTrustedRequesterAcceptancePersistenceExpressAppLikeV1,
  mountDependencies:
    PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerMountDependenciesV1,
  dependencies:
    PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerBootstrapCompositionDependenciesV1 =
      PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_COMPOSITION_DEFAULT_DEPENDENCIES_V1,
): PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerBootstrapCompositionResultV1 {
  return executePublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerBootstrapCompositionV1(
    loadPublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerBootstrapCompositionConfigFromEnvironmentV1(
      environment,
    ),
    commandValue,
    environment,
    trustedReplayPlanInputProvider,
    appProvider,
    mountDependencies,
    dependencies,
  );
}

export function publicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerBootstrapCompositionSourceTopologyV1(): {
  expected_app_creation: "const app = express();";
  expected_live_app_export: "(globalThis as any).__void_http_app = app;";
  expected_listener_owner: "src/index.ts";
  bootstrap_callsite_integrated: false;
} {
  return {
    expected_app_creation:
      "const app = express();",
    expected_live_app_export:
      "(globalThis as any).__void_http_app = app;",
    expected_listener_owner:
      "src/index.ts",
    bootstrap_callsite_integrated:
      false,
  };
}
