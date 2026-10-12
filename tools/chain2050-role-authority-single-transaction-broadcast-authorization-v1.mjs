#!/usr/bin/env node
import crypto from "node:crypto";

export const MARKER =
  "VOID_CHAIN2050_ROLE_AUTHORITY_SINGLE_TRANSACTION_BROADCAST_AUTHORIZATION_V1";

export const EXPECTED = Object.freeze({
  broadcast_authorization_request_id:
    "voidcrabr1_661c57638e7c9904df997da50841811f509239495891a965aebd46fece405a51",
  prebroadcast_observation_id:
    "voidcrapb1_fb84f2385f9f80c8cf2b5ff9aae2adea835e72c663228b5ddebca4f8ad3f91e2",
  signed_transaction_hash:
    "0x8da8cc5a8e126158bdc0e003c5521699939d95a26a72a933969cf6de15d88dd4",
  signed_transaction_file_sha256:
    "96b5d004284e511c12b40f2de627c9a214656e025883b8cd7adec1b82348334d",
  signing_request_id:
    "voidcrasr1_2eef907499d684facb777d42c754e23207a02c646dd5e55923e0e0204eeadf2a",
  signing_authorization_id:
    "voidcrasta1_e036437731cfe4bea160f3de3542fd60d6809d0ca773128a01f2bdd0bbc88d20",
  signer_address:
    "0x4d0a1149d13b03448c56ee6582d161159c5e537f",
  chain_id: "2050",
  nonce: "0",
  transaction_value_wei: "0",
  predicted_contract_address:
    "0xe4e9a5a8e5ac3a99176fcf50ba986a374577de49",
  signed_gas_limit: "2402981",
  signed_max_fee_per_gas_wei: "3000000000",
  signed_max_priority_fee_per_gas_wei: "1000000000",
});

export const EXPECTED_AUTHORIZATION_ID =
  "voidcraba1_66779fab9c8657d7f038585525dfc2ac688adfe33cf10a5d5827abb140e04c85";

function canonical(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  return "{" +
    Object.keys(value).sort()
      .map((key) => JSON.stringify(key) + ":" + canonical(value[key]))
      .join(",") +
    "}";
}

function sha256(value) {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function fail(code) {
  throw new Error(code);
}

export function verifyRoleAuthoritySingleTransactionBroadcastAuthorizationV1(
  authorization,
) {
  if (
    !authorization ||
    authorization.marker !== MARKER ||
    authorization.version !== 1 ||
    authorization.decision !==
      "AUTHORIZED_EXACT_SIGNED_TRANSACTION_SINGLE_BROADCAST_ONLY"
  ) {
    fail("broadcast_authorization_shape_invalid");
  }

  const expectedPairs = [
    [authorization.broadcast_authorization_request_id, EXPECTED.broadcast_authorization_request_id],
    [authorization.prebroadcast_observation_id, EXPECTED.prebroadcast_observation_id],
    [String(authorization.signed_transaction_hash).toLowerCase(), EXPECTED.signed_transaction_hash],
    [authorization.signed_transaction_file_sha256, EXPECTED.signed_transaction_file_sha256],
    [authorization.signing_request_id, EXPECTED.signing_request_id],
    [authorization.signing_authorization_id, EXPECTED.signing_authorization_id],
    [String(authorization.signer_address).toLowerCase(), EXPECTED.signer_address],
    [String(authorization.chain_id), EXPECTED.chain_id],
    [String(authorization.nonce), EXPECTED.nonce],
    [String(authorization.transaction_value_wei), EXPECTED.transaction_value_wei],
    [String(authorization.predicted_contract_address).toLowerCase(), EXPECTED.predicted_contract_address],
    [String(authorization.signed_gas_limit), EXPECTED.signed_gas_limit],
    [String(authorization.signed_max_fee_per_gas_wei), EXPECTED.signed_max_fee_per_gas_wei],
    [String(authorization.signed_max_priority_fee_per_gas_wei), EXPECTED.signed_max_priority_fee_per_gas_wei],
  ];
  for (const [actual, expected] of expectedPairs) {
    if (actual !== expected) fail("broadcast_authorization_exact_binding_mismatch");
  }

  const scope = authorization.authorization;
  if (
    !scope ||
    scope.source !== "interactive_sovereign_authorization" ||
    scope.exact_request_identified !== true ||
    scope.exact_signed_transaction_identified !== true ||
    scope.transaction_broadcast_authorized !== true ||
    scope.exact_signed_transaction_only !== true ||
    scope.one_submission_attempt_only !== true ||
    scope.exact_contract_creation_consequence_authorized !== true ||
    scope.exact_gas_fee_spend_authorized !== true ||
    scope.additional_value_transfer_authorized !== false ||
    scope.replacement_transaction_authorized !== false ||
    scope.automatic_retry_authorized !== false ||
    scope.unrelated_deployment_authorized !== false ||
    scope.unrelated_funds_action_authorized !== false
  ) {
    fail("broadcast_authorization_scope_invalid");
  }

  const normalized = {
    broadcast_authorization_request_id:
      authorization.broadcast_authorization_request_id,
    prebroadcast_observation_id:
      authorization.prebroadcast_observation_id,
    signed_transaction_hash:
      authorization.signed_transaction_hash.toLowerCase(),
    signed_transaction_file_sha256:
      authorization.signed_transaction_file_sha256,
    signing_request_id:
      authorization.signing_request_id,
    signing_authorization_id:
      authorization.signing_authorization_id,
    signer_address:
      authorization.signer_address.toLowerCase(),
    chain_id:
      String(authorization.chain_id),
    nonce:
      String(authorization.nonce),
    transaction_value_wei:
      String(authorization.transaction_value_wei),
    predicted_contract_address:
      authorization.predicted_contract_address.toLowerCase(),
    signed_gas_limit:
      String(authorization.signed_gas_limit),
    signed_max_fee_per_gas_wei:
      String(authorization.signed_max_fee_per_gas_wei),
    signed_max_priority_fee_per_gas_wei:
      String(authorization.signed_max_priority_fee_per_gas_wei),
    scope: {
      transaction_broadcast_authorized: true,
      exact_signed_transaction_only: true,
      one_submission_attempt_only: true,
      exact_contract_creation_consequence_authorized: true,
      exact_gas_fee_spend_authorized: true,
      additional_value_transfer_authorized: false,
      replacement_transaction_authorized: false,
      automatic_retry_authorized: false,
    },
  };

  const authorizationId =
    "voidcraba1_" + sha256(canonical(normalized));

  if (authorizationId !== EXPECTED_AUTHORIZATION_ID) {
    fail("broadcast_authorization_id_mismatch");
  }

  return Object.freeze({
    ok: true,
    marker: MARKER,
    authorization_id: authorizationId,
    ...normalized,
    authority: {
      exact_single_transaction_broadcast_authorized: true,
      exact_contract_creation_consequence_authorized: true,
      exact_gas_fee_spend_authorized: true,
      additional_value_transfer_authorized: false,
      replacement_transaction_authorized: false,
      automatic_retry_authorized: false,
      durable_consumption_before_broadcaster_access_required: true,
      fresh_execution_preflight_before_consumption_required: true,
    },
    next_gate:
      "fresh_execution_preflight_then_durable_single_use_broadcast_authorization_consumption_v1",
  });
}
