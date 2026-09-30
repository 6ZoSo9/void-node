#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  buildVoidEconomicEpoch2QbftPrivateRuntimeStartAdmissionV1,
} from "../../tools/void-economic-epoch2-qbft-private-runtime-start-admission-v1.mjs";

const args=process.argv.slice(2);
if(args.length!==6) {
  console.error(
    "usage: node ops/precision/void-precision-epoch2-qbft-private-runtime-start-admission-v1.mjs PLAN_JSON BUNDLE_SET_JSON PRECISION_RECEIPT NIMO_RECEIPT XIPHOS_RECEIPT OUTPUT_JSON",
  );
  process.exit(2);
}
if(os.hostname()!=="zoso-Precision-Tower-7810") {
  throw new Error("precision_host_required");
}

function regularJson(raw,label) {
  const file=path.resolve(raw);
  const st=fs.lstatSync(file);
  if(st.isSymbolicLink()||!st.isFile()) throw new Error(label+"_not_regular");
  if(fs.realpathSync(file)!==file) throw new Error(label+"_not_canonical");
  if(st.size<1||st.size>1024*1024) throw new Error(label+"_size_invalid");
  return JSON.parse(fs.readFileSync(file,"utf8"));
}

const output=path.resolve(args[5]);
if(fs.existsSync(output)) throw new Error("output_already_exists");
const parent=path.dirname(output);
const parentStat=fs.lstatSync(parent);
if(
  parentStat.isSymbolicLink()||
  !parentStat.isDirectory()||
  fs.realpathSync(parent)!==parent
) {
  throw new Error("output_parent_invalid");
}

const planFile=path.resolve(args[0]);
const planStat=fs.lstatSync(planFile);
if(planStat.isSymbolicLink()||!planStat.isFile()) {
  throw new Error("private_plan_not_regular");
}
if(fs.realpathSync(planFile)!==planFile) {
  throw new Error("private_plan_not_canonical");
}
const planRaw=fs.readFileSync(planFile);
const plan=JSON.parse(planRaw.toString("utf8"));
const planFileSha256=(await import("node:crypto"))
  .createHash("sha256")
  .update(planRaw)
  .digest("hex");

const bundleSet=regularJson(args[1],"bundle_set");
const receipts={
  precision:regularJson(args[2],"precision_prestart"),
  nimo:regularJson(args[3],"nimo_prestart"),
  xiphos:regularJson(args[4],"xiphos_prestart"),
};
const now=new Date();
const admission=buildVoidEconomicEpoch2QbftPrivateRuntimeStartAdmissionV1({
  plan,
  plan_file_sha256:planFileSha256,
  bundle_set_receipt:bundleSet,
  evaluated_at_utc:now.toISOString(),
  receipts,
});

fs.writeFileSync(output,JSON.stringify(admission,null,2)+"\n",{
  flag:"wx",
  mode:0o600,
});
fs.chmodSync(output,0o600);

console.log("VOID_PRECISION_EPOCH2_QBFT_PRIVATE_RUNTIME_START_ADMISSION_V1");
console.log("start_admission_id="+admission.start_admission_id);
console.log("plan_id="+admission.plan_id);
console.log("bundle_set_id="+admission.bundle_set_id);
console.log("observed_repo_head="+admission.observed_repo_head);
console.log("validator_count=3");
console.log("required_quorum=2");
console.log("all_receipts_fresh_at_common_evaluation_time=true");
console.log("nodekey_bytes_emitted=false");
console.log("nodekey_bytes_persisted=false");
console.log("service_start=false");
console.log("authoritative_chain2050_write=false");
console.log("transaction_submission=false");
console.log("funds_movement=false");
console.log("start_authorized=false");
console.log("required_start_confirmation=startPrivateEpoch2QbftSuccessorV1");
console.log("output="+output);
console.log("VOID_PRECISION_EPOCH2_QBFT_PRIVATE_RUNTIME_START_ADMISSION_V1_GREEN");
