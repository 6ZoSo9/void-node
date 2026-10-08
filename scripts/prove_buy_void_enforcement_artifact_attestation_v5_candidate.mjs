#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE_HEAD = "320ab95af3998a9dcfddd44d62c394c19ba7ea2c";
const SOURCE_PREFLIGHT_GIT_BLOB = "b61615c8b928a95c33100878ca70aa147abad103";
const SOURCE_V6_GIT_BLOB = "d642723385136e9f0382bd77efdb34948221f380";
const SOURCE_V2_GIT_BLOB = "32133e441ccb02bb4786d29e36932fb31399ec87";
const OLD_ENFORCEMENT_V1_MANIFEST_BLOB = "b9d8a57f8a67f2e9180b15a608c178bc95bf84b5";
const OLD_ENFORCEMENT_V4_MANIFEST_BLOB = "d9e391bb058132b83a4eeaec00797e41dab9fa26";
const OLD_ENFORCEMENT_V4_SET_SHA = "854fa637d25f0931c37d5d35fda641adb38ad1f55ca23b2662fb97d42a262a7b";
const LOCKED_V4_MANIFEST_BLOB = "dda86b558fe98f7647ca8b126da4a3c868c5231d";
const LOCKED_V4_GENERATION = "b35302ca60ea5e9f8a278fd67143e182a5dc49ceb838b8f85060322686d3e06d";
const EXPECTED_PACKAGE_LOCK_BLOB = "b2671f0149f522b2489247016df0a5ec4bb72b8b";
const ENTRY = "dist/economic/buy_void_delivery_runtime_integration_v1.js";
const PREFLIGHT = "dist/economic/buy_void_source_finality_execution_preflight_v1.js";
const V6 = "dist/economic/buy_void_source_finality_generation_provenance_v6.js";
const OLD_V4 = "dist/economic/buy_void_source_finality_generation_provenance_v4.js";
const OLD_V5 = "dist/economic/buy_void_source_finality_generation_provenance_v5.js";
const INPUTS = Object.freeze([
  "package.json","package-lock.json","tsconfig.json","tsconfig.build.json",
  "scripts/copy_void_runtime_js_v1.mjs",
  "scripts/retire_saveblock_periodic_rewriters_v1.mjs","Dockerfile",
]);
const EXTERNALS = new Set([
  "express","ethers","node:crypto","node:fs","node:path","node:http",
  "node:https","node:perf_hooks","node:url",
]);
const MAX_BYTES = 16*1024*1024;

