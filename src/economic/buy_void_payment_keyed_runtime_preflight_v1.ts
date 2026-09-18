import crypto from "node:crypto";
import path from "node:path";
import { getAddress } from "ethers";

import {
  readBuyVoidExecutionAttemptV1,
  type BuyVoidExecutionAttemptStateV1,
} from "./buy_void_execution_attempt_journal_v1.js";
import {
  listBuyVoidFulfillmentJournalClaimsV1,
  type BuyVoidFulfillmentJournalIntentV1,
} from "./buy_void_fulfillment_journal_v1.js";
import {
  listBuyVoidInventoryReservationsV1,
  type BuyVoidInventoryReservationV1,
} from "./buy_void_inventory_reservation_journal_v1.js";
import type {
  BuyVoidCrashConsistentSagaServerPolicyV1,
} from "./buy_void_crash_consistent_saga_server_policy_v1.js";
import {
  runBuyVoidSourceFinalityExecutionPreflightV1,
  type BuyVoidSourceFinalityExecutionPreflightDecisionV1,
} from "./buy_void_source_finality_execution_preflight_v1.js";
import {
  buildBuyVoidPaymentKeyedFulfillmentCallV1,
} from "./buy_void_payment_keyed_fulfillment_call_v1.js";
import {
  validateBuyVoidPaymentKeyedTransactionPreparationPolicyV1,
  type BuyVoidPaymentKeyedTransactionPreparationPolicyV1,
  type BuyVoidPaymentKeyedTransactionPreparationTransportV1,
} from "./buy_void_payment_keyed_transaction_preparation_v1.js";
import {
  VOID_BUY_VOID_PAYMENT_KEYED_EXECUTION_COMPOSITION_V1,
  runBuyVoidPaymentKeyedExecutionCompositionV1,
} from "./buy_void_payment_keyed_execution_composition_v1.js";

export const VOID_BUY_VOID_PAYMENT_KEYED_RUNTIME_PREFLIGHT_V1 =
  "VOID_BUY_VOID_PAYMENT_KEYED_RUNTIME_PREFLIGHT_V1";

export const VOID_BUY_VOID_PAYMENT_KEYED_RUNTIME_PREFLIGHT_AUTHORITY_V1 = {
  source_only_contract: true,
  runtime_route_mount: false,
  parent_runtime_dispatch: false,
  attempt_id_only_future_caller_selector: true,
  server_controlled_root_required: true,
  server_controlled_policy_required: true,
  production_durable_journal_readers_default: true,
  exact_attempt_intent_inventory_binding: true,
  deterministic_saga_id_reconstruction: true,
  inventory_reservation_is_plan_reservation_authority: true,
  source_finality_preflight_required: true,
  payment_keyed_fulfillment_call_required: true,
  payment_keyed_execution_composition_dry_run_required: true,
  filesystem_write: false,
  signer_access: false,
  signing: false,
  durable_submission_claim: false,
  transaction_broadcast: false,
  receipt_acceptance: false,
  saga_mutation: false,
  inventory_mutation: false,
  public_fulfilled_closeout: false,
  deployment: false,
  money_movement: false,
} as const;

export type BuyVoidPaymentKeyedRuntimeServerPolicyV1 = {
  preparation_policy: BuyVoidPaymentKeyedTransactionPreparationPolicyV1;
  fulfillment_contract_address: string;
  max_void_amount_units: string;
  saga_policy: BuyVoidCrashConsistentSagaServerPolicyV1;
};

export type BuyVoidPaymentKeyedRuntimePreflightDependenciesV1 = {
  read_attempt?: typeof readBuyVoidExecutionAttemptV1;
  list_intents?: typeof listBuyVoidFulfillmentJournalClaimsV1;
  list_inventory?: typeof listBuyVoidInventoryReservationsV1;
  run_source_finality?: typeof runBuyVoidSourceFinalityExecutionPreflightV1;
  load_saga_module?: () => Promise<any>;
  preparation_transport?: BuyVoidPaymentKeyedTransactionPreparationTransportV1;
};

