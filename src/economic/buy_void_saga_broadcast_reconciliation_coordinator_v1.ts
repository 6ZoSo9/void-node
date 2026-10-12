import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  listBuyVoidFulfillmentJournalClaimsV1,
  type BuyVoidFulfillmentJournalIntentV1,
} from "./buy_void_fulfillment_journal_v1.js";
import {
  readBuyVoidExecutionAttemptV1,
  type BuyVoidExecutionAttemptStateV1,
} from "./buy_void_execution_attempt_journal_v1.js";
import {
  VOID_BUY_VOID_PIPELINE_CONFIRMATIONS_V1,
  runBuyVoidPipelineCommandV1,
  type BuyVoidPipelineCoordinatorDecisionV1,
} from "./buy_void_pipeline_coordinator_v1.js";
import {
  readBuyVoidBroadcastOutcomeStateV1,
  type BuyVoidBroadcastOutcomeStateV1,
} from "./buy_void_broadcast_outcome_journal_v1.js";
import {
  listBuyVoidPreparedTransactionPlanReservationsV1,
  type BuyVoidPreparedTransactionPlanReservationV1,
} from "./buy_void_prepared_transaction_plan_reservation_v1.js";
import {
  readBuyVoidPreparedTransactionCustodyV1,
  type BuyVoidPreparedTransactionCustodyPublicProjectionV1,
} from "./buy_void_prepared_transaction_custody_v1.js";
import {
  VOID_BUY_VOID_PREPARED_TRANSACTION_BROADCAST_CONFIRMATION_V1,
  inspectBuyVoidPreparedTransactionSubmissionV1,
  submitBuyVoidPreparedTransactionFromCustodyV1,
  type BuyVoidPreparedTransactionBroadcasterReadyV1,
  type BuyVoidPreparedTransactionBroadcasterV1,
  type BuyVoidPreparedTransactionBroadcastReceiptV1,
} from "./buy_void_prepared_transaction_broadcast_custody_v1.js";
import {
  readBuyVoidSagaBroadcastEvidenceStateV1,
  recordBuyVoidSagaBroadcastEvidenceV1,
  type BuyVoidSagaBroadcastEvidenceEventV1,
  type BuyVoidSagaBroadcastEvidenceStateV1,
} from "./buy_void_saga_broadcast_evidence_journal_v1.js";
import {
  readBuyVoidSagaBroadcastReconciliationServerPolicyV1,
  type BuyVoidSagaBroadcastReconciliationServerPolicyV1,
} from "./buy_void_saga_broadcast_reconciliation_server_policy_v1.js";

export const VOID_BUY_VOID_SAGA_BROADCAST_RECONCILIATION_COORDINATOR_V1 =
  "VOID_BUY_VOID_SAGA_BROADCAST_RECONCILIATION_COORDINATOR_V1";

export const VOID_BUY_VOID_SAGA_BROADCAST_RECONCILIATION_CONFIRMATION_V1 =
  "buyVoidAdvanceSagaBroadcastReconciliationV1";

export const VOID_BUY_VOID_SAGA_BROADCAST_RECONCILIATION_AUTHORITY_V1 = {
  source_only_contract: true,
  runtime_route_mount: false,
  background_loop: false,
  startup_execution: false,
  exact_saga_selector: true,
  server_controlled_policy: true,
  stable_policy_fingerprint_echo_required: true,
  prepared_transaction_plan_required: true,
  prepared_transaction_custody_required: true,
  saga_write_ahead_broadcast_intent_required: true,
  external_submit_inside_supervisor_adapter_only: true,
  durable_broadcast_evidence_before_projection_writes: true,
  canonical_execution_and_outcome_journals_required: true,
  saga_event_after_projection_writes: true,
  submit_once_only_during_execute_action: true,
  inspect_only_during_reconciliation: true,
  automatic_resubmission: false,
  application_private_material_access: false,
  application_wallet_access: false,
  application_signing: false,
  custody_handle_input: false,
  custody_handle_output: false,
  signed_payload_bytes_input: false,
  signed_payload_bytes_persistence: false,
  signed_payload_bytes_output: false,
  external_transaction_submission_when_applied: true,
  receipt_observation_possible: true,
  inventory_decrement: false,
  public_fulfilled_closeout: false,
  automatic_retry: false,
  money_movement_when_submission_occurs: true,
} as const;

const SHA256 = /^[0-9a-f]{64}$/;
const SAGA_ID = /^voidbvfsg1_[0-9a-f]{64}$/;
const SAGA_ROOT = "buy-void-crash-consistent-saga-runtime-v1";
const EVIDENCE_ROOT = "buy-void-saga-broadcast-evidence-v1";
const LEASE_TTL_MS = 30_000;
const NATIVE_VALUE_MULTIPLIER = 1_000_000_000_000n;
const SOURCE_FLOOR = "c4f742c2c2c33c91fcaa27dc462505cd5c19abdc";

export type BuyVoidSagaBroadcastReconciliationFaultStageV1 =
  | "after_broadcast_intent_before_submit"
  | "after_external_outcome_before_evidence"
  | "after_evidence_before_projection"
  | "after_projection_before_saga";

export type BuyVoidSagaBroadcastReconciliationDependenciesV1 = {
  list_claims?: (rootDir: string) => unknown[];
  read_attempt?: (input: {
    root_dir: string;
    attempt_id: string;
  }) => unknown | null;
  list_plans?: (input: {
    root_dir: string;
    wallet_address: string;
  }) => BuyVoidPreparedTransactionPlanReservationV1[];
  run_pipeline_command?: (
    command: Record<string, unknown>,
  ) => unknown | Promise<unknown>;
  read_custody?: (input: {
    root_dir: string;
    attempt_id: string;
  }) => BuyVoidPreparedTransactionCustodyPublicProjectionV1 | null;
  read_evidence?: (input: {
    root_dir: string;
    attempt_id: string;
  }) => BuyVoidSagaBroadcastEvidenceStateV1 | null;
  record_evidence?: typeof recordBuyVoidSagaBroadcastEvidenceV1;
  read_outcome?: (input: {
    root_dir: string;
    attempt_id: string;
  }) => BuyVoidBroadcastOutcomeStateV1 | null;
  broadcaster?: BuyVoidPreparedTransactionBroadcasterV1;
  load_saga_module?: () => Promise<SagaModuleV1>;
  now_ms?: () => number;
  fault_inject?: (
    stage: BuyVoidSagaBroadcastReconciliationFaultStageV1,
  ) => void | Promise<void>;
};

export type RunBuyVoidSagaBroadcastReconciliationInputV1 = {
  root_dir: string;
  saga_id: string;
  apply?: boolean;
  confirmation?: unknown;
  policy_fingerprint_sha256?: unknown;
  saga_confirmation?: unknown;
  saga_action_confirmation?: unknown;
  broadcast_confirmation?: unknown;
  dependencies?: BuyVoidSagaBroadcastReconciliationDependenciesV1;
};

