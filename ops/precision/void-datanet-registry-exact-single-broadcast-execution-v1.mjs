#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {spawnSync} from "node:child_process";
import {pathToFileURL} from "node:url";

const ROOT=fs.realpathSync.native(process.cwd());
const GIT="/usr/bin/git";
const CANONICAL_REMOTE="https://github.com/6ZoSo9/void-node.git";
const CANONICAL_ORIGINS=new Set([
  "https://github.com/6ZoSo9/void-node",
  "https://github.com/6ZoSo9/void-node.git",
  "git@github.com:6ZoSo9/void-node.git",
  "ssh://git@github.com/6ZoSo9/void-node.git",
]);
const MAX_JSON=24*1024*1024;
const MAX_RPC_RESPONSE=64*1024;
const MAX_SOURCE_BYTES=8*1024*1024;
const TOOL_REL="tools/void-datanet-registry-exact-single-broadcast-execution-v1.mjs";
const RPC_REL="tools/void-datanet-registry-deployer-activation-bound-observer-v1.mjs";
const REVIEWED_RUNTIME_TOOL_REL="tools/void-reviewed-node-package-runtime-v1.mjs";
const REVIEWED_RUNTIME_PROFILE_REL=
  "ops/security/reviewed-node-package-runtime-ethers-v1.json";
const EXPECTED_RPC="http://127.0.0.1:18553/";
const EXPECTED_BARE_PACKAGES=Object.freeze(["ethers"]);
const EXPECTED_NETWORK_CAPABLE_MODULES=Object.freeze([
  "tools/void-datanet-registry-deployment-fee-funding-observer-v1.mjs",
]);
const EXPECTED_REVIEWED_RELATIVE_CLOSURE_V1=Object.freeze([
  "tools/datanet-content-commitment-compiled-identity-acceptance-v1.mjs",
  "tools/datanet-content-commitment-compiler-profile-v1.mjs",
  "tools/datanet-content-commitment-deployment-attestation-v1.mjs",
  "tools/datanet-content-commitment-dual-compiler-identity-v1.mjs",
  "tools/void-datanet-registry-candidate-fresh-revalidation-v1.mjs",
  "tools/void-datanet-registry-consumed-authorization-signing-v1.mjs",
  "tools/void-datanet-registry-deployer-activation-bound-observer-v1.mjs",
  "tools/void-datanet-registry-deployer-credential-binding-v1.mjs",
  "tools/void-datanet-registry-deployment-fee-funding-observer-v1.mjs",
  "tools/void-datanet-registry-deployment-pre-sign-revalidation-v1.mjs",
  "tools/void-datanet-registry-exact-signing-request-v1.mjs",
  "tools/void-datanet-registry-exact-single-broadcast-execution-v1.mjs",
  "tools/void-datanet-registry-final-signing-review-v1.mjs",
  "tools/void-datanet-registry-prebroadcast-observer-v1.mjs",
  "tools/void-datanet-registry-signed-verification-broadcast-request-v1.mjs",
  "tools/void-datanet-registry-signing-state-identity-provision-v1.mjs",
  "tools/void-datanet-registry-single-transaction-signing-authorization-v1.mjs",
  "tools/void-datanet-registry-single-use-broadcast-authorization-consumption-v1.mjs",
  "tools/void-datanet-registry-single-use-signing-authorization-consumption-v1.mjs",
  "tools/void-datanet-registry-transaction-construction-admission-v1.mjs",
  "tools/void-datanet-registry-unsigned-deployment-input-plan-v1.mjs",
  "tools/void-datanet-registry-unsigned-transaction-candidate-v1.mjs",
  "tools/void-economic-epoch2-qbft-private-runtime-activation-v1.mjs",
  "tools/void-economic-epoch2-qbft-private-runtime-install-v1.mjs",
  "tools/void-economic-epoch2-qbft-private-runtime-materialization-v1.mjs",
  "tools/void-economic-epoch2-qbft-private-runtime-plan-v1.mjs",
  "tools/void-economic-epoch2-raw-transaction-domain-v1.mjs",
].sort());

