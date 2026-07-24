import crypto from "node:crypto";
import {
  Transaction,
  getAddress,
} from "ethers";
import {
  listBuyVoidInventoryReservationsV1,
  type BuyVoidInventoryReservationV1,
} from "./buy_void_inventory_reservation_journal_v1.js";
import type {
  BuyVoidBoundedExecutionPlanV1,
} from "./buy_void_auto_reserve_plan_worker_v1.js";
import type {
  BuyVoidFulfillmentJournalIntentV1,
} from "./buy_void_fulfillment_journal_v1.js";
import {
  readBuyVoidExecutionAttemptV1,
  type BuyVoidExecutionAttemptPolicyV1,
  type BuyVoidExecutionAttemptStateV1,
} from "./buy_void_execution_attempt_journal_v1.js";
import {
  createBuyVoidDeliverySubmissionGuardV1,
} from "./buy_void_delivery_submission_guard_v1.js";
import {
  VOID_BUY_VOID_NATIVE_DELIVERY_SIGN_BROADCAST_CONFIRMATION_V1,
  runBuyVoidNativeDeliverySignBroadcastV1,
  type BuyVoidNativeDeliveryBroadcasterV1,
  type BuyVoidNativeDeliverySignerV1,
  type BuyVoidNativeDeliverySignBroadcastDecisionV1,
  type BuyVoidNativeDeliverySignBroadcastPolicyV1,
  type BuyVoidNativeDeliveryTransactionPlanV1,
  type BuyVoidNativeDeliveryUnsignedTransactionV1,
} from "./buy_void_native_delivery_sign_broadcast_adapter_v1.js";
import {
  VOID_BUY_VOID_PIPELINE_CONFIRMATIONS_V1,
  runBuyVoidPipelineCommandV1,
  type BuyVoidPipelineCoordinatorDecisionV1,
} from "./buy_void_pipeline_coordinator_v1.js";

export const VOID_BUY_VOID_NATIVE_EXECUTION_WORKER_V1 =
  "VOID_BUY_VOID_NATIVE_EXECUTION_WORKER_V1";

export const VOID_BUY_VOID_NATIVE_EXECUTION_CONFIRMATION_V1 =
  "buyVoidNativeExecuteReservedPlan";

export const VOID_BUY_VOID_NATIVE_EXECUTION_AUTHORITY_V1 = {
  one_request_per_run: true,
  disabled_by_policy_default: true,
  dry_by_default: true,
  exact_confirmation_required: true,
  server_controlled_root_dir: true,
  server_controlled_policy: true,
  inventory_reservation_required: true,
  bounded_execution_plan_required: true,
  execution_attempt_reservation_required: true,
  durable_submission_guard_required: true,
  signer_dependency_injected: true,
  broadcaster_dependency_injected: true,
  public_request_journal_write: false,
  inventory_decrement: false,
  inventory_release: false,
  raw_signed_transaction_persistence: false,
  raw_signed_transaction_output: false,
  automatic_retry: false,
  receipt_wait: false,
  runtime_route_mount: false,
  background_loop: false,
  startup_execution: false,
  wallet_access_when_applied: true,
  signing_when_applied: true,
  transaction_broadcast_when_applied: true,
  money_movement_when_applied: true,
} as const;

const ADDRESS = /^0x[0-9a-f]{40}$/;
const SHA256 = /^[0-9a-f]{64}$/;
const HASH = /^0x[0-9a-f]{64}$/;
const SAFE_CODE = /^[A-Za-z0-9._:-]{1,160}$/;
const RAW_TRANSACTION = /^0x[0-9a-fA-F]+$/;
const NATIVE_VALUE_MULTIPLIER = 1_000_000_000_000n;

export type BuyVoidNativeExecutionWorkerPolicyV1 = {
  enabled: boolean;
  asset_mode: "native_void";
  chain_id: "2050";
  pool_id: string;
  fulfillment_wallet_address: string;
  max_void_amount_units: string | number;
  max_gas_limit: string | number;
  max_fee_per_gas_wei: string | number;
  max_priority_fee_per_gas_wei: string | number;
};

export type BuyVoidNativeExecutionWorkerDependenciesV1 = {
  signer: BuyVoidNativeDeliverySignerV1;
  broadcaster: BuyVoidNativeDeliveryBroadcasterV1;
};

