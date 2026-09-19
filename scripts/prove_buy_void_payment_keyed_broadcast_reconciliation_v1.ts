#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

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
  VOID_BUY_VOID_PAYMENT_KEYED_CHAIN2050_INSPECTION_AUTHORITY_V1,
  inspectBuyVoidPaymentKeyedChain2050V1,
} from "../src/economic/buy_void_payment_keyed_chain2050_inspection_v1.js";
import {
  VOID_BUY_VOID_PAYMENT_KEYED_BROADCAST_RECONCILIATION_AUTHORITY_V1,
  VOID_BUY_VOID_PAYMENT_KEYED_BROADCAST_RECONCILIATION_CONFIRMATION_V1,
  VOID_BUY_VOID_PAYMENT_KEYED_BROADCAST_RECONCILIATION_V1,
  runBuyVoidPaymentKeyedBroadcastReconciliationV1,
} from "../src/economic/buy_void_payment_keyed_broadcast_reconciliation_v1.js";

const ATTEMPT_ID = "1".repeat(64);
const INVENTORY_ID = "2".repeat(64);
const REQUEST_KEY = "3".repeat(64);
const LOCAL_PAYMENT_KEY = "4".repeat(64);
const REQUEST_ID = "payment-keyed-broadcast-reconciliation-proof";
const INSTRUCTION_ID = "proof-instruction-v1";
const PAYMENT_TX = "0x" + "a".repeat(64);
const IDENTITY = "voidpay1:base:" + PAYMENT_TX + ":7";
const DELIVERY = "0x3333333333333333333333333333333333333333";
const CONTRACT = "0x4444444444444444444444444444444444444444";
const WALLET = "0x5555555555555555555555555555555555555555";
const TX_HASH = "0x" + "6".repeat(64);
const SAGA_ID = "voidbvfsg1_" + "7".repeat(64);
const INTENT_ID = "voidbvbci1_" + "8".repeat(64);
const POLICY_ID = "payment-keyed-broadcast-reconciliation-policy";
const ECONOMIC_POLICY_FINGERPRINT = "9".repeat(64);
const POOL = "buy-void-presale-v1";
const ADAPTER_MARKER =
  "VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_BROADCAST_V1";
const SUBMISSION_DOMAIN =
  "void-buy-payment-keyed-custodian-broadcast-v1";

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
      intent_fingerprint: "a".repeat(64),
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
  raw_signed_transaction_sha256: "b".repeat(64),
  custody_fingerprint_sha256: "c".repeat(64),
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
  reservation_id: "d".repeat(64),
  reserved_at_ms: 5,
  saga_id: SAGA_ID,
  attempt_id: ATTEMPT_ID,
  chain_id: "2050",
  wallet_address: WALLET,
  wallet_key_sha256: "e".repeat(64),
  nonce: 7,
  fulfillment_call: call,
  gas_limit: "120000",
  max_fee_per_gas_wei: "2000000000",
  max_priority_fee_per_gas_wei: "1000000000",
  runtime_policy_fingerprint_sha256: runtimeValidation.fingerprint,
  preparation_policy_fingerprint_sha256:
    preparationValidation.policy_fingerprint_sha256,
  transaction_template_fingerprint_sha256: "f".repeat(64),
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
      transaction_binding_fingerprint: "1".repeat(64),
      signed_transaction_persisted: false,
      raw_transaction_persisted: false,
      transaction_broadcast_performed_by_this_module: false,
    },
    status: "prepared",
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

function submissionKey(): string {
  return sha256(
    [
      SUBMISSION_DOMAIN,
      request.idempotency_key_sha256,
      TX_HASH,
      request.unsigned_transaction_fingerprint_sha256,
    ].join("\n"),
  );
}

