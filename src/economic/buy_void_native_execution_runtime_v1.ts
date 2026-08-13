import crypto from "node:crypto";
import path from "node:path";
import express from "express";
import {
  listBuyVoidFulfillmentJournalClaimsV1,
  type BuyVoidFulfillmentJournalIntentV1,
} from "./buy_void_fulfillment_journal_v1.js";
import {
  listBuyVoidInventoryReservationsV1,
  type BuyVoidInventoryReservationV1,
} from "./buy_void_inventory_reservation_journal_v1.js";
import {
  VOID_BUY_VOID_AUTO_RESERVE_PLAN_WORKER_V1,
  type BuyVoidBoundedExecutionPlanV1,
} from "./buy_void_auto_reserve_plan_worker_v1.js";
import {
  readBuyVoidExecutionAttemptV1,
  type BuyVoidExecutionAttemptPolicyV1,
  type BuyVoidExecutionAttemptStateV1,
} from "./buy_void_execution_attempt_journal_v1.js";
import {
  VOID_BUY_VOID_NATIVE_EXECUTION_CONFIRMATION_V1,
  VOID_BUY_VOID_NATIVE_EXECUTION_AUTHORITY_V1,
  runBuyVoidNativeExecutionWorkerV1,
  type BuyVoidNativeExecutionWorkerDecisionV1,
  type BuyVoidNativeExecutionWorkerDependenciesV1,
  type BuyVoidNativeExecutionWorkerPolicyV1,
} from "./buy_void_native_execution_worker_v1.js";
import {
  VOID_BUY_VOID_NATIVE_EXECUTION_NONCE_FEE_PLANNER_AUTHORITY_V1,
  VOID_BUY_VOID_NATIVE_EXECUTION_NONCE_FEE_PLANNER_V1,
  planBuyVoidNativeExecutionNonceFeeV1,
  type BuyVoidNativeExecutionNonceFeePlanDecisionV1,
  type BuyVoidNativeExecutionNonceFeePlannerPolicyV1,
  type BuyVoidNativeExecutionPlannerTransportV1,
} from "./buy_void_native_execution_nonce_fee_planner_v1.js";

export const VOID_BUY_VOID_NATIVE_EXECUTION_RUNTIME_V1 =
  "VOID_BUY_VOID_NATIVE_EXECUTION_RUNTIME_V1";

export const VOID_BUY_VOID_NATIVE_EXECUTION_RUNTIME_ROUTES_V1 = {
  status: "/__void/operator/buy-void-native-execution-v1/status",
  command: "/__void/operator/buy-void-native-execution-v1/command",
} as const;

export const VOID_BUY_VOID_NATIVE_EXECUTION_RUNTIME_AUTHORITY_V1 = {
  operator_loopback_only: true,
  disabled_by_default: true,
  dry_run_allowed_while_disabled: true,
  apply_allowed_while_disabled: false,
  one_request_per_command: true,
  server_controlled_root_dir: true,
  server_controlled_policy: true,
  server_controlled_rpc_url: true,
  attempt_id_only_selector: true,
  journal_reconstruction_required: true,
  exact_confirmation_required_before_apply_io: true,
  exact_policy_fingerprint_required_before_apply_planning: true,
  exact_plan_fingerprint_required_before_signing: true,
  injected_dependencies_required_before_apply_io: true,
  read_only_nonce_fee_planning: true,
  http_response_bigint_decimal_projection: true,
  public_request_journal_write: false,
  inventory_decrement: false,
  inventory_release: false,
  raw_signed_transaction_input: false,
  raw_signed_transaction_persistence: false,
  raw_signed_transaction_output: false,
  automatic_retry: false,
  receipt_wait: false,
  background_loop: false,
  startup_execution: false,
  signing_when_confirmed_and_fully_enabled: true,
  transaction_broadcast_when_confirmed_and_fully_enabled: true,
  money_movement_when_confirmed_and_fully_enabled: true,
} as const;

const GLOBAL_MARK =
  "__void_buy_void_native_execution_runtime_v1";
const GLOBAL_DEPENDENCIES =
  "__void_buy_void_native_delivery_runtime_dependencies_v1";
const ENABLE_ENV =
  "VOID_BUY_VOID_NATIVE_EXECUTION_RUNTIME_ENABLED";
const ROOT_ENV = "VOID_BUY_VOID_RUNTIME_DIR";
const JSON_LIMIT = "128kb";

