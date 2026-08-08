import {
  VOID_BUY_VOID_PREPARED_TRANSACTION_BROADCASTER_SUBMISSION_ACTIVATION_AUTHORITY_V1,
  runBuyVoidPreparedTransactionBroadcasterSubmissionActivationV1,
  type BuyVoidPreparedTransactionBroadcasterSubmissionActivationDependenciesV1,
} from "./buy_void_prepared_transaction_broadcaster_submission_activation_v1.js";
import {
  VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODIAN_CREDENTIAL_ACTIVATION_AUTHORITY_V1,
  runBuyVoidPreparedTransactionCustodianCredentialActivationV1,
  type BuyVoidPreparedTransactionCustodianCredentialActivationDependenciesV1,
} from "./buy_void_prepared_transaction_custodian_credential_activation_v1.js";
import {
  VOID_BUY_VOID_PRODUCTION_ACTIVATION_PLAN_V1,
  createBuyVoidProductionActivationPlanV1,
  type BuyVoidProductionActivationPlanPolicyV1,
} from "./buy_void_production_activation_plan_v1.js";
import {
  VOID_BUY_VOID_PRODUCTION_RPC_READINESS_AUTHORITY_V1,
  VOID_BUY_VOID_PRODUCTION_RPC_READINESS_CONFIRMATION_V1,
  VOID_BUY_VOID_PRODUCTION_RPC_READINESS_V1,
  runBuyVoidProductionRpcReadinessV1,
  type BuyVoidProductionRpcReadinessDependenciesV1,
} from "./buy_void_production_rpc_readiness_v1.js";

export const VOID_BUY_VOID_PRODUCTION_PRIVATE_SERVICES_ACTIVATION_V1 =
  "VOID_BUY_VOID_PRODUCTION_PRIVATE_SERVICES_ACTIVATION_V1";

export const VOID_BUY_VOID_PRODUCTION_PRIVATE_SERVICES_ACTIVATION_CONFIRMATION_V1 =
  "buyVoidStartProductionPrivateServicesV1";

export const VOID_BUY_VOID_PRODUCTION_PRIVATE_SERVICES_ACTIVATION_AUTHORITY_V1 = {
  source_only_contract: true,
  automatic_start: false,
  startup_execution: false,
  background_loop: false,
  explicit_apply_required: true,
  exact_activation_confirmation_required: true,
  exact_plan_id_echo_required: true,
  production_activation_plan_revalidated: true,
  production_rpc_readiness_required: true,
  read_only_rpc_probe_before_service_start: true,
  custodian_started_before_broadcaster: true,
  custodian_rollback_on_broadcaster_failure: true,
  broadcaster_rollback_on_boundary_failure: true,
  filesystem_private_service_state_mutation_when_applied: true,
  private_prepare_signing_capability_after_success: true,
  private_submission_capability_after_success: true,
  credential_read_during_activation: false,
  signing_during_activation: false,
  submit_once_during_activation: false,
  eth_send_raw_transaction_during_activation: false,
  transaction_broadcast_during_activation: false,
  inventory_mutation_during_activation: false,
  public_fulfilled_projection_during_activation: false,
  money_movement_during_activation: false,
  automatic_retry: false,
  live_apply_performed_by_source_merge: false,
} as const;

const SHA256 = /^[0-9a-f]{64}$/;

type StoppablePrivateServiceV1 = {
  stop: () => Promise<void>;
};

export type RunBuyVoidProductionPrivateServicesActivationInputV1 = {
  policy: Readonly<BuyVoidProductionActivationPlanPolicyV1>;
  apply?: boolean;
  confirmation?: unknown;
  expected_plan_id_sha256?: unknown;
};

export type BuyVoidProductionPrivateServicesActivationDependenciesV1 = {
  run_rpc_readiness?: typeof runBuyVoidProductionRpcReadinessV1;
  rpc_readiness_dependencies?: BuyVoidProductionRpcReadinessDependenciesV1;
  run_custodian_activation?:
    typeof runBuyVoidPreparedTransactionCustodianCredentialActivationV1;
  custodian_activation_dependencies?:
    BuyVoidPreparedTransactionCustodianCredentialActivationDependenciesV1;
  run_broadcaster_activation?:
    typeof runBuyVoidPreparedTransactionBroadcasterSubmissionActivationV1;
  broadcaster_activation_dependencies?:
    BuyVoidPreparedTransactionBroadcasterSubmissionActivationDependenciesV1;
};

