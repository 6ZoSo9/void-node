#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const MARKER="VOID_BUY_VOID_ENFORCEMENT_FINAL_PROTECTED_V7_V2_CANDIDATE_V5";
const PARENT="a016ea761ccdba10352337ad97c05ba8b52ce6cf";
const SELF="scripts/prove_buy_void_enforcement_final_protected_v7_v2_candidate_v5.mjs";
const DOC="docs/architecture/buy-void-enforcement-final-protected-v7-v2-candidate-v5.md";
const WORKFLOW=".github/workflows/buy-void-enforcement-final-protected-v7-v2-candidate-v5.yml";

const COMPOSITION_PROOF="scripts/prove_buy_void_protected_v4_lock_canonical_v5_composition_v2.mjs";
const COMPOSITION_PROOF_BLOB="0f731f9932d043f6c0eaac8db6cc4eca7673f9c2";
const COMPOSITION_DOC="docs/architecture/buy-void-protected-v4-lock-canonical-v5-composition-v2.md";
const COMPOSITION_DOC_BLOB="221bd4b8d7b908b2f893e5301143600952545901";
const COMPOSITION_WORKFLOW=".github/workflows/buy-void-protected-v4-lock-canonical-v5-composition-v2.yml";
const COMPOSITION_WORKFLOW_BLOB="21971621fae40fdce2d4bcd7f54e269c7fdf22b7";
const HOSTED_COMPOSITION=Object.freeze({
  workflow_run:40092224628,
  node22_job_id:120867064615,
  node24_job_id:120867064444,
  node26_job_id:120867064630,
  node22_success:true,
  node24_success:true,
  node26_success:true,
  exact_head_verified:true,
  deterministic_receipt_verified:false,
});

const CANDIDATE_V4="ops/security/buy-void-enforcement-final-protected-v7-v2-candidate-v4.json";
const CANDIDATE_V4_BLOB="ec00f0c552e600fff38e4998e4beb128c93b481d";
const LOCK_V4="ops/security/buy-void-enforcement-final-protected-v7-v2-lock-v4.json";
const LOCK_V4_BLOB="4de9c2185a1359d2877b17958666f91497a91179";
const ACCEPTED_V4_SET="00e8ca31370f9c6c4fa77185ed05a9ed0554e0b2036b6c5f2e937e7839c67b1a";

const RUNNER="ops/run-void-node-live-v1.sh";
const RUNNER_V4_BLOB="6fb040de128ce0df16e848d61ea5f4acb62794da";
const RUNNER_V5_BLOB="bc6a17ccdf389299fb139db37e742f0b1ad9dc4e";
const V5_GUARD="runtime/canonical-producer-self-http-guard-v5.cjs";
const V5_GUARD_BLOB="72a84059b2558092fe853b6305493257fca4c76c";
const V5_DISPATCH="scripts/prove_canonical_producer_source_generation_dispatch_v5.mjs";
const V5_DISPATCH_BLOB="a9b8a5cc8d330feb2e0772042a641eb9b9a787a1";
const V5_OBSERVER="scripts/prove_canonical_producer_legacy_self_http_observers_current_v5.mjs";
const V5_OBSERVER_BLOB="871d3663628edcf767a77a1d0ee1f60dd5b59ad7";
const INDEX="src/index.ts";
const INDEX_BLOB="a09661797aa4295371c036be36d82995e5233269";

const OWNED=Object.freeze([WORKFLOW,DOC,SELF].sort());
const sha256=b=>crypto.createHash("sha256").update(b).digest("hex");
const gitBlob=b=>crypto.createHash("sha1")
  .update(Buffer.from("blob "+b.length+"\0","utf8")).update(b).digest("hex");

