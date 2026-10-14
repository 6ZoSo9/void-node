#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  VOID_BUY_VOID_SOURCE_FINALITY_DEPLOYMENT_RECEIPT_V1,
  buyVoidSourceFinalityDeploymentReceiptIdV7,
  buyVoidSourceFinalityEnforcementLockIdV7,
  inspectBuyVoidSourceFinalityReviewedSourceFilesV7,
} from "../../src/economic/buy_void_source_finality_generation_provenance_v7.js";

export const MARKER =
  "VOID_BUY_VOID_SOURCE_FINALITY_V7_DEPLOYMENT_RECEIPT_INSTALL_V1";
export const DEFAULT_RECEIPT_PATH =
  "/var/lib/void-source-finality-v7/deployment-receipt.json";
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const SHA40=/^[0-9a-f]{40}$/u;
const SHA256=/^[0-9a-f]{64}$/u;
const SAFE_LOCK_PATH=/^ops\/security\/[A-Za-z0-9._\/-]+\.json$/u;

function git(repositoryRoot:string,args:string[]):string{
  const root=path.resolve(repositoryRoot);
  assert.equal(root,repositoryRoot,"repository_root_not_canonical");
  return execFileSync("/usr/bin/git",[
    "--no-replace-objects",
    "-c","core.hooksPath=/dev/null",
    "-c","core.attributesFile=/dev/null",
    "-c","core.fsmonitor=false",
    "-c","core.untrackedCache=false",
    "-c","core.preloadIndex=false",
    "-c","submodule.recurse=false",
    "-c","safe.directory="+root,
    "-C",root,
    ...args,
  ],{
    encoding:"utf8",
    timeout:15_000,
    maxBuffer:1024*1024,
    stdio:["ignore","pipe","pipe"],
    env:{
      PATH:"/usr/bin:/bin",
      HOME:"/nonexistent",
      LANG:"C",
      LC_ALL:"C",
      TZ:"UTC",
      GIT_CONFIG_NOSYSTEM:"1",
      GIT_CONFIG_GLOBAL:"/dev/null",
      GIT_CONFIG_SYSTEM:"/dev/null",
      GIT_OPTIONAL_LOCKS:"0",
      GIT_NO_REPLACE_OBJECTS:"1",
      GIT_TERMINAL_PROMPT:"0",
    },
  }).trim();
}

export function inspectRepositoryIdentityV1(repositoryRoot:string=ROOT){
  const commit=git(repositoryRoot,["rev-parse","--verify","HEAD^{commit}"]).toLowerCase();
  const tree=git(repositoryRoot,["rev-parse","--verify","HEAD^{tree}"]).toLowerCase();
  const branch=git(repositoryRoot,["symbolic-ref","--short","-q","HEAD"]);
  const status=git(repositoryRoot,["status","--porcelain=v1"]);
  assert.match(commit,SHA40,"repository_commit_invalid");
  assert.match(tree,SHA40,"repository_tree_invalid");
  assert.equal(branch,"main","repository_branch_not_main");
  assert.equal(status,"","repository_not_clean");
  return Object.freeze({commit,tree,branch:"main" as const});
}

const sha256=(bytes:Buffer)=>crypto.createHash("sha256").update(bytes).digest("hex");
const gitBlobSha1=(bytes:Buffer)=>crypto.createHash("sha1")
  .update(Buffer.from("blob "+String(bytes.length)+"\0","utf8"))
  .update(bytes).digest("hex");

