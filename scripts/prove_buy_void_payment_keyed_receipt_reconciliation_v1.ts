#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Interface, id } from "ethers";

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
  validateBuyVoidPaymentKeyedFulfillmentReceiptPolicyV1,
} from "../src/economic/buy_void_payment_keyed_fulfillment_receipt_v1.js";
import {
  VOID_BUY_VOID_PAYMENT_KEYED_RECEIPT_OUTCOME_AUTHORITY_V1,
  runBuyVoidPaymentKeyedReceiptOutcomeV1,
  type BuyVoidPaymentKeyedReceiptOutcomeDecisionV1,
} from "../src/economic/buy_void_payment_keyed_receipt_outcome_v1.js";
import {
  VOID_BUY_VOID_PAYMENT_KEYED_RECEIPT_EVIDENCE_AUTHORITY_V1,
  readBuyVoidPaymentKeyedReceiptEvidenceV1,
  recordBuyVoidPaymentKeyedReceiptEvidenceV1,
} from "../src/economic/buy_void_payment_keyed_receipt_evidence_v1.js";
import {
  VOID_BUY_VOID_PAYMENT_KEYED_RECEIPT_RECONCILIATION_AUTHORITY_V1,
  VOID_BUY_VOID_PAYMENT_KEYED_RECEIPT_RECONCILIATION_CONFIRMATION_V1,
  VOID_BUY_VOID_PAYMENT_KEYED_RECEIPT_RECONCILIATION_V1,
  runBuyVoidPaymentKeyedReceiptReconciliationV1,
} from "../src/economic/buy_void_payment_keyed_receipt_reconciliation_v1.js";

const ATTEMPT_ID = "1".repeat(64);
const INVENTORY_ID = "2".repeat(64);
const REQUEST_KEY = "3".repeat(64);
const LOCAL_PAYMENT_KEY = "4".repeat(64);
const REQUEST_ID = "payment-keyed-receipt-reconciliation-proof";
const INSTRUCTION_ID = "proof-instruction-v1";
const PAYMENT_TX = "0x" + "a".repeat(64);
const IDENTITY = "voidpay1:base:" + PAYMENT_TX + ":7";
const DELIVERY = "0x3333333333333333333333333333333333333333";
const CONTRACT = "0x4444444444444444444444444444444444444444";
const WALLET = "0x5555555555555555555555555555555555555555";
const TOKEN = "0x6666666666666666666666666666666666666666";
const TX_HASH = "0x" + "7".repeat(64);
const BLOCK_HASH = "0x" + "8".repeat(64);
const SAGA_ID = "voidbvfsg1_" + "9".repeat(64);
const BROADCAST_INTENT_ID = "voidbvbci1_" + "a".repeat(64);
const POLICY_ID = "payment-keyed-receipt-reconciliation-policy";
const ECONOMIC_POLICY_FINGERPRINT = "b".repeat(64);
const POOL = "buy-void-presale-v1";
const BLOCK_NUMBER = 100n;
const CURRENT_BLOCK = 102n;

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
  request_timeout_ms: 5000,
  max_response_bytes: 65536,
};
const preparationValidation =
  validateBuyVoidPaymentKeyedTransactionPreparationPolicyV1(
    preparationPolicy,
  );
if (preparationValidation.ok === false) {
  throw new Error(preparationValidation.reason);
}

const receiptPolicy = {
  enabled: true,
  chain_id: "2050" as const,
  rpc_url: "http://127.0.0.1:18545/",
  fulfillment_wallet_address: WALLET,
  fulfillment_contract_address: CONTRACT,
  void_token_address: TOKEN,
  min_confirmations: "3",
  request_timeout_ms: 5000,
  max_response_bytes: 65536,
};
const receiptValidation =
  validateBuyVoidPaymentKeyedFulfillmentReceiptPolicyV1(
    receiptPolicy,
  );
