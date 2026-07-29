import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_ADAPTER_MARKER,
} from "./public_agent_service_acceptance_persistence_adapter_v1.js";
import {
  PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_COMPOSITION_COMMAND_MARKER,
  PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_COMPOSITION_CONFIG_MARKER,
  PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_COMPOSITION_CONFIRMATION,
  PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_COMPOSITION_DEFAULT_DEPENDENCIES_V1,
  PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_COMPOSITION_RESULT_MARKER,
  PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_COMPOSITION_VERSION,
  executePublicAgentServiceTrustedRequesterAcceptancePersistenceCompositionV1,
  publicAgentServiceTrustedRequesterAcceptancePersistenceCompositionDefaultDependencyIdentityV1,
  validatePublicAgentServiceTrustedRequesterAcceptancePersistenceCompositionConfigV1,
  type PublicAgentServiceTrustedRequesterAcceptancePersistenceCompositionConfigV1,
  type PublicAgentServiceTrustedRequesterAcceptancePersistenceCompositionDependenciesV1,
  type PublicAgentServiceTrustedRequesterAcceptancePersistenceCompositionResultV1,
} from "./public_agent_service_trusted_requester_acceptance_persistence_composition_v1.js";

export const PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_RUNTIME_BINDING_MARKER =
  "VOID_PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_RUNTIME_BINDING_V1" as const;
export const PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_RUNTIME_CONFIG_MARKER =
  "VOID_PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_RUNTIME_CONFIG_V1" as const;
export const PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_RUNTIME_COMMAND_MARKER =
  "VOID_PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_RUNTIME_COMMAND_V1" as const;
export const PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_RUNTIME_RESULT_MARKER =
  "VOID_PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_RUNTIME_RESULT_V1" as const;
export const PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_RUNTIME_EXAMPLE_MARKER =
  "VOID_PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_RUNTIME_EXAMPLE_V1" as const;
export const PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_RUNTIME_VERSION =
  1 as const;
export const PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_RUNTIME_CONFIRMATION =
  "persistTrustedRequesterAcceptanceRuntimeV1" as const;
export const PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_RUNTIME_ENABLED_ENV =
  "VOID_PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_RUNTIME_ENABLED" as const;
export const PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_RUNTIME_ROOT_ENV =
  "VOID_PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_RUNTIME_ROOT" as const;

const MAX_EXAMPLE_JSON_BYTES = 32 * 1024 * 1024;

export interface PublicAgentServiceTrustedRequesterAcceptancePersistenceRuntimeConfigV1 {
  marker:
    typeof PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_RUNTIME_CONFIG_MARKER;
  version:
    typeof PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_RUNTIME_VERSION;
  enabled: boolean;
  persistence_config:
    PublicAgentServiceTrustedRequesterAcceptancePersistenceCompositionConfigV1[
      "persistence_config"
    ];
}

export interface PublicAgentServiceTrustedRequesterAcceptancePersistenceRuntimeCommandV1 {
  marker:
    typeof PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_RUNTIME_COMMAND_MARKER;
  version:
    typeof PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_RUNTIME_VERSION;
  apply: boolean;
  confirmation: string;
  recorded_at_utc: string;
}

export type PublicAgentServiceTrustedRequesterAcceptancePersistenceRuntimeResultV1 =
  Omit<
    PublicAgentServiceTrustedRequesterAcceptancePersistenceCompositionResultV1,
    "marker" | "version"
  > & {
    marker:
      typeof PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_RUNTIME_RESULT_MARKER;
    version:
      typeof PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_RUNTIME_VERSION;
    runtime_binding_enabled: boolean;
    runtime_confirmation_verified: boolean;
    composition_invoked: boolean;
    composition_confirmation_injected: boolean;
    trusted_input_provider_forwarded: boolean;
  };

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

function requireUtcTimestamp(
  value: unknown,
  label: string,
): string {
  const text = requireString(
    value,
    label,
    20,
    40,
  );
  assertCondition(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?Z$/.test(text),
    `${label} must be a UTC timestamp`,
  );
  assertCondition(
    !Number.isNaN(Date.parse(text)),
    `${label} is invalid`,
  );
  return text;
}

