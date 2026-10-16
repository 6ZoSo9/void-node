#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const MARKER="VOID_BUY_VOID_ENFORCEMENT_FINAL_PROTECTED_V7_V2_CENSUS_V5";
const BASE_MAIN="ccb1bd973a60875ecebf570905e6d8fc1c15ae3c";
const RANGE_PARENT="6080389131c3cdb80fa9935b5ff80f4e40f09938";
const FROZEN_CANDIDATE="ops/security/buy-void-enforcement-final-protected-v7-v2-candidate-v2.json";
const FROZEN_CANDIDATE_BLOB="4e23ecbb64eb26c14f5ab15af85eb86d59c3a718";
const FROZEN_LOCK="ops/security/buy-void-enforcement-final-protected-v7-v2-lock-v2.json";
const FROZEN_LOCK_BLOB="589845615654da8b688764377b34296267ac0063";
const FROZEN_CENSUS_PROOF="scripts/prove_buy_void_enforcement_final_v7_artifact_census_v4.mjs";
const FROZEN_CENSUS_PROOF_BLOB="f0e1334da67309c1aeb98a2fa19e5ff77424955f";
const EXPECTED_PROTECTED_DELTA=Object.freeze([
  Object.freeze({
    path:"ops/run-void-node-live-v1.sh",
    before_blob:"6fb040de128ce0df16e848d61ea5f4acb62794da",
    after_blob:"d7d7aede7fcd764a6182bd31f12338c5d3674ecb",
    mode:"100755",
  }),
  Object.freeze({
    path:"src/index.ts",
    before_blob:"123ec1792a027f93d4c9030749a0e7e136a75a44",
    after_blob:"7df1f21c730b554c414c88c550a4475234485370",
    mode:"100644",
  }),
]);

