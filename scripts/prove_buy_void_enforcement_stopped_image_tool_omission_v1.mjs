#!/usr/bin/env node
// Source-only and STOPPED-container extracted file census. NO runtime start.
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const DOCKERFILE_BLOB="e8fec19ebe9b2cbad470983b79f824926aa4bec7";
const SOURCE_MODULE="src/economic/buy_void_erc20_execution_composition_v1.ts";
const SOURCE_MODULE_BLOB="acf2f88b513bbe50e192531f9fc8d261b69bd0f1";
const COMPILED_REL="dist/economic/buy_void_erc20_execution_composition_v1.js";
const COMPILED_SHA256="b243a1611bceff0a7d758aeaaebf4e74c2bad6b762595ff0e13804e11b5c2af1";
const COMPILED_BYTES=86455;
const SAGA_TARGET="buy-void-crash-consistent-fulfillment-saga-v1.mjs";
const DYNAMIC_TARGETS=Object.freeze([
  SAGA_TARGET,
  "buy-void-prepared-transaction-broadcaster-service-v1.mjs",
  "buy-void-prepared-transaction-custodian-service-v1.mjs"
]);
const POSITIVE_TOOL="void-wc-void-coupled-launch-readiness-v1.mjs";
const sha256=bytes=>crypto.createHash("sha256").update(bytes).digest("hex");
const gitBlob=bytes=>crypto.createHash("sha1")
  .update(Buffer.from("blob "+bytes.length+"\0")).update(bytes).digest("hex");

