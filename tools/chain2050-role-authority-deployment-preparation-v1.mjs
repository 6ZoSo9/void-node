#!/usr/bin/env node
import crypto from "node:crypto";
import {
  AbiCoder,
  getAddress,
  getCreateAddress,
  keccak256,
} from "ethers";

export const MARKER =
  "VOID_CHAIN2050_ROLE_AUTHORITY_DEPLOYMENT_PREPARATION_V1";
export const CHAIN_ID = 2050;
export const ACCEPTED_REVIEW_PACKET_SHA256 =
  "0f7bd135971b0f41d9ab203a579b6b382d4bbf734bc14f0a2cb0fd15030ab1df";
export const ACCEPTED_CREATION_BYTECODE_SHA256 =
  "c0844cd0718ed2dc345bbc01107b57dbb2c2129e325066bff399502031a14733";
export const ACCEPTED_EXPECTED_DEPLOYED_RUNTIME_SHA256 =
  "b2e1938deb9dd2692a322fd837a5128aeb99d3c33095087c8af8d828a6ed930d";

export const EXISTING_MAINNET0_ADDRESS_ROLES_V1 = Object.freeze({
  void_token:
    "0x470075b85352eb86f7d089fb9ba88945f12aad94",
  void_treasury:
    "0x554ecc7be6f0b7cc3d1c578c2bb848e535c02514",
  ops_treasury:
    "0xf0d64c62a87034e1838db8ec1e2e33666814e7d9",
  admin_gate:
    "0xdadb70747fb39e79c867811f5a5592c1611bcb52",
  config_gate:
    "0xcf4239ec209bbdb25f5c22903a5aa2050752dd24",
  validator_set:
    "0x4b3f78e86b0427f750938e7b022d98aa4275f2f7",
  emissions_controller:
    "0x72b2dead8ce4728a1f3b800f96502a7ace091b81",
  reward_engine:
    "0xe2670614ab3cab77999847f3fd2ff6fc34fe2292",
  upgrade_staking:
    "0x77dfeedd19a4741f299c902ad5bbe0de917a9e59",
  fulfillment_wallet:
    "0xc884f631c3881b8b672bfcbf019c856146cd7f73",
  validator_admin:
    "0x8dc0d4abc9ecd40b5e8f6b4c2fe1370822e52bc4",
  admin_gate_master_key:
    "0x5730ca2ac38f0e39bf46c121fbdf581638fa72bc",
  validator0_reward:
    "0xd2571d5d471d6574f7d57d0a3aca5b34d0c8da6f",
  buy_void_fulfillment_deployer:
    "0x2b4d94ce678ec0bc17924b83236b714339c70b9d",
});

export const AUTHORITY_V1 = Object.freeze({
  accepted_bytecode_identity_required: true,
  explicit_owner_required: true,
  explicit_deployer_required: true,
  owner_deployer_separation_required: true,
  known_role_collision_forbidden: true,
  creation_bytecode_hash_required: true,
  unsigned_type2_transaction_only: true,
  rpc_call: false,
  credential_access: false,
  wallet_access: false,
  private_key_access: false,
  signing: false,
  transaction_broadcast: false,
  deployment: false,
  chain2050_mutation: false,
  registry_append: false,
  service_action: false,
  production_activation: false,
  funds_action: false,
});

const ZERO =
  "0x0000000000000000000000000000000000000000";
const HEX_BYTES = /^0x(?:[0-9a-f]{2})+$/;
const ABI = AbiCoder.defaultAbiCoder();

