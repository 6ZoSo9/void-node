#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {
  VOID_APOLLYON_TRAINING_ACTIVATION_CREDENTIAL_TRANSPORT_CONTRACT_V1,
  APOLLYON_ACTIVATION_TRANSPORT_PARENT_V1,
  APOLLYON_ACTIVATION_TRANSPORT_AUTHORITY_V1,
  APOLLYON_ACTIVATION_TRANSPORT_MATERIAL_KEYS_V1,
  buildApollyonActivationCredentialTransportCandidateV1,
  qualifyApollyonActivationCredentialTransportCandidateV1,
  qualifyApollyonActivationTransportAgainstCapabilityV1,
} from "../tools/apollyon-training-activation-credential-transport-contract-v1.mjs";
import {
  APOLLYON_TRAINING_ACTIVATION_DEPENDENCIES_V1,
  VOID_APOLLYON_TRAINING_ACTIVATION_CAPABILITY_V1,
  buildApollyonTrainingActivationCapabilityV1,
} from "../tools/apollyon-training-activation-capability-contract-v1.mjs";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const SOURCE=path.join(ROOT,"tools/apollyon-training-activation-credential-transport-contract-v1.mjs");
const PARENT=path.join(ROOT,"tools/apollyon-training-activation-capability-contract-v1.mjs");
const PARENT_PROOF=path.join(ROOT,"scripts/prove_apollyon_training_activation_capability_contract_v1.mjs");
const PARENT_DOC=path.join(ROOT,"docs/security/apollyon-training-activation-capability-contract-v1.md");
const EXPECTED_PARENT_BLOB="bcb47a4b105b89a459a4ea876b03f057450371c5";
const CURRENT_PARENT_SOURCE_BLOB="7af22ba4e4374a5da490d909c32525a68bf0c5d2";
const EXPECTED_PARENT_PROOF_BLOB="a3b93893ab36437c4d5c819e2bef2650157c959a";
const EXPECTED_PARENT_DOC_BLOB="de24249f7c541a6bb7c7db8cc8d020d299a44e74";
const gitBlob=(data)=>crypto.createHash("sha1")
  .update(Buffer.from("blob "+data.length+"\0","ascii")).update(data).digest("hex");

assert.equal(gitBlob(fs.readFileSync(PARENT)),CURRENT_PARENT_SOURCE_BLOB);
assert.equal(gitBlob(fs.readFileSync(PARENT_PROOF)),EXPECTED_PARENT_PROOF_BLOB);
assert.equal(gitBlob(fs.readFileSync(PARENT_DOC)),EXPECTED_PARENT_DOC_BLOB);
assert.equal(
  APOLLYON_ACTIVATION_TRANSPORT_PARENT_V1.head,
  "d6670d8dd6185d034c9b07ef3a29390add63ee21",
);
// The transport candidate's source reference is a frozen historical #3525
// identity. The repaired current source above has a distinct Git blob.
assert.equal(APOLLYON_ACTIVATION_TRANSPORT_PARENT_V1.capability_contract_blob,EXPECTED_PARENT_BLOB);
assert.equal(
  APOLLYON_TRAINING_ACTIVATION_DEPENDENCIES_V1.parent_head,
  "d00ca0141db62d752be7ddc6e7d9618e0475d897",
  "capability source audit anchor must remain the historical accepted parent",
);
assert.equal(APOLLYON_ACTIVATION_TRANSPORT_PARENT_V1.retired_activator_required,true);

const trueKeys=new Set([
  "activation_capability_external_validation_required",
  "protected_authorization_slot_origin_required",
  "protected_capability_issuance_required",
  "protected_credential_source_required",
  "run_scoped_credential_required",
  "systemd_credential_transport_candidate_only",
]);
function fixture(){
  const value={};
  for(const key of APOLLYON_ACTIVATION_TRANSPORT_MATERIAL_KEYS_V1){
    if(key==="marker")value[key]=
      "VOID_APOLLYON_TRAINING_ACTIVATION_CREDENTIAL_TRANSPORT_CANDIDATE_V1";
    else if(key==="version")value[key]=1;
    else if(key==="status")value[key]="activation_credential_transport_candidate_unperformed";
    else if(key==="target_host")value[key]="Xiphos";
    else if(key==="parent_capability_contract_head")
      value[key]=APOLLYON_ACTIVATION_TRANSPORT_PARENT_V1.head;
    else if(key==="parent_capability_contract_blob_sha1")
      value[key]=APOLLYON_ACTIVATION_TRANSPORT_PARENT_V1.capability_contract_blob;
    else if(key==="activation_capability_id")
      value[key]="apollyon_training_activation_capability_v1:"+"1".repeat(64);
    else if(key==="activation_secret_sha256")value[key]="2".repeat(64);
    else if(key==="training_start_consumption_slot_id")
      value[key]="apollyon_training_start_slot_v1:"+"3".repeat(64);
    else if(key==="credential_name")value[key]="apollyon-training-activation-v1";
    else if(key==="bearer_secret_bytes")value[key]=32;
    else if(key==="next_gate")
      value[key]="apollyon_training_activation_credential_transport_host_qualification_v1";
    else value[key]=trueKeys.has(key);
  }
  return value;
}

