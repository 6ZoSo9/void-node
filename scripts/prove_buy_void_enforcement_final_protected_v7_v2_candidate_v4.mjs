#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import {spawnSync} from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const BASE="0344d7dab153be75716646d5c6f5162f926f25ee";
const PARENT_TREE="0743c236a1d2788d17b9e3ae2ecde37319df0809";
const SELF="scripts/prove_buy_void_enforcement_final_protected_v7_v2_candidate_v4.mjs";
const CANDIDATE="ops/security/buy-void-enforcement-final-protected-v7-v2-candidate-v4.json";
const DOC="docs/architecture/buy-void-enforcement-final-protected-v7-v2-deployment-successor-v4.md";
const DISPATCH_V4="scripts/prove_buy_void_repaired_v7_v2_current_generation_dispatch_v4.mjs";
const DISPATCH_V4_DOC="docs/architecture/buy-void-repaired-v7-v2-current-generation-dispatch-v4.md";
const TOOL="ops/precision/void_buy_void_source_finality_v7_deployment_receipt_install_v1.ts";
const TOOL_OLD="3de6e4bd1f9aa2e9c0a0889cc7c0ab489cb306c0";
const TOOL_NEW="e0a682ea4038ca22e3a3b97da2cac29874096c46";
const TOOL_PROOF="scripts/prove_buy_void_source_finality_v7_deployment_receipt_install_v1.ts";
const TOOL_PROOF_BLOB="e634e666d3a190368ddb031f936ebbb6347b7196";
const DISPATCH_V3="scripts/prove_buy_void_repaired_v7_v2_current_generation_dispatch_v3.mjs";
const DISPATCH_V3_BLOB="fba37e94a90b3d4278fd3fba10fbe6313f2f0625";
const V3_CANDIDATE="ops/security/buy-void-enforcement-final-protected-v7-v2-candidate-v3.json";
const V3_CANDIDATE_BLOB="79998af4763b6afca84ffe4e8d14d9a6ff535dfd";
const V3_CANDIDATE_SHA="df3b5b74e0d1cd0f3198d8f0a5190d392518480804155ad848cd43b6eae6cbf6";
const V3_CANDIDATE_SET="95a11602e5f2639d33b378293b92863ea7f9f37020ad18dec49d3d4ac6289fd4";
const V3_INV="c0a56b378215feafacc089e9f59a9f966d57f11e5582e4a13afcd6351d2447bb";
const V3_CANDIDATE_PROOF="scripts/prove_buy_void_enforcement_final_protected_v7_v2_candidate_v3.mjs";
const V3_CANDIDATE_PROOF_BLOB="8ea7786299422f7fc3fbfd7474b5e92d869e92c2";
const V3_LOCK="ops/security/buy-void-enforcement-final-protected-v7-v2-lock-v3.json";
const V3_LOCK_BLOB="245ce93ebfb53478211fab765489e88d8fa23c4a";
const V3_LOCK_PROOF="scripts/prove_buy_void_enforcement_final_protected_v7_v2_lock_v3.mjs";
const V3_LOCK_PROOF_BLOB="0a2293c624b698062fb2fe3ba07b95d632eaa9ab";
const INV="8485ef25c236b8798bed3a67b9308ef7dcd383aedca1486f4f488d043d7efbe0";
const SET="ff084a754e7eb6bef08ec1b1079a17a6110b4333876f0231e46395eed63042d2";
const CANDIDATE_SHA="bf360784af7a6ddf908812b9c335e8e52d4410ba249c5ea1988b97d9cfd5a72c";
const CANDIDATE_BLOB="5893e300a78dc4ca7729ef47f95a8e3eea2043cf";
const CANDIDATE_BYTES=17788;
const EXPECTED_DELTA=Object.freeze([["M",".github/workflows/buy-void-delivery-dependency-provider-closure-post2865-lock-v1.yml"],["M",".github/workflows/buy-void-enforcement-final-protected-v7-v2-candidate-v1.yml"],["M",".github/workflows/buy-void-enforcement-final-protected-v7-v2-candidate-v2.yml"],["M",".github/workflows/buy-void-enforcement-final-v7-artifact-census-v4.yml"],["M",".github/workflows/buy-void-source-finality-v7-deployment-receipt-v3-lock-plan-v1.yml"],["M",".github/workflows/buy-void-source-finality-v7-executable-delta-candidate-v1.yml"],["A","docs/architecture/buy-void-repaired-v7-v2-current-generation-dispatch-v4.md"],["A","docs/architecture/buy-void-enforcement-final-protected-v7-v2-deployment-successor-v4.md"],["A","ops/security/buy-void-enforcement-final-protected-v7-v2-candidate-v4.json"],["A","scripts/prove_buy_void_enforcement_final_protected_v7_v2_candidate_v4.mjs"],["A","scripts/prove_buy_void_repaired_v7_v2_current_generation_dispatch_v4.mjs"]]);
const STAT_FIELDS=Object.freeze(["dev","ino","mode","nlink","uid","gid","rdev","size","mtimeMs","ctimeMs"]);

