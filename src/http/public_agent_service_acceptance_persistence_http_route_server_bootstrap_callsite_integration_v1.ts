export const PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_CALLSITE_INTEGRATION_MARKER =
  "VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_CALLSITE_INTEGRATION_V1" as const;
export const PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_CALLSITE_INTEGRATION_CONFIG_MARKER =
  "VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_CALLSITE_INTEGRATION_CONFIG_V1" as const;
export const PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_CALLSITE_INTEGRATION_COMMAND_MARKER =
  "VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_CALLSITE_INTEGRATION_COMMAND_V1" as const;
export const PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_CALLSITE_INTEGRATION_RESULT_MARKER =
  "VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_CALLSITE_INTEGRATION_RESULT_V1" as const;
export const PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_CALLSITE_INTEGRATION_VERSION =
  1 as const;

export const PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_CALLSITE_INTEGRATION_ENABLED_ENV =
  "VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_CALLSITE_INTEGRATION_ENABLED" as const;
export const PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_CALLSITE_INTEGRATION_APPLY_ENV =
  "VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_CALLSITE_INTEGRATION_APPLY" as const;
export const PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_CALLSITE_INTEGRATION_CONFIRMATION_ENV =
  "VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_CALLSITE_INTEGRATION_CONFIRMATION" as const;
export const PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_CALLSITE_INTEGRATION_COMPOSITION_CONFIRMATION_ENV =
  "VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_CALLSITE_INTEGRATION_COMPOSITION_CONFIRMATION" as const;
export const PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_CALLSITE_INTEGRATION_REGISTRAR_CONFIRMATION_ENV =
  "VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_CALLSITE_INTEGRATION_REGISTRAR_CONFIRMATION" as const;
export const PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_CALLSITE_INTEGRATION_MOUNT_CONFIRMATION_ENV =
  "VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_CALLSITE_INTEGRATION_MOUNT_CONFIRMATION" as const;

export const PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_CALLSITE_INTEGRATION_CONFIRMATION =
  "integrateAcceptancePersistenceHttpRouteServerBootstrapCallsiteV1" as const;
export const PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_CALLSITE_INTEGRATION_ADAPTER_ID =
  "void.public-agent-service-acceptance-persistence-http-route-server-bootstrap-callsite-integration.v1" as const;
export const PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_CALLSITE_INTEGRATION_RESULT_GLOBAL =
  "__void_public_agent_service_acceptance_persistence_http_route_server_bootstrap_callsite_integration_v1_result" as const;
export const PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_PROVIDER_GLOBAL =
  "__void_public_agent_service_acceptance_persistence_trusted_context_provider_v1" as const;

const COMPOSITION_MARKER =
  "VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_COMPOSITION_V1" as const;
const COMPOSITION_COMMAND_MARKER =
  "VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_COMPOSITION_COMMAND_V1" as const;
const COMPOSITION_VERSION = 1 as const;
const COMPOSITION_CONFIRMATION =
  "bootstrapAcceptancePersistenceHttpRouteServerCompositionV1" as const;
const REGISTRAR_CONFIRMATION =
  "integrateAcceptancePersistenceHttpRouteServerRegistrarV1" as const;
const MOUNT_CONFIRMATION =
  "mountAcceptancePersistenceHttpRouteServerV1" as const;
const COMPOSITION_SOURCE_RELATIVE_URL =
  "../../scripts/public_agent_service_acceptance_persistence_http_route_server_bootstrap_composition_v1.ts" as const;
const MAX_CONFIRMATION_LENGTH = 128;

export interface PublicAgentServiceAcceptancePersistenceHttpRouteServerBootstrapCallsiteIntegrationConfigV1 {
  marker:
    typeof PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_CALLSITE_INTEGRATION_CONFIG_MARKER;
  version:
    typeof PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_CALLSITE_INTEGRATION_VERSION;
  enabled: boolean;
}

export interface PublicAgentServiceAcceptancePersistenceHttpRouteServerBootstrapCallsiteIntegrationCommandV1 {
  marker:
    typeof PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_CALLSITE_INTEGRATION_COMMAND_MARKER;
  version:
    typeof PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_CALLSITE_INTEGRATION_VERSION;
  apply: boolean;
  confirmation: string;
  composition_confirmation: string;
  registrar_confirmation: string;
  mount_confirmation: string;
}

