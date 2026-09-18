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
  readBuyVoidBroadcastOutcomeStateV1,
  type BuyVoidBroadcastOutcomeStateV1,
} from "./buy_void_broadcast_outcome_journal_v1.js";
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
  buyVoidPaymentKeyedRuntimeServerPolicyFingerprintV1,
  type BuyVoidPaymentKeyedRuntimeServerPolicyV1,
} from "./buy_void_payment_keyed_runtime_preflight_v1.js";
import {
  validateBuyVoidPaymentKeyedTransactionPreparationPolicyV1,
} from "./buy_void_payment_keyed_transaction_preparation_v1.js";
import {
  validateBuyVoidPaymentKeyedFulfillmentReceiptPolicyV1,
  type BuyVoidPaymentKeyedFulfillmentReceiptPolicyV1,
} from "./buy_void_payment_keyed_fulfillment_receipt_v1.js";
import {
  runBuyVoidPaymentKeyedReceiptOutcomeV1,
  type BuyVoidPaymentKeyedReceiptOutcomeTransportV1,
} from "./buy_void_payment_keyed_receipt_outcome_v1.js";
import {
  readBuyVoidPaymentKeyedReceiptEvidenceV1,
  recordBuyVoidPaymentKeyedReceiptEvidenceV1,
  type BuyVoidPaymentKeyedReceiptEvidenceV1,
} from "./buy_void_payment_keyed_receipt_evidence_v1.js";

export const VOID_BUY_VOID_PAYMENT_KEYED_RECEIPT_RECONCILIATION_V1 =
  "VOID_BUY_VOID_PAYMENT_KEYED_RECEIPT_RECONCILIATION_V1";

export const VOID_BUY_VOID_PAYMENT_KEYED_RECEIPT_RECONCILIATION_CONFIRMATION_V1 =
  "buyVoidReconcilePaymentKeyedReceiptV1";

export const VOID_BUY_VOID_PAYMENT_KEYED_RECEIPT_RECONCILIATION_AUTHORITY_V1 = {
  source_only_contract: true,
  runtime_route_mount: false,
  canonical_parent_dispatch: false,
  exact_attempt_selector: true,
  server_controlled_runtime_policy_required: true,
  server_controlled_receipt_policy_required: true,
  exact_payment_keyed_receipt_outcome_required: true,
  immutable_terminal_receipt_evidence_before_projection: true,
  canonical_broadcast_projection_repaired_before_terminal_projection: true,
  canonical_saga_broadcast_accepted_repaired_before_receipt_event: true,
  canonical_record_confirmed_reused_for_success: true,
  canonical_record_reverted_reused_for_status_zero: true,
  economic_recipient_projection_preserved: true,
  fulfillment_contract_receipt_truth_preserved: true,
  receipt_evidence_recovery_requires_no_rpc: true,
  signer_access: false,
  signing: false,
  submission_guard_mutation: false,
  transaction_broadcast: false,
  automatic_retry: false,
  inventory_mutation: false,
  public_fulfilled_closeout: false,
  money_movement: false,
} as const;

export type BuyVoidPaymentKeyedReceiptReconciliationFaultStageV1 =
  | "after_receipt_evidence_before_broadcast_projection"
  | "after_broadcast_projection_before_saga_accepted"
  | "after_saga_accepted_before_terminal_projection"
  | "after_terminal_projection_before_saga_receipt";

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

export type BuyVoidPaymentKeyedReceiptReconciliationDependenciesV1 = {
  read_attempt?: typeof readBuyVoidExecutionAttemptV1;
  list_intents?: typeof listBuyVoidFulfillmentJournalClaimsV1;
  list_inventory?: typeof listBuyVoidInventoryReservationsV1;
  list_plans?: typeof listBuyVoidPaymentKeyedPlanReservationsV1;
  read_custody?: typeof readBuyVoidPaymentKeyedPreparationCustodyRecordV1;
  read_receipt_evidence?: typeof readBuyVoidPaymentKeyedReceiptEvidenceV1;
  record_receipt_evidence?: typeof recordBuyVoidPaymentKeyedReceiptEvidenceV1;
  read_outcome?: typeof readBuyVoidBroadcastOutcomeStateV1;
  run_pipeline_command?: (
    command: Record<string, unknown>,
  ) => unknown | Promise<unknown>;
  run_receipt_outcome?: typeof runBuyVoidPaymentKeyedReceiptOutcomeV1;
  receipt_transport?: BuyVoidPaymentKeyedReceiptOutcomeTransportV1;
  load_saga_module?: () => Promise<SagaModuleV1>;
  now_ms?: () => number;
  fault_inject?: (
    stage: BuyVoidPaymentKeyedReceiptReconciliationFaultStageV1,
  ) => void | Promise<void>;
};

export type BuyVoidPaymentKeyedReceiptReconciliationInputV1 = {
  root_dir: string;
  attempt_id: string;
  server_policy: BuyVoidPaymentKeyedRuntimeServerPolicyV1;
  receipt_policy: BuyVoidPaymentKeyedFulfillmentReceiptPolicyV1;
  apply?: boolean;
  confirmation?: unknown;
  runtime_policy_fingerprint_sha256?: unknown;
  preparation_policy_fingerprint_sha256?: unknown;
  receipt_policy_fingerprint_sha256?: unknown;
  saga_confirmation?: unknown;
  saga_action_confirmation?: unknown;
  dependencies?: BuyVoidPaymentKeyedReceiptReconciliationDependenciesV1;
};

