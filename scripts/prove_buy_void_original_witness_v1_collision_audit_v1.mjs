#!/usr/bin/env node
// READ-ONLY ORIGINAL V1 HISTORICAL WITNESS CONTRACT COLLISION AUDIT.
// Never updates historical V1, current checkout, Nimo, ledger or funds.
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const ORIGINAL_RECORD_COMMIT="f627cad6bc07a6ad3ebe7cbd946723316fcd0567";
const HISTORIC_SOURCE_COMMIT="e390424c1d31cd87dcf3551cc0d2d610a24e12f8";
const INTEGRATION_PARENT="884edc6e82bd505a83e51a44b38f7e318431f314";
const CONTRACT="src/economic/buy_void_allocation_custody_witness_runtime_bundle_qualification_v1.ts";
const ORIGINAL_CONTRACT_BLOB="d2e84643c9f4d76c642c7e07d4ea2bf1634035e4";
const AMENDED_CONTRACT_BLOB="d0f80d3b50e3dcc46c1f58dc4bd0a73b7875db56";
const ORIGINAL_ID="voidwfb1_2a729229f63c10a1562050924ddc279d8255a35603542967431a584977f1f6b7";
const ORIGINAL_MANIFEST_SHA="sha256:2190e7ab944436200b03e46285fa5ba4cda1b90d915cfda05b320d1b1dc7ebe2";
const AUTO="dist/economic/buy_void_auto_fulfillment_v1.js";
const AUTO_SOURCE="src/economic/buy_void_auto_fulfillment_v1.ts";
const HISTORICAL_AUTO_SOURCE_BLOB="1ac1ad6213be83f1aa8261a554caa91544fe5e09";
const CURRENT_AUTO_SOURCE_BLOB="b7c963b1d55f000d82ad82289b31107b432503de";
const HISTORICAL_AUTO_COMPILED="sha256:ae15c56f1aa7009955058ca1d454da5e0d55a3e6c2011c54e7316374e33a5cf6";
const CURRENT_AUTO_COMPILED="sha256:119a08db651cb85091f66ed2c9e475c56a81f21c9084c47c7f8ee083f831a47c";
const CONTRACT_CONST="VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_";
const ALLOW_ENV=Object.freeze({
  PATH:"/usr/bin:/bin",HOME:"/nonexistent",LANG:"C",LC_ALL:"C",
  GIT_CONFIG_NOSYSTEM:"1",GIT_CONFIG_GLOBAL:"/dev/null",
  GIT_OPTIONAL_LOCKS:"0",GIT_TERMINAL_PROMPT:"0",
});
function fail(reason){throw new Error("historical_witness_v1_hold:"+reason);}
function git(args){
  return execFileSync("/usr/bin/git",args,{
    cwd:ROOT,env:ALLOW_ENV,timeout:20000,maxBuffer:2*1024*1024,
    stdio:["ignore","pipe","pipe"]
  });
}
function gitBlob(bytes){
  return crypto.createHash("sha1")
    .update(Buffer.from("blob "+bytes.length+"\0","utf8")).update(bytes).digest("hex");
}
function blobAt(commit,p){
  assert.match(commit,/^[0-9a-f]{40}$/u);
  assert.equal(p,CONTRACT===p?CONTRACT:AUTO_SOURCE,"unreviewed read path");
  const bytes=git(["cat-file","blob",commit+":"+p]);
  const obj=git(["rev-parse","--verify",commit+":"+p]).toString("utf8").trim();
  assert.equal(gitBlob(bytes),obj,"git object bytes do not match resolved identity");
  return {bytes,sha:obj};
}
function constant(text,suffix){
  const name=CONTRACT_CONST+suffix;
  const re=new RegExp("export const "+name+"\\s*=\\s*\"([^\"]+)\";","u");
  const matches=[...text.matchAll(re)];
  assert.equal(matches.length,1,"missing/duplicate contract constant:"+suffix);
  return matches[0][1];
}
function files(text){
  const re=/Object\.freeze\(\{ source_path: "([^"]+)", installed_path: "([^"]+)", sha256: "(sha256:[0-9a-f]{64})" \}\)/gu;
  const rows=[...text.matchAll(re)].map(m=>({
    source_path:m[1],installed_path:m[2],sha256:m[3]
  }));
  assert.equal(rows.length,8,"witness bundle must contain 8 distinct executable files");
  assert.equal(new Set(rows.map(x=>x.source_path)).size,8);
  assert.equal(new Set(rows.map(x=>x.installed_path)).size,8);
  return rows;
}
function review(original,amended){
  const originalId=constant(original,"MANIFEST_ID_V1");
  const amendedId=constant(amended,"MANIFEST_ID_V1");
  const originalHash=constant(original,"MANIFEST_SHA256_V1");
  const amendedHash=constant(amended,"MANIFEST_SHA256_V1");
  const originalSource=constant(original,"CENSUS_SOURCE_COMMIT_V1");
  const amendedSource=constant(amended,"CENSUS_SOURCE_COMMIT_V1");
  assert.equal(originalId,ORIGINAL_ID);
  assert.equal(amendedId,originalId,"V1 ID must remain unchanged for collision proof");
  assert.equal(originalHash,ORIGINAL_MANIFEST_SHA);
  assert.equal(amendedHash,originalHash,"V1 manifest digest must remain same for collision proof");
  assert.equal(originalSource,HISTORIC_SOURCE_COMMIT);
  assert.equal(amendedSource,ORIGINAL_RECORD_COMMIT);
  assert.notEqual(originalSource,amendedSource);
  const a=files(original),b=files(amended);
  assert.deepEqual(a.map(x=>[x.source_path,x.installed_path]),
    b.map(x=>[x.source_path,x.installed_path]));
  const changes=[];
  for(let i=0;i<a.length;i++){
    if(a[i].sha256!==b[i].sha256)
      changes.push({path:a[i].source_path,old:a[i].sha256,current:b[i].sha256});
  }
  assert.equal(changes.length,1,"expected exactly one witness executable digest conflict");
  assert.equal(changes[0].path,AUTO);
  assert.equal(changes[0].old,HISTORICAL_AUTO_COMPILED);
  assert.equal(changes[0].current,CURRENT_AUTO_COMPILED);
  const aLines=original.split("\n"),bLines=amended.split("\n");
  assert.equal(aLines.length,bLines.length,"historical contract structural difference");
  const changedLineIndices=[];
  for(let i=0;i<aLines.length;i++)
    if(aLines[i]!==bLines[i])changedLineIndices.push(i+1);
  assert.deepEqual(changedLineIndices,[13,57],
    "unreviewed V1 contract modification outside 2 known historical fields");
  return {source_commit_before:originalSource,source_commit_after:amendedSource,
    changed_file:changes[0],original_manifest_id:originalId,
    original_manifest_sha256:originalHash,unchanged_executable_file_count:7,
    changed_source_line_numbers:changedLineIndices};
}
function adversaries(a,b){
  const mutation=[
    ["forged old V1 ID",a.replace(ORIGINAL_ID,"voidwfb1_"+"0".repeat(64)),b],
    ["forged old file digest",a.replace(HISTORICAL_AUTO_COMPILED,"sha256:"+"0".repeat(64)),b],
    ["amended baseline pretends unchanged",a,b.replace(CURRENT_AUTO_COMPILED,HISTORICAL_AUTO_COMPILED)],
    ["changed old source generation",a.replace(HISTORIC_SOURCE_COMMIT,ORIGINAL_RECORD_COMMIT),b],
    ["changed current source generation",a,b.replace(ORIGINAL_RECORD_COMMIT,HISTORIC_SOURCE_COMMIT)],
    ["changed other runtime digest",a,b.replace("sha256:35d80f00a9ec0ce57bb457596d27e8c86a70d76efe310372e1fff796a92d43ca","sha256:"+"0".repeat(64))],
    ["V1 ID collision hidden",a,b.replace(ORIGINAL_ID,"voidwfb1_"+"f".repeat(64))],
  ];
  for(const [label,original,amended] of mutation)
    assert.throws(()=>review(original,amended),undefined,label);
  return mutation.length;
}
function run(){
  const orig=blobAt(ORIGINAL_RECORD_COMMIT,CONTRACT);
  const current=blobAt(INTEGRATION_PARENT,CONTRACT);
  assert.equal(orig.sha,ORIGINAL_CONTRACT_BLOB,"original V1 Git contract mismatch");
  assert.equal(current.sha,AMENDED_CONTRACT_BLOB,"current integrated Git contract mismatch");
  const olderAuto=blobAt(HISTORIC_SOURCE_COMMIT,AUTO_SOURCE);
  const newerAuto=blobAt(ORIGINAL_RECORD_COMMIT,AUTO_SOURCE);
  const integratedAuto=blobAt(INTEGRATION_PARENT,AUTO_SOURCE);
  assert.equal(olderAuto.sha,HISTORICAL_AUTO_SOURCE_BLOB);
  assert.equal(newerAuto.sha,CURRENT_AUTO_SOURCE_BLOB);
  assert.equal(integratedAuto.sha,CURRENT_AUTO_SOURCE_BLOB);
  git(["merge-base","--is-ancestor",ORIGINAL_RECORD_COMMIT,INTEGRATION_PARENT]);
  git(["merge-base","--is-ancestor",INTEGRATION_PARENT,"HEAD"]);
  const worktree=fs.readFileSync(path.join(ROOT,CONTRACT));
  assert.equal(gitBlob(worktree),AMENDED_CONTRACT_BLOB,
    "current source checkout must contain exactly the reviewed integrated contract");
  const checked=review(orig.bytes.toString("utf8"),current.bytes.toString("utf8"));
  const negatives=adversaries(orig.bytes.toString("utf8"),current.bytes.toString("utf8"));
  return {
    schema:"void_buy_void_original_witness_v1_provenance_collision_audit_v1",
    version:1,repository:"6ZoSo9/void-node",
    original_record_commit:ORIGINAL_RECORD_COMMIT,
    original_record_git_blob_sha1:ORIGINAL_CONTRACT_BLOB,
    old_manifest_original_source_commit:HISTORIC_SOURCE_COMMIT,
    historical_auto_source_git_blob_sha1:olderAuto.sha,
    current_integration_commit:INTEGRATION_PARENT,
    amended_v1_contract_git_blob_sha1:AMENDED_CONTRACT_BLOB,
    current_auto_source_git_blob_sha1:integratedAuto.sha,
    ...checked,
    original_v1_manifest_id_reused_over_different_executable:true,
    historical_v1_receipt_current_generation_equivalence:false,
    historical_v1_source_generation_accepted:false,
    existing_v1_manifest_reinterpretation_authorized:false,
    installed_nimo_witness_verified:false,
    source_v2_review_required:true,
    source_v2_accepted:false,
    owner_ledger_or_service_mutation:false,
    production_allocation_mutation_ready:false,
    presale_activation:false,funds_moved:false,
    negative_falsifications_rejected:negatives
  };
}
const args=process.argv.slice(2);
if(args.length===1&&args[0]==="--audit"){
  process.stdout.write(JSON.stringify(run(),null,2)+"\n");
}else if(args.length===1&&args[0]==="--self-test"){
  const result=run();
  assert.equal(result.negative_falsifications_rejected,7);
  assert.equal(result.historical_v1_receipt_current_generation_equivalence,false);
  console.log("VOID_ORIGINAL_WITNESS_V1_GIT_OBJECT_COLLISION_AUDIT_GREEN");
  console.log("original_contract_blob_authenticated=true");
  console.log("original_v1_manifest_id_reused_over_different_executable=true");
  console.log("current_witness_v1_receipt_rebind_authorized=false");
  console.log("adversarial_contract_mutations_rejected=7");
  console.log("production_allocation_mutation_ready=false");
  console.log("presale_activation=false");
  console.log("funds_moved=false");
}else fail("derive_or_selftest_flag_required");
