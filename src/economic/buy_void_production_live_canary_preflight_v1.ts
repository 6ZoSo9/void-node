import crypto from "node:crypto";
import path from "node:path";

import {
  VOID_BUY_VOID_NATIVE_EXECUTION_CONFIRMATION_V1,
} from "./buy_void_native_execution_worker_v1.js";
import {
  VOID_BUY_VOID_NATIVE_EXECUTION_RUNTIME_V1,
  runBuyVoidNativeExecutionRuntimeCommandV1,
  type BuyVoidNativeExecutionRuntimeDecisionV1,
  type BuyVoidNativeExecutionRuntimePolicyV1,
} from "./buy_void_native_execution_runtime_v1.js";
import type {
  BuyVoidNativeExecutionPlannerTransportV1,
} from "./buy_void_native_execution_nonce_fee_planner_v1.js";
import {
  VOID_BUY_VOID_PRODUCTION_ACTIVATION_PLAN_V1,
  createBuyVoidProductionActivationPlanV1,
  type BuyVoidProductionActivationPlanPolicyV1,
} from "./buy_void_production_activation_plan_v1.js";
import {
  VOID_BUY_VOID_PRODUCTION_PRIVATE_SERVICES_ACTIVATION_CONFIRMATION_V1,
} from "./buy_void_production_private_services_activation_v1.js";

export const VOID_BUY_VOID_PRODUCTION_LIVE_CANARY_PREFLIGHT_V1 =
  "VOID_BUY_VOID_PRODUCTION_LIVE_CANARY_PREFLIGHT_V1";

export const VOID_BUY_VOID_PRODUCTION_LIVE_CANARY_PREFLIGHT_CONFIRMATION_V1 =
  "buyVoidInspectProductionLiveCanaryPreflightV1";

export const VOID_BUY_VOID_PRODUCTION_LIVE_CANARY_PREFLIGHT_AUTHORITY_V1 = {
  source_only_contract: true,
  default_plan_is_io_free: true,
  explicit_inspect_required_for_journal_or_rpc_io: true,
  exact_preflight_confirmation_required: true,
  exact_production_activation_plan_id_echo_required: true,
  exact_preflight_plan_id_echo_required: true,
  exact_attempt_id_required: true,
  one_execution_attempt_per_preflight: true,
  production_activation_plan_revalidated: true,
  native_execution_runtime_must_remain_disabled: true,
  production_wallet_binding_required: true,
  production_chain_2050_binding_required: true,
  production_rpc_binding_required: true,
  one_attempt_execution_policy_required: true,
  plan_derived_runtime_policy_snapshot_required: true,
  plan_derived_runtime_policy_snapshot_frozen: true,
  caller_runtime_policy_reused_after_snapshot: false,
  native_execution_dry_run_only: true,
  native_execution_apply: false,
  signer_dependencies_supplied: false,
  broadcaster_dependencies_supplied: false,
  service_start: false,
  credential_read_authorized: false,
  signing_authorized: false,
  transaction_submission_authorized: false,
  transaction_broadcast_authorized: false,
  inventory_mutation_authorized: false,
  public_fulfilled_projection_authorized: false,
  money_movement_authorized: false,
  automatic_retry: false,
  background_loop: false,
  startup_execution: false,
  live_canary_authorized_by_preflight: false,
} as const;

const SHA256 = /^[0-9a-f]{64}$/;
const SAFE_CODE = /^[A-Za-z0-9._:-]{1,160}$/;

export type RunBuyVoidProductionLiveCanaryPreflightInputV1 = {
  production_policy: Readonly<BuyVoidProductionActivationPlanPolicyV1>;
  execution_runtime_policy: Readonly<BuyVoidNativeExecutionRuntimePolicyV1>;
  attempt_id: unknown;
  inspect?: boolean;
  confirmation?: unknown;
  expected_production_activation_plan_id_sha256?: unknown;
  expected_preflight_plan_id_sha256?: unknown;
};

export type BuyVoidProductionLiveCanaryPreflightDependenciesV1 = {
  run_native_execution_runtime?: typeof runBuyVoidNativeExecutionRuntimeCommandV1;
  planner_transport?: BuyVoidNativeExecutionPlannerTransportV1;
};

