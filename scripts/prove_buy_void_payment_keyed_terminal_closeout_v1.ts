#!/usr/bin/env node
import assert from "node:assert/strict";

import {
  VOID_BUY_VOID_PAYMENT_KEYED_TERMINAL_CLOSEOUT_AUTHORITY_V1,
  VOID_BUY_VOID_PAYMENT_KEYED_TERMINAL_CLOSEOUT_CONFIRMATION_V1,
  VOID_BUY_VOID_PAYMENT_KEYED_TERMINAL_CLOSEOUT_V1,
  runBuyVoidPaymentKeyedTerminalCloseoutV1,
} from "../src/economic/buy_void_payment_keyed_terminal_closeout_v1.js";

const SAGA_ID = "voidbvfsg1_" + "1".repeat(64);
const ATTEMPT_ID = "2".repeat(64);
const CLOSEOUT_ID = "3".repeat(64);
const RESERVATION_ID = "4".repeat(64);
const TX_HASH = "0x" + "5".repeat(64);
const RECEIPT_BLOCK_HASH = "0x" + "6".repeat(64);
const STATE_ID = "7".repeat(64);
const STATE_FP = "8".repeat(64);
const POLICY_FP = "9".repeat(64);
const PLAN_FP = "a".repeat(64);
const RECEIPT_POLICY_FP = "b".repeat(64);
const WALLET = "0x1111111111111111111111111111111111111111";
const CONTRACT = "0x2222222222222222222222222222222222222222";
const DELIVERY = "0x3333333333333333333333333333333333333333";
const REQUEST_ID = "request-proof-v1";
const INSTRUCTION_ID = "instruction-proof-v1";
const PAYMENT_ID =
  "voidpay1:base:0x" + "c".repeat(64) + ":7";

const plan: any = {
  schema: "void_buy_void_saga_terminal_closeout_plan_v1",
  marker: "VOID_BUY_VOID_SAGA_TERMINAL_CLOSEOUT_V1",
  version: 1,
  closeout_id: CLOSEOUT_ID,
  plan_fingerprint_sha256: PLAN_FP,
  saga_id: SAGA_ID,
  request_id: REQUEST_ID,
  attempt_id: ATTEMPT_ID,
  reservation_id: RESERVATION_ID,
  transaction_hash: TX_HASH,
  canonical_confirmed_state_id: STATE_ID,
  canonical_confirmed_state_fingerprint: STATE_FP,
  server_policy_fingerprint_sha256: POLICY_FP,
  inventory_consumption: {
    execution_attempt_id: ATTEMPT_ID,
    void_delivery_tx_hash: TX_HASH,
    delivery_address: DELIVERY,
    consumed_void_units: "2000000",
  },
  public_closeout_event: {},
  base_closeout_plan: {
    void_delivery_tx_hash: TX_HASH,
    inventory_consumption: {
      execution_attempt_id: ATTEMPT_ID,
      void_delivery_tx_hash: TX_HASH,
      delivery_address: DELIVERY,
      consumed_void_units: "2000000",
    },
    public_closeout_event: {
      delivery_address: DELIVERY,
      quoted_void: "2000000",
    },
  },
};

const confirmedState: any = {
  schema: "void_buy_void_confirmed_state_v1",
  marker: "VOID_BUY_VOID_CONFIRMED_STATE_JOURNAL_V1",
  state_id: STATE_ID,
  projection_fingerprint: STATE_FP,
  request_id: REQUEST_ID,
  canonical_payment_identity: PAYMENT_ID,
  confirmation: {
    status: "fulfilled_confirmed",
    request_id: REQUEST_ID,
    instruction_id: INSTRUCTION_ID,
    canonical_payment_identity: PAYMENT_ID,
    void_delivery_tx_hash: TX_HASH,
    delivery_address: DELIVERY,
    void_amount_units: "2000000",
    fulfillment_wallet: WALLET,
    delivery_block_number: "100",
    delivery_block_hash: RECEIPT_BLOCK_HASH,
    delivery_confirmation_count: "3",
    buyer_fulfilled: true,
    automatic_fulfillment_completed: true,
    payment_claim_persisted: true,
    delivery_confirmation_observed: true,
  },
  buyer_status: {
    delivery_address: DELIVERY,
    void_delivery_tx_hash: TX_HASH,
    buyer_fulfilled: true,
  },
  allocation_status: {
    allocation_fulfilled: true,
  },
  fulfillment_receipt: {
    status: "confirmed",
    void_delivery_tx_hash: TX_HASH,
    delivery_block_number: "100",
    delivery_block_hash: RECEIPT_BLOCK_HASH,
    delivery_confirmation_count: "3",
    fulfillment_wallet: WALLET,
    delivery_address: DELIVERY,
    void_amount_units: "2000000",
  },
};

