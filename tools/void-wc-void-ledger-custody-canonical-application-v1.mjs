#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

export const VOID_WC_VOID_LEDGER_CUSTODY_CANONICAL_APPLICATION_PLAN_V1 =
  "VOID_WC_VOID_LEDGER_CUSTODY_CANONICAL_APPLICATION_PLAN_V1";
export const VOID_WC_VOID_LEDGER_CUSTODY_CANONICAL_APPLICATION_V1 =
  "VOID_WC_VOID_LEDGER_CUSTODY_CANONICAL_APPLICATION_V1";

export const VOID_WC_VOID_LEDGER_CUSTODY_CANONICAL_APPLICATION_AUTHORITY_V1 =
  Object.freeze({
    source_only_application:true,
    exact_ledger_import_input_required:true,
    exact_promotion_receipt_required:true,
    promotion_reexecution_required:true,
    canonical_head_candidate_bytes_required:true,
    reviewed_repository_generation_required:true,
    exact_four_field_source_delta:true,
    canonical_classifier_reexecution:true,
    reviewed_git_commit_required:true,
    reviewed_git_object_execution_required:true,
    reviewed_package_runtime_required:true,
    permission_fenced_execution_required:true,
    minimal_git_environment_required:true,
    ambient_loader_tool_overrides_ignored:true,
    execution_child_process_limited_to_reviewed_git:true,
    execution_network_isolation_provided:false,
    private_temporary_filesystem_write:true,
    repository_source_write:false,
    filesystem_read:true,
    filesystem_write:true,
    rpc_call:false,
    production_ledger_read:false,
    production_ledger_write:false,
    wc_balance_mutation:false,
    credential_access:false,
    wallet_or_signer_access:false,
    private_key_access:false,
    transaction_construction:false,
    transaction_signing:false,
    transaction_submission:false,
    transaction_broadcast:false,
    authoritative_chain2050_write:false,
    inventory_funding:false,
    liquidity_movement:false,
    coupled_activation:false,
    market_activation:false,
    public_presale_activation:false,
    funds_movement:false,
  });

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const GIT="/usr/bin/git";
const TOOL_REL="tools/void-wc-void-ledger-custody-canonical-application-v1.mjs";
const PROMOTION_TOOL_REL=
  "tools/void-wc-void-ledger-custody-coupled-candidate-promotion-v1.mjs";
const PRODUCTION_CLASSIFIER_REL="tools/void-wc-void-production-readiness-v1.mjs";
const COUPLED_CLASSIFIER_REL="tools/void-coupled-economic-successor-gate-v1.mjs";
const IMPORT_TOOL_REL="tools/void-wc-void-ledger-persistence-import-v1.mjs";
const REVIEWED_RUNTIME_TOOL_REL="tools/void-reviewed-node-package-runtime-v1.mjs";
const REVIEWED_RUNTIME_PROFILE_REL=
  "ops/security/reviewed-node-package-runtime-ethers-v1.json";
const REVIEWED_EXECUTION_ROOTS=Object.freeze([
  PROMOTION_TOOL_REL,
  PRODUCTION_CLASSIFIER_REL,
  COUPLED_CLASSIFIER_REL,
  IMPORT_TOOL_REL,
]);
const REVIEWED_AUTHORITY_ENVELOPE_MARKER=
  "VOID_WC_VOID_LEDGER_CUSTODY_REVIEWED_AUTHORITY_V1";
const PRODUCTION_REL="ops/mainnet0/wc-void-production-candidate-v1.json";
const COUPLED_REL="ops/mainnet0/coupled-economic-successor-gate-candidate-v1.json";
const SUCCESSOR_REL="ops/mainnet0/economic-evm-successor-migration-candidate-v1.json";
const HEX40=/^[0-9a-f]{40}$/u;
const HEX64=/^[0-9a-f]{64}$/u;
const PLAN_ID=/^voidwclcca1_[0-9a-f]{64}$/u;
const PROMOTION_ID=/^voidwclccp1_[0-9a-f]{64}$/u;
const MAX_BYTES=64*1024*1024;

const INPUT_KEYS=Object.freeze([
  "ledger_import_input_bytes",
  "ledger_import_input_file_sha256",
  "promotion_receipt_bytes",
  "promotion_receipt_file_sha256",
]);

const PLAN_KEYS=Object.freeze([
  "marker","version","status","chain_id","execution_epoch","pair",
  "application_base_head_sha","application_base_tree_sha",
  "application_tool_git_blob_sha1","promotion_tool_git_blob_sha1",
  "production_classifier_git_blob_sha1","coupled_classifier_git_blob_sha1",
  "ledger_import_tool_git_blob_sha1",
  "reviewed_execution_module_git_blobs",
  "reviewed_runtime_tool_git_blob_sha1",
  "reviewed_runtime_profile_git_blob_sha1",
  "reviewed_runtime_profile_id",
  "reviewed_runtime_packages_aggregate_sha256",
  "reviewed_execution_permission_fenced",
  "reviewed_execution_ancestor_package_resolution_allowed",
  "reviewed_execution_network_isolation_provided",
  "ledger_import_input_file_sha256","promotion_receipt_file_sha256",
  "promotion_id","ledger_persistence_import_id",
  "production_candidate_path","production_source_git_blob_sha1",
  "production_source_file_sha256","production_target_git_blob_sha1",
  "production_target_file_sha256","production_target_candidate",
  "coupled_candidate_path","coupled_source_git_blob_sha1",
  "coupled_source_file_sha256","coupled_target_git_blob_sha1",
  "coupled_target_file_sha256","coupled_target_candidate",
  "successor_candidate_path","successor_source_git_blob_sha1",
  "successor_source_file_sha256",
  "production_before","production_after","coupled_before","coupled_after",
  "promoted_production_fields","promoted_coupled_gates",
  "wc_ledger_persistence_verified","quote_reserve_custody_verified",
  "production_status_remains_hold","coupled_status_remains_hold",
  "coupled_activation_ready","reviewed_git_commit_required",
  "market_activation_authorized","public_presale_activation_authorized",
  "funds_movement_authorized","authority","application_plan_id",
]);

