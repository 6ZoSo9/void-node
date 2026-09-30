#!/usr/bin/env node
import crypto from "node:crypto";
import {SigningKey,Transaction,computeAddress} from "ethers";

import {
  validateVoidDatanetRegistryUnsignedTransactionCandidateV1,
} from "./void-datanet-registry-unsigned-transaction-candidate-v1.mjs";
import {
  validateVoidDatanetRegistryExactSigningRequestV1,
} from "./void-datanet-registry-exact-signing-request-v1.mjs";
import {
  validateVoidDatanetRegistrySingleTransactionSigningAuthorizationV1,
} from "./void-datanet-registry-single-transaction-signing-authorization-v1.mjs";
import {
  voidDatanetRegistrySigningOperationIdV1,
} from "./void-datanet-registry-single-use-signing-authorization-consumption-v1.mjs";
import {
  validateVoidDatanetRegistrySigningStateIdentityV1,
} from "./void-datanet-registry-signing-state-identity-provision-v1.mjs";
import {
  VOID_DATANET_REGISTRY_DEPLOYER_ADDRESS_V1,
} from "./void-datanet-registry-deployer-credential-binding-v1.mjs";

export const VOID_DATANET_REGISTRY_CONSUMED_AUTHORIZATION_SIGNING_V1 =
  "VOID_DATANET_REGISTRY_CONSUMED_AUTHORIZATION_SIGNING_V1";

const HASH=/^0x[0-9a-f]{64}$/u;
const SHA256=/^[0-9a-f]{64}$/u;
const ADDRESS=/^0x[0-9a-f]{40}$/u;
const HEX=/^0x(?:[0-9a-f]{2})+$/u;
const AUTH_ID=/^voiddrsa1_[0-9a-f]{64}$/u;
const REQUEST_ID=/^voiddrsr1_[0-9a-f]{64}$/u;
const CANDIDATE_ID=/^voiddrtxc1_[0-9a-f]{64}$/u;
const OPERATION_ID=/^voiddrso1_[0-9a-f]{64}$/u;
const CONSUMPTION_ID=/^voiddrsac1_[0-9a-f]{64}$/u;
const STORE_ID=/^voiddrssi1_[0-9a-f]{64}$/u;
const ADMISSION_ID=/^voiddrsea1_[0-9a-f]{64}$/u;
const CLAIM_ID=/^voiddrscl1_[0-9a-f]{64}$/u;
const SIGNED_ID=/^voiddrstx1_[0-9a-f]{64}$/u;

