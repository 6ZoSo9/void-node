#!/usr/bin/env node
import crypto from "node:crypto";
import {types as utilTypes} from "node:util";
import {
  canonicalApollyonClaimContractJsonV1,
} from "./apollyon-candidate-training-attempt-claim-contract-v1.mjs";
import {
  validateApollyonDurableAttemptClaimAuthorizationSlotRecordV1,
} from "./apollyon-durable-attempt-claim-authorization-slot-v1.mjs";

export const VOID_APOLLYON_AUTHORIZATION_SLOT_PROTECTED_ORIGIN_CONTRACT_V1 =
  "VOID_APOLLYON_AUTHORIZATION_SLOT_PROTECTED_ORIGIN_CONTRACT_V1";

export const PARENT_HEAD =
  "4e7d433a4141b4a7cad7fb001d0800dccb1b5ec2";
export const PARENT_AUTHORIZATION_SLOT_BLOB_SHA1 =
  "93582c324ca85aeff56eb61f82b32f1e4c18dfe9";
export const CANONICALIZER_V1_BLOB_SHA1 =
  "f97fafb0148527ae3a954e2752faef8c7fc9e88e";

export const VOID_APOLLYON_AUTHORIZATION_SLOT_PROTECTED_ORIGIN_REQUIREMENTS_V1 =
  Object.freeze({
    protected_authorization_slot_store_required:true,
    same_protected_claim_root_required:true,
    descriptor_stable_slot_reread_required:true,
    protected_root_identity_revalidation_required:true,
    slot_file_identity_revalidation_required:true,
    slot_file_mode_0600_required:true,
    slot_file_nlink_one_required:true,
    exact_slot_record_canonical_bytes_required:true,
    exact_slot_record_sha256_required:true,
    claim_service_only_writer_required:true,
    current_store_generation_revalidation_required:true,
    exact_claim_record_revalidation_required:true,
    exact_terminal_receipt_revalidation_required:true,
    exact_publish_request_revalidation_required:true,
    authorization_slot_revalidation_immediately_before_capability_issuance_required:true,
    caller_supplied_slot_record_sufficient:false,
  });

export const VOID_APOLLYON_AUTHORIZATION_SLOT_PROTECTED_ORIGIN_AUTHORITY_V1 =
  Object.freeze({
    source_only_contract:true,
    protected_authorization_slot_store_required:true,
    protected_authorization_slot_store_proven:false,
    same_protected_claim_root_required:true,
    same_protected_claim_root_proven:false,
    descriptor_stable_slot_reread_required:true,
    descriptor_stable_slot_reread_performed:false,
    claim_service_only_writer_required:true,
    claim_service_only_writer_proven:false,
    protected_authorization_slot_origin_required:true,
    protected_authorization_slot_origin_proven:false,
    authorization_slot_revalidation_required:true,
    authorization_slot_revalidation_performed:false,
    current_store_generation_revalidation_required:true,
    current_store_generation_revalidation_performed:false,
    exact_claim_record_revalidation_required:true,
    exact_claim_record_revalidation_performed:false,
    exact_terminal_receipt_revalidation_required:true,
    exact_terminal_receipt_revalidation_performed:false,
    exact_publish_request_revalidation_required:true,
    exact_publish_request_revalidation_performed:false,
    activation_capability_issuance_authorized:false,
    activation_capability_issuance_performed:false,
    training_start_consumption_authorized:false,
    training_start_consumption_performed:false,
    training_start_admission:false,
    training_release_authorized:false,
    training_execution_authorized:false,
    training_execution:false,
    candidate_weight_mutation:false,
    filesystem_read:false,
    filesystem_write:false,
    network_access:false,
    service_action:false,
    socket_action:false,
    credential_access:false,
    private_key_access:false,
    signing:false,
    wallet_access:false,
    transaction:false,
    funds_movement:false,
  });

