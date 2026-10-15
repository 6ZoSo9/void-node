#!/usr/bin/env node
import crypto from "node:crypto";

import {
  VOID_BUY_VOID_LEGACY_HISTORY_SOVEREIGN_AUTHORIZATION_AUTHORITY_V1,
  VOID_BUY_VOID_LEGACY_HISTORY_SOVEREIGN_AUTHORIZATION_V1,
  verifyVoidBuyVoidLegacyHistorySovereignAuthorizationV1,
  testOnlyVerifyVoidBuyVoidLegacyHistorySovereignAuthorizationAgainstFingerprintV1,
} from "./void-buy-legacy-request-history-sovereign-authorization-v1.mjs";
import {
  VOID_BUY_VOID_LEGACY_HISTORY_DISPOSITION_DECISIONS_V1,
} from "./void-buy-legacy-request-history-disposition-v1.mjs";

export const VOID_BUY_VOID_LEGACY_HISTORY_EXTERNAL_WITNESS_V1 =
  "VOID_BUY_VOID_LEGACY_HISTORY_EXTERNAL_WITNESS_V1";
export const VOID_BUY_VOID_LEGACY_HISTORY_EXTERNAL_WITNESS_EVENT_V1 =
  "VOID_BUY_VOID_LEGACY_HISTORY_EXTERNAL_WITNESS_EVENT_V1";
export const VOID_BUY_VOID_LEGACY_HISTORY_EXTERNAL_WITNESS_PATH_V1 =
  "/var/lib/void-legacy-history-external-witness-v1/legacy-history-sovereign-authorization-v1.jsonl";

export const VOID_BUY_VOID_LEGACY_HISTORY_EXTERNAL_WITNESS_AUTHORITY_V1 =
  Object.freeze({
    source_only_witness_planner: true,
    fixed_witness_path_selected: true,
    canonical_jsonl_required: true,
    append_only_sequence_required: true,
    hash_chain_required: true,
    exact_authorization_verification_required: true,
    authorization_candidate_binding_required: true,
    same_candidate_conflicting_authorization_rejected: true,
    exact_idempotence_supported: true,
    local_readback_classifier_only: true,
    external_transport_authenticated: false,
    external_witness_storage_proven: false,
    live_remote_append_performed: false,
    live_remote_read_performed: false,
    external_witness_verified: false,
    historical_request_history_disposition_accepted: false,
    stable_root_apply_authorized: false,
    filesystem_write: false,
    service_mutation: false,
    request_or_payment_contents_read: false,
    private_key_access: false,
    payment_acceptance: false,
    public_presale_activation: false,
    funds_movement: false,
  });

const D=VOID_BUY_VOID_LEGACY_HISTORY_DISPOSITION_DECISIONS_V1;
const ZERO_SHA256="sha256:"+"0".repeat(64);
const SHA256_ID=/^sha256:[0-9a-f]{64}$/u;
const HEX64=/^[0-9a-f]{64}$/u;
const CANDIDATE_ID=/^voidblrhdc1_[0-9a-f]{64}$/u;
const REQUEST_ID=/^voidblrhsr1_[0-9a-f]{64}$/u;
const AUTH_ID=/^voidblrhsa1_[0-9a-f]{64}$/u;
const EVENT_ID=/^voidblrhw1_[0-9a-f]{64}$/u;
const UTC=/^20[0-9]{2}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\.[0-9]{3})?Z$/u;
const MAX_WITNESS_BYTES=4*1024*1024;
const MAX_EVENTS=4096;
const EVENT_BODY_KEYS=Object.freeze([
  "schema","marker","version","sequence","previous_event_sha256",
  "authorization_id","request_id","candidate_id","decision",
  "candidate_canonical_sha256","authorization_canonical_sha256",
  "signer_public_key_der_sha256","witnessed_at_utc",
]);
const EVENT_KEYS=Object.freeze([...EVENT_BODY_KEYS,"event_id"]);

