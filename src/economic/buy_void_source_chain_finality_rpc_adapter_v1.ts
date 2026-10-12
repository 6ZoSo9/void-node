import type { BuyVoidRequestV1 } from "./buy_void_auto_fulfillment_v1.js";
import {
  buildBuyVoidVerifiedPaymentEventV2,
  type BuyVoidTransactionReceiptV2,
  type BuyVoidVerifiedPaymentEventV2,
} from "./buy_void_verified_payment_v2.js";
import {
  createBuyVoidPaymentHttpTransportV1,
  observeBuyVoidPaymentV1,
  VOID_BUY_VOID_PAYMENT_RPC_OBSERVER_AUTHORITY_V1,
  type BuyVoidPaymentRpcObserverPolicyV1,
  type BuyVoidPaymentRpcTransportV1,
} from "./buy_void_payment_rpc_observer_v1.js";

export const VOID_BUY_VOID_SOURCE_CHAIN_FINALITY_RPC_ADAPTER_V1 =
  "VOID_BUY_VOID_SOURCE_CHAIN_FINALITY_RPC_ADAPTER_V1";

export const VOID_BUY_VOID_SOURCE_CHAIN_FINALITY_RPC_AUTHORITY_V1 =
  Object.freeze({
    source_only_candidate: true,
    server_controlled_rpc_policy_required: true,
    rpc_read: true,
    rpc_write: false,
    allowed_rpc_methods: Object.freeze([
      "eth_chainId",
      "eth_getTransactionReceipt",
      "eth_blockNumber",
      "eth_getBlockByNumber",
    ]),
    finalized_tag_required: true,
    exact_rpc_url_fingerprint_required: true,
    same_provider_consistency_verified: true,
    ancestry_verified: false,
    provider_quorum_verified: false,
    wallet_access: false,
    signing: false,
    transaction_construction: false,
    transaction_broadcast: false,
    filesystem_write: false,
    runtime_route_mount: false,
    background_loop: false,
    inventory_mutation: false,
    money_movement: false,
  });

const ADDRESS = /^0x[0-9a-f]{40}$/;
const HASH32 = /^0x[0-9a-f]{64}$/;
const SHA256 = /^[0-9a-f]{64}$/;
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/;
const RPC_QUANTITY = /^0x(?:0|[1-9a-f][0-9a-f]*)$/;
const MAX_U32 = 0xffff_ffffn;
const MAX_CONFIRMATIONS = 1_000_000n;

export type BuyVoidSourceChainFinalityRpcPolicyV1 = {
  enabled: boolean;
  source_chain: "base" | "ethereum";
  chain_id: string | number;
  rpc_url: string;
  rpc_url_fingerprint_sha256: string;
  rpc_identity: string;
  finality_adapter_id: string;
  min_confirmations: string | number;
  usdc_contract: string;
  receive_address: string;
  timeout_ms?: string | number;
  max_response_bytes?: string | number;
};

export type BuyVoidSourceChainFinalityBlockEvidenceV1 = {
  schema: "void_buy_void_source_chain_finality_block_evidence_v1";
  marker: typeof VOID_BUY_VOID_SOURCE_CHAIN_FINALITY_RPC_ADAPTER_V1;
  source_chain: "base" | "ethereum";
  evm_chain_id: "8453" | "1";
  receipt_block_number: string;
  receipt_block_hash: string;
  finalized_reference_block: string;
  finalized_reference_block_hash: string;
  finalized_tag: "finalized";
  provider_consistency_verified: true;
};

export type BuyVoidSourceChainFinalityObservationFor1463V1 = {
  source_chain: "base" | "ethereum";
  evm_chain_id: "8453" | "1";
  transaction_hash: string;
  log_index: string;
  receipt_block_number: string;
  observed_finalized_reference_block: string;
  confirmations_observed: string;
  finality_adapter_id: string;
};

