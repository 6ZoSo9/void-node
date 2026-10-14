#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  VOID_REVIEWED_NODE_PACKAGE_RUNTIME_V1,
  canonicalJson,
  collectReviewedNodePackageRuntimeV1,
} from "../tools/void-reviewed-node-package-runtime-v1.mjs";
import { runReviewedGitV1 } from "./prove_buy_void_reviewed_git_invocation_v1.mjs";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const MARKER="VOID_BUY_VOID_V7_PRIVILEGED_LAUNCHER_PACKAGE_RUNTIME_CANDIDATE_V1";
const SOURCE_PARENT="452691b0644c6295a5295636ab1c89158b2dc184";
const PACKAGE_JSON_BLOB="14fbdf5717b07fd4c734f5da7a8e84ed59bee93f";
const PACKAGE_LOCK_BLOB="15b5c82ea36f13079a2f9e8863722f654eb3f201";
const TOOL="tools/void-reviewed-node-package-runtime-v1.mjs";
const TOOL_BLOB="6475c3f18ffe566cf5f448ca1de4795391a6efde";
const GIT_HELPER="scripts/prove_buy_void_reviewed_git_invocation_v1.mjs";
const GIT_HELPER_BLOB="2df64e31debd4884f2d859d55a87e4ef15925d3d";
const ACCEPTED_MANIFEST="ops/security/reviewed-node-package-runtime-enforcement-post2865-v1.json";
const ACCEPTED_MANIFEST_BLOB="445bcfbf5feae928e0d9cc06d4d31c1ee186fe39";
const LAUNCHER="ops/precision/void_buy_void_source_finality_v7_privileged_launcher_v1.sh";
const LAUNCHER_BLOB="ed37356fbc202fe9159b5d390434880a1f86a60e";

const ACCEPTED_PROFILE_ID="voidrnpr1_08e05626e80fbd2aecc3018514aaf76e491954f8258fff996f0b2dca1c3055ac";
const ACCEPTED_AGGREGATE="77622df7d483bc3f73aa39468246f6860237a3f6749a09a0284644493f3990b6";
const ACCEPTED_CANONICAL_SHA="3493638417e2f02a39bb7c48a08935e299754d7474feb71a5c2a48944d3f1757";
const ACCEPTED_PACKAGE_COUNT=82;
const ACCEPTED_FILE_COUNT=2498;
const ACCEPTED_TOTAL_BYTES=21290060;
const ACCEPTED_ROOTS=["ethers","express"];
const PRIVILEGED_ROOTS=["ethers","express","tsx"];
const TSX_KEY="node_modules/tsx";
const ESBUILD_KEY="node_modules/esbuild";
const ESBUILD_PLATFORM_KEY="node_modules/@esbuild/linux-x64";
const TSX_VERSION="4.23.15";
const ESBUILD_VERSION="0.28.2";
const MAX_FILE_BYTES=32*1024*1024;
const MAX_PACKAGE_FILES=4096;
const MAX_PACKAGE_BYTES=64*1024*1024;

const sha256=bytes=>crypto.createHash("sha256").update(bytes).digest("hex");
const gitBlob=bytes=>crypto.createHash("sha1")
  .update(Buffer.from("blob "+bytes.length+"\0","utf8")).update(bytes).digest("hex");

function stableRegularBytes(file,label,max=MAX_FILE_BYTES){
  const visible=fs.lstatSync(file);
  assert.ok(
    visible.isFile()&&!visible.isSymbolicLink()&&visible.nlink===1&&
    visible.size>=0&&visible.size<=max,
    label+"_shape",
  );
  const fd=fs.openSync(
    file,
    fs.constants.O_RDONLY|Number(fs.constants.O_NOFOLLOW||0),
  );
  try{
    const before=fs.fstatSync(fd);
    assert.equal(before.dev,visible.dev,label+"_dev");
    assert.equal(before.ino,visible.ino,label+"_ino");
    assert.equal(before.size,visible.size,label+"_size");
    const buffer=Buffer.alloc(before.size+1);
    let total=0;
    while(total<buffer.length){
      const count=fs.readSync(fd,buffer,total,buffer.length-total,total);
      if(count===0) break;
      total+=count;
    }
    assert.equal(total,before.size,label+"_growth_or_short_read");
    const after=fs.fstatSync(fd);
    const visibleAfter=fs.lstatSync(file);
    for(const key of ["dev","ino","size","mtimeMs","ctimeMs","nlink"]){
      assert.equal(after[key],before[key],label+"_changed_"+key);
      assert.equal(visibleAfter[key],after[key],label+"_rebound_"+key);
    }
    return buffer.subarray(0,total);
  }finally{
    fs.closeSync(fd);
  }
}