export type BuyVoidPaymentKeyedReceiptReconciliationDecisionV1 =
  | {
      ok: true;
      status: "dry_run";
      applied: false;
      marker:
        typeof VOID_BUY_VOID_PAYMENT_KEYED_RECEIPT_RECONCILIATION_V1;
      version: 1;
      saga_id: string;
      attempt_id: string;
      saga_state: string;
      existing_receipt_evidence:
        BuyVoidPaymentKeyedReceiptEvidenceV1 | null;
      rpc_required_on_apply: boolean;
      required_confirmation:
        typeof VOID_BUY_VOID_PAYMENT_KEYED_RECEIPT_RECONCILIATION_CONFIRMATION_V1;
      required_runtime_policy_fingerprint_sha256: string;
      required_preparation_policy_fingerprint_sha256: string;
      required_receipt_policy_fingerprint_sha256: string;
      required_saga_confirmation: string;
      required_saga_action_confirmation: string;
      rpc_call_performed: false;
      receipt_evidence_mutation_performed: false;
      canonical_projection_mutation_performed: false;
      saga_mutation_performed: false;
      signer_access_performed: false;
      signing_performed: false;
      transaction_broadcast_performed: false;
      inventory_mutation_performed: false;
      public_fulfilled_closeout_performed: false;
      money_movement_performed: false;
    }
  | {
      ok: true;
      status:
        | "pending"
        | "confirmed"
        | "reverted"
        | "duplicate_confirmed"
        | "duplicate_reverted";
      applied: true;
      marker:
        typeof VOID_BUY_VOID_PAYMENT_KEYED_RECEIPT_RECONCILIATION_V1;
      version: 1;
      saga_id: string;
      attempt_id: string;
      receipt_evidence:
        BuyVoidPaymentKeyedReceiptEvidenceV1 | null;
      execution_attempt: BuyVoidExecutionAttemptStateV1;
      broadcast_outcome: BuyVoidBroadcastOutcomeStateV1 | null;
      saga_state: Record<string, unknown>;
      ready_for_terminal_closeout: boolean;
      terminal_revert: boolean;
      rpc_call_performed: boolean;
      receipt_evidence_mutation_performed: boolean;
      canonical_projection_mutation_performed: boolean;
      saga_mutation_performed: boolean;
      signer_access_performed: false;
      signing_performed: false;
      transaction_broadcast_performed: false;
      inventory_mutation_performed: false;
      public_fulfilled_closeout_performed: false;
      automatic_retry_allowed: false;
      money_movement_performed: false;
    }
  | {
      ok: false;
      status: "held";
      applied: boolean;
      marker:
        typeof VOID_BUY_VOID_PAYMENT_KEYED_RECEIPT_RECONCILIATION_V1;
      version: 1;
      stage:
        | "input"
        | "policy"
        | "journal_reconstruction"
        | "saga_reconstruction"
        | "confirmation"
        | "receipt_outcome"
        | "receipt_evidence"
        | "broadcast_projection"
        | "saga_broadcast_projection"
        | "terminal_projection"
        | "saga_receipt";
      reason: string;
      mutation_performed: boolean;
      rpc_call_performed: boolean;
      receipt_evidence_mutation_performed: boolean;
      canonical_projection_mutation_performed: boolean;
      saga_mutation_performed: boolean;
      signer_access_performed: false;
      signing_performed: false;
      transaction_broadcast_performed: false;
      inventory_mutation_performed: false;
      public_fulfilled_closeout_performed: false;
      automatic_retry_allowed: false;
      money_movement_performed: false;
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
  receipt_evidence: BuyVoidPaymentKeyedReceiptEvidenceV1 | null;
  outcome: BuyVoidBroadcastOutcomeStateV1 | null;
};

const SHA256 = /^[0-9a-f]{64}$/;
const SAGA_ID = /^voidbvfsg1_[0-9a-f]{64}$/;
const SAGA_ROOT = "buy-void-crash-consistent-saga-runtime-v1";
const LEASE_TTL_MS = 30_000;
const SOURCE_FLOOR_MAIN = "7293c668ec6e0edd632f53e8b3b1d036fab11288";
const MAX_SAGA_CONFIRMATIONS = 1_000_000n;

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : String(value ?? "").trim();
}

function held(
  stage: Extract<
    BuyVoidPaymentKeyedReceiptReconciliationDecisionV1,
    { ok: false }
  >["stage"],
  applied: boolean,
  reason: string,
  options: {
    mutation_performed?: boolean;
    rpc_call_performed?: boolean;
    receipt_evidence_mutation_performed?: boolean;
    canonical_projection_mutation_performed?: boolean;
    saga_mutation_performed?: boolean;
    detail?: Record<string, unknown>;
  } = {},
): Extract<
  BuyVoidPaymentKeyedReceiptReconciliationDecisionV1,
  { ok: false }
> {
  return {
    ok: false,
    status: "held",
    applied,
    marker: VOID_BUY_VOID_PAYMENT_KEYED_RECEIPT_RECONCILIATION_V1,
    version: 1,
    stage,
    reason,
    mutation_performed: options.mutation_performed === true,
    rpc_call_performed: options.rpc_call_performed === true,
    receipt_evidence_mutation_performed:
      options.receipt_evidence_mutation_performed === true,
    canonical_projection_mutation_performed:
      options.canonical_projection_mutation_performed === true,
    saga_mutation_performed:
      options.saga_mutation_performed === true,
    signer_access_performed: false,
    signing_performed: false,
    transaction_broadcast_performed: false,
    inventory_mutation_performed: false,
    public_fulfilled_closeout_performed: false,
    automatic_retry_allowed: false,
    money_movement_performed: false,
    ...(options.detail ? { detail: options.detail } : {}),
  };
}

function absoluteRoot(value: unknown): string {
  const raw = text(value);
  if (!raw || !path.isAbsolute(raw) || raw.includes("\0")) {
    throw new Error("payment_keyed_receipt_reconciliation_root_invalid");
  }
  const resolved = path.resolve(raw);
  if (resolved === path.parse(resolved).root) {
    throw new Error(
      "payment_keyed_receipt_reconciliation_root_is_filesystem_root",
    );
  }
  return resolved;
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
      "payment_keyed_receipt_reconciliation_intent_count_invalid:" +
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
      "payment_keyed_receipt_reconciliation_inventory_count_invalid:" +
        String(matches.length),
    );
  }
  return matches[0];
}

