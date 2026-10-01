#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";

export const VOID_WC_VOID_MARKET_VAULT_CANONICAL_APPLICATION_PLAN_V1 =
  "VOID_WC_VOID_MARKET_VAULT_CANONICAL_APPLICATION_PLAN_V1";

export const VOID_WC_VOID_MARKET_VAULT_CANONICAL_APPLICATION_AUTHORITY_V1 =
  Object.freeze({
    source_only_application:true,
    exact_at_use_artifact_bytes_required:true,
    at_use_semantic_reverification_required:true,
    evidence_fresh_at_collection_required:true,
    application_time_authority:false,
    canonical_head_candidate_required:true,
    reviewed_execution_source_required:true,
    verified_modules_loaded_from_exact_git_objects:true,
    ephemeral_verified_module_materialization:true,
    exact_five_field_source_delta:true,
    canonical_classifier_reexecution:true,
    canonical_main_application_required:true,
    canonical_remote_main_read_required:true,
    external_network_read:true,
    repository_source_write:false,
    filesystem_read:true,
    filesystem_write:true,
    persistent_artifact_write:false,
    rpc_call:false,
    rpc_write:false,
    deployment:false,
    role_binding_authorized:false,
    credential_access:false,
    wallet_or_signer_access:false,
    private_key_access:false,
    transaction_construction:false,
    transaction_signing:false,
    transaction_submission:false,
    transaction_broadcast:false,
    chain2050_write:false,
    inventory_funding:false,
    inventory_movement:false,
    market_activation:false,
    public_presale_activation:false,
    funds_movement:false,
  });

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const GIT="/usr/bin/git";
const PRODUCTION_REL="ops/mainnet0/wc-void-production-candidate-v1.json";
const TOOL_REL="tools/void-wc-void-market-vault-canonical-application-v1.mjs";
const AT_USE_REL="tools/void-wc-void-market-vault-at-use-revalidation-v1.mjs";
const ATTEST_REL="tools/void-wc-void-market-vault-runtime-attestation-v1.mjs";
const IMPORT_REL="tools/void-wc-void-market-vault-runtime-attestation-import-v1.mjs";
const ACCEPTANCE_REL="tools/void-wc-void-market-vault-compiled-identity-acceptance-v1.mjs";
const COMPILER_REL="tools/void-wc-void-market-vault-compiler-identity-v1.mjs";
const READINESS_REL="tools/void-wc-void-production-readiness-v1.mjs";
const ADAPTER_REVIEW_REL="tools/void-wc-void-opening-settlement-adapter-review-v1.mjs";
const OPENING_REL="tools/void-wc-void-coupled-opening-v1.mjs";
const PACKAGE_REL="package.json";
const PACKAGE_LOCK_REL="package-lock.json";

export const VOID_WC_VOID_MARKET_VAULT_CANONICAL_APPLICATION_REVIEWED_BLOBS_V1=
  Object.freeze({
    [AT_USE_REL]:"9b415bc3ff7810debcb2ea217e6144ec46153237",
    [ATTEST_REL]:"64a7993a38f764d91a2071240b834fcd97770962",
    [IMPORT_REL]:"4d698202ccc1b82e555685454de97d34e81607db",
    [ACCEPTANCE_REL]:"96dc42543c57fd48ff4d7567d78bdaa800d45598",
    [COMPILER_REL]:"3ac765215d3d2c7881e893100e63e0306cf2593f",
    [READINESS_REL]:"a2ee87d5b5bf749f840aeb8d497008eba2d5beaa",
    [ADAPTER_REVIEW_REL]:"c19a2e42e8d722eade864c7742af2dcaf3c7b11f",
    [OPENING_REL]:"886feaef71a228b1e6f49f1106ae8ec2b34c404e",
    [PACKAGE_REL]:"f28c3e9446c7623ef203da36a9642d046e5f34ee",
    [PACKAGE_LOCK_REL]:"b2671f0149f522b2489247016df0a5ec4bb72b8b",
  });

