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
  listBuyVoidPaymentKeyedPlanReservationsV1,
  type BuyVoidPaymentKeyedPlanReservationV1,
} from "./buy_void_payment_keyed_plan_reservation_v1.js";
import {
  readBuyVoidPaymentKeyedPreparationCustodyRecordV1,
  type BuyVoidPaymentKeyedPreparationCustodyRecordV1,
} from "./buy_void_payment_keyed_preparation_custody_v1.js";
import {
  VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_SIGNER_CONFIRMATION_V1,
  runBuyVoidPaymentKeyedCustodianSignerV1,
  type BuyVoidPaymentKeyedCustodianSignerReadyV1,
} from "./buy_void_payment_keyed_custodian_signer_v1.js";
import {
  VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_BROADCAST_CONFIRMATION_V1,
  runBuyVoidPaymentKeyedCustodianBroadcastV1,
  type BuyVoidPaymentKeyedCustodianBroadcastDecisionV1,
} from "./buy_void_payment_keyed_custodian_broadcast_v1.js";
import {
  readBuyVoidSagaBroadcastEvidenceStateV1,
  recordBuyVoidSagaBroadcastEvidenceV1,
  type BuyVoidSagaBroadcastEvidenceStateV1,
} from "./buy_void_saga_broadcast_evidence_journal_v1.js";
import type {
  BuyVoidPreparedTransactionBroadcasterReadyV1,
} from "./buy_void_prepared_transaction_broadcast_custody_v1.js";
import {
  buyVoidPaymentKeyedRuntimeServerPolicyFingerprintV1,
  type BuyVoidPaymentKeyedRuntimeServerPolicyV1,
} from "./buy_void_payment_keyed_runtime_preflight_v1.js";
import {
  validateBuyVoidPaymentKeyedTransactionPreparationPolicyV1,
} from "./buy_void_payment_keyed_transaction_preparation_v1.js";
import type {
  BuyVoidDeliveryBroadcasterV1,
  BuyVoidDeliverySignerV1,
} from "./buy_void_delivery_sign_broadcast_adapter_v1.js";
import type {
  BuyVoidDeliverySubmissionGuardV1,
} from "./buy_void_delivery_submission_guard_v1.js";

export const VOID_BUY_VOID_PAYMENT_KEYED_GUARDED_BROADCAST_COORDINATOR_V1 =
  "VOID_BUY_VOID_PAYMENT_KEYED_GUARDED_BROADCAST_COORDINATOR_V1";

export const VOID_BUY_VOID_PAYMENT_KEYED_GUARDED_BROADCAST_CONFIRMATION_V1 =
  "buyVoidAdvancePaymentKeyedGuardedBroadcastV1";

export const VOID_BUY_VOID_PAYMENT_KEYED_GUARDED_BROADCAST_AUTHORITY_V1 = {
  source_only_contract: true,
  runtime_route_mount: false,
  canonical_parent_dispatch: false,
  exact_attempt_selector: true,
  server_controlled_policy_required: true,
  prepared_attempt_required: true,
  transaction_prepared_or_explicit_not_submitted_retry_required: true,
  exact_nonce_reservation_required: true,
  exact_preparation_custody_required: true,
  exact_custodian_request_reused: true,
  deterministic_resign_before_broadcast_intent: true,
  stored_signed_hash_and_raw_sha256_must_match: true,
  saga_write_ahead_broadcast_intent_required: true,
  durable_submission_guard_required: true,
  payment_keyed_broadcaster_required: true,
  durable_external_outcome_evidence_before_projection: true,
  execution_attempt_projection_after_evidence: true,
  pipeline_projection_confirmation_server_selected: true,
  saga_outcome_after_projection: true,
  definitive_not_submitted_keeps_attempt_prepared: true,
  definitive_not_submitted_explicit_retry_possible: true,
  automatic_retry: false,
  unknown_submission_never_rebroadcast_here: true,
  accepted_submission_never_rebroadcast_here: true,
  raw_signed_transaction_input: false,
  raw_signed_transaction_persistence: false,
  raw_signed_transaction_output: false,
  receipt_wait: false,
  inventory_mutation: false,
  public_fulfilled_closeout: false,
  signing_when_applied: true,
  transaction_broadcast_when_applied: true,
  money_movement_possible_when_broadcast_accepted: true,
} as const;

export type BuyVoidPaymentKeyedGuardedBroadcastFaultStageV1 =
  | "after_resign_before_broadcast_intent"
  | "after_broadcast_intent_before_guard_claim"
  | "after_external_outcome_before_evidence"
  | "after_evidence_before_projection"
  | "after_projection_before_saga";

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
  deriveSagaNextActionV1: (state: Record<string, unknown>) => {
    action: string | null;
    terminal: boolean;
    required_confirmation: string | null;
  };
  createFilesystemSagaStoreV1: (rootDir: string) => SagaStoreV1;
  runSagaSupervisorTickV1: (
    input: Record<string, unknown>,
  ) => Promise<any>;
};

export type BuyVoidPaymentKeyedGuardedBroadcastDependenciesV1 = {
  read_attempt?: typeof readBuyVoidExecutionAttemptV1;
  list_intents?: typeof listBuyVoidFulfillmentJournalClaimsV1;
  list_inventory?: typeof listBuyVoidInventoryReservationsV1;
  list_plans?: typeof listBuyVoidPaymentKeyedPlanReservationsV1;
  read_custody?: typeof readBuyVoidPaymentKeyedPreparationCustodyRecordV1;
  read_evidence?: typeof readBuyVoidSagaBroadcastEvidenceStateV1;
  record_evidence?: typeof recordBuyVoidSagaBroadcastEvidenceV1;
  run_pipeline_command?: (
    command: Record<string, unknown>,
  ) => unknown | Promise<unknown>;
  signer?: BuyVoidDeliverySignerV1;
  submission_guard?: BuyVoidDeliverySubmissionGuardV1;
  broadcaster?: BuyVoidDeliveryBroadcasterV1;
  load_saga_module?: () => Promise<SagaModuleV1>;
  now_ms?: () => number;
  fault_inject?: (
    stage: BuyVoidPaymentKeyedGuardedBroadcastFaultStageV1,
  ) => void | Promise<void>;
};