export interface PublicAgentServiceAcceptancePersistenceHttpRouteServerBootstrapCallsiteCompositionModuleV1 {
  PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_COMPOSITION_MARKER:
    typeof COMPOSITION_MARKER;
  PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_COMPOSITION_COMMAND_MARKER:
    typeof COMPOSITION_COMMAND_MARKER;
  PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_COMPOSITION_VERSION:
    typeof COMPOSITION_VERSION;
  executePublicAgentServiceAcceptancePersistenceHttpRouteServerBootstrapCompositionFromEnvironmentV1: (
    environment: NodeJS.ProcessEnv,
    commandValue: unknown,
    appProvider: () => unknown,
    trustedContextProvider: () => unknown,
  ) => unknown;
}

export interface PublicAgentServiceAcceptancePersistenceHttpRouteServerBootstrapCallsiteIntegrationDependenciesV1 {
  importCompositionModule: () => Promise<unknown>;
}

export interface PublicAgentServiceAcceptancePersistenceHttpRouteServerBootstrapCallsiteIntegrationAuthorityV1 {
  composition_module_import: boolean;
  composition_execution: boolean;
  express_app_provider_forwarding: boolean;
  trusted_context_provider_forwarding: boolean;
  trusted_context_provider_invocation: false;
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

export interface PublicAgentServiceAcceptancePersistenceHttpRouteServerBootstrapCallsiteIntegrationResultV1 {
  marker:
    typeof PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_CALLSITE_INTEGRATION_RESULT_MARKER;
  version:
    typeof PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_CALLSITE_INTEGRATION_VERSION;
  adapter_id:
    typeof PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_CALLSITE_INTEGRATION_ADAPTER_ID;
  status:
    | "disabled"
    | "composition_disabled"
    | "integration_disabled"
    | "mount_disabled"
    | "route_disabled"
    | "planned"
    | "mounted"
    | "already_mounted";
  enabled: boolean;
  apply: boolean;
  confirmation_verified: boolean;
  composition_module_url: string;
  composition_module_imported: boolean;
  composition_invoked: boolean;
  app_provider_forwarded: boolean;
  trusted_context_provider_forwarded: boolean;
  app_provider_invoked: boolean;
  composition_status: string | null;
  composition_result: unknown | null;
  authority:
    PublicAgentServiceAcceptancePersistenceHttpRouteServerBootstrapCallsiteIntegrationAuthorityV1;
}

function fail(message: string): never {
  throw new Error(
    `VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_CALLSITE_INTEGRATION_V1: ${message}`,
  );
}

function assertCondition(
  condition: unknown,
  message: string,
): asserts condition {
  if (!condition) {
    fail(message);
  }
}

function requireRecord(
  value: unknown,
  label: string,
): Record<string, unknown> {
  assertCondition(
    typeof value === "object"
      && value !== null
      && !Array.isArray(value),
    `${label} must be an object`,
  );
  return value as Record<string, unknown>;
}

function requireExactKeys(
  value: Record<string, unknown>,
  label: string,
  keys: readonly string[],
): void {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  assertCondition(
    actual.length === expected.length
      && actual.every((entry, index) => entry === expected[index]),
    `${label} keys must be exact`,
  );
}

function requireBoolean(
  value: unknown,
  label: string,
): boolean {
  assertCondition(typeof value === "boolean", `${label} must be boolean`);
  return value;
}

function requireString(
  value: unknown,
  label: string,
): string {
  assertCondition(typeof value === "string", `${label} must be string`);
  assertCondition(
    value.length <= MAX_CONFIRMATION_LENGTH,
    `${label} is too long`,
  );
  return value;
}

function parseFlag(
  value: string | undefined,
  label: string,
): boolean {
  const normalized = String(value ?? "").trim();
  if (normalized === "" || normalized === "0") {
    return false;
  }
  if (normalized === "1") {
    return true;
  }
  return fail(`${label} must be empty, 0, or 1`);
}

function readEnvironmentString(
  environment: NodeJS.ProcessEnv,
  name: string,
): string {
  return requireString(
    String(environment[name] ?? "").trim(),
    name,
  );
}

function compositionModuleUrlV1(): string {
  return new URL(
    COMPOSITION_SOURCE_RELATIVE_URL,
    import.meta.url,
  ).href;
}

async function importDefaultCompositionModuleV1(): Promise<unknown> {
  return import(compositionModuleUrlV1());
}

export const PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_CALLSITE_INTEGRATION_DEFAULT_DEPENDENCIES_V1:
  PublicAgentServiceAcceptancePersistenceHttpRouteServerBootstrapCallsiteIntegrationDependenciesV1 =
    Object.freeze({
      importCompositionModule: importDefaultCompositionModuleV1,
    });

export function publicAgentServiceAcceptancePersistenceHttpRouteServerBootstrapCallsiteIntegrationDefaultDependencyIdentityV1(): {
  import_composition_module_exact: boolean;
  composition_module_url: string;
} {
  return Object.freeze({
    import_composition_module_exact:
      PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_CALLSITE_INTEGRATION_DEFAULT_DEPENDENCIES_V1
        .importCompositionModule
      === importDefaultCompositionModuleV1,
    composition_module_url:
      compositionModuleUrlV1(),
  });
}

export function validatePublicAgentServiceAcceptancePersistenceHttpRouteServerBootstrapCallsiteIntegrationConfigV1(
  value: unknown,
): PublicAgentServiceAcceptancePersistenceHttpRouteServerBootstrapCallsiteIntegrationConfigV1 {
  const root = requireRecord(value, "callsite integration config");
  requireExactKeys(
    root,
    "callsite integration config",
    ["marker", "version", "enabled"],
  );
  assertCondition(
    root.marker
      === PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_CALLSITE_INTEGRATION_CONFIG_MARKER,
    "callsite integration config marker mismatch",
  );
  assertCondition(
    root.version
      === PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_CALLSITE_INTEGRATION_VERSION,
    "callsite integration config version mismatch",
  );
  return {
    marker:
      PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_CALLSITE_INTEGRATION_CONFIG_MARKER,
    version:
      PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_CALLSITE_INTEGRATION_VERSION,
    enabled: requireBoolean(
      root.enabled,
      "callsite integration config.enabled",
    ),
  };
}

export function validatePublicAgentServiceAcceptancePersistenceHttpRouteServerBootstrapCallsiteIntegrationCommandV1(
  value: unknown,
): PublicAgentServiceAcceptancePersistenceHttpRouteServerBootstrapCallsiteIntegrationCommandV1 {
  const root = requireRecord(value, "callsite integration command");
  requireExactKeys(
    root,
    "callsite integration command",
    [
      "marker",
      "version",
      "apply",
      "confirmation",
      "composition_confirmation",
      "registrar_confirmation",
      "mount_confirmation",
    ],
  );
  assertCondition(
    root.marker
      === PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_CALLSITE_INTEGRATION_COMMAND_MARKER,
    "callsite integration command marker mismatch",
  );
  assertCondition(
    root.version
      === PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_CALLSITE_INTEGRATION_VERSION,
    "callsite integration command version mismatch",
  );
  return {
    marker:
      PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_CALLSITE_INTEGRATION_COMMAND_MARKER,
    version:
      PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_CALLSITE_INTEGRATION_VERSION,
    apply: requireBoolean(
      root.apply,
      "callsite integration command.apply",
    ),
    confirmation: requireString(
      root.confirmation,
      "callsite integration command.confirmation",
    ),
    composition_confirmation: requireString(
      root.composition_confirmation,
      "callsite integration command.composition_confirmation",
    ),
    registrar_confirmation: requireString(
      root.registrar_confirmation,
      "callsite integration command.registrar_confirmation",
    ),
    mount_confirmation: requireString(
      root.mount_confirmation,
      "callsite integration command.mount_confirmation",
    ),
  };
}

export function loadPublicAgentServiceAcceptancePersistenceHttpRouteServerBootstrapCallsiteIntegrationConfigFromEnvironmentV1(
  environment: NodeJS.ProcessEnv,
): PublicAgentServiceAcceptancePersistenceHttpRouteServerBootstrapCallsiteIntegrationConfigV1 {
  return validatePublicAgentServiceAcceptancePersistenceHttpRouteServerBootstrapCallsiteIntegrationConfigV1({
    marker:
      PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_CALLSITE_INTEGRATION_CONFIG_MARKER,
    version:
      PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_CALLSITE_INTEGRATION_VERSION,
    enabled: parseFlag(
      environment[
        PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_CALLSITE_INTEGRATION_ENABLED_ENV
      ],
      PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_CALLSITE_INTEGRATION_ENABLED_ENV,
    ),
  });
}

export function loadPublicAgentServiceAcceptancePersistenceHttpRouteServerBootstrapCallsiteIntegrationCommandFromEnvironmentV1(
  environment: NodeJS.ProcessEnv,
): PublicAgentServiceAcceptancePersistenceHttpRouteServerBootstrapCallsiteIntegrationCommandV1 {
  return validatePublicAgentServiceAcceptancePersistenceHttpRouteServerBootstrapCallsiteIntegrationCommandV1({
    marker:
      PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_CALLSITE_INTEGRATION_COMMAND_MARKER,
    version:
      PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_CALLSITE_INTEGRATION_VERSION,
    apply: parseFlag(
      environment[
        PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_CALLSITE_INTEGRATION_APPLY_ENV
      ],
      PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_CALLSITE_INTEGRATION_APPLY_ENV,
    ),
    confirmation: readEnvironmentString(
      environment,
      PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_CALLSITE_INTEGRATION_CONFIRMATION_ENV,
    ),
    composition_confirmation: readEnvironmentString(
      environment,
      PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_CALLSITE_INTEGRATION_COMPOSITION_CONFIRMATION_ENV,
    ),
    registrar_confirmation: readEnvironmentString(
      environment,
      PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_CALLSITE_INTEGRATION_REGISTRAR_CONFIRMATION_ENV,
    ),
    mount_confirmation: readEnvironmentString(
      environment,
      PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_CALLSITE_INTEGRATION_MOUNT_CONFIRMATION_ENV,
    ),
  });
}

function validateCompositionModuleV1(
  value: unknown,
): PublicAgentServiceAcceptancePersistenceHttpRouteServerBootstrapCallsiteCompositionModuleV1 {
  const root = requireRecord(
    value,
    "bootstrap composition module",
  );
  assertCondition(
    root.PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_COMPOSITION_MARKER
      === COMPOSITION_MARKER,
    "bootstrap composition module marker mismatch",
  );
  assertCondition(
    root.PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_COMPOSITION_COMMAND_MARKER
      === COMPOSITION_COMMAND_MARKER,
    "bootstrap composition command marker mismatch",
  );
  assertCondition(
    root.PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_COMPOSITION_VERSION
      === COMPOSITION_VERSION,
    "bootstrap composition version mismatch",
  );
  assertCondition(
    typeof root.executePublicAgentServiceAcceptancePersistenceHttpRouteServerBootstrapCompositionFromEnvironmentV1
      === "function",
    "bootstrap composition executor missing",
  );
  return root as unknown as
    PublicAgentServiceAcceptancePersistenceHttpRouteServerBootstrapCallsiteCompositionModuleV1;
}

function mapCompositionStatus(
  value: unknown,
): PublicAgentServiceAcceptancePersistenceHttpRouteServerBootstrapCallsiteIntegrationResultV1["status"] {
  const root = requireRecord(value, "bootstrap composition result");
  const status = requireString(
    root.status,
    "bootstrap composition result.status",
  );
  switch (status) {
    case "disabled":
      return "composition_disabled";
    case "integration_disabled":
    case "mount_disabled":
    case "route_disabled":
    case "planned":
    case "mounted":
    case "already_mounted":
      return status;
    default:
      return fail(`unsupported bootstrap composition status=${status}`);
  }
}

function compositionAppProviderInvoked(
  value: unknown,
): boolean {
  const root = requireRecord(value, "bootstrap composition result");
  return requireBoolean(
    root.app_provider_invoked,
    "bootstrap composition result.app_provider_invoked",
  );
}

function result(
  status:
    PublicAgentServiceAcceptancePersistenceHttpRouteServerBootstrapCallsiteIntegrationResultV1["status"],
  enabled: boolean,
  apply: boolean,
  confirmationVerified: boolean,
  moduleImported: boolean,
  compositionInvoked: boolean,
  appProviderForwarded: boolean,
  trustedContextProviderForwarded: boolean,
  appProviderInvoked: boolean,
  compositionStatus: string | null,
  compositionResult: unknown | null,
): PublicAgentServiceAcceptancePersistenceHttpRouteServerBootstrapCallsiteIntegrationResultV1 {
  return Object.freeze({
    marker:
      PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_CALLSITE_INTEGRATION_RESULT_MARKER,
    version:
      PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_CALLSITE_INTEGRATION_VERSION,
    adapter_id:
      PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_CALLSITE_INTEGRATION_ADAPTER_ID,
    status,
    enabled,
    apply,
    confirmation_verified: confirmationVerified,
    composition_module_url:
      compositionModuleUrlV1(),
    composition_module_imported: moduleImported,
    composition_invoked: compositionInvoked,
    app_provider_forwarded: appProviderForwarded,
    trusted_context_provider_forwarded:
      trustedContextProviderForwarded,
    app_provider_invoked: appProviderInvoked,
    composition_status: compositionStatus,
    composition_result: compositionResult,
    authority: Object.freeze({
      composition_module_import: moduleImported,
      composition_execution: compositionInvoked,
      express_app_provider_forwarding: appProviderForwarded,
      trusted_context_provider_forwarding:
        trustedContextProviderForwarded,
      trusted_context_provider_invocation: false,
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
    }),
  });
}

export async function executePublicAgentServiceAcceptancePersistenceHttpRouteServerBootstrapCallsiteIntegrationV1(
  configValue: unknown,
  commandValue: unknown,
  environment: NodeJS.ProcessEnv,
  appProvider: () => unknown,
  trustedContextProvider: () => unknown,
  dependencies:
    PublicAgentServiceAcceptancePersistenceHttpRouteServerBootstrapCallsiteIntegrationDependenciesV1 =
      PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_CALLSITE_INTEGRATION_DEFAULT_DEPENDENCIES_V1,
): Promise<PublicAgentServiceAcceptancePersistenceHttpRouteServerBootstrapCallsiteIntegrationResultV1> {
  const config =
    validatePublicAgentServiceAcceptancePersistenceHttpRouteServerBootstrapCallsiteIntegrationConfigV1(
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
      false,
      null,
      null,
    );
  }

