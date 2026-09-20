#!/usr/bin/env node
import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Transaction, Wallet } from "ethers";

import {
  VOID_BUY_VOID_EXECUTION_ATTEMPT_JOURNAL_V1,
  type BuyVoidExecutionAttemptStateV1,
} from "../src/economic/buy_void_execution_attempt_journal_v1.js";
import {
  VOID_BUY_VOID_SOURCE_FINALITY_EXECUTION_PREFLIGHT_V1,
} from "../src/economic/buy_void_source_finality_execution_preflight_v1.js";
import {
  buildBuyVoidPaymentKeyedFulfillmentCallV1,
} from "../src/economic/buy_void_payment_keyed_fulfillment_call_v1.js";
import {
  buildBuyVoidPaymentKeyedUnsignedTransactionV1,
} from "../src/economic/buy_void_payment_keyed_unsigned_transaction_v1.js";
import {
  buildBuyVoidPaymentKeyedCustodianPrepareRequestV1,
} from "../src/economic/buy_void_payment_keyed_custodian_prepare_request_v1.js";
import {
  VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_SIGNER_CONFIRMATION_V1,
  runBuyVoidPaymentKeyedCustodianSignerV1,
} from "../src/economic/buy_void_payment_keyed_custodian_signer_v1.js";
import {
  VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_BROADCAST_CONFIRMATION_V1,
  runBuyVoidPaymentKeyedCustodianBroadcastV1,
} from "../src/economic/buy_void_payment_keyed_custodian_broadcast_v1.js";
import {
  VOID_BUY_VOID_PAYMENT_KEYED_PLAN_RESERVATION_V1,
} from "../src/economic/buy_void_payment_keyed_plan_reservation_v1.js";
import {
  VOID_BUY_VOID_PAYMENT_KEYED_PREPARATION_CUSTODY_V1,
} from "../src/economic/buy_void_payment_keyed_preparation_custody_v1.js";
import {
  buyVoidPaymentKeyedRuntimeServerPolicyFingerprintV1,
} from "../src/economic/buy_void_payment_keyed_runtime_preflight_v1.js";
import {
  validateBuyVoidPaymentKeyedTransactionPreparationPolicyV1,
} from "../src/economic/buy_void_payment_keyed_transaction_preparation_v1.js";
import {
  VOID_BUY_VOID_PAYMENT_KEYED_GUARDED_BROADCAST_AUTHORITY_V1,
  VOID_BUY_VOID_PAYMENT_KEYED_GUARDED_BROADCAST_CONFIRMATION_V1,
  VOID_BUY_VOID_PAYMENT_KEYED_GUARDED_BROADCAST_COORDINATOR_V1,
  runBuyVoidPaymentKeyedGuardedBroadcastV1,
  createBuyVoidPaymentKeyedGuardedBroadcastLeaseRunnerV1,
} from "../src/economic/buy_void_payment_keyed_guarded_broadcast_v1.js";
import {
  readBuyVoidSagaBroadcastEvidenceStateV1,
  recordBuyVoidSagaBroadcastEvidenceV1,
} from "../src/economic/buy_void_saga_broadcast_evidence_journal_v1.js";

import {
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_V1 as DISPATCHER_MARKER,
  type BuyVoidPaymentKeyedDispatcherLeaseV1,
} from "../src/economic/buy_void_payment_keyed_dispatcher_v1.js";
import {
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_SQL_V1 as LEASE_SQL,
} from "../src/economic/buy_void_payment_keyed_dispatcher_postgres_store_v1.js";

const ATTEMPT_ID = "1".repeat(64);
const INVENTORY_ID = "2".repeat(64);
const REQUEST_KEY = "3".repeat(64);
const LOCAL_PAYMENT_KEY = "4".repeat(64);
const INSTRUCTION_ID = "proof-instruction-v1";
const REQUEST_ID = "payment-keyed-guarded-broadcast-proof";
const PAYMENT_TX = "0x" + "a".repeat(64);
const IDENTITY = "voidpay1:base:" + PAYMENT_TX + ":7";
const DELIVERY = "0x3333333333333333333333333333333333333333";
const CONTRACT = "0x4444444444444444444444444444444444444444";
const wallet = new Wallet("0x" + "11".repeat(32));
const WALLET = wallet.address.toLowerCase();
const SAGA_ID = "voidbvfsg1_" + "6".repeat(64);
const BROADCAST_INTENT_ID = "voidbvbci1_" + "7".repeat(64);
const POLICY_ID = "payment-keyed-guarded-broadcast-proof-policy";
const ECONOMIC_POLICY_FINGERPRINT = "8".repeat(64);
const POOL = "buy-void-presale-v1";
const SOURCE_FLOOR = "adf78bdbafed86d800cd1825c91691374e05f1a8";

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

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

const preparationValidation =
  validateBuyVoidPaymentKeyedTransactionPreparationPolicyV1(
    preparationPolicy,
  );
if (preparationValidation.ok === false) {
  throw new Error(preparationValidation.reason);
}
const preparationValidationReady =
  preparationValidation as Extract<typeof preparationValidation, { ok: true }>;

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

const runtimeValidation =
  buyVoidPaymentKeyedRuntimeServerPolicyFingerprintV1(serverPolicy);
if (runtimeValidation.ok === false) {
  throw new Error(runtimeValidation.reason);
}
const runtimeValidationReady =
  runtimeValidation as Extract<typeof runtimeValidation, { ok: true }>;

function baseAttempt(): BuyVoidExecutionAttemptStateV1 {
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
      request_id: REQUEST_ID,
      instruction_id: INSTRUCTION_ID,
      intent_fingerprint: "9".repeat(64),
      max_attempts_per_payment: 1,
      unsigned_instruction: {
        schema: "void_buy_void_unsigned_fulfillment_instruction_v1",
        marker: "VOID_BUY_VOID_AUTO_FULFILLMENT_V1",
        instruction_id: INSTRUCTION_ID,
        request_id: REQUEST_ID,
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
    request_id: REQUEST_ID,
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
  request_id: REQUEST_ID,
  canonical_payment_identity: IDENTITY,
  request_key_sha256: REQUEST_KEY,
  payment_key_sha256: LOCAL_PAYMENT_KEY,
  delivery_address: DELIVERY,
  reserved_void_units: "2000000",
};

const finality: any = {
  ok: true,
  marker: VOID_BUY_VOID_SOURCE_FINALITY_EXECUTION_PREFLIGHT_V1,
  version: 1,
  status: "ready",
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

const call = buildBuyVoidPaymentKeyedFulfillmentCallV1({
  attempt: baseAttempt(),
  source_finality: finality,
  policy: {
    chain_id: "2050",
    fulfillment_contract_address: CONTRACT,
    max_void_amount_units: "10000000000000",
  },
});
if (call.ok === false) throw new Error(call.reason);

const transactionPlan = {
  chain_id: "2050",
  nonce: 7,
  gas_limit: "120000",
  max_fee_per_gas_wei: "2000000000",
  max_priority_fee_per_gas_wei: "1000000000",
};
const planFingerprint = sha256(
  [
    "chain_id=2050",
    "nonce=7",
    "gas_limit=120000",
    "max_fee_per_gas_wei=2000000000",
    "max_priority_fee_per_gas_wei=1000000000",
  ].join("\n"),
);

const unsigned = buildBuyVoidPaymentKeyedUnsignedTransactionV1({
  attempt_id: ATTEMPT_ID,
  fulfillment_call: call,
  plan: transactionPlan,
  policy: preparationPolicy,
});
if (unsigned.ok === false) throw new Error(unsigned.reason);
assert.equal(
  unsigned.transaction_plan_fingerprint_sha256,
  planFingerprint,
);

const requestDecision =
  buildBuyVoidPaymentKeyedCustodianPrepareRequestV1({
    saga_id: SAGA_ID,
    attempt_id: ATTEMPT_ID,
    plan_reservation_id: INVENTORY_ID,
    fulfillment_call: call,
    plan: transactionPlan,
    unsigned_transaction: unsigned,
    policy: preparationPolicy,
  });
if (requestDecision.ok === false) {
  throw new Error(requestDecision.reason);
}
const request = requestDecision.request;

const baseSigner = {
  async get_address() {
    return WALLET;
  },
  async sign_transaction(transaction: any) {
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
};

const initialSigned =
  await runBuyVoidPaymentKeyedCustodianSignerV1({
    request,
    signer: baseSigner,
    apply: true,
    confirmation:
      VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_SIGNER_CONFIRMATION_V1,
  });
if (initialSigned.ok === false) throw new Error(initialSigned.reason);
assert.equal(initialSigned.status, "signed");
assert.ok(initialSigned.signed_transaction_hash);
assert.ok(initialSigned.raw_signed_transaction_sha256);

const plan: any = {
  schema: "void_buy_void_payment_keyed_plan_reservation_v1",
  marker: VOID_BUY_VOID_PAYMENT_KEYED_PLAN_RESERVATION_V1,
  version: 1,
  reservation_id: "b".repeat(64),
  reserved_at_ms: 10,
  saga_id: SAGA_ID,
  attempt_id: ATTEMPT_ID,
  chain_id: "2050",
  wallet_address: WALLET,
  wallet_key_sha256: "c".repeat(64),
  nonce: 7,
  fulfillment_call: call,
  gas_limit: "120000",
  max_fee_per_gas_wei: "2000000000",
  max_priority_fee_per_gas_wei: "1000000000",
  runtime_policy_fingerprint_sha256: runtimeValidation.fingerprint,
  preparation_policy_fingerprint_sha256:
    preparationValidation.policy_fingerprint_sha256,
  transaction_template_fingerprint_sha256: "d".repeat(64),
  transaction_plan_fingerprint_sha256: planFingerprint,
  reservation_status: "reserved",
  nonce_release_authorized: false,
  credential_access_authorized: false,
  wallet_access_authorized: false,
  signing_authorized: false,
  transaction_broadcast_authorized: false,
  raw_signed_transaction_persisted: false,
  money_movement_authorized: false,
};

const custody: any = {
  schema: "void_buy_void_payment_keyed_preparation_custody_record_v1",
  marker: VOID_BUY_VOID_PAYMENT_KEYED_PREPARATION_CUSTODY_V1,
  version: 1,
  recorded_at_ms: 20,
  request,
  signer_address: WALLET,
  signed_transaction_hash: initialSigned.signed_transaction_hash,
  raw_signed_transaction_sha256:
    initialSigned.raw_signed_transaction_sha256,
  custody_fingerprint_sha256: "e".repeat(64),
  deterministic_signing_verified: true,
  raw_signed_transaction_persisted: false,
  raw_signed_transaction_returned: false,
  transaction_broadcast_authorized: false,
  money_movement_authorized: false,
};

function preparedAttempt(): BuyVoidExecutionAttemptStateV1 {
  const base = baseAttempt();
  return {
    ...base,
    prepared: {
      schema: "void_buy_void_execution_prepared_transaction_v1",
      marker: VOID_BUY_VOID_EXECUTION_ATTEMPT_JOURNAL_V1,
      attempt_id: ATTEMPT_ID,
      prepared_at_ms: 30,
      chain_id: "2050",
      void_delivery_tx_hash: custody.signed_transaction_hash,
      fulfillment_wallet: WALLET,
      delivery_address: DELIVERY,
      void_amount_units: "2000000",
      transaction_binding_fingerprint: "f".repeat(64),
      signed_transaction_persisted: false,
      raw_transaction_persisted: false,
      transaction_broadcast_performed_by_this_module: false,
    },
    status: "prepared",
  };
}

function binding() {
  return {
    request_id: REQUEST_ID,
    canonical_payment_identity: IDENTITY,
    request_key_sha256: REQUEST_KEY,
    payment_key_sha256: LOCAL_PAYMENT_KEY,
    delivery_address: DELIVERY,
    void_amount_units: "2000000",
    chain_id: "2050",
    pool_id: POOL,
  };
}

async function loadRealSaga(): Promise<any> {
  const dynamicImport = new Function(
    "specifier",
    "return import(specifier)",
  ) as (specifier: string) => Promise<any>;
  return await dynamicImport(
    new URL(
      "../tools/buy-void-crash-consistent-fulfillment-saga-v1.mjs",
      import.meta.url,
    ).href,
  );
}

async function proveRealSagaNoSubmissionCallTruth() {
  const saga = await loadRealSaga();
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), "void-pk-real-saga-"),
  );
  const store = saga.createFilesystemSagaStoreV1(root);
  const b = saga.validateSagaBindingV1(binding());
  const sid = saga.computeSagaIdV1(b);
  let now = 1700000000000;

  async function tick(adapter: Record<string, any>) {
    const current = store.recover(sid);
    const next = current
      ? saga.deriveSagaNextActionV1(current.state)
      : {
          action: "claim_payment",
          required_confirmation:
            saga.ACTION_CONFIRMATIONS.claim_payment,
        };
    const result = await saga.runSagaSupervisorTickV1({
      store,
      binding: b,
      owner_id: "proof-owner-" + String(now),
      now_ms: now,
      lease_ttl_ms: 30000,
      recorded_at_utc: new Date(now).toISOString(),
      source_floor_main: SOURCE_FLOOR,
      policy_id: POLICY_ID,
      apply: true,
      confirmation: saga.ADVANCE_CONFIRMATION,
      action_confirmation:
        saga.ACTION_CONFIRMATIONS[next.action],
      adapters: adapter,
    });
    now += 1;
    return result;
  }

  await tick({
    claim_payment: async () => ({
      payload: {
        claim_id: "claim-proof-v1",
        instruction_id: INSTRUCTION_ID,
      },
    }),
  });
  await tick({
    reserve_inventory: async () => ({
      payload: { reservation_id: INVENTORY_ID },
    }),
  });
  await tick({
    reserve_execution_attempt: async () => ({
      payload: { attempt_id: ATTEMPT_ID, attempt_number: 1 },
    }),
  });
  await tick({
    prepare_transaction: async () => ({
      payload: {
        attempt_id: ATTEMPT_ID,
        transaction_hash: custody.signed_transaction_hash,
        nonce: 7,
        fulfillment_wallet_fingerprint_sha256: sha256(WALLET),
        gas_limit: "120000",
        max_fee_per_gas_wei: "2000000000",
        max_priority_fee_per_gas_wei: "1000000000",
      },
    }),
  });
  await tick({
    execute_prepared_transaction: async ({ record }: any) => {
      assert.equal(record.state.state, "broadcast_intent_committed");
      return {
        outcome: "broadcast_not_attempted",
        payload: {
          attempt_id: ATTEMPT_ID,
          transaction_hash: custody.signed_transaction_hash,
          reason_code: "provider_certified_not_submitted",
          broadcast_call_performed: true,
        },
      };
    },
  });

  const record = store.recover(sid);
  assert.equal(record.state.state, "broadcast_not_attempted");
  assert.equal(record.state.broadcast_call_may_have_occurred, false);
  assert.equal(record.state.automatic_retry_allowed, false);
  assert.equal(
    saga.deriveSagaNextActionV1(record.state).action,
    "execute_prepared_transaction",
  );
  const event = record.events.at(-1);
  assert.equal(event.event_type, "broadcast_not_attempted");
  assert.equal(event.payload.broadcast_call_performed, true);
  fs.rmSync(root, { recursive: true, force: true });
}