export type BuyVoidProductionPrivateServicesActivationDecisionV1 =
  | {
      ok: true;
      status: "dry_run";
      applied: false;
      marker: typeof VOID_BUY_VOID_PRODUCTION_PRIVATE_SERVICES_ACTIVATION_V1;
      version: 1;
      plan_id_sha256: string;
      rpc_url_fingerprint_sha256: string;
      expected_signer_fingerprint_sha256: string;
      required_confirmation:
        typeof VOID_BUY_VOID_PRODUCTION_PRIVATE_SERVICES_ACTIVATION_CONFIRMATION_V1;
      required_plan_id_sha256: string;
      rpc_probe_performed: false;
      custodian_service_start_performed: false;
      broadcaster_service_start_performed: false;
      custodian_service_active_after_return: false;
      broadcaster_service_active_after_return: false;
      custodian_rollback_attempted: false;
      custodian_rollback_succeeded: null;
      broadcaster_rollback_attempted: false;
      broadcaster_rollback_succeeded: null;
      credential_read_performed: false;
      signing_performed: false;
      submit_once_performed: false;
      transaction_broadcast_performed: false;
      money_movement_performed: false;
      authority:
        typeof VOID_BUY_VOID_PRODUCTION_PRIVATE_SERVICES_ACTIVATION_AUTHORITY_V1;
    }
  | {
      ok: true;
      status: "started";
      applied: true;
      marker: typeof VOID_BUY_VOID_PRODUCTION_PRIVATE_SERVICES_ACTIVATION_V1;
      version: 1;
      plan_id_sha256: string;
      rpc_url_fingerprint_sha256: string;
      expected_signer_fingerprint_sha256: string;
      provider_submission_id: string;
      rpc_probe_performed: true;
      custodian_service_start_performed: true;
      broadcaster_service_start_performed: true;
      custodian_service_active_after_return: true;
      broadcaster_service_active_after_return: true;
      custodian_rollback_attempted: false;
      custodian_rollback_succeeded: null;
      broadcaster_rollback_attempted: false;
      broadcaster_rollback_succeeded: null;
      credential_read_performed: false;
      signing_performed: false;
      submit_once_performed: false;
      transaction_broadcast_performed: false;
      money_movement_performed: false;
      services: {
        custodian: StoppablePrivateServiceV1;
        broadcaster: StoppablePrivateServiceV1;
      };
      authority:
        typeof VOID_BUY_VOID_PRODUCTION_PRIVATE_SERVICES_ACTIVATION_AUTHORITY_V1;
    }
  | {
      ok: false;
      status: "held";
      applied: boolean;
      marker: typeof VOID_BUY_VOID_PRODUCTION_PRIVATE_SERVICES_ACTIVATION_V1;
      version: 1;
      reason: string;
      plan_id_sha256: string | null;
      rpc_probe_performed: boolean;
      custodian_service_start_performed: boolean;
      broadcaster_service_start_performed: boolean;
      custodian_service_active_after_return: boolean;
      broadcaster_service_active_after_return: boolean;
      custodian_rollback_attempted: boolean;
      custodian_rollback_succeeded: boolean | null;
      broadcaster_rollback_attempted: boolean;
      broadcaster_rollback_succeeded: boolean | null;
      credential_read_performed: false;
      signing_performed: false;
      submit_once_performed: false;
      transaction_broadcast_performed: false;
      money_movement_performed: false;
      authority:
        typeof VOID_BUY_VOID_PRODUCTION_PRIVATE_SERVICES_ACTIVATION_AUTHORITY_V1;
    };

type HeldInputV1 = {
  applied: boolean;
  reason: string;
  plan_id_sha256?: string | null;
  rpc_probe_performed?: boolean;
  custodian_service_start_performed?: boolean;
  broadcaster_service_start_performed?: boolean;
  custodian_rollback_succeeded?: boolean | null;
  broadcaster_rollback_succeeded?: boolean | null;
};

