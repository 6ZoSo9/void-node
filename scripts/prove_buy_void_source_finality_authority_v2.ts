import assert from "node:assert/strict";
import fs from "node:fs";

import {
  VOID_BUY_VOID_CANONICAL_PRESALE_ECONOMICS_V2,
  VOID_BUY_VOID_SOURCE_FINALITY_AUTHORITY_V2,
  VOID_BUY_VOID_SOURCE_FINALITY_STATIC_POLICY_V2,
  buildBuyVoidSourceFinalityAuthorityV2,
  normalizeBuyVoidSourceFinalityStaticPolicyV2,
  type BuyVoidSourceFinalityStaticPolicyV2,
} from "../src/economic/buy_void_source_finality_authority_v2.js";
import { VOID_BUY_VOID_SOURCE_CHAIN_FINALITY_RPC_ADAPTER_V1 } from "../src/economic/buy_void_source_chain_finality_rpc_adapter_v1.js";
import { VOID_BUY_VOID_VERIFIED_PAYMENT_V2 } from "../src/economic/buy_void_verified_payment_v2.js";

const TX = `0x${"a".repeat(64)}`;
const RECEIPT_HASH = `0x${"b".repeat(64)}`;
const FINALIZED_HASH = `0x${"c".repeat(64)}`;
const FINALIZED_HASH_2 = `0x${"d".repeat(64)}`;
const PAYER = `0x${"5".repeat(40)}`;
const BASE_USDC = `0x${"1".repeat(40)}`;
const BASE_RECEIVE = `0x${"2".repeat(40)}`;
const ETH_USDC = `0x${"3".repeat(40)}`;
const ETH_RECEIVE = `0x${"4".repeat(40)}`;
const BASE_RPC_FP = "a".repeat(64);
const ETH_RPC_FP = "b".repeat(64);

function policy(): BuyVoidSourceFinalityStaticPolicyV2 {
  return {
    schema: "void_buy_void_source_finality_static_policy_v2",
    marker: VOID_BUY_VOID_SOURCE_FINALITY_STATIC_POLICY_V2,
    version: 2,
    rail_order: ["base", "ethereum"],
    rails: [
      {
        source_chain: "base",
        evm_chain_id: "8453",
        usdc_contract: BASE_USDC,
        receive_address: BASE_RECEIVE,
        rpc_identity: "base-rpc-v2",
        rpc_url_fingerprint_sha256: BASE_RPC_FP,
        finality_adapter_id: "base-finality-v2",
        min_confirmations: "2",
      },
      {
        source_chain: "ethereum",
        evm_chain_id: "1",
        usdc_contract: ETH_USDC,
        receive_address: ETH_RECEIVE,
        rpc_identity: "ethereum-rpc-v2",
        rpc_url_fingerprint_sha256: ETH_RPC_FP,
        finality_adapter_id: "ethereum-finality-v2",
        min_confirmations: "3",
      },
    ],
    economics: { ...VOID_BUY_VOID_CANONICAL_PRESALE_ECONOMICS_V2 },
  };
}

function observedBase(): any {
  return {
    ok: true,
    status: "source_chain_finality_observed",
    marker: VOID_BUY_VOID_SOURCE_CHAIN_FINALITY_RPC_ADAPTER_V1,
    source_chain: "base",
    evm_chain_id: "8453",
    rpc_identity: "base-rpc-v2",
    rpc_url_fingerprint_sha256: BASE_RPC_FP,
    finality_adapter_id: "base-finality-v2",
    min_confirmations: "2",
    verified_payment_event: {
      schema: "void_buy_void_verified_payment_event_v2",
      marker: VOID_BUY_VOID_VERIFIED_PAYMENT_V2,
      request_id: "request-001",
      operator_status: "payment_verified",
      payment_verified: true,
      tx_hash: TX,
      payment_identity_input_complete: true,
      payment_verifier: {
        chain: "base",
        transaction_hash: TX,
        log_index: "7",
        block_number: "100",
        confirmations: "31",
        usdc_contract: BASE_USDC,
        from_address: PAYER,
        receive_address: BASE_RECEIVE,
        delivery_address: PAYER,
        amount_units: "1000000",
        requested_units: "1000000",
      },
    },
    finality_observation_for_1463: {
      source_chain: "base",
      evm_chain_id: "8453",
      transaction_hash: TX,
      log_index: "7",
      receipt_block_number: "100",
      observed_finalized_reference_block: "120",
      confirmations_observed: "21",
      finality_adapter_id: "base-finality-v2",
    },
    block_evidence: {
      schema: "void_buy_void_source_chain_finality_block_evidence_v1",
      marker: VOID_BUY_VOID_SOURCE_CHAIN_FINALITY_RPC_ADAPTER_V1,
      source_chain: "base",
      evm_chain_id: "8453",
      receipt_block_number: "100",
      receipt_block_hash: RECEIPT_HASH,
      finalized_reference_block: "120",
      finalized_reference_block_hash: FINALIZED_HASH,
      finalized_tag: "finalized",
      provider_consistency_verified: true,
    },
    same_provider_consistency_verified: true,
    ancestry_verified: false,
    provider_quorum_verified: false,
    production_source_finality_authority_ready: false,
    wallet_access: false,
    signing: false,
    transaction_construction: false,
    transaction_broadcast: false,
    inventory_mutation: false,
    money_movement: false,
  };
}

