#!/usr/bin/env node
import crypto from "node:crypto";

export const MARKER =
  "VOID_CHAIN2050_ROLE_AUTHORITY_SOVEREIGN_OWNER_GAS_FUNDING_RECEIPT_EVIDENCE_V1";

const EXPECTED = Object.freeze({
  evidence_id: "voidcrasgfr1_e9385b102116119b36a6f783451fd4357df4150b9a8813ed98e4ee1f754fba0e",
  authorization_id: "voidcrasgfa1_bfa53d809d212e947f791b856bf0738b0c4ec8eb1522a80fd75e9eba2ea124cc",
  request_id: "voidcrasgf1_e7377ba46ccd646fdfe72aec1aeaef1bc451a0918034906dfd67bf8f3d031d8b",
  unsigned_hash: "0x9b67e9e6fe373b664446a1b21fc49457ea109227a184f132005198da186a4df6",
  signed_hash: "0x5eda168d41f96c8841b3b926c34750d02e2b2950aec1ecd0260b9d3c0042cbc9",
  signed_sha256: "60385b15465414baa0a2851c09000b47eb7c088e861f906c126c70467a377a2c",
  block_number: "37391",
  block_hash: "0xcc475facb196943931403f5af29b9c1bed057e4d0b90478f1a829fa8e609e1bc",
  owner_balance: "500000000000000",
  empty_root: "d50b8a122e11454b6cca6a03b312ecac6af6ea1a5d5c5d5f9dd3fdd03b1faea7"
});

function canonical(v) {
  if (v === null || typeof v !== "object") return JSON.stringify(v);
  if (Array.isArray(v)) return "[" + v.map(canonical).join(",") + "]";
  return "{" + Object.keys(v).sort().map(k => JSON.stringify(k)+":"+canonical(v[k])).join(",") + "}";
}
function sha256(v) {
  return crypto.createHash("sha256").update(v, "utf8").digest("hex");
}
function fail(r) { throw new Error(r); }

export function verifyFundingReceiptEvidenceV1(v) {
  if (
    !v ||
    v.marker !== MARKER ||
    v.version !== 1 ||
    v.status !== "green_exact_single_owner_gas_funding_transaction_verified" ||
    v.funding_receipt_evidence_id !== EXPECTED.evidence_id ||
    v.authorization_id !== EXPECTED.authorization_id ||
    v.funding_request_id !== EXPECTED.request_id ||
    v.unsigned_transaction_hash !== EXPECTED.unsigned_hash ||
    v.signed_transaction_hash !== EXPECTED.signed_hash ||
    v.signed_serialized_sha256 !== EXPECTED.signed_sha256 ||
    v.source !== "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266" ||
    v.destination !== "0xe1f147b6b2671f140c4107fa4a1dd5f7cbd06d0b" ||
    v.value_wei !== "500000000000000" ||
    v.receipt?.status !== 1 ||
    v.receipt?.block_number !== EXPECTED.block_number ||
    v.receipt?.block_hash !== EXPECTED.block_hash ||
    v.receipt?.gas_used !== "21000" ||
    v.post_state?.source_latest_nonce !== "130" ||
    v.post_state?.source_pending_nonce !== "130" ||
    v.post_state?.owner_balance_wei !== EXPECTED.owner_balance ||
    v.post_state?.registry_entry_count !== "0" ||
    v.post_state?.registry_root_sha256 !== EXPECTED.empty_root ||
    v.execution?.rpc_send_invocation_count !== 1 ||
    v.execution?.automatic_retry_performed !== false ||
    v.execution?.replacement_transaction_created !== false ||
    v.execution?.authorization_consumed !== true ||
    v.execution?.funds_movement_performed !== true ||
    v.execution?.chain2050_write_performed !== true ||
    v.execution?.registry_append_performed !== false ||
    v.next_gate !== "fresh_sovereign_genesis_owner_append_unsigned_transaction_preparation"
  ) fail("funding_receipt_evidence_binding_invalid");

  const material = {
    authorization_id: v.authorization_id,
    funding_request_id: v.funding_request_id,
    signed_transaction_hash: v.signed_transaction_hash,
    signed_serialized_sha256: v.signed_serialized_sha256,
    receipt_block_number: v.receipt.block_number,
    receipt_block_hash: v.receipt.block_hash,
    receipt_gas_used: v.receipt.gas_used,
    source_latest_nonce_after: v.post_state.source_latest_nonce,
    owner_balance_wei_after: v.post_state.owner_balance_wei,
    registry_entry_count_after: v.post_state.registry_entry_count,
    registry_root_after: v.post_state.registry_root_sha256
  };
  const id = "voidcrasgfr1_" + sha256(canonical(material));
  if (id !== EXPECTED.evidence_id) fail("funding_receipt_evidence_id_mismatch");

  return Object.freeze({
    ok: true,
    funding_receipt_evidence_id: id,
    signed_transaction_hash: v.signed_transaction_hash,
    owner_balance_wei: v.post_state.owner_balance_wei,
    registry_entry_count: v.post_state.registry_entry_count
  });
}
