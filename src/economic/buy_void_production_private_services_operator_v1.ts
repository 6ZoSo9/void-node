import {
  VOID_BUY_VOID_PREPARED_TRANSACTION_BROADCASTER_SUBMISSION_ACTIVATION_CONFIRMATION_V1,
} from "./buy_void_prepared_transaction_broadcaster_submission_activation_v1.js";
import {
  VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODIAN_CREDENTIAL_ACTIVATION_CONFIRMATION_V1,
} from "./buy_void_prepared_transaction_custodian_credential_activation_v1.js";
import {
  VOID_BUY_VOID_PRODUCTION_PRIVATE_SERVICES_ACTIVATION_AUTHORITY_V1,
  VOID_BUY_VOID_PRODUCTION_PRIVATE_SERVICES_ACTIVATION_CONFIRMATION_V1,
  VOID_BUY_VOID_PRODUCTION_PRIVATE_SERVICES_ACTIVATION_V1,
  runBuyVoidProductionPrivateServicesActivationV1,
  type BuyVoidProductionPrivateServicesActivationDependenciesV1,
} from "./buy_void_production_private_services_activation_v1.js";
import {
  VOID_BUY_VOID_PRODUCTION_RPC_READINESS_CONFIRMATION_V1,
} from "./buy_void_production_rpc_readiness_v1.js";
import {
  resolveBuyVoidProductionPreflightOperatorPolicyV1,
  type BuyVoidProductionPreflightOperatorPolicyDecisionV1,
} from "./buy_void_production_preflight_operator_v1.js";

export const VOID_BUY_VOID_PRODUCTION_PRIVATE_SERVICES_OPERATOR_V1 =
  "VOID_BUY_VOID_PRODUCTION_PRIVATE_SERVICES_OPERATOR_V1";

export const VOID_BUY_VOID_PRODUCTION_PRIVATE_SERVICES_OPERATOR_AUTHORITY_V1 = {
  canonical_production_policy_resolver_reused: true,
  duplicate_production_policy_parser: false,
  private_paths_caller_overridable: false,
  wallet_caller_overridable: false,
  rpc_url_caller_overridable: false,
  runtime_root_caller_overridable: false,
  signer_fingerprint_caller_overridable: false,
  dry_run_default: true,
  foreground_only_when_started: true,
  daemonize: false,
  automatic_restart: false,
  automatic_retry: false,
  all_activation_confirmations_forwarded_exactly: true,
  transaction_submission_confirmation_accepted: false,
  service_handles_serialized: false,
  shutdown_broadcaster_before_custodian: true,
  duplicate_shutdown_idempotent: true,
  unexpected_started_result_cleanup: true,
  held_result_boundary_revalidated: true,
  dry_run_authority_arguments_rejected_without_apply: true,
  provider_submission_id_parser_duplicated: false,
  unknown_side_effect_state_is_residual: true,
  credential_read_during_startup_or_shutdown: false,
  signing_during_startup_or_shutdown: false,
  submit_once_during_startup_or_shutdown: false,
  transaction_broadcast_during_startup_or_shutdown: false,
  inventory_mutation_during_startup_or_shutdown: false,
  public_fulfilled_projection_during_startup_or_shutdown: false,
  money_movement_during_startup_or_shutdown: false,
} as const;

const SAFE_INPUT_KEYS = new Set([
  "apply",
  "confirmation",
  "expected_plan_id_sha256",
  "rpc_readiness_confirmation",
  "custodian_activation_confirmation",
  "broadcaster_activation_confirmation",
]);
const SHA256 = /^[0-9a-f]{64}$/;
const SAFE_REASON = /^[A-Za-z0-9._:-]{1,220}$/;

export type RunBuyVoidProductionPrivateServicesOperatorInputV1 = {
  apply?: boolean;
  confirmation?: unknown;
  expected_plan_id_sha256?: unknown;
  rpc_readiness_confirmation?: unknown;
  custodian_activation_confirmation?: unknown;
  broadcaster_activation_confirmation?: unknown;
};

type StoppableServiceV1 = {
  stop: () => Promise<void>;
};

export type BuyVoidProductionPrivateServicesOperatorShutdownTriggerV1 =
  | "SIGINT"
  | "SIGTERM"
  | "operator";

