#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const SOURCE_PARENT="82aee920f26b45c7e43bcc9f9e1023a175e2783a";
const PRIOR_LOCK="ops/security/buy-void-enforcement-post2865-lock-v1.json";
const PRIOR_ACCEPTED_SET=
  "1f83d8e867fc53e8a9ed240f4876f1f9412b7b2dca7c06cbb479dbe38e40a93b";
const PACKAGE_MANIFEST=
  "ops/security/reviewed-node-package-runtime-enforcement-post2865-v1.json";
const PROVIDER_EVIDENCE=
  "ops/security/buy-void-delivery-dependency-provider-closure-post2865-v1.json";
const MAX_ARTIFACT_BYTES=2*1024*1024;

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

const sha256=(bytes)=>crypto.createHash("sha256").update(bytes).digest("hex");
const gitBlob=(bytes)=>crypto.createHash("sha1")
  .update(Buffer.from("blob "+bytes.length+"\0","utf8"))
  .update(bytes).digest("hex");

function canonical(v){
  if(v===null||typeof v==="boolean"||typeof v==="string")return JSON.stringify(v);
  if(typeof v==="number"){
    assert.ok(Number.isSafeInteger(v),"noncanonical_number");
    return String(v);
  }
  if(Array.isArray(v))return "["+v.map(canonical).join(",")+"]";
  assert.ok(v&&typeof v==="object"&&!Array.isArray(v),"noncanonical_value");
  return "{"+Object.keys(v).sort()
    .map(k=>JSON.stringify(k)+":"+canonical(v[k])).join(",")+"}";
}

function git(args,{allowFail=false}={}){
  const r=spawnSync("/usr/bin/git",[
    "--no-replace-objects",
    "-c","core.hooksPath=/dev/null",
    "-c","core.attributesFile=/dev/null",
    "-c","core.fsmonitor=false",
    "-c","core.untrackedCache=false",
    "-c","core.preloadIndex=false",
    "-c","submodule.recurse=false",
    "-C",ROOT,
    ...args,
  ],{
    encoding:"utf8",
    stdio:["ignore","pipe","pipe"],
    timeout:30_000,
    maxBuffer:8*1024*1024,
    env:{
      PATH:"/usr/bin:/bin",
      HOME:"/nonexistent",
      LANG:"C",
      LC_ALL:"C",
      TZ:"UTC",
      GIT_CONFIG_NOSYSTEM:"1",
      GIT_CONFIG_GLOBAL:"/dev/null",
      GIT_CONFIG_SYSTEM:"/dev/null",
      GIT_NO_REPLACE_OBJECTS:"1",
      GIT_OPTIONAL_LOCKS:"0",
      GIT_TERMINAL_PROMPT:"0",
    },
  });
  if(!allowFail){
    assert.equal(r.error,undefined,String(r.error||""));
    assert.equal(r.status,0,String(r.stderr||r.stdout||""));
  }
  return r;
}
function gitText(args){
  return String(git(args).stdout||"").trim();
}
function readExact(relative,max=MAX_ARTIFACT_BYTES){
  assert.ok(!path.isAbsolute(relative)&&!relative.split("/").includes(".."),
    "relative_path_required:"+relative);
  const absolute=path.join(ROOT,relative);
  const before=fs.lstatSync(absolute);
  assert.ok(
    before.isFile()&&!before.isSymbolicLink()&&before.nlink===1&&
    before.size>0&&before.size<=max,
    "artifact_metadata_invalid:"+relative,
  );
  const bytes=fs.readFileSync(absolute);
  const after=fs.lstatSync(absolute);
  assert.equal(after.dev,before.dev,"artifact_device_drift:"+relative);
  assert.equal(after.ino,before.ino,"artifact_inode_drift:"+relative);
  assert.equal(after.size,before.size,"artifact_size_drift:"+relative);
  assert.equal(after.mtimeMs,before.mtimeMs,"artifact_mtime_drift:"+relative);
  assert.equal(after.ctimeMs,before.ctimeMs,"artifact_ctime_drift:"+relative);
  assert.equal(bytes.length,before.size,"artifact_short_read:"+relative);
  return bytes;
}
function sourcePathForArtifact(relative){
  assert.ok(relative.startsWith("dist/economic/")&&relative.endsWith(".js"));
  return "src/economic/"+path.basename(relative,".js")+".ts";
}
function sourceIdentity(relative){
  const bytes=readExact(relative,4*1024*1024);
  const blob=gitBlob(bytes);
  assert.equal(gitText(["rev-parse","HEAD:"+relative]),blob,
    "worktree_head_source_mismatch:"+relative);
  return Object.freeze({
    path:relative,
    bytes:bytes.length,
    git_blob_sha1:blob,
    sha256:sha256(bytes),
  });
}
function artifactIdentity(relative){
  const bytes=readExact(relative);
  return Object.freeze({
    path:relative,
    bytes:bytes.length,
    sha256:sha256(bytes),
  });
}
function parseJsonFile(relative,max=1024*1024){
  return JSON.parse(readExact(relative,max).toString("utf8"));
}

