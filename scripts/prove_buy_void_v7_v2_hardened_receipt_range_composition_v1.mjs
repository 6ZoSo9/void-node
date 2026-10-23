#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const V3_PARENT="e6336075802680577f4d3e82ab7384b5c212bb4c";
const RECEIPT_PARENT="d7a7c27f89c8f9e00806dc49624938274eab699a";
const COMPOSITION_PREDECESSOR="0afc37f3de08b7174d1fb5de1a720718181db4b2";
const CANDIDATE="ops/security/buy-void-enforcement-final-protected-v7-v2-candidate-v3.json";
const CANDIDATE_BLOB="5301c32f53c2a82435152e38b36486507a73f906";
const LOCK="ops/security/buy-void-enforcement-final-protected-v7-v2-lock-v3.json";
const LOCK_BLOB="e530390e505d447ca0ad9e2a098ec6a819ae3e6c";
const RECEIPT_TOOL="ops/precision/void_buy_void_source_finality_v7_deployment_receipt_install_v1.ts";
const OLD_RECEIPT_BLOB="3de6e4bd1f9aa2e9c0a0889cc7c0ab489cb306c0";
const NEW_RECEIPT_BLOB="f2d5288d6c1b639df6d9dcb1c174046ec9287f3b";
const SELF="scripts/prove_buy_void_v7_v2_hardened_receipt_range_composition_v1.mjs";
const DOC="docs/architecture/buy-void-v7-v2-hardened-receipt-range-composition-v1.md";
const WORKFLOW=".github/workflows/buy-void-v7-v2-hardened-receipt-range-composition-v1.yml";
const OVERLAY=Object.freeze([
  {path:".github/workflows/buy-void-v7-protected-substrate-install-v4.yml",blob:"ce7173db87a24e6b2b4914c88059b8243a17507b",mode:"100644"},
  {path:".github/workflows/void-v7-source-release-full-history-reseal-v1.yml",blob:"dd3596c8113c27c6b3b71ca31456c7e8f721b8ae",mode:"100644"},
  {path:"docs/operators/buy-void-source-finality-v7-deployment-receipt-install-v1.md",blob:"46590d410e5c301519d5669eb7e6d4d047b8c9b9",mode:"100644"},
  {path:"docs/operators/buy-void-v7-protected-substrate-install-v4.md",blob:"b30e7423ac7299fc6f2f793c0b7142616b5ebc60",mode:"100644"},
  {path:"docs/operators/void-v7-source-release-full-history-reseal-v1.md",blob:"1e53d9fc404e2711358dbad796ab913f1dc481da",mode:"100644"},
  {path:"ops/precision/void_buy_void_source_finality_v7_deployment_receipt_install_v1.ts",blob:"f2d5288d6c1b639df6d9dcb1c174046ec9287f3b",mode:"100644"},
  {path:"ops/precision/void_buy_void_v7_protected_substrate_install_v4.py",blob:"94112afa2f805e0a6ce881a490c1c64e31e0413e",mode:"100644"},
  {path:"ops/precision/void_v7_source_release_full_history_reseal_v1.py",blob:"030182d544a92cd6c67868fa4c4f3e83188e4249",mode:"100644"},
  {path:"scripts/prove_buy_void_source_finality_v7_deployment_receipt_install_v1.ts",blob:"0d8a78a94afa3141558563b89bb24a6944f82e76",mode:"100644"},
  {path:"scripts/prove_buy_void_v7_protected_substrate_install_v4.py",blob:"3dbc556b01d3f3577c8579553e6ac639be161020",mode:"100644"},
  {path:"scripts/prove_void_v7_source_release_full_history_reseal_v1.py",blob:"b59b4ad0d2c31988908a281ad18f40ecbb3961ac",mode:"100644"}
]);
const EXPECTED_DELTA=Object.freeze([...OVERLAY.map(x=>x.path),SELF,DOC,WORKFLOW].sort());
const REPAIR_PATHS=Object.freeze([
  ".github/workflows/buy-void-v7-protected-substrate-install-v4.yml",
  ".github/workflows/void-v7-source-release-full-history-reseal-v1.yml",
  SELF,
  DOC,
  WORKFLOW,
].sort());
const MAX_REPAIR_COMMITS=8;
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

