#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  canonicalJson,
  collectReviewedNodePackageRuntimeV1,
} from "../tools/void-reviewed-node-package-runtime-v1.mjs";
import { runReviewedGitV1 } from "./prove_buy_void_reviewed_git_invocation_v1.mjs";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const MARKER="VOID_BUY_VOID_V7_PRIVILEGED_LAUNCHER_PACKAGE_RUNTIME_V2";
const PACKAGE_JSON_BLOB="14fbdf5717b07fd4c734f5da7a8e84ed59bee93f";
const PACKAGE_LOCK_BLOB="15b5c82ea36f13079a2f9e8863722f654eb3f201";
const PACKAGE_TOOL="tools/void-reviewed-node-package-runtime-v1.mjs";
const PACKAGE_TOOL_BLOB="6475c3f18ffe566cf5f448ca1de4795391a6efde";
const GIT_HELPER="scripts/prove_buy_void_reviewed_git_invocation_v1.mjs";
const GIT_HELPER_BLOB="2df64e31debd4884f2d859d55a87e4ef15925d3d";
const ACCEPTED_MANIFEST="ops/security/reviewed-node-package-runtime-enforcement-post2865-v1.json";
const ACCEPTED_MANIFEST_BLOB="445bcfbf5feae928e0d9cc06d4d31c1ee186fe39";
const LAUNCHER="ops/precision/void_buy_void_source_finality_v7_privileged_launcher_body_v2.bash";
const NATIVE_PREENTRY="ops/precision/void_buy_void_source_finality_v7_native_preentry_v1.c";

const ACCEPTED_PROFILE_ID="voidrnpr1_08e05626e80fbd2aecc3018514aaf76e491954f8258fff996f0b2dca1c3055ac";
const ACCEPTED_AGGREGATE="77622df7d483bc3f73aa39468246f6860237a3f6749a09a0284644493f3990b6";
const ACCEPTED_CANONICAL_SHA="3493638417e2f02a39bb7c48a08935e299754d7474feb71a5c2a48944d3f1757";
const TSX_RUNTIME_ID="voidtsxpr1_0f2bf2dba60718942e7db9b83779a2aeb2e9db32e74610a96a8ec978ad35e4d4";
const TSX_AGGREGATE="e16cca109419b3ce7b39970458fd76ba53bdc6399641911dd2016886c624a8ca";
const MAX_FILE_BYTES=32*1024*1024;

const EXPECTED_TSX_PACKAGES=Object.freeze([
  Object.freeze({
    name:"@esbuild/linux-x64",
    lock_key:"node_modules/@esbuild/linux-x64",
    version:"0.28.2",
    integrity:"sha512-4xTZr1FUmSoQW4XIWmit3tzQrUTZM+N3P0XV8xROKYF50XfI7xeO90+1bZvNwxIufQ9hDQVRJH5YhgPVF8A/HQ==",
    package_json_sha256:"a3924c1835c7849adeb3d82ac24525da0d4190607b60d05265dc6746bde2ddb8",
    file_count:3,
    bytes:11428465,
    aggregate_sha256:"140aa91b50e789834b9947c2439bcf0a90f1fcfd905bd628b1264ee9358473e3",
  }),
  Object.freeze({
    name:"esbuild",
    lock_key:"node_modules/esbuild",
    version:"0.28.2",
    integrity:"sha512-HKVLS8dvII+xoKW9kmqxbRKrnWEXfJJr/FZhhJmiqIB0e053QNYFqOBouTMO/k5sID4MvCiUCvv8b9M4h32wIA==",
    package_json_sha256:"9d0bc453f4e791553c4cc2298ba023b409241fd9801e494741666eb0f6051490",
    file_count:7,
    bytes:147361,
    aggregate_sha256:"d42e556db50baca3e492fb423d2d647ee2222b5dd58d6dfb1b9f6ff6b6011b0c",
  }),
  Object.freeze({
    name:"tsx",
    lock_key:"node_modules/tsx",
    version:"4.23.15",
    integrity:"sha512-Yiex1Ovn8z2xPpOWckIiysV1SSyRMY9BkLF++q0yKiDxCqRhosKfMg3janKkiLBwZ5c/YryloKwGZcrEmtwxKw==",
    package_json_sha256:"ab5f14c4251638844ade3905d3cfc52fc1c833644694d655a05f6d0ca746b83c",
    file_count:30,
    bytes:396881,
    aggregate_sha256:"a3941ae140d767774fc28210994aded6cc0bb04db5c392bdb19c500557ef7f89",
  }),
]);
const OPTIONAL_ABSENT=Object.freeze([
  "@esbuild/aix-ppc64","@esbuild/android-arm","@esbuild/android-arm64",
  "@esbuild/android-x64","@esbuild/darwin-arm64","@esbuild/darwin-x64",
  "@esbuild/freebsd-arm64","@esbuild/freebsd-x64","@esbuild/linux-arm",
  "@esbuild/linux-arm64","@esbuild/linux-ia32","@esbuild/linux-loong64",
  "@esbuild/linux-mips64el","@esbuild/linux-ppc64","@esbuild/linux-riscv64",
  "@esbuild/linux-s390x","@esbuild/netbsd-arm64","@esbuild/netbsd-x64",
  "@esbuild/openbsd-arm64","@esbuild/openbsd-x64","@esbuild/openharmony-arm64",
  "@esbuild/sunos-x64","@esbuild/win32-arm64","@esbuild/win32-ia32",
  "@esbuild/win32-x64","fsevents",
]);

