#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export const VOID_REVIEWED_NODE_PACKAGE_RUNTIME_V1 =
  "VOID_REVIEWED_NODE_PACKAGE_RUNTIME_V1";

export const VOID_REVIEWED_NODE_PACKAGE_RUNTIME_AUTHORITY_V1 =
  Object.freeze({
    source_only_dependency_binding:true,
    exact_head_package_metadata_required:true,
    lockfile_closure_required:true,
    installed_package_byte_inventory_required:true,
    private_dependency_materialization:true,
    post_copy_inventory_reverification:true,
    permission_fenced_execution:true,
    ancestor_package_resolution_forbidden:true,
    ambient_node_resolution_overrides_ignored:true,
    ambient_dynamic_loader_overrides_ignored:true,
    reviewed_profile_head_binding:true,
    reviewed_profile_content_id_rederivation:true,
    network_access:false,
    npm_install_performed:false,
    package_script_execution:false,
    runtime_service_mutation:false,
    credential_access:false,
    wallet_or_signer_access:false,
    private_key_access:false,
    rpc_call:false,
    transaction_construction:false,
    transaction_signing:false,
    transaction_submission:false,
    transaction_broadcast:false,
    chain2050_write:false,
    market_activation:false,
    public_presale_activation:false,
    funds_movement:false,
  });

const DEFAULT_ROOTS=Object.freeze(["ethers"]);
const MAX_PACKAGES=256;
const MAX_FILES=16384;
const MAX_FILE_BYTES=32*1024*1024;
const MAX_TOTAL_BYTES=256*1024*1024;
const MAX_PATH_CHARS=768;
const SHA40=/^[0-9a-f]{40}$/u;
const SHA64=/^[0-9a-f]{64}$/u;
const PACKAGE_NAME=/^(?:@[a-z0-9._~-]+\/[a-z0-9._~-]+|[a-z0-9._~-]+)$/u;
const PROFILE_ID=/^voidrnpr1_[0-9a-f]{64}$/u;
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");

function fail(code){throw new Error(code);}

function plain(value){
  return value!==null&&typeof value==="object"&&!Array.isArray(value);
}

function compareText(a,b){return a<b?-1:a>b?1:0;}

export function canonicalJson(value){
  if(value===null) return "null";
  if(typeof value==="string") return JSON.stringify(value);
  if(typeof value==="boolean") return value?"true":"false";
  if(typeof value==="number"&&Number.isSafeInteger(value)) return String(value);
  if(Array.isArray(value)) return "["+value.map(canonicalJson).join(",")+"]";
  if(plain(value)){
    return "{"+Object.keys(value).sort(compareText).map(
      key=>JSON.stringify(key)+":"+canonicalJson(value[key]),
    ).join(",")+"}";
  }
  fail("reviewed_node_runtime_canonical_value_invalid");
}

