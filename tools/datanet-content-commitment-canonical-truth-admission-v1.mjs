import crypto from "node:crypto";
import {
  canonicalJson,
  sha256,
} from "./datanet-content-commitment-compiler-profile-v1.mjs";

export const VOID_DATANET_CONTENT_COMMITMENT_CANONICAL_TRUTH_ADMISSION_V1 =
  "VOID_DATANET_CONTENT_COMMITMENT_CANONICAL_TRUTH_ADMISSION_V1";
export const VOID_DATANET_CHAIN_COMMITMENT_V1 =
  "VOID_DATANET_CHAIN_COMMITMENT_V1";

export const VOID_DATANET_CONTENT_COMMITMENT_CANONICAL_TRUTH_AUTHORITY_V1 = {
  source_only_truth_admission:true,
  finalized_event_membership_required:true,
  finalized_event_membership_id_rederived:true,
  accepted_checkpoint_policy_bound:true,
  canonical_commitment_reference_emitted:true,
  canonical_commitment_truth_admitted:true,
  event_receipt_membership_verified:true,
  protocol_consensus_finality_claimed:false,
  reconstruction_authority_granted:false,
  publication_authority_granted:false,
  repair_execution_authority_granted:false,
  independent_custody_verified:false,
  replication_policy_verified:false,
  selected_bytes_custody_bound:false,
  filesystem_read:false,
  filesystem_mutation:false,
  sovereign_private_key_access:false,
  wallet_access:false,
  transaction_signing:false,
  transaction_submission:false,
  direct_rpc_transport:false,
  direct_network_transport:false,
  chain2050_write_direct:false,
  validator_mutation:false,
  governance_mutation:false,
  work_credit_mutation:false,
  funds_action:false,
  automatic_retry:false,
};

const SHA256=/^[0-9a-f]{64}$/;
const HASH=/^0x[0-9a-f]{64}$/;
const ADDRESS=/^0x[0-9a-f]{40}$/;
const UINT64_DECIMAL=/^(0|[1-9][0-9]{0,19})$/;
const UINT64_MAX=18446744073709551615n;
function canonicalUint64(value){
  const text=String(value??"");
  return UINT64_DECIMAL.test(text)&&BigInt(text)<=UINT64_MAX;
}
const EVENT_ID=/^voiddccfem1_[0-9a-f]{64}$/;
const SAFE_ID=/^[A-Za-z0-9][A-Za-z0-9._:-]{1,159}$/;

const EVENT_ROOT_KEYS=[
  "ok","marker","version","status","chain_id",
  "finalized_receipt_admission_id","finality_verification_id",
  "checkpoint_attestation_id","signed_transaction_hash",
  "registry_address","publisher_address","object_id",
  "commitment","finalized_receipt","event_receipt","verification",
  "authority","next_gate","finalized_event_membership_id",
  "event_receipt_membership_verified","canonical_commitment_truth_admitted",
  "protocol_consensus_finality_claimed",
  "filesystem_mutation_performed","sovereign_private_key_access_performed",
  "wallet_access_performed","transaction_signing_performed",
  "transaction_submission_performed","direct_rpc_call_performed",
  "direct_network_call_performed","chain2050_write_direct_performed",
  "authority_contract",
];

const EVENT_MATERIAL_KEYS=[
  "marker","version","status","chain_id",
  "finalized_receipt_admission_id","finality_verification_id",
  "checkpoint_attestation_id","signed_transaction_hash",
  "registry_address","publisher_address","object_id",
  "commitment","finalized_receipt","event_receipt","verification",
  "authority","next_gate",
];

