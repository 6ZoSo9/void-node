import crypto from "node:crypto";

import {
  VOID_BUY_VOID_SOURCE_CHAIN_FINALITY_RPC_ADAPTER_V1,
  type BuyVoidSourceChainFinalityReadyV1,
} from "./buy_void_source_chain_finality_rpc_adapter_v1.js";
import { VOID_BUY_VOID_VERIFIED_PAYMENT_V2 } from "./buy_void_verified_payment_v2.js";

export const VOID_BUY_VOID_SOURCE_FINALITY_AUTHORITY_V2 =
  "VOID_BUY_VOID_SOURCE_FINALITY_AUTHORITY_V2";
export const VOID_BUY_VOID_SOURCE_FINALITY_STATIC_POLICY_V2 =
  "VOID_BUY_VOID_SOURCE_FINALITY_STATIC_POLICY_V2";
export const VOID_BUY_VOID_SOURCE_FINALITY_AUTHORITY_ATTESTATION_V2 =
  "VOID_BUY_VOID_SOURCE_FINALITY_AUTHORITY_ATTESTATION_V2";

export const VOID_BUY_VOID_SOURCE_FINALITY_AUTHORITY_UPSTREAM_V2 = Object.freeze({
  main_base_sha: "0cb5832f88eab7c9a1678328e546f2a307b71530",
  pr_1463_head_sha: "35ce04e34320be7ab5f7773066de7c6c6384b034",
  pr_1469_head_sha: "16a269d3e1b0fba4635232cbb07905a9d1d2b451",
  pr_1470_head_sha: "b8962bec5480f214ffeaf4053bdfa45bf0e9c466",
  pr_1471_head_sha: "036c34a479d8dacbfd663fcb610adabbd0008428",
});

export const VOID_BUY_VOID_CANONICAL_PRESALE_ECONOMICS_V2 = Object.freeze({
  marker: "VOID_BUY_VOID_CANONICAL_PRESALE_ECONOMICS_DUAL_RAIL_V1",
  canonical_presale_max_void: "10000000",
  rate_void_units_numerator: "2",
  rate_void_units_denominator: "1",
  accepted_payment_asset: "USDC",
  exact_payment_required: true,
  one_payment_one_fulfillment: true,
  no_hidden_minimum: true,
  no_hidden_per_buyer_throttle_below_remaining_inventory: true,
});

export const VOID_BUY_VOID_SOURCE_FINALITY_AUTHORITY_BOUNDARY_V2 = Object.freeze({
  source_only_candidate: true,
  finalized_reference_is_stable_policy: false,
  finalized_reference_is_dynamic_observation: true,
  authenticated_transport_identity_verified: false,
  total_operation_deadline_verified: false,
  ancestry_verified: false,
  provider_quorum_verified: false,
  production_source_finality_authority_ready: false,
  wallet_access: false,
  signing: false,
  transaction_construction: false,
  transaction_broadcast: false,
  inventory_mutation: false,
  money_movement: false,
});

export type BuyVoidSourceFinalityStaticRailV2 = {
  source_chain: "base" | "ethereum";
  evm_chain_id: "8453" | "1";
  usdc_contract: string;
  receive_address: string;
  rpc_identity: string;
  rpc_url_fingerprint_sha256: string;
  finality_adapter_id: string;
  min_confirmations: string;
};

export type BuyVoidSourceFinalityStaticPolicyV2 = {
  schema: "void_buy_void_source_finality_static_policy_v2";
  marker: typeof VOID_BUY_VOID_SOURCE_FINALITY_STATIC_POLICY_V2;
  version: 2;
  rail_order: ["base", "ethereum"];
  rails: [BuyVoidSourceFinalityStaticRailV2, BuyVoidSourceFinalityStaticRailV2];
  economics: Record<string, unknown>;
};

