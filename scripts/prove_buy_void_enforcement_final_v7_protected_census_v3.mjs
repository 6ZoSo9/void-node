#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const SOURCE_PARENT="2c2b56911efa0775378ee653b4a6699d93ae1104";
const PRIOR_LOCK="ops/security/buy-void-enforcement-post2865-lock-v1.json";
const PRIOR_ACCEPTED_SET=
  "1f83d8e867fc53e8a9ed240f4876f1f9412b7b2dca7c06cbb479dbe38e40a93b";
const PACKAGE_MANIFEST=
  "ops/security/reviewed-node-package-runtime-enforcement-post2865-v1.json";
const PROVIDER_EVIDENCE=
  "ops/security/buy-void-delivery-dependency-provider-closure-post2865-v1.json";
const SELECTOR_LOCK=
  "ops/security/buy-void-v7-live-process-v2-selector-elf-lock-v1.json";
const SELECTOR_SOURCE=
  "ops/precision/void_buy_void_source_finality_live_process_v2_selector_guard.c";
const LAUNCHER=
  "ops/precision/void_buy_void_source_finality_v7_privileged_launcher_body_v2.bash";
const NATIVE_PREENTRY=
  "ops/precision/void_buy_void_source_finality_v7_native_preentry_v1.c";
const PACKAGE_PROOF=
  "scripts/prove_void_buy_v7_privileged_launcher_package_runtime_v2.mjs";
const MAX_ARTIFACT_BYTES=4*1024*1024;

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

const PROTECTED_PATHS=Object.freeze([
  "ops/precision/void_buy_void_source_finality_v7_native_preentry_v1.c",
  "ops/precision/void_buy_void_source_finality_v7_privileged_launcher_body_v2.bash",
  "ops/precision/void_buy_void_source_finality_v7_privileged_launcher_v1.sh",
  "ops/precision/void_buy_void_source_finality_v7_deployment_receipt_install_v1.ts",
  "ops/precision/void_buy_void_source_finality_provider_pair_binding_receipt_install_v1.ts",
  "ops/precision/void_buy_void_source_finality_live_process_binding_v2_receipt_publish_v1.ts",
  "ops/precision/void_buy_void_source_finality_live_process_v2_collection_plan_v1.ts",
  "ops/precision/void_buy_void_source_finality_live_process_v2_selector_guard.c",
  "ops/security/buy-void-v7-live-process-v2-selector-elf-lock-v1.json",
  "scripts/prove_void_buy_v7_privileged_launcher_package_runtime_v2.mjs",
  "runtime/canonical-producer-source-custody-v1.cjs",
  "package.json",
  "tsconfig.json",
]);

const sha256=bytes=>crypto.createHash("sha256").update(bytes).digest("hex");
const gitBlob=bytes=>crypto.createHash("sha1")
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
      PATH:"/usr/bin:/bin",HOME:"/nonexistent",LANG:"C",LC_ALL:"C",TZ:"UTC",
      GIT_CONFIG_NOSYSTEM:"1",GIT_CONFIG_GLOBAL:"/dev/null",
      GIT_CONFIG_SYSTEM:"/dev/null",GIT_NO_REPLACE_OBJECTS:"1",
      GIT_OPTIONAL_LOCKS:"0",GIT_TERMINAL_PROMPT:"0",
    },
  });
  if(!allowFail){
    assert.equal(r.error,undefined,String(r.error||""));
    assert.equal(r.status,0,String(r.stderr||r.stdout||""));
  }
  return r;
}
function gitText(args){return String(git(args).stdout||"").trim();}
function readExact(relative,max=MAX_ARTIFACT_BYTES){
  assert.ok(!path.isAbsolute(relative)&&!relative.split("/").includes(".."),
    "relative_path_required:"+relative);
  const absolute=path.join(ROOT,relative);
  const before=fs.lstatSync(absolute);
  assert.ok(before.isFile()&&!before.isSymbolicLink()&&before.nlink===1&&
    before.size>0&&before.size<=max,"file_metadata_invalid:"+relative);
  const bytes=fs.readFileSync(absolute);
  const after=fs.lstatSync(absolute);
  for(const key of ["dev","ino","size","mtimeMs","ctimeMs"]){
    assert.equal(after[key],before[key],"file_changed_"+key+":"+relative);
  }
  assert.equal(bytes.length,before.size,"short_read:"+relative);
  return bytes;
}
function sourcePathForArtifact(relative){
  assert.ok(relative.startsWith("dist/economic/")&&relative.endsWith(".js"));
  return "src/economic/"+path.basename(relative,".js")+".ts";
}
function sourceIdentity(relative){
  const bytes=readExact(relative);
  const blob=gitBlob(bytes);
  assert.equal(gitText(["rev-parse","HEAD:"+relative]),blob,
    "source_head_blob_mismatch:"+relative);
  return Object.freeze({
    path:relative,bytes:bytes.length,git_blob_sha1:blob,sha256:sha256(bytes),
  });
}
function artifactIdentity(relative){
  const bytes=readExact(relative);
  return Object.freeze({path:relative,bytes:bytes.length,sha256:sha256(bytes)});
}
function trackedMode(relative){
  const row=gitText(["ls-tree","HEAD","--",relative]);
  const m=/^([0-9]{6})\s+blob\s+[0-9a-f]{40}\t/u.exec(row);
  assert.ok(m,"tracked_mode_unavailable:"+relative);
  return m[1];
}
function protectedIdentity(relative){
  const bytes=readExact(relative);
  const blob=gitBlob(bytes);
  assert.equal(gitText(["rev-parse","HEAD:"+relative]),blob,
    "protected_head_blob_mismatch:"+relative);
  return Object.freeze({
    path:relative,
    git_mode:trackedMode(relative),
    bytes:bytes.length,
    git_blob_sha1:blob,
    sha256:sha256(bytes),
  });
}
function parseJson(relative,max=1024*1024){
  return JSON.parse(readExact(relative,max).toString("utf8"));
}
function digestInitializer(hex){
  assert.match(hex,/^[0-9a-f]{64}$/u);
  const bytes=hex.match(/../gu);
  return "{"+bytes.map(v=>"0x"+v).join(",")+"}";
}