function parseFlagEnv(
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

function disabledPersistenceConfigV1(
  root: string,
): PublicAgentServiceTrustedRequesterAcceptancePersistenceRuntimeConfigV1[
  "persistence_config"
] {
  return {
    marker:
      PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_ADAPTER_MARKER,
    version: 1,
    allowed_root:
      root,
    max_pointer_bytes:
      65_536,
    max_generation_file_bytes:
      4_194_304,
    max_generation_count:
      10_000,
    recover_exact_orphaned_generation:
      true,
  };
}

export function validatePublicAgentServiceTrustedRequesterAcceptancePersistenceRuntimeConfigV1(
  value: unknown,
): PublicAgentServiceTrustedRequesterAcceptancePersistenceRuntimeConfigV1 {
  const root = requireRecord(
    value,
    "trusted requester acceptance persistence runtime config",
  );
  requireExactKeys(
    root,
    "trusted requester acceptance persistence runtime config",
    [
      "marker",
      "version",
      "enabled",
      "persistence_config",
    ],
  );
  assertCondition(
    root.marker
      === PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_RUNTIME_CONFIG_MARKER,
    "trusted requester acceptance persistence runtime config marker mismatch",
  );
  assertCondition(
    root.version
      === PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_RUNTIME_VERSION,
    "trusted requester acceptance persistence runtime config version mismatch",
  );
  const enabled = requireBoolean(
    root.enabled,
    "enabled",
  );
  const compositionConfig =
    validatePublicAgentServiceTrustedRequesterAcceptancePersistenceCompositionConfigV1(
      {
        marker:
          PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_COMPOSITION_CONFIG_MARKER,
        version:
          PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_COMPOSITION_VERSION,
        enabled,
        persistence_config:
          root.persistence_config,
      },
    );
  return {
    marker:
      PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_RUNTIME_CONFIG_MARKER,
    version:
      PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_RUNTIME_VERSION,
    enabled,
    persistence_config:
      compositionConfig.persistence_config,
  };
}

export function loadPublicAgentServiceTrustedRequesterAcceptancePersistenceRuntimeConfigFromEnvironmentV1(
  environment: NodeJS.ProcessEnv = process.env,
): PublicAgentServiceTrustedRequesterAcceptancePersistenceRuntimeConfigV1 {
  const enabled = parseFlagEnv(
    environment[
      PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_RUNTIME_ENABLED_ENV
    ],
    PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_RUNTIME_ENABLED_ENV,
    false,
  );
  const configuredRoot =
    environment[
      PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_RUNTIME_ROOT_ENV
    ];
  if (enabled) {
    assertCondition(
      typeof configuredRoot === "string"
        && configuredRoot.length > 0,
      `${PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_RUNTIME_ROOT_ENV} is required when enabled`,
    );
    assertCondition(
      path.isAbsolute(configuredRoot),
      `${PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_RUNTIME_ROOT_ENV} must be absolute`,
    );
  }
  const root =
    configuredRoot
      ?? "/disabled/trusted-requester-acceptance-persistence-runtime-root-not-accessed";
  return validatePublicAgentServiceTrustedRequesterAcceptancePersistenceRuntimeConfigV1(
    {
      marker:
        PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_RUNTIME_CONFIG_MARKER,
      version:
        PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_RUNTIME_VERSION,
      enabled,
      persistence_config:
        disabledPersistenceConfigV1(root),
    },
  );
}

export function validatePublicAgentServiceTrustedRequesterAcceptancePersistenceRuntimeCommandV1(
  value: unknown,
): PublicAgentServiceTrustedRequesterAcceptancePersistenceRuntimeCommandV1 {
  const root = requireRecord(
    value,
    "trusted requester acceptance persistence runtime command",
  );
  requireExactKeys(
    root,
    "trusted requester acceptance persistence runtime command",
    [
      "marker",
      "version",
      "apply",
      "confirmation",
      "recorded_at_utc",
    ],
  );
  assertCondition(
    root.marker
      === PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_RUNTIME_COMMAND_MARKER,
    "trusted requester acceptance persistence runtime command marker mismatch",
  );
  assertCondition(
    root.version
      === PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_RUNTIME_VERSION,
    "trusted requester acceptance persistence runtime command version mismatch",
  );
  return {
    marker:
      PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_RUNTIME_COMMAND_MARKER,
    version:
      PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_RUNTIME_VERSION,
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
        160,
      ),
    recorded_at_utc:
      requireUtcTimestamp(
        root.recorded_at_utc,
        "recorded_at_utc",
      ),
  };
}

