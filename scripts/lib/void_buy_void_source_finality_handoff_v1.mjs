import { createHash } from "node:crypto";

export const MARKER = "VOID_BUY_VOID_SOURCE_FINALITY_HANDOFF_V1";
export const POLICY_MARKER = "VOID_BUY_VOID_DUAL_RAIL_SERVER_POLICY_CONTRACT_V1";
export const ECONOMICS_MARKER = "VOID_BUY_VOID_CANONICAL_PRESALE_ECONOMICS_DUAL_RAIL_V1";
export const VERIFIED_PAYMENT_UPSTREAM_MARKER = "VOID_BUY_VOID_VERIFIED_PAYMENT_V2";
export const FINALIZED_PAYMENT_MARKER = "VOID_BUY_VOID_FINALIZED_SOURCE_PAYMENT_V1";
export const FINALITY_ATTESTATION_MARKER = "VOID_BUY_VOID_SOURCE_FINALITY_ATTESTATION_V1";

export const UPSTREAM_BINDINGS_V1 = Object.freeze({
  main_base_sha: "090cd3ef1d60852f614c29cb7aee9ebdacde3e1b",
  pr_1463_head_sha: "35ce04e34320be7ab5f7773066de7c6c6384b034",
  pr_1465_head_sha: "846be5fceedc6ef1139bec546578e7cde6fbc8f4",
  verified_payment_path: "src/economic/buy_void_verified_payment_v2.ts",
  pr_1463_finality_contract_path:
    "scripts/lib/void_buy_void_dual_rail_server_policy_contract_v1.mjs",
  pr_1465_target_contract_path:
    "scripts/lib/void_buy_void_chain2050_presale_two_phase_v1.mjs",
  pr_1463_finality_log_index_bound: "u32",
  pr_1465_payment_log_index_bound: "u64",
});

export const AUTHORITY_V1 = Object.freeze({
  source_only_reference_adapter: true,
  source_chain_rpc_call: false,
  chain2050_rpc_call: false,
  filesystem_read: false,
  filesystem_write: false,
  credential_access: false,
  wallet_access: false,
  signer_access: false,
  transaction_construction: false,
  transaction_signing: false,
  transaction_broadcast: false,
  chain_state_mutation: false,
  inventory_mutation: false,
  inventory_funding: false,
  public_presale_activation: false,
  money_movement: false,
});

export const CANONICAL_ECONOMICS_V1 = Object.freeze({
  marker: ECONOMICS_MARKER,
  canonical_presale_max_void: "10000000",
  rate_void_units_numerator: "2",
  rate_void_units_denominator: "1",
  accepted_payment_asset: "USDC",
  exact_payment_required: true,
  one_payment_one_fulfillment: true,
  no_hidden_minimum: true,
  no_hidden_per_buyer_throttle_below_remaining_inventory: true,
});

const MAX_U32 = 0xffff_ffffn;
const MAX_U64 = (1n << 64n) - 1n;
const MAX_U256 = (1n << 256n) - 1n;
const H32 = /^0x[0-9a-f]{64}$/;
const A20 = /^0x[0-9a-f]{40}$/;
const H64 = /^[0-9a-f]{64}$/;
const UINT = /^(0|[1-9][0-9]*)$/;
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/;

const POLICY_GENERATION_KEYS = [
  "economics",
  "marker",
  "observation_sha256",
  "policy_id",
  "rail_order",
  "rails",
  "stable_config_sha256",
  "version",
];
const POLICY_RAIL_KEYS = [
  "evm_chain_id",
  "finality_adapter_id",
  "finalized_reference_block",
  "min_confirmations",
  "receive_address",
  "rpc_identity",
  "source_chain",
  "usdc_contract",
];
const VERIFIED_PAYMENT_KEYS = [
  "amount_units",
  "block_number",
  "delivery_address",
  "from_address",
  "log_index",
  "payment_identity_input_complete",
  "payment_verified",
  "receive_address",
  "requested_units",
  "schema",
  "source_chain",
  "transaction_hash",
  "upstream_marker",
  "usdc_contract",
];
const FINALITY_ADMISSION_KEYS = [
  "confirmations_observed",
  "evm_chain_id",
  "finality_adapter_id",
  "finalized_reference_block",
  "fulfillment_authority_granted",
  "inventory_mutation_authority_granted",
  "log_index",
  "observation_sha256",
  "ok",
  "payment_identity",
  "policy_id",
  "receipt_block_number",
  "signing_or_broadcast_authority_granted",
  "source_chain",
  "stable_config_sha256",
  "status",
  "transaction_hash",
];
const HANDOFF_INPUT_KEYS = [
  "finality_admission",
  "policy_generation",
  "verified_payment",
];
const FINALIZED_PAYMENT_KEYS = [
  "canonical_payment_identity",
  "delivery_address",
  "exact_payment_verified",
  "finality_status",
  "marker",
  "payer_address",
  "payment_key_sha256",
  "payment_usdc_atoms",
  "schema",
  "source_chain",
  "source_chain_id",
  "source_finality_attestation_sha256",
  "source_log_index",
  "source_policy_fingerprint_sha256",
  "source_transaction_hash",
];

