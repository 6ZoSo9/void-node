#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {spawnSync} from "node:child_process";

import {
  VOID_DATANET_REGISTRY_DEPLOYER_CREDENTIAL_BINDING_CONFIRMATION_V1,
  runVoidDatanetRegistryDeployerCredentialBindingV1,
} from "../../tools/void-datanet-registry-deployer-credential-binding-v1.mjs";

const ROOT=process.cwd();

function parseArgs(argv){
  const out={};
  for(let i=0;i<argv.length;i+=1){
    const key=argv[i];
    if(key==="--confirmation") out.confirmation=String(argv[++i]||"");
    else if(key==="--candidate") out.candidate=String(argv[++i]||"");
    else if(key==="--deployment-plan") out.deployment_plan=String(argv[++i]||"");
    else if(key==="--fresh-fee-packet") out.fresh_fee_packet=String(argv[++i]||"");
    else if(key==="--pre-sign") out.pre_sign=String(argv[++i]||"");
    else if(key==="--construction-admission") {
      out.construction_admission=String(argv[++i]||"");
    } else if(key==="--credentials-directory") {
      out.credentials_directory=String(argv[++i]||"");
    } else if(key==="--output") out.output=String(argv[++i]||"");
    else throw new Error("unknown_argument:"+String(key));
  }
  for(const key of [
    "confirmation","candidate","deployment_plan","fresh_fee_packet",
    "pre_sign","construction_admission","credentials_directory","output",
  ]){
    if(!out[key]) throw new Error("missing_argument:"+key);
  }
  return out;
}
function regularJson(raw,label,maxBytes=24*1024*1024){
  const file=path.resolve(raw);
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
  const file=path.resolve(raw);
  if(fs.existsSync(file)) throw new Error("output_already_exists");
  const parent=path.dirname(file);
  const st=fs.lstatSync(parent);
  if(
    st.isSymbolicLink()||
    !st.isDirectory()||
    fs.realpathSync(parent)!==parent
  ){
    throw new Error("output_parent_invalid");
  }
  return file;
}

const args=parseArgs(process.argv.slice(2));
if(os.hostname()!=="Nimo"){
  throw new Error("nimo_host_required");
}
if(
  args.confirmation!==
    VOID_DATANET_REGISTRY_DEPLOYER_CREDENTIAL_BINDING_CONFIRMATION_V1
){
  throw new Error(
    "explicit_confirmation_required:"+
    VOID_DATANET_REGISTRY_DEPLOYER_CREDENTIAL_BINDING_CONFIRMATION_V1,
  );
}
if(git(["branch","--show-current"])!=="main"){
  throw new Error("main_branch_required");
}
if(git(["status","--porcelain=v1","--untracked-files=all"])!==""){
  throw new Error("clean_worktree_required");
}
const currentHead=git(["rev-parse","HEAD"]);

const candidate=regularJson(args.candidate,"unsigned_transaction_candidate");
const deploymentPlan=regularJson(args.deployment_plan,"deployment_input_plan");
const freshFee=regularJson(args.fresh_fee_packet,"fresh_fee_funding_packet");
const preSign=regularJson(args.pre_sign,"pre_sign_revalidation");
const constructionAdmission=regularJson(
  args.construction_admission,
  "construction_admission",
);
const selection=repoJson(
  "ops/mainnet0/datanet-content-commitment-registry-deployer-selection-v1.json",
  "deployer_selection",
);
const output=outputPath(args.output);

const result=await runVoidDatanetRegistryDeployerCredentialBindingV1({
  confirmation:args.confirmation,
  credentials_directory:args.credentials_directory,
  deployer_selection:selection,
  unsigned_transaction_candidate:candidate.value,
  candidate_evidence:{
    deployment_input_plan:deploymentPlan.value,
    fresh_fee_funding_packet:freshFee.value,
    pre_sign_revalidation_receipt:preSign.value,
    construction_admission:constructionAdmission.value,
  },
  bound_at_utc:new Date().toISOString(),
});

if(result.ok!==true){
  const failure={
    ...result,
    observed_on_host:os.hostname(),
    observed_repo_head:currentHead,
  };
  fs.writeFileSync(output,JSON.stringify(failure,null,2)+"\n",{
    flag:"wx",
    mode:0o600,
  });
  fs.chmodSync(output,0o600);
  console.log("VOID_DATANET_REGISTRY_DEPLOYER_CREDENTIAL_BINDING_NIMO_V1");
  console.log("status=held");
  console.log("reason="+String(result.reason||"unknown"));
  console.log("credential_id="+String(result.credential_id||""));
  console.log("credential_content_access_performed="+
    String(result.credential_content_access_performed===true));
  console.log("private_key_access_performed="+
    String(result.private_key_access_performed===true));
  console.log("raw_private_key_output=false");
  console.log("private_key_digest_output=false");
  console.log("signer_object_exposed=false");
  console.log("transaction_signing=false");
  console.log("transaction_submission=false");
  console.log("transaction_broadcast=false");
  console.log("chain2050_write=false");
  console.log("funds_movement=false");
  console.log("output="+output);
  process.exit(2);
}

const receipt={
  ...result.binding,
  observed_on_host:os.hostname(),
  observed_repo_head:currentHead,
};
fs.writeFileSync(output,JSON.stringify(receipt,null,2)+"\n",{
  flag:"wx",
  mode:0o600,
});
fs.chmodSync(output,0o600);

console.log("VOID_DATANET_REGISTRY_DEPLOYER_CREDENTIAL_BINDING_NIMO_V1");
console.log("status="+receipt.status);
console.log("credential_binding_id="+receipt.credential_binding_id);
console.log("candidate_id="+receipt.candidate_id);
console.log("unsigned_transaction_hash="+receipt.unsigned_transaction_hash);
console.log("deployer_address="+receipt.deployer_address);
console.log("credential_id="+receipt.credential_id);
console.log("public_ceremony_id="+receipt.public_ceremony_id);
console.log("credential_content_access_performed=true");
console.log("private_key_access_performed=true");
console.log("raw_private_key_output=false");
console.log("private_key_digest_output=false");
console.log("signer_object_exposed=false");
console.log("wallet_access=false");
console.log("transaction_signing_authorized=false");
console.log("transaction_signing=false");
console.log("transaction_submission=false");
console.log("transaction_broadcast=false");
console.log("deployment=false");
console.log("chain2050_write=false");
console.log("funds_movement=false");
console.log("signing_authorized=false");
console.log("output="+output);
console.log("VOID_DATANET_REGISTRY_DEPLOYER_CREDENTIAL_BINDING_NIMO_V1_GREEN");
