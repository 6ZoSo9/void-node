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
  readBuyVoidSagaBroadcastEvidenceStateV1,
  recordBuyVoidSagaBroadcastEvidenceV1,
  type BuyVoidSagaBroadcastEvidenceStateV1,
} from "./buy_void_saga_broadcast_evidence_journal_v1.js";
import type {
  BuyVoidPreparedTransactionBroadcasterReadyV1,
} from "./buy_void_prepared_transaction_broadcast_custody_v1.js";
import {
  readBuyVoidDeliverySubmissionGuardJournalV1,
  type BuyVoidDeliverySubmissionGuardEntryV1,
} from "./buy_void_delivery_submission_guard_v1.js";
import {
  buyVoidPaymentKeyedRuntimeServerPolicyFingerprintV1,
  type BuyVoidPaymentKeyedRuntimeServerPolicyV1,
} from "./buy_void_payment_keyed_runtime_preflight_v1.js";
import {
  validateBuyVoidPaymentKeyedTransactionPreparationPolicyV1,
} from "./buy_void_payment_keyed_transaction_preparation_v1.js";
import {
  inspectBuyVoidPaymentKeyedChain2050V1,
  type BuyVoidPaymentKeyedChain2050InspectionDecisionV1,
  type BuyVoidPaymentKeyedChain2050InspectionTransportV1,
} from "./buy_void_payment_keyed_chain2050_inspection_v1.js";

export const VOID_BUY_VOID_PAYMENT_KEYED_BROADCAST_RECONCILIATION_V1 =
  "VOID_BUY_VOID_PAYMENT_KEYED_BROADCAST_RECONCILIATION_V1";

export const VOID_BUY_VOID_PAYMENT_KEYED_BROADCAST_RECONCILIATION_CONFIRMATION_V1 =
  "buyVoidReconcilePaymentKeyedBroadcastV1";

export const VOID_BUY_VOID_PAYMENT_KEYED_BROADCAST_RECONCILIATION_AUTHORITY_V1 = {
  source_only_contract: true,
  runtime_route_mount: false,
  canonical_parent_dispatch: false,
  exact_attempt_selector: true,
  server_controlled_policy_required: true,
  saga_reconciliation_state_required: true,
  submission_guard_journal_read_only: true,
  no_guard_claim_proves_submit_boundary_not_entered: true,
  released_guard_proves_retry_safe_no_submission: true,
  active_guard_claim_never_authorizes_retry: true,
  chain_transaction_absence_never_proves_not_submitted: true,
  exact_payment_keyed_chain_inspection_required_for_visibility: true,
  durable_evidence_before_projection: true,
  projection_before_saga: true,
  no_signer_dependency: true,
  no_submission_guard_mutation: true,
  no_broadcaster_dependency: true,
  signing: false,
  transaction_broadcast: false,
  automatic_retry: false,
  receipt_acceptance: false,
  inventory_mutation: false,
  public_fulfilled_closeout: false,
  money_movement: false,
} as const;

type SagaStoreV1 = {
  recover: (sagaId: string) => any | null;
  acquireLease: (input: Record<string, unknown>) => any;
  releaseLease: (input: Record<string, unknown>) => unknown;
  appendEvent: (input: Record<string, unknown>) => any;
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
  buildSagaEventV1: (input: Record<string, unknown>) => any;
  createFilesystemSagaStoreV1: (rootDir: string) => SagaStoreV1;
  runSagaSupervisorTickV1: (
    input: Record<string, unknown>,
  ) => Promise<any>;
};

export type BuyVoidPaymentKeyedBroadcastReconciliationDependenciesV1 = {
  read_attempt?: typeof readBuyVoidExecutionAttemptV1;
  list_intents?: typeof listBuyVoidFulfillmentJournalClaimsV1;
  list_inventory?: typeof listBuyVoidInventoryReservationsV1;
  list_plans?: typeof listBuyVoidPaymentKeyedPlanReservationsV1;
  read_custody?: typeof readBuyVoidPaymentKeyedPreparationCustodyRecordV1;
  read_guard?: typeof readBuyVoidDeliverySubmissionGuardJournalV1;
  read_evidence?: typeof readBuyVoidSagaBroadcastEvidenceStateV1;
  record_evidence?: typeof recordBuyVoidSagaBroadcastEvidenceV1;
  read_outcome?: typeof readBuyVoidBroadcastOutcomeStateV1;
  run_pipeline_command?: (
    command: Record<string, unknown>,
  ) => unknown | Promise<unknown>;
  inspect_chain?: typeof inspectBuyVoidPaymentKeyedChain2050V1;
  inspection_transport?: BuyVoidPaymentKeyedChain2050InspectionTransportV1;
  load_saga_module?: () => Promise<SagaModuleV1>;
  now_ms?: () => number;
};