function guardEntry(
  event: "claim" | "release",
  releaseReason?: string,
): any {
  return {
    schema:
      event === "claim"
        ? "void_buy_void_delivery_submission_guard_claim_v1"
        : "void_buy_void_delivery_submission_guard_release_v1",
    marker: "VOID_BUY_VOID_DELIVERY_SUBMISSION_GUARD_V1",
    sequence: event === "claim" ? 1 : 2,
    recorded_at_ms: event === "claim" ? 30 : 31,
    previous_entry_hash_sha256: "0".repeat(64),
    entry_hash_sha256: "2".repeat(64),
    event,
    adapter_marker: ADAPTER_MARKER,
    submission_idempotency_key: submissionKey(),
    attempt_id: ATTEMPT_ID,
    expected_transaction_hash: TX_HASH,
    transaction_plan_fingerprint_sha256: planFingerprint,
    ...(event === "release"
      ? { release_reason: releaseReason }
      : {}),
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

{
  const calls: string[] = [];
  const missing = await inspectBuyVoidPaymentKeyedChain2050V1({
    custody,
    preparation_policy: preparationPolicy,
    transport: async (call) => {
      calls.push(call.method);
      if (call.method === "eth_chainId") return "0x802";
      return null;
    },
  });
  if (missing.ok === false) throw new Error(missing.reason);
  assert.equal(missing.status, "unknown");
  assert.equal(missing.transaction_found, false);
  assert.equal(missing.definitive_not_submitted, false);
  assert.deepEqual(calls, ["eth_chainId", "eth_getTransactionByHash"]);

  const visible = await inspectBuyVoidPaymentKeyedChain2050V1({
    custody,
    preparation_policy: preparationPolicy,
    transport: async (rpc) =>
      rpc.method === "eth_chainId" ? "0x802" : exactRpcTransaction(),
  });
  if (visible.ok === false) throw new Error(visible.reason);
  assert.equal(visible.status, "accepted");
  assert.equal(visible.transaction_found, true);

  const mismatch = await inspectBuyVoidPaymentKeyedChain2050V1({
    custody,
    preparation_policy: preparationPolicy,
    transport: async (rpc) =>
      rpc.method === "eth_chainId"
        ? "0x802"
        : { ...exactRpcTransaction(), input: "0x00" },
  });
  assert.equal(mismatch.ok, false);
  if (mismatch.ok) throw new Error("mismatch_unexpected_ready");
  assert.equal(
    mismatch.reason,
    "payment_keyed_chain2050_inspection_transaction_binding_invalid",
  );
}

type GuardKind = "none" | "claim" | "release";
type InspectionKind = "unknown" | "accepted";

function fixture(
  guardKind: GuardKind,
  inspectionKind: InspectionKind = "unknown",
  existingEvidenceOutcome: null | "unknown" | "accepted" = null,
) {
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), "void-pk-reconcile-"),
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
  let outcome: any = null;
  let evidence: any =
    existingEvidenceOutcome === null
      ? null
      : {
          saga_id: SAGA_ID,
          attempt_id: ATTEMPT_ID,
          broadcast_intent_id: INTENT_ID,
          transaction_hash: TX_HASH,
          events: [],
          latest: {
            outcome: existingEvidenceOutcome,
            provider_submission_id: "provider-existing",
          },
          terminal: false,
          reconciliation_required: true,
          automatic_retry_allowed: false,
        };
  const stateRef: any = {
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
        state:
          existingEvidenceOutcome === "unknown"
            ? "broadcast_intent_committed"
            : "broadcast_intent_committed",
        attempt_id: ATTEMPT_ID,
        transaction_hash: TX_HASH,
        nonce: 7,
        broadcast_intent_id: INTENT_ID,
        broadcast_call_may_have_occurred: true,
        event_count: 5,
        last_event_id: "voidbvfsge1_" + "3".repeat(64),
      },
    },
  };
  const calls = {
    inspection: 0,
    evidence: 0,
    pipeline: 0,
    saga_append: 0,
    signer: 0,
    broadcaster: 0,
    guard_mutation: 0,
  };

  const store = {
    recover() {
      return stateRef.record;
    },
    acquireLease() {
      return {
        ok: true,
        lease: { fencing_token: 1 },
      };
    },
    releaseLease() {
      return {};
    },
    appendEvent({ event }: any) {
      calls.saga_append += 1;
      stateRef.record = {
        ...stateRef.record,
        state: {
          ...stateRef.record.state,
          state: event.event_type,
          broadcast_call_may_have_occurred:
            event.event_type === "broadcast_not_attempted"
              ? false
              : true,
          event_count: stateRef.record.state.event_count + 1,
          last_event_id: "voidbvfsge1_" + "4".repeat(64),
        },
      };
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
    deriveSagaNextActionV1() {
      return {
        action: "reconcile_possible_broadcast",
        terminal: false,
        required_confirmation:
          "buyVoidSagaReconcilePossibleBroadcastV1",
      };
    },
    buildSagaEventV1(input: any) {
      return {
        event_type: input.event_type,
        payload: input.payload,
      };
    },
    createFilesystemSagaStoreV1() {
      return store;
    },
    async runSagaSupervisorTickV1(input: any) {
      calls.saga_append += 1;
      const result =
        await input.adapters.reconcile_possible_broadcast();
      stateRef.record = {
        ...stateRef.record,
        state: {
          ...stateRef.record.state,
          state: result.outcome,
          broadcast_call_may_have_occurred: true,
        },
      };
      return {
        ok: true,
        status: "applied",
        state: stateRef.record.state,
      };
    },
  };

  const guardEntries =
    guardKind === "none"
      ? []
      : guardKind === "claim"
        ? [guardEntry("claim")]
        : [
            guardEntry("claim"),
            guardEntry(
              "release",
              "broadcast_definitively_not_submitted",
            ),
          ];

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
    read_guard() {
      return structuredClone(guardEntries);
    },
    read_evidence() {
      return evidence ? structuredClone(evidence) : null;
    },
    record_evidence(input: any) {
      calls.evidence += 1;
      const latest = {
        outcome: input.outcome.status,
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
        broadcast_intent_id: INTENT_ID,
        transaction_hash: TX_HASH,
        events: [...(evidence?.events || []), latest],
        latest,
        terminal: false,
        reconciliation_required:
          latest.outcome === "unknown" ||
          latest.outcome === "accepted",
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
    read_outcome() {
      return outcome ? structuredClone(outcome) : null;
    },
    async run_pipeline_command(command: any) {
      calls.pipeline += 1;
      const status =
        command.action === "record_broadcast_unknown"
          ? "broadcast_unknown"
          : "broadcast_accepted";
      outcome = {
        attempt_id: ATTEMPT_ID,
        void_delivery_tx_hash: TX_HASH,
        status,
      };
      attempt = {
        ...attempt,
        broadcast: {
          schema: "void_buy_void_execution_broadcast_observation_v1",
          marker: VOID_BUY_VOID_EXECUTION_ATTEMPT_JOURNAL_V1,
          attempt_id: ATTEMPT_ID,
          observed_at_ms: command.now_ms,
          void_delivery_tx_hash: TX_HASH,
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
      };
    },
    async inspect_chain() {
      calls.inspection += 1;
      return {
        ok: true,
        status: inspectionKind,
        marker: "VOID_BUY_VOID_PAYMENT_KEYED_CHAIN2050_INSPECTION_V1",
        version: 1,
        attempt_id: ATTEMPT_ID,
        transaction_hash: TX_HASH,
        provider_submission_id: "provider-chain2050",
        rpc_url_fingerprint_sha256: "5".repeat(64),
        rpc_methods_used: [
          "eth_chainId",
          "eth_getTransactionByHash",
        ],
        transaction_found: inspectionKind === "accepted",
        submission_may_have_occurred: true,
        definitive_not_submitted: false,
        transaction_broadcast_performed: false,
        automatic_retry_allowed: false,
        money_movement_performed: false,
      };
    },
    async load_saga_module() {
      return saga;
    },
    now_ms() {
      return 1700000000000;
    },
  };

  return {
    root,
    calls,
    dependencies,
    stateRef,
    getAttempt: () => attempt,
    getOutcome: () => outcome,
    getEvidence: () => evidence,
  };
}

function confirmations() {
  return {
    apply: true,
    confirmation:
      VOID_BUY_VOID_PAYMENT_KEYED_BROADCAST_RECONCILIATION_CONFIRMATION_V1,
    runtime_policy_fingerprint_sha256:
      runtimeValidationReady.fingerprint,
    preparation_policy_fingerprint_sha256:
      preparationValidationReady.policy_fingerprint_sha256,
    saga_confirmation:
      "buyVoidAdvanceCrashConsistentFulfillmentSagaV1",
    saga_action_confirmation:
      "buyVoidSagaReconcilePossibleBroadcastV1",
  };
}

async function invoke(f: ReturnType<typeof fixture>, extra: any = {}) {
  return await runBuyVoidPaymentKeyedBroadcastReconciliationV1({
    root_dir: f.root,
    attempt_id: ATTEMPT_ID,
    server_policy: serverPolicy,
    dependencies: f.dependencies,
    ...extra,
  });
}

{
  const f = fixture("claim", "unknown");
  const dry = await invoke(f);
  if (dry.ok === false) throw new Error(dry.reason);
  assert.equal(
    dry.marker,
    VOID_BUY_VOID_PAYMENT_KEYED_BROADCAST_RECONCILIATION_V1,
  );
  assert.equal(dry.status, "dry_run");
  assert.equal(dry.guard_state.status, "claimed");
  assert.equal(dry.chain_inspection_required, true);
  assert.equal(dry.inspection_performed, false);
  assert.equal(dry.signing_performed, false);
  assert.equal(dry.transaction_broadcast_performed, false);
  assert.equal(f.calls.inspection, 0);
}

{
  const f = fixture("none");
  const result = await invoke(f, confirmations());
  if (result.ok === false) throw new Error(result.reason);
  assert.equal(result.status, "not_submitted");
  assert.equal(result.guard_state.status, "never_claimed");
  assert.equal(result.inspection_performed, false);
  assert.equal(f.calls.inspection, 0);
  assert.equal(f.calls.evidence, 1);
  assert.equal(f.calls.pipeline, 0);
  assert.equal(f.calls.saga_append, 1);
  assert.equal(
    f.getEvidence().latest.submission_call_performed,
    false,
  );
  assert.equal(
    f.getEvidence().latest.submission_may_have_occurred,
    false,
  );
  assert.equal(
    f.stateRef.record.state.state,
    "broadcast_not_attempted",
  );
  assert.equal(f.getAttempt().status, "prepared");
}

{
  const f = fixture("release");
  const result = await invoke(f, confirmations());
  if (result.ok === false) throw new Error(result.reason);
  assert.equal(result.status, "not_submitted");
  assert.equal(result.guard_state.status, "released");
  assert.equal(f.calls.inspection, 0);
  assert.equal(
    f.getEvidence().latest.submission_call_performed,
    true,
  );
  assert.equal(
    f.getEvidence().latest.submission_may_have_occurred,
    false,
  );
}

{
  const f = fixture("claim", "unknown");
  const result = await invoke(f, confirmations());
  if (result.ok === false) throw new Error(result.reason);
  assert.equal(result.status, "unknown");
  assert.equal(result.inspection_performed, true);
  assert.equal(result.reconciliation_required, true);
  assert.equal(f.calls.inspection, 1);
  assert.equal(f.calls.evidence, 0);
  assert.equal(f.calls.pipeline, 0);
  assert.equal(
    f.stateRef.record.state.state,
    "broadcast_intent_committed",
  );
  assert.equal(f.getAttempt().status, "prepared");
}

{
  const f = fixture("claim", "accepted");
  const result = await invoke(f, confirmations());
  if (result.ok === false) throw new Error(result.reason);
  assert.equal(result.status, "accepted");
  assert.equal(result.inspection_performed, true);
  assert.equal(f.calls.inspection, 1);
  assert.equal(f.calls.evidence, 1);
  assert.equal(f.calls.pipeline, 1);
  assert.equal(f.calls.saga_append, 1);
  assert.equal(f.getEvidence().latest.outcome, "accepted");
  assert.equal(f.getOutcome().status, "broadcast_accepted");
  assert.equal(f.getAttempt().status, "broadcast");
  assert.equal(
    f.stateRef.record.state.state,
    "broadcast_accepted",
  );
}

{
  const f = fixture("claim", "accepted", "accepted");
  const result = await invoke(f, confirmations());
  if (result.ok === false) throw new Error(result.reason);
  assert.equal(result.status, "accepted");
  assert.equal(result.inspection_performed, false);
  assert.equal(f.calls.inspection, 0);
  assert.equal(f.calls.evidence, 0);
  assert.equal(f.calls.pipeline, 1);
  assert.equal(f.calls.saga_append, 1);
}

{
  const f = fixture("claim", "unknown", "unknown");
  const result = await invoke(f, confirmations());
  if (result.ok === false) throw new Error(result.reason);
  assert.equal(result.status, "unknown");
  assert.equal(result.inspection_performed, true);
  assert.equal(f.calls.pipeline, 1);
  assert.equal(f.calls.inspection, 1);
  assert.equal(
    f.stateRef.record.state.state,
    "broadcast_intent_committed",
  );
}

{
  const f = fixture("claim", "unknown");
  const held = await invoke(f, {
    ...confirmations(),
    confirmation: "wrong",
  });
  assert.equal(held.ok, false);
  if (held.ok) throw new Error("confirmation_unexpected_ready");
  assert.equal(
    held.reason,
    "payment_keyed_reconciliation_exact_confirmations_required",
  );
  assert.equal(f.calls.inspection, 0);
  assert.equal(f.calls.pipeline, 0);
}

for (const [key, expected] of Object.entries({
  source_only_contract: true,
  runtime_route_mount: false,
  canonical_parent_dispatch: false,
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
})) {
  assert.equal(
    (VOID_BUY_VOID_PAYMENT_KEYED_BROADCAST_RECONCILIATION_AUTHORITY_V1 as any)[key],
    expected,
    key,
  );
}

for (const [key, expected] of Object.entries({
  transaction_absence_is_unknown_not_not_submitted: true,
  transaction_visibility_requires_exact_binding: true,
  rpc_mutation: false,
  signing: false,
  transaction_broadcast: false,
  automatic_retry: false,
  money_movement: false,
})) {
  assert.equal(
    (VOID_BUY_VOID_PAYMENT_KEYED_CHAIN2050_INSPECTION_AUTHORITY_V1 as any)[key],
    expected,
    key,
  );
}

console.log("VOID_BUY_VOID_PAYMENT_KEYED_BROADCAST_RECONCILIATION_V1_PROOF_GREEN");
console.log("guard_never_claimed_definitive_not_submitted=true");
console.log("guard_released_definitive_not_submitted=true");
console.log("guard_claimed_rpc_absence_stays_unknown=true");
console.log("guard_claimed_exact_tx_visibility_accepts=true");
console.log("rpc_absence_never_authorizes_retry=true");
console.log("exact_contract_call_binding_inspected=true");
console.log("existing_accepted_evidence_repairs_projection_without_rpc=true");
console.log("existing_unknown_evidence_repairs_unknown_projection=true");
console.log("no_signer_dependency=true");
console.log("submission_guard_mutation=false");
console.log("transaction_broadcast=false");
console.log("automatic_retry=false");
console.log("receipt_acceptance=false");
console.log("inventory_mutation=false");
console.log("public_fulfilled_closeout=false");
console.log("runtime_route_mount=false");