export type BuyVoidSagaBroadcastReconciliationDecisionV1 =
  | {
      ok: true;
      status: "dry_run";
      applied: false;
      mutation_performed: false;
      saga_id: string;
      attempt_id: string;
      next_action:
        | "execute_prepared_transaction"
        | "reconcile_possible_broadcast";
      required_confirmation:
        typeof VOID_BUY_VOID_SAGA_BROADCAST_RECONCILIATION_CONFIRMATION_V1;
      required_policy_fingerprint_sha256: string;
      required_saga_confirmation: string;
      required_saga_action_confirmation: string;
      required_broadcast_confirmation:
        | typeof VOID_BUY_VOID_PREPARED_TRANSACTION_BROADCAST_CONFIRMATION_V1
        | null;
      existing_evidence: BuyVoidSagaBroadcastEvidenceStateV1 | null;
      existing_outcome: BuyVoidBroadcastOutcomeStateV1 | null;
      policy_public_summary:
        BuyVoidSagaBroadcastReconciliationServerPolicyV1["public_summary"];
      broadcaster_called: false;
      submission_call_performed: false;
      transaction_broadcast_performed: false;
      reconciliation_required: boolean;
      automatic_retry_allowed: false;
      signed_payload_bytes_persisted: false;
      signed_payload_bytes_returned: false;
      money_movement_performed: false;
      reason?: never;
      detail?: never;
    }
  | {
      ok: true;
      status:
        | "not_submitted"
        | "unknown"
        | "accepted"
        | "confirmed"
        | "reverted";
      applied: true;
      mutation_performed: boolean;
      saga_id: string;
      attempt_id: string;
      action:
        | "execute_prepared_transaction"
        | "reconcile_possible_broadcast";
      evidence: BuyVoidSagaBroadcastEvidenceStateV1;
      execution_attempt: BuyVoidExecutionAttemptStateV1;
      broadcast_outcome: BuyVoidBroadcastOutcomeStateV1 | null;
      saga_state: Record<string, unknown>;
      broadcaster_called: boolean;
      submission_call_performed: boolean;
      transaction_broadcast_performed: boolean;
      reconciliation_required: boolean;
      automatic_retry_allowed: false;
      signed_payload_bytes_persisted: false;
      signed_payload_bytes_returned: false;
      money_movement_performed: boolean;
      reason?: never;
      detail?: never;
    }
  | {
      ok: false;
      status: "held";
      applied: boolean;
      stage:
        | "input"
        | "server_policy"
        | "saga_reconstruction"
        | "journal_reconstruction"
        | "confirmation"
        | "external_submission"
        | "external_inspection"
        | "evidence_persistence"
        | "projection_persistence"
        | "saga_append";
      reason: string;
      detail?: Record<string, unknown>;
      mutation_performed: boolean;
      broadcaster_called: boolean;
      submission_call_performed: boolean;
      transaction_broadcast_performed: boolean;
      reconciliation_required: boolean;
      automatic_retry_allowed: false;
      signed_payload_bytes_persisted: false;
      signed_payload_bytes_returned: false;
      money_movement_performed: boolean;
      evidence?: never;
    };

type SagaStoreV1 = {
  recover: (sagaId: string) => any | null;
  acquireLease: (input: Record<string, unknown>) => any;
  releaseLease: (input: Record<string, unknown>) => unknown;
  appendEvent: (input: Record<string, unknown>) => any;
};

type SagaModuleV1 = {
  ADVANCE_CONFIRMATION: string;
  ACTION_CONFIRMATIONS: Record<string, string>;
  deriveSagaNextActionV1: (state: Record<string, unknown>) => {
    action: string | null;
    terminal: boolean;
    required_confirmation: string | null;
  };
  buildSagaEventV1: (input: Record<string, unknown>) => any;
  createFilesystemSagaStoreV1: (rootDir: string) => SagaStoreV1;
  runSagaSupervisorTickV1: (input: Record<string, unknown>) => Promise<any>;
};

type ReconstructedV1 = {
  root_dir: string;
  saga: SagaModuleV1;
  store: SagaStoreV1;
  record: any;
  action:
    | "execute_prepared_transaction"
    | "reconcile_possible_broadcast";
  attempt: BuyVoidExecutionAttemptStateV1;
  intent: BuyVoidFulfillmentJournalIntentV1;
  plan: BuyVoidPreparedTransactionPlanReservationV1;
  custody: BuyVoidPreparedTransactionCustodyPublicProjectionV1;
  evidence: BuyVoidSagaBroadcastEvidenceStateV1 | null;
  outcome: BuyVoidBroadcastOutcomeStateV1 | null;
  policy: BuyVoidSagaBroadcastReconciliationServerPolicyV1;
};

type CurrentCallV1 = {
  broadcaster_called: boolean;
  submission_call_performed: boolean;
  transaction_broadcast_performed: boolean;
  money_movement_performed: boolean;
};

type ExecuteCaptureV1 = CurrentCallV1 & {
  outcome: BuyVoidPreparedTransactionBroadcasterReadyV1 | null;
  evidence: BuyVoidSagaBroadcastEvidenceStateV1 | null;
};

function held(
  applied: boolean,
  stage: Extract<
    BuyVoidSagaBroadcastReconciliationDecisionV1,
    { ok: false }
  >["stage"],
  reason: string,
  options: {
    detail?: Record<string, unknown>;
    mutation_performed?: boolean;
    broadcaster_called?: boolean;
    submission_call_performed?: boolean;
    transaction_broadcast_performed?: boolean;
    reconciliation_required?: boolean;
    money_movement_performed?: boolean;
  } = {},
): Extract<BuyVoidSagaBroadcastReconciliationDecisionV1, { ok: false }> {
  return {
    ok: false,
    status: "held",
    applied,
    stage,
    reason,
    ...(options.detail ? { detail: options.detail } : {}),
    mutation_performed: options.mutation_performed === true,
    broadcaster_called: options.broadcaster_called === true,
    submission_call_performed:
      options.submission_call_performed === true,
    transaction_broadcast_performed:
      options.transaction_broadcast_performed === true,
    reconciliation_required:
      options.reconciliation_required === true,
    automatic_retry_allowed: false,
    signed_payload_bytes_persisted: false,
    signed_payload_bytes_returned: false,
    money_movement_performed:
      options.money_movement_performed === true,
  };
}

function text(value: unknown): string {
  return String(value ?? "").trim();
}

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function absoluteRoot(value: unknown): string {
  const raw = text(value);
  if (!raw || !path.isAbsolute(raw) || raw.includes("\0")) {
    throw new Error("broadcast_reconciliation_root_must_be_absolute");
  }
  const resolved = path.resolve(raw);
  if (resolved === path.parse(resolved).root) {
    throw new Error("broadcast_reconciliation_root_must_not_be_filesystem_root");
  }
  return resolved;
}

