#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  DEFAULT_RECEIPT_PATH,
  MARKER,
  buildBuyVoidSourceFinalityV7DeploymentPlanV1,
  buildBuyVoidSourceFinalityV7DeploymentReceiptV1,
  inspectAcceptedEnforcementLockV1,
  inspectRepositoryIdentityV1,
  installRootCustodiedReceiptV1,
  rederiveAcceptedEnforcementCandidateV2,
  validateBuyVoidSourceFinalityV7DeploymentPlanFileV1,
} from "../ops/precision/void_buy_void_source_finality_v7_deployment_receipt_install_v1.js";
import {
  classifyBuyVoidSourceFinalityDeploymentReceiptV7,
  inspectBuyVoidSourceFinalityReviewedSourceFilesV7,
  verifyBuyVoidSourceFinalityDeploymentReceiptV7,
} from "../src/economic/buy_void_source_finality_generation_provenance_v7.js";

assert.equal(DEFAULT_RECEIPT_PATH,
  "/var/lib/void-source-finality-v7/deployment-receipt.json");
const rootCapable=
  typeof process.getuid==="function" && process.getuid()===0;
const commit="1".repeat(40);
const tree="2".repeat(40);
let built:any=null;
let planned:any=null;

if(!rootCapable){
  const processIdentity={
    marker:"VOID_NODE_PROCESS_SOURCE_IDENTITY_V1" as const,
    commit,tree,branch:"main" as const,
  };
  const sources=inspectBuyVoidSourceFinalityReviewedSourceFilesV7();
  const acceptedLock=inspectAcceptedEnforcementLockV1(
    "ops/security/buy-void-enforcement-post2933-lock-v2.json",
  );
  assert.match(acceptedLock.accepted_enforcement_lock_id,
    /^voidbenfl1_[0-9a-f]{64}$/u);
  assert.equal(
    acceptedLock.accepted_enforcement_set_sha256,
    "f1f3fbdd0a015fdabf8da924a53a87174663d38cdde182cdc036cf0f9a3407bd",
  );
  const currentCandidate=rederiveAcceptedEnforcementCandidateV2();
  assert.equal(
    currentCandidate.sha256,
    "1472ac34b6bd6b2bcf24ef3934e95121fa95b3b8406e20c7e0160d3faabc0b6f",
  );
  assert.equal(
    currentCandidate.git_blob_sha1,
    "622807eaf246cae558186bbd1922aebda9025f72",
  );
  assert.equal(
    currentCandidate.source_inventory_sha256,
    "4e86bb6f22dbd0e8908697291b78309c295cd316603532a3eb7ccfcc877749d5",
  );
  assert.equal(
    currentCandidate.artifact_inventory_sha256,
    "cf36522638c099f7b8c5036fb32d943d6fe543329a36519e69cf2d9fb0105dd0",
  );

  built=buildBuyVoidSourceFinalityV7DeploymentReceiptV1({
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
    const result=classifyBuyVoidSourceFinalityDeploymentReceiptV7({
      receipt,
      process_source_identity:processIdentity,
      reviewed_source_files_sha256:sources.reviewed_source_files_sha256,
      reviewed_source_file_count:"8",
    });
    assert.equal(result.ok,false);
  }

  planned=buildBuyVoidSourceFinalityV7DeploymentPlanV1({
    process_source_commit:commit,
    process_source_tree:tree,
    accepted_enforcement_lock:acceptedLock,
    current_candidate:currentCandidate,
  });
  assert.match(planned.plan_id,/^voidbsfdplan1_[0-9a-f]{64}$/u);
  assert.match(planned.plan_sha256,/^[0-9a-f]{64}$/u);
  assert.equal(planned.plan.enforcement_candidate.sha256,currentCandidate.sha256);
  assert.equal(planned.plan.receipt_id,built.receipt_id);
  assert.equal(
    planned.plan.authority.deployment_receipt_publication_authorized,
    false,
  );
  assert.equal(planned.plan.authority.public_presale_activation,false);
  assert.equal(planned.plan.authority.funds_movement,false);

  const planRoot=fs.mkdtempSync(
    path.join(os.tmpdir(),"void-v7-deployment-plan-v1-"),
  );
  const planFile=path.join(planRoot,"plan.json");
  try{
    fs.writeFileSync(planFile,planned.bytes,{mode:0o600});
    const validated=validateBuyVoidSourceFinalityV7DeploymentPlanFileV1({
      absolute_path:planFile,
      expected_plan_id:planned.plan_id,
      expected_plan_sha256:planned.plan_sha256,
    });
    assert.equal(validated.plan_id,planned.plan_id);
    assert.ok(validated.receipt_bytes.equals(planned.receipt_bytes));

    const mutated=structuredClone(planned.plan) as any;
    mutated.process_source_tree="9".repeat(40);
    const mutatedBytes=Buffer.from(JSON.stringify(mutated,null,2)+"\n","utf8");
    fs.writeFileSync(planFile,mutatedBytes,{mode:0o600});
    assert.throws(
      ()=>validateBuyVoidSourceFinalityV7DeploymentPlanFileV1({
        absolute_path:planFile,
        expected_plan_id:planned.plan_id,
        expected_plan_sha256:crypto.createHash("sha256")
          .update(mutatedBytes).digest("hex"),
      }),
      /deployment_plan_id_invalid|deployment_plan_id_mismatch/u,
    );
  }finally{
    fs.rmSync(planRoot,{recursive:true,force:true});
  }

  const outsideV7=
    path.join(process.cwd(),"src/economic/buy_void_delivery_runtime_integration_v1.ts");
  const original=fs.readFileSync(outsideV7);
  try{
    fs.appendFileSync(
      outsideV7,
      "\n// synthetic stale-lock deployment-generation drift\n",
    );
    assert.throws(
      ()=>rederiveAcceptedEnforcementCandidateV2(),
      (error:any)=>{
        assert.match(
          String(error?.message||error),
          /Command failed|accepted_enforcement_candidate_not_current_generation|runtime_or_build_source_changed_after_hosted_census/u,
        );
        return true;
      },
    );
  }finally{
    fs.writeFileSync(outsideV7,original);
  }
  assert.ok(fs.readFileSync(outsideV7).equals(original),
    "outside_v7_negative_restore_failed");
}

const custodyBytes=rootCapable
  ? Buffer.from('{"synthetic_root_custody_fixture":true}\n',"utf8")
  : built.bytes;

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

if(!rootCapable)proveRepositoryLocalFsmonitorIgnoredV1();

const installerSource=fs.readFileSync(
  "ops/precision/void_buy_void_source_finality_v7_deployment_receipt_install_v1.ts",
  "utf8",
);
const applyStart=installerSource.indexOf(
  "const planned=validateBuyVoidSourceFinalityV7DeploymentPlanFileV1",
);
const applyEnd=installerSource.indexOf(
  "status=DEPLOYMENT_RECEIPT_INSTALLED_GREEN",
  applyStart,
);
assert.ok(applyStart>0&&applyEnd>applyStart,"apply_phase_source_slice_missing");
const applySlice=installerSource.slice(applyStart,applyEnd);
for(const forbidden of [
  "inspectRepositoryIdentityV1(",
  "inspectAcceptedEnforcementLockV1(",
  "rederiveAcceptedEnforcementCandidateV2(",
  "execFileSync(",
  "git(",
]){
  assert.equal(
    applySlice.includes(forbidden),
    false,
    "apply_phase_forbidden_discovery:"+forbidden,
  );
}

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
    bytes:custodyBytes,
  }));
  const redirectAfter=fs.lstatSync(redirect);
  assert.equal(redirectAfter.uid,redirectBefore.uid);
  assert.equal(redirectAfter.gid,redirectBefore.gid);
  assert.equal(redirectAfter.mode,redirectBefore.mode);
  assert.equal(fs.existsSync(path.join(redirect,"deployment-receipt.json")),false);
  fs.unlinkSync(symlinkParent);

  const tempPrefix=(receiptPath:string)=>
    "."+path.basename(receiptPath)+".tmp-";
  const tempEntries=(receiptPath:string)=>{
    const parent=path.dirname(receiptPath);
    if(!fs.existsSync(parent))return [];
    const prefix=tempPrefix(receiptPath);
    return fs.readdirSync(parent).filter((name)=>name.startsWith(prefix));
  };

  // A newly created final custody directory is not durable until its retained
  // grandparent directory entry has also been fsynced.
  {
    const receipt=path.join(root,"grand-sync","deployment-receipt.json");
    const grandparent=root;
    const originalOpen=(fs as any).openSync;
    const originalFsync=(fs as any).fsyncSync;
    let grandFd=-1;
    let injected=false;
    try{
      (fs as any).openSync=function(...args:any[]){
        const fd=originalOpen.apply(fs,args);
        if(String(args[0])===grandparent)grandFd=fd;
        return fd;
      };
      (fs as any).fsyncSync=function(fd:number){
        if(!injected&&grandFd>=0&&fd===grandFd){
          injected=true;
          throw Object.assign(new Error("synthetic_grandparent_fsync_failure"),{code:"EIO"});
        }
        return originalFsync.call(fs,fd);
      };
      assert.throws(()=>installRootCustodiedReceiptV1({
        absolute_path:receipt,bytes:custodyBytes,
      }),/synthetic_grandparent_fsync_failure/u);
    }finally{
      (fs as any).openSync=originalOpen;
      (fs as any).fsyncSync=originalFsync;
    }
    assert.equal(injected,true);
    assert.equal(fs.existsSync(receipt),false);
  }

  const proveTempFailureCleanup=(
    label:string,
    method:"fchownSync"|"writeSync"|"fsyncSync"|"fchmodSync",
  )=>{
    const receipt=path.join(root,"temp-"+label,"deployment-receipt.json");
    const originalOpen=(fs as any).openSync;
    const originalTarget=(fs as any)[method];
    let tempFd=-1;
    let injected=false;
    try{
      (fs as any).openSync=function(...args:any[]){
        const fd=originalOpen.apply(fs,args);
        if(String(args[0]).includes(tempPrefix(receipt)))tempFd=fd;
        return fd;
      };
      (fs as any)[method]=function(...args:any[]){
        if(!injected&&tempFd>=0&&Number(args[0])===tempFd){
          injected=true;
          throw Object.assign(new Error("synthetic_temp_"+label+"_failure"),{code:"EIO"});
        }
        return originalTarget.apply(fs,args);
      };
      assert.throws(()=>installRootCustodiedReceiptV1({
        absolute_path:receipt,bytes:custodyBytes,
      }),new RegExp("synthetic_temp_"+label+"_failure","u"));
    }finally{
      (fs as any).openSync=originalOpen;
      (fs as any)[method]=originalTarget;
    }
    assert.equal(injected,true,label+"_failure_not_injected");
    assert.equal(fs.existsSync(receipt),false,label+"_published_receipt");
    assert.deepEqual(tempEntries(receipt),[],label+"_temp_survived");
  };

  proveTempFailureCleanup("fchown","fchownSync");
  proveTempFailureCleanup("write","writeSync");
  proveTempFailureCleanup("fsync","fsyncSync");
  proveTempFailureCleanup("fchmod","fchmodSync");

  const proveCleanupFailureObservable=(
    label:"unlink"|"parent-fsync",
  )=>{
    const receipt=path.join(root,"cleanup-"+label,"deployment-receipt.json");
    const originalOpen=(fs as any).openSync;
    const originalFchown=(fs as any).fchownSync;
    const originalUnlink=(fs as any).unlinkSync;
    const originalFsync=(fs as any).fsyncSync;
    let tempFd=-1;
    let injectedPrimary=false;
    let injectedCleanup=false;
    try{
      (fs as any).openSync=function(...args:any[]){
        const fd=originalOpen.apply(fs,args);
        if(String(args[0]).includes(tempPrefix(receipt)))tempFd=fd;
        return fd;
      };
      (fs as any).fchownSync=function(fd:number,...args:any[]){
        if(!injectedPrimary&&tempFd>=0&&fd===tempFd){
          injectedPrimary=true;
          throw Object.assign(
            new Error("synthetic_cleanup_primary_"+label),
            {code:"EIO"},
          );
        }
        return originalFchown.call(fs,fd,...args);
      };
      if(label==="unlink"){
        (fs as any).unlinkSync=function(target:string,...args:any[]){
          if(!injectedCleanup&&String(target).includes(tempPrefix(receipt))){
            injectedCleanup=true;
            throw Object.assign(
              new Error("synthetic_cleanup_unlink_failure"),
              {code:"EIO"},
            );
          }
          return originalUnlink.call(fs,target,...args);
        };
      }else{
        (fs as any).fsyncSync=function(fd:number){
          if(!injectedCleanup&&tempFd>=0&&fd!==tempFd){
            injectedCleanup=true;
            throw Object.assign(
              new Error("synthetic_cleanup_parent_fsync_failure"),
              {code:"EIO"},
            );
          }
          return originalFsync.call(fs,fd);
        };
      }
      assert.throws(
        ()=>installRootCustodiedReceiptV1({
          absolute_path:receipt,bytes:custodyBytes,
        }),
        (error:any)=>{
          assert.ok(error instanceof AggregateError,"cleanup_failure_not_aggregate");
          assert.equal(error.message,"deployment_receipt_cleanup_failed");
          const messages=Array.from(
            error.errors||[],
            (entry:any)=>String(entry?.message||entry),
          );
          assert.ok(
            messages.includes("synthetic_cleanup_primary_"+label),
            "primary_error_not_preserved:"+label,
          );
          assert.ok(
            messages.includes(
              label==="unlink"
                ?"synthetic_cleanup_unlink_failure"
                :"synthetic_cleanup_parent_fsync_failure",
            ),
            "cleanup_error_not_observable:"+label,
          );
          return true;
        },
      );
    }finally{
      (fs as any).openSync=originalOpen;
      (fs as any).fchownSync=originalFchown;
      (fs as any).unlinkSync=originalUnlink;
      (fs as any).fsyncSync=originalFsync;
      for(const name of tempEntries(receipt)){
        fs.unlinkSync(path.join(path.dirname(receipt),name));
      }
    }
    assert.equal(injectedPrimary,true,label+"_primary_failure_not_injected");
    assert.equal(injectedCleanup,true,label+"_cleanup_failure_not_injected");
    assert.equal(fs.existsSync(receipt),false,label+"_published_receipt");
  };

  proveCleanupFailureObservable("unlink");
  proveCleanupFailureObservable("parent-fsync");

  // A path substitution after exclusive temp creation must never be cleaned up
  // as though the replacement were the inode created by this installer.
  {
    const receipt=path.join(root,"temp-foreign","deployment-receipt.json");
    const originalOpen=(fs as any).openSync;
    const originalFchown=(fs as any).fchownSync;
    let tempFd=-1;
    let tempPath="";
    let foreignVisible="";
    let foreignIdentity:fs.Stats|undefined;
    let injected=false;
    try{
      (fs as any).openSync=function(...args:any[]){
        const fd=originalOpen.apply(fs,args);
        if(String(args[0]).includes(tempPrefix(receipt))){
          tempFd=fd;
          tempPath=String(args[0]);
          foreignVisible=path.join(path.dirname(receipt),path.basename(tempPath));
        }
        return fd;
      };
      (fs as any).fchownSync=function(fd:number,uid:number,gid:number){
        if(!injected&&tempFd>=0&&fd===tempFd){
          injected=true;
          fs.unlinkSync(tempPath);
          fs.writeFileSync(tempPath,"foreign\n",{mode:0o600});
          fs.chownSync(tempPath,0,0);
          foreignIdentity=fs.lstatSync(tempPath);
          throw Object.assign(new Error("synthetic_foreign_substitution"),{code:"EIO"});
        }
        return originalFchown.call(fs,fd,uid,gid);
      };
      assert.throws(()=>installRootCustodiedReceiptV1({
        absolute_path:receipt,bytes:custodyBytes,
      }),/synthetic_foreign_substitution/u);
    }finally{
      (fs as any).openSync=originalOpen;
      (fs as any).fchownSync=originalFchown;
    }
    assert.equal(injected,true);
    assert.ok(foreignIdentity);
    assert.ok(foreignVisible);
    const after=fs.lstatSync(foreignVisible);
    assert.equal(after.dev,foreignIdentity!.dev);
    assert.equal(after.ino,foreignIdentity!.ino);
    assert.equal(fs.readFileSync(foreignVisible,"utf8"),"foreign\n");
    fs.unlinkSync(foreignVisible);
  }

  const restrictiveParent=path.join(root,"restrictive");
  const restrictiveReceipt=path.join(restrictiveParent,"deployment-receipt.json");
  fs.mkdirSync(restrictiveParent,{mode:0o700});
  fs.chownSync(restrictiveParent,0,0);
  fs.chmodSync(restrictiveParent,0o700);
  const restrictiveBefore=fs.lstatSync(restrictiveParent);
  const restrictiveResult=installRootCustodiedReceiptV1({
    absolute_path:restrictiveReceipt,bytes:custodyBytes,
  });
  assert.equal(restrictiveResult.created,true);
  const restrictiveAfter=fs.lstatSync(restrictiveParent);
  assert.equal(restrictiveAfter.dev,restrictiveBefore.dev);
  assert.equal(restrictiveAfter.ino,restrictiveBefore.ino);
  assert.equal(restrictiveAfter.uid,restrictiveBefore.uid);
  assert.equal(restrictiveAfter.gid,restrictiveBefore.gid);
  assert.equal(restrictiveAfter.mode,restrictiveBefore.mode);

  const first=installRootCustodiedReceiptV1({
    absolute_path:good,bytes:custodyBytes,
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
    absolute_path:good,bytes:custodyBytes,
  });
  assert.equal(second.created,false);
  assert.equal(second.already_matching,true);

  fs.mkdirSync(path.dirname(bad),{recursive:true,mode:0o755});
  fs.writeFileSync(bad,"{}\n",{mode:0o444});
  fs.chownSync(bad,0,0);
  fs.chmodSync(bad,0o444);
  assert.throws(()=>installRootCustodiedReceiptV1({
    absolute_path:bad,bytes:custodyBytes,
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
console.log("new_parent_grandparent_fsync_required="+String(rootCapable));
console.log("post_create_temp_failure_cleanup_exact="+String(rootCapable));
console.log("cleanup_failure_observable="+String(rootCapable));
console.log("cleanup_primary_error_preserved="+String(rootCapable));
console.log("foreign_temp_inode_preserved="+String(rootCapable));
console.log("root_custodied_create_once_positive="+String(rootCapable));
console.log("matching_reapply_idempotent="+String(rootCapable));
console.log("mismatched_existing_receipt_rejected="+String(rootCapable));
console.log("leaf_root_owned_mode_0444_single_link="+String(rootCapable));
console.log("unprivileged_proof_stack_safe="+String(!rootCapable));
console.log("service_mutation=false");
console.log("credential_wallet_signer_transaction_authority=false");
console.log("presale_activation=false");
console.log("current_enforcement_lock_v2_verified="+String(!rootCapable));
console.log("whole_enforcement_candidate_rederived_exact="+String(!rootCapable));
console.log("deployment_plan_content_addressed="+String(!rootCapable));
console.log("stale_lock_newer_enforcement_member_rejected="+String(!rootCapable));
console.log("apply_phase_git_or_candidate_derivation=false");
console.log("funds_movement=false");
