import path from "node:path";

import {
  readBuyVoidPaymentKeyedReceiptEvidenceV1,
  type BuyVoidPaymentKeyedReceiptEvidenceV1,
} from "./buy_void_payment_keyed_receipt_evidence_v1.js";
import {
  resolveBuyVoidConfirmedStatesByRequestV1,
} from "./buy_void_confirmed_state_request_resolution_v1.js";
import type {
  BuyVoidConfirmedStateV1,
} from "./buy_void_confirmed_state_journal_v1.js";
import {
  runBuyVoidSagaTerminalCloseoutV1,
  type BuyVoidSagaTerminalCloseoutDecisionV1,
  type BuyVoidSagaTerminalCloseoutDependenciesV1,
  type BuyVoidSagaTerminalCloseoutPlanV1,
} from "./buy_void_saga_terminal_closeout_v1.js";

export const VOID_BUY_VOID_PAYMENT_KEYED_TERMINAL_CLOSEOUT_V1 =
  "VOID_BUY_VOID_PAYMENT_KEYED_TERMINAL_CLOSEOUT_V1";

export const VOID_BUY_VOID_PAYMENT_KEYED_TERMINAL_CLOSEOUT_CONFIRMATION_V1 =
  "buyVoidClosePaymentKeyedFulfillmentV1";

export const VOID_BUY_VOID_PAYMENT_KEYED_TERMINAL_CLOSEOUT_AUTHORITY_V1 = {
  source_only_contract: true,
  runtime_route_mount: false,
  canonical_parent_dispatch: false,
  exact_saga_selector: true,
  existing_terminal_closeout_reused: true,
  payment_keyed_confirmed_receipt_evidence_required: true,
  exact_receipt_policy_fingerprint_required: true,
  canonical_confirmed_state_required: true,
  exact_receipt_evidence_confirmed_state_binding: true,
  exact_terminal_plan_binding_required: true,
  terminal_closeout_plan_revalidated_by_existing_engine: true,
  request_scoped_closeout_lock_reused: true,
  append_only_inventory_consumption_reused: true,
  append_only_public_fulfilled_event_reused: true,
  saga_closeout_committed_reused: true,
  public_request_base_record_mutation: false,
  reservation_base_record_mutation: false,
  credential_access: false,
  wallet_access: false,
  signing: false,
  transaction_broadcast: false,
  automatic_retry: false,
  money_movement: false,
} as const;

const SAGA_ID = /^voidbvfsg1_[0-9a-f]{64}$/;
const SHA256 = /^[0-9a-f]{64}$/;
const HASH = /^0x[0-9a-f]{64}$/;
const ADDRESS = /^0x[0-9a-f]{40}$/;

export type BuyVoidPaymentKeyedTerminalCloseoutDependenciesV1 = {
  read_receipt_evidence?:
    typeof readBuyVoidPaymentKeyedReceiptEvidenceV1;
  resolve_confirmed_states?:
    typeof resolveBuyVoidConfirmedStatesByRequestV1;
  run_terminal_closeout?: typeof runBuyVoidSagaTerminalCloseoutV1;
  terminal_closeout_dependencies?: BuyVoidSagaTerminalCloseoutDependenciesV1;
};

export type BuyVoidPaymentKeyedTerminalCloseoutInputV1 = {
  root_dir: string;
  saga_id: string;
  apply?: boolean;
  confirmation?: unknown;
  receipt_policy_fingerprint_sha256?: unknown;
  dependencies?: BuyVoidPaymentKeyedTerminalCloseoutDependenciesV1;
};

