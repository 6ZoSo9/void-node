#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const CANDIDATE_HEAD="9982e7899a52402ad010fb9066ad78db8c9d49cc";
const CANDIDATE_PROOF="scripts/prove_buy_void_enforcement_final_protected_v7_v2_candidate_v1.mjs";
const CANDIDATE_PROOF_BLOB="d1cb550cf8f05692ca83114281cc35b2a6fe0cf1";
const LOCK="ops/security/buy-void-enforcement-final-protected-v7-v2-lock-v1.json";
const WORKFLOW=".github/workflows/buy-void-enforcement-final-protected-v7-v2-candidate-v1.yml";
const LOCK_DOC="docs/architecture/buy-void-enforcement-final-protected-v7-v2-lock-v1.md";
const SELF="scripts/prove_buy_void_enforcement_final_protected_v7_v2_lock_v1.mjs";
const CANDIDATE_BYTES=16342;
const CANDIDATE_SHA256="481603ad75f871aef503686548cc1e4b8b54d556f83dca55136813d33d6d991c";
const CANDIDATE_BLOB="6b2958bdb4dbb38354d5a4b41e5b4d1e919b6794";
const CANDIDATE_SET="152dc7a45f4d596513cfd7dc44277ece1aea3d64e30e616089162760ec245a9e";
const CANDIDATE_WORKFLOW_RUN=38644238903;
const CANDIDATE_ARTIFACTS=Object.freeze({22:11931622277,24:11930629692,26:11931637125});
const CENSUS_ID="voidbefv7c3_6ecf0dda04818faca50159763d330c6c95baa52148dcdbb3d5eaa36f0d649c70";
const CENSUS_JSON_SHA256="c6d2d3707c0e79701579dd2d3f75def150aa2b37b594cdb631f780f0922e01ee";
const PROTECTED_INVENTORY_SHA256="36c18eb2bd7ac1ab02b8a1463e7e9afc82423192eedcdf7e9190f6aaba53bee5";
const PROFILE_ID="voidrnpr1_08e05626e80fbd2aecc3018514aaf76e491954f8258fff996f0b2dca1c3055ac";
const PACKAGE_AGGREGATE="77622df7d483bc3f73aa39468246f6860237a3f6749a09a0284644493f3990b6";
const PROFILE_CANONICAL="3493638417e2f02a39bb7c48a08935e299754d7474feb71a5c2a48944d3f1757";
const PROVIDER_CLOSURE="3b6be7b9efdc7f70b6f270f77208efab2f7321136a54cc76a7e1d34c57bd4945";
const PROVIDER_SEMANTIC="95112d913d45b2b03887edb97c8693eef84a72b54b61503ffc66a6a7bce67384";
const V7_DELTA="cfac0b510932203623a4b9a0c09ad9c6639efdb04b0e5f1ff9feba15175f9311";
const EXPECTED_DELTA=Object.freeze([WORKFLOW,LOCK_DOC,LOCK,SELF].sort());
const WORKFLOW_TRIGGER_PATHS=Object.freeze([LOCK,SELF,LOCK_DOC]);