export type BuyVoidProductionPrivateServicesOperatorShutdownReceiptV1 = {
  marker: typeof VOID_BUY_VOID_PRODUCTION_PRIVATE_SERVICES_OPERATOR_V1;
  version: 1;
  status: "stopped" | "cleanup_failed";
  shutdown_trigger: BuyVoidProductionPrivateServicesOperatorShutdownTriggerV1;
  broadcaster_stop_attempted: true;
  broadcaster_stop_succeeded: boolean;
  custodian_stop_attempted: true;
  custodian_stop_succeeded: boolean;
  duplicate_shutdown: boolean;
  credential_read_performed: false;
  signing_performed: false;
  submit_once_performed: false;
  transaction_broadcast_performed: false;
  money_movement_performed: false;
  authority: typeof VOID_BUY_VOID_PRODUCTION_PRIVATE_SERVICES_OPERATOR_AUTHORITY_V1;
};

export type BuyVoidProductionPrivateServicesOperatorSessionV1 = {
  stop: (
    trigger?: BuyVoidProductionPrivateServicesOperatorShutdownTriggerV1,
  ) => Promise<BuyVoidProductionPrivateServicesOperatorShutdownReceiptV1>;
};

export type BuyVoidProductionPrivateServicesOperatorDecisionV1 =
  | {
      ok: true;
      status: "planned";
      applied: false;
      marker: typeof VOID_BUY_VOID_PRODUCTION_PRIVATE_SERVICES_OPERATOR_V1;
      version: 1;
      production_activation_plan_id_sha256: string;
      runtime_policy_fingerprint_sha256: string;
      rpc_url_fingerprint_sha256: string;
      private_path_fingerprint_sha256: string;
      required_confirmation: typeof VOID_BUY_VOID_PRODUCTION_PRIVATE_SERVICES_ACTIVATION_CONFIRMATION_V1;
      required_plan_id_sha256: string;
      required_rpc_readiness_confirmation: typeof VOID_BUY_VOID_PRODUCTION_RPC_READINESS_CONFIRMATION_V1;
      required_custodian_activation_confirmation: typeof VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODIAN_CREDENTIAL_ACTIVATION_CONFIRMATION_V1;
      required_broadcaster_activation_confirmation: typeof VOID_BUY_VOID_PREPARED_TRANSACTION_BROADCASTER_SUBMISSION_ACTIVATION_CONFIRMATION_V1;
      rpc_probe_performed: false;
      service_state_mutation_performed: false;
      custodian_service_active_after_return: false;
      broadcaster_service_active_after_return: false;
      credential_read_performed: false;
      signing_performed: false;
      submit_once_performed: false;
      transaction_broadcast_performed: false;
      money_movement_performed: false;
      authority: typeof VOID_BUY_VOID_PRODUCTION_PRIVATE_SERVICES_OPERATOR_AUTHORITY_V1;
    }
  | {
      ok: true;
      status: "started";
      applied: true;
      marker: typeof VOID_BUY_VOID_PRODUCTION_PRIVATE_SERVICES_OPERATOR_V1;
      version: 1;
      production_activation_plan_id_sha256: string;
      runtime_policy_fingerprint_sha256: string;
      rpc_url_fingerprint_sha256: string;
      private_path_fingerprint_sha256: string;
      provider_submission_id: string;
      rpc_probe_performed: true;
      service_state_mutation_performed: true;
      custodian_service_active_after_return: true;
      broadcaster_service_active_after_return: true;
      credential_read_performed: false;
      signing_performed: false;
      submit_once_performed: false;
      transaction_broadcast_performed: false;
      money_movement_performed: false;
      authority: typeof VOID_BUY_VOID_PRODUCTION_PRIVATE_SERVICES_OPERATOR_AUTHORITY_V1;
    }
  | {
      ok: false;
      status: "held";
      applied: boolean;
      marker: typeof VOID_BUY_VOID_PRODUCTION_PRIVATE_SERVICES_OPERATOR_V1;
      version: 1;
      stage: "operator_input" | "operator_policy" | "activation";
      reason: string;
      production_activation_plan_id_sha256: string | null;
      rpc_probe_performed: boolean;
      service_state_mutation_performed: boolean;
      custodian_service_active_after_return: boolean;
      broadcaster_service_active_after_return: boolean;
      residual_service_state: boolean;
      side_effect_state_known: boolean;
      credential_read_performed: boolean;
      signing_performed: boolean;
      submit_once_performed: boolean;
      transaction_broadcast_performed: boolean;
      money_movement_performed: boolean;
      authority: typeof VOID_BUY_VOID_PRODUCTION_PRIVATE_SERVICES_OPERATOR_AUTHORITY_V1;
    };