function canonical(v){
  if(v===null||typeof v==="boolean"||typeof v==="string")return JSON.stringify(v);
  if(typeof v==="number"){assert.ok(Number.isSafeInteger(v));return String(v);}
  if(Array.isArray(v))return "["+v.map(canonical).join(",")+"]";
  assert.ok(v&&typeof v==="object"&&!Array.isArray(v));
  return "{"+Object.keys(v).sort().map(k=>JSON.stringify(k)+":"+canonical(v[k])).join(",")+"}";
}
function run(command,args,{timeout=120000}={}){
  const r=spawnSync(command,args,{
    cwd:ROOT,encoding:"utf8",stdio:["ignore","pipe","pipe"],timeout,
    maxBuffer:16*1024*1024,
    env:{
      PATH:"/usr/bin:/bin",HOME:"/nonexistent",LANG:"C",LC_ALL:"C",TZ:"UTC",
      NODE_OPTIONS:"",GIT_CONFIG_NOSYSTEM:"1",GIT_CONFIG_GLOBAL:"/dev/null",
      GIT_CONFIG_SYSTEM:"/dev/null",GIT_NO_REPLACE_OBJECTS:"1",
      GIT_OPTIONAL_LOCKS:"0",GIT_TERMINAL_PROMPT:"0",GIT_ASKPASS:"/bin/false",
    },
  });
  assert.equal(r.error,undefined,String(r.error||""));
  assert.equal(r.status,0,String(r.stderr||r.stdout||""));
  return r;
}
function git(args){
  return String(run("/usr/bin/git",[
    "--no-replace-objects","-c","core.hooksPath=/dev/null",
    "-c","core.fsmonitor=false","-C",ROOT,...args,
  ],{timeout:30000}).stdout||"").trim();
}
function treeEntry(ref,relative){
  const row=git(["ls-tree",ref,"--",relative]);
  const m=row.match(/^(100644|100755) blob ([0-9a-f]{40})\t(.+)$/u);
  assert.ok(m,"invalid_tree_entry:"+ref+":"+relative);
  assert.equal(m[3],relative);
  return Object.freeze({mode:m[1],blob:m[2]});
}
const STAT_FIELDS=Object.freeze(["dev","ino","mode","nlink","uid","gid","rdev","size","mtimeMs","ctimeMs"]);
function sameStat(actual,expected,label){for(const key of STAT_FIELDS)assert.equal(actual[key],expected[key],label+":"+key);}
function readExactAt(root,relative,max=4*1024*1024,{beforeOpen=null,afterOpen=null}={}){
  assert.equal(path.isAbsolute(relative),false,"absolute_path:"+relative);
  assert.equal(relative.split("/").some(x=>!x||x==="."||x===".."),false,"unsafe_path:"+relative);
  assert.ok(Number.isSafeInteger(max)&&max>0&&max<Number.MAX_SAFE_INTEGER,"invalid_max:"+relative);
  const absolute=path.join(root,...relative.split("/"));
  const before=fs.lstatSync(absolute);
  assert.ok(before.isFile()&&!before.isSymbolicLink()&&before.nlink===1&&before.size>0&&before.size<=max,"invalid_file:"+relative);
  if(beforeOpen)beforeOpen(absolute,before);
  let fd=-1;
  try{
    fd=fs.openSync(absolute,fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW|fs.constants.O_NONBLOCK);
    const opened=fs.fstatSync(fd);
    assert.ok(opened.isFile()&&opened.nlink===1&&opened.size>0&&opened.size<=max,"invalid_opened_file:"+relative);
    sameStat(opened,before,"open_generation:"+relative);
    if(afterOpen)afterOpen(absolute,opened,fd);
    const chunks=[];const scratch=Buffer.alloc(Math.min(64*1024,max+1));let total=0;
    while(total<=max){
      const want=Math.min(scratch.length,max+1-total);if(!want)break;
      const n=fs.readSync(fd,scratch,0,want,null);if(!n)break;
      chunks.push(Buffer.from(scratch.subarray(0,n)));total+=n;
    }
    assert.ok(total<=max,"file_size_limit:"+relative);
    assert.equal(total,opened.size,"short_or_grown_read:"+relative);
    sameStat(fs.fstatSync(fd),opened,"descriptor_generation:"+relative);
    sameStat(fs.lstatSync(absolute),opened,"visible_generation:"+relative);
    return Buffer.concat(chunks,total);
  }finally{if(fd>=0)fs.closeSync(fd);}
}
const readExact=(relative,max=4*1024*1024)=>readExactAt(ROOT,relative,max);
function readerSelfTest(){
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),"void-v5-candidate-reader-"));
  try{
    const dep=path.join(temp,"dep"),target=path.join(temp,"target");
    fs.writeFileSync(dep,"good",{mode:0o600});assert.equal(readExactAt(temp,"dep",8).toString(),"good");
    assert.throws(()=>readExactAt(temp,"dep",8,{beforeOpen:absolute=>{fs.renameSync(absolute,absolute+".old");fs.writeFileSync(absolute,"evil",{mode:0o600});}}),/open_generation:dep/);
    fs.rmSync(dep,{force:true});fs.writeFileSync(target,"good",{mode:0o600});fs.symlinkSync("target",dep);assert.throws(()=>readExactAt(temp,"dep",8),/invalid_file:dep/);
    fs.rmSync(dep,{force:true});fs.writeFileSync(dep,"good",{mode:0o600});assert.throws(()=>readExactAt(temp,"dep",8,{beforeOpen:absolute=>{fs.renameSync(absolute,absolute+".link-old");fs.symlinkSync("target",absolute);}}),err=>err&&err.code==="ELOOP");
    fs.rmSync(dep,{force:true});fs.writeFileSync(dep,"good",{mode:0o600});assert.throws(()=>readExactAt(temp,"dep",8,{beforeOpen:absolute=>{fs.renameSync(absolute,absolute+".fifo-old");run("/usr/bin/mkfifo",[absolute],{timeout:5000});}}),/invalid_opened_file:dep/);
    fs.rmSync(dep,{force:true});fs.writeFileSync(dep,"good",{mode:0o600});assert.throws(()=>readExactAt(temp,"dep",8,{afterOpen:absolute=>fs.appendFileSync(absolute,"x")}),/short_or_grown_read:dep/);
    fs.rmSync(dep,{force:true});fs.writeFileSync(dep,"good",{mode:0o600});assert.throws(()=>readExactAt(temp,"dep",8,{afterOpen:absolute=>fs.appendFileSync(absolute,"growth")}),/file_size_limit:dep/);
    fs.rmSync(dep,{force:true});fs.writeFileSync(dep,"123456789",{mode:0o600});assert.throws(()=>readExactAt(temp,"dep",8),/invalid_file:dep/);
  }finally{fs.rmSync(temp,{recursive:true,force:true});}
}
function pin(relative,blob,max=4*1024*1024){
  const bytes=readExact(relative,max);
  assert.equal(gitBlob(bytes),blob,"visible_blob_drift:"+relative);
  assert.equal(git(["rev-parse","HEAD:"+relative]),blob,"head_blob_drift:"+relative);
  return bytes;
}
function assertScope(){
  git(["merge-base","--is-ancestor",PARENT,"HEAD"]);
  const rows=git(["diff","--name-status",PARENT,"HEAD"]).split(/\n/u).filter(Boolean);
  assert.equal(rows.length,OWNED.length,"candidate_scope_count");
  const actual=rows.map(row=>{
    const m=row.match(/^A\t(.+)$/u);
    assert.ok(m,"candidate_scope_not_add_only:"+row);
    return m[1];
  }).sort();
  assert.deepEqual(actual,OWNED,"candidate_scope_paths");
  git(["diff","--check",PARENT,"HEAD"]);
}
function proveV5(){
  const dispatch=run(process.execPath,[path.join(ROOT,V5_DISPATCH)],{timeout:180000});
  const out=String(dispatch.stdout||"");
  assert.equal(String(dispatch.stderr||""),"","v5_dispatch_stderr");
  assert.ok(out.includes("VOID_CANONICAL_PRODUCER_SOURCE_GENERATION_DISPATCH_V5_GREEN"));
  assert.ok(out.includes("VOID_CANONICAL_PRODUCER_LEGACY_SELF_HTTP_OBSERVERS_V5_GREEN"));
}
function derive(){
  assertScope();
  readerSelfTest();
  pin(COMPOSITION_PROOF,COMPOSITION_PROOF_BLOB,256*1024);
  pin(COMPOSITION_DOC,COMPOSITION_DOC_BLOB,128*1024);
  pin(COMPOSITION_WORKFLOW,COMPOSITION_WORKFLOW_BLOB,128*1024);
  const candidateV4=JSON.parse(pin(CANDIDATE_V4,CANDIDATE_V4_BLOB,256*1024).toString("utf8"));
  const lockV4=JSON.parse(pin(LOCK_V4,LOCK_V4_BLOB,128*1024).toString("utf8"));
  pin(RUNNER,RUNNER_V5_BLOB,256*1024);
  pin(V5_GUARD,V5_GUARD_BLOB,256*1024);
  pin(V5_DISPATCH,V5_DISPATCH_BLOB,256*1024);
  pin(V5_OBSERVER,V5_OBSERVER_BLOB,512*1024);
  pin(INDEX,INDEX_BLOB,8*1024*1024);

  assert.equal(candidateV4.marker,"VOID_BUY_VOID_ENFORCEMENT_FINAL_PROTECTED_V7_V2_CANDIDATE_V4");
  assert.equal(candidateV4.candidate_enforcement_identity_accepted,false);
  assert.equal(candidateV4.complete_executable_closure_verified,true);
  assert.equal(candidateV4.deployed_artifact_generation_verified,false);
  assert.equal(candidateV4.runtime_mount_authority,false);
  assert.equal(candidateV4.production_source_finality_authority_ready,false);
  assert.equal(candidateV4.public_presale_activation,false);
  assert.equal(candidateV4.funds_movement,false);

  assert.equal(lockV4.marker,"VOID_BUY_VOID_ENFORCEMENT_FINAL_PROTECTED_V7_V2_LOCK_V4");
  assert.equal(lockV4.candidate_evidence?.git_blob_sha1,CANDIDATE_V4_BLOB);
  assert.equal(lockV4.candidate_evidence?.candidate_enforcement_set_sha256,ACCEPTED_V4_SET);
  assert.equal(lockV4.candidate_enforcement_identity_accepted,true);
  assert.equal(lockV4.complete_executable_closure_verified,true);
  assert.equal(lockV4.deployed_artifact_generation_verified,false);
  assert.equal(lockV4.runtime_mount_authority,false);
  assert.equal(lockV4.production_source_finality_authority_ready,false);
  assert.equal(lockV4.public_presale_activation,false);
  assert.equal(lockV4.funds_movement,false);

  const oldInventory=candidateV4.current_enforcement_tracked_source_inventory_v1;
  assert.ok(Array.isArray(oldInventory));assert.equal(oldInventory.length,49);
  let transitionCount=0;
  const currentInventory=oldInventory.map(row=>{
    assert.ok(row&&typeof row==="object"&&!Array.isArray(row));
    const expected=row.path===RUNNER
      ? {path:RUNNER,git_blob_sha1:RUNNER_V5_BLOB,git_mode:"100755"}
      : {path:row.path,git_blob_sha1:row.git_blob_sha1,git_mode:row.git_mode};
    if(row.path===RUNNER){
      transitionCount++;
      assert.equal(row.git_blob_sha1,RUNNER_V4_BLOB);
      assert.equal(row.git_mode,"100755");
    }
    const actual=treeEntry("HEAD",expected.path);
    assert.equal(actual.blob,expected.git_blob_sha1,"inventory_blob_drift:"+expected.path);
    assert.equal(actual.mode,expected.git_mode,"inventory_mode_drift:"+expected.path);
    return Object.freeze(expected);
  });
  assert.equal(transitionCount,1);
  const inventorySha256=sha256(Buffer.from(JSON.stringify(currentInventory)+"\n","utf8"));

  proveV5();

  const body=Object.freeze({
    schema:"void_buy_void_enforcement_final_protected_v7_v2_candidate_v5",
    marker:MARKER,
    version:5,
    repository:"6ZoSo9/void-node",
    composition_parent:PARENT,
    repository_head_sha:git(["rev-parse","HEAD"]),
    repository_tree_sha:git(["rev-parse","HEAD^{tree}"]),
    hosted_composition_evidence:HOSTED_COMPOSITION,
    composition_evidence:Object.freeze({
      proof_path:COMPOSITION_PROOF,
      proof_git_blob_sha1:COMPOSITION_PROOF_BLOB,
      document_path:COMPOSITION_DOC,
      document_git_blob_sha1:COMPOSITION_DOC_BLOB,
      workflow_path:COMPOSITION_WORKFLOW,
      workflow_git_blob_sha1:COMPOSITION_WORKFLOW_BLOB,
      accepted_v4_lock_preserved:true,
      canonical_v5_exact_bytes_reused:true,
      protected_inventory_mismatch_count:1,
      protected_inventory_mismatch_path:RUNNER,
    }),
    predecessor_candidate:Object.freeze({
      path:CANDIDATE_V4,
      git_blob_sha1:CANDIDATE_V4_BLOB,
      candidate_enforcement_set_sha256:ACCEPTED_V4_SET,
      complete_executable_closure_verified:true,
      candidate_enforcement_identity_accepted:false,
      historical_identity_preserved:true,
    }),
    accepted_predecessor_lock:Object.freeze({
      path:LOCK_V4,
      git_blob_sha1:LOCK_V4_BLOB,
      accepted_candidate_enforcement_set_sha256:ACCEPTED_V4_SET,
      candidate_enforcement_identity_accepted:true,
      complete_executable_closure_verified:true,
      historical_identity_preserved:true,
    }),
    candidate_evidence_surface:Object.freeze({
      derivation_proof_path:SELF,
      derivation_proof_git_blob_sha1:git(["rev-parse","HEAD:"+SELF]),
      document_path:DOC,
      document_git_blob_sha1:git(["rev-parse","HEAD:"+DOC]),
      workflow_path:WORKFLOW,
      workflow_git_blob_sha1:git(["rev-parse","HEAD:"+WORKFLOW]),
    }),
    current_enforcement_tracked_source_inventory_v1:currentInventory,
    current_enforcement_tracked_source_inventory_count:49,
    current_enforcement_tracked_source_inventory_sha256:inventorySha256,
    current_enforcement_tracked_source_inventory_verified:true,
    canonical_producer_v5:Object.freeze({
      runner_path:RUNNER,
      predecessor_runner_git_blob_sha1:RUNNER_V4_BLOB,
      runner_git_blob_sha1:RUNNER_V5_BLOB,
      runner_git_mode:"100755",
      guard_path:V5_GUARD,
      guard_git_blob_sha1:V5_GUARD_BLOB,
      dispatch_path:V5_DISPATCH,
      dispatch_git_blob_sha1:V5_DISPATCH_BLOB,
      observer_proof_path:V5_OBSERVER,
      observer_proof_git_blob_sha1:V5_OBSERVER_BLOB,
      index_git_blob_sha1:INDEX_BLOB,
      source_generation_selector_requalified:true,
      observer_behavior_requalified:true,
      obsolete_generation_refusal_requalified:true,
    }),
    executable_closure_transition:Object.freeze({
      predecessor_complete_executable_closure_verified:true,
      protected_source_delta_count:1,
      changed_protected_paths:Object.freeze([RUNNER]),
      changed_protected_path_semantics_requalified:true,
      transition_exact:true,
    }),
    complete_executable_closure_verified:true,
    candidate_enforcement_identity_accepted:false,
    deployed_artifact_generation_verified:false,
    runtime_mount_authority:false,
    production_source_finality_authority_ready:false,
    deployment_receipt_reissue_required:true,
    public_presale_activation:false,
    funds_movement:false,
  });
  return Object.freeze({
    ...body,
    candidate_enforcement_set_sha256:sha256(Buffer.from(canonical(body),"utf8")),
  });
}