export type BuyVoidPaymentKeyedGuardedBroadcastInputV1 = {
  root_dir: string;
  attempt_id: string;
  server_policy: BuyVoidPaymentKeyedRuntimeServerPolicyV1;
  apply?: boolean;
  confirmation?: unknown;
  runtime_policy_fingerprint_sha256?: unknown;
  preparation_policy_fingerprint_sha256?: unknown;
  saga_confirmation?: unknown;
  saga_action_confirmation?: unknown;
  signer_confirmation?: unknown;
  broadcast_confirmation?: unknown;
  dependencies?: BuyVoidPaymentKeyedGuardedBroadcastDependenciesV1;
};

export type BuyVoidPaymentKeyedGuardedBroadcastDecisionV1 =
  | {
      ok: true;
      status: "dry_run";
      applied: false;
      marker:
        typeof VOID_BUY_VOID_PAYMENT_KEYED_GUARDED_BROADCAST_COORDINATOR_V1;
      version: 1;
      attempt_id: string;
      saga_id: string;
      next_action:
        | "execute_prepared_transaction"
        | "reconcile_possible_broadcast";
      retrying_definitive_not_submitted: boolean;
      required_confirmation:
        typeof VOID_BUY_VOID_PAYMENT_KEYED_GUARDED_BROADCAST_CONFIRMATION_V1;
      required_runtime_policy_fingerprint_sha256: string;
      required_preparation_policy_fingerprint_sha256: string;
      required_saga_confirmation: string;
      required_saga_action_confirmation: string;
      required_signer_confirmation:
        | typeof VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_SIGNER_CONFIRMATION_V1
        | null;
      required_broadcast_confirmation:
        | typeof VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_BROADCAST_CONFIRMATION_V1
        | null;
      existing_evidence: BuyVoidSagaBroadcastEvidenceStateV1 | null;
      signer_access_performed: false;
      signing_performed: false;
      submission_guard_claimed: false;
      broadcast_call_performed: false;
      transaction_broadcast_accepted: false;
      reconciliation_required: boolean;
      raw_signed_transaction_persisted: false;
      raw_signed_transaction_returned: false;
      automatic_retry_allowed: false;
      money_movement_performed: false;
      money_movement_may_have_occurred: false;
    }
  | {
      ok: true;
      status:
        | "not_broadcast"
        | "broadcast_unknown"
        | "broadcast_accepted";
      applied: true;
      marker:
        typeof VOID_BUY_VOID_PAYMENT_KEYED_GUARDED_BROADCAST_COORDINATOR_V1;
      version: 1;
      attempt_id: string;
      saga_id: string;
      broadcast_intent_id: string;
      transaction_hash: string;
      provider_submission_id: string;
      evidence: BuyVoidSagaBroadcastEvidenceStateV1;
      saga_state: Record<string, unknown>;
      execution_attempt: BuyVoidExecutionAttemptStateV1;
      signer_access_performed: true;
      signing_performed: true;
      submission_guard_claimed: boolean;
      submission_guard_released: boolean;
      broadcast_call_performed: boolean;
      transaction_broadcast_accepted: boolean;
      reconciliation_required: boolean;
      raw_signed_transaction_persisted: false;
      raw_signed_transaction_returned: false;
      automatic_retry_allowed: false;
      money_movement_performed: boolean;
      money_movement_may_have_occurred: boolean;
    }
  | {
      ok: false;
      status: "held";
      applied: boolean;
      marker:
        typeof VOID_BUY_VOID_PAYMENT_KEYED_GUARDED_BROADCAST_COORDINATOR_V1;
      version: 1;
      stage:
        | "input"
        | "policy"
        | "journal_reconstruction"
        | "saga_reconstruction"
        | "confirmation"
        | "signing"
        | "external_submission"
        | "evidence_persistence"
        | "projection_persistence"
        | "saga_append";
      reason: string;
      mutation_performed: boolean;
      signer_access_performed: boolean;
      signing_performed: boolean;
      submission_guard_claimed: boolean;
      submission_guard_released: boolean;
      broadcast_call_performed: boolean;
      transaction_broadcast_accepted: boolean;
      reconciliation_required: boolean;
      raw_signed_transaction_persisted: false;
      raw_signed_transaction_returned: false;
      automatic_retry_allowed: false;
      money_movement_performed: boolean;
      money_movement_may_have_occurred: boolean;
      detail?: Record<string, unknown>;
    };

type ReconstructedV1 = {
  root_dir: string;
  attempt: BuyVoidExecutionAttemptStateV1;
  intent: BuyVoidFulfillmentJournalIntentV1;
  inventory: BuyVoidInventoryReservationV1;
  plan: BuyVoidPaymentKeyedPlanReservationV1;
  custody: BuyVoidPaymentKeyedPreparationCustodyRecordV1;
  saga: SagaModuleV1;
  store: SagaStoreV1;
  saga_id: string;
  saga_record: any;
  action:
    | "execute_prepared_transaction"
    | "reconcile_possible_broadcast";
  evidence: BuyVoidSagaBroadcastEvidenceStateV1 | null;
  runtime_policy_fingerprint_sha256: string;
  preparation_policy_fingerprint_sha256: string;
};