function held(
  input: Readonly<HeldInputV1>,
): Extract<BuyVoidProductionPrivateServicesActivationDecisionV1, { ok: false }> {
  const custodianStarted = input.custodian_service_start_performed === true;
  const broadcasterStarted = input.broadcaster_service_start_performed === true;
  const custodianRollback = input.custodian_rollback_succeeded ?? null;
  const broadcasterRollback = input.broadcaster_rollback_succeeded ?? null;

  return {
    ok: false,
    status: "held",
    applied: input.applied,
    marker: VOID_BUY_VOID_PRODUCTION_PRIVATE_SERVICES_ACTIVATION_V1,
    version: 1,
    reason: input.reason,
    plan_id_sha256: input.plan_id_sha256 ?? null,
    rpc_probe_performed: input.rpc_probe_performed === true,
    custodian_service_start_performed: custodianStarted,
    broadcaster_service_start_performed: broadcasterStarted,
    custodian_service_active_after_return:
      custodianStarted && custodianRollback !== true,
    broadcaster_service_active_after_return:
      broadcasterStarted && broadcasterRollback !== true,
    custodian_rollback_attempted: custodianRollback !== null,
    custodian_rollback_succeeded: custodianRollback,
    broadcaster_rollback_attempted: broadcasterRollback !== null,
    broadcaster_rollback_succeeded: broadcasterRollback,
    credential_read_performed: false,
    signing_performed: false,
    submit_once_performed: false,
    transaction_broadcast_performed: false,
    money_movement_performed: false,
    authority: VOID_BUY_VOID_PRODUCTION_PRIVATE_SERVICES_ACTIVATION_AUTHORITY_V1,
  };
}

async function stopService(service: StoppablePrivateServiceV1): Promise<boolean> {
  try {
    await service.stop();
    return true;
  } catch {
    return false;
  }
}