export type BuyVoidPaymentKeyedBroadcastReconciliationInputV1 = {
  root_dir: string;
  attempt_id: string;
  server_policy: BuyVoidPaymentKeyedRuntimeServerPolicyV1;
  apply?: boolean;
  confirmation?: unknown;
  runtime_policy_fingerprint_sha256?: unknown;
  preparation_policy_fingerprint_sha256?: unknown;
  saga_confirmation?: unknown;
  saga_action_confirmation?: unknown;
  dependencies?: BuyVoidPaymentKeyedBroadcastReconciliationDependenciesV1;
};

export type BuyVoidPaymentKeyedBroadcastGuardStateV1 =
  | {
      status: "never_claimed";
      submission_call_performed: false;
      submission_may_have_occurred: false;
      release_reason: null;
    }
  | {
      status: "claimed";
      submission_call_performed: boolean;
      submission_may_have_occurred: true;
      release_reason: null;
    }
  | {
      status: "released";
      submission_call_performed: true;
      submission_may_have_occurred: false;
      release_reason: string;
    };

export type BuyVoidPaymentKeyedBroadcastReconciliationDecisionV1 =
  | {
      ok: true;
      status: "dry_run";
      applied: false;
      marker:
        typeof VOID_BUY_VOID_PAYMENT_KEYED_BROADCAST_RECONCILIATION_V1;
      version: 1;
      saga_id: string;
      attempt_id: string;
      saga_state: string;
      guard_state: BuyVoidPaymentKeyedBroadcastGuardStateV1;
      existing_evidence: BuyVoidSagaBroadcastEvidenceStateV1 | null;
      existing_outcome: BuyVoidBroadcastOutcomeStateV1 | null;
      chain_inspection_required: boolean;
      required_confirmation:
        typeof VOID_BUY_VOID_PAYMENT_KEYED_BROADCAST_RECONCILIATION_CONFIRMATION_V1;
      required_runtime_policy_fingerprint_sha256: string;
      required_preparation_policy_fingerprint_sha256: string;
      required_saga_confirmation: string;
      required_saga_action_confirmation: string;
      inspection_performed: false;
      rpc_call_performed: false;
      signer_access_performed: false;
      signing_performed: false;
      submission_guard_mutation_performed: false;
      transaction_broadcast_performed: false;
      automatic_retry_allowed: false;
      reconciliation_required: true;
      money_movement_performed: false;
    }
  | {
      ok: true;
      status: "not_submitted" | "unknown" | "accepted";
      applied: true;
      marker:
        typeof VOID_BUY_VOID_PAYMENT_KEYED_BROADCAST_RECONCILIATION_V1;
      version: 1;
      saga_id: string;
      attempt_id: string;
      guard_state: BuyVoidPaymentKeyedBroadcastGuardStateV1;
      evidence: BuyVoidSagaBroadcastEvidenceStateV1 | null;
      execution_attempt: BuyVoidExecutionAttemptStateV1;
      broadcast_outcome: BuyVoidBroadcastOutcomeStateV1 | null;
      saga_state: Record<string, unknown>;
      inspection_performed: boolean;
      rpc_call_performed: boolean;
      signer_access_performed: false;
      signing_performed: false;
      submission_guard_mutation_performed: false;
      transaction_broadcast_performed: false;
      automatic_retry_allowed: false;
      reconciliation_required: boolean;
      money_movement_performed: false;
    }
  | {
      ok: false;
      status: "held";
      applied: boolean;
      marker:
        typeof VOID_BUY_VOID_PAYMENT_KEYED_BROADCAST_RECONCILIATION_V1;
      version: 1;
      stage:
        | "input"
        | "policy"
        | "journal_reconstruction"
        | "saga_reconstruction"
        | "confirmation"
        | "guard_reconstruction"
        | "chain_inspection"
        | "evidence_persistence"
        | "projection_persistence"
        | "saga_append";
      reason: string;
      mutation_performed: boolean;
      inspection_performed: boolean;
      rpc_call_performed: boolean;
      signer_access_performed: false;
      signing_performed: false;
      submission_guard_mutation_performed: false;
      transaction_broadcast_performed: false;
      automatic_retry_allowed: false;
      reconciliation_required: boolean;
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
  guard_state: BuyVoidPaymentKeyedBroadcastGuardStateV1;
  evidence: BuyVoidSagaBroadcastEvidenceStateV1 | null;
  outcome: BuyVoidBroadcastOutcomeStateV1 | null;
};

const SHA256 = /^[0-9a-f]{64}$/;
const SAGA_ID = /^voidbvfsg1_[0-9a-f]{64}$/;
const INTENT_ID = /^voidbvbci1_[0-9a-f]{64}$/;
const SAGA_ROOT = "buy-void-crash-consistent-saga-runtime-v1";
const LEASE_TTL_MS = 30_000;
const SOURCE_FLOOR_MAIN = "f298ae20bb42f6c347c1c13f1a154af74f607aa6";
const SUBMISSION_DOMAIN =
  "void-buy-payment-keyed-custodian-broadcast-v1";
