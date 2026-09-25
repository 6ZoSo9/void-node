#!/usr/bin/env node
import crypto from "node:crypto";

export const VOID_WC_VOID_MARKET_VAULT_DEPLOYER_GAS_EXACT_SIGNING_REQUEST_V1 =
  "VOID_WC_VOID_MARKET_VAULT_DEPLOYER_GAS_EXACT_SIGNING_REQUEST_V1";

export const EXPECTED = Object.freeze({
  pre_sign_revalidation_id:
    "voidwcvdgpsr1_6b5cc97d1dfd63389466b7348b9623235cbd4c85d3e1f994157bcb7784222176",
  signing_request_id:
    "voidwcvdgsr1_8a216f9f6ef2c63b0c901c47f94b5e93b092d6d10e6ac5a1d35b652e49f4396d",
  authorization_id:
    "voidwcvdgfa1_b2255123b21f6bfef86ea5aa288bcfd8a86d7d46e3a94f6b861bdadacb416392",
  funding_request_id:
    "voidwcvdgfr1_1cdff2d7f8129e3debfdf0e080b8f059b0129ea7c1ec44c414c95282262d1148",
  unsigned_transaction_hash:
    "0xe0ffe7279501b1c334b7a0b0e67081ab2813db7d407970aa6c9ea9f6882da3e9",
  unsigned_serialized_sha256:
    "5e25fb995cf853fa3942bb4e6aa364c9746d0f411f87b55cac15b06b12b352fd",
  signer_address:
    "0xc884f631c3881b8b672bfcbf019c856146cd7f73",
  destination:
    "0x907ea7d0d57f5631219674bdf666a7e929613074",
  credential_id: "buy-void-native-fulfillment-wallet-v1",
  credential_binding_evidence_id_sha256:
    "20b5201b7d0516b3a4eb538fa4ec8fc1d1c68d5d1158740a11992025a2451495",
  wallet_address_fingerprint_sha256:
    "68dd42774ebc792bb79b509ec651a9d560005d9ac0a54f7b50ce2e288ee3e498",
});

