#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  DEFAULT_RECEIPT_PATH,
  MARKER,
  buildBuyVoidSourceFinalityV7DeploymentReceiptV1,
  installRootCustodiedReceiptV1,
} from "../ops/precision/void_buy_void_source_finality_v7_deployment_receipt_install_v1.js";
import {
  classifyBuyVoidSourceFinalityDeploymentReceiptV7,
  inspectBuyVoidSourceFinalityReviewedSourceFilesV7,
  verifyBuyVoidSourceFinalityDeploymentReceiptV7,
} from "../src/economic/buy_void_source_finality_generation_provenance_v7.js";

assert.equal(DEFAULT_RECEIPT_PATH,
  "/var/lib/void-source-finality-v7/deployment-receipt.json");
const commit="1".repeat(40);
const tree="2".repeat(40);
const processIdentity={
  marker:"VOID_NODE_PROCESS_SOURCE_IDENTITY_V1" as const,
  commit,tree,branch:"main" as const,
};
const sources=inspectBuyVoidSourceFinalityReviewedSourceFilesV7();
const built=buildBuyVoidSourceFinalityV7DeploymentReceiptV1({
  process_source_commit:commit,
  process_source_tree:tree,
});
assert.equal(built.reviewed_source_file_count,"7");
assert.equal(built.reviewed_source_files_sha256,
  sources.reviewed_source_files_sha256);
assert.match(built.receipt_id,/^voidbsfdep1_[0-9a-f]{64}$/u);
assert.equal(built.receipt.receipt_id,built.receipt_id);

const classified=classifyBuyVoidSourceFinalityDeploymentReceiptV7({
  receipt:built.receipt,
  process_source_identity:processIdentity,
  reviewed_source_files_sha256:sources.reviewed_source_files_sha256,
  reviewed_source_file_count:"7",
});
assert.equal(classified.ok,true);

for(const mutate of [
  (x:any)=>{x.process_source_tree="3".repeat(40);},
  (x:any)=>{x.accepted_enforcement_set_sha256="4".repeat(64);},
  (x:any)=>{x.reviewed_source_files_sha256="5".repeat(64);},
  (x:any)=>{x.receipt_id="voidbsfdep1_"+"6".repeat(64);},
]){
  const receipt=structuredClone(built.receipt) as any;
  mutate(receipt);
  const out=classifyBuyVoidSourceFinalityDeploymentReceiptV7({
    receipt,
    process_source_identity:processIdentity,
    reviewed_source_files_sha256:sources.reviewed_source_files_sha256,
    reviewed_source_file_count:"7",
  });
  assert.equal(out.ok,false);
}

if(typeof process.getuid!=="function"||process.getuid()!==0)
  throw Error("receipt_install_proof_requires_root");

const root="/root/void-v7-receipt-install-proof-"+String(process.pid);
const good=path.join(root,"good","deployment-receipt.json");
const bad=path.join(root,"bad","deployment-receipt.json");
try{
  const first=installRootCustodiedReceiptV1({
    absolute_path:good,bytes:built.bytes,
  });
  assert.equal(first.created,true);
  const st=fs.lstatSync(good);
  assert.equal(st.uid,0);
  assert.equal(st.nlink,1);
  assert.equal(st.mode&0o777,0o444);

  const verified=verifyBuyVoidSourceFinalityDeploymentReceiptV7({
    deployment_receipt_path:good,
    process_source_identity:processIdentity,
  });
  assert.equal(verified.ok,true);

  const second=installRootCustodiedReceiptV1({
    absolute_path:good,bytes:built.bytes,
  });
  assert.equal(second.created,false);
  assert.equal(second.already_matching,true);

  fs.mkdirSync(path.dirname(bad),{recursive:true,mode:0o755});
  fs.writeFileSync(bad,"{}\n",{mode:0o444});
  fs.chownSync(bad,0,0);
  fs.chmodSync(bad,0o444);
  assert.throws(()=>installRootCustodiedReceiptV1({
    absolute_path:bad,bytes:built.bytes,
  }),/receipt_leaf_bytes_mismatch/u);

  console.log(MARKER+"_PROOF_GREEN");
  console.log("v7_receipt_uses_module_content_address=true");
  console.log("v7_reviewed_source_digest_uses_module_inspector=true");
  console.log("root_custodied_create_once_positive=true");
  console.log("matching_reapply_idempotent=true");
  console.log("mismatched_existing_receipt_rejected=true");
  console.log("leaf_root_owned_mode_0444_single_link=true");
  console.log("service_mutation=false");
  console.log("credential_wallet_signer_transaction_authority=false");
  console.log("presale_activation=false");
  console.log("funds_movement=false");
}finally{
  fs.rmSync(root,{recursive:true,force:true});
}