function proveRealEvidenceNoSubmissionCallTruth() {
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), "void-pk-real-evidence-"),
  );
  const decision = recordBuyVoidSagaBroadcastEvidenceV1({
    root_dir: root,
    saga_id: SAGA_ID,
    attempt_id: ATTEMPT_ID,
    broadcast_intent_id: BROADCAST_INTENT_ID,
    transaction_hash: custody.signed_transaction_hash,
    outcome: {
      ok: true,
      status: "not_submitted",
      transaction_hash: custody.signed_transaction_hash,
      provider_submission_id: "provider-no-submit",
      definitive_not_submitted: true,
      submission_call_performed: true,
      submission_may_have_occurred: false,
      receipt: null,
    },
    now_ms: 1700000001000,
  });
  if (decision.ok === false) throw new Error(decision.reason);
  assert.equal(decision.state.latest.outcome, "not_submitted");
  assert.equal(
    decision.state.latest.submission_call_performed,
    true,
  );
  assert.equal(
    decision.state.latest.submission_may_have_occurred,
    false,
  );
  assert.equal(decision.state.reconciliation_required, false);
  const reread = readBuyVoidSagaBroadcastEvidenceStateV1({
    root_dir: root,
    attempt_id: ATTEMPT_ID,
  });
  assert.ok(reread);
  assert.equal(reread!.latest.submission_call_performed, true);
  fs.rmSync(root, { recursive: true, force: true });
}

type Scenario =
  | "accepted"
  | "unknown"
  | "not_broadcast";

function syntheticSagaModule(stateRef: { record: any }, order: string[]) {
  return {
    ADVANCE_CONFIRMATION:
      "buyVoidAdvanceCrashConsistentFulfillmentSagaV1",
    ACTION_CONFIRMATIONS: {
      execute_prepared_transaction:
        "buyVoidSagaExecutePreparedTransactionV1",
      reconcile_possible_broadcast:
        "buyVoidSagaReconcilePossibleBroadcastV1",
    },
    validateSagaBindingV1(value: any) {
      return value;
    },
    computeSagaIdV1() {
      return SAGA_ID;
    },
    deriveSagaNextActionV1(state: any) {
      if (
        state.state === "transaction_prepared" ||
        state.state === "broadcast_not_attempted"
      ) {
        return {
          action: "execute_prepared_transaction",
          terminal: false,
          required_confirmation:
            "buyVoidSagaExecutePreparedTransactionV1",
        };
      }
      return {
        action: "reconcile_possible_broadcast",
        terminal: false,
        required_confirmation:
          "buyVoidSagaReconcilePossibleBroadcastV1",
      };
    },
    createFilesystemSagaStoreV1() {
      return {
        recover() {
          return stateRef.record;
        },
      };
    },
    async runSagaSupervisorTickV1(input: any) {
      const current = stateRef.record;
      assert.ok(
        ["transaction_prepared", "broadcast_not_attempted"].includes(
          current.state.state,
        ),
      );
      if (input.before_broadcast_intent_append !== undefined) {
        assert.equal(typeof input.before_broadcast_intent_append, "function");
        order.push("saga_locked_admission");
        const admitted = await input.before_broadcast_intent_append();
        assert.equal(admitted, true, "locked broadcast-intent admission must return literal true");
      }
      order.push("saga_broadcast_intent");
      stateRef.record = {
        ...current,
        state: {
          ...current.state,
          state: "broadcast_intent_committed",
          broadcast_intent_id: BROADCAST_INTENT_ID,
          broadcast_call_may_have_occurred: true,
        },
      };
      const result = await input.adapters.execute_prepared_transaction({
        saga_id: SAGA_ID,
        binding: current.binding,
        record: stateRef.record,
        action: "execute_prepared_transaction",
        broadcast_intent_id: BROADCAST_INTENT_ID,
      });
      order.push("saga_outcome");
      const state =
        result.outcome === "broadcast_not_attempted"
          ? "broadcast_not_attempted"
          : result.outcome === "broadcast_unknown"
            ? "broadcast_unknown"
            : "broadcast_accepted";
      stateRef.record = {
        ...stateRef.record,
        state: {
          ...stateRef.record.state,
          state,
          broadcast_call_may_have_occurred:
            state === "broadcast_not_attempted" ? false : true,
        },
        events: [
          ...(stateRef.record.events || []),
          {
            event_type: result.outcome,
            payload: result.payload,
          },
        ],
      };
      return {
        ok: true,
        status: "applied",
        action: "execute_prepared_transaction",
        state: stateRef.record.state,
      };
    },
  };
}

