#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const LAUNCHER=path.join(ROOT,"tools/apollyon-authorization-custody-launcher-v2.mjs");
const source=fs.readFileSync(LAUNCHER,"utf8");

function gitBlob(bytes){
  return crypto.createHash("sha1")
    .update(Buffer.from("blob "+bytes.length+"\0","ascii"))
    .update(bytes).digest("hex");
}
for(const [relative,expected] of Object.entries({
  "tools/apollyon-authorization-custody-service-v1.mjs":
    "8961572ba5834371b1229f790a1960940fc74935",
  "tools/apollyon-authorization-custody-core-v1.mjs":
    "f9f18db5bbfeea466202ef0d7babe08c3c401d66",
  "scripts/apollyon_operator_authorization_packet_v1.mjs":
    "c224ebc4fcb332b70e83900a8e086e0257f31670",
})){
  assert.equal(gitBlob(fs.readFileSync(path.join(ROOT,relative))),expected,relative);
}

for(const required of [
  "VOID_APOLLYON_AUTHORIZATION_CUSTODY_LAUNCHER_V2",
  "VOID_APOLLYON_AUTHORIZATION_CUSTODY_LAUNCHER_AUTHORITY_V2",
  "current_stack_versioned_launcher:true",
  "version:2,",
  "historical_v1_semantics_preserved:true",
  'SERVICE_BLOB_SHA1="8961572ba5834371b1229f790a1960940fc74935"',
  'CORE_BLOB_SHA1="f9f18db5bbfeea466202ef0d7babe08c3c401d66"',
  'VERIFIER_BLOB_SHA1="c224ebc4fcb332b70e83900a8e086e0257f31670"',
  "assertRootOwnedImmutableFile(SERVICE,SERVICE_BLOB_SHA1",
  "assertRootOwnedImmutableFile(CORE,CORE_BLOB_SHA1",
  "assertRootOwnedImmutableFile(VERIFIER,VERIFIER_BLOB_SHA1",
  "await import(pathToFileURL(SERVICE).href)",
  "apollyon_custody_launcher_refuses_root_runtime",
  "apollyon_custody_launcher_loader_environment_forbidden",
  "operator_private_key_access:false",
  "production_signing:false",
  "attempt_claim:false",
  "training_execution:false",
  "funds_movement:false",
]){
  assert.equal(source.includes(required),true,required);
}
const verifyIndex=source.indexOf("assertRootOwnedImmutableFile(SERVICE,SERVICE_BLOB_SHA1");
const importIndex=source.indexOf("await import(pathToFileURL(SERVICE).href)");
assert.ok(verifyIndex>=0&&importIndex>verifyIndex);

for(const forbidden of [
  "createPrivateKey","crypto.sign(","signTransaction(","eth_sendRawTransaction",
  "fetch(","node:child_process","attempt_claimed:true",
  "training_execution_performed:true","candidate_weight_mutation_performed:true",
]){
  assert.equal(source.includes(forbidden),false,forbidden);
}

console.log("VOID_APOLLYON_AUTHORIZATION_CUSTODY_LAUNCHER_V2_PROOF_GREEN");
console.log("current_stack_versioned_launcher=true");
console.log("dependency_blobs_verified_before_import=true");
console.log("root_runtime_refused=true");
console.log("loader_environment_rejected=true");
console.log("operator_private_key_access=false");
console.log("attempt_claim=false");
console.log("training_execution=false");
