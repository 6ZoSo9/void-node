#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  EXPECTED,
  verifyRoleAuthorityCheckpointRequestPrecisionEvidenceV1,
} from "../tools/chain2050-role-authority-checkpoint-request-evidence-v1.mjs";

const evidence = JSON.parse(
  fs.readFileSync(
    "ops/mainnet0/chain2050-role-authority-checkpoint-request-precision-evidence-v1.json",
    "utf8",
  ),
);

const verified =
  verifyRoleAuthorityCheckpointRequestPrecisionEvidenceV1(evidence);

assert.equal(verified.ok, true);
assert.match(
  verified.checkpoint_request_evidence_id,
  /^voidcracpre1_[0-9a-f]{64}$/,
);
assert.equal(
  verified.checkpoint_request_id,
  EXPECTED.checkpoint_request_id,
);
assert.equal(
  verified.request_file_sha256,
  EXPECTED.request_file_sha256,
);
assert.equal(
  verified.attestation_body_sha256,
  EXPECTED.attestation_body_sha256,
);
assert.equal(
  verified.authority.signing_authorized,
  false,
);
assert.equal(
  verified.authority.sovereign_private_key_access,
  false,
);
assert.equal(
  verified.authority.transaction_broadcast_authorized,
  false,
);
assert.equal(
  verified.authority.chain2050_write_authorized,
  false,
);

const source = fs.readFileSync(
  "tools/chain2050-role-authority-checkpoint-request-evidence-v1.mjs",
  "utf8",
);
for (const forbidden of [
  "crypto.sign(",
  "createPrivateKey",
  "eth_sendRawTransaction",
  "eth_sendTransaction",
  "signTransaction(",
  "signMessage(",
  "privateKey",
  "mnemonic",
]) {
  assert.equal(source.includes(forbidden), false, forbidden);
}

console.log(
  "VOID_CHAIN2050_ROLE_AUTHORITY_CHECKPOINT_REQUEST_PRECISION_EVIDENCE_V1_GREEN",
);
console.log(
  "checkpoint_request_evidence_id=" +
    verified.checkpoint_request_evidence_id,
);
console.log(
  "checkpoint_request_id=" +
    verified.checkpoint_request_id,
);
console.log(
  "attestation_body_sha256=" +
    verified.attestation_body_sha256,
);
console.log(
  "request_file_sha256=" +
    verified.request_file_sha256,
);
console.log("confirmation_count=12");
console.log("checkpoint_ancestry_exact=true");
console.log("signing_authorized=false");
console.log("sovereign_private_key_access=false");
console.log("transaction_broadcast=false");
console.log("chain2050_write=false");
