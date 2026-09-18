#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Wallet } from "ethers";

import {
  VOID_BUY_VOID_EXECUTION_ATTEMPT_JOURNAL_V1,
  type BuyVoidExecutionAttemptStateV1,
} from "../src/economic/buy_void_execution_attempt_journal_v1.js";
import {
  VOID_BUY_VOID_SOURCE_FINALITY_EXECUTION_PREFLIGHT_V1,
} from "../src/economic/buy_void_source_finality_execution_preflight_v1.js";
import {
  VOID_BUY_VOID_PAYMENT_KEYED_PREPARATION_CUSTODY_CONFIRMATION_V1,
  readBuyVoidPaymentKeyedPreparationCustodyRecordV1,
} from "../src/economic/buy_void_payment_keyed_preparation_custody_v1.js";
import {
  listBuyVoidPaymentKeyedPlanReservationsV1,
} from "../src/economic/buy_void_payment_keyed_plan_reservation_v1.js";
import {
  validateBuyVoidPaymentKeyedTransactionPreparationPolicyV1,
  type BuyVoidPaymentKeyedTransactionPreparationRpcCallV1,
} from "../src/economic/buy_void_payment_keyed_transaction_preparation_v1.js";
import {
  VOID_BUY_VOID_PAYMENT_KEYED_PREPARATION_COORDINATOR_AUTHORITY_V1,
  VOID_BUY_VOID_PAYMENT_KEYED_PREPARATION_COORDINATOR_CONFIRMATION_V1,
  VOID_BUY_VOID_PAYMENT_KEYED_PREPARATION_COORDINATOR_V1,
  runBuyVoidPaymentKeyedPreparationCoordinatorV1,
} from "../src/economic/buy_void_payment_keyed_preparation_coordinator_v1.js";
import {
  VOID_BUY_VOID_PIPELINE_CONFIRMATIONS_V1,
} from "../src/economic/buy_void_pipeline_coordinator_v1.js";

const ATTEMPT_ID = "1".repeat(64);
const INVENTORY_ID = "2".repeat(64);
const REQUEST_KEY = "3".repeat(64);
const LOCAL_PAYMENT_KEY = "4".repeat(64);
const INSTRUCTION_ID = "5".repeat(64);
const PAYMENT_TX = "0x" + "a".repeat(64);
const IDENTITY = "voidpay1:base:" + PAYMENT_TX + ":7";
const DELIVERY = "0x3333333333333333333333333333333333333333";
const CONTRACT = "0x4444444444444444444444444444444444444444";
const wallet = new Wallet("0x" + "11".repeat(32));
const WALLET = wallet.address.toLowerCase();
const SAGA_ID = "voidbvfsg1_" + "6".repeat(64);
const POLICY_ID = "payment-keyed-preparation-proof-policy";
const RUNTIME_POLICY_FINGERPRINT = "7".repeat(64);
const ECONOMIC_POLICY_FINGERPRINT = "8".repeat(64);
const POOL = "buy-void-presale-v1";

function expectedPaymentKey(identity: string): string {
  const body = Buffer.from(identity, "utf8");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(body.length, 0);
  return crypto
    .createHash("sha256")
    .update(
      Buffer.concat([
        Buffer.from("VOID_BUY_VOID_FULFILLMENT_ANCHOR_V1\0", "ascii"),
        length,
        body,
      ]),
    )
    .digest("hex");
}
const CANONICAL_PAYMENT_KEY = expectedPaymentKey(IDENTITY);

