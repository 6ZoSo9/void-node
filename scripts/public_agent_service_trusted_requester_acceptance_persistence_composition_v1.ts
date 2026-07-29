import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  acceptanceReplayStateIdV1,
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
  validateVerifiedAcceptanceReplayConsumerPacketV1,
  type PublicAgentServiceAcceptancePersistenceConfigV1,
  type PublicAgentServiceAcceptancePersistenceReceiptV1,
} from "./public_agent_service_acceptance_persistence_adapter_v1.js";
import {
  PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_REPLAY_PLAN_VERIFICATION_MARKER,
  materializePublicAgentServiceTrustedRequesterAcceptanceReplayPlanVerificationV1,
  validatePublicAgentServiceTrustedRequesterAcceptanceReplayPlanVerificationV1,
  verifyPublicAgentServiceTrustedRequesterAcceptanceReplayPlanVerificationV1,
  type PublicAgentServiceTrustedRequesterAcceptanceReplayPlanVerificationPacketV1,
  type PublicAgentServiceTrustedRequesterAcceptanceReplayPlanVerificationV1,
} from "./public_agent_service_trusted_requester_acceptance_replay_plan_verification_v1.js";

export const PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_COMPOSITION_MARKER =
  "VOID_PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_COMPOSITION_V1" as const;
export const PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_COMPOSITION_CONFIG_MARKER =
  "VOID_PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_COMPOSITION_CONFIG_V1" as const;
export const PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_COMPOSITION_COMMAND_MARKER =
  "VOID_PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_COMPOSITION_COMMAND_V1" as const;
export const PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_COMPOSITION_RESULT_MARKER =
  "VOID_PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_COMPOSITION_RESULT_V1" as const;
export const PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_COMPOSITION_EXAMPLE_MARKER =
  "VOID_PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_COMPOSITION_EXAMPLE_V1" as const;
export const PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_COMPOSITION_VERSION =
  1 as const;
export const PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_COMPOSITION_CONFIRMATION =
  "persistTrustedRequesterAcceptanceReplayPlanV1" as const;

const MAX_EXAMPLE_JSON_BYTES = 32 * 1024 * 1024;

export interface PublicAgentServiceTrustedRequesterAcceptancePersistenceCompositionConfigV1 {
  marker:
    typeof PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_COMPOSITION_CONFIG_MARKER;
  version:
    typeof PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_COMPOSITION_VERSION;
  enabled: boolean;
  persistence_config:
    PublicAgentServiceAcceptancePersistenceConfigV1;
}

export interface PublicAgentServiceTrustedRequesterAcceptancePersistenceCompositionCommandV1 {
  marker:
    typeof PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_COMPOSITION_COMMAND_MARKER;
  version:
    typeof PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_COMPOSITION_VERSION;
  apply: boolean;
  confirmation: string;
  recorded_at_utc: string;
}

export interface PublicAgentServiceTrustedRequesterAcceptancePersistenceCompositionDependenciesV1 {
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
  validateTrustedInput: (
    input: unknown,
  ) => PublicAgentServiceTrustedRequesterAcceptanceReplayPlanVerificationV1;
  materializeTrustedReplayPlan: (
    input: unknown,
  ) => PublicAgentServiceTrustedRequesterAcceptanceReplayPlanVerificationPacketV1;
  verifyTrustedReplayPlan: (
    input: unknown,
    packet: unknown,
  ) => PublicAgentServiceTrustedRequesterAcceptanceReplayPlanVerificationPacketV1;
  validateReplayPacket: (
    packet: unknown,
  ) => {
    packet: PublicAgentServiceAcceptanceMaterializationReplayConsumerPacketV1;
  };
  persist: (
    config: unknown,
    request: unknown,
    packetProvider: () => unknown,
  ) => PublicAgentServiceAcceptancePersistenceReceiptV1;
}

