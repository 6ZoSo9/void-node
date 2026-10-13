#!/usr/bin/env node
// Current-generation Nimo witness bundle proof for the audited dependency
// stack. Frozen V3 remains historical evidence and must refuse current source.
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const V3="scripts/prove_buy_void_nimo_combined_v3_unaccepted_source_v1.mjs";
const V4="scripts/prove_buy_void_nimo_v4_inactive_bundle_v1.py";
const V4_STAGE="scripts/void_nimo_v4_private_stage_v1.py";
const LEDGER="src/economic/buy_void_allocation_reservation_ledger_v1.ts";
const REPLAY="src/economic/buy_void_verified_allocation_replay_binding_v1.ts";
const PACKAGE="package.json";
const LOCK="package-lock.json";

const EXPECTED=Object.freeze({
  v3_blob:"56e581b15e133f751070df1d5cf432ae4568cce8",
  v4_blob:"df15064519fcc9be75be8014c292ccc83eac6544",
  v4_stage_blob:"b2bedf3757e42b787869cb905a7df023ef3ce3c1",
  ledger_blob:"8d84955e1e093a5c5af63241e62b8722fadd2f29",
  replay_blob:"b451bcd895986dadaf6e53954671062068316ccf",
  package_blob:"14fbdf5717b07fd4c734f5da7a8e84ed59bee93f",
  lock_blob:"15b5c82ea36f13079a2f9e8863722f654eb3f201",
  v4_candidate_id:"voidwfb4_b5d9516e5fa462ca7ed2333ebe3ef715eaf62ecdd3c0a6b049ecc9eb1e1659c2",
  v4_archive_sha256:"6bb01af17cc87dfb42b63942143458f3e95990d8ae1ef6c1671fc5cd7d4feaf8",
  v4_archive_bytes:266240,
  v4_ledger_sha256:"51de81388631ecef2a8c3feea68960040ccbda75fd29ada171cb9c9c7b53188a",
  v4_ledger_bytes:47309,
});