const sha256=b=>crypto.createHash("sha256").update(b).digest("hex");
const gitBlob=b=>crypto.createHash("sha1").update(Buffer.from("blob "+b.length+"\0","utf8")).update(b).digest("hex");
function canonical(v){
  if(v===null||typeof v==="boolean"||typeof v==="string")return JSON.stringify(v);
  if(typeof v==="number"){assert.ok(Number.isSafeInteger(v),"non_canonical_number");return String(v);}
  if(Array.isArray(v))return "["+v.map(canonical).join(",")+"]";
  assert.ok(v&&typeof v==="object"&&!Array.isArray(v),"non_canonical_value");
  return "{"+Object.keys(v).sort().map(k=>JSON.stringify(k)+":"+canonical(v[k])).join(",")+"}";
}
function readExact(relative,max=256*1024){
  assert.equal(path.isAbsolute(relative),false,"absolute_path:"+relative);
  assert.equal(relative.split("/").some(part=>!part||part==="."||part===".."),false,"unsafe_path:"+relative);
  const absolute=path.join(ROOT,...relative.split("/"));
  const before=fs.lstatSync(absolute);
  assert.ok(before.isFile()&&!before.isSymbolicLink()&&before.nlink===1&&before.size>0&&before.size<=max,"invalid_file:"+relative);
  const bytes=fs.readFileSync(absolute),after=fs.lstatSync(absolute);
  assert.equal(bytes.length,before.size,"short_read:"+relative);
  for(const key of ["dev","ino","size","mtimeMs","ctimeMs"])assert.equal(after[key],before[key],"file_changed:"+relative+":"+key);
  return bytes;
}
function run(command,args,{timeout=180000}={}){
  const r=spawnSync(command,args,{cwd:ROOT,encoding:null,stdio:["ignore","pipe","pipe"],timeout,maxBuffer:32*1024*1024,
    env:{PATH:"/usr/bin:/bin",HOME:"/nonexistent",LANG:"C",LC_ALL:"C",TZ:"UTC",NODE_ENV:"test",
      GIT_CONFIG_NOSYSTEM:"1",GIT_CONFIG_GLOBAL:"/dev/null",GIT_CONFIG_SYSTEM:"/dev/null",GIT_NO_REPLACE_OBJECTS:"1",
      GIT_OPTIONAL_LOCKS:"0",GIT_TERMINAL_PROMPT:"0"}});
  assert.equal(r.error,undefined,String(r.error||""));assert.equal(r.status,0,String(r.stderr||r.stdout||""));return r;
}
function git(args){return String(run("/usr/bin/git",["--no-replace-objects","-C",ROOT,...args],{timeout:30000}).stdout||"").trim();}
function verifyBranchDelta(){
  git(["merge-base","--is-ancestor",CANDIDATE_HEAD,"HEAD"]);
  assert.equal(git(["rev-parse","HEAD:"+CANDIDATE_PROOF]),CANDIDATE_PROOF_BLOB,"candidate_proof_blob_drift");
  const changed=git(["diff","--name-only",CANDIDATE_HEAD,"HEAD","--"]).split("\n").filter(Boolean).sort();
  assert.deepEqual(changed,EXPECTED_DELTA,"lock_branch_scope_drift");
}
function verifyWorkflowTriggers(){
  const source=readExact(WORKFLOW,256*1024).toString("utf8");
  for(const relative of WORKFLOW_TRIGGER_PATHS){
    const exact='      - "'+relative+'"';
    assert.equal(source.split(exact).length-1,2,"lock_workflow_trigger_dependency_count:"+relative);
  }
}
function validateCandidate(c){
  assert.equal(c.schema,"void_buy_void_enforcement_final_protected_v7_v2_candidate_v1");
  assert.equal(c.marker,"VOID_BUY_VOID_ENFORCEMENT_FINAL_PROTECTED_V7_V2_CANDIDATE_V1");
  assert.equal(c.version,1);assert.equal(c.repository,"6ZoSo9/void-node");
  assert.equal(c.protected_census_parent,"873e4fa7cdc1cdb5e6d39c721759c7bebc8dff86");
  assert.equal(c.protected_census_evidence?.workflow_run,38643246808);
  assert.equal(c.protected_census_evidence?.census_id,CENSUS_ID);
  assert.equal(c.protected_census_evidence?.census_json_sha256,CENSUS_JSON_SHA256);
  assert.equal(c.protected_census_evidence?.protected_tracked_source_inventory_canonical_sha256,PROTECTED_INVENTORY_SHA256);
  assert.equal(c.protected_census_evidence?.cross_node_byte_identity_verified,true);
  assert.equal(c.current_enforcement_tracked_source_inventory_count,49);
  assert.equal(c.current_enforcement_tracked_source_inventory_v1?.length,49);
  assert.equal(c.current_enforcement_tracked_source_inventory_verified,true);
  assert.equal(c.current_enforcement_tracked_source_inventory_sha256,PROTECTED_INVENTORY_SHA256);
  assert.equal(sha256(Buffer.from(canonical(c.current_enforcement_tracked_source_inventory_v1),"utf8")),PROTECTED_INVENTORY_SHA256);
  assert.equal(c.predecessor_enforcement?.candidate_enforcement_identity_accepted,true);
  assert.equal(c.predecessor_enforcement?.historical_identity_preserved,true);
  assert.equal(c.audited_package_runtime?.profile_id,PROFILE_ID);
  assert.equal(c.audited_package_runtime?.packages_aggregate_sha256,PACKAGE_AGGREGATE);
  assert.equal(c.audited_package_runtime?.profile_canonical_sha256,PROFILE_CANONICAL);
  assert.equal(c.audited_package_runtime?.profile_identity_accepted,true);
  assert.equal(c.dependency_provider?.provider_closure_sha256,PROVIDER_CLOSURE);
  assert.equal(c.dependency_provider?.provider_closure_semantic_sha256,PROVIDER_SEMANTIC);
  assert.equal(c.dependency_provider?.provider_closure_identity_accepted,true);
  assert.equal(c.v7_executable_delta?.candidate_generation_sha256,V7_DELTA);
  assert.equal(c.v7_executable_delta?.cross_node_byte_identity_verified,true);
  assert.equal(c.live_process_v2_static_edge?.static_execution_closure_verified,true);
  assert.equal(c.dynamic_saga_edge?.dynamic_tool_execution_identity_verified,true);
  assert.equal(c.dynamic_saga_edge?.dynamic_tool_transitive_closure_verified,true);
  for(const key of ["package_runtime_identity_accepted","provider_closure_composed","delivery_route_closure_composed",
    "live_process_v2_static_execution_closure_verified","third_party_package_runtime_closure_verified","complete_executable_closure_verified"])
    assert.equal(c[key],true,key);
  for(const key of ["candidate_enforcement_identity_accepted","deployed_artifact_generation_verified","runtime_mount_authority",
    "production_source_finality_authority_ready","public_presale_activation","funds_movement"])
    assert.equal(c[key],false,key);
  const copy=structuredClone(c);delete copy.candidate_enforcement_set_sha256;
  assert.equal(sha256(Buffer.from(canonical(copy),"utf8")),CANDIDATE_SET,"candidate_set_rederive_mismatch");
  assert.equal(c.candidate_enforcement_set_sha256,CANDIDATE_SET);
  return c;
}
function candidateBytes(){
  const tsxLoader=pathToFileURL(path.join(ROOT,"node_modules/tsx/dist/loader.mjs")).href;
  const result=run(process.execPath,["--import",tsxLoader,path.join(ROOT,CANDIDATE_PROOF),"--derive"],{timeout:300000});
  const bytes=Buffer.from(result.stdout||Buffer.alloc(0));
  assert.equal(bytes.length,CANDIDATE_BYTES,"candidate_bytes");
  assert.equal(sha256(bytes),CANDIDATE_SHA256,"candidate_sha256");
  assert.equal(gitBlob(bytes),CANDIDATE_BLOB,"candidate_git_blob");
  validateCandidate(JSON.parse(bytes.toString("utf8")));
  return bytes;
}
function expectedLock(){return {"schema":"void_buy_void_enforcement_final_protected_v7_v2_lock_v1","marker":"VOID_BUY_VOID_ENFORCEMENT_FINAL_PROTECTED_V7_V2_LOCK_V1","version":1,"repository":"6ZoSo9/void-node","candidate_head":"9982e7899a52402ad010fb9066ad78db8c9d49cc","candidate_hosted_evidence":{"workflow_run":38644238903,"node22_artifact_id":11931622277,"node24_artifact_id":11930629692,"node26_artifact_id":11931637125,"cross_node_byte_identity_verified":true},"candidate_evidence":{"derivation_proof_path":"scripts/prove_buy_void_enforcement_final_protected_v7_v2_candidate_v1.mjs","derivation_proof_git_blob_sha1":"d1cb550cf8f05692ca83114281cc35b2a6fe0cf1","bytes":16342,"sha256":"481603ad75f871aef503686548cc1e4b8b54d556f83dca55136813d33d6d991c","git_blob_sha1":"6b2958bdb4dbb38354d5a4b41e5b4d1e919b6794","candidate_enforcement_set_sha256":"152dc7a45f4d596513cfd7dc44277ece1aea3d64e30e616089162760ec245a9e"},"protected_census_evidence":{"census_id":"voidbefv7c3_6ecf0dda04818faca50159763d330c6c95baa52148dcdbb3d5eaa36f0d649c70","census_json_sha256":"c6d2d3707c0e79701579dd2d3f75def150aa2b37b594cdb631f780f0922e01ee","protected_tracked_source_inventory_canonical_sha256":"36c18eb2bd7ac1ab02b8a1463e7e9afc82423192eedcdf7e9190f6aaba53bee5"},"audited_package_runtime":{"profile_id":"voidrnpr1_08e05626e80fbd2aecc3018514aaf76e491954f8258fff996f0b2dca1c3055ac","packages_aggregate_sha256":"77622df7d483bc3f73aa39468246f6860237a3f6749a09a0284644493f3990b6","profile_canonical_sha256":"3493638417e2f02a39bb7c48a08935e299754d7474feb71a5c2a48944d3f1757"},"dependency_provider":{"provider_closure_sha256":"3b6be7b9efdc7f70b6f270f77208efab2f7321136a54cc76a7e1d34c57bd4945","provider_closure_semantic_sha256":"95112d913d45b2b03887edb97c8693eef84a72b54b61503ffc66a6a7bce67384"},"v7_executable_delta_candidate_generation_sha256":"cfac0b510932203623a4b9a0c09ad9c6639efdb04b0e5f1ff9feba15175f9311","current_enforcement_tracked_source_inventory_sha256":"36c18eb2bd7ac1ab02b8a1463e7e9afc82423192eedcdf7e9190f6aaba53bee5","complete_executable_closure_verified":true,"current_enforcement_tracked_source_inventory_verified":true,"candidate_enforcement_identity_accepted":true,"deployed_artifact_generation_verified":false,"runtime_mount_authority":false,"production_source_finality_authority_ready":false,"public_presale_activation":false,"funds_movement":false};}
function verify(){
  verifyBranchDelta();verifyWorkflowTriggers();const bytes=candidateBytes();
  const tampered=JSON.parse(bytes.toString("utf8"));tampered.candidate_enforcement_identity_accepted=true;
  assert.throws(()=>validateCandidate(tampered),/Expected values to be strictly equal/u);
  const expected=Buffer.from(JSON.stringify(expectedLock(),null,2)+"\n","utf8");
  const actual=readExact(LOCK,64*1024);assert.ok(actual.equals(expected),"locked_manifest_not_exact");
  return expected;
}
const args=process.argv.slice(2);
if(args.length===1&&args[0]==="--derive")process.stdout.write(verify());
else if(args.length===0||(args.length===1&&args[0]==="--self-test")){
  verify();
  console.log("VOID_BUY_VOID_ENFORCEMENT_FINAL_PROTECTED_V7_V2_LOCK_V1_GREEN");
  console.log("candidate_json_sha256="+CANDIDATE_SHA256);
  console.log("candidate_enforcement_set_sha256="+CANDIDATE_SET);
  console.log("protected_census_id="+CENSUS_ID);
  console.log("complete_executable_closure_verified=true");
  console.log("current_enforcement_tracked_source_inventory_verified=true");
  console.log("candidate_enforcement_identity_accepted=true");
  console.log("deployed_artifact_generation_verified=false");
  console.log("production_source_finality_authority_ready=false");
  console.log("public_presale_activation=false");
  console.log("funds_movement=false");
}else throw Error("usage: proof [--self-test|--derive]");
