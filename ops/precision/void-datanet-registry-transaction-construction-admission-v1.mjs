#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {spawnSync} from "node:child_process";

import {
  buildVoidDatanetRegistryTransactionConstructionAdmissionV1,
  validateVoidDatanetRegistryTransactionConstructionAdmissionV1,
} from "../../tools/void-datanet-registry-transaction-construction-admission-v1.mjs";

const ROOT=process.cwd();
const args=process.argv.slice(2);

if(args.length!==4){
  console.error(
    "usage: node ops/precision/void-datanet-registry-transaction-construction-admission-v1.mjs DEPLOYMENT_INPUT_PLAN_JSON FRESH_FEE_FUNDING_PACKET_JSON PRE_SIGN_REVALIDATION_JSON OUTPUT_JSON",
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

const deploymentPlan=regularJson(args[0],"deployment_input_plan");
const freshFeePacket=regularJson(args[1],"fresh_fee_funding_packet");
const preSign=regularJson(args[2],"pre_sign_revalidation");

const admission=buildVoidDatanetRegistryTransactionConstructionAdmissionV1({
  deployment_input_plan:deploymentPlan.value,
  fresh_fee_funding_packet:freshFeePacket.value,
  pre_sign_revalidation_receipt:preSign.value,
  evaluated_at_utc:new Date().toISOString(),
});
validateVoidDatanetRegistryTransactionConstructionAdmissionV1(
  admission,
  {
    deployment_input_plan:deploymentPlan.value,
    fresh_fee_funding_packet:freshFeePacket.value,
    pre_sign_revalidation_receipt:preSign.value,
  },
);

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

const deploymentPlanSha=
  crypto.createHash("sha256").update(deploymentPlan.bytes).digest("hex");
const freshFeePacketSha=
  crypto.createHash("sha256").update(freshFeePacket.bytes).digest("hex");
const preSignSha=
  crypto.createHash("sha256").update(preSign.bytes).digest("hex");

fs.writeFileSync(output,JSON.stringify(admission,null,2)+"\n",{
  flag:"wx",
  mode:0o600,
});
fs.chmodSync(output,0o600);

console.log("VOID_DATANET_REGISTRY_TRANSACTION_CONSTRUCTION_ADMISSION_PRECISION_V1");
console.log("construction_admission_id="+admission.construction_admission_id);
console.log("deployment_input_plan_id="+admission.deployment_input_plan_id);
console.log("pre_sign_revalidation_id="+admission.pre_sign_revalidation_id);
console.log("fresh_fee_funding_packet_id="+admission.fresh_fee_funding_packet_id);
console.log("expires_at_utc="+admission.expires_at_utc);
console.log("compiled_repo_head="+currentHead);
console.log("deployment_input_plan_file_sha256="+deploymentPlanSha);
console.log("fresh_fee_funding_packet_file_sha256="+freshFeePacketSha);
console.log("pre_sign_revalidation_file_sha256="+preSignSha);
console.log("construction_authorized=false");
console.log(
  "required_confirmation="+admission.required_confirmation
);
console.log("rpc_call=false");
console.log("credential_access=false");
console.log("wallet_access=false");
console.log("private_key_access=false");
console.log("deployer_funding=false");
console.log("signable_transaction_materialized=false");
console.log("transaction_construction=false");
console.log("transaction_signing=false");
console.log("transaction_submission=false");
console.log("transaction_broadcast=false");
console.log("deployment=false");
console.log("chain2050_mutation=false");
console.log("funds_movement=false");
console.log("output="+output);
console.log("VOID_DATANET_REGISTRY_TRANSACTION_CONSTRUCTION_ADMISSION_PRECISION_V1_GREEN");
