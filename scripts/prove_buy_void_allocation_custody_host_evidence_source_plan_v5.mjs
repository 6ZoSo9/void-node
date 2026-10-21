#!/usr/bin/env node
import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const PLAN_PATH="ops/security/buy-void-allocation-custody-host-evidence-source-plan-v5.json";
const WORKFLOW_PATH=".github/workflows/buy-void-allocation-custody-host-evidence-source-plan-v5.yml";
const SELF_PATHS=Object.freeze([
  PLAN_PATH,
  "scripts/prove_buy_void_allocation_custody_host_evidence_source_plan_v5.mjs",
  "docs/architecture/buy-void-allocation-custody-host-evidence-source-plan-v5.md",
  WORKFLOW_PATH,
]);
const SHA40=/^[0-9a-f]{40}$/u;
const SAFE_REL=/^(?:[A-Za-z0-9_.-]+\/)*[A-Za-z0-9_.-]+$/u;
const MAX_SOURCE_BYTES=8*1024*1024;

function canonical(value){
  if(value===null)return "null";
  if(typeof value==="string")return JSON.stringify(value);
  if(typeof value==="boolean")return value?"true":"false";
  if(typeof value==="number"&&Number.isSafeInteger(value))return String(value);
  if(Array.isArray(value))return "["+value.map(canonical).join(",")+"]";
  if(value&&typeof value==="object"){
    const proto=Object.getPrototypeOf(value);
    assert.ok(proto===Object.prototype||proto===null,"canonical_object_prototype_invalid");
    return "{"+Object.keys(value).sort()
      .map(key=>JSON.stringify(key)+":"+canonical(value[key])).join(",")+"}";
  }
  throw new Error("canonical_value_invalid");
}
function sameStat(a,b){
  for(const key of ["dev","ino","uid","gid","mode","nlink","size","mtimeMs","ctimeMs"]){
    assert.equal(a[key],b[key],"source_generation_changed:"+key);
  }
}
function readBoundedRegular(relative,max=MAX_SOURCE_BYTES){
  assert.equal(path.isAbsolute(relative),false,"absolute_source_path:"+relative);
  assert.match(relative,SAFE_REL,"unsafe_source_path:"+relative);
  assert.equal(relative.split("/").some(part=>part==="."||part===".."),false,
    "unsafe_source_component:"+relative);
  const before=fs.lstatSync(relative);
  assert.ok(before.isFile()&&!before.isSymbolicLink()&&before.nlink===1&&
    before.size>0&&before.size<=max,"source_shape_invalid:"+relative);
  let fd=-1;
  try{
    fd=fs.openSync(relative,
      fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW|fs.constants.O_NONBLOCK);
    const opened=fs.fstatSync(fd);
    assert.ok(opened.isFile()&&opened.nlink===1&&opened.size>0&&opened.size<=max,
      "opened_source_shape_invalid:"+relative);
    sameStat(opened,before);
    const chunks=[];
    const scratch=Buffer.alloc(Math.min(64*1024,max+1));
    let total=0;
    while(total<=max){
      const want=Math.min(scratch.length,max+1-total);
      if(want===0)break;
      const n=fs.readSync(fd,scratch,0,want,null);
      if(n===0)break;
      chunks.push(Buffer.from(scratch.subarray(0,n)));
      total+=n;
    }
    assert.ok(total<=max,"source_size_limit:"+relative);
    assert.equal(total,opened.size,"source_short_or_grown_read:"+relative);
    sameStat(fs.fstatSync(fd),opened);
    sameStat(fs.lstatSync(relative),opened);
    return Buffer.concat(chunks,total);
  }finally{
    if(fd>=0)fs.closeSync(fd);
  }
}
function gitBlob(bytes){
  return crypto.createHash("sha1")
    .update(Buffer.from("blob "+String(bytes.length)+"\0","utf8"))
    .update(bytes).digest("hex");
}
function exactKeys(obj,keys,label){
  assert.ok(obj&&typeof obj==="object"&&!Array.isArray(obj),label+"_object_required");
  assert.deepEqual(Object.keys(obj).sort(),[...keys].sort(),label+"_keys");
}
function git(args){
  const env={
    PATH:"/usr/bin:/bin",
    HOME:"/nonexistent",
    LANG:"C",
    LC_ALL:"C",
    GIT_CONFIG_NOSYSTEM:"1",
    GIT_CONFIG_GLOBAL:"/dev/null",
    GIT_OPTIONAL_LOCKS:"0",
  };
  return execFileSync("/usr/bin/git",args,{
    cwd:process.cwd(),
    encoding:"utf8",
    env,
    maxBuffer:1024*1024,
  }).trimEnd();
}