export async function runBuyVoidProductionPrivateServicesActivationV1(
  input: Readonly<RunBuyVoidProductionPrivateServicesActivationInputV1>,
  dependencies: BuyVoidProductionPrivateServicesActivationDependenciesV1 = {},
): Promise<BuyVoidProductionPrivateServicesActivationDecisionV1> {
  const apply = input?.apply === true;

  if (
    apply &&
    input?.confirmation !==
      VOID_BUY_VOID_PRODUCTION_PRIVATE_SERVICES_ACTIVATION_CONFIRMATION_V1
  ) {
    return held({
      applied: true,
      reason: "production_private_services_activation_confirmation_required",
    });
  }

  const plan = createBuyVoidProductionActivationPlanV1(input?.policy);
  if (plan.ok === false) {
    return held({
      applied: apply,
      reason: `production_private_services_activation_plan_${plan.reason}`,
    });
  }

  if (
    plan.marker !== VOID_BUY_VOID_PRODUCTION_ACTIVATION_PLAN_V1 ||
    plan.status !== "ready" ||
    plan.version !== 1 ||
    plan.expected_chain_id !== "2050" ||
    !SHA256.test(plan.plan_id_sha256) ||
    !SHA256.test(plan.rpc_url_fingerprint_sha256) ||
    !SHA256.test(plan.expected_signer_fingerprint_sha256)
  ) {
    return held({
      applied: apply,
      reason: "production_private_services_activation_plan_boundary_invalid",
      plan_id_sha256: plan.plan_id_sha256,
    });
  }

  if (!apply) {
    return {
      ok: true,
      status: "dry_run",
      applied: false,
      marker: VOID_BUY_VOID_PRODUCTION_PRIVATE_SERVICES_ACTIVATION_V1,
      version: 1,
      plan_id_sha256: plan.plan_id_sha256,
      rpc_url_fingerprint_sha256: plan.rpc_url_fingerprint_sha256,
      expected_signer_fingerprint_sha256:
        plan.expected_signer_fingerprint_sha256,
      required_confirmation:
        VOID_BUY_VOID_PRODUCTION_PRIVATE_SERVICES_ACTIVATION_CONFIRMATION_V1,
      required_plan_id_sha256: plan.plan_id_sha256,
      rpc_probe_performed: false,
      custodian_service_start_performed: false,
      broadcaster_service_start_performed: false,
      custodian_service_active_after_return: false,
      broadcaster_service_active_after_return: false,
      custodian_rollback_attempted: false,
      custodian_rollback_succeeded: null,
      broadcaster_rollback_attempted: false,
      broadcaster_rollback_succeeded: null,
      credential_read_performed: false,
      signing_performed: false,
      submit_once_performed: false,
      transaction_broadcast_performed: false,
      money_movement_performed: false,
      authority: VOID_BUY_VOID_PRODUCTION_PRIVATE_SERVICES_ACTIVATION_AUTHORITY_V1,
    };
  }

  const expectedPlanId = input?.expected_plan_id_sha256;
  if (
    typeof expectedPlanId !== "string" ||
    !SHA256.test(expectedPlanId) ||
    expectedPlanId !== plan.plan_id_sha256
  ) {
    return held({
      applied: true,
      reason: "production_private_services_activation_plan_id_confirmation_required",
      plan_id_sha256: plan.plan_id_sha256,
    });
  }

  const runReadiness =
    dependencies.run_rpc_readiness || runBuyVoidProductionRpcReadinessV1;

  let readiness;
  try {
    readiness = await runReadiness(
      {
        policy: input.policy,
        apply: true,
        confirmation: VOID_BUY_VOID_PRODUCTION_RPC_READINESS_CONFIRMATION_V1,
        expected_plan_id_sha256: plan.plan_id_sha256,
      },
      dependencies.rpc_readiness_dependencies,
    );
  } catch {
    return held({
      applied: true,
      reason: "production_private_services_activation_rpc_readiness_failed",
      plan_id_sha256: plan.plan_id_sha256,
    });
  }

  if (readiness.ok === false) {
    return held({
      applied: true,
      reason: `production_private_services_activation_rpc_${readiness.reason}`,
      plan_id_sha256: plan.plan_id_sha256,
      rpc_probe_performed: readiness.rpc_probe_performed,
    });
  }

  if (
    readiness.marker !== VOID_BUY_VOID_PRODUCTION_RPC_READINESS_V1 ||
    readiness.status !== "ready" ||
    readiness.applied !== true ||
    readiness.plan_id_sha256 !== plan.plan_id_sha256 ||
    readiness.rpc_url_fingerprint_sha256 !== plan.rpc_url_fingerprint_sha256 ||
    readiness.rpc_probe_performed !== true ||
    readiness.rpc_mutation_performed !== false ||
    readiness.service_started !== false ||
    readiness.credential_read_performed !== false ||
    readiness.signing_performed !== false ||
    readiness.submit_once_performed !== false ||
    readiness.transaction_broadcast_performed !== false ||
    readiness.money_movement_performed !== false ||
    readiness.authority !== VOID_BUY_VOID_PRODUCTION_RPC_READINESS_AUTHORITY_V1
  ) {
    return held({
      applied: true,
      reason: "production_private_services_activation_rpc_boundary_invalid",
      plan_id_sha256: plan.plan_id_sha256,
      rpc_probe_performed: true,
    });
  }

  const runCustodian =
    dependencies.run_custodian_activation ||
    runBuyVoidPreparedTransactionCustodianCredentialActivationV1;

  let custodian;
  try {
    custodian = await runCustodian(
      {
        policy: input.policy.custodian,
        apply: true,
        confirmation: plan.required_custodian_activation_confirmation,
      },
      dependencies.custodian_activation_dependencies,
    );
  } catch {
    return held({
      applied: true,
      reason: "production_private_services_activation_custodian_failed",
      plan_id_sha256: plan.plan_id_sha256,
      rpc_probe_performed: true,
    });
  }

  if (custodian.ok === false) {
    return held({
      applied: true,
      reason: `production_private_services_activation_${custodian.reason}`,
      plan_id_sha256: plan.plan_id_sha256,
      rpc_probe_performed: true,
    });
  }

  if (custodian.status !== "started") {
    return held({
      applied: true,
      reason: "production_private_services_activation_custodian_not_started",
      plan_id_sha256: plan.plan_id_sha256,
      rpc_probe_performed: true,
    });
  }

  if (
    custodian.applied !== true ||
    custodian.service_started !== true ||
    custodian.private_prepare_signing_capability_started !== true ||
    custodian.signer_fingerprint_sha256 !==
      plan.expected_signer_fingerprint_sha256 ||
    custodian.credential_read_performed !== false ||
    custodian.signing_performed !== false ||
    custodian.rpc_call_performed !== false ||
    custodian.transaction_broadcast_performed !== false ||
    custodian.money_movement_performed !== false ||
    custodian.authority !==
      VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODIAN_CREDENTIAL_ACTIVATION_AUTHORITY_V1
  ) {
    const custodianRollback = await stopService(custodian.service);
    return held({
      applied: true,
      reason: custodianRollback
        ? "production_private_services_activation_custodian_boundary_invalid_rolled_back"
        : "production_private_services_activation_custodian_boundary_invalid_rollback_failed",
      plan_id_sha256: plan.plan_id_sha256,
      rpc_probe_performed: true,
      custodian_service_start_performed: true,
      custodian_rollback_succeeded: custodianRollback,
    });
  }

  const runBroadcaster =
    dependencies.run_broadcaster_activation ||
    runBuyVoidPreparedTransactionBroadcasterSubmissionActivationV1;

  let broadcaster;
  try {
    broadcaster = await runBroadcaster(
      {
        policy: input.policy.broadcaster,
        apply: true,
        confirmation: plan.required_broadcaster_activation_confirmation,
      },
      dependencies.broadcaster_activation_dependencies,
    );
  } catch {
    const custodianRollback = await stopService(custodian.service);
    return held({
      applied: true,
      reason: custodianRollback
        ? "production_private_services_activation_broadcaster_failed_custodian_rolled_back"
        : "production_private_services_activation_broadcaster_failed_custodian_rollback_failed",
      plan_id_sha256: plan.plan_id_sha256,
      rpc_probe_performed: true,
      custodian_service_start_performed: true,
      custodian_rollback_succeeded: custodianRollback,
    });
  }

  if (broadcaster.ok === false) {
    const custodianRollback = await stopService(custodian.service);
    return held({
      applied: true,
      reason: custodianRollback
        ? `production_private_services_activation_${broadcaster.reason}_custodian_rolled_back`
        : `production_private_services_activation_${broadcaster.reason}_custodian_rollback_failed`,
      plan_id_sha256: plan.plan_id_sha256,
      rpc_probe_performed: true,
      custodian_service_start_performed: true,
      custodian_rollback_succeeded: custodianRollback,
    });
  }

  if (broadcaster.status !== "started") {
    const custodianRollback = await stopService(custodian.service);
    return held({
      applied: true,
      reason: custodianRollback
        ? "production_private_services_activation_broadcaster_not_started_custodian_rolled_back"
        : "production_private_services_activation_broadcaster_not_started_custodian_rollback_failed",
      plan_id_sha256: plan.plan_id_sha256,
      rpc_probe_performed: true,
      custodian_service_start_performed: true,
      custodian_rollback_succeeded: custodianRollback,
    });
  }

  if (
    broadcaster.applied !== true ||
    broadcaster.service_started !== true ||
    broadcaster.chain_id !== "2050" ||
    broadcaster.rpc_url_fingerprint_sha256 !==
      plan.rpc_url_fingerprint_sha256 ||
    broadcaster.submission_enabled !== true ||
    broadcaster.submit_once_allowed !== true ||
    broadcaster.inspection_submission_supported !== true ||
    broadcaster.transaction_broadcast_performed !== false ||
    broadcaster.money_movement_performed !== false ||
    broadcaster.authority !==
      VOID_BUY_VOID_PREPARED_TRANSACTION_BROADCASTER_SUBMISSION_ACTIVATION_AUTHORITY_V1
  ) {
    const broadcasterRollback = await stopService(broadcaster.service);
    const custodianRollback = await stopService(custodian.service);
    const rollbackSucceeded = broadcasterRollback && custodianRollback;
    return held({
      applied: true,
      reason: rollbackSucceeded
        ? "production_private_services_activation_broadcaster_boundary_invalid_rolled_back"
        : "production_private_services_activation_broadcaster_boundary_invalid_rollback_failed",
      plan_id_sha256: plan.plan_id_sha256,
      rpc_probe_performed: true,
      custodian_service_start_performed: true,
      broadcaster_service_start_performed: true,
      custodian_rollback_succeeded: custodianRollback,
      broadcaster_rollback_succeeded: broadcasterRollback,
    });
  }

  return {
    ok: true,
    status: "started",
    applied: true,
    marker: VOID_BUY_VOID_PRODUCTION_PRIVATE_SERVICES_ACTIVATION_V1,
    version: 1,
    plan_id_sha256: plan.plan_id_sha256,
    rpc_url_fingerprint_sha256: plan.rpc_url_fingerprint_sha256,
    expected_signer_fingerprint_sha256:
      plan.expected_signer_fingerprint_sha256,
    provider_submission_id: readiness.provider_submission_id,
    rpc_probe_performed: true,
    custodian_service_start_performed: true,
    broadcaster_service_start_performed: true,
    custodian_service_active_after_return: true,
    broadcaster_service_active_after_return: true,
    custodian_rollback_attempted: false,
    custodian_rollback_succeeded: null,
    broadcaster_rollback_attempted: false,
    broadcaster_rollback_succeeded: null,
    credential_read_performed: false,
    signing_performed: false,
    submit_once_performed: false,
    transaction_broadcast_performed: false,
    money_movement_performed: false,
    services: {
      custodian: custodian.service,
      broadcaster: broadcaster.service,
    },
    authority: VOID_BUY_VOID_PRODUCTION_PRIVATE_SERVICES_ACTIVATION_AUTHORITY_V1,
  };
}
