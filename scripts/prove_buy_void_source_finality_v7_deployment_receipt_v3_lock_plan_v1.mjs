#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const BASE="87b423bb910a6356cde6c0b269b10d2ce4bb8434";
const SELF="scripts/prove_buy_void_source_finality_v7_deployment_receipt_v3_lock_plan_v1.mjs";
const DOC="docs/architecture/buy-void-source-finality-v7-deployment-receipt-v3-lock-plan-v1.md";
const WORKFLOW=".github/workflows/buy-void-source-finality-v7-deployment-receipt-v3-lock-plan-v1.yml";
const TOOL="ops/precision/void_buy_void_source_finality_v7_deployment_receipt_install_v1.ts";
const TOOL_BLOB="3de6e4bd1f9aa2e9c0a0889cc7c0ab489cb306c0";
const TOOL_PROOF="scripts/prove_buy_void_source_finality_v7_deployment_receipt_install_v1.ts";
const TOOL_PROOF_BLOB="c755e5f4e0484486b49193a8381fa09a9e6cb9f1";
const PROVENANCE="src/economic/buy_void_source_finality_generation_provenance_v7.ts";
const PROVENANCE_BLOB="390ff1a2ff0437cd8c8693e7807c12275df42573";
const LOCK_V3="ops/security/buy-void-enforcement-final-protected-v7-v2-lock-v3.json";
const LOCK_V3_BLOB="245ce93ebfb53478211fab765489e88d8fa23c4a";
const LOCK_V3_PROOF="scripts/prove_buy_void_enforcement_final_protected_v7_v2_lock_v3.mjs";
const LOCK_V3_PROOF_BLOB="12d94e2d89fea2a383d2279ec2b8e9b7802c7351";
const CANDIDATE_V3="ops/security/buy-void-enforcement-final-protected-v7-v2-candidate-v3.json";
const CANDIDATE_V3_BLOB="79998af4763b6afca84ffe4e8d14d9a6ff535dfd";
const LOCK_V2="ops/security/buy-void-enforcement-final-protected-v7-v2-lock-v2.json";
const LOCK_V2_BLOB="589845615654da8b688764377b34296267ac0063";
const V3_SET="95a11602e5f2639d33b378293b92863ea7f9f37020ad18dec49d3d4ac6289fd4";
const V3_INVENTORY="c0a56b378215feafacc089e9f59a9f966d57f11e5582e4a13afcd6351d2447bb";
const EXPECTED_DELTA=Object.freeze([SELF,DOC,WORKFLOW].sort());

const sha256=b=>crypto.createHash("sha256").update(b).digest("hex");
const gitBlob=b=>crypto.createHash("sha1").update(Buffer.from("blob "+b.length+"\0","utf8")).update(b).digest("hex");
function run(command,args,{timeout=30000}={}){
  const r=spawnSync(command,args,{
    cwd:ROOT,encoding:null,stdio:["ignore","pipe","pipe"],timeout,maxBuffer:16*1024*1024,
    env:{PATH:"/usr/bin:/bin",HOME:"/nonexistent",LANG:"C",LC_ALL:"C",TZ:"UTC",NODE_ENV:"test",
      GIT_CONFIG_NOSYSTEM:"1",GIT_CONFIG_GLOBAL:"/dev/null",GIT_CONFIG_SYSTEM:"/dev/null",
      GIT_NO_REPLACE_OBJECTS:"1",GIT_OPTIONAL_LOCKS:"0",GIT_TERMINAL_PROMPT:"0"}
  });
  assert.equal(r.error,undefined,String(r.error||""));
  assert.equal(r.status,0,String(r.stderr||r.stdout||""));
  return r;
}
const git=args=>String(run("/usr/bin/git",["--no-replace-objects","-C",ROOT,...args]).stdout||"").trim();
const STAT_ID_FIELDS=Object.freeze(["dev","ino","size","mtimeMs","ctimeMs","nlink","mode"]);
function requireSameStat(actual,expected,label){
  for(const k of STAT_ID_FIELDS)assert.equal(actual[k],expected[k],label+":"+k);
}
function readExactAt(root,relative,max=2*1024*1024,{beforeOpen=null}={}){
  assert.equal(path.isAbsolute(relative),false,"absolute_path:"+relative);
  assert.equal(relative.split("/").some(p=>!p||p==="."||p===".."),false,"unsafe_path:"+relative);
  assert.ok(Number.isSafeInteger(max)&&max>0,"invalid_max:"+relative);
  const absolute=path.join(root,...relative.split("/"));
  const before=fs.lstatSync(absolute);
  assert.ok(before.isFile()&&!before.isSymbolicLink()&&before.nlink===1&&before.size>0&&before.size<=max,"invalid_file:"+relative);
  if(beforeOpen!==null)beforeOpen(absolute,before);
  let fd=-1;
  try{
    fd=fs.openSync(absolute,fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW);
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

    const after=fs.fstatSync(fd);
    requireSameStat(after,opened,"file_descriptor_generation_changed:"+relative);
    const visible=fs.lstatSync(absolute);
    requireSameStat(visible,opened,"file_visible_generation_changed:"+relative);
    return Buffer.concat(chunks,total);
  }finally{
    if(fd>=0)fs.closeSync(fd);
  }
}
const readExact=(relative,max=2*1024*1024)=>readExactAt(ROOT,relative,max);

