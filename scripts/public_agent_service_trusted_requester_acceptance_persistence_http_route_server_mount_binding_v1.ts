import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_COMMAND_PATH,
  PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_STATUS_PATH,
  handlePublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteFromEnvironmentV1,
  loadPublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteConfigFromEnvironmentV1,
  type PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRequestV1,
  type PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpResponseV1,
  type PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteConfigV1,
} from "./public_agent_service_trusted_requester_acceptance_persistence_http_route_binding_v1.js";

export const PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_BINDING_MARKER =
  "VOID_PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_BINDING_V1" as const;
export const PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_CONFIG_MARKER =
  "VOID_PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_CONFIG_V1" as const;
export const PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_COMMAND_MARKER =
  "VOID_PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_COMMAND_V1" as const;
export const PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_RESULT_MARKER =
  "VOID_PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_RESULT_V1" as const;
export const PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_EXAMPLE_MARKER =
  "VOID_PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_EXAMPLE_V1" as const;
export const PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_VERSION =
  1 as const;

export const PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_ENABLED_ENV =
  "VOID_PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_ENABLED" as const;
export const PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_CONFIRMATION =
  "mountTrustedRequesterAcceptancePersistenceHttpRouteServerV1" as const;
export const PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_HANDLER_ID =
  "void.public-agent-service-trusted-requester-acceptance-persistence-http-route-server.v1" as const;
export const PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_METHOD =
  "ALL" as const;

const MAX_EXAMPLE_JSON_BYTES = 32 * 1024 * 1024;

export interface PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerMountConfigV1 {
  marker:
    typeof PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_CONFIG_MARKER;
  version:
    typeof PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_VERSION;
  enabled: boolean;
}

export interface PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerMountCommandV1 {
  marker:
    typeof PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_COMMAND_MARKER;
  version:
    typeof PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_VERSION;
  apply: boolean;
  confirmation: string;
}

export interface PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerIdentityV1 {
  method:
    typeof PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_METHOD;
  path: string;
  handler_id:
    typeof PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_HANDLER_ID;
}

export interface PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerInspectionV1
  extends PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerIdentityV1 {
  occupied: boolean;
  existing_handler_id: string | null;
}

export type PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerHandlerV1 = (
  request:
    PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRequestV1,
) =>
  PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpResponseV1;

export interface PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerRegistrationV1
  extends PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerIdentityV1 {
  handle:
    PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerHandlerV1;
}

export interface PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerRegistrationReceiptV1 {
  registered: boolean;
  route_count: number;
  handler_id:
    typeof PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_HANDLER_ID;
}

export interface PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerRegistrarV1 {
  inspectExactRoutes: (
    identities: readonly
      PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerIdentityV1[],
  ) => readonly
    PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerInspectionV1[];
  registerExactRoutesAtomically: (
    registrations: readonly
      PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerRegistrationV1[],
  ) =>
    PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerRegistrationReceiptV1;
}

export interface PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerMountDependenciesV1 {
  loadRouteConfig: (
    environment: NodeJS.ProcessEnv,
  ) =>
    PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteConfigV1;
  handleRoute: (
    request:
      PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRequestV1,
    environment: NodeJS.ProcessEnv,
    trustedReplayPlanInputProvider: () => unknown,
  ) =>
    PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpResponseV1;
}

