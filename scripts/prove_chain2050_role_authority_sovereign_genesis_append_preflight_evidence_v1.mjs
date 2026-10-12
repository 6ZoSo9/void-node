#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import { verifySovereignGenesisAppendPreflightEvidenceV1 } from "../tools/chain2050-role-authority-sovereign-genesis-append-preflight-evidence-v1.mjs";

const value = JSON.parse(fs.readFileSync(
  "ops/mainnet0/chain2050-role-authority-sovereign-genesis-append-preflight-evidence-v1.json",
  "utf8"
));
const result = verifySovereignGenesisAppendPreflightEvidenceV1(value);
assert.equal(result.ok, true);
assert.equal(result.preflight_evidence_id, "voidcrasgap1_a0af95011a1fb726b057fe1ff4ecf0b31b7529a95881821383adafed878f8812");
assert.equal(result.role_record_sha256, "1492c4d55f5c6d4873a28ca08d641196ba51d9e5c0a7c1cc31f27bf1a6405b0b");
assert.equal(result.predicted_registry_root_sha256, "54619d93d1f94746cb92c3bb4de038d014d5c90b73789581486b4a12b4322041");
assert.equal(result.append_calldata_sha256, "83b9a1fb9a74b7755ed37ee3b945a50fb9d5841d36aa7b26707b5a06eb36f938");
assert.equal(result.simulation_gas_estimate, "371459");

const source = fs.readFileSync(
  "tools/chain2050-role-authority-sovereign-genesis-append-preflight-evidence-v1.mjs",
  "utf8"
);
for (const forbidden of ["createPrivateKey(", "crypto.sign(", "eth_sendRawTransaction", "eth_sendTransaction", "broadcastTransaction("]) {
  assert.equal(source.includes(forbidden), false, forbidden);
}

console.log("VOID_CHAIN2050_ROLE_AUTHORITY_SOVEREIGN_GENESIS_APPEND_PREFLIGHT_EVIDENCE_V1_GREEN");
console.log("preflight_evidence_id=" + result.preflight_evidence_id);
console.log("role_record_sha256=" + result.role_record_sha256);
console.log("predicted_registry_root_sha256=" + result.predicted_registry_root_sha256);
console.log("append_calldata_sha256=" + result.append_calldata_sha256);
console.log("simulation_gas_estimate=" + result.simulation_gas_estimate);
console.log("transaction_signing=false");
console.log("transaction_broadcast=false");
console.log("chain2050_write=false");
console.log("registry_append=false");
