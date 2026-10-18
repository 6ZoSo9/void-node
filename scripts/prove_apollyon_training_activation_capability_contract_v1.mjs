#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

import {
  APOLLYON_TRAINING_ACTIVATION_DEPENDENCIES_V1,
  VOID_APOLLYON_TRAINING_ACTIVATION_CAPABILITY_AUTHORITY_V1,
  VOID_APOLLYON_TRAINING_ACTIVATION_CAPABILITY_V1,
  VOID_APOLLYON_TRAINING_ACTIVATION_CONSUMPTION_V1,
  buildApollyonTrainingActivationCapabilityV1,
  buildApollyonTrainingActivationConsumptionV1,
  canonicalApollyonTrainingActivationV1,
  hashApollyonTrainingActivationSecretV1,
  qualifyApollyonTrainingActivationCapabilityV1,
  qualifyApollyonTrainingActivationConsumptionV1,
} from "../tools/apollyon-training-activation-capability-contract-v1.mjs";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const SOURCE="tools/apollyon-training-activation-capability-contract-v1.mjs";
const SOURCE_BLOB="ac286734a0b5ba476ec67713495a77b28f5b1c1d";
const PARENT_HEAD="1fd4b17a7c2f9e3811f52ecf01f4087c1182dcae";

function gitBlob(bytes){
  return crypto.createHash("sha1")
    .update(Buffer.from("blob "+bytes.length+"\0","ascii"))
    .update(bytes)
    .digest("hex");
}
function sha256(value){
  return crypto.createHash("sha256").update(value).digest("hex");
}
function read(relative){
  return fs.readFileSync(path.join(ROOT,relative));
}
function cloned(value){
  return structuredClone(value);
}
function expectRejected(fn,pattern){
  assert.throws(fn,pattern);
}

const EXACT_BLOBS=Object.freeze({
  [SOURCE]:SOURCE_BLOB,
  "tools/apollyon-durable-attempt-claim-store-contract-v2.mjs":
    "bd5572a99ffe0f2cfa43b7d680bbd5077771c6bc",
  "ops/xiphos/apollyon_installed_training_bus_isolation_qualification_v2.py":
    "5f67bb3ddcc7f130db4b90ad73f5450b109dbea4",
  "ops/xiphos/apollyon_live_custody_source_session_launcher_lifecycle_lock_v1.py":
    "352bd36f2b07091140b990de4170f708eb11fee6",
  "ops/xiphos/void-apollyon-training-bus-isolation-v1.service":
    "62fbabe1cf7ae0d940f5d96e19b06282f841267b",
  "ops/xiphos/apollyon_training_bus_isolation_preentry_v1.c":
    "9503d19c8bc0b4f073ba117f6a547d339b7623d0",
});
for(const [relative,expected] of Object.entries(EXACT_BLOBS)){
  assert.equal(gitBlob(read(relative)),expected,relative);
}
assert.equal(
  APOLLYON_TRAINING_ACTIVATION_DEPENDENCIES_V1.parent_head,
  PARENT_HEAD,
);
assert.equal(
  APOLLYON_TRAINING_ACTIVATION_DEPENDENCIES_V1.training_unit_blob_sha1,
  EXACT_BLOBS["ops/xiphos/void-apollyon-training-bus-isolation-v1.service"],
);
assert.equal(
  APOLLYON_TRAINING_ACTIVATION_DEPENDENCIES_V1.training_preentry_source_blob_sha1,
  EXACT_BLOBS["ops/xiphos/apollyon_training_bus_isolation_preentry_v1.c"],
);

const secret=Buffer.alloc(32,0x42);
const secretHash=hashApollyonTrainingActivationSecretV1(secret);
assert.equal(secretHash,sha256(secret));
assert.match(secretHash,/^[0-9a-f]{64}$/u);
expectRejected(
  ()=>hashApollyonTrainingActivationSecretV1(Buffer.alloc(31,0x42)),
  /secret_invalid/u,
);
expectRejected(
  ()=>hashApollyonTrainingActivationSecretV1("not-bytes"),
  /secret_invalid/u,
);