const PLAN_ID=/^voidwcmvcap1_[0-9a-f]{64}$/u;
const SHA256=/^[0-9a-f]{64}$/u;
const HEX40=/^[0-9a-f]{40}$/u;
const MAX_BYTES=8*1024*1024;
const PROMOTED_FIELDS=Object.freeze([
  "market_vault_address",
  "market_vault_runtime_code_sha256",
  "market_vault_independently_verified",
  "inventory_funded",
  "inventory_lock_proven",
]);
const MISSING_GATES=Object.freeze([
  "market_vault_address_required",
  "market_vault_runtime_code_sha256_required",
  "market_vault_independent_verification_required",
  "inventory_funding_required",
  "inventory_lock_proof_required",
]);

function fail(code){throw new Error(code);}

function plain(value){
  return value!==null&&typeof value==="object"&&!Array.isArray(value);
}

function canonicalJson(value){
  if(value===null)return "null";
  if(typeof value==="string")return JSON.stringify(value);
  if(typeof value==="boolean")return value?"true":"false";
  if(typeof value==="number"&&Number.isSafeInteger(value))return String(value);
  if(Array.isArray(value))return "["+value.map(canonicalJson).join(",")+"]";
  if(plain(value)){
    return "{"+Object.keys(value).sort().map(
      key=>JSON.stringify(key)+":"+canonicalJson(value[key]),
    ).join(",")+"}";
  }
  fail("MARKET_VAULT_CANONICAL_JSON_INVALID");
}

function sha256(bytes){
  return createHash("sha256").update(bytes).digest("hex");
}

function gitBlobSha1(bytes){
  const header=Buffer.from("blob "+bytes.length+"\0","utf8");
  return createHash("sha1").update(header).update(bytes).digest("hex");
}

function deepFreeze(value,seen=new WeakSet()){
  if(value===null||typeof value!=="object")return value;
  if(seen.has(value))return value;
  seen.add(value);
  for(const key of Reflect.ownKeys(value))deepFreeze(value[key],seen);
  return Object.freeze(value);
}

function exactObject(value,keys,code){
  if(!plain(value))fail(code);
  const descriptors=Object.getOwnPropertyDescriptors(value);
  const actual=Reflect.ownKeys(descriptors);
  if(
    actual.some(key=>typeof key!=="string")||
    JSON.stringify([...actual].sort())!==JSON.stringify([...keys].sort())
  )fail(code);
  for(const key of keys){
    const d=descriptors[key];
    if(!d||d.enumerable!==true||!Object.hasOwn(d,"value"))fail(code);
  }
  return value;
}

function gitEnv(){
  const env={
    PATH:"/usr/bin:/bin",
    HOME:"/nonexistent",
    XDG_CONFIG_HOME:"/nonexistent",
    GIT_CONFIG_NOSYSTEM:"1",
    GIT_CONFIG_GLOBAL:"/dev/null",
    GIT_NO_REPLACE_OBJECTS:"1",
    GIT_TERMINAL_PROMPT:"0",
    GIT_ASKPASS:"/bin/false",
  };
  return env;
}

function gitRun(args,{encoding="utf8",allowFail=false}={}){
  const r=spawnSync(
    GIT,
    ["--no-replace-objects","-C",ROOT,...args],
    {
      env:gitEnv(),
      encoding,
      stdio:["ignore","pipe","pipe"],
      maxBuffer:32*1024*1024,
    },
  );
  if(r.error)throw r.error;
  if(r.status!==0&&!allowFail)fail("MARKET_VAULT_CANONICAL_GIT_FAILED");
  return r;
}

function gitText(args,code,{allowEmpty=false}={}){
  const value=String(gitRun(args).stdout||"").trim();
  if(!allowEmpty&&!value)fail(code);
  return value;
}

