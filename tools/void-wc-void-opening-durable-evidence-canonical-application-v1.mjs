#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

export const VOID_WC_VOID_OPENING_DURABLE_EVIDENCE_CANONICAL_APPLICATION_PLAN_V1 =
  "VOID_WC_VOID_OPENING_DURABLE_EVIDENCE_CANONICAL_APPLICATION_PLAN_V1";
export const VOID_WC_VOID_OPENING_DURABLE_EVIDENCE_CANONICAL_APPLICATION_V1 =
  "VOID_WC_VOID_OPENING_DURABLE_EVIDENCE_CANONICAL_APPLICATION_V1";

export const VOID_WC_VOID_OPENING_DURABLE_EVIDENCE_CANONICAL_APPLICATION_AUTHORITY_V1 =
  Object.freeze({
    source_only_application:true,
    exact_private_request_required:true,
    exact_promotion_receipt_required:true,
    durable_promotion_reexecution_required:true,
    canonical_head_candidate_bytes_required:true,
    reviewed_repository_generation_required:true,
    exact_three_field_source_delta:true,
    canonical_classifier_reexecution:true,
    reviewed_git_commit_required:true,
    reviewed_git_object_execution_required:true,
    reviewed_package_runtime_required:true,
    permission_fenced_execution_required:true,
    minimal_git_environment_required:true,
    ambient_loader_tool_overrides_ignored:true,
    execution_child_process_limited_to_reviewed_git:true,
    private_temporary_filesystem_write:true,
    repository_source_write:false,
    filesystem_read:true,
    filesystem_write:true,
    rpc_call:false,
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
    token_movement:false,
    inventory_funding:false,
    liquidity_movement:false,
    bounded_canary:false,
    coupled_activation:false,
    market_activation:false,
    public_presale_activation:false,
    funds_movement:false,
  });

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const GIT="/usr/bin/git";
const TOOL_REL=
  "tools/void-wc-void-opening-durable-evidence-canonical-application-v1.mjs";
const PROMOTION_TOOL_REL=
  "tools/void-wc-void-opening-durable-evidence-candidate-promotion-v1.mjs";
const CLAIM_PERSISTENCE_REL=
  "tools/void-wc-void-opening-claim-binding-persistence-v1.mjs";
const REPLAY_PERSISTENCE_REL=
  "tools/void-wc-void-opening-replay-persistence-v1.mjs";
const PRODUCTION_CLASSIFIER_REL=
  "tools/void-wc-void-production-readiness-v1.mjs";
const COUPLED_CLASSIFIER_REL=
  "tools/void-coupled-economic-successor-gate-v1.mjs";
const PRODUCTION_REL="ops/mainnet0/wc-void-production-candidate-v1.json";
const COUPLED_REL="ops/mainnet0/coupled-economic-successor-gate-candidate-v1.json";
const SUCCESSOR_REL="ops/mainnet0/economic-evm-successor-migration-candidate-v1.json";
const REVIEWED_RUNTIME_TOOL_REL=
  "tools/void-reviewed-node-package-runtime-v1.mjs";
const REVIEWED_RUNTIME_PROFILE_REL=
  "ops/security/reviewed-node-package-runtime-ethers-v1.json";
const REVIEWED_EXECUTION_ROOTS=Object.freeze([
  PROMOTION_TOOL_REL,
  PRODUCTION_CLASSIFIER_REL,
  COUPLED_CLASSIFIER_REL,
]);
const HEX40=/^[0-9a-f]{40}$/u;
const HEX64=/^[0-9a-f]{64}$/u;
const PROMOTION_ID=/^voidwcodecp1_[0-9a-f]{64}$/u;
const BINDING_ID=/^sha256:[0-9a-f]{64}$/u;
const REPLAY_ID=/^voidwcrp1_[0-9a-f]{64}$/u;
const PLAN_ID=/^voidwcodca1_[0-9a-f]{64}$/u;
const MAX_BYTES=64*1024*1024;

const INPUT_KEYS=Object.freeze([
  "request_file",
  "request_file_sha256",
  "promotion_receipt_bytes",
  "promotion_receipt_file_sha256",
]);

const PLAN_KEYS=Object.freeze([
  "marker","version","status","chain_id","execution_epoch","pair",
  "application_base_head_sha","application_base_tree_sha",
  "application_tool_git_blob_sha1","promotion_tool_git_blob_sha1",
  "claim_persistence_tool_git_blob_sha1","replay_persistence_tool_git_blob_sha1",
  "production_classifier_git_blob_sha1","coupled_classifier_git_blob_sha1",
  "request_file_sha256","promotion_receipt_file_sha256","promotion_id",
  "coupled_launch_id","binding_id","replay_terminal_capsule_id",
  "replay_terminal_capsule_sha256","replay_transition_id",
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
  "durable_claim_binding_verified","durable_replay_terminal_verified",
  "production_status_remains_hold","coupled_status_remains_hold",
  "bounded_canary_green","coupled_activation_ready",
  "reviewed_git_commit_required",
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
  fail("OPENING_DURABLE_APPLICATION_CANONICAL_VALUE_INVALID");
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
      timeout:60_000,
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
  const text=String(git(args,code)).trim();
  if(!allowEmpty&&!text) fail(code);
  return text;
}
function gitBytes(args,code){return Buffer.from(git(args,code,{encoding:null}));}
function repositoryIdentity(){
  const status=gitText(
    ["status","--porcelain=v1","--untracked-files=all"],
    "OPENING_DURABLE_APPLICATION_REPOSITORY_STATUS_UNAVAILABLE",
    {allowEmpty:true},
  );
  if(status!=="") fail("OPENING_DURABLE_APPLICATION_REPOSITORY_MUST_BE_CLEAN");
  const head=gitText(
    ["rev-parse","HEAD"],
    "OPENING_DURABLE_APPLICATION_HEAD_UNAVAILABLE",
  );
  const tree=gitText(
    ["rev-parse","HEAD^{tree}"],
    "OPENING_DURABLE_APPLICATION_TREE_UNAVAILABLE",
  );
  const branch=gitText(
    ["branch","--show-current"],
    "OPENING_DURABLE_APPLICATION_BRANCH_UNAVAILABLE",
    {allowEmpty:true},
  );
  if(!HEX40.test(head)||!HEX40.test(tree)){
    fail("OPENING_DURABLE_APPLICATION_REPOSITORY_IDENTITY_INVALID");
  }
  return Object.freeze({head,tree,branch});
}
function commitFile(commit,rel,label){
  if(typeof commit!=="string"||!HEX40.test(commit)){
    fail("OPENING_DURABLE_APPLICATION_"+label+"_COMMIT_INVALID");
  }
  const bytes=gitBytes(
    ["show",commit+":"+rel],
    "OPENING_DURABLE_APPLICATION_"+label+"_BYTES_UNAVAILABLE",
  );
  if(bytes.length<2||bytes.length>MAX_BYTES){
    fail("OPENING_DURABLE_APPLICATION_"+label+"_BYTES_INVALID");
  }
  let value;
  try{value=JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(bytes));}
  catch{fail("OPENING_DURABLE_APPLICATION_"+label+"_JSON_INVALID");}
  if(!plain(value)) fail("OPENING_DURABLE_APPLICATION_"+label+"_OBJECT_REQUIRED");
  const blob=gitText(
    ["rev-parse",commit+":"+rel],
    "OPENING_DURABLE_APPLICATION_"+label+"_BLOB_UNAVAILABLE",
  );
  if(!HEX40.test(blob)||gitBlobSha1(bytes)!==blob){
    fail("OPENING_DURABLE_APPLICATION_"+label+"_BLOB_MISMATCH");
  }
  return Object.freeze({bytes,value,sha256:sha256(bytes),blob_sha1:blob});
}
function headFile(rel,label){
  const head=gitText(
    ["rev-parse","HEAD"],
    "OPENING_DURABLE_APPLICATION_"+label+"_HEAD_UNAVAILABLE",
  );
  return commitFile(head,rel,label);
}