const source=fs.readFileSync(SOURCE,"utf8");
const candidate=buildApollyonActivationCredentialTransportCandidateV1(fixture());
const validated=qualifyApollyonActivationCredentialTransportCandidateV1(candidate);
assert.deepEqual(validated,candidate);
assert.equal(Object.isFrozen(validated),true);
assert.equal(candidate.training_execution_authorized,false);
assert.equal(candidate.host_credential_runtime_proven,false);
assert.equal(candidate.credential_possession_proven,false);
assert.equal(candidate.protected_capability_issuance_performed,false);
assert.equal(candidate.protected_authorization_slot_origin_proven,false);
assert.equal(candidate.direct_systemd_start_authorized,false);
assert.equal(candidate.capability_replay_authorized,false);
assert.equal(candidate.shared_credential_reuse_authorized,false);
assert.equal(candidate.raw_secret_in_public_receipt_authorized,false);
assert.equal(candidate.training_start_consumption_performed,false);
assert.equal(candidate.service_action,false);
assert.equal(candidate.funds_movement,false);
assert.equal(candidate.bearer_secret_bytes,32);
assert.equal(candidate.credential_name,"apollyon-training-activation-v1");
assert.equal(Object.keys(candidate).length,APOLLYON_ACTIVATION_TRANSPORT_MATERIAL_KEYS_V1.length+1);
assert.deepEqual(buildApollyonActivationCredentialTransportCandidateV1(fixture()),candidate);

function reject(fn,expression){
  assert.throws(fn,expression);
}
function mutation(key,value){
  return {...fixture(),[key]:value};
}
reject(
  ()=>qualifyApollyonActivationCredentialTransportCandidateV1({
    ...candidate,transport_candidate_id:"apollyon_activation_credential_transport_v1:"+"0".repeat(64)
  }),
  /transport_id_invalid/u
);
reject(()=>buildApollyonActivationCredentialTransportCandidateV1(
  mutation("credential_name","apollyon-training-activation-v2")
),/transport_contract_invalid/u);
reject(()=>buildApollyonActivationCredentialTransportCandidateV1(
  mutation("parent_capability_contract_blob_sha1","0".repeat(40))
),/transport_contract_invalid/u);
reject(()=>buildApollyonActivationCredentialTransportCandidateV1(
  mutation("parent_capability_contract_head","0".repeat(40))
),/transport_contract_invalid/u);
reject(()=>buildApollyonActivationCredentialTransportCandidateV1(
  mutation("bearer_secret_bytes",64)
),/transport_contract_invalid/u);
reject(()=>buildApollyonActivationCredentialTransportCandidateV1(
  mutation("activation_capability_id",["apollyon_training_activation_capability_v1:"+"1".repeat(64)])
),/transport_schema_invalid/u);
reject(()=>buildApollyonActivationCredentialTransportCandidateV1(
  mutation("training_start_consumption_slot_id",new String("apollyon_training_start_slot_v1:"+"3".repeat(64)))
),/transport_schema_invalid/u);
reject(()=>buildApollyonActivationCredentialTransportCandidateV1(
  mutation("credential_name",{nested:"x".repeat(10000)})
),/transport_schema_invalid/u);
reject(()=>buildApollyonActivationCredentialTransportCandidateV1(
  mutation("host_credential_runtime_proven",true)
),/transport_contract_invalid/u);
reject(()=>buildApollyonActivationCredentialTransportCandidateV1(
  mutation("protected_capability_issuance_performed",true)
),/transport_contract_invalid/u);
reject(()=>buildApollyonActivationCredentialTransportCandidateV1(
  mutation("direct_systemd_start_authorized",true)
),/transport_contract_invalid/u);
reject(()=>buildApollyonActivationCredentialTransportCandidateV1(
  mutation("raw_secret_in_public_receipt_authorized",true)
),/transport_contract_invalid/u);
reject(()=>buildApollyonActivationCredentialTransportCandidateV1(
  {...fixture(),raw_capability_secret:"top secret"}
),/transport_schema_invalid/u);
reject(()=>buildApollyonActivationCredentialTransportCandidateV1(
  {...fixture(),extra:true}
),/transport_schema_invalid/u);

