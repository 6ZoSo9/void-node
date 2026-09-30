#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {spawnSync} from "node:child_process";

import {
  runVoidDatanetRegistryExactNimoSigningV1,
} from "../../tools/void-datanet-registry-exact-nimo-signing-v1.mjs";

const ROOT=process.cwd();
const STATE_ROOT=path.join(
  os.homedir(),
  ".local/state/void/datanet-registry-signing-v1",
);

function parseArgs(argv){
  const out={};
  for(let i=0;i<argv.length;i+=1){
    const key=argv[i];
    const value=argv[++i];
    if(!key?.startsWith("--")||value===undefined){
      throw new Error("invalid_arguments");
    }
    out[key.slice(2)]=String(value);
  }
  for(const key of [
    "candidate",
    "deployment-plan",
    "candidate-fee-packet",
    "pre-sign",
    "construction-admission",
    "prior-binding",
    "candidate-revalidation",
    "revalidation-fee-packet",
    "fresh-binding",
    "final-signing-review",
    "signing-request",
    "signing-authorization",
    "credentials-directory",
    "confirmation",
    "output",
  ]){
    if(!out[key]) throw new Error("missing_argument:"+key);
  }
  return out;
}
function regularJson(raw,label,maxBytes=24*1024*1024){
  const file=path.resolve(String(raw));
  const st=fs.lstatSync(file);
  if(st.isSymbolicLink()||!st.isFile()) throw new Error(label+"_not_regular");
  if(fs.realpathSync(file)!==file) throw new Error(label+"_not_canonical");
  if(st.size<1||st.size>maxBytes) throw new Error(label+"_size_invalid");
  return {file,value:JSON.parse(fs.readFileSync(file,"utf8"))};
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
      "git_failed:"+
      String(result.stderr||result.stdout||"").trim().slice(0,300),
    );
  }
  return String(result.stdout||"").trim();
}
function fsyncDirectory(directory){
  const fd=fs.openSync(directory,"r");
  try{fs.fsyncSync(fd);}finally{fs.closeSync(fd);}
}
function outputPath(raw){
  const file=path.resolve(String(raw));
  if(fs.existsSync(file)) throw new Error("output_already_exists");
  const parent=path.dirname(file);
  const st=fs.lstatSync(parent);
  if(
    st.isSymbolicLink()||
    !st.isDirectory()||
    fs.realpathSync(parent)!==parent||
    (typeof process.getuid==="function"&&st.uid!==process.getuid())
  ){
    throw new Error("output_parent_invalid");
  }
  return {file,parent};
}
function publishPrivateJson(output,value){
  const temporary=path.join(
    output.parent,
    "."+path.basename(output.file)+".tmp-"+String(process.pid)+"-"+
      Date.now().toString(16),
  );
  const bytes=Buffer.from(JSON.stringify(value,null,2)+"\n","utf8");
  const fd=fs.openSync(temporary,"wx",0o600);
  try{
    fs.fchmodSync(fd,0o600);
    fs.writeFileSync(fd,bytes);
    fs.fsyncSync(fd);
  }finally{
    fs.closeSync(fd);
  }
  let linked=false;
  try{
    fs.linkSync(temporary,output.file);
    linked=true;
    fsyncDirectory(output.parent);
  }finally{
    try{fs.unlinkSync(temporary);}catch(error){
      if(error?.code!=="ENOENT"&&!linked) throw error;
    }
  }
  const stat=fs.lstatSync(output.file);
  if(
    !stat.isFile()||
    stat.isSymbolicLink()||
    stat.nlink!==1||
    (typeof process.getuid==="function"&&stat.uid!==process.getuid())||
    (stat.mode&0o777)!==0o600
  ){
    throw new Error("signed_export_file_out_of_policy");
  }
}

const args=parseArgs(process.argv.slice(2));
if(os.hostname()!=="Nimo"){
  throw new Error("nimo_host_required");
}
if(git(["branch","--show-current"])!=="main"){
  throw new Error("main_branch_required");
}
if(git(["status","--porcelain=v1","--untracked-files=all"])!==""){
  throw new Error("clean_worktree_required");
}
const currentHead=git(["rev-parse","HEAD"]);

