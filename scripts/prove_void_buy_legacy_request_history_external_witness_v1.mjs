#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";

import {
  VOID_BUY_VOID_LEGACY_HISTORY_DISPOSITION_AUTHORITY_V1,
  VOID_BUY_VOID_LEGACY_HISTORY_DISPOSITION_CANDIDATE_V1,
  VOID_BUY_VOID_LEGACY_HISTORY_DISPOSITION_DECISIONS_V1,
} from "../tools/void-buy-legacy-request-history-disposition-v1.mjs";
import {
  assembleVoidBuyVoidLegacyHistorySovereignAuthorizationV1,
  canonicalVoidBuyVoidLegacyHistorySovereignAuthorizationPayloadV1,
  testOnlyBuildVoidBuyVoidLegacyHistorySovereignAuthorizationRequestAgainstFingerprintV1,
} from "../tools/void-buy-legacy-request-history-sovereign-authorization-v1.mjs";
import {
  VOID_BUY_VOID_LEGACY_HISTORY_EXTERNAL_WITNESS_AUTHORITY_V1,
  VOID_BUY_VOID_LEGACY_HISTORY_EXTERNAL_WITNESS_PATH_V1,
  classifyVoidBuyVoidLegacyHistoryExternalWitnessReadbackV1,
  inspectVoidBuyVoidLegacyHistoryExternalWitnessV1,
  testOnlyPlanVoidBuyVoidLegacyHistoryExternalWitnessAgainstFingerprintV1,
} from "../tools/void-buy-legacy-request-history-external-witness-v1.mjs";

const D=VOID_BUY_VOID_LEGACY_HISTORY_DISPOSITION_DECISIONS_V1;
const workflow=fs.readFileSync(
  ".github/workflows/buy-void-legacy-request-history-external-witness-v1.yml",
  "utf8"
);
for(const relative of [
  "tools/void-buy-legacy-request-history-sovereign-authorization-v1.mjs",
  "tools/void-buy-legacy-request-history-disposition-v1.mjs",
  "src/security/void_sovereign_emergency_control_v1.ts",
  "src/security/void_alignment_layer_v1.ts",
  "package.json",
  "package-lock.json",
  "tsconfig.json",
  "tsconfig.build.json",
  "scripts/copy_void_runtime_js_v1.mjs",
  "scripts/retire_saveblock_periodic_rewriters_v1.mjs",
]){
  const token='      - "'+relative+'"';
  assert.equal(
    workflow.split(token).length-1,
    2,
    "workflow must trigger for PR and main push: "+relative,
  );
}
function canonical(value){
  if(value===null)return "null";
  if(typeof value==="string")return JSON.stringify(value).replace(/[\u007f-\uffff]/g,
    ch=>"\\u"+ch.charCodeAt(0).toString(16).padStart(4,"0"));
  if(typeof value==="boolean")return value?"true":"false";
  if(typeof value==="number"&&Number.isSafeInteger(value))return String(value);
  if(Array.isArray(value))return "["+value.map(canonical).join(",")+"]";
  if(value&&typeof value==="object"&&!Array.isArray(value)){
    return "{"+Object.keys(value).sort().map(k=>canonical(k)+":"+canonical(value[k])).join(",")+"}";
  }
  throw Error("noncanonical");
}
const sha256=value=>crypto.createHash("sha256").update(value).digest("hex");