export interface PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerMountAuthorityV1 {
  source_level_exact_route_registration: boolean;
  production_http_route_mount: false;
  network_listener_creation: false;
  route_registrar_integration: false;
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

export interface PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerMountResultV1 {
  marker:
    typeof PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_RESULT_MARKER;
  version:
    typeof PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_VERSION;
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
  trusted_input_provider_deferred: boolean;
  registrar_inspected: boolean;
  registrar_registered: boolean;
  inspected_route_count: number;
  mounted_route_count: number;
  already_mounted_route_count: number;
  handler_identity_exact: boolean;
  atomic_registration_verified: boolean;
  authority:
    PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerMountAuthorityV1;
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

function authority(
  sourceRegistration: boolean,
): PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerMountAuthorityV1 {
  return {
    source_level_exact_route_registration:
      sourceRegistration,
    production_http_route_mount:
      false,
    network_listener_creation:
      false,
    route_registrar_integration:
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

function result(
  status:
    PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerMountResultV1[
      "status"
    ],
  enabled: boolean,
  routeEnabled: boolean,
  apply: boolean,
  confirmationVerified: boolean,
  providerDeferred: boolean,
  registrarInspected: boolean,
  registrarRegistered: boolean,
  inspectedRouteCount: number,
  mountedRouteCount: number,
  alreadyMountedRouteCount: number,
  handlerIdentityExact: boolean,
  atomicRegistrationVerified: boolean,
): PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerMountResultV1 {
  return {
    marker:
      PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_RESULT_MARKER,
    version:
      PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_VERSION,
    status,
    enabled,
    route_enabled:
      routeEnabled,
    apply,
    confirmation_verified:
      confirmationVerified,
    trusted_input_provider_deferred:
      providerDeferred,
    registrar_inspected:
      registrarInspected,
    registrar_registered:
      registrarRegistered,
    inspected_route_count:
      inspectedRouteCount,
    mounted_route_count:
      mountedRouteCount,
    already_mounted_route_count:
      alreadyMountedRouteCount,
    handler_identity_exact:
      handlerIdentityExact,
    atomic_registration_verified:
      atomicRegistrationVerified,
    authority:
      authority(
        registrarRegistered,
      ),
  };
}

const ROUTE_IDENTITIES:
  readonly PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerIdentityV1[] =
    Object.freeze(
      [
        {
          method:
            PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_METHOD,
          path:
            PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_STATUS_PATH,
          handler_id:
            PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_HANDLER_ID,
        },
        {
          method:
            PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_METHOD,
          path:
            PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_COMMAND_PATH,
          handler_id:
            PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_HANDLER_ID,
        },
      ].map(
        (identity) =>
          Object.freeze(identity),
      ),
    );

function identityKey(
  identity: {
    method: string;
    path: string;
  },
): string {
  return `${identity.method}\0${identity.path}`;
}

function validateInspections(
  value: readonly
    PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerInspectionV1[],
): {
  occupied_count: number;
  already_mounted: boolean;
} {
  assertCondition(
    Array.isArray(value),
    "route registrar inspection must be an array",
  );
  assertCondition(
    value.length === ROUTE_IDENTITIES.length,
    "route registrar inspection count mismatch",
  );

  const expected = new Map(
    ROUTE_IDENTITIES.map(
      (identity) => [
        identityKey(identity),
        identity,
      ],
    ),
  );
  const seen = new Set<string>();
  let occupied = 0;
  let exactOccupied = 0;

  for (const item of value) {
    const record = requireRecord(
      item,
      "route registrar inspection",
    );
    requireExactKeys(
      record,
      "route registrar inspection",
      [
        "method",
        "path",
        "handler_id",
        "occupied",
        "existing_handler_id",
      ],
    );
    const method =
      requireString(
        record.method,
        "inspection method",
        1,
        16,
      );
    const routePath =
      requireString(
        record.path,
        "inspection path",
        1,
        4096,
      );
    const key =
      identityKey({
        method,
        path:
          routePath,
      });
    assertCondition(
      !seen.has(key),
      "route registrar inspection contains a duplicate identity",
    );
    seen.add(key);
    const expectedIdentity =
      expected.get(key);
    assertCondition(
      expectedIdentity !== undefined,
      "route registrar inspection contains an unexpected identity",
    );
    assertCondition(
      record.handler_id
        === expectedIdentity.handler_id,
      "route registrar inspection handler identity changed",
    );
    const isOccupied =
      requireBoolean(
        record.occupied,
        "inspection occupied",
      );
    if (isOccupied) {
      occupied += 1;
      const existing =
        requireString(
          record.existing_handler_id,
          "existing handler identity",
          1,
          256,
        );
      if (
        existing
          === PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_HANDLER_ID
      ) {
        exactOccupied += 1;
      }
    } else {
      assertCondition(
        record.existing_handler_id === null,
        "free route inspection cannot expose a handler",
      );
    }
  }

  assertCondition(
    seen.size === expected.size,
    "route registrar inspection omitted an identity",
  );
  assertCondition(
    occupied === 0
      || occupied === ROUTE_IDENTITIES.length,
    "partial trusted requester server route mount state rejected",
  );
  if (occupied === ROUTE_IDENTITIES.length) {
    assertCondition(
      exactOccupied === ROUTE_IDENTITIES.length,
      "occupied trusted requester routes use an unexpected handler",
    );
  }

  return {
    occupied_count:
      occupied,
    already_mounted:
      occupied === ROUTE_IDENTITIES.length,
  };
}

function validateRegistrationReceipt(
  value:
    PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerRegistrationReceiptV1,
): void {
  const record = requireRecord(
    value,
    "atomic route registration receipt",
  );
  requireExactKeys(
    record,
    "atomic route registration receipt",
    [
      "registered",
      "route_count",
      "handler_id",
    ],
  );
  assertCondition(
    record.registered === true,
    "atomic route registration did not confirm registration",
  );
  assertCondition(
    record.route_count
      === ROUTE_IDENTITIES.length,
    "atomic route registration count changed",
  );
  assertCondition(
    record.handler_id
      === PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_HANDLER_ID,
    "atomic route registration handler identity changed",
  );
}

export function validatePublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerMountConfigV1(
  value: unknown,
): PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerMountConfigV1 {
  const root = requireRecord(
    value,
    "trusted requester acceptance persistence HTTP route server mount config",
  );
  requireExactKeys(
    root,
    "trusted requester acceptance persistence HTTP route server mount config",
    [
      "marker",
      "version",
      "enabled",
    ],
  );
  assertCondition(
    root.marker
      === PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_CONFIG_MARKER,
    "trusted requester server mount config marker mismatch",
  );
  assertCondition(
    root.version
      === PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_VERSION,
    "trusted requester server mount config version mismatch",
  );
  return {
    marker:
      PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_CONFIG_MARKER,
    version:
      PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_VERSION,
    enabled:
      requireBoolean(
        root.enabled,
        "enabled",
      ),
  };
}

export function validatePublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerMountCommandV1(
  value: unknown,
): PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerMountCommandV1 {
  const root = requireRecord(
    value,
    "trusted requester acceptance persistence HTTP route server mount command",
  );
  requireExactKeys(
    root,
    "trusted requester acceptance persistence HTTP route server mount command",
    [
      "marker",
      "version",
      "apply",
      "confirmation",
    ],
  );
  assertCondition(
    root.marker
      === PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_COMMAND_MARKER,
    "trusted requester server mount command marker mismatch",
  );
  assertCondition(
    root.version
      === PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_VERSION,
    "trusted requester server mount command version mismatch",
  );
  return {
    marker:
      PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_COMMAND_MARKER,
    version:
      PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_VERSION,
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
  };
}

export function loadPublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerMountConfigFromEnvironmentV1(
  environment: NodeJS.ProcessEnv = process.env,
): PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerMountConfigV1 {
  return validatePublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerMountConfigV1(
    {
      marker:
        PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_CONFIG_MARKER,
      version:
        PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_VERSION,
      enabled:
        parseBooleanEnvironment(
          environment[
            PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_ENABLED_ENV
          ],
          PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_ENABLED_ENV,
          false,
        ),
    },
  );
}

export const PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_DEFAULT_DEPENDENCIES_V1:
  PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerMountDependenciesV1 = {
    loadRouteConfig:
      loadPublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteConfigFromEnvironmentV1,
    handleRoute:
      handlePublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteFromEnvironmentV1,
  };

export function publicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerMountDefaultDependencyIdentityV1(): {
  load_route_config_exact: true;
  handle_route_exact: true;
  trusted_provider_deferred_to_handler: true;
} {
  assertCondition(
    PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_DEFAULT_DEPENDENCIES_V1
      .loadRouteConfig
      === loadPublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteConfigFromEnvironmentV1,
    "default trusted route-config loader changed",
  );
  assertCondition(
    PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_DEFAULT_DEPENDENCIES_V1
      .handleRoute
      === handlePublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteFromEnvironmentV1,
    "default trusted route handler changed",
  );
  return {
    load_route_config_exact:
      true,
    handle_route_exact:
      true,
    trusted_provider_deferred_to_handler:
      true,
  };
}

export function mountPublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerV1(
  configValue: unknown,
  commandValue: unknown,
  environment: NodeJS.ProcessEnv,
  trustedReplayPlanInputProvider: () => unknown,
  registrar:
    PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerRegistrarV1,
  dependencies:
    PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerMountDependenciesV1 =
      PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_DEFAULT_DEPENDENCIES_V1,
): PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerMountResultV1 {
  const config =
    validatePublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerMountConfigV1(
      configValue,
    );

  if (!config.enabled) {
    return result(
      "disabled",
      false,
      false,
      false,
      false,
      true,
      false,
      false,
      0,
      0,
      0,
      true,
      false,
    );
  }

  const command =
    validatePublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerMountCommandV1(
      commandValue,
    );

  const confirmationVerified =
    !command.apply
    || command.confirmation
      === PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_CONFIRMATION;
  assertCondition(
    confirmationVerified,
    "applied trusted requester server mount requires exact confirmation",
  );
  assertCondition(
    command.apply
      || command.confirmation === "",
    "dry-run trusted requester server mount confirmation must be empty",
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
      0,
      true,
      false,
    );
  }

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
      0,
      true,
      false,
    );
  }

