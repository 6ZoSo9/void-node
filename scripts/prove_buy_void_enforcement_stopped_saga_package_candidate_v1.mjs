#!/usr/bin/env node
// Source/STOPPED-image package-candidate proof only. Never runs the saga module.
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const DOCKERFILE_GIT_BLOB="eb078d25a588e6ba46d46a93326fe20572d9b7fa";
const ECONOMIC_SOURCE_GIT_BLOB="acf2f88b513bbe50e192531f9fc8d261b69bd0f1";
const SOURCE_SAGA_GIT_BLOB="d6a2d1cd82e5e255f435c1e21d1783774a44b2b1";
const ECONOMIC_SOURCE="src/economic/buy_void_erc20_execution_composition_v1.ts";
const COMPILED_IMPORTER="dist/economic/buy_void_erc20_execution_composition_v1.js";
const COMPILED_IMPORTER_SHA256="b243a1611bceff0a7d758aeaaebf4e74c2bad6b762595ff0e13804e11b5c2af1";
const COMPILED_IMPORTER_BYTES=86455;
const SAGA="buy-void-crash-consistent-fulfillment-saga-v1.mjs";
const SAGA_SOURCE="tools/"+SAGA;
const SAGA_SIZE=58023;
const BROADCASTER="buy-void-prepared-transaction-broadcaster-service-v1.mjs";
const CUSTODIAN="buy-void-prepared-transaction-custodian-service-v1.mjs";
const EXISTING_POSITIVE="void-wc-void-coupled-launch-readiness-v1.mjs";
const sha256=b=>crypto.createHash("sha256").update(b).digest("hex");
const gitBlob=b=>crypto.createHash("sha1").update(Buffer.from("blob "+b.length+"\0")).update(b).digest("hex");

