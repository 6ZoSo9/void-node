#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  verifySovereignLiveIdentityEvidenceV1,
} from "../tools/chain2050-role-authority-sovereign-live-identity-evidence-v1.mjs";

const evidence = JSON.parse(
  fs.readFileSync(
    "ops/mainnet0/chain2050-role-authority-sovereign-live-identity-evidence-v1.json",
    "utf8",
  ),
);
const result = verifySovereignLiveIdentityEvidenceV1(evidence);

assert.equal(result.ok, true);
assert.equal(
  result.live_identity_evidence_id,
  "voidcraslie1_88246d9a99f8a677e851e126ad860e6f57871f35275e1ca4eb9166c71e6536b2",
);
assert.equal(
  result.genesis_preparation_id,
  "voidcrasgp1_4aac5c1bb4b7500c9dc15df53f36722a44471b9d52b61063528d49602a2348ee",
);
assert.equal(result.node_id, "9d89483769e469e0473b489dc50dba96");
assert.equal(
  result.public_key_der_sha256,
  "2f52b928cb00bf309510d1edef299554277fba6d52bfd1ddb52b9b015397c50b",
);
assert.equal(
  result.subject_binding_sha256,
  "7945ba03feac32e5268382a8b995eb7c927a084d9dd1d44598ffb340a12a770e",
);

const source = fs.readFileSync(
  "tools/chain2050-role-authority-sovereign-live-identity-evidence-v1.mjs",
  "utf8",
);
for (const forbidden of [
  "crypto.sign(",
  "createPrivateKey(",
  "eth_sendRawTransaction",
  "eth_sendTransaction",
  "broadcastTransaction(",
  "BEGIN PRIVATE KEY",
]) {
  assert.equal(source.includes(forbidden), false, forbidden);
}

console.log(
  "VOID_CHAIN2050_ROLE_AUTHORITY_SOVEREIGN_LIVE_IDENTITY_EVIDENCE_V1_GREEN",
);
console.log("live_identity_evidence_id=" + result.live_identity_evidence_id);
console.log("genesis_preparation_id=" + result.genesis_preparation_id);
console.log("node_id=" + result.node_id);
console.log("public_key_der_sha256=" + result.public_key_der_sha256);
console.log("subject_binding_sha256=" + result.subject_binding_sha256);
console.log("chain2050_write=false");
console.log("registry_append=false");
console.log("transaction_broadcast=false");
