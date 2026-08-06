import path from "node:path";
import {
  listBuyVoidExecutionAttemptsV1,
} from "./buy_void_execution_attempt_journal_v1.js";
import {
  listBuyVoidInventoryReservationsV1,
} from "./buy_void_inventory_reservation_journal_v1.js";
import {
  planBuyVoidConfirmedCloseoutV1,
  type BuyVoidConfirmedCloseoutSnapshotV1,
} from "./buy_void_confirmed_closeout_v1.js";
import {
  resolveBuyVoidConfirmedStatesByRequestV1,
} from "./buy_void_confirmed_state_request_resolution_v1.js";
import type { BuyVoidConfirmedStateV1 } from "./buy_void_confirmed_state_journal_v1.js";
import {
  readTerminalCloseoutPlanV1,
  readTerminalDirectJsonLinesV1,
  readTerminalDirectJsonV1,
  terminalEffectiveStatusV1,
} from "./buy_void_saga_terminal_closeout_artifacts_v1.js";
import {
  TERMINAL_CLOSEOUT_SAFE_ID,
  TERMINAL_CLOSEOUT_SAGA_ID,
  TERMINAL_CLOSEOUT_SHA256,
  VOID_BUY_VOID_SAGA_TERMINAL_CLOSEOUT_V1,
  terminalAddress,
  terminalFingerprint,
  terminalHash,
  terminalText,
  type BuyVoidSagaTerminalCloseoutDependenciesV1,
  type BuyVoidSagaTerminalCloseoutPlanV1,
  type ReconstructedTerminalCloseoutV1,
  type SagaModuleV1,
  type SagaStoreV1,
} from "./buy_void_saga_terminal_closeout_model_v1.js";
import type { BuyVoidSagaTerminalCloseoutServerPolicyV1 } from "./buy_void_saga_terminal_closeout_server_policy_v1.js";

function validateConfirmedState(
  state: BuyVoidConfirmedStateV1,
  sagaRecord: any,
  attempt: any,
): void {
  const sagaState = sagaRecord.state;
  const binding = sagaRecord.binding;
  const confirmed = attempt.confirmation?.confirmed_record;
  if (
    !state ||
    state.schema !== "void_buy_void_confirmed_state_v1" ||
    state.marker !== "VOID_BUY_VOID_CONFIRMED_STATE_JOURNAL_V1" ||
    !TERMINAL_CLOSEOUT_SHA256.test(terminalText(state.state_id)) ||
    !TERMINAL_CLOSEOUT_SHA256.test(
      terminalText(state.projection_fingerprint),
    ) ||
    !confirmed ||
    state.request_id !== binding.request_id ||
    state.canonical_payment_identity !== binding.canonical_payment_identity ||
    state.confirmation?.request_id !== binding.request_id ||
    state.confirmation?.canonical_payment_identity !==
      binding.canonical_payment_identity ||
    state.confirmation?.instruction_id !== confirmed.instruction_id ||
    terminalHash(state.confirmation?.void_delivery_tx_hash) !==
      terminalHash(sagaState.transaction_hash) ||
    terminalHash(state.fulfillment_receipt?.void_delivery_tx_hash) !==
      terminalHash(sagaState.transaction_hash) ||
    terminalHash(state.buyer_status?.void_delivery_tx_hash) !==
      terminalHash(sagaState.transaction_hash) ||
    terminalAddress(state.confirmation?.delivery_address) !==
      terminalAddress(binding.delivery_address) ||
    terminalAddress(state.fulfillment_receipt?.delivery_address) !==
      terminalAddress(binding.delivery_address) ||
    terminalAddress(state.buyer_status?.delivery_address) !==
      terminalAddress(binding.delivery_address) ||
    terminalText(state.confirmation?.void_amount_units) !==
      terminalText(binding.void_amount_units) ||
    terminalText(state.fulfillment_receipt?.void_amount_units) !==
      terminalText(binding.void_amount_units) ||
    state.confirmation?.status !== "fulfilled_confirmed" ||
    state.confirmation?.buyer_fulfilled !== true ||
    state.confirmation?.automatic_fulfillment_completed !== true ||
    state.confirmation?.payment_claim_persisted !== true ||
    state.confirmation?.delivery_confirmation_observed !== true ||
    state.buyer_status?.buyer_fulfilled !== true ||
    state.allocation_status?.allocation_fulfilled !== true ||
    state.fulfillment_receipt?.status !== "confirmed"
  ) {
    throw new Error("terminal_closeout_canonical_confirmed_state_mismatch");
  }
}