export type BuyVoidSourceChainFinalityReadyV1 = {
  ok: true;
  status: "source_chain_finality_observed";
  marker: typeof VOID_BUY_VOID_SOURCE_CHAIN_FINALITY_RPC_ADAPTER_V1;
  source_chain: "base" | "ethereum";
  evm_chain_id: "8453" | "1";
  rpc_identity: string;
  rpc_url_fingerprint_sha256: string;
  finality_adapter_id: string;
  min_confirmations: string;
  verified_payment_event: BuyVoidVerifiedPaymentEventV2;
  finality_observation_for_1463:
    BuyVoidSourceChainFinalityObservationFor1463V1;
  block_evidence: BuyVoidSourceChainFinalityBlockEvidenceV1;
  same_provider_consistency_verified: true;
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

export type BuyVoidSourceChainFinalityHeldV1 = {
  ok: false;
  status: "held";
  marker: typeof VOID_BUY_VOID_SOURCE_CHAIN_FINALITY_RPC_ADAPTER_V1;
  reason: string;
  detail?: Record<string, unknown>;
};

export type BuyVoidSourceChainFinalityDecisionV1 =
  | BuyVoidSourceChainFinalityReadyV1
  | BuyVoidSourceChainFinalityHeldV1;

type NormalizedPolicyV1 = {
  source_chain: "base" | "ethereum";
  evm_chain_id: "8453" | "1";
  rpc_url_fingerprint_sha256: string;
  rpc_identity: string;
  finality_adapter_id: string;
  min_confirmations: bigint;
  usdc_contract: string;
  receive_address: string;
  observer_policy: BuyVoidPaymentRpcObserverPolicyV1;
};

type RpcBlockV1 = {
  number: bigint;
  hash: string;
  parent_hash: string;
};

function held(
  reason: string,
  detail?: Record<string, unknown>,
): BuyVoidSourceChainFinalityHeldV1 {
  return {
    ok: false,
    status: "held",
    marker: VOID_BUY_VOID_SOURCE_CHAIN_FINALITY_RPC_ADAPTER_V1,
    reason,
    ...(detail ? { detail } : {}),
  };
}

function normalizeChain(value: unknown): "base" | "ethereum" | "" {
  const raw = String(value ?? "").trim().toLowerCase();
  const chain = raw === "eth" ? "ethereum" : raw;
  return chain === "base" || chain === "ethereum" ? chain : "";
}

function expectedChainId(chain: "base" | "ethereum"): "8453" | "1" {
  return chain === "base" ? "8453" : "1";
}

function normalizeAddress(value: unknown): string {
  const address = String(value ?? "").trim().toLowerCase();
  return ADDRESS.test(address) ? address : "";
}

function normalizeHash(value: unknown): string {
  const hash = String(value ?? "").trim().toLowerCase();
  return HASH32.test(hash) ? hash : "";
}

function normalizeSha256(value: unknown): string {
  const digest = String(value ?? "").trim().toLowerCase();
  return SHA256.test(digest) ? digest : "";
}

function safeId(value: unknown): string {
  const id = String(value ?? "").trim();
  return SAFE_ID.test(id) ? id : "";
}

function parseNonNegativeInteger(value: unknown): bigint | null {
  if (typeof value === "bigint") return value >= 0n ? value : null;
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value) || value < 0) return null;
    return BigInt(value);
  }

  const raw = String(value ?? "").trim().toLowerCase();
  if (!raw) return null;

  try {
    if (/^0x[0-9a-f]+$/.test(raw) || /^[0-9]+$/.test(raw)) {
      const parsed = BigInt(raw);
      return parsed >= 0n ? parsed : null;
    }
  } catch {
    return null;
  }
  return null;
}

function canonicalRpcQuantity(value: bigint): string {
  if (value < 0n) throw new Error("negative_rpc_quantity");
  return `0x${value.toString(16)}`;
}

function normalizeRpcBlock(
  value: unknown,
  label: string,
): RpcBlockV1 | BuyVoidSourceChainFinalityHeldV1 {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return held(`${label}_block_shape_invalid`);
  }

  const block = value as Record<string, unknown>;
  const numberRaw = String(block.number ?? "").trim().toLowerCase();
  if (!RPC_QUANTITY.test(numberRaw)) {
    return held(`${label}_block_number_invalid`);
  }

  let number: bigint;
  try {
    number = BigInt(numberRaw);
  } catch {
    return held(`${label}_block_number_invalid`);
  }

  const hash = normalizeHash(block.hash);
  const parentHash = normalizeHash(block.parentHash);
  if (!hash) return held(`${label}_block_hash_invalid`);
  if (!parentHash && number !== 0n) {
    return held(`${label}_parent_hash_invalid`);
  }

  return {
    number,
    hash,
    parent_hash: parentHash || `0x${"0".repeat(64)}`,
  };
}