const hidden=fixture();
Object.defineProperty(hidden,"secret",{value:"sensitive",enumerable:false});
reject(()=>buildApollyonActivationCredentialTransportCandidateV1(hidden),/transport_schema_invalid/u);
const symbol=fixture();symbol[Symbol("secret")]=true;
reject(()=>buildApollyonActivationCredentialTransportCandidateV1(symbol),/transport_schema_invalid/u);
let getters=0;
const accessor=fixture();
Object.defineProperty(accessor,"credential_name",{enumerable:true,get(){getters++;throw Error("executed");}});
reject(()=>buildApollyonActivationCredentialTransportCandidateV1(accessor),/transport_schema_invalid/u);
assert.equal(getters,0);
let traps=0;
const proxy=new Proxy(fixture(),{
  getPrototypeOf(){traps++;throw Error("trap");},
  ownKeys(){traps++;throw Error("trap");},
  getOwnPropertyDescriptor(){traps++;throw Error("trap");},
  get(){traps++;throw Error("trap");},
});
reject(()=>buildApollyonActivationCredentialTransportCandidateV1(proxy),/transport_schema_invalid/u);
assert.equal(traps,0);

const many=fixture();
for(let i=0;i<4096;i++)many["untrusted_"+i]=i;
const realSort=Array.prototype.sort;
Array.prototype.sort=function(){throw Error("sort_before_guard");};
try{
  reject(()=>buildApollyonActivationCredentialTransportCandidateV1(many),/transport_schema_invalid/u);
}finally{Array.prototype.sort=realSort;}

// Recompute the public transport ID after hostile cross-record edits. It
// remains a valid standalone shape, but cannot agree with the current #3525
// public candidate; neither candidate establishes protected origin.
const deps=APOLLYON_TRAINING_ACTIVATION_DEPENDENCIES_V1;
const capabilityMaterial={
  activation_capability_issuance_performed:false,
  activation_secret_sha256:"2".repeat(64),
  authorization_id:"apollyon_authz_v1:"+"1".repeat(64),
  authorization_slot_external_validation_required:true,
  authorization_slot_id:"apollyon_attempt_claim_auth_slot_v1:"+"2".repeat(64),
  authorization_slot_record_id:
    "apollyon_attempt_claim_auth_slot_record_v1:"+"3".repeat(64),
  capability_replay_authorized:false,
  create_once_key_must_equal_training_start_consumption_slot_id:true,
  credential_name:"apollyon-training-activation-v1",
  custody_generation_id:"apollyon_custody_generation_v1:"+"4".repeat(64),
  direct_systemd_start_without_capability_authorized:false,
  durable_claim_record_id:"apollyon_attempt_claim_record_v2:"+"5".repeat(64),
  durable_claim_record_sha256:"6".repeat(64),
  expected_entrypoint_bytes:deps.training_entrypoint_bytes,
  expected_entrypoint_sha256:deps.training_entrypoint_sha256,
  expected_preentry_sha256:deps.training_preentry_sha256,
  expected_unit_git_blob_sha1:deps.training_unit_blob_sha1,
  external_training_start_consumption_validation_performed:false,
  marker:VOID_APOLLYON_TRAINING_ACTIVATION_CAPABILITY_V1,
  next_gate:"apollyon_training_activation_capability_protected_issuance_v1",
  protected_capability_store_required:true,
  raw_capability_export_authorized:false,
  status:"training_activation_capability_candidate_unissued",
  store_contract_id:"apollyon_claim_store_contract_v2:"+"7".repeat(64),
  store_generation_id:"apollyon_claim_store_generation_v2:"+"8".repeat(64),
  store_policy_id:"apollyon_claim_store_policy_v2:"+
    "e7591d97e95ba4af17097fc89e1e2db612275c84715872153e1ae0a278c01137",
  systemd_caller_identity_authoritative:false,
  systemd_credential_transport_required:true,
  target_host:"Xiphos",
  terminal_receipt_id:"apollyon_terminal_receipt_v2:"+"9".repeat(64),
  training_execution_authorized:false,
  training_start_consumption_contract_blob_sha1:
    deps.training_start_consumption_contract_blob_sha1,
  training_start_consumption_contract_head:
    deps.training_start_consumption_contract_head,
  training_start_consumption_contract_in_parent_lineage:false,
  training_start_consumption_integration_required:true,
  training_start_consumption_slot_external_validation_required:true,
  training_start_consumption_slot_id:
    "apollyon_training_start_slot_v1:"+"a".repeat(64),
  version:1,
};
const parentCandidate=buildApollyonTrainingActivationCapabilityV1(capabilityMaterial);
const alignedMaterial={
  ...fixture(),
  activation_capability_id:parentCandidate.activation_capability_id,
  activation_secret_sha256:parentCandidate.activation_secret_sha256,
  training_start_consumption_slot_id:parentCandidate.training_start_consumption_slot_id,
};
const alignedTransport=buildApollyonActivationCredentialTransportCandidateV1(
  alignedMaterial
);
assert.deepEqual(
  qualifyApollyonActivationTransportAgainstCapabilityV1(
    parentCandidate,alignedTransport
  ),
  alignedTransport
);
assert.equal(alignedTransport.activation_capability_external_validation_performed,false);
assert.equal(alignedTransport.protected_capability_issuance_performed,false);
assert.equal(alignedTransport.credential_possession_proven,false);

