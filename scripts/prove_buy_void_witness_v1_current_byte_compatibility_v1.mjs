#!/usr/bin/env node
// Reconcile the *actual frozen V1 witness source commit*, not an older
// historical comparison commit. Read-only exact-source/compiled compatibility.
// NO production V1 acceptance transfer, install, service, or monetary authority.
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const CURRENT="884edc6e82bd505a83e51a44b38f7e318431f314";
const ORIGINAL_V1_SOURCE="f627cad6bc07a6ad3ebe7cbd946723316fcd0567";
const OLDER_COMPARISON="e390424c1d31cd87dcf3551cc0d2d610a24e12f8";
const V1_CONTRACT="src/economic/buy_void_allocation_custody_witness_runtime_bundle_qualification_v1.ts";
const CONTRACT_BLOB="d0f80d3b50e3dcc46c1f58dc4bd0a73b7875db56";
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
function checkCandidate(value, frozenRows) {
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
  assert.equal(value.historical_predecessor?.source_commit,OLDER_COMPARISON);
  assert.equal(value.historical_predecessor?.manifest_id,ORIGINAL_MANIFEST_ID);
  assert.equal(value.historical_predecessor?.manifest_sha256,ORIGINAL_MANIFEST_SHA);
  assert.equal(value.historical_predecessor?.contract_git_blob_sha1,CONTRACT_BLOB);
  // The older comparison source is NOT the V1 manifest's actual source
  // generation, so "one changed source" in #2718 is a different question.
  assert.notEqual(OLDER_COMPARISON,ORIGINAL_V1_SOURCE);
  assert.equal(value.unchanged_historical_source_count,7);
  assert.equal(value.changed_source_count,1);
  const expectedRuntime=new Map(frozenRows.map(r=>[r.path,r]));
  const seen=new Set();
  for(const observed of value.runtime_files) {
    const old=expectedRuntime.get(observed.path);
    assert.ok(old,"unknown newly compiled runtime file: "+observed.path);
    assert.ok(!seen.has(observed.path),"duplicate runtime file");
    seen.add(observed.path);
    assert.equal(observed.installed_path,old.installed_path,
      "installed runtime path changed: "+observed.path);
    assert.equal("sha256:"+observed.sha256,old.sha256,
      "compiled runtime differs from frozen V1: "+observed.path);
    assert.ok(Number.isSafeInteger(observed.bytes)&&observed.bytes>0);
  }
  assert.equal(seen.size,8);
  const srcSeen=new Set();
  for(const observed of value.source_files) {
    assert.ok(typeof observed.path==="string");
    assert.ok(!srcSeen.has(observed.path));
    srcSeen.add(observed.path);
    const old=sourceAt(ORIGINAL_V1_SOURCE,observed.path);
    const current=sourceAt(CURRENT,observed.path);
    assert.equal(current,old,"witness V1->current source mismatch: "+observed.path);
    assert.equal(current,observed.git_blob_sha1,
      "reported current source mismatch: "+observed.path);
    assert.equal(gitBlob(read(observed.path)),current,
      "working source mismatch: "+observed.path);
    // The old/unchanged comparison in #2718 uses e390, not f627:
    // do not mistake that intentional field for frozen-manifest ancestry.
  }
  assert.equal(srcSeen.size,8);
  const inputsSeen=new Set();
  for(const observed of value.build_inputs) {
    assert.ok(!inputsSeen.has(observed.path));
    inputsSeen.add(observed.path);
    const old=sourceAt(ORIGINAL_V1_SOURCE,observed.path);
    const current=sourceAt(CURRENT,observed.path);
    assert.equal(old,current,"witness build input changed: "+observed.path);
    assert.equal(current,observed.git_blob_sha1,
      "reported current build input mismatch: "+observed.path);
    assert.equal(gitBlob(read(observed.path)),current,
      "worktree build input mismatch: "+observed.path);
  }
  assert.equal(inputsSeen.size,7);
  // Evidence of executable-byte compatibility does not rebind source
  // generation, grant a live witness identity, or authorize payment.
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
    x.from==="dist/economic/buy_void_auto_fulfillment_v1.js"&&
    x.specifier==="node:util"),"compiled Proxy detection import missing");
  return Object.freeze({
    source_files_match_manifest_source_commit:8,
    build_inputs_match_manifest_source_commit:7,
    compiled_runtime_file_hashes_match_frozen_v1:8,
  });
}
function run(){
  assert.ok([22,24,26].includes(Number(process.versions.node.split(".")[0])));
  requireSourceIdentity(V1_CONTRACT,CONTRACT_BLOB);
  requireSourceIdentity(CANDIDATE_SCRIPT,CANDIDATE_SCRIPT_BLOB);
  git(["merge-base","--is-ancestor",ORIGINAL_V1_SOURCE,"HEAD"]);
  git(["merge-base","--is-ancestor",CURRENT,"HEAD"]);
  const src=read(V1_CONTRACT).toString("utf8");
  assert.equal(sourceConstant(src,
    "VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_MANIFEST_ID_V1"),
    ORIGINAL_MANIFEST_ID);
  assert.equal(sourceConstant(src,
    "VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_MANIFEST_SHA256_V1"),
    ORIGINAL_MANIFEST_SHA);
  assert.equal(sourceConstant(src,
    "VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_CENSUS_SOURCE_COMMIT_V1"),
    ORIGINAL_V1_SOURCE);
  const frozenRows=manifestRows(src);
  const candidate=deriveCandidate();
  const matched=checkCandidate(candidate,frozenRows);
  const clone=structuredClone(candidate);
  assert.equal(clone.runtime_bundle_identity_accepted,false);
  clone.runtime_bundle_identity_accepted=true;
  assert.throws(()=>checkCandidate(clone,frozenRows),undefined,
    "caller green flag must not transfer production authority");
  clone.runtime_bundle_identity_accepted=false;
  clone.runtime_files[0].sha256="00".repeat(32);
  assert.throws(()=>checkCandidate(clone,frozenRows),undefined,
    "mismatched executable digest must fail");
  const wrongCommit=structuredClone(candidate);
  wrongCommit.exact_source_generation_commit=ORIGINAL_V1_SOURCE;
  assert.throws(()=>checkCandidate(wrongCommit,frozenRows),undefined,
    "source-generation substitution must fail");
  const wrongPath=structuredClone(candidate);
  wrongPath.runtime_files[0].installed_path="/tmp/unreviewed";
  assert.throws(()=>checkCandidate(wrongPath,frozenRows),undefined,
    "installed pathname substitution must fail");
  const body={
    schema:"void_buy_void_witness_runtime_v1_v2_byte_compatibility_evidence_v1",
    marker:"VOID_BUY_VOID_WITNESS_RUNTIME_V1_V2_BYTE_COMPATIBILITY_V1",
    version:1,
    reviewed_v1_source_commit:ORIGINAL_V1_SOURCE,
    current_source_commit:CURRENT,
    historical_older_comparison_commit:OLDER_COMPARISON,
    frozen_v1_manifest_id:ORIGINAL_MANIFEST_ID,
    frozen_v1_manifest_sha256:ORIGINAL_MANIFEST_SHA,
    unaccepted_v2_candidate_id:CANDIDATE_ID,
    source_files_identical_to_true_v1_source_commit:matched.source_files_match_manifest_source_commit,
    build_inputs_identical_to_true_v1_source_commit:matched.build_inputs_match_manifest_source_commit,
    compiled_runtime_file_sha256_identical_to_frozen_v1:matched.compiled_runtime_file_hashes_match_frozen_v1,
    reviewed_relative_runtime_import_edges:11,
    historical_v1_manifest_mutated:false,
    production_current_source_generation_accepted:false,
    historical_v1_receipt_rebound_to_current_generation:false,
    installed_nimo_witness_verified:false,
    installed_files_read:false,
    signed_operator_acceptance:false,
    source_only_evidence:true,
    real_payment_acceptance:false,
    production_allocation_mutation_ready:false,
    presale_activation:false,
    funds_moved:false,
  };
  const bytes=Buffer.from(JSON.stringify(body)+"\n","utf8");
  const receipt={...body,
    evidence_sha256:"sha256:"+crypto.createHash("sha256").update(bytes).digest("hex")};
  process.stdout.write(JSON.stringify(receipt,null,2)+"\n");
}
if(process.argv.length===3&&process.argv[2]==="--prove")run();
else throw new Error("source_only_witness_compatibility_proof_mode_required");
