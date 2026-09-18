#!/usr/bin/env node
import assert from "node:assert/strict";
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
} from "../src/economic/buy_void_payment_keyed_guarded_broadcast_v1.js";
import {
  readBuyVoidSagaBroadcastEvidenceStateV1,
  recordBuyVoidSagaBroadcastEvidenceV1,
} from "../src/economic/buy_void_saga_broadcast_evidence_journal_v1.js";

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
    "../tools/buy-void-crash-consistent-fulfillment-saga-v1.mjs",
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
      runtimeValidation.fingerprint,
    preparation_policy_fingerprint_sha256:
      preparationValidation.policy_fingerprint_sha256,
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
    root_dir: "/tmp/void-payment-keyed-guarded-broadcast-proof",
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