function repositoryIdentity(){
  const status=gitText(
    ["status","--porcelain=v1","--untracked-files=all"],
    "MARKET_VAULT_CANONICAL_STATUS_UNAVAILABLE",
    {allowEmpty:true},
  );
  if(status!=="")fail("MARKET_VAULT_CANONICAL_REPOSITORY_NOT_CLEAN");
  const head=gitText(["rev-parse","HEAD"],"MARKET_VAULT_CANONICAL_HEAD_UNAVAILABLE");
  const tree=gitText(["rev-parse","HEAD^{tree}"],"MARKET_VAULT_CANONICAL_TREE_UNAVAILABLE");
  const branch=gitText(
    ["branch","--show-current"],
    "MARKET_VAULT_CANONICAL_BRANCH_UNAVAILABLE",
    {allowEmpty:true},
  );
  if(!HEX40.test(head)||!HEX40.test(tree))fail("MARKET_VAULT_CANONICAL_REPOSITORY_IDENTITY_INVALID");
  const origin=gitText(
    ["config","--get","remote.origin.url"],
    "MARKET_VAULT_CANONICAL_ORIGIN_UNAVAILABLE",
  );
  if(![
    "https://github.com/6ZoSo9/void-node",
    "https://github.com/6ZoSo9/void-node.git",
    "git@github.com:6ZoSo9/void-node.git",
    "ssh://git@github.com/6ZoSo9/void-node.git",
  ].includes(origin)){
    fail("MARKET_VAULT_CANONICAL_ORIGIN_INVALID");
  }
  return Object.freeze({head,tree,branch});
}

function commitBytes(commit,relativePath,label){
  const blob=gitText(
    ["rev-parse",commit+":"+relativePath],
    label+"_BLOB_UNAVAILABLE",
  );
  if(!HEX40.test(blob))fail(label+"_BLOB_INVALID");
  const r=gitRun(["show",commit+":"+relativePath],{encoding:null});
  const bytes=Buffer.from(r.stdout||Buffer.alloc(0));
  if(bytes.length<1||gitBlobSha1(bytes)!==blob)fail(label+"_OBJECT_INVALID");
  return Object.freeze({blob,bytes,sha256:sha256(bytes)});
}

function parseJsonBytes(bytes,expectedSha,label){
  if(!Buffer.isBuffer(bytes)||bytes.length<2||bytes.length>MAX_BYTES)fail(label+"_BYTES_INVALID");
  if(typeof expectedSha!=="string"||!SHA256.test(expectedSha))fail(label+"_SHA256_INVALID");
  if(sha256(bytes)!==expectedSha)fail(label+"_SHA256_MISMATCH");
  let value;
  try{value=JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(bytes));}
  catch{fail(label+"_JSON_INVALID");}
  if(!plain(value))fail(label+"_OBJECT_REQUIRED");
  return Object.freeze({bytes:Buffer.from(bytes),sha256:expectedSha,value});
}

function assertReviewedExecutionSource(repo){
  const actual={};
  for(const [relativePath,expected] of Object.entries(
    VOID_WC_VOID_MARKET_VAULT_CANONICAL_APPLICATION_REVIEWED_BLOBS_V1,
  )){
    const head=commitBytes(repo.head,relativePath,"MARKET_VAULT_REVIEWED_"+relativePath.replaceAll("/","_"));
    if(head.blob!==expected)fail("MARKET_VAULT_REVIEWED_SOURCE_BLOB_MISMATCH:"+relativePath);
    const work=fs.readFileSync(path.join(ROOT,relativePath));
    if(gitBlobSha1(work)!==expected)fail("MARKET_VAULT_REVIEWED_WORKTREE_BLOB_MISMATCH:"+relativePath);
    actual[relativePath]=expected;
  }
  const toolBlob=commitBytes(repo.head,TOOL_REL,"MARKET_VAULT_APPLICATION_TOOL").blob;
  const toolWork=fs.readFileSync(path.join(ROOT,TOOL_REL));
  if(gitBlobSha1(toolWork)!==toolBlob)fail("MARKET_VAULT_APPLICATION_TOOL_WORKTREE_DRIFT");
  return Object.freeze({reviewed:Object.freeze(actual),tool_blob_sha1:toolBlob});
}

