#!/usr/bin/env node
// Unaccepted source-generation V2 candidate. No live custody or gas movement.
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_REVIEWED_SOURCE_V1 as V1,
  VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_REVIEWED_SOURCE_MANIFEST_SHA256_V1 as V1_DIGEST,
  testOnlyWorktreeGitBlobSha1V1,
  testOnlyRepositoryCleanStateV1,
  testOnlyGitEnvironmentV1,
} from "../tools/void-coupled-native-gas-reconciliation-custody-source-binding-v1.mjs";

export const MARKER = "VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_SOURCE_GENERATION_V2_CANDIDATE";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE_STACK_PARENT = "884edc6e82bd505a83e51a44b38f7e318431f314";
const OLD_TOOL_BLOB = "44e185ba85b7bfb65514f40358c75e64e6af418c";
const OLD_AUTO_BLOB = "1ac1ad6213be83f1aa8261a554caa91544fe5e09";
const CURRENT_AUTO_BLOB = "b7c963b1d55f000d82ad82289b31107b432503de";
const CHANGED = "src/economic/buy_void_auto_fulfillment_v1.ts";
const TOOL = "tools/void-coupled-native-gas-reconciliation-custody-source-binding-v1.mjs";
const FIXED_INPUT_COUNT = 21;
const OLD_V1_BASE = "70faa71371eed9a8a0de4ffeb6c20e2c737cbc66";
const SHA40 = /^[0-9a-f]{40}$/u;