function fail(code){throw new Error(code);}
function plain(v){return v!==null&&typeof v==="object"&&!Array.isArray(v);}
function exactObject(v,keys,code){
  if(!plain(v)) fail(code);
  const actual=Object.keys(v).sort();
  const expected=[...keys].sort();
  if(actual.length!==expected.length||actual.some((k,i)=>k!==expected[i])) fail(code);
  return v;
}
function canonicalJson(v){
  if(v===null) return "null";
  if(typeof v==="string") return JSON.stringify(v);
  if(typeof v==="boolean") return v?"true":"false";
  if(typeof v==="number"&&Number.isSafeInteger(v)) return String(v);
  if(Array.isArray(v)) return "["+v.map(canonicalJson).join(",")+"]";
  if(plain(v)){
    return "{"+Object.keys(v).sort().map(k=>JSON.stringify(k)+":"+canonicalJson(v[k])).join(",")+"}";
  }
  fail("LEDGER_CUSTODY_APPLICATION_CANONICAL_VALUE_INVALID");
}
function sha256(bytes){return createHash("sha256").update(bytes).digest("hex");}
function gitBlobSha1(bytes){
  return createHash("sha1")
    .update(Buffer.from("blob "+bytes.length+"\0","utf8"))
    .update(bytes)
    .digest("hex");
}
function prettyBytes(v){return Buffer.from(JSON.stringify(v,null,2)+"\n","utf8");}
function deepFreeze(v,seen=new WeakSet()){
  if(v===null||typeof v!=="object") return v;
  if(seen.has(v)) return v;
  seen.add(v);
  for(const key of Reflect.ownKeys(v)) deepFreeze(v[key],seen);
  return Object.freeze(v);
}
function sanitizedGitEnv(){
  return {
    PATH:"/usr/bin:/bin",
    LANG:"C",
    LC_ALL:"C",
    HOME:"/nonexistent",
    XDG_CONFIG_HOME:"/nonexistent",
    GIT_NO_REPLACE_OBJECTS:"1",
    GIT_CONFIG_NOSYSTEM:"1",
    GIT_CONFIG_GLOBAL:"/dev/null",
    GIT_CONFIG_SYSTEM:"/dev/null",
    GIT_ATTR_NOSYSTEM:"1",
    GIT_TERMINAL_PROMPT:"0",
    GIT_OPTIONAL_LOCKS:"0",
    GIT_ASKPASS:"/bin/false",
  };
}
const REVIEWED_GIT_CONFIG_ARGS=Object.freeze([
  "-c","core.hooksPath=/dev/null",
  "-c","core.attributesFile=/dev/null",
  "-c","core.fsmonitor=false",
  "-c","core.untrackedCache=false",
  "-c","core.preloadIndex=false",
  "-c","submodule.recurse=false",
]);
function gitRun(args,code,{encoding="utf8",allowFail=false,cwd=ROOT}={}){
  const result=spawnSync(
    GIT,
    ["--no-replace-objects",...REVIEWED_GIT_CONFIG_ARGS,"-C",cwd,...args],
    {
      encoding,
      env:sanitizedGitEnv(),
      stdio:["ignore","pipe","pipe"],
      maxBuffer:MAX_BYTES+1024,
      timeout:120_000,
    },
  );
  if(result.error) throw result.error;
  if(result.status!==0&&!allowFail) fail(code);
  return result;
}
function git(args,code,{encoding="utf8"}={}){
  return gitRun(args,code,{encoding}).stdout;
}
function gitText(args,code,{allowEmpty=false}={}){
  const value=String(git(args,code)).trim();
  if(!allowEmpty&&!value) fail(code);
  return value;
}
function gitBytes(args,code){return Buffer.from(git(args,code,{encoding:null}));}
function repositoryIdentity(){
  const status=gitText(
    ["status","--porcelain=v1","--untracked-files=all"],
    "LEDGER_CUSTODY_APPLICATION_REPOSITORY_STATUS_UNAVAILABLE",
    {allowEmpty:true},
  );
  if(status!=="") fail("LEDGER_CUSTODY_APPLICATION_REPOSITORY_MUST_BE_CLEAN");
  const head=gitText(["rev-parse","HEAD"],"LEDGER_CUSTODY_APPLICATION_HEAD_UNAVAILABLE");
  const tree=gitText(["rev-parse","HEAD^{tree}"],"LEDGER_CUSTODY_APPLICATION_TREE_UNAVAILABLE");
  const branch=gitText(
    ["branch","--show-current"],
    "LEDGER_CUSTODY_APPLICATION_BRANCH_UNAVAILABLE",
    {allowEmpty:true},
  );
  if(!HEX40.test(head)||!HEX40.test(tree)) fail("LEDGER_CUSTODY_APPLICATION_REPOSITORY_IDENTITY_INVALID");
  return Object.freeze({head,tree,branch});
}
function commitFile(commit,rel,label){
  if(typeof commit!=="string"||!HEX40.test(commit)){
    fail("LEDGER_CUSTODY_APPLICATION_"+label+"_COMMIT_INVALID");
  }
  const bytes=gitBytes(
    ["show",commit+":"+rel],
    "LEDGER_CUSTODY_APPLICATION_"+label+"_BYTES_UNAVAILABLE",
  );
  if(bytes.length<2||bytes.length>MAX_BYTES){
    fail("LEDGER_CUSTODY_APPLICATION_"+label+"_BYTES_INVALID");
  }
  let value;
  try{
    value=JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(bytes));
  }catch{
    fail("LEDGER_CUSTODY_APPLICATION_"+label+"_JSON_INVALID");
  }
  if(!plain(value)){
    fail("LEDGER_CUSTODY_APPLICATION_"+label+"_OBJECT_REQUIRED");
  }
  const blob=gitText(
    ["rev-parse",commit+":"+rel],
    "LEDGER_CUSTODY_APPLICATION_"+label+"_BLOB_UNAVAILABLE",
  );
  if(!HEX40.test(blob)||gitBlobSha1(bytes)!==blob){
    fail("LEDGER_CUSTODY_APPLICATION_"+label+"_BLOB_MISMATCH");
  }
  return Object.freeze({
    bytes,
    value,
    sha256:sha256(bytes),
    blob_sha1:blob,
  });
}
function headFile(rel,label){
  const head=gitText(
    ["rev-parse","HEAD"],
    "LEDGER_CUSTODY_APPLICATION_"+label+"_HEAD_UNAVAILABLE",
  );
  if(!HEX40.test(head)){
    fail("LEDGER_CUSTODY_APPLICATION_"+label+"_HEAD_INVALID");
  }
  return commitFile(head,rel,label);
}
function parseJsonBytes(bytes,expectedSha,label){
  if(!Buffer.isBuffer(bytes)||bytes.length<2||bytes.length>MAX_BYTES) fail(label+"_BYTES_INVALID");
  if(typeof expectedSha!=="string"||!HEX64.test(expectedSha)) fail(label+"_SHA256_INVALID");
  if(sha256(bytes)!==expectedSha) fail(label+"_SHA256_MISMATCH");
  let value;
  try{value=JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(bytes));}
  catch{fail(label+"_JSON_INVALID");}
  if(!plain(value)) fail(label+"_OBJECT_REQUIRED");
  return Object.freeze({bytes:Buffer.from(bytes),sha256:expectedSha,value});
}
function summary(d){
  return Object.freeze({
    ok:d?.ok===true,
    status:typeof d?.status==="string"?d.status:"UNKNOWN",
    reason:typeof d?.reason==="string"?d.reason:null,
    missing_gates:Object.freeze(Array.isArray(d?.missing_gates)?[...d.missing_gates]:[]),
  });
}
function removeGates(values,removed){
  return values.filter(v=>!removed.includes(v));
}
function sameStrings(a,b){
  return Array.isArray(a)&&Array.isArray(b)&&
    a.length===b.length&&a.every((v,i)=>v===b[i]);
}
function exactAuthority(v){
  exactObject(
    v,
    Object.keys(VOID_WC_VOID_LEDGER_CUSTODY_CANONICAL_APPLICATION_AUTHORITY_V1),
    "LEDGER_CUSTODY_APPLICATION_AUTHORITY_SHAPE_INVALID",
  );
  if(
    canonicalJson(v)!==
    canonicalJson(VOID_WC_VOID_LEDGER_CUSTODY_CANONICAL_APPLICATION_AUTHORITY_V1)
  ) fail("LEDGER_CUSTODY_APPLICATION_AUTHORITY_MISMATCH");
}
function planBody(plan){
  const out={};
  for(const key of PLAN_KEYS) if(key!=="application_plan_id") out[key]=plan[key];
  return out;
}
function assertTargetDelta(productionSource,productionTarget,coupledSource,coupledTarget){
  const p=structuredClone(productionTarget);
  if(
    productionSource.wc_ledger_persistence_verified!==false||
    productionSource.quote_reserve_custody_verified!==false||
    productionTarget.wc_ledger_persistence_verified!==true||
    productionTarget.quote_reserve_custody_verified!==true||
    productionTarget.coupled_activation_ready!==false||
    productionTarget.status!=="hold"
  ) fail("LEDGER_CUSTODY_APPLICATION_PRODUCTION_DELTA_INVALID");
  p.wc_ledger_persistence_verified=false;
  p.quote_reserve_custody_verified=false;
  if(canonicalJson(p)!==canonicalJson(productionSource)){
    fail("LEDGER_CUSTODY_APPLICATION_PRODUCTION_CHANGE_SCOPE_INVALID");
  }

  const c=structuredClone(coupledTarget);
  if(
    coupledSource?.gates?.wc_ledger_persistence_verified!==false||
    coupledSource?.gates?.quote_reserve_custody_verified!==false||
    coupledTarget?.gates?.wc_ledger_persistence_verified!==true||
    coupledTarget?.gates?.quote_reserve_custody_verified!==true||
    coupledTarget?.gates?.coupled_activation_ready!==false||
    coupledTarget.status!=="HOLD"
  ) fail("LEDGER_CUSTODY_APPLICATION_COUPLED_DELTA_INVALID");
  c.gates.wc_ledger_persistence_verified=false;
  c.gates.quote_reserve_custody_verified=false;
  if(canonicalJson(c)!==canonicalJson(coupledSource)){
    fail("LEDGER_CUSTODY_APPLICATION_COUPLED_CHANGE_SCOPE_INVALID");
  }
}
function validatePlan(plan){
  exactObject(plan,PLAN_KEYS,"LEDGER_CUSTODY_APPLICATION_PLAN_SHAPE_INVALID");
  if(
    plan.marker!==VOID_WC_VOID_LEDGER_CUSTODY_CANONICAL_APPLICATION_PLAN_V1||
    plan.version!==1||
    plan.status!=="LEDGER_CUSTODY_CANONICAL_APPLICATION_PREPARED"||
    plan.chain_id!==2050||
    plan.execution_epoch!==2||
    plan.pair!=="WC_VOID"||
    !PLAN_ID.test(String(plan.application_plan_id||""))||
    !PROMOTION_ID.test(String(plan.promotion_id||""))||
    plan.production_candidate_path!==PRODUCTION_REL||
    plan.coupled_candidate_path!==COUPLED_REL||
    plan.successor_candidate_path!==SUCCESSOR_REL||
    plan.wc_ledger_persistence_verified!==true||
    plan.quote_reserve_custody_verified!==true||
    plan.production_status_remains_hold!==true||
    plan.coupled_status_remains_hold!==true||
    plan.coupled_activation_ready!==false||
    plan.reviewed_git_commit_required!==true||
    plan.market_activation_authorized!==false||
    plan.public_presale_activation_authorized!==false||
    plan.funds_movement_authorized!==false
  ) fail("LEDGER_CUSTODY_APPLICATION_PLAN_INVALID");
  for(const key of [
    "application_base_head_sha","application_base_tree_sha",
    "application_tool_git_blob_sha1","promotion_tool_git_blob_sha1",
    "production_classifier_git_blob_sha1","coupled_classifier_git_blob_sha1",
    "ledger_import_tool_git_blob_sha1","production_source_git_blob_sha1",
    "production_target_git_blob_sha1","coupled_source_git_blob_sha1",
    "coupled_target_git_blob_sha1","successor_source_git_blob_sha1",
  ]) if(!HEX40.test(String(plan[key]||""))) fail("LEDGER_CUSTODY_APPLICATION_PLAN_GIT_ID_INVALID:"+key);
  for(const key of [
    "ledger_import_input_file_sha256","promotion_receipt_file_sha256",
    "production_source_file_sha256","production_target_file_sha256",
    "coupled_source_file_sha256","coupled_target_file_sha256",
    "successor_source_file_sha256",
  ]) if(!HEX64.test(String(plan[key]||""))) fail("LEDGER_CUSTODY_APPLICATION_PLAN_DIGEST_INVALID:"+key);
  exactAuthority(plan.authority);
  if("voidwclcca1_"+sha256(Buffer.from(canonicalJson(planBody(plan)),"utf8"))!==plan.application_plan_id){
    fail("LEDGER_CUSTODY_APPLICATION_PLAN_ID_MISMATCH");
  }

  const baseTree=gitText(
    ["rev-parse",plan.application_base_head_sha+"^{tree}"],
    "LEDGER_CUSTODY_APPLICATION_PLAN_BASE_TREE_UNAVAILABLE",
  );
  if(baseTree!==plan.application_base_tree_sha){
    fail("LEDGER_CUSTODY_APPLICATION_PLAN_BASE_TREE_MISMATCH");
  }

  for(const [rel,expectedBlob,code] of [
    [
      TOOL_REL,
      plan.application_tool_git_blob_sha1,
      "LEDGER_CUSTODY_APPLICATION_PLAN_APPLICATION_TOOL_BLOB_MISMATCH",
    ],
    [
      PROMOTION_TOOL_REL,
      plan.promotion_tool_git_blob_sha1,
      "LEDGER_CUSTODY_APPLICATION_PLAN_PROMOTION_TOOL_BLOB_MISMATCH",
    ],
    [
      PRODUCTION_CLASSIFIER_REL,
      plan.production_classifier_git_blob_sha1,
      "LEDGER_CUSTODY_APPLICATION_PLAN_PRODUCTION_CLASSIFIER_BLOB_MISMATCH",
    ],
    [
      COUPLED_CLASSIFIER_REL,
      plan.coupled_classifier_git_blob_sha1,
      "LEDGER_CUSTODY_APPLICATION_PLAN_COUPLED_CLASSIFIER_BLOB_MISMATCH",
    ],
    [
      IMPORT_TOOL_REL,
      plan.ledger_import_tool_git_blob_sha1,
      "LEDGER_CUSTODY_APPLICATION_PLAN_IMPORT_TOOL_BLOB_MISMATCH",
    ],
  ]){
    const actual=gitText(
      ["rev-parse",plan.application_base_head_sha+":"+rel],
      code+"_UNAVAILABLE",
    );
    if(actual!==expectedBlob) fail(code);
  }

  const baseProduction=commitFile(
    plan.application_base_head_sha,
    PRODUCTION_REL,
    "PLAN_BASE_PRODUCTION",
  );
  const baseCoupled=commitFile(
    plan.application_base_head_sha,
    COUPLED_REL,
    "PLAN_BASE_COUPLED",
  );
  const baseSuccessor=commitFile(
    plan.application_base_head_sha,
    SUCCESSOR_REL,
    "PLAN_BASE_SUCCESSOR",
  );
  if(
    baseProduction.blob_sha1!==plan.production_source_git_blob_sha1||
    baseProduction.sha256!==plan.production_source_file_sha256||
    baseCoupled.blob_sha1!==plan.coupled_source_git_blob_sha1||
    baseCoupled.sha256!==plan.coupled_source_file_sha256||
    baseSuccessor.blob_sha1!==plan.successor_source_git_blob_sha1||
    baseSuccessor.sha256!==plan.successor_source_file_sha256
  ){
    fail("LEDGER_CUSTODY_APPLICATION_PLAN_BASE_SOURCE_MISMATCH");
  }

  const expectedProductionFields=[
    "quote_reserve_custody_verified",
    "wc_ledger_persistence_verified",
  ];
  const expectedCoupledGates=[
    "quote_reserve_custody_verified",
    "wc_ledger_persistence_verified",
  ];
  if(
    canonicalJson(plan.promoted_production_fields)!==
      canonicalJson(expectedProductionFields)||
    canonicalJson(plan.promoted_coupled_gates)!==
      canonicalJson(expectedCoupledGates)
  ){
    fail("LEDGER_CUSTODY_APPLICATION_PLAN_PROMOTED_FIELDS_INVALID");
  }

  assertTargetDelta(
    baseProduction.value,
    plan.production_target_candidate,
    baseCoupled.value,
    plan.coupled_target_candidate,
  );

  const productionBefore=
    classifyVoidWcVoidProductionReadinessV1(baseProduction.value);
  const productionAfter=
    classifyVoidWcVoidProductionReadinessV1(plan.production_target_candidate);
  const coupledBefore=
    classifyVoidCoupledEconomicSuccessorGateV1(
      baseCoupled.value,
      baseSuccessor.value,
    );
  const coupledAfter=
    classifyVoidCoupledEconomicSuccessorGateV1(
      plan.coupled_target_candidate,
      baseSuccessor.value,
    );
  const removed=[
    "wc_ledger_persistence_verification_required",
    "quote_reserve_custody_verification_required",
  ];
  if(
    canonicalJson(summary(productionBefore))!==
      canonicalJson(plan.production_before)||
    canonicalJson(summary(productionAfter))!==
      canonicalJson(plan.production_after)||
    canonicalJson(summary(coupledBefore))!==
      canonicalJson(plan.coupled_before)||
    canonicalJson(summary(coupledAfter))!==
      canonicalJson(plan.coupled_after)||
    productionBefore?.status!=="HOLD"||
    productionAfter?.status!=="HOLD"||
    coupledBefore?.status!=="HOLD"||
    coupledAfter?.status!=="HOLD"||
    !sameStrings(
      productionAfter.missing_gates,
      removeGates(productionBefore.missing_gates,removed),
    )||
    !sameStrings(
      coupledAfter.missing_gates,
      removeGates(coupledBefore.missing_gates,removed),
    )
  ){
    fail("LEDGER_CUSTODY_APPLICATION_PLAN_CLASSIFIER_LINEAGE_MISMATCH");
  }

  const productionTargetBytes=prettyBytes(plan.production_target_candidate);
  const coupledTargetBytes=prettyBytes(plan.coupled_target_candidate);
  if(
    sha256(productionTargetBytes)!==plan.production_target_file_sha256||
    gitBlobSha1(productionTargetBytes)!==plan.production_target_git_blob_sha1||
    sha256(coupledTargetBytes)!==plan.coupled_target_file_sha256||
    gitBlobSha1(coupledTargetBytes)!==plan.coupled_target_git_blob_sha1
  ) fail("LEDGER_CUSTODY_APPLICATION_PLAN_TARGET_IDENTITY_MISMATCH");
  return plan;
}