function normalizePolicy(
  policy: BuyVoidSourceChainFinalityRpcPolicyV1,
): NormalizedPolicyV1 | BuyVoidSourceChainFinalityHeldV1 {
  if (policy?.enabled !== true) {
    return held("source_chain_finality_adapter_disabled");
  }

  const sourceChain = normalizeChain(policy.source_chain);
  if (!sourceChain) {
    return held("source_chain_finality_source_chain_invalid");
  }

  const wantedChainId = expectedChainId(sourceChain);
  const chainId = parseNonNegativeInteger(policy.chain_id);
  if (chainId === null || chainId.toString() !== wantedChainId) {
    return held("source_chain_finality_chain_id_policy_mismatch", {
      expected_chain_id: wantedChainId,
      observed_chain_id: chainId === null ? "" : chainId.toString(),
    });
  }

  const rpcFingerprint =
    normalizeSha256(policy.rpc_url_fingerprint_sha256);
  if (!rpcFingerprint) {
    return held("source_chain_finality_rpc_url_fingerprint_invalid");
  }

  const rpcIdentity = safeId(policy.rpc_identity);
  if (!rpcIdentity) {
    return held("source_chain_finality_rpc_identity_invalid");
  }

  const adapterId = safeId(policy.finality_adapter_id);
  if (!adapterId) {
    return held("source_chain_finality_adapter_id_invalid");
  }

  const minimum = parseNonNegativeInteger(policy.min_confirmations);
  if (
    minimum === null ||
    minimum <= 0n ||
    minimum > MAX_CONFIRMATIONS
  ) {
    return held("source_chain_finality_min_confirmations_invalid");
  }

  const usdc = normalizeAddress(policy.usdc_contract);
  const receive = normalizeAddress(policy.receive_address);
  if (!usdc) {
    return held("source_chain_finality_usdc_contract_invalid");
  }
  if (!receive) {
    return held("source_chain_finality_receive_address_invalid");
  }

  const observerPolicy: BuyVoidPaymentRpcObserverPolicyV1 = {
    enabled: true,
    source_chain: sourceChain,
    chain_id: wantedChainId,
    rpc_url: String(policy.rpc_url ?? "").trim(),
    ...(policy.timeout_ms !== undefined
      ? { timeout_ms: policy.timeout_ms }
      : {}),
    ...(policy.max_response_bytes !== undefined
      ? { max_response_bytes: policy.max_response_bytes }
      : {}),
  };

  const transportCheck =
    createBuyVoidPaymentHttpTransportV1(observerPolicy);
  if ("reason" in transportCheck) {
    return held(
      `source_chain_finality_${transportCheck.reason}`,
      transportCheck.detail,
    );
  }

  return {
    source_chain: sourceChain,
    evm_chain_id: wantedChainId,
    rpc_url_fingerprint_sha256: rpcFingerprint,
    rpc_identity: rpcIdentity,
    finality_adapter_id: adapterId,
    min_confirmations: minimum,
    usdc_contract: usdc,
    receive_address: receive,
    observer_policy: observerPolicy,
  };
}

async function callBlock(
  transport: BuyVoidPaymentRpcTransportV1,
  blockParameter: string,
  label: string,
): Promise<RpcBlockV1 | BuyVoidSourceChainFinalityHeldV1> {
  let raw: unknown;
  try {
    raw = await transport.call({
      method: "eth_getBlockByNumber",
      params: [blockParameter, false],
    });
  } catch (error) {
    return held(`${label}_rpc_call_failed`, {
      error_class: String(
        (error as { name?: unknown })?.name || "Error",
      ).slice(0, 80),
    });
  }
  return normalizeRpcBlock(raw, label);
}

