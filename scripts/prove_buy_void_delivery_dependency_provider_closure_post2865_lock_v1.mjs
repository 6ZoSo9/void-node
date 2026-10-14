#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const EVIDENCE=
  "ops/security/buy-void-delivery-dependency-provider-closure-post2865-v1.json";
const CANDIDATE=
  "scripts/prove_buy_void_delivery_dependency_provider_closure_v1.mjs";

const EXPECTED=Object.freeze({
  candidate_parent:"bc510343c5c418a75154bedcc445cbf1251dc037",
  candidate_tree:"7e21075ccd632ea11f4d424424b348217a013dfe",
  source_parent:"35ff3f8ec453f8104b59967580a84347d6bc1d23",
  candidate_script_blob:"bc9473b4fd79eae50f4e86ca24968d3328cdcf22",
  candidate_json_sha256:"6c2bfe62b0d669bc9794a13eb24d357026ca8f9f7c055af1bcc0c0893c94247b",
  provider_closure_sha256:"3b6be7b9efdc7f70b6f270f77208efab2f7321136a54cc76a7e1d34c57bd4945",
  package_json_blob:"14fbdf5717b07fd4c734f5da7a8e84ed59bee93f",
  package_lock_blob:"15b5c82ea36f13079a2f9e8863722f654eb3f201",
  provider_runtime_artifact_count:9,
});

