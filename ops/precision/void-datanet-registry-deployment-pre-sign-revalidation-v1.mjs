#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {spawnSync} from "node:child_process";

import {
  runVoidDatanetRegistryDeploymentPreSignRevalidationV1,
  validateVoidDatanetRegistryDeploymentPreSignRevalidationV1,
} from "../../tools/void-datanet-registry-deployment-pre-sign-revalidation-v1.mjs";

const ROOT=process.cwd();
const args=process.argv.slice(2);

if(args.length!==7){
  console.error(
    "usage: node ops/precision/void-datanet-registry-deployment-pre-sign-revalidation-v1.mjs ACTIVATION_PLAN_JSON ACTIVATION_RECEIPT_JSON RESOLUTION_PACKET_JSON DEPLOYMENT_INPUT_PLAN_JSON PRIOR_FEE_FUNDING_RESULT_JSON RECEIPT_OUTPUT_JSON FRESH_FEE_PACKET_OUTPUT_JSON",
  );
  process.exit(2);
}
if(os.hostname()!=="zoso-Precision-Tower-7810"){
  throw new Error("precision_host_required");
}

function regularJson(raw,label,maxBytes=16*1024*1024){
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
  const bytes=fs.readFileSync(file);
  return {file,bytes,value:JSON.parse(bytes.toString("utf8"))};
}
function readRepoJson(relative,label){
  const file=path.join(ROOT,relative);
  const st=fs.lstatSync(file);
  if(st.isSymbolicLink()||!st.isFile()){
    throw new Error(label+"_not_regular");
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
function canonicalOutput(raw,label){
  const file=path.resolve(String(raw));
  if(fs.existsSync(file)) throw new Error(label+"_already_exists");
  const parent=path.dirname(file);
  const st=fs.lstatSync(parent);
  if(
    st.isSymbolicLink()||
    !st.isDirectory()||
    fs.realpathSync(parent)!==parent
  ){
    throw new Error(label+"_parent_invalid");
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

if(git(["branch","--show-current"])!=="main"){
  throw new Error("main_branch_required");
}
if(git(["status","--porcelain=v1","--untracked-files=all"])!==""){
  throw new Error("clean_worktree_required");
}
const currentHead=git(["rev-parse","HEAD"]);

const activationPlan=regularJson(args[0],"activation_plan");
const activationReceipt=regularJson(args[1],"activation_receipt");
const resolutionPacket=regularJson(args[2],"resolution_packet");
const deploymentPlan=regularJson(args[3],"deployment_input_plan");
const priorFee=regularJson(args[4],"prior_fee_funding_result");

for(const candidate of [
  resolutionPacket.value.observed_repo_head,
  priorFee.value.observed_repo_head,
]){
  if(typeof candidate!=="string"||!/^[0-9a-f]{40}$/u.test(candidate)){
    throw new Error("pre_sign_lineage_repo_head_invalid");
  }
  const check=spawnSync(
    "git",
    ["merge-base","--is-ancestor",candidate,currentHead],
    {cwd:ROOT,stdio:["ignore","ignore","ignore"]},
  );
  if(check.status!==0){
    throw new Error("pre_sign_lineage_repo_head_not_ancestor:"+candidate);
  }
}

const service="void-economic-epoch2-qbft-validator-v1.service";
const active=spawnSync(
  "systemctl",
  ["--user","is-active","--quiet",service],
  {stdio:["ignore","ignore","ignore"]},
);
if(active.status!==0){
  throw new Error("precision_private_qbft_service_not_active");
}

const identity=readRepoJson(
  "ops/mainnet0/datanet-content-commitment-compiled-identity-v1.json",
  "compiled_identity",
);
const publisher=readRepoJson(
  "ops/mainnet0/datanet-content-commitment-publisher-selection-v1.json",
  "publisher_selection",
);
const deployer=readRepoJson(
  "ops/mainnet0/datanet-content-commitment-registry-deployer-selection-v1.json",
  "deployer_selection",
);

const result=await runVoidDatanetRegistryDeploymentPreSignRevalidationV1({
  activation_plan:activationPlan.value,
  activation_receipt:activationReceipt.value,
  resolution_packet:resolutionPacket.value,
  deployment_input_plan:deploymentPlan.value,
  fee_funding_result:priorFee.value,
  deployer_address:deployer.deployer_address,
  publisher_address:publisher.publisher_address,
  predecessor_address:"0x0000000000000000000000000000000000000000",
  compiled_identity:identity,
  observed_at_utc:new Date().toISOString(),
});

const receiptOutput=canonicalOutput(args[5],"receipt_output");
const freshPacketOutput=canonicalOutput(args[6],"fresh_fee_packet_output");

if(result.ok!==true){
  writeJson(receiptOutput,result);
  console.log("VOID_DATANET_REGISTRY_DEPLOYMENT_PRE_SIGN_REVALIDATION_PRECISION_V1");
  console.log("status=held");
  console.log("reason="+String(result.reason||"unknown"));
  console.log("credential_access=false");
  console.log("wallet_access=false");
  console.log("private_key_access=false");
  console.log("signable_transaction_constructed=false");
  console.log("transaction_signing=false");
  console.log("transaction_submission=false");
  console.log("transaction_broadcast=false");
  console.log("deployment=false");
  console.log("chain2050_mutation=false");
  console.log("funds_movement=false");
  console.log("receipt_output="+receiptOutput);
  process.exit(2);
}

validateVoidDatanetRegistryDeploymentPreSignRevalidationV1(result.receipt);
writeJson(receiptOutput,result.receipt);
writeJson(freshPacketOutput,result.fresh_fee_funding_packet);

console.log("VOID_DATANET_REGISTRY_DEPLOYMENT_PRE_SIGN_REVALIDATION_PRECISION_V1");
console.log("status="+result.receipt.status);
console.log("pre_sign_revalidation_id="+result.receipt.pre_sign_revalidation_id);
console.log("deployment_input_plan_id="+result.receipt.deployment_input_plan_id);
console.log(
  "prior_fee_funding_packet_id="+
  result.receipt.prior_fee_funding_packet_id
);
console.log(
  "fresh_fee_funding_packet_id="+
  result.receipt.fresh_fee_funding_packet_id
);
console.log("valid_until_utc="+result.receipt.valid_until_utc);
console.log("read_only_rpc_revalidation=true");
console.log("credential_access=false");
console.log("wallet_access=false");
console.log("private_key_access=false");
console.log("deployer_funding=false");
console.log("signable_transaction_materialized=false");
console.log("signable_transaction_construction=false");
console.log("transaction_signing=false");
console.log("transaction_submission=false");
console.log("transaction_broadcast=false");
console.log("deployment=false");
console.log("chain2050_mutation=false");
console.log("funds_movement=false");
console.log("receipt_output="+receiptOutput);
console.log("fresh_fee_packet_output="+freshPacketOutput);
console.log("VOID_DATANET_REGISTRY_DEPLOYMENT_PRE_SIGN_REVALIDATION_PRECISION_V1_GREEN");
