#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const MARKER="VOID_BUY_VOID_ENFORCEMENT_FINAL_PROTECTED_V7_V2_SOURCE_CENSUS_V5";
const BASE_PROTECTED_HEAD="ccb1bd973a60875ecebf570905e6d8fc1c15ae3c";
const RANGE_SOURCE_HEAD="6080389131c3cdb80fa9935b5ff80f4e40f09938";
const INVENTORY_DEFINITION="ops/precision/void_buy_void_source_finality_v7_deployment_receipt_install_v1.ts";
const INVENTORY_DEFINITION_BLOB="3de6e4bd1f9aa2e9c0a0889cc7c0ab489cb306c0";
const PREDECESSOR_V4_PROOF="scripts/prove_buy_void_enforcement_final_v7_artifact_census_v4.mjs";
const PREDECESSOR_V4_PROOF_BLOB="f0e1334da67309c1aeb98a2fa19e5ff77424955f";
const PREDECESSOR_LOCK="ops/security/buy-void-enforcement-final-protected-v7-v2-lock-v2.json";
const PREDECESSOR_LOCK_BLOB="589845615654da8b688764377b34296267ac0063";
const PREDECESSOR_LOCK_PROOF="scripts/prove_buy_void_enforcement_final_protected_v7_v2_lock_v2.mjs";
const PREDECESSOR_LOCK_PROOF_BLOB="9428c0adb10d624593c7882a9e483f33baa9f292";
const PREDECESSOR_INVENTORY_SHA256="224e8c4b63b231e40b1abf4982127a6e2b999724642c4360c10ca21887bbc0a2";
const EXPECTED_DELTA=Object.freeze([
  Object.freeze({
    path:"ops/run-void-node-live-v1.sh",
    before_blob:"6fb040de128ce0df16e848d61ea5f4acb62794da",
    after_blob:"d7d7aede7fcd764a6182bd31f12338c5d3674ecb",
    mode:"100755",
  }),
  Object.freeze({
    path:"src/index.ts",
    before_blob:"123ec1792a027f93d4c9030749a0e7e136a75a44",
    after_blob:"7df1f21c730b554c414c88c550a4475234485370",
    mode:"100644",
  }),
]);
const CENSUS_WORKFLOW=".github/workflows/buy-void-enforcement-final-protected-v7-v2-source-census-v5.yml";
const CENSUS_TRIGGER_PATTERNS=Object.freeze([
  "ops/precision/**",
  "ops/security/**",
  "ops/run-void-node-live-v1.sh",
  "runtime/**",
  "scripts/prove_void_buy_v7_privileged_launcher_package_runtime_v2.mjs",
  "src/economic/**",
  "src/index.ts",
  "tools/buy-void-crash-consistent-fulfillment-saga-v1.mjs",
  "tools/void-reviewed-node-package-runtime-v1.mjs",
  "package.json",
  "package-lock.json",
  "tsconfig.json",
  "tsconfig.build.json",
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
function runGit(args,{allowFail=false}={}){
  const r=spawnSync("/usr/bin/git",[
    "--no-replace-objects",
    "-c","core.hooksPath=/dev/null",
    "-c","core.attributesFile=/dev/null",
    "-c","core.fsmonitor=false",
    "-c","core.untrackedCache=false",
    "-c","core.preloadIndex=false",
    "-c","submodule.recurse=false",
    "-C",ROOT,...args,
  ],{
    encoding:"utf8",stdio:["ignore","pipe","pipe"],timeout:30000,maxBuffer:8*1024*1024,
    env:{PATH:"/usr/bin:/bin",HOME:"/nonexistent",LANG:"C",LC_ALL:"C",TZ:"UTC",
      GIT_CONFIG_NOSYSTEM:"1",GIT_CONFIG_GLOBAL:"/dev/null",GIT_CONFIG_SYSTEM:"/dev/null",
      GIT_NO_REPLACE_OBJECTS:"1",GIT_OPTIONAL_LOCKS:"0",GIT_TERMINAL_PROMPT:"0"},
  });
  if(!allowFail){
    assert.equal(r.error,undefined,String(r.error||""));
    assert.equal(r.status,0,String(r.stderr||r.stdout||""));
  }
  return r;
}
const git=args=>String(runGit(args).stdout||"").trim();

function readExact(relative,max=4*1024*1024){
  assert.ok(!path.isAbsolute(relative)&&!relative.split("/").includes(".."),"unsafe_path:"+relative);
  const absolute=path.join(ROOT,relative);
  const before=fs.lstatSync(absolute);
  assert.ok(before.isFile()&&!before.isSymbolicLink()&&before.nlink===1&&before.size>0&&before.size<=max,
    "invalid_file:"+relative);
  const bytes=fs.readFileSync(absolute);
  const after=fs.lstatSync(absolute);
  for(const key of ["dev","ino","size","mtimeMs","ctimeMs","nlink"]){
    assert.equal(after[key],before[key],"file_changed:"+relative+":"+key);
  }
  assert.equal(bytes.length,before.size,"short_read:"+relative);
  return bytes;
}
function pin(relative,blob,max=4*1024*1024){
  const bytes=readExact(relative,max);
  assert.equal(gitBlob(bytes),blob,"git_blob_mismatch:"+relative);
  assert.equal(git(["rev-parse","--verify","HEAD:"+relative]),blob,"head_blob_mismatch:"+relative);
  return bytes;
}
function treeRow(ref,relative){
  const entry=git(["ls-tree",ref,"--",relative]);
  const m=entry.match(/^(100644|100755) blob ([0-9a-f]{40})\t(.+)$/u);
  assert.ok(m,"tree_entry_invalid:"+ref+":"+relative);
  assert.equal(m[3],relative,"tree_path_mismatch:"+ref+":"+relative);
  return Object.freeze({path:relative,git_blob_sha1:m[2],git_mode:m[1]});
}
function extractProtectedPaths(){
  const bytes=pin(INVENTORY_DEFINITION,INVENTORY_DEFINITION_BLOB,512*1024);
  const ast=ts.createSourceFile(
    INVENTORY_DEFINITION,bytes.toString("utf8"),
    ts.ScriptTarget.Latest,true,ts.ScriptKind.TS,
  );
  assert.equal(ast.parseDiagnostics.length,0,"inventory_definition_parse_diagnostics");
  let found=null;
  for(const stmt of ast.statements){
    if(!ts.isVariableStatement(stmt))continue;
    for(const decl of stmt.declarationList.declarations){
      if(!ts.isIdentifier(decl.name)||
         decl.name.text!=="VOID_BUY_VOID_CURRENT_ENFORCEMENT_TRACKED_SOURCE_PATHS_V1")continue;
      let expr=decl.initializer;
      assert.ok(expr,"tracked_source_initializer_missing");
      if(ts.isCallExpression(expr)){
        assert.ok(ts.isPropertyAccessExpression(expr.expression)&&
          ts.isIdentifier(expr.expression.expression)&&
          expr.expression.expression.text==="Object"&&
          expr.expression.name.text==="freeze","tracked_source_object_freeze_required");
        assert.equal(expr.arguments.length,1,"tracked_source_freeze_arg_count");
        expr=expr.arguments[0];
      }
      while(
        ts.isAsExpression(expr)||
        ts.isTypeAssertionExpression(expr)||
        ts.isParenthesizedExpression(expr)
      )expr=expr.expression;
      assert.ok(ts.isArrayLiteralExpression(expr),"tracked_source_array_required");
      found=expr.elements.map(el=>{
        assert.ok(ts.isStringLiteral(el),"tracked_source_literal_required");
        return el.text;
      });
    }
  }
  assert.ok(found,"tracked_source_inventory_not_found");
  assert.equal(found.length,49,"tracked_source_inventory_count");
  assert.equal(new Set(found).size,49,"tracked_source_inventory_duplicate");
  return Object.freeze(found);
}
function patternCovers(pattern,relative){
  if(pattern.endsWith("/**"))return relative.startsWith(pattern.slice(0,-3));
  return pattern===relative;
}
function assertWorkflowCoverage(protectedPaths){
  const workflow=readExact(CENSUS_WORKFLOW,128*1024).toString("utf8");
  for(const pattern of CENSUS_TRIGGER_PATTERNS){
    const exact='      - "'+pattern+'"';
    assert.equal(workflow.split(exact).length-1,2,"workflow_trigger_pattern_count:"+pattern);
  }
  for(const relative of protectedPaths){
    assert.equal(
      CENSUS_TRIGGER_PATTERNS.some(pattern=>patternCovers(pattern,relative)),
      true,
      "protected_path_trigger_missing:"+relative,
    );
  }
}
function sameRow(a,b){
  return a.path===b.path&&a.git_blob_sha1===b.git_blob_sha1&&a.git_mode===b.git_mode;
}

assert.equal(process.platform,"linux");
assert.equal(process.arch,"x64");
assert.ok([22,24,26].includes(Number(process.versions.node.split(".")[0])));

git(["merge-base","--is-ancestor",BASE_PROTECTED_HEAD,RANGE_SOURCE_HEAD]);
git(["merge-base","--is-ancestor",RANGE_SOURCE_HEAD,"HEAD"]);
pin(PREDECESSOR_V4_PROOF,PREDECESSOR_V4_PROOF_BLOB,512*1024);
pin(PREDECESSOR_LOCK_PROOF,PREDECESSOR_LOCK_PROOF_BLOB,512*1024);
const predecessorLock=JSON.parse(pin(PREDECESSOR_LOCK,PREDECESSOR_LOCK_BLOB,256*1024));
assert.equal(predecessorLock.marker,"VOID_BUY_VOID_ENFORCEMENT_FINAL_PROTECTED_V7_V2_LOCK_V2");
assert.equal(predecessorLock.candidate_enforcement_identity_accepted,true);
assert.equal(
  predecessorLock.current_enforcement_tracked_source_inventory_sha256,
  PREDECESSOR_INVENTORY_SHA256,
);
assert.equal(predecessorLock.production_source_finality_authority_ready,false);
assert.equal(predecessorLock.public_presale_activation,false);
assert.equal(predecessorLock.funds_movement,false);

const protectedPaths=extractProtectedPaths();
assertWorkflowCoverage(protectedPaths);
const baseInventory=protectedPaths.map(relative=>treeRow(BASE_PROTECTED_HEAD,relative));
const rangeInventory=protectedPaths.map(relative=>treeRow(RANGE_SOURCE_HEAD,relative));
const headInventory=protectedPaths.map(relative=>treeRow("HEAD",relative));
for(let i=0;i<protectedPaths.length;i++){
  assert.equal(sameRow(headInventory[i],rangeInventory[i]),true,
    "protected_path_changed_after_range_head:"+protectedPaths[i]);
}
const baseSha=sha256(Buffer.from(canonical(baseInventory),"utf8"));
const currentSha=sha256(Buffer.from(canonical(headInventory),"utf8"));
assert.equal(baseSha,PREDECESSOR_INVENTORY_SHA256,"predecessor_inventory_digest_mismatch");
assert.notEqual(currentSha,baseSha,"intentional_protected_delta_not_observed");

const changed=[];
for(let i=0;i<protectedPaths.length;i++){
  if(!sameRow(baseInventory[i],rangeInventory[i])){
    changed.push(Object.freeze({
      path:protectedPaths[i],
      before:baseInventory[i],
      after:rangeInventory[i],
    }));
  }
}
assert.deepEqual(
  changed.map(row=>row.path).sort(),
  EXPECTED_DELTA.map(row=>row.path).sort(),
  "protected_delta_scope_invalid",
);
for(const expected of EXPECTED_DELTA){
  const row=changed.find(item=>item.path===expected.path);
  assert.ok(row,"expected_delta_missing:"+expected.path);
  assert.equal(row.before.git_blob_sha1,expected.before_blob,"before_blob_mismatch:"+expected.path);
  assert.equal(row.after.git_blob_sha1,expected.after_blob,"after_blob_mismatch:"+expected.path);
  assert.equal(row.before.git_mode,expected.mode,"before_mode_mismatch:"+expected.path);
  assert.equal(row.after.git_mode,expected.mode,"after_mode_mismatch:"+expected.path);
}
assert.equal(changed.length,2);
assert.equal(protectedPaths.length-changed.length,47);

const body=Object.freeze({
  schema:"void_buy_void_enforcement_final_protected_v7_v2_source_census_v5",
  marker:MARKER,
  version:5,
  repository:"6ZoSo9/void-node",
  base_protected_head:BASE_PROTECTED_HEAD,
  range_source_head:RANGE_SOURCE_HEAD,
  repository_head_sha:git(["rev-parse","HEAD"]),
  repository_tree_sha:git(["rev-parse","HEAD^{tree}"]),
  protected_inventory_definition_path:INVENTORY_DEFINITION,
  protected_inventory_definition_git_blob_sha1:INVENTORY_DEFINITION_BLOB,
  predecessor_v4_census_proof_path:PREDECESSOR_V4_PROOF,
  predecessor_v4_census_proof_git_blob_sha1:PREDECESSOR_V4_PROOF_BLOB,
  predecessor_v2_lock_path:PREDECESSOR_LOCK,
  predecessor_v2_lock_git_blob_sha1:PREDECESSOR_LOCK_BLOB,
  predecessor_v2_lock_proof_path:PREDECESSOR_LOCK_PROOF,
  predecessor_v2_lock_proof_git_blob_sha1:PREDECESSOR_LOCK_PROOF_BLOB,
  predecessor_v2_enforcement_set_sha256:
    predecessorLock.candidate_evidence.candidate_enforcement_set_sha256,
  predecessor_protected_inventory_canonical_sha256:baseSha,
  protected_tracked_source_count:headInventory.length,
  protected_tracked_source_inventory:headInventory,
  protected_tracked_source_inventory_canonical_sha256:currentSha,
  intentional_protected_delta_paths:EXPECTED_DELTA.map(row=>row.path).sort(),
  intentional_protected_delta:changed,
  unchanged_protected_path_count:47,
  exact_two_path_transition_verified:true,
  range_head_protected_identity_preserved_on_census_head:true,
  predecessor_lock_preserved_as_historical_identity:true,
  census_only:true,
  complete_executable_closure_verified:false,
  candidate_enforcement_identity_accepted:false,
  protected_install_authorized:false,
  deployed_artifact_generation_verified:false,
  runtime_mount_authority:false,
  production_source_finality_authority_ready:false,
  payment_acceptance:false,
  transaction:false,
  public_presale_activation:false,
  wc_void_market_activation:false,
  funds_movement:false,
  next_gate:"void_buy_void_enforcement_final_protected_v7_v2_candidate_v3",
});
const censusId="voidbefpv7v2c5_"+sha256(Buffer.from(canonical(body),"utf8"));
const receipt=Object.freeze({...body,census_id:censusId});

const args=process.argv.slice(2);
if(args.length===0||(args.length===1&&args[0]==="--self-test")){
  assert.match(receipt.census_id,/^voidbefpv7v2c5_[0-9a-f]{64}$/u);
  assert.equal(receipt.protected_tracked_source_count,49);
  assert.equal(receipt.intentional_protected_delta.length,2);
  assert.equal(receipt.unchanged_protected_path_count,47);
  assert.equal(receipt.candidate_enforcement_identity_accepted,false);
  console.log(MARKER+"_GREEN");
  console.log("protected_tracked_source_count=49");
  console.log("intentional_protected_delta_count=2");
  console.log("unchanged_protected_path_count=47");
  console.log("range_head_protected_identity_preserved_on_census_head=true");
  console.log("candidate_enforcement_identity_accepted=false");
  console.log("protected_install_authorized=false");
  console.log("public_presale_activation=false");
  console.log("wc_void_market_activation=false");
  console.log("funds_movement=false");
}else if(args.length===1&&args[0]==="--receipt"){
  process.stdout.write(JSON.stringify(receipt,null,2)+"\n");
}else{
  throw new Error("usage: proof [--self-test|--receipt]");
}