export type BuyVoidProductionPrivateServicesOperatorRunResultV1 = {
  decision: BuyVoidProductionPrivateServicesOperatorDecisionV1;
  session: BuyVoidProductionPrivateServicesOperatorSessionV1 | null;
};

export type BuyVoidProductionPrivateServicesOperatorDependenciesV1 = {
  resolve_policy?: () => BuyVoidProductionPreflightOperatorPolicyDecisionV1;
  run_activation?: typeof runBuyVoidProductionPrivateServicesActivationV1;
  activation_dependencies?: BuyVoidProductionPrivateServicesActivationDependenciesV1;
};

type ActivationFlagsV1 = {
  rpc_probe: boolean;
  service_mutation: boolean;
  custodian_active: boolean;
  broadcaster_active: boolean;
  credential_read: boolean;
  signing: boolean;
  submit_once: boolean;
  broadcast: boolean;
  money: boolean;
};

function safeReason(value: unknown, fallback: string): string {
  const reason = String(value ?? "");
  return SAFE_REASON.test(reason) ? reason : fallback;
}

function held(input: {
  applied: boolean;
  stage: "operator_input" | "operator_policy" | "activation";
  reason: string;
  production_activation_plan_id_sha256?: string | null;
  rpc_probe_performed?: boolean;
  service_state_mutation_performed?: boolean;
  custodian_service_active_after_return?: boolean;
  broadcaster_service_active_after_return?: boolean;
  side_effect_state_known?: boolean;
  credential_read_performed?: boolean;
  signing_performed?: boolean;
  submit_once_performed?: boolean;
  transaction_broadcast_performed?: boolean;
  money_movement_performed?: boolean;
}): BuyVoidProductionPrivateServicesOperatorRunResultV1 {
  const custodianActive = input.custodian_service_active_after_return === true;
  const broadcasterActive = input.broadcaster_service_active_after_return === true;
  const sideEffectStateKnown = input.side_effect_state_known !== false;
  return {
    decision: {
      ok: false,
      status: "held",
      applied: input.applied,
      marker: VOID_BUY_VOID_PRODUCTION_PRIVATE_SERVICES_OPERATOR_V1,
      version: 1,
      stage: input.stage,
      reason: input.reason,
      production_activation_plan_id_sha256:
        input.production_activation_plan_id_sha256 ?? null,
      rpc_probe_performed: input.rpc_probe_performed === true,
      service_state_mutation_performed:
        input.service_state_mutation_performed === true,
      custodian_service_active_after_return: custodianActive,
      broadcaster_service_active_after_return: broadcasterActive,
      residual_service_state: sideEffectStateKnown
        ? custodianActive || broadcasterActive
        : true,
      side_effect_state_known: sideEffectStateKnown,
      credential_read_performed: input.credential_read_performed === true,
      signing_performed: input.signing_performed === true,
      submit_once_performed: input.submit_once_performed === true,
      transaction_broadcast_performed:
        input.transaction_broadcast_performed === true,
      money_movement_performed: input.money_movement_performed === true,
      authority: VOID_BUY_VOID_PRODUCTION_PRIVATE_SERVICES_OPERATOR_AUTHORITY_V1,
    },
    session: null,
  };
}

function activationFlags(raw: Record<string, any>): ActivationFlagsV1 {
  return {
    rpc_probe: raw.rpc_probe_performed === true,
    service_mutation:
      raw.custodian_service_start_performed === true ||
      raw.broadcaster_service_start_performed === true,
    custodian_active: raw.custodian_service_active_after_return === true,
    broadcaster_active: raw.broadcaster_service_active_after_return === true,
    credential_read: raw.credential_read_performed === true,
    signing: raw.signing_performed === true,
    submit_once: raw.submit_once_performed === true,
    broadcast: raw.transaction_broadcast_performed === true,
    money: raw.money_movement_performed === true,
  };
}