function fail(code, detail = "") {
  const error = new Error(`${MARKER}:${code}:${detail}`);
  error.code = code;
  error.detail = detail;
  throw error;
}
function plain(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}
function keys(value, expected, code) {
  if (!plain(value)) fail(code, "not_object");
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (
    actual.length !== wanted.length ||
    actual.some((entry, index) => entry !== wanted[index])
  ) {
    fail(code, `expected=${wanted};actual=${actual}`);
  }
}
function canon(value) {
  if (value === null) return "null";
  if (typeof value === "string" || typeof value === "boolean") {
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value)) fail("NON_CANONICAL_NUMBER", String(value));
    return String(value);
  }
  if (Array.isArray(value)) return `[${value.map(canon).join(",")}]`;
  if (plain(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canon(value[key])}`)
      .join(",")}}`;
  }
  fail("NON_CANONICAL_VALUE", typeof value);
}
function sha(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}
function fingerprint(value) {
  return sha(Buffer.from(canon(value), "utf8"));
}
function framedDomainHash(name, value) {
  const body = Buffer.from(canon(value), "utf8");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(body.length, 0);
  return sha(
    Buffer.concat([
      Buffer.from(`${name}\0`, "ascii"),
      length,
      body,
    ]),
  );
}
const text = (value) => String(value ?? "").trim();
function exact(value, wanted, code) {
  if (value !== wanted) fail(code, `expected=${wanted};actual=${String(value)}`);
  return wanted;
}
function sourceChain(value) {
  const raw = text(value).toLowerCase();
  const chain = raw === "eth" ? "ethereum" : raw;
  if (chain !== "base" && chain !== "ethereum") fail("INVALID_SOURCE_CHAIN", raw);
  return chain;
}
function sourceChainId(chain) {
  return chain === "base" ? "8453" : "1";
}
function hash32(value, code) {
  const result = text(value).toLowerCase();
  if (!H32.test(result)) fail(code, result || "empty");
  return result;
}
function addr(value, code) {
  const result = text(value).toLowerCase();
  if (!A20.test(result)) fail(code, result || "empty");
  return result;
}
function hex64(value, code) {
  const result = text(value).toLowerCase();
  if (!H64.test(result)) fail(code, result || "empty");
  return result;
}
function safeId(value, code) {
  const result = text(value);
  if (!SAFE_ID.test(result)) fail(code, result || "empty");
  return result;
}
function uint(value, code, { positive = false, max = MAX_U256 } = {}) {
  const result = text(value);
  if (!UINT.test(result)) fail(code, result || "empty");
  const parsed = BigInt(result);
  if ((positive && parsed === 0n) || parsed > max) fail(code, result);
  return parsed;
}
function canonicalPaymentIdentity(chain, transactionHash, logIndex, max = MAX_U64) {
  const normalizedChain = sourceChain(chain);
  const tx = hash32(transactionHash, "INVALID_SOURCE_TRANSACTION_HASH");
  const log = uint(logIndex, "INVALID_SOURCE_LOG_INDEX", { max }).toString();
  return `voidpay1:${normalizedChain}:${tx}:${log}`;
}
function canonicalPaymentKey(identityInput) {
  const identity = text(identityInput);
  const match = /^voidpay1:(base|ethereum):(0x[0-9a-f]{64}):(0|[1-9][0-9]*)$/.exec(identity);
  if (!match) fail("INVALID_CANONICAL_PAYMENT_IDENTITY", identity || "empty");
  uint(match[3], "INVALID_CANONICAL_PAYMENT_LOG_INDEX", { max: MAX_U64 });
  const bytes = Buffer.from(identity, "utf8");
  if (bytes.length > 512) fail("CANONICAL_PAYMENT_IDENTITY_TOO_LARGE", String(bytes.length));
  const length = Buffer.alloc(4);
  length.writeUInt32BE(bytes.length, 0);
  return sha(
    Buffer.concat([
      Buffer.from("VOID_BUY_VOID_FULFILLMENT_ANCHOR_V1\0", "ascii"),
      length,
      bytes,
    ]),
  );
}