function gitBlob(bytes){
  return crypto.createHash("sha1")
    .update(Buffer.from("blob "+bytes.length+"\0","utf8"))
    .update(bytes).digest("hex");
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
function run(command,args,{cwd=ROOT,maxBuffer=16*1024*1024}={}){
  const result=spawnSync(command,args,{
    cwd,encoding:"utf8",stdio:["ignore","pipe","pipe"],
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
function mustRun(command,args,options){
  const result=run(command,args,options);
  assert.equal(result.signal,null,"child signaled: "+command);
  assert.equal(result.status,0,
    "child failed: "+command+" "+args.join(" ")+"\n"+
    String(result.stdout||"")+"\n"+String(result.stderr||""));
  return String(result.stdout||"");
}
function parseCanonicalLine(text,label){
  assert.ok(text.endsWith("\n"),label+" newline required");
  assert.equal(text.slice(0,-1).includes("\n"),false,label+" multiline output");
  const value=JSON.parse(text.slice(0,-1));
  assert.ok(value&&typeof value==="object"&&!Array.isArray(value),label+" object");
  return value;
}
function assertV4(value,mode){
  assert.equal(value.marker,"VOID_NIMO_V4_INACTIVE_BUNDLE_V1");
  assert.equal(value.mode,mode);
  assert.equal(value.candidate_manifest_id,EXPECTED.v4_candidate_id);
  assert.equal(value.archive_bytes,EXPECTED.v4_archive_bytes);
  assert.equal(value.archive_sha256,EXPECTED.v4_archive_sha256);
  assert.equal(value.runtime_files_exact,8);
  assert.equal(value.other_v3_runtime_files_exact,7);
  assert.equal(value.ledger_bytes,EXPECTED.v4_ledger_bytes);
  assert.equal(value.ledger_sha256,EXPECTED.v4_ledger_sha256);
  assert.equal(value.installed_nimo_v4_accepted,false);
  assert.equal(value.authenticated_custody_principal_verified,false);
  assert.equal(value.verified_payment_to_allocation_mounted,false);
  assert.equal(value.presale_activation,false);
  assert.equal(value.funds_moved,false);
}
function assertStage(value,mode){
  assert.equal(value.marker,"VOID_NIMO_V4_PRIVATE_STAGE_V1");
  assert.equal(value.mode,mode);
  assert.equal(value.candidate_manifest_id,EXPECTED.v4_candidate_id);
  assert.equal(value.archive_bytes,EXPECTED.v4_archive_bytes);
  assert.equal(value.archive_sha256,EXPECTED.v4_archive_sha256);
  assert.equal(value.runtime_files_exact,8);
  assert.equal(value.installed_nimo_v4_accepted,false);
  assert.equal(value.presale_activation,false);
  assert.equal(value.funds_moved,false);
}

for(const [relative,expected] of [
  [V3,EXPECTED.v3_blob],
  [V4,EXPECTED.v4_blob],
  [V4_STAGE,EXPECTED.v4_stage_blob],
  [LEDGER,EXPECTED.ledger_blob],
  [REPLAY,EXPECTED.replay_blob],
  [PACKAGE,EXPECTED.package_blob],
  [LOCK,EXPECTED.lock_blob],
]){
  assert.equal(sourceBlob(relative),expected,"current source blob drift: "+relative);
}

const frozen=run(process.execPath,[V3,"--prove"],{maxBuffer:8*1024*1024});
assert.notEqual(frozen.status,0,"frozen V3 unexpectedly accepted current source");
const frozenOutput=String(frozen.stdout||"")+"\n"+String(frozen.stderr||"");
assert.match(
  frozenOutput,
  /source\/build input changed: src\/economic\/buy_void_allocation_reservation_ledger_v1\.ts/u,
  "frozen V3 refusal reason drift",
);
assert.match(frozenOutput,/8d84955e1e093a5c5af63241e62b8722fadd2f29/u,
  "current ledger identity absent from V3 refusal");
assert.match(frozenOutput,/66617a89d5ad9f81b5a21d98cca55fcda6902a80/u,
  "historical V3 ledger identity absent from refusal");

const temp=fs.mkdtempSync(path.join(os.tmpdir(),"void-nimo-v4-audited-"));
fs.chmodSync(temp,0o700);
try{
  const archive=path.join(temp,"void-nimo-v4-inactive.tar");
  const plan=parseCanonicalLine(
    mustRun("/usr/bin/python3",[V4,"--plan"]),
    "V4 plan",
  );
  const packaged=parseCanonicalLine(
    mustRun("/usr/bin/python3",[V4,"--package",archive]),
    "V4 package",
  );
  const inspected=parseCanonicalLine(
    mustRun("/usr/bin/python3",[V4,"--inspect-archive",archive]),
    "V4 inspect",
  );
  assertV4(plan,"plan");
  assertV4(packaged,"package");
  assertV4(inspected,"inspect");

  for(const key of [
    "candidate_manifest_id","archive_bytes","archive_sha256",
    "ledger_bytes","ledger_sha256",
  ]){
    assert.equal(packaged[key],plan[key],key+" plan/package mismatch");
    assert.equal(inspected[key],plan[key],key+" plan/inspect mismatch");
  }

  const stagePlan=parseCanonicalLine(
    mustRun("/usr/bin/python3",[V4_STAGE,"--plan",archive]),
    "V4 stage plan",
  );
  const stageSelfTest=parseCanonicalLine(
    mustRun("/usr/bin/python3",[V4_STAGE,"--self-test",archive]),
    "V4 stage self-test",
  );
  assertStage(stagePlan,"plan");
  assertStage(stageSelfTest,"self-test");

  const receipt={
    schema:"void_buy_void_nimo_v3_historical_v4_current_v1",
    version:1,
    mode:"audited_current_v4",
    historical_v3_proof_git_blob_sha1:EXPECTED.v3_blob,
    historical_v3_refused_current_ledger:true,
    historical_v3_ledger_git_blob_sha1:
      "66617a89d5ad9f81b5a21d98cca55fcda6902a80",
    current_ledger_git_blob_sha1:EXPECTED.ledger_blob,
    current_replay_git_blob_sha1:EXPECTED.replay_blob,
    audited_package_git_blob_sha1:EXPECTED.package_blob,
    audited_lock_git_blob_sha1:EXPECTED.lock_blob,
    v4_builder_git_blob_sha1:EXPECTED.v4_blob,
    v4_stage_git_blob_sha1:EXPECTED.v4_stage_blob,
    v4_candidate_manifest_id:EXPECTED.v4_candidate_id,
    v4_archive_bytes:EXPECTED.v4_archive_bytes,
    v4_archive_sha256:EXPECTED.v4_archive_sha256,
    v4_ledger_bytes:EXPECTED.v4_ledger_bytes,
    v4_ledger_sha256:EXPECTED.v4_ledger_sha256,
    v4_plan_package_inspect_identity_match:true,
    v4_private_stage_self_test:true,
    live_nimo_installed:false,
    verified_payment_to_allocation_mounted:false,
    custody_reserve_or_recover_enabled:false,
    production_gate_ready:false,
    presale_activation:false,
    funds_moved:false,
  };
  process.stdout.write(JSON.stringify(receipt)+"\n");
}finally{
  fs.rmSync(temp,{recursive:true,force:true});
}