const evidence: any = {
  schema: "void_buy_void_payment_keyed_receipt_evidence_v1",
  marker: "VOID_BUY_VOID_PAYMENT_KEYED_RECEIPT_EVIDENCE_V1",
  version: 1,
  saga_id: SAGA_ID,
  attempt_id: ATTEMPT_ID,
  transaction_hash: TX_HASH,
  outcome: "confirmed",
  recorded_at_ms: 1700000000000,
  receipt_policy_fingerprint_sha256: RECEIPT_POLICY_FP,
  receipt_evidence_fingerprint_sha256: "d".repeat(64),
  receipt_block_number: "100",
  receipt_block_hash: RECEIPT_BLOCK_HASH,
  observed_confirmation_count: "3",
  fulfillment_wallet_address: WALLET,
  fulfillment_contract_address: CONTRACT,
  delivery_address: DELIVERY,
  void_amount_units: "2000000",
  canonical_payment_identity: PAYMENT_ID,
  payment_delivery_id: "0x" + "e".repeat(64),
  void_token_address:
    "0x4444444444444444444444444444444444444444",
  token_amount_atoms: "2000000000000000000",
  fulfillment_event_log_index: "2",
  transfer_event_log_index: "1",
  evidence_fingerprint_sha256: "f".repeat(64),
  authority: {},
};

function dryDecision(): any {
  return {
    ok: true,
    status: "dry_run",
    applied: false,
    mutation_performed: false,
    saga_id: SAGA_ID,
    attempt_id: ATTEMPT_ID,
    closeout_id: CLOSEOUT_ID,
    plan,
    required_confirmation:
      "buyVoidAdvanceSagaTerminalCloseoutV1",
    required_policy_fingerprint_sha256: POLICY_FP,
    required_plan_fingerprint_sha256: PLAN_FP,
    required_saga_confirmation:
      "buyVoidAdvanceCrashConsistentFulfillmentSagaV1",
    required_saga_action_confirmation:
      "buyVoidSagaCloseoutConfirmedDeliveryV1",
    inventory_consumption_performed: false,
    public_request_fulfilled: false,
    saga_closeout_appended: false,
    automatic_retry_allowed: false,
    money_movement_performed: false,
  };
}

function appliedDecision(
  status: "closed" | "recovered_partial" = "closed",
): any {
  return {
    ok: true,
    status,
    applied: true,
    mutation_performed: true,
    saga_id: SAGA_ID,
    attempt_id: ATTEMPT_ID,
    closeout_id: CLOSEOUT_ID,
    plan,
    saga_state: {
      state: "closed",
      closeout_id: CLOSEOUT_ID,
    },
    inventory_consumption_performed: true,
    public_request_fulfilled: true,
    saga_closeout_appended: true,
    automatic_retry_allowed: false,
    money_movement_performed: false,
  };
}

