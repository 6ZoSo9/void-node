#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";

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
const SAGA_SHA="e94b2c5c2da0a4849acab936d0d7f8710f2d2229909d73bc679a83c63f777e01";
const DOCKER_BLOB="2acd9bcf0416eeb0f9fd72c1a556696863ff1607";
const PACKAGE_BLOB="f28c3e9446c7623ef203da36a9642d046e5f34ee";
const LOCK_BLOB="b2671f0149f522b2489247016df0a5ec4bb72b8b";
const BUILD_BLOB="d43e7f3fa03d20159f7b92aca4c8a56e738cd2fb";
const DESCRIPTOR_BLOB="1458d72e7f6315dc06fb09fe55dc0e6591f9ee94";
const GIT_HELPER_BLOB="2df64e31debd4884f2d859d55a87e4ef15925d3d";
const INIT_PROOF_BLOB="893c6f9c96d877f5ea4a250afe4d625f3a749233";
const INERT_PROOF_BLOB="62476d1d22d6b32ff14e7327ecaaa0f858033faa";
const PACKAGE_PROOF_BLOB="c0f78db4b3a04db9f494e679a0aa8e19c56d67a0";
const TOOL_SPEC="../../tools/buy-void-crash-consistent-fulfillment-saga-v1.mjs";
const IMPORTS=["node:crypto","node:fs","node:path"];
const EXPORTS=["ACTION_CONFIRMATIONS","ADVANCE_CONFIRMATION","AUTHORITY","EVENT_ID_PREFIX",
"EVENT_SCHEMA","EVENT_TYPES","LEASE_SCHEMA","MARKER","SAGA_ID_PREFIX","SCHEMA",
"assertNoSecretMaterialV1","buildNextEventFromActionResultV1","buildSagaEventV1",
"buildSagaRecordV1","canonicalJsonV1","computeBroadcastIntentIdV1","computeSagaIdV1",
"createFilesystemSagaStoreV1","deriveSagaNextActionV1","foldSagaEventsV1",
"runSagaSupervisorTickV1","validateSagaBindingV1","validateSagaEventV1",
"validateSagaRecordV1"].sort();

const sha=b=>crypto.createHash("sha256").update(b).digest("hex");
const blob=b=>crypto.createHash("sha1")
 .update(Buffer.from("blob "+b.length+"\0","utf8")).update(b).digest("hex");

async function loadReviewedHelpers(){
  const specs=[
    ["scripts/prove_buy_void_enforcement_descriptor_relative_linux_v1.mjs",DESCRIPTOR_BLOB,
      "readDescriptorRelativeLinuxV1"],
    ["scripts/prove_buy_void_reviewed_git_invocation_v1.mjs",GIT_HELPER_BLOB,
      "runReviewedGitV1"],
  ];
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"void-reviewed-saga-helpers-"));
  try{
    const modules={};
    for(const [relative,expectedBlob,exportName] of specs){
      const bytes=fs.readFileSync(path.join(ROOT,relative));
      assert.equal(blob(bytes),expectedBlob,"reviewed helper blob drift: "+relative);
      const staged=path.join(tmp,path.basename(relative));
      fs.writeFileSync(staged,bytes,{mode:0o400,flag:"wx"});
      const module=await import(pathToFileURL(staged).href);
      assert.equal(typeof module[exportName],"function","reviewed helper export missing: "+exportName);
      modules[exportName]=module[exportName];
    }
    return Object.freeze(modules);
  }finally{
    fs.rmSync(tmp,{recursive:true,force:true});
  }
}
const {
  readDescriptorRelativeLinuxV1,
  runReviewedGitV1,
}=await loadReviewedHelpers();