export type BuyVoidPaymentKeyedRuntimePreflightDecisionV1 =
  | {
      ok: true;
      status: "ready";
      marker: typeof VOID_BUY_VOID_PAYMENT_KEYED_RUNTIME_PREFLIGHT_V1;
      version: 1;
      attempt_id: string;
      saga_id: string;
      plan_reservation_id: string;
      policy_fingerprint_sha256: string;
      canonical_payment_identity: string;
      source_chain: "base" | "ethereum";
      canonical_payment_key_sha256: string;
      composition_marker:
        typeof VOID_BUY_VOID_PAYMENT_KEYED_EXECUTION_COMPOSITION_V1;
      composition_status: "dry_run";
      composition_applied: false;
      preparation_fingerprint_sha256: string;
      transaction_plan_fingerprint_sha256: string;
      unsigned_transaction_fingerprint_sha256: string;
      request_fingerprint_sha256: string;
      request_idempotency_key_sha256: string;
      filesystem_write_performed: false;
      signer_access_performed: false;
      signing_performed: false;
      submission_guard_claimed: false;
      transaction_broadcast_performed: false;
      receipt_verified: false;
      saga_mutation_performed: false;
      inventory_mutation_performed: false;
      public_fulfilled_closeout_performed: false;
      money_movement_performed: false;
    }
  | {
      ok: false;
      status: "held";
      marker: typeof VOID_BUY_VOID_PAYMENT_KEYED_RUNTIME_PREFLIGHT_V1;
      version: 1;
      stage:
        | "input"
        | "policy"
        | "attempt"
        | "intent"
        | "inventory"
        | "saga_identity"
        | "source_finality"
        | "fulfillment_call"
        | "composition";
      reason: string;
      attempt_id: string | null;
      saga_id: string | null;
      plan_reservation_id: string | null;
      policy_fingerprint_sha256: string | null;
      filesystem_write_performed: false;
      signer_access_performed: false;
      signing_performed: false;
      submission_guard_claimed: false;
      transaction_broadcast_performed: false;
      receipt_verified: false;
      saga_mutation_performed: false;
      inventory_mutation_performed: false;
      public_fulfilled_closeout_performed: false;
      money_movement_performed: false;
      detail?: Record<string, unknown>;
    };

const SHA256 = /^[0-9a-f]{64}$/;
const ADDRESS = /^0x[0-9a-f]{40}$/;
const SAGA_ID = /^voidbvfsg1_[0-9a-f]{64}$/;

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function address(value: unknown): string {
  const raw = text(value);
  if (!/^0x[0-9a-fA-F]{40}$/.test(raw)) return "";
  try {
    const normalized = getAddress(raw).toLowerCase();
    return ADDRESS.test(normalized) ? normalized : "";
  } catch {
    return "";
  }
}

function root(value: unknown): string {
  const raw = text(value);
  if (!raw || !path.isAbsolute(raw) || raw.includes("\0")) return "";
  const resolved = path.resolve(raw);
  return resolved === path.parse(resolved).root ? "" : resolved;
}

function held(
  stage: Extract<BuyVoidPaymentKeyedRuntimePreflightDecisionV1, { ok: false }>["stage"],
  reason: string,
  options: {
    attempt_id?: string | null;
    saga_id?: string | null;
    plan_reservation_id?: string | null;
    policy_fingerprint_sha256?: string | null;
    detail?: Record<string, unknown>;
  } = {},
): Extract<BuyVoidPaymentKeyedRuntimePreflightDecisionV1, { ok: false }> {
  return {
    ok: false,
    status: "held",
    marker: VOID_BUY_VOID_PAYMENT_KEYED_RUNTIME_PREFLIGHT_V1,
    version: 1,
    stage,
    reason,
    attempt_id: options.attempt_id ?? null,
    saga_id: options.saga_id ?? null,
    plan_reservation_id: options.plan_reservation_id ?? null,
    policy_fingerprint_sha256:
      options.policy_fingerprint_sha256 ?? null,
    filesystem_write_performed: false,
    signer_access_performed: false,
    signing_performed: false,
    submission_guard_claimed: false,
    transaction_broadcast_performed: false,
    receipt_verified: false,
    saga_mutation_performed: false,
    inventory_mutation_performed: false,
    public_fulfilled_closeout_performed: false,
    money_movement_performed: false,
    ...(options.detail ? { detail: options.detail } : {}),
  };
}

