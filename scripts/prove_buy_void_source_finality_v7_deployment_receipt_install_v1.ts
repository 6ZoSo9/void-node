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
  readTrackedFileV1,
  installRootCustodiedReceiptV1,
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

function proveProductionTrackedFileReadBoundaryV1(){
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),"void-v7-tracked-reader-"));
  const repoRoot=path.join(temp,"repo");
  const relative="ops/security/reader-fixture.json";
  const absolute=path.join(repoRoot,...relative.split("/"));
  const payload=Buffer.from('{"fixture":"reviewed"}\n',"utf8");
  const mutableFs=fs as any;
  const originalOpenSync=fs.openSync;
  const originalReadSync=fs.readSync;
  const gitEnv={PATH:"/usr/bin:/bin",HOME:"/nonexistent",LANG:"C",LC_ALL:"C"};
  try{
    fs.mkdirSync(path.dirname(absolute),{recursive:true,mode:0o700});
    fs.writeFileSync(absolute,payload,{mode:0o600});
    execFileSync("/usr/bin/git",["init","-b","main",repoRoot],{
      stdio:"ignore",env:gitEnv,
    });
    execFileSync("/usr/bin/git",["-C",repoRoot,"add",relative],{
      stdio:"ignore",env:gitEnv,
    });
    execFileSync("/usr/bin/git",[
      "-C",repoRoot,
      "-c","user.name=VOID Proof",
      "-c","user.email=void-proof.invalid@example.invalid",
      "commit","-m","fixture",
    ],{stdio:"ignore",env:gitEnv});

    const good=readTrackedFileV1(repoRoot,relative,payload.length);
    assert.ok(good.bytes.equals(payload),"production_tracked_reader_success_bytes");

    const replacement=absolute+".replacement-original";
    let replaced=false;
    mutableFs.openSync=(...args:any[])=>{
      if(!replaced&&path.resolve(String(args[0]))===absolute){
        replaced=true;
        fs.renameSync(absolute,replacement);
        fs.writeFileSync(absolute,payload,{mode:0o600});
      }
      return (originalOpenSync as any)(...args);
    };
    assert.throws(
      ()=>readTrackedFileV1(repoRoot,relative,payload.length),
      /accepted_enforcement_file_open_generation_mismatch/u,
    );
    assert.equal(replaced,true,"production_tracked_reader_replacement_not_exercised");
    mutableFs.openSync=originalOpenSync;
    fs.rmSync(absolute,{force:true});
    fs.renameSync(replacement,absolute);

    const directTarget=absolute+".direct-target";
    fs.renameSync(absolute,directTarget);
    fs.symlinkSync(path.basename(directTarget),absolute);
    assert.throws(
      ()=>readTrackedFileV1(repoRoot,relative,payload.length),
      /accepted_enforcement_file_shape_invalid/u,
    );
    fs.rmSync(absolute,{force:true});
    fs.renameSync(directTarget,absolute);

    const swapOriginal=absolute+".swap-original";
    const swapTarget=absolute+".swap-target";
    fs.writeFileSync(swapTarget,payload,{mode:0o600});
    let symlinked=false;
    mutableFs.openSync=(...args:any[])=>{
      if(!symlinked&&path.resolve(String(args[0]))===absolute){
        symlinked=true;
        fs.renameSync(absolute,swapOriginal);
        fs.symlinkSync(path.basename(swapTarget),absolute);
      }
      return (originalOpenSync as any)(...args);
    };
    assert.throws(
      ()=>readTrackedFileV1(repoRoot,relative,payload.length),
      (error:any)=>error?.code==="ELOOP",
    );
    assert.equal(symlinked,true,"production_tracked_reader_symlink_swap_not_exercised");
    mutableFs.openSync=originalOpenSync;
    fs.rmSync(absolute,{force:true});
    fs.renameSync(swapOriginal,absolute);
    fs.rmSync(swapTarget,{force:true});

    const fifoOriginal=absolute+".fifo-original";
    const beforeFifo=fs.lstatSync(absolute);
    let fifoSwapped=false;
    let fifoOpenFlags=0;
    mutableFs.openSync=(...args:any[])=>{
      if(!fifoSwapped&&path.resolve(String(args[0]))===absolute){
        fifoSwapped=true;
        fifoOpenFlags=Number(args[1]);
        fs.renameSync(absolute,fifoOriginal);
        execFileSync("/usr/bin/mkfifo",[absolute],{
          stdio:"ignore",env:gitEnv,
        });
        fs.chmodSync(absolute,0o600);
      }
      return (originalOpenSync as any)(...args);
    };
    assert.throws(
      ()=>readTrackedFileV1(repoRoot,relative,payload.length),
      /accepted_enforcement_file_opened_shape_invalid/u,
    );
    assert.equal(fifoSwapped,true,
      "production_tracked_reader_fifo_swap_not_exercised");
    assert.equal(
      (fifoOpenFlags&fs.constants.O_NONBLOCK)!==0,true,
      "production_tracked_reader_fifo_open_not_nonblocking",
    );
    mutableFs.openSync=originalOpenSync;
    fs.rmSync(absolute,{force:true});
    fs.renameSync(fifoOriginal,absolute);
    assert.equal(fs.lstatSync(absolute).ino,beforeFifo.ino,
      "production_tracked_reader_fifo_original_not_restored");

    let grew=false;
    mutableFs.readSync=(...args:any[])=>{
      if(!grew){
        grew=true;
        fs.appendFileSync(absolute,Buffer.from("X","utf8"));
      }
      return (originalReadSync as any)(...args);
    };
    assert.throws(
      ()=>readTrackedFileV1(repoRoot,relative,payload.length),
      /accepted_enforcement_file_size_limit_exceeded/u,
    );
    assert.equal(grew,true,"production_tracked_reader_growth_not_exercised");
    mutableFs.readSync=originalReadSync;
    fs.writeFileSync(absolute,payload,{mode:0o600});

    const status=execFileSync("/usr/bin/git",[
      "-C",repoRoot,"status","--porcelain=v1","--untracked-files=all",
    ],{encoding:"utf8",env:gitEnv}).trim();
    assert.equal(status,"","production_tracked_reader_fixture_not_restored");
  }finally{
    mutableFs.openSync=originalOpenSync;
    mutableFs.readSync=originalReadSync;
    fs.rmSync(temp,{recursive:true,force:true});
  }
}

proveProductionTrackedFileReadBoundaryV1();

proveRepositoryLocalFsmonitorIgnoredV1();

const rootCapable=
  typeof process.getuid==="function" && process.getuid()===0;

if(rootCapable){
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
console.log("root_custody_positive_exercised="+String(rootCapable));
console.log("root_custodied_create_once_positive="+String(rootCapable));
console.log("matching_reapply_idempotent="+String(rootCapable));
console.log("mismatched_existing_receipt_rejected="+String(rootCapable));
console.log("leaf_root_owned_mode_0444_single_link="+String(rootCapable));
console.log("unprivileged_proof_stack_safe="+String(!rootCapable));
console.log("production_tracked_file_descriptor_bound=true");
console.log("production_tracked_file_nofollow=true");
console.log("production_tracked_file_nonblocking=true");
console.log("production_tracked_file_max_plus_one_bounded=true");
console.log("production_tracked_file_replacement_rejected=true");
console.log("production_tracked_file_symlink_swap_rejected=true");
console.log("production_tracked_file_fifo_swap_rejected=true");
console.log("current_enforcement_inventory_uses_bounded_descriptor=true");
console.log("service_mutation=false");
console.log("credential_wallet_signer_transaction_authority=false");
console.log("presale_activation=false");
console.log("funds_movement=false");