function exact(relative,expected,max=2*1024*1024){
  const label="candidate_input_"+relative.replaceAll("/","_");
  const bytes=stableRegularBytes(path.join(ROOT,relative),label,max);
  assert.equal(gitBlob(bytes),expected,"candidate_input_blob:"+relative);
  return bytes;
}

function authorityFalse(profile){
  for(const key of [
    "chain2050_write",
    "credential_access",
    "funds_movement",
    "market_activation",
    "npm_install_performed",
    "package_script_execution",
    "private_key_access",
    "public_presale_activation",
    "rpc_call",
    "runtime_service_mutation",
    "transaction_broadcast",
    "transaction_construction",
    "transaction_signing",
    "transaction_submission",
    "wallet_or_signer_access",
  ]) assert.equal(profile.authority[key],false,key);
}

function plain(value){
  return value!==null&&typeof value==="object"&&!Array.isArray(value);
}

function lockEntry(lock,key){
  const entry=lock.packages?.[key];
  assert.ok(plain(entry),"lock_entry_missing:"+key);
  assert.equal(typeof entry.version,"string","lock_version:"+key);
  assert.match(
    String(entry.integrity||""),
    /^sha512-[A-Za-z0-9+/]+={0,2}$/u,
    "lock_integrity:"+key,
  );
  return entry;
}

function packageBase(lockKey){
  const base=path.resolve(ROOT,...lockKey.split("/"));
  const relative=path.relative(ROOT,base);
  assert.ok(
    relative!==""&&relative!==".."&&!relative.startsWith(".."+path.sep)&&
    !path.isAbsolute(relative),
    "package_path_escape:"+lockKey,
  );
  let cursor=ROOT;
  for(const segment of lockKey.split("/")){
    cursor=path.join(cursor,segment);
    const stat=fs.lstatSync(cursor);
    assert.equal(
      stat.isSymbolicLink(),
      false,
      "package_symlink_ancestor:"+lockKey,
    );
  }
  return base;
}

function packageInventory(lock,key,expectedName,expectedVersion){
  const entry=lockEntry(lock,key);
  assert.equal(entry.version,expectedVersion,"lock_version_mismatch:"+key);
  const base=packageBase(key);
  const baseStat=fs.lstatSync(base);
  assert.ok(
    baseStat.isDirectory()&&!baseStat.isSymbolicLink(),
    "package_directory_invalid:"+key,
  );
  assert.equal(fs.realpathSync.native(base),base,"package_directory_alias:"+key);

  const packageJsonBytes=stableRegularBytes(
    path.join(base,"package.json"),
    "package_json_"+key.replaceAll("/","_"),
    1024*1024,
  );
  const packageJson=JSON.parse(packageJsonBytes.toString("utf8"));
  assert.equal(packageJson.name,expectedName,"installed_name:"+key);
  assert.equal(packageJson.version,expectedVersion,"installed_version:"+key);

  const members=[];
  let totalBytes=0;
  function walk(directory,relative,depth){
    assert.ok(depth<=48,"package_depth:"+key);
    const entries=fs.readdirSync(directory,{withFileTypes:true})
      .sort((a,b)=>a.name.localeCompare(b.name,"en"));
    for(const entryItem of entries){
      const relativePath=relative
        ? relative+"/"+entryItem.name
        : entryItem.name;
      const location=path.join(directory,entryItem.name);
      const stat=fs.lstatSync(location);
      assert.equal(
        stat.isSymbolicLink(),
        false,
        "package_member_symlink:"+key+":"+relativePath,
      );
      if(stat.isDirectory()){
        if(entryItem.name==="node_modules") continue;
        walk(location,relativePath,depth+1);
        continue;
      }
      assert.ok(
        stat.isFile()&&stat.nlink===1,
        "package_member_invalid:"+key+":"+relativePath,
      );
      assert.ok(members.length<MAX_PACKAGE_FILES,"package_file_count:"+key);
      const bytes=stableRegularBytes(
        location,
        "package_member_"+key.replaceAll("/","_")+"_"+
          relativePath.replaceAll("/","_"),
      );
      totalBytes+=bytes.length;
      assert.ok(totalBytes<=MAX_PACKAGE_BYTES,"package_bytes:"+key);
      members.push(Object.freeze({
        path:relativePath,
        bytes:bytes.length,
        sha256:sha256(bytes),
      }));
    }
  }
  walk(base,"",0);
  assert.ok(members.length>0,"package_empty:"+key);

  return Object.freeze({
    name:expectedName,
    lock_key:key,
    version:entry.version,
    integrity:entry.integrity,
    package_json_sha256:sha256(packageJsonBytes),
    file_count:members.length,
    bytes:totalBytes,
    aggregate_sha256:sha256(
      Buffer.from(canonicalJson(members),"utf8"),
    ),
  });
}

