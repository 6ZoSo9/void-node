#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const CANDIDATE_HEAD="f3d06b71ad9f6b6c6c7b26ba6001e07e55ae39f2";
const CANDIDATE="ops/security/buy-void-enforcement-final-protected-v7-v2-candidate-v3.json";
const CANDIDATE_PROOF="scripts/prove_buy_void_enforcement_final_protected_v7_v2_candidate_v3.mjs";
const CANDIDATE_PROOF_BLOB="5cd2c9cb4f7ac4f4a71a697d04aa23c3ee9d6705";
const CANDIDATE_BYTES=17392;
const CANDIDATE_SHA256="7f9c032bb3685d0d45f439123878af0ba366bd587e29a98df3270f0f13808c96";
const CANDIDATE_BLOB="40c7d21e0f22bc2ffe079f80360af342f4d8a6aa";
const CANDIDATE_SET="4d06da56a3fa3fa7891c64a0c7191756c344effb62b330a1b003bd4952dc0223";
const LOCK="ops/security/buy-void-enforcement-final-protected-v7-v2-lock-v3.json";
const LOCK_BLOB="f1b9d661eb3363e9bf18dbeb3610c659a54219bb";
const SELF="scripts/prove_buy_void_enforcement_final_protected_v7_v2_lock_v3.mjs";
const DOC="docs/architecture/buy-void-enforcement-final-protected-v7-v2-lock-v3.md";
const WORKFLOW=".github/workflows/buy-void-enforcement-final-protected-v7-v2-candidate-v2.yml";
const CURRENT_PARENT="9d1fba7fc676f3f5592eb7a4dff971cd7045e1b5";
const CURRENT_INVENTORY="65880eb31fd75bc07b8c568ada5a4903a2c178108408e2a8390c15b3cafb7589";
const FROZEN_INVENTORY="224e8c4b63b231e40b1abf4982127a6e2b999724642c4360c10ca21887bbc0a2";
const OLD_INDEX="123ec1792a027f93d4c9030749a0e7e136a75a44";
const NEW_INDEX="a09661797aa4295371c036be36d82995e5233269";
const PROFILE_ID="voidrnpr1_08e05626e80fbd2aecc3018514aaf76e491954f8258fff996f0b2dca1c3055ac";
const PACKAGE_AGGREGATE="77622df7d483bc3f73aa39468246f6860237a3f6749a09a0284644493f3990b6";
const PROFILE_CANONICAL="3493638417e2f02a39bb7c48a08935e299754d7474feb71a5c2a48944d3f1757";
const PROVIDER_CLOSURE="3b6be7b9efdc7f70b6f270f77208efab2f7321136a54cc76a7e1d34c57bd4945";
const PROVIDER_SEMANTIC="95112d913d45b2b03887edb97c8693eef84a72b54b61503ffc66a6a7bce67384";
const V7_DELTA="5c5637207d5970d2ca793cf431726ff8d86db370b3e69e9ff1e5caa25d9b5224";
const RUN=40044451207;
const CROSS_JOB=120724698695;
const ARTIFACTS=Object.freeze({22:12540673158,24:12540507407,26:12540897955});
const EXPECTED_DELTA=Object.freeze([WORKFLOW,DOC,LOCK,SELF].sort());