const POLICY_ENVS = {
  pool_id: "VOID_BUY_VOID_INVENTORY_POOL_ID",
  fulfillment_wallet_address:
    "VOID_BUY_VOID_NATIVE_DELIVERY_WALLET_ADDRESS",
  max_void_amount_units:
    "VOID_BUY_VOID_NATIVE_DELIVERY_MAX_AMOUNT_UNITS",
  gas_limit:
    "VOID_BUY_VOID_NATIVE_EXECUTION_GAS_LIMIT",
  max_gas_limit:
    "VOID_BUY_VOID_NATIVE_DELIVERY_MAX_GAS_LIMIT",
  max_fee_per_gas_wei:
    "VOID_BUY_VOID_NATIVE_DELIVERY_MAX_FEE_PER_GAS_WEI",
  max_priority_fee_per_gas_wei:
    "VOID_BUY_VOID_NATIVE_DELIVERY_MAX_PRIORITY_FEE_PER_GAS_WEI",
  fee_multiplier_bps:
    "VOID_BUY_VOID_NATIVE_EXECUTION_FEE_MULTIPLIER_BPS",
  rpc_url: "VOID_BUY_VOID_NATIVE_CHAIN2050_RPC_URL",
} as const;

const FORBIDDEN_INPUT_KEYS = new Set([
  "private_key",
  "privatekey",
  "mnemonic",
  "seed",
  "seed_phrase",
  "raw_transaction",
  "raw_signed_transaction",
  "signed_transaction",
  "signedtransaction",
  "wallet",
  "signer",
  "signing_key",
  "rpc_url",
  "rpcurl",
  "broadcast_url",
  "broadcasturl",
  "root_dir",
  "policy",
  "dependencies",
  "transaction_plan",
  "bounded_plan",
  "intent",
  "__proto__",
  "prototype",
  "constructor",
]);

const SHA256 = /^[0-9a-f]{64}$/;
const SAFE_CODE = /^[A-Za-z0-9._:-]{1,160}$/;

export type BuyVoidNativeExecutionRuntimePolicyV1 = {
  enabled: boolean;
  root_dir: string;
  worker_policy: BuyVoidNativeExecutionWorkerPolicyV1;
  execution_policy: BuyVoidExecutionAttemptPolicyV1;
  planner_policy: Omit<
    BuyVoidNativeExecutionNonceFeePlannerPolicyV1,
    "native_value_wei"
  >;
};

export type BuyVoidNativeExecutionRuntimeCommandV1 = {
  attempt_id: string;
  apply?: boolean;
  confirmation?: unknown;
  submission_idempotency_key?: unknown;
  expected_plan_fingerprint_sha256?: unknown;
  policy_fingerprint_sha256?: unknown;
  now_ms?: number;
};

export type BuyVoidNativeExecutionRuntimeDecisionV1 =
  | {
      ok: true;
      marker: typeof VOID_BUY_VOID_NATIVE_EXECUTION_RUNTIME_V1;
      version: 1;
      status: "dry_run" | "broadcast_accepted";
      attempt_id: string;
      reconstructed_from_server_journals: true;
      plan_fingerprint_sha256: string;
      runtime_policy_fingerprint_sha256: string;
      planner: BuyVoidNativeExecutionNonceFeePlanDecisionV1 & {
        ok: true;
        status: "planned";
      };
      worker: BuyVoidNativeExecutionWorkerDecisionV1 & {
        ok: true;
      };
      mutation_performed: boolean;
      signing_performed: boolean;
      transaction_broadcast_performed: boolean;
      raw_signed_transaction_persisted: false;
      raw_signed_transaction_returned: false;
    }
  | {
      ok: false;
      marker: typeof VOID_BUY_VOID_NATIVE_EXECUTION_RUNTIME_V1;
      version: 1;
      status:
        | "held"
        | "not_broadcast"
        | "broadcast_unknown";
      stage:
        | "runtime_policy"
        | "journal_reconstruction"
        | "nonce_fee_planning"
        | "native_execution";
      reason: string;
      attempt_id: string | null;
      planner?: BuyVoidNativeExecutionNonceFeePlanDecisionV1;
      worker?: BuyVoidNativeExecutionWorkerDecisionV1;
      mutation_performed: boolean;
      signing_performed: boolean;
      transaction_broadcast_performed: boolean;
      reconciliation_required: boolean;
      automatic_retry_allowed: false;
      raw_signed_transaction_persisted: false;
      raw_signed_transaction_returned: false;
      detail?: Record<string, unknown>;
    };

type ReconstructedV1 = {
  intent: BuyVoidFulfillmentJournalIntentV1;
  inventory: BuyVoidInventoryReservationV1;
  attempt: BuyVoidExecutionAttemptStateV1;
  bounded_plan: BuyVoidBoundedExecutionPlanV1;
};