function ownerId(): string {
  return `void-buy-broadcast-${process.pid}-${crypto.randomBytes(16).toString("hex")}`;
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
  supplied?: BuyVoidSagaBroadcastReconciliationDependenciesV1,
): Required<
  Omit<
    BuyVoidSagaBroadcastReconciliationDependenciesV1,
    "broadcaster" | "fault_inject"
  >
> & Pick<
  BuyVoidSagaBroadcastReconciliationDependenciesV1,
  "broadcaster" | "fault_inject"
> {
  return {
    list_claims: listBuyVoidFulfillmentJournalClaimsV1,
    read_attempt: readBuyVoidExecutionAttemptV1 as any,
    list_plans: listBuyVoidPreparedTransactionPlanReservationsV1,
    run_pipeline_command: runBuyVoidPipelineCommandV1 as any,
    read_custody: readBuyVoidPreparedTransactionCustodyV1,
    read_evidence: readBuyVoidSagaBroadcastEvidenceStateV1,
    record_evidence: recordBuyVoidSagaBroadcastEvidenceV1,
    read_outcome: readBuyVoidBroadcastOutcomeStateV1,
    load_saga_module: defaultSagaModule,
    now_ms: Date.now,
    ...(supplied || {}),
  };
}

function sagaRoot(rootDir: string): string {
  return path.join(rootDir, SAGA_ROOT);
}

function evidenceExists(rootDir: string, attemptId: string): boolean {
  return fs.existsSync(
    path.join(
      rootDir,
      EVIDENCE_ROOT,
      "attempts",
      attemptId,
      "events",
    ),
  );
}

function exactIntent(
  claims: unknown[],
  attempt: BuyVoidExecutionAttemptStateV1,
): BuyVoidFulfillmentJournalIntentV1 {
  const reservation = attempt.reservation;
  const matches = claims
    .filter((value): value is BuyVoidFulfillmentJournalIntentV1 =>
      Boolean(value && typeof value === "object"),
    )
    .filter((value) =>
      value.claim?.canonical_payment_identity ===
        reservation.canonical_payment_identity &&
      value.claim?.request_id === reservation.request_id &&
      value.claim?.instruction_id === reservation.instruction_id &&
      value.payment_key_sha256 === reservation.payment_key_sha256 &&
      value.request_key_sha256 === reservation.request_key_sha256,
    );
  if (matches.length !== 1) {
    throw new Error(
      matches.length === 0
        ? "broadcast_reconciliation_claim_missing"
        : "broadcast_reconciliation_claim_ambiguous",
    );
  }
  return matches[0];
}

function exactPlan(
  rootDir: string,
  attempt: BuyVoidExecutionAttemptStateV1,
  listPlans: ReturnType<typeof dependencies>["list_plans"],
): BuyVoidPreparedTransactionPlanReservationV1 {
  const prepared = attempt.prepared;
  if (!prepared) throw new Error("prepared_execution_attempt_required");
  const matches = listPlans({
    root_dir: rootDir,
    wallet_address: prepared.fulfillment_wallet,
  }).filter((plan) =>
    plan.attempt_id === attempt.reservation.attempt_id,
  );
  if (matches.length !== 1) {
    throw new Error(
      matches.length === 0
        ? "broadcast_reconciliation_plan_missing"
        : "broadcast_reconciliation_plan_ambiguous",
    );
  }
  return matches[0];
}

function assertReceiptBinding(
  receipt: BuyVoidPreparedTransactionBroadcastReceiptV1,
  reconstructed: Pick<ReconstructedV1, "attempt" | "policy">,
): void {
  const prepared = reconstructed.attempt.prepared;
  if (!prepared) throw new Error("prepared_execution_attempt_required");
  const minimum = BigInt(
    reconstructed.policy.receipt_policy.min_confirmations,
  );
  if (
    receipt.chain_id !== "2050" ||
    receipt.transaction_hash !== prepared.void_delivery_tx_hash ||
    receipt.from_address !== prepared.fulfillment_wallet ||
    receipt.to_address !== prepared.delivery_address ||
    receipt.amount_units !== prepared.void_amount_units ||
    BigInt(receipt.confirmation_count) < minimum
  ) {
    throw new Error("broadcast_reconciliation_receipt_binding_conflict");
  }
}

function assertReconstructedBinding(
  reconstructed: ReconstructedV1,
  sagaId: string,
): void {
  const {
    record,
    attempt,
    intent,
    plan,
    custody,
    policy,
    evidence,
    outcome,
  } = reconstructed;
  const prepared = attempt.prepared;
  const reservation = attempt.reservation;
  if (!prepared || reservation.attempt_id !== record.state.attempt_id) {
    throw new Error("broadcast_reconciliation_attempt_binding_invalid");
  }
  if (
    record.saga_id !== sagaId ||
    record.state.transaction_hash !== prepared.void_delivery_tx_hash ||
    record.binding.request_id !== reservation.request_id ||
    record.binding.canonical_payment_identity !==
      reservation.canonical_payment_identity ||
    record.binding.request_key_sha256 !== reservation.request_key_sha256 ||
    record.binding.payment_key_sha256 !== reservation.payment_key_sha256 ||
    record.binding.delivery_address !== prepared.delivery_address ||
    record.binding.void_amount_units !== prepared.void_amount_units ||
    record.binding.chain_id !== "2050" ||
    prepared.chain_id !== "2050"
  ) {
    throw new Error("broadcast_reconciliation_saga_attempt_conflict");
  }
  const initialization = record.events?.[0];
  if (
    initialization?.event_type !== "saga_initialized" ||
    initialization?.payload?.policy_id !==
      policy.economic_policy.saga_policy_id
  ) {
    throw new Error("broadcast_reconciliation_economic_policy_conflict");
  }
  if (
    intent.claim?.canonical_payment_identity !==
      reservation.canonical_payment_identity ||
    intent.claim?.request_id !== reservation.request_id ||
    intent.claim?.instruction_id !== reservation.instruction_id
  ) {
    throw new Error("broadcast_reconciliation_intent_conflict");
  }
  const expectedNativeValue =
    (BigInt(prepared.void_amount_units) * NATIVE_VALUE_MULTIPLIER)
      .toString();
  if (
    plan.saga_id !== sagaId ||
    plan.attempt_id !== reservation.attempt_id ||
    plan.chain_id !== "2050" ||
    plan.wallet_address !== prepared.fulfillment_wallet ||
    plan.delivery_address !== prepared.delivery_address ||
    plan.native_value_wei !== expectedNativeValue ||
    plan.nonce !== record.state.nonce ||
    plan.reservation_status !== "reserved"
  ) {
    throw new Error("broadcast_reconciliation_plan_conflict");
  }
  if (
    custody.saga_id !== sagaId ||
    custody.attempt_id !== reservation.attempt_id ||
    custody.signed_transaction_hash !== prepared.void_delivery_tx_hash ||
    custody.transaction_plan_fingerprint_sha256 !==
      plan.transaction_plan_fingerprint_sha256 ||
    custody.nonce !== plan.nonce ||
    custody.custody_handle_private !== true ||
    Object.prototype.hasOwnProperty.call(custody, "custody_handle")
  ) {
    throw new Error("broadcast_reconciliation_custody_conflict");
  }
  const wallets = policy.economic_policy.execution_policy
    .fulfillment_wallet_allowlist;
  if (
    wallets.length !== 1 ||
    wallets[0] !== prepared.fulfillment_wallet
  ) {
    throw new Error("broadcast_reconciliation_wallet_policy_conflict");
  }
  if (evidence) {
    if (
      evidence.saga_id !== sagaId ||
      evidence.attempt_id !== reservation.attempt_id ||
      evidence.broadcast_intent_id !== record.state.broadcast_intent_id ||
      evidence.transaction_hash !== prepared.void_delivery_tx_hash
    ) {
      throw new Error("broadcast_reconciliation_evidence_conflict");
    }
    if (evidence.latest.receipt) {
      assertReceiptBinding(evidence.latest.receipt, reconstructed);
    }
  }
  if (
    outcome &&
    (
      outcome.attempt_id !== reservation.attempt_id ||
      outcome.void_delivery_tx_hash !== prepared.void_delivery_tx_hash
    )
  ) {
    throw new Error("broadcast_reconciliation_outcome_conflict");
  }
}