function makeAttempt(): BuyVoidExecutionAttemptStateV1 {
  return {
    reservation: {
      schema: "void_buy_void_execution_attempt_reservation_v1",
      marker: VOID_BUY_VOID_EXECUTION_ATTEMPT_JOURNAL_V1,
      attempt_id: ATTEMPT_ID,
      attempt_number: 1,
      reserved_at_ms: 1,
      payment_key_sha256: LOCAL_PAYMENT_KEY,
      request_key_sha256: REQUEST_KEY,
      canonical_payment_identity: IDENTITY,
      request_id: "payment-keyed-preparation-coordinator-proof",
      instruction_id: INSTRUCTION_ID,
      intent_fingerprint: "9".repeat(64),
      max_attempts_per_payment: 1,
      unsigned_instruction: {
        schema: "void_buy_void_unsigned_fulfillment_instruction_v1",
        marker: "VOID_BUY_VOID_AUTO_FULFILLMENT_V1",
        instruction_id: INSTRUCTION_ID,
        request_id: "payment-keyed-preparation-coordinator-proof",
        canonical_payment_identity: IDENTITY,
        source_chain: "base",
        payment_transaction_hash: PAYMENT_TX,
        payment_log_index: "7",
        delivery_address: DELIVERY,
        payment_usdc_units: "1000000",
        void_amount_units: "2000000",
        confirmed_block_number: "123",
        confirmation_count: "12",
        signing_authorized: false,
        transaction_broadcast_authorized: false,
        automatic_execution_authorized: false,
      },
      signing_authorized_by_this_module: false,
      transaction_broadcast_authorized_by_this_module: false,
      money_movement_authorized_by_this_module: false,
    },
    prepared: null,
    broadcast: null,
    failure: null,
    postbroadcast_failure: null,
    confirmation: null,
    status: "reserved",
  };
}

const intent: any = {
  claim: {
    request_id: "payment-keyed-preparation-coordinator-proof",
    canonical_payment_identity: IDENTITY,
    instruction_id: INSTRUCTION_ID,
    unsigned_instruction: {
      delivery_address: DELIVERY,
      void_amount_units: "2000000",
    },
  },
  request_key_sha256: REQUEST_KEY,
  payment_key_sha256: LOCAL_PAYMENT_KEY,
};

const inventory: any = {
  reservation_id: INVENTORY_ID,
  pool_id: POOL,
  request_id: "payment-keyed-preparation-coordinator-proof",
  canonical_payment_identity: IDENTITY,
  request_key_sha256: REQUEST_KEY,
  payment_key_sha256: LOCAL_PAYMENT_KEY,
  delivery_address: DELIVERY,
  reserved_void_units: "2000000",
};

const preparationPolicy = {
  enabled: true,
  chain_id: "2050" as const,
  rpc_url: "http://127.0.0.1:18545/",
  fulfillment_wallet_address: WALLET,
  fulfillment_contract_address: CONTRACT,
  max_void_amount_units: "10000000000000",
  gas_limit_multiplier_bps: "12000",
  max_gas_limit: "300000",
  fee_multiplier_bps: "20000",
  max_fee_per_gas_wei: "5000000000",
  max_priority_fee_per_gas_wei: "1000000000",
};

const validation =
  validateBuyVoidPaymentKeyedTransactionPreparationPolicyV1(
    preparationPolicy,
  );
if (validation.ok === false) throw new Error(validation.reason);

const serverPolicy: any = {
  preparation_policy: preparationPolicy,
  fulfillment_contract_address: CONTRACT,
  max_void_amount_units: "10000000000000",
  saga_policy: {
    saga_policy_id: POLICY_ID,
    fingerprints: {
      combined_policy_sha256: ECONOMIC_POLICY_FINGERPRINT,
    },
    inventory_policy: {
      pool_id: POOL,
      max_reservation_void_units: "10000000000000",
    },
    execution_policy: {
      chain_id: 2050,
      max_attempts_per_payment: 1,
      fulfillment_wallet_allowlist: [WALLET],
    },
  },
};

function finalityReady(): any {
  return {
    ok: true,
    status: "ready",
    marker: VOID_BUY_VOID_SOURCE_FINALITY_EXECUTION_PREFLIGHT_V1,
    version: 1,
    attempt_id: ATTEMPT_ID,
    source_chain: "base",
    canonical_payment_identity: IDENTITY,
    payment_key_sha256: CANONICAL_PAYMENT_KEY,
    process_source_identity_verified: true,
    reviewed_source_files_verified: true,
    authenticated_transport_identity_verified: true,
    total_operation_deadline_verified: true,
    source_generation_verified: true,
    deployed_artifact_generation_verified: true,
    ancestry_verified: true,
    provider_quorum_verified: true,
    production_source_finality_authority_ready: true,
    wallet_access_performed: false,
    signing_performed: false,
    transaction_broadcast_performed: false,
    money_movement_performed: false,
  };
}

