#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const OLD_PACKAGE="f28c3e9446c7623ef203da36a9642d046e5f34ee";
const OLD_LOCK="b2671f0149f522b2489247016df0a5ec4bb72b8b";
const NEW_PACKAGE="14fbdf5717b07fd4c734f5da7a8e84ed59bee93f";
const NEW_LOCK="15b5c82ea36f13079a2f9e8863722f654eb3f201";
const FROZEN_V5="scripts/prove_buy_void_enforcement_artifact_attestation_v5_candidate.mjs";
const FROZEN_V5_BLOB="70292a0b283d8f06814f153105e27397f924c19d";
const FROZEN_DYNAMIC="scripts/prove_buy_void_enforcement_dynamic_tool_candidates_v1.mjs";
const FROZEN_DYNAMIC_BLOB="368ade74f36acad899420db5cf994363d6dfa04a";
const E2_QUALIFIER="tools/void-buy-void-epoch2-postgres-source-qualification-v1.mjs";
const E2_QUALIFIER_BLOB="834f17d99c0351c0f2b10fb024f3ee43afae8a42";
const HISTORICAL_HEAD="22a30e3ffad6047a472488104c769140bd050878";
const WORKFLOW=".github/workflows/buy-void-enforcement-artifact-attestation-v5-candidate.yml";
const THIS_PROOF="scripts/prove_buy_void_enforcement_v5_audited_package_refusal_v1.mjs";

function git(args){
  const r=spawnSync("/usr/bin/git",[
    "--no-replace-objects","--no-lazy-fetch",
    "-c","core.fsmonitor=false",
    "-c","core.hooksPath=/dev/null",
    "-c","core.attributesFile=/dev/null",
    "-c","submodule.recurse=false",
    "-C",ROOT,...args
  ],{
    env:{
      PATH:"/usr/bin:/bin",LANG:"C",LC_ALL:"C",HOME:"/nonexistent",
      XDG_CONFIG_HOME:"/nonexistent",GIT_CONFIG_GLOBAL:"/dev/null",
      GIT_CONFIG_SYSTEM:"/dev/null",GIT_CONFIG_NOSYSTEM:"1",
      GIT_ATTR_NOSYSTEM:"1",GIT_OPTIONAL_LOCKS:"0",
      GIT_TERMINAL_PROMPT:"0",GIT_NO_REPLACE_OBJECTS:"1",
      GIT_NO_LAZY_FETCH:"1",GIT_GRAFT_FILE:"/dev/null",GIT_ALLOW_PROTOCOL:"file"
    },
    encoding:"utf8",stdio:["ignore","pipe","pipe"],timeout:30000,
    maxBuffer:16*1024*1024
  });
  assert.equal(r.error,undefined);
  assert.equal(r.status,0,String(r.stderr||""));
  return String(r.stdout||"").trim();
}
function blob(bytes){
  return crypto.createHash("sha1")
    .update(Buffer.from("blob "+bytes.length+"\0","utf8"))
    .update(bytes).digest("hex");
}
function worktreeBlob(rel){
  return blob(fs.readFileSync(path.join(ROOT,rel)));
}

const head=git(["rev-parse","HEAD"]);
assert.match(head,/^[0-9a-f]{40}$/u);
assert.equal(git(["status","--porcelain=v1","--untracked-files=all"]),"");

for(const [rel,want] of [
  ["package.json",NEW_PACKAGE],
  ["package-lock.json",NEW_LOCK],
  [FROZEN_V5,FROZEN_V5_BLOB],
  [FROZEN_DYNAMIC,FROZEN_DYNAMIC_BLOB],
  [E2_QUALIFIER,E2_QUALIFIER_BLOB],
]){
  assert.equal(git(["rev-parse","HEAD:"+rel]),want,"commit drift: "+rel);
  assert.equal(worktreeBlob(rel),want,"worktree drift: "+rel);
}