export type BuyVoidPaymentKeyedTerminalCloseoutDecisionV1 =
  | {
      ok: true;
      status: "dry_run";
      applied: false;
      marker: typeof VOID_BUY_VOID_PAYMENT_KEYED_TERMINAL_CLOSEOUT_V1;
      version: 1;
      saga_id: string;
      attempt_id: string;
      closeout_id: string;
      plan: BuyVoidSagaTerminalCloseoutPlanV1;
      receipt_evidence: BuyVoidPaymentKeyedReceiptEvidenceV1;
      confirmed_state: BuyVoidConfirmedStateV1;
      required_confirmation:
        typeof VOID_BUY_VOID_PAYMENT_KEYED_TERMINAL_CLOSEOUT_CONFIRMATION_V1;
      required_receipt_policy_fingerprint_sha256: string;
      required_terminal_plan_fingerprint_sha256: string;
      inventory_consumption_performed: false;
      public_request_fulfilled: false;
      saga_closeout_appended: false;
      credential_access_performed: false;
      wallet_access_performed: false;
      signing_performed: false;
      transaction_broadcast_performed: false;
      automatic_retry_allowed: false;
      money_movement_performed: false;
    }
  | {
      ok: true;
      status: "closed" | "duplicate" | "recovered_partial";
      applied: true;
      marker: typeof VOID_BUY_VOID_PAYMENT_KEYED_TERMINAL_CLOSEOUT_V1;
      version: 1;
      saga_id: string;
      attempt_id: string;
      closeout_id: string;
      plan: BuyVoidSagaTerminalCloseoutPlanV1;
      receipt_evidence: BuyVoidPaymentKeyedReceiptEvidenceV1;
      confirmed_state: BuyVoidConfirmedStateV1;
      terminal_closeout: Extract<
        BuyVoidSagaTerminalCloseoutDecisionV1,
        { ok: true; status: "closed" | "duplicate" | "recovered_partial" }
      >;
      inventory_consumption_performed: boolean;
      public_request_fulfilled: true;
      saga_closeout_appended: boolean;
      credential_access_performed: false;
      wallet_access_performed: false;
      signing_performed: false;
      transaction_broadcast_performed: false;
      automatic_retry_allowed: false;
      money_movement_performed: false;
    }
  | {
      ok: false;
      status: "held";
      applied: boolean;
      marker: typeof VOID_BUY_VOID_PAYMENT_KEYED_TERMINAL_CLOSEOUT_V1;
      version: 1;
      stage:
        | "input"
        | "terminal_closeout_dry_run"
        | "receipt_evidence"
        | "confirmed_state"
        | "confirmation"
        | "terminal_closeout_apply"
        | "terminal_closeout_result";
      reason: string;
      mutation_performed: boolean;
      inventory_consumption_performed: boolean;
      public_request_fulfilled: boolean;
      saga_closeout_appended: boolean;
      credential_access_performed: false;
      wallet_access_performed: false;
      signing_performed: false;
      transaction_broadcast_performed: false;
      automatic_retry_allowed: false;
      money_movement_performed: false;
      detail?: Record<string, unknown>;
    };

function text(value: unknown): string {
  return typeof value === "string"
    ? value.trim()
    : String(value ?? "").trim();
}

function normalizeHash(value: unknown): string {
  const raw = text(value).toLowerCase();
  return HASH.test(raw) ? raw : "";
}

function normalizeAddress(value: unknown): string {
  const raw = text(value).toLowerCase();
  return ADDRESS.test(raw) ? raw : "";
}

function safeRoot(value: unknown): string {
  const raw = text(value);
  if (!raw || raw.includes("\0") || !path.isAbsolute(raw)) {
    return "";
  }
  const resolved = path.resolve(raw);
  return resolved === path.parse(resolved).root ? "" : resolved;
}

function held(
  applied: boolean,
  stage: Extract<
    BuyVoidPaymentKeyedTerminalCloseoutDecisionV1,
    { ok: false }
  >["stage"],
  reason: string,
  options: {
    mutation_performed?: boolean;
    inventory_consumption_performed?: boolean;
    public_request_fulfilled?: boolean;
    saga_closeout_appended?: boolean;
    detail?: Record<string, unknown>;
  } = {},
): Extract<
  BuyVoidPaymentKeyedTerminalCloseoutDecisionV1,
  { ok: false }
> {
  return {
    ok: false,
    status: "held",
    applied,
    marker: VOID_BUY_VOID_PAYMENT_KEYED_TERMINAL_CLOSEOUT_V1,
    version: 1,
    stage,
    reason,
    mutation_performed: options.mutation_performed === true,
    inventory_consumption_performed:
      options.inventory_consumption_performed === true,
    public_request_fulfilled:
      options.public_request_fulfilled === true,
    saga_closeout_appended:
      options.saga_closeout_appended === true,
    credential_access_performed: false,
    wallet_access_performed: false,
    signing_performed: false,
    transaction_broadcast_performed: false,
    automatic_retry_allowed: false,
    money_movement_performed: false,
    ...(options.detail ? { detail: options.detail } : {}),
  };
}

function planFrom(
  decision: BuyVoidSagaTerminalCloseoutDecisionV1,
): BuyVoidSagaTerminalCloseoutPlanV1 | null {
  if (decision.ok !== true) return null;
  return decision.plan || null;
}

