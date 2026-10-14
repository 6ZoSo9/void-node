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
import {
  VOID_BUY_VOID_CURRENT_ENFORCEMENT_TRACKED_SOURCE_PATHS_V1,
  inspectBuyVoidCurrentEnforcementTrackedSourceInventoryV1,
} from "../ops/precision/void_buy_void_source_finality_v7_deployment_receipt_install_v1.ts";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const PROTECTED_CENSUS_PARENT="873e4fa7cdc1cdb5e6d39c721759c7bebc8dff86";
const PROTECTED_CENSUS_PROOF="scripts/prove_buy_void_enforcement_final_v7_artifact_census_v3.mjs";
const PROTECTED_CENSUS_PROOF_BLOB="c26e018ec8ae7e2dc216fe3868f8fdec2437a74a";
const HOSTED_PROTECTED_CENSUS=Object.freeze({
  workflow_run:38643246808,
  node22_artifact_id:11930398930,
  census_id:"voidbefv7c3_6ecf0dda04818faca50159763d330c6c95baa52148dcdbb3d5eaa36f0d649c70",
  census_json_sha256:"c6d2d3707c0e79701579dd2d3f75def150aa2b37b594cdb631f780f0922e01ee",
  economic_artifact_inventory_sha256:"e7fe07c5e9e5386d6dd4e95132b6d2551426d9b62fabd9257f43f2e271cdfd8f",
  economic_source_inventory_sha256:"ceaaf5cd9faf3b9176cfd02f1fabf455212391f24df1040707ba487a7ebb96a3",
  protected_tracked_source_inventory_canonical_sha256:"36c18eb2bd7ac1ab02b8a1463e7e9afc82423192eedcdf7e9190f6aaba53bee5",
  economic_artifact_count:28,
  economic_source_file_count:28,
  protected_tracked_source_count:49,
  cross_node_byte_identity_verified:true,
});
const CANDIDATE_WORKFLOW=".github/workflows/buy-void-enforcement-final-protected-v7-v2-candidate-v1.yml";
const CANDIDATE_WORKFLOW_TRIGGER_DEPENDENCIES=Object.freeze([
  PROTECTED_CENSUS_PROOF,
  "scripts/prove_void_buy_v7_privileged_launcher_package_runtime_v2.mjs",
  "scripts/prove_buy_void_delivery_dependency_provider_closure_post2865_lock_v1.mjs",
  "scripts/prove_buy_void_source_finality_v7_executable_delta_candidate_v1.mjs",
  "scripts/prove_buy_void_crash_consistent_fulfillment_saga_v1.mjs",
]);
const RUNTIME_SOURCE_PARENT="82aee920f26b45c7e43bcc9f9e1023a175e2783a";
const CURRENT_ENFORCEMENT_PARENT="a2f304fa3ae494cdd4fa71f65aa6f689a1313948";
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
const V7_DELTA_PROOF_BLOB="ed0aeaca4e5feaf306d7d5e5f308878d43c03b0e";
const SAGA_SOURCE="tools/buy-void-crash-consistent-fulfillment-saga-v1.mjs";
const SAGA_SOURCE_BLOB="d6a2d1cd82e5e255f435c1e21d1783774a44b2b1";
const SAGA_SOURCE_SHA256="e94b2c5c2da0a4849acab936d0d7f8710f2d2229909d73bc679a83c63f777e01";
const SAGA_PROOF="scripts/prove_buy_void_crash_consistent_fulfillment_saga_v1.mjs";
const SAGA_PROOF_BLOB="d33206063799aaddf64ce178a618e174e0ddf628";
const IMPORTER="dist/economic/buy_void_erc20_execution_composition_v1.js";
const IMPORTER_SHA256="b243a1611bceff0a7d758aeaaebf4e74c2bad6b762595ff0e13804e11b5c2af1";
const TOOL_SPEC="../../tools/buy-void-crash-consistent-fulfillment-saga-v1.mjs";
const HOSTED_CENSUS=Object.freeze({
  workflow_run:38628146500,
  node22_artifact_id:11925586121,
  artifact_json_bytes:14118,
  artifact_json_sha256:"5d73fccde209c2cc9719ed488f3944c9cb625d7c32c66a0f99a0ccd4c0c1c350",
  artifact_json_git_blob_sha1:"9fae8e53c01771e3b1b9cdf04a0fc85a4ad324a9",
  census_id:"voidbefv7c2_2dddb68128ce0baff4a848568fac7651c025cc97956cdf1b3d6faff6a9ae075a",
  artifact_inventory_sha256:"e7fe07c5e9e5386d6dd4e95132b6d2551426d9b62fabd9257f43f2e271cdfd8f",
  source_inventory_sha256:"ceaaf5cd9faf3b9176cfd02f1fabf455212391f24df1040707ba487a7ebb96a3",
  artifact_count:28,
  source_file_count:28,
  cross_node_byte_identity_verified:true,
});
const CURRENT_CANONICAL_ARTIFACT_INVENTORY_SHA256=
  "8d186c88bad544fdbdcbc928cce3883c83d9be194ae57f2e00ff1cf84e705496";
