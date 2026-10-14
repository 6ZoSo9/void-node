#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const MARKER="VOID_BUY_VOID_DELIVERY_DEPENDENCY_PROVIDER_CLOSURE_V1";
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const SOURCE_PARENT="35ff3f8ec453f8104b59967580a84347d6bc1d23";
const ENTRY="dist/economic/buy_void_erc20_delivery_dependency_injection_v1.js";
const SERVER_RUNTIME="dist/economic/buy_void_runtime_integration_v1.js";
const DELIVERY_CONSUMER="dist/economic/buy_void_delivery_runtime_integration_v1.js";
const GLOBAL_KEY="__void_buy_void_delivery_runtime_dependencies_v1";
const PACKAGE_BLOB="14fbdf5717b07fd4c734f5da7a8e84ed59bee93f";
const LOCK_BLOB="15b5c82ea36f13079a2f9e8863722f654eb3f201";
const MAX_FILE_BYTES=16*1024*1024;
const MAX_MODULES=128;
const REQUIRED_ARTIFACTS=Object.freeze([
  ENTRY,
  "dist/economic/buy_void_erc20_delivery_dependency_bootstrap_v1.js",
  "dist/economic/buy_void_native_fulfillment_wallet_credential_signer_v1.js",
  "dist/economic/buy_void_erc20_chain2050_broadcaster_v1.js",
  "dist/economic/buy_void_delivery_submission_guard_v1.js",
  "dist/economic/buy_void_delivery_sign_broadcast_adapter_v1.js",
]);
const FORBIDDEN_IDENTIFIERS=new Set(["require","createRequire","eval","Function"]);
const FORBIDDEN_PROPERTIES=new Set(["getBuiltinModule","_load"]);
const ALLOWED_PACKAGES=new Set(["ethers"]);

