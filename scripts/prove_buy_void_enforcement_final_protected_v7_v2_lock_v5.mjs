#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const MARKER="VOID_BUY_VOID_ENFORCEMENT_FINAL_PROTECTED_V7_V2_LOCK_V5";

const CANDIDATE_HEAD="a884c8b69d19523e99da02899ff5fa8ab18e7100";
const CANDIDATE_TREE="d619ec2bde6076f59f35340cd94fa1c0b190e042";
const CANDIDATE_PROOF=
  "scripts/prove_buy_void_enforcement_final_protected_v7_v2_candidate_v5.mjs";
const CANDIDATE_PROOF_BLOB="80f076711b9c955c494cc70effafc3737b9c9c57";

const PROJECTION=
  "ops/security/buy-void-enforcement-final-protected-v7-v2-candidate-v5-lock-projection-v1.json";
const PROJECTION_BLOB="dd849928bc945478a1a8fcf687f374cfca59f4e4";
const PROJECTION_BYTES=8157;
const PROJECTION_SHA256=
  "fd0caed2df8b5e727f9f5f24b97f3d353e8267c6cfab70d70d5acafa48846fd0";

const FULL_CANDIDATE_BYTES=25406;
const FULL_CANDIDATE_SHA256=
  "c712aaeeb6ca4b1d7547542f6542c9e58c37291e73662bf4822f9df7a55af50b";
const FULL_CANDIDATE_BLOB="b625034452da860b3b6419dd317e642edaa35991";
const CANDIDATE_SET=
  "1e31da2afad65e3d1417a4c0f1c8fd9fee903fc3c75af1b93d1db6e2b31f80bf";

const CANDIDATE_WORKFLOW_RUN=38981095232;
const CANDIDATE_ARTIFACTS=Object.freeze({
  22:12081296713,
  24:12081326032,
  26:12081610318,
});
const CANDIDATE_CROSS_NODE_JOB=117242335606;

const V7_CENSUS_ID=
  "voidbefv7c7_1a85dcb768ab6d5348024cec816d82b7f3ac5cc53e738ec2169e78d4021a73a8";
const V7_CENSUS_JSON_SHA256=
  "326b81bf51fa4efa449b01b6b53e244b1d08dd7ea0d859cafd04954f6f4aa1fb";
const V7_CENSUS_JSON_BLOB="92ca40eb9b7bb79f6b56ad87807dc3586a3ce6ec";
const PROTECTED_INVENTORY_SHA256=
  "e7e0625ff47dc4b4c7e0f93e4b75be30d04d9538acc233174c0abc18198b38e3";

const PREDECESSOR_LOCK=
  "ops/security/buy-void-enforcement-final-protected-v7-v2-lock-v3.json";
const PREDECESSOR_LOCK_BLOB="92054f19fed9e8c243eb23321dbcf53fc9227a99";
const PREDECESSOR_SET=
  "bf158923831b21dd1e907c91cd4889afbe9fd8bce221e12b0fa1a2bb0896943d";

const LOCK="ops/security/buy-void-enforcement-final-protected-v7-v2-lock-v5.json";
const LOCK_DOC="docs/architecture/buy-void-enforcement-final-protected-v7-v2-lock-v5.md";
const SELF="scripts/prove_buy_void_enforcement_final_protected_v7_v2_lock_v5.mjs";
const WORKFLOW=".github/workflows/buy-void-enforcement-final-protected-v7-v2-lock-v5.yml";

const EXPECTED_DELTA=Object.freeze([
  PROJECTION,LOCK,LOCK_DOC,SELF,WORKFLOW,
].sort());
const WORKFLOW_TRIGGER_PATHS=Object.freeze([
  PROJECTION,LOCK,LOCK_DOC,SELF,CANDIDATE_PROOF,PREDECESSOR_LOCK,
  "ops/precision/void_buy_void_source_finality_v7_deployment_receipt_install_v1.ts",
]);

const NODE_BIN=path.dirname(process.execPath);
const NPM=path.join(NODE_BIN,"npm");
const sha256=b=>crypto.createHash("sha256").update(b).digest("hex");
const gitBlob=b=>crypto.createHash("sha1")
  .update(Buffer.from("blob "+b.length+"\0","utf8")).update(b).digest("hex");