const REVIEWED_MODULE_PATHS=Object.freeze([
  AT_USE_REL,
  ATTEST_REL,
  IMPORT_REL,
  ACCEPTANCE_REL,
  COMPILER_REL,
  READINESS_REL,
  ADAPTER_REVIEW_REL,
  OPENING_REL,
]);

function reviewedModuleTempRoot(repo){
  const raw=gitText(
    ["rev-parse","--git-dir"],
    "MARKET_VAULT_CANONICAL_GIT_DIR_UNAVAILABLE",
  );
  const gitDir=path.isAbsolute(raw)?raw:path.resolve(ROOT,raw);
  const stat=fs.lstatSync(gitDir);
  if(!stat.isDirectory()||stat.isSymbolicLink()){
    fail("MARKET_VAULT_CANONICAL_GIT_DIR_INVALID");
  }
  const prefix=path.join(gitDir,"void-market-vault-canonical-reviewed-");
  const temp=fs.mkdtempSync(prefix);
  fs.chmodSync(temp,0o700);
  return temp;
}

async function withReviewedExecutionModules(repo,fn){
  const temp=reviewedModuleTempRoot(repo);
  try{
    for(const relativePath of REVIEWED_MODULE_PATHS){
      const expected=
        VOID_WC_VOID_MARKET_VAULT_CANONICAL_APPLICATION_REVIEWED_BLOBS_V1[
          relativePath
        ];
      const source=commitBytes(
        repo.head,
        relativePath,
        "MARKET_VAULT_REVIEWED_MODULE_"+relativePath.replaceAll("/","_"),
      );
      if(source.blob!==expected){
        fail("MARKET_VAULT_REVIEWED_MODULE_BLOB_MISMATCH:"+relativePath);
      }
      const destination=path.join(temp,relativePath);
      fs.mkdirSync(path.dirname(destination),{recursive:true,mode:0o700});
      fs.writeFileSync(destination,source.bytes,{flag:"wx",mode:0o600});
      const written=fs.readFileSync(destination);
      if(gitBlobSha1(written)!==expected){
        fail("MARKET_VAULT_REVIEWED_MODULE_MATERIALIZATION_MISMATCH:"+relativePath);
      }
    }

    const atUse=await import(
      pathToFileURL(path.join(temp,AT_USE_REL)).href
    );
    const readiness=await import(
      pathToFileURL(path.join(temp,READINESS_REL)).href
    );
    if(
      typeof atUse.verifyWcVoidMarketVaultAtUseRevalidationV1!=="function"||
      typeof readiness.classifyVoidWcVoidProductionReadinessV1!=="function"
    ){
      fail("MARKET_VAULT_REVIEWED_MODULE_EXPORT_MISSING");
    }
    return await fn(Object.freeze({
      verifyAtUse:atUse.verifyWcVoidMarketVaultAtUseRevalidationV1,
      classifyReadiness:readiness.classifyVoidWcVoidProductionReadinessV1,
    }));
  }finally{
    fs.rmSync(temp,{recursive:true,force:true});
  }
}

function productionCandidateAt(commit){
  const source=commitBytes(commit,PRODUCTION_REL,"MARKET_VAULT_PRODUCTION_CANDIDATE");
  let value;
  try{value=JSON.parse(source.bytes.toString("utf8"));}
  catch{fail("MARKET_VAULT_PRODUCTION_CANDIDATE_JSON_INVALID");}
  if(!plain(value))fail("MARKET_VAULT_PRODUCTION_CANDIDATE_OBJECT_REQUIRED");
  return Object.freeze({...source,value});
}