export type BuyVoidNativeExecutionWorkerInputV1 = {
  root_dir: string;
  intent: BuyVoidFulfillmentJournalIntentV1;
  bounded_plan: BuyVoidBoundedExecutionPlanV1;
  worker_policy: BuyVoidNativeExecutionWorkerPolicyV1;
  execution_policy: BuyVoidExecutionAttemptPolicyV1;
  transaction_plan: BuyVoidNativeDeliveryTransactionPlanV1;
  submission_idempotency_key?: unknown;
  apply?: boolean;
  confirmation?: unknown;
  dependencies?: BuyVoidNativeExecutionWorkerDependenciesV1;
  now_ms?: number;
};

export type BuyVoidNativeExecutionPreviewV1 = {
  schema: "void_buy_void_native_execution_preview_v1";
  marker: typeof VOID_BUY_VOID_NATIVE_EXECUTION_WORKER_V1;
  attempt_id: string;
  inventory_reservation_id: string;
  plan_id: string;
  chain_id: "2050";
  fulfillment_wallet_address: string;
  delivery_address: string;
  void_amount_units: string;
  native_value_wei: string;
  nonce: number;
  gas_limit: string;
  max_fee_per_gas_wei: string;
  max_priority_fee_per_gas_wei: string;
  public_request_journal_write_authorized: false;
  inventory_decrement_authorized: false;
  inventory_release_authorized: false;
  wallet_access_authorized: false;
  signing_authorized: false;
  transaction_broadcast_authorized: false;
  money_movement_authorized: false;
};

export type BuyVoidNativeExecutionStageV1 =
  | "worker_policy"
  | "reservation_binding"
  | "execution_attempt"
  | "signing"
  | "preparation"
  | "sign_broadcast"
  | "outcome_recording";

export type BuyVoidNativeExecutionWorkerDecisionV1 =
  | {
      ok: true;
      status: "dry_run";
      applied: false;
      mutation_performed: false;
      preview: BuyVoidNativeExecutionPreviewV1;
      required_confirmation:
        typeof VOID_BUY_VOID_NATIVE_EXECUTION_CONFIRMATION_V1;
      signing_performed: false;
      transaction_broadcast_performed: false;
      raw_signed_transaction_persisted: false;
      raw_signed_transaction_returned: false;
    }
  | {
      ok: true;
      status: "broadcast_accepted";
      applied: true;
      mutation_performed: true;
      attempt: BuyVoidExecutionAttemptStateV1;
      adapter_decision: BuyVoidNativeDeliverySignBroadcastDecisionV1 & {
        ok: true;
        status: "broadcast_accepted";
      };
      pipeline_recording: BuyVoidPipelineCoordinatorDecisionV1 & {
        ok: true;
        status: "applied";
      };
      signing_performed: true;
      transaction_broadcast_performed: true;
      raw_signed_transaction_persisted: false;
      raw_signed_transaction_returned: false;
      automatic_retry_allowed: false;
    }
  | {
      ok: false;
      status: "held" | "not_broadcast" | "broadcast_unknown";
      applied: boolean;
      mutation_performed: boolean;
      stage:
        | "worker_policy"
        | "reservation_binding"
        | "execution_attempt"
        | "signing"
        | "preparation"
        | "sign_broadcast"
        | "outcome_recording";
      reason: string;
      attempt_id: string | null;
      expected_transaction_hash: string | null;
      adapter_decision?: BuyVoidNativeDeliverySignBroadcastDecisionV1;
      pipeline_recording?: BuyVoidPipelineCoordinatorDecisionV1 | null;
      signing_performed: boolean;
      transaction_broadcast_performed: boolean;
      reconciliation_required: boolean;
      automatic_retry_allowed: false;
      raw_signed_transaction_persisted: false;
      raw_signed_transaction_returned: false;
      detail?: Record<string, unknown>;
    };

export type BuyVoidNativeExecutionWorkerHeldV1 = Extract<
  BuyVoidNativeExecutionWorkerDecisionV1,
  { ok: false }
>;

type ValidatedV1 = {
  root_dir: string;
  inventory: BuyVoidInventoryReservationV1;
  attempt: BuyVoidExecutionAttemptStateV1;
  worker_policy: BuyVoidNativeExecutionWorkerPolicyV1;
  delivery_policy: BuyVoidNativeDeliverySignBroadcastPolicyV1;
  transaction_plan: BuyVoidNativeDeliveryTransactionPlanV1;
  unsigned_transaction: BuyVoidNativeDeliveryUnsignedTransactionV1;
  preview: BuyVoidNativeExecutionPreviewV1;
};

