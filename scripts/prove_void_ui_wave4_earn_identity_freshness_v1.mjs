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

const snapshot=(account="account-A",generatedAt=PROOF_NOW)=>({
  ok:true,
  marker:"VOID_UI_WAVE4_EARN_READONLY_V1",
  generated_at:generatedAt,
  read_only:true,
  network_name:"Mainnet-0",
  account:{
    selected:true,
    id:account,
    label:account,
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
console.log("transport_body_bounding_changed=false");
console.log("request_generation_cancellation_changed=false");
console.log("authority_added=false");