function sha256(value){
  return crypto.createHash("sha256").update(value).digest("hex");
}
function canonical(value){
  if(value===null||typeof value==="string"||typeof value==="boolean") return value;
  if(typeof value==="number"&&Number.isFinite(value)) return value;
  if(Array.isArray(value)) return value.map(canonical);
  if(value&&typeof value==="object"){
    return Object.fromEntries(
      Object.keys(value).sort().map((key)=>[key,canonical(value[key])]),
    );
  }
  throw new Error("unsupported_canonical_value");
}
function canonicalJson(value){
  return JSON.stringify(canonical(value));
}
function exactKeys(value,keys,label){
  if(!value||typeof value!=="object"||Array.isArray(value)){
    throw new Error(label+"_invalid");
  }
  const actual=Object.keys(value).sort();
  const expected=[...keys].sort();
  if(JSON.stringify(actual)!==JSON.stringify(expected)){
    throw new Error(label+"_keys_invalid");
  }
}
function timestamp(value,label){
  const raw=String(value||"");
  const ms=Date.parse(raw);
  if(
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(raw)||
    !Number.isFinite(ms)||
    new Date(ms).toISOString()!==raw
  ){
    throw new Error(label+"_invalid");
  }
  return {raw,ms};
}
function validateConsumptionRecord(record,authorization,stateIdentity){
  exactKeys(
    record,
    [
      "marker","version","status","signing_operation_id",
      "signing_authorization_id","signing_request_id","candidate_id",
      "final_signing_review_id","transaction_fingerprint_sha256",
      "required_confirmation","transaction_summary","authorized_at_utc",
      "valid_until_utc","consumed_at_utc","state_store_id",
      "state_store_realpath_sha256","state_store_root_dev",
      "state_store_root_ino","consumption","authority","next_gate",
      "consumption_record_id",
    ],
    "registry_signing_execution_consumption_record",
  );
  if(
    record.marker!==
      "VOID_DATANET_REGISTRY_SINGLE_USE_SIGNING_AUTHORIZATION_CONSUMPTION_V1"||
    record.version!==1||
    record.status!==
      "AUTHORIZATION_CONSUMED_FOR_EXACT_REGISTRY_TRANSACTION_SIGNING"||
    !CONSUMPTION_ID.test(String(record.consumption_record_id||""))||
    !OPERATION_ID.test(String(record.signing_operation_id||""))||
    record.signing_operation_id!==
      voidDatanetRegistrySigningOperationIdV1(authorization)||
    record.signing_authorization_id!==authorization.signing_authorization_id||
    record.signing_request_id!==authorization.signing_request_id||
    record.candidate_id!==authorization.candidate_id||
    record.final_signing_review_id!==authorization.final_signing_review_id||
    record.transaction_fingerprint_sha256!==
      authorization.transaction_fingerprint_sha256||
    record.required_confirmation!==authorization.required_confirmation||
    canonicalJson(record.transaction_summary)!==
      canonicalJson(authorization.transaction_summary)||
    record.authorized_at_utc!==authorization.authorized_at_utc||
    record.valid_until_utc!==authorization.valid_until_utc||
    record.state_store_id!==stateIdentity.state_store_id||
    record.state_store_root_dev!==stateIdentity.state_root_dev||
    record.state_store_root_ino!==stateIdentity.state_root_ino
  ){
    throw new Error("registry_signing_execution_consumption_record_mismatch");
  }

  const material=structuredClone(record);
  const id=material.consumption_record_id;
  delete material.consumption_record_id;
  const expectedId="voiddrsac1_"+sha256(Buffer.from(canonicalJson(material)));
  if(id!==expectedId){
    throw new Error("registry_signing_execution_consumption_record_id_mismatch");
  }

  const expectedConsumption={
    exact_single_transaction:true,
    signing_count_maximum:1,
    single_use:true,
    authorization_consumed:true,
    immutable_consumption_record:true,
    stable_signing_operation_slot:true,
    state_store_generation_bound:true,
    descriptor_relative_publication:true,
    replay_rejected_within_exact_state_store_generation:true,
    replay_prevention_scope:"exact_state_store_generation_and_signing_operation",
    global_replay_prevention_claimed:false,
    canonical_state_store_runtime_binding_required:true,
    expiry_rechecked_at_entry:true,
    expiry_rechecked_immediately_before_publication:true,
    consumption_precedes_any_signer_access:true,
  };
  exactKeys(
    record.consumption,
    Object.keys(expectedConsumption),
    "registry_signing_execution_consumption_facts",
  );
  for(const [key,value] of Object.entries(expectedConsumption)){
    if(record.consumption[key]!==value){
      throw new Error("registry_signing_execution_consumption_fact_mismatch:"+key);
    }
  }

  const expectedAuthority={
    filesystem_mutation_performed:true,
    credential_access_performed:false,
    private_key_access_performed:false,
    signer_object_exposed:false,
    wallet_access_performed:false,
    transaction_signer_access_authorized_by_this_gate:false,
    transaction_signer_access_performed:false,
    transaction_signing_performed:false,
    signed_transaction_export_performed:false,
    transaction_submission_performed:false,
    transaction_broadcast_authorized:false,
    transaction_broadcast_performed:false,
    deployment_authorized:false,
    deployment_performed:false,
    chain2050_write_authorized:false,
    chain2050_write_performed:false,
    validator_mutation_authorized:false,
    token_movement_authorized:false,
    funds_movement_performed:false,
    migration_authorized:false,
    public_activation_authorized:false,
    automatic_retry_authorized:false,
  };
  exactKeys(
    record.authority,
    Object.keys(expectedAuthority),
    "registry_signing_execution_consumption_authority",
  );
  for(const [key,value] of Object.entries(expectedAuthority)){
    if(record.authority[key]!==value){
      throw new Error("registry_signing_execution_consumption_authority_mismatch:"+key);
    }
  }
  if(
    record.next_gate!==
      "exact_nimo_registry_transaction_signing_from_consumed_authorization_v1"
  ){
    throw new Error("registry_signing_execution_consumption_next_gate_mismatch");
  }
  return record;
}