function commitBytes(commit,rel,label){
  if(typeof commit!=="string"||!HEX40.test(commit)){
    fail("OPENING_DURABLE_APPLICATION_"+label+"_COMMIT_INVALID");
  }
  const bytes=gitBytes(
    ["show",commit+":"+rel],
    "OPENING_DURABLE_APPLICATION_"+label+"_BYTES_UNAVAILABLE",
  );
  if(bytes.length<1||bytes.length>MAX_BYTES){
    fail("OPENING_DURABLE_APPLICATION_"+label+"_BYTES_INVALID");
  }
  const blob=gitText(
    ["rev-parse",commit+":"+rel],
    "OPENING_DURABLE_APPLICATION_"+label+"_BLOB_UNAVAILABLE",
  );
  if(!HEX40.test(blob)||gitBlobSha1(bytes)!==blob){
    fail("OPENING_DURABLE_APPLICATION_"+label+"_BLOB_MISMATCH");
  }
  return Object.freeze({
    bytes:Buffer.from(bytes),
    sha256:sha256(bytes),
    blob_sha1:blob,
  });
}

function privateNodeEnv(home){
  return {
    PATH:"/usr/bin:/bin",
    LANG:"C",
    LC_ALL:"C",
    HOME:home,
    XDG_CONFIG_HOME:home,
    GIT_NO_REPLACE_OBJECTS:"1",
    GIT_CONFIG_NOSYSTEM:"1",
    GIT_CONFIG_GLOBAL:"/dev/null",
    GIT_CONFIG_SYSTEM:"/dev/null",
    GIT_TERMINAL_PROMPT:"0",
    GIT_OPTIONAL_LOCKS:"0",
    GIT_ASKPASS:"/bin/false",
    GIT_CONFIG_COUNT:"6",
    GIT_CONFIG_KEY_0:"core.fsmonitor",
    GIT_CONFIG_VALUE_0:"false",
    GIT_CONFIG_KEY_1:"core.hooksPath",
    GIT_CONFIG_VALUE_1:"/dev/null",
    GIT_CONFIG_KEY_2:"core.attributesFile",
    GIT_CONFIG_VALUE_2:"/dev/null",
    GIT_CONFIG_KEY_3:"core.untrackedCache",
    GIT_CONFIG_VALUE_3:"false",
    GIT_CONFIG_KEY_4:"core.preloadIndex",
    GIT_CONFIG_VALUE_4:"false",
    GIT_CONFIG_KEY_5:"submodule.recurse",
    GIT_CONFIG_VALUE_5:"false",
  };
}

function writePrivateSource(file,bytes,mode=0o400){
  fs.mkdirSync(path.dirname(file),{recursive:true,mode:0o700});
  const fd=fs.openSync(
    file,
    fs.constants.O_WRONLY|
      fs.constants.O_CREAT|
      fs.constants.O_EXCL|
      Number(fs.constants.O_NOFOLLOW||0),
    mode,
  );
  try{
    fs.writeFileSync(fd,bytes);
    fs.fsyncSync(fd);
    fs.fchmodSync(fd,mode);
  }finally{
    fs.closeSync(fd);
  }
}

function gitRunPrivate(cwd,args,code,{allowFail=false}={}){
  const result=spawnSync(
    GIT,
    [
      "--no-replace-objects",
      ...REVIEWED_GIT_CONFIG_ARGS,
      "-c","protocol.file.allow=always",
      "-C",cwd,
      ...args,
    ],
    {
      env:sanitizedGitEnv(),
      encoding:"utf8",
      stdio:["ignore","pipe","pipe"],
      maxBuffer:MAX_BYTES+1024,
      timeout:120_000,
    },
  );
  if(result.error) throw result.error;
  if(result.status!==0&&!allowFail) fail(code);
  return result;
}

function makeExecutionTreeReadOnly(root){
  const rootStat=fs.lstatSync(root);
  if(rootStat.isSymbolicLink()||!rootStat.isDirectory()){
    fail("OPENING_DURABLE_APPLICATION_REVIEWED_TREE_ROOT_INVALID");
  }
  function walk(dir){
    for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
      const file=path.join(dir,entry.name);
      const stat=fs.lstatSync(file);
      if(stat.isSymbolicLink()){
        continue;
      }
      if(stat.isDirectory()){
        walk(file);
        fs.chmodSync(file,0o500);
        continue;
      }
      if(stat.isFile()){
        fs.chmodSync(file,0o400);
        continue;
      }
      fail("OPENING_DURABLE_APPLICATION_REVIEWED_TREE_ENTRY_INVALID");
    }
  }
  walk(root);
  fs.chmodSync(root,0o500);
}

function makeExecutionTreeRemovable(root){
  if(!fs.existsSync(root)) return;
  const rootStat=fs.lstatSync(root);
  if(rootStat.isSymbolicLink()||!rootStat.isDirectory()){
    fail("OPENING_DURABLE_APPLICATION_REVIEWED_TREE_ROOT_INVALID");
  }
  function walk(dir){
    fs.chmodSync(dir,0o700);
    for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
      const file=path.join(dir,entry.name);
      const stat=fs.lstatSync(file);
      if(stat.isSymbolicLink()){
        continue;
      }
      if(stat.isDirectory()){
        walk(file);
        continue;
      }
      if(stat.isFile()){
        fs.chmodSync(file,0o600);
        continue;
      }
      fail("OPENING_DURABLE_APPLICATION_REVIEWED_TREE_ENTRY_INVALID");
    }
  }
  walk(root);
}

