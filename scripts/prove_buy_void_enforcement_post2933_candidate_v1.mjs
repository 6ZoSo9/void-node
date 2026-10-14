#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

import {
  canonicalJson,
  collectReviewedNodePackageRuntimeV1,
  verifyReviewedNodePackageRuntimeV1,
} from "../tools/void-reviewed-node-package-runtime-v1.mjs";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const SOURCE_PARENT="c8ce2b67b72cd59111a62d9638035a46c6120afa";
const PREDECESSOR_LOCK="ops/security/buy-void-enforcement-post2865-lock-v1.json";
const PREDECESSOR_LOCK_BLOB="37210b74fa0de86250af84ec088c2d74e9e90499";
const PREDECESSOR_SET="1f83d8e867fc53e8a9ed240f4876f1f9412b7b2dca7c06cbb479dbe38e40a93b";
const PACKAGE_MANIFEST="ops/security/reviewed-node-package-runtime-enforcement-post2865-v1.json";
const PACKAGE_MANIFEST_BLOB="445bcfbf5feae928e0d9cc06d4d31c1ee186fe39";
const PACKAGE_TOOL="tools/void-reviewed-node-package-runtime-v1.mjs";
const PACKAGE_TOOL_BLOB="6475c3f18ffe566cf5f448ca1de4795391a6efde";
const PROVIDER_LOCK_PROOF="scripts/prove_buy_void_delivery_dependency_provider_closure_post2865_lock_v1.mjs";
const PROVIDER_LOCK_PROOF_BLOB="39f660e23f5baa3f0a4f1e5b8b40c756c31da4cb";
const V7_DELTA_PROOF="scripts/prove_buy_void_source_finality_v7_executable_delta_candidate_v1.mjs";
const V7_DELTA_PROOF_BLOB="fd6c6ee367a79128259d643c0c04ca83de48653e";
const SAGA_SOURCE="tools/buy-void-crash-consistent-fulfillment-saga-v1.mjs";
const SAGA_SOURCE_BLOB="d6a2d1cd82e5e255f435c1e21d1783774a44b2b1";
const SAGA_SOURCE_SHA256="e94b2c5c2da0a4849acab936d0d7f8710f2d2229909d73bc679a83c63f777e01";
const SAGA_PROOF="scripts/prove_buy_void_crash_consistent_fulfillment_saga_v1.mjs";
const SAGA_PROOF_BLOB="d33206063799aaddf64ce178a618e174e0ddf628";
const IMPORTER="dist/economic/buy_void_erc20_execution_composition_v1.js";
const IMPORTER_SHA256="b243a1611bceff0a7d758aeaaebf4e74c2bad6b762595ff0e13804e11b5c2af1";
const TOOL_SPEC="../../tools/buy-void-crash-consistent-fulfillment-saga-v1.mjs";
const HOSTED_CENSUS=Object.freeze({
  workflow_run:38561882760,
  node22_artifact_id:11893332050,
  artifact_json_bytes:13651,
  artifact_json_sha256:"bf8e33935d2d5b6604679bf64bd4dc6763fb9cf8cb3ff5b287e89325e773ddc0",
  artifact_json_git_blob_sha1:"6d7243a2dd4e44ea126908d4d92071e7848340a7",
  census_id:"voidbe2933c1_bf0fae6a02a69c2fe17c2fd6a4a552db4f30dfdee16a8b4429865e3de389d888",
  artifact_inventory_sha256:"07ccac7dd9b02c4067739686e8020e589af9134886da62a9ad807ac54c4fbe5a",
  source_inventory_sha256:"828f4e6e3391c7f5b3d0e8e5ef131dd9ebb5325b0dd7f88b692b8e283bd74964",
  artifact_count:27,
  source_file_count:27,
  cross_node_byte_identity_verified:true,
});
const UNCHANGED_PREDECESSOR_ARTIFACTS_SHA256="3844cc20dca3f5fa7c09e22bd9e614a499d7949ea9c03d5a1a066122016c9f91";
const CURRENT_PREFLIGHT=Object.freeze({
  path:"dist/economic/buy_void_source_finality_execution_preflight_v1.js",
  bytes:26063,
  sha256:"697e9cfb4b0c70a7ed8ef953cba8748abfbfcb276e75083deb68695266d78fca",
});
const OLD_PREFLIGHT=Object.freeze({bytes:21997,sha256:"8045a382c34ccb1309319a2eaaa877255e9aff48aa27bdf38c180913a7f8f739"});
const ADDED=Object.freeze([
  "dist/economic/buy_void_source_finality_generation_provenance_v7.js",
  "dist/economic/buy_void_source_finality_live_process_binding_v1.js",
  "dist/economic/buy_void_source_finality_provider_pair_binding_v1.js",
  "dist/economic/buy_void_ethereum_public_checkout_finality_gate_v1.js",
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
  ...ADDED,
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
function read(relative,max=4*1024*1024){
  assert.ok(!path.isAbsolute(relative)&&!relative.split("/").includes(".."),"unsafe_path:"+relative);
  const absolute=path.join(ROOT,relative),before=fs.lstatSync(absolute);
  assert.ok(before.isFile()&&!before.isSymbolicLink()&&before.nlink===1&&before.size>0&&before.size<=max,
    "invalid_file:"+relative);
  const bytes=fs.readFileSync(absolute),after=fs.lstatSync(absolute);
  assert.equal(bytes.length,before.size,"short_read:"+relative);
  assert.equal(after.dev,before.dev);assert.equal(after.ino,before.ino);
  assert.equal(after.size,before.size);assert.equal(after.mtimeMs,before.mtimeMs);assert.equal(after.ctimeMs,before.ctimeMs);
  return bytes;
}
function pin(relative,expected,max){
  const bytes=read(relative,max);assert.equal(gitBlob(bytes),expected,"git_blob_drift:"+relative);return bytes;
}
function run(command,args,{timeout=180000}={}){
  const r=spawnSync(command,args,{cwd:ROOT,encoding:"utf8",stdio:["ignore","pipe","pipe"],timeout,maxBuffer:16*1024*1024,
    env:{PATH:"/usr/bin:/bin",HOME:"/nonexistent",LANG:"C",LC_ALL:"C",TZ:"UTC",NODE_ENV:"test",
      GIT_CONFIG_NOSYSTEM:"1",GIT_CONFIG_GLOBAL:"/dev/null",GIT_CONFIG_SYSTEM:"/dev/null",GIT_NO_REPLACE_OBJECTS:"1",
      GIT_OPTIONAL_LOCKS:"0",GIT_TERMINAL_PROMPT:"0"}});
  assert.equal(r.error,undefined,String(r.error||""));assert.equal(r.status,0,String(r.stderr||r.stdout||""));return r;
}
function git(args){return String(run("/usr/bin/git",["--no-replace-objects","-C",ROOT,...args],{timeout:30000}).stdout||"").trim();}
function sourcePath(artifact){return "src/economic/"+path.basename(artifact,".js")+".ts";}
function inventories(){
  const artifacts=ARTIFACT_PATHS.map(relative=>{const b=read(relative,2*1024*1024);return {path:relative,bytes:b.length,sha256:sha256(b)};});
  const sources=[...new Set(ARTIFACT_PATHS.map(sourcePath))].sort().map(relative=>{
    const b=read(relative,4*1024*1024),blob=gitBlob(b);assert.equal(git(["rev-parse","HEAD:"+relative]),blob,"source_head_mismatch:"+relative);
    return {path:relative,bytes:b.length,git_blob_sha1:blob,sha256:sha256(b)};
  });
  assert.equal(artifacts.length,27);assert.equal(sources.length,27);
  assert.equal(sha256(Buffer.from(canonical(artifacts))),HOSTED_CENSUS.artifact_inventory_sha256);
  assert.equal(sha256(Buffer.from(canonical(sources))),HOSTED_CENSUS.source_inventory_sha256);
  const unchanged=artifacts.filter(x=>x.path!==CURRENT_PREFLIGHT.path&&!ADDED.includes(x.path));
  assert.equal(unchanged.length,22);
  assert.equal(sha256(Buffer.from(canonical(unchanged))),UNCHANGED_PREDECESSOR_ARTIFACTS_SHA256);
  const preflight=artifacts.find(x=>x.path===CURRENT_PREFLIGHT.path);assert.deepEqual(preflight,CURRENT_PREFLIGHT);
  assert.notEqual(preflight.bytes,OLD_PREFLIGHT.bytes);assert.notEqual(preflight.sha256,OLD_PREFLIGHT.sha256);
  for(const added of ADDED)assert.ok(artifacts.some(x=>x.path===added),"missing_added_artifact:"+added);
  return {artifacts,sources};
}
function requireRuntimeSourceStable(){
  git(["merge-base","--is-ancestor",SOURCE_PARENT,"HEAD"]);
  const r=spawnSync("/usr/bin/git",["--no-replace-objects","-C",ROOT,"diff","--quiet","--no-ext-diff","--no-textconv",
    SOURCE_PARENT,"HEAD","--","src/economic","package.json","package-lock.json","tsconfig.build.json"],{
    encoding:"utf8",stdio:["ignore","pipe","pipe"],timeout:30000,
    env:{PATH:"/usr/bin:/bin",HOME:"/nonexistent",LANG:"C",LC_ALL:"C",TZ:"UTC",GIT_CONFIG_NOSYSTEM:"1",
      GIT_CONFIG_GLOBAL:"/dev/null",GIT_CONFIG_SYSTEM:"/dev/null",GIT_NO_REPLACE_OBJECTS:"1",GIT_OPTIONAL_LOCKS:"0"}});
  assert.equal(r.error,undefined,String(r.error||""));assert.equal(r.status,0,"runtime_or_build_source_changed_after_hosted_census");
}
function predecessor(){
  const bytes=pin(PREDECESSOR_LOCK,PREDECESSOR_LOCK_BLOB,128*1024),v=JSON.parse(bytes);
  assert.equal(v.marker,"VOID_BUY_VOID_ENFORCEMENT_POST2865_LOCK_V1");
  assert.equal(v.candidate_evidence?.candidate_enforcement_set_sha256,PREDECESSOR_SET);
  assert.equal(v.complete_executable_closure_verified,true);assert.equal(v.candidate_enforcement_identity_accepted,true);
  assert.equal(v.production_source_finality_authority_ready,false);assert.equal(v.public_presale_activation,false);assert.equal(v.funds_movement,false);
}
function packageIdentity(){
  pin(PACKAGE_TOOL,PACKAGE_TOOL_BLOB,128*1024);
  const bytes=pin(PACKAGE_MANIFEST,PACKAGE_MANIFEST_BLOB,128*1024),m=JSON.parse(bytes);
  assert.equal(m.profile_identity_accepted,true);assert.deepEqual(m.root_packages,["ethers","express"]);
  assert.equal(m.profile_id,"voidrnpr1_08e05626e80fbd2aecc3018514aaf76e491954f8258fff996f0b2dca1c3055ac");
  const profile=collectReviewedNodePackageRuntimeV1({rootPackages:["ethers","express"]});
  assert.equal(profile.profile_id,m.profile_id);assert.equal(profile.packages_aggregate_sha256,m.packages_aggregate_sha256);
  assert.equal(sha256(Buffer.from(canonicalJson(profile),"utf8")),m.profile_canonical_sha256);
  assert.equal(profile.package_count,82);assert.equal(profile.total_file_count,2498);assert.equal(profile.total_bytes,21290060);
  assert.equal(verifyReviewedNodePackageRuntimeV1({profile}).ok,true);return m;
}
function providerIdentity(){
  pin(PROVIDER_LOCK_PROOF,PROVIDER_LOCK_PROOF_BLOB,256*1024);
  const r=run(process.execPath,[path.join(ROOT,PROVIDER_LOCK_PROOF)]),v=JSON.parse(String(r.stdout||""));
  assert.equal(v.marker,"VOID_BUY_VOID_DELIVERY_DEPENDENCY_PROVIDER_CLOSURE_POST2865_LOCK_V1");
  assert.equal(v.candidate_json_sha256,"6c2bfe62b0d669bc9794a13eb24d357026ca8f9f7c055af1bcc0c0893c94247b");
  assert.equal(v.provider_closure_sha256,"3b6be7b9efdc7f70b6f270f77208efab2f7321136a54cc76a7e1d34c57bd4945");
  assert.equal(v.provider_closure_semantic_sha256,"95112d913d45b2b03887edb97c8693eef84a72b54b61503ffc66a6a7bce67384");
  assert.equal(v.provider_closure_identity_accepted,true);assert.equal(v.current_descendant_semantics_requalified,true);return v;
}
function deltaIdentity(){
  pin(V7_DELTA_PROOF,V7_DELTA_PROOF_BLOB,128*1024);
  const r=run(process.execPath,[path.join(ROOT,V7_DELTA_PROOF)]),v=JSON.parse(String(r.stdout||""));
  assert.equal(v.module_count,5);assert.equal(v.candidate_generation_sha256,"2316526ff2366b785972f4fd11f49440a859704f57fcdc047f3edab623d39e4b");
  assert.equal(v.artifact_inventory_sha256,"d70b35d87ec85adbe6f98b60e28304bf38fdb29b8b78ba4ff14b56eabdc722e9");
  assert.equal(v.complete_executable_closure_verified,false);return v;
}
function sagaEdge(){
  const saga=pin(SAGA_SOURCE,SAGA_SOURCE_BLOB,128*1024);assert.equal(sha256(saga),SAGA_SOURCE_SHA256);
  pin(SAGA_PROOF,SAGA_PROOF_BLOB,128*1024);
  const behavior=run(process.execPath,[path.join(ROOT,SAGA_PROOF)],{timeout:240000});
  const out=String(behavior.stdout||"");
  assert.match(out,/VOID_BUY_VOID_CRASH_CONSISTENT_FULFILLMENT_SAGA_V1_PROOF_GREEN/u);
  for(const needle of ['"network_request_performed": false','"credential_access_performed": false','"wallet_access_performed": false',
    '"signing_performed": false','"transaction_broadcast_performed": false','"money_movement": false'])assert.ok(out.includes(needle),needle);
  const compiled=read(IMPORTER,2*1024*1024);assert.equal(sha256(compiled),IMPORTER_SHA256);
  const ast=ts.createSourceFile(IMPORTER,compiled.toString("utf8"),ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
  assert.equal(ast.parseDiagnostics.length,0);const found=ast.statements.filter(n=>ts.isFunctionDeclaration(n)&&n.name?.text==="defaultSagaModule");
  assert.equal(found.length,1);const fn=found[0];assert.ok(fn.modifiers?.some(m=>m.kind===ts.SyntaxKind.AsyncKeyword));assert.equal(fn.body?.statements.length,2);
  const [first,second]=fn.body.statements;assert.ok(ts.isVariableStatement(first)&&first.declarationList.declarations.length===1);
  const d=first.declarationList.declarations[0];assert.ok(d.initializer&&ts.isNewExpression(d.initializer)&&ts.isIdentifier(d.initializer.expression)&&d.initializer.expression.text==="Function");
  const args=d.initializer.arguments||[];assert.equal(args.length,2);assert.ok(args.every(ts.isStringLiteral));assert.deepEqual(args.map(x=>x.text),["specifier","return import(specifier)"]);
  assert.ok(ts.isReturnStatement(second)&&second.expression&&ts.isCallExpression(second.expression)&&second.expression.arguments.length===1&&
    ts.isStringLiteral(second.expression.arguments[0])&&second.expression.arguments[0].text===TOOL_SPEC);
}
function derive(){
  requireRuntimeSourceStable();inventories();predecessor();const pkg=packageIdentity();const provider=providerIdentity();deltaIdentity();sagaEdge();
  const body={
    schema:"void_buy_void_enforcement_post2933_candidate_v1",marker:"VOID_BUY_VOID_ENFORCEMENT_POST2933_CANDIDATE_V1",version:1,
    repository:"6ZoSo9/void-node",source_parent:SOURCE_PARENT,hosted_census_evidence:HOSTED_CENSUS,
    predecessor_enforcement:{path:PREDECESSOR_LOCK,git_blob_sha1:PREDECESSOR_LOCK_BLOB,candidate_enforcement_set_sha256:PREDECESSOR_SET,
      complete_executable_closure_verified:true,candidate_enforcement_identity_accepted:true,historical_identity_preserved:true},
    audited_package_runtime:{manifest_path:PACKAGE_MANIFEST,manifest_git_blob_sha1:PACKAGE_MANIFEST_BLOB,profile_id:pkg.profile_id,
      packages_aggregate_sha256:pkg.packages_aggregate_sha256,profile_canonical_sha256:pkg.profile_canonical_sha256,
      root_packages:pkg.root_packages,profile_identity_accepted:true},
    dependency_provider:{lock_proof_path:PROVIDER_LOCK_PROOF,lock_proof_git_blob_sha1:PROVIDER_LOCK_PROOF_BLOB,
      candidate_json_sha256:provider.candidate_json_sha256,provider_closure_sha256:provider.provider_closure_sha256,
      provider_closure_semantic_sha256:provider.provider_closure_semantic_sha256,provider_closure_identity_accepted:true,
      current_descendant_semantics_requalified:true},
    v7_executable_delta:{proof_path:V7_DELTA_PROOF,proof_git_blob_sha1:V7_DELTA_PROOF_BLOB,module_count:5,
      candidate_generation_sha256:"2316526ff2366b785972f4fd11f49440a859704f57fcdc047f3edab623d39e4b",
      artifact_inventory_sha256:"d70b35d87ec85adbe6f98b60e28304bf38fdb29b8b78ba4ff14b56eabdc722e9",cross_node_byte_identity_verified:true},
    closure_transition:{predecessor_artifact_count:23,current_artifact_count:27,unchanged_predecessor_artifact_count:22,
      changed_artifact_paths:[CURRENT_PREFLIGHT.path],added_artifact_paths:[...ADDED],removed_artifact_paths:[],transition_exact:true},
    dynamic_saga_edge:{importer_artifact:IMPORTER,importer_artifact_sha256:IMPORTER_SHA256,tool_specifier:TOOL_SPEC,
      saga_source_git_blob_sha1:SAGA_SOURCE_BLOB,saga_source_sha256:SAGA_SOURCE_SHA256,saga_behavior_proof_git_blob_sha1:SAGA_PROOF_BLOB,
      dynamic_tool_execution_identity_verified:true,dynamic_tool_transitive_closure_verified:true},
    package_runtime_identity_accepted:true,provider_closure_composed:true,delivery_route_closure_composed:true,
    third_party_package_runtime_closure_verified:true,complete_executable_closure_verified:true,
    candidate_enforcement_identity_accepted:false,deployed_artifact_generation_verified:false,runtime_mount_authority:false,
    production_source_finality_authority_ready:false,public_presale_activation:false,funds_movement:false,
  };
  return Object.freeze({...body,candidate_enforcement_set_sha256:sha256(Buffer.from(canonical(body),"utf8"))});
}
const args=process.argv.slice(2);
if(args.length===1&&args[0]==="--derive")process.stdout.write(JSON.stringify(derive(),null,2)+"\n");
else if(args.length===0||(args.length===1&&args[0]==="--self-test")){
  const c=derive();assert.equal(c.candidate_enforcement_set_sha256,"839840e9480abdda2afe2daa3e948e7f1508ffe3a5e1c8316e4fc32b22ccebbc");
  assert.equal(c.complete_executable_closure_verified,true);assert.equal(c.candidate_enforcement_identity_accepted,false);
  console.log("VOID_BUY_VOID_ENFORCEMENT_POST2933_CANDIDATE_V1_GREEN");console.log("candidate_enforcement_set_sha256="+c.candidate_enforcement_set_sha256);
  console.log("complete_executable_closure_verified=true");console.log("candidate_enforcement_identity_accepted=false");
  console.log("production_source_finality_authority_ready=false");console.log("public_presale_activation=false");console.log("funds_movement=false");
}else throw Error("usage: proof [--self-test|--derive]");