const ADAPTER_MARKER =
  "VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_BROADCAST_V1";

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : String(value ?? "").trim();
}

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function held(
  stage: Extract<
    BuyVoidPaymentKeyedBroadcastReconciliationDecisionV1,
    { ok: false }
  >["stage"],
  applied: boolean,
  reason: string,
  options: {
    mutation_performed?: boolean;
    inspection_performed?: boolean;
    rpc_call_performed?: boolean;
    reconciliation_required?: boolean;
    detail?: Record<string, unknown>;
  } = {},
): Extract<
  BuyVoidPaymentKeyedBroadcastReconciliationDecisionV1,
  { ok: false }
> {
  return {
    ok: false,
    status: "held",
    applied,
    marker: VOID_BUY_VOID_PAYMENT_KEYED_BROADCAST_RECONCILIATION_V1,
    version: 1,
    stage,
    reason,
    mutation_performed: options.mutation_performed === true,
    inspection_performed: options.inspection_performed === true,
    rpc_call_performed: options.rpc_call_performed === true,
    signer_access_performed: false,
    signing_performed: false,
    submission_guard_mutation_performed: false,
    transaction_broadcast_performed: false,
    automatic_retry_allowed: false,
    reconciliation_required:
      options.reconciliation_required !== false,
    money_movement_performed: false,
    ...(options.detail ? { detail: options.detail } : {}),
  };
}