function normalizeRail(input, expectedChain) {
  keys(input, POLICY_RAIL_KEYS, "POLICY_RAIL_SHAPE");
  const chain = sourceChain(input.source_chain);
  exact(chain, expectedChain, "POLICY_RAIL_ORDER_MISMATCH");
  exact(text(input.evm_chain_id), sourceChainId(chain), "POLICY_RAIL_CHAIN_ID_MISMATCH");
  return Object.freeze({
    source_chain: chain,
    evm_chain_id: sourceChainId(chain),
    usdc_contract: addr(input.usdc_contract, "INVALID_POLICY_USDC_CONTRACT"),
    receive_address: addr(input.receive_address, "INVALID_POLICY_RECEIVE_ADDRESS"),
    rpc_identity: safeId(input.rpc_identity, "INVALID_POLICY_RPC_IDENTITY"),
    finality_adapter_id: safeId(
      input.finality_adapter_id,
      "INVALID_POLICY_FINALITY_ADAPTER_ID",
    ),
    min_confirmations: uint(
      input.min_confirmations,
      "INVALID_POLICY_MIN_CONFIRMATIONS",
      { positive: true, max: 1_000_000n },
    ).toString(),
    finalized_reference_block: uint(
      input.finalized_reference_block,
      "INVALID_POLICY_FINALIZED_REFERENCE_BLOCK",
    ).toString(),
  });
}
function stableRailProjection(rail) {
  return {
    source_chain: rail.source_chain,
    evm_chain_id: rail.evm_chain_id,
    usdc_contract: rail.usdc_contract,
    receive_address: rail.receive_address,
    rpc_identity: rail.rpc_identity,
    finality_adapter_id: rail.finality_adapter_id,
    min_confirmations: rail.min_confirmations,
  };
}
function normalizeEconomics(input) {
  keys(
    input,
    Object.keys(CANONICAL_ECONOMICS_V1),
    "POLICY_ECONOMICS_SHAPE",
  );
  if (canon(input) !== canon(CANONICAL_ECONOMICS_V1)) {
    fail("POLICY_ECONOMICS_MISMATCH");
  }
  return CANONICAL_ECONOMICS_V1;
}

export function deriveSourcePolicyCommitmentsV1(input) {
  keys(input, ["economics", "marker", "rail_order", "rails", "version"], "POLICY_COMMITMENT_INPUT_SHAPE");
  exact(input.marker, POLICY_MARKER, "POLICY_MARKER_MISMATCH");
  exact(input.version, 1, "POLICY_VERSION_MISMATCH");
  if (!Array.isArray(input.rail_order) || canon(input.rail_order) !== canon(["base", "ethereum"])) {
    fail("POLICY_RAIL_ORDER_MISMATCH");
  }
  if (!Array.isArray(input.rails) || input.rails.length !== 2) {
    fail("POLICY_REQUIRES_TWO_RAILS");
  }
  const rails = [
    normalizeRail(input.rails[0], "base"),
    normalizeRail(input.rails[1], "ethereum"),
  ];
  const economics = normalizeEconomics(input.economics);
  const stableConfigSha256 = fingerprint({
    marker: POLICY_MARKER,
    version: 1,
    rail_order: ["base", "ethereum"],
    rails: rails.map(stableRailProjection),
    economics,
  });
  const observationSha256 = fingerprint({
    combined_stable_sha256: stableConfigSha256,
    finalized_reference_blocks: {
      base: rails[0].finalized_reference_block,
      ethereum: rails[1].finalized_reference_block,
    },
  });
  return Object.freeze({
    stable_config_sha256: stableConfigSha256,
    observation_sha256: observationSha256,
    policy_id: `void-buy-void-dual-rail-policy-v1-${stableConfigSha256}`,
    rails: Object.freeze(rails),
  });
}

