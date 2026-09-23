#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  EXPECTED,
  verifyRoleAuthorityCheckpointSigningAuthorizationV1,
} from "../tools/chain2050-role-authority-checkpoint-signing-authorization-v1.mjs";

const authorization = JSON.parse(
  fs.readFileSync(
    "ops/mainnet0/chain2050-role-authority-checkpoint-signing-authorization-v1.json",
    "utf8",
  ),
);

const result =
  verifyRoleAuthorityCheckpointSigningAuthorizationV1(authorization);

assert.equal(result.ok, true);
assert.equal(result.authorization_id, EXPECTED.authorization_id);
assert.equal(result.checkpoint_request_id, EXPECTED.checkpoint_request_id);
assert.equal(result.attestation_body_sha256, EXPECTED.attestation_body_sha256);
assert.equal(result.request_file_sha256, EXPECTED.request_file_sha256);
assert.equal(
  result.signer_public_key_der_sha256,
  EXPECTED.signer_public_key_der_sha256,
);
assert.equal(result.signature_count_max, 1);
assert.equal(result.sovereign_private_key_access_authorized, true);
assert.equal(result.signature_creation_authorized, true);
assert.equal(result.transaction_broadcast_authorized, false);
assert.equal(result.chain2050_write_authorized, false);
assert.equal(result.registry_append_authorized, false);
assert.equal(result.funds_action_authorized, false);

const source = fs.readFileSync(
  "tools/chain2050-role-authority-checkpoint-signing-authorization-v1.mjs",
  "utf8",
);
for (const forbidden of [
  "crypto.sign(",
  "createPrivateKey(",
  "eth_sendRawTransaction",
  "eth_sendTransaction",
  "broadcastTransaction(",
]) {
  assert.equal(source.includes(forbidden), false, forbidden);
}

console.log(
  "VOID_CHAIN2050_ROLE_AUTHORITY_CHECKPOINT_SIGNING_AUTHORIZATION_V1_GREEN",
);
console.log("authorization_id=" + result.authorization_id);
console.log("checkpoint_request_id=" + result.checkpoint_request_id);
console.log("signature_count_max=1");
console.log("sovereign_primary_required=true");
console.log("transaction_broadcast_authorized=false");
console.log("chain2050_write_authorized=false");
console.log("registry_append_authorized=false");
console.log("funds_action_authorized=false");