function observedEthereum(): any {
  const v = structuredClone(observedBase());
  v.source_chain = "ethereum";
  v.evm_chain_id = "1";
  v.rpc_identity = "ethereum-rpc-v2";
  v.rpc_url_fingerprint_sha256 = ETH_RPC_FP;
  v.finality_adapter_id = "ethereum-finality-v2";
  v.min_confirmations = "3";
  v.verified_payment_event.payment_verifier.chain = "ethereum";
  v.verified_payment_event.payment_verifier.usdc_contract = ETH_USDC;
  v.verified_payment_event.payment_verifier.receive_address = ETH_RECEIVE;
  v.finality_observation_for_1463.source_chain = "ethereum";
  v.finality_observation_for_1463.evm_chain_id = "1";
  v.finality_observation_for_1463.finality_adapter_id = "ethereum-finality-v2";
  v.block_evidence.source_chain = "ethereum";
  v.block_evidence.evm_chain_id = "1";
  return v;
}

let passed = 0;
function test(name: string, fn: () => void) {
  fn();
  passed += 1;
  console.log(`PASS ${name}`);
}
function mustFail(name: string, fn: () => unknown) {
  let message = "";
  try { fn(); } catch (error) { message = String((error as Error).message || error); }
  assert.ok(message.includes(VOID_BUY_VOID_SOURCE_FINALITY_AUTHORITY_V2), `${name}: ${message}`);
}

test("Base result binds exact payment and block hashes", () => {
  const r = buildBuyVoidSourceFinalityAuthorityV2({ policy_generation: policy(), observed: observedBase() });
  assert.equal(r.source_chain, "base");
  assert.equal(r.transaction_hash, TX);
  assert.equal(r.receipt_block_hash, RECEIPT_HASH);
  assert.equal(r.finalized_reference_block_hash, FINALIZED_HASH);
  assert.equal(r.payment_usdc_atoms, "1000000");
});

test("Ethereum result binds chain id 1", () => {
  const r = buildBuyVoidSourceFinalityAuthorityV2({ policy_generation: policy(), observed: observedEthereum() });
  assert.equal(r.source_chain, "ethereum");
  assert.equal(r.evm_chain_id, "1");
  assert.equal(r.usdc_contract, ETH_USDC);
});

test("moving finalized reference changes observation not stable policy", () => {
  const a = buildBuyVoidSourceFinalityAuthorityV2({ policy_generation: policy(), observed: observedBase() });
  const moved = observedBase();
  moved.finality_observation_for_1463.observed_finalized_reference_block = "121";
  moved.finality_observation_for_1463.confirmations_observed = "22";
  moved.block_evidence.finalized_reference_block = "121";
  moved.block_evidence.finalized_reference_block_hash = FINALIZED_HASH_2;
  const b = buildBuyVoidSourceFinalityAuthorityV2({ policy_generation: policy(), observed: moved });
  assert.equal(a.stable_config_sha256, b.stable_config_sha256);
  assert.equal(a.policy_id, b.policy_id);
  assert.notEqual(a.observation_sha256, b.observation_sha256);
  assert.notEqual(a.source_finality_attestation_sha256, b.source_finality_attestation_sha256);
});

test("stable policy rejects finalized-reference height", () => {
  const p: any = policy(); p.rails[0].finalized_reference_block = "120";
  mustFail("height in stable policy", () => normalizeBuyVoidSourceFinalityStaticPolicyV2(p));
});

test("stable policy rejects finalized-reference hash", () => {
  const p: any = policy(); p.rails[0].finalized_reference_block_hash = FINALIZED_HASH;
  mustFail("hash in stable policy", () => normalizeBuyVoidSourceFinalityStaticPolicyV2(p));
});

test("rail order is closed", () => {
  const p = policy(); p.rails = [p.rails[1], p.rails[0]];
  mustFail("rail order", () => normalizeBuyVoidSourceFinalityStaticPolicyV2(p));
});

test("RPC identities must be isolated", () => {
  const p = policy(); p.rails[1].rpc_identity = p.rails[0].rpc_identity;
  mustFail("rpc isolation", () => normalizeBuyVoidSourceFinalityStaticPolicyV2(p));
});

