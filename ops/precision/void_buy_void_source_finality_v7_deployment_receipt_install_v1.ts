#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  VOID_BUY_VOID_SOURCE_FINALITY_ACCEPTED_ENFORCEMENT_SET_V7,
  VOID_BUY_VOID_SOURCE_FINALITY_DEPLOYMENT_RECEIPT_V1,
  buyVoidSourceFinalityDeploymentReceiptIdV7,
  inspectBuyVoidSourceFinalityReviewedSourceFilesV7,
} from "../../src/economic/buy_void_source_finality_generation_provenance_v7.js";

export const MARKER =
  "VOID_BUY_VOID_SOURCE_FINALITY_V7_DEPLOYMENT_RECEIPT_INSTALL_V1";
export const DEFAULT_RECEIPT_PATH =
  "/var/lib/void-source-finality-v7/deployment-receipt.json";
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const SHA40=/^[0-9a-f]{40}$/u;

function git(args:string[]):string{
  return execFileSync("/usr/bin/git",["-C",ROOT,...args],{
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
    },
  }).trim();
}

export function inspectRepositoryIdentityV1(){
  const commit=git(["rev-parse","--verify","HEAD^{commit}"]).toLowerCase();
  const tree=git(["rev-parse","--verify","HEAD^{tree}"]).toLowerCase();
  const branch=git(["symbolic-ref","--short","-q","HEAD"]);
  const status=git(["status","--porcelain=v1"]);
  assert.match(commit,SHA40,"repository_commit_invalid");
  assert.match(tree,SHA40,"repository_tree_invalid");
  assert.equal(branch,"main","repository_branch_not_main");
  assert.equal(status,"","repository_not_clean");
  return Object.freeze({commit,tree,branch:"main" as const});
}

export function buildBuyVoidSourceFinalityV7DeploymentReceiptV1(input:{
  process_source_commit:string;
  process_source_tree:string;
}){
  const commit=String(input.process_source_commit||"").trim().toLowerCase();
  const tree=String(input.process_source_tree||"").trim().toLowerCase();
  assert.match(commit,SHA40,"process_source_commit_invalid");
  assert.match(tree,SHA40,"process_source_tree_invalid");
  const sources=inspectBuyVoidSourceFinalityReviewedSourceFilesV7();
  const body={
    accepted_enforcement_set_sha256:
      VOID_BUY_VOID_SOURCE_FINALITY_ACCEPTED_ENFORCEMENT_SET_V7,
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

function verifyFinalV1(absolute:string,expected:Buffer){
  const st=fs.lstatSync(absolute);
  assert.ok(st.isFile()&&!st.isSymbolicLink(),"receipt_leaf_not_regular");
  assert.equal(st.uid,0,"receipt_leaf_not_root_owned");
  assert.equal(st.nlink,1,"receipt_leaf_link_count_invalid");
  assert.equal(st.mode&0o777,0o444,"receipt_leaf_mode_invalid");
  const got=fs.readFileSync(absolute);
  assert.ok(got.equals(expected),"receipt_leaf_bytes_mismatch");
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

  const parent=path.dirname(absolute);
  fs.mkdirSync(parent,{recursive:true,mode:0o755});
  fs.chownSync(parent,0,0);
  fs.chmodSync(parent,0o755);
  validateRootAncestorsV1(absolute);

  if(fs.existsSync(absolute)){
    verifyFinalV1(absolute,input.bytes);
    return Object.freeze({created:false,already_matching:true});
  }

  const leaf=path.basename(absolute);
  assert.match(leaf,/^[A-Za-z0-9._-]{3,120}$/u,"receipt_leaf_name_invalid");
  const temp=path.join(parent,
    "."+leaf+".tmp-"+String(process.pid)+"-"+String(Date.now()));
  let fd=-1;
  try{
    fd=fs.openSync(temp,
      fs.constants.O_WRONLY|fs.constants.O_CREAT|fs.constants.O_EXCL|
        fs.constants.O_NOFOLLOW,
      0o600);
    let offset=0;
    while(offset<input.bytes.length){
      const written=fs.writeSync(fd,input.bytes,offset,input.bytes.length-offset,offset);
      assert.ok(written>0,"receipt_short_write");
      offset+=written;
    }
    fs.fsyncSync(fd);
    fs.fchmodSync(fd,0o444);
    fs.fsyncSync(fd);
    fs.closeSync(fd); fd=-1;

    try{
      fs.linkSync(temp,absolute);
    }catch(error:any){
      if(error?.code!=="EEXIST")throw error;
      verifyFinalV1(absolute,input.bytes);
      fs.unlinkSync(temp);
      const dirFd=fs.openSync(parent,fs.constants.O_RDONLY|fs.constants.O_DIRECTORY);
      try{fs.fsyncSync(dirFd);}finally{fs.closeSync(dirFd);}
      return Object.freeze({created:false,already_matching:true});
    }
    fs.unlinkSync(temp);
    const dirFd=fs.openSync(parent,fs.constants.O_RDONLY|fs.constants.O_DIRECTORY);
    try{fs.fsyncSync(dirFd);}finally{fs.closeSync(dirFd);}
    verifyFinalV1(absolute,input.bytes);
    return Object.freeze({created:true,already_matching:false});
  }finally{
    if(fd>=0)fs.closeSync(fd);
    if(fs.existsSync(temp))fs.unlinkSync(temp);
  }
}

function parseArgs(argv:string[]){
  const out={
    mode:"" as "--plan"|"--apply"|"",
    expected_commit:"",
    expected_tree:"",
    receipt_path:DEFAULT_RECEIPT_PATH,
    confirm:false,
  };
  for(let i=0;i<argv.length;i+=1){
    const a=argv[i];
    if(a==="--plan"||a==="--apply")out.mode=a;
    else if(a==="--expected-commit")out.expected_commit=String(argv[++i]||"");
    else if(a==="--expected-tree")out.expected_tree=String(argv[++i]||"");
    else if(a==="--receipt-path")out.receipt_path=String(argv[++i]||"");
    else if(a==="--confirm-create-v7-deployment-receipt")out.confirm=true;
    else throw Error("unknown_argument:"+a);
  }
  assert.ok(out.mode,"mode_required");
  assert.match(out.expected_commit,SHA40,"expected_commit_required");
  assert.match(out.expected_tree,SHA40,"expected_tree_required");
  return out;
}

function main(){
  const args=parseArgs(process.argv.slice(2));
  const repo=inspectRepositoryIdentityV1();
  assert.equal(repo.commit,args.expected_commit,"expected_commit_mismatch");
  assert.equal(repo.tree,args.expected_tree,"expected_tree_mismatch");
  const built=buildBuyVoidSourceFinalityV7DeploymentReceiptV1({
    process_source_commit:repo.commit,
    process_source_tree:repo.tree,
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
  console.log("accepted_enforcement_set_sha256="+
    VOID_BUY_VOID_SOURCE_FINALITY_ACCEPTED_ENFORCEMENT_SET_V7);
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