assert.equal(process.platform,"linux");
assert.equal(process.arch,"x64");
assert.ok([22,24,26].includes(Number(process.versions.node.split(".")[0])));

gitText(["merge-base","--is-ancestor",SOURCE_PARENT,"HEAD"]);
const guardedPaths=[
  "src/economic","package.json","package-lock.json","tsconfig.json",
  "tsconfig.build.json",...PROTECTED_PATHS,
];
const drift=git([
  "diff","--quiet","--no-ext-diff","--no-textconv",
  SOURCE_PARENT,"HEAD","--",...guardedPaths,
],{allowFail:true});
assert.equal(drift.error,undefined,String(drift.error||""));
assert.equal(drift.status,0,
  "enforcement_input_changed_after_protected_publisher_parent");

const head=gitText(["rev-parse","HEAD"]);
const tree=gitText(["rev-parse","HEAD^{tree}"]);
assert.match(head,/^[0-9a-f]{40}$/u);
assert.match(tree,/^[0-9a-f]{40}$/u);

const priorLock=parseJson(PRIOR_LOCK,128*1024);
assert.equal(priorLock.marker,"VOID_BUY_VOID_ENFORCEMENT_POST2865_LOCK_V1");
assert.equal(priorLock.candidate_enforcement_identity_accepted,true);
assert.equal(priorLock.candidate_evidence?.candidate_enforcement_set_sha256,
  PRIOR_ACCEPTED_SET);

const packageManifest=parseJson(PACKAGE_MANIFEST,256*1024);
assert.equal(packageManifest.profile_identity_accepted,true);
assert.deepEqual(packageManifest.root_packages,["ethers","express"]);
assert.equal(packageManifest.post_2865_dependency_generation,true);

const providerEvidence=parseJson(PROVIDER_EVIDENCE,1024*1024);
assert.equal(providerEvidence.marker,
  "VOID_BUY_VOID_DELIVERY_DEPENDENCY_PROVIDER_CLOSURE_V1");
assert.equal(providerEvidence.provider_static_module_closure_verified,true);
assert.equal(providerEvidence.post_2865_dependency_generation,true);

assert.equal(new Set(ARTIFACT_PATHS).size,ARTIFACT_PATHS.length);
assert.equal(new Set(PROTECTED_PATHS).size,PROTECTED_PATHS.length);
const artifacts=ARTIFACT_PATHS.map(artifactIdentity);
const sourcePaths=[...new Set(ARTIFACT_PATHS.map(sourcePathForArtifact))].sort();
const sources=sourcePaths.map(sourceIdentity);
const protectedSources=PROTECTED_PATHS.map(protectedIdentity);

assert.equal(artifacts.length,28);
assert.equal(sources.length,28);
assert.equal(protectedSources.length,13);

const selectorLock=parseJson(SELECTOR_LOCK,128*1024);
assert.equal(selectorLock.marker,"VOID_BUY_VOID_V2_SELECTOR_ELF_LOCK_V1");
assert.equal(selectorLock.selector_elf_identity_accepted,true);
assert.equal(selectorLock.install_authorized,false);
assert.equal(selectorLock.receipt_publication,false);
assert.equal(selectorLock.production_source_finality_authority_ready,false);
assert.equal(selectorLock.public_presale_activation,false);
assert.equal(selectorLock.funds_movement,false);
const selectorSource=protectedSources.find(x=>x.path===SELECTOR_SOURCE);
assert.ok(selectorSource);
assert.equal(selectorLock.accepted_source_git_blob_sha1,
  selectorSource.git_blob_sha1);
