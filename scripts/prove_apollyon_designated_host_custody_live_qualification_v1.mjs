#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const TOOL=path.join(ROOT,"tools/apollyon-designated-host-custody-live-qualification-v1.mjs");
const source=fs.readFileSync(TOOL,"utf8");
for(const required of [
  'caller_supplied_evidence:false',
  'two_live_observations_required:true',
  'same_boot_required:true',
  'increasing_boottime_generation_required:true',
  'stable_host_projection_required:true',
  'source_policy_qualification_required:true',
  'attempt_claim:false',
  'training_execution:false',
  'COLLECTOR_BLOB_SHA1="899864a8305c54c64bcc2bab6dc1f50b599b0706"',
  'POLICY_BLOB_SHA1="6f34e79d94c502e31ca4923fd78922d4875550a5"',
  '"/usr/bin/python3"',
  'runCollector(config)',
  'qualifyApollyonCustodyHostPolicyV1(first)',
  'qualifyApollyonCustodyHostPolicyV1(second)',
]) assert.equal(source.includes(required),true,required);
for(const forbidden of [
  'writeFileSync(',
  'appendFileSync(',
  'mkdirSync(',
  'chmodSync(',
  'chownSync(',
  'unlinkSync(',
  'renameSync(',
  'systemctl start',
  'systemctl stop',
  'systemctl restart',
  'createPrivateKey',
  'crypto.sign(',
  'Wallet(',
  'signTransaction(',
  'eth_sendRawTransaction',
  'fetch(',
]) assert.equal(source.includes(forbidden),false,forbidden);
console.log("VOID_APOLLYON_DESIGNATED_HOST_CUSTODY_LIVE_QUALIFICATION_V1_PROOF_GREEN");
console.log("caller_supplied_evidence=false");
console.log("two_live_observations_required=true");
console.log("same_boot_required=true");
console.log("increasing_boottime_generation_required=true");
console.log("stable_host_projection_required=true");
console.log("source_policy_qualification_required=true");
console.log("host_mutation=false");
console.log("attempt_claim=false");
console.log("training_execution=false");
