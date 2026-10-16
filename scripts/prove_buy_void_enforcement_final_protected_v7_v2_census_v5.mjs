#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const MARKER="VOID_BUY_VOID_ENFORCEMENT_FINAL_PROTECTED_V7_V2_CENSUS_V5";
const BASE_MAIN="adc5a87d0200aa354b03d9910cbfc1cb2d59bb38";
const CUSTODY_PARENT="5ebba1f2b301d1e12d4dff95ae4f3ce22bb82c33";

const FROZEN_CANDIDATE=
  "ops/security/buy-void-enforcement-final-protected-v7-v2-candidate-v2.json";
const FROZEN_CANDIDATE_BLOB="4e23ecbb64eb26c14f5ab15af85eb86d59c3a718";
const FROZEN_LOCK=
  "ops/security/buy-void-enforcement-final-protected-v7-v2-lock-v2.json";
const FROZEN_LOCK_BLOB="589845615654da8b688764377b34296267ac0063";
const FROZEN_CENSUS_PROOF=
  "scripts/prove_buy_void_enforcement_final_v7_artifact_census_v4.mjs";
const FROZEN_CENSUS_PROOF_BLOB="f0e1334da67309c1aeb98a2fa19e5ff77424955f";

const CUSTODY_SOURCE_EVIDENCE=Object.freeze([
  Object.freeze({
    path:"docs/operators/buy-void-source-finality-v7-deployment-receipt-install-v1.md",
    git_blob_sha1:"32dbc7a69187a09c5cd7fe27ed5481463a157a8f",
    git_mode:"100644",
  }),
  Object.freeze({
    path:"ops/precision/void_buy_void_source_finality_v7_deployment_receipt_install_v1.ts",
    git_blob_sha1:"72dec8920c1a7177d353400c33b71c2de2562aba",
    git_mode:"100644",
  }),
  Object.freeze({
    path:"scripts/prove_buy_void_source_finality_v7_deployment_receipt_install_v1.ts",
    git_blob_sha1:"d74aa53bc8ee87581de748d7d0fc57ffa0b13944",
    git_mode:"100644",
  }),
]);

const EXPECTED_PROTECTED_DELTA=Object.freeze([
  Object.freeze({
    path:"ops/precision/void_buy_void_source_finality_v7_deployment_receipt_install_v1.ts",
    before_blob:"3de6e4bd1f9aa2e9c0a0889cc7c0ab489cb306c0",
    after_blob:"72dec8920c1a7177d353400c33b71c2de2562aba",
    mode:"100644",
  }),
]);