function regularFile(location){
  const stat=fs.lstatSync(location);
  assert.ok(stat.isFile()&&!stat.isSymbolicLink()&&stat.nlink===1,"file missing/nonregular: "+location);
  return fs.readFileSync(location);
}
function originalSource(){
  const saga=regularFile(path.join(ROOT,SAGA_SOURCE));
  assert.equal(saga.length,SAGA_SIZE,"reviewed saga source size drift");
  assert.equal(gitBlob(saga),SOURCE_SAGA_GIT_BLOB,"reviewed saga source Git blob drift");
  return saga;
}
function sourceProbe(){
  const docker=regularFile(path.join(ROOT,"Dockerfile"));
  assert.equal(gitBlob(docker),DOCKERFILE_GIT_BLOB,"new Dockerfile identity changed");
  const source=regularFile(path.join(ROOT,ECONOMIC_SOURCE));
  assert.equal(gitBlob(source),ECONOMIC_SOURCE_GIT_BLOB,"compiled runtime importer source drift");
  const sourceText=source.toString("utf8");
  assert.match(sourceText,/new Function\(\s*["']specifier["']\s*,\s*["']return import\(specifier\)["']\s*\)/u,
    "reviewed generated importer absent");
  assert.ok(sourceText.includes("../../tools/"+SAGA),"reviewed saga specifier absent");
  originalSource();
  const text=docker.toString("utf8");
  const finalIndex=text.indexOf("\nFROM node:24-alpine\n");
  assert.ok(finalIndex>=0,"unreviewed final stage");
  const final=text.slice(finalIndex+1);
  assert.equal((final.match(/^FROM[ ]+/gmu)||[]).length,1,"unexpected final stages");
  const copy="COPY --from=build /app/tools/"+SAGA+" ./tools/";
  assert.equal(final.split(copy).length,2,"single reviewed saga COPY required");
  assert.ok(final.includes("COPY --from=build /app/dist ./dist"),"compiled module not copied");
  assert.ok(final.includes("/app/tools/"+EXISTING_POSITIVE),"known positive copied tool missing");
  assert.ok(!final.includes("/app/tools/"+BROADCASTER) &&
    !final.includes("/app/tools/"+CUSTODIAN),"unreviewed broadcaster/custodian exposure");
  assert.ok(!/COPY\s+--from=build\s+\/app\/tools\s+\.\/tools/u.test(final),
    "blanket tools copy would widen package authority");
  return Object.freeze({
    marker:"VOID_BUY_VOID_SAGA_STOPPED_IMAGE_POSITIVE_PACKAGE_CANDIDATE_V1",
    dockerfile_git_blob_sha1:DOCKERFILE_GIT_BLOB,
    saga_source_git_blob_sha1:SOURCE_SAGA_GIT_BLOB,
    reviewed_saga_source_bytes:SAGA_SIZE,
    reviewed_importer_git_blob_sha1:ECONOMIC_SOURCE_GIT_BLOB,
    saga_source_copy_declared:true,
    stopped_image_saga_byte_identity_verified:false,
    executed_saga_loader_qualified:false,
    image_generation_accepted:false,
    deployed_artifact_generation_verified:false,
    production_source_finality_authority_ready:false,
    presale_activation:false,
    funds_movement:false
  });
}
function matchStagedSaga(candidate,source){
  assert.equal(candidate.length,source.length,"staged saga byte length drift");
  assert.ok(candidate.equals(source),"staged saga must be EXACT reviewed source bytes");
  assert.equal(gitBlob(candidate),SOURCE_SAGA_GIT_BLOB,"staged saga source blob mismatch");
}
function verifyStopped(root){
  const source=originalSource();
  const tools=path.join(root,"tools");
  const st=fs.lstatSync(tools);
  assert.ok(st.isDirectory()&&!st.isSymbolicLink(),"stopped tools directory missing");
  const dir=fs.readdirSync(tools);
  assert.ok(dir.includes(EXISTING_POSITIVE),"expected existing positive tool missing");
  assert.ok(dir.includes(SAGA),"reviewed saga tool missing from stopped image");
  assert.equal(dir.includes(BROADCASTER),false,"unreviewed broadcaster accidentally included");
  assert.equal(dir.includes(CUSTODIAN),false,"unreviewed custodian accidentally included");
  const compiled=regularFile(path.join(root,COMPILED_IMPORTER));
  assert.equal(compiled.length,COMPILED_IMPORTER_BYTES,"compiled importer byte count changed");
  assert.equal(sha256(compiled),COMPILED_IMPORTER_SHA256,"compiled importer SHA-256 changed");
  const compiledText=compiled.toString("utf8");
  assert.match(compiledText,/new Function\(\s*["']specifier["']\s*,\s*["']return import\(specifier\)["']\s*\)/u,
    "compiled generated saga importer missing");
  assert.ok(compiledText.includes("../../tools/"+SAGA),"compiled tool import missing");
  const staged=regularFile(path.join(tools,SAGA));
  matchStagedSaga(staged,source);
  return Object.freeze({
    marker:"VOID_BUY_VOID_SAGA_STOPPED_IMAGE_POSITIVE_PACKAGE_CANDIDATE_V1",
    dockerfile_git_blob_sha1:DOCKERFILE_GIT_BLOB,
    saga_source_git_blob_sha1:SOURCE_SAGA_GIT_BLOB,
    saga_source_bytes:SAGA_SIZE,
    saga_source_sha256:sha256(source),
    compiled_importer_path:"/app/"+COMPILED_IMPORTER,
    compiled_importer_sha256:COMPILED_IMPORTER_SHA256,
    compiled_importer_bytes:COMPILED_IMPORTER_BYTES,
    stopped_image_saga_path:"/app/tools/"+SAGA,
    stopped_image_saga_byte_identity_verified:true,
    unreviewed_broadcaster_and_custodian_absent:true,
    executed_saga_loader_qualified:false,
    tool_runtime_side_effects_reviewed:false,
    image_generation_accepted:false,
    deployed_artifact_generation_verified:false,
    runtime_mount_authority:false,
    production_source_finality_authority_ready:false,
    presale_activation:false,
    funds_movement:false
  });
}
function selfTest(){
  const original=originalSource();
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"void-positive-saga-package-"));
  try{
    fs.writeFileSync(path.join(tmp,SAGA),original,{mode:0o600});
    matchStagedSaga(regularFile(path.join(tmp,SAGA)),original);
    const substitute=Buffer.from(original);
    substitute[0]^=1;
    fs.writeFileSync(path.join(tmp,SAGA),substitute,{mode:0o600});
    assert.throws(()=>matchStagedSaga(regularFile(path.join(tmp,SAGA)),original),
      /staged saga must be EXACT reviewed source bytes/u);
    fs.rmSync(path.join(tmp,SAGA));
    assert.throws(()=>regularFile(path.join(tmp,SAGA)),/ENOENT/u);
    console.log("VOID_BUY_VOID_SAGA_PACKAGE_EXACT_BYTES_SYNTHETIC_GREEN");
    console.log("reviewed_source_exact_bytes_accepted=true");
    console.log("same_length_substitution_rejected=true");
    console.log("missing_saga_target_rejected=true");
    console.log("real_saga_executed=false");
    console.log("image_generation_accepted=false");
    console.log("production_source_finality_authority_ready=false");
  }finally{fs.rmSync(tmp,{recursive:true,force:true});}
}
const args=process.argv.slice(2);
if(args.length===1&&args[0]==="--source"){
  console.log(JSON.stringify(sourceProbe(),null,2));
}else if(args.length===1&&args[0]==="--self-test"){
  selfTest();
}else if(args.length===2&&args[0]==="--stopped-root"){
  sourceProbe();
  console.log(JSON.stringify(verifyStopped(path.resolve(args[1])),null,2));
}else throw Error("stopped_saga_candidate_only_no_live_execution_authority");
