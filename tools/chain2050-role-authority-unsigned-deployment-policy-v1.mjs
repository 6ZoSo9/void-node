#!/usr/bin/env node
import crypto from "node:crypto";
import { Transaction, getAddress } from "ethers";
import {
  ACCEPTED_CREATION_BYTECODE_SHA256,
  ACCEPTED_EXPECTED_DEPLOYED_RUNTIME_SHA256,
  ACCEPTED_REVIEW_PACKET_SHA256,
  buildRoleAuthorityUnsignedDeploymentPreparationV1,
} from "./chain2050-role-authority-deployment-preparation-v1.mjs";

export const MARKER =
  "VOID_CHAIN2050_ROLE_AUTHORITY_UNSIGNED_DEPLOYMENT_POLICY_V1";

export const OWNER_ADDRESS =
  "0xe1f147b6b2671f140c4107fa4a1dd5f7cbd06d0b";
export const DEPLOYER_ADDRESS =
  "0x4d0a1149d13b03448c56ee6582d161159c5e537f";
export const PREDICTED_CONTRACT_ADDRESS =
  "0xe4e9a5a8e5ac3a99176fcf50ba986a374577de49";

export const GAS_LIMIT_MULTIPLIER_BPS = "12000";
export const MAX_FEE_PER_GAS_WEI = "3000000000";
export const MAX_PRIORITY_FEE_PER_GAS_WEI = "1000000000";

export const AUTHORITY_V1 = Object.freeze({
  source_only_policy: true,
  precision_observation_required: true,
  accepted_bytecode_required: true,
  exact_owner_deployer_pair_required: true,
  exact_pending_nonce_required: true,
  exact_deployment_data_required: true,
  exact_gas_estimate_required: true,
  bounded_fee_policy_required: true,
  unsigned_transaction_materialization: true,
  private_key_access: false,
  wallet_or_signer_access: false,
  rpc_call: false,
  signing: false,
  transaction_broadcast: false,
  deployment: false,
  chain2050_mutation: false,
  registry_append: false,
  service_action: false,
  production_activation: false,
  funds_action: false,
});

function fail(code) {
  throw new Error(code);
}

function canonical(value) {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return "[" + value.map(canonical).join(",") + "]";
  }
  return (
    "{" +
    Object.keys(value)
      .sort()
      .map((key) => JSON.stringify(key) + ":" + canonical(value[key]))
      .join(",") +
    "}"
  );
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function dec(raw, code) {
  const text = String(raw ?? "");
  if (!/^(0|[1-9][0-9]*)$/.test(text)) fail(code);
  return BigInt(text);
}

function addr(raw, code) {
  try {
    const value = getAddress(String(raw)).toLowerCase();
    if (!/^0x[0-9a-f]{40}$/.test(value)) fail(code);
    return value;
  } catch {
    fail(code);
  }
}