export function buildVoidDatanetRegistrySigningExecutionAdmissionV1(input){
  const candidate=validateVoidDatanetRegistryUnsignedTransactionCandidateV1(
    input?.unsigned_transaction_candidate,
    input?.candidate_evidence,
  );
  const request=validateVoidDatanetRegistryExactSigningRequestV1(
    input?.signing_request,
    input?.signing_request_evidence,
  );
  const authorization=
    validateVoidDatanetRegistrySingleTransactionSigningAuthorizationV1(
      input?.signing_authorization,
      {
        signing_request:request,
        signing_request_evidence:input?.signing_request_evidence,
      },
    );
  const stateIdentity=validateVoidDatanetRegistrySigningStateIdentityV1(
    input?.state_identity,
  );

  if(
    !AUTH_ID.test(String(authorization.signing_authorization_id||""))||
    !REQUEST_ID.test(String(request.signing_request_id||""))||
    !CANDIDATE_ID.test(String(candidate.candidate_id||""))||
    authorization.signing_request_id!==request.signing_request_id||
    authorization.candidate_id!==candidate.candidate_id||
    authorization.transaction_fingerprint_sha256!==
      candidate.transaction_fingerprint_sha256||
    authorization.transaction_summary.unsigned_transaction_hash!==
      candidate.transaction.unsigned_transaction_hash||
    authorization.signing_authorized!==true||
    authorization.signing_performed!==false||
    authorization.transaction_broadcast_authorized!==false||
    authorization.chain2050_write_authorized!==false
  ){
    throw new Error("registry_signing_execution_authorization_binding_mismatch");
  }

  const confirmation=String(input?.confirmation||"");
  if(confirmation!==authorization.required_confirmation){
    throw new Error("registry_signing_execution_confirmation_required");
  }

  const signedAt=timestamp(
    input?.signed_at_utc,
    "registry_signing_execution_signed_at",
  );
  const authorizedAt=timestamp(
    authorization.authorized_at_utc,
    "registry_signing_execution_authorized_at",
  );
  const expiresAt=timestamp(
    authorization.valid_until_utc,
    "registry_signing_execution_valid_until",
  );
  const candidateExpiry=timestamp(
    candidate.valid_until_utc,
    "registry_signing_execution_candidate_expiry",
  );
  if(
    signedAt.ms<authorizedAt.ms||
    signedAt.ms>=expiresAt.ms||
    signedAt.ms>candidateExpiry.ms
  ){
    throw new Error("registry_signing_execution_time_invalid");
  }

  const consumption=validateConsumptionRecord(
    input?.consumption_record,
    authorization,
    stateIdentity,
  );
  const consumedAt=timestamp(
    consumption.consumed_at_utc,
    "registry_signing_execution_consumed_at",
  );
  if(consumedAt.ms>signedAt.ms){
    throw new Error("registry_signing_execution_consumption_after_sign_time");
  }

  const tx=candidate.transaction;
  if(
    tx.from_address!==VOID_DATANET_REGISTRY_DEPLOYER_ADDRESS_V1||
    !ADDRESS.test(String(tx.from_address||""))||
    tx.to_address!==null||
    tx.value_wei!=="0"||
    !HASH.test(String(tx.unsigned_transaction_hash||""))||
    !HEX.test(String(tx.unsigned_serialized_transaction||""))||
    !SHA256.test(String(candidate.transaction_fingerprint_sha256||""))
  ){
    throw new Error("registry_signing_execution_candidate_shape_invalid");
  }

  const parsed=Transaction.from(tx.unsigned_serialized_transaction);
  if(
    parsed.signature!==null||
    parsed.unsignedHash.toLowerCase()!==tx.unsigned_transaction_hash||
    parsed.type!==2||
    parsed.chainId!==2050n
  ){
    throw new Error("registry_signing_execution_unsigned_transaction_mismatch");
  }

  const material={
    marker:VOID_DATANET_REGISTRY_CONSUMED_AUTHORIZATION_SIGNING_V1,
    version:1,
    status:"EXACT_CONSUMED_AUTHORIZATION_READY_FOR_SINGLE_SIGNING",
    signing_operation_id:consumption.signing_operation_id,
    state_store_id:stateIdentity.state_store_id,
    consumption_record_id:consumption.consumption_record_id,
    signing_authorization_id:authorization.signing_authorization_id,
    signing_request_id:request.signing_request_id,
    candidate_id:candidate.candidate_id,
    final_signing_review_id:authorization.final_signing_review_id,
    transaction_fingerprint_sha256:candidate.transaction_fingerprint_sha256,
    required_confirmation:authorization.required_confirmation,
    signed_at_utc:signedAt.raw,
    valid_until_utc:authorization.valid_until_utc,
    deployer_address:VOID_DATANET_REGISTRY_DEPLOYER_ADDRESS_V1,
    unsigned_transaction_hash:tx.unsigned_transaction_hash,
    unsigned_serialized_transaction_sha256:
      sha256(Buffer.from(tx.unsigned_serialized_transaction.slice(2),"hex")),
    transaction_summary:authorization.transaction_summary,
    authority:{
      consumed_authorization_verified:true,
      state_generation_verified:true,
      exact_confirmation_verified:true,
      runtime_expiry_rechecked:true,
      credential_access:false,
      private_key_access:false,
      signer_object_exposed:false,
      transaction_signing_authorized:true,
      transaction_signing_performed:false,
      signed_transaction_export:false,
      transaction_submission:false,
      transaction_broadcast_authorized:false,
      transaction_broadcast_performed:false,
      deployment_authorized:false,
      deployment_performed:false,
      chain2050_write_authorized:false,
      chain2050_write_performed:false,
      funds_movement:false,
      automatic_retry:false,
    },
    next_gate:"open_exact_deployer_credential_and_sign_once_no_broadcast_v1",
  };
  return Object.freeze({
    ...material,
    signing_execution_admission_id:
      "voiddrsea1_"+sha256(Buffer.from(canonicalJson(material))),
  });
}

