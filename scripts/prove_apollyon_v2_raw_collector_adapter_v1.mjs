#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {
  VOID_APOLLYON_V2_RAW_COLLECTOR_ADAPTER_AUTHORITY_V1,
  buildApollyonV2RawCollectorArgsV1,
  parseApollyonV2RawCollectorOutputV1,
} from "../tools/apollyon-v2-raw-collector-adapter-v1.mjs";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
function gitBlob(bytes){
  return crypto.createHash("sha1")
    .update(Buffer.from("blob "+bytes.length+"\0","ascii"))
    .update(bytes).digest("hex");
}
assert.equal(
  gitBlob(fs.readFileSync(
    path.join(ROOT,"ops/xiphos/apollyon_designated_host_custody_evidence_readonly_v2.py"),
  )),
  "2a285b5b1da2597a8b9eae6d08cd42d010bf7f71",
);

const args=buildApollyonV2RawCollectorArgsV1({
  training_user:"voidapollyontrain",
  training_pid:4242,
  custody_user:"voidapollyoncustody",
  ipc_group:"voidapollyonipc",
  state_root:"/var/lib/void-apollyon-custody-v1",
  socket_path:"/run/void-apollyon/custody.sock",
  service_unit:"void-apollyon-authorization-custody-v1.service",
});
assert.deepEqual(args,[
  "--training-user","voidapollyontrain",
  "--training-pid","4242",
  "--custody-user","voidapollyoncustody",
  "--ipc-group","voidapollyonipc",
  "--state-root","/var/lib/void-apollyon-custody-v1",
  "--socket-path","/run/void-apollyon/custody.sock",
  "--service-unit","void-apollyon-authorization-custody-v1.service",
  "--ttl-ms","300000",
]);

const raw={
  marker:"VOID_APOLLYON_CUSTODY_HOST_POLICY_EVIDENCE_V2",
  version:2,
  target_host:"Xiphos",
  service:{runtime_can_control_service:null},
  service_control:{
    inherited_system_bus_descriptor_absence_required:true,
    inherited_system_bus_descriptor_absence_proven:false,
    absolute_runtime_service_control_denial_proven:false,
    runtime_can_control_service:null,
  },
};
const canonical=(value)=>{
  if(Array.isArray(value))return value.map(canonical);
  if(value&&typeof value==="object"){
    const out={};
    for(const key of Object.keys(value).sort())out[key]=canonical(value[key]);
    return out;
  }
  return value;
};
const stdout=JSON.stringify(canonical(raw))+"\n";
assert.equal(
  parseApollyonV2RawCollectorOutputV1(
    stdout,
    "VOID_APOLLYON_DESIGNATED_HOST_CUSTODY_EVIDENCE_READONLY_V2\nlive_host_evidence_collected=true\n",
  ).service_control.runtime_can_control_service,
  null,
);
for(const mutate of [
  x=>{x.service_control.inherited_system_bus_descriptor_absence_proven=true;},
  x=>{x.service_control.absolute_runtime_service_control_denial_proven=true;},
  x=>{x.service_control.runtime_can_control_service=false;},
]){
  const bad=structuredClone(raw);mutate(bad);
  assert.throws(
    ()=>parseApollyonV2RawCollectorOutputV1(
      JSON.stringify(canonical(bad))+"\n",
      "live_host_evidence_collected=true\n",
    ),
    /boundary_invalid/u,
  );
}

for(const [key,expected] of Object.entries({
  reviewed_private_collector_required:true,
  trusted_python_descriptor_required:true,
  raw_v2_evidence_only:true,
  current_v2_policy_evaluation:false,
  current_v2_preclaim_composition:false,
  process_execution_capability:true,
  filesystem_read:true,
  filesystem_write:false,
  external_network_access:false,
  service_action:false,
  attempt_claim:false,
  training_execution:false,
  candidate_weight_mutation:false,
  credential_access:false,
  wallet_or_signer_access:false,
  transaction:false,
  funds_movement:false,
})){
  assert.equal(VOID_APOLLYON_V2_RAW_COLLECTOR_ADAPTER_AUTHORITY_V1[key],expected,key);
}

const source=fs.readFileSync(
  path.join(ROOT,"tools/apollyon-v2-raw-collector-adapter-v1.mjs"),"utf8",
);
for(const required of [
  'COLLECTOR_BLOB_SHA1="2a285b5b1da2597a8b9eae6d08cd42d010bf7f71"',
  '"/proc/self/fd/4"',
  '"-I","-B","/proc/self/fd/3"',
  "O_NOFOLLOW",
  "PYTHONDONTWRITEBYTECODE",
  "inherited_system_bus_descriptor_absence_proven!==false",
  "absolute_runtime_service_control_denial_proven!==false",
  "runtime_can_control_service!==null",
]){
  assert.equal(source.includes(required),true,required);
}
for(const forbidden of [
  "writeFileSync(","appendFileSync(","mkdirSync(","chmodSync(","chownSync(",
  "systemctl","attempt_claimed:true","training_execution_performed:true",
  "candidate_weight_mutation_performed:true","createPrivateKey","crypto.sign(",
  "eth_sendRawTransaction","fetch(",
]){
  assert.equal(source.includes(forbidden),false,forbidden);
}

console.log("VOID_APOLLYON_V2_RAW_COLLECTOR_ADAPTER_V1_PROOF_GREEN");
console.log("exact_v2_collector_blob_required=true");
console.log("trusted_python_descriptor_required=true");
console.log("raw_unresolved_service_control_required=true");
console.log("policy_evaluation=false");
console.log("preclaim_composition=false");
console.log("attempt_claim=false");
console.log("training_execution=false");