function sha256(bytes){
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function git(root,args,code,{binary=false}={}){
  const result=spawnSync(
    "/usr/bin/git",
    [
      "--no-replace-objects",
      "-c","core.hooksPath=/dev/null",
      "-c","core.attributesFile=/dev/null",
      "-c","core.fsmonitor=false",
      "-c","core.untrackedCache=false",
      "-c","core.preloadIndex=false",
      "-c","submodule.recurse=false",
      ...args,
    ],
    {
      cwd:root,
      encoding:binary?null:"utf8",
      stdio:["ignore","pipe","pipe"],
      timeout:20_000,
      maxBuffer:64*1024*1024,
      env:{
        PATH:"/usr/bin:/bin",
        LANG:"C",
        LC_ALL:"C",
        GIT_NO_REPLACE_OBJECTS:"1",
        GIT_CONFIG_NOSYSTEM:"1",
        GIT_CONFIG_GLOBAL:"/dev/null",
        GIT_CONFIG_SYSTEM:"/dev/null",
        GIT_TERMINAL_PROMPT:"0",
        HOME:"/nonexistent",
      },
    },
  );
  if(result.status!==0) fail(code);
  return result.stdout;
}

function requireCleanRepository(root){
  const status=git(
    root,
    ["status","--porcelain=v1","--untracked-files=all"],
    "reviewed_node_runtime_repository_status_unavailable",
  ).trim();
  if(status!=="") fail("reviewed_node_runtime_repository_not_clean");
}

function gitBlob(root,relative){
  const blob=git(
    root,
    ["rev-parse","HEAD:"+relative],
    "reviewed_node_runtime_git_blob_unavailable",
  ).trim();
  if(!SHA40.test(blob)) fail("reviewed_node_runtime_git_blob_invalid");
  return blob;
}

function gitBlobBytes(root,relative){
  const blob=gitBlob(root,relative);
  const bytes=git(
    root,
    ["cat-file","blob",blob],
    "reviewed_node_runtime_git_blob_read_failed",
    {binary:true},
  );
  return Object.freeze({blob,bytes:Buffer.from(bytes)});
}

function stableRegularBytes(file,code,maxBytes=MAX_FILE_BYTES){
  let lst;
  try{lst=fs.lstatSync(file);}catch{fail(code+"_missing");}
  if(!lst.isFile()||lst.isSymbolicLink()||lst.nlink!==1||lst.size<0||lst.size>maxBytes){
    fail(code+"_not_stable_regular_file");
  }
  const fd=fs.openSync(file,fs.constants.O_RDONLY|Number(fs.constants.O_NOFOLLOW||0));
  try{
    const before=fs.fstatSync(fd);
    if(!before.isFile()||before.nlink!==1||before.size!==lst.size){
      fail(code+"_identity_invalid");
    }
    const bytes=Buffer.alloc(before.size);
    let used=0;
    while(used<bytes.length){
      const n=fs.readSync(fd,bytes,used,Math.min(64*1024,bytes.length-used),null);
      if(n<=0) fail(code+"_short_read");
      used+=n;
    }
    const after=fs.fstatSync(fd);
    for(const key of ["dev","ino","size","mtimeMs","ctimeMs"]){
      if(before[key]!==after[key]) fail(code+"_changed_during_read");
    }
    return bytes;
  }finally{fs.closeSync(fd);}
}

function exactHeadMetadata(root,relative){
  const head=gitBlobBytes(root,relative);
  const working=stableRegularBytes(
    path.join(root,relative),
    "reviewed_node_runtime_"+relative.replaceAll("/","_"),
  );
  if(!working.equals(head.bytes)){
    fail("reviewed_node_runtime_worktree_metadata_differs_from_head:"+relative);
  }
  return Object.freeze({
    path:relative,
    git_blob_sha1:head.blob,
    bytes:working.length,
    sha256:sha256(working),
  });
}

function canonicalPackageName(value){
  if(typeof value!=="string") fail("reviewed_node_runtime_package_name_invalid");
  const normalized=value.toLowerCase();
  if(value!==normalized||!PACKAGE_NAME.test(value)){
    fail("reviewed_node_runtime_package_name_invalid");
  }
  return value;
}

function canonicalLockKey(value){
  if(
    typeof value!=="string"||
    value.length<1||
    value.length>MAX_PATH_CHARS||
    value.includes("\\")||
    path.posix.normalize(value)!==value
  ){
    fail("reviewed_node_runtime_lock_key_invalid");
  }
  const parts=value.split("/");
  if(parts.some(part=>!part||part==="."||part==="..")){
    fail("reviewed_node_runtime_lock_key_invalid");
  }
  let index=0;
  while(index<parts.length){
    if(parts[index]!=="node_modules"){
      fail("reviewed_node_runtime_lock_key_invalid");
    }
    index+=1;
    if(index>=parts.length) fail("reviewed_node_runtime_lock_key_invalid");
    if(parts[index].startsWith("@")){
      if(index+1>=parts.length){
        fail("reviewed_node_runtime_lock_key_invalid");
      }
      canonicalPackageName(parts[index]+"/"+parts[index+1]);
      index+=2;
    }else{
      canonicalPackageName(parts[index]);
      index+=1;
    }
  }
  return value;
}

function packageBaseWithinRoot(root,lockKey,code){
  canonicalLockKey(lockKey);
  const resolvedRoot=path.resolve(root);
  const base=path.resolve(resolvedRoot,...lockKey.split("/"));
  const relative=path.relative(resolvedRoot,base);
  if(
    relative===""||
    relative===".."||
    relative.startsWith(".."+path.sep)||
    path.isAbsolute(relative)
  ){
    fail(code);
  }
  return base;
}

function packageNameFromKey(key){
  canonicalLockKey(key);
  const marker="node_modules/";
  const index=key.lastIndexOf(marker);
  if(index<0) fail("reviewed_node_runtime_lock_key_invalid");
  return canonicalPackageName(key.slice(index+marker.length));
}

function resolveDependencyKey(packages,parentKey,name){
  canonicalPackageName(name);
  let base=parentKey;
  while(true){
    const nested=base+"/node_modules/"+name;
    if(Object.hasOwn(packages,nested)) return nested;
    const index=base.lastIndexOf("/node_modules/");
    if(index<0) break;
    base=base.slice(0,index);
  }
  const rootKey="node_modules/"+name;
  if(Object.hasOwn(packages,rootKey)) return rootKey;
  return null;
}

export function deriveReviewedPackageLockClosureV1(lock,rootPackages=DEFAULT_ROOTS){
  if(!plain(lock)||lock.lockfileVersion!==3||!plain(lock.packages)){
    fail("reviewed_node_runtime_lockfile_invalid");
  }
  const roots=[...rootPackages].map(canonicalPackageName);
  if(roots.length<1||roots.length>32||new Set(roots).size!==roots.length){
    fail("reviewed_node_runtime_root_packages_invalid");
  }
  roots.sort(compareText);
  const queue=roots.map(name=>"node_modules/"+name);
  const seen=new Set();
  const rows=[];
  while(queue.length){
    const key=queue.shift();
    if(seen.has(key)) continue;
    seen.add(key);
    if(seen.size>MAX_PACKAGES) fail("reviewed_node_runtime_package_count_exceeded");
    const entry=lock.packages[key];
    if(!plain(entry)) fail("reviewed_node_runtime_lock_package_missing:"+key);
    const name=packageNameFromKey(key);
    if(
      typeof entry.version!=="string"||
      entry.version.length<1||
      entry.version.length>128||
      typeof entry.integrity!=="string"||
      !/^sha512-[A-Za-z0-9+/]+={0,2}$/u.test(entry.integrity)
    ){
      fail("reviewed_node_runtime_lock_package_identity_invalid:"+key);
    }
    const dependencies=plain(entry.dependencies)?entry.dependencies:Object.create(null);
    const optional=plain(entry.optionalDependencies)?entry.optionalDependencies:Object.create(null);
    const peers=plain(entry.peerDependencies)?entry.peerDependencies:Object.create(null);
    const peerMeta=plain(entry.peerDependenciesMeta)?entry.peerDependenciesMeta:Object.create(null);
    const resolved=[];
    const optionalAbsent=[];
    for(const dep of Object.keys({...dependencies,...optional}).sort(compareText)){
      canonicalPackageName(dep);
      const child=resolveDependencyKey(lock.packages,key,dep);
      if(child===null){
        if(Object.hasOwn(optional,dep)){
          optionalAbsent.push(dep);
          continue;
        }
        fail("reviewed_node_runtime_required_dependency_missing:"+key+":"+dep);
      }
      resolved.push(Object.freeze({name:dep,lock_key:child}));
      queue.push(child);
    }
    for(const dep of Object.keys(peers).sort(compareText)){
      canonicalPackageName(dep);
      const meta=plain(peerMeta[dep])?peerMeta[dep]:Object.create(null);
      const child=resolveDependencyKey(lock.packages,key,dep);
      if(child===null){
        if(meta.optional===true){
          optionalAbsent.push("peer:"+dep);
          continue;
        }
        fail("reviewed_node_runtime_required_peer_missing:"+key+":"+dep);
      }
      resolved.push(Object.freeze({name:"peer:"+dep,lock_key:child}));
      queue.push(child);
    }
    rows.push(Object.freeze({
      name,
      lock_key:key,
      version:entry.version,
      integrity:entry.integrity,
      dependencies:Object.freeze(resolved.sort(
        (a,b)=>compareText(a.name,b.name)||compareText(a.lock_key,b.lock_key),
      )),
      optional_absent:Object.freeze([...new Set(optionalAbsent)].sort(compareText)),
    }));
  }
  rows.sort((a,b)=>compareText(a.lock_key,b.lock_key));
  return Object.freeze({root_packages:Object.freeze(roots),packages:Object.freeze(rows)});
}

function walkPackageDirectory(root,lockKey){
  const base=packageBaseWithinRoot(
    root,
    lockKey,
    "reviewed_node_runtime_package_path_escape:"+String(lockKey),
  );
  let baseReal;
  try{
    const stat=fs.lstatSync(base);
    if(!stat.isDirectory()||stat.isSymbolicLink()) fail("reviewed_node_runtime_package_directory_invalid:"+lockKey);
    baseReal=fs.realpathSync.native(base);
  }catch(error){
    if(error instanceof Error&&error.message.startsWith("reviewed_node_runtime_")) throw error;
    fail("reviewed_node_runtime_package_directory_missing:"+lockKey);
  }
  if(baseReal!==base) fail("reviewed_node_runtime_package_directory_alias:"+lockKey);
  const members=[];
  let total=0;
  let count=0;
  function walk(dir,relative,depth){
    if(depth>48) fail("reviewed_node_runtime_dependency_depth_exceeded");
    const entries=fs.readdirSync(dir,{withFileTypes:true})
      .sort((a,b)=>compareText(a.name,b.name));
    for(const entry of entries){
      const rel=relative?relative+"/"+entry.name:entry.name;
      if(rel.length>MAX_PATH_CHARS||entry.name===""||entry.name==="."||entry.name===".."){
        fail("reviewed_node_runtime_dependency_path_invalid");
      }
      const file=path.join(dir,entry.name);
      const stat=fs.lstatSync(file);
      if(stat.isSymbolicLink()){
        fail("reviewed_node_runtime_dependency_symlink_forbidden:"+lockKey+":"+rel);
      }
      if(stat.isDirectory()){
        if(entry.name==="node_modules") continue;
        walk(file,rel,depth+1);
        continue;
      }
      if(!stat.isFile()||stat.nlink!==1){
        fail("reviewed_node_runtime_dependency_entry_invalid:"+lockKey+":"+rel);
      }
      if(++count>MAX_FILES) fail("reviewed_node_runtime_dependency_file_count_exceeded");
      const bytes=stableRegularBytes(
        file,
        "reviewed_node_runtime_dependency_file",
      );
      total+=bytes.length;
      if(total>MAX_TOTAL_BYTES) fail("reviewed_node_runtime_dependency_bytes_exceeded");
      members.push(Object.freeze({
        path:rel,
        bytes:bytes.length,
        sha256:sha256(bytes),
      }));
    }
  }
  walk(base,"",0);
  if(members.length<1) fail("reviewed_node_runtime_dependency_package_empty:"+lockKey);
  return Object.freeze({
    members:Object.freeze(members),
    file_count:members.length,
    bytes:total,
    aggregate_sha256:sha256(Buffer.from(canonicalJson(members),"utf8")),
  });
}

function packageJsonIdentity(root,lockRow){
  const base=packageBaseWithinRoot(
    root,
    lockRow.lock_key,
    "reviewed_node_runtime_package_path_escape:"+String(lockRow.lock_key),
  );
  const bytes=stableRegularBytes(
    path.join(base,"package.json"),
    "reviewed_node_runtime_dependency_package_json",
  );
  let value;
  try{value=JSON.parse(bytes.toString("utf8"));}catch{
    fail("reviewed_node_runtime_dependency_package_json_invalid:"+lockRow.lock_key);
  }
  if(value?.name!==lockRow.name||value?.version!==lockRow.version){
    fail("reviewed_node_runtime_installed_package_identity_mismatch:"+lockRow.lock_key);
  }
  return Object.freeze({
    sha256:sha256(bytes),
    name:value.name,
    version:value.version,
  });
}

function collectInternal(root,rootPackages){
  const realRoot=fs.realpathSync.native(root);
  if(realRoot!==path.resolve(root)) fail("reviewed_node_runtime_repo_root_not_canonical");
  requireCleanRepository(realRoot);
  const packageMeta=exactHeadMetadata(realRoot,"package.json");
  const lockMeta=exactHeadMetadata(realRoot,"package-lock.json");
  const packageBytes=stableRegularBytes(
    path.join(realRoot,"package.json"),
    "reviewed_node_runtime_package_json_stable_read",
  );
  const lockBytes=stableRegularBytes(
    path.join(realRoot,"package-lock.json"),
    "reviewed_node_runtime_package_lock_stable_read",
  );
  if(
    sha256(packageBytes)!==packageMeta.sha256||
    sha256(lockBytes)!==lockMeta.sha256
  ){
    fail("reviewed_node_runtime_metadata_changed_after_head_check");
  }
  let packageJson;
  let lock;
  try{
    packageJson=JSON.parse(packageBytes.toString("utf8"));
    lock=JSON.parse(lockBytes.toString("utf8"));
  }catch{
    fail("reviewed_node_runtime_metadata_json_invalid");
  }
  for(const rootPackage of rootPackages){
    canonicalPackageName(rootPackage);
    if(
      packageJson?.dependencies?.[rootPackage]===undefined&&
      packageJson?.devDependencies?.[rootPackage]===undefined
    ){
      fail("reviewed_node_runtime_root_package_not_declared:"+rootPackage);
    }
  }
  const closure=deriveReviewedPackageLockClosureV1(lock,rootPackages);
  const packages=[];
  const details=new Map();
  let closureFileCount=0;
  let closureBytes=0;
  for(const row of closure.packages){
    const identity=packageJsonIdentity(realRoot,row);
    const inventory=walkPackageDirectory(realRoot,row.lock_key);
    const summary=Object.freeze({
      name:row.name,
      lock_key:row.lock_key,
      version:row.version,
      integrity:row.integrity,
      package_json_sha256:identity.sha256,
      dependencies:row.dependencies,
      optional_absent:row.optional_absent,
      file_count:inventory.file_count,
      bytes:inventory.bytes,
      aggregate_sha256:inventory.aggregate_sha256,
    });
    closureFileCount+=inventory.file_count;
    closureBytes+=inventory.bytes;
    if(closureFileCount>MAX_FILES){
      fail("reviewed_node_runtime_closure_file_count_exceeded");
    }
    if(closureBytes>MAX_TOTAL_BYTES){
      fail("reviewed_node_runtime_closure_bytes_exceeded");
    }
    packages.push(summary);
    details.set(row.lock_key,inventory);
  }
  for(const row of closure.packages){
    const first=packages.find(item=>item.lock_key===row.lock_key);
    const identity=packageJsonIdentity(realRoot,row);
    const inventory=walkPackageDirectory(realRoot,row.lock_key);
    if(
      !first||
      identity.sha256!==first.package_json_sha256||
      inventory.file_count!==first.file_count||
      inventory.bytes!==first.bytes||
      inventory.aggregate_sha256!==first.aggregate_sha256
    ){
      fail("reviewed_node_runtime_dependency_tree_changed_during_collection:"+row.lock_key);
    }
  }
  const packageMetaAfter=exactHeadMetadata(realRoot,"package.json");
  const lockMetaAfter=exactHeadMetadata(realRoot,"package-lock.json");
  if(
    canonicalJson(packageMetaAfter)!==canonicalJson(packageMeta)||
    canonicalJson(lockMetaAfter)!==canonicalJson(lockMeta)
  ){
    fail("reviewed_node_runtime_metadata_changed_during_collection");
  }

  const material=Object.freeze({
    marker:VOID_REVIEWED_NODE_PACKAGE_RUNTIME_V1,
    version:1,
    status:"REVIEWED_NODE_PACKAGE_RUNTIME_PROFILE",
    platform:process.platform,
    arch:process.arch,
    root_packages:closure.root_packages,
    package_json_source:packageMeta,
    package_lock_source:lockMeta,
    package_count:packages.length,
    total_file_count:closureFileCount,
    total_bytes:closureBytes,
    packages:Object.freeze(packages),
    packages_aggregate_sha256:sha256(
      Buffer.from(canonicalJson(packages),"utf8"),
    ),
    authority:VOID_REVIEWED_NODE_PACKAGE_RUNTIME_AUTHORITY_V1,
  });
  const profile=Object.freeze({
    ...material,
    profile_id:"voidrnpr1_"+sha256(Buffer.from(canonicalJson(material),"utf8")),
  });
  return Object.freeze({profile,details});
}

export function collectReviewedNodePackageRuntimeV1({
  repoRoot=ROOT,
  rootPackages=DEFAULT_ROOTS,
}={}){
  return collectInternal(repoRoot,rootPackages).profile;
}

function profileBody(profile){
  const body=Object.create(null);
  for(const [key,value] of Object.entries(profile)){
    if(key==="profile_id") continue;
    body[key]=value;
  }
  return body;
}

function validateProfileSelfIdentity(profile){
  if(
    !plain(profile)||
    profile.marker!==VOID_REVIEWED_NODE_PACKAGE_RUNTIME_V1||
    profile.version!==1||
    profile.status!=="REVIEWED_NODE_PACKAGE_RUNTIME_PROFILE"||
    profile.platform!=="linux"||
    profile.arch!=="x64"||
    !Array.isArray(profile.root_packages)||
    profile.root_packages.length<1||
    !Array.isArray(profile.packages)||
    profile.packages.length!==profile.package_count||
    !Number.isSafeInteger(profile.total_file_count)||
    profile.total_file_count<1||
    !Number.isSafeInteger(profile.total_bytes)||
    profile.total_bytes<1||
    typeof profile.packages_aggregate_sha256!=="string"||
    !SHA64.test(profile.packages_aggregate_sha256)||
    typeof profile.profile_id!=="string"||
    !PROFILE_ID.test(profile.profile_id)
  ){
    fail("reviewed_node_runtime_profile_shape_invalid");
  }
  const roots=profile.root_packages.map(canonicalPackageName);
  if(
    new Set(roots).size!==roots.length||
    canonicalJson([...roots].sort(compareText))!==canonicalJson(roots)
  ){
    fail("reviewed_node_runtime_profile_root_packages_invalid");
  }
  if(
    !Number.isSafeInteger(profile.package_count)||
    profile.package_count<1||
    profile.package_count>MAX_PACKAGES
  ){
    fail("reviewed_node_runtime_profile_package_count_invalid");
  }
  const seenLockKeys=new Set();
  const fileCount=profile.packages.reduce((sum,row)=>{
    if(
      !plain(row)||
      typeof row.lock_key!=="string"||
      canonicalLockKey(row.lock_key)!==row.lock_key||
      typeof row.name!=="string"||
      canonicalPackageName(row.name)!==row.name||
      packageNameFromKey(row.lock_key)!==row.name||
      typeof row.version!=="string"||
      row.version.length<1||
      row.version.length>128||
      typeof row.integrity!=="string"||
      !/^sha512-[A-Za-z0-9+/]+={0,2}$/u.test(row.integrity)||
      typeof row.package_json_sha256!=="string"||
      !SHA64.test(row.package_json_sha256)||
      typeof row.aggregate_sha256!=="string"||
      !SHA64.test(row.aggregate_sha256)||
      !Array.isArray(row.dependencies)||
      !Array.isArray(row.optional_absent)||
      !Number.isSafeInteger(row.file_count)||
      row.file_count<1
    ){
      fail("reviewed_node_runtime_profile_package_invalid");
    }
    if(seenLockKeys.has(row.lock_key)){
      fail("reviewed_node_runtime_profile_duplicate_lock_key");
    }
    seenLockKeys.add(row.lock_key);
    for(const dependency of row.dependencies){
      if(
        !plain(dependency)||
        typeof dependency.name!=="string"||
        typeof dependency.lock_key!=="string"
      ){
        fail("reviewed_node_runtime_profile_dependency_invalid");
      }
      const name=dependency.name.startsWith("peer:")
        ? dependency.name.slice(5)
        : dependency.name;
      canonicalPackageName(name);
      canonicalLockKey(dependency.lock_key);
    }
    for(const absent of row.optional_absent){
      if(typeof absent!=="string"||absent.length<1||absent.length>256){
        fail("reviewed_node_runtime_profile_optional_absent_invalid");
      }
    }
    return sum+row.file_count;
  },0);
  const bytes=profile.packages.reduce((sum,row)=>{
    if(!Number.isSafeInteger(row.bytes)||row.bytes<1){
      fail("reviewed_node_runtime_profile_package_invalid");
    }
    return sum+row.bytes;
  },0);
  if(fileCount!==profile.total_file_count||bytes!==profile.total_bytes){
    fail("reviewed_node_runtime_profile_totals_mismatch");
  }
  if(
    sha256(Buffer.from(canonicalJson(profile.packages),"utf8"))!==
      profile.packages_aggregate_sha256
  ){
    fail("reviewed_node_runtime_profile_package_aggregate_mismatch");
  }
  if(
    canonicalJson(profile.authority)!==
      canonicalJson(VOID_REVIEWED_NODE_PACKAGE_RUNTIME_AUTHORITY_V1)
  ){
    fail("reviewed_node_runtime_profile_authority_mismatch");
  }
  const digest=sha256(Buffer.from(canonicalJson(profileBody(profile)),"utf8"));
  if(profile.profile_id!=="voidrnpr1_"+digest){
    fail("reviewed_node_runtime_profile_content_id_mismatch");
  }
  return profile;
}

function assertExactProfile(actual,expected){
  validateProfileSelfIdentity(expected);
  if(canonicalJson(actual)!==canonicalJson(expected)){
    fail("reviewed_node_runtime_profile_mismatch");
  }
}

export function readReviewedNodePackageRuntimeProfileV1({
  relativePath,
  repoRoot=ROOT,
}={}){
  if(
    typeof relativePath!=="string"||
    relativePath.length<1||
    relativePath.length>MAX_PATH_CHARS||
    path.isAbsolute(relativePath)||
    relativePath.split("/").some(part=>!part||part==="."||part==="..")
  ){
    fail("reviewed_node_runtime_profile_path_invalid");
  }
  const root=fs.realpathSync.native(repoRoot);
  requireCleanRepository(root);
  const source=exactHeadMetadata(root,relativePath);
  const bytes=stableRegularBytes(
    path.join(root,...relativePath.split("/")),
    "reviewed_node_runtime_profile_file",
    4*1024*1024,
  );
  if(sha256(bytes)!==source.sha256){
    fail("reviewed_node_runtime_profile_changed_after_head_check");
  }
  let profile;
  try{profile=JSON.parse(bytes.toString("utf8"));}catch{
    fail("reviewed_node_runtime_profile_json_invalid");
  }
  if(bytes.toString("utf8")!==JSON.stringify(profile,null,2)+"\n"){
    fail("reviewed_node_runtime_profile_serialization_invalid");
  }
  validateProfileSelfIdentity(profile);
  return Object.freeze({
    profile:Object.freeze(profile),
    profile_source:Object.freeze(source),
  });
}

export function verifyReviewedNodePackageRuntimeV1({
  profile,
  repoRoot=ROOT,
}={}){
  if(!plain(profile)) fail("reviewed_node_runtime_profile_required");
  const actual=collectInternal(repoRoot,profile.root_packages).profile;
  assertExactProfile(actual,profile);
  return Object.freeze({
    ok:true,
    status:"REVIEWED_NODE_PACKAGE_RUNTIME_VERIFIED",
    profile_id:profile.profile_id,
    packages_aggregate_sha256:profile.packages_aggregate_sha256,
    package_count:profile.package_count,
    root_packages:profile.root_packages,
    authority:VOID_REVIEWED_NODE_PACKAGE_RUNTIME_AUTHORITY_V1,
  });
}

function ensurePrivateDestination(destinationRoot,repoRoot){
  if(
    typeof destinationRoot!=="string"||
    !path.isAbsolute(destinationRoot)||
    path.resolve(destinationRoot)!==destinationRoot
  ){
    fail("reviewed_node_runtime_destination_invalid");
  }
  const relative=path.relative(repoRoot,destinationRoot);
  if(
    relative===""||
    (relative!==".."&&!relative.startsWith(".."+path.sep)&&!path.isAbsolute(relative))
  ){
    fail("reviewed_node_runtime_destination_inside_repository");
  }
  if(fs.existsSync(destinationRoot)){
    fail("reviewed_node_runtime_destination_must_not_exist");
  }
  const parent=path.dirname(destinationRoot);
  if(fs.realpathSync.native(parent)!==parent){
    fail("reviewed_node_runtime_destination_parent_alias");
  }
  fs.mkdirSync(destinationRoot,{mode:0o700});
  fs.mkdirSync(path.join(destinationRoot,"node_modules"),{mode:0o700});
}

function writeExclusive(file,bytes){
  fs.mkdirSync(path.dirname(file),{recursive:true,mode:0o700});
  const fd=fs.openSync(
    file,
    fs.constants.O_WRONLY|fs.constants.O_CREAT|fs.constants.O_EXCL|
      Number(fs.constants.O_NOFOLLOW||0),
    0o400,
  );
  try{
    fs.writeFileSync(fd,bytes);
    fs.fsyncSync(fd);
    fs.fchmodSync(fd,0o400);
  }finally{fs.closeSync(fd);}
}

function copyPackage(root,destinationRoot,row,inventory){
  const sourceBase=packageBaseWithinRoot(
    root,
    row.lock_key,
    "reviewed_node_runtime_package_path_escape:"+String(row.lock_key),
  );
  const destBase=packageBaseWithinRoot(
    destinationRoot,
    row.lock_key,
    "reviewed_node_runtime_materialized_package_path_escape:"+String(row.lock_key),
  );
  fs.mkdirSync(destBase,{recursive:true,mode:0o700});
  for(const member of inventory.members){
    const source=path.join(sourceBase,...member.path.split("/"));
    const bytes=stableRegularBytes(
      source,
      "reviewed_node_runtime_dependency_copy_source",
    );
    if(bytes.length!==member.bytes||sha256(bytes)!==member.sha256){
      fail("reviewed_node_runtime_dependency_changed_before_copy:"+row.lock_key+":"+member.path);
    }
    writeExclusive(path.join(destBase,...member.path.split("/")),bytes);
  }
}

function makeReadOnlyTree(root){
  const dirs=[];
  function walk(dir){
    dirs.push(dir);
    for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
      const file=path.join(dir,entry.name);
      if(entry.isDirectory()) walk(file);
    }
  }
  walk(root);
  dirs.sort((a,b)=>b.length-a.length);
  for(const dir of dirs) fs.chmodSync(dir,0o500);
}

