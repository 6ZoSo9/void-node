#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import {
  readDescriptorRelativeLinuxV1,
} from "./prove_buy_void_enforcement_descriptor_relative_linux_v1.mjs";
import {
  runReviewedGitV1,
  proveReviewedGitV1Synthetic,
} from "./prove_buy_void_reviewed_git_invocation_v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE_HEAD = "32f40899d6b71561bf4bf3a917e51c431cb867de";
const PACKAGE_LOCK_BLOB = "b2671f0149f522b2489247016df0a5ec4bb72b8b";
const TARGETS = Object.freeze([
  Object.freeze({path:"tools/buy-void-crash-consistent-fulfillment-saga-v1.mjs",blob:"d6a2d1cd82e5e255f435c1e21d1783774a44b2b1",external:["node:crypto","node:fs","node:path"]}),
  Object.freeze({path:"tools/buy-void-prepared-transaction-broadcaster-service-v1.mjs",blob:"70cd6ea46abecf82beb498cf61dabced2cf37084",external:["ethers","node:crypto","node:fs","node:net","node:path","node:url"]}),
  Object.freeze({path:"tools/buy-void-prepared-transaction-custodian-service-v1.mjs",blob:"ccf31c736ed125b0bd3e977a8c734b9e9ae67b33",external:["ethers","node:crypto","node:fs","node:net","node:path","node:url"]}),
]);
const CALLERS = Object.freeze([
  ["buy_void_prepared_transaction_broadcaster_chain2050_composition_v1.ts","e39df18f6b5324ead0707fe20ca7ae13f6b37046","buy-void-prepared-transaction-broadcaster-service-v1.mjs"],
  ["buy_void_prepared_transaction_custodian_credential_composition_v1.ts","9c51ea0ff2b7c1235078f81d808f7d991763bd25","buy-void-prepared-transaction-custodian-service-v1.mjs"],
  ["buy_void_prepared_transaction_broadcaster_inspection_activation_v1.ts","e25eccc52d527eb17f06e7cf0e49044b8924b5db","buy-void-prepared-transaction-broadcaster-service-v1.mjs"],
  ["buy_void_prepared_transaction_broadcaster_submission_activation_v1.ts","b752b0800b8eaddc6b9670de7173bd7f8ef0f17c","buy-void-prepared-transaction-broadcaster-service-v1.mjs"],
  ["buy_void_saga_broadcast_reconciliation_coordinator_v1.ts","fb1184e1a3cf8fc1d46f327b9df8f38d2f7adebb","buy-void-crash-consistent-fulfillment-saga-v1.mjs"],
  ["buy_void_payment_keyed_runtime_preflight_v1.ts","c22236f2bc39eab1d9cb4bd3c9f16963f11dd1c4","buy-void-crash-consistent-fulfillment-saga-v1.mjs"],
  ["buy_void_erc20_execution_composition_v1.ts","acf2f88b513bbe50e192531f9fc8d261b69bd0f1","buy-void-crash-consistent-fulfillment-saga-v1.mjs"],
  ["buy_void_payment_keyed_guarded_broadcast_v1.ts","14ff942b2ab7b34ba9da56ac9f534fa2b4910f73","buy-void-crash-consistent-fulfillment-saga-v1.mjs"],
  ["buy_void_payment_keyed_receipt_reconciliation_v1.ts","f398bf4dc1b73aee368e3a46e61347df320fe836","buy-void-crash-consistent-fulfillment-saga-v1.mjs"],
  ["buy_void_crash_consistent_saga_runtime_v1.ts","7fe5c6e18671453f5fae4476112a6a88b352085c","buy-void-crash-consistent-fulfillment-saga-v1.mjs"],
  ["buy_void_payment_keyed_broadcast_reconciliation_v1.ts","029cfb2500d7ce5b644e02b8d94ee126e8f59f8a","buy-void-crash-consistent-fulfillment-saga-v1.mjs"],
  ["buy_void_payment_keyed_preparation_coordinator_v1.ts","50252423e30c692d2674639100d59963771267f5","buy-void-crash-consistent-fulfillment-saga-v1.mjs"],
  ["buy_void_saga_prepared_transaction_coordinator_v1.ts","698d6150cc08d2768322126be3bf2b41bff64e95","buy-void-crash-consistent-fulfillment-saga-v1.mjs"],
]);
const MAX_READ = 16 * 1024 * 1024;
function sha256(b) {return crypto.createHash("sha256").update(b).digest("hex");}
function gitBlob(b) {
  return crypto.createHash("sha1").update(Buffer.from("blob "+b.length+"\0")).update(b).digest("hex");
}
function same(a,b) {
  return a.dev===b.dev && a.ino===b.ino && a.mode===b.mode &&
    a.nlink===b.nlink && a.size===b.size && a.mtimeMs===b.mtimeMs && a.ctimeMs===b.ctimeMs;
}
function read(root,relative,max=MAX_READ) {
  return readDescriptorRelativeLinuxV1(root,relative,max);
}
function ast(file,bytes,kind) {
  const node=ts.createSourceFile(
    file,
    bytes.toString("utf8"),
    ts.ScriptTarget.Latest,
    true,
    kind,
  );
  assert.equal(
    node.parseDiagnostics.length,
    0,
    "invalid JS/TS source: "+file,
  );
  return node;
}
function inspectTool(file,bytes) {
  const doc=ast(file,bytes,ts.ScriptKind.JS);
  const imports=[];
  let dynamic=0, generated=0, evalCount=0;
  function walk(node) {
    if((ts.isImportDeclaration(node)||ts.isExportDeclaration(node))&&node.moduleSpecifier) {
      assert.ok(ts.isStringLiteral(node.moduleSpecifier),"unbound tool import");
      imports.push(node.moduleSpecifier.text);
    }
    if(ts.isCallExpression(node)){
      const target=node.expression.getText(doc);
      if(node.expression.kind===ts.SyntaxKind.ImportKeyword)dynamic+=1;
      if(target==="require"||target==="eval"||target==="createRequire")evalCount+=1;
    }
    if(ts.isNewExpression(node)&&node.expression.getText(doc)==="Function")generated+=1;
    ts.forEachChild(node,walk);
  }
  walk(doc);
  assert.equal(dynamic,0,"dynamic tool module import observed");
  assert.equal(generated,0,"Function in tool target");
  assert.equal(evalCount,0,"alternate tool module loader");
  assert.ok(imports.every(x=>x.startsWith("node:")||x==="ethers"),"tool's own relative or unreviewed import");
  return {static_externals:[...imports].sort(),dynamic_import_count:dynamic};
}
function inspectCaller(file,bytes) {
  const doc=ast(file,bytes,ts.ScriptKind.TS);
  const generated=[],targets=[];
  function walk(node){
    if(ts.isNewExpression(node)&&node.expression.getText(doc)==="Function") {
      const args=node.arguments||[];
      assert.ok(args.length===2&&args.every(x=>ts.isStringLiteral(x)),"unreviewed function generator");
      assert.equal(args[0].text,"specifier");
      assert.equal(args[1].text,"return import(specifier)");
      generated.push(true);
    }
    if(ts.isCallExpression(node)&&node.expression.getText(doc)==="dynamicImport") {
      assert.equal(node.arguments.length,1,"unreviewed indirect import cardinality");
      const spec=node.arguments[0];
      assert.ok(ts.isStringLiteral(spec),"nonliteral generated import target");
      targets.push(spec.text);
    }
    ts.forEachChild(node,walk);
  }
  walk(doc);
  assert.equal(generated.length,1,"expected one code-generated import factory");
  assert.equal(targets.length,1,"expected exactly one literal tool call");
  assert.match(targets[0],/^\.\.\/\.\.\/tools\/buy-void-[a-z0-9-]+-v[0-9]+\.mjs$/u);
  return targets[0];
}
function syntheticResolverTest(emit = true) {
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),"void-tool-resolution-"));
  const dir=path.join(temp,"dist","economic");
  const toolDir=path.join(temp,"tools");
  const caller=path.join(dir,"caller.mjs");
  const tool=path.join(toolDir,"fixture-v1.mjs");
  try {
    fs.mkdirSync(dir,{recursive:true});
    fs.mkdirSync(toolDir,{recursive:true});
    fs.writeFileSync(caller,
      'const dynamicImport = new Function("specifier", "return import(specifier)");\n'+
      'const tool = await dynamicImport("../../tools/fixture-v1.mjs");\n'+
      'console.log(tool.identity);\n',{mode:0o600});
    fs.writeFileSync(tool,'export const identity="FIXTURE_ORIGINAL";\n',{mode:0o600});
    const env={PATH:"/usr/bin:/bin",HOME:"/nonexistent",LANG:"C",TZ:"UTC"};
    function run(cwd) {
      return execFileSync(process.execPath,[caller],{cwd,env,encoding:"utf8",
        timeout:7000,maxBuffer:5120,stdio:["ignore","pipe","pipe"]}).trim();
    }
    assert.equal(run(temp),"FIXTURE_ORIGINAL");
    assert.equal(run(dir),"FIXTURE_ORIGINAL");
    fs.renameSync(tool,path.join(toolDir,"original-moved.mjs"));
    fs.writeFileSync(tool,'export const identity="FIXTURE_REPLACEMENT";\n',{mode:0o600});
    assert.equal(run(temp),"FIXTURE_REPLACEMENT");
    if(emit) {
      console.log("DYNAMIC_TOOL_PATH_RESOLUTION_SYNTHETIC_GREEN");
      console.log("different_working_directories_same_target=true");
      console.log("mutable_target_changes_executed_code=true");
      console.log("production_target_verified=false");
    }
  } finally {fs.rmSync(temp,{recursive:true,force:true});}
}
function derive() {
  assert.ok([22,24,26].includes(Number(process.versions.node.split(".")[0])));
  assert.equal(ts.version,"5.9.3");
  const lock=read(ROOT,"package-lock.json");
  assert.equal(gitBlob(lock),PACKAGE_LOCK_BLOB);
  runReviewedGitV1(["merge-base","--is-ancestor",SOURCE_HEAD,"HEAD"],ROOT);
  const inputs=[...TARGETS.map(x=>x.path),...CALLERS.map(x=>"src/economic/"+x[0])];
  runReviewedGitV1(["diff","--quiet","--no-ext-diff","--no-textconv",
    SOURCE_HEAD,"HEAD","--",...inputs,"package-lock.json"],ROOT);
  const verifiedTools=TARGETS.map(target=>{
    const bytes=read(ROOT,target.path),got=gitBlob(bytes);
    assert.equal(got,target.blob,"reviewed tool source Git blob drift: "+target.path);
    const graph=inspectTool(target.path,bytes);
    assert.deepEqual(graph.static_externals,target.external);
    return {path:target.path,git_blob_sha1:got,bytes:bytes.length,
      sha256:sha256(bytes),static_externals:graph.static_externals,
      direct_dynamic_import_count:graph.dynamic_import_count,
      source_file_identity_verified:true,executed_target_verified:false,
      external_library_bytes_verified:false};
  });
  const verifiedCallers=CALLERS.map(entry=>{
    const file="src/economic/"+entry[0],blob=entry[1],tool=entry[2];
    const bytes=read(ROOT,file),gitSha=gitBlob(bytes);
    assert.equal(gitSha,blob,"reviewed caller source Git blob drift: "+file);
    const specifier=inspectCaller(file,bytes);
    const relative=path.posix.normalize(path.posix.join(path.posix.dirname(file),specifier));
    const target="tools/"+tool;
    assert.equal(relative,target,"source runtime specifier not bound to reviewed target");
    const compiled=path.posix.normalize(path.posix.join("dist/economic",specifier));
    assert.equal(compiled,target,"compiled runtime specifier not bound to reviewed target");
    return {source_path:file,source_git_blob_sha1:gitSha,
      dynamic_import_specifier:specifier,candidate_target:target,
      generated_function_importer_observed:true,
      executed_target_verified:false};
  });
  const hist={};
  for(const t of verifiedCallers){
    hist[t.candidate_target]=(hist[t.candidate_target]||0)+1;
  }
  assert.deepEqual(hist,{
    "tools/buy-void-prepared-transaction-broadcaster-service-v1.mjs":3,
    "tools/buy-void-prepared-transaction-custodian-service-v1.mjs":1,
    "tools/buy-void-crash-consistent-fulfillment-saga-v1.mjs":9,
  });
  syntheticResolverTest(false);
  return {
    schema:"void_buy_void_dynamic_tool_candidate_source_identity_v1",
    version:1,repository:"6ZoSo9/void-node",
    reviewed_source_generation:SOURCE_HEAD,
    original_dynamic_caller_count:verifiedCallers.length,
    original_unique_tool_count:verifiedTools.length,
    source_callers:verifiedCallers,tool_candidates:verifiedTools,
    code_generated_import_resolver_synthetic_only:true,
    actual_compiled_importer_execution_qualified:false,
    source_target_files_git_blobs_verified:true,
    executed_target_verified:false,
    dynamic_tool_transitive_closure_verified:false,
    complete_executable_closure_verified:false,
    candidate_identity_accepted:false,
    deployed_artifact_generation_verified:false,
    production_source_finality_authority_ready:false,
    presale_activation:false,
    funds_movement:false
  };
}
function selfTest() {
  proveReviewedGitV1Synthetic();
  assert.throws(()=>inspectCaller("fixture.ts",Buffer.from(
    'const dynamicImport=new Function("specifier","return import(specifier)");\n'+
    'dynamicImport(process.env.INJECTED);\n')),undefined,"nonliteral target must HOLD");
  assert.throws(()=>inspectCaller("fixture.ts",Buffer.from(
    'const dynamicImport=new Function("specifier","return eval(specifier)");\n'+
    'dynamicImport("../../tools/buy-void-test-v1.mjs");\n')),undefined,"altered generator must HOLD");
  assert.throws(()=>inspectTool("fixture.mjs",Buffer.from(
    'import "./unreviewed.mjs";\n')),undefined,"unreviewed relative import must HOLD");
  assert.throws(()=>inspectTool("fixture.mjs",Buffer.from(
    'const target=await import(process.env.ATTACK);\n')),undefined,"dynamic tool import must HOLD");
  assert.throws(()=>inspectTool("fixture.mjs",Buffer.from(
    'const x=new Function("return 2");\n')),undefined,"code-generation tool must HOLD");
  syntheticResolverTest();
  console.log("DYNAMIC_TOOL_CANDIDATE_SOURCE_ONLY_SELFTEST_GREEN");
  console.log("untrusted_dynamic_targets_rejected=true");
  console.log("no_real_tool_execution=true");
  console.log("candidate_identity_accepted=false");
}
const args=process.argv.slice(2);
if(args.length===1&&args[0]==="--self-test") selfTest();
else if(args.length===1&&args[0]==="--derive"){
  process.stdout.write(JSON.stringify(derive(),null,2)+"\n");
} else throw Error("tool_candidate_census_only_no_production_authority");
