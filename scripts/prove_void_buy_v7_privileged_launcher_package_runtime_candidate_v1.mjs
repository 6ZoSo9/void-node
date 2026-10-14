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
const ROOT_VERSIONS=Object.freeze({ethers:"6.17.0",express:"4.22.3",tsx:"4.23.15"});

const sha256=bytes=>crypto.createHash("sha256").update(bytes).digest("hex");
const gitBlob=bytes=>crypto.createHash("sha1")
  .update(Buffer.from("blob "+bytes.length+"\0","utf8")).update(bytes).digest("hex");

function exact(relative,expected,max=2*1024*1024){
  const absolute=path.join(ROOT,relative);
  const stat=fs.lstatSync(absolute);
  assert.ok(stat.isFile()&&!stat.isSymbolicLink()&&stat.nlink===1&&
    stat.size>0&&stat.size<=max,"candidate_input_shape:"+relative);
  const bytes=fs.readFileSync(absolute);
  assert.equal(bytes.length,stat.size,"candidate_input_size:"+relative);
  assert.equal(gitBlob(bytes),expected,"candidate_input_blob:"+relative);
  return bytes;
}
function authorityFalse(profile){
  for(const key of [
    "chain2050_write","credential_access","funds_movement","market_activation",
    "npm_install_performed","package_script_execution","private_key_access",
    "public_presale_activation","rpc_call","runtime_service_mutation",
    "transaction_broadcast","transaction_construction","transaction_signing",
    "transaction_submission","wallet_or_signer_access",
  ]) assert.equal(profile.authority[key],false,key);
}
function derive(){
  assert.equal(process.platform,"linux","linux_only");
  assert.equal(process.arch,"x64","x64_only");
  assert.ok([22,24,26].includes(Number(process.versions.node.split(".")[0])),
    "reviewed_node_major_required");

  exact("package.json",PACKAGE_JSON_BLOB,128*1024);
  exact("package-lock.json",PACKAGE_LOCK_BLOB,2*1024*1024);
  exact(TOOL,TOOL_BLOB,1024*1024);
  exact(GIT_HELPER,GIT_HELPER_BLOB,256*1024);
  const manifest=JSON.parse(exact(ACCEPTED_MANIFEST,ACCEPTED_MANIFEST_BLOB,128*1024));
  const launcher=exact(LAUNCHER,LAUNCHER_BLOB,128*1024).toString("utf8");

  runReviewedGitV1(["merge-base","--is-ancestor",SOURCE_PARENT,"HEAD"],ROOT);
  runReviewedGitV1([
    "diff","--quiet","--no-ext-diff","--no-textconv",
    SOURCE_PARENT,"HEAD","--","package.json","package-lock.json",TOOL,
    GIT_HELPER,ACCEPTED_MANIFEST,LAUNCHER,
  ],ROOT);

  assert.ok(launcher.includes('TSX_CLI="$ROOT/node_modules/tsx/dist/cli.mjs"'),
    "launcher_tsx_cli_boundary_missing");
  assert.ok(launcher.includes('"$NODE" "$TSX_CLI" "$tool_absolute"'),
    "launcher_tsx_execution_boundary_missing");

  assert.equal(manifest.profile_identity_accepted,true);
  assert.deepEqual(manifest.root_packages,ACCEPTED_ROOTS);
  assert.equal(manifest.profile_id,ACCEPTED_PROFILE_ID);
  assert.equal(manifest.packages_aggregate_sha256,ACCEPTED_AGGREGATE);
  assert.equal(manifest.profile_canonical_sha256,ACCEPTED_CANONICAL_SHA);
  assert.equal(manifest.package_count,ACCEPTED_PACKAGE_COUNT);
  assert.equal(manifest.total_file_count,ACCEPTED_FILE_COUNT);
  assert.equal(manifest.total_bytes,ACCEPTED_TOTAL_BYTES);

  const accepted=collectReviewedNodePackageRuntimeV1({rootPackages:ACCEPTED_ROOTS});
  assert.equal(accepted.marker,VOID_REVIEWED_NODE_PACKAGE_RUNTIME_V1);
  assert.equal(accepted.profile_id,ACCEPTED_PROFILE_ID);
  assert.equal(accepted.packages_aggregate_sha256,ACCEPTED_AGGREGATE);
  assert.equal(sha256(Buffer.from(canonicalJson(accepted),"utf8")),ACCEPTED_CANONICAL_SHA);
  assert.equal(accepted.package_count,ACCEPTED_PACKAGE_COUNT);
  assert.equal(accepted.total_file_count,ACCEPTED_FILE_COUNT);
  assert.equal(accepted.total_bytes,ACCEPTED_TOTAL_BYTES);
  authorityFalse(accepted);

  const profile=collectReviewedNodePackageRuntimeV1({rootPackages:PRIVILEGED_ROOTS});
  assert.equal(profile.marker,VOID_REVIEWED_NODE_PACKAGE_RUNTIME_V1);
  assert.deepEqual(profile.root_packages,PRIVILEGED_ROOTS);
  assert.equal(profile.package_json_source.git_blob_sha1,PACKAGE_JSON_BLOB);
  assert.equal(profile.package_lock_source.git_blob_sha1,PACKAGE_LOCK_BLOB);
  for(const [name,version] of Object.entries(ROOT_VERSIONS)){
    const row=profile.packages.find(p=>p.name===name&&p.lock_key==="node_modules/"+name);
    assert.ok(row,"missing_root_package:"+name);
    assert.equal(row.version,version,"root_package_version:"+name);
  }
  assert.ok(profile.package_count>ACCEPTED_PACKAGE_COUNT,"tsx_package_records_missing");
  assert.ok(profile.total_file_count>ACCEPTED_FILE_COUNT,"tsx_package_files_missing");
  assert.ok(profile.total_bytes>ACCEPTED_TOTAL_BYTES,"tsx_package_bytes_missing");
  authorityFalse(profile);

  const next=new Map(profile.packages.map(row=>[row.lock_key,row]));
  for(const row of accepted.packages){
    const current=next.get(row.lock_key);
    assert.ok(current,"accepted_package_missing:"+row.lock_key);
    assert.equal(canonicalJson(current),canonicalJson(row),
      "accepted_package_record_drift:"+row.lock_key);
  }

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
      package_records_preserved_in_candidate:true,
    }),
    required_privileged_root_packages:PRIVILEGED_ROOTS,
    root_versions:ROOT_VERSIONS,
    profile,
    profile_canonical_sha256:sha256(Buffer.from(canonicalJson(profile),"utf8")),
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
  assert.equal(out.accepted_enforcement_profile.package_records_preserved_in_candidate,true);
  assert.deepEqual(out.required_privileged_root_packages,PRIVILEGED_ROOTS);
  console.log(MARKER+"_SELF_TEST_GREEN");
  console.log("accepted_enforcement_package_records_preserved=true");
  console.log("privileged_root_packages=ethers,express,tsx");
  console.log("tsx_version=4.23.15");
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
  throw Error("v7_privileged_launcher_package_candidate_only_no_root_execution_authority");
}
