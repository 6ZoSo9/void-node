import {
  PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_COMMAND_PATH,
  PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_DEFAULT_DEPENDENCIES_V1,
  PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_STATUS_PATH,
  handlePublicAgentServiceAcceptancePersistenceHttpRouteFromEnvironmentV1,
  loadPublicAgentServiceAcceptancePersistenceHttpRouteConfigFromEnvironmentV1,
  type PublicAgentServiceAcceptancePersistenceHttpRequestV1,
  type PublicAgentServiceAcceptancePersistenceHttpResponseV1,
  type PublicAgentServiceAcceptancePersistenceHttpRouteConfigV1,
  type PublicAgentServiceAcceptancePersistenceHttpRouteDependenciesV1,
} from "./public_agent_service_acceptance_persistence_http_route_binding_v1.js";

export const PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_BINDING_MARKER =
  "VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_BINDING_V1" as const;
export const PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_CONFIG_MARKER =
  "VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_CONFIG_V1" as const;
export const PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_COMMAND_MARKER =
  "VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_COMMAND_V1" as const;
export const PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_RESULT_MARKER =
  "VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_RESULT_V1" as const;
export const PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_VERSION =
  1 as const;

export const PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_ENABLED_ENV =
  "VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_ENABLED" as const;
export const PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_CONFIRMATION =
  "mountAcceptancePersistenceHttpRouteServerV1" as const;
export const PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_HANDLER_ID =
  "void.public-agent-service-acceptance-persistence-http-route.v1" as const;
export const PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_METHOD =
  "ALL" as const;

export interface PublicAgentServiceAcceptancePersistenceHttpRouteServerMountConfigV1 {
  marker:
    typeof PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_CONFIG_MARKER;
  version:
    typeof PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_VERSION;
  enabled: boolean;
}

export interface PublicAgentServiceAcceptancePersistenceHttpRouteServerMountCommandV1 {
  marker:
    typeof PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_COMMAND_MARKER;
  version:
    typeof PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_VERSION;
  apply: boolean;
  confirmation: string;
}

export interface PublicAgentServiceAcceptancePersistenceHttpRouteServerIdentityV1 {
  method:
    typeof PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_METHOD;
  path:
    | typeof PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_STATUS_PATH
    | typeof PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_COMMAND_PATH;
  handler_id:
    typeof PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_HANDLER_ID;
}

export interface PublicAgentServiceAcceptancePersistenceHttpRouteServerInspectionV1
  extends PublicAgentServiceAcceptancePersistenceHttpRouteServerIdentityV1 {
  state: "free" | "exact" | "conflict";
  existing_handler_id: string | null;
}

export type PublicAgentServiceAcceptancePersistenceHttpRouteServerHandlerV1 = (
  request: PublicAgentServiceAcceptancePersistenceHttpRequestV1,
) => PublicAgentServiceAcceptancePersistenceHttpResponseV1;

export interface PublicAgentServiceAcceptancePersistenceHttpRouteServerRegistrationV1
  extends PublicAgentServiceAcceptancePersistenceHttpRouteServerIdentityV1 {
  handle:
    PublicAgentServiceAcceptancePersistenceHttpRouteServerHandlerV1;
}

export interface PublicAgentServiceAcceptancePersistenceHttpRouteServerRegistrationReceiptV1 {
  registered: boolean;
  route_count: number;
  handler_id:
    typeof PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_HANDLER_ID;
}

export interface PublicAgentServiceAcceptancePersistenceHttpRouteServerRegistrarV1 {
  inspectExactRoutes: (
    routes:
      readonly PublicAgentServiceAcceptancePersistenceHttpRouteServerIdentityV1[],
  ) =>
    readonly PublicAgentServiceAcceptancePersistenceHttpRouteServerInspectionV1[];
  registerExactRoutesAtomically: (
    routes:
      readonly PublicAgentServiceAcceptancePersistenceHttpRouteServerRegistrationV1[],
  ) =>
    PublicAgentServiceAcceptancePersistenceHttpRouteServerRegistrationReceiptV1;
}

export interface PublicAgentServiceAcceptancePersistenceHttpRouteServerMountDependenciesV1 {
  loadRouteConfig: (
    environment: NodeJS.ProcessEnv,
  ) => PublicAgentServiceAcceptancePersistenceHttpRouteConfigV1;
  handleRoute: (
    environment: NodeJS.ProcessEnv,
    request: PublicAgentServiceAcceptancePersistenceHttpRequestV1,
    trustedContextProvider: () => unknown,
    dependencies?: PublicAgentServiceAcceptancePersistenceHttpRouteDependenciesV1,
  ) => PublicAgentServiceAcceptancePersistenceHttpResponseV1;
}

