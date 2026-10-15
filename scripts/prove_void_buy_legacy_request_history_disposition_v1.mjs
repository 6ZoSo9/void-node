#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import {readFileSync} from "node:fs";
import {
  VOID_BUY_VOID_LEGACY_HISTORY_DISPOSITION_AUTHORITY_V1 as AUTH,
  VOID_BUY_VOID_LEGACY_HISTORY_DISPOSITION_DECISIONS_V1 as D,
  VOID_BUY_VOID_LEGACY_HISTORY_DISPOSITION_PARENT_V1 as PARENT,
  classifyVoidBuyVoidLegacyHistoryDispositionCandidateV1 as classify,
} from "../tools/void-buy-legacy-request-history-disposition-v1.mjs";

function asciiJsonString(value){
  return JSON.stringify(value).replace(/[\u007f-\uffff]/g,(ch)=>
    "\\u"+ch.charCodeAt(0).toString(16).padStart(4,"0")
  );
}
function canonical(value){
  if(value===null)return "null";
  if(typeof value==="string")return asciiJsonString(value);
  if(typeof value==="boolean")return value?"true":"false";
  if(typeof value==="number"&&Number.isSafeInteger(value))return String(value);
  if(Array.isArray(value))return "["+value.map(canonical).join(",")+"]";
  if(value&&typeof value==="object"&&!Array.isArray(value)){
    return "{"+Object.keys(value).sort()
      .map(key=>asciiJsonString(key)+":"+canonical(value[key])).join(",")+"}";
  }
  throw new Error("noncanonical_fixture_value");
}
const sha256=(raw)=>
  "sha256:"+crypto.createHash("sha256").update(raw,"utf8").digest("hex");

function gitBlobSha1(raw){
  const prefix=Buffer.from("blob "+String(raw.length)+"\0","utf8");
  return crypto.createHash("sha1").update(prefix).update(raw).digest("hex");
}
const acceptedParentSource=readFileSync(PARENT.source_path);
assert.equal(gitBlobSha1(acceptedParentSource),PARENT.accepted_source_blob_sha1);

function row(path,sources,classification){
  return {
    path,
    sources,
    metadata:{exists:false},
    symlink_ancestor_observed:false,
    directory_enumerated_for_count_only:false,
    directory_entry_names_output:false,
    request_or_payment_contents_read:false,
    direct_entry_count:null,
    other_direct_entry_count:null,
    fixed_journals:{},
    classification,
  };
}
const cleanRows=()=>[
  row(
    "/home/zoso/dev/void-node/.runtime/public-buy-void-requests-v1",
    ["repo_default"],
    "ABSENT_OBSERVED",
  ),
  row(
    "/opt/void-node-live/releases/"+"a".repeat(40)+
      "/.runtime/public-buy-void-requests-v1",
    ["immutable_release_default"],
    "ZERO_LENGTH_FIXED_JOURNALS_OBSERVED_EXTERNAL_ANCHOR_REQUIRED",
  ),
  row(
    "/var/lib/void-buy-request-journal-v1",
    ["selected_future_stable_root"],
    "ABSENT_OBSERVED",
  ),
];