function sha256(bytes){
  return crypto.createHash("sha256").update(bytes).digest("hex");
}
function gitBlob(bytes){
  return crypto.createHash("sha1")
    .update(Buffer.from("blob "+bytes.length+"\0","utf8"))
    .update(bytes).digest("hex");
}
function canonical(value){
  if(value===null)return "null";
  if(typeof value==="string"||typeof value==="boolean")return JSON.stringify(value);
  if(typeof value==="number"){
    assert.ok(Number.isSafeInteger(value),"noncanonical number");
    return String(value);
  }
  if(Array.isArray(value))return "["+value.map(canonical).join(",")+"]";
  assert.ok(value&&typeof value==="object","noncanonical value");
  return "{"+Object.keys(value).sort().map(
    key=>JSON.stringify(key)+":"+canonical(value[key]),
  ).join(",")+"}";
}
function sameFileIdentity(a,b){
  return a.dev===b.dev&&a.ino===b.ino&&a.uid===b.uid&&a.gid===b.gid&&
    a.mode===b.mode&&a.nlink===b.nlink&&a.size===b.size;
}
function readExact(relative,maxBytes=MAX_FILE_BYTES){
  assert.match(relative,/^[A-Za-z0-9_./-]+$/u,"relative path invalid");
  assert.equal(path.isAbsolute(relative),false,"absolute path forbidden");
  const normalized=path.posix.normalize(relative);
  assert.equal(normalized,relative,"noncanonical relative path");
  assert.equal(relative.startsWith("../"),false,"path escape forbidden");
  const full=path.join(ROOT,...relative.split("/"));
  const before=fs.lstatSync(full,{bigint:true});
  assert.ok(
    before.isFile()&&!before.isSymbolicLink()&&before.nlink===1n&&
    before.size>0n&&before.size<=BigInt(maxBytes),
    "file metadata invalid: "+relative,
  );
  const fd=fs.openSync(
    full,
    fs.constants.O_RDONLY|Number(fs.constants.O_NOFOLLOW||0),
  );
  try{
    const opened=fs.fstatSync(fd,{bigint:true});
    assert.equal(sameFileIdentity(before,opened),true,"file open identity drift: "+relative);
    const bytes=fs.readFileSync(fd);
    const after=fs.fstatSync(fd,{bigint:true});
    const visible=fs.lstatSync(full,{bigint:true});
    assert.equal(sameFileIdentity(opened,after),true,"file changed during read: "+relative);
    assert.equal(sameFileIdentity(after,visible),true,"visible file changed during read: "+relative);
    assert.equal(BigInt(bytes.length),after.size,"short file read: "+relative);
    return bytes;
  }finally{
    fs.closeSync(fd);
  }
}
function git(args){
  const result=spawnSync(
    "/usr/bin/git",
    ["--no-replace-objects","-C",ROOT,...args],
    {
      encoding:"utf8",
      stdio:["ignore","pipe","pipe"],
      timeout:30_000,
      maxBuffer:8*1024*1024,
      env:{
        PATH:"/usr/bin:/bin",
        HOME:"/nonexistent",
        LANG:"C",
        LC_ALL:"C",
        GIT_CONFIG_NOSYSTEM:"1",
        GIT_CONFIG_GLOBAL:"/dev/null",
        GIT_CONFIG_SYSTEM:"/dev/null",
        GIT_NO_REPLACE_OBJECTS:"1",
        GIT_OPTIONAL_LOCKS:"0",
        GIT_TERMINAL_PROMPT:"0",
      },
    },
  );
  assert.equal(result.error,undefined,String(result.error||""));
  assert.equal(result.status,0,String(result.stderr||""));
  return String(result.stdout||"").trim();
}
function sourcePathForArtifact(artifact){
  assert.match(artifact,/^dist\/economic\/[a-z0-9_]+\.js$/u);
  return artifact.replace(/^dist\//u,"src/").replace(/\.js$/u,".ts");
}
function addModuleSpecifier(specifier,p,relatives,packages,builtins){
  assert.equal(typeof specifier,"string");
  if(specifier.startsWith(".")){
    assert.match(specifier,/^\.\/[a-z0-9_]+\.js$/u,"relative import escapes provider closure: "+p);
    relatives.add(path.posix.join(path.posix.dirname(p),specifier));
    return;
  }
  if(specifier.startsWith("node:")){
    builtins.add(specifier);
    return;
  }
  assert.equal(ALLOWED_PACKAGES.has(specifier),true,"unreviewed provider package: "+p+":"+specifier);
  packages.add(specifier);
}
function scanModule(p,bytes){
  const ast=ts.createSourceFile(
    p,
    bytes.toString("utf8"),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.JS,
  );
  assert.equal(ast.parseDiagnostics.length,0,"invalid compiled JS: "+p);
  const relatives=new Set();
  const packages=new Set();
  const builtins=new Set();
  function visit(node){
    if((ts.isImportDeclaration(node)||ts.isExportDeclaration(node))&&node.moduleSpecifier){
      assert.ok(ts.isStringLiteral(node.moduleSpecifier),"nonliteral static import: "+p);
      addModuleSpecifier(node.moduleSpecifier.text,p,relatives,packages,builtins);
    }
    if(ts.isCallExpression(node)&&node.expression.kind===ts.SyntaxKind.ImportKeyword){
      assert.fail("dynamic import forbidden in provider closure: "+p);
    }
    if(ts.isIdentifier(node)&&FORBIDDEN_IDENTIFIERS.has(node.text)){
      assert.fail("dynamic loader identifier forbidden in provider closure: "+p+":"+node.text);
    }
    if(ts.isPropertyAccessExpression(node)&&FORBIDDEN_PROPERTIES.has(node.name.text)){
      assert.fail("dynamic module property forbidden in provider closure: "+p+":"+node.name.text);
    }
    if(ts.isElementAccessExpression(node)&&ts.isStringLiteral(node.argumentExpression)&&
       FORBIDDEN_PROPERTIES.has(node.argumentExpression.text)){
      assert.fail("dynamic module element forbidden in provider closure: "+p+":"+node.argumentExpression.text);
    }
    ts.forEachChild(node,visit);
  }
  visit(ast);
  return Object.freeze({
    imports:[...relatives].sort(),
    packages:[...packages].sort(),
    builtins:[...builtins].sort(),
  });
}
function closedProviderArtifacts(){
  const pending=[ENTRY];
  const found=new Map();
  while(pending.length){
    const p=pending.pop();
    if(found.has(p))continue;
    assert.ok(found.size<MAX_MODULES,"provider closure exceeds bound");
    assert.match(p,/^dist\/economic\/[a-z0-9_]+\.js$/u,"provider closure path invalid");
    const bytes=readExact(p);
    const graph=scanModule(p,bytes);
    found.set(p,Object.freeze({
      path:p,
      bytes:bytes.length,
      sha256:sha256(bytes),
      git_blob_sha1:gitBlob(bytes),
      imports:graph.imports,
      packages:graph.packages,
      builtins:graph.builtins,
    }));
    pending.push(...graph.imports);
  }
  for(const required of REQUIRED_ARTIFACTS){
    assert.equal(found.has(required),true,"required provider artifact missing: "+required);
  }
  return [...found.values()].sort((a,b)=>a.path.localeCompare(b.path,"en"));
}
function providerBoundary(){
  assert.equal(process.platform,"linux","Linux required");
  assert.ok([22,24,26].includes(Number(process.versions.node.split(".")[0])),"Node major not reviewed");
  assert.equal(git(["merge-base","--is-ancestor",SOURCE_PARENT,"HEAD"]),"");
  assert.equal(gitBlob(readExact("package.json",256*1024)),PACKAGE_BLOB,"package generation drift");
  assert.equal(gitBlob(readExact("package-lock.json",4*1024*1024)),LOCK_BLOB,"lock generation drift");

  const artifacts=closedProviderArtifacts();
  const sourcePaths=[...new Set(artifacts.map(row=>sourcePathForArtifact(row.path)))].sort();
  const changed=spawnSync(
    "/usr/bin/git",
    ["--no-replace-objects","-C",ROOT,"diff","--quiet","--no-ext-diff","--no-textconv",
     SOURCE_PARENT,"HEAD","--",...sourcePaths,"package.json","package-lock.json","tsconfig.build.json"],
    {
      encoding:"utf8",
      stdio:["ignore","pipe","pipe"],
      timeout:30_000,
      env:{
        PATH:"/usr/bin:/bin",HOME:"/nonexistent",LANG:"C",LC_ALL:"C",
        GIT_CONFIG_NOSYSTEM:"1",GIT_CONFIG_GLOBAL:"/dev/null",GIT_CONFIG_SYSTEM:"/dev/null",
        GIT_NO_REPLACE_OBJECTS:"1",GIT_OPTIONAL_LOCKS:"0",GIT_TERMINAL_PROMPT:"0",
      },
    },
  );
  assert.equal(changed.error,undefined,String(changed.error||""));
  assert.equal(changed.status,0,String(changed.stderr||""));

  const serverBytes=readExact(SERVER_RUNTIME);
  const serverGraph=scanModule(SERVER_RUNTIME,serverBytes);
  assert.equal(serverGraph.imports.includes(ENTRY),true,"server runtime does not import provider");
  assert.equal(
    serverGraph.imports.includes(DELIVERY_CONSUMER),
    true,
    "server runtime does not import delivery consumer",
  );

  const providerText=readExact(ENTRY).toString("utf8");
  assert.match(
    providerText,
    /const GLOBAL_DEPENDENCIES\s*=\s*"__void_buy_void_delivery_runtime_dependencies_v1"/u,
    "provider global key drift",
  );
  assert.match(
    providerText,
    /globalState\[GLOBAL_DEPENDENCIES\]\s*=\s*decision\.dependencies/u,
    "provider global writer drift",
  );
  const consumerText=readExact(DELIVERY_CONSUMER).toString("utf8");
  assert.match(
    consumerText,
    /const GLOBAL_DEPENDENCIES\s*=\s*"__void_buy_void_delivery_runtime_dependencies_v1"/u,
    "consumer global key drift",
  );
  assert.match(
    consumerText,
    /globalThis\[GLOBAL_DEPENDENCIES\]/u,
    "consumer global reader drift",
  );

  const packageImports=[...new Set(artifacts.flatMap(row=>row.packages))].sort();
  const builtinImports=[...new Set(artifacts.flatMap(row=>row.builtins))].sort();
  assert.deepEqual(packageImports,["ethers"],"provider third-party package boundary changed");

  const material=Object.freeze({
    schema:"void_buy_void_delivery_dependency_provider_closure_v1",
    marker:MARKER,
    version:1,
    repository:"6ZoSo9/void-node",
    repository_head_sha:git(["rev-parse","HEAD"]),
    repository_tree_sha:git(["rev-parse","HEAD^{tree}"]),
    source_parent:SOURCE_PARENT,
    package_json_git_blob_sha1:PACKAGE_BLOB,
    package_lock_git_blob_sha1:LOCK_BLOB,
    entry_artifact:ENTRY,
    server_runtime_artifact:SERVER_RUNTIME,
    delivery_consumer_artifact:DELIVERY_CONSUMER,
    dependency_global_key:GLOBAL_KEY,
    server_runtime_imports_provider:true,
    server_runtime_imports_delivery_consumer:true,
    provider_global_writer_bound:true,
    consumer_global_reader_bound:true,
    provider_runtime_artifact_count:artifacts.length,
    provider_runtime_artifacts:artifacts,
    provider_source_paths:sourcePaths,
    provider_third_party_packages:packageImports,
    provider_node_builtin_imports:builtinImports,
    required_signer_artifact_present:true,
    required_broadcaster_artifact_present:true,
    required_submission_guard_artifact_present:true,
    required_sign_broadcast_adapter_artifact_present:true,
    provider_static_module_closure_verified:true,
    dynamic_module_loader_present:false,
    post_2865_dependency_generation:true,
    delivery_route_closure_composed:false,
    whole_enforcement_closure_verified:false,
    package_runtime_identity_accepted:false,
    candidate_enforcement_identity_accepted:false,
    deployed_artifact_generation_verified:false,
    runtime_mount_authority:false,
    credential_read_performed:false,
    signing_performed:false,
    rpc_call_performed:false,
    transaction_broadcast_performed:false,
    production_source_finality_authority_ready:false,
    presale_activation:false,
    funds_movement:false,
  });
  return Object.freeze({
    ...material,
    provider_closure_sha256:sha256(Buffer.from(canonical(material),"utf8")),
  });
}
function selfTest(){
  const good=scanModule(
    "dist/economic/example.js",
    Buffer.from('import x from "./child.js"; import { Wallet } from "ethers"; import fs from "node:fs";\n'),
  );
  assert.deepEqual(good.imports,["dist/economic/child.js"]);
  assert.deepEqual(good.packages,["ethers"]);
  assert.deepEqual(good.builtins,["node:fs"]);
  for(const bad of [
    'const x=require("./x.js");',
    'const f=eval; f("2+2");',
    'new Function("return 1")();',
    'await import("./child.js");',
    'process.getBuiltinModule("child_process");',
    'process["getBuiltinModule"]("child_process");',
    'import pg from "pg";',
  ]){
    assert.throws(()=>scanModule("dist/economic/example.js",Buffer.from(bad)),undefined,bad);
  }
  console.log(MARKER+"_SELF_TEST_GREEN");
}
const args=process.argv.slice(2);
if(args.length===1&&args[0]==="--self-test"){
  selfTest();
}else if(args.length===1&&args[0]==="--derive"){
  process.stdout.write(JSON.stringify(providerBoundary(),null,2)+"\n");
}else{
  throw new Error("provider_closure_candidate_only_no_production_authority");
}