function makeRemovableTree(root){
  if(!fs.existsSync(root)) return;
  function walk(dir){
    fs.chmodSync(dir,0o700);
    for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
      const file=path.join(dir,entry.name);
      if(entry.isDirectory()) walk(file);
      else fs.chmodSync(file,0o600);
    }
  }
  walk(root);
}

export function verifyMaterializedReviewedNodePackageRuntimeV1({
  profile,
  destinationRoot,
  repoRoot=ROOT,
}={}){
  if(!plain(profile)) fail("reviewed_node_runtime_profile_required");
  validateProfileSelfIdentity(profile);
  const repo=fs.realpathSync.native(repoRoot);
  if(repo!==path.resolve(repoRoot)){
    fail("reviewed_node_runtime_repo_root_not_canonical");
  }
  const root=fs.realpathSync.native(destinationRoot);
  if(root!==path.resolve(destinationRoot)){
    fail("reviewed_node_runtime_materialized_root_alias");
  }
  const relativeToRepo=path.relative(repo,root);
  if(
    relativeToRepo===""||
    (
      relativeToRepo!==".."&&
      !relativeToRepo.startsWith(".."+path.sep)&&
      !path.isAbsolute(relativeToRepo)
    )
  ){
    fail("reviewed_node_runtime_materialized_root_inside_repository");
  }
  const summaries=[];
  for(const row of profile.packages){
    const inventory=walkPackageDirectory(root,row.lock_key);
    const packageIdentity=packageJsonIdentity(root,row);
    summaries.push(Object.freeze({
      ...row,
      package_json_sha256:packageIdentity.sha256,
      file_count:inventory.file_count,
      bytes:inventory.bytes,
      aggregate_sha256:inventory.aggregate_sha256,
    }));
  }
  if(
    canonicalJson(summaries)!==canonicalJson(profile.packages)||
    sha256(Buffer.from(canonicalJson(summaries),"utf8"))!==
      profile.packages_aggregate_sha256
  ){
    fail("reviewed_node_runtime_materialized_inventory_mismatch");
  }
  return Object.freeze({
    ok:true,
    status:"PRIVATE_REVIEWED_NODE_PACKAGE_RUNTIME_VERIFIED",
    profile_id:profile.profile_id,
    packages_aggregate_sha256:profile.packages_aggregate_sha256,
  });
}

