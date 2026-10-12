#!/usr/bin/env node
import crypto from "node:crypto";

export const MARKER =
  "VOID_CHAIN2050_ROLE_AUTHORITY_SOVEREIGN_OWNER_GAS_FUNDING_AUTHORIZATION_V1";

const EXPECTED = Object.freeze({
  authorization_id: "voidcrasgfa1_bfa53d809d212e947f791b856bf0738b0c4ec8eb1522a80fd75e9eba2ea124cc",
  request_id: "voidcrasgf1_e7377ba46ccd646fdfe72aec1aeaef1bc451a0918034906dfd67bf8f3d031d8b",
  evidence_id: "voidcrasgfre1_13d8939436ef22b7deb461aa30416e985ac05947c1df63bf39cdb95696e08cfe",
  source: "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266",
  destination: "0xe1f147b6b2671f140c4107fa4a1dd5f7cbd06d0b",
  value_wei: "500000000000000",
  nonce: "129",
  unsigned_hash: "0x9b67e9e6fe373b664446a1b21fc49457ea109227a184f132005198da186a4df6",
  max_liability: "525200000352800",
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

export function verifyFundingAuthorizationV1(v) {
  if (
    !v ||
    v.marker !== MARKER ||
    v.version !== 1 ||
    v.status !== "authorized_exact_single_funding_transaction" ||
    v.authorization_id !== EXPECTED.authorization_id ||
    v.authorization_source !== "interactive_sovereign_authorization" ||
    v.funding_request_id !== EXPECTED.request_id ||
    v.funding_request_evidence_id !== EXPECTED.evidence_id ||
    v.chain_id !== "2050" ||
    v.source !== EXPECTED.source ||
    v.destination !== EXPECTED.destination ||
    v.value_wei !== EXPECTED.value_wei ||
    v.nonce !== EXPECTED.nonce ||
    v.unsigned_transaction_hash !== EXPECTED.unsigned_hash ||
    v.maximum_source_liability_wei !== EXPECTED.max_liability ||
    v.purpose !== "single_sovereign_genesis_registry_append_gas_budget" ||
    v.authorization?.anvil_dev_source_signing_authorized !== true ||
    v.authorization?.transaction_broadcast_authorized !== true ||
    v.authorization?.funds_movement_authorized !== true ||
    v.authorization?.chain2050_write_authorized !== true ||
    v.authorization?.registry_append_authorized !== false ||
    v.authorization?.deployment_signer_reused !== false ||
    v.authorization?.unrelated_funds_movement_authorized !== false ||
    v.authorization?.maximum_submission_attempts !== 1 ||
    v.authorization?.automatic_retry !== false ||
    v.authorization?.replacement_transaction_authorized !== false ||
    v.required_execution?.fresh_exact_transaction_revalidation !== true ||
    v.required_execution?.exact_unsigned_transaction_hash_required !== true ||
    v.required_execution?.single_use_consumption_required_before_send !== true ||
    v.required_execution?.post_send_reconciliation_required !== true
  ) fail("funding_authorization_binding_invalid");

  const material = {
    source: v.source,
    destination: v.destination,
    value_wei: v.value_wei,
    nonce: v.nonce,
    unsigned_transaction_hash: v.unsigned_transaction_hash,
    funding_request_id: v.funding_request_id,
    maximum_source_liability_wei: v.maximum_source_liability_wei,
    maximum_submission_attempts: v.authorization.maximum_submission_attempts,
    automatic_retry: v.authorization.automatic_retry,
    deployment_signer_reused: v.authorization.deployment_signer_reused,
    unrelated_funds_movement_authorized:
      v.authorization.unrelated_funds_movement_authorized,
  };
  const id = "voidcrasgfa1_" + sha256(canonical(material));
  if (id !== EXPECTED.authorization_id) fail("funding_authorization_id_mismatch");

  return Object.freeze({
    ok: true,
    authorization_id: id,
    funding_request_id: v.funding_request_id,
    unsigned_transaction_hash: v.unsigned_transaction_hash,
    maximum_submission_attempts: 1,
    automatic_retry: false,
  });
}