export interface PublicAgentServiceTrustedRequesterAcceptancePersistenceCompositionResultV1 {
  marker:
    typeof PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_COMPOSITION_RESULT_MARKER;
  version:
    typeof PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_COMPOSITION_VERSION;
  status:
    | "disabled"
    | "example_only"
    | "planned"
    | "persisted"
    | "duplicate"
    | "recovered";
  enabled: boolean;
  apply: boolean;
  confirmation_verified: boolean;
  trusted_input_provider_invoked: boolean;
  trusted_replay_plan_verified: boolean;
  requester_binding_provenance_verified: boolean;
  persistence_handoff_packet_validated: boolean;
  store_inspected: boolean;
  persistence_attempted: boolean;
  persistence_status:
    | null
    | "committed"
    | "duplicate"
    | "recovered";
  root_realpath: string | null;
  generation_count_before: number | null;
  requester_authentication_id: string | null;
  provider_authentication_id: string | null;
  quote_id: string | null;
  work_order_id: string | null;
  requester_agent_id: string | null;
  provider_id: string | null;
  acceptance_nonce: string | null;
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
  quote_acceptance_recorded: boolean;
  operator_owned_persistence_config: true;
  server_replay_state_injected: boolean;
  direct_verified_packet_provider: boolean;
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
    work_credit_settlement: false;
    http_submission: false;
    runtime_mutation: false;
    service_restart: false;
    deployment: false;
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
  if (!condition) {
    fail(message);
  }
}

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object"
    && value !== null
    && !Array.isArray(value)
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
    `${label} length out of range`,
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

function clone<T>(value: T): T {
  return structuredClone(value);
}