function sameVerifiedPayment(
  first: BuyVoidVerifiedPaymentEventV2,
  second: BuyVoidVerifiedPaymentEventV2,
): boolean {
  const a = first.payment_verifier;
  const b = second.payment_verifier;
  return (
    a.chain === b.chain &&
    a.transaction_hash === b.transaction_hash &&
    a.log_index === b.log_index &&
    a.block_number === b.block_number &&
    a.usdc_contract === b.usdc_contract &&
    a.from_address === b.from_address &&
    a.receive_address === b.receive_address &&
    a.delivery_address === b.delivery_address &&
    a.amount_units === b.amount_units &&
    a.requested_units === b.requested_units
  );
}

async function recheckReceiptAgainstBlockHash(input: {
  request: BuyVoidRequestV1;
  policy: NormalizedPolicyV1;
  transport: BuyVoidPaymentRpcTransportV1;
  expected_transaction_hash: string;
  expected_block_number: bigint;
  expected_block_hash: string;
  expected_payment: BuyVoidVerifiedPaymentEventV2;
  current_block_number: string;
}): Promise<BuyVoidSourceChainFinalityHeldV1 | null> {
  let raw: unknown;
  try {
    raw = await input.transport.call({
      method: "eth_getTransactionReceipt",
      params: [input.expected_transaction_hash],
    });
  } catch (error) {
    return held("source_chain_finality_receipt_recheck_rpc_failed", {
      error_class: String(
        (error as { name?: unknown })?.name || "Error",
      ).slice(0, 80),
    });
  }

  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return held("source_chain_finality_receipt_recheck_shape_invalid");
  }

  const receipt = raw as Record<string, unknown>;
  if (
    normalizeHash(receipt.transactionHash) !==
    input.expected_transaction_hash
  ) {
    return held("source_chain_finality_receipt_recheck_tx_mismatch");
  }

  const blockNumber = parseNonNegativeInteger(receipt.blockNumber);
  if (blockNumber !== input.expected_block_number) {
    return held("source_chain_finality_receipt_recheck_height_mismatch");
  }

  if (normalizeHash(receipt.blockHash) !== input.expected_block_hash) {
    return held("source_chain_finality_receipt_recheck_block_hash_mismatch");
  }

  const verified = buildBuyVoidVerifiedPaymentEventV2({
    request: input.request,
    receipt: receipt as BuyVoidTransactionReceiptV2,
    policy: {
      allowed_chains: [input.policy.source_chain],
      usdc_contract_by_chain: {
        [input.policy.source_chain]: input.policy.usdc_contract,
      },
      receive_address_by_chain: {
        [input.policy.source_chain]: input.policy.receive_address,
      },
      current_block_number_by_chain: {
        [input.policy.source_chain]: input.current_block_number,
      },
    },
  });

  if (verified.ok === false) {
    return held(
      `source_chain_finality_receipt_recheck_${verified.reason}`,
      verified.detail,
    );
  }

  if (!sameVerifiedPayment(input.expected_payment, verified.event)) {
    return held("source_chain_finality_receipt_recheck_payment_changed");
  }

  return null;
}