export function normalizePolicyGenerationV1(input) {
  keys(input, POLICY_GENERATION_KEYS, "POLICY_GENERATION_SHAPE");
  const derived = deriveSourcePolicyCommitmentsV1({
    marker: input.marker,
    version: input.version,
    rail_order: input.rail_order,
    rails: input.rails,
    economics: input.economics,
  });
  exact(
    hex64(input.stable_config_sha256, "INVALID_POLICY_STABLE_CONFIG_SHA256"),
    derived.stable_config_sha256,
    "POLICY_STABLE_CONFIG_SHA256_MISMATCH",
  );
  exact(
    hex64(input.observation_sha256, "INVALID_POLICY_OBSERVATION_SHA256"),
    derived.observation_sha256,
    "POLICY_OBSERVATION_SHA256_MISMATCH",
  );
  exact(
    safeId(input.policy_id, "INVALID_POLICY_ID"),
    derived.policy_id,
    "POLICY_ID_MISMATCH",
  );
  return Object.freeze({
    marker: POLICY_MARKER,
    version: 1,
    rail_order: Object.freeze(["base", "ethereum"]),
    rails: derived.rails,
    economics: CANONICAL_ECONOMICS_V1,
    policy_id: derived.policy_id,
    stable_config_sha256: derived.stable_config_sha256,
    observation_sha256: derived.observation_sha256,
  });
}

export function normalizeVerifiedPaymentBindingV1(input) {
  keys(input, VERIFIED_PAYMENT_KEYS, "VERIFIED_PAYMENT_SHAPE");
  exact(input.schema, "void_buy_void_verified_payment_binding_v1", "INVALID_VERIFIED_PAYMENT_SCHEMA");
  exact(input.upstream_marker, VERIFIED_PAYMENT_UPSTREAM_MARKER, "INVALID_VERIFIED_PAYMENT_UPSTREAM_MARKER");
  exact(input.payment_verified, true, "PAYMENT_NOT_VERIFIED");
  exact(input.payment_identity_input_complete, true, "PAYMENT_IDENTITY_INPUT_INCOMPLETE");
  const chain = sourceChain(input.source_chain);
  const tx = hash32(input.transaction_hash, "INVALID_VERIFIED_PAYMENT_TRANSACTION_HASH");
  const log = uint(input.log_index, "INVALID_VERIFIED_PAYMENT_LOG_INDEX", { max: MAX_U64 }).toString();
  const block = uint(input.block_number, "INVALID_VERIFIED_PAYMENT_BLOCK", { positive: true }).toString();
  const from = addr(input.from_address, "INVALID_VERIFIED_PAYMENT_FROM_ADDRESS");
  const delivery = addr(input.delivery_address, "INVALID_VERIFIED_PAYMENT_DELIVERY_ADDRESS");
  exact(from, delivery, "VERIFIED_PAYMENT_PAYER_DELIVERY_MISMATCH");
  const amount = uint(input.amount_units, "INVALID_VERIFIED_PAYMENT_AMOUNT", { positive: true });
  const requested = uint(input.requested_units, "INVALID_VERIFIED_PAYMENT_REQUESTED_AMOUNT", { positive: true });
  if (amount !== requested) fail("VERIFIED_PAYMENT_NOT_EXACT");
  return Object.freeze({
    schema: input.schema,
    upstream_marker: VERIFIED_PAYMENT_UPSTREAM_MARKER,
    payment_verified: true,
    payment_identity_input_complete: true,
    source_chain: chain,
    transaction_hash: tx,
    log_index: log,
    block_number: block,
    usdc_contract: addr(input.usdc_contract, "INVALID_VERIFIED_PAYMENT_USDC_CONTRACT"),
    from_address: from,
    receive_address: addr(input.receive_address, "INVALID_VERIFIED_PAYMENT_RECEIVE_ADDRESS"),
    delivery_address: delivery,
    amount_units: amount.toString(),
    requested_units: requested.toString(),
  });
}

