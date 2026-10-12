#!/usr/bin/env node
import crypto from "node:crypto";

export const MARKER =
  "VOID_CHAIN2050_ROLE_AUTHORITY_EXACT_SIGNING_REQUEST_V1";

export const AUTHORITY_V1 = Object.freeze({
  source_only_request: true,
  exact_unsigned_transaction_hash_required: true,
  exact_candidate_fingerprint_required: true,
  fresh_pre_sign_revalidation_required: true,
  confirmed_funding_receipt_required: true,
  exact_deployer_required: true,
  exact_nonce_required: true,
  exact_chain_id_required: true,
  exact_fee_envelope_required: true,
  exact_predicted_contract_required: true,
  private_key_access: false,
  wallet_or_signer_access: false,
  rpc_call: false,
  signing: false,
  raw_signed_transaction: false,
  transaction_broadcast: false,
  deployment: false,
  chain2050_mutation: false,
  registry_append: false,
  production_activation: false,
  funds_action: false,
});

const EXPECTED = Object.freeze({
  chain_id: "2050",
  owner_address:
    "0xe1f147b6b2671f140c4107fa4a1dd5f7cbd06d0b",
  deployer_address:
    "0x4d0a1149d13b03448c56ee6582d161159c5e537f",
  nonce: "0",
  predicted_contract_address:
    "0xe4e9a5a8e5ac3a99176fcf50ba986a374577de49",
  gas_limit: "2402981",
  max_fee_per_gas_wei: "3000000000",
  max_priority_fee_per_gas_wei: "1000000000",
  deployment_data_sha256:
    "1f6f97cabc21b54875f1b181b27153be75ee261a6bc5d77ff30c993187fab068",
  deployment_data_keccak256:
    "0xa0a33788745d22d83b2cbf0058912abe19d8cc34d2403252fd4c95cf3b5786f6",
  unsigned_transaction_hash:
    "0xc5982072b34a49c3f8ead20cd8e358e8711a620f91ff4aeae0e9a7072d600f25",
  candidate_fingerprint_sha256:
    "a67c90c030cc3a728ca611b620fe4ae8598a47284b2ca69238717583062c6c42",
  funding_transaction_hash:
    "0x5ac002fc33cbb02500b4be35aa875a4676848cf01892f3944c60fc58ec81002a",
  funding_value_wei: "7208943000000000",
  funding_block_number: "37378",
  observation_block_number: "37378",
  observation_block_hash:
    "0xe8297a85593f8d0787b1a34969dfac7a8f1593b0f5218f6cec429f02a41d7e7b",
});

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
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function fail(code) {
  throw new Error(code);
}

