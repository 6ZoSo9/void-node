#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import { verifyFundingRequestEvidenceV1 } from "../tools/chain2050-role-authority-sovereign-owner-gas-funding-request-evidence-v1.mjs";

const v = JSON.parse(fs.readFileSync(
  "ops/mainnet0/chain2050-role-authority-sovereign-owner-gas-funding-request-evidence-v1.json",
  "utf8"
));
const r = verifyFundingRequestEvidenceV1(v);
assert.equal(r.ok, true);
assert.equal(r.funding_request_evidence_id, "voidcrasgfre1_13d8939436ef22b7deb461aa30416e985ac05947c1df63bf39cdb95696e08cfe");
assert.equal(r.funding_request_id, "voidcrasgf1_e7377ba46ccd646fdfe72aec1aeaef1bc451a0918034906dfd67bf8f3d031d8b");
assert.equal(r.unsigned_transaction_hash, "0x9b67e9e6fe373b664446a1b21fc49457ea109227a184f132005198da186a4df6");
assert.equal(r.value_wei, "500000000000000");
assert.equal(r.funding_authorized, false);

const source = fs.readFileSync(
  "tools/chain2050-role-authority-sovereign-owner-gas-funding-request-evidence-v1.mjs",
  "utf8"
);
for (const forbidden of ["createPrivateKey(", "crypto.sign(", "eth_sendRawTransaction", "eth_sendTransaction", "broadcastTransaction("]) {
  assert.equal(source.includes(forbidden), false, forbidden);
}

console.log("VOID_CHAIN2050_ROLE_AUTHORITY_SOVEREIGN_OWNER_GAS_FUNDING_REQUEST_EVIDENCE_V1_GREEN");
console.log("funding_request_evidence_id=" + r.funding_request_evidence_id);
console.log("funding_request_id=" + r.funding_request_id);
console.log("unsigned_transaction_hash=" + r.unsigned_transaction_hash);
console.log("value_wei=" + r.value_wei);
console.log("funding_authorized=false");
console.log("transaction_broadcast=false");
console.log("chain2050_write=false");