const frozenSource=fs.readFileSync(path.join(ROOT,FROZEN_V5),"utf8");
assert.ok(
  frozenSource.includes('const EXPECTED_PACKAGE_LOCK_BLOB = "'+OLD_LOCK+'";'),
  "frozen V5 package-lock identity changed",
);
assert.ok(
  frozenSource.includes('const SOURCE_HEAD = "'+HISTORICAL_HEAD+'";'),
  "frozen V5 source parent changed",
);
const frozenDynamicSource=fs.readFileSync(path.join(ROOT,FROZEN_DYNAMIC),"utf8");
assert.ok(
  frozenDynamicSource.includes('const PACKAGE_LOCK_BLOB = "'+OLD_LOCK+'";'),
  "frozen dynamic-tool package-lock identity changed",
);

const derivation=spawnSync(process.execPath,[path.join(ROOT,FROZEN_V5),"--derive"],{
  cwd:ROOT,encoding:"utf8",stdio:["ignore","pipe","pipe"],timeout:30000,
});
assert.equal(derivation.error,undefined);
assert.notEqual(
  derivation.status,0,
  "frozen V5 derivation unexpectedly accepted audited package generation",
);

const dynamicDerivation=spawnSync(
  process.execPath,
  [path.join(ROOT,FROZEN_DYNAMIC),"--derive"],
  {cwd:ROOT,encoding:"utf8",stdio:["ignore","pipe","pipe"],timeout:30000},
);
assert.equal(dynamicDerivation.error,undefined);
assert.notEqual(
  dynamicDerivation.status,0,
  "frozen dynamic-tool derivation unexpectedly accepted audited package generation",
);

const qualifier=spawnSync(process.execPath,[path.join(ROOT,E2_QUALIFIER)],{
  cwd:ROOT,encoding:"utf8",stdio:["ignore","pipe","pipe"],timeout:30000,
});
assert.equal(qualifier.error,undefined);
assert.equal(qualifier.status,0,String(qualifier.stderr||""));
for(const marker of [
  "status=EPOCH2_SOURCE_TUPLE_REVIEWABLE_CREDENTIAL_AND_ACTIVATION_HOLD",
  "source_qualification_complete=true",
  "historical_v1_authority_inherited=false",
  "signer_control_or_systemd_credential_verified=false",
  "production_payment_activation=false",
]){
  assert.ok(String(qualifier.stdout||"").includes(marker),marker);
}

const workflow=fs.readFileSync(path.join(ROOT,WORKFLOW),"utf8");
for(const required of [OLD_PACKAGE,OLD_LOCK,NEW_PACKAGE,NEW_LOCK,THIS_PROOF]){
  assert.ok(workflow.includes(required),"workflow generation dispatch missing: "+required);
}
assert.ok(
  workflow.split(THIS_PROOF).length-1 >= 2,
  "audited refusal proof must be trigger-covered and executed",
);

const refusal={
  schema:"void_buy_void_enforcement_v5_historical_refusal_epoch2_v1",
  version:1,
  historical_source_head:HISTORICAL_HEAD,
  historical_v5_source_unchanged:false,
  historical_v5_candidate_derived:false,
  historical_v1_authority_inherited:false,
  current_epoch2_source_tuple_qualified:true,
  audited_package_generation_refusal:true,
  historical_package_json_git_blob_sha1:OLD_PACKAGE,
  historical_package_lock_git_blob_sha1:OLD_LOCK,
  audited_package_json_git_blob_sha1:NEW_PACKAGE,
  audited_package_lock_git_blob_sha1:NEW_LOCK,
  frozen_v5_candidate_script_git_blob_sha1:FROZEN_V5_BLOB,
  frozen_dynamic_tool_script_git_blob_sha1:FROZEN_DYNAMIC_BLOB,
  historical_dynamic_tool_candidate_derived:false,
  historical_dynamic_tool_candidate_refused_audited_package_generation:true,
  dynamic_tool_execution_identity_verified:false,
  dynamic_tool_transitive_closure_verified:false,
  complete_executable_closure_verified:false,
  candidate_identity_accepted:false,
  deployed_artifact_generation_verified:false,
  production_source_finality_authority_ready:false,
  signer_control_or_systemd_credential_verified:false,
  production_payment_activation:false,
  presale_activation:false,
  funds_movement:false
};
process.stdout.write(JSON.stringify(refusal,null,2)+"\n");
