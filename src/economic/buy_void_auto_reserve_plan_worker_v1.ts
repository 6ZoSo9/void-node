import crypto from "node:crypto";
import {
  listBuyVoidExecutionAttemptsV1,
  reserveBuyVoidExecutionAttemptV1,
  type BuyVoidExecutionAttemptPolicyV1,
  type BuyVoidExecutionAttemptStateV1,
} from "./buy_void_execution_attempt_journal_v1.js";
import type {
  BuyVoidFulfillmentJournalIntentV1,
} from "./buy_void_fulfillment_journal_v1.js";
import {
  reserveBuyVoidInventoryV1,
  type BuyVoidInventoryReservationDecisionV1,
  type BuyVoidInventoryReservationPolicyV1,
  type BuyVoidInventoryReservationV1,
} from "./buy_void_inventory_reservation_journal_v1.js";

export const VOID_BUY_VOID_AUTO_RESERVE_PLAN_WORKER_V1 =
  "VOID_BUY_VOID_AUTO_RESERVE_PLAN_WORKER_V1";

export const VOID_BUY_VOID_AUTO_RESERVE_PLAN_CONFIRMATION_V1 =
  "buyVoidAutoReservePlan";

export const VOID_BUY_VOID_AUTO_RESERVE_PLAN_AUTHORITY_V1 = {
  one_request_per_run: true,
  disabled_by_policy_default: true,
  dry_by_default: true,
  exact_confirmation_required: true,
  server_controlled_policy: true,
  fulfillment_claim_required: true,
  aggregate_inventory_reservation_on_apply: true,
  execution_attempt_reservation_on_apply: true,
  request_journal_write: false,
  inventory_decrement: false,
  inventory_release: false,
  wallet_access: false,
  signing: false,
  transaction_broadcast: false,
  runtime_route_mount: false,
  background_loop: false,
  money_movement: false,
} as const;

const SAFE_CODE = /^[A-Za-z0-9._:-]{1,160}$/;
const SHA256 = /^[0-9a-f]{64}$/;
const ADDRESS = /^0x[0-9a-f]{40}$/;

export type BuyVoidAutoReservePlanWorkerPolicyV1 = {
  enabled: boolean;
  accepted_claim_status: "claimed";
  execution_chain_id: "2050";
  max_attempts_per_payment: 1;
  max_void_amount_units: string | number;
};

export type BuyVoidBoundedExecutionPlanV1 = {
  schema: "void_buy_void_bounded_execution_plan_v1";
  marker: typeof VOID_BUY_VOID_AUTO_RESERVE_PLAN_WORKER_V1;
  plan_id: string;
  created_at_ms: number;
  request_id: string;
  canonical_payment_identity: string;
  instruction_id: string;
  pool_id: string;
  inventory_reservation_id: string;
  inventory_reservation_committed: boolean;
  execution_attempt_id: string;
  execution_attempt_number: number;
  execution_attempt_committed: boolean;
  execution_chain_id: "2050";
  max_attempts_per_payment: 1;
  fulfillment_wallet_allowlist_count: number;
  delivery_address: string;
  void_amount_units: string;
  request_journal_write_authorized: false;
  inventory_decrement_authorized: false;
  inventory_release_authorized: false;
  wallet_access_authorized: false;
  signing_authorized: false;
  transaction_broadcast_authorized: false;
  automatic_delivery_authorized: false;
  money_movement_authorized: false;
};

export type BuyVoidAutoReservePlanWorkerDecisionV1 =
  | {
      ok: true;
      status: "dry_run";
      applied: false;
      mutation_performed: false;
      inventory: BuyVoidInventoryReservationDecisionV1 & {
        ok: true;
        status: "available";
      };
      plan: BuyVoidBoundedExecutionPlanV1;
      required_confirmation:
        typeof VOID_BUY_VOID_AUTO_RESERVE_PLAN_CONFIRMATION_V1;
    }
  | {
      ok: true;
      status: "planned" | "duplicate";
      applied: true;
      mutation_performed: boolean;
      inventory: BuyVoidInventoryReservationDecisionV1 & {
        ok: true;
      };
      execution_attempt: BuyVoidExecutionAttemptStateV1;
      plan: BuyVoidBoundedExecutionPlanV1;
    }
  | {
      ok: false;
      status: "held";
      applied: boolean;
      mutation_performed: boolean;
      stage:
        | "worker_policy"
        | "inventory_reservation"
        | "execution_attempt";
      reason: string;
      inventory?: BuyVoidInventoryReservationDecisionV1 & {
        ok: true;
      };
      detail?: Record<string, unknown>;
    };