async function reconstruct(
  input: RunBuyVoidSagaBroadcastReconciliationInputV1,
  deps: ReturnType<typeof dependencies>,
): Promise<
  | ReconstructedV1
  | Extract<BuyVoidSagaBroadcastReconciliationDecisionV1, { ok: false }>
> {
  let rootDir: string;
  try {
    rootDir = absoluteRoot(input?.root_dir);
  } catch (error) {
    return held(
      input?.apply === true,
      "input",
      text((error as Error)?.message || error),
    );
  }
  const sagaId = text(input?.saga_id).toLowerCase();
  if (!SAGA_ID.test(sagaId)) {
    return held(
      input?.apply === true,
      "input",
      "broadcast_reconciliation_saga_id_invalid",
    );
  }
  const policyDecision =
    readBuyVoidSagaBroadcastReconciliationServerPolicyV1();
  if ("reason" in policyDecision) {
    return held(
      input?.apply === true,
      "server_policy",
      policyDecision.reason,
      {
        detail: {
          missing_envs: policyDecision.missing_envs,
          ...(policyDecision.detail || {}),
        },
      },
    );
  }
  const root = sagaRoot(rootDir);
  const sagaDir = path.join(root, "sagas", sagaId);
  if (!fs.existsSync(sagaDir)) {
    return held(
      input?.apply === true,
      "saga_reconstruction",
      "broadcast_reconciliation_saga_not_found",
    );
  }
  let saga: SagaModuleV1;
  let store: SagaStoreV1;
  let record: any;
  try {
    saga = await deps.load_saga_module();
    store = saga.createFilesystemSagaStoreV1(root);
    record = store.recover(sagaId);
  } catch (error) {
    return held(
      input?.apply === true,
      "saga_reconstruction",
      "broadcast_reconciliation_saga_read_failed",
      {
        detail: {
          message: text((error as Error)?.message || error).slice(0, 240),
        },
      },
    );
  }
  if (!record) {
    return held(
      input?.apply === true,
      "saga_reconstruction",
      "broadcast_reconciliation_saga_empty",
    );
  }
  let next: ReturnType<SagaModuleV1["deriveSagaNextActionV1"]>;
  try {
    next = saga.deriveSagaNextActionV1(record.state);
  } catch (error) {
    return held(
      input?.apply === true,
      "saga_reconstruction",
      "broadcast_reconciliation_next_action_failed",
      {
        detail: {
          message: text((error as Error)?.message || error).slice(0, 240),
        },
      },
    );
  }
  if (
    next.terminal ||
    (next.action !== "execute_prepared_transaction" &&
      next.action !== "reconcile_possible_broadcast")
  ) {
    return held(
      input?.apply === true,
      "saga_reconstruction",
      "broadcast_reconciliation_action_outside_boundary",
      {
        detail: {
          state: text(record.state?.state),
          next_action: next.action,
          terminal: next.terminal,
        },
      },
    );
  }
  const attemptId = text(record.state?.attempt_id).toLowerCase();
  if (!SHA256.test(attemptId)) {
    return held(
      input?.apply === true,
      "journal_reconstruction",
      "broadcast_reconciliation_attempt_id_invalid",
    );
  }
  try {
    const attempt = deps.read_attempt({
      root_dir: rootDir,
      attempt_id: attemptId,
    }) as BuyVoidExecutionAttemptStateV1 | null;
    if (!attempt) throw new Error("broadcast_reconciliation_attempt_missing");
    const intent = exactIntent(deps.list_claims(rootDir), attempt);
    const plan = exactPlan(rootDir, attempt, deps.list_plans);
    const custody = deps.read_custody({
      root_dir: rootDir,
      attempt_id: attemptId,
    });
    if (!custody) throw new Error("broadcast_reconciliation_custody_missing");
    const evidence = evidenceExists(rootDir, attemptId)
      ? deps.read_evidence({ root_dir: rootDir, attempt_id: attemptId })
      : null;
    const outcome = deps.read_outcome({
      root_dir: rootDir,
      attempt_id: attemptId,
    });
    const reconstructed: ReconstructedV1 = {
      root_dir: rootDir,
      saga,
      store,
      record,
      action: next.action,
      attempt,
      intent,
      plan,
      custody,
      evidence,
      outcome,
      policy: policyDecision.policy,
    };
    assertReconstructedBinding(reconstructed, sagaId);
    return reconstructed;
  } catch (error) {
    return held(
      input?.apply === true,
      "journal_reconstruction",
      "broadcast_reconciliation_journal_read_failed",
      {
        detail: {
          message: text((error as Error)?.message || error).slice(0, 240),
        },
      },
    );
  }
}