if (receiptValidation.ok === false) {
  throw new Error(receiptValidation.reason);
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
      intent_fingerprint: "c".repeat(64),
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

const custody: any = {
  schema: "void_buy_void_payment_keyed_preparation_custody_record_v1",
  marker: VOID_BUY_VOID_PAYMENT_KEYED_PREPARATION_CUSTODY_V1,
  version: 1,
  recorded_at_ms: 10,
  request,
  signer_address: WALLET,
  signed_transaction_hash: TX_HASH,
  raw_signed_transaction_sha256: "d".repeat(64),
  custody_fingerprint_sha256: "e".repeat(64),
  deterministic_signing_verified: true,
  raw_signed_transaction_persisted: false,
  raw_signed_transaction_returned: false,
  transaction_broadcast_authorized: false,
  money_movement_authorized: false,
};

const plan: any = {
  schema: "void_buy_void_payment_keyed_plan_reservation_v1",
  marker: VOID_BUY_VOID_PAYMENT_KEYED_PLAN_RESERVATION_V1,
  version: 1,
  reservation_id: "f".repeat(64),
  reserved_at_ms: 5,
  saga_id: SAGA_ID,
  attempt_id: ATTEMPT_ID,
  chain_id: "2050",
  wallet_address: WALLET,
  wallet_key_sha256: "1".repeat(64),
  nonce: 7,
  fulfillment_call: call,
  gas_limit: "120000",
  max_fee_per_gas_wei: "2000000000",
  max_priority_fee_per_gas_wei: "1000000000",
  runtime_policy_fingerprint_sha256: runtimeValidation.fingerprint,
  preparation_policy_fingerprint_sha256:
    preparationValidation.policy_fingerprint_sha256,
  transaction_template_fingerprint_sha256: "2".repeat(64),
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

function preparedAttempt(): BuyVoidExecutionAttemptStateV1 {
  const base = baseAttempt();
  return {
    ...base,
    prepared: {
      schema: "void_buy_void_execution_prepared_transaction_v1",
      marker: VOID_BUY_VOID_EXECUTION_ATTEMPT_JOURNAL_V1,
      attempt_id: ATTEMPT_ID,
      prepared_at_ms: 20,
      chain_id: "2050",
      void_delivery_tx_hash: TX_HASH,
      fulfillment_wallet: WALLET,
      delivery_address: DELIVERY,
      void_amount_units: "2000000",
      transaction_binding_fingerprint: "3".repeat(64),
      signed_transaction_persisted: false,
      raw_transaction_persisted: false,
      transaction_broadcast_performed_by_this_module: false,
    },
    status: "prepared",
  };
}

const intent: any = {
  schema: "void_buy_void_fulfillment_journal_intent_v1",
  marker: "VOID_BUY_VOID_FULFILLMENT_JOURNAL_V1",
  claim: {
    schema: "void_buy_void_fulfillment_claim_v1",
    status: "claimed",
    request_id: REQUEST_ID,
    canonical_payment_identity: IDENTITY,
    instruction_id: INSTRUCTION_ID,
    unsigned_instruction: baseAttempt().reservation.unsigned_instruction,
  },
  verification_binding: {
    source_chain: "base",
    payment_transaction_hash: PAYMENT_TX,
    payment_log_index: "7",
    delivery_address: DELIVERY,
    quoted_void_units: "2000000",
  },
  request_key_sha256: REQUEST_KEY,
  payment_key_sha256: LOCAL_PAYMENT_KEY,
  signing_authorized: false,
  transaction_broadcast_authorized: false,
  money_movement_authorized: false,
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

function exactRpcTransaction() {
  return {
    hash: TX_HASH,
    from: WALLET,
    to: CONTRACT,
    type: "0x2",
    chainId: "0x802",
    nonce: "0x7",
    gas: "0x1d4c0",
    maxFeePerGas: "0x77359400",
    maxPriorityFeePerGas: "0x3b9aca00",
    value: "0x0",
    input: request.transaction_calldata,
  };
}

const fulfilledEvents = new Interface([
  "event Fulfilled(bytes32 indexed paymentDeliveryId,address indexed recipient,uint256 amountAtoms,uint256 fulfilledAtBlock)",
]);
const transferEvents = new Interface([
  "event Transfer(address indexed from,address indexed to,uint256 value)",
]);
const fulfilledEncoded = fulfilledEvents.encodeEventLog(
  fulfilledEvents.getEvent("Fulfilled")!,
  [
    "0x" + CANONICAL_PAYMENT_KEY,
    DELIVERY,
    BigInt(call.token_amount_atoms),
    BLOCK_NUMBER,
  ],
);
const transferEncoded = transferEvents.encodeEventLog(
  transferEvents.getEvent("Transfer")!,
  [
    CONTRACT,
    DELIVERY,
    BigInt(call.token_amount_atoms),
  ],
);

function successReceipt() {
  return {
    transactionHash: TX_HASH,
    from: WALLET,
    to: CONTRACT,
    blockNumber: "0x64",
    blockHash: BLOCK_HASH,
    status: "0x1",
    logs: [
      {
        address: TOKEN,
        topics: transferEncoded.topics,
        data: transferEncoded.data,
        logIndex: "0x1",
        transactionHash: TX_HASH,
      },
      {
        address: CONTRACT,
        topics: fulfilledEncoded.topics,
        data: fulfilledEncoded.data,
        logIndex: "0x2",
        transactionHash: TX_HASH,
      },
    ],
  };
}

function revertReceipt(blockHash = BLOCK_HASH) {
  return {
    transactionHash: TX_HASH,
    from: WALLET,
    to: CONTRACT,
    blockNumber: "0x64",
    blockHash,
    status: "0x0",
    logs: [],
  };
}

async function receiptOutcome(
  kind: "confirmed" | "reverted" | "pending",
): Promise<
  Extract<
    BuyVoidPaymentKeyedReceiptOutcomeDecisionV1,
    { ok: true }
  >
> {
  let receiptReads = 0;
  const decision = await runBuyVoidPaymentKeyedReceiptOutcomeV1({
    custody,
    fulfillment_call: call,
    policy: {
      preparation_policy: preparationPolicy,
      receipt_policy: receiptPolicy,
    },
    transport: async (rpc) => {
      if (rpc.method === "eth_chainId") return "0x802";
      if (rpc.method === "eth_getTransactionByHash") {
        return kind === "pending" ? null : exactRpcTransaction();
      }
      if (rpc.method === "eth_blockNumber") return "0x66";
      if (rpc.method === "eth_getTransactionReceipt") {
        receiptReads += 1;
        if (kind === "pending") return null;
        return kind === "confirmed"
          ? successReceipt()
          : revertReceipt();
      }
      throw new Error("unexpected_rpc_method");
    },
  });
  if (decision.ok === false) throw new Error(decision.reason);
  return decision;
}

const confirmedOutcome = await receiptOutcome("confirmed");
assert.equal(confirmedOutcome.status, "confirmed");
if (confirmedOutcome.status !== "confirmed") {
  throw new Error("confirmed_outcome_expected");
}
assert.equal(
  confirmedOutcome.confirmed.fulfillment_contract_address,
  CONTRACT,
);
assert.equal(
  confirmedOutcome.confirmed.delivery_address,
  DELIVERY,
);
assert.equal(
  confirmedOutcome.confirmed.void_token_address,
  TOKEN,
);
assert.equal(
  confirmedOutcome.confirmed.observed_confirmation_count,
  "3",
);

const revertedOutcome = await receiptOutcome("reverted");
assert.equal(revertedOutcome.status, "reverted");
if (revertedOutcome.status !== "reverted") {
  throw new Error("reverted_outcome_expected");
}
assert.equal(
  revertedOutcome.reverted.fulfillment_contract_address,
  CONTRACT,
);
assert.equal(
  revertedOutcome.reverted.delivery_address,
  DELIVERY,
);
assert.equal(
  revertedOutcome.reverted.observed_confirmation_count,
  "3",
);

const pendingOutcome = await receiptOutcome("pending");
assert.equal(pendingOutcome.status, "pending");
if (pendingOutcome.status !== "pending") {
  throw new Error("pending_outcome_expected");
}
assert.equal(pendingOutcome.reason, "transaction_not_visible");

{
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), "void-pk-receipt-evidence-"),
  );
  const stored = recordBuyVoidPaymentKeyedReceiptEvidenceV1({
    root_dir: root,
    saga_id: SAGA_ID,
    receipt_policy_fingerprint_sha256:
      receiptValidation.policy_fingerprint_sha256,
    outcome: confirmedOutcome,
    now_ms: 1700000000000,
  });
  if (stored.ok === false) throw new Error(stored.reason);
  assert.equal(stored.status, "recorded");
  const reread = readBuyVoidPaymentKeyedReceiptEvidenceV1({
    root_dir: root,
    attempt_id: ATTEMPT_ID,
  });
  assert.ok(reread);
  assert.equal(reread!.outcome, "confirmed");
  assert.equal(
    fs.statSync(
      path.join(
        root,
        "buy-void-payment-keyed-receipt-evidence-v1",
        "attempts",
        ATTEMPT_ID + ".json",
      ),
    ).mode & 0o777,
    0o600,
  );
  const duplicate =
    recordBuyVoidPaymentKeyedReceiptEvidenceV1({
      root_dir: root,
      saga_id: SAGA_ID,
      receipt_policy_fingerprint_sha256:
        receiptValidation.policy_fingerprint_sha256,
      outcome: confirmedOutcome,
      now_ms: 1700000009999,
    });
  if (duplicate.ok === false) throw new Error(duplicate.reason);
  assert.equal(duplicate.status, "duplicate");
  const conflict =
    recordBuyVoidPaymentKeyedReceiptEvidenceV1({
      root_dir: root,
      saga_id: SAGA_ID,
      receipt_policy_fingerprint_sha256:
        receiptValidation.policy_fingerprint_sha256,
      outcome: revertedOutcome,
      now_ms: 1700000000001,
    });
  assert.equal(conflict.ok, false);
  fs.rmSync(root, { recursive: true, force: true });
}