export type BuyVoidNativeExecutionRuntimePolicyStateV1 =
  | {
      configured: true;
      policy: BuyVoidNativeExecutionRuntimePolicyV1;
      fingerprint_sha256: string;
      rpc_url_fingerprint_sha256: string;
    }
  | {
      configured: false;
      missing_envs: string[];
    };

function sha256Hex(value: string): string {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonical(record[key])}`)
    .join(",")}}`;
}

function buyVoidNativeExecutionRuntimePolicyFingerprintV1(
  policy: BuyVoidNativeExecutionRuntimePolicyV1,
): string {
  return sha256Hex(
    [
      `root_dir=${policy.root_dir}`,
      `pool_id=${policy.worker_policy.pool_id}`,
      `fulfillment_wallet_address=${policy.worker_policy.fulfillment_wallet_address.toLowerCase()}`,
      `max_void_amount_units=${policy.worker_policy.max_void_amount_units}`,
      `gas_limit=${policy.planner_policy.gas_limit}`,
      `max_gas_limit=${policy.worker_policy.max_gas_limit}`,
      `max_fee_per_gas_wei=${policy.worker_policy.max_fee_per_gas_wei}`,
      `max_priority_fee_per_gas_wei=${policy.worker_policy.max_priority_fee_per_gas_wei}`,
      `fee_multiplier_bps=${policy.planner_policy.fee_multiplier_bps}`,
      `rpc_url_fingerprint_sha256=${sha256Hex(policy.planner_policy.rpc_url)}`,
    ].join("\n"),
  );
}

function buyVoidNativeExecutionPlanFingerprintV1(input: {
  runtime_policy: BuyVoidNativeExecutionRuntimePolicyV1;
  attempt_id: string;
  reconstructed: ReconstructedV1;
  planner: BuyVoidNativeExecutionNonceFeePlanDecisionV1 & {
    ok: true;
    status: "planned";
  };
  native_value_wei: bigint;
}): string {
  const planner = input.planner;
  const plan = planner.transaction_plan;
  return sha256Hex(canonical({
    attempt_id: input.attempt_id,
    inventory_reservation_id: input.reconstructed.bounded_plan.inventory_reservation_id,
    bounded_execution_plan_id_sha256: input.reconstructed.bounded_plan.plan_id,
    chain_id: "2050",
    delivery_address: input.reconstructed.bounded_plan.delivery_address,
    void_amount_units: input.reconstructed.bounded_plan.void_amount_units,
    native_value_wei: input.native_value_wei.toString(),
    nonce: plan.nonce,
    gas_limit: String(plan.gas_limit),
    max_fee_per_gas_wei: String(plan.max_fee_per_gas_wei),
    max_priority_fee_per_gas_wei: String(plan.max_priority_fee_per_gas_wei),
    wallet_address_fingerprint_sha256: planner.wallet_address_fingerprint_sha256,
    rpc_url_fingerprint_sha256: planner.rpc_url_fingerprint_sha256,
    observed_gas_price_wei: String(planner.observed_gas_price_wei),
    estimated_max_transaction_cost_wei: String(planner.estimated_max_transaction_cost_wei),
    observed_wallet_balance_wei: String(planner.observed_wallet_balance_wei),
    rpc_methods_used: [...planner.rpc_methods_used],
    runtime_policy_fingerprint_sha256:
      buyVoidNativeExecutionRuntimePolicyFingerprintV1(input.runtime_policy),
    required_confirmation: VOID_BUY_VOID_NATIVE_EXECUTION_CONFIRMATION_V1,
  }));
}

function enabled(): boolean {
  return String(process.env[ENABLE_ENV] || "") === "1";
}

function dataDir(): string {
  const raw = String(
    process.env.DATA_DIR ||
      process.env.VOID_DATA_DIR ||
      "data",
  );
  return path.isAbsolute(raw)
    ? path.normalize(raw)
    : path.join(process.cwd(), raw);
}

export function buyVoidNativeExecutionRuntimeRootDirV1(): string {
  const configured = String(process.env[ROOT_ENV] || "").trim();
  if (configured) {
    return path.isAbsolute(configured)
      ? path.normalize(configured)
      : path.join(process.cwd(), configured);
  }
  return path.join(
    dataDir(),
    "buy_void_v1",
    "runtime-integration-v1",
  );
}

function remoteAddress(req: any): string {
  return String(
    req?.socket?.remoteAddress ??
      req?.connection?.remoteAddress ??
      "",
  ).trim();
}

function loopbackOnly(req: any, res: any): boolean {
  const remote = remoteAddress(req);
  const allowed =
    remote === "127.0.0.1" ||
    remote === "::1" ||
    remote === "::ffff:127.0.0.1";
  if (allowed) return true;

  res.status(403).json({
    marker: VOID_BUY_VOID_NATIVE_EXECUTION_RUNTIME_V1,
    ok: false,
    error: "operator_loopback_only",
    remote_address: remote,
  });
  return false;
}

