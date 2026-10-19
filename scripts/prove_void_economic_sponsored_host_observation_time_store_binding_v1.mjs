#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  VOID_ECONOMIC_SPONSORED_HOST_OBSERVATION_TIME_STORE_BINDING_AUTHORITY_V1,
  VOID_ECONOMIC_SPONSORED_HOST_OBSERVATION_TIME_STORE_BINDING_V1,
  createVoidEconomicSponsoredHostObservationTimeStoreBindingV1,
  testOnlyCreateVoidEconomicSponsoredHostObservationTimeStoreBindingV1,
  testOnlyCreateVoidEconomicSponsoredHostObservationTimeStoreBindingWithStoreV1,
} from "../tools/void-economic-sponsored-host-observation-time-store-binding-v1.mjs";
import {
  VOID_ECONOMIC_SPONSORED_HOST_TRUSTED_CLOCK_BINDING_AUTHORITY_V1,
  testOnlyCollectVoidEconomicSponsoredHostTrustedClockBindingV1,
} from "../tools/void-economic-sponsored-host-trusted-clock-binding-v1.mjs";
import {
  createVoidEconomicSystemSponsoredObservationTimeStoreV1,
} from "../tools/void-economic-system-sponsored-observation-time-store-v1.mjs";

const ROOT=process.cwd();
const SOURCE=
  "tools/void-economic-sponsored-host-observation-time-store-binding-v1.mjs";
const HOST_BINDING=
  "tools/void-economic-sponsored-host-trusted-clock-binding-v1.mjs";
const STORE=
  "tools/void-economic-system-sponsored-observation-time-store-v1.mjs";
const OBSERVATION=
  "tools/void-economic-system-sponsored-observation-time-v1.mjs";
const WORKFLOW=
  ".github/workflows/void-economic-sponsored-host-observation-time-store-binding-v1.yml";

const EXPECTED_BLOBS=Object.freeze({
  [HOST_BINDING]:"0f9c97785866aeafd54e24e4847183e9c8518501",
  [STORE]:"53f0bae06b3361088712eaf6ef6d17e5d9c676de",
  [OBSERVATION]:"4e96de24400ac6bc0af764704a00211c80c2cb71",
});

function gitBlob(bytes){
  return crypto.createHash("sha1")
    .update(Buffer.from("blob "+bytes.length+"\0","utf8"))
    .update(bytes)
    .digest("hex");
}

for(const [relative,expected] of Object.entries(EXPECTED_BLOBS)){
  assert.equal(
    gitBlob(fs.readFileSync(path.join(ROOT,relative))),
    expected,
    "parent_blob_drift:"+relative,
  );
}

const BOOT="11111111-2222-3333-4444-555555555555";

function hostDependencies({
  wall=1_800_000_000_000,
  uptimeBefore="1000.000000000",
  uptimeAfter="1000.400000000",
}={}){
  let bootReads=0;
  let uptimeReads=0;
  let commandCalls=0;
  let nowCalls=0;
  return {
    readText(file){
      if(file==="/proc/sys/kernel/random/boot_id"){
        bootReads+=1;
        return BOOT+"\n";
      }
      if(file==="/proc/uptime"){
        uptimeReads+=1;
        return (uptimeReads===1?uptimeBefore:uptimeAfter)+" 0.00\n";
      }
      throw new Error("unexpected_read:"+file);
    },
    runCommand(file,args){
      commandCalls+=1;
      assert.equal(file,"/usr/bin/timedatectl");
      assert.deepEqual(args,[
        "show","--property=NTPSynchronized","--value",
      ]);
      return {
        status:0,
        signal:null,
        stdout:"yes\n",
        stderr:"",
        error:null,
      };
    },
    nowMs(){
      nowCalls+=1;
      return wall;
    },
    counts(){
      return {bootReads,uptimeReads,commandCalls,nowCalls};
    },
  };
}

function procStat(pid,startTicks){
  const fields=[
    "S",
    "1","1","1","0","-1","0","0","0","0","0",
    "0","0","0","0","20","0","1","0",
    String(startTicks),
  ];
  assert.equal(fields.length,20);
  return String(pid)+" (node worker) "+fields.join(" ")+"\n";
}