type TerminalKind = "confirmed" | "reverted" | "pending";

function fixture(kind: TerminalKind) {
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), "void-pk-receipt-reconcile-"),
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
  let outcomeState: any = null;
  let stateRef: any = {
    record: {
      saga_id: SAGA_ID,
      binding: {
        request_id: REQUEST_ID,
        canonical_payment_identity: IDENTITY,
        request_key_sha256: REQUEST_KEY,
        payment_key_sha256: LOCAL_PAYMENT_KEY,
        delivery_address: DELIVERY,
        void_amount_units: "2000000",
        chain_id: "2050",
        pool_id: POOL,
      },
      events: [
        {
          event_type: "saga_initialized",
          payload: { policy_id: POLICY_ID },
        },
      ],
      state: {
        state: "broadcast_intent_committed",
        attempt_id: ATTEMPT_ID,
        transaction_hash: TX_HASH,
        nonce: 7,
        broadcast_intent_id: BROADCAST_INTENT_ID,
        event_count: 5,
        last_event_id: "voidbvfsge1_" + "4".repeat(64),
      },
    },
  };
  const calls = {
    receipt_outcome: 0,
    pipeline: [] as string[],
    saga: [] as string[],
  };
  const order: string[] = [];

  const store = {
    recover() {
      return stateRef.record;
    },
  };

  const saga = {
    ADVANCE_CONFIRMATION:
      "buyVoidAdvanceCrashConsistentFulfillmentSagaV1",
    ACTION_CONFIRMATIONS: {
      reconcile_possible_broadcast:
        "buyVoidSagaReconcilePossibleBroadcastV1",
    },
    validateSagaBindingV1(value: any) {
      return value;
    },
    computeSagaIdV1() {
      return SAGA_ID;
    },
    createFilesystemSagaStoreV1() {
      return store;
    },
    async runSagaSupervisorTickV1(input: any) {
      const result =
        await input.adapters.reconcile_possible_broadcast();
      calls.saga.push(result.outcome);
      order.push("saga:" + result.outcome);
      stateRef.record = {
        ...stateRef.record,
        state: {
          ...stateRef.record.state,
          state: result.outcome,
        },
      };
      return {
        ok: true,
        status: "applied",
        state: stateRef.record.state,
      };
    },
  };

  let fault:
    | ((stage: string) => void | Promise<void>)
    | undefined;

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
    read_outcome() {
      return outcomeState
        ? structuredClone(outcomeState)
        : null;
    },
    async run_pipeline_command(command: any) {
      calls.pipeline.push(command.action);
      order.push("pipeline:" + command.action);
      if (command.action === "record_broadcast_accepted") {
        attempt = {
          ...attempt,
          broadcast: {
            schema:
              "void_buy_void_execution_broadcast_observation_v1",
            marker:
              VOID_BUY_VOID_EXECUTION_ATTEMPT_JOURNAL_V1,
            attempt_id: ATTEMPT_ID,
            observed_at_ms: command.now_ms,
            void_delivery_tx_hash: TX_HASH,
            provider_submission_id:
              command.provider_submission_id,
            external_broadcast_observed: true,
            transaction_broadcast_performed_by_this_module: false,
          },
          status: "broadcast",
        };
        outcomeState = {
          attempt_id: ATTEMPT_ID,
          void_delivery_tx_hash: TX_HASH,
          status: "broadcast_accepted",
        };
      } else if (command.action === "record_confirmed") {
        assert.equal(
          command.observation.from_address,
          WALLET,
        );
        assert.equal(
          command.observation.to_address,
          DELIVERY,
        );
        assert.notEqual(
          command.observation.to_address,
          CONTRACT,
        );
        assert.equal(
          command.observation.amount_units,
          "2000000",
        );
        assert.equal(
          command.observation.block_hash,
          BLOCK_HASH,
        );
        attempt = {
          ...attempt,
          confirmation: {
            schema:
              "void_buy_void_execution_attempt_confirmation_v1",
            marker:
              VOID_BUY_VOID_EXECUTION_ATTEMPT_JOURNAL_V1,
            attempt_id: ATTEMPT_ID,
            confirmed_at_ms: command.now_ms,
            void_delivery_tx_hash: TX_HASH,
            delivery_block_hash: BLOCK_HASH,
            confirmation_fingerprint: "5".repeat(64),
            confirmed_record: {
              schema:
                "void_buy_void_confirmed_fulfillment_record_v1",
              marker:
                "VOID_BUY_VOID_FULFILLMENT_CONFIRMATION_V1",
              status: "fulfilled_confirmed",
            },
          },
          status: "confirmed",
        } as any;
        outcomeState = {
          attempt_id: ATTEMPT_ID,
          void_delivery_tx_hash: TX_HASH,
          status: "confirmed",
        };
      } else if (command.action === "record_reverted") {
        attempt = {
          ...attempt,
          postbroadcast_failure: {
            schema:
              "void_buy_void_execution_postbroadcast_failure_v1",
            marker:
              VOID_BUY_VOID_EXECUTION_ATTEMPT_JOURNAL_V1,
            attempt_id: ATTEMPT_ID,
            failed_at_ms: command.now_ms,
            failure_code: "delivery_transaction_reverted",
            retryable: true,
            void_delivery_tx_hash: TX_HASH,
            broadcast_outcome_marker:
              "VOID_BUY_VOID_BROADCAST_OUTCOME_JOURNAL_V1",
            broadcast_outcome_recorded_at_ms: command.now_ms,
            revert_block_number:
              command.observation.block_number,
            revert_confirmation_count: "3",
            definitive_revert: true,
            transaction_broadcast_observed: true,
          },
          status: "failed_retryable",
        };
        outcomeState = {
          attempt_id: ATTEMPT_ID,
          void_delivery_tx_hash: TX_HASH,
          status: "reverted",
        };
      } else {
        throw new Error("unexpected_pipeline_action");
      }
      return {
        ok: true,
        status: "applied",
        action: command.action,
        applied: true,
        mutation_performed: true,
      };
    },
    async run_receipt_outcome() {
      calls.receipt_outcome += 1;
      order.push("receipt_outcome");
      if (kind === "pending") return pendingOutcome;
      return kind === "confirmed"
        ? confirmedOutcome
        : revertedOutcome;
    },
    async load_saga_module() {
      return saga;
    },
    now_ms() {
      return 1700000000100;
    },
    async fault_inject(stage: string) {
      if (fault) await fault(stage);
    },
  };

  return {
    root,
    dependencies,
    calls,
    order,
    stateRef,
    getAttempt: () => attempt,
    getOutcome: () => outcomeState,
    setFault(
      fn:
        | ((stage: string) => void | Promise<void>)
        | undefined,
    ) {
      fault = fn;
    },
  };
}