function normalizeKey(value: unknown): string {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "");
}

function findForbiddenInputKey(
  value: unknown,
  depth = 0,
): string | null {
  if (!value || typeof value !== "object" || depth > 12) {
    return null;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findForbiddenInputKey(item, depth + 1);
      if (found) return found;
    }
    return null;
  }

  for (const [key, nested] of Object.entries(
    value as Record<string, unknown>,
  )) {
    const normalized = normalizeKey(key);
    if (FORBIDDEN_INPUT_KEYS.has(normalized)) return key;
    const found = findForbiddenInputKey(nested, depth + 1);
    if (found) return found;
  }
  return null;
}

function held(
  stage:
    | "runtime_policy"
    | "journal_reconstruction"
    | "nonce_fee_planning"
    | "native_execution",
  options: {
    reason: string;
    attempt_id?: string | null;
    planner?: BuyVoidNativeExecutionNonceFeePlanDecisionV1;
    worker?: BuyVoidNativeExecutionWorkerDecisionV1;
    detail?: Record<string, unknown>;
  },
): BuyVoidNativeExecutionRuntimeDecisionV1 {
  const worker = options.worker;
  return {
    ok: false,
    marker: VOID_BUY_VOID_NATIVE_EXECUTION_RUNTIME_V1,
    version: 1,
    status:
      worker && "status" in worker &&
      ["not_broadcast", "broadcast_unknown"].includes(
        String(worker.status),
      )
        ? (worker.status as "not_broadcast" | "broadcast_unknown")
        : "held",
    stage,
    reason: options.reason,
    attempt_id: options.attempt_id ?? null,
    ...(options.planner ? { planner: options.planner } : {}),
    ...(worker ? { worker } : {}),
    mutation_performed:
      worker?.mutation_performed === true,
    signing_performed:
      worker?.signing_performed === true,
    transaction_broadcast_performed:
      worker?.transaction_broadcast_performed === true,
    reconciliation_required:
      worker && "reconciliation_required" in worker
        ? worker.reconciliation_required === true
        : false,
    automatic_retry_allowed: false,
    raw_signed_transaction_persisted: false,
    raw_signed_transaction_returned: false,
    ...(options.detail ? { detail: options.detail } : {}),
  };
}

export function buyVoidNativeExecutionRuntimePolicyStateV1():
  BuyVoidNativeExecutionRuntimePolicyStateV1 {
  const values = Object.fromEntries(
    Object.entries(POLICY_ENVS).map(([key, env]) => [
      key,
      String(process.env[env] || "").trim(),
    ]),
  ) as Record<keyof typeof POLICY_ENVS, string>;

  const missing = Object.entries(POLICY_ENVS)
    .filter(([key]) => !values[key as keyof typeof POLICY_ENVS])
    .map(([, env]) => env)
    .sort();

  if (missing.length) {
    return { configured: false, missing_envs: missing };
  }
  if (!SAFE_CODE.test(values.pool_id)) {
    return {
      configured: false,
      missing_envs: [POLICY_ENVS.pool_id],
    };
  }

  const rootDir = buyVoidNativeExecutionRuntimeRootDirV1();
  const workerPolicy: BuyVoidNativeExecutionWorkerPolicyV1 = {
    // Top-level runtime enablement rejects apply=true while disabled. Keep
    // the worker available for the documented apply=false dry-run path.
    enabled: true,
    asset_mode: "native_void",
    chain_id: "2050",
    pool_id: values.pool_id,
    fulfillment_wallet_address:
      values.fulfillment_wallet_address,
    max_void_amount_units: values.max_void_amount_units,
    max_gas_limit: values.max_gas_limit,
    max_fee_per_gas_wei: values.max_fee_per_gas_wei,
    max_priority_fee_per_gas_wei:
      values.max_priority_fee_per_gas_wei,
  };
  const executionPolicy: BuyVoidExecutionAttemptPolicyV1 = {
    attempt_journal_enabled: true,
    max_attempts_per_payment: 1,
    chain_id: 2050,
    fulfillment_wallet_allowlist: [
      values.fulfillment_wallet_address,
    ],
  };
  const plannerPolicy: Omit<
    BuyVoidNativeExecutionNonceFeePlannerPolicyV1,
    "native_value_wei"
  > = {
    rpc_url: values.rpc_url,
    expected_chain_id: "2050",
    fulfillment_wallet_address:
      values.fulfillment_wallet_address,
    gas_limit: values.gas_limit,
    max_gas_limit: values.max_gas_limit,
    max_fee_per_gas_wei: values.max_fee_per_gas_wei,
    max_priority_fee_per_gas_wei:
      values.max_priority_fee_per_gas_wei,
    fee_multiplier_bps: values.fee_multiplier_bps,
  };

  const policy: BuyVoidNativeExecutionRuntimePolicyV1 = {
    enabled: enabled(),
    root_dir: rootDir,
    worker_policy: workerPolicy,
    execution_policy: executionPolicy,
    planner_policy: plannerPolicy,
  };

  return {
    configured: true,
    policy,
    fingerprint_sha256:
      buyVoidNativeExecutionRuntimePolicyFingerprintV1(policy),
    rpc_url_fingerprint_sha256: sha256Hex(values.rpc_url),
  };
}

