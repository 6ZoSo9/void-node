#!/usr/bin/env node
// Exact V1/V2/V3 source-generation dispatcher; no live node, signer or keys.
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
const MARKER = "VOID_CANONICAL_PRODUCER_SOURCE_GENERATION_DISPATCH_V3";
const GENERATIONS = [
  {sha:"1fde828c97175560f98ab070af33eefc595f8002",
    guard:"runtime/canonical-producer-self-http-guard-v1.cjs",
    proof:"scripts/prove_canonical_producer_legacy_self_http_observers_v1.mjs"},
  {sha:"8198912a70c8db0c81dad5d341cb4a779906c851",
    guard:"runtime/canonical-producer-self-http-guard-v2.cjs",
    proof:"scripts/prove_canonical_producer_legacy_self_http_observers_current_v2.mjs"},
  {sha:"40239e0f76aa1edce43523d18c1b57691e41e8cf",
    guard:"runtime/canonical-producer-self-http-guard-v3.cjs",
    proof:"scripts/prove_canonical_producer_legacy_self_http_observers_current_v3.mjs"},
];
const FROZEN_BLOBS = new Map([
  [GENERATIONS[0].guard,"656e397ee6f54d7902c19c8c9c5d826f9bcbdf5c"],
  [GENERATIONS[0].proof,"26c5b586e8a97759288a18909ba06312055c54be"],
  [GENERATIONS[1].guard,"eb685800490b5c6549c2b2d41c515bc0ea3a527b"],
  [GENERATIONS[1].proof,"873b4173d37373a4654efde8192a8e5818d637bb"],
]);
const file=(name)=>fs.readFileSync(name);
const gitBlob=(buffer)=>crypto.createHash("sha1")
  .update(Buffer.from("blob "+buffer.length+"\0"))
  .update(buffer).digest("hex");
for(const [name,blob] of FROZEN_BLOBS) {
  assert.equal(gitBlob(file(name)),blob,"frozen observer evidence changed: "+name);
}
// The current V3 must be behavior-identical to the reviewed V2 guard,
// changing only the exact current input blob, marker and self-stack filter.
const v2=file(GENERATIONS[1].guard).toString("utf8");
const v3=file(GENERATIONS[2].guard).toString("utf8");
const expected=v2
  .replace('const MARKER = "VOID_CANONICAL_PRODUCER_SELF_HTTP_GUARD_V2";',
           'const MARKER = "VOID_CANONICAL_PRODUCER_SELF_HTTP_GUARD_V3";')
  .replace('const CURRENT_SOURCE_BLOB_SHA = "'+GENERATIONS[1].sha+'";',
           'const CURRENT_SOURCE_BLOB_SHA = "'+GENERATIONS[2].sha+'";')
  .replace('!line.includes("canonical-producer-self-http-guard-v2.cjs")',
           '!line.includes("canonical-producer-self-http-guard-v3.cjs")');
assert.notEqual(v2,expected,"versioned V3 transform not applied");
assert.equal(v3,expected,"V3 observer source differs from exact reviewed V2 behavior");
const sourceBlob=gitBlob(file("src/index.ts"));
const runner=file("ops/run-void-node-live-v1.sh").toString("utf8");
for(const expectedText of [
  "VOID_CANONICAL_PRODUCER_SOURCE_GENERATION_HOLD",
  "canonical-producer-source-custody-v1.cjs",
  'producer_index_blob="$(git hash-object -- src/index.ts)"',
  'tracked_index_blob="$(git rev-parse --verify "${source_commit_before}:src/index.ts")"',
  'test "$producer_index_blob" = "$tracked_index_blob"',
])assert.ok(runner.includes(expectedText),"runner missing source gate "+expectedText);
const first=runner.indexOf('  case "$producer_index_blob" in');
const last=runner.indexOf("\n  esac",first);
assert.ok(first>=0&&last>first,"missing exactly one selector");
assert.equal(runner.indexOf('  case "$producer_index_blob" in',first+1),-1);
const selector=runner.slice(first,last+"\n  esac".length);
function select(sha) {
  return spawnSync("bash",[
    "-c",
    'set -euo pipefail\nROOT=/synthetic\nproducer_index_blob="$1"\n'+
      selector+'\nprintf "%s\n" "${canonical_self_http_preload[1]}"\n',
    "--",sha,
  ],{encoding:"utf8",timeout:2000,maxBuffer:128*1024,
      env:{PATH:"/usr/bin:/bin"}});
}
for(const g of GENERATIONS){
  assert.ok(runner.includes(g.sha+")"),"missing reviewed source SHA");
  assert.ok(runner.includes('--require "$ROOT/'+g.guard+'"'),
    "missing reviewed preload");
  const r=select(g.sha);
  assert.equal(r.status,0,r.stderr);
  assert.equal(r.stdout.trim(),"/synthetic/"+g.guard);
}
const unknown=select("0".repeat(40));
assert.notEqual(unknown.status,0);
assert.match(unknown.stderr,/VOID_CANONICAL_PRODUCER_SOURCE_GENERATION_HOLD/);
const selected=GENERATIONS.find(g=>g.sha===sourceBlob);
assert.ok(selected,MARKER+"_HOLD unreviewed source blob="+sourceBlob);
function runProof(scriptPath){
  const r=spawnSync(process.execPath,[scriptPath],{
    encoding:"utf8",timeout:90000,maxBuffer:2*1024*1024,
    env:{...process.env,NODE_OPTIONS:""},
  });
  if(r.error||r.status!==0)throw Error("observer proof failed status="+r.status+
    " stderr="+String(r.stderr||r.error).slice(0,1200));
  assert.match(r.stdout,/_GREEN/);
  process.stdout.write(r.stdout);
}
function requireRejection(g){
  const r=spawnSync(process.execPath,["-e",
    'global.fetch=async()=>new Response("offline");require(process.env.MODULE_PATH);',
  ],{encoding:"utf8",timeout:7000,maxBuffer:200000,
    env:{...process.env,NODE_OPTIONS:"",
      MODULE_PATH:path.resolve(g.guard),
      VOID_CANONICAL_PRODUCER_ROLE:"1",
      VOID_CANONICAL_SELF_HTTP_GUARD:"1",
      VOID_CANONICAL_DISABLE_LEGACY_SELF_HTTP_OBSERVERS:"1",
      HTTP_PORT:"4100"},
  });
  assert.notEqual(r.status,0,"frozen generation unexpectedly admitted new index");
  assert.match(String(r.stderr),/LEGACY_SOURCE_CONTRACT_FAIL source_blob_mismatch/);
}
for(const old of GENERATIONS) {
  if(old.sha!==sourceBlob)requireRejection(old);
}
runProof(selected.proof);
console.log(MARKER+"_GREEN "+JSON.stringify({
  source_blob:sourceBlob,
  selected_guard:selected.guard,
  frozen_v1_v2_blobs_verified:true,
  source_generation_selector_positive_negative:true,
  obsolete_guard_refusal:true,
  observer_behavior_equivalent:true,
  source_custody_preflight_required:true,
  service_or_source_deployment_changed:false,
  signer_or_wallet_access:false,
  launch_authority:false,
}));