function confirmations() {
  return {
    apply: true,
    confirmation:
      VOID_BUY_VOID_PAYMENT_KEYED_RECEIPT_RECONCILIATION_CONFIRMATION_V1,
    runtime_policy_fingerprint_sha256:
      runtimeValidation.fingerprint,
    preparation_policy_fingerprint_sha256:
      preparationValidation.policy_fingerprint_sha256,
    receipt_policy_fingerprint_sha256:
      receiptValidation.policy_fingerprint_sha256,
    saga_confirmation:
      "buyVoidAdvanceCrashConsistentFulfillmentSagaV1",
    saga_action_confirmation:
      "buyVoidSagaReconcilePossibleBroadcastV1",
  };
}

async function invoke(
  f: ReturnType<typeof fixture>,
  extra: any = {},
) {
  return await runBuyVoidPaymentKeyedReceiptReconciliationV1({
    root_dir: f.root,
    attempt_id: ATTEMPT_ID,
    server_policy: serverPolicy,
    receipt_policy: receiptPolicy,
    dependencies: f.dependencies,
    ...extra,
  });
}

{
  const f = fixture("confirmed");
  const dry = await invoke(f);
  if (dry.ok === false) throw new Error(dry.reason);
  assert.equal(
    dry.marker,
    VOID_BUY_VOID_PAYMENT_KEYED_RECEIPT_RECONCILIATION_V1,
  );
  assert.equal(dry.status, "dry_run");
  assert.equal(dry.rpc_required_on_apply, true);
  assert.equal(dry.rpc_call_performed, false);
  assert.equal(f.calls.receipt_outcome, 0);
}