function exactPlan(
  values: BuyVoidPaymentKeyedPlanReservationV1[],
  attemptId: string,
): BuyVoidPaymentKeyedPlanReservationV1 {
  const matches = values.filter((value) => value.attempt_id === attemptId);
  if (matches.length !== 1) {
    throw new Error(
      "payment_keyed_receipt_reconciliation_plan_count_invalid:" +
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
    const stat = fs.lstatSync(directory);
    if (!stat.isDirectory() || stat.isSymbolicLink()) {
      throw new Error(
        "payment_keyed_receipt_reconciliation_saga_directory_invalid",
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

function dependencies(
  supplied?: BuyVoidPaymentKeyedReceiptReconciliationDependenciesV1,
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
    read_receipt_evidence:
      supplied?.read_receipt_evidence ||
      readBuyVoidPaymentKeyedReceiptEvidenceV1,
    record_receipt_evidence:
      supplied?.record_receipt_evidence ||
      recordBuyVoidPaymentKeyedReceiptEvidenceV1,
    read_outcome:
      supplied?.read_outcome ||
      readBuyVoidBroadcastOutcomeStateV1,
    run_pipeline_command:
      supplied?.run_pipeline_command ||
      (runBuyVoidPipelineCommandV1 as any),
    run_receipt_outcome:
      supplied?.run_receipt_outcome ||
      runBuyVoidPaymentKeyedReceiptOutcomeV1,
    receipt_transport: supplied?.receipt_transport,
    load_saga_module:
      supplied?.load_saga_module || defaultSagaModule,
    now_ms: supplied?.now_ms || Date.now,
    fault_inject:
      supplied?.fault_inject || (async () => undefined),
  };
}

function assertDurableBindings(
  reconstructed: Omit<
    ReconstructedV1,
    "receipt_evidence" | "outcome"
  >,
  input: BuyVoidPaymentKeyedReceiptReconciliationInputV1,
  runtimeFingerprint: string,
  preparationFingerprint: string,
  receiptFingerprint: string,
): void {
  const {
    attempt,
    intent,
    inventory,
    plan,
    custody,
    saga_id: sagaId,
    saga_record: sagaRecord,
  } = reconstructed;
  const prepared = attempt.prepared;
  const request = custody.request;
  const wallet = text(
    input.server_policy.preparation_policy.fulfillment_wallet_address,
  ).toLowerCase();
  const contract = text(
    input.server_policy.fulfillment_contract_address,
  ).toLowerCase();
  const delivery = text(
    intent.claim.unsigned_instruction.delivery_address,
  ).toLowerCase();
  const amount = text(
    intent.claim.unsigned_instruction.void_amount_units,
  );
  const receiptWallet = text(
    input.receipt_policy.fulfillment_wallet_address,
  ).toLowerCase();
  const receiptContract = text(
    input.receipt_policy.fulfillment_contract_address,
  ).toLowerCase();
  if (
    !prepared ||
    !["prepared", "broadcast", "confirmed", "failed_retryable"].includes(
      attempt.status,
    ) ||
    attempt.failure ||
    plan.saga_id !== sagaId ||
    plan.attempt_id !== request.attempt_id ||
    plan.wallet_address !== wallet ||
    plan.runtime_policy_fingerprint_sha256 !== runtimeFingerprint ||
    plan.preparation_policy_fingerprint_sha256 !==
      preparationFingerprint ||
    plan.fulfillment_call.fulfillment_contract_address !== contract ||
    plan.fulfillment_call.delivery_address !== delivery ||
    plan.fulfillment_call.void_amount_units !== amount ||
    request.saga_id !== sagaId ||
    request.attempt_id !== attempt.reservation.attempt_id ||
    request.plan_reservation_id !== inventory.reservation_id ||
    request.wallet_address !== wallet ||
    request.transaction_to !== contract ||
    request.delivery_address !== delivery ||
    request.void_amount_units !== amount ||
    request.transaction_plan_fingerprint_sha256 !==
      plan.transaction_plan_fingerprint_sha256 ||
    custody.signed_transaction_hash !==
      prepared.void_delivery_tx_hash ||
    prepared.fulfillment_wallet !== wallet ||
    prepared.delivery_address !== delivery ||
    prepared.void_amount_units !== amount ||
    receiptWallet !== wallet ||
    receiptContract !== contract ||
    sagaRecord.state?.attempt_id !== request.attempt_id ||
    sagaRecord.state?.transaction_hash !==
      custody.signed_transaction_hash ||
    sagaRecord.state?.nonce !== plan.nonce ||
    ![
      "broadcast_intent_committed",
      "broadcast_unknown",
      "broadcast_accepted",
      "receipt_confirmed",
      "receipt_reverted",
      "closed",
    ].includes(text(sagaRecord.state?.state))
  ) {
    throw new Error(
      "payment_keyed_receipt_reconciliation_durable_binding_conflict",
    );
  }
  if (!SHA256.test(receiptFingerprint)) {
    throw new Error(
      "payment_keyed_receipt_reconciliation_receipt_policy_fingerprint_invalid",
    );
  }
}

async function reconstruct(
  input: BuyVoidPaymentKeyedReceiptReconciliationInputV1,
  deps: ReturnType<typeof dependencies>,
  saga: SagaModuleV1,
  runtimeFingerprint: string,
  preparationFingerprint: string,
  receiptFingerprint: string,
): Promise<
  | ReconstructedV1
  | Extract<
      BuyVoidPaymentKeyedReceiptReconciliationDecisionV1,
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
      "payment_keyed_receipt_reconciliation_attempt_id_invalid",
    );
  }

  try {
    const attempt = deps.read_attempt({
      root_dir: rootDir,
      attempt_id: attemptId,
    });
    if (!attempt) {
      throw new Error(
        "payment_keyed_receipt_reconciliation_attempt_missing",
      );
    }
    const intent = exactIntent(
      deps.list_intents(rootDir),
      attempt,
    );
    const inventory = exactInventory(
      deps.list_inventory({
        root_dir: rootDir,
        pool_id:
          input.server_policy.saga_policy.inventory_policy.pool_id,
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
        "payment_keyed_receipt_reconciliation_saga_id_invalid",
      );
    }
    const store = existingSagaStore(saga, rootDir, sagaId);
    const sagaRecord = store.recover(sagaId);
    if (!sagaRecord) {
      throw new Error(
        "payment_keyed_receipt_reconciliation_saga_missing",
      );
    }
    if (
      sagaRecord.events?.[0]?.payload?.policy_id !==
        input.server_policy.saga_policy.saga_policy_id
    ) {
      throw new Error(
        "payment_keyed_receipt_reconciliation_saga_policy_conflict",
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
        "payment_keyed_receipt_reconciliation_custody_missing",
      );
    }

    assertDurableBindings(
      {
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
      },
      input,
      runtimeFingerprint,
      preparationFingerprint,
      receiptFingerprint,
    );

    const receiptEvidence = deps.read_receipt_evidence({
      root_dir: rootDir,
      attempt_id: attemptId,
    });
    if (
      receiptEvidence &&
      (
        receiptEvidence.saga_id !== sagaId ||
        receiptEvidence.transaction_hash !==
          custody.signed_transaction_hash ||
        receiptEvidence.receipt_policy_fingerprint_sha256 !==
          receiptFingerprint ||
        receiptEvidence.fulfillment_wallet_address !==
          text(input.receipt_policy.fulfillment_wallet_address).toLowerCase() ||
        receiptEvidence.fulfillment_contract_address !==
          text(input.receipt_policy.fulfillment_contract_address).toLowerCase() ||
        receiptEvidence.delivery_address !==
          text(intent.claim.unsigned_instruction.delivery_address).toLowerCase() ||
        receiptEvidence.void_amount_units !==
          text(intent.claim.unsigned_instruction.void_amount_units)
      )
    ) {
      throw new Error(
        "payment_keyed_receipt_reconciliation_evidence_conflict",
      );
    }
    const outcome = deps.read_outcome({
      root_dir: rootDir,
      attempt_id: attemptId,
    });
    if (
      outcome &&
      (
        outcome.attempt_id !== attemptId ||
        outcome.void_delivery_tx_hash !==
          custody.signed_transaction_hash
      )
    ) {
      throw new Error(
        "payment_keyed_receipt_reconciliation_outcome_conflict",
      );
    }

    return {
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
      receipt_evidence: receiptEvidence,
      outcome,
    };
  } catch (error) {
    return held(
      "journal_reconstruction",
      input.apply === true,
      text((error as Error)?.message || error).slice(0, 240),
    );
  }
}

function exactConfirmations(
  input: BuyVoidPaymentKeyedReceiptReconciliationInputV1,
  reconstructed: ReconstructedV1,
  runtimeFingerprint: string,
  preparationFingerprint: string,
  receiptFingerprint: string,
): Extract<
  BuyVoidPaymentKeyedReceiptReconciliationDecisionV1,
  { ok: false }
> | null {
  if (input.apply !== true) return null;
  if (
    text(input.confirmation) !==
      VOID_BUY_VOID_PAYMENT_KEYED_RECEIPT_RECONCILIATION_CONFIRMATION_V1 ||
    text(input.runtime_policy_fingerprint_sha256) !==
      runtimeFingerprint ||
    text(input.preparation_policy_fingerprint_sha256) !==
      preparationFingerprint ||
    text(input.receipt_policy_fingerprint_sha256) !==
      receiptFingerprint ||
    text(input.saga_confirmation) !==
      reconstructed.saga.ADVANCE_CONFIRMATION ||
    text(input.saga_action_confirmation) !==
      reconstructed.saga.ACTION_CONFIRMATIONS
        .reconcile_possible_broadcast
  ) {
    return held(
      "confirmation",
      true,
      "payment_keyed_receipt_reconciliation_exact_confirmations_required",
    );
  }
  return null;
}

async function requirePipeline(
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
      "payment_keyed_receipt_reconciliation_pipeline_held:" +
        text(decision?.reason || decision?.status || "unknown"),
    );
  }
}

