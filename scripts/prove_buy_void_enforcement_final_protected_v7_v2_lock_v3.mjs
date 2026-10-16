#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const MARKER="VOID_BUY_VOID_ENFORCEMENT_FINAL_PROTECTED_V7_V2_LOCK_V3";

const CANDIDATE_HEAD="cf9aabcc5c1e904938c786a61ca66e0c9fdc0be6";
const CANDIDATE_PROOF=
  "scripts/prove_buy_void_enforcement_final_protected_v7_v2_candidate_v3.mjs";
const CANDIDATE_PROOF_BLOB="a2872ca1a4b0458144a24a6b851e2b218eacd27d";
const PROJECTION=
  "ops/security/buy-void-enforcement-final-protected-v7-v2-candidate-v3-lock-projection-v1.json";
const PROJECTION_BLOB="d6ccd1e19ba5454b69e76242088b342f4ae5331e";
const PROJECTION_BYTES=8157;
const PROJECTION_SHA256=
  "1f0a25214b778b24c1f920cd2f875b36b9d13b118944280c337268b308444eab";

const FULL_CANDIDATE_BYTES=24178;
const FULL_CANDIDATE_SHA256=
  "d882529c2791bf9073b50aebbf751e54dc36c2a954b5b4f29044474d829289d7";
const FULL_CANDIDATE_BLOB="101433562c848fbb279d08b039239d56a299c4db";
const CANDIDATE_SET=
  "75fe0351276ed21b7231b3dd9b50f3d4d6b68ad930b508a1f1f7fdb18d2063c4";

const CANDIDATE_WORKFLOW_RUN=38978151185;
const CANDIDATE_ARTIFACTS=Object.freeze({
  22:12079722793,
  24:12079364829,
  26:12079344798,
});
const CANDIDATE_CROSS_NODE_JOB=117232972440;

const V5_CENSUS_ID=
  "voidbefv7c5_5c022759d732fec4f42907c11451f7b90036ac823ef4fc090642eab700417966";
const V5_CENSUS_JSON_SHA256=
  "ba572e907372c1873f5b7f7e994b8b5dce607791ebb5d4974de94a46764c5337";
const PROTECTED_INVENTORY_SHA256=
  "6b108cd4a41a46a2f26cad072bfea013707011cd1a13c083f7176e04f041934e";

const PREDECESSOR_LOCK=
  "ops/security/buy-void-enforcement-final-protected-v7-v2-lock-v2.json";
const PREDECESSOR_LOCK_BLOB="589845615654da8b688764377b34296267ac0063";
const PREDECESSOR_SET=
  "05d7648032223f74a05d89200ef23a76a5265ef2a3a26e52c7f51ce3b33bc852";

const LOCK="ops/security/buy-void-enforcement-final-protected-v7-v2-lock-v3.json";
const LOCK_DOC="docs/architecture/buy-void-enforcement-final-protected-v7-v2-lock-v3.md";
const SELF="scripts/prove_buy_void_enforcement_final_protected_v7_v2_lock_v3.mjs";
const WORKFLOW=".github/workflows/buy-void-enforcement-final-protected-v7-v2-lock-v3.yml";

const EXPECTED_DELTA=Object.freeze([
  PROJECTION,LOCK,LOCK_DOC,SELF,WORKFLOW,
].sort());
const WORKFLOW_TRIGGER_PATHS=Object.freeze([
  PROJECTION,LOCK,LOCK_DOC,SELF,
]);

const sha256=b=>crypto.createHash("sha256").update(b).digest("hex");
const gitBlob=b=>crypto.createHash("sha1")
  .update(Buffer.from("blob "+b.length+"\0","utf8")).update(b).digest("hex");

