#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const BASE="5e71209a92cb428fe0692a4764b3dd7466645e75";
const V3_CANDIDATE="ops/security/buy-void-enforcement-final-protected-v7-v2-candidate-v3.json";
const V3_CANDIDATE_BLOB="5301c32f53c2a82435152e38b36486507a73f906";
const V3_LOCK="ops/security/buy-void-enforcement-final-protected-v7-v2-lock-v3.json";
const V3_LOCK_BLOB="e530390e505d447ca0ad9e2a098ec6a819ae3e6c";
const COMPOSITION_PROOF="scripts/prove_buy_void_v7_v2_hardened_receipt_range_composition_v1.mjs";
const COMPOSITION_PROOF_BLOB="3e2e5aac39a1a1ba4c09d48c67a84591c77e24a9";
const CANDIDATE="ops/security/buy-void-enforcement-final-protected-v7-v2-candidate-v4.json";
const CANDIDATE_BLOB="b8341906d9563739a50dac98ea184a1d93267531";
const CANDIDATE_SHA256="7408f190f01113ca8be42f388acbe7fad083ec11100fa9bb31017e635cf53a9f";
const CANDIDATE_SET="f28b445fe5f1e632d1265ead825ecf9338644a3ae2704fde83ba1cedaf6be695";
const CURRENT_INVENTORY="686745113e5e5223a357c053a41496dc8ded12698c31967d541efea7bfe469f1";
const RECEIPT_PATH="ops/precision/void_buy_void_source_finality_v7_deployment_receipt_install_v1.ts";
const OLD_RECEIPT_BLOB="3de6e4bd1f9aa2e9c0a0889cc7c0ab489cb306c0";
const NEW_RECEIPT_BLOB="f2d5288d6c1b639df6d9dcb1c174046ec9287f3b";
const SELF="scripts/prove_buy_void_enforcement_final_protected_v7_v2_candidate_v4.mjs";
const DOC="docs/architecture/buy-void-enforcement-final-protected-v7-v2-deployment-successor-v4.md";
const WORKFLOW=".github/workflows/buy-void-enforcement-final-protected-v7-v2-candidate-v4.yml";
const EXPECTED_DELTA=Object.freeze([CANDIDATE,SELF,DOC,WORKFLOW].sort());
const STAT_FIELDS=Object.freeze(["dev","ino","uid","gid","mode","nlink","size","mtimeMs","ctimeMs"]);