export async function observeBuyVoidSourceChainFinalityV1(input: {
  request: BuyVoidRequestV1;
  policy: BuyVoidSourceChainFinalityRpcPolicyV1;
  transport?: BuyVoidPaymentRpcTransportV1;
}): Promise<BuyVoidSourceChainFinalityDecisionV1> {
  const policy = normalizePolicy(input?.policy);
  if ("reason" in policy) return policy;

  const transportCheck =
    createBuyVoidPaymentHttpTransportV1(policy.observer_policy);
  if ("reason" in transportCheck) {
    return held(
      `source_chain_finality_${transportCheck.reason}`,
      transportCheck.detail,
    );
  }

  const transport = input.transport || transportCheck;

  const observation = await observeBuyVoidPaymentV1({
    request: input.request,
    policy: policy.observer_policy,
    transport,
  });
  if (observation.ok === false) {
    return held(
      `source_chain_finality_${observation.reason}`,
      observation.detail,
    );
  }

  if (
    observation.source_chain !== policy.source_chain ||
    observation.chain_id !== policy.evm_chain_id
  ) {
    return held("source_chain_finality_observation_policy_mismatch");
  }

  if (
    observation.rpc_url_fingerprint_sha256 !==
    policy.rpc_url_fingerprint_sha256
  ) {
    return held("source_chain_finality_rpc_url_fingerprint_mismatch", {
      expected: policy.rpc_url_fingerprint_sha256,
      observed: observation.rpc_url_fingerprint_sha256,
    });
  }

  const verified = buildBuyVoidVerifiedPaymentEventV2({
    request: input.request,
    receipt: observation.receipt,
    policy: {
      allowed_chains: [policy.source_chain],
      usdc_contract_by_chain: {
        [policy.source_chain]: policy.usdc_contract,
      },
      receive_address_by_chain: {
        [policy.source_chain]: policy.receive_address,
      },
      current_block_number_by_chain: {
        [policy.source_chain]: observation.current_block_number,
      },
    },
  });
  if (verified.ok === false) {
    return held(
      `source_chain_finality_${verified.reason}`,
      verified.detail,
    );
  }

  const verifier = verified.event.payment_verifier;
  const receiptBlock = parseNonNegativeInteger(verifier.block_number);
  const logIndex = parseNonNegativeInteger(verifier.log_index);
  const currentBlock =
    parseNonNegativeInteger(observation.current_block_number);

  if (receiptBlock === null || receiptBlock <= 0n) {
    return held("source_chain_finality_receipt_block_invalid");
  }
  if (logIndex === null || logIndex > MAX_U32) {
    return held("source_chain_finality_log_index_exceeds_1463_domain");
  }
  if (currentBlock === null || currentBlock < receiptBlock) {
    return held("source_chain_finality_latest_block_invalid");
  }

  const finalizedFirst =
    await callBlock(transport, "finalized", "finalized_first");
  if ("reason" in finalizedFirst) return finalizedFirst;

  if (finalizedFirst.number > currentBlock) {
    return held("source_chain_finality_finalized_above_latest");
  }
  if (finalizedFirst.number < receiptBlock) {
    return held("source_chain_finality_receipt_not_finalized", {
      receipt_block_number: receiptBlock.toString(),
      finalized_reference_block: finalizedFirst.number.toString(),
    });
  }

  const exactFinalizedBefore = await callBlock(
    transport,
    canonicalRpcQuantity(finalizedFirst.number),
    "finalized_exact_before",
  );
  if ("reason" in exactFinalizedBefore) return exactFinalizedBefore;

  if (
    exactFinalizedBefore.number !== finalizedFirst.number ||
    exactFinalizedBefore.hash !== finalizedFirst.hash
  ) {
    return held(
      "source_chain_finality_finalized_tag_number_hash_mismatch",
    );
  }

  const receiptBefore = await callBlock(
    transport,
    canonicalRpcQuantity(receiptBlock),
    "receipt_exact_before",
  );
  if ("reason" in receiptBefore) return receiptBefore;

  if (receiptBefore.number !== receiptBlock) {
    return held("source_chain_finality_receipt_height_mismatch");
  }

  const finalizedSecond = await callBlock(
    transport,
    "finalized",
    "finalized_second",
  );
  if ("reason" in finalizedSecond) return finalizedSecond;

  if (finalizedSecond.number < finalizedFirst.number) {
    return held("source_chain_finality_finalized_head_regressed", {
      first: finalizedFirst.number.toString(),
      second: finalizedSecond.number.toString(),
    });
  }
  if (
    finalizedSecond.number === finalizedFirst.number &&
    finalizedSecond.hash !== finalizedFirst.hash
  ) {
    return held(
      "source_chain_finality_same_height_finalized_hash_changed",
    );
  }

  const receiptAfter = await callBlock(
    transport,
    canonicalRpcQuantity(receiptBlock),
    "receipt_exact_after",
  );
  if ("reason" in receiptAfter) return receiptAfter;

  if (
    receiptAfter.number !== receiptBefore.number ||
    receiptAfter.hash !== receiptBefore.hash
  ) {
    return held("source_chain_finality_receipt_block_hash_changed");
  }

  const exactFinalizedAfter = await callBlock(
    transport,
    canonicalRpcQuantity(finalizedFirst.number),
    "finalized_exact_after",
  );
  if ("reason" in exactFinalizedAfter) return exactFinalizedAfter;

  if (
    exactFinalizedAfter.number !== finalizedFirst.number ||
    exactFinalizedAfter.hash !== finalizedFirst.hash
  ) {
    return held("source_chain_finality_finalized_block_hash_changed");
  }

  if (
    receiptBlock === finalizedFirst.number &&
    receiptBefore.hash !== finalizedFirst.hash
  ) {
    return held("source_chain_finality_equal_height_hash_mismatch");
  }

  const transactionHash = normalizeHash(verifier.transaction_hash);
  if (!transactionHash) {
    return held(
      "source_chain_finality_verified_transaction_hash_invalid",
    );
  }

  const receiptRecheck = await recheckReceiptAgainstBlockHash({
    request: input.request,
    policy,
    transport,
    expected_transaction_hash: transactionHash,
    expected_block_number: receiptBlock,
    expected_block_hash: receiptBefore.hash,
    expected_payment: verified.event,
    current_block_number: observation.current_block_number,
  });
  if (receiptRecheck) return receiptRecheck;

  const confirmations = finalizedFirst.number - receiptBlock + 1n;
  if (confirmations < policy.min_confirmations) {
    return held("source_chain_finality_threshold_not_met", {
      observed_confirmations: confirmations.toString(),
      required_confirmations: policy.min_confirmations.toString(),
    });
  }

  return {
    ok: true,
    status: "source_chain_finality_observed",
    marker: VOID_BUY_VOID_SOURCE_CHAIN_FINALITY_RPC_ADAPTER_V1,
    source_chain: policy.source_chain,
    evm_chain_id: policy.evm_chain_id,
    rpc_identity: policy.rpc_identity,
    rpc_url_fingerprint_sha256:
      observation.rpc_url_fingerprint_sha256,
    finality_adapter_id: policy.finality_adapter_id,
    min_confirmations: policy.min_confirmations.toString(),
    verified_payment_event: verified.event,
    finality_observation_for_1463: {
      source_chain: policy.source_chain,
      evm_chain_id: policy.evm_chain_id,
      transaction_hash: transactionHash,
      log_index: logIndex.toString(),
      receipt_block_number: receiptBlock.toString(),
      observed_finalized_reference_block:
        finalizedFirst.number.toString(),
      confirmations_observed: confirmations.toString(),
      finality_adapter_id: policy.finality_adapter_id,
    },
    block_evidence: {
      schema:
        "void_buy_void_source_chain_finality_block_evidence_v1",
      marker:
        VOID_BUY_VOID_SOURCE_CHAIN_FINALITY_RPC_ADAPTER_V1,
      source_chain: policy.source_chain,
      evm_chain_id: policy.evm_chain_id,
      receipt_block_number: receiptBlock.toString(),
      receipt_block_hash: receiptBefore.hash,
      finalized_reference_block: finalizedFirst.number.toString(),
      finalized_reference_block_hash: finalizedFirst.hash,
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

export function
assertBuyVoidSourceChainFinalityRpcAuthorityBoundaryV1(): true {
  const observer =
    VOID_BUY_VOID_PAYMENT_RPC_OBSERVER_AUTHORITY_V1;
  if (
    observer.rpc_write !== false ||
    observer.wallet_access !== false ||
    observer.signing !== false ||
    observer.transaction_broadcast !== false ||
    observer.filesystem_write !== false ||
    observer.runtime_route_mount !== false ||
    observer.background_loop !== false ||
    observer.money_movement !== false
  ) {
    throw new Error(
      "payment_rpc_observer_authority_boundary_changed",
    );
  }

  const authority =
    VOID_BUY_VOID_SOURCE_CHAIN_FINALITY_RPC_AUTHORITY_V1;
  if (
    authority.rpc_write !== false ||
    authority.wallet_access !== false ||
    authority.signing !== false ||
    authority.transaction_construction !== false ||
    authority.transaction_broadcast !== false ||
    authority.filesystem_write !== false ||
    authority.runtime_route_mount !== false ||
    authority.background_loop !== false ||
    authority.inventory_mutation !== false ||
    authority.money_movement !== false ||
    authority.ancestry_verified !== false ||
    authority.provider_quorum_verified !== false
  ) {
    throw new Error(
      "source_chain_finality_rpc_authority_boundary_changed",
    );
  }

  return true;
}