function exact(relative,expected,max=16*1024*1024){
 const bytes=readDescriptorRelativeLinuxV1(ROOT,relative,max);
 assert.equal(blob(bytes),expected,"blob drift: "+relative);
 return bytes;
}
function boundary(){
 assert.equal(process.platform,"linux");
 assert.ok([22,24,26].includes(Number(process.versions.node.split(".")[0])));
 for(const [p,b,m] of [
  [SOURCE,SOURCE_BLOB,256*1024],[SAGA,SAGA_BLOB,128*1024],
  ["Dockerfile",DOCKER_BLOB,128*1024],["package.json",PACKAGE_BLOB,128*1024],
  ["package-lock.json",LOCK_BLOB,1024*1024],["tsconfig.build.json",BUILD_BLOB,128*1024],
  ["scripts/prove_buy_void_enforcement_descriptor_relative_linux_v1.mjs",DESCRIPTOR_BLOB,128*1024],
  ["scripts/prove_buy_void_reviewed_git_invocation_v1.mjs",GIT_HELPER_BLOB,128*1024],
  ["scripts/prove_buy_void_composed_saga_import_initialization_v1.mjs",INIT_PROOF_BLOB,256*1024],
  ["scripts/prove_buy_void_compiled_saga_loader_inert_resolution_v1.mjs",INERT_PROOF_BLOB,256*1024],
  ["scripts/prove_buy_void_composed_stopped_saga_package_v1.mjs",PACKAGE_PROOF_BLOB,256*1024],
 ]) exact(p,b,m);
 runReviewedGitV1(["merge-base","--is-ancestor",PARENT,"HEAD"],ROOT);
 runReviewedGitV1(["diff","--quiet","--no-ext-diff","--no-textconv",PARENT,"HEAD","--",
  SOURCE,SAGA,"Dockerfile","package.json","package-lock.json","tsconfig.build.json",
  "scripts/prove_buy_void_enforcement_descriptor_relative_linux_v1.mjs",
  "scripts/prove_buy_void_reviewed_git_invocation_v1.mjs"],ROOT);
}
function factory(compiled){
 const ast=ts.createSourceFile(COMPILED,compiled.toString("utf8"),
  ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
 assert.equal(ast.parseDiagnostics.length,0);
 const found=ast.statements.filter(n=>ts.isFunctionDeclaration(n)&&n.name?.text==="defaultSagaModule");
 assert.equal(found.length,1);
 const fn=found[0];
 assert.ok(fn.modifiers?.some(m=>m.kind===ts.SyntaxKind.AsyncKeyword));
 assert.equal(fn.parameters.length,0);
 assert.equal(fn.body?.statements.length,2);
 const [first,second]=fn.body.statements;
 assert.ok(ts.isVariableStatement(first)&&first.declarationList.declarations.length===1);
 const d=first.declarationList.declarations[0];
 assert.ok(ts.isIdentifier(d.name)&&d.name.text==="dynamicImport"&&d.initializer&&
  ts.isNewExpression(d.initializer)&&ts.isIdentifier(d.initializer.expression)&&
  d.initializer.expression.text==="Function");
 const a=d.initializer.arguments||[];
 assert.equal(a.length,2); assert.ok(a.every(ts.isStringLiteral));
 assert.deepEqual(a.map(x=>x.text),["specifier","return import(specifier)"]);
 assert.ok(ts.isReturnStatement(second)&&second.expression&&ts.isCallExpression(second.expression)&&
  ts.isIdentifier(second.expression.expression)&&second.expression.expression.text==="dynamicImport"&&
  second.expression.arguments.length===1&&ts.isStringLiteral(second.expression.arguments[0])&&
  second.expression.arguments[0].text===TOOL_SPEC);
 return fn.getText(ast);
}
function sagaImports(saga){
 const ast=ts.createSourceFile(SAGA,saga.toString("utf8"),
  ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
 assert.equal(ast.parseDiagnostics.length,0);
 const got=ast.statements.filter(ts.isImportDeclaration).map(n=>{
  assert.ok(ts.isStringLiteral(n.moduleSpecifier)); return n.moduleSpecifier.text;
 });
 assert.deepEqual(got,IMPORTS); assert.ok(got.every(x=>x.startsWith("node:")));
 return got;
}
function staged(root,relative,n,digest){
 const p=path.join(root,relative),st=fs.lstatSync(p);
 assert.ok(st.isFile()&&!st.isSymbolicLink()&&st.nlink===1);
 assert.equal(st.size,n);
 const b=fs.readFileSync(p); assert.equal(sha(b),digest); return b;
}
function snap(root){
 const rows=[]; const walk=(d,r="")=>{
  for(const name of fs.readdirSync(d).sort()){
   const p=path.join(d,name),q=r?r+"/"+name:name,st=fs.lstatSync(p);
   assert.equal(st.isSymbolicLink(),false);
   if(st.isDirectory())walk(p,q);
   else if(st.isFile())rows.push({path:q,bytes:st.size,sha256:sha(fs.readFileSync(p))});
   else assert.fail("nonregular fixture");
  }
 }; walk(root); return rows;
}
function execute(compiled,saga){
 const imports=sagaImports(saga),fn=factory(compiled);
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"void-real-saga-loader-"));
 try{
  const dist=path.join(tmp,"dist","economic"),tools=path.join(tmp,"tools");
  fs.mkdirSync(dist,{recursive:true,mode:0o700}); fs.mkdirSync(tools,{recursive:true,mode:0o700});
  const sagaPath=path.join(tools,path.basename(SAGA)),entry=path.join(dist,"factory.mjs");
  fs.writeFileSync(sagaPath,saga,{mode:0o400});
  fs.writeFileSync(entry,[fn,
   "const m=await defaultSagaModule();",
   "console.log(JSON.stringify({marker:m.MARKER,schema:m.SCHEMA,exports:Object.keys(m).sort(),authority:m.AUTHORITY}));",
   ""].join("\n"),{mode:0o400});
  const before=snap(tmp);
  const child=spawnSync(process.execPath,["--permission","--allow-fs-read="+tmp,entry],{
   cwd:tmp,encoding:"utf8",stdio:["ignore","pipe","pipe"],timeout:20000,
   env:{HOME:"/nonexistent",PATH:"/usr/bin:/bin",LANG:"C",LC_ALL:"C",TZ:"UTC"}});
  assert.equal(child.signal,null); assert.equal(child.status,0,String(child.stderr||"").slice(0,1000));
  const out=String(child.stdout||"").trim().split("\n").filter(Boolean); assert.equal(out.length,1);
  const m=JSON.parse(out[0]);
  assert.equal(m.marker,"VOID_BUY_VOID_CRASH_CONSISTENT_FULFILLMENT_SAGA_V1");
  assert.equal(m.schema,"void_buy_void_crash_consistent_fulfillment_saga_v1");
  assert.deepEqual(m.exports,EXPORTS);
  for(const k of ["startup_execution","network_request","credential_access","wallet_access",
   "signing","transaction_broadcast","money_movement"]) assert.equal(m.authority[k],false,k);
  assert.deepEqual(snap(tmp),before);
  return {generated_import_specifier:TOOL_SPEC,saga_static_imports:imports,
   saga_static_dependencies_builtin_only:true,permission_fenced_filesystem_read:true,
   permission_fenced_filesystem_write:false,fixture_tree_unchanged_after_import:true,
   real_saga_module_imported:true,real_saga_module_initialized:true,real_saga_exports_invoked:false,
   saga_declared_network_request_authority:false,saga_declared_credential_access:false,
   saga_declared_wallet_access:false,saga_declared_signing:false,
   saga_declared_transaction_broadcast:false,saga_declared_money_movement:false,
   saga_dynamic_tool_initialization_closure_verified:true};
 }finally{
  fs.chmodSync(tmp,0o700);
  for(const q of ["dist/economic/factory.mjs","tools/"+path.basename(SAGA)]){
   const p=path.join(tmp,q); if(fs.existsSync(p))fs.chmodSync(p,0o600);
  }
  fs.rmSync(tmp,{recursive:true,force:true});
 }
}
function qualify(compiled,saga,stoppedImage){
 assert.equal(compiled.length,COMPILED_BYTES); assert.equal(sha(compiled),COMPILED_SHA);
 assert.equal(saga.length,SAGA_BYTES); assert.equal(sha(saga),SAGA_SHA);
 return Object.freeze({schema:"void_buy_void_stopped_real_saga_loader_v1",
  marker:"VOID_BUY_VOID_STOPPED_REAL_SAGA_LOADER_V1",version:1,exact_source_parent:PARENT,
  source_importer_git_blob_sha1:SOURCE_BLOB,compiled_importer_path:COMPILED,
  compiled_importer_bytes:COMPILED_BYTES,compiled_importer_sha256:COMPILED_SHA,
  saga_source_path:SAGA,saga_source_git_blob_sha1:SAGA_BLOB,saga_source_bytes:SAGA_BYTES,
  saga_source_sha256:SAGA_SHA,dockerfile_git_blob_sha1:DOCKER_BLOB,
  stopped_image_extracted_bytes:stoppedImage===true,stopped_image_container_started:false,
  ...execute(compiled,saga),
  stopped_image_extracted_real_saga_loader_qualified:stoppedImage===true,
  executed_saga_loader_qualified:true,dynamic_tool_transitive_closure_verified_for_saga_edge:true,
  complete_executable_closure_verified:false,accepted_enforcement_generation:false,
  packaged_image_generation_accepted:false,deployed_artifact_generation_verified:false,
  runtime_mount_authority:false,production_source_finality_authority_ready:false,
  presale_activation:false,funds_movement:false});
}
function workspace(){boundary();return qualify(
 readDescriptorRelativeLinuxV1(ROOT,COMPILED,2*1024*1024),exact(SAGA,SAGA_BLOB,128*1024),false);}
