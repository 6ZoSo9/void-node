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
  buildBuyVoidPaymentKeyedCustodianPrepareRequestV1,
} from "../src/economic/buy_void_payment_keyed_custodian_prepare_request_v1.js";
import {
  buildBuyVoidPaymentKeyedUnsignedTransactionV1,
} from "../src/economic/buy_void_payment_keyed_unsigned_transaction_v1.js";
import {
  VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_SIGNER_AUTHORITY_V1,
  VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_SIGNER_CONFIRMATION_V1,
  VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_SIGNER_V1,
  runBuyVoidPaymentKeyedCustodianSignerV1,
} from "../src/economic/buy_void_payment_keyed_custodian_signer_v1.js";
import type {
  BuyVoidDeliverySignerV1,
} from "../src/economic/buy_void_delivery_sign_broadcast_adapter_v1.js";

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
      request_id: "buyvoid-payment-keyed-custodian-signer-v1",
      instruction_id: "8".repeat(64),
      intent_fingerprint: "9".repeat(64),
      max_attempts_per_payment: 1,
      unsigned_instruction: {
        schema: "void_buy_void_unsigned_fulfillment_instruction_v1",
        marker: "VOID_BUY_VOID_AUTO_FULFILLMENT_V1",
        instruction_id: "8".repeat(64),
        request_id: "buyvoid-payment-keyed-custodian-signer-v1",
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

const dryRun = await runBuyVoidPaymentKeyedCustodianSignerV1({
  request,
  apply: false,
});
if (dryRun.ok === false) throw new Error(dryRun.reason);
assert.equal(dryRun.status, "dry_run");
assert.equal(dryRun.applied, false);
assert.equal(dryRun.wallet_access_performed, false);
assert.equal(dryRun.signing_performed, false);
assert.equal(dryRun.transaction_broadcast_performed, false);
assert.equal(dryRun.money_movement_performed, false);
assert.equal(dryRun.raw_signed_transaction, null);

let getAddressCalls = 0;
let signCalls = 0;
const signer: BuyVoidDeliverySignerV1 = {
  async get_address() {
    getAddressCalls += 1;
    return WALLET;
  },
  async sign_transaction(transaction) {
    signCalls += 1;
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

const noConfirmation = await runBuyVoidPaymentKeyedCustodianSignerV1({
  request,
  apply: true,
  signer,
});
assert.equal(noConfirmation.ok, false);
if (noConfirmation.ok) throw new Error("no_confirmation_unexpected_ready");
assert.equal(
  noConfirmation.reason,
  "payment_keyed_custodian_signer_confirmation_required",
);
assert.equal(getAddressCalls, 0);
assert.equal(signCalls, 0);

const signed = await runBuyVoidPaymentKeyedCustodianSignerV1({
  request,
  apply: true,
  confirmation: VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_SIGNER_CONFIRMATION_V1,
  signer,
});
if (signed.ok === false) throw new Error(signed.reason);
assert.equal(signed.marker, VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_SIGNER_V1);
assert.equal(signed.version, 1);
assert.equal(signed.status, "signed");
assert.equal(signed.applied, true);
assert.equal(signed.attempt_id, ATTEMPT_ID);
assert.equal(signed.saga_id, SAGA_ID);
assert.equal(signed.plan_reservation_id, PLAN_RESERVATION_ID);
assert.equal(signed.idempotency_key_sha256, request.idempotency_key_sha256);
assert.equal(
  signed.request_fingerprint_sha256,
  request.request_fingerprint_sha256,
);
assert.equal(signed.wallet_address, WALLET);
assert.equal(signed.signer_address, WALLET);
assert.equal(
  signed.transaction_plan_fingerprint_sha256,
  request.transaction_plan_fingerprint_sha256,
);
assert.equal(
  signed.unsigned_transaction_fingerprint_sha256,
  request.unsigned_transaction_fingerprint_sha256,
);
assert.match(signed.signed_transaction_hash || "", /^0x[0-9a-f]{64}$/);
assert.match(signed.raw_signed_transaction || "", /^0x[0-9a-fA-F]+$/);
assert.match(signed.raw_signed_transaction_sha256 || "", /^[0-9a-f]{64}$/);
assert.equal(signed.raw_signed_transaction_persisted, false);
assert.equal(signed.mutation_performed, false);
assert.equal(signed.credential_access_performed_by_this_module, false);
assert.equal(signed.wallet_access_performed, true);
assert.equal(signed.signing_performed, true);
assert.equal(signed.transaction_broadcast_performed, false);
assert.equal(signed.money_movement_performed, false);
assert.equal(getAddressCalls, 1);
assert.equal(signCalls, 1);

const parsed = Transaction.from(signed.raw_signed_transaction!);
assert.equal(parsed.from?.toLowerCase(), WALLET);
assert.equal(parsed.to?.toLowerCase(), CONTRACT);
assert.equal(parsed.type, 2);
assert.equal(parsed.chainId, 2050n);
assert.equal(parsed.nonce, 7);
assert.equal(parsed.gasLimit, 120000n);
assert.equal(parsed.maxFeePerGas, 2000000000n);
assert.equal(parsed.maxPriorityFeePerGas, 1000000000n);
assert.equal(parsed.value, 0n);
assert.equal(parsed.data.toLowerCase(), request.transaction_calldata);

let mismatchSignCalls = 0;
const otherWallet = new Wallet("0x" + "22".repeat(32));
const mismatchSigner: BuyVoidDeliverySignerV1 = {
  async get_address() {
    return otherWallet.address;
  },
  async sign_transaction() {
    mismatchSignCalls += 1;
    throw new Error("must-not-sign");
  },
};
const mismatch = await runBuyVoidPaymentKeyedCustodianSignerV1({
  request,
  apply: true,
  confirmation: VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_SIGNER_CONFIRMATION_V1,
  signer: mismatchSigner,
});
assert.equal(mismatch.ok, false);
if (mismatch.ok) throw new Error("mismatch_unexpected_ready");
assert.equal(
  mismatch.reason,
  "payment_keyed_custodian_signer_wallet_mismatch",
);
assert.equal(mismatch.wallet_access_performed, true);
assert.equal(mismatch.signing_performed, false);
assert.equal(mismatchSignCalls, 0);

const maliciousSigner: BuyVoidDeliverySignerV1 = {
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
      to: DELIVERY,
      value: 0n,
      data: "0x",
    });
  },
};
const malicious = await runBuyVoidPaymentKeyedCustodianSignerV1({
  request,
  apply: true,
  confirmation: VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_SIGNER_CONFIRMATION_V1,
  signer: maliciousSigner,
});
assert.equal(malicious.ok, false);
if (malicious.ok) throw new Error("malicious_unexpected_ready");
assert.equal(
  malicious.reason,
  "payment_keyed_custodian_signer_signed_transaction_invalid",
);
assert.equal(malicious.wallet_access_performed, true);
assert.equal(malicious.signing_performed, true);
assert.equal(malicious.transaction_broadcast_performed, false);