export function prepareVoidWcVoidLedgerCustodyCanonicalApplicationV1(input){
  const request=exactObject(
    input,INPUT_KEYS,"INVALID_LEDGER_CUSTODY_CANONICAL_APPLICATION_INPUT_SHAPE",
  );
  const importSource=parseJsonBytes(
    request.ledger_import_input_bytes,
    request.ledger_import_input_file_sha256,
    "LEDGER_CUSTODY_APPLICATION_IMPORT_INPUT",
  );
  const receiptSource=parseJsonBytes(
    request.promotion_receipt_bytes,
    request.promotion_receipt_file_sha256,
    "LEDGER_CUSTODY_APPLICATION_PROMOTION_RECEIPT",
  );

  const repo=repositoryIdentity();
  const production=headFile(PRODUCTION_REL,"PRODUCTION_SOURCE");
  const coupled=headFile(COUPLED_REL,"COUPLED_SOURCE");
  const successor=headFile(SUCCESSOR_REL,"SUCCESSOR_SOURCE");

  const reexecuted=buildVoidWcVoidLedgerCustodyCoupledCandidatePromotionV1({
    candidate:coupled.value,
    successorMigrationCandidate:successor.value,
    ledgerPersistenceImportInput:importSource.value,
    ledgerPersistenceImportInputFileSha256:importSource.sha256,
    candidateFileSha256:coupled.sha256,
    successorCandidateFileSha256:successor.sha256,
    repositoryHeadSha:repo.head,
    repositoryTreeSha:repo.tree,
  });
  if(canonicalJson(reexecuted)!==canonicalJson(receiptSource.value)){
    fail("LEDGER_CUSTODY_APPLICATION_REVIEWED_PROMOTION_RECEIPT_MISMATCH");
  }
  if(
    reexecuted.marker!==VOID_WC_VOID_LEDGER_CUSTODY_COUPLED_CANDIDATE_PROMOTION_V1||
    reexecuted.canonical_candidate_file_updated!==false||
    reexecuted.candidate_promotion_application_required!==true||
    reexecuted.coupled_activation_ready!==false||
    canonicalJson(reexecuted.authority)!==
      canonicalJson(VOID_WC_VOID_LEDGER_CUSTODY_COUPLED_CANDIDATE_PROMOTION_AUTHORITY_V1)
  ) fail("LEDGER_CUSTODY_APPLICATION_PROMOTION_CONTRACT_INVALID");

  const productionBefore=classifyVoidWcVoidProductionReadinessV1(production.value);
  const coupledBefore=classifyVoidCoupledEconomicSuccessorGateV1(coupled.value,successor.value);
  if(
    productionBefore?.status!=="HOLD"||
    !productionBefore?.missing_gates?.includes("wc_ledger_persistence_verification_required")||
    !productionBefore?.missing_gates?.includes("quote_reserve_custody_verification_required")
  ) fail("LEDGER_CUSTODY_APPLICATION_PRODUCTION_PRESTATE_INVALID");
  if(
    coupledBefore?.status!=="HOLD"||
    !coupledBefore?.missing_gates?.includes("wc_ledger_persistence_verification_required")||
    !coupledBefore?.missing_gates?.includes("quote_reserve_custody_verification_required")
  ) fail("LEDGER_CUSTODY_APPLICATION_COUPLED_PRESTATE_INVALID");

  const productionTarget=structuredClone(production.value);
  productionTarget.wc_ledger_persistence_verified=true;
  productionTarget.quote_reserve_custody_verified=true;
  const coupledTarget=structuredClone(reexecuted.promoted_candidate);
  assertTargetDelta(production.value,productionTarget,coupled.value,coupledTarget);

  const productionAfter=classifyVoidWcVoidProductionReadinessV1(productionTarget);
  const coupledAfter=classifyVoidCoupledEconomicSuccessorGateV1(coupledTarget,successor.value);
  const removed=[
    "wc_ledger_persistence_verification_required",
    "quote_reserve_custody_verification_required",
  ];
  if(
    productionAfter?.status!=="HOLD"||
    !sameStrings(
      productionAfter.missing_gates,
      removeGates(productionBefore.missing_gates,removed),
    )
  ) fail("LEDGER_CUSTODY_APPLICATION_PRODUCTION_POSTSTATE_INVALID");
  if(
    coupledAfter?.status!=="HOLD"||
    !sameStrings(
      coupledAfter.missing_gates,
      removeGates(coupledBefore.missing_gates,removed),
    )
  ) fail("LEDGER_CUSTODY_APPLICATION_COUPLED_POSTSTATE_INVALID");

  const productionTargetBytes=prettyBytes(productionTarget);
  const coupledTargetBytes=prettyBytes(coupledTarget);
  const material=Object.freeze({
    marker:VOID_WC_VOID_LEDGER_CUSTODY_CANONICAL_APPLICATION_PLAN_V1,
    version:1,
    status:"LEDGER_CUSTODY_CANONICAL_APPLICATION_PREPARED",
    chain_id:2050,
    execution_epoch:2,
    pair:"WC_VOID",
    application_base_head_sha:repo.head,
    application_base_tree_sha:repo.tree,
    application_tool_git_blob_sha1:
      gitText(["rev-parse","HEAD:"+TOOL_REL],"LEDGER_CUSTODY_APPLICATION_TOOL_BLOB_UNAVAILABLE"),
    promotion_tool_git_blob_sha1:
      gitText(["rev-parse","HEAD:"+PROMOTION_TOOL_REL],"LEDGER_CUSTODY_APPLICATION_PROMOTION_TOOL_BLOB_UNAVAILABLE"),
    production_classifier_git_blob_sha1:
      gitText(["rev-parse","HEAD:"+PRODUCTION_CLASSIFIER_REL],"LEDGER_CUSTODY_APPLICATION_PRODUCTION_CLASSIFIER_BLOB_UNAVAILABLE"),
    coupled_classifier_git_blob_sha1:
      gitText(["rev-parse","HEAD:"+COUPLED_CLASSIFIER_REL],"LEDGER_CUSTODY_APPLICATION_COUPLED_CLASSIFIER_BLOB_UNAVAILABLE"),
    ledger_import_tool_git_blob_sha1:
      gitText(["rev-parse","HEAD:"+IMPORT_TOOL_REL],"LEDGER_CUSTODY_APPLICATION_IMPORT_TOOL_BLOB_UNAVAILABLE"),
    ledger_import_input_file_sha256:importSource.sha256,
    promotion_receipt_file_sha256:receiptSource.sha256,
    promotion_id:reexecuted.promotion_id,
    ledger_persistence_import_id:reexecuted.ledger_persistence_import_id,
    production_candidate_path:PRODUCTION_REL,
    production_source_git_blob_sha1:production.blob_sha1,
    production_source_file_sha256:production.sha256,
    production_target_git_blob_sha1:gitBlobSha1(productionTargetBytes),
    production_target_file_sha256:sha256(productionTargetBytes),
    production_target_candidate:deepFreeze(productionTarget),
    coupled_candidate_path:COUPLED_REL,
    coupled_source_git_blob_sha1:coupled.blob_sha1,
    coupled_source_file_sha256:coupled.sha256,
    coupled_target_git_blob_sha1:gitBlobSha1(coupledTargetBytes),
    coupled_target_file_sha256:sha256(coupledTargetBytes),
    coupled_target_candidate:deepFreeze(coupledTarget),
    successor_candidate_path:SUCCESSOR_REL,
    successor_source_git_blob_sha1:successor.blob_sha1,
    successor_source_file_sha256:successor.sha256,
    production_before:summary(productionBefore),
    production_after:summary(productionAfter),
    coupled_before:summary(coupledBefore),
    coupled_after:summary(coupledAfter),
    promoted_production_fields:Object.freeze([
      "quote_reserve_custody_verified",
      "wc_ledger_persistence_verified",
    ]),
    promoted_coupled_gates:Object.freeze([
      "quote_reserve_custody_verified",
      "wc_ledger_persistence_verified",
    ]),
    wc_ledger_persistence_verified:true,
    quote_reserve_custody_verified:true,
    production_status_remains_hold:true,
    coupled_status_remains_hold:true,
    coupled_activation_ready:false,
    reviewed_git_commit_required:true,
    market_activation_authorized:false,
    public_presale_activation_authorized:false,
    funds_movement_authorized:false,
    authority:VOID_WC_VOID_LEDGER_CUSTODY_CANONICAL_APPLICATION_AUTHORITY_V1,
  });
  const plan=Object.freeze({
    ...material,
    application_plan_id:"voidwclcca1_"+sha256(Buffer.from(canonicalJson(material),"utf8")),
  });
  validatePlan(plan);
  const repoAfter=repositoryIdentity();
  if(repoAfter.head!==repo.head||repoAfter.tree!==repo.tree){
    fail("LEDGER_CUSTODY_APPLICATION_REPOSITORY_CHANGED_DURING_PREPARE");
  }
  return plan;
}