test("finality adapters must be isolated", () => {
  const p = policy(); p.rails[1].finality_adapter_id = p.rails[0].finality_adapter_id;
  mustFail("adapter isolation", () => normalizeBuyVoidSourceFinalityStaticPolicyV2(p));
});

test("canonical economics cannot drift", () => {
  const p = policy(); p.economics.rate_void_units_numerator = "3";
  mustFail("economics", () => normalizeBuyVoidSourceFinalityStaticPolicyV2(p));
});

test("RPC identity must match selected stable rail", () => {
  const o = observedBase(); o.rpc_identity = "wrong-rpc";
  mustFail("rpc identity", () => buildBuyVoidSourceFinalityAuthorityV2({ policy_generation: policy(), observed: o }));
});

test("RPC URL fingerprint must match selected stable rail", () => {
  const o = observedBase(); o.rpc_url_fingerprint_sha256 = "f".repeat(64);
  mustFail("rpc fingerprint", () => buildBuyVoidSourceFinalityAuthorityV2({ policy_generation: policy(), observed: o }));
});

test("finality adapter must match selected stable rail", () => {
  const o = observedBase(); o.finality_adapter_id = "wrong-finality";
  mustFail("adapter", () => buildBuyVoidSourceFinalityAuthorityV2({ policy_generation: policy(), observed: o }));
});

test("USDC and receive address remain policy-bound", () => {
  const o = observedBase(); o.verified_payment_event.payment_verifier.usdc_contract = `0x${"9".repeat(40)}`;
  mustFail("USDC", () => buildBuyVoidSourceFinalityAuthorityV2({ policy_generation: policy(), observed: o }));
});

test("payer must equal delivery address", () => {
  const o = observedBase(); o.verified_payment_event.payment_verifier.delivery_address = `0x${"6".repeat(40)}`;
  mustFail("payer delivery", () => buildBuyVoidSourceFinalityAuthorityV2({ policy_generation: policy(), observed: o }));
});

test("payment amount must remain exact", () => {
  const o = observedBase(); o.verified_payment_event.payment_verifier.amount_units = "999999";
  mustFail("amount", () => buildBuyVoidSourceFinalityAuthorityV2({ policy_generation: policy(), observed: o }));
});

test("finality transaction and log bind verified payment", () => {
  const o = observedBase(); o.finality_observation_for_1463.log_index = "8";
  mustFail("log mismatch", () => buildBuyVoidSourceFinalityAuthorityV2({ policy_generation: policy(), observed: o }));
});

test("block evidence reference must match dynamic observation", () => {
  const o = observedBase(); o.block_evidence.finalized_reference_block = "121";
  mustFail("reference mismatch", () => buildBuyVoidSourceFinalityAuthorityV2({ policy_generation: policy(), observed: o }));
});

test("receipt and finalized hashes are mandatory", () => {
  const o = observedBase(); o.block_evidence.receipt_block_hash = "0x12";
  mustFail("receipt hash", () => buildBuyVoidSourceFinalityAuthorityV2({ policy_generation: policy(), observed: o }));
});

test("confirmation count is rederived", () => {
  const o = observedBase(); o.finality_observation_for_1463.confirmations_observed = "20";
  mustFail("confirmation count", () => buildBuyVoidSourceFinalityAuthorityV2({ policy_generation: policy(), observed: o }));
});

test("minimum finality threshold is enforced", () => {
  const p = policy(); p.rails[0].min_confirmations = "30";
  const o = observedBase(); o.min_confirmations = "30";
  mustFail("threshold", () => buildBuyVoidSourceFinalityAuthorityV2({ policy_generation: p, observed: o }));
});

test("u32 maximum log index is accepted", () => {
  const o = observedBase(); o.verified_payment_event.payment_verifier.log_index = "4294967295"; o.finality_observation_for_1463.log_index = "4294967295";
  const r = buildBuyVoidSourceFinalityAuthorityV2({ policy_generation: policy(), observed: o });
  assert.equal(r.log_index, "4294967295");
});

test("u32 overflow log index is rejected", () => {
  const o = observedBase(); o.verified_payment_event.payment_verifier.log_index = "4294967296"; o.finality_observation_for_1463.log_index = "4294967296";
  mustFail("u32 overflow", () => buildBuyVoidSourceFinalityAuthorityV2({ policy_generation: policy(), observed: o }));
});

test("canonical payment identity and key are deterministic", () => {
  const a = buildBuyVoidSourceFinalityAuthorityV2({ policy_generation: policy(), observed: observedBase() });
  const b = buildBuyVoidSourceFinalityAuthorityV2({ policy_generation: policy(), observed: observedBase() });
  assert.equal(a.canonical_payment_identity, `voidpay1:base:${TX}:7`);
  assert.equal(a.payment_key_sha256, b.payment_key_sha256);
  assert.match(a.payment_key_sha256, /^[0-9a-f]{64}$/);
});

