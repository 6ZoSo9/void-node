#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  DEFAULT_RECEIPT_PATH,
  MARKER,
  buildBuyVoidSourceFinalityV7DeploymentReceiptV1,
  inspectAcceptedEnforcementLockV1,
  inspectRepositoryIdentityV1,
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
const acceptedLock=inspectAcceptedEnforcementLockV1(
  "ops/security/buy-void-enforcement-post2865-lock-v1.json",
);
assert.match(acceptedLock.accepted_enforcement_lock_id,
  /^voidbenfl1_[0-9a-f]{64}$/u);
assert.match(acceptedLock.accepted_enforcement_set_sha256,/^[0-9a-f]{64}$/u);
const built=buildBuyVoidSourceFinalityV7DeploymentReceiptV1({
  process_source_commit:commit,
  process_source_tree:tree,
  accepted_enforcement_lock:acceptedLock,
});
assert.equal(built.reviewed_source_file_count,"8");
assert.equal(built.reviewed_source_files_sha256,
  sources.reviewed_source_files_sha256);
assert.match(built.receipt_id,/^voidbsfdep1_[0-9a-f]{64}$/u);
assert.equal(built.receipt.receipt_id,built.receipt_id);

const classified=classifyBuyVoidSourceFinalityDeploymentReceiptV7({
  receipt:built.receipt,
  process_source_identity:processIdentity,
  reviewed_source_files_sha256:sources.reviewed_source_files_sha256,
  reviewed_source_file_count:"8",
});
assert.equal(classified.ok,true);

for(const mutate of [
  (x:any)=>{x.process_source_tree="3".repeat(40);},
  (x:any)=>{x.accepted_enforcement_set_sha256="4".repeat(64);},
  (x:any)=>{x.accepted_enforcement_lock_id="voidbenfl1_"+"4".repeat(64);},
  (x:any)=>{x.accepted_enforcement_lock_sha256="4".repeat(64);},
  (x:any)=>{x.accepted_enforcement_lock_git_blob_sha1="4".repeat(40);},
  (x:any)=>{x.complete_executable_closure_verified=false;},
  (x:any)=>{x.candidate_enforcement_identity_accepted=false;},
  (x:any)=>{x.reviewed_source_files_sha256="5".repeat(64);},
  (x:any)=>{x.receipt_id="voidbsfdep1_"+"6".repeat(64);},
]){
  const receipt=structuredClone(built.receipt) as any;
  mutate(receipt);
  const out=classifyBuyVoidSourceFinalityDeploymentReceiptV7({
    receipt,
    process_source_identity:processIdentity,
    reviewed_source_files_sha256:sources.reviewed_source_files_sha256,
    reviewed_source_file_count:"8",
  });
  assert.equal(out.ok,false);
}

function proveRepositoryLocalFsmonitorIgnoredV1(){
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),"void-v7-git-fence-"));
  const repoRoot=path.join(temp,"repo");
  const hook=path.join(temp,"hostile-fsmonitor.sh");
  const sentinel=path.join(temp,"fsmonitor-executed");
  try{
    fs.mkdirSync(repoRoot,{mode:0o700});
    execFileSync("/usr/bin/git",["init","-b","main",repoRoot],{
      stdio:"ignore",
      env:{PATH:"/usr/bin:/bin",HOME:"/nonexistent",LANG:"C",LC_ALL:"C"},
    });
    fs.writeFileSync(path.join(repoRoot,"tracked.txt"),"reviewed\n",{mode:0o600});
    execFileSync("/usr/bin/git",["-C",repoRoot,"add","tracked.txt"],{stdio:"ignore"});
    execFileSync("/usr/bin/git",[
      "-C",repoRoot,
      "-c","user.name=VOID Proof",
      "-c","user.email=void-proof.invalid@example.invalid",
      "commit","-m","fixture",
    ],{stdio:"ignore"});
    fs.writeFileSync(
      hook,
      "#!/bin/sh\nprintf touched > "+JSON.stringify(sentinel)+"\nexit 1\n",
      {mode:0o700},
    );
    fs.chmodSync(hook,0o700);
    execFileSync("/usr/bin/git",[
      "-C",repoRoot,"config","--local","core.fsmonitor",hook,
    ],{stdio:"ignore"});
    const configured=execFileSync("/usr/bin/git",[
      "-C",repoRoot,"config","--local","--get","core.fsmonitor",
    ],{encoding:"utf8"}).trim();
    assert.equal(configured,hook);
    const identity=inspectRepositoryIdentityV1(repoRoot);
    assert.match(identity.commit,/^[0-9a-f]{40}$/u);
    assert.match(identity.tree,/^[0-9a-f]{40}$/u);
    assert.equal(identity.branch,"main");
    assert.equal(fs.existsSync(sentinel),false,
      "reviewed Git invocation executed repository-local fsmonitor");
  }finally{
    fs.rmSync(temp,{recursive:true,force:true});
  }
}