function fixture(scenario: Scenario) {
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), "void-pk-guarded-broadcast-"),
  );
  fs.mkdirSync(
    path.join(
      root,
      "buy-void-crash-consistent-saga-runtime-v1",
      "sagas",
      SAGA_ID,
      "events",
    ),
    { recursive: true, mode: 0o700 },
  );
  let attempt = preparedAttempt();
  let evidence: any = null;
  const order: string[] = [];
  const calls = {
    signer_address: 0,
    sign: 0,
    guard_claim: 0,
    guard_release: 0,
    broadcaster: 0,
    pipeline: 0,
    evidence: 0,
  };
  let guardClaimed = false;
  const stateRef = {
    record: {
      saga_id: SAGA_ID,
      binding: binding(),
      events: [
        {
          event_type: "saga_initialized",
          payload: { policy_id: POLICY_ID },
        },
      ],
      state: {
        state: "transaction_prepared",
        event_count: 5,
        last_event_id: "voidbvfsge1_" + "a".repeat(64),
        attempt_id: ATTEMPT_ID,
        transaction_hash: custody.signed_transaction_hash,
        nonce: 7,
        broadcast_intent_id: null,
        broadcast_call_may_have_occurred: false,
      },
    },
  };

  const signer = {
    async get_address() {
      calls.signer_address += 1;
      return WALLET;
    },
    async sign_transaction(transaction: any) {
      calls.sign += 1;
      return await baseSigner.sign_transaction(transaction);
    },
  };

  const submission_guard = {
    async claim_submission_once() {
      calls.guard_claim += 1;
      order.push("guard_claim");
      if (guardClaimed) {
        return {
          claimed: false as const,
          reason: "already_claimed",
          existing_transaction_hash:
            custody.signed_transaction_hash,
        };
      }
      guardClaimed = true;
      return { claimed: true as const };
    },
    async release_submission_claim() {
      calls.guard_release += 1;
      order.push("guard_release");
      guardClaimed = false;
      return { released: true as const };
    },
  };

  let activeScenario: Scenario = scenario;
  const broadcaster = {
    async broadcast_signed_transaction(raw: string) {
      calls.broadcaster += 1;
      order.push("broadcaster");
      const parsed = Transaction.from(raw);
      assert.equal(
        parsed.hash?.toLowerCase(),
        custody.signed_transaction_hash,
      );
      if (activeScenario === "accepted") {
        return {
          accepted: true,
          transaction_hash: custody.signed_transaction_hash,
          provider_submission_id: "provider-accepted",
          submission_may_have_occurred: true,
        };
      }
      if (activeScenario === "unknown") {
        return {
          accepted: false,
          transaction_hash: custody.signed_transaction_hash,
          provider_submission_id: "provider-unknown",
          submission_may_have_occurred: true,
        };
      }
      return {
        accepted: false,
        transaction_hash: custody.signed_transaction_hash,
        provider_submission_id: "provider-not-submitted",
        submission_may_have_occurred: false,
      };
    },
  };

  const dependencies: any = {
    read_attempt() {
      return structuredClone(attempt);
    },
    list_intents() {
      return [structuredClone(intent)];
    },
    list_inventory() {
      return [structuredClone(inventory)];
    },
    list_plans() {
      return [structuredClone(plan)];
    },
    read_custody() {
      return structuredClone(custody);
    },
    read_evidence() {
      return evidence ? structuredClone(evidence) : null;
    },
    record_evidence(input: any) {
      calls.evidence += 1;
      order.push("evidence");
      const normalized =
        input.outcome.status === "not_submitted"
          ? "not_submitted"
          : input.outcome.status;
      const event = {
        saga_id: SAGA_ID,
        attempt_id: ATTEMPT_ID,
        broadcast_intent_id: BROADCAST_INTENT_ID,
        transaction_hash: custody.signed_transaction_hash,
        outcome: normalized,
        provider_submission_id:
          input.outcome.provider_submission_id,
        submission_call_performed:
          input.outcome.submission_call_performed,
        submission_may_have_occurred:
          input.outcome.submission_may_have_occurred,
      };
      evidence = {
        saga_id: SAGA_ID,
        attempt_id: ATTEMPT_ID,
        broadcast_intent_id: BROADCAST_INTENT_ID,
        transaction_hash: custody.signed_transaction_hash,
        events: [...(evidence?.events || []), event],
        latest: event,
        terminal: false,
        reconciliation_required:
          normalized === "unknown" ||
          normalized === "accepted",
        automatic_retry_allowed: false,
      };
      return {
        ok: true,
        status: "recorded",
        duplicate: false,
        mutation_performed: true,
        state: structuredClone(evidence),
      };
    },
    async run_pipeline_command(command: any) {
      calls.pipeline += 1;
      order.push("pipeline");
      assert.ok(
        [
          "record_broadcast_unknown",
          "record_broadcast_accepted",
        ].includes(command.action),
      );
      attempt = {
        ...attempt,
        broadcast: {
          schema: "void_buy_void_execution_broadcast_observation_v1",
          marker: VOID_BUY_VOID_EXECUTION_ATTEMPT_JOURNAL_V1,
          attempt_id: ATTEMPT_ID,
          observed_at_ms: command.now_ms,
          void_delivery_tx_hash:
            custody.signed_transaction_hash,
          provider_submission_id:
            command.provider_submission_id || "",
          external_broadcast_observed: true,
          transaction_broadcast_performed_by_this_module: false,
        },
        status: "broadcast",
      };
      return {
        ok: true,
        status: "applied",
        action: command.action,
        applied: true,
        mutation_performed: true,
        result: { attempt: structuredClone(attempt) },
      };
    },
    signer,
    submission_guard,
    broadcaster,
    async load_saga_module() {
      return syntheticSagaModule(stateRef, order);
    },
    now_ms() {
      return 1700000002000;
    },
  };

  return {
    root,
    dependencies,
    calls,
    order,
    stateRef,
    getAttempt: () => attempt,
    getEvidence: () => evidence,
    setScenario(next: Scenario) {
      activeScenario = next;
    },
    setFault(
      fn:
        | ((stage: string) => void | Promise<void>)
        | undefined,
    ) {
      dependencies.fault_inject = fn;
    },
  };
}

function confirmations() {
  return {
    apply: true,
    confirmation:
      VOID_BUY_VOID_PAYMENT_KEYED_GUARDED_BROADCAST_CONFIRMATION_V1,
    runtime_policy_fingerprint_sha256:
      runtimeValidationReady.fingerprint,
    preparation_policy_fingerprint_sha256:
      preparationValidationReady.policy_fingerprint_sha256,
    saga_confirmation:
      "buyVoidAdvanceCrashConsistentFulfillmentSagaV1",
    saga_action_confirmation:
      "buyVoidSagaExecutePreparedTransactionV1",
    signer_confirmation:
      VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_SIGNER_CONFIRMATION_V1,
    broadcast_confirmation:
      VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_BROADCAST_CONFIRMATION_V1,
  };
}

async function invoke(f: ReturnType<typeof fixture>, extra: any = {}) {
  return await runBuyVoidPaymentKeyedGuardedBroadcastV1({
    root_dir: f.root,
    attempt_id: ATTEMPT_ID,
    server_policy: serverPolicy,
    dependencies: f.dependencies,
    ...extra,
  });
}

await proveRealSagaNoSubmissionCallTruth();
proveRealEvidenceNoSubmissionCallTruth();

{
  const f = fixture("accepted");
  const dry = await invoke(f);
  if (dry.ok === false) throw new Error(dry.reason);
  assert.equal(
    dry.marker,
    VOID_BUY_VOID_PAYMENT_KEYED_GUARDED_BROADCAST_COORDINATOR_V1,
  );
  assert.equal(dry.status, "dry_run");
  assert.equal(dry.next_action, "execute_prepared_transaction");
  assert.equal(dry.signer_access_performed, false);
  assert.equal(dry.signing_performed, false);
  assert.equal(dry.submission_guard_claimed, false);
  assert.equal(dry.broadcast_call_performed, false);
  assert.equal(f.calls.sign, 0);
  assert.equal(f.calls.guard_claim, 0);
  assert.equal(f.calls.broadcaster, 0);
}

{
  const f = fixture("accepted");
  const held = await invoke(f, {
    ...confirmations(),
    confirmation: "wrong",
  });
  assert.equal(held.ok, false);
  if (held.ok) throw new Error("confirmation_unexpected_ready");
  assert.equal(
    held.reason,
    "payment_keyed_guarded_broadcast_exact_confirmations_required",
  );
  assert.equal(f.calls.sign, 0);
  assert.equal(f.calls.guard_claim, 0);
  assert.equal(f.calls.broadcaster, 0);
}

{
  const f = fixture("accepted");
  const accepted = await invoke(f, confirmations());
  if (accepted.ok === false) throw new Error(accepted.reason);
  assert.equal(accepted.status, "broadcast_accepted");
  assert.equal(accepted.transaction_broadcast_accepted, true);
  assert.equal(accepted.reconciliation_required, true);
  assert.equal(accepted.money_movement_performed, true);
  assert.equal(f.calls.sign, 1);
  assert.equal(f.calls.guard_claim, 1);
  assert.equal(f.calls.broadcaster, 1);
  assert.equal(f.calls.evidence, 1);
  assert.equal(f.calls.pipeline, 1);
  assert.deepEqual(f.order, [
    "saga_broadcast_intent",
    "guard_claim",
    "broadcaster",
    "evidence",
    "pipeline",
    "saga_outcome",
  ]);
  assert.equal(
    f.stateRef.record.state.state,
    "broadcast_accepted",
  );
  assert.equal(f.getAttempt().status, "broadcast");
  assert.equal(f.getEvidence().latest.outcome, "accepted");
}

{
  const f = fixture("unknown");
  const unknown = await invoke(f, confirmations());
  if (unknown.ok === false) throw new Error(unknown.reason);
  assert.equal(unknown.status, "broadcast_unknown");
  assert.equal(unknown.transaction_broadcast_accepted, false);
  assert.equal(unknown.reconciliation_required, true);
  assert.equal(unknown.money_movement_performed, false);
  assert.equal(unknown.money_movement_may_have_occurred, true);
  assert.equal(f.calls.pipeline, 1);
  assert.equal(f.stateRef.record.state.state, "broadcast_unknown");
  assert.equal(f.getAttempt().status, "broadcast");
  assert.equal(f.getEvidence().latest.outcome, "unknown");
}

{
  const f = fixture("not_broadcast");
  const noSubmit = await invoke(f, confirmations());
  if (noSubmit.ok === false) throw new Error(noSubmit.reason);
  assert.equal(noSubmit.status, "not_broadcast");
  assert.equal(noSubmit.submission_guard_released, true);
  assert.equal(noSubmit.reconciliation_required, false);
  assert.equal(noSubmit.money_movement_may_have_occurred, false);
  assert.equal(f.calls.guard_claim, 1);
  assert.equal(f.calls.guard_release, 1);
  assert.equal(f.calls.pipeline, 0);
  assert.equal(f.getAttempt().status, "prepared");
  assert.equal(
    f.stateRef.record.state.state,
    "broadcast_not_attempted",
  );
  assert.equal(
    f.stateRef.record.state.broadcast_call_may_have_occurred,
    false,
  );
  assert.equal(f.getEvidence().latest.outcome, "not_submitted");
  assert.equal(
    f.getEvidence().latest.submission_call_performed,
    true,
  );
  assert.equal(
    f.getEvidence().latest.submission_may_have_occurred,
    false,
  );

  f.setScenario("accepted");
  const retry = await invoke(f, confirmations());
  if (retry.ok === false) throw new Error(retry.reason);
  assert.equal(retry.status, "broadcast_accepted");
  assert.equal(f.calls.guard_claim, 2);
  assert.equal(f.calls.guard_release, 1);
  assert.equal(f.calls.broadcaster, 2);
  assert.equal(f.calls.pipeline, 1);
  assert.equal(f.getEvidence().latest.outcome, "accepted");
  assert.equal(
    f.stateRef.record.state.state,
    "broadcast_accepted",
  );
}

