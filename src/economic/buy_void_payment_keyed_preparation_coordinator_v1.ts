import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

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
import {
  VOID_BUY_VOID_PIPELINE_CONFIRMATIONS_V1,
  runBuyVoidPipelineCommandV1,
} from "./buy_void_pipeline_coordinator_v1.js";
import {
  runBuyVoidSourceFinalityExecutionPreflightV1,
  type BuyVoidSourceFinalityExecutionPreflightDecisionV1,
} from "./buy_void_source_finality_execution_preflight_v1.js";
import {
  buildBuyVoidPaymentKeyedFulfillmentCallV1,
  type BuyVoidPaymentKeyedFulfillmentCallReadyV1,
} from "./buy_void_payment_keyed_fulfillment_call_v1.js";
import {
  runBuyVoidPaymentKeyedTransactionPreparationV1,
  validateBuyVoidPaymentKeyedTransactionPreparationPolicyV1,
  type BuyVoidPaymentKeyedTransactionPreparationReadyV1,
  type BuyVoidPaymentKeyedTransactionPreparationTransportV1,
} from "./buy_void_payment_keyed_transaction_preparation_v1.js";
import {
  buildBuyVoidPaymentKeyedUnsignedTransactionV1,
} from "./buy_void_payment_keyed_unsigned_transaction_v1.js";
import {
  buildBuyVoidPaymentKeyedCustodianPrepareRequestV1,
  type BuyVoidPaymentKeyedCustodianPrepareRequestV1,
} from "./buy_void_payment_keyed_custodian_prepare_request_v1.js";
import {
  VOID_BUY_VOID_PAYMENT_KEYED_PREPARATION_CUSTODY_CONFIRMATION_V1,
  prepareBuyVoidPaymentKeyedPreparationCustodyV1,
  readBuyVoidPaymentKeyedPreparationCustodyPublicV1,
  type BuyVoidPaymentKeyedPreparationCustodyPublicV1,
} from "./buy_void_payment_keyed_preparation_custody_v1.js";
import {
  listBuyVoidPaymentKeyedPlanReservationsV1,
  reserveBuyVoidPaymentKeyedPlanV1,
  type BuyVoidPaymentKeyedPlanReservationV1,
} from "./buy_void_payment_keyed_plan_reservation_v1.js";
import {
  runBuyVoidPaymentKeyedRuntimePreflightV1,
  type BuyVoidPaymentKeyedRuntimePreflightDecisionV1,
  type BuyVoidPaymentKeyedRuntimeServerPolicyV1,
} from "./buy_void_payment_keyed_runtime_preflight_v1.js";
import type {
  BuyVoidDeliverySignerV1,
} from "./buy_void_delivery_sign_broadcast_adapter_v1.js";

export const VOID_BUY_VOID_PAYMENT_KEYED_PREPARATION_COORDINATOR_V1 =
  "VOID_BUY_VOID_PAYMENT_KEYED_PREPARATION_COORDINATOR_V1";

export const VOID_BUY_VOID_PAYMENT_KEYED_PREPARATION_COORDINATOR_CONFIRMATION_V1 =
  "buyVoidAdvancePaymentKeyedPreparationV1";

export const VOID_BUY_VOID_PAYMENT_KEYED_PREPARATION_COORDINATOR_AUTHORITY_V1 = {
  source_only_contract: true,
  runtime_route_mount: false,
  canonical_parent_dispatch: false,
  exact_attempt_selector: true,
  server_controlled_policy_required: true,
  runtime_preflight_required_before_mutation: true,
  source_finality_revalidated_before_reservation: true,
  wallet_scoped_nonce_reservation_required: true,
  pending_nonce_is_floor_only: true,
  exact_payment_keyed_unsigned_transaction_required: true,
  exact_custodian_request_required: true,
  crash_safe_preparation_custody_required: true,
  economic_delivery_recipient_preserved_in_attempt_journal: true,
  fulfillment_contract_target_preserved_in_custody_request: true,
  execution_attempt_preparation_write: true,
  saga_transaction_prepared_append: true,
  write_ahead_broadcast_intent_not_yet_created: true,
  durable_submission_claim: false,
  transaction_broadcast: false,
  receipt_wait: false,
  inventory_mutation: false,
  public_fulfilled_closeout: false,
  raw_signed_transaction_input: false,
  raw_signed_transaction_persistence: false,
  raw_signed_transaction_output: false,
  automatic_retry: false,
  signer_access_when_applied: true,
  signing_when_applied: true,
  money_movement: false,
} as const;

export type BuyVoidPaymentKeyedPreparationCoordinatorFaultStageV1 =
  | "after_nonce_reservation"
  | "after_custody_record"
  | "after_execution_attempt_preparation";

type SagaStoreV1 = {
  recover: (sagaId: string) => any | null;
};

type SagaModuleV1 = {
  ADVANCE_CONFIRMATION: string;
  ACTION_CONFIRMATIONS: Record<string, string>;
  validateSagaBindingV1: (
    binding: Record<string, unknown>,
  ) => Record<string, any>;
  computeSagaIdV1: (binding: Record<string, unknown>) => string;
  createFilesystemSagaStoreV1: (rootDir: string) => SagaStoreV1;
  runSagaSupervisorTickV1: (
    input: Record<string, unknown>,
  ) => Promise<any>;
};