function plain(v){return v!==null&&typeof v==="object"&&!Array.isArray(v);}
function exactKeys(v,expected){
  return plain(v)&&JSON.stringify(Object.keys(v).sort())===JSON.stringify([...expected].sort());
}
function pick(v,keys){const out={};for(const k of keys)out[k]=v[k];return out;}
function canonical(value){
  if(value===null)return "null";
  if(typeof value==="string"||typeof value==="boolean")return JSON.stringify(value);
  if(typeof value==="number"){
    if(!Number.isSafeInteger(value))throw new Error("non_canonical_number");
    return String(value);
  }
  if(Array.isArray(value))return "["+value.map(canonical).join(",")+"]";
  if(value&&typeof value==="object"){
    return "{"+Object.keys(value).sort().map(k=>JSON.stringify(k)+":"+canonical(value[k])).join(",")+"}";
  }
  throw new Error("non_canonical_value");
}
function hashObject(value){
  return crypto.createHash("sha256").update(Buffer.from(canonical(value),"utf8")).digest("hex");
}
function held(reason,detail={}){
  return {
    ok:false,
    marker:VOID_DATANET_CONTENT_COMMITMENT_CANONICAL_TRUTH_ADMISSION_V1,
    version:1,
    status:"held",
    reason,
    event_receipt_membership_verified:false,
    canonical_commitment_truth_admitted:false,
    reconstruction_authority_granted:false,
    protocol_consensus_finality_claimed:false,
    filesystem_mutation_performed:false,
    sovereign_private_key_access_performed:false,
    wallet_access_performed:false,
    transaction_signing_performed:false,
    transaction_submission_performed:false,
    direct_rpc_call_performed:false,
    direct_network_call_performed:false,
    chain2050_write_direct_performed:false,
    authority:VOID_DATANET_CONTENT_COMMITMENT_CANONICAL_TRUTH_AUTHORITY_V1,
    ...(Object.keys(detail).length?{detail}:{}),
  };
}
function validateEventMembership(v){
  if(
    !exactKeys(v,EVENT_ROOT_KEYS)||
    v.ok!==true||
    v.marker!=="VOID_DATANET_CONTENT_COMMITMENT_FINALIZED_EVENT_MEMBERSHIP_V1"||
    v.version!==1||
    v.status!=="finalized_content_committed_event_membership_verified_canonical_truth_pending"||
    v.chain_id!=="2050"||
    !EVENT_ID.test(String(v.finalized_event_membership_id||""))||
    !/^voiddccfra1_[0-9a-f]{64}$/.test(String(v.finalized_receipt_admission_id||""))||
    !/^voiddccrfv1_[0-9a-f]{64}$/.test(String(v.finality_verification_id||""))||
    !/^voiddccfca1_[0-9a-f]{64}$/.test(String(v.checkpoint_attestation_id||""))||
    !HASH.test(String(v.signed_transaction_hash||""))||
    !ADDRESS.test(String(v.registry_address||""))||
    !ADDRESS.test(String(v.publisher_address||""))||
    !SAFE_ID.test(String(v.object_id||""))||
    !SHA256.test(String(v.commitment?.object_id_sha256||""))||
    !SHA256.test(String(v.commitment?.content_sha256||""))||
    !/^[1-9][0-9]{0,8}$/.test(String(v.commitment?.byte_length||""))||
    !SHA256.test(String(v.commitment?.calldata_sha256||""))||
    !canonicalUint64(v.finalized_receipt?.block_number)||
    !HASH.test(String(v.finalized_receipt?.block_hash||""))||
    !canonicalUint64(v.finalized_receipt?.accepted_checkpoint_height)||
    !HASH.test(String(v.finalized_receipt?.accepted_checkpoint_hash||""))||
    v.finalized_receipt?.finality_policy_id!=="mainnet0-checkpoint-finality-v1"||
    v.finalized_receipt?.finality_kind!=="operator_recognized_accepted_checkpoint"||
    v.finalized_receipt?.protocol_consensus_finality_claimed!==false||
    !canonicalUint64(v.event_receipt?.log_index)||
    !SHA256.test(String(v.event_receipt?.receipt_fingerprint_sha256||""))||
    v.event_receipt?.receipt_revalidation_verified!==true||
    v.event_receipt?.canonical_block_hash_verified!==true||
    v.event_receipt?.event_receipt_membership_verified!==true||
    v.verification?.finalized_receipt_admission_id_rederived!==true||
    v.verification?.commitment_receipt_verifier_invoked!==true||
    v.verification?.exact_transaction_hash_bound!==true||
    v.verification?.exact_registry_bound!==true||
    v.verification?.exact_finalized_block_number_bound!==true||
    v.verification?.exact_finalized_block_hash_bound!==true||
    v.verification?.exact_object_digest_bound!==true||
    v.verification?.exact_content_digest_bound!==true||
    v.verification?.exact_byte_length_bound!==true||
    v.verification?.event_receipt_membership_verified!==true||
    v.verification?.canonical_commitment_truth_admitted!==false||
    v.authority?.source_only_membership_binding!==true||
    v.authority?.transaction_submission_authorized!==false||
    v.next_gate!=="datanet_content_commitment_canonical_commitment_truth_admission_v1"||
    v.event_receipt_membership_verified!==true||
    v.canonical_commitment_truth_admitted!==false||
    v.protocol_consensus_finality_claimed!==false||
    v.filesystem_mutation_performed!==false||
    v.sovereign_private_key_access_performed!==false||
    v.wallet_access_performed!==false||
    v.transaction_signing_performed!==false||
    v.transaction_submission_performed!==false||
    v.direct_rpc_call_performed!==false||
    v.direct_network_call_performed!==false||
    v.chain2050_write_direct_performed!==false
  ){
    return {ok:false,reason:"datanet_canonical_truth_event_membership_invalid"};
  }
  const material=pick(v,EVENT_MATERIAL_KEYS);
  const expected="voiddccfem1_"+sha256(canonicalJson(material));
  if(expected!==v.finalized_event_membership_id){
    return {ok:false,reason:"datanet_canonical_truth_event_membership_id_mismatch"};
  }
  const objectDigest=crypto.createHash("sha256").update(Buffer.from(v.object_id,"utf8")).digest("hex");
  if(objectDigest!==v.commitment.object_id_sha256){
    return {ok:false,reason:"datanet_canonical_truth_object_id_digest_mismatch"};
  }
  if(BigInt(v.finalized_receipt.accepted_checkpoint_height)<BigInt(v.finalized_receipt.block_number)){
    return {ok:false,reason:"datanet_canonical_truth_checkpoint_precedes_receipt"};
  }
  return {ok:true};
}