function summarize(decision){
  return Object.freeze({
    ok:decision?.ok===true,
    status:String(decision?.status||""),
    reason:String(decision?.reason||""),
    missing_gates:Object.freeze(
      Array.isArray(decision?.missing_gates)?[...decision.missing_gates]:[],
    ),
  });
}

function sameStrings(a,b){
  return JSON.stringify(a)===JSON.stringify(b);
}

function minusGates(values,removed){
  return values.filter(value=>!removed.includes(value));
}

function assertPrestate(candidate){
  if(
    candidate?.status!=="hold"||
    candidate?.market_vault_address!==null||
    candidate?.market_vault_runtime_code_sha256!==null||
    candidate?.market_vault_independently_verified!==false||
    candidate?.inventory_funded!==false||
    candidate?.inventory_lock_proven!==false||
    candidate?.coupled_activation_ready!==false
  )fail("MARKET_VAULT_CANONICAL_PRODUCTION_PRESTATE_INVALID");
}

function targetFrom(candidate,verified){
  const target=structuredClone(candidate);
  target.market_vault_address=verified.market_vault_address;
  target.market_vault_runtime_code_sha256=
    verified.market_vault_runtime_code_sha256;
  target.market_vault_independently_verified=true;
  target.inventory_funded=true;
  target.inventory_lock_proven=true;
  const reset=structuredClone(target);
  reset.market_vault_address=null;
  reset.market_vault_runtime_code_sha256=null;
  reset.market_vault_independently_verified=false;
  reset.inventory_funded=false;
  reset.inventory_lock_proven=false;
  if(canonicalJson(reset)!==canonicalJson(candidate)){
    fail("MARKET_VAULT_CANONICAL_TARGET_DELTA_SCOPE_INVALID");
  }
  return deepFreeze(target);
}

function canonicalRemoteMainHead(){
  const r=spawnSync(
    GIT,
    ["ls-remote","https://github.com/6ZoSo9/void-node.git","refs/heads/main"],
    {
      cwd:"/",
      env:gitEnv(),
      encoding:"utf8",
      stdio:["ignore","pipe","pipe"],
      maxBuffer:1024*1024,
    },
  );
  if(r.error||r.status!==0)fail("MARKET_VAULT_CANONICAL_REMOTE_MAIN_UNAVAILABLE");
  const lines=String(r.stdout||"").trim().split(/\r?\n/u).filter(Boolean);
  if(lines.length!==1)fail("MARKET_VAULT_CANONICAL_REMOTE_MAIN_INVALID");
  const m=lines[0].match(/^([0-9a-f]{40})\trefs\/heads\/main$/u);
  if(!m)fail("MARKET_VAULT_CANONICAL_REMOTE_MAIN_INVALID");
  return m[1];
}

function planMaterial(value){
  const copy=structuredClone(value);
  delete copy.application_plan_id;
  return copy;
}