export function materializeReviewedNodePackageRuntimeV1({
  profile,
  repoRoot=ROOT,
  destinationRoot,
}={}){
  if(!plain(profile)) fail("reviewed_node_runtime_profile_required");
  const current=collectInternal(repoRoot,profile.root_packages);
  assertExactProfile(current.profile,profile);
  const root=fs.realpathSync.native(repoRoot);
  ensurePrivateDestination(destinationRoot,root);
  try{
    for(const row of profile.packages){
      const inventory=current.details.get(row.lock_key);
      if(!inventory) fail("reviewed_node_runtime_internal_inventory_missing");
      copyPackage(root,destinationRoot,row,inventory);
    }
    const verified=verifyMaterializedReviewedNodePackageRuntimeV1({
      profile,
      destinationRoot,
      repoRoot:root,
    });
    makeReadOnlyTree(path.join(destinationRoot,"node_modules"));
    return Object.freeze({
      ...verified,
      destination_root:destinationRoot,
      node_modules_root:path.join(destinationRoot,"node_modules"),
      read_only_materialization:true,
    });
  }catch(error){
    try{
      makeRemovableTree(destinationRoot);
      fs.rmSync(destinationRoot,{recursive:true,force:true});
    }catch(cleanupError){
      throw new AggregateError(
        [error,cleanupError],
        "reviewed_node_runtime_cleanup_failed",
      );
    }
    throw error;
  }
}