test("unknown top-level #1471 observation field fails closed", () => {
  const o = observedBase();
  o.unexpected = true;
  mustFail("top-level unknown field", () =>
    buildBuyVoidSourceFinalityAuthorityV2({
      policy_generation: policy(),
      observed: o,
    }),
  );
});

test("unknown verified-payment event field fails closed", () => {
  const o = observedBase();
  o.verified_payment_event.unexpected = true;
  mustFail("payment event unknown field", () =>
    buildBuyVoidSourceFinalityAuthorityV2({
      policy_generation: policy(),
      observed: o,
    }),
  );
});

test("unknown payment-verifier field fails closed", () => {
  const o = observedBase();
  o.verified_payment_event.payment_verifier.unexpected = true;
  mustFail("payment verifier unknown field", () =>
    buildBuyVoidSourceFinalityAuthorityV2({
      policy_generation: policy(),
      observed: o,
    }),
  );
});

test("unknown finality-observation field fails closed", () => {
  const o = observedBase();
  o.finality_observation_for_1463.unexpected = true;
  mustFail("finality observation unknown field", () =>
    buildBuyVoidSourceFinalityAuthorityV2({
      policy_generation: policy(),
      observed: o,
    }),
  );
});

test("unknown block-evidence field fails closed", () => {
  const o = observedBase();
  o.block_evidence.unexpected = true;
  mustFail("block evidence unknown field", () =>
    buildBuyVoidSourceFinalityAuthorityV2({
      policy_generation: policy(),
      observed: o,
    }),
  );
});

test("payment operator status must remain exact", () => {
  const o = observedBase();
  o.verified_payment_event.operator_status = "something_else";
  mustFail("payment status", () =>
    buildBuyVoidSourceFinalityAuthorityV2({
      policy_generation: policy(),
      observed: o,
    }),
  );
});

test("source generation is expected but not yet provenance-verified", () => {
  const r = buildBuyVoidSourceFinalityAuthorityV2({
    policy_generation: policy(),
    observed: observedBase(),
  });
  assert.match(
    r.expected_source_generation_sha256,
    /^[0-9a-f]{64}$/,
  );
  assert.equal(r.source_generation_verified, false);
});

test("unclosed V515 gates remain hard false", () => {
  const r = buildBuyVoidSourceFinalityAuthorityV2({ policy_generation: policy(), observed: observedBase() });
  assert.equal(r.authenticated_transport_identity_verified, false);
  assert.equal(r.total_operation_deadline_verified, false);
  assert.equal(r.ancestry_verified, false);
  assert.equal(r.provider_quorum_verified, false);
  assert.equal(r.production_source_finality_authority_ready, false);
});

test("candidate grants no wallet transaction inventory or money authority", () => {
  const r = buildBuyVoidSourceFinalityAuthorityV2({ policy_generation: policy(), observed: observedBase() });
  assert.equal(r.wallet_access, false);
  assert.equal(r.signing, false);
  assert.equal(r.transaction_construction, false);
  assert.equal(r.transaction_broadcast, false);
  assert.equal(r.inventory_mutation, false);
  assert.equal(r.money_movement, false);
});

test("candidate source executes no live RPC and mounts no runtime", () => {
  const source = fs.readFileSync("src/economic/buy_void_source_finality_authority_v2.ts", "utf8");
  assert.equal(source.includes("observeBuyVoidSourceChainFinalityV1("), false);
  assert.equal(source.includes("createBuyVoidPaymentHttpTransportV1("), false);
  assert.equal(source.includes("app.post("), false);
  assert.equal(source.includes("listen("), false);
});

console.log(JSON.stringify({
  marker: "VOID_BUY_VOID_SOURCE_FINALITY_AUTHORITY_V2_GREEN",
  cases_passed: passed,
  cases_total: passed,
  finalized_reference_in_stable_policy: false,
  dynamic_reference_changes_observation_not_policy: true,
  exact_payment_bound: true,
  receipt_block_hash_bound: true,
  finalized_reference_block_hash_bound: true,
  rpc_identity_bound: true,
  rpc_url_fingerprint_bound: true,
  authenticated_transport_identity_verified: false,
  total_operation_deadline_verified: false,
  source_generation_verified: false,
  ancestry_verified: false,
  provider_quorum_verified: false,
  production_source_finality_authority_ready: false,
  live_rpc_executed_by_proof: false,
  wallet_access: false,
  signing: false,
  transaction_broadcast: false,
  money_movement: false,
}, null, 2));
console.log("VOID_BUY_VOID_SOURCE_FINALITY_AUTHORITY_V2_GREEN");