export function buildRoleAuthorityUnsignedDeploymentPolicyV1({
  observation,
  creation_bytecode,
} = {}) {
  if (
    !observation ||
    observation.marker !==
      "VOID_CHAIN2050_ROLE_AUTHORITY_DEPLOYMENT_RESOLUTION_PRECISION_V1" ||
    observation.decision !==
      "GREEN_READ_ONLY_DEPLOYMENT_RESOLUTION_READY_FOR_UNSIGNED_TX_POLICY"
  ) {
    fail("precision_observation_invalid");
  }

  if (
    observation.accepted_review_packet_sha256 !==
      ACCEPTED_REVIEW_PACKET_SHA256 ||
    observation.creation_bytecode_sha256 !==
      ACCEPTED_CREATION_BYTECODE_SHA256 ||
    observation.expected_deployed_runtime_sha256 !==
      ACCEPTED_EXPECTED_DEPLOYED_RUNTIME_SHA256
  ) {
    fail("accepted_identity_mismatch");
  }

  const owner = addr(observation.owner_address, "owner_invalid");
  const deployer = addr(observation.deployer_address, "deployer_invalid");
  const predicted = addr(
    observation.predicted_contract_address,
    "predicted_contract_invalid",
  );
  if (
    owner !== OWNER_ADDRESS ||
    deployer !== DEPLOYER_ADDRESS ||
    predicted !== PREDICTED_CONTRACT_ADDRESS ||
    observation.known_role_collision !== false ||
    observation.owner_deployer_separated !== true ||
    observation.predicted_contract_address_vacant !== true ||
    observation.pending_transactions_present !== false ||
    observation.pending_nonce_revalidated !== true ||
    observation.predicted_contract_code_revalidated !== true ||
    observation.observation_block_hash_revalidated !== true ||
    observation.offline_nonce_zero_prediction_exact_match !== true
  ) {
    fail("precision_pair_or_revalidation_mismatch");
  }

  if (
    String(observation.chain_id) !== "2050" ||
    String(observation.latest_nonce) !== "0" ||
    String(observation.pending_nonce) !== "0"
  ) {
    fail("precision_nonce_or_chain_mismatch");
  }

  const estimate = dec(
    observation.deployment_gas_estimate,
    "gas_estimate_invalid",
  );
  const proposedGas = dec(
    observation.proposed_gas_limit_120pct,
    "proposed_gas_limit_invalid",
  );
  const expectedGas =
    (estimate * BigInt(GAS_LIMIT_MULTIPLIER_BPS) + 9999n) / 10000n;
  if (proposedGas !== expectedGas) {
    fail("gas_limit_multiplier_binding_mismatch");
  }

  const baseFee = dec(
    observation.base_fee_per_gas_wei,
    "base_fee_invalid",
  );
  const observedPriority = dec(
    observation.observed_priority_fee_per_gas_wei,
    "observed_priority_invalid",
  );
  const maxFee = BigInt(MAX_FEE_PER_GAS_WEI);
  const maxPriority = BigInt(MAX_PRIORITY_FEE_PER_GAS_WEI);
  const observedFeeNeed = baseFee * 2n + observedPriority;
  if (
    observedPriority > maxPriority ||
    observedFeeNeed > maxFee
  ) {
    fail("fee_envelope_insufficient_for_observation");
  }

  const prepared =
    buildRoleAuthorityUnsignedDeploymentPreparationV1({
      accepted_review_packet_sha256:
        ACCEPTED_REVIEW_PACKET_SHA256,
      owner_address: owner,
      deployer_address: deployer,
      creation_bytecode,
      nonce: "0",
      gas_limit: proposedGas.toString(),
      max_fee_per_gas_wei: MAX_FEE_PER_GAS_WEI,
      max_priority_fee_per_gas_wei:
        MAX_PRIORITY_FEE_PER_GAS_WEI,
    });

  if (
    prepared.deployment_data.bytes !==
      Number(observation.deployment_data_bytes) ||
    prepared.deployment_data.sha256 !==
      observation.deployment_data_sha256 ||
    prepared.deployment_data.keccak256 !==
      observation.deployment_data_keccak256 ||
    prepared.deployment_data.predicted_contract_address !== predicted
  ) {
    fail("deployment_data_observation_mismatch");
  }

  const tx = Transaction.from({
    type: 2,
    chainId: 2050,
    nonce: 0,
    gasLimit: proposedGas,
    maxFeePerGas: maxFee,
    maxPriorityFeePerGas: maxPriority,
    to: null,
    value: 0,
    data: prepared.deployment_data.data,
  });

  if (tx.signature !== null) {
    fail("unsigned_transaction_unexpected_signature");
  }

  const balance = dec(
    observation.deployer_balance_wei,
    "deployer_balance_invalid",
  );
  const maximumGasCost = proposedGas * maxFee;
  const fundingDeficit =
    balance >= maximumGasCost
      ? 0n
      : maximumGasCost - balance;

  const candidate = {
    transaction_type: 2,
    chain_id: "2050",
    nonce: "0",
    from_address: deployer,
    to_address: null,
    value_wei: "0",
    gas_limit: proposedGas.toString(),
    max_fee_per_gas_wei: maxFee.toString(),
    max_priority_fee_per_gas_wei: maxPriority.toString(),
    data_sha256: prepared.deployment_data.sha256,
    data_keccak256: prepared.deployment_data.keccak256,
    predicted_contract_address: predicted,
    unsigned_serialized_transaction: tx.unsignedSerialized,
    unsigned_transaction_hash: tx.unsignedHash,
  };

  const candidateFingerprint = sha256(canonical(candidate));

  return Object.freeze({
    marker: MARKER,
    version: 1,
    status:
      fundingDeficit === 0n
        ? "HOLD_PENDING_FRESH_PRE_SIGN_REVALIDATION_AND_SEPARATE_SIGNING_AUTHORIZATION"
        : "HOLD_PENDING_DEPLOYER_GAS_FUNDING_FRESH_PRE_SIGN_REVALIDATION_AND_SEPARATE_SIGNING_AUTHORIZATION",
    accepted_review_packet_sha256:
      ACCEPTED_REVIEW_PACKET_SHA256,
    accepted_creation_bytecode_sha256:
      ACCEPTED_CREATION_BYTECODE_SHA256,
    expected_deployed_runtime_sha256:
      ACCEPTED_EXPECTED_DEPLOYED_RUNTIME_SHA256,
    precision_observation: Object.freeze({
      observed_repo_head: observation.observed_repo_head,
      observation_block_number:
        String(observation.observation_block_number),
      observation_block_hash:
        String(observation.observation_block_hash),
      base_fee_per_gas_wei: baseFee.toString(),
      observed_priority_fee_per_gas_wei:
        observedPriority.toString(),
      latest_nonce: "0",
      pending_nonce: "0",
      deployer_balance_wei: balance.toString(),
      gas_estimate: estimate.toString(),
      predicted_contract_address_vacant: true,
    }),
    fee_policy: Object.freeze({
      source:
        "existing_bounded_mainnet0_fee_envelope_reused_as_candidate_cap",
      max_fee_per_gas_wei: maxFee.toString(),
      max_priority_fee_per_gas_wei: maxPriority.toString(),
      observed_two_x_base_plus_priority_wei:
        observedFeeNeed.toString(),
      current_observation_within_caps: true,
      fee_policy_signing_authorized: false,
    }),
    unsigned_transaction_candidate: Object.freeze(candidate),
    unsigned_transaction_candidate_fingerprint_sha256:
      candidateFingerprint,
    funding_requirement: Object.freeze({
      current_deployer_balance_wei: balance.toString(),
      maximum_gas_cost_wei: maximumGasCost.toString(),
      minimum_additional_funding_wei:
        fundingDeficit.toString(),
      funding_required: fundingDeficit > 0n,
      funding_authorized: false,
      funding_performed: false,
    }),
    authority: AUTHORITY_V1,
    decision: Object.freeze({
      unsigned_transaction_candidate_materialized: true,
      deployer_funding_satisfied: fundingDeficit === 0n,
      fresh_pre_sign_revalidation_required: true,
      signing_authorized: false,
      transaction_broadcast_authorized: false,
      deployment_authorized: false,
      registry_append_authorized: false,
      production_activation_authorized: false,
      funds_action_authorized: false,
      next_gate:
        fundingDeficit === 0n
          ? "fresh_read_only_pre_sign_revalidation_then_explicit_sovereign_single_transaction_signing_authorization"
          : "separate_deployer_gas_funding_authorization_then_fresh_read_only_pre_sign_revalidation",
    }),
  });
}