function fail(reason){
  const error=new Error(reason);
  error.name="VoidDatanetRegistryExactSingleBroadcastExecutionHoldV1";
  throw error;
}
function sha256(bytes){
  return crypto.createHash("sha256").update(bytes).digest("hex");
}
function gitBlobSha1(bytes){
  return crypto.createHash("sha1")
    .update(Buffer.from("blob "+String(bytes.length)+"\0","utf8"))
    .update(bytes)
    .digest("hex");
}
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
    GIT_NO_REPLACE_OBJECTS:"1",
    GIT_OPTIONAL_LOCKS:"0",
    GIT_TERMINAL_PROMPT:"0",
  };
}
const GIT_CONFIG=Object.freeze([
  "-c","core.hooksPath=/dev/null",
  "-c","core.attributesFile=/dev/null",
  "-c","core.fsmonitor=false",
  "-c","core.untrackedCache=false",
  "-c","core.preloadIndex=false",
  "-c","submodule.recurse=false",
]);
function runGit(args,{cwd=ROOT,binary=false,code="reviewed_git_failed"}={}){
  const result=spawnSync(
    GIT,
    ["--no-replace-objects",...GIT_CONFIG,...args],
    {
      cwd,
      env:gitEnv(),
      encoding:binary?null:"utf8",
      stdio:["ignore","pipe","pipe"],
      timeout:20_000,
      maxBuffer:64*1024*1024,
    },
  );
  if(result.error||result.status!==0) fail(code);
  return binary
    ?Buffer.from(result.stdout||Buffer.alloc(0))
    :String(result.stdout||"").trim();
}
function repoGit(args,options={}){
  return runGit(["-C",ROOT,...args],options);
}
function remoteMainHead(){
  const output=runGit(
    ["ls-remote",CANONICAL_REMOTE,"refs/heads/main"],
    {cwd:"/",code:"canonical_remote_main_unavailable"},
  );
  const lines=output.split(/\r?\n/u).filter(Boolean);
  if(lines.length!==1) fail("canonical_remote_main_invalid");
  const match=lines[0].match(/^([0-9a-f]{40})\trefs\/heads\/main$/u);
  if(!match) fail("canonical_remote_main_invalid");
  return match[1];
}
function reviewedGitAuthorityV1(){
  if(ROOT!==path.resolve(process.cwd())){
    fail("repository_root_not_canonical");
  }
  const branch=repoGit(["branch","--show-current"]);
  const status=repoGit(["status","--porcelain=v1","--untracked-files=all"]);
  const head=repoGit(["rev-parse","HEAD"]);
  const tree=repoGit(["rev-parse","HEAD^{tree}"]);
  const origin=repoGit([
    "config","--local","--no-includes","--get","remote.origin.url",
  ]);
  if(
    branch!=="main"||
    status!==""||
    !/^[0-9a-f]{40}$/u.test(head)||
    !/^[0-9a-f]{40}$/u.test(tree)||
    !CANONICAL_ORIGINS.has(origin)
  ){
    fail("reviewed_repository_authority_invalid");
  }
  const remoteHead=remoteMainHead();
  if(remoteHead!==head) fail("local_head_not_canonical_remote_main");
  return Object.freeze({
    head,
    tree,
    origin,
    remote_main_head:remoteHead,
    git_executable:GIT,
    git_config_isolated:true,
  });
}
function validateRelativePath(relativePath){
  if(
    typeof relativePath!=="string"||
    relativePath.length<1||
    relativePath.length>768||
    path.posix.isAbsolute(relativePath)||
    relativePath.split("/").some(part=>!part||part==="."||part==="..")
  ){
    fail("reviewed_source_path_invalid");
  }
  return relativePath;
}
function exactHeadFileV1(head,relativePath){
  validateRelativePath(relativePath);
  if(!/^[0-9a-f]{40}$/u.test(String(head||""))){
    fail("reviewed_source_head_invalid");
  }
  const blob=repoGit(
    ["rev-parse",head+":"+relativePath],
    {code:"reviewed_source_blob_unavailable"},
  );
  if(!/^[0-9a-f]{40}$/u.test(blob)){
    fail("reviewed_source_blob_invalid");
  }
  if(repoGit(["cat-file","-t",blob])!=="blob"){
    fail("reviewed_source_object_not_blob");
  }
  const bytes=repoGit(
    ["cat-file","blob",blob],
    {binary:true,code:"reviewed_source_bytes_unavailable"},
  );
  if(bytes.length<1||bytes.length>MAX_SOURCE_BYTES){
    fail("reviewed_source_size_invalid");
  }
  if(gitBlobSha1(bytes)!==blob){
    fail("reviewed_source_blob_identity_mismatch");
  }
  return Object.freeze({
    relative_path:relativePath,
    blob,
    sha256:sha256(bytes),
    bytes,
  });
}
function staticImportSpecifiers(source){
  if(/\bimport\s*\(/u.test(source)){
    fail("reviewed_source_dynamic_import_forbidden");
  }
  const found=[];
  const expression=/\b(?:import|export)\s+(?:[^;]*?\s+from\s+)?["']([^"']+)["']/gsu;
  for(const match of source.matchAll(expression)) found.push(match[1]);
  return found;
}
function resolveRelativeImport(fromRelative,specifier){
  const resolved=path.posix.normalize(
    path.posix.join(path.posix.dirname(fromRelative),specifier),
  );
  if(
    resolved.startsWith("../")||
    resolved===".."||
    path.posix.isAbsolute(resolved)||
    !resolved.endsWith(".mjs")
  ){
    fail("reviewed_source_relative_import_invalid");
  }
  return validateRelativePath(resolved);
}
function reviewedSourcePlanV1(head){
  const pending=[TOOL_REL,RPC_REL];
  const seen=new Map();
  const barePackages=new Set();
  const networkModules=new Set();
  while(pending.length){
    const relativePath=pending.shift();
    if(seen.has(relativePath)) continue;
    const source=exactHeadFileV1(head,relativePath);
    const text=source.bytes.toString("utf8");
    for(const specifier of staticImportSpecifiers(text)){
      if(specifier.startsWith(".")){
        const dependency=resolveRelativeImport(relativePath,specifier);
        if(!seen.has(dependency)) pending.push(dependency);
        continue;
      }
      if(specifier.startsWith("node:")){
        if(
          specifier==="node:http"||
          specifier==="node:https"||
          specifier==="node:net"||
          specifier==="node:tls"||
          specifier==="node:dns"||
          specifier==="node:dgram"
        ){
          networkModules.add(relativePath);
        }
        continue;
      }
      barePackages.add(specifier);
    }
    seen.set(relativePath,source);
  }
  const closure=[...seen.keys()].sort();
  const packages=[...barePackages].sort();
  const network=[...networkModules].sort();
  if(
    JSON.stringify(closure)!==
      JSON.stringify(EXPECTED_REVIEWED_RELATIVE_CLOSURE_V1)||
    JSON.stringify(packages)!==JSON.stringify(EXPECTED_BARE_PACKAGES)||
    JSON.stringify(network)!==
      JSON.stringify(EXPECTED_NETWORK_CAPABLE_MODULES)
  ){
    fail("reviewed_source_closure_mismatch");
  }
  const rows=closure.map(relativePath=>{
    const source=seen.get(relativePath);
    return Object.freeze({
      relative_path:relativePath,
      git_blob_sha1:source.blob,
      sha256:source.sha256,
      bytes:source.bytes.length,
    });
  });
  return Object.freeze({
    head,
    closure:Object.freeze(closure),
    bare_packages:Object.freeze(packages),
    network_capable_modules:Object.freeze(network),
    rows:Object.freeze(rows),
    closure_aggregate_sha256:sha256(
      Buffer.from(JSON.stringify(rows),"utf8"),
    ),
    sources:seen,
  });
}
function writeExactFile(file,bytes,mode=0o400){
  fs.mkdirSync(path.dirname(file),{recursive:true,mode:0o700});
  const fd=fs.openSync(
    file,
    fs.constants.O_WRONLY|fs.constants.O_CREAT|fs.constants.O_EXCL|
      Number(fs.constants.O_NOFOLLOW||0),
    mode,
  );
  try{
    fs.writeFileSync(fd,bytes);
    fs.fchmodSync(fd,mode);
    fs.fsyncSync(fd);
  }finally{fs.closeSync(fd);}
}
function stableFileBytes(file,label,maxBytes=MAX_SOURCE_BYTES){
  const fd=fs.openSync(
    file,
    fs.constants.O_RDONLY|Number(fs.constants.O_NOFOLLOW||0),
  );
  try{
    const before=fs.fstatSync(fd,{bigint:true});
    if(
      !before.isFile()||
      before.nlink!==1n||
      before.size<1n||
      before.size>BigInt(maxBytes)
    ){
      fail(label+"_invalid");
    }
    const size=Number(before.size);
    const bytes=Buffer.alloc(size);
    let offset=0;
    while(offset<size){
      const count=fs.readSync(fd,bytes,offset,size-offset,offset);
      if(count<=0) fail(label+"_short_read");
      offset+=count;
    }
    const probe=Buffer.alloc(1);
    if(fs.readSync(fd,probe,0,1,size)!==0){
      fail(label+"_grew_during_read");
    }
    const after=fs.fstatSync(fd,{bigint:true});
    for(const key of ["dev","ino","size","mtimeNs","ctimeNs","mode","uid","gid","nlink"]){
      if(before[key]!==after[key]) fail(label+"_changed_during_read");
    }
    return bytes;
  }finally{fs.closeSync(fd);}
}
function materializeReviewedSourcesV1(plan,destinationRoot){
  if(fs.existsSync(destinationRoot)) fail("reviewed_source_destination_exists");
  fs.mkdirSync(destinationRoot,{mode:0o700});
  for(const row of plan.rows){
    const source=plan.sources.get(row.relative_path);
    writeExactFile(
      path.join(destinationRoot,...row.relative_path.split("/")),
      source.bytes,
      0o400,
    );
  }
  return verifyReviewedSourcesV1(plan,destinationRoot);
}
function verifyReviewedSourcesV1(plan,destinationRoot){
  const root=fs.realpathSync.native(destinationRoot);
  if(root!==path.resolve(destinationRoot)){
    fail("reviewed_source_destination_alias");
  }
  const rows=[];
  for(const row of plan.rows){
    const file=path.join(root,...row.relative_path.split("/"));
    const bytes=stableFileBytes(file,"reviewed_private_source");
    if(
      bytes.length!==row.bytes||
      sha256(bytes)!==row.sha256||
      gitBlobSha1(bytes)!==row.git_blob_sha1
    ){
      fail("reviewed_private_source_mismatch:"+row.relative_path);
    }
    rows.push(Object.freeze({...row}));
  }
  const aggregate=sha256(Buffer.from(JSON.stringify(rows),"utf8"));
  if(aggregate!==plan.closure_aggregate_sha256){
    fail("reviewed_private_source_aggregate_mismatch");
  }
  return Object.freeze({
    closure_aggregate_sha256:aggregate,
    closure_count:rows.length,
  });
}
function makeRemovableTree(root){
  if(!fs.existsSync(root)) return;
  const walk=dir=>{
    try{fs.chmodSync(dir,0o700);}catch{}
    for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
      const file=path.join(dir,entry.name);
      if(entry.isDirectory()) walk(file);
      else{
        try{fs.chmodSync(file,0o600);}catch{}
      }
    }
  };
  walk(root);
}
async function prepareReviewedExecutionV1(head){
  const plan=reviewedSourcePlanV1(head);
  const parent=fs.mkdtempSync(
    path.join(os.tmpdir(),"void-datanet-registry-reviewed-broadcast-v1-"),
  );
  fs.chmodSync(parent,0o700);
  const bootstrapRoot=path.join(parent,"bootstrap");
  const runtimeRoot=path.join(parent,"runtime");
  try{
    fs.mkdirSync(bootstrapRoot,{mode:0o700});
    const runtimeToolSource=exactHeadFileV1(head,REVIEWED_RUNTIME_TOOL_REL);
    const runtimeToolPath=path.join(
      bootstrapRoot,
      ...REVIEWED_RUNTIME_TOOL_REL.split("/"),
    );
    writeExactFile(runtimeToolPath,runtimeToolSource.bytes,0o400);
    const runtime=await import(
      pathToFileURL(runtimeToolPath).href+"?reviewed_head="+head
    );
    for(const name of [
      "readReviewedNodePackageRuntimeProfileV1",
      "verifyReviewedNodePackageRuntimeV1",
      "materializeReviewedNodePackageRuntimeV1",
      "verifyMaterializedReviewedNodePackageRuntimeV1",
    ]){
      if(typeof runtime[name]!=="function"){
        fail("reviewed_runtime_export_missing:"+name);
      }
    }
    const profileSource=runtime.readReviewedNodePackageRuntimeProfileV1({
      relativePath:REVIEWED_RUNTIME_PROFILE_REL,
      repoRoot:ROOT,
    });
    if(
      JSON.stringify(profileSource.profile.root_packages)!==
        JSON.stringify(EXPECTED_BARE_PACKAGES)
    ){
      fail("reviewed_runtime_root_package_mismatch");
    }
    runtime.verifyReviewedNodePackageRuntimeV1({
      profile:profileSource.profile,
      repoRoot:ROOT,
    });
    runtime.materializeReviewedNodePackageRuntimeV1({
      profile:profileSource.profile,
      repoRoot:ROOT,
      destinationRoot:runtimeRoot,
    });
    for(const row of plan.rows){
      const source=plan.sources.get(row.relative_path);
      writeExactFile(
        path.join(runtimeRoot,...row.relative_path.split("/")),
        source.bytes,
        0o400,
      );
    }
    verifyReviewedSourcesV1(plan,runtimeRoot);
    runtime.verifyMaterializedReviewedNodePackageRuntimeV1({
      profile:profileSource.profile,
      destinationRoot:runtimeRoot,
      repoRoot:ROOT,
    });
    const toolPath=path.join(runtimeRoot,...TOOL_REL.split("/"));
    const rpcPath=path.join(runtimeRoot,...RPC_REL.split("/"));
    const tool=await import(
      pathToFileURL(toolPath).href+"?reviewed_head="+head
    );
    const rpcModule=await import(
      pathToFileURL(rpcPath).href+"?reviewed_head="+head
    );
    if(
      typeof tool.submitVoidDatanetRegistryExactSingleBroadcastV1!=="function"||
      rpcModule.PRIVATE_SUCCESSOR_RPC_V1!==EXPECTED_RPC
    ){
      fail("reviewed_private_execution_exports_invalid");
    }
    verifyReviewedSourcesV1(plan,runtimeRoot);
    runtime.verifyMaterializedReviewedNodePackageRuntimeV1({
      profile:profileSource.profile,
      destinationRoot:runtimeRoot,
      repoRoot:ROOT,
    });
    return Object.freeze({
      parent,
      runtime_root:runtimeRoot,
      plan,
      submit:tool.submitVoidDatanetRegistryExactSingleBroadcastV1,
      rpc_url:rpcModule.PRIVATE_SUCCESSOR_RPC_V1,
      binding:Object.freeze({
        repository_head_sha:head,
        closure_count:plan.rows.length,
        closure_aggregate_sha256:plan.closure_aggregate_sha256,
        bare_packages:plan.bare_packages,
        network_capable_modules:plan.network_capable_modules,
        reviewed_runtime_tool_git_blob_sha1:runtimeToolSource.blob,
        reviewed_runtime_profile_git_blob_sha1:
          profileSource.profile_source.git_blob_sha1,
        reviewed_runtime_profile_id:profileSource.profile.profile_id,
        reviewed_runtime_packages_aggregate_sha256:
          profileSource.profile.packages_aggregate_sha256,
        private_exact_head_tree:true,
        execution_network_isolation_provided:false,
      }),
      reverify(){
        verifyReviewedSourcesV1(plan,runtimeRoot);
        runtime.verifyMaterializedReviewedNodePackageRuntimeV1({
          profile:profileSource.profile,
          destinationRoot:runtimeRoot,
          repoRoot:ROOT,
        });
      },
      cleanup(){
        makeRemovableTree(parent);
        fs.rmSync(parent,{recursive:true,force:true});
      },
    });
  }catch(error){
    makeRemovableTree(parent);
    fs.rmSync(parent,{recursive:true,force:true});
    throw error;
  }
}
function parseArgs(argv){
  const out={};
  for(let i=0;i<argv.length;i+=1){
    const key=argv[i];
    if(!key?.startsWith("--")) fail("invalid_argument:"+String(key));
    const value=String(argv[++i]||"");
    if(!value) fail("missing_argument_value:"+key);
    out[key.slice(2)]=value;
  }
  for(const key of [
    "broadcast-request","broadcast-authorization","prebroadcast-observation",
    "signed-transaction","state-dir","confirmation","output",
  ]){
    if(!out[key]) fail("missing_argument:"+key);
  }
  return out;
}
function regularJson(raw,label,maxBytes=MAX_JSON){
  const file=path.resolve(raw);
  const st=fs.lstatSync(file);
  if(st.isSymbolicLink()||!st.isFile()) fail(label+"_not_regular");
  if(fs.realpathSync.native(file)!==file) fail(label+"_not_canonical");
  if(st.size<2||st.size>maxBytes) fail(label+"_size_invalid");
  return {file,value:JSON.parse(fs.readFileSync(file,"utf8"))};
}
function privateJson(raw,label){
  const file=path.resolve(raw);
  const st=fs.lstatSync(file);
  if(
    st.isSymbolicLink()||
    !st.isFile()||
    fs.realpathSync.native(file)!==file||
    st.nlink!==1||
    (typeof process.getuid==="function"&&st.uid!==process.getuid())||
    (st.mode&0o777)!==0o600||
    st.size<2||
    st.size>MAX_JSON
  ){
    fail(label+"_private_file_policy_invalid");
  }
  return {file,value:JSON.parse(fs.readFileSync(file,"utf8"))};
}
function stateDir(raw){
  const dir=path.resolve(raw);
  const st=fs.lstatSync(dir);
  if(
    st.isSymbolicLink()||
    !st.isDirectory()||
    fs.realpathSync.native(dir)!==dir||
    (typeof process.getuid==="function"&&st.uid!==process.getuid())||
    (st.mode&0o777)!==0o700
  ){
    fail("state_dir_invalid");
  }
  return dir;
}
function outputPath(raw){
  const file=path.resolve(raw);
  if(fs.existsSync(file)) fail("output_already_exists");
  const parent=path.dirname(file);
  const st=fs.lstatSync(parent);
  if(
    st.isSymbolicLink()||
    !st.isDirectory()||
    fs.realpathSync.native(parent)!==parent||
    (typeof process.getuid==="function"&&st.uid!==process.getuid())||
    (st.mode&0o022)!==0
  ){
    fail("output_parent_invalid");
  }
  return file;
}
function writeJsonExclusive(file,value){
  const bytes=Buffer.from(JSON.stringify(value,null,2)+"\n","utf8");
  let fd=-1;
  try{
    fd=fs.openSync(
      file,
      fs.constants.O_WRONLY|
        fs.constants.O_CREAT|
        fs.constants.O_EXCL|
        Number(fs.constants.O_NOFOLLOW||0),
      0o600,
    );
    fs.writeFileSync(fd,bytes);
    fs.fchmodSync(fd,0o600);
    fs.fsyncSync(fd);
  }finally{
    bytes.fill(0);
    if(fd>=0) fs.closeSync(fd);
  }
}
function rpcFactory(rpcUrl){
  if(rpcUrl!==EXPECTED_RPC) fail("rpc_target_not_reviewed");
  let id=0;
  return async (method,params=[])=>{
    const allowed=new Set([
      "eth_sendRawTransaction",
      "eth_getTransactionByHash",
      "eth_getTransactionReceipt",
      "eth_getCode",
      "eth_getTransactionCount",
    ]);
    if(!allowed.has(method)) fail("rpc_method_not_allowed:"+method);
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),8000);
    let response;
    let text;
    try{
      response=await fetch(rpcUrl,{
        method:"POST",
        headers:{"content-type":"application/json"},
        body:JSON.stringify({
          jsonrpc:"2.0",
          id:++id,
          method,
          params,
        }),
        signal:controller.signal,
        redirect:"error",
      });
      if(response.redirected) fail("rpc_redirect_forbidden");
      text=await response.text();
    }finally{
      clearTimeout(timer);
    }
    if(Buffer.byteLength(text||"","utf8")>MAX_RPC_RESPONSE){
      fail("rpc_response_too_large");
    }
    if(!response.ok) fail("rpc_http_status_"+String(response.status));
    const parsed=JSON.parse(text);
    if(parsed?.error){
      const error=new Error("rpc_error");
      if(Number.isInteger(parsed.error.code)) error.code=parsed.error.code;
      throw error;
    }
    if(!Object.hasOwn(parsed,"result")) fail("rpc_result_missing");
    return parsed.result;
  };
}

