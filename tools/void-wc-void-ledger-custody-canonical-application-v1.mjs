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
const REVIEWED_RUNTIME_PROFILE_ID=/^voidrnpr1_[0-9a-f]{64}$/u;
const CANONICAL_REMOTE="https://github.com/6ZoSo9/void-node.git";
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
  const rawOrigin=gitText(
    ["config","--local","--no-includes","--get","remote.origin.url"],
    "LEDGER_CUSTODY_APPLICATION_ORIGIN_UNAVAILABLE",
  );
  const acceptedOrigins=new Set([
    "https://github.com/6ZoSo9/void-node",
    "https://github.com/6ZoSo9/void-node.git",
    "git@github.com:6ZoSo9/void-node.git",
    "ssh://git@github.com/6ZoSo9/void-node.git",
  ]);
  if(!acceptedOrigins.has(rawOrigin)){
    fail("LEDGER_CUSTODY_APPLICATION_CANONICAL_ORIGIN_MISMATCH");
  }
  return Object.freeze({head,tree,branch,origin:CANONICAL_REMOTE});
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
function commitBytes(commit,rel,label){
  if(typeof commit!=="string"||!HEX40.test(commit)){
    fail("LEDGER_CUSTODY_APPLICATION_"+label+"_COMMIT_INVALID");
  }
  const bytes=gitBytes(
    ["show",commit+":"+rel],
    "LEDGER_CUSTODY_APPLICATION_"+label+"_BYTES_UNAVAILABLE",
  );
  if(bytes.length<1||bytes.length>MAX_BYTES){
    fail("LEDGER_CUSTODY_APPLICATION_"+label+"_BYTES_INVALID");
  }
  const blob=gitText(
    ["rev-parse",commit+":"+rel],
    "LEDGER_CUSTODY_APPLICATION_"+label+"_BLOB_UNAVAILABLE",
  );
  if(!HEX40.test(blob)||gitBlobSha1(bytes)!==blob){
    fail("LEDGER_CUSTODY_APPLICATION_"+label+"_BLOB_MISMATCH");
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
    GIT_ATTR_NOSYSTEM:"1",
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

function fchmodReviewedDirectory(file,mode){
  const fd=fs.openSync(
    file,
    fs.constants.O_RDONLY|
      Number(fs.constants.O_DIRECTORY||0)|
      Number(fs.constants.O_NOFOLLOW||0),
  );
  try{
    const stat=fs.fstatSync(fd);
    if(!stat.isDirectory()){
      fail("LEDGER_CUSTODY_APPLICATION_REVIEWED_DIRECTORY_DESCRIPTOR_INVALID");
    }
    fs.fchmodSync(fd,mode);
  }finally{
    fs.closeSync(fd);
  }
}

function fchmodReviewedRegularFile(file,mode){
  const fd=fs.openSync(
    file,
    fs.constants.O_RDONLY|Number(fs.constants.O_NOFOLLOW||0),
  );
  try{
    const stat=fs.fstatSync(fd);
    if(!stat.isFile()){
      fail("LEDGER_CUSTODY_APPLICATION_REVIEWED_FILE_DESCRIPTOR_INVALID");
    }
    fs.fchmodSync(fd,mode);
  }finally{
    fs.closeSync(fd);
  }
}

function makeExecutionTreeReadOnly(root){
  const rootStat=fs.lstatSync(root);
  if(rootStat.isSymbolicLink()||!rootStat.isDirectory()){
    fail("LEDGER_CUSTODY_APPLICATION_REVIEWED_TREE_ROOT_INVALID");
  }
  function walk(dir){
    for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
      const file=path.join(dir,entry.name);
      const relative=path.relative(root,file);
      if(relative===".git"||relative.startsWith(".git"+path.sep)){
        continue;
      }
      if(entry.isDirectory()){
        walk(file);
        fchmodReviewedDirectory(file,0o500);
      }else if(entry.isSymbolicLink()){
        const stat=fs.lstatSync(file);
        if(!stat.isSymbolicLink()){
          fail("LEDGER_CUSTODY_APPLICATION_REVIEWED_SYMLINK_IDENTITY_INVALID");
        }
      }else if(entry.isFile()){
        const stat=fs.lstatSync(file);
        const executable=(Number(stat.mode)&0o111)!==0;
        fchmodReviewedRegularFile(file,executable?0o500:0o400);
      }else{
        fail("LEDGER_CUSTODY_APPLICATION_REVIEWED_TREE_ENTRY_INVALID");
      }
    }
  }
  walk(root);
  fchmodReviewedDirectory(root,0o500);
}

function makeExecutionTreeRemovable(root){
  if(!fs.existsSync(root)) return;
  const rootStat=fs.lstatSync(root);
  if(rootStat.isSymbolicLink()||!rootStat.isDirectory()){
    fail("LEDGER_CUSTODY_APPLICATION_REVIEWED_TREE_ROOT_INVALID");
  }
  fchmodReviewedDirectory(root,0o700);
  function walk(dir){
    for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
      const file=path.join(dir,entry.name);
      const relative=path.relative(root,file);
      if(relative===".git"||relative.startsWith(".git"+path.sep)){
        continue;
      }
      if(entry.isDirectory()){
        fchmodReviewedDirectory(file,0o700);
        walk(file);
      }else if(entry.isSymbolicLink()){
        const stat=fs.lstatSync(file);
        if(!stat.isSymbolicLink()){
          fail("LEDGER_CUSTODY_APPLICATION_REVIEWED_SYMLINK_IDENTITY_INVALID");
        }
      }else if(entry.isFile()){
        fchmodReviewedRegularFile(file,0o600);
      }else{
        fail("LEDGER_CUSTODY_APPLICATION_REVIEWED_TREE_ENTRY_INVALID");
      }
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
    const textValue=new TextDecoder("utf-8",{fatal:true}).decode(source.bytes);
    const specs=[];
    for(const re of [
      /\bfrom\s+["']([^"']+)["']/gu,
      /\bimport\s*\(\s*["']([^"']+)["']\s*\)/gu,
      /\bimport\s+["']([^"']+)["']/gu,
    ]){
      let match;
      while((match=re.exec(textValue))!==null) specs.push(match[1]);
    }
    for(const spec of specs){
      if(spec.startsWith("node:")) continue;
      if(spec==="ethers") continue;
      if(!spec.startsWith(".")){
        fail("LEDGER_CUSTODY_APPLICATION_REVIEWED_BARE_IMPORT_FORBIDDEN:"+spec);
      }
      const target=path.posix.normalize(
        path.posix.join(path.posix.dirname(rel),spec),
      );
      if(!target.startsWith("tools/")||!target.endsWith(".mjs")){
        fail("LEDGER_CUSTODY_APPLICATION_REVIEWED_IMPORT_ESCAPE:"+target);
      }
      pending.push(target);
    }
    if(
      textValue.includes("node:child_process")&&
      rel!==PROMOTION_TOOL_REL
    ){
      fail("LEDGER_CUSTODY_APPLICATION_REVIEWED_CHILD_PROCESS_SURFACE:"+rel);
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
  const closure=reviewedModuleClosure(repo.head);

  const parent=fs.mkdtempSync(
    path.join(os.tmpdir(),"void-ledger-custody-reviewed-"),
  );
  fs.chmodSync(parent,0o700);
  try{
    const bootstrapDir=path.join(parent,"bootstrap");
    fs.mkdirSync(bootstrapDir,{mode:0o700});
    const runtimeToolSource=commitBytes(
      repo.head,
      REVIEWED_RUNTIME_TOOL_REL,
      "REVIEWED_RUNTIME_TOOL",
    );
    const runtimeToolFile=path.join(
      bootstrapDir,
      "void-reviewed-node-package-runtime-v1.mjs",
    );
    writePrivateSource(runtimeToolFile,runtimeToolSource.bytes);

    const runtimeProfileSource=commitBytes(
      repo.head,
      REVIEWED_RUNTIME_PROFILE_REL,
      "REVIEWED_RUNTIME_PROFILE",
    );
    const profileFile=path.join(bootstrapDir,"profile.json");
    writePrivateSource(profileFile,runtimeProfileSource.bytes);

    const executionRoot=path.join(parent,"execution");
    const bootstrapFile=path.join(bootstrapDir,"bootstrap.mjs");
    const bootstrapSource=[
      'import fs from "node:fs";',
      'import { materializeReviewedNodePackageRuntimeV1, verifyMaterializedReviewedNodePackageRuntimeV1 } from "./void-reviewed-node-package-runtime-v1.mjs";',
      'process.stdin.setEncoding("utf8");',
      'let requestText="";',
      'for await (const chunk of process.stdin) requestText+=chunk;',
      'const request=JSON.parse(requestText);',
      'const profile=JSON.parse(fs.readFileSync(request.profile_file,"utf8"));',
      'const result=request.action==="materialize"',
      '  ? materializeReviewedNodePackageRuntimeV1({profile,repoRoot:request.repo_root,destinationRoot:request.destination_root})',
      '  : verifyMaterializedReviewedNodePackageRuntimeV1({profile,repoRoot:request.repo_root,destinationRoot:request.destination_root});',
      'process.stdout.write(JSON.stringify(result));',
      '',
    ].join("\n");
    writePrivateSource(bootstrapFile,Buffer.from(bootstrapSource,"utf8"));

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
      fail("LEDGER_CUSTODY_APPLICATION_REVIEWED_RUNTIME_MATERIALIZATION_FAILED");
    }
    let materialized;
    try{materialized=JSON.parse(String(bootstrap.stdout||""));}
    catch{fail("LEDGER_CUSTODY_APPLICATION_REVIEWED_RUNTIME_OUTPUT_INVALID");}
    if(
      materialized?.ok!==true||
      materialized.status!=="PRIVATE_REVIEWED_NODE_PACKAGE_RUNTIME_VERIFIED"||
      typeof materialized.profile_id!=="string"||
      typeof materialized.packages_aggregate_sha256!=="string"||
      !HEX64.test(materialized.packages_aggregate_sha256)||
      materialized.read_only_materialization!==true
    ){
      fail("LEDGER_CUSTODY_APPLICATION_REVIEWED_RUNTIME_INVALID");
    }

    gitRunPrivate(
      executionRoot,
      ["init","--quiet"],
      "LEDGER_CUSTODY_APPLICATION_PRIVATE_GIT_INIT_FAILED",
    );
    gitRunPrivate(
      executionRoot,
      ["fetch","--quiet","--no-tags","--depth=1",ROOT,repo.head],
      "LEDGER_CUSTODY_APPLICATION_PRIVATE_GIT_FETCH_FAILED",
    );
    gitRunPrivate(
      executionRoot,
      ["checkout","--quiet","--detach","FETCH_HEAD"],
      "LEDGER_CUSTODY_APPLICATION_PRIVATE_GIT_CHECKOUT_FAILED",
    );
    const privateHead=String(
      gitRunPrivate(
        executionRoot,
        ["rev-parse","HEAD"],
        "LEDGER_CUSTODY_APPLICATION_PRIVATE_HEAD_UNAVAILABLE",
      ).stdout||"",
    ).trim();
    const privateTree=String(
      gitRunPrivate(
        executionRoot,
        ["rev-parse","HEAD^{tree}"],
        "LEDGER_CUSTODY_APPLICATION_PRIVATE_TREE_UNAVAILABLE",
      ).stdout||"",
    ).trim();
    if(privateHead!==repo.head||privateTree!==repo.tree){
      fail("LEDGER_CUSTODY_APPLICATION_PRIVATE_GIT_IDENTITY_MISMATCH");
    }

    for(const [relativePath,expectedBlob] of Object.entries(closure.module_git_blobs)){
      const privateFile=path.join(executionRoot,relativePath);
      const actual=gitBlobSha1(fs.readFileSync(privateFile));
      if(actual!==expectedBlob){
        fail("LEDGER_CUSTODY_APPLICATION_PRIVATE_MODULE_BLOB_MISMATCH:"+relativePath);
      }
    }

    const runnerDir=path.join(parent,"runner");
    fs.mkdirSync(runnerDir,{mode:0o700});
    const runnerFile=path.join(
      runnerDir,
      "ledger-custody-reviewed-runner-v1.mjs",
    );
    const promotionUrl=JSON.stringify(
      "../execution/"+PROMOTION_TOOL_REL,
    );
    const productionUrl=JSON.stringify(
      "../execution/"+PRODUCTION_CLASSIFIER_REL,
    );
    const coupledUrl=JSON.stringify(
      "../execution/"+COUPLED_CLASSIFIER_REL,
    );
    const runnerSource=[
      'import { buildVoidWcVoidLedgerCustodyCoupledCandidatePromotionV1, VOID_WC_VOID_LEDGER_CUSTODY_COUPLED_CANDIDATE_PROMOTION_AUTHORITY_V1, VOID_WC_VOID_LEDGER_CUSTODY_COUPLED_CANDIDATE_PROMOTION_V1 } from '+promotionUrl+';',
      'import { classifyVoidWcVoidProductionReadinessV1 } from '+productionUrl+';',
      'import { classifyVoidCoupledEconomicSuccessorGateV1 } from '+coupledUrl+';',
      'const MARKER='+JSON.stringify(REVIEWED_AUTHORITY_ENVELOPE_MARKER)+';',
      'process.stdin.setEncoding("utf8");',
      'let requestText="";',
      'for await (const chunk of process.stdin) requestText+=chunk;',
      'let operation="";',
      'let envelope;',
      'try{',
      '  const request=JSON.parse(requestText);',
      '  operation=String(request.operation||"");',
      '  let result;',
      '  if(operation==="prepare"){',
      '    const promotion=buildVoidWcVoidLedgerCustodyCoupledCandidatePromotionV1({candidate:request.coupled_before,successorMigrationCandidate:request.successor,ledgerPersistenceImportInput:request.ledger_import_input,ledgerPersistenceImportInputFileSha256:request.ledger_import_input_file_sha256,candidateFileSha256:request.coupled_file_sha256,successorCandidateFileSha256:request.successor_file_sha256,repositoryHeadSha:request.repository_head_sha,repositoryTreeSha:request.repository_tree_sha});',
      '    const promotion_contract_green=promotion.marker===VOID_WC_VOID_LEDGER_CUSTODY_COUPLED_CANDIDATE_PROMOTION_V1&&promotion.canonical_candidate_file_updated===false&&promotion.candidate_promotion_application_required===true&&promotion.coupled_activation_ready===false&&JSON.stringify(promotion.authority)===JSON.stringify(VOID_WC_VOID_LEDGER_CUSTODY_COUPLED_CANDIDATE_PROMOTION_AUTHORITY_V1);',
      '    result={promotion,promotion_contract_green,production_before:classifyVoidWcVoidProductionReadinessV1(request.production_before),production_after:classifyVoidWcVoidProductionReadinessV1(request.production_after),coupled_before:classifyVoidCoupledEconomicSuccessorGateV1(request.coupled_before,request.successor),coupled_after:classifyVoidCoupledEconomicSuccessorGateV1(promotion.promoted_candidate,request.successor)};',
      '  }else if(operation==="classify"){',
      '    result={production_before:classifyVoidWcVoidProductionReadinessV1(request.production_before),production_after:classifyVoidWcVoidProductionReadinessV1(request.production_after),coupled_before:classifyVoidCoupledEconomicSuccessorGateV1(request.coupled_before,request.successor),coupled_after:classifyVoidCoupledEconomicSuccessorGateV1(request.coupled_after,request.successor)};',
      '  }else{throw new Error("ledger_custody_reviewed_operation_invalid");}',
      '  envelope={marker:MARKER,version:1,operation,ok:true,result,error:null};',
      '}catch(error){',
      '  const message=error instanceof Error?error.message:String(error);',
      '  envelope={marker:MARKER,version:1,operation,ok:false,result:null,error:message.slice(0,512)};',
      '}',
      'process.stdout.write(JSON.stringify(envelope));',
      '',
    ].join("\n");
    writePrivateSource(runnerFile,Buffer.from(runnerSource,"utf8"));

    makeExecutionTreeReadOnly(executionRoot);

    const privateStatus=String(
      gitRunPrivate(
        executionRoot,
        ["status","--porcelain=v1","--untracked-files=all"],
        "LEDGER_CUSTODY_APPLICATION_PRIVATE_STATUS_UNAVAILABLE",
      ).stdout||"",
    ).trim();
    if(privateStatus!==""){
      fail("LEDGER_CUSTODY_APPLICATION_PRIVATE_WORKTREE_NOT_CLEAN");
    }

    reviewedExecutionCache=Object.freeze({
      head:repo.head,
      tree:repo.tree,
      parent,
      bootstrap_dir:bootstrapDir,
      execution_root:executionRoot,
      runner_file:runnerFile,
      bootstrap_file:bootstrapFile,
      profile_file:profileFile,
      binding:Object.freeze({
        module_git_blobs:closure.module_git_blobs,
        runtime_tool_git_blob_sha1:runtimeToolSource.blob_sha1,
        runtime_profile_git_blob_sha1:runtimeProfileSource.blob_sha1,
        profile_id:materialized.profile_id,
        packages_aggregate_sha256:materialized.packages_aggregate_sha256,
        permission_fenced:true,
        ancestor_package_resolution_allowed:false,
        execution_network_isolation_provided:false,
      }),
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
        "ledger_custody_reviewed_execution_cleanup_failed",
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
    fail("LEDGER_CUSTODY_APPLICATION_REVIEWED_RUNTIME_REVERIFY_FAILED");
  }
}

function runReviewedAuthority(repo,request){
  const bundle=buildReviewedExecutionRoot(repo);
  verifyReviewedRuntimeTree(bundle);
  const result=spawnSync(
    fs.realpathSync.native(process.execPath),
    [
      "--permission",
      "--allow-fs-read="+bundle.parent,
      "--allow-child-process",
      bundle.runner_file,
    ],
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
    fail("LEDGER_CUSTODY_APPLICATION_REVIEWED_AUTHORITY_EXECUTION_FAILED");
  }
  let envelope;
  try{envelope=JSON.parse(String(result.stdout||""));}
  catch{fail("LEDGER_CUSTODY_APPLICATION_REVIEWED_AUTHORITY_OUTPUT_INVALID");}
  exactObject(
    envelope,
    ["marker","version","operation","ok","result","error"],
    "LEDGER_CUSTODY_APPLICATION_REVIEWED_AUTHORITY_OUTPUT_SHAPE_INVALID",
  );
  if(
    envelope.marker!==REVIEWED_AUTHORITY_ENVELOPE_MARKER||
    envelope.version!==1||
    envelope.operation!==String(request?.operation||"")||
    typeof envelope.ok!=="boolean"
  ){
    fail("LEDGER_CUSTODY_APPLICATION_REVIEWED_AUTHORITY_OUTPUT_INVALID");
  }
  if(envelope.ok===false){
    if(
      envelope.result!==null||
      typeof envelope.error!=="string"||
      envelope.error.length<1||
      envelope.error.length>512
    ){
      fail("LEDGER_CUSTODY_APPLICATION_REVIEWED_AUTHORITY_ERROR_OUTPUT_INVALID");
    }
    fail(envelope.error);
  }
  if(!plain(envelope.result)||envelope.error!==null){
    fail("LEDGER_CUSTODY_APPLICATION_REVIEWED_AUTHORITY_SUCCESS_OUTPUT_INVALID");
  }
  return Object.freeze({
    result:envelope.result,
    binding:bundle.binding,
  });
}

function assertReviewedExecutionBinding(plan,binding){
  if(
    canonicalJson(plan.reviewed_execution_module_git_blobs)!==
      canonicalJson(binding.module_git_blobs)||
    plan.reviewed_runtime_tool_git_blob_sha1!==
      binding.runtime_tool_git_blob_sha1||
    plan.reviewed_runtime_profile_git_blob_sha1!==
      binding.runtime_profile_git_blob_sha1||
    plan.reviewed_runtime_profile_id!==binding.profile_id||
    plan.reviewed_runtime_packages_aggregate_sha256!==
      binding.packages_aggregate_sha256||
    plan.reviewed_execution_permission_fenced!==true||
    plan.reviewed_execution_ancestor_package_resolution_allowed!==false||
    plan.reviewed_execution_network_isolation_provided!==false
  ){
    fail("LEDGER_CUSTODY_APPLICATION_REVIEWED_EXECUTION_LINEAGE_DRIFT");
  }
}

function canonicalRemoteMainHead(){
  const result=spawnSync(
    GIT,
    ["ls-remote",CANONICAL_REMOTE,"refs/heads/main"],
    {
      env:sanitizedGitEnv(),
      encoding:"utf8",
      stdio:["ignore","pipe","pipe"],
      maxBuffer:1024*1024,
      timeout:60_000,
    },
  );
  if(result.error||result.status!==0){
    fail("LEDGER_CUSTODY_APPLICATION_REMOTE_MAIN_UNAVAILABLE");
  }
  const line=String(result.stdout||"").trim();
  const match=/^([0-9a-f]{40})\s+refs\/heads\/main$/u.exec(line);
  if(!match){
    fail("LEDGER_CUSTODY_APPLICATION_REMOTE_MAIN_INVALID");
  }
  return match[1];
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
    !plain(plan.reviewed_execution_module_git_blobs)||
    !REVIEWED_RUNTIME_PROFILE_ID.test(String(plan.reviewed_runtime_profile_id||""))||
    !HEX64.test(String(plan.reviewed_runtime_packages_aggregate_sha256||""))||
    plan.reviewed_execution_permission_fenced!==true||
    plan.reviewed_execution_ancestor_package_resolution_allowed!==false||
    plan.reviewed_execution_network_isolation_provided!==false||
    plan.market_activation_authorized!==false||
    plan.public_presale_activation_authorized!==false||
    plan.funds_movement_authorized!==false
  ) fail("LEDGER_CUSTODY_APPLICATION_PLAN_INVALID");
  for(const key of [
    "application_base_head_sha","application_base_tree_sha",
    "application_tool_git_blob_sha1","promotion_tool_git_blob_sha1",
    "production_classifier_git_blob_sha1","coupled_classifier_git_blob_sha1",
    "ledger_import_tool_git_blob_sha1",
    "reviewed_runtime_tool_git_blob_sha1",
    "reviewed_runtime_profile_git_blob_sha1",
    "production_source_git_blob_sha1",
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

  const expectedClosure=reviewedModuleClosure(
    plan.application_base_head_sha,
  );
  if(
    canonicalJson(plan.reviewed_execution_module_git_blobs)!==
      canonicalJson(expectedClosure.module_git_blobs)
  ){
    fail("LEDGER_CUSTODY_APPLICATION_PLAN_REVIEWED_MODULE_CLOSURE_MISMATCH");
  }
  for(const [rel,expected,code] of [
    [
      REVIEWED_RUNTIME_TOOL_REL,
      plan.reviewed_runtime_tool_git_blob_sha1,
      "LEDGER_CUSTODY_APPLICATION_PLAN_RUNTIME_TOOL_BLOB_MISMATCH",
    ],
    [
      REVIEWED_RUNTIME_PROFILE_REL,
      plan.reviewed_runtime_profile_git_blob_sha1,
      "LEDGER_CUSTODY_APPLICATION_PLAN_RUNTIME_PROFILE_BLOB_MISMATCH",
    ],
  ]){
    const actual=gitText(
      ["rev-parse",plan.application_base_head_sha+":"+rel],
      code+"_UNAVAILABLE",
    );
    if(actual!==expected) fail(code);
  }

  const runtimeProfile=commitFile(
    plan.application_base_head_sha,
    REVIEWED_RUNTIME_PROFILE_REL,
    "PLAN_REVIEWED_RUNTIME_PROFILE",
  );
  if(
    runtimeProfile.value?.marker!=="VOID_REVIEWED_NODE_PACKAGE_RUNTIME_V1"||
    runtimeProfile.value?.status!=="REVIEWED_NODE_PACKAGE_RUNTIME_PROFILE"||
    !REVIEWED_RUNTIME_PROFILE_ID.test(
      String(runtimeProfile.value?.profile_id||""),
    )||
    runtimeProfile.value.profile_id!==plan.reviewed_runtime_profile_id||
    runtimeProfile.value.packages_aggregate_sha256!==
      plan.reviewed_runtime_packages_aggregate_sha256||
    JSON.stringify(runtimeProfile.value.root_packages)!==
      JSON.stringify(["ethers"])
  ){
    fail("LEDGER_CUSTODY_APPLICATION_PLAN_RUNTIME_PROFILE_MISMATCH");
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

  const productionBefore=plan.production_before;
  const productionAfter=plan.production_after;
  const coupledBefore=plan.coupled_before;
  const coupledAfter=plan.coupled_after;
  const removed=[
    "wc_ledger_persistence_verification_required",
    "quote_reserve_custody_verification_required",
  ];
  for(const [value,label] of [
    [productionBefore,"PRODUCTION_BEFORE"],
    [productionAfter,"PRODUCTION_AFTER"],
    [coupledBefore,"COUPLED_BEFORE"],
    [coupledAfter,"COUPLED_AFTER"],
  ]){
    exactObject(
      value,
      ["ok","status","reason","missing_gates"],
      "LEDGER_CUSTODY_APPLICATION_PLAN_"+label+"_SUMMARY_INVALID",
    );
  }
  if(
    productionBefore.status!=="HOLD"||
    productionAfter.status!=="HOLD"||
    coupledBefore.status!=="HOLD"||
    coupledAfter.status!=="HOLD"||
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

  const productionTarget=structuredClone(production.value);
  productionTarget.wc_ledger_persistence_verified=true;
  productionTarget.quote_reserve_custody_verified=true;

  const reviewed=runReviewedAuthority(repo,{
    operation:"prepare",
    ledger_import_input:importSource.value,
    ledger_import_input_file_sha256:importSource.sha256,
    production_before:production.value,
    production_after:productionTarget,
    coupled_before:coupled.value,
    successor:successor.value,
    coupled_file_sha256:coupled.sha256,
    successor_file_sha256:successor.sha256,
    repository_head_sha:repo.head,
    repository_tree_sha:repo.tree,
  });
  const reexecuted=reviewed.result.promotion;
  if(
    reviewed.result.promotion_contract_green!==true||
    canonicalJson(reexecuted)!==canonicalJson(receiptSource.value)
  ){
    fail("LEDGER_CUSTODY_APPLICATION_REVIEWED_PROMOTION_RECEIPT_MISMATCH");
  }

  const productionBefore=reviewed.result.production_before;
  const productionAfter=reviewed.result.production_after;
  const coupledBefore=reviewed.result.coupled_before;
  const coupledAfter=reviewed.result.coupled_after;

  if(
    productionBefore?.status!=="HOLD"||
    !productionBefore?.missing_gates?.includes(
      "wc_ledger_persistence_verification_required"
    )||
    !productionBefore?.missing_gates?.includes(
      "quote_reserve_custody_verification_required"
    )
  ){
    fail("LEDGER_CUSTODY_APPLICATION_PRODUCTION_PRESTATE_INVALID");
  }
  if(
    coupledBefore?.status!=="HOLD"||
    !coupledBefore?.missing_gates?.includes(
      "wc_ledger_persistence_verification_required"
    )||
    !coupledBefore?.missing_gates?.includes(
      "quote_reserve_custody_verification_required"
    )
  ){
    fail("LEDGER_CUSTODY_APPLICATION_COUPLED_PRESTATE_INVALID");
  }

  const coupledTarget=structuredClone(reexecuted.promoted_candidate);
  assertTargetDelta(
    production.value,
    productionTarget,
    coupled.value,
    coupledTarget,
  );

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
  ){
    fail("LEDGER_CUSTODY_APPLICATION_PRODUCTION_POSTSTATE_INVALID");
  }
  if(
    coupledAfter?.status!=="HOLD"||
    !sameStrings(
      coupledAfter.missing_gates,
      removeGates(coupledBefore.missing_gates,removed),
    )
  ){
    fail("LEDGER_CUSTODY_APPLICATION_COUPLED_POSTSTATE_INVALID");
  }

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
    reviewed_execution_module_git_blobs:
      reviewed.binding.module_git_blobs,
    reviewed_runtime_tool_git_blob_sha1:
      reviewed.binding.runtime_tool_git_blob_sha1,
    reviewed_runtime_profile_git_blob_sha1:
      reviewed.binding.runtime_profile_git_blob_sha1,
    reviewed_runtime_profile_id:
      reviewed.binding.profile_id,
    reviewed_runtime_packages_aggregate_sha256:
      reviewed.binding.packages_aggregate_sha256,
    reviewed_execution_permission_fenced:true,
    reviewed_execution_ancestor_package_resolution_allowed:false,
    reviewed_execution_network_isolation_provided:false,
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

  const repo=repositoryIdentity();
  const baseProduction=commitFile(
    plan.application_base_head_sha,
    PRODUCTION_REL,
    "STATE_BASE_PRODUCTION",
  );
  const baseCoupled=commitFile(
    plan.application_base_head_sha,
    COUPLED_REL,
    "STATE_BASE_COUPLED",
  );
  const reviewed=runReviewedAuthority(repo,{
    operation:"classify",
    production_before:baseProduction.value,
    production_after:productionCandidate,
    coupled_before:baseCoupled.value,
    coupled_after:coupledCandidate,
    successor:successorCandidate,
  });
  assertReviewedExecutionBinding(plan,reviewed.binding);
  const decisions=reviewed.result;
  if(
    canonicalJson(summary(decisions.production_before))!==
      canonicalJson(plan.production_before)||
    canonicalJson(summary(decisions.production_after))!==
      canonicalJson(plan.production_after)||
    canonicalJson(summary(decisions.coupled_before))!==
      canonicalJson(plan.coupled_before)||
    canonicalJson(summary(decisions.coupled_after))!==
      canonicalJson(plan.coupled_after)
  ){
    fail("LEDGER_CUSTODY_APPLICATION_CLASSIFIER_STATE_MISMATCH");
  }
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
  const remoteMain=canonicalRemoteMainHead();
  if(remoteMain!==repo.head){
    fail("LEDGER_CUSTODY_APPLICATION_APPLIED_HEAD_NOT_REMOTE_MAIN");
  }
  const ancestry=gitRun(
    ["merge-base","--is-ancestor",plan.application_base_head_sha,repo.head],
    "LEDGER_CUSTODY_APPLICATION_BASE_NOT_ANCESTOR",
    {allowFail:true},
  );
  if(ancestry.status!==0){
    fail("LEDGER_CUSTODY_APPLICATION_BASE_NOT_ANCESTOR");
  }

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
