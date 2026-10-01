#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseArgs } from "node:util";

export const VOID_WC_VOID_COUPLED_LAUNCH_POLICY_BUNDLE_V1 =
  "VOID_WC_VOID_COUPLED_LAUNCH_POLICY_BUNDLE_V1";
export const VOID_WC_VOID_COUPLED_LAUNCH_POLICY_BUNDLE_TEST_ONLY_V1 =
  "VOID_WC_VOID_COUPLED_LAUNCH_POLICY_BUNDLE_TEST_ONLY_V1";
export const VOID_WC_VOID_COUPLED_LAUNCH_POLICY_BUNDLE_SCHEMA_V1 =
  "void.wc-void-coupled-launch-policy-bundle.v1";

export const VOID_WC_VOID_COUPLED_LAUNCH_POLICY_BUNDLE_AUTHORITY_V1 =
  Object.freeze({
    source_policy_compilation_only: true,
    explicit_reviewed_values_required: true,
    canonical_launch_source_binding_required: true,
    reviewed_git_object_execution_required: true,
    reviewed_policy_module_closure_required: true,
    permission_fenced_execution_required: true,
    worktree_policy_execution_forbidden: true,
    canonical_main_artifact_required: true,
    canonical_remote_main_read_required: true,
    git_config_isolated: true,
    descriptor_bound_private_input: true,
    reviewed_private_input_sha256_required: true,
    create_only_private_output: true,
    durable_output_directory_entry_required: true,
    output_parent_directory_identity_bound: true,
    private_temporary_filesystem_write: true,
    production_values_selected_by_source: false,
    runtime_enforcement_verified: false,
    wall_clock_read: false,
    runtime_mutation: false,
    service_mutation: false,
    wallet_or_signer_access: false,
    private_key_access: false,
    transaction_construction: false,
    transaction_signing: false,
    transaction_submission: false,
    transaction_broadcast: false,
    chain2050_write: false,
    wc_ledger_write: false,
    inventory_funding: false,
    liquidity_movement: false,
    market_activation: false,
    public_presale_activation: false,
    funds_movement: false,
  });

const HERE=path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT=path.resolve(HERE,"..");
const GIT="/usr/bin/git";
const TOOL_REL="tools/void-wc-void-coupled-launch-policy-bundle-v1.mjs";
const CORE_REL="tools/void-wc-void-coupled-launch-policy-reviewed-core-v1.mjs";
const COUPLED_CANDIDATE_REL=
  "ops/mainnet0/coupled-economic-successor-gate-candidate-v1.json";
const CANONICAL_REMOTE="https://github.com/6ZoSo9/void-node.git";
const HEX40=/^[0-9a-f]{40}$/u;
const HEX64=/^[0-9a-f]{64}$/u;
const MAX_INPUT_BYTES=1024*1024;
const MAX_SOURCE_BYTES=8*1024*1024;
export const VOID_WC_VOID_COUPLED_LAUNCH_ID_V1 =
  "sha256:fe02b5c813adea98f55e8587759df9316f7a8d5f1123114dc851cbad863fdc26";

function fail(code){throw new Error(code);}
function compareText(left,right){return left<right?-1:left>right?1:0;}
function plain(value){
  return value!==null&&typeof value==="object"&&!Array.isArray(value)&&
    (Object.getPrototypeOf(value)===Object.prototype||
     Object.getPrototypeOf(value)===null);
}
function canonicalJson(value){
  if(value===null)return "null";
  if(typeof value==="string")return JSON.stringify(value);
  if(typeof value==="boolean")return value?"true":"false";
  if(typeof value==="number"&&Number.isSafeInteger(value))return String(value);
  if(Array.isArray(value))return "["+value.map(canonicalJson).join(",")+"]";
  if(plain(value)){
    return "{"+Object.keys(value).sort(compareText)
      .map(key=>JSON.stringify(key)+":"+canonicalJson(value[key])).join(",")+"}";
  }
  fail("COUPLED_LAUNCH_POLICY_CANONICAL_VALUE_INVALID");
}
function sha256Bytes(value){return crypto.createHash("sha256").update(value).digest("hex");}
function gitBlobSha1(value){
  return crypto.createHash("sha1")
    .update(Buffer.from("blob "+value.length+"\0","utf8"))
    .update(value).digest("hex");
}
function digest(value){
  return "sha256:"+crypto.createHash("sha256")
    .update(canonicalJson(value),"utf8").digest("hex");
}
function deepFreeze(value){
  if(value===null||typeof value!=="object"||Object.isFrozen(value))return value;
  for(const child of Object.values(value))deepFreeze(child);
  return Object.freeze(value);
}
function prettyBytes(value){return Buffer.from(JSON.stringify(value,null,2)+"\n","utf8");}