const CURRENT_CANONICAL_SOURCE_INVENTORY_SHA256=
  "9036b38b760d34a586aa8fb44f86e85b6120fbf941b1b487069c90bd1739948b";
const UNCHANGED_PREDECESSOR_ARTIFACTS_SHA256="3844cc20dca3f5fa7c09e22bd9e614a499d7949ea9c03d5a1a066122016c9f91";
const CURRENT_PREFLIGHT=Object.freeze({
  path:"dist/economic/buy_void_source_finality_execution_preflight_v1.js",
  bytes:26591,
  sha256:"2de452e82771a2825f210d4871076a796947977ede58554e298ba77bc4f5e71b",
});
const OLD_PREFLIGHT=Object.freeze({bytes:21997,sha256:"8045a382c34ccb1309319a2eaaa877255e9aff48aa27bdf38c180913a7f8f739"});
const ADDED=Object.freeze([
  "dist/economic/buy_void_source_finality_generation_provenance_v7.js",
  "dist/economic/buy_void_source_finality_live_process_binding_v1.js",
  "dist/economic/buy_void_source_finality_live_process_binding_v2.js",
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
function assertCandidateWorkflowTriggerCoverage(){
  const workflow=read(CANDIDATE_WORKFLOW,128*1024).toString("utf8");
  for(const relative of CANDIDATE_WORKFLOW_TRIGGER_DEPENDENCIES){
    const exact='      - "'+relative+'"';
    assert.equal(
      workflow.split(exact).length-1,
      2,
      "candidate_workflow_trigger_dependency_count:"+relative,
    );
  }
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
  assert.equal(artifacts.length,28);assert.equal(sources.length,28);
  const hostedArtifactInventorySha256=sha256(Buffer.from(JSON.stringify(artifacts),"utf8"));
  const hostedSourceInventorySha256=sha256(Buffer.from(JSON.stringify(sources),"utf8"));
  const canonicalArtifactInventorySha256=sha256(Buffer.from(canonical(artifacts),"utf8"));
  const canonicalSourceInventorySha256=sha256(Buffer.from(canonical(sources),"utf8"));
  assert.equal(hostedArtifactInventorySha256,HOSTED_CENSUS.artifact_inventory_sha256);
  assert.equal(hostedSourceInventorySha256,HOSTED_CENSUS.source_inventory_sha256);
  assert.equal(canonicalArtifactInventorySha256,CURRENT_CANONICAL_ARTIFACT_INVENTORY_SHA256);
  assert.equal(canonicalSourceInventorySha256,CURRENT_CANONICAL_SOURCE_INVENTORY_SHA256);
  const unchanged=artifacts.filter(x=>x.path!==CURRENT_PREFLIGHT.path&&!ADDED.includes(x.path));
  assert.equal(unchanged.length,22);
  assert.equal(sha256(Buffer.from(canonical(unchanged))),UNCHANGED_PREDECESSOR_ARTIFACTS_SHA256);
  const preflight=artifacts.find(x=>x.path===CURRENT_PREFLIGHT.path);assert.deepEqual(preflight,CURRENT_PREFLIGHT);
  assert.notEqual(preflight.bytes,OLD_PREFLIGHT.bytes);assert.notEqual(preflight.sha256,OLD_PREFLIGHT.sha256);
  for(const added of ADDED)assert.ok(artifacts.some(x=>x.path===added),"missing_added_artifact:"+added);
  return Object.freeze({
    artifacts,
    sources,
    hosted_artifact_inventory_sha256:hostedArtifactInventorySha256,
    hosted_source_inventory_sha256:hostedSourceInventorySha256,
    canonical_artifact_inventory_sha256:canonicalArtifactInventorySha256,
    canonical_source_inventory_sha256:canonicalSourceInventorySha256,
  });
}
function requireRuntimeSourceStable(){
  const r=spawnSync("/usr/bin/git",["--no-replace-objects","-C",ROOT,"diff","--quiet","--no-ext-diff","--no-textconv",
    RUNTIME_SOURCE_PARENT,"HEAD","--","src/economic","package.json","package-lock.json","tsconfig.build.json"],{
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
  assert.equal(v.module_count,6);assert.equal(v.candidate_generation_sha256,"cfac0b510932203623a4b9a0c09ad9c6639efdb04b0e5f1ff9feba15175f9311");
  assert.equal(v.source_inventory_sha256,"55b409c31801d743af3e449edce3cdc5408170e16dfc285053a539208c44cacb");
  assert.equal(v.artifact_inventory_sha256,"45ae15e681a209b0cecef9d581febd98e7cefaf3db72d2c869efedd59e2d5429");
  assert.equal(v.complete_executable_closure_verified,false);return v;
}
function liveProcessV2StaticEdge(){
  const relative="dist/economic/buy_void_source_finality_live_process_binding_v2.js";
  const artifact=read(relative,2*1024*1024);
  assert.equal(artifact.length,23957);
  assert.equal(sha256(artifact),"23b93cdd8c73b8f466281462b95a0c10df12eb6e6c62a6548d667b8142b9151b");
  const ast=ts.createSourceFile(relative,artifact.toString("utf8"),ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
  assert.equal(ast.parseDiagnostics.length,0);
  let dynamicImportCount=0;
  let functionConstructorCount=0;
  function visit(node){
    if(ts.isCallExpression(node)&&node.expression.kind===ts.SyntaxKind.ImportKeyword)dynamicImportCount+=1;
    if(ts.isNewExpression(node)&&ts.isIdentifier(node.expression)&&node.expression.text==="Function")functionConstructorCount+=1;
    ts.forEachChild(node,visit);
  }
  visit(ast);
  assert.equal(dynamicImportCount,0,"live_process_v2_dynamic_import_forbidden");
  assert.equal(functionConstructorCount,0,"live_process_v2_function_constructor_forbidden");
  return Object.freeze({
    artifact_path:relative,
    artifact_sha256:"23b93cdd8c73b8f466281462b95a0c10df12eb6e6c62a6548d667b8142b9151b",
    source_git_blob_sha1:"987c97568a4d1b9814218603df48a65dbfeed18f",
    dynamic_import_count:0,
    function_constructor_count:0,
    static_execution_closure_verified:true,
  });
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
function currentEnforcementInventory(){
  git(["merge-base","--is-ancestor",PROTECTED_CENSUS_PARENT,"HEAD"]);
  pin(PROTECTED_CENSUS_PROOF,PROTECTED_CENSUS_PROOF_BLOB,256*1024);
  const rows=inspectBuyVoidCurrentEnforcementTrackedSourceInventoryV1(ROOT);
  assert.equal(rows.length,49,"current_enforcement_inventory_count");
  const required=[...VOID_BUY_VOID_CURRENT_ENFORCEMENT_TRACKED_SOURCE_PATHS_V1];
  assert.equal(required.length,49,"current_enforcement_required_path_count");
  assert.deepEqual(rows.map(row=>row.path),required,"current_enforcement_inventory_path_order");
  assert.deepEqual(required,[...required].sort(),"current_enforcement_required_paths_not_sorted");
  git(["cat-file","-e",CURRENT_ENFORCEMENT_PARENT+"^{commit}"]);
  const diff=spawnSync("/usr/bin/git",[
    "--no-replace-objects","-C",ROOT,
    "diff","--quiet","--no-ext-diff","--no-textconv",
    CURRENT_ENFORCEMENT_PARENT,"HEAD","--",...required,
  ],{
    encoding:"utf8",stdio:["ignore","pipe","pipe"],timeout:30000,
    env:{PATH:"/usr/bin:/bin",HOME:"/nonexistent",LANG:"C",LC_ALL:"C",TZ:"UTC",
      GIT_CONFIG_NOSYSTEM:"1",GIT_CONFIG_GLOBAL:"/dev/null",GIT_CONFIG_SYSTEM:"/dev/null",
      GIT_NO_REPLACE_OBJECTS:"1",GIT_OPTIONAL_LOCKS:"0",GIT_TERMINAL_PROMPT:"0"},
  });
  assert.equal(diff.error,undefined,String(diff.error||""));
  assert.equal(diff.status,0,"current_enforcement_paths_changed_after_accepted_parent");
  const inventorySha256=sha256(Buffer.from(canonical(rows),"utf8"));
  assert.equal(
    inventorySha256,
    HOSTED_PROTECTED_CENSUS.protected_tracked_source_inventory_canonical_sha256,
    "protected_census_inventory_digest_mismatch",
  );
  return Object.freeze({
    rows,
    inventory_sha256:inventorySha256,
    count:rows.length,
    accepted_parent:CURRENT_ENFORCEMENT_PARENT,
    exact_parent_path_identity_preserved:true,
  });
}
function derive(){
  assertCandidateWorkflowTriggerCoverage();requireRuntimeSourceStable();const inventoryEvidence=inventories();const currentEnforcement=currentEnforcementInventory();predecessor();const pkg=packageIdentity();const provider=providerIdentity();deltaIdentity();const liveV2=liveProcessV2StaticEdge();sagaEdge();
  const body={
    schema:"void_buy_void_enforcement_final_protected_v7_v2_candidate_v1",marker:"VOID_BUY_VOID_ENFORCEMENT_FINAL_PROTECTED_V7_V2_CANDIDATE_V1",version:1,
    repository:"6ZoSo9/void-node",runtime_source_parent:RUNTIME_SOURCE_PARENT,protected_census_parent:PROTECTED_CENSUS_PARENT,current_enforcement_parent:CURRENT_ENFORCEMENT_PARENT,hosted_census_evidence:HOSTED_CENSUS,protected_census_evidence:HOSTED_PROTECTED_CENSUS,
    current_inventory_evidence:Object.freeze({
      hosted_json_artifact_inventory_sha256:inventoryEvidence.hosted_artifact_inventory_sha256,
      hosted_json_source_inventory_sha256:inventoryEvidence.hosted_source_inventory_sha256,
      canonical_artifact_inventory_sha256:inventoryEvidence.canonical_artifact_inventory_sha256,
      canonical_source_inventory_sha256:inventoryEvidence.canonical_source_inventory_sha256,
    }),
    current_enforcement_tracked_source_inventory_v1:currentEnforcement.rows,
    current_enforcement_tracked_source_inventory_count:currentEnforcement.count,
    current_enforcement_tracked_source_inventory_sha256:currentEnforcement.inventory_sha256,
    current_enforcement_tracked_source_inventory_verified:true,
    current_enforcement_parent_path_identity_preserved:currentEnforcement.exact_parent_path_identity_preserved,
    predecessor_enforcement:{path:PREDECESSOR_LOCK,git_blob_sha1:PREDECESSOR_LOCK_BLOB,candidate_enforcement_set_sha256:PREDECESSOR_SET,
      complete_executable_closure_verified:true,candidate_enforcement_identity_accepted:true,historical_identity_preserved:true},
    audited_package_runtime:{manifest_path:PACKAGE_MANIFEST,manifest_git_blob_sha1:PACKAGE_MANIFEST_BLOB,profile_id:pkg.profile_id,
      packages_aggregate_sha256:pkg.packages_aggregate_sha256,profile_canonical_sha256:pkg.profile_canonical_sha256,
      root_packages:pkg.root_packages,profile_identity_accepted:true},
    dependency_provider:{lock_proof_path:PROVIDER_LOCK_PROOF,lock_proof_git_blob_sha1:PROVIDER_LOCK_PROOF_BLOB,
      candidate_json_sha256:provider.candidate_json_sha256,provider_closure_sha256:provider.provider_closure_sha256,
      provider_closure_semantic_sha256:provider.provider_closure_semantic_sha256,provider_closure_identity_accepted:true,
      current_descendant_semantics_requalified:true},
    v7_executable_delta:{proof_path:V7_DELTA_PROOF,proof_git_blob_sha1:V7_DELTA_PROOF_BLOB,module_count:6,
      candidate_generation_sha256:"cfac0b510932203623a4b9a0c09ad9c6639efdb04b0e5f1ff9feba15175f9311",
      source_inventory_sha256:"55b409c31801d743af3e449edce3cdc5408170e16dfc285053a539208c44cacb",
      artifact_inventory_sha256:"45ae15e681a209b0cecef9d581febd98e7cefaf3db72d2c869efedd59e2d5429",cross_node_byte_identity_verified:true},
    closure_transition:{predecessor_artifact_count:23,current_artifact_count:28,unchanged_predecessor_artifact_count:22,
      changed_artifact_paths:[CURRENT_PREFLIGHT.path],added_artifact_paths:[...ADDED],removed_artifact_paths:[],transition_exact:true},
    live_process_v2_static_edge:liveV2,
    dynamic_saga_edge:{importer_artifact:IMPORTER,importer_artifact_sha256:IMPORTER_SHA256,tool_specifier:TOOL_SPEC,
      saga_source_git_blob_sha1:SAGA_SOURCE_BLOB,saga_source_sha256:SAGA_SOURCE_SHA256,saga_behavior_proof_git_blob_sha1:SAGA_PROOF_BLOB,
      dynamic_tool_execution_identity_verified:true,dynamic_tool_transitive_closure_verified:true},
    package_runtime_identity_accepted:true,provider_closure_composed:true,delivery_route_closure_composed:true,
    live_process_v2_static_execution_closure_verified:true,
    third_party_package_runtime_closure_verified:true,complete_executable_closure_verified:true,
    candidate_enforcement_identity_accepted:false,deployed_artifact_generation_verified:false,runtime_mount_authority:false,
    production_source_finality_authority_ready:false,public_presale_activation:false,funds_movement:false,
  };
  return Object.freeze({...body,candidate_enforcement_set_sha256:sha256(Buffer.from(canonical(body),"utf8"))});
}
const args=process.argv.slice(2);
if(args.length===1&&args[0]==="--derive")process.stdout.write(JSON.stringify(derive(),null,2)+"\n");
else if(args.length===0||(args.length===1&&args[0]==="--self-test")){
  const c=derive();assert.match(c.candidate_enforcement_set_sha256,/^[0-9a-f]{64}$/u);
  assert.equal(c.complete_executable_closure_verified,true);assert.equal(c.candidate_enforcement_identity_accepted,false);
  console.log("VOID_BUY_VOID_ENFORCEMENT_FINAL_PROTECTED_V7_V2_CANDIDATE_V1_GREEN");console.log("candidate_enforcement_set_sha256="+c.candidate_enforcement_set_sha256);
  console.log("complete_executable_closure_verified=true");console.log("candidate_enforcement_identity_accepted=false");
  console.log("production_source_finality_authority_ready=false");console.log("public_presale_activation=false");console.log("funds_movement=false");
}else throw Error("usage: proof [--self-test|--derive]");