const candidateBody={
  schema:"void_buy_void_legacy_history_disposition_candidate_v1",
  marker:VOID_BUY_VOID_LEGACY_HISTORY_DISPOSITION_CANDIDATE_V1,
  version:1,
  metadata_census_sha256:"sha256:"+"1".repeat(64),
  metadata_census_source_head:"c4a0046dbadc7eb681e78c49090c9a17373f8682",
  metadata_census_source_blob_sha1:"f8bfda9ff88a5278c950b1c23f5e1675e5362048",
  metadata_census_marker:"VOID_BUY_VOID_LEGACY_REQUEST_ROOT_CENSUS_V1",
  metadata_census_version:1,
  designated_hostname_matches:true,
  designated_runtime_user_matches:true,
  designated_machine_id_matches:true,
  bounded_current_candidate_set_observed:true,
  process_environment_access:false,
  external_network_calls:false,
  loopback_get_only:true,
  candidate_count:5,
  surviving_history_metadata_root_count:0,
  unverified_root_count:0,
  empty_shape_external_anchor_required_count:0,
  absent_root_count:4,
  technical_candidate_set_completeness_proven:false,
  technical_historical_origin_proven:false,
  filesystem_rollback_prevention_proven:false,
  decision:D.NO_PREANCHOR_CUSTOMER_LIABILITY_DECLARED,
  operator_id:"economic-owner-review",
  reviewed_at_utc:"2026-10-15T12:00:00.000Z",
  human_accounting_disposition_declared:true,
  sovereign_signature_required:true,
  external_witness_required:true,
  sovereign_signature_verified:false,
  external_witness_verified:false,
  historical_request_history_disposition_accepted:false,
  migration_authorized:false,
  stable_root_apply_authorized:false,
  payment_acceptance:false,
  public_presale_activation:false,
  funds_movement:false,
};
const candidate={
  ok:true,
  status:"DISPOSITION_CANDIDATE_REQUIRES_SOVEREIGN_SIGNATURE_AND_EXTERNAL_WITNESS",
  ...candidateBody,
  candidate_id:"voidblrhdc1_"+sha256(Buffer.from(canonical(candidateBody),"utf8")),
  authority:VOID_BUY_VOID_LEGACY_HISTORY_DISPOSITION_AUTHORITY_V1,
};

const {publicKey,privateKey}=crypto.generateKeyPairSync("ed25519");
const der=publicKey.export({type:"spki",format:"der"});
const fingerprint=sha256(der);
const publicPem=publicKey.export({type:"spki",format:"pem"});
const request=
  testOnlyBuildVoidBuyVoidLegacyHistorySovereignAuthorizationRequestAgainstFingerprintV1(
    candidate,"2026-10-15T12:05:00.000Z",fingerprint
  );
const signature=crypto.sign(
  null,
  canonicalVoidBuyVoidLegacyHistorySovereignAuthorizationPayloadV1(request),
  privateKey,
).toString("base64");
const authorization=
  assembleVoidBuyVoidLegacyHistorySovereignAuthorizationV1(request,signature);

const plan=testOnlyPlanVoidBuyVoidLegacyHistoryExternalWitnessAgainstFingerprintV1(
  {
    current_witness_jsonl:Buffer.alloc(0),
    candidate,
    authorization,
    public_key_pem:publicPem,
    witnessed_at_utc:"2026-10-15T12:06:00.000Z",
  },
  fingerprint,
);
assert.equal(plan.ok,true);
if(!plan.ok)throw Error(plan.reason||"plan hold");
assert.equal(plan.append_required,true);
assert.equal(
  plan.witness_path,
  "/var/lib/void-legacy-history-external-witness-v1/legacy-history-sovereign-authorization-v1.jsonl",
);
assert.match(plan.event.event_id,/^voidblrhw1_[0-9a-f]{64}$/u);
assert.equal(plan.event.sequence,1);
assert.equal(plan.event.previous_event_sha256,"sha256:"+"0".repeat(64));
assert.equal(plan.event.authorization_id,authorization.authorization_id);
assert.equal(plan.event.candidate_id,candidate.candidate_id);
assert.equal(plan.external_transport_authenticated,false);
assert.equal(plan.external_witness_storage_proven,false);
assert.equal(plan.external_witness_verified,false);

for(const invalidUtc of [
  "2026-02-29T00:00:00.000Z",
  "2026-02-31T12:00:00.000Z",
]){
  const invalid=testOnlyPlanVoidBuyVoidLegacyHistoryExternalWitnessAgainstFingerprintV1(
    {
      current_witness_jsonl:Buffer.alloc(0),
      candidate,
      authorization,
      public_key_pem:publicPem,
      witnessed_at_utc:invalidUtc,
    },
    fingerprint,
  );
  assert.equal(invalid.ok,false);
  assert.match(invalid.reason,/legacy_history_external_witness_time_invalid/u);
}
const leapPlan=testOnlyPlanVoidBuyVoidLegacyHistoryExternalWitnessAgainstFingerprintV1(
  {
    current_witness_jsonl:Buffer.alloc(0),
    candidate,
    authorization,
    public_key_pem:publicPem,
    witnessed_at_utc:"2028-02-29T12:00:00Z",
  },
  fingerprint,
);
assert.equal(leapPlan.ok,true);

