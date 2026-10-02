#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {spawnSync} from "node:child_process";

import {
  observeDatanetRegistryDeployerResolutionV1,
} from "../../tools/datanet-content-commitment-registry-deployer-resolution-observer-v1.mjs";
import {
  buildVoidDatanetActivationBoundDeployerObserverInputV1,
  buildVoidDatanetActivationBoundResolutionPacketV1,
} from "../../tools/void-datanet-registry-deployer-activation-bound-observer-v1.mjs";

const ROOT=process.cwd();
const args=process.argv.slice(2);

if(args.length!==3){
  console.error(
    "usage: node ops/precision/void-datanet-registry-deployer-resolution-activation-bound-v1.mjs ACTIVATION_PLAN_JSON ACTIVATION_RECEIPT_JSON OUTPUT_JSON",
  );
  process.exit(2);
}
if(os.hostname()!=="zoso-Precision-Tower-7810"){
  throw new Error("precision_host_required");
}

function regularJson(raw,label,maxBytes=2*1024*1024){
  const file=path.resolve(String(raw));
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
function sha256(value){
  return crypto.createHash("sha256").update(value).digest("hex");
}

if(git(["branch","--show-current"])!=="main") throw new Error("main_branch_required");
if(git(["status","--porcelain=v1","--untracked-files=all"])!==""){
  throw new Error("clean_worktree_required");
}
const repoHead=git(["rev-parse","HEAD"]);

const activationPlan=regularJson(args[0],"activation_plan");
const activationReceipt=regularJson(args[1],"activation_receipt");

const identity=JSON.parse(fs.readFileSync(
  path.join(ROOT,"ops/mainnet0/datanet-content-commitment-compiled-identity-v1.json"),
  "utf8",
));
const publisher=JSON.parse(fs.readFileSync(
  path.join(ROOT,"ops/mainnet0/datanet-content-commitment-publisher-selection-v1.json"),
  "utf8",
));
const deployer=JSON.parse(fs.readFileSync(
  path.join(ROOT,"ops/mainnet0/datanet-content-commitment-registry-deployer-selection-v1.json"),
  "utf8",
));

const binding=buildVoidDatanetActivationBoundDeployerObserverInputV1({
  activation_plan:activationPlan.value,
  activation_receipt:activationReceipt.value,
  deployer_address:deployer.deployer_address,
  publisher_address:publisher.publisher_address,
  predecessor_address:"0x0000000000000000000000000000000000000000",
  compiled_identity:identity,
});

for(const ancestor of [
  binding.activation_plan_id
    ?activationPlan.value.start_admission_observed_repo_head
    :null,
  ...activationPlan.value.install_receipts.map((x)=>x.install_receipt_observed_repo_head),
]){
  if(!ancestor) throw new Error("activation_lineage_repo_head_missing");
  const result=spawnSync("git",["merge-base","--is-ancestor",ancestor,repoHead],{
    cwd:ROOT,
    stdio:["ignore","ignore","ignore"],
  });
  if(result.status!==0) throw new Error("activation_lineage_repo_head_not_ancestor:"+ancestor);
}

const service="void-economic-epoch2-qbft-validator-v1.service";
const active=spawnSync("systemctl",["--user","is-active","--quiet",service],{
  stdio:["ignore","ignore","ignore"],
});
if(active.status!==0) throw new Error("precision_private_qbft_service_not_active");

const observer=await observeDatanetRegistryDeployerResolutionV1({
  rpc_url:binding.rpc_url,
  deployer_address:binding.deployer_address,
  publisher_address:binding.publisher_address,
  predecessor_address:binding.predecessor_address,
  compiled_identity:binding.compiled_identity,
  request_timeout_ms:5000,
  max_response_bytes:65536,
});

const packet=buildVoidDatanetActivationBoundResolutionPacketV1({
  activation_plan:activationPlan.value,
  activation_receipt:activationReceipt.value,
  deployer_address:binding.deployer_address,
  publisher_address:binding.publisher_address,
  predecessor_address:binding.predecessor_address,
  compiled_identity:binding.compiled_identity,
  observer_result:observer,
});

const output=path.resolve(args[2]);
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

const result={
  ...packet,
  observed_at_utc:new Date().toISOString(),
  observed_on_host:os.hostname(),
  observed_repo_head:repoHead,
  activation_plan_file_sha256:sha256(activationPlan.bytes),
  activation_receipt_file_sha256:sha256(activationReceipt.bytes),
};
fs.writeFileSync(output,JSON.stringify(result,null,2)+"\n",{
  flag:"wx",
  mode:0o600,
});
fs.chmodSync(output,0o600);

console.log("VOID_DATANET_REGISTRY_DEPLOYER_ACTIVATION_BOUND_OBSERVER_PRECISION_V1");
console.log("packet_id="+packet.packet_id);
console.log("activation_plan_id="+packet.activation_plan_id);
console.log("activation_receipt_id="+packet.activation_receipt_id);
console.log("rpc_url_fingerprint_sha256="+packet.rpc_url_fingerprint_sha256);
console.log("decision="+packet.decision);
console.log("rpc_call_performed=true");
console.log("filesystem_secret_read=false");
console.log("credential_access=false");
console.log("wallet_access=false");
console.log("private_key_access=false");
console.log("transaction_construction=false");
console.log("transaction_signing=false");
console.log("transaction_submission=false");
console.log("transaction_broadcast=false");
console.log("deployment=false");
console.log("chain2050_mutation=false");
console.log("funds_action=false");
console.log("output="+output);

if(packet.decision!=="GREEN_READY_TO_BIND_EXACT_READ_ONLY_DEPLOYER_RESOLUTION_EVIDENCE"){
  process.exitCode=2;
}