function absoluteRoot(value: unknown): string {
  const raw = text(value);
  if (!raw || !path.isAbsolute(raw) || raw.includes("\0")) {
    throw new Error("payment_keyed_reconciliation_root_invalid");
  }
  const resolved = path.resolve(raw);
  if (resolved === path.parse(resolved).root) {
    throw new Error("payment_keyed_reconciliation_root_is_filesystem_root");
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
      "payment_keyed_reconciliation_intent_count_invalid:" +
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
      "payment_keyed_reconciliation_inventory_count_invalid:" +
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
      "payment_keyed_reconciliation_plan_count_invalid:" +
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
      throw new Error("payment_keyed_reconciliation_saga_directory_invalid");
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

function submissionBinding(
  custody: BuyVoidPaymentKeyedPreparationCustodyRecordV1,
): {
  submission_idempotency_key: string;
  attempt_id: string;
  expected_transaction_hash: string;
  transaction_plan_fingerprint_sha256: string;
} {
  const request = custody.request;
  return {
    submission_idempotency_key: sha256(
      [
        SUBMISSION_DOMAIN,
        request.idempotency_key_sha256,
        custody.signed_transaction_hash,
        request.unsigned_transaction_fingerprint_sha256,
      ].join("\n"),
    ),
    attempt_id: request.attempt_id,
    expected_transaction_hash: custody.signed_transaction_hash,
    transaction_plan_fingerprint_sha256:
      request.transaction_plan_fingerprint_sha256,
  };
}

function guardState(
  entries: BuyVoidDeliverySubmissionGuardEntryV1[],
  custody: BuyVoidPaymentKeyedPreparationCustodyRecordV1,
): BuyVoidPaymentKeyedBroadcastGuardStateV1 {
  const binding = submissionBinding(custody);
  const sameAttempt = entries.filter(
    (entry) => entry.attempt_id === binding.attempt_id,
  );
  for (const entry of sameAttempt) {
    if (
      entry.adapter_marker !== ADAPTER_MARKER ||
      entry.submission_idempotency_key !==
        binding.submission_idempotency_key ||
      entry.expected_transaction_hash !==
        binding.expected_transaction_hash ||
      entry.transaction_plan_fingerprint_sha256 !==
        binding.transaction_plan_fingerprint_sha256
    ) {
      throw new Error(
        "payment_keyed_reconciliation_guard_binding_conflict",
      );
    }
  }
  if (sameAttempt.length === 0) {
    return {
      status: "never_claimed",
      submission_call_performed: false,
      submission_may_have_occurred: false,
      release_reason: null,
    };
  }
  const latest = sameAttempt.at(-1)!;
  if (latest.event === "claim") {
    return {
      status: "claimed",
      submission_call_performed: false,
      submission_may_have_occurred: true,
      release_reason: null,
    };
  }
  if (
    latest.release_reason !== "invalid_provider_submission_id" &&
    latest.release_reason !== "broadcast_definitively_not_submitted"
  ) {
    throw new Error(
      "payment_keyed_reconciliation_guard_release_not_submission_proof",
    );
  }
  return {
    status: "released",
    submission_call_performed: true,
    submission_may_have_occurred: false,
    release_reason: latest.release_reason,
  };
}

function assertDurableBinding(
  reconstructed: Omit<
    ReconstructedV1,
    "guard_state" | "evidence" | "outcome"
  >,
  serverPolicy: BuyVoidPaymentKeyedRuntimeServerPolicyV1,
  runtimeFingerprint: string,
  preparationFingerprint: string,
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
  if (
    !prepared ||
    !["prepared", "broadcast"].includes(attempt.status) ||
    attempt.failure ||
    attempt.postbroadcast_failure ||
    attempt.confirmation ||
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
    sagaRecord.state?.attempt_id !== request.attempt_id ||
    sagaRecord.state?.transaction_hash !==
      custody.signed_transaction_hash ||
    sagaRecord.state?.nonce !== plan.nonce ||
    ![
      "broadcast_intent_committed",
      "broadcast_unknown",
      "broadcast_accepted",
    ].includes(text(sagaRecord.state?.state)) ||
    !INTENT_ID.test(
      text(sagaRecord.state?.broadcast_intent_id).toLowerCase(),
    )
  ) {
    throw new Error(
      "payment_keyed_reconciliation_durable_binding_conflict",
    );
  }
}

function dependencies(
  supplied?: BuyVoidPaymentKeyedBroadcastReconciliationDependenciesV1,
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
    read_guard:
      supplied?.read_guard ||
      readBuyVoidDeliverySubmissionGuardJournalV1,
    read_evidence:
      supplied?.read_evidence ||
      readBuyVoidSagaBroadcastEvidenceStateV1,
    record_evidence:
      supplied?.record_evidence ||
      recordBuyVoidSagaBroadcastEvidenceV1,
    read_outcome:
      supplied?.read_outcome ||
      readBuyVoidBroadcastOutcomeStateV1,
    run_pipeline_command:
      supplied?.run_pipeline_command ||
      (runBuyVoidPipelineCommandV1 as any),
    inspect_chain:
      supplied?.inspect_chain ||
      inspectBuyVoidPaymentKeyedChain2050V1,
    inspection_transport: supplied?.inspection_transport,
    load_saga_module:
      supplied?.load_saga_module || defaultSagaModule,
    now_ms: supplied?.now_ms || Date.now,
  };
}

async function reconstruct(
  input: BuyVoidPaymentKeyedBroadcastReconciliationInputV1,
  deps: ReturnType<typeof dependencies>,
  saga: SagaModuleV1,
  runtimeFingerprint: string,
  preparationFingerprint: string,
): Promise<
  | ReconstructedV1
  | Extract<
      BuyVoidPaymentKeyedBroadcastReconciliationDecisionV1,
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
      "payment_keyed_reconciliation_attempt_id_invalid",
    );
  }

  try {
    const attempt = deps.read_attempt({
      root_dir: rootDir,
      attempt_id: attemptId,
    });
    if (!attempt) {
      throw new Error("payment_keyed_reconciliation_attempt_missing");
    }
    const intent = exactIntent(deps.list_intents(rootDir), attempt);
    const inventory = exactInventory(
      deps.list_inventory({
        root_dir: rootDir,
        pool_id: input.server_policy.saga_policy.inventory_policy.pool_id,
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
      throw new Error("payment_keyed_reconciliation_saga_id_invalid");
    }
    const store = existingSagaStore(saga, rootDir, sagaId);
    const sagaRecord = store.recover(sagaId);
    if (!sagaRecord) {
      throw new Error("payment_keyed_reconciliation_saga_missing");
    }
    if (
      sagaRecord.events?.[0]?.payload?.policy_id !==
        input.server_policy.saga_policy.saga_policy_id
    ) {
      throw new Error("payment_keyed_reconciliation_saga_policy_conflict");
    }
    const plan = exactPlan(
      deps.list_plans({
        root_dir: rootDir,
        wallet_address:
          input.server_policy.preparation_policy.fulfillment_wallet_address,
      }),
      attemptId,
    );
    const custody = deps.read_custody({
      root_dir: rootDir,
      attempt_id: attemptId,
    });
    if (!custody) {
      throw new Error("payment_keyed_reconciliation_custody_missing");
    }
    assertDurableBinding(
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
      input.server_policy,
      runtimeFingerprint,
      preparationFingerprint,
    );
    const guard = guardState(deps.read_guard(rootDir), custody);
    const evidence = deps.read_evidence({
      root_dir: rootDir,
      attempt_id: attemptId,
    });
    if (
      evidence &&
      (
        evidence.saga_id !== sagaId ||
        evidence.attempt_id !== attemptId ||
        evidence.broadcast_intent_id !==
          text(sagaRecord.state.broadcast_intent_id).toLowerCase() ||
        evidence.transaction_hash !==
          custody.signed_transaction_hash
      )
    ) {
      throw new Error("payment_keyed_reconciliation_evidence_conflict");
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
      throw new Error("payment_keyed_reconciliation_outcome_conflict");
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
      guard_state: guard,
      evidence,
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
  input: BuyVoidPaymentKeyedBroadcastReconciliationInputV1,
  reconstructed: ReconstructedV1,
  runtimeFingerprint: string,
  preparationFingerprint: string,
): Extract<
  BuyVoidPaymentKeyedBroadcastReconciliationDecisionV1,
  { ok: false }
> | null {
  if (input.apply !== true) return null;
  if (
    text(input.confirmation) !==
      VOID_BUY_VOID_PAYMENT_KEYED_BROADCAST_RECONCILIATION_CONFIRMATION_V1 ||
    text(input.runtime_policy_fingerprint_sha256) !== runtimeFingerprint ||
    text(input.preparation_policy_fingerprint_sha256) !==
      preparationFingerprint ||
    text(input.saga_confirmation) !==
      reconstructed.saga.ADVANCE_CONFIRMATION ||
    text(input.saga_action_confirmation) !==
      reconstructed.saga.ACTION_CONFIRMATIONS
        .reconcile_possible_broadcast
  ) {
    return held(
      "confirmation",
      true,
      "payment_keyed_reconciliation_exact_confirmations_required",
    );
  }
  return null;
}

function notSubmittedOutcome(
  reconstructed: ReconstructedV1,
): BuyVoidPreparedTransactionBroadcasterReadyV1 {
  return {
    ok: true,
    status: "not_submitted",
    transaction_hash: reconstructed.custody.signed_transaction_hash,
    provider_submission_id: "",
    definitive_not_submitted: true,
    submission_call_performed:
      reconstructed.guard_state.submission_call_performed,
    submission_may_have_occurred: false,
    receipt: null,
  };
}

function acceptedOutcome(
  reconstructed: ReconstructedV1,
  inspection: Extract<
    BuyVoidPaymentKeyedChain2050InspectionDecisionV1,
    { ok: true }
  >,
): BuyVoidPreparedTransactionBroadcasterReadyV1 {
  return {
    ok: true,
    status: "accepted",
    transaction_hash: reconstructed.custody.signed_transaction_hash,
    provider_submission_id: inspection.provider_submission_id,
    definitive_not_submitted: false,
    submission_call_performed: true,
    submission_may_have_occurred: true,
    receipt: null,
  };
}

function recordEvidence(
  reconstructed: ReconstructedV1,
  deps: ReturnType<typeof dependencies>,
  outcome: BuyVoidPreparedTransactionBroadcasterReadyV1,
  nowMs: number,
): BuyVoidSagaBroadcastEvidenceStateV1 {
  const decision = deps.record_evidence({
    root_dir: reconstructed.root_dir,
    saga_id: reconstructed.saga_id,
    attempt_id: reconstructed.attempt.reservation.attempt_id,
    broadcast_intent_id:
      text(reconstructed.saga_record.state.broadcast_intent_id).toLowerCase(),
    transaction_hash: reconstructed.custody.signed_transaction_hash,
    outcome,
    now_ms: nowMs,
  });
  if (decision.ok === false) {
    throw new Error(
      "payment_keyed_reconciliation_evidence_held:" +
        decision.reason,
    );
  }
  return decision.state;
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
      "payment_keyed_reconciliation_pipeline_held:" +
        text(decision?.reason || decision?.status || "unknown"),
    );
  }
}

async function projectUnknown(
  reconstructed: ReconstructedV1,
  deps: ReturnType<typeof dependencies>,
  evidence: BuyVoidSagaBroadcastEvidenceStateV1,
  nowMs: number,
): Promise<void> {
  if (
    reconstructed.outcome?.status === "broadcast_unknown" &&
    reconstructed.attempt.status === "broadcast"
  ) {
    return;
  }
  if (
    reconstructed.outcome &&
    reconstructed.outcome.status !== "broadcast_unknown"
  ) {
    throw new Error(
      "payment_keyed_reconciliation_unknown_projection_conflict",
    );
  }
  await requirePipeline(deps, {
    action: "record_broadcast_unknown",
    root_dir: reconstructed.root_dir,
    attempt_id: reconstructed.attempt.reservation.attempt_id,
    transaction_hash: reconstructed.custody.signed_transaction_hash,
    reason_code: "payment_keyed_reconciliation_unknown",
    provider_submission_id: evidence.latest.provider_submission_id,
    apply: true,
    confirmation:
      VOID_BUY_VOID_PIPELINE_CONFIRMATIONS_V1.record_broadcast_unknown,
    now_ms: nowMs,
  });
}

async function projectAccepted(
  reconstructed: ReconstructedV1,
  deps: ReturnType<typeof dependencies>,
  evidence: BuyVoidSagaBroadcastEvidenceStateV1,
  nowMs: number,
): Promise<void> {
  if (
    reconstructed.outcome &&
    ["broadcast_accepted", "confirmed", "reverted"].includes(
      reconstructed.outcome.status,
    ) &&
    reconstructed.attempt.status === "broadcast"
  ) {
    return;
  }
  if (
    reconstructed.outcome &&
    reconstructed.outcome.status !== "broadcast_unknown"
  ) {
    throw new Error(
      "payment_keyed_reconciliation_accepted_projection_conflict",
    );
  }
  await requirePipeline(deps, {
    action: "record_broadcast_accepted",
    root_dir: reconstructed.root_dir,
    attempt_id: reconstructed.attempt.reservation.attempt_id,
    transaction_hash: reconstructed.custody.signed_transaction_hash,
    provider_submission_id: evidence.latest.provider_submission_id,
    apply: true,
    confirmation:
      VOID_BUY_VOID_PIPELINE_CONFIRMATIONS_V1.record_broadcast_accepted,
    now_ms: nowMs,
  });
}

async function appendNotSubmitted(
  reconstructed: ReconstructedV1,
  input: BuyVoidPaymentKeyedBroadcastReconciliationInputV1,
  nowMs: number,
): Promise<Record<string, unknown>> {
  const current = reconstructed.store.recover(reconstructed.saga_id);
  if (!current) {
    throw new Error("payment_keyed_reconciliation_saga_missing");
  }
  if (current.state.state === "broadcast_not_attempted") {
    return current.state;
  }
  if (current.state.state !== "broadcast_intent_committed") {
    throw new Error(
      "payment_keyed_reconciliation_not_submitted_state_conflict",
    );
  }
  const owner =
    "void-buy-payment-keyed-reconcile-no-submit-" +
    process.pid +
    "-" +
    crypto.randomBytes(12).toString("hex");
  const lease = reconstructed.store.acquireLease({
    saga_id: reconstructed.saga_id,
    owner_id: owner,
    now_ms: nowMs,
    ttl_ms: LEASE_TTL_MS,
  });
  if (!lease?.ok) {
    throw new Error(
      "payment_keyed_reconciliation_saga_lease_held",
    );
  }
  try {
    const reread = reconstructed.store.recover(reconstructed.saga_id);
    if (!reread) {
      throw new Error("payment_keyed_reconciliation_saga_missing");
    }
    if (reread.state.state === "broadcast_not_attempted") {
      return reread.state;
    }
    if (reread.state.state !== "broadcast_intent_committed") {
      throw new Error(
        "payment_keyed_reconciliation_not_submitted_state_changed",
      );
    }
    if (
      text(input.saga_action_confirmation) !==
        reconstructed.saga.ACTION_CONFIRMATIONS
          .reconcile_possible_broadcast
    ) {
      throw new Error(
        "payment_keyed_reconciliation_saga_action_confirmation_required",
      );
    }
    const event = reconstructed.saga.buildSagaEventV1({
      binding: reread.binding,
      sequence: reread.state.event_count,
      previous_event_id: reread.state.last_event_id,
      recorded_at_utc: new Date(nowMs).toISOString(),
      event_type: "broadcast_not_attempted",
      fencing_token: lease.lease.fencing_token,
      payload: {
        attempt_id: reread.state.attempt_id,
        transaction_hash: reread.state.transaction_hash,
        reason_code:
          reconstructed.guard_state.status === "never_claimed"
            ? "payment_keyed_guard_never_claimed"
            : "payment_keyed_guard_released_no_submission",
        broadcast_call_performed:
          reconstructed.guard_state.submission_call_performed,
      },
    });
    const appended = reconstructed.store.appendEvent({
      event,
      owner_id: owner,
      fencing_token: lease.lease.fencing_token,
      now_ms: nowMs,
    });
    return appended.state;
  } finally {
    reconstructed.store.releaseLease({
      saga_id: reconstructed.saga_id,
      owner_id: owner,
      fencing_token: lease.lease.fencing_token,
      now_ms: nowMs,
    });
  }
}

async function appendAccepted(
  reconstructed: ReconstructedV1,
  input: BuyVoidPaymentKeyedBroadcastReconciliationInputV1,
  evidence: BuyVoidSagaBroadcastEvidenceStateV1,
  nowMs: number,
): Promise<Record<string, unknown>> {
  const current = reconstructed.store.recover(reconstructed.saga_id);
  if (!current) {
    throw new Error("payment_keyed_reconciliation_saga_missing");
  }
  if (current.state.state === "broadcast_accepted") {
    return current.state;
  }
  if (
    current.state.state !== "broadcast_intent_committed" &&
    current.state.state !== "broadcast_unknown"
  ) {
    throw new Error(
      "payment_keyed_reconciliation_accept_state_conflict",
    );
  }
  const result = await reconstructed.saga.runSagaSupervisorTickV1({
    store: reconstructed.store,
    binding: current.binding,
    owner_id:
      "void-buy-payment-keyed-reconcile-accepted-" +
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
          reason_code: "payment_keyed_chain2050_transaction_visible",
          broadcast_call_performed: true,
          provider_submission_id_sha256:
            sha256(evidence.latest.provider_submission_id),
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
      "payment_keyed_reconciliation_saga_accept_held:" +
        text(result?.reason || result?.status || "unknown"),
    );
  }
  const updated = reconstructed.store.recover(reconstructed.saga_id);
  if (!updated || updated.state.state !== "broadcast_accepted") {
    throw new Error(
      "payment_keyed_reconciliation_saga_accept_missing",
    );
  }
  return updated.state;
}

function success(
  status: "not_submitted" | "unknown" | "accepted",
  reconstructed: ReconstructedV1,
  deps: ReturnType<typeof dependencies>,
  evidence: BuyVoidSagaBroadcastEvidenceStateV1 | null,
  sagaState: Record<string, unknown>,
  inspectionPerformed: boolean,
): BuyVoidPaymentKeyedBroadcastReconciliationDecisionV1 {
  const attempt = deps.read_attempt({
    root_dir: reconstructed.root_dir,
    attempt_id: reconstructed.attempt.reservation.attempt_id,
  });
  const outcome = deps.read_outcome({
    root_dir: reconstructed.root_dir,
    attempt_id: reconstructed.attempt.reservation.attempt_id,
  });
  if (!attempt) {
    return held(
      "journal_reconstruction",
      true,
      "payment_keyed_reconciliation_final_attempt_missing",
      {
        mutation_performed: true,
        inspection_performed: inspectionPerformed,
        rpc_call_performed: inspectionPerformed,
      },
    );
  }
  return {
    ok: true,
    status,
    applied: true,
    marker: VOID_BUY_VOID_PAYMENT_KEYED_BROADCAST_RECONCILIATION_V1,
    version: 1,
    saga_id: reconstructed.saga_id,
    attempt_id: reconstructed.attempt.reservation.attempt_id,
    guard_state: reconstructed.guard_state,
    evidence,
    execution_attempt: attempt,
    broadcast_outcome: outcome,
    saga_state: sagaState,
    inspection_performed: inspectionPerformed,
    rpc_call_performed: inspectionPerformed,
    signer_access_performed: false,
    signing_performed: false,
    submission_guard_mutation_performed: false,
    transaction_broadcast_performed: false,
    automatic_retry_allowed: false,
    reconciliation_required:
      status === "unknown" || status === "accepted",
    money_movement_performed: false,
  };
}

export async function runBuyVoidPaymentKeyedBroadcastReconciliationV1(
  input: BuyVoidPaymentKeyedBroadcastReconciliationInputV1,
): Promise<BuyVoidPaymentKeyedBroadcastReconciliationDecisionV1> {
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
      "payment_keyed_reconciliation_saga_module_failed",
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
    const evidenceOutcome =
      reconstructed.evidence?.latest.outcome || null;
    return {
      ok: true,
      status: "dry_run",
      applied: false,
      marker: VOID_BUY_VOID_PAYMENT_KEYED_BROADCAST_RECONCILIATION_V1,
      version: 1,
      saga_id: reconstructed.saga_id,
      attempt_id: reconstructed.attempt.reservation.attempt_id,
      saga_state: text(reconstructed.saga_record.state?.state),
      guard_state: reconstructed.guard_state,
      existing_evidence: reconstructed.evidence,
      existing_outcome: reconstructed.outcome,
      chain_inspection_required:
        reconstructed.guard_state.status === "claimed" &&
        evidenceOutcome !== "accepted" &&
        evidenceOutcome !== "not_submitted",
      required_confirmation:
        VOID_BUY_VOID_PAYMENT_KEYED_BROADCAST_RECONCILIATION_CONFIRMATION_V1,
      required_runtime_policy_fingerprint_sha256:
        runtimePolicy.fingerprint,
      required_preparation_policy_fingerprint_sha256:
        preparationPolicy.policy_fingerprint_sha256,
      required_saga_confirmation:
        reconstructed.saga.ADVANCE_CONFIRMATION,
      required_saga_action_confirmation:
        reconstructed.saga.ACTION_CONFIRMATIONS
          .reconcile_possible_broadcast,
      inspection_performed: false,
      rpc_call_performed: false,
      signer_access_performed: false,
      signing_performed: false,
      submission_guard_mutation_performed: false,
      transaction_broadcast_performed: false,
      automatic_retry_allowed: false,
      reconciliation_required: true,
      money_movement_performed: false,
    };
  }

  const confirmationHold = exactConfirmations(
    input,
    reconstructed,
    runtimePolicy.fingerprint,
    preparationPolicy.policy_fingerprint_sha256,
  );
  if (confirmationHold) return confirmationHold;

  const nowMs = deps.now_ms();
  if (!Number.isSafeInteger(nowMs) || nowMs <= 0) {
    return held(
      "input",
      true,
      "payment_keyed_reconciliation_server_clock_invalid",
    );
  }

  let evidence = reconstructed.evidence;
  const latest = evidence?.latest.outcome || null;

  if (
    latest === "not_submitted" ||
    (
      !evidence &&
      (
        reconstructed.guard_state.status === "never_claimed" ||
        reconstructed.guard_state.status === "released"
      )
    )
  ) {
    try {
      if (!evidence) {
        evidence = recordEvidence(
          reconstructed,
          deps,
          notSubmittedOutcome(reconstructed),
          nowMs,
        );
      }
      if (
        reconstructed.attempt.status !== "prepared" ||
        reconstructed.outcome !== null
      ) {
        throw new Error(
          "payment_keyed_reconciliation_not_submitted_projection_conflict",
        );
      }
      const sagaState = await appendNotSubmitted(
        reconstructed,
        input,
        nowMs,
      );
      return success(
        "not_submitted",
        reconstructed,
        deps,
        evidence,
        sagaState,
        false,
      );
    } catch (error) {
      return held(
        "saga_append",
        true,
        text((error as Error)?.message || error).slice(0, 240),
        {
          mutation_performed: Boolean(evidence),
          reconciliation_required: true,
        },
      );
    }
  }

  if (latest === "accepted") {
    try {
      await projectAccepted(reconstructed, deps, evidence!, nowMs);
      const sagaState = await appendAccepted(
        reconstructed,
        input,
        evidence!,
        nowMs,
      );
      return success(
        "accepted",
        reconstructed,
        deps,
        evidence!,
        sagaState,
        false,
      );
    } catch (error) {
      return held(
        "projection_persistence",
        true,
        text((error as Error)?.message || error).slice(0, 240),
        {
          mutation_performed: true,
          reconciliation_required: true,
        },
      );
    }
  }

  if (latest === "unknown") {
    try {
      await projectUnknown(reconstructed, deps, evidence!, nowMs);
    } catch (error) {
      return held(
        "projection_persistence",
        true,
        text((error as Error)?.message || error).slice(0, 240),
        {
          mutation_performed: true,
          reconciliation_required: true,
        },
      );
    }
  }

  if (reconstructed.guard_state.status !== "claimed") {
    return held(
      "guard_reconstruction",
      true,
      "payment_keyed_reconciliation_guard_state_evidence_conflict",
      {
        reconciliation_required: true,
      },
    );
  }

  let inspection: BuyVoidPaymentKeyedChain2050InspectionDecisionV1;
  try {
    inspection = await deps.inspect_chain({
      custody: reconstructed.custody,
      preparation_policy: input.server_policy.preparation_policy,
      ...(deps.inspection_transport
        ? { transport: deps.inspection_transport }
        : {}),
    });
  } catch (error) {
    return held(
      "chain_inspection",
      true,
      "payment_keyed_reconciliation_chain_inspection_failed",
      {
        inspection_performed: true,
        rpc_call_performed: true,
        detail: {
          error_class: text((error as Error)?.name || "Error"),
        },
      },
    );
  }
  if (inspection.ok === false) {
    return held(
      "chain_inspection",
      true,
      inspection.reason,
      {
        inspection_performed: true,
        rpc_call_performed: true,
        reconciliation_required: true,
        detail: inspection.detail,
      },
    );
  }

  if (inspection.status === "unknown") {
    const sagaState = reconstructed.store.recover(
      reconstructed.saga_id,
    )?.state || {};
    return success(
      "unknown",
      reconstructed,
      deps,
      evidence,
      sagaState,
      true,
    );
  }

  try {
    evidence = recordEvidence(
      reconstructed,
      deps,
      acceptedOutcome(reconstructed, inspection),
      nowMs,
    );
  } catch (error) {
    return held(
      "evidence_persistence",
      true,
      text((error as Error)?.message || error).slice(0, 240),
      {
        inspection_performed: true,
        rpc_call_performed: true,
        reconciliation_required: true,
      },
    );
  }

  try {
    await projectAccepted(reconstructed, deps, evidence, nowMs);
    const sagaState = await appendAccepted(
      reconstructed,
      input,
      evidence,
      nowMs,
    );
    return success(
      "accepted",
      reconstructed,
      deps,
      evidence,
      sagaState,
      true,
    );
  } catch (error) {
    return held(
      "projection_persistence",
      true,
      text((error as Error)?.message || error).slice(0, 240),
      {
        mutation_performed: true,
        inspection_performed: true,
        rpc_call_performed: true,
        reconciliation_required: true,
      },
    );
  }
}