function disabledAuthorityV1():
  PublicAgentServiceTrustedRequesterAcceptancePersistenceCompositionResultV1[
    "authority"
  ] {
  return {
    acceptance_persistence: false,
    quote_acceptance_recorded: false,
    requester_authentication_replay_write: false,
    provider_authentication_replay_write: false,
    acceptance_replay_write: false,
    payment_authorization: false,
    payment_execution: false,
    execution_authorization: false,
    work_dispatch: false,
    credential_issue: false,
    credential_change: false,
    provider_selection: false,
    requester_key_registry_write: false,
    provider_key_registry_write: false,
    wallet_access: false,
    production_signing: false,
    transaction_broadcast: false,
    work_credit_write: false,
    work_credit_settlement: false,
    http_submission: false,
    runtime_mutation: false,
    service_restart: false,
    deployment: false,
    money_movement: false,
  };
}

function disabledResultV1():
  PublicAgentServiceTrustedRequesterAcceptancePersistenceRuntimeResultV1 {
  return {
    marker:
      PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_RUNTIME_RESULT_MARKER,
    version:
      PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_RUNTIME_VERSION,
    status: "disabled",
    enabled: false,
    apply: false,
    confirmation_verified: false,
    trusted_input_provider_invoked: false,
    trusted_replay_plan_verified: false,
    requester_binding_provenance_verified: false,
    persistence_handoff_packet_validated: false,
    store_inspected: false,
    persistence_attempted: false,
    persistence_status: null,
    root_realpath: null,
    generation_count_before: null,
    requester_authentication_id: null,
    provider_authentication_id: null,
    quote_id: null,
    work_order_id: null,
    requester_agent_id: null,
    provider_id: null,
    acceptance_nonce: null,
    plan_id: null,
    acceptance_id: null,
    transaction_id: null,
    before_state_id: null,
    after_state_id: null,
    before_revision: null,
    after_revision: null,
    generation_id: null,
    operation_id: null,
    acceptance_materialized_in_memory: false,
    acceptance_persisted: false,
    requester_authentication_replay_write: false,
    provider_authentication_replay_write: false,
    acceptance_replay_write: false,
    single_active_acceptance_per_quote_enforced: false,
    quote_acceptance_recorded: false,
    operator_owned_persistence_config: true,
    server_replay_state_injected: false,
    direct_verified_packet_provider: false,
    authority:
      disabledAuthorityV1(),
    runtime_binding_enabled: false,
    runtime_confirmation_verified: false,
    composition_invoked: false,
    composition_confirmation_injected: false,
    trusted_input_provider_forwarded: false,
  };
}

function mapCompositionResultV1(
  result:
    PublicAgentServiceTrustedRequesterAcceptancePersistenceCompositionResultV1,
  command:
    PublicAgentServiceTrustedRequesterAcceptancePersistenceRuntimeCommandV1,
): PublicAgentServiceTrustedRequesterAcceptancePersistenceRuntimeResultV1 {
  assertCondition(
    result.marker
      === PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_COMPOSITION_RESULT_MARKER,
    "trusted requester persistence composition result marker mismatch",
  );
  return {
    ...result,
    marker:
      PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_RUNTIME_RESULT_MARKER,
    version:
      PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_RUNTIME_VERSION,
    runtime_binding_enabled:
      true,
    runtime_confirmation_verified:
      command.apply,
    composition_invoked:
      true,
    composition_confirmation_injected:
      command.apply,
    trusted_input_provider_forwarded:
      true,
  };
}

export function publicAgentServiceTrustedRequesterAcceptancePersistenceRuntimeDefaultDependencyIdentityV1(): {
  composition_default_dependencies_exact: true;
  composition_execute_same_process: true;
  runtime_disabled_by_default: true;
} {
  const compositionIdentity =
    publicAgentServiceTrustedRequesterAcceptancePersistenceCompositionDefaultDependencyIdentityV1();
  assertCondition(
    Object.values(compositionIdentity)
      .every((value) => value === true),
    "composition default dependencies changed",
  );
  assertCondition(
    PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_COMPOSITION_DEFAULT_DEPENDENCIES_V1
      !== null,
    "composition default dependency object is missing",
  );
  return {
    composition_default_dependencies_exact:
      true,
    composition_execute_same_process:
      true,
    runtime_disabled_by_default:
      true,
  };
}

