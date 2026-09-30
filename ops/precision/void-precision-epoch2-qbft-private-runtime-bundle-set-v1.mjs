#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {execFileSync} from "node:child_process";

import {
  readVoidEconomicEpoch2PreparedBundleV1,
  verifyVoidEconomicEpoch2QbftPrivateRuntimeBundleSetV1,
} from "../../tools/void-economic-epoch2-qbft-private-runtime-bundle-set-v1.mjs";
import {
  validateVoidEconomicEpoch2QbftPrivateRuntimePlanForMaterializationV1,
} from "../../tools/void-economic-epoch2-qbft-private-runtime-materialization-v1.mjs";

const ROOT=process.cwd();
const planArg=process.argv[2];
const precisionDir=process.argv[3];
const nimoDir=process.argv[4];
const xiphosDir=process.argv[5];
const outputArg=process.argv[6];

if(!planArg||!precisionDir||!nimoDir||!xiphosDir||!outputArg) {
  console.error(
    "usage: node ops/precision/void-precision-epoch2-qbft-private-runtime-bundle-set-v1.mjs PLAN_JSON PRECISION_DIR NIMO_DIR XIPHOS_DIR OUTPUT_JSON",
  );
  process.exit(2);
}
if(os.hostname()!=="zoso-Precision-Tower-7810") {
  throw new Error("precision_host_required");
}

function git(args) {
  return execFileSync("git",args,{
    cwd:ROOT,
    encoding:"utf8",
    stdio:["ignore","pipe","pipe"],
  }).trim();
}
function regularFile(raw,label) {
  const file=path.resolve(String(raw));
  const st=fs.lstatSync(file);
  if(st.isSymbolicLink()||!st.isFile()) throw new Error(label+"_not_regular");
  if(fs.realpathSync(file)!==file) throw new Error(label+"_not_canonical");
  return file;
}
function directory(raw,label) {
  const dir=path.resolve(String(raw));
  const st=fs.lstatSync(dir);
  if(st.isSymbolicLink()||!st.isDirectory()) throw new Error(label+"_not_directory");
  if(fs.realpathSync(dir)!==dir) throw new Error(label+"_not_canonical");
  return dir;
}

if(git(["branch","--show-current"])!=="main") throw new Error("main_branch_required");
if(git(["status","--porcelain=v1","--untracked-files=all"])!=="") {
  throw new Error("clean_worktree_required");
}

const planPath=regularFile(planArg,"private_plan");
const planBytes=fs.readFileSync(planPath);
const planFileSha256=
  crypto.createHash("sha256").update(planBytes).digest("hex");
const plan=validateVoidEconomicEpoch2QbftPrivateRuntimePlanForMaterializationV1(
  JSON.parse(planBytes.toString("utf8")),
);
const currentHead=git(["rev-parse","HEAD"]);
execFileSync(
  "git",
  ["merge-base","--is-ancestor",plan.source_head,currentHead],
  {cwd:ROOT,stdio:["ignore","ignore","ignore"]},
);

const output=path.resolve(outputArg);
if(fs.existsSync(output)) throw new Error("output_already_exists");

const bundles={
  precision:readVoidEconomicEpoch2PreparedBundleV1(
    directory(precisionDir,"precision_bundle"),
  ),
  nimo:readVoidEconomicEpoch2PreparedBundleV1(
    directory(nimoDir,"nimo_bundle"),
  ),
  xiphos:readVoidEconomicEpoch2PreparedBundleV1(
    directory(xiphosDir,"xiphos_bundle"),
  ),
};

const result=verifyVoidEconomicEpoch2QbftPrivateRuntimeBundleSetV1({
  plan,
  plan_file_sha256:planFileSha256,
  bundles,
});
fs.mkdirSync(path.dirname(output),{recursive:true,mode:0o700});
fs.writeFileSync(output,JSON.stringify(result,null,2)+"\n",{
  flag:"wx",
  mode:0o600,
});
fs.chmodSync(output,0o600);

console.log("VOID_PRECISION_EPOCH2_QBFT_PRIVATE_RUNTIME_BUNDLE_SET_V1");
console.log("bundle_set_id="+result.bundle_set_id);
console.log("plan_id="+result.plan_id);
console.log("validator_count="+String(result.validator_count));
console.log("required_quorum="+String(result.required_quorum));
console.log("common_genesis_sha256="+result.common_genesis_sha256);
console.log("common_private_plan_file_sha256="+
  result.common_private_plan_file_sha256);
console.log("service_installation=false");
console.log("service_start=false");
console.log("authoritative_chain2050_write=false");
console.log("funds_movement=false");
console.log("output="+output);
console.log("VOID_PRECISION_EPOCH2_QBFT_PRIVATE_RUNTIME_BUNDLE_SET_V1_GREEN");
