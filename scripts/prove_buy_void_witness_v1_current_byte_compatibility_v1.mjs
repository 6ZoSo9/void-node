#!/usr/bin/env node
// Correct the original frozen V1 vs integration V1-alias collision.
// The ORIGINAL contract at f627 records source generation e390, not f627.
// The current compiled V2 candidate differs from the original installed V1
// in auto-fulfillment only. This is strictly a read-only source proof.
// NO production V1 acceptance transfer, install, service, or monetary authority.
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const CURRENT="884edc6e82bd505a83e51a44b38f7e318431f314";
const ORIGINAL_CONTRACT_COMMIT="f627cad6bc07a6ad3ebe7cbd946723316fcd0567";
const ORIGINAL_V1_SOURCE="e390424c1d31cd87dcf3551cc0d2d610a24e12f8";
const INTEGRATED_V1_SOURCE_ALIAS="f627cad6bc07a6ad3ebe7cbd946723316fcd0567";
const V1_CONTRACT="src/economic/buy_void_allocation_custody_witness_runtime_bundle_qualification_v1.ts";
const CONTRACT_BLOB="d0f80d3b50e3dcc46c1f58dc4bd0a73b7875db56";
const ORIGINAL_CONTRACT_BLOB="d2e84643c9f4d76c642c7e07d4ea2bf1634035e4";
const ORIGINAL_AUTO_SOURCE_BLOB="1ac1ad6213be83f1aa8261a554caa91544fe5e09";
const CURRENT_AUTO_SOURCE_BLOB="b7c963b1d55f000d82ad82289b31107b432503de";
const ORIGINAL_AUTO_COMPILED_SHA="sha256:ae15c56f1aa7009955058ca1d454da5e0d55a3e6c2011c54e7316374e33a5cf6";
const CURRENT_AUTO_COMPILED_SHA="sha256:119a08db651cb85091f66ed2c9e475c56a81f21c9084c47c7f8ee083f831a47c";
const AUTO_SOURCE="src/economic/buy_void_auto_fulfillment_v1.ts";
const AUTO_RUNTIME="dist/economic/buy_void_auto_fulfillment_v1.js";
const CANDIDATE_SCRIPT="scripts/prove_buy_void_witness_runtime_bundle_v2_candidate.mjs";
const CANDIDATE_SCRIPT_BLOB="3c25a46818eace3f989b75466013cc7c4cec1362";
const ORIGINAL_MANIFEST_ID=
  "voidwfb1_2a729229f63c10a1562050924ddc279d8255a35603542967431a584977f1f6b7";
const ORIGINAL_MANIFEST_SHA=
  "sha256:2190e7ab944436200b03e46285fa5ba4cda1b90d915cfda05b320d1b1dc7ebe2";
const CANDIDATE_ID=
  "voidwfb2_b1cf93ea36879332d2745294b8aab1b261d5e7c13522af681db8d390254df73d";

