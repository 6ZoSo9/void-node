#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");

const MARKER="VOID_BUY_VOID_PRESALE_CURRENT_SOURCE_ENFORCEMENT_SUCCESSOR_V1";
const SUCCESSOR_REL="ops/security/buy-void-presale-current-source-enforcement-successor-v1.json";
const SUCCESSOR_BLOB="bb1144989cd826677f2fc8ea54c97e3bd95cc8ef";
const SUCCESSOR_ID="voidbuypresaleenfsucc1_2c412f5e7537fd23c61c262f82c89d0b082e1a44c45d744cc1c7a84d28893bad";

const FREEZE_HEAD="0f5c467253c250a905917e886eb6ae3fb80bff62";
const FREEZE_SOURCE="05614762b1b4638e05e539fd7d20cbf670e1570b";
const FREEZE_TREE="4ade3faff2c3fd8e73f7ab8bf3ce0685e0d0d30e";
const FREEZE_REL="ops/security/buy-void-presale-source-freeze-candidate-v2.json";
const FREEZE_BLOB="ca9c42e2d3ab4c50ac54badadb9efde6180ad241";
const FREEZE_ID="voidbuypresalefreeze2_32bd552dc92df07fd391ee3571f92e5efd80cbb50bd79bc4b8952484511db7f1";

const CANDIDATE_REL="ops/security/buy-void-enforcement-final-protected-v7-v2-candidate-v2.json";
const CANDIDATE_BLOB="4e23ecbb64eb26c14f5ab15af85eb86d59c3a718";
const CANDIDATE_SHA256="092a97373013d32dda610df7363587fa3a669f33248a37420b07541d12d892bb";
const LOCK_REL="ops/security/buy-void-enforcement-final-protected-v7-v2-lock-v2.json";
const LOCK_BLOB="589845615654da8b688764377b34296267ac0063";
const LOCK_SHA256="06af643df1a807a7d2c3582f6650967575d53874d5bf1277a0f1039bbad6ccd9";
const ENFORCEMENT_SET="05d7648032223f74a05d89200ef23a76a5265ef2a3a26e52c7f51ce3b33bc852";
const PROTECTED_INVENTORY_SHA="224e8c4b63b231e40b1abf4982127a6e2b999724642c4360c10ca21887bbc0a2";

const CENSUS_RUN=39085990140;
const CENSUS_CROSS_JOB=117552963378;
const CENSUS_ARTIFACTS=Object.freeze([12121310248,12120712719,12120269195]);
const CENSUS_RECEIPT_SHA="66415fe46bb98641f14f24ac935861048ff33ed5eba41e407a483dc5424c41e3";

const CANDIDATE_RUN=39085990128;
const CANDIDATE_CROSS_JOB=117553326261;
const CANDIDATE_ARTIFACTS=Object.freeze([12121216148,12121340034,12121106137]);

const ECONOMIC_ARTIFACT_PATHS=Object.freeze([
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

const ENV=Object.freeze({
  PATH:"/usr/bin:/bin",
  HOME:"/nonexistent",
  LANG:"C",
  LC_ALL:"C",
  TZ:"UTC",
  GIT_CONFIG_NOSYSTEM:"1",
  GIT_CONFIG_GLOBAL:"/dev/null",
  GIT_CONFIG_SYSTEM:"/dev/null",
  GIT_NO_REPLACE_OBJECTS:"1",
  GIT_OPTIONAL_LOCKS:"0",
  GIT_TERMINAL_PROMPT:"0",
});

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
    "--no-replace-objects","-c","core.hooksPath=/dev/null",
    "-c","core.attributesFile=/dev/null","-c","core.fsmonitor=false",
    "-c","core.untrackedCache=false","-c","core.preloadIndex=false",
    "-c","submodule.recurse=false","-C",ROOT,...args,
  ],{
    encoding:"utf8",stdio:["ignore","pipe","pipe"],timeout:30000,
    maxBuffer:16*1024*1024,env:ENV,
  });
  if(!allowFail){
    assert.equal(r.error,undefined,String(r.error||""));
    assert.equal(r.status,0,String(r.stderr||r.stdout||""));
  }
  return r;
}
const git=args=>String(runGit(args).stdout||"").trim();

