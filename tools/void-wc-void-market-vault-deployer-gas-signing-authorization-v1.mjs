#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";

export const MARKER =
  "VOID_WC_VOID_MARKET_VAULT_DEPLOYER_GAS_SIGNING_AUTHORIZATION_V1";

export const EXPECTED = Object.freeze({
  signing_request_id:
    "voidwcvdgsr1_8a216f9f6ef2c63b0c901c47f94b5e93b092d6d10e6ac5a1d35b652e49f4396d",
  pre_sign_revalidation_id:
    "voidwcvdgpsr1_6b5cc97d1dfd63389466b7348b9623235cbd4c85d3e1f994157bcb7784222176",
  proposed_authorization_id:
    "voidwcvdgsa1_979042b6cbf43a3c78475bf518c0bd10c8707958aad18fbdd3bf39541ab45d2f",
  signer_address:
    "0xc884f631c3881b8b672bfcbf019c856146cd7f73",
  credential_id: "buy-void-native-fulfillment-wallet-v1",
  credential_binding_evidence_id_sha256:
    "20b5201b7d0516b3a4eb538fa4ec8fc1d1c68d5d1158740a11992025a2451495",
  unsigned_transaction_hash:
    "0xe0ffe7279501b1c334b7a0b0e67081ab2813db7d407970aa6c9ea9f6882da3e9",
  unsigned_serialized_sha256:
    "5e25fb995cf853fa3942bb4e6aa364c9746d0f411f87b55cac15b06b12b352fd",
});

export const AUTHORITY = Object.freeze({
  source_only_authorization_verification: true,
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
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
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

function material(auth) {
  return {
    signing_request_id: auth.signing_request_id,
    fresh_pre_sign_revalidation_id: auth.fresh_pre_sign_revalidation_id,
    signer_address: auth.signer_address,
    credential_id: auth.credential_id,
    credential_binding_evidence_id_sha256:
      auth.credential_binding_evidence_id_sha256,
    unsigned_transaction_hash: auth.unsigned_transaction_hash,
    unsigned_serialized_sha256: auth.unsigned_serialized_sha256,
    maximum_signatures: auth.authorization.maximum_signatures,
    automatic_retry: auth.authorization.automatic_retry,
    transaction_broadcast_authorized:
      auth.authorization.transaction_broadcast_authorized,
    funds_movement_authorized: auth.authorization.funds_movement_authorized,
    separate_broadcast_authorization_required:
      auth.authorization.separate_broadcast_authorization_required,
  };
}

function validateCommon(auth) {
  if (
    !auth ||
    auth.marker !== MARKER ||
    auth.version !== 1 ||
    auth.signing_request_id !== EXPECTED.signing_request_id ||
    auth.fresh_pre_sign_revalidation_id !==
      EXPECTED.pre_sign_revalidation_id ||
    auth.signer_address !== EXPECTED.signer_address ||
    auth.credential_id !== EXPECTED.credential_id ||
    auth.credential_binding_evidence_id_sha256 !==
      EXPECTED.credential_binding_evidence_id_sha256 ||
    auth.unsigned_transaction_hash !== EXPECTED.unsigned_transaction_hash ||
    auth.unsigned_serialized_sha256 !==
      EXPECTED.unsigned_serialized_sha256 ||
    auth.authorization?.transaction_broadcast_authorized !== false ||
    auth.authorization?.chain2050_write_authorized !== false ||
    auth.authorization?.funds_movement_authorized !== false ||
    auth.authorization?.automatic_retry !== false ||
    auth.authorization?.separate_broadcast_authorization_required !== true ||
    auth.required_execution?.fresh_pre_sign_revalidation_required !== true ||
    auth.required_execution?.exact_unsigned_transaction_hash_required !== true ||
    auth.required_execution?.exact_credential_binding_required !== true ||
    auth.required_execution?.signed_transaction_verification_required !== true ||
    auth.required_execution?.fresh_prebroadcast_revalidation_required !== true ||
    auth.required_execution?.separate_broadcast_authorization_required !== true
  ) {
    fail("signing_authorization_common_binding_invalid");
  }
}

export function verifyPendingSigningAuthorizationV1(auth) {
  validateCommon(auth);

  if (
    auth.status !== "authorization_pending" ||
    auth.authorization_id !== null ||
    auth.authorization_source !== null ||
    auth.authorization?.credential_access_authorized !== false ||
    auth.authorization?.private_key_access_authorized !== false ||
    auth.authorization?.transaction_signing_authorized !== false ||
    auth.authorization?.maximum_signatures !== 0
  ) {
    fail("pending_signing_authorization_invalid");
  }

  return Object.freeze({
    ok: true,
    status: "AUTHORIZATION_PENDING",
    signing_request_id: EXPECTED.signing_request_id,
    proposed_authorization_id: EXPECTED.proposed_authorization_id,
    credential_access_authorized: false,
    private_key_access_authorized: false,
    transaction_signing_authorized: false,
    transaction_broadcast_authorized: false,
    funds_movement_authorized: false,
  });
}

export function verifySigningAuthorizationV1(auth) {
  validateCommon(auth);

  if (
    auth.status !== "authorized_exact_single_signature" ||
    auth.authorization_id !== EXPECTED.proposed_authorization_id ||
    auth.authorization_source !== "interactive_sovereign_authorization" ||
    auth.authorization?.credential_access_authorized !== true ||
    auth.authorization?.private_key_access_authorized !== true ||
    auth.authorization?.transaction_signing_authorized !== true ||
    auth.authorization?.maximum_signatures !== 1
  ) {
    fail("signing_authorization_binding_invalid");
  }

  const id =
    "voidwcvdgsa1_" + sha256(canonical(material(auth)));
  if (id !== EXPECTED.proposed_authorization_id) {
    fail("signing_authorization_id_mismatch");
  }

  return Object.freeze({
    ok: true,
    status: "AUTHORIZED_FOR_ONE_FIXED_CREDENTIAL_SIGNATURE_ONLY",
    authorization_id: id,
    signing_request_id: EXPECTED.signing_request_id,
    signer_address: EXPECTED.signer_address,
    credential_id: EXPECTED.credential_id,
    unsigned_transaction_hash: EXPECTED.unsigned_transaction_hash,
    maximum_signatures: 1,
    automatic_retry: false,
    transaction_broadcast_authorized: false,
    chain2050_write_authorized: false,
    funds_movement_authorized: false,
    separate_broadcast_authorization_required: true,
  });
}

async function main() {
  const auth = JSON.parse(
    fs.readFileSync(
      "ops/mainnet0/wc-void-market-vault-deployer-gas-signing-authorization-v1.json",
      "utf8",
    ),
  );
  const result =
    auth.status === "authorization_pending"
      ? verifyPendingSigningAuthorizationV1(auth)
      : verifySigningAuthorizationV1(auth);
  process.stdout.write(JSON.stringify(result, null, 2) + "\n");
}

if (
  process.argv[1]?.endsWith(
    "void-wc-void-market-vault-deployer-gas-signing-authorization-v1.mjs",
  )
) {
  main().catch((error) => {
    console.error(error?.code || error?.message || error);
    process.exit(1);
  });
}
