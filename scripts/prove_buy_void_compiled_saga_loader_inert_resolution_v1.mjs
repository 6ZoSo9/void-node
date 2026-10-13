#!/usr/bin/env node
// Scoped evidence only: execute the exact extracted COMPILED importer against
// disposable inert saga modules. Never import the real VOID saga.
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { readDescriptorRelativeLinuxV1 } from "./prove_buy_void_enforcement_descriptor_relative_linux_v1.mjs";
import { runReviewedGitV1, proveReviewedGitV1Synthetic } from "./prove_buy_void_reviewed_git_invocation_v1.mjs";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const PARENT="eeef850affd912a0d1e019bfac2d681b38ea24ed";
const SOURCE="src/economic/buy_void_erc20_execution_composition_v1.ts";
const SOURCE_BLOB="acf2f88b513bbe50e192531f9fc8d261b69bd0f1";
const COMPILED="dist/economic/buy_void_erc20_execution_composition_v1.js";
const COMPILED_BYTES=86455;
const COMPILED_SHA="b243a1611bceff0a7d758aeaaebf4e74c2bad6b762595ff0e13804e11b5c2af1";
const SAGA="tools/buy-void-crash-consistent-fulfillment-saga-v1.mjs";
const SAGA_BLOB="d6a2d1cd82e5e255f435c1e21d1783774a44b2b1";
const SAGA_BYTES=58023;
const DOCKER_BLOB="2acd9bcf0416eeb0f9fd72c1a556696863ff1607";
const LOCK_BLOB="b2671f0149f522b2489247016df0a5ec4bb72b8b";
const DESCRIPTOR_HELPER_BLOB="1458d72e7f6315dc06fb09fe55dc0e6591f9ee94";
const REVIEWED_GIT_HELPER_BLOB="2df64e31debd4884f2d859d55a87e4ef15925d3d";
const TOOL_SPEC="../../tools/buy-void-crash-consistent-fulfillment-saga-v1.mjs";

const sha=b=>crypto.createHash("sha256").update(b).digest("hex");
const blob=b=>crypto.createHash("sha1")
  .update(Buffer.from("blob "+b.length+"\0")).update(b).digest("hex");