function validatePlan(plan){
  const keys=[
    "marker","version","status","chain_id","pair",
    "application_base_head_sha","application_base_tree_sha",
    "application_tool_git_blob_sha1","reviewed_source_blobs",
    "at_use_artifact_file_sha256","at_use_revalidation_id",
    "at_use_evidence_sha256","evidence_collection_completed_at_utc",
    "evidence_valid_until_utc","evidence_fresh_at_reviewed_collection",
    "application_time_authority",
    "production_candidate_path","production_source_git_blob_sha1",
    "production_source_file_sha256","production_target_git_blob_sha1",
    "production_target_file_sha256","production_target_candidate",
    "production_before","production_after","promoted_production_fields",
    "market_vault_address","market_vault_runtime_code_sha256",
    "market_vault_independently_verified","inventory_funded",
    "inventory_lock_proven","production_status_remains_hold",
    "coupled_activation_ready","canonical_production_candidate_updated",
    "candidate_application_required","market_activation_authorized",
    "public_presale_activation_authorized","funds_movement_authorized",
    "authority","application_plan_id",
  ];
  exactObject(plan,keys,"MARKET_VAULT_CANONICAL_PLAN_SHAPE_INVALID");
  if(
    plan.marker!==VOID_WC_VOID_MARKET_VAULT_CANONICAL_APPLICATION_PLAN_V1||
    plan.version!==1||
    plan.status!=="MARKET_VAULT_CANONICAL_APPLICATION_PREPARED"||
    plan.chain_id!==2050||
    plan.pair!=="WC_VOID"||
    !PLAN_ID.test(String(plan.application_plan_id||""))||
    plan.evidence_fresh_at_reviewed_collection!==true||
    plan.application_time_authority!==false||
    plan.market_vault_independently_verified!==true||
    plan.inventory_funded!==true||
    plan.inventory_lock_proven!==true||
    plan.production_status_remains_hold!==true||
    plan.coupled_activation_ready!==false||
    plan.canonical_production_candidate_updated!==false||
    plan.candidate_application_required!==true||
    plan.market_activation_authorized!==false||
    plan.public_presale_activation_authorized!==false||
    plan.funds_movement_authorized!==false||
    plan.production_candidate_path!==PRODUCTION_REL||
    JSON.stringify(plan.promoted_production_fields)!==JSON.stringify(PROMOTED_FIELDS)
  )fail("MARKET_VAULT_CANONICAL_PLAN_INVALID");
  if(
    canonicalJson(plan.authority)!==
      canonicalJson(VOID_WC_VOID_MARKET_VAULT_CANONICAL_APPLICATION_AUTHORITY_V1)
  )fail("MARKET_VAULT_CANONICAL_AUTHORITY_MISMATCH");
  if(
    "voidwcmvcap1_"+sha256(Buffer.from(canonicalJson(planMaterial(plan)),"utf8"))!==
      plan.application_plan_id
  )fail("MARKET_VAULT_CANONICAL_PLAN_ID_MISMATCH");
  return plan;
}