function sha256Bytes(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function address(value, code) {
  if (
    typeof value !== "string" ||
    !/^0x[0-9a-fA-F]{40}$/.test(value.trim())
  ) {
    throw new Error(code);
  }
  try {
    return getAddress(value.trim()).toLowerCase();
  } catch {
    throw new Error(code);
  }
}

function uint(value, code, { allowZero = true } = {}) {
  try {
    const parsed = BigInt(value);
    if (
      parsed < 0n ||
      (!allowZero && parsed === 0n) ||
      parsed >= 2n ** 256n
    ) {
      throw new Error(code);
    }
    return parsed;
  } catch {
    throw new Error(code);
  }
}

function knownRole(candidate) {
  for (const [role, existing] of Object.entries(
    EXISTING_MAINNET0_ADDRESS_ROLES_V1,
  )) {
    if (candidate === existing) return role;
  }
  return null;
}

export function reviewRoleAuthorityOwnerDeployerPairV1({
  owner_address,
  deployer_address,
} = {}) {
  let owner;
  let deployer;
  try {
    owner = address(owner_address, "owner_address_invalid");
    deployer = address(
      deployer_address,
      "deployer_address_invalid",
    );
  } catch (error) {
    return {
      ok: false,
      status: "held",
      marker: MARKER,
      reason: String(error?.message || error),
      owner_address: null,
      deployer_address: null,
      pair_selected: false,
      deployment_authorized: false,
      authority: AUTHORITY_V1,
    };
  }

  if (owner === ZERO || deployer === ZERO) {
    return {
      ok: false,
      status: "held",
      marker: MARKER,
      reason: "zero_address_forbidden",
      owner_address: owner,
      deployer_address: deployer,
      pair_selected: false,
      deployment_authorized: false,
      authority: AUTHORITY_V1,
    };
  }
  if (owner === deployer) {
    return {
      ok: false,
      status: "held",
      marker: MARKER,
      reason: "owner_deployer_separation_required",
      owner_address: owner,
      deployer_address: deployer,
      pair_selected: false,
      deployment_authorized: false,
      authority: AUTHORITY_V1,
    };
  }

  const ownerRole = knownRole(owner);
  if (ownerRole) {
    return {
      ok: false,
      status: "held",
      marker: MARKER,
      reason:
        "owner_existing_mainnet0_role_reuse_requires_separate_explicit_exception",
      detail: { existing_role: ownerRole },
      owner_address: owner,
      deployer_address: deployer,
      pair_selected: false,
      deployment_authorized: false,
      authority: AUTHORITY_V1,
    };
  }

  const deployerRole = knownRole(deployer);
  if (deployerRole) {
    return {
      ok: false,
      status: "held",
      marker: MARKER,
      reason:
        "deployer_existing_mainnet0_role_reuse_requires_separate_explicit_exception",
      detail: { existing_role: deployerRole },
      owner_address: owner,
      deployer_address: deployer,
      pair_selected: false,
      deployment_authorized: false,
      authority: AUTHORITY_V1,
    };
  }

  return {
    ok: true,
    status: "pair_shape_eligible_explicit_selection_required",
    marker: MARKER,
    owner_address: owner,
    deployer_address: deployer,
    owner_deployer_separated: true,
    known_role_collision: false,
    pair_selected: false,
    deployment_authorized: false,
    next_gate:
      "explicitly_select_pair_then_bind_fresh_nonce_gas_fee_observation",
    authority: AUTHORITY_V1,
  };
}

function verifiedCreationBytecode(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (!HEX_BYTES.test(raw)) {
    throw new Error("creation_bytecode_invalid");
  }
  const bytes = Buffer.from(raw.slice(2), "hex");
  const digest = sha256Bytes(bytes);
  if (digest !== ACCEPTED_CREATION_BYTECODE_SHA256) {
    throw new Error("creation_bytecode_hash_mismatch");
  }
  return { raw, bytes, sha256: digest };
}

export function buildRoleAuthorityUnsignedDeploymentPreparationV1({
  accepted_review_packet_sha256,
  owner_address,
  deployer_address,
  creation_bytecode,
  nonce,
  gas_limit,
  max_fee_per_gas_wei,
  max_priority_fee_per_gas_wei,
} = {}) {
  if (
    accepted_review_packet_sha256 !==
    ACCEPTED_REVIEW_PACKET_SHA256
  ) {
    throw new Error("accepted_review_packet_mismatch");
  }

  const pair = reviewRoleAuthorityOwnerDeployerPairV1({
    owner_address,
    deployer_address,
  });
  if (pair.ok !== true) {
    throw new Error("owner_deployer_pair_rejected:" + pair.reason);
  }

  const creation = verifiedCreationBytecode(creation_bytecode);
  const normalizedNonce = uint(nonce, "nonce_invalid");
  const gasLimit = uint(gas_limit, "gas_limit_invalid", {
    allowZero: false,
  });
  const maxFee = uint(
    max_fee_per_gas_wei,
    "max_fee_per_gas_invalid",
    { allowZero: false },
  );
  const priority = uint(
    max_priority_fee_per_gas_wei,
    "max_priority_fee_per_gas_invalid",
    { allowZero: true },
  );
  if (priority > maxFee) {
    throw new Error("fee_policy_invalid");
  }

  const constructorArguments =
    ABI.encode(["address"], [pair.owner_address]).toLowerCase();
  const deploymentData =
    creation.raw + constructorArguments.slice(2);
  const deploymentBytes = Buffer.from(
    deploymentData.slice(2),
    "hex",
  );
  const predictedAddress = getCreateAddress({
    from: pair.deployer_address,
    nonce: normalizedNonce,
  }).toLowerCase();

  return Object.freeze({
    marker: MARKER,
    version: 1,
    status:
      "UNSIGNED_DEPLOYMENT_PREPARATION_REQUIRES_SEPARATE_SELECTION_AND_BROADCAST_AUTHORIZATION",
    chain_id: "2050",
    accepted_review_packet_sha256:
      ACCEPTED_REVIEW_PACKET_SHA256,
    accepted_creation_bytecode_sha256:
      ACCEPTED_CREATION_BYTECODE_SHA256,
    expected_deployed_runtime_sha256:
      ACCEPTED_EXPECTED_DEPLOYED_RUNTIME_SHA256,
    owner_deployer_binding: Object.freeze({
      owner_address: pair.owner_address,
      deployer_address: pair.deployer_address,
      owner_deployer_separated: true,
      known_role_collision: false,
    }),
    constructor: Object.freeze({
      signature: "constructor(address initialOwner)",
      abi_encoded_arguments: constructorArguments,
      abi_encoded_arguments_sha256: sha256Bytes(
        Buffer.from(constructorArguments.slice(2), "hex"),
      ),
    }),
    deployment_data: Object.freeze({
      bytes: deploymentBytes.length,
      sha256: sha256Bytes(deploymentBytes),
      keccak256: keccak256(deploymentData),
      data: deploymentData,
      predicted_contract_address: predictedAddress,
    }),
    unsigned_transaction: Object.freeze({
      type: 2,
      chain_id: "2050",
      from_address: pair.deployer_address,
      to_address: null,
      nonce: normalizedNonce.toString(),
      gas_limit: gasLimit.toString(),
      max_fee_per_gas_wei: maxFee.toString(),
      max_priority_fee_per_gas_wei: priority.toString(),
      value_wei: "0",
      data: deploymentData,
      predicted_contract_address: predictedAddress,
    }),
    authority: AUTHORITY_V1,
    decision: Object.freeze({
      sovereign_bytecode_acceptance: true,
      owner_deployer_pair_shape_valid: true,
      unsigned_transaction_constructed: true,
      signing_authorized: false,
      transaction_broadcast_authorized: false,
      deployment_authorized: false,
      registry_append_authorized: false,
      production_activation_authorized: false,
      next_gate:
        "independent_review_of_selected_pair_and_fresh_rpc_nonce_gas_fee_binding_before_any_signing",
    }),
  });
}