export type BuyVoidSourceFinalityAuthorityV2Result = {
  ok: true;
  status: "source_finality_authority_candidate";
  schema: "void_buy_void_source_finality_authority_v2";
  marker: typeof VOID_BUY_VOID_SOURCE_FINALITY_AUTHORITY_V2;
  version: 2;
  source_chain: "base" | "ethereum";
  evm_chain_id: "8453" | "1";
  transaction_hash: string;
  log_index: string;
  canonical_payment_identity: string;
  payment_key_sha256: string;
  payer_address: string;
  receive_address: string;
  delivery_address: string;
  usdc_contract: string;
  payment_asset: "USDC";
  payment_usdc_atoms: string;
  receipt_block_number: string;
  receipt_block_hash: string;
  finalized_reference_block: string;
  finalized_reference_block_hash: string;
  confirmations_observed: string;
  finalized_tag: "finalized";
  rpc_identity: string;
  rpc_url_fingerprint_sha256: string;
  finality_adapter_id: string;
  min_confirmations: string;
  policy_id: string;
  stable_config_sha256: string;
  observation_sha256: string;
  source_finality_attestation_sha256: string;
  source_generation_sha256: string;
  provider_consistency_verified: true;
  same_provider_consistency_verified: true;
  authenticated_transport_identity_verified: false;
  total_operation_deadline_verified: false;
  ancestry_verified: false;
  provider_quorum_verified: false;
  production_source_finality_authority_ready: false;
  wallet_access: false;
  signing: false;
  transaction_construction: false;
  transaction_broadcast: false;
  inventory_mutation: false;
  money_movement: false;
};

const ADDRESS = /^0x[0-9a-f]{40}$/;
const HASH32 = /^0x[0-9a-f]{64}$/;
const SHA256 = /^[0-9a-f]{64}$/;
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/;
const UINT = /^(0|[1-9][0-9]*)$/;
const MAX_U32 = 0xffff_ffffn;
const MAX_CONFIRMATIONS = 1_000_000n;

function fail(code: string, detail = ""): never {
  throw new Error(`${VOID_BUY_VOID_SOURCE_FINALITY_AUTHORITY_V2}:${code}:${detail}`);
}

function plain(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function exactKeys(value: unknown, expected: readonly string[], code: string): void {
  if (!plain(value)) fail(code, "not_object");
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((v, i) => v !== wanted[i])) {
    fail(code, `expected=${wanted.join(",")};actual=${actual.join(",")}`);
  }
}

function canonical(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value)) fail("NON_CANONICAL_NUMBER", String(value));
    return String(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (plain(value)) {
    return `{${Object.keys(value).sort().map((k) => `${JSON.stringify(k)}:${canonical(value[k])}`).join(",")}}`;
  }
  fail("NON_CANONICAL_VALUE", typeof value);
}

function sha256(value: unknown): string {
  return crypto.createHash("sha256").update(canonical(value), "utf8").digest("hex");
}

function framedHash(domain: string, value: unknown): string {
  const body = Buffer.from(canonical(value), "utf8");
  const len = Buffer.alloc(4);
  len.writeUInt32BE(body.length, 0);
  return crypto.createHash("sha256").update(Buffer.concat([
    Buffer.from(`${domain}\0`, "ascii"), len, body,
  ])).digest("hex");
}

function text(value: unknown): string { return String(value ?? "").trim(); }
function chain(value: unknown): "base" | "ethereum" {
  const v = text(value).toLowerCase();
  if (v !== "base" && v !== "ethereum") fail("INVALID_SOURCE_CHAIN", v);
  return v;
}
function chainId(v: "base" | "ethereum"): "8453" | "1" { return v === "base" ? "8453" : "1"; }
function address(value: unknown, code: string): string {
  const v = text(value).toLowerCase();
  if (!ADDRESS.test(v)) fail(code, v);
  return v;
}
function hash32(value: unknown, code: string): string {
  const v = text(value).toLowerCase();
  if (!HASH32.test(v)) fail(code, v);
  return v;
}
function digest(value: unknown, code: string): string {
  const v = text(value).toLowerCase();
  if (!SHA256.test(v)) fail(code, v);
  return v;
}
function safeId(value: unknown, code: string): string {
  const v = text(value);
  if (!SAFE_ID.test(v)) fail(code, v);
  return v;
}
function uint(value: unknown, code: string, positive = false, max?: bigint): bigint {
  const v = text(value);
  if (!UINT.test(v)) fail(code, v);
  const n = BigInt(v);
  if ((positive && n === 0n) || (max !== undefined && n > max)) fail(code, v);
  return n;
}

const RAIL_KEYS = [
  "evm_chain_id", "finality_adapter_id", "min_confirmations", "receive_address",
  "rpc_identity", "rpc_url_fingerprint_sha256", "source_chain", "usdc_contract",
] as const;

