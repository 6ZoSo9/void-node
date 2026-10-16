#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  VOID_ECONOMIC_SPONSORED_OBSERVATION_RESTART_BRIDGE_AUTHORITY_V1,
  qualifyVoidEconomicSponsoredObservationRestartBridgeV1,
} from "../tools/void-economic-sponsored-observation-restart-bridge-v1.mjs";
import {
  VOID_ECONOMIC_SPONSORED_HOST_TRUSTED_CLOCK_BINDING_AUTHORITY_V1,
  testOnlyCollectVoidEconomicSponsoredHostTrustedClockBindingV1,
} from "../tools/void-economic-sponsored-host-trusted-clock-binding-v1.mjs";
import {
  VOID_ECONOMIC_SYSTEM_SPONSORED_OBSERVATION_TIME_STORE_AUTHORITY_V1,
  VOID_ECONOMIC_SYSTEM_SPONSORED_OBSERVATION_TIME_STORE_V1,
} from "../tools/void-economic-system-sponsored-observation-time-store-v1.mjs";
import {
  createVoidEconomicSystemSponsoredObservationTimeV1,
} from "../tools/void-economic-system-sponsored-observation-time-v1.mjs";
import {
  testOnlyCreateVoidEconomicSponsoredHostObservationTimeStoreBindingWithStoreV1,
} from "../tools/void-economic-sponsored-host-observation-time-store-binding-v1.mjs";

const ROOT=process.cwd();
const EXPECTED_BLOBS=Object.freeze({
  "tools/void-economic-sponsored-observation-restart-bridge-v1.mjs":
    "7fa61fa523ff84122cfbfcefc6da010f0907839c",
  "tools/void-economic-sponsored-host-observation-time-store-binding-v1.mjs":
    "7cfba597ddf9667021b662ce3e4ac8c0c3f1103b",
  "tools/void-economic-sponsored-host-trusted-clock-binding-v1.mjs":
    "0f9c97785866aeafd54e24e4847183e9c8518501",
  "tools/void-economic-system-sponsored-observation-time-store-v1.mjs":
    "53f0bae06b3361088712eaf6ef6d17e5d9c676de",
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
const BOOT_B="aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
const BASE_WALL=1_800_000_000_000;

function hostDependencies({
  wall=BASE_WALL,
  uptimeBefore="1000.000000000",
  uptimeAfter="1000.400000000",
  bootBefore=BOOT,
  bootAfter=BOOT,
}={}){
  let bootReads=0;
  let uptimeReads=0;
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
      assert.equal(file,"/usr/bin/timedatectl");
      assert.deepEqual(args,["show","--property=NTPSynchronized","--value"]);
      return {status:0,signal:null,stdout:"yes\n",stderr:"",error:null};
    },
    nowMs(){ return wall; },
  };
}

function procStat(pid,startTicks){
  const fields=[
    "S","1","1","1","0","-1","0","0","0","0","0",
    "0","0","0","0","20","0","1","0",String(startTicks),
  ];
  assert.equal(fields.length,20);
  return String(pid)+" (node worker) "+fields.join(" ")+"\n";
}

function hostBinding({
  pid=4242,
  startTicks="777",
  wall=BASE_WALL,
  uptimeBefore="1000.000000000",
  uptimeAfter="1000.400000000",
  boot=BOOT,
}={}){
  const deps=hostDependencies({
    wall,uptimeBefore,uptimeAfter,bootBefore:boot,bootAfter:boot,
  });
  return testOnlyCollectVoidEconomicSponsoredHostTrustedClockBindingV1({
    host_time_sync_dependencies:{
      readText:deps.readText,
      runCommand:deps.runCommand,
      nowMs:deps.nowMs,
    },
    process_stat_before_text:procStat(pid,startTicks),
    process_stat_after_text:procStat(pid,startTicks),
    expected_pid:pid,
  });
}

function canonicalPriorReceipt(priorBinding){
  const contract=createVoidEconomicSystemSponsoredObservationTimeV1({
    trustedClock:()=>priorBinding.observation_sample,
  });
  const result=contract.observe({prior_receipt:null});
  assert.equal(result.ok,true,JSON.stringify(result));
  return result.receipt;
}

