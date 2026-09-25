export const VOID_WC_VOID_PRODUCTION_READINESS_V1 =
  "VOID_WC_VOID_PRODUCTION_READINESS_V1";

export const VOID_WC_VOID_PRODUCTION_READINESS_AUTHORITY_V1 = Object.freeze({
  source_classification_only: true,
  wallet_or_signer_access: false,
  transaction_signing: false,
  transaction_broadcast: false,
  treasury_transfer: false,
  liquidity_movement: false,
  market_activation: false,
  public_presale_activation: false,
  funds_movement: false,
});

const CANDIDATE_KEYS = Object.freeze([
  "authority",
  "bounded_canary_green",
  "chain_id",
  "coupled_activation_ready",
  "default_private_key_allowed",
  "default_wallet_allowed",
  "duplicate_replay_protection_proven",
  "fixed_conversion",
  "fixed_opening_price",
  "inventory_funded",
  "inventory_lock_proven",
  "legacy_devnet_relayer_reused",
  "market_vault_contract_name",
  "market_vault_source_path",
  "market_vault_source_implemented",
  "market_vault_lock_semantics_proven",
  "market_vault_recovery_path_ready",
  "market_vault_address",
  "market_vault_independently_verified",
  "market_vault_runtime_code_sha256",
  "marker",
  "native_void_token",
  "opening_discovery_implemented",
  "opening_price_source",
  "pair",
  "protocol_void_inventory_atoms",
  "protocol_wc_seed_units",
  "status",
  "version",
  "wc_settlement_adapter_id",
  "wc_settlement_adapter_implemented",
  "wc_settlement_adapter_independently_reviewed",
  "wc_ledger_persistence_verifier_implemented",
  "wc_ledger_persistence_verified",
  "quote_reserve_custody_verified",
  "participant_opening_claim_policy_ready",
  "wc_source_profile",
]);

const SOURCE_PROFILE_KEYS = Object.freeze([
  "quote_asset_form",
  "quote_decimals",
  "quote_unit",
  "source_domain",
]);

const AUTHORITY_KEYS = Object.freeze([
  "funds_movement",
  "liquidity_movement",
  "market_activation",
  "public_presale_activation",
  "transaction_broadcast",
  "transaction_signing",
  "treasury_transfer",
  "wallet_or_signer_access",
]);

const ADDRESS = /^0x[0-9a-fA-F]{40}$/u;
const SHA256_HEX = /^[0-9a-f]{64}$/u;
const SAFE_ID = /^[A-Za-z0-9._:-]{1,160}$/u;
const UINT = /^(0|[1-9][0-9]*)$/u;

const EXPECTED_VOID_TOKEN = "0x470075b85352eb86f7d089fb9ba88945f12aad94";
const EXPECTED_VOID_INVENTORY_ATOMS = 10_000_000n * 10n ** 18n;

function plainObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) {
    throw new Error(`${label} must use a plain prototype`);
  }
  return value;
}

function exactObject(value, keys, label) {
  const object = plainObject(value, label);
  const actual = Object.keys(object).sort();
  const expected = [...keys].sort();
  if (
    actual.length !== expected.length ||
    actual.some((key, index) => key !== expected[index])
  ) {
    throw new Error(`${label} keys mismatch`);
  }
  return object;
}

function hold(reason, extra = {}) {
  return Object.freeze({
    ok: false,
    status: "HOLD",
    marker: VOID_WC_VOID_PRODUCTION_READINESS_V1,
    reason,
    ...extra,
    authority: VOID_WC_VOID_PRODUCTION_READINESS_AUTHORITY_V1,
  });
}

function canonicalUint(value, label) {
  if (typeof value !== "string" || value.length > 78 || !UINT.test(value)) {
    throw new Error(`${label} must be a canonical unsigned decimal string`);
  }
  return BigInt(value);
}

function allFalseAuthority(value) {
  const authority = exactObject(value, AUTHORITY_KEYS, "authority");
  for (const key of AUTHORITY_KEYS) {
    if (authority[key] !== false) {
      throw new Error(`authority.${key} must remain false`);
    }
  }
  return true;
}