function evidence(rows=cleanRows(),overrides={}){
  const historical=rows.filter(
    item=>!item.sources.includes("selected_future_stable_root"),
  );
  const surviving=historical.filter(
    item=>item.classification==="SURVIVING_HISTORY_METADATA_OBSERVED",
  ).map(item=>item.path);
  const unverified=historical.filter(
    item=>item.classification.startsWith("HOLD_")||
      item.classification.startsWith("UNVERIFIED_"),
  ).map(item=>item.path);
  const emptyShape=historical.filter(
    item=>item.classification.includes("EXTERNAL_ANCHOR_REQUIRED"),
  ).map(item=>item.path);
  const absent=historical.filter(
    item=>item.classification==="ABSENT_OBSERVED",
  ).map(item=>item.path);
  return {
    marker:PARENT.marker,
    version:PARENT.version,
    read_only:true,
    designated_hostname_matches:true,
    designated_runtime_user_matches:true,
    effective_uid:1000,
    designated_machine_id_matches:true,
    service:{
      status:0,
      load_state:"loaded",
      active_state:"active",
      sub_state:"running",
      main_pid:4242,
      working_directory:"/home/zoso/dev/void-node",
      live_process_cwd:"/opt/void-node-live/releases/"+"b".repeat(40),
    },
    process_environment_access:false,
    external_network_calls:false,
    loopback_get_only:true,
    runtime_process_generation_stable:true,
    runtime_http_listener_stable:true,
    confirmed_closeout_request_root_status:{
      observed:true,
      source:"server_default",
      request_dir:"/opt/void-node-live/releases/"+"b".repeat(40)+
        "/.runtime/public-buy-void-requests-v1",
    },
    confirmed_closeout_request_root_status_stable:true,
    immutable_release_count:1,
    immutable_release_inventory_complete:true,
    immutable_release_inventory_stable:true,
    candidate_observations_stable:true,
    candidate_set_completeness_proven:false,
    bounded_current_candidate_set_observed:true,
    candidate_count:rows.length,
    candidates:rows,
    historical_candidate_count:historical.length,
    surviving_history_metadata_root_count:surviving.length,
    surviving_history_metadata_roots:surviving,
    unverified_root_count:unverified.length,
    unverified_roots:unverified,
    empty_shape_external_anchor_required_count:emptyShape.length,
    empty_shape_external_anchor_required_roots:emptyShape,
    absent_root_count:absent.length,
    historical_request_history_disposition_proven:false,
    historical_origin_authenticated:false,
    filesystem_rollback_prevention_proven:false,
    migration_authorized:false,
    request_or_payment_contents_read:false,
    directory_entry_names_output:false,
    host_mutation:false,
    payment_acceptance:false,
    public_presale_activation:false,
    funds_movement:false,
    production_gate_ready:false,
    next_action:
      surviving.length>0||unverified.length>0
        ?"REVIEW_SURVIVING_HISTORY_BEFORE_DISPOSITION"
        :"EXPLICIT_LEGACY_HISTORY_DISPOSITION_AND_EXTERNAL_WITNESS_REQUIRED",
    ...overrides,
  };
}
function input(census,{
  decision=D.NO_PREANCHOR_CUSTOMER_LIABILITY_DECLARED,
  sourceHead=PARENT.accepted_source_head,
  raw=canonical(census),
}={}){
  return {
    metadata_census_json:raw,
    metadata_census_source_head:sourceHead,
    decision,
    operator_id:"economic-owner-review",
    reviewed_at_utc:"2026-10-15T04:45:00.000Z",
  };
}

assert.equal(
  PARENT.accepted_source_head,
  "4c9dbe0d05865911ae55db88d1d2c05ce7c5306c",
);

const cleanEvidence=evidence();
const cleanRaw=canonical(cleanEvidence);
const clean=classify(input(cleanEvidence,{raw:cleanRaw}));
assert.equal(clean.ok,true);
assert.match(clean.candidate_id,/^voidblrhdc1_[0-9a-f]{64}$/u);
assert.equal(clean.metadata_census_sha256,sha256(cleanRaw));
assert.equal(clean.metadata_census_source_head,PARENT.accepted_source_head);
assert.equal(
  clean.metadata_census_source_blob_sha1,
  PARENT.accepted_source_blob_sha1,
);
assert.equal(clean.bounded_current_candidate_set_observed,true);
assert.equal(clean.human_accounting_disposition_declared,true);
assert.equal(clean.technical_historical_origin_proven,false);
assert.equal(clean.technical_candidate_set_completeness_proven,false);
assert.equal(clean.sovereign_signature_verified,false);
assert.equal(clean.external_witness_verified,false);
assert.equal(clean.historical_request_history_disposition_accepted,false);
assert.equal(clean.stable_root_apply_authorized,false);

const survivingRows=cleanRows();
survivingRows[0]={
  ...survivingRows[0],
  classification:"SURVIVING_HISTORY_METADATA_OBSERVED",
};
const survivingEvidence=evidence(survivingRows);
const surviving=classify(input(survivingEvidence,{
  decision:D.SURVIVING_HISTORY_REQUIRES_MIGRATION,
}));
assert.equal(surviving.ok,true);
assert.equal(surviving.surviving_history_metadata_root_count,1);
assert.equal(surviving.human_accounting_disposition_declared,true);
assert.equal(surviving.migration_authorized,false);
assert.equal(classify(input(survivingEvidence)).ok,false);

const holdRows=cleanRows();
holdRows[0]={
  ...holdRows[0],
  classification:"HOLD_UNVERIFIED_HISTORY_METADATA",
};
const holdEvidence=evidence(holdRows);
const unresolved=classify(input(holdEvidence,{decision:D.UNRESOLVED_HOLD}));
assert.equal(unresolved.ok,true);
assert.equal(unresolved.human_accounting_disposition_declared,false);
assert.equal(classify(input(holdEvidence)).ok,false);

