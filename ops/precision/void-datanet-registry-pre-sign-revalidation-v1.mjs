#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {spawnSync} from "node:child_process";

import {
  runVoidDatanetRegistryPreSignRevalidationV1,
  validateVoidDatanetRegistryPreSignRevalidationV1,
} from "../../tools/void-datanet-registry-pre-sign-revalidation-v1.mjs";

const ROOT=process.cwd();
const args=process.argv.slice(2);
if(args.length!==6){
  console.error(
    "usage: node ops/precision/void-datanet-registry-pre-sign-revalidation-v1.mjs ACTIVATION_PLAN_JSON ACTIVATION_RECEIPT_JSON RESOLUTION_PACKET_JSON DEPLOYMENT_INPUT_PLAN_JSON PRIOR_FEE_PACKET_JSON OUTPUT_JSON",
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
const priorFeePacket=regularJson(args[4],"prior_fee_packet");

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

const receipt=await runVoidDatanetRegistryPreSignRevalidationV1({
  rpc_url:"http://127.0.0.1:18553/",
  activation_plan:activationPlan.value,
  activation_receipt:activationReceipt.value,
  resolution_packet:resolutionPacket.value,
  deployment_input_plan:deploymentPlan.value,
  prior_fee_funding_packet:priorFeePacket.value,
  deployer_address:deployer.deployer_address,
  publisher_address:publisher.publisher_address,
  predecessor_address:"0x0000000000000000000000000000000000000000",
  compiled_identity:identity,
  observed_at_utc:new Date().toISOString(),
});

if(receipt.ok===true){
  validateVoidDatanetRegistryPreSignRevalidationV1(receipt);
}

const output=path.resolve(args[5]);
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
fs.writeFileSync(output,JSON.stringify(receipt,null,2)+"\n",{
  flag:"wx",
  mode:0o600,
});
fs.chmodSync(output,0o600);

console.log("VOID_DATANET_REGISTRY_PRE_SIGN_REVALIDATION_PRECISION_V1");
console.log("ok="+String(receipt.ok===true));
console.log("status="+receipt.status);
if(receipt.ok===true){
  console.log("revalidation_id="+receipt.revalidation_id);
  console.log("observed_at_utc="+receipt.observed_at_utc);
  console.log("valid_until_utc="+receipt.valid_until_utc);
  console.log(
    "fresh_fee_funding_packet_id="+
    receipt.fresh_fee_funding_packet_id
  );
  console.log(
    "proposed_gas_limit="+
    receipt.observation.proposed_gas_limit
  );
  console.log(
    "max_fee_per_gas_wei="+
    receipt.observation.max_fee_per_gas_wei
  );
  console.log(
    "max_priority_fee_per_gas_wei="+
    receipt.observation.max_priority_fee_per_gas_wei
  );
}
console.log("signable_transaction_construction_authorized=false");
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
console.log("output="+output);

if(receipt.ok!==true){
  process.exitCode=2;
}