proveRepositoryLocalFsmonitorIgnoredV1();

const rootCapable=
  typeof process.getuid==="function" && process.getuid()===0;

if(rootCapable){
  const root="/root/void-v7-receipt-install-proof-"+String(process.pid);
  const good=path.join(root,"good","deployment-receipt.json");
  const bad=path.join(root,"bad","deployment-receipt.json");
  try{
  fs.mkdirSync(root,{mode:0o700});
  fs.chownSync(root,0,0);
  fs.chmodSync(root,0o700);

  const redirect=path.join(root,"redirect");
  const symlinkParent=path.join(root,"symlink-parent");
  fs.mkdirSync(redirect,{mode:0o700});
  fs.chownSync(redirect,0,0);
  fs.chmodSync(redirect,0o700);
  const redirectBefore=fs.lstatSync(redirect);
  fs.symlinkSync(redirect,symlinkParent,"dir");
  assert.throws(()=>installRootCustodiedReceiptV1({
    absolute_path:path.join(symlinkParent,"deployment-receipt.json"),
    bytes:built.bytes,
  }));
  const redirectAfter=fs.lstatSync(redirect);
  assert.equal(redirectAfter.uid,redirectBefore.uid);
  assert.equal(redirectAfter.gid,redirectBefore.gid);
  assert.equal(redirectAfter.mode,redirectBefore.mode);
  assert.equal(fs.existsSync(path.join(redirect,"deployment-receipt.json")),false);
  fs.unlinkSync(symlinkParent);

  const restrictiveParent=path.join(root,"restrictive");
  const restrictiveReceipt=path.join(restrictiveParent,"deployment-receipt.json");
  fs.mkdirSync(restrictiveParent,{mode:0o700});
  fs.chownSync(restrictiveParent,0,0);
  fs.chmodSync(restrictiveParent,0o700);
  const restrictiveBefore=fs.lstatSync(restrictiveParent);
  const restrictiveResult=installRootCustodiedReceiptV1({
    absolute_path:restrictiveReceipt,bytes:built.bytes,
  });
  assert.equal(restrictiveResult.created,true);
  const restrictiveAfter=fs.lstatSync(restrictiveParent);
  assert.equal(restrictiveAfter.dev,restrictiveBefore.dev);
  assert.equal(restrictiveAfter.ino,restrictiveBefore.ino);
  assert.equal(restrictiveAfter.uid,restrictiveBefore.uid);
  assert.equal(restrictiveAfter.gid,restrictiveBefore.gid);
  assert.equal(restrictiveAfter.mode,restrictiveBefore.mode);

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

  }finally{
    fs.rmSync(root,{recursive:true,force:true});
  }
}

console.log(MARKER+"_PROOF_GREEN");
console.log("v7_receipt_uses_module_content_address=true");
console.log("external_accepted_enforcement_lock_verified=true");
console.log("deployment_receipt_enforcement_set_not_source_hardcoded=true");
console.log("v7_reviewed_source_digest_uses_module_inspector=true");
console.log("repository_local_fsmonitor_ignored=true");
console.log("root_custody_positive_exercised="+String(rootCapable));
console.log("descriptor_relative_parent_publication="+String(rootCapable));
console.log("symlink_parent_no_collateral_mutation="+String(rootCapable));
console.log("restrictive_parent_mode_preserved="+String(rootCapable));
console.log("root_custodied_create_once_positive="+String(rootCapable));
console.log("matching_reapply_idempotent="+String(rootCapable));
console.log("mismatched_existing_receipt_rejected="+String(rootCapable));
console.log("leaf_root_owned_mode_0444_single_link="+String(rootCapable));
console.log("unprivileged_proof_stack_safe="+String(!rootCapable));
console.log("service_mutation=false");
console.log("credential_wallet_signer_transaction_authority=false");
console.log("presale_activation=false");
console.log("funds_movement=false");
