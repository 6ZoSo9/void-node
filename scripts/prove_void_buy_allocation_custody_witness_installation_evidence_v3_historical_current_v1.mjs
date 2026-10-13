#!/usr/bin/env node
// Preserve the frozen Nimo V3 installation-evidence contract while classifying
// the audited current runtime bundle as a distinct, still-unqualified generation.
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_CANDIDATE_MANIFEST_ID_V3,
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_FILES_V3,
} from "../dist/economic/buy_void_allocation_custody_witness_runtime_bundle_qualification_v3.js";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const WORKFLOW=
  ".github/workflows/buy-void-allocation-custody-witness-installation-evidence-v3.yml";
const REQUIRED_WORKFLOW_TRIGGER_PATHS=Object.freeze([
  "scripts/prove_buy_void_nimo_v3_historical_v4_current_v1.mjs",
  "scripts/prove_buy_void_nimo_combined_v3_unaccepted_source_v1.mjs",
  "scripts/prove_buy_void_nimo_v4_inactive_bundle_v1.py",
  "src/economic/buy_void_allocation_reservation_ledger_v1.ts",
  "src/economic/buy_void_verified_allocation_replay_binding_v1.ts",
  "src/economic/buy_void_filesystem_bakery_lock_v1.ts",
  "tools/void-buy-allocation-custody-witness-forced-command-v2.mjs",
  "src/economic/buy_void_allocation_custody_external_witness_v1.ts",
  "src/economic/buy_void_allocation_custody_witness_transport_v1.ts",
  "src/economic/buy_void_allocation_reservation_high_water_v1.ts",
  "src/economic/buy_void_auto_fulfillment_v1.ts",
  "src/economic/buy_void_crash_consistent_saga_server_policy_v1.ts",
  "tsconfig.json",
  "tsconfig.build.json",
  "scripts/copy_void_runtime_js_v1.mjs",
  "scripts/retire_saveblock_periodic_rewriters_v1.mjs",
  "package.json",
  "package-lock.json",
  "src/economic/buy_void_allocation_custody_witness_runtime_bundle_qualification_v3.ts",
  "scripts/prove_void_buy_allocation_custody_witness_installation_evidence_v3_historical_current_v1.mjs",
  "scripts/prove_void_buy_allocation_custody_witness_installation_evidence_v3.mjs",
  "tools/void-buy-allocation-custody-witness-installation-evidence-v3.mjs",
]);

const CURRENT_CLASSIFIER="scripts/prove_buy_void_nimo_v3_historical_v4_current_v1.mjs";
const FROZEN_INSTALLATION_PROOF=
  "scripts/prove_void_buy_allocation_custody_witness_installation_evidence_v3.mjs";
const RUNTIME_QUALIFICATION_SOURCE=
  "src/economic/buy_void_allocation_custody_witness_runtime_bundle_qualification_v3.ts";
const CURRENT_LEDGER_RUNTIME=
  "dist/economic/buy_void_allocation_reservation_ledger_v1.js";
const HISTORICAL_LEDGER_SHA256=
  "sha256:97a1cb675fec65558aa823b94f049815345fbaed4ac69c9dfae4e1416950cec0";
const CURRENT_LEDGER_SHA256=
  "sha256:51de81388631ecef2a8c3feea68960040ccbda75fd29ada171cb9c9c7b53188a";
const EXPECTED=Object.freeze({
  current_classifier_blob:"c908941795d6813aeafb5ec87ab8faa0de20b21e",
  frozen_installation_proof_blob:"aacfdd851422c4200558f48bb1ac26e00b0e4ed0",
  runtime_qualification_source_blob:"453550bcab9c5caf192c6d9d813bce9ce4433b0a",
});

function gitBlob(bytes){
  return crypto.createHash("sha1")
    .update(Buffer.from("blob "+bytes.length+"\0","utf8"))
    .update(bytes).digest("hex");
}
function sha256Id(bytes){
  return "sha256:"+crypto.createHash("sha256").update(bytes).digest("hex");
}
function read(relative,maxBytes=4*1024*1024){
  const full=path.join(ROOT,...relative.split("/"));
  const before=fs.lstatSync(full);
  assert.ok(
    before.isFile()&&!before.isSymbolicLink()&&before.nlink===1&&
    before.size>0&&before.size<=maxBytes,
    "current runtime file metadata invalid: "+relative,
  );
  const bytes=fs.readFileSync(full);
  const after=fs.lstatSync(full);
  assert.equal(after.dev,before.dev,"runtime device drift: "+relative);
  assert.equal(after.ino,before.ino,"runtime inode drift: "+relative);
  assert.equal(after.size,before.size,"runtime size drift: "+relative);
  assert.equal(bytes.length,before.size,"runtime read length drift: "+relative);
  return bytes;
}
function sourceBlob(relative){
  return gitBlob(read(relative,16*1024*1024));
}
function run(command,args){
  const result=spawnSync(command,args,{
    cwd:ROOT,
    encoding:"utf8",
    stdio:["ignore","pipe","pipe"],
    timeout:120_000,
    maxBuffer:32*1024*1024,
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
  });
  if(result.error)throw result.error;
  return result;
}