{
  const f = fixture("accepted");
  f.setFault(async (stage) => {
    if (stage === "after_broadcast_intent_before_guard_claim") {
      throw new Error("synthetic_after_intent");
    }
  });
  const crashed = await invoke(f, confirmations());
  assert.equal(crashed.ok, false);
  if (crashed.ok) throw new Error("intent_crash_unexpected_ready");
  assert.equal(
    f.stateRef.record.state.state,
    "broadcast_intent_committed",
  );
  assert.equal(f.calls.guard_claim, 0);
  assert.equal(f.calls.broadcaster, 0);
  assert.equal(f.calls.evidence, 0);
  assert.equal(f.calls.pipeline, 0);
  f.setFault(undefined);
  const retry = await invoke(f, confirmations());
  assert.equal(retry.ok, false);
  if (retry.ok) throw new Error("intent_retry_unexpected_ready");
  assert.equal(
    retry.reason,
    "payment_keyed_guarded_broadcast_reconciliation_required",
  );
  assert.equal(f.calls.guard_claim, 0);
  assert.equal(f.calls.broadcaster, 0);
}

{
  const f = fixture("accepted");
  f.setFault(async (stage) => {
    if (stage === "after_external_outcome_before_evidence") {
      throw new Error("synthetic_after_external");
    }
  });
  const crashed = await invoke(f, confirmations());
  assert.equal(crashed.ok, false);
  if (crashed.ok) throw new Error("external_crash_unexpected_ready");
  assert.equal(f.calls.guard_claim, 1);
  assert.equal(f.calls.broadcaster, 1);
  assert.equal(f.calls.evidence, 0);
  assert.equal(f.calls.pipeline, 0);
  assert.equal(
    f.stateRef.record.state.state,
    "broadcast_intent_committed",
  );
  f.setFault(undefined);
  const before = { ...f.calls };
  const retry = await invoke(f, confirmations());
  assert.equal(retry.ok, false);
  assert.equal(f.calls.guard_claim, before.guard_claim);
  assert.equal(f.calls.broadcaster, before.broadcaster);
  assert.equal(f.calls.sign, before.sign);
}

{
  const f = fixture("accepted");
  f.setFault(async (stage) => {
    if (stage === "after_evidence_before_projection") {
      throw new Error("synthetic_after_evidence");
    }
  });
  const crashed = await invoke(f, confirmations());
  assert.equal(crashed.ok, false);
  assert.equal(f.calls.evidence, 1);
  assert.equal(f.calls.pipeline, 0);
  assert.equal(f.getEvidence().latest.outcome, "accepted");
  assert.equal(
    f.stateRef.record.state.state,
    "broadcast_intent_committed",
  );
  f.setFault(undefined);
  const before = { ...f.calls };
  const retry = await invoke(f, confirmations());
  assert.equal(retry.ok, false);
  assert.equal(f.calls.guard_claim, before.guard_claim);
  assert.equal(f.calls.broadcaster, before.broadcaster);
  assert.equal(f.calls.sign, before.sign);
}

{
  const f = fixture("accepted");
  f.setFault(async (stage) => {
    if (stage === "after_projection_before_saga") {
      throw new Error("synthetic_after_projection");
    }
  });
  const crashed = await invoke(f, confirmations());
  assert.equal(crashed.ok, false);
  assert.equal(f.calls.evidence, 1);
  assert.equal(f.calls.pipeline, 1);
  assert.equal(f.getAttempt().status, "broadcast");
  assert.equal(
    f.stateRef.record.state.state,
    "broadcast_intent_committed",
  );
  f.setFault(undefined);
  const before = { ...f.calls };
  const retry = await invoke(f, confirmations());
  assert.equal(retry.ok, false);
  assert.equal(f.calls.guard_claim, before.guard_claim);
  assert.equal(f.calls.broadcaster, before.broadcaster);
  assert.equal(f.calls.sign, before.sign);
}

for (const [key, expected] of Object.entries({
  source_only_contract: true,
  runtime_route_mount: false,
  canonical_parent_dispatch: false,
  prepared_attempt_required: true,
  exact_nonce_reservation_required: true,
  exact_preparation_custody_required: true,
  deterministic_resign_before_broadcast_intent: true,
  dispatcher_lease_sample_inside_broadcast_intent_append_lock_when_lease_bound: true,
  stored_signed_hash_and_raw_sha256_must_match: true,
  saga_write_ahead_broadcast_intent_required: true,
  durable_submission_guard_required: true,
  durable_external_outcome_evidence_before_projection: true,
  pipeline_projection_confirmation_server_selected: true,
  definitive_not_submitted_keeps_attempt_prepared: true,
  definitive_not_submitted_explicit_retry_possible: true,
  automatic_retry: false,
  unknown_submission_never_rebroadcast_here: true,
  accepted_submission_never_rebroadcast_here: true,
  raw_signed_transaction_persistence: false,
  raw_signed_transaction_output: false,
  receipt_wait: false,
  inventory_mutation: false,
  public_fulfilled_closeout: false,
})) {
  assert.equal(
    (VOID_BUY_VOID_PAYMENT_KEYED_GUARDED_BROADCAST_AUTHORITY_V1 as any)[key],
    expected,
    key,
  );
}

