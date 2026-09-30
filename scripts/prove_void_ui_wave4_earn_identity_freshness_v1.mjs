#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  EARN_SNAPSHOT_MAX_AGE_MS,
  EARN_SNAPSHOT_MAX_FUTURE_SKEW_MS,
  validateEarnSnapshotV1,
} from "../public/void-app-wave1-v1/assets/js/earn-live.js";

const PROOF_NOW_MS=Date.parse("2026-09-29T12:00:00.000Z");
const PROOF_NOW=new Date(PROOF_NOW_MS).toISOString();
const clientPath="public/void-app-wave1-v1/assets/js/earn-live.js";

const unavailableSource=(route)=>({
  route,
  ok:false,
  status:0,
});

const snapshot=(account="account-A",generatedAt=PROOF_NOW)=>({
  ok:true,
  marker:"VOID_UI_WAVE4_EARN_READONLY_V1",
  generated_at:generatedAt,
  read_only:true,
  network_name:"Mainnet-0",
  node:{
    label:"Local node",
    role:"local",
  },
  account:{
    selected:true,
    id:account,
    label:account,
  },
  earning:{
    source_available:false,
    status:"unavailable",
    status_label:"Unavailable",
    enabled:false,
    manual_only:false,
    automatic_background:false,
    safe_mode:false,
    policy:"Policy unavailable",
    approved_task_classes:[],
    jobs_last_hour:null,
    max_jobs_per_hour:null,
    summary:"Earning status is unavailable.",
    available_work:{
      available:false,
      task_class:null,
      task_label:"No task selected",
      reason:"No selection reason is currently available.",
      difficulty:null,
      network_need_score:null,
      dataset_selected:false,
      execution_available:false,
    },
  },
  accounting:{
    legacy_wc:{
      available:false,
      earned:null,
      earned_display:"—",
      redeemed:null,
      redeemed_display:"—",
      redeemable:null,
      redeemable_display:"—",
      debited:null,
      debited_display:"—",
      spendable_claimed:false,
      redemption_action_available:false,
    },
    production_wc:{
      available:false,
      balance:null,
      display:"—",
      entries:null,
      ledger_version:"",
      spendable:false,
      redeemable:false,
      transferable:false,
      included_in_legacy_balance:false,
    },
    rewards_last_hour:{
      total:null,
      total_display:"—",
      publish:null,
      verify:null,
      redundancy:null,
    },
    last_credit:{
      available:false,
      amount:null,
      amount_display:"—",
      task_class:null,
      task_label:"No credit recorded",
      reason:"No credit recorded.",
      recorded_at:null,
    },
  },
  recent_jobs:{
    available:false,
    count:0,
    limit:5,
    items:[],
  },
  verification_receipts:{
    available:false,
    count:0,
    limit:5,
    items:[],
  },
  datanet:{
    source_available:false,
    status:"unavailable",
    receipt_store_records:null,
    account_wc_events:null,
    useful_work_policy:"Policy unavailable",
    mutation:false,
  },
  sources:{
    runner_status:unavailableSource("/wc/runner/status"),
    reward_stats:unavailableSource("/wc/reward-stats"),
    redeemable:unavailableSource("/wc/redeemable"),
    production_wc:unavailableSource("/wc/production/balance"),
    jobs:unavailableSource("/jobs"),
    receipts:unavailableSource("/receipts"),
    datanet_wc:unavailableSource("/__void/participant/datanet-wc/status"),
  },
  sanitization:{
    raw_source_bodies:false,
    absolute_paths:false,
    wallet_addresses:false,
    redeemed_event_wallets:false,
    job_inputs:false,
    job_meta:false,
    receipt_roots:false,
    receipt_leaves:false,
    receipt_payloads:false,
  },
  boundaries:{
    job_execution:false,
    job_submission:false,
    reward_award:false,
    runner_activation:false,
    runner_tick:false,
    runner_config:false,
    wc_redeem:false,
    wc_send:false,
    wc_to_void:false,
    ledger_write:false,
    browser_wallet_connection:false,
    validator_mutation:false,
    operator_mutation:false,
    money_movement:false,
  },
});

const validateAt=(
  value,
  expectedAccount="account-A",
  requestStartedAtMs=PROOF_NOW_MS,
  evaluatedAtMs=requestStartedAtMs,
)=>validateEarnSnapshotV1(value,expectedAccount,{
  requestStartedAtMs,
  evaluatedAtMs,
});

assert.deepEqual(validateAt(snapshot()),snapshot());
assert.equal(EARN_SNAPSHOT_MAX_AGE_MS,30_000);
assert.equal(EARN_SNAPSHOT_MAX_FUTURE_SKEW_MS,5_000);

for(const generatedAt of [
  "",
  "not-a-time",
  "2026-09-29T12:00:00Z",
  "2026-09-29T12:00:00.00Z",
]){
  assert.throws(
    ()=>validateAt(snapshot("account-A",generatedAt)),
    /Earn generated timestamp invalid/,
  );
}