function createSession(services: {
  custodian: StoppableServiceV1;
  broadcaster: StoppableServiceV1;
}): BuyVoidProductionPrivateServicesOperatorSessionV1 {
  let shutdownPromise:
    | Promise<BuyVoidProductionPrivateServicesOperatorShutdownReceiptV1>
    | null = null;

  async function performStop(
    trigger: BuyVoidProductionPrivateServicesOperatorShutdownTriggerV1,
  ): Promise<BuyVoidProductionPrivateServicesOperatorShutdownReceiptV1> {
    let broadcasterStopSucceeded = false;
    let custodianStopSucceeded = false;
    try {
      await services.broadcaster.stop();
      broadcasterStopSucceeded = true;
    } catch (error) {
      void error;
    }
    try {
      await services.custodian.stop();
      custodianStopSucceeded = true;
    } catch (error) {
      void error;
    }
    return {
      marker: VOID_BUY_VOID_PRODUCTION_PRIVATE_SERVICES_OPERATOR_V1,
      version: 1,
      status:
        broadcasterStopSucceeded && custodianStopSucceeded
          ? "stopped"
          : "cleanup_failed",
      shutdown_trigger: trigger,
      broadcaster_stop_attempted: true,
      broadcaster_stop_succeeded: broadcasterStopSucceeded,
      custodian_stop_attempted: true,
      custodian_stop_succeeded: custodianStopSucceeded,
      duplicate_shutdown: false,
      credential_read_performed: false,
      signing_performed: false,
      submit_once_performed: false,
      transaction_broadcast_performed: false,
      money_movement_performed: false,
      authority: VOID_BUY_VOID_PRODUCTION_PRIVATE_SERVICES_OPERATOR_AUTHORITY_V1,
    };
  }

  return Object.freeze({
    stop: async (
      trigger: BuyVoidProductionPrivateServicesOperatorShutdownTriggerV1 =
        "operator",
    ) => {
      const duplicateShutdown = shutdownPromise !== null;
      if (!shutdownPromise) shutdownPromise = performStop(trigger);
      const receipt = await shutdownPromise;
      return duplicateShutdown
        ? { ...receipt, duplicate_shutdown: true }
        : receipt;
    },
  });
}

async function cleanupUnexpectedActivationResult(raw: Record<string, any>): Promise<{
  custodian_active: boolean;
  broadcaster_active: boolean;
}> {
  const services = raw.services as
    | { custodian?: StoppableServiceV1; broadcaster?: StoppableServiceV1 }
    | undefined;
  let broadcasterActive = true;
  let custodianActive = true;

  if (typeof services?.broadcaster?.stop === "function") {
    try {
      await services.broadcaster.stop();
      broadcasterActive = false;
    } catch (error) {
      void error;
    }
  }
  if (typeof services?.custodian?.stop === "function") {
    try {
      await services.custodian.stop();
      custodianActive = false;
    } catch (error) {
      void error;
    }
  }
  return { custodian_active: custodianActive, broadcaster_active: broadcasterActive };
}

