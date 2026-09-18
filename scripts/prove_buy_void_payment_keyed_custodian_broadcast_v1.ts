#!/usr/bin/env node
import assert from "node:assert/strict";
import { Transaction, Wallet } from "ethers";

import {
  buildBuyVoidPaymentKeyedFulfillmentCallV1,
} from "../src/economic/buy_void_payment_keyed_fulfillment_call_v1.js";
import {
  VOID_BUY_VOID_EXECUTION_ATTEMPT_JOURNAL_V1,
  type BuyVoidExecutionAttemptStateV1,
} from "../src/economic/buy_void_execution_attempt_journal_v1.js";
import {
  VOID_BUY_VOID_SOURCE_FINALITY_EXECUTION_PREFLIGHT_V1,
} from "../src/economic/buy_void_source_finality_execution_preflight_v1.js";
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
  VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_BROADCAST_AUTHORITY_V1,
  VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_BROADCAST_CONFIRMATION_V1,
  VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_BROADCAST_V1,
  runBuyVoidPaymentKeyedCustodianBroadcastV1,
  type BuyVoidPaymentKeyedCustodianBroadcastDependenciesV1,
} from "../src/economic/buy_void_payment_keyed_custodian_broadcast_v1.js";

const IDENTITY = "voidpay1:base:0x" + "a".repeat(64) + ":7";
const ATTEMPT_ID = "1".repeat(64);
const LEGACY_KEY = "2".repeat(64);
const CANONICAL_KEY =
  "a06bb682bc6225c6697d0a37a51fc1323dc657eac74a51506ddb5d7daed82c85";
const DELIVERY = "0x" + "4".repeat(40);
const CONTRACT = "0x" + "5".repeat(40);
const SAGA_ID = "voidbvfsg1_" + "a".repeat(64);
const PLAN_RESERVATION_ID = "b".repeat(64);
const wallet = new Wallet("0x" + "11".repeat(32));
const WALLET = wallet.address.toLowerCase();

