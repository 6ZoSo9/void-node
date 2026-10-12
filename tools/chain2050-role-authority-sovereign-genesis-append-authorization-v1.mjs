#!/usr/bin/env node
import crypto from "node:crypto";

export const MARKER =
  "VOID_CHAIN2050_ROLE_AUTHORITY_SOVEREIGN_GENESIS_APPEND_AUTHORIZATION_V1";

const EXPECTED = Object.freeze({
  authorization_id: "voidcrasgaa1_fb46e3048b5921da3856de4548823b61f32e64f423bf5e7fd4758b9e04e27355",
  request_id: "voidcrasgar1_e97b68fcbb085aec3b0e502d4e00b5e662d3a13374a87cbe51e0a8a687e27481",
  evidence_id: "voidcrasgare1_1bb67737a3af758f1be51474ddced95c6b366b3b5e7ee04994841021238c804d",
  owner: "0xe1f147b6b2671f140c4107fa4a1dd5f7cbd06d0b",
  registry: "0xe4e9a5a8e5ac3a99176fcf50ba986a374577de49",
  nonce: "0",
  unsigned_hash: "0x568f531f93d6949adc0767cf4384a279b471edb389e18268511182ca6c51de34",
  max_gas_liability: "445751006240514",
  role_record: "1492c4d55f5c6d4873a28ca08d641196ba51d9e5c0a7c1cc31f27bf1a6405b0b",
  predicted_root: "54619d93d1f94746cb92c3bb4de038d014d5c90b73789581486b4a12b4322041"
});

function canonical(v) {
  if (v === null || typeof v !== "object") return JSON.stringify(v);
  if (Array.isArray(v)) return "[" + v.map(canonical).join(",") + "]";
  return "{" + Object.keys(v).sort().map(k => JSON.stringify(k)+":"+canonical(v[k])).join(",") + "}";
}
function sha256(v) {
  return crypto.createHash("sha256").update(v, "utf8").digest("hex");
}
function fail(reason) { throw new Error(reason); }

export function verifySovereignGenesisAppendAuthorizationV1(v) {
  if (
    !v ||
    v.marker !== MARKER ||
    v.version !== 1 ||
    v.status !== "authorized_exact_single_sovereign_genesis_registry_append" ||
    v.authorization_id !== EXPECTED.authorization_id ||
    v.authorization_source !== "interactive_sovereign_authorization" ||
    v.append_request_id !== EXPECTED.request_id ||
    v.append_request_evidence_id !== EXPECTED.evidence_id ||
    v.chain_id !== "2050" ||
    v.owner_address !== EXPECTED.owner ||
    v.registry_address !== EXPECTED.registry ||
    v.nonce !== EXPECTED.nonce ||
    v.unsigned_transaction_hash !== EXPECTED.unsigned_hash ||
    v.maximum_gas_liability_wei !== EXPECTED.max_gas_liability ||
    v.candidate?.identity_id !== "sovereign.zoso" ||
    v.candidate?.role !== "SOVEREIGN" ||
    v.candidate?.role_record_sha256 !== EXPECTED.role_record ||
    v.candidate?.predicted_registry_root_sha256 !== EXPECTED.predicted_root ||
    v.authorization?.owner_private_key_access_authorized !== true ||
    v.authorization?.transaction_signing_authorized !== true ||
    v.authorization?.transaction_broadcast_authorized !== true ||
    v.authorization?.chain2050_write_authorized !== true ||
    v.authorization?.registry_append_authorized !== true ||
    v.authorization?.gas_spend_authorized !== true ||
    v.authorization?.value_transfer_authorized !== false ||
    v.authorization?.unrelated_chain2050_mutation_authorized !== false ||
    v.authorization?.unrelated_registry_append_authorized !== false ||
    v.authorization?.maximum_submission_attempts !== 1 ||
    v.authorization?.automatic_retry !== false ||
    v.authorization?.replacement_transaction_authorized !== false ||
    v.required_execution?.exact_owner_key_address_match_required !== true ||
    v.required_execution?.fresh_exact_transaction_revalidation_required !== true ||
    v.required_execution?.fresh_empty_registry_state_required !== true ||
    v.required_execution?.fresh_nonce_zero_required !== true ||
    v.required_execution?.fresh_fee_envelope_validity_required !== true ||
    v.required_execution?.single_use_consumption_required_before_send !== true ||
    v.required_execution?.post_send_receipt_reconciliation_required !== true ||
    v.required_execution?.post_send_registry_state_verification_required !== true
  ) fail("sovereign_genesis_append_authorization_binding_invalid");

  const material = {
    append_request_id: v.append_request_id,
    append_request_evidence_id: v.append_request_evidence_id,
    owner: v.owner_address,
    contract: v.registry_address,
    nonce: v.nonce,
    unsigned_transaction_hash: v.unsigned_transaction_hash,
    maximum_gas_liability_wei: v.maximum_gas_liability_wei,
    role_record_sha256: v.candidate.role_record_sha256,
    predicted_registry_root_sha256: v.candidate.predicted_registry_root_sha256,
    maximum_submission_attempts: v.authorization.maximum_submission_attempts,
    automatic_retry: v.authorization.automatic_retry,
    replacement_transaction_authorized:
      v.authorization.replacement_transaction_authorized
  };
  const id = "voidcrasgaa1_" + sha256(canonical(material));
  if (id !== EXPECTED.authorization_id) {
    fail("sovereign_genesis_append_authorization_id_mismatch");
  }

  return Object.freeze({
    ok: true,
    authorization_id: id,
    append_request_id: v.append_request_id,
    unsigned_transaction_hash: v.unsigned_transaction_hash,
    owner_address: v.owner_address,
    registry_address: v.registry_address,
    role_record_sha256: v.candidate.role_record_sha256,
    predicted_registry_root_sha256: v.candidate.predicted_registry_root_sha256,
    maximum_submission_attempts: 1,
    automatic_retry: false
  });
}