async function priorComposition(priorBinding,priorReceipt){
  const wrapper=
    testOnlyCreateVoidEconomicSponsoredHostObservationTimeStoreBindingWithStoreV1({
      root_dir:"/tmp/void-sponsored-restart-proof-unused",
      collectBinding:()=>priorBinding,
      createStore(){
        return Object.freeze({
          async observe(){
            return Object.freeze({
              ok:true,
              status:"source_accepted",
              marker:VOID_ECONOMIC_SYSTEM_SPONSORED_OBSERVATION_TIME_STORE_V1,
              version:1,
              mutation_performed:true,
              observation_performed:true,
              accepted_observed_at_ms:priorReceipt.observed_at_ms,
              generation:priorReceipt.generation,
              head_receipt_sha256:priorReceipt.receipt_sha256,
              durable_receipt_count:Number(BigInt(priorReceipt.generation)+1n),
              durable_receipt_store_source_verified:true,
              live_durable_receipt_storage_proven:false,
              trusted_clock_source_proven:false,
              trusted_clock_host_binding_proven:false,
              receipt_store_rollback_resistance_proven:false,
              cross_process_restart_continuity_proven:false,
              cross_boot_restart_continuity_proven:false,
              runtime_enforcement_verified:false,
              gas_sponsorship_performed:false,
              transaction_submission:false,
              transaction_broadcast:false,
              funds_movement:false,
              authority:VOID_ECONOMIC_SYSTEM_SPONSORED_OBSERVATION_TIME_STORE_AUTHORITY_V1,
            });
          },
        });
      },
    });
  const result=await wrapper.observe();
  assert.equal(result.ok,true,JSON.stringify(result));
  assert.equal(result.status,"source_observed_bound");
  return result;
}

function storeInspection(receipt,overrides={}){
  return Object.freeze({
    ok:true,
    status:"source_inspected",
    marker:VOID_ECONOMIC_SYSTEM_SPONSORED_OBSERVATION_TIME_STORE_V1,
    version:1,
    mutation_performed:false,
    durable_receipt_count:Number(BigInt(receipt.generation)+1n),
    head_receipt_sha256:receipt.receipt_sha256,
    head_generation:receipt.generation,
    head_observed_at_ms:receipt.observed_at_ms,
    durable_receipt_store_source_verified:true,
    live_durable_receipt_storage_proven:false,
    trusted_clock_source_proven:false,
    trusted_clock_host_binding_proven:false,
    receipt_store_rollback_resistance_proven:false,
    cross_process_restart_continuity_proven:false,
    cross_boot_restart_continuity_proven:false,
    runtime_enforcement_verified:false,
    gas_sponsorship_performed:false,
    transaction_submission:false,
    transaction_broadcast:false,
    funds_movement:false,
    authority:VOID_ECONOMIC_SYSTEM_SPONSORED_OBSERVATION_TIME_STORE_AUTHORITY_V1,
    ...overrides,
  });
}

function input({
  priorBinding,
  currentBinding,
  receipt,
  composition,
  inspection=storeInspection(receipt),
}){
  return {
    prior_durable_receipt:receipt,
    prior_composition_receipt:composition,
    prior_host_binding:priorBinding,
    current_host_binding:currentBinding,
    store_inspection:inspection,
  };
}

const priorBinding=hostBinding();
const receipt=canonicalPriorReceipt(priorBinding);
const composition=await priorComposition(priorBinding,receipt);
const currentBinding=hostBinding({
  pid:5252,
  startTicks:"888",
  wall:BASE_WALL+1000,
  uptimeBefore:"1001.000000000",
  uptimeAfter:"1001.400000000",
});
const result=qualifyVoidEconomicSponsoredObservationRestartBridgeV1(input({
  priorBinding,currentBinding,receipt,composition,
}));
assert.equal(result.ok,true);
assert.equal(result.status,"source_same_boot_restart_qualified");
assert.equal(result.same_boot_restart_evidence_proven,true);
assert.equal(result.same_boot_verified,true);
assert.equal(result.process_restart_verified,true);
assert.equal(result.durable_prior_head_verified,true);
assert.equal(result.boot_relative_time_forward_verified,true);
assert.equal(result.wall_time_non_regression_verified,true);
assert.equal(result.cumulative_wall_monotonic_skew_verified,true);
assert.equal(result.production_fixed_sources_observed,false);
assert.equal(result.test_only_injected_dependencies,true);
assert.equal(result.cross_process_restart_continuity_proven,false);
assert.equal(result.cross_boot_restart_continuity_proven,false);
assert.equal(result.durable_time_store_mutation,false);
assert.equal(result.runtime_route_active,false);
assert.equal(result.gas_sponsorship_performed,false);
assert.equal(result.transaction_submission,false);
assert.equal(result.public_presale_activation,false);
assert.equal(result.funds_movement,false);
assert.match(result.restart_bridge_id,/^voidesorb1_[0-9a-f]{64}$/u);
assert.equal(
  qualifyVoidEconomicSponsoredObservationRestartBridgeV1(input({
    priorBinding,currentBinding,receipt,composition,
  })).restart_bridge_id,
  result.restart_bridge_id,
);