export interface PublicAgentServiceAcceptancePersistenceHttpRouteServerMountAuthorityV1 {
  server_route_registration: boolean;
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

export interface PublicAgentServiceAcceptancePersistenceHttpRouteServerMountResultV1 {
  marker:
    typeof PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_RESULT_MARKER;
  version:
    typeof PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_VERSION;
  status:
    | "disabled"
    | "route_disabled"
    | "planned"
    | "mounted"
    | "already_mounted";
  enabled: boolean;
  route_enabled: boolean;
  apply: boolean;
  confirmation_verified: boolean;
  route_config_loaded: boolean;
  registrar_inspected: boolean;
  registration_attempted: boolean;
  mounted_route_count: number;
  already_mounted_route_count: number;
  exact_route_set: boolean;
  handler_identity_exact: boolean;
  authority:
    PublicAgentServiceAcceptancePersistenceHttpRouteServerMountAuthorityV1;
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

function authority(
  serverRouteRegistration: boolean,
): PublicAgentServiceAcceptancePersistenceHttpRouteServerMountAuthorityV1 {
  return {
    server_route_registration:
      serverRouteRegistration,
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
  };
}

function result(
  status:
    PublicAgentServiceAcceptancePersistenceHttpRouteServerMountResultV1["status"],
  enabled: boolean,
  routeEnabled: boolean,
  apply: boolean,
  confirmationVerified: boolean,
  routeConfigLoaded: boolean,
  registrarInspected: boolean,
  registrationAttempted: boolean,
  mountedRouteCount: number,
  alreadyMountedRouteCount: number,
  serverRouteRegistration: boolean,
): PublicAgentServiceAcceptancePersistenceHttpRouteServerMountResultV1 {
  return {
    marker:
      PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_RESULT_MARKER,
    version:
      PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_VERSION,
    status,
    enabled,
    route_enabled:
      routeEnabled,
    apply,
    confirmation_verified:
      confirmationVerified,
    route_config_loaded:
      routeConfigLoaded,
    registrar_inspected:
      registrarInspected,
    registration_attempted:
      registrationAttempted,
    mounted_route_count:
      mountedRouteCount,
    already_mounted_route_count:
      alreadyMountedRouteCount,
    exact_route_set:
      true,
    handler_identity_exact:
      true,
    authority:
      authority(
        serverRouteRegistration,
      ),
  };
}

function routeIdentities():
  readonly PublicAgentServiceAcceptancePersistenceHttpRouteServerIdentityV1[] {
  return Object.freeze([
    Object.freeze({
      method:
        PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_METHOD,
      path:
        PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_STATUS_PATH,
      handler_id:
        PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_HANDLER_ID,
    }),
    Object.freeze({
      method:
        PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_METHOD,
      path:
        PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_COMMAND_PATH,
      handler_id:
        PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_HANDLER_ID,
    }),
  ]);
}

function routeIdentityKey(
  route:
    PublicAgentServiceAcceptancePersistenceHttpRouteServerIdentityV1,
): string {
  return [
    route.method,
    route.path,
    route.handler_id,
  ].join("\n");
}

function validateInspections(
  inspections:
    readonly PublicAgentServiceAcceptancePersistenceHttpRouteServerInspectionV1[],
  expected:
    readonly PublicAgentServiceAcceptancePersistenceHttpRouteServerIdentityV1[],
): readonly PublicAgentServiceAcceptancePersistenceHttpRouteServerInspectionV1[] {
  assertCondition(
    Array.isArray(inspections),
    "route inspection result must be an array",
  );
  assertCondition(
    inspections.length === expected.length,
    "route inspection count changed",
  );

  const expectedKeys = expected
    .map(routeIdentityKey)
    .sort();
  const actualKeys = inspections
    .map((inspection) => {
      assertCondition(
        inspection.state === "free"
          || inspection.state === "exact"
          || inspection.state === "conflict",
        "route inspection state is invalid",
      );
      if (inspection.state === "free") {
        assertCondition(
          inspection.existing_handler_id === null,
          "free route inspection cannot expose a handler",
        );
      } else {
        assertCondition(
          typeof inspection.existing_handler_id === "string"
            && inspection.existing_handler_id.length > 0,
          "occupied route inspection must expose a handler identity",
        );
      }
      return routeIdentityKey(inspection);
    })
    .sort();

  assertCondition(
    JSON.stringify(actualKeys)
      === JSON.stringify(expectedKeys),
    "route inspection identity set changed",
  );
  return inspections;
}

function validateRegistrationReceipt(
  receipt:
    PublicAgentServiceAcceptancePersistenceHttpRouteServerRegistrationReceiptV1,
): void {
  assertCondition(
    isRecord(receipt),
    "registration receipt must be an object",
  );
  requireExactKeys(
    receipt,
    "registration receipt",
    [
      "registered",
      "route_count",
      "handler_id",
    ],
  );
  assertCondition(
    receipt.registered === true,
    "atomic route registration did not commit",
  );
  assertCondition(
    receipt.route_count === 2,
    "atomic route registration count changed",
  );
  assertCondition(
    receipt.handler_id
      === PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_HANDLER_ID,
    "atomic route registration handler identity changed",
  );
}

export function validatePublicAgentServiceAcceptancePersistenceHttpRouteServerMountConfigV1(
  value: unknown,
): PublicAgentServiceAcceptancePersistenceHttpRouteServerMountConfigV1 {
  const root = requireRecord(
    value,
    "acceptance persistence HTTP route server mount config",
  );
  requireExactKeys(
    root,
    "acceptance persistence HTTP route server mount config",
    [
      "marker",
      "version",
      "enabled",
    ],
  );
  assertCondition(
    root.marker
      === PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_CONFIG_MARKER,
    "server mount config marker mismatch",
  );
  assertCondition(
    root.version
      === PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_VERSION,
    "server mount config version mismatch",
  );
  return {
    marker:
      PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_CONFIG_MARKER,
    version:
      PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_VERSION,
    enabled:
      requireBoolean(
        root.enabled,
        "enabled",
      ),
  };
}

export function validatePublicAgentServiceAcceptancePersistenceHttpRouteServerMountCommandV1(
  value: unknown,
): PublicAgentServiceAcceptancePersistenceHttpRouteServerMountCommandV1 {
  const root = requireRecord(
    value,
    "acceptance persistence HTTP route server mount command",
  );
  requireExactKeys(
    root,
    "acceptance persistence HTTP route server mount command",
    [
      "marker",
      "version",
      "apply",
      "confirmation",
    ],
  );
  assertCondition(
    root.marker
      === PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_COMMAND_MARKER,
    "server mount command marker mismatch",
  );
  assertCondition(
    root.version
      === PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_VERSION,
    "server mount command version mismatch",
  );
  return {
    marker:
      PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_COMMAND_MARKER,
    version:
      PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_VERSION,
    apply:
      requireBoolean(
        root.apply,
        "apply",
      ),
    confirmation:
      requireString(
        root.confirmation,
        "confirmation",
        128,
      ),
  };
}

export function loadPublicAgentServiceAcceptancePersistenceHttpRouteServerMountConfigFromEnvironmentV1(
  environment: NodeJS.ProcessEnv,
): PublicAgentServiceAcceptancePersistenceHttpRouteServerMountConfigV1 {
  return validatePublicAgentServiceAcceptancePersistenceHttpRouteServerMountConfigV1({
    marker:
      PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_CONFIG_MARKER,
    version:
      PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_VERSION,
    enabled:
      parseFlag(
        environment[
          PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_ENABLED_ENV
        ],
        PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_ENABLED_ENV,
      ),
  });
}

export const PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_DEFAULT_DEPENDENCIES_V1:
  PublicAgentServiceAcceptancePersistenceHttpRouteServerMountDependenciesV1 =
    Object.freeze({
      loadRouteConfig:
        loadPublicAgentServiceAcceptancePersistenceHttpRouteConfigFromEnvironmentV1,
      handleRoute:
        handlePublicAgentServiceAcceptancePersistenceHttpRouteFromEnvironmentV1,
    });

export function publicAgentServiceAcceptancePersistenceHttpRouteServerMountDefaultDependencyIdentityV1(): {
  load_route_config_exact: true;
  handle_route_exact: true;
  sealed_route_default_dependencies_bound: true;
} {
  assertCondition(
    PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_DEFAULT_DEPENDENCIES_V1
      .loadRouteConfig
      === loadPublicAgentServiceAcceptancePersistenceHttpRouteConfigFromEnvironmentV1,
    "default route-config loader changed",
  );
  assertCondition(
    PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_DEFAULT_DEPENDENCIES_V1
      .handleRoute
      === handlePublicAgentServiceAcceptancePersistenceHttpRouteFromEnvironmentV1,
    "default route handler changed",
  );
  assertCondition(
    PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_DEFAULT_DEPENDENCIES_V1
      !== undefined,
    "sealed route default dependencies unavailable",
  );
  return {
    load_route_config_exact:
      true,
    handle_route_exact:
      true,
    sealed_route_default_dependencies_bound:
      true,
  };
}

export function executePublicAgentServiceAcceptancePersistenceHttpRouteServerMountBindingV1(
  configValue: unknown,
  commandValue: unknown,
  environment: NodeJS.ProcessEnv,
  trustedContextProvider: () => unknown,
  registrar:
    PublicAgentServiceAcceptancePersistenceHttpRouteServerRegistrarV1,
  dependencies:
    PublicAgentServiceAcceptancePersistenceHttpRouteServerMountDependenciesV1 =
      PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_DEFAULT_DEPENDENCIES_V1,
): PublicAgentServiceAcceptancePersistenceHttpRouteServerMountResultV1 {
  const config =
    validatePublicAgentServiceAcceptancePersistenceHttpRouteServerMountConfigV1(
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
      0,
      0,
      false,
    );
  }