export type BuyVoidPaymentKeyedPreparationCoordinatorDependenciesV1 = {
  run_runtime_preflight?: typeof runBuyVoidPaymentKeyedRuntimePreflightV1;
  read_attempt?: typeof readBuyVoidExecutionAttemptV1;
  list_intents?: typeof listBuyVoidFulfillmentJournalClaimsV1;
  list_inventory?: typeof listBuyVoidInventoryReservationsV1;
  run_source_finality?: typeof runBuyVoidSourceFinalityExecutionPreflightV1;
  preparation_transport?: BuyVoidPaymentKeyedTransactionPreparationTransportV1;
  signer?: BuyVoidDeliverySignerV1;
  run_pipeline_command?: (
    command: Record<string, unknown>,
  ) => unknown | Promise<unknown>;
  load_saga_module?: () => Promise<SagaModuleV1>;
  now_ms?: () => number;
  fault_inject?: (
    stage: BuyVoidPaymentKeyedPreparationCoordinatorFaultStageV1,
  ) => void | Promise<void>;
};

export type BuyVoidPaymentKeyedPreparationCoordinatorInputV1 = {
  root_dir: string;
  attempt_id: string;
  server_policy: BuyVoidPaymentKeyedRuntimeServerPolicyV1;
  env?: NodeJS.ProcessEnv;
  apply?: boolean;
  confirmation?: unknown;
  runtime_policy_fingerprint_sha256?: unknown;
  preparation_policy_fingerprint_sha256?: unknown;
  saga_confirmation?: unknown;
  saga_action_confirmation?: unknown;
  custody_confirmation?: unknown;
  pipeline_confirmation?: unknown;
  dependencies?: BuyVoidPaymentKeyedPreparationCoordinatorDependenciesV1;
};

export type BuyVoidPaymentKeyedPreparationCoordinatorDecisionV1 =
  | {
      ok: true;
      status: "dry_run";
      applied: false;
      mutation_performed: false;
      marker: typeof VOID_BUY_VOID_PAYMENT_KEYED_PREPARATION_COORDINATOR_V1;
      version: 1;
      attempt_id: string;
      saga_id: string;
      inventory_reservation_id: string;
      required_confirmation:
        typeof VOID_BUY_VOID_PAYMENT_KEYED_PREPARATION_COORDINATOR_CONFIRMATION_V1;
      required_runtime_policy_fingerprint_sha256: string;
      required_preparation_policy_fingerprint_sha256: string;
      required_saga_confirmation: string;
      required_saga_action_confirmation: string;
      required_custody_confirmation:
        typeof VOID_BUY_VOID_PAYMENT_KEYED_PREPARATION_CUSTODY_CONFIRMATION_V1;
      required_pipeline_confirmation: string;
      preflight: Extract<
        BuyVoidPaymentKeyedRuntimePreflightDecisionV1,
        { ok: true }
      >;
      planner: BuyVoidPaymentKeyedTransactionPreparationReadyV1;
      existing_nonce_reservation: BuyVoidPaymentKeyedPlanReservationV1 | null;
      existing_custody:
        BuyVoidPaymentKeyedPreparationCustodyPublicV1 | null;
      signer_access_performed: false;
      signing_performed: false;
      transaction_broadcast_performed: false;
      raw_signed_transaction_persisted: false;
      raw_signed_transaction_returned: false;
      money_movement_performed: false;
    }
  | {
      ok: true;
      status: "prepared" | "duplicate";
      applied: true;
      marker: typeof VOID_BUY_VOID_PAYMENT_KEYED_PREPARATION_COORDINATOR_V1;
      version: 1;
      mutation_performed: boolean;
      attempt_id: string;
      saga_id: string;
      inventory_reservation_id: string;
      nonce_reservation: BuyVoidPaymentKeyedPlanReservationV1;
      custody: BuyVoidPaymentKeyedPreparationCustodyPublicV1;
      execution_attempt: BuyVoidExecutionAttemptStateV1;
      saga_state: Record<string, unknown>;
      signer_access_performed: true;
      signing_performed: true;
      transaction_broadcast_performed: false;
      raw_signed_transaction_persisted: false;
      raw_signed_transaction_returned: false;
      durable_submission_claimed: false;
      money_movement_performed: false;
    }
  | {
      ok: false;
      status: "held";
      applied: boolean;
      marker: typeof VOID_BUY_VOID_PAYMENT_KEYED_PREPARATION_COORDINATOR_V1;
      version: 1;
      stage:
        | "input"
        | "policy"
        | "preflight"
        | "journal_reconstruction"
        | "saga_reconstruction"
        | "source_finality"
        | "planning"
        | "nonce_reservation"
        | "custody"
        | "execution_attempt_preparation"
        | "saga_append";
      reason: string;
      mutation_performed: boolean;
      signer_access_performed: boolean;
      signing_performed: boolean;
      transaction_broadcast_performed: false;
      raw_signed_transaction_persisted: false;
      raw_signed_transaction_returned: false;
      reconciliation_required: boolean;
      automatic_retry_allowed: false;
      money_movement_performed: false;
      detail?: Record<string, unknown>;
    };

type ReconstructedV1 = {
  attempt: BuyVoidExecutionAttemptStateV1;
  intent: BuyVoidFulfillmentJournalIntentV1;
  inventory: BuyVoidInventoryReservationV1;
  saga_id: string;
  saga_binding: Record<string, any>;
  saga_store: SagaStoreV1;
  saga_record: any;
};

const SHA256 = /^[0-9a-f]{64}$/;
const SAGA_ID = /^voidbvfsg1_[0-9a-f]{64}$/;
const SOURCE_FLOOR_MAIN = "471ab1f6b52925cc20970630c4e821a3c1246836";
const SAGA_ROOT = "buy-void-crash-consistent-saga-runtime-v1";
const LEASE_TTL_MS = 30_000;

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : String(value ?? "").trim();
}

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function absoluteRoot(value: unknown): string {
  const raw = text(value);
  if (!raw || !path.isAbsolute(raw) || raw.includes("\0")) {
    throw new Error("payment_keyed_preparation_root_invalid");
  }
  const resolved = path.resolve(raw);
  if (resolved === path.parse(resolved).root) {
    throw new Error("payment_keyed_preparation_root_is_filesystem_root");
  }
  return resolved;
}

