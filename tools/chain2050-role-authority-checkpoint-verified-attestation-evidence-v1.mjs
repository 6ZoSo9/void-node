#!/usr/bin/env node
import crypto from "node:crypto";

export const MARKER =
  "VOID_CHAIN2050_ROLE_AUTHORITY_CHECKPOINT_VERIFIED_ATTESTATION_EVIDENCE_V1";

export const EXPECTED = Object.freeze({
  evidence_id:
    "voidcracve1_db9f9f06c2de57efb90c82da6020cf71e11d9229316394a07941ffe167ea9bfd",
  authorization_id:
    "voidcracsa1_1a038fbf89eedf710f02024b2cd9f49bc12af719c00435197929942ffb55fde4",
  checkpoint_request_id:
    "voidcracpr1_c6ebb84ea0dace0e16ad310d7826b68acd62ee00fd0d7b0858a3317ae59319f6",
  checkpoint_attestation_id:
    "voidcraca1_25d9de92520f6e1f5d230bec8ea9fcbb0de1456e0a74c9bbfaf901eff688a414",
  request_file_sha256:
    "b04f9c072012fddf86d618656db38604f2e3df1f9568669dcad8f25f184aebb2",
  envelope_file_sha256:
    "411035b72fc0ac3f7caa3762693b8a16d5b27515cfadd506e5d74c73fe10848b",
  attestation_body_sha256:
    "8a715e70b2633656a1f2e611885670a617b9a47fd4431c90cc7640fa875462f8",
  signer_public_key_der_sha256:
    "23e2d92ebeb1d4b025eeb2a76f65b7f8ff6e6cc091f542e202569c9d5abbbd30",
  checkpoint_height: "37390",
  checkpoint_hash:
    "0x8cd677775b19867d4e52da25e775b23f6ec8dd2ec8e6d9be925f2d53a0547228",
  deployment_block_number: "37379",
  deployment_block_hash:
    "0x2c94849809fa4a6a0d4a4aa939a795d7eb5599ab5ec05d01cd3393ce5e2180cc",
  confirmation_count: "12",
});

function canonical(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  return "{" +
    Object.keys(value).sort()
      .map((key) => JSON.stringify(key) + ":" + canonical(value[key]))
      .join(",") +
    "}";
}

function sha256(value) {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function hold(reason) {
  throw new Error(reason);
}

export function verifyRoleAuthorityCheckpointVerifiedAttestationEvidenceV1(value) {
  if (
    !value ||
    value.marker !== MARKER ||
    value.version !== 1 ||
    value.status !== "operator_recognized_checkpoint_finality_verified" ||
    value.verified_attestation_evidence_id !== EXPECTED.evidence_id ||
    value.authorization_id !== EXPECTED.authorization_id ||
    value.checkpoint_request_id !== EXPECTED.checkpoint_request_id ||
    value.checkpoint_attestation_id !== EXPECTED.checkpoint_attestation_id ||
    value.request_file_sha256 !== EXPECTED.request_file_sha256 ||
    value.envelope_file_sha256 !== EXPECTED.envelope_file_sha256 ||
    value.attestation_body_sha256 !== EXPECTED.attestation_body_sha256 ||
    value.signer_public_key_der_sha256 !== EXPECTED.signer_public_key_der_sha256 ||
    value.checkpoint_height !== EXPECTED.checkpoint_height ||
    value.checkpoint_hash !== EXPECTED.checkpoint_hash ||
    value.deployment_block_number !== EXPECTED.deployment_block_number ||
    value.deployment_block_hash !== EXPECTED.deployment_block_hash ||
    value.confirmation_count !== EXPECTED.confirmation_count ||
    value.minimum_confirmations !== "12" ||
    value.checkpoint_ancestry_exact !== true ||
    value.signature_verified !== true ||
    value.operator_recognized_canonical_checkpoint_verified !== true ||
    value.chain_finality_verified_under_mainnet0_policy !== true ||
    value.protocol_consensus_finality_claimed !== false ||
    value.local_envelope_committed !== false ||
    value.historical_signature_count !== 1 ||
    value.authority?.evidence_verification_only !== true ||
    value.authority?.private_key_access_performed_by_this_evidence_gate !== false ||
    value.authority?.signing_performed_by_this_evidence_gate !== false ||
    value.authority?.transaction_signing_authorized !== false ||
    value.authority?.transaction_broadcast_authorized !== false ||
    value.authority?.chain2050_write_authorized !== false ||
    value.authority?.registry_append_authorized !== false ||
    value.authority?.funds_action_authorized !== false
  ) {
    hold("verified_checkpoint_attestation_evidence_binding_invalid");
  }

  const material = {
    authorization_id: value.authorization_id,
    checkpoint_request_id: value.checkpoint_request_id,
    checkpoint_attestation_id: value.checkpoint_attestation_id,
    request_file_sha256: value.request_file_sha256,
    envelope_file_sha256: value.envelope_file_sha256,
    attestation_body_sha256: value.attestation_body_sha256,
    signer_public_key_der_sha256: value.signer_public_key_der_sha256,
    checkpoint_height: value.checkpoint_height,
    checkpoint_hash: value.checkpoint_hash,
    confirmation_count: value.confirmation_count,
    operator_recognized_canonical_checkpoint_verified:
      value.operator_recognized_canonical_checkpoint_verified,
    protocol_consensus_finality_claimed:
      value.protocol_consensus_finality_claimed,
  };
  const expectedId = "voidcracve1_" + sha256(canonical(material));
  if (expectedId !== EXPECTED.evidence_id) {
    hold("verified_checkpoint_attestation_evidence_id_mismatch");
  }

  return Object.freeze({
    ok: true,
    marker: MARKER,
    verified_attestation_evidence_id: expectedId,
    checkpoint_attestation_id: value.checkpoint_attestation_id,
    envelope_file_sha256: value.envelope_file_sha256,
    signer_public_key_der_sha256: value.signer_public_key_der_sha256,
    checkpoint_height: value.checkpoint_height,
    checkpoint_hash: value.checkpoint_hash,
    confirmation_count: value.confirmation_count,
    checkpoint_ancestry_exact: true,
    signature_verified: true,
    operator_recognized_canonical_checkpoint_verified: true,
    chain_finality_verified_under_mainnet0_policy: true,
    protocol_consensus_finality_claimed: false,
    authority: Object.freeze({
      evidence_verification_only: true,
      private_key_access: false,
      signing: false,
      transaction_broadcast: false,
      chain2050_write: false,
      registry_append: false,
      funds_action: false,
    }),
    next_gate:
      "role_authority_registry_genesis_record_preparation_or_participant_role_authority_activation",
  });
}