function normalizeRail(input: unknown, expected: "base" | "ethereum"): BuyVoidSourceFinalityStaticRailV2 {
  exactKeys(input, RAIL_KEYS, "STATIC_RAIL_SHAPE");
  const r = input as Record<string, unknown>;
  const c = chain(r.source_chain);
  if (c !== expected) fail("STATIC_RAIL_ORDER_MISMATCH");
  if (text(r.evm_chain_id) !== chainId(c)) fail("STATIC_RAIL_CHAIN_ID_MISMATCH");
  return {
    source_chain: c,
    evm_chain_id: chainId(c),
    usdc_contract: address(r.usdc_contract, "STATIC_RAIL_USDC_INVALID"),
    receive_address: address(r.receive_address, "STATIC_RAIL_RECEIVE_INVALID"),
    rpc_identity: safeId(r.rpc_identity, "STATIC_RAIL_RPC_IDENTITY_INVALID"),
    rpc_url_fingerprint_sha256: digest(r.rpc_url_fingerprint_sha256, "STATIC_RAIL_RPC_FINGERPRINT_INVALID"),
    finality_adapter_id: safeId(r.finality_adapter_id, "STATIC_RAIL_FINALITY_ADAPTER_INVALID"),
    min_confirmations: uint(r.min_confirmations, "STATIC_RAIL_MIN_CONFIRMATIONS_INVALID", true, MAX_CONFIRMATIONS).toString(),
  };
}

export function normalizeBuyVoidSourceFinalityStaticPolicyV2(input: BuyVoidSourceFinalityStaticPolicyV2) {
  exactKeys(input, ["economics", "marker", "rail_order", "rails", "schema", "version"], "STATIC_POLICY_SHAPE");
  if (input.schema !== "void_buy_void_source_finality_static_policy_v2") fail("STATIC_POLICY_SCHEMA_MISMATCH");
  if (input.marker !== VOID_BUY_VOID_SOURCE_FINALITY_STATIC_POLICY_V2) fail("STATIC_POLICY_MARKER_MISMATCH");
  if (input.version !== 2) fail("STATIC_POLICY_VERSION_MISMATCH");
  if (!Array.isArray(input.rail_order) || input.rail_order.join(",") !== "base,ethereum") fail("STATIC_POLICY_RAIL_ORDER_MISMATCH");
  if (!Array.isArray(input.rails) || input.rails.length !== 2) fail("STATIC_POLICY_REQUIRES_TWO_RAILS");
  if (canonical(input.economics) !== canonical(VOID_BUY_VOID_CANONICAL_PRESALE_ECONOMICS_V2)) fail("STATIC_POLICY_ECONOMICS_MISMATCH");
  const rails = [normalizeRail(input.rails[0], "base"), normalizeRail(input.rails[1], "ethereum")] as const;
  if (rails[0].rpc_identity === rails[1].rpc_identity) fail("STATIC_POLICY_RPC_IDENTITIES_MUST_BE_DISTINCT");
  if (rails[0].finality_adapter_id === rails[1].finality_adapter_id) fail("STATIC_POLICY_FINALITY_ADAPTERS_MUST_BE_DISTINCT");
  const stable_config_sha256 = sha256({
    marker: VOID_BUY_VOID_SOURCE_FINALITY_STATIC_POLICY_V2,
    version: 2,
    rail_order: ["base", "ethereum"],
    rails,
    economics: VOID_BUY_VOID_CANONICAL_PRESALE_ECONOMICS_V2,
  });
  return {
    rails,
    stable_config_sha256,
    policy_id: `void-buy-void-source-finality-policy-v2-${stable_config_sha256}`,
  };
}

function paymentKey(identity: string): string {
  const body = Buffer.from(identity, "utf8");
  const len = Buffer.alloc(4);
  len.writeUInt32BE(body.length, 0);
  return crypto.createHash("sha256").update(Buffer.concat([
    Buffer.from("VOID_BUY_VOID_FULFILLMENT_ANCHOR_V1\0", "ascii"), len, body,
  ])).digest("hex");
}

