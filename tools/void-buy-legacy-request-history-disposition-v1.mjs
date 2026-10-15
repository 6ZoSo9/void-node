#!/usr/bin/env node
import crypto from "node:crypto";

export const VOID_BUY_VOID_LEGACY_HISTORY_DISPOSITION_CANDIDATE_V1 =
  "VOID_BUY_VOID_LEGACY_HISTORY_DISPOSITION_CANDIDATE_V1";

export const VOID_BUY_VOID_LEGACY_HISTORY_DISPOSITION_DECISIONS_V1 =
  Object.freeze({
    NO_PREANCHOR_CUSTOMER_LIABILITY_DECLARED:
      "NO_PREANCHOR_CUSTOMER_LIABILITY_DECLARED",
    SURVIVING_HISTORY_REQUIRES_MIGRATION:
      "SURVIVING_HISTORY_REQUIRES_MIGRATION",
    UNRESOLVED_HOLD:
      "UNRESOLVED_HOLD",
  });

export const VOID_BUY_VOID_LEGACY_HISTORY_DISPOSITION_AUTHORITY_V1 =
  Object.freeze({
    source_only_candidate: true,
    human_accounting_disposition_may_be_recorded: true,
    technical_historical_origin_proven: false,
    technical_candidate_set_completeness_proven: false,
    bounded_current_candidate_set_required_for_disposition: true,
    designated_runtime_user_required: true,
    process_environment_access_forbidden: true,
    external_network_access_forbidden: true,
    cryptographic_never_used_proof_claimed: false,
    sovereign_signature_required_for_acceptance: true,
    external_witness_required_for_acceptance: true,
    sovereign_signature_verified: false,
    external_witness_verified: false,
    historical_request_history_disposition_accepted: false,
    migration_authorized: false,
    stable_root_apply_authorized: false,
    service_mutation: false,
    filesystem_write: false,
    request_or_payment_contents_read: false,
    payment_acceptance: false,
    public_presale_activation: false,
    funds_movement: false,
  });

const SHA256_ID=/^sha256:[0-9a-f]{64}$/u;
const SAFE_OPERATOR=/^[A-Za-z0-9_.:@/-]{1,128}$/u;
const UTC=/^20[0-9]{2}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\.[0-9]{3})?Z$/u;
const INPUT_KEYS=Object.freeze([
  "metadata_census_sha256",
  "metadata_census_source_head",
  "designated_hostname_matches",
  "designated_runtime_user_matches",
  "designated_machine_id_matches",
  "bounded_current_candidate_set_observed",
  "process_environment_access",
  "external_network_calls",
  "loopback_get_only",
  "candidate_count",
  "surviving_history_metadata_root_count",
  "unverified_root_count",
  "empty_shape_external_anchor_required_count",
  "request_or_payment_contents_read",
  "metadata_census_historical_disposition_proven",
  "decision",
  "operator_id",
  "reviewed_at_utc",
]);
const SHA1=/^[0-9a-f]{40}$/u;

