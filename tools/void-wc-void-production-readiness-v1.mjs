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
  "market_vault_compiler_profile_locked",
  "market_vault_dual_compiler_gate_implemented",
  "market_vault_compiled_identity_committed",
  "market_vault_deployment_preparation_implemented",
  "market_vault_deployer_observer_implemented",
  "market_vault_deployer_generation_evidence_committed",
  "market_vault_deployer_address",
  "market_vault_deployer_observation_verified",
  "market_vault_deployer_pending_nonce",
  "market_vault_predicted_contract_address",
  "market_vault_deployment_gas_estimate",
  "market_vault_proposed_deployment_gas_limit",
  "market_vault_deployer_balance_sufficient",
  "market_vault_fee_caps_sufficient",
  "market_vault_coupled_launch_commitment_committed",
  "market_vault_role_binding_proposal_implemented",
  "market_vault_role_binding_proposal_path",
  "market_vault_role_binding_authorization_committed",
  "market_vault_role_binding_authorization_id",
  "market_vault_role_binding_authorization_path",
  "market_vault_launch_controller",
  "market_vault_settlement_executor",
  "market_vault_closeout_controller",
  "market_vault_final_role_bindings_attested",
  "market_vault_coupled_launch_id",
  "market_vault_compiled_identity_id",
  "market_vault_compiled_identity_manifest_path",
  "market_vault_creation_bytecode_sha256",
  "market_vault_runtime_template_sha256",
  "market_vault_immutable_layout_sha256",
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
const EXPECTED_COMPILED_IDENTITY_ID =
  "voidwcvci1_f4096e7c4520897d656a64a8be5b344a3541e0e960226787654415f867f2d045";
const EXPECTED_COMPILED_IDENTITY_MANIFEST =
  "ops/mainnet0/wc-void-market-vault-v2-compiled-identity-v1.json";
const EXPECTED_CREATION_SHA256 =
  "84bbf44ee873c9e8b271271d8d3dc10bf6bb58d38b0d7da26558275510c0d540";
const EXPECTED_RUNTIME_TEMPLATE_SHA256 =
  "99a7179850af5a6e13c1a1b24cf873b011a98fcc8d54479722c20fc254188f7e";
const EXPECTED_IMMUTABLE_LAYOUT_SHA256 =
  "61de8af4e7f5a960227cb76383b7e48d52ddceb305d043f6905812deeb02d33b";
const EXPECTED_COUPLED_LAUNCH_ID =
  "0xfb6584220f298f239a4c6a77ff1faa274300a61597eeae85272cdda9e17f1c83";
const EXPECTED_ROLE_PROPOSAL_PATH =
  "ops/mainnet0/wc-void-coupled-launch-role-proposal-v1.json";
const EXPECTED_ROLE_AUTHORIZATION_ID =
  "voidwcvra1_8bd7a5dbb1f27b61fd236ee0588c1271cb86e719a7de8db0465a6070831b8b36";
const EXPECTED_ROLE_AUTHORIZATION_PATH =
  "ops/mainnet0/wc-void-market-vault-role-binding-authorization-v1.json";
const EXPECTED_LAUNCH_CONTROLLER =
  "0x2f1e0005e865b772b268bd8c797bf3eaa901d97e";
const EXPECTED_SETTLEMENT_EXECUTOR =
  "0xc884f631c3881b8b672bfcbf019c856146cd7f73";