const raw=readBoundedRegular(PLAN_PATH,512*1024);
const text=new TextDecoder("utf-8",{fatal:true}).decode(raw);
const parsed=JSON.parse(text);
assert.equal(canonical(parsed)+"\n",text,"plan_not_canonical_json");
exactKeys(parsed,[
  "authority","base_head","base_pr","base_tree","marker","next_gate","plan_id",
  "schema","source_bindings","source_composition","version",
],"plan");
assert.equal(parsed.schema,"void_buy_void_allocation_custody_host_evidence_source_plan_v5");
assert.equal(parsed.marker,"VOID_BUY_VOID_ALLOCATION_CUSTODY_HOST_EVIDENCE_SOURCE_PLAN_V5");
assert.equal(parsed.version,5);
assert.equal(parsed.base_pr,3666);
assert.equal(parsed.base_head,"ea20cb6bf7420692315df71623ffb38ed1810fcf");
assert.equal(parsed.base_tree,"7291e5d11162742cff4de925800160ce598f98af");

const checkoutHead=git(["rev-parse","HEAD"]);
assert.match(checkoutHead,SHA40,"checkout_head_invalid");
assert.equal(
  git(["rev-parse",parsed.base_head+"^{tree}"]),
  parsed.base_tree,
  "declared_base_tree_mismatch",
);
assert.equal(
  git(["merge-base",parsed.base_head,checkoutHead]),
  parsed.base_head,
  "declared_base_not_ancestor",
);
const diffText=git([
  "diff","--name-status","--no-renames",parsed.base_head,checkoutHead,"--",
]);
const diffRows=diffText?diffText.split("\n").map(line=>line.split("\t")):[];
assert.equal(diffRows.length,SELF_PATHS.length,"committed_scope_count_mismatch");
assert.deepEqual(
  diffRows.map(parts=>parts[0]),
  Array(SELF_PATHS.length).fill("A"),
  "committed_scope_not_add_only",
);
assert.deepEqual(
  diffRows.map(parts=>parts[1]).sort(),
  [...SELF_PATHS].sort(),
  "committed_scope_paths_mismatch",
);

assert.equal(parsed.next_gate,
  "separately_authorized_read_only_complete_host_evidence_collector_v5");

const material={...parsed};
delete material.plan_id;
const planDigest=crypto.createHash("sha256")
  .update(canonical(material),"utf8").digest("hex");
assert.equal(parsed.plan_id,"voidbuycusthostsrcplan5_"+planDigest);

assert.ok(Array.isArray(parsed.source_bindings));
assert.equal(parsed.source_bindings.length,31);
const seen=new Set();
let previous="";
for(const row of parsed.source_bindings){
  exactKeys(row,["git_blob_sha1","path"],"source_binding");
  assert.match(row.path,SAFE_REL,"source_binding_path_invalid");
  assert.match(row.git_blob_sha1,SHA40,"source_binding_blob_invalid");
  assert.ok(row.path>previous,"source_bindings_not_strictly_sorted");
  previous=row.path;
  assert.equal(seen.has(row.path),false,"duplicate_source_binding");
  seen.add(row.path);
  const bytes=readBoundedRegular(row.path);
  assert.equal(gitBlob(bytes),row.git_blob_sha1,"source_blob_drift:"+row.path);
}


const serviceDirectImports=Object.freeze([
  ["../dist/economic/buy_void_allocation_reservation_ledger_v1.js",
    "src/economic/buy_void_allocation_reservation_ledger_v1.ts"],
  ["../dist/economic/buy_void_allocation_reservation_high_water_v1.js",
    "src/economic/buy_void_allocation_reservation_high_water_v1.ts"],
  ["../dist/economic/buy_void_verified_allocation_replay_binding_v1.js",
    "src/economic/buy_void_verified_allocation_replay_binding_v1.ts"],
  ["../src/economic/buy_void_custody_allocation_roots_observed_read_v1.mjs",
    "src/economic/buy_void_custody_allocation_roots_observed_read_v1.mjs"],
  ["../src/economic/buy_void_custody_payment_ledgers_observed_read_v1.mjs",
    "src/economic/buy_void_custody_payment_ledgers_observed_read_v1.mjs"],
  ["../src/economic/buy_void_cross_uid_capacity_exclusive_lock_v1.mjs",
    "src/economic/buy_void_cross_uid_capacity_exclusive_lock_v1.mjs"],
]);
const serviceText=new TextDecoder("utf-8",{fatal:true}).decode(
  readBoundedRegular("tools/void-buy-allocation-custody-service-v2.mjs")
);
for(const [importRelative,sourceRelative] of serviceDirectImports){
  assert.equal(seen.has(sourceRelative),true,
    "custody_service_direct_source_binding_missing:"+sourceRelative);
  assert.equal(serviceText.includes('from "'+importRelative+'"'),true,
    "custody_service_direct_import_missing:"+importRelative);
}
for(const relative of [
  "ops/security/buy-void-user-manager-query-elf-lock-v6.json",
  "scripts/prove_void_buy_user_manager_cap_last_cap_projection_v6.mjs",
  "scripts/prove_void_buy_user_manager_query_elf_lock_v6.mjs",
  "scripts/prove_void_buy_void_user_manager_query_live_qualification_v6.py",
]){
  assert.equal(seen.has(relative),true,"user_manager_v6_contract_binding_missing:"+relative);
}