function read(rel){return fs.readFileSync(path.join(ROOT,rel));}
function gitBlob(bytes){
  return crypto.createHash("sha1")
    .update(Buffer.from("blob "+bytes.length+"\0")).update(bytes).digest("hex");
}
function git(args){
  return execFileSync("git",args,{
    cwd:ROOT,encoding:"utf8",stdio:["ignore","pipe","pipe"],
    timeout:20000,maxBuffer:1024*1024,
  }).trim();
}
function sourceAt(commit,rel){
  return git(["rev-parse",commit+":"+rel]);
}
function bytesAt(commit,rel){
  return execFileSync("git",["show",commit+":"+rel],{
    cwd:ROOT,stdio:["ignore","pipe","pipe"],
    timeout:20000,maxBuffer:1024*1024,
  });
}
function requireSourceIdentity(rel,expected){
  const actual=gitBlob(read(rel));
  assert.equal(actual,expected,"reviewed current source blob: "+rel);
}
function sourceConstant(src,name){
  const match=src.match(
    new RegExp("export const "+name+"\\s*=\\s*\"([^\"]+)\";","u"));
  assert.ok(match,"original V1 constant missing: "+name);
  return match[1];
}
function manifestRows(src){
  const regexp=/Object\.freeze\(\{ source_path: "([^"]+)", installed_path: "([^"]+)", sha256: "(sha256:[0-9a-f]{64})" \}\)/gu;
  const rows=[...src.matchAll(regexp)].map(match=>Object.freeze({
    path:match[1],installed_path:match[2],sha256:match[3],
  }));
  assert.equal(rows.length,8,"exact frozen V1 file list must remain eight");
  assert.equal(new Set(rows.map(row=>row.path)).size,8);
  assert.equal(new Set(rows.map(row=>row.installed_path)).size,8);
  return rows;
}
function deriveCandidate(){
  const text=execFileSync(process.execPath,[
    path.join(ROOT,CANDIDATE_SCRIPT),"--derive",
  ],{
    cwd:ROOT,encoding:"utf8",timeout:120000,
    maxBuffer:1024*1024,stdio:["ignore","pipe","pipe"],
  });
  const candidate=JSON.parse(text);
  assert.deepEqual(Object.keys(candidate).filter(k=>k==="candidate_manifest_id"),
    ["candidate_manifest_id"]);
  return candidate;
}
function checkCandidate(value, originalRows, variantRows) {
  assert.ok(value&&typeof value==="object"&&!Array.isArray(value));
  assert.equal(value.schema,"void_buy_void_witness_runtime_bundle_v2_candidate");
  assert.equal(value.version,2);
  assert.equal(value.repository,"6ZoSo9/void-node");
  assert.equal(value.exact_source_generation_commit,CURRENT);
  assert.equal(value.candidate_manifest_id,CANDIDATE_ID);
  assert.equal(value.runtime_file_count,8);
  assert.equal(value.runtime_edge_count,11);
  assert.equal(value.source_file_count,8);
  assert.equal(value.source_files?.length,8);
  assert.equal(value.runtime_files?.length,8);
  assert.equal(value.build_inputs?.length,7);
  assert.equal(value.compiler?.typescript_version,"5.9.3");
  assert.equal(value.compiler?.typescript_library?.sha256,
    "3ae902c92cc44dace175c0e69e13a4b0899f6983c6121d76b9ab8dd5795e7675");
  assert.equal(value.compiler?.tsc_entry?.sha256,
    "e8f349eabd48486bdb2bf9dc1a00c89d58297270c54b745838879e2859194419");
  assert.equal(value.historical_predecessor?.source_commit,ORIGINAL_V1_SOURCE);
  assert.equal(value.historical_predecessor?.manifest_id,ORIGINAL_MANIFEST_ID);
  assert.equal(value.historical_predecessor?.manifest_sha256,ORIGINAL_MANIFEST_SHA);
  // The derive-only precursor was already bound to the INTEGRATED alias,
  // not to the actual original frozen V1 contract: never silently relabel.
  assert.equal(value.historical_predecessor?.contract_git_blob_sha1,CONTRACT_BLOB);
  assert.equal(value.unchanged_historical_source_count,7);
  assert.equal(value.changed_source_count,1);
  const originals=new Map(originalRows.map(r=>[r.path,r]));
  const variants=new Map(variantRows.map(r=>[r.path,r]));
  const runtimeSeen=new Set();
  let originalCompiledMatches=0;
  let variantCompiledMatches=0;
  let differentAutoRuntime=0;
  for(const observed of value.runtime_files) {
    const old=originals.get(observed.path);
    const variant=variants.get(observed.path);
    assert.ok(old&&variant,"unrecognized current runtime: "+observed.path);
    assert.ok(!runtimeSeen.has(observed.path),"duplicate runtime file");
    runtimeSeen.add(observed.path);
    assert.equal(observed.installed_path,old.installed_path);
    assert.equal(observed.installed_path,variant.installed_path);
    const actual="sha256:"+observed.sha256;
    assert.equal(actual,variant.sha256,
      "current V2 compiled bytes must match the reviewed INTEGRATED alias");
    variantCompiledMatches++;
    if(actual===old.sha256) {
      originalCompiledMatches++;
    } else {
      assert.equal(observed.path,AUTO_RUNTIME,"unexpected original V1 runtime divergence");
      assert.equal(old.sha256,ORIGINAL_AUTO_COMPILED_SHA);
      assert.equal(actual,CURRENT_AUTO_COMPILED_SHA);
      differentAutoRuntime++;
    }
    assert.ok(Number.isSafeInteger(observed.bytes)&&observed.bytes>0);
  }
  assert.equal(runtimeSeen.size,8);
  assert.equal(originalCompiledMatches,7);
  assert.equal(variantCompiledMatches,8);
  assert.equal(differentAutoRuntime,1);
  assert.equal(originals.get(AUTO_RUNTIME).sha256,ORIGINAL_AUTO_COMPILED_SHA);
  assert.equal(variants.get(AUTO_RUNTIME).sha256,CURRENT_AUTO_COMPILED_SHA);
  const sourceSeen=new Set();
  let sameSources=0;
  let changedAutoSources=0;
  for(const observed of value.source_files) {
    assert.ok(typeof observed.path==="string");
    assert.ok(!sourceSeen.has(observed.path));
    sourceSeen.add(observed.path);
    const original=sourceAt(ORIGINAL_V1_SOURCE,observed.path);
    const current=sourceAt(CURRENT,observed.path);
    assert.equal(current,observed.git_blob_sha1,
      "reported current source identity differs from actual source");
    assert.equal(gitBlob(read(observed.path)),current,
      "working source differs from current reviewed commit");
    if(original===current) {
      sameSources++;
    } else {
      assert.equal(observed.path,AUTO_SOURCE,"unreviewed source generation drift");
      assert.equal(original,ORIGINAL_AUTO_SOURCE_BLOB);
      assert.equal(current,CURRENT_AUTO_SOURCE_BLOB);
      changedAutoSources++;
    }
  }
  assert.equal(sourceSeen.size,8);
  assert.equal(sameSources,7);
  assert.equal(changedAutoSources,1);
  const inputsSeen=new Set();
  for(const observed of value.build_inputs) {
    assert.ok(!inputsSeen.has(observed.path));
    inputsSeen.add(observed.path);
    const old=sourceAt(ORIGINAL_V1_SOURCE,observed.path);
    const current=sourceAt(CURRENT,observed.path);
    assert.equal(old,current,"witness V1 build input changed: "+observed.path);
    assert.equal(current,observed.git_blob_sha1,
      "reported current build input mismatch: "+observed.path);
    assert.equal(gitBlob(read(observed.path)),current,
      "worktree build input mismatch: "+observed.path);
  }
  assert.equal(inputsSeen.size,7);
  const MUST_FALSE=[
    "runtime_bundle_identity_accepted",
    "historical_v1_qualified_for_current_source",
    "deployed_bundle_verified",
    "installed_nimo_witness_verified",
    "external_transport_authenticated",
    "production_payment_authority_ready",
    "production_allocation_mutation_ready",
    "presale_activation",
    "funds_movement",
  ];
  for(const flag of MUST_FALSE)assert.equal(value[flag],false,flag);
  assert.ok(value.external_builtin_imports.some(x=>
    x.from===AUTO_RUNTIME&&x.specifier==="node:util"),
    "current V2 compiled Proxy detection import missing");
  return Object.freeze({
    source_files_match_original_frozen_v1:7,
    build_inputs_match_original_frozen_v1:7,
    runtime_hashes_match_original_frozen_v1:7,
    runtime_hashes_match_integration_v1_alias:8,
    original_v1_auto_runtime_sha256:ORIGINAL_AUTO_COMPILED_SHA,
    current_v2_auto_runtime_sha256:CURRENT_AUTO_COMPILED_SHA,
  });
}
function run(){
  assert.ok([22,24,26].includes(Number(process.versions.node.split(".")[0])));
  // The present branch carries the rewritten integration V1 alias; it is
  // NOT the original frozen V1 source. Verify both identities independently.
  requireSourceIdentity(V1_CONTRACT,CONTRACT_BLOB);
  requireSourceIdentity(CANDIDATE_SCRIPT,CANDIDATE_SCRIPT_BLOB);
  git(["merge-base","--is-ancestor",ORIGINAL_CONTRACT_COMMIT,"HEAD"]);
  git(["merge-base","--is-ancestor",ORIGINAL_V1_SOURCE,"HEAD"]);
  git(["merge-base","--is-ancestor",CURRENT,"HEAD"]);
  const frozenBytes=bytesAt(ORIGINAL_CONTRACT_COMMIT,V1_CONTRACT);
  assert.equal(gitBlob(frozenBytes),ORIGINAL_CONTRACT_BLOB,
    "original frozen V1 Git source must remain immutable");
  const frozenText=frozenBytes.toString("utf8");
  const variantText=read(V1_CONTRACT).toString("utf8");
  assert.notEqual(gitBlob(frozenBytes),gitBlob(Buffer.from(variantText,"utf8")));
  for(const text of [frozenText,variantText]) {
    assert.equal(sourceConstant(text,
      "VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_MANIFEST_ID_V1"),
      ORIGINAL_MANIFEST_ID);
    assert.equal(sourceConstant(text,
      "VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_MANIFEST_SHA256_V1"),
      ORIGINAL_MANIFEST_SHA);
  }
  assert.equal(sourceConstant(frozenText,
    "VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_CENSUS_SOURCE_COMMIT_V1"),
    ORIGINAL_V1_SOURCE);
  assert.equal(sourceConstant(variantText,
    "VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_CENSUS_SOURCE_COMMIT_V1"),
    INTEGRATED_V1_SOURCE_ALIAS);
  const frozenLines=frozenText.split("\n");
  const variantLines=variantText.split("\n");
  assert.equal(frozenLines.length,variantLines.length);
  const altered=frozenLines.flatMap((line,index)=>
    line===variantLines[index]?[]:[index+1]);
  assert.deepEqual(altered,[13,57],
    "same manifest ID must not quietly hide more than the reviewed two-line alias");
  const originalRows=manifestRows(frozenText);
  const variantRows=manifestRows(variantText);
  assert.equal(originalRows[5].path,AUTO_RUNTIME);
  assert.equal(variantRows[5].path,AUTO_RUNTIME);
  assert.equal(originalRows[5].sha256,ORIGINAL_AUTO_COMPILED_SHA);
  assert.equal(variantRows[5].sha256,CURRENT_AUTO_COMPILED_SHA);
  const candidate=deriveCandidate();
  const matched=checkCandidate(candidate,originalRows,variantRows);
  const clone=structuredClone(candidate);
  assert.equal(clone.runtime_bundle_identity_accepted,false);
  clone.runtime_bundle_identity_accepted=true;
  assert.throws(()=>checkCandidate(clone,originalRows,variantRows),undefined,
    "false runtime acceptance must not become true");
  clone.runtime_bundle_identity_accepted=false;
  clone.runtime_files[0].sha256="00".repeat(32);
  assert.throws(()=>checkCandidate(clone,originalRows,variantRows),undefined,
    "changed compiled hash must HOLD");
  const oldAutoImpersonation=structuredClone(candidate);
  oldAutoImpersonation.runtime_files[5].sha256=
    ORIGINAL_AUTO_COMPILED_SHA.slice("sha256:".length);
  assert.throws(()=>checkCandidate(oldAutoImpersonation,originalRows,variantRows),
    undefined,"old auto-fulfillment bytes cannot masquerade as current V2");
  const wrongCommit=structuredClone(candidate);
  wrongCommit.exact_source_generation_commit=ORIGINAL_V1_SOURCE;
  assert.throws(()=>checkCandidate(wrongCommit,originalRows,variantRows),undefined,
    "source-generation substitution must HOLD");
  const wrongPath=structuredClone(candidate);
  wrongPath.runtime_files[0].installed_path="/tmp/unreviewed";
  assert.throws(()=>checkCandidate(wrongPath,originalRows,variantRows),undefined,
    "runtime destination substitution must HOLD");
  const body={
    schema:"void_buy_void_witness_runtime_v1_v2_distinct_generation_evidence_v1",
    marker:"VOID_BUY_VOID_WITNESS_RUNTIME_V1_V2_DISTINCT_GENERATION_V1",
    version:1,
    original_frozen_v1_contract_commit:ORIGINAL_CONTRACT_COMMIT,
    original_frozen_v1_census_source_commit:ORIGINAL_V1_SOURCE,
    integration_rewritten_v1_census_source_commit:INTEGRATED_V1_SOURCE_ALIAS,
    current_source_commit:CURRENT,
    original_frozen_v1_contract_git_blob_sha1:ORIGINAL_CONTRACT_BLOB,
    integration_rewritten_v1_contract_git_blob_sha1:CONTRACT_BLOB,
    original_v1_manifest_id:ORIGINAL_MANIFEST_ID,
    original_v1_manifest_sha256:ORIGINAL_MANIFEST_SHA,
    unaccepted_v2_candidate_id:CANDIDATE_ID,
    original_source_files_equal_current:matched.source_files_match_original_frozen_v1,
    original_build_inputs_equal_current:matched.build_inputs_match_original_frozen_v1,
    compiled_runtime_hashes_equal_original_frozen_v1:matched.runtime_hashes_match_original_frozen_v1,
    compiled_runtime_hashes_equal_integrated_v1_alias:matched.runtime_hashes_match_integration_v1_alias,
    original_v1_auto_sha256:matched.original_v1_auto_runtime_sha256,
    unaccepted_v2_auto_sha256:matched.current_v2_auto_runtime_sha256,
    original_v1_and_v2_compiled_bundles_identical:false,
    original_v1_manifest_reissued:false,
    historical_v1_manifest_mutated:false,
    runtime_bundle_identity_accepted:false,
    production_current_source_generation_accepted:false,
    installed_nimo_v2_verified:false,
    historical_v1_receipt_rebound_to_current_generation:false,
    signed_operator_acceptance:false,
    source_only_evidence:true,
    real_payment_acceptance:false,
    production_allocation_mutation_ready:false,
    presale_activation:false,
    funds_moved:false,
  };
  const bytes=Buffer.from(JSON.stringify(body)+"\n","utf8");
  process.stdout.write(JSON.stringify({
    ...body,
    evidence_sha256:"sha256:"+crypto.createHash("sha256").update(bytes).digest("hex"),
  },null,2)+"\n");
}
if(process.argv.length===3&&process.argv[2]==="--prove")run();
else throw new Error("source_only_witness_compatibility_proof_mode_required");