function run(command,args,{cwd=ROOT,timeout=300000,encoding=null}={}){
  const r=spawnSync(command,args,{
    cwd,encoding,stdio:["ignore","pipe","pipe"],timeout,
    maxBuffer:64*1024*1024,
    env:{
      PATH:"/usr/bin:/bin",HOME:"/nonexistent",LANG:"C",LC_ALL:"C",TZ:"UTC",
      NODE_ENV:"test",GIT_CONFIG_NOSYSTEM:"1",GIT_CONFIG_GLOBAL:"/dev/null",
      GIT_CONFIG_SYSTEM:"/dev/null",GIT_NO_REPLACE_OBJECTS:"1",
      GIT_OPTIONAL_LOCKS:"0",GIT_TERMINAL_PROMPT:"0",
    },
  });
  assert.equal(r.error,undefined,String(r.error||""));
  assert.equal(r.status,0,String(r.stderr||r.stdout||""));
  return r;
}
function git(args,cwd=ROOT){
  return String(run("/usr/bin/git",[
    "--no-replace-objects","-c","core.hooksPath=/dev/null",
    "-c","core.fsmonitor=false","-C",cwd,...args,
  ],{cwd,timeout:30000,encoding:"utf8"}).stdout||"").trim();
}
function readExact(relative,max=1024*1024){
  const absolute=path.join(ROOT,...relative.split("/"));
  const before=fs.lstatSync(absolute);
  assert.ok(before.isFile()&&!before.isSymbolicLink()&&before.nlink===1&&
    before.size>0&&before.size<=max,"invalid_file:"+relative);
  const bytes=fs.readFileSync(absolute);
  const after=fs.lstatSync(absolute);
  assert.equal(bytes.length,before.size,"short_read:"+relative);
  for(const key of ["dev","ino","size","mtimeMs","ctimeMs","nlink"]){
    assert.equal(after[key],before[key],"file_changed:"+relative+":"+key);
  }
  return bytes;
}
function pin(relative,blob,max=1024*1024){
  const bytes=readExact(relative,max);
  assert.equal(gitBlob(bytes),blob,"git_blob_drift:"+relative);
  assert.equal(git(["rev-parse","HEAD:"+relative]),blob,"head_blob_drift:"+relative);
  return bytes;
}
function verifyBranchDelta(){
  git(["merge-base","--is-ancestor",CANDIDATE_HEAD,"HEAD"]);
  assert.equal(
    git(["rev-parse",CANDIDATE_HEAD+":"+CANDIDATE_PROOF]),
    CANDIDATE_PROOF_BLOB,
    "candidate_proof_blob_drift",
  );
  const changed=git(["diff","--name-only",CANDIDATE_HEAD,"HEAD","--"])
    .split("\n").filter(Boolean).sort();
  assert.deepEqual(changed,EXPECTED_DELTA,"lock_branch_scope_drift");
}
function verifyWorkflowTriggers(){
  const source=readExact(WORKFLOW,256*1024).toString("utf8");
  for(const relative of WORKFLOW_TRIGGER_PATHS){
    const exact='      - "'+relative+'"';
    assert.equal(source.split(exact).length-1,2,
      "lock_workflow_trigger_dependency_count:"+relative);
  }
}
function projection(){
  const bytes=pin(PROJECTION,PROJECTION_BLOB,64*1024);
  assert.equal(bytes.length,PROJECTION_BYTES);
  assert.equal(sha256(bytes),PROJECTION_SHA256);
  const p=JSON.parse(bytes.toString("utf8"));
  assert.deepEqual(Object.keys(p).sort(),[
    "candidate_enforcement_identity_accepted",
    "candidate_enforcement_set_sha256",
    "candidate_head",
    "complete_executable_closure_verified",
    "current_enforcement_tracked_source_inventory_v1",
    "deployed_artifact_generation_verified",
    "full_candidate_evidence",
    "funds_movement",
    "marker",
    "production_source_finality_authority_ready",
    "public_presale_activation",
    "repository",
    "runtime_mount_authority",
    "schema",
    "version",
  ]);
  assert.equal(
    p.schema,
    "void_buy_void_enforcement_final_protected_v7_v2_candidate_v3_lock_projection_v1",
  );
  assert.equal(
    p.marker,
    "VOID_BUY_VOID_ENFORCEMENT_FINAL_PROTECTED_V7_V2_CANDIDATE_V3_LOCK_PROJECTION_V1",
  );
  assert.equal(p.version,1);
  assert.equal(p.repository,"6ZoSo9/void-node");
  assert.equal(p.candidate_head,CANDIDATE_HEAD);
  assert.equal(p.candidate_enforcement_set_sha256,CANDIDATE_SET);
  assert.equal(p.complete_executable_closure_verified,true);
  assert.equal(p.candidate_enforcement_identity_accepted,false);
  assert.equal(p.deployed_artifact_generation_verified,false);
  assert.equal(p.runtime_mount_authority,false);
  assert.equal(p.production_source_finality_authority_ready,false);
  assert.equal(p.public_presale_activation,false);
  assert.equal(p.funds_movement,false);
  assert.equal(p.full_candidate_evidence?.workflow_run,CANDIDATE_WORKFLOW_RUN);
  assert.equal(
    p.full_candidate_evidence?.candidate_json_bytes,
    FULL_CANDIDATE_BYTES,
  );
  assert.equal(
    p.full_candidate_evidence?.candidate_json_sha256,
    FULL_CANDIDATE_SHA256,
  );
  assert.equal(
    p.full_candidate_evidence?.candidate_json_git_blob_sha1,
    FULL_CANDIDATE_BLOB,
  );
  assert.equal(p.current_enforcement_tracked_source_inventory_v1?.length,49);
  return Object.freeze({bytes,value:p});
}
function predecessorLock(){
  const bytes=pin(PREDECESSOR_LOCK,PREDECESSOR_LOCK_BLOB,64*1024);
  const p=JSON.parse(bytes.toString("utf8"));
  assert.equal(p.candidate_enforcement_identity_accepted,true);
  assert.equal(
    p.candidate_evidence?.candidate_enforcement_set_sha256,
    PREDECESSOR_SET,
  );
  assert.equal(p.production_source_finality_authority_ready,false);
  assert.equal(p.public_presale_activation,false);
  assert.equal(p.funds_movement,false);
  return p;
}
function deriveFullCandidate(){
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"void-v3-lock-rederive-"));
  let added=false;
  try{
    git(["worktree","add","--detach",tmp,CANDIDATE_HEAD]);
    added=true;

    const proofBytes=fs.readFileSync(path.join(tmp,...CANDIDATE_PROOF.split("/")));
    assert.equal(gitBlob(proofBytes),CANDIDATE_PROOF_BLOB,
      "detached_candidate_proof_blob");

    run("/usr/bin/npm",["ci","--ignore-scripts","--no-audit","--no-fund"],
      {cwd:tmp,timeout:300000});
    run("/usr/bin/npm",["run","typecheck"],{cwd:tmp,timeout:300000});
    run("/usr/bin/npm",["run","build"],{cwd:tmp,timeout:300000});

    const r=run(process.execPath,[
      path.join(tmp,...CANDIDATE_PROOF.split("/")),"--derive",
    ],{cwd:tmp,timeout:300000});
    const bytes=Buffer.from(r.stdout||Buffer.alloc(0));
    assert.equal(bytes.length,FULL_CANDIDATE_BYTES,"full_candidate_bytes");
    assert.equal(sha256(bytes),FULL_CANDIDATE_SHA256,"full_candidate_sha256");
    assert.equal(gitBlob(bytes),FULL_CANDIDATE_BLOB,"full_candidate_git_blob");
    const c=JSON.parse(bytes.toString("utf8"));
    assert.equal(
      c.schema,
      "void_buy_void_enforcement_final_protected_v7_v2_candidate_v3",
    );
    assert.equal(c.candidate_enforcement_set_sha256,CANDIDATE_SET);
    assert.equal(c.complete_executable_closure_verified,true);
    assert.equal(c.candidate_enforcement_identity_accepted,false);
    assert.equal(c.current_enforcement_tracked_source_inventory_v1?.length,49);
    assert.equal(
      c.current_enforcement_tracked_source_inventory_sha256,
      PROTECTED_INVENTORY_SHA256,
    );
    assert.equal(
      c.hosted_protected_census?.census_id,
      V5_CENSUS_ID,
    );
    assert.equal(c.deployed_artifact_generation_verified,false);
    assert.equal(c.runtime_mount_authority,false);
    assert.equal(c.production_source_finality_authority_ready,false);
    assert.equal(c.public_presale_activation,false);
    assert.equal(c.funds_movement,false);
    return Object.freeze({bytes,value:c});
  }finally{
    if(added){
      try{git(["worktree","remove","--force",tmp]);}catch{}
    }
    try{fs.rmSync(tmp,{recursive:true,force:true});}catch{}
  }
}
function verifyProjectionAgainstFull(p,c){
  assert.equal(p.candidate_head,CANDIDATE_HEAD);
  assert.equal(p.candidate_enforcement_set_sha256,c.candidate_enforcement_set_sha256);
  assert.equal(
    p.complete_executable_closure_verified,
    c.complete_executable_closure_verified,
  );
  assert.equal(
    p.candidate_enforcement_identity_accepted,
    c.candidate_enforcement_identity_accepted,
  );
  assert.equal(
    p.deployed_artifact_generation_verified,
    c.deployed_artifact_generation_verified,
  );
  assert.equal(p.runtime_mount_authority,c.runtime_mount_authority);
  assert.equal(
    p.production_source_finality_authority_ready,
    c.production_source_finality_authority_ready,
  );
  assert.equal(p.public_presale_activation,c.public_presale_activation);
  assert.equal(p.funds_movement,c.funds_movement);
  assert.deepEqual(
    p.current_enforcement_tracked_source_inventory_v1,
    c.current_enforcement_tracked_source_inventory_v1,
    "projection_inventory_not_exact_full_candidate",
  );
}
function expectedLock(){
  return {
    schema:"void_buy_void_enforcement_final_protected_v7_v2_lock_v3",
    marker:"VOID_BUY_VOID_ENFORCEMENT_FINAL_PROTECTED_V7_V2_LOCK_V3",
    version:3,
    repository:"6ZoSo9/void-node",
    candidate_head:CANDIDATE_HEAD,
    candidate_hosted_evidence:{
      workflow_run:CANDIDATE_WORKFLOW_RUN,
      node22_artifact_id:CANDIDATE_ARTIFACTS[22],
      node24_artifact_id:CANDIDATE_ARTIFACTS[24],
      node26_artifact_id:CANDIDATE_ARTIFACTS[26],
      cross_node_job:CANDIDATE_CROSS_NODE_JOB,
      three_node_byte_identity_verified:true,
      independent_rederivation_verified:true,
    },
    full_candidate_evidence:{
      bytes:FULL_CANDIDATE_BYTES,
      sha256:FULL_CANDIDATE_SHA256,
      git_blob_sha1:FULL_CANDIDATE_BLOB,
      candidate_enforcement_set_sha256:CANDIDATE_SET,
      independently_rederived_from_candidate_head:true,
    },
    candidate_evidence:{
      path:PROJECTION,
      derivation_proof_path:CANDIDATE_PROOF,
      derivation_proof_git_blob_sha1:CANDIDATE_PROOF_BLOB,
      bytes:PROJECTION_BYTES,
      sha256:PROJECTION_SHA256,
      git_blob_sha1:PROJECTION_BLOB,
      candidate_enforcement_set_sha256:CANDIDATE_SET,
    },
    protected_census_evidence:{
      census_id:V5_CENSUS_ID,
      census_json_sha256:V5_CENSUS_JSON_SHA256,
      protected_tracked_source_inventory_canonical_sha256:
        PROTECTED_INVENTORY_SHA256,
    },
    predecessor_lock_evidence:{
      path:PREDECESSOR_LOCK,
      git_blob_sha1:PREDECESSOR_LOCK_BLOB,
      candidate_enforcement_set_sha256:PREDECESSOR_SET,
      historical_identity_preserved:true,
    },
    current_enforcement_tracked_source_inventory_sha256:
      PROTECTED_INVENTORY_SHA256,
    complete_executable_closure_verified:true,
    current_enforcement_tracked_source_inventory_verified:true,
    candidate_enforcement_identity_accepted:true,
    deployed_artifact_generation_verified:false,
    runtime_mount_authority:false,
    production_source_finality_authority_ready:false,
    public_presale_activation:false,
    funds_movement:false,
  };
}
function verify(){
  verifyBranchDelta();
  verifyWorkflowTriggers();
  predecessorLock();
  const projected=projection();
  const full=deriveFullCandidate();
  verifyProjectionAgainstFull(projected.value,full.value);

  const expected=Buffer.from(JSON.stringify(expectedLock(),null,2)+"\n","utf8");
  const actual=readExact(LOCK,64*1024);
  assert.ok(actual.equals(expected),"lock_manifest_not_exact");
  return expected;
}