function fail(code){throw new Error(code);}
function exactObject(value,keys,code){
  if(!value||typeof value!=="object"||Array.isArray(value))fail(code);
  const got=Object.keys(value).sort(),want=[...keys].sort();
  if(got.length!==want.length||got.some((x,i)=>x!==want[i]))fail(code);
  return value;
}
function canonical(value){
  if(value===null)return "null";
  if(typeof value==="string")return JSON.stringify(value).replace(/[\u007f-\uffff]/g,
    ch=>"\\u"+ch.charCodeAt(0).toString(16).padStart(4,"0"));
  if(typeof value==="boolean")return value?"true":"false";
  if(typeof value==="number"&&Number.isSafeInteger(value))return String(value);
  if(Array.isArray(value))return "["+value.map(canonical).join(",")+"]";
  if(value&&typeof value==="object"&&!Array.isArray(value)){
    return "{"+Object.keys(value).sort()
      .map(key=>canonical(key)+":"+canonical(value[key])).join(",")+"}";
  }
  fail("legacy_history_external_witness_noncanonical_value");
}
function sha256(value){
  return crypto.createHash("sha256").update(value).digest("hex");
}
function utc(value,code){
  if(typeof value!=="string"||!UTC.test(value)||!Number.isFinite(Date.parse(value)))fail(code);
  return value;
}
function asBuffer(value){
  if(Buffer.isBuffer(value))return Buffer.from(value);
  if(typeof value==="string")return Buffer.from(value,"utf8");
  fail("legacy_history_external_witness_bytes_invalid");
}
function eventBody(event){
  return Object.freeze(Object.fromEntries(EVENT_BODY_KEYS.map(key=>[key,event[key]])));
}
function eventHash(event){
  return "sha256:"+sha256(Buffer.from(canonical(event),"utf8"));
}
function validateEvent(raw,expectedSequence,expectedPrevious){
  const event=exactObject(raw,EVENT_KEYS,"legacy_history_external_witness_event_shape_invalid");
  if(
    event.schema!=="void_buy_void_legacy_history_external_witness_event_v1"||
    event.marker!==VOID_BUY_VOID_LEGACY_HISTORY_EXTERNAL_WITNESS_EVENT_V1||
    event.version!==1||
    event.sequence!==expectedSequence||
    event.previous_event_sha256!==expectedPrevious||
    !AUTH_ID.test(String(event.authorization_id||""))||
    !REQUEST_ID.test(String(event.request_id||""))||
    !CANDIDATE_ID.test(String(event.candidate_id||""))||
    !Object.values(D).includes(event.decision)||
    !HEX64.test(String(event.candidate_canonical_sha256||""))||
    !HEX64.test(String(event.authorization_canonical_sha256||""))||
    !HEX64.test(String(event.signer_public_key_der_sha256||""))
  )fail("legacy_history_external_witness_event_invalid");
  utc(event.witnessed_at_utc,"legacy_history_external_witness_time_invalid");
  const body=eventBody(event);
  const expectedId="voidblrhw1_"+sha256(Buffer.from(canonical(body),"utf8"));
  if(!EVENT_ID.test(String(event.event_id||""))||event.event_id!==expectedId){
    fail("legacy_history_external_witness_event_id_invalid");
  }
  return Object.freeze({...event});
}
export function inspectVoidBuyVoidLegacyHistoryExternalWitnessV1(bytes){
  const buffer=asBuffer(bytes);
  if(buffer.length>MAX_WITNESS_BYTES)fail("legacy_history_external_witness_too_large");
  if(buffer.length===0){
    return Object.freeze({
      events:Object.freeze([]),
      event_count:0,
      tip_event_id:null,
      tip_event_sha256:ZERO_SHA256,
      canonical_jsonl:true,
    });
  }
  if(buffer.at(-1)!==0x0a)fail("legacy_history_external_witness_unterminated");
  const raw=buffer.toString("utf8");
  const lines=raw.slice(0,-1).split("\n");
  if(lines.length<1||lines.length>MAX_EVENTS||lines.some(line=>line.length===0)){
    fail("legacy_history_external_witness_line_count_invalid");
  }
  const events=[];
  const authorizations=new Set();
  const candidates=new Set();
  let previous=ZERO_SHA256;
  for(let index=0;index<lines.length;index+=1){
    let parsed;
    try{parsed=JSON.parse(lines[index]);}
    catch{fail("legacy_history_external_witness_json_invalid");}
    const event=validateEvent(parsed,index+1,previous);
    if(lines[index]!==canonical(event)){
      fail("legacy_history_external_witness_wire_noncanonical");
    }
    if(authorizations.has(event.authorization_id)){
      fail("legacy_history_external_witness_duplicate_authorization");
    }
    if(candidates.has(event.candidate_id)){
      fail("legacy_history_external_witness_duplicate_candidate");
    }
    authorizations.add(event.authorization_id);
    candidates.add(event.candidate_id);
    events.push(event);
    previous=eventHash(event);
  }
  return Object.freeze({
    events:Object.freeze(events),
    event_count:events.length,
    tip_event_id:events.at(-1).event_id,
    tip_event_sha256:previous,
    canonical_jsonl:true,
  });
}
function planWithVerifier(input,verifyAuthorization){
  try{
    const v=exactObject(
      input,
      ["current_witness_jsonl","candidate","authorization","public_key_pem","witnessed_at_utc"],
      "legacy_history_external_witness_input_shape_invalid",
    );
    const verification=verifyAuthorization({
      candidate:v.candidate,
      authorization:v.authorization,
      public_key_pem:v.public_key_pem,
    });
    if(verification?.ok!==true||
       verification.marker!==VOID_BUY_VOID_LEGACY_HISTORY_SOVEREIGN_AUTHORIZATION_V1||
       verification.sovereign_signature_verified!==true||
       verification.external_witness_verified!==false||
       verification.historical_request_history_disposition_accepted!==false||
       verification.stable_root_apply_authorized!==false){
      fail("legacy_history_external_witness_authorization_unverified");
    }
    const witnessedAt=utc(v.witnessed_at_utc,
      "legacy_history_external_witness_time_invalid");
    if(Date.parse(witnessedAt)<Date.parse(v.authorization.authorization_issued_at_utc)){
      fail("legacy_history_external_witness_predates_authorization");
    }
    const current=asBuffer(v.current_witness_jsonl);
    const inspected=inspectVoidBuyVoidLegacyHistoryExternalWitnessV1(current);
    const authorizationSha=sha256(Buffer.from(canonical(v.authorization),"utf8"));
    const exactExisting=inspected.events.find(event=>
      event.authorization_id===verification.authorization_id
    );
    if(exactExisting){
      if(
        exactExisting.request_id!==verification.request_id||
        exactExisting.candidate_id!==verification.candidate_id||
        exactExisting.decision!==verification.decision||
        exactExisting.candidate_canonical_sha256!==verification.candidate_canonical_sha256||
        exactExisting.authorization_canonical_sha256!==authorizationSha||
        exactExisting.signer_public_key_der_sha256!==verification.signer_public_key_der_sha256
      )fail("legacy_history_external_witness_existing_authorization_conflict");
      return Object.freeze({
        ok:true,
        status:"ALREADY_WITNESSED_EXACT_SOURCE_ONLY",
        marker:VOID_BUY_VOID_LEGACY_HISTORY_EXTERNAL_WITNESS_V1,
        version:1,
        witness_path:VOID_BUY_VOID_LEGACY_HISTORY_EXTERNAL_WITNESS_PATH_V1,
        append_required:false,
        event:exactExisting,
        append_line:null,
        next_witness_jsonl:Buffer.from(current),
        local_readback_expected_sha256:"sha256:"+sha256(current),
        external_transport_authenticated:false,
        external_witness_storage_proven:false,
        live_remote_append_performed:false,
        live_remote_read_performed:false,
        external_witness_verified:false,
        historical_request_history_disposition_accepted:false,
        stable_root_apply_authorized:false,
        payment_acceptance:false,
        public_presale_activation:false,
        funds_movement:false,
        authority:VOID_BUY_VOID_LEGACY_HISTORY_EXTERNAL_WITNESS_AUTHORITY_V1,
      });
    }
    if(inspected.events.some(event=>event.candidate_id===verification.candidate_id)){
      fail("legacy_history_external_witness_candidate_conflict");
    }
    const body=Object.freeze({
      schema:"void_buy_void_legacy_history_external_witness_event_v1",
      marker:VOID_BUY_VOID_LEGACY_HISTORY_EXTERNAL_WITNESS_EVENT_V1,
      version:1,
      sequence:inspected.event_count+1,
      previous_event_sha256:inspected.tip_event_sha256,
      authorization_id:verification.authorization_id,
      request_id:verification.request_id,
      candidate_id:verification.candidate_id,
      decision:verification.decision,
      candidate_canonical_sha256:verification.candidate_canonical_sha256,
      authorization_canonical_sha256:authorizationSha,
      signer_public_key_der_sha256:verification.signer_public_key_der_sha256,
      witnessed_at_utc:witnessedAt,
    });
    const event=Object.freeze({
      ...body,
      event_id:"voidblrhw1_"+sha256(Buffer.from(canonical(body),"utf8")),
    });
    const appendLine=Buffer.from(canonical(event)+"\n","utf8");
    if(current.length+appendLine.length>MAX_WITNESS_BYTES){
      fail("legacy_history_external_witness_next_too_large");
    }
    const next=Buffer.concat([current,appendLine]);
    inspectVoidBuyVoidLegacyHistoryExternalWitnessV1(next);
    return Object.freeze({
      ok:true,
      status:"APPEND_PLAN_GREEN_SOURCE_ONLY",
      marker:VOID_BUY_VOID_LEGACY_HISTORY_EXTERNAL_WITNESS_V1,
      version:1,
      witness_path:VOID_BUY_VOID_LEGACY_HISTORY_EXTERNAL_WITNESS_PATH_V1,
      append_required:true,
      event,
      append_line:appendLine,
      next_witness_jsonl:next,
      local_readback_expected_sha256:"sha256:"+sha256(next),
      external_transport_authenticated:false,
      external_witness_storage_proven:false,
      live_remote_append_performed:false,
      live_remote_read_performed:false,
      external_witness_verified:false,
      historical_request_history_disposition_accepted:false,
      stable_root_apply_authorized:false,
      payment_acceptance:false,
      public_presale_activation:false,
      funds_movement:false,
      authority:VOID_BUY_VOID_LEGACY_HISTORY_EXTERNAL_WITNESS_AUTHORITY_V1,
    });
  }catch(error){
    return Object.freeze({
      ok:false,status:"HOLD",
      marker:VOID_BUY_VOID_LEGACY_HISTORY_EXTERNAL_WITNESS_V1,
      reason:error instanceof Error?error.message:String(error),
      external_transport_authenticated:false,
      external_witness_storage_proven:false,
      external_witness_verified:false,
      historical_request_history_disposition_accepted:false,
      stable_root_apply_authorized:false,
      payment_acceptance:false,
      public_presale_activation:false,
      funds_movement:false,
      authority:VOID_BUY_VOID_LEGACY_HISTORY_EXTERNAL_WITNESS_AUTHORITY_V1,
    });
  }
}
export function planVoidBuyVoidLegacyHistoryExternalWitnessV1(input){
  return planWithVerifier(
    input,
    verifyVoidBuyVoidLegacyHistorySovereignAuthorizationV1,
  );
}
export function testOnlyPlanVoidBuyVoidLegacyHistoryExternalWitnessAgainstFingerprintV1(
  input,
  expectedFingerprint,
){
  return planWithVerifier(
    input,
    args=>testOnlyVerifyVoidBuyVoidLegacyHistorySovereignAuthorizationAgainstFingerprintV1({
      ...args,expected_fingerprint:expectedFingerprint,
    }),
  );
}
export function classifyVoidBuyVoidLegacyHistoryExternalWitnessReadbackV1(input){
  try{
    const v=exactObject(
      input,
      ["plan","observed_witness_jsonl"],
      "legacy_history_external_witness_readback_shape_invalid",
    );
    if(v.plan?.ok!==true||
       !Buffer.isBuffer(v.plan.next_witness_jsonl)||
       !EVENT_ID.test(String(v.plan.event?.event_id||""))){
      fail("legacy_history_external_witness_readback_plan_invalid");
    }
    const observed=asBuffer(v.observed_witness_jsonl);
    if(!observed.equals(v.plan.next_witness_jsonl)){
      fail("legacy_history_external_witness_readback_bytes_mismatch");
    }
    const inspected=inspectVoidBuyVoidLegacyHistoryExternalWitnessV1(observed);
    const tip=inspected.events.at(-1);
    if(!tip||tip.event_id!==v.plan.event.event_id){
      fail("legacy_history_external_witness_readback_tip_mismatch");
    }
    return Object.freeze({
      ok:true,
      status:"LOCAL_READBACK_MATCH_SOURCE_ONLY",
      marker:VOID_BUY_VOID_LEGACY_HISTORY_EXTERNAL_WITNESS_V1,
      witness_path:VOID_BUY_VOID_LEGACY_HISTORY_EXTERNAL_WITNESS_PATH_V1,
      event_id:tip.event_id,
      observed_witness_sha256:"sha256:"+sha256(observed),
      local_readback_bytes_match:true,
      external_transport_authenticated:false,
      external_witness_storage_proven:false,
      external_witness_verified:false,
      historical_request_history_disposition_accepted:false,
      stable_root_apply_authorized:false,
      payment_acceptance:false,
      public_presale_activation:false,
      funds_movement:false,
    });
  }catch(error){
    return Object.freeze({
      ok:false,status:"HOLD",
      marker:VOID_BUY_VOID_LEGACY_HISTORY_EXTERNAL_WITNESS_V1,
      reason:error instanceof Error?error.message:String(error),
      local_readback_bytes_match:false,
      external_transport_authenticated:false,
      external_witness_storage_proven:false,
      external_witness_verified:false,
      historical_request_history_disposition_accepted:false,
      stable_root_apply_authorized:false,
      payment_acceptance:false,
      public_presale_activation:false,
      funds_movement:false,
    });
  }
}