  const command =
    validatePublicAgentServiceAcceptancePersistenceHttpRouteServerBootstrapCallsiteIntegrationCommandV1(
      commandValue,
    );

  const confirmationVerified = !command.apply
    || command.confirmation
      === PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_CALLSITE_INTEGRATION_CONFIRMATION;

  assertCondition(
    confirmationVerified,
    "applied callsite integration requires exact confirmation",
  );
  assertCondition(
    command.apply || (
      command.confirmation === ""
      && command.composition_confirmation === ""
      && command.registrar_confirmation === ""
      && command.mount_confirmation === ""
    ),
    "dry-run callsite integration confirmations must be empty",
  );

  assertCondition(
    typeof appProvider === "function",
    "Express app provider is required",
  );
  assertCondition(
    typeof trustedContextProvider === "function",
    "trusted context provider is required",
  );
  assertCondition(
    dependencies
      && typeof dependencies.importCompositionModule === "function",
    "composition module importer is required",
  );

  const imported = validateCompositionModuleV1(
    await dependencies.importCompositionModule(),
  );

  const compositionCommand = Object.freeze({
    marker:
      imported.PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_COMPOSITION_COMMAND_MARKER,
    version:
      imported.PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_COMPOSITION_VERSION,
    apply: command.apply,
    confirmation: command.composition_confirmation,
    integration_confirmation: command.registrar_confirmation,
    mount_confirmation: command.mount_confirmation,
  });