export function buildVoidDatanetRegistrySigningClaimV1(input){
  const admission=input?.admission;
  if(
    !admission||
    admission.marker!==VOID_DATANET_REGISTRY_CONSUMED_AUTHORIZATION_SIGNING_V1||
    admission.version!==1||
    admission.status!=="EXACT_CONSUMED_AUTHORIZATION_READY_FOR_SINGLE_SIGNING"||
    !ADMISSION_ID.test(String(admission.signing_execution_admission_id||""))||
    admission.authority?.transaction_signing_authorized!==true||
    admission.authority?.transaction_signing_performed!==false
  ){
    throw new Error("registry_signing_claim_admission_invalid");
  }
  const material={
    marker:"VOID_DATANET_REGISTRY_SIGNING_CLAIM_V1",
    version:1,
    status:"SIGNING_ATTEMPT_DURABLY_CLAIMED_BEFORE_CREDENTIAL_ACCESS",
    signing_execution_admission_id:admission.signing_execution_admission_id,
    signing_operation_id:admission.signing_operation_id,
    state_store_id:admission.state_store_id,
    consumption_record_id:admission.consumption_record_id,
    signing_authorization_id:admission.signing_authorization_id,
    candidate_id:admission.candidate_id,
    transaction_fingerprint_sha256:admission.transaction_fingerprint_sha256,
    unsigned_transaction_hash:admission.unsigned_transaction_hash,
    claimed_at_utc:admission.signed_at_utc,
    valid_until_utc:admission.valid_until_utc,
    authority:{
      durable_single_signing_attempt_claim:true,
      credential_access:false,
      private_key_access:false,
      signer_object_exposed:false,
      transaction_signing_performed:false,
      signed_transaction_export:false,
      transaction_submission:false,
      transaction_broadcast_authorized:false,
      transaction_broadcast_performed:false,
      chain2050_write_authorized:false,
      chain2050_write_performed:false,
      funds_movement:false,
      automatic_retry:false,
    },
    next_gate:"open_exact_deployer_credential_and_sign_claimed_operation_once_v1",
  };
  return Object.freeze({
    ...material,
    signing_claim_id:
      "voiddrscl1_"+sha256(Buffer.from(canonicalJson(material))),
  });
}