export type BuyVoidProductionLiveCanaryPreflightDecisionV1 =
  | {
      ok: true;
      status: "planned";
      inspected: false;
      marker: typeof VOID_BUY_VOID_PRODUCTION_LIVE_CANARY_PREFLIGHT_V1;
      version: 1;
      attempt_id: string;
      production_activation_plan_id_sha256: string;
      runtime_policy_fingerprint_sha256: string;
      preflight_plan_id_sha256: string;
      required_confirmation:
        typeof VOID_BUY_VOID_PRODUCTION_LIVE_CANARY_PREFLIGHT_CONFIRMATION_V1;
      required_production_activation_plan_id_sha256: string;
      required_preflight_plan_id_sha256: string;
      required_private_services_activation_confirmation:
        typeof VOID_BUY_VOID_PRODUCTION_PRIVATE_SERVICES_ACTIVATION_CONFIRMATION_V1;
      required_native_execution_confirmation:
        typeof VOID_BUY_VOID_NATIVE_EXECUTION_CONFIRMATION_V1;
      native_execution_dry_run_invoked: false;
      mutation_performed: false;
      signing_performed: false;
      transaction_broadcast_performed: false;
      money_movement_performed: false;
      authority:
        typeof VOID_BUY_VOID_PRODUCTION_LIVE_CANARY_PREFLIGHT_AUTHORITY_V1;
    }
  | {
      ok: true;
      status: "inspected";
      inspected: true;
      marker: typeof VOID_BUY_VOID_PRODUCTION_LIVE_CANARY_PREFLIGHT_V1;
      version: 1;
      attempt_id: string;
      production_activation_plan_id_sha256: string;
      runtime_policy_fingerprint_sha256: string;
      preflight_plan_id_sha256: string;
      evidence_id_sha256: string;
      native_execution_dry_run_invoked: true;
      execution_dry_run: BuyVoidNativeExecutionRuntimeDecisionV1 & {
        ok: true;
        status: "dry_run";
      };
      required_private_services_activation_confirmation:
        typeof VOID_BUY_VOID_PRODUCTION_PRIVATE_SERVICES_ACTIVATION_CONFIRMATION_V1;
      required_native_execution_confirmation:
        typeof VOID_BUY_VOID_NATIVE_EXECUTION_CONFIRMATION_V1;
      mutation_performed: false;
      signing_performed: false;
      transaction_broadcast_performed: false;
      money_movement_performed: false;
      authority:
        typeof VOID_BUY_VOID_PRODUCTION_LIVE_CANARY_PREFLIGHT_AUTHORITY_V1;
    }
  | {
      ok: false;
      status: "held";
      inspected: boolean;
      marker: typeof VOID_BUY_VOID_PRODUCTION_LIVE_CANARY_PREFLIGHT_V1;
      version: 1;
      reason: string;
      attempt_id: string | null;
      production_activation_plan_id_sha256: string | null;
      preflight_plan_id_sha256: string | null;
      native_execution_dry_run_invoked: boolean;
      mutation_performed: boolean;
      signing_performed: boolean;
      transaction_broadcast_performed: boolean;
      money_movement_performed: boolean;
      authority:
        typeof VOID_BUY_VOID_PRODUCTION_LIVE_CANARY_PREFLIGHT_AUTHORITY_V1;
    };

type HeldInputV1 = {
  inspected: boolean;
  reason: string;
  attempt_id?: string | null;
  production_activation_plan_id_sha256?: string | null;
  preflight_plan_id_sha256?: string | null;
  native_execution_dry_run_invoked?: boolean;
  mutation_performed?: boolean;
  signing_performed?: boolean;
  transaction_broadcast_performed?: boolean;
};

type ReadyProductionPlanViewV1 = {
  marker: typeof VOID_BUY_VOID_PRODUCTION_ACTIVATION_PLAN_V1;
  status: "ready";
  version: 1;
  plan_id_sha256: string;
  expected_chain_id: string;
  expected_wallet_address: string;
  rpc_url: string;
  rpc_url_fingerprint_sha256: string;
};