function reviewedModuleClosure(commit){
  const pending=[...REVIEWED_EXECUTION_ROOTS];
  const seen=new Set();
  const blobs=Object.create(null);
  while(pending.length){
    const rel=pending.pop();
    if(seen.has(rel)) continue;
    seen.add(rel);
    const source=commitBytes(
      commit,
      rel,
      "REVIEWED_MODULE_"+rel.replace(/[^A-Za-z0-9]+/gu,"_"),
    );
    blobs[rel]=source.blob_sha1;
    const text=new TextDecoder("utf-8",{fatal:true}).decode(source.bytes);
    const specs=[];
    for(const re of [
      /\bfrom\s+["']([^"']+)["']/gu,
      /\bimport\s*\(\s*["']([^"']+)["']\s*\)/gu,
      /\bimport\s+["']([^"']+)["']/gu,
    ]){
      let match;
      while((match=re.exec(text))!==null) specs.push(match[1]);
    }
    for(const spec of specs){
      if(spec.startsWith("node:")) continue;
      if(spec==="ethers") continue;
      if(!spec.startsWith(".")){
        fail("OPENING_DURABLE_APPLICATION_REVIEWED_BARE_IMPORT_FORBIDDEN:"+spec);
      }
      const target=path.posix.normalize(
        path.posix.join(path.posix.dirname(rel),spec),
      );
      if(
        !target.startsWith("tools/")||
        !target.endsWith(".mjs")
      ){
        fail("OPENING_DURABLE_APPLICATION_REVIEWED_IMPORT_ESCAPE:"+target);
      }
      pending.push(target);
    }
    if(
      text.includes("node:child_process")&&
      rel!==PROMOTION_TOOL_REL
    ){
      fail("OPENING_DURABLE_APPLICATION_REVIEWED_CHILD_PROCESS_SURFACE:"+rel);
    }
  }
  return Object.freeze({
    module_git_blobs:Object.freeze({...blobs}),
    child_process_module:PROMOTION_TOOL_REL,
  });
}

let reviewedExecutionCache=null;

function cleanupReviewedExecutionCache(){
  if(!reviewedExecutionCache) return;
  const parent=reviewedExecutionCache.parent;
  try{
    makeExecutionTreeRemovable(parent);
    fs.rmSync(parent,{recursive:true,force:true});
  }finally{
    reviewedExecutionCache=null;
  }
}
process.once("exit",cleanupReviewedExecutionCache);

function buildReviewedExecutionRoot(repo){
  if(
    reviewedExecutionCache&&
    reviewedExecutionCache.head===repo.head&&
    reviewedExecutionCache.tree===repo.tree
  ){
    return reviewedExecutionCache;
  }
  cleanupReviewedExecutionCache();
  reviewedModuleClosure(repo.head);

  const parent=fs.mkdtempSync(
    path.join(os.tmpdir(),"void-opening-durable-reviewed-"),
  );
  fs.chmodSync(parent,0o700);
  try{
    const bootstrapDir=path.join(parent,"bootstrap");
    fs.mkdirSync(bootstrapDir,{mode:0o700});
    const runtimeToolFile=path.join(
      bootstrapDir,
      "void-reviewed-node-package-runtime-v1.mjs",
    );
    writePrivateSource(
      runtimeToolFile,
      commitBytes(
        repo.head,
        REVIEWED_RUNTIME_TOOL_REL,
        "REVIEWED_RUNTIME_TOOL",
      ).bytes,
    );
    const profileFile=path.join(bootstrapDir,"profile.json");
    writePrivateSource(
      profileFile,
      commitBytes(
        repo.head,
        REVIEWED_RUNTIME_PROFILE_REL,
        "REVIEWED_RUNTIME_PROFILE",
      ).bytes,
    );
    const executionRoot=path.join(parent,"execution");
    const bootstrapFile=path.join(bootstrapDir,"bootstrap.mjs");
    const bootstrapSource=[
      'import fs from "node:fs";',
      'import { materializeReviewedNodePackageRuntimeV1, verifyMaterializedReviewedNodePackageRuntimeV1 } from "./void-reviewed-node-package-runtime-v1.mjs";',
      'const request=JSON.parse(fs.readFileSync(0,"utf8"));',
      'const profile=JSON.parse(fs.readFileSync(request.profile_file,"utf8"));',
      'const result=request.action==="materialize"',
      '  ? materializeReviewedNodePackageRuntimeV1({profile,repoRoot:request.repo_root,destinationRoot:request.destination_root})',
      '  : verifyMaterializedReviewedNodePackageRuntimeV1({profile,repoRoot:request.repo_root,destinationRoot:request.destination_root});',
      'process.stdout.write(JSON.stringify(result));',
      '',
    ].join("\n");
    writePrivateSource(
      bootstrapFile,
      Buffer.from(bootstrapSource,"utf8"),
    );
    const bootstrap=spawnSync(
      fs.realpathSync.native(process.execPath),
      [bootstrapFile],
      {
        cwd:bootstrapDir,
        env:privateNodeEnv(bootstrapDir),
        input:JSON.stringify({
          action:"materialize",
          profile_file:profileFile,
          repo_root:ROOT,
          destination_root:executionRoot,
        }),
        encoding:"utf8",
        stdio:["pipe","pipe","pipe"],
        maxBuffer:16*1024*1024,
        timeout:120_000,
      },
    );
    if(bootstrap.error||bootstrap.status!==0){
      fail("OPENING_DURABLE_APPLICATION_REVIEWED_RUNTIME_MATERIALIZATION_FAILED");
    }

    gitRunPrivate(
      executionRoot,
      ["init","--quiet"],
      "OPENING_DURABLE_APPLICATION_PRIVATE_GIT_INIT_FAILED",
    );
    gitRunPrivate(
      executionRoot,
      ["fetch","--quiet","--no-tags","--depth=1",ROOT,repo.head],
      "OPENING_DURABLE_APPLICATION_PRIVATE_GIT_FETCH_FAILED",
    );
    gitRunPrivate(
      executionRoot,
      ["checkout","--quiet","--detach","FETCH_HEAD"],
      "OPENING_DURABLE_APPLICATION_PRIVATE_GIT_CHECKOUT_FAILED",
    );
    const privateHead=String(
      gitRunPrivate(
        executionRoot,
        ["rev-parse","HEAD"],
        "OPENING_DURABLE_APPLICATION_PRIVATE_HEAD_UNAVAILABLE",
      ).stdout||"",
    ).trim();
    const privateTree=String(
      gitRunPrivate(
        executionRoot,
        ["rev-parse","HEAD^{tree}"],
        "OPENING_DURABLE_APPLICATION_PRIVATE_TREE_UNAVAILABLE",
      ).stdout||"",
    ).trim();
    if(privateHead!==repo.head||privateTree!==repo.tree){
      fail("OPENING_DURABLE_APPLICATION_PRIVATE_GIT_IDENTITY_MISMATCH");
    }
    const privateStatus=String(
      gitRunPrivate(
        executionRoot,
        ["status","--porcelain=v1","--untracked-files=all"],
        "OPENING_DURABLE_APPLICATION_PRIVATE_STATUS_UNAVAILABLE",
      ).stdout||"",
    ).trim();
    if(privateStatus!==""){
      fail("OPENING_DURABLE_APPLICATION_PRIVATE_WORKTREE_NOT_CLEAN");
    }

    const runnerFile=path.join(
      bootstrapDir,
      "opening-durable-reviewed-runner-v1.mjs",
    );
    const runnerSource=[
      'import fs from "node:fs";',
      'import { prepareVoidWcVoidOpeningDurableEvidenceCandidatePromotionV1, VOID_WC_VOID_OPENING_DURABLE_EVIDENCE_CANDIDATE_PROMOTION_AUTHORITY_V1 } from "../execution/tools/void-wc-void-opening-durable-evidence-candidate-promotion-v1.mjs";',
      'import { classifyVoidWcVoidProductionReadinessV1 } from "../execution/tools/void-wc-void-production-readiness-v1.mjs";',
      'import { classifyVoidCoupledEconomicSuccessorGateV1 } from "../execution/tools/void-coupled-economic-successor-gate-v1.mjs";',
      'const request=JSON.parse(fs.readFileSync(0,"utf8"));',
      'let result;',
      'if(request.operation==="prepare"){',
      '  const promotion=prepareVoidWcVoidOpeningDurableEvidenceCandidatePromotionV1({requestFile:request.request_file,requestFileSha256:request.request_file_sha256});',
      '  const production=JSON.parse(fs.readFileSync("../execution/ops/mainnet0/wc-void-production-candidate-v1.json","utf8"));',
      '  const coupled=JSON.parse(fs.readFileSync("../execution/ops/mainnet0/coupled-economic-successor-gate-candidate-v1.json","utf8"));',
      '  const successor=JSON.parse(fs.readFileSync("../execution/ops/mainnet0/economic-evm-successor-migration-candidate-v1.json","utf8"));',
      '  result={promotion,promotion_authority:VOID_WC_VOID_OPENING_DURABLE_EVIDENCE_CANDIDATE_PROMOTION_AUTHORITY_V1,production_before:classifyVoidWcVoidProductionReadinessV1(production),production_after:classifyVoidWcVoidProductionReadinessV1(promotion.promoted_production_candidate),coupled_before:classifyVoidCoupledEconomicSuccessorGateV1(coupled,successor),coupled_after:classifyVoidCoupledEconomicSuccessorGateV1(promotion.promoted_coupled_candidate,successor)};',
      '}else if(request.operation==="classify"){',
      '  result={production_before:classifyVoidWcVoidProductionReadinessV1(request.production_before),production_after:classifyVoidWcVoidProductionReadinessV1(request.production_after),coupled_before:classifyVoidCoupledEconomicSuccessorGateV1(request.coupled_before,request.successor),coupled_after:classifyVoidCoupledEconomicSuccessorGateV1(request.coupled_after,request.successor)};',
      '}else{throw new Error("opening_durable_reviewed_operation_invalid");}',
      'process.stdout.write(JSON.stringify(result));',
      '',
    ].join("\n");
    writePrivateSource(runnerFile,Buffer.from(runnerSource,"utf8"));

    makeExecutionTreeReadOnly(executionRoot);
    reviewedExecutionCache=Object.freeze({
      head:repo.head,
      tree:repo.tree,
      parent,
      bootstrap_dir:bootstrapDir,
      execution_root:executionRoot,
      runner_file:runnerFile,
      bootstrap_file:bootstrapFile,
      profile_file:profileFile,
    });
    return reviewedExecutionCache;
  }catch(error){
    let cleanupError=null;
    try{
      makeExecutionTreeRemovable(parent);
      fs.rmSync(parent,{recursive:true,force:true});
    }catch(candidateCleanupError){
      cleanupError=candidateCleanupError;
    }
    if(cleanupError!==null){
      throw new AggregateError(
        [error,cleanupError],
        "opening_durable_reviewed_execution_cleanup_failed",
      );
    }
    throw error;
  }
}

