import crypto from "node:crypto";

export const VOID_BUY_VOID_DUAL_RAIL_SERVER_POLICY_CONTRACT_V1 =
  "VOID_BUY_VOID_DUAL_RAIL_SERVER_POLICY_CONTRACT_V1";

export const VOID_BUY_VOID_DUAL_RAIL_POLICY_HOLD_V1 =
  "DUAL_RAIL_POLICY_HOLD";

export const VOID_BUY_VOID_DUAL_RAIL_ORDER_V1 = [
  "base",
  "ethereum",
];

export const VOID_BUY_VOID_DUAL_RAIL_DEFINITIONS_V1 = {
  base: {
    source_chain: "base",
    evm_chain_id: "8453",
  },
  ethereum: {
    source_chain: "ethereum",
    evm_chain_id: "1",
  },
};

export const VOID_BUY_VOID_DUAL_RAIL_ENV_V1 = {
  base: {
    usdc_contract: "VOID_BUY_VOID_DUAL_RAIL_BASE_USDC_CONTRACT",
    receive_address: "VOID_BUY_VOID_DUAL_RAIL_BASE_RECEIVE_ADDRESS",
    rpc_identity: "VOID_BUY_VOID_DUAL_RAIL_BASE_RPC_IDENTITY",
    finality_adapter_id:
      "VOID_BUY_VOID_DUAL_RAIL_BASE_FINALITY_ADAPTER_ID",
    min_confirmations:
      "VOID_BUY_VOID_DUAL_RAIL_BASE_MIN_CONFIRMATIONS",
    finalized_reference_block:
      "VOID_BUY_VOID_DUAL_RAIL_BASE_FINALIZED_REFERENCE_BLOCK",
  },
  ethereum: {
    usdc_contract: "VOID_BUY_VOID_DUAL_RAIL_ETHEREUM_USDC_CONTRACT",
    receive_address: "VOID_BUY_VOID_DUAL_RAIL_ETHEREUM_RECEIVE_ADDRESS",
    rpc_identity: "VOID_BUY_VOID_DUAL_RAIL_ETHEREUM_RPC_IDENTITY",
    finality_adapter_id:
      "VOID_BUY_VOID_DUAL_RAIL_ETHEREUM_FINALITY_ADAPTER_ID",
    min_confirmations:
      "VOID_BUY_VOID_DUAL_RAIL_ETHEREUM_MIN_CONFIRMATIONS",
    finalized_reference_block:
      "VOID_BUY_VOID_DUAL_RAIL_ETHEREUM_FINALIZED_REFERENCE_BLOCK",
  },
};

export const VOID_BUY_VOID_LEGACY_SINGLE_CHAIN_ENV_V1 = [
  "VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_PAYMENT_CHAIN",
  "VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_PAYMENT_USDC_CONTRACT",
  "VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_PAYMENT_RECEIVE_ADDRESS",
  "VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_PAYMENT_CURRENT_BLOCK_NUMBER",
  "VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_PAYMENT_MIN_CONFIRMATIONS",
];

export const VOID_BUY_VOID_CANONICAL_PRESALE_ECONOMICS_DUAL_RAIL_V1 = {
  marker: "VOID_BUY_VOID_CANONICAL_PRESALE_ECONOMICS_DUAL_RAIL_V1",
  canonical_presale_max_void: "10000000",
  rate_void_units_numerator: "2",
  rate_void_units_denominator: "1",
  accepted_payment_asset: "USDC",
  exact_payment_required: true,
  one_payment_one_fulfillment: true,
  no_hidden_minimum: true,
  no_hidden_per_buyer_throttle_below_remaining_inventory: true,
};

