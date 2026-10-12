#!/usr/bin/env node
import crypto from "node:crypto";

export const MARKER =
  "VOID_CHAIN2050_ROLE_AUTHORITY_FRESH_PREBROADCAST_EVIDENCE_V1";

export const EXPECTED = Object.freeze({
  evidence_marker:
    "VOID_ROLE_AUTHORITY_FRESH_PREBROADCAST_PRECISION_V1",
  source_evidence_pr: 1723,
  source_evidence_head:
    "3d29df8567393a2749e5ae322594ebf45d57a25b",
  source_evidence_merge:
    "6117e62e24c7eff35a9c0108a1a458f6225f4954",
  executed_verifier_sha256:
    "9e7181cedf74e290767ab0c77413bc91bfd16b8990e770a99928838a8b6011a4",
  signed_transaction_file_sha256:
    "96b5d004284e511c12b40f2de627c9a214656e025883b8cd7adec1b82348334d",
  signing_request_id:
    "voidcrasr1_2eef907499d684facb777d42c754e23207a02c646dd5e55923e0e0204eeadf2a",
  signing_authorization_id:
    "voidcrasta1_e036437731cfe4bea160f3de3542fd60d6809d0ca773128a01f2bdd0bbc88d20",
  signer_address:
    "0x4d0a1149d13b03448c56ee6582d161159c5e537f",
  unsigned_transaction_hash:
    "0xc5982072b34a49c3f8ead20cd8e358e8711a620f91ff4aeae0e9a7072d600f25",
  signed_transaction_hash:
    "0x8da8cc5a8e126158bdc0e003c5521699939d95a26a72a933969cf6de15d88dd4",
  chain_id: "2050",
  observation_block_number: "37378",
  observation_block_hash:
    "0xe8297a85593f8d0787b1a34969dfac7a8f1593b0f5218f6cec429f02a41d7e7b",
  deployer_balance_wei: "7208943000000000",
  predicted_contract_address:
    "0xe4e9a5a8e5ac3a99176fcf50ba986a374577de49",
  deployment_gas_estimate: "2002484",
  signed_gas_limit: "2402981",
  base_fee_per_gas_wei: "7",
  observed_priority_fee_per_gas_wei: "1000000000",
  observed_two_x_base_plus_priority_wei: "1000000014",
  signed_max_fee_per_gas_wei: "3000000000",
  signed_max_priority_fee_per_gas_wei: "1000000000",
  decision:
    "GREEN_FRESH_PREBROADCAST_REVALIDATION_HELD_FOR_EXPLICIT_SINGLE_TRANSACTION_BROADCAST_AUTHORIZATION",
  observation_id:
    "voidcrapb1_fb84f2385f9f80c8cf2b5ff9aae2adea835e72c663228b5ddebca4f8ad3f91e2",
});

