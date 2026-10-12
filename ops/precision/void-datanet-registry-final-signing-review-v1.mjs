#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {spawnSync} from "node:child_process";

import {
  buildVoidDatanetRegistryFinalSigningReviewV1,
  validateVoidDatanetRegistryFinalSigningReviewEvidenceV1,
} from "../../tools/void-datanet-registry-final-signing-review-v1.mjs";

const ROOT=process.cwd();
const args=process.argv.slice(2);
if(args.length!==10){
  console.error(
    "usage: node ops/precision/void-datanet-registry-final-signing-review-v1.mjs DEPLOYMENT_PLAN_JSON CANDIDATE_FEE_PACKET_JSON CANDIDATE_PRE_SIGN_JSON CONSTRUCTION_ADMISSION_JSON CANDIDATE_JSON PRIOR_CREDENTIAL_BINDING_JSON CANDIDATE_REVALIDATION_JSON REVALIDATION_FRESH_FEE_PACKET_JSON FRESH_CREDENTIAL_BINDING_JSON OUTPUT_JSON",
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
function git(args){
  const result=spawnSync("git",args,{
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
function outputPath(raw){
  const file=path.resolve(String(raw));
  if(fs.existsSync(file)) throw new Error("output_already_exists");
  const parent=path.dirname(file);
  const st=fs.lstatSync(parent);
  if(st.isSymbolicLink()||!st.isDirectory()||fs.realpathSync(parent)!==parent){
    throw new Error("output_parent_invalid");
  }
  return file;
}

if(git(["branch","--show-current"])!=="main"){
  throw new Error("main_branch_required");
}
if(git(["status","--porcelain=v1","--untracked-files=all"])!==""){
  throw new Error("clean_worktree_required");
}
const currentHead=git(["rev-parse","HEAD"]);

const deploymentPlan=regularJson(args[0],"deployment_plan");
const candidateFee=regularJson(args[1],"candidate_fee_packet");
const candidatePreSign=regularJson(args[2],"candidate_pre_sign");
const constructionAdmission=regularJson(args[3],"construction_admission");
const candidate=regularJson(args[4],"candidate");
const priorBinding=regularJson(args[5],"prior_credential_binding");
const candidateRevalidation=regularJson(args[6],"candidate_revalidation");
const revalidationFee=regularJson(args[7],"revalidation_fresh_fee_packet");
const freshBinding=regularJson(args[8],"fresh_credential_binding");

for(const binding of [priorBinding.value,freshBinding.value]){
  const head=String(binding.observed_repo_head||"");
  if(!/^[0-9a-f]{40}$/u.test(head)){
    throw new Error("credential_binding_repo_head_invalid");
  }
  const check=spawnSync(
    "git",
    ["merge-base","--is-ancestor",head,currentHead],
    {cwd:ROOT,stdio:["ignore","ignore","ignore"]},
  );
  if(check.status!==0){
    throw new Error("credential_binding_repo_head_not_ancestor:"+head);
  }
}

const deployerSelection=repoJson(
  "ops/mainnet0/datanet-content-commitment-registry-deployer-selection-v1.json",
  "deployer_selection",
);
const evidence={
  unsigned_transaction_candidate:candidate.value,
  candidate_evidence:{
    deployment_input_plan:deploymentPlan.value,
    fresh_fee_funding_packet:candidateFee.value,
    pre_sign_revalidation_receipt:candidatePreSign.value,
    construction_admission:constructionAdmission.value,
  },
  prior_credential_binding:priorBinding.value,
  candidate_revalidation_receipt:candidateRevalidation.value,
  fresh_fee_funding_packet:revalidationFee.value,
  fresh_credential_binding:freshBinding.value,
  deployer_selection:deployerSelection,
};

const review=buildVoidDatanetRegistryFinalSigningReviewV1({
  ...evidence,
  evaluated_at_utc:new Date().toISOString(),
});
validateVoidDatanetRegistryFinalSigningReviewEvidenceV1(review,evidence);

const output=outputPath(args[9]);
fs.writeFileSync(output,JSON.stringify(review,null,2)+"\n",{
  flag:"wx",
  mode:0o600,
});
fs.chmodSync(output,0o600);

console.log("VOID_DATANET_REGISTRY_FINAL_SIGNING_REVIEW_PRECISION_V1");
console.log("final_signing_review_id="+review.final_signing_review_id);
console.log("candidate_id="+review.candidate_id);
console.log("candidate_revalidation_id="+review.candidate_revalidation_id);
console.log("prior_credential_binding_id="+review.prior_credential_binding_id);
console.log("fresh_credential_binding_id="+review.fresh_credential_binding_id);
console.log("valid_until_utc="+review.valid_until_utc);
console.log("review_artifact_only=true");
console.log("rpc_call=false");
console.log("credential_access=false");
console.log("private_key_access=false");
console.log("wallet_access=false");
console.log("signer_object_exposed=false");
console.log("deployer_funding=false");
console.log("transaction_construction=false");
console.log("transaction_signing_authorized=false");
console.log("transaction_signing=false");
console.log("transaction_submission=false");
console.log("transaction_broadcast=false");
console.log("deployment=false");
console.log("chain2050_mutation=false");
console.log("funds_movement=false");
console.log("signing_authorized=false");
console.log("compiled_repo_head="+currentHead);
console.log("output="+output);
console.log("VOID_DATANET_REGISTRY_FINAL_SIGNING_REVIEW_PRECISION_V1_GREEN");
