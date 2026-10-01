#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

import {
  VOID_REVIEWED_NODE_PACKAGE_RUNTIME_AUTHORITY_V1,
  VOID_REVIEWED_NODE_PACKAGE_RUNTIME_V1,
  canonicalJson,
  collectReviewedNodePackageRuntimeV1,
  materializeReviewedNodePackageRuntimeV1,
  verifyMaterializedReviewedNodePackageRuntimeV1,
  verifyReviewedNodePackageRuntimeV1,
} from "../tools/void-reviewed-node-package-runtime-v1.mjs";

const expectedPackages=[
  "@adraffy/ens-normalize",
  "@noble/curves",
  "@noble/hashes",
  "@types/node",
  "aes-js",
  "ethers",
  "tslib",
  "undici-types",
  "ws",
];

const profile=collectReviewedNodePackageRuntimeV1({
  rootPackages:["ethers"],
});
const repeat=collectReviewedNodePackageRuntimeV1({
  rootPackages:["ethers"],
});

assert.equal(profile.marker,VOID_REVIEWED_NODE_PACKAGE_RUNTIME_V1);
assert.equal(profile.version,1);
assert.equal(profile.status,"REVIEWED_NODE_PACKAGE_RUNTIME_PROFILE");
assert.equal(profile.platform,"linux");
assert.equal(profile.arch,"x64");
assert.deepEqual(profile.root_packages,["ethers"]);
assert.match(profile.profile_id,/^voidrnpr1_[0-9a-f]{64}$/u);
assert.match(profile.packages_aggregate_sha256,/^[0-9a-f]{64}$/u);
assert.equal(profile.package_count,expectedPackages.length);
assert(Number.isSafeInteger(profile.total_file_count)&&profile.total_file_count>0);
assert(Number.isSafeInteger(profile.total_bytes)&&profile.total_bytes>0);
assert.deepEqual(
  profile.packages.map(row=>row.name).sort(),
  expectedPackages,
);
assert.equal(
  profile.packages.find(row=>row.name==="ethers")?.version,
  "6.17.0",
);
assert.equal(
  profile.packages.find(row=>row.name==="ethers")?.integrity,
  "sha512-BpyrpIPJ3ydEVow8zGaz1DuPS7YU8DcWxuBnY9a0UA/lvAPwrMr+EPXsfrul628SRaekPNeIM4UFh/91GWZang==",
);
assert.equal(canonicalJson(repeat),canonicalJson(profile));
assert.equal(profile.package_json_source.path,"package.json");
assert.equal(profile.package_lock_source.path,"package-lock.json");
assert.match(profile.package_json_source.git_blob_sha1,/^[0-9a-f]{40}$/u);
assert.match(profile.package_lock_source.git_blob_sha1,/^[0-9a-f]{40}$/u);
assert.equal(profile.package_json_source.git_blob_sha1,
  "f28c3e9446c7623ef203da36a9642d046e5f34ee");
assert.equal(profile.package_lock_source.git_blob_sha1,
  "b2671f0149f522b2489247016df0a5ec4bb72b8b");

for(const row of profile.packages){
  assert.match(row.integrity,/^sha512-[A-Za-z0-9+/]+={0,2}$/u);
  assert.match(row.package_json_sha256,/^[0-9a-f]{64}$/u);
  assert.match(row.aggregate_sha256,/^[0-9a-f]{64}$/u);
  assert(Number.isSafeInteger(row.file_count)&&row.file_count>0);
  assert(Number.isSafeInteger(row.bytes)&&row.bytes>0);
  assert(Array.isArray(row.dependencies));
  assert(Array.isArray(row.optional_absent));
}
assert.deepEqual(
  profile.packages.find(row=>row.name==="ws")?.optional_absent,
  ["peer:bufferutil","peer:utf-8-validate"],
);

const verified=verifyReviewedNodePackageRuntimeV1({profile});
assert.equal(verified.ok,true);
assert.equal(verified.status,"REVIEWED_NODE_PACKAGE_RUNTIME_VERIFIED");
assert.equal(verified.profile_id,profile.profile_id);