async function proveCoordinatorSubmissionAdmission() {
  if (initialSigned.ok === false) throw new Error(initialSigned.reason);
  const lowerPreview = await runBuyVoidPaymentKeyedCustodianBroadcastV1({
    request, signed: initialSigned,
  });
  if (lowerPreview.ok === false) throw new Error(lowerPreview.reason);
  const expectedContext = {
    attempt_id: ATTEMPT_ID,
    expected_transaction_hash: custody.signed_transaction_hash,
    submission_idempotency_key: lowerPreview.submission_idempotency_key,
    request_fingerprint_sha256: request.request_fingerprint_sha256,
    unsigned_transaction_fingerprint_sha256: request.unsigned_transaction_fingerprint_sha256,
    transaction_plan_fingerprint_sha256: request.transaction_plan_fingerprint_sha256,
  };
  const names: string[] = [];
  const nextTurn = () => new Promise<void>((resolve) => setImmediate(resolve));
  function contextCheck(value: unknown) {
    assert.equal(Object.isFrozen(value), true);
    assert.deepEqual(value, expectedContext, "admission receives only the six bound identities");
  }
  async function runCase(name: string, body: (f: ReturnType<typeof fixture>) => Promise<void>) {
    const f = fixture("accepted");
    try { await body(f); names.push(name); }
    finally { fs.rmSync(f.root, { recursive: true, force: true }); }
  }
  function veto(f: ReturnType<typeof fixture>, result: Awaited<ReturnType<typeof invoke>>, suffix: string) {
    assert.equal(result.ok, false, "captured admission cannot be replaced");
    if (result.ok !== false) throw new Error("unexpected coordinator admission success");
    assert.equal(result.reason, "payment_keyed_guarded_broadcast_external_held:payment_keyed_submission_admission_" + suffix);
    assert.equal(result.status, "held");
    assert.equal(result.mutation_performed, true);
    assert.equal(result.signer_access_performed, true);
    assert.equal(result.signing_performed, true);
    assert.equal(result.submission_guard_claimed, true);
    assert.equal(result.submission_guard_released, false);
    assert.equal(result.broadcast_call_performed, false);
    assert.equal(result.transaction_broadcast_accepted, false);
    assert.equal(result.reconciliation_required, true);
    assert.equal(result.automatic_retry_allowed, false);
    assert.equal(result.raw_signed_transaction_persisted, false);
    assert.equal(result.raw_signed_transaction_returned, false);
    assert.equal(result.money_movement_performed, false);
    assert.equal(result.money_movement_may_have_occurred, false);
    assert.equal(f.calls.sign, 1);
    assert.equal(f.calls.guard_claim, 1);
    assert.equal(f.calls.guard_release, 0);
    assert.equal(f.calls.broadcaster, 0);
    assert.equal(f.calls.evidence, 0);
    assert.equal(f.calls.pipeline, 0);
    assert.equal(f.getAttempt().status, "prepared");
    assert.equal(f.getEvidence(), null);
    assert.equal(f.stateRef.record.state.state, "broadcast_intent_committed");
    assert.equal(f.order.includes("saga_outcome"), false);
  }
  async function noAutomaticReplay(f: ReturnType<typeof fixture>) {
    const before = { ...f.calls };
    const retry = await invoke(f, confirmations());
    assert.equal(retry.ok, false);
    if (retry.ok !== false) throw new Error("unexpected coordinator admission replay");
    assert.equal(retry.reason, "payment_keyed_guarded_broadcast_reconciliation_required");
    assert.deepEqual(f.calls, before);
  }

  for (const asynchronous of [false, true]) {
    await runCase(asynchronous ? "async_true" : "sync_true", async (f) => {
      const seen: unknown[] = [];
      const admit = (context: unknown) => {
        contextCheck(context); seen.push(context); f.order.push("admission");
        assert.equal(f.calls.guard_claim, 1);
        assert.equal(f.calls.broadcaster, 0);
        assert.equal(f.stateRef.record.state.state, "broadcast_intent_committed");
        return true;
      };
      f.dependencies.before_external_submission = asynchronous
        ? async (context: unknown) => admit(context) : admit;
      const result = await invoke(f, confirmations());
      assert.equal(seen.length, 1, "coordinator must invoke its captured admission");
      assert.equal(result.ok, true);
      assert.equal(result.status, "broadcast_accepted");
      assert.deepEqual(f.order, ["saga_broadcast_intent", "guard_claim", "admission", "broadcaster", "evidence", "pipeline", "saga_outcome"]);
      assert.equal(f.calls.broadcaster, 1);
    });
  }
  const nonTrue: [string, unknown][] = [
    ["false", false], ["null", null], ["undefined", undefined],
    ["zero", 0], ["one", 1], ["string", "true"], ["object", {}],
    ["array", [true]], ["boxed_boolean", new Boolean(true)],
  ];
  for (const [label, value] of nonTrue) {
    await runCase("non_true_" + label, async (f) => {
      let checks = 0;
      f.dependencies.before_external_submission = (context: unknown) => {
        contextCheck(context); checks += 1; return value;
      };
      veto(f, await invoke(f, confirmations()), "held");
      assert.equal(checks, 1);
      await noAutomaticReplay(f);
      assert.equal(checks, 1);
    });
  }
  for (const asynchronous of [false, true]) {
    await runCase(asynchronous ? "rejected_check" : "thrown_check", async (f) => {
      const reject = (context: unknown) => { contextCheck(context); throw new Error("synthetic-admission-detail"); };
      f.dependencies.before_external_submission = asynchronous
        ? async (context: unknown) => reject(context) : reject;
      const result = await invoke(f, confirmations());
      veto(f, result, "error");
      assert.equal(JSON.stringify(result).includes("synthetic-admission-detail"), false);
    });
  }
  for (const remove of [false, true]) {
    await runCase(remove ? "deleted_after_first_await" : "replaced_after_first_await", async (f) => {
      let originalCalls = 0, replacementCalls = 0;
      f.dependencies.before_external_submission = () => { originalCalls += 1; return false; };
      const originalLoader = f.dependencies.load_saga_module;
      f.dependencies.load_saga_module = async () => {
        await Promise.resolve();
        if (remove) delete f.dependencies.before_external_submission;
        else f.dependencies.before_external_submission = () => { replacementCalls += 1; return true; };
        return originalLoader();
      };
      veto(f, await invoke(f, confirmations()), "held");
      assert.equal(originalCalls, 1);
      assert.equal(replacementCalls, 0);
    });
  }
  await runCase("single_accessor_capture", async (f) => {
    let reads = 0, originalCalls = 0;
    Object.defineProperty(f.dependencies, "before_external_submission", {
      get() { reads += 1; return reads === 1 ? () => { originalCalls += 1; return false; } : () => true; },
    });
    veto(f, await invoke(f, confirmations()), "held");
    assert.equal(reads, 1);
    assert.equal(originalCalls, 1);
  });
  for (const invalid of [null, false, 7, "permit", {}]) {
    await runCase("invalid_dependency_" + names.length, async (f) => {
      f.dependencies.before_external_submission = invalid;
      let loaders = 0;
      const load = f.dependencies.load_saga_module;
      f.dependencies.load_saga_module = async () => { loaders += 1; return load(); };
      const result = await invoke(f, confirmations());
      assert.equal(result.ok, false);
      if (result.ok !== false) throw new Error("invalid admission dependency accepted");
      assert.equal(result.reason, "payment_keyed_guarded_broadcast_submission_admission_invalid");
      assert.equal(result.mutation_performed, false);
      assert.equal(loaders, 0);
      assert.equal(Object.values(f.calls).every((n) => n === 0), true);
    });
  }
  await runCase("throwing_accessor", async (f) => {
    let reads = 0;
    Object.defineProperty(f.dependencies, "before_external_submission", {
      get() { reads += 1; throw new Error("synthetic-config-detail"); },
    });
    const result = await invoke(f, confirmations());
    assert.equal(result.ok, false);
    if (result.ok !== false) throw new Error("throwing admission accessor accepted");
    assert.equal(result.reason, "payment_keyed_guarded_broadcast_submission_admission_invalid");
    assert.equal(reads, 1);
    assert.equal(Object.values(f.calls).every((n) => n === 0), true);
    assert.equal(JSON.stringify(result).includes("synthetic-config-detail"), false);
  });
  for (const mode of ["dry_run", "wrong_confirmation", "missing_signer", "refused_claim"] as const) {
    await runCase(mode + "_does_not_call_admission", async (f) => {
      let checks = 0;
      f.dependencies.before_external_submission = () => { checks += 1; return true; };
      if (mode === "missing_signer") f.dependencies.signer = undefined;
      if (mode === "refused_claim") {
        f.dependencies.submission_guard.claim_submission_once = async () => {
          f.calls.guard_claim += 1;
          return { claimed: false, reason: "already_claimed" };
        };
      }
      const extra = mode === "dry_run" ? {} : mode === "wrong_confirmation"
        ? { ...confirmations(), confirmation: "wrong" } : confirmations();
      const result = await invoke(f, extra);
      assert.equal(checks, 0);
      assert.equal(f.calls.broadcaster, 0);
      assert.equal(f.calls.evidence, 0);
      assert.equal(f.calls.pipeline, 0);
      if (mode === "dry_run") { assert.equal(result.ok, true); assert.equal(result.status, "dry_run"); }
      else {
        assert.equal(result.ok, false);
        if (result.ok !== false) throw new Error("unexpected admission precondition success");
        assert.equal(result.reason, mode === "wrong_confirmation"
          ? "payment_keyed_guarded_broadcast_exact_confirmations_required"
          : mode === "missing_signer" ? "payment_keyed_guarded_broadcast_dependencies_required"
          : "payment_keyed_guarded_broadcast_external_held:payment_keyed_submission_guard_already_claimed");
      }
      assert.equal(f.calls.sign, mode === "refused_claim" ? 1 : 0);
    });
  }
  for (const rejects of [false, true]) {
    await runCase(rejects ? "timeout_late_rejection" : "timeout_late_true", async (f) => {
      let resolve!: (value: boolean) => void, reject!: (reason: unknown) => void;
      const pending = new Promise<boolean>((yes, no) => { resolve = yes; reject = no; });
      let claimGrantedAt = 0, checkStarted = 0, checks = 0;
      const originalClaim = f.dependencies.submission_guard.claim_submission_once;
      f.dependencies.submission_guard.claim_submission_once = async (...args: unknown[]) => {
        const claim = await originalClaim(...args);
        if (claim.claimed === true) claimGrantedAt = performance.now();
        return claim;
      };
      f.dependencies.before_external_submission = (context: unknown) => {
        contextCheck(context); checks += 1; checkStarted = performance.now(); return pending;
      };
      try {
        const result = await invoke(f, confirmations());
        const elapsed = performance.now() - claimGrantedAt;
        assert.equal(checks, 1);
        assert.ok(claimGrantedAt > 0 && checkStarted >= claimGrantedAt && Number.isFinite(elapsed) && elapsed >= 4_975,
          "coordinator must preserve the real five-second admission deadline");
        veto(f, result, "timeout");
        if (rejects) reject(new Error("synthetic-late-admission")); else resolve(true);
        await nextTurn(); await nextTurn();
        assert.equal(f.calls.broadcaster, 0);
        assert.equal(f.calls.guard_release, 0);
        assert.equal(f.calls.evidence, 0);
        assert.equal(f.calls.pipeline, 0);
        await noAutomaticReplay(f);
      } finally { resolve(false); }
    });
  }
  assert.equal(names.length, 28);
  assert.equal(new Set(names).size, names.length);
  console.log("VOID_BUY_VOID_GUARDED_COORDINATOR_ADMISSION_V1_GREEN");
  console.log("coordinator_admission_cases=" + names.length);
  console.log("coordinator_admission_captured_before_await=true");
  console.log("coordinator_post_claim_veto_preserves_reconciliation=true");
  console.log("coordinator_timeout_late_broadcast=false");
  console.log("dispatcher_execution_wiring_complete=false");
}
const coordinatorAdmissionDeadline = setTimeout(() => {
  console.error("COORDINATOR_ADMISSION_PROOF_DEADLINE"); process.exit(1);
}, 60_000);
try { await proveCoordinatorSubmissionAdmission(); }
finally { clearTimeout(coordinatorAdmissionDeadline); }

// Actual canonical PostgreSQL adapter/session, injected SQL only: no database server.
class CoordinatorLeaseSqlFixture {
  readonly now = 1_700_000_000_000_000n;
  readonly expiry = this.now + 30_000_000n;
  clock = this.now;
  reads = 0;
  connects = 0;
  releases = 0;
  active = 0;
  locked = false;
  transactionOpen = false;
  absent = false;
  releaseFails = false;
  commitFails: string | null = null;
  calls: string[] = [];
  beforeQuery: ((sql: string) => void | Promise<void>) | null = null;
  job: Record<string, unknown> = {
    attempt_id: ATTEMPT_ID,
    request_fingerprint_sha256: request.request_fingerprint_sha256,
    submitted_at_us: String(this.now - 1n), result_fingerprint_sha256: null,
    published: false, published_gen: null, lease_gen: "1", lease_token: "c".repeat(32),
    lease_owner: "coordinator-lease-proof", lease_expires_us: String(this.expiry), version: "1",
  };
  lease(): BuyVoidPaymentKeyedDispatcherLeaseV1 {
    return {
      marker: DISPATCHER_MARKER, attempt_id: ATTEMPT_ID, lease_gen: 1n,
      lease_token: "c".repeat(32), worker_id: "coordinator-lease-proof", lease_expires_us: this.expiry,
    };
  }
  async connect() { this.connects += 1; return this; }
  async query(sql: string, values: readonly unknown[] = []): Promise<{
    rows: Record<string, unknown>[]; rowCount: number;
  }> {
    this.calls.push(sql);
    this.active += 1;
    if (sql === LEASE_SQL.read_job_for_update) this.reads += 1;
    try {
      if (this.beforeQuery) await this.beforeQuery(sql);
      if (sql === LEASE_SQL.set_lock_timeout || sql === LEASE_SQL.set_statement_timeout) {
        return { rows: [{ value: values[0] }], rowCount: 1 };
      }
      if (sql === LEASE_SQL.advisory_lock) this.locked = true;
      else if (sql === LEASE_SQL.begin_serializable) {
        assert.equal(this.locked, true); this.transactionOpen = true;
      } else if (sql === LEASE_SQL.commit || sql === LEASE_SQL.rollback) {
        assert.equal(this.active, 1, "lease query must settle before transaction completion");
        if (sql === LEASE_SQL.commit && this.commitFails) {
          throw Object.assign(new Error("synthetic private driver error"), { code: this.commitFails });
        }
        this.transactionOpen = false;
      } else if (sql === LEASE_SQL.advisory_unlock) {
        assert.equal(this.active, 1, "lease query must settle before unlocking");
        this.locked = false;
        return { rows: [{ unlocked: true }], rowCount: 1 };
      } else if (sql === LEASE_SQL.read_job_for_update) {
        assert.equal(this.locked, true); assert.equal(this.transactionOpen, true);
        assert.deepEqual(values, [ATTEMPT_ID]);
        return { rows: this.absent ? [] : [{ ...this.job }], rowCount: this.absent ? 0 : 1 };
      } else if (sql === LEASE_SQL.now_us) {
        assert.equal(this.locked, true); assert.equal(this.transactionOpen, true);
        return { rows: [{ now_us: String(this.clock) }], rowCount: 1 };
      } else if (sql !== LEASE_SQL.reset_lock_timeout && sql !== LEASE_SQL.reset_statement_timeout) {
        assert.fail("unexpected coordinator lease SQL");
      }
      return { rows: [], rowCount: 0 };
    } finally { this.active -= 1; }
  }
  release() {
    assert.equal(this.active, 0, "pending SQL must not escape connection lifetime");
    this.releases += 1;
    if (this.releaseFails) throw new Error("synthetic private release error");
  }
  count(sql: string) { return this.calls.filter((value) => value === sql).length; }
}

