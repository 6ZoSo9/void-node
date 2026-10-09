#!/usr/bin/env node
// Source-only frozen witness V1 restoration check. No host, ledger or funds.
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const FILE="src/economic/buy_void_allocation_custody_witness_runtime_bundle_qualification_v1.ts";
const AUTO="src/economic/buy_void_auto_fulfillment_v1.ts";
const OLD_COMMIT="f627cad6bc07a6ad3ebe7cbd946723316fcd0567";
const OLD_AUTO_COMMIT="e390424c1d31cd87dcf3551cc0d2d610a24e12f8";
const REWRITTEN_COMMIT="884edc6e82bd505a83e51a44b38f7e318431f314";
const ORIGINAL_BLOB="d2e84643c9f4d76c642c7e07d4ea2bf1634035e4";
const REWRITTEN_BLOB="d0f80d3b50e3dcc46c1f58dc4bd0a73b7875db56";
const OLD_AUTO_SOURCE_BLOB="1ac1ad6213be83f1aa8261a554caa91544fe5e09";
const NEW_AUTO_SOURCE_BLOB="b7c963b1d55f000d82ad82289b31107b432503de";
const OLD_ID="voidwfb1_2a729229f63c10a1562050924ddc279d8255a35603542967431a584977f1f6b7";
const OLD_MANIFEST_HASH="sha256:2190e7ab944436200b03e46285fa5ba4cda1b90d915cfda05b320d1b1dc7ebe2";
const OLD_COMPILED="sha256:ae15c56f1aa7009955058ca1d454da5e0d55a3e6c2011c54e7316374e33a5cf6";
const REWRITTEN_COMPILED="sha256:119a08db651cb85091f66ed2c9e475c56a81f21c9084c47c7f8ee083f831a47c";
const HIST_PREFIX="VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_";
const ALLOWED_ENV=Object.freeze({
  PATH:"/usr/bin:/bin",HOME:"/nonexistent",LANG:"C",LC_ALL:"C",
  GIT_CONFIG_NOSYSTEM:"1",GIT_CONFIG_GLOBAL:"/dev/null",
  GIT_OPTIONAL_LOCKS:"0",GIT_TERMINAL_PROMPT:"0",
});
function git(args) {
  return execFileSync("/usr/bin/git",args,{
    cwd:ROOT,env:ALLOWED_ENV,timeout:15000,maxBuffer:1024*1024,
    stdio:["ignore","pipe","pipe"]
  });
}
function sha1(b) {
  return crypto.createHash("sha1")
    .update(Buffer.from("blob "+b.length+"\0","utf8")).update(b).digest("hex");
}
function sha256(b){return crypto.createHash("sha256").update(b).digest("hex");}
function committed(commit,file) {
  assert.match(commit,/^[0-9a-f]{40}$/u);
  assert.ok(file===FILE||file===AUTO,"unreviewed Git path");
  const name=commit+":"+file;
  const data=git(["cat-file","blob",name]);
  const gitId=git(["rev-parse","--verify",name]).toString("utf8").trim();
  assert.equal(sha1(data),gitId,"Git object bytes do not match identity");
  return {bytes:data,blob:gitId};
}
function constant(data,suffix){
  const name=HIST_PREFIX+suffix;
  const regex=new RegExp("export const "+name+"\\s*=\\s*\"([^\"]+)\";","gu");
  const found=[...data.matchAll(regex)];
  assert.equal(found.length,1,"historical constant missing or duplicated: "+name);
  return found[0][1];
}
function validateOriginal(text) {
  const bytes=Buffer.from(text,"utf8");
  assert.equal(sha1(bytes),ORIGINAL_BLOB,"source altered from frozen archived V1");
  assert.equal(constant(text,"MANIFEST_ID_V1"),OLD_ID);
  assert.equal(constant(text,"MANIFEST_SHA256_V1"),OLD_MANIFEST_HASH);
  assert.equal(constant(text,"CENSUS_SOURCE_COMMIT_V1"),OLD_AUTO_COMMIT);
  assert.ok(text.includes(OLD_COMPILED),"frozen auto-fulfillment compiled identity absent");
  assert.ok(!text.includes(REWRITTEN_COMPILED),"rewritten auto-fulfillment cannot masquerade as V1");
}
function syntheticNegatives(original) {
  const mutations=[
    original.replace(OLD_ID,"voidwfb1_"+"0".repeat(64)),
    original.replace(OLD_MANIFEST_HASH,"sha256:"+"0".repeat(64)),
    original.replace(OLD_AUTO_COMMIT,OLD_COMMIT),
    original.replace(OLD_COMPILED,REWRITTEN_COMPILED),
    original.replace("source_contract: true","source_contract: false"),
    original.replace("runtime_integration: false","runtime_integration: true"),
    original.replace("funds_movement: false","funds_movement: true"),
  ];
  assert.equal(mutations.length,7);
  for(const [index,mutant] of mutations.entries()){
    assert.notEqual(mutant,original,"mutation had no effect: "+index);
    assert.throws(()=>validateOriginal(mutant),undefined,"forged V1 identity must HOLD: "+index);
  }
  return mutations.length;
}
function audit() {
  const immutable=committed(OLD_COMMIT,FILE);
  assert.equal(immutable.blob,ORIGINAL_BLOB);
  validateOriginal(immutable.bytes.toString("utf8"));
  const main=committed("77f798e42efc73f83052311db94b0a7f33994cf8",FILE);
  assert.equal(main.blob,ORIGINAL_BLOB,"canonical main frozen V1 must not be changed");
  const restored=fs.readFileSync(path.join(ROOT,FILE));
  assert.equal(sha1(restored),ORIGINAL_BLOB,"working source not frozen original");
  assert.equal(restored.equals(immutable.bytes),true,"not byte-identical original V1");
  const rewritten=committed(REWRITTEN_COMMIT,FILE);
  assert.equal(rewritten.blob,REWRITTEN_BLOB);
  assert.equal(constant(rewritten.bytes.toString("utf8"),"MANIFEST_ID_V1"),OLD_ID);
  assert.equal(constant(rewritten.bytes.toString("utf8"),"MANIFEST_SHA256_V1"),OLD_MANIFEST_HASH);
  assert.equal(constant(rewritten.bytes.toString("utf8"),"CENSUS_SOURCE_COMMIT_V1"),OLD_COMMIT);
  assert.ok(rewritten.bytes.toString("utf8").includes(REWRITTEN_COMPILED));
  const originalLines=immutable.bytes.toString("utf8").split("\n");
  const rewriteLines=rewritten.bytes.toString("utf8").split("\n");
  assert.equal(originalLines.length,rewriteLines.length);
  const changed=originalLines.flatMap((line,i)=>line===rewriteLines[i]?[]:[i+1]);
  assert.deepEqual(changed,[13,57],"unexpected historical V1 source mutation");
  assert.equal(committed(OLD_AUTO_COMMIT,AUTO).blob,OLD_AUTO_SOURCE_BLOB);
  assert.equal(committed(REWRITTEN_COMMIT,AUTO).blob,NEW_AUTO_SOURCE_BLOB);
  const currentAuto=git(["rev-parse","--verify","HEAD:"+AUTO]).toString("utf8").trim();
  assert.equal(currentAuto,NEW_AUTO_SOURCE_BLOB,
    "reviewed new auto-fulfillment source drifted: do not requalify V1");
  const negatives=syntheticNegatives(immutable.bytes.toString("utf8"));
  return {
    schema:"void_buy_void_original_witness_v1_restoration_proof_v1",
    version:1,
    repository:"6ZoSo9/void-node",
    original_v1_manifest_id:OLD_ID,
    original_v1_manifest_sha256:OLD_MANIFEST_HASH,
    original_source_git_blob_sha1:ORIGINAL_BLOB,
    working_source_restored_to_original_v1:true,
    original_witness_frozen_source_commit:OLD_AUTO_COMMIT,
    original_v1_auto_fulfillment_compiled_sha256:OLD_COMPILED,
    current_auto_fulfillment_source_git_blob_sha1:currentAuto,
    historical_v1_integrated_source_diff_lines:changed,
    historical_v1_alias_mutation_rejected:true,
    tampered_historical_contracts_rejected:negatives,
    proof_receipt_sha256:sha256(immutable.bytes),
    current_auto_fulfillment_equal_to_original_v1:false,
    original_v1_receipt_authorizes_current_runtime:false,
    original_v1_receipt_reinterpretation_authorized:false,
    source_v2_accepted:false,
    installed_nimo_witness_authenticated:false,
    production_allocation_mutation_ready:false,
    presale_activation:false,
    funds_movement:false
  };
}
const args=process.argv.slice(2);
if(args.length===1&&args[0]==="--check") {
  process.stdout.write(JSON.stringify(audit(),null,2)+"\n");
} else if(args.length===1&&args[0]==="--self-test") {
  const p=audit();
  assert.equal(p.tampered_historical_contracts_rejected,7);
  assert.equal(p.production_allocation_mutation_ready,false);
  console.log("VOID_FROZEN_WITNESS_V1_RESTORATION_PROOF_GREEN");
  console.log("seven_historical_identity_mutations_rejected=true");
  console.log("old_Nimo_witness_may_be_classified_as_original_only=true");
  console.log("current_new_compiled_generation_accepted=false");
  console.log("production_allocation_mutation_ready=false");
  console.log("funds_moved=false");
} else {
  throw Error("read_only_witness_v1_restoration_proof_requires_explicit_mode");
}
