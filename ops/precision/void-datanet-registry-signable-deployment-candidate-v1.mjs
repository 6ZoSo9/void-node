#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {spawnSync} from "node:child_process";

import {
  VOID_DATANET_REGISTRY_SIGNABLE_DEPLOYMENT_CANDIDATE_V1,
  buildVoidDatanetRegistryConstructionHoldV1,
  constructVoidDatanetRegistrySignableDeploymentCandidateV1,
  validateVoidDatanetRegistrySignableDeploymentCandidateV1,
} from "../../tools/void-datanet-registry-signable-deployment-candidate-v1.mjs";

const ROOT=process.cwd();

function parseArgs(argv){
  const out={apply:false,confirmation:""};
  for(let i=0;i<argv.length;i+=1){
    const key=argv[i];
    if(key==="--apply"){
      out.apply=true;
      continue;
    }
    if(key==="--confirmation"){
      out.confirmation=String(argv[++i]||"");
      continue;
    }
    if(
      ["--deployment-plan","--fresh-fee-packet","--pre-sign","--admission","--output"]
        .includes(key)
    ){
      out[key.slice(2).replaceAll("-","_")]=String(argv[++i]||"");
      continue;
    }
    throw new Error("unknown_argument:"+String(key));
  }
  for(const key of [
    "deployment_plan",
    "fresh_fee_packet",
    "pre_sign",
    "admission",
    "output",
  ]){
    if(!out[key]) throw new Error("missing_argument:"+key);
  }
  return out;
}
function regularJson(raw,label,maxBytes=24*1024*1024){
  const file=path.resolve(String(raw));
  const st=fs.lstatSync(file);
  if(st.isSymbolicLink()||!st.isFile()){
    throw new Error(label+"_not_regular");
  }
  if(fs.realpathSync(file)!==file){
    throw new Error(label+"_not_canonical");
  }
  if(st.size<1||st.size>maxBytes){
    throw new Error(label+"_size_invalid");
  }
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
  if(
    st.isSymbolicLink()||
    !st.isDirectory()||
    fs.realpathSync(parent)!==parent
  ){
    throw new Error("output_parent_invalid");
  }
  return file;
}
function writeJson(file,value){
  fs.writeFileSync(file,JSON.stringify(value,null,2)+"\n",{
    flag:"wx",
    mode:0o600,
  });
  fs.chmodSync(file,0o600);
}

const args=parseArgs(process.argv.slice(2));
if(os.hostname()!=="zoso-Precision-Tower-7810"){
  throw new Error("precision_host_required");
}
if(git(["branch","--show-current"])!=="main"){
  throw new Error("main_branch_required");
}
if(git(["status","--porcelain=v1","--untracked-files=all"])!==""){
  throw new Error("clean_worktree_required");
}
const currentHead=git(["rev-parse","HEAD"]);

const evidence={
  deployment_input_plan:
    regularJson(args.deployment_plan,"deployment_input_plan"),
  fresh_fee_funding_packet:
    regularJson(args.fresh_fee_packet,"fresh_fee_funding_packet"),
  pre_sign_revalidation_receipt:
    regularJson(args.pre_sign,"pre_sign_revalidation"),
  construction_admission:
    regularJson(args.admission,"construction_admission"),
};
const out=outputPath(args.output);

const hold=buildVoidDatanetRegistryConstructionHoldV1(evidence);
console.log("VOID_DATANET_REGISTRY_SIGNABLE_DEPLOYMENT_CANDIDATE_PRECISION_V1");
console.log("compiled_repo_head="+currentHead);
console.log("construction_admission_id="+hold.construction_admission_id);
console.log("deployment_input_plan_id="+hold.deployment_input_plan_id);
console.log("pre_sign_revalidation_id="+hold.pre_sign_revalidation_id);
console.log("fresh_fee_funding_packet_id="+hold.fresh_fee_funding_packet_id);
console.log("expires_at_utc="+hold.expires_at_utc);
console.log("apply="+String(args.apply));
console.log("construction_authorized=false");
console.log("required_confirmation="+hold.required_confirmation);
console.log("credential_access=false");
console.log("wallet_access=false");
console.log("private_key_access=false");
console.log("transaction_signing=false");
console.log("transaction_submission=false");
console.log("transaction_broadcast=false");
console.log("deployment=false");
console.log("chain2050_mutation=false");
console.log("funds_movement=false");

if(!args.apply){
  writeJson(out,{
    ...hold,
    compiled_repo_head:currentHead,
  });
  console.log("signable_transaction_materialized=false");
  console.log("output="+out);
  console.log(
    VOID_DATANET_REGISTRY_SIGNABLE_DEPLOYMENT_CANDIDATE_V1+
    "_PLAN_GREEN",
  );
  process.exit(0);
}

const candidate=
  constructVoidDatanetRegistrySignableDeploymentCandidateV1({
    ...evidence,
    confirmation:args.confirmation,
    constructed_at_utc:new Date().toISOString(),
  });
validateVoidDatanetRegistrySignableDeploymentCandidateV1(candidate,evidence);
writeJson(out,{
  ...candidate,
  compiled_repo_head:currentHead,
});

console.log("candidate_id="+candidate.candidate_id);
console.log(
  "unsigned_transaction_hash="+
  candidate.candidate.unsigned_transaction_hash
);
console.log(
  "predicted_registry_contract_address="+
  candidate.candidate.predicted_registry_contract_address
);
console.log("signable_transaction_materialized=true");
console.log("transaction_construction=true");
console.log("credential_access=false");
console.log("wallet_access=false");
console.log("private_key_access=false");
console.log("transaction_signing=false");
console.log("transaction_submission=false");
console.log("transaction_broadcast=false");
console.log("deployment=false");
console.log("chain2050_mutation=false");
console.log("funds_movement=false");
console.log("output="+out);
console.log(
  VOID_DATANET_REGISTRY_SIGNABLE_DEPLOYMENT_CANDIDATE_V1+"_GREEN",
);