function exactConfirmations(
  input: RunBuyVoidSagaBroadcastReconciliationInputV1,
  reconstructed: ReconstructedV1,
): Extract<BuyVoidSagaBroadcastReconciliationDecisionV1, { ok: false }> | null {
  if (input.apply !== true) return null;
  if (
    text(input.confirmation) !==
      VOID_BUY_VOID_SAGA_BROADCAST_RECONCILIATION_CONFIRMATION_V1
  ) {
    return held(
      true,
      "confirmation",
      "broadcast_reconciliation_confirmation_required",
    );
  }
  if (
    text(input.policy_fingerprint_sha256) !==
      reconstructed.policy.combined_policy_fingerprint_sha256
  ) {
    return held(
      true,
      "confirmation",
      "broadcast_reconciliation_policy_fingerprint_required",
    );
  }
  if (
    text(input.saga_confirmation) !==
      reconstructed.saga.ADVANCE_CONFIRMATION
  ) {
    return held(
      true,
      "confirmation",
      "broadcast_reconciliation_saga_confirmation_required",
    );
  }
  const requiredAction =
    reconstructed.saga.ACTION_CONFIRMATIONS[reconstructed.action];
  if (text(input.saga_action_confirmation) !== requiredAction) {
    return held(
      true,
      "confirmation",
      "broadcast_reconciliation_action_confirmation_required",
    );
  }
  if (
    reconstructed.action === "execute_prepared_transaction" &&
    text(input.broadcast_confirmation) !==
      VOID_BUY_VOID_PREPARED_TRANSACTION_BROADCAST_CONFIRMATION_V1
  ) {
    return held(
      true,
      "confirmation",
      "broadcast_reconciliation_broadcast_confirmation_required",
    );
  }
  return null;
}

function eventOutcome(
  event: BuyVoidSagaBroadcastEvidenceEventV1,
): BuyVoidPreparedTransactionBroadcasterReadyV1 {
  const base = {
    ok: true as const,
    transaction_hash: event.transaction_hash,
    provider_submission_id: event.provider_submission_id,
  };
  if (event.outcome === "not_submitted") {
    return {
      ...base,
      status: "not_submitted",
      definitive_not_submitted: true,
      submission_call_performed: false,
      submission_may_have_occurred: false,
      receipt: null,
    };
  }
  if (event.outcome === "unknown") {
    return {
      ...base,
      status: "unknown",
      definitive_not_submitted: false,
      submission_call_performed: true,
      submission_may_have_occurred: true,
      receipt: null,
    };
  }
  if (event.outcome === "accepted") {
    return {
      ...base,
      status: "accepted",
      definitive_not_submitted: false,
      submission_call_performed: true,
      submission_may_have_occurred: true,
      receipt: null,
    };
  }
  return {
    ...base,
    status: event.outcome,
    definitive_not_submitted: false,
    submission_call_performed: true,
    submission_may_have_occurred: true,
    receipt: event.receipt!,
  };
}

async function runPipeline(
  deps: ReturnType<typeof dependencies>,
  command: Record<string, unknown>,
): Promise<BuyVoidPipelineCoordinatorDecisionV1> {
  return await Promise.resolve(
    deps.run_pipeline_command(command) as
      | BuyVoidPipelineCoordinatorDecisionV1
      | Promise<BuyVoidPipelineCoordinatorDecisionV1>,
  );
}

async function requirePipelineApplied(
  deps: ReturnType<typeof dependencies>,
  command: Record<string, unknown>,
): Promise<void> {
  const decision = await runPipeline(deps, command);
  if ("reason" in decision) {
    throw new Error(`pipeline_projection_held:${decision.reason}`);
  }
  if (decision.status !== "applied") {
    throw new Error("pipeline_projection_not_applied");
  }
}

async function persistProjections(
  reconstructed: ReconstructedV1,
  deps: ReturnType<typeof dependencies>,
  outcome: BuyVoidPreparedTransactionBroadcasterReadyV1,
  nowMs: number,
): Promise<void> {
  const attemptId = reconstructed.attempt.reservation.attempt_id;
  const transactionHash =
    reconstructed.attempt.prepared!.void_delivery_tx_hash;
  if (outcome.status === "not_submitted") return;

  let attempt = deps.read_attempt({
    root_dir: reconstructed.root_dir,
    attempt_id: attemptId,
  }) as BuyVoidExecutionAttemptStateV1 | null;
  let journal = deps.read_outcome({
    root_dir: reconstructed.root_dir,
    attempt_id: attemptId,
  });
  if (!attempt) throw new Error("projection_attempt_missing");

  if (outcome.status === "unknown") {
    if (!attempt.broadcast || journal?.status !== "broadcast_unknown") {
      await requirePipelineApplied(deps, {
        action: "record_broadcast_unknown",
        root_dir: reconstructed.root_dir,
        attempt_id: attemptId,
        transaction_hash: transactionHash,
        reason_code: "external_submission_unknown",
        provider_submission_id: outcome.provider_submission_id,
        apply: true,
        confirmation:
          VOID_BUY_VOID_PIPELINE_CONFIRMATIONS_V1
            .record_broadcast_unknown,
        now_ms: nowMs,
      });
    }
    return;
  }

  if (
    !attempt.broadcast ||
    !["broadcast_accepted", "confirmed", "reverted"].includes(
      journal?.status || "",
    )
  ) {
    await requirePipelineApplied(deps, {
      action: "record_broadcast_accepted",
      root_dir: reconstructed.root_dir,
      attempt_id: attemptId,
      transaction_hash: transactionHash,
      provider_submission_id: outcome.provider_submission_id,
      apply: true,
      confirmation:
        VOID_BUY_VOID_PIPELINE_CONFIRMATIONS_V1
          .record_broadcast_accepted,
      now_ms: nowMs,
    });
  }

  if (outcome.status === "accepted") return;
  const receipt = outcome.receipt;
  assertReceiptBinding(receipt, reconstructed);
  attempt = deps.read_attempt({
    root_dir: reconstructed.root_dir,
    attempt_id: attemptId,
  }) as BuyVoidExecutionAttemptStateV1 | null;
  journal = deps.read_outcome({
    root_dir: reconstructed.root_dir,
    attempt_id: attemptId,
  });
  if (!attempt) throw new Error("projection_attempt_missing_after_broadcast");

  if (outcome.status === "confirmed") {
    if (!attempt.confirmation || journal?.status !== "confirmed") {
      await requirePipelineApplied(deps, {
        action: "record_confirmed",
        root_dir: reconstructed.root_dir,
        attempt_id: attemptId,
        intent: reconstructed.intent,
        observation: {
          chain_id: "2050",
          transaction_hash: receipt.transaction_hash,
          transaction_status: "1",
          block_number: receipt.block_number,
          block_hash: receipt.block_hash,
          current_block_number: receipt.current_block_number,
          from_address: receipt.from_address,
          to_address: receipt.to_address,
          amount_units: receipt.amount_units,
        },
        confirmation_policy: {
          chain_id: "2050",
          min_confirmations:
            reconstructed.policy.receipt_policy.min_confirmations,
          fulfillment_wallet_allowlist:
            reconstructed.policy.receipt_policy
              .fulfillment_wallet_allowlist,
        },
        apply: true,
        confirmation:
          VOID_BUY_VOID_PIPELINE_CONFIRMATIONS_V1.record_confirmed,
        now_ms: nowMs,
      });
    }
    return;
  }

  if (!attempt.postbroadcast_failure || journal?.status !== "reverted") {
    await requirePipelineApplied(deps, {
      action: "record_reverted",
      root_dir: reconstructed.root_dir,
      attempt_id: attemptId,
      transaction_hash: receipt.transaction_hash,
      observation: {
        chain_id: "2050",
        transaction_status: "0",
        block_number: receipt.block_number,
        current_block_number: receipt.current_block_number,
      },
      outcome_policy: {
        outcome_journal_enabled: true,
        chain_id: "2050",
        min_revert_confirmations:
          reconstructed.policy.receipt_policy.min_confirmations,
      },
      apply: true,
      confirmation:
        VOID_BUY_VOID_PIPELINE_CONFIRMATIONS_V1.record_reverted,
      now_ms: nowMs,
    });
  }
}