const incompleteEvidence=evidence(cleanRows(),{
  runtime_http_listener_stable:false,
  bounded_current_candidate_set_observed:false,
});
const incomplete=classify(input(incompleteEvidence));
assert.equal(incomplete.ok,false);
assert.equal(
  incomplete.reason,
  "legacy_history_disposition_incomplete_bounded_census_requires_hold",
);
const incompleteHold=classify(input(incompleteEvidence,{decision:D.UNRESOLVED_HOLD}));
assert.equal(incompleteHold.ok,true);

const unavailableEvidence=evidence(cleanRows(),{
  service:{
    status:3,
    load_state:"loaded",
    active_state:"inactive",
    sub_state:"dead",
    main_pid:null,
    working_directory:null,
    live_process_cwd:null,
  },
  runtime_process_generation_stable:false,
  runtime_http_listener_stable:false,
  confirmed_closeout_request_root_status:{
    observed:false,
    source:null,
    request_dir:null,
  },
  confirmed_closeout_request_root_status_stable:false,
  bounded_current_candidate_set_observed:false,
});
assert.equal(classify(input(unavailableEvidence)).ok,false);
assert.equal(classify(input(unavailableEvidence,{
  decision:D.UNRESOLVED_HOLD,
})).ok,true);

for(const unsafe of [
  {process_environment_access:true},
  {external_network_calls:true},
  {loopback_get_only:false},
  {designated_runtime_user_matches:false},
  {designated_machine_id_matches:false},
  {request_or_payment_contents_read:true},
]){
  assert.equal(classify(input(evidence(cleanRows(),unsafe))).ok,false);
}

assert.equal(classify(input(cleanEvidence,{
  sourceHead:"c".repeat(40),
})).ok,false);
assert.equal(classify(input(cleanEvidence,{
  raw:cleanRaw+"\n",
})).ok,false);

const mismatch=evidence(cleanRows(),{
  surviving_history_metadata_root_count:1,
});
assert.equal(classify(input(mismatch)).ok,false);

const truncated=evidence();
delete truncated.candidate_observations_stable;
assert.equal(classify(input(truncated)).ok,false);

const duplicateRows=cleanRows();
duplicateRows[1]={...duplicateRows[1],path:duplicateRows[0].path};
assert.equal(classify(input(evidence(duplicateRows))).ok,false);

const unknownRows=cleanRows();
unknownRows[0]={...unknownRows[0],classification:"MYSTERY"};
assert.equal(classify(input(evidence(unknownRows))).ok,false);

for(const [key,expected] of Object.entries({
  source_only_candidate:true,
  human_accounting_disposition_may_be_recorded:true,
  exact_census_evidence_bytes_required:true,
  exact_census_source_head_required:true,
  exact_census_source_blob_required:true,
  census_sha256_computed_internally:true,
  census_partitions_derived_internally:true,
  bounded_current_candidate_set_required_for_no_liability:true,
  designated_runtime_user_required:true,
  process_environment_access_forbidden:true,
  external_network_access_forbidden:true,
  technical_historical_origin_proven:false,
  technical_candidate_set_completeness_proven:false,
  cryptographic_never_used_proof_claimed:false,
  sovereign_signature_required_for_acceptance:true,
  external_witness_required_for_acceptance:true,
  sovereign_signature_verified:false,
  external_witness_verified:false,
  historical_request_history_disposition_accepted:false,
  migration_authorized:false,
  stable_root_apply_authorized:false,
  service_mutation:false,
  filesystem_write:false,
  request_or_payment_contents_read:false,
  payment_acceptance:false,
  public_presale_activation:false,
  funds_movement:false,
})){
  assert.equal(AUTH[key],expected,key);
}

console.log("VOID_BUY_VOID_LEGACY_HISTORY_DISPOSITION_CANDIDATE_V1_PROOF_GREEN");
console.log("exact_census_evidence_bytes_required=true");
console.log("exact_census_source_head_required=true");
console.log("exact_census_source_blob_required=true");
console.log("census_sha256_computed_internally=true");
console.log("census_partitions_derived_internally=true");
console.log("fabricated_summary_rejected=true");
console.log("incomplete_census_hold_preserved=true");
console.log("bounded_current_candidate_set_required=true");
console.log("designated_runtime_user_required=true");
console.log("process_environment_access_forbidden=true");
console.log("external_network_access_forbidden=true");
console.log("technical_never_used_proof_claimed=false");
console.log("human_accounting_disposition_separate_from_technical_origin=true");
console.log("surviving_history_requires_migration_disposition=true");
console.log("unverified_history_requires_hold=true");
console.log("sovereign_signature_required=true");
console.log("external_witness_required=true");
console.log("historical_request_history_disposition_accepted=false");
console.log("stable_root_apply_authorized=false");
console.log("payment_acceptance=false");
console.log("public_presale_activation=false");
console.log("funds_movement=false");