function readExact(relative,max=512*1024){
  const absolute=path.join(ROOT,relative);
  const before=fs.lstatSync(absolute);
  assert.ok(before.isFile()&&!before.isSymbolicLink()&&before.nlink===1);
  assert.ok(before.size>0&&before.size<=max);
  const raw=fs.readFileSync(absolute);
  const after=fs.lstatSync(absolute);
  for(const k of ["dev","ino","size","mtimeMs","ctimeMs","nlink"]){
    assert.equal(after[k],before[k],"file_changed:"+relative+":"+k);
  }
  return raw;
}
function pin(relative,blob,max=512*1024){
  const raw=readExact(relative,max);
  assert.equal(gitBlob(raw),blob,"blob_mismatch:"+relative);
  assert.equal(git(["rev-parse","HEAD:"+relative]),blob,"head_blob_mismatch:"+relative);
  return raw;
}
function treeRow(ref,relative){
  const row=git(["ls-tree",ref,"--",relative]);
  const m=row.match(/^(100644|100755) blob ([0-9a-f]{40})\t(.+)$/u);
  assert.ok(m,"tree_row_missing:"+ref+":"+relative);
  assert.equal(m[3],relative);
  return Object.freeze({path:relative,git_mode:m[1],git_blob_sha1:m[2]});
}

git(["merge-base","--is-ancestor",FREEZE_HEAD,"HEAD"]);
assert.equal(git(["rev-parse",FREEZE_SOURCE+"^{tree}"]),FREEZE_TREE);

const successorRaw=pin(SUCCESSOR_REL,SUCCESSOR_BLOB,64*1024);
const successor=JSON.parse(successorRaw.toString("utf8"));
assert.equal(successor.schema,"void_buy_void_presale_current_source_enforcement_successor_v1");
assert.equal(successor.marker,MARKER);
assert.equal(successor.version,1);
assert.equal(successor.successor_id,SUCCESSOR_ID);
const successorBody={...successor}; delete successorBody.successor_id;
assert.equal(
  SUCCESSOR_ID,
  "voidbuypresaleenfsucc1_"+sha256(Buffer.from(canonical(successorBody),"utf8")),
  "successor_id_invalid",
);

const freezeRaw=pin(FREEZE_REL,FREEZE_BLOB,64*1024);
const freeze=JSON.parse(freezeRaw.toString("utf8"));
assert.equal(freeze.freeze_id,FREEZE_ID);
assert.deepEqual(freeze.source_snapshot,{
  commit:FREEZE_SOURCE,
  tree:FREEZE_TREE,
  exact_source_snapshot_fixed:true,
  auto_adopt_new_main_commits:false,
  later_main_changes_require_separate_review:true,
});
assert.equal(freeze.release_gate.source_freeze_accepted,false);
assert.equal(freeze.release_gate.current_enforcement_successor_required,true);
assert.equal(freeze.release_gate.public_presale_activation,false);
assert.equal(freeze.release_gate.wc_void_activation,false);
assert.equal(freeze.release_gate.funds_movement,false);

const candidateRaw=pin(CANDIDATE_REL,CANDIDATE_BLOB,128*1024);
const lockRaw=pin(LOCK_REL,LOCK_BLOB,128*1024);
assert.equal(sha256(candidateRaw),CANDIDATE_SHA256);
assert.equal(sha256(lockRaw),LOCK_SHA256);
const candidate=JSON.parse(candidateRaw.toString("utf8"));
const lock=JSON.parse(lockRaw.toString("utf8"));

assert.equal(candidate.current_enforcement_tracked_source_inventory_count,49);
assert.equal(candidate.current_enforcement_tracked_source_inventory_v1.length,49);
assert.equal(candidate.current_enforcement_tracked_source_inventory_sha256,PROTECTED_INVENTORY_SHA);
assert.equal(candidate.complete_executable_closure_verified,true);
assert.equal(candidate.candidate_enforcement_set_sha256,ENFORCEMENT_SET);
assert.equal(candidate.candidate_enforcement_identity_accepted,false);
assert.equal(candidate.production_source_finality_authority_ready,false);
assert.equal(candidate.public_presale_activation,false);
assert.equal(candidate.funds_movement,false);

assert.equal(lock.marker,"VOID_BUY_VOID_ENFORCEMENT_FINAL_PROTECTED_V7_V2_LOCK_V2");
assert.equal(lock.candidate_evidence.git_blob_sha1,CANDIDATE_BLOB);
assert.equal(lock.candidate_evidence.candidate_enforcement_set_sha256,ENFORCEMENT_SET);
assert.equal(lock.candidate_enforcement_identity_accepted,true);
assert.equal(lock.deployed_artifact_generation_verified,false);
assert.equal(lock.production_source_finality_authority_ready,false);
assert.equal(lock.public_presale_activation,false);
assert.equal(lock.funds_movement,false);