function sha256(bytes) { return crypto.createHash("sha256").update(bytes).digest("hex"); }
function gitBlob(bytes) {
  return crypto.createHash("sha1")
    .update(Buffer.from("blob "+bytes.length+"\0","utf8")).update(bytes).digest("hex");
}
function canonical(value) {
  if(value === null) return "null";
  if(typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
  if(typeof value === "number") { assert.ok(Number.isSafeInteger(value),"unsafe number"); return String(value); }
  if(Array.isArray(value)) return "["+value.map(canonical).join(",")+"]";
  assert.ok(value && typeof value === "object","noncanonical object");
  return "{"+Object.keys(value).sort().map(k=>JSON.stringify(k)+":"+canonical(value[k])).join(",")+"}";
}
function sameStat(a,b) {
  return a.dev===b.dev && a.ino===b.ino && a.mode===b.mode &&
    a.nlink===b.nlink && a.size===b.size &&
    a.mtimeMs===b.mtimeMs && a.ctimeMs===b.ctimeMs;
}
function readPinned(root,relative,max=MAX_BYTES) {
  assert.match(relative,/^[a-zA-Z0-9_.-]+(?:\/[a-zA-Z0-9_.-]+)*$/u);
  assert.ok(!relative.split("/").some(x=>x==="."||x===".."),"path traversal");
  assert.ok(Number.isSafeInteger(max)&&max>=1&&max<=MAX_BYTES,"unbounded reader");
  const resolvedRoot=path.resolve(root);
  assert.equal(fs.realpathSync(resolvedRoot),resolvedRoot,"aliased reader root");
  let directory=resolvedRoot;
  const segments=relative.split("/");
  for(const part of segments.slice(0,-1)) {
    directory=path.join(directory,part);
    const stat=fs.lstatSync(directory);
    assert.ok(stat.isDirectory()&&!stat.isSymbolicLink(),"symlink/non-directory ancestor");
  }
  const target=path.join(directory,segments.at(-1));
  const nofollow=fs.constants.O_NOFOLLOW;
  assert.ok(typeof nofollow==="number"&&nofollow>0,"O_NOFOLLOW unavailable");
  let fd;
  try {
    const visible=fs.lstatSync(target);
    assert.ok(visible.isFile()&&!visible.isSymbolicLink()&&visible.nlink===1 &&
      visible.size>0 && visible.size<=max,"bad visible source");
    fd=fs.openSync(target,fs.constants.O_RDONLY|nofollow);
    const before=fs.fstatSync(fd);
    assert.ok(before.isFile()&&before.nlink===1&&before.size>0&&
      before.size<=max&&sameStat(before,visible),"source fd/path mismatch");
    const cap=before.size+1,buffer=Buffer.alloc(cap);
    let consumed=0;
    while(consumed<cap) {
      const n=fs.readSync(fd,buffer,consumed,cap-consumed,consumed);
      if(n===0)break;
      consumed+=n;
    }
    assert.equal(consumed,before.size,"file grown/truncated during bounded read");
    const after=fs.fstatSync(fd),recheck=fs.lstatSync(target);
    assert.ok(sameStat(before,after)&&recheck.isFile()&&!recheck.isSymbolicLink()&&
      sameStat(after,recheck),"file changed after read");
    return buffer.subarray(0,consumed);
  } finally { if(fd!==undefined) fs.closeSync(fd); }
}
function record(rel) {
  const bytes=readPinned(ROOT,rel);
  return {path:rel,bytes:bytes.length,sha256:sha256(bytes),git_blob_sha1:gitBlob(bytes)};
}
function scan(p,bytes) {
  const ast=ts.createSourceFile(p,bytes.toString("utf8"),ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
  assert.equal(ast.parseDiagnostics.length,0,"invalid compiled JS: "+p);
  const relatives=new Set(), externals=new Set();
  function add(value) {
    assert.ok(value&&ts.isStringLiteral(value),"nonliteral dynamic import:"+p);
    const spec=value.text;
    if(spec.startsWith(".")) {
      assert.match(spec,/^\.\/[a-z0-9_]+\.js$/u,"relative import escapes closure");
      relatives.add(path.posix.join(path.posix.dirname(p),spec));
    } else {
      assert.ok(EXTERNALS.has(spec),"unreviewed external module:"+p+":"+spec);
      externals.add(spec);
    }
  }
  function visit(node) {
    if((ts.isImportDeclaration(node)||ts.isExportDeclaration(node))&&node.moduleSpecifier) add(node.moduleSpecifier);
    if(ts.isCallExpression(node)){
      if(node.expression.kind===ts.SyntaxKind.ImportKeyword) {
        assert.equal(node.arguments.length,1,"noncanonical import");
        add(node.arguments[0]);
      }
      const expression=node.expression.getText(ast);
      assert.doesNotMatch(expression,/\b(require|createRequire|eval|Function)\b/u,"alternate dynamic loader");
    }
    if(ts.isNewExpression(node)) {
      assert.doesNotMatch(node.expression.getText(ast),/\b(Function)\b/u,
        "alternate dynamic Function constructor");
    }
    ts.forEachChild(node,visit);
  }
  visit(ast);
  return {imports:[...relatives].sort(),externals:[...externals].sort()};
}
function closedArtifacts() {
  const pending=[ENTRY],found=new Map();
  while(pending.length) {
    const p=pending.pop();
    if(found.has(p)) continue;
    assert.ok(found.size<128,"enforcement closure exceeds bound");
    assert.match(p,/^dist\/economic\/[a-z0-9_]+\.js$/u,"unexpected closure path");
    const bytes=readPinned(ROOT,p),graph=scan(p,bytes);
    found.set(p,{path:p,bytes:bytes.length,sha256:sha256(bytes),...graph});
    pending.push(...graph.imports);
  }
  assert.ok(found.has(PREFLIGHT),"preflight not in enforcement closure");
  assert.ok(found.has(V6),"V6 not present in enforcement closure");
  assert.ok(!found.has(OLD_V4)&&!found.has(OLD_V5),"historical finality still reachable");
  assert.ok(found.has("dist/economic/buy_void_verified_payment_v2.js"),"canonical V2 verifier missing");
  return [...found.values()].sort((a,b)=>a.path.localeCompare(b.path,"en"));
}
function runSelfTest() {
  const valid=scan(ENTRY,Buffer.from('import "./buy_void_source_finality_execution_preflight_v1.js";\n'));
  assert.ok(valid.imports.includes(PREFLIGHT));
  for(const bad of [
    'await import(process.env.UNKNOWN);',
    'import("../outside.js");',
    'import("node:child_process");',
    'require("./other.js");',
    'eval("2+2");',
    'new Function("return 3");',
  ]) assert.throws(()=>scan(ENTRY,Buffer.from(bad)),undefined,bad);
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),"void-enforcement-v5-candidate-"));
  const name="fixture.txt",full=path.join(temp,name),moved=path.join(temp,"moved.txt");
  const originalOpen=fs.openSync,originalRead=fs.readSync;
  try{
    fs.writeFileSync(full,"SAFE!!",{mode:0o600});
    assert.equal(readPinned(temp,name,32).toString(),"SAFE!!");
    let swapped=false;
    fs.openSync=(...args)=>{
      if(args[0]===full&&!swapped){
        swapped=true;fs.renameSync(full,moved);
        fs.writeFileSync(full,"EVIL!!",{mode:0o600});
      }
      return originalOpen(...args);
    };
    assert.throws(()=>readPinned(temp,name,32),/source fd\/path mismatch/u);
    assert.equal(swapped,true);
    fs.openSync=originalOpen;
    fs.rmSync(full,{force:true});fs.rmSync(moved,{force:true});
    fs.writeFileSync(full,"SAFE!!",{mode:0o600});
    let grew=false,total=0,maxBuffer=0;
    fs.readSync=(...args)=>{
      if(!grew){grew=true;fs.appendFileSync(full,Buffer.alloc(3*1024*1024,0x61));}
      maxBuffer=Math.max(maxBuffer,args[1].length);
      const consumed=originalRead(...args);total+=consumed;return consumed;
    };
    assert.throws(()=>readPinned(temp,name,32),/file grown\/truncated during bounded read/u);
    assert.equal(grew,true);assert.equal(total,7);assert.equal(maxBuffer,7);
    fs.readSync=originalRead;
    fs.rmSync(full,{force:true});fs.writeFileSync(full,"SAFE!!",{mode:0o600});
    assert.equal(readPinned(temp,name,32).toString(),"SAFE!!");
  } finally {
    fs.openSync=originalOpen;fs.readSync=originalRead;
    fs.rmSync(temp,{recursive:true,force:true});
  }
  console.log("VOID_BUY_VOID_ENFORCEMENT_V5_CANDIDATE_SELF_TEST_GREEN");
  console.log("nonliteral_and_external_imports_rejected=true");
  console.log("same_size_source_inode_substitution_rejected=true");
  console.log("growth_buffer_bounded_to_pinned_size_plus_one=true");
  console.log("source_runtime_unchanged=true");
  console.log("candidate_acceptance=false");
}
function derive() {
  assert.ok([22,24,26].includes(Number(process.versions.node.split(".")[0])),"node major not reviewed");
  assert.ok(!fs.existsSync(path.join(ROOT,".dockerignore")),"unreviewed build ignore");
  assert.equal(ts.version,"5.9.3");
  assert.equal(gitBlob(readPinned(ROOT,"package-lock.json")),EXPECTED_PACKAGE_LOCK_BLOB);
  for(const [file,blob] of [
    ["src/economic/buy_void_source_finality_execution_preflight_v1.ts",SOURCE_PREFLIGHT_GIT_BLOB],
    ["src/economic/buy_void_source_finality_generation_provenance_v6.ts",SOURCE_V6_GIT_BLOB],
    ["src/economic/buy_void_verified_payment_v2.ts",SOURCE_V2_GIT_BLOB],
    ["docs/architecture/buy-void-enforcement-artifact-attestation-v1.json",OLD_ENFORCEMENT_V1_MANIFEST_BLOB],
    ["docs/architecture/buy-void-enforcement-artifact-attestation-v4.json",OLD_ENFORCEMENT_V4_MANIFEST_BLOB],
    ["docs/architecture/buy-void-source-finality-compiled-artifact-attestation-v4.json",LOCKED_V4_MANIFEST_BLOB],
  ])assert.equal(gitBlob(readPinned(ROOT,file)),blob,"bound source/ancestor blob drift:"+file);
  const previousV1=JSON.parse(readPinned(ROOT,"docs/architecture/buy-void-enforcement-artifact-attestation-v1.json"));
  const previousV4=JSON.parse(readPinned(ROOT,"docs/architecture/buy-void-enforcement-artifact-attestation-v4.json"));
  const compiledV4=JSON.parse(readPinned(ROOT,"docs/architecture/buy-void-source-finality-compiled-artifact-attestation-v4.json"));
  assert.equal(previousV1.artifacts.length,23,"unexpected historical closure cardinality");
  assert.equal(previousV4.current_enforcement.enforcement_artifact_set_sha256,OLD_ENFORCEMENT_V4_SET_SHA);
  assert.equal(compiledV4.compiled_artifact_generation_sha256,LOCKED_V4_GENERATION);
  assert.equal(compiledV4.compiled_artifact_generation_verified,true);
  assert.equal(compiledV4.deployed_artifact_generation_verified,false);
  assert.equal(compiledV4.production_source_finality_authority_ready,false);
  execFileSync("git",["merge-base","--is-ancestor",SOURCE_HEAD,"HEAD"],{cwd:ROOT,stdio:"ignore"});
  execFileSync("git",["diff","--quiet",SOURCE_HEAD,"HEAD","--",
    "src/economic","package.json","package-lock.json","tsconfig.json","tsconfig.build.json",
    "scripts/copy_void_runtime_js_v1.mjs",
    "scripts/retire_saveblock_periodic_rewriters_v1.mjs","Dockerfile",
  ],{cwd:ROOT,stdio:"ignore"});
  const artifacts=closedArtifacts();
  const inputs=[...new Set([...artifacts.map(a=>a.path.replace(/^dist\//u,"src/").replace(/\.js$/u,".ts")),...INPUTS])]
    .sort().map(record);
  const old=new Map(previousV1.artifacts.map(a=>[a.path,a]));
  const now=new Map(artifacts.map(a=>[a.path,a]));
  const removed=[...old.keys()].filter(k=>!now.has(k)).sort();
  const added=[...now.keys()].filter(k=>!old.has(k)).sort();
  const changed=[...now.keys()].filter(k=>old.has(k) &&
    (now.get(k).sha256!==old.get(k).sha256 || now.get(k).bytes!==old.get(k).bytes)).sort();
  const unchanged=[...now.keys()].filter(k=>old.has(k) &&
    now.get(k).sha256===old.get(k).sha256 && now.get(k).bytes===old.get(k).bytes).sort();
  assert.ok(removed.includes(OLD_V4),"historical runtime finality should leave active closure");
  assert.ok(added.includes(V6),"V6 runtime must enter closure");
  assert.ok(changed.includes(PREFLIGHT),"execution preflight should be a changed compiled module");
  const closedBody={
    schema:"void_buy_void_enforcement_artifact_v5_candidate",
    version:5,
    repository:"6ZoSo9/void-node",
    source_runtime_parent:SOURCE_HEAD,
    predecessor:{
      historical_v1_manifest_git_blob_sha1:OLD_ENFORCEMENT_V1_MANIFEST_BLOB,
      historical_v4_manifest_git_blob_sha1:OLD_ENFORCEMENT_V4_MANIFEST_BLOB,
      historical_v4_enforcement_set_sha256:OLD_ENFORCEMENT_V4_SET_SHA,
      locked_source_finality_compiled_v4_manifest_blob:LOCKED_V4_MANIFEST_BLOB,
      locked_source_finality_compiled_v4_generation:LOCKED_V4_GENERATION
    },
    source_fingerprints:{
      execution_preflight_git_blob_sha1:SOURCE_PREFLIGHT_GIT_BLOB,
      v6_finality_git_blob_sha1:SOURCE_V6_GIT_BLOB,
      verified_payment_v2_git_blob_sha1:SOURCE_V2_GIT_BLOB
    },
    compiler:{
      typescript_version:ts.version,
      typescript_js:record("node_modules/typescript/lib/typescript.js"),
      tsc_js:record("node_modules/typescript/lib/_tsc.js")
    },
    closed_entry_artifact:ENTRY,
    closed_runtime_artifacts:artifacts,
    source_and_build_inputs:inputs,
    delta_from_historical_v1:{
      removed_paths:removed,added_paths:added,changed_paths:changed,
      unchanged_path_count:unchanged.length
    },
    reviewed_node_majors:[22,24,26],
    no_dynamic_unknown_imports:true,
    no_unbounded_reader:true,
    candidate_identity_accepted:false,
    deployed_artifact_generation_verified:false,
    runtime_mount_authority:false,
    production_source_finality_authority_ready:false,
    presale_activation:false,
    funds_movement:false
  };
  return {...closedBody,
    candidate_enforcement_set_sha256:sha256(Buffer.from(canonical(closedBody)))};
}
const args=process.argv.slice(2);
if(args.length===1&&args[0]==="--self-test"){runSelfTest();}
else if(args.length===1&&args[0]==="--derive"){
  process.stdout.write(JSON.stringify(derive(),null,2)+"\n");
}else throw Error("v5_candidate_derivation_only_no_locked_authority");