function sha256Hex(value: string): string {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function exact(value: unknown, expected: string): boolean {
  return typeof value === "string" && value === expected;
}

function canonicalJson(value: unknown): string {
  const visit = (candidate: unknown): unknown => {
    if (typeof candidate === "bigint") return candidate.toString();
    if (Array.isArray(candidate)) return candidate.map(visit);
    if (candidate && typeof candidate === "object") {
      return Object.fromEntries(
        Object.entries(candidate as Record<string, unknown>)
          .sort(([left], [right]) => left.localeCompare(right))
          .map(([key, nested]) => [key, visit(nested)]),
      );
    }
    return candidate;
  };
  return JSON.stringify(visit(value));
}

function deepFreeze<T>(value: T): T {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) {
    return value;
  }
  for (const nested of Object.values(value as Record<string, unknown>)) {
    deepFreeze(nested);
  }
  return Object.freeze(value);
}

function held(input: Readonly<HeldInputV1>):
  Extract<BuyVoidProductionLiveCanaryPreflightDecisionV1, { ok: false }> {
  const mutation = input.mutation_performed === true;
  const signing = input.signing_performed === true;
  const broadcast = input.transaction_broadcast_performed === true;
  return {
    ok: false,
    status: "held",
    inspected: input.inspected,
    marker: VOID_BUY_VOID_PRODUCTION_LIVE_CANARY_PREFLIGHT_V1,
    version: 1,
    reason: input.reason,
    attempt_id: input.attempt_id ?? null,
    production_activation_plan_id_sha256:
      input.production_activation_plan_id_sha256 ?? null,
    preflight_plan_id_sha256: input.preflight_plan_id_sha256 ?? null,
    native_execution_dry_run_invoked:
      input.native_execution_dry_run_invoked === true,
    mutation_performed: mutation,
    signing_performed: signing,
    transaction_broadcast_performed: broadcast,
    money_movement_performed: mutation || signing || broadcast,
    authority: VOID_BUY_VOID_PRODUCTION_LIVE_CANARY_PREFLIGHT_AUTHORITY_V1,
  };
}

function runtimeBindingReason(
  plan: Readonly<ReadyProductionPlanViewV1>,
  runtime: Readonly<BuyVoidNativeExecutionRuntimePolicyV1> | undefined,
): string | null {
  if (!runtime) return "production_live_canary_preflight_runtime_policy_required";
  if (runtime.enabled !== false) {
    return "production_live_canary_preflight_runtime_must_be_disabled";
  }

  const root = String(runtime.root_dir || "");
  if (!path.isAbsolute(root) || path.normalize(root) === path.parse(root).root) {
    return "production_live_canary_preflight_runtime_root_invalid";
  }

  const worker = runtime.worker_policy;
  const execution = runtime.execution_policy;
  const planner = runtime.planner_policy;
  if (!worker || !execution || !planner) {
    return "production_live_canary_preflight_runtime_policy_invalid";
  }
  if (
    worker.enabled !== true ||
    worker.asset_mode !== "native_void" ||
    String(worker.chain_id) !== "2050" ||
    !SAFE_CODE.test(String(worker.pool_id || ""))
  ) {
    return "production_live_canary_preflight_worker_policy_invalid";
  }
  if (
    String(worker.fulfillment_wallet_address || "").toLowerCase() !==
      plan.expected_wallet_address ||
    String(planner.fulfillment_wallet_address || "").toLowerCase() !==
      plan.expected_wallet_address
  ) {
    return "production_live_canary_preflight_wallet_binding_mismatch";
  }
  if (
    execution.attempt_journal_enabled !== true ||
    Number(execution.max_attempts_per_payment) !== 1 ||
    String(execution.chain_id) !== "2050" ||
    !Array.isArray(execution.fulfillment_wallet_allowlist) ||
    execution.fulfillment_wallet_allowlist.length !== 1 ||
    String(execution.fulfillment_wallet_allowlist[0] || "").toLowerCase() !==
      plan.expected_wallet_address
  ) {
    return "production_live_canary_preflight_execution_policy_invalid";
  }
  if (
    String(planner.expected_chain_id) !== "2050" ||
    String(plan.expected_chain_id) !== "2050"
  ) {
    return "production_live_canary_preflight_chain_binding_mismatch";
  }
  if (String(planner.rpc_url || "") !== plan.rpc_url) {
    return "production_live_canary_preflight_rpc_binding_mismatch";
  }
  return null;
}