async function proveCoordinatorLeaseRunnerV1() {
  const names: string[] = [];
  async function one(name: string, body: (f: ReturnType<typeof fixture>, db: CoordinatorLeaseSqlFixture,
    input: any, run: (fingerprint?: string) => Promise<any>) => Promise<void>, scenario: Scenario = "accepted") {
    const f = fixture(scenario);
    const db = new CoordinatorLeaseSqlFixture();
    const input = { root_dir: f.root, attempt_id: ATTEMPT_ID,
      server_policy: structuredClone(serverPolicy), dependencies: f.dependencies, ...confirmations() };
    const runner = createBuyVoidPaymentKeyedGuardedBroadcastLeaseRunnerV1({ pool: db });
    const run = (fingerprint = request.request_fingerprint_sha256) =>
      runner.run_once(db.lease(), fingerprint, input);
    try { await body(f, db, input, run); names.push(name); }
    finally { fs.rmSync(f.root, { recursive: true, force: true }); }
  }
  function boundary(outcome: any, db: CoordinatorLeaseSqlFixture) {
    assert.equal(outcome.session_closed, true);
    assert.equal(outcome.pending_lease_checks_settled, true);
    assert.equal(outcome.lease_checks_started, outcome.lease_checks_completed);
    assert.equal(outcome.automatic_retry_allowed, false);
    assert.equal(outcome.session_exposes_lease_token, false);
    assert.equal(outcome.session_exposes_transaction_interface, false);
    assert.equal(db.count(LEASE_SQL.begin_serializable), 1);
    assert.equal(db.connects, 1); assert.equal(db.releases, 1); assert.equal(db.active, 0);
  }
  for (const scenario of ["accepted", "unknown", "not_broadcast"] as const) {
    await one("outcome_" + scenario, async (f, db, _input, run) => {
      const result = await run(); boundary(result, db);
      assert.equal(result.status, "completed");
      assert.equal(result.result.value.ok, true);
      assert.equal(result.result.value.status, scenario === "accepted" ? "broadcast_accepted" :
        scenario === "unknown" ? "broadcast_unknown" : "not_broadcast");
      assert.equal(f.calls.broadcaster, 1);
      assert.equal(result.lease_checks_started, 6, "lease runner must execute all six admission samples");
      assert.equal(result.result.value.raw_signed_transaction_returned, false);
      const reads = db.calls.filter((s) => s === LEASE_SQL.read_job_for_update || s === LEASE_SQL.now_us);
      assert.deepEqual(reads, Array.from({ length: 6 }, () => [LEASE_SQL.read_job_for_update, LEASE_SQL.now_us]).flat());
    }, scenario);
  }
  for (const mode of ["dry", "confirmation", "dependencies"] as const) {
    await one(mode, async (f, db, input, run) => {
      if (mode === "dry") input.apply = false;
      if (mode === "confirmation") input.confirmation = "not-authorized";
      if (mode === "dependencies") delete input.dependencies.signer;
      const result = await run(); boundary(result, db);
      // Session completion describes the database callback, NOT broadcast success.
      assert.equal(result.status, "completed");
      assert.equal(result.result.value.status, mode === "dry" ? "dry_run" : "held");
      assert.equal(f.calls.sign, 0); assert.equal(f.calls.broadcaster, 0);
      assert.equal(result.lease_checks_started, 1);
    });
  }
  await one("missing_dispatcher_job", async (f, db, _input, run) => {
    db.absent = true;
    const result = await run(); boundary(result, db);
    assert.equal(result.action_started, false); assert.equal(result.result, null);
    assert.equal(result.reason, "job_missing"); assert.equal(f.calls.signer_address, 0);
  });
  for (const [cut, read] of [["entry", 1], ["address", 2], ["sign", 3], ["supervisor", 4], ["locked_append", 5], ["post_claim", 6]] as const) {
    await one("expiry_" + cut, async (f, db, _input, run) => {
      db.beforeQuery = async (sql) => {
        if (sql === LEASE_SQL.read_job_for_update && db.reads === read) {
          await Promise.resolve(); db.clock = db.expiry;
        }
      };
      const result = await run(); boundary(result, db);
      assert.equal(result.reason, "lease_expired", "lease must be sampled at " + cut);
      assert.equal(f.calls.signer_address, read > 2 ? 1 : 0);
      assert.equal(f.calls.sign, read > 3 ? 1 : 0);
      assert.equal(f.calls.broadcaster, 0, "expired lease cannot reach broadcaster at " + cut);
      assert.equal(f.calls.guard_claim, read === 6 ? 1 : 0);
      if (read === 5) {
        assert.equal(f.stateRef.record.state.state, "transaction_prepared",
          "expired dispatcher lease must refuse the write-ahead intent inside the append lock");
        assert.equal(f.order.includes("saga_broadcast_intent"), false);
      }
      assert.equal(f.calls.guard_release, 0);
      if (read === 1) assert.equal(result.result, null);
      else {
        assert.equal(result.result.value.ok, false);
        assert.equal(result.result.value.reconciliation_required, true);
        assert.equal(result.result.value.signer_access_performed, read > 2);
        assert.equal(result.result.value.signing_performed, read > 3);
        assert.equal(result.result.value.broadcast_call_performed, false);
      }
    });
  }
  for (const mode of ["attempt", "late_attempt", "fingerprint"] as const) {
    await one("identity_" + mode, async (f, db, input, run) => {
      if (mode === "attempt") input.attempt_id = "f".repeat(64);
      if (mode === "late_attempt") db.beforeQuery = (sql) => {
        if (sql === LEASE_SQL.now_us) input.attempt_id = "f".repeat(64);
      };
      const selected = mode === "fingerprint" ? "d".repeat(64) : request.request_fingerprint_sha256;
      if (mode === "fingerprint") db.job.request_fingerprint_sha256 = selected;
      const result = await run(selected); boundary(result, db);
      assert.equal(result.result.value.reason, "payment_keyed_guarded_broadcast_dispatcher_identity_mismatch");
      assert.equal(f.calls.signer_address, 0); assert.equal(f.calls.sign, 0); assert.equal(f.calls.broadcaster, 0);
    });
  }
  for (const method of ["get_address", "sign_transaction"] as const) {
    await one("signer_failure_" + method, async (f, db, _input, run) => {
      const original = f.dependencies.signer![method] as (...args: any[]) => Promise<any>;
      (f.dependencies.signer as any)[method] = async (...args: any[]) => {
        await Reflect.apply(original, f.dependencies.signer, args);
        throw new Error("synthetic signer failed");
      };
      const result = await run(); boundary(result, db);
      assert.equal(result.result.value.ok, false);
      assert.equal(result.result.value.signer_access_performed, true);
      assert.equal(result.result.value.signing_performed, method === "sign_transaction");
      assert.equal(f.calls.broadcaster, 0);
    });
  }
  for (const read of [2, 3, 5]) {
    await one("prepared_drift_during_sql_" + read, async (f, db, _input, run) => {
      db.beforeQuery = async (sql) => {
        if (sql === LEASE_SQL.read_job_for_update && db.reads === read) {
          await Promise.resolve(); f.stateRef.record.state.nonce += 1;
        }
      };
      const result = await run(); boundary(result, db);
      assert.equal(result.result.value.reason, "payment_keyed_guarded_broadcast_prepared_state_changed");
      assert.equal(f.calls.signer_address, read >= 3 ? 1 : 0);
      assert.equal(f.calls.sign, read >= 5 ? 1 : 0);
      assert.equal(f.calls.broadcaster, 0);
      if (read === 5) {
        assert.equal(f.stateRef.record.state.state, "transaction_prepared",
          "prepared-state drift during locked SQL must refuse the write-ahead intent");
        assert.equal(f.order.includes("saga_broadcast_intent"), false);
      }
    });
  }
  for (const mode of ["false", "throw", "expires"] as const) {
    await one("original_veto_" + mode, async (f, db, input, run) => {
      let vetoCalls = 0;
      input.dependencies.before_external_submission = async () => {
        vetoCalls += 1;
        assert.equal(db.reads, 5, "original veto must follow locked append admission and precede final lease sample");
        if (mode === "throw") throw new Error("synthetic veto failure");
        if (mode === "expires") db.clock = db.expiry;
        return mode !== "false";
      };
      const result = await run(); boundary(result, db);
      assert.equal(vetoCalls, 1); assert.equal(f.calls.broadcaster, 0);
      assert.equal(f.calls.guard_claim, 1); assert.equal(f.calls.guard_release, 0);
      assert.equal(result.result.value.reconciliation_required, true);
      assert.equal(db.reads, mode === "expires" ? 6 : 5);
    });
  }
  await one("query_failure_before_address", async (f, db, _input, run) => {
    db.beforeQuery = (sql) => {
      if (sql === LEASE_SQL.read_job_for_update && db.reads === 2) throw new Error("private SQL detail");
    };
    const result = await run(); boundary(result, db);
    assert.equal(result.reason, "lease_read_failed"); assert.equal(f.calls.signer_address, 0);
    assert.equal(result.result.value.reason, "payment_keyed_guarded_broadcast_dispatcher_lease_held");
  });
  for (const fault of ["40001", "40P01", "release"] as const) {
    await one("accepted_then_store_failure_" + fault, async (f, db, _input, run) => {
      if (fault === "release") db.releaseFails = true; else db.commitFails = fault;
      const result = await run(); boundary(result, db);
      assert.equal(result.status, "reconciliation_required");
      assert.equal(result.store_completion_confirmed, false);
      assert.equal(result.action_returned, true);
      assert.equal(result.result.value.status, "broadcast_accepted");
      assert.equal(result.result.value.transaction_broadcast_accepted, true);
      assert.equal(f.calls.broadcaster, 1); assert.equal(f.calls.sign, 1);
    });
  }
  for (const blocked of ["row", "clock", "veto"] as const) {
    await one("post_claim_timeout_" + blocked, async (f, db, input, run) => {
      let entered!: () => void, resume!: () => void;
      const arrival = new Promise<void>((yes) => { entered = yes; });
      const pause = new Promise<void>((yes) => { resume = yes; });
      const selected = blocked === "row" ? LEASE_SQL.read_job_for_update : LEASE_SQL.now_us;
      if (blocked === "veto") {
        input.dependencies.before_external_submission = async () => { entered(); await pause; return true; };
      } else {
        db.beforeQuery = async (sql) => {
          if (sql === selected && db.reads === 6) { entered(); await pause; }
        };
      }
      let settled = false;
      const running = run().then((outcome) => { settled = true; return outcome; });
      await arrival;
      try {
        const start = performance.now();
        await new Promise<void>((yes) => setTimeout(yes, 5200));
        assert.ok(performance.now() - start >= 5000, "natural custodian timeout must elapse");
        assert.equal(f.calls.broadcaster, 0); assert.equal(f.calls.guard_release, 0);
        if (blocked !== "veto") {
          assert.equal(settled, false, "owned SQL must drain before session completion");
          assert.equal(db.count(LEASE_SQL.commit), 0); assert.equal(db.count(LEASE_SQL.rollback), 0);
          assert.equal(db.count(LEASE_SQL.advisory_unlock), 0); assert.equal(db.releases, 0);
        }
      } finally { resume(); }
      const result = await running; boundary(result, db);
      await new Promise<void>((yes) => setImmediate(yes));
      assert.equal(result.result.value.ok, false); assert.equal(result.result.value.reconciliation_required, true);
      assert.equal(result.result.value.broadcast_call_performed, false);
      assert.equal(f.calls.broadcaster, 0);
      assert.equal(db.reads, blocked === "veto" ? 5 : 6, "late veto cannot start SQL after session close");
    });
  }
  await one("identity_drift_during_module_load", async (f, db, input, run) => {
    const original = input.dependencies.load_saga_module;
    input.dependencies.load_saga_module = async () => {
      const module = await original();
      // Keep the input selector invalidation before reconstruction explicit.
      input.attempt_id = "f".repeat(64);
      return module;
    };
    const result = await run(); boundary(result, db);
    assert.equal(result.result.value.ok, false);
    assert.equal(f.calls.signer_address, 0); assert.equal(f.calls.sign, 0); assert.equal(f.calls.broadcaster, 0);
  });
  assert.equal(names.length, 32);
  assert.equal(new Set(names).size, names.length);
  console.log("VOID_BUY_VOID_GUARDED_COORDINATOR_LEASE_RUNNER_V1_GREEN");
  console.log("coordinator_lease_runner_cases=" + names.length);
  console.log("canonical_nonreplayable_session_composed=true");
  console.log("lease_checked_before_signer_and_post_claim_submission=true");
  console.log("pending_post_claim_sql_owned_through_timeout=true");
  console.log("known_coordinator_result_retained_after_store_failure=true");
  console.log("database_check_inside_saga_append_lock=true");
  console.log("expired_dispatcher_lease_writes_no_broadcast_intent=true");
  console.log("production_execution_entrypoint_mounted=false");
}
const leaseRunnerDeadline = setTimeout(() => {
  console.error("COORDINATOR_LEASE_RUNNER_PROOF_DEADLINE"); process.exit(1);
}, 120_000);
try { await proveCoordinatorLeaseRunnerV1(); }
finally { clearTimeout(leaseRunnerDeadline); }