function authorityV1(
  applied: boolean,
): PublicAgentServiceTrustedRequesterAcceptancePersistenceCompositionResultV1["authority"] {
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
    work_credit_settlement:
      false,
    http_submission:
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

function emptyResultV1(
  status: "disabled" | "example_only",
  enabled: boolean,
  apply: boolean,
  trustedInputProviderInvoked: boolean,
  packet:
    PublicAgentServiceTrustedRequesterAcceptanceReplayPlanVerificationPacketV1
    | null,
): PublicAgentServiceTrustedRequesterAcceptancePersistenceCompositionResultV1 {
  return {
    marker:
      PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_COMPOSITION_RESULT_MARKER,
    version:
      PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_COMPOSITION_VERSION,
    status,
    enabled,
    apply,
    confirmation_verified:
      false,
    trusted_input_provider_invoked:
      trustedInputProviderInvoked,
    trusted_replay_plan_verified:
      packet !== null,
    requester_binding_provenance_verified:
      packet?.verification.requester_binding_provenance_verified
        ?? false,
    persistence_handoff_packet_validated:
      packet?.verification.persistence_handoff_packet_validated
        ?? false,
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
    requester_authentication_id:
      packet?.source.requester_authentication_id
        ?? null,
    provider_authentication_id:
      packet?.source.provider_authentication_id
        ?? null,
    quote_id:
      packet?.source.quote_id
        ?? null,
    work_order_id:
      packet?.source.work_order_id
        ?? null,
    requester_agent_id:
      packet?.source.requester_agent_id
        ?? null,
    provider_id:
      packet?.source.provider_id
        ?? null,
    acceptance_nonce:
      packet?.source.acceptance_nonce
        ?? null,
    plan_id:
      packet?.source.plan_id
        ?? null,
    acceptance_id:
      packet?.source.acceptance_id
        ?? null,
    transaction_id:
      packet?.source.replay_transaction_id
        ?? null,
    before_state_id:
      packet?.source.before_state_id
        ?? null,
    after_state_id:
      packet?.source.after_state_id
        ?? null,
    before_revision:
      packet?.source.before_revision
        ?? null,
    after_revision:
      packet?.source.after_revision
        ?? null,
    generation_id:
      null,
    operation_id:
      null,
    acceptance_materialized_in_memory:
      packet?.verification.acceptance_materialized_in_memory
        ?? false,
    acceptance_persisted:
      false,
    requester_authentication_replay_write:
      false,
    provider_authentication_replay_write:
      false,
    acceptance_replay_write:
      false,
    single_active_acceptance_per_quote_enforced:
      packet?.verification.single_active_acceptance_per_quote_verified
        ?? false,
    quote_acceptance_recorded:
      false,
    operator_owned_persistence_config:
      true,
    server_replay_state_injected:
      false,
    direct_verified_packet_provider:
      false,
    authority:
      authorityV1(false),
  };
}

function emptyReplayStateV1(
  dependencies:
    PublicAgentServiceTrustedRequesterAcceptancePersistenceCompositionDependenciesV1,
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

export function validatePublicAgentServiceTrustedRequesterAcceptancePersistenceCompositionConfigV1(
  value: unknown,
): PublicAgentServiceTrustedRequesterAcceptancePersistenceCompositionConfigV1 {
  const root = requireRecord(
    value,
    "trusted requester acceptance persistence composition config",
  );
  requireExactKeys(
    root,
    "trusted requester acceptance persistence composition config",
    [
      "marker",
      "version",
      "enabled",
      "persistence_config",
    ],
  );
  assertCondition(
    root.marker
      === PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_COMPOSITION_CONFIG_MARKER,
    "trusted requester acceptance persistence composition config marker mismatch",
  );
  assertCondition(
    root.version
      === PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_COMPOSITION_VERSION,
    "trusted requester acceptance persistence composition config version mismatch",
  );
  const persistenceConfig =
    validatePublicAgentServiceAcceptancePersistenceConfigV1(
      root.persistence_config,
    );
  assertCondition(
    persistenceConfig.marker
      === PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_ADAPTER_MARKER,
    "persistence adapter config marker mismatch",
  );
  return {
    marker:
      PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_COMPOSITION_CONFIG_MARKER,
    version:
      PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_COMPOSITION_VERSION,
    enabled:
      requireBoolean(
        root.enabled,
        "enabled",
      ),
    persistence_config:
      persistenceConfig,
  };
}

export function validatePublicAgentServiceTrustedRequesterAcceptancePersistenceCompositionCommandV1(
  value: unknown,
): PublicAgentServiceTrustedRequesterAcceptancePersistenceCompositionCommandV1 {
  const root = requireRecord(
    value,
    "trusted requester acceptance persistence composition command",
  );
  requireExactKeys(
    root,
    "trusted requester acceptance persistence composition command",
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
      === PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_COMPOSITION_COMMAND_MARKER,
    "trusted requester acceptance persistence composition command marker mismatch",
  );
  assertCondition(
    root.version
      === PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_COMPOSITION_VERSION,
    "trusted requester acceptance persistence composition command version mismatch",
  );
  return {
    marker:
      PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_COMPOSITION_COMMAND_MARKER,
    version:
      PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_COMPOSITION_VERSION,
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
  };
}

export const PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_COMPOSITION_DEFAULT_DEPENDENCIES_V1:
  PublicAgentServiceTrustedRequesterAcceptancePersistenceCompositionDependenciesV1 =
  Object.freeze({
    acceptanceReplayStateId:
      acceptanceReplayStateIdV1,
    inspectStore:
      inspectPublicAgentServiceAcceptancePersistenceStoreV1,
    validateTrustedInput:
      validatePublicAgentServiceTrustedRequesterAcceptanceReplayPlanVerificationV1,
    materializeTrustedReplayPlan:
      materializePublicAgentServiceTrustedRequesterAcceptanceReplayPlanVerificationV1,
    verifyTrustedReplayPlan:
      verifyPublicAgentServiceTrustedRequesterAcceptanceReplayPlanVerificationV1,
    validateReplayPacket:
      validateVerifiedAcceptanceReplayConsumerPacketV1,
    persist:
      persistVerifiedPublicAgentServiceAcceptanceV1,
  });

export function publicAgentServiceTrustedRequesterAcceptancePersistenceCompositionDefaultDependencyIdentityV1(): {
  acceptance_replay_state_id_exact: true;
  inspect_store_exact: true;
  validate_trusted_input_exact: true;
  materialize_trusted_replay_plan_exact: true;
  verify_trusted_replay_plan_exact: true;
  validate_replay_packet_exact: true;
  persist_exact: true;
} {
  const dependencies =
    PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_COMPOSITION_DEFAULT_DEPENDENCIES_V1;
  assertCondition(
    dependencies.acceptanceReplayStateId
      === acceptanceReplayStateIdV1,
    "default replay-state ID dependency changed",
  );
  assertCondition(
    dependencies.inspectStore
      === inspectPublicAgentServiceAcceptancePersistenceStoreV1,
    "default inspect-store dependency changed",
  );
  assertCondition(
    dependencies.validateTrustedInput
      === validatePublicAgentServiceTrustedRequesterAcceptanceReplayPlanVerificationV1,
    "default trusted-input validator changed",
  );
  assertCondition(
    dependencies.materializeTrustedReplayPlan
      === materializePublicAgentServiceTrustedRequesterAcceptanceReplayPlanVerificationV1,
    "default trusted replay-plan materializer changed",
  );
  assertCondition(
    dependencies.verifyTrustedReplayPlan
      === verifyPublicAgentServiceTrustedRequesterAcceptanceReplayPlanVerificationV1,
    "default trusted replay-plan verifier changed",
  );
  assertCondition(
    dependencies.validateReplayPacket
      === validateVerifiedAcceptanceReplayConsumerPacketV1,
    "default replay packet validator changed",
  );
  assertCondition(
    dependencies.persist
      === persistVerifiedPublicAgentServiceAcceptanceV1,
    "default persistence dependency changed",
  );
  return {
    acceptance_replay_state_id_exact:
      true,
    inspect_store_exact:
      true,
    validate_trusted_input_exact:
      true,
    materialize_trusted_replay_plan_exact:
      true,
    verify_trusted_replay_plan_exact:
      true,
    validate_replay_packet_exact:
      true,
    persist_exact:
      true,
  };
}

function prepareExternalTrustedInputV1(
  trustedInput:
    PublicAgentServiceTrustedRequesterAcceptanceReplayPlanVerificationV1,
  replayState: AcceptanceReplayStateV1,
): PublicAgentServiceTrustedRequesterAcceptanceReplayPlanVerificationV1 {
  assertCondition(
    trustedInput.evidence_mode
      === "external_requester_evidence",
    "persistence composition requires external requester evidence",
  );
  const prepared =
    clone(trustedInput);
  prepared
    .acceptance_materialization_replay_consumer_input
    .replay_state_snapshot =
      replayState;
  prepared
    .acceptance_materialization_replay_consumer_input
    .expected_state_revision =
      replayState.revision;
  return prepared;
}

function verifyTrustedPacketV1(
  preparedInput:
    PublicAgentServiceTrustedRequesterAcceptanceReplayPlanVerificationV1,
  dependencies:
    PublicAgentServiceTrustedRequesterAcceptancePersistenceCompositionDependenciesV1,
): {
  outer:
    PublicAgentServiceTrustedRequesterAcceptanceReplayPlanVerificationPacketV1;
  lower:
    PublicAgentServiceAcceptanceMaterializationReplayConsumerPacketV1;
} {
  const materialized =
    dependencies.materializeTrustedReplayPlan(
      preparedInput,
    );
  const verified =
    dependencies.verifyTrustedReplayPlan(
      preparedInput,
      materialized,
    );
  assertCondition(
    verified.status
      === "trusted_requester_acceptance_replay_plan_verified",
    "trusted requester replay plan is not live and verified",
  );
  assertCondition(
    verified.verification
      .requester_binding_provenance_verified
      === true,
    "requester binding provenance is not verified",
  );
  assertCondition(
    verified.verification
      .acceptance_replay_plan_verified
      === true,
    "acceptance replay plan is not verified",
  );
  assertCondition(
    verified.verification
      .persistence_handoff_packet_validated
      === true,
    "persistence handoff packet is not validated",
  );
  assertCondition(
    verified.persistence_handoff_gate
      .eligible_for_operator_confirmed_persistence
      === true,
    "trusted replay plan is not persistence eligible",
  );
  assertCondition(
    verified.persistence_handoff_gate
      .persistence_adapter_invoked
      === false
      && verified.persistence_handoff_gate
        .production_persistence_performed
        === false,
    "upstream trusted replay plan already claims persistence",
  );
  const lower =
    verified.acceptance_replay_plan_packet;
  const validated =
    dependencies.validateReplayPacket(
      lower,
    );
  assertCondition(
    validated.packet === lower
      || JSON.stringify(validated.packet)
        === JSON.stringify(lower),
    "read-only replay packet validation changed the packet",
  );
  return {
    outer:
      verified,
    lower,
  };
}

function plannedResultV1(
  rootRealpath: string,
  generationCountBefore: number,
  outer:
    PublicAgentServiceTrustedRequesterAcceptanceReplayPlanVerificationPacketV1,
): PublicAgentServiceTrustedRequesterAcceptancePersistenceCompositionResultV1 {
  const lower =
    outer.acceptance_replay_plan_packet;
  const transaction =
    lower.replay.transaction;
  const nextState =
    lower.replay.next_state;
  assertCondition(
    transaction !== null
      && nextState !== null
      && lower.acceptance.acceptance_id !== null
      && lower.acceptance.acceptance_materialized_in_memory
        === true,
    "trusted replay plan omitted a complete persistence transition",
  );
  return {
    marker:
      PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_COMPOSITION_RESULT_MARKER,
    version:
      PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_COMPOSITION_VERSION,
    status:
      "planned",
    enabled:
      true,
    apply:
      false,
    confirmation_verified:
      false,
    trusted_input_provider_invoked:
      true,
    trusted_replay_plan_verified:
      true,
    requester_binding_provenance_verified:
      true,
    persistence_handoff_packet_validated:
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
    requester_authentication_id:
      outer.source.requester_authentication_id,
    provider_authentication_id:
      outer.source.provider_authentication_id,
    quote_id:
      outer.source.quote_id,
    work_order_id:
      outer.source.work_order_id,
    requester_agent_id:
      outer.source.requester_agent_id,
    provider_id:
      outer.source.provider_id,
    acceptance_nonce:
      outer.source.acceptance_nonce,
    plan_id:
      outer.source.plan_id,
    acceptance_id:
      outer.source.acceptance_id,
    transaction_id:
      outer.source.replay_transaction_id,
    before_state_id:
      outer.source.before_state_id,
    after_state_id:
      outer.source.after_state_id,
    before_revision:
      outer.source.before_revision,
    after_revision:
      outer.source.after_revision,
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
      transaction
        .single_active_acceptance_per_quote_enforced,
    quote_acceptance_recorded:
      false,
    operator_owned_persistence_config:
      true,
    server_replay_state_injected:
      true,
    direct_verified_packet_provider:
      true,
    authority:
      authorityV1(false),
  };
}

function appliedResultV1(
  planned:
    PublicAgentServiceTrustedRequesterAcceptancePersistenceCompositionResultV1,
  receipt:
    PublicAgentServiceAcceptancePersistenceReceiptV1,
): PublicAgentServiceTrustedRequesterAcceptancePersistenceCompositionResultV1 {
  assertCondition(
    planned.status === "planned",
    "applied result requires a planned transition",
  );
  assertCondition(
    receipt.acceptance_id
      === planned.acceptance_id,
    "persistence receipt acceptance ID mismatch",
  );
  assertCondition(
    receipt.transaction_id
      === planned.transaction_id,
    "persistence receipt transaction ID mismatch",
  );
  assertCondition(
    receipt.before_state_id
      === planned.before_state_id
      && receipt.after_state_id
        === planned.after_state_id,
    "persistence receipt state transition mismatch",
  );
  assertCondition(
    receipt.before_revision
      === planned.before_revision
      && receipt.after_revision
        === planned.after_revision,
    "persistence receipt revision transition mismatch",
  );
  assertCondition(
    receipt.acceptance_persisted
      && receipt.requester_authentication_replay_persisted
      && receipt.provider_authentication_replay_persisted
      && receipt.acceptance_replay_persisted,
    "persistence receipt is not an atomic acceptance commit",
  );
  assertCondition(
    receipt.authority.acceptance_persistence
      && receipt.authority.quote_acceptance_recorded
      && receipt.authority
        .requester_authentication_replay_write
      && receipt.authority
        .provider_authentication_replay_write
      && receipt.authority.acceptance_replay_write,
    "persistence receipt omitted narrow authority",
  );
  const status =
    receipt.status === "committed"
      ? "persisted"
      : receipt.status;
  return {
    ...planned,
    status,
    apply:
      true,
    confirmation_verified:
      true,
    persistence_attempted:
      true,
    persistence_status:
      receipt.status,
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
    quote_acceptance_recorded:
      true,
    authority:
      authorityV1(true),
  };
}

export function executePublicAgentServiceTrustedRequesterAcceptancePersistenceCompositionV1(
  configValue: unknown,
  commandValue: unknown,
  trustedReplayPlanInputProvider: () => unknown,
  dependencies:
    PublicAgentServiceTrustedRequesterAcceptancePersistenceCompositionDependenciesV1 =
      PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_COMPOSITION_DEFAULT_DEPENDENCIES_V1,
): PublicAgentServiceTrustedRequesterAcceptancePersistenceCompositionResultV1 {
  const config =
    validatePublicAgentServiceTrustedRequesterAcceptancePersistenceCompositionConfigV1(
      configValue,
    );
  if (!config.enabled) {
    return emptyResultV1(
      "disabled",
      false,
      false,
      false,
      null,
    );
  }

  const command =
    validatePublicAgentServiceTrustedRequesterAcceptancePersistenceCompositionCommandV1(
      commandValue,
    );
  if (command.apply) {
    assertCondition(
      command.confirmation
        === PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_COMPOSITION_CONFIRMATION,
      `confirmation must be ${PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_COMPOSITION_CONFIRMATION}`,
    );
  } else {
    assertCondition(
      command.confirmation === "",
      "dry-run confirmation must be empty",
    );
  }
  assertCondition(
    typeof trustedReplayPlanInputProvider
      === "function",
    "trusted replay-plan input provider is required",
  );

  const trustedInput =
    dependencies.validateTrustedInput(
      trustedReplayPlanInputProvider(),
    );

  if (
    trustedInput.evidence_mode
      === "example_fixture"
  ) {
    assertCondition(
      command.apply === false,
      "example fixture cannot be applied",
    );
    const materialized =
      dependencies.materializeTrustedReplayPlan(
        trustedInput,
      );
    const verified =
      dependencies.verifyTrustedReplayPlan(
        trustedInput,
        materialized,
      );
    assertCondition(
      verified.status === "example_only",
      "example trusted replay plan became live",
    );
    assertCondition(
      verified.persistence_handoff_gate
        .eligible_for_operator_confirmed_persistence
        === false,
      "example trusted replay plan became persistence eligible",
    );
    return emptyResultV1(
      "example_only",
      true,
      false,
      true,
      verified,
    );
  }

  const inspection =
    dependencies.inspectStore(
      config.persistence_config,
    );
  const replayState =
    inspection.current?.replayState
      ?? emptyReplayStateV1(
        dependencies,
      );
  const preparedInput =
    prepareExternalTrustedInputV1(
      trustedInput,
      replayState,
    );
  const {
    outer,
    lower,
  } = verifyTrustedPacketV1(
    preparedInput,
    dependencies,
  );
  const planned =
    plannedResultV1(
      inspection.root_realpath,
      inspection.generation_count,
      outer,
    );

  if (!command.apply) {
    return planned;
  }

  const receipt =
    dependencies.persist(
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
      () => lower,
    );
  return appliedResultV1(
    planned,
    receipt,
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
    trustedExamplePath,
    ...extra
  ] = process.argv.slice(2);
  assertCondition(
    extra.length === 0,
    "unexpected arguments",
  );
  if (
    mode !== "example"
    || trustedExamplePath === undefined
  ) {
    fail(
      "usage: tsx scripts/public_agent_service_trusted_requester_acceptance_persistence_composition_v1.ts example <trusted-replay-plan-example.json>",
    );
  }
  const trustedBundle =
    requireRecord(
      readJsonFile(
        trustedExamplePath,
      ),
      "trusted replay-plan example bundle",
    );
  const trustedInput =
    trustedBundle.input;
  const config:
    PublicAgentServiceTrustedRequesterAcceptancePersistenceCompositionConfigV1 = {
      marker:
        PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_COMPOSITION_CONFIG_MARKER,
      version: 1,
      enabled: true,
      persistence_config: {
        marker:
          PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_ADAPTER_MARKER,
        version: 1,
        allowed_root:
          "/example/operator-owned-persistence-root-not-accessed",
        max_pointer_bytes:
          65_536,
        max_generation_file_bytes:
          4_194_304,
        max_generation_count:
          10_000,
        recover_exact_orphaned_generation:
          true,
      },
    };
  const command:
    PublicAgentServiceTrustedRequesterAcceptancePersistenceCompositionCommandV1 = {
      marker:
        PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_COMPOSITION_COMMAND_MARKER,
      version: 1,
      apply: false,
      confirmation: "",
      recorded_at_utc:
        "2030-01-01T00:10:00Z",
    };
  const result =
    executePublicAgentServiceTrustedRequesterAcceptancePersistenceCompositionV1(
      config,
      command,
      () => trustedInput,
    );
  process.stdout.write(
    `${JSON.stringify({
      marker:
        PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_COMPOSITION_EXAMPLE_MARKER,
      version: 1,
      example_only: true,
      config,
      command,
      trusted_replay_plan_input:
        trustedInput,
      result,
    }, null, 2)}\n`,
  );
}

const invokedPath =
  process.argv[1] === undefined
    ? ""
    : pathToFileURL(
        path.resolve(process.argv[1]),
      ).href;
if (import.meta.url === invokedPath) {
  main();
}