function runtimePolicyFingerprint(
  plan: Readonly<ReadyProductionPlanViewV1>,
  runtime: Readonly<BuyVoidNativeExecutionRuntimePolicyV1>,
): string {
  return sha256Hex([
    "void-buy-production-live-canary-runtime-policy-v1",
    `root_dir=${path.normalize(runtime.root_dir)}`,
    `pool_id=${runtime.worker_policy.pool_id}`,
    `fulfillment_wallet_address=${plan.expected_wallet_address}`,
    `worker_max_void_amount_units=${runtime.worker_policy.max_void_amount_units}`,
    `worker_max_gas_limit=${runtime.worker_policy.max_gas_limit}`,
    `worker_max_fee_per_gas_wei=${runtime.worker_policy.max_fee_per_gas_wei}`,
    `worker_max_priority_fee_per_gas_wei=${runtime.worker_policy.max_priority_fee_per_gas_wei}`,
    `planner_gas_limit=${runtime.planner_policy.gas_limit}`,
    `planner_max_gas_limit=${runtime.planner_policy.max_gas_limit}`,
    `planner_max_fee_per_gas_wei=${runtime.planner_policy.max_fee_per_gas_wei}`,
    `planner_max_priority_fee_per_gas_wei=${runtime.planner_policy.max_priority_fee_per_gas_wei}`,
    `planner_fee_multiplier_bps=${runtime.planner_policy.fee_multiplier_bps}`,
    `rpc_url_fingerprint_sha256=${plan.rpc_url_fingerprint_sha256}`,
  ].join("\n"));
}

function snapshotRuntimePolicy(
  runtime: Readonly<BuyVoidNativeExecutionRuntimePolicyV1>,
): BuyVoidNativeExecutionRuntimePolicyV1 {
  return deepFreeze({
    enabled: false,
    root_dir: path.normalize(runtime.root_dir),
    worker_policy: {
      enabled: true,
      asset_mode: "native_void",
      chain_id: "2050",
      pool_id: runtime.worker_policy.pool_id,
      fulfillment_wallet_address:
        runtime.worker_policy.fulfillment_wallet_address.toLowerCase(),
      max_void_amount_units: runtime.worker_policy.max_void_amount_units,
      max_gas_limit: runtime.worker_policy.max_gas_limit,
      max_fee_per_gas_wei: runtime.worker_policy.max_fee_per_gas_wei,
      max_priority_fee_per_gas_wei:
        runtime.worker_policy.max_priority_fee_per_gas_wei,
    },
    execution_policy: {
      attempt_journal_enabled: true,
      max_attempts_per_payment: 1,
      chain_id: "2050",
      fulfillment_wallet_allowlist: [
        String(runtime.execution_policy.fulfillment_wallet_allowlist[0]).toLowerCase(),
      ],
    },
    planner_policy: {
      rpc_url: runtime.planner_policy.rpc_url,
      expected_chain_id: "2050",
      fulfillment_wallet_address:
        runtime.planner_policy.fulfillment_wallet_address.toLowerCase(),
      gas_limit: runtime.planner_policy.gas_limit,
      max_gas_limit: runtime.planner_policy.max_gas_limit,
      max_fee_per_gas_wei: runtime.planner_policy.max_fee_per_gas_wei,
      max_priority_fee_per_gas_wei:
        runtime.planner_policy.max_priority_fee_per_gas_wei,
      fee_multiplier_bps: runtime.planner_policy.fee_multiplier_bps,
    },
  });
}