export function testOnlyReviewedSourcePlanV1(){
  const head=repoGit(["rev-parse","HEAD"]);
  return reviewedSourcePlanV1(head);
}
export function testOnlyReadExactHeadSourceV1(relativePath){
  const head=repoGit(["rev-parse","HEAD"]);
  return exactHeadFileV1(head,relativePath);
}
export function testOnlyMaterializeReviewedSourcesV1(destinationRoot){
  const head=repoGit(["rev-parse","HEAD"]);
  const plan=reviewedSourcePlanV1(head);
  return Object.freeze({
    plan,
    verification:materializeReviewedSourcesV1(plan,destinationRoot),
  });
}
export function testOnlyVerifyReviewedSourcesV1(plan,destinationRoot){
  return verifyReviewedSourcesV1(plan,destinationRoot);
}
export async function testOnlyPrepareReviewedExecutionV1(){
  const head=repoGit(["rev-parse","HEAD"]);
  const prepared=await prepareReviewedExecutionV1(head);
  try{return prepared.binding;}
  finally{prepared.cleanup();}
}
export function testOnlyReviewedGitHeadV1(){
  return repoGit(["rev-parse","HEAD"]);
}

async function main(){
  if(os.hostname()!=="zoso-Precision-Tower-7810") fail("precision_host_required");
  const args=parseArgs(process.argv.slice(2));
  const authority=reviewedGitAuthorityV1();
  const prepared=await prepareReviewedExecutionV1(authority.head);
  try{
    const authorityAfterPreparation=reviewedGitAuthorityV1();
    if(
      authorityAfterPreparation.head!==authority.head||
      authorityAfterPreparation.tree!==authority.tree
    ){
      fail("reviewed_repository_authority_changed_during_preparation");
    }
    prepared.reverify();

    const request=regularJson(args["broadcast-request"],"broadcast_request");
    const authorization=regularJson(
      args["broadcast-authorization"],
      "broadcast_authorization",
    );
    const observation=regularJson(
      args["prebroadcast-observation"],
      "prebroadcast_observation",
    );
    const signed=privateJson(args["signed-transaction"],"signed_transaction");
    const state=stateDir(args["state-dir"]);
    const output=outputPath(args.output);

    if(args.confirmation!==authorization.value.required_confirmation){
      fail("exact_operation_bound_broadcast_confirmation_required");
    }

    prepared.reverify();
    const result=await prepared.submit({
      broadcast_request:request.value,
      broadcast_authorization:authorization.value,
      prebroadcast_observation:observation.value,
      signed_transaction:signed.value,
      state_dir:state,
      confirmation:args.confirmation,
      rpc:rpcFactory(prepared.rpc_url),
      now:()=>Date.now(),
    });
    writeJsonExclusive(output,result);

    console.log("VOID_DATANET_REGISTRY_EXACT_SINGLE_BROADCAST_EXECUTION_PRECISION_V1");
    console.log("ok="+String(result.ok===true));
    console.log("status="+String(result.status||"held"));
    console.log("reason="+String(result.reason||""));
    console.log("broadcast_operation_id="+String(result.broadcast_operation_id||""));
    console.log("submission_intent_id="+String(result.submission_intent_id||""));
    console.log("submission_result_id="+String(result.submission_result_id||""));
    console.log("signed_transaction_id="+String(result.signed_transaction_id||""));
    console.log("signed_transaction_hash="+String(result.signed_transaction_hash||""));
    console.log("rpc_send_invocation_count="+String(result.rpc_send_invocation_count||0));
    console.log("classification="+String(result.classification||""));
    console.log("reviewed_repository_head_sha="+authority.head);
    console.log("reviewed_source_closure_count="+String(prepared.binding.closure_count));
    console.log("reviewed_source_closure_aggregate_sha256="+
      prepared.binding.closure_aggregate_sha256);
    console.log("reviewed_runtime_profile_id="+
      prepared.binding.reviewed_runtime_profile_id);
    console.log("reviewed_runtime_packages_aggregate_sha256="+
      prepared.binding.reviewed_runtime_packages_aggregate_sha256);
    console.log("private_exact_head_execution=true");
    console.log("execution_network_isolation_provided=false");
    console.log("broadcaster_access_performed="+String(result.broadcaster_access_performed===true));
    console.log("transaction_submission_performed="+
      String(result.transaction_submission_performed===true));
    console.log("transaction_broadcast_performed="+
      String(result.transaction_broadcast_performed===true));
    console.log("automatic_retry_performed=false");
    console.log("replacement_transaction_created=false");
    console.log("credential_access=false");
    console.log("private_key_access=false");
    console.log("signed_transaction_bytes_output=false");
    console.log("output="+output);

    if(result.ok!==true) process.exitCode=2;
    else console.log(
      "VOID_DATANET_REGISTRY_EXACT_SINGLE_BROADCAST_EXECUTION_PRECISION_V1_GREEN",
    );
  }finally{
    prepared.cleanup();
  }
}

if(
  process.argv[1]&&
  import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href
){
  await main();
}