const SHA256 = /^[0-9a-f]{64}$/;
const SAGA_ID = /^voidbvfsg1_[0-9a-f]{64}$/;
const INTENT_ID = /^voidbvbci1_[0-9a-f]{64}$/;
const HASH = /^0x[0-9a-f]{64}$/;
const SAGA_ROOT = "buy-void-crash-consistent-saga-runtime-v1";
const LEASE_TTL_MS = 30_000;
const SOURCE_FLOOR_MAIN = "adf78bdbafed86d800cd1825c91691374e05f1a8";

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : String(value ?? "").trim();
}

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function absoluteRoot(value: unknown): string {
  const raw = text(value);
  if (!raw || !path.isAbsolute(raw) || raw.includes("\0")) {
    throw new Error("payment_keyed_guarded_broadcast_root_invalid");
  }
  const resolved = path.resolve(raw);
  if (resolved === path.parse(resolved).root) {
    throw new Error(
      "payment_keyed_guarded_broadcast_root_is_filesystem_root",
    );
  }
  return resolved;
}

function held(
  stage: Extract<
    BuyVoidPaymentKeyedGuardedBroadcastDecisionV1,
    { ok: false }
  >["stage"],
  applied: boolean,
  reason: string,
  options: {
    mutation_performed?: boolean;
    signer_access_performed?: boolean;
    signing_performed?: boolean;
    submission_guard_claimed?: boolean;
    submission_guard_released?: boolean;
    broadcast_call_performed?: boolean;
    transaction_broadcast_accepted?: boolean;
    reconciliation_required?: boolean;
    money_movement_performed?: boolean;
    money_movement_may_have_occurred?: boolean;
    detail?: Record<string, unknown>;
  } = {},
): Extract<
  BuyVoidPaymentKeyedGuardedBroadcastDecisionV1,
  { ok: false }
> {
  return {
    ok: false,
    status: "held",
    applied,
    marker:
      VOID_BUY_VOID_PAYMENT_KEYED_GUARDED_BROADCAST_COORDINATOR_V1,
    version: 1,
    stage,
    reason,
    mutation_performed: options.mutation_performed === true,
    signer_access_performed:
      options.signer_access_performed === true,
    signing_performed: options.signing_performed === true,
    submission_guard_claimed:
      options.submission_guard_claimed === true,
    submission_guard_released:
      options.submission_guard_released === true,
    broadcast_call_performed:
      options.broadcast_call_performed === true,
    transaction_broadcast_accepted:
      options.transaction_broadcast_accepted === true,
    reconciliation_required:
      options.reconciliation_required === true,
    raw_signed_transaction_persisted: false,
    raw_signed_transaction_returned: false,
    automatic_retry_allowed: false,
    money_movement_performed:
      options.money_movement_performed === true,
    money_movement_may_have_occurred:
      options.money_movement_may_have_occurred === true,
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
      text(intent.claim.unsigned_instruction.delivery_address)
        .toLowerCase(),
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
      "payment_keyed_guarded_broadcast_intent_count_invalid:" +
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
      text(intent.claim.unsigned_instruction.delivery_address)
        .toLowerCase() &&
    text(value.reserved_void_units) ===
      text(intent.claim.unsigned_instruction.void_amount_units)
  );
  if (matches.length !== 1) {
    throw new Error(
      "payment_keyed_guarded_broadcast_inventory_count_invalid:" +
        String(matches.length),
    );
  }
  return matches[0];
}