export function buildRoleAuthorityExactSigningRequestV1(
  evidence,
) {
  if (
    !evidence ||
    evidence.marker !==
      "VOID_ROLE_AUTHORITY_FRESH_PRE_SIGN_REVALIDATION_PRECISION_V1" ||
    evidence.decision !==
      "GREEN_FRESH_PRE_SIGN_REVALIDATION_READY_FOR_EXPLICIT_SIGNING_AUTHORIZATION"
  ) {
    fail("fresh_pre_sign_evidence_invalid");
  }

  const exactChecks = [
    [String(evidence.chain_id), EXPECTED.chain_id],
    [String(evidence.owner_address).toLowerCase(), EXPECTED.owner_address],
    [String(evidence.deployer_address).toLowerCase(), EXPECTED.deployer_address],
    [String(evidence.pending_nonce), EXPECTED.nonce],
    [String(evidence.latest_nonce), EXPECTED.nonce],
    [String(evidence.predicted_contract_address).toLowerCase(), EXPECTED.predicted_contract_address],
    [String(evidence.proposed_gas_limit_120pct), EXPECTED.gas_limit],
    [String(evidence.max_fee_per_gas_wei), EXPECTED.max_fee_per_gas_wei],
    [String(evidence.max_priority_fee_per_gas_wei), EXPECTED.max_priority_fee_per_gas_wei],
    [String(evidence.deployment_data_sha256), EXPECTED.deployment_data_sha256],
    [String(evidence.deployment_data_keccak256).toLowerCase(), EXPECTED.deployment_data_keccak256],
    [String(evidence.unsigned_transaction_hash).toLowerCase(), EXPECTED.unsigned_transaction_hash],
    [String(evidence.candidate_fingerprint_sha256), EXPECTED.candidate_fingerprint_sha256],
    [String(evidence.funding_transaction_hash).toLowerCase(), EXPECTED.funding_transaction_hash],
    [String(evidence.funding_value_wei), EXPECTED.funding_value_wei],
    [String(evidence.funding_block_number), EXPECTED.funding_block_number],
    [String(evidence.observation_block_number), EXPECTED.observation_block_number],
    [String(evidence.observation_block_hash).toLowerCase(), EXPECTED.observation_block_hash],
  ];

  for (const [actual, expected] of exactChecks) {
    if (actual !== expected) {
      fail("fresh_pre_sign_exact_binding_mismatch");
    }
  }

  if (
    evidence.funding_receipt_status !== "1" ||
    evidence.predicted_contract_address_vacant !== true ||
    evidence.deployer_balance_sufficient !== true ||
    evidence.pending_nonce_revalidated !== true ||
    evidence.predicted_contract_code_revalidated !== true ||
    evidence.observation_block_hash_revalidated !== true ||
    String(evidence.deployer_balance_wei) !== EXPECTED.funding_value_wei
  ) {
    fail("fresh_pre_sign_required_fact_missing");
  }

  const transactionSummary = Object.freeze({
    transaction_type: 2,
    chain_id: "2050",
    nonce: "0",
    from_address: EXPECTED.deployer_address,
    to_address: null,
    value_wei: "0",
    gas_limit: EXPECTED.gas_limit,
    max_fee_per_gas_wei: EXPECTED.max_fee_per_gas_wei,
    max_priority_fee_per_gas_wei:
      EXPECTED.max_priority_fee_per_gas_wei,
    deployment_data_sha256:
      EXPECTED.deployment_data_sha256,
    deployment_data_keccak256:
      EXPECTED.deployment_data_keccak256,
    predicted_contract_address:
      EXPECTED.predicted_contract_address,
    unsigned_transaction_hash:
      EXPECTED.unsigned_transaction_hash,
    candidate_fingerprint_sha256:
      EXPECTED.candidate_fingerprint_sha256,
  });

  const requestBody = {
    schema:
      "void.chain2050-role-authority-exact-signing-request.v1",
    chain_id: "2050",
    signer_role: "deployment_only",
    signer_address:
      EXPECTED.deployer_address,
    owner_address:
      EXPECTED.owner_address,
    transaction_summary:
      transactionSummary,
    funding_evidence: {
      transaction_hash:
        EXPECTED.funding_transaction_hash,
      value_wei:
        EXPECTED.funding_value_wei,
      block_number:
        EXPECTED.funding_block_number,
    },
    fresh_pre_sign_observation: {
      block_number:
        EXPECTED.observation_block_number,
      block_hash:
        EXPECTED.observation_block_hash,
      pending_nonce: "0",
      predicted_contract_address_vacant:
        true,
      deployer_balance_sufficient:
        true,
    },
    authority_boundary: {
      signing_authorized: false,
      transaction_broadcast_authorized: false,
      deployment_authorized: false,
      registry_append_authorized: false,
      production_activation_authorized: false,
      funds_action_authorized: false,
    },
    required_authorization:
      "explicit_sovereign_authorization_for_exact_unsigned_transaction_hash",
  };

  const signingRequestId =
    "voidcrasr1_" +
    sha256(canonical(requestBody));

  return Object.freeze({
    marker: MARKER,
    version: 1,
    status:
      "HOLD_PENDING_EXPLICIT_SOVEREIGN_SINGLE_TRANSACTION_SIGNING_AUTHORIZATION",
    signing_request_id:
      signingRequestId,
    ...requestBody,
    authority:
      AUTHORITY_V1,
    next_gate:
      "explicit_sovereign_authorization_of_exact_unsigned_transaction_hash_then_offline_nimo_signing",
  });
}
