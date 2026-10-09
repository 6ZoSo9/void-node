#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PARENT = "4b7466b9f34bac8f9766f708ddf8e24c2bf50331";
const OLD_DOCKER_BLOB = "15375dfb34bc457ac57865ae07642b5602f9e958";
const NEW_DOCKER_BLOB = "2acd9bcf0416eeb0f9fd72c1a556696863ff1607";
const OLD_INSTALL = "RUN npm ci || yarn || pnpm i";
const NEW_INSTALL = "RUN npm ci";
const REQUIRED_SAGA_COPY =
  "COPY --from=build /app/tools/buy-void-crash-consistent-fulfillment-saga-v1.mjs ./tools/";

function gitBlob(bytes) {
  return crypto.createHash("sha1")
    .update(Buffer.from("blob " + bytes.length + "\0", "utf8"))
    .update(bytes)
    .digest("hex");
}
function validateDockerfile(content) {
  assert.equal(typeof content, "string", "Dockerfile must be UTF-8");
  const lines = content.split("\n");
  assert.ok(lines.length>20 && lines.at(-1)==="", "Dockerfile trailing LF required");
  const runLines = lines.filter(x => /^RUN[ \t]/u.test(x));
  assert.deepEqual(runLines, ["RUN npm ci", "RUN npm run build"],
    "only the reviewed npm CI install and build RUN directives are allowed");
  assert.equal(content.includes(OLD_INSTALL), false, "fallback install is forbidden");
  assert.equal(content.includes(REQUIRED_SAGA_COPY), true,
    "reviewed fulfillment saga copy must be preserved");
  const lockCopy = lines.findIndex(x =>
    x.startsWith("COPY package.json package-lock.json"));
  const install = lines.findIndex(x => x === NEW_INSTALL);
  const sourceCopy = lines.findIndex(x => x === "COPY . .");
  const build = lines.findIndex(x => x === "RUN npm run build");
  const runtimeStage = lines.findIndex(x => x === "FROM node:24-alpine");
  const sagaCopy = lines.findIndex(x => x === REQUIRED_SAGA_COPY);
  assert.ok(lockCopy>0 && install>lockCopy && sourceCopy>install &&
    build>sourceCopy && runtimeStage>build && sagaCopy>runtimeStage,
    "lockfile, npm CI, build, runtime stage and saga packaging order invalid");
  assert.equal(lines.filter(x => x === NEW_INSTALL).length, 1,
    "exactly one fail-closed npm CI stage is required");
}
function syntheticRejections() {
  const original=fs.readFileSync(path.join(ROOT,"Dockerfile"),"utf8");
  validateDockerfile(original);
  const edits=[
    [NEW_INSTALL, OLD_INSTALL],
    [NEW_INSTALL, "RUN npm ci || true"],
    [NEW_INSTALL, "RUN npm ci || npm install"],
    [NEW_INSTALL, "RUN npm ci ; yarn install"],
    [NEW_INSTALL, "RUN npm ci && pnpm i"],
    [NEW_INSTALL, "RUN npm install --ignore-scripts"],
    [NEW_INSTALL, "RUN yarn install"],
    [NEW_INSTALL, "RUN npm ci\nRUN pnpm install"],
    [REQUIRED_SAGA_COPY, "# saga omitted"],
  ];
  for(const [a,b] of edits) {
    assert.equal(original.split(a).length,2,"synthetic edit marker absent");
    const mutant=original.replace(a,b);
    assert.throws(()=>validateDockerfile(mutant),undefined,
      "unsafe fallback or missing saga was not held");
  }
  console.log("VOID_BUY_VOID_DOCKER_NPM_CI_ONLY_V1_SYNTHETIC_GREEN");
  console.log("unsafe_package_manager_fallbacks_rejected=8");
  console.log("missing_saga_copy_rejected=true");
  console.log("reviewed_npm_install_path_preserved=true");
  console.log("production_image_deployed=false");
  console.log("payment_or_funds_action=false");
}
function verify() {
  const src=fs.readFileSync(path.join(ROOT,"Dockerfile"));
  assert.equal(gitBlob(src),NEW_DOCKER_BLOB,
    "reviewed Dockerfile child git blob drift");
  validateDockerfile(src.toString("utf8"));
  execFileSync("git",["merge-base","--is-ancestor",PARENT,"HEAD"],{
    cwd:ROOT,stdio:"ignore",timeout:10000
  });
  const old=execFileSync("git",["show",PARENT+":Dockerfile"],{
    cwd:ROOT,stdio:["ignore","pipe","pipe"],maxBuffer:1024*1024,timeout:10000
  });
  assert.equal(gitBlob(old),OLD_DOCKER_BLOB,
    "historical parent Dockerfile identity drift");
  const before=old.toString("utf8");
  assert.equal(before.split(OLD_INSTALL).length,2,
    "expected one historical multi-manager installation");
  const expected=before.replace(OLD_INSTALL,NEW_INSTALL);
  assert.equal(src.equals(Buffer.from(expected,"utf8")),true,
    "unexpected Dockerfile edit beyond npm CI fallback removal");
  console.log("VOID_BUY_VOID_DOCKER_NPM_CI_ONLY_V1_REVIEW_GREEN");
  console.log("parent="+PARENT);
  console.log("historical_docker_blob="+OLD_DOCKER_BLOB);
  console.log("candidate_docker_blob="+NEW_DOCKER_BLOB);
  console.log("fallback_package_managers_removed=true");
  console.log("npm_ci_success_path_preserved=true");
  console.log("runtime_saga_copy_preserved=true");
  console.log("installed_or_running_production_runtime=false");
  console.log("deployed_artifact_generation_verified=false");
  console.log("production_source_finality_authority_ready=false");
  console.log("presale_activation=false");
  console.log("funds_movement=false");
}
const args=process.argv.slice(2);
if(args.length===1&&args[0]==="--self-test") syntheticRejections();
else if(args.length===0)verify();
else throw Error("invalid_docker_npm_ci_review_arguments");
