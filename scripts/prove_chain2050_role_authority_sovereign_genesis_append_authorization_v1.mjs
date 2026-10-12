#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

import { verifySovereignGenesisAppendAuthorizationV1 } from "../tools/chain2050-role-authority-sovereign-genesis-append-authorization-v1.mjs";

const v = JSON.parse(fs.readFileSync(
  "ops/mainnet0/chain2050-role-authority-sovereign-genesis-append-authorization-v1.json",
  "utf8"
));
const r = verifySovereignGenesisAppendAuthorizationV1(v);

assert.equal(r.ok, true);
assert.equal(r.authorization_id, "voidcrasgaa1_fb46e3048b5921da3856de4548823b61f32e64f423bf5e7fd4758b9e04e27355");
assert.equal(r.append_request_id, "voidcrasgar1_e97b68fcbb085aec3b0e502d4e00b5e662d3a13374a87cbe51e0a8a687e27481");
assert.equal(r.unsigned_transaction_hash, "0x568f531f93d6949adc0767cf4384a279b471edb389e18268511182ca6c51de34");
assert.equal(r.owner_address, "0xe1f147b6b2671f140c4107fa4a1dd5f7cbd06d0b");
assert.equal(r.role_record_sha256, "1492c4d55f5c6d4873a28ca08d641196ba51d9e5c0a7c1cc31f27bf1a6405b0b");
assert.equal(r.predicted_registry_root_sha256, "54619d93d1f94746cb92c3bb4de038d014d5c90b73789581486b4a12b4322041");
assert.equal(r.maximum_submission_attempts, 1);
assert.equal(r.automatic_retry, false);

console.log("VOID_CHAIN2050_ROLE_AUTHORITY_SOVEREIGN_GENESIS_APPEND_AUTHORIZATION_V1_GREEN");
console.log("authorization_id=" + r.authorization_id);
console.log("append_request_id=" + r.append_request_id);
console.log("unsigned_transaction_hash=" + r.unsigned_transaction_hash);
console.log("owner_address=" + r.owner_address);
console.log("role_record_sha256=" + r.role_record_sha256);
console.log("predicted_registry_root_sha256=" + r.predicted_registry_root_sha256);
console.log("maximum_submission_attempts=1");
console.log("automatic_retry=false");