function sourceProbe(root=ROOT){
  const docker=fs.readFileSync(path.join(root,"Dockerfile"));
  assert.equal(gitBlob(docker),DOCKERFILE_BLOB,"Dockerfile generation changed; new review required");
  const source=fs.readFileSync(path.join(root,SOURCE_MODULE));
  assert.equal(gitBlob(source),SOURCE_MODULE_BLOB,"compiled import source changed");
  const sourceText=source.toString("utf8");
  assert.match(sourceText,/new Function\(\s*["']specifier["']\s*,\s*["']return import\(specifier\)["']\s*\)/u);
  assert.ok(sourceText.includes("../../tools/"+SAGA_TARGET),"reachable saga specifier missing");
  const d=docker.toString("utf8");
  const stages=d.match(/^FROM\s+/gm)||[];
  assert.equal(stages.length,2,"unexpected Docker stages");
  const final=d.slice(d.indexOf("\nFROM node:24-alpine\n")+1);
  assert.ok(final.startsWith("FROM node:24-alpine\n"),"unrecognized final image stage");
  assert.ok(final.includes("COPY --from=build /app/dist ./dist"),"compiled importer may not be copied");
  assert.ok(final.includes("/app/tools/"+POSITIVE_TOOL),"positive control tool not copied");
  for(const target of DYNAMIC_TARGETS){
    assert.ok(!final.includes("/app/tools/"+target),
      "candidate copied by final image: source omission no longer valid:"+target);
  }
  assert.ok(!/COPY\s+--from=build\s+\/app\/tools\s+\.\/tools/u.test(final),
    "entire tools directory may be copied; source-only omission unqualified");
  assert.ok(!/COPY\s+\.\s+\./u.test(final),"broad final stage copy invalidates omission");
  return {
    marker:"VOID_BUY_VOID_DYNAMIC_SAGA_STOPPED_IMAGE_OMISSION_V1",
    dockerfile_git_blob_sha1:DOCKERFILE_BLOB,
    source_module_git_blob_sha1:SOURCE_MODULE_BLOB,
    image_stop_state_verified:false,
    compiled_saga_importer_present_in_image:false,
    saga_target_missing_in_image:false,
    all_three_tool_targets_missing_in_image:false,
    package_generation_accepted:false,
    deployed_artifact_generation_verified:false,
    production_source_finality_authority_ready:false
  };
}

function checkToolAbsence(root){
  const tools=path.join(root,"tools");
  const st=fs.lstatSync(tools);
  assert.ok(st.isDirectory()&&!st.isSymbolicLink(),"extracted tools not a normal directory");
  const contents=fs.readdirSync(tools);
  assert.ok(contents.includes(POSITIVE_TOOL),"positive copied tool control missing");
  const absent=[];
  for(const target of DYNAMIC_TARGETS){
    assert.equal(contents.includes(target),false,
      "previously missing source dynamic tool now present; review new package: "+target);
    assert.equal(fs.existsSync(path.join(tools,target)),false,
      "unexpected packaged dynamic target: "+target);
    absent.push(target);
  }
  return absent;
}
function imageProbe(root){
  const compiledPath=path.join(root,COMPILED_REL);
  const st=fs.lstatSync(compiledPath);
  assert.ok(st.isFile()&&!st.isSymbolicLink(),"compiled module missing/not normal file");
  assert.equal(st.size,COMPILED_BYTES,"compiled dynamic importer size drift");
  const compiled=fs.readFileSync(compiledPath);
  assert.equal(sha256(compiled),COMPILED_SHA256,"compiled importer SHA-256 drift");
  const text=compiled.toString("utf8");
  assert.match(text,/new Function\(\s*["']specifier["']\s*,\s*["']return import\(specifier\)["']\s*\)/u,
    "compiled generated-Function import missing");
  assert.ok(text.includes("../../tools/"+SAGA_TARGET),"compiled saga target missing");
  const absent=checkToolAbsence(root);
  assert.equal(absent.length,3);
  return {
    marker:"VOID_BUY_VOID_DYNAMIC_SAGA_STOPPED_IMAGE_OMISSION_V1",
    dockerfile_git_blob_sha1:DOCKERFILE_BLOB,
    compiled_importer_path:"/app/"+COMPILED_REL,
    compiled_importer_sha256:COMPILED_SHA256,
    compiled_importer_bytes:COMPILED_BYTES,
    source_literal_saga_target:"../../tools/"+SAGA_TARGET,
    missing_final_tool_paths:absent.map(p=>"/app/tools/"+p),
    verified_candidate_source_omission:true,
    stopped_image_compiled_importer_verified:true,
    stopped_image_dynamic_tool_absence_verified:true,
    executed_saga_loader_qualified:false,
    package_generation_accepted:false,
    deployed_artifact_generation_verified:false,
    production_source_finality_authority_ready:false,
    presale_activation:false,
    funds_movement:false
  };
}
function synthetic(){
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"void-saga-package-negative-"));
  try{
    fs.mkdirSync(path.join(tmp,"tools"));
    fs.writeFileSync(path.join(tmp,"tools",POSITIVE_TOOL),"control\n");
    assert.equal(checkToolAbsence(tmp).length,3);
    fs.writeFileSync(path.join(tmp,"tools",SAGA_TARGET),"not reviewed");
    assert.throws(()=>checkToolAbsence(tmp),/previously missing source dynamic tool now present/u);
    fs.unlinkSync(path.join(tmp,"tools",SAGA_TARGET));
    fs.unlinkSync(path.join(tmp,"tools",POSITIVE_TOOL));
    assert.throws(()=>checkToolAbsence(tmp),/positive copied tool control missing/u);
    console.log("VOID_BUY_VOID_DYNAMIC_SAGA_MISSING_PACKAGE_SYNTHETIC_GREEN");
    console.log("packaged_tool_presence_cannot_pass_as_missing=true");
    console.log("missing_positive_control_rejected=true");
    console.log("production_authority=false");
  }finally{fs.rmSync(tmp,{recursive:true,force:true});}
}
const args=process.argv.slice(2);
if(args.length===1&&args[0]==="--source"){
  const report=sourceProbe();
  console.log(JSON.stringify(report,null,2));
}else if(args.length===1&&args[0]==="--self-test"){
  synthetic();
}else if(args.length===2&&args[0]==="--stopped-extraction"){
  sourceProbe();
  const result=imageProbe(path.resolve(args[1]));
  console.log(JSON.stringify(result,null,2));
}else throw Error("stopped_image_source_census_only_no_runtime_authority");