const args=process.argv.slice(2);
if(args.length===1&&args[0]==="--derive"){
  process.stdout.write(verify());
}else if(args.length===0||(args.length===1&&args[0]==="--self-test")){
  const bytes=verify();
  console.log(MARKER+"_GREEN");
  console.log("full_candidate_json_sha256="+FULL_CANDIDATE_SHA256);
  console.log("full_candidate_git_blob_sha1="+FULL_CANDIDATE_BLOB);
  console.log("candidate_projection_git_blob_sha1="+PROJECTION_BLOB);
  console.log("candidate_enforcement_set_sha256="+CANDIDATE_SET);
  console.log("protected_census_id="+V5_CENSUS_ID);
  console.log("projection_exact_full_candidate_inventory=true");
  console.log("full_candidate_independently_rederived=true");
  console.log("lock_json_sha256="+sha256(bytes));
  console.log("complete_executable_closure_verified=true");
  console.log("current_enforcement_tracked_source_inventory_verified=true");
  console.log("candidate_enforcement_identity_accepted=true");
  console.log("deployed_artifact_generation_verified=false");
  console.log("runtime_mount_authority=false");
  console.log("production_source_finality_authority_ready=false");
  console.log("public_presale_activation=false");
  console.log("funds_movement=false");
}else{
  throw Error("usage: proof [--self-test|--derive]");
}