const SOURCE_GENERATION_EVIDENCE=Object.freeze([
  ["src/index.ts","7df1f21c730b554c414c88c550a4475234485370","100644"],
  ["src/http/api_attach.ts","70b2a452ed811342bab7d7cb0cebbacbe38401a2","100644"],
  ["src/http/api_attach.js","9fe939716861d095d326c3b8b8a36e83469bc2ec","100644"],
  ["scripts/prove_void_attach_block_range_bounds_v1.mjs","b9887bd4227ddfa1361e4da5569e7a5356573d35","100644"],
  ["scripts/prove_void_index_block_range_bounds_v1.mjs","a607f6c3308d1045d9b45363a8f7b76003fd425b","100644"],
  ["ops/run-void-node-live-v1.sh","d7d7aede7fcd764a6182bd31f12338c5d3674ecb","100755"],
  ["runtime/canonical-producer-self-http-guard-v5.cjs","8f9ab041e23c7519621b4d6a4573c4fa8b302ab6","100644"],
  ["scripts/prove_canonical_producer_legacy_self_http_observers_current_v5.mjs","95687a9691b7eec93c028c82e81000cc214d065e","100644"],
  ["scripts/prove_canonical_producer_source_generation_dispatch_v5.mjs","66aea5ea3dc296d4648750ba0d74cf7b2efed072","100644"],
  ["scripts/prove_void_public_checkpoint_seal_first_startup_current_v6.mjs","5d0fb21f148551520039d2ee9984f4f3f7431b01","100644"],
  [".github/workflows/canonical-producer-source-custody-v1.yml","0e489fbbc8bc15f6f50422cf1bbedbe091f38fd3","100644"],
  [".github/workflows/canonical-producer-legacy-self-http-observers-v1.yml","38f862614f04514b6ea5f27146ed751d4c4d0520","100644"],
  [".github/workflows/void-live-agent-jsonl-runtime-wedge-v1.yml","05f264e1d2590b3f448adc63c6a4acb5703f7847","100644"],
  [".github/workflows/void-public-checkpoint-seal-first-startup-v1.yml","df4e6506a8e0d929c29a2c2c183b8d4fa4b3b9c5","100644"],
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
function runGit(args,{allowFail=false}={}){
  const r=spawnSync("/usr/bin/git",[
    "--no-replace-objects","-c","core.hooksPath=/dev/null",
    "-c","core.attributesFile=/dev/null","-c","core.fsmonitor=false",
    "-c","core.untrackedCache=false","-c","core.preloadIndex=false",
    "-c","submodule.recurse=false","-C",ROOT,...args,
  ],{
    encoding:"utf8",stdio:["ignore","pipe","pipe"],timeout:30000,maxBuffer:8*1024*1024,
    env:{PATH:"/usr/bin:/bin",HOME:"/nonexistent",LANG:"C",LC_ALL:"C",TZ:"UTC",
      GIT_CONFIG_NOSYSTEM:"1",GIT_CONFIG_GLOBAL:"/dev/null",GIT_CONFIG_SYSTEM:"/dev/null",
      GIT_NO_REPLACE_OBJECTS:"1",GIT_OPTIONAL_LOCKS:"0",GIT_TERMINAL_PROMPT:"0"},
  });
  if(!allowFail){
    assert.equal(r.error,undefined,String(r.error||""));
    assert.equal(r.status,0,String(r.stderr||r.stdout||""));
  }
  return r;
}
const git=args=>String(runGit(args).stdout||"").trim();
function readExact(relative,max=4*1024*1024){
  assert.equal(path.isAbsolute(relative),false,"absolute_path:"+relative);
  assert.equal(relative.split("/").some(part=>!part||part==="."||part===".."),false,
    "unsafe_path:"+relative);
  const absolute=path.join(ROOT,...relative.split("/"));
  const before=fs.lstatSync(absolute);
  assert.ok(before.isFile()&&!before.isSymbolicLink()&&before.nlink===1&&
    before.size>0&&before.size<=max,"invalid_file:"+relative);
  const bytes=fs.readFileSync(absolute),after=fs.lstatSync(absolute);
  assert.equal(bytes.length,before.size,"short_read:"+relative);
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
  const b=readExact(relative,4*1024*1024),blob=gitBlob(b);
  assert.equal(git(["rev-parse","HEAD:"+relative]),blob,"source_head_mismatch:"+relative);
  return Object.freeze({path:relative,bytes:b.length,git_blob_sha1:blob,sha256:sha256(b)});
}

assert.equal(process.platform,"linux");
assert.equal(process.arch,"x64");
assert.ok([22,24,26].includes(Number(process.versions.node.split(".")[0])));

git(["merge-base","--is-ancestor",BASE_MAIN,RANGE_PARENT]);
git(["merge-base","--is-ancestor",RANGE_PARENT,"HEAD"]);
pin(FROZEN_CANDIDATE,FROZEN_CANDIDATE_BLOB,64*1024);
pin(FROZEN_LOCK,FROZEN_LOCK_BLOB,64*1024);
pin(FROZEN_CENSUS_PROOF,FROZEN_CENSUS_PROOF_BLOB,256*1024);

const frozenCandidate=JSON.parse(readExact(FROZEN_CANDIDATE,64*1024).toString("utf8"));
const frozenLock=JSON.parse(readExact(FROZEN_LOCK,64*1024).toString("utf8"));
assert.equal(frozenCandidate.marker,"VOID_BUY_VOID_ENFORCEMENT_FINAL_PROTECTED_V7_V2_CANDIDATE_V2");
assert.equal(frozenCandidate.current_enforcement_tracked_source_inventory_count,49);
assert.equal(frozenCandidate.current_enforcement_tracked_source_inventory_v1.length,49);
assert.equal(frozenLock.marker,"VOID_BUY_VOID_ENFORCEMENT_FINAL_PROTECTED_V7_V2_LOCK_V2");
assert.equal(frozenLock.candidate_enforcement_identity_accepted,true);
assert.equal(frozenLock.production_source_finality_authority_ready,false);
assert.equal(frozenLock.public_presale_activation,false);
assert.equal(frozenLock.funds_movement,false);

const economicDrift=git([
  "diff","--name-only",BASE_MAIN,"HEAD","--",
  "src/economic","package.json","package-lock.json","tsconfig.json","tsconfig.build.json",
]).split("\n").filter(Boolean);
assert.deepEqual(economicDrift,[],"economic_or_build_source_drift");

const artifacts=ARTIFACT_PATHS.map(artifactIdentity);
const sources=[...new Set(ARTIFACT_PATHS.map(sourcePath))].sort().map(sourceIdentity);
assert.equal(artifacts.length,28);
assert.equal(sources.length,28);
const artifactJsonSha=sha256(Buffer.from(JSON.stringify(artifacts),"utf8"));
const sourceJsonSha=sha256(Buffer.from(JSON.stringify(sources),"utf8"));
const artifactCanonicalSha=sha256(Buffer.from(canonical(artifacts),"utf8"));
const sourceCanonicalSha=sha256(Buffer.from(canonical(sources),"utf8"));
assert.equal(artifactJsonSha,frozenCandidate.hosted_census_evidence.artifact_inventory_sha256,
  "economic_artifact_inventory_changed");
assert.equal(sourceJsonSha,frozenCandidate.hosted_census_evidence.source_inventory_sha256,
  "economic_source_inventory_changed");
assert.equal(artifactCanonicalSha,frozenCandidate.current_inventory_evidence.canonical_artifact_inventory_sha256,
  "canonical_economic_artifact_inventory_changed");
assert.equal(sourceCanonicalSha,frozenCandidate.current_inventory_evidence.canonical_source_inventory_sha256,
  "canonical_economic_source_inventory_changed");

const oldRows=frozenCandidate.current_enforcement_tracked_source_inventory_v1;
assert.deepEqual(oldRows.map(r=>r.path),[...oldRows.map(r=>r.path)].sort(),
  "frozen_protected_paths_not_sorted");
assert.equal(new Set(oldRows.map(r=>r.path)).size,49,"frozen_protected_path_duplicate");
const newRows=oldRows.map(row=>treeRow("HEAD",row.path));
const deltas=[];
for(let i=0;i<oldRows.length;i+=1){
  const before=oldRows[i],after=newRows[i];
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
  deltas.map(d=>({path:d.path,before_blob:d.before_blob,after_blob:d.after_blob,mode:d.after_mode})),
  EXPECTED_PROTECTED_DELTA,
  "protected_generation_delta_scope_invalid",
);
for(const expected of EXPECTED_PROTECTED_DELTA){
  assert.equal(treeRow(BASE_MAIN,expected.path).git_blob_sha1,expected.before_blob,
    "base_main_protected_identity_drift:"+expected.path);
}
const protectedCanonicalSha=sha256(Buffer.from(canonical(newRows),"utf8"));
const protectedJsonSha=sha256(Buffer.from(JSON.stringify(newRows),"utf8"));
assert.notEqual(protectedCanonicalSha,
  frozenCandidate.current_enforcement_tracked_source_inventory_sha256,
  "protected_inventory_generation_did_not_advance");

for(const [relative,blob,mode] of SOURCE_GENERATION_EVIDENCE){
  const current=treeRow("HEAD",relative);
  assert.equal(current.git_blob_sha1,blob,"source_generation_evidence_blob_drift:"+relative);
  assert.equal(current.git_mode,mode,"source_generation_evidence_mode_drift:"+relative);
}

const body=Object.freeze({
  schema:"void_buy_void_enforcement_final_protected_v7_v2_census_v5",
  marker:MARKER,
  version:5,
  repository:"6ZoSo9/void-node",
  base_main:BASE_MAIN,
  range_parent:RANGE_PARENT,
  repository_head_sha:git(["rev-parse","HEAD"]),
  repository_tree_sha:git(["rev-parse","HEAD^{tree}"]),
  frozen_v2_candidate:Object.freeze({
    path:FROZEN_CANDIDATE,
    git_blob_sha1:FROZEN_CANDIDATE_BLOB,
    candidate_enforcement_set_sha256:frozenCandidate.candidate_enforcement_set_sha256,
    protected_inventory_sha256:frozenCandidate.current_enforcement_tracked_source_inventory_sha256,
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
  range_error_generation_blob:"7df1f21c730b554c414c88c550a4475234485370",
  canonical_producer_runner_generation_blob:"d7d7aede7fcd764a6182bd31f12338c5d3674ecb",
  source_generation_successor_evidence_bound:true,
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