export function normalizeFinalityAdmissionV1(input) {
  keys(input, FINALITY_ADMISSION_KEYS, "FINALITY_ADMISSION_SHAPE");
  exact(input.ok, true, "FINALITY_NOT_ADMITTED");
  exact(input.status, "source_payment_finality_admitted", "FINALITY_STATUS_MISMATCH");
  exact(input.fulfillment_authority_granted, false, "FINALITY_GRANTED_FULFILLMENT_AUTHORITY");
  exact(input.inventory_mutation_authority_granted, false, "FINALITY_GRANTED_INVENTORY_AUTHORITY");
  exact(input.signing_or_broadcast_authority_granted, false, "FINALITY_GRANTED_SIGNING_AUTHORITY");
  const chain = sourceChain(input.source_chain);
  exact(text(input.evm_chain_id), sourceChainId(chain), "FINALITY_CHAIN_ID_MISMATCH");
  const tx = hash32(input.transaction_hash, "INVALID_FINALITY_TRANSACTION_HASH");
  const log = uint(input.log_index, "INVALID_FINALITY_LOG_INDEX", { max: MAX_U32 }).toString();
  const identity = canonicalPaymentIdentity(chain, tx, log, MAX_U32);
  exact(input.payment_identity, identity, "FINALITY_PAYMENT_IDENTITY_MISMATCH");
  return Object.freeze({
    ok: true,
    status: "source_payment_finality_admitted",
    source_chain: chain,
    evm_chain_id: sourceChainId(chain),
    payment_identity: identity,
    transaction_hash: tx,
    log_index: log,
    receipt_block_number: uint(input.receipt_block_number, "INVALID_FINALITY_RECEIPT_BLOCK").toString(),
    finalized_reference_block: uint(input.finalized_reference_block, "INVALID_FINALITY_REFERENCE_BLOCK").toString(),
    confirmations_observed: uint(input.confirmations_observed, "INVALID_FINALITY_CONFIRMATIONS", { positive: true }).toString(),
    finality_adapter_id: safeId(input.finality_adapter_id, "INVALID_FINALITY_ADAPTER_ID"),
    policy_id: safeId(input.policy_id, "INVALID_FINALITY_POLICY_ID"),
    stable_config_sha256: hex64(input.stable_config_sha256, "INVALID_FINALITY_STABLE_CONFIG_SHA256"),
    observation_sha256: hex64(input.observation_sha256, "INVALID_FINALITY_OBSERVATION_SHA256"),
    fulfillment_authority_granted: false,
    inventory_mutation_authority_granted: false,
    signing_or_broadcast_authority_granted: false,
  });
}

export function sourceFinalityAttestationPreimageV1(finalityInput) {
  const finality = normalizeFinalityAdmissionV1(finalityInput);
  return Object.freeze({
    schema: "void_buy_void_source_finality_attestation_preimage_v1",
    marker: FINALITY_ATTESTATION_MARKER,
    version: 1,
    source_chain: finality.source_chain,
    evm_chain_id: finality.evm_chain_id,
    canonical_payment_identity: finality.payment_identity,
    transaction_hash: finality.transaction_hash,
    log_index: finality.log_index,
    receipt_block_number: finality.receipt_block_number,
    finalized_reference_block: finality.finalized_reference_block,
    confirmations_observed: finality.confirmations_observed,
    finality_adapter_id: finality.finality_adapter_id,
    policy_id: finality.policy_id,
    stable_config_sha256: finality.stable_config_sha256,
    observation_sha256: finality.observation_sha256,
  });
}

export function sourceFinalityAttestationSha256V1(finalityInput) {
  return framedDomainHash(
    FINALITY_ATTESTATION_MARKER,
    sourceFinalityAttestationPreimageV1(finalityInput),
  );
}

