import {
  acceptanceReplayStateIdV1,
  planPublicAgentServiceAcceptanceMaterializationReplayConsumerV1,
  verifyPublicAgentServiceAcceptanceMaterializationReplayConsumerV1,
  type AcceptanceReplayStateDraftV1,
  type AcceptanceReplayStateV1,
  type PublicAgentServiceAcceptanceMaterializationReplayConsumerPacketV1,
} from "./public_agent_service_acceptance_materialization_replay_consumer_v1.js";
import {
  PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_ADAPTER_MARKER,
  PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_CONFIRMATION,
  PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_REQUEST_MARKER,
  inspectPublicAgentServiceAcceptancePersistenceStoreV1,
  persistVerifiedPublicAgentServiceAcceptanceV1,
  validatePublicAgentServiceAcceptancePersistenceConfigV1,
  type PublicAgentServiceAcceptancePersistenceConfigV1,
  type PublicAgentServiceAcceptancePersistenceReceiptV1,
} from "./public_agent_service_acceptance_persistence_adapter_v1.js";

export const PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_RUNTIME_BINDING_MARKER =
  "VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_RUNTIME_BINDING_V1" as const;
export const PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_RUNTIME_CONFIG_MARKER =
  "VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_RUNTIME_CONFIG_V1" as const;
export const PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_RUNTIME_COMMAND_MARKER =
  "VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_RUNTIME_COMMAND_V1" as const;
export const PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_RUNTIME_RESULT_MARKER =
  "VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_RUNTIME_RESULT_V1" as const;
export const PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_RUNTIME_VERSION =
  1 as const;
export const PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_RUNTIME_CONFIRMATION =
  "persistAuthenticatedAcceptanceRuntimeV1" as const;
export const PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_RUNTIME_ENABLED_ENV =
  "VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_RUNTIME_ENABLED" as const;
export const PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_ROOT_ENV =
  "VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_ROOT" as const;

const MAX_COMMAND_JSON_BYTES = 16 * 1024 * 1024;
const MAX_SAFE_INTEGER_TEXT = /^[1-9][0-9]*$/;

export interface PublicAgentServiceAcceptancePersistenceRuntimeConfigV1 {
  marker:
    typeof PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_RUNTIME_CONFIG_MARKER;
  version:
    typeof PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_RUNTIME_VERSION;
  enabled: boolean;
  persistence_config:
    PublicAgentServiceAcceptancePersistenceConfigV1;
}

export interface PublicAgentServiceAcceptancePersistenceRuntimeCommandV1 {
  marker:
    typeof PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_RUNTIME_COMMAND_MARKER;
  version:
    typeof PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_RUNTIME_VERSION;
  apply: boolean;
  confirmation: string;
  recorded_at_utc: string;
  requester_authentication_input: unknown;
  acceptance_draft: unknown;
}

export interface PublicAgentServiceAcceptancePersistenceRuntimeTrustedContextV1 {
  catalog: unknown;
  work_order: unknown;
  quote: unknown;
}

export interface PublicAgentServiceAcceptancePersistenceRuntimeDependenciesV1 {
  acceptanceReplayStateId: (
    draft: AcceptanceReplayStateDraftV1,
  ) => string;
  inspectStore: (
    config: unknown,
  ) => {
    root_realpath: string;
    current: {
      replayState: AcceptanceReplayStateV1;
    } | null;
    generation_count: number;
  };
  plan: (
    input: unknown,
    catalog: unknown,
    workOrder: unknown,
    quote: unknown,
  ) => PublicAgentServiceAcceptanceMaterializationReplayConsumerPacketV1;
  verify: (
    input: unknown,
    catalog: unknown,
    workOrder: unknown,
    quote: unknown,
    packet: unknown,
  ) => PublicAgentServiceAcceptanceMaterializationReplayConsumerPacketV1;
  persist: (
    config: unknown,
    request: unknown,
    packetProvider: () => unknown,
  ) => PublicAgentServiceAcceptancePersistenceReceiptV1;
}