function sagaActionResult(
  outcome: BuyVoidPreparedTransactionBroadcasterReadyV1,
  attemptId: string,
  transactionHash: string,
  executeAction: boolean,
): Record<string, unknown> {
  const providerHash = sha256(outcome.provider_submission_id);
  if (outcome.status === "not_submitted") {
    return {
      outcome: "broadcast_not_attempted",
      payload: {
        attempt_id: attemptId,
        transaction_hash: transactionHash,
        reason_code: "external_definitive_not_submitted",
        broadcast_call_performed: false,
      },
    };
  }
  if (outcome.status === "unknown") {
    return {
      outcome: "broadcast_unknown",
      payload: {
        attempt_id: attemptId,
        transaction_hash: transactionHash,
        reason_code: "external_submission_unknown",
        broadcast_call_performed: true,
        provider_submission_id_sha256: providerHash,
      },
    };
  }
  if (
    outcome.status === "accepted" ||
    (executeAction &&
      (outcome.status === "confirmed" || outcome.status === "reverted"))
  ) {
    return {
      outcome: "broadcast_accepted",
      payload: {
        attempt_id: attemptId,
        transaction_hash: transactionHash,
        reason_code: "external_submission_accepted",
        broadcast_call_performed: true,
        provider_submission_id_sha256: providerHash,
      },
    };
  }
  const receipt = outcome.receipt;
  const confirmations = Number(receipt.confirmation_count);
  if (
    !Number.isSafeInteger(confirmations) ||
    confirmations < 1 ||
    confirmations > 1_000_000
  ) {
    throw new Error("saga_receipt_confirmation_count_out_of_range");
  }
  return {
    outcome:
      outcome.status === "confirmed"
        ? "receipt_confirmed"
        : "receipt_reverted",
    payload: {
      attempt_id: attemptId,
      transaction_hash: transactionHash,
      block_number: receipt.block_number,
      block_hash: receipt.block_hash,
      confirmations,
      receipt_status: outcome.status === "confirmed" ? 1 : 0,
    },
  };
}

function evidenceDecision(
  reconstructed: ReconstructedV1,
  deps: ReturnType<typeof dependencies>,
  outcome: BuyVoidPreparedTransactionBroadcasterReadyV1,
  broadcastIntentId: string,
  nowMs: number,
) {
  return deps.record_evidence({
    root_dir: reconstructed.root_dir,
    saga_id: reconstructed.record.saga_id,
    attempt_id: reconstructed.attempt.reservation.attempt_id,
    broadcast_intent_id: broadcastIntentId,
    transaction_hash:
      reconstructed.attempt.prepared!.void_delivery_tx_hash,
    outcome,
    now_ms: nowMs,
  });
}

async function appendReconciledNotSubmitted(
  reconstructed: ReconstructedV1,
  input: RunBuyVoidSagaBroadcastReconciliationInputV1,
  outcome: BuyVoidPreparedTransactionBroadcasterReadyV1,
  nowMs: number,
): Promise<any> {
  const sagaId = reconstructed.record.saga_id;
  const owner = ownerId();
  const lease = reconstructed.store.acquireLease({
    saga_id: sagaId,
    owner_id: owner,
    now_ms: nowMs,
    ttl_ms: LEASE_TTL_MS,
  });
  if (!lease?.ok) {
    throw new Error(
      `reconciled_not_submitted_lease_held:${text(lease?.reason)}`,
    );
  }
  try {
    const current = reconstructed.store.recover(sagaId);
    if (!current) throw new Error("reconciled_not_submitted_saga_missing");
    if (current.state.state === "broadcast_not_attempted") return current;
    if (current.state.state !== "broadcast_intent_committed") {
      throw new Error("reconciled_not_submitted_state_changed");
    }
    if (
      text(input.saga_action_confirmation) !==
        reconstructed.saga.ACTION_CONFIRMATIONS
          .reconcile_possible_broadcast
    ) {
      throw new Error(
        "reconciled_not_submitted_action_confirmation_required",
      );
    }
    const result = sagaActionResult(
      outcome,
      current.state.attempt_id,
      current.state.transaction_hash,
      false,
    );
    const event = reconstructed.saga.buildSagaEventV1({
      binding: current.binding,
      sequence: current.state.event_count,
      previous_event_id: current.state.last_event_id,
      recorded_at_utc: new Date(nowMs).toISOString(),
      event_type: result.outcome,
      fencing_token: lease.lease.fencing_token,
      payload: result.payload,
    });
    return reconstructed.store.appendEvent({
      event,
      owner_id: owner,
      fencing_token: lease.lease.fencing_token,
      now_ms: nowMs,
    });
  } finally {
    reconstructed.store.releaseLease({
      saga_id: sagaId,
      owner_id: owner,
      fencing_token: lease.lease.fencing_token,
      now_ms: nowMs,
    });
  }
}