function safeNow(value: unknown): number {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : Date.now();
}

function held(
  stage: Extract<
    BuyVoidPaymentKeyedPreparationCoordinatorDecisionV1,
    { ok: false }
  >["stage"],
  applied: boolean,
  reason: string,
  options: {
    mutation_performed?: boolean;
    signer_access_performed?: boolean;
    signing_performed?: boolean;
    reconciliation_required?: boolean;
    detail?: Record<string, unknown>;
  } = {},
): Extract<
  BuyVoidPaymentKeyedPreparationCoordinatorDecisionV1,
  { ok: false }
> {
  return {
    ok: false,
    status: "held",
    applied,
    marker: VOID_BUY_VOID_PAYMENT_KEYED_PREPARATION_COORDINATOR_V1,
    version: 1,
    stage,
    reason,
    mutation_performed: options.mutation_performed === true,
    signer_access_performed:
      options.signer_access_performed === true,
    signing_performed: options.signing_performed === true,
    transaction_broadcast_performed: false,
    raw_signed_transaction_persisted: false,
    raw_signed_transaction_returned: false,
    reconciliation_required:
      options.reconciliation_required === true,
    automatic_retry_allowed: false,
    money_movement_performed: false,
    ...(options.detail ? { detail: options.detail } : {}),
  };
}

function sagaBinding(
  intent: BuyVoidFulfillmentJournalIntentV1,
  poolId: string,
): Record<string, unknown> {
  return {
    request_id: intent.claim.request_id,
    canonical_payment_identity:
      intent.claim.canonical_payment_identity,
    request_key_sha256: intent.request_key_sha256,
    payment_key_sha256: intent.payment_key_sha256,
    delivery_address:
      text(intent.claim.unsigned_instruction.delivery_address).toLowerCase(),
    void_amount_units:
      text(intent.claim.unsigned_instruction.void_amount_units),
    chain_id: "2050",
    pool_id: poolId,
  };
}

function exactIntent(
  values: BuyVoidFulfillmentJournalIntentV1[],
  attempt: BuyVoidExecutionAttemptStateV1,
): BuyVoidFulfillmentJournalIntentV1 {
  const reservation = attempt.reservation;
  const matches = values.filter((value) =>
    value.claim?.request_id === reservation.request_id &&
    value.claim?.canonical_payment_identity ===
      reservation.canonical_payment_identity &&
    value.claim?.instruction_id === reservation.instruction_id &&
    value.request_key_sha256 === reservation.request_key_sha256 &&
    value.payment_key_sha256 === reservation.payment_key_sha256
  );
  if (matches.length !== 1) {
    throw new Error(
      "payment_keyed_preparation_intent_count_invalid:" +
        String(matches.length),
    );
  }
  return matches[0];
}

function exactInventory(
  values: BuyVoidInventoryReservationV1[],
  intent: BuyVoidFulfillmentJournalIntentV1,
  poolId: string,
): BuyVoidInventoryReservationV1 {
  const matches = values.filter((value) =>
    value.pool_id === poolId &&
    value.request_id === intent.claim.request_id &&
    value.canonical_payment_identity ===
      intent.claim.canonical_payment_identity &&
    value.request_key_sha256 === intent.request_key_sha256 &&
    value.payment_key_sha256 === intent.payment_key_sha256 &&
    text(value.delivery_address).toLowerCase() ===
      text(intent.claim.unsigned_instruction.delivery_address).toLowerCase() &&
    text(value.reserved_void_units) ===
      text(intent.claim.unsigned_instruction.void_amount_units)
  );
  if (matches.length !== 1) {
    throw new Error(
      "payment_keyed_preparation_inventory_count_invalid:" +
        String(matches.length),
    );
  }
  return matches[0];
}

function existingSagaStore(
  saga: SagaModuleV1,
  rootDir: string,
  sagaId: string,
): SagaStoreV1 {
  const root = path.join(rootDir, SAGA_ROOT);
  const sagaDirectory = path.join(root, "sagas", sagaId);
  const eventsDirectory = path.join(sagaDirectory, "events");
  for (const directory of [
    root,
    path.join(root, "sagas"),
    sagaDirectory,
    eventsDirectory,
  ]) {
    const metadata = fs.lstatSync(directory);
    if (!metadata.isDirectory() || metadata.isSymbolicLink()) {
      throw new Error("payment_keyed_preparation_saga_directory_invalid");
    }
  }
  return saga.createFilesystemSagaStoreV1(root);
}

async function defaultSagaModule(): Promise<SagaModuleV1> {
  const dynamicImport = new Function(
    "specifier",
    "return import(specifier)",
  ) as (specifier: string) => Promise<SagaModuleV1>;
  return dynamicImport(
    "../../tools/buy-void-crash-consistent-fulfillment-saga-v1.mjs",
  );
}