function attempt(): BuyVoidExecutionAttemptStateV1 {
  return {
    reservation: {
      schema: "void_buy_void_execution_attempt_reservation_v1",
      marker: VOID_BUY_VOID_EXECUTION_ATTEMPT_JOURNAL_V1,
      attempt_id: ATTEMPT_ID,
      attempt_number: 1,
      reserved_at_ms: 1,
      payment_key_sha256: LEGACY_KEY,
      request_key_sha256: "7".repeat(64),
      canonical_payment_identity: IDENTITY,
      request_id: "buyvoid-payment-keyed-custodian-broadcast-v1",
      instruction_id: "8".repeat(64),
      intent_fingerprint: "9".repeat(64),
      max_attempts_per_payment: 1,
      unsigned_instruction: {
        schema: "void_buy_void_unsigned_fulfillment_instruction_v1",
        marker: "VOID_BUY_VOID_AUTO_FULFILLMENT_V1",
        instruction_id: "8".repeat(64),
        request_id: "buyvoid-payment-keyed-custodian-broadcast-v1",
        canonical_payment_identity: IDENTITY,
        source_chain: "base",
        payment_transaction_hash: "0x" + "a".repeat(64),
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

const fulfillmentCall = buildBuyVoidPaymentKeyedFulfillmentCallV1({
  attempt: attempt(),
  source_finality: {
    ok: true,
    marker: VOID_BUY_VOID_SOURCE_FINALITY_EXECUTION_PREFLIGHT_V1,
    version: 1,
    status: "ready",
    attempt_id: ATTEMPT_ID,
    source_chain: "base",
    canonical_payment_identity: IDENTITY,
    payment_key_sha256: CANONICAL_KEY,
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
  },
  policy: {
    chain_id: "2050",
    fulfillment_contract_address: CONTRACT,
    max_void_amount_units: "10000000000000",
  },
});
if (fulfillmentCall.ok === false) throw new Error(fulfillmentCall.reason);

const plan = {
  chain_id: "2050" as const,
  nonce: 7,
  gas_limit: "120000",
  max_fee_per_gas_wei: "2000000000",
  max_priority_fee_per_gas_wei: "1000000000",
};
const policy = {
  chain_id: "2050" as const,
  fulfillment_wallet_address: WALLET,
  fulfillment_contract_address: CONTRACT,
  max_void_amount_units: "10000000000000",
  max_gas_limit: "300000",
  max_fee_per_gas_wei: "5000000000",
  max_priority_fee_per_gas_wei: "1000000000",
};

const unsigned = buildBuyVoidPaymentKeyedUnsignedTransactionV1({
  attempt_id: ATTEMPT_ID,
  fulfillment_call: fulfillmentCall,
  plan,
  policy,
});
if (unsigned.ok === false) throw new Error(unsigned.reason);

const prepared = buildBuyVoidPaymentKeyedCustodianPrepareRequestV1({
  saga_id: SAGA_ID,
  attempt_id: ATTEMPT_ID,
  plan_reservation_id: PLAN_RESERVATION_ID,
  fulfillment_call: fulfillmentCall,
  plan,
  unsigned_transaction: unsigned,
  policy,
});
if (prepared.ok === false) throw new Error(prepared.reason);
const request = prepared.request;

const signed = await runBuyVoidPaymentKeyedCustodianSignerV1({
  request,
  apply: true,
  confirmation:
    VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_SIGNER_CONFIRMATION_V1,
  signer: {
    async get_address() {
      return WALLET;
    },
    async sign_transaction(transaction) {
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
});
if (signed.ok === false) throw new Error(signed.reason);
assert.equal(signed.status, "signed");
assert.ok(signed.raw_signed_transaction);
assert.ok(signed.signed_transaction_hash);

const parsed = Transaction.from(signed.raw_signed_transaction!);
assert.equal(parsed.hash, signed.signed_transaction_hash);

const dry = await runBuyVoidPaymentKeyedCustodianBroadcastV1({
  request,
  signed,
});
if (dry.ok === false) throw new Error(dry.reason);
assert.equal(dry.marker, VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_BROADCAST_V1);
assert.equal(dry.status, "dry_run");
assert.equal(dry.applied, false);
assert.equal(dry.attempt_id, ATTEMPT_ID);
assert.equal(dry.expected_transaction_hash, signed.signed_transaction_hash);
assert.equal(dry.submission_guard_claimed, false);
assert.equal(dry.broadcast_call_performed, false);
assert.equal(dry.transaction_broadcast_accepted, false);
assert.equal(dry.raw_signed_transaction_persisted, false);
assert.equal(dry.raw_signed_transaction_returned, false);
assert.equal(Object.hasOwn(dry, "raw_signed_transaction"), false);

const forged = await runBuyVoidPaymentKeyedCustodianBroadcastV1({
  request,
  signed: {
    ...signed,
    raw_signed_transaction_sha256: "e".repeat(64),
  },
});
assert.equal(forged.ok, false);
if (forged.ok) throw new Error("forged_signed_result_unexpected_ready");
assert.equal(
  forged.reason,
  "payment_keyed_custodian_broadcast_binding_invalid",
);

function dependencies(options: {
  claim?: boolean;
  release?: boolean;
  broadcast?: BuyVoidPaymentKeyedCustodianBroadcastDependenciesV1[
    "broadcaster"
  ]["broadcast_signed_transaction"];
} = {}) {
  const calls = {
    claim: 0,
    release: 0,
    broadcast: 0,
    release_reason: "",
    raw: "",
  };
  const value: BuyVoidPaymentKeyedCustodianBroadcastDependenciesV1 = {
    submission_guard: {
      async claim_submission_once() {
        calls.claim += 1;
        return options.claim === false
          ? { claimed: false as const, reason: "already_claimed" }
          : { claimed: true as const };
      },
      async release_submission_claim(_binding, reason) {
        calls.release += 1;
        calls.release_reason = reason;
        return options.release === false
          ? { released: false as const, reason: "release_refused" }
          : { released: true as const };
      },
    },
    broadcaster: {
      async broadcast_signed_transaction(raw) {
        calls.broadcast += 1;
        calls.raw = raw;
        if (options.broadcast) return await options.broadcast(raw);
        return {
          accepted: true,
          transaction_hash: signed.signed_transaction_hash,
          provider_submission_id: "synthetic-payment-keyed-accepted-v1",
          submission_may_have_occurred: true,
        };
      },
    },
  };
  return { value, calls };
}

{
  const { value, calls } = dependencies();
  const wrongConfirmation =
    await runBuyVoidPaymentKeyedCustodianBroadcastV1({
      request,
      signed,
      apply: true,
      confirmation: "wrong",
      dependencies: value,
    });
  assert.equal(wrongConfirmation.ok, false);
  if (wrongConfirmation.ok) {
    throw new Error("wrong_confirmation_unexpected_ready");
  }
  assert.equal(
    wrongConfirmation.reason,
    "payment_keyed_custodian_broadcast_confirmation_required",
  );
  assert.deepEqual(calls, {
    claim: 0,
    release: 0,
    broadcast: 0,
    release_reason: "",
    raw: "",
  });
}

{
  const { value, calls } = dependencies({ claim: false });
  const duplicate =
    await runBuyVoidPaymentKeyedCustodianBroadcastV1({
      request,
      signed,
      apply: true,
      confirmation:
        VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_BROADCAST_CONFIRMATION_V1,
      dependencies: value,
    });
  assert.equal(duplicate.ok, false);
  if (duplicate.ok) throw new Error("duplicate_unexpected_ready");
  assert.equal(
    duplicate.reason,
    "payment_keyed_submission_guard_already_claimed",
  );
  assert.equal(duplicate.reconciliation_required, true);
  assert.equal(duplicate.retry_allowed, false);
  assert.equal(calls.claim, 1);
  assert.equal(calls.release, 0);
  assert.equal(calls.broadcast, 0);
}

{
  const { value, calls } = dependencies({
    broadcast: async () => ({
      accepted: false,
      provider_submission_id: "synthetic-definitive-no-submit-v1",
      submission_may_have_occurred: false,
    }),
  });
  const notBroadcast =
    await runBuyVoidPaymentKeyedCustodianBroadcastV1({
      request,
      signed,
      apply: true,
      confirmation:
        VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_BROADCAST_CONFIRMATION_V1,
      dependencies: value,
    });
  assert.equal(notBroadcast.ok, false);
  if (notBroadcast.ok) throw new Error("definitive_no_unexpected_ready");
  assert.equal(notBroadcast.status, "not_broadcast");
  assert.equal(
    notBroadcast.reason,
    "payment_keyed_broadcast_definitively_not_submitted",
  );
  assert.equal(notBroadcast.submission_guard_released, true);
  assert.equal(notBroadcast.reconciliation_required, false);
  assert.equal(notBroadcast.retry_allowed, true);
  assert.equal(calls.claim, 1);
  assert.equal(calls.broadcast, 1);
  assert.equal(calls.release, 1);
  assert.equal(
    calls.release_reason,
    "broadcast_definitively_not_submitted",
  );
}

{
  const { value, calls } = dependencies({
    broadcast: async () => {
      throw new Error("synthetic submission ambiguity");
    },
  });
  const unknown =
    await runBuyVoidPaymentKeyedCustodianBroadcastV1({
      request,
      signed,
      apply: true,
      confirmation:
        VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_BROADCAST_CONFIRMATION_V1,
      dependencies: value,
    });
  assert.equal(unknown.ok, false);
  if (unknown.ok) throw new Error("exception_unexpected_ready");
  assert.equal(unknown.status, "broadcast_unknown");
  assert.equal(
    unknown.reason,
    "payment_keyed_broadcast_submission_exception_unknown",
  );
  assert.equal(unknown.reconciliation_required, true);
  assert.equal(unknown.retry_allowed, false);
  assert.equal(calls.claim, 1);
  assert.equal(calls.broadcast, 1);
  assert.equal(calls.release, 0);
}

{
  const { value, calls } = dependencies({
    broadcast: async () => ({
      accepted: true,
      transaction_hash: "0x" + "f".repeat(64),
      provider_submission_id: "synthetic-wrong-hash-v1",
      submission_may_have_occurred: true,
    }),
  });
  const wrongHash =
    await runBuyVoidPaymentKeyedCustodianBroadcastV1({
      request,
      signed,
      apply: true,
      confirmation:
        VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_BROADCAST_CONFIRMATION_V1,
      dependencies: value,
    });
  assert.equal(wrongHash.ok, false);
  if (wrongHash.ok) throw new Error("wrong_hash_unexpected_ready");
  assert.equal(wrongHash.status, "broadcast_unknown");
  assert.equal(
    wrongHash.reason,
    "payment_keyed_broadcast_accepted_hash_mismatch",
  );
  assert.equal(wrongHash.reconciliation_required, true);
  assert.equal(calls.release, 0);
}

{
  const { value, calls } = dependencies({
    broadcast: async () => ({
      accepted: false,
      transaction_hash: signed.signed_transaction_hash,
      provider_submission_id: "contains space",
      submission_may_have_occurred: false,
    }),
  });
  const invalidProvider =
    await runBuyVoidPaymentKeyedCustodianBroadcastV1({
      request,
      signed,
      apply: true,
      confirmation:
        VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_BROADCAST_CONFIRMATION_V1,
      dependencies: value,
    });
  assert.equal(invalidProvider.ok, false);
  if (invalidProvider.ok) {
    throw new Error("invalid_provider_unexpected_ready");
  }
  assert.equal(invalidProvider.status, "not_broadcast");
  assert.equal(invalidProvider.submission_guard_released, true);
  assert.equal(calls.release_reason, "invalid_provider_submission_id");
}

{
  const { value, calls } = dependencies();
  const accepted =
    await runBuyVoidPaymentKeyedCustodianBroadcastV1({
      request,
      signed,
      apply: true,
      confirmation:
        VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_BROADCAST_CONFIRMATION_V1,
      dependencies: value,
    });
  if (accepted.ok === false) throw new Error(accepted.reason);
  assert.equal(accepted.status, "broadcast_accepted");
  assert.equal(accepted.applied, true);
  assert.equal(accepted.submission_guard_claimed, true);
  assert.equal(accepted.submission_guard_released, false);
  assert.equal(accepted.broadcast_call_performed, true);
  assert.equal(accepted.transaction_broadcast_accepted, true);
  assert.equal(
    accepted.transaction_hash,
    signed.signed_transaction_hash,
  );
  assert.equal(
    accepted.unsigned_transaction_fingerprint_sha256,
    request.unsigned_transaction_fingerprint_sha256,
  );
  assert.equal(calls.claim, 1);
  assert.equal(calls.release, 0);
  assert.equal(calls.broadcast, 1);
  assert.equal(calls.raw, signed.raw_signed_transaction);
  assert.equal(accepted.raw_signed_transaction_persisted, false);
  assert.equal(accepted.raw_signed_transaction_returned, false);
  assert.equal(Object.hasOwn(accepted, "raw_signed_transaction"), false);
}

assert.equal(
  VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_BROADCAST_AUTHORITY_V1
    .explicit_confirmation_required,
  true,
);
assert.equal(
  VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_BROADCAST_AUTHORITY_V1
    .durable_submission_guard_required,
  true,
);
assert.equal(
  VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_BROADCAST_AUTHORITY_V1
    .signed_transaction_fully_decoded_and_revalidated,
  true,
);
assert.equal(
  VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_BROADCAST_AUTHORITY_V1
    .raw_signed_transaction_persistence,
  false,
);
assert.equal(
  VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_BROADCAST_AUTHORITY_V1
    .raw_signed_transaction_output,
  false,
);
assert.equal(
  VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_BROADCAST_AUTHORITY_V1
    .automatic_retry,
  false,
);

console.log("VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_BROADCAST_V1_PROOF_GREEN");
console.log("request_binding_rederived=true");
console.log("canonical_payment_key_rederived=true");
console.log("canonical_unsigned_transaction_fingerprint_rederived=true");
console.log("signed_transaction_fully_revalidated=true");
console.log("durable_submission_guard_required=true");
console.log("definitive_no_submission_releases_guard=true");
console.log("ambiguous_submission_requires_reconciliation=true");
console.log("raw_signed_transaction_persisted=false");
console.log("raw_signed_transaction_returned=false");
console.log("automatic_retry=false");