for(const [label,mutate] of [
  ["wrong_secret_digest",x=>{x.activation_secret_sha256="b".repeat(64);}],
  ["wrong_capability_id",x=>{x.activation_capability_id=
    "apollyon_training_activation_capability_v1:"+"c".repeat(64);}],
  ["wrong_consumption_slot",x=>{x.training_start_consumption_slot_id=
    "apollyon_training_start_slot_v1:"+"d".repeat(64);}],
]){
  const foreign={...alignedMaterial};
  mutate(foreign);
  const readdressed=buildApollyonActivationCredentialTransportCandidateV1(foreign);
  reject(
    ()=>qualifyApollyonActivationTransportAgainstCapabilityV1(
      parentCandidate,readdressed
    ),
    /transport_parent_candidate_mismatch/u
  );
}

const sourceForbidden=[
  'from "node:fs"','from "node:child_process"','from "node:net"',
  "systemctl","LoadCredential=","SetCredential=","createPrivateKey",
  "writeFile","appendFile","mkdir","spawn(", "execFile(", "fetch(",
  "training_execution_authorized:true","service_action:true",
  "funds_movement:true","raw_secret_in_public_receipt_authorized:true",
];
for(const term of sourceForbidden)assert.equal(source.includes(term),false,term);

for(const [k,expected] of Object.entries({
  source_contract_only:true,
  activation_capability_external_validation_performed:false,
  protected_authorization_slot_origin_proven:false,
  protected_capability_issuance_performed:false,
  protected_credential_source_implemented:false,
  systemd_runtime_transport_proven:false,
  credential_possession_proven:false,
  exact_invocation_generation_bound:false,
  direct_systemd_start_authorized:false,
  capability_replay_authorized:false,
  training_start_consumption_performed:false,
  trainer_release_authorized:false,
  training_execution_authorized:false,
  service_action:false,
  filesystem_write:false,
  credential_access:false,
  funds_movement:false,
})){
  assert.equal(APOLLYON_ACTIVATION_TRANSPORT_AUTHORITY_V1[k],expected,k);
}
assert.equal(
  VOID_APOLLYON_TRAINING_ACTIVATION_CREDENTIAL_TRANSPORT_CONTRACT_V1,
  "VOID_APOLLYON_TRAINING_ACTIVATION_CREDENTIAL_TRANSPORT_CONTRACT_V1",
);

console.log("VOID_APOLLYON_TRAINING_ACTIVATION_CREDENTIAL_TRANSPORT_CONTRACT_V1_PROOF_GREEN");
console.log("exact_parent_capability_contract_blob_bound=true");
console.log("historical_capability_parent_lineage_pinned=true");
console.log("transport_candidate_content_addressed=true");
console.log("parent_capability_candidate_consistency_proven=true");
console.log("readdressed_parent_candidate_drift_rejected=true");
console.log("raw_secret_field_rejected=true");
console.log("fixed_credential_name_bound=true");
console.log("bearer_secret_exact_32_bytes_required=true");
console.log("run_scoped_transport_required=true");
console.log("systemd_load_credential_candidate_only=true");
console.log("systemd_runtime_transport_proven=false");
console.log("protected_origin_validation_performed=false");
console.log("protected_capability_issuance_performed=false");
console.log("capability_replay_authorized=false");
console.log("direct_systemd_start_authorized=false");
console.log("credential_possession_proven=false");
console.log("training_start_consumption_performed=false");
console.log("unknown_and_hidden_keys_rejected=true");
console.log("accessor_getter_not_invoked=true");
console.log("proxy_traps_not_invoked=true");
console.log("oversized_keyset_rejected_before_sort=true");
console.log("service_action=false");
console.log("training_execution_authorized=false");
console.log("funds_movement=false");
