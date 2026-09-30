#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {spawnSync} from "node:child_process";

import {
  VOID_DATANET_REGISTRY_TRANSACTION_CONSTRUCTION_CONFIRMATION_V1,
} from "../../tools/void-datanet-registry-transaction-construction-admission-v1.mjs";
import {
  buildVoidDatanetRegistryUnsignedTransactionCandidateV1,
  validateVoidDatanetRegistryUnsignedTransactionCandidateV1,
} from "../../tools/void-datanet-registry-unsigned-transaction-candidate-v1.mjs";

const ROOT=process.cwd();

function parseArgs(argv){
  const out={};
  for(let i=0;i<argv.length;i+=1){
    const key=argv[i];
    if(key==="--confirmation") out.confirmation=String(argv[++i]||"");
    else if(key==="--deployment-plan") out.deployment_plan=String(argv[++i]||"");
    else if(key==="--fresh-fee-packet") out.fresh_fee_packet=String(argv[++i]||"");
    else if(key==="--pre-sign") out.pre_sign=String(argv[++i]||"");
    else if(key==="--admission") out.admission=String(argv[++i]||"");
    else if(key==="--output") out.output=String(argv[++i]||"");
    else throw new Error("unknown_argument:"+String(key));
  }
  for(const key of [
    "confirmation","deployment_plan","fresh_fee_packet",
    "pre_sign","admission","output",
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
function sha256(bytes){
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

const args=parseArgs(process.argv.slice(2));
if(os.hostname()!=="zoso-Precision-Tower-7810"){
  throw new Error("precision_host_required");
}
if(args.confirmation!==
  VOID_DATANET_REGISTRY_TRANSACTION_CONSTRUCTION_CONFIRMATION_V1
){
  throw new Error(
    "explicit_confirmation_required:"+
    VOID_DATANET_REGISTRY_TRANSACTION_CONSTRUCTION_CONFIRMATION_V1,
  );
}
if(git(["branch","--show-current"])!=="main"){
  throw new Error("main_branch_required");
}
if(git(["status","--porcelain=v1","--untracked-files=all"])!==""){
  throw new Error("clean_worktree_required");
}
const currentHead=git(["rev-parse","HEAD"]);

const deploymentPlan=regularJson(args.deployment_plan,"deployment_input_plan");
const freshFee=regularJson(args.fresh_fee_packet,"fresh_fee_funding_packet");
const preSign=regularJson(args.pre_sign,"pre_sign_revalidation");
const admission=regularJson(args.admission,"construction_admission");

const output=path.resolve(args.output);
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

const now=new Date().toISOString();
const candidate=buildVoidDatanetRegistryUnsignedTransactionCandidateV1({
  deployment_input_plan:deploymentPlan.value,
  fresh_fee_funding_packet:freshFee.value,
  pre_sign_revalidation_receipt:preSign.value,
  construction_admission:admission.value,
  constructed_at_utc:now,
  confirmation:args.confirmation,
});
validateVoidDatanetRegistryUnsignedTransactionCandidateV1(
  candidate,
  {
    deployment_input_plan:deploymentPlan.value,
    fresh_fee_funding_packet:freshFee.value,
    pre_sign_revalidation_receipt:preSign.value,
    construction_admission:admission.value,
  },
);

fs.writeFileSync(output,JSON.stringify(candidate,null,2)+"\n",{
  flag:"wx",
  mode:0o600,
});
fs.chmodSync(output,0o600);

console.log("VOID_DATANET_REGISTRY_UNSIGNED_TRANSACTION_CANDIDATE_PRECISION_V1");
console.log("candidate_id="+candidate.candidate_id);
console.log("construction_admission_id="+candidate.construction_admission_id);
console.log("deployment_input_plan_id="+candidate.deployment_input_plan_id);
console.log("fresh_fee_funding_packet_id="+candidate.fresh_fee_funding_packet_id);
console.log("pre_sign_revalidation_id="+candidate.pre_sign_revalidation_id);
console.log("constructed_repo_head="+currentHead);
console.log("constructed_at_utc="+candidate.constructed_at_utc);
console.log("valid_until_utc="+candidate.valid_until_utc);
console.log("transaction_type=2");
console.log("chain_id=2050");
console.log("predicted_contract_address="+
  candidate.transaction.predicted_contract_address);
console.log("unsigned_transaction_hash="+
  candidate.transaction.unsigned_transaction_hash);
console.log("deployment_input_plan_file_sha256="+sha256(deploymentPlan.bytes));
console.log("fresh_fee_funding_packet_file_sha256="+sha256(freshFee.bytes));
console.log("pre_sign_revalidation_file_sha256="+sha256(preSign.bytes));
console.log("construction_admission_file_sha256="+sha256(admission.bytes));
console.log("transaction_construction=true");
console.log("signable_transaction_materialized=true");
console.log("credential_access=false");
console.log("wallet_access=false");
console.log("private_key_access=false");
console.log("deployer_funding=false");
console.log("transaction_signing=false");
console.log("transaction_submission=false");
console.log("transaction_broadcast=false");
console.log("deployment=false");
console.log("chain2050_mutation=false");
console.log("funds_movement=false");
console.log("signing_authorized=false");
console.log("output="+output);
console.log("VOID_DATANET_REGISTRY_UNSIGNED_TRANSACTION_CANDIDATE_PRECISION_V1_GREEN");
