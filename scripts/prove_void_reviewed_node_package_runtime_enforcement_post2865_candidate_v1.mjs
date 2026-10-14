#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  VOID_REVIEWED_NODE_PACKAGE_RUNTIME_V1,
  canonicalJson,
  collectReviewedNodePackageRuntimeV1,
} from "../tools/void-reviewed-node-package-runtime-v1.mjs";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const MARKER="VOID_REVIEWED_NODE_PACKAGE_RUNTIME_ENFORCEMENT_POST2865_CANDIDATE_V1";
const SOURCE_PARENT="35ff3f8ec453f8104b59967580a84347d6bc1d23";
const PACKAGE_JSON_BLOB="14fbdf5717b07fd4c734f5da7a8e84ed59bee93f";
const PACKAGE_LOCK_BLOB="15b5c82ea36f13079a2f9e8863722f654eb3f201";
const TOOL="tools/void-reviewed-node-package-runtime-v1.mjs";
const TOOL_BLOB="6475c3f18ffe566cf5f448ca1de4795391a6efde";
const CURRENT_ETHERS_PROOF="scripts/prove_void_reviewed_node_package_runtime_v2.mjs";
const CURRENT_ETHERS_PROOF_BLOB="534939ec04a02ad612079dc7f5f0aad5f9355956";
const CURRENT_ETHERS_PROFILE="ops/security/reviewed-node-package-runtime-ethers-v2.json";
const CURRENT_ETHERS_PROFILE_BLOB="a09f47596fdf66afef64e82200f23966664a7d2c";
const CURRENT_ETHERS_PROFILE_ID=
  "voidrnpr1_7cfd6b67e6c2bde498196fa8bc880031ea24f95942c194ee7e6f553054c08451";
const CURRENT_ETHERS_AGGREGATE=
  "5ac562a4396ef1d7ec302ef3af4eba7de7f2e62d478ee83fc30814d13d8d3b73";
const EXPECTED_ROOTS=Object.freeze(["ethers","express"]);
const EXPECTED_VERSIONS=Object.freeze({ethers:"6.17.0",express:"4.22.3"});
const MAX_BYTES=32*1024*1024;