const args=process.argv.slice(2);
if(args.length===1&&args[0]==="--derive"){
  process.stdout.write(JSON.stringify(derive(),null,2)+"\n");
}else if(args.length===1&&args[0]==="--reader-self-test"){
  readerSelfTest();console.log("VOID_BUY_VOID_V5_CANDIDATE_READER_SELF_TEST_GREEN");
}else if(args.length===0||(args.length===1&&args[0]==="--self-test")){
  const c=derive();
  assert.match(c.candidate_enforcement_set_sha256,/^[0-9a-f]{64}$/u);
  assert.equal(c.current_enforcement_tracked_source_inventory_count,49);
  assert.equal(c.executable_closure_transition.protected_source_delta_count,1);
  assert.equal(c.complete_executable_closure_verified,true);
  assert.equal(c.candidate_enforcement_identity_accepted,false);
  console.log(MARKER+"_GREEN");
  console.log("candidate_enforcement_set_sha256="+c.candidate_enforcement_set_sha256);
  console.log("accepted_v4_lock_preserved=true");
  console.log("canonical_v5_semantics_requalified=true");
  console.log("protected_source_delta_count=1");
  console.log("candidate_enforcement_identity_accepted=false");
  console.log("deployed_artifact_generation_verified=false");
  console.log("runtime_mount_authority=false");
  console.log("production_source_finality_authority_ready=false");
  console.log("deployment_receipt_reissue_required=true");
  console.log("public_presale_activation=false");
  console.log("funds_movement=false");
}else{
  throw Error("usage: proof [--self-test|--reader-self-test|--derive]");
}