const sha256 = b => crypto.createHash("sha256").update(b).digest("hex");
function blob(b) {
  return crypto.createHash("sha1").update(Buffer.from("blob "+b.length+"\0","utf8"))
    .update(b).digest("hex");
}
function canonical(v) {
  if (v === null) return "null";
  if (typeof v === "string" || typeof v === "boolean") return JSON.stringify(v);
  if (typeof v === "number") { assert.ok(Number.isSafeInteger(v)); return String(v); }
  if (Array.isArray(v)) return "["+v.map(canonical).join(",")+"]";
  assert.ok(v && typeof v === "object");
  return "{"+Object.keys(v).sort().map(k=>JSON.stringify(k)+":"+canonical(v[k])).join(",")+"}";
}
function git(args, allowFail=false) {
  const env=testOnlyGitEnvironmentV1();
  const run=spawnSync("/usr/bin/git",[
    "--no-replace-objects","--no-lazy-fetch",
    "-c","core.worktree="+ROOT,
    "-c","core.fsmonitor=false",
    "-c","core.attributesFile=/dev/null",
    "-c","submodule.recurse=false",
    "-C",ROOT,...args
  ],{env,encoding:"utf8",stdio:["ignore","pipe","pipe"],
      timeout:30000,maxBuffer:1024*1024});
  if(run.error)throw run.error;
  if(run.status!==0&&!allowFail)throw Error("v2_git_command_held:"+args[0]);
  return run;
}
function gitText(args) {return String(git(args).stdout||"").trim();}
function expectedRows() {
  assert.equal(V1.length,FIXED_INPUT_COUNT,"historical_reviewed_source_count_drift");
  const rows=V1.map(({path,git_blob_sha1})=>({path,old_git_blob_sha1:git_blob_sha1}));
  assert.equal(new Set(rows.map(x=>x.path)).size,FIXED_INPUT_COUNT,"duplicate historic path");
  const changed=rows.filter(r=>r.path===CHANGED);
  assert.equal(changed.length,1,"changed source absent");
  assert.equal(changed[0].old_git_blob_sha1,OLD_AUTO_BLOB,"historical source blob drift");
  return rows.map(r=>({...r,
    current_git_blob_sha1:r.path===CHANGED ? CURRENT_AUTO_BLOB : r.old_git_blob_sha1,
    changed:r.path===CHANGED
  }));
}
function validateRows(rows) {
  const expected=expectedRows();
  assert.deepEqual(rows,expected,"unexpected source generation delta");
  assert.equal(rows.filter(r=>r.changed).length,1);
  assert.equal(rows.filter(r=>!r.changed).length,20);
}
function derive() {
  if(![22,24,26].includes(Number(process.versions.node.split(".")[0]))) {
    throw Error("unsupported_node_major");
  }
  const head=gitText(["rev-parse","HEAD"]);
  assert.match(head,SHA40);
  assert.equal(git(["merge-base","--is-ancestor",SOURCE_STACK_PARENT,head],true).status,0,
    "source parent not ancestor of candidate");
  assert.equal(git(["merge-base","--is-ancestor",OLD_V1_BASE,head],true).status,0,
    "historical source not ancestor");
  assert.equal(testOnlyRepositoryCleanStateV1(head),true,"worktree not clean");
  const historicBytes=fs.readFileSync(path.join(ROOT,TOOL));
  assert.equal(blob(historicBytes),OLD_TOOL_BLOB,"historical source-binding tool changed");
  const rows=expectedRows();
  for(const r of rows) {
    // Bind BOTH exact checked-out Git-object identity and the actual source
    // file's worktree bytes. Never declare V1 verified when its tuple changed.
    const committed=gitText(["rev-parse",head+":"+r.path]);
    const current=testOnlyWorktreeGitBlobSha1V1(r.path);
    assert.equal(committed,r.current_git_blob_sha1,"current committed source drift:"+r.path);
    assert.equal(current,r.current_git_blob_sha1,"current worktree source drift:"+r.path);
  }
  const finalHead=gitText(["rev-parse","HEAD"]);
  assert.equal(finalHead,head,"head changed during source census");
  assert.equal(testOnlyRepositoryCleanStateV1(head),true,"worktree changed during census");
  validateRows(rows);
  const body={
    schema:"void_coupled_native_gas_reconciliation_custody_source_generation_v2_candidate",
    marker:MARKER,
    version:2,
    repository:"6ZoSo9/void-node",
    source_stack_parent:SOURCE_STACK_PARENT,
    historical_v1_base:OLD_V1_BASE,
    historical_v1_binding_tool_git_blob_sha1:OLD_TOOL_BLOB,
    historical_v1_reviewed_source_manifest_sha256:V1_DIGEST,
    reviewed_source_count:FIXED_INPUT_COUNT,
    changed_source_count:1,
    unchanged_source_count:20,
    source_blobs:rows,
    original_v1_identity_intentionally_unchanged:true,
    source_identity_candidate_verified:true,
    source_generation_v2_accepted:false,
    deployed_artifact_generation_verified:false,
    trusted_collector_proven:false,
    bootstrap_receipt_external_trust_proven:false,
    evidence_generation_monotonicity_proven:false,
    verification_clock_authority_proven:false,
    live_host_qualification_performed:false,
    storage_bootstrap:false,
    runtime_integration:false,
    production_gate_ready:false,
    presale_activation:false,
    funds_movement:false,
  };
  return {...body,candidate_source_set_sha256:sha256(Buffer.from(canonical(body),"utf8"))};
}
function selfTest() {
  const good=expectedRows();
  validateRows(good);
  for(const mutate of [
    r=>{r[2].old_git_blob_sha1="0".repeat(40);},
    r=>{r[2].current_git_blob_sha1="0".repeat(40);},
    r=>{r[2].changed=false;},
    r=>{r[3].changed=true;},
    r=>{r.push({...r[0]});},
    r=>{r.pop();},
    r=>{r[0].path="../escape";},
  ]) {
    const bad=structuredClone(good);
    mutate(bad);
    assert.throws(()=>validateRows(bad),"invalid V2 tuple or closure must HOLD");
  }
  console.log("NATIVE_GAS_SOURCE_V2_EXACT_SINGLE_DELTA_NEGATIVES_GREEN");
  console.log("unchanged_historic_sources=20");
  console.log("changed_auto_fulfillment_source_only=1");
  console.log("historic_v1_preserved=true");
  console.log("source_v2_candidate_accepted=false");
  console.log("production_gate_ready=false");
  console.log("funds_moved=false");
}
const args=process.argv.slice(2);
if(args.length===1&&args[0]==="--self-test")selfTest();
else if(args.length===1&&args[0]==="--derive")
  process.stdout.write(JSON.stringify(derive(),null,2)+"\n");
else throw Error("source_v2_review_candidate_only_no_authority");