function readTrackedFileV1(repositoryRoot:string,relative:string,maxBytes=1024*1024){
  assert.match(relative,SAFE_LOCK_PATH,"accepted_enforcement_lock_path_invalid");
  assert.equal(path.posix.normalize(relative),relative,
    "accepted_enforcement_lock_path_not_normalized");
  assert.equal(relative.split("/").includes(".."),false,
    "accepted_enforcement_lock_path_escape");
  const absolute=path.join(repositoryRoot,...relative.split("/"));
  const before=fs.lstatSync(absolute);
  assert.ok(before.isFile()&&!before.isSymbolicLink()&&before.nlink===1&&
    before.size>0&&before.size<=maxBytes,
    "accepted_enforcement_file_shape_invalid:"+relative);
  const bytes=fs.readFileSync(absolute);
  const after=fs.lstatSync(absolute);
  assert.equal(after.dev,before.dev,"accepted_enforcement_file_device_drift");
  assert.equal(after.ino,before.ino,"accepted_enforcement_file_inode_drift");
  assert.equal(after.size,before.size,"accepted_enforcement_file_size_drift");
  assert.equal(after.mtimeMs,before.mtimeMs,"accepted_enforcement_file_mtime_drift");
  assert.equal(after.ctimeMs,before.ctimeMs,"accepted_enforcement_file_ctime_drift");
  const blob=gitBlobSha1(bytes);
  assert.equal(git(repositoryRoot,["rev-parse","HEAD:"+relative]),blob,
    "accepted_enforcement_file_not_exact_head");
  return Object.freeze({bytes,git_blob_sha1:blob,sha256:sha256(bytes)});
}

export function inspectAcceptedEnforcementLockV1(
  relativePath:string,
  repositoryRoot:string=ROOT,
){
  const lockFile=readTrackedFileV1(repositoryRoot,relativePath,256*1024);
  const lock=JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(lockFile.bytes));
  assert.equal(lock?.repository,"6ZoSo9/void-node","accepted_enforcement_lock_repository_invalid");
  assert.match(String(lock?.candidate_head||""),SHA40,
    "accepted_enforcement_lock_candidate_head_invalid");
  assert.equal(lock?.complete_executable_closure_verified,true,
    "accepted_enforcement_lock_closure_not_verified");
  assert.equal(lock?.candidate_enforcement_identity_accepted,true,
    "accepted_enforcement_lock_not_accepted");
  for(const key of [
    "deployed_artifact_generation_verified","runtime_mount_authority",
    "production_source_finality_authority_ready","public_presale_activation",
    "funds_movement",
  ])assert.equal(lock?.[key],false,"accepted_enforcement_lock_authority_overclaim:"+key);

  const evidence=lock?.candidate_evidence;
  assert.ok(evidence&&typeof evidence==="object"&&!Array.isArray(evidence),
    "accepted_enforcement_candidate_evidence_missing");
  const set=String(evidence.candidate_enforcement_set_sha256||"").toLowerCase();
  assert.match(set,SHA256,"accepted_enforcement_set_invalid");
  const candidatePath=String(evidence.path||"");
  const candidateFile=readTrackedFileV1(repositoryRoot,candidatePath,1024*1024);
  assert.equal(candidateFile.bytes.length,evidence.bytes,
    "accepted_enforcement_candidate_bytes_mismatch");
  assert.equal(candidateFile.sha256,evidence.sha256,
    "accepted_enforcement_candidate_sha256_mismatch");
  assert.equal(candidateFile.git_blob_sha1,evidence.git_blob_sha1,
    "accepted_enforcement_candidate_git_blob_mismatch");
  const candidate=JSON.parse(
    new TextDecoder("utf-8",{fatal:true}).decode(candidateFile.bytes),
  );
  assert.equal(candidate?.candidate_enforcement_set_sha256,set,
    "accepted_enforcement_candidate_set_mismatch");
  assert.equal(candidate?.complete_executable_closure_verified,true,
    "accepted_enforcement_candidate_closure_not_verified");
  assert.equal(candidate?.candidate_enforcement_identity_accepted,false,
    "accepted_enforcement_candidate_must_be_unaccepted");

  const accepted_enforcement_lock_id=buyVoidSourceFinalityEnforcementLockIdV7({
    accepted_enforcement_set_sha256:set,
    accepted_enforcement_lock_git_blob_sha1:lockFile.git_blob_sha1,
    accepted_enforcement_lock_sha256:lockFile.sha256,
  });
  return Object.freeze({
    path:relativePath,
    accepted_enforcement_set_sha256:set,
    accepted_enforcement_lock_git_blob_sha1:lockFile.git_blob_sha1,
    accepted_enforcement_lock_sha256:lockFile.sha256,
    accepted_enforcement_lock_id,
  });
}

