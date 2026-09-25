#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { Transaction, Wallet, getAddress } from "ethers";

import {
  EXPECTED,
  verifySigningAuthorizationV1,
} from "./void-wc-void-market-vault-deployer-gas-signing-authorization-v1.mjs";
import {
  verifyExactSigningRequestV1,
} from "./void-wc-void-market-vault-deployer-gas-exact-signing-request-v1.mjs";

export const MARKER =
  "VOID_WC_VOID_MARKET_VAULT_DEPLOYER_GAS_FIXED_CREDENTIAL_SIGN_ONCE_V1";

export const AUTHORITY = Object.freeze({
  exact_signing_authorization_required: true,
  exact_signing_request_required: true,
  exact_fresh_pre_sign_evidence_required: true,
  fixed_systemd_credential_only: true,
  one_signature_consumption_required_before_credential_read: true,
  filesystem_read: true,
  filesystem_write_private_state_only: true,
  credential_access_when_called: true,
  private_key_access_when_called: true,
  wallet_or_signer_access_when_called: true,
  transaction_signing_when_called: true,
  rpc_call: false,
  transaction_broadcast: false,
  chain2050_write: false,
  funds_movement: false,
  automatic_retry: false,
  replacement_transaction: false,
});

const CREDENTIAL_ID = "buy-void-native-fulfillment-wallet-v1";
const SIGNER = "0xc884f631c3881b8b672bfcbf019c856146cd7f73";
const UNSIGNED_HASH =
  "0xe0ffe7279501b1c334b7a0b0e67081ab2813db7d407970aa6c9ea9f6882da3e9";
const UNSIGNED_SHA256 =
  "5e25fb995cf853fa3942bb4e6aa364c9746d0f411f87b55cac15b06b12b352fd";
const PRIVATE_KEY = /^(?:0x)?[0-9a-fA-F]{64}$/u;
const MAX_CREDENTIAL_BYTES = 256;

function fail(code) {
  const error = new Error(code);
  error.code = code;
  throw error;
}

function sha256Bytes(hex) {
  return crypto
    .createHash("sha256")
    .update(Buffer.from(String(hex).replace(/^0x/u, ""), "hex"))
    .digest("hex");
}

function normalizeAddress(value) {
  try {
    return getAddress(String(value)).toLowerCase();
  } catch {
    return "";
  }
}