const inspected=inspectVoidBuyVoidLegacyHistoryExternalWitnessV1(plan.next_witness_jsonl);
assert.equal(inspected.event_count,1);
assert.equal(inspected.tip_event_id,plan.event.event_id);

const readback=classifyVoidBuyVoidLegacyHistoryExternalWitnessReadbackV1({
  plan,
  observed_witness_jsonl:plan.next_witness_jsonl,
});
assert.equal(readback.ok,true);
assert.equal(readback.local_readback_bytes_match,true);
assert.equal(readback.external_witness_verified,false);

const idempotent=testOnlyPlanVoidBuyVoidLegacyHistoryExternalWitnessAgainstFingerprintV1(
  {
    current_witness_jsonl:plan.next_witness_jsonl,
    candidate,
    authorization,
    public_key_pem:publicPem,
    witnessed_at_utc:"2026-10-15T12:07:00.000Z",
  },
  fingerprint,
);
assert.equal(idempotent.ok,true);
if(!idempotent.ok)throw Error("idempotent hold");
assert.equal(idempotent.append_required,false);
assert.equal(idempotent.event.event_id,plan.event.event_id);

const candidateBBody={
  ...candidateBody,
  metadata_census_sha256:"sha256:"+"2".repeat(64),
};
const candidateB={
  ...candidate,
  ...candidateBBody,
  candidate_id:"voidblrhdc1_"+sha256(Buffer.from(canonical(candidateBBody),"utf8")),
};
const requestB=
  testOnlyBuildVoidBuyVoidLegacyHistorySovereignAuthorizationRequestAgainstFingerprintV1(
    candidateB,"2026-10-15T12:08:00.000Z",fingerprint
  );
const signatureB=crypto.sign(
  null,
  canonicalVoidBuyVoidLegacyHistorySovereignAuthorizationPayloadV1(requestB),
  privateKey,
).toString("base64");
const authorizationB=
  assembleVoidBuyVoidLegacyHistorySovereignAuthorizationV1(requestB,signatureB);
const planB=testOnlyPlanVoidBuyVoidLegacyHistoryExternalWitnessAgainstFingerprintV1(
  {
    current_witness_jsonl:plan.next_witness_jsonl,
    candidate:candidateB,
    authorization:authorizationB,
    public_key_pem:publicPem,
    witnessed_at_utc:"2026-10-15T12:09:00.000Z",
  },
  fingerprint,
);
assert.equal(planB.ok,true);
if(!planB.ok)throw Error(planB.reason||"second plan hold");
assert.equal(planB.append_required,true);
assert.notEqual(planB.event.event_id,plan.event.event_id);

const replanA=testOnlyPlanVoidBuyVoidLegacyHistoryExternalWitnessAgainstFingerprintV1(
  {
    current_witness_jsonl:planB.next_witness_jsonl,
    candidate,
    authorization,
    public_key_pem:publicPem,
    witnessed_at_utc:"2026-10-15T12:10:00.000Z",
  },
  fingerprint,
);
assert.equal(replanA.ok,true);
if(!replanA.ok)throw Error(replanA.reason||"non-tip idempotent hold");
assert.equal(replanA.append_required,false);
assert.equal(replanA.event.event_id,plan.event.event_id);
assert.ok(replanA.next_witness_jsonl.equals(planB.next_witness_jsonl));
const nonTipReadback=classifyVoidBuyVoidLegacyHistoryExternalWitnessReadbackV1({
  plan:replanA,
  observed_witness_jsonl:planB.next_witness_jsonl,
});
assert.equal(nonTipReadback.ok,true);
assert.equal(nonTipReadback.event_id,plan.event.event_id);

const missingEventPlan={
  ...replanA,
  event:{...replanA.event,event_id:"voidblrhw1_"+"f".repeat(64)},
};
assert.equal(
  classifyVoidBuyVoidLegacyHistoryExternalWitnessReadbackV1({
    plan:missingEventPlan,
    observed_witness_jsonl:planB.next_witness_jsonl,
  }).ok,
  false,
);
const tamperedHistoricalPlan={
  ...replanA,
  event:{...replanA.event,decision:D.UNRESOLVED_HOLD},
};
assert.equal(
  classifyVoidBuyVoidLegacyHistoryExternalWitnessReadbackV1({
    plan:tamperedHistoricalPlan,
    observed_witness_jsonl:planB.next_witness_jsonl,
  }).ok,
  false,
);