export async function prepareVoidWcVoidMarketVaultCanonicalApplicationV1(input){
  exactObject(
    input,
    ["at_use_artifact_bytes","at_use_artifact_file_sha256"],
    "MARKET_VAULT_CANONICAL_INPUT_SHAPE_INVALID",
  );
  const evidenceSource=parseJsonBytes(
    input.at_use_artifact_bytes,
    input.at_use_artifact_file_sha256,
    "MARKET_VAULT_CANONICAL_AT_USE_ARTIFACT",
  );
  const repo=repositoryIdentity();
  const sourceBinding=assertReviewedExecutionSource(repo);
  const production=productionCandidateAt(repo.head);
  assertPrestate(production.value);

  const artifact=evidenceSource.value;
  if(typeof artifact.collection_completed_at_utc!=="string"){
    fail("MARKET_VAULT_CANONICAL_EVIDENCE_COLLECTION_TIME_MISSING");
  }
  const result=await withReviewedExecutionModules(
    repo,
    async ({verifyAtUse,classifyReadiness})=>{
      const verified=verifyAtUse({
        artifact,
        evaluation_time_utc:artifact.collection_completed_at_utc,
      });
  if(
    verified?.ok!==true||
    verified?.status!=="MARKET_VAULT_AT_USE_EVIDENCE_VERIFIED_CURRENT"||
    verified.evidence_current_at_evaluation!==true||
    verified.market_vault_independently_verified!==true||
    verified.inventory_funded!==true||
    verified.inventory_lock_proven!==true||
    verified.preactivation_state_verified!==true||
    verified.production_candidate_binding_allowed!==false||
    verified.market_activation_authorized!==false||
    verified.public_presale_activation_authorized!==false||
    verified.funds_movement_authorized!==false
  )fail("MARKET_VAULT_CANONICAL_EVIDENCE_INVALID");

  const before=classifyReadiness(production.value);
  if(
    before?.ok!==false||
    before.status!=="HOLD"||
    before.reason!=="production_gates_incomplete"||
    !MISSING_GATES.every(gate=>before.missing_gates?.includes(gate))
  )fail("MARKET_VAULT_CANONICAL_CLASSIFIER_PRESTATE_INVALID");

  const target=targetFrom(production.value,verified);
  const after=classifyReadiness(target);
  if(
    after?.ok!==false||
    after.status!=="HOLD"||
    after.reason!=="production_gates_incomplete"||
    !sameStrings(after.missing_gates,minusGates(before.missing_gates,MISSING_GATES))
  )fail("MARKET_VAULT_CANONICAL_CLASSIFIER_POSTSTATE_INVALID");

  const targetBytes=Buffer.from(JSON.stringify(target,null,2)+"\n","utf8");
  const material=Object.freeze({
    marker:VOID_WC_VOID_MARKET_VAULT_CANONICAL_APPLICATION_PLAN_V1,
    version:1,
    status:"MARKET_VAULT_CANONICAL_APPLICATION_PREPARED",
    chain_id:2050,
    pair:"WC_VOID",
    application_base_head_sha:repo.head,
    application_base_tree_sha:repo.tree,
    application_tool_git_blob_sha1:sourceBinding.tool_blob_sha1,
    reviewed_source_blobs:sourceBinding.reviewed,
    at_use_artifact_file_sha256:evidenceSource.sha256,
    at_use_revalidation_id:artifact.revalidation_id,
    at_use_evidence_sha256:artifact.at_use_evidence_sha256,
    evidence_collection_completed_at_utc:artifact.collection_completed_at_utc,
    evidence_valid_until_utc:artifact.valid_until_utc,
    evidence_fresh_at_reviewed_collection:true,
    application_time_authority:false,
    production_candidate_path:PRODUCTION_REL,
    production_source_git_blob_sha1:production.blob,
    production_source_file_sha256:production.sha256,
    production_target_git_blob_sha1:gitBlobSha1(targetBytes),
    production_target_file_sha256:sha256(targetBytes),
    production_target_candidate:structuredClone(target),
    production_before:summarize(before),
    production_after:summarize(after),
    promoted_production_fields:PROMOTED_FIELDS,
    market_vault_address:verified.market_vault_address,
    market_vault_runtime_code_sha256:
      verified.market_vault_runtime_code_sha256,
    market_vault_independently_verified:true,
    inventory_funded:true,
    inventory_lock_proven:true,
    production_status_remains_hold:true,
    coupled_activation_ready:false,
    canonical_production_candidate_updated:false,
    candidate_application_required:true,
    market_activation_authorized:false,
    public_presale_activation_authorized:false,
    funds_movement_authorized:false,
    authority:VOID_WC_VOID_MARKET_VAULT_CANONICAL_APPLICATION_AUTHORITY_V1,
  });
  const plan=deepFreeze({
    ...material,
    application_plan_id:
      "voidwcmvcap1_"+sha256(Buffer.from(canonicalJson(material),"utf8")),
  });
  validatePlan(plan);
  return plan;
    },
  );

  const afterRepo=repositoryIdentity();
  if(afterRepo.head!==repo.head||afterRepo.tree!==repo.tree){
    fail("MARKET_VAULT_CANONICAL_REPOSITORY_CHANGED_DURING_PREPARE");
  }
  return result;
}

async function verifyStateWithClassifier(plan,productionCandidate,classifyReadiness){
  const reviewed=validatePlan(plan);
  if(canonicalJson(productionCandidate)!==canonicalJson(reviewed.production_target_candidate)){
    fail("MARKET_VAULT_CANONICAL_TARGET_NOT_APPLIED");
  }
  const decision=classifyReadiness(productionCandidate);
  if(canonicalJson(summarize(decision))!==canonicalJson(reviewed.production_after)){
    fail("MARKET_VAULT_CANONICAL_CLASSIFIER_STATE_MISMATCH");
  }
  return Object.freeze({
    ok:true,
    status:"MARKET_VAULT_CANONICAL_APPLICATION_STATE_VERIFIED_FINAL_ACTIVATION_HOLD",
    application_plan_id:reviewed.application_plan_id,
    market_vault_address:reviewed.market_vault_address,
    market_vault_runtime_code_sha256:reviewed.market_vault_runtime_code_sha256,
    market_vault_independently_verified:true,
    inventory_funded:true,
    inventory_lock_proven:true,
    coupled_activation_ready:false,
    market_activation_authorized:false,
    public_presale_activation_authorized:false,
    funds_movement_authorized:false,
  });
}

