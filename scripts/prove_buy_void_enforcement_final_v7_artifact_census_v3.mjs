#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const SOURCE_PARENT="a2f304fa3ae494cdd4fa71f65aa6f689a1313948";
const DEPLOYMENT_INSTALLER="ops/precision/void_buy_void_source_finality_v7_deployment_receipt_install_v1.ts";
const DEPLOYMENT_INSTALLER_BLOB="3de6e4bd1f9aa2e9c0a0889cc7c0ab489cb306c0";
const PRIOR_CENSUS=Object.freeze({
  workflow_run:38628146500,
  census_json_sha256:"5d73fccde209c2cc9719ed488f3944c9cb625d7c32c66a0f99a0ccd4c0c1c350",
  census_id:"voidbefv7c2_2dddb68128ce0baff4a848568fac7651c025cc97956cdf1b3d6faff6a9ae075a",
  hosted_artifact_inventory_sha256:"e7fe07c5e9e5386d6dd4e95132b6d2551426d9b62fabd9257f43f2e271cdfd8f",
  hosted_source_inventory_sha256:"ceaaf5cd9faf3b9176cfd02f1fabf455212391f24df1040707ba487a7ebb96a3",
  artifact_count:28,
  source_file_count:28,
});
const MAX_ARTIFACT_BYTES=2*1024*1024;

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
  "dist/economic/buy_void_source_finality_generation_provenance_v7.js",
  "dist/economic/buy_void_source_finality_live_process_binding_v1.js",
  "dist/economic/buy_void_source_finality_live_process_binding_v2.js",
  "dist/economic/buy_void_source_finality_provider_pair_binding_v1.js",
  "dist/economic/buy_void_ethereum_public_checkout_finality_gate_v1.js",
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
  const absolute=path.join(ROOT,relative),before=fs.lstatSync(absolute);
  assert.ok(before.isFile()&&!before.isSymbolicLink()&&before.nlink===1&&before.size>0&&before.size<=max,
    "invalid_file:"+relative);
  const bytes=fs.readFileSync(absolute),after=fs.lstatSync(absolute);
  for(const key of ["dev","ino","size","mtimeMs","ctimeMs","nlink"]){
    assert.equal(after[key],before[key],"file_changed:"+relative+":"+key);
  }
  assert.equal(bytes.length,before.size,"short_read:"+relative);
  return bytes;
}
function sourcePathForArtifact(relative){
  return "src/economic/"+path.basename(relative,".js")+".ts";
}
function artifactIdentity(relative){
  const b=readExact(relative,MAX_ARTIFACT_BYTES);
  return Object.freeze({path:relative,bytes:b.length,sha256:sha256(b)});
}
function sourceIdentity(relative){
  const b=readExact(relative,4*1024*1024),blob=gitBlob(b);
  assert.equal(git(["rev-parse","--verify","HEAD:"+relative]),blob,"source_head_mismatch:"+relative);
  return Object.freeze({path:relative,bytes:b.length,git_blob_sha1:blob,sha256:sha256(b)});
}
function extractProtectedPaths(){
  const bytes=readExact(DEPLOYMENT_INSTALLER,512*1024);
  assert.equal(gitBlob(bytes),DEPLOYMENT_INSTALLER_BLOB,"deployment_installer_blob_drift");
  const ast=ts.createSourceFile(DEPLOYMENT_INSTALLER,bytes.toString("utf8"),
    ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
  assert.equal(ast.parseDiagnostics.length,0,"deployment_installer_parse_diagnostics");
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
          ts.isIdentifier(expr.expression.expression)&&expr.expression.expression.text==="Object"&&
          expr.expression.name.text==="freeze","tracked_source_object_freeze_required");
        assert.equal(expr.arguments.length,1,"tracked_source_freeze_arg_count");
        expr=expr.arguments[0];
      }
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
function protectedRow(relative){
  const b=readExact(relative,4*1024*1024),blob=gitBlob(b);
  assert.equal(git(["rev-parse","--verify","HEAD:"+relative]),blob,"protected_head_blob_mismatch:"+relative);
  const entry=git(["ls-tree","HEAD","--",relative]);
  const m=entry.match(/^(100644|100755) blob ([0-9a-f]{40})\t(.+)$/u);
  assert.ok(m,"protected_tree_entry_invalid:"+relative);
  assert.equal(m[2],blob,"protected_tree_blob_mismatch:"+relative);
  assert.equal(m[3],relative,"protected_tree_path_mismatch:"+relative);
  const mode=(fs.lstatSync(path.join(ROOT,relative)).mode&0o111)!==0?"100755":"100644";
  assert.equal(mode,m[1],"protected_visible_mode_mismatch:"+relative);
  const parentEntry=git(["ls-tree",SOURCE_PARENT,"--",relative]);
  const pm=parentEntry.match(/^(100644|100755) blob ([0-9a-f]{40})\t(.+)$/u);
  assert.ok(pm,"protected_parent_tree_entry_missing:"+relative);
  assert.equal(pm[1],m[1],"protected_mode_changed_after_parent:"+relative);
  assert.equal(pm[2],m[2],"protected_blob_changed_after_parent:"+relative);
  return Object.freeze({path:relative,git_blob_sha1:blob,git_mode:mode});
}