export function buildBuyVoidSourceFinalityV7DeploymentReceiptV1(input:{
  process_source_commit:string;
  process_source_tree:string;
  accepted_enforcement_lock:Readonly<{
    accepted_enforcement_set_sha256:string;
    accepted_enforcement_lock_git_blob_sha1:string;
    accepted_enforcement_lock_sha256:string;
    accepted_enforcement_lock_id:string;
  }>;
}){
  const commit=String(input.process_source_commit||"").trim().toLowerCase();
  const tree=String(input.process_source_tree||"").trim().toLowerCase();
  assert.match(commit,SHA40,"process_source_commit_invalid");
  assert.match(tree,SHA40,"process_source_tree_invalid");
  const sources=inspectBuyVoidSourceFinalityReviewedSourceFilesV7();
  const lock=input.accepted_enforcement_lock;
  assert.match(lock.accepted_enforcement_set_sha256,SHA256,
    "accepted_enforcement_set_invalid");
  assert.match(lock.accepted_enforcement_lock_git_blob_sha1,SHA40,
    "accepted_enforcement_lock_git_blob_invalid");
  assert.match(lock.accepted_enforcement_lock_sha256,SHA256,
    "accepted_enforcement_lock_sha256_invalid");
  assert.equal(
    lock.accepted_enforcement_lock_id,
    buyVoidSourceFinalityEnforcementLockIdV7(lock),
    "accepted_enforcement_lock_id_invalid",
  );
  const body={
    accepted_enforcement_lock_git_blob_sha1:
      lock.accepted_enforcement_lock_git_blob_sha1,
    accepted_enforcement_lock_id:lock.accepted_enforcement_lock_id,
    accepted_enforcement_lock_sha256:lock.accepted_enforcement_lock_sha256,
    accepted_enforcement_set_sha256:lock.accepted_enforcement_set_sha256,
    candidate_enforcement_identity_accepted:true,
    complete_executable_closure_verified:true,
    marker:VOID_BUY_VOID_SOURCE_FINALITY_DEPLOYMENT_RECEIPT_V1,
    process_source_branch:"main",
    process_source_commit:commit,
    process_source_marker:"VOID_NODE_PROCESS_SOURCE_IDENTITY_V1",
    process_source_tree:tree,
    reviewed_source_file_count:sources.reviewed_source_file_count,
    reviewed_source_files_sha256:sources.reviewed_source_files_sha256,
    status:"DEPLOYED_SOURCE_FINALITY_GENERATION_ACCEPTED",
    version:1,
  };
  const receipt_id=buyVoidSourceFinalityDeploymentReceiptIdV7(body);
  const receipt=Object.freeze({...body,receipt_id});
  const bytes=Buffer.from(JSON.stringify(receipt,null,2)+"\n","utf8");
  assert.ok(bytes.length>0&&bytes.length<=64*1024,"receipt_size_invalid");
  return Object.freeze({
    receipt,
    bytes,
    reviewed_source_files_sha256:sources.reviewed_source_files_sha256,
    reviewed_source_file_count:sources.reviewed_source_file_count,
    receipt_id,
  });
}

function sameMetadataIdentityV1(a:fs.Stats,b:fs.Stats):boolean{
  return a.dev===b.dev&&a.ino===b.ino&&a.uid===b.uid&&a.gid===b.gid&&
    a.mode===b.mode&&a.nlink===b.nlink;
}

function validateRootAncestorsV1(absolute:string){
  let current=path.dirname(absolute);
  for(;;){
    const st=fs.lstatSync(current);
    assert.ok(st.isDirectory()&&!st.isSymbolicLink(),
      "receipt_ancestor_not_direct_directory:"+current);
    assert.equal(st.uid,0,"receipt_ancestor_not_root_owned:"+current);
    assert.equal(st.mode&0o022,0,"receipt_ancestor_group_or_world_writable:"+current);
    if(current==="/")break;
    const parent=path.dirname(current);
    assert.notEqual(parent,current,"receipt_ancestor_walk_stalled");
    current=parent;
  }
}

