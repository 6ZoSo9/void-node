#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const TOOL=path.join(
  ROOT,"tools/apollyon-designated-host-custody-live-qualification-v2.mjs",
);
const POLICY=path.join(ROOT,"tools/apollyon-custody-host-policy-qualification-v2.mjs");
const COLLECTOR=path.join(
  ROOT,"ops/xiphos/apollyon_designated_host_custody_evidence_readonly_v2.py",
);
const HISTORICAL=Object.freeze({
  "tools/apollyon-designated-host-custody-live-qualification-v1.mjs":
    "3dae4db82a9316eaa88f475cec41ddc05a441536",
  "scripts/prove_apollyon_designated_host_custody_live_qualification_v1.mjs":
    "f0c8aaf395d0f5d0a2495b4d25aefc5bdffd01f5",
  "docs/security/apollyon-designated-host-custody-live-qualification-v1.md":
    "ef772d91f74ea875b34c725bde2551d47dbd2adb",
});
function gitBlob(bytes){
  return crypto.createHash("sha1")
    .update(Buffer.from(`blob ${bytes.length}\0`,"ascii"))
    .update(bytes).digest("hex");
}
assert.equal(gitBlob(fs.readFileSync(POLICY)),"83afde66ad89c29ec7b40932b2ebd7e0b2ce7bc7");
assert.equal(gitBlob(fs.readFileSync(COLLECTOR)),"25c553567172c1372a29f5e81bc45422022d7f4f");
for(const [relative,expected] of Object.entries(HISTORICAL)){
  assert.equal(gitBlob(fs.readFileSync(path.join(ROOT,relative))),expected,relative);
}
const source=fs.readFileSync(TOOL,"utf8");
for(const required of [
  'caller_supplied_evidence:false',
  'two_live_observations_required:true',
  'same_boot_required:true',
  'increasing_boottime_generation_required:true',
  'stable_host_projection_required:true',
  'socket_parent_namespace_v2_required:true',
  'source_policy_v2_qualification_required:true',
  'live_service_source_identity_required:true',
  'live_service_source_identity_proven:false',
  'same_live_custody_session_binding_proven:false',
  'independent_custody_proven:false',
  'custody_production_gate_ready:false',
  'COLLECTOR_BLOB_SHA1="25c553567172c1372a29f5e81bc45422022d7f4f"',
  'POLICY_BLOB_SHA1="83afde66ad89c29ec7b40932b2ebd7e0b2ce7bc7"',
  '"/usr/bin/python3"',
  'qualifyApollyonCustodyHostPolicyV2(first)',
  'qualifyApollyonCustodyHostPolicyV2(second)',
  'next_gate:"live_custody_service_source_identity_binding_v2"',
  'attempt_claim:false',
  'training_execution:false',
]) assert.equal(source.includes(required),true,required);
for(const forbidden of [
  'writeFileSync(', 'appendFileSync(', 'mkdirSync(', 'chmodSync(', 'chownSync(',
  'unlinkSync(', 'renameSync(', 'linkSync(', 'symlinkSync(',
  'systemctl start', 'systemctl stop', 'systemctl restart',
  'createPrivateKey', 'crypto.sign(', 'Wallet(', 'signTransaction(',
  'eth_sendRawTransaction', 'fetch(',
  'custody_production_gate_ready:true',
  'live_service_source_identity_proven:true',
  'attempt_claimed:true', 'training_execution_performed:true',
]) assert.equal(source.includes(forbidden),false,forbidden);
console.log(
  "VOID_APOLLYON_DESIGNATED_HOST_CUSTODY_LIVE_QUALIFICATION_V2_PROOF_GREEN",
);
console.log("historical_v1_live_qualification_unchanged=true");
console.log("exact_v2_policy_blob=true");
console.log("exact_v2_collector_blob=true");
console.log("two_live_observations_required=true");
console.log("socket_parent_namespace_v2_required=true");
console.log("live_host_qualification_performed_capability=true");
console.log("live_service_source_identity_proven=false");
console.log("custody_production_gate_ready=false");
console.log("attempt_claimed=false");
console.log("training_execution=false");