{
  const f = fixture("pending");
  const result = await invoke(f, confirmations());
  if (result.ok === false) throw new Error(result.reason);
  assert.equal(result.status, "pending");
  assert.equal(result.rpc_call_performed, true);
  assert.equal(result.receipt_evidence, null);
  assert.equal(f.calls.pipeline.length, 0);
  assert.equal(f.calls.saga.length, 0);
}

{
  const f = fixture("confirmed");
  const result = await invoke(f, confirmations());
  if (result.ok === false) throw new Error(result.reason);
  assert.equal(result.status, "confirmed");
  assert.equal(result.ready_for_terminal_closeout, true);
  assert.equal(result.terminal_revert, false);
  assert.equal(f.calls.receipt_outcome, 1);
  assert.deepEqual(f.calls.pipeline, [
    "record_broadcast_accepted",
    "record_confirmed",
  ]);
  assert.deepEqual(f.calls.saga, [
    "broadcast_accepted",
    "receipt_confirmed",
  ]);
  assert.equal(result.execution_attempt.status, "confirmed");
  assert.equal(result.broadcast_outcome?.status, "confirmed");
  assert.equal(result.saga_state.state, "receipt_confirmed");

  const before = {
    receipt: f.calls.receipt_outcome,
    pipeline: f.calls.pipeline.length,
    saga: f.calls.saga.length,
  };
  const duplicate = await invoke(f, confirmations());
  if (duplicate.ok === false) throw new Error(duplicate.reason);
  assert.equal(duplicate.status, "duplicate_confirmed");
  assert.equal(duplicate.rpc_call_performed, false);
  assert.equal(f.calls.receipt_outcome, before.receipt);
  assert.equal(f.calls.pipeline.length, before.pipeline);
  assert.equal(f.calls.saga.length, before.saga);
  fs.rmSync(f.root, { recursive: true, force: true });
}

