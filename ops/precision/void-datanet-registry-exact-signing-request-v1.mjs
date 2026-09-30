#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {spawnSync} from "node:child_process";

import {
  buildVoidDatanetRegistryExactSigningRequestV1,
  validateVoidDatanetRegistryExactSigningRequestV1,
} from "../../tools/void-datanet-registry-exact-signing-request-v1.mjs";

const ROOT=process.cwd();
const args=process.argv.slice(2);

if(args.length!==11){
  console.error(
    "usage: node ops/precision/void-datanet-registry-exact-signing-request-v1.mjs CANDIDATE_JSON DEPLOYMENT_PLAN_JSON CANDIDATE_FEE_PACKET_JSON PRE_SIGN_JSON CONSTRUCTION_ADMISSION_JSON PRIOR_BINDING_JSON CANDIDATE_REVALIDATION_JSON REVALIDATION_FEE_PACKET_JSON FRESH_BINDING_JSON FINAL_SIGNING_REVIEW_JSON OUTPUT_JSON",
  );
  process.exit(2);
}
if(os.hostname()!=="zoso-Precision-Tower-7810"){
  throw new Error("precision_host_required");
}

function regularJson(raw,label,maxBytes=24*1024*1024){
  const file=path.resolve(String(raw));
  const st=fs.lstatSync(file);
  if(st.isSymbolicLink()||!st.isFile()) throw new Error(label+"_not_regular");
  if(fs.realpathSync(file)!==file) throw new Error(label+"_not_canonical");
  if(st.size<1||st.size>maxBytes) throw new Error(label+"_size_invalid");
  const bytes=fs.readFileSync(file);
  return {file,bytes,value:JSON.parse(bytes.toString("utf8"))};
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
const reviewEvidence={
  unsigned_transaction_candidate:candidate.value,
  candidate_evidence:candidateEvidence,
  prior_credential_binding:priorBinding.value,
  candidate_revalidation_receipt:candidateRevalidation.value,
  fresh_fee_funding_packet:revalidationFee.value,
  fresh_credential_binding:freshBinding.value,
  deployer_selection:deployerSelection,
};

const request=buildVoidDatanetRegistryExactSigningRequestV1({
  ...reviewEvidence,
  final_signing_review:finalReview.value,
  requested_at_utc:new Date().toISOString(),
});
validateVoidDatanetRegistryExactSigningRequestV1(request,{
  ...reviewEvidence,
  final_signing_review:finalReview.value,
});

const output=path.resolve(args[10]);
if(fs.existsSync(output)) throw new Error("output_already_exists");
const parent=path.dirname(output);
const pst=fs.lstatSync(parent);
if(
  pst.isSymbolicLink()||
  !pst.isDirectory()||
  fs.realpathSync(parent)!==parent
){
  throw new Error("output_parent_invalid");
}
fs.writeFileSync(output,JSON.stringify(request,null,2)+"\n",{
  flag:"wx",
  mode:0o600,
});
fs.chmodSync(output,0o600);

console.log("VOID_DATANET_REGISTRY_EXACT_SIGNING_REQUEST_PRECISION_V1");
console.log("signing_request_id="+request.signing_request_id);
console.log("candidate_id="+request.candidate_id);
console.log("final_signing_review_id="+request.final_signing_review_id);
console.log(
  "unsigned_transaction_hash="+
  request.transaction_summary.unsigned_transaction_hash
);
console.log(
  "transaction_fingerprint_sha256="+
  request.transaction_fingerprint_sha256
);
console.log("deployer_address="+request.transaction_summary.from_address);
console.log("valid_until_utc="+request.valid_until_utc);
console.log("compiled_repo_head="+currentHead);
console.log("source_request_only=true");
console.log("rpc_call=false");
console.log("credential_access=false");
console.log("private_key_access=false");
console.log("wallet_access=false");
console.log("signer_object_exposed=false");
console.log("signing_authorized=false");
console.log("transaction_signing=false");
console.log("signed_transaction_export=false");
console.log("transaction_submission=false");
console.log("transaction_broadcast=false");
console.log("deployment=false");
console.log("chain2050_mutation=false");
console.log("funds_movement=false");
console.log("required_confirmation="+request.required_confirmation);
console.log("output="+output);
console.log("VOID_DATANET_REGISTRY_EXACT_SIGNING_REQUEST_PRECISION_V1_GREEN");