function run(command,args,{timeout=120000}={}){
  const r=spawnSync(command,args,{cwd:ROOT,encoding:null,stdio:["ignore","pipe","pipe"],timeout,maxBuffer:32*1024*1024,env:{
    PATH:"/usr/bin:/bin",HOME:"/nonexistent",LANG:"C",LC_ALL:"C",TZ:"UTC",
    GIT_CONFIG_NOSYSTEM:"1",GIT_CONFIG_GLOBAL:"/dev/null",GIT_CONFIG_SYSTEM:"/dev/null",
    GIT_NO_REPLACE_OBJECTS:"1",GIT_OPTIONAL_LOCKS:"0",GIT_TERMINAL_PROMPT:"0"
  }});
  assert.equal(r.error,undefined,String(r.error||""));
  assert.equal(r.status,0,String(r.stderr||r.stdout||""));
  return r;
}
const git=args=>String(run("/usr/bin/git",["--no-replace-objects","-C",ROOT,...args],{timeout:30000}).stdout||"").trim();
const sha256=bytes=>crypto.createHash("sha256").update(bytes).digest("hex");
const gitBlob=bytes=>crypto.createHash("sha1").update(Buffer.from("blob "+String(bytes.length)+"\0","utf8")).update(bytes).digest("hex");
function canonical(v){
  if(v===null||typeof v==="boolean"||typeof v==="string")return JSON.stringify(v);
  if(typeof v==="number"){assert.ok(Number.isSafeInteger(v));return String(v);}
  if(Array.isArray(v))return "["+v.map(canonical).join(",")+"]";
  return "{"+Object.keys(v).sort().map(k=>JSON.stringify(k)+":"+canonical(v[k])).join(",")+"}";
}
function sameStat(a,b,label){for(const key of STAT_FIELDS)assert.equal(a[key],b[key],label+":"+key);}
function readStableAt(root,relative,max,{beforeOpen=null}={}){
  assert.equal(path.isAbsolute(relative),false,"absolute_path:"+relative);
  assert.equal(relative.split("/").some(p=>!p||p==="."||p===".."),false,"unsafe_path:"+relative);
  assert.ok(Number.isSafeInteger(max)&&max>0,"invalid_max:"+relative);
  const absolute=path.join(root,...relative.split("/"));
  const before=fs.lstatSync(absolute);
  assert.ok(before.isFile()&&!before.isSymbolicLink()&&before.nlink===1&&before.size>0&&before.size<=max,"invalid_file:"+relative);
  if(beforeOpen!==null)beforeOpen(absolute,before);
  let fd=-1;
  try{
    fd=fs.openSync(absolute,fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW|fs.constants.O_NONBLOCK);
    const opened=fs.fstatSync(fd);
    assert.ok(opened.isFile()&&opened.nlink===1&&opened.size>0&&opened.size<=max,"invalid_opened_file:"+relative);
    sameStat(opened,before,"open_generation_mismatch:"+relative);
    const chunks=[];const scratch=Buffer.alloc(Math.min(64*1024,max+1));let total=0;
    while(total<=max){
      const want=Math.min(scratch.length,max+1-total);if(want===0)break;
      const n=fs.readSync(fd,scratch,0,want,null);if(n===0)break;
      chunks.push(Buffer.from(scratch.subarray(0,n)));total+=n;
    }
    assert.ok(total<=max,"size_limit:"+relative);
    assert.equal(total,opened.size,"short_or_grown_read:"+relative);
    sameStat(fs.fstatSync(fd),opened,"descriptor_generation_changed:"+relative);
    sameStat(fs.lstatSync(absolute),opened,"visible_generation_changed:"+relative);
    return {bytes:Buffer.concat(chunks,total),stat:opened};
  }finally{if(fd>=0)fs.closeSync(fd);}
}
const readStable=(relative,max=1024*1024)=>readStableAt(ROOT,relative,max);

