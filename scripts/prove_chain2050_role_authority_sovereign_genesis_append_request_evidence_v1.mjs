#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import { verifySovereignGenesisAppendRequestEvidenceV1 } from "../tools/chain2050-role-authority-sovereign-genesis-append-request-evidence-v1.mjs";

const v = JSON.parse(fs.readFileSync(
  "ops/mainnet0/chain2050-role-authority-sovereign-genesis-append-request-evidence-v1.json",
  "utf8"
));
const r = verifySovereignGenesisAppendRequestEvidenceV1(v);

assert.equal(r.ok, true);
assert.equal(r.append_request_evidence_id, "voidcrasgare1_1bb67737a3af758f1be51474ddced95c6b366b3b5e7ee04994841021238c804d");
assert.equal(r.append_request_id, "voidcrasgar1_e97b68fcbb085aec3b0e502d4e00b5e662d3a13374a87cbe51e0a8a687e27481");
assert.equal(r.unsigned_transaction_hash, "0x568f531f93d6949adc0767cf4384a279b471edb389e18268511182ca6c51de34");
assert.equal(r.role_record_sha256, "1492c4d55f5c6d4873a28ca08d641196ba51d9e5c0a7c1cc31f27bf1a6405b0b");
assert.equal(r.predicted_registry_root_sha256, "54619d93d1f94746cb92c3bb4de038d014d5c90b73789581486b4a12b4322041");
assert.equal(r.registry_append_authorized, false);

const source = fs.readFileSync(
  "tools/chain2050-role-authority-sovereign-genesis-append-request-evidence-v1.mjs",
  "utf8"
);
for (const forbidden of [
  "createPrivateKey(",
  "crypto.sign(",
  "eth_sendRawTransaction",
  "eth_sendTransaction",
  "broadcastTransaction("
]) {
  assert.equal(source.includes(forbidden), false, forbidden);
}

console.log("VOID_CHAIN2050_ROLE_AUTHORITY_SOVEREIGN_GENESIS_APPEND_REQUEST_EVIDENCE_V1_GREEN");
console.log("append_request_evidence_id=" + r.append_request_evidence_id);
console.log("append_request_id=" + r.append_request_id);
console.log("unsigned_transaction_hash=" + r.unsigned_transaction_hash);
console.log("role_record_sha256=" + r.role_record_sha256);
console.log("predicted_registry_root_sha256=" + r.predicted_registry_root_sha256);
console.log("registry_append_authorized=false");
