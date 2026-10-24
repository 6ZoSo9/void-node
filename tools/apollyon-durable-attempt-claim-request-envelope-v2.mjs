#!/usr/bin/env node
import crypto from "node:crypto";
import {
  canonicalApollyonClaimContractJsonV1,
} from "./apollyon-candidate-training-attempt-claim-contract-v1.mjs";

export const VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_REQUEST_ENVELOPE_V2 =
  "VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_REQUEST_ENVELOPE_V2";

export const VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_REQUEST_MARKER_V2 =
  "VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_REQUEST_V2";

export const VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_REQUEST_ENVELOPE_AUTHORITY_V2 =
  Object.freeze({
    source_only_protocol_closure:true,
    parent_candidate_blob_bound:true,
    parent_store_contract_blob_bound:true,
    canonicalizer_v1_blob_bound:true,
    exact_request_marker_bound:true,
    exact_request_version_bound:true,
    exact_request_method_bound:true,
    exact_request_key_schema_bound:true,
    canonical_lf_framing_bound:true,
    publish_request_sha256_exact_bytes_bound:true,
    claim_record_schema_bound:true,
    claim_record_content_address_bound:true,
    request_record_store_cross_binding_required:true,
    accepted_store_policy_id_bound:true,
    terminal_receipt_revalidation_performed:false,
    protected_runner_origin_proven:false,
    current_host_revalidation_performed:false,
    custody_record_revalidation_performed:false,
    host_installation:false,
    filesystem_read:false,
    filesystem_write:false,
    network_access:false,
    service_action:false,
    socket_action:false,
    durable_attempt_claim:false,
    attempt_claim_authorized:false,
    attempt_claimed:false,
    training_execution_authorized:false,
    training_execution:false,
    candidate_weight_mutation:false,
    operator_private_key_access:false,
    production_signing:false,
    wallet_access:false,
    transaction_signing:false,
    transaction_broadcast:false,
    funds_movement:false,
  });

export const PARENT_CANDIDATE_BLOB_SHA1 =
  "7654ddb2d5875d1aa42e8f41398afb727ba3832d";
export const PARENT_STORE_CONTRACT_BLOB_SHA1 =
  "bd5572a99ffe0f2cfa43b7d680bbd5077771c6bc";
export const CANONICALIZER_V1_BLOB_SHA1 =
  "f97fafb0148527ae3a954e2752faef8c7fc9e88e";
export const ACCEPTED_STORE_POLICY_ID =
  "apollyon_claim_store_policy_v2:e7591d97e95ba4af17097fc89e1e2db612275c84715872153e1ae0a278c01137";

const REQUEST_KEYS=Object.freeze([
  "claim_record","marker","method","store_contract_id","store_policy_id","version",
]);
const RECORD_KEYS=Object.freeze([
  "attempt_limit","authorization_id","automatic_retry_authorized","canonical_main",
  "canonical_tree","claim_record_id","corpus_sha256","custody_generation_id",
  "custody_record_sha256","marker","operator_public_key_raw_sha256",
  "parent_adapter_sha256","request_sha256","status","store_contract_id",
  "store_generation_id","store_policy_id","terminal_receipt_id",
  "terminal_runner_receipt_sha256","version",
]);
const HASH64=/^[0-9a-f]{64}$/u;
const GIT40=/^[0-9a-f]{40}$/u;
const STORE_CONTRACT_ID=/^apollyon_claim_store_contract_v2:[0-9a-f]{64}$/u;
const STORE_POLICY_ID=/^apollyon_claim_store_policy_v2:[0-9a-f]{64}$/u;
const STORE_GENERATION_ID=/^apollyon_claim_store_generation_v2:[0-9a-f]{64}$/u;
const TERMINAL_ID=/^apollyon_terminal_receipt_v2:[0-9a-f]{64}$/u;
const AUTH_ID=/^apollyon_authz_v1:[0-9a-f]{64}$/u;
const CUSTODY_GENERATION_ID=/^apollyon_custody_generation_v1:[0-9a-f]{64}$/u;
const CLAIM_RECORD_ID=/^apollyon_attempt_claim_record_v2:[0-9a-f]{64}$/u;
const MAX_REQUEST_BYTES=65536;

function fail(code){throw new Error(code);}
function sha256(value){
  return crypto.createHash("sha256").update(value).digest("hex");
}
function canonical(value){
  return canonicalApollyonClaimContractJsonV1(value);
}
function exactOwnKeys(value,expected,code){
  if(!value||typeof value!=="object"||Array.isArray(value))fail(code);
  const actual=Object.keys(value).sort();
  const wanted=[...expected].sort();
  if(actual.length!==wanted.length||actual.some((key,index)=>key!==wanted[index])){
    fail(code);
  }
}
function clonePlain(value,code){
  let copy;
  try{copy=structuredClone(value);}catch{fail(code);}
  if(!copy||typeof copy!=="object"||Array.isArray(copy))fail(code);
  const proto=Object.getPrototypeOf(copy);
  if(proto!==Object.prototype&&proto!==null)fail(code);
  return copy;
}