for(const generatedAt of [
  "1970-01-01T00:00:00.000Z",
  "9999-12-31T23:59:59.999Z",
]){
  assert.throws(
    ()=>validateAt(snapshot("account-A",generatedAt)),
    /Earn generated timestamp outside freshness window/,
  );
}

const justInsideAge=snapshot(
  "account-A",
  new Date(PROOF_NOW_MS-EARN_SNAPSHOT_MAX_AGE_MS).toISOString(),
);
assert.doesNotThrow(()=>validateAt(justInsideAge));

const justOutsideAge=snapshot(
  "account-A",
  new Date(PROOF_NOW_MS-EARN_SNAPSHOT_MAX_AGE_MS-1).toISOString(),
);
assert.throws(
  ()=>validateAt(justOutsideAge),
  /Earn generated timestamp outside freshness window/,
);

const justInsideFuture=snapshot(
  "account-A",
  new Date(PROOF_NOW_MS+EARN_SNAPSHOT_MAX_FUTURE_SKEW_MS).toISOString(),
);
assert.doesNotThrow(()=>validateAt(justInsideFuture));

const justOutsideFuture=snapshot(
  "account-A",
  new Date(PROOF_NOW_MS+EARN_SNAPSHOT_MAX_FUTURE_SKEW_MS+1).toISOString(),
);
assert.throws(
  ()=>validateAt(justOutsideFuture),
  /Earn generated timestamp outside freshness window/,
);

assert.throws(
  ()=>validateAt(
    snapshot(),
    "account-A",
    PROOF_NOW_MS,
    PROOF_NOW_MS+EARN_SNAPSHOT_MAX_AGE_MS+1,
  ),
  /Earn generated timestamp outside freshness window/,
);
assert.throws(
  ()=>validateAt(snapshot(),"account-A",PROOF_NOW_MS+1,PROOF_NOW_MS),
  /Earn freshness context invalid/,
);

const wrongAccount=snapshot("account-B");
assert.throws(
  ()=>validateAt(wrongAccount,"account-A"),
  /Earn response account does not match request/,
);

for(const mutate of [
  (x)=>{x.account.label="account-B";},
  (x)=>{x.account.selected=false;},
  (x)=>{x.account.extra=true;},
]){
  const value=snapshot();
  mutate(value);
  assert.throws(()=>validateAt(value));
}

for(const mutate of [
  (x)=>{x.ok=false;},
  (x)=>{x.marker="WRONG";},
  (x)=>{x.read_only=false;},
  (x)=>{x.network_name="Wrongnet";},
]){
  const value=snapshot();
  mutate(value);
  assert.throws(()=>validateAt(value));
}

assert.throws(
  ()=>validateAt(snapshot(),"account A"),
  /Earn expected account invalid/,
);

const recoveryNowMs=PROOF_NOW_MS+EARN_SNAPSHOT_MAX_AGE_MS+1;
assert.doesNotThrow(()=>validateAt(
  snapshot("account-A",new Date(recoveryNowMs).toISOString()),
  "account-A",
  recoveryNowMs,
  recoveryNowMs,
));

const client=fs.readFileSync(clientPath,"utf8");
for(const marker of [
  "EARN_SNAPSHOT_MAX_AGE_MS = 30_000",
  "EARN_SNAPSHOT_MAX_FUTURE_SKEW_MS = 5_000",
  "export const validateEarnSnapshotV1 =",
  "requestStartedAtMs = Date.now()",
  "evaluatedAtMs: Date.now()",
  "Earn response account does not match request",
  "Earn generated timestamp outside freshness window",
  "typeof document !== 'undefined'",
  "typeof MutationObserver !== 'undefined'",
]){
  assert.ok(client.includes(marker),`missing Earn client boundary: ${marker}`);
}

const validationIndex=client.indexOf(
  "return validateEarnSnapshotV1(body, value, {",
);
const staleCommitGateIndex=client.indexOf(
  "if (serial !== requestSerial || currentRoute() !== 'earn') return;",
  validationIndex,
);
const renderIndex=client.indexOf(
  "renderEarn(checked, value, requestStartedAtMs);",
  staleCommitGateIndex,
);
const storageIndex=client.indexOf(
  "sessionStorage.setItem(EARN_ACCOUNT_STORAGE_KEY, value);",
  renderIndex,
);
assert.ok(validationIndex>=0);
assert.ok(staleCommitGateIndex>validationIndex);
assert.ok(renderIndex>staleCommitGateIndex);
assert.ok(storageIndex>renderIndex);

console.log("VOID_UI_WAVE4_EARN_IDENTITY_FRESHNESS_V1_GREEN");
console.log("browser_earn_generated_at_canonical=true");
console.log("browser_earn_snapshot_max_age_ms=30000");
console.log("browser_earn_snapshot_max_future_skew_ms=5000");
console.log("browser_earn_request_lifetime_bound=true");
console.log("browser_earn_account_request_response_bound=true");
console.log("browser_earn_final_render_validation_before_session_storage=true");
console.log("browser_earn_subsequent_valid_recovery=true");
console.log("owned_transport_retains_identity_freshness_contract=true");
console.log("authority_added=false");