async function reconstruct(input: {
  root_dir: string;
  attempt_id: string;
  server_policy: BuyVoidPaymentKeyedRuntimeServerPolicyV1;
  preflight: Extract<
    BuyVoidPaymentKeyedRuntimePreflightDecisionV1,
    { ok: true }
  >;
  saga: SagaModuleV1;
  deps: Required<
    Pick<
      BuyVoidPaymentKeyedPreparationCoordinatorDependenciesV1,
      "read_attempt" | "list_intents" | "list_inventory"
    >
  >;
}): Promise<ReconstructedV1> {
  const attempt = input.deps.read_attempt({
    root_dir: input.root_dir,
    attempt_id: input.attempt_id,
  });
  if (!attempt) {
    throw new Error("payment_keyed_preparation_attempt_missing");
  }
  if (
    !["reserved", "prepared"].includes(attempt.status) ||
    attempt.broadcast ||
    attempt.failure ||
    attempt.postbroadcast_failure ||
    attempt.confirmation
  ) {
    throw new Error(
      "payment_keyed_preparation_attempt_state_invalid:" +
        attempt.status,
    );
  }

  const intent = exactIntent(
    input.deps.list_intents(input.root_dir),
    attempt,
  );
  const inventory = exactInventory(
    input.deps.list_inventory({
      root_dir: input.root_dir,
      pool_id: input.server_policy.saga_policy.inventory_policy.pool_id,
    }),
    intent,
    input.server_policy.saga_policy.inventory_policy.pool_id,
  );

  if (
    inventory.reservation_id !== input.preflight.plan_reservation_id
  ) {
    throw new Error(
      "payment_keyed_preparation_inventory_preflight_mismatch",
    );
  }

  const binding = input.saga.validateSagaBindingV1(
    sagaBinding(
      intent,
      input.server_policy.saga_policy.inventory_policy.pool_id,
    ),
  );
  const sagaId = text(input.saga.computeSagaIdV1(binding)).toLowerCase();
  if (!SAGA_ID.test(sagaId) || sagaId !== input.preflight.saga_id) {
    throw new Error("payment_keyed_preparation_saga_id_mismatch");
  }

  const store = existingSagaStore(input.saga, input.root_dir, sagaId);
  const record = store.recover(sagaId);
  if (!record) {
    throw new Error("payment_keyed_preparation_saga_missing");
  }
  if (
    record.events?.[0]?.payload?.policy_id !==
      input.server_policy.saga_policy.saga_policy_id
  ) {
    throw new Error("payment_keyed_preparation_saga_policy_conflict");
  }
  if (
    record.state?.attempt_id !== input.attempt_id ||
    !["attempt_reserved", "transaction_prepared"].includes(
      text(record.state?.state),
    )
  ) {
    throw new Error("payment_keyed_preparation_saga_state_invalid");
  }
  if (record.state?.reservation_id !== inventory.reservation_id) {
    throw new Error(
      "payment_keyed_preparation_saga_inventory_binding_conflict",
    );
  }

  return {
    attempt,
    intent,
    inventory,
    saga_id: sagaId,
    saga_binding: binding,
    saga_store: store,
    saga_record: record,
  };
}

function existingNonceReservation(
  rootDir: string,
  wallet: string,
  attemptId: string,
): BuyVoidPaymentKeyedPlanReservationV1 | null {
  const matches = listBuyVoidPaymentKeyedPlanReservationsV1({
    root_dir: rootDir,
    wallet_address: wallet,
  }).filter((value) => value.attempt_id === attemptId);
  if (matches.length > 1) {
    throw new Error(
      "payment_keyed_preparation_multiple_nonce_reservations",
    );
  }
  return matches[0] || null;
}

function assertExistingReservationLive(
  existing: BuyVoidPaymentKeyedPlanReservationV1,
  planner: BuyVoidPaymentKeyedTransactionPreparationReadyV1,
  call: BuyVoidPaymentKeyedFulfillmentCallReadyV1,
): void {
  if (
    existing.nonce < planner.pending_nonce ||
    BigInt(existing.gas_limit) <
      BigInt(planner.computed_gas_limit) ||
    BigInt(existing.max_fee_per_gas_wei) <
      BigInt(planner.computed_max_fee_per_gas_wei) ||
    BigInt(existing.max_priority_fee_per_gas_wei) <
      BigInt(planner.configured_priority_fee_per_gas_wei) ||
    JSON.stringify(existing.fulfillment_call) !== JSON.stringify(call)
  ) {
    throw new Error(
      "payment_keyed_preparation_existing_nonce_reservation_stale",
    );
  }
}

function validatePreparedAttempt(input: {
  attempt: BuyVoidExecutionAttemptStateV1;
  custody: BuyVoidPaymentKeyedPreparationCustodyPublicV1;
  intent: BuyVoidFulfillmentJournalIntentV1;
  wallet: string;
}): void {
  const prepared = input.attempt.prepared;
  if (
    input.attempt.status !== "prepared" ||
    !prepared ||
    prepared.attempt_id !== input.attempt.reservation.attempt_id ||
    prepared.chain_id !== "2050" ||
    prepared.void_delivery_tx_hash !==
      input.custody.signed_transaction_hash ||
    prepared.fulfillment_wallet !== input.wallet ||
    prepared.delivery_address !==
      text(input.intent.claim.unsigned_instruction.delivery_address)
        .toLowerCase() ||
    prepared.void_amount_units !==
      text(input.intent.claim.unsigned_instruction.void_amount_units) ||
    prepared.signed_transaction_persisted !== false ||
    prepared.raw_transaction_persisted !== false
  ) {
    throw new Error(
      "payment_keyed_preparation_execution_attempt_binding_conflict",
    );
  }
}