function finalSuccess(
  reconstructed: ReconstructedV1,
  deps: ReturnType<typeof dependencies>,
  action: ReconstructedV1["action"],
  externalStatus: BuyVoidPreparedTransactionBroadcasterReadyV1["status"],
  currentCall: CurrentCallV1,
): BuyVoidSagaBroadcastReconciliationDecisionV1 {
  const attemptId = reconstructed.attempt.reservation.attempt_id;
  const finalAttempt = deps.read_attempt({
    root_dir: reconstructed.root_dir,
    attempt_id: attemptId,
  }) as BuyVoidExecutionAttemptStateV1 | null;
  const finalEvidence = deps.read_evidence({
    root_dir: reconstructed.root_dir,
    attempt_id: attemptId,
  });
  const finalOutcome = deps.read_outcome({
    root_dir: reconstructed.root_dir,
    attempt_id: attemptId,
  });
  const finalSaga = reconstructed.store.recover(
    reconstructed.record.saga_id,
  );
  if (!finalAttempt || !finalEvidence || !finalSaga) {
    return held(
      true,
      "journal_reconstruction",
      "broadcast_reconciliation_final_state_missing",
      {
        mutation_performed: true,
        reconciliation_required: true,
        ...currentCall,
      },
    );
  }
  const sagaState = text(finalSaga.state?.state);
  const reconciliationRequired =
    externalStatus === "unknown" ||
    externalStatus === "accepted" ||
    (action === "execute_prepared_transaction" &&
      (externalStatus === "confirmed" || externalStatus === "reverted")) ||
    [
      "broadcast_intent_committed",
      "broadcast_unknown",
      "broadcast_accepted",
    ].includes(sagaState);
  return {
    ok: true,
    status: externalStatus,
    applied: true,
    mutation_performed: true,
    saga_id: reconstructed.record.saga_id,
    attempt_id: attemptId,
    action,
    evidence: finalEvidence,
    execution_attempt: finalAttempt,
    broadcast_outcome: finalOutcome,
    saga_state: finalSaga.state,
    broadcaster_called: currentCall.broadcaster_called,
    submission_call_performed:
      currentCall.submission_call_performed,
    transaction_broadcast_performed:
      currentCall.transaction_broadcast_performed,
    reconciliation_required: reconciliationRequired,
    automatic_retry_allowed: false,
    signed_payload_bytes_persisted: false,
    signed_payload_bytes_returned: false,
    money_movement_performed:
      currentCall.money_movement_performed,
  };
}

async function executePreparedTransaction(
  reconstructed: ReconstructedV1,
  input: RunBuyVoidSagaBroadcastReconciliationInputV1,
  deps: ReturnType<typeof dependencies>,
  nowMs: number,
): Promise<BuyVoidSagaBroadcastReconciliationDecisionV1> {
  const capture: ExecuteCaptureV1 = {
    outcome: null,
    evidence: null,
    broadcaster_called: false,
    submission_call_performed: false,
    transaction_broadcast_performed: false,
    money_movement_performed: false,
  };
  let result: any;
  try {
    result = await reconstructed.saga.runSagaSupervisorTickV1({
      store: reconstructed.store,
      binding: reconstructed.record.binding,
      owner_id: ownerId(),
      now_ms: nowMs,
      lease_ttl_ms: LEASE_TTL_MS,
      recorded_at_utc: new Date(nowMs).toISOString(),
      source_floor_main: SOURCE_FLOOR,
      policy_id: reconstructed.policy.economic_policy.saga_policy_id,
      apply: true,
      confirmation: input.saga_confirmation,
      action_confirmation: input.saga_action_confirmation,
      adapters: {
        execute_prepared_transaction: async (adapterInput: any) => {
          await deps.fault_inject?.(
            "after_broadcast_intent_before_submit",
          );
          if (!deps.broadcaster) {
            throw new Error("prepared_broadcaster_dependency_required");
          }
          capture.broadcaster_called = true;
          const submission =
            await submitBuyVoidPreparedTransactionFromCustodyV1({
              saga_id: reconstructed.record.saga_id,
              broadcast_intent_id:
                text(adapterInput?.broadcast_intent_id),
              custody: reconstructed.custody,
              broadcaster: deps.broadcaster,
              apply: true,
              confirmation: input.broadcast_confirmation,
            });
          capture.submission_call_performed =
            submission.submission_call_performed === true;
          capture.transaction_broadcast_performed =
            submission.transaction_broadcast_performed === true;
          capture.money_movement_performed =
            submission.money_movement_performed === true;
          if ("reason" in submission) {
            throw new Error(`external_submit_held:${submission.reason}`);
          }
          if (!submission.outcome) {
            throw new Error("external_submit_outcome_missing");
          }
          capture.outcome = submission.outcome;
          await deps.fault_inject?.(
            "after_external_outcome_before_evidence",
          );
          const evidence = evidenceDecision(
            reconstructed,
            deps,
            submission.outcome,
            text(adapterInput?.broadcast_intent_id),
            nowMs,
          );
          if ("reason" in evidence) {
            throw new Error(
              `broadcast_evidence_held:${evidence.reason}`,
            );
          }
          capture.evidence = evidence.state;
          await deps.fault_inject?.(
            "after_evidence_before_projection",
          );
          await persistProjections(
            reconstructed,
            deps,
            submission.outcome,
            nowMs,
          );
          await deps.fault_inject?.(
            "after_projection_before_saga",
          );
          return sagaActionResult(
            submission.outcome,
            reconstructed.attempt.reservation.attempt_id,
            reconstructed.attempt.prepared!.void_delivery_tx_hash,
            true,
          );
        },
      },
    });
  } catch (error) {
    return held(
      true,
      capture.outcome ? "saga_append" : "external_submission",
      text((error as Error)?.message || error).slice(0, 240),
      {
        mutation_performed:
          Boolean(capture.evidence) ||
          capture.submission_call_performed,
        reconciliation_required:
          capture.submission_call_performed ||
          Boolean(capture.evidence),
        ...capture,
      },
    );
  }
  if (!result || result.ok !== true || result.status !== "applied") {
    return held(
      true,
      capture.outcome ? "saga_append" : "external_submission",
      `broadcast_saga_supervisor_held:${text(result?.reason || result?.status)}`,
      {
        mutation_performed:
          Boolean(capture.evidence) ||
          capture.submission_call_performed,
        reconciliation_required:
          capture.submission_call_performed ||
          Boolean(capture.evidence),
        ...capture,
      },
    );
  }
  if (!capture.outcome || !capture.evidence) {
    return held(
      true,
      "saga_append",
      "broadcast_execute_capture_missing",
      {
        mutation_performed: true,
        reconciliation_required: true,
        ...capture,
      },
    );
  }
  return finalSuccess(
    reconstructed,
    deps,
    "execute_prepared_transaction",
    capture.outcome.status,
    capture,
  );
}