const workflowText=fs.readFileSync(path.join(ROOT,WORKFLOW),"utf8");
function workflowSection(startMarker,endMarker){
  const start=workflowText.indexOf(startMarker);
  const end=workflowText.indexOf(endMarker,start+startMarker.length);
  assert.ok(start>=0&&end>start,"workflow trigger section missing: "+startMarker);
  return workflowText.slice(start,end);
}
const pushSection=workflowSection("  push:\n","  pull_request:\n");
const pullRequestSection=workflowSection("  pull_request:\n","  workflow_dispatch:\n");
assert.equal(
  pushSection.split("      - main").length-1,
  1,
  "installation-evidence workflow must requalify relevant changes on main",
);
for(const relative of REQUIRED_WORKFLOW_TRIGGER_PATHS){
  const exactLine=`      - "${relative}"`;
  assert.equal(
    pushSection.split(exactLine).length-1,
    1,
    "workflow push trigger missing or duplicated: "+relative,
  );
  assert.equal(
    pullRequestSection.split(exactLine).length-1,
    1,
    "workflow pull_request trigger missing or duplicated: "+relative,
  );
}

assert.equal(sourceBlob(CURRENT_CLASSIFIER),EXPECTED.current_classifier_blob);
assert.equal(sourceBlob(FROZEN_INSTALLATION_PROOF),EXPECTED.frozen_installation_proof_blob);
assert.equal(
  sourceBlob(RUNTIME_QUALIFICATION_SOURCE),
  EXPECTED.runtime_qualification_source_blob,
);

const current=run(process.execPath,[CURRENT_CLASSIFIER]);
assert.equal(current.status,0,current.stderr||current.stdout);
const currentReceipt=JSON.parse(String(current.stdout||"").trim());
assert.equal(
  currentReceipt.schema,
  "void_buy_void_nimo_v3_historical_v4_current_v1",
);
assert.equal(currentReceipt.mode,"audited_current_successor_required");
assert.equal(currentReceipt.current_nimo_bundle_generation_qualified,false);
assert.equal(currentReceipt.current_nimo_bundle_successor_required,true);
assert.equal(currentReceipt.live_nimo_installed,false);
assert.equal(currentReceipt.production_gate_ready,false);

const frozen=run(process.execPath,[FROZEN_INSTALLATION_PROOF]);
assert.notEqual(
  frozen.status,
  0,
  "frozen V3 installation evidence unexpectedly accepted current runtime",
);
const frozenOutput=String(frozen.stdout||"")+"\n"+String(frozen.stderr||"");
assert.match(
  frozenOutput,
  /reviewed runtime bundle fixture hash changed: dist\/economic\/buy_void_allocation_reservation_ledger_v1\.js/u,
  "frozen V3 installation refusal class drift",
);
assert.equal(
  frozenOutput.includes(CURRENT_LEDGER_SHA256),
  true,
  "current ledger runtime digest absent from V3 refusal",
);
assert.equal(
  frozenOutput.includes(HISTORICAL_LEDGER_SHA256),
  true,
  "historical ledger runtime digest absent from V3 refusal",
);

assert.equal(
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_FILES_V3.length,
  8,
);
const runtimeFiles=
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_FILES_V3.map(
    (file)=>{
      const bytes=read(file.source_path);
      const currentSha=sha256Id(bytes);
      return Object.freeze({
        source_path:file.source_path,
        installed_path:file.installed_path,
        historical_v3_sha256:file.sha256,
        current_candidate_sha256:currentSha,
        matches_historical_v3:currentSha===file.sha256,
      });
    },
  );
const ledger=runtimeFiles.find((row)=>row.source_path===CURRENT_LEDGER_RUNTIME);
assert.ok(ledger,"current ledger runtime missing");
assert.equal(ledger.historical_v3_sha256,HISTORICAL_LEDGER_SHA256);
assert.equal(ledger.current_candidate_sha256,CURRENT_LEDGER_SHA256);
assert.equal(ledger.matches_historical_v3,false);
assert.ok(
  runtimeFiles.some((row)=>row.matches_historical_v3===false),
  "current runtime unexpectedly equals historical V3 bundle",
);

const gitHead=run("/usr/bin/git",["rev-parse","HEAD"]);
assert.equal(gitHead.status,0,gitHead.stderr);
const repositoryHead=String(gitHead.stdout||"").trim();
assert.match(repositoryHead,/^[0-9a-f]{40}$/u);

const normalizedCurrentClassifier=String(current.stdout||"").trim()+"\n";
const receipt=Object.freeze({
  schema:"void_buy_void_nimo_v3_installation_historical_current_v1",
  version:1,
  mode:"audited_current_successor_required",
  repository:"6ZoSo9/void-node",
  repository_head:repositoryHead,
  historical_v3_runtime_manifest_id:
    VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_CANDIDATE_MANIFEST_ID_V3,
  frozen_v3_installation_proof_git_blob_sha1:
    EXPECTED.frozen_installation_proof_blob,
  current_generation_classifier_git_blob_sha1:
    EXPECTED.current_classifier_blob,
  current_generation_classifier_receipt_sha256:
    sha256Id(Buffer.from(normalizedCurrentClassifier,"utf8")),
  historical_v3_installation_proof_refused_current_runtime:true,
  historical_v3_refusal_runtime_path:CURRENT_LEDGER_RUNTIME,
  historical_v3_ledger_sha256:HISTORICAL_LEDGER_SHA256,
  current_ledger_candidate_sha256:CURRENT_LEDGER_SHA256,
  current_runtime_candidate_files:Object.freeze(runtimeFiles),
  current_nimo_bundle_generation_qualified:false,
  current_nimo_installation_evidence_generation_qualified:false,
  workflow_trigger_closure_verified:true,
  main_push_requalification_enabled:true,
  current_nimo_installation_successor_required:true,
  live_nimo_installed:false,
  verified_payment_to_allocation_mounted:false,
  custody_reserve_or_recover_enabled:false,
  runtime_integration:false,
  production_gate_ready:false,
  payment_acceptance:false,
  presale_activation:false,
  funds_moved:false,
});
process.stdout.write(JSON.stringify(receipt)+"\n");