const ARTIFACT_PATHS=Object.freeze([
  "dist/economic/buy_void_auto_fulfillment_v1.js",
  "dist/economic/buy_void_broadcast_outcome_journal_v1.js",
  "dist/economic/buy_void_confirmed_state_journal_v1.js",
  "dist/economic/buy_void_crash_consistent_saga_server_policy_v1.js",
  "dist/economic/buy_void_delivery_runtime_integration_v1.js",
  "dist/economic/buy_void_delivery_sign_broadcast_adapter_v1.js",
  "dist/economic/buy_void_delivery_submission_guard_v1.js",
  "dist/economic/buy_void_erc20_delivery_receipt_reconciler_v1.js",
  "dist/economic/buy_void_erc20_execution_composition_v1.js",
  "dist/economic/buy_void_erc20_transaction_preparation_planner_v1.js",
  "dist/economic/buy_void_execution_attempt_journal_v1.js",
  "dist/economic/buy_void_filesystem_bakery_lock_v1.js",
  "dist/economic/buy_void_fulfillment_confirmation_v1.js",
  "dist/economic/buy_void_fulfillment_journal_v1.js",
  "dist/economic/buy_void_inventory_reservation_journal_v1.js",
  "dist/economic/buy_void_payment_rpc_observer_v1.js",
  "dist/economic/buy_void_pipeline_coordinator_v1.js",
  "dist/economic/buy_void_source_chain_finality_rpc_adapter_v1.js",
  "dist/economic/buy_void_source_finality_authenticated_composition_v3.js",
  "dist/economic/buy_void_source_finality_authority_v2.js",
  "dist/economic/buy_void_source_finality_execution_preflight_v1.js",
  "dist/economic/buy_void_source_finality_generation_provenance_v6.js",
  "dist/economic/buy_void_verified_payment_v2.js",
  "dist/economic/buy_void_source_finality_generation_provenance_v7.js",
  "dist/economic/buy_void_source_finality_live_process_binding_v1.js",
  "dist/economic/buy_void_source_finality_live_process_binding_v2.js",
  "dist/economic/buy_void_source_finality_provider_pair_binding_v1.js",
  "dist/economic/buy_void_ethereum_public_checkout_finality_gate_v1.js",
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
function names(a,b,...paths){
  return git(["diff","--name-only",a,b,"--",...paths])
    .split("\n").filter(Boolean).sort();
}
function readExact(relative,max=4*1024*1024){
  assert.equal(path.isAbsolute(relative),false,"absolute_path:"+relative);
  assert.equal(relative.split("/").some(p=>!p||p==="."||p===".."),false,
    "unsafe_path:"+relative);
  const absolute=path.join(ROOT,...relative.split("/"));
  const before=fs.lstatSync(absolute);
  assert.ok(before.isFile()&&!before.isSymbolicLink()&&before.nlink===1&&
    before.size>0&&before.size<=max,"invalid_file:"+relative);
  const bytes=fs.readFileSync(absolute);
  const after=fs.lstatSync(absolute);
  for(const key of ["dev","ino","size","mtimeMs","ctimeMs","nlink"]){
    assert.equal(after[key],before[key],"file_changed:"+relative+":"+key);
  }
  assert.equal(bytes.length,before.size,"short_read:"+relative);
  return bytes;
}
function pin(relative,blob,max=4*1024*1024){
  const bytes=readExact(relative,max);
  assert.equal(gitBlob(bytes),blob,"git_blob_drift:"+relative);
  assert.equal(git(["rev-parse","HEAD:"+relative]),blob,"head_blob_drift:"+relative);
  return bytes;
}
function treeRow(ref,relative){
  const row=git(["ls-tree",ref,"--",relative]);
  const m=row.match(/^(100644|100755) blob ([0-9a-f]{40})\t(.+)$/u);
  assert.ok(m,"tree_entry_invalid:"+ref+":"+relative);
  assert.equal(m[3],relative,"tree_path_mismatch:"+relative);
  return Object.freeze({path:relative,git_blob_sha1:m[2],git_mode:m[1]});
}
function sourcePath(artifact){
  return "src/economic/"+path.basename(artifact,".js")+".ts";
}
function artifactIdentity(relative){
  const b=readExact(relative,2*1024*1024);
  return Object.freeze({path:relative,bytes:b.length,sha256:sha256(b)});
}
function sourceIdentity(relative){
  const b=readExact(relative,4*1024*1024);
  const blob=gitBlob(b);
  assert.equal(git(["rev-parse","HEAD:"+relative]),blob,
    "source_head_mismatch:"+relative);
  return Object.freeze({
    path:relative,bytes:b.length,git_blob_sha1:blob,sha256:sha256(b),
  });
}

assert.equal(process.platform,"linux");
assert.equal(process.arch,"x64");
assert.ok([22,24,26].includes(Number(process.versions.node.split(".")[0])));

git(["merge-base","--is-ancestor",BASE_MAIN,CUSTODY_PARENT]);
git(["merge-base","--is-ancestor",CUSTODY_PARENT,"HEAD"]);

assert.deepEqual(
  names(BASE_MAIN,CUSTODY_PARENT),
  CUSTODY_SOURCE_EVIDENCE.map(x=>x.path).sort(),
  "custody_parent_scope_drift",
);
for(const expected of CUSTODY_SOURCE_EVIDENCE){
  const row=treeRow(CUSTODY_PARENT,expected.path);
  assert.equal(row.git_blob_sha1,expected.git_blob_sha1,
    "custody_evidence_blob_drift:"+expected.path);
  assert.equal(row.git_mode,expected.git_mode,
    "custody_evidence_mode_drift:"+expected.path);
  const current=treeRow("HEAD",expected.path);
  assert.deepEqual(current,row,"custody_evidence_changed_after_parent:"+expected.path);
}

const candidateBytes=pin(FROZEN_CANDIDATE,FROZEN_CANDIDATE_BLOB,64*1024);
const lockBytes=pin(FROZEN_LOCK,FROZEN_LOCK_BLOB,64*1024);
pin(FROZEN_CENSUS_PROOF,FROZEN_CENSUS_PROOF_BLOB,256*1024);
const frozenCandidate=JSON.parse(candidateBytes.toString("utf8"));
const frozenLock=JSON.parse(lockBytes.toString("utf8"));

assert.equal(
  frozenCandidate.marker,
  "VOID_BUY_VOID_ENFORCEMENT_FINAL_PROTECTED_V7_V2_CANDIDATE_V2",
);
assert.equal(frozenCandidate.current_enforcement_tracked_source_inventory_count,49);
assert.equal(frozenCandidate.current_enforcement_tracked_source_inventory_v1.length,49);
assert.equal(frozenCandidate.current_enforcement_tracked_source_inventory_verified,true);
assert.equal(frozenCandidate.complete_executable_closure_verified,true);
assert.equal(frozenCandidate.candidate_enforcement_identity_accepted,false);
assert.equal(frozenCandidate.production_source_finality_authority_ready,false);
assert.equal(frozenCandidate.public_presale_activation,false);
assert.equal(frozenCandidate.funds_movement,false);

assert.equal(
  frozenLock.marker,
  "VOID_BUY_VOID_ENFORCEMENT_FINAL_PROTECTED_V7_V2_LOCK_V2",
);
assert.equal(frozenLock.candidate_enforcement_identity_accepted,true);
assert.equal(
  frozenLock.candidate_evidence?.git_blob_sha1,
  FROZEN_CANDIDATE_BLOB,
);
assert.equal(
  frozenLock.candidate_evidence?.candidate_enforcement_set_sha256,
  frozenCandidate.candidate_enforcement_set_sha256,
);
assert.equal(frozenLock.production_source_finality_authority_ready,false);
assert.equal(frozenLock.public_presale_activation,false);
assert.equal(frozenLock.funds_movement,false);

const economicDrift=names(
  BASE_MAIN,"HEAD",
  "src/economic","package.json","package-lock.json","tsconfig.json","tsconfig.build.json",
);
assert.deepEqual(economicDrift,[],"economic_or_build_source_drift");

const artifacts=ARTIFACT_PATHS.map(artifactIdentity);
const sources=[...new Set(ARTIFACT_PATHS.map(sourcePath))]
  .sort().map(sourceIdentity);
assert.equal(artifacts.length,28);
assert.equal(sources.length,28);

const artifactJsonSha=sha256(Buffer.from(JSON.stringify(artifacts),"utf8"));
const sourceJsonSha=sha256(Buffer.from(JSON.stringify(sources),"utf8"));
const artifactCanonicalSha=sha256(Buffer.from(canonical(artifacts),"utf8"));
const sourceCanonicalSha=sha256(Buffer.from(canonical(sources),"utf8"));

assert.equal(
  artifactJsonSha,
  frozenCandidate.hosted_census_evidence.artifact_inventory_sha256,
  "economic_artifact_inventory_changed",
);
assert.equal(
  sourceJsonSha,
  frozenCandidate.hosted_census_evidence.source_inventory_sha256,
  "economic_source_inventory_changed",
);
assert.equal(
  artifactCanonicalSha,
  frozenCandidate.current_inventory_evidence.canonical_artifact_inventory_sha256,
  "canonical_economic_artifact_inventory_changed",
);
assert.equal(
  sourceCanonicalSha,
  frozenCandidate.current_inventory_evidence.canonical_source_inventory_sha256,
  "canonical_economic_source_inventory_changed",
);

const oldRows=frozenCandidate.current_enforcement_tracked_source_inventory_v1;
assert.deepEqual(oldRows.map(r=>r.path),[...oldRows.map(r=>r.path)].sort(),
  "frozen_protected_paths_not_sorted");
assert.equal(new Set(oldRows.map(r=>r.path)).size,49,
  "frozen_protected_path_duplicate");
const newRows=oldRows.map(row=>treeRow("HEAD",row.path));

const deltas=[];
for(let i=0;i<oldRows.length;i+=1){
  const before=oldRows[i];
  const after=newRows[i];
  assert.equal(after.path,before.path);
  if(before.git_blob_sha1!==after.git_blob_sha1||before.git_mode!==after.git_mode){
    deltas.push(Object.freeze({
      path:before.path,
      before_blob:before.git_blob_sha1,
      after_blob:after.git_blob_sha1,
      before_mode:before.git_mode,
      after_mode:after.git_mode,
    }));
  }
}
assert.deepEqual(
  deltas.map(d=>({
    path:d.path,before_blob:d.before_blob,after_blob:d.after_blob,mode:d.after_mode,
  })),
  EXPECTED_PROTECTED_DELTA,
  "protected_generation_delta_scope_invalid",
);
for(const expected of EXPECTED_PROTECTED_DELTA){
  assert.equal(
    treeRow(BASE_MAIN,expected.path).git_blob_sha1,
    expected.before_blob,
    "base_main_protected_identity_drift:"+expected.path,
  );
}

const protectedCanonicalSha=sha256(Buffer.from(canonical(newRows),"utf8"));
const protectedJsonSha=sha256(Buffer.from(JSON.stringify(newRows),"utf8"));
assert.notEqual(
  protectedCanonicalSha,
  frozenCandidate.current_enforcement_tracked_source_inventory_sha256,
  "protected_inventory_generation_did_not_advance",
);

const body=Object.freeze({
  schema:"void_buy_void_enforcement_final_protected_v7_v2_census_v5",
  marker:MARKER,
  version:5,
  repository:"6ZoSo9/void-node",
  base_main:BASE_MAIN,
  custody_parent:CUSTODY_PARENT,
  repository_head_sha:git(["rev-parse","HEAD"]),
  repository_tree_sha:git(["rev-parse","HEAD^{tree}"]),
  custody_source_evidence:CUSTODY_SOURCE_EVIDENCE,
  frozen_v2_candidate:Object.freeze({
    path:FROZEN_CANDIDATE,
    git_blob_sha1:FROZEN_CANDIDATE_BLOB,
    candidate_enforcement_set_sha256:
      frozenCandidate.candidate_enforcement_set_sha256,
    protected_inventory_sha256:
      frozenCandidate.current_enforcement_tracked_source_inventory_sha256,
    identity_mutated:false,
  }),
  frozen_v2_lock:Object.freeze({
    path:FROZEN_LOCK,
    git_blob_sha1:FROZEN_LOCK_BLOB,
    candidate_enforcement_identity_accepted:true,
    identity_mutated:false,
  }),
  frozen_v4_census_proof:Object.freeze({
    path:FROZEN_CENSUS_PROOF,
    git_blob_sha1:FROZEN_CENSUS_PROOF_BLOB,
    identity_mutated:false,
  }),
  economic_artifact_count:artifacts.length,
  economic_artifacts:artifacts,
  economic_source_file_count:sources.length,
  economic_sources:sources,
  economic_artifact_inventory_sha256:artifactJsonSha,
  economic_source_inventory_sha256:sourceJsonSha,
  canonical_economic_artifact_inventory_sha256:artifactCanonicalSha,
  canonical_economic_source_inventory_sha256:sourceCanonicalSha,
  economic_and_build_source_drift_count:economicDrift.length,
  economic_executable_closure_preserved:true,
  protected_tracked_source_count:newRows.length,
  protected_tracked_source_inventory:newRows,
  protected_tracked_source_inventory_json_sha256:protectedJsonSha,
  protected_tracked_source_inventory_canonical_sha256:protectedCanonicalSha,
  predecessor_protected_inventory_canonical_sha256:
    frozenCandidate.current_enforcement_tracked_source_inventory_sha256,
  protected_generation_delta:deltas,
  protected_generation_delta_count:deltas.length,
  protected_generation_delta_exact:true,
  unchanged_protected_path_count:newRows.length-deltas.length,
  deployment_receipt_installer_generation_blob:
    "72dec8920c1a7177d353400c33b71c2de2562aba",
  deployment_receipt_custody_successor_evidence_bound:true,
  frozen_candidate_rederived:false,
  frozen_lock_rewritten:false,
  census_only:true,
  complete_executable_closure_verified:false,
  candidate_enforcement_identity_accepted:false,
  deployed_artifact_generation_verified:false,
  runtime_mount_authority:false,
  production_source_finality_authority_ready:false,
  public_presale_activation:false,
  funds_movement:false,
});
const censusId="voidbefv7c5_"+sha256(Buffer.from(canonical(body),"utf8"));
process.stdout.write(JSON.stringify({...body,census_id:censusId},null,2)+"\n");