async function proveCoordinatorExpectedPredecessorV1() {
  const names: string[] = [];
  for (const mode of ["forward", "missing_count", "invalid_hash", "count_limit", "changed_at_supervisor"] as const) {
    const f = fixture("accepted");
    try {
      const expected = {
        saga_id: SAGA_ID,
        event_count: f.stateRef.record.state.event_count,
        last_event_id: f.stateRef.record.state.last_event_id,
      };
      if (mode === "missing_count") delete (f.stateRef.record.state as any).event_count;
      if (mode === "invalid_hash") f.stateRef.record.state.last_event_id = "invalid";
      if (mode === "count_limit") f.stateRef.record.state.event_count = 64;
      const load = f.dependencies.load_saga_module;
      let received: unknown;
      let supervisorCalls = 0;
      f.dependencies.load_saga_module = async () => {
        const saga = await load();
        return {
          ...saga,
          async runSagaSupervisorTickV1(input: any) {
            supervisorCalls += 1;
            received = structuredClone(input.expected_execute_predecessor);
            if (mode === "changed_at_supervisor") throw new Error("supervisor_execute_predecessor_changed");
            return await saga.runSagaSupervisorTickV1(input);
          },
        };
      };
      const result = await runBuyVoidPaymentKeyedGuardedBroadcastV1({
        root_dir: f.root, attempt_id: ATTEMPT_ID,
        server_policy: structuredClone(serverPolicy), dependencies: f.dependencies,
        ...confirmations(),
      });
      if (mode === "forward" || mode === "changed_at_supervisor") {
        assert.equal(supervisorCalls, 1);
        assert.deepEqual(received, expected, "coordinator must forward the detached approved predecessor");
        assert.equal(f.calls.signer_address, 1); assert.equal(f.calls.sign, 1);
      } else {
        assert.equal(supervisorCalls, 0);
        assert.equal(f.calls.signer_address, 0); assert.equal(f.calls.sign, 0);
      }
      if (mode === "forward") {
        assert.equal(result.ok, true); assert.equal(result.status, "broadcast_accepted");
        assert.equal(f.calls.broadcaster, 1);
      } else {
        assert.equal(result.ok, false);
        if (result.ok !== false) throw new Error("expected predecessor refusal");
        assert.equal(result.reason, mode === "changed_at_supervisor"
          ? "supervisor_execute_predecessor_changed"
          : "payment_keyed_guarded_broadcast_prepared_saga_head_invalid");
        assert.equal(result.reconciliation_required, true);
        assert.equal(result.mutation_performed, false);
        assert.equal(result.signer_access_performed, mode === "changed_at_supervisor");
        assert.equal(result.signing_performed, mode === "changed_at_supervisor");
        assert.equal(f.calls.guard_claim, 0); assert.equal(f.calls.guard_release, 0);
        assert.equal(f.calls.broadcaster, 0); assert.equal(f.calls.pipeline, 0);
        assert.equal(f.calls.evidence, 0); assert.deepEqual(f.order, []);
        assert.equal(result.automatic_retry_allowed, false);
        assert.equal(result.money_movement_performed, false);
        assert.equal(result.money_movement_may_have_occurred, false);
      }
      names.push(mode);
    } finally { fs.rmSync(f.root, { recursive: true, force: true }); }
  }
  assert.equal(names.length, 5);
  console.log("VOID_BUY_VOID_COORDINATOR_EXECUTE_PREDECESSOR_V1_GREEN");
  console.log("coordinator_execute_predecessor_cases=" + names.length);
}
const coordinatorPredecessorDeadline = setTimeout(() => {
  console.error("COORDINATOR_PREDECESSOR_PROOF_DEADLINE"); process.exit(1);
}, 60_000);
try { await proveCoordinatorExpectedPredecessorV1(); }
finally { clearTimeout(coordinatorPredecessorDeadline); }