const capabilityMaterial={
  activation_secret_sha256:secretHash,
  authorization_id:"apollyon_authz_v1:"+"1".repeat(64),
  capability_replay_authorized:false,
  credential_name:"apollyon-training-activation-v1",
  custody_generation_id:"apollyon_custody_generation_v1:"+"2".repeat(64),
  direct_systemd_start_without_capability_authorized:false,
  durable_claim_record_id:"apollyon_attempt_claim_record_v2:"+"3".repeat(64),
  durable_claim_record_sha256:"4".repeat(64),
  expected_entrypoint_bytes:
    APOLLYON_TRAINING_ACTIVATION_DEPENDENCIES_V1.training_entrypoint_bytes,
  expected_entrypoint_sha256:
    APOLLYON_TRAINING_ACTIVATION_DEPENDENCIES_V1.training_entrypoint_sha256,
  expected_preentry_sha256:
    APOLLYON_TRAINING_ACTIVATION_DEPENDENCIES_V1.training_preentry_sha256,
  expected_unit_git_blob_sha1:
    APOLLYON_TRAINING_ACTIVATION_DEPENDENCIES_V1.training_unit_blob_sha1,
  marker:VOID_APOLLYON_TRAINING_ACTIVATION_CAPABILITY_V1,
  next_gate:"apollyon_training_activation_capability_consumption_v1",
  raw_capability_export_authorized:false,
  status:"training_activation_capability_issued_unconsumed",
  store_contract_id:"apollyon_claim_store_contract_v2:"+"5".repeat(64),
  store_generation_id:"apollyon_claim_store_generation_v2:"+"6".repeat(64),
  store_policy_id:"apollyon_claim_store_policy_v2:"+"7".repeat(64),
  systemd_caller_identity_authoritative:false,
  systemd_credential_transport_required:true,
  target_host:"Xiphos",
  terminal_receipt_id:"apollyon_terminal_receipt_v2:"+"8".repeat(64),
  training_execution_authorized:false,
  training_start_consumption_required:true,
  version:1,
};
const capability=buildApollyonTrainingActivationCapabilityV1(capabilityMaterial);
assert.equal(Object.isFrozen(capability),true);
assert.match(capability.activation_capability_id,
  /^apollyon_training_activation_capability_v1:[0-9a-f]{64}$/u);
assert.deepEqual(
  qualifyApollyonTrainingActivationCapabilityV1(capability),
  capability,
);
assert.equal(capability.activation_secret_sha256,secretHash);
assert.equal(capability.raw_capability_export_authorized,false);
assert.equal(capability.direct_systemd_start_without_capability_authorized,false);
assert.equal(capability.systemd_caller_identity_authoritative,false);
assert.equal(capability.training_execution_authorized,false);
const capabilityText=canonicalApollyonTrainingActivationV1(capability);
assert.equal(capabilityText.includes(secret.toString("hex")),false);
assert.equal(capabilityText.includes(secret.toString("base64")),false);

{
  const bad=cloned(capability);
  bad.raw_activation_secret=secret.toString("hex");
  expectRejected(
    ()=>qualifyApollyonTrainingActivationCapabilityV1(bad),
    /capability_invalid/u,
  );
}
{
  const bad=cloned(capability);
  bad.activation_capability_id=
    "apollyon_training_activation_capability_v1:"+"0".repeat(64);
  expectRejected(
    ()=>qualifyApollyonTrainingActivationCapabilityV1(bad),
    /capability_id_invalid/u,
  );
}
for(const [key,value] of [
  ["direct_systemd_start_without_capability_authorized",true],
  ["systemd_caller_identity_authoritative",true],
  ["capability_replay_authorized",true],
  ["raw_capability_export_authorized",true],
  ["training_start_consumption_required",false],
  ["training_execution_authorized",true],
]){
  const bad={...capabilityMaterial,[key]:value};
  expectRejected(
    ()=>buildApollyonTrainingActivationCapabilityV1(bad),
    /capability_invalid/u,
  );
}

const consumptionMaterial={
  activation_capability_id:capability.activation_capability_id,
  activation_generation_bound:true,
  activation_secret_sha256:capability.activation_secret_sha256,
  boot_id_sha256:"9".repeat(64),
  caller_supplied_consumption_receipt_sufficient:false,
  consumed_once:true,
  credential_name:capability.credential_name,
  durable_claim_record_id:capability.durable_claim_record_id,
  marker:VOID_APOLLYON_TRAINING_ACTIVATION_CONSUMPTION_V1,
  next_gate:"apollyon_training_start_release_v1",
  observed_preentry_sha256:capability.expected_preentry_sha256,
  protected_consumption_store_required:true,
  replay_authorized:false,
  status:"training_activation_capability_consumed_generation_bound",
  store_generation_id:capability.store_generation_id,
  systemd_caller_identity_authoritative:false,
  systemd_invocation_id:"a".repeat(32),
  target_host:"Xiphos",
  training_execution_authorized:false,
  training_pid:4242,
  training_process_start_time_ticks:123456,
  training_release_authorized:false,
  training_start_admission:true,
  training_start_consumption_performed:true,
  version:1,
};
const consumption=buildApollyonTrainingActivationConsumptionV1(
  capability,
  consumptionMaterial,
);
assert.equal(Object.isFrozen(consumption),true);
assert.match(consumption.consumption_id,
  /^apollyon_training_activation_consumption_v1:[0-9a-f]{64}$/u);