let forgedSignerTouched = false;
const forgedRequest = {
  ...request,
  transaction_calldata:
    request.transaction_calldata.slice(0, 10) +
    (request.transaction_calldata[10] === "0" ? "1" : "0") +
    request.transaction_calldata.slice(11),
};
const forged = await runBuyVoidPaymentKeyedCustodianSignerV1({
  request: forgedRequest,
  apply: true,
  confirmation: VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_SIGNER_CONFIRMATION_V1,
  signer: {
    async get_address() {
      forgedSignerTouched = true;
      return WALLET;
    },
    async sign_transaction() {
      forgedSignerTouched = true;
      return "";
    },
  },
});
assert.equal(forged.ok, false);
if (forged.ok) throw new Error("forged_unexpected_ready");
assert.equal(
  forged.reason,
  "payment_keyed_custodian_signer_request_invalid",
);
assert.equal(forgedSignerTouched, false);

const changedFingerprint = {
  ...request,
  request_fingerprint_sha256:
    (request.request_fingerprint_sha256[0] === "0" ? "1" : "0") +
    request.request_fingerprint_sha256.slice(1),
};
const changed = await runBuyVoidPaymentKeyedCustodianSignerV1({
  request: changedFingerprint,
  apply: false,
});
assert.equal(changed.ok, false);
if (changed.ok) throw new Error("changed_fingerprint_unexpected_ready");
assert.equal(
  changed.reason,
  "payment_keyed_custodian_signer_request_invalid",
);

assert.equal(
  VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_SIGNER_AUTHORITY_V1
    .exact_custodian_request_schema_required,
  true,
);
assert.equal(
  VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_SIGNER_AUTHORITY_V1
    .returned_signature_fully_decoded_and_revalidated,
  true,
);
assert.equal(
  VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_SIGNER_AUTHORITY_V1
    .canonical_unsigned_transaction_fingerprint_rederived,
  true,
);
assert.equal(
  VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_SIGNER_AUTHORITY_V1
    .credential_access_by_this_module,
  false,
);
assert.equal(
  VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_SIGNER_AUTHORITY_V1
    .transaction_broadcast,
  false,
);
assert.equal(
  VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_SIGNER_AUTHORITY_V1.money_movement,
  false,
);

console.log("VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_SIGNER_V1_PROOF_GREEN");
console.log("exact_custodian_request_schema_required=true");
console.log("request_fingerprint_rederived=true");
console.log("idempotency_key_rederived=true");
console.log("canonical_payment_key_rederived=true");
console.log("exact_fulfill_calldata_rederived=true");
console.log("transaction_plan_fingerprint_rederived=true");
console.log("canonical_unsigned_transaction_fingerprint_rederived=true");
console.log("unsigned_transaction_fingerprint_rederived=true");
console.log("explicit_confirmation_required=true");
console.log("signer_address_must_match_request_wallet=true");
console.log("malicious_signed_transaction_rejected=true");
console.log("forged_request_rejected_before_signer=true");
console.log("credential_access_by_this_module=false");
console.log("transaction_broadcast=false");
console.log("money_movement=false");