const sha=b=>crypto.createHash("sha256").update(b).digest("hex");
const blob=b=>crypto.createHash("sha1").update(Buffer.from("blob "+b.length+"\0")).update(b).digest("hex");
function canonical(v){
  if(v===null||typeof v==="boolean"||typeof v==="string")return JSON.stringify(v);
  if(typeof v==="number"){assert.ok(Number.isSafeInteger(v));return String(v);}
  if(Array.isArray(v))return "["+v.map(canonical).join(",")+"]";
  assert.ok(v&&typeof v==="object"&&!Array.isArray(v));
  return "{"+Object.keys(v).sort().map(k=>JSON.stringify(k)+":"+canonical(v[k])).join(",")+"}";
}
function run(command,args,{timeout=180000,allowFail=false}={}){
  const r=spawnSync(command,args,{
    cwd:ROOT,encoding:null,stdio:["ignore","pipe","pipe"],timeout,maxBuffer:32*1024*1024,
    env:{PATH:"/usr/bin:/bin",HOME:"/nonexistent",LANG:"C",LC_ALL:"C",TZ:"UTC",
      NODE_ENV:"test",GIT_CONFIG_NOSYSTEM:"1",GIT_CONFIG_GLOBAL:"/dev/null",
      GIT_CONFIG_SYSTEM:"/dev/null",GIT_NO_REPLACE_OBJECTS:"1",
      GIT_OPTIONAL_LOCKS:"0",GIT_TERMINAL_PROMPT:"0"}
  });
  assert.equal(r.error,undefined,String(r.error||""));
  if(!allowFail)assert.equal(r.status,0,String(r.stderr||r.stdout||""));
  return r;
}
const git=args=>String(run("/usr/bin/git",["--no-replace-objects","-C",ROOT,...args],{timeout:30000}).stdout||"").trim();
function sameStat(actual,expected,label){
  for(const key of STAT_FIELDS)assert.equal(actual[key],expected[key],label+":"+key);
}
function inspectExactAt(root,relative,max,{beforeOpen=null,afterOpen=null}={}){
  assert.equal(path.isAbsolute(relative),false,"absolute_path:"+relative);
  assert.equal(relative.split("/").some(part=>!part||part==="."||part===".."),false,"unsafe_path:"+relative);
  assert.ok(Number.isSafeInteger(max)&&max>0&&max<Number.MAX_SAFE_INTEGER,"invalid_max:"+relative);
  const absolute=path.join(root,...relative.split("/"));
  const before=fs.lstatSync(absolute);
  assert.ok(before.isFile()&&!before.isSymbolicLink()&&before.nlink===1&&before.size>0&&before.size<=max,
    "invalid_file:"+relative);
  if(beforeOpen)beforeOpen(absolute,before);
  assert.equal(typeof fs.constants.O_NOFOLLOW,"number","nofollow_unavailable");
  assert.equal(typeof fs.constants.O_NONBLOCK,"number","nonblock_unavailable");
  let fd=-1;
  try{
    fd=fs.openSync(absolute,fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW|fs.constants.O_NONBLOCK);
    const opened=fs.fstatSync(fd);
    assert.ok(opened.isFile()&&opened.nlink===1&&opened.size>0&&opened.size<=max,
      "invalid_opened_file:"+relative);
    sameStat(opened,before,"file_open_generation_mismatch:"+relative);
    if(afterOpen)afterOpen(absolute,opened,fd);
    const chunks=[];const scratch=Buffer.alloc(Math.min(64*1024,max+1));let total=0;
    while(total<=max){
      const want=Math.min(scratch.length,max+1-total);
      if(want===0)break;
      const n=fs.readSync(fd,scratch,0,want,null);
      if(n===0)break;
      chunks.push(Buffer.from(scratch.subarray(0,n)));total+=n;
    }
    assert.ok(total<=max,"file_size_limit:"+relative);
    assert.equal(total,opened.size,"short_or_grown_read:"+relative);
    sameStat(fs.fstatSync(fd),opened,"file_descriptor_generation_changed:"+relative);
    sameStat(fs.lstatSync(absolute),opened,"file_visible_generation_changed:"+relative);
    return {bytes:Buffer.concat(chunks,total),stat:opened};
  }finally{if(fd>=0)fs.closeSync(fd);}
}
function readExactAt(root,relative,max,options={}){return inspectExactAt(root,relative,max,options).bytes;}
const read=(relative,max=4*1024*1024)=>readExactAt(ROOT,relative,max);
function pin(relative,expected,max=4*1024*1024){
  const b=read(relative,max);
  assert.equal(blob(b),expected,"blob:"+relative);
  assert.equal(git(["rev-parse","HEAD:"+relative]),expected,"head:"+relative);
  return b;
}
function treeMode(relative){
  const entry=git(["ls-tree","HEAD","--",relative]);
  const m=entry.match(/^(100644|100755) blob ([0-9a-f]{40})\t(.+)$/u);
  assert.ok(m&&m[3]===relative,"tree_entry_invalid:"+relative);
  return m[1];
}
function currentRows(oldRows){
  assert.ok(Array.isArray(oldRows)&&oldRows.length===49,"v3_inventory_count");
  return oldRows.map(old=>{
    assert.ok(old&&typeof old==="object"&&!Array.isArray(old));
    assert.match(old.path,/^[A-Za-z0-9._/-]+$/u);
    const observed=inspectExactAt(ROOT,old.path,16*1024*1024);
    const bytes=observed.bytes;
    const head=git(["rev-parse","HEAD:"+old.path]);
    assert.equal(blob(bytes),head,"worktree_head_blob_mismatch:"+old.path);
    const mode=treeMode(old.path);
    const visibleMode=(observed.stat.mode&0o111)!==0?"100755":"100644";
    assert.equal(visibleMode,mode,"worktree_tree_mode_mismatch:"+old.path);
    return {path:old.path,git_blob_sha1:head,git_mode:mode};
  });
}
function transition(){
  return {
    predecessor_candidate_path:V3_CANDIDATE,
    predecessor_candidate_git_blob_sha1:V3_CANDIDATE_BLOB,
    predecessor_lock_path:V3_LOCK,
    predecessor_lock_git_blob_sha1:V3_LOCK_BLOB,
    dispatch_v3_proof_path:DISPATCH_V3,
    dispatch_v3_proof_git_blob_sha1:DISPATCH_V3_BLOB,
    frozen_protected_inventory_sha256:V3_INV,
    current_protected_inventory_sha256:INV,
    reviewed_protected_drift_count:1,
    reviewed_deployment_reader_successor_bound:true,
    workflow_dispatch_contracts_bound:true,
    production_tracked_file_nonblocking:true,
    production_tracked_file_fifo_swap_rejected:true,
    frozen_v4_census_proof_preserved:true,
    nonprotected_economic_drift_count:3,
    predecessor_tool_git_blob_sha1:TOOL_OLD,
    current_tool_git_blob_sha1:TOOL_NEW,
    predecessor_candidate_preserved:true,
    predecessor_lock_preserved:true,
    current_candidate_rederived:true,
  };
}
function derive(){
  assert.equal(git(["rev-parse","HEAD^{tree}"]).length,40);
  run("/usr/bin/git",["--no-replace-objects","-C",ROOT,"merge-base","--is-ancestor",BASE,"HEAD"],{timeout:30000});
  assert.equal(git(["rev-parse",BASE+"^{tree}"]),PARENT_TREE,"parent_tree_drift");
  const rows=git(["diff","--name-status",BASE,"--"]).split("\n").filter(Boolean)
    .map(line=>{const [status,...rest]=line.split("\t");return [status,rest.join("\t")];})
    .sort((a,b)=>a[1].localeCompare(b[1]));
  assert.deepEqual(rows,[...EXPECTED_DELTA].sort((a,b)=>a[1].localeCompare(b[1])),"candidate_v4_delta_scope");

  pin(TOOL,TOOL_NEW,512*1024);
  const toolProof=pin(TOOL_PROOF,TOOL_PROOF_BLOB,512*1024).toString("utf8");
  const dispatchV3=pin(DISPATCH_V3,DISPATCH_V3_BLOB,4*1024*1024).toString("utf8");
  pin(V3_CANDIDATE_PROOF,V3_CANDIDATE_PROOF_BLOB,512*1024);
  pin(V3_LOCK_PROOF,V3_LOCK_PROOF_BLOB,512*1024);
  const v3Bytes=pin(V3_CANDIDATE,V3_CANDIDATE_BLOB,128*1024);
  assert.equal(sha(v3Bytes),V3_CANDIDATE_SHA);
  const v3=JSON.parse(v3Bytes);
  assert.equal(v3.candidate_enforcement_set_sha256,V3_CANDIDATE_SET);
  assert.equal(v3.current_enforcement_tracked_source_inventory_sha256,V3_INV);
  const lock=JSON.parse(pin(V3_LOCK,V3_LOCK_BLOB,128*1024));
  assert.equal(lock.candidate_evidence?.git_blob_sha1,V3_CANDIDATE_BLOB);
  assert.equal(lock.candidate_enforcement_identity_accepted,true);
  assert.equal(lock.production_source_finality_authority_ready,false);

  for(const token of [
    "readTrackedFileV1,","proveProductionTrackedFileReadBoundaryV1",
    "production_tracked_file_descriptor_bound=true",
    "production_tracked_file_nonblocking=true",
    "production_tracked_file_fifo_swap_rejected=true",
    "current_enforcement_inventory_uses_bounded_descriptor=true",
  ])assert.ok(toolProof.includes(token),"production_proof_token_missing:"+token);
  for(const token of [
    'schema:"void_buy_void_repaired_v7_v2_current_generation_dispatch_v3"',
    "reviewed_deployment_reader_successor_bound:true",
    "workflow_dispatch_contracts_bound:true",
    "production_tracked_file_nonblocking:true",
    "production_tracked_file_fifo_swap_rejected:true",
    "frozen_v4_census_proof_preserved:true",
    "nonprotected_economic_drift_count:NONPROTECTED_ECONOMIC_DRIFT.length",
  ])assert.ok(dispatchV3.includes(token),"dispatch_v3_contract_token_missing:"+token);

  const current=currentRows(v3.current_enforcement_tracked_source_inventory_v1);
  let drift=0;
  for(let i=0;i<current.length;i++){
    const before=v3.current_enforcement_tracked_source_inventory_v1[i];
    const after=current[i];
    assert.equal(after.path,before.path);
    assert.equal(after.git_mode,before.git_mode);
    if(after.git_blob_sha1!==before.git_blob_sha1){
      drift++;
      assert.equal(after.path,TOOL);
      assert.equal(before.git_blob_sha1,TOOL_OLD);
      assert.equal(after.git_blob_sha1,TOOL_NEW);
    }
  }
  assert.equal(drift,1,"reviewed_protected_drift_count");
  assert.equal(sha(Buffer.from(canonical(current),"utf8")),INV,"v4_inventory_digest");

  const b={...v3,
    schema:"void_buy_void_enforcement_final_protected_v7_v2_candidate_v4",
    marker:"VOID_BUY_VOID_ENFORCEMENT_FINAL_PROTECTED_V7_V2_CANDIDATE_V4",
    version:4,
    current_enforcement_parent:BASE,
    current_enforcement_tracked_source_inventory_v1:current,
    current_enforcement_tracked_source_inventory_count:49,
    current_enforcement_tracked_source_inventory_sha256:INV,
    current_enforcement_tracked_source_inventory_verified:true,
    current_enforcement_parent_path_identity_preserved:true,
    candidate_enforcement_identity_accepted:false,
    deployed_artifact_generation_verified:false,
    runtime_mount_authority:false,
    production_source_finality_authority_ready:false,
    public_presale_activation:false,
    funds_movement:false,
    successor_transition:transition(),
  };
  delete b.candidate_enforcement_set_sha256;
  return {...b,candidate_enforcement_set_sha256:sha(Buffer.from(canonical(b),"utf8"))};
}
function exact(){
  const candidate=derive();
  const bytes=Buffer.from(JSON.stringify(candidate,null,2)+"\n");
  assert.equal(bytes.length,CANDIDATE_BYTES,"candidate_bytes");
  assert.equal(sha(bytes),CANDIDATE_SHA,"candidate_sha256");
  assert.equal(blob(bytes),CANDIDATE_BLOB,"candidate_blob");
  assert.equal(candidate.candidate_enforcement_set_sha256,SET,"candidate_set");
  return bytes;
}
function proveReaderBoundary(){
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),"void-v4-candidate-reader-"));
  try{
    const dep=path.join(temp,"dep");
    fs.writeFileSync(dep,"good",{mode:0o600});
    assert.equal(readExactAt(temp,"dep",8).toString("utf8"),"good");
    assert.throws(()=>readExactAt(temp,"dep",8,{beforeOpen:absolute=>{
      fs.renameSync(absolute,absolute+".old");
      fs.writeFileSync(absolute,"evil",{mode:0o600});
    }}),/file_open_generation_mismatch:dep/u);
    fs.rmSync(dep,{force:true});
    const target=path.join(temp,"target");fs.writeFileSync(target,"good",{mode:0o600});
    fs.symlinkSync("target",dep);
    assert.throws(()=>readExactAt(temp,"dep",8),/invalid_file:dep/u);
    fs.rmSync(dep,{force:true});fs.writeFileSync(dep,"good",{mode:0o600});
    assert.throws(()=>readExactAt(temp,"dep",8,{beforeOpen:absolute=>{
      fs.renameSync(absolute,absolute+".symlink-original");fs.symlinkSync("target",absolute);
    }}),err=>err&&err.code==="ELOOP");
    fs.rmSync(dep,{force:true});fs.writeFileSync(dep,"good",{mode:0o600});
    assert.throws(()=>readExactAt(temp,"dep",8,{beforeOpen:absolute=>{
      fs.renameSync(absolute,absolute+".fifo-original");
      run("/usr/bin/mkfifo",[absolute],{timeout:5000});fs.chmodSync(absolute,0o600);
    }}),/invalid_opened_file:dep/u);
    fs.rmSync(dep,{force:true});fs.renameSync(dep+".fifo-original",dep);
    assert.throws(()=>readExactAt(temp,"dep",8,{afterOpen:absolute=>{
      fs.appendFileSync(absolute,"grow");
    }}),/short_or_grown_read:dep|file_descriptor_generation_changed:dep/u);
    fs.rmSync(dep,{force:true});fs.writeFileSync(dep,"123456789",{mode:0o600});
    assert.throws(()=>readExactAt(temp,"dep",8),/invalid_file:dep/u);
  }finally{fs.rmSync(temp,{recursive:true,force:true});}
}
const arg=process.argv[2]||"--self-test";
if(arg==="--derive"){
  process.stdout.write(exact());
}else if(arg==="--reader-self-test"){
  proveReaderBoundary();
  console.log("VOID_BUY_VOID_ENFORCEMENT_FINAL_PROTECTED_V7_V2_CANDIDATE_V4_READER_SELF_TEST_GREEN");
}else if(arg==="--self-test"){
  proveReaderBoundary();
  const bytes=exact();
  assert.ok(read(CANDIDATE,128*1024).equals(bytes),"candidate_file_mismatch");
  const c=JSON.parse(bytes);
  assert.equal(c.candidate_enforcement_identity_accepted,false);
  assert.equal(c.production_source_finality_authority_ready,false);
  assert.equal(c.public_presale_activation,false);
  assert.equal(c.funds_movement,false);
  console.log("VOID_BUY_VOID_ENFORCEMENT_FINAL_PROTECTED_V7_V2_CANDIDATE_V4_GREEN");
  console.log("reviewed_protected_drift_count=1");
  console.log("current_tool_git_blob_sha1="+TOOL_NEW);
  console.log("current_enforcement_tracked_source_inventory_sha256="+INV);
  console.log("candidate_enforcement_set_sha256="+SET);
  console.log("candidate_enforcement_identity_accepted=false");
  console.log("funds_movement=false");
}else{
  throw Error("usage: "+SELF+" [--derive|--reader-self-test|--self-test]");
}
