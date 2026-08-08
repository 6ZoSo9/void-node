import {
  VOID_BUY_VOID_NATIVE_CHAIN2050_BROADCASTER_V1,
  probeBuyVoidNativeChain2050BroadcasterV1,
  type BuyVoidNativeChain2050BroadcasterPolicyV1,
  type BuyVoidNativeChain2050ProbeDecisionV1,
} from "./buy_void_native_chain2050_broadcaster_v1.js";
import {
  VOID_BUY_VOID_PRODUCTION_ACTIVATION_PLAN_V1,
  createBuyVoidProductionActivationPlanV1,
  type BuyVoidProductionActivationPlanPolicyV1,
} from "./buy_void_production_activation_plan_v1.js";

export const VOID_BUY_VOID_PRODUCTION_RPC_READINESS_V1 =
  "VOID_BUY_VOID_PRODUCTION_RPC_READINESS_V1";

export const VOID_BUY_VOID_PRODUCTION_RPC_READINESS_CONFIRMATION_V1 =
  "buyVoidProbeProductionChain2050RpcReadinessV1";

export const VOID_BUY_VOID_PRODUCTION_RPC_READINESS_AUTHORITY_V1 = {
  source_only_contract: true,
  production_activation_plan_revalidated: true,
  dry_run_default: true,
  explicit_apply_required: true,
  exact_probe_confirmation_required: true,
  exact_plan_id_echo_required: true,
  read_only_rpc_probe_only: true,
  rpc_method: "eth_chainId",
  expected_chain_id: 2050,
  service_construction: false,
  custodian_service_start: false,
  broadcaster_service_start: false,
  credential_read: false,
  signing: false,
  submit_once: false,
  eth_send_raw_transaction: false,
  transaction_broadcast: false,
  inventory_mutation: false,
  public_fulfilled_projection: false,
  deployment: false,
  service_restart: false,
  money_movement: false,
  automatic_retry: false,
  production_rpc_probe_performed_by_source_merge: false,
} as const;

const SHA256 = /^[0-9a-f]{64}$/;

export type RunBuyVoidProductionRpcReadinessInputV1 = {
  policy: Readonly<BuyVoidProductionActivationPlanPolicyV1>;
  apply?: boolean;
  confirmation?: unknown;
  expected_plan_id_sha256?: unknown;
};

export type BuyVoidProductionRpcReadinessProbeV1 = (
  policy: Readonly<BuyVoidNativeChain2050BroadcasterPolicyV1>,
) => Promise<BuyVoidNativeChain2050ProbeDecisionV1>;

export type BuyVoidProductionRpcReadinessDependenciesV1 = {
  probe_chain2050?: BuyVoidProductionRpcReadinessProbeV1;
};

export type BuyVoidProductionRpcReadinessDecisionV1 =
  | {
      ok: true;
      status: "dry_run";
      applied: false;
      marker: typeof VOID_BUY_VOID_PRODUCTION_RPC_READINESS_V1;
      version: 1;
      plan_id_sha256: string;
      chain_id: "2050";
      rpc_url: string;
      rpc_url_fingerprint_sha256: string;
      required_confirmation:
        typeof VOID_BUY_VOID_PRODUCTION_RPC_READINESS_CONFIRMATION_V1;
      required_plan_id_sha256: string;
      rpc_probe_performed: false;
      service_started: false;
      credential_read_performed: false;
      signing_performed: false;
      submit_once_performed: false;
      transaction_broadcast_performed: false;
      money_movement_performed: false;
      authority: typeof VOID_BUY_VOID_PRODUCTION_RPC_READINESS_AUTHORITY_V1;
    }
  | {
      ok: true;
      status: "ready";
      applied: true;
      marker: typeof VOID_BUY_VOID_PRODUCTION_RPC_READINESS_V1;
      version: 1;
      plan_id_sha256: string;
      chain_id: "2050";
      rpc_url: string;
      rpc_url_fingerprint_sha256: string;
      provider_submission_id: string;
      rpc_probe_performed: true;
      rpc_mutation_performed: false;
      service_started: false;
      credential_read_performed: false;
      signing_performed: false;
      submit_once_performed: false;
      transaction_broadcast_performed: false;
      money_movement_performed: false;
      authority: typeof VOID_BUY_VOID_PRODUCTION_RPC_READINESS_AUTHORITY_V1;
    }
  | {
      ok: false;
      status: "held";
      applied: boolean;
      marker: typeof VOID_BUY_VOID_PRODUCTION_RPC_READINESS_V1;
      version: 1;
      reason: string;
      plan_id_sha256: string | null;
      rpc_probe_performed: boolean;
      service_started: false;
      credential_read_performed: false;
      signing_performed: false;
      submit_once_performed: false;
      transaction_broadcast_performed: false;
      money_movement_performed: false;
      authority: typeof VOID_BUY_VOID_PRODUCTION_RPC_READINESS_AUTHORITY_V1;
    };

function text(value: unknown): string {
  return String(value ?? "").trim();
}

