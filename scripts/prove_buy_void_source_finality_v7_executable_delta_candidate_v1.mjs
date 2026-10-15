#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const PREDECESSOR_LOCK="ops/security/buy-void-enforcement-post2865-lock-v1.json";
const PREDECESSOR_SET="1f83d8e867fc53e8a9ed240f4876f1f9412b7b2dca7c06cbb479dbe38e40a93b";
const MODULES=Object.freeze([
  Object.freeze({
    source:"src/economic/buy_void_source_finality_execution_preflight_v1.ts",
    artifact:"dist/economic/buy_void_source_finality_execution_preflight_v1.js",
  }),
  Object.freeze({
    source:"src/economic/buy_void_source_finality_generation_provenance_v7.ts",
    artifact:"dist/economic/buy_void_source_finality_generation_provenance_v7.js",
  }),
  Object.freeze({
    source:"src/economic/buy_void_source_finality_live_process_binding_v1.ts",
    artifact:"dist/economic/buy_void_source_finality_live_process_binding_v1.js",
  }),
  Object.freeze({
    source:"src/economic/buy_void_source_finality_live_process_binding_v2.ts",
    artifact:"dist/economic/buy_void_source_finality_live_process_binding_v2.js",
  }),
  Object.freeze({
    source:"src/economic/buy_void_source_finality_provider_pair_binding_v1.ts",
    artifact:"dist/economic/buy_void_source_finality_provider_pair_binding_v1.js",
  }),
  Object.freeze({
    source:"src/economic/buy_void_ethereum_public_checkout_finality_gate_v1.ts",
    artifact:"dist/economic/buy_void_ethereum_public_checkout_finality_gate_v1.js",
  }),
]);

const sha256=(bytes)=>crypto.createHash("sha256").update(bytes).digest("hex");
const gitBlob=(bytes)=>crypto.createHash("sha1")
  .update(Buffer.from("blob "+bytes.length+"\0","utf8")).update(bytes).digest("hex");

function canonical(value){
  if(value===null||typeof value==="boolean"||typeof value==="string"){
    return JSON.stringify(value);
  }
  if(typeof value==="number"){
    assert.ok(Number.isSafeInteger(value),"non-canonical number");
    return String(value);
  }
  if(Array.isArray(value)) return "["+value.map(canonical).join(",")+"]";
  assert.ok(value&&typeof value==="object"&&!Array.isArray(value),"non-canonical value");
  return "{"+Object.keys(value).sort()
    .map((key)=>JSON.stringify(key)+":"+canonical(value[key])).join(",")+"}";
}

function read(relative,maximum=4*1024*1024){
  assert.ok(!path.isAbsolute(relative)&&!relative.split("/").includes(".."),"unsafe path");
  const absolute=path.join(ROOT,relative);
  const st=fs.lstatSync(absolute);
  assert.ok(
    st.isFile()&&!st.isSymbolicLink()&&st.nlink===1&&st.size>0&&st.size<=maximum,
    "invalid file:"+relative,
  );
  const bytes=fs.readFileSync(absolute);
  assert.equal(bytes.length,st.size,"short read:"+relative);
  return bytes;
}

const predecessorBytes=read(PREDECESSOR_LOCK,128*1024);
const predecessor=JSON.parse(predecessorBytes.toString("utf8"));
assert.equal(predecessor.marker,"VOID_BUY_VOID_ENFORCEMENT_POST2865_LOCK_V1");
assert.equal(predecessor.candidate_enforcement_identity_accepted,true);
assert.equal(
  predecessor.candidate_evidence?.candidate_enforcement_set_sha256,
  PREDECESSOR_SET,
);
assert.equal(predecessor.production_source_finality_authority_ready,false);
assert.equal(predecessor.public_presale_activation,false);
assert.equal(predecessor.funds_movement,false);

const modules=MODULES.map(({source,artifact})=>{
  const sourceBytes=read(source,2*1024*1024);
  const artifactBytes=read(artifact,2*1024*1024);
  return Object.freeze({
    source,
    source_git_blob_sha1:gitBlob(sourceBytes),
    source_bytes:sourceBytes.length,
    source_sha256:sha256(sourceBytes),
    artifact,
    artifact_bytes:artifactBytes.length,
    artifact_sha256:sha256(artifactBytes),
  });
});

const sourceInventorySha256=sha256(Buffer.from(canonical(
  modules.map(({source,source_git_blob_sha1,source_bytes,source_sha256})=>({
    source,source_git_blob_sha1,source_bytes,source_sha256,
  })),
),"utf8"));
const artifactInventorySha256=sha256(Buffer.from(canonical(
  modules.map(({artifact,artifact_bytes,artifact_sha256})=>({
    artifact,artifact_bytes,artifact_sha256,
  })),
),"utf8"));

const body={
  schema:"void_buy_void_source_finality_v7_executable_delta_candidate_v1",
  marker:"VOID_BUY_VOID_SOURCE_FINALITY_V7_EXECUTABLE_DELTA_CANDIDATE_V1",
  version:1,
  repository:"6ZoSo9/void-node",
  predecessor_enforcement_lock:{
    path:PREDECESSOR_LOCK,
    git_blob_sha1:gitBlob(predecessorBytes),
    candidate_enforcement_set_sha256:PREDECESSOR_SET,
    historical_identity_preserved:true,
  },
  module_count:modules.length,
  modules,
  source_inventory_sha256:sourceInventorySha256,
  artifact_inventory_sha256:artifactInventorySha256,
  cross_node_byte_identity_required:true,
  candidate_only:true,
  complete_executable_closure_verified:false,
  candidate_enforcement_identity_accepted:false,
  deployed_artifact_generation_verified:false,
  runtime_mount_authority:false,
  production_source_finality_authority_ready:false,
  public_presale_activation:false,
  funds_movement:false,
};
const output={
  ...body,
  candidate_generation_sha256:sha256(Buffer.from(canonical(body),"utf8")),
};

process.stdout.write(JSON.stringify(output,null,2)+"\n");