function deriveTsxLinuxX64Runtime(lock){
  const tsx=lockEntry(lock,TSX_KEY);
  const esbuild=lockEntry(lock,ESBUILD_KEY);
  const platform=lockEntry(lock,ESBUILD_PLATFORM_KEY);

  assert.equal(tsx.version,TSX_VERSION);
  assert.deepEqual(tsx.dependencies,{esbuild:"~0.28.0"});
  assert.deepEqual(tsx.optionalDependencies,{fsevents:"~2.3.3"});
  assert.equal(esbuild.version,ESBUILD_VERSION);
  assert.ok(
    plain(esbuild.optionalDependencies),
    "esbuild_optional_dependencies_missing",
  );
  assert.equal(
    esbuild.optionalDependencies["@esbuild/linux-x64"],
    ESBUILD_VERSION,
  );
  assert.deepEqual(platform.os,["linux"]);
  assert.deepEqual(platform.cpu,["x64"]);
  assert.equal(platform.optional,true);

  const installedOptional=[];
  const optionalAbsent=[];
  for(const name of Object.keys(esbuild.optionalDependencies).sort()){
    const key="node_modules/"+name;
    const location=path.join(ROOT,...key.split("/"));
    if(name==="@esbuild/linux-x64"){
      assert.ok(fs.existsSync(location),"linux_x64_esbuild_optional_missing");
      installedOptional.push(name);
    }else{
      assert.equal(
        fs.existsSync(location),
        false,
        "foreign_esbuild_platform_package_installed:"+name,
      );
      optionalAbsent.push(name);
    }
  }

  assert.equal(
    fs.existsSync(path.join(ROOT,"node_modules/fsevents")),
    false,
    "fsevents_must_be_absent_on_linux_x64",
  );
  optionalAbsent.push("fsevents");

  const scopedDirectory=path.join(ROOT,"node_modules/@esbuild");
  const scopedNames=fs.readdirSync(scopedDirectory).sort();
  assert.deepEqual(
    scopedNames,
    ["linux-x64"],
    "unexpected_installed_esbuild_platform_packages",
  );

  const packages=[
    packageInventory(lock,TSX_KEY,"tsx",TSX_VERSION),
    packageInventory(lock,ESBUILD_KEY,"esbuild",ESBUILD_VERSION),
    packageInventory(
      lock,
      ESBUILD_PLATFORM_KEY,
      "@esbuild/linux-x64",
      ESBUILD_VERSION,
    ),
  ].sort((a,b)=>a.lock_key.localeCompare(b.lock_key,"en"));

  const totalFileCount=packages.reduce((sum,row)=>sum+row.file_count,0);
  const totalBytes=packages.reduce((sum,row)=>sum+row.bytes,0);
  const material=Object.freeze({
    marker:"VOID_BUY_VOID_V7_PRIVILEGED_TSX_RUNTIME_V1",
    version:1,
    platform:process.platform,
    arch:process.arch,
    root_package:"tsx",
    root_version:TSX_VERSION,
    esbuild_version:ESBUILD_VERSION,
    installed_optional_platform_packages:Object.freeze(installedOptional),
    optional_absent:Object.freeze(optionalAbsent.sort()),
    package_count:packages.length,
    total_file_count:totalFileCount,
    total_bytes:totalBytes,
    packages:Object.freeze(packages),
    packages_aggregate_sha256:sha256(
      Buffer.from(canonicalJson(packages),"utf8"),
    ),
  });
  return Object.freeze({
    ...material,
    runtime_id:"voidtsxpr1_"+sha256(
      Buffer.from(canonicalJson(material),"utf8"),
    ),
  });
}