function gitEnv(){
  return {
    PATH:"/usr/bin:/bin",
    HOME:"/nonexistent",
    XDG_CONFIG_HOME:"/nonexistent",
    LANG:"C",
    LC_ALL:"C",
    GIT_CONFIG_GLOBAL:"/dev/null",
    GIT_CONFIG_SYSTEM:"/dev/null",
    GIT_CONFIG_NOSYSTEM:"1",
    GIT_ATTR_NOSYSTEM:"1",
    GIT_OPTIONAL_LOCKS:"0",
    GIT_NO_LAZY_FETCH:"1",
    GIT_TERMINAL_PROMPT:"0",
    GIT_NO_REPLACE_OBJECTS:"1",
    GIT_ASKPASS:"/bin/false",
  };
}
const GIT_SAFETY_ARGS=Object.freeze([
  "-c","core.hooksPath=/dev/null",
  "-c","core.attributesFile=/dev/null",
  "-c","core.fsmonitor=false",
  "-c","core.untrackedCache=false",
  "-c","core.preloadIndex=false",
  "-c","submodule.recurse=false",
]);
function gitRun(args,code,{encoding="utf8",allowFail=false,cwd=REPO_ROOT}={}){
  const result=spawnSync(
    GIT,
    ["--no-replace-objects",...GIT_SAFETY_ARGS,"-C",cwd,...args],
    {
      env:gitEnv(),
      encoding,
      stdio:["ignore","pipe","pipe"],
      maxBuffer:MAX_SOURCE_BYTES*8,
      timeout:60_000,
    },
  );
  if(result.error)throw result.error;
  if(result.status!==0&&!allowFail)fail(code);
  return result;
}
function gitText(args,code,{allowEmpty=false}={}){
  const value=String(gitRun(args,code).stdout||"").trim();
  if(!allowEmpty&&!value)fail(code);
  return value;
}
function gitBytes(args,code){
  return Buffer.from(gitRun(args,code,{encoding:null}).stdout||Buffer.alloc(0));
}
function canonicalOrigin(value){
  const accepted=new Set([
    "https://github.com/6ZoSo9/void-node",
    "https://github.com/6ZoSo9/void-node.git",
    "git@github.com:6ZoSo9/void-node.git",
    "ssh://git@github.com/6ZoSo9/void-node.git",
  ]);
  const text=String(value||"").trim();
  if(!accepted.has(text))fail("COUPLED_LAUNCH_POLICY_CANONICAL_ORIGIN_REQUIRED");
  return CANONICAL_REMOTE;
}
function canonicalRemoteMainHead(){
  const result=spawnSync(
    GIT,
    [
      "--no-replace-objects",
      "-c","http.sslVerify=true",
      ...GIT_SAFETY_ARGS,
      "ls-remote","--heads",CANONICAL_REMOTE,"refs/heads/main",
    ],
    {
      cwd:"/",
      env:gitEnv(),
      encoding:"utf8",
      stdio:["ignore","pipe","pipe"],
      maxBuffer:1024*1024,
      timeout:15_000,
    },
  );
  if(result.error||result.status!==0){
    fail("COUPLED_LAUNCH_POLICY_REMOTE_MAIN_UNAVAILABLE");
  }
  const match=String(result.stdout||"").trim()
    .match(/^([0-9a-f]{40})\s+refs\/heads\/main$/u);
  if(!match)fail("COUPLED_LAUNCH_POLICY_REMOTE_MAIN_INVALID");
  return match[1];
}
function commitBytes(commit,relativePath,label){
  if(!HEX40.test(String(commit||"")))fail(label+"_COMMIT_INVALID");
  const bytes=gitBytes(["show",commit+":"+relativePath],label+"_BYTES_UNAVAILABLE");
  if(bytes.length<1||bytes.length>MAX_SOURCE_BYTES)fail(label+"_BYTES_INVALID");
  const blob=gitText(["rev-parse",commit+":"+relativePath],label+"_BLOB_UNAVAILABLE");
  if(!HEX40.test(blob)||gitBlobSha1(bytes)!==blob)fail(label+"_BLOB_MISMATCH");
  return Object.freeze({bytes,blob_sha1:blob,sha256:sha256Bytes(bytes)});
}
function repositoryIdentity({requireCanonicalMain=false}={}){
  const status=gitText(
    ["status","--porcelain=v1","--untracked-files=all"],
    "COUPLED_LAUNCH_POLICY_REPOSITORY_STATUS_UNAVAILABLE",
    {allowEmpty:true},
  );
  if(status!=="")fail("COUPLED_LAUNCH_POLICY_REPOSITORY_MUST_BE_CLEAN");
  const head=gitText(["rev-parse","HEAD"],"COUPLED_LAUNCH_POLICY_HEAD_UNAVAILABLE");
  const tree=gitText(["rev-parse","HEAD^{tree}"],"COUPLED_LAUNCH_POLICY_TREE_UNAVAILABLE");
  const branch=gitText(
    ["branch","--show-current"],
    "COUPLED_LAUNCH_POLICY_BRANCH_UNAVAILABLE",
    {allowEmpty:true},
  );
  const origin=canonicalOrigin(
    gitText(
      ["config","--local","--no-includes","--get","remote.origin.url"],
      "COUPLED_LAUNCH_POLICY_ORIGIN_UNAVAILABLE",
    ),
  );
  if(!HEX40.test(head)||!HEX40.test(tree)){
    fail("COUPLED_LAUNCH_POLICY_REPOSITORY_IDENTITY_INVALID");
  }
  const toolObject=commitBytes(head,TOOL_REL,"COUPLED_LAUNCH_POLICY_TOOL");
  const toolWork=fs.readFileSync(path.join(REPO_ROOT,TOOL_REL));
  if(gitBlobSha1(toolWork)!==toolObject.blob_sha1){
    fail("COUPLED_LAUNCH_POLICY_TOOL_WORKTREE_DRIFT");
  }
  let remoteMainSha=null;
  if(requireCanonicalMain){
    if(branch!=="main")fail("COUPLED_LAUNCH_POLICY_CANONICAL_MAIN_BRANCH_REQUIRED");
    remoteMainSha=canonicalRemoteMainHead();
    if(remoteMainSha!==head)fail("COUPLED_LAUNCH_POLICY_REMOTE_MAIN_HEAD_MISMATCH");
  }
  return Object.freeze({
    head,tree,branch,origin,
    remote_main_sha:remoteMainSha,
    canonical_main_verified:requireCanonicalMain,
    tool_git_blob_sha1:toolObject.blob_sha1,
  });
}
function assertRepositoryStable(repo,{requireCanonicalMain=false}={}){
  const status=gitText(
    ["status","--porcelain=v1","--untracked-files=all"],
    "COUPLED_LAUNCH_POLICY_FINAL_STATUS_UNAVAILABLE",
    {allowEmpty:true},
  );
  const head=gitText(
    ["rev-parse","HEAD"],
    "COUPLED_LAUNCH_POLICY_FINAL_HEAD_UNAVAILABLE",
  );
  const tree=gitText(
    ["rev-parse","HEAD^{tree}"],
    "COUPLED_LAUNCH_POLICY_FINAL_TREE_UNAVAILABLE",
  );
  const branch=gitText(
    ["branch","--show-current"],
    "COUPLED_LAUNCH_POLICY_FINAL_BRANCH_UNAVAILABLE",
    {allowEmpty:true},
  );
  const origin=canonicalOrigin(
    gitText(
      ["config","--local","--no-includes","--get","remote.origin.url"],
      "COUPLED_LAUNCH_POLICY_FINAL_ORIGIN_UNAVAILABLE",
    ),
  );
  const toolWork=fs.readFileSync(path.join(REPO_ROOT,TOOL_REL));
  if(
    status!==""||
    head!==repo.head||
    tree!==repo.tree||
    branch!==repo.branch||
    origin!==repo.origin||
    gitBlobSha1(toolWork)!==repo.tool_git_blob_sha1
  ){
    fail("COUPLED_LAUNCH_POLICY_REPOSITORY_CHANGED_DURING_COMPILATION");
  }
  if(requireCanonicalMain){
    const remoteMainSha=canonicalRemoteMainHead();
    if(
      remoteMainSha!==repo.head||
      remoteMainSha!==repo.remote_main_sha
    ){
      fail("COUPLED_LAUNCH_POLICY_REMOTE_MAIN_CHANGED_DURING_COMPILATION");
    }
  }
}