export function executePublicAgentServiceTrustedRequesterAcceptancePersistenceRuntimeBindingV1(
  configValue: unknown,
  commandValue: unknown,
  trustedReplayPlanInputProvider: () => unknown,
  dependencies:
    PublicAgentServiceTrustedRequesterAcceptancePersistenceCompositionDependenciesV1 =
      PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_COMPOSITION_DEFAULT_DEPENDENCIES_V1,
): PublicAgentServiceTrustedRequesterAcceptancePersistenceRuntimeResultV1 {
  const config =
    validatePublicAgentServiceTrustedRequesterAcceptancePersistenceRuntimeConfigV1(
      configValue,
    );
  if (!config.enabled) {
    return disabledResultV1();
  }

  const command =
    validatePublicAgentServiceTrustedRequesterAcceptancePersistenceRuntimeCommandV1(
      commandValue,
    );
  if (command.apply) {
    assertCondition(
      command.confirmation
        === PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_RUNTIME_CONFIRMATION,
      `confirmation must be ${PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_RUNTIME_CONFIRMATION}`,
    );
  } else {
    assertCondition(
      command.confirmation === "",
      "runtime dry-run confirmation must be empty",
    );
  }
  assertCondition(
    typeof trustedReplayPlanInputProvider
      === "function",
    "server-owned trusted replay-plan input provider is required",
  );

  const compositionConfig:
    PublicAgentServiceTrustedRequesterAcceptancePersistenceCompositionConfigV1 = {
      marker:
        PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_COMPOSITION_CONFIG_MARKER,
      version:
        PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_COMPOSITION_VERSION,
      enabled:
        true,
      persistence_config:
        config.persistence_config,
    };
  const compositionCommand = {
    marker:
      PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_COMPOSITION_COMMAND_MARKER,
    version:
      PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_COMPOSITION_VERSION,
    apply:
      command.apply,
    confirmation:
      command.apply
        ? PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_COMPOSITION_CONFIRMATION
        : "",
    recorded_at_utc:
      command.recorded_at_utc,
  };

  const compositionResult =
    executePublicAgentServiceTrustedRequesterAcceptancePersistenceCompositionV1(
      compositionConfig,
      compositionCommand,
      trustedReplayPlanInputProvider,
      dependencies,
    );
  return mapCompositionResultV1(
    compositionResult,
    command,
  );
}

function readJsonFile(
  file: string,
): unknown {
  const resolved =
    path.resolve(file);
  const stat =
    fs.lstatSync(resolved);
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
    fs.readFileSync(resolved, "utf8"),
  ) as unknown;
}

function main(): void {
  const [
    mode,
    compositionExamplePath,
    ...extra
  ] = process.argv.slice(2);
  assertCondition(
    extra.length === 0,
    "unexpected arguments",
  );
  if (
    mode !== "example"
    || compositionExamplePath === undefined
  ) {
    fail(
      "usage: tsx scripts/public_agent_service_trusted_requester_acceptance_persistence_runtime_binding_v1.ts example <trusted-requester-persistence-composition-example.json>",
    );
  }
  const compositionBundle =
    requireRecord(
      readJsonFile(
        compositionExamplePath,
      ),
      "trusted requester persistence composition example",
    );
  const compositionConfig =
    requireRecord(
      compositionBundle.config,
      "composition example config",
    );
  const compositionCommand =
    requireRecord(
      compositionBundle.command,
      "composition example command",
    );
  const runtimeConfig = {
    marker:
      PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_RUNTIME_CONFIG_MARKER,
    version:
      PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_RUNTIME_VERSION,
    enabled:
      compositionConfig.enabled,
    persistence_config:
      compositionConfig.persistence_config,
  };
  const runtimeCommand = {
    marker:
      PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_RUNTIME_COMMAND_MARKER,
    version:
      PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_RUNTIME_VERSION,
    apply:
      compositionCommand.apply,
    confirmation:
      compositionCommand.apply
        ? PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_RUNTIME_CONFIRMATION
        : "",
    recorded_at_utc:
      compositionCommand.recorded_at_utc,
  };
  const trustedInput =
    compositionBundle.trusted_replay_plan_input;
  const result =
    executePublicAgentServiceTrustedRequesterAcceptancePersistenceRuntimeBindingV1(
      runtimeConfig,
      runtimeCommand,
      () => trustedInput,
    );
  process.stdout.write(
    `${JSON.stringify(
      {
        marker:
          PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_RUNTIME_EXAMPLE_MARKER,
        version:
          PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_RUNTIME_VERSION,
        example_only:
          true,
        config:
          runtimeConfig,
        command:
          runtimeCommand,
        trusted_replay_plan_input:
          trustedInput,
        result,
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