export function buyVoidPaymentKeyedRuntimeServerPolicyFingerprintV1(
  value: BuyVoidPaymentKeyedRuntimeServerPolicyV1,
): { ok: true; fingerprint: string } | { ok: false; reason: string } {
  const validation =
    validateBuyVoidPaymentKeyedTransactionPreparationPolicyV1(
      value?.preparation_policy,
    );
  if (validation.ok === false) {
    return {
      ok: false,
      reason: "payment_keyed_runtime_preparation_policy_invalid:" +
        validation.reason,
    };
  }

  const contract = address(value?.fulfillment_contract_address);
  const prepContract = address(
    value?.preparation_policy?.fulfillment_contract_address,
  );
  const prepWallet = address(
    value?.preparation_policy?.fulfillment_wallet_address,
  );
  const wallets =
    value?.saga_policy?.execution_policy?.fulfillment_wallet_allowlist
      ?.map((item) => address(item)) || [];
  const maximum = text(value?.max_void_amount_units);
  const sagaMaximum = text(
    value?.saga_policy?.inventory_policy?.max_reservation_void_units,
  );
  if (
    !contract ||
    prepContract !== contract ||
    !prepWallet ||
    wallets.length !== 1 ||
    wallets[0] !== prepWallet ||
    !/^[1-9][0-9]*$/.test(maximum) ||
    maximum !== sagaMaximum ||
    value?.preparation_policy?.chain_id !== "2050"
  ) {
    return {
      ok: false,
      reason: "payment_keyed_runtime_server_policy_binding_invalid",
    };
  }

  return {
    ok: true,
    fingerprint: sha256(
      [
        "marker=" + VOID_BUY_VOID_PAYMENT_KEYED_RUNTIME_PREFLIGHT_V1,
        "version=1",
        "saga_policy_fingerprint_sha256=" +
          text(value.saga_policy.fingerprints.combined_policy_sha256),
        "preparation_policy_fingerprint_sha256=" +
          validation.policy_fingerprint_sha256,
        "fulfillment_contract_address=" + contract,
        "fulfillment_wallet_address=" + prepWallet,
        "max_void_amount_units=" + maximum,
      ].join("\n"),
    ),
  };
}

function matchingIntent(
  intents: BuyVoidFulfillmentJournalIntentV1[],
  attempt: BuyVoidExecutionAttemptStateV1,
): BuyVoidFulfillmentJournalIntentV1 | null {
  const reservation = attempt.reservation;
  const matches = intents.filter((value) =>
    value.claim?.request_id === reservation.request_id &&
    value.claim?.canonical_payment_identity ===
      reservation.canonical_payment_identity &&
    value.claim?.instruction_id === reservation.instruction_id &&
    value.request_key_sha256 === reservation.request_key_sha256 &&
    value.payment_key_sha256 === reservation.payment_key_sha256
  );
  return matches.length === 1 ? matches[0] : null;
}

function matchingInventory(
  values: BuyVoidInventoryReservationV1[],
  intent: BuyVoidFulfillmentJournalIntentV1,
  policy: BuyVoidCrashConsistentSagaServerPolicyV1,
): BuyVoidInventoryReservationV1 | null {
  const matches = values.filter((value) =>
    value.pool_id === policy.inventory_policy.pool_id &&
    value.request_id === intent.claim.request_id &&
    value.canonical_payment_identity ===
      intent.claim.canonical_payment_identity &&
    value.request_key_sha256 === intent.request_key_sha256 &&
    value.payment_key_sha256 === intent.payment_key_sha256 &&
    address(value.delivery_address) ===
      address(intent.claim.unsigned_instruction.delivery_address) &&
    text(value.reserved_void_units) ===
      text(intent.claim.unsigned_instruction.void_amount_units)
  );
  return matches.length === 1 ? matches[0] : null;
}

function sagaBinding(
  intent: BuyVoidFulfillmentJournalIntentV1,
  policy: BuyVoidCrashConsistentSagaServerPolicyV1,
) {
  return {
    request_id: intent.claim.request_id,
    canonical_payment_identity: intent.claim.canonical_payment_identity,
    request_key_sha256: intent.request_key_sha256,
    payment_key_sha256: intent.payment_key_sha256,
    delivery_address:
      address(intent.claim.unsigned_instruction.delivery_address),
    void_amount_units:
      text(intent.claim.unsigned_instruction.void_amount_units),
    chain_id: "2050",
    pool_id: policy.inventory_policy.pool_id,
  };
}

async function defaultSagaModule(): Promise<any> {
  const dynamicImport = new Function(
    "specifier",
    "return import(specifier)",
  ) as (specifier: string) => Promise<any>;
  return dynamicImport(
    "../../tools/buy-void-crash-consistent-fulfillment-saga-v1.mjs",
  );
}