export const AUTHORITY_V1 = Object.freeze({
  source_evidence_only: true,
  raw_signed_transaction_committed: false,
  rpc_call: false,
  filesystem_secret_read: false,
  private_key_access: false,
  wallet_or_signer_access: false,
  transaction_signing: false,
  transaction_broadcast: false,
  deployment: false,
  chain2050_mutation: false,
  funds_action: false,
  automatic_retry: false,
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

export function verifyRoleAuthorityFreshPrebroadcastEvidenceV1(evidence) {
  if (
    !evidence ||
    evidence.marker !== EXPECTED.evidence_marker ||
    evidence.version !== 1 ||
    evidence.decision !== EXPECTED.decision
  ) {
    fail("fresh_prebroadcast_evidence_shape_invalid");
  }

  const exact = [
    [evidence.source_evidence_pr, EXPECTED.source_evidence_pr],
    [evidence.source_evidence_head, EXPECTED.source_evidence_head],
    [evidence.source_evidence_merge, EXPECTED.source_evidence_merge],
    [evidence.executed_verifier_sha256, EXPECTED.executed_verifier_sha256],
    [evidence.signed_transaction_file_sha256, EXPECTED.signed_transaction_file_sha256],
    [evidence.signing_request_id, EXPECTED.signing_request_id],
    [evidence.signing_authorization_id, EXPECTED.signing_authorization_id],
    [String(evidence.signer_address).toLowerCase(), EXPECTED.signer_address],
    [String(evidence.unsigned_transaction_hash).toLowerCase(), EXPECTED.unsigned_transaction_hash],
    [String(evidence.signed_transaction_hash).toLowerCase(), EXPECTED.signed_transaction_hash],
    [String(evidence.chain_id), EXPECTED.chain_id],
    [String(evidence.observation_block_number), EXPECTED.observation_block_number],
    [String(evidence.observation_block_hash).toLowerCase(), EXPECTED.observation_block_hash],
    [String(evidence.deployer_balance_wei), EXPECTED.deployer_balance_wei],
    [String(evidence.predicted_contract_address).toLowerCase(), EXPECTED.predicted_contract_address],
    [String(evidence.deployment_gas_estimate), EXPECTED.deployment_gas_estimate],
    [String(evidence.signed_gas_limit), EXPECTED.signed_gas_limit],
    [String(evidence.signed_max_fee_per_gas_wei), EXPECTED.signed_max_fee_per_gas_wei],
    [String(evidence.signed_max_priority_fee_per_gas_wei), EXPECTED.signed_max_priority_fee_per_gas_wei],
  ];
  for (const [actual, expected] of exact) {
    if (actual !== expected) {
      fail("fresh_prebroadcast_exact_binding_mismatch");
    }
  }

  if (
    String(evidence.latest_nonce) !== "0" ||
    String(evidence.pending_nonce) !== "0" ||
    evidence.pending_transactions_present !== false ||
    evidence.predicted_contract_address_vacant !== true ||
    evidence.signed_transaction_seen_by_hash !== false ||
    evidence.signed_transaction_receipt_seen !== false
  ) {
    fail("fresh_prebroadcast_chain_state_invalid");
  }

  if (
    BigInt(evidence.deployment_gas_estimate) >
      BigInt(evidence.signed_gas_limit) ||
    BigInt(evidence.observed_priority_fee_per_gas_wei) >
      BigInt(evidence.signed_max_priority_fee_per_gas_wei) ||
    BigInt(evidence.observed_two_x_base_plus_priority_wei) >
      BigInt(evidence.signed_max_fee_per_gas_wei)
  ) {
    fail("fresh_prebroadcast_signed_envelope_invalid");
  }

  const authority = evidence.authority;
  if (
    !authority ||
    authority.loopback_rpc_only !== true ||
    authority.filesystem_read_signed_transaction !== true ||
    authority.filesystem_write !== false ||
    authority.private_key_access !== false ||
    authority.wallet_or_signer_access !== false ||
    authority.transaction_signing !== false ||
    authority.transaction_broadcast !== false ||
    authority.deployment !== false ||
    authority.chain2050_mutation !== false ||
    authority.funds_action !== false ||
    authority.automatic_retry !== false
  ) {
    fail("fresh_prebroadcast_authority_boundary_invalid");
  }

  const normalized = {
    executed_verifier_sha256: EXPECTED.executed_verifier_sha256,
    source_evidence_pr: EXPECTED.source_evidence_pr,
    source_evidence_head: EXPECTED.source_evidence_head,
    source_evidence_merge: EXPECTED.source_evidence_merge,
    signing_request_id: EXPECTED.signing_request_id,
    signing_authorization_id: EXPECTED.signing_authorization_id,
    signer_address: EXPECTED.signer_address,
    unsigned_transaction_hash: EXPECTED.unsigned_transaction_hash,
    signed_transaction_hash: EXPECTED.signed_transaction_hash,
    signed_transaction_file_sha256: EXPECTED.signed_transaction_file_sha256,
    chain_id: EXPECTED.chain_id,
    observation_block_number: EXPECTED.observation_block_number,
    observation_block_hash: EXPECTED.observation_block_hash,
    latest_nonce: "0",
    pending_nonce: "0",
    pending_transactions_present: false,
    deployer_balance_wei: EXPECTED.deployer_balance_wei,
    predicted_contract_address: EXPECTED.predicted_contract_address,
    predicted_contract_address_vacant: true,
    deployment_gas_estimate: EXPECTED.deployment_gas_estimate,
    signed_gas_limit: EXPECTED.signed_gas_limit,
    base_fee_per_gas_wei:
      String(evidence.base_fee_per_gas_wei),
    observed_priority_fee_per_gas_wei:
      String(evidence.observed_priority_fee_per_gas_wei),
    observed_two_x_base_plus_priority_wei:
      String(evidence.observed_two_x_base_plus_priority_wei),
    signed_max_fee_per_gas_wei:
      EXPECTED.signed_max_fee_per_gas_wei,
    signed_max_priority_fee_per_gas_wei:
      EXPECTED.signed_max_priority_fee_per_gas_wei,
    signed_transaction_seen_by_hash: false,
    signed_transaction_receipt_seen: false,
  };

  const id =
    "voidcrapb1_" + sha256(canonical(normalized));
  if (id !== EXPECTED.observation_id) {
    fail("fresh_prebroadcast_observation_id_mismatch");
  }

  return Object.freeze({
    ok: true,
    marker: MARKER,
    prebroadcast_observation_id: id,
    ...normalized,
    authority: AUTHORITY_V1,
    decision:
      "HOLD_PENDING_EXPLICIT_SINGLE_TRANSACTION_BROADCAST_AUTHORIZATION",
    next_gate:
      "explicit_sovereign_authorization_for_exact_broadcast_request",
  });
}