function sha256(value){
  return crypto.createHash("sha256").update(value).digest("hex");
}
function selfConsistentProfile(value){
  const next=structuredClone(value);
  next.packages_aggregate_sha256=sha256(
    Buffer.from(canonicalJson(next.packages),"utf8"),
  );
  const body=Object.fromEntries(
    Object.entries(next).filter(([key])=>key!=="profile_id"),
  );
  next.profile_id="voidrnpr1_"+sha256(
    Buffer.from(canonicalJson(body),"utf8"),
  );
  return next;
}

{
  const bad=structuredClone(profile);
  bad.packages_aggregate_sha256="0".repeat(64);
  assert.throws(
    ()=>verifyReviewedNodePackageRuntimeV1({profile:bad}),
    /reviewed_node_runtime_profile_package_aggregate_mismatch/u,
  );
}
{
  const bad=structuredClone(profile);
  bad.packages[0].version="0.0.0";
  const expected=selfConsistentProfile(bad);
  assert.throws(
    ()=>verifyReviewedNodePackageRuntimeV1({profile:expected}),
    /reviewed_node_runtime_profile_mismatch/u,
  );
}

function makeWritable(root){
  if(!fs.existsSync(root)) return;
  const stat=fs.lstatSync(root);
  if(stat.isDirectory()){
    fs.chmodSync(root,0o700);
    for(const name of fs.readdirSync(root)) makeWritable(path.join(root,name));
  }else{
    fs.chmodSync(root,0o600);
  }
}

const temp=fs.mkdtempSync(path.join(os.tmpdir(),"void-reviewed-node-runtime-proof-"));
const destination=path.join(temp,"private-runtime");

const gitConfig=(args,{check=true}={})=>{
  const result=spawnSync(
    "/usr/bin/git",
    ["-C",path.resolve(path.dirname(new URL(import.meta.url).pathname),".."),"config","--local",...args],
    {encoding:"utf8",stdio:["ignore","pipe","pipe"]},
  );
  if(check&&result.status!==0){
    throw new Error("git config failed: "+String(result.stderr||""));
  }
  return result;
};