type ReceiptParentBindingV1=Readonly<{
  parent:string;
  parent_fd:number;
  parent_dev:number;
  parent_ino:number;
  parent_uid:number;
  parent_gid:number;
  parent_mode:number;
  grandparent:string;
  grandparent_fd:number;
  grandparent_dev:number;
  grandparent_ino:number;
  parent_via_fd:string;
}>;

function assertRootDirectoryV1(st:fs.Stats,label:string):void{
  assert.ok(st.isDirectory()&&!st.isSymbolicLink(),label+"_not_direct_directory");
  assert.equal(st.uid,0,label+"_not_root_owned");
  assert.equal(st.mode&0o022,0,label+"_group_or_world_writable");
}

function bindReceiptParentV1(absolute:string):ReceiptParentBindingV1{
  const parent=path.dirname(absolute);
  const grandparent=path.dirname(parent);
  const parentName=path.basename(parent);
  assert.match(parentName,/^[A-Za-z0-9._-]{1,120}$/u,"receipt_parent_name_invalid");

  validateRootAncestorsV1(path.join(grandparent,".void-receipt-parent-probe"));
  const grandVisible=fs.lstatSync(grandparent);
  assertRootDirectoryV1(grandVisible,"receipt_grandparent");
  const grandFd=fs.openSync(
    grandparent,
    fs.constants.O_RDONLY|fs.constants.O_DIRECTORY|fs.constants.O_NOFOLLOW,
  );
  let parentFd=-1;
  try{
    const grandOpened=fs.fstatSync(grandFd);
    assert.ok(sameMetadataIdentityV1(grandVisible,grandOpened),
      "receipt_grandparent_open_identity_mismatch");
    const parentViaFd="/proc/self/fd/"+String(grandFd)+"/"+parentName;
    let created=false;
    try{
      const existing=fs.lstatSync(parentViaFd);
      assertRootDirectoryV1(existing,"receipt_parent");
    }catch(error:any){
      if(error?.code!=="ENOENT")throw error;
      fs.mkdirSync(parentViaFd,{mode:0o755});
      created=true;
    }

    const visible=fs.lstatSync(parentViaFd);
    assertRootDirectoryV1(visible,"receipt_parent");
    parentFd=fs.openSync(
      parentViaFd,
      fs.constants.O_RDONLY|fs.constants.O_DIRECTORY|fs.constants.O_NOFOLLOW,
    );
    if(created){
      fs.fchownSync(parentFd,0,0);
      fs.fchmodSync(parentFd,0o755);
      fs.fsyncSync(parentFd);
      // Persist the new parent directory entry in the retained grandparent.
      fs.fsyncSync(grandFd);
    }
    const opened=fs.fstatSync(parentFd);
    assertRootDirectoryV1(opened,"receipt_parent");
    const visibleAfter=fs.lstatSync(parentViaFd);
    assert.ok(
      sameMetadataIdentityV1(opened,visibleAfter),
      "receipt_parent_open_identity_mismatch",
    );
    assert.equal(fs.realpathSync.native(parent),parent,
      "receipt_parent_not_canonical_direct_path");

    return Object.freeze({
      parent,
      parent_fd:parentFd,
      parent_dev:opened.dev,
      parent_ino:opened.ino,
      parent_uid:opened.uid,
      parent_gid:opened.gid,
      parent_mode:opened.mode,
      grandparent,
      grandparent_fd:grandFd,
      grandparent_dev:grandOpened.dev,
      grandparent_ino:grandOpened.ino,
      parent_via_fd:parentViaFd,
    });
  }catch(error){
    if(parentFd>=0)fs.closeSync(parentFd);
    fs.closeSync(grandFd);
    throw error;
  }
}

