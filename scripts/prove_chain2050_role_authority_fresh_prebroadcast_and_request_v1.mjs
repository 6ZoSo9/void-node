#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  EXPECTED,
  verifyRoleAuthorityFreshPrebroadcastEvidenceV1,
} from "../tools/chain2050-role-authority-fresh-prebroadcast-evidence-v1.mjs";
import {
  EXPECTED_REQUEST_ID,
  buildRoleAuthorityBroadcastAuthorizationRequestV1,
} from "../tools/chain2050-role-authority-broadcast-authorization-request-v1.mjs";

const evidence = JSON.parse(
  fs.readFileSync(
    "ops/mainnet0/chain2050-role-authority-fresh-prebroadcast-precision-v1.json",
    "utf8",
  ),
);

const verified =
  verifyRoleAuthorityFreshPrebroadcastEvidenceV1(evidence);
assert.equal(verified.ok, true);
assert.equal(
  verified.prebroadcast_observation_id,
  EXPECTED.observation_id,
);
assert.equal(
  verified.decision,
  "HOLD_PENDING_EXPLICIT_SINGLE_TRANSACTION_BROADCAST_AUTHORIZATION",
);
assert.equal(
  verified.authority.transaction_broadcast,
  false,
);

const request =
  buildRoleAuthorityBroadcastAuthorizationRequestV1(
    verified,
  );
assert.equal(
  request.broadcast_authorization_request_id,
  EXPECTED_REQUEST_ID,
);
assert.equal(
  request.status,
  "HOLD_PENDING_EXPLICIT_SOVEREIGN_SINGLE_TRANSACTION_BROADCAST_AUTHORIZATION",
);
assert.equal(
  request.scope.broadcast_authorized,
  false,
);
assert.equal(
  request.authority.transaction_broadcast_authorized,
  false,
);
assert.equal(
  request.authority.deployment_authorized,
  false,
);
assert.equal(
  request.authority.chain2050_mutation_authorized,
  false,
);

const badNonce = structuredClone(evidence);
badNonce.pending_nonce = "1";
assert.throws(
  () => verifyRoleAuthorityFreshPrebroadcastEvidenceV1(badNonce),
  /fresh_prebroadcast_chain_state_invalid/,
);

const badFee = structuredClone(evidence);
badFee.observed_two_x_base_plus_priority_wei =
  "3000000001";
assert.throws(
  () => verifyRoleAuthorityFreshPrebroadcastEvidenceV1(badFee),
  /fresh_prebroadcast_signed_envelope_invalid/,
);

const inEnvelopeFeeDrift = structuredClone(evidence);
inEnvelopeFeeDrift.base_fee_per_gas_wei = "8";
inEnvelopeFeeDrift.observed_two_x_base_plus_priority_wei =
  "1000000016";
assert.throws(
  () =>
    verifyRoleAuthorityFreshPrebroadcastEvidenceV1(
      inEnvelopeFeeDrift,
    ),
  /fresh_prebroadcast_observation_id_mismatch/,
);

const badAuthority = structuredClone(evidence);
badAuthority.authority.transaction_broadcast = true;
assert.throws(
  () => verifyRoleAuthorityFreshPrebroadcastEvidenceV1(badAuthority),
  /fresh_prebroadcast_authority_boundary_invalid/,
);

for (const file of [
  "tools/chain2050-role-authority-fresh-prebroadcast-evidence-v1.mjs",
  "tools/chain2050-role-authority-broadcast-authorization-request-v1.mjs",
]) {
  const source = fs.readFileSync(file, "utf8");
  for (const forbidden of [
    "eth_sendRawTransaction",
    "eth_sendTransaction",
    "broadcastTransaction(",
    "sendTransaction(",
    "signTransaction(",
    "privateKey",
    "mnemonic",
  ]) {
    assert.equal(source.includes(forbidden), false, file + ":" + forbidden);
  }
}

console.log(
  "VOID_CHAIN2050_ROLE_AUTHORITY_FRESH_PREBROADCAST_AND_REQUEST_V1_GREEN",
);
console.log(
  "prebroadcast_observation_id=" +
    verified.prebroadcast_observation_id,
);
console.log(
  "broadcast_authorization_request_id=" +
    request.broadcast_authorization_request_id,
);
console.log(
  "signed_transaction_hash=" +
    request.signed_transaction_hash,
);
console.log("transaction_broadcast_authorized=false");
console.log("deployment_authorized=false");
console.log("chain2050_mutation_authorized=false");
console.log("automatic_retry_authorized=false");
console.log(
  "status=HOLD_PENDING_EXPLICIT_SOVEREIGN_SINGLE_TRANSACTION_BROADCAST_AUTHORIZATION",
);