export const VOID_BUY_VOID_DUAL_RAIL_SERVER_POLICY_AUTHORITY_V1 = {
  source_only_reference_contract: true,
  simultaneous_dual_rail_runtime_ready: false,
  source_chain_rpc_call: false,
  source_chain_finality_authority: false,
  chain2050_state_transition: false,
  chain2050_inventory_mutation: false,
  chain2050_fulfillment_anchor_mutation: false,
  filesystem_read: false,
  filesystem_write: false,
  credential_access: false,
  wallet_access: false,
  signing: false,
  transaction_construction: false,
  transaction_broadcast: false,
  inventory_funding: false,
  public_presale_activation: false,
  money_movement: false,
};

const ADDRESS = /^0x[0-9a-f]{40}$/;
const TX_HASH = /^0x[0-9a-f]{64}$/;
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{1,159}$/;
const UINT = /^(0|[1-9][0-9]*)$/;
const MAX_U32 = 0xffff_ffffn;
const MAX_CONFIRMATIONS = 1_000_000n;
const EXACT_POLICY_KEYS = [
  "authority",
  "economics",
  "fingerprints",
  "marker",
  "policy_id",
  "public_summary",
  "rails",
  "version",
];
const EXACT_RAIL_KEYS = [
  "evm_chain_id",
  "finality",
  "receive_address",
  "rpc_identity",
  "source_chain",
  "usdc_contract",
];
const EXACT_FINALITY_KEYS = [
  "adapter_id",
  "finalized_reference_block",
  "min_confirmations",
];
const EXACT_FINGERPRINT_KEYS = [
  "base_stable_sha256",
  "combined_stable_sha256",
  "ethereum_stable_sha256",
  "observation_sha256",
];
const EXACT_SUMMARY_KEYS = [
  "accepted_payment_asset",
  "advertised_chains",
  "canonical_presale_max_void",
  "evm_chain_ids",
  "exact_payment_required",
  "min_confirmations_by_chain",
  "observation_sha256",
  "one_payment_one_fulfillment",
  "rate_void_per_usdc",
  "stable_config_sha256",
];
const EXACT_PAYMENT_OBSERVATION_KEYS = [
  "confirmations_observed",
  "evm_chain_id",
  "finality_adapter_id",
  "log_index",
  "observed_finalized_reference_block",
  "receipt_block_number",
  "source_chain",
  "transaction_hash",
];

function text(value) {
  return String(value ?? "").trim();
}