async function proveCoordinatorPreparedStateRevalidationV1() {
  type Fixture = ReturnType<typeof fixture>;
  const names: string[] = [];
  async function runCase(name: string, body: (f: Fixture, input: any) => Promise<void>) {
    const f = fixture("accepted");
    const input = {
      root_dir: f.root, attempt_id: ATTEMPT_ID,
      server_policy: structuredClone(serverPolicy),
      dependencies: f.dependencies, ...confirmations(),
    };
    // Give the synthetic saga the same head fields used by the real store.
    Object.assign(f.stateRef.record.state, {
      event_count: 4, last_sequence: 3,
      last_event_id: "voidbvfsge1_" + "a".repeat(64),
      last_fencing_token: 1,
    });
    try { await body(f, input); names.push(name); }
    finally { fs.rmSync(f.root, { recursive: true, force: true }); }
  }
  function unchangedEffectCounts(f: Fixture, addresses: number, signs: number) {
    assert.deepEqual(f.calls, {
      signer_address: addresses, sign: signs, guard_claim: 0,
      guard_release: 0, broadcaster: 0, pipeline: 0, evidence: 0,
    }, "prepared-state HOLD must precede the next delegated effect");
    assert.deepEqual(f.order, [], "prepared-state drift must not enter the saga supervisor");
    assert.equal(f.getEvidence(), null);
  }
  function heldForDrift(f: Fixture, result: any, cut: string, addresses: number, signs: number) {
    assert.equal(result.ok, false, "changed prepared state must HOLD");
    assert.equal(result.status, "held");
    assert.equal(result.applied, true);
    assert.equal(result.stage, cut === "after_sign" ? "saga_reconstruction" : "signing",
      "prepared-state gate must run at the expected cut");
    assert.equal(result.reason, "payment_keyed_guarded_broadcast_prepared_state_changed");
    assert.equal(result.mutation_performed, false);
    assert.equal(result.signer_access_performed, addresses > 0);
    assert.equal(result.signing_performed, signs > 0);
    assert.equal(result.reconciliation_required, true);
    for (const key of ["submission_guard_claimed", "submission_guard_released",
      "broadcast_call_performed", "transaction_broadcast_accepted",
      "raw_signed_transaction_persisted", "raw_signed_transaction_returned",
      "automatic_retry_allowed", "money_movement_performed", "money_movement_may_have_occurred"]) {
      assert.equal(result[key], false, key);
    }
    unchangedEffectCounts(f, addresses, signs);
  }
  const drifts: [string, (f: Fixture, input: any) => () => void][] = [
    ["custody_identity", (f) => {
      const data = structuredClone(custody);
      f.dependencies.read_custody = () => structuredClone(data);
      return () => { data.custody_fingerprint_sha256 = "f".repeat(64); };
    }],
    ["custody_request", (f) => {
      const data = structuredClone(custody);
      f.dependencies.read_custody = () => structuredClone(data);
      return () => { data.request.idempotency_key_sha256 = "b".repeat(64); };
    }],
    ["plan", (f) => {
      const data = structuredClone(plan);
      f.dependencies.list_plans = () => [structuredClone(data)];
      return () => { data.gas_limit = "120001"; };
    }],
    ["attempt", (f) => {
      const data = structuredClone(f.getAttempt());
      f.dependencies.read_attempt = () => structuredClone(data);
      return () => { data.prepared!.prepared_at_ms += 1; };
    }],
    ["intent", (f) => {
      const data = structuredClone(intent);
      f.dependencies.list_intents = () => [structuredClone(data)];
      return () => { data.claim.request_id = "changed-request"; };
    }],
    ["inventory", (f) => {
      const data = structuredClone(inventory);
      f.dependencies.list_inventory = () => [structuredClone(data)];
      return () => { data.reserved_void_units = "2000001"; };
    }],
    ["saga_head", (f) => () => {
      Object.assign(f.stateRef.record.state, { last_event_id: "voidbvfsge1_" + "b".repeat(64) });
    }],
    ["saga_binding", (f) => () => {
      f.stateRef.record.binding.request_key_sha256 = "b".repeat(64);
    }],
    ["evidence", (f) => {
      let present = false;
      f.dependencies.read_evidence = () => present ? { attempt_id: "b".repeat(64) } : null;
      return () => { present = true; };
    }],
    ["policy", (_f, input) => () => {
      input.server_policy.preparation_policy.max_gas_limit = "300001";
    }],
  ];
  for (const cut of ["before_address", "after_address", "after_sign"] as const) {
    for (const [name, configure] of drifts) {
      await runCase(cut + "_" + name, async (f, input) => {
        const change = configure(f, input);
        if (cut === "before_address") {
          const read = f.dependencies.read_attempt;
          let reads = 0;
          f.dependencies.read_attempt = (...args: unknown[]) => {
            if (++reads === 2) change();
            return read(...args);
          };
        } else if (cut === "after_address") {
          const get = f.dependencies.signer.get_address;
          f.dependencies.signer.get_address = async () => {
            const result = await get(); change(); await Promise.resolve(); return result;
          };
        } else {
          const sign = f.dependencies.signer.sign_transaction;
          f.dependencies.signer.sign_transaction = async (transaction: any) => {
            const result = await sign(transaction); change(); await Promise.resolve(); return result;
          };
        }
        const result = await runBuyVoidPaymentKeyedGuardedBroadcastV1(input);
        heldForDrift(f, result, cut, cut === "before_address" ? 0 : 1, cut === "after_sign" ? 1 : 0);
      });
    }
  }
  await runCase("unchanged_accepts", async (f, input) => {
    const result = await runBuyVoidPaymentKeyedGuardedBroadcastV1(input);
    assert.equal(result.ok, true); assert.equal(result.status, "broadcast_accepted");
    assert.equal(f.calls.signer_address, 1); assert.equal(f.calls.sign, 1);
    assert.equal(f.calls.broadcaster, 1);
  });
  await runCase("reordered_fields_accept", async (f, input) => {
    let reads = 0;
    f.dependencies.read_custody = () => ++reads % 2
      ? structuredClone(custody)
      : Object.fromEntries(Object.entries(structuredClone(custody)).reverse());
    const result = await runBuyVoidPaymentKeyedGuardedBroadcastV1(input);
    assert.equal(result.ok, true); assert.equal(result.status, "broadcast_accepted");
    assert.ok(reads >= 4); assert.equal(f.calls.broadcaster, 1);
  });
  for (const mode of ["dry", "wrong_confirmation"] as const) {
    await runCase(mode + "_no_effect_recheck", async (f, input) => {
      let reads = 0;
      const read = f.dependencies.read_custody;
      f.dependencies.read_custody = (...args: unknown[]) => { reads += 1; return read(...args); };
      if (mode === "dry") input.apply = false; else input.confirmation = "wrong";
      const result = await runBuyVoidPaymentKeyedGuardedBroadcastV1(input);
      assert.equal(result.ok, mode === "dry"); assert.equal(reads, 1);
      unchangedEffectCounts(f, 0, 0);
    });
  }
  for (const operation of ["address", "sign"] as const) {
    await runCase(operation + "_delegated_error_truth", async (f, input) => {
      if (operation === "address") f.dependencies.signer.get_address = async () => {
        f.calls.signer_address += 1; throw new Error("synthetic-delegated-address-error");
      };
      else f.dependencies.signer.sign_transaction = async () => {
        f.calls.sign += 1; throw new Error("synthetic-delegated-sign-error");
      };
      const result = await runBuyVoidPaymentKeyedGuardedBroadcastV1(input);
      assert.equal(result.ok, false);
      if (result.ok !== false) throw new Error("unexpected delegated success");
      assert.equal(result.reason, operation === "address"
        ? "payment_keyed_custodian_signer_address_read_failed"
        : "payment_keyed_custodian_signer_sign_failed");
      assert.equal(result.signer_access_performed, true);
      assert.equal(result.signing_performed, operation === "sign");
      unchangedEffectCounts(f, 1, operation === "sign" ? 1 : 0);
    });
  }
  for (const field of ["apply", "confirmation"] as const) {
    await runCase("revoked_" + field + "_after_address", async (f, input) => {
      const get = f.dependencies.signer.get_address;
      f.dependencies.signer.get_address = async () => {
        const value = await get(); input[field] = field === "apply" ? false : "revoked"; return value;
      };
      heldForDrift(f, await runBuyVoidPaymentKeyedGuardedBroadcastV1(input), "after_address", 1, 0);
    });
  }
  await runCase("shared_snapshot_alias_rejected", async (f, input) => {
    const data = structuredClone(custody);
    f.dependencies.read_custody = () => data;
    const get = f.dependencies.signer.get_address;
    f.dependencies.signer.get_address = async () => {
      const value = await get(); data.custody_fingerprint_sha256 = "f".repeat(64); return value;
    };
    heldForDrift(f, await runBuyVoidPaymentKeyedGuardedBroadcastV1(input), "after_address", 1, 0);
  });
  for (const cut of ["fault_hook", "clock_callback"] as const) {
    await runCase("drift_in_" + cut, async (f, input) => {
      const change = () => { Object.assign(f.stateRef.record.state, { last_sequence: 4 }); };
      if (cut === "fault_hook") f.setFault(async (stage) => {
        if (stage === "after_resign_before_broadcast_intent") { await Promise.resolve(); change(); }
      });
      else {
        const clock = f.dependencies.now_ms;
        f.dependencies.now_ms = () => { const value = clock(); change(); return value; };
      }
      heldForDrift(f, await runBuyVoidPaymentKeyedGuardedBroadcastV1(input), "after_sign", 1, 1);
    });
  }
  await runCase("snapshot_failure_no_effect", async (f, input) => {
    const data = structuredClone(custody);
    data.synthetic_uncloneable = () => "not-admitted";
    f.dependencies.read_custody = () => data;
    const result = await runBuyVoidPaymentKeyedGuardedBroadcastV1(input);
    assert.equal(result.ok, false);
    if (result.ok !== false) throw new Error("uncloneable snapshot accepted");
    assert.equal(result.reason, "payment_keyed_guarded_broadcast_prepared_snapshot_invalid");
    unchangedEffectCounts(f, 0, 0);
  });
  for (const invalid of ["missing_address", "invalid_sign", "throwing_method_accessor"] as const) {
    await runCase(invalid + "_no_delegation", async (f, input) => {
      if (invalid === "missing_address") delete f.dependencies.signer.get_address;
      else if (invalid === "invalid_sign") f.dependencies.signer.sign_transaction = 7;
      else Object.defineProperty(f.dependencies.signer, "get_address", {
        get() { throw new Error("synthetic-private-adapter-detail"); },
      });
      const result = await runBuyVoidPaymentKeyedGuardedBroadcastV1(input);
      assert.equal(result.ok, false);
      if (result.ok !== false) throw new Error("invalid signer methods admitted");
      assert.equal(result.reason, "payment_keyed_custodian_signer_dependency_required");
      assert.equal(result.signer_access_performed, false);
      assert.equal(result.signing_performed, false);
      assert.equal(JSON.stringify(result).includes("synthetic-private-adapter-detail"), false);
      unchangedEffectCounts(f, 0, 0);
    });
  }
  await runCase("signer_method_receiver_preserved", async (f, input) => {
    const signer = f.dependencies.signer;
    const get = signer.get_address, sign = signer.sign_transaction;
    signer.get_address = function (this: unknown) {
      assert.equal(this, signer); return get();
    };
    signer.sign_transaction = function (this: unknown, transaction: any) {
      assert.equal(this, signer); return sign(transaction);
    };
    const result = await runBuyVoidPaymentKeyedGuardedBroadcastV1(input);
    assert.equal(result.ok, true); assert.equal(result.status, "broadcast_accepted");
    assert.equal(f.calls.sign, 1); assert.equal(f.calls.broadcaster, 1);
  });
  await runCase("captured_signer_method_survives_replacement", async (f, input) => {
    const get = f.dependencies.signer.get_address;
    let replacementCalls = 0;
    f.dependencies.signer.get_address = async () => {
      const value = await get();
      f.dependencies.signer.sign_transaction = async () => {
        replacementCalls += 1; throw new Error("unexpected replacement signer");
      };
      return value;
    };
    const result = await runBuyVoidPaymentKeyedGuardedBroadcastV1(input);
    assert.equal(result.ok, true); assert.equal(result.status, "broadcast_accepted");
    assert.equal(replacementCalls, 0); assert.equal(f.calls.sign, 1);
    assert.equal(f.calls.broadcaster, 1);
  });
  for (const method of ["get_address", "sign_transaction"] as const) {
    await runCase("baseline_before_" + method + "_accessor", async (f, input) => {
      const data = structuredClone(custody);
      f.dependencies.read_custody = () => data;
      const original = f.dependencies.signer[method];
      let accessorReads = 0;
      Object.defineProperty(f.dependencies.signer, method, {
        get() {
          accessorReads += 1;
          data.custody_fingerprint_sha256 = "f".repeat(64);
          return original;
        },
      });
      const result = await runBuyVoidPaymentKeyedGuardedBroadcastV1(input);
      assert.equal(accessorReads, 1, "successful signer accessor must execute once");
      assert.equal(result.ok, false, "baseline must precede " + method + " accessor");
      heldForDrift(f, result, "before_address", 0, 0);
    });
  }
  assert.equal(names.length, 49);
  assert.equal(new Set(names).size, names.length);
  console.log("VOID_BUY_VOID_GUARDED_PREPARED_STATE_REVALIDATION_V1_GREEN");
  console.log("prepared_state_revalidation_cases=" + names.length);
  console.log("prepared_state_checked_before_address_and_sign=true");
  console.log("prepared_state_checked_after_sign_and_hooks=true");
  console.log("delegated_signer_effect_truth_preserved=true");
  console.log("prepared_snapshot_before_signer_accessors=true");
  console.log("dispatcher_lease_and_atomic_append_fence_complete=false");
}
const preparedStateProofDeadline = setTimeout(() => {
  console.error("PREPARED_STATE_REVALIDATION_PROOF_DEADLINE"); process.exit(1);
}, 60_000);
try { await proveCoordinatorPreparedStateRevalidationV1(); }
finally { clearTimeout(preparedStateProofDeadline); }

console.log("VOID_BUY_VOID_PAYMENT_KEYED_GUARDED_BROADCAST_V1_PROOF_GREEN");
console.log("write_ahead_broadcast_intent_before_guard_claim=true");
console.log("exact_custody_request_resigned=true");
console.log("signed_hash_and_raw_sha256_revalidated=true");
console.log("external_outcome_evidence_before_projection=true");
console.log("accepted_projection=true");
console.log("unknown_projection=true");
console.log("definitive_not_submitted_attempt_remains_prepared=true");
console.log("definitive_not_submitted_broadcaster_call_truth_preserved=true");
console.log("definitive_not_submitted_explicit_retry=true");
console.log("automatic_retry=false");
console.log("crash_after_intent_no_broadcast=true");
console.log("crash_after_external_never_rebroadcast=true");
console.log("crash_after_evidence_never_rebroadcast=true");
console.log("crash_after_projection_never_rebroadcast=true");
console.log("raw_signed_transaction_persisted=false");
console.log("raw_signed_transaction_returned=false");
console.log("receipt_wait=false");
console.log("inventory_mutation=false");
console.log("public_fulfilled_closeout=false");
console.log("runtime_route_mount=false");