assert.equal(process.platform,"linux");
assert.equal(process.arch,"x64");
assert.ok([22,24,26].includes(Number(process.versions.node.split(".")[0])));

gitText(["merge-base","--is-ancestor",SOURCE_PARENT,"HEAD"]);
const drift=git([
  "diff","--quiet","--no-ext-diff","--no-textconv",
  SOURCE_PARENT,"HEAD","--",
  "src/economic",
  "package.json","package-lock.json","tsconfig.build.json",
],{allowFail:true});
assert.equal(drift.error,undefined,String(drift.error||""));
assert.equal(drift.status,0,
  "runtime_or_build_source_changed_after_final_v7_v2_parent");

const head=gitText(["rev-parse","HEAD"]);
const tree=gitText(["rev-parse","HEAD^{tree}"]);
assert.match(head,/^[0-9a-f]{40}$/u);
assert.match(tree,/^[0-9a-f]{40}$/u);

const priorLock=parseJsonFile(PRIOR_LOCK,128*1024);
assert.equal(priorLock.marker,"VOID_BUY_VOID_ENFORCEMENT_POST2865_LOCK_V1");
assert.equal(priorLock.candidate_enforcement_identity_accepted,true);
assert.equal(
  priorLock.candidate_evidence?.candidate_enforcement_set_sha256,
  PRIOR_ACCEPTED_SET,
);

const packageManifest=parseJsonFile(PACKAGE_MANIFEST,256*1024);
assert.equal(packageManifest.profile_identity_accepted,true);
assert.deepEqual(packageManifest.root_packages,["ethers","express"]);
assert.equal(packageManifest.post_2865_dependency_generation,true);

const providerEvidence=parseJsonFile(PROVIDER_EVIDENCE,1024*1024);
assert.equal(
  providerEvidence.marker,
  "VOID_BUY_VOID_DELIVERY_DEPENDENCY_PROVIDER_CLOSURE_V1",
);
assert.equal(providerEvidence.provider_static_module_closure_verified,true);
assert.equal(providerEvidence.post_2865_dependency_generation,true);

assert.equal(new Set(ARTIFACT_PATHS).size,ARTIFACT_PATHS.length);
const artifacts=ARTIFACT_PATHS.map(artifactIdentity);
const sourcePaths=[...new Set(ARTIFACT_PATHS.map(sourcePathForArtifact))].sort();
const sources=sourcePaths.map(sourceIdentity);

const body=Object.freeze({
  schema:"void_buy_void_enforcement_final_v7_artifact_census_v2",
  marker:"VOID_BUY_VOID_ENFORCEMENT_FINAL_V7_ARTIFACT_CENSUS_V2",
  version:2,
  repository:"6ZoSo9/void-node",
  source_parent:SOURCE_PARENT,
  repository_head_sha:head,
  repository_tree_sha:tree,
  prior_accepted_enforcement_set_sha256:PRIOR_ACCEPTED_SET,
  audited_package_profile_id:packageManifest.profile_id,
  audited_package_profile_canonical_sha256:
    packageManifest.profile_canonical_sha256,
  provider_closure_sha256:providerEvidence.provider_closure_sha256,
  provider_closure_semantic_reuse_requires_requalification:true,
  artifact_count:artifacts.length,
  artifacts,
  source_file_count:sources.length,
  sources,
  census_only:true,
  complete_executable_closure_verified:false,
  candidate_enforcement_identity_accepted:false,
  deployed_artifact_generation_verified:false,
  runtime_mount_authority:false,
  production_source_finality_authority_ready:false,
  public_presale_activation:false,
  funds_movement:false,
});
const censusId="voidbefv7c2_"+sha256(Buffer.from(canonical(body),"utf8"));
process.stdout.write(JSON.stringify({...body,census_id:censusId},null,2)+"\n");