function verifyReviewedRuntimeTree(bundle){
  const result=spawnSync(
    fs.realpathSync.native(process.execPath),
    [bundle.bootstrap_file],
    {
      cwd:bundle.bootstrap_dir,
      env:privateNodeEnv(bundle.bootstrap_dir),
      input:JSON.stringify({
        action:"verify",
        profile_file:bundle.profile_file,
        repo_root:ROOT,
        destination_root:bundle.execution_root,
      }),
      encoding:"utf8",
      stdio:["pipe","pipe","pipe"],
      maxBuffer:16*1024*1024,
      timeout:120_000,
    },
  );
  if(result.error||result.status!==0){
    fail("OPENING_DURABLE_APPLICATION_REVIEWED_RUNTIME_REVERIFY_FAILED");
  }
}

function readEvidencePermissionRoots(requestFile,expectedSha){
  if(
    typeof requestFile!=="string"||
    !path.isAbsolute(requestFile)||
    path.resolve(requestFile)!==requestFile
  ){
    fail("OPENING_DURABLE_APPLICATION_REQUEST_PATH_INVALID");
  }
  let bytes;
  const fd=fs.openSync(
    requestFile,
    fs.constants.O_RDONLY|Number(fs.constants.O_NOFOLLOW||0),
  );
  try{
    const before=fs.fstatSync(fd,{bigint:true});
    if(!before.isFile()||before.size<2n||before.size>BigInt(MAX_BYTES)){
      fail("OPENING_DURABLE_APPLICATION_REQUEST_PERMISSION_BYTES_INVALID");
    }
    bytes=Buffer.alloc(Number(before.size));
    let offset=0;
    while(offset<bytes.length){
      const count=fs.readSync(fd,bytes,offset,bytes.length-offset,offset);
      if(count<=0) fail("OPENING_DURABLE_APPLICATION_REQUEST_PERMISSION_SHORT_READ");
      offset+=count;
    }
    const after=fs.fstatSync(fd,{bigint:true});
    if(
      before.dev!==after.dev||
      before.ino!==after.ino||
      before.size!==after.size||
      before.mtimeNs!==after.mtimeNs||
      before.ctimeNs!==after.ctimeNs
    ){
      fail("OPENING_DURABLE_APPLICATION_REQUEST_PERMISSION_CHANGED_DURING_READ");
    }
  }finally{
    fs.closeSync(fd);
  }
  if(sha256(bytes)!==expectedSha){
    fail("OPENING_DURABLE_APPLICATION_REQUEST_PERMISSION_SHA256_MISMATCH");
  }
  let value;
  try{
    value=JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(bytes));
  }catch{
    fail("OPENING_DURABLE_APPLICATION_REQUEST_PERMISSION_JSON_INVALID");
  }
  const dataDir=String(value?.data_dir||"");
  if(
    !path.isAbsolute(dataDir)||
    path.resolve(dataDir)!==dataDir||
    dataDir===path.parse(dataDir).root
  ){
    fail("OPENING_DURABLE_APPLICATION_REQUEST_PERMISSION_DATA_DIR_INVALID");
  }
  return Object.freeze({
    request_file:requestFile,
    data_dir:dataDir,
  });
}