export function admitDatanetContentCommitmentCanonicalTruthV1(input){
  const eventMembership=input?.finalized_event_membership;
  const validation=validateEventMembership(eventMembership);
  if(validation.ok===false)return held(validation.reason);

  const referenceInput={
    chain_id:"2050",
    object_id:eventMembership.object_id,
    content_sha256:eventMembership.commitment.content_sha256,
    byte_length:eventMembership.commitment.byte_length,
    checkpoint_height:eventMembership.finalized_receipt.accepted_checkpoint_height,
    checkpoint_block_hash:eventMembership.finalized_receipt.accepted_checkpoint_hash,
    accepted_checkpoint_id:eventMembership.finalized_receipt.finality_policy_id,
    commitment_transaction_hash:eventMembership.signed_transaction_hash,
    commitment_log_index:eventMembership.event_receipt.log_index,
  };
  const commitmentId="voiddncommit1_"+hashObject({
    domain:"void:datanet:chain2050:content-commitment:v1",
    ...referenceInput,
  });
  const commitmentReference={
    marker:VOID_DATANET_CHAIN_COMMITMENT_V1,
    version:1,
    ...referenceInput,
    commitment_id:commitmentId,
  };

  const material={
    marker:VOID_DATANET_CONTENT_COMMITMENT_CANONICAL_TRUTH_ADMISSION_V1,
    version:1,
    status:"canonical_chain2050_content_commitment_truth_admitted_reconstruction_authority_pending",
    chain_id:"2050",
    finalized_event_membership_id:eventMembership.finalized_event_membership_id,
    finalized_receipt_admission_id:eventMembership.finalized_receipt_admission_id,
    finality_verification_id:eventMembership.finality_verification_id,
    checkpoint_attestation_id:eventMembership.checkpoint_attestation_id,
    finality_policy_id:eventMembership.finalized_receipt.finality_policy_id,
    finality_kind:eventMembership.finalized_receipt.finality_kind,
    protocol_consensus_finality_claimed:false,
    event_receipt_membership_verified:true,
    canonical_commitment_truth_admitted:true,
    commitment_reference:commitmentReference,
    verification:{
      finalized_event_membership_id_rederived:true,
      object_id_preimage_verified:true,
      accepted_checkpoint_policy_bound:true,
      finalized_checkpoint_not_before_receipt:true,
      event_receipt_membership_verified:true,
      canonical_commitment_reference_derived:true,
      canonical_commitment_truth_admitted:true,
    },
    authority:{
      canonical_truth_admission_only:true,
      reconstruction_authority_granted:false,
      publication_authority_granted:false,
      repair_execution_authority_granted:false,
      independent_custody_verified:false,
      replication_policy_verified:false,
      selected_bytes_custody_bound:false,
      transaction_submission_authorized:false,
      automatic_retry_authorized:false,
      filesystem_mutation_performed:false,
      sovereign_private_key_access_performed:false,
      wallet_access_performed:false,
      transaction_signing_performed:false,
      direct_rpc_call_performed:false,
      direct_network_call_performed:false,
      chain2050_write_direct_performed:false,
      validator_mutation_authorized:false,
      governance_mutation_authorized:false,
      work_credit_mutation_authorized:false,
      funds_action_authorized:false,
    },
    next_gate:"datanet_chain_peer_reconstruction_canonical_commitment_integration_v1",
  };

  return {
    ok:true,
    ...material,
    canonical_commitment_truth_admission_id:
      "voiddcccta1_"+sha256(canonicalJson(material)),
    reconstruction_authority_granted:false,
    filesystem_mutation_performed:false,
    sovereign_private_key_access_performed:false,
    wallet_access_performed:false,
    transaction_signing_performed:false,
    transaction_submission_performed:false,
    direct_rpc_call_performed:false,
    direct_network_call_performed:false,
    chain2050_write_direct_performed:false,
    authority_contract:
      VOID_DATANET_CONTENT_COMMITMENT_CANONICAL_TRUTH_AUTHORITY_V1,
  };
}