{
  const f = fixture("reverted");
  const result = await invoke(f, confirmations());
  if (result.ok === false) throw new Error(result.reason);
  assert.equal(result.status, "reverted");
  assert.equal(result.ready_for_terminal_closeout, false);
  assert.equal(result.terminal_revert, true);
  assert.deepEqual(f.calls.pipeline, [
    "record_broadcast_accepted",
    "record_reverted",
  ]);
  assert.deepEqual(f.calls.saga, [
    "broadcast_accepted",
    "receipt_reverted",
  ]);
  assert.equal(result.execution_attempt.status, "failed_retryable");
  assert.equal(result.broadcast_outcome?.status, "reverted");
  assert.equal(result.saga_state.state, "receipt_reverted");

  const before = {
    receipt: f.calls.receipt_outcome,
    pipeline: f.calls.pipeline.length,
    saga: f.calls.saga.length,
  };
  const duplicate = await invoke(f, confirmations());
  if (duplicate.ok === false) throw new Error(duplicate.reason);
  assert.equal(duplicate.status, "duplicate_reverted");
  assert.equal(duplicate.rpc_call_performed, false);
  assert.equal(f.calls.receipt_outcome, before.receipt);
  fs.rmSync(f.root, { recursive: true, force: true });
}

for (const stage of [
  "after_receipt_evidence_before_broadcast_projection",
  "after_broadcast_projection_before_saga_accepted",
  "after_saga_accepted_before_terminal_projection",
  "after_terminal_projection_before_saga_receipt",
] as const) {
  const f = fixture("confirmed");
  f.setFault(async (observed) => {
    if (observed === stage) {
      throw new Error("synthetic_" + stage);
    }
  });
  const crashed = await invoke(f, confirmations());
  assert.equal(crashed.ok, false);
  const evidence =
    readBuyVoidPaymentKeyedReceiptEvidenceV1({
      root_dir: f.root,
      attempt_id: ATTEMPT_ID,
    });
  assert.ok(evidence, stage + ": evidence must be durable");
  const beforeReceiptCalls = f.calls.receipt_outcome;
  f.setFault(undefined);
  const recovered = await invoke(f, confirmations());
  if (recovered.ok === false) throw new Error(recovered.reason);
  assert.equal(recovered.status, "confirmed");
  assert.equal(
    f.calls.receipt_outcome,
    beforeReceiptCalls,
    stage + ": recovery must not repeat RPC receipt outcome",
  );
  assert.equal(recovered.rpc_call_performed, false);
  assert.equal(recovered.execution_attempt.status, "confirmed");
  assert.equal(recovered.saga_state.state, "receipt_confirmed");
  fs.rmSync(f.root, { recursive: true, force: true });
}

