#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  VOID_ECONOMIC_SPONSORED_HOST_TRUSTED_CLOCK_BINDING_AUTHORITY_V1,
  VOID_ECONOMIC_SPONSORED_HOST_TRUSTED_CLOCK_BINDING_V1,
  collectVoidEconomicSponsoredHostTrustedClockBindingV1,
  testOnlyCollectVoidEconomicSponsoredHostTrustedClockBindingV1,
} from "../tools/void-economic-sponsored-host-trusted-clock-binding-v1.mjs";
import {
  createVoidEconomicSystemSponsoredObservationTimeV1,
} from "../tools/void-economic-system-sponsored-observation-time-v1.mjs";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const EXPECTED_BLOBS=Object.freeze({
  "tools/void-economic-sponsored-host-trusted-clock-binding-v1.mjs":
    "0f9c97785866aeafd54e24e4847183e9c8518501",
  "tools/void-economic-sponsored-host-time-sync-evidence-v1.mjs":
    "24266dc04f4a740b4cbd438b51ed54703b919393",
  "tools/void-economic-system-sponsored-observation-time-v1.mjs":
    "4e96de24400ac6bc0af764704a00211c80c2cb71",
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
    "blob_drift:"+relative,
  );
}

const BOOT="11111111-2222-3333-4444-555555555555";

