#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import { Transaction } from "ethers";

export const MARKER =
  "VOID_WC_VOID_MARKET_VAULT_DEPLOYER_GAS_FUNDING_AUTHORIZATION_V1";

export const REQUEST_MARKER =
  "VOID_WC_VOID_MARKET_VAULT_DEPLOYER_GAS_FUNDING_REQUEST_V1";

export const EXPECTED = Object.freeze({
  request_id:
    "voidwcvdgfr1_1cdff2d7f8129e3debfdf0e080b8f059b0129ea7c1ec44c414c95282262d1148",
  proposed_authorization_id:
    "voidwcvdgfa1_b2255123b21f6bfef86ea5aa288bcfd8a86d7d46e3a94f6b861bdadacb416392",
  chain_id: "2050",
  source: "0xc884f631c3881b8b672bfcbf019c856146cd7f73",
  destination: "0x907ea7d0d57f5631219674bdf666a7e929613074",
  nonce: "1",
  value_wei: "6669126000000000",
  gas_limit: "21000",
  max_fee_per_gas_wei: "3000000000",
  max_priority_fee_per_gas_wei: "1000000000",
  maximum_source_liability_wei: "6732126000000000",
});

export const AUTHORITY = Object.freeze({
  source_only_verification: true,
  credential_access: false,
  wallet_or_signer_access: false,
  private_key_access: false,
  live_rpc_call: false,
  transaction_construction_without_authorization: false,
  transaction_signing: false,
  transaction_broadcast: false,
  chain2050_write: false,
  deployer_funding: false,
  inventory_funding: false,
  market_activation: false,
  public_presale_activation: false,
  funds_movement: false,
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

function exactRequest(request) {
  if (
    !request ||
    request.marker !== REQUEST_MARKER ||
    request.version !== 1 ||
    request.status !== "exact_request_authorization_pending" ||
    request.funding_request_id !== EXPECTED.request_id ||
    request.chain_id !== EXPECTED.chain_id ||
    request.purpose !== "single_wc_void_market_vault_deployer_gas_funding" ||
    request.source?.address !== EXPECTED.source ||
    request.source?.pending_nonce !== EXPECTED.nonce ||
    request.source?.has_code !== false ||
    request.source?.covers_max_source_liability !== true ||
    request.source?.source_selected !== false ||
    request.source?.native_gas_funding_authority_expansion_approved !== false ||
    request.destination?.address !== EXPECTED.destination ||
    request.destination?.required_balance_wei !== EXPECTED.value_wei ||
    request.transaction?.transaction_type !== 2 ||
    request.transaction?.nonce !== EXPECTED.nonce ||
    request.transaction?.value_wei !== EXPECTED.value_wei ||
    request.transaction?.gas_limit !== EXPECTED.gas_limit ||
    request.transaction?.max_fee_per_gas_wei !== EXPECTED.max_fee_per_gas_wei ||
    request.transaction?.max_priority_fee_per_gas_wei !==
      EXPECTED.max_priority_fee_per_gas_wei ||
    request.transaction?.maximum_source_liability_wei !==
      EXPECTED.maximum_source_liability_wei ||
    request.transaction?.data !== "0x" ||
    !Array.isArray(request.transaction?.access_list) ||
    request.transaction.access_list.length !== 0 ||
    request.transaction?.unsigned_transaction_hash !== null ||
    request.scope?.source_selection_authorized !== false ||
    request.scope?.native_gas_funding_authority_expansion_authorized !== false ||
    request.scope?.unsigned_transaction_construction_authorized !== false ||
    request.scope?.transaction_signing_authorized !== false ||
    request.scope?.transaction_broadcast_authorized !== false ||
    request.scope?.chain2050_write_authorized !== false ||
    request.scope?.funds_movement_authorized !== false ||
    request.scope?.maximum_submission_attempts !== 0 ||
    request.scope?.automatic_retry !== false ||
    request.scope?.replacement_transaction_authorized !== false
  ) {
    fail("funding_request_binding_invalid");
  }

  const material = structuredClone(request);
  delete material.funding_request_id;
  const id = "voidwcvdgfr1_" + sha256(canonical(material));
  if (id !== EXPECTED.request_id) fail("funding_request_id_mismatch");
  return request;
}

function authorizationMaterial(auth) {
  return {
    funding_request_id: auth.funding_request_id,
    source: auth.source,
    destination: auth.destination,
    value_wei: auth.value_wei,
    nonce: auth.nonce,
    gas_limit: auth.gas_limit,
    max_fee_per_gas_wei: auth.max_fee_per_gas_wei,
    max_priority_fee_per_gas_wei: auth.max_priority_fee_per_gas_wei,
    maximum_source_liability_wei: auth.maximum_source_liability_wei,
    maximum_submission_attempts: auth.authorization.maximum_submission_attempts,
    automatic_retry: auth.authorization.automatic_retry,
    replacement_transaction_authorized:
      auth.authorization.replacement_transaction_authorized,
    unrelated_funds_movement_authorized:
      auth.authorization.unrelated_funds_movement_authorized,
  };
}

export function verifyPendingAuthorizationV1(request, auth) {
  exactRequest(request);

  if (
    !auth ||
    auth.marker !== MARKER ||
    auth.version !== 1 ||
    auth.status !== "authorization_pending" ||
    auth.authorization_id !== null ||
    auth.authorization_source !== null ||
    auth.funding_request_id !== EXPECTED.request_id ||
    auth.source !== EXPECTED.source ||
    auth.destination !== EXPECTED.destination ||
    auth.value_wei !== EXPECTED.value_wei ||
    auth.nonce !== EXPECTED.nonce ||
    auth.gas_limit !== EXPECTED.gas_limit ||
    auth.max_fee_per_gas_wei !== EXPECTED.max_fee_per_gas_wei ||
    auth.max_priority_fee_per_gas_wei !==
      EXPECTED.max_priority_fee_per_gas_wei ||
    auth.maximum_source_liability_wei !== EXPECTED.maximum_source_liability_wei
  ) {
    fail("pending_authorization_binding_invalid");
  }

  for (const [key, value] of Object.entries(auth.authorization ?? {})) {
    if (key === "maximum_submission_attempts") {
      if (value !== 0) fail("pending_authorization_scope_invalid");
    } else if (value !== false) {
      fail("pending_authorization_scope_invalid");
    }
  }

  return Object.freeze({
    ok: true,
    status: "AUTHORIZATION_PENDING",
    funding_request_id: EXPECTED.request_id,
    proposed_authorization_id: EXPECTED.proposed_authorization_id,
    unsigned_transaction_construction_authorized: false,
    signing_authorized: false,
    broadcast_authorized: false,
    funds_movement_authorized: false,
  });
}

export function verifyFundingAuthorizationV1(request, auth) {
  exactRequest(request);

  if (
    !auth ||
    auth.marker !== MARKER ||
    auth.version !== 1 ||
    auth.status !== "authorized_exact_single_funding_transaction" ||
    auth.authorization_id !== EXPECTED.proposed_authorization_id ||
    auth.authorization_source !== "interactive_sovereign_authorization" ||
    auth.funding_request_id !== EXPECTED.request_id ||
    auth.source !== EXPECTED.source ||
    auth.destination !== EXPECTED.destination ||
    auth.value_wei !== EXPECTED.value_wei ||
    auth.nonce !== EXPECTED.nonce ||
    auth.gas_limit !== EXPECTED.gas_limit ||
    auth.max_fee_per_gas_wei !== EXPECTED.max_fee_per_gas_wei ||
    auth.max_priority_fee_per_gas_wei !==
      EXPECTED.max_priority_fee_per_gas_wei ||
    auth.maximum_source_liability_wei !== EXPECTED.maximum_source_liability_wei ||
    auth.authorization?.source_selection_authorized !== true ||
    auth.authorization?.native_gas_funding_authority_expansion_authorized !==
      true ||
    auth.authorization?.unsigned_transaction_construction_authorized !== true ||
    auth.authorization?.transaction_signing_authorized !== false ||
    auth.authorization?.transaction_broadcast_authorized !== false ||
    auth.authorization?.chain2050_write_authorized !== false ||
    auth.authorization?.funds_movement_authorized !== false ||
    auth.authorization?.unrelated_funds_movement_authorized !== false ||
    auth.authorization?.maximum_submission_attempts !== 1 ||
    auth.authorization?.automatic_retry !== false ||
    auth.authorization?.replacement_transaction_authorized !== false ||
    auth.required_execution?.fresh_source_nonce_balance_revalidation !== true ||
    auth.required_execution?.exact_unsigned_transaction_hash_required !== true ||
    auth.required_execution?.separate_signing_broadcast_authorization_required !==
      true ||
    auth.required_execution?.single_use_consumption_required_before_send !==
      true ||
    auth.required_execution?.post_send_reconciliation_required !== true
  ) {
    fail("funding_authorization_binding_invalid");
  }

  const id = "voidwcvdgfa1_" + sha256(canonical(authorizationMaterial(auth)));
  if (id !== EXPECTED.proposed_authorization_id) {
    fail("funding_authorization_id_mismatch");
  }

  return Object.freeze({
    ok: true,
    status: "AUTHORIZED_FOR_UNSIGNED_CONSTRUCTION_ONLY",
    authorization_id: id,
    funding_request_id: EXPECTED.request_id,
    maximum_submission_attempts: 1,
    automatic_retry: false,
    signing_authorized: false,
    broadcast_authorized: false,
    funds_movement_authorized: false,
  });
}

export function buildAuthorizedUnsignedFundingTransactionV1(request, auth) {
  const verified = verifyFundingAuthorizationV1(request, auth);

  const transaction = Transaction.from({
    type: 2,
    chainId: BigInt(EXPECTED.chain_id),
    nonce: Number(EXPECTED.nonce),
    to: EXPECTED.destination,
    value: BigInt(EXPECTED.value_wei),
    gasLimit: BigInt(EXPECTED.gas_limit),
    maxFeePerGas: BigInt(EXPECTED.max_fee_per_gas_wei),
    maxPriorityFeePerGas: BigInt(EXPECTED.max_priority_fee_per_gas_wei),
    data: "0x",
    accessList: [],
  });

  if (
    transaction.from !== null ||
    transaction.signature !== null ||
    transaction.unsignedHash == null ||
    transaction.unsignedSerialized == null
  ) {
    fail("unsigned_transaction_shape_invalid");
  }

  return Object.freeze({
    marker: "VOID_WC_VOID_MARKET_VAULT_DEPLOYER_GAS_UNSIGNED_FUNDING_V1",
    version: 1,
    status: "unsigned_exact_transaction_ready_for_fresh_revalidation",
    authorization_id: verified.authorization_id,
    funding_request_id: verified.funding_request_id,
    transaction: Object.freeze({
      chain_id: EXPECTED.chain_id,
      transaction_type: 2,
      source: EXPECTED.source,
      destination: EXPECTED.destination,
      nonce: EXPECTED.nonce,
      value_wei: EXPECTED.value_wei,
      gas_limit: EXPECTED.gas_limit,
      max_fee_per_gas_wei: EXPECTED.max_fee_per_gas_wei,
      max_priority_fee_per_gas_wei: EXPECTED.max_priority_fee_per_gas_wei,
      data: "0x",
      access_list: Object.freeze([]),
      unsigned_transaction_hash: transaction.unsignedHash,
      unsigned_serialized: transaction.unsignedSerialized,
      unsigned_serialized_sha256: crypto
        .createHash("sha256")
        .update(Buffer.from(transaction.unsignedSerialized.slice(2), "hex"))
        .digest("hex"),
    }),
    authority: Object.freeze({
      source_selection_authorized: true,
      unsigned_transaction_construction_authorized: true,
      private_key_access_authorized: false,
      transaction_signing_authorized: false,
      transaction_broadcast_authorized: false,
      chain2050_write_authorized: false,
      funds_movement_authorized: false,
      automatic_retry: false,
      replacement_transaction_authorized: false,
      maximum_submission_attempts: 1,
    }),
    next_gate:
      "fresh_source_nonce_balance_revalidation_then_separate_exact_signing_and_broadcast_authorization",
  });
}

async function main() {
  const request = JSON.parse(
    fs.readFileSync(
      "ops/mainnet0/wc-void-market-vault-deployer-gas-funding-request-v1.json",
      "utf8",
    ),
  );
  const auth = JSON.parse(
    fs.readFileSync(
      "ops/mainnet0/wc-void-market-vault-deployer-gas-funding-authorization-v1.json",
      "utf8",
    ),
  );

  const result =
    auth.status === "authorization_pending"
      ? verifyPendingAuthorizationV1(request, auth)
      : buildAuthorizedUnsignedFundingTransactionV1(request, auth);
  process.stdout.write(JSON.stringify(result, null, 2) + "\n");
}

if (process.argv[1]?.endsWith(
  "void-wc-void-market-vault-deployer-gas-funding-authorization-v1.mjs"
)) {
  main().catch((error) => {
    console.error(error?.code || error?.message || error);
    process.exit(1);
  });
}
