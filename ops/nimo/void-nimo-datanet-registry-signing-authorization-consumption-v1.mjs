#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {spawnSync} from "node:child_process";

import {
  consumeVoidDatanetRegistrySigningAuthorizationV1,
} from "../../tools/void-datanet-registry-single-use-signing-authorization-consumption-v1.mjs";

const ROOT=process.cwd();
const STATE_ROOT=path.join(
  os.homedir(),
  ".local/state/void/datanet-registry-signing-v1",
);
const STATE_IDENTITY_FILE=path.join(
  os.homedir(),
  ".config/void/datanet-registry-signing-state-identity-v1.json",
);
const args=process.argv.slice(2);

if(args.length!==12){
  console.error(
    "usage: node ops/nimo/void-nimo-datanet-registry-signing-authorization-consumption-v1.mjs CANDIDATE_JSON DEPLOYMENT_PLAN_JSON CANDIDATE_FEE_PACKET_JSON PRE_SIGN_JSON CONSTRUCTION_ADMISSION_JSON PRIOR_BINDING_JSON CANDIDATE_REVALIDATION_JSON REVALIDATION_FEE_PACKET_JSON FRESH_BINDING_JSON FINAL_SIGNING_REVIEW_JSON SIGNING_REQUEST_JSON SIGNING_AUTHORIZATION_JSON",
  );
  process.exit(2);
}
if(os.hostname()!=="Nimo"){
  throw new Error("nimo_host_required");
}
function regularJson(raw,label,maxBytes=24*1024*1024){
  const file=path.resolve(String(raw));
  const st=fs.lstatSync(file);
  if(st.isSymbolicLink()||!st.isFile()) throw new Error(label+"_not_regular");
  if(fs.realpathSync(file)!==file) throw new Error(label+"_not_canonical");
  if(st.size<1||st.size>maxBytes) throw new Error(label+"_size_invalid");
  return {file,value:JSON.parse(fs.readFileSync(file,"utf8"))};
}
function privateJson(raw,label,maxBytes=128*1024){
  const file=path.resolve(String(raw));
  const st=fs.lstatSync(file);
  if(st.isSymbolicLink()||!st.isFile()){
    throw new Error(label+"_not_regular");
  }
  if(fs.realpathSync.native(file)!==file){
    throw new Error(label+"_not_canonical");
  }
  if(typeof process.getuid==="function"&&st.uid!==process.getuid()){
    throw new Error(label+"_owner_mismatch");
  }
  if((st.mode&0o777)!==0o600){
    throw new Error(label+"_mode_must_be_0600");
  }
  if(st.size<2||st.size>maxBytes){
    throw new Error(label+"_size_invalid");
  }
  let value;
  try{
    value=JSON.parse(
      new TextDecoder("utf-8",{fatal:true}).decode(fs.readFileSync(file)),
    );
  }catch{
    throw new Error(label+"_invalid_utf8_json");
  }
  return {file,value};
}
function repoJson(relative,label){
  const file=path.join(ROOT,relative);
  const st=fs.lstatSync(file);
  if(st.isSymbolicLink()||!st.isFile()) throw new Error(label+"_not_regular");
  if(fs.realpathSync(file)!==file) throw new Error(label+"_not_canonical");
  return JSON.parse(fs.readFileSync(file,"utf8"));
}
function git(argv){
  const result=spawnSync("git",argv,{
    cwd:ROOT,
    encoding:"utf8",
    stdio:["ignore","pipe","pipe"],
  });
  if(result.status!==0){
    throw new Error(
      "git_failed:"+String(result.stderr||result.stdout||"").trim().slice(0,300),
    );
  }
  return String(result.stdout||"").trim();
}
function requireStateRoot(){
  const st=fs.lstatSync(STATE_ROOT);
  if(
    st.isSymbolicLink()||
    !st.isDirectory()||
    fs.realpathSync(STATE_ROOT)!==STATE_ROOT||
    (typeof process.getuid==="function"&&st.uid!==process.getuid())||
    (st.mode&0o777)!==0o700
  ){
    throw new Error("canonical_private_signing_state_root_required");
  }
}

if(git(["branch","--show-current"])!=="main"){
  throw new Error("main_branch_required");
}
if(git(["status","--porcelain=v1","--untracked-files=all"])!==""){
  throw new Error("clean_worktree_required");
}
const currentHead=git(["rev-parse","HEAD"]);