function externalDependencies():
  BuyVoidNativeExecutionWorkerDependenciesV1 | undefined {
  const candidate = (globalThis as any)[GLOBAL_DEPENDENCIES];
  if (
    !candidate ||
    typeof candidate.signer?.get_address !== "function" ||
    typeof candidate.signer?.sign_transaction !== "function" ||
    typeof candidate.broadcaster?.broadcast_signed_transaction !==
      "function"
  ) {
    return undefined;
  }
  return candidate as BuyVoidNativeExecutionWorkerDependenciesV1;
}

function reconstruct(
  rootDir: string,
  poolId: string,
  attemptId: string,
): ReconstructedV1 | { reason: string; detail?: Record<string, unknown> } {
  const attempt = readBuyVoidExecutionAttemptV1({
    root_dir: rootDir,
    attempt_id: attemptId,
  });
  if (!attempt) return { reason: "execution_attempt_not_found" };
  if (
    !["reserved", "prepared"].includes(attempt.status) ||
    attempt.broadcast ||
    attempt.failure ||
    attempt.postbroadcast_failure ||
    attempt.confirmation
  ) {
    return {
      reason: "execution_attempt_not_clean",
      detail: { status: attempt.status },
    };
  }

  let claims: BuyVoidFulfillmentJournalIntentV1[];
  try {
    claims = listBuyVoidFulfillmentJournalClaimsV1(rootDir);
  } catch (error) {
    return {
      reason: "fulfillment_claim_read_failed",
      detail: {
        error_class: String((error as any)?.name || "Error").slice(0, 80),
      },
    };
  }
  const matchingClaims = claims.filter(
    (intent) =>
      intent.claim.canonical_payment_identity ===
        attempt.reservation.canonical_payment_identity &&
      intent.claim.request_id ===
        attempt.reservation.request_id &&
      intent.claim.instruction_id ===
        attempt.reservation.instruction_id,
  );
  if (matchingClaims.length !== 1) {
    return {
      reason: "fulfillment_claim_match_count_invalid",
      detail: { match_count: matchingClaims.length },
    };
  }
  const intent = matchingClaims[0];

  let reservations: BuyVoidInventoryReservationV1[];
  try {
    reservations = listBuyVoidInventoryReservationsV1({
      root_dir: rootDir,
      pool_id: poolId,
    });
  } catch (error) {
    return {
      reason: "inventory_reservation_read_failed",
      detail: {
        error_class: String((error as any)?.name || "Error").slice(0, 80),
      },
    };
  }
  const matchingReservations = reservations.filter(
    (item) =>
      item.pool_id === poolId &&
      item.canonical_payment_identity ===
        intent.claim.canonical_payment_identity &&
      item.request_id === intent.claim.request_id &&
      item.instruction_id === intent.claim.instruction_id &&
      item.payment_key_sha256 === intent.payment_key_sha256 &&
      item.request_key_sha256 === intent.request_key_sha256,
  );
  if (matchingReservations.length !== 1) {
    return {
      reason: "inventory_reservation_match_count_invalid",
      detail: { match_count: matchingReservations.length },
    };
  }
  const inventory = matchingReservations[0];

  const boundedPlan: BuyVoidBoundedExecutionPlanV1 = {
    schema: "void_buy_void_bounded_execution_plan_v1",
    marker: VOID_BUY_VOID_AUTO_RESERVE_PLAN_WORKER_V1,
    plan_id: sha256Hex(
      [
        "void-buy-bounded-execution-plan-v1",
        inventory.reservation_id,
        attempt.reservation.attempt_id,
      ].join("\n"),
    ),
    created_at_ms: Math.max(
      inventory.reserved_at_ms,
      attempt.reservation.reserved_at_ms,
    ),
    request_id: intent.claim.request_id,
    canonical_payment_identity:
      intent.claim.canonical_payment_identity,
    instruction_id: intent.claim.instruction_id,
    pool_id: inventory.pool_id,
    inventory_reservation_id: inventory.reservation_id,
    inventory_reservation_committed: true,
    execution_attempt_id: attempt.reservation.attempt_id,
    execution_attempt_number: 1,
    execution_attempt_committed: true,
    execution_chain_id: "2050",
    max_attempts_per_payment: 1,
    fulfillment_wallet_allowlist_count: 1,
    delivery_address: String(
      intent.claim.unsigned_instruction.delivery_address,
    ).toLowerCase(),
    void_amount_units: String(
      intent.claim.unsigned_instruction.void_amount_units,
    ),
    request_journal_write_authorized: false,
    inventory_decrement_authorized: false,
    inventory_release_authorized: false,
    wallet_access_authorized: false,
    signing_authorized: false,
    transaction_broadcast_authorized: false,
    automatic_delivery_authorized: false,
    money_movement_authorized: false,
  };

  return {
    intent,
    inventory,
    attempt,
    bounded_plan: boundedPlan,
  };
}