function held(
  stage: BuyVoidNativeExecutionStageV1,
  options: {
    status?: "held" | "not_broadcast" | "broadcast_unknown";
    applied?: boolean;
    mutation_performed?: boolean;
    reason: string;
    attempt_id?: string | null;
    expected_transaction_hash?: string | null;
    adapter_decision?: BuyVoidNativeDeliverySignBroadcastDecisionV1;
    pipeline_recording?: BuyVoidPipelineCoordinatorDecisionV1 | null;
    signing_performed?: boolean;
    transaction_broadcast_performed?: boolean;
    reconciliation_required?: boolean;
    detail?: Record<string, unknown>;
  },
): BuyVoidNativeExecutionWorkerHeldV1 {
  return {
    ok: false,
    status: options.status || "held",
    applied: options.applied === true,
    mutation_performed: options.mutation_performed === true,
    stage,
    reason: options.reason,
    attempt_id: options.attempt_id ?? null,
    expected_transaction_hash:
      options.expected_transaction_hash ?? null,
    ...(options.adapter_decision
      ? { adapter_decision: options.adapter_decision }
      : {}),
    ...(options.pipeline_recording !== undefined
      ? { pipeline_recording: options.pipeline_recording }
      : {}),
    signing_performed: options.signing_performed === true,
    transaction_broadcast_performed:
      options.transaction_broadcast_performed === true,
    reconciliation_required:
      options.reconciliation_required === true,
    automatic_retry_allowed: false,
    raw_signed_transaction_persisted: false,
    raw_signed_transaction_returned: false,
    ...(options.detail ? { detail: options.detail } : {}),
  };
}

function normalizeAddress(value: unknown): string {
  const raw = String(value || "").trim();
  if (!/^0x[0-9a-fA-F]{40}$/.test(raw)) return "";
  try {
    const normalized = getAddress(raw).toLowerCase();
    return ADDRESS.test(normalized) ? normalized : "";
  } catch {
    return "";
  }
}

function parsePositive(value: unknown): bigint | null {
  if (typeof value === "bigint") return value > 0n ? value : null;
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value) || value <= 0) return null;
    return BigInt(value);
  }
  const raw = String(value ?? "").trim();
  if (!/^[0-9]+$/.test(raw)) return null;
  try {
    const parsed = BigInt(raw);
    return parsed > 0n ? parsed : null;
  } catch {
    return null;
  }
}

function parseNonNegative(value: unknown): bigint | null {
  if (typeof value === "bigint") return value >= 0n ? value : null;
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value) || value < 0) return null;
    return BigInt(value);
  }
  const raw = String(value ?? "").trim();
  if (!/^[0-9]+$/.test(raw)) return null;
  try {
    const parsed = BigInt(raw);
    return parsed >= 0n ? parsed : null;
  } catch {
    return null;
  }
}

function safeNumber(value: bigint): number | null {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
}

