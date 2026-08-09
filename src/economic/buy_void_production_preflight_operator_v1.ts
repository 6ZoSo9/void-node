import crypto from "node:crypto";
import path from "node:path";

import {
  buyVoidNativeExecutionRuntimePolicyStateV1,
  type BuyVoidNativeExecutionRuntimePolicyV1,
} from "./buy_void_native_execution_runtime_v1.js";
import {
  buyVoidPreparedTransactionCredentialSignerFingerprintV1,
} from "./buy_void_prepared_transaction_credential_signer_v1.js";
import {
  createBuyVoidProductionActivationPlanV1,
  type BuyVoidProductionActivationPlanPolicyV1,
} from "./buy_void_production_activation_plan_v1.js";
import {
  runBuyVoidProductionLiveCanaryPreflightV1,
  type BuyVoidProductionLiveCanaryPreflightDecisionV1,
  type BuyVoidProductionLiveCanaryPreflightDependenciesV1,
} from "./buy_void_production_live_canary_preflight_v1.js";

export const VOID_BUY_VOID_PRODUCTION_PREFLIGHT_OPERATOR_V1 =
  "VOID_BUY_VOID_PRODUCTION_PREFLIGHT_OPERATOR_V1";

export const VOID_BUY_VOID_PRODUCTION_PREFLIGHT_OPERATOR_PATH_ENVS_V1 = {
  custodian_socket_path:
    "VOID_BUY_VOID_PRODUCTION_CUSTODIAN_SOCKET_PATH",
  custody_store_dir:
    "VOID_BUY_VOID_PRODUCTION_CUSTODY_STORE_DIR",
  broadcaster_socket_path:
    "VOID_BUY_VOID_PRODUCTION_BROADCASTER_SOCKET_PATH",
  broadcaster_state_dir:
    "VOID_BUY_VOID_PRODUCTION_BROADCASTER_STATE_DIR",
  credentials_directory:
    "VOID_BUY_VOID_PRODUCTION_CREDENTIALS_DIRECTORY",
} as const;

export const VOID_BUY_VOID_PRODUCTION_PREFLIGHT_OPERATOR_AUTHORITY_V1 = {
  source_only_contract: true,
  canonical_native_runtime_policy_parser_reused: true,
  duplicate_native_runtime_policy_parser: false,
  private_service_paths_server_controlled: true,
  private_service_path_defaults: false,
  synthetic_fixture_path_defaults: false,
  expected_wallet_from_native_runtime_policy: true,
  rpc_url_from_native_runtime_policy: true,
  signer_fingerprint_derived_from_expected_wallet: true,
  signer_fingerprint_caller_override: false,
  native_runtime_must_remain_disabled: true,
  planning_is_io_free: true,
  attempt_selector_only: true,
  attempt_creation_or_reservation: false,
  inspection_uses_merged_preflight: true,
  native_execution_apply: false,
  signer_dependencies_supplied: false,
  broadcaster_dependencies_supplied: false,
  credential_read: false,
  service_start: false,
  signing: false,
  transaction_broadcast: false,
  inventory_mutation: false,
  public_fulfilled_projection: false,
  deployment: false,
  service_restart: false,
  money_movement: false,
  automatic_retry: false,
} as const;

const SAFE_INPUT_KEYS = new Set([
  "attempt_id",
  "inspect",
  "confirmation",
  "expected_production_activation_plan_id_sha256",
  "expected_preflight_plan_id_sha256",
]);

const SHA256 = /^[0-9a-f]{64}$/;

export type BuyVoidProductionPreflightOperatorPolicyReadyV1 = {
  ok: true;
  status: "ready";
  marker: typeof VOID_BUY_VOID_PRODUCTION_PREFLIGHT_OPERATOR_V1;
  version: 1;
  production_policy: BuyVoidProductionActivationPlanPolicyV1;
  execution_runtime_policy: BuyVoidNativeExecutionRuntimePolicyV1;
  production_activation_plan_id_sha256: string;
  runtime_policy_fingerprint_sha256: string;
  rpc_url_fingerprint_sha256: string;
  private_path_fingerprint_sha256: string;
  authority: typeof VOID_BUY_VOID_PRODUCTION_PREFLIGHT_OPERATOR_AUTHORITY_V1;
};