const SLOT_RECORD_KEYS=Object.freeze([
  "attempt_limit",
  "authorization_id",
  "authorization_slot_id",
  "authorization_slot_record_id",
  "automatic_retry_authorized",
  "claim_record_id",
  "claim_record_sha256",
  "marker",
  "publish_request_sha256",
  "status",
  "store_contract_id",
  "store_generation_id",
  "store_policy_id",
  "terminal_receipt_id",
  "version",
]);

const CANDIDATE_KEYS=Object.freeze([
  "activation_capability_issuance_authorized",
  "authorization_id",
  "authorization_slot_id",
  "authorization_slot_protected_origin_proven",
  "authorization_slot_record_id",
  "authorization_slot_record_sha256",
  "authorization_slot_revalidation_performed",
  "automatic_retry_authorized",
  "canonicalizer_v1_blob_sha1",
  "claim_record_id",
  "claim_record_sha256",
  "marker",
  "next_gate",
  "parent_authorization_slot_blob_sha1",
  "parent_head",
  "protected_origin_contract_id",
  "publish_request_sha256",
  "requirements",
  "status",
  "store_contract_id",
  "store_generation_id",
  "store_policy_id",
  "target_host",
  "terminal_receipt_id",
  "version",
]);

const CANDIDATE_STRING_KEYS=new Set([
  "authorization_id",
  "authorization_slot_id",
  "authorization_slot_record_id",
  "authorization_slot_record_sha256",
  "canonicalizer_v1_blob_sha1",
  "claim_record_id",
  "claim_record_sha256",
  "marker",
  "next_gate",
  "parent_authorization_slot_blob_sha1",
  "parent_head",
  "protected_origin_contract_id",
  "publish_request_sha256",
  "status",
  "store_contract_id",
  "store_generation_id",
  "store_policy_id",
  "target_host",
  "terminal_receipt_id",
]);
const CANDIDATE_NUMBER_KEYS=new Set(["version"]);
const CANDIDATE_BOOLEAN_KEYS=new Set([
  "activation_capability_issuance_authorized",
  "authorization_slot_protected_origin_proven",
  "authorization_slot_revalidation_performed",
  "automatic_retry_authorized",
]);

const SLOT_STRING_KEYS=new Set([
  "authorization_id",
  "authorization_slot_id",
  "authorization_slot_record_id",
  "claim_record_id",
  "claim_record_sha256",
  "marker",
  "publish_request_sha256",
  "status",
  "store_contract_id",
  "store_generation_id",
  "store_policy_id",
  "terminal_receipt_id",
]);

const HASH64=/^[0-9a-f]{64}$/u;
const SLOT_ID=/^apollyon_attempt_claim_auth_slot_v1:[0-9a-f]{64}$/u;
const SLOT_RECORD_ID=/^apollyon_attempt_claim_auth_slot_record_v1:[0-9a-f]{64}$/u;
const AUTH_ID=/^apollyon_authz_v1:[0-9a-f]{64}$/u;
const CLAIM_ID=/^apollyon_attempt_claim_record_v2:[0-9a-f]{64}$/u;
const STORE_CONTRACT_ID=/^apollyon_claim_store_contract_v2:[0-9a-f]{64}$/u;
const STORE_POLICY_ID=/^apollyon_claim_store_policy_v2:[0-9a-f]{64}$/u;
const STORE_GENERATION_ID=/^apollyon_claim_store_generation_v2:[0-9a-f]{64}$/u;
const TERMINAL_ID=/^apollyon_terminal_receipt_v2:[0-9a-f]{64}$/u;
const CONTRACT_ID=/^apollyon_authorization_slot_protected_origin_v1:[0-9a-f]{64}$/u;

