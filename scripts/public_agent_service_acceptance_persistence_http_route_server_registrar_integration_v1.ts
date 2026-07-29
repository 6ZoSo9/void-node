import {
  PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_HANDLER_ID,
  PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_METHOD,
  PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_COMMAND_MARKER,
  PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_CONFIRMATION,
  PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_DEFAULT_DEPENDENCIES_V1,
  PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_VERSION,
  executePublicAgentServiceAcceptancePersistenceHttpRouteServerMountBindingFromEnvironmentV1,
  publicAgentServiceAcceptancePersistenceHttpRouteServerMountRouteIdentitiesV1,
  type PublicAgentServiceAcceptancePersistenceHttpRouteServerHandlerV1,
  type PublicAgentServiceAcceptancePersistenceHttpRouteServerIdentityV1,
  type PublicAgentServiceAcceptancePersistenceHttpRouteServerInspectionV1,
  type PublicAgentServiceAcceptancePersistenceHttpRouteServerMountDependenciesV1,
  type PublicAgentServiceAcceptancePersistenceHttpRouteServerMountResultV1,
  type PublicAgentServiceAcceptancePersistenceHttpRouteServerRegistrarV1,
  type PublicAgentServiceAcceptancePersistenceHttpRouteServerRegistrationReceiptV1,
  type PublicAgentServiceAcceptancePersistenceHttpRouteServerRegistrationV1,
} from "./public_agent_service_acceptance_persistence_http_route_server_mount_binding_v1.js";

export const PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_MARKER =
  "VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_V1" as const;
export const PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_CONFIG_MARKER =
  "VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_CONFIG_V1" as const;
export const PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_COMMAND_MARKER =
  "VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_COMMAND_V1" as const;
export const PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_RESULT_MARKER =
  "VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_RESULT_V1" as const;
export const PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_VERSION =
  1 as const;

export const PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_ENABLED_ENV =
  "VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_ENABLED" as const;
export const PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_CONFIRMATION =
  "integrateAcceptancePersistenceHttpRouteServerRegistrarV1" as const;
export const PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_ADAPTER_ID =
  "void.public-agent-service-acceptance-persistence-http-route-server-registrar.v1" as const;

export interface PublicAgentServiceAcceptancePersistenceHttpRouteServerRegistrarIntegrationConfigV1 {
  marker:
    typeof PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_CONFIG_MARKER;
  version:
    typeof PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_VERSION;
  enabled: boolean;
}

export interface PublicAgentServiceAcceptancePersistenceHttpRouteServerRegistrarIntegrationCommandV1 {
  marker:
    typeof PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_COMMAND_MARKER;
  version:
    typeof PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_VERSION;
  apply: boolean;
  confirmation: string;
  mount_confirmation: string;
}

export interface PublicAgentServiceAcceptancePersistenceHttpRouteServerRegistryEntryV1 {
  method: string;
  path: string;
  handler_id: string;
  handle:
    PublicAgentServiceAcceptancePersistenceHttpRouteServerHandlerV1;
}

export interface PublicAgentServiceAcceptancePersistenceHttpRouteServerRegistrySnapshotV1 {
  revision: string;
  routes:
    readonly PublicAgentServiceAcceptancePersistenceHttpRouteServerRegistryEntryV1[];
}

export interface PublicAgentServiceAcceptancePersistenceHttpRouteServerRegistryCompareAndSwapReceiptV1 {
  applied: boolean;
  previous_revision: string;
  next_revision: string;
  route_count: number;
}

export interface PublicAgentServiceAcceptancePersistenceHttpRouteServerRegistryV1 {
  readExactRouteSnapshot: () =>
    PublicAgentServiceAcceptancePersistenceHttpRouteServerRegistrySnapshotV1;
  compareAndSwapExactRouteSnapshot: (
    expectedRevision: string,
    routes:
      readonly PublicAgentServiceAcceptancePersistenceHttpRouteServerRegistryEntryV1[],
  ) =>
    PublicAgentServiceAcceptancePersistenceHttpRouteServerRegistryCompareAndSwapReceiptV1;
}

