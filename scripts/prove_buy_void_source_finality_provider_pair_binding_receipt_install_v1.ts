#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  buildProviderPairReceiptV1,
  installProviderPairReceiptCreateOnceV1,
  readDeploymentBindingV1,
  MARKER,
} from "../ops/precision/void_buy_void_source_finality_provider_pair_binding_receipt_install_v1.js";
import {
  VOID_BUY_VOID_SOURCE_FINALITY_ACCEPTED_ENFORCEMENT_SET_V7,
  VOID_BUY_VOID_SOURCE_FINALITY_DEPLOYMENT_RECEIPT_V1,
  buyVoidSourceFinalityDeploymentReceiptIdV7,
  inspectBuyVoidSourceFinalityReviewedSourceFilesV7,
} from "../src/economic/buy_void_source_finality_generation_provenance_v7.js";
import {
  buyVoidSourceFinalityProviderPairBindingReceiptIdV1,
} from "../src/economic/buy_void_source_finality_provider_pair_binding_v1.js";

function canonical(value:any):string{
  if(value===null)return "null";
  if(typeof value==="string")return JSON.stringify(value);
  if(typeof value==="boolean")return value?"true":"false";
  if(typeof value==="number"&&Number.isSafeInteger(value))return String(value);
  if(Array.isArray(value))return "["+value.map(canonical).join(",")+"]";
  return "{"+Object.keys(value).sort().map(k=>JSON.stringify(k)+":"+canonical(value[k])).join(",")+"}";
}

const reviewedSources=inspectBuyVoidSourceFinalityReviewedSourceFilesV7();

const focusedWorkflowPath =
  ".github/workflows/buy-void-source-finality-provider-pair-binding-receipt-install-v1.yml";
const focusedWorkflow = fs.readFileSync(focusedWorkflowPath, "utf8");
assert.match(
  focusedWorkflow,
  /\non:\n  push:\n    branches: \[main\]\n    paths:\n/u,
  "focused workflow must requalify on main pushes",
);
assert.match(
  focusedWorkflow,
  /\n  pull_request:\n    paths:\n/u,
  "focused workflow must qualify pull requests",
);
for (const reviewed of reviewedSources.files) {
  const needle = `      - "${reviewed.path}"`;
  assert.equal(
    focusedWorkflow.split(needle).length - 1,
    2,
    `reviewed source must be in symmetric PR/main triggers: ${reviewed.path}`,
  );
}
for (const requiredPath of [
  "src/economic/buy_void_source_finality_provider_pair_binding_v1.ts",
  "ops/precision/void_buy_void_source_finality_provider_pair_binding_receipt_install_v1.ts",
  "scripts/prove_buy_void_source_finality_provider_pair_binding_receipt_install_v1.ts",
  focusedWorkflowPath,
  "package.json",
  "package-lock.json",
]) {
  const needle = `      - "${requiredPath}"`;
  assert.equal(
    focusedWorkflow.split(needle).length - 1,
    2,
    `focused dependency must be in symmetric PR/main triggers: ${requiredPath}`,
  );
}
const deploymentBody={
  accepted_enforcement_set_sha256:VOID_BUY_VOID_SOURCE_FINALITY_ACCEPTED_ENFORCEMENT_SET_V7,
  marker:VOID_BUY_VOID_SOURCE_FINALITY_DEPLOYMENT_RECEIPT_V1,
  process_source_branch:"main",
  process_source_commit:"1".repeat(40),
  process_source_marker:"VOID_NODE_PROCESS_SOURCE_IDENTITY_V1",
  process_source_tree:"2".repeat(40),
  reviewed_source_file_count:reviewedSources.reviewed_source_file_count,
  reviewed_source_files_sha256:reviewedSources.reviewed_source_files_sha256,
  status:"DEPLOYED_SOURCE_FINALITY_GENERATION_ACCEPTED",
  version:1,
};
const deploymentReceipt={
  ...deploymentBody,
  receipt_id:buyVoidSourceFinalityDeploymentReceiptIdV7(deploymentBody),
};
const deployment={
  deployment_receipt_id:deploymentReceipt.receipt_id,
  accepted_enforcement_set_sha256:VOID_BUY_VOID_SOURCE_FINALITY_ACCEPTED_ENFORCEMENT_SET_V7,
};
const input={
  base_primary_identity:"base-primary",
  base_primary_fingerprint_sha256:"4".repeat(64),
  base_secondary_identity:"base-secondary",
  base_secondary_fingerprint_sha256:"5".repeat(64),
  ethereum_primary_identity:"eth-primary",
  ethereum_primary_fingerprint_sha256:"6".repeat(64),
  ethereum_secondary_identity:"eth-secondary",
  ethereum_secondary_fingerprint_sha256:"7".repeat(64),
};
const built=buildProviderPairReceiptV1(deployment,input);
assert.match(built.receipt_id,/^voidbsfpp1_[0-9a-f]{64}$/u);
const {receipt_id,...material}=built.receipt as any;
assert.equal(receipt_id,buyVoidSourceFinalityProviderPairBindingReceiptIdV1(material));
assert.equal(built.bytes.toString("utf8"),canonical(built.receipt)+"\n");
assert.equal(built.receipt.deployment_receipt_id,deployment.deployment_receipt_id);
assert.equal(built.receipt.accepted_enforcement_set_sha256,
  VOID_BUY_VOID_SOURCE_FINALITY_ACCEPTED_ENFORCEMENT_SET_V7);