function preflightReady(): any {
  return {
    ok: true,
    status: "ready",
    marker: "VOID_BUY_VOID_PAYMENT_KEYED_RUNTIME_PREFLIGHT_V1",
    version: 1,
    attempt_id: ATTEMPT_ID,
    saga_id: SAGA_ID,
    plan_reservation_id: INVENTORY_ID,
    policy_fingerprint_sha256: RUNTIME_POLICY_FINGERPRINT,
    canonical_payment_identity: IDENTITY,
    source_chain: "base",
    canonical_payment_key_sha256: CANONICAL_PAYMENT_KEY,
    composition_marker:
      "VOID_BUY_VOID_PAYMENT_KEYED_EXECUTION_COMPOSITION_V1",
    composition_status: "dry_run",
    composition_applied: false,
    preparation_fingerprint_sha256: "a".repeat(64),
    transaction_plan_fingerprint_sha256: "b".repeat(64),
    unsigned_transaction_fingerprint_sha256: "c".repeat(64),
    request_fingerprint_sha256: "d".repeat(64),
    request_idempotency_key_sha256: "e".repeat(64),
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

type Fixture = ReturnType<typeof fixture>;

function fixture(label: string) {
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), "void-payment-keyed-prep-" + label + "-"),
  );
  const sagaRoot = path.join(
    root,
    "buy-void-crash-consistent-saga-runtime-v1",
  );
  const sagaDir = path.join(sagaRoot, "sagas", SAGA_ID);
  fs.mkdirSync(path.join(sagaDir, "events"), { recursive: true });

  let attempt = makeAttempt();
  let sagaRecord: any = {
    state: {
      state: "attempt_reserved",
      attempt_id: ATTEMPT_ID,
      reservation_id: INVENTORY_ID,
      transaction_hash: null,
      nonce: null,
    },
    events: [
      {
        event_type: "saga_initialized",
        payload: { policy_id: POLICY_ID },
      },
    ],
  };
  const calls = {
    preflight: 0,
    finality: 0,
    planner: [] as BuyVoidPaymentKeyedTransactionPreparationRpcCallV1[],
    signer_address: 0,
    sign: 0,
    pipeline: 0,
    saga_tick: 0,
  };
  const pipelineCommands: any[] = [];

  const sagaModule = {
    ADVANCE_CONFIRMATION: "buyVoidAdvanceCrashConsistentFulfillmentSagaV1",
    ACTION_CONFIRMATIONS: {
      prepare_transaction: "buyVoidSagaPrepareTransactionV1",
    },
    validateSagaBindingV1(value: any) {
      return value;
    },
    computeSagaIdV1() {
      return SAGA_ID;
    },
    createFilesystemSagaStoreV1() {
      return {
        recover() {
          return sagaRecord;
        },
      };
    },
    async runSagaSupervisorTickV1(input: any) {
      calls.saga_tick += 1;
      assert.equal(
        input.confirmation,
        "buyVoidAdvanceCrashConsistentFulfillmentSagaV1",
      );
      assert.equal(
        input.action_confirmation,
        "buyVoidSagaPrepareTransactionV1",
      );
      assert.equal(input.policy_id, POLICY_ID);
      const result = await input.adapters.prepare_transaction();
      sagaRecord = {
        state: {
          state: "transaction_prepared",
          attempt_id: result.payload.attempt_id,
          reservation_id: INVENTORY_ID,
          transaction_hash: result.payload.transaction_hash,
          nonce: result.payload.nonce,
        },
        events: [
          sagaRecord.events[0],
          {
            event_type: "transaction_prepared",
            payload: result.payload,
          },
        ],
      };
      return {
        ok: true,
        status: "applied",
        state: sagaRecord.state,
      };
    },
  };

  const dependencies: any = {
    async run_runtime_preflight() {
      calls.preflight += 1;
      return preflightReady();
    },
    read_attempt() {
      return structuredClone(attempt);
    },
    list_intents() {
      return [structuredClone(intent)];
    },
    list_inventory() {
      return [structuredClone(inventory)];
    },
    async run_source_finality() {
      calls.finality += 1;
      return finalityReady();
    },
    async preparation_transport(
      call: BuyVoidPaymentKeyedTransactionPreparationRpcCallV1,
    ) {
      calls.planner.push(call);
      switch (call.method) {
        case "eth_chainId":
          return "0x802";
        case "eth_getTransactionCount":
          return "0x7";
        case "eth_gasPrice":
          return "0x3b9aca00";
        case "eth_estimateGas":
          return "0x186a0";
        case "eth_getBalance":
          return "0xde0b6b3a7640000";
      }
    },
    signer: {
      async get_address() {
        calls.signer_address += 1;
        return WALLET;
      },
      async sign_transaction(transaction: any) {
        calls.sign += 1;
        return await wallet.signTransaction({
          type: transaction.type,
          chainId: transaction.chainId,
          nonce: transaction.nonce,
          gasLimit: transaction.gasLimit,
          maxFeePerGas: transaction.maxFeePerGas,
          maxPriorityFeePerGas: transaction.maxPriorityFeePerGas,
          to: transaction.to,
          value: transaction.value,
          data: transaction.data,
        });
      },
    },
    async run_pipeline_command(command: any) {
      calls.pipeline += 1;
      pipelineCommands.push(structuredClone(command));
      assert.equal(command.action, "prepare_execution");
      attempt = {
        ...attempt,
        prepared: {
          schema: "void_buy_void_execution_prepared_transaction_v1",
          marker: VOID_BUY_VOID_EXECUTION_ATTEMPT_JOURNAL_V1,
          attempt_id: ATTEMPT_ID,
          prepared_at_ms: command.now_ms,
          chain_id: "2050",
          void_delivery_tx_hash: command.transaction.transaction_hash,
          fulfillment_wallet: command.transaction.from_address,
          delivery_address: command.transaction.to_address,
          void_amount_units: command.transaction.amount_units,
          transaction_binding_fingerprint: "f".repeat(64),
          signed_transaction_persisted: false,
          raw_transaction_persisted: false,
          transaction_broadcast_performed_by_this_module: false,
        },
        status: "prepared",
      };
      return {
        ok: true,
        status: "applied",
        action: "prepare_execution",
        applied: true,
        mutation_performed: true,
        result: { attempt: structuredClone(attempt) },
      };
    },
    async load_saga_module() {
      return sagaModule;
    },
    now_ms() {
      return 1700000000000;
    },
  };

  return {
    root,
    calls,
    dependencies,
    pipelineCommands,
    getAttempt: () => attempt,
    getSaga: () => sagaRecord,
    setFault: (
      fn: ((stage: string) => void | Promise<void>) | undefined,
    ) => {
      dependencies.fault_inject = fn;
    },
  };
}

