#!/usr/bin/env node
import assert from "node:assert/strict";
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

{
  const bad=structuredClone(profile);
  bad.packages_aggregate_sha256="0".repeat(64);
  assert.throws(
    ()=>verifyReviewedNodePackageRuntimeV1({profile:bad}),
    /reviewed_node_runtime_profile_mismatch/u,
  );
}
{
  const bad=structuredClone(profile);
  bad.packages[0].version="0.0.0";
  assert.throws(
    ()=>verifyReviewedNodePackageRuntimeV1({profile:bad}),
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
try{
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

  const entry=path.join(destination,"probe.mjs");
  fs.writeFileSync(
    entry,
    [
      'import { version, Wallet, TypedDataEncoder } from "ethers";',
      'const out={version,wallet:typeof Wallet,typed:typeof TypedDataEncoder};',
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
  '"GIT_NO_REPLACE_OBJECTS"',
  '"GIT_CONFIG_NOSYSTEM"',
  "reviewed_node_runtime_dependency_symlink_forbidden",
  "reviewed_node_runtime_dependency_changed_before_copy",
  "PRIVATE_REVIEWED_NODE_PACKAGE_RUNTIME_VERIFIED",
]){
  assert.equal(source.includes(required),true,required);
}

const encoded=Buffer.from(canonicalJson(profile),"utf8").toString("base64");
console.log("VOID_REVIEWED_NODE_PACKAGE_RUNTIME_V1_BOOTSTRAP_GREEN");
console.log("root_package=ethers");
console.log("package_count="+profile.package_count);
console.log("packages_aggregate_sha256="+profile.packages_aggregate_sha256);
console.log("profile_id="+profile.profile_id);
console.log("private_ethers_import_green=true");
console.log("ambient_node_modules_execution_required=false");
console.log("network_access=false");
console.log("package_script_execution=false");
console.log("runtime_chain_wallet_transaction_funds_authority=0");
console.log("PROFILE_BASE64="+encoded);