export async function runBuyVoidProductionLiveCanaryPreflightV1(
  input: Readonly<RunBuyVoidProductionLiveCanaryPreflightInputV1>,
  dependencies: BuyVoidProductionLiveCanaryPreflightDependenciesV1 = {},
): Promise<BuyVoidProductionLiveCanaryPreflightDecisionV1> {
  const inspect = input?.inspect === true;
  const attemptId = input?.attempt_id;
  if (typeof attemptId !== "string" || !SHA256.test(attemptId)) {
    return held({
      inspected: inspect,
      reason: "production_live_canary_preflight_exact_attempt_id_required",
    });
  }

  if (
    inspect &&
    !exact(
      input?.confirmation,
      VOID_BUY_VOID_PRODUCTION_LIVE_CANARY_PREFLIGHT_CONFIRMATION_V1,
    )
  ) {
    return held({
      inspected: true,
      reason: "production_live_canary_preflight_confirmation_required",
      attempt_id: attemptId,
    });
  }

  const productionPlan = createBuyVoidProductionActivationPlanV1(
    input?.production_policy,
  );
  if (productionPlan.ok === false) {
    return held({
      inspected: inspect,
      reason: `production_live_canary_preflight_activation_plan_${productionPlan.reason}`,
      attempt_id: attemptId,
    });
  }
  if (
    productionPlan.marker !== VOID_BUY_VOID_PRODUCTION_ACTIVATION_PLAN_V1 ||
    productionPlan.status !== "ready" ||
    productionPlan.version !== 1 ||
    String(productionPlan.expected_chain_id) !== "2050" ||
    !SHA256.test(productionPlan.plan_id_sha256) ||
    !SHA256.test(productionPlan.rpc_url_fingerprint_sha256)
  ) {
    return held({
      inspected: inspect,
      reason: "production_live_canary_preflight_activation_plan_boundary_invalid",
      attempt_id: attemptId,
      production_activation_plan_id_sha256: productionPlan.plan_id_sha256,
    });
  }

  const bindingReason = runtimeBindingReason(
    productionPlan,
    input?.execution_runtime_policy,
  );
  if (bindingReason) {
    return held({
      inspected: inspect,
      reason: bindingReason,
      attempt_id: attemptId,
      production_activation_plan_id_sha256: productionPlan.plan_id_sha256,
    });
  }

  const runtimePolicy = input.execution_runtime_policy;
  const runtimeFingerprint = runtimePolicyFingerprint(
    productionPlan,
    runtimePolicy,
  );
  const preflightPlanId = sha256Hex([
    "void-buy-production-live-canary-preflight-v1",
    `production_activation_plan_id_sha256=${productionPlan.plan_id_sha256}`,
    `attempt_id=${attemptId}`,
    `runtime_policy_fingerprint_sha256=${runtimeFingerprint}`,
  ].join("\n"));

  if (!inspect) {
    return {
      ok: true,
      status: "planned",
      inspected: false,
      marker: VOID_BUY_VOID_PRODUCTION_LIVE_CANARY_PREFLIGHT_V1,
      version: 1,
      attempt_id: attemptId,
      production_activation_plan_id_sha256: productionPlan.plan_id_sha256,
      runtime_policy_fingerprint_sha256: runtimeFingerprint,
      preflight_plan_id_sha256: preflightPlanId,
      required_confirmation:
        VOID_BUY_VOID_PRODUCTION_LIVE_CANARY_PREFLIGHT_CONFIRMATION_V1,
      required_production_activation_plan_id_sha256:
        productionPlan.plan_id_sha256,
      required_preflight_plan_id_sha256: preflightPlanId,
      required_private_services_activation_confirmation:
        VOID_BUY_VOID_PRODUCTION_PRIVATE_SERVICES_ACTIVATION_CONFIRMATION_V1,
      required_native_execution_confirmation:
        VOID_BUY_VOID_NATIVE_EXECUTION_CONFIRMATION_V1,
      native_execution_dry_run_invoked: false,
      mutation_performed: false,
      signing_performed: false,
      transaction_broadcast_performed: false,
      money_movement_performed: false,
      authority: VOID_BUY_VOID_PRODUCTION_LIVE_CANARY_PREFLIGHT_AUTHORITY_V1,
    };
  }

  if (
    !exact(
      input?.expected_production_activation_plan_id_sha256,
      productionPlan.plan_id_sha256,
    )
  ) {
    return held({
      inspected: true,
      reason:
        "production_live_canary_preflight_activation_plan_id_confirmation_required",
      attempt_id: attemptId,
      production_activation_plan_id_sha256: productionPlan.plan_id_sha256,
      preflight_plan_id_sha256: preflightPlanId,
    });
  }
  if (!exact(input?.expected_preflight_plan_id_sha256, preflightPlanId)) {
    return held({
      inspected: true,
      reason: "production_live_canary_preflight_plan_id_confirmation_required",
      attempt_id: attemptId,
      production_activation_plan_id_sha256: productionPlan.plan_id_sha256,
      preflight_plan_id_sha256: preflightPlanId,
    });
  }

  const boundRuntimePolicy = snapshotRuntimePolicy(runtimePolicy);
  const reboundReason = runtimeBindingReason(productionPlan, boundRuntimePolicy);
  if (reboundReason) {
    return held({
      inspected: true,
      reason: "production_live_canary_preflight_runtime_snapshot_invalid",
      attempt_id: attemptId,
      production_activation_plan_id_sha256: productionPlan.plan_id_sha256,
      preflight_plan_id_sha256: preflightPlanId,
    });
  }

  const runNativeExecution =
    dependencies.run_native_execution_runtime ??
    runBuyVoidNativeExecutionRuntimeCommandV1;
  const plannerTransport = dependencies.planner_transport;
  const executionDryRun = await runNativeExecution({
    runtime_policy: boundRuntimePolicy,
    command: {
      attempt_id: attemptId,
      apply: false,
    },
    ...(plannerTransport ? { planner_transport: plannerTransport } : {}),
  });

  const mutation = executionDryRun.mutation_performed === true;
  const signing = executionDryRun.signing_performed === true;
  const broadcast = executionDryRun.transaction_broadcast_performed === true;
  if (
    executionDryRun.ok !== true ||
    executionDryRun.marker !== VOID_BUY_VOID_NATIVE_EXECUTION_RUNTIME_V1 ||
    executionDryRun.status !== "dry_run" ||
    executionDryRun.attempt_id !== attemptId ||
    executionDryRun.reconstructed_from_server_journals !== true ||
    mutation ||
    signing ||
    broadcast ||
    executionDryRun.worker?.status !== "dry_run"
  ) {
    return held({
      inspected: true,
      reason: "production_live_canary_preflight_native_execution_dry_run_boundary_invalid",
      attempt_id: attemptId,
      production_activation_plan_id_sha256: productionPlan.plan_id_sha256,
      preflight_plan_id_sha256: preflightPlanId,
      native_execution_dry_run_invoked: true,
      mutation_performed: mutation,
      signing_performed: signing,
      transaction_broadcast_performed: broadcast,
    });
  }

  const evidenceId = sha256Hex([
    "void-buy-production-live-canary-preflight-evidence-v1",
    `preflight_plan_id_sha256=${preflightPlanId}`,
    `execution_dry_run=${canonicalJson(executionDryRun)}`,
  ].join("\n"));

  return {
    ok: true,
    status: "inspected",
    inspected: true,
    marker: VOID_BUY_VOID_PRODUCTION_LIVE_CANARY_PREFLIGHT_V1,
    version: 1,
    attempt_id: attemptId,
    production_activation_plan_id_sha256: productionPlan.plan_id_sha256,
    runtime_policy_fingerprint_sha256: runtimeFingerprint,
    preflight_plan_id_sha256: preflightPlanId,
    evidence_id_sha256: evidenceId,
    native_execution_dry_run_invoked: true,
    execution_dry_run: executionDryRun,
    required_private_services_activation_confirmation:
      VOID_BUY_VOID_PRODUCTION_PRIVATE_SERVICES_ACTIVATION_CONFIRMATION_V1,
    required_native_execution_confirmation:
      VOID_BUY_VOID_NATIVE_EXECUTION_CONFIRMATION_V1,
    mutation_performed: false,
    signing_performed: false,
    transaction_broadcast_performed: false,
    money_movement_performed: false,
    authority: VOID_BUY_VOID_PRODUCTION_LIVE_CANARY_PREFLIGHT_AUTHORITY_V1,
  };
}