assert.match(selectorLock.lock_id,/^voidbsv2elflock1_[0-9a-f]{64}$/u);
assert.match(selectorLock.accepted_binary_sha256,/^[0-9a-f]{64}$/u);
assert.ok(Number.isSafeInteger(selectorLock.accepted_binary_bytes)&&
  selectorLock.accepted_binary_bytes>0);

const launcherBytes=readExact(LAUNCHER);
const launcherSha=sha256(launcherBytes);
const packageProof=protectedSources.find(x=>x.path===PACKAGE_PROOF);
assert.ok(packageProof);
const launcherText=launcherBytes.toString("utf8");
assert.ok(launcherText.includes(
  'PACKAGE_RUNTIME_PROOF_BLOB="'+packageProof.git_blob_sha1+'"'));
for(const required of [
  'deployment)',
  'tool_path="ops/precision/void_buy_void_source_finality_v7_deployment_receipt_install_v1.ts"',
  'provider-pair)',
  'tool_path="ops/precision/void_buy_void_source_finality_provider_pair_binding_receipt_install_v1.ts"',
  'live-process-v2)',
  'tool_path="ops/precision/void_buy_void_source_finality_live_process_binding_v2_receipt_publish_v1.ts"',
])assert.ok(launcherText.includes(required),"launcher_missing:"+required);
assert.equal(/(^|\n)\s*live-process\)/u.test(launcherText),false,
  "historical_v1_live_process_tool_must_not_be_allowlisted");

const nativeText=readExact(NATIVE_PREENTRY).toString("utf8");
assert.ok(nativeText.includes("#define FIXED_LAUNCHER_BYTES "+launcherBytes.length+"U"),
  "native_launcher_size_binding_mismatch");
assert.ok(nativeText.includes(
  "FIXED_LAUNCHER_SHA256[32]="+digestInitializer(launcherSha)),
  "native_launcher_sha256_binding_mismatch");

const protectedAggregate=
  sha256(Buffer.from(canonical(protectedSources),"utf8"));
const artifactAggregate=sha256(Buffer.from(canonical(artifacts),"utf8"));
const sourceAggregate=sha256(Buffer.from(canonical(sources),"utf8"));

const body=Object.freeze({
  schema:"void_buy_void_enforcement_final_v7_protected_census_v3",
  marker:"VOID_BUY_VOID_ENFORCEMENT_FINAL_V7_PROTECTED_CENSUS_V3",
  version:3,
  repository:"6ZoSo9/void-node",
  source_parent:SOURCE_PARENT,
  repository_head_sha:head,
  repository_tree_sha:tree,
  economic_artifact_count:artifacts.length,
  economic_artifacts:artifacts,
  economic_artifact_inventory_sha256:artifactAggregate,
  economic_source_file_count:sources.length,
  economic_sources:sources,
  economic_source_inventory_sha256:sourceAggregate,
  protected_execution_source_count:protectedSources.length,
  protected_execution_sources:protectedSources,
  protected_execution_inventory_sha256:protectedAggregate,
  selector_elf_lock:Object.freeze({
    path:SELECTOR_LOCK,
    lock_id:selectorLock.lock_id,
    accepted_source_git_blob_sha1:selectorLock.accepted_source_git_blob_sha1,
    accepted_binary_sha256:selectorLock.accepted_binary_sha256,
    accepted_binary_bytes:selectorLock.accepted_binary_bytes,
    selector_elf_identity_accepted:true,
  }),
  protected_launcher:Object.freeze({
    path:LAUNCHER,
    bytes:launcherBytes.length,
    sha256:launcherSha,
    native_preentry_path:NATIVE_PREENTRY,
    native_launcher_size_bound:true,
    native_launcher_sha256_bound:true,
    historical_v1_live_process_tool_allowlisted:false,
    live_process_v2_tool_allowlisted:true,
  }),
  prior_accepted_enforcement_set_sha256:PRIOR_ACCEPTED_SET,
  audited_package_profile_id:packageManifest.profile_id,
  audited_package_profile_canonical_sha256:
    packageManifest.profile_canonical_sha256,
  provider_closure_sha256:providerEvidence.provider_closure_sha256,
  census_only:true,
  complete_executable_closure_verified:false,
  candidate_enforcement_identity_accepted:false,
  deployed_artifact_generation_verified:false,
  runtime_mount_authority:false,
  production_source_finality_authority_ready:false,
  public_presale_activation:false,
  funds_movement:false,
});
const censusId="voidbefv7pc3_"+sha256(Buffer.from(canonical(body),"utf8"));
process.stdout.write(JSON.stringify({...body,census_id:censusId},null,2)+"\n");