export function buildBuyVoidSourceFinalityAuthorityV2(input: {
  policy_generation: BuyVoidSourceFinalityStaticPolicyV2;
  observed: BuyVoidSourceChainFinalityReadyV1;
}): BuyVoidSourceFinalityAuthorityV2Result {
  exactKeys(input, ["observed", "policy_generation"], "AUTHORITY_INPUT_SHAPE");
  const policy = normalizeBuyVoidSourceFinalityStaticPolicyV2(input.policy_generation);
  const o = input.observed as any;
  if (o?.ok !== true || o.status !== "source_chain_finality_observed" || o.marker !== VOID_BUY_VOID_SOURCE_CHAIN_FINALITY_RPC_ADAPTER_V1) fail("OBSERVED_AUTHORITY_INVALID");
  if (o.same_provider_consistency_verified !== true || o.ancestry_verified !== false || o.provider_quorum_verified !== false || o.production_source_finality_authority_ready !== false) fail("OBSERVED_AUTHORITY_BOUNDARY_MISMATCH");
  for (const k of ["wallet_access", "signing", "transaction_construction", "transaction_broadcast", "inventory_mutation", "money_movement"]) {
    if (o[k] !== false) fail("OBSERVED_FORBIDDEN_AUTHORITY", k);
  }
  const c = chain(o.source_chain);
  const cid = chainId(c);
  if (text(o.evm_chain_id) !== cid) fail("OBSERVED_CHAIN_ID_MISMATCH");
  const rail = policy.rails.find((r) => r.source_chain === c);
  if (!rail) fail("OBSERVED_RAIL_NOT_IN_POLICY");
  const rpcIdentity = safeId(o.rpc_identity, "OBSERVED_RPC_IDENTITY_INVALID");
  const rpcFingerprint = digest(o.rpc_url_fingerprint_sha256, "OBSERVED_RPC_FINGERPRINT_INVALID");
  const adapterId = safeId(o.finality_adapter_id, "OBSERVED_ADAPTER_INVALID");
  const minimum = uint(o.min_confirmations, "OBSERVED_MIN_CONFIRMATIONS_INVALID", true, MAX_CONFIRMATIONS);
  if (rail.rpc_identity !== rpcIdentity || rail.rpc_url_fingerprint_sha256 !== rpcFingerprint || rail.finality_adapter_id !== adapterId || rail.min_confirmations !== minimum.toString()) fail("POLICY_OBSERVATION_STATIC_BINDING_MISMATCH");

  const event = o.verified_payment_event as any;
  if (event?.schema !== "void_buy_void_verified_payment_event_v2" || event.marker !== VOID_BUY_VOID_VERIFIED_PAYMENT_V2 || event.payment_verified !== true || event.payment_identity_input_complete !== true) fail("VERIFIED_PAYMENT_INVALID");
  const p = event.payment_verifier as any;
  const tx = hash32(p?.transaction_hash, "PAYMENT_TX_INVALID");
  if (hash32(event.tx_hash, "PAYMENT_EVENT_TX_INVALID") !== tx) fail("PAYMENT_EVENT_TX_MISMATCH");
  if (chain(p.chain) !== c) fail("PAYMENT_CHAIN_MISMATCH");
  const logIndex = uint(p.log_index, "PAYMENT_LOG_INDEX_INVALID", false, MAX_U32).toString();
  const receiptBlock = uint(p.block_number, "PAYMENT_RECEIPT_BLOCK_INVALID", true);
  const payer = address(p.from_address, "PAYMENT_PAYER_INVALID");
  const delivery = address(p.delivery_address, "PAYMENT_DELIVERY_INVALID");
  if (payer !== delivery) fail("PAYMENT_PAYER_DELIVERY_MISMATCH");
  const receive = address(p.receive_address, "PAYMENT_RECEIVE_INVALID");
  const usdc = address(p.usdc_contract, "PAYMENT_USDC_INVALID");
  const amount = uint(p.amount_units, "PAYMENT_AMOUNT_INVALID", true);
  const requested = uint(p.requested_units, "PAYMENT_REQUESTED_INVALID", true);
  if (amount !== requested || usdc !== rail.usdc_contract || receive !== rail.receive_address) fail("PAYMENT_POLICY_BINDING_MISMATCH");

  const f = o.finality_observation_for_1463 as any;
  if (chain(f.source_chain) !== c || text(f.evm_chain_id) !== cid || hash32(f.transaction_hash, "FINALITY_TX_INVALID") !== tx || uint(f.log_index, "FINALITY_LOG_INVALID", false, MAX_U32).toString() !== logIndex || uint(f.receipt_block_number, "FINALITY_RECEIPT_INVALID", true) !== receiptBlock || safeId(f.finality_adapter_id, "FINALITY_ADAPTER_INVALID") !== adapterId) fail("FINALITY_PAYMENT_BINDING_MISMATCH");
  const finalizedReference = uint(f.observed_finalized_reference_block, "FINALIZED_REFERENCE_INVALID", true);
  if (finalizedReference < receiptBlock) fail("RECEIPT_NOT_FINALIZED");
  const confirmations = uint(f.confirmations_observed, "FINALITY_CONFIRMATIONS_INVALID", true);
  const derived = finalizedReference - receiptBlock + 1n;
  if (confirmations !== derived || confirmations < minimum) fail("FINALITY_CONFIRMATION_POLICY_MISMATCH");

  const b = o.block_evidence as any;
  if (b?.schema !== "void_buy_void_source_chain_finality_block_evidence_v1" || b.marker !== VOID_BUY_VOID_SOURCE_CHAIN_FINALITY_RPC_ADAPTER_V1 || chain(b.source_chain) !== c || text(b.evm_chain_id) !== cid || uint(b.receipt_block_number, "BLOCK_RECEIPT_INVALID", true) !== receiptBlock || uint(b.finalized_reference_block, "BLOCK_REFERENCE_INVALID", true) !== finalizedReference || b.finalized_tag !== "finalized" || b.provider_consistency_verified !== true) fail("BLOCK_EVIDENCE_BINDING_MISMATCH");
  const receiptHash = hash32(b.receipt_block_hash, "RECEIPT_HASH_INVALID");
  const finalizedHash = hash32(b.finalized_reference_block_hash, "FINALIZED_HASH_INVALID");

  const identity = `voidpay1:${c}:${tx}:${logIndex}`;
  const key = paymentKey(identity);
  const sourceGeneration = sha256(VOID_BUY_VOID_SOURCE_FINALITY_AUTHORITY_UPSTREAM_V2);
  const observation = {
    stable_config_sha256: policy.stable_config_sha256,
    policy_id: policy.policy_id,
    source_generation_sha256: sourceGeneration,
    source_chain: c,
    evm_chain_id: cid,
    transaction_hash: tx,
    log_index: logIndex,
    canonical_payment_identity: identity,
    payment_key_sha256: key,
    payer_address: payer,
    receive_address: receive,
    delivery_address: delivery,
    usdc_contract: usdc,
    payment_usdc_atoms: amount.toString(),
    receipt_block_number: receiptBlock.toString(),
    receipt_block_hash: receiptHash,
    finalized_reference_block: finalizedReference.toString(),
    finalized_reference_block_hash: finalizedHash,
    confirmations_observed: confirmations.toString(),
    finalized_tag: "finalized",
    rpc_identity: rpcIdentity,
    rpc_url_fingerprint_sha256: rpcFingerprint,
    finality_adapter_id: adapterId,
    min_confirmations: minimum.toString(),
    provider_consistency_verified: true,
    same_provider_consistency_verified: true,
  } as const;
  const observationSha = sha256(observation);
  const attestation = framedHash(VOID_BUY_VOID_SOURCE_FINALITY_AUTHORITY_ATTESTATION_V2, observation);

  return {
    ok: true,
    status: "source_finality_authority_candidate",
    schema: "void_buy_void_source_finality_authority_v2",
    marker: VOID_BUY_VOID_SOURCE_FINALITY_AUTHORITY_V2,
    version: 2,
    source_chain: c,
    evm_chain_id: cid,
    transaction_hash: tx,
    log_index: logIndex,
    canonical_payment_identity: identity,
    payment_key_sha256: key,
    payer_address: payer,
    receive_address: receive,
    delivery_address: delivery,
    usdc_contract: usdc,
    payment_asset: "USDC",
    payment_usdc_atoms: amount.toString(),
    receipt_block_number: receiptBlock.toString(),
    receipt_block_hash: receiptHash,
    finalized_reference_block: finalizedReference.toString(),
    finalized_reference_block_hash: finalizedHash,
    confirmations_observed: confirmations.toString(),
    finalized_tag: "finalized",
    rpc_identity: rpcIdentity,
    rpc_url_fingerprint_sha256: rpcFingerprint,
    finality_adapter_id: adapterId,
    min_confirmations: minimum.toString(),
    policy_id: policy.policy_id,
    stable_config_sha256: policy.stable_config_sha256,
    observation_sha256: observationSha,
    source_finality_attestation_sha256: attestation,
    source_generation_sha256: sourceGeneration,
    provider_consistency_verified: true,
    same_provider_consistency_verified: true,
    authenticated_transport_identity_verified: false,
    total_operation_deadline_verified: false,
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