const sha256=b=>crypto.createHash("sha256").update(b).digest("hex");
const gitBlob=b=>crypto.createHash("sha1")
  .update(Buffer.from("blob "+b.length+"\0","utf8")).update(b).digest("hex");

function stableBytes(file,label,max=MAX_FILE_BYTES){
  const visible=fs.lstatSync(file);
  assert.ok(visible.isFile()&&!visible.isSymbolicLink()&&visible.nlink===1&&
    visible.size>=0&&visible.size<=max,label+"_shape");
  const fd=fs.openSync(file,fs.constants.O_RDONLY|Number(fs.constants.O_NOFOLLOW||0));
  try{
    const before=fs.fstatSync(fd);
    assert.equal(before.dev,visible.dev,label+"_dev");
    assert.equal(before.ino,visible.ino,label+"_ino");
    assert.equal(before.size,visible.size,label+"_size");
    const out=Buffer.alloc(before.size+1);
    let total=0;
    while(total<out.length){
      const n=fs.readSync(fd,out,total,out.length-total,total);
      if(n===0)break;
      total+=n;
    }
    assert.equal(total,before.size,label+"_growth_or_short_read");
    const after=fs.fstatSync(fd),now=fs.lstatSync(file);
    for(const key of ["dev","ino","size","mtimeMs","ctimeMs","nlink"]){
      assert.equal(after[key],before[key],label+"_changed_"+key);
      assert.equal(now[key],after[key],label+"_rebound_"+key);
    }
    return out.subarray(0,total);
  }finally{fs.closeSync(fd);}
}
function exact(relative,expected,max=2*1024*1024){
  const bytes=stableBytes(path.join(ROOT,relative),"exact_"+relative.replaceAll("/","_"),max);
  assert.equal(gitBlob(bytes),expected,"blob_drift:"+relative);
  return bytes;
}
function trackedVisible(relative,max=2*1024*1024){
  const bytes=stableBytes(path.join(ROOT,relative),"tracked_"+relative.replaceAll("/","_"),max);
  const visible=gitBlob(bytes);
  const tracked=runReviewedGitV1(["rev-parse","--verify","HEAD:"+relative],ROOT).trim();
  assert.equal(visible,tracked,"worktree_blob_mismatch:"+relative);
  return {bytes,git_blob_sha1:visible};
}
function packageRecord(lock,row){
  const base=path.join(ROOT,...row.lock_key.split("/"));
  const top=fs.lstatSync(base);
  assert.ok(top.isDirectory()&&!top.isSymbolicLink(),"package_dir:"+row.name);
  const pj=stableBytes(path.join(base,"package.json"),"package_json_"+row.name,1024*1024);
  const parsed=JSON.parse(pj.toString("utf8"));
  assert.equal(parsed.name,row.name,"installed_name:"+row.name);
  assert.equal(parsed.version,row.version,"installed_version:"+row.name);
  const lockEntry=lock.packages?.[row.lock_key];
  assert.ok(lockEntry&&typeof lockEntry==="object","lock_entry:"+row.name);
  assert.equal(lockEntry.version,row.version,"lock_version:"+row.name);
  assert.equal(lockEntry.integrity,row.integrity,"lock_integrity:"+row.name);
  const members=[]; let bytes=0;
  const walk=(dir,relative,depth)=>{
    assert.ok(depth<=48,"package_depth:"+row.name);
    for(const ent of fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name,"en"))){
      const rel=relative?relative+"/"+ent.name:ent.name;
      const loc=path.join(dir,ent.name),st=fs.lstatSync(loc);
      assert.equal(st.isSymbolicLink(),false,"package_symlink:"+row.name+":"+rel);
      if(st.isDirectory()){
        if(ent.name==="node_modules")continue;
        walk(loc,rel,depth+1); continue;
      }
      assert.ok(st.isFile()&&st.nlink===1,"package_member:"+row.name+":"+rel);
      const raw=stableBytes(loc,"package_member_"+row.name.replaceAll("/","_")+"_"+rel.replaceAll("/","_"));
      bytes+=raw.length;
      members.push({path:rel,bytes:raw.length,sha256:sha256(raw)});
    }
  };
  walk(base,"",0);
  const actual={
    name:row.name,lock_key:row.lock_key,version:row.version,integrity:row.integrity,
    package_json_sha256:sha256(pj),file_count:members.length,bytes,
    aggregate_sha256:sha256(Buffer.from(canonicalJson(members),"utf8")),
  };
  assert.deepEqual(actual,row,"package_identity:"+row.name);
  return actual;
}