export async function runBuyVoidPaymentKeyedRuntimePreflightV1(input: {
  root_dir: string;
  attempt_id: string;
  server_policy: BuyVoidPaymentKeyedRuntimeServerPolicyV1;
  env?: NodeJS.ProcessEnv;
  dependencies?: BuyVoidPaymentKeyedRuntimePreflightDependenciesV1;
}): Promise<BuyVoidPaymentKeyedRuntimePreflightDecisionV1> {
  const rootDir = root(input?.root_dir);
  const attemptId = text(input?.attempt_id).toLowerCase();
  if (!rootDir || !SHA256.test(attemptId)) {
    return held("input", "payment_keyed_runtime_input_invalid");
  }

  const policy = buyVoidPaymentKeyedRuntimeServerPolicyFingerprintV1(input.server_policy);
  if (policy.ok === false) {
    return held("policy", policy.reason, {
      attempt_id: attemptId,
    });
  }

  const readAttempt =
    input.dependencies?.read_attempt || readBuyVoidExecutionAttemptV1;
  const attempt = readAttempt({
    root_dir: rootDir,
    attempt_id: attemptId,
  });
  if (!attempt) {
    return held("attempt", "payment_keyed_runtime_attempt_not_found", {
      attempt_id: attemptId,
      policy_fingerprint_sha256: policy.fingerprint,
    });
  }
  if (
    attempt.status !== "reserved" ||
    attempt.prepared ||
    attempt.broadcast ||
    attempt.failure ||
    attempt.postbroadcast_failure ||
    attempt.confirmation
  ) {
    return held(
      "attempt",
      "payment_keyed_runtime_reserved_clean_attempt_required",
      {
        attempt_id: attemptId,
        policy_fingerprint_sha256: policy.fingerprint,
        detail: { status: attempt.status },
      },
    );
  }

  const listIntents =
    input.dependencies?.list_intents ||
    listBuyVoidFulfillmentJournalClaimsV1;
  let intent: BuyVoidFulfillmentJournalIntentV1 | null = null;
  try {
    intent = matchingIntent(listIntents(rootDir), attempt);
  } catch (error) {
    return held("intent", "payment_keyed_runtime_intent_read_failed", {
      attempt_id: attemptId,
      policy_fingerprint_sha256: policy.fingerprint,
      detail: { error_class: text((error as Error)?.name) || "Error" },
    });
  }
  if (!intent) {
    return held(
      "intent",
      "payment_keyed_runtime_intent_not_found_or_ambiguous",
      {
        attempt_id: attemptId,
        policy_fingerprint_sha256: policy.fingerprint,
      },
    );
  }

  const listInventory =
    input.dependencies?.list_inventory ||
    listBuyVoidInventoryReservationsV1;
  let inventory: BuyVoidInventoryReservationV1 | null = null;
  try {
    inventory = matchingInventory(
      listInventory({
        root_dir: rootDir,
        pool_id: input.server_policy.saga_policy.inventory_policy.pool_id,
      }),
      intent,
      input.server_policy.saga_policy,
    );
  } catch (error) {
    return held(
      "inventory",
      "payment_keyed_runtime_inventory_read_failed",
      {
        attempt_id: attemptId,
        policy_fingerprint_sha256: policy.fingerprint,
        detail: { error_class: text((error as Error)?.name) || "Error" },
      },
    );
  }
  const planReservationId =
    text(inventory?.reservation_id).toLowerCase();
  if (!inventory || !SHA256.test(planReservationId)) {
    return held(
      "inventory",
      "payment_keyed_runtime_inventory_not_found_or_ambiguous",
      {
        attempt_id: attemptId,
        policy_fingerprint_sha256: policy.fingerprint,
      },
    );
  }

  let sagaId = "";
  try {
    const saga = await (
      input.dependencies?.load_saga_module || defaultSagaModule
    )();
    const binding = saga.validateSagaBindingV1(
      sagaBinding(intent, input.server_policy.saga_policy),
    );
    sagaId = text(saga.computeSagaIdV1(binding)).toLowerCase();
  } catch (error) {
    return held(
      "saga_identity",
      "payment_keyed_runtime_saga_identity_reconstruction_failed",
      {
        attempt_id: attemptId,
        plan_reservation_id: planReservationId,
        policy_fingerprint_sha256: policy.fingerprint,
        detail: { error_class: text((error as Error)?.name) || "Error" },
      },
    );
  }
  if (!SAGA_ID.test(sagaId)) {
    return held(
      "saga_identity",
      "payment_keyed_runtime_saga_identity_invalid",
      {
        attempt_id: attemptId,
        plan_reservation_id: planReservationId,
        policy_fingerprint_sha256: policy.fingerprint,
      },
    );
  }

  const runFinality =
    input.dependencies?.run_source_finality ||
    runBuyVoidSourceFinalityExecutionPreflightV1;
  let finality: BuyVoidSourceFinalityExecutionPreflightDecisionV1;
  try {
    finality = await runFinality({
      root_dir: rootDir,
      attempt_id: attemptId,
      env: input.env || process.env,
    });
  } catch (error) {
    return held(
      "source_finality",
      "payment_keyed_runtime_source_finality_failed",
      {
        attempt_id: attemptId,
        saga_id: sagaId,
        plan_reservation_id: planReservationId,
        policy_fingerprint_sha256: policy.fingerprint,
        detail: { error_class: text((error as Error)?.name) || "Error" },
      },
    );
  }
  if (finality.ok === false) {
    return held("source_finality", finality.reason, {
      attempt_id: attemptId,
      saga_id: sagaId,
      plan_reservation_id: planReservationId,
      policy_fingerprint_sha256: policy.fingerprint,
    });
  }

  const call = buildBuyVoidPaymentKeyedFulfillmentCallV1({
    attempt,
    source_finality: finality,
    policy: {
      chain_id: "2050",
      fulfillment_contract_address:
        input.server_policy.fulfillment_contract_address,
      max_void_amount_units:
        input.server_policy.max_void_amount_units,
    },
  });
  if (call.ok === false) {
    return held("fulfillment_call", call.reason, {
      attempt_id: attemptId,
      saga_id: sagaId,
      plan_reservation_id: planReservationId,
      policy_fingerprint_sha256: policy.fingerprint,
    });
  }

  const composition =
    await runBuyVoidPaymentKeyedExecutionCompositionV1({
      saga_id: sagaId,
      plan_reservation_id: planReservationId,
      attempt,
      fulfillment_call: call,
      policy: input.server_policy.preparation_policy,
      apply: false,
      ...(input.dependencies?.preparation_transport
        ? {
            dependencies: {
              preparation_transport:
                input.dependencies.preparation_transport,
            },
          }
        : {}),
    });
  if (composition.ok === false) {
    return held("composition", composition.reason, {
      attempt_id: attemptId,
      saga_id: sagaId,
      plan_reservation_id: planReservationId,
      policy_fingerprint_sha256: policy.fingerprint,
      detail: { composition_stage: composition.stage },
    });
  }
  if (
    composition.status !== "dry_run" ||
    composition.applied !== false
  ) {
    return held(
      "composition",
      "payment_keyed_runtime_composition_not_dry_run",
      {
        attempt_id: attemptId,
        saga_id: sagaId,
        plan_reservation_id: planReservationId,
        policy_fingerprint_sha256: policy.fingerprint,
      },
    );
  }

  return {
    ok: true,
    status: "ready",
    marker: VOID_BUY_VOID_PAYMENT_KEYED_RUNTIME_PREFLIGHT_V1,
    version: 1,
    attempt_id: attemptId,
    saga_id: sagaId,
    plan_reservation_id: planReservationId,
    policy_fingerprint_sha256: policy.fingerprint,
    canonical_payment_identity:
      finality.canonical_payment_identity,
    source_chain: finality.source_chain,
    canonical_payment_key_sha256:
      finality.payment_key_sha256,
    composition_marker:
      VOID_BUY_VOID_PAYMENT_KEYED_EXECUTION_COMPOSITION_V1,
    composition_status: "dry_run",
    composition_applied: false,
    preparation_fingerprint_sha256:
      composition.preparation_fingerprint_sha256,
    transaction_plan_fingerprint_sha256:
      composition.transaction_plan_fingerprint_sha256,
    unsigned_transaction_fingerprint_sha256:
      composition.unsigned_transaction_fingerprint_sha256,
    request_fingerprint_sha256:
      composition.request_fingerprint_sha256,
    request_idempotency_key_sha256:
      composition.request_idempotency_key_sha256,
    filesystem_write_performed: false,
    signer_access_performed: false,
    signing_performed: false,
    submission_guard_claimed: false,
    transaction_broadcast_performed: false,
    receipt_verified: false,
    saga_mutation_performed: false,
    inventory_mutation_performed: false,
    public_fulfilled_closeout_performed: false,
    money_movement_performed: false,
  };
}
