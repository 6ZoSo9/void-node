#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  EARN_SCHEMA_PROOF_NOW_MS,
  validEarnSnapshotV1,
} from "./void_ui_wave4_earn_snapshot_fixture_v1.mjs";
import {
  validateEarnSnapshotV1,
} from "../public/void-app-wave1-v1/assets/js/earn-live.js";

const NOW=EARN_SCHEMA_PROOF_NOW_MS;

const validate=(value)=>validateEarnSnapshotV1(value,"account-A",{
  requestStartedAtMs:NOW,
  evaluatedAtMs:NOW,
});
const fresh=()=>structuredClone(validEarnSnapshotV1());

assert.deepEqual(validate(fresh()),fresh());

const rejects=(mutate,label)=>{
  const value=fresh();
  mutate(value);
  assert.throws(()=>validate(value),undefined,label);
};

{
  const value=fresh();
  value.earning.source_available=false;
  value.earning.status="unavailable";
  value.earning.status_label="Unavailable";
  value.earning.enabled=false;
  value.earning.manual_only=false;
  value.earning.automatic_background=false;
  value.earning.summary="Earning status is unavailable.";
  value.sources.runner_status.ok=false;
  value.sources.runner_status.status=503;

  value.accounting.legacy_wc.available=false;
  for(const key of ["earned","redeemed","redeemable","debited"]){
    value.accounting.legacy_wc[key]=null;
  }
  for(const key of [
    "earned_display",
    "redeemed_display",
    "redeemable_display",
    "debited_display",
  ]){
    value.accounting.legacy_wc[key]="—";
  }
  value.sources.redeemable.ok=false;
  value.sources.redeemable.status=503;

  value.accounting.production_wc.available=false;
  value.accounting.production_wc.balance=null;
  value.accounting.production_wc.display="—";
  value.accounting.production_wc.entries=null;
  value.accounting.production_wc.ledger_version="";
  value.sources.production_wc.ok=false;
  value.sources.production_wc.status=503;

  value.accounting.last_credit.available=false;
  value.accounting.last_credit.amount=null;
  value.accounting.last_credit.amount_display="—";
  value.accounting.last_credit.task_class=null;
  value.accounting.last_credit.task_label="No credit recorded";
  value.accounting.last_credit.reason="No credit recorded.";
  value.accounting.last_credit.recorded_at=null;

  value.recent_jobs.available=false;
  value.recent_jobs.count=0;
  value.recent_jobs.items=[];
  value.sources.jobs.ok=false;
  value.sources.jobs.status=503;

  value.verification_receipts.available=false;
  value.verification_receipts.count=0;
  value.verification_receipts.items=[];
  value.sources.receipts.ok=false;
  value.sources.receipts.status=503;

  value.datanet.source_available=false;
  value.datanet.status="unavailable";
  value.datanet.receipt_store_records=null;
  value.datanet.account_wc_events=null;
  value.sources.datanet_wc.ok=false;
  value.sources.datanet_wc.status=503;

  assert.doesNotThrow(()=>validate(value));
}