function sagaPreparedPayload(input: {
  attempt_id: string;
  nonce_reservation: BuyVoidPaymentKeyedPlanReservationV1;
  custody: BuyVoidPaymentKeyedPreparationCustodyPublicV1;
}): Record<string, unknown> {
  return {
    attempt_id: input.attempt_id,
    transaction_hash: input.custody.signed_transaction_hash,
    nonce: input.nonce_reservation.nonce,
    fulfillment_wallet_fingerprint_sha256:
      sha256(input.nonce_reservation.wallet_address),
    gas_limit: input.nonce_reservation.gas_limit,
    max_fee_per_gas_wei:
      input.nonce_reservation.max_fee_per_gas_wei,
    max_priority_fee_per_gas_wei:
      input.nonce_reservation.max_priority_fee_per_gas_wei,
  };
}

function assertSagaPrepared(
  record: Record<string, any>,
  expected: Record<string, unknown>,
): void {
  if (
    record?.state?.state !== "transaction_prepared" ||
    record?.state?.attempt_id !== expected.attempt_id ||
    record?.state?.transaction_hash !== expected.transaction_hash ||
    record?.state?.nonce !== expected.nonce
  ) {
    throw new Error(
      "payment_keyed_preparation_existing_saga_conflict:state",
    );
  }
  const events = Array.isArray(record?.events)
    ? record.events.filter(
        (event: Record<string, any>) =>
          event?.event_type === "transaction_prepared",
      )
    : [];
  if (events.length !== 1) {
    throw new Error(
      "payment_keyed_preparation_existing_saga_conflict:event_count",
    );
  }
  for (const [key, value] of Object.entries(expected)) {
    if (events[0]?.payload?.[key] !== value) {
      throw new Error(
        "payment_keyed_preparation_existing_saga_conflict:" + key,
      );
    }
  }
}

function pipelineApplied(value: unknown): boolean {
  return Boolean(
    value &&
      typeof value === "object" &&
      (value as any).ok === true &&
      (value as any).status === "applied",
  );
}