function strictFileInside(root,file,code){
  const base=fs.realpathSync.native(root);
  if(base!==path.resolve(root)) fail(code+"_root_alias");
  if(typeof file!=="string"||!path.isAbsolute(file)||path.resolve(file)!==file){
    fail(code+"_path_invalid");
  }
  const relative=path.relative(base,file);
  if(
    relative===""||
    relative===".."||
    relative.startsWith(".."+path.sep)||
    path.isAbsolute(relative)
  ){
    fail(code+"_path_escape");
  }
  let real;
  let stat;
  try{
    real=fs.realpathSync.native(file);
    stat=fs.lstatSync(file);
  }catch{
    fail(code+"_missing");
  }
  if(real!==file||!stat.isFile()||stat.isSymbolicLink()||stat.nlink!==1){
    fail(code+"_file_invalid");
  }
  return file;
}

function reviewedNodeExecutionEnv(){
  return {
    PATH:"/usr/bin:/bin",
    LANG:"C",
    LC_ALL:"C",
    HOME:"/nonexistent",
  };
}

function reviewedNodeExecutable(){
  let real;
  let stat;
  try{
    real=fs.realpathSync.native(process.execPath);
    stat=fs.statSync(real);
  }catch{
    fail("reviewed_node_runtime_node_executable_unavailable");
  }
  if(!path.isAbsolute(real)||!stat.isFile()||(stat.mode&0o111)===0){
    fail("reviewed_node_runtime_node_executable_invalid");
  }
  return real;
}