function currentBlock(evidence: BuyVoidPaymentKeyedReceiptEvidenceV1): string {
  return (
    BigInt(evidence.receipt_block_number) +
    BigInt(evidence.observed_confirmation_count) -
    1n
  ).toString();
}

function providerId(
  evidence: BuyVoidPaymentKeyedReceiptEvidenceV1,
): string {
  return (
    "payment-keyed-receipt-" +
    evidence.receipt_evidence_fingerprint_sha256.slice(0, 24)
  );
}

async function ensureBroadcastProjection(
  reconstructed: ReconstructedV1,
  deps: ReturnType<typeof dependencies>,
  evidence: BuyVoidPaymentKeyedReceiptEvidenceV1,
  nowMs: number,
): Promise<boolean> {
  const attempt = deps.read_attempt({
    root_dir: reconstructed.root_dir,
    attempt_id: reconstructed.attempt.reservation.attempt_id,
  });
  const outcome = deps.read_outcome({
    root_dir: reconstructed.root_dir,
    attempt_id: reconstructed.attempt.reservation.attempt_id,
  });
  if (
    attempt?.broadcast &&
    outcome &&
    ["broadcast_accepted", "confirmed", "reverted"].includes(
      outcome.status,
    )
  ) {
    return false;
  }
  if (
    outcome &&
    !["prepared_no_outcome", "broadcast_unknown"].includes(
      outcome.status,
    )
  ) {
    throw new Error(
      "payment_keyed_receipt_reconciliation_broadcast_projection_conflict",
    );
  }
  await requirePipeline(deps, {
    action: "record_broadcast_accepted",
    root_dir: reconstructed.root_dir,
    attempt_id: reconstructed.attempt.reservation.attempt_id,
    transaction_hash: reconstructed.custody.signed_transaction_hash,
    provider_submission_id: providerId(evidence),
    apply: true,
    confirmation:
      VOID_BUY_VOID_PIPELINE_CONFIRMATIONS_V1.record_broadcast_accepted,
    now_ms: nowMs,
  });
  return true;
}