const candidate=regularJson(args[0],"unsigned_candidate");
const deploymentPlan=regularJson(args[1],"deployment_input_plan");
const candidateFee=regularJson(args[2],"candidate_fee_packet");
const preSign=regularJson(args[3],"pre_sign_revalidation");
const constructionAdmission=regularJson(args[4],"construction_admission");
const priorBinding=regularJson(args[5],"prior_credential_binding");
const candidateRevalidation=regularJson(args[6],"candidate_revalidation");
const revalidationFee=regularJson(args[7],"revalidation_fee_packet");
const freshBinding=regularJson(args[8],"fresh_credential_binding");
const finalReview=regularJson(args[9],"final_signing_review");
const signingRequest=regularJson(args[10],"signing_request");
const signingAuthorization=regularJson(args[11],"signing_authorization");
const stateIdentity=privateJson(
  STATE_IDENTITY_FILE,
  "signing_state_identity",
);

for(const head of [
  priorBinding.value.observed_repo_head,
  freshBinding.value.observed_repo_head,
]){
  if(typeof head!=="string"||!/^[0-9a-f]{40}$/u.test(head)){
    throw new Error("credential_binding_repo_head_invalid");
  }
  const check=spawnSync("git",["merge-base","--is-ancestor",head,currentHead],{
    cwd:ROOT,
    stdio:["ignore","ignore","ignore"],
  });
  if(check.status!==0){
    throw new Error("credential_binding_repo_head_not_ancestor:"+head);
  }
}

const deployerSelection=repoJson(
  "ops/mainnet0/datanet-content-commitment-registry-deployer-selection-v1.json",
  "deployer_selection",
);
const candidateEvidence={
  deployment_input_plan:deploymentPlan.value,
  fresh_fee_funding_packet:candidateFee.value,
  pre_sign_revalidation_receipt:preSign.value,
  construction_admission:constructionAdmission.value,
};
const signingRequestEvidence={
  unsigned_transaction_candidate:candidate.value,
  candidate_evidence:candidateEvidence,
  final_signing_review:finalReview.value,
  prior_credential_binding:priorBinding.value,
  candidate_revalidation_receipt:candidateRevalidation.value,
  fresh_fee_funding_packet:revalidationFee.value,
  fresh_credential_binding:freshBinding.value,
  deployer_selection:deployerSelection,
};

requireStateRoot();

const result=consumeVoidDatanetRegistrySigningAuthorizationV1({
  signing_authorization:signingAuthorization.value,
  signing_request:signingRequest.value,
  signing_request_evidence:signingRequestEvidence,
  state_dir:STATE_ROOT,
  state_identity:stateIdentity.value,
});

console.log(
  "VOID_NIMO_DATANET_REGISTRY_SIGNING_AUTHORIZATION_CONSUMPTION_V1",
);
console.log("current_repo_head="+currentHead);
console.log("state_store_runtime_binding=canonical_nimo_private_state_root_generation");
console.log("state_identity_file="+STATE_IDENTITY_FILE);

if(result.ok!==true){
  console.log("status=held");
  console.log("reason="+String(result.reason||"unknown"));
  console.log("authorization_consumed=false");
  console.log("credential_access=false");
  console.log("private_key_access=false");
  console.log("signer_object_exposed=false");
  console.log("transaction_signer_access=false");
  console.log("transaction_signing=false");
  console.log("signed_transaction_export=false");
  console.log("transaction_broadcast=false");
  console.log("chain2050_write=false");
  console.log("funds_movement=false");
  process.exit(2);
}

console.log("status="+result.status);
console.log("consumption_record_id="+result.consumption_record_id);
console.log("signing_authorization_id="+result.signing_authorization_id);
console.log("signing_request_id="+result.signing_request_id);
console.log("candidate_id="+result.candidate_id);
console.log(
  "transaction_fingerprint_sha256="+
  result.transaction_fingerprint_sha256
);
console.log(
  "state_store_realpath_sha256="+
  result.state_store_realpath_sha256
);
console.log("state_store_id="+result.state_store_id);
console.log("signing_operation_id="+result.signing_operation_id);
console.log("authorization_consumed=true");
console.log("immutable_consumption_record=true");
console.log(
  "replay_prevention_scope=exact_state_store_generation_and_signing_operation",
);
console.log("external_state_generation_identity_required=true");
console.log("descriptor_relative_publication=true");
console.log("expiry_rechecked_at_consumption=true");
console.log("consumption_precedes_any_signer_access=true");
console.log("credential_access=false");
console.log("private_key_access=false");
console.log("signer_object_exposed=false");
console.log("wallet_access=false");
console.log("transaction_signer_access=false");
console.log("transaction_signing=false");
console.log("signed_transaction_export=false");
console.log("transaction_submission=false");
console.log("transaction_broadcast=false");
console.log("deployment=false");
console.log("chain2050_write=false");
console.log("funds_movement=false");
console.log(
  "VOID_NIMO_DATANET_REGISTRY_SIGNING_AUTHORIZATION_CONSUMPTION_V1_GREEN",
);