export interface PublicAgentServiceAcceptancePersistenceHttpRouteServerRegistrarIntegrationDependenciesV1 {
  executeMount: (
    environment: NodeJS.ProcessEnv,
    command: unknown,
    trustedContextProvider: () => unknown,
    registrar:
      PublicAgentServiceAcceptancePersistenceHttpRouteServerRegistrarV1,
    dependencies?:
      PublicAgentServiceAcceptancePersistenceHttpRouteServerMountDependenciesV1,
  ) =>
    PublicAgentServiceAcceptancePersistenceHttpRouteServerMountResultV1;
}

export interface PublicAgentServiceAcceptancePersistenceHttpRouteServerRegistrarIntegrationAuthorityV1 {
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

export interface PublicAgentServiceAcceptancePersistenceHttpRouteServerRegistrarIntegrationResultV1 {
  marker:
    typeof PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_RESULT_MARKER;
  version:
    typeof PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_VERSION;
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
  mount:
    PublicAgentServiceAcceptancePersistenceHttpRouteServerMountResultV1 | null;
  authority:
    PublicAgentServiceAcceptancePersistenceHttpRouteServerRegistrarIntegrationAuthorityV1;
}

interface RegistrarObservationV1 {
  snapshot_read: boolean;
  compare_and_swap_attempted: boolean;
  compare_and_swap_applied: boolean;
  revision_before: string | null;
  revision_after: string | null;
  unrelated_route_count_before: number | null;
  unrelated_route_count_after: number | null;
  exact_route_count_after: number | null;
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
  maximum: number,
  allowEmpty = false,
): string {
  assertCondition(
    typeof value === "string",
    `${label} must be a string`,
  );
  assertCondition(
    value.length <= maximum,
    `${label} is too long`,
  );
  assertCondition(
    allowEmpty || value.length > 0,
    `${label} must not be empty`,
  );
  return value;
}

function parseFlag(
  value: string | undefined,
  label: string,
): boolean {
  if (value === undefined || value === "") {
    return false;
  }
  assertCondition(
    value === "0" || value === "1",
    `${label} must be 0 or 1`,
  );
  return value === "1";
}

function routeKey(
  method: string,
  path: string,
): string {
  return `${method}\u0000${path}`;
}

function canonicalIdentities():
  readonly PublicAgentServiceAcceptancePersistenceHttpRouteServerIdentityV1[] {
  return publicAgentServiceAcceptancePersistenceHttpRouteServerMountRouteIdentitiesV1();
}

function requireCanonicalIdentities(
  value:
    readonly PublicAgentServiceAcceptancePersistenceHttpRouteServerIdentityV1[],
  label: string,
): void {
  const expected = canonicalIdentities();
  assertCondition(
    Array.isArray(value),
    `${label} must be an array`,
  );
  assertCondition(
    value.length === expected.length,
    `${label} must contain exactly two routes`,
  );
  for (let index = 0; index < expected.length; index += 1) {
    const actual = value[index];
    const canonical = expected[index];
    assertCondition(
      actual.method === canonical.method
        && actual.path === canonical.path
        && actual.handler_id === canonical.handler_id,
      `${label}[${index}] is not canonical`,
    );
  }
}

function validateRegistryEntry(
  value: unknown,
  label: string,
): PublicAgentServiceAcceptancePersistenceHttpRouteServerRegistryEntryV1 {
  const record = requireRecord(
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
  const method = requireString(
    record.method,
    `${label}.method`,
    32,
  );
  assertCondition(
    /^[A-Z]+$/.test(method),
    `${label}.method must contain uppercase ASCII letters`,
  );
  const path = requireString(
    record.path,
    `${label}.path`,
    1024,
  );
  assertCondition(
    path.startsWith("/"),
    `${label}.path must start with /`,
  );
  assertCondition(
    !/[\u0000-\u001f\u007f]/.test(path),
    `${label}.path contains control characters`,
  );
  const handlerId = requireString(
    record.handler_id,
    `${label}.handler_id`,
    256,
  );
  assertCondition(
    typeof record.handle === "function",
    `${label}.handle must be a function`,
  );
  return Object.freeze({
    method,
    path,
    handler_id:
      handlerId,
    handle:
      record.handle as PublicAgentServiceAcceptancePersistenceHttpRouteServerHandlerV1,
  });
}

function validateSnapshot(
  value: unknown,
): PublicAgentServiceAcceptancePersistenceHttpRouteServerRegistrySnapshotV1 {
  const record = requireRecord(
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
  const revision = requireString(
    record.revision,
    "registry snapshot.revision",
    128,
  );
  assertCondition(
    Array.isArray(record.routes),
    "registry snapshot.routes must be an array",
  );
  assertCondition(
    record.routes.length <= 4096,
    "registry snapshot.routes exceeds 4096",
  );
  const routes = record.routes.map(
    (entry, index) =>
      validateRegistryEntry(
        entry,
        `registry snapshot.routes[${index}]`,
      ),
  );
  const keys = new Set<string>();
  for (const entry of routes) {
    const key = routeKey(
      entry.method,
      entry.path,
    );
    assertCondition(
      !keys.has(key),
      "registry snapshot contains duplicate route keys",
    );
    keys.add(key);
  }
  return Object.freeze({
    revision,
    routes:
      Object.freeze(routes),
  });
}

function validateCompareAndSwapReceipt(
  value: unknown,
  expectedRevision: string,
  expectedRouteCount: number,
): PublicAgentServiceAcceptancePersistenceHttpRouteServerRegistryCompareAndSwapReceiptV1 {
  const record = requireRecord(
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
  const previousRevision = requireString(
    record.previous_revision,
    "registry compare-and-swap receipt.previous_revision",
    128,
  );
  const nextRevision = requireString(
    record.next_revision,
    "registry compare-and-swap receipt.next_revision",
    128,
  );
  assertCondition(
    previousRevision === expectedRevision,
    "registry compare-and-swap previous revision mismatch",
  );
  assertCondition(
    nextRevision !== previousRevision,
    "registry compare-and-swap next revision must change",
  );
  assertCondition(
    Number.isSafeInteger(record.route_count)
      && record.route_count === expectedRouteCount,
    "registry compare-and-swap route count mismatch",
  );
  return Object.freeze({
    applied:
      true,
    previous_revision:
      previousRevision,
    next_revision:
      nextRevision,
    route_count:
      expectedRouteCount,
  });
}

function isCanonicalKey(
  method: string,
  path: string,
): boolean {
  return canonicalIdentities().some(
    (identity) =>
      identity.method === method
      && identity.path === path,
  );
}

function countCanonicalRoutes(
  routes:
    readonly PublicAgentServiceAcceptancePersistenceHttpRouteServerRegistryEntryV1[],
): number {
  return routes.filter(
    (entry) =>
      isCanonicalKey(
        entry.method,
        entry.path,
      )
      && entry.handler_id
        === PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_HANDLER_ID,
  ).length;
}

function countUnrelatedRoutes(
  routes:
    readonly PublicAgentServiceAcceptancePersistenceHttpRouteServerRegistryEntryV1[],
): number {
  return routes.filter(
    (entry) =>
      !isCanonicalKey(
        entry.method,
        entry.path,
      ),
  ).length;
}

export function validatePublicAgentServiceAcceptancePersistenceHttpRouteServerRegistrarIntegrationConfigV1(
  value: unknown,
): PublicAgentServiceAcceptancePersistenceHttpRouteServerRegistrarIntegrationConfigV1 {
  const record = requireRecord(
    value,
    "server registrar integration config",
  );
  requireExactKeys(
    record,
    "server registrar integration config",
    [
      "marker",
      "version",
      "enabled",
    ],
  );
  assertCondition(
    record.marker
      === PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_CONFIG_MARKER,
    "server registrar integration config marker mismatch",
  );
  assertCondition(
    record.version
      === PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_VERSION,
    "server registrar integration config version mismatch",
  );
  return Object.freeze({
    marker:
      PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_CONFIG_MARKER,
    version:
      PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_VERSION,
    enabled:
      requireBoolean(
        record.enabled,
        "server registrar integration config.enabled",
      ),
  });
}

export function validatePublicAgentServiceAcceptancePersistenceHttpRouteServerRegistrarIntegrationCommandV1(
  value: unknown,
): PublicAgentServiceAcceptancePersistenceHttpRouteServerRegistrarIntegrationCommandV1 {
  const record = requireRecord(
    value,
    "server registrar integration command",
  );
  requireExactKeys(
    record,
    "server registrar integration command",
    [
      "marker",
      "version",
      "apply",
      "confirmation",
      "mount_confirmation",
    ],
  );
  assertCondition(
    record.marker
      === PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_COMMAND_MARKER,
    "server registrar integration command marker mismatch",
  );
  assertCondition(
    record.version
      === PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_VERSION,
    "server registrar integration command version mismatch",
  );
  return Object.freeze({
    marker:
      PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_COMMAND_MARKER,
    version:
      PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_VERSION,
    apply:
      requireBoolean(
        record.apply,
        "server registrar integration command.apply",
      ),
    confirmation:
      requireString(
        record.confirmation,
        "server registrar integration command.confirmation",
        128,
        true,
      ),
    mount_confirmation:
      requireString(
        record.mount_confirmation,
        "server registrar integration command.mount_confirmation",
        128,
        true,
      ),
  });
}

export function loadPublicAgentServiceAcceptancePersistenceHttpRouteServerRegistrarIntegrationConfigFromEnvironmentV1(
  environment: NodeJS.ProcessEnv,
): PublicAgentServiceAcceptancePersistenceHttpRouteServerRegistrarIntegrationConfigV1 {
  return Object.freeze({
    marker:
      PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_CONFIG_MARKER,
    version:
      PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_VERSION,
    enabled:
      parseFlag(
        environment[
          PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_ENABLED_ENV
        ],
        PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_ENABLED_ENV,
      ),
  });
}

export function createPublicAgentServiceAcceptancePersistenceHttpRouteServerRegistrarIntegrationV1(
  registry:
    PublicAgentServiceAcceptancePersistenceHttpRouteServerRegistryV1,
): {
  registrar:
    PublicAgentServiceAcceptancePersistenceHttpRouteServerRegistrarV1;
  observe: () => RegistrarObservationV1;
} {
  let snapshot:
    PublicAgentServiceAcceptancePersistenceHttpRouteServerRegistrySnapshotV1
      | null =
        null;
  let inspections:
    readonly PublicAgentServiceAcceptancePersistenceHttpRouteServerInspectionV1[]
      | null =
        null;
  let registrationAttempted =
    false;
  let compareAndSwapApplied =
    false;
  let revisionAfter:
    string | null =
      null;
  let unrelatedAfter:
    number | null =
      null;
  let exactAfter:
    number | null =
      null;

  const registrar:
    PublicAgentServiceAcceptancePersistenceHttpRouteServerRegistrarV1 =
      Object.freeze({
        inspectExactRoutes:
          (identities) => {
            assertCondition(
              snapshot === null,
              "server registrar integration inspection is one-shot",
            );
            requireCanonicalIdentities(
              identities,
              "server registrar integration identities",
            );
            snapshot = validateSnapshot(
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
                ] as const,
              ),
            );
            inspections = identities.map(
              (identity) => {
                const existing = routeMap.get(
                  routeKey(
                    identity.method,
                    identity.path,
                  ),
                );
                if (!existing) {
                  return Object.freeze({
                    ...identity,
                    state:
                      "free" as const,
                    existing_handler_id:
                      null,
                  });
                }
                const exact =
                  existing.handler_id
                    === identity.handler_id;
                return Object.freeze({
                  ...identity,
                  state:
                    exact
                      ? "exact" as const
                      : "conflict" as const,
                  existing_handler_id:
                    existing.handler_id,
                });
              },
            );
            return Object.freeze(
              [...inspections],
            );
          },
        registerExactRoutesAtomically:
          (registrations) => {
            assertCondition(
              snapshot !== null
                && inspections !== null,
              "server registrar integration requires prior inspection",
            );
            assertCondition(
              !registrationAttempted,
              "server registrar integration registration is one-shot",
            );
            registrationAttempted =
              true;
            requireCanonicalIdentities(
              registrations,
              "server registrar integration registrations",
            );
            assertCondition(
              registrations.every(
                (registration) =>
                  typeof registration.handle
                    === "function",
              ),
              "server registrar integration registration handler missing",
            );
            assertCondition(
              registrations[0].handle
                === registrations[1].handle,
              "server registrar integration requires one exact handler function",
            );
            assertCondition(
              inspections.every(
                (inspection) =>
                  inspection.state
                    === "free",
              ),
              "server registrar integration registration requires all routes free",
            );

            const nextRoutes =
              Object.freeze([
                ...snapshot.routes,
                ...registrations.map(
                  (registration) =>
                    Object.freeze({
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
              ]);
            const expectedRevision =
              snapshot.revision;
            const receipt =
              validateCompareAndSwapReceipt(
                registry.compareAndSwapExactRouteSnapshot(
                  expectedRevision,
                  nextRoutes,
                ),
                expectedRevision,
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
            return Object.freeze({
              registered:
                true,
              route_count:
                registrations.length,
              handler_id:
                PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_HANDLER_ID,
            } satisfies PublicAgentServiceAcceptancePersistenceHttpRouteServerRegistrationReceiptV1);
          },
      });

  return Object.freeze({
    registrar,
    observe:
      () =>
        Object.freeze({
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
        }),
  });
}

export const PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_DEFAULT_DEPENDENCIES_V1:
  PublicAgentServiceAcceptancePersistenceHttpRouteServerRegistrarIntegrationDependenciesV1 =
    Object.freeze({
      executeMount:
        executePublicAgentServiceAcceptancePersistenceHttpRouteServerMountBindingFromEnvironmentV1,
    });

export function publicAgentServiceAcceptancePersistenceHttpRouteServerRegistrarIntegrationDefaultDependencyIdentityV1(): {
  execute_mount_exact: boolean;
  sealed_mount_default_dependencies_bound: boolean;
} {
  return Object.freeze({
    execute_mount_exact:
      PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_DEFAULT_DEPENDENCIES_V1.executeMount
        === executePublicAgentServiceAcceptancePersistenceHttpRouteServerMountBindingFromEnvironmentV1,
    sealed_mount_default_dependencies_bound:
      PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_DEFAULT_DEPENDENCIES_V1
        !== undefined,
  });
}

function authority(
  observation: RegistrarObservationV1,
): PublicAgentServiceAcceptancePersistenceHttpRouteServerRegistrarIntegrationAuthorityV1 {
  return Object.freeze({
    server_route_registry_snapshot_read:
      observation.snapshot_read,
    server_route_registry_compare_and_swap:
      observation.compare_and_swap_attempted,
    network_listener_creation:
      false,
    external_http_submission:
      false,
    production_acceptance_persistence:
      false,
    production_replay_write:
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

function result(
  status:
    PublicAgentServiceAcceptancePersistenceHttpRouteServerRegistrarIntegrationResultV1["status"],
  enabled: boolean,
  apply: boolean,
  confirmationVerified: boolean,
  mountConfirmationVerified: boolean,
  observation: RegistrarObservationV1,
  mount:
    PublicAgentServiceAcceptancePersistenceHttpRouteServerMountResultV1 | null,
): PublicAgentServiceAcceptancePersistenceHttpRouteServerRegistrarIntegrationResultV1 {
  return Object.freeze({
    marker:
      PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_RESULT_MARKER,
    version:
      PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_VERSION,
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
    mount,
    authority:
      authority(
        observation,
      ),
  });
}

const EMPTY_OBSERVATION:
  RegistrarObservationV1 =
    Object.freeze({
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
    });

export function executePublicAgentServiceAcceptancePersistenceHttpRouteServerRegistrarIntegrationV1(
  configValue: unknown,
  commandValue: unknown,
  environment: NodeJS.ProcessEnv,
  trustedContextProvider: () => unknown,
  registry:
    PublicAgentServiceAcceptancePersistenceHttpRouteServerRegistryV1,
  mountDependencies:
    PublicAgentServiceAcceptancePersistenceHttpRouteServerMountDependenciesV1 =
      PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_DEFAULT_DEPENDENCIES_V1,
  dependencies:
    PublicAgentServiceAcceptancePersistenceHttpRouteServerRegistrarIntegrationDependenciesV1 =
      PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_DEFAULT_DEPENDENCIES_V1,
): PublicAgentServiceAcceptancePersistenceHttpRouteServerRegistrarIntegrationResultV1 {
  const config =
    validatePublicAgentServiceAcceptancePersistenceHttpRouteServerRegistrarIntegrationConfigV1(
      configValue,
    );
  if (!config.enabled) {
    return result(
      "disabled",
      false,
      false,
      false,
      false,
      EMPTY_OBSERVATION,
      null,
    );
  }

  const command =
    validatePublicAgentServiceAcceptancePersistenceHttpRouteServerRegistrarIntegrationCommandV1(
      commandValue,
    );
  const confirmationVerified =
    !command.apply
    || command.confirmation
      === PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_CONFIRMATION;
  assertCondition(
    confirmationVerified,
    "applied server registrar integration requires exact confirmation",
  );
  assertCondition(
    command.apply
      || command.confirmation === "",
    "dry-run server registrar integration confirmation must be empty",
  );
  const mountConfirmationVerified =
    !command.apply
    || command.mount_confirmation
      === PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_CONFIRMATION;
  assertCondition(
    mountConfirmationVerified,
    "applied server registrar integration requires exact mount confirmation",
  );
  assertCondition(
    command.apply
      || command.mount_confirmation === "",
    "dry-run server registrar integration mount confirmation must be empty",
  );

  const integrated =
    createPublicAgentServiceAcceptancePersistenceHttpRouteServerRegistrarIntegrationV1(
      registry,
    );
  const mount =
    dependencies.executeMount(
      environment,
      Object.freeze({
        marker:
          PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_COMMAND_MARKER,
        version:
          PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_VERSION,
        apply:
          command.apply,
        confirmation:
          command.mount_confirmation,
      }),
      trustedContextProvider,
      integrated.registrar,
      mountDependencies,
    );
  const observation =
    integrated.observe();

  const status =
    mount.status === "disabled"
      ? "mount_disabled"
      : mount.status;

  return result(
    status,
    true,
    command.apply,
    confirmationVerified,
    mountConfirmationVerified,
    observation,
    mount,
  );
}

export function executePublicAgentServiceAcceptancePersistenceHttpRouteServerRegistrarIntegrationFromEnvironmentV1(
  environment: NodeJS.ProcessEnv,
  commandValue: unknown,
  trustedContextProvider: () => unknown,
  registry:
    PublicAgentServiceAcceptancePersistenceHttpRouteServerRegistryV1,
  mountDependencies:
    PublicAgentServiceAcceptancePersistenceHttpRouteServerMountDependenciesV1 =
      PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_DEFAULT_DEPENDENCIES_V1,
  dependencies:
    PublicAgentServiceAcceptancePersistenceHttpRouteServerRegistrarIntegrationDependenciesV1 =
      PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_DEFAULT_DEPENDENCIES_V1,
): PublicAgentServiceAcceptancePersistenceHttpRouteServerRegistrarIntegrationResultV1 {
  return executePublicAgentServiceAcceptancePersistenceHttpRouteServerRegistrarIntegrationV1(
    loadPublicAgentServiceAcceptancePersistenceHttpRouteServerRegistrarIntegrationConfigFromEnvironmentV1(
      environment,
    ),
    commandValue,
    environment,
    trustedContextProvider,
    registry,
    mountDependencies,
    dependencies,
  );
}