function fail(code){throw new Error(code);}
function sha256(value){
  return crypto.createHash("sha256").update(value).digest("hex");
}
function canonical(value){
  return canonicalApollyonClaimContractJsonV1(value);
}
function exactOwnKeys(value,expected,code){
  if(!value||typeof value!=="object"||Array.isArray(value))fail(code);
  const own=Reflect.ownKeys(value);
  if(own.length!==expected.length)fail(code);
  if(own.some((key)=>typeof key!=="string"))fail(code);
  const actual=[...own].sort();
  const wanted=[...expected].sort();
  if(actual.length!==wanted.length||actual.some((key,index)=>key!==wanted[index])){
    fail(code);
  }
}
function deepFreeze(value){
  if(value&&typeof value==="object"&&!Object.isFrozen(value)){
    for(const child of Object.values(value))deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}
function contentAddress(prefix,value){
  return prefix+sha256(Buffer.from(canonical(value),"utf8"));
}

function preflightSlotRecord(input){
  if(!input||typeof input!=="object"||utilTypes.isProxy(input)||Array.isArray(input)){
    fail("apollyon_authorization_slot_origin_v1_slot_invalid");
  }
  const proto=Object.getPrototypeOf(input);
  if(proto!==Object.prototype&&proto!==null){
    fail("apollyon_authorization_slot_origin_v1_slot_invalid");
  }
  exactOwnKeys(
    input,
    SLOT_RECORD_KEYS,
    "apollyon_authorization_slot_origin_v1_slot_invalid",
  );

  const descriptors=Object.getOwnPropertyDescriptors(input);
  const snapshot={};
  for(const key of SLOT_RECORD_KEYS){
    const descriptor=descriptors[key];
    if(
      !descriptor||
      descriptor.enumerable!==true||
      !Object.prototype.hasOwnProperty.call(descriptor,"value")||
      typeof descriptor.get==="function"||
      typeof descriptor.set==="function"
    ){
      fail("apollyon_authorization_slot_origin_v1_slot_invalid");
    }
    const value=descriptor.value;
    if(SLOT_STRING_KEYS.has(key)){
      if(typeof value!=="string"||value.length<1||value.length>256){
        fail("apollyon_authorization_slot_origin_v1_slot_invalid");
      }
    }else if(key==="attempt_limit"||key==="version"){
      if(!Number.isSafeInteger(value)){
        fail("apollyon_authorization_slot_origin_v1_slot_invalid");
      }
    }else if(key==="automatic_retry_authorized"){
      if(typeof value!=="boolean"){
        fail("apollyon_authorization_slot_origin_v1_slot_invalid");
      }
    }else{
      fail("apollyon_authorization_slot_origin_v1_slot_invalid");
    }
    snapshot[key]=value;
  }
  return snapshot;
}

function validatedSlotRecord(input){
  const snapshot=preflightSlotRecord(input);
  return validateApollyonDurableAttemptClaimAuthorizationSlotRecordV1(snapshot);
}

function recordSha256(record){
  return sha256(Buffer.from(canonical(record)+"\n","utf8"));
}

function validateCandidateSlotBindings(value){
  let slot;
  try{
    slot=validateApollyonDurableAttemptClaimAuthorizationSlotRecordV1({
      marker:"VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_AUTHORIZATION_SLOT_RECORD_V1",
      version:1,
      status:"authorization_slot_bound_to_exact_durable_claim_candidate",
      store_policy_id:value.store_policy_id,
      authorization_id:value.authorization_id,
      authorization_slot_id:value.authorization_slot_id,
      store_contract_id:value.store_contract_id,
      store_generation_id:value.store_generation_id,
      terminal_receipt_id:value.terminal_receipt_id,
      claim_record_id:value.claim_record_id,
      claim_record_sha256:value.claim_record_sha256,
      publish_request_sha256:value.publish_request_sha256,
      attempt_limit:1,
      automatic_retry_authorized:value.automatic_retry_authorized,
      authorization_slot_record_id:value.authorization_slot_record_id,
    });
  }catch{
    fail("apollyon_authorization_slot_origin_v1_candidate_invalid");
  }
  if(recordSha256(slot)!==value.authorization_slot_record_sha256){
    fail("apollyon_authorization_slot_origin_v1_candidate_invalid");
  }
  return slot;
}

function validateCandidateMaterial(value){
  if(
    value.marker!==VOID_APOLLYON_AUTHORIZATION_SLOT_PROTECTED_ORIGIN_CONTRACT_V1||
    value.version!==1||
    value.status!=="authorization_slot_protected_origin_required_unproven"||
    value.target_host!=="Xiphos"||
    value.parent_head!==PARENT_HEAD||
    value.parent_authorization_slot_blob_sha1!==
      PARENT_AUTHORIZATION_SLOT_BLOB_SHA1||
    value.canonicalizer_v1_blob_sha1!==CANONICALIZER_V1_BLOB_SHA1||
    !AUTH_ID.test(value.authorization_id)||
    !SLOT_ID.test(value.authorization_slot_id)||
    !SLOT_RECORD_ID.test(value.authorization_slot_record_id)||
    !HASH64.test(value.authorization_slot_record_sha256)||
    !CLAIM_ID.test(value.claim_record_id)||
    !HASH64.test(value.claim_record_sha256)||
    !HASH64.test(value.publish_request_sha256)||
    !STORE_CONTRACT_ID.test(value.store_contract_id)||
    !STORE_POLICY_ID.test(value.store_policy_id)||
    !STORE_GENERATION_ID.test(value.store_generation_id)||
    !TERMINAL_ID.test(value.terminal_receipt_id)||
    value.automatic_retry_authorized!==false||
    value.authorization_slot_protected_origin_proven!==false||
    value.authorization_slot_revalidation_performed!==false||
    value.activation_capability_issuance_authorized!==false||
    canonical(value.requirements)!==
      canonical(VOID_APOLLYON_AUTHORIZATION_SLOT_PROTECTED_ORIGIN_REQUIREMENTS_V1)||
    value.next_gate!=="apollyon_authorization_slot_protected_origin_implementation_v1"
  ){
    fail("apollyon_authorization_slot_origin_v1_candidate_invalid");
  }
  validateCandidateSlotBindings(value);
}

function preflightRequirements(input){
  if(!input||typeof input!=="object"||utilTypes.isProxy(input)||Array.isArray(input)){
    fail("apollyon_authorization_slot_origin_v1_requirements_invalid");
  }
  const proto=Object.getPrototypeOf(input);
  if(proto!==Object.prototype&&proto!==null){
    fail("apollyon_authorization_slot_origin_v1_requirements_invalid");
  }
  const expected=Object.keys(
    VOID_APOLLYON_AUTHORIZATION_SLOT_PROTECTED_ORIGIN_REQUIREMENTS_V1
  );
  exactOwnKeys(
    input,
    expected,
    "apollyon_authorization_slot_origin_v1_requirements_invalid",
  );
  const descriptors=Object.getOwnPropertyDescriptors(input);
  const snapshot={};
  for(const key of expected){
    const descriptor=descriptors[key];
    if(
      !descriptor||
      descriptor.enumerable!==true||
      !Object.prototype.hasOwnProperty.call(descriptor,"value")||
      typeof descriptor.get==="function"||
      typeof descriptor.set==="function"||
      typeof descriptor.value!=="boolean"||
      descriptor.value!==
        VOID_APOLLYON_AUTHORIZATION_SLOT_PROTECTED_ORIGIN_REQUIREMENTS_V1[key]
    ){
      fail("apollyon_authorization_slot_origin_v1_requirements_invalid");
    }
    snapshot[key]=descriptor.value;
  }
  return snapshot;
}

function preflightCandidate(input){
  if(!input||typeof input!=="object"||utilTypes.isProxy(input)||Array.isArray(input)){
    fail("apollyon_authorization_slot_origin_v1_candidate_invalid");
  }
  const proto=Object.getPrototypeOf(input);
  if(proto!==Object.prototype&&proto!==null){
    fail("apollyon_authorization_slot_origin_v1_candidate_invalid");
  }
  exactOwnKeys(
    input,
    CANDIDATE_KEYS,
    "apollyon_authorization_slot_origin_v1_candidate_invalid",
  );
  const descriptors=Object.getOwnPropertyDescriptors(input);
  const snapshot={};
  for(const key of CANDIDATE_KEYS){
    const descriptor=descriptors[key];
    if(
      !descriptor||
      descriptor.enumerable!==true||
      !Object.prototype.hasOwnProperty.call(descriptor,"value")||
      typeof descriptor.get==="function"||
      typeof descriptor.set==="function"
    ){
      fail("apollyon_authorization_slot_origin_v1_candidate_invalid");
    }
    const value=descriptor.value;
    if(key==="requirements"){
      snapshot[key]=preflightRequirements(value);
    }else if(CANDIDATE_STRING_KEYS.has(key)){
      if(typeof value!=="string"||value.length<1||value.length>256){
        fail("apollyon_authorization_slot_origin_v1_candidate_invalid");
      }
      snapshot[key]=value;
    }else if(CANDIDATE_NUMBER_KEYS.has(key)){
      if(!Number.isSafeInteger(value)){
        fail("apollyon_authorization_slot_origin_v1_candidate_invalid");
      }
      snapshot[key]=value;
    }else if(CANDIDATE_BOOLEAN_KEYS.has(key)){
      if(typeof value!=="boolean"){
        fail("apollyon_authorization_slot_origin_v1_candidate_invalid");
      }
      snapshot[key]=value;
    }else{
      fail("apollyon_authorization_slot_origin_v1_candidate_invalid");
    }
  }
  return snapshot;
}

export function qualifyApollyonAuthorizationSlotProtectedOriginCandidateV1(input){
  const snapshot=preflightCandidate(input);
  const value=structuredClone(snapshot);
  if(!CONTRACT_ID.test(value.protected_origin_contract_id)){
    fail("apollyon_authorization_slot_origin_v1_contract_id_invalid");
  }
  const material={...value};
  delete material.protected_origin_contract_id;
  validateCandidateMaterial(material);
  const expected=contentAddress(
    "apollyon_authorization_slot_protected_origin_v1:",
    material,
  );
  if(value.protected_origin_contract_id!==expected){
    fail("apollyon_authorization_slot_origin_v1_contract_id_invalid");
  }
  return deepFreeze(value);
}

export function buildApollyonAuthorizationSlotProtectedOriginCandidateV1(
  authorizationSlotRecordInput,
){
  const slot=validatedSlotRecord(authorizationSlotRecordInput);
  const material={
    marker:VOID_APOLLYON_AUTHORIZATION_SLOT_PROTECTED_ORIGIN_CONTRACT_V1,
    version:1,
    status:"authorization_slot_protected_origin_required_unproven",
    target_host:"Xiphos",
    parent_head:PARENT_HEAD,
    parent_authorization_slot_blob_sha1:PARENT_AUTHORIZATION_SLOT_BLOB_SHA1,
    canonicalizer_v1_blob_sha1:CANONICALIZER_V1_BLOB_SHA1,
    authorization_id:slot.authorization_id,
    authorization_slot_id:slot.authorization_slot_id,
    authorization_slot_record_id:slot.authorization_slot_record_id,
    authorization_slot_record_sha256:recordSha256(slot),
    store_policy_id:slot.store_policy_id,
    store_contract_id:slot.store_contract_id,
    store_generation_id:slot.store_generation_id,
    terminal_receipt_id:slot.terminal_receipt_id,
    claim_record_id:slot.claim_record_id,
    claim_record_sha256:slot.claim_record_sha256,
    publish_request_sha256:slot.publish_request_sha256,
    automatic_retry_authorized:false,
    requirements:VOID_APOLLYON_AUTHORIZATION_SLOT_PROTECTED_ORIGIN_REQUIREMENTS_V1,
    authorization_slot_protected_origin_proven:false,
    authorization_slot_revalidation_performed:false,
    activation_capability_issuance_authorized:false,
    next_gate:"apollyon_authorization_slot_protected_origin_implementation_v1",
  };
  validateCandidateMaterial(material);
  return qualifyApollyonAuthorizationSlotProtectedOriginCandidateV1({
    ...material,
    protected_origin_contract_id:contentAddress(
      "apollyon_authorization_slot_protected_origin_v1:",
      material,
    ),
  });
}