function proveReadExactBoundary(){
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),"void-v3-lock-plan-readexact-"));
  try{
    const dep=path.join(temp,"dep");
    fs.writeFileSync(dep,"good",{mode:0o600});
    assert.equal(readExactAt(temp,"dep",8).toString("utf8"),"good");

    assert.throws(
      ()=>readExactAt(temp,"dep",8,{beforeOpen:absolute=>{
        const moved=absolute+".old";
        fs.renameSync(absolute,moved);
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
    fs.writeFileSync(dep,"123456789",{mode:0o600});
    assert.throws(()=>readExactAt(temp,"dep",8),/invalid_file:dep/);
  }finally{
    fs.rmSync(temp,{recursive:true,force:true});
  }
}
function verifyBranch(){
  git(["merge-base","--is-ancestor",BASE,"HEAD"]);
  assert.equal(git(["merge-base",BASE,"HEAD"]),BASE,"base_not_exact_merge_base");
  const changed=git(["diff","--name-only",BASE,"HEAD","--"]).split("\n").filter(Boolean).sort();
  assert.deepEqual(changed,EXPECTED_DELTA,"deployment_plan_successor_scope_drift");
  for(const [relative,blob] of [
    [TOOL,TOOL_BLOB],[TOOL_PROOF,TOOL_PROOF_BLOB],[PROVENANCE,PROVENANCE_BLOB],
    [LOCK_V3,LOCK_V3_BLOB],[LOCK_V3_PROOF,LOCK_V3_PROOF_BLOB],
    [CANDIDATE_V3,CANDIDATE_V3_BLOB],[LOCK_V2,LOCK_V2_BLOB],
  ])assert.equal(git(["rev-parse","HEAD:"+relative]),blob,"dependency_blob_drift:"+relative);
}
function validateV3(){
  const lockBytes=readExact(LOCK_V3,256*1024);
  assert.equal(gitBlob(lockBytes),LOCK_V3_BLOB);
  const lock=JSON.parse(lockBytes.toString("utf8"));
  assert.equal(lock.schema,"void_buy_void_enforcement_final_protected_v7_v2_lock_v3");
  assert.equal(lock.marker,"VOID_BUY_VOID_ENFORCEMENT_FINAL_PROTECTED_V7_V2_LOCK_V3");
  assert.equal(lock.version,3);assert.equal(lock.repository,"6ZoSo9/void-node");
  assert.equal(lock.candidate_head,"a93016c2e1b0656e9abe8a7607bc35c6cf94eb37");
  assert.equal(lock.candidate_evidence?.git_blob_sha1,CANDIDATE_V3_BLOB);
  assert.equal(lock.candidate_evidence?.candidate_enforcement_set_sha256,V3_SET);
  assert.equal(lock.current_enforcement_tracked_source_inventory_sha256,V3_INVENTORY);
  assert.equal(lock.current_enforcement_tracked_source_inventory_verified,true);
  assert.equal(lock.complete_executable_closure_verified,true);
  assert.equal(lock.candidate_enforcement_identity_accepted,true);
  assert.equal(lock.deployed_artifact_generation_verified,false);
  assert.equal(lock.runtime_mount_authority,false);
  assert.equal(lock.production_source_finality_authority_ready,false);
  assert.equal(lock.public_presale_activation,false);
  assert.equal(lock.funds_movement,false);

  const candidateBytes=readExact(CANDIDATE_V3,64*1024);
  assert.equal(gitBlob(candidateBytes),CANDIDATE_V3_BLOB);
  assert.equal(candidateBytes.length,lock.candidate_evidence.bytes);
  assert.equal(sha256(candidateBytes),lock.candidate_evidence.sha256);
  const candidate=JSON.parse(candidateBytes.toString("utf8"));
  assert.equal(candidate.candidate_enforcement_set_sha256,V3_SET);
  assert.equal(candidate.current_enforcement_tracked_source_inventory_sha256,V3_INVENTORY);
  assert.equal(candidate.current_enforcement_tracked_source_inventory_count,49);
  assert.equal(candidate.current_enforcement_tracked_source_inventory_v1?.length,49);
  assert.equal(candidate.complete_executable_closure_verified,true);
  assert.equal(candidate.candidate_enforcement_identity_accepted,false);
  assert.equal(candidate.deployed_artifact_generation_verified,false);
  assert.equal(candidate.runtime_mount_authority,false);
  assert.equal(candidate.production_source_finality_authority_ready,false);
  assert.equal(candidate.public_presale_activation,false);
  assert.equal(candidate.funds_movement,false);
}
function validateHistoricalV2(){
  const lock=JSON.parse(readExact(LOCK_V2,256*1024).toString("utf8"));
  assert.equal(lock.marker,"VOID_BUY_VOID_ENFORCEMENT_FINAL_PROTECTED_V7_V2_LOCK_V2");
  assert.equal(lock.candidate_enforcement_identity_accepted,true);
  assert.equal(lock.deployed_artifact_generation_verified,false);
  assert.equal(lock.production_source_finality_authority_ready,false);
  assert.equal(lock.public_presale_activation,false);
  assert.equal(lock.funds_movement,false);
}
function validateTool(){
  const source=readExact(TOOL,256*1024).toString("utf8");
  for(const token of [
    "export function inspectAcceptedEnforcementLockV1(",
    "assertBuyVoidCandidateCurrentEnforcementTrackedSourceInventoryV1(",
    "accepted_enforcement_lock_path",
    "candidate_enforcement_identity_accepted",
    "deployed_artifact_generation_verified",
    "runtime_mount_authority",
    "production_source_finality_authority_ready",
    "public_presale_activation",
    "funds_movement",
    "status=PLAN_GREEN",
  ])assert.ok(source.includes(token),"deployment_tool_contract_missing:"+token);
  assert.equal(source.includes("buy-void-enforcement-final-protected-v7-v2-lock-v2.json"),false,
    "deployment_tool_hardcodes_v2_lock");
  assert.equal(source.includes("buy-void-enforcement-final-protected-v7-v2-lock-v3.json"),false,
    "deployment_tool_hardcodes_v3_lock");
}
proveReadExactBoundary();verifyBranch();validateV3();validateHistoricalV2();validateTool();
console.log("VOID_BUY_VOID_SOURCE_FINALITY_V7_DEPLOYMENT_RECEIPT_V3_LOCK_PLAN_V1_PROOF_GREEN");
console.log("base_lock_head="+BASE);
console.log("deployment_tool_blob="+TOOL_BLOB);
console.log("deployment_tool_proof_blob="+TOOL_PROOF_BLOB);
console.log("generation_provenance_v7_blob="+PROVENANCE_BLOB);
console.log("accepted_v3_lock_blob="+LOCK_V3_BLOB);
console.log("accepted_v3_candidate_blob="+CANDIDATE_V3_BLOB);
console.log("historical_v2_lock_blob="+LOCK_V2_BLOB);
console.log("v3_candidate_enforcement_set_sha256="+V3_SET);
console.log("v3_current_inventory_sha256="+V3_INVENTORY);
console.log("deployment_tool_lock_version_agnostic=true");
console.log("descriptor_bounded_read_required=true");
console.log("nofollow_dependency_open_required=true");
console.log("replacement_generation_rejected=true");
console.log("symlink_dependency_rejected=true");
console.log("v3_lock_source_identity_accepted=true");
console.log("historical_v2_lock_preserved=true");
console.log("deployment_apply_performed=false");
console.log("runtime_mount_authority=false");
console.log("production_source_finality_authority_ready=false");
console.log("public_presale_activation=false");
console.log("funds_movement=false");
