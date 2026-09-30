#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {spawnSync} from "node:child_process";

import {
  buildVoidDatanetRegistryUnsignedDeploymentInputPlanV1,
  validateVoidDatanetRegistryUnsignedDeploymentInputPlanV1,
} from "../../tools/void-datanet-registry-unsigned-deployment-input-plan-v1.mjs";

const ROOT=process.cwd();
const args=process.argv.slice(2);

if(args.length!==4){
  console.error(
    "usage: node ops/precision/void-datanet-registry-unsigned-deployment-input-plan-v1.mjs ACTIVATION_PLAN_JSON ACTIVATION_RECEIPT_JSON RESOLUTION_PACKET_JSON OUTPUT_JSON",
  );
  process.exit(2);
}
if(os.hostname()!=="zoso-Precision-Tower-7810"){
  throw new Error("precision_host_required");
}

function regularJson(raw,label,maxBytes=8*1024*1024){
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
function readRepoJson(relative,label){
  const file=path.join(ROOT,relative);
  const st=fs.lstatSync(file);
  if(st.isSymbolicLink()||!st.isFile()){
    throw new Error(label+"_not_regular");
  }
  return JSON.parse(fs.readFileSync(file,"utf8"));
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

if(
  typeof resolutionPacket.value.observed_repo_head!=="string"||
  !/^[0-9a-f]{40}$/u.test(resolutionPacket.value.observed_repo_head)
){
  throw new Error("resolution_packet_repo_head_invalid");
}
const ancestry=spawnSync(
  "git",
  [
    "merge-base","--is-ancestor",
    resolutionPacket.value.observed_repo_head,
    currentHead,
  ],
  {cwd:ROOT,stdio:["ignore","ignore","ignore"]},
);
if(ancestry.status!==0){
  throw new Error("resolution_packet_repo_head_not_ancestor");
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

const plan=buildVoidDatanetRegistryUnsignedDeploymentInputPlanV1({
  activation_plan:activationPlan.value,
  activation_receipt:activationReceipt.value,
  resolution_packet:resolutionPacket.value,
  deployer_address:deployer.deployer_address,
  publisher_address:publisher.publisher_address,
  predecessor_address:"0x0000000000000000000000000000000000000000",
  compiled_identity:identity,
});
validateVoidDatanetRegistryUnsignedDeploymentInputPlanV1(plan);

const output=path.resolve(args[3]);
if(fs.existsSync(output)){
  throw new Error("output_already_exists");
}
const parent=path.dirname(output);
const pst=fs.lstatSync(parent);
if(
  pst.isSymbolicLink()||
  !pst.isDirectory()||
  fs.realpathSync(parent)!==parent
){
  throw new Error("output_parent_invalid");
}
fs.writeFileSync(output,JSON.stringify(plan,null,2)+"\n",{
  flag:"wx",
  mode:0o600,
});
fs.chmodSync(output,0o600);

console.log("VOID_DATANET_REGISTRY_UNSIGNED_DEPLOYMENT_INPUT_PLAN_PRECISION_V1");
console.log("plan_id="+plan.plan_id);
console.log("activation_plan_id="+plan.activation_lineage.activation_plan_id);
console.log("activation_receipt_id="+plan.activation_lineage.activation_receipt_id);
console.log("resolution_packet_id="+plan.resolution_lineage.resolution_packet_id);
console.log("deployer_address="+plan.deployment_inputs.deployer_address);
console.log("deployer_nonce="+plan.deployment_inputs.deployer_nonce);
console.log(
  "predicted_registry_contract_address="+
  plan.deployment_inputs.predicted_registry_contract_address
);
console.log("predicted_registry_address_vacant=true");
console.log("gas_estimate_observed=false");
console.log("fee_envelope_observed=false");
console.log("signable_transaction_materialized=false");
console.log("rpc_call=false");
console.log("credential_access=false");
console.log("wallet_access=false");
console.log("private_key_access=false");
console.log("transaction_construction=false");
console.log("transaction_signing=false");
console.log("transaction_submission=false");
console.log("transaction_broadcast=false");
console.log("deployment=false");
console.log("chain2050_mutation=false");
console.log("funds_movement=false");
console.log("output="+output);
console.log("VOID_DATANET_REGISTRY_UNSIGNED_DEPLOYMENT_INPUT_PLAN_PRECISION_V1_GREEN");