function fail(code){throw new Error(code);}
function exactObject(value,keys,code){
  if(!value||typeof value!=="object"||Array.isArray(value))fail(code);
  const got=Object.keys(value).sort(),want=[...keys].sort();
  if(got.length!==want.length||got.some((x,i)=>x!==want[i]))fail(code);
  return value;
}
function count(value,code){
  if(!Number.isSafeInteger(value)||value<0||value>1000000)fail(code);
  return value;
}
function canonical(value){
  if(value===null)return "null";
  if(typeof value==="string")return JSON.stringify(value);
  if(typeof value==="boolean")return value?"true":"false";
  if(typeof value==="number"&&Number.isSafeInteger(value))return String(value);
  if(Array.isArray(value))return "["+value.map(canonical).join(",")+"]";
  if(value&&typeof value==="object"&&!Array.isArray(value)){
    return "{"+Object.keys(value).sort()
      .map(key=>JSON.stringify(key)+":"+canonical(value[key])).join(",")+"}";
  }
  fail("legacy_history_disposition_noncanonical_value");
}
function sha256(value){
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function classifyVoidBuyVoidLegacyHistoryDispositionCandidateV1(input){
  try{
    const v=exactObject(input,INPUT_KEYS,"legacy_history_disposition_input_shape_invalid");
    if(!SHA256_ID.test(String(v.metadata_census_sha256||""))){
      fail("legacy_history_disposition_census_sha_invalid");
    }
    if(!SHA1.test(String(v.metadata_census_source_head||""))){
      fail("legacy_history_disposition_census_source_head_invalid");
    }
    if(
      v.designated_hostname_matches!==true||
      v.designated_runtime_user_matches!==true||
      v.designated_machine_id_matches!==true
    ){
      fail("legacy_history_disposition_designated_host_unbound");
    }
    if(
      v.request_or_payment_contents_read!==false||
      v.process_environment_access!==false||
      v.external_network_calls!==false||
      v.loopback_get_only!==true
    ){
      fail("legacy_history_disposition_metadata_census_scope_invalid");
    }
    if(v.metadata_census_historical_disposition_proven!==false){
      fail("legacy_history_disposition_census_overclaim");
    }
    const candidateCount=count(v.candidate_count,"legacy_history_disposition_candidate_count_invalid");
    const surviving=count(
      v.surviving_history_metadata_root_count,
      "legacy_history_disposition_surviving_count_invalid",
    );
    const unverified=count(v.unverified_root_count,"legacy_history_disposition_unverified_count_invalid");
    const emptyShape=count(
      v.empty_shape_external_anchor_required_count,
      "legacy_history_disposition_empty_shape_count_invalid",
    );
    if(surviving+unverified+emptyShape>candidateCount){
      fail("legacy_history_disposition_counts_inconsistent");
    }
    if(!SAFE_OPERATOR.test(String(v.operator_id||""))){
      fail("legacy_history_disposition_operator_id_invalid");
    }
    if(!UTC.test(String(v.reviewed_at_utc||""))||
       !Number.isFinite(Date.parse(v.reviewed_at_utc))){
      fail("legacy_history_disposition_review_time_invalid");
    }

    const decisions=VOID_BUY_VOID_LEGACY_HISTORY_DISPOSITION_DECISIONS_V1;
    if(!Object.values(decisions).includes(v.decision)){
      fail("legacy_history_disposition_decision_invalid");
    }
    if(v.bounded_current_candidate_set_observed!==true&&
       v.decision!==decisions.UNRESOLVED_HOLD){
      fail("legacy_history_disposition_incomplete_bounded_census_requires_hold");
    }
    if(unverified>0&&v.decision!==decisions.UNRESOLVED_HOLD){
      fail("legacy_history_disposition_unverified_requires_hold");
    }
    if(surviving>0&&unverified===0&&
       v.decision!==decisions.SURVIVING_HISTORY_REQUIRES_MIGRATION){
      fail("legacy_history_disposition_surviving_requires_migration");
    }
    if(surviving===0&&unverified===0&&
       v.decision===decisions.SURVIVING_HISTORY_REQUIRES_MIGRATION){
      fail("legacy_history_disposition_migration_without_surviving_history");
    }
    if(v.decision===decisions.NO_PREANCHOR_CUSTOMER_LIABILITY_DECLARED&&
       (surviving!==0||unverified!==0)){
      fail("legacy_history_disposition_no_liability_requires_no_surviving_or_unverified_roots");
    }

    const body=Object.freeze({
      schema:"void_buy_void_legacy_history_disposition_candidate_v1",
      marker:VOID_BUY_VOID_LEGACY_HISTORY_DISPOSITION_CANDIDATE_V1,
      version:1,
      metadata_census_sha256:v.metadata_census_sha256,
      metadata_census_source_head:v.metadata_census_source_head,
      designated_hostname_matches:true,
      designated_runtime_user_matches:true,
      designated_machine_id_matches:true,
      bounded_current_candidate_set_observed:
        v.bounded_current_candidate_set_observed===true,
      process_environment_access:false,
      external_network_calls:false,
      loopback_get_only:true,
      candidate_count:candidateCount,
      surviving_history_metadata_root_count:surviving,
      unverified_root_count:unverified,
      empty_shape_external_anchor_required_count:emptyShape,
      technical_candidate_set_completeness_proven:false,
      technical_historical_origin_proven:false,
      filesystem_rollback_prevention_proven:false,
      decision:v.decision,
      operator_id:v.operator_id,
      reviewed_at_utc:v.reviewed_at_utc,
      human_accounting_disposition_declared:
        v.decision!==decisions.UNRESOLVED_HOLD,
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
    });
    return Object.freeze({
      ok:true,
      status:
        v.decision===decisions.UNRESOLVED_HOLD
          ?"UNRESOLVED_HOLD_CANDIDATE"
          :"DISPOSITION_CANDIDATE_REQUIRES_SOVEREIGN_SIGNATURE_AND_EXTERNAL_WITNESS",
      ...body,
      candidate_id:"voidblrhdc1_"+sha256(canonical(body)),
      authority:VOID_BUY_VOID_LEGACY_HISTORY_DISPOSITION_AUTHORITY_V1,
    });
  }catch(error){
    return Object.freeze({
      ok:false,
      status:"HOLD",
      marker:VOID_BUY_VOID_LEGACY_HISTORY_DISPOSITION_CANDIDATE_V1,
      reason:error instanceof Error?error.message:String(error),
      sovereign_signature_verified:false,
      external_witness_verified:false,
      historical_request_history_disposition_accepted:false,
      stable_root_apply_authorized:false,
      payment_acceptance:false,
      public_presale_activation:false,
      funds_movement:false,
      authority:VOID_BUY_VOID_LEGACY_HISTORY_DISPOSITION_AUTHORITY_V1,
    });
  }
}