function derive(){
  assert.equal(process.platform,"linux","linux_only");
  assert.equal(process.arch,"x64","x64_only");
  assert.ok(
    [22,24,26].includes(Number(process.versions.node.split(".")[0])),
    "reviewed_node_major_required",
  );

  const packageBytes=exact("package.json",PACKAGE_JSON_BLOB,128*1024);
  const lockBytes=exact("package-lock.json",PACKAGE_LOCK_BLOB,2*1024*1024);
  exact(TOOL,TOOL_BLOB,1024*1024);
  exact(GIT_HELPER,GIT_HELPER_BLOB,256*1024);
  const manifest=JSON.parse(
    exact(ACCEPTED_MANIFEST,ACCEPTED_MANIFEST_BLOB,128*1024),
  );
  const launcher=exact(LAUNCHER,LAUNCHER_BLOB,128*1024).toString("utf8");

  runReviewedGitV1(["merge-base","--is-ancestor",SOURCE_PARENT,"HEAD"],ROOT);
  runReviewedGitV1([
    "diff",
    "--quiet",
    "--no-ext-diff",
    "--no-textconv",
    SOURCE_PARENT,
    "HEAD",
    "--",
    "package.json",
    "package-lock.json",
    TOOL,
    GIT_HELPER,
    ACCEPTED_MANIFEST,
    LAUNCHER,
  ],ROOT);

  assert.ok(
    launcher.includes('TSX_CLI="$ROOT/node_modules/tsx/dist/cli.mjs"'),
    "launcher_tsx_cli_boundary_missing",
  );
  assert.ok(
    launcher.includes('"$NODE" "$TSX_CLI" "$tool_absolute"'),
    "launcher_tsx_execution_boundary_missing",
  );

  const packageJson=JSON.parse(packageBytes.toString("utf8"));
  const lock=JSON.parse(lockBytes.toString("utf8"));
  assert.equal(packageJson.devDependencies?.tsx,TSX_VERSION);

  assert.equal(manifest.profile_identity_accepted,true);
  assert.deepEqual(manifest.root_packages,ACCEPTED_ROOTS);
  assert.equal(manifest.profile_id,ACCEPTED_PROFILE_ID);
  assert.equal(manifest.packages_aggregate_sha256,ACCEPTED_AGGREGATE);
  assert.equal(manifest.profile_canonical_sha256,ACCEPTED_CANONICAL_SHA);
  assert.equal(manifest.package_count,ACCEPTED_PACKAGE_COUNT);
  assert.equal(manifest.total_file_count,ACCEPTED_FILE_COUNT);
  assert.equal(manifest.total_bytes,ACCEPTED_TOTAL_BYTES);

  const accepted=collectReviewedNodePackageRuntimeV1({
    rootPackages:ACCEPTED_ROOTS,
  });
  assert.equal(accepted.marker,VOID_REVIEWED_NODE_PACKAGE_RUNTIME_V1);
  assert.equal(accepted.profile_id,ACCEPTED_PROFILE_ID);
  assert.equal(accepted.packages_aggregate_sha256,ACCEPTED_AGGREGATE);
  assert.equal(
    sha256(Buffer.from(canonicalJson(accepted),"utf8")),
    ACCEPTED_CANONICAL_SHA,
  );
  assert.equal(accepted.package_count,ACCEPTED_PACKAGE_COUNT);
  assert.equal(accepted.total_file_count,ACCEPTED_FILE_COUNT);
  assert.equal(accepted.total_bytes,ACCEPTED_TOTAL_BYTES);
  authorityFalse(accepted);

  const tsxRuntime=deriveTsxLinuxX64Runtime(lock);
  assert.equal(tsxRuntime.package_count,3);
  assert.deepEqual(
    tsxRuntime.installed_optional_platform_packages,
    ["@esbuild/linux-x64"],
  );
  assert.ok(tsxRuntime.optional_absent.includes("fsevents"));
  assert.ok(tsxRuntime.optional_absent.includes("@esbuild/darwin-x64"));
  assert.ok(tsxRuntime.optional_absent.includes("@esbuild/win32-x64"));
  assert.match(tsxRuntime.runtime_id,/^voidtsxpr1_[0-9a-f]{64}$/u);

  return Object.freeze({
    schema:"void_buy_void_v7_privileged_launcher_package_runtime_candidate_v1",
    marker:MARKER,
    version:1,
    repository:"6ZoSo9/void-node",
    source_parent:SOURCE_PARENT,
    launcher_git_blob_sha1:LAUNCHER_BLOB,
    launcher_executes_tsx_as_root:true,
    package_json_git_blob_sha1:PACKAGE_JSON_BLOB,
    package_lock_git_blob_sha1:PACKAGE_LOCK_BLOB,
    accepted_enforcement_profile:Object.freeze({
      manifest_git_blob_sha1:ACCEPTED_MANIFEST_BLOB,
      profile_id:ACCEPTED_PROFILE_ID,
      packages_aggregate_sha256:ACCEPTED_AGGREGATE,
      profile_canonical_sha256:ACCEPTED_CANONICAL_SHA,
      package_count:ACCEPTED_PACKAGE_COUNT,
      total_file_count:ACCEPTED_FILE_COUNT,
      total_bytes:ACCEPTED_TOTAL_BYTES,
      root_packages:ACCEPTED_ROOTS,
      rederived_exactly:true,
      package_records_preserved:true,
    }),
    required_privileged_root_packages:PRIVILEGED_ROOTS,
    root_versions:Object.freeze({
      ethers:"6.17.0",
      express:"4.22.3",
      tsx:TSX_VERSION,
    }),
    tsx_runtime:tsxRuntime,
    cross_node_byte_identity_required:true,
    profile_candidate_accepted:false,
    privileged_launcher_package_runtime_verified:false,
    protected_source_install_authorized:false,
    privileged_receipt_execution_authorized:false,
    runtime_service_mutation:false,
    credential_access:false,
    wallet_or_signer_access:false,
    rpc_call:false,
    transaction_broadcast:false,
    public_presale_activation:false,
    funds_movement:false,
  });
}

function selfTest(){
  const out=derive();
  assert.equal(out.profile_candidate_accepted,false);
  assert.equal(out.privileged_launcher_package_runtime_verified,false);
  assert.equal(out.accepted_enforcement_profile.package_records_preserved,true);
  assert.deepEqual(out.required_privileged_root_packages,PRIVILEGED_ROOTS);
  assert.equal(out.tsx_runtime.package_count,3);
  console.log(MARKER+"_SELF_TEST_GREEN");
  console.log("accepted_enforcement_profile_rederived=true");
  console.log("tsx_installed_runtime_packages=3");
  console.log("tsx_platform_package=@esbuild/linux-x64");
  console.log("foreign_esbuild_platform_packages_installed=false");
  console.log("profile_candidate_accepted=false");
  console.log("privileged_receipt_execution_authorized=false");
  console.log("presale_activation=false");
  console.log("funds_movement=false");
}

const args=process.argv.slice(2);
if(args.length===1&&args[0]==="--derive"){
  process.stdout.write(JSON.stringify(derive(),null,2)+"\n");
}else if(args.length===1&&args[0]==="--self-test"){
  selfTest();
}else{
  throw Error(
    "v7_privileged_launcher_package_candidate_only_no_root_execution_authority",
  );
}