function runReviewedAuthority(repo,request,{requestFile=null,requestFileSha256=null}={}){
  const bundle=buildReviewedExecutionRoot(repo);
  verifyReviewedRuntimeTree(bundle);
  const args=[
    "--permission",
    "--allow-fs-read="+bundle.parent,
    "--allow-child-process",
  ];
  if(requestFile!==null){
    const roots=readEvidencePermissionRoots(requestFile,requestFileSha256);
    args.push("--allow-fs-read="+roots.request_file);
    args.push("--allow-fs-read="+roots.data_dir);
  }
  args.push(bundle.runner_file);
  const result=spawnSync(
    fs.realpathSync.native(process.execPath),
    args,
    {
      cwd:bundle.bootstrap_dir,
      env:privateNodeEnv(bundle.bootstrap_dir),
      input:JSON.stringify(request),
      encoding:"utf8",
      stdio:["pipe","pipe","pipe"],
      maxBuffer:64*1024*1024,
      timeout:120_000,
    },
  );
  if(result.error||result.status!==0){
    const stderr=String(result.stderr||"");
    const tokens=stderr.match(
      /\b(?:ERR_[A-Z0-9_]+|OPENING_[A-Z0-9_:.-]+|promotion_[A-Za-z0-9_:.-]+)/gu,
    )||[];
    const detail=tokens.length?tokens[tokens.length-1]:"UNCLASSIFIED";
    const exit=Number.isInteger(result.status)?String(result.status):"null";
    const signal=typeof result.signal==="string"?result.signal:"none";
    fail(
      "OPENING_DURABLE_APPLICATION_REVIEWED_AUTHORITY_EXECUTION_FAILED:"+
      detail+":exit="+exit+":signal="+signal,
    );
  }
  let value;
  try{
    value=JSON.parse(String(result.stdout||""));
  }catch{
    fail("OPENING_DURABLE_APPLICATION_REVIEWED_AUTHORITY_OUTPUT_INVALID");
  }
  return value;
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
function planBody(plan){
  const out={};
  for(const key of PLAN_KEYS) if(key!=="application_plan_id") out[key]=plan[key];
  return out;
}
function exactAuthority(v){
  exactObject(
    v,
    Object.keys(VOID_WC_VOID_OPENING_DURABLE_EVIDENCE_CANONICAL_APPLICATION_AUTHORITY_V1),
    "OPENING_DURABLE_APPLICATION_AUTHORITY_SHAPE_INVALID",
  );
  if(
    canonicalJson(v)!==
      canonicalJson(VOID_WC_VOID_OPENING_DURABLE_EVIDENCE_CANONICAL_APPLICATION_AUTHORITY_V1)
  ) fail("OPENING_DURABLE_APPLICATION_AUTHORITY_MISMATCH");
}
function assertTargetDelta(productionSource,productionTarget,coupledSource,coupledTarget){
  const p=structuredClone(productionTarget);
  if(
    productionSource.participant_opening_claim_policy_ready!==false||
    productionSource.duplicate_replay_protection_proven!==false||
    productionTarget.participant_opening_claim_policy_ready!==true||
    productionTarget.duplicate_replay_protection_proven!==true||
    productionTarget.bounded_canary_green!==false||
    productionTarget.coupled_activation_ready!==false||
    productionTarget.status!=="hold"
  ) fail("OPENING_DURABLE_APPLICATION_PRODUCTION_DELTA_INVALID");
  p.participant_opening_claim_policy_ready=false;
  p.duplicate_replay_protection_proven=false;
  if(canonicalJson(p)!==canonicalJson(productionSource)){
    fail("OPENING_DURABLE_APPLICATION_PRODUCTION_CHANGE_SCOPE_INVALID");
  }

  const c=structuredClone(coupledTarget);
  if(
    coupledSource?.gates?.opening_claim_transfer_or_refund_binding_ready!==false||
    coupledTarget?.gates?.opening_claim_transfer_or_refund_binding_ready!==true||
    coupledTarget?.gates?.bounded_canary_green!==false||
    coupledTarget?.gates?.coupled_activation_ready!==false||
    coupledTarget.status!=="HOLD"
  ) fail("OPENING_DURABLE_APPLICATION_COUPLED_DELTA_INVALID");
  c.gates.opening_claim_transfer_or_refund_binding_ready=false;
  if(canonicalJson(c)!==canonicalJson(coupledSource)){
    fail("OPENING_DURABLE_APPLICATION_COUPLED_CHANGE_SCOPE_INVALID");
  }
}
function validatePlan(plan){
  exactObject(plan,PLAN_KEYS,"OPENING_DURABLE_APPLICATION_PLAN_SHAPE_INVALID");
  if(
    plan.marker!==VOID_WC_VOID_OPENING_DURABLE_EVIDENCE_CANONICAL_APPLICATION_PLAN_V1||
    plan.version!==1||
    plan.status!=="OPENING_DURABLE_EVIDENCE_CANONICAL_APPLICATION_PREPARED"||
    plan.chain_id!==2050||
    plan.execution_epoch!==2||
    plan.pair!=="WC_VOID"||
    !PLAN_ID.test(String(plan.application_plan_id||""))||
    !PROMOTION_ID.test(String(plan.promotion_id||""))||
    !BINDING_ID.test(String(plan.binding_id||""))||
    !REPLAY_ID.test(String(plan.replay_terminal_capsule_id||""))||
    !HEX64.test(String(plan.replay_terminal_capsule_sha256||""))||
    !BINDING_ID.test(String(plan.replay_transition_id||""))||
    plan.production_candidate_path!==PRODUCTION_REL||
    plan.coupled_candidate_path!==COUPLED_REL||
    plan.successor_candidate_path!==SUCCESSOR_REL||
    plan.durable_claim_binding_verified!==true||
    plan.durable_replay_terminal_verified!==true||
    plan.production_status_remains_hold!==true||
    plan.coupled_status_remains_hold!==true||
    plan.bounded_canary_green!==false||
    plan.coupled_activation_ready!==false||
    plan.reviewed_git_commit_required!==true||
    plan.market_activation_authorized!==false||
    plan.public_presale_activation_authorized!==false||
    plan.funds_movement_authorized!==false
  ) fail("OPENING_DURABLE_APPLICATION_PLAN_INVALID");

  for(const key of [
    "application_base_head_sha","application_base_tree_sha",
    "application_tool_git_blob_sha1","promotion_tool_git_blob_sha1",
    "claim_persistence_tool_git_blob_sha1","replay_persistence_tool_git_blob_sha1",
    "production_classifier_git_blob_sha1","coupled_classifier_git_blob_sha1",
    "production_source_git_blob_sha1","production_target_git_blob_sha1",
    "coupled_source_git_blob_sha1","coupled_target_git_blob_sha1",
    "successor_source_git_blob_sha1",
  ]) if(!HEX40.test(String(plan[key]||""))) fail("OPENING_DURABLE_APPLICATION_PLAN_GIT_ID_INVALID:"+key);

  for(const key of [
    "request_file_sha256","promotion_receipt_file_sha256",
    "production_source_file_sha256","production_target_file_sha256",
    "coupled_source_file_sha256","coupled_target_file_sha256",
    "successor_source_file_sha256",
  ]) if(!HEX64.test(String(plan[key]||""))) fail("OPENING_DURABLE_APPLICATION_PLAN_DIGEST_INVALID:"+key);

  exactAuthority(plan.authority);
  if(
    "voidwcodca1_"+sha256(Buffer.from(canonicalJson(planBody(plan)),"utf8"))!==
      plan.application_plan_id
  ) fail("OPENING_DURABLE_APPLICATION_PLAN_ID_MISMATCH");

  const baseTree=gitText(
    ["rev-parse",plan.application_base_head_sha+"^{tree}"],
    "OPENING_DURABLE_APPLICATION_PLAN_BASE_TREE_UNAVAILABLE",
  );
  if(baseTree!==plan.application_base_tree_sha){
    fail("OPENING_DURABLE_APPLICATION_PLAN_BASE_TREE_MISMATCH");
  }

  for(const [rel,expected,code] of [
    [TOOL_REL,plan.application_tool_git_blob_sha1,"APPLICATION_TOOL"],
    [PROMOTION_TOOL_REL,plan.promotion_tool_git_blob_sha1,"PROMOTION_TOOL"],
    [CLAIM_PERSISTENCE_REL,plan.claim_persistence_tool_git_blob_sha1,"CLAIM_TOOL"],
    [REPLAY_PERSISTENCE_REL,plan.replay_persistence_tool_git_blob_sha1,"REPLAY_TOOL"],
    [PRODUCTION_CLASSIFIER_REL,plan.production_classifier_git_blob_sha1,"PRODUCTION_CLASSIFIER"],
    [COUPLED_CLASSIFIER_REL,plan.coupled_classifier_git_blob_sha1,"COUPLED_CLASSIFIER"],
  ]){
    const actual=gitText(
      ["rev-parse",plan.application_base_head_sha+":"+rel],
      "OPENING_DURABLE_APPLICATION_PLAN_"+code+"_BLOB_UNAVAILABLE",
    );
    if(actual!==expected){
      fail("OPENING_DURABLE_APPLICATION_PLAN_"+code+"_BLOB_MISMATCH");
    }
  }

  const baseProduction=commitFile(
    plan.application_base_head_sha,PRODUCTION_REL,"PLAN_BASE_PRODUCTION",
  );
  const baseCoupled=commitFile(
    plan.application_base_head_sha,COUPLED_REL,"PLAN_BASE_COUPLED",
  );
  const baseSuccessor=commitFile(
    plan.application_base_head_sha,SUCCESSOR_REL,"PLAN_BASE_SUCCESSOR",
  );
  if(
    baseProduction.blob_sha1!==plan.production_source_git_blob_sha1||
    baseProduction.sha256!==plan.production_source_file_sha256||
    baseCoupled.blob_sha1!==plan.coupled_source_git_blob_sha1||
    baseCoupled.sha256!==plan.coupled_source_file_sha256||
    baseSuccessor.blob_sha1!==plan.successor_source_git_blob_sha1||
    baseSuccessor.sha256!==plan.successor_source_file_sha256
  ) fail("OPENING_DURABLE_APPLICATION_PLAN_BASE_SOURCE_MISMATCH");

  if(
    canonicalJson(plan.promoted_production_fields)!==
      canonicalJson([
        "duplicate_replay_protection_proven",
        "participant_opening_claim_policy_ready",
      ])||
    canonicalJson(plan.promoted_coupled_gates)!==
      canonicalJson(["opening_claim_transfer_or_refund_binding_ready"])
  ) fail("OPENING_DURABLE_APPLICATION_PLAN_PROMOTED_FIELDS_INVALID");

  assertTargetDelta(
    baseProduction.value,
    plan.production_target_candidate,
    baseCoupled.value,
    plan.coupled_target_candidate,
  );

  const reviewedClassifiers=runReviewedAuthority(
    {
      head:plan.application_base_head_sha,
      tree:plan.application_base_tree_sha,
    },
    {
      operation:"classify",
      production_before:baseProduction.value,
      production_after:plan.production_target_candidate,
      coupled_before:baseCoupled.value,
      coupled_after:plan.coupled_target_candidate,
      successor:baseSuccessor.value,
    },
  );
  const pBefore=reviewedClassifiers.production_before;
  const pAfter=reviewedClassifiers.production_after;
  const cBefore=reviewedClassifiers.coupled_before;
  const cAfter=reviewedClassifiers.coupled_after;
  if(
    canonicalJson(summary(pBefore))!==canonicalJson(plan.production_before)||
    canonicalJson(summary(pAfter))!==canonicalJson(plan.production_after)||
    canonicalJson(summary(cBefore))!==canonicalJson(plan.coupled_before)||
    canonicalJson(summary(cAfter))!==canonicalJson(plan.coupled_after)||
    pBefore?.status!=="HOLD"||pAfter?.status!=="HOLD"||
    cBefore?.status!=="HOLD"||cAfter?.status!=="HOLD"||
    !sameStrings(
      pAfter.missing_gates,
      removeGates(
        pBefore.missing_gates,
        ["participant_opening_claim_policy_required","duplicate_replay_protection_required"],
      ),
    )||
    !sameStrings(
      cAfter.missing_gates,
      removeGates(cBefore.missing_gates,["opening_claim_transfer_or_refund_binding_required"]),
    )
  ) fail("OPENING_DURABLE_APPLICATION_PLAN_CLASSIFIER_LINEAGE_MISMATCH");

  const productionTargetBytes=prettyBytes(plan.production_target_candidate);
  const coupledTargetBytes=prettyBytes(plan.coupled_target_candidate);
  if(
    sha256(productionTargetBytes)!==plan.production_target_file_sha256||
    gitBlobSha1(productionTargetBytes)!==plan.production_target_git_blob_sha1||
    sha256(coupledTargetBytes)!==plan.coupled_target_file_sha256||
    gitBlobSha1(coupledTargetBytes)!==plan.coupled_target_git_blob_sha1
  ) fail("OPENING_DURABLE_APPLICATION_PLAN_TARGET_IDENTITY_MISMATCH");
  return plan;
}

export function prepareVoidWcVoidOpeningDurableEvidenceCanonicalApplicationV1(input){
  const request=exactObject(
    input,INPUT_KEYS,"INVALID_OPENING_DURABLE_CANONICAL_APPLICATION_INPUT_SHAPE",
  );
  if(
    typeof request.request_file!=="string"||
    !path.isAbsolute(request.request_file)||
    path.resolve(request.request_file)!==request.request_file
  ) fail("OPENING_DURABLE_APPLICATION_REQUEST_PATH_INVALID");
  if(typeof request.request_file_sha256!=="string"||!HEX64.test(request.request_file_sha256)){
    fail("OPENING_DURABLE_APPLICATION_REQUEST_SHA256_INVALID");
  }
  const receiptSource=parseJsonBytes(
    request.promotion_receipt_bytes,
    request.promotion_receipt_file_sha256,
    "OPENING_DURABLE_APPLICATION_PROMOTION_RECEIPT",
  );

  const repo=repositoryIdentity();
  const production=headFile(PRODUCTION_REL,"PRODUCTION_SOURCE");
  const coupled=headFile(COUPLED_REL,"COUPLED_SOURCE");
  const successor=headFile(SUCCESSOR_REL,"SUCCESSOR_SOURCE");

  const reviewed=runReviewedAuthority(
    repo,
    {
      operation:"prepare",
      request_file:request.request_file,
      request_file_sha256:request.request_file_sha256,
    },
    {
      requestFile:request.request_file,
      requestFileSha256:request.request_file_sha256,
    },
  );
  const reexecuted=reviewed.promotion;
  if(canonicalJson(reexecuted)!==canonicalJson(receiptSource.value)){
    fail("OPENING_DURABLE_APPLICATION_REVIEWED_PROMOTION_RECEIPT_MISMATCH");
  }
  if(
    reexecuted.marker!==VOID_WC_VOID_OPENING_DURABLE_EVIDENCE_CANDIDATE_PROMOTION_V1||
    reexecuted.repository_head_sha!==repo.head||
    reexecuted.repository_tree_sha!==repo.tree||
    reexecuted.production_candidate_git_blob_sha1!==production.blob_sha1||
    reexecuted.production_candidate_sha256!==production.sha256||
    reexecuted.coupled_candidate_git_blob_sha1!==coupled.blob_sha1||
    reexecuted.coupled_candidate_sha256!==coupled.sha256||
    reexecuted.successor_candidate_git_blob_sha1!==successor.blob_sha1||
    reexecuted.successor_candidate_sha256!==successor.sha256||
    reexecuted.request_file_sha256!==request.request_file_sha256||
    reexecuted.durable_claim_binding_verified!==true||
    reexecuted.durable_replay_terminal_verified!==true||
    reexecuted.shared_opening_evidence_custody_generation_verified!==true||
    reexecuted.production_candidate_file_updated!==false||
    reexecuted.coupled_candidate_file_updated!==false||
    reexecuted.candidate_promotion_application_required!==true||
    reexecuted.bounded_canary_green!==false||
    reexecuted.coupled_activation_ready!==false||
    canonicalJson(reexecuted.authority)!==
      canonicalJson(reviewed.promotion_authority)
  ) fail("OPENING_DURABLE_APPLICATION_PROMOTION_CONTRACT_INVALID");

  const productionTarget=structuredClone(reexecuted.promoted_production_candidate);
  const coupledTarget=structuredClone(reexecuted.promoted_coupled_candidate);
  assertTargetDelta(production.value,productionTarget,coupled.value,coupledTarget);

  const pBefore=reviewed.production_before;
  const pAfter=reviewed.production_after;
  const cBefore=reviewed.coupled_before;
  const cAfter=reviewed.coupled_after;
  if(
    canonicalJson(summary(pBefore))!==canonicalJson(reexecuted.production_before)||
    canonicalJson(summary(pAfter))!==canonicalJson(reexecuted.production_after)||
    canonicalJson(summary(cBefore))!==canonicalJson(reexecuted.coupled_before)||
    canonicalJson(summary(cAfter))!==canonicalJson(reexecuted.coupled_after)
  ) fail("OPENING_DURABLE_APPLICATION_PROMOTION_CLASSIFIER_MISMATCH");

  const productionTargetBytes=prettyBytes(productionTarget);
  const coupledTargetBytes=prettyBytes(coupledTarget);
  const material=Object.freeze({
    marker:VOID_WC_VOID_OPENING_DURABLE_EVIDENCE_CANONICAL_APPLICATION_PLAN_V1,
    version:1,
    status:"OPENING_DURABLE_EVIDENCE_CANONICAL_APPLICATION_PREPARED",
    chain_id:2050,
    execution_epoch:2,
    pair:"WC_VOID",
    application_base_head_sha:repo.head,
    application_base_tree_sha:repo.tree,
    application_tool_git_blob_sha1:
      gitText(["rev-parse","HEAD:"+TOOL_REL],"OPENING_DURABLE_APPLICATION_TOOL_BLOB_UNAVAILABLE"),
    promotion_tool_git_blob_sha1:
      gitText(["rev-parse","HEAD:"+PROMOTION_TOOL_REL],"OPENING_DURABLE_APPLICATION_PROMOTION_TOOL_BLOB_UNAVAILABLE"),
    claim_persistence_tool_git_blob_sha1:
      gitText(["rev-parse","HEAD:"+CLAIM_PERSISTENCE_REL],"OPENING_DURABLE_APPLICATION_CLAIM_TOOL_BLOB_UNAVAILABLE"),
    replay_persistence_tool_git_blob_sha1:
      gitText(["rev-parse","HEAD:"+REPLAY_PERSISTENCE_REL],"OPENING_DURABLE_APPLICATION_REPLAY_TOOL_BLOB_UNAVAILABLE"),
    production_classifier_git_blob_sha1:
      gitText(["rev-parse","HEAD:"+PRODUCTION_CLASSIFIER_REL],"OPENING_DURABLE_APPLICATION_PRODUCTION_CLASSIFIER_BLOB_UNAVAILABLE"),
    coupled_classifier_git_blob_sha1:
      gitText(["rev-parse","HEAD:"+COUPLED_CLASSIFIER_REL],"OPENING_DURABLE_APPLICATION_COUPLED_CLASSIFIER_BLOB_UNAVAILABLE"),
    request_file_sha256:request.request_file_sha256,
    promotion_receipt_file_sha256:receiptSource.sha256,
    promotion_id:reexecuted.promotion_id,
    coupled_launch_id:reexecuted.coupled_launch_id,
    binding_id:reexecuted.binding_id,
    replay_terminal_capsule_id:reexecuted.replay_terminal_capsule_id,
    replay_terminal_capsule_sha256:reexecuted.replay_terminal_capsule_sha256,
    replay_transition_id:reexecuted.replay_transition_id,
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
    production_before:summary(pBefore),
    production_after:summary(pAfter),
    coupled_before:summary(cBefore),
    coupled_after:summary(cAfter),
    promoted_production_fields:Object.freeze([
      "duplicate_replay_protection_proven",
      "participant_opening_claim_policy_ready",
    ]),
    promoted_coupled_gates:Object.freeze([
      "opening_claim_transfer_or_refund_binding_ready",
    ]),
    durable_claim_binding_verified:true,
    durable_replay_terminal_verified:true,
    production_status_remains_hold:true,
    coupled_status_remains_hold:true,
    bounded_canary_green:false,
    coupled_activation_ready:false,
    reviewed_git_commit_required:true,
    market_activation_authorized:false,
    public_presale_activation_authorized:false,
    funds_movement_authorized:false,
    authority:
      VOID_WC_VOID_OPENING_DURABLE_EVIDENCE_CANONICAL_APPLICATION_AUTHORITY_V1,
  });
  const plan=Object.freeze({
    ...material,
    application_plan_id:
      "voidwcodca1_"+sha256(Buffer.from(canonicalJson(material),"utf8")),
  });
  validatePlan(plan);
  const after=repositoryIdentity();
  if(after.head!==repo.head||after.tree!==repo.tree){
    fail("OPENING_DURABLE_APPLICATION_REPOSITORY_CHANGED_DURING_PREPARE");
  }
  return plan;
}

export function verifyVoidWcVoidOpeningDurableEvidenceCanonicalApplicationStateV1({
  plan,
  productionCandidate,
  coupledCandidate,
  successorCandidate,
}={}){
  validatePlan(plan);
  if(
    canonicalJson(productionCandidate)!==canonicalJson(plan.production_target_candidate)
  ) fail("OPENING_DURABLE_APPLICATION_PRODUCTION_TARGET_NOT_APPLIED");
  if(
    canonicalJson(coupledCandidate)!==canonicalJson(plan.coupled_target_candidate)
  ) fail("OPENING_DURABLE_APPLICATION_COUPLED_TARGET_NOT_APPLIED");
  const successorBytes=prettyBytes(successorCandidate);
  if(
    sha256(successorBytes)!==plan.successor_source_file_sha256||
    gitBlobSha1(successorBytes)!==plan.successor_source_git_blob_sha1
  ) fail("OPENING_DURABLE_APPLICATION_SUCCESSOR_SOURCE_DRIFT");
  const reviewed=runReviewedAuthority(
    {
      head:plan.application_base_head_sha,
      tree:plan.application_base_tree_sha,
    },
    {
      operation:"classify",
      production_before:productionCandidate,
      production_after:productionCandidate,
      coupled_before:coupledCandidate,
      coupled_after:coupledCandidate,
      successor:successorCandidate,
    },
  );
  const p=reviewed.production_after;
  const c=reviewed.coupled_after;
  if(
    canonicalJson(summary(p))!==canonicalJson(plan.production_after)||
    canonicalJson(summary(c))!==canonicalJson(plan.coupled_after)
  ) fail("OPENING_DURABLE_APPLICATION_CLASSIFIER_STATE_MISMATCH");
  return Object.freeze({
    ok:true,
    status:"OPENING_DURABLE_APPLICATION_STATE_VERIFIED_FINAL_ACTIVATION_HOLD",
    application_plan_id:plan.application_plan_id,
    durable_claim_binding_verified:true,
    durable_replay_terminal_verified:true,
    participant_opening_claim_policy_ready:true,
    duplicate_replay_protection_proven:true,
    opening_claim_transfer_or_refund_binding_ready:true,
    bounded_canary_green:false,
    coupled_activation_ready:false,
    market_activation_authorized:false,
    public_presale_activation_authorized:false,
    funds_movement_authorized:false,
  });
}

export function verifyVoidWcVoidOpeningDurableEvidenceCanonicalApplicationV1({
  application_plan_bytes,
  application_plan_file_sha256,
}={}){
  const source=parseJsonBytes(
    application_plan_bytes,
    application_plan_file_sha256,
    "OPENING_DURABLE_APPLICATION_PLAN_FILE",
  );
  const plan=validatePlan(source.value);
  const repo=repositoryIdentity();
  if(repo.branch!=="main") fail("OPENING_DURABLE_APPLICATION_APPLIED_BRANCH_NOT_MAIN");
  const ancestry=gitRun(
    ["merge-base","--is-ancestor",plan.application_base_head_sha,repo.head],
    "OPENING_DURABLE_APPLICATION_BASE_ANCESTRY_FAILED",
    {allowFail:true},
  );
  if(ancestry.status!==0) fail("OPENING_DURABLE_APPLICATION_BASE_NOT_ANCESTOR");

  const production=headFile(PRODUCTION_REL,"APPLIED_PRODUCTION");
  const coupled=headFile(COUPLED_REL,"APPLIED_COUPLED");
  const successor=headFile(SUCCESSOR_REL,"APPLIED_SUCCESSOR");
  if(
    production.blob_sha1!==plan.production_target_git_blob_sha1||
    production.sha256!==plan.production_target_file_sha256
  ) fail("OPENING_DURABLE_APPLICATION_PRODUCTION_BLOB_NOT_APPLIED");
  if(
    coupled.blob_sha1!==plan.coupled_target_git_blob_sha1||
    coupled.sha256!==plan.coupled_target_file_sha256
  ) fail("OPENING_DURABLE_APPLICATION_COUPLED_BLOB_NOT_APPLIED");
  if(
    successor.blob_sha1!==plan.successor_source_git_blob_sha1||
    successor.sha256!==plan.successor_source_file_sha256
  ) fail("OPENING_DURABLE_APPLICATION_SUCCESSOR_BLOB_DRIFT");

  for(const [rel,expected,code] of [
    [TOOL_REL,plan.application_tool_git_blob_sha1,"APPLICATION_TOOL"],
    [PROMOTION_TOOL_REL,plan.promotion_tool_git_blob_sha1,"PROMOTION_TOOL"],
    [CLAIM_PERSISTENCE_REL,plan.claim_persistence_tool_git_blob_sha1,"CLAIM_TOOL"],
    [REPLAY_PERSISTENCE_REL,plan.replay_persistence_tool_git_blob_sha1,"REPLAY_TOOL"],
    [PRODUCTION_CLASSIFIER_REL,plan.production_classifier_git_blob_sha1,"PRODUCTION_CLASSIFIER"],
    [COUPLED_CLASSIFIER_REL,plan.coupled_classifier_git_blob_sha1,"COUPLED_CLASSIFIER"],
  ]){
    const actual=gitText(
      ["rev-parse","HEAD:"+rel],
      "OPENING_DURABLE_APPLICATION_CURRENT_"+code+"_BLOB_UNAVAILABLE",
    );
    if(actual!==expected){
      fail("OPENING_DURABLE_APPLICATION_TOOL_LINEAGE_DRIFT:"+code);
    }
  }

  const state=verifyVoidWcVoidOpeningDurableEvidenceCanonicalApplicationStateV1({
    plan,
    productionCandidate:production.value,
    coupledCandidate:coupled.value,
    successorCandidate:successor.value,
  });
  const material=Object.freeze({
    marker:VOID_WC_VOID_OPENING_DURABLE_EVIDENCE_CANONICAL_APPLICATION_V1,
    version:1,
    status:"OPENING_DURABLE_EVIDENCE_CANONICAL_APPLICATION_VERIFIED_FINAL_ACTIVATION_HOLD",
    application_plan_id:plan.application_plan_id,
    application_plan_file_sha256:source.sha256,
    application_base_head_sha:plan.application_base_head_sha,
    applied_head_sha:repo.head,
    applied_tree_sha:repo.tree,
    production_candidate_git_blob_sha1:production.blob_sha1,
    coupled_candidate_git_blob_sha1:coupled.blob_sha1,
    successor_candidate_git_blob_sha1:successor.blob_sha1,
    exact_three_field_source_application_verified:true,
    durable_claim_binding_verified:true,
    durable_replay_terminal_verified:true,
    bounded_canary_green:false,
    coupled_activation_ready:false,
    final_coupled_activation_required:true,
    market_activation_authorized:false,
    public_presale_activation_authorized:false,
    funds_movement_authorized:false,
    authority:
      VOID_WC_VOID_OPENING_DURABLE_EVIDENCE_CANONICAL_APPLICATION_AUTHORITY_V1,
  });
  return Object.freeze({
    ...material,
    application_id:
      "voidwcodcaap1_"+sha256(Buffer.from(canonicalJson(material),"utf8")),
    state,
  });
}

export const _internal=Object.freeze({
  canonicalJson,
  prettyBytes,
  sha256,
  gitBlobSha1,
  makeExecutionTreeReadOnly,
  makeExecutionTreeRemovable,
});