function hostBinding({
  pid=4242,
  startTicks="777",
  wall=1_800_000_000_000,
  uptimeBefore="1000.000000000",
  uptimeAfter="1000.400000000",
}={}){
  const deps=hostDependencies({wall,uptimeBefore,uptimeAfter});
  const value=testOnlyCollectVoidEconomicSponsoredHostTrustedClockBindingV1({
    host_time_sync_dependencies:{
      readText:deps.readText,
      runCommand:deps.runCommand,
      nowMs:deps.nowMs,
    },
    process_stat_before_text:procStat(pid,startTicks),
    process_stat_after_text:procStat(pid,startTicks),
    expected_pid:pid,
  });
  return {value,counts:deps.counts()};
}

function fixture(){
  const root=fs.mkdtempSync(
    path.join(os.tmpdir(),"void-sponsored-host-durable-time-"),
  );
  fs.chmodSync(root,0o700);
  fs.mkdirSync(path.join(root,"records"),{mode:0o700});
  fs.mkdirSync(path.join(root,"observation-time-v1.queue"),{mode:0o700});
  return root;
}

function cleanup(root){
  fs.rmSync(root,{recursive:true,force:true});
}

function records(root){
  return fs.readdirSync(path.join(root,"records")).filter(
    (name)=>name.endsWith(".json"),
  );
}

function baseInspect(root){
  const store=createVoidEconomicSystemSponsoredObservationTimeStoreV1({
    root_dir:root,
    trustedClock:()=>{throw new Error("inspect_clock_must_not_run");},
  });
  return store.inspect();
}

const source=fs.readFileSync(path.join(ROOT,SOURCE),"utf8");
for(const required of [
  "collectVoidEconomicSponsoredHostTrustedClockBindingV1",
  '["root_dir"]',
  "result.candidate_receipt_sha256",
  "observed.head_receipt_sha256",
  "captured.clockReads() !== 1",
  "SPONSORED_HOST_DURABLE_TIME_OBSERVE_BINDING_MISMATCH",
  "committed_durable_receipt_identity_preserved",
  "durable_head_receipt_sha256:",
  "trusted_clock_source_proven: productionExpected",
  "trusted_clock_host_binding_proven: productionExpected",
  "receipt_store_rollback_resistance_proven: false",
  "cross_process_restart_continuity_proven: false",
  "cross_boot_restart_continuity_proven: false",
  "replay_consume_performed: false",
  "gas_sponsorship_performed: false",
  "transaction_submission: false",
  "public_presale_activation: false",
  "funds_movement: false",
]){
  assert.ok(source.includes(required),required);
}
assert.equal(
  /createVoidEconomicSponsoredHostObservationTimeStoreBindingV1[\s\S]*collectBinding/u
    .test(source.slice(source.indexOf(
      "export function createVoidEconomicSponsoredHostObservationTimeStoreBindingV1",
    ))),
  true,
  "production constructor must hard-wire the fixed collector internally",
);
const workflowSource=fs.readFileSync(path.join(ROOT,WORKFLOW),"utf8");
for(const required of [
  'BASE: ${{ github.event.pull_request.base.sha }}',
  'HEAD: ${{ github.event.pull_request.head.sha || github.sha }}',
  'BASE="$(git rev-parse "$HEAD^1")"',
  'git merge-base --is-ancestor "$BASE" "$HEAD"',
  'git diff --check "$BASE" "$HEAD"',
]){
  assert.ok(workflowSource.includes(required),"workflow_contract:"+required);
}
for(const forbidden of [
  "Date.now(",
  "process.hrtime",
  "eth_send",
  "wallet.",
  "wallet(",
  "signer.",
  "signer(",
  "privateKey",
  "systemctl",
]){
  assert.equal(source.includes(forbidden),false,"forbidden:"+forbidden);
}

for(const [key,value] of Object.entries(
  VOID_ECONOMIC_SPONSORED_HOST_OBSERVATION_TIME_STORE_BINDING_AUTHORITY_V1,
)){
  const trueKeys=new Set([
    "source_only_composition",
    "fixed_host_trusted_clock_collector_wired",
    "durable_observation_store_reused",
    "one_host_binding_capture_per_operation",
    "one_store_clock_read_per_successful_operation",
    "preview_zero_durable_growth",
    "durable_result_bound_to_same_host_sample",
  ]);
  assert.equal(value,trueKeys.has(key),key);
}

