#!/usr/bin/env node
import crypto from "node:crypto";

export const MARKER =
  "VOID_CHAIN2050_ROLE_AUTHORITY_SOVEREIGN_OWNER_GAS_FUNDING_REQUEST_EVIDENCE_V1";

const EXPECTED = Object.freeze({
  evidence_id: "voidcrasgfre1_13d8939436ef22b7deb461aa30416e985ac05947c1df63bf39cdb95696e08cfe",
  request_id: "voidcrasgf1_e7377ba46ccd646fdfe72aec1aeaef1bc451a0918034906dfd67bf8f3d031d8b",
  source: "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266",
  destination: "0xe1f147b6b2671f140c4107fa4a1dd5f7cbd06d0b",
  value_wei: "500000000000000",
  nonce: "129",
  gas_limit: "25200",
  max_fee: "1000000014",
  priority_fee: "1000000000",
  unsigned_hash: "0x9b67e9e6fe373b664446a1b21fc49457ea109227a184f132005198da186a4df6",
  unsigned_serialized_sha256: "6c920be037acd1d200d1a8781a0cbb08a64ef933da570812786da9dd8e850f09",
  output_sha256: "83b14cd87c4741c54ba5aa914f55cc50a8f13939066b2754f19ad2d2a9acd146"
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

export function verifyFundingRequestEvidenceV1(v) {
  if (
    !v ||
    v.marker !== MARKER ||
    v.version !== 1 ||
    v.status !== "exact_unsigned_funding_request_frozen_authorization_pending" ||
    v.funding_request_evidence_id !== EXPECTED.evidence_id ||
    v.funding_request_id !== EXPECTED.request_id ||
    v.purpose !== "single_sovereign_genesis_registry_append_gas_budget" ||
    v.source?.address !== EXPECTED.source ||
    v.source?.kind !== "standard_anvil_prefunded_dev_account" ||
    v.source?.deployment_signer_reused !== false ||
    v.destination?.address !== EXPECTED.destination ||
    v.destination?.role !== "role_authority_registry_owner" ||
    v.transaction?.chain_id !== "2050" ||
    v.transaction?.transaction_type !== 2 ||
    v.transaction?.nonce !== EXPECTED.nonce ||
    v.transaction?.value_wei !== EXPECTED.value_wei ||
    v.transaction?.gas_limit !== EXPECTED.gas_limit ||
    v.transaction?.max_fee_per_gas_wei !== EXPECTED.max_fee ||
    v.transaction?.max_priority_fee_per_gas_wei !== EXPECTED.priority_fee ||
    v.transaction?.unsigned_transaction_hash !== EXPECTED.unsigned_hash ||
    v.transaction?.unsigned_serialized_sha256 !== EXPECTED.unsigned_serialized_sha256 ||
    v.artifact?.output_file_sha256 !== EXPECTED.output_sha256 ||
    v.authority?.funding_authorized !== false ||
    v.authority?.private_key_access_authorized !== false ||
    v.authority?.signing_authorized !== false ||
    v.authority?.transaction_broadcast_authorized !== false ||
    v.authority?.chain2050_write_authorized !== false ||
    v.authority?.registry_append_authorized !== false ||
    v.authority?.automatic_retry_authorized !== false ||
    v.required_next_gate !== "explicit_sovereign_authorization_for_exact_single_funding_transaction_hash"
  ) fail("funding_request_evidence_binding_invalid");

  const material = {
    funding_request_id: v.funding_request_id,
    source: v.source.address,
    destination: v.destination.address,
    value_wei: v.transaction.value_wei,
    nonce: v.transaction.nonce,
    gas_limit: v.transaction.gas_limit,
    max_fee_per_gas_wei: v.transaction.max_fee_per_gas_wei,
    max_priority_fee_per_gas_wei: v.transaction.max_priority_fee_per_gas_wei,
    unsigned_transaction_hash: v.transaction.unsigned_transaction_hash,
    unsigned_serialized_sha256: v.transaction.unsigned_serialized_sha256,
    output_file_sha256: v.artifact.output_file_sha256
  };
  const id = "voidcrasgfre1_" + sha256(canonical(material));
  if (id !== EXPECTED.evidence_id) fail("funding_request_evidence_id_mismatch");

  return Object.freeze({
    ok: true,
    funding_request_evidence_id: id,
    funding_request_id: v.funding_request_id,
    unsigned_transaction_hash: v.transaction.unsigned_transaction_hash,
    value_wei: v.transaction.value_wei,
    funding_authorized: false
  });
}