const sha256=b=>crypto.createHash("sha256").update(b).digest("hex");
const gitBlob=b=>crypto.createHash("sha1").update(Buffer.from("blob "+b.length+"\0","utf8")).update(b).digest("hex");
function run(command,args,{timeout=120000}={}){
  const r=spawnSync(command,args,{cwd:ROOT,encoding:null,stdio:["ignore","pipe","pipe"],timeout,maxBuffer:32*1024*1024,
    env:{PATH:"/usr/bin:/bin",HOME:"/nonexistent",LANG:"C",LC_ALL:"C",TZ:"UTC",NODE_ENV:"test",
      GIT_CONFIG_NOSYSTEM:"1",GIT_CONFIG_GLOBAL:"/dev/null",GIT_CONFIG_SYSTEM:"/dev/null",
      GIT_NO_REPLACE_OBJECTS:"1",GIT_OPTIONAL_LOCKS:"0",GIT_TERMINAL_PROMPT:"0"}});
  assert.equal(r.error,undefined,String(r.error||""));
  assert.equal(r.status,0,String(r.stderr||r.stdout||""));
  return r;
}
const git=args=>String(run("/usr/bin/git",["--no-replace-objects","-C",ROOT,...args],{timeout:30000}).stdout||"").trim();
const STAT_ID_FIELDS=Object.freeze(["dev","ino","size","mtimeMs","ctimeMs","nlink","mode"]);
function requireSameStat(actual,expected,label){
  for(const key of STAT_ID_FIELDS)assert.equal(actual[key],expected[key],label+":"+key);
}
function readExactAt(root,relative,max=1024*1024,{beforeOpen=null}={}){
  assert.equal(path.isAbsolute(relative),false,"absolute_path:"+relative);
  assert.equal(relative.split("/").some(part=>!part||part==="."||part===".."),false,"unsafe_path:"+relative);
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
    requireSameStat(opened,before,"file_open_generation_mismatch:"+relative);

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
    assert.ok(total<=max,"file_size_limit:"+relative);
    assert.equal(total,opened.size,"short_or_grown_read:"+relative);
    requireSameStat(fs.fstatSync(fd),opened,"file_descriptor_generation_changed:"+relative);
    requireSameStat(fs.lstatSync(absolute),opened,"file_visible_generation_changed:"+relative);
    return Buffer.concat(chunks,total);
  }finally{
    if(fd>=0)fs.closeSync(fd);
  }
}
const readExact=(relative,max=1024*1024)=>readExactAt(ROOT,relative,max);