async function reconcilePossibleBroadcast(
  reconstructed: ReconstructedV1,
  input: RunBuyVoidSagaBroadcastReconciliationInputV1,
  deps: ReturnType<typeof dependencies>,
  nowMs: number,
): Promise<BuyVoidSagaBroadcastReconciliationDecisionV1> {
  const currentCall: CurrentCallV1 = {
    broadcaster_called: false,
    submission_call_performed: false,
    transaction_broadcast_performed: false,
    money_movement_performed: false,
  };
  let outcome: BuyVoidPreparedTransactionBroadcasterReadyV1;
  const durable = reconstructed.evidence?.latest;
  if (
    durable &&
    ["not_submitted", "confirmed", "reverted"].includes(
      durable.outcome,
    )
  ) {
    outcome = eventOutcome(durable);
  } else if (deps.broadcaster) {
    currentCall.broadcaster_called = true;
    const inspection =
      await inspectBuyVoidPreparedTransactionSubmissionV1({
        saga_id: reconstructed.record.saga_id,
        broadcast_intent_id:
          text(reconstructed.record.state.broadcast_intent_id),
        custody: reconstructed.custody,
        broadcaster: deps.broadcaster,
      });
    if ("reason" in inspection) {
      return held(
        true,
        "external_inspection",
        inspection.reason,
        {
          detail: inspection.detail,
          reconciliation_required: true,
          ...currentCall,
        },
      );
    }
    if (!inspection.outcome) {
      return held(
        true,
        "external_inspection",
        "external_inspection_outcome_missing",
        {
          reconciliation_required: true,
          ...currentCall,
        },
      );
    }
    outcome = inspection.outcome;
  } else if (durable) {
    outcome = eventOutcome(durable);
  } else {
    return held(
      true,
      "external_inspection",
      "prepared_broadcaster_dependency_required",
      { reconciliation_required: true },
    );
  }

  await deps.fault_inject?.(
    "after_external_outcome_before_evidence",
  );
  const evidence = evidenceDecision(
    reconstructed,
    deps,
    outcome,
    text(reconstructed.record.state.broadcast_intent_id),
    nowMs,
  );
  if ("reason" in evidence) {
    return held(
      true,
      "evidence_persistence",
      evidence.reason,
      {
        detail: evidence.detail,
        reconciliation_required: true,
        ...currentCall,
      },
    );
  }
  try {
    await deps.fault_inject?.(
      "after_evidence_before_projection",
    );
    await persistProjections(
      reconstructed,
      deps,
      outcome,
      nowMs,
    );
    await deps.fault_inject?.(
      "after_projection_before_saga",
    );
  } catch (error) {
    return held(
      true,
      "projection_persistence",
      text((error as Error)?.message || error).slice(0, 240),
      {
        mutation_performed: evidence.mutation_performed,
        reconciliation_required: true,
        ...currentCall,
      },
    );
  }

  if (outcome.status === "unknown") {
    return held(
      true,
      "saga_append",
      "broadcast_reconciliation_still_unknown",
      {
        mutation_performed: evidence.mutation_performed,
        reconciliation_required: true,
        ...currentCall,
      },
    );
  }
  if (
    outcome.status === "accepted" &&
    reconstructed.record.state.state === "broadcast_accepted"
  ) {
    return held(
      true,
      "saga_append",
      "broadcast_reconciliation_receipt_pending",
      {
        mutation_performed: evidence.mutation_performed,
        reconciliation_required: true,
        ...currentCall,
      },
    );
  }

  try {
    if (outcome.status === "not_submitted") {
      await appendReconciledNotSubmitted(
        reconstructed,
        input,
        outcome,
        nowMs,
      );
    } else {
      const result =
        await reconstructed.saga.runSagaSupervisorTickV1({
          store: reconstructed.store,
          binding: reconstructed.record.binding,
          owner_id: ownerId(),
          now_ms: nowMs,
          lease_ttl_ms: LEASE_TTL_MS,
          recorded_at_utc: new Date(nowMs).toISOString(),
          source_floor_main: SOURCE_FLOOR,
          policy_id:
            reconstructed.policy.economic_policy.saga_policy_id,
          apply: true,
          confirmation: input.saga_confirmation,
          action_confirmation: input.saga_action_confirmation,
          adapters: {
            reconcile_possible_broadcast: async () =>
              sagaActionResult(
                outcome,
                reconstructed.attempt.reservation.attempt_id,
                reconstructed.attempt.prepared!
                  .void_delivery_tx_hash,
                false,
              ),
          },
        });
      if (!result || result.ok !== true || result.status !== "applied") {
        throw new Error(
          `broadcast_saga_supervisor_held:${text(result?.reason || result?.status)}`,
        );
      }
    }
  } catch (error) {
    return held(
      true,
      "saga_append",
      text((error as Error)?.message || error).slice(0, 240),
      {
        mutation_performed: true,
        reconciliation_required: true,
        ...currentCall,
      },
    );
  }
  return finalSuccess(
    reconstructed,
    deps,
    "reconcile_possible_broadcast",
    outcome.status,
    currentCall,
  );
}

export async function runBuyVoidSagaBroadcastReconciliationV1(
  input: RunBuyVoidSagaBroadcastReconciliationInputV1,
): Promise<BuyVoidSagaBroadcastReconciliationDecisionV1> {
  const deps = dependencies(input?.dependencies);
  const reconstructed = await reconstruct(input, deps);
  if ("reason" in reconstructed) return reconstructed;

  if (input.apply !== true) {
    return {
      ok: true,
      status: "dry_run",
      applied: false,
      mutation_performed: false,
      saga_id: reconstructed.record.saga_id,
      attempt_id: reconstructed.attempt.reservation.attempt_id,
      next_action: reconstructed.action,
      required_confirmation:
        VOID_BUY_VOID_SAGA_BROADCAST_RECONCILIATION_CONFIRMATION_V1,
      required_policy_fingerprint_sha256:
        reconstructed.policy.combined_policy_fingerprint_sha256,
      required_saga_confirmation:
        reconstructed.saga.ADVANCE_CONFIRMATION,
      required_saga_action_confirmation:
        reconstructed.saga.ACTION_CONFIRMATIONS[reconstructed.action],
      required_broadcast_confirmation:
        reconstructed.action === "execute_prepared_transaction"
          ? VOID_BUY_VOID_PREPARED_TRANSACTION_BROADCAST_CONFIRMATION_V1
          : null,
      existing_evidence: reconstructed.evidence,
      existing_outcome: reconstructed.outcome,
      policy_public_summary: reconstructed.policy.public_summary,
      broadcaster_called: false,
      submission_call_performed: false,
      transaction_broadcast_performed: false,
      reconciliation_required:
        reconstructed.action === "reconcile_possible_broadcast",
      automatic_retry_allowed: false,
      signed_payload_bytes_persisted: false,
      signed_payload_bytes_returned: false,
      money_movement_performed: false,
    };
  }

  const confirmationHold = exactConfirmations(
    input,
    reconstructed,
  );
  if (confirmationHold) return confirmationHold;
  const nowMs = deps.now_ms();
  if (!Number.isSafeInteger(nowMs) || nowMs <= 0) {
    return held(
      true,
      "input",
      "broadcast_reconciliation_server_clock_invalid",
    );
  }

  if (reconstructed.action === "execute_prepared_transaction") {
    return executePreparedTransaction(
      reconstructed,
      input,
      deps,
      nowMs,
    );
  }
  return reconcilePossibleBroadcast(
    reconstructed,
    input,
    deps,
    nowMs,
  );
}