function writePrivateExclusive(file, value) {
  const fd = fs.openSync(
    file,
    fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL,
    0o600,
  );
  try {
    fs.writeFileSync(fd, value, "utf8");
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
}

function validateCredentialPath(credentialsDirectory) {
  if (
    typeof credentialsDirectory !== "string" ||
    !credentialsDirectory ||
    !path.isAbsolute(credentialsDirectory)
  ) {
    fail("credentials_directory_invalid");
  }

  const normalized = path.normalize(credentialsDirectory);
  const credentialPath = path.join(normalized, CREDENTIAL_ID);
  if (path.dirname(credentialPath) !== normalized) {
    fail("credential_path_escape_detected");
  }

  const stat = fs.lstatSync(credentialPath);
  if (stat.isSymbolicLink()) fail("credential_symlink_forbidden");
  if (!stat.isFile()) fail("credential_not_regular_file");
  if (stat.size <= 0 || stat.size > MAX_CREDENTIAL_BYTES) {
    fail("credential_size_out_of_policy");
  }
  const mode = stat.mode & 0o777;
  if ((mode & 0o077) !== 0) {
    fail("credential_permissions_too_broad");
  }

  return credentialPath;
}

export async function signOnceV1(input) {
  const {
    authorization,
    signingRequest,
    preSignEvidence,
    unsigned,
    credentialsDirectory,
    consumptionPath,
    outputPath,
  } = input ?? {};

  const authResult = verifySigningAuthorizationV1(authorization);
  if (
    authResult.authorization_id !== EXPECTED.proposed_authorization_id ||
    authResult.maximum_signatures !== 1 ||
    authResult.transaction_broadcast_authorized !== false ||
    authResult.funds_movement_authorized !== false
  ) {
    fail("signing_authorization_not_exact");
  }

  const requestResult = verifyExactSigningRequestV1(
    signingRequest,
    preSignEvidence,
  );
  if (
    requestResult.signing_request_id !== EXPECTED.signing_request_id ||
    requestResult.unsigned_transaction_hash !== UNSIGNED_HASH
  ) {
    fail("signing_request_not_exact");
  }

  if (
    !unsigned ||
    unsigned.marker !==
      "VOID_WC_VOID_MARKET_VAULT_DEPLOYER_GAS_UNSIGNED_FUNDING_V1" ||
    unsigned.authorization_id !==
      "voidwcvdgfa1_b2255123b21f6bfef86ea5aa288bcfd8a86d7d46e3a94f6b861bdadacb416392" ||
    unsigned.funding_request_id !==
      "voidwcvdgfr1_1cdff2d7f8129e3debfdf0e080b8f059b0129ea7c1ec44c414c95282262d1148" ||
    unsigned.transaction?.source !== SIGNER ||
    unsigned.transaction?.unsigned_transaction_hash !== UNSIGNED_HASH ||
    unsigned.transaction?.unsigned_serialized_sha256 !== UNSIGNED_SHA256
  ) {
    fail("unsigned_artifact_not_exact");
  }

  const unsignedTx = Transaction.from(
    unsigned.transaction.unsigned_serialized,
  );
  if (
    unsignedTx.signature !== null ||
    unsignedTx.from !== null ||
    unsignedTx.unsignedHash !== UNSIGNED_HASH ||
    sha256Bytes(unsignedTx.unsignedSerialized) !== UNSIGNED_SHA256
  ) {
    fail("unsigned_serialization_not_exact");
  }

  if (
    typeof consumptionPath !== "string" ||
    !path.isAbsolute(consumptionPath) ||
    typeof outputPath !== "string" ||
    !path.isAbsolute(outputPath) ||
    consumptionPath === outputPath
  ) {
    fail("private_output_path_invalid");
  }

  if (fs.existsSync(consumptionPath)) {
    fail("signing_authorization_already_consumed");
  }
  if (fs.existsSync(outputPath)) {
    fail("signed_output_already_exists");
  }

  const credentialPath = validateCredentialPath(credentialsDirectory);

  const consumption = {
    marker:
      "VOID_WC_VOID_MARKET_VAULT_DEPLOYER_GAS_SIGNING_CONSUMPTION_V1",
    version: 1,
    status: "consumed_before_credential_read",
    authorization_id: authResult.authorization_id,
    signing_request_id: requestResult.signing_request_id,
    unsigned_transaction_hash: UNSIGNED_HASH,
    credential_id: CREDENTIAL_ID,
    maximum_signatures: 1,
    automatic_retry: false,
    transaction_broadcast_authorized: false,
    funds_movement_authorized: false,
  };
  writePrivateExclusive(
    consumptionPath,
    JSON.stringify(consumption, null, 2) + "\n",
  );

  let credentialBytes = fs.readFileSync(credentialPath);
  let privateKey = "";
  try {
    privateKey = credentialBytes.toString("utf8").trim();
  } finally {
    credentialBytes.fill(0);
  }

  if (!PRIVATE_KEY.test(privateKey)) {
    privateKey = "";
    fail("credential_private_key_shape_invalid");
  }
  if (!privateKey.startsWith("0x")) privateKey = "0x" + privateKey;

  let wallet;
  try {
    wallet = new Wallet(privateKey);
  } finally {
    privateKey = "";
  }

  if (normalizeAddress(wallet.address) !== SIGNER) {
    fail("credential_wallet_address_mismatch");
  }

  const signedRaw = await wallet.signTransaction({
    type: 2,
    chainId: unsignedTx.chainId,
    nonce: unsignedTx.nonce,
    gasLimit: unsignedTx.gasLimit,
    maxFeePerGas: unsignedTx.maxFeePerGas,
    maxPriorityFeePerGas: unsignedTx.maxPriorityFeePerGas,
    to: unsignedTx.to,
    value: unsignedTx.value,
    data: unsignedTx.data,
    accessList: unsignedTx.accessList,
  });

  const signed = Transaction.from(signedRaw);

  if (
    normalizeAddress(signed.from) !== SIGNER ||
    signed.chainId !== unsignedTx.chainId ||
    signed.nonce !== unsignedTx.nonce ||
    normalizeAddress(signed.to) !== normalizeAddress(unsignedTx.to) ||
    signed.value !== unsignedTx.value ||
    signed.gasLimit !== unsignedTx.gasLimit ||
    signed.maxFeePerGas !== unsignedTx.maxFeePerGas ||
    signed.maxPriorityFeePerGas !== unsignedTx.maxPriorityFeePerGas ||
    signed.data !== unsignedTx.data ||
    signed.unsignedHash !== UNSIGNED_HASH ||
    signed.signature === null
  ) {
    fail("signed_transaction_exact_verification_failed");
  }

  const output = {
    marker:
      "VOID_WC_VOID_MARKET_VAULT_DEPLOYER_GAS_SIGNED_TRANSACTION_V1",
    version: 1,
    status: "signed_exactly_once_held_for_independent_verification",
    authorization_id: authResult.authorization_id,
    signing_request_id: requestResult.signing_request_id,
    signer_address: SIGNER,
    credential_id: CREDENTIAL_ID,
    unsigned_transaction_hash: UNSIGNED_HASH,
    signed_transaction_hash: signed.hash,
    raw_signed_transaction: signedRaw,
    raw_signed_transaction_sha256: sha256Bytes(signedRaw),
    transaction: {
      chain_id: signed.chainId.toString(),
      transaction_type: signed.type,
      nonce: signed.nonce.toString(),
      source: normalizeAddress(signed.from),
      destination: normalizeAddress(signed.to),
      value_wei: signed.value.toString(),
      gas_limit: signed.gasLimit.toString(),
      max_fee_per_gas_wei: signed.maxFeePerGas?.toString() ?? null,
      max_priority_fee_per_gas_wei:
        signed.maxPriorityFeePerGas?.toString() ?? null,
      data: signed.data,
    },
    authority: {
      credential_access_performed: true,
      private_key_access_performed: true,
      transaction_signing_performed: true,
      signature_count: 1,
      transaction_broadcast_authorized: false,
      transaction_broadcast_performed: false,
      chain2050_write_authorized: false,
      chain2050_write_performed: false,
      funds_movement_authorized: false,
      funds_movement_performed: false,
      automatic_retry: false,
    },
    next_gate:
      "independent_signed_transaction_verification_then_fresh_prebroadcast_revalidation_and_separate_broadcast_authorization",
  };

  writePrivateExclusive(
    outputPath,
    JSON.stringify(output, null, 2) + "\n",
  );

  return Object.freeze({
    ok: true,
    marker: MARKER,
    status: "SIGNED_EXACTLY_ONCE_HELD_FOR_INDEPENDENT_VERIFICATION",
    authorization_id: authResult.authorization_id,
    signing_request_id: requestResult.signing_request_id,
    signer_address: SIGNER,
    signed_transaction_hash: signed.hash,
    raw_signed_transaction_sha256: output.raw_signed_transaction_sha256,
    consumption_path: consumptionPath,
    output_path: outputPath,
    transaction_broadcast_authorized: false,
    transaction_broadcast_performed: false,
    chain2050_write_authorized: false,
    chain2050_write_performed: false,
    funds_movement_authorized: false,
    funds_movement_performed: false,
  });
}