export async function runBuyVoidNativeExecutionRuntimeCommandV1(input: {
  runtime_policy: BuyVoidNativeExecutionRuntimePolicyV1;
  command: BuyVoidNativeExecutionRuntimeCommandV1;
  dependencies?: BuyVoidNativeExecutionWorkerDependenciesV1;
  planner_transport?: BuyVoidNativeExecutionPlannerTransportV1;
}): Promise<BuyVoidNativeExecutionRuntimeDecisionV1> {
  const runtimePolicy = input?.runtime_policy;
  const command = input?.command;
  const attemptId = String(command?.attempt_id || "")
    .trim()
    .toLowerCase();

  if (!runtimePolicy) {
    return held("runtime_policy", {
      reason: "native_execution_runtime_disabled",
      attempt_id: SHA256.test(attemptId) ? attemptId : null,
    });
  }
  if (
    runtimePolicy.enabled !== true &&
    command?.apply === true
  ) {
    return held("runtime_policy", {
      reason: "native_execution_runtime_disabled",
      attempt_id: SHA256.test(attemptId) ? attemptId : null,
    });
  }
  if (!SHA256.test(attemptId)) {
    return held("runtime_policy", {
      reason: "invalid_attempt_id",
    });
  }

  if (
    command.apply === true &&
    String(command.confirmation || "") !==
      VOID_BUY_VOID_NATIVE_EXECUTION_CONFIRMATION_V1
  ) {
    return held("runtime_policy", {
      reason: "explicit_confirmation_required",
      attempt_id: attemptId,
      detail: {
        required_confirmation:
          VOID_BUY_VOID_NATIVE_EXECUTION_CONFIRMATION_V1,
      },
    });
  }

  if (command.apply === true && !input.dependencies) {
    return held("runtime_policy", {
      reason: "native_execution_dependencies_required",
      attempt_id: attemptId,
    });
  }

  const runtimePolicyFingerprint =
    buyVoidNativeExecutionRuntimePolicyFingerprintV1(runtimePolicy);
  if (command.apply === true) {
    const suppliedPolicyFingerprint =
      command.policy_fingerprint_sha256;
    const suppliedPlanFingerprint =
      command.expected_plan_fingerprint_sha256;
    if (
      typeof suppliedPolicyFingerprint !== "string" ||
      !SHA256.test(suppliedPolicyFingerprint)
    ) {
      return held("runtime_policy", {
        reason: "exact_policy_fingerprint_required",
        attempt_id: attemptId,
      });
    }
    if (suppliedPolicyFingerprint !== runtimePolicyFingerprint) {
      return held("runtime_policy", {
        reason: "native_execution_policy_fingerprint_mismatch",
        attempt_id: attemptId,
        detail: { required_policy_fingerprint_sha256: runtimePolicyFingerprint },
      });
    }
    if (
      typeof suppliedPlanFingerprint !== "string" ||
      !SHA256.test(suppliedPlanFingerprint)
    ) {
      return held("runtime_policy", {
        reason: "exact_plan_fingerprint_required",
        attempt_id: attemptId,
      });
    }
  }

  const reconstructed = reconstruct(
    runtimePolicy.root_dir,
    runtimePolicy.worker_policy.pool_id,
    attemptId,
  );
  if ("reason" in reconstructed) {
    return held("journal_reconstruction", {
      reason: reconstructed.reason,
      attempt_id: attemptId,
      detail: reconstructed.detail,
    });
  }

  const nativeValue =
    BigInt(reconstructed.bounded_plan.void_amount_units) *
    1_000_000_000_000n;
  const planner = await planBuyVoidNativeExecutionNonceFeeV1(
    {
      ...runtimePolicy.planner_policy,
      native_value_wei: nativeValue,
    },
    input.planner_transport,
  );
  if ("reason" in planner) {
    return held("nonce_fee_planning", {
      reason: planner.reason,
      attempt_id: attemptId,
      planner,
      detail: planner.detail,
    });
  }

  const planFingerprint = buyVoidNativeExecutionPlanFingerprintV1({
    runtime_policy: runtimePolicy,
    attempt_id: attemptId,
    reconstructed,
    planner,
    native_value_wei: nativeValue,
  });
  if (
    command.apply === true &&
    command.expected_plan_fingerprint_sha256 !== planFingerprint
  ) {
    return held("nonce_fee_planning", {
      reason: "native_execution_plan_fingerprint_mismatch",
      attempt_id: attemptId,
      planner,
      detail: { required_plan_fingerprint_sha256: planFingerprint },
    });
  }

  const worker = await runBuyVoidNativeExecutionWorkerV1({
    root_dir: runtimePolicy.root_dir,
    intent: reconstructed.intent,
    bounded_plan: reconstructed.bounded_plan,
    worker_policy: runtimePolicy.worker_policy,
    execution_policy: runtimePolicy.execution_policy,
    transaction_plan: planner.transaction_plan,
    submission_idempotency_key:
      command.submission_idempotency_key,
    apply: command.apply === true,
    confirmation: command.confirmation,
    ...(input.dependencies
      ? { dependencies: input.dependencies }
      : {}),
    now_ms: command.now_ms,
  });

  if ("reason" in worker) {
    return held("native_execution", {
      reason: worker.reason,
      attempt_id: attemptId,
      planner,
      worker,
      detail: worker.detail,
    });
  }

  return {
    ok: true,
    marker: VOID_BUY_VOID_NATIVE_EXECUTION_RUNTIME_V1,
    version: 1,
    status: worker.status,
    attempt_id: attemptId,
    reconstructed_from_server_journals: true,
    plan_fingerprint_sha256: planFingerprint,
    runtime_policy_fingerprint_sha256: runtimePolicyFingerprint,
    planner,
    worker,
    mutation_performed: worker.mutation_performed,
    signing_performed: worker.signing_performed,
    transaction_broadcast_performed:
      worker.transaction_broadcast_performed,
    raw_signed_transaction_persisted: false,
    raw_signed_transaction_returned: false,
  };
}