async function ensureSagaAccepted(
  reconstructed: ReconstructedV1,
  input: BuyVoidPaymentKeyedReceiptReconciliationInputV1,
  evidence: BuyVoidPaymentKeyedReceiptEvidenceV1,
  nowMs: number,
): Promise<boolean> {
  const current = reconstructed.store.recover(
    reconstructed.saga_id,
  );
  if (!current) {
    throw new Error(
      "payment_keyed_receipt_reconciliation_saga_missing",
    );
  }
  const state = text(current.state?.state);
  if (
    [
      "broadcast_accepted",
      "receipt_confirmed",
      "receipt_reverted",
      "closed",
    ].includes(state)
  ) {
    return false;
  }
  if (
    ![
      "broadcast_intent_committed",
      "broadcast_unknown",
    ].includes(state)
  ) {
    throw new Error(
      "payment_keyed_receipt_reconciliation_saga_accept_state_conflict",
    );
  }
  const result = await reconstructed.saga.runSagaSupervisorTickV1({
    store: reconstructed.store,
    binding: current.binding,
    owner_id:
      "void-buy-payment-keyed-receipt-accept-" +
      process.pid +
      "-" +
      crypto.randomBytes(12).toString("hex"),
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
      reconcile_possible_broadcast: async () => ({
        outcome: "broadcast_accepted",
        payload: {
          attempt_id: current.state.attempt_id,
          transaction_hash: current.state.transaction_hash,
          reason_code: "payment_keyed_terminal_receipt_proves_broadcast",
          broadcast_call_performed: true,
          provider_submission_id_sha256:
            crypto
              .createHash("sha256")
              .update(providerId(evidence), "utf8")
              .digest("hex"),
        },
      }),
    },
  });
  if (
    !result ||
    result.ok !== true ||
    result.status !== "applied"
  ) {
    throw new Error(
      "payment_keyed_receipt_reconciliation_saga_accept_held:" +
        text(result?.reason || result?.status || "unknown"),
    );
  }
  return true;
}

async function ensureTerminalProjection(
  reconstructed: ReconstructedV1,
  deps: ReturnType<typeof dependencies>,
  input: BuyVoidPaymentKeyedReceiptReconciliationInputV1,
  evidence: BuyVoidPaymentKeyedReceiptEvidenceV1,
  nowMs: number,
): Promise<boolean> {
  const attempt = deps.read_attempt({
    root_dir: reconstructed.root_dir,
    attempt_id: reconstructed.attempt.reservation.attempt_id,
  });
  const outcome = deps.read_outcome({
    root_dir: reconstructed.root_dir,
    attempt_id: reconstructed.attempt.reservation.attempt_id,
  });
  if (!attempt) {
    throw new Error(
      "payment_keyed_receipt_reconciliation_attempt_missing_before_terminal",
    );
  }

  if (evidence.outcome === "confirmed") {
    if (
      attempt.status === "confirmed" &&
      outcome?.status === "confirmed"
    ) {
      return false;
    }
    if (
      attempt.status !== "broadcast" ||
      !attempt.broadcast ||
      (outcome &&
        outcome.status !== "broadcast_accepted")
    ) {
      throw new Error(
        "payment_keyed_receipt_reconciliation_confirmed_projection_conflict",
      );
    }
    await requirePipeline(deps, {
      action: "record_confirmed",
      root_dir: reconstructed.root_dir,
      attempt_id: reconstructed.attempt.reservation.attempt_id,
      intent: reconstructed.intent,
      observation: {
        chain_id: "2050",
        transaction_hash:
          reconstructed.custody.signed_transaction_hash,
        transaction_status: "1",
        block_number: evidence.receipt_block_number,
        block_hash: evidence.receipt_block_hash,
        current_block_number: currentBlock(evidence),
        from_address: evidence.fulfillment_wallet_address,
        to_address: evidence.delivery_address,
        amount_units: evidence.void_amount_units,
      },
      confirmation_policy: {
        chain_id: "2050",
        min_confirmations:
          text(input.receipt_policy.min_confirmations),
        fulfillment_wallet_allowlist: [
          evidence.fulfillment_wallet_address,
        ],
      },
      apply: true,
      confirmation:
        VOID_BUY_VOID_PIPELINE_CONFIRMATIONS_V1.record_confirmed,
      now_ms: nowMs,
    });
    return true;
  }

  if (
    attempt.postbroadcast_failure &&
    outcome?.status === "reverted"
  ) {
    return false;
  }
  if (
    attempt.status !== "broadcast" ||
    !attempt.broadcast ||
    (outcome && outcome.status !== "broadcast_accepted")
  ) {
    throw new Error(
      "payment_keyed_receipt_reconciliation_revert_projection_conflict",
    );
  }
  await requirePipeline(deps, {
    action: "record_reverted",
    root_dir: reconstructed.root_dir,
    attempt_id: reconstructed.attempt.reservation.attempt_id,
    transaction_hash:
      reconstructed.custody.signed_transaction_hash,
    observation: {
      chain_id: "2050",
      transaction_status: "0",
      block_number: evidence.receipt_block_number,
      current_block_number: currentBlock(evidence),
    },
    outcome_policy: {
      outcome_journal_enabled: true,
      chain_id: "2050",
      min_revert_confirmations:
        text(input.receipt_policy.min_confirmations),
    },
    apply: true,
    confirmation:
      VOID_BUY_VOID_PIPELINE_CONFIRMATIONS_V1.record_reverted,
    now_ms: nowMs,
  });
  return true;
}

