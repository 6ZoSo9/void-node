#!/usr/bin/env node
// Exact-code source-generation lock for UNACCEPTED Nimo witness V2 bundle.
// It does NOT qualify an installed Nimo host, IPC, wallet, ledger or launch.
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LOCK_PATH =
  "docs/architecture/buy-void-witness-runtime-v2-source-locked-candidate-v1.json";
const DERIVE_PATH =
  "scripts/prove_buy_void_witness_runtime_bundle_v2_candidate.mjs";
const V1_CONTRACT =
  "src/economic/buy_void_allocation_custody_witness_runtime_bundle_qualification_v1.ts";
const LOCK_GIT_BLOB = "1cceafd7ca04aaa25233d11bfc88b89d2821b750";
const GENERATOR_GIT_BLOB = "3c25a46818eace3f989b75466013cc7c4cec1362";
const HISTORICAL_V1_BLOB = "d0f80d3b50e3dcc46c1f58dc4bd0a73b7875db56";
const EXPECTED_LOCKED_GENERATION =
  "884edc6e82bd505a83e51a44b38f7e318431f314";
const EXPECTED_CANDIDATE_ID =
  "voidwfb2_b1cf93ea36879332d2745294b8aab1b261d5e7c13522af681db8d390254df73d";
const EXPECTED_CANDIDATE_SHA =
  "sha256:84be9d7a3e8ac9b5426dacd324f0d6e1b45eac5ae0fe797b2a072de57180ccf3";