export type BuyVoidProductionPreflightOperatorPolicyHeldV1 = {
  ok: false;
  status: "held";
  marker: typeof VOID_BUY_VOID_PRODUCTION_PREFLIGHT_OPERATOR_V1;
  version: 1;
  reason: string;
  missing_envs?: string[];
  authority: typeof VOID_BUY_VOID_PRODUCTION_PREFLIGHT_OPERATOR_AUTHORITY_V1;
};

export type BuyVoidProductionPreflightOperatorPolicyDecisionV1 =
  | BuyVoidProductionPreflightOperatorPolicyReadyV1
  | BuyVoidProductionPreflightOperatorPolicyHeldV1;

export type RunBuyVoidProductionPreflightOperatorInputV1 = {
  attempt_id: unknown;
  inspect?: boolean;
  confirmation?: unknown;
  expected_production_activation_plan_id_sha256?: unknown;
  expected_preflight_plan_id_sha256?: unknown;
};

export type BuyVoidProductionPreflightOperatorDependenciesV1 = {
  resolve_policy?: () => BuyVoidProductionPreflightOperatorPolicyDecisionV1;
  run_preflight?: typeof runBuyVoidProductionLiveCanaryPreflightV1;
  preflight_dependencies?: BuyVoidProductionLiveCanaryPreflightDependenciesV1;
};

export type BuyVoidProductionPreflightOperatorDecisionV1 =
  | {
      ok: true;
      status: "planned" | "inspected";
      marker: typeof VOID_BUY_VOID_PRODUCTION_PREFLIGHT_OPERATOR_V1;
      version: 1;
      attempt_id: string;
      production_activation_plan_id_sha256: string;
      runtime_policy_fingerprint_sha256: string;
      preflight_plan_id_sha256: string;
      evidence_id_sha256?: string;
      inspected: boolean;
      preflight: Extract<
        BuyVoidProductionLiveCanaryPreflightDecisionV1,
        { ok: true }
      >;
      mutation_performed: false;
      signing_performed: false;
      transaction_broadcast_performed: false;
      money_movement_performed: false;
      authority: typeof VOID_BUY_VOID_PRODUCTION_PREFLIGHT_OPERATOR_AUTHORITY_V1;
    }
  | {
      ok: false;
      status: "held";
      marker: typeof VOID_BUY_VOID_PRODUCTION_PREFLIGHT_OPERATOR_V1;
      version: 1;
      stage: "operator_input" | "operator_policy" | "preflight";
      reason: string;
      attempt_id: string | null;
      production_activation_plan_id_sha256: string | null;
      preflight_plan_id_sha256: string | null;
      mutation_performed: boolean;
      signing_performed: boolean;
      transaction_broadcast_performed: boolean;
      money_movement_performed: boolean;
      detail?: Record<string, unknown>;
      authority: typeof VOID_BUY_VOID_PRODUCTION_PREFLIGHT_OPERATOR_AUTHORITY_V1;
    };

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function absoluteNonRoot(value: unknown): string {
  const raw = String(value ?? "").trim();
  if (!raw || !path.isAbsolute(raw) || raw.includes("\0")) return "";
  const resolved = path.resolve(raw);
  return resolved === path.parse(resolved).root ? "" : resolved;
}

function policyHeld(
  reason: string,
  missingEnvs?: string[],
): BuyVoidProductionPreflightOperatorPolicyHeldV1 {
  return {
    ok: false,
    status: "held",
    marker: VOID_BUY_VOID_PRODUCTION_PREFLIGHT_OPERATOR_V1,
    version: 1,
    reason,
    ...(missingEnvs && missingEnvs.length
      ? { missing_envs: [...missingEnvs].sort() }
      : {}),
    authority: VOID_BUY_VOID_PRODUCTION_PREFLIGHT_OPERATOR_AUTHORITY_V1,
  };
}

function operatorHeld(input: {
  stage: "operator_input" | "operator_policy" | "preflight";
  reason: string;
  attempt_id?: string | null;
  production_activation_plan_id_sha256?: string | null;
  preflight_plan_id_sha256?: string | null;
  mutation_performed?: boolean;
  signing_performed?: boolean;
  transaction_broadcast_performed?: boolean;
  detail?: Record<string, unknown>;
}): Extract<BuyVoidProductionPreflightOperatorDecisionV1, { ok: false }> {
  const mutation = input.mutation_performed === true;
  const signing = input.signing_performed === true;
  const broadcast = input.transaction_broadcast_performed === true;
  return {
    ok: false,
    status: "held",
    marker: VOID_BUY_VOID_PRODUCTION_PREFLIGHT_OPERATOR_V1,
    version: 1,
    stage: input.stage,
    reason: input.reason,
    attempt_id: input.attempt_id ?? null,
    production_activation_plan_id_sha256:
      input.production_activation_plan_id_sha256 ?? null,
    preflight_plan_id_sha256: input.preflight_plan_id_sha256 ?? null,
    mutation_performed: mutation,
    signing_performed: signing,
    transaction_broadcast_performed: broadcast,
    money_movement_performed: mutation || signing || broadcast,
    ...(input.detail ? { detail: input.detail } : {}),
    authority: VOID_BUY_VOID_PRODUCTION_PREFLIGHT_OPERATOR_AUTHORITY_V1,
  };
}