export function verifyVoidWcVoidLedgerCustodyCanonicalApplicationStateV1({
  plan,
  productionCandidate,
  coupledCandidate,
  successorCandidate,
}={}){
  validatePlan(plan);
  if(
    canonicalJson(productionCandidate)!==canonicalJson(plan.production_target_candidate)
  ) fail("LEDGER_CUSTODY_APPLICATION_PRODUCTION_TARGET_NOT_APPLIED");
  if(
    canonicalJson(coupledCandidate)!==canonicalJson(plan.coupled_target_candidate)
  ) fail("LEDGER_CUSTODY_APPLICATION_COUPLED_TARGET_NOT_APPLIED");
  const successorBytes=prettyBytes(successorCandidate);
  if(
    sha256(successorBytes)!==plan.successor_source_file_sha256||
    gitBlobSha1(successorBytes)!==plan.successor_source_git_blob_sha1
  ) fail("LEDGER_CUSTODY_APPLICATION_SUCCESSOR_SOURCE_DRIFT");

  const p=classifyVoidWcVoidProductionReadinessV1(productionCandidate);
  const c=classifyVoidCoupledEconomicSuccessorGateV1(coupledCandidate,successorCandidate);
  if(
    canonicalJson(summary(p))!==canonicalJson(plan.production_after)||
    canonicalJson(summary(c))!==canonicalJson(plan.coupled_after)
  ) fail("LEDGER_CUSTODY_APPLICATION_CLASSIFIER_STATE_MISMATCH");
  return Object.freeze({
    ok:true,
    status:"LEDGER_CUSTODY_APPLICATION_STATE_VERIFIED_FINAL_ACTIVATION_HOLD",
    application_plan_id:plan.application_plan_id,
    wc_ledger_persistence_verified:true,
    quote_reserve_custody_verified:true,
    coupled_activation_ready:false,
    market_activation_authorized:false,
    public_presale_activation_authorized:false,
    funds_movement_authorized:false,
  });
}