function exactConfirmations() {
  return {
    apply: true,
    confirmation:
      VOID_BUY_VOID_PAYMENT_KEYED_PREPARATION_COORDINATOR_CONFIRMATION_V1,
    runtime_policy_fingerprint_sha256:
      RUNTIME_POLICY_FINGERPRINT,
    preparation_policy_fingerprint_sha256:
      validation.ok ? validation.policy_fingerprint_sha256 : "",
    saga_confirmation:
      "buyVoidAdvanceCrashConsistentFulfillmentSagaV1",
    saga_action_confirmation:
      "buyVoidSagaPrepareTransactionV1",
    custody_confirmation:
      VOID_BUY_VOID_PAYMENT_KEYED_PREPARATION_CUSTODY_CONFIRMATION_V1,
    pipeline_confirmation:
      VOID_BUY_VOID_PIPELINE_CONFIRMATIONS_V1.prepare_execution,
  };
}

async function invoke(f: Fixture, extras: Record<string, unknown> = {}) {
  return await runBuyVoidPaymentKeyedPreparationCoordinatorV1({
    root_dir: f.root,
    attempt_id: ATTEMPT_ID,
    server_policy: serverPolicy,
    dependencies: f.dependencies,
    ...extras,
  });
}

{
  const f = fixture("dry");
  const dry = await invoke(f);
  if (dry.ok === false) throw new Error(dry.reason);
  assert.equal(dry.marker, VOID_BUY_VOID_PAYMENT_KEYED_PREPARATION_COORDINATOR_V1);
  assert.equal(dry.status, "dry_run");
  assert.equal(dry.applied, false);
  assert.equal(dry.mutation_performed, false);
  assert.equal(dry.attempt_id, ATTEMPT_ID);
  assert.equal(dry.saga_id, SAGA_ID);
  assert.equal(dry.inventory_reservation_id, INVENTORY_ID);
  assert.equal(
    dry.required_runtime_policy_fingerprint_sha256,
    RUNTIME_POLICY_FINGERPRINT,
  );
  assert.equal(
    dry.required_preparation_policy_fingerprint_sha256,
    validation.ok ? validation.policy_fingerprint_sha256 : "",
  );
  assert.equal(dry.existing_nonce_reservation, null);
  assert.equal(dry.existing_custody, null);
  assert.equal(dry.signer_access_performed, false);
  assert.equal(dry.signing_performed, false);
  assert.equal(dry.transaction_broadcast_performed, false);
  assert.equal(f.calls.sign, 0);
  assert.equal(f.calls.pipeline, 0);
  assert.equal(f.calls.saga_tick, 0);
  assert.equal(
    listBuyVoidPaymentKeyedPlanReservationsV1({
      root_dir: f.root,
      wallet_address: WALLET,
    }).length,
    0,
  );
  assert.equal(
    readBuyVoidPaymentKeyedPreparationCustodyRecordV1({
      root_dir: f.root,
      attempt_id: ATTEMPT_ID,
    }),
    null,
  );
  fs.rmSync(f.root, { recursive: true, force: true });
}

