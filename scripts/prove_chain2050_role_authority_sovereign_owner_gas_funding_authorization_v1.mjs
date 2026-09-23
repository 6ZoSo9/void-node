#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import { verifyFundingAuthorizationV1 } from "../tools/chain2050-role-authority-sovereign-owner-gas-funding-authorization-v1.mjs";

const v = JSON.parse(fs.readFileSync(
  "ops/mainnet0/chain2050-role-authority-sovereign-owner-gas-funding-authorization-v1.json",
  "utf8"
));
const r = verifyFundingAuthorizationV1(v);
assert.equal(r.ok, true);
assert.equal(r.authorization_id, "voidcrasgfa1_bfa53d809d212e947f791b856bf0738b0c4ec8eb1522a80fd75e9eba2ea124cc");
assert.equal(r.funding_request_id, "voidcrasgf1_e7377ba46ccd646fdfe72aec1aeaef1bc451a0918034906dfd67bf8f3d031d8b");
assert.equal(r.unsigned_transaction_hash, "0x9b67e9e6fe373b664446a1b21fc49457ea109227a184f132005198da186a4df6");
assert.equal(r.maximum_submission_attempts, 1);
assert.equal(r.automatic_retry, false);

console.log("VOID_CHAIN2050_ROLE_AUTHORITY_SOVEREIGN_OWNER_GAS_FUNDING_AUTHORIZATION_V1_GREEN");
console.log("authorization_id=" + r.authorization_id);
console.log("funding_request_id=" + r.funding_request_id);
console.log("unsigned_transaction_hash=" + r.unsigned_transaction_hash);
console.log("maximum_submission_attempts=1");
console.log("automatic_retry=false");
console.log("registry_append_authorized=false");
