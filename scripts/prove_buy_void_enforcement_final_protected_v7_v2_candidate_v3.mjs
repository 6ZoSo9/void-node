#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const MARKER="VOID_BUY_VOID_ENFORCEMENT_FINAL_PROTECTED_V7_V2_CANDIDATE_V3";

const PROTECTED_CENSUS_PARENT="95b151b15414802e6c52b76379418982f188ba18";
const PROTECTED_CENSUS_PROOF=
  "scripts/prove_buy_void_enforcement_final_protected_v7_v2_census_v5.mjs";
const PROTECTED_CENSUS_PROOF_BLOB="24cca9f3e3af328b640d33694492f6f71c1f0d52";
const PROTECTED_CENSUS_WORKFLOW=
  ".github/workflows/buy-void-enforcement-final-protected-v7-v2-census-v5.yml";
const PROTECTED_CENSUS_WORKFLOW_BLOB="3fa525b90daacaaa7e49435c864210a4eec0eafd";

const HOSTED_PROTECTED_CENSUS=Object.freeze({
  workflow_run:38977527069,
  node22_artifact_id:12080175556,
  node24_artifact_id:12079916369,
  node26_artifact_id:12079507226,
  census_id:"voidbefv7c5_5c022759d732fec4f42907c11451f7b90036ac823ef4fc090642eab700417966",
  census_json_bytes:25799,
  census_json_sha256:"ba572e907372c1873f5b7f7e994b8b5dce607791ebb5d4974de94a46764c5337",
  protected_tracked_source_inventory_canonical_sha256:
    "6b108cd4a41a46a2f26cad072bfea013707011cd1a13c083f7176e04f041934e",
  economic_artifact_inventory_sha256:
    "4dc2469dc898fb3c9c10baa47638a2892b3fb26159bd853454c7d94f98721b37",
  economic_source_inventory_sha256:
    "172c6be2f5e2f8d9865df516bde4bbbec65086025b779337d3b5ed2e701163be",
  canonical_economic_artifact_inventory_sha256:
    "41e845d6d88107f071697b324afa21155f9e649758deb82048b994aec602732a",
  canonical_economic_source_inventory_sha256:
    "2f6a49dcaa8dde179af2ed366daa2dc1a0abbc0956de61275260d29af047b280",
  protected_tracked_source_count:49,
  protected_generation_delta_count:1,
  unchanged_protected_path_count:48,
  cross_node_byte_identity_verified:true,
  independent_rederivation_verified:true,
});

const CUSTODY_PARENT="5ebba1f2b301d1e12d4dff95ae4f3ce22bb82c33";
const CUSTODY_INSTALLER=
  "ops/precision/void_buy_void_source_finality_v7_deployment_receipt_install_v1.ts";
const CUSTODY_INSTALLER_BLOB="72dec8920c1a7177d353400c33b71c2de2562aba";
const CUSTODY_PROOF=
  "scripts/prove_buy_void_source_finality_v7_deployment_receipt_install_v1.ts";
const CUSTODY_PROOF_BLOB="d74aa53bc8ee87581de748d7d0fc57ffa0b13944";
const CUSTODY_DOC=
  "docs/operators/buy-void-source-finality-v7-deployment-receipt-install-v1.md";
const CUSTODY_DOC_BLOB="32dbc7a69187a09c5cd7fe27ed5481463a157a8f";
const CUSTODY_HOSTED=Object.freeze({
  workflow_run:38975436456,
  node22_job:117223626308,
  node24_job:117223626620,
  node26_job:117223626603,
  cross_node_job:117224010994,
  three_node_semantic_proof_green:true,
  package_runtime_cross_node_green:true,
});

const FROZEN_CANDIDATE=
  "ops/security/buy-void-enforcement-final-protected-v7-v2-candidate-v2.json";
const FROZEN_CANDIDATE_BLOB="4e23ecbb64eb26c14f5ab15af85eb86d59c3a718";
const FROZEN_LOCK=
  "ops/security/buy-void-enforcement-final-protected-v7-v2-lock-v2.json";
const FROZEN_LOCK_BLOB="589845615654da8b688764377b34296267ac0063";
const FROZEN_CANDIDATE_SET=
  "05d7648032223f74a05d89200ef23a76a5265ef2a3a26e52c7f51ce3b33bc852";

const CANDIDATE_WORKFLOW=
  ".github/workflows/buy-void-enforcement-final-protected-v7-v2-candidate-v3.yml";