function reviewedModuleClosure(commit){
  const pending=[CORE_REL];
  const seen=new Set();
  const sources=new Map();
  const blobs=Object.create(null);
  while(pending.length){
    const rel=pending.pop();
    if(seen.has(rel))continue;
    seen.add(rel);
    const source=commitBytes(
      commit,
      rel,
      "COUPLED_LAUNCH_POLICY_REVIEWED_MODULE_"+rel.replace(/[^A-Za-z0-9]+/gu,"_"),
    );
    sources.set(rel,source.bytes);
    blobs[rel]=source.blob_sha1;
    const text=new TextDecoder("utf-8",{fatal:true}).decode(source.bytes);
    if(
      text.includes("node:child_process")||
      text.includes("node:http")||
      text.includes("node:https")||
      text.includes("node:net")||
      text.includes("node:tls")||
      text.includes("node:dgram")||
      text.includes("node:worker_threads")
    ){
      fail("COUPLED_LAUNCH_POLICY_REVIEWED_EXECUTION_SURFACE_FORBIDDEN:"+rel);
    }
    if(/\bimport\s*\(/u.test(text)){
      fail("COUPLED_LAUNCH_POLICY_REVIEWED_DYNAMIC_IMPORT_FORBIDDEN:"+rel);
    }
    const specs=[];
    for(const re of [
      /\bfrom\s+["']([^"']+)["']/gu,
      /\bimport\s+["']([^"']+)["']/gu,
    ]){
      let match;
      while((match=re.exec(text))!==null)specs.push(match[1]);
    }
    for(const spec of specs){
      if(spec.startsWith("node:"))continue;
      if(!spec.startsWith(".")){
        fail("COUPLED_LAUNCH_POLICY_REVIEWED_BARE_IMPORT_FORBIDDEN:"+spec);
      }
      let target=path.posix.normalize(
        path.posix.join(path.posix.dirname(rel),spec),
      );
      if(!target.endsWith(".mjs"))target+=".mjs";
      if(!target.startsWith("tools/")||target.includes("../")){
        fail("COUPLED_LAUNCH_POLICY_REVIEWED_IMPORT_ESCAPE:"+target);
      }
      pending.push(target);
    }
  }
  return Object.freeze({
    sources,
    module_git_blobs:Object.freeze({...blobs}),
  });
}

function writePrivateSource(file,bytes){
  fs.mkdirSync(path.dirname(file),{recursive:true,mode:0o700});
  const fd=fs.openSync(
    file,
    fs.constants.O_WRONLY|
      fs.constants.O_CREAT|
      fs.constants.O_EXCL|
      Number(fs.constants.O_NOFOLLOW||0),
    0o400,
  );
  try{
    fs.writeFileSync(fd,bytes);
    fs.fchmodSync(fd,0o400);
    fs.fsyncSync(fd);
  }finally{fs.closeSync(fd);}
}
function makePrivateTreeReadOnly(root){
  const dirs=[];
  const stack=[root];
  while(stack.length){
    const dir=stack.pop();
    dirs.push(dir);
    for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
      const file=path.join(dir,entry.name);
      if(entry.isDirectory())stack.push(file);
      else if(entry.isFile())fs.chmodSync(file,0o400);
      else fail("COUPLED_LAUNCH_POLICY_PRIVATE_TREE_ENTRY_INVALID");
    }
  }
  for(const dir of dirs.sort((a,b)=>b.length-a.length))fs.chmodSync(dir,0o500);
}
function makePrivateTreeRemovable(root){
  if(!fs.existsSync(root))return;
  const stack=[root],dirs=[];
  while(stack.length){
    const dir=stack.pop();
    dirs.push(dir);
    fs.chmodSync(dir,0o700);
    for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
      const file=path.join(dir,entry.name);
      if(entry.isDirectory())stack.push(file);
      else if(entry.isFile())fs.chmodSync(file,0o600);
    }
  }
}
function privateNodeEnv(home){
  return {
    PATH:"/usr/bin:/bin",
    HOME:home,
    XDG_CONFIG_HOME:home,
    LANG:"C",
    LC_ALL:"C",
    NODE_OPTIONS:"",
    NODE_PATH:"",
  };
}
function runReviewedCompiler(repo,raw,canonicalLaunchSource){
  const closure=reviewedModuleClosure(repo.head);
  const parent=fs.mkdtempSync(
    path.join(os.tmpdir(),"void-coupled-launch-policy-reviewed-"),
  );
  fs.chmodSync(parent,0o700);
  const sourceRoot=path.join(parent,"source");
  const runnerDir=path.join(parent,"runner");
  fs.mkdirSync(sourceRoot,{mode:0o700});
  fs.mkdirSync(runnerDir,{mode:0o700});
  try{
    for(const [rel,bytes] of closure.sources){
      writePrivateSource(path.join(sourceRoot,rel),bytes);
    }
    const coreFile=path.join(sourceRoot,CORE_REL);
    const runnerFile=path.join(runnerDir,"reviewed-launch-policy-runner-v1.mjs");
    const runnerSource=[
      'import { compileVoidWcVoidCoupledLaunchPolicyBundleCoreV1 } from '+
        JSON.stringify(pathToFileURL(coreFile).href)+';',
      'process.stdin.setEncoding("utf8");',
      'let text="";',
      'for await (const chunk of process.stdin) text+=chunk;',
      'const request=JSON.parse(text);',
      'let envelope;',
      'try{',
      '  const result=compileVoidWcVoidCoupledLaunchPolicyBundleCoreV1(request.raw,request.expected_launch_id);',
      '  envelope={ok:true,result,error:null};',
      '}catch(error){',
      '  envelope={ok:false,result:null,error:(error instanceof Error?error.message:String(error)).slice(0,512)};',
      '}',
      'process.stdout.write(JSON.stringify(envelope));',
      '',
    ].join("\n");
    writePrivateSource(runnerFile,Buffer.from(runnerSource,"utf8"));
    makePrivateTreeReadOnly(sourceRoot);
    const result=spawnSync(
      fs.realpathSync.native(process.execPath),
      [
        "--permission",
        "--allow-fs-read="+parent,
        runnerFile,
      ],
      {
        cwd:runnerDir,
        env:privateNodeEnv(runnerDir),
        input:JSON.stringify({
          raw,
          expected_launch_id:canonicalLaunchSource.coupled_launch_id,
        }),
        encoding:"utf8",
        stdio:["pipe","pipe","pipe"],
        maxBuffer:16*1024*1024,
        timeout:60_000,
      },
    );
    if(result.error||result.status!==0){
      fail("COUPLED_LAUNCH_POLICY_REVIEWED_EXECUTION_FAILED");
    }
    let envelope;
    try{envelope=JSON.parse(String(result.stdout||""));}
    catch{fail("COUPLED_LAUNCH_POLICY_REVIEWED_OUTPUT_INVALID");}
    if(
      !plain(envelope)||
      typeof envelope.ok!=="boolean"||
      !Object.hasOwn(envelope,"result")||
      !Object.hasOwn(envelope,"error")
    )fail("COUPLED_LAUNCH_POLICY_REVIEWED_OUTPUT_INVALID");
    if(!envelope.ok){
      if(typeof envelope.error!=="string"||envelope.error.length<1){
        fail("COUPLED_LAUNCH_POLICY_REVIEWED_ERROR_INVALID");
      }
      fail(envelope.error);
    }
    if(!plain(envelope.result)||envelope.error!==null){
      fail("COUPLED_LAUNCH_POLICY_REVIEWED_RESULT_INVALID");
    }
    return Object.freeze({
      result:envelope.result,
      module_git_blobs:closure.module_git_blobs,
    });
  }finally{
    makePrivateTreeRemovable(parent);
    fs.rmSync(parent,{recursive:true,force:true});
  }
}
function canonicalLaunchSource(repo,moduleBlobs){
  const source=commitBytes(
    repo.head,
    COUPLED_CANDIDATE_REL,
    "COUPLED_LAUNCH_POLICY_CANONICAL_SOURCE",
  );
  let candidate;
  try{
    candidate=JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(source.bytes));
  }catch{
    fail("COUPLED_LAUNCH_POLICY_CANONICAL_SOURCE_JSON_INVALID");
  }
  const launchId=candidate?.shared_post_discovery_reconciliation?.coupled_launch_id;
  if(
    candidate?.marker!=="VOID_COUPLED_ECONOMIC_SUCCESSOR_GATE_V1"||
    candidate?.version!==1||
    candidate?.chain_id!==2050||
    launchId!==VOID_WC_VOID_COUPLED_LAUNCH_ID_V1
  )fail("COUPLED_LAUNCH_POLICY_CANONICAL_SOURCE_LAUNCH_ID_MISMATCH");
  return Object.freeze({
    path:COUPLED_CANDIDATE_REL,
    repository_head_sha:repo.head,
    repository_tree_sha:repo.tree,
    repository_branch:repo.branch,
    canonical_remote_url:repo.origin,
    remote_main_sha:repo.remote_main_sha,
    canonical_main_verified:repo.canonical_main_verified,
    git_blob_sha1:source.blob_sha1,
    file_sha256:source.sha256,
    coupled_launch_id:launchId,
    reviewed_policy_module_git_blobs:moduleBlobs,
    permission_fenced_execution:true,
  });
}
function compileReviewed(raw,{requireCanonicalMain}){
  const repo=repositoryIdentity({requireCanonicalMain});
  const closure=reviewedModuleClosure(repo.head);
  const launchSource=canonicalLaunchSource(repo,closure.module_git_blobs);
  const reviewed=runReviewedCompiler(repo,raw,launchSource);
  assertRepositoryStable(repo,{requireCanonicalMain});
  if(
    canonicalJson(reviewed.module_git_blobs)!==
      canonicalJson(closure.module_git_blobs)
  )fail("COUPLED_LAUNCH_POLICY_REVIEWED_MODULE_LINEAGE_DRIFT");
  const semantic=reviewed.result;
  if(
    semantic.coupled_launch_id!==VOID_WC_VOID_COUPLED_LAUNCH_ID_V1||
    "marker" in semantic||
    "schema" in semantic||
    "version" in semantic||
    "bundle_id" in semantic||
    "authority" in semantic||
    "canonical_launch_source" in semantic
  ){
    fail("COUPLED_LAUNCH_POLICY_REVIEWED_SEMANTIC_RESULT_INVALID");
  }
  const body=Object.freeze({
    marker:VOID_WC_VOID_COUPLED_LAUNCH_POLICY_BUNDLE_V1,
    schema:VOID_WC_VOID_COUPLED_LAUNCH_POLICY_BUNDLE_SCHEMA_V1,
    version:1,
    ...semantic,
    canonical_launch_source:launchSource,
    authority:VOID_WC_VOID_COUPLED_LAUNCH_POLICY_BUNDLE_AUTHORITY_V1,
  });
  return deepFreeze({
    ...body,
    bundle_id:digest(body),
  });
}