function exactSource(file,sha1,max=16*1024*1024) {
  const bytes=readDescriptorRelativeLinuxV1(ROOT,file,max);
  assert.equal(blob(bytes),sha1,"source input identity drift: "+file);
  return bytes;
}
function checkedCompiled() {
  const bytes=readDescriptorRelativeLinuxV1(ROOT,COMPILED,2*1024*1024);
  assert.equal(bytes.length,COMPILED_BYTES,"compiled saga caller size drift");
  assert.equal(sha(bytes),COMPILED_SHA,"compiled saga caller SHA-256 drift");
  return bytes;
}
function extractOnlyCompiledSagaFactory(compiledBytes) {
  const ast=ts.createSourceFile(COMPILED,compiledBytes.toString("utf8"),
    ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
  assert.equal(ast.parseDiagnostics.length,0,"compiled runtime parse diagnostics");
  const found=ast.statements.filter(n=>ts.isFunctionDeclaration(n)&&
    n.name?.text==="defaultSagaModule");
  assert.equal(found.length,1,"exactly one defaultSagaModule declaration");
  const fn=found[0];
  assert.ok(fn.modifiers?.some(m=>m.kind===ts.SyntaxKind.AsyncKeyword),
    "async saga import factory required");
  assert.equal(fn.parameters.length,0,"saga factory arguments forbidden");
  assert.ok(fn.body&&fn.body.statements.length===2,
    "saga import factory must have exactly two statements");
  const [first,second]=fn.body.statements;
  assert.ok(ts.isVariableStatement(first)&&
    first.declarationList.declarations.length===1,
    "one factory-local dynamicImport initializer");
  assert.ok(first.declarationList.flags & ts.NodeFlags.Const,
    "dynamicImport factory binding must be const");
  const binding=first.declarationList.declarations[0];
  assert.ok(ts.isIdentifier(binding.name)&&binding.name.text==="dynamicImport",
    "factory variable identity drift");
  assert.ok(binding.initializer&&ts.isNewExpression(binding.initializer) &&
    ts.isIdentifier(binding.initializer.expression)&&
    binding.initializer.expression.text==="Function",
    "unreviewed factory constructor");
  const args=binding.initializer.arguments||[];
  assert.equal(args.length,2,"generated Function constructor arg count");
  assert.ok(args.every(ts.isStringLiteral),"generated Function arguments must be literals");
  assert.deepEqual(args.map(x=>x.text),
    ["specifier","return import(specifier)"],
    "reviewed code-generated ESM expression drift");
  assert.ok(ts.isReturnStatement(second)&&second.expression&&
    ts.isCallExpression(second.expression),
    "factory must return exactly one dynamic import");
  const call=second.expression;
  assert.ok(ts.isIdentifier(call.expression)&&
    call.expression.text==="dynamicImport"&&call.arguments.length===1 &&
    ts.isStringLiteral(call.arguments[0])&&call.arguments[0].text===TOOL_SPEC,
    "compiled saga target must be exactly literal");
  return fn.getText(ast);
}
function inspectCorpus() {
  const original='async function defaultSagaModule() { const dynamicImport = new Function("specifier", "return import(specifier)"); return dynamicImport("../../tools/buy-void-crash-consistent-fulfillment-saga-v1.mjs"); }';
  const valid=extractOnlyCompiledSagaFactory(Buffer.from(original));
  assert.match(valid,/defaultSagaModule/u);
  for(const bad of [
    original.replace("return import(specifier)","return eval(specifier)"),
    original.replace(TOOL_SPEC,"../../tools/other.mjs"),
    original.replace("specifier\", \"return","x\", \"return"),
    original.replace("return dynamicImport", "console.log('unexpected'); return dynamicImport"),
    original.replace("async function", "function")
  ]){
    assert.notEqual(bad,original);
    assert.throws(()=>extractOnlyCompiledSagaFactory(Buffer.from(bad)),
      undefined,"altered factory shape must HOLD");
  }
}
function syntheticExactCompiledFactory(fnText) {
  const temporary=fs.mkdtempSync(path.join(os.tmpdir(),"void-compiled-saga-loader-inert-"));
  const runtime=path.join(temporary,"dist","economic");
  const tools=path.join(temporary,"tools");
  const entry=path.join(runtime,"compiled_factory_only.mjs");
  const inertTarget=path.join(tools,path.posix.basename(SAGA));
  const fixedChildEnv=Object.freeze({
    PATH:"/usr/bin:/bin",HOME:"/nonexistent",LANG:"C",TZ:"UTC",
    NODE_ENV:"test",GIT_CONFIG_NOSYSTEM:"1",GIT_CONFIG_GLOBAL:"/dev/null"
  });
  function put(identity) {
    fs.writeFileSync(inertTarget,
      "export const marker = "+JSON.stringify(identity)+";\n",
      {mode:0o600});
  }
  function run(cwd) {
    const stdout=execFileSync(process.execPath,[entry],{
      cwd,env:fixedChildEnv,encoding:"utf8",
      stdio:["ignore","pipe","pipe"],timeout:15000,maxBuffer:8192
    });
    const lines=stdout.trim().split("\n");
    assert.equal(lines.length,1,"unexpected generated-loader stdout");
    return JSON.parse(lines[0]);
  }
  try {
    fs.mkdirSync(runtime,{recursive:true});
    fs.mkdirSync(tools,{recursive:true});
    // The function body is copied without rewriting ANY execution code;
    // only the imported target path resolves to a harmless temporary file.
    fs.writeFileSync(entry,
      fnText+"\nconst result=await defaultSagaModule();\n"+
      "console.log(JSON.stringify({marker:result.marker}));\n",
      {mode:0o600});
    put("SYNTHETIC_SAGA_A");
    assert.deepEqual(run(temporary),{marker:"SYNTHETIC_SAGA_A"});
    assert.deepEqual(run(runtime),{marker:"SYNTHETIC_SAGA_A"});
    fs.unlinkSync(inertTarget);
    assert.throws(()=>run(temporary),undefined,"missing tool must HOLD");
    put("SYNTHETIC_SAGA_B");
    assert.deepEqual(run(temporary),{marker:"SYNTHETIC_SAGA_B"});
    put("SYNTHETIC_SAGA_A");
    assert.deepEqual(run(runtime),{marker:"SYNTHETIC_SAGA_A"});
    return true;
  } finally {
    fs.rmSync(temporary,{recursive:true,force:true});
  }
}
function derive() {
  assert.ok(process.platform==="linux","Linux fixture only");
  assert.ok([22,24,26].includes(Number(process.versions.node.split(".")[0])),
    "unreviewed Node major");
  assert.equal(ts.version,"5.9.3","compiler syntax parser drift");
  const recordedLock=exactSource("package-lock.json",LOCK_BLOB);
  assert.ok(recordedLock.length>0);
  runReviewedGitV1(["merge-base","--is-ancestor",PARENT,"HEAD"],ROOT);
  runReviewedGitV1(["diff","--quiet","--no-ext-diff","--no-textconv",
    PARENT,"HEAD","--",
    SOURCE,SAGA,"Dockerfile","package.json","package-lock.json",
    "tsconfig.build.json","scripts/copy_void_runtime_js_v1.mjs",
    "scripts/retire_saveblock_periodic_rewriters_v1.mjs"
  ],ROOT);
  exactSource("scripts/prove_buy_void_enforcement_descriptor_relative_linux_v1.mjs",
    DESCRIPTOR_HELPER_BLOB,128*1024);
  exactSource("scripts/prove_buy_void_reviewed_git_invocation_v1.mjs",
    REVIEWED_GIT_HELPER_BLOB,128*1024);
  exactSource(SOURCE,SOURCE_BLOB,2*1024*1024);
  const saga=exactSource(SAGA,SAGA_BLOB,128*1024);
  assert.equal(saga.length,SAGA_BYTES,"saga source bytes drift");
  const docker=exactSource("Dockerfile",DOCKER_BLOB,32*1024).toString("utf8");
  assert.ok(docker.includes(
    "COPY --from=build /app/tools/buy-void-crash-consistent-fulfillment-saga-v1.mjs ./tools/"),
    "saga stopped-image stage missing");
  const compiled=checkedCompiled();
  const fnText=extractOnlyCompiledSagaFactory(compiled);
  assert.equal(syntheticExactCompiledFactory(fnText),true);
  return {
    schema:"void_buy_void_compiled_saga_loader_inert_resolution_v1",
    version:1,repository:"6ZoSo9/void-node",
    exact_source_parent:PARENT,
    compiled_importer_path:COMPILED,
    compiled_importer_bytes:compiled.length,
    compiled_importer_sha256:sha(compiled),
    compiled_factory_source_sha256:sha(Buffer.from(fnText,"utf8")),
    source_importer_git_blob_sha1:SOURCE_BLOB,
    reviewed_saga_source_git_blob_sha1:SAGA_BLOB,
    reviewed_saga_source_bytes:SAGA_BYTES,
    staged_saga_dockerfile_git_blob_sha1:DOCKER_BLOB,
    generated_import_specifier:TOOL_SPEC,
    extracted_compiled_factory_shape_verified:true,
    exact_compiled_factory_executed_with_inert_tool:true,
    inert_loader_resolution_across_working_directories:true,
    missing_inert_target_rejected:true,
    substituted_inert_target_changes_loaded_code:true,
    real_saga_module_imported:false,
    real_saga_module_executed:false,
    real_saga_exports_invoked:false,
    stopped_image_runtime_loader_qualified:false,
    packaged_image_generation_accepted:false,
    deployed_artifact_generation_verified:false,
    production_source_finality_authority_ready:false,
    accepted_enforcement_v5:false,
    presale_activation:false,
    funds_moved:false
  };
}
const args=process.argv.slice(2);
if(args.length===1 && args[0]==="--self-test"){
  proveReviewedGitV1Synthetic();
  inspectCorpus();
  const good=checkedCompiled();
  const fn=extractOnlyCompiledSagaFactory(good);
  assert.equal(syntheticExactCompiledFactory(fn),true);
  console.log("VOID_COMPILED_SAGA_LOADER_INERT_FIXTURE_SELF_TEST_GREEN");
  console.log("exact_compiled_importer_shape_bound=true");
  console.log("noncanonical_constructor_and_targets_rejected=true");
  console.log("missing_inert_tool_rejected=true");
  console.log("substituted_inert_tool_changes_resolution=true");
  console.log("real_saga_module_imported=false");
  console.log("production_source_finality_authority_ready=false");
}else if(args.length===1 && args[0]==="--derive"){
  process.stdout.write(JSON.stringify(derive(),null,2)+"\n");
}else{
  throw Error("compiled_saga_loader_inert_test_only_no_production_authority");
}