function makeWritableForCleanup(root){
  if(!fs.existsSync(root)) return;
  const st=fs.lstatSync(root);
  if(st.isDirectory()){
    fs.chmodSync(root,0o700);
    for(const name of fs.readdirSync(root)){
      makeWritableForCleanup(path.join(root,name));
    }
  }else{
    fs.chmodSync(root,0o600);
  }
}

function copyPrivatePackage(sourceRoot,destinationRoot,row){
  const sourceBase=path.join(sourceRoot,...row.lock_key.split("/"));
  const destinationBase=path.join(destinationRoot,...row.lock_key.split("/"));
  fs.mkdirSync(destinationBase,{recursive:true,mode:0o700});
  function walk(source,destination,depth){
    assert.ok(depth<=48,"private_copy_depth:"+row.name);
    for(const entry of fs.readdirSync(source,{withFileTypes:true})
      .sort((a,b)=>a.name.localeCompare(b.name,"en"))){
      if(entry.name==="node_modules"&&entry.isDirectory()) continue;
      const sourcePath=path.join(source,entry.name);
      const destinationPath=path.join(destination,entry.name);
      const stat=fs.lstatSync(sourcePath);
      assert.equal(stat.isSymbolicLink(),false,"private_copy_symlink:"+row.name);
      if(stat.isDirectory()){
        fs.mkdirSync(destinationPath,{mode:0o700});
        walk(sourcePath,destinationPath,depth+1);
        continue;
      }
      assert.ok(stat.isFile()&&stat.nlink===1,"private_copy_member:"+row.name);
      const bytes=stableBytes(
        sourcePath,
        "private_copy_source_"+row.name.replaceAll("/","_")+"_"+entry.name,
      );
      const fd=fs.openSync(
        destinationPath,
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
  }
  walk(sourceBase,destinationBase,0);
}

function privatePackageRecord(root,row){
  const base=path.join(root,...row.lock_key.split("/"));
  const top=fs.lstatSync(base);
  assert.ok(top.isDirectory()&&!top.isSymbolicLink(),"private_package_dir:"+row.name);
  const pj=stableBytes(
    path.join(base,"package.json"),
    "private_package_json_"+row.name.replaceAll("/","_"),
    1024*1024,
  );
  const parsed=JSON.parse(pj.toString("utf8"));
  assert.equal(parsed.name,row.name,"private_installed_name:"+row.name);
  assert.equal(parsed.version,row.version,"private_installed_version:"+row.name);
  const members=[]; let bytes=0;
  const walk=(dir,relative,depth)=>{
    assert.ok(depth<=48,"private_package_depth:"+row.name);
    for(const ent of fs.readdirSync(dir,{withFileTypes:true})
      .sort((a,b)=>a.name.localeCompare(b.name,"en"))){
      const rel=relative?relative+"/"+ent.name:ent.name;
      const loc=path.join(dir,ent.name),st=fs.lstatSync(loc);
      assert.equal(st.isSymbolicLink(),false,"private_package_symlink:"+row.name+":"+rel);
      if(st.isDirectory()){ walk(loc,rel,depth+1); continue; }
      assert.ok(st.isFile()&&st.nlink===1,"private_package_member:"+row.name+":"+rel);
      const raw=stableBytes(
        loc,
        "private_package_member_"+row.name.replaceAll("/","_")+"_"+rel.replaceAll("/","_"),
      );
      bytes+=raw.length;
      members.push({path:rel,bytes:raw.length,sha256:sha256(raw)});
    }
  };
  walk(base,"",0);
  return Object.freeze({
    name:row.name,
    lock_key:row.lock_key,
    version:row.version,
    integrity:row.integrity,
    package_json_sha256:sha256(pj),
    file_count:members.length,
    bytes,
    aggregate_sha256:sha256(Buffer.from(canonicalJson(members),"utf8")),
  });
}

function makePrivateDirectoriesReadOnly(root){
  const dirs=[];
  const walk=dir=>{
    dirs.push(dir);
    for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
      if(entry.isDirectory()) walk(path.join(dir,entry.name));
    }
  };
  walk(root);
  dirs.sort((a,b)=>b.length-a.length);
  for(const dir of dirs) fs.chmodSync(dir,0o500);
}

function provePrivateTsxExecution(lock,packages){
  const parent=fs.mkdtempSync(path.join(os.tmpdir(),"void-v7-tsx-runtime-"));
  const destination=path.join(parent,"private-runtime");
  fs.mkdirSync(destination,{mode:0o700});
  try{
    for(const row of packages) copyPrivatePackage(ROOT,destination,row);
    const copied=packages.map(row=>privatePackageRecord(destination,row))
      .sort((a,b)=>a.lock_key.localeCompare(b.lock_key,"en"));
    assert.deepEqual(copied,packages,"private_tsx_package_identity");

    const privateAggregate=sha256(Buffer.from(canonicalJson(copied),"utf8"));
    assert.equal(privateAggregate,TSX_AGGREGATE);
    const material={
      marker:"VOID_BUY_VOID_V7_PRIVILEGED_TSX_RUNTIME_V1",version:1,
      platform:"linux",arch:"x64",root_package:"tsx",root_version:"4.23.15",
      esbuild_version:"0.28.2",installed_optional_platform_packages:["@esbuild/linux-x64"],
      optional_absent:[...OPTIONAL_ABSENT].sort(),package_count:3,total_file_count:40,
      total_bytes:11972707,packages:copied,packages_aggregate_sha256:privateAggregate,
    };
    assert.equal(
      "voidtsxpr1_"+sha256(Buffer.from(canonicalJson(material),"utf8")),
      TSX_RUNTIME_ID,
    );

    const esbuildBinary=path.join(
      destination,
      "node_modules/@esbuild/linux-x64/bin/esbuild",
    );
    const esbuildStat=fs.lstatSync(esbuildBinary);
    assert.ok(
      esbuildStat.isFile()&&!esbuildStat.isSymbolicLink()&&esbuildStat.nlink===1,
      "private_esbuild_binary_invalid",
    );
    fs.chmodSync(esbuildBinary,0o500);
    makePrivateDirectoriesReadOnly(path.join(destination,"node_modules"));

    const scratch=path.join(destination,"scratch");
    fs.mkdirSync(scratch,{mode:0o700});
    const tsconfig=path.join(destination,"tsconfig.json");
    const probe=path.join(destination,"probe.ts");
    fs.writeFileSync(
      tsconfig,
      '{"compilerOptions":{"target":"ES2022","module":"ESNext","moduleResolution":"Bundler"}}\n',
      {mode:0o400,flag:"wx"},
    );
    fs.writeFileSync(
      probe,
      'const value: number = 40 + 2;\nconsole.log("VOID_V7_TSX_INERT_TRANSFORM_GREEN="+value);\n',
      {mode:0o400,flag:"wx"},
    );
    const probeBefore=sha256(fs.readFileSync(probe));
    const cli=path.join(destination,"node_modules/tsx/dist/cli.mjs");
    const cliStat=fs.lstatSync(cli);
    assert.ok(cliStat.isFile()&&!cliStat.isSymbolicLink()&&cliStat.nlink===1);

    const result=spawnSync(
      process.execPath,
      [
        "--permission",
        "--allow-fs-read="+destination,
        "--allow-fs-write="+scratch,
        "--allow-child-process",
        cli,
        probe,
      ],
      {
        cwd:destination,
        encoding:"utf8",
        stdio:["ignore","pipe","pipe"],
        timeout:20_000,
        maxBuffer:4*1024*1024,
        env:{
          PATH:"/usr/bin:/bin",
          HOME:"/nonexistent",
          LANG:"C",
          LC_ALL:"C",
          TZ:"UTC",
          TMPDIR:scratch,
          TMP:scratch,
          TEMP:scratch,
        },
      },
    );
    assert.equal(result.error,undefined,String(result.error||""));
    assert.equal(result.signal,null,"tsx_inert_transform_signal");
    assert.equal(result.status,0,String(result.stderr||result.stdout||""));
    assert.equal(
      String(result.stdout||"").trim(),
      "VOID_V7_TSX_INERT_TRANSFORM_GREEN=42",
      "tsx_inert_transform_output",
    );
    assert.equal(sha256(fs.readFileSync(probe)),probeBefore,"tsx_probe_mutated");
    assert.deepEqual(
      fs.readdirSync(destination).sort(),
      ["node_modules","probe.ts","scratch","tsconfig.json"],
      "tsx_private_runtime_root_mutated",
    );
    const after=packages.map(row=>privatePackageRecord(destination,row))
      .sort((a,b)=>a.lock_key.localeCompare(b.lock_key,"en"));
    assert.deepEqual(after,packages,"private_tsx_package_mutated_after_execution");
    assert.equal(fs.statSync(esbuildBinary).mode&0o222,0);

    return Object.freeze({
      tsx_private_runtime_id:TSX_RUNTIME_ID,
      tsx_private_materialization_verified:true,
      tsx_inert_transform_execution_verified:true,
      esbuild_runtime_execution_verified:true,
      tsx_scratch_write_scope_private:true,
      tsx_scratch_outside_package_tree:true,
      ancestor_package_resolution_blocked_by_fs_permission:true,
      ambient_node_resolution_overrides_inherited:false,
      execution_probe_mutated:false,
    });
  }finally{
    makeWritableForCleanup(parent);
    fs.rmSync(parent,{recursive:true,force:true});
  }
}

export function derivePrivilegedLauncherPackageRuntimeV2(){
  assert.equal(process.platform,"linux");
  assert.equal(process.arch,"x64");
  assert.ok([22,24,26].includes(Number(process.versions.node.split(".")[0])));

  exact("package.json",PACKAGE_JSON_BLOB,128*1024);
  const lockBytes=exact("package-lock.json",PACKAGE_LOCK_BLOB,2*1024*1024);
  exact(PACKAGE_TOOL,PACKAGE_TOOL_BLOB,1024*1024);
  exact(GIT_HELPER,GIT_HELPER_BLOB,256*1024);
  exact(ACCEPTED_MANIFEST,ACCEPTED_MANIFEST_BLOB,128*1024);

  const launcher=trackedVisible(LAUNCHER,128*1024);
  const native=trackedVisible(NATIVE_PREENTRY,128*1024);
  const launcherText=launcher.bytes.toString("utf8");
  const nativeText=native.bytes.toString("utf8");
  for(const required of [
    'NATIVE_PREENTRY_MARKER="VOID_BUY_VOID_V7_NATIVE_PREENTRY_V1"',
    'FIXED_SOURCE_ROOT="/opt/void-buy-void-v7-reviewed-v1"',
    'PACKAGE_RUNTIME_PROOF_REL="scripts/prove_void_buy_v7_privileged_launcher_package_runtime_v2.mjs"',
    '"$NODE" "$ROOT/$PACKAGE_RUNTIME_PROOF_REL" --report',
    '"$NODE" "$TSX_CLI" "$tool_absolute"',
    'native_preentry_verified=true',
  ]) assert.ok(launcherText.includes(required),"launcher_required:"+required);
  assert.ok(
    launcherText.indexOf("native_preentry_required")<
    launcherText.indexOf('"$ID" -u'),
    "native_marker_must_precede_external_launcher_calls",
  );
  const launcherMetadata=fs.lstatSync(path.join(ROOT,LAUNCHER));
  assert.equal(
    launcherMetadata.mode&0o111,
    0,
    "launcher_body_must_not_be_directly_executable",
  );
  for(const required of [
    '#define MARKER "VOID_BUY_VOID_V7_NATIVE_PREENTRY_V1"',
    '#define FIXED_BASH "/usr/bin/bash"',
    '#define FIXED_LAUNCHER "/opt/void-buy-void-v7-reviewed-v1/ops/precision/void_buy_void_source_finality_v7_privileged_launcher_body_v2.bash"',
    'O_RDONLY | O_NOFOLLOW',
    'fexecve(bash_fd, next_argv, envp)',
    '"--noprofile"',
    '"--norc"',
    'launcher_direct_exec_mode=false',
  ]) assert.ok(nativeText.includes(required),"native_required:"+required);

  const accepted=collectReviewedNodePackageRuntimeV1({rootPackages:["ethers","express"]});
  assert.equal(accepted.profile_id,ACCEPTED_PROFILE_ID);
  assert.equal(accepted.packages_aggregate_sha256,ACCEPTED_AGGREGATE);
  assert.equal(sha256(Buffer.from(canonicalJson(accepted),"utf8")),ACCEPTED_CANONICAL_SHA);
  assert.equal(accepted.package_count,82);
  assert.equal(accepted.total_file_count,2498);
  assert.equal(accepted.total_bytes,21290060);

  const lock=JSON.parse(lockBytes.toString("utf8"));
  const packages=EXPECTED_TSX_PACKAGES.map(row=>packageRecord(lock,row))
    .sort((a,b)=>a.lock_key.localeCompare(b.lock_key,"en"));
  const aggregate=sha256(Buffer.from(canonicalJson(packages),"utf8"));
  assert.equal(aggregate,TSX_AGGREGATE);
  assert.equal(packages.reduce((n,x)=>n+x.file_count,0),40);
  assert.equal(packages.reduce((n,x)=>n+x.bytes,0),11972707);
  for(const name of OPTIONAL_ABSENT){
    const key=name==="fsevents"?"node_modules/fsevents":"node_modules/"+name;
    assert.equal(fs.existsSync(path.join(ROOT,...key.split("/"))),false,"optional_present:"+name);
  }
  assert.deepEqual(fs.readdirSync(path.join(ROOT,"node_modules/@esbuild")).sort(),["linux-x64"]);

  const execution=provePrivateTsxExecution(lock,packages);

  const material={
    marker:"VOID_BUY_VOID_V7_PRIVILEGED_TSX_RUNTIME_V1",version:1,
    platform:"linux",arch:"x64",root_package:"tsx",root_version:"4.23.15",
    esbuild_version:"0.28.2",installed_optional_platform_packages:["@esbuild/linux-x64"],
    optional_absent:[...OPTIONAL_ABSENT].sort(),package_count:3,total_file_count:40,
    total_bytes:11972707,packages,packages_aggregate_sha256:aggregate,
  };
  assert.equal("voidtsxpr1_"+sha256(Buffer.from(canonicalJson(material),"utf8")),TSX_RUNTIME_ID);

  return Object.freeze({
    schema:"void_buy_void_v7_privileged_launcher_package_runtime_v2",
    marker:MARKER,
    version:2,
    repository:"6ZoSo9/void-node",
    launcher_git_blob_sha1:launcher.git_blob_sha1,
    native_preentry_source_git_blob_sha1:native.git_blob_sha1,
    package_json_git_blob_sha1:PACKAGE_JSON_BLOB,
    package_lock_git_blob_sha1:PACKAGE_LOCK_BLOB,
    accepted_enforcement_profile_id:ACCEPTED_PROFILE_ID,
    accepted_enforcement_profile_packages_aggregate_sha256:ACCEPTED_AGGREGATE,
    accepted_enforcement_profile_canonical_sha256:ACCEPTED_CANONICAL_SHA,
    tsx_runtime_id:TSX_RUNTIME_ID,
    tsx_packages_aggregate_sha256:TSX_AGGREGATE,
    tsx_package_count:3,
    tsx_total_file_count:40,
    tsx_total_bytes:11972707,
    tsx_private_runtime_id:execution.tsx_private_runtime_id,
    tsx_private_materialization_verified:execution.tsx_private_materialization_verified,
    tsx_inert_transform_execution_verified:execution.tsx_inert_transform_execution_verified,
    esbuild_runtime_execution_verified:execution.esbuild_runtime_execution_verified,
    tsx_scratch_write_scope_private:execution.tsx_scratch_write_scope_private,
    tsx_scratch_outside_package_tree:execution.tsx_scratch_outside_package_tree,
    ancestor_package_resolution_blocked_by_fs_permission:execution.ancestor_package_resolution_blocked_by_fs_permission,
    ambient_node_resolution_overrides_inherited:execution.ambient_node_resolution_overrides_inherited,
    execution_probe_mutated:execution.execution_probe_mutated,
    native_preentry_contract_verified:true,
    launcher_gate_contract_verified:true,
    package_runtime_identity_rederived:true,
    privileged_launcher_package_runtime_verified:true,
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
function report(j){
  console.log(MARKER+"_GREEN");
  console.log("launcher_git_blob_sha1="+j.launcher_git_blob_sha1);
  console.log("native_preentry_source_git_blob_sha1="+j.native_preentry_source_git_blob_sha1);
  console.log("native_preentry_contract_verified=true");
  console.log("launcher_gate_contract_verified=true");
  console.log("package_runtime_identity_rederived=true");
  console.log("tsx_private_materialization_verified=true");
  console.log("tsx_inert_transform_execution_verified=true");
  console.log("esbuild_runtime_execution_verified=true");
  console.log("tsx_scratch_write_scope_private=true");
  console.log("tsx_scratch_outside_package_tree=true");
  console.log("privileged_launcher_package_runtime_verified=true");
  console.log("protected_source_install_authorized=false");
  console.log("privileged_receipt_execution_authorized=false");
  console.log("public_presale_activation=false");
  console.log("funds_movement=false");
}

const invoked=process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(invoked){
  const args=process.argv.slice(2);
  const value=derivePrivilegedLauncherPackageRuntimeV2();
  if(args.length===1&&args[0]==="--derive")process.stdout.write(JSON.stringify(value,null,2)+"\n");
  else if(args.length===1&&args[0]==="--report")report(value);
  else throw Error("v7_privileged_launcher_package_runtime_v2_requires_derive_or_report");
}