export function compileVoidWcVoidCoupledLaunchPolicyBundleV1(raw){
  return compileReviewed(raw,{requireCanonicalMain:true});
}
export function testOnlyCompileVoidWcVoidCoupledLaunchPolicyBundleV1(raw){
  const bundle=compileReviewed(raw,{requireCanonicalMain:false});
  const {
    marker:_marker,
    schema:_schema,
    version:_version,
    bundle_id:_bundleId,
    authority:_authority,
    ...semantic
  }=bundle;
  void _marker;void _schema;void _version;void _bundleId;void _authority;
  return deepFreeze({
    marker:VOID_WC_VOID_COUPLED_LAUNCH_POLICY_BUNDLE_TEST_ONLY_V1,
    version:1,
    status:"TEST_ONLY_REVIEWED_SOURCE_COMPILATION_GREEN",
    production_artifact_authorized:false,
    production_bundle_id_emitted:false,
    ...semantic,
  });
}

function outsideRepository(file) {
  const relative = path.relative(REPO_ROOT, file);
  return (
    relative === ".." ||
    relative.startsWith(".." + path.sep) ||
    path.isAbsolute(relative)
  );
}


function fsyncDirectory(directory) {
  const fd = fs.openSync(directory, fs.constants.O_RDONLY);
  try {
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
}

function readStableDirectFile(
  file,
  label,
  { maxBytes, requirePrivateOwner = false } = {},
) {
  const real = fs.realpathSync.native(file);
  if (real !== file) fail(label + "_PATH_ALIAS_FORBIDDEN");
  const fd = fs.openSync(
    file,
    fs.constants.O_RDONLY | Number(fs.constants.O_NOFOLLOW || 0),
  );
  try {
    const before = fs.fstatSync(fd);
    if (
      !before.isFile() ||
      before.size < 2 ||
      before.size > maxBytes
    ) {
      fail(label + "_NOT_DIRECT_BOUNDED_REGULAR");
    }
    if (
      requirePrivateOwner &&
      typeof process.getuid === "function" &&
      before.uid !== process.getuid()
    ) {
      fail(label + "_OWNER_MISMATCH");
    }
    if (requirePrivateOwner && (before.mode & 0o077) !== 0) {
      fail(label + "_PERMISSIONS_TOO_BROAD");
    }
    const bytes = Buffer.alloc(before.size);
    let offset = 0;
    while (offset < bytes.length) {
      const count = fs.readSync(
        fd,
        bytes,
        offset,
        bytes.length - offset,
        offset,
      );
      if (count <= 0) fail(label + "_SHORT_READ");
      offset += count;
    }
    const after = fs.fstatSync(fd);
    for (const key of ["dev", "ino", "size", "mtimeMs", "ctimeMs"]) {
      if (before[key] !== after[key]) fail(label + "_CHANGED_DURING_READ");
    }
    if (
      requirePrivateOwner &&
      (
        after.uid !== before.uid ||
        (after.mode & 0o077) !== 0
      )
    ) {
      fail(label + "_CHANGED_DURING_READ");
    }
    return Object.freeze({
      bytes,
      stat: Object.freeze({
        dev: after.dev,
        ino: after.ino,
        size: after.size,
        uid: after.uid,
        mode: after.mode,
      }),
    });
  } finally {
    fs.closeSync(fd);
  }
}

function canonicalLaunchSourceBinding() {
  const file = path.join(REPO_ROOT, COUPLED_CANDIDATE_REL);
  const source = readStableDirectFile(
    file,
    "COUPLED_LAUNCH_POLICY_CANONICAL_SOURCE",
    { maxBytes: MAX_INPUT_BYTES },
  );
  const blobSha1 = gitBlobSha1(source.bytes);
  const expectedHeadBlobSha1 = headBlobSha1(COUPLED_CANDIDATE_REL);
  if (blobSha1 !== expectedHeadBlobSha1) {
    fail("COUPLED_LAUNCH_POLICY_CANONICAL_SOURCE_BLOB_MISMATCH");
  }
  let candidate;
  try {
    candidate = JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(source.bytes),
    );
  } catch {
    fail("COUPLED_LAUNCH_POLICY_CANONICAL_SOURCE_JSON_INVALID");
  }
  const launchId =
    candidate?.shared_post_discovery_reconciliation?.coupled_launch_id;
  if (
    candidate?.marker !== "VOID_COUPLED_ECONOMIC_SUCCESSOR_GATE_V1" ||
    candidate?.version !== 1 ||
    candidate?.chain_id !== 2050 ||
    launchId !== VOID_WC_VOID_COUPLED_LAUNCH_ID_V1
  ) {
    fail("COUPLED_LAUNCH_POLICY_CANONICAL_SOURCE_LAUNCH_ID_MISMATCH");
  }
  return Object.freeze({
    path: COUPLED_CANDIDATE_REL,
    git_blob_sha1: blobSha1,
    file_sha256: sha256Bytes(source.bytes),
    coupled_launch_id: launchId,
  });
}