  assertCondition(
    typeof trustedReplayPlanInputProvider === "function",
    "trusted replay-plan input provider unavailable",
  );
  assertCondition(
    registrar !== null
      && typeof registrar === "object",
    "server registrar unavailable",
  );
  assertCondition(
    typeof registrar.inspectExactRoutes === "function",
    "server registrar inspection method unavailable",
  );
  assertCondition(
    typeof registrar.registerExactRoutesAtomically === "function",
    "server registrar atomic registration method unavailable",
  );

  const inspections =
    registrar.inspectExactRoutes(
      ROUTE_IDENTITIES,
    );
  const inspection =
    validateInspections(
      inspections,
    );

  if (inspection.already_mounted) {
    return result(
      "already_mounted",
      true,
      true,
      true,
      true,
      true,
      true,
      false,
      ROUTE_IDENTITIES.length,
      0,
      ROUTE_IDENTITIES.length,
      true,
      true,
    );
  }

  const mountedHandler:
    PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerHandlerV1 =
      (request) =>
        dependencies.handleRoute(
          request,
          environment,
          trustedReplayPlanInputProvider,
        );

  const registrations:
    readonly PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerRegistrationV1[] =
      ROUTE_IDENTITIES.map(
        (identity) => ({
          ...identity,
          handle:
            mountedHandler,
        }),
      );

