#!/usr/bin/env node
// Source-only, UNACCEPTED successor evidence for the eight-file Nimo witness.
// The immutable original V1 manifest and installation remain untouched.
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { isBuiltin } from "node:module";
import ts from "typescript";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CURRENT_SOURCE_HEAD = "884edc6e82bd505a83e51a44b38f7e318431f314";
const HISTORICAL_SOURCE_HEAD = "e390424c1d31cd87dcf3551cc0d2d610a24e12f8";
const HISTORICAL_V1_MANIFEST_ID =
  "voidwfb1_2a729229f63c10a1562050924ddc279d8255a35603542967431a584977f1f6b7";
const HISTORICAL_V1_MANIFEST_SHA256 =
  "sha256:2190e7ab944436200b03e46285fa5ba4cda1b90d915cfda05b320d1b1dc7ebe2";
const HISTORICAL_V1_CONTRACT_BLOB = "d0f80d3b50e3dcc46c1f58dc4bd0a73b7875db56";
const MAX_FILE_BYTES = 16 * 1024 * 1024;
const INPUTS = Object.freeze([
 ["package.json","f28c3e9446c7623ef203da36a9642d046e5f34ee"],
 ["package-lock.json","b2671f0149f522b2489247016df0a5ec4bb72b8b"],
 ["tsconfig.json","c970faf406a0fa95638ce0b1ac0c63f8d8e96120"],
 ["tsconfig.build.json","d43e7f3fa03d20159f7b92aca4c8a56e738cd2fb"],
 ["scripts/copy_void_runtime_js_v1.mjs","d1c4b3735ca2d3a9aa392ec1173cf7b123e0f9d9"],
 ["scripts/retire_saveblock_periodic_rewriters_v1.mjs","3786dbc03de4be29b6e42059e46dbe1b95d8aa04"],
 ["Dockerfile","2acd9bcf0416eeb0f9fd72c1a556696863ff1607"],
]);
const FILES = Object.freeze([
 ["tools/void-buy-allocation-custody-witness-forced-command-v2.mjs",
  "tools/void-buy-allocation-custody-witness-forced-command-v2.mjs",
  "/usr/local/libexec/void/void-buy-allocation-custody-witness-forced-command-v2.mjs",
  "742cf489d8a785aa155a0e1bd12b65e94e07d1f1",
  "742cf489d8a785aa155a0e1bd12b65e94e07d1f1"],
 ["src/economic/buy_void_allocation_custody_external_witness_v1.ts",
  "dist/economic/buy_void_allocation_custody_external_witness_v1.js",
  "/usr/local/libexec/dist/economic/buy_void_allocation_custody_external_witness_v1.js",
  "5d24f3fb3e94611c653a0e3e1319afa7d0f4db72",
  "5d24f3fb3e94611c653a0e3e1319afa7d0f4db72"],
 ["src/economic/buy_void_allocation_custody_witness_transport_v1.ts",
  "dist/economic/buy_void_allocation_custody_witness_transport_v1.js",
  "/usr/local/libexec/dist/economic/buy_void_allocation_custody_witness_transport_v1.js",
  "a5163272f08d6d96a9c2387fa6db344018e09694",
  "a5163272f08d6d96a9c2387fa6db344018e09694"],
 ["src/economic/buy_void_allocation_reservation_high_water_v1.ts",
  "dist/economic/buy_void_allocation_reservation_high_water_v1.js",
  "/usr/local/libexec/dist/economic/buy_void_allocation_reservation_high_water_v1.js",
  "9383c94cf848efb9a0112f1b741df4e10f790ac6",
  "9383c94cf848efb9a0112f1b741df4e10f790ac6"],
 ["src/economic/buy_void_allocation_reservation_ledger_v1.ts",
  "dist/economic/buy_void_allocation_reservation_ledger_v1.js",
  "/usr/local/libexec/dist/economic/buy_void_allocation_reservation_ledger_v1.js",
  "c3fc204710a9189723651cfeb6ffc52b1aa049db",
  "c3fc204710a9189723651cfeb6ffc52b1aa049db"],
 ["src/economic/buy_void_auto_fulfillment_v1.ts",
  "dist/economic/buy_void_auto_fulfillment_v1.js",
  "/usr/local/libexec/dist/economic/buy_void_auto_fulfillment_v1.js",
  "1ac1ad6213be83f1aa8261a554caa91544fe5e09",
  "b7c963b1d55f000d82ad82289b31107b432503de"],
 ["src/economic/buy_void_crash_consistent_saga_server_policy_v1.ts",
  "dist/economic/buy_void_crash_consistent_saga_server_policy_v1.js",
  "/usr/local/libexec/dist/economic/buy_void_crash_consistent_saga_server_policy_v1.js",
  "e284a38a4b7f3d498b07e77c661d6eef3b742e7a",
  "e284a38a4b7f3d498b07e77c661d6eef3b742e7a"],
 ["src/economic/buy_void_filesystem_bakery_lock_v1.ts",
  "dist/economic/buy_void_filesystem_bakery_lock_v1.js",
  "/usr/local/libexec/dist/economic/buy_void_filesystem_bakery_lock_v1.js",
  "03376ad9853c1ca37c5be4d7f36d9daccab25078",
  "03376ad9853c1ca37c5be4d7f36d9daccab25078"],
]);
const ENTRY = FILES[0][1];
const digest = bytes => crypto.createHash("sha256").update(bytes).digest("hex");
const gitBlob = bytes => crypto.createHash("sha1")
  .update(Buffer.from("blob "+bytes.length+"\0","utf8")).update(bytes).digest("hex");