function hostDependencies({
  wall=1_800_000_000_000,
  uptimeBefore="1000.000000000",
  uptimeAfter="1000.400000000",
  bootBefore=BOOT,
  bootAfter=BOOT,
}={}){
  let bootReads=0;
  let uptimeReads=0;
  let commandCalls=0;
  let nowCalls=0;
  return {
    readText(file){
      if(file==="/proc/sys/kernel/random/boot_id"){
        bootReads+=1;
        return (bootReads===1?bootBefore:bootAfter)+"\n";
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

function binding({
  pid=4242,
  startTicks="777",
  afterStartTicks=startTicks,
  host={},
}={}){
  const deps=hostDependencies(host);
  const result=
    testOnlyCollectVoidEconomicSponsoredHostTrustedClockBindingV1({
      host_time_sync_dependencies:{
        readText:deps.readText,
        runCommand:deps.runCommand,
        nowMs:deps.nowMs,
      },
      process_stat_before_text:procStat(pid,startTicks),
      process_stat_after_text:procStat(pid,afterStartTicks),
      expected_pid:pid,
    });
  return {result,counts:deps.counts()};
}

const first=binding();
assert.equal(
  first.result.marker,
  VOID_ECONOMIC_SPONSORED_HOST_TRUSTED_CLOCK_BINDING_V1,
);
assert.equal(first.result.production_fixed_sources_observed,false);
assert.equal(first.result.test_only_injected_dependencies,true);
assert.equal(first.result.process_pid,4242);
assert.equal(first.result.process_start_ticks,"777");
assert.equal(first.result.boot_uptime_before_ns,"1000000000000");
assert.equal(first.result.boot_uptime_after_ns,"1000400000000");
assert.equal(first.result.boot_uptime_midpoint_ns,"1000200000000");
assert.equal(first.result.midpoint_uncertainty_ns,"200000000");
assert.deepEqual(first.result.observation_sample,{
  boot_id:BOOT,
  process_start_ticks:"777",
  wall_time_ms:1_800_000_000_000,
  monotonic_ns:"1000200000000",
});
assert.deepEqual(first.counts,{
  bootReads:2,
  uptimeReads:2,
  commandCalls:2,
  nowCalls:1,
});
assert.match(first.result.binding_id,/^voideshtcb1_[0-9a-f]{64}$/u);
assert.equal(binding().result.binding_id,first.result.binding_id);

const time=createVoidEconomicSystemSponsoredObservationTimeV1({
  trustedClock:()=>first.result.observation_sample,
});
const observed=time.observe({prior_receipt:null});
assert.equal(observed.ok,true);
assert.equal(observed.receipt.boot_id,BOOT);
assert.equal(observed.receipt.process_start_ticks,"777");
assert.equal(observed.receipt.observed_at_ms,1_800_000_000_000);
assert.equal(observed.receipt.monotonic_ns,"1000200000000");

const second=binding({
  host:{
    wall:1_800_000_001_000,
    uptimeBefore:"1001.000000000",
    uptimeAfter:"1001.400000000",
  },
});
const timeForward=createVoidEconomicSystemSponsoredObservationTimeV1({
  trustedClock:()=>second.result.observation_sample,
});
const forward=timeForward.observe({prior_receipt:observed.receipt});
assert.equal(forward.ok,true);
assert.equal(forward.receipt.generation,"1");
assert.equal(forward.receipt.previous_receipt_sha256,observed.receipt.receipt_sha256);

assert.throws(
  ()=>binding({afterStartTicks:"778"}),
  /sponsored_host_trusted_clock_process_generation_changed/u,
);
{
  const deps=hostDependencies();
  assert.throws(
    ()=>testOnlyCollectVoidEconomicSponsoredHostTrustedClockBindingV1({
      host_time_sync_dependencies:{
        readText:deps.readText,
        runCommand:deps.runCommand,
        nowMs:deps.nowMs,
      },
      process_stat_before_text:procStat(4243,"777"),
      process_stat_after_text:procStat(4243,"777"),
      expected_pid:4242,
    }),
    /sponsored_host_trusted_clock_process_pid_invalid/u,
  );
}
assert.throws(
  ()=>binding({
    host:{
      uptimeBefore:"1000.000000000",
      uptimeAfter:"1002.100000000",
    },
  }),
  /sponsored_host_trusted_clock_span_invalid/u,
);
assert.throws(
  ()=>binding({host:{bootAfter:"aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"}}),
  /host_time_sync_boot_changed_during_capture/u,
);
assert.throws(
  ()=>collectVoidEconomicSponsoredHostTrustedClockBindingV1("forbidden"),
  /sponsored_host_trusted_clock_caller_input_forbidden/u,
);

for(const [key,value] of Object.entries(
  VOID_ECONOMIC_SPONSORED_HOST_TRUSTED_CLOCK_BINDING_AUTHORITY_V1,
)){
  if([
    "source_only_contract",
    "fixed_host_time_sync_collector_required",
    "fixed_process_stat_source",
    "process_identity_bracketed_around_host_capture",
    "boot_relative_uptime_midpoint_sample",
    "midpoint_uncertainty_bounded",
    "observation_time_sample_shape_proven",
  ].includes(key)){
    assert.equal(value,true,key);
  }else{
    assert.equal(value,false,key);
  }
}

const source=fs.readFileSync(
  path.join(
    ROOT,
    "tools/void-economic-sponsored-host-trusted-clock-binding-v1.mjs",
  ),
  "utf8",
);
for(const required of [
  'const PROC_SELF_STAT_PATH = "/proc/self/stat"',
  "collectVoidEconomicSponsoredHostTimeSyncEvidenceV1()",
  "const processBefore = readProcSelfStat()",
  "const processAfter = readProcSelfStat()",
  "sponsored_host_trusted_clock_process_generation_changed",
  "MAX_BINDING_CAPTURE_SPAN_NS = 2_000_000_000n",
  "boot_uptime_midpoint_ns",
  "midpoint_uncertainty_ns",
  "trusted_clock_runtime_authority: false",
  "cross_process_restart_continuity_proven: false",
  "cross_boot_restart_continuity_proven: false",
  "transaction_submission: false",
  "public_presale_activation: false",
  "funds_movement: false",
]){
  assert.ok(source.includes(required),required);
}
for(const forbidden of [
  "Date.now(",
  "process.hrtime",
  "exec(",
  "execSync(",
  "systemctl",
  "wallet",
  "privateKey",
  "eth_send",
]){
  assert.equal(source.includes(forbidden),false,"forbidden:"+forbidden);
}

console.log(
  "VOID_ECONOMIC_SPONSORED_HOST_TRUSTED_CLOCK_BINDING_V1_PROOF_GREEN",
);
console.log("fixed_host_time_sync_collector_required=true");
console.log("fixed_process_stat_source=true");
console.log("process_identity_bracketed_around_host_capture=true");
console.log("boot_relative_midpoint_sample=true");
console.log("observation_time_sample_shape_proven=true");
console.log("production_host_sample_collected_in_ci=false");
console.log("trusted_clock_runtime_authority=false");
console.log("cross_process_restart_continuity_proven=false");
console.log("cross_boot_restart_continuity_proven=false");
console.log("runtime_route_active=false");
console.log("gas_sponsorship_performed=false");
console.log("transaction_submission=false");
console.log("public_presale_activation=false");
console.log("funds_movement=false");