const candidate=regularJson(args.candidate,"unsigned_candidate");
const deploymentPlan=regularJson(args["deployment-plan"],"deployment_plan");
const candidateFee=regularJson(
  args["candidate-fee-packet"],
  "candidate_fee_packet",
);
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
const finalReview=regularJson(
  args["final-signing-review"],
  "final_signing_review",
);
const signingRequest=regularJson(args["signing-request"],"signing_request");
const signingAuthorization=regularJson(
  args["signing-authorization"],
  "signing_authorization",
);
const selection=repoJson(
  "ops/mainnet0/datanet-content-commitment-registry-deployer-selection-v1.json",
  "deployer_selection",
);
const output=outputPath(args.output);

if(
  args.confirmation!==
    String(signingAuthorization.value.required_confirmation||"")
){
  throw new Error("exact_transaction_bound_signing_confirmation_required");
}

for(const head of [
  priorBinding.value.observed_repo_head,
  freshBinding.value.observed_repo_head,
]){
  if(typeof head!=="string"||!/^[0-9a-f]{40}$/u.test(head)){
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
  deployer_selection:selection,
};

const result=runVoidDatanetRegistryExactNimoSigningV1({
  unsigned_transaction_candidate:candidate.value,
  candidate_evidence:candidateEvidence,
  signing_request:signingRequest.value,
  signing_request_evidence:signingRequestEvidence,
  signing_authorization:signingAuthorization.value,
  deployer_selection:selection,
  state_dir:STATE_ROOT,
  credentials_directory:path.resolve(args["credentials-directory"]),
  confirmation:args.confirmation,
});

console.log("VOID_NIMO_DATANET_REGISTRY_EXACT_SIGNING_V1");
console.log("current_repo_head="+currentHead);
console.log("state_store_runtime_binding=canonical_nimo_private_state_root");
console.log("transaction_bound_confirmation_verified=true");

if(result.ok!==true){
  console.log("status=held");
  console.log("reason="+String(result.reason||"unknown"));
  console.log(
    "signing_claim_published="+
    String(result.signing_claim_published===true),
  );
  console.log(
    "credential_access_performed="+
    String(result.credential_access_performed===true),
  );
  console.log(
    "private_key_access_performed="+
    String(result.private_key_access_performed===true),
  );
  console.log(
    "transaction_signing_performed="+
    String(result.transaction_signing_performed===true),
  );
  console.log(
    "signed_transaction_state_record_published="+
    String(result.signed_transaction_state_record_published===true),
  );
  console.log("signed_transaction_export_performed=false");
  console.log("transaction_submission=false");
  console.log("transaction_broadcast=false");
  console.log("deployment=false");
  console.log("chain2050_write=false");
  console.log("funds_movement=false");
  process.exit(2);
}

try{
  publishPrivateJson(output,result);
}catch(error){
  console.log("status=signed_state_green_export_hold");
  console.log("reason=signed_transaction_export_failed");
  console.log(
    "signed_transaction_artifact_id="+
    result.signed_transaction_artifact_id,
  );
  console.log("signed_transaction_hash="+result.signed_transaction.signed_transaction_hash);
  console.log("signing_claim_id="+result.signing_claim_id);
  console.log("signed_transaction_state_record_published=true");
  console.log("signed_transaction_export_performed=false");
  console.log("transaction_submission=false");
  console.log("transaction_broadcast=false");
  console.log("deployment=false");
  console.log("chain2050_write=false");
  console.log("funds_movement=false");
  process.exit(2);
}

console.log("status="+result.status);
console.log(
  "signed_transaction_artifact_id="+
  result.signed_transaction_artifact_id,
);
console.log(
  "signing_authorization_id="+
  result.signing_authorization_id,
);
console.log("signing_claim_id="+result.signing_claim_id);
console.log("candidate_id="+result.candidate_id);
console.log(
  "signed_transaction_hash="+
  result.signed_transaction.signed_transaction_hash,
);
console.log(
  "predicted_contract_address="+
  result.predicted_contract_address,
);
console.log("credential_access_performed=true");
console.log("private_key_access_performed=true");
console.log("signer_object_exposed=false");
console.log("wallet_access=false");
console.log("transaction_signing_performed=true");
console.log("signed_transaction_state_record_published=true");
console.log("signed_transaction_export_performed=true");
console.log("signed_transaction_bytes_stdout=false");
console.log("transaction_submission=false");
console.log("transaction_broadcast_authorized=false");
console.log("transaction_broadcast=false");
console.log("deployment=false");
console.log("chain2050_write=false");
console.log("funds_movement=false");
console.log("output="+output.file);
console.log("VOID_NIMO_DATANET_REGISTRY_EXACT_SIGNING_V1_GREEN");
