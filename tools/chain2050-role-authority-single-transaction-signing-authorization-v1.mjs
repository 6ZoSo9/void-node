#!/usr/bin/env node
import crypto from "node:crypto";

export const MARKER =
  "VOID_CHAIN2050_ROLE_AUTHORITY_SINGLE_TRANSACTION_SIGNING_AUTHORIZATION_V1";

export const EXPECTED = Object.freeze({
  signing_request_id:
    "voidcrasr1_2eef907499d684facb777d42c754e23207a02c646dd5e55923e0e0204eeadf2a",
  unsigned_transaction_hash:
    "0xc5982072b34a49c3f8ead20cd8e358e8711a620f91ff4aeae0e9a7072d600f25",
  candidate_fingerprint_sha256:
    "a67c90c030cc3a728ca611b620fe4ae8598a47284b2ca69238717583062c6c42",
  signer_address:
    "0x4d0a1149d13b03448c56ee6582d161159c5e537f",
  owner_address:
    "0xe1f147b6b2671f140c4107fa4a1dd5f7cbd06d0b",
  predicted_contract_address:
    "0xe4e9a5a8e5ac3a99176fcf50ba986a374577de49",
  nonce: "0",
  chain_id: "2050",
  gas_limit: "2402981",
  max_fee_per_gas_wei: "3000000000",
  max_priority_fee_per_gas_wei: "1000000000",
  deployment_data_sha256:
    "1f6f97cabc21b54875f1b181b27153be75ee261a6bc5d77ff30c993187fab068",
  deployment_data_keccak256:
    "0xa0a33788745d22d83b2cbf0058912abe19d8cc34d2403252fd4c95cf3b5786f6",
});

export const AUTHORITY_V1 = Object.freeze({
  exact_single_transaction_signing_authorized: true,
  offline_nimo_signer_required: true,
  exact_unsigned_hash_reverification_required: true,
  signer_address_reverification_required: true,
  signed_transaction_self_verification_required: true,
  raw_signed_transaction_export_authorized: true,
  private_key_export_authorized: false,
  private_key_print_authorized: false,
  transaction_broadcast_authorized: false,
  deployment_authorized: false,
  chain2050_mutation_authorized: false,
  registry_append_authorized: false,
  production_activation_authorized: false,
  funds_action_authorized: false,
  automatic_retry_authorized: false,
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
  throw new Error(code);
}

export function verifyRoleAuthoritySingleTransactionSigningAuthorizationV1(
  authorization,
) {
  if (
    !authorization ||
    authorization.marker !== MARKER ||
    authorization.version !== 1 ||
    authorization.decision !==
      "AUTHORIZED_EXACT_SINGLE_TRANSACTION_SIGNING_ONLY"
  ) {
    fail("authorization_shape_invalid");
  }

  const expectedPairs = [
    [authorization.signing_request_id, EXPECTED.signing_request_id],
    [authorization.exact_unsigned_transaction_hash, EXPECTED.unsigned_transaction_hash],
    [authorization.candidate_fingerprint_sha256, EXPECTED.candidate_fingerprint_sha256],
    [String(authorization.chain_id), EXPECTED.chain_id],
    [String(authorization.signer_address).toLowerCase(), EXPECTED.signer_address],
    [String(authorization.owner_address).toLowerCase(), EXPECTED.owner_address],
    [String(authorization.predicted_contract_address).toLowerCase(), EXPECTED.predicted_contract_address],
    [String(authorization.nonce), EXPECTED.nonce],
    [String(authorization.gas_limit), EXPECTED.gas_limit],
    [String(authorization.max_fee_per_gas_wei), EXPECTED.max_fee_per_gas_wei],
    [String(authorization.max_priority_fee_per_gas_wei), EXPECTED.max_priority_fee_per_gas_wei],
    [String(authorization.deployment_data_sha256), EXPECTED.deployment_data_sha256],
    [String(authorization.deployment_data_keccak256).toLowerCase(), EXPECTED.deployment_data_keccak256],
  ];
  for (const [actual, expected] of expectedPairs) {
    if (actual !== expected) {
      fail("authorization_exact_binding_mismatch");
    }
  }

  const scope = authorization.authorization;
  if (
    !scope ||
    scope.source !== "interactive_sovereign_authorization" ||
    scope.exact_request_identified !== true ||
    scope.signing_authorized !== true ||
    scope.one_transaction_only !== true ||
    scope.signer_must_be_offline_nimo !== true ||
    scope.raw_signed_transaction_may_be_exported_for_verification !== true ||
    scope.broadcast_authorized !== false ||
    scope.deployment_authorized !== false ||
    scope.registry_append_authorized !== false ||
    scope.production_activation_authorized !== false ||
    scope.funds_action_authorized !== false ||
    scope.automatic_retry_authorized !== false
  ) {
    fail("authorization_scope_invalid");
  }

  const normalized = {
    signing_request_id: authorization.signing_request_id,
    exact_unsigned_transaction_hash:
      authorization.exact_unsigned_transaction_hash,
    candidate_fingerprint_sha256:
      authorization.candidate_fingerprint_sha256,
    signer_address: authorization.signer_address.toLowerCase(),
    nonce: String(authorization.nonce),
    chain_id: String(authorization.chain_id),
    gas_limit: String(authorization.gas_limit),
    max_fee_per_gas_wei: String(authorization.max_fee_per_gas_wei),
    max_priority_fee_per_gas_wei:
      String(authorization.max_priority_fee_per_gas_wei),
    deployment_data_sha256:
      String(authorization.deployment_data_sha256),
    predicted_contract_address:
      authorization.predicted_contract_address.toLowerCase(),
    scope: {
      signing_authorized: true,
      one_transaction_only: true,
      broadcast_authorized: false,
      deployment_authorized: false,
    },
  };

  return Object.freeze({
    ok: true,
    marker: MARKER,
    authorization_id:
      "voidcrasta1_" + sha256(canonical(normalized)),
    ...normalized,
    authority: AUTHORITY_V1,
    next_gate:
      "offline_nimo_sign_exact_authorized_transaction_then_independent_signed_transaction_verification",
  });
}