for(const [label,mutate] of [
  ["top unknown key",(x)=>{x.unknown=true;}],
  ["missing node",(x)=>{delete x.node;}],
  ["node role",(x)=>{x.node.role="remote";}],
  ["node label type",(x)=>{x.node.label=7;}],
  ["earning unknown key",(x)=>{x.earning.unknown=true;}],
  ["earning status label",(x)=>{x.earning.status_label="Active";}],
  ["earning status",(x)=>{x.earning.status="active";}],
  ["earning boolean type",(x)=>{x.earning.enabled="true";}],
  ["manual plus automatic",(x)=>{x.earning.automatic_background=true;}],
  ["earning policy",(x)=>{x.earning.policy="guaranteed payout";}],
  ["approved task duplicate",(x)=>{
    x.earning.approved_task_classes.push({
      task_class:"verify",
      label:"Verify data",
    });
  }],
  ["approved task label",(x)=>{
    x.earning.approved_task_classes[0].label="Wrong";
  }],
  ["jobs last hour fractional",(x)=>{x.earning.jobs_last_hour=1.5;}],
  ["work execution authority",(x)=>{
    x.earning.available_work.execution_available=true;
  }],
  ["work task label",(x)=>{x.earning.available_work.task_label="Wrong";}],
  ["work reason",(x)=>{x.earning.available_work.reason="raw upstream reason";}],
  ["work difficulty",(x)=>{x.earning.available_work.difficulty="extreme";}],
  ["work need score type",(x)=>{x.earning.available_work.network_need_score="1";}],
  ["legacy availability",(x)=>{x.accounting.legacy_wc.available=false;}],
  ["legacy display",(x)=>{x.accounting.legacy_wc.earned_display="12 WC";}],
  ["legacy authority",(x)=>{x.accounting.legacy_wc.spendable_claimed=true;}],
  ["production balance type",(x)=>{x.accounting.production_wc.balance="1.5";}],
  ["production entries fractional",(x)=>{x.accounting.production_wc.entries=1.5;}],
  ["production authority",(x)=>{x.accounting.production_wc.transferable=true;}],
  ["reward total type",(x)=>{x.accounting.rewards_last_hour.total="4.5";}],
  ["reward display",(x)=>{x.accounting.rewards_last_hour.total_display="4.50";}],
  ["last credit availability",(x)=>{x.accounting.last_credit.available=false;}],
  ["last credit task label",(x)=>{x.accounting.last_credit.task_label="Wrong";}],
  ["last credit timestamp",(x)=>{
    x.accounting.last_credit.recorded_at="2026-09-29T11:59:00Z";
  }],
  ["jobs count",(x)=>{x.recent_jobs.count=2;}],
  ["jobs limit",(x)=>{x.recent_jobs.limit=6;}],
  ["job extra key",(x)=>{x.recent_jobs.items[0].raw_payload={};}],
  ["job short ref",(x)=>{x.recent_jobs.items[0].short_reference="wrong";}],
  ["job task label",(x)=>{x.recent_jobs.items[0].task_label="Wrong";}],
  ["job status label",(x)=>{x.recent_jobs.items[0].status_label="Done";}],
  ["job result label",(x)=>{x.recent_jobs.items[0].result_label="Stored";}],
  ["job recorded time",(x)=>{
    x.recent_jobs.items[0].recorded_at="2026-09-29T11:58:00Z";
  }],
  ["job reward type",(x)=>{x.recent_jobs.items[0].reward_wc="1.5";}],
  ["job safe mode",(x)=>{x.recent_jobs.items[0].safe_mode="true";}],
  ["receipt bytes fractional",(x)=>{x.verification_receipts.items[0].bytes=1.5;}],
  ["receipt bytes display",(x)=>{
    x.verification_receipts.items[0].bytes_display="1024";
  }],
  ["receipt result label",(x)=>{
    x.verification_receipts.items[0].result_label="Accepted";
  }],
  ["datanet authority",(x)=>{x.datanet.mutation=true;}],
  ["datanet status contradiction",(x)=>{
    x.datanet.source_available=false;
  }],
  ["source route",(x)=>{x.sources.jobs.route="/other";}],
  ["source ok status",(x)=>{x.sources.jobs.ok=false;}],
  ["history source contradiction",(x)=>{x.recent_jobs.available=false;}],
  ["sanitization elevated",(x)=>{x.sanitization.wallet_addresses=true;}],
  ["boundary elevated",(x)=>{x.boundaries.job_execution=true;}],
]){
  rejects(mutate,label);
}

{
  const value=fresh();
  value.earning.available_work.available=false;
  value.earning.available_work.task_class=null;
  value.earning.available_work.task_label="No task selected";
  assert.doesNotThrow(()=>validate(value));
}

{
  const value=fresh();
  const longRef="r".repeat(30);
  value.recent_jobs.items[0].reference=longRef;
  value.recent_jobs.items[0].short_reference=
    longRef.slice(0,10)+"…"+longRef.slice(-8);
  assert.doesNotThrow(()=>validate(value));
}

const client=fs.readFileSync(
  "public/void-app-wave1-v1/assets/js/earn-live.js",
  "utf8",
);
for(const marker of [
  "exactKeys(\n    snapshot,",
  "'earning'",
  "'accounting'",
  "'recent_jobs'",
  "'verification_receipts'",
  "'datanet'",
  "'sources'",
  "'sanitization'",
  "'boundaries'",
  "Earn authority boundary elevated",
  "Earn sanitization boundary elevated",
  "Earn history source availability contradiction",
  "EARN_HISTORY_LIMIT = 5",
]){
  assert.ok(client.includes(marker),`missing Earn schema boundary: ${marker}`);
}

console.log("VOID_UI_WAVE4_EARN_BROWSER_SCHEMA_V1_GREEN");
console.log("top_level_schema_closed=true");
console.log("earning_schema_closed=true");
console.log("accounting_schema_closed=true");
console.log("history_schema_closed=true");
console.log("history_limit=5");
console.log("source_schema_closed=true");
console.log("sanitization_false_only=true");
console.log("authority_boundaries_false_only=true");
console.log("availability_contradictions_rejected=true");
console.log("legitimate_unavailable_state_allowed=true");
console.log("identity_freshness_transport_contracts_retained=true");
console.log("authority_added=false");