export function validateApollyonDurableAttemptClaimRecordEnvelopeV2(input){
  const value=clonePlain(input,"apollyon_claim_request_v2_record_invalid");
  exactOwnKeys(value,RECORD_KEYS,"apollyon_claim_request_v2_record_invalid");
  if(
    value.marker!=="VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_RECORD_V2"||
    value.version!==2||
    value.status!=="durable_candidate_training_attempt_claim_record_v2"||
    !STORE_CONTRACT_ID.test(value.store_contract_id)||
    value.store_policy_id!==ACCEPTED_STORE_POLICY_ID||
    !STORE_POLICY_ID.test(value.store_policy_id)||
    !STORE_GENERATION_ID.test(value.store_generation_id)||
    !TERMINAL_ID.test(value.terminal_receipt_id)||
    !HASH64.test(value.terminal_runner_receipt_sha256)||
    !AUTH_ID.test(value.authorization_id)||
    !CUSTODY_GENERATION_ID.test(value.custody_generation_id)||
    !HASH64.test(value.custody_record_sha256)||
    !HASH64.test(value.request_sha256)||
    !GIT40.test(value.canonical_main)||
    !GIT40.test(value.canonical_tree)||
    !HASH64.test(value.corpus_sha256)||
    !HASH64.test(value.parent_adapter_sha256)||
    !HASH64.test(value.operator_public_key_raw_sha256)||
    value.attempt_limit!==1||
    value.automatic_retry_authorized!==false||
    !CLAIM_RECORD_ID.test(value.claim_record_id)
  ){
    fail("apollyon_claim_request_v2_record_invalid");
  }
  const material=structuredClone(value);
  delete material.claim_record_id;
  const expected="apollyon_attempt_claim_record_v2:"+
    sha256(Buffer.from(canonical(material),"utf8"));
  if(value.claim_record_id!==expected){
    fail("apollyon_claim_request_v2_record_id_invalid");
  }
  return Object.freeze(value);
}

export function validateApollyonDurableAttemptClaimPublishRequestV2(input){
  const value=clonePlain(input,"apollyon_claim_request_v2_envelope_invalid");
  exactOwnKeys(value,REQUEST_KEYS,"apollyon_claim_request_v2_envelope_invalid");
  if(
    value.marker!==VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_REQUEST_MARKER_V2||
    value.version!==2||
    value.method!=="publish_claim_v2"||
    !STORE_CONTRACT_ID.test(value.store_contract_id)||
    value.store_policy_id!==ACCEPTED_STORE_POLICY_ID||
    !STORE_POLICY_ID.test(value.store_policy_id)
  ){
    fail("apollyon_claim_request_v2_envelope_invalid");
  }
  const record=validateApollyonDurableAttemptClaimRecordEnvelopeV2(
    value.claim_record,
  );
  if(
    value.store_contract_id!==record.store_contract_id||
    value.store_policy_id!==record.store_policy_id
  ){
    fail("apollyon_claim_request_v2_store_cross_binding_invalid");
  }
  return Object.freeze({
    claim_record:record,
    marker:value.marker,
    method:value.method,
    store_contract_id:value.store_contract_id,
    store_policy_id:value.store_policy_id,
    version:value.version,
  });
}

export function serializeApollyonDurableAttemptClaimPublishRequestV2(input){
  const normalized=validateApollyonDurableAttemptClaimPublishRequestV2(input);
  const bytes=Buffer.from(canonical(normalized)+"\n","utf8");
  if(bytes.length<3||bytes.length>MAX_REQUEST_BYTES){
    fail("apollyon_claim_request_v2_size_invalid");
  }
  return Buffer.from(bytes);
}

export function parseApollyonDurableAttemptClaimPublishRequestBytesV2(input){
  if(!Buffer.isBuffer(input)){
    fail("apollyon_claim_request_v2_bytes_invalid");
  }
  const bytes=Buffer.from(input);
  if(bytes.length<3||bytes.length>MAX_REQUEST_BYTES){
    fail("apollyon_claim_request_v2_size_invalid");
  }
  let text;
  try{
    text=new TextDecoder("utf-8",{fatal:true}).decode(bytes);
  }catch{
    fail("apollyon_claim_request_v2_utf8_invalid");
  }
  if(!text.endsWith("\n")||text.slice(0,-1).includes("\n")){
    fail("apollyon_claim_request_v2_framing_invalid");
  }
  let raw;
  try{raw=JSON.parse(text.slice(0,-1));}
  catch{fail("apollyon_claim_request_v2_json_invalid");}
  const normalized=validateApollyonDurableAttemptClaimPublishRequestV2(raw);
  const canonicalText=canonical(normalized)+"\n";
  const canonicalBytes=Buffer.from(canonicalText,"utf8");
  if(!bytes.equals(canonicalBytes)){
    fail("apollyon_claim_request_v2_noncanonical");
  }
  return Object.freeze({
    request:normalized,
    publish_request_sha256:sha256(bytes),
    canonical_request_utf8_lf:canonicalText,
  });
}