export function classifyVoidWcVoidProductionReadinessV1(raw) {
  let candidate;
  try {
    candidate = exactObject(raw, CANDIDATE_KEYS, "WC/VOID production candidate");
    allFalseAuthority(candidate.authority);

    if (
      candidate.marker !== "VOID_WC_VOID_PRODUCTION_CANDIDATE_V1" ||
      candidate.version !== 1 ||
      !["hold", "source_ready"].includes(candidate.status)
    ) {
      return hold("candidate_identity_invalid");
    }
    if (candidate.chain_id !== 2050 || candidate.pair !== "WC_VOID") {
      return hold("network_or_pair_mismatch");
    }
    if (
      typeof candidate.native_void_token !== "string" ||
      !ADDRESS.test(candidate.native_void_token) ||
      candidate.native_void_token.toLowerCase() !== EXPECTED_VOID_TOKEN
    ) {
      return hold("canonical_void_token_mismatch");
    }
    if (
      canonicalUint(
        candidate.protocol_void_inventory_atoms,
        "protocol_void_inventory_atoms",
      ) !== EXPECTED_VOID_INVENTORY_ATOMS
    ) {
      return hold("protocol_void_inventory_mismatch");
    }
    if (canonicalUint(candidate.protocol_wc_seed_units, "protocol_wc_seed_units") !== 0n) {
      return hold("protocol_wc_seed_must_be_zero");
    }
    if (candidate.fixed_conversion !== false || candidate.fixed_opening_price !== false) {
      return hold("fixed_wc_void_price_authority_forbidden");
    }
    if (candidate.opening_price_source !== "settled_wc_reserve_ratio") {
      return hold("opening_price_source_mismatch");
    }

    const profile = exactObject(
      candidate.wc_source_profile,
      SOURCE_PROFILE_KEYS,
      "WC source profile",
    );
    if (
      profile.source_domain !== "void-work-credit-ledger" ||
      profile.quote_asset_form !== "ledger-credit" ||
      profile.quote_unit !== "wc" ||
      profile.quote_decimals !== 0
    ) {
      return hold("wc_source_profile_mismatch");
    }

    if (
      candidate.market_vault_contract_name !== "WCVoidMarketVaultV1" ||
      candidate.market_vault_source_path !==
        "contracts/mainnet/WCVoidMarketVaultV1.sol"
    ) {
      return hold("market_vault_source_identity_mismatch");
    }
    if (candidate.market_vault_source_implemented !== true) {
      return hold("market_vault_source_implementation_missing");
    }
    if (candidate.market_vault_lock_semantics_proven !== true) {
      return hold("market_vault_lock_semantics_not_proven");
    }

    if (
      candidate.legacy_devnet_relayer_reused !== false ||
      candidate.default_private_key_allowed !== false ||
      candidate.default_wallet_allowed !== false
    ) {
      return hold("devnet_or_default_secret_path_forbidden");
    }
  } catch (error) {
    return hold("candidate_shape_or_value_invalid", {
      error_class:
        error instanceof Error && /^[A-Za-z0-9._:-]{1,80}$/u.test(error.name)
          ? error.name
          : "Error",
    });
  }

  const missing = [];
  if (candidate.market_vault_recovery_path_ready !== true) {
    missing.push("market_vault_recovery_path_required");
  }
  if (candidate.market_vault_address === null) {
    missing.push("market_vault_address_required");
  } else if (
    typeof candidate.market_vault_address !== "string" ||
    !ADDRESS.test(candidate.market_vault_address)
  ) {
    return hold("market_vault_address_invalid");
  }

  if (candidate.market_vault_runtime_code_sha256 === null) {
    missing.push("market_vault_runtime_code_sha256_required");
  } else if (
    typeof candidate.market_vault_runtime_code_sha256 !== "string" ||
    !SHA256_HEX.test(candidate.market_vault_runtime_code_sha256)
  ) {
    return hold("market_vault_runtime_code_sha256_invalid");
  }

  if (candidate.market_vault_independently_verified !== true) {
    missing.push("market_vault_independent_verification_required");
  }
  if (candidate.inventory_funded !== true) {
    missing.push("inventory_funding_required");
  }
  if (candidate.inventory_lock_proven !== true) {
    missing.push("inventory_lock_proof_required");
  }
  if (candidate.opening_discovery_implemented !== true) {
    missing.push("opening_discovery_implementation_required");
  }

  if (candidate.wc_settlement_adapter_id === null) {
    missing.push("wc_settlement_adapter_id_required");
  } else if (
    typeof candidate.wc_settlement_adapter_id !== "string" ||
    !SAFE_ID.test(candidate.wc_settlement_adapter_id)
  ) {
    return hold("wc_settlement_adapter_id_invalid");
  }

  if (candidate.wc_settlement_adapter_implemented !== true) {
    missing.push("wc_settlement_adapter_implementation_required");
  }
  if (candidate.wc_settlement_adapter_independently_reviewed !== true) {
    missing.push("wc_settlement_adapter_independent_review_required");
  }
  if (candidate.wc_ledger_persistence_verifier_implemented !== true) {
    missing.push("wc_ledger_persistence_verifier_implementation_required");
  }
  if (candidate.wc_ledger_persistence_verified !== true) {
    missing.push("wc_ledger_persistence_verification_required");
  }
  if (candidate.quote_reserve_custody_verified !== true) {
    missing.push("quote_reserve_custody_verification_required");
  }
  if (candidate.participant_opening_claim_policy_ready !== true) {
    missing.push("participant_opening_claim_policy_required");
  }
  if (candidate.duplicate_replay_protection_proven !== true) {
    missing.push("duplicate_replay_protection_required");
  }
  if (candidate.bounded_canary_green !== true) {
    missing.push("bounded_canary_required");
  }
  if (candidate.coupled_activation_ready !== true) {
    missing.push("coupled_activation_ready_required");
  }

  if (missing.length > 0) {
    return hold("production_gates_incomplete", {
      missing_gates: Object.freeze(missing),
      declared_status: candidate.status,
    });
  }
  if (candidate.status !== "source_ready") {
    return hold("source_ready_status_required", {
      missing_gates: Object.freeze([]),
      declared_status: candidate.status,
    });
  }

  return Object.freeze({
    ok: true,
    status: "SOURCE_READY",
    marker: VOID_WC_VOID_PRODUCTION_READINESS_V1,
    chain_id: 2050,
    pair: "WC_VOID",
    market_vault_address: candidate.market_vault_address.toLowerCase(),
    market_vault_runtime_code_sha256:
      candidate.market_vault_runtime_code_sha256,
    wc_settlement_adapter_id: candidate.wc_settlement_adapter_id,
    protocol_void_inventory_atoms:
      EXPECTED_VOID_INVENTORY_ATOMS.toString(),
    protocol_wc_seed_units: "0",
    opening_price_source: "settled_wc_reserve_ratio",
    activation_authority: false,
    funding_authority: false,
    authority: VOID_WC_VOID_PRODUCTION_READINESS_AUTHORITY_V1,
  });
}