  const command =
    validatePublicAgentServiceAcceptancePersistenceHttpRouteServerMountCommandV1(
      commandValue,
    );

  const confirmationVerified =
    !command.apply
    || command.confirmation
      === PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_CONFIRMATION;
  assertCondition(
    confirmationVerified,
    "applied server mount requires exact confirmation",
  );
  assertCondition(
    command.apply
      || command.confirmation === "",
    "dry-run server mount confirmation must be empty",
  );

  const routeConfig =
    dependencies.loadRouteConfig(
      environment,
    );
  if (!routeConfig.enabled) {
    return result(
      "route_disabled",
      true,
      false,
      command.apply,
      confirmationVerified,
      true,
      false,
      false,
      0,
      0,
      false,
    );
  }

  const identities = routeIdentities();
  if (!command.apply) {
    return result(
      "planned",
      true,
      true,
      false,
      false,
      true,
      false,
      false,
      0,
      0,
      false,
    );
  }

  const inspections =
    validateInspections(
      registrar.inspectExactRoutes(
        identities,
      ),
      identities,
    );
  const conflicts = inspections.filter(
    (inspection) =>
      inspection.state === "conflict",
  );
  assertCondition(
    conflicts.length === 0,
    "server route conflict detected",
  );

  const exactCount = inspections.filter(
    (inspection) =>
      inspection.state === "exact",
  ).length;
  const freeCount = inspections.filter(
    (inspection) =>
      inspection.state === "free",
  ).length;
  assertCondition(
    exactCount === identities.length
      || freeCount === identities.length,
    "partial server route mount state rejected",
  );