async function ensureSagaReceipt(
  reconstructed: ReconstructedV1,
  input: BuyVoidPaymentKeyedReceiptReconciliationInputV1,
  evidence: BuyVoidPaymentKeyedReceiptEvidenceV1,
  nowMs: number,
): Promise<boolean> {
  const current = reconstructed.store.recover(
    reconstructed.saga_id,
  );
  if (!current) {
    throw new Error(
      "payment_keyed_receipt_reconciliation_saga_missing_before_receipt",
    );
  }
  const expectedState =
    evidence.outcome === "confirmed"
      ? "receipt_confirmed"
      : "receipt_reverted";
  if (current.state?.state === expectedState) {
    return false;
  }
  if (
    evidence.outcome === "confirmed" &&
    current.state?.state === "closed"
  ) {
    return false;
  }
  if (current.state?.state !== "broadcast_accepted") {
    throw new Error(
      "payment_keyed_receipt_reconciliation_saga_receipt_state_conflict:" +
        text(current.state?.state),
    );
  }
  const confirmations = BigInt(
    evidence.observed_confirmation_count,
  );
  if (
    confirmations < 1n ||
    confirmations > MAX_SAGA_CONFIRMATIONS
  ) {
    throw new Error(
      "payment_keyed_receipt_reconciliation_confirmation_count_out_of_range",
    );
  }
  const result = await reconstructed.saga.runSagaSupervisorTickV1({
    store: reconstructed.store,
    binding: current.binding,
    owner_id:
      "void-buy-payment-keyed-receipt-terminal-" +
      process.pid +
      "-" +
      crypto.randomBytes(12).toString("hex"),
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
      reconcile_possible_broadcast: async () => ({
        outcome:
          evidence.outcome === "confirmed"
            ? "receipt_confirmed"
            : "receipt_reverted",
        payload: {
          attempt_id: current.state.attempt_id,
          transaction_hash: current.state.transaction_hash,
          block_number: evidence.receipt_block_number,
          block_hash: evidence.receipt_block_hash,
          confirmations: Number(confirmations),
          receipt_status:
            evidence.outcome === "confirmed" ? 1 : 0,
        },
      }),
    },
  });
  if (
    !result ||
    result.ok !== true ||
    result.status !== "applied"
  ) {
    throw new Error(
      "payment_keyed_receipt_reconciliation_saga_receipt_held:" +
        text(result?.reason || result?.status || "unknown"),
    );
  }
  return true;
}

function success(
  status:
    | "confirmed"
    | "reverted"
    | "duplicate_confirmed"
    | "duplicate_reverted",
  reconstructed: ReconstructedV1,
  deps: ReturnType<typeof dependencies>,
  evidence: BuyVoidPaymentKeyedReceiptEvidenceV1,
  rpcPerformed: boolean,
  evidenceMutation: boolean,
  projectionMutation: boolean,
  sagaMutation: boolean,
): BuyVoidPaymentKeyedReceiptReconciliationDecisionV1 {
  const attempt = deps.read_attempt({
    root_dir: reconstructed.root_dir,
    attempt_id: reconstructed.attempt.reservation.attempt_id,
  });
  const outcome = deps.read_outcome({
    root_dir: reconstructed.root_dir,
    attempt_id: reconstructed.attempt.reservation.attempt_id,
  });
  const saga = reconstructed.store.recover(
    reconstructed.saga_id,
  );
  if (!attempt || !saga) {
    return held(
      "journal_reconstruction",
      true,
      "payment_keyed_receipt_reconciliation_final_state_missing",
      {
        mutation_performed:
          evidenceMutation || projectionMutation || sagaMutation,
        rpc_call_performed: rpcPerformed,
        receipt_evidence_mutation_performed: evidenceMutation,
        canonical_projection_mutation_performed: projectionMutation,
        saga_mutation_performed: sagaMutation,
      },
    );
  }
  return {
    ok: true,
    status,
    applied: true,
    marker:
      VOID_BUY_VOID_PAYMENT_KEYED_RECEIPT_RECONCILIATION_V1,
    version: 1,
    saga_id: reconstructed.saga_id,
    attempt_id: reconstructed.attempt.reservation.attempt_id,
    receipt_evidence: evidence,
    execution_attempt: attempt,
    broadcast_outcome: outcome,
    saga_state: saga.state,
    ready_for_terminal_closeout:
      evidence.outcome === "confirmed",
    terminal_revert:
      evidence.outcome === "reverted",
    rpc_call_performed: rpcPerformed,
    receipt_evidence_mutation_performed: evidenceMutation,
    canonical_projection_mutation_performed: projectionMutation,
    saga_mutation_performed: sagaMutation,
    signer_access_performed: false,
    signing_performed: false,
    transaction_broadcast_performed: false,
    inventory_mutation_performed: false,
    public_fulfilled_closeout_performed: false,
    automatic_retry_allowed: false,
    money_movement_performed: false,
  };
}

