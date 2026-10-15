#!/usr/bin/env node
import crypto from "node:crypto";

import {
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_TRANSPORT_ENDPOINT_V1,
  classifyBuyVoidAllocationCustodyWitnessTransportPolicyV1,
} from "../dist/economic/buy_void_allocation_custody_witness_transport_v1.js";
import {
  VOID_BUY_VOID_LEGACY_HISTORY_EXTERNAL_WITNESS_PATH_V1,
  inspectVoidBuyVoidLegacyHistoryExternalWitnessV1,
  planVoidBuyVoidLegacyHistoryExternalWitnessV1,
  testOnlyPlanVoidBuyVoidLegacyHistoryExternalWitnessAgainstFingerprintV1,
} from "./void-buy-legacy-request-history-external-witness-v1.mjs";

export const VOID_BUY_VOID_LEGACY_HISTORY_NIMO_TRANSPORT_ENVELOPE_V1 =
  "VOID_BUY_VOID_LEGACY_HISTORY_NIMO_TRANSPORT_ENVELOPE_V1";

export const VOID_BUY_VOID_LEGACY_HISTORY_NIMO_TRANSPORT_AUTHORITY_V1 =
  Object.freeze({
    source_only_transport_envelope: true,
    existing_reviewed_ssh_policy_classifier_reused: true,
    forced_command_only_policy_required: true,
    caller_selected_remote_command: false,
    caller_selected_remote_path: false,
    fixed_legacy_history_witness_path: true,
    server_replans_signed_authorization_against_current_witness: true,
    append_compare_and_swap_required: true,
    round_trip_witness_bytes_returned: true,
    crash_retry_idempotent_response_supported: true,
    challenge_bound_request_response: true,
    policy_hash_bound_request_response: true,
    canonical_request_response_bytes: true,
    arbitrary_append_bytes_from_client: false,
    network_access: false,
    ssh_execution: false,
    credential_read: false,
    credential_write: false,
    remote_filesystem_read: false,
    remote_filesystem_write: false,
    external_transport_authenticated: false,
    external_witness_storage_proven: false,
    live_remote_read_performed: false,
    live_remote_append_performed: false,
    external_witness_verified: false,
    historical_request_history_disposition_accepted: false,
    stable_root_apply_authorized: false,
    private_key_access: false,
    payment_acceptance: false,
    public_presale_activation: false,
    funds_movement: false,
  });