function readPrivateJson(file, label, expectedSha256) {
  if (
    typeof file !== "string" ||
    !path.isAbsolute(file) ||
    path.resolve(file) !== file ||
    !outsideRepository(file)
  ) {
    fail(label + "_PATH_INVALID");
  }
  const source = readStableDirectFile(
    file,
    label,
    { maxBytes: MAX_INPUT_BYTES, requirePrivateOwner: true },
  );
  const bytes = source.bytes;
  if (
    typeof expectedSha256 !== "string" ||
    !HEX64.test(expectedSha256)
  ) {
    fail(label + "_EXPECTED_SHA256_INVALID");
  }
  const actualSha256 = sha256Bytes(bytes);
  if (actualSha256 !== expectedSha256) {
    fail(label + "_SHA256_MISMATCH");
  }
  let value;
  try {
    value = JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(bytes),
    );
  } catch {
    fail(label + "_JSON_INVALID");
  }
  return Object.freeze({
    bytes,
    value,
    sha256: actualSha256,
  });
}

function writePrivateJson(file, value) {
  if (
    typeof file !== "string" ||
    !path.isAbsolute(file) ||
    path.resolve(file) !== file ||
    !outsideRepository(file)
  ) {
    fail("COUPLED_LAUNCH_POLICY_OUTPUT_PATH_INVALID");
  }
  const parent = path.dirname(file);
  const realParent = fs.realpathSync.native(parent);
  if (realParent !== parent) {
    fail("COUPLED_LAUNCH_POLICY_OUTPUT_PARENT_ALIAS_FORBIDDEN");
  }
  let parentFd;
  let parentIdentity;
  try {
    parentFd = fs.openSync(
      parent,
      fs.constants.O_RDONLY | Number(fs.constants.O_DIRECTORY || 0),
    );
    const parentFdStat = fs.fstatSync(parentFd);
    const parentPathStat = fs.lstatSync(parent);
    if (
      !parentFdStat.isDirectory() ||
      parentPathStat.isSymbolicLink() ||
      !parentPathStat.isDirectory() ||
      parentFdStat.dev !== parentPathStat.dev ||
      parentFdStat.ino !== parentPathStat.ino ||
      (
        typeof process.getuid === "function" &&
        (
          parentFdStat.uid !== process.getuid() ||
          parentPathStat.uid !== process.getuid()
        )
      ) ||
      (parentFdStat.mode & 0o022) !== 0 ||
      (parentPathStat.mode & 0o022) !== 0
    ) {
      fail("COUPLED_LAUNCH_POLICY_OUTPUT_PARENT_UNSAFE");
    }
    parentIdentity = Object.freeze({
      dev: parentFdStat.dev,
      ino: parentFdStat.ino,
    });

    const bytes = prettyBytes(value);
    const basename = path.basename(file);
    if (
      basename === "" ||
      basename === "." ||
      basename === ".." ||
      basename.includes(path.sep)
    ) {
      fail("COUPLED_LAUNCH_POLICY_OUTPUT_BASENAME_INVALID");
    }
    const procParent = "/proc/self/fd/" + String(parentFd);
    let procParentStat;
    try {
      procParentStat = fs.statSync(procParent);
    } catch {
      fail("COUPLED_LAUNCH_POLICY_OUTPUT_DIRFD_PATH_UNAVAILABLE");
    }
    if (
      !procParentStat.isDirectory() ||
      procParentStat.dev !== parentIdentity.dev ||
      procParentStat.ino !== parentIdentity.ino
    ) {
      fail("COUPLED_LAUNCH_POLICY_OUTPUT_DIRFD_IDENTITY_INVALID");
    }
    const boundCreatePath = path.join(procParent, basename);

    const parentBeforeCreatePath = fs.lstatSync(parent);
    if (
      parentBeforeCreatePath.dev !== parentIdentity.dev ||
      parentBeforeCreatePath.ino !== parentIdentity.ino
    ) {
      fail("COUPLED_LAUNCH_POLICY_OUTPUT_PARENT_CHANGED");
    }

    const bytes = prettyBytes(value);
    let fd;
    let createdStat;
    try {
      fd = fs.openSync(
        boundCreatePath,
        fs.constants.O_WRONLY |
          fs.constants.O_CREAT |
          fs.constants.O_EXCL |
          Number(fs.constants.O_NOFOLLOW || 0),
        0o600,
      );
      fs.writeFileSync(fd, bytes);
      fs.fchmodSync(fd, 0o600);
      fs.fsyncSync(fd);
      createdStat = fs.fstatSync(fd);
    } finally {
      if (fd !== undefined) fs.closeSync(fd);
    }

    fs.fsyncSync(parentFd);
    const parentAfterFd = fs.fstatSync(parentFd);
    const parentAfterPath = fs.lstatSync(parent);
    if (
      parentAfterFd.dev !== parentIdentity.dev ||
      parentAfterFd.ino !== parentIdentity.ino ||
      parentAfterPath.dev !== parentIdentity.dev ||
      parentAfterPath.ino !== parentIdentity.ino ||
      fs.realpathSync.native(parent) !== parent
    ) {
      fail("COUPLED_LAUNCH_POLICY_OUTPUT_PARENT_CHANGED");
    }

    const persistedSource = readStableDirectFile(
      file,
      "COUPLED_LAUNCH_POLICY_OUTPUT",
      { maxBytes: MAX_INPUT_BYTES, requirePrivateOwner: true },
    );
    if (
      persistedSource.stat.dev !== createdStat.dev ||
      persistedSource.stat.ino !== createdStat.ino ||
      (persistedSource.stat.mode & 0o777) !== 0o600
    ) {
      fail("COUPLED_LAUNCH_POLICY_OUTPUT_IDENTITY_INVALID");
    }
    if (!persistedSource.bytes.equals(bytes)) {
      fail("COUPLED_LAUNCH_POLICY_OUTPUT_BYTES_MISMATCH");
    }
    return Object.freeze({
      output_path: file,
      output_sha256: sha256Bytes(bytes),
      output_bytes: bytes.length,
      parent_dev: parentIdentity.dev,
      parent_ino: parentIdentity.ino,
    });
  } finally {
    if (parentFd !== undefined) fs.closeSync(parentFd);
  }
}