  assertCondition(
    registrations.length === 2
      && registrations[0]?.handle === registrations[1]?.handle,
    "trusted requester route registrations must share one exact handler",
  );

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
    ROUTE_IDENTITIES.length,
    ROUTE_IDENTITIES.length,
    0,
    true,
    true,
  );
}

export function mountPublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerFromEnvironmentV1(
  commandValue: unknown,
  environment: NodeJS.ProcessEnv,
  trustedReplayPlanInputProvider: () => unknown,
  registrar:
    PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerRegistrarV1,
  dependencies:
    PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerMountDependenciesV1 =
      PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_DEFAULT_DEPENDENCIES_V1,
): PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerMountResultV1 {
  const config =
    loadPublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerMountConfigFromEnvironmentV1(
      environment,
    );
  return mountPublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerV1(
    config,
    commandValue,
    environment,
    trustedReplayPlanInputProvider,
    registrar,
    dependencies,
  );
}

export function publicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerMountRouteIdentitiesV1():
  readonly PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerIdentityV1[] {
  return ROUTE_IDENTITIES.map(
    (identity) => ({
      ...identity,
    }),
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
    routeExamplePath,
    ...extra
  ] = process.argv.slice(2);
  assertCondition(
    extra.length === 0,
    "unexpected arguments",
  );
  if (
    mode !== "example"
    || routeExamplePath === undefined
  ) {
    fail(
      "usage: tsx scripts/public_agent_service_trusted_requester_acceptance_persistence_http_route_server_mount_binding_v1.ts example <trusted-route-example.json>",
    );
  }

  const routeExample =
    requireRecord(
      readJsonFile(
        routeExamplePath,
      ),
      "trusted requester persistence HTTP route example",
    );
  const routeConfig =
    routeExample.route_config as
      PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteConfigV1;

  const config = {
    marker:
      PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_CONFIG_MARKER,
    version:
      PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_VERSION,
    enabled:
      true,
  };
  const command = {
    marker:
      PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_COMMAND_MARKER,
    version:
      PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_VERSION,
    apply:
      false,
    confirmation:
      "",
  };

  const resultValue =
    mountPublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerV1(
      config,
      command,
      {},
      () => ({
        example_only:
          true,
      }),
      {
        inspectExactRoutes() {
          fail(
            "example-only dry run must not inspect registrar",
          );
        },
        registerExactRoutesAtomically() {
          fail(
            "example-only dry run must not register routes",
          );
        },
      },
      {
        loadRouteConfig:
          () =>
            routeConfig,
        handleRoute:
          () =>
            fail(
              "example-only dry run must not invoke route handler",
            ),
      },
    );

  process.stdout.write(
    `${JSON.stringify(
      {
        marker:
          PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_EXAMPLE_MARKER,
        version:
          PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_VERSION,
        example_only:
          true,
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
