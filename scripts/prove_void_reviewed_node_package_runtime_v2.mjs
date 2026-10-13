#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  canonicalJson,
  collectReviewedNodePackageRuntimeV1,
  materializeReviewedNodePackageRuntimeV1,
  readReviewedNodePackageRuntimeProfileV1,
  runReviewedNodePackageRuntimeV1,
  verifyMaterializedReviewedNodePackageRuntimeV1,
  verifyReviewedNodePackageRuntimeV1,
} from "../tools/void-reviewed-node-package-runtime-v1.mjs";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const EXPECTED_TOOL_BLOB="6475c3f18ffe566cf5f448ca1de4795391a6efde";
const EXPECTED_V1_PROOF_BLOB="f715884ffccc1e50e49a30e1eadee409d08623c8";
const EXPECTED_V1_PROFILE_BLOB="87b650e28366acfea3d140ea7778f41f57e5b0c3";
const EXPECTED_V2_PROFILE_BLOB="a09f47596fdf66afef64e82200f23966664a7d2c";
const EXPECTED_PACKAGE_BLOB="14fbdf5717b07fd4c734f5da7a8e84ed59bee93f";
const EXPECTED_LOCK_BLOB="15b5c82ea36f13079a2f9e8863722f654eb3f201";
const EXPECTED_PROFILE_ID="voidrnpr1_7cfd6b67e6c2bde498196fa8bc880031ea24f95942c194ee7e6f553054c08451";
const EXPECTED_PACKAGES_AGGREGATE="5ac562a4396ef1d7ec302ef3af4eba7de7f2e62d478ee83fc30814d13d8d3b73";

function gitBlob(bytes){
  return crypto.createHash("sha1")
    .update(Buffer.from("blob "+bytes.length+"\0","utf8"))
    .update(bytes)
    .digest("hex");
}
function fileBlob(relative){
  return gitBlob(fs.readFileSync(path.join(ROOT,...relative.split("/"))));
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

assert.equal(fileBlob("tools/void-reviewed-node-package-runtime-v1.mjs"),EXPECTED_TOOL_BLOB);
assert.equal(fileBlob("scripts/prove_void_reviewed_node_package_runtime_v1.mjs"),EXPECTED_V1_PROOF_BLOB);
assert.equal(fileBlob("ops/security/reviewed-node-package-runtime-ethers-v1.json"),EXPECTED_V1_PROFILE_BLOB);
assert.equal(fileBlob("ops/security/reviewed-node-package-runtime-ethers-v2.json"),EXPECTED_V2_PROFILE_BLOB);

const frozen=readReviewedNodePackageRuntimeProfileV1({
  relativePath:"ops/security/reviewed-node-package-runtime-ethers-v1.json",
});
assert.equal(frozen.profile_source.git_blob_sha1,EXPECTED_V1_PROFILE_BLOB);
assert.equal(frozen.profile.package_json_source.git_blob_sha1,"f28c3e9446c7623ef203da36a9642d046e5f34ee");
assert.equal(frozen.profile.package_lock_source.git_blob_sha1,"b2671f0149f522b2489247016df0a5ec4bb72b8b");
assert.throws(
  ()=>verifyReviewedNodePackageRuntimeV1({profile:frozen.profile}),
  /reviewed_node_runtime_profile_mismatch/u,
);

const pinned=readReviewedNodePackageRuntimeProfileV1({
  relativePath:"ops/security/reviewed-node-package-runtime-ethers-v2.json",
});
const profile=pinned.profile;
assert.equal(pinned.profile_source.git_blob_sha1,EXPECTED_V2_PROFILE_BLOB);
assert.equal(profile.profile_id,EXPECTED_PROFILE_ID);
assert.equal(profile.package_json_source.git_blob_sha1,EXPECTED_PACKAGE_BLOB);
assert.equal(profile.package_lock_source.git_blob_sha1,EXPECTED_LOCK_BLOB);
assert.equal(profile.packages_aggregate_sha256,EXPECTED_PACKAGES_AGGREGATE);
assert.equal(profile.package_count,9);
assert.equal(profile.packages.find(row=>row.name==="ethers")?.version,"6.17.0");

const current=collectReviewedNodePackageRuntimeV1({rootPackages:["ethers"]});
assert.equal(canonicalJson(current),canonicalJson(profile));
const verified=verifyReviewedNodePackageRuntimeV1({profile});
assert.equal(verified.ok,true);
assert.equal(verified.profile_id,EXPECTED_PROFILE_ID);

const temp=fs.mkdtempSync(path.join(os.tmpdir(),"void-reviewed-node-runtime-v2-"));
const destination=path.join(temp,"private-runtime");
try{
  const materialized=materializeReviewedNodePackageRuntimeV1({profile,destinationRoot:destination});
  assert.equal(materialized.ok,true);
  assert.equal(materialized.read_only_materialization,true);
  const rechecked=verifyMaterializedReviewedNodePackageRuntimeV1({profile,destinationRoot:destination});
  assert.equal(rechecked.ok,true);
  const entry=path.join(destination,"probe.mjs");
  fs.writeFileSync(entry,[
    'import { version, Wallet, TypedDataEncoder } from "ethers";',
    'console.log(JSON.stringify({version,wallet:typeof Wallet,typed:typeof TypedDataEncoder,resolved:import.meta.resolve("ethers")}));',
    "",
  ].join("\n"),{mode:0o400});
  const child=runReviewedNodePackageRuntimeV1({profile,destinationRoot:destination,entryFile:entry});
  assert.equal(child.ok,true,child.stderr);
  assert.equal(child.status,"PRIVATE_REVIEWED_NODE_PACKAGE_RUNTIME_EXECUTION_GREEN");
  const out=JSON.parse(child.stdout.trim());
  assert.equal(out.version,"6.17.0");
  assert.equal(out.wallet,"function");
  assert.equal(out.typed,"function");
  assert.match(out.resolved,/\/node_modules\/ethers\//u);
}finally{
  makeWritable(temp);
  fs.rmSync(temp,{recursive:true,force:true});
}

console.log("VOID_REVIEWED_NODE_PACKAGE_RUNTIME_V2_ENFORCEMENT_GREEN");
console.log("frozen_v1_profile_unchanged=true");
console.log("frozen_v1_refuses_current_package_generation=true");
console.log("v2_profile_cross_node_derived=true");
console.log("v2_profile_id="+profile.profile_id);
console.log("v2_packages_aggregate_sha256="+profile.packages_aggregate_sha256);
console.log("private_ethers_import_green=true");
console.log("runtime_chain_wallet_transaction_funds_authority=0");