const ALL_FALSE = Object.freeze([
  "runtime_bundle_identity_accepted",
  "installed_nimo_witness_verified",
  "external_transport_authenticated",
  "production_payment_authority_ready",
  "production_allocation_mutation_ready",
  "presale_activation",
  "funds_movement",
]);
function sha(bytes) {
  return "sha256:" + crypto.createHash("sha256").update(bytes).digest("hex");
}
function gitBlob(bytes) {
  return crypto.createHash("sha1")
    .update(Buffer.from("blob " + bytes.length + "\0", "utf8"))
    .update(bytes).digest("hex");
}
function fileBytes(p) {
  assert.match(p, /^(?:[a-zA-Z0-9_.-]+\/)*[a-zA-Z0-9_.-]+$/u);
  assert.ok(!p.split("/").includes(".."));
  return fs.readFileSync(path.join(ROOT, p));
}
function validateExactKeys(value, keys, reason) {
  assert.ok(value && typeof value === "object" && !Array.isArray(value), reason);
  assert.deepEqual(Object.keys(value).sort(), [...keys].sort(), reason);
}
function distinctPaths(items, type) {
  assert.equal(new Set(items.map(f => f.path)).size, items.length, type);
}
function canonicalSourcePair(candidate, lock) {
  const actual = candidate.source_files.map(x => ({
    path:x.path, git_blob_sha1:x.git_blob_sha1,
  }));
  assert.deepEqual(actual, lock.source_files, "V2 source-byte identities drift");
}
function canonicalRuntimePair(candidate, lock) {
  const current = candidate.runtime_files.map(x => ({
    path:x.path, installed_path:x.installed_path,
    bytes:x.bytes, sha256:x.sha256,
  }));
  assert.deepEqual(current, lock.runtime_files, "V2 compiled or install paths drift");
}
function canonicalBuildPair(candidate, lock) {
  const actual = candidate.build_inputs.map(x => ({
    path:x.path,git_blob_sha1:x.git_blob_sha1,
  }));
  assert.deepEqual(actual,lock.build_inputs,"build or source-lock input changed");
}
function assertQualifiedCandidate(candidate, lock) {
  validateExactKeys(candidate, [
    "schema","version","repository","exact_source_generation_commit",
    "historical_predecessor","source_file_count",
    "unchanged_historical_source_count","changed_source_count",
    "source_files","runtime_file_count","runtime_files",
    "runtime_edge_count","relative_runtime_edges","external_builtin_imports",
    "build_inputs","compiler","runtime_bundle_identity_accepted",
    "historical_v1_qualified_for_current_source","deployed_bundle_verified",
    "installed_nimo_witness_verified","external_transport_authenticated",
    "production_payment_authority_ready","production_allocation_mutation_ready",
    "presale_activation","funds_movement","candidate_manifest_id"
  ], "candidate generation exact schema");
  assert.equal(candidate.schema, "void_buy_void_witness_runtime_bundle_v2_candidate");
  assert.equal(candidate.version, 2);
  assert.equal(candidate.repository, "6ZoSo9/void-node");
  assert.equal(candidate.exact_source_generation_commit, EXPECTED_LOCKED_GENERATION);
  assert.equal(lock.exact_source_generation_commit, EXPECTED_LOCKED_GENERATION);
  assert.equal(candidate.candidate_manifest_id, EXPECTED_CANDIDATE_ID);
  assert.equal(lock.candidate_manifest_id, EXPECTED_CANDIDATE_ID);
  assert.equal(lock.candidate_json_sha256, EXPECTED_CANDIDATE_SHA);
  assert.equal(candidate.source_file_count,8);
  assert.equal(candidate.runtime_file_count,8);
  assert.equal(candidate.runtime_edge_count,11);
  assert.equal(candidate.unchanged_historical_source_count,7);
  assert.equal(candidate.changed_source_count,1);
  assert.equal(lock.source_file_count,8);
  assert.equal(lock.runtime_file_count,8);
  assert.equal(lock.relative_import_edge_count,11);
  assert.equal(lock.unchanged_historical_source_files,7);
  assert.equal(lock.changed_source_file,
    "src/economic/buy_void_auto_fulfillment_v1.ts");
  assert.equal(candidate.source_files.length,8);
  assert.equal(candidate.runtime_files.length,8);
  assert.equal(candidate.relative_runtime_edges.length,11);
  assert.equal(candidate.build_inputs.length,7);
  distinctPaths(candidate.source_files,"source");
  distinctPaths(candidate.runtime_files,"runtime");
  canonicalSourcePair(candidate,lock);
  canonicalRuntimePair(candidate,lock);
  canonicalBuildPair(candidate,lock);
  let observedChangedSourceCount = 0;
  for(const source of candidate.source_files) {
    assert.equal(gitBlob(fileBytes(source.path)),source.git_blob_sha1,
      "current reviewer source drift " + source.path);
    assert.equal(typeof source.historical_v1_source_git_blob_sha1,"string");
    const isUnchanged =
      source.historical_v1_source_git_blob_sha1 === source.git_blob_sha1;
    assert.equal(source.unchanged_since_historical_v1,isUnchanged,
      "historical source comparison claim drift " + source.path);
    if(!isUnchanged) {
      observedChangedSourceCount++;
      assert.equal(source.path,
        "src/economic/buy_void_auto_fulfillment_v1.ts");
      assert.equal(source.historical_v1_source_git_blob_sha1,
        "1ac1ad6213be83f1aa8261a554caa91544fe5e09");
    }
  }
  assert.equal(observedChangedSourceCount,1,
    "exactly one current source module may differ from V1");
  for(const artifact of candidate.runtime_files) {
    const bytes=fileBytes(artifact.path);
    assert.equal(bytes.length,artifact.bytes,"compiled bytes length "+artifact.path);
    assert.equal(sha(bytes).slice("sha256:".length),artifact.sha256,
      "compiled bytes digest "+artifact.path);
  }
  for(const input of candidate.build_inputs) {
    assert.equal(gitBlob(fileBytes(input.path)),input.git_blob_sha1,
      "reviewed build input drift "+input.path);
  }
  assert.equal(candidate.compiler.typescript_version,"5.9.3");
  assert.deepEqual(lock.compiler,{
    typescript_version:"5.9.3",
    typescript_js_sha256:
      "3ae902c92cc44dace175c0e69e13a4b0899f6983c6121d76b9ab8dd5795e7675",
    tsc_js_sha256:
      "e8f349eabd48486bdb2bf9dc1a00c89d58297270c54b745838879e2859194419",
  });
  assert.equal(candidate.compiler.typescript_library.sha256,
    lock.compiler.typescript_js_sha256);
  assert.equal(candidate.compiler.tsc_entry.sha256,
    lock.compiler.tsc_js_sha256);
  assert.deepEqual([...new Set(candidate.external_builtin_imports.map(x =>
    x.specifier))].sort(),lock.external_builtin_modules);
  assert.deepEqual(candidate.historical_predecessor,{
    source_commit:lock.historical_v1.source_commit,
    manifest_id:lock.historical_v1.manifest_id,
    manifest_sha256:lock.historical_v1.manifest_sha256,
    contract_git_blob_sha1:lock.historical_v1.contract_git_blob_sha1,
  });
  assert.equal(candidate.historical_predecessor.contract_git_blob_sha1,
    gitBlob(fileBytes(V1_CONTRACT)));
  assert.equal(candidate.historical_v1_qualified_for_current_source,false);
  assert.equal(candidate.deployed_bundle_verified,false);
  assert.equal(lock.historical_v1_artifact_rewritten,false);
  assert.equal(lock.locked_candidate_only,true);
  for(const key of ALL_FALSE) {
    assert.equal(candidate[key],false,"candidate authority not false:"+key);
    assert.equal(lock[key],false,"lock authority not false:"+key);
  }
}
const lockBytes=fileBytes(LOCK_PATH);
assert.equal(gitBlob(lockBytes),LOCK_GIT_BLOB,"reviewed lock file edited");
const generatorBytes=fileBytes(DERIVE_PATH);
assert.equal(gitBlob(generatorBytes),GENERATOR_GIT_BLOB,
  "reviewed V2 derivation source edited");