function assertReceiptParentStableV1(binding:ReceiptParentBindingV1):void{
  const parentOpened=fs.fstatSync(binding.parent_fd);
  assertRootDirectoryV1(parentOpened,"receipt_parent");
  assert.equal(parentOpened.dev,binding.parent_dev,"receipt_parent_device_changed");
  assert.equal(parentOpened.ino,binding.parent_ino,"receipt_parent_inode_changed");
  assert.equal(parentOpened.uid,binding.parent_uid,"receipt_parent_owner_changed");
  assert.equal(parentOpened.gid,binding.parent_gid,"receipt_parent_group_changed");
  assert.equal(parentOpened.mode,binding.parent_mode,"receipt_parent_mode_changed");

  const parentVisible=fs.lstatSync(binding.parent_via_fd);
  assert.ok(
    sameMetadataIdentityV1(parentOpened,parentVisible),
    "receipt_parent_visible_identity_changed",
  );
  const canonicalVisible=fs.lstatSync(binding.parent);
  assert.ok(
    sameMetadataIdentityV1(parentOpened,canonicalVisible),
    "receipt_parent_canonical_identity_changed",
  );
  assert.equal(fs.realpathSync.native(binding.parent),binding.parent,
    "receipt_parent_canonical_path_changed");

  const grandOpened=fs.fstatSync(binding.grandparent_fd);
  assertRootDirectoryV1(grandOpened,"receipt_grandparent");
  assert.equal(grandOpened.dev,binding.grandparent_dev,
    "receipt_grandparent_device_changed");
  assert.equal(grandOpened.ino,binding.grandparent_ino,
    "receipt_grandparent_inode_changed");
}

function closeReceiptParentV1(binding:ReceiptParentBindingV1|undefined):void{
  if(!binding)return;
  fs.closeSync(binding.parent_fd);
  fs.closeSync(binding.grandparent_fd);
}

function finalViaParentV1(binding:ReceiptParentBindingV1,leaf:string):string{
  return "/proc/self/fd/"+String(binding.parent_fd)+"/"+leaf;
}

function verifyFinalBoundV1(
  binding:ReceiptParentBindingV1,
  leaf:string,
  expected:Buffer,
):void{
  assertReceiptParentStableV1(binding);
  const absolute=finalViaParentV1(binding,leaf);
  const visible=fs.lstatSync(absolute);
  assert.ok(visible.isFile()&&!visible.isSymbolicLink(),"receipt_leaf_not_regular");
  assert.equal(visible.uid,0,"receipt_leaf_not_root_owned");
  assert.equal(visible.nlink,1,"receipt_leaf_link_count_invalid");
  assert.equal(visible.mode&0o777,0o444,"receipt_leaf_mode_invalid");
  const fd=fs.openSync(absolute,fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW);
  try{
    const before=fs.fstatSync(fd);
    assert.ok(sameMetadataIdentityV1(visible,before),
      "receipt_leaf_open_identity_mismatch");
    const got=fs.readFileSync(fd);
    const after=fs.fstatSync(fd);
    const visibleAfter=fs.lstatSync(absolute);
    assert.ok(
      sameMetadataIdentityV1(before,after)&&
      sameMetadataIdentityV1(after,visibleAfter)&&
      before.size===after.size&&after.size===visibleAfter.size&&
      before.mtimeMs===after.mtimeMs&&after.mtimeMs===visibleAfter.mtimeMs&&
      before.ctimeMs===after.ctimeMs&&after.ctimeMs===visibleAfter.ctimeMs,
      "receipt_leaf_changed_during_read",
    );
    assert.ok(got.equals(expected),"receipt_leaf_bytes_mismatch");
  }finally{
    fs.closeSync(fd);
  }
  assertReceiptParentStableV1(binding);
}