function buildPlan(input: {
  saga_record: any;
  policy: BuyVoidSagaTerminalCloseoutServerPolicyV1;
  confirmed_state: BuyVoidConfirmedStateV1;
  base_plan: any;
}): BuyVoidSagaTerminalCloseoutPlanV1 {
  const sagaId = terminalText(input.saga_record.saga_id);
  const base = input.base_plan;
  const stateId = terminalText(input.confirmed_state.state_id);
  const stateFingerprint = terminalText(
    input.confirmed_state.projection_fingerprint,
  );
  const inventoryFingerprint = terminalFingerprint({
    schema: "void_buy_void_saga_terminal_inventory_consumption_v1",
    saga_id: sagaId,
    attempt_id: base.attempt_id,
    reservation_id: base.reservation_id,
    transaction_hash: base.void_delivery_tx_hash,
    canonical_confirmed_state_id: stateId,
    canonical_confirmed_state_fingerprint: stateFingerprint,
    inventory_consumption_id: base.inventory_consumption.consumption_id,
    inventory_consumption_fingerprint_sha256:
      base.inventory_consumption.consumption_fingerprint_sha256,
  });
  const closeoutId = terminalFingerprint({
    schema: "void_buy_void_saga_terminal_closeout_id_v1",
    saga_id: sagaId,
    attempt_id: base.attempt_id,
    reservation_id: base.reservation_id,
    transaction_hash: base.void_delivery_tx_hash,
    canonical_confirmed_state_id: stateId,
    canonical_confirmed_state_fingerprint: stateFingerprint,
    inventory_terminal_fingerprint_sha256: inventoryFingerprint,
    server_policy_fingerprint_sha256: input.policy.fingerprint_sha256,
  });
  const inventory = {
    ...base.inventory_consumption,
    terminal_closeout_schema:
      "void_buy_void_saga_terminal_inventory_consumption_v1" as const,
    terminal_closeout_marker: VOID_BUY_VOID_SAGA_TERMINAL_CLOSEOUT_V1,
    terminal_closeout_version: 1 as const,
    saga_id: sagaId,
    closeout_id: closeoutId,
    canonical_confirmed_state_id: stateId,
    canonical_confirmed_state_fingerprint: stateFingerprint,
    canonical_confirmed_state_completion_final: true as const,
    terminal_closeout_fingerprint_sha256: inventoryFingerprint,
  };
  const publicBase = {
    ...base.public_closeout_event,
    terminal_closeout_schema:
      "void_buy_void_saga_terminal_closeout_event_v1" as const,
    terminal_closeout_marker: VOID_BUY_VOID_SAGA_TERMINAL_CLOSEOUT_V1,
    terminal_closeout_version: 1 as const,
    saga_id: sagaId,
    closeout_id: closeoutId,
    canonical_confirmed_state_id: stateId,
    canonical_confirmed_state_fingerprint: stateFingerprint,
    canonical_confirmed_state_completion_final: true as const,
    inventory_consumption_terminal_fingerprint_sha256: inventoryFingerprint,
  };
  const publicEvent = {
    ...publicBase,
    public_event_fingerprint_sha256: terminalFingerprint(publicBase),
  };
  const withoutFingerprint = {
    schema: "void_buy_void_saga_terminal_closeout_plan_v1" as const,
    marker: VOID_BUY_VOID_SAGA_TERMINAL_CLOSEOUT_V1,
    version: 1 as const,
    closeout_id: closeoutId,
    saga_id: sagaId,
    request_id: base.request_id,
    attempt_id: base.attempt_id,
    reservation_id: base.reservation_id,
    transaction_hash: terminalHash(input.saga_record.state.transaction_hash),
    canonical_confirmed_state_id: stateId,
    canonical_confirmed_state_fingerprint: stateFingerprint,
    server_policy_fingerprint_sha256: input.policy.fingerprint_sha256,
    inventory_consumption: inventory,
    public_closeout_event: publicEvent,
    base_closeout_plan: base,
    inventory_decrement_required: true as const,
    public_request_fulfilled_required: true as const,
    public_request_base_record_mutation_authorized: false as const,
    reservation_base_record_mutation_authorized: false as const,
    credential_access_authorized: false as const,
    wallet_access_authorized: false as const,
    signing_authorized: false as const,
    transaction_broadcast_authorized: false as const,
    money_movement_authorized: false as const,
  };
  return {
    ...withoutFingerprint,
    plan_fingerprint_sha256: terminalFingerprint(withoutFingerprint),
  };
}