export function buildFinalizedSourcePaymentHandoffV1(input) {
  keys(input, HANDOFF_INPUT_KEYS, "HANDOFF_INPUT_SHAPE");
  const policy = normalizePolicyGenerationV1(input.policy_generation);
  const payment = normalizeVerifiedPaymentBindingV1(input.verified_payment);
  const finality = normalizeFinalityAdmissionV1(input.finality_admission);
  const rail = policy.rails.find((candidate) => candidate.source_chain === finality.source_chain);
  if (!rail) fail("FINALITY_SOURCE_CHAIN_NOT_IN_POLICY");

  exact(finality.evm_chain_id, rail.evm_chain_id, "HANDOFF_CHAIN_ID_MISMATCH");
  exact(finality.policy_id, policy.policy_id, "HANDOFF_POLICY_ID_MISMATCH");
  exact(finality.stable_config_sha256, policy.stable_config_sha256, "HANDOFF_STABLE_CONFIG_MISMATCH");
  exact(finality.observation_sha256, policy.observation_sha256, "HANDOFF_OBSERVATION_MISMATCH");
  exact(finality.finality_adapter_id, rail.finality_adapter_id, "HANDOFF_FINALITY_ADAPTER_MISMATCH");
  exact(finality.finalized_reference_block, rail.finalized_reference_block, "HANDOFF_FINALITY_REFERENCE_MISMATCH");

  exact(payment.source_chain, finality.source_chain, "HANDOFF_SOURCE_CHAIN_MISMATCH");
  exact(payment.transaction_hash, finality.transaction_hash, "HANDOFF_TRANSACTION_HASH_MISMATCH");
  exact(payment.log_index, finality.log_index, "HANDOFF_LOG_INDEX_MISMATCH");
  exact(payment.block_number, finality.receipt_block_number, "HANDOFF_RECEIPT_BLOCK_MISMATCH");
  exact(payment.usdc_contract, rail.usdc_contract, "HANDOFF_USDC_CONTRACT_MISMATCH");
  exact(payment.receive_address, rail.receive_address, "HANDOFF_RECEIVE_ADDRESS_MISMATCH");

  const receipt = uint(finality.receipt_block_number, "INVALID_FINALITY_RECEIPT_BLOCK", { positive: true });
  const reference = uint(finality.finalized_reference_block, "INVALID_FINALITY_REFERENCE_BLOCK");
  if (reference < receipt) fail("HANDOFF_RECEIPT_NOT_FINALIZED");
  const expectedConfirmations = reference - receipt + 1n;
  exact(
    finality.confirmations_observed,
    expectedConfirmations.toString(),
    "HANDOFF_CONFIRMATION_COUNT_MISMATCH",
  );
  if (expectedConfirmations < BigInt(rail.min_confirmations)) {
    fail("HANDOFF_FINALITY_THRESHOLD_NOT_MET");
  }

  const identity = canonicalPaymentIdentity(
    payment.source_chain,
    payment.transaction_hash,
    payment.log_index,
    MAX_U32,
  );
  exact(finality.payment_identity, identity, "HANDOFF_PAYMENT_IDENTITY_MISMATCH");

  return Object.freeze({
    schema: "void_buy_void_finalized_source_payment_v1",
    marker: FINALIZED_PAYMENT_MARKER,
    source_chain: payment.source_chain,
    source_chain_id: sourceChainId(payment.source_chain),
    source_transaction_hash: payment.transaction_hash,
    source_log_index: payment.log_index,
    canonical_payment_identity: identity,
    payment_key_sha256: canonicalPaymentKey(identity),
    payer_address: payment.from_address,
    delivery_address: payment.delivery_address,
    payment_usdc_atoms: payment.amount_units,
    source_policy_fingerprint_sha256: policy.stable_config_sha256,
    source_finality_attestation_sha256:
      sourceFinalityAttestationSha256V1(finality),
    finality_status: "finalized",
    exact_payment_verified: true,
  });
}

export function validateFinalizedSourcePaymentProjectionV1(input) {
  keys(input, FINALIZED_PAYMENT_KEYS, "FINALIZED_PAYMENT_PROJECTION_SHAPE");
  exact(input.schema, "void_buy_void_finalized_source_payment_v1", "FINALIZED_PAYMENT_SCHEMA_MISMATCH");
  exact(input.marker, FINALIZED_PAYMENT_MARKER, "FINALIZED_PAYMENT_MARKER_MISMATCH");
  const chain = sourceChain(input.source_chain);
  exact(text(input.source_chain_id), sourceChainId(chain), "FINALIZED_PAYMENT_CHAIN_ID_MISMATCH");
  const tx = hash32(input.source_transaction_hash, "FINALIZED_PAYMENT_TRANSACTION_HASH_INVALID");
  const log = uint(input.source_log_index, "FINALIZED_PAYMENT_LOG_INDEX_INVALID", { max: MAX_U64 }).toString();
  const identity = canonicalPaymentIdentity(chain, tx, log, MAX_U64);
  exact(input.canonical_payment_identity, identity, "FINALIZED_PAYMENT_IDENTITY_MISMATCH");
  exact(input.payment_key_sha256, canonicalPaymentKey(identity), "FINALIZED_PAYMENT_KEY_MISMATCH");
  const payer = addr(input.payer_address, "FINALIZED_PAYMENT_PAYER_INVALID");
  exact(payer, addr(input.delivery_address, "FINALIZED_PAYMENT_DELIVERY_INVALID"), "FINALIZED_PAYMENT_PAYER_DELIVERY_MISMATCH");
  uint(input.payment_usdc_atoms, "FINALIZED_PAYMENT_AMOUNT_INVALID", { positive: true });
  hex64(input.source_policy_fingerprint_sha256, "FINALIZED_PAYMENT_POLICY_FINGERPRINT_INVALID");
  hex64(input.source_finality_attestation_sha256, "FINALIZED_PAYMENT_FINALITY_ATTESTATION_INVALID");
  exact(input.finality_status, "finalized", "FINALIZED_PAYMENT_NOT_FINALIZED");
  exact(input.exact_payment_verified, true, "FINALIZED_PAYMENT_NOT_EXACT");
  return Object.freeze({ ...input });
}