function sameStat(a,b,label){
  for(const key of STAT_FIELDS)assert.equal(a[key],b[key],label+":"+key);
}
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
    const chunks=[];
    const scratch=Buffer.alloc(Math.min(64*1024,max+1));
    let total=0;
    while(total<=max){
      const want=Math.min(scratch.length,max+1-total);
      if(want===0)break;
      const n=fs.readSync(fd,scratch,0,want,null);
      if(n===0)break;
      chunks.push(Buffer.from(scratch.subarray(0,n)));
      total+=n;
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
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),"void-hardened-composition-read-"));
  try{
    const dep=path.join(temp,"dep");
    fs.writeFileSync(dep,"good",{mode:0o600});
    assert.equal(readStableAt(temp,"dep",8).bytes.toString("utf8"),"good");
    assert.throws(()=>readStableAt(temp,"dep",8,{beforeOpen:absolute=>{
      fs.renameSync(absolute,absolute+".fifo-original");
      run("/usr/bin/mkfifo",[absolute],{timeout:5000});
      fs.chmodSync(absolute,0o600);
    }}),/invalid_opened_file:dep/);
    fs.rmSync(dep,{force:true});
    fs.renameSync(dep+".fifo-original",dep);
  }finally{fs.rmSync(temp,{recursive:true,force:true});}
}
function canonical(v){
  if(v===null||typeof v==="boolean"||typeof v==="string")return JSON.stringify(v);
  if(typeof v==="number"){assert.ok(Number.isSafeInteger(v));return String(v);}
  if(Array.isArray(v))return "["+v.map(canonical).join(",")+"]";
  return "{"+Object.keys(v).sort().map(k=>JSON.stringify(k)+":"+canonical(v[k])).join(",")+"}";
}
function verifyComposition(){
  proveReaderBoundary();
  const compositionParents=git(["rev-list","--parents","-n","1",COMPOSITION_PREDECESSOR]).split(/\s+/);
  assert.deepEqual(
    compositionParents.slice(1),
    [V3_PARENT,RECEIPT_PARENT],
    "composition_predecessor_parent_order",
  );
  git(["merge-base","--is-ancestor",COMPOSITION_PREDECESSOR,"HEAD"]);
  git(["merge-base","--is-ancestor",V3_PARENT,COMPOSITION_PREDECESSOR]);
  git(["merge-base","--is-ancestor",RECEIPT_PARENT,COMPOSITION_PREDECESSOR]);

  const repairCommits=git([
    "rev-list","--first-parent","--reverse",COMPOSITION_PREDECESSOR+"..HEAD",
  ]).split("\n").filter(Boolean);
  assert.ok(
    repairCommits.length>=1&&repairCommits.length<=MAX_REPAIR_COMMITS,
    "repair_commit_count_invalid",
  );
  let repairParent=COMPOSITION_PREDECESSOR;
  for(const commit of repairCommits){
    const row=git(["rev-list","--parents","-n","1",commit]).split(/\s+/);
    assert.deepEqual(
      row.slice(1),
      [repairParent],
      "repair_parent_chain_invalid:"+commit,
    );
    const touched=git(["diff","--name-only",repairParent,commit,"--"])
      .split("\n").filter(Boolean).sort();
    assert.ok(touched.length>0,"repair_commit_empty:"+commit);
    for(const relative of touched){
      assert.ok(
        REPAIR_PATHS.includes(relative),
        "repair_path_forbidden:"+relative,
      );
    }
    repairParent=commit;
  }
  assert.equal(repairParent,git(["rev-parse","HEAD"]),"repair_head_not_terminal");
  const changed=git(["diff","--name-only",V3_PARENT,"HEAD","--"]).split("\n").filter(Boolean).sort();
  assert.deepEqual(changed,EXPECTED_DELTA,"composition_scope_drift");
  for(const row of OVERLAY){
    assert.equal(git(["rev-parse","HEAD:"+row.path]),row.blob,"overlay_blob_drift:"+row.path);
    const entry=git(["ls-tree","HEAD","--",row.path]);
    const m=entry.match(/^(100644|100755) blob ([0-9a-f]{40})\t(.+)$/u);
    assert.ok(m,"overlay_tree_entry_invalid:"+row.path);
    assert.equal(m[1],row.mode,"overlay_mode_drift:"+row.path);
    assert.equal(m[2],row.blob,"overlay_tree_blob_drift:"+row.path);
    assert.equal(m[3],row.path,"overlay_tree_path_drift:"+row.path);
  }

  const candidateRead=readStable(CANDIDATE,64*1024);
  const lockRead=readStable(LOCK,64*1024);
  assert.equal(gitBlob(candidateRead.bytes),CANDIDATE_BLOB,"candidate_visible_blob_drift");
  assert.equal(gitBlob(lockRead.bytes),LOCK_BLOB,"lock_visible_blob_drift");
  assert.equal(git(["rev-parse","HEAD:"+CANDIDATE]),CANDIDATE_BLOB,"candidate_head_blob_drift");
  assert.equal(git(["rev-parse","HEAD:"+LOCK]),LOCK_BLOB,"lock_head_blob_drift");
  const candidate=JSON.parse(candidateRead.bytes.toString("utf8"));
  const lock=JSON.parse(lockRead.bytes.toString("utf8"));
  assert.equal(candidate.marker,"VOID_BUY_VOID_ENFORCEMENT_FINAL_PROTECTED_V7_V2_CANDIDATE_V3");
  assert.equal(candidate.version,3);
  assert.equal(candidate.candidate_enforcement_identity_accepted,false);
  assert.equal(lock.marker,"VOID_BUY_VOID_ENFORCEMENT_FINAL_PROTECTED_V7_V2_LOCK_V3");
  assert.equal(lock.version,3);
  assert.equal(lock.candidate_evidence.git_blob_sha1,CANDIDATE_BLOB);
  assert.equal(lock.candidate_enforcement_identity_accepted,true);
  assert.equal(lock.deployed_artifact_generation_verified,false);
  assert.equal(lock.runtime_mount_authority,false);
  assert.equal(lock.production_source_finality_authority_ready,false);
  assert.equal(lock.public_presale_activation,false);
  assert.equal(lock.funds_movement,false);

  const oldRows=candidate.current_enforcement_tracked_source_inventory_v1;
  assert.ok(Array.isArray(oldRows));assert.equal(oldRows.length,49);
  let drift=0;
  const rows=oldRows.map(old=>{
    assert.equal(typeof old.path,"string");
    const observed=readStable(old.path,16*1024*1024);
    const visible=gitBlob(observed.bytes);
    const headBlob=git(["rev-parse","HEAD:"+old.path]);
    assert.equal(visible,headBlob,"worktree_head_blob_mismatch:"+old.path);
    const entry=git(["ls-tree","HEAD","--",old.path]);
    const m=entry.match(/^(100644|100755) blob ([0-9a-f]{40})\t(.+)$/u);
    assert.ok(m,"protected_tree_entry_invalid:"+old.path);
    assert.equal(m[2],headBlob);assert.equal(m[3],old.path);
    const mode=(observed.stat.mode&0o111)!==0?"100755":"100644";
    assert.equal(mode,m[1],"protected_mode_mismatch:"+old.path);
    if(headBlob!==old.git_blob_sha1){
      drift+=1;
      assert.equal(old.path,RECEIPT_TOOL,"unexpected_protected_drift:"+old.path);
      assert.equal(old.git_blob_sha1,OLD_RECEIPT_BLOB,"receipt_predecessor_blob_drift");
      assert.equal(headBlob,NEW_RECEIPT_BLOB,"receipt_current_blob_drift");
      assert.equal(mode,old.git_mode,"receipt_mode_drift");
    }else{
      assert.equal(mode,old.git_mode,"unchanged_mode_drift:"+old.path);
    }
    return {path:old.path,git_blob_sha1:headBlob,git_mode:mode};
  });
  assert.equal(drift,1,"reviewed_protected_drift_count");
  assert.equal(git(["rev-parse","HEAD:"+RECEIPT_TOOL]),NEW_RECEIPT_BLOB);
  return Object.freeze({
    schema:"void_buy_void_v7_v2_hardened_receipt_range_composition_v1",
    marker:"VOID_BUY_VOID_V7_V2_HARDENED_RECEIPT_RANGE_COMPOSITION_V1",
    version:1,
    repository:"6ZoSo9/void-node",
    composition_head:git(["rev-parse","HEAD"]),
    composition_predecessor_head:COMPOSITION_PREDECESSOR,
    repair_commit_count:repairCommits.length,
    repair_paths:REPAIR_PATHS,
    composition_repair_chain_bounded:true,
    accepted_v3_parent:V3_PARENT,
    hardened_receipt_parent:RECEIPT_PARENT,
    candidate_v3_git_blob_sha1:CANDIDATE_BLOB,
    accepted_lock_v3_git_blob_sha1:LOCK_BLOB,
    current_enforcement_tracked_source_inventory_count:49,
    current_enforcement_tracked_source_inventory_sha256:sha256(Buffer.from(canonical(rows),"utf8")),
    reviewed_protected_drift_count:1,
    reviewed_protected_drift:Object.freeze({
      path:RECEIPT_TOOL,
      predecessor_git_blob_sha1:OLD_RECEIPT_BLOB,
      current_git_blob_sha1:NEW_RECEIPT_BLOB,
      git_mode:"100644"
    }),
    historical_v3_candidate_preserved:true,
    historical_v3_lock_preserved:true,
    candidate_v4_required:true,
    candidate_v4_accepted:false,
    historical_v4_workflow_composition_scope_exact:true,
    historical_reseal_workflow_composition_scope_exact:true,
    deployed_artifact_generation_verified:false,
    runtime_mount_authority:false,
    production_source_finality_authority_ready:false,
    public_presale_activation:false,
    funds_movement:false
  });
}
const args=process.argv.slice(2);
if(args.length===1&&args[0]==="--receipt"){
  process.stdout.write(JSON.stringify(verifyComposition(),null,2)+"\n");
}else if(args.length===0||(args.length===1&&args[0]==="--self-test")){
  const r=verifyComposition();
  console.log("VOID_BUY_VOID_V7_V2_HARDENED_RECEIPT_RANGE_COMPOSITION_V1_GREEN");
  console.log("composition_predecessor_head="+r.composition_predecessor_head);
  console.log("repair_commit_count="+String(r.repair_commit_count));
  console.log("composition_repair_chain_bounded=true");
  console.log("repair_path_allowlist_bound=true");
  console.log("accepted_v3_parent="+r.accepted_v3_parent);
  console.log("hardened_receipt_parent="+r.hardened_receipt_parent);
  console.log("current_enforcement_tracked_source_inventory_sha256="+r.current_enforcement_tracked_source_inventory_sha256);
  console.log("reviewed_protected_drift_count=1");
  console.log("reviewed_protected_drift_path="+RECEIPT_TOOL);
  console.log("historical_v3_candidate_preserved=true");
  console.log("historical_v3_lock_preserved=true");
  console.log("candidate_v4_required=true");
  console.log("candidate_v4_accepted=false");
  console.log("historical_v4_workflow_composition_scope_exact=true");
  console.log("historical_reseal_workflow_composition_scope_exact=true");
  console.log("public_presale_activation=false");
  console.log("funds_movement=false");
}else throw Error("usage: proof [--self-test|--receipt]");