export async function verifyVoidWcVoidMarketVaultCanonicalApplicationStateV1({
  plan,
  productionCandidate,
}={}){
  const repo=repositoryIdentity();
  assertReviewedExecutionSource(repo);
  return await withReviewedExecutionModules(
    repo,
    async ({classifyReadiness})=>
      await verifyStateWithClassifier(plan,productionCandidate,classifyReadiness),
  );
}

export async function verifyVoidWcVoidMarketVaultCanonicalApplicationV1({
  application_plan_bytes,
  application_plan_file_sha256,
}={}){
  const source=parseJsonBytes(
    application_plan_bytes,
    application_plan_file_sha256,
    "MARKET_VAULT_CANONICAL_PLAN_FILE",
  );
  const plan=validatePlan(source.value);
  const repo=repositoryIdentity();
  if(repo.branch!=="main")fail("MARKET_VAULT_CANONICAL_APPLIED_BRANCH_NOT_MAIN");
  if(canonicalRemoteMainHead()!==repo.head){
    fail("MARKET_VAULT_CANONICAL_APPLIED_HEAD_NOT_REMOTE_MAIN");
  }
  const ancestry=gitRun([
    "merge-base","--is-ancestor",plan.application_base_head_sha,repo.head,
  ],{allowFail:true});
  if(ancestry.status!==0)fail("MARKET_VAULT_CANONICAL_BASE_NOT_ANCESTOR");

  const baseTree=gitText(
    ["rev-parse",plan.application_base_head_sha+"^{tree}"],
    "MARKET_VAULT_CANONICAL_BASE_TREE_UNAVAILABLE",
  );
  if(baseTree!==plan.application_base_tree_sha){
    fail("MARKET_VAULT_CANONICAL_BASE_TREE_MISMATCH");
  }
  const base=productionCandidateAt(plan.application_base_head_sha);
  if(
    base.blob!==plan.production_source_git_blob_sha1||
    base.sha256!==plan.production_source_file_sha256
  )fail("MARKET_VAULT_CANONICAL_BASE_SOURCE_MISMATCH");

  for(const [relativePath,expected] of Object.entries(plan.reviewed_source_blobs)){
    const current=commitBytes(repo.head,relativePath,"MARKET_VAULT_CURRENT_"+relativePath.replaceAll("/","_"));
    if(current.blob!==expected)fail("MARKET_VAULT_CANONICAL_EXECUTION_SOURCE_DRIFT:"+relativePath);
  }
  const currentTool=commitBytes(repo.head,TOOL_REL,"MARKET_VAULT_CURRENT_APPLICATION_TOOL");
  if(currentTool.blob!==plan.application_tool_git_blob_sha1){
    fail("MARKET_VAULT_CANONICAL_APPLICATION_TOOL_DRIFT");
  }

  const current=productionCandidateAt(repo.head);
  if(
    current.blob!==plan.production_target_git_blob_sha1||
    current.sha256!==plan.production_target_file_sha256||
    canonicalJson(current.value)!==canonicalJson(plan.production_target_candidate)
  )fail("MARKET_VAULT_CANONICAL_APPLIED_TARGET_MISMATCH");

  return await withReviewedExecutionModules(
    repo,
    async ({classifyReadiness})=>
      await verifyStateWithClassifier(
        plan,
        current.value,
        classifyReadiness,
      ),
  );
}
