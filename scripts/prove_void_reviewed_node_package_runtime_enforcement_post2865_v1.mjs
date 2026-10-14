#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
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
import {
  runReviewedGitV1,
} from "./prove_buy_void_reviewed_git_invocation_v1.mjs";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const MANIFEST_PATH=
  "ops/security/reviewed-node-package-runtime-enforcement-post2865-v1.json";
const CANDIDATE_SCRIPT=
  "scripts/prove_void_reviewed_node_package_runtime_enforcement_post2865_candidate_v1.mjs";
const CANDIDATE_SCRIPT_BLOB="8ecddeab8ae18f02afc91f7315d343ba5182c82c";
const EXPECTED_CANDIDATE_SOURCE_PARENT=
  "35ff3f8ec453f8104b59967580a84347d6bc1d23";
const REVIEWED_GIT_HELPER=
  "scripts/prove_buy_void_reviewed_git_invocation_v1.mjs";
const REVIEWED_GIT_HELPER_BLOB=
  "2df64e31debd4884f2d859d55a87e4ef15925d3d";

const EXPECTED={
  marker:"VOID_REVIEWED_NODE_PACKAGE_RUNTIME_ENFORCEMENT_POST2865_V1",
  version:1,
  status:"REVIEWED_NODE_PACKAGE_RUNTIME_ENFORCEMENT_POST2865_IDENTITY",
  repository:"6ZoSo9/void-node",
  candidate_parent:"d80f258d7b55fb66d5ec29761befe828efca2b0c",
  candidate_source_parent:"35ff3f8ec453f8104b59967580a84347d6bc1d23",
  root_packages:["ethers","express"],
  package_json_git_blob_sha1:"14fbdf5717b07fd4c734f5da7a8e84ed59bee93f",
  package_lock_git_blob_sha1:"15b5c82ea36f13079a2f9e8863722f654eb3f201",
  profile_id:"voidrnpr1_08e05626e80fbd2aecc3018514aaf76e491954f8258fff996f0b2dca1c3055ac",
  packages_aggregate_sha256:"77622df7d483bc3f73aa39468246f6860237a3f6749a09a0284644493f3990b6",
  profile_canonical_sha256:"3493638417e2f02a39bb7c48a08935e299754d7474feb71a5c2a48944d3f1757",
  candidate_json_sha256:"24650a7984afe461406da3cf21c410ab4104b70d8cf939711b5c1936a1240037",
  package_count:82,
  total_file_count:2498,
  total_bytes:21290060,
  root_versions:{ethers:"6.17.0",express:"4.22.3"},
  profile_identity_accepted:true,
  audited_dependency_generation:true,
  superseded_on_package_metadata_change:true,
  provider_closure_composed:false,
  complete_executable_closure_verified:false,
  deployed_artifact_generation_verified:false,
  runtime_mount_authority:false,
  production_source_finality_authority_ready:false,
  public_presale_activation:false,
  funds_movement:false,
};