function run(command,args,{
  cwd=ROOT,timeout=300000,encoding=null,extraEnv=Object.freeze({}),
}={}){
  const r=spawnSync(command,args,{
    cwd,encoding,stdio:["ignore","pipe","pipe"],timeout,
    maxBuffer:64*1024*1024,
    env:{
      PATH:NODE_BIN+":/usr/bin:/bin",
      HOME:"/nonexistent",LANG:"C",LC_ALL:"C",TZ:"UTC",NODE_ENV:"test",
      NODE_OPTIONS:"",
      GIT_CONFIG_NOSYSTEM:"1",GIT_CONFIG_GLOBAL:"/dev/null",
      GIT_CONFIG_SYSTEM:"/dev/null",GIT_NO_REPLACE_OBJECTS:"1",
      GIT_OPTIONAL_LOCKS:"0",GIT_TERMINAL_PROMPT:"0",
      ...extraEnv,
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
  assert.equal(path.isAbsolute(relative),false,"absolute_path:"+relative);
  assert.equal(relative.split("/").some(part=>!part||part==="."||part===".."),false,
    "unsafe_path:"+relative);
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
  assert.equal(git(["rev-parse","HEAD:"+relative]),blob,
    "head_blob_drift:"+relative);
  return bytes;
}
function verifyBranchDelta(){
  git(["merge-base","--is-ancestor",CANDIDATE_HEAD,"HEAD"]);
  assert.equal(
    git(["rev-parse",CANDIDATE_HEAD+"^{tree}"]),
    CANDIDATE_TREE,
    "candidate_tree_drift",
  );
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
    assert.equal(
      source.split(exact).length-1,
      2,
      "lock_workflow_trigger_dependency_count:"+relative,
    );
  }
}
function projection(){
  const bytes=pin(PROJECTION,PROJECTION_BLOB,64*1024);
  assert.equal(bytes.length,PROJECTION_BYTES,"projection_bytes");
  assert.equal(sha256(bytes),PROJECTION_SHA256,"projection_sha256");
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
    "void_buy_void_enforcement_final_protected_v7_v2_candidate_v5_lock_projection_v1",
  );
  assert.equal(
    p.marker,
    "VOID_BUY_VOID_ENFORCEMENT_FINAL_PROTECTED_V7_V2_CANDIDATE_V5_LOCK_PROJECTION_V1",
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
  assert.equal(
    p.marker,
    "VOID_BUY_VOID_ENFORCEMENT_FINAL_PROTECTED_V7_V2_LOCK_V3",
  );
  assert.equal(p.complete_executable_closure_verified,true);
  assert.equal(p.candidate_enforcement_identity_accepted,true);
  assert.equal(
    p.candidate_evidence?.candidate_enforcement_set_sha256,
    PREDECESSOR_SET,
  );
  assert.equal(p.deployed_artifact_generation_verified,false);
  assert.equal(p.runtime_mount_authority,false);
  assert.equal(p.production_source_finality_authority_ready,false);
  assert.equal(p.public_presale_activation,false);
  assert.equal(p.funds_movement,false);
}
function deriveFullCandidate(){
  const holder=fs.mkdtempSync(path.join(os.tmpdir(),"void-v5-lock-rederive-"));
  const wt=path.join(holder,"candidate");
  let added=false;
  try{
    git(["worktree","add","--detach",wt,CANDIDATE_HEAD]);
    added=true;

    const proofBytes=fs.readFileSync(path.join(wt,...CANDIDATE_PROOF.split("/")));
    assert.equal(
      gitBlob(proofBytes),
      CANDIDATE_PROOF_BLOB,
      "detached_candidate_proof_blob",
    );

    const npmHome=path.join(holder,"npm-home");
    const npmCache=path.join(holder,"npm-cache");
    fs.mkdirSync(npmHome,{mode:0o700});
    fs.mkdirSync(npmCache,{mode:0o700});
    const npmEnv=Object.freeze({
      HOME:npmHome,
      npm_config_cache:npmCache,
    });
    run(NPM,["ci","--ignore-scripts","--no-audit","--no-fund"],
      {cwd:wt,timeout:300000,extraEnv:npmEnv});
    run(NPM,["run","typecheck"],
      {cwd:wt,timeout:300000,extraEnv:npmEnv});
    run(NPM,["run","build"],
      {cwd:wt,timeout:300000,extraEnv:npmEnv});

    const r=run(process.execPath,[
      path.join(wt,...CANDIDATE_PROOF.split("/")),"--derive",
    ],{cwd:wt,timeout:300000});
    const bytes=Buffer.from(r.stdout||Buffer.alloc(0));
    assert.equal(bytes.length,FULL_CANDIDATE_BYTES,"full_candidate_bytes");
    assert.equal(sha256(bytes),FULL_CANDIDATE_SHA256,"full_candidate_sha256");
    assert.equal(gitBlob(bytes),FULL_CANDIDATE_BLOB,"full_candidate_git_blob");

    const c=JSON.parse(bytes.toString("utf8"));
    assert.equal(
      c.schema,
      "void_buy_void_enforcement_final_protected_v7_v2_candidate_v5",
    );
    assert.equal(
      c.marker,
      "VOID_BUY_VOID_ENFORCEMENT_FINAL_PROTECTED_V7_V2_CANDIDATE_V5",
    );
    assert.equal(c.version,5);
    assert.equal(c.repository,"6ZoSo9/void-node");
    assert.equal(c.repository_head_sha,CANDIDATE_HEAD);
    assert.equal(c.repository_tree_sha,CANDIDATE_TREE);
    assert.equal(c.candidate_enforcement_set_sha256,CANDIDATE_SET);
    assert.equal(
      c.hosted_protected_census?.census_id,
      V7_CENSUS_ID,
    );
    assert.equal(
      c.hosted_protected_census?.census_json_sha256,
      V7_CENSUS_JSON_SHA256,
    );
    assert.equal(
      c.hosted_protected_census?.census_json_git_blob_sha1,
      V7_CENSUS_JSON_BLOB,
    );
    assert.equal(c.current_enforcement_tracked_source_inventory_v1?.length,49);
    assert.equal(
      c.current_enforcement_tracked_source_inventory_sha256,
      PROTECTED_INVENTORY_SHA256,
    );
    assert.equal(c.current_enforcement_tracked_source_inventory_verified,true);
    assert.equal(
      c.predecessor_enforcement?.accepted_candidate_enforcement_set_sha256,
      PREDECESSOR_SET,
    );
    assert.equal(
      c.executable_closure_transition?.protected_source_delta_count,
      3,
    );
    assert.equal(
      c.executable_closure_transition?.changed_protected_path_semantics_requalified,
      true,
    );
    assert.equal(c.complete_executable_closure_verified,true);
    assert.equal(c.candidate_enforcement_identity_accepted,false);
    assert.equal(c.deployed_artifact_generation_verified,false);
    assert.equal(c.runtime_mount_authority,false);
    assert.equal(c.production_source_finality_authority_ready,false);
    assert.equal(c.public_presale_activation,false);
    assert.equal(c.funds_movement,false);
    return Object.freeze({bytes,value:c});
  }finally{
    if(added){
      const removed=spawnSync("/usr/bin/git",[
        "--no-replace-objects","-c","core.hooksPath=/dev/null",
        "-c","core.fsmonitor=false","-C",ROOT,
        "worktree","remove","--force",wt,
      ],{
        cwd:ROOT,encoding:"utf8",stdio:["ignore","pipe","pipe"],timeout:30000,
        env:{
          PATH:NODE_BIN+":/usr/bin:/bin",
          HOME:"/nonexistent",LANG:"C",LC_ALL:"C",TZ:"UTC",
          GIT_CONFIG_NOSYSTEM:"1",GIT_CONFIG_GLOBAL:"/dev/null",
          GIT_CONFIG_SYSTEM:"/dev/null",GIT_NO_REPLACE_OBJECTS:"1",
          GIT_OPTIONAL_LOCKS:"0",GIT_TERMINAL_PROMPT:"0",
        },
      });
      assert.equal(removed.error,undefined,String(removed.error||""));
      assert.equal(removed.status,0,String(removed.stderr||removed.stdout||""));
    }
    fs.rmSync(holder,{recursive:true,force:true});
  }
}
function verifyProjectionAgainstFull(p,c){
  for(const key of [
    "candidate_enforcement_set_sha256",
    "complete_executable_closure_verified",
    "candidate_enforcement_identity_accepted",
    "deployed_artifact_generation_verified",
    "runtime_mount_authority",
    "production_source_finality_authority_ready",
    "public_presale_activation",
    "funds_movement",
  ]){
    assert.deepEqual(p[key],c[key],"projection_field_mismatch:"+key);
  }
  assert.equal(p.candidate_head,CANDIDATE_HEAD);
  assert.deepEqual(
    p.current_enforcement_tracked_source_inventory_v1,
    c.current_enforcement_tracked_source_inventory_v1,
    "projection_inventory_not_exact_full_candidate",
  );
}
function expectedLock(){
  return {
    schema:"void_buy_void_enforcement_final_protected_v7_v2_lock_v5",
    marker:"VOID_BUY_VOID_ENFORCEMENT_FINAL_PROTECTED_V7_V2_LOCK_V5",
    version:5,
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
      census_id:V7_CENSUS_ID,
      census_json_sha256:V7_CENSUS_JSON_SHA256,
      census_json_git_blob_sha1:V7_CENSUS_JSON_BLOB,
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
  console.log("protected_census_id="+V7_CENSUS_ID);
  console.log("accepted_v3_predecessor_preserved=true");
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
