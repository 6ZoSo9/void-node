#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  validateEarnSnapshotV1,
} from "../public/void-app-wave1-v1/assets/js/earn-live.js";

const NOW_MS=Date.parse("2026-09-29T12:00:00.000Z");
const NOW=new Date(NOW_MS).toISOString();

const source=(route)=>({route,ok:true,status:200});

const validSnapshot=()=>({
  ok:true,
  marker:"VOID_UI_WAVE4_EARN_READONLY_V1",
  generated_at:NOW,
  read_only:true,
  network_name:"Mainnet-0",
  node:{label:"Precision",role:"precision"},
  account:{selected:true,id:"account-A",label:"account-A"},
  earning:{
    source_available:true,
    status:"active",
    status_label:"Active",
    enabled:true,
    manual_only:false,
    automatic_background:true,
    safe_mode:true,
    policy:"Useful, verifiable work only",
    approved_task_classes:[
      {task_class:"publish",label:"Publish data"},
      {task_class:"verify",label:"Verify data"},
    ],
    jobs_last_hour:2,
    max_jobs_per_hour:10,
    summary:"The runner reports active earning. This Wave 4 view remains read-only.",
    available_work:{
      available:true,
      task_class:"verify",
      task_label:"Verify data",
      reason:"A stale object is available for verification.",
      difficulty:"medium",
      network_need_score:0.5,
      dataset_selected:true,
      execution_available:false,
    },
  },
  accounting:{
    legacy_wc:{
      available:true,
      earned:10,
      earned_display:"10",
      redeemed:2,
      redeemed_display:"2",
      redeemable:8,
      redeemable_display:"8",
      debited:0,
      debited_display:"0",
      spendable_claimed:false,
      redemption_action_available:false,
    },
    production_wc:{
      available:true,
      balance:3.5,
      display:"3.5",
      entries:2,
      ledger_version:"wc-production-v1",
      spendable:false,
      redeemable:false,
      transferable:false,
      included_in_legacy_balance:false,
    },
    rewards_last_hour:{
      total:1.5,
      total_display:"1.5",
      publish:1,
      verify:0.5,
      redundancy:0,
    },
    last_credit:{
      available:true,
      amount:0.5,
      amount_display:"0.5",
      task_class:"verify",
      task_label:"Verify data",
      reason:"Verified receipt credit.",
      recorded_at:"2026-09-29T11:59:59.000Z",
    },
  },
  recent_jobs:{
    available:true,
    count:1,
    limit:5,
    items:[{
      reference:"job-1",
      short_reference:"job-1",
      receipt_reference:"receipt-1",
      short_receipt_reference:"receipt-1",
      task_class:"verify",
      task_label:"Verify data",
      status:"completed",
      status_label:"Completed",
      result_label:"Verified",
      recorded_at:"2026-09-29T11:59:58.000Z",
      reward_wc:0.5,
      reward_display:"0.5",
      dataset_selected:true,
      safe_mode:true,
    }],
  },
  verification_receipts:{
    available:true,
    count:1,
    limit:5,
    items:[{
      reference:"receipt-1",
      short_reference:"receipt-1",
      job_reference:"job-1",
      short_job_reference:"job-1",
      task_class:"verify",
      task_label:"Verify data",
      status:"completed",
      status_label:"Completed",
      result_label:"Verified",
      recorded_at:"2026-09-29T11:59:59.000Z",
      reward_wc:0.5,
      reward_display:"0.5",
      bytes:512,
      bytes_display:"512",
    }],
  },
  datanet:{
    source_available:true,
    status:"available",
    receipt_store_records:10,
    account_wc_events:5,
    useful_work_policy:"Useful, verifiable work only",
    mutation:false,
  },
  sources:{
    runner_status:source("/wc/runner/status"),
    reward_stats:source("/wc/reward-stats"),
    redeemable:source("/wc/redeemable"),
    production_wc:source("/wc/production/balance"),
    jobs:source("/jobs"),
    receipts:source("/receipts"),
    datanet_wc:source("/__void/participant/datanet-wc/status"),
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

const validate=(value)=>validateEarnSnapshotV1(value,"account-A",{
  requestStartedAtMs:NOW_MS,
  evaluatedAtMs:NOW_MS,
});

const clone=()=>structuredClone(validSnapshot());
assert.deepEqual(validate(validSnapshot()),validSnapshot());

const reject=(mutate,pattern)=>{
  const value=clone();
  mutate(value);
  assert.throws(()=>validate(value),pattern);
};

reject((x)=>{x.extra=true;},/earn snapshot shape mismatch/);
reject((x)=>{delete x.earning;},/earn snapshot shape mismatch/);
reject((x)=>{x.node.role="unknown";},/Earn node identity invalid/);
reject((x)=>{x.node.label="Nimo";},/Earn node identity invalid/);

reject((x)=>{x.earning.extra=true;},/earn snapshot\.earning shape mismatch/);
reject((x)=>{
  x.earning.status="configured";
  x.earning.status_label="Configured";
},/Earn earning status\/evidence mismatch/);
reject((x)=>{x.earning.status_label="ACTIVE";},/Earn earning status contract mismatch/);
reject((x)=>{x.earning.enabled=false;},/Earn earning status\/evidence mismatch|Earn disabled runner claims active mode/);
reject((x)=>{x.earning.jobs_last_hour=1.5;},/integer evidence invalid/);
reject((x)=>{
  x.earning.approved_task_classes.push(
    {task_class:"verify",label:"Verify data"},
  );
},/approved task class duplicate/);
reject((x)=>{x.earning.approved_task_classes[0].label="Publish";},/task contract mismatch/);
reject((x)=>{x.earning.available_work.execution_available=true;},/execution authority elevated/);
reject((x)=>{x.earning.available_work.task_label="Wrong";},/task contract mismatch/);
reject((x)=>{x.earning.available_work.network_need_score="0.5";},/numeric evidence invalid/);

reject((x)=>{x.accounting.legacy_wc.available=false;},/legacy WC availability\/value mismatch/);
reject((x)=>{x.accounting.legacy_wc.earned_display="10.0";},/display mismatch/);
reject((x)=>{x.accounting.legacy_wc.spendable_claimed=true;},/action authority elevated/);
reject((x)=>{x.accounting.production_wc.entries=1.5;},/integer evidence invalid/);
reject((x)=>{x.accounting.production_wc.spendable=true;},/authority elevated/);
reject((x)=>{x.accounting.production_wc.display="3.50";},/display mismatch/);
reject((x)=>{x.accounting.rewards_last_hour.total_display="1.50";},/display mismatch/);
reject((x)=>{x.accounting.last_credit.available=false;},/last credit unavailable-state mismatch/);
reject((x)=>{x.accounting.last_credit.task_label="Useful work";},/task contract mismatch/);
reject((x)=>{x.accounting.last_credit.recorded_at="2026-09-29T11:59:59Z";},/timestamp invalid/);

reject((x)=>{x.recent_jobs.count=2;},/history count mismatch/);
reject((x)=>{x.recent_jobs.limit=10;},/limit invalid/);
reject((x)=>{x.recent_jobs.items[0].extra=true;},/earn job\[0\] shape mismatch/);
reject((x)=>{x.recent_jobs.items[0].status_label="Done";},/status contract mismatch/);
reject((x)=>{x.recent_jobs.items[0].result_label="Stored";},/result label mismatch/);
reject((x)=>{x.recent_jobs.items[0].reference="bad reference";},/reference invalid/);
reject((x)=>{x.recent_jobs.items[0].short_reference="wrong";},/short reference mismatch/);
reject((x)=>{x.recent_jobs.items[0].reward_display="0.50";},/display mismatch/);
reject((x)=>{x.recent_jobs.items[0].recorded_at="not-a-time";},/timestamp invalid/);
reject((x)=>{x.recent_jobs.items[0].safe_mode="true";},/safe_mode invalid/);

reject((x)=>{x.verification_receipts.items[0].bytes=1.5;},/integer evidence invalid/);
reject((x)=>{x.verification_receipts.items[0].bytes_display="0512";},/bytes display mismatch/);
reject((x)=>{x.verification_receipts.items[0].job_reference="bad reference";},/reference invalid/);

reject((x)=>{x.datanet.mutation=true;},/mutation authority elevated/);
reject((x)=>{x.datanet.source_available=false;},/available state lacks source evidence/);
{
  const value=clone();
  value.datanet.status="unavailable";
  assert.doesNotThrow(()=>validate(value));
}
reject((x)=>{x.datanet.receipt_store_records=1.2;},/integer evidence invalid/);

reject((x)=>{x.sources.jobs.route="/other";},/route mismatch/);
reject((x)=>{x.sources.jobs.status="200";},/status invalid/);
reject((x)=>{x.sources.jobs.status=500;},/status\/ok mismatch/);
reject((x)=>{
  x.sources.jobs.ok=false;
  x.sources.jobs.status=500;
},/history availability\/source mismatch/);
reject((x)=>{
  x.sources.production_wc.ok=false;
  x.sources.production_wc.status=500;
},/production WC\/source mismatch/);
reject((x)=>{
  x.sources.redeemable.ok=false;
  x.sources.redeemable.status=500;
},/legacy WC\/source mismatch/);
reject((x)=>{
  x.sources.datanet_wc.ok=false;
  x.sources.datanet_wc.status=500;
},/DataNet\/source mismatch/);

reject((x)=>{x.sanitization.wallet_addresses=true;},/earn sanitization elevated/);
reject((x)=>{x.boundaries.wc_send=true;},/earn boundaries elevated/);

{
  const value=clone();
  value.accounting.legacy_wc={
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
  };
  value.sources.redeemable={route:"/wc/redeemable",ok:false,status:503};
  assert.doesNotThrow(()=>validate(value));
}

{
  const value=clone();
  value.accounting.production_wc={
    available:false,
    balance:null,
    display:"—",
    entries:null,
    ledger_version:"",
    spendable:false,
    redeemable:false,
    transferable:false,
    included_in_legacy_balance:false,
  };
  value.sources.production_wc={route:"/wc/production/balance",ok:false,status:503};
  assert.doesNotThrow(()=>validate(value));
}

{
  const value=clone();
  value.accounting.last_credit={
    available:false,
    amount:null,
    amount_display:"—",
    task_class:null,
    task_label:"No credit recorded",
    reason:"No credit recorded.",
    recorded_at:null,
  };
  assert.doesNotThrow(()=>validate(value));
}

const client=fs.readFileSync(
  "public/void-app-wave1-v1/assets/js/earn-live.js",
  "utf8",
);
for(const marker of [
  "const EARN_TOP_KEYS = Object.freeze([",
  "const EARN_BOUNDARY_KEYS = Object.freeze([",
  "const EARN_SANITIZATION_KEYS = Object.freeze([",
  "const validateEarnHistoryItemV1 =",
  "const validateEarnSourceRowV1 =",
  "const validateEarnSnapshotSchemaV1 =",
  "validateEarnSnapshotSchemaV1(snapshot);",
  "Earn production WC authority elevated",
  "Earn legacy WC action authority elevated",
  "Earn available work execution authority elevated",
  "Earn DataNet mutation authority elevated",
]){
  assert.ok(client.includes(marker),`missing Earn schema wall: ${marker}`);
}

console.log("VOID_UI_WAVE4_EARN_SCHEMA_BOUNDARY_V1_GREEN");
console.log("top_level_schema_closed=true");
console.log("node_schema_closed=true");
console.log("earning_schema_closed=true");
console.log("accounting_schema_closed=true");
console.log("history_schema_closed=true");
console.log("history_limit=5");
console.log("source_schema_closed=true");
console.log("source_routes_exact=true");
console.log("sanitization_all_false_required=true");
console.log("authority_boundaries_all_false_required=true");
console.log("availability_value_cross_checks=true");
console.log("display_evidence_cross_checks=true");
console.log("authority_added=false");