export async function runBuyVoidProductionPrivateServicesOperatorV1(
  input: Readonly<RunBuyVoidProductionPrivateServicesOperatorInputV1>,
  dependencies: BuyVoidProductionPrivateServicesOperatorDependenciesV1 = {},
): Promise<BuyVoidProductionPrivateServicesOperatorRunResultV1> {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return held({
      applied: false,
      stage: "operator_input",
      reason: "production_private_services_operator_input_object_required",
    });
  }
  const unexpectedKeys = Object.keys(input as Record<string, unknown>)
    .filter((key) => !SAFE_INPUT_KEYS.has(key))
    .sort();
  if (unexpectedKeys.length) {
    return held({
      applied: input.apply === true,
      stage: "operator_input",
      reason: "production_private_services_operator_unexpected_input",
    });
  }
  if (input.apply !== undefined && typeof input.apply !== "boolean") {
    return held({
      applied: false,
      stage: "operator_input",
      reason: "production_private_services_operator_apply_boolean_required",
    });
  }

  const apply = input.apply === true;
  if (
    !apply &&
    (input.confirmation !== undefined ||
      input.expected_plan_id_sha256 !== undefined ||
      input.rpc_readiness_confirmation !== undefined ||
      input.custodian_activation_confirmation !== undefined ||
      input.broadcaster_activation_confirmation !== undefined)
  ) {
    return held({
      applied: false,
      stage: "operator_input",
      reason: "production_private_services_operator_dry_run_authority_input_forbidden",
    });
  }
  const resolvePolicy =
    dependencies.resolve_policy || resolveBuyVoidProductionPreflightOperatorPolicyV1;
  let policyState: BuyVoidProductionPreflightOperatorPolicyDecisionV1;
  try {
    policyState = resolvePolicy();
  } catch (error) {
    void error;
    return held({
      applied: apply,
      stage: "operator_policy",
      reason: "production_private_services_operator_policy_resolution_failed",
    });
  }
  if (policyState.ok === false) {
    return held({
      applied: apply,
      stage: "operator_policy",
      reason: safeReason(
        policyState.reason,
        "production_private_services_operator_policy_held",
      ),
    });
  }
  if (
    !SHA256.test(policyState.production_activation_plan_id_sha256) ||
    !SHA256.test(policyState.runtime_policy_fingerprint_sha256) ||
    !SHA256.test(policyState.rpc_url_fingerprint_sha256) ||
    !SHA256.test(policyState.private_path_fingerprint_sha256)
  ) {
    return held({
      applied: apply,
      stage: "operator_policy",
      reason: "production_private_services_operator_policy_boundary_invalid",
    });
  }

  const runActivation =
    dependencies.run_activation || runBuyVoidProductionPrivateServicesActivationV1;
  let activation: unknown;
  try {
    activation = await runActivation(
      {
        policy: policyState.production_policy,
        apply,
        confirmation: input.confirmation,
        expected_plan_id_sha256: input.expected_plan_id_sha256,
        rpc_readiness_confirmation: input.rpc_readiness_confirmation,
        custodian_activation_confirmation: input.custodian_activation_confirmation,
        broadcaster_activation_confirmation: input.broadcaster_activation_confirmation,
      },
      dependencies.activation_dependencies,
    );
  } catch (error) {
    void error;
    return held({
      applied: apply,
      stage: "activation",
      reason: "production_private_services_operator_activation_threw",
      production_activation_plan_id_sha256:
        policyState.production_activation_plan_id_sha256,
      side_effect_state_known: false,
    });
  }

  if (!activation || typeof activation !== "object" || Array.isArray(activation)) {
    return held({
      applied: apply,
      stage: "activation",
      reason: "production_private_services_operator_activation_result_invalid",
      production_activation_plan_id_sha256:
        policyState.production_activation_plan_id_sha256,
      side_effect_state_known: false,
    });
  }

  const raw = activation as Record<string, any>;
  const flags = activationFlags(raw);
  if (raw.ok !== true) {
    const heldBoundaryValid =
      raw.ok === false &&
      raw.status === "held" &&
      raw.applied === apply &&
      raw.marker === VOID_BUY_VOID_PRODUCTION_PRIVATE_SERVICES_ACTIVATION_V1 &&
      raw.version === 1 &&
      typeof raw.reason === "string" &&
      raw.authority ===
        VOID_BUY_VOID_PRODUCTION_PRIVATE_SERVICES_ACTIVATION_AUTHORITY_V1 &&
      (raw.plan_id_sha256 === null ||
        raw.plan_id_sha256 === policyState.production_activation_plan_id_sha256) &&
      typeof raw.rpc_probe_performed === "boolean" &&
      typeof raw.custodian_service_start_performed === "boolean" &&
      typeof raw.broadcaster_service_start_performed === "boolean" &&
      typeof raw.custodian_service_active_after_return === "boolean" &&
      typeof raw.broadcaster_service_active_after_return === "boolean" &&
      typeof raw.custodian_rollback_attempted === "boolean" &&
      (raw.custodian_rollback_succeeded === null ||
        typeof raw.custodian_rollback_succeeded === "boolean") &&
      typeof raw.broadcaster_rollback_attempted === "boolean" &&
      (raw.broadcaster_rollback_succeeded === null ||
        typeof raw.broadcaster_rollback_succeeded === "boolean") &&
      raw.services === undefined &&
      raw.credential_read_performed === false &&
      raw.signing_performed === false &&
      raw.submit_once_performed === false &&
      raw.transaction_broadcast_performed === false &&
      raw.money_movement_performed === false;

    if (!heldBoundaryValid) {
      const cleanup = await cleanupUnexpectedActivationResult(raw);
      return held({
        applied: apply,
        stage: "activation",
        reason: "production_private_services_operator_activation_held_boundary_invalid",
        production_activation_plan_id_sha256:
          typeof raw.plan_id_sha256 === "string" ? raw.plan_id_sha256 : null,
        rpc_probe_performed: flags.rpc_probe,
        service_state_mutation_performed: flags.service_mutation,
        custodian_service_active_after_return: cleanup.custodian_active,
        broadcaster_service_active_after_return: cleanup.broadcaster_active,
        side_effect_state_known: false,
        credential_read_performed: flags.credential_read,
        signing_performed: flags.signing,
        submit_once_performed: flags.submit_once,
        transaction_broadcast_performed: flags.broadcast,
        money_movement_performed: flags.money,
      });
    }

    return held({
      applied: apply,
      stage: "activation",
      reason: safeReason(
        raw.reason,
        "production_private_services_operator_activation_held",
      ),
      production_activation_plan_id_sha256:
        typeof raw.plan_id_sha256 === "string" ? raw.plan_id_sha256 : null,
      rpc_probe_performed: flags.rpc_probe,
      service_state_mutation_performed: flags.service_mutation,
      custodian_service_active_after_return: flags.custodian_active,
      broadcaster_service_active_after_return: flags.broadcaster_active,
      credential_read_performed: false,
      signing_performed: false,
      submit_once_performed: false,
      transaction_broadcast_performed: false,
      money_movement_performed: false,
    });
  }

  if (raw.status === "dry_run") {
    const dryRunValid =
      !apply &&
      raw.applied === false &&
      raw.marker === VOID_BUY_VOID_PRODUCTION_PRIVATE_SERVICES_ACTIVATION_V1 &&
      raw.authority === VOID_BUY_VOID_PRODUCTION_PRIVATE_SERVICES_ACTIVATION_AUTHORITY_V1 &&
      raw.plan_id_sha256 === policyState.production_activation_plan_id_sha256 &&
      raw.rpc_url_fingerprint_sha256 === policyState.rpc_url_fingerprint_sha256 &&
      raw.expected_signer_fingerprint_sha256 ===
        policyState.production_policy.broadcaster.expected_signer_fingerprint_sha256 &&
      raw.required_confirmation ===
        VOID_BUY_VOID_PRODUCTION_PRIVATE_SERVICES_ACTIVATION_CONFIRMATION_V1 &&
      raw.required_plan_id_sha256 === policyState.production_activation_plan_id_sha256 &&
      raw.required_rpc_readiness_confirmation ===
        VOID_BUY_VOID_PRODUCTION_RPC_READINESS_CONFIRMATION_V1 &&
      raw.required_custodian_activation_confirmation ===
        VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODIAN_CREDENTIAL_ACTIVATION_CONFIRMATION_V1 &&
      raw.required_broadcaster_activation_confirmation ===
        VOID_BUY_VOID_PREPARED_TRANSACTION_BROADCASTER_SUBMISSION_ACTIVATION_CONFIRMATION_V1 &&
      !flags.rpc_probe &&
      !flags.service_mutation &&
      !flags.custodian_active &&
      !flags.broadcaster_active &&
      !flags.credential_read &&
      !flags.signing &&
      !flags.submit_once &&
      !flags.broadcast &&
      !flags.money;
    if (!dryRunValid) {
      return held({
        applied: apply,
        stage: "activation",
        reason: "production_private_services_operator_dry_run_boundary_invalid",
        production_activation_plan_id_sha256:
          policyState.production_activation_plan_id_sha256,
        rpc_probe_performed: flags.rpc_probe,
        service_state_mutation_performed: flags.service_mutation,
        custodian_service_active_after_return: flags.custodian_active,
        broadcaster_service_active_after_return: flags.broadcaster_active,
        credential_read_performed: flags.credential_read,
        signing_performed: flags.signing,
        submit_once_performed: flags.submit_once,
        transaction_broadcast_performed: flags.broadcast,
        money_movement_performed: flags.money,
      });
    }
    return {
      decision: {
        ok: true,
        status: "planned",
        applied: false,
        marker: VOID_BUY_VOID_PRODUCTION_PRIVATE_SERVICES_OPERATOR_V1,
        version: 1,
        production_activation_plan_id_sha256: raw.plan_id_sha256,
        runtime_policy_fingerprint_sha256: policyState.runtime_policy_fingerprint_sha256,
        rpc_url_fingerprint_sha256: raw.rpc_url_fingerprint_sha256,
        private_path_fingerprint_sha256: policyState.private_path_fingerprint_sha256,
        required_confirmation: raw.required_confirmation,
        required_plan_id_sha256: raw.required_plan_id_sha256,
        required_rpc_readiness_confirmation: raw.required_rpc_readiness_confirmation,
        required_custodian_activation_confirmation:
          raw.required_custodian_activation_confirmation,
        required_broadcaster_activation_confirmation:
          raw.required_broadcaster_activation_confirmation,
        rpc_probe_performed: false,
        service_state_mutation_performed: false,
        custodian_service_active_after_return: false,
        broadcaster_service_active_after_return: false,
        credential_read_performed: false,
        signing_performed: false,
        submit_once_performed: false,
        transaction_broadcast_performed: false,
        money_movement_performed: false,
        authority: VOID_BUY_VOID_PRODUCTION_PRIVATE_SERVICES_OPERATOR_AUTHORITY_V1,
      },
      session: null,
    };
  }

  const services = raw.services as
    | { custodian?: StoppableServiceV1; broadcaster?: StoppableServiceV1 }
    | undefined;
  const startedValid =
    apply &&
    raw.status === "started" &&
    raw.applied === true &&
    raw.marker === VOID_BUY_VOID_PRODUCTION_PRIVATE_SERVICES_ACTIVATION_V1 &&
    raw.authority === VOID_BUY_VOID_PRODUCTION_PRIVATE_SERVICES_ACTIVATION_AUTHORITY_V1 &&
    raw.plan_id_sha256 === policyState.production_activation_plan_id_sha256 &&
    raw.rpc_url_fingerprint_sha256 === policyState.rpc_url_fingerprint_sha256 &&
    raw.expected_signer_fingerprint_sha256 ===
      policyState.production_policy.broadcaster.expected_signer_fingerprint_sha256 &&
    flags.rpc_probe &&
    flags.service_mutation &&
    flags.custodian_active &&
    flags.broadcaster_active &&
    !flags.credential_read &&
    !flags.signing &&
    !flags.submit_once &&
    !flags.broadcast &&
    !flags.money &&
    typeof services?.custodian?.stop === "function" &&
    typeof services?.broadcaster?.stop === "function" &&
    typeof raw.provider_submission_id === "string" &&
    raw.provider_submission_id.length > 0;

  if (!startedValid) {
    const unexpectedLiveServiceState =
      typeof services?.custodian?.stop === "function" ||
      typeof services?.broadcaster?.stop === "function" ||
      flags.custodian_active ||
      flags.broadcaster_active;
    const cleanup = unexpectedLiveServiceState
      ? await cleanupUnexpectedActivationResult(raw)
      : {
          custodian_active: flags.custodian_active,
          broadcaster_active: flags.broadcaster_active,
        };
    return held({
      applied: apply,
      stage: "activation",
      reason: "production_private_services_operator_started_boundary_invalid",
      production_activation_plan_id_sha256:
        policyState.production_activation_plan_id_sha256,
      rpc_probe_performed: flags.rpc_probe,
      service_state_mutation_performed: flags.service_mutation,
      custodian_service_active_after_return: cleanup.custodian_active,
      broadcaster_service_active_after_return: cleanup.broadcaster_active,
      credential_read_performed: flags.credential_read,
      signing_performed: flags.signing,
      submit_once_performed: flags.submit_once,
      transaction_broadcast_performed: flags.broadcast,
      money_movement_performed: flags.money,
    });
  }

  return {
    decision: {
      ok: true,
      status: "started",
      applied: true,
      marker: VOID_BUY_VOID_PRODUCTION_PRIVATE_SERVICES_OPERATOR_V1,
      version: 1,
      production_activation_plan_id_sha256: raw.plan_id_sha256,
      runtime_policy_fingerprint_sha256: policyState.runtime_policy_fingerprint_sha256,
      rpc_url_fingerprint_sha256: raw.rpc_url_fingerprint_sha256,
      private_path_fingerprint_sha256: policyState.private_path_fingerprint_sha256,
      provider_submission_id: raw.provider_submission_id,
      rpc_probe_performed: true,
      service_state_mutation_performed: true,
      custodian_service_active_after_return: true,
      broadcaster_service_active_after_return: true,
      credential_read_performed: false,
      signing_performed: false,
      submit_once_performed: false,
      transaction_broadcast_performed: false,
      money_movement_performed: false,
      authority: VOID_BUY_VOID_PRODUCTION_PRIVATE_SERVICES_OPERATOR_AUTHORITY_V1,
    },
    session: createSession({
      custodian: services!.custodian!,
      broadcaster: services!.broadcaster!,
    }),
  };
}