  const compositionResult =
    imported.executePublicAgentServiceAcceptancePersistenceHttpRouteServerBootstrapCompositionFromEnvironmentV1(
      environment,
      compositionCommand,
      appProvider,
      trustedContextProvider,
    );

  assertCondition(
    !(compositionResult instanceof Promise),
    "bootstrap composition executor must be synchronous",
  );

  const status = mapCompositionStatus(compositionResult);
  const compositionStatus = requireString(
    requireRecord(
      compositionResult,
      "bootstrap composition result",
    ).status,
    "bootstrap composition result.status",
  );

  return result(
    status,
    true,
    command.apply,
    confirmationVerified,
    true,
    true,
    true,
    true,
    compositionAppProviderInvoked(compositionResult),
    compositionStatus,
    compositionResult,
  );
}

export async function executePublicAgentServiceAcceptancePersistenceHttpRouteServerBootstrapCallsiteIntegrationFromEnvironmentV1(
  environment: NodeJS.ProcessEnv,
  appProvider: () => unknown,
  trustedContextProvider: () => unknown,
  dependencies:
    PublicAgentServiceAcceptancePersistenceHttpRouteServerBootstrapCallsiteIntegrationDependenciesV1 =
      PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_CALLSITE_INTEGRATION_DEFAULT_DEPENDENCIES_V1,
): Promise<PublicAgentServiceAcceptancePersistenceHttpRouteServerBootstrapCallsiteIntegrationResultV1> {
  const config =
    loadPublicAgentServiceAcceptancePersistenceHttpRouteServerBootstrapCallsiteIntegrationConfigFromEnvironmentV1(
      environment,
    );

  if (!config.enabled) {
    return executePublicAgentServiceAcceptancePersistenceHttpRouteServerBootstrapCallsiteIntegrationV1(
      config,
      undefined,
      environment,
      appProvider,
      trustedContextProvider,
      dependencies,
    );
  }

  return executePublicAgentServiceAcceptancePersistenceHttpRouteServerBootstrapCallsiteIntegrationV1(
    config,
    loadPublicAgentServiceAcceptancePersistenceHttpRouteServerBootstrapCallsiteIntegrationCommandFromEnvironmentV1(
      environment,
    ),
    environment,
    appProvider,
    trustedContextProvider,
    dependencies,
  );
}