function sha256Hex(value: string): string {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function validateInput(
  input: BuyVoidNativeExecutionWorkerInputV1,
): ValidatedV1 | BuyVoidNativeExecutionWorkerHeldV1 {
  const policy = input?.worker_policy;
  if (!policy || policy.enabled !== true) {
    return held("worker_policy", {
      applied: input?.apply === true,
      reason: "native_execution_worker_disabled",
    });
  }
  if (
    policy.asset_mode !== "native_void" ||
    policy.chain_id !== "2050" ||
    !SAFE_CODE.test(String(policy.pool_id || ""))
  ) {
    return held("worker_policy", {
      applied: input?.apply === true,
      reason: "invalid_native_execution_policy",
    });
  }

  const wallet = normalizeAddress(
    policy.fulfillment_wallet_address,
  );
  if (!wallet) {
    return held("worker_policy", {
      applied: input?.apply === true,
      reason: "invalid_fulfillment_wallet_address",
    });
  }

  const plan = input?.bounded_plan;
  const intent = input?.intent;
  if (
    !plan ||
    plan.schema !== "void_buy_void_bounded_execution_plan_v1" ||
    !SHA256.test(String(plan.plan_id || "")) ||
    !SHA256.test(String(plan.inventory_reservation_id || "")) ||
    !SHA256.test(String(plan.execution_attempt_id || "")) ||
    plan.inventory_reservation_committed !== true ||
    plan.execution_attempt_committed !== true ||
    plan.execution_chain_id !== "2050" ||
    plan.max_attempts_per_payment !== 1 ||
    plan.signing_authorized !== false ||
    plan.transaction_broadcast_authorized !== false ||
    plan.money_movement_authorized !== false
  ) {
    return held("reservation_binding", {
      applied: input?.apply === true,
      reason: "invalid_bounded_execution_plan",
    });
  }

  if (
    !intent ||
    !SHA256.test(String(intent.payment_key_sha256 || "")) ||
    !SHA256.test(String(intent.request_key_sha256 || "")) ||
    intent.claim?.status !== "claimed" ||
    intent.signing_authorized !== false ||
    intent.transaction_broadcast_authorized !== false ||
    intent.money_movement_authorized !== false
  ) {
    return held("reservation_binding", {
      applied: input?.apply === true,
      reason: "invalid_fulfillment_intent",
    });
  }

  const rootDir = String(input?.root_dir || "").trim();
  if (!rootDir || rootDir.includes("\0")) {
    return held("worker_policy", {
      applied: input?.apply === true,
      reason: "invalid_native_execution_root",
    });
  }

  let reservations: BuyVoidInventoryReservationV1[];
  try {
    reservations = listBuyVoidInventoryReservationsV1({
      root_dir: rootDir,
      pool_id: policy.pool_id,
    });
  } catch (error) {
    return held("reservation_binding", {
      applied: input?.apply === true,
      reason: "inventory_reservation_read_failed",
      detail: {
        message: String((error as Error)?.message || error),
      },
    });
  }

  const inventory = reservations.find(
    (item) =>
      item.reservation_id === plan.inventory_reservation_id,
  );
  if (!inventory) {
    return held("reservation_binding", {
      applied: input?.apply === true,
      reason: "inventory_reservation_not_found",
    });
  }

  const deliveryAddress = normalizeAddress(
    intent.claim.unsigned_instruction.delivery_address,
  );
  const amount = parsePositive(
    intent.claim.unsigned_instruction.void_amount_units,
  );
  const maxAmount = parsePositive(policy.max_void_amount_units);
  if (
    !deliveryAddress ||
    deliveryAddress === wallet ||
    amount === null ||
    maxAmount === null ||
    amount > maxAmount ||
    inventory.pool_id !== policy.pool_id ||
    inventory.payment_key_sha256 !== intent.payment_key_sha256 ||
    inventory.request_key_sha256 !== intent.request_key_sha256 ||
    inventory.canonical_payment_identity !==
      intent.claim.canonical_payment_identity ||
    inventory.request_id !== intent.claim.request_id ||
    inventory.instruction_id !== intent.claim.instruction_id ||
    inventory.delivery_address !== deliveryAddress ||
    inventory.reserved_void_units !== amount.toString() ||
    inventory.reservation_status !== "reserved" ||
    inventory.inventory_decrement_performed !== false ||
    inventory.reservation_release_authorized !== false ||
    inventory.signing_authorized_by_this_module !== false ||
    inventory.transaction_broadcast_authorized_by_this_module !== false ||
    inventory.money_movement_authorized_by_this_module !== false ||
    plan.request_id !== intent.claim.request_id ||
    plan.canonical_payment_identity !==
      intent.claim.canonical_payment_identity ||
    plan.instruction_id !== intent.claim.instruction_id ||
    plan.pool_id !== policy.pool_id ||
    plan.delivery_address !== deliveryAddress ||
    plan.void_amount_units !== amount.toString()
  ) {
    return held("reservation_binding", {
      applied: input?.apply === true,
      reason: "inventory_plan_binding_mismatch",
    });
  }

  const executionPolicy = input?.execution_policy;
  if (
    executionPolicy?.attempt_journal_enabled !== true ||
    String(executionPolicy.chain_id ?? "").trim() !== "2050" ||
    String(executionPolicy.max_attempts_per_payment ?? "").trim() !== "1"
  ) {
    return held("execution_attempt", {
      applied: input?.apply === true,
      reason: "invalid_execution_attempt_policy",
    });
  }
  const allowlist = new Set(
    (executionPolicy.fulfillment_wallet_allowlist || [])
      .map(normalizeAddress)
      .filter(Boolean),
  );
  if (!allowlist.has(wallet)) {
    return held("execution_attempt", {
      applied: input?.apply === true,
      reason: "fulfillment_wallet_not_allowlisted",
    });
  }

  const attempt = readBuyVoidExecutionAttemptV1({
    root_dir: rootDir,
    attempt_id: plan.execution_attempt_id,
  });
  if (!attempt) {
    return held("execution_attempt", {
      applied: input?.apply === true,
      reason: "execution_attempt_not_found",
      attempt_id: plan.execution_attempt_id,
    });
  }
  if (
    !["reserved", "prepared"].includes(attempt.status) ||
    attempt.broadcast ||
    attempt.failure ||
    attempt.postbroadcast_failure ||
    attempt.confirmation ||
    attempt.reservation.attempt_id !== plan.execution_attempt_id ||
    attempt.reservation.attempt_number !== 1 ||
    attempt.reservation.canonical_payment_identity !==
      intent.claim.canonical_payment_identity ||
    attempt.reservation.request_id !== intent.claim.request_id ||
    attempt.reservation.instruction_id !== intent.claim.instruction_id ||
    attempt.reservation.unsigned_instruction.delivery_address !==
      intent.claim.unsigned_instruction.delivery_address ||
    String(attempt.reservation.unsigned_instruction.void_amount_units) !==
      amount.toString()
  ) {
    return held("execution_attempt", {
      applied: input?.apply === true,
      reason: "execution_attempt_not_clean_or_binding_mismatch",
      attempt_id: plan.execution_attempt_id,
    });
  }

  const txPlan = input?.transaction_plan;
  const chainId = parsePositive(txPlan?.chain_id);
  const nonceValue = parseNonNegative(txPlan?.nonce);
  const nonce = nonceValue === null ? null : safeNumber(nonceValue);
  const gasLimit = parsePositive(txPlan?.gas_limit);
  const gasCap = parsePositive(policy.max_gas_limit);
  const maxFee = parsePositive(txPlan?.max_fee_per_gas_wei);
  const maxFeeCap = parsePositive(policy.max_fee_per_gas_wei);
  const priority = parseNonNegative(
    txPlan?.max_priority_fee_per_gas_wei,
  );
  const priorityCap = parseNonNegative(
    policy.max_priority_fee_per_gas_wei,
  );
  if (
    chainId !== 2050n ||
    nonce === null ||
    gasLimit === null ||
    gasCap === null ||
    gasLimit > gasCap ||
    maxFee === null ||
    maxFeeCap === null ||
    maxFee > maxFeeCap ||
    priority === null ||
    priorityCap === null ||
    priority > priorityCap ||
    priority > maxFee
  ) {
    return held("worker_policy", {
      applied: input?.apply === true,
      reason: "native_transaction_plan_out_of_policy",
      attempt_id: plan.execution_attempt_id,
    });
  }

  const nativeValue = amount * NATIVE_VALUE_MULTIPLIER;
  const unsigned: BuyVoidNativeDeliveryUnsignedTransactionV1 = {
    type: 2,
    chainId: 2050n,
    nonce,
    gasLimit,
    maxFeePerGas: maxFee,
    maxPriorityFeePerGas: priority,
    to: deliveryAddress,
    value: nativeValue,
    data: "0x",
  };

  const deliveryPolicy: BuyVoidNativeDeliverySignBroadcastPolicyV1 = {
    enabled: true,
    asset_mode: "native_void",
    chain_id: "2050",
    fulfillment_wallet_address: wallet,
    max_void_amount_units: maxAmount.toString(),
    max_gas_limit: gasCap.toString(),
    max_fee_per_gas_wei: maxFeeCap.toString(),
    max_priority_fee_per_gas_wei: priorityCap.toString(),
  };

  const preview: BuyVoidNativeExecutionPreviewV1 = {
    schema: "void_buy_void_native_execution_preview_v1",
    marker: VOID_BUY_VOID_NATIVE_EXECUTION_WORKER_V1,
    attempt_id: attempt.reservation.attempt_id,
    inventory_reservation_id: inventory.reservation_id,
    plan_id: plan.plan_id,
    chain_id: "2050",
    fulfillment_wallet_address: wallet,
    delivery_address: deliveryAddress,
    void_amount_units: amount.toString(),
    native_value_wei: nativeValue.toString(),
    nonce,
    gas_limit: gasLimit.toString(),
    max_fee_per_gas_wei: maxFee.toString(),
    max_priority_fee_per_gas_wei: priority.toString(),
    public_request_journal_write_authorized: false,
    inventory_decrement_authorized: false,
    inventory_release_authorized: false,
    wallet_access_authorized: false,
    signing_authorized: false,
    transaction_broadcast_authorized: false,
    money_movement_authorized: false,
  };

  return {
    root_dir: rootDir,
    inventory,
    attempt,
    worker_policy: policy,
    delivery_policy: deliveryPolicy,
    transaction_plan: txPlan,
    unsigned_transaction: unsigned,
    preview,
  };
}

function validateSignedTransaction(input: {
  raw: string;
  expected: BuyVoidNativeDeliveryUnsignedTransactionV1;
  expected_wallet: string;
}):
  | { ok: true; transaction_hash: string }
  | { ok: false; reason: string; detail?: Record<string, unknown> } {
  if (!RAW_TRANSACTION.test(input.raw)) {
    return { ok: false, reason: "invalid_raw_signed_transaction" };
  }
  try {
    const transaction = Transaction.from(input.raw);
    const from = normalizeAddress(transaction.from);
    const to = normalizeAddress(transaction.to);
    const hash = String(transaction.hash || "").toLowerCase();
    if (
      transaction.type !== 2 ||
      transaction.chainId !== input.expected.chainId ||
      transaction.nonce !== input.expected.nonce ||
      transaction.gasLimit !== input.expected.gasLimit ||
      transaction.maxFeePerGas !== input.expected.maxFeePerGas ||
      transaction.maxPriorityFeePerGas !==
        input.expected.maxPriorityFeePerGas ||
      to !== input.expected.to ||
      transaction.value !== input.expected.value ||
      String(transaction.data || "").toLowerCase() !== "0x" ||
      from !== input.expected_wallet ||
      !HASH.test(hash)
    ) {
      return {
        ok: false,
        reason: "signed_transaction_binding_mismatch",
      };
    }
    return { ok: true, transaction_hash: hash };
  } catch (error) {
    return {
      ok: false,
      reason: "signed_transaction_parse_failed",
      detail: {
        error_class: String((error as any)?.name || "Error").slice(0, 80),
      },
    };
  }
}

function outcomeCommand(
  rootDir: string,
  decision: BuyVoidNativeDeliverySignBroadcastDecisionV1,
): Record<string, unknown> | null {
  if (!("reason" in decision)) {
    if (decision.status !== "broadcast_accepted") return null;
    return {
      action: "record_broadcast_accepted",
      root_dir: rootDir,
      attempt_id: decision.attempt_id,
      transaction_hash: decision.transaction_hash,
      provider_submission_id: decision.provider_submission_id,
      apply: true,
      confirmation:
        VOID_BUY_VOID_PIPELINE_CONFIRMATIONS_V1
          .record_broadcast_accepted,
    };
  }
  if (decision.status === "not_broadcast") {
    return {
      action: "record_not_broadcast",
      root_dir: rootDir,
      attempt_id: decision.attempt_id,
      transaction_hash: decision.expected_transaction_hash,
      reason_code: decision.reason,
      provider_submission_id: decision.provider_submission_id,
      detail: decision.detail || {},
      apply: true,
      confirmation:
        VOID_BUY_VOID_PIPELINE_CONFIRMATIONS_V1
          .record_not_broadcast,
    };
  }
  if (decision.status === "broadcast_unknown") {
    return {
      action: "record_broadcast_unknown",
      root_dir: rootDir,
      attempt_id: decision.attempt_id,
      transaction_hash: decision.expected_transaction_hash,
      reason_code: decision.reason,
      provider_submission_id: decision.provider_submission_id,
      apply: true,
      confirmation:
        VOID_BUY_VOID_PIPELINE_CONFIRMATIONS_V1
          .record_broadcast_unknown,
    };
  }
  return null;
}

export async function runBuyVoidNativeExecutionWorkerV1(
  input: BuyVoidNativeExecutionWorkerInputV1,
): Promise<BuyVoidNativeExecutionWorkerDecisionV1> {
  const validated = validateInput(input);
  if ("reason" in validated) return validated;

  if (input.apply !== true) {
    return {
      ok: true,
      status: "dry_run",
      applied: false,
      mutation_performed: false,
      preview: validated.preview,
      required_confirmation:
        VOID_BUY_VOID_NATIVE_EXECUTION_CONFIRMATION_V1,
      signing_performed: false,
      transaction_broadcast_performed: false,
      raw_signed_transaction_persisted: false,
      raw_signed_transaction_returned: false,
    };
  }

  if (
    String(input.confirmation || "") !==
      VOID_BUY_VOID_NATIVE_EXECUTION_CONFIRMATION_V1
  ) {
    return held("worker_policy", {
      applied: true,
      reason: "explicit_confirmation_required",
      attempt_id: validated.attempt.reservation.attempt_id,
      detail: {
        required_confirmation:
          VOID_BUY_VOID_NATIVE_EXECUTION_CONFIRMATION_V1,
      },
    });
  }

  const dependencies = input.dependencies;
  if (
    !dependencies ||
    typeof dependencies.signer?.get_address !== "function" ||
    typeof dependencies.signer?.sign_transaction !== "function" ||
    typeof dependencies.broadcaster?.broadcast_signed_transaction !==
      "function"
  ) {
    return held("worker_policy", {
      applied: true,
      reason: "native_execution_dependencies_required",
      attempt_id: validated.attempt.reservation.attempt_id,
    });
  }

  const submissionKey = String(
    input.submission_idempotency_key || "",
  ).trim().toLowerCase();
  if (!SHA256.test(submissionKey)) {
    return held("worker_policy", {
      applied: true,
      reason: "invalid_submission_idempotency_key",
      attempt_id: validated.attempt.reservation.attempt_id,
    });
  }

  let signerAddress = "";
  try {
    signerAddress = normalizeAddress(
      await dependencies.signer.get_address(),
    );
  } catch (error) {
    return held("signing", {
      applied: true,
      reason: "signer_address_read_failed",
      attempt_id: validated.attempt.reservation.attempt_id,
      detail: {
        error_class: String((error as any)?.name || "Error").slice(0, 80),
      },
    });
  }
  if (
    signerAddress !==
      normalizeAddress(
        validated.worker_policy.fulfillment_wallet_address,
      )
  ) {
    return held("signing", {
      applied: true,
      reason: "signer_address_mismatch",
      attempt_id: validated.attempt.reservation.attempt_id,
    });
  }

  let rawSignedTransaction = "";
  try {
    rawSignedTransaction = await dependencies.signer.sign_transaction(
      validated.unsigned_transaction,
    );
  } catch (error) {
    return held("signing", {
      applied: true,
      reason: "native_transaction_signing_failed",
      attempt_id: validated.attempt.reservation.attempt_id,
      detail: {
        error_class: String((error as any)?.name || "Error").slice(0, 80),
      },
    });
  }

  const signed = validateSignedTransaction({
    raw: rawSignedTransaction,
    expected: validated.unsigned_transaction,
    expected_wallet: signerAddress,
  });
  if ("reason" in signed) {
    rawSignedTransaction = "";
    return held("signing", {
      applied: true,
      reason: signed.reason,
      attempt_id: validated.attempt.reservation.attempt_id,
      signing_performed: true,
      detail: signed.detail,
    });
  }

  let prepared = validated.attempt;
  if (prepared.status === "reserved") {
    const prepare = runBuyVoidPipelineCommandV1({
      action: "prepare_execution",
      root_dir: validated.root_dir,
      attempt_id: prepared.reservation.attempt_id,
      intent: input.intent,
      execution_policy: input.execution_policy,
      transaction: {
        chain_id: "2050",
        transaction_hash: signed.transaction_hash,
        from_address: signerAddress,
        to_address: validated.preview.delivery_address,
        amount_units: validated.preview.void_amount_units,
      },
      apply: true,
      confirmation:
        VOID_BUY_VOID_PIPELINE_CONFIRMATIONS_V1.prepare_execution,
      now_ms: input.now_ms,
    });
    if ("reason" in prepare) {
      rawSignedTransaction = "";
      return held("preparation", {
        applied: true,
        mutation_performed: false,
        reason: prepare.reason,
        attempt_id: prepared.reservation.attempt_id,
        expected_transaction_hash: signed.transaction_hash,
        signing_performed: true,
        pipeline_recording: prepare,
        detail: prepare.detail,
      });
    }
    const reread = readBuyVoidExecutionAttemptV1({
      root_dir: validated.root_dir,
      attempt_id: prepared.reservation.attempt_id,
    });
    if (!reread || reread.status !== "prepared" || !reread.prepared) {
      rawSignedTransaction = "";
      return held("preparation", {
        applied: true,
        mutation_performed: true,
        reason: "prepared_execution_attempt_unreadable",
        attempt_id: prepared.reservation.attempt_id,
        expected_transaction_hash: signed.transaction_hash,
        signing_performed: true,
      });
    }
    prepared = reread;
  }

  if (
    prepared.status !== "prepared" ||
    !prepared.prepared ||
    prepared.prepared.void_delivery_tx_hash !==
      signed.transaction_hash ||
    prepared.prepared.fulfillment_wallet !== signerAddress ||
    prepared.prepared.delivery_address !==
      validated.preview.delivery_address ||
    prepared.prepared.void_amount_units !==
      validated.preview.void_amount_units
  ) {
    rawSignedTransaction = "";
    return held("preparation", {
      applied: true,
      mutation_performed: false,
      reason: "prepared_transaction_binding_mismatch",
      attempt_id: prepared.reservation.attempt_id,
      expected_transaction_hash: signed.transaction_hash,
      signing_performed: true,
    });
  }

  const replaySigner: BuyVoidNativeDeliverySignerV1 = {
    async get_address(): Promise<string> {
      return signerAddress;
    },
    async sign_transaction(): Promise<string> {
      return rawSignedTransaction;
    },
  };

  const adapterDecision = await runBuyVoidNativeDeliverySignBroadcastV1({
    apply: true,
    confirmation:
      VOID_BUY_VOID_NATIVE_DELIVERY_SIGN_BROADCAST_CONFIRMATION_V1,
    submission_idempotency_key: submissionKey,
    attempt: prepared,
    policy: validated.delivery_policy,
    plan: validated.transaction_plan,
    dependencies: {
      submission_guard: createBuyVoidDeliverySubmissionGuardV1(
        validated.root_dir,
      ),
      signer: replaySigner,
      broadcaster: dependencies.broadcaster,
    },
  });
  rawSignedTransaction = "";

  const command = outcomeCommand(
    validated.root_dir,
    adapterDecision,
  );
  let pipelineRecording: BuyVoidPipelineCoordinatorDecisionV1 | null = null;
  if (command) {
    pipelineRecording = runBuyVoidPipelineCommandV1(command as any);
    if ("reason" in pipelineRecording) {
      return held("outcome_recording", {
        status:
          "reason" in adapterDecision
            ? adapterDecision.status
            : "broadcast_unknown",
        applied: true,
        mutation_performed: true,
        reason: "native_execution_outcome_recording_failed",
        attempt_id:
          "reason" in adapterDecision
            ? adapterDecision.attempt_id
            : adapterDecision.attempt_id,
        expected_transaction_hash:
          "reason" in adapterDecision
            ? adapterDecision.expected_transaction_hash
            : adapterDecision.transaction_hash,
        adapter_decision: adapterDecision,
        pipeline_recording: pipelineRecording,
        signing_performed: true,
        transaction_broadcast_performed:
          adapterDecision.broadcast_call_performed === true,
        reconciliation_required: true,
        detail: {
          recording_reason: pipelineRecording.reason,
        },
      });
    }
  }

  if ("reason" in adapterDecision) {
    return held("sign_broadcast", {
      status: adapterDecision.status,
      applied: true,
      mutation_performed: true,
      reason: adapterDecision.reason,
      attempt_id: adapterDecision.attempt_id,
      expected_transaction_hash:
        adapterDecision.expected_transaction_hash,
      adapter_decision: adapterDecision,
      pipeline_recording: pipelineRecording,
      signing_performed: adapterDecision.signing_performed,
      transaction_broadcast_performed:
        adapterDecision.broadcast_call_performed,
      reconciliation_required:
        adapterDecision.reconciliation_required,
      detail: adapterDecision.detail,
    });
  }

  if (adapterDecision.status !== "broadcast_accepted") {
    return held("sign_broadcast", {
      applied: true,
      mutation_performed: true,
      reason: "unexpected_native_execution_adapter_status",
      attempt_id: adapterDecision.attempt_id,
      expected_transaction_hash: adapterDecision.transaction_hash,
      adapter_decision: adapterDecision,
      pipeline_recording: pipelineRecording,
      signing_performed: adapterDecision.signing_performed,
      transaction_broadcast_performed:
        adapterDecision.broadcast_call_performed,
      reconciliation_required: true,
    });
  }

  if (!pipelineRecording || "reason" in pipelineRecording) {
    return held("outcome_recording", {
      status: "broadcast_unknown",
      applied: true,
      mutation_performed: true,
      reason: "broadcast_accepted_recording_missing",
      attempt_id: adapterDecision.attempt_id,
      expected_transaction_hash: adapterDecision.transaction_hash,
      adapter_decision: adapterDecision,
      pipeline_recording: pipelineRecording,
      signing_performed: true,
      transaction_broadcast_performed: true,
      reconciliation_required: true,
    });
  }

  const finalAttempt = readBuyVoidExecutionAttemptV1({
    root_dir: validated.root_dir,
    attempt_id: adapterDecision.attempt_id,
  });
  if (!finalAttempt || finalAttempt.status !== "broadcast") {
    return held("outcome_recording", {
      status: "broadcast_unknown",
      applied: true,
      mutation_performed: true,
      reason: "broadcast_attempt_state_unreadable",
      attempt_id: adapterDecision.attempt_id,
      expected_transaction_hash: adapterDecision.transaction_hash,
      adapter_decision: adapterDecision,
      pipeline_recording: pipelineRecording,
      signing_performed: true,
      transaction_broadcast_performed: true,
      reconciliation_required: true,
    });
  }

  return {
    ok: true,
    status: "broadcast_accepted",
    applied: true,
    mutation_performed: true,
    attempt: finalAttempt,
    adapter_decision: adapterDecision as
      BuyVoidNativeDeliverySignBroadcastDecisionV1 & {
        ok: true;
        status: "broadcast_accepted";
      },
    pipeline_recording: pipelineRecording as
      BuyVoidPipelineCoordinatorDecisionV1 & {
        ok: true;
        status: "applied";
      },
    signing_performed: true,
    transaction_broadcast_performed: true,
    raw_signed_transaction_persisted: false,
    raw_signed_transaction_returned: false,
    automatic_retry_allowed: false,
  };
}