function sha256(bytes){
  return crypto.createHash("sha256").update(bytes).digest("hex");
}
function gitBlob(bytes){
  return crypto.createHash("sha1")
    .update(Buffer.from("blob "+bytes.length+"\0","utf8"))
    .update(bytes).digest("hex");
}
function rederiveCandidate(){
  const candidateBytes=fs.readFileSync(CANDIDATE_SCRIPT);
  assert.equal(
    gitBlob(candidateBytes),
    CANDIDATE_SCRIPT_BLOB,
    "candidate_script_blob_drift",
  );
  const stdout=execFileSync(
    process.execPath,
    [path.join(ROOT,CANDIDATE_SCRIPT),"--derive"],
    {
      cwd:ROOT,
      env:{
        PATH:"/usr/bin:/bin",
        HOME:"/nonexistent",
        LANG:"C",
        LC_ALL:"C",
        TZ:"UTC",
      },
      encoding:"utf8",
      stdio:["ignore","pipe","pipe"],
      timeout:120000,
      maxBuffer:8*1024*1024,
    },
  );
  assert.equal(
    sha256(Buffer.from(stdout,"utf8")),
    EXPECTED.candidate_json_sha256,
    "candidate_json_sha256_mismatch",
  );
  const candidate=JSON.parse(stdout);
  assert.equal(
    candidate.schema,
    "void_reviewed_node_package_runtime_enforcement_post2865_candidate_v1",
  );
  assert.equal(candidate.source_parent,EXPECTED_CANDIDATE_SOURCE_PARENT);
  assert.equal(candidate.profile_candidate_accepted,false);
  assert.equal(candidate.enforcement_candidate_identity_accepted,false);
  assert.equal(candidate.provider_closure_composed,false);
  assert.equal(candidate.complete_executable_closure_verified,false);
  assert.equal(candidate.funds_movement,false);
  assert.equal(
    candidate.profile_canonical_sha256,
    EXPECTED.profile_canonical_sha256,
  );
  assert.equal(
    sha256(Buffer.from(canonicalJson(candidate.profile),"utf8")),
    EXPECTED.profile_canonical_sha256,
    "candidate_profile_canonical_sha256_mismatch",
  );
  return candidate;
}
function makeWritable(root){
  if(!fs.existsSync(root))return;
  const st=fs.lstatSync(root);
  if(st.isDirectory()){
    fs.chmodSync(root,0o700);
    for(const name of fs.readdirSync(root))makeWritable(path.join(root,name));
  }else{
    fs.chmodSync(root,0o600);
  }
}
function main(){
  assert.equal(process.platform,"linux");
  assert.equal(process.arch,"x64");
  assert.ok([22,24,26].includes(Number(process.versions.node.split(".")[0])));

  const committed=JSON.parse(fs.readFileSync(MANIFEST_PATH,"utf8"));
  assert.equal(
    canonicalJson(committed),
    canonicalJson(EXPECTED),
    "post2865_enforcement_profile_identity_manifest_drift",
  );

  const gitHelperBytes=fs.readFileSync(REVIEWED_GIT_HELPER);
  assert.equal(
    gitBlob(gitHelperBytes),
    REVIEWED_GIT_HELPER_BLOB,
    "reviewed_git_helper_blob_drift",
  );
  runReviewedGitV1(
    ["merge-base","--is-ancestor",EXPECTED.candidate_parent,"HEAD"],
    ROOT,
  );

  const candidate=rederiveCandidate();
  const profile=collectReviewedNodePackageRuntimeV1({
    rootPackages:EXPECTED.root_packages,
  });
  assert.equal(
    canonicalJson(candidate.profile),
    canonicalJson(profile),
    "candidate_profile_rederivation_mismatch",
  );
  assert.equal(
    sha256(Buffer.from(canonicalJson(profile),"utf8")),
    EXPECTED.profile_canonical_sha256,
    "profile_canonical_sha256_mismatch",
  );
  assert.equal(profile.profile_id,EXPECTED.profile_id);
  assert.equal(
    profile.packages_aggregate_sha256,
    EXPECTED.packages_aggregate_sha256,
  );
  assert.equal(profile.package_count,EXPECTED.package_count);
  assert.equal(profile.total_file_count,EXPECTED.total_file_count);
  assert.equal(profile.total_bytes,EXPECTED.total_bytes);
  assert.deepEqual(profile.root_packages,EXPECTED.root_packages);
  assert.equal(
    profile.package_json_source.git_blob_sha1,
    EXPECTED.package_json_git_blob_sha1,
  );
  assert.equal(
    profile.package_lock_source.git_blob_sha1,
    EXPECTED.package_lock_git_blob_sha1,
  );
  for(const [name,version] of Object.entries(EXPECTED.root_versions)){
    assert.equal(
      profile.packages.find(row=>row.name===name)?.version,
      version,
      name,
    );
  }

  const verified=verifyReviewedNodePackageRuntimeV1({profile});
  assert.equal(verified.ok,true);
  assert.equal(verified.profile_id,EXPECTED.profile_id);

  const temp=fs.mkdtempSync(
    path.join(os.tmpdir(),"void-enforcement-post2865-pkg-lock-"),
  );
  const destination=path.join(temp,"private-runtime");
  try{
    const materialized=materializeReviewedNodePackageRuntimeV1({
      profile,
      destinationRoot:destination,
    });
    assert.equal(materialized.ok,true);
    const rechecked=verifyMaterializedReviewedNodePackageRuntimeV1({
      profile,
      destinationRoot:destination,
    });
    assert.equal(rechecked.ok,true);

    const entry=path.join(destination,"enforcement-package-probe.mjs");
    fs.writeFileSync(
      entry,
      [
        'import express from "express";',
        'import { version as ethersVersion, TypedDataEncoder } from "ethers";',
        'console.log(JSON.stringify({expressType:typeof express,ethersVersion,typedType:typeof TypedDataEncoder}));',
        "",
      ].join("\n"),
      {mode:0o400},
    );
    const executed=runReviewedNodePackageRuntimeV1({
      profile,
      destinationRoot:destination,
      entryFile:entry,
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

  console.log("VOID_REVIEWED_NODE_PACKAGE_RUNTIME_ENFORCEMENT_POST2865_V1_LOCK_GREEN");
  console.log("profile_id="+EXPECTED.profile_id);
  console.log("packages_aggregate_sha256="+EXPECTED.packages_aggregate_sha256);
  console.log("package_count="+EXPECTED.package_count);
  console.log("total_file_count="+EXPECTED.total_file_count);
  console.log("total_bytes="+EXPECTED.total_bytes);
  console.log("root_packages=ethers,express");
  console.log("audited_dependency_generation=true");
  console.log("private_express_and_ethers_import_green=true");
  console.log("profile_identity_accepted=true");
  console.log("provider_closure_composed=false");
  console.log("complete_executable_closure_verified=false");
  console.log("production_source_finality_authority_ready=false");
  console.log("public_presale_activation=false");
  console.log("funds_movement=false");
}
main();
