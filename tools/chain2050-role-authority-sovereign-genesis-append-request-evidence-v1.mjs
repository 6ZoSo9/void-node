#!/usr/bin/env node
import crypto from "node:crypto";

export const MARKER =
  "VOID_CHAIN2050_ROLE_AUTHORITY_SOVEREIGN_GENESIS_APPEND_REQUEST_EVIDENCE_V1";

const EXPECTED = Object.freeze({
  evidence_id: "voidcrasgare1_1bb67737a3af758f1be51474ddced95c6b366b3b5e7ee04994841021238c804d",
  append_request_id: "voidcrasgar1_e97b68fcbb085aec3b0e502d4e00b5e662d3a13374a87cbe51e0a8a687e27481",
  output_sha256: "66a42618d3174989d87f210b2ef3153a139d9bfa9d97a781e5d7f4a74fc77895",
  owner: "0xe1f147b6b2671f140c4107fa4a1dd5f7cbd06d0b",
  contract: "0xe4e9a5a8e5ac3a99176fcf50ba986a374577de49",
  nonce: "0",
  gas_limit: "445751",
  max_fee: "1000000014",
  priority_fee: "1000000000",
  role_record: "1492c4d55f5c6d4873a28ca08d641196ba51d9e5c0a7c1cc31f27bf1a6405b0b",
  predicted_root: "54619d93d1f94746cb92c3bb4de038d014d5c90b73789581486b4a12b4322041",
  unsigned_hash: "0x568f531f93d6949adc0767cf4384a279b471edb389e18268511182ca6c51de34",
  unsigned_serialized_sha256: "daa137548783f895e1979ed2fa5294d15ad7b0edbb355b5b956440b3656280ff"
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

export function verifySovereignGenesisAppendRequestEvidenceV1(v) {
  if (
    !v ||
    v.marker !== MARKER ||
    v.version !== 1 ||
    v.status !== "exact_unsigned_owner_append_request_frozen_authorization_pending" ||
    v.append_request_evidence_id !== EXPECTED.evidence_id ||
    v.append_request_id !== EXPECTED.append_request_id ||
    v.artifact?.output_file_sha256 !== EXPECTED.output_sha256 ||
    v.transaction?.chain_id !== "2050" ||
    v.transaction?.transaction_type !== 2 ||
    v.transaction?.signer_address !== EXPECTED.owner ||
    v.transaction?.to_address !== EXPECTED.contract ||
    v.transaction?.nonce !== EXPECTED.nonce ||
    v.transaction?.value_wei !== "0" ||
    v.transaction?.gas_limit !== EXPECTED.gas_limit ||
    v.transaction?.max_fee_per_gas_wei !== EXPECTED.max_fee ||
    v.transaction?.max_priority_fee_per_gas_wei !== EXPECTED.priority_fee ||
    v.transaction?.unsigned_transaction_hash !== EXPECTED.unsigned_hash ||
    v.transaction?.unsigned_serialized_sha256 !== EXPECTED.unsigned_serialized_sha256 ||
    v.candidate?.identity_id !== "sovereign.zoso" ||
    v.candidate?.role !== "SOVEREIGN" ||
    v.candidate?.role_record_sha256 !== EXPECTED.role_record ||
    v.candidate?.predicted_registry_root_sha256 !== EXPECTED.predicted_root ||
    v.fresh_observation?.owner_balance_wei !== "500000000000000" ||
    v.fresh_observation?.owner_latest_nonce !== "0" ||
    v.fresh_observation?.owner_pending_nonce !== "0" ||
    v.fresh_observation?.registry_entry_count !== "0" ||
    v.authority?.owner_key_access_authorized !== false ||
    v.authority?.transaction_signing_authorized !== false ||
    v.authority?.transaction_broadcast_authorized !== false ||
    v.authority?.chain2050_write_authorized !== false ||
    v.authority?.registry_append_authorized !== false ||
    v.authority?.gas_spend_authorized !== false ||
    v.authority?.automatic_retry_authorized !== false ||
    v.authority?.replacement_transaction_authorized !== false ||
    v.required_next_gate !== "explicit_sovereign_authorization_for_exact_owner_registry_append_transaction_hash"
  ) fail("sovereign_genesis_append_request_evidence_binding_invalid");

  const material = {
    append_request_id: v.append_request_id,
    output_file_sha256: v.artifact.output_file_sha256,
    unsigned_transaction_hash: v.transaction.unsigned_transaction_hash,
    unsigned_serialized_sha256: v.transaction.unsigned_serialized_sha256,
    owner: v.transaction.signer_address,
    contract: v.transaction.to_address,
    nonce: v.transaction.nonce,
    gas_limit: v.transaction.gas_limit,
    max_fee_per_gas_wei: v.transaction.max_fee_per_gas_wei,
    max_priority_fee_per_gas_wei: v.transaction.max_priority_fee_per_gas_wei,
    role_record_sha256: v.candidate.role_record_sha256,
    predicted_registry_root_sha256: v.candidate.predicted_registry_root_sha256
  };
  const id = "voidcrasgare1_" + sha256(canonical(material));
  if (id !== EXPECTED.evidence_id) fail("sovereign_genesis_append_request_evidence_id_mismatch");

  return Object.freeze({
    ok: true,
    append_request_evidence_id: id,
    append_request_id: v.append_request_id,
    unsigned_transaction_hash: v.transaction.unsigned_transaction_hash,
    role_record_sha256: v.candidate.role_record_sha256,
    predicted_registry_root_sha256: v.candidate.predicted_registry_root_sha256,
    registry_append_authorized: false
  });
}