export function validateVoidDatanetRegistrySigningClaimV1(claim,admission){
  if(
    !claim||
    claim.marker!=="VOID_DATANET_REGISTRY_SIGNING_CLAIM_V1"||
    claim.version!==1||
    claim.status!=="SIGNING_ATTEMPT_DURABLY_CLAIMED_BEFORE_CREDENTIAL_ACCESS"||
    !CLAIM_ID.test(String(claim.signing_claim_id||""))||
    claim.signing_execution_admission_id!==admission?.signing_execution_admission_id||
    claim.signing_operation_id!==admission?.signing_operation_id||
    claim.state_store_id!==admission?.state_store_id||
    claim.consumption_record_id!==admission?.consumption_record_id||
    claim.signing_authorization_id!==admission?.signing_authorization_id||
    claim.candidate_id!==admission?.candidate_id||
    claim.transaction_fingerprint_sha256!==admission?.transaction_fingerprint_sha256||
    claim.unsigned_transaction_hash!==admission?.unsigned_transaction_hash||
    claim.claimed_at_utc!==admission?.signed_at_utc||
    claim.valid_until_utc!==admission?.valid_until_utc||
    claim.next_gate!=="open_exact_deployer_credential_and_sign_claimed_operation_once_v1"
  ){
    throw new Error("registry_signing_claim_contract_invalid");
  }
  const material=structuredClone(claim);
  const id=material.signing_claim_id;
  delete material.signing_claim_id;
  if(id!=="voiddrscl1_"+sha256(Buffer.from(canonicalJson(material)))){
    throw new Error("registry_signing_claim_id_mismatch");
  }
  const expectedAuthority={
    durable_single_signing_attempt_claim:true,
    credential_access:false,
    private_key_access:false,
    signer_object_exposed:false,
    transaction_signing_performed:false,
    signed_transaction_export:false,
    transaction_submission:false,
    transaction_broadcast_authorized:false,
    transaction_broadcast_performed:false,
    chain2050_write_authorized:false,
    chain2050_write_performed:false,
    funds_movement:false,
    automatic_retry:false,
  };
  if(canonicalJson(claim.authority)!==canonicalJson(expectedAuthority)){
    throw new Error("registry_signing_claim_authority_mismatch");
  }
  return claim;
}

export async function signVoidDatanetRegistryConsumedAuthorizationV1(input){
  const admission=input?.admission;
  if(
    !admission||
    admission.marker!==VOID_DATANET_REGISTRY_CONSUMED_AUTHORIZATION_SIGNING_V1||
    admission.version!==1||
    admission.status!=="EXACT_CONSUMED_AUTHORIZATION_READY_FOR_SINGLE_SIGNING"||
    !ADMISSION_ID.test(String(admission.signing_execution_admission_id||""))||
    admission.authority?.transaction_signing_authorized!==true||
    admission.authority?.transaction_signing_performed!==false||
    admission.authority?.transaction_broadcast_authorized!==false||
    admission.authority?.chain2050_write_authorized!==false||
    admission.next_gate!=="open_exact_deployer_credential_and_sign_once_no_broadcast_v1"
  ){
    throw new Error("registry_signing_execution_admission_invalid");
  }
  const admissionMaterial=structuredClone(admission);
  const admissionId=admissionMaterial.signing_execution_admission_id;
  delete admissionMaterial.signing_execution_admission_id;
  if(
    admissionId!==
      "voiddrsea1_"+
      sha256(Buffer.from(canonicalJson(admissionMaterial)))
  ){
    throw new Error("registry_signing_execution_admission_id_mismatch");
  }

  const claim=validateVoidDatanetRegistrySigningClaimV1(
    input?.signing_claim,
    admission,
  );

  const unsignedSerialized=String(input?.unsigned_serialized_transaction||"").toLowerCase();
  if(
    !HEX.test(unsignedSerialized)||
    sha256(Buffer.from(unsignedSerialized.slice(2),"hex"))!==
      admission.unsigned_serialized_transaction_sha256
  ){
    throw new Error("registry_signing_execution_unsigned_bytes_mismatch");
  }
  const unsigned=Transaction.from(unsignedSerialized);
  if(
    unsigned.signature!==null||
    unsigned.unsignedHash.toLowerCase()!==admission.unsigned_transaction_hash
  ){
    throw new Error("registry_signing_execution_unsigned_hash_mismatch");
  }

  const privateKeyBytes=input?.private_key_bytes;
  if(
    !(privateKeyBytes instanceof Uint8Array)||
    privateKeyBytes.length!==32
  ){
    throw new Error("registry_signing_execution_private_key_bytes_invalid");
  }

  let key=null;
  try{
    key=new SigningKey(privateKeyBytes);
    const address=computeAddress(key.publicKey).toLowerCase();
    if(address!==admission.deployer_address){
      throw new Error("registry_signing_execution_deployer_identity_mismatch");
    }
    const signature=key.sign(unsigned.unsignedHash);
    unsigned.signature=signature;
    const signedSerialized=unsigned.serialized.toLowerCase();
    const parsed=Transaction.from(signedSerialized);
    if(
      parsed.from?.toLowerCase()!==admission.deployer_address||
      parsed.unsignedHash.toLowerCase()!==admission.unsigned_transaction_hash||
      parsed.signature===null||
      !HASH.test(String(parsed.hash||"").toLowerCase())
    ){
      throw new Error("registry_signing_execution_signed_transaction_verification_failed");
    }

    const signedMaterial={
      marker:VOID_DATANET_REGISTRY_CONSUMED_AUTHORIZATION_SIGNING_V1,
      version:1,
      status:"EXACT_REGISTRY_TRANSACTION_SIGNED_BROADCAST_HOLD",
      signed_at_utc:admission.signed_at_utc,
      signing_execution_admission_id:admission.signing_execution_admission_id,
      signing_claim_id:claim.signing_claim_id,
      signing_operation_id:admission.signing_operation_id,
      state_store_id:admission.state_store_id,
      consumption_record_id:admission.consumption_record_id,
      signing_authorization_id:admission.signing_authorization_id,
      signing_request_id:admission.signing_request_id,
      candidate_id:admission.candidate_id,
      final_signing_review_id:admission.final_signing_review_id,
      transaction_fingerprint_sha256:admission.transaction_fingerprint_sha256,
      deployer_address:admission.deployer_address,
      unsigned_transaction_hash:admission.unsigned_transaction_hash,
      signed_transaction_hash:parsed.hash.toLowerCase(),
      signed_serialized_transaction:signedSerialized,
      signed_serialized_transaction_sha256:
        sha256(Buffer.from(signedSerialized.slice(2),"hex")),
      authority:{
        consumed_authorization_verified:true,
        state_generation_verified:true,
        exact_confirmation_verified:true,
        credential_access:true,
        private_key_access:true,
        signer_object_exposed:false,
        transaction_signing_authorized:true,
        transaction_signing_performed:true,
        signed_transaction_export:true,
        transaction_submission:false,
        transaction_broadcast_authorized:false,
        transaction_broadcast_performed:false,
        deployment_authorized:false,
        deployment_performed:false,
        chain2050_write_authorized:false,
        chain2050_write_performed:false,
        funds_movement:false,
        automatic_retry:false,
      },
      next_gate:"separate_signed_transaction_verification_and_broadcast_authorization_v1",
    };
    return Object.freeze({
      ...signedMaterial,
      signed_transaction_id:
        "voiddrstx1_"+sha256(Buffer.from(canonicalJson(signedMaterial))),
    });
  }finally{
    privateKeyBytes.fill(0);
    key=null;
  }
}