const CANDIDATE_WORKFLOW_TRIGGER_DEPENDENCIES=Object.freeze([
  PROTECTED_CENSUS_PROOF,
  PROTECTED_CENSUS_WORKFLOW,
  CUSTODY_INSTALLER,
  CUSTODY_PROOF,
  CUSTODY_DOC,
  FROZEN_CANDIDATE,
  FROZEN_LOCK,
]);

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
function run(command,args,{timeout=300000}={}){
  const r=spawnSync(command,args,{
    cwd:ROOT,encoding:"utf8",stdio:["ignore","pipe","pipe"],timeout,
    maxBuffer:32*1024*1024,
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
function git(args){
  return String(run("/usr/bin/git",[
    "--no-replace-objects","-c","core.hooksPath=/dev/null",
    "-c","core.fsmonitor=false","-C",ROOT,...args,
  ],{timeout:30000}).stdout||"").trim();
}
function readExact(relative,max=4*1024*1024){
  assert.equal(path.isAbsolute(relative),false,"absolute_path:"+relative);
  const absolute=path.join(ROOT,...relative.split("/"));
  const before=fs.lstatSync(absolute);
  assert.ok(before.isFile()&&!before.isSymbolicLink()&&before.nlink===1&&
    before.size>0&&before.size<=max,"invalid_file:"+relative);
  const bytes=fs.readFileSync(absolute);
  const after=fs.lstatSync(absolute);
  for(const key of ["dev","ino","size","mtimeMs","ctimeMs","nlink"]){
    assert.equal(after[key],before[key],"file_changed:"+relative+":"+key);
  }
  return bytes;
}
function pin(relative,blob,max=4*1024*1024){
  const bytes=readExact(relative,max);
  assert.equal(gitBlob(bytes),blob,"git_blob_drift:"+relative);
  assert.equal(git(["rev-parse","HEAD:"+relative]),blob,"head_blob_drift:"+relative);
  return bytes;
}
function assertWorkflowTriggerCoverage(){
  const workflow=readExact(CANDIDATE_WORKFLOW,128*1024).toString("utf8");
  for(const relative of CANDIDATE_WORKFLOW_TRIGGER_DEPENDENCIES){
    const exact='      - "'+relative+'"';
    assert.equal(
      workflow.split(exact).length-1,
      2,
      "candidate_workflow_trigger_dependency_count:"+relative,
    );
  }
}

function frozenPredecessor(){
  const candidate=JSON.parse(pin(
    FROZEN_CANDIDATE,FROZEN_CANDIDATE_BLOB,64*1024
  ).toString("utf8"));
  const lock=JSON.parse(pin(
    FROZEN_LOCK,FROZEN_LOCK_BLOB,64*1024
  ).toString("utf8"));

  assert.equal(
    candidate.marker,
    "VOID_BUY_VOID_ENFORCEMENT_FINAL_PROTECTED_V7_V2_CANDIDATE_V2",
  );
  assert.equal(candidate.candidate_enforcement_set_sha256,FROZEN_CANDIDATE_SET);
  assert.equal(candidate.complete_executable_closure_verified,true);
  assert.equal(candidate.candidate_enforcement_identity_accepted,false);
  assert.equal(candidate.public_presale_activation,false);
  assert.equal(candidate.funds_movement,false);

  assert.equal(
    lock.marker,
    "VOID_BUY_VOID_ENFORCEMENT_FINAL_PROTECTED_V7_V2_LOCK_V2",
  );
  assert.equal(lock.candidate_evidence?.git_blob_sha1,FROZEN_CANDIDATE_BLOB);
  assert.equal(
    lock.candidate_evidence?.candidate_enforcement_set_sha256,
    FROZEN_CANDIDATE_SET,
  );
  assert.equal(lock.complete_executable_closure_verified,true);
  assert.equal(lock.candidate_enforcement_identity_accepted,true);
  assert.equal(lock.production_source_finality_authority_ready,false);
  assert.equal(lock.public_presale_activation,false);
  assert.equal(lock.funds_movement,false);

  return Object.freeze({
    candidate_path:FROZEN_CANDIDATE,
    candidate_git_blob_sha1:FROZEN_CANDIDATE_BLOB,
    lock_path:FROZEN_LOCK,
    lock_git_blob_sha1:FROZEN_LOCK_BLOB,
    candidate_enforcement_set_sha256:FROZEN_CANDIDATE_SET,
    complete_executable_closure_verified:true,
    candidate_enforcement_identity_accepted:true,
    historical_identity_preserved:true,
  });
}

function revalidateProtectedCensus(){
  git(["merge-base","--is-ancestor",PROTECTED_CENSUS_PARENT,"HEAD"]);
  pin(PROTECTED_CENSUS_PROOF,PROTECTED_CENSUS_PROOF_BLOB,256*1024);
  pin(PROTECTED_CENSUS_WORKFLOW,PROTECTED_CENSUS_WORKFLOW_BLOB,256*1024);

  const r=run(process.execPath,[path.join(ROOT,PROTECTED_CENSUS_PROOF)]);
  assert.equal(String(r.stderr||""),"","v5_census_revalidation_stderr");
  const v=JSON.parse(String(r.stdout||""));

  assert.equal(v.marker,"VOID_BUY_VOID_ENFORCEMENT_FINAL_PROTECTED_V7_V2_CENSUS_V5");
  assert.equal(v.version,5);
  assert.equal(v.custody_parent,CUSTODY_PARENT);
  assert.equal(v.protected_tracked_source_count,49);
  assert.equal(v.protected_generation_delta_count,1);
  assert.equal(v.unchanged_protected_path_count,48);
  assert.equal(v.protected_generation_delta_exact,true);
  assert.equal(v.economic_executable_closure_preserved,true);
  assert.equal(v.economic_and_build_source_drift_count,0);
  assert.equal(
    v.protected_tracked_source_inventory_canonical_sha256,
    HOSTED_PROTECTED_CENSUS.protected_tracked_source_inventory_canonical_sha256,
  );
  assert.equal(
    v.economic_artifact_inventory_sha256,
    HOSTED_PROTECTED_CENSUS.economic_artifact_inventory_sha256,
  );
  assert.equal(
    v.economic_source_inventory_sha256,
    HOSTED_PROTECTED_CENSUS.economic_source_inventory_sha256,
  );
  assert.equal(
    v.canonical_economic_artifact_inventory_sha256,
    HOSTED_PROTECTED_CENSUS.canonical_economic_artifact_inventory_sha256,
  );
  assert.equal(
    v.canonical_economic_source_inventory_sha256,
    HOSTED_PROTECTED_CENSUS.canonical_economic_source_inventory_sha256,
  );
  assert.equal(
    v.deployment_receipt_installer_generation_blob,
    CUSTODY_INSTALLER_BLOB,
  );
  assert.equal(v.deployment_receipt_custody_successor_evidence_bound,true);
  assert.equal(v.frozen_candidate_rederived,false);
  assert.equal(v.frozen_lock_rewritten,false);
  assert.equal(v.census_only,true);
  assert.equal(v.complete_executable_closure_verified,false);
  assert.equal(v.candidate_enforcement_identity_accepted,false);
  assert.equal(v.production_source_finality_authority_ready,false);
  assert.equal(v.public_presale_activation,false);
  assert.equal(v.funds_movement,false);

  return Object.freeze({
    census_id:v.census_id,
    repository_head_sha:v.repository_head_sha,
    repository_tree_sha:v.repository_tree_sha,
    protected_tracked_source_inventory:v.protected_tracked_source_inventory,
    protected_tracked_source_inventory_canonical_sha256:
      v.protected_tracked_source_inventory_canonical_sha256,
    economic_artifact_inventory_sha256:v.economic_artifact_inventory_sha256,
    economic_source_inventory_sha256:v.economic_source_inventory_sha256,
    canonical_economic_artifact_inventory_sha256:
      v.canonical_economic_artifact_inventory_sha256,
    canonical_economic_source_inventory_sha256:
      v.canonical_economic_source_inventory_sha256,
    protected_generation_delta_count:v.protected_generation_delta_count,
    unchanged_protected_path_count:v.unchanged_protected_path_count,
    economic_executable_closure_preserved:true,
    exact_candidate_head_revalidation:true,
  });
}

function reproveCustodySemantics(){
  git(["merge-base","--is-ancestor",CUSTODY_PARENT,"HEAD"]);
  pin(CUSTODY_INSTALLER,CUSTODY_INSTALLER_BLOB,512*1024);
  pin(CUSTODY_PROOF,CUSTODY_PROOF_BLOB,512*1024);
  pin(CUSTODY_DOC,CUSTODY_DOC_BLOB,256*1024);

  const loader="file://"+path.join(ROOT,"node_modules/tsx/dist/loader.mjs");
  const r=run(process.execPath,[
    "--import",loader,CUSTODY_PROOF,
  ],{timeout:300000});
  assert.equal(String(r.stderr||""),"","custody_proof_stderr");
  const lines=new Set(String(r.stdout||"").split("\n").filter(Boolean));
  for(const marker of [
    "VOID_BUY_VOID_SOURCE_FINALITY_V7_DEPLOYMENT_RECEIPT_INSTALL_V1_PROOF_GREEN",
    "current_enforcement_tracked_source_inventory_verified=true",
    "current_enforcement_tracked_source_inventory_count=49",
    "funds_movement=false",
  ]){
    assert.ok(lines.has(marker),"custody_proof_marker_missing:"+marker);
  }
  return Object.freeze({
    installer_path:CUSTODY_INSTALLER,
    installer_git_blob_sha1:CUSTODY_INSTALLER_BLOB,
    proof_path:CUSTODY_PROOF,
    proof_git_blob_sha1:CUSTODY_PROOF_BLOB,
    operator_contract_path:CUSTODY_DOC,
    operator_contract_git_blob_sha1:CUSTODY_DOC_BLOB,
    hosted:CUSTODY_HOSTED,
    current_content_semantics_requalified:true,
    current_head_proof_reexecuted:true,
  });
}

function derive(){
  assertWorkflowTriggerCoverage();
  const predecessor=frozenPredecessor();
  const currentCensus=revalidateProtectedCensus();
  const custody=reproveCustodySemantics();

  assert.equal(currentCensus.economic_executable_closure_preserved,true);
  assert.equal(predecessor.complete_executable_closure_verified,true);

  const body={
    schema:"void_buy_void_enforcement_final_protected_v7_v2_candidate_v3",
    marker:MARKER,
    version:3,
    repository:"6ZoSo9/void-node",
    protected_census_parent:PROTECTED_CENSUS_PARENT,
    custody_parent:CUSTODY_PARENT,
    repository_head_sha:git(["rev-parse","HEAD"]),
    repository_tree_sha:git(["rev-parse","HEAD^{tree}"]),
    hosted_protected_census:HOSTED_PROTECTED_CENSUS,
    protected_census_current_revalidation:currentCensus,
    current_inventory_evidence:Object.freeze({
      hosted_json_artifact_inventory_sha256:
        currentCensus.economic_artifact_inventory_sha256,
      hosted_json_source_inventory_sha256:
        currentCensus.economic_source_inventory_sha256,
      canonical_artifact_inventory_sha256:
        currentCensus.canonical_economic_artifact_inventory_sha256,
      canonical_source_inventory_sha256:
        currentCensus.canonical_economic_source_inventory_sha256,
    }),
    current_enforcement_tracked_source_inventory_v1:
      currentCensus.protected_tracked_source_inventory,
    current_enforcement_tracked_source_inventory_count:49,
    current_enforcement_tracked_source_inventory_sha256:
      currentCensus.protected_tracked_source_inventory_canonical_sha256,
    current_enforcement_tracked_source_inventory_verified:true,
    predecessor_enforcement:predecessor,
    deployment_receipt_custody:custody,
    executable_closure_transition:Object.freeze({
      predecessor_complete_executable_closure_verified:true,
      economic_executable_closure_preserved:true,
      protected_source_delta_count:1,
      changed_protected_path:CUSTODY_INSTALLER,
      changed_protected_path_semantics_requalified:true,
      transition_exact:true,
    }),
    complete_executable_closure_verified:true,
    candidate_enforcement_identity_accepted:false,
    deployed_artifact_generation_verified:false,
    runtime_mount_authority:false,
    production_source_finality_authority_ready:false,
    public_presale_activation:false,
    funds_movement:false,
  };
  return Object.freeze({
    ...body,
    candidate_enforcement_set_sha256:
      sha256(Buffer.from(canonical(body),"utf8")),
  });
}

const args=process.argv.slice(2);
if(args.length===1&&args[0]==="--derive"){
  process.stdout.write(JSON.stringify(derive(),null,2)+"\n");
}else if(args.length===0||(args.length===1&&args[0]==="--self-test")){
  const c=derive();
  assert.match(c.candidate_enforcement_set_sha256,/^[0-9a-f]{64}$/u);
  assert.equal(c.complete_executable_closure_verified,true);
  assert.equal(c.candidate_enforcement_identity_accepted,false);
  assert.equal(c.deployment_receipt_custody.current_head_proof_reexecuted,true);
  console.log(MARKER+"_GREEN");
  console.log("candidate_enforcement_set_sha256="+c.candidate_enforcement_set_sha256);
  console.log("v5_census_current_head_revalidated=true");
  console.log("deployment_receipt_custody_semantics_requalified=true");
  console.log("complete_executable_closure_verified=true");
  console.log("candidate_enforcement_identity_accepted=false");
  console.log("production_source_finality_authority_ready=false");
  console.log("public_presale_activation=false");
  console.log("funds_movement=false");
}else{
  throw Error("usage: proof [--self-test|--derive]");
}