const expectedComposition={"authenticated_user_manager_v4_historical_semantics_bound":true,"authenticated_user_manager_v6_acceptance_contract_bound":true,"custody_service_v2_source_bound":true,"historical_v1_storage_mount_double_census_semantics_bound":true,"polkit_deny_profile_source_bound":true,"presale_custody_collector_v2_source_bound":true,"rollback_second_control_source_bound":true,"socket_runtime_directory_policy_source_bound":true,"stable_request_root_policy_source_bound":true};
assert.deepEqual(parsed.source_composition,expectedComposition);
const expectedAuthority={"complete_host_evidence_collector":false,"custody_service_v2_live_config_verified":false,"double_census_stability_live_verified":false,"evidence_generation_monotonicity_proven":false,"external_transport_authenticated":false,"external_witness_storage_proven":false,"filesystem_write":false,"funds_movement":false,"host_mutation":false,"host_read_performed":false,"independent_custody_proven":false,"payment_acceptance":false,"polkit_runtime_control_denial_live_verified":false,"production_host_evidence_authority":false,"public_presale_activation":false,"request_root_host_profile_live_verified":false,"service_mutation":false,"socket_runtime_directory_live_verified":false,"source_only_plan":true,"storage_mount_evidence_live_verified":false,"trusted_verification_clock_proven":false};
assert.deepEqual(parsed.authority,expectedAuthority);

const workflowText=new TextDecoder("utf-8",{fatal:true})
  .decode(readBoundedRegular(WORKFLOW_PATH,512*1024));
const triggerBlock=workflowText.split("  workflow_dispatch:",1)[0];
const triggerPaths=new Set();
for(const line of triggerBlock.split("\n")){
  const stripped=line.trim();
  if(stripped.startsWith('- "')&&stripped.endsWith('"')){
    triggerPaths.add(stripped.slice(3,-1));
  }
}
for(const relative of [...seen,...SELF_PATHS]){
  assert.equal(triggerPaths.has(relative),true,"workflow_trigger_missing:"+relative);
}

console.log("VOID_BUY_VOID_ALLOCATION_CUSTODY_HOST_EVIDENCE_SOURCE_PLAN_V5_PROOF_GREEN");
console.log("source_binding_count=31");
console.log("custody_service_v2_direct_source_closure_bound=true");
console.log("custody_service_v2_direct_import_count=6");
console.log("authenticated_user_manager_v4_historical_semantics_bound=true");
console.log("authenticated_user_manager_v6_acceptance_contract_bound=true");
console.log("declared_base_tree_verified=true");
console.log("declared_base_ancestor_verified=true");
console.log("exact_four_add_only_scope_verified=true");
console.log("authenticated_user_manager_v4_source_bound=true");
console.log("custody_service_v2_source_bound=true");
console.log("stable_request_root_policy_source_bound=true");
console.log("socket_runtime_directory_policy_source_bound=true");
console.log("polkit_deny_profile_source_bound=true");
console.log("historical_v1_storage_mount_double_census_semantics_bound=true");
console.log("presale_custody_collector_v2_source_bound=true");
console.log("rollback_second_control_source_bound=true");
console.log("workflow_trigger_dependency_closure=true");
console.log("complete_host_evidence_collector=false");
console.log("production_host_evidence_authority=false");
console.log("host_read_performed=false");
console.log("trusted_verification_clock_proven=false");
console.log("evidence_generation_monotonicity_proven=false");
console.log("external_transport_authenticated=false");
console.log("external_witness_storage_proven=false");
console.log("payment_acceptance=false");
console.log("public_presale_activation=false");
console.log("funds_movement=false");