function canonical(value) {
 if(value === null)return "null";
 if(typeof value==="boolean"||typeof value==="string")return JSON.stringify(value);
 if(typeof value==="number"){assert.ok(Number.isSafeInteger(value));return String(value);}
 if(Array.isArray(value))return "["+value.map(canonical).join(",")+"]";
 assert.ok(value&&typeof value==="object");
 return "{"+Object.keys(value).sort().map(k=>JSON.stringify(k)+":"+canonical(value[k])).join(",")+"}";
}
function sameDirectory(a,b) {
 return a.dev===b.dev&&a.ino===b.ino&&a.mode===b.mode&&a.uid===b.uid&&a.gid===b.gid;
}
function sameFile(a,b) {
 return sameDirectory(a,b)&&a.nlink===b.nlink&&a.size===b.size&&
   a.mtimeNs===b.mtimeNs&&a.ctimeNs===b.ctimeNs;
}
function readPinned(relative,max=MAX_FILE_BYTES) {
 assert.match(relative,/^[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)*$/u);
 assert.ok(relative.split("/").every(x=>x!=="."&&x!==".."));
 assert.ok(Number.isSafeInteger(max)&&max>=1&&max<=MAX_FILE_BYTES);
 assert.equal(process.platform,"linux");
 const nofollow=fs.constants.O_NOFOLLOW, directory=fs.constants.O_DIRECTORY;
 assert.ok(Number.isInteger(nofollow)&&nofollow>0&&Number.isInteger(directory));
 const flags=fs.constants.O_RDONLY|nofollow|directory;
 const parts=path.join(ROOT,relative).split("/").filter(Boolean);
 const directories=[],rootFD=fs.openSync("/",flags);
 directories.push({fd:rootFD,visible:"/",stat:fs.fstatSync(rootFD,{bigint:true})});
 let fileFd;
 try {
   let absolute="/";
   for(const part of parts.slice(0,-1)){
     absolute=path.join(absolute,part);
     const visible=fs.lstatSync(absolute,{bigint:true});
     assert.ok(visible.isDirectory()&&!visible.isSymbolicLink());
     const fd=fs.openSync("/proc/self/fd/"+directories.at(-1).fd+"/"+part,flags);
     const st=fs.fstatSync(fd,{bigint:true});
     directories.push({fd,visible:absolute,stat:st});
     assert.ok(sameDirectory(visible,st),"directory fd/path mismatch");
   }
   const leafName=parts.at(-1),leafPath=path.join(absolute,leafName);
   const visible=fs.lstatSync(leafPath,{bigint:true});
   assert.ok(visible.isFile()&&!visible.isSymbolicLink()&&
     visible.nlink===1n&&visible.size>0n&&visible.size<=BigInt(max));
   fileFd=fs.openSync("/proc/self/fd/"+directories.at(-1).fd+"/"+leafName,
     fs.constants.O_RDONLY|nofollow);
   const stat=fs.fstatSync(fileFd,{bigint:true});
   assert.ok(sameFile(visible,stat)&&stat.isFile(),"file fd/path mismatch");
   const bytes=Buffer.alloc(Number(stat.size)+1);let total=0;
   while(total<bytes.length){const n=fs.readSync(fileFd,bytes,total,bytes.length-total,total);if(n===0)break;total+=n;}
   assert.equal(total,Number(stat.size),"concurrent grow/truncate");
   assert.ok(sameFile(stat,fs.fstatSync(fileFd,{bigint:true})));
   const seenAgain=fs.lstatSync(leafPath,{bigint:true});
   assert.ok(seenAgain.isFile()&&!seenAgain.isSymbolicLink()&&sameFile(stat,seenAgain),"leaf rebinding");
   for(const d of directories){
     const now=fs.lstatSync(d.visible,{bigint:true});
     assert.ok(now.isDirectory()&&!now.isSymbolicLink()&&
       sameDirectory(d.stat,now)&&sameDirectory(d.stat,fs.fstatSync(d.fd,{bigint:true})),
       "ancestor rebinding");
   }
   return bytes.subarray(0,total);
 } finally {
   if(fileFd!==undefined)fs.closeSync(fileFd);
   for(const d of directories.reverse())fs.closeSync(d.fd);
 }
}
function record(file) {
 const bytes=readPinned(file);
 return {path:file,bytes:bytes.length,sha256:digest(bytes),git_blob_sha1:gitBlob(bytes)};
}
const expectedRuntimePaths=new Set(FILES.map(x=>x[1]));
function staticImports(file,bytes) {
 const ast=ts.createSourceFile(file,bytes.toString("utf8"),ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
 assert.equal(ast.parseDiagnostics.length,0,"invalid JS:"+file);
 const edges=[],externals=[];
 function collect(node) {
   assert.ok(node&&ts.isStringLiteral(node),"nonliteral runtime import:"+file);
   const spec=node.text;
   if(spec.startsWith(".")){
     const to=path.posix.normalize(path.posix.join(path.posix.dirname(file),spec));
     assert.ok(expectedRuntimePaths.has(to),"unreviewed runtime dependency:"+file+" -> "+spec);
     edges.push({from:file,specifier:spec,to});
   } else {
     assert.ok(isBuiltin(spec)&&spec.startsWith("node:"),"unreviewed external:"+file+" -> "+spec);
     externals.push(spec);
   }
 }
 function visit(node) {
   if((ts.isImportDeclaration(node)||ts.isExportDeclaration(node))&&node.moduleSpecifier)
     collect(node.moduleSpecifier);
   if(ts.isCallExpression(node)) {
     assert.notEqual(node.expression.kind,ts.SyntaxKind.ImportKeyword,"dynamic import:"+file);
     if(ts.isIdentifier(node.expression))assert.ok(
       !["require","eval","createRequire"].includes(node.expression.text),"runtime alternative loader:"+file);
   }
   if(ts.isNewExpression(node))assert.ok(
     !ts.isIdentifier(node.expression)||node.expression.text!=="Function","runtime generated loader:"+file);
   ts.forEachChild(node,visit);
 }
 visit(ast);
 return {edges,externals:[...new Set(externals)].sort()};
}
function derive() {
 assert.ok([22,24,26].includes(Number(process.versions.node.split(".")[0])));
 assert.equal(ts.version,"5.9.3");
 execFileSync("git",["merge-base","--is-ancestor",CURRENT_SOURCE_HEAD,"HEAD"],{cwd:ROOT,stdio:"ignore"});
 execFileSync("git",["diff","--quiet",CURRENT_SOURCE_HEAD,"HEAD","--",
   ...FILES.map(x=>x[0]),...INPUTS.map(x=>x[0]),
   "src/economic/buy_void_allocation_custody_witness_runtime_bundle_qualification_v1.ts"
 ],{cwd:ROOT,stdio:"ignore"});
 const original=record("src/economic/buy_void_allocation_custody_witness_runtime_bundle_qualification_v1.ts");
 assert.equal(original.git_blob_sha1,HISTORICAL_V1_CONTRACT_BLOB);
 const sourceFiles=FILES.map(x=>{
   const actual=record(x[0]);
   assert.equal(actual.git_blob_sha1,x[4],"reviewed source drift:"+x[0]);
   return {...actual,historical_v1_source_git_blob_sha1:x[3],
      unchanged_since_historical_v1:x[3]===x[4]};
 });
 assert.equal(sourceFiles.filter(x=>!x.unchanged_since_historical_v1).length,1);
 assert.equal(sourceFiles.find(x=>!x.unchanged_since_historical_v1)?.path,
   "src/economic/buy_void_auto_fulfillment_v1.ts");
 const runtimeFiles=FILES.map(x=>{
   const artifact=record(x[1]);return {path:artifact.path,
     installed_path:x[2],bytes:artifact.bytes,sha256:artifact.sha256};
 });
 const seen=new Set(),queue=[ENTRY],edges=[],external=[];
 while(queue.length){
   const file=queue.pop();if(seen.has(file))continue;
   seen.add(file);
   const detail=staticImports(file,readPinned(file));
   edges.push(...detail.edges);
   external.push(...detail.externals.map(specifier=>({from:file,specifier})));
   queue.push(...detail.edges.map(e=>e.to));
 }
 assert.deepEqual([...seen].sort(),[...expectedRuntimePaths].sort(),
   "full eight-file runtime closure changed");
 assert.equal(edges.length,11,"old closed runtime edge count changed");
 const prior=Object.freeze({
   source_commit:HISTORICAL_SOURCE_HEAD,
   manifest_id:HISTORICAL_V1_MANIFEST_ID,
   manifest_sha256:HISTORICAL_V1_MANIFEST_SHA256,
   contract_git_blob_sha1:HISTORICAL_V1_CONTRACT_BLOB
 });
 const body={
   schema:"void_buy_void_witness_runtime_bundle_v2_candidate",
   version:2,repository:"6ZoSo9/void-node",
   exact_source_generation_commit:CURRENT_SOURCE_HEAD,
   historical_predecessor:prior,
   source_file_count:sourceFiles.length,
   unchanged_historical_source_count:7,changed_source_count:1,
   source_files:sourceFiles,
   runtime_file_count:runtimeFiles.length,
   runtime_files:runtimeFiles,
   runtime_edge_count:edges.length,
   relative_runtime_edges:edges.sort((a,b)=>canonical(a).localeCompare(canonical(b))),
   external_builtin_imports:external.sort((a,b)=>canonical(a).localeCompare(canonical(b))),
   build_inputs:INPUTS.map(([file,sha])=>{
     const actual=record(file);
     assert.equal(actual.git_blob_sha1,sha,"build input drift:"+file);
     return actual;
   }),
   compiler:{
     typescript_version:ts.version,
     typescript_library:record("node_modules/typescript/lib/typescript.js"),
     tsc_entry:record("node_modules/typescript/lib/_tsc.js")
   },
   runtime_bundle_identity_accepted:false,
   historical_v1_qualified_for_current_source:false,
   deployed_bundle_verified:false,
   installed_nimo_witness_verified:false,
   external_transport_authenticated:false,
   production_payment_authority_ready:false,
   production_allocation_mutation_ready:false,
   presale_activation:false,
   funds_movement:false
 };
 return {...body,candidate_manifest_id:"voidwfb2_"+digest(Buffer.from(canonical(body),"utf8"))};
}
function selfTest() {
 let p=ENTRY;
 const check=(text)=>staticImports(p,Buffer.from(text,"utf8"));
 const okay=check('import "../dist/economic/buy_void_allocation_custody_witness_transport_v1.js";\n');
 assert.equal(okay.edges.length,1);
 for(const sample of [
   'import(process.env.UNTRUSTED);',
   'require("node:child_process");',
   'const F=new Function("return 3");',
   'import "../../outside.js";',
   'import "custom-package";'
 ])assert.throws(()=>check(sample),undefined,sample);
 assert.equal(HISTORICAL_V1_MANIFEST_ID.startsWith("voidwfb1_"),true);
 console.log("VOID_WITNESS_BUNDLE_V2_CANDIDATE_CLOSURE_SELFTEST_GREEN");
 console.log("historical_v1_manifest_changed=false");
 console.log("runtime_bundle_identity_accepted=false");
 console.log("deployed_bundle_verified=false");
 console.log("presale_activation=false");
}
const args=process.argv.slice(2);
if(args.length===1&&args[0]==="--self-test")selfTest();
else if(args.length===1&&args[0]==="--derive")
  process.stdout.write(JSON.stringify(derive(),null,2)+"\n");
else throw Error("witness_v2_candidate_derive_only_no_production_authority");