assert.throws(()=>buildProviderPairReceiptV1(deployment,{
  ...input,base_secondary_identity:input.base_primary_identity,
}),/base_provider_identities_not_distinct/u);
assert.throws(()=>buildProviderPairReceiptV1(deployment,{
  ...input,ethereum_secondary_fingerprint_sha256:input.ethereum_primary_fingerprint_sha256,
}),/ethereum_provider_fingerprints_not_distinct/u);

const rootCapable=typeof process.getuid==="function"&&process.getuid()===0;
if(rootCapable){
  const root="/root/void-provider-pair-install-proof-"+String(process.pid);
  const deploymentPath=path.join(root,"deployment-receipt.json");
  const pairPath=path.join(root,"provider-pair-binding-v1.json");
  try{
    fs.mkdirSync(root,{recursive:true,mode:0o755});
    fs.writeFileSync(deploymentPath,JSON.stringify(deploymentReceipt,null,2)+"\n",{mode:0o444});
    fs.chownSync(deploymentPath,0,0);
    fs.chmodSync(deploymentPath,0o444);
    const stale=structuredClone(deploymentReceipt) as any;
    stale.reviewed_source_files_sha256="3".repeat(64);
    const {receipt_id:_staleId,...staleBody}=stale;
    stale.receipt_id=buyVoidSourceFinalityDeploymentReceiptIdV7(staleBody);
    fs.chmodSync(deploymentPath,0o600);
    fs.writeFileSync(deploymentPath,JSON.stringify(stale,null,2)+"\n");
    fs.chmodSync(deploymentPath,0o444);
    assert.throws(()=>readDeploymentBindingV1(deploymentPath),
      /deployment_receipt_reviewed_source_digest_mismatch/u);
    fs.chmodSync(deploymentPath,0o600);
    fs.writeFileSync(deploymentPath,JSON.stringify(deploymentReceipt,null,2)+"\n");
    fs.chmodSync(deploymentPath,0o444);
    const observed=readDeploymentBindingV1(deploymentPath);
    assert.deepEqual(observed,deployment);
    const first=installProviderPairReceiptCreateOnceV1({
      absolute_path:pairPath,bytes:built.bytes,
    });
    assert.equal(first.created,true);
    const st=fs.lstatSync(pairPath);
    assert.equal(st.uid,0); assert.equal(st.gid,0);
    assert.equal(st.nlink,1); assert.equal(st.mode&0o7777,0o444);
    const second=installProviderPairReceiptCreateOnceV1({
      absolute_path:pairPath,bytes:built.bytes,
    });
    assert.equal(second.already_matching,true);
    fs.chmodSync(pairPath,0o644);
    assert.throws(()=>installProviderPairReceiptCreateOnceV1({
      absolute_path:pairPath,bytes:built.bytes,
    }),/provider_pair_receipt_mode_invalid/u);
  }finally{
    fs.rmSync(root,{recursive:true,force:true});
  }
}

const source=fs.readFileSync(
  "ops/precision/void_buy_void_source_finality_provider_pair_binding_receipt_install_v1.ts",
  "utf8",
);
for(const forbidden of [
  "fetch(","http.request(","https.request(","Math.random(","eth_sendRawTransaction",
  "eth_sendTransaction","new Wallet(","systemctl","--base-primary-url ",
  "--ethereum-primary-url ",
]){
  assert.equal(source.includes(forbidden),false,forbidden);
}
for(const required of [
  "--base-primary-url-fingerprint-sha256",
  "--base-secondary-url-fingerprint-sha256",
  "--ethereum-primary-url-fingerprint-sha256",
  "--ethereum-secondary-url-fingerprint-sha256",
  "crypto.randomBytes","rpc_contact=false","credential_access=false","funds_movement=false",
]){
  assert.equal(source.includes(required),true,required);
}

console.log(MARKER+"_PROOF_GREEN");
console.log("raw_rpc_url_input=false");
console.log("deployment_receipt_crossbinding=true");
console.log("accepted_enforcement_set_crossbinding=true");
console.log("current_reviewed_source_digest_crossbinding=true");
console.log("same_chain_distinct_provider_identities_required=true");
console.log("same_chain_distinct_rpc_fingerprints_required=true");
console.log("content_addressed_provider_pair_receipt=true");
console.log("root_custody_positive_exercised="+String(rootCapable));
console.log("rpc_contact=false");
console.log("credential_access=false");
console.log("wallet_or_signer_access=false");
console.log("transaction_broadcast=false");
console.log("public_presale_activation=false");
console.log("funds_movement=false");