const EXPECTED_CLOSEOUT_CONTROLLER =
  "0xe1f147b6b2671f140c4107fa4a1dd5f7cbd06d0b";

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
      candidate.market_vault_contract_name !== "WCVoidMarketVaultV2" ||
      candidate.market_vault_source_path !==
        "contracts/mainnet/WCVoidMarketVaultV2.sol"
    ) {
      return hold("market_vault_source_identity_mismatch");
    }
    if (candidate.market_vault_source_implemented !== true) {
      return hold("market_vault_source_implementation_missing");
    }
    if (candidate.market_vault_lock_semantics_proven !== true) {
      return hold("market_vault_lock_semantics_not_proven");
    }
    if (candidate.market_vault_compiler_profile_locked !== true) {
      return hold("market_vault_compiler_profile_not_locked");
    }
    if (candidate.market_vault_dual_compiler_gate_implemented !== true) {
      return hold("market_vault_dual_compiler_gate_missing");
    }
    if (candidate.market_vault_deployment_preparation_implemented !== true) {
      return hold("market_vault_deployment_preparation_missing");
    }
    if (candidate.market_vault_deployer_observer_implemented !== true) {
      return hold("market_vault_deployer_observer_missing");
    }
    if (candidate.market_vault_coupled_launch_commitment_committed !== true) {
      return hold("market_vault_coupled_launch_commitment_missing");
    }
    if (candidate.market_vault_role_binding_proposal_implemented !== true) {
      return hold("market_vault_role_binding_proposal_missing");
    }
    if (
      candidate.market_vault_role_binding_proposal_path !==
      EXPECTED_ROLE_PROPOSAL_PATH
    ) {
      return hold("market_vault_role_binding_proposal_path_mismatch");
    }
    if (candidate.market_vault_role_binding_authorization_committed !== true) {
      return hold("market_vault_role_binding_authorization_missing");
    }
    if (
      candidate.market_vault_role_binding_authorization_id !==
        EXPECTED_ROLE_AUTHORIZATION_ID ||
      candidate.market_vault_role_binding_authorization_path !==
        EXPECTED_ROLE_AUTHORIZATION_PATH
    ) {
      return hold("market_vault_role_binding_authorization_mismatch");
    }
    if (
      typeof candidate.market_vault_launch_controller !== "string" ||
      typeof candidate.market_vault_settlement_executor !== "string" ||
      typeof candidate.market_vault_closeout_controller !== "string" ||
      candidate.market_vault_launch_controller.toLowerCase() !==
        EXPECTED_LAUNCH_CONTROLLER ||
      candidate.market_vault_settlement_executor.toLowerCase() !==
        EXPECTED_SETTLEMENT_EXECUTOR ||
      candidate.market_vault_closeout_controller.toLowerCase() !==
        EXPECTED_CLOSEOUT_CONTROLLER
    ) {
      return hold("market_vault_final_role_binding_mismatch");
    }
    if (
      typeof candidate.market_vault_coupled_launch_id !== "string" ||
      !/^0x[0-9a-fA-F]{64}$/u.test(candidate.market_vault_coupled_launch_id) ||
      /^0x0{64}$/iu.test(candidate.market_vault_coupled_launch_id) ||
      candidate.market_vault_coupled_launch_id.toLowerCase() !==
        EXPECTED_COUPLED_LAUNCH_ID
    ) {
      return hold("market_vault_coupled_launch_id_mismatch");
    }
    if (candidate.market_vault_compiled_identity_committed === true) {
      if (
        candidate.market_vault_compiled_identity_id !==
          EXPECTED_COMPILED_IDENTITY_ID ||
        candidate.market_vault_compiled_identity_manifest_path !==
          EXPECTED_COMPILED_IDENTITY_MANIFEST ||
        candidate.market_vault_creation_bytecode_sha256 !==
          EXPECTED_CREATION_SHA256 ||
        candidate.market_vault_runtime_template_sha256 !==
          EXPECTED_RUNTIME_TEMPLATE_SHA256 ||
        candidate.market_vault_immutable_layout_sha256 !==
          EXPECTED_IMMUTABLE_LAYOUT_SHA256
      ) {
        return hold("market_vault_compiled_identity_binding_mismatch");
      }
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
    return hold("market_vault_recovery_path_not_ready");
  }
  if (candidate.market_vault_compiled_identity_committed !== true) {
    missing.push("market_vault_compiled_identity_required");
  }
  if (candidate.market_vault_final_role_bindings_attested !== true) {
    missing.push("market_vault_final_role_bindings_required");
  }
  if (candidate.market_vault_deployer_generation_evidence_committed !== true) {
    missing.push("market_vault_deployer_generation_evidence_required");
  }
  if (candidate.market_vault_deployer_address === null) {
    missing.push("market_vault_deployer_address_required");
  } else if (
    typeof candidate.market_vault_deployer_address !== "string" ||
    !ADDRESS.test(candidate.market_vault_deployer_address)
  ) {
    return hold("market_vault_deployer_address_invalid");
  }
  if (candidate.market_vault_deployer_observation_verified !== true) {
    missing.push("market_vault_deployer_observation_required");
  }
  if (candidate.market_vault_deployer_pending_nonce === null) {
    missing.push("market_vault_deployer_pending_nonce_required");
  } else if (
    typeof candidate.market_vault_deployer_pending_nonce !== "string" ||
    !UINT.test(candidate.market_vault_deployer_pending_nonce)
  ) {
    return hold("market_vault_deployer_pending_nonce_invalid");
  }
  if (candidate.market_vault_predicted_contract_address === null) {
    missing.push("market_vault_predicted_contract_address_required");
  } else if (
    typeof candidate.market_vault_predicted_contract_address !== "string" ||
    !ADDRESS.test(candidate.market_vault_predicted_contract_address)
  ) {
    return hold("market_vault_predicted_contract_address_invalid");
  }
  if (candidate.market_vault_deployment_gas_estimate === null) {
    missing.push("market_vault_deployment_gas_estimate_required");
  } else if (
    typeof candidate.market_vault_deployment_gas_estimate !== "string" ||
    !UINT.test(candidate.market_vault_deployment_gas_estimate)
  ) {
    return hold("market_vault_deployment_gas_estimate_invalid");
  }
  if (candidate.market_vault_proposed_deployment_gas_limit === null) {
    missing.push("market_vault_proposed_deployment_gas_limit_required");
  } else if (
    typeof candidate.market_vault_proposed_deployment_gas_limit !== "string" ||
    !UINT.test(candidate.market_vault_proposed_deployment_gas_limit)
  ) {
    return hold("market_vault_proposed_deployment_gas_limit_invalid");
  }
  if (candidate.market_vault_deployer_balance_sufficient !== true) {
    missing.push("market_vault_deployer_balance_sufficiency_required");
  }
  if (candidate.market_vault_fee_caps_sufficient !== true) {
    missing.push("market_vault_fee_caps_sufficiency_required");
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
