#!/usr/bin/env node
import crypto from "node:crypto";

export const MARKER =
  "VOID_CHAIN2050_ROLE_AUTHORITY_CHECKPOINT_SIGNING_AUTHORIZATION_V1";

export const EXPECTED = Object.freeze({
  authorization_id:
    "voidcracsa1_1a038fbf89eedf710f02024b2cd9f49bc12af719c00435197929942ffb55fde4",
  scope:
    "chain2050_role_authority_checkpoint_attestation_signature_v1",
  checkpoint_request_id:
    "voidcracpr1_c6ebb84ea0dace0e16ad310d7826b68acd62ee00fd0d7b0858a3317ae59319f6",
  attestation_body_sha256:
    "8a715e70b2633656a1f2e611885670a617b9a47fd4431c90cc7640fa875462f8",
  request_file_sha256:
    "b04f9c072012fddf86d618656db38604f2e3df1f9568669dcad8f25f184aebb2",
  signer_public_key_der_sha256:
    "23e2d92ebeb1d4b025eeb2a76f65b7f8ff6e6cc091f542e202569c9d5abbbd30",
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

export function verifyRoleAuthorityCheckpointSigningAuthorizationV1(value) {
  if (
    !value ||
    value.marker !== MARKER ||
    value.version !== 1 ||
    value.authorization_id !== EXPECTED.authorization_id ||
    value.scope !== EXPECTED.scope ||
    value.checkpoint_request_id !== EXPECTED.checkpoint_request_id ||
    value.attestation_body_sha256 !== EXPECTED.attestation_body_sha256 ||
    value.request_file_sha256 !== EXPECTED.request_file_sha256 ||
    value.signer_role !== "sovereign_primary_governance_attestation" ||
    value.signer_public_key_der_sha256 !== EXPECTED.signer_public_key_der_sha256 ||
    value.signature_algorithm !== "Ed25519" ||
    value.signature_count_max !== 1 ||
    value.sovereign_private_key_access_authorized !== true ||
    value.signature_creation_authorized !== true ||
    value.detached_attestation_only !== true ||
    value.transaction_broadcast_authorized !== false ||
    value.chain2050_write_authorized !== false ||
    value.registry_append_authorized !== false ||
    value.funds_action_authorized !== false ||
    value.wallet_transaction_signing_authorized !== false ||
    value.automatic_retry_authorized !== false ||
    value.authority_basis !==
      "explicit_sovereign_continue_after_exact_checkpoint_signature_scope_presented"
  ) {
    hold("checkpoint_signing_authorization_binding_invalid");
  }

  const material = {
    scope: value.scope,
    checkpoint_request_id: value.checkpoint_request_id,
    attestation_body_sha256: value.attestation_body_sha256,
    request_file_sha256: value.request_file_sha256,
    signer_public_key_der_sha256: value.signer_public_key_der_sha256,
    signature_algorithm: value.signature_algorithm,
    signature_count_max: value.signature_count_max,
    transaction_broadcast: value.transaction_broadcast_authorized,
    chain2050_write: value.chain2050_write_authorized,
    funds_action: value.funds_action_authorized,
  };
  const expectedId = "voidcracsa1_" + sha256(canonical(material));
  if (expectedId !== value.authorization_id) {
    hold("checkpoint_signing_authorization_id_mismatch");
  }

  return Object.freeze({
    ok: true,
    marker: MARKER,
    authorization_id: value.authorization_id,
    checkpoint_request_id: value.checkpoint_request_id,
    attestation_body_sha256: value.attestation_body_sha256,
    request_file_sha256: value.request_file_sha256,
    signer_public_key_der_sha256: value.signer_public_key_der_sha256,
    signature_count_max: 1,
    sovereign_private_key_access_authorized: true,
    signature_creation_authorized: true,
    transaction_broadcast_authorized: false,
    chain2050_write_authorized: false,
    registry_append_authorized: false,
    funds_action_authorized: false,
    next_gate:
      "offline_sovereign_primary_exact_checkpoint_attestation_signature_v1",
  });
}