const secondRequest=
  testOnlyBuildVoidBuyVoidLegacyHistorySovereignAuthorizationRequestAgainstFingerprintV1(
    candidate,"2026-10-15T12:08:00.000Z",fingerprint
  );
const secondSig=crypto.sign(
  null,
  canonicalVoidBuyVoidLegacyHistorySovereignAuthorizationPayloadV1(secondRequest),
  privateKey,
).toString("base64");
const secondAuth=assembleVoidBuyVoidLegacyHistorySovereignAuthorizationV1(
  secondRequest,secondSig
);
assert.equal(
  testOnlyPlanVoidBuyVoidLegacyHistoryExternalWitnessAgainstFingerprintV1(
    {
      current_witness_jsonl:plan.next_witness_jsonl,
      candidate,
      authorization:secondAuth,
      public_key_pem:publicPem,
      witnessed_at_utc:"2026-10-15T12:09:00.000Z",
    },
    fingerprint,
  ).ok,
  false,
);

const early=testOnlyPlanVoidBuyVoidLegacyHistoryExternalWitnessAgainstFingerprintV1(
  {
    current_witness_jsonl:Buffer.alloc(0),
    candidate,
    authorization,
    public_key_pem:publicPem,
    witnessed_at_utc:"2026-10-15T12:04:00.000Z",
  },
  fingerprint,
);
assert.equal(early.ok,false);

const tampered=Buffer.from(plan.next_witness_jsonl);
tampered[tampered.length-2]^=1;
assert.throws(
  ()=>inspectVoidBuyVoidLegacyHistoryExternalWitnessV1(tampered),
  /legacy_history_external_witness_/u,
);
assert.equal(
  classifyVoidBuyVoidLegacyHistoryExternalWitnessReadbackV1({
    plan,
    observed_witness_jsonl:Buffer.concat([plan.next_witness_jsonl,Buffer.from("\n")]),
  }).ok,
  false,
);

assert.equal(
  VOID_BUY_VOID_LEGACY_HISTORY_EXTERNAL_WITNESS_PATH_V1,
  "/var/lib/void-legacy-history-external-witness-v1/legacy-history-sovereign-authorization-v1.jsonl",
);
for(const [key,expected] of Object.entries({
  source_only_witness_planner:true,
  fixed_witness_path_selected:true,
  canonical_jsonl_required:true,
  append_only_sequence_required:true,
  hash_chain_required:true,
  exact_authorization_verification_required:true,
  authorization_candidate_binding_required:true,
  same_candidate_conflicting_authorization_rejected:true,
  exact_idempotence_supported:true,
  local_readback_classifier_only:true,
  external_transport_authenticated:false,
  external_witness_storage_proven:false,
  live_remote_append_performed:false,
  live_remote_read_performed:false,
  external_witness_verified:false,
  historical_request_history_disposition_accepted:false,
  stable_root_apply_authorized:false,
  filesystem_write:false,
  service_mutation:false,
  request_or_payment_contents_read:false,
  private_key_access:false,
  payment_acceptance:false,
  public_presale_activation:false,
  funds_movement:false,
})){
  assert.equal(VOID_BUY_VOID_LEGACY_HISTORY_EXTERNAL_WITNESS_AUTHORITY_V1[key],expected,key);
}

console.log("VOID_BUY_VOID_LEGACY_HISTORY_EXTERNAL_WITNESS_V1_PROOF_GREEN");
console.log("fixed_witness_path_selected=true");
console.log("signed_authorization_reverified_before_plan=true");
console.log("append_only_hash_chain_verified=true");
console.log("same_candidate_conflicting_authorization_rejected=true");
console.log("exact_idempotence_supported=true");
console.log("local_readback_bytes_match=true");
console.log("external_transport_authenticated=false");
console.log("external_witness_storage_proven=false");
console.log("external_witness_verified=false");
console.log("historical_request_history_disposition_accepted=false");
console.log("stable_root_apply_authorized=false");
console.log("funds_movement=false");