export interface PublicAgentServiceAcceptancePersistenceRuntimeResultV1 {
  marker:
    typeof PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_RUNTIME_RESULT_MARKER;
  version:
    typeof PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_RUNTIME_VERSION;
  status:
    | "disabled"
    | "planned"
    | "persisted"
    | "duplicate"
    | "recovered";
  enabled: boolean;
  apply: boolean;
  confirmation_verified: boolean;
  trusted_context_loaded: boolean;
  store_inspected: boolean;
  persistence_attempted: boolean;
  persistence_status:
    | null
    | "persisted"
    | "duplicate"
    | "recovered";
  root_realpath: string | null;
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
  authority: {
    acceptance_persistence: boolean;
    quote_acceptance_recorded: boolean;
    requester_authentication_replay_write: boolean;
    provider_authentication_replay_write: boolean;
    acceptance_replay_write: boolean;
    payment_authorization: false;
    payment_execution: false;
    execution_authorization: false;
    work_dispatch: false;
    credential_issue: false;
    credential_change: false;
    provider_selection: false;
    requester_key_registry_write: false;
    provider_key_registry_write: false;
    wallet_access: false;
    production_signing: false;
    transaction_broadcast: false;
    work_credit_write: false;
    http_submission: false;
    runtime_mutation: false;
    money_movement: false;
  };
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

function parseUtcSeconds(
  value: unknown,
  label: string,
): string {
  const text = requireString(
    value,
    label,
    20,
    20,
  );
  assertCondition(
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z$/.test(text),
    `${label} must use UTC whole-second format`,
  );
  assertCondition(
    Number.isFinite(Date.parse(text)),
    `${label} must be a valid UTC timestamp`,
  );
  return text;
}

function parsePositiveIntegerEnv(
  value: string | undefined,
  label: string,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  if (value === undefined || value === "") return fallback;
  assertCondition(
    MAX_SAFE_INTEGER_TEXT.test(value),
    `${label} must be a positive base-10 integer`,
  );
  const parsed = Number(value);
  assertCondition(
    Number.isSafeInteger(parsed)
      && parsed >= minimum
      && parsed <= maximum,
    `${label} is outside the allowed range`,
  );
  return parsed;
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

export function validatePublicAgentServiceAcceptancePersistenceRuntimeConfigV1(
  value: unknown,
): PublicAgentServiceAcceptancePersistenceRuntimeConfigV1 {
  const root = requireRecord(
    value,
    "acceptance persistence runtime config",
  );
  requireExactKeys(
    root,
    "acceptance persistence runtime config",
    [
      "marker",
      "version",
      "enabled",
      "persistence_config",
    ],
  );
  assertCondition(
    root.marker
      === PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_RUNTIME_CONFIG_MARKER,
    "acceptance persistence runtime config marker mismatch",
  );
  assertCondition(
    root.version
      === PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_RUNTIME_VERSION,
    "acceptance persistence runtime config version mismatch",
  );
  const enabled = requireBoolean(
    root.enabled,
    "enabled",
  );
  const persistenceConfig =
    validatePublicAgentServiceAcceptancePersistenceConfigV1(
      root.persistence_config,
    );
  assertCondition(
    persistenceConfig.marker
      === PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_ADAPTER_MARKER,
    "persistence config marker mismatch",
  );
  return {
    marker:
      PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_RUNTIME_CONFIG_MARKER,
    version:
      PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_RUNTIME_VERSION,
    enabled,
    persistence_config:
      persistenceConfig,
  };
}

export function loadPublicAgentServiceAcceptancePersistenceRuntimeConfigFromEnvironmentV1(
  environment: NodeJS.ProcessEnv,
): PublicAgentServiceAcceptancePersistenceRuntimeConfigV1 {
  const enabled = parseFlagEnv(
    environment[
      PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_RUNTIME_ENABLED_ENV
    ],
    PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_RUNTIME_ENABLED_ENV,
    false,
  );
  const allowedRoot = requireString(
    environment[
      PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_ROOT_ENV
    ],
    PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_ROOT_ENV,
    1,
    4096,
  );
  assertCondition(
    allowedRoot.startsWith("/"),
    `${PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_ROOT_ENV} must be absolute`,
  );
  const config = {
    marker:
      PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_RUNTIME_CONFIG_MARKER,
    version:
      PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_RUNTIME_VERSION,
    enabled,
    persistence_config: {
      marker:
        PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_ADAPTER_MARKER,
      version: 1 as const,
      allowed_root:
        allowedRoot,
      max_pointer_bytes:
        parsePositiveIntegerEnv(
          environment.VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_MAX_POINTER_BYTES,
          "VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_MAX_POINTER_BYTES",
          65_536,
          1_024,
          1_048_576,
        ),
      max_generation_file_bytes:
        parsePositiveIntegerEnv(
          environment.VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_MAX_GENERATION_FILE_BYTES,
          "VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_MAX_GENERATION_FILE_BYTES",
          4_194_304,
          4_096,
          33_554_432,
        ),
      max_generation_count:
        parsePositiveIntegerEnv(
          environment.VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_MAX_GENERATION_COUNT,
          "VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_MAX_GENERATION_COUNT",
          10_000,
          1,
          1_000_000,
        ),
      recover_exact_orphaned_generation:
        parseFlagEnv(
          environment.VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_RECOVER_EXACT_ORPHANED_GENERATION,
          "VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_RECOVER_EXACT_ORPHANED_GENERATION",
          true,
        ),
    },
  };
  return validatePublicAgentServiceAcceptancePersistenceRuntimeConfigV1(
    config,
  );
}

function validateCommandV1(
  value: unknown,
): PublicAgentServiceAcceptancePersistenceRuntimeCommandV1 {
  const root = requireRecord(
    value,
    "acceptance persistence runtime command",
  );
  requireExactKeys(
    root,
    "acceptance persistence runtime command",
    [
      "marker",
      "version",
      "apply",
      "confirmation",
      "recorded_at_utc",
      "requester_authentication_input",
      "acceptance_draft",
    ],
  );
  assertCondition(
    root.marker
      === PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_RUNTIME_COMMAND_MARKER,
    "acceptance persistence runtime command marker mismatch",
  );
  assertCondition(
    root.version
      === PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_RUNTIME_VERSION,
    "acceptance persistence runtime command version mismatch",
  );
  const command = {
    marker:
      PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_RUNTIME_COMMAND_MARKER,
    version:
      PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_RUNTIME_VERSION,
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
        128,
      ),
    recorded_at_utc:
      parseUtcSeconds(
        root.recorded_at_utc,
        "recorded_at_utc",
      ),
    requester_authentication_input:
      root.requester_authentication_input,
    acceptance_draft:
      root.acceptance_draft,
  };
  const serializedBytes = Buffer.byteLength(
    JSON.stringify(command),
    "utf8",
  );
  assertCondition(
    serializedBytes <= MAX_COMMAND_JSON_BYTES,
    "acceptance persistence runtime command is too large",
  );
  return command;
}

function validateTrustedContextV1(
  value: unknown,
): PublicAgentServiceAcceptancePersistenceRuntimeTrustedContextV1 {
  const root = requireRecord(
    value,
    "trusted acceptance context",
  );
  requireExactKeys(
    root,
    "trusted acceptance context",
    [
      "catalog",
      "work_order",
      "quote",
    ],
  );
  return {
    catalog:
      root.catalog,
    work_order:
      root.work_order,
    quote:
      root.quote,
  };
}

function emptyReplayStateV1(
  dependencies: PublicAgentServiceAcceptancePersistenceRuntimeDependenciesV1,
): AcceptanceReplayStateV1 {
  const draft: AcceptanceReplayStateDraftV1 = {
    marker:
      "VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_REPLAY_STATE_V1",
    version: 1,
    revision: 0,
    consumed_requester_authentication_ids: [],
    consumed_provider_authentication_ids: [],
    consumed_acceptance_ids: [],
    active_acceptance_by_quote: {},
  };
  return {
    ...draft,
    state_id:
      dependencies.acceptanceReplayStateId(
        draft,
      ),
  };
}

function disabledResultV1(): PublicAgentServiceAcceptancePersistenceRuntimeResultV1 {
  return {
    marker:
      PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_RUNTIME_RESULT_MARKER,
    version:
      PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_RUNTIME_VERSION,
    status:
      "disabled",
    enabled:
      false,
    apply:
      false,
    confirmation_verified:
      false,
    trusted_context_loaded:
      false,
    store_inspected:
      false,
    persistence_attempted:
      false,
    persistence_status:
      null,
    root_realpath:
      null,
    generation_count_before:
      null,
    plan_id:
      null,
    acceptance_id:
      null,
    transaction_id:
      null,
    before_state_id:
      null,
    after_state_id:
      null,
    before_revision:
      null,
    after_revision:
      null,
    generation_id:
      null,
    operation_id:
      null,
    acceptance_materialized_in_memory:
      false,
    acceptance_persisted:
      false,
    requester_authentication_replay_write:
      false,
    provider_authentication_replay_write:
      false,
    acceptance_replay_write:
      false,
    single_active_acceptance_per_quote_enforced:
      false,
    authority:
      authorityV1(false),
  };
}

function authorityV1(
  applied: boolean,
): PublicAgentServiceAcceptancePersistenceRuntimeResultV1["authority"] {
  return {
    acceptance_persistence:
      applied,
    quote_acceptance_recorded:
      applied,
    requester_authentication_replay_write:
      applied,
    provider_authentication_replay_write:
      applied,
    acceptance_replay_write:
      applied,
    payment_authorization:
      false,
    payment_execution:
      false,
    execution_authorization:
      false,
    work_dispatch:
      false,
    credential_issue:
      false,
    credential_change:
      false,
    provider_selection:
      false,
    requester_key_registry_write:
      false,
    provider_key_registry_write:
      false,
    wallet_access:
      false,
    production_signing:
      false,
    transaction_broadcast:
      false,
    work_credit_write:
      false,
    http_submission:
      false,
    runtime_mutation:
      false,
    money_movement:
      false,
  };
}

function mapReceiptStatusV1(
  receipt: PublicAgentServiceAcceptancePersistenceReceiptV1,
): "persisted" | "duplicate" | "recovered" {
  assertCondition(
    receipt.status === "committed"
      || receipt.status === "duplicate"
      || receipt.status === "recovered",
    "persistence receipt status is unsupported",
  );
  return receipt.status === "committed"
    ? "persisted"
    : receipt.status;
}

function plannedResultV1(
  rootRealpath: string,
  generationCountBefore: number,
  packet: PublicAgentServiceAcceptanceMaterializationReplayConsumerPacketV1,
): PublicAgentServiceAcceptancePersistenceRuntimeResultV1 {
  const transaction = packet.replay.transaction;
  const nextState = packet.replay.next_state;
  assertCondition(
    packet.acceptance.acceptance_materialized_in_memory
      === true
      && packet.acceptance.acceptance_id !== null
      && packet.acceptance.acceptance_envelope !== null,
    "runtime binding requires a materialized external acceptance",
  );
  assertCondition(
    transaction !== null
      && nextState !== null,
    "runtime binding requires a complete replay transition",
  );
  return {
    marker:
      PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_RUNTIME_RESULT_MARKER,
    version:
      PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_RUNTIME_VERSION,
    status:
      "planned",
    enabled:
      true,
    apply:
      false,
    confirmation_verified:
      false,
    trusted_context_loaded:
      true,
    store_inspected:
      true,
    persistence_attempted:
      false,
    persistence_status:
      null,
    root_realpath:
      rootRealpath,
    generation_count_before:
      generationCountBefore,
    plan_id:
      packet.plan_id,
    acceptance_id:
      packet.acceptance.acceptance_id,
    transaction_id:
      transaction.transaction_id,
    before_state_id:
      transaction.before_state_id,
    after_state_id:
      transaction.after_state_id,
    before_revision:
      transaction.before_revision,
    after_revision:
      transaction.after_revision,
    generation_id:
      null,
    operation_id:
      null,
    acceptance_materialized_in_memory:
      true,
    acceptance_persisted:
      false,
    requester_authentication_replay_write:
      false,
    provider_authentication_replay_write:
      false,
    acceptance_replay_write:
      false,
    single_active_acceptance_per_quote_enforced:
      transaction.single_active_acceptance_per_quote_enforced,
    authority:
      authorityV1(false),
  };
}

function appliedResultV1(
  rootRealpath: string,
  generationCountBefore: number,
  packet: PublicAgentServiceAcceptanceMaterializationReplayConsumerPacketV1,
  receipt: PublicAgentServiceAcceptancePersistenceReceiptV1,
): PublicAgentServiceAcceptancePersistenceRuntimeResultV1 {
  const planned = plannedResultV1(
    rootRealpath,
    generationCountBefore,
    packet,
  );
  const persistenceStatus = mapReceiptStatusV1(
    receipt,
  );
  assertCondition(
    receipt.acceptance_id
      === planned.acceptance_id,
    "persistence receipt acceptance_id mismatch",
  );
  assertCondition(
    receipt.transaction_id
      === planned.transaction_id,
    "persistence receipt transaction_id mismatch",
  );
  assertCondition(
    receipt.before_state_id
      === planned.before_state_id
      && receipt.after_state_id
        === planned.after_state_id,
    "persistence receipt state transition mismatch",
  );
  assertCondition(
    receipt.acceptance_persisted
      && receipt.requester_authentication_replay_persisted
      && receipt.provider_authentication_replay_persisted
      && receipt.acceptance_replay_persisted,
    "persistence receipt is not an atomic acceptance commit",
  );
  return {
    ...planned,
    status:
      persistenceStatus,
    apply:
      true,
    confirmation_verified:
      true,
    persistence_attempted:
      true,
    persistence_status:
      persistenceStatus,
    generation_id:
      receipt.generation_id,
    operation_id:
      receipt.operation_id,
    acceptance_persisted:
      true,
    requester_authentication_replay_write:
      true,
    provider_authentication_replay_write:
      true,
    acceptance_replay_write:
      true,
    authority:
      authorityV1(true),
  };
}

export const PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_RUNTIME_DEFAULT_DEPENDENCIES_V1:
  PublicAgentServiceAcceptancePersistenceRuntimeDependenciesV1 = Object.freeze({
    acceptanceReplayStateId:
      acceptanceReplayStateIdV1,
    inspectStore:
      inspectPublicAgentServiceAcceptancePersistenceStoreV1,
    plan:
      planPublicAgentServiceAcceptanceMaterializationReplayConsumerV1,
    verify:
      verifyPublicAgentServiceAcceptanceMaterializationReplayConsumerV1,
    persist:
      persistVerifiedPublicAgentServiceAcceptanceV1,
  });

export function publicAgentServiceAcceptancePersistenceRuntimeDefaultDependencyIdentityV1(): {
  acceptance_replay_state_id_exact: true;
  inspect_store_exact: true;
  plan_exact: true;
  verify_exact: true;
  persist_exact: true;
} {
  assertCondition(
    PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_RUNTIME_DEFAULT_DEPENDENCIES_V1
      .acceptanceReplayStateId
      === acceptanceReplayStateIdV1,
    "default replay-state ID dependency changed",
  );
  assertCondition(
    PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_RUNTIME_DEFAULT_DEPENDENCIES_V1
      .inspectStore
      === inspectPublicAgentServiceAcceptancePersistenceStoreV1,
    "default inspect-store dependency changed",
  );
  assertCondition(
    PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_RUNTIME_DEFAULT_DEPENDENCIES_V1
      .plan
      === planPublicAgentServiceAcceptanceMaterializationReplayConsumerV1,
    "default plan dependency changed",
  );
  assertCondition(
    PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_RUNTIME_DEFAULT_DEPENDENCIES_V1
      .verify
      === verifyPublicAgentServiceAcceptanceMaterializationReplayConsumerV1,
    "default verify dependency changed",
  );
  assertCondition(
    PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_RUNTIME_DEFAULT_DEPENDENCIES_V1
      .persist
      === persistVerifiedPublicAgentServiceAcceptanceV1,
    "default persist dependency changed",
  );
  return {
    acceptance_replay_state_id_exact:
      true,
    inspect_store_exact:
      true,
    plan_exact:
      true,
    verify_exact:
      true,
    persist_exact:
      true,
  };
}

export function executePublicAgentServiceAcceptancePersistenceRuntimeBindingV1(
  configValue: unknown,
  commandValue: unknown,
  trustedContextProvider: () => unknown,
  dependencies:
    PublicAgentServiceAcceptancePersistenceRuntimeDependenciesV1 =
      PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_RUNTIME_DEFAULT_DEPENDENCIES_V1,
): PublicAgentServiceAcceptancePersistenceRuntimeResultV1 {
  const config =
    validatePublicAgentServiceAcceptancePersistenceRuntimeConfigV1(
      configValue,
    );

  if (!config.enabled) {
    return disabledResultV1();
  }

  const command = validateCommandV1(
    commandValue,
  );
  assertCondition(
    typeof trustedContextProvider === "function",
    "trusted context provider is required",
  );

  if (command.apply) {
    assertCondition(
      command.confirmation
        === PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_RUNTIME_CONFIRMATION,
      `confirmation must be ${PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_RUNTIME_CONFIRMATION}`,
    );
  } else {
    assertCondition(
      command.confirmation === "",
      "dry-run confirmation must be empty",
    );
  }

  const inspection = dependencies.inspectStore(
    config.persistence_config,
  );
  const replayState = inspection.current
    ?.replayState
    ?? emptyReplayStateV1(dependencies);
  const trustedContext = validateTrustedContextV1(
    trustedContextProvider(),
  );

  const consumerInput = {
    marker:
      "VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_MATERIALIZATION_REPLAY_CONSUMER_V1" as const,
    version:
      PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_RUNTIME_VERSION,
    mode:
      "external_requester_evidence" as const,
    requester_authentication_input:
      command.requester_authentication_input,
    acceptance_draft:
      command.acceptance_draft,
    replay_state_snapshot:
      replayState,
    expected_state_revision:
      replayState.revision,
  };

  const packet = dependencies.plan(
    consumerInput,
    trustedContext.catalog,
    trustedContext.work_order,
    trustedContext.quote,
  );
  const verifiedPacket = dependencies.verify(
    consumerInput,
    trustedContext.catalog,
    trustedContext.work_order,
    trustedContext.quote,
    packet,
  );
  assertCondition(
    verifiedPacket === packet
      || JSON.stringify(verifiedPacket)
        === JSON.stringify(packet),
    "verified replay-consumer packet changed",
  );

  if (!command.apply) {
    return plannedResultV1(
      inspection.root_realpath,
      inspection.generation_count,
      verifiedPacket,
    );
  }

  const receipt = dependencies.persist(
    config.persistence_config,
    {
      marker:
        PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_REQUEST_MARKER,
      version: 1,
      recorded_at_utc:
        command.recorded_at_utc,
      confirmation:
        PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_CONFIRMATION,
    },
    () => verifiedPacket,
  );

  return appliedResultV1(
    inspection.root_realpath,
    inspection.generation_count,
    verifiedPacket,
    receipt,
  );
}