function exactKeys(value, expected, code) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${code}:not_object`);
  }
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (
    actual.length !== wanted.length ||
    actual.some((key, index) => key !== wanted[index])
  ) {
    throw new Error(`${code}:${actual.join(",")}`);
  }
}

function canonical(value) {
  if (value === null) return "null";
  if (typeof value === "string" || typeof value === "boolean") {
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value)) {
      throw new Error("non_canonical_number");
    }
    return String(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonical).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`)
      .join(",")}}`;
  }
  throw new Error(`non_canonical_value:${typeof value}`);
}

function fingerprint(value) {
  return crypto
    .createHash("sha256")
    .update(canonical(value), "utf8")
    .digest("hex");
}

function normalizeChain(value) {
  const raw = text(value).toLowerCase();
  return raw === "eth" ? "ethereum" : raw;
}

function normalizeAddress(value, code) {
  const address = text(value).toLowerCase();
  if (!ADDRESS.test(address)) throw new Error(code);
  return address;
}

function normalizeHash(value, code) {
  const hash = text(value).toLowerCase();
  if (!TX_HASH.test(hash)) throw new Error(code);
  return hash;
}

function safeId(value, code) {
  const id = text(value);
  if (!SAFE_ID.test(id)) throw new Error(code);
  return id;
}

function canonicalUint(value, code, maximum = null) {
  const raw = text(value);
  if (!UINT.test(raw)) throw new Error(code);
  let parsed;
  try {
    parsed = BigInt(raw);
  } catch {
    throw new Error(code);
  }
  if (maximum !== null && parsed > maximum) throw new Error(code);
  return { raw, parsed };
}

function positiveUint(value, code, maximum = null) {
  const result = canonicalUint(value, code, maximum);
  if (result.parsed <= 0n) throw new Error(code);
  return result;
}

function held(reason, missingEnvs = [], detail = undefined) {
  return {
    ok: false,
    status: VOID_BUY_VOID_DUAL_RAIL_POLICY_HOLD_V1,
    reason,
    missing_envs: [...missingEnvs].sort(),
    ...(detail ? { detail } : {}),
  };
}

function configuredEnvironment(env) {
  const missing = [];
  const values = {};

  for (const chain of VOID_BUY_VOID_DUAL_RAIL_ORDER_V1) {
    values[chain] = {};
    for (const [field, name] of Object.entries(
      VOID_BUY_VOID_DUAL_RAIL_ENV_V1[chain],
    )) {
      const value = text(env[name]);
      values[chain][field] = value;
      if (!value) missing.push(name);
    }
  }

  return missing.length
    ? { ok: false, missing }
    : { ok: true, values };
}

function legacySingleChainValues(env) {
  return VOID_BUY_VOID_LEGACY_SINGLE_CHAIN_ENV_V1.filter(
    (name) => text(env[name]) !== "",
  );
}

function normalizeRail(chain, raw) {
  const definition = VOID_BUY_VOID_DUAL_RAIL_DEFINITIONS_V1[chain];
  const usdcContract = normalizeAddress(
    raw.usdc_contract,
    `${chain}_invalid_usdc_contract`,
  );
  const receiveAddress = normalizeAddress(
    raw.receive_address,
    `${chain}_invalid_receive_address`,
  );
  const rpcIdentity = safeId(
    raw.rpc_identity,
    `${chain}_invalid_rpc_identity`,
  );
  const finalityAdapterId = safeId(
    raw.finality_adapter_id,
    `${chain}_invalid_finality_adapter_id`,
  );
  const minimum = positiveUint(
    raw.min_confirmations,
    `${chain}_invalid_min_confirmations`,
    MAX_CONFIRMATIONS,
  );
  const reference = canonicalUint(
    raw.finalized_reference_block,
    `${chain}_invalid_finalized_reference_block`,
  );

  return {
    source_chain: definition.source_chain,
    evm_chain_id: definition.evm_chain_id,
    usdc_contract: usdcContract,
    receive_address: receiveAddress,
    rpc_identity: rpcIdentity,
    finality: {
      adapter_id: finalityAdapterId,
      min_confirmations: minimum.raw,
      finalized_reference_block: reference.raw,
    },
  };
}

function stableRailProjection(rail) {
  return {
    source_chain: rail.source_chain,
    evm_chain_id: rail.evm_chain_id,
    usdc_contract: rail.usdc_contract,
    receive_address: rail.receive_address,
    rpc_identity: rail.rpc_identity,
    finality_adapter_id: rail.finality.adapter_id,
    min_confirmations: rail.finality.min_confirmations,
  };
}

function observationProjection(rails, combinedStableSha256) {
  return {
    combined_stable_sha256: combinedStableSha256,
    finalized_reference_blocks: Object.fromEntries(
      rails.map((rail) => [
        rail.source_chain,
        rail.finality.finalized_reference_block,
      ]),
    ),
  };
}

function buildPolicy(rails) {
  const baseStable = stableRailProjection(rails[0]);
  const ethereumStable = stableRailProjection(rails[1]);
  const baseStableSha256 = fingerprint(baseStable);
  const ethereumStableSha256 = fingerprint(ethereumStable);
  const combinedStableSha256 = fingerprint({
    marker: VOID_BUY_VOID_DUAL_RAIL_SERVER_POLICY_CONTRACT_V1,
    version: 1,
    rail_order: VOID_BUY_VOID_DUAL_RAIL_ORDER_V1,
    rails: [baseStable, ethereumStable],
    economics: VOID_BUY_VOID_CANONICAL_PRESALE_ECONOMICS_DUAL_RAIL_V1,
  });
  const observationSha256 = fingerprint(
    observationProjection(rails, combinedStableSha256),
  );
  const fingerprints = {
    base_stable_sha256: baseStableSha256,
    ethereum_stable_sha256: ethereumStableSha256,
    combined_stable_sha256: combinedStableSha256,
    observation_sha256: observationSha256,
  };

  const publicSummary = {
    advertised_chains: ["base", "ethereum"],
    evm_chain_ids: {
      base: "8453",
      ethereum: "1",
    },
    min_confirmations_by_chain: Object.fromEntries(
      rails.map((rail) => [
        rail.source_chain,
        rail.finality.min_confirmations,
      ]),
    ),
    stable_config_sha256: combinedStableSha256,
    observation_sha256: observationSha256,
    accepted_payment_asset: "USDC",
    canonical_presale_max_void: "10000000",
    rate_void_per_usdc: "2",
    exact_payment_required: true,
    one_payment_one_fulfillment: true,
  };

  return {
    marker: VOID_BUY_VOID_DUAL_RAIL_SERVER_POLICY_CONTRACT_V1,
    version: 1,
    rails,
    economics: VOID_BUY_VOID_CANONICAL_PRESALE_ECONOMICS_DUAL_RAIL_V1,
    fingerprints,
    public_summary: publicSummary,
    policy_id:
      `void-buy-void-dual-rail-policy-v1-${combinedStableSha256}`,
    authority: VOID_BUY_VOID_DUAL_RAIL_SERVER_POLICY_AUTHORITY_V1,
  };
}

export function readBuyVoidDualRailServerPolicyContractV1(
  env = process.env,
) {
  const legacy = legacySingleChainValues(env);
  if (legacy.length) {
    return held("legacy_single_chain_configuration_present", [], {
      legacy_env_names: legacy.sort(),
    });
  }

  const configured = configuredEnvironment(env);
  if (!configured.ok) {
    return held("dual_rail_configuration_incomplete", configured.missing);
  }

  try {
    const rails = VOID_BUY_VOID_DUAL_RAIL_ORDER_V1.map((chain) =>
      normalizeRail(chain, configured.values[chain]),
    );
    const policy = buildPolicy(rails);
    validateBuyVoidDualRailServerPolicyObjectV1(policy);
    return {
      ok: true,
      status: "configured",
      policy,
    };
  } catch (error) {
    return held(text(error?.message) || "dual_rail_configuration_invalid");
  }
}

function validateRailObject(rail, expectedChain) {
  exactKeys(rail, EXACT_RAIL_KEYS, "rail_unknown_or_missing_fields");
  const definition = VOID_BUY_VOID_DUAL_RAIL_DEFINITIONS_V1[expectedChain];
  if (rail.source_chain !== expectedChain) {
    throw new Error(`${expectedChain}_source_chain_mismatch`);
  }
  if (text(rail.evm_chain_id) !== definition.evm_chain_id) {
    throw new Error(`${expectedChain}_evm_chain_id_mismatch`);
  }
  normalizeAddress(
    rail.usdc_contract,
    `${expectedChain}_invalid_usdc_contract`,
  );
  normalizeAddress(
    rail.receive_address,
    `${expectedChain}_invalid_receive_address`,
  );
  safeId(rail.rpc_identity, `${expectedChain}_invalid_rpc_identity`);
  exactKeys(
    rail.finality,
    EXACT_FINALITY_KEYS,
    `${expectedChain}_finality_unknown_or_missing_fields`,
  );
  safeId(
    rail.finality.adapter_id,
    `${expectedChain}_invalid_finality_adapter_id`,
  );
  positiveUint(
    rail.finality.min_confirmations,
    `${expectedChain}_invalid_min_confirmations`,
    MAX_CONFIRMATIONS,
  );
  canonicalUint(
    rail.finality.finalized_reference_block,
    `${expectedChain}_invalid_finalized_reference_block`,
  );
}

export function validateBuyVoidDualRailServerPolicyObjectV1(policy) {
  exactKeys(policy, EXACT_POLICY_KEYS, "policy_unknown_or_missing_fields");
  if (
    policy.marker !== VOID_BUY_VOID_DUAL_RAIL_SERVER_POLICY_CONTRACT_V1
  ) {
    throw new Error("policy_marker_mismatch");
  }
  if (policy.version !== 1) throw new Error("policy_version_mismatch");
  if (!Array.isArray(policy.rails) || policy.rails.length !== 2) {
    throw new Error("policy_requires_exactly_two_rails");
  }

  for (let index = 0; index < 2; index += 1) {
    validateRailObject(
      policy.rails[index],
      VOID_BUY_VOID_DUAL_RAIL_ORDER_V1[index],
    );
  }

  if (
    canonical(policy.economics) !==
    canonical(VOID_BUY_VOID_CANONICAL_PRESALE_ECONOMICS_DUAL_RAIL_V1)
  ) {
    throw new Error("canonical_presale_economics_mismatch");
  }
  exactKeys(
    policy.fingerprints,
    EXACT_FINGERPRINT_KEYS,
    "fingerprints_unknown_or_missing_fields",
  );
  exactKeys(
    policy.public_summary,
    EXACT_SUMMARY_KEYS,
    "public_summary_unknown_or_missing_fields",
  );
  if (
    canonical(policy.authority) !==
    canonical(VOID_BUY_VOID_DUAL_RAIL_SERVER_POLICY_AUTHORITY_V1)
  ) {
    throw new Error("authority_boundary_mismatch");
  }

  const rebuilt = buildPolicy(
    policy.rails.map((rail) => ({
      source_chain: rail.source_chain,
      evm_chain_id: text(rail.evm_chain_id),
      usdc_contract: normalizeAddress(
        rail.usdc_contract,
        `${rail.source_chain}_invalid_usdc_contract`,
      ),
      receive_address: normalizeAddress(
        rail.receive_address,
        `${rail.source_chain}_invalid_receive_address`,
      ),
      rpc_identity: safeId(
        rail.rpc_identity,
        `${rail.source_chain}_invalid_rpc_identity`,
      ),
      finality: {
        adapter_id: safeId(
          rail.finality.adapter_id,
          `${rail.source_chain}_invalid_finality_adapter_id`,
        ),
        min_confirmations: positiveUint(
          rail.finality.min_confirmations,
          `${rail.source_chain}_invalid_min_confirmations`,
          MAX_CONFIRMATIONS,
        ).raw,
        finalized_reference_block: canonicalUint(
          rail.finality.finalized_reference_block,
          `${rail.source_chain}_invalid_finalized_reference_block`,
        ).raw,
      },
    })),
  );

  if (canonical(rebuilt) !== canonical(policy)) {
    throw new Error("policy_derived_fields_mismatch");
  }
  return policy;
}

function railFromPolicy(policy, chainInput) {
  validateBuyVoidDualRailServerPolicyObjectV1(policy);
  const chain = normalizeChain(chainInput);
  const rail = policy.rails.find(
    (candidate) => candidate.source_chain === chain,
  );
  if (!rail) throw new Error("payment_source_chain_not_advertised");
  return rail;
}

export function canonicalBuyVoidPaymentIdentityV1(
  sourceChain,
  transactionHash,
  logIndex,
) {
  const chain = normalizeChain(sourceChain);
  if (!VOID_BUY_VOID_DUAL_RAIL_ORDER_V1.includes(chain)) {
    throw new Error("payment_source_chain_not_advertised");
  }
  const hash = normalizeHash(transactionHash, "invalid_transaction_hash");
  const index = canonicalUint(logIndex, "invalid_log_index", MAX_U32);
  return `voidpay1:${chain}:${hash}:${index.raw}`;
}

export function evaluateBuyVoidDualRailPaymentFinalityV1(
  policy,
  observation,
) {
  exactKeys(
    observation,
    EXACT_PAYMENT_OBSERVATION_KEYS,
    "payment_observation_unknown_or_missing_fields",
  );
  const rail = railFromPolicy(policy, observation.source_chain);
  const chain = normalizeChain(observation.source_chain);

  if (text(observation.evm_chain_id) !== rail.evm_chain_id) {
    return held("payment_evm_chain_id_mismatch");
  }
  if (text(observation.finality_adapter_id) !== rail.finality.adapter_id) {
    return held("payment_finality_adapter_mismatch");
  }

  let transactionHash;
  let logIndex;
  let receiptBlock;
  let observedReference;
  let confirmations;
  try {
    transactionHash = normalizeHash(
      observation.transaction_hash,
      "invalid_transaction_hash",
    );
    logIndex = canonicalUint(
      observation.log_index,
      "invalid_log_index",
      MAX_U32,
    );
    receiptBlock = canonicalUint(
      observation.receipt_block_number,
      "invalid_receipt_block_number",
    );
    observedReference = canonicalUint(
      observation.observed_finalized_reference_block,
      "invalid_observed_finalized_reference_block",
    );
    confirmations = canonicalUint(
      observation.confirmations_observed,
      "invalid_confirmations_observed",
    );
  } catch (error) {
    return held(text(error?.message) || "payment_observation_invalid");
  }

  if (
    observedReference.raw !== rail.finality.finalized_reference_block
  ) {
    return held("payment_mixed_policy_observation_generation");
  }
  if (observedReference.parsed < receiptBlock.parsed) {
    return held("payment_receipt_not_within_finalized_reference");
  }

  const derivedConfirmations =
    observedReference.parsed - receiptBlock.parsed + 1n;
  if (confirmations.parsed !== derivedConfirmations) {
    return held("payment_confirmation_count_mismatch", [], {
      expected_confirmations: derivedConfirmations.toString(),
      observed_confirmations: confirmations.raw,
    });
  }

  const minimum = BigInt(rail.finality.min_confirmations);
  if (derivedConfirmations < minimum) {
    return held("payment_finality_threshold_not_met", [], {
      required_confirmations: minimum.toString(),
      observed_confirmations: derivedConfirmations.toString(),
    });
  }

  return {
    ok: true,
    status: "source_payment_finality_admitted",
    source_chain: chain,
    evm_chain_id: rail.evm_chain_id,
    payment_identity: canonicalBuyVoidPaymentIdentityV1(
      chain,
      transactionHash,
      logIndex.raw,
    ),
    transaction_hash: transactionHash,
    log_index: logIndex.raw,
    receipt_block_number: receiptBlock.raw,
    finalized_reference_block: observedReference.raw,
    confirmations_observed: confirmations.raw,
    finality_adapter_id: rail.finality.adapter_id,
    policy_id: policy.policy_id,
    stable_config_sha256:
      policy.fingerprints.combined_stable_sha256,
    observation_sha256: policy.fingerprints.observation_sha256,
    fulfillment_authority_granted: false,
    inventory_mutation_authority_granted: false,
    signing_or_broadcast_authority_granted: false,
  };
}

export function assertBuyVoidDualRailIsolationV1(
  baseObservation,
  ethereumObservation,
) {
  if (
    normalizeChain(baseObservation?.source_chain) !== "base" ||
    normalizeChain(ethereumObservation?.source_chain) !== "ethereum"
  ) {
    throw new Error("dual_rail_isolation_requires_base_and_ethereum");
  }
  if (
    text(baseObservation.evm_chain_id) ===
    text(ethereumObservation.evm_chain_id)
  ) {
    throw new Error("dual_rail_chain_ids_must_be_distinct");
  }
  if (
    text(baseObservation.finality_adapter_id) ===
    text(ethereumObservation.finality_adapter_id)
  ) {
    throw new Error("dual_rail_finality_adapter_ids_must_be_distinct");
  }
  return true;
}
