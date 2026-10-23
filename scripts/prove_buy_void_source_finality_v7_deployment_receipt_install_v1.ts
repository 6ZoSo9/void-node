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
  inspectBuyVoidCurrentEnforcementTrackedSourceInventoryV1,
  assertBuyVoidCandidateCurrentEnforcementTrackedSourceInventoryV1,
  inspectRepositoryIdentityV1,
  installRootCustodiedReceiptV1,
  readObservedRegularFileV1,
  readTrackedFileV1,
} from "../ops/precision/void_buy_void_source_finality_v7_deployment_receipt_install_v1.js";
import {
  buyVoidSourceFinalityEnforcementLockIdV7,
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
assert.throws(
  ()=>inspectAcceptedEnforcementLockV1(
    "ops/security/buy-void-enforcement-post2865-lock-v1.json",
  ),
  /accepted_enforcement_candidate_current_source_inventory_missing/u,
);
const currentInventory=
  inspectBuyVoidCurrentEnforcementTrackedSourceInventoryV1();
assert.equal(currentInventory.length,49);
assert.deepEqual(
  currentInventory.map(row=>row.path),
  [...currentInventory.map(row=>row.path)].sort(),
);
assert.doesNotThrow(
  ()=>assertBuyVoidCandidateCurrentEnforcementTrackedSourceInventoryV1({
    current_enforcement_tracked_source_inventory_v1:currentInventory,
  }),
);
const wrongInventory=structuredClone(currentInventory) as any[];
wrongInventory[0].git_blob_sha1="0".repeat(40);
assert.throws(
  ()=>assertBuyVoidCandidateCurrentEnforcementTrackedSourceInventoryV1({
    current_enforcement_tracked_source_inventory_v1:wrongInventory,
  }),
  /accepted_enforcement_candidate_current_source_inventory_mismatch/u,
);
const acceptedLock=Object.freeze({
  accepted_enforcement_set_sha256:"a".repeat(64),
  accepted_enforcement_lock_git_blob_sha1:"b".repeat(40),
  accepted_enforcement_lock_sha256:"c".repeat(64),
  accepted_enforcement_lock_id:buyVoidSourceFinalityEnforcementLockIdV7({
    accepted_enforcement_set_sha256:"a".repeat(64),
    accepted_enforcement_lock_git_blob_sha1:"b".repeat(40),
    accepted_enforcement_lock_sha256:"c".repeat(64),
  }),
  current_enforcement_tracked_source_inventory_verified:true as const,
});
const built=buildBuyVoidSourceFinalityV7DeploymentReceiptV1({
  process_source_commit:commit,
  process_source_tree:tree,
  accepted_enforcement_lock:acceptedLock,
});
assert.equal(built.reviewed_source_file_count,"10");
assert.equal(built.reviewed_source_files_sha256,
  sources.reviewed_source_files_sha256);
assert.match(built.receipt_id,/^voidbsfdep1_[0-9a-f]{64}$/u);
assert.equal(built.receipt.receipt_id,built.receipt_id);

const classified=classifyBuyVoidSourceFinalityDeploymentReceiptV7({
  receipt:built.receipt,
  process_source_identity:processIdentity,
  reviewed_source_files_sha256:sources.reviewed_source_files_sha256,
  reviewed_source_file_count:"10",
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
    reviewed_source_file_count:"10",
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


function proveTrackedFileReaderV1(){
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),"void-v7-tracked-reader-"));
  const repoRoot=path.join(temp,"repo");
  const relative="ops/security/fixture-lock.json";
  const absolute=path.join(repoRoot,...relative.split("/"));
  try{
    fs.mkdirSync(path.dirname(absolute),{recursive:true,mode:0o700});
    execFileSync("/usr/bin/git",["init","-b","main",repoRoot],{
      stdio:"ignore",env:{PATH:"/usr/bin:/bin",HOME:"/nonexistent",LANG:"C",LC_ALL:"C"},
    });
    fs.writeFileSync(absolute,"{\"fixture\":true}\n",{mode:0o600});
    execFileSync("/usr/bin/git",["-C",repoRoot,"add",relative],{stdio:"ignore"});
    execFileSync("/usr/bin/git",[
      "-C",repoRoot,"-c","user.name=VOID Proof",
      "-c","user.email=void-proof.invalid@example.invalid",
      "commit","-m","fixture",
    ],{stdio:"ignore"});

    const direct=readTrackedFileV1(repoRoot,relative,1024);
    assert.equal(direct.bytes.toString("utf8"),"{\"fixture\":true}\n");

    const before=fs.lstatSync(absolute);
    fs.renameSync(absolute,absolute+".old");
    fs.writeFileSync(absolute,"{\"fixture\":evil}\n",{mode:0o600});
    assert.throws(
      ()=>readObservedRegularFileV1(absolute,before,1024,"fixture_replace"),
      /fixture_replace_open_generation_mismatch/u,
    );

    fs.rmSync(absolute,{force:true});
    fs.renameSync(absolute+".old",absolute);
    const beforeSymlink=fs.lstatSync(absolute);
    const target=absolute+".target";
    fs.writeFileSync(target,"{\"fixture\":true}\n",{mode:0o600});
    fs.renameSync(absolute,absolute+".symlink-original");
    fs.symlinkSync(path.basename(target),absolute);
    assert.throws(
      ()=>readObservedRegularFileV1(absolute,beforeSymlink,1024,"fixture_symlink"),
      (error:any)=>error?.code==="ELOOP",
    );

    fs.rmSync(absolute,{force:true});
    fs.renameSync(absolute+".symlink-original",absolute);

    const beforeFifo=fs.lstatSync(absolute);
    fs.renameSync(absolute,absolute+".fifo-original");
    execFileSync("/usr/bin/mkfifo",[absolute],{
      stdio:"ignore",
      env:{PATH:"/usr/bin:/bin",HOME:"/nonexistent",LANG:"C",LC_ALL:"C"},
    });
    fs.chmodSync(absolute,0o600);
    assert.throws(
      ()=>readObservedRegularFileV1(absolute,beforeFifo,1024,"fixture_fifo"),
      /fixture_fifo_opened_shape_invalid/u,
    );
    fs.rmSync(absolute,{force:true});
    fs.renameSync(absolute+".fifo-original",absolute);

    const beforeGrowth=fs.lstatSync(absolute);
    fs.appendFileSync(absolute,"x".repeat(2048));
    assert.throws(
      ()=>readObservedRegularFileV1(absolute,beforeGrowth,1024,"fixture_growth"),
      /fixture_growth_opened_shape_invalid/u,
    );
  }finally{
    fs.rmSync(temp,{recursive:true,force:true});
  }
}