export function reconstructTerminalCloseoutV1(input: {
  root_dir: string;
  saga_module: SagaModuleV1;
  saga_store: SagaStoreV1;
  saga_record: any;
  policy: BuyVoidSagaTerminalCloseoutServerPolicyV1;
  dependencies: BuyVoidSagaTerminalCloseoutDependenciesV1;
}): ReconstructedTerminalCloseoutV1 {
  const record = input.saga_record;
  const state = record?.state;
  const binding = record?.binding;
  if (
    !record ||
    !state ||
    !binding ||
    !TERMINAL_CLOSEOUT_SAGA_ID.test(terminalText(record.saga_id)) ||
    state.state !== "receipt_confirmed" ||
    state.receipt_status !== 1 ||
    !TERMINAL_CLOSEOUT_SHA256.test(terminalText(state.attempt_id)) ||
    !TERMINAL_CLOSEOUT_SHA256.test(terminalText(state.reservation_id)) ||
    !terminalHash(state.transaction_hash)
  ) {
    throw new Error("terminal_closeout_saga_not_receipt_confirmed");
  }
  const next = input.saga_module.deriveSagaNextActionV1(state);
  if (next.terminal || next.action !== "closeout_confirmed_delivery") {
    throw new Error("terminal_closeout_saga_action_mismatch");
  }

  const attempts = (
    input.dependencies.list_attempts || listBuyVoidExecutionAttemptsV1
  )(input.root_dir).filter(
    (attempt) =>
      terminalText(attempt?.reservation?.attempt_id).toLowerCase() ===
      terminalText(state.attempt_id).toLowerCase(),
  );
  if (attempts.length !== 1) {
    throw new Error("terminal_closeout_execution_attempt_ambiguous");
  }
  const attempt = attempts[0];
  if (
    attempt.status !== "confirmed" ||
    !attempt.confirmation?.confirmed_record ||
    terminalHash(attempt.confirmation.confirmed_record.void_delivery_tx_hash) !==
      terminalHash(state.transaction_hash)
  ) {
    throw new Error("terminal_closeout_execution_attempt_not_confirmed");
  }

  const states = (
    input.dependencies.resolve_confirmed_states ||
    resolveBuyVoidConfirmedStatesByRequestV1
  )(input.root_dir, terminalText(binding.request_id));
  if (states.length !== 1) {
    throw new Error("terminal_closeout_canonical_confirmed_state_ambiguous");
  }
  const confirmedState = states[0];
  validateConfirmedState(confirmedState, record, attempt);

  const inventory = (
    input.dependencies.list_inventory || listBuyVoidInventoryReservationsV1
  )({ root_dir: input.root_dir, pool_id: input.policy.pool_id }).filter(
    (reservation) =>
      terminalText(reservation.reservation_id).toLowerCase() ===
        terminalText(state.reservation_id).toLowerCase() &&
      terminalText(reservation.request_id) === terminalText(binding.request_id) &&
      terminalText(reservation.instruction_id) ===
        terminalText(attempt.confirmation.confirmed_record.instruction_id) &&
      terminalAddress(reservation.delivery_address) ===
        terminalAddress(binding.delivery_address) &&
      terminalText(reservation.reserved_void_units) ===
        terminalText(binding.void_amount_units),
  );
  if (inventory.length !== 1) {
    throw new Error("terminal_closeout_inventory_reservation_ambiguous");
  }

  const requestId = terminalText(binding.request_id);
  if (!TERMINAL_CLOSEOUT_SAFE_ID.test(requestId)) {
    throw new Error("terminal_closeout_request_id_invalid");
  }
  const request = readTerminalDirectJsonV1(
    path.join(input.policy.request_dir, `${requestId}.json`),
    "terminal_closeout_public_request",
  );
  if (!request || terminalText(request.request_id) !== requestId) {
    throw new Error("terminal_closeout_public_request_missing");
  }
  const events = readTerminalDirectJsonLinesV1(
    path.join(input.policy.request_dir, "operator-events.jsonl"),
    "terminal_closeout_operator_events",
  );
  const effectiveStatus = terminalEffectiveStatusV1(request, events);
  const fulfilled = events.filter(
    (event) =>
      terminalText(event.request_id) === requestId &&
      terminalText(event.operator_status).toLowerCase() === "fulfilled",
  );
  if (
    fulfilled.some(
      (event) =>
        terminalHash(event.void_delivery_tx_hash) !==
        terminalHash(state.transaction_hash),
    )
  ) {
    throw new Error("terminal_closeout_existing_fulfillment_conflict");
  }
  const existingFulfilled = fulfilled.find(
    (event) =>
      terminalHash(event.void_delivery_tx_hash) ===
      terminalHash(state.transaction_hash),
  ) || null;

  const existingPlan = readTerminalCloseoutPlanV1({
    root_dir: input.root_dir,
    attempt_id: terminalText(state.attempt_id),
    expected: {
      saga_id: terminalText(record.saga_id),
      reservation_id: terminalText(state.reservation_id),
      transaction_hash: terminalHash(state.transaction_hash),
      canonical_confirmed_state_id: terminalText(confirmedState.state_id),
      canonical_confirmed_state_fingerprint:
        terminalText(confirmedState.projection_fingerprint),
      server_policy_fingerprint_sha256: input.policy.fingerprint_sha256,
    },
  });

  let plan: BuyVoidSagaTerminalCloseoutPlanV1;
  if (existingPlan) {
    plan = existingPlan;
  } else {
    const snapshot: BuyVoidConfirmedCloseoutSnapshotV1 = {
      attempt,
      inventory_reservation: inventory[0],
      request,
      operator_events: events,
      effective_status: effectiveStatus,
      existing_fulfilled_event: existingFulfilled,
    };
    const planned = (
      input.dependencies.plan_closeout || planBuyVoidConfirmedCloseoutV1
    )({
      policy: {
        enabled: true,
        pool_id: input.policy.pool_id,
        request_dir: input.policy.request_dir,
      },
      snapshot,
    });
    if (planned.ok !== true) {
      throw new Error(
        `terminal_closeout_plan_held:${terminalText(planned.reason) || "unknown"}`,
      );
    }
    plan = buildPlan({
      saga_record: record,
      policy: input.policy,
      confirmed_state: confirmedState,
      base_plan: planned.plan,
    });
  }

  return {
    root_dir: input.root_dir,
    saga_module: input.saga_module,
    saga_store: input.saga_store,
    saga_record: record,
    policy: input.policy,
    attempt,
    confirmed_state: confirmedState,
    inventory_reservation: inventory[0],
    request,
    operator_events: events,
    effective_status: effectiveStatus,
    existing_fulfilled_event: existingFulfilled,
    plan,
  };
}