for (const [key, expected] of Object.entries({
  exact_payment_keyed_transaction_visibility_required: true,
  exact_success_receipt_verifier_reused: true,
  exact_revert_receipt_binding_required: true,
  receipt_revalidation_required: true,
  receipt_block_hash_stability_required: true,
  transaction_absence_is_pending: true,
  receipt_absence_is_pending: true,
  signing: false,
  transaction_broadcast: false,
  automatic_retry: false,
  inventory_mutation: false,
  public_fulfilled_closeout: false,
})) {
  assert.equal(
    (VOID_BUY_VOID_PAYMENT_KEYED_RECEIPT_OUTCOME_AUTHORITY_V1 as any)[key],
    expected,
    key,
  );
}

for (const [key, expected] of Object.entries({
  immutable_terminal_record: true,
  confirmed_and_reverted_only: true,
  raw_receipt_logs_persisted: false,
  raw_signed_transaction_persisted: false,
  signing: false,
  transaction_broadcast: false,
  inventory_mutation: false,
  public_fulfilled_closeout: false,
})) {
  assert.equal(
    (VOID_BUY_VOID_PAYMENT_KEYED_RECEIPT_EVIDENCE_AUTHORITY_V1 as any)[key],
    expected,
    key,
  );
}

for (const [key, expected] of Object.entries({
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
})) {
  assert.equal(
    (VOID_BUY_VOID_PAYMENT_KEYED_RECEIPT_RECONCILIATION_AUTHORITY_V1 as any)[key],
    expected,
    key,
  );
}

assert.equal(id("Transfer(address,address,uint256)").length, 66);

console.log("VOID_BUY_VOID_PAYMENT_KEYED_RECEIPT_RECONCILIATION_V1_PROOF_GREEN");
console.log("exact_payment_keyed_transaction_visibility_required=true");
console.log("successful_fulfilled_and_transfer_receipt_verified=true");
console.log("status_zero_revert_revalidated=true");
console.log("receipt_block_hash_stability=true");
console.log("terminal_receipt_evidence_before_projection=true");
console.log("terminal_receipt_evidence_semantic_idempotency=true");
console.log("confirmed_economic_projection_wallet_to_buyer=true");
console.log("confirmed_evm_target_contract_preserved_in_receipt_truth=true");
console.log("reverted_canonical_projection=true");
console.log("saga_receipt_confirmed=true");
console.log("saga_receipt_reverted=true");
console.log("crash_recovery_uses_durable_receipt_evidence_without_rpc=true");
console.log("ready_for_terminal_closeout_only_after_confirmed=true");
console.log("inventory_mutation=false");
console.log("public_fulfilled_closeout=false");
console.log("signing=false");
console.log("transaction_broadcast=false");
console.log("runtime_route_mount=false");