function proveReaderBoundary(){
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),"void-v4-candidate-read-"));
  try{
    const dep=path.join(temp,"dep");fs.writeFileSync(dep,"good",{mode:0o600});
    assert.equal(readStableAt(temp,"dep",8).bytes.toString("utf8"),"good");
    assert.throws(()=>readStableAt(temp,"dep",8,{beforeOpen:absolute=>{
      fs.renameSync(absolute,absolute+".fifo-original");
      run("/usr/bin/mkfifo",[absolute],{timeout:5000});fs.chmodSync(absolute,0o600);
    }}),/invalid_opened_file:dep/);
    fs.rmSync(dep,{force:true});fs.renameSync(dep+".fifo-original",dep);
  }finally{fs.rmSync(temp,{recursive:true,force:true});}
}
function currentRows(v3){
  let drift=0;
  const rows=v3.current_enforcement_tracked_source_inventory_v1.map(old=>{
    const observed=readStable(old.path,16*1024*1024);
    const visible=gitBlob(observed.bytes);
    const headBlob=git(["rev-parse","HEAD:"+old.path]);
    assert.equal(visible,headBlob,"worktree_head_blob_mismatch:"+old.path);
    const entry=git(["ls-tree","HEAD","--",old.path]);
    const m=entry.match(/^(100644|100755) blob ([0-9a-f]{40})\t(.+)$/u);
    assert.ok(m,"tree_entry_invalid:"+old.path);assert.equal(m[2],headBlob);assert.equal(m[3],old.path);
    const mode=(observed.stat.mode&0o111)!==0?"100755":"100644";
    assert.equal(mode,m[1],"mode_mismatch:"+old.path);
    if(headBlob!==old.git_blob_sha1){
      drift+=1;assert.equal(old.path,RECEIPT_PATH,"unexpected_drift:"+old.path);
      assert.equal(old.git_blob_sha1,OLD_RECEIPT_BLOB);assert.equal(headBlob,NEW_RECEIPT_BLOB);assert.equal(mode,old.git_mode);
    }else assert.equal(mode,old.git_mode,"unchanged_mode_drift:"+old.path);
    return {path:old.path,git_blob_sha1:headBlob,git_mode:mode};
  });
  assert.equal(drift,1,"reviewed_protected_drift_count");
  assert.equal(rows.length,49);
  assert.equal(sha256(Buffer.from(canonical(rows),"utf8")),CURRENT_INVENTORY,"current_inventory_sha256");
  return rows;
}
function derive(){
  const v3Bytes=readStable(V3_CANDIDATE,64*1024).bytes;
  const lockBytes=readStable(V3_LOCK,64*1024).bytes;
  assert.equal(gitBlob(v3Bytes),V3_CANDIDATE_BLOB);assert.equal(gitBlob(lockBytes),V3_LOCK_BLOB);
  const v3=JSON.parse(v3Bytes.toString("utf8"));const lock=JSON.parse(lockBytes.toString("utf8"));
  assert.equal(v3.marker,"VOID_BUY_VOID_ENFORCEMENT_FINAL_PROTECTED_V7_V2_CANDIDATE_V3");
  assert.equal(v3.current_enforcement_tracked_source_inventory_sha256,"65880eb31fd75bc07b8c568ada5a4903a2c178108408e2a8390c15b3cafb7589");
  assert.equal(lock.marker,"VOID_BUY_VOID_ENFORCEMENT_FINAL_PROTECTED_V7_V2_LOCK_V3");
  assert.equal(lock.candidate_evidence.git_blob_sha1,V3_CANDIDATE_BLOB);
  assert.equal(lock.candidate_enforcement_identity_accepted,true);
  assert.equal(git(["rev-parse","HEAD:"+COMPOSITION_PROOF]),COMPOSITION_PROOF_BLOB);
  const rows=currentRows(v3);
  const successor={
    predecessor_candidate_path:V3_CANDIDATE,
    predecessor_candidate_git_blob_sha1:V3_CANDIDATE_BLOB,
    predecessor_lock_path:V3_LOCK,
    predecessor_lock_git_blob_sha1:V3_LOCK_BLOB,
    composition_parent:BASE,
    composition_proof_path:COMPOSITION_PROOF,
    composition_proof_git_blob_sha1:COMPOSITION_PROOF_BLOB,
    predecessor_current_inventory_sha256:"65880eb31fd75bc07b8c568ada5a4903a2c178108408e2a8390c15b3cafb7589",
    current_inventory_sha256:CURRENT_INVENTORY,
    reviewed_protected_drift_count:1,
    reviewed_protected_drift:{path:RECEIPT_PATH,predecessor_git_blob_sha1:OLD_RECEIPT_BLOB,current_git_blob_sha1:NEW_RECEIPT_BLOB,git_mode:"100644"},
    predecessor_candidate_preserved:true,predecessor_lock_preserved:true,current_candidate_rederived:true
  };
  const hosted={
    workflow_run:39982169951,
    node22_artifact_id:12514272109,
    node24_artifact_id:12514485977,
    node26_artifact_id:12513009476,
    cross_node_job_id:120514201748,
    planner_hold_job_id:120515308789,
    cross_node_byte_identity_verified:true,
    accepted_v3_lock_hardened_receipt_hold_verified:true,
    current_enforcement_tracked_source_inventory_sha256:CURRENT_INVENTORY
  };
  const b={...v3,schema:"void_buy_void_enforcement_final_protected_v7_v2_candidate_v4",marker:"VOID_BUY_VOID_ENFORCEMENT_FINAL_PROTECTED_V7_V2_CANDIDATE_V4",version:4,current_enforcement_parent:BASE,current_enforcement_tracked_source_inventory_v1:rows,current_enforcement_tracked_source_inventory_sha256:CURRENT_INVENTORY,successor_transition:successor,hosted_composition_evidence:hosted,candidate_enforcement_identity_accepted:false,deployed_artifact_generation_verified:false,runtime_mount_authority:false,production_source_finality_authority_ready:false,public_presale_activation:false,funds_movement:false};
  delete b.candidate_enforcement_set_sha256;
  return {...b,candidate_enforcement_set_sha256:sha256(Buffer.from(canonical(b),"utf8"))};
}
function verifyBranch(){
  git(["merge-base","--is-ancestor",BASE,"HEAD"]);assert.equal(git(["merge-base",BASE,"HEAD"]),BASE,"base_not_exact_merge_base");
  const changed=git(["diff","--name-only",BASE,"HEAD","--"]).split("\n").filter(Boolean).sort();
  assert.deepEqual(changed,EXPECTED_DELTA,"candidate_v4_scope_drift");
  assert.equal(git(["rev-parse","HEAD:"+V3_CANDIDATE]),V3_CANDIDATE_BLOB);
  assert.equal(git(["rev-parse","HEAD:"+V3_LOCK]),V3_LOCK_BLOB);
  assert.equal(git(["rev-parse","HEAD:"+CANDIDATE]),CANDIDATE_BLOB);
}
function verify(){
  proveReaderBoundary();verifyBranch();
  const derived=derive();const bytes=Buffer.from(JSON.stringify(derived,null,2)+"\n","utf8");
  assert.equal(sha256(bytes),CANDIDATE_SHA256,"candidate_sha256_drift");
  assert.equal(gitBlob(bytes),CANDIDATE_BLOB,"candidate_git_blob_drift");
  assert.equal(derived.candidate_enforcement_set_sha256,CANDIDATE_SET);
  assert.equal(derived.current_enforcement_tracked_source_inventory_sha256,CURRENT_INVENTORY);
  assert.equal(derived.successor_transition.reviewed_protected_drift_count,1);
  assert.equal(derived.hosted_composition_evidence.workflow_run,39982169951);
  assert.equal(derived.candidate_enforcement_identity_accepted,false);
  assert.equal(derived.deployed_artifact_generation_verified,false);
  assert.equal(derived.runtime_mount_authority,false);
  assert.equal(derived.production_source_finality_authority_ready,false);
  assert.equal(derived.public_presale_activation,false);assert.equal(derived.funds_movement,false);
  const committed=readStable(CANDIDATE,64*1024).bytes;assert.ok(committed.equals(bytes),"candidate_file_not_exact_derived_bytes");
  return bytes;
}
const args=process.argv.slice(2);
if(args.length===1&&args[0]==="--derive")process.stdout.write(verify());
else if(args.length===0||(args.length===1&&args[0]==="--self-test")){
  const bytes=verify();const c=JSON.parse(bytes.toString("utf8"));
  console.log("VOID_BUY_VOID_ENFORCEMENT_FINAL_PROTECTED_V7_V2_CANDIDATE_V4_GREEN");
  console.log("composition_parent="+BASE);
  console.log("composition_workflow_run="+c.hosted_composition_evidence.workflow_run);
  console.log("composition_node22_artifact_id="+c.hosted_composition_evidence.node22_artifact_id);
  console.log("composition_node24_artifact_id="+c.hosted_composition_evidence.node24_artifact_id);
  console.log("composition_node26_artifact_id="+c.hosted_composition_evidence.node26_artifact_id);
  console.log("composition_cross_node_job_id="+c.hosted_composition_evidence.cross_node_job_id);
  console.log("composition_planner_hold_job_id="+c.hosted_composition_evidence.planner_hold_job_id);
  console.log("current_enforcement_tracked_source_inventory_sha256="+CURRENT_INVENTORY);
  console.log("reviewed_protected_drift_count=1");
  console.log("reviewed_protected_drift_path="+RECEIPT_PATH);
  console.log("candidate_json_sha256="+CANDIDATE_SHA256);
  console.log("candidate_git_blob_sha1="+CANDIDATE_BLOB);
  console.log("candidate_enforcement_set_sha256="+CANDIDATE_SET);
  console.log("candidate_enforcement_identity_accepted=false");
  console.log("public_presale_activation=false");
  console.log("funds_movement=false");
}else throw Error("usage: proof [--self-test|--derive]");