function held(
  applied: boolean,
  reason: string,
  planId: string | null = null,
  rpcProbePerformed = false,
): Extract<BuyVoidProductionRpcReadinessDecisionV1, { ok: false }> {
  return {
    ok: false,
    status: "held",
    applied,
    marker: VOID_BUY_VOID_PRODUCTION_RPC_READINESS_V1,
    version: 1,
    reason,
    plan_id_sha256: planId,
    rpc_probe_performed: rpcProbePerformed,
    service_started: false,
    credential_read_performed: false,
    signing_performed: false,
    submit_once_performed: false,
    transaction_broadcast_performed: false,
    money_movement_performed: false,
    authority: VOID_BUY_VOID_PRODUCTION_RPC_READINESS_AUTHORITY_V1,
  };
}

export async function runBuyVoidProductionRpcReadinessV1(
  input: Readonly<RunBuyVoidProductionRpcReadinessInputV1>,
  dependencies: BuyVoidProductionRpcReadinessDependenciesV1 = {},
): Promise<BuyVoidProductionRpcReadinessDecisionV1> {
  const apply = input?.apply === true;

  if (
    apply &&
    text(input?.confirmation) !==
      VOID_BUY_VOID_PRODUCTION_RPC_READINESS_CONFIRMATION_V1
  ) {
    return held(true, "production_rpc_readiness_confirmation_required");
  }

  const plan = createBuyVoidProductionActivationPlanV1(input?.policy);
  if (!plan.ok) {
    return held(
      apply,
      `production_rpc_readiness_plan_${plan.reason}`,
    );
  }

  if (
    plan.marker !== VOID_BUY_VOID_PRODUCTION_ACTIVATION_PLAN_V1 ||
    plan.status !== "ready" ||
    plan.version !== 1 ||
    plan.expected_chain_id !== "2050" ||
    !SHA256.test(plan.plan_id_sha256) ||
    !SHA256.test(plan.rpc_url_fingerprint_sha256)
  ) {
    return held(
      apply,
      "production_rpc_readiness_plan_boundary_invalid",
      plan.plan_id_sha256,
    );
  }

  if (!apply) {
    return {
      ok: true,
      status: "dry_run",
      applied: false,
      marker: VOID_BUY_VOID_PRODUCTION_RPC_READINESS_V1,
      version: 1,
      plan_id_sha256: plan.plan_id_sha256,
      chain_id: "2050",
      rpc_url: plan.rpc_url,
      rpc_url_fingerprint_sha256: plan.rpc_url_fingerprint_sha256,
      required_confirmation:
        VOID_BUY_VOID_PRODUCTION_RPC_READINESS_CONFIRMATION_V1,
      required_plan_id_sha256: plan.plan_id_sha256,
      rpc_probe_performed: false,
      service_started: false,
      credential_read_performed: false,
      signing_performed: false,
      submit_once_performed: false,
      transaction_broadcast_performed: false,
      money_movement_performed: false,
      authority: VOID_BUY_VOID_PRODUCTION_RPC_READINESS_AUTHORITY_V1,
    };
  }

  const expectedPlanId = text(input?.expected_plan_id_sha256).toLowerCase();
  if (
    !SHA256.test(expectedPlanId) ||
    expectedPlanId !== plan.plan_id_sha256
  ) {
    return held(
      true,
      "production_rpc_readiness_plan_id_confirmation_required",
      plan.plan_id_sha256,
    );
  }

  const probe =
    dependencies.probe_chain2050 ||
    ((policy) => probeBuyVoidNativeChain2050BroadcasterV1(policy));

  let decision: BuyVoidNativeChain2050ProbeDecisionV1;
  try {
    decision = await probe({
      rpc_url: plan.rpc_url,
      expected_chain_id: 2050,
    });
  } catch {
    return held(
      true,
      "production_rpc_readiness_probe_failed",
      plan.plan_id_sha256,
      true,
    );
  }

  if (!decision.ok) {
    return held(
      true,
      `production_rpc_readiness_probe_${decision.reason}`,
      plan.plan_id_sha256,
      true,
    );
  }

  if (
    decision.marker !== VOID_BUY_VOID_NATIVE_CHAIN2050_BROADCASTER_V1 ||
    decision.version !== 1 ||
    decision.status !== "ready" ||
    decision.chain_id !== "2050" ||
    decision.mutation_performed !== false ||
    decision.rpc_url_fingerprint_sha256 !==
      plan.rpc_url_fingerprint_sha256
  ) {
    return held(
      true,
      "production_rpc_readiness_probe_boundary_invalid",
      plan.plan_id_sha256,
      true,
    );
  }

  return {
    ok: true,
    status: "ready",
    applied: true,
    marker: VOID_BUY_VOID_PRODUCTION_RPC_READINESS_V1,
    version: 1,
    plan_id_sha256: plan.plan_id_sha256,
    chain_id: "2050",
    rpc_url: plan.rpc_url,
    rpc_url_fingerprint_sha256: plan.rpc_url_fingerprint_sha256,
    provider_submission_id: decision.provider_submission_id,
    rpc_probe_performed: true,
    rpc_mutation_performed: false,
    service_started: false,
    credential_read_performed: false,
    signing_performed: false,
    submit_once_performed: false,
    transaction_broadcast_performed: false,
    money_movement_performed: false,
    authority: VOID_BUY_VOID_PRODUCTION_RPC_READINESS_AUTHORITY_V1,
  };
}
