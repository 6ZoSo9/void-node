#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {spawnSync} from "node:child_process";

import {
  buildVoidDatanetRegistryBroadcastAuthorizationRequestV1,
  validateVoidDatanetRegistryBroadcastAuthorizationRequestV1,
  validateVoidDatanetRegistrySignedTransactionVerificationV1,
  verifyVoidDatanetRegistrySignedTransactionAgainstLineageV1,
} from "../../tools/void-datanet-registry-signed-verification-broadcast-request-v1.mjs";

const ROOT=process.cwd();
const MAX_PUBLIC_JSON=24*1024*1024;
const MAX_PRIVATE_JSON=24*1024*1024;

function fail(reason){
  const error=new Error(reason);
  error.name="VoidDatanetRegistrySignedVerificationBroadcastRequestHoldV1";
  throw error;
}
function git(args){
  const result=spawnSync("git",args,{
    cwd:ROOT,
    encoding:"utf8",
    stdio:["ignore","pipe","pipe"],
  });
  if(result.status!==0){
    fail("git_failed:"+String(result.stderr||result.stdout||"").trim().slice(0,220));
  }
  return String(result.stdout||"").trim();
}
function parseArgs(argv){
  const out={};
  for(let i=0;i<argv.length;i+=1){
    const key=argv[i];
    if(!key?.startsWith("--")) fail("invalid_argument:"+String(key));
    const value=String(argv[++i]||"");
    if(!value) fail("missing_argument_value:"+key);
    out[key.slice(2)]=value;
  }
  for(const key of [
    "candidate","deployment-plan","candidate-fee-packet","pre-sign",
    "construction-admission","prior-binding","candidate-revalidation",
    "revalidation-fee-packet","fresh-binding","final-signing-review",
    "signing-request","signing-authorization","signed-transaction",
    "verification-output","broadcast-request-output",
  ]){
    if(!out[key]) fail("missing_argument:"+key);
  }
  return out;
}
function regularJson(raw,label,maxBytes=MAX_PUBLIC_JSON){
  const file=path.resolve(raw);
  const st=fs.lstatSync(file);
  if(st.isSymbolicLink()||!st.isFile()) fail(label+"_not_regular");
  if(fs.realpathSync.native(file)!==file) fail(label+"_not_canonical");
  if(st.size<2||st.size>maxBytes) fail(label+"_size_invalid");
  let value;
  try{
    value=JSON.parse(
      new TextDecoder("utf-8",{fatal:true}).decode(fs.readFileSync(file)),
    );
  }catch{
    fail(label+"_invalid_utf8_json");
  }
  return {file,value};
}
function privateJson(raw,label){
  const file=path.resolve(raw);
  const st=fs.lstatSync(file);
  if(
    st.isSymbolicLink()||
    !st.isFile()||
    fs.realpathSync.native(file)!==file||
    (typeof process.getuid==="function"&&st.uid!==process.getuid())||
    st.nlink!==1||
    (st.mode&0o777)!==0o600||
    st.size<2||
    st.size>MAX_PRIVATE_JSON
  ){
    fail(label+"_private_file_invalid");
  }
  let value;
  try{
    value=JSON.parse(
      new TextDecoder("utf-8",{fatal:true}).decode(fs.readFileSync(file)),
    );
  }catch{
    fail(label+"_invalid_utf8_json");
  }
  return {file,value};
}
function repoJson(relative,label){
  return regularJson(path.join(ROOT,relative),label).value;
}
function outputPath(raw,label){
  const file=path.resolve(raw);
  if(fs.existsSync(file)) fail(label+"_already_exists");
  const parent=path.dirname(file);
  const st=fs.lstatSync(parent);
  if(
    st.isSymbolicLink()||
    !st.isDirectory()||
    fs.realpathSync.native(parent)!==parent||
    (typeof process.getuid==="function"&&st.uid!==process.getuid())||
    (st.mode&0o022)!==0
  ){
    fail(label+"_parent_invalid");
  }
  return file;
}
function writeJsonExclusive(file,value){
  const bytes=Buffer.from(JSON.stringify(value,null,2)+"\n","utf8");
  let fd=-1;
  try{
    fd=fs.openSync(
      file,
      fs.constants.O_WRONLY|
        fs.constants.O_CREAT|
        fs.constants.O_EXCL|
        Number(fs.constants.O_NOFOLLOW||0),
      0o600,
    );
    fs.writeFileSync(fd,bytes);
    fs.fchmodSync(fd,0o600);
    fs.fsyncSync(fd);
  }finally{
    bytes.fill(0);
    if(fd>=0) fs.closeSync(fd);
  }
}

