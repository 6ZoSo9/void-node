#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  canonicalJson,
  collectReviewedNodePackageRuntimeV1,
  materializeReviewedNodePackageRuntimeV1,
  runReviewedNodePackageRuntimeV1,
  verifyMaterializedReviewedNodePackageRuntimeV1,
  verifyReviewedNodePackageRuntimeV1,
} from "../tools/void-reviewed-node-package-runtime-v1.mjs";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const MANIFEST_PATH="ops/security/reviewed-node-package-runtime-enforcement-v1.json";
const EXPECTED={
  marker:"VOID_REVIEWED_NODE_PACKAGE_RUNTIME_ENFORCEMENT_V1",
  version:1,
  status:"REVIEWED_NODE_PACKAGE_RUNTIME_ENFORCEMENT_IDENTITY",
  repository:"6ZoSo9/void-node",
  candidate_parent:"ed25d1e85a9d1e4893061b4b0665be9525d6f2ef",
  root_packages:["ethers","express"],
  package_json_git_blob_sha1:"f28c3e9446c7623ef203da36a9642d046e5f34ee",
  package_lock_git_blob_sha1:"b2671f0149f522b2489247016df0a5ec4bb72b8b",
  profile_id:"voidrnpr1_c15b7f3cb00d85f378a69cfc536c3845e29f9be7047e3af0f9fbd646eb2f5860",
  packages_aggregate_sha256:"5eb57ae9bfa6a0f195d5ccf40697985f0043456057525c3fdca7f4c894173561",
  profile_canonical_sha256:"65c9ff47940de6d97c7c798b91abf1ab9ccdaf2504a964eb74f305d70d593a7d",
  candidate_json_sha256:"73ee204fea61cdba3f2cd3958b1c806932284cdb2a114235b2ffdbcb63e3143d",
  package_count:82,total_file_count:2498,total_bytes:21267803,
  root_versions:{ethers:"6.17.0",express:"4.22.2"},
  profile_identity_accepted:true,
  superseded_on_package_metadata_change:true,
  complete_executable_closure_verified:false,
  deployed_artifact_generation_verified:false,
  runtime_mount_authority:false,
  production_source_finality_authority_ready:false,
  public_presale_activation:false,
  funds_movement:false,
};
function makeWritable(root){
  if(!fs.existsSync(root))return;
  const st=fs.lstatSync(root);
  if(st.isDirectory()){
    fs.chmodSync(root,0o700);
    for(const name of fs.readdirSync(root))makeWritable(path.join(root,name));
  }else fs.chmodSync(root,0o600);
}
function main(){
  assert.equal(process.platform,"linux");
  assert.equal(process.arch,"x64");
  assert.ok([22,24,26].includes(Number(process.versions.node.split(".")[0])));

  const committed=JSON.parse(fs.readFileSync(MANIFEST_PATH,"utf8"));
  assert.equal(canonicalJson(committed),canonicalJson(EXPECTED),
    "enforcement_profile_identity_manifest_drift");

  const profile=collectReviewedNodePackageRuntimeV1({
    rootPackages:EXPECTED.root_packages,
  });
  assert.equal(profile.profile_id,EXPECTED.profile_id);
  assert.equal(profile.packages_aggregate_sha256,EXPECTED.packages_aggregate_sha256);
  assert.equal(profile.package_count,EXPECTED.package_count);
  assert.equal(profile.total_file_count,EXPECTED.total_file_count);
  assert.equal(profile.total_bytes,EXPECTED.total_bytes);
  assert.deepEqual(profile.root_packages,EXPECTED.root_packages);
  assert.equal(profile.package_json_source.git_blob_sha1,
    EXPECTED.package_json_git_blob_sha1);
  assert.equal(profile.package_lock_source.git_blob_sha1,
    EXPECTED.package_lock_git_blob_sha1);
  for(const [name,version] of Object.entries(EXPECTED.root_versions)){
    assert.equal(profile.packages.find(row=>row.name===name)?.version,version,name);
  }

  const verified=verifyReviewedNodePackageRuntimeV1({profile});
  assert.equal(verified.ok,true);
  assert.equal(verified.profile_id,EXPECTED.profile_id);

  const temp=fs.mkdtempSync(path.join(os.tmpdir(),"void-enforcement-pkg-lock-"));
  const destination=path.join(temp,"private-runtime");
  try{
    const materialized=materializeReviewedNodePackageRuntimeV1({
      profile,destinationRoot:destination,
    });
    assert.equal(materialized.ok,true);
    const rechecked=verifyMaterializedReviewedNodePackageRuntimeV1({
      profile,destinationRoot:destination,
    });
    assert.equal(rechecked.ok,true);

    const entry=path.join(destination,"enforcement-package-probe.mjs");
    fs.writeFileSync(entry,[
      'import express from "express";',
      'import { version as ethersVersion, TypedDataEncoder } from "ethers";',
      'console.log(JSON.stringify({expressType:typeof express,ethersVersion,typedType:typeof TypedDataEncoder}));',
      "",
    ].join("\n"),{mode:0o400});
    const executed=runReviewedNodePackageRuntimeV1({
      profile,destinationRoot:destination,entryFile:entry,
    });
    assert.equal(executed.ok,true,executed.stderr);
    const out=JSON.parse(executed.stdout.trim());
    assert.equal(out.expressType,"function");
    assert.equal(out.ethersVersion,"6.17.0");
    assert.equal(out.typedType,"function");
    assert.equal(executed.permission_fenced,true);
    assert.equal(executed.ancestor_package_resolution_allowed,false);
  }finally{
    makeWritable(temp);
    fs.rmSync(temp,{recursive:true,force:true});
  }

  console.log("VOID_REVIEWED_NODE_PACKAGE_RUNTIME_ENFORCEMENT_V1_LOCK_GREEN");
  console.log("profile_id="+EXPECTED.profile_id);
  console.log("packages_aggregate_sha256="+EXPECTED.packages_aggregate_sha256);
  console.log("package_count="+EXPECTED.package_count);
  console.log("total_file_count="+EXPECTED.total_file_count);
  console.log("total_bytes="+EXPECTED.total_bytes);
  console.log("root_packages=ethers,express");
  console.log("private_express_and_ethers_import_green=true");
  console.log("profile_identity_accepted=true");
  console.log("complete_executable_closure_verified=false");
  console.log("production_source_finality_authority_ready=false");
  console.log("public_presale_activation=false");
  console.log("funds_movement=false");
}
main();