function sha256(bytes){
  return crypto.createHash("sha256").update(bytes).digest("hex");
}
function gitBlob(bytes){
  return crypto.createHash("sha1")
    .update(Buffer.from("blob "+bytes.length+"\0","utf8"))
    .update(bytes).digest("hex");
}
function readBound(relative,maxBytes=MAX_BYTES){
  const full=path.join(ROOT,...relative.split("/"));
  const before=fs.lstatSync(full,{bigint:true});
  assert.ok(
    before.isFile()&&!before.isSymbolicLink()&&before.nlink===1n&&
    before.size>0n&&before.size<=BigInt(maxBytes),
    "reviewed input metadata invalid: "+relative,
  );
  const fd=fs.openSync(full,fs.constants.O_RDONLY|Number(fs.constants.O_NOFOLLOW||0));
  try{
    const opened=fs.fstatSync(fd,{bigint:true});
    assert.equal(opened.dev,before.dev,"input device drift: "+relative);
    assert.equal(opened.ino,before.ino,"input inode drift: "+relative);
    assert.equal(opened.size,before.size,"input size drift: "+relative);
    const bytes=fs.readFileSync(fd);
    const after=fs.fstatSync(fd,{bigint:true});
    const visible=fs.lstatSync(full,{bigint:true});
    for(const [label,a,b] of [
      ["opened/after",opened,after],
      ["after/visible",after,visible],
    ]){
      assert.equal(a.dev,b.dev,label+" device drift: "+relative);
      assert.equal(a.ino,b.ino,label+" inode drift: "+relative);
      assert.equal(a.uid,b.uid,label+" uid drift: "+relative);
      assert.equal(a.gid,b.gid,label+" gid drift: "+relative);
      assert.equal(a.mode,b.mode,label+" mode drift: "+relative);
      assert.equal(a.nlink,b.nlink,label+" link drift: "+relative);
      assert.equal(a.size,b.size,label+" size drift: "+relative);
      assert.equal(a.mtimeNs,b.mtimeNs,label+" mtime drift: "+relative);
      assert.equal(a.ctimeNs,b.ctimeNs,label+" ctime drift: "+relative);
    }
    assert.equal(BigInt(bytes.length),after.size,"short read: "+relative);
    return bytes;
  }finally{
    fs.closeSync(fd);
  }
}
function exactBlob(relative,expected,maxBytes){
  const bytes=readBound(relative,maxBytes);
  assert.equal(gitBlob(bytes),expected,"reviewed blob drift: "+relative);
  return bytes;
}
function git(args){
  const result=spawnSync(
    "/usr/bin/git",
    ["--no-replace-objects","-C",ROOT,...args],
    {
      encoding:"utf8",
      stdio:["ignore","pipe","pipe"],
      timeout:30_000,
      maxBuffer:8*1024*1024,
      env:{
        PATH:"/usr/bin:/bin",
        HOME:"/nonexistent",
        LANG:"C",
        LC_ALL:"C",
        GIT_CONFIG_NOSYSTEM:"1",
        GIT_CONFIG_GLOBAL:"/dev/null",
        GIT_CONFIG_SYSTEM:"/dev/null",
        GIT_NO_REPLACE_OBJECTS:"1",
        GIT_OPTIONAL_LOCKS:"0",
        GIT_TERMINAL_PROMPT:"0",
      },
    },
  );
  assert.equal(result.error,undefined,String(result.error||""));
  assert.equal(result.status,0,String(result.stderr||""));
  return String(result.stdout||"").trim();
}
function runCurrentEthersProof(){
  const result=spawnSync(
    process.execPath,
    [path.join(ROOT,CURRENT_ETHERS_PROOF)],
    {
      cwd:ROOT,
      encoding:"utf8",
      stdio:["ignore","pipe","pipe"],
      timeout:120_000,
      maxBuffer:8*1024*1024,
      env:{
        PATH:"/usr/bin:/bin",
        HOME:"/nonexistent",
        LANG:"C",
        LC_ALL:"C",
        TZ:"UTC",
        NODE_ENV:"test",
        GIT_CONFIG_NOSYSTEM:"1",
        GIT_CONFIG_GLOBAL:"/dev/null",
        GIT_CONFIG_SYSTEM:"/dev/null",
        GIT_NO_REPLACE_OBJECTS:"1",
        GIT_OPTIONAL_LOCKS:"0",
        GIT_TERMINAL_PROMPT:"0",
      },
    },
  );
  assert.equal(result.error,undefined,String(result.error||""));
  assert.equal(result.status,0,String(result.stdout||"")+String(result.stderr||""));
  return String(result.stdout||"");
}
function assertAuthorityFalse(profile){
  for(const key of [
    "chain2050_write","credential_access","funds_movement","market_activation",
    "npm_install_performed","package_script_execution","private_key_access",
    "public_presale_activation","rpc_call","runtime_service_mutation",
    "transaction_broadcast","transaction_construction","transaction_signing",
    "transaction_submission","wallet_or_signer_access",
  ]){
    assert.equal(profile.authority[key],false,key);
  }
}
function derive(){
  assert.equal(process.platform,"linux","linux_only");
  assert.equal(process.arch,"x64","x64_only");
  assert.ok(
    [22,24,26].includes(Number(process.versions.node.split(".")[0])),
    "reviewed_node_major_required",
  );
  assert.equal(git(["merge-base","--is-ancestor",SOURCE_PARENT,"HEAD"]),"");
  assert.equal(git(["status","--porcelain=v1","--untracked-files=all"]),"");

  exactBlob("package.json",PACKAGE_JSON_BLOB,256*1024);
  exactBlob("package-lock.json",PACKAGE_LOCK_BLOB,4*1024*1024);
  exactBlob(TOOL,TOOL_BLOB,2*1024*1024);
  exactBlob(CURRENT_ETHERS_PROOF,CURRENT_ETHERS_PROOF_BLOB,2*1024*1024);
  const ethersProfileBytes=exactBlob(
    CURRENT_ETHERS_PROFILE,
    CURRENT_ETHERS_PROFILE_BLOB,
    4*1024*1024,
  );
  const ethersProfile=JSON.parse(ethersProfileBytes.toString("utf8"));
  assert.equal(ethersProfile.profile_id,CURRENT_ETHERS_PROFILE_ID);
  assert.equal(ethersProfile.packages_aggregate_sha256,CURRENT_ETHERS_AGGREGATE);
  assert.deepEqual(ethersProfile.root_packages,["ethers"]);
  assert.equal(ethersProfile.package_json_source.git_blob_sha1,PACKAGE_JSON_BLOB);
  assert.equal(ethersProfile.package_lock_source.git_blob_sha1,PACKAGE_LOCK_BLOB);

  const ethersProofOutput=runCurrentEthersProof();
  assert.match(
    ethersProofOutput,
    /VOID_REVIEWED_NODE_PACKAGE_RUNTIME_V2_PROOF_GREEN/u,
    "current ethers V2 proof marker missing",
  );

  const profile=collectReviewedNodePackageRuntimeV1({
    rootPackages:EXPECTED_ROOTS,
  });
  assert.equal(profile.marker,VOID_REVIEWED_NODE_PACKAGE_RUNTIME_V1);
  assert.equal(profile.version,1);
  assert.equal(profile.status,"REVIEWED_NODE_PACKAGE_RUNTIME_PROFILE");
  assert.deepEqual(profile.root_packages,EXPECTED_ROOTS);
  assert.equal(profile.package_json_source.git_blob_sha1,PACKAGE_JSON_BLOB);
  assert.equal(profile.package_lock_source.git_blob_sha1,PACKAGE_LOCK_BLOB);
  assert.ok(profile.package_count>ethersProfile.package_count);
  assert.ok(profile.total_file_count>ethersProfile.total_file_count);
  assert.ok(profile.total_bytes>ethersProfile.total_bytes);
  for(const [name,version] of Object.entries(EXPECTED_VERSIONS)){
    const row=profile.packages.find(entry=>entry.name===name);
    assert.ok(row,"missing root package: "+name);
    assert.equal(row.version,version,"root package version drift: "+name);
  }
  assert.match(profile.profile_id,/^voidrnpr1_[0-9a-f]{64}$/u);
  assert.match(profile.packages_aggregate_sha256,/^[0-9a-f]{64}$/u);
  assertAuthorityFalse(profile);

  const profileBytes=Buffer.from(canonicalJson(profile),"utf8");
  const material=Object.freeze({
    schema:"void_reviewed_node_package_runtime_enforcement_post2865_candidate_v1",
    marker:MARKER,
    version:1,
    repository:"6ZoSo9/void-node",
    source_parent:SOURCE_PARENT,
    package_json_git_blob_sha1:PACKAGE_JSON_BLOB,
    package_lock_git_blob_sha1:PACKAGE_LOCK_BLOB,
    current_ethers_profile_id:CURRENT_ETHERS_PROFILE_ID,
    current_ethers_packages_aggregate_sha256:CURRENT_ETHERS_AGGREGATE,
    current_ethers_profile_git_blob_sha1:CURRENT_ETHERS_PROFILE_BLOB,
    required_third_party_packages:EXPECTED_ROOTS,
    root_versions:EXPECTED_VERSIONS,
    profile,
    profile_canonical_sha256:sha256(profileBytes),
    post_2865_dependency_generation:true,
    profile_candidate_accepted:false,
    enforcement_candidate_identity_accepted:false,
    provider_closure_composed:false,
    complete_executable_closure_verified:false,
    deployed_artifact_generation_verified:false,
    runtime_mount_authority:false,
    production_source_finality_authority_ready:false,
    public_presale_activation:false,
    funds_movement:false,
  });
  return material;
}
function selfTest(){
  const value=derive();
  assert.equal(value.profile_candidate_accepted,false);
  assert.equal(value.complete_executable_closure_verified,false);
  assert.equal(value.provider_closure_composed,false);
  assert.deepEqual(value.required_third_party_packages,EXPECTED_ROOTS);
  console.log(MARKER+"_SELF_TEST_GREEN");
  console.log("root_packages=ethers,express");
  console.log("post_2865_dependency_generation=true");
  console.log("profile_candidate_accepted=false");
  console.log("complete_executable_closure_verified=false");
  console.log("funds_movement=false");
}
const args=process.argv.slice(2);
if(args.length===1&&args[0]==="--derive"){
  process.stdout.write(JSON.stringify(derive(),null,2)+"\n");
}else if(args.length===1&&args[0]==="--self-test"){
  selfTest();
}else{
  throw new Error("post2865_enforcement_package_candidate_only_no_acceptance");
}