try{
  const fakeBin=path.join(temp,"fake-bin");
  const fakeGit=path.join(fakeBin,"git");
  const fakeSentinel=path.join(temp,"fake-git-invoked");
  const fsmonitor=path.join(temp,"fsmonitor.sh");
  const fsmonitorSentinel=path.join(temp,"fsmonitor-invoked");
  fs.mkdirSync(fakeBin);
  fs.writeFileSync(
    fakeGit,
    "#!/bin/sh\nprintf 'invoked\\n' >> "+JSON.stringify(fakeSentinel)+"\nexit 91\n",
    {mode:0o700},
  );
  fs.writeFileSync(
    fsmonitor,
    "#!/bin/sh\nprintf 'invoked\\n' >> "+JSON.stringify(fsmonitorSentinel)+"\nexit 0\n",
    {mode:0o700},
  );
  const priorFsmonitor=gitConfig(
    ["--get-all","core.fsmonitor"],
    {check:false},
  );
  if(priorFsmonitor.status!==0&&priorFsmonitor.status!==1){
    throw new Error("unable to read prior core.fsmonitor");
  }
  gitConfig(["--replace-all","core.fsmonitor",fsmonitor]);
  const savedEnv=new Map();
  for(const key of [
    "PATH","GIT_DIR","GIT_WORK_TREE","GIT_OBJECT_DIRECTORY",
    "GIT_ALTERNATE_OBJECT_DIRECTORIES","GIT_CONFIG_PARAMETERS",
    "GIT_CONFIG_COUNT","GIT_EXEC_PATH",
  ]){
    savedEnv.set(
      key,
      Object.prototype.hasOwnProperty.call(process.env,key)
        ? process.env[key]
        : undefined,
    );
  }
  try{
    process.env.PATH=fakeBin;
    process.env.GIT_DIR=path.join(temp,"forged.git");
    process.env.GIT_WORK_TREE=temp;
    process.env.GIT_OBJECT_DIRECTORY=path.join(temp,"objects");
    process.env.GIT_ALTERNATE_OBJECT_DIRECTORIES=path.join(temp,"alternate");
    process.env.GIT_CONFIG_PARAMETERS="'core.fsmonitor="+fsmonitor.replaceAll("'","")+"'";
    process.env.GIT_CONFIG_COUNT="1";
    process.env.GIT_CONFIG_KEY_0="core.fsmonitor";
    process.env.GIT_CONFIG_VALUE_0=fsmonitor;
    process.env.GIT_EXEC_PATH=fakeBin;
    const hostile=collectReviewedNodePackageRuntimeV1({
      rootPackages:["ethers"],
    });
    assert.equal(canonicalJson(hostile),canonicalJson(profile));
    assert.equal(fs.existsSync(fakeSentinel),false);
    assert.equal(fs.existsSync(fsmonitorSentinel),false);
  }finally{
    for(const [key,value] of savedEnv){
      if(value===undefined) delete process.env[key];
      else process.env[key]=value;
    }
    gitConfig(["--unset-all","core.fsmonitor"],{check:false});
    if(priorFsmonitor.status===0){
      for(const value of String(priorFsmonitor.stdout||"").split("\n").filter(Boolean)){
        gitConfig(["--add","core.fsmonitor",value]);
      }
    }
  }

  const materialized=materializeReviewedNodePackageRuntimeV1({
    profile,
    destinationRoot:destination,
  });
  assert.equal(materialized.ok,true);
  assert.equal(
    materialized.status,
    "PRIVATE_REVIEWED_NODE_PACKAGE_RUNTIME_VERIFIED",
  );
  assert.equal(materialized.profile_id,profile.profile_id);
  assert.equal(materialized.read_only_materialization,true);

  const rechecked=verifyMaterializedReviewedNodePackageRuntimeV1({
    profile,
    destinationRoot:destination,
  });
  assert.equal(rechecked.ok,true);

  {
    const escaped=structuredClone(profile);
    escaped.packages[0].lock_key="node_modules/ethers/../../escape";
    const escapedProfile=selfConsistentProfile(escaped);
    assert.throws(
      ()=>verifyMaterializedReviewedNodePackageRuntimeV1({
        profile:escapedProfile,
        destinationRoot:destination,
      }),
      /reviewed_node_runtime_lock_key_invalid/u,
    );
  }

  const entry=path.join(destination,"probe.mjs");
  fs.writeFileSync(
    entry,
    [
      'import { version, Wallet, TypedDataEncoder } from "ethers";',
      'const out={version,wallet:typeof Wallet,typed:typeof TypedDataEncoder,resolved:import.meta.resolve("ethers")};',
      'console.log(JSON.stringify(out));',
      "",
    ].join("\n"),
    {mode:0o400},
  );
  const env={...process.env};
  for(const key of [
    "NODE_PATH","NODE_OPTIONS","NPM_CONFIG_PREFIX","npm_config_prefix",
  ]) delete env[key];
  const child=spawnSync(process.execPath,[entry],{
    cwd:destination,
    encoding:"utf8",
    stdio:["ignore","pipe","pipe"],
    timeout:20_000,
    env,
  });
  assert.equal(child.status,0,child.stderr);
  const probe=JSON.parse(child.stdout.trim());
  assert.equal(probe.version,"6.17.0");
  assert.equal(probe.wallet,"function");
  assert.equal(probe.typed,"function");
  assert.ok(
    probe.resolved.startsWith(
      new URL("./node_modules/ethers/",new URL("file://"+destination+"/")).href,
    ),
    probe.resolved,
  );

  const ethersRow=profile.packages.find(row=>row.name==="ethers");
  assert(ethersRow);
  const packageJson=path.join(
    destination,
    ...ethersRow.lock_key.split("/"),
    "package.json",
  );
  fs.chmodSync(packageJson,0o600);
  fs.appendFileSync(packageJson," ");
  assert.throws(
    ()=>verifyMaterializedReviewedNodePackageRuntimeV1({
      profile,
      destinationRoot:destination,
    }),
    /reviewed_node_runtime_materialized_inventory_mismatch/u,
  );
}finally{
  makeWritable(temp);
  fs.rmSync(temp,{recursive:true,force:true});
}