const protectedDelta=[];
for(const row of candidate.current_enforcement_tracked_source_inventory_v1){
  const current=treeRow(FREEZE_SOURCE,row.path);
  if(current.git_blob_sha1!==row.git_blob_sha1||current.git_mode!==row.git_mode){
    protectedDelta.push({path:row.path,before:row,after:current});
  }
}
assert.deepEqual(protectedDelta,[],"frozen_source_protected_delta_present");

const historicalParent=candidate.current_enforcement_parent;
git(["cat-file","-e",historicalParent+"^{commit}"]);
const sourcePaths=[...new Set(ECONOMIC_ARTIFACT_PATHS.map(
  p=>"src/economic/"+path.basename(p,".js")+".ts"
))].sort();
assert.equal(sourcePaths.length,28);
const economicSourceDelta=[];
for(const relative of sourcePaths){
  const before=treeRow(historicalParent,relative);
  const after=treeRow(FREEZE_SOURCE,relative);
  if(before.git_blob_sha1!==after.git_blob_sha1||before.git_mode!==after.git_mode){
    economicSourceDelta.push({path:relative,before,after});
  }
}
assert.deepEqual(economicSourceDelta,[],"reviewed_economic_source_delta_present");

assert.deepEqual(successor.hosted_current_source_evidence,{
  census_workflow_run:CENSUS_RUN,
  census_cross_node_job:CENSUS_CROSS_JOB,
  census_artifact_node22:CENSUS_ARTIFACTS[0],
  census_artifact_node24:CENSUS_ARTIFACTS[1],
  census_artifact_node26:CENSUS_ARTIFACTS[2],
  census_receipt_sha256:CENSUS_RECEIPT_SHA,
  candidate_workflow_run:CANDIDATE_RUN,
  candidate_cross_node_job:CANDIDATE_CROSS_JOB,
  candidate_artifact_node22:CANDIDATE_ARTIFACTS[0],
  candidate_artifact_node24:CANDIDATE_ARTIFACTS[1],
  candidate_artifact_node26:CANDIDATE_ARTIFACTS[2],
  three_way_census_byte_identity_verified:true,
  three_way_candidate_byte_identity_verified:true,
  three_way_lock_byte_identity_verified:true,
});

assert.deepEqual(successor.current_source_revalidation,{
  protected_path_count:49,
  protected_path_delta_count:0,
  protected_path_identity_preserved:true,
  reviewed_economic_source_file_count:28,
  reviewed_economic_source_delta_count:0,
  current_built_census_identity_matches_frozen_v4:true,
  frozen_v4_census_proof_preserved:true,
  nonprotected_economic_drift_count:3,
  accepted_enforcement_set_preserved:true,
  current_source_enforcement_successor_accepted:true,
  current_source_enforcement_successor_required:false,
});

for(const key of [
  "deployed_artifact_generation_verified","runtime_mount_authority",
  "production_source_finality_authority_ready","source_freeze_accepted",
  "customer_payment_acceptance","public_presale_activation",
  "wc_void_market_activation","signing","transaction",
  "treasury_liquidity_action","funds_movement",
  "production_host_evidence_authority",
]){
  assert.equal(successor.authority[key],false,"authority_overclaim:"+key);
}
assert.equal(successor.authority.source_identity_acceptance_only,true);
assert.equal(successor.next_gate,"void_buy_void_presale_source_freeze_acceptance_v2");

console.log(MARKER+"_PROOF_GREEN");
console.log("successor_id="+SUCCESSOR_ID);
console.log("frozen_source_commit="+FREEZE_SOURCE);
console.log("protected_path_count=49");
console.log("protected_path_delta_count=0");
console.log("reviewed_economic_source_file_count=28");
console.log("reviewed_economic_source_delta_count=0");
console.log("current_built_census_identity_matches_frozen_v4=true");
console.log("accepted_enforcement_set_preserved=true");
console.log("current_source_enforcement_successor_accepted=true");
console.log("current_source_enforcement_successor_required=false");
console.log("source_freeze_accepted=false");
console.log("public_presale_activation=false");
console.log("wc_void_market_activation=false");
console.log("funds_movement=false");
console.log("next_gate=void_buy_void_presale_source_freeze_acceptance_v2");