export function resolveBuyVoidProductionPreflightOperatorPolicyV1():
  BuyVoidProductionPreflightOperatorPolicyDecisionV1 {
  const runtimeState = buyVoidNativeExecutionRuntimePolicyStateV1();
  if ("missing_envs" in runtimeState) {
    return policyHeld(
      "production_preflight_operator_native_runtime_policy_not_configured",
      runtimeState.missing_envs,
    );
  }
  if (runtimeState.policy.enabled !== false) {
    return policyHeld(
      "production_preflight_operator_native_runtime_must_remain_disabled",
    );
  }

  const pathValues = Object.fromEntries(
    Object.entries(
      VOID_BUY_VOID_PRODUCTION_PREFLIGHT_OPERATOR_PATH_ENVS_V1,
    ).map(([key, envName]) => [
      key,
      absoluteNonRoot(process.env[envName]),
    ]),
  ) as Record<
    keyof typeof VOID_BUY_VOID_PRODUCTION_PREFLIGHT_OPERATOR_PATH_ENVS_V1,
    string
  >;

  const missingPathEnvs = Object.entries(
    VOID_BUY_VOID_PRODUCTION_PREFLIGHT_OPERATOR_PATH_ENVS_V1,
  )
    .filter(([key]) => !pathValues[
      key as keyof typeof VOID_BUY_VOID_PRODUCTION_PREFLIGHT_OPERATOR_PATH_ENVS_V1
    ])
    .map(([, envName]) => envName);
  if (missingPathEnvs.length) {
    return policyHeld(
      "production_preflight_operator_private_path_configuration_required",
      missingPathEnvs,
    );
  }

  const distinctPaths = new Set(Object.values(pathValues));
  if (distinctPaths.size !== Object.keys(pathValues).length) {
    return policyHeld(
      "production_preflight_operator_private_paths_must_be_distinct",
    );
  }

  const wallet = String(
    runtimeState.policy.worker_policy.fulfillment_wallet_address || "",
  );
  let signerFingerprint: string;
  try {
    signerFingerprint =
      buyVoidPreparedTransactionCredentialSignerFingerprintV1(wallet);
  } catch {
    return policyHeld(
      "production_preflight_operator_signer_fingerprint_derivation_failed",
    );
  }

  const productionPolicy: BuyVoidProductionActivationPlanPolicyV1 = {
    custodian: {
      socket_path: pathValues.custodian_socket_path,
      custody_store_dir: pathValues.custody_store_dir,
      credentials_directory: pathValues.credentials_directory,
      expected_wallet_address: wallet,
    },
    broadcaster: {
      socket_path: pathValues.broadcaster_socket_path,
      custody_store_dir: pathValues.custody_store_dir,
      state_dir: pathValues.broadcaster_state_dir,
      expected_signer_fingerprint_sha256: signerFingerprint,
      rpc: {
        rpc_url: runtimeState.policy.planner_policy.rpc_url,
        expected_chain_id: 2050,
      },
    },
  };

  const productionPlan =
    createBuyVoidProductionActivationPlanV1(productionPolicy);
  if (productionPlan.ok === false) {
    return policyHeld(
      `production_preflight_operator_${productionPlan.reason}`,
    );
  }

  if (
    !SHA256.test(productionPlan.plan_id_sha256) ||
    !SHA256.test(runtimeState.fingerprint_sha256) ||
    productionPlan.expected_wallet_address !== wallet.toLowerCase() ||
    productionPlan.rpc_url !== runtimeState.policy.planner_policy.rpc_url
  ) {
    return policyHeld(
      "production_preflight_operator_policy_boundary_invalid",
    );
  }

  return {
    ok: true,
    status: "ready",
    marker: VOID_BUY_VOID_PRODUCTION_PREFLIGHT_OPERATOR_V1,
    version: 1,
    production_policy: productionPolicy,
    execution_runtime_policy: runtimeState.policy,
    production_activation_plan_id_sha256: productionPlan.plan_id_sha256,
    runtime_policy_fingerprint_sha256: runtimeState.fingerprint_sha256,
    rpc_url_fingerprint_sha256:
      runtimeState.rpc_url_fingerprint_sha256,
    private_path_fingerprint_sha256: sha256(
      [
        `custodian_socket_path=${pathValues.custodian_socket_path}`,
        `custody_store_dir=${pathValues.custody_store_dir}`,
        `broadcaster_socket_path=${pathValues.broadcaster_socket_path}`,
        `broadcaster_state_dir=${pathValues.broadcaster_state_dir}`,
        `credentials_directory=${pathValues.credentials_directory}`,
      ].join("\n"),
    ),
    authority: VOID_BUY_VOID_PRODUCTION_PREFLIGHT_OPERATOR_AUTHORITY_V1,
  };
}