export function buyVoidNativeExecutionRuntimeStatusV1():
  Record<string, unknown> {
  const policy = buyVoidNativeExecutionRuntimePolicyStateV1();
  const dependencies = externalDependencies();
  return {
    marker: VOID_BUY_VOID_NATIVE_EXECUTION_RUNTIME_V1,
    version: 1,
    ok: true,
    enabled: enabled(),
    enable_env: ENABLE_ENV,
    routes: VOID_BUY_VOID_NATIVE_EXECUTION_RUNTIME_ROUTES_V1,
    operator_loopback_only: true,
    one_request_per_command: true,
    root_dir: buyVoidNativeExecutionRuntimeRootDirV1(),
    root_dir_source: String(process.env[ROOT_ENV] || "").trim()
      ? ROOT_ENV
      : "server_default",
    policy_configured: policy.configured,
    ...(!("missing_envs" in policy)
      ? {
          policy_fingerprint_sha256:
            policy.fingerprint_sha256,
          rpc_url_fingerprint_sha256:
            policy.rpc_url_fingerprint_sha256,
        }
      : { missing_policy_envs: policy.missing_envs }),
    signer_configured: Boolean(dependencies?.signer),
    broadcaster_configured: Boolean(dependencies?.broadcaster),
    apply_ready:
      enabled() &&
      policy.configured &&
      Boolean(dependencies?.signer) &&
      Boolean(dependencies?.broadcaster),
    required_confirmation:
      VOID_BUY_VOID_NATIVE_EXECUTION_CONFIRMATION_V1,
    authority:
      VOID_BUY_VOID_NATIVE_EXECUTION_RUNTIME_AUTHORITY_V1,
    worker_authority:
      VOID_BUY_VOID_NATIVE_EXECUTION_AUTHORITY_V1,
    planner_marker:
      VOID_BUY_VOID_NATIVE_EXECUTION_NONCE_FEE_PLANNER_V1,
    planner_authority:
      VOID_BUY_VOID_NATIVE_EXECUTION_NONCE_FEE_PLANNER_AUTHORITY_V1,
  };
}

