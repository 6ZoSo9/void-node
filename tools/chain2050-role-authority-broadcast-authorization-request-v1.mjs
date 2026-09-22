#!/usr/bin/env node
import crypto from "node:crypto";

export const MARKER =
  "VOID_CHAIN2050_ROLE_AUTHORITY_BROADCAST_AUTHORIZATION_REQUEST_V1";

export const EXPECTED_REQUEST_ID =
  "voidcrabr1_661c57638e7c9904df997da50841811f509239495891a965aebd46fece405a51";

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

export function buildRoleAuthorityBroadcastAuthorizationRequestV1(
  verified,
) {
  if (
    !verified ||
    verified.ok !== true ||
    verified.prebroadcast_observation_id !==
      "voidcrapb1_fb84f2385f9f80c8cf2b5ff9aae2adea835e72c663228b5ddebca4f8ad3f91e2" ||
    verified.decision !==
      "HOLD_PENDING_EXPLICIT_SINGLE_TRANSACTION_BROADCAST_AUTHORIZATION"
  ) {
    fail("verified_prebroadcast_observation_required");
  }

  const requestBody = {
    schema:
      "void.chain2050-role-authority-broadcast-authorization-request.v1",
    prebroadcast_observation_id:
      verified.prebroadcast_observation_id,
    signing_request_id:
      verified.signing_request_id,
    signing_authorization_id:
      verified.signing_authorization_id,
    signed_transaction_hash:
      verified.signed_transaction_hash,
    signed_transaction_file_sha256:
      verified.signed_transaction_file_sha256,
    signer_address:
      verified.signer_address,
    chain_id:
      verified.chain_id,
    nonce: "0",
    predicted_contract_address:
      verified.predicted_contract_address,
    observation_block_number:
      verified.observation_block_number,
    observation_block_hash:
      verified.observation_block_hash,
    scope: {
      single_transaction_only: true,
      exact_signed_transaction_only: true,
      automatic_retry: false,
      broadcast_authorized: false,
      deployment_authorized: false,
      funds_action_authorized: false,
    },
    required_authorization:
      "explicit_sovereign_authorization_for_exact_signed_transaction_hash_and_request_id",
  };

  const requestId =
    "voidcrabr1_" + sha256(canonical(requestBody));

  if (requestId !== EXPECTED_REQUEST_ID) {
    fail("broadcast_authorization_request_id_mismatch");
  }

  return Object.freeze({
    marker: MARKER,
    version: 1,
    status:
      "HOLD_PENDING_EXPLICIT_SOVEREIGN_SINGLE_TRANSACTION_BROADCAST_AUTHORIZATION",
    broadcast_authorization_request_id:
      requestId,
    ...requestBody,
    authority: {
      request_only: true,
      transaction_broadcast_authorized: false,
      deployment_authorized: false,
      chain2050_mutation_authorized: false,
      funds_action_authorized: false,
      automatic_retry_authorized: false,
    },
    next_gate:
      "explicit_sovereign_decision_naming_exact_request_id_or_signed_transaction_hash",
  });
}