export const AUTHORITY = Object.freeze({
  source_only_request_verification: true,
  credential_binding_metadata_read: true,
  credential_content_access: false,
  wallet_or_signer_access: false,
  private_key_access: false,
  transaction_signing: false,
  transaction_broadcast: false,
  chain2050_write: false,
  funds_movement: false,
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
  const error = new Error(code);
  error.code = code;
  throw error;
}

export function verifyFreshPreSignEvidenceV1(evidence) {
  if (
    !evidence ||
    evidence.marker !==
      "VOID_WC_VOID_MARKET_VAULT_DEPLOYER_GAS_PRE_SIGN_REVALIDATION_EVIDENCE_V1" ||
    evidence.version !== 1 ||
    evidence.status !== "green_fresh_pre_sign_revalidation" ||
    evidence.pre_sign_revalidation_id !== EXPECTED.pre_sign_revalidation_id ||
    evidence.source_head !==
      "76016abfea30c0622d6aadc9522ff2f7dcc812cf" ||
    evidence.observed_on_host !== "Precision" ||
    evidence.revalidation_json_sha256 !==
      "355bfcd9cb59086a0daabdfc5c832f714f40c9394b65c0d4e4972549a2d15b77" ||
    evidence.authorization_id !== EXPECTED.authorization_id ||
    evidence.funding_request_id !== EXPECTED.funding_request_id ||
    evidence.unsigned_transaction_hash !==
      EXPECTED.unsigned_transaction_hash ||
    evidence.unsigned_serialized_sha256 !==
      EXPECTED.unsigned_serialized_sha256 ||
    evidence.chain_id !== "2050" ||
    evidence.block_number !== "37392" ||
    evidence.block_hash !==
      "0x739679fd9f9b6f96213c440350980a1b590324c9152b7c394c81ce3627c94f52" ||
    evidence.source_address !== EXPECTED.signer_address ||
    evidence.source_latest_nonce !== "1" ||
    evidence.source_pending_nonce !== "1" ||
    evidence.source_balance_wei !== "2000025200000189000" ||
    evidence.source_balance_sufficient !== true ||
    evidence.destination_address !== EXPECTED.destination ||
    evidence.destination_balance_wei !== "0" ||
    evidence.destination_latest_nonce !== "0" ||
    evidence.destination_pending_nonce !== "0" ||
    evidence.source_has_code !== false ||
    evidence.destination_has_code !== false ||
    evidence.base_fee_per_gas_wei !== "7" ||
    evidence.observed_priority_fee_per_gas_wei !== "1000000000" ||
    evidence.observed_two_x_base_plus_priority_wei !== "1000000014" ||
    evidence.max_fee_per_gas_wei !== "3000000000" ||
    evidence.max_priority_fee_per_gas_wei !== "1000000000" ||
    evidence.maximum_source_liability_wei !== "6732126000000000" ||
    evidence.pending_nonce_revalidated !== true ||
    evidence.observation_block_hash_revalidated !== true ||
    evidence.decision !==
      "GREEN_FRESH_PRE_SIGN_REVALIDATION_READY_FOR_SEPARATE_EXACT_SIGNING_AND_BROADCAST_AUTHORIZATION"
  ) {
    fail("fresh_pre_sign_evidence_binding_invalid");
  }

  for (const value of Object.values(evidence.authority ?? {})) {
    if (value !== false) fail("fresh_pre_sign_evidence_authority_invalid");
  }

  const material = structuredClone(evidence);
  delete material.pre_sign_revalidation_id;
  const id = "voidwcvdgpsr1_" + sha256(canonical(material));
  if (id !== EXPECTED.pre_sign_revalidation_id) {
    fail("fresh_pre_sign_evidence_id_mismatch");
  }

  return Object.freeze({
    ok: true,
    pre_sign_revalidation_id: id,
    unsigned_transaction_hash: evidence.unsigned_transaction_hash,
  });
}

function signingRequestMaterial(request) {
  return {
    schema: request.schema,
    chain_id: request.chain_id,
    signer_role: request.signer_role,
    signer_address: request.signer_address,
    credential_binding: request.credential_binding,
    funding_authorization_id: request.funding_authorization_id,
    funding_request_id: request.funding_request_id,
    fresh_pre_sign_revalidation_id:
      request.fresh_pre_sign_revalidation_id,
    fresh_pre_sign_revalidation_json_sha256:
      request.fresh_pre_sign_revalidation_json_sha256,
    transaction: request.transaction,
    fresh_pre_sign_observation: request.fresh_pre_sign_observation,
    authority_boundary: request.authority_boundary,
    required_authorization: request.required_authorization,
  };
}

export function verifyExactSigningRequestV1(request, evidence) {
  verifyFreshPreSignEvidenceV1(evidence);

  if (
    !request ||
    request.marker !==
      VOID_WC_VOID_MARKET_VAULT_DEPLOYER_GAS_EXACT_SIGNING_REQUEST_V1 ||
    request.version !== 1 ||
    request.status !==
      "HOLD_PENDING_EXPLICIT_SOVEREIGN_SINGLE_TRANSACTION_SIGNING_AUTHORIZATION" ||
    request.signing_request_id !== EXPECTED.signing_request_id ||
    request.schema !==
      "void.wc-void.market-vault-deployer-gas-exact-signing-request.v1" ||
    request.chain_id !== "2050" ||
    request.signer_role !==
      "buy_void_fulfillment_wallet_native_gas_funder" ||
    request.signer_address !== EXPECTED.signer_address ||
    request.credential_binding?.credential_id !== EXPECTED.credential_id ||
    request.credential_binding?.credential_binding_evidence_id_sha256 !==
      EXPECTED.credential_binding_evidence_id_sha256 ||
    request.credential_binding?.wallet_address_fingerprint_sha256 !==
      EXPECTED.wallet_address_fingerprint_sha256 ||
    request.credential_binding?.exact_wallet_binding !== true ||
    request.funding_authorization_id !== EXPECTED.authorization_id ||
    request.funding_request_id !== EXPECTED.funding_request_id ||
    request.fresh_pre_sign_revalidation_id !==
      EXPECTED.pre_sign_revalidation_id ||
    request.fresh_pre_sign_revalidation_json_sha256 !==
      evidence.revalidation_json_sha256 ||
    request.transaction?.transaction_type !== 2 ||
    request.transaction?.source !== EXPECTED.signer_address ||
    request.transaction?.destination !== EXPECTED.destination ||
    request.transaction?.nonce !== "1" ||
    request.transaction?.value_wei !== "6669126000000000" ||
    request.transaction?.gas_limit !== "21000" ||
    request.transaction?.max_fee_per_gas_wei !== "3000000000" ||
    request.transaction?.max_priority_fee_per_gas_wei !== "1000000000" ||
    request.transaction?.data !== "0x" ||
    !Array.isArray(request.transaction?.access_list) ||
    request.transaction.access_list.length !== 0 ||
    request.transaction?.unsigned_transaction_hash !==
      EXPECTED.unsigned_transaction_hash ||
    request.transaction?.unsigned_serialized_sha256 !==
      EXPECTED.unsigned_serialized_sha256 ||
    request.fresh_pre_sign_observation?.block_number !==
      evidence.block_number ||
    request.fresh_pre_sign_observation?.block_hash !== evidence.block_hash ||
    request.fresh_pre_sign_observation?.source_pending_nonce !== "1" ||
    request.fresh_pre_sign_observation?.source_balance_sufficient !== true ||
    request.fresh_pre_sign_observation?.destination_unfunded !== true ||
    request.fresh_pre_sign_observation?.fee_caps_sufficient !== true ||
    request.authority_boundary?.private_key_access_authorized !== false ||
    request.authority_boundary?.transaction_signing_authorized !== false ||
    request.authority_boundary?.transaction_broadcast_authorized !== false ||
    request.authority_boundary?.chain2050_write_authorized !== false ||
    request.authority_boundary?.funds_movement_authorized !== false ||
    request.authority_boundary?.broadcast_authorization_separate_required !==
      true ||
    request.required_authorization !==
      "explicit_sovereign_authorization_for_exact_unsigned_transaction_hash_and_single_fixed_credential_signing_only" ||
    request.next_gate !==
      "explicit_sovereign_single_signing_authorization_then_controlled_fixed_credential_signing"
  ) {
    fail("exact_signing_request_binding_invalid");
  }

  const id =
    "voidwcvdgsr1_" + sha256(canonical(signingRequestMaterial(request)));
  if (id !== EXPECTED.signing_request_id) {
    fail("exact_signing_request_id_mismatch");
  }

  return Object.freeze({
    ok: true,
    status:
      "HOLD_PENDING_EXPLICIT_SOVEREIGN_SINGLE_TRANSACTION_SIGNING_AUTHORIZATION",
    signing_request_id: id,
    pre_sign_revalidation_id: EXPECTED.pre_sign_revalidation_id,
    unsigned_transaction_hash: EXPECTED.unsigned_transaction_hash,
    signer_address: EXPECTED.signer_address,
    credential_id: EXPECTED.credential_id,
    private_key_access_authorized: false,
    transaction_signing_authorized: false,
    transaction_broadcast_authorized: false,
    chain2050_write_authorized: false,
    funds_movement_authorized: false,
    next_gate:
      "explicit_sovereign_single_signing_authorization_then_controlled_fixed_credential_signing",
    authority: AUTHORITY,
  });
}