export function installRootCustodiedReceiptV1(input:{
  absolute_path:string;
  bytes:Buffer;
}):Readonly<{created:boolean;already_matching:boolean}>{
  if(process.platform!=="linux")throw Error("linux_required");
  if(typeof process.getuid!=="function"||process.getuid()!==0)
    throw Error("root_required_for_deployment_receipt_install");
  const absolute=path.resolve(input.absolute_path);
  assert.equal(absolute,input.absolute_path,"receipt_path_not_canonical");
  assert.ok(path.isAbsolute(absolute),"receipt_path_not_absolute");
  assert.ok(Buffer.isBuffer(input.bytes)&&input.bytes.length>0&&
    input.bytes.length<=64*1024,"receipt_bytes_invalid");

  const leaf=path.basename(absolute);
  assert.match(leaf,/^[A-Za-z0-9._-]{3,120}$/u,"receipt_leaf_name_invalid");
  let binding:ReceiptParentBindingV1|undefined;
  let tempFd=-1;
  let tempCreatedIdentity:Readonly<{dev:number;ino:number}>|undefined;
  let tempIdentity:fs.Stats|undefined;
  let tempVia="";
  try{
    binding=bindReceiptParentV1(absolute);
    assertReceiptParentStableV1(binding);
    const finalVia=finalViaParentV1(binding,leaf);
    try{
      fs.lstatSync(finalVia);
      verifyFinalBoundV1(binding,leaf,input.bytes);
      return Object.freeze({created:false,already_matching:true});
    }catch(error:any){
      if(error?.code!=="ENOENT")throw error;
    }

    const tempName="."+leaf+".tmp-"+String(process.pid)+"-"+String(Date.now());
    tempVia=finalViaParentV1(binding,tempName);
    tempFd=fs.openSync(
      tempVia,
      fs.constants.O_WRONLY|fs.constants.O_CREAT|fs.constants.O_EXCL|
        fs.constants.O_NOFOLLOW,
      0o600,
    );
    const justCreated=fs.fstatSync(tempFd);
    tempCreatedIdentity=Object.freeze({
      dev:justCreated.dev,
      ino:justCreated.ino,
    });
    fs.fchownSync(tempFd,0,0);
    let offset=0;
    while(offset<input.bytes.length){
      const written=fs.writeSync(
        tempFd,input.bytes,offset,input.bytes.length-offset,offset,
      );
      assert.ok(written>0,"receipt_short_write");
      offset+=written;
    }
    fs.fsyncSync(tempFd);
    fs.fchmodSync(tempFd,0o444);
    fs.fsyncSync(tempFd);
    tempIdentity=fs.fstatSync(tempFd);
    assert.ok(
      tempCreatedIdentity&&
      tempIdentity.dev===tempCreatedIdentity.dev&&
      tempIdentity.ino===tempCreatedIdentity.ino,
      "receipt_temp_descriptor_identity_changed",
    );
    const tempVisible=fs.lstatSync(tempVia);
    assert.ok(
      sameMetadataIdentityV1(tempIdentity,tempVisible),
      "receipt_temp_identity_changed",
    );
    assertReceiptParentStableV1(binding);

    try{
      fs.linkSync(tempVia,finalVia);
    }catch(error:any){
      if(error?.code!=="EEXIST")throw error;
      verifyFinalBoundV1(binding,leaf,input.bytes);
      const currentTemp=fs.lstatSync(tempVia);
      if(tempIdentity&&sameMetadataIdentityV1(tempIdentity,currentTemp)){
        fs.unlinkSync(tempVia);
      }
      fs.fsyncSync(binding.parent_fd);
      return Object.freeze({created:false,already_matching:true});
    }

    const published=fs.lstatSync(finalVia);
    assert.ok(
      tempIdentity&&published.dev===tempIdentity.dev&&published.ino===tempIdentity.ino,
      "receipt_published_identity_mismatch",
    );
    const currentTemp=fs.lstatSync(tempVia);
    assert.ok(
      tempIdentity&&currentTemp.dev===tempIdentity.dev&&currentTemp.ino===tempIdentity.ino,
      "receipt_temp_identity_changed_before_cleanup",
    );
    fs.unlinkSync(tempVia);
    fs.fsyncSync(binding.parent_fd);
    verifyFinalBoundV1(binding,leaf,input.bytes);
    return Object.freeze({created:true,already_matching:false});
  }finally{
    if(tempFd>=0)fs.closeSync(tempFd);
    if(binding&&tempCreatedIdentity&&tempVia){
      try{
        const visible=fs.lstatSync(tempVia);
        if(
          visible.dev===tempCreatedIdentity.dev&&
          visible.ino===tempCreatedIdentity.ino
        ){
          fs.unlinkSync(tempVia);
          fs.fsyncSync(binding.parent_fd);
        }
      }catch(error:any){
        if(error?.code!=="ENOENT"){void error;}
      }
    }
    closeReceiptParentV1(binding);
  }
}