const root=fixture();
try{
  const first=hostBinding();
  assert.deepEqual(first.counts,{
    bootReads:2,
    uptimeReads:2,
    commandCalls:2,
    nowCalls:1,
  });
  assert.equal(
    first.value.authority,
    VOID_ECONOMIC_SPONSORED_HOST_TRUSTED_CLOCK_BINDING_AUTHORITY_V1,
  );

  let previewCollectorCalls=0;
  const previewBinding=
    testOnlyCreateVoidEconomicSponsoredHostObservationTimeStoreBindingV1({
      root_dir:root,
      collectBinding(){
        previewCollectorCalls+=1;
        return first.value;
      },
    });
  const preview=previewBinding.preview();
  assert.equal(preview.ok,true,JSON.stringify(preview));
  assert.equal(preview.status,"source_preview_bound");
  assert.equal(previewCollectorCalls,1);
  assert.equal(preview.host_binding_capture_count,1);
  assert.equal(preview.store_clock_read_count,1);
  assert.equal(preview.mutation_performed,false);
  assert.equal(preview.durable_time_authority_advanced,false);
  assert.equal(preview.candidate_receipt_persisted,false);
  assert.equal(preview.preview_only,true);
  assert.equal(preview.production_fixed_sources_observed,false);
  assert.equal(preview.test_only_injected_dependencies,true);
  assert.equal(preview.trusted_clock_source_proven,false);
  assert.equal(preview.trusted_clock_host_binding_proven,false);
  assert.equal(preview.accepted_observed_at_ms,1_800_000_000_000);
  assert.match(
    preview.candidate_receipt_sha256,
    /^sha256:[0-9a-f]{64}$/u,
  );
  assert.match(
    preview.composition_receipt_id,
    /^voideshotsb1_[0-9a-f]{64}$/u,
  );
  assert.deepEqual(records(root),[]);
  assert.equal(baseInspect(root).durable_receipt_count,0);

  let observeCollectorCalls=0;
  const observeBinding=
    testOnlyCreateVoidEconomicSponsoredHostObservationTimeStoreBindingV1({
      root_dir:root,
      collectBinding(){
        observeCollectorCalls+=1;
        return first.value;
      },
    });
  const observed=await observeBinding.observe();
  assert.equal(observed.ok,true,JSON.stringify(observed));
  assert.equal(observed.status,"source_observed_bound");
  assert.equal(observeCollectorCalls,1);
  assert.equal(observed.host_binding_capture_count,1);
  assert.equal(observed.store_clock_read_count,1);
  assert.equal(observed.generation,"0");
  assert.equal(observed.durable_receipt_count,1);
  assert.equal(observed.accepted_observed_at_ms,first.value.wall_time_ms);
  assert.match(observed.durable_head_receipt_sha256,/^sha256:[0-9a-f]{64}$/u);
  assert.equal(observed.durable_result_bound_to_same_host_sample,true);
  assert.equal(observed.trusted_clock_source_proven,false);
  assert.equal(observed.trusted_clock_host_binding_proven,false);
  assert.equal(observed.trusted_clock_runtime_authority,false);
  assert.equal(observed.cross_process_restart_continuity_proven,false);
  assert.equal(observed.cross_boot_restart_continuity_proven,false);
  assert.equal(observed.runtime_enforcement_verified,false);
  assert.equal(observed.gas_sponsorship_performed,false);
  assert.equal(observed.transaction_submission,false);
  assert.equal(observed.public_presale_activation,false);
  assert.equal(observed.funds_movement,false);
  assert.match(
    observed.composition_receipt_id,
    /^voideshotsb1_[0-9a-f]{64}$/u,
  );
  assert.equal(baseInspect(root).durable_receipt_count,1);

  const second=hostBinding({
    wall:1_800_000_001_000,
    uptimeBefore:"1001.000000000",
    uptimeAfter:"1001.400000000",
  });
  const secondBinding=
    testOnlyCreateVoidEconomicSponsoredHostObservationTimeStoreBindingV1({
      root_dir:root,
      collectBinding:()=>second.value,
    });
  const observed2=await secondBinding.observe();
  assert.equal(observed2.ok,true,JSON.stringify(observed2));
  assert.equal(observed2.generation,"1");
  assert.equal(observed2.durable_receipt_count,2);
  assert.equal(
    observed2.accepted_observed_at_ms,
    second.value.wall_time_ms,
  );
  assert.match(
    observed2.durable_head_receipt_sha256,
    /^sha256:[0-9a-f]{64}$/u,
  );
  assert.equal(observed2.durable_result_bound_to_same_host_sample,true);

  let committedResult=null;
  const third=hostBinding({
    wall:1_800_000_002_000,
    uptimeBefore:"1002.000000000",
    uptimeAfter:"1002.400000000",
  });
  const postcommitBinding=
    testOnlyCreateVoidEconomicSponsoredHostObservationTimeStoreBindingWithStoreV1({
      root_dir:root,
      collectBinding:()=>third.value,
      createStore({root_dir,trustedClock}){
        const base=createVoidEconomicSystemSponsoredObservationTimeStoreV1({root_dir,trustedClock});
        return Object.freeze({
          preview:()=>base.preview(),
          async observe(){
            committedResult=await base.observe();
            assert.equal(committedResult.ok,true,JSON.stringify(committedResult));
            trustedClock();
            return committedResult;
          },
        });
      },
    });
  const beforePostcommit=records(root).length;
  const postcommitHold=await postcommitBinding.observe();
  assert.equal(postcommitHold.ok,false);
  assert.equal(postcommitHold.reason,"SPONSORED_HOST_DURABLE_TIME_OBSERVE_BINDING_MISMATCH");
  assert.equal(postcommitHold.store_clock_read_count,2);
  assert.equal(postcommitHold.mutation_performed,true);
  assert.equal(postcommitHold.durable_time_authority_advanced,true);
  assert.equal(postcommitHold.committed_durable_receipt_identity_preserved,true);
  assert.equal(postcommitHold.durable_head_receipt_sha256,committedResult.head_receipt_sha256);
  assert.equal(postcommitHold.generation,committedResult.generation);
  assert.equal(postcommitHold.durable_receipt_count,committedResult.durable_receipt_count);
  assert.equal(postcommitHold.accepted_observed_at_ms,committedResult.accepted_observed_at_ms);
  assert.equal(records(root).length,beforePostcommit+1);

  const beforeForbidden=records(root).length;
  const forbidden=await secondBinding.observe("caller-input");
  assert.equal(forbidden.ok,false);
  assert.equal(
    forbidden.reason,
    "SPONSORED_HOST_DURABLE_TIME_REQUEST_INPUT_FORBIDDEN",
  );
  assert.equal(forbidden.host_binding_capture_count,0);
  assert.equal(forbidden.store_clock_read_count,0);
  assert.equal(forbidden.authority.one_store_clock_read_per_successful_operation,true);
  assert.equal(Object.hasOwn(forbidden.authority,"one_store_clock_read_per_operation"),false);
  assert.equal(records(root).length,beforeForbidden);

  const malformed={
    ...second.value,
    binding_id:"voideshtcb1_"+"0".repeat(64),
    authority:
      VOID_ECONOMIC_SPONSORED_HOST_TRUSTED_CLOCK_BINDING_AUTHORITY_V1,
  };
  const badBinding=
    testOnlyCreateVoidEconomicSponsoredHostObservationTimeStoreBindingV1({
      root_dir:root,
      collectBinding:()=>malformed,
    });
  const bad=await badBinding.observe();
  assert.equal(bad.ok,false);
  assert.equal(
    bad.reason,
    "SPONSORED_HOST_DURABLE_TIME_HOST_BINDING_INVALID",
  );
  assert.equal(records(root).length,beforeForbidden);

  assert.throws(
    ()=>createVoidEconomicSponsoredHostObservationTimeStoreBindingV1({
      root_dir:root,
      collectBinding:()=>first.value,
    }),
    /SPONSORED_HOST_DURABLE_TIME_BINDING_INVALID/u,
  );
}finally{
  cleanup(root);
}