function fixture(options: {
  evidence?: any;
  confirmedState?: any;
  appliedStatus?: "closed" | "recovered_partial";
  duplicateDry?: boolean;
} = {}) {
  const calls: any[] = [];
  const selectedEvidence =
    Object.prototype.hasOwnProperty.call(options, "evidence")
      ? options.evidence
      : evidence;
  const selectedState =
    Object.prototype.hasOwnProperty.call(options, "confirmedState")
      ? options.confirmedState
      : confirmedState;

  const dependencies: any = {
    read_receipt_evidence() {
      return selectedEvidence
        ? structuredClone(selectedEvidence)
        : null;
    },
    resolve_confirmed_states() {
      return selectedState
        ? [structuredClone(selectedState)]
        : [];
    },
    async run_terminal_closeout(input: any) {
      calls.push(structuredClone(input));
      if (input.apply !== true) {
        if (options.duplicateDry) {
          return {
            ...appliedDecision("closed"),
            status: "duplicate",
            mutation_performed: false,
            inventory_consumption_performed: false,
            saga_closeout_appended: false,
          };
        }
        return dryDecision();
      }
      assert.equal(
        input.confirmation,
        "buyVoidAdvanceSagaTerminalCloseoutV1",
      );
      assert.equal(
        input.policy_fingerprint_sha256,
        POLICY_FP,
      );
      assert.equal(
        input.expected_plan_fingerprint_sha256,
        PLAN_FP,
      );
      assert.equal(
        input.saga_confirmation,
        "buyVoidAdvanceCrashConsistentFulfillmentSagaV1",
      );
      assert.equal(
        input.saga_action_confirmation,
        "buyVoidSagaCloseoutConfirmedDeliveryV1",
      );
      return appliedDecision(
        options.appliedStatus || "closed",
      );
    },
  };

  return { calls, dependencies };
}

async function invoke(
  f: ReturnType<typeof fixture>,
  extra: any = {},
) {
  return await runBuyVoidPaymentKeyedTerminalCloseoutV1({
    root_dir: "/tmp/void-payment-keyed-terminal-closeout-proof",
    saga_id: SAGA_ID,
    dependencies: f.dependencies,
    ...extra,
  });
}

{
  const f = fixture();
  const dry = await invoke(f);
  if (dry.ok === false) throw new Error(dry.reason);
  assert.equal(
    dry.marker,
    VOID_BUY_VOID_PAYMENT_KEYED_TERMINAL_CLOSEOUT_V1,
  );
  assert.equal(dry.status, "dry_run");
  assert.equal(
    dry.required_confirmation,
    VOID_BUY_VOID_PAYMENT_KEYED_TERMINAL_CLOSEOUT_CONFIRMATION_V1,
  );
  assert.equal(
    dry.required_receipt_policy_fingerprint_sha256,
    RECEIPT_POLICY_FP,
  );
  assert.equal(
    dry.required_terminal_plan_fingerprint_sha256,
    PLAN_FP,
  );
  assert.equal(dry.inventory_consumption_performed, false);
  assert.equal(dry.public_request_fulfilled, false);
  assert.equal(f.calls.length, 1);
  assert.equal(f.calls[0].apply, false);
}

{
  const f = fixture({ evidence: null });
  const held = await invoke(f, {
    apply: true,
    confirmation:
      VOID_BUY_VOID_PAYMENT_KEYED_TERMINAL_CLOSEOUT_CONFIRMATION_V1,
    receipt_policy_fingerprint_sha256: RECEIPT_POLICY_FP,
  });
  assert.equal(held.ok, false);
  if (held.ok) throw new Error("missing_evidence_unexpected_ready");
  assert.equal(
    held.reason,
    "payment_keyed_terminal_closeout_confirmed_receipt_evidence_required",
  );
  assert.equal(f.calls.length, 1);
}

{
  const f = fixture({
    evidence: { ...evidence, outcome: "reverted" },
  });
  const held = await invoke(f, {
    apply: true,
    confirmation:
      VOID_BUY_VOID_PAYMENT_KEYED_TERMINAL_CLOSEOUT_CONFIRMATION_V1,
    receipt_policy_fingerprint_sha256: RECEIPT_POLICY_FP,
  });
  assert.equal(held.ok, false);
  assert.equal(f.calls.length, 1);
}

{
  const f = fixture({
    evidence: {
      ...evidence,
      receipt_block_hash: "0x" + "0".repeat(64),
    },
  });
  const held = await invoke(f, {
    apply: true,
    confirmation:
      VOID_BUY_VOID_PAYMENT_KEYED_TERMINAL_CLOSEOUT_CONFIRMATION_V1,
    receipt_policy_fingerprint_sha256: RECEIPT_POLICY_FP,
  });
  assert.equal(held.ok, false);
  if (held.ok) throw new Error("mismatch_unexpected_ready");
  assert.equal(
    held.reason,
    "payment_keyed_terminal_closeout_receipt_evidence_binding_mismatch",
  );
  assert.equal(f.calls.length, 1);
}