export function publicAgentServiceAcceptancePersistenceHttpRouteServerBootstrapCallsiteIntegrationSourceTopologyV1(): {
  live_entrypoint: "src/index.ts";
  app_export_anchor:
    "(globalThis as any).__void_http_app = app;";
  first_listener_owner: "src/index.ts";
  composition_source_relative_url:
    typeof COMPOSITION_SOURCE_RELATIVE_URL;
  modifies_index_ts: true;
  modifies_index_js: false;
  disabled_before_composition_import: true;
} {
  return Object.freeze({
    live_entrypoint: "src/index.ts",
    app_export_anchor:
      "(globalThis as any).__void_http_app = app;",
    first_listener_owner: "src/index.ts",
    composition_source_relative_url:
      COMPOSITION_SOURCE_RELATIVE_URL,
    modifies_index_ts: true,
    modifies_index_js: false,
    disabled_before_composition_import: true,
  });
}

export function publicAgentServiceAcceptancePersistenceHttpRouteServerBootstrapCallsiteIntegrationExpectedConfirmationsV1(): {
  callsite_confirmation:
    typeof PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_CALLSITE_INTEGRATION_CONFIRMATION;
  composition_confirmation:
    typeof COMPOSITION_CONFIRMATION;
  registrar_confirmation:
    typeof REGISTRAR_CONFIRMATION;
  mount_confirmation:
    typeof MOUNT_CONFIRMATION;
} {
  return Object.freeze({
    callsite_confirmation:
      PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_CALLSITE_INTEGRATION_CONFIRMATION,
    composition_confirmation:
      COMPOSITION_CONFIRMATION,
    registrar_confirmation:
      REGISTRAR_CONFIRMATION,
    mount_confirmation:
      MOUNT_CONFIRMATION,
  });
}
