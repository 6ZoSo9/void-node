#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {execFileSync} from "node:child_process";

import {
  compileVoidEconomicEpoch2QbftPrivateRuntimePlanV1,
} from "../../tools/void-economic-epoch2-qbft-private-runtime-plan-v1.mjs";

const ROOT=process.cwd();
const receiptArg=process.argv[2];
const outputArg=process.argv[3];

if(!receiptArg||!outputArg) {
  console.error(
    "usage: node ops/precision/void-precision-epoch2-qbft-private-runtime-plan-v1.mjs TOPOLOGY_RECEIPT OUTPUT_JSON",
  );
  process.exit(2);
}
if(os.hostname()!=="zoso-Precision-Tower-7810") {
  throw new Error("precision_host_required");
}

function regularFile(raw,label) {
  const p=path.resolve(raw);
  const st=fs.lstatSync(p);
  if(st.isSymbolicLink()||!st.isFile()) throw new Error(label+"_must_be_regular_file");
  if(fs.realpathSync(p)!==p) throw new Error(label+"_must_be_canonical_path");
  return p;
}
function git(args) {
  return execFileSync("git",args,{
    cwd:ROOT,
    encoding:"utf8",
    stdio:["ignore","pipe","pipe"],
  }).trim();
}

if(git(["branch","--show-current"])!=="main") throw new Error("main_branch_required");
if(git(["status","--porcelain=v1","--untracked-files=all"])!=="") {
  throw new Error("clean_worktree_required");
}

const receiptPath=regularFile(receiptArg,"topology_receipt");
const outputPath=path.resolve(outputArg);
if(fs.existsSync(outputPath)) throw new Error("output_already_exists");

const receipt=JSON.parse(fs.readFileSync(receiptPath,"utf8"));
const sourceHead=git(["rev-parse","HEAD"]);

if(!/^[0-9a-f]{40}$/u.test(String(receipt.expected_head||""))) {
  throw new Error("topology_expected_head_invalid");
}
execFileSync(
  "git",
  ["merge-base","--is-ancestor",receipt.expected_head,sourceHead],
  {cwd:ROOT,stdio:["ignore","ignore","ignore"]},
);

const observed=Date.parse(String(receipt.observed_at_utc||""));
if(!Number.isFinite(observed)) throw new Error("topology_observed_at_invalid");
const ageSeconds=Math.floor((Date.now()-observed)/1000);
if(ageSeconds < -60) throw new Error("topology_observation_from_future");
if(ageSeconds > 3600) throw new Error("topology_observation_stale");

const plan=compileVoidEconomicEpoch2QbftPrivateRuntimePlanV1({
  topology_receipt:receipt,
  source_head:sourceHead,
});

fs.mkdirSync(path.dirname(outputPath),{recursive:true,mode:0o700});
fs.writeFileSync(outputPath,JSON.stringify(plan,null,2)+"\n",{mode:0o600});
fs.chmodSync(outputPath,0o600);

console.log("VOID_PRECISION_EPOCH2_QBFT_PRIVATE_RUNTIME_PLAN_V1");
console.log("plan_id="+plan.plan_id);
console.log("source_head="+sourceHead);
console.log("topology_preflight_id="+plan.topology.topology_preflight_id);
console.log("topology_age_seconds="+String(ageSeconds));
console.log("validator_count="+String(plan.chain.validator_count));
console.log("required_quorum="+String(plan.chain.required_quorum));
console.log("p2p_port="+String(plan.runtime.p2p_port));
console.log("precision_loopback_rpc_port="+String(plan.runtime.precision_loopback_rpc_port));
console.log("private_plan_contains_live_tailnet_addresses=true");
console.log("tailscale_addresses_source_committed=false");
console.log("service_installation=false");
console.log("service_start=false");
console.log("docker_mutation=false");
console.log("private_key_access=false");
console.log("transaction_signing=false");
console.log("transaction_broadcast=false");
console.log("authoritative_chain2050_write=false");
console.log("funds_movement=false");
console.log("output="+outputPath);
console.log("VOID_PRECISION_EPOCH2_QBFT_PRIVATE_RUNTIME_PLAN_V1_GREEN");