proveTrackedFileReaderV1();

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
        absolute_path:receipt,bytes:built.bytes,
      }),/synthetic_grandparent_fsync_failure/u);
    }finally{
      (fs as any).openSync=originalOpen;
      (fs as any).fsyncSync=originalFsync;
    }
    assert.equal(injected,true);
    assert.equal(fs.existsSync(receipt),false);
    assert.equal(fs.existsSync(path.dirname(receipt)),true);

    let retryGrandFd=-1;
    let retryGrandFsyncs=0;
    try{
      (fs as any).openSync=function(...args:any[]){
        const fd=originalOpen.apply(fs,args);
        if(String(args[0])===grandparent)retryGrandFd=fd;
        return fd;
      };
      (fs as any).fsyncSync=function(fd:number){
        if(retryGrandFd>=0&&fd===retryGrandFd)retryGrandFsyncs+=1;
        return originalFsync.call(fs,fd);
      };
      const retry=installRootCustodiedReceiptV1({
        absolute_path:receipt,bytes:built.bytes,
      });
      assert.equal(retry.created,true);
      assert.equal(retry.already_matching,false);
    }finally{
      (fs as any).openSync=originalOpen;
      (fs as any).fsyncSync=originalFsync;
    }
    assert.ok(retryGrandFsyncs>=1,"existing_parent_grandparent_fsync_missing");
  }

  const proveDirectFailureResidue=(
    label:string,
    method:"fchownSync"|"writeSync"|"fsyncSync"|"fchmodSync",
  )=>{
    const receipt=path.join(root,"direct-"+label,"deployment-receipt.json");
    const originalOpen=(fs as any).openSync;
    const originalTarget=(fs as any)[method];
    let finalFd=-1;
    let injected=false;
    try{
      (fs as any).openSync=function(...args:any[]){
        const fd=originalOpen.apply(fs,args);
        const flags=Number(args[1]);
        if(
          Number.isInteger(flags)&&
          (flags&fs.constants.O_CREAT)!==0&&
          (flags&fs.constants.O_EXCL)!==0
        )finalFd=fd;
        return fd;
      };
      (fs as any)[method]=function(...args:any[]){
        if(!injected&&finalFd>=0&&Number(args[0])===finalFd){
          injected=true;
          throw Object.assign(
            new Error("synthetic_direct_"+label+"_failure"),{code:"EIO"},
          );
        }
        return originalTarget.apply(fs,args);
      };
      assert.throws(()=>installRootCustodiedReceiptV1({
        absolute_path:receipt,bytes:built.bytes,
      }),new RegExp("synthetic_direct_"+label+"_failure","u"));
    }finally{
      (fs as any).openSync=originalOpen;
      (fs as any)[method]=originalTarget;
    }
    assert.equal(injected,true,label+"_failure_not_injected");
    const residue=fs.lstatSync(receipt);
    assert.ok(residue.isFile()&&!residue.isSymbolicLink());
    assert.equal(residue.nlink,1);
    assert.equal(residue.mode&0o777,0o600);
    assert.throws(()=>installRootCustodiedReceiptV1({
      absolute_path:receipt,bytes:built.bytes,
    }),/receipt_leaf_mode_invalid/u);
    fs.unlinkSync(receipt);
  };

  proveDirectFailureResidue("fchown","fchownSync");
  proveDirectFailureResidue("write","writeSync");
  proveDirectFailureResidue("fsync","fsyncSync");
  proveDirectFailureResidue("fchmod","fchmodSync");

  // If the commit parent fsync fails after the receipt is already sealed 0444,
  // the exact receipt remains fail-safe and a retry must fsync the parent before
  // returning idempotent success.
  {
    const receipt=path.join(root,"direct-parent-fsync","deployment-receipt.json");
    const originalOpen=(fs as any).openSync;
    const originalFsync=(fs as any).fsyncSync;
    let parentFd=-1;
    let finalFd=-1;
    let injected=false;
    try{
      (fs as any).openSync=function(...args:any[]){
        const fd=originalOpen.apply(fs,args);
        const target=String(args[0]);
        const flags=Number(args[1]);
        if(
          Number.isInteger(flags)&&
          (flags&fs.constants.O_DIRECTORY)!==0&&
          target.endsWith("/direct-parent-fsync")
        )parentFd=fd;
        if(
          Number.isInteger(flags)&&
          (flags&fs.constants.O_CREAT)!==0&&
          (flags&fs.constants.O_EXCL)!==0
        )finalFd=fd;
        return fd;
      };
      (fs as any).fsyncSync=function(fd:number){
        if(!injected&&finalFd>=0&&parentFd>=0&&fd===parentFd){
          injected=true;
          throw Object.assign(
            new Error("synthetic_parent_commit_fsync_failure"),{code:"EIO"},
          );
        }
        return originalFsync.call(fs,fd);
      };
      assert.throws(()=>installRootCustodiedReceiptV1({
        absolute_path:receipt,bytes:built.bytes,
      }),/synthetic_parent_commit_fsync_failure/u);
    }finally{
      (fs as any).openSync=originalOpen;
      (fs as any).fsyncSync=originalFsync;
    }
    assert.equal(injected,true);
    const residue=fs.lstatSync(receipt);
    assert.equal(residue.mode&0o777,0o444);
    assert.equal(residue.nlink,1);

    let retryParentFd=-1;
    let retryParentFsyncs=0;
    try{
      (fs as any).openSync=function(...args:any[]){
        const fd=originalOpen.apply(fs,args);
        const target=String(args[0]);
        const flags=Number(args[1]);
        if(
          Number.isInteger(flags)&&
          (flags&fs.constants.O_DIRECTORY)!==0&&
          target.endsWith("/direct-parent-fsync")
        )retryParentFd=fd;
        return fd;
      };
      (fs as any).fsyncSync=function(fd:number){
        if(retryParentFd>=0&&fd===retryParentFd)retryParentFsyncs+=1;
        return originalFsync.call(fs,fd);
      };
      const retry=installRootCustodiedReceiptV1({
        absolute_path:receipt,bytes:built.bytes,
      });
      assert.equal(retry.created,false);
      assert.equal(retry.already_matching,true);
    }finally{
      (fs as any).openSync=originalOpen;
      (fs as any).fsyncSync=originalFsync;
    }
    assert.ok(retryParentFsyncs>=1,"idempotent_parent_fsync_missing");
  }

  // If the second file fsync fails after mode 0444 is visible, retry must
  // fsync the exact receipt inode before it fsyncs the retained parent.
  {
    const receipt=path.join(root,"postseal-recovery","deployment-receipt.json");
    const originalOpen=(fs as any).openSync;
    const originalFsync=(fs as any).fsyncSync;
    let createFd=-1;
    let createFsyncs=0;
    let injected=false;
    try{
      (fs as any).openSync=function(...args:any[]){
        const fd=originalOpen.apply(fs,args);
        const flags=Number(args[1]);
        if(
          Number.isInteger(flags)&&
          (flags&fs.constants.O_CREAT)!==0&&
          (flags&fs.constants.O_EXCL)!==0
        )createFd=fd;
        return fd;
      };
      (fs as any).fsyncSync=function(fd:number){
        if(createFd>=0&&fd===createFd){
          createFsyncs+=1;
          if(!injected&&createFsyncs===2){
            injected=true;
            throw Object.assign(
              new Error("synthetic_postseal_file_fsync_failure"),{code:"EIO"},
            );
          }
        }
        return originalFsync.call(fs,fd);
      };
      assert.throws(()=>installRootCustodiedReceiptV1({
        absolute_path:receipt,bytes:built.bytes,
      }),/synthetic_postseal_file_fsync_failure/u);
    }finally{
      (fs as any).openSync=originalOpen;
      (fs as any).fsyncSync=originalFsync;
    }
    assert.equal(injected,true);
    const residue=fs.lstatSync(receipt);
    assert.equal(residue.mode&0o777,0o444);
    assert.equal(residue.nlink,1);

    let retryParentFd=-1;
    let retryReceiptFd=-1;
    const durabilityOrder:string[]=[];
    try{
      (fs as any).openSync=function(...args:any[]){
        const fd=originalOpen.apply(fs,args);
        const target=String(args[0]);
        const flags=Number(args[1]);
        if(
          Number.isInteger(flags)&&
          (flags&fs.constants.O_DIRECTORY)!==0&&
          target.endsWith("/postseal-recovery")
        )retryParentFd=fd;
        if(
          Number.isInteger(flags)&&
          (flags&fs.constants.O_DIRECTORY)===0&&
          (flags&fs.constants.O_CREAT)===0&&
          target.endsWith("/deployment-receipt.json")
        )retryReceiptFd=fd;
        return fd;
      };
      (fs as any).fsyncSync=function(fd:number){
        if(retryReceiptFd>=0&&fd===retryReceiptFd)durabilityOrder.push("file");
        else if(retryParentFd>=0&&fd===retryParentFd)durabilityOrder.push("parent");
        return originalFsync.call(fs,fd);
      };
      const retry=installRootCustodiedReceiptV1({
        absolute_path:receipt,bytes:built.bytes,
      });
      assert.equal(retry.created,false);
      assert.equal(retry.already_matching,true);
    }finally{
      (fs as any).openSync=originalOpen;
      (fs as any).fsyncSync=originalFsync;
    }
    assert.ok(durabilityOrder.length>=2,"postseal_retry_fsyncs_missing");
    assert.equal(durabilityOrder[0],"file","receipt_fsync_must_precede_parent");
    assert.ok(durabilityOrder.includes("parent"),"postseal_parent_fsync_missing");
  }

  // Production code never deletes a pathname after creation. If a privileged
  // concurrent actor substitutes the visible final path during a failure, that
  // foreign inode is left untouched and the operation HOLDs.
  {
    const receipt=path.join(root,"direct-foreign","deployment-receipt.json");
    const originalOpen=(fs as any).openSync;
    const originalFchown=(fs as any).fchownSync;
    let finalFd=-1;
    let injected=false;
    let foreignIdentity:fs.Stats|undefined;
    try{
      (fs as any).openSync=function(...args:any[]){
        const fd=originalOpen.apply(fs,args);
        const flags=Number(args[1]);
        if(
          Number.isInteger(flags)&&
          (flags&fs.constants.O_CREAT)!==0&&
          (flags&fs.constants.O_EXCL)!==0
        )finalFd=fd;
        return fd;
      };
      (fs as any).fchownSync=function(fd:number,uid:number,gid:number){
        if(!injected&&finalFd>=0&&fd===finalFd){
          injected=true;
          fs.unlinkSync(receipt);
          fs.writeFileSync(receipt,"foreign\n",{mode:0o600});
          fs.chownSync(receipt,0,0);
          foreignIdentity=fs.lstatSync(receipt);
          throw Object.assign(new Error("synthetic_foreign_substitution"),{code:"EIO"});
        }
        return originalFchown.call(fs,fd,uid,gid);
      };
      assert.throws(()=>installRootCustodiedReceiptV1({
        absolute_path:receipt,bytes:built.bytes,
      }),/synthetic_foreign_substitution/u);
    }finally{
      (fs as any).openSync=originalOpen;
      (fs as any).fchownSync=originalFchown;
    }
    assert.equal(injected,true);
    assert.ok(foreignIdentity);
    const after=fs.lstatSync(receipt);
    assert.equal(after.dev,foreignIdentity!.dev);
    assert.equal(after.ino,foreignIdentity!.ino);
    assert.equal(fs.readFileSync(receipt,"utf8"),"foreign\n");
    fs.unlinkSync(receipt);
  }

  // Existing receipts are descriptor-read with the production 64 KiB ceiling.
  {
    const receipt=path.join(root,"oversized-existing","deployment-receipt.json");
    fs.mkdirSync(path.dirname(receipt),{recursive:true,mode:0o755});
    fs.writeFileSync(receipt,Buffer.alloc(64*1024+1,0x61),{mode:0o444});
    fs.chownSync(receipt,0,0);
    fs.chmodSync(receipt,0o444);
    assert.throws(()=>installRootCustodiedReceiptV1({
      absolute_path:receipt,bytes:built.bytes,
    }),/receipt_leaf_size_invalid/u);
    fs.unlinkSync(receipt);
  }

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
console.log("historical_enforcement_lock_refused_after_current_closure_expansion=true");
console.log("current_enforcement_tracked_source_inventory_count=49");
console.log("current_enforcement_tracked_source_inventory_verified=true");
console.log("current_enforcement_tracked_source_inventory_blob_and_mode_bound=true");
console.log("deployment_receipt_enforcement_set_not_source_hardcoded=true");
console.log("v7_reviewed_source_digest_uses_module_inspector=true");
console.log("repository_local_fsmonitor_ignored=true");
console.log("tracked_file_descriptor_bounded_read=true");
console.log("tracked_source_inventory_descriptor_bounded_read=true");
console.log("tracked_source_inventory_max_bytes=16777216");
console.log("tracked_file_nofollow_required=true");
console.log("tracked_file_replacement_race_rejected=true");
console.log("tracked_file_symlink_race_rejected=true");
console.log("tracked_file_fifo_swap_nonblocking=true");
console.log("root_custody_positive_exercised="+String(rootCapable));
console.log("descriptor_relative_parent_publication="+String(rootCapable));
console.log("direct_exclusive_final_publication="+String(rootCapable));
console.log("failed_publication_residue_preserved="+String(rootCapable));
console.log("pathname_cleanup_after_final_create=false");
console.log("existing_receipt_bounded_read="+String(rootCapable));
console.log("idempotent_parent_fsync_recovery="+String(rootCapable));
console.log("idempotent_receipt_file_fsync_recovery="+String(rootCapable));
console.log("receipt_file_fsync_precedes_parent="+String(rootCapable));
console.log("symlink_parent_no_collateral_mutation="+String(rootCapable));
console.log("restrictive_parent_mode_preserved="+String(rootCapable));
console.log("new_parent_grandparent_fsync_required="+String(rootCapable));
console.log("existing_parent_grandparent_fsync_recovery="+String(rootCapable));
console.log("root_custodied_create_once_positive="+String(rootCapable));
console.log("matching_reapply_idempotent="+String(rootCapable));
console.log("mismatched_existing_receipt_rejected="+String(rootCapable));
console.log("leaf_root_owned_mode_0444_single_link="+String(rootCapable));
console.log("unprivileged_proof_stack_safe="+String(!rootCapable));
console.log("service_mutation=false");
console.log("credential_wallet_signer_transaction_authority=false");
console.log("presale_activation=false");
console.log("funds_movement=false");