{
  const f = fixture("confirm");
  const held = await invoke(f, {
    ...exactConfirmations(),
    confirmation: "wrong",
  });
  assert.equal(held.ok, false);
  if (held.ok) throw new Error("wrong_confirmation_unexpected_ready");
  assert.equal(
    held.reason,
    "payment_keyed_preparation_exact_confirmations_required",
  );
  assert.equal(f.calls.preflight, 0);
  assert.equal(f.calls.planner.length, 0);
  assert.equal(f.calls.sign, 0);
  fs.rmSync(f.root, { recursive: true, force: true });
}

{
  const f = fixture("crash-custody");
  f.setFault(async (stage) => {
    if (stage === "after_custody_record") {
      throw new Error("synthetic_after_custody");
    }
  });
  const crashed = await invoke(f, exactConfirmations());
  assert.equal(crashed.ok, false);
  if (crashed.ok) throw new Error("custody_crash_unexpected_ready");
  assert.equal(
    crashed.reason,
    "payment_keyed_preparation_injected_after_custody_record",
  );
  assert.equal(f.calls.sign, 2);
  assert.equal(f.calls.pipeline, 0);
  assert.equal(f.calls.saga_tick, 0);
  const plans = listBuyVoidPaymentKeyedPlanReservationsV1({
    root_dir: f.root,
    wallet_address: WALLET,
  });
  assert.equal(plans.length, 1);
  assert.equal(plans[0].nonce, 7);
  const custody = readBuyVoidPaymentKeyedPreparationCustodyRecordV1({
    root_dir: f.root,
    attempt_id: ATTEMPT_ID,
  });
  assert.ok(custody);
  assert.equal(custody!.request.transaction_to, CONTRACT);
  assert.equal(custody!.request.delivery_address, DELIVERY);
  assert.equal(custody!.request.plan_reservation_id, INVENTORY_ID);
  assert.equal(
    custody!.request.transaction_plan_fingerprint_sha256,
    plans[0].transaction_plan_fingerprint_sha256,
  );

  f.setFault(undefined);
  const recovered = await invoke(f, exactConfirmations());
  if (recovered.ok === false) throw new Error(recovered.reason);
  assert.equal(recovered.status, "prepared");
  assert.equal(recovered.nonce_reservation.nonce, 7);
  assert.equal(recovered.custody.fulfillment_contract_address, CONTRACT);
  assert.equal(recovered.custody.delivery_address, DELIVERY);
  assert.equal(recovered.execution_attempt.status, "prepared");
  assert.equal(
    recovered.execution_attempt.prepared?.void_delivery_tx_hash,
    recovered.custody.signed_transaction_hash,
  );
  assert.equal(
    recovered.execution_attempt.prepared?.delivery_address,
    DELIVERY,
  );
  assert.notEqual(
    recovered.execution_attempt.prepared?.delivery_address,
    CONTRACT,
  );
  assert.equal(f.calls.sign, 3);
  assert.equal(f.calls.pipeline, 1);
  assert.equal(f.calls.saga_tick, 1);
  assert.equal(f.pipelineCommands.length, 1);
  assert.equal(
    f.pipelineCommands[0].transaction.to_address,
    DELIVERY,
  );
  assert.equal(
    f.pipelineCommands[0].transaction.from_address,
    WALLET,
  );
  assert.equal(
    f.getSaga().state.transaction_hash,
    recovered.custody.signed_transaction_hash,
  );
  assert.equal(f.getSaga().state.nonce, 7);
  const preparedEvent = f.getSaga().events.find(
    (event: any) => event.event_type === "transaction_prepared",
  );
  assert.ok(preparedEvent);
  assert.equal(preparedEvent.payload.attempt_id, ATTEMPT_ID);
  assert.equal(
    preparedEvent.payload.transaction_hash,
    recovered.custody.signed_transaction_hash,
  );
  assert.equal(preparedEvent.payload.nonce, 7);
  assert.equal(recovered.transaction_broadcast_performed, false);
  assert.equal(recovered.durable_submission_claimed, false);
  assert.equal(recovered.money_movement_performed, false);

  const duplicate = await invoke(f, exactConfirmations());
  if (duplicate.ok === false) throw new Error(duplicate.reason);
  assert.equal(duplicate.status, "duplicate");
  assert.equal(f.calls.pipeline, 1);
  assert.equal(f.calls.saga_tick, 1);
  assert.equal(f.calls.sign, 4);
  fs.rmSync(f.root, { recursive: true, force: true });
}