export async function runBuyVoidPaymentKeyedReceiptReconciliationV1(
  input: BuyVoidPaymentKeyedReceiptReconciliationInputV1,
): Promise<BuyVoidPaymentKeyedReceiptReconciliationDecisionV1> {
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
  const receiptPolicy =
    validateBuyVoidPaymentKeyedFulfillmentReceiptPolicyV1(
      input?.receipt_policy,
    );
  if (receiptPolicy.ok === false) {
    return held("policy", applied, receiptPolicy.reason);
  }
  if (
    receiptPolicy.rpc_url_fingerprint_sha256 !==
      preparationPolicy.rpc_url_fingerprint_sha256 ||
    text(input.receipt_policy.fulfillment_wallet_address).toLowerCase() !==
      text(input.server_policy.preparation_policy.fulfillment_wallet_address).toLowerCase() ||
    text(input.receipt_policy.fulfillment_contract_address).toLowerCase() !==
      text(input.server_policy.fulfillment_contract_address).toLowerCase()
  ) {
    return held(
      "policy",
      applied,
      "payment_keyed_receipt_reconciliation_policy_binding_invalid",
    );
  }

  const deps = dependencies(input?.dependencies);
  let saga: SagaModuleV1;
  try {
    saga = await deps.load_saga_module();
  } catch (error) {
    return held(
      "saga_reconstruction",
      applied,
      "payment_keyed_receipt_reconciliation_saga_module_failed",
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
    receiptPolicy.policy_fingerprint_sha256,
  );
  if ("reason" in reconstructed) return reconstructed;

  if (!applied) {
    return {
      ok: true,
      status: "dry_run",
      applied: false,
      marker:
        VOID_BUY_VOID_PAYMENT_KEYED_RECEIPT_RECONCILIATION_V1,
      version: 1,
      saga_id: reconstructed.saga_id,
      attempt_id: reconstructed.attempt.reservation.attempt_id,
      saga_state: text(reconstructed.saga_record.state?.state),
      existing_receipt_evidence:
        reconstructed.receipt_evidence,
      rpc_required_on_apply:
        reconstructed.receipt_evidence === null,
      required_confirmation:
        VOID_BUY_VOID_PAYMENT_KEYED_RECEIPT_RECONCILIATION_CONFIRMATION_V1,
      required_runtime_policy_fingerprint_sha256:
        runtimePolicy.fingerprint,
      required_preparation_policy_fingerprint_sha256:
        preparationPolicy.policy_fingerprint_sha256,
      required_receipt_policy_fingerprint_sha256:
        receiptPolicy.policy_fingerprint_sha256,
      required_saga_confirmation:
        reconstructed.saga.ADVANCE_CONFIRMATION,
      required_saga_action_confirmation:
        reconstructed.saga.ACTION_CONFIRMATIONS
          .reconcile_possible_broadcast,
      rpc_call_performed: false,
      receipt_evidence_mutation_performed: false,
      canonical_projection_mutation_performed: false,
      saga_mutation_performed: false,
      signer_access_performed: false,
      signing_performed: false,
      transaction_broadcast_performed: false,
      inventory_mutation_performed: false,
      public_fulfilled_closeout_performed: false,
      money_movement_performed: false,
    };
  }

  const confirmationHold = exactConfirmations(
    input,
    reconstructed,
    runtimePolicy.fingerprint,
    preparationPolicy.policy_fingerprint_sha256,
    receiptPolicy.policy_fingerprint_sha256,
  );
  if (confirmationHold) return confirmationHold;

  const nowMs = deps.now_ms();
  if (!Number.isSafeInteger(nowMs) || nowMs <= 0) {
    return held(
      "input",
      true,
      "payment_keyed_receipt_reconciliation_server_clock_invalid",
    );
  }

  let evidence = reconstructed.receipt_evidence;
  let rpcPerformed = false;
  let evidenceMutation = false;
  let projectionMutation = false;
  let sagaMutation = false;

  if (!evidence) {
    const receiptOutcome = await deps.run_receipt_outcome({
      custody: reconstructed.custody,
      fulfillment_call: reconstructed.plan.fulfillment_call,
      policy: {
        preparation_policy:
          input.server_policy.preparation_policy,
        receipt_policy: input.receipt_policy,
      },
      ...(deps.receipt_transport
        ? { transport: deps.receipt_transport }
        : {}),
    });
    rpcPerformed = true;
    if (receiptOutcome.ok === false) {
      return held(
        "receipt_outcome",
        true,
        receiptOutcome.reason,
        {
          rpc_call_performed: true,
          detail: receiptOutcome.detail,
        },
      );
    }
    if (receiptOutcome.status === "pending") {
      return {
        ok: true,
        status: "pending",
        applied: true,
        marker:
          VOID_BUY_VOID_PAYMENT_KEYED_RECEIPT_RECONCILIATION_V1,
        version: 1,
        saga_id: reconstructed.saga_id,
        attempt_id:
          reconstructed.attempt.reservation.attempt_id,
        receipt_evidence: null,
        execution_attempt: reconstructed.attempt,
        broadcast_outcome: reconstructed.outcome,
        saga_state: reconstructed.saga_record.state,
        ready_for_terminal_closeout: false,
        terminal_revert: false,
        rpc_call_performed: true,
        receipt_evidence_mutation_performed: false,
        canonical_projection_mutation_performed: false,
        saga_mutation_performed: false,
        signer_access_performed: false,
        signing_performed: false,
        transaction_broadcast_performed: false,
        inventory_mutation_performed: false,
        public_fulfilled_closeout_performed: false,
        automatic_retry_allowed: false,
        money_movement_performed: false,
      };
    }

    const evidenceDecision =
      deps.record_receipt_evidence({
        root_dir: reconstructed.root_dir,
        saga_id: reconstructed.saga_id,
        receipt_policy_fingerprint_sha256:
          receiptPolicy.policy_fingerprint_sha256,
        outcome: receiptOutcome,
        now_ms: nowMs,
      });
    if (evidenceDecision.ok === false) {
      return held(
        "receipt_evidence",
        true,
        evidenceDecision.reason,
        {
          rpc_call_performed: true,
          detail: evidenceDecision.detail,
        },
      );
    }
    evidence = evidenceDecision.evidence;
    evidenceMutation =
      evidenceDecision.mutation_performed;
  }

  if (!evidence) {
    return held(
      "receipt_evidence",
      true,
      "payment_keyed_receipt_reconciliation_evidence_missing",
      {
        rpc_call_performed: rpcPerformed,
        receipt_evidence_mutation_performed: evidenceMutation,
      },
    );
  }

  try {
    await deps.fault_inject(
      "after_receipt_evidence_before_broadcast_projection",
    );
  } catch (error) {
    return held(
      "receipt_evidence",
      true,
      "payment_keyed_receipt_reconciliation_injected_after_evidence",
      {
        mutation_performed: evidenceMutation,
        rpc_call_performed: rpcPerformed,
        receipt_evidence_mutation_performed: evidenceMutation,
        detail: {
          error_class: text((error as Error)?.name || "Error"),
        },
      },
    );
  }

  try {
    projectionMutation =
      await ensureBroadcastProjection(
        reconstructed,
        deps,
        evidence,
        nowMs,
      ) || projectionMutation;
  } catch (error) {
    return held(
      "broadcast_projection",
      true,
      text((error as Error)?.message || error).slice(0, 240),
      {
        mutation_performed:
          evidenceMutation || projectionMutation,
        rpc_call_performed: rpcPerformed,
        receipt_evidence_mutation_performed: evidenceMutation,
        canonical_projection_mutation_performed: projectionMutation,
      },
    );
  }

  try {
    await deps.fault_inject(
      "after_broadcast_projection_before_saga_accepted",
    );
  } catch (error) {
    return held(
      "broadcast_projection",
      true,
      "payment_keyed_receipt_reconciliation_injected_after_broadcast_projection",
      {
        mutation_performed: true,
        rpc_call_performed: rpcPerformed,
        receipt_evidence_mutation_performed: evidenceMutation,
        canonical_projection_mutation_performed: projectionMutation,
      },
    );
  }

  try {
    sagaMutation =
      await ensureSagaAccepted(
        reconstructed,
        input,
        evidence,
        nowMs,
      ) || sagaMutation;
  } catch (error) {
    return held(
      "saga_broadcast_projection",
      true,
      text((error as Error)?.message || error).slice(0, 240),
      {
        mutation_performed: true,
        rpc_call_performed: rpcPerformed,
        receipt_evidence_mutation_performed: evidenceMutation,
        canonical_projection_mutation_performed: projectionMutation,
        saga_mutation_performed: sagaMutation,
      },
    );
  }

  try {
    await deps.fault_inject(
      "after_saga_accepted_before_terminal_projection",
    );
  } catch (error) {
    return held(
      "saga_broadcast_projection",
      true,
      "payment_keyed_receipt_reconciliation_injected_after_saga_accepted",
      {
        mutation_performed: true,
        rpc_call_performed: rpcPerformed,
        receipt_evidence_mutation_performed: evidenceMutation,
        canonical_projection_mutation_performed: projectionMutation,
        saga_mutation_performed: sagaMutation,
      },
    );
  }

  try {
    projectionMutation =
      await ensureTerminalProjection(
        reconstructed,
        deps,
        input,
        evidence,
        nowMs,
      ) || projectionMutation;
  } catch (error) {
    return held(
      "terminal_projection",
      true,
      text((error as Error)?.message || error).slice(0, 240),
      {
        mutation_performed: true,
        rpc_call_performed: rpcPerformed,
        receipt_evidence_mutation_performed: evidenceMutation,
        canonical_projection_mutation_performed: projectionMutation,
        saga_mutation_performed: sagaMutation,
      },
    );
  }

  try {
    await deps.fault_inject(
      "after_terminal_projection_before_saga_receipt",
    );
  } catch (error) {
    return held(
      "terminal_projection",
      true,
      "payment_keyed_receipt_reconciliation_injected_after_terminal_projection",
      {
        mutation_performed: true,
        rpc_call_performed: rpcPerformed,
        receipt_evidence_mutation_performed: evidenceMutation,
        canonical_projection_mutation_performed: projectionMutation,
        saga_mutation_performed: sagaMutation,
      },
    );
  }

  try {
    sagaMutation =
      await ensureSagaReceipt(
        reconstructed,
        input,
        evidence,
        nowMs,
      ) || sagaMutation;
  } catch (error) {
    return held(
      "saga_receipt",
      true,
      text((error as Error)?.message || error).slice(0, 240),
      {
        mutation_performed: true,
        rpc_call_performed: rpcPerformed,
        receipt_evidence_mutation_performed: evidenceMutation,
        canonical_projection_mutation_performed: projectionMutation,
        saga_mutation_performed: sagaMutation,
      },
    );
  }

  const finalSaga = reconstructed.store.recover(
    reconstructed.saga_id,
  );
  const expectedSagaState =
    evidence.outcome === "confirmed"
      ? ["receipt_confirmed", "closed"]
      : ["receipt_reverted"];
  if (
    !finalSaga ||
    !expectedSagaState.includes(
      text(finalSaga.state?.state),
    )
  ) {
    return held(
      "saga_receipt",
      true,
      "payment_keyed_receipt_reconciliation_final_saga_state_invalid",
      {
        mutation_performed: true,
        rpc_call_performed: rpcPerformed,
        receipt_evidence_mutation_performed: evidenceMutation,
        canonical_projection_mutation_performed: projectionMutation,
        saga_mutation_performed: sagaMutation,
      },
    );
  }

  const duplicate =
    !rpcPerformed &&
    !evidenceMutation &&
    !projectionMutation &&
    !sagaMutation;
  const status =
    evidence.outcome === "confirmed"
      ? duplicate
        ? "duplicate_confirmed"
        : "confirmed"
      : duplicate
        ? "duplicate_reverted"
        : "reverted";

  return success(
    status,
    reconstructed,
    deps,
    evidence,
    rpcPerformed,
    evidenceMutation,
    projectionMutation,
    sagaMutation,
  );
}