export function runReviewedNodePackageRuntimeV1({
  profile,
  destinationRoot,
  entryFile,
  args=[],
  repoRoot=ROOT,
  allowFailure=false,
  timeoutMs=20_000,
}={}){
  if(!plain(profile)) fail("reviewed_node_runtime_profile_required");
  if(!Array.isArray(args)||args.some(value=>typeof value!=="string")){
    fail("reviewed_node_runtime_execution_args_invalid");
  }
  if(typeof allowFailure!=="boolean"){
    fail("reviewed_node_runtime_execution_allow_failure_invalid");
  }
  if(!Number.isSafeInteger(timeoutMs)||timeoutMs<1||timeoutMs>120_000){
    fail("reviewed_node_runtime_execution_timeout_invalid");
  }
  const verified=verifyMaterializedReviewedNodePackageRuntimeV1({
    profile,
    destinationRoot,
    repoRoot,
  });
  if(
    verified.ok!==true||
    verified.status!=="PRIVATE_REVIEWED_NODE_PACKAGE_RUNTIME_VERIFIED"
  ){
    fail("reviewed_node_runtime_execution_materialization_unverified");
  }
  const root=fs.realpathSync.native(destinationRoot);
  strictFileInside(
    root,
    entryFile,
    "reviewed_node_runtime_execution_entry",
  );
  const node=reviewedNodeExecutable();
  const result=spawnSync(
    node,
    [
      "--permission",
      "--allow-fs-read="+root,
      entryFile,
      ...args,
    ],
    {
      cwd:root,
      encoding:"utf8",
      stdio:["ignore","pipe","pipe"],
      timeout:timeoutMs,
      maxBuffer:16*1024*1024,
      env:reviewedNodeExecutionEnv(),
    },
  );
  if(result.error){
    fail("reviewed_node_runtime_execution_spawn_failed");
  }
  if(result.status!==0&&!allowFailure){
    fail("reviewed_node_runtime_execution_failed");
  }
  return Object.freeze({
    ok:result.status===0,
    status:result.status===0
      ?"PRIVATE_REVIEWED_NODE_PACKAGE_RUNTIME_EXECUTION_GREEN"
      :"PRIVATE_REVIEWED_NODE_PACKAGE_RUNTIME_EXECUTION_FAILED_CLOSED",
    exit_code:result.status,
    signal:result.signal??null,
    stdout:String(result.stdout||""),
    stderr:String(result.stderr||""),
    destination_root:root,
    entry_file:entryFile,
    permission_fenced:true,
    allowed_fs_read_root:root,
    ancestor_package_resolution_allowed:false,
    ambient_node_resolution_overrides_ignored:true,
    ambient_dynamic_loader_overrides_ignored:true,
    profile_id:profile.profile_id,
    packages_aggregate_sha256:profile.packages_aggregate_sha256,
  });
}