function responseStatus(
  decision: BuyVoidNativeExecutionRuntimeDecisionV1,
): number {
  if (!("reason" in decision)) return 200;
  if (decision.reason === "explicit_confirmation_required") return 428;
  if (
    decision.reason === "native_execution_runtime_disabled" ||
    decision.reason === "native_execution_dependencies_required"
  ) {
    return 503;
  }
  if (
    decision.status === "not_broadcast" ||
    decision.status === "broadcast_unknown" ||
    decision.reason.includes("already") ||
    decision.reason.includes("conflict") ||
    decision.reason.includes("mismatch")
  ) {
    return 409;
  }
  return 400;
}

export function buyVoidNativeExecutionRuntimeHttpJsonV1(
  decision: BuyVoidNativeExecutionRuntimeDecisionV1,
): Record<string, unknown> {
  const encoded = JSON.stringify(
    decision,
    (_key, value) =>
      typeof value === "bigint" ? value.toString() : value,
  );
  if (typeof encoded !== "string") {
    throw new Error("native_execution_http_json_projection_failed");
  }
  return JSON.parse(encoded) as Record<string, unknown>;
}

export async function handleBuyVoidNativeExecutionRuntimeCommandV1(
  req: any,
  res: any,
): Promise<unknown> {
  if (!loopbackOnly(req, res)) return null;

  if (!enabled() && req?.body?.apply === true) {
    return res.status(503).json({
      marker: VOID_BUY_VOID_NATIVE_EXECUTION_RUNTIME_V1,
      ok: false,
      error: "native_execution_runtime_disabled",
      enabled: false,
      enable_env: ENABLE_ENV,
    });
  }

  const body = req?.body;
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return res.status(400).json({
      marker: VOID_BUY_VOID_NATIVE_EXECUTION_RUNTIME_V1,
      ok: false,
      error: "invalid_json_body",
    });
  }

  const forbiddenKey = findForbiddenInputKey(body);
  if (forbiddenKey) {
    return res.status(400).json({
      marker: VOID_BUY_VOID_NATIVE_EXECUTION_RUNTIME_V1,
      ok: false,
      error: "forbidden_execution_material",
      forbidden_key: forbiddenKey,
    });
  }

  const allowed = new Set([
    "attempt_id",
    "apply",
    "confirmation",
    "submission_idempotency_key",
    "expected_plan_fingerprint_sha256",
    "policy_fingerprint_sha256",
  ]);
  const unexpected = Object.keys(body).filter(
    (key) => !allowed.has(key),
  );
  if (unexpected.length) {
    return res.status(400).json({
      marker: VOID_BUY_VOID_NATIVE_EXECUTION_RUNTIME_V1,
      ok: false,
      error: "unexpected_input_key",
      unexpected_keys: unexpected.sort(),
    });
  }

  const policy = buyVoidNativeExecutionRuntimePolicyStateV1();
  if ("missing_envs" in policy) {
    return res.status(503).json({
      marker: VOID_BUY_VOID_NATIVE_EXECUTION_RUNTIME_V1,
      ok: false,
      error: "native_execution_policy_not_configured",
      missing_policy_envs: policy.missing_envs,
    });
  }

  const decision = await runBuyVoidNativeExecutionRuntimeCommandV1({
    runtime_policy: policy.policy,
    command: {
      attempt_id: (body as any).attempt_id,
      apply: (body as any).apply === true,
      confirmation: (body as any).confirmation,
      submission_idempotency_key:
        (body as any).submission_idempotency_key,
      expected_plan_fingerprint_sha256:
        (body as any).expected_plan_fingerprint_sha256,
      policy_fingerprint_sha256:
        (body as any).policy_fingerprint_sha256,
    },
    dependencies: externalDependencies(),
  });

  return res.status(responseStatus(decision)).json(
    buyVoidNativeExecutionRuntimeHttpJsonV1(decision),
  );
}

function mount(): void {
  const globalState: any = globalThis as any;
  const app: any = globalState.__void_http_app || globalState.app;

  if (!app || typeof app.get !== "function" || typeof app.post !== "function") {
    setTimeout(mount, 250).unref?.();
    return;
  }
  if (globalState[GLOBAL_MARK]) return;
  globalState[GLOBAL_MARK] = true;

  app.get(
    VOID_BUY_VOID_NATIVE_EXECUTION_RUNTIME_ROUTES_V1.status,
    (req: any, res: any) => {
      if (!loopbackOnly(req, res)) return;
      res.status(200).json(
        buyVoidNativeExecutionRuntimeStatusV1(),
      );
    },
  );
  app.post(
    VOID_BUY_VOID_NATIVE_EXECUTION_RUNTIME_ROUTES_V1.command,
    express.json({ limit: JSON_LIMIT }),
    (req: any, res: any) => {
      void handleBuyVoidNativeExecutionRuntimeCommandV1(
        req,
        res,
      );
    },
  );
}

mount();