function stopped(root){boundary();return qualify(staged(root,COMPILED,COMPILED_BYTES,COMPILED_SHA),
 staged(root,SAGA,SAGA_BYTES,SAGA_SHA),true);}
function selfTest(){
 boundary(); const compiled=readDescriptorRelativeLinuxV1(ROOT,COMPILED,2*1024*1024);
 const saga=exact(SAGA,SAGA_BLOB,128*1024); assert.doesNotThrow(()=>qualify(compiled,saga,false));
 const bad=Buffer.from(saga);bad[100]^=1;assert.notEqual(sha(bad),SAGA_SHA);
 assert.throws(()=>factory(Buffer.from("export function defaultSagaModule(){}\n")));
 console.log("VOID_BUY_VOID_STOPPED_REAL_SAGA_LOADER_V1_SELF_TEST_GREEN");
 console.log("real_saga_exports_invoked=false");
 console.log("production_source_finality_authority_ready=false");
 console.log("funds_movement=false");
}
const args=process.argv.slice(2);
if(args.length===1&&args[0]==="--self-test")selfTest();
else if(args.length===1&&args[0]==="--workspace")process.stdout.write(JSON.stringify(workspace(),null,2)+"\n");
else if(args.length===2&&args[0]==="--stopped-root")
 process.stdout.write(JSON.stringify(stopped(path.resolve(args[1])),null,2)+"\n");
else throw Error("stopped_real_saga_loader_proof_only_no_production_authority");
