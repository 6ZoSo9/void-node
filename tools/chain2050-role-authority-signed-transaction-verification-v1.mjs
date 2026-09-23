#!/usr/bin/env node
import crypto from "node:crypto";

export const MARKER =
  "VOID_CHAIN2050_ROLE_AUTHORITY_SIGNED_TRANSACTION_VERIFICATION_V1";

export const EXPECTED = Object.freeze({
  evidence_marker:
    "VOID_ROLE_AUTHORITY_SIGNED_TRANSACTION_PRECISION_VERIFY_V1",
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
  signed_transaction_file_sha256:
    "96b5d004284e511c12b40f2de627c9a214656e025883b8cd7adec1b82348334d",
  chain_id: "2050",
  nonce: "0",
  value_wei: "0",
  gas_limit: "2402981",
  max_fee_per_gas_wei: "3000000000",
  max_priority_fee_per_gas_wei: "1000000000",
  deployment_data_sha256:
    "1f6f97cabc21b54875f1b181b27153be75ee261a6bc5d77ff30c993187fab068",
  deployment_data_keccak256:
    "0xa0a33788745d22d83b2cbf0058912abe19d8cc34d2403252fd4c95cf3b5786f6",
  predicted_contract_address:
    "0xe4e9a5a8e5ac3a99176fcf50ba986a374577de49",
  decision:
    "GREEN_SIGNED_TRANSACTION_EXACTLY_VERIFIED_HELD_FOR_FRESH_PRE_BROADCAST_REVALIDATION",
});

export const AUTHORITY_V1 = Object.freeze({
  source_evidence_only: true,
  exact_signed_transaction_hash_required: true,
  exact_signed_transaction_file_sha256_required: true,
  exact_signer_recovery_required: true,
  signing_request_lineage_required: true,
  signing_authorization_lineage_required: true,
  raw_signed_transaction_committed: false,
  raw_signed_transaction_access: false,
  rpc_call: false,
  private_key_access: false,
  wallet_or_signer_access: false,
  transaction_signing: false,
  transaction_broadcast: false,
  deployment: false,
  chain2050_mutation: false,
  funds_action: false,
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

export function verifyRoleAuthoritySignedTransactionEvidenceV1(evidence) {
  if (
    !evidence ||
    evidence.marker !== EXPECTED.evidence_marker ||
    evidence.version !== 1 ||
    evidence.decision !== EXPECTED.decision
  ) {
    fail("signed_transaction_evidence_shape_invalid");
  }

  const exact = [
    [evidence.signing_request_id, EXPECTED.signing_request_id],
    [evidence.signing_authorization_id, EXPECTED.signing_authorization_id],
    [String(evidence.signer_address).toLowerCase(), EXPECTED.signer_address],
    [String(evidence.unsigned_transaction_hash).toLowerCase(), EXPECTED.unsigned_transaction_hash],
    [String(evidence.signed_transaction_hash).toLowerCase(), EXPECTED.signed_transaction_hash],
    [String(evidence.signed_transaction_file_sha256).toLowerCase(), EXPECTED.signed_transaction_file_sha256],
    [String(evidence.chain_id), EXPECTED.chain_id],
    [String(evidence.nonce), EXPECTED.nonce],
    [String(evidence.value_wei), EXPECTED.value_wei],
    [String(evidence.gas_limit), EXPECTED.gas_limit],
    [String(evidence.max_fee_per_gas_wei), EXPECTED.max_fee_per_gas_wei],
    [String(evidence.max_priority_fee_per_gas_wei), EXPECTED.max_priority_fee_per_gas_wei],
    [String(evidence.deployment_data_sha256).toLowerCase(), EXPECTED.deployment_data_sha256],
    [String(evidence.deployment_data_keccak256).toLowerCase(), EXPECTED.deployment_data_keccak256],
    [String(evidence.predicted_contract_address).toLowerCase(), EXPECTED.predicted_contract_address],
  ];
  for (const [actual, expected] of exact) {
    if (actual !== expected) {
      fail("signed_transaction_exact_binding_mismatch");
    }
  }

  if (
    evidence.to_address !== null ||
    evidence.signature_recovery_exact !== true ||
    evidence.receipt_binding_exact !== true ||
    evidence.raw_signed_transaction_committed !== false ||
    evidence.rpc_call !== false ||
    evidence.private_key_access !== false ||
    evidence.wallet_or_signer_access !== false ||
    evidence.transaction_signing !== false ||
    evidence.transaction_broadcast !== false ||
    evidence.deployment !== false ||
    evidence.chain2050_mutation !== false ||
    evidence.funds_action !== false
  ) {
    fail("signed_transaction_authority_or_verification_boundary_invalid");
  }

  const normalized = {
    signing_request_id: EXPECTED.signing_request_id,
    signing_authorization_id: EXPECTED.signing_authorization_id,
    signer_address: EXPECTED.signer_address,
    unsigned_transaction_hash: EXPECTED.unsigned_transaction_hash,
    signed_transaction_hash: EXPECTED.signed_transaction_hash,
    signed_transaction_file_sha256: EXPECTED.signed_transaction_file_sha256,
    chain_id: EXPECTED.chain_id,
    nonce: EXPECTED.nonce,
    predicted_contract_address: EXPECTED.predicted_contract_address,
    deployment_data_sha256: EXPECTED.deployment_data_sha256,
    signature_recovery_exact: true,
    receipt_binding_exact: true,
    raw_signed_transaction_committed: false,
  };

  return Object.freeze({
    ok: true,
    marker: MARKER,
    verification_id:
      "voidcrastv1_" + sha256(canonical(normalized)),
    ...normalized,
    authority: AUTHORITY_V1,
    decision:
      "HOLD_PENDING_FRESH_PRECISION_PRE_BROADCAST_REVALIDATION",
    next_gate:
      "fresh_precision_pre_broadcast_chain_state_revalidation_v1",
  });
}