export async function runBuyVoidPaymentKeyedPreparationCoordinatorV1(
  input: BuyVoidPaymentKeyedPreparationCoordinatorInputV1,
): Promise<BuyVoidPaymentKeyedPreparationCoordinatorDecisionV1> {
  const applied = input?.apply === true;
  const attemptId = text(input?.attempt_id).toLowerCase();
  if (!SHA256.test(attemptId)) {
    return held(
      "input",
      applied,
      "payment_keyed_preparation_attempt_id_invalid",
    );
  }

  let rootDir: string;
  try {
    rootDir = absoluteRoot(input?.root_dir);
  } catch (error) {
    return held(
      "input",
      applied,
      text((error as Error)?.message || error),
    );
  }

  const preparationPolicyValidation =
    validateBuyVoidPaymentKeyedTransactionPreparationPolicyV1(
      input?.server_policy?.preparation_policy,
    );
  if (preparationPolicyValidation.ok === false) {
    return held(
      "policy",
      applied,
      preparationPolicyValidation.reason,
    );
  }

  const deps = {
    run_runtime_preflight:
      input.dependencies?.run_runtime_preflight ||
      runBuyVoidPaymentKeyedRuntimePreflightV1,
    read_attempt:
      input.dependencies?.read_attempt ||
      readBuyVoidExecutionAttemptV1,
    list_intents:
      input.dependencies?.list_intents ||
      listBuyVoidFulfillmentJournalClaimsV1,
    list_inventory:
      input.dependencies?.list_inventory ||
      listBuyVoidInventoryReservationsV1,
    run_source_finality:
      input.dependencies?.run_source_finality ||
      runBuyVoidSourceFinalityExecutionPreflightV1,
    preparation_transport:
      input.dependencies?.preparation_transport,
    signer: input.dependencies?.signer,
    run_pipeline_command:
      input.dependencies?.run_pipeline_command ||
      (runBuyVoidPipelineCommandV1 as any),
    load_saga_module:
      input.dependencies?.load_saga_module || defaultSagaModule,
    now_ms: input.dependencies?.now_ms || Date.now,
    fault_inject:
      input.dependencies?.fault_inject ||
      (async () => undefined),
  };

  let saga: SagaModuleV1;
  try {
    saga = await deps.load_saga_module();
  } catch (error) {
    return held(
      "saga_reconstruction",
      applied,
      "payment_keyed_preparation_saga_module_failed",
      {
        detail: {
          error_class: text((error as Error)?.name || "Error"),
        },
      },
    );
  }
  const sagaActionConfirmation =
    saga.ACTION_CONFIRMATIONS.prepare_transaction;
  if (!sagaActionConfirmation) {
    return held(
      "saga_reconstruction",
      applied,
      "payment_keyed_preparation_saga_confirmation_missing",
    );
  }

  if (
    applied &&
    (
      text(input.confirmation) !==
        VOID_BUY_VOID_PAYMENT_KEYED_PREPARATION_COORDINATOR_CONFIRMATION_V1 ||
      text(input.preparation_policy_fingerprint_sha256) !==
        preparationPolicyValidation.policy_fingerprint_sha256 ||
      text(input.saga_confirmation) !== saga.ADVANCE_CONFIRMATION ||
      text(input.saga_action_confirmation) !==
        sagaActionConfirmation ||
      text(input.custody_confirmation) !==
        VOID_BUY_VOID_PAYMENT_KEYED_PREPARATION_CUSTODY_CONFIRMATION_V1 ||
      text(input.pipeline_confirmation) !==
        VOID_BUY_VOID_PIPELINE_CONFIRMATIONS_V1.prepare_execution
    )
  ) {
    return held(
      "input",
      true,
      "payment_keyed_preparation_exact_confirmations_required",
    );
  }
  if (applied && !deps.signer) {
    return held(
      "custody",
      true,
      "payment_keyed_preparation_signer_required",
    );
  }

  const preflight = await deps.run_runtime_preflight({
    root_dir: rootDir,
    attempt_id: attemptId,
    server_policy: input.server_policy,
    env: input.env || process.env,
    dependencies: {
      read_attempt: deps.read_attempt,
      list_intents: deps.list_intents,
      list_inventory: deps.list_inventory,
      run_source_finality: deps.run_source_finality,
      load_saga_module: deps.load_saga_module,
      ...(deps.preparation_transport
        ? { preparation_transport: deps.preparation_transport }
        : {}),
    },
  });
  if (preflight.ok === false) {
    return held("preflight", applied, preflight.reason, {
      detail: {
        preflight_stage: preflight.stage,
      },
    });
  }

  if (
    applied &&
    text(input.runtime_policy_fingerprint_sha256) !==
      preflight.policy_fingerprint_sha256
  ) {
    return held(
      "input",
      true,
      "payment_keyed_preparation_runtime_policy_fingerprint_mismatch",
    );
  }

  let reconstructed: ReconstructedV1;
  try {
    reconstructed = await reconstruct({
      root_dir: rootDir,
      attempt_id: attemptId,
      server_policy: input.server_policy,
      preflight,
      saga,
      deps: {
        read_attempt: deps.read_attempt,
        list_intents: deps.list_intents,
        list_inventory: deps.list_inventory,
      },
    });
  } catch (error) {
    return held(
      "journal_reconstruction",
      applied,
      text((error as Error)?.message || error).slice(0, 240),
    );
  }

  let finality: BuyVoidSourceFinalityExecutionPreflightDecisionV1;
  try {
    finality = await deps.run_source_finality({
      root_dir: rootDir,
      attempt_id: attemptId,
      env: input.env || process.env,
    });
  } catch (error) {
    return held(
      "source_finality",
      applied,
      "payment_keyed_preparation_source_finality_failed",
      {
        detail: {
          error_class: text((error as Error)?.name || "Error"),
        },
      },
    );
  }
  if (finality.ok === false) {
    return held(
      "source_finality",
      applied,
      finality.reason,
    );
  }
  if (
    finality.canonical_payment_identity !==
      preflight.canonical_payment_identity ||
    finality.payment_key_sha256 !==
      preflight.canonical_payment_key_sha256
  ) {
    return held(
      "source_finality",
      applied,
      "payment_keyed_preparation_source_finality_drift",
    );
  }

  const call = buildBuyVoidPaymentKeyedFulfillmentCallV1({
    attempt: reconstructed.attempt,
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
    return held(
      "source_finality",
      applied,
      call.reason,
    );
  }

  const planner = await runBuyVoidPaymentKeyedTransactionPreparationV1({
    attempt: reconstructed.attempt,
    fulfillment_call: call,
    policy: input.server_policy.preparation_policy,
    ...(deps.preparation_transport
      ? { transport: deps.preparation_transport }
      : {}),
  });
  if (planner.ok === false) {
    return held("planning", applied, planner.reason, {
      detail: planner.detail,
    });
  }

  let existingPlan: BuyVoidPaymentKeyedPlanReservationV1 | null = null;
  let existingCustody: BuyVoidPaymentKeyedPreparationCustodyPublicV1 | null =
    null;
  try {
    existingPlan = existingNonceReservation(
      rootDir,
      planner.fulfillment_wallet_address,
      attemptId,
    );
    existingCustody =
      readBuyVoidPaymentKeyedPreparationCustodyPublicV1({
        root_dir: rootDir,
        attempt_id: attemptId,
      });
    if (existingPlan) {
      assertExistingReservationLive(existingPlan, planner, call);
    }
  } catch (error) {
    return held(
      "journal_reconstruction",
      applied,
      text((error as Error)?.message || error).slice(0, 240),
      {
        reconciliation_required: existingCustody !== null,
      },
    );
  }

  if (!applied) {
    return {
      ok: true,
      status: "dry_run",
      applied: false,
      mutation_performed: false,
      marker: VOID_BUY_VOID_PAYMENT_KEYED_PREPARATION_COORDINATOR_V1,
      version: 1,
      attempt_id: attemptId,
      saga_id: reconstructed.saga_id,
      inventory_reservation_id:
        reconstructed.inventory.reservation_id,
      required_confirmation:
        VOID_BUY_VOID_PAYMENT_KEYED_PREPARATION_COORDINATOR_CONFIRMATION_V1,
      required_runtime_policy_fingerprint_sha256:
        preflight.policy_fingerprint_sha256,
      required_preparation_policy_fingerprint_sha256:
        preparationPolicyValidation.policy_fingerprint_sha256,
      required_saga_confirmation: saga.ADVANCE_CONFIRMATION,
      required_saga_action_confirmation:
        sagaActionConfirmation,
      required_custody_confirmation:
        VOID_BUY_VOID_PAYMENT_KEYED_PREPARATION_CUSTODY_CONFIRMATION_V1,
      required_pipeline_confirmation:
        VOID_BUY_VOID_PIPELINE_CONFIRMATIONS_V1.prepare_execution,
      preflight,
      planner,
      existing_nonce_reservation: existingPlan,
      existing_custody: existingCustody,
      signer_access_performed: false,
      signing_performed: false,
      transaction_broadcast_performed: false,
      raw_signed_transaction_persisted: false,
      raw_signed_transaction_returned: false,
      money_movement_performed: false,
    };
  }

  const nowMs = safeNow(deps.now_ms());
  if (!Number.isSafeInteger(nowMs) || nowMs <= 0) {
    return held(
      "input",
      true,
      "payment_keyed_preparation_server_clock_invalid",
    );
  }

  const planDecision = reserveBuyVoidPaymentKeyedPlanV1({
    root_dir: rootDir,
    saga_id: reconstructed.saga_id,
    attempt_id: attemptId,
    wallet_address: planner.fulfillment_wallet_address,
    observed_pending_nonce: planner.pending_nonce,
    fulfillment_call: call,
    gas_limit: existingPlan
      ? existingPlan.gas_limit
      : planner.computed_gas_limit,
    max_fee_per_gas_wei: existingPlan
      ? existingPlan.max_fee_per_gas_wei
      : planner.computed_max_fee_per_gas_wei,
    max_priority_fee_per_gas_wei: existingPlan
      ? existingPlan.max_priority_fee_per_gas_wei
      : planner.configured_priority_fee_per_gas_wei,
    runtime_policy_fingerprint_sha256:
      preflight.policy_fingerprint_sha256,
    preparation_policy_fingerprint_sha256:
      preparationPolicyValidation.policy_fingerprint_sha256,
    now_ms: nowMs,
  });
  if (planDecision.ok === false) {
    return held(
      "nonce_reservation",
      true,
      planDecision.reason,
      {
        detail: planDecision.detail,
      },
    );
  }
  const nonceReservation = planDecision.reservation;

  try {
    await deps.fault_inject("after_nonce_reservation");
  } catch (error) {
    return held(
      "nonce_reservation",
      true,
      "payment_keyed_preparation_injected_after_nonce_reservation",
      {
        mutation_performed: true,
        reconciliation_required: true,
        detail: {
          error_class: text((error as Error)?.name || "Error"),
        },
      },
    );
  }

  const unsigned = buildBuyVoidPaymentKeyedUnsignedTransactionV1({
    attempt_id: attemptId,
    fulfillment_call: nonceReservation.fulfillment_call,
    plan: planDecision.transaction_plan,
    policy: input.server_policy.preparation_policy,
  });
  if (unsigned.ok === false) {
    return held(
      "nonce_reservation",
      true,
      unsigned.reason,
      {
        mutation_performed: planDecision.mutation_performed,
        reconciliation_required: true,
      },
    );
  }
  if (
    unsigned.transaction_plan_fingerprint_sha256 !==
      nonceReservation.transaction_plan_fingerprint_sha256
  ) {
    return held(
      "nonce_reservation",
      true,
      "payment_keyed_preparation_plan_fingerprint_mismatch",
      {
        mutation_performed: planDecision.mutation_performed,
        reconciliation_required: true,
      },
    );
  }

  const requestDecision =
    buildBuyVoidPaymentKeyedCustodianPrepareRequestV1({
      saga_id: reconstructed.saga_id,
      attempt_id: attemptId,
      plan_reservation_id:
        reconstructed.inventory.reservation_id,
      fulfillment_call: nonceReservation.fulfillment_call,
      plan: planDecision.transaction_plan,
      unsigned_transaction: unsigned,
      policy: input.server_policy.preparation_policy,
    });
  if (requestDecision.ok === false) {
    return held(
      "custody",
      true,
      requestDecision.reason,
      {
        mutation_performed: planDecision.mutation_performed,
        reconciliation_required: true,
      },
    );
  }
  const request: BuyVoidPaymentKeyedCustodianPrepareRequestV1 =
    requestDecision.request;

  const custodyDecision =
    await prepareBuyVoidPaymentKeyedPreparationCustodyV1({
      root_dir: rootDir,
      request,
      signer: deps.signer,
      apply: true,
      confirmation:
        VOID_BUY_VOID_PAYMENT_KEYED_PREPARATION_CUSTODY_CONFIRMATION_V1,
      now_ms: nowMs,
    });
  if (custodyDecision.ok === false) {
    return held(
      "custody",
      true,
      custodyDecision.reason,
      {
        mutation_performed:
          planDecision.mutation_performed ||
          custodyDecision.mutation_performed,
        signer_access_performed:
          custodyDecision.signer_access_performed,
        signing_performed:
          custodyDecision.signing_performed,
        reconciliation_required:
          planDecision.mutation_performed ||
          custodyDecision.signer_access_performed,
        detail: custodyDecision.detail,
      },
    );
  }
  const custody = custodyDecision.custody;

  try {
    await deps.fault_inject("after_custody_record");
  } catch (error) {
    return held(
      "custody",
      true,
      "payment_keyed_preparation_injected_after_custody_record",
      {
        mutation_performed: true,
        signer_access_performed: true,
        signing_performed: true,
        reconciliation_required: true,
        detail: {
          error_class: text((error as Error)?.name || "Error"),
        },
      },
    );
  }

  let attempt = deps.read_attempt({
    root_dir: rootDir,
    attempt_id: attemptId,
  });
  if (!attempt) {
    return held(
      "execution_attempt_preparation",
      true,
      "payment_keyed_preparation_attempt_reread_missing",
      {
        mutation_performed: true,
        signer_access_performed: true,
        signing_performed: true,
        reconciliation_required: true,
      },
    );
  }

  if (attempt.status === "reserved") {
    const pipeline = await deps.run_pipeline_command({
      action: "prepare_execution",
      root_dir: rootDir,
      attempt_id: attemptId,
      intent: reconstructed.intent,
      execution_policy:
        input.server_policy.saga_policy.execution_policy,
      transaction: {
        chain_id: "2050",
        transaction_hash: custody.signed_transaction_hash,
        from_address: nonceReservation.wallet_address,
        to_address:
          reconstructed.intent.claim.unsigned_instruction.delivery_address,
        amount_units:
          reconstructed.intent.claim.unsigned_instruction.void_amount_units,
      },
      apply: true,
      confirmation:
        VOID_BUY_VOID_PIPELINE_CONFIRMATIONS_V1.prepare_execution,
      now_ms: nowMs,
    });
    if (!pipelineApplied(pipeline)) {
      return held(
        "execution_attempt_preparation",
        true,
        "payment_keyed_preparation_pipeline_held:" +
          text((pipeline as any)?.reason || "unknown"),
        {
          mutation_performed: true,
          signer_access_performed: true,
          signing_performed: true,
          reconciliation_required: true,
        },
      );
    }
    attempt = deps.read_attempt({
      root_dir: rootDir,
      attempt_id: attemptId,
    });
  }

  if (!attempt) {
    return held(
      "execution_attempt_preparation",
      true,
      "payment_keyed_preparation_attempt_unreadable",
      {
        mutation_performed: true,
        signer_access_performed: true,
        signing_performed: true,
        reconciliation_required: true,
      },
    );
  }

  try {
    validatePreparedAttempt({
      attempt,
      custody,
      intent: reconstructed.intent,
      wallet: nonceReservation.wallet_address,
    });
  } catch (error) {
    return held(
      "execution_attempt_preparation",
      true,
      text((error as Error)?.message || error),
      {
        mutation_performed: true,
        signer_access_performed: true,
        signing_performed: true,
        reconciliation_required: true,
      },
    );
  }

  try {
    await deps.fault_inject("after_execution_attempt_preparation");
  } catch (error) {
    return held(
      "execution_attempt_preparation",
      true,
      "payment_keyed_preparation_injected_after_execution_attempt_preparation",
      {
        mutation_performed: true,
        signer_access_performed: true,
        signing_performed: true,
        reconciliation_required: true,
        detail: {
          error_class: text((error as Error)?.name || "Error"),
        },
      },
    );
  }

  const expectedSaga = sagaPreparedPayload({
    attempt_id: attemptId,
    nonce_reservation: nonceReservation,
    custody,
  });

  let sagaResult: Record<string, any>;
  const currentSaga = reconstructed.saga_store.recover(
    reconstructed.saga_id,
  );
  if (text(currentSaga?.state?.state) === "transaction_prepared") {
    try {
      assertSagaPrepared(currentSaga, expectedSaga);
    } catch (error) {
      return held(
        "saga_append",
        true,
        text((error as Error)?.message || error),
        {
          mutation_performed: true,
          signer_access_performed: true,
          signing_performed: true,
          reconciliation_required: true,
        },
      );
    }
    sagaResult = {
      ok: true,
      status: "duplicate",
      state: currentSaga.state,
    };
  } else {
    try {
      sagaResult = await saga.runSagaSupervisorTickV1({
        store: reconstructed.saga_store,
        binding: reconstructed.saga_binding,
        owner_id:
          "void-buy-payment-keyed-prepare-" +
          process.pid +
          "-" +
          crypto.randomBytes(16).toString("hex"),
        now_ms: nowMs,
        lease_ttl_ms: LEASE_TTL_MS,
        recorded_at_utc: new Date(nowMs).toISOString(),
        source_floor_main: SOURCE_FLOOR_MAIN,
        policy_id:
          input.server_policy.saga_policy.saga_policy_id,
        apply: true,
        confirmation: saga.ADVANCE_CONFIRMATION,
        action_confirmation: sagaActionConfirmation,
        adapters: {
          prepare_transaction: async () => ({
            payload: expectedSaga,
          }),
        },
      });
    } catch (error) {
      return held(
        "saga_append",
        true,
        "payment_keyed_preparation_saga_append_failed",
        {
          mutation_performed: true,
          signer_access_performed: true,
          signing_performed: true,
          reconciliation_required: true,
          detail: {
            error_class: text((error as Error)?.name || "Error"),
          },
        },
      );
    }
    if (
      !sagaResult ||
      sagaResult.ok !== true ||
      sagaResult.status !== "applied"
    ) {
      return held(
        "saga_append",
        true,
        "payment_keyed_preparation_saga_held:" +
          text(sagaResult?.reason || sagaResult?.status || "unknown"),
        {
          mutation_performed: true,
          signer_access_performed: true,
          signing_performed: true,
          reconciliation_required: true,
        },
      );
    }
    const appended = reconstructed.saga_store.recover(
      reconstructed.saga_id,
    );
    try {
      if (!appended) {
        throw new Error(
          "payment_keyed_preparation_saga_append_missing",
        );
      }
      assertSagaPrepared(appended, expectedSaga);
    } catch (error) {
      return held(
        "saga_append",
        true,
        text((error as Error)?.message || error),
        {
          mutation_performed: true,
          signer_access_performed: true,
          signing_performed: true,
          reconciliation_required: true,
        },
      );
    }
  }

  return {
    ok: true,
    status:
      sagaResult.status === "duplicate" ? "duplicate" : "prepared",
    applied: true,
    marker: VOID_BUY_VOID_PAYMENT_KEYED_PREPARATION_COORDINATOR_V1,
    version: 1,
    mutation_performed:
      planDecision.mutation_performed ||
      custodyDecision.mutation_performed ||
      sagaResult.status === "applied",
    attempt_id: attemptId,
    saga_id: reconstructed.saga_id,
    inventory_reservation_id:
      reconstructed.inventory.reservation_id,
    nonce_reservation: nonceReservation,
    custody,
    execution_attempt: attempt,
    saga_state: sagaResult.state || {},
    signer_access_performed: true,
    signing_performed: true,
    transaction_broadcast_performed: false,
    raw_signed_transaction_persisted: false,
    raw_signed_transaction_returned: false,
    durable_submission_claimed: false,
    money_movement_performed: false,
  };
}
