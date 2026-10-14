#!/usr/bin/env node
// Current-generation Nimo witness classification for the audited dependency
// stack. Frozen V3 and V4 remain historical evidence; neither is repinned.
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const V3="scripts/prove_buy_void_nimo_combined_v3_unaccepted_source_v1.mjs";
const V4="scripts/prove_buy_void_nimo_v4_inactive_bundle_v1.py";
const LEDGER="src/economic/buy_void_allocation_reservation_ledger_v1.ts";
const REPLAY="src/economic/buy_void_verified_allocation_replay_binding_v1.ts";
const BAKERY="src/economic/buy_void_filesystem_bakery_lock_v1.ts";
const DIST_BAKERY="dist/economic/buy_void_filesystem_bakery_lock_v1.js";
const PACKAGE="package.json";
const LOCK="package-lock.json";

const EXPECTED=Object.freeze({
  v3_blob:"56e581b15e133f751070df1d5cf432ae4568cce8",
  v4_blob:"df15064519fcc9be75be8014c292ccc83eac6544",
  ledger_blob:"8d84955e1e093a5c5af63241e62b8722fadd2f29",
  replay_blob:"b451bcd895986dadaf6e53954671062068316ccf",
  bakery_blob:"9bd47abb857368d928c0ca289766cdf3571629ba",
  package_blob:"14fbdf5717b07fd4c734f5da7a8e84ed59bee93f",
  lock_blob:"15b5c82ea36f13079a2f9e8863722f654eb3f201",
  historical_v3_ledger_blob:"66617a89d5ad9f81b5a21d98cca55fcda6902a80",
  historical_v4_bakery_sha256:
    "7c7a6b92c1a88b14d325d331700a2bd19a0068630ae0094c65b2dcc6a25a9994",
  historical_v4_bakery_bytes:18018,
});

function gitBlob(bytes){
  return crypto.createHash("sha1")
    .update(Buffer.from("blob "+bytes.length+"\0","utf8"))
    .update(bytes).digest("hex");
}
function sha256(bytes){
  return crypto.createHash("sha256").update(bytes).digest("hex");
}
function sourceBlob(relative){
  const full=path.join(ROOT,...relative.split("/"));
  const st=fs.lstatSync(full);
  assert.ok(st.isFile()&&!st.isSymbolicLink()&&st.nlink===1,
    "source metadata invalid: "+relative);
  const bytes=fs.readFileSync(full);
  const after=fs.lstatSync(full);
  assert.equal(after.dev,st.dev,"source device drift: "+relative);
  assert.equal(after.ino,st.ino,"source inode drift: "+relative);
  assert.equal(after.size,st.size,"source size drift: "+relative);
  return gitBlob(bytes);
}
function run(command,args,{maxBuffer=16*1024*1024}={}){
  const result=spawnSync(command,args,{
    cwd:ROOT,encoding:"utf8",stdio:["ignore","pipe","pipe"],
    timeout:120_000,maxBuffer,
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

for(const [relative,expected] of [
  [V3,EXPECTED.v3_blob],
  [V4,EXPECTED.v4_blob],
  [LEDGER,EXPECTED.ledger_blob],
  [REPLAY,EXPECTED.replay_blob],
  [BAKERY,EXPECTED.bakery_blob],
  [PACKAGE,EXPECTED.package_blob],
  [LOCK,EXPECTED.lock_blob],
]){
  assert.equal(sourceBlob(relative),expected,"current source blob drift: "+relative);
}

const frozenV3=run(process.execPath,[V3,"--prove"],{maxBuffer:8*1024*1024});
assert.notEqual(frozenV3.status,0,"frozen V3 unexpectedly accepted current source");
const v3Output=String(frozenV3.stdout||"")+"\n"+String(frozenV3.stderr||"");
assert.match(
  v3Output,
  /source\/build input changed: src\/economic\/buy_void_allocation_reservation_ledger_v1\.ts/u,
  "frozen V3 refusal reason drift",
);
assert.match(v3Output,new RegExp(EXPECTED.ledger_blob,"u"),
  "current ledger identity absent from V3 refusal");
assert.match(v3Output,new RegExp(EXPECTED.historical_v3_ledger_blob,"u"),
  "historical V3 ledger identity absent from refusal");

const frozenV4=run("/usr/bin/python3",[V4,"--plan"],{maxBuffer:8*1024*1024});
assert.notEqual(frozenV4.status,0,"frozen V4 unexpectedly accepted current source");
const v4Output=String(frozenV4.stdout||"")+"\n"+String(frozenV4.stderr||"");
assert.match(
  v4Output,
  /VOID_NIMO_V4_INACTIVE_BUNDLE_V1_HOLD:nimo_v4_inactive_runtime_bytes_invalid:/u,
  "frozen V4 refusal class drift",
);
assert.match(
  v4Output,
  /dist\/economic\/buy_void_filesystem_bakery_lock_v1\.js/u,
  "frozen V4 did not refuse at current bakery runtime",
);

const distPath=path.join(ROOT,...DIST_BAKERY.split("/"));
const before=fs.lstatSync(distPath);
assert.ok(
  before.isFile()&&!before.isSymbolicLink()&&before.nlink===1&&
  before.size>0&&before.size<=2*1024*1024,
  "current bakery compiled candidate metadata invalid",
);
const distBytes=fs.readFileSync(distPath);
const after=fs.lstatSync(distPath);
assert.equal(after.dev,before.dev,"bakery dist device drift");
assert.equal(after.ino,before.ino,"bakery dist inode drift");
assert.equal(after.size,before.size,"bakery dist size drift");
assert.equal(distBytes.length,before.size,"bakery dist read length drift");
const distSha=sha256(distBytes);
assert.notEqual(
  distSha,
  EXPECTED.historical_v4_bakery_sha256,
  "current bakery unexpectedly equals historical V4 bytes",
);

const receipt={
  schema:"void_buy_void_nimo_v3_historical_v4_current_v1",
  version:1,
  mode:"audited_current_successor_required",
  historical_v3_proof_git_blob_sha1:EXPECTED.v3_blob,
  historical_v3_refused_current_ledger:true,
  historical_v3_ledger_git_blob_sha1:EXPECTED.historical_v3_ledger_blob,
  historical_v4_builder_git_blob_sha1:EXPECTED.v4_blob,
  historical_v4_refused_current_bakery:true,
  historical_v4_bakery_bytes:EXPECTED.historical_v4_bakery_bytes,
  historical_v4_bakery_sha256:EXPECTED.historical_v4_bakery_sha256,
  current_ledger_git_blob_sha1:EXPECTED.ledger_blob,
  current_replay_git_blob_sha1:EXPECTED.replay_blob,
  current_bakery_git_blob_sha1:EXPECTED.bakery_blob,
  current_bakery_compiled_candidate_bytes:distBytes.length,
  current_bakery_compiled_candidate_sha256:distSha,
  audited_package_git_blob_sha1:EXPECTED.package_blob,
  audited_lock_git_blob_sha1:EXPECTED.lock_blob,
  current_nimo_bundle_generation_qualified:false,
  current_nimo_bundle_successor_required:true,
  live_nimo_installed:false,
  verified_payment_to_allocation_mounted:false,
  custody_reserve_or_recover_enabled:false,
  production_gate_ready:false,
  presale_activation:false,
  funds_moved:false,
};
process.stdout.write(JSON.stringify(receipt)+"\n");