export async function runBuyVoidProductionPreflightOperatorV1(
  input: Readonly<RunBuyVoidProductionPreflightOperatorInputV1>,
  dependencies: BuyVoidProductionPreflightOperatorDependenciesV1 = {},
): Promise<BuyVoidProductionPreflightOperatorDecisionV1> {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return operatorHeld({
      stage: "operator_input",
      reason: "production_preflight_operator_input_object_required",
    });
  }

  const unexpectedKeys = Object.keys(input as Record<string, unknown>)
    .filter((key) => !SAFE_INPUT_KEYS.has(key))
    .sort();
  if (unexpectedKeys.length) {
    return operatorHeld({
      stage: "operator_input",
      reason: "production_preflight_operator_unexpected_input_key",
      detail: { unexpected_keys: unexpectedKeys },
    });
  }

  const attemptId =
    typeof input.attempt_id === "string" ? input.attempt_id : null;
  const resolvePolicy =
    dependencies.resolve_policy ||
    resolveBuyVoidProductionPreflightOperatorPolicyV1;
  const resolved = resolvePolicy();
  if (resolved.ok === false) {
    return operatorHeld({
      stage: "operator_policy",
      reason: resolved.reason,
      attempt_id: attemptId,
      detail: resolved.missing_envs
        ? { missing_envs: resolved.missing_envs }
        : undefined,
    });
  }

  const runPreflight =
    dependencies.run_preflight ||
    runBuyVoidProductionLiveCanaryPreflightV1;
  const preflight = await runPreflight(
    {
      production_policy: resolved.production_policy,
      execution_runtime_policy: resolved.execution_runtime_policy,
      attempt_id: input.attempt_id,
      inspect: input.inspect === true,
      confirmation: input.confirmation,
      expected_production_activation_plan_id_sha256:
        input.expected_production_activation_plan_id_sha256,
      expected_preflight_plan_id_sha256:
        input.expected_preflight_plan_id_sha256,
    },
    dependencies.preflight_dependencies,
  );

  if (preflight.ok === false) {
    return operatorHeld({
      stage: "preflight",
      reason: preflight.reason,
      attempt_id: preflight.attempt_id,
      production_activation_plan_id_sha256:
        preflight.production_activation_plan_id_sha256,
      preflight_plan_id_sha256: preflight.preflight_plan_id_sha256,
      mutation_performed: preflight.mutation_performed,
      signing_performed: preflight.signing_performed,
      transaction_broadcast_performed:
        preflight.transaction_broadcast_performed,
    });
  }

  return {
    ok: true,
    status: preflight.status,
    marker: VOID_BUY_VOID_PRODUCTION_PREFLIGHT_OPERATOR_V1,
    version: 1,
    attempt_id: preflight.attempt_id,
    production_activation_plan_id_sha256:
      preflight.production_activation_plan_id_sha256,
    runtime_policy_fingerprint_sha256:
      preflight.runtime_policy_fingerprint_sha256,
    preflight_plan_id_sha256: preflight.preflight_plan_id_sha256,
    ...(preflight.status === "inspected"
      ? { evidence_id_sha256: preflight.evidence_id_sha256 }
      : {}),
    inspected: preflight.inspected,
    preflight,
    mutation_performed: false,
    signing_performed: false,
    transaction_broadcast_performed: false,
    money_movement_performed: false,
    authority: VOID_BUY_VOID_PRODUCTION_PREFLIGHT_OPERATOR_AUTHORITY_V1,
  };
}