export function verifyVoidWcVoidLedgerCustodyCanonicalApplicationV1({
  application_plan_bytes,
  application_plan_file_sha256,
}={}){
  const source=parseJsonBytes(
    application_plan_bytes,
    application_plan_file_sha256,
    "LEDGER_CUSTODY_APPLICATION_PLAN_FILE",
  );
  const plan=validatePlan(source.value);
  const repo=repositoryIdentity();
  if(repo.branch!=="main") fail("LEDGER_CUSTODY_APPLICATION_APPLIED_BRANCH_NOT_MAIN");
  const ancestry=spawnSync(
    GIT,
    ["--no-replace-objects","-C",ROOT,"merge-base","--is-ancestor",plan.application_base_head_sha,repo.head],
    {env:sanitizedGitEnv(),stdio:["ignore","ignore","ignore"]},
  );
  if(ancestry.status!==0) fail("LEDGER_CUSTODY_APPLICATION_BASE_NOT_ANCESTOR");

  const production=headFile(PRODUCTION_REL,"APPLIED_PRODUCTION");
  const coupled=headFile(COUPLED_REL,"APPLIED_COUPLED");
  const successor=headFile(SUCCESSOR_REL,"APPLIED_SUCCESSOR");
  if(
    production.blob_sha1!==plan.production_target_git_blob_sha1||
    production.sha256!==plan.production_target_file_sha256
  ) fail("LEDGER_CUSTODY_APPLICATION_PRODUCTION_BLOB_NOT_APPLIED");
  if(
    coupled.blob_sha1!==plan.coupled_target_git_blob_sha1||
    coupled.sha256!==plan.coupled_target_file_sha256
  ) fail("LEDGER_CUSTODY_APPLICATION_COUPLED_BLOB_NOT_APPLIED");
  if(
    successor.blob_sha1!==plan.successor_source_git_blob_sha1||
    successor.sha256!==plan.successor_source_file_sha256
  ) fail("LEDGER_CUSTODY_APPLICATION_SUCCESSOR_BLOB_DRIFT");

  const currentToolBlobs=Object.freeze({
    application:gitText(
      ["rev-parse","HEAD:"+TOOL_REL],
      "LEDGER_CUSTODY_APPLICATION_CURRENT_TOOL_BLOB_UNAVAILABLE",
    ),
    promotion:gitText(
      ["rev-parse","HEAD:"+PROMOTION_TOOL_REL],
      "LEDGER_CUSTODY_APPLICATION_CURRENT_PROMOTION_TOOL_BLOB_UNAVAILABLE",
    ),
    production_classifier:gitText(
      ["rev-parse","HEAD:"+PRODUCTION_CLASSIFIER_REL],
      "LEDGER_CUSTODY_APPLICATION_CURRENT_PRODUCTION_CLASSIFIER_BLOB_UNAVAILABLE",
    ),
    coupled_classifier:gitText(
      ["rev-parse","HEAD:"+COUPLED_CLASSIFIER_REL],
      "LEDGER_CUSTODY_APPLICATION_CURRENT_COUPLED_CLASSIFIER_BLOB_UNAVAILABLE",
    ),
    ledger_import:gitText(
      ["rev-parse","HEAD:"+IMPORT_TOOL_REL],
      "LEDGER_CUSTODY_APPLICATION_CURRENT_IMPORT_TOOL_BLOB_UNAVAILABLE",
    ),
  });
  if(
    currentToolBlobs.application!==plan.application_tool_git_blob_sha1||
    currentToolBlobs.promotion!==plan.promotion_tool_git_blob_sha1||
    currentToolBlobs.production_classifier!==
      plan.production_classifier_git_blob_sha1||
    currentToolBlobs.coupled_classifier!==
      plan.coupled_classifier_git_blob_sha1||
    currentToolBlobs.ledger_import!==plan.ledger_import_tool_git_blob_sha1
  ){
    fail("LEDGER_CUSTODY_APPLICATION_TOOL_LINEAGE_DRIFT");
  }

  const state=verifyVoidWcVoidLedgerCustodyCanonicalApplicationStateV1({
    plan,
    productionCandidate:production.value,
    coupledCandidate:coupled.value,
    successorCandidate:successor.value,
  });
  const material=Object.freeze({
    marker:VOID_WC_VOID_LEDGER_CUSTODY_CANONICAL_APPLICATION_V1,
    version:1,
    status:"LEDGER_CUSTODY_CANONICAL_APPLICATION_VERIFIED_FINAL_ACTIVATION_HOLD",
    application_plan_id:plan.application_plan_id,
    application_plan_file_sha256:source.sha256,
    application_base_head_sha:plan.application_base_head_sha,
    applied_head_sha:repo.head,
    applied_tree_sha:repo.tree,
    production_candidate_git_blob_sha1:production.blob_sha1,
    coupled_candidate_git_blob_sha1:coupled.blob_sha1,
    successor_candidate_git_blob_sha1:successor.blob_sha1,
    exact_four_field_source_application_verified:true,
    wc_ledger_persistence_verified:true,
    quote_reserve_custody_verified:true,
    coupled_activation_ready:false,
    final_coupled_activation_required:true,
    market_activation_authorized:false,
    public_presale_activation_authorized:false,
    funds_movement_authorized:false,
    authority:VOID_WC_VOID_LEDGER_CUSTODY_CANONICAL_APPLICATION_AUTHORITY_V1,
  });
  return Object.freeze({
    ...material,
    application_id:"voidwclccaap1_"+sha256(Buffer.from(canonicalJson(material),"utf8")),
    state,
  });
}

export const _internal=Object.freeze({
  canonicalJson,prettyBytes,sha256,gitBlobSha1,
});