function exactConfirmedState(
  states: BuyVoidConfirmedStateV1[],
  plan: BuyVoidSagaTerminalCloseoutPlanV1,
): BuyVoidConfirmedStateV1 {
  const matches = states.filter(
    (state) =>
      state.state_id === plan.canonical_confirmed_state_id &&
      state.projection_fingerprint ===
        plan.canonical_confirmed_state_fingerprint &&
      state.request_id === plan.request_id &&
      normalizeHash(
        state.confirmation?.void_delivery_tx_hash,
      ) === normalizeHash(plan.transaction_hash),
  );
  if (matches.length !== 1) {
    throw new Error(
      "payment_keyed_terminal_closeout_confirmed_state_count_invalid:" +
        String(matches.length),
    );
  }
  return matches[0];
}

function validateReceiptEvidenceBinding(input: {
  evidence: BuyVoidPaymentKeyedReceiptEvidenceV1;
  plan: BuyVoidSagaTerminalCloseoutPlanV1;
  confirmed_state: BuyVoidConfirmedStateV1;
  saga_id: string;
}): void {
  const evidence = input.evidence;
  const plan = input.plan;
  const state = input.confirmed_state;
  const confirmation = state.confirmation;
  const receipt = state.fulfillment_receipt;
  const inventory = plan.base_closeout_plan.inventory_consumption;
  const publicEvent = plan.base_closeout_plan.public_closeout_event;

  if (
    evidence.outcome !== "confirmed" ||
    evidence.saga_id !== input.saga_id ||
    evidence.attempt_id !== plan.attempt_id ||
    normalizeHash(evidence.transaction_hash) !==
      normalizeHash(plan.transaction_hash) ||
    evidence.attempt_id !== inventory.execution_attempt_id ||
    normalizeHash(evidence.transaction_hash) !==
      normalizeHash(inventory.void_delivery_tx_hash) ||
    evidence.delivery_address !==
      normalizeAddress(inventory.delivery_address) ||
    evidence.delivery_address !==
      normalizeAddress(publicEvent.delivery_address) ||
    evidence.void_amount_units !==
      text(inventory.consumed_void_units) ||
    evidence.void_amount_units !==
      text(publicEvent.quoted_void) ||
    evidence.delivery_address !==
      normalizeAddress(confirmation.delivery_address) ||
    evidence.void_amount_units !==
      text(confirmation.void_amount_units) ||
    evidence.fulfillment_wallet_address !==
      normalizeAddress(confirmation.fulfillment_wallet) ||
    evidence.receipt_block_number !==
      text(confirmation.delivery_block_number) ||
    evidence.receipt_block_hash !==
      normalizeHash(confirmation.delivery_block_hash) ||
    evidence.observed_confirmation_count !==
      text(confirmation.delivery_confirmation_count) ||
    evidence.delivery_address !==
      normalizeAddress(receipt.delivery_address) ||
    evidence.void_amount_units !==
      text(receipt.void_amount_units) ||
    evidence.fulfillment_wallet_address !==
      normalizeAddress(receipt.fulfillment_wallet) ||
    evidence.receipt_block_number !==
      text(receipt.delivery_block_number) ||
    evidence.receipt_block_hash !==
      normalizeHash(receipt.delivery_block_hash) ||
    evidence.observed_confirmation_count !==
      text(receipt.delivery_confirmation_count) ||
    confirmation.status !== "fulfilled_confirmed" ||
    confirmation.buyer_fulfilled !== true ||
    confirmation.automatic_fulfillment_completed !== true ||
    receipt.status !== "confirmed"
  ) {
    throw new Error(
      "payment_keyed_terminal_closeout_receipt_evidence_binding_mismatch",
    );
  }
}

function dryRequirements(
  decision: BuyVoidSagaTerminalCloseoutDecisionV1,
): Extract<
  BuyVoidSagaTerminalCloseoutDecisionV1,
  { ok: true; status: "dry_run" }
> | null {
  return decision.ok === true && decision.status === "dry_run"
    ? decision
    : null;
}