  if (exactCount === identities.length) {
    return result(
      "already_mounted",
      true,
      true,
      true,
      true,
      true,
      true,
      false,
      0,
      identities.length,
      false,
    );
  }

  const mountedHandler:
    PublicAgentServiceAcceptancePersistenceHttpRouteServerHandlerV1 =
      (request) =>
        dependencies.handleRoute(
          environment,
          request,
          trustedContextProvider,
          PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_DEFAULT_DEPENDENCIES_V1,
        );

  const registrations =
    identities.map((identity) =>
      Object.freeze({
        ...identity,
        handle:
          mountedHandler,
      }));

  const receipt =
    registrar.registerExactRoutesAtomically(
      registrations,
    );
  validateRegistrationReceipt(
    receipt,
  );

  return result(
    "mounted",
    true,
    true,
    true,
    true,
    true,
    true,
    true,
    identities.length,
    0,
    true,
  );
}

export function executePublicAgentServiceAcceptancePersistenceHttpRouteServerMountBindingFromEnvironmentV1(
  environment: NodeJS.ProcessEnv,
  commandValue: unknown,
  trustedContextProvider: () => unknown,
  registrar:
    PublicAgentServiceAcceptancePersistenceHttpRouteServerRegistrarV1,
  dependencies:
    PublicAgentServiceAcceptancePersistenceHttpRouteServerMountDependenciesV1 =
      PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_DEFAULT_DEPENDENCIES_V1,
): PublicAgentServiceAcceptancePersistenceHttpRouteServerMountResultV1 {
  return executePublicAgentServiceAcceptancePersistenceHttpRouteServerMountBindingV1(
    loadPublicAgentServiceAcceptancePersistenceHttpRouteServerMountConfigFromEnvironmentV1(
      environment,
    ),
    commandValue,
    environment,
    trustedContextProvider,
    registrar,
    dependencies,
  );
}

export function publicAgentServiceAcceptancePersistenceHttpRouteServerMountRouteIdentitiesV1():
  readonly PublicAgentServiceAcceptancePersistenceHttpRouteServerIdentityV1[] {
  return routeIdentities();
}