function held(
  stage:
    | "worker_policy"
    | "inventory_reservation"
    | "execution_attempt",
  applied: boolean,
  mutationPerformed: boolean,
  reason: string,
  detail?: Record<string, unknown>,
  inventory?: BuyVoidInventoryReservationDecisionV1 & {
    ok: true;
  },
): BuyVoidAutoReservePlanWorkerDecisionV1 {
  return {
    ok: false,
    status: "held",
    applied,
    mutation_performed: mutationPerformed,
    stage,
    reason,
    ...(inventory ? { inventory } : {}),
    ...(detail ? { detail } : {}),
  };
}

function sha256Hex(value: string): string {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function safeNow(value: unknown): number {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : Date.now();
}

function parsePositiveInteger(value: unknown): bigint | null {
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

function normalizeAddress(value: unknown): string {
  const address = String(value || "").trim().toLowerCase();
  return ADDRESS.test(address) ? address : "";
}

function validateWorkerInput(input: {
  intent: BuyVoidFulfillmentJournalIntentV1;
  worker_policy: BuyVoidAutoReservePlanWorkerPolicyV1;
  execution_policy: BuyVoidExecutionAttemptPolicyV1;
}):
  | {
      ok: true;
      amount: bigint;
      wallet_allowlist_count: number;
    }
  | { ok: false; reason: string; detail?: Record<string, unknown> } {
  const policy = input?.worker_policy;
  const intent = input?.intent;
  const executionPolicy = input?.execution_policy;

  if (!policy || policy.enabled !== true) {
    return { ok: false, reason: "auto_reserve_plan_worker_disabled" };
  }
  if (policy.accepted_claim_status !== "claimed") {
    return { ok: false, reason: "invalid_claim_status_policy" };
  }
  if (intent?.claim?.status !== policy.accepted_claim_status) {
    return { ok: false, reason: "fulfillment_claim_not_ready" };
  }
  if (
    policy.execution_chain_id !== "2050" ||
    policy.max_attempts_per_payment !== 1
  ) {
    return { ok: false, reason: "invalid_bounded_execution_policy" };
  }
  if (
    !intent ||
    !SHA256.test(String(intent.payment_key_sha256 || "")) ||
    !SHA256.test(String(intent.request_key_sha256 || "")) ||
    !SAFE_CODE.test(String(intent.claim?.request_id || "")) ||
    !SAFE_CODE.test(String(intent.claim?.instruction_id || "")) ||
    !normalizeAddress(
      intent.claim?.unsigned_instruction?.delivery_address,
    )
  ) {
    return { ok: false, reason: "invalid_fulfillment_intent" };
  }
  if (
    intent.signing_authorized !== false ||
    intent.transaction_broadcast_authorized !== false ||
    intent.money_movement_authorized !== false
  ) {
    return { ok: false, reason: "fulfillment_intent_authority_present" };
  }

  const amount = parsePositiveInteger(
    intent.claim?.unsigned_instruction?.void_amount_units,
  );
  const maximum = parsePositiveInteger(
    policy.max_void_amount_units,
  );
  if (amount === null || maximum === null) {
    return { ok: false, reason: "invalid_auto_reserve_amount_policy" };
  }
  if (amount > maximum) {
    return {
      ok: false,
      reason: "auto_reserve_amount_exceeds_policy",
      detail: {
        request_void_amount_units: amount.toString(),
        max_void_amount_units: maximum.toString(),
      },
    };
  }

  if (executionPolicy?.attempt_journal_enabled !== true) {
    return { ok: false, reason: "execution_attempt_journal_disabled" };
  }
  if (
    String(executionPolicy.chain_id ?? "").trim() !==
      policy.execution_chain_id
  ) {
    return { ok: false, reason: "execution_chain_policy_mismatch" };
  }
  if (
    String(executionPolicy.max_attempts_per_payment ?? "").trim() !==
      String(policy.max_attempts_per_payment)
  ) {
    return { ok: false, reason: "execution_attempt_cap_policy_mismatch" };
  }

  const wallets = new Set(
    (executionPolicy.fulfillment_wallet_allowlist || [])
      .map(normalizeAddress)
      .filter(Boolean),
  );
  if (wallets.size === 0) {
    return { ok: false, reason: "empty_fulfillment_wallet_allowlist" };
  }

  return {
    ok: true,
    amount,
    wallet_allowlist_count: wallets.size,
  };
}

function expectedFirstAttemptId(
  intent: BuyVoidFulfillmentJournalIntentV1,
): string {
  return sha256Hex(
    [
      "void-buy-execution-attempt-v1",
      intent.payment_key_sha256,
      intent.claim.instruction_id,
      "1",
    ].join("\n"),
  );
}

function matchingAttempts(
  rootDir: string,
  intent: BuyVoidFulfillmentJournalIntentV1,
): BuyVoidExecutionAttemptStateV1[] {
  return listBuyVoidExecutionAttemptsV1(rootDir).filter(
    (state) =>
      state.reservation.canonical_payment_identity ===
        intent.claim.canonical_payment_identity ||
      state.reservation.request_id === intent.claim.request_id ||
      state.reservation.instruction_id ===
        intent.claim.instruction_id,
  );
}

function previewAttempt(
  rootDir: string,
  intent: BuyVoidFulfillmentJournalIntentV1,
):
  | {
      ok: true;
      attempt_id: string;
      attempt_number: 1;
      duplicate: boolean;
    }
  | {
      ok: false;
      reason: string;
      detail?: Record<string, unknown>;
    } {
  let attempts: BuyVoidExecutionAttemptStateV1[];
  try {
    attempts = matchingAttempts(rootDir, intent);
  } catch (error) {
    return {
      ok: false,
      reason: "execution_attempt_read_failed",
      detail: {
        message: String((error as Error)?.message || error),
      },
    };
  }

  for (const state of attempts) {
    if (
      state.reservation.canonical_payment_identity !==
        intent.claim.canonical_payment_identity ||
      state.reservation.request_id !== intent.claim.request_id ||
      state.reservation.instruction_id !==
        intent.claim.instruction_id
    ) {
      return {
        ok: false,
        reason: "execution_attempt_identity_conflict",
        detail: {
          attempt_id: state.reservation.attempt_id,
        },
      };
    }
  }

  const confirmed = attempts.find(
    (state) => state.status === "confirmed",
  );
  if (confirmed) {
    return {
      ok: false,
      reason: "payment_already_confirmed",
      detail: {
        attempt_id: confirmed.reservation.attempt_id,
      },
    };
  }

  const active = attempts.find((state) =>
    ["reserved", "prepared", "broadcast"].includes(state.status)
  );
  if (active) {
    if (active.reservation.attempt_number !== 1) {
      return {
        ok: false,
        reason: "unexpected_execution_attempt_number",
      };
    }
    return {
      ok: true,
      attempt_id: active.reservation.attempt_id,
      attempt_number: 1,
      duplicate: true,
    };
  }

  if (attempts.length > 0) {
    return {
      ok: false,
      reason: "execution_attempt_cap_reached",
      detail: {
        attempt_count: attempts.length,
        max_attempts: 1,
      },
    };
  }

  return {
    ok: true,
    attempt_id: expectedFirstAttemptId(intent),
    attempt_number: 1,
    duplicate: false,
  };
}

function planFor(input: {
  intent: BuyVoidFulfillmentJournalIntentV1;
  inventory_reservation: BuyVoidInventoryReservationV1;
  inventory_committed: boolean;
  attempt_id: string;
  attempt_committed: boolean;
  wallet_allowlist_count: number;
  now_ms: number;
}): BuyVoidBoundedExecutionPlanV1 {
  const planId = sha256Hex(
    [
      "void-buy-bounded-execution-plan-v1",
      input.inventory_reservation.reservation_id,
      input.attempt_id,
    ].join("\n"),
  );

  return {
    schema: "void_buy_void_bounded_execution_plan_v1",
    marker: VOID_BUY_VOID_AUTO_RESERVE_PLAN_WORKER_V1,
    plan_id: planId,
    created_at_ms: input.now_ms,
    request_id: input.intent.claim.request_id,
    canonical_payment_identity:
      input.intent.claim.canonical_payment_identity,
    instruction_id: input.intent.claim.instruction_id,
    pool_id: input.inventory_reservation.pool_id,
    inventory_reservation_id:
      input.inventory_reservation.reservation_id,
    inventory_reservation_committed:
      input.inventory_committed,
    execution_attempt_id: input.attempt_id,
    execution_attempt_number: 1,
    execution_attempt_committed: input.attempt_committed,
    execution_chain_id: "2050",
    max_attempts_per_payment: 1,
    fulfillment_wallet_allowlist_count:
      input.wallet_allowlist_count,
    delivery_address: String(
      input.intent.claim.unsigned_instruction.delivery_address,
    ).toLowerCase(),
    void_amount_units: String(
      input.intent.claim.unsigned_instruction.void_amount_units,
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
}

export function runBuyVoidAutoReservePlanWorkerV1(input: {
  root_dir: string;
  intent: BuyVoidFulfillmentJournalIntentV1;
  worker_policy: BuyVoidAutoReservePlanWorkerPolicyV1;
  inventory_policy: BuyVoidInventoryReservationPolicyV1;
  execution_policy: BuyVoidExecutionAttemptPolicyV1;
  apply?: boolean;
  confirmation?: unknown;
  now_ms?: number;
}): BuyVoidAutoReservePlanWorkerDecisionV1 {
  const validated = validateWorkerInput(input);
  if ("reason" in validated) {
    return held(
      "worker_policy",
      input?.apply === true,
      false,
      validated.reason,
      validated.detail,
    );
  }

  if (
    input.apply === true &&
    String(input.confirmation || "") !==
      VOID_BUY_VOID_AUTO_RESERVE_PLAN_CONFIRMATION_V1
  ) {
    return held(
      "worker_policy",
      true,
      false,
      "explicit_confirmation_required",
      {
        required_confirmation:
          VOID_BUY_VOID_AUTO_RESERVE_PLAN_CONFIRMATION_V1,
      },
    );
  }

  const nowMs = safeNow(input.now_ms);
  const inventory = reserveBuyVoidInventoryV1({
    root_dir: input.root_dir,
    intent: input.intent,
    policy: input.inventory_policy,
    apply: input.apply === true,
    now_ms: nowMs,
  });
  if ("reason" in inventory) {
    return held(
      "inventory_reservation",
      input.apply === true,
      false,
      inventory.reason,
      inventory.detail,
    );
  }

  if (input.apply !== true) {
    const attempt = previewAttempt(
      input.root_dir,
      input.intent,
    );
    if ("reason" in attempt) {
      return held(
        "execution_attempt",
        false,
        false,
        attempt.reason,
        attempt.detail,
        inventory,
      );
    }

    return {
      ok: true,
      status: "dry_run",
      applied: false,
      mutation_performed: false,
      inventory: inventory as BuyVoidInventoryReservationDecisionV1 & {
        ok: true;
        status: "available";
      },
      plan: planFor({
        intent: input.intent,
        inventory_reservation: inventory.reservation,
        inventory_committed: inventory.duplicate,
        attempt_id: attempt.attempt_id,
        attempt_committed: attempt.duplicate,
        wallet_allowlist_count:
          validated.wallet_allowlist_count,
        now_ms: nowMs,
      }),
      required_confirmation:
        VOID_BUY_VOID_AUTO_RESERVE_PLAN_CONFIRMATION_V1,
    };
  }

  const attempt = reserveBuyVoidExecutionAttemptV1({
    root_dir: input.root_dir,
    intent: input.intent,
    policy: input.execution_policy,
    now_ms: nowMs,
  });
  if ("reason" in attempt) {
    return held(
      "execution_attempt",
      true,
      inventory.new_reservation,
      attempt.reason,
      {
        ...(attempt.detail || {}),
        recovery: "rerun_same_request_after_review",
        inventory_reservation_id:
          inventory.reservation.reservation_id,
        inventory_reservation_committed: true,
      },
      inventory,
    );
  }

  const duplicate =
    inventory.status === "duplicate" &&
    attempt.status === "duplicate";

  return {
    ok: true,
    status: duplicate ? "duplicate" : "planned",
    applied: true,
    mutation_performed:
      inventory.new_reservation || attempt.new_attempt,
    inventory,
    execution_attempt: attempt.attempt,
    plan: planFor({
      intent: input.intent,
      inventory_reservation: inventory.reservation,
      inventory_committed: true,
      attempt_id: attempt.attempt.reservation.attempt_id,
      attempt_committed: true,
      wallet_allowlist_count:
        validated.wallet_allowlist_count,
      now_ms: nowMs,
    }),
  };
}