for(const [key,value] of Object.entries(
  VOID_REVIEWED_NODE_PACKAGE_RUNTIME_AUTHORITY_V1,
)){
  const allowed=new Set([
    "source_only_dependency_binding",
    "exact_head_package_metadata_required",
    "lockfile_closure_required",
    "installed_package_byte_inventory_required",
    "private_dependency_materialization",
    "post_copy_inventory_reverification",
    "reviewed_profile_head_binding",
    "reviewed_profile_content_id_rederivation",
  ]);
  assert.equal(value,allowed.has(key),key);
}

const source=fs.readFileSync(
  "tools/void-reviewed-node-package-runtime-v1.mjs",
  "utf8",
);
for(const forbidden of [
  "npm ci",
  "npm install",
  "https.request(",
  "fetch(",
  "eth_sendRawTransaction",
  "eth_sendTransaction",
  "new Wallet(",
  "systemctl",
]){
  assert.equal(source.includes(forbidden),false,forbidden);
}
for(const required of [
  '"/usr/bin/git"',
  '"--no-replace-objects"',
  '"core.hooksPath=/dev/null"',
  '"core.attributesFile=/dev/null"',
  '"core.fsmonitor=false"',
  '"core.untrackedCache=false"',
  "GIT_NO_REPLACE_OBJECTS",
  "GIT_CONFIG_NOSYSTEM",
  "GIT_CONFIG_GLOBAL",
  "GIT_CONFIG_SYSTEM",
  "reviewed_node_runtime_lock_key_invalid",
  "reviewed_node_runtime_package_path_escape",
  "reviewed_node_runtime_cleanup_failed",
  "AggregateError",
  "reviewed_node_runtime_dependency_symlink_forbidden",
  "reviewed_node_runtime_dependency_changed_before_copy",
  "PRIVATE_REVIEWED_NODE_PACKAGE_RUNTIME_VERIFIED",
  "readReviewedNodePackageRuntimeProfileV1",
  "reviewed_node_runtime_profile_content_id_mismatch",
]){
  assert.equal(source.includes(required),true,required);
}

const workflow=fs.readFileSync(
  ".github/workflows/void-reviewed-node-package-runtime-v1.yml",
  "utf8",
);
assert(
  workflow.includes(
    "ref: ${{ github.event.pull_request.head.sha || github.sha }}",
  ),
  "focused workflow must check out exact PR head",
);
assert(
  workflow.includes("persist-credentials: false"),
  "focused workflow checkout credentials must remain disabled",
);

const encoded=Buffer.from(canonicalJson(profile),"utf8").toString("base64");
console.log("VOID_REVIEWED_NODE_PACKAGE_RUNTIME_V1_BOOTSTRAP_GREEN");
console.log("root_package=ethers");
console.log("package_count="+profile.package_count);
console.log("packages_aggregate_sha256="+profile.packages_aggregate_sha256);
console.log("profile_id="+profile.profile_id);
console.log("private_ethers_import_green=true");
console.log("materialized_lock_key_path_escape_rejected=true");
console.log("local_git_fsmonitor_execution_blocked=true");
console.log("ambient_git_environment_redirect_blocked=true");
console.log("materialization_cleanup_failure_observable=true");
console.log("exact_pr_head_ci_checkout=true");
console.log("ambient_node_modules_execution_required=false");
console.log("network_access=false");
console.log("package_script_execution=false");
console.log("runtime_chain_wallet_transaction_funds_authority=0");
console.log("PROFILE_BASE64="+encoded);