assert.deepEqual(
  qualifyApollyonTrainingActivationConsumptionV1(capability,consumption),
  consumption,
);
assert.equal(consumption.activation_generation_bound,true);
assert.equal(consumption.consumed_once,true);
assert.equal(consumption.replay_authorized,false);
assert.equal(consumption.protected_consumption_store_required,true);
assert.equal(consumption.caller_supplied_consumption_receipt_sufficient,false);
assert.equal(consumption.training_start_consumption_performed,true);
assert.equal(consumption.training_start_admission,true);
assert.equal(consumption.training_release_authorized,false);
assert.equal(consumption.training_execution_authorized,false);

{
  const bad=cloned(consumption);
  bad.consumption_id=
    "apollyon_training_activation_consumption_v1:"+"0".repeat(64);
  expectRejected(
    ()=>qualifyApollyonTrainingActivationConsumptionV1(capability,bad),
    /consumption_id_invalid/u,
  );
}
for(const [key,value] of [
  ["activation_capability_id","apollyon_training_activation_capability_v1:"+"f".repeat(64)],
  ["activation_secret_sha256","f".repeat(64)],
  ["durable_claim_record_id","apollyon_attempt_claim_record_v2:"+"f".repeat(64)],
  ["store_generation_id","apollyon_claim_store_generation_v2:"+"f".repeat(64)],
  ["systemd_invocation_id","BAD"],
  ["training_pid",0],
  ["training_process_start_time_ticks",0],
  ["observed_preentry_sha256","f".repeat(64)],
  ["systemd_caller_identity_authoritative",true],
  ["activation_generation_bound",false],
  ["consumed_once",false],
  ["replay_authorized",true],
  ["protected_consumption_store_required",false],
  ["caller_supplied_consumption_receipt_sufficient",true],
  ["training_start_consumption_performed",false],
  ["training_start_admission",false],
  ["training_release_authorized",true],
  ["training_execution_authorized",true],
]){
  const bad={...consumptionMaterial,[key]:value};
  expectRejected(
    ()=>buildApollyonTrainingActivationConsumptionV1(capability,bad),
    /consumption_invalid/u,
  );
}
{
  const bad=cloned(consumption);
  bad.raw_activation_secret=secret.toString("hex");
  expectRejected(
    ()=>qualifyApollyonTrainingActivationConsumptionV1(capability,bad),
    /consumption_invalid/u,
  );
}

for(const [key,expected] of Object.entries({
  source_contract_only:true,
  capability_issuance_performed:false,
  protected_consumption_store_implemented:false,
  systemd_credential_transport_selected_as_candidate:true,
  systemd_credential_runtime_proven:false,
  service_activation_authorized:false,
  service_action:false,
  systemd_mutation:false,
  host_installation:false,
  filesystem_read:false,
  filesystem_write:false,
  network_access:false,
  durable_attempt_claim:false,
  training_start_consumption_performed:false,
  training_release_authorized:false,
  training_execution_authorized:false,
  training_execution:false,
  candidate_weight_mutation:false,
  credential_access:false,
  private_key_access:false,
  signing:false,
  wallet_access:false,
  transaction:false,
  funds_movement:false,
})){
  assert.equal(
    VOID_APOLLYON_TRAINING_ACTIVATION_CAPABILITY_AUTHORITY_V1[key],
    expected,
    key,
  );
}

const source=read(SOURCE).toString("utf8");
for(const forbidden of [
  'from "node:fs"',
  'from "node:net"',
  'from "node:child_process"',
  "systemctl",
  "LoadCredential=",
  "writeFile",
  "appendFile",
  "mkdir",
  "rename",
  "spawn(",
  "execFile",
  "fetch(",
  "training_execution_authorized:true",
  "training_release_authorized:true",
  "service_activation_authorized:true",
  "funds_movement:true",
]){
  assert.equal(source.includes(forbidden),false,forbidden);
}

console.log("VOID_APOLLYON_TRAINING_ACTIVATION_CAPABILITY_CONTRACT_V1_PROOF_GREEN");
console.log("source_blob="+SOURCE_BLOB);
console.log("parent_head="+PARENT_HEAD);
console.log("capability_content_addressed=true");
console.log("raw_activation_secret_not_in_receipt=true");
console.log("direct_systemd_start_without_capability_authorized=false");
console.log("systemd_caller_identity_authoritative=false");
console.log("systemd_credential_transport_candidate_only=true");
console.log("systemd_credential_runtime_proven=false");
console.log("protected_one_time_consumption_required=true");
console.log("consumption_generation_binding_required=true");
console.log("consumption_systemd_invocation_id_bound=true");
console.log("consumption_pid_start_ticks_bound=true");
console.log("consumption_preentry_identity_bound=true");
console.log("replay_authorized=false");
console.log("training_start_admission_after_consumption=true");
console.log("training_release_authorized=false");
console.log("training_execution_authorized=false");
console.log("service_action=false");
console.log("funds_movement=false");