const direct=
  process.argv[1]&&
  import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href;

if(direct){
  try{
    const {values}=parseArgs({
      options:{
        input:{type:"string"},
        "expected-input-sha256":{type:"string"},
        output:{type:"string"},
        "test-only":{type:"boolean",default:false},
      },
      strict:true,
    });
    if(!values.input||!values["expected-input-sha256"]||!values.output){
      fail(
        "usage: --input /absolute/private/launch-policy-input.json "+
        "--expected-input-sha256 <64hex> "+
        "--output /absolute/private/launch-policy-bundle.json [--test-only]",
      );
    }
    const source=readPrivateJson(
      values.input,
      "COUPLED_LAUNCH_POLICY_INPUT",
      values["expected-input-sha256"],
    );
    const testOnly=values["test-only"]===true;
    const result=testOnly
      ? testOnlyCompileVoidWcVoidCoupledLaunchPolicyBundleV1(source.value)
      : compileVoidWcVoidCoupledLaunchPolicyBundleV1(source.value);
    const persisted=writePrivateJson(values.output,result);

    console.log(
      testOnly
        ? VOID_WC_VOID_COUPLED_LAUNCH_POLICY_BUNDLE_TEST_ONLY_V1
        : VOID_WC_VOID_COUPLED_LAUNCH_POLICY_BUNDLE_V1,
    );
    if(testOnly){
      console.log("production_artifact_authorized=false");
      console.log("production_bundle_id_emitted=false");
      console.log("canonical_main_verified=false");
    }else{
      console.log("bundle_id="+result.bundle_id);
      console.log("canonical_main_verified=true");
    }
    console.log("coupled_launch_id="+result.coupled_launch_id);
    console.log("reviewed_input_sha256="+source.sha256);
    console.log("output_path="+persisted.output_path);
    console.log("output_sha256="+persisted.output_sha256);
    console.log("output_bytes="+String(persisted.output_bytes));
    console.log("values_selected_by_source=false");
    console.log("runtime_enforcement_verified=false");
    console.log("market_activation_authorized=false");
    console.log("public_presale_activation_authorized=false");
    console.log("funds_movement_authorized=false");
    console.log(
      testOnly
        ? "VOID_WC_VOID_COUPLED_LAUNCH_POLICY_BUNDLE_V1_TEST_ONLY_GREEN"
        : "VOID_WC_VOID_COUPLED_LAUNCH_POLICY_BUNDLE_V1_GREEN_NOT_ACTIVATED",
    );
  }catch(error){
    console.error("VOID_WC_VOID_COUPLED_LAUNCH_POLICY_BUNDLE_V1_HOLD");
    console.error("reason="+(error instanceof Error?error.message:String(error)));
    process.exitCode=2;
  }
}