function parseArgs(argv:string[]){
  const out={
    mode:"" as "--plan"|"--apply"|"",
    expected_commit:"",
    expected_tree:"",
    receipt_path:DEFAULT_RECEIPT_PATH,
    accepted_enforcement_lock_path:"",
    confirm:false,
  };
  for(let i=0;i<argv.length;i+=1){
    const a=argv[i];
    if(a==="--plan"||a==="--apply")out.mode=a;
    else if(a==="--expected-commit")out.expected_commit=String(argv[++i]||"");
    else if(a==="--expected-tree")out.expected_tree=String(argv[++i]||"");
    else if(a==="--receipt-path")out.receipt_path=String(argv[++i]||"");
    else if(a==="--accepted-enforcement-lock-path")
      out.accepted_enforcement_lock_path=String(argv[++i]||"");
    else if(a==="--confirm-create-v7-deployment-receipt")out.confirm=true;
    else throw Error("unknown_argument:"+a);
  }
  assert.ok(out.mode,"mode_required");
  assert.match(out.expected_commit,SHA40,"expected_commit_required");
  assert.match(out.expected_tree,SHA40,"expected_tree_required");
  assert.match(out.accepted_enforcement_lock_path,SAFE_LOCK_PATH,
    "accepted_enforcement_lock_path_required");
  return out;
}

function main(){
  const args=parseArgs(process.argv.slice(2));
  const repo=inspectRepositoryIdentityV1();
  assert.equal(repo.commit,args.expected_commit,"expected_commit_mismatch");
  assert.equal(repo.tree,args.expected_tree,"expected_tree_mismatch");
  const acceptedLock=inspectAcceptedEnforcementLockV1(
    args.accepted_enforcement_lock_path,
  );
  const built=buildBuyVoidSourceFinalityV7DeploymentReceiptV1({
    process_source_commit:repo.commit,
    process_source_tree:repo.tree,
    accepted_enforcement_lock:acceptedLock,
  });

  console.log("marker="+MARKER);
  console.log("mode="+args.mode);
  console.log("source_mutation=false");
  console.log("service_mutation=false");
  console.log("credential_access=false");
  console.log("wallet_access=false");
  console.log("signing=false");
  console.log("transaction_broadcast=false");
  console.log("chain2050_mutation=false");
  console.log("presale_activation=false");
  console.log("funds_movement=false");
  console.log("process_source_commit="+repo.commit);
  console.log("process_source_tree="+repo.tree);
  console.log("reviewed_source_file_count="+built.reviewed_source_file_count);
  console.log("reviewed_source_files_sha256="+built.reviewed_source_files_sha256);
  console.log("accepted_enforcement_lock_path="+acceptedLock.path);
  console.log("accepted_enforcement_lock_id="+
    acceptedLock.accepted_enforcement_lock_id);
  console.log("accepted_enforcement_lock_git_blob_sha1="+
    acceptedLock.accepted_enforcement_lock_git_blob_sha1);
  console.log("accepted_enforcement_lock_sha256="+
    acceptedLock.accepted_enforcement_lock_sha256);
  console.log("accepted_enforcement_set_sha256="+
    acceptedLock.accepted_enforcement_set_sha256);
  console.log("receipt_id="+built.receipt_id);
  console.log("receipt_path="+args.receipt_path);

  if(args.mode==="--plan"){
    console.log("filesystem_mutation=false");
    console.log("status=PLAN_GREEN");
    return;
  }
  if(!args.confirm)throw Error("explicit_receipt_create_confirmation_required");
  assert.equal(path.resolve(args.receipt_path),DEFAULT_RECEIPT_PATH,
    "production_receipt_path_must_be_default");
  const result=installRootCustodiedReceiptV1({
    absolute_path:DEFAULT_RECEIPT_PATH,
    bytes:built.bytes,
  });
  console.log("filesystem_mutation="+String(result.created));
  console.log("receipt_created="+String(result.created));
  console.log("receipt_already_matching="+String(result.already_matching));
  console.log("status=DEPLOYMENT_RECEIPT_INSTALLED_GREEN");
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{main();}catch(error:any){
    console.error("marker="+MARKER+"_HOLD");
    console.error("reason="+String(error?.message||error));
    process.exitCode=2;
  }
}
