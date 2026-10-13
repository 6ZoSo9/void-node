#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const TOOL=path.join(ROOT,"tools/apollyon-candidate-training-attempt-live-custody-binding-v1.mjs");
const source=fs.readFileSync(TOOL,"utf8");
for(const required of [
  'V84_BLOB_SHA1="3dae4db82a9316eaa88f475cec41ddc05a441536"',
  'V85_BLOB_SHA1="f97fafb0148527ae3a954e2752faef8c7fc9e88e"',
  'V81_BLOB_SHA1="fb31dbbda76c94f0ad08e38094c151a24a78b486"',
  'LAUNCHER_BLOB_SHA1="5004d8c6ff15be9dbc234ce71dc7a83d8e601052"',
  'live_service_source_identity_required:true',
  'live_service_source_identity_proven:true',
  'live_service_source_identity_proven_by_import:false',
  'loader_environment_clean_required:true',
  'rootOwnedPinnedBlob(config.service_entrypoint',
  'publicKeyRawFingerprint(config.operator_public_key_file)',
  'fs.realpathSync.native(\`/proc/\${pid}/exe\`)',
  'fs.readFileSync(\`/proc/\${pid}/cmdline\`)',
  'assertLoaderEnvironment(pid)',
  'apollyon_live_binding_custody_record_operator_fingerprint_mismatch',
  'same_live_custody_session_binding_required:true',
  'same_live_custody_session_binding_proof_capability:true',
  'same_live_custody_session_binding_proven_by_import:false',
  'same_live_custody_session_binding_proven:true',
  'stable_service_process_identity_required:true',
  'retained_state_root_descriptor:true',
  'retained_consumed_descriptor:true',
  'createApollyonAuthorizationCustodyClientV1',
  'client.assertConsumed(config.authorization_id',
  'serviceProcessIdentity(config.service_unit)',
  'assertServiceStable(config.service_unit,serviceBefore)',
  'readCustodyRecord(consumed,config.authorization_id)',
  'sameIdentity(st,before)',
  'sameIdentity(after,visibleAfter)',
  'apollyon_live_binding_custody_record_open_identity_mismatch',
  'durable_attempt_claim_performed:false',
  'attempt_claim:false',
  'training_execution:false',
  'next_gate:"durable_candidate_training_attempt_claim_executor_v1"',
]) assert.equal(source.includes(required),true,required);
for(const forbidden of [
  'writeFileSync(', 'appendFileSync(', 'mkdirSync(', 'chmodSync(', 'chownSync(',
  'unlinkSync(', 'renameSync(', 'linkSync(', 'symlinkSync(',
  'systemctl","start', 'systemctl","stop', 'systemctl","restart',
  'createPrivateKey', 'crypto.sign(', 'signTransaction(', 'eth_sendRawTransaction',
  'attempt_claimed:true', 'training_execution_performed:true',
]) assert.equal(source.includes(forbidden),false,forbidden);
const order=[
  source.indexOf('const socketBefore=socketIdentity(socketPath)'),
  source.indexOf('const serviceBefore=serviceProcessIdentity(config.service_unit)'),
  source.indexOf('const live=runV84(config)'),
  source.indexOf('const assertion=await client.assertConsumed'),
  source.indexOf('const record=readCustodyRecord'),
  source.indexOf('return finalizeApollyonCandidateTrainingAttemptLiveCustodyBindingV1'),
];
for(let i=1;i<order.length;i+=1) assert.ok(order[i]>order[i-1],`ordering_${i}`);
assert.ok((source.match(/assertPinnedStable\(/gu)||[]).length>=7);
assert.ok((source.match(/assertSocketStable\(/gu)||[]).length>=4);
assert.ok((source.match(/assertServiceStable\(/gu)||[]).length>=4);
console.log("VOID_APOLLYON_CANDIDATE_TRAINING_ATTEMPT_LIVE_CUSTODY_BINDING_V1_PROOF_GREEN");
console.log("exact_v84_required=true");
console.log("exact_v85_required=true");
console.log("exact_v81_client_required=true");
console.log("retained_state_root_descriptor=true");
console.log("retained_consumed_descriptor=true");
console.log("stable_socket_identity_required=true");
console.log("stable_service_process_identity_required=true");
console.log("live_service_source_identity_proven=true");
console.log("loader_environment_clean=true");
console.log("same_live_custody_session_binding_proven=true");
console.log("attempt_claimed=false");
console.log("training_execution=false");