function proveReadExactBoundary(){
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),"void-v3-lock-readexact-"));
  try{
    const dep=path.join(temp,"dep");
    fs.writeFileSync(dep,"good",{mode:0o600});
    assert.equal(readExactAt(temp,"dep",8).toString("utf8"),"good");

    assert.throws(
      ()=>readExactAt(temp,"dep",8,{beforeOpen:absolute=>{
        fs.renameSync(absolute,absolute+".old");
        fs.writeFileSync(absolute,"evil",{mode:0o600});
      }}),
      /file_open_generation_mismatch:dep/
    );

    fs.rmSync(dep,{force:true});
    const target=path.join(temp,"target");
    fs.writeFileSync(target,"good",{mode:0o600});
    fs.symlinkSync("target",dep);
    assert.throws(()=>readExactAt(temp,"dep",8),/invalid_file:dep/);

    fs.rmSync(dep,{force:true});
    fs.writeFileSync(dep,"good",{mode:0o600});
    assert.throws(
      ()=>readExactAt(temp,"dep",8,{beforeOpen:absolute=>{
        fs.renameSync(absolute,absolute+".symlink-race-original");
        fs.symlinkSync("target",absolute);
      }}),
      err=>err&&err.code==="ELOOP"
    );

    fs.rmSync(dep,{force:true});
    fs.writeFileSync(dep,"good",{mode:0o600});
    const beforeFifo=fs.lstatSync(dep);
    assert.throws(
      ()=>readExactAt(temp,"dep",8,{beforeOpen:absolute=>{
        fs.renameSync(absolute,absolute+".fifo-original");
        run("/usr/bin/mkfifo",[absolute],{timeout:5000});
        fs.chmodSync(absolute,0o600);
      }}),
      /invalid_opened_file:dep/
    );
    fs.rmSync(dep,{force:true});
    fs.renameSync(dep+".fifo-original",dep);
    assert.equal(fs.lstatSync(dep).ino,beforeFifo.ino,"fifo_swap_original_not_restored");

    fs.rmSync(dep,{force:true});
    fs.writeFileSync(dep,"123456789",{mode:0o600});
    assert.throws(()=>readExactAt(temp,"dep",8),/invalid_file:dep/);
  }finally{
    fs.rmSync(temp,{recursive:true,force:true});
  }
}
function verifyBranch(){
  git(["merge-base","--is-ancestor",CANDIDATE_HEAD,"HEAD"]);
  assert.equal(git(["merge-base",CANDIDATE_HEAD,"HEAD"]),CANDIDATE_HEAD,"candidate_parent_not_exact_merge_base");
  assert.equal(git(["rev-parse","HEAD:"+CANDIDATE]),CANDIDATE_BLOB,"candidate_blob_drift");
  assert.equal(git(["rev-parse","HEAD:"+CANDIDATE_PROOF]),CANDIDATE_PROOF_BLOB,"candidate_proof_blob_drift");
  assert.equal(git(["rev-parse","HEAD:"+LOCK]),LOCK_BLOB,"lock_blob_drift");
  const changed=git(["diff","--name-only",CANDIDATE_HEAD,"HEAD","--"]).split("\n").filter(Boolean).sort();
  assert.deepEqual(changed,EXPECTED_DELTA,"lock_successor_scope_drift");
}
function validateCandidate(c){
  assert.equal(c.schema,"void_buy_void_enforcement_final_protected_v7_v2_candidate_v3");
  assert.equal(c.marker,"VOID_BUY_VOID_ENFORCEMENT_FINAL_PROTECTED_V7_V2_CANDIDATE_V3");
  assert.equal(c.version,3);assert.equal(c.repository,"6ZoSo9/void-node");
  assert.equal(c.current_enforcement_parent,CURRENT_PARENT);
  assert.equal(c.current_enforcement_tracked_source_inventory_count,49);
  assert.equal(c.current_enforcement_tracked_source_inventory_v1?.length,49);
  assert.equal(c.current_enforcement_tracked_source_inventory_sha256,CURRENT_INVENTORY);
  assert.equal(c.current_enforcement_tracked_source_inventory_verified,true);
  assert.equal(c.audited_package_runtime?.profile_id,PROFILE_ID);
  assert.equal(c.audited_package_runtime?.packages_aggregate_sha256,PACKAGE_AGGREGATE);
  assert.equal(c.audited_package_runtime?.profile_canonical_sha256,PROFILE_CANONICAL);
  assert.equal(c.dependency_provider?.provider_closure_sha256,PROVIDER_CLOSURE);
  assert.equal(c.dependency_provider?.provider_closure_semantic_sha256,PROVIDER_SEMANTIC);
  assert.equal(c.v7_executable_delta?.candidate_generation_sha256,V7_DELTA);
  assert.equal(c.package_runtime_identity_accepted,true);
  assert.equal(c.provider_closure_composed,true);
  assert.equal(c.delivery_route_closure_composed,true);
  assert.equal(c.live_process_v2_static_execution_closure_verified,true);
  assert.equal(c.third_party_package_runtime_closure_verified,true);
  assert.equal(c.complete_executable_closure_verified,true);
  assert.equal(c.candidate_enforcement_set_sha256,CANDIDATE_SET);
  assert.equal(c.candidate_enforcement_identity_accepted,false);
  assert.equal(c.deployed_artifact_generation_verified,false);
  assert.equal(c.runtime_mount_authority,false);
  assert.equal(c.production_source_finality_authority_ready,false);
  assert.equal(c.public_presale_activation,false);assert.equal(c.funds_movement,false);
  const t=c.successor_transition;assert.ok(t&&typeof t==="object"&&!Array.isArray(t));
  assert.equal(t.predecessor_candidate_git_blob_sha1,"4e23ecbb64eb26c14f5ab15af85eb86d59c3a718");
  assert.equal(t.predecessor_lock_git_blob_sha1,"589845615654da8b688764377b34296267ac0063");
  assert.equal(t.dispatch_v2_proof_git_blob_sha1,"5f5e76a594c358639571a190dc48fc9e11fc8b01");
  assert.equal(t.frozen_protected_inventory_sha256,FROZEN_INVENTORY);
  assert.equal(t.reviewed_protected_drift_count,1);
  assert.equal(t.predecessor_index_git_blob_sha1,OLD_INDEX);
  assert.equal(t.current_index_git_blob_sha1,NEW_INDEX);
  assert.equal(t.predecessor_candidate_preserved,true);assert.equal(t.current_candidate_rederived,true);
  return c;
}
function candidateBytes(){
  const bytes=readExact(CANDIDATE,64*1024);
  assert.equal(bytes.length,CANDIDATE_BYTES,"candidate_bytes");
  assert.equal(sha256(bytes),CANDIDATE_SHA256,"candidate_sha256");
  assert.equal(gitBlob(bytes),CANDIDATE_BLOB,"candidate_git_blob");
  return validateCandidate(JSON.parse(bytes.toString("utf8")));
}
function expectedLock(){return {"schema":"void_buy_void_enforcement_final_protected_v7_v2_lock_v3","marker":"VOID_BUY_VOID_ENFORCEMENT_FINAL_PROTECTED_V7_V2_LOCK_V3","version":3,"repository":"6ZoSo9/void-node","candidate_head":"f3d06b71ad9f6b6c6c7b26ba6001e07e55ae39f2","candidate_hosted_evidence":{"workflow_run":40044451207,"node22_artifact_id":12540673158,"node24_artifact_id":12540507407,"node26_artifact_id":12540897955,"cross_node_job_id":120724698695,"cross_node_byte_identity_verified":true,"reachable_history_only_verified":true},"candidate_evidence":{"path":"ops/security/buy-void-enforcement-final-protected-v7-v2-candidate-v3.json","derivation_proof_path":"scripts/prove_buy_void_enforcement_final_protected_v7_v2_candidate_v3.mjs","derivation_proof_git_blob_sha1":"5cd2c9cb4f7ac4f4a71a697d04aa23c3ee9d6705","bytes":17392,"sha256":"7f9c032bb3685d0d45f439123878af0ba366bd587e29a98df3270f0f13808c96","git_blob_sha1":"40c7d21e0f22bc2ffe079f80360af342f4d8a6aa","candidate_enforcement_set_sha256":"4d06da56a3fa3fa7891c64a0c7191756c344effb62b330a1b003bd4952dc0223"},"protected_successor_evidence":{"current_enforcement_parent":"9d1fba7fc676f3f5592eb7a4dff971cd7045e1b5","predecessor_candidate_git_blob_sha1":"4e23ecbb64eb26c14f5ab15af85eb86d59c3a718","predecessor_lock_git_blob_sha1":"589845615654da8b688764377b34296267ac0063","dispatch_v2_proof_git_blob_sha1":"5f5e76a594c358639571a190dc48fc9e11fc8b01","frozen_protected_inventory_sha256":"224e8c4b63b231e40b1abf4982127a6e2b999724642c4360c10ca21887bbc0a2","current_enforcement_tracked_source_inventory_sha256":"65880eb31fd75bc07b8c568ada5a4903a2c178108408e2a8390c15b3cafb7589","reviewed_protected_drift_count":1,"predecessor_index_git_blob_sha1":"123ec1792a027f93d4c9030749a0e7e136a75a44","current_index_git_blob_sha1":"a09661797aa4295371c036be36d82995e5233269","predecessor_candidate_preserved":true,"current_candidate_rederived":true},"audited_package_runtime":{"profile_id":"voidrnpr1_08e05626e80fbd2aecc3018514aaf76e491954f8258fff996f0b2dca1c3055ac","packages_aggregate_sha256":"77622df7d483bc3f73aa39468246f6860237a3f6749a09a0284644493f3990b6","profile_canonical_sha256":"3493638417e2f02a39bb7c48a08935e299754d7474feb71a5c2a48944d3f1757"},"dependency_provider":{"provider_closure_sha256":"3b6be7b9efdc7f70b6f270f77208efab2f7321136a54cc76a7e1d34c57bd4945","provider_closure_semantic_sha256":"95112d913d45b2b03887edb97c8693eef84a72b54b61503ffc66a6a7bce67384"},"v7_executable_delta_candidate_generation_sha256":"5c5637207d5970d2ca793cf431726ff8d86db370b3e69e9ff1e5caa25d9b5224","current_enforcement_tracked_source_inventory_sha256":"65880eb31fd75bc07b8c568ada5a4903a2c178108408e2a8390c15b3cafb7589","complete_executable_closure_verified":true,"current_enforcement_tracked_source_inventory_verified":true,"candidate_enforcement_identity_accepted":true,"deployed_artifact_generation_verified":false,"runtime_mount_authority":false,"production_source_finality_authority_ready":false,"public_presale_activation":false,"funds_movement":false};}
function verifyWorkflow(){
  const source=readExact(WORKFLOW,256*1024).toString("utf8");
  for(const relative of [LOCK,SELF,DOC]){
    const exact='      - "'+relative+'"';
    assert.equal(source.split(exact).length-1,2,"lock_v3_workflow_trigger_count:"+relative);
  }
  assert.ok(source.includes("lock-v3-source-proof:"),"lock_v3_job_missing");
  assert.ok(source.includes("CANDIDATE_HEAD=f3d06b71ad9f6b6c6c7b26ba6001e07e55ae39f2"),"candidate_head_bind_missing");
}
function verify(){
  verifyBranch();verifyWorkflow();candidateBytes();
  const actual=readExact(LOCK,64*1024);
  assert.equal(gitBlob(actual),LOCK_BLOB,"lock_git_blob");
  const expected=Buffer.from(JSON.stringify(expectedLock(),null,2)+"\n","utf8");
  assert.ok(actual.equals(expected),"lock_manifest_not_exact");
  return expected;
}
proveReadExactBoundary();
const args=process.argv.slice(2);
if(args.length===1&&args[0]==="--derive")process.stdout.write(verify());
else if(args.length===0||(args.length===1&&args[0]==="--self-test")){
  const bytes=verify();
  console.log("VOID_BUY_VOID_ENFORCEMENT_FINAL_PROTECTED_V7_V2_LOCK_V3_GREEN");
  console.log("candidate_head="+CANDIDATE_HEAD);
  console.log("candidate_workflow_run="+RUN);
  console.log("candidate_node22_artifact_id="+ARTIFACTS[22]);
  console.log("candidate_node24_artifact_id="+ARTIFACTS[24]);
  console.log("candidate_node26_artifact_id="+ARTIFACTS[26]);
  console.log("candidate_cross_node_job_id="+CROSS_JOB);
  console.log("candidate_json_sha256="+CANDIDATE_SHA256);
  console.log("candidate_git_blob_sha1="+CANDIDATE_BLOB);
  console.log("candidate_enforcement_set_sha256="+CANDIDATE_SET);
  console.log("current_enforcement_tracked_source_inventory_sha256="+CURRENT_INVENTORY);
  console.log("reviewed_protected_drift_count=1");
  console.log("descriptor_bounded_read_required=true");
  console.log("nofollow_dependency_open_required=true");
  console.log("replacement_generation_rejected=true");
  console.log("symlink_swap_race_rejected=true");
  console.log("fifo_swap_nonblocking_rejected=true");
  console.log("candidate_enforcement_identity_accepted=true");
  console.log("deployed_artifact_generation_verified=false");
  console.log("runtime_mount_authority=false");
  console.log("production_source_finality_authority_ready=false");
  console.log("public_presale_activation=false");
  console.log("funds_movement=false");
  console.log("lock_json_sha256="+sha256(bytes));
}else throw Error("usage: proof [--self-test|--derive]");
