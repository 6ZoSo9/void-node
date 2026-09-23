import {
  canonicalJson,
  sha256,
} from "./datanet-content-commitment-compiler-profile-v1.mjs";
import {
  verifyDatanetChain2050CommitmentReceiptV1,
} from "../scripts/lib/void_datanet_chain2050_commitment_receipt_v1.mjs";

export const VOID_DATANET_CONTENT_COMMITMENT_FINALIZED_EVENT_MEMBERSHIP_V1 =
  "VOID_DATANET_CONTENT_COMMITMENT_FINALIZED_EVENT_MEMBERSHIP_V1";

export const VOID_DATANET_CONTENT_COMMITMENT_FINALIZED_EVENT_MEMBERSHIP_AUTHORITY_V1 = {
  source_only_membership_binding:true,
  finalized_admission_required:true,
  admission_id_rederived:true,
  commitment_receipt_verifier_invoked:true,
  exact_transaction_binding_required:true,
  exact_registry_binding_required:true,
  exact_finalized_block_binding_required:true,
  exact_object_digest_binding_required:true,
  exact_content_digest_binding_required:true,
  exact_byte_length_binding_required:true,
  event_receipt_membership_verified:true,
  canonical_commitment_truth_admitted:false,
  protocol_consensus_finality_claimed:false,
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
const DECIMAL=/^(0|[1-9][0-9]*)$/;
const ADMISSION_ID=/^voiddccfra1_[0-9a-f]{64}$/;

const ADMISSION_ROOT_KEYS=[
  "ok","marker","version","status","chain_id",
  "finality_verification_id","receipt_verification_fingerprint_sha256",
  "checkpoint_attestation_id","signing_request_id",
  "signed_transaction_hash",
  "unsigned_transaction_candidate_fingerprint_sha256",
  "registry_address","publisher_address","commitment","finalized_receipt",
  "verification","authority","next_gate","finalized_receipt_admission_id",
  "admission_constructed","event_receipt_membership_verified",
  "canonical_commitment_truth_admitted",
  "filesystem_mutation_performed","sovereign_private_key_access_performed",
  "wallet_access_performed","transaction_signing_performed",
  "transaction_submission_performed","direct_rpc_call_performed",
  "direct_network_call_performed","chain2050_write_direct_performed",
  "authority_contract",
];

const ADMISSION_MATERIAL_KEYS=[
  "marker","version","status","chain_id",
  "finality_verification_id","receipt_verification_fingerprint_sha256",
  "checkpoint_attestation_id","signing_request_id",
  "signed_transaction_hash",
  "unsigned_transaction_candidate_fingerprint_sha256",
  "registry_address","publisher_address","commitment","finalized_receipt",
  "verification","authority","next_gate",
];

const RECEIPT_ROOT_KEYS=[
  "ok","status","marker","version","chain_id","registry_address",
  "object_id","object_id_sha256","content_sha256","byte_length",
  "transaction_hash","log_index","block_height","block_hash",
  "receipt_fingerprint_sha256","observation_for_1464",
  "event_receipt_membership_verified","receipt_revalidation_verified",
  "canonical_block_hash_verified","durable_checkpoint_binding_verified",
  "accepted_checkpoint_membership_verified","fork_choice_verified",
  "peer_quorum_verified","chain_finality_verified","authority_ready_for_1464",
  "network_call_performed","filesystem_write_performed",
  "chain2050_mutation_performed","wallet_access_performed",
  "signing_performed","transaction_broadcast_performed",
  "money_movement_performed",
];

function plain(value){
  return value!==null&&typeof value==="object"&&!Array.isArray(value);
}
function exactKeys(value,expected){
  return plain(value)&&
    JSON.stringify(Object.keys(value).sort())===
      JSON.stringify([...expected].sort());
}
function pick(value,keys){
  const out={};
  for(const key of keys)out[key]=value[key];
  return out;
}
function held(reason,detail={}){
  return {
    ok:false,
    marker:VOID_DATANET_CONTENT_COMMITMENT_FINALIZED_EVENT_MEMBERSHIP_V1,
    version:1,
    status:"held",
    reason,
    event_receipt_membership_verified:false,
    canonical_commitment_truth_admitted:false,
    protocol_consensus_finality_claimed:false,
    filesystem_mutation_performed:false,
    sovereign_private_key_access_performed:false,
    wallet_access_performed:false,
    transaction_signing_performed:false,
    transaction_submission_performed:false,
    direct_rpc_call_performed:false,
    direct_network_call_performed:false,
    chain2050_write_direct_performed:false,
    authority:
      VOID_DATANET_CONTENT_COMMITMENT_FINALIZED_EVENT_MEMBERSHIP_AUTHORITY_V1,
    ...(Object.keys(detail).length?{detail}:{}),
  };
}

function validateAdmission(value){
  if(
    !exactKeys(value,ADMISSION_ROOT_KEYS)||
    value.ok!==true||
    value.marker!=="VOID_DATANET_CONTENT_COMMITMENT_FINALIZED_RECEIPT_ADMISSION_V1"||
    value.version!==1||
    value.status!=="finalized_confirmed_commit_call_admitted_event_membership_pending"||
    value.chain_id!=="2050"||
    !ADMISSION_ID.test(String(value.finalized_receipt_admission_id||""))||
    !HASH.test(String(value.signed_transaction_hash||""))||
    !ADDRESS.test(String(value.registry_address||""))||
    !ADDRESS.test(String(value.publisher_address||""))||
    !SHA256.test(String(value.commitment?.object_id_sha256||""))||
    !SHA256.test(String(value.commitment?.content_sha256||""))||
    !/^[1-9][0-9]{0,8}$/.test(String(value.commitment?.byte_length||""))||
    value.commitment?.function_signature!=="commit(bytes32,bytes32,uint64)"||
    !SHA256.test(String(value.commitment?.calldata_sha256||""))||
    value.finalized_receipt?.transaction_status!=="1"||
    !DECIMAL.test(String(value.finalized_receipt?.block_number||""))||
    !HASH.test(String(value.finalized_receipt?.block_hash||""))||
    value.finalized_receipt?.finality_policy_id!=="mainnet0-checkpoint-finality-v1"||
    value.finalized_receipt?.finality_kind!=="operator_recognized_accepted_checkpoint"||
    value.finalized_receipt?.protocol_consensus_finality_claimed!==false||
    value.verification?.finality_verification_id_rederived!==true||
    value.verification?.exact_publisher_bound!==true||
    value.verification?.exact_registry_bound!==true||
    value.verification?.exact_commit_calldata_decoded!==true||
    value.verification?.commit_calldata_roundtrip_verified!==true||
    value.verification?.finalized_confirmed_transaction_verified!==true||
    value.verification?.operator_recognized_checkpoint_finality_verified!==true||
    value.verification?.content_committed_event_membership_verified!==false||
    value.verification?.canonical_commitment_truth_admitted!==false||
    value.authority?.admission_artifact_only!==true||
    value.authority?.transaction_submission_authorized!==false||
    value.authority?.automatic_retry_authorized!==false||
    value.next_gate!=="datanet_content_commitment_finalized_event_membership_v1"||
    value.admission_constructed!==true||
    value.event_receipt_membership_verified!==false||
    value.canonical_commitment_truth_admitted!==false||
    value.filesystem_mutation_performed!==false||
    value.sovereign_private_key_access_performed!==false||
    value.wallet_access_performed!==false||
    value.transaction_signing_performed!==false||
    value.transaction_submission_performed!==false||
    value.direct_rpc_call_performed!==false||
    value.direct_network_call_performed!==false||
    value.chain2050_write_direct_performed!==false
  ){
    return {ok:false,reason:"datanet_finalized_event_membership_admission_invalid"};
  }
  const material=pick(value,ADMISSION_MATERIAL_KEYS);
  const expected="voiddccfra1_"+sha256(canonicalJson(material));
  if(expected!==value.finalized_receipt_admission_id){
    return {ok:false,reason:"datanet_finalized_event_membership_admission_id_mismatch"};
  }
  return {ok:true};
}

function validateReceiptResult(value){
  if(
    !exactKeys(value,RECEIPT_ROOT_KEYS)||
    value.ok!==true||
    value.status!=="commitment_receipt_verified"||
    value.marker!=="VOID_DATANET_CHAIN2050_COMMITMENT_RECEIPT_V1"||
    value.version!==1||
    value.chain_id!=="2050"||
    !ADDRESS.test(String(value.registry_address||""))||
    typeof value.object_id!=="string"||
    !SHA256.test(String(value.object_id_sha256||""))||
    !SHA256.test(String(value.content_sha256||""))||
    !DECIMAL.test(String(value.byte_length||""))||
    !HASH.test(String(value.transaction_hash||""))||
    !DECIMAL.test(String(value.log_index||""))||
    !DECIMAL.test(String(value.block_height||""))||
    !HASH.test(String(value.block_hash||""))||
    !SHA256.test(String(value.receipt_fingerprint_sha256||""))||
    value.event_receipt_membership_verified!==true||
    value.receipt_revalidation_verified!==true||
    value.canonical_block_hash_verified!==true||
    value.durable_checkpoint_binding_verified!==false||
    value.accepted_checkpoint_membership_verified!==false||
    value.chain_finality_verified!==false||
    value.authority_ready_for_1464!==false||
    value.network_call_performed!==false||
    value.filesystem_write_performed!==false||
    value.chain2050_mutation_performed!==false||
    value.wallet_access_performed!==false||
    value.signing_performed!==false||
    value.transaction_broadcast_performed!==false||
    value.money_movement_performed!==false
  ){
    return {ok:false,reason:"datanet_finalized_event_membership_receipt_result_invalid"};
  }
  return {ok:true};
}

export function bindDatanetContentCommitmentFinalizedEventMembershipV1(input){
  const admission=input?.finalized_admission;
  const admissionValidation=validateAdmission(admission);
  if(admissionValidation.ok===false)return held(admissionValidation.reason);

  const receipt=
    verifyDatanetChain2050CommitmentReceiptV1(input?.commitment_receipt_input);
  if(receipt.ok!==true){
    return held(
      "datanet_finalized_event_membership_receipt_verification_failed",
      {receipt_reason:receipt.reason??"unknown"},
    );
  }
  const receiptValidation=validateReceiptResult(receipt);
  if(receiptValidation.ok===false)return held(receiptValidation.reason);

  const bindings=[
    ["chain_id",receipt.chain_id,admission.chain_id],
    ["registry_address",receipt.registry_address,admission.registry_address],
    ["transaction_hash",receipt.transaction_hash,admission.signed_transaction_hash],
    ["block_height",receipt.block_height,admission.finalized_receipt.block_number],
    ["block_hash",receipt.block_hash,admission.finalized_receipt.block_hash],
    ["object_id_sha256",receipt.object_id_sha256,admission.commitment.object_id_sha256],
    ["content_sha256",receipt.content_sha256,admission.commitment.content_sha256],
    ["byte_length",receipt.byte_length,admission.commitment.byte_length],
  ];
  for(const [name,left,right] of bindings){
    if(left!==right){
      return held(
        "datanet_finalized_event_membership_binding_mismatch",
        {field:name},
      );
    }
  }

  const material={
    marker:VOID_DATANET_CONTENT_COMMITMENT_FINALIZED_EVENT_MEMBERSHIP_V1,
    version:1,
    status:"finalized_content_committed_event_membership_verified_canonical_truth_pending",
    chain_id:"2050",
    finalized_receipt_admission_id:admission.finalized_receipt_admission_id,
    finality_verification_id:admission.finality_verification_id,
    checkpoint_attestation_id:admission.checkpoint_attestation_id,
    signed_transaction_hash:admission.signed_transaction_hash,
    registry_address:admission.registry_address,
    publisher_address:admission.publisher_address,
    object_id:receipt.object_id,
    commitment:{
      object_id_sha256:admission.commitment.object_id_sha256,
      content_sha256:admission.commitment.content_sha256,
      byte_length:admission.commitment.byte_length,
      function_signature:admission.commitment.function_signature,
      calldata_sha256:admission.commitment.calldata_sha256,
    },
    finalized_receipt:{
      block_number:admission.finalized_receipt.block_number,
      block_hash:admission.finalized_receipt.block_hash,
      accepted_checkpoint_height:admission.finalized_receipt.accepted_checkpoint_height,
      accepted_checkpoint_hash:admission.finalized_receipt.accepted_checkpoint_hash,
      finality_policy_id:admission.finalized_receipt.finality_policy_id,
      finality_kind:admission.finalized_receipt.finality_kind,
      protocol_consensus_finality_claimed:false,
    },
    event_receipt:{
      log_index:receipt.log_index,
      receipt_fingerprint_sha256:receipt.receipt_fingerprint_sha256,
      receipt_revalidation_verified:true,
      canonical_block_hash_verified:true,
      event_receipt_membership_verified:true,
    },
    verification:{
      finalized_receipt_admission_id_rederived:true,
      commitment_receipt_verifier_invoked:true,
      exact_transaction_hash_bound:true,
      exact_registry_bound:true,
      exact_finalized_block_number_bound:true,
      exact_finalized_block_hash_bound:true,
      exact_object_digest_bound:true,
      exact_content_digest_bound:true,
      exact_byte_length_bound:true,
      event_receipt_membership_verified:true,
      canonical_commitment_truth_admitted:false,
    },
    authority:{
      source_only_membership_binding:true,
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
    next_gate:"datanet_content_commitment_canonical_commitment_truth_admission_v1",
  };

  return {
    ok:true,
    ...material,
    finalized_event_membership_id:
      "voiddccfem1_"+sha256(canonicalJson(material)),
    event_receipt_membership_verified:true,
    canonical_commitment_truth_admitted:false,
    protocol_consensus_finality_claimed:false,
    filesystem_mutation_performed:false,
    sovereign_private_key_access_performed:false,
    wallet_access_performed:false,
    transaction_signing_performed:false,
    transaction_submission_performed:false,
    direct_rpc_call_performed:false,
    direct_network_call_performed:false,
    chain2050_write_direct_performed:false,
    authority_contract:
      VOID_DATANET_CONTENT_COMMITMENT_FINALIZED_EVENT_MEMBERSHIP_AUTHORITY_V1,
  };
}