function exactPlan(
  values: BuyVoidPaymentKeyedPlanReservationV1[],
  attemptId: string,
): BuyVoidPaymentKeyedPlanReservationV1 {
  const matches = values.filter(
    (value) => value.attempt_id === attemptId,
  );
  if (matches.length !== 1) {
    throw new Error(
      "payment_keyed_guarded_broadcast_plan_count_invalid:" +
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
      throw new Error(
        "payment_keyed_guarded_broadcast_saga_directory_invalid",
      );
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

function assertDurableBindings(
  reconstructed: ReconstructedV1,
  serverPolicy: BuyVoidPaymentKeyedRuntimeServerPolicyV1,
): void {
  const {
    attempt,
    intent,
    inventory,
    plan,
    custody,
    saga_id: sagaId,
    saga_record: sagaRecord,
    runtime_policy_fingerprint_sha256: runtimeFingerprint,
    preparation_policy_fingerprint_sha256: preparationFingerprint,
  } = reconstructed;
  const prepared = attempt.prepared;
  const request = custody.request;
  const wallet = text(
    serverPolicy.preparation_policy.fulfillment_wallet_address,
  ).toLowerCase();
  const contract = text(
    serverPolicy.fulfillment_contract_address,
  ).toLowerCase();
  const delivery = text(
    intent.claim.unsigned_instruction.delivery_address,
  ).toLowerCase();
  const amount = text(
    intent.claim.unsigned_instruction.void_amount_units,
  );

  const executeBoundary =
    reconstructed.action === "execute_prepared_transaction";
  const attemptBoundaryValid = executeBoundary
    ? attempt.status === "prepared" && attempt.broadcast === null
    : (
        (attempt.status === "prepared" && attempt.broadcast === null) ||
        (
          attempt.status === "broadcast" &&
          attempt.broadcast !== null &&
          attempt.broadcast.void_delivery_tx_hash ===
            prepared?.void_delivery_tx_hash
        )
      );

  if (
    !prepared ||
    !attemptBoundaryValid ||
    attempt.failure ||
    attempt.postbroadcast_failure ||
    attempt.confirmation ||
    plan.saga_id !== sagaId ||
    plan.attempt_id !== attempt.reservation.attempt_id ||
    plan.wallet_address !== wallet ||
    plan.runtime_policy_fingerprint_sha256 !== runtimeFingerprint ||
    plan.preparation_policy_fingerprint_sha256 !==
      preparationFingerprint ||
    plan.fulfillment_call.fulfillment_contract_address !== contract ||
    plan.fulfillment_call.delivery_address !== delivery ||
    plan.fulfillment_call.void_amount_units !== amount ||
    custody.saga_id !== sagaId ||
    custody.attempt_id !== attempt.reservation.attempt_id ||
    custody.plan_reservation_id !== inventory.reservation_id ||
    custody.signed_transaction_hash !==
      prepared.void_delivery_tx_hash ||
    custody.signer_address !== wallet ||
    request.wallet_address !== wallet ||
    request.transaction_to !== contract ||
    request.delivery_address !== delivery ||
    request.void_amount_units !== amount ||
    request.transaction_plan_fingerprint_sha256 !==
      plan.transaction_plan_fingerprint_sha256 ||
    custody.raw_signed_transaction_persisted !== false ||
    custody.raw_signed_transaction_returned !== false ||
    prepared.fulfillment_wallet !== wallet ||
    prepared.delivery_address !== delivery ||
    prepared.void_amount_units !== amount ||
    sagaRecord.state?.attempt_id !==
      attempt.reservation.attempt_id ||
    sagaRecord.state?.transaction_hash !==
      prepared.void_delivery_tx_hash ||
    sagaRecord.state?.nonce !== plan.nonce ||
    sagaRecord.binding?.request_id !==
      attempt.reservation.request_id ||
    sagaRecord.binding?.canonical_payment_identity !==
      attempt.reservation.canonical_payment_identity ||
    sagaRecord.binding?.request_key_sha256 !==
      attempt.reservation.request_key_sha256 ||
    sagaRecord.binding?.payment_key_sha256 !==
      attempt.reservation.payment_key_sha256 ||
    sagaRecord.binding?.delivery_address !== delivery ||
    sagaRecord.binding?.void_amount_units !== amount ||
    sagaRecord.binding?.chain_id !== "2050" ||
    sagaRecord.binding?.pool_id !==
      serverPolicy.saga_policy.inventory_policy.pool_id
  ) {
    throw new Error(
      "payment_keyed_guarded_broadcast_durable_binding_conflict",
    );
  }
}

async function reconstruct(
  input: BuyVoidPaymentKeyedGuardedBroadcastInputV1,
  deps: ReturnType<typeof dependencies>,
  saga: SagaModuleV1,
  runtimeFingerprint: string,
  preparationFingerprint: string,
): Promise<
  | ReconstructedV1
  | Extract<
      BuyVoidPaymentKeyedGuardedBroadcastDecisionV1,
      { ok: false }
    >
> {
  let rootDir: string;
  try {
    rootDir = absoluteRoot(input.root_dir);
  } catch (error) {
    return held(
      "input",
      input.apply === true,
      text((error as Error)?.message || error),
    );
  }
  const attemptId = text(input.attempt_id).toLowerCase();
  if (!SHA256.test(attemptId)) {
    return held(
      "input",
      input.apply === true,
      "payment_keyed_guarded_broadcast_attempt_id_invalid",
    );
  }

  try {
    const attempt = deps.read_attempt({
      root_dir: rootDir,
      attempt_id: attemptId,
    });
    if (!attempt) {
      throw new Error(
        "payment_keyed_guarded_broadcast_attempt_missing",
      );
    }
    const intent = exactIntent(
      deps.list_intents(rootDir),
      attempt,
    );
    const inventory = exactInventory(
      deps.list_inventory({
        root_dir: rootDir,
        pool_id: input.server_policy.saga_policy
          .inventory_policy.pool_id,
      }),
      intent,
      input.server_policy.saga_policy.inventory_policy.pool_id,
    );
    const binding = saga.validateSagaBindingV1(
      sagaBinding(
        intent,
        input.server_policy.saga_policy.inventory_policy.pool_id,
      ),
    );
    const sagaId = text(saga.computeSagaIdV1(binding)).toLowerCase();
    if (!SAGA_ID.test(sagaId)) {
      throw new Error(
        "payment_keyed_guarded_broadcast_saga_id_invalid",
      );
    }
    const store = existingSagaStore(saga, rootDir, sagaId);
    const sagaRecord = store.recover(sagaId);
    if (!sagaRecord) {
      throw new Error(
        "payment_keyed_guarded_broadcast_saga_missing",
      );
    }
    if (
      sagaRecord.events?.[0]?.payload?.policy_id !==
        input.server_policy.saga_policy.saga_policy_id
    ) {
      throw new Error(
        "payment_keyed_guarded_broadcast_saga_policy_conflict",
      );
    }
    const plan = exactPlan(
      deps.list_plans({
        root_dir: rootDir,
        wallet_address:
          input.server_policy.preparation_policy
            .fulfillment_wallet_address,
      }),
      attemptId,
    );
    const custody = deps.read_custody({
      root_dir: rootDir,
      attempt_id: attemptId,
    });
    if (!custody) {
      throw new Error(
        "payment_keyed_guarded_broadcast_custody_missing",
      );
    }
    const next = saga.deriveSagaNextActionV1(sagaRecord.state);
    if (
      next.terminal ||
      (
        next.action !== "execute_prepared_transaction" &&
        next.action !== "reconcile_possible_broadcast"
      )
    ) {
      throw new Error(
        "payment_keyed_guarded_broadcast_action_outside_boundary:" +
          text(next.action),
      );
    }
    const evidence = deps.read_evidence({
      root_dir: rootDir,
      attempt_id: attemptId,
    });
    const reconstructed: ReconstructedV1 = {
      root_dir: rootDir,
      attempt,
      intent,
      inventory,
      plan,
      custody,
      saga,
      store,
      saga_id: sagaId,
      saga_record: sagaRecord,
      action: next.action,
      evidence,
      runtime_policy_fingerprint_sha256: runtimeFingerprint,
      preparation_policy_fingerprint_sha256:
        preparationFingerprint,
    };
    assertDurableBindings(reconstructed, input.server_policy);
    if (
      evidence &&
      (
        evidence.saga_id !== sagaId ||
        evidence.attempt_id !== attemptId ||
        evidence.broadcast_intent_id !==
          text(sagaRecord.state?.broadcast_intent_id).toLowerCase() ||
        evidence.transaction_hash !==
          attempt.prepared?.void_delivery_tx_hash
      )
    ) {
      throw new Error(
        "payment_keyed_guarded_broadcast_evidence_conflict",
      );
    }
    return reconstructed;
  } catch (error) {
    return held(
      "journal_reconstruction",
      input.apply === true,
      text((error as Error)?.message || error).slice(0, 240),
    );
  }
}

function dependencies(
  supplied?: BuyVoidPaymentKeyedGuardedBroadcastDependenciesV1,
) {
  return {
    read_attempt:
      supplied?.read_attempt || readBuyVoidExecutionAttemptV1,
    list_intents:
      supplied?.list_intents ||
      listBuyVoidFulfillmentJournalClaimsV1,
    list_inventory:
      supplied?.list_inventory ||
      listBuyVoidInventoryReservationsV1,
    list_plans:
      supplied?.list_plans ||
      listBuyVoidPaymentKeyedPlanReservationsV1,
    read_custody:
      supplied?.read_custody ||
      readBuyVoidPaymentKeyedPreparationCustodyRecordV1,
    read_evidence:
      supplied?.read_evidence ||
      readBuyVoidSagaBroadcastEvidenceStateV1,
    record_evidence:
      supplied?.record_evidence ||
      recordBuyVoidSagaBroadcastEvidenceV1,
    run_pipeline_command:
      supplied?.run_pipeline_command ||
      (runBuyVoidPipelineCommandV1 as any),
    signer: supplied?.signer,
    submission_guard: supplied?.submission_guard,
    broadcaster: supplied?.broadcaster,
    load_saga_module:
      supplied?.load_saga_module || defaultSagaModule,
    now_ms: supplied?.now_ms || Date.now,
    fault_inject:
      supplied?.fault_inject || (async () => undefined),
  };
}

function exactConfirmations(
  input: BuyVoidPaymentKeyedGuardedBroadcastInputV1,
  reconstructed: ReconstructedV1,
): Extract<
  BuyVoidPaymentKeyedGuardedBroadcastDecisionV1,
  { ok: false }
> | null {
  if (input.apply !== true) return null;
  if (
    text(input.confirmation) !==
      VOID_BUY_VOID_PAYMENT_KEYED_GUARDED_BROADCAST_CONFIRMATION_V1 ||
    text(input.runtime_policy_fingerprint_sha256) !==
      reconstructed.runtime_policy_fingerprint_sha256 ||
    text(input.preparation_policy_fingerprint_sha256) !==
      reconstructed.preparation_policy_fingerprint_sha256 ||
    text(input.saga_confirmation) !==
      reconstructed.saga.ADVANCE_CONFIRMATION ||
    text(input.saga_action_confirmation) !==
      reconstructed.saga.ACTION_CONFIRMATIONS[
        "execute_prepared_transaction"
      ] ||
    text(input.signer_confirmation) !==
      VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_SIGNER_CONFIRMATION_V1 ||
    text(input.broadcast_confirmation) !==
      VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_BROADCAST_CONFIRMATION_V1
  ) {
    return held(
      "confirmation",
      true,
      "payment_keyed_guarded_broadcast_exact_confirmations_required",
    );
  }
  return null;
}

async function resignExact(
  reconstructed: ReconstructedV1,
  signer: BuyVoidDeliverySignerV1,
): Promise<
  | BuyVoidPaymentKeyedCustodianSignerReadyV1
  | Extract<
      BuyVoidPaymentKeyedGuardedBroadcastDecisionV1,
      { ok: false }
    >
> {
  const signed = await runBuyVoidPaymentKeyedCustodianSignerV1({
    request: reconstructed.custody.request,
    signer,
    apply: true,
    confirmation:
      VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_SIGNER_CONFIRMATION_V1,
  });
  if (signed.ok === false) {
    return held("signing", true, signed.reason, {
      signer_access_performed:
        signed.wallet_access_performed,
      signing_performed: signed.signing_performed,
    });
  }
  if (
    signed.status !== "signed" ||
    !signed.raw_signed_transaction ||
    signed.signed_transaction_hash !==
      reconstructed.custody.signed_transaction_hash ||
    signed.raw_signed_transaction_sha256 !==
      reconstructed.custody.raw_signed_transaction_sha256 ||
    signed.request_fingerprint_sha256 !==
      reconstructed.custody.request.request_fingerprint_sha256 ||
    signed.transaction_plan_fingerprint_sha256 !==
      reconstructed.plan.transaction_plan_fingerprint_sha256
  ) {
    return held(
      "signing",
      true,
      "payment_keyed_guarded_broadcast_resign_binding_conflict",
      {
        signer_access_performed: true,
        signing_performed: true,
        reconciliation_required: false,
      },
    );
  }
  return signed;
}

function evidenceOutcome(
  decision: BuyVoidPaymentKeyedCustodianBroadcastDecisionV1,
): BuyVoidPreparedTransactionBroadcasterReadyV1 | null {
  if (
    decision.ok === true &&
    decision.status === "broadcast_accepted"
  ) {
    return {
      ok: true,
      status: "accepted",
      transaction_hash: decision.transaction_hash,
      provider_submission_id: decision.provider_submission_id,
      definitive_not_submitted: false,
      submission_call_performed: true,
      submission_may_have_occurred: true,
      receipt: null,
    };
  }
  if (
    decision.ok === false &&
    decision.status === "broadcast_unknown" &&
    decision.expected_transaction_hash
  ) {
    return {
      ok: true,
      status: "unknown",
      transaction_hash: decision.expected_transaction_hash,
      provider_submission_id: decision.provider_submission_id,
      definitive_not_submitted: false,
      submission_call_performed: true,
      submission_may_have_occurred: true,
      receipt: null,
    };
  }
  if (
    decision.ok === false &&
    decision.status === "not_broadcast" &&
    decision.expected_transaction_hash &&
    decision.submission_guard_released === true &&
    decision.retry_allowed === true &&
    decision.reconciliation_required === false
  ) {
    return {
      ok: true,
      status: "not_submitted",
      transaction_hash: decision.expected_transaction_hash,
      provider_submission_id: decision.provider_submission_id,
      definitive_not_submitted: true,
      submission_call_performed:
        decision.broadcast_call_performed,
      submission_may_have_occurred: false,
      receipt: null,
    };
  }
  return null;
}

function sagaActionResult(
  decision: BuyVoidPaymentKeyedCustodianBroadcastDecisionV1,
  attemptId: string,
  transactionHash: string,
): Record<string, unknown> {
  if (
    decision.ok === false &&
    decision.status === "not_broadcast"
  ) {
    return {
      outcome: "broadcast_not_attempted",
      payload: {
        attempt_id: attemptId,
        transaction_hash: transactionHash,
        reason_code: "payment_keyed_definitive_not_submitted",
        broadcast_call_performed:
          decision.broadcast_call_performed,
      },
    };
  }
  if (
    decision.ok === false &&
    decision.status === "broadcast_unknown"
  ) {
    return {
      outcome: "broadcast_unknown",
      payload: {
        attempt_id: attemptId,
        transaction_hash: transactionHash,
        reason_code: "payment_keyed_submission_unknown",
        broadcast_call_performed: true,
        provider_submission_id_sha256:
          sha256(decision.provider_submission_id),
      },
    };
  }
  if (
    decision.ok === true &&
    decision.status === "broadcast_accepted"
  ) {
    return {
      outcome: "broadcast_accepted",
      payload: {
        attempt_id: attemptId,
        transaction_hash: transactionHash,
        reason_code: "payment_keyed_submission_accepted",
        broadcast_call_performed: true,
        provider_submission_id_sha256:
          sha256(decision.provider_submission_id),
      },
    };
  }
  throw new Error(
    "payment_keyed_guarded_broadcast_outcome_not_projectable",
  );
}

async function requirePipelineApplied(
  deps: ReturnType<typeof dependencies>,
  command: Record<string, unknown>,
): Promise<void> {
  const decision = await Promise.resolve(
    deps.run_pipeline_command(command),
  ) as any;
  if (
    !decision ||
    decision.ok !== true ||
    decision.status !== "applied"
  ) {
    throw new Error(
      "payment_keyed_guarded_broadcast_pipeline_held:" +
        text(decision?.reason || decision?.status || "unknown"),
    );
  }
}

async function persistAttemptProjection(
  reconstructed: ReconstructedV1,
  deps: ReturnType<typeof dependencies>,
  decision: BuyVoidPaymentKeyedCustodianBroadcastDecisionV1,
  nowMs: number,
): Promise<void> {
  if (
    decision.ok === false &&
    decision.status === "not_broadcast"
  ) {
    return;
  }
  const transactionHash =
    reconstructed.custody.signed_transaction_hash;
  if (
    decision.ok === false &&
    decision.status === "broadcast_unknown"
  ) {
    await requirePipelineApplied(deps, {
      action: "record_broadcast_unknown",
      root_dir: reconstructed.root_dir,
      attempt_id: reconstructed.attempt.reservation.attempt_id,
      transaction_hash: transactionHash,
      reason_code: "payment_keyed_external_submission_unknown",
      provider_submission_id: decision.provider_submission_id,
      apply: true,
      confirmation:
        VOID_BUY_VOID_PIPELINE_CONFIRMATIONS_V1
          .record_broadcast_unknown,
      now_ms: nowMs,
    });
    return;
  }
  if (
    decision.ok === true &&
    decision.status === "broadcast_accepted"
  ) {
    await requirePipelineApplied(deps, {
      action: "record_broadcast_accepted",
      root_dir: reconstructed.root_dir,
      attempt_id: reconstructed.attempt.reservation.attempt_id,
      transaction_hash: transactionHash,
      provider_submission_id: decision.provider_submission_id,
      apply: true,
      confirmation:
        VOID_BUY_VOID_PIPELINE_CONFIRMATIONS_V1
          .record_broadcast_accepted,
      now_ms: nowMs,
    });
    return;
  }
  throw new Error(
    "payment_keyed_guarded_broadcast_projection_outcome_invalid",
  );
}

function finalSuccess(
  reconstructed: ReconstructedV1,
  deps: ReturnType<typeof dependencies>,
  decision: BuyVoidPaymentKeyedCustodianBroadcastDecisionV1,
  broadcastIntentId: string,
): BuyVoidPaymentKeyedGuardedBroadcastDecisionV1 {
  const finalSaga = reconstructed.store.recover(
    reconstructed.saga_id,
  );
  const finalAttempt = deps.read_attempt({
    root_dir: reconstructed.root_dir,
    attempt_id: reconstructed.attempt.reservation.attempt_id,
  });
  const finalEvidence = deps.read_evidence({
    root_dir: reconstructed.root_dir,
    attempt_id: reconstructed.attempt.reservation.attempt_id,
  });
  if (!finalSaga || !finalAttempt || !finalEvidence) {
    return held(
      "journal_reconstruction",
      true,
      "payment_keyed_guarded_broadcast_final_state_missing",
      {
        mutation_performed: true,
        reconciliation_required: true,
        signer_access_performed: true,
        signing_performed: true,
        submission_guard_claimed:
          decision.submission_guard_claimed,
        submission_guard_released:
          decision.submission_guard_released,
        broadcast_call_performed:
          decision.broadcast_call_performed,
        transaction_broadcast_accepted:
          decision.ok === true &&
          decision.status === "broadcast_accepted",
        money_movement_performed:
          decision.ok === true &&
          decision.status === "broadcast_accepted",
        money_movement_may_have_occurred:
          decision.broadcast_call_performed,
      },
    );
  }

  let status:
    | "not_broadcast"
    | "broadcast_unknown"
    | "broadcast_accepted";
  if (
    decision.ok === true &&
    decision.status === "broadcast_accepted"
  ) {
    status = "broadcast_accepted";
  } else if (
    decision.ok === false &&
    (
      decision.status === "not_broadcast" ||
      decision.status === "broadcast_unknown"
    )
  ) {
    status = decision.status;
  } else {
    return held(
      "saga_append",
      true,
      "payment_keyed_guarded_broadcast_final_outcome_invalid",
      {
        mutation_performed: true,
        reconciliation_required: true,
        signer_access_performed: true,
        signing_performed: true,
      },
    );
  }
  const accepted = status === "broadcast_accepted";
  const unknown = status === "broadcast_unknown";
  return {
    ok: true,
    status,
    applied: true,
    marker:
      VOID_BUY_VOID_PAYMENT_KEYED_GUARDED_BROADCAST_COORDINATOR_V1,
    version: 1,
    attempt_id: reconstructed.attempt.reservation.attempt_id,
    saga_id: reconstructed.saga_id,
    broadcast_intent_id: broadcastIntentId,
    transaction_hash:
      reconstructed.custody.signed_transaction_hash,
    provider_submission_id:
      decision.provider_submission_id,
    evidence: finalEvidence,
    saga_state: finalSaga.state,
    execution_attempt: finalAttempt,
    signer_access_performed: true,
    signing_performed: true,
    submission_guard_claimed:
      decision.submission_guard_claimed,
    submission_guard_released:
      decision.submission_guard_released,
    broadcast_call_performed:
      decision.broadcast_call_performed,
    transaction_broadcast_accepted: accepted,
    reconciliation_required: unknown || accepted,
    raw_signed_transaction_persisted: false,
    raw_signed_transaction_returned: false,
    automatic_retry_allowed: false,
    money_movement_performed: accepted,
    money_movement_may_have_occurred:
      unknown || accepted,
  };
}

export async function runBuyVoidPaymentKeyedGuardedBroadcastV1(
  input: BuyVoidPaymentKeyedGuardedBroadcastInputV1,
): Promise<BuyVoidPaymentKeyedGuardedBroadcastDecisionV1> {
  const applied = input?.apply === true;
  const runtimePolicy =
    buyVoidPaymentKeyedRuntimeServerPolicyFingerprintV1(
      input?.server_policy,
    );
  if (runtimePolicy.ok === false) {
    return held("policy", applied, runtimePolicy.reason);
  }
  const preparationPolicy =
    validateBuyVoidPaymentKeyedTransactionPreparationPolicyV1(
      input?.server_policy?.preparation_policy,
    );
  if (preparationPolicy.ok === false) {
    return held("policy", applied, preparationPolicy.reason);
  }

  const deps = dependencies(input?.dependencies);
  let saga: SagaModuleV1;
  try {
    saga = await deps.load_saga_module();
  } catch (error) {
    return held(
      "saga_reconstruction",
      applied,
      "payment_keyed_guarded_broadcast_saga_module_failed",
      {
        detail: {
          error_class: text((error as Error)?.name || "Error"),
        },
      },
    );
  }

  const reconstructed = await reconstruct(
    input,
    deps,
    saga,
    runtimePolicy.fingerprint,
    preparationPolicy.policy_fingerprint_sha256,
  );
  if ("reason" in reconstructed) return reconstructed;

  if (!applied) {
    const execute =
      reconstructed.action === "execute_prepared_transaction";
    return {
      ok: true,
      status: "dry_run",
      applied: false,
      marker:
        VOID_BUY_VOID_PAYMENT_KEYED_GUARDED_BROADCAST_COORDINATOR_V1,
      version: 1,
      attempt_id: reconstructed.attempt.reservation.attempt_id,
      saga_id: reconstructed.saga_id,
      next_action: reconstructed.action,
      retrying_definitive_not_submitted:
        reconstructed.saga_record.state?.state ===
          "broadcast_not_attempted",
      required_confirmation:
        VOID_BUY_VOID_PAYMENT_KEYED_GUARDED_BROADCAST_CONFIRMATION_V1,
      required_runtime_policy_fingerprint_sha256:
        runtimePolicy.fingerprint,
      required_preparation_policy_fingerprint_sha256:
        preparationPolicy.policy_fingerprint_sha256,
      required_saga_confirmation:
        reconstructed.saga.ADVANCE_CONFIRMATION,
      required_saga_action_confirmation:
        reconstructed.saga.ACTION_CONFIRMATIONS[
          reconstructed.action
        ],
      required_signer_confirmation: execute
        ? VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_SIGNER_CONFIRMATION_V1
        : null,
      required_broadcast_confirmation: execute
        ? VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_BROADCAST_CONFIRMATION_V1
        : null,
      existing_evidence: reconstructed.evidence,
      signer_access_performed: false,
      signing_performed: false,
      submission_guard_claimed: false,
      broadcast_call_performed: false,
      transaction_broadcast_accepted: false,
      reconciliation_required: !execute,
      raw_signed_transaction_persisted: false,
      raw_signed_transaction_returned: false,
      automatic_retry_allowed: false,
      money_movement_performed: false,
      money_movement_may_have_occurred: false,
    };
  }

  if (
    reconstructed.action !== "execute_prepared_transaction"
  ) {
    return held(
      "saga_reconstruction",
      true,
      "payment_keyed_guarded_broadcast_reconciliation_required",
      {
        reconciliation_required: true,
      },
    );
  }

  const confirmationHold = exactConfirmations(
    input,
    reconstructed,
  );
  if (confirmationHold) return confirmationHold;

  if (
    !deps.signer ||
    !deps.submission_guard ||
    !deps.broadcaster
  ) {
    return held(
      "input",
      true,
      "payment_keyed_guarded_broadcast_dependencies_required",
    );
  }

  const signed = await resignExact(
    reconstructed,
    deps.signer,
  );
  if ("reason" in signed) return signed;

  try {
    await deps.fault_inject(
      "after_resign_before_broadcast_intent",
    );
  } catch (error) {
    return held(
      "signing",
      true,
      "payment_keyed_guarded_broadcast_injected_after_resign",
      {
        signer_access_performed: true,
        signing_performed: true,
        detail: {
          error_class: text((error as Error)?.name || "Error"),
        },
      },
    );
  }

  const nowMs = deps.now_ms();
  if (!Number.isSafeInteger(nowMs) || nowMs <= 0) {
    return held(
      "input",
      true,
      "payment_keyed_guarded_broadcast_server_clock_invalid",
      {
        signer_access_performed: true,
        signing_performed: true,
      },
    );
  }

  let external:
    | BuyVoidPaymentKeyedCustodianBroadcastDecisionV1
    | null = null;
  let evidence:
    | BuyVoidSagaBroadcastEvidenceStateV1
    | null = null;
  let broadcastIntentId = "";

  let sagaResult: any;
  try {
    sagaResult = await reconstructed.saga.runSagaSupervisorTickV1({
      store: reconstructed.store,
      binding: reconstructed.saga_record.binding,
      owner_id:
        "void-buy-payment-keyed-broadcast-" +
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
      confirmation: input.saga_confirmation,
      action_confirmation: input.saga_action_confirmation,
      adapters: {
        execute_prepared_transaction: async (
          adapterInput: Record<string, unknown>,
        ) => {
          broadcastIntentId = text(
            adapterInput.broadcast_intent_id,
          ).toLowerCase();
          if (!INTENT_ID.test(broadcastIntentId)) {
            throw new Error(
              "payment_keyed_guarded_broadcast_intent_id_invalid",
            );
          }
          const committed = adapterInput.record as any;
          if (
            committed?.state?.state !==
              "broadcast_intent_committed" ||
            committed?.state?.broadcast_intent_id !==
              broadcastIntentId ||
            committed?.state?.transaction_hash !==
              reconstructed.custody.signed_transaction_hash
          ) {
            throw new Error(
              "payment_keyed_guarded_broadcast_write_ahead_missing",
            );
          }

          await deps.fault_inject(
            "after_broadcast_intent_before_guard_claim",
          );

          external =
            await runBuyVoidPaymentKeyedCustodianBroadcastV1({
              request: reconstructed.custody.request,
              signed,
              apply: true,
              confirmation:
                VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_BROADCAST_CONFIRMATION_V1,
              dependencies: {
                submission_guard: deps.submission_guard!,
                broadcaster: deps.broadcaster!,
              },
            });

          const mapped = evidenceOutcome(external);
          if (!mapped) {
            throw new Error(
              "payment_keyed_guarded_broadcast_external_held:" +
                text(
                  external.ok === false
                    ? external.reason
                    : external.status,
                ),
            );
          }

          await deps.fault_inject(
            "after_external_outcome_before_evidence",
          );

          const evidenceDecision = deps.record_evidence({
            root_dir: reconstructed.root_dir,
            saga_id: reconstructed.saga_id,
            attempt_id:
              reconstructed.attempt.reservation.attempt_id,
            broadcast_intent_id: broadcastIntentId,
            transaction_hash:
              reconstructed.custody.signed_transaction_hash,
            outcome: mapped,
            now_ms: nowMs,
          });
          if (evidenceDecision.ok === false) {
            throw new Error(
              "payment_keyed_guarded_broadcast_evidence_held:" +
                evidenceDecision.reason,
            );
          }
          evidence = evidenceDecision.state;

          await deps.fault_inject(
            "after_evidence_before_projection",
          );

          await persistAttemptProjection(
            reconstructed,
            deps,
            external,
            nowMs,
          );

          await deps.fault_inject(
            "after_projection_before_saga",
          );

          return sagaActionResult(
            external,
            reconstructed.attempt.reservation.attempt_id,
            reconstructed.custody.signed_transaction_hash,
          );
        },
      },
    });
  } catch (error) {
    return held(
      external ? "saga_append" : "external_submission",
      true,
      text((error as Error)?.message || error).slice(0, 240),
      {
        mutation_performed:
          Boolean(broadcastIntentId) ||
          Boolean(evidence) ||
          Boolean(external?.broadcast_call_performed),
        signer_access_performed: true,
        signing_performed: true,
        submission_guard_claimed:
          external?.submission_guard_claimed === true,
        submission_guard_released:
          external?.submission_guard_released === true,
        broadcast_call_performed:
          external?.broadcast_call_performed === true,
        transaction_broadcast_accepted:
          external?.ok === true &&
          external.status === "broadcast_accepted",
        reconciliation_required:
          Boolean(broadcastIntentId),
        money_movement_performed:
          external?.ok === true &&
          external.status === "broadcast_accepted",
        money_movement_may_have_occurred:
          external?.broadcast_call_performed === true &&
          !(
            external.ok === false &&
            external.status === "not_broadcast"
          ),
      },
    );
  }

  if (
    !sagaResult ||
    sagaResult.ok !== true ||
    sagaResult.status !== "applied" ||
    !external ||
    !evidence ||
    !INTENT_ID.test(broadcastIntentId)
  ) {
    return held(
      "saga_append",
      true,
      "payment_keyed_guarded_broadcast_capture_missing",
      {
        mutation_performed: true,
        signer_access_performed: true,
        signing_performed: true,
        reconciliation_required: true,
      },
    );
  }

  return finalSuccess(
    reconstructed,
    deps,
    external,
    broadcastIntentId,
  );
}
