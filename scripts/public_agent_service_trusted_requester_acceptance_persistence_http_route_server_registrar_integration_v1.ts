import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_COMMAND_MARKER,
  PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_CONFIG_MARKER,
  PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_CONFIRMATION,
  PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_VERSION,
  loadPublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerMountConfigFromEnvironmentV1,
  mountPublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerV1,
  publicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerMountRouteIdentitiesV1,
  type PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerHandlerV1,
  type PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerIdentityV1,
  type PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerInspectionV1,
  type PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerMountDependenciesV1,
  type PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerMountResultV1,
  type PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerRegistrarV1,
  type PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerRegistrationReceiptV1,
  type PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerRegistrationV1,
} from "./public_agent_service_trusted_requester_acceptance_persistence_http_route_server_mount_binding_v1.js";

export const PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_MARKER =
  "VOID_PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_V1" as const;
export const PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_CONFIG_MARKER =
  "VOID_PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_CONFIG_V1" as const;
export const PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_COMMAND_MARKER =
  "VOID_PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_COMMAND_V1" as const;
export const PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_RESULT_MARKER =
  "VOID_PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_RESULT_V1" as const;
export const PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_EXAMPLE_MARKER =
  "VOID_PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_EXAMPLE_V1" as const;
export const PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_VERSION =
  1 as const;

export const PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_ENABLED_ENV =
  "VOID_PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_ENABLED" as const;
export const PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_CONFIRMATION =
  "integrateTrustedRequesterAcceptancePersistenceHttpRouteServerRegistrarV1" as const;
export const PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_ADAPTER_ID =
  "void.public-agent-service-trusted-requester-acceptance-persistence-http-route-server-registrar.v1" as const;

const MAX_EXAMPLE_JSON_BYTES = 32 * 1024 * 1024;
const MAX_REGISTRY_ROUTES = 4096;

export interface PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerRegistrarIntegrationConfigV1 {
  marker:
    typeof PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_CONFIG_MARKER;
  version:
    typeof PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_VERSION;
  enabled: boolean;
}

export interface PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerRegistrarIntegrationCommandV1 {
  marker:
    typeof PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_COMMAND_MARKER;
  version:
    typeof PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_VERSION;
  apply: boolean;
  confirmation: string;
  mount_confirmation: string;
}

export interface PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerRegistryEntryV1 {
  method: string;
  path: string;
  handler_id: string;
  handle:
    PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerHandlerV1;
}

export interface PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerRegistrySnapshotV1 {
  revision: string;
  routes: readonly
    PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerRegistryEntryV1[];
}

export interface PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerRegistryCompareAndSwapReceiptV1 {
  applied: true;
  previous_revision: string;
  next_revision: string;
  route_count: number;
}

export interface PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerRegistryV1 {
  readExactRouteSnapshot: () =>
    PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerRegistrySnapshotV1;
  compareAndSwapExactRouteSnapshot: (
    expectedRevision: string,
    routes: readonly
      PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerRegistryEntryV1[],
  ) =>
    PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerRegistryCompareAndSwapReceiptV1;
}

export interface PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerRegistrarIntegrationDependenciesV1 {
  loadMountConfig: (
    environment: NodeJS.ProcessEnv,
  ) => unknown;
  executeMount: (
    config: unknown,
    command: unknown,
    environment: NodeJS.ProcessEnv,
    trustedReplayPlanInputProvider: () => unknown,
    registrar:
      PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerRegistrarV1,
    dependencies:
      PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerMountDependenciesV1,
  ) =>
    PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerMountResultV1;
}

export interface PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerRegistrarObservationV1 {
  adapter_id:
    typeof PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_ADAPTER_ID;
  snapshot_read: boolean;
  compare_and_swap_attempted: boolean;
  compare_and_swap_applied: boolean;
  revision_before: string | null;
  revision_after: string | null;
  unrelated_route_count_before: number | null;
  unrelated_route_count_after: number | null;
  exact_route_count_after: number | null;
}