console.log(
  "VOID_ECONOMIC_SPONSORED_HOST_OBSERVATION_TIME_STORE_BINDING_V1_PROOF_GREEN",
);
console.log("fixed_host_trusted_clock_collector_wired=true");
console.log("production_caller_clock_input=false");
console.log("production_caller_timestamp_input=false");
console.log("production_caller_prior_receipt_input=false");
console.log("one_host_binding_capture_per_operation=true");
console.log("one_store_clock_read_per_successful_operation=true");
console.log("postcommit_hold_preserves_durable_receipt_identity=true");
console.log("committed_diff_hygiene_bound=true");
console.log("preview_zero_durable_growth=true");
console.log("durable_result_bound_to_same_host_sample=true");
console.log("malformed_host_binding_rejected_before_durable_growth=true");
console.log("production_host_sample_collected_in_ci=false");
console.log("trusted_clock_runtime_authority=false");
console.log("cross_process_restart_continuity_proven=false");
console.log("cross_boot_restart_continuity_proven=false");
console.log("receipt_store_rollback_resistance_proven=false");
console.log("runtime_route_active=false");
console.log("replay_consume_performed=false");
console.log("gas_sponsorship_performed=false");
console.log("transaction_submission=false");
console.log("public_presale_activation=false");
console.log("funds_movement=false");