assert.throws(
  ()=>qualifyVoidEconomicSponsoredObservationRestartBridgeV1(input({
    priorBinding,
    currentBinding:hostBinding({
      pid:5252,startTicks:"888",wall:BASE_WALL+1000,
      uptimeBefore:"1001.000000000",uptimeAfter:"1001.400000000",boot:BOOT_B,
    }),
    receipt,composition,
  })),
  /sponsored_restart_bridge_cross_boot_forbidden/u,
);
assert.throws(
  ()=>qualifyVoidEconomicSponsoredObservationRestartBridgeV1(input({
    priorBinding,
    currentBinding:hostBinding({
      pid:5252,startTicks:"777",wall:BASE_WALL+1000,
      uptimeBefore:"1001.000000000",uptimeAfter:"1001.400000000",
    }),
    receipt,composition,
  })),
  /sponsored_restart_bridge_process_generation_not_newer/u,
);
assert.throws(
  ()=>qualifyVoidEconomicSponsoredObservationRestartBridgeV1(input({
    priorBinding,
    currentBinding:hostBinding({
      pid:5252,startTicks:"888",wall:BASE_WALL+1000,
      uptimeBefore:"999.000000000",uptimeAfter:"999.400000000",
    }),
    receipt,composition,
  })),
  /sponsored_restart_bridge_monotonic_not_forward/u,
);
assert.throws(
  ()=>qualifyVoidEconomicSponsoredObservationRestartBridgeV1(input({
    priorBinding,
    currentBinding:hostBinding({
      pid:5252,startTicks:"888",wall:BASE_WALL-1,
      uptimeBefore:"1001.000000000",uptimeAfter:"1001.400000000",
    }),
    receipt,composition,
  })),
  /sponsored_restart_bridge_wall_regressed/u,
);
assert.throws(
  ()=>qualifyVoidEconomicSponsoredObservationRestartBridgeV1(input({
    priorBinding,
    currentBinding:hostBinding({
      pid:5252,startTicks:"888",wall:BASE_WALL+7000,
      uptimeBefore:"1001.000000000",uptimeAfter:"1001.400000000",
    }),
    receipt,composition,
  })),
  /sponsored_restart_bridge_wall_monotonic_skew_exceeded/u,
);
assert.throws(
  ()=>qualifyVoidEconomicSponsoredObservationRestartBridgeV1(input({
    priorBinding,currentBinding,receipt,composition,
    inspection:storeInspection(receipt,{
      head_receipt_sha256:"sha256:"+"0".repeat(64),
    }),
  })),
  /sponsored_restart_bridge_prior_head_binding_mismatch/u,
);

{
  const bad={};
  let reads=0;
  Object.defineProperty(bad,"prior_durable_receipt",{
    enumerable:true,
    get(){ reads+=1; return receipt; },
  });
  for(const [key,value] of Object.entries({
    prior_composition_receipt:composition,
    prior_host_binding:priorBinding,
    current_host_binding:currentBinding,
    store_inspection:storeInspection(receipt),
  })){
    Object.defineProperty(bad,key,{
      enumerable:true,
      value,
    });
  }
  assert.throws(
    ()=>qualifyVoidEconomicSponsoredObservationRestartBridgeV1(bad),
    /sponsored_restart_bridge_input_invalid/u,
  );
  assert.equal(reads,0);
}

for(const [key,value] of Object.entries(
  VOID_ECONOMIC_SPONSORED_OBSERVATION_RESTART_BRIDGE_AUTHORITY_V1,
)){
  const trueKeys=new Set([
    "source_only_contract",
    "exact_prior_durable_receipt_required",
    "exact_prior_composition_receipt_required",
    "exact_prior_host_binding_required",
    "exact_current_host_binding_required",
    "exact_store_head_inspection_required",
    "same_boot_only",
    "changed_process_generation_required",
    "boot_relative_time_forward_required",
    "wall_time_non_regression_required",
    "cumulative_wall_monotonic_skew_bounded",
    "production_cross_process_continuity_may_be_proven",
  ]);
  assert.equal(value,trueKeys.has(key),key);
}

console.log("VOID_ECONOMIC_SPONSORED_OBSERVATION_RESTART_BRIDGE_V1_PROOF_GREEN");
console.log("prior_durable_head_independently_inspected=true");
console.log("prior_composition_receipt_bound=true");
console.log("prior_host_binding_bound=true");
console.log("same_boot_restart_required=true");
console.log("changed_process_generation_required=true");
console.log("boot_relative_time_forward_required=true");
console.log("wall_time_non_regression_required=true");
console.log("cumulative_wall_monotonic_skew_bounded=true");
console.log("test_only_cross_process_restart_continuity_proven=false");
console.log("cross_boot_restart_continuity_proven=false");
console.log("durable_time_store_mutation=false");
console.log("runtime_route_active=false");
console.log("gas_sponsorship_performed=false");
console.log("transaction_submission=false");
console.log("public_presale_activation=false");
console.log("funds_movement=false");