export function validateVoidDatanetRegistrySignedTransactionV1(value){
  if(
    !value||
    typeof value!=="object"||
    Array.isArray(value)||
    value.marker!==VOID_DATANET_REGISTRY_CONSUMED_AUTHORIZATION_SIGNING_V1||
    value.version!==1||
    value.status!=="EXACT_REGISTRY_TRANSACTION_SIGNED_BROADCAST_HOLD"||
    !SIGNED_ID.test(String(value.signed_transaction_id||""))||
    !HASH.test(String(value.unsigned_transaction_hash||""))||
    !HASH.test(String(value.signed_transaction_hash||""))||
    !HEX.test(String(value.signed_serialized_transaction||""))||
    value.authority?.transaction_signing_performed!==true||
    value.authority?.transaction_broadcast_authorized!==false||
    value.authority?.transaction_broadcast_performed!==false||
    value.authority?.chain2050_write_authorized!==false||
    value.next_gate!=="separate_signed_transaction_verification_and_broadcast_authorization_v1"
  ){
    throw new Error("registry_signed_transaction_contract_invalid");
  }
  const material=structuredClone(value);
  const id=material.signed_transaction_id;
  delete material.signed_transaction_id;
  if(id!=="voiddrstx1_"+sha256(Buffer.from(canonicalJson(material)))){
    throw new Error("registry_signed_transaction_id_mismatch");
  }
  const parsed=Transaction.from(value.signed_serialized_transaction);
  if(
    parsed.signature===null||
    parsed.from?.toLowerCase()!==value.deployer_address||
    parsed.hash?.toLowerCase()!==value.signed_transaction_hash||
    parsed.unsignedHash.toLowerCase()!==value.unsigned_transaction_hash||
    sha256(Buffer.from(value.signed_serialized_transaction.slice(2),"hex"))!==
      value.signed_serialized_transaction_sha256
  ){
    throw new Error("registry_signed_transaction_parse_mismatch");
  }
  return value;
}