{
  const f = fixture();
  const held = await invoke(f, {
    apply: true,
    confirmation: "wrong",
    receipt_policy_fingerprint_sha256: RECEIPT_POLICY_FP,
  });
  assert.equal(held.ok, false);
  assert.equal(
    held.reason,
    "payment_keyed_terminal_closeout_exact_confirmation_required",
  );
  assert.equal(f.calls.length, 1);
}

{
  const f = fixture();
  const held = await invoke(f, {
    apply: true,
    confirmation:
      VOID_BUY_VOID_PAYMENT_KEYED_TERMINAL_CLOSEOUT_CONFIRMATION_V1,
    receipt_policy_fingerprint_sha256: "0".repeat(64),
  });
  assert.equal(held.ok, false);
  assert.equal(f.calls.length, 1);
}

{
  const f = fixture();
  const closed = await invoke(f, {
    apply: true,
    confirmation:
      VOID_BUY_VOID_PAYMENT_KEYED_TERMINAL_CLOSEOUT_CONFIRMATION_V1,
    receipt_policy_fingerprint_sha256: RECEIPT_POLICY_FP,
  });
  if (closed.ok === false) throw new Error(closed.reason);
  assert.equal(closed.status, "closed");
  assert.equal(closed.inventory_consumption_performed, true);
  assert.equal(closed.public_request_fulfilled, true);
  assert.equal(closed.saga_closeout_appended, true);
  assert.equal(closed.money_movement_performed, false);
  assert.equal(f.calls.length, 2);
  assert.equal(f.calls[0].apply, false);
  assert.equal(f.calls[1].apply, true);
}

{
  const f = fixture({ appliedStatus: "recovered_partial" });
  const recovered = await invoke(f, {
    apply: true,
    confirmation:
      VOID_BUY_VOID_PAYMENT_KEYED_TERMINAL_CLOSEOUT_CONFIRMATION_V1,
    receipt_policy_fingerprint_sha256: RECEIPT_POLICY_FP,
  });
  if (recovered.ok === false) throw new Error(recovered.reason);
  assert.equal(recovered.status, "recovered_partial");
  assert.equal(recovered.public_request_fulfilled, true);
}

{
  const f = fixture({ duplicateDry: true });
  const duplicate = await invoke(f, {
    apply: true,
    confirmation:
      VOID_BUY_VOID_PAYMENT_KEYED_TERMINAL_CLOSEOUT_CONFIRMATION_V1,
    receipt_policy_fingerprint_sha256: RECEIPT_POLICY_FP,
  });
  if (duplicate.ok === false) throw new Error(duplicate.reason);
  assert.equal(duplicate.status, "duplicate");
  assert.equal(duplicate.inventory_consumption_performed, false);
  assert.equal(duplicate.public_request_fulfilled, true);
  assert.equal(f.calls.length, 1);
}

for (const [key, expected] of Object.entries({
  source_only_contract: true,
  runtime_route_mount: false,
  canonical_parent_dispatch: false,
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
})) {
  assert.equal(
    (VOID_BUY_VOID_PAYMENT_KEYED_TERMINAL_CLOSEOUT_AUTHORITY_V1 as any)[key],
    expected,
    key,
  );
}

console.log("VOID_BUY_VOID_PAYMENT_KEYED_TERMINAL_CLOSEOUT_V1_PROOF_GREEN");
console.log("confirmed_payment_keyed_receipt_evidence_required=true");
console.log("receipt_policy_fingerprint_required=true");
console.log("canonical_confirmed_state_binding_required=true");
console.log("receipt_block_hash_binding_required=true");
console.log("economic_delivery_binding_required=true");
console.log("existing_terminal_closeout_reused=true");
console.log("terminal_plan_revalidation_reused=true");
console.log("request_scoped_closeout_lock_reused=true");
console.log("inventory_consumption_reused=true");
console.log("public_fulfilled_event_reused=true");
console.log("saga_closeout_committed_reused=true");
console.log("missing_receipt_evidence_blocks_mutation=true");
console.log("reverted_receipt_evidence_blocks_mutation=true");
console.log("mismatched_receipt_evidence_blocks_mutation=true");
console.log("wallet_access=false");
console.log("signing=false");
console.log("transaction_broadcast=false");
console.log("money_movement=false");
console.log("runtime_route_mount=false");