{
  const f = fixture("crash-attempt");
  f.setFault(async (stage) => {
    if (stage === "after_execution_attempt_preparation") {
      throw new Error("synthetic_after_attempt_prepare");
    }
  });
  const crashed = await invoke(f, exactConfirmations());
  assert.equal(crashed.ok, false);
  if (crashed.ok) throw new Error("attempt_crash_unexpected_ready");
  assert.equal(
    crashed.reason,
    "payment_keyed_preparation_injected_after_execution_attempt_preparation",
  );
  assert.equal(f.getAttempt().status, "prepared");
  assert.equal(f.getSaga().state.state, "attempt_reserved");
  assert.equal(f.calls.pipeline, 1);
  assert.equal(f.calls.saga_tick, 0);

  f.setFault(undefined);
  const recovered = await invoke(f, exactConfirmations());
  if (recovered.ok === false) throw new Error(recovered.reason);
  assert.equal(recovered.status, "prepared");
  assert.equal(f.calls.pipeline, 1);
  assert.equal(f.calls.saga_tick, 1);
  assert.equal(f.getSaga().state.state, "transaction_prepared");
  fs.rmSync(f.root, { recursive: true, force: true });
}

for (const [key, expected] of Object.entries({
  source_only_contract: true,
  runtime_route_mount: false,
  canonical_parent_dispatch: false,
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
  inventory_mutation: false,
  public_fulfilled_closeout: false,
  raw_signed_transaction_persistence: false,
  raw_signed_transaction_output: false,
  automatic_retry: false,
  money_movement: false,
})) {
  assert.equal(
    (VOID_BUY_VOID_PAYMENT_KEYED_PREPARATION_COORDINATOR_AUTHORITY_V1 as any)[key],
    expected,
    key,
  );
}

console.log("VOID_BUY_VOID_PAYMENT_KEYED_PREPARATION_COORDINATOR_V1_PROOF_GREEN");
console.log("runtime_preflight_before_mutation=true");
console.log("source_finality_revalidated=true");
console.log("wallet_scoped_nonce_reservation=true");
console.log("exact_reserved_nonce_request_signed=true");
console.log("inventory_reservation_id_preserved_as_custodian_plan_reservation=true");
console.log("nonce_reservation_id_separate=true");
console.log("custody_evm_target=fulfillment_contract");
console.log("attempt_journal_delivery_address=buyer");
console.log("crash_after_custody_recovery=true");
console.log("crash_after_attempt_projection_recovery=true");
console.log("saga_transaction_prepared_append=true");
console.log("write_ahead_broadcast_intent_created=false");
console.log("durable_submission_claim=false");
console.log("transaction_broadcast=false");
console.log("raw_signed_transaction_persisted=false");
console.log("inventory_mutation=false");
console.log("public_fulfilled_closeout=false");
console.log("runtime_route_mount=false");
console.log("money_movement=false");