assert.equal(gitBlob(fileBytes(V1_CONTRACT)),HISTORICAL_V1_BLOB,
  "immutable V1 witness contract edited");
const lock=JSON.parse(lockBytes.toString("utf8"));
validateExactKeys(lock, [
"schema","marker","version","repository","exact_source_generation_commit",
"reviewed_generator_git_blob_sha1","generator_branch_head","candidate_manifest_id",
"candidate_json_sha256","historical_v1","source_files","runtime_files",
"source_file_count","runtime_file_count","relative_import_edge_count",
"unchanged_historical_source_files","changed_source_file","build_inputs",
"compiler","external_builtin_modules","locked_candidate_only",
"historical_v1_artifact_rewritten","runtime_bundle_identity_accepted",
"installed_nimo_witness_verified","external_transport_authenticated",
"production_payment_authority_ready","production_allocation_mutation_ready",
"presale_activation","funds_movement"
], "candidate source lock exact schema");
assert.equal(lock.schema,
  "void_buy_void_witness_runtime_v2_source_lock_candidate_v1");
assert.equal(lock.marker,
  "VOID_BUY_VOID_WITNESS_RUNTIME_V2_SOURCE_LOCK_CANDIDATE_V1");
assert.equal(lock.version,1);
assert.equal(lock.repository,"6ZoSo9/void-node");
assert.equal(lock.reviewed_generator_git_blob_sha1,GENERATOR_GIT_BLOB);
assert.equal(lock.generator_branch_head,
  "d68058d8513b79b98788b7fd3334b377df0fc25b");

const run=spawnSync(process.execPath,[path.join(ROOT,DERIVE_PATH),"--derive"],{
  cwd:ROOT,encoding:"utf8",timeout:120000,
  maxBuffer:1024*1024*4,
  env:{
    PATH:process.env.PATH||"/usr/bin:/bin",
    HOME:"/nonexistent",LANG:"C",TZ:"UTC",
    GIT_CONFIG_NOSYSTEM:"1",GIT_CONFIG_GLOBAL:"/dev/null",
  },
});
assert.equal(run.error,undefined,String(run.error?.message||""));
assert.equal(run.status,0,run.stderr?.slice(-4000));
const derived=Buffer.from(run.stdout,"utf8");
assert.equal(sha(derived),EXPECTED_CANDIDATE_SHA,
  "full candidate JSON bytes changed");
const candidate=JSON.parse(run.stdout);
assertQualifiedCandidate(candidate,lock);

// Falsification: a malicious future proposed bundle cannot borrow this
// reviewed candidate lock even with a superficially valid manifest ID.
for(const sample of [
  c=>{c.runtime_files[5].sha256="0".repeat(64);},
  c=>{c.runtime_files[5].installed_path="/tmp/other";},
  c=>{c.source_files[5].git_blob_sha1="0".repeat(40);},
  c=>{c.source_files[5].unchanged_since_historical_v1=true;},
  c=>{c.historical_predecessor.manifest_id="voidwfb1_unreviewed";},
  c=>{c.runtime_bundle_identity_accepted=true;},
  c=>{c.runtime_edge_count=12;},
  c=>{c.build_inputs[0].git_blob_sha1="0".repeat(40);},
]) {
  const adversary=JSON.parse(JSON.stringify(candidate));
  sample(adversary);
  assert.throws(()=>assertQualifiedCandidate(adversary,lock),
    undefined,"synthetic candidate mutation must HOLD");
}
console.log("VOID_BUY_VOID_WITNESS_RUNTIME_V2_LOCKED_CANDIDATE_V1_GREEN");
console.log("exact_candidate_source_generation=884edc6e82bd505a83e51a44b38f7e318431f314");
console.log("candidate_manifest_id="+EXPECTED_CANDIDATE_ID);
console.log("candidate_json_sha256="+EXPECTED_CANDIDATE_SHA);
console.log("8_source_and_8_compiled_artifacts_exact=true");
console.log("11_static_relative_imports_exact=true");
console.log("reviewed_compiler_and_build_inputs_exact=true");
console.log("synthetic_source_compiled_manifest_drift_rejected=true");
console.log("historical_V1_manifest_and_contract_preserved=true");
console.log("current_V2_installed_on_Nimo=false");
console.log("external_custody_transport_authenticated=false");
console.log("production_allocation_mutation_ready=false");
console.log("presale_activation=false");
console.log("funds_movement=false");