function sha256(bytes){
  return crypto.createHash("sha256").update(bytes).digest("hex");
}
function gitBlob(bytes){
  return crypto.createHash("sha1")
    .update(Buffer.from("blob "+bytes.length+"\0","utf8"))
    .update(bytes)
    .digest("hex");
}
function canonical(value){
  if(value===null)return "null";
  if(typeof value==="string"||typeof value==="boolean")return JSON.stringify(value);
  if(typeof value==="number"){
    assert.equal(Number.isSafeInteger(value),true,"noncanonical number");
    return String(value);
  }
  if(Array.isArray(value))return "["+value.map(canonical).join(",")+"]";
  assert.ok(value&&typeof value==="object","noncanonical value");
  return "{"+Object.keys(value).sort().map(
    key=>JSON.stringify(key)+":"+canonical(value[key]),
  ).join(",")+"}";
}
function gitText(args){
  const r=spawnSync(
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
  assert.equal(r.error,undefined,String(r.error||""));
  assert.equal(r.status,0,String(r.stderr||""));
  return String(r.stdout||"").trim();
}
function requireUnchangedSinceCandidate(paths){
  const r=spawnSync(
    "/usr/bin/git",
    [
      "--no-replace-objects","-C",ROOT,
      "diff","--quiet","--no-ext-diff","--no-textconv",
      EXPECTED.candidate_parent,"HEAD","--",...paths,
    ],
    {
      encoding:"utf8",
      stdio:["ignore","pipe","pipe"],
      timeout:30_000,
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
  assert.equal(r.error,undefined,String(r.error||""));
  assert.equal(r.status,0,"provider source/build inputs changed after hosted candidate");
}
function closureHash(value){
  const body=structuredClone(value);
  delete body.provider_closure_sha256;
  return sha256(Buffer.from(canonical(body),"utf8"));
}
function semanticCandidate(value){
  const out=structuredClone(value);
  delete out.repository_head_sha;
  delete out.repository_tree_sha;
  delete out.provider_closure_sha256;
  return out;
}
function deriveCurrent(){
  const stdout=execFileSync(
    process.execPath,
    [path.join(ROOT,CANDIDATE),"--derive"],
    {
      cwd:ROOT,
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
      encoding:"utf8",
      stdio:["ignore","pipe","pipe"],
      timeout:180_000,
      maxBuffer:16*1024*1024,
    },
  );
  return JSON.parse(stdout);
}

function main(){
  assert.equal(process.platform,"linux");
  assert.equal(process.arch,"x64");
  assert.ok([22,24,26].includes(Number(process.versions.node.split(".")[0])));

  const evidenceBytes=fs.readFileSync(path.join(ROOT,EVIDENCE));
  assert.equal(
    sha256(evidenceBytes),
    EXPECTED.candidate_json_sha256,
    "hosted provider candidate bytes drift",
  );
  const accepted=JSON.parse(evidenceBytes);
  assert.equal(accepted.marker,"VOID_BUY_VOID_DELIVERY_DEPENDENCY_PROVIDER_CLOSURE_V1");
  assert.equal(accepted.repository_head_sha,EXPECTED.candidate_parent);
  assert.equal(accepted.repository_tree_sha,EXPECTED.candidate_tree);
  assert.equal(accepted.source_parent,EXPECTED.source_parent);
  assert.equal(accepted.package_json_git_blob_sha1,EXPECTED.package_json_blob);
  assert.equal(accepted.package_lock_git_blob_sha1,EXPECTED.package_lock_blob);
  assert.equal(
    accepted.provider_closure_sha256,
    EXPECTED.provider_closure_sha256,
  );
  assert.equal(
    closureHash(accepted),
    EXPECTED.provider_closure_sha256,
    "accepted provider closure digest mismatch",
  );
  assert.equal(
    accepted.provider_runtime_artifact_count,
    EXPECTED.provider_runtime_artifact_count,
  );
  assert.equal(accepted.provider_static_module_closure_verified,true);
  assert.equal(accepted.server_runtime_imports_provider,true);
  assert.equal(accepted.server_runtime_imports_delivery_consumer,true);
  assert.equal(accepted.provider_global_writer_bound,true);
  assert.equal(accepted.consumer_global_reader_bound,true);
  assert.equal(accepted.dynamic_module_loader_present,false);
  assert.equal(accepted.post_2865_dependency_generation,true);
  assert.deepEqual(accepted.provider_third_party_packages,["ethers"]);
  for(const key of [
    "delivery_route_closure_composed",
    "whole_enforcement_closure_verified",
    "package_runtime_identity_accepted",
    "candidate_enforcement_identity_accepted",
    "deployed_artifact_generation_verified",
    "runtime_mount_authority",
    "credential_read_performed",
    "signing_performed",
    "rpc_call_performed",
    "transaction_broadcast_performed",
    "production_source_finality_authority_ready",
    "presale_activation",
    "funds_movement",
  ])assert.equal(accepted[key],false,key);

  const candidateBytes=fs.readFileSync(path.join(ROOT,CANDIDATE));
  assert.equal(
    gitBlob(candidateBytes),
    EXPECTED.candidate_script_blob,
    "provider candidate proof source drift",
  );

  assert.equal(
    gitText(["rev-parse",EXPECTED.candidate_parent+"^{tree}"]),
    EXPECTED.candidate_tree,
    "candidate parent tree mismatch",
  );
  gitText(["merge-base","--is-ancestor",EXPECTED.candidate_parent,"HEAD"]);

  const sourceInputs=[
    ...accepted.provider_source_paths,
    "package.json",
    "package-lock.json",
    "tsconfig.build.json",
    CANDIDATE,
  ];
  requireUnchangedSinceCandidate(sourceInputs);

  const current=deriveCurrent();
  assert.equal(current.repository_head_sha,gitText(["rev-parse","HEAD"]));
  assert.equal(current.repository_tree_sha,gitText(["rev-parse","HEAD^{tree}"]));
  assert.equal(
    closureHash(current),
    current.provider_closure_sha256,
    "current provider closure digest invalid",
  );
  assert.equal(
    canonical(semanticCandidate(current)),
    canonical(semanticCandidate(accepted)),
    "provider closure semantics changed after hosted candidate",
  );

  const semanticSha=sha256(
    Buffer.from(canonical(semanticCandidate(accepted)),"utf8"),
  );
  const receipt=Object.freeze({
    marker:"VOID_BUY_VOID_DELIVERY_DEPENDENCY_PROVIDER_CLOSURE_POST2865_LOCK_V1",
    version:1,
    status:"PROVIDER_CLOSURE_IDENTITY_ACCEPTED_ENFORCEMENT_COMPOSITION_HOLD",
    candidate_parent:EXPECTED.candidate_parent,
    candidate_tree:EXPECTED.candidate_tree,
    candidate_json_sha256:EXPECTED.candidate_json_sha256,
    provider_closure_sha256:EXPECTED.provider_closure_sha256,
    provider_closure_semantic_sha256:semanticSha,
    provider_runtime_artifact_count:accepted.provider_runtime_artifact_count,
    provider_source_path_count:accepted.provider_source_paths.length,
    provider_third_party_packages:accepted.provider_third_party_packages,
    provider_closure_identity_accepted:true,
    hosted_cross_node_identity_bound:true,
    current_descendant_semantics_requalified:true,
    delivery_route_closure_composed:false,
    package_runtime_identity_accepted:false,
    whole_enforcement_closure_verified:false,
    candidate_enforcement_identity_accepted:false,
    deployed_artifact_generation_verified:false,
    runtime_mount_authority:false,
    credential_read_performed:false,
    signing_performed:false,
    rpc_call_performed:false,
    transaction_broadcast_performed:false,
    production_source_finality_authority_ready:false,
    public_presale_activation:false,
    funds_movement:false,
  });
  process.stdout.write(JSON.stringify(receipt,null,2)+"\n");
}

main();