const SHA256_ID=/^sha256:[0-9a-f]{64}$/u;
const REQUEST_ID=/^voidblrhtreq1_[0-9a-f]{64}$/u;
const RESPONSE_ID=/^voidblrhtres1_[0-9a-f]{64}$/u;
const EVENT_ID=/^voidblrhw1_[0-9a-f]{64}$/u;
const UTC=/^20[0-9]{2}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\.[0-9]{3})?Z$/u;
const READ_KEYS=Object.freeze([
  "schema","marker","version","operation","challenge_sha256","policy_sha256","request_id",
]);
const APPEND_BODY_KEYS=Object.freeze([
  "schema","marker","version","operation","challenge_sha256","policy_sha256",
  "prior_witness_sha256","expected_next_witness_sha256","expected_event_id",
  "expected_append_required","candidate_json_base64","authorization_json_base64",
  "public_key_pem_base64","witnessed_at_utc",
]);
const APPEND_KEYS=Object.freeze([...APPEND_BODY_KEYS,"request_id"]);
const RESPONSE_BODY_KEYS=Object.freeze([
  "schema","marker","version","operation","request_id","challenge_sha256",
  "policy_sha256","status","witness_path","witness_jsonl_base64",
  "witness_sha256","event_count","tip_event_id","tip_event_sha256",
  "operation_performed",
]);
const RESPONSE_KEYS=Object.freeze([...RESPONSE_BODY_KEYS,"response_id"]);

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
  fail("legacy_history_nimo_transport_noncanonical_value");
}
function sha256(value){return crypto.createHash("sha256").update(value).digest("hex");}
function sha256Id(value){return "sha256:"+sha256(value);}
function canonicalLine(value){return Buffer.from(canonical(value)+"\n","utf8");}
function base64(bytes){return Buffer.from(bytes).toString("base64");}
function decodeBase64(value,max,code){
  if(typeof value!=="string"||value.length<1||value.length>Math.ceil(max/3)*4+8)fail(code);
  let out;
  try{out=Buffer.from(value,"base64");}catch{fail(code);}
  if(out.length>max||out.toString("base64")!==value)fail(code);
  return out;
}
function parseJsonBytes(bytes,max,code){
  const buffer=Buffer.from(bytes);
  if(buffer.length<2||buffer.length>max)fail(code);
  let parsed;
  try{parsed=JSON.parse(buffer.toString("utf8"));}catch{fail(code);}
  if(Buffer.from(canonical(parsed),"utf8").compare(buffer)!==0)fail(code);
  return parsed;
}
function challenge(value){
  if(typeof value!=="string"||!SHA256_ID.test(value))fail("legacy_history_nimo_transport_challenge_invalid");
  return value;
}
function utc(value){
  if(typeof value!=="string"||!UTC.test(value)){
    fail("legacy_history_nimo_transport_time_invalid");
  }
  const millis=Date.parse(value);
  if(!Number.isFinite(millis))fail("legacy_history_nimo_transport_time_invalid");
  const iso=new Date(millis).toISOString();
  const seconds=iso.endsWith(".000Z")?iso.slice(0,-5)+"Z":iso;
  if(value!==iso&&value!==seconds)fail("legacy_history_nimo_transport_time_invalid");
  return value;
}
function requirePolicy(input){
  const decision=classifyBuyVoidAllocationCustodyWitnessTransportPolicyV1(input);
  if(decision.ok!==true)fail("legacy_history_nimo_transport_policy_"+String(decision.reason||"invalid"));
  if(
    decision.policy.endpoint_marker!==VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_TRANSPORT_ENDPOINT_V1||
    decision.policy.remote_forced_command_only!==true||
    decision.policy.remote_shell_allowed!==false||
    decision.policy.caller_selected_remote_command!==false||
    decision.policy.caller_selected_remote_path!==false
  )fail("legacy_history_nimo_transport_policy_boundary_invalid");
  return decision;
}
function requestId(body){
  return "voidblrhtreq1_"+sha256(Buffer.from(canonical(body),"utf8"));
}
function responseId(body){
  return "voidblrhtres1_"+sha256(Buffer.from(canonical(body),"utf8"));
}
function witnessSummary(bytes){
  const buffer=Buffer.from(bytes);
  const inspected=inspectVoidBuyVoidLegacyHistoryExternalWitnessV1(buffer);
  return Object.freeze({
    bytes:buffer,
    witness_sha256:sha256Id(buffer),
    event_count:inspected.event_count,
    tip_event_id:inspected.tip_event_id,
    tip_event_sha256:inspected.tip_event_sha256,
  });
}
function readBody(challengeValue,policySha){
  return Object.freeze({
    schema:"void_buy_void_legacy_history_nimo_transport_request_v1",
    marker:VOID_BUY_VOID_LEGACY_HISTORY_NIMO_TRANSPORT_ENVELOPE_V1,
    version:1,
    operation:"read",
    challenge_sha256:challengeValue,
    policy_sha256:policySha,
  });
}
export function buildVoidBuyVoidLegacyHistoryNimoReadRequestV1(input){
  try{
    const policy=requirePolicy(input?.policy);
    const body=readBody(challenge(input?.challenge_sha256),policy.policy_sha256);
    const request=Object.freeze({...body,request_id:requestId(body)});
    const bytes=canonicalLine(request);
    if(bytes.length>policy.policy.max_request_bytes)fail("legacy_history_nimo_transport_request_too_large");
    return Object.freeze({
      ok:true,status:"READ_REQUEST_BUILT_SOURCE_ONLY",
      marker:VOID_BUY_VOID_LEGACY_HISTORY_NIMO_TRANSPORT_ENVELOPE_V1,
      request,request_json:bytes,request_id:request.request_id,
      operation_performed:false,network_access:false,ssh_execution:false,
      external_transport_authenticated:false,external_witness_storage_proven:false,
      authority:VOID_BUY_VOID_LEGACY_HISTORY_NIMO_TRANSPORT_AUTHORITY_V1,
    });
  }catch(error){return held(error);}
}
function appendRequestWithPlanner(input,planner){
  const policy=requirePolicy(input?.policy);
  const ch=challenge(input?.challenge_sha256);
  const prior=witnessSummary(input?.current_witness_jsonl);
  const witnessed=utc(input?.witnessed_at_utc);
  const planned=planner({
    current_witness_jsonl:prior.bytes,
    candidate:input?.candidate,
    authorization:input?.authorization,
    public_key_pem:input?.public_key_pem,
    witnessed_at_utc:witnessed,
  });
  if(planned?.ok!==true)fail("legacy_history_nimo_transport_parent_"+String(planned?.reason||"held"));
  if(!EVENT_ID.test(String(planned.event?.event_id||"")))fail("legacy_history_nimo_transport_parent_event_invalid");
  const next=witnessSummary(planned.next_witness_jsonl);
  if(planned.append_required===true){
    if(next.tip_event_id!==planned.event.event_id){
      fail("legacy_history_nimo_transport_parent_tip_invalid");
    }
  }else{
    const inspectedNext=inspectVoidBuyVoidLegacyHistoryExternalWitnessV1(next.bytes);
    const existing=inspectedNext.events.find(
      event=>event.event_id===planned.event.event_id
    );
    if(!existing||canonical(existing)!==canonical(planned.event)){
      fail("legacy_history_nimo_transport_parent_event_invalid");
    }
  }
  const candidateBytes=Buffer.from(canonical(input.candidate),"utf8");
  const authorizationBytes=Buffer.from(canonical(input.authorization),"utf8");
  const publicKeyBytes=Buffer.isBuffer(input.public_key_pem)
    ?Buffer.from(input.public_key_pem):Buffer.from(String(input.public_key_pem??""),"utf8");
  if(candidateBytes.length>128*1024||authorizationBytes.length>128*1024||
     publicKeyBytes.length<32||publicKeyBytes.length>32*1024){
    fail("legacy_history_nimo_transport_append_material_size_invalid");
  }
  const body=Object.freeze({
    schema:"void_buy_void_legacy_history_nimo_transport_request_v1",
    marker:VOID_BUY_VOID_LEGACY_HISTORY_NIMO_TRANSPORT_ENVELOPE_V1,
    version:1,
    operation:"append",
    challenge_sha256:ch,
    policy_sha256:policy.policy_sha256,
    prior_witness_sha256:prior.witness_sha256,
    expected_next_witness_sha256:next.witness_sha256,
    expected_event_id:planned.event.event_id,
    expected_append_required:planned.append_required,
    candidate_json_base64:base64(candidateBytes),
    authorization_json_base64:base64(authorizationBytes),
    public_key_pem_base64:base64(publicKeyBytes),
    witnessed_at_utc:witnessed,
  });
  const request=Object.freeze({...body,request_id:requestId(body)});
  const bytes=canonicalLine(request);
  if(bytes.length>policy.policy.max_request_bytes)fail("legacy_history_nimo_transport_request_too_large");
  return Object.freeze({
    ok:true,status:"APPEND_REQUEST_BUILT_SOURCE_ONLY",
    marker:VOID_BUY_VOID_LEGACY_HISTORY_NIMO_TRANSPORT_ENVELOPE_V1,
    request,request_json:bytes,request_id:request.request_id,
    expected_next_witness_jsonl:Buffer.from(planned.next_witness_jsonl),
    expected_event:planned.event,
    expected_append_required:planned.append_required,
    operation_performed:false,network_access:false,ssh_execution:false,
    external_transport_authenticated:false,external_witness_storage_proven:false,
    authority:VOID_BUY_VOID_LEGACY_HISTORY_NIMO_TRANSPORT_AUTHORITY_V1,
  });
}
export function buildVoidBuyVoidLegacyHistoryNimoAppendRequestV1(input){
  try{return appendRequestWithPlanner(input,planVoidBuyVoidLegacyHistoryExternalWitnessV1);}
  catch(error){return held(error);}
}
export function testOnlyBuildVoidBuyVoidLegacyHistoryNimoAppendRequestAgainstFingerprintV1(
  input,expectedFingerprint
){
  try{
    return appendRequestWithPlanner(
      input,
      args=>testOnlyPlanVoidBuyVoidLegacyHistoryExternalWitnessAgainstFingerprintV1(
        args,expectedFingerprint
      ),
    );
  }catch(error){return held(error);}
}
function parseRequest(policyInput,requestInput){
  const policy=requirePolicy(policyInput);
  const bytes=Buffer.isBuffer(requestInput)?Buffer.from(requestInput):Buffer.from(String(requestInput??""),"utf8");
  if(bytes.length<2||bytes.length>policy.policy.max_request_bytes||bytes.at(-1)!==0x0a){
    fail("legacy_history_nimo_transport_request_invalid");
  }
  let parsed;
  try{parsed=JSON.parse(bytes.subarray(0,-1).toString("utf8"));}catch{fail("legacy_history_nimo_transport_request_invalid");}
  if(!canonicalLine(parsed).equals(bytes))fail("legacy_history_nimo_transport_request_noncanonical");
  const keys=parsed.operation==="read"?READ_KEYS:parsed.operation==="append"?APPEND_KEYS:null;
  if(!keys)fail("legacy_history_nimo_transport_operation_invalid");
  const request=exactObject(parsed,keys,"legacy_history_nimo_transport_request_shape_invalid");
  if(
    request.schema!=="void_buy_void_legacy_history_nimo_transport_request_v1"||
    request.marker!==VOID_BUY_VOID_LEGACY_HISTORY_NIMO_TRANSPORT_ENVELOPE_V1||
    request.version!==1||
    request.policy_sha256!==policy.policy_sha256||
    !SHA256_ID.test(String(request.challenge_sha256||""))
  )fail("legacy_history_nimo_transport_request_binding_invalid");
  const body=Object.freeze(Object.fromEntries(
    keys.filter(key=>key!=="request_id").map(key=>[key,request[key]])
  ));
  if(!REQUEST_ID.test(String(request.request_id||""))||request.request_id!==requestId(body)){
    fail("legacy_history_nimo_transport_request_id_invalid");
  }
  return Object.freeze({policy,request});
}
function appendMaterials(request){
  const candidateBytes=decodeBase64(request.candidate_json_base64,128*1024,
    "legacy_history_nimo_transport_candidate_base64_invalid");
  const authorizationBytes=decodeBase64(request.authorization_json_base64,128*1024,
    "legacy_history_nimo_transport_authorization_base64_invalid");
  const publicKey=decodeBase64(request.public_key_pem_base64,32*1024,
    "legacy_history_nimo_transport_public_key_base64_invalid");
  return Object.freeze({
    candidate:parseJsonBytes(candidateBytes,128*1024,
      "legacy_history_nimo_transport_candidate_json_invalid"),
    authorization:parseJsonBytes(authorizationBytes,128*1024,
      "legacy_history_nimo_transport_authorization_json_invalid"),
    public_key_pem:publicKey,
  });
}
function serverClassifyWithPlanner(input,planner){
  try{
    const parsed=parseRequest(input?.policy,input?.request_json);
    const current=witnessSummary(input?.current_witness_jsonl);
    if(parsed.request.operation==="read"){
      return Object.freeze({
        ok:true,status:"READ_READY_SOURCE_ONLY",
        marker:VOID_BUY_VOID_LEGACY_HISTORY_NIMO_TRANSPORT_ENVELOPE_V1,
        operation:"read",request_id:parsed.request.request_id,
        current_witness_jsonl:current.bytes,
        operation_performed:false,remote_filesystem_write_authorized:false,
        authority:VOID_BUY_VOID_LEGACY_HISTORY_NIMO_TRANSPORT_AUTHORITY_V1,
      });
    }
    const materials=appendMaterials(parsed.request);
    const priorMatches=
      parsed.request.prior_witness_sha256===current.witness_sha256;
    const committedRetryCandidate=(
      priorMatches===false&&
      parsed.request.expected_append_required===true&&
      parsed.request.expected_next_witness_sha256===current.witness_sha256
    );
    if(!priorMatches&&!committedRetryCandidate){
      fail("legacy_history_nimo_transport_prior_compare_and_swap_mismatch");
    }
    const planned=planner({
      current_witness_jsonl:current.bytes,
      candidate:materials.candidate,
      authorization:materials.authorization,
      public_key_pem:materials.public_key_pem,
      witnessed_at_utc:utc(parsed.request.witnessed_at_utc),
    });
    if(planned?.ok!==true)fail("legacy_history_nimo_transport_server_parent_"+String(planned?.reason||"held"));
    const next=witnessSummary(planned.next_witness_jsonl);
    if(committedRetryCandidate){
      if(
        planned.event?.event_id!==parsed.request.expected_event_id||
        planned.append_required!==false||
        next.witness_sha256!==current.witness_sha256||
        next.witness_sha256!==parsed.request.expected_next_witness_sha256
      )fail("legacy_history_nimo_transport_committed_retry_mismatch");
    }else if(
      planned.event?.event_id!==parsed.request.expected_event_id||
      planned.append_required!==parsed.request.expected_append_required||
      next.witness_sha256!==parsed.request.expected_next_witness_sha256
    ){
      fail("legacy_history_nimo_transport_server_plan_mismatch");
    }
    return Object.freeze({
      ok:true,
      status:planned.append_required?"APPEND_READY_SOURCE_ONLY":"IDEMPOTENT_READY_SOURCE_ONLY",
      marker:VOID_BUY_VOID_LEGACY_HISTORY_NIMO_TRANSPORT_ENVELOPE_V1,
      operation:"append",request_id:parsed.request.request_id,
      next_witness_jsonl:next.bytes,
      event:planned.event,
      append_required:planned.append_required,
      committed_retry:committedRetryCandidate,
      operation_performed:false,remote_filesystem_write_authorized:false,
      authority:VOID_BUY_VOID_LEGACY_HISTORY_NIMO_TRANSPORT_AUTHORITY_V1,
    });
  }catch(error){return held(error);}
}
export function classifyVoidBuyVoidLegacyHistoryNimoServerRequestV1(input){
  return serverClassifyWithPlanner(input,planVoidBuyVoidLegacyHistoryExternalWitnessV1);
}
export function testOnlyClassifyVoidBuyVoidLegacyHistoryNimoServerRequestAgainstFingerprintV1(
  input,expectedFingerprint
){
  return serverClassifyWithPlanner(
    input,
    args=>testOnlyPlanVoidBuyVoidLegacyHistoryExternalWitnessAgainstFingerprintV1(
      args,expectedFingerprint
    ),
  );
}
export function buildVoidBuyVoidLegacyHistoryNimoServerResponseV1(input){
  try{
    const parsed=parseRequest(input?.policy,input?.request_json);
    if(input?.operation_performed!==true&&input?.operation_performed!==false){
      fail("legacy_history_nimo_transport_operation_flag_invalid");
    }
    const observed=witnessSummary(input?.observed_witness_jsonl);
    let status;
    if(parsed.request.operation==="read"){
      if(input.operation_performed!==false)fail("legacy_history_nimo_transport_read_operation_flag_invalid");
      status="read";
    }else{
      if(observed.witness_sha256!==parsed.request.expected_next_witness_sha256){
        fail("legacy_history_nimo_transport_append_response_witness_mismatch");
      }
      if(parsed.request.expected_append_required===true){
        if(observed.tip_event_id!==parsed.request.expected_event_id){
          fail("legacy_history_nimo_transport_append_response_witness_mismatch");
        }
      }else{
        const inspectedObserved=
          inspectVoidBuyVoidLegacyHistoryExternalWitnessV1(observed.bytes);
        if(!inspectedObserved.events.some(
          event=>event.event_id===parsed.request.expected_event_id
        )){
          fail("legacy_history_nimo_transport_append_response_event_missing");
        }
      }
      if(input.operation_performed===true){
        if(parsed.request.expected_append_required!==true){
          fail("legacy_history_nimo_transport_unexpected_append_operation");
        }
        status="appended";
      }else{
        status="idempotent";
      }
    }
    const body=Object.freeze({
      schema:"void_buy_void_legacy_history_nimo_transport_response_v1",
      marker:VOID_BUY_VOID_LEGACY_HISTORY_NIMO_TRANSPORT_ENVELOPE_V1,
      version:1,
      operation:parsed.request.operation,
      request_id:parsed.request.request_id,
      challenge_sha256:parsed.request.challenge_sha256,
      policy_sha256:parsed.policy.policy_sha256,
      status,
      witness_path:VOID_BUY_VOID_LEGACY_HISTORY_EXTERNAL_WITNESS_PATH_V1,
      witness_jsonl_base64:base64(observed.bytes),
      witness_sha256:observed.witness_sha256,
      event_count:observed.event_count,
      tip_event_id:observed.tip_event_id,
      tip_event_sha256:observed.tip_event_sha256,
      operation_performed:input.operation_performed,
    });
    const response=Object.freeze({...body,response_id:responseId(body)});
    const bytes=canonicalLine(response);
    if(bytes.length>parsed.policy.policy.max_response_bytes){
      fail("legacy_history_nimo_transport_response_too_large");
    }
    return Object.freeze({
      ok:true,status:"RESPONSE_BUILT_SOURCE_ONLY",
      marker:VOID_BUY_VOID_LEGACY_HISTORY_NIMO_TRANSPORT_ENVELOPE_V1,
      response,response_json:bytes,operation_performed:false,
      external_transport_authenticated:false,external_witness_storage_proven:false,
      authority:VOID_BUY_VOID_LEGACY_HISTORY_NIMO_TRANSPORT_AUTHORITY_V1,
    });
  }catch(error){return held(error);}
}
export function validateVoidBuyVoidLegacyHistoryNimoResponseV1(input){
  try{
    const parsed=parseRequest(input?.policy,input?.request_json);
    const bytes=Buffer.isBuffer(input?.response_json)?Buffer.from(input.response_json):
      Buffer.from(String(input?.response_json??""),"utf8");
    if(bytes.length<2||bytes.length>parsed.policy.policy.max_response_bytes||bytes.at(-1)!==0x0a){
      fail("legacy_history_nimo_transport_response_invalid");
    }
    let raw;
    try{raw=JSON.parse(bytes.subarray(0,-1).toString("utf8"));}catch{fail("legacy_history_nimo_transport_response_invalid");}
    if(!canonicalLine(raw).equals(bytes))fail("legacy_history_nimo_transport_response_noncanonical");
    const response=exactObject(raw,RESPONSE_KEYS,"legacy_history_nimo_transport_response_shape_invalid");
    if(
      response.schema!=="void_buy_void_legacy_history_nimo_transport_response_v1"||
      response.marker!==VOID_BUY_VOID_LEGACY_HISTORY_NIMO_TRANSPORT_ENVELOPE_V1||
      response.version!==1||
      response.operation!==parsed.request.operation||
      response.request_id!==parsed.request.request_id||
      response.challenge_sha256!==parsed.request.challenge_sha256||
      response.policy_sha256!==parsed.policy.policy_sha256||
      response.witness_path!==VOID_BUY_VOID_LEGACY_HISTORY_EXTERNAL_WITNESS_PATH_V1
    )fail("legacy_history_nimo_transport_response_binding_invalid");
    const body=Object.freeze(Object.fromEntries(
      RESPONSE_BODY_KEYS.map(key=>[key,response[key]])
    ));
    if(!RESPONSE_ID.test(String(response.response_id||""))||response.response_id!==responseId(body)){
      fail("legacy_history_nimo_transport_response_id_invalid");
    }
    const witness=decodeBase64(response.witness_jsonl_base64,4*1024*1024,
      "legacy_history_nimo_transport_response_witness_invalid");
    const summary=witnessSummary(witness);
    if(
      response.witness_sha256!==summary.witness_sha256||
      response.event_count!==summary.event_count||
      response.tip_event_id!==summary.tip_event_id||
      response.tip_event_sha256!==summary.tip_event_sha256
    )fail("legacy_history_nimo_transport_response_witness_summary_invalid");
    if(parsed.request.operation==="read"){
      if(response.status!=="read"||response.operation_performed!==false){
        fail("legacy_history_nimo_transport_read_response_invalid");
      }
    }else{
      const expectedEventPresent=
        inspectVoidBuyVoidLegacyHistoryExternalWitnessV1(witness).events.some(
          event=>event.event_id===parsed.request.expected_event_id
        );
      if(
        !["appended","idempotent"].includes(response.status)||
        response.witness_sha256!==parsed.request.expected_next_witness_sha256||
        !expectedEventPresent||
        (parsed.request.expected_append_required===true&&
          response.tip_event_id!==parsed.request.expected_event_id)||
        response.operation_performed!==(response.status==="appended")||
        (response.status==="appended"&&parsed.request.expected_append_required!==true)
      )fail("legacy_history_nimo_transport_append_response_invalid");
    }
    return Object.freeze({
      ok:true,status:"RESPONSE_VALID_SOURCE_ONLY",
      marker:VOID_BUY_VOID_LEGACY_HISTORY_NIMO_TRANSPORT_ENVELOPE_V1,
      request_id:parsed.request.request_id,response_id:response.response_id,
      witness_jsonl:witness,witness_sha256:summary.witness_sha256,
      event_count:summary.event_count,tip_event_id:summary.tip_event_id,
      challenge_bound:true,policy_hash_bound:true,
      round_trip_witness_bytes_verified:true,
      external_transport_authenticated:false,
      external_witness_storage_proven:false,
      live_remote_read_performed:false,live_remote_append_performed:false,
      external_witness_verified:false,
      historical_request_history_disposition_accepted:false,
      stable_root_apply_authorized:false,
      payment_acceptance:false,public_presale_activation:false,funds_movement:false,
      authority:VOID_BUY_VOID_LEGACY_HISTORY_NIMO_TRANSPORT_AUTHORITY_V1,
    });
  }catch(error){return held(error);}
}
function held(error){
  return Object.freeze({
    ok:false,status:"HOLD",
    marker:VOID_BUY_VOID_LEGACY_HISTORY_NIMO_TRANSPORT_ENVELOPE_V1,
    reason:error instanceof Error?error.message:String(error),
    operation_performed:false,network_access:false,ssh_execution:false,
    external_transport_authenticated:false,external_witness_storage_proven:false,
    live_remote_read_performed:false,live_remote_append_performed:false,
    external_witness_verified:false,
    historical_request_history_disposition_accepted:false,
    stable_root_apply_authorized:false,
    payment_acceptance:false,public_presale_activation:false,funds_movement:false,
    authority:VOID_BUY_VOID_LEGACY_HISTORY_NIMO_TRANSPORT_AUTHORITY_V1,
  });
}