if(os.hostname()!=="zoso-Precision-Tower-7810"){
  fail("precision_host_required");
}
const args=parseArgs(process.argv.slice(2));
if(git(["branch","--show-current"])!=="main") fail("main_branch_required");
if(git(["status","--porcelain=v1","--untracked-files=all"])!==""){
  fail("clean_worktree_required");
}
const currentHead=git(["rev-parse","HEAD"]);

const candidate=regularJson(args.candidate,"candidate");
const deploymentPlan=regularJson(args["deployment-plan"],"deployment_plan");
const candidateFee=regularJson(args["candidate-fee-packet"],"candidate_fee_packet");
const preSign=regularJson(args["pre-sign"],"pre_sign");
const constructionAdmission=regularJson(
  args["construction-admission"],
  "construction_admission",
);
const priorBinding=regularJson(args["prior-binding"],"prior_binding");
const candidateRevalidation=regularJson(
  args["candidate-revalidation"],
  "candidate_revalidation",
);
const revalidationFee=regularJson(
  args["revalidation-fee-packet"],
  "revalidation_fee_packet",
);
const freshBinding=regularJson(args["fresh-binding"],"fresh_binding");
const finalReview=regularJson(args["final-signing-review"],"final_signing_review");
const signingRequest=regularJson(args["signing-request"],"signing_request");
const signingAuthorization=regularJson(
  args["signing-authorization"],
  "signing_authorization",
);
const signedTransaction=privateJson(args["signed-transaction"],"signed_transaction");

for(const head of [
  priorBinding.value.observed_repo_head,
  freshBinding.value.observed_repo_head,
]){
  if(typeof head!=="string"||!/^[0-9a-f]{40}$/u.test(head)){
    fail("credential_binding_repo_head_invalid");
  }
  const check=spawnSync("git",["merge-base","--is-ancestor",head,currentHead],{
    cwd:ROOT,
    stdio:["ignore","ignore","ignore"],
  });
  if(check.status!==0){
    fail("credential_binding_repo_head_not_ancestor:"+head);
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
const verificationEvidence={
  unsigned_transaction_candidate:candidate.value,
  candidate_evidence:candidateEvidence,
  signing_request:signingRequest.value,
  signing_request_evidence:signingRequestEvidence,
  signing_authorization:signingAuthorization.value,
  signed_transaction:signedTransaction.value,
};

const verification=
  verifyVoidDatanetRegistrySignedTransactionAgainstLineageV1(
    verificationEvidence,
  );
validateVoidDatanetRegistrySignedTransactionVerificationV1(
  verification,
  verificationEvidence,
);
const request=buildVoidDatanetRegistryBroadcastAuthorizationRequestV1({
  signed_transaction_verification:verification,
  verification_evidence:verificationEvidence,
});
validateVoidDatanetRegistryBroadcastAuthorizationRequestV1(
  request,
  {
    signed_transaction_verification:verification,
    verification_evidence:verificationEvidence,
  },
);

const verificationOutput=outputPath(
  args["verification-output"],
  "verification_output",
);
const requestOutput=outputPath(
  args["broadcast-request-output"],
  "broadcast_request_output",
);
writeJsonExclusive(verificationOutput,verification);
try{
  writeJsonExclusive(requestOutput,request);
}catch(error){
  try{fs.unlinkSync(verificationOutput);}catch(cleanupError){void cleanupError;}
  throw error;
}

console.log("VOID_DATANET_REGISTRY_SIGNED_VERIFICATION_BROADCAST_REQUEST_PRECISION_V1");
console.log("signed_transaction_verification_id="+
  verification.signed_transaction_verification_id);
console.log("broadcast_authorization_request_id="+
  request.broadcast_authorization_request_id);
console.log("signed_transaction_id="+verification.signed_transaction_id);
console.log("signed_transaction_hash="+
  verification.transaction_summary.signed_transaction_hash);
console.log("required_confirmation="+request.required_confirmation);
console.log("signed_transaction_bytes_output=false");
console.log("credential_access=false");
console.log("private_key_access=false");
console.log("broadcaster_access=false");
console.log("transaction_submission=false");
console.log("transaction_broadcast_authorized=false");
console.log("transaction_broadcast=false");
console.log("deployment=false");
console.log("chain2050_write=false");
console.log("automatic_retry=false");
console.log("verification_output="+verificationOutput);
console.log("broadcast_request_output="+requestOutput);
console.log("VOID_DATANET_REGISTRY_SIGNED_VERIFICATION_BROADCAST_REQUEST_PRECISION_V1_GREEN");