export async function runBuyVoidPaymentKeyedTerminalCloseoutV1(
  input: BuyVoidPaymentKeyedTerminalCloseoutInputV1,
): Promise<BuyVoidPaymentKeyedTerminalCloseoutDecisionV1> {
  const applied = input?.apply === true;
  const rootDir = safeRoot(input?.root_dir);
  const sagaId = text(input?.saga_id).toLowerCase();
  if (!rootDir || !SAGA_ID.test(sagaId)) {
    return held(
      applied,
      "input",
      "payment_keyed_terminal_closeout_input_invalid",
    );
  }

  const deps = {
    read_receipt_evidence:
      input.dependencies?.read_receipt_evidence ||
      readBuyVoidPaymentKeyedReceiptEvidenceV1,
    resolve_confirmed_states:
      input.dependencies?.resolve_confirmed_states ||
      resolveBuyVoidConfirmedStatesByRequestV1,
    run_terminal_closeout:
      input.dependencies?.run_terminal_closeout ||
      runBuyVoidSagaTerminalCloseoutV1,
    terminal_closeout_dependencies:
      input.dependencies?.terminal_closeout_dependencies,
  };

  const dry = await deps.run_terminal_closeout({
    root_dir: rootDir,
    saga_id: sagaId,
    apply: false,
    ...(deps.terminal_closeout_dependencies
      ? { dependencies: deps.terminal_closeout_dependencies }
      : {}),
  });
  if (dry.ok === false) {
    return held(
      applied,
      "terminal_closeout_dry_run",
      dry.reason,
      { detail: dry.detail },
    );
  }

  const plan = planFrom(dry);
  if (!plan) {
    return held(
      applied,
      "terminal_closeout_dry_run",
      "payment_keyed_terminal_closeout_plan_missing",
    );
  }

  let evidence: BuyVoidPaymentKeyedReceiptEvidenceV1 | null;
  try {
    evidence = deps.read_receipt_evidence({
      root_dir: rootDir,
      attempt_id: plan.attempt_id,
    });
  } catch (error) {
    return held(
      applied,
      "receipt_evidence",
      "payment_keyed_terminal_closeout_receipt_evidence_read_failed",
      {
        detail: {
          error_class: text((error as Error)?.name || "Error"),
          message: text((error as Error)?.message || error).slice(0, 200),
        },
      },
    );
  }
  if (!evidence || evidence.outcome !== "confirmed") {
    return held(
      applied,
      "receipt_evidence",
      "payment_keyed_terminal_closeout_confirmed_receipt_evidence_required",
    );
  }

  let confirmedState: BuyVoidConfirmedStateV1;
  try {
    confirmedState = exactConfirmedState(
      deps.resolve_confirmed_states(
        rootDir,
        plan.request_id,
      ),
      plan,
    );
    validateReceiptEvidenceBinding({
      evidence,
      plan,
      confirmed_state: confirmedState,
      saga_id: sagaId,
    });
  } catch (error) {
    return held(
      applied,
      "confirmed_state",
      text((error as Error)?.message || error).slice(0, 240),
    );
  }

  if (!applied) {
    return {
      ok: true,
      status: "dry_run",
      applied: false,
      marker: VOID_BUY_VOID_PAYMENT_KEYED_TERMINAL_CLOSEOUT_V1,
      version: 1,
      saga_id: sagaId,
      attempt_id: plan.attempt_id,
      closeout_id: plan.closeout_id,
      plan,
      receipt_evidence: evidence,
      confirmed_state: confirmedState,
      required_confirmation:
        VOID_BUY_VOID_PAYMENT_KEYED_TERMINAL_CLOSEOUT_CONFIRMATION_V1,
      required_receipt_policy_fingerprint_sha256:
        evidence.receipt_policy_fingerprint_sha256,
      required_terminal_plan_fingerprint_sha256:
        plan.plan_fingerprint_sha256,
      inventory_consumption_performed: false,
      public_request_fulfilled: false,
      saga_closeout_appended: false,
      credential_access_performed: false,
      wallet_access_performed: false,
      signing_performed: false,
      transaction_broadcast_performed: false,
      automatic_retry_allowed: false,
      money_movement_performed: false,
    };
  }

  if (
    text(input.confirmation) !==
      VOID_BUY_VOID_PAYMENT_KEYED_TERMINAL_CLOSEOUT_CONFIRMATION_V1 ||
    text(input.receipt_policy_fingerprint_sha256).toLowerCase() !==
      evidence.receipt_policy_fingerprint_sha256
  ) {
    return held(
      true,
      "confirmation",
      "payment_keyed_terminal_closeout_exact_confirmation_required",
      {
        detail: {
          required_confirmation:
            VOID_BUY_VOID_PAYMENT_KEYED_TERMINAL_CLOSEOUT_CONFIRMATION_V1,
          required_receipt_policy_fingerprint_sha256:
            evidence.receipt_policy_fingerprint_sha256,
          required_terminal_plan_fingerprint_sha256:
            plan.plan_fingerprint_sha256,
        },
      },
    );
  }

  if (dry.status === "duplicate") {
    return {
      ok: true,
      status: "duplicate",
      applied: true,
      marker: VOID_BUY_VOID_PAYMENT_KEYED_TERMINAL_CLOSEOUT_V1,
      version: 1,
      saga_id: sagaId,
      attempt_id: plan.attempt_id,
      closeout_id: plan.closeout_id,
      plan,
      receipt_evidence: evidence,
      confirmed_state: confirmedState,
      terminal_closeout: dry,
      inventory_consumption_performed: false,
      public_request_fulfilled: true,
      saga_closeout_appended: false,
      credential_access_performed: false,
      wallet_access_performed: false,
      signing_performed: false,
      transaction_broadcast_performed: false,
      automatic_retry_allowed: false,
      money_movement_performed: false,
    };
  }

  const requirements = dryRequirements(dry);
  if (!requirements) {
    return held(
      true,
      "terminal_closeout_dry_run",
      "payment_keyed_terminal_closeout_dry_requirements_missing",
    );
  }

  const appliedDecision = await deps.run_terminal_closeout({
    root_dir: rootDir,
    saga_id: sagaId,
    apply: true,
    confirmation: requirements.required_confirmation,
    policy_fingerprint_sha256:
      requirements.required_policy_fingerprint_sha256,
    expected_plan_fingerprint_sha256:
      requirements.required_plan_fingerprint_sha256,
    saga_confirmation: requirements.required_saga_confirmation,
    saga_action_confirmation:
      requirements.required_saga_action_confirmation,
    ...(deps.terminal_closeout_dependencies
      ? { dependencies: deps.terminal_closeout_dependencies }
      : {}),
  });

  if (appliedDecision.ok === false) {
    return held(
      true,
      "terminal_closeout_apply",
      appliedDecision.reason,
      {
        mutation_performed:
          appliedDecision.mutation_performed,
        inventory_consumption_performed:
          appliedDecision.inventory_consumption_performed,
        public_request_fulfilled:
          appliedDecision.public_request_fulfilled,
        saga_closeout_appended:
          appliedDecision.saga_closeout_appended,
        detail: appliedDecision.detail,
      },
    );
  }

  if (
    ![
      "closed",
      "duplicate",
      "recovered_partial",
    ].includes(appliedDecision.status) ||
    appliedDecision.plan.plan_fingerprint_sha256 !==
      plan.plan_fingerprint_sha256 ||
    appliedDecision.attempt_id !== plan.attempt_id ||
    appliedDecision.saga_id !== sagaId ||
    normalizeHash(appliedDecision.plan.transaction_hash) !==
      normalizeHash(evidence.transaction_hash) ||
    appliedDecision.public_request_fulfilled !== true
  ) {
    return held(
      true,
      "terminal_closeout_result",
      "payment_keyed_terminal_closeout_result_binding_invalid",
      {
        mutation_performed:
          appliedDecision.mutation_performed,
        inventory_consumption_performed:
          appliedDecision.inventory_consumption_performed,
        public_request_fulfilled:
          appliedDecision.public_request_fulfilled,
        saga_closeout_appended:
          appliedDecision.saga_closeout_appended,
      },
    );
  }

  return {
    ok: true,
    status: appliedDecision.status,
    applied: true,
    marker: VOID_BUY_VOID_PAYMENT_KEYED_TERMINAL_CLOSEOUT_V1,
    version: 1,
    saga_id: sagaId,
    attempt_id: plan.attempt_id,
    closeout_id: plan.closeout_id,
    plan,
    receipt_evidence: evidence,
    confirmed_state: confirmedState,
    terminal_closeout: appliedDecision as Extract<
      BuyVoidSagaTerminalCloseoutDecisionV1,
      { ok: true; status: "closed" | "duplicate" | "recovered_partial" }
    >,
    inventory_consumption_performed:
      appliedDecision.inventory_consumption_performed,
    public_request_fulfilled: true,
    saga_closeout_appended:
      appliedDecision.saga_closeout_appended,
    credential_access_performed: false,
    wallet_access_performed: false,
    signing_performed: false,
    transaction_broadcast_performed: false,
    automatic_retry_allowed: false,
    money_movement_performed: false,
  };
}