export interface PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerRegistrarIntegrationAuthorityV1 {
  source_level_route_registry_adapter: boolean;
  server_route_registry_snapshot_read: boolean;
  server_route_registry_compare_and_swap: boolean;
  production_http_route_mount: false;
  network_listener_creation: false;
  live_route_registry_integration: false;
  src_index_modification: false;
  express_app_modification: false;
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

export interface PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerRegistrarIntegrationResultV1 {
  marker:
    typeof PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_RESULT_MARKER;
  version:
    typeof PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_VERSION;
  status:
    | "disabled"
    | "mount_disabled"
    | "route_disabled"
    | "planned"
    | "mounted"
    | "already_mounted";
  enabled: boolean;
  apply: boolean;
  confirmation_verified: boolean;
  mount_confirmation_verified: boolean;
  registry_snapshot_read: boolean;
  registry_compare_and_swap_attempted: boolean;
  registry_compare_and_swap_applied: boolean;
  registry_revision_before: string | null;
  registry_revision_after: string | null;
  unrelated_route_count_before: number | null;
  unrelated_route_count_after: number | null;
  exact_route_count_after: number | null;
  trusted_input_provider_deferred: boolean;
  mount:
    PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerMountResultV1
    | null;
  authority:
    PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerRegistrarIntegrationAuthorityV1;
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

function routeKey(
  method: string,
  routePath: string,
): string {
  return `${method}\0${routePath}`;
}

function canonicalIdentities():
  readonly PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerIdentityV1[] {
  return publicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerMountRouteIdentitiesV1();
}

function assertCanonicalIdentitySet(
  identities: readonly
    PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerIdentityV1[],
  label: string,
): void {
  assertCondition(
    Array.isArray(identities)
      && identities.length === 2,
    `${label} must contain exactly two routes`,
  );
  const expected = canonicalIdentities();
  const expectedMap = new Map(
    expected.map(
      (identity) => [
        routeKey(
          identity.method,
          identity.path,
        ),
        identity,
      ],
    ),
  );
  const seen = new Set<string>();
  for (const identity of identities) {
    const record = requireRecord(
      identity,
      label,
    );
    requireExactKeys(
      record,
      label,
      [
        "method",
        "path",
        "handler_id",
      ],
    );
    const method =
      requireString(
        record.method,
        `${label}.method`,
        1,
        16,
      );
    const routePath =
      requireString(
        record.path,
        `${label}.path`,
        1,
        4096,
      );
    const key =
      routeKey(
        method,
        routePath,
      );
    assertCondition(
      !seen.has(key),
      `${label} contains a duplicate route`,
    );
    seen.add(key);
    const canonical =
      expectedMap.get(key);
    assertCondition(
      canonical !== undefined
        && record.handler_id
          === canonical.handler_id,
      `${label} changed a canonical route identity`,
    );
  }
  assertCondition(
    seen.size === expectedMap.size,
    `${label} omitted a canonical route`,
  );
}

function validateRegistryEntry(
  value: unknown,
  label: string,
): PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerRegistryEntryV1 {
  const record =
    requireRecord(
      value,
      label,
    );
  requireExactKeys(
    record,
    label,
    [
      "method",
      "path",
      "handler_id",
      "handle",
    ],
  );
  const method =
    requireString(
      record.method,
      `${label}.method`,
      1,
      16,
    );
  const routePath =
    requireString(
      record.path,
      `${label}.path`,
      1,
      4096,
    );
  assertCondition(
    routePath.startsWith("/"),
    `${label}.path must be absolute`,
  );
  const handlerId =
    requireString(
      record.handler_id,
      `${label}.handler_id`,
      1,
      256,
    );
  assertCondition(
    typeof record.handle === "function",
    `${label}.handle must be callable`,
  );
  return {
    method,
    path:
      routePath,
    handler_id:
      handlerId,
    handle:
      record.handle as
        PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerHandlerV1,
  };
}

function validateSnapshot(
  value: unknown,
): PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerRegistrySnapshotV1 {
  const record =
    requireRecord(
      value,
      "registry snapshot",
    );
  requireExactKeys(
    record,
    "registry snapshot",
    [
      "revision",
      "routes",
    ],
  );
  const revision =
    requireString(
      record.revision,
      "registry snapshot.revision",
      1,
      256,
    );
  assertCondition(
    Array.isArray(record.routes),
    "registry snapshot.routes must be an array",
  );
  assertCondition(
    record.routes.length <= MAX_REGISTRY_ROUTES,
    `registry snapshot.routes exceeds ${MAX_REGISTRY_ROUTES}`,
  );
  const routes =
    record.routes.map(
      (entry, index) =>
        validateRegistryEntry(
          entry,
          `registry snapshot.routes[${index}]`,
        ),
    );
  const seen = new Set<string>();
  for (const entry of routes) {
    const key =
      routeKey(
        entry.method,
        entry.path,
      );
    assertCondition(
      !seen.has(key),
      "registry snapshot contains duplicate route keys",
    );
    seen.add(key);
  }
  return {
    revision,
    routes:
      Object.freeze(
        routes.map(
          (entry) =>
            Object.freeze(entry),
        ),
      ),
  };
}

function validateCompareAndSwapReceipt(
  value: unknown,
  expectedRevision: string,
  expectedRouteCount: number,
): PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerRegistryCompareAndSwapReceiptV1 {
  const record =
    requireRecord(
      value,
      "registry compare-and-swap receipt",
    );
  requireExactKeys(
    record,
    "registry compare-and-swap receipt",
    [
      "applied",
      "previous_revision",
      "next_revision",
      "route_count",
    ],
  );
  assertCondition(
    record.applied === true,
    "registry compare-and-swap receipt.applied must be true",
  );
  const previousRevision =
    requireString(
      record.previous_revision,
      "registry compare-and-swap receipt.previous_revision",
      1,
      256,
    );
  const nextRevision =
    requireString(
      record.next_revision,
      "registry compare-and-swap receipt.next_revision",
      1,
      256,
    );
  assertCondition(
    previousRevision === expectedRevision,
    "registry compare-and-swap previous revision mismatch",
  );
  assertCondition(
    nextRevision !== expectedRevision,
    "registry compare-and-swap next revision must change",
  );
  assertCondition(
    Number.isSafeInteger(record.route_count)
      && record.route_count === expectedRouteCount,
    "registry compare-and-swap route count mismatch",
  );
  return {
    applied:
      true,
    previous_revision:
      previousRevision,
    next_revision:
      nextRevision,
    route_count:
      expectedRouteCount,
  };
}

function countCanonicalRoutes(
  routes: readonly
    PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerRegistryEntryV1[],
): number {
  const keys = new Set(
    canonicalIdentities().map(
      (identity) =>
        routeKey(
          identity.method,
          identity.path,
        ),
    ),
  );
  return routes.filter(
    (entry) =>
      keys.has(
        routeKey(
          entry.method,
          entry.path,
        ),
      ),
  ).length;
}

function countUnrelatedRoutes(
  routes: readonly
    PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerRegistryEntryV1[],
): number {
  return routes.length
    - countCanonicalRoutes(
      routes,
    );
}

export function validatePublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerRegistrarIntegrationConfigV1(
  value: unknown,
): PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerRegistrarIntegrationConfigV1 {
  const root = requireRecord(
    value,
    "trusted requester server registrar integration config",
  );
  requireExactKeys(
    root,
    "trusted requester server registrar integration config",
    [
      "marker",
      "version",
      "enabled",
    ],
  );
  assertCondition(
    root.marker
      === PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_CONFIG_MARKER,
    "trusted requester server registrar integration config marker mismatch",
  );
  assertCondition(
    root.version
      === PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_VERSION,
    "trusted requester server registrar integration config version mismatch",
  );
  return {
    marker:
      PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_CONFIG_MARKER,
    version:
      PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_VERSION,
    enabled:
      requireBoolean(
        root.enabled,
        "enabled",
      ),
  };
}

export function validatePublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerRegistrarIntegrationCommandV1(
  value: unknown,
): PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerRegistrarIntegrationCommandV1 {
  const root = requireRecord(
    value,
    "trusted requester server registrar integration command",
  );
  requireExactKeys(
    root,
    "trusted requester server registrar integration command",
    [
      "marker",
      "version",
      "apply",
      "confirmation",
      "mount_confirmation",
    ],
  );
  assertCondition(
    root.marker
      === PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_COMMAND_MARKER,
    "trusted requester server registrar integration command marker mismatch",
  );
  assertCondition(
    root.version
      === PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_VERSION,
    "trusted requester server registrar integration command version mismatch",
  );
  return {
    marker:
      PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_COMMAND_MARKER,
    version:
      PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_VERSION,
    apply:
      requireBoolean(
        root.apply,
        "apply",
      ),
    confirmation:
      requireString(
        root.confirmation,
        "confirmation",
        0,
        256,
      ),
    mount_confirmation:
      requireString(
        root.mount_confirmation,
        "mount_confirmation",
        0,
        256,
      ),
  };
}

export function loadPublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerRegistrarIntegrationConfigFromEnvironmentV1(
  environment: NodeJS.ProcessEnv = process.env,
): PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerRegistrarIntegrationConfigV1 {
  return validatePublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerRegistrarIntegrationConfigV1(
    {
      marker:
        PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_CONFIG_MARKER,
      version:
        PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_VERSION,
      enabled:
        parseBooleanEnvironment(
          environment[
            PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_ENABLED_ENV
          ],
          PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_ENABLED_ENV,
          false,
        ),
    },
  );
}

export function createPublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerRegistrarIntegrationV1(
  registry:
    PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerRegistryV1,
): {
  registrar:
    PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerRegistrarV1;
  observe: () =>
    PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerRegistrarObservationV1;
} {
  assertCondition(
    registry !== null
      && typeof registry === "object",
    "server route registry unavailable",
  );
  assertCondition(
    typeof registry.readExactRouteSnapshot === "function",
    "server route registry snapshot method unavailable",
  );
  assertCondition(
    typeof registry.compareAndSwapExactRouteSnapshot === "function",
    "server route registry compare-and-swap method unavailable",
  );

  let snapshot:
    PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerRegistrySnapshotV1
    | null = null;
  let registrationAttempted = false;
  let compareAndSwapApplied = false;
  let revisionAfter: string | null = null;
  let unrelatedAfter: number | null = null;
  let exactAfter: number | null = null;

  const registrar:
    PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerRegistrarV1 = {
      inspectExactRoutes(
        identities,
      ) {
        assertCondition(
          snapshot === null,
          "trusted requester server registrar integration inspection is one-shot",
        );
        assertCanonicalIdentitySet(
          identities,
          "trusted requester server registrar integration identities",
        );
        snapshot =
          validateSnapshot(
            registry.readExactRouteSnapshot(),
          );
        const routeMap = new Map(
          snapshot.routes.map(
            (entry) => [
              routeKey(
                entry.method,
                entry.path,
              ),
              entry,
            ],
          ),
        );
        return identities.map(
          (identity) => {
            const existing =
              routeMap.get(
                routeKey(
                  identity.method,
                  identity.path,
                ),
              );
            if (existing === undefined) {
              return {
                ...identity,
                occupied:
                  false,
                existing_handler_id:
                  null,
              };
            }
            return {
              ...identity,
              occupied:
                true,
              existing_handler_id:
                existing.handler_id,
            };
          },
        );
      },

      registerExactRoutesAtomically(
        registrations,
      ): PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerRegistrationReceiptV1 {
        assertCondition(
          snapshot !== null,
          "trusted requester server registrar integration requires prior inspection",
        );
        assertCondition(
          !registrationAttempted,
          "trusted requester server registrar integration registration is one-shot",
        );
        registrationAttempted = true;
        assertCanonicalIdentitySet(
          registrations.map(
            ({ method, path, handler_id }) => ({
              method,
              path,
              handler_id,
            }),
          ),
          "trusted requester server registrar integration registrations",
        );

        let mountedHandler:
          PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerHandlerV1
          | null = null;
        for (const registration of registrations) {
          assertCondition(
            typeof registration.handle === "function",
            "trusted requester server registrar integration registration handler missing",
          );
          if (mountedHandler === null) {
            mountedHandler =
              registration.handle;
          } else {
            assertCondition(
              registration.handle === mountedHandler,
              "trusted requester server registrar integration requires one exact handler function",
            );
          }
        }

        const occupied = new Set(
          snapshot.routes.map(
            (entry) =>
              routeKey(
                entry.method,
                entry.path,
              ),
          ),
        );
        for (const registration of registrations) {
          assertCondition(
            !occupied.has(
              routeKey(
                registration.method,
                registration.path,
              ),
            ),
            "trusted requester server registrar integration registration requires all routes free",
          );
        }

        const nextRoutes:
          PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerRegistryEntryV1[] = [
            ...snapshot.routes,
            ...registrations.map(
              (registration) => ({
                method:
                  registration.method,
                path:
                  registration.path,
                handler_id:
                  registration.handler_id,
                handle:
                  registration.handle,
              }),
            ),
          ];
        validateSnapshot({
          revision:
            snapshot.revision,
          routes:
            nextRoutes,
        });

        const receipt =
          validateCompareAndSwapReceipt(
            registry.compareAndSwapExactRouteSnapshot(
              snapshot.revision,
              nextRoutes,
            ),
            snapshot.revision,
            nextRoutes.length,
          );
        compareAndSwapApplied =
          receipt.applied;
        revisionAfter =
          receipt.next_revision;
        unrelatedAfter =
          countUnrelatedRoutes(
            nextRoutes,
          );
        exactAfter =
          countCanonicalRoutes(
            nextRoutes,
          );

        return {
          registered:
            true,
          route_count:
            registrations.length,
          handler_id:
            registrations[0]!.handler_id,
        };
      },
    };

  return {
    registrar,
    observe() {
      return {
        adapter_id:
          PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_ADAPTER_ID,
        snapshot_read:
          snapshot !== null,
        compare_and_swap_attempted:
          registrationAttempted,
        compare_and_swap_applied:
          compareAndSwapApplied,
        revision_before:
          snapshot?.revision
          ?? null,
        revision_after:
          revisionAfter,
        unrelated_route_count_before:
          snapshot
            ? countUnrelatedRoutes(
                snapshot.routes,
              )
            : null,
        unrelated_route_count_after:
          unrelatedAfter,
        exact_route_count_after:
          exactAfter,
      };
    },
  };
}

export const PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_DEFAULT_DEPENDENCIES_V1:
  PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerRegistrarIntegrationDependenciesV1 = {
    loadMountConfig:
      loadPublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerMountConfigFromEnvironmentV1,
    executeMount:
      mountPublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerV1,
  };

export function publicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerRegistrarIntegrationDefaultDependencyIdentityV1(): {
  load_mount_config_exact: true;
  execute_mount_exact: true;
  sealed_mount_default_dependencies_bound: true;
} {
  assertCondition(
    PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_DEFAULT_DEPENDENCIES_V1
      .loadMountConfig
      === loadPublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerMountConfigFromEnvironmentV1,
    "default trusted server-mount config loader changed",
  );
  assertCondition(
    PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_DEFAULT_DEPENDENCIES_V1
      .executeMount
      === mountPublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerV1,
    "default trusted server-mount executor changed",
  );
  return {
    load_mount_config_exact:
      true,
    execute_mount_exact:
      true,
    sealed_mount_default_dependencies_bound:
      true,
  };
}

function authority(
  observation:
    PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerRegistrarObservationV1,
): PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerRegistrarIntegrationAuthorityV1 {
  return {
    source_level_route_registry_adapter:
      true,
    server_route_registry_snapshot_read:
      observation.snapshot_read,
    server_route_registry_compare_and_swap:
      observation.compare_and_swap_attempted,
    production_http_route_mount:
      false,
    network_listener_creation:
      false,
    live_route_registry_integration:
      false,
    src_index_modification:
      false,
    express_app_modification:
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

function emptyObservation():
  PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerRegistrarObservationV1 {
  return {
    adapter_id:
      PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_ADAPTER_ID,
    snapshot_read:
      false,
    compare_and_swap_attempted:
      false,
    compare_and_swap_applied:
      false,
    revision_before:
      null,
    revision_after:
      null,
    unrelated_route_count_before:
      null,
    unrelated_route_count_after:
      null,
    exact_route_count_after:
      null,
  };
}

function integrationResult(
  status:
    PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerRegistrarIntegrationResultV1[
      "status"
    ],
  enabled: boolean,
  apply: boolean,
  confirmationVerified: boolean,
  mountConfirmationVerified: boolean,
  observation:
    PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerRegistrarObservationV1,
  mount:
    PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerMountResultV1
    | null,
): PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerRegistrarIntegrationResultV1 {
  return {
    marker:
      PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_RESULT_MARKER,
    version:
      PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_VERSION,
    status,
    enabled,
    apply,
    confirmation_verified:
      confirmationVerified,
    mount_confirmation_verified:
      mountConfirmationVerified,
    registry_snapshot_read:
      observation.snapshot_read,
    registry_compare_and_swap_attempted:
      observation.compare_and_swap_attempted,
    registry_compare_and_swap_applied:
      observation.compare_and_swap_applied,
    registry_revision_before:
      observation.revision_before,
    registry_revision_after:
      observation.revision_after,
    unrelated_route_count_before:
      observation.unrelated_route_count_before,
    unrelated_route_count_after:
      observation.unrelated_route_count_after,
    exact_route_count_after:
      observation.exact_route_count_after,
    trusted_input_provider_deferred:
      mount?.trusted_input_provider_deferred
      ?? true,
    mount,
    authority:
      authority(
        observation,
      ),
  };
}

export function executePublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerRegistrarIntegrationV1(
  configValue: unknown,
  commandValue: unknown,
  environment: NodeJS.ProcessEnv,
  trustedReplayPlanInputProvider: () => unknown,
  registry:
    PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerRegistryV1,
  mountDependencies:
    PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerMountDependenciesV1,
  dependencies:
    PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerRegistrarIntegrationDependenciesV1 =
      PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_DEFAULT_DEPENDENCIES_V1,
): PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerRegistrarIntegrationResultV1 {
  const config =
    validatePublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerRegistrarIntegrationConfigV1(
      configValue,
    );

  if (!config.enabled) {
    const observation =
      emptyObservation();
    return integrationResult(
      "disabled",
      false,
      false,
      false,
      false,
      observation,
      null,
    );
  }

  const command =
    validatePublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerRegistrarIntegrationCommandV1(
      commandValue,
    );

  const confirmationVerified =
    !command.apply
    || command.confirmation
      === PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_CONFIRMATION;
  assertCondition(
    confirmationVerified,
    "applied trusted requester server registrar integration requires exact confirmation",
  );
  assertCondition(
    command.apply
      || command.confirmation === "",
    "dry-run trusted requester server registrar integration confirmation must be empty",
  );

  const mountConfirmationVerified =
    !command.apply
    || command.mount_confirmation
      === PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_CONFIRMATION;
  assertCondition(
    mountConfirmationVerified,
    "applied trusted requester server registrar integration requires exact mount confirmation",
  );
  assertCondition(
    command.apply
      || command.mount_confirmation === "",
    "dry-run trusted requester server registrar integration mount confirmation must be empty",
  );

  const integrated =
    createPublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerRegistrarIntegrationV1(
      registry,
    );
  const mount =
    dependencies.executeMount(
      dependencies.loadMountConfig(
        environment,
      ),
      {
        marker:
          PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_COMMAND_MARKER,
        version:
          PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_VERSION,
        apply:
          command.apply,
        confirmation:
          command.mount_confirmation,
      },
      environment,
      trustedReplayPlanInputProvider,
      integrated.registrar,
      mountDependencies,
    );
  const observation =
    integrated.observe();

  const status:
    PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerRegistrarIntegrationResultV1[
      "status"
    ] =
      mount.status === "disabled"
        ? "mount_disabled"
        : mount.status;

  return integrationResult(
    status,
    true,
    command.apply,
    confirmationVerified,
    mountConfirmationVerified,
    observation,
    mount,
  );
}

export function executePublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerRegistrarIntegrationFromEnvironmentV1(
  commandValue: unknown,
  environment: NodeJS.ProcessEnv,
  trustedReplayPlanInputProvider: () => unknown,
  registry:
    PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerRegistryV1,
  mountDependencies:
    PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerMountDependenciesV1,
  dependencies:
    PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerRegistrarIntegrationDependenciesV1 =
      PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_DEFAULT_DEPENDENCIES_V1,
): PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerRegistrarIntegrationResultV1 {
  return executePublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerRegistrarIntegrationV1(
    loadPublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerRegistrarIntegrationConfigFromEnvironmentV1(
      environment,
    ),
    commandValue,
    environment,
    trustedReplayPlanInputProvider,
    registry,
    mountDependencies,
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
    mountExamplePath,
    ...extra
  ] = process.argv.slice(2);
  assertCondition(
    extra.length === 0,
    "unexpected arguments",
  );
  if (
    mode !== "example"
    || mountExamplePath === undefined
  ) {
    fail(
      "usage: tsx scripts/public_agent_service_trusted_requester_acceptance_persistence_http_route_server_registrar_integration_v1.ts example <trusted-server-mount-example.json>",
    );
  }

  const mountExample =
    requireRecord(
      readJsonFile(
        mountExamplePath,
      ),
      "trusted requester server-mount example",
    );
  assertCondition(
    mountExample.marker
      === "VOID_PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_EXAMPLE_V1",
    "trusted requester server-mount example marker mismatch",
  );

  const config = {
    marker:
      PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_CONFIG_MARKER,
    version:
      PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_VERSION,
    enabled:
      false,
  };
  const command = {
    marker:
      PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_COMMAND_MARKER,
    version:
      PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_VERSION,
    apply:
      false,
    confirmation:
      "",
    mount_confirmation:
      "",
  };

  const resultValue =
    executePublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerRegistrarIntegrationV1(
      config,
      new Proxy(
        {},
        {
          ownKeys() {
            fail(
              "disabled example inspected command",
            );
          },
        },
      ),
      {},
      () =>
        fail(
          "disabled example invoked trusted provider",
        ),
      {
        readExactRouteSnapshot() {
          fail(
            "disabled example read route registry",
          );
        },
        compareAndSwapExactRouteSnapshot() {
          fail(
            "disabled example mutated route registry",
          );
        },
      },
      {
        loadRouteConfig:
          () =>
            fail(
              "disabled example loaded lower route config",
            ),
        handleRoute:
          () =>
            fail(
              "disabled example invoked lower route handler",
            ),
      },
      {
        loadMountConfig:
          () =>
            fail(
              "disabled example loaded mount config",
            ),
        executeMount:
          () =>
            fail(
              "disabled example executed mount",
            ),
      },
    );

  process.stdout.write(
    `${JSON.stringify(
      {
        marker:
          PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_EXAMPLE_MARKER,
        version:
          PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_VERSION,
        example_only:
          true,
        sealed_mount_example_marker:
          mountExample.marker,
        config,
        command,
        result:
          resultValue,
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