assert.equal(process.platform,"linux");
assert.equal(process.arch,"x64");
assert.ok([22,24,26].includes(Number(process.versions.node.split(".")[0])));

git(["merge-base","--is-ancestor",SOURCE_PARENT,"HEAD"]);
const economicDrift=runGit(["diff","--quiet","--no-ext-diff","--no-textconv",
  SOURCE_PARENT,"HEAD","--","src/economic","package.json","package-lock.json","tsconfig.build.json"],{allowFail:true});
assert.equal(economicDrift.error,undefined,String(economicDrift.error||""));
assert.equal(economicDrift.status,0,"economic_or_build_source_changed_after_protected_parent");

const artifacts=ARTIFACT_PATHS.map(artifactIdentity);
const sources=[...new Set(ARTIFACT_PATHS.map(sourcePathForArtifact))].sort().map(sourceIdentity);
assert.equal(artifacts.length,28);assert.equal(sources.length,28);
const hostedArtifactSha=sha256(Buffer.from(JSON.stringify(artifacts),"utf8"));
const hostedSourceSha=sha256(Buffer.from(JSON.stringify(sources),"utf8"));
assert.equal(hostedArtifactSha,PRIOR_CENSUS.hosted_artifact_inventory_sha256,
  "economic_artifact_inventory_changed");
assert.equal(hostedSourceSha,PRIOR_CENSUS.hosted_source_inventory_sha256,
  "economic_source_inventory_changed");

const protectedPaths=extractProtectedPaths();
const protectedInventory=protectedPaths.map(protectedRow);
const protectedCanonicalSha=sha256(Buffer.from(canonical(protectedInventory),"utf8"));
const protectedHostedSha=sha256(Buffer.from(JSON.stringify(protectedInventory),"utf8"));

const body=Object.freeze({
  schema:"void_buy_void_enforcement_final_v7_artifact_census_v3",
  marker:"VOID_BUY_VOID_ENFORCEMENT_FINAL_V7_ARTIFACT_CENSUS_V3",
  version:3,
  repository:"6ZoSo9/void-node",
  source_parent:SOURCE_PARENT,
  repository_head_sha:git(["rev-parse","HEAD"]),
  repository_tree_sha:git(["rev-parse","HEAD^{tree}"]),
  prior_economic_census_evidence:PRIOR_CENSUS,
  economic_artifact_count:28,
  economic_artifacts:artifacts,
  economic_source_file_count:28,
  economic_sources:sources,
  economic_hosted_artifact_inventory_sha256:hostedArtifactSha,
  economic_hosted_source_inventory_sha256:hostedSourceSha,
  protected_inventory_definition_path:DEPLOYMENT_INSTALLER,
  protected_inventory_definition_git_blob_sha1:DEPLOYMENT_INSTALLER_BLOB,
  protected_tracked_source_count:protectedInventory.length,
  protected_tracked_source_inventory:protectedInventory,
  protected_tracked_source_inventory_json_sha256:protectedHostedSha,
  protected_tracked_source_inventory_canonical_sha256:protectedCanonicalSha,
  exact_parent_protected_inventory_verified:true,
  census_only:true,
  complete_executable_closure_verified:false,
  candidate_enforcement_identity_accepted:false,
  deployed_artifact_generation_verified:false,
  runtime_mount_authority:false,
  production_source_finality_authority_ready:false,
  public_presale_activation:false,
  funds_movement:false,
});
const censusId="voidbefv7c3_"+sha256(Buffer.from(canonical(body),"utf8"));
process.stdout.write(JSON.stringify({...body,census_id:censusId},null,2)+"\n");
