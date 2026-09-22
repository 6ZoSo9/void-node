import {
  Interface,
} from "ethers";
import {
  canonicalJson,
  sha256,
} from "./datanet-content-commitment-compiler-profile-v1.mjs";

export const VOID_DATANET_CONTENT_COMMITMENT_FINALIZED_RECEIPT_ADMISSION_V1 =
  "VOID_DATANET_CONTENT_COMMITMENT_FINALIZED_RECEIPT_ADMISSION_V1";

export const VOID_DATANET_CONTENT_COMMITMENT_FINALIZED_RECEIPT_ADMISSION_AUTHORITY_V1 = {
  source_only_admission:true,
  exact_finality_verification_required:true,
  exact_signing_request_rederivation_required:true,
  exact_unsigned_candidate_fingerprint_rederived:true,
  exact_commit_calldata_decoded:true,
  finalized_confirmed_transaction_required:true,
  operator_recognized_checkpoint_finality_required:true,
  protocol_consensus_finality_claimed:false,
  event_receipt_membership_verified:false,
  canonical_commitment_truth_admitted:false,
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

const COMMIT=new Interface([
  "function commit(bytes32 objectIdSha256,bytes32 contentSha256,uint64 byteLength)",
]);

const SHA256=/^[0-9a-f]{64}$/;
const HASH=/^0x[0-9a-f]{64}$/;
const ADDRESS=/^0x[0-9a-f]{40}$/;
const DECIMAL=/^(0|[1-9][0-9]*)$/;
const SIGNING_REQUEST_ID=/^voiddccpsreq1_[0-9a-f]{64}$/;
const FINALITY_VERIFICATION_ID=/^voiddccrfv1_[0-9a-f]{64}$/;
const CHECKPOINT_ATTESTATION_ID=/^voiddccfca1_[0-9a-f]{64}$/;
const ADMISSION_ID=/^voiddccfra1_[0-9a-f]{64}$/;

const FINALITY_ROOT_KEYS=[
  "ok","marker","version","status","chain_id",
  "finality_policy_id","finality_kind",
  "receipt_verification_fingerprint_sha256","checkpoint_attestation_id",
  "signed_transaction_hash","receipt_status","transaction_status",
  "publisher_address","receipt_block_number","receipt_block_hash",
  "observed_current_block_number","observed_confirmation_count",
  "minimum_confirmations","accepted_checkpoint_height",
  "accepted_checkpoint_hash","signer_public_key_der_sha256",
  "commitment_succeeded","finality","authority","next_gate",
  "finality_verification_id","finality_verified",
  "protocol_consensus_finality_claimed",
  "transaction_submission_authorized","automatic_retry_allowed",
  "filesystem_mutation_performed","sovereign_private_key_access_performed",
  "wallet_access_performed","transaction_signing_performed",
  "direct_rpc_call_performed","direct_network_call_performed",
  "chain2050_write_direct_performed","authority_contract",
];
const FINALITY_MATERIAL_KEYS=[
  "marker","version","status","chain_id",
  "finality_policy_id","finality_kind",
  "receipt_verification_fingerprint_sha256","checkpoint_attestation_id",
  "signed_transaction_hash","receipt_status","transaction_status",
  "publisher_address","receipt_block_number","receipt_block_hash",
  "observed_current_block_number","observed_confirmation_count",
  "minimum_confirmations","accepted_checkpoint_height",
  "accepted_checkpoint_hash","signer_public_key_der_sha256",
  "commitment_succeeded","finality","authority","next_gate",
];

const SIGNING_ROOT_KEYS=[
  "ok","marker","version","status","chain_id","authorization_id",
  "authorization_verification_id","consumption_record_id",
  "final_signing_review_preflight_id",
  "unsigned_transaction_candidate_fingerprint_sha256",
  "publisher_address","unsigned_transaction_candidate","transaction_summary",
  "canonical_state_store_realpath_sha256",
  "external_signing_idempotency_key_sha256",
  "issued_at_utc","expires_at_utc","request_constructed_at_utc",
  "external_signer_contract","authority","next_gate","signing_request_id",
  "signing_request_constructed","filesystem_mutation_performed",
  "sovereign_private_key_access_performed",
  "transaction_signer_access_performed","wallet_access_performed",
  "transaction_signing_performed","transaction_broadcast_performed",
  "chain2050_write_performed","authority_contract",
];
const SIGNING_MATERIAL_KEYS=[
  "marker","version","status","chain_id","authorization_id",
  "authorization_verification_id","consumption_record_id",
  "final_signing_review_preflight_id",
  "unsigned_transaction_candidate_fingerprint_sha256",
  "publisher_address","unsigned_transaction_candidate","transaction_summary",
  "canonical_state_store_realpath_sha256",
  "external_signing_idempotency_key_sha256",
  "issued_at_utc","expires_at_utc","request_constructed_at_utc",
  "external_signer_contract","authority","next_gate",
];

function text(value){
  return typeof value==="string"?value.trim():"";
}
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
function held(reason,options={}){
  return {
    ok:false,
    marker:VOID_DATANET_CONTENT_COMMITMENT_FINALIZED_RECEIPT_ADMISSION_V1,
    version:1,
    status:"held",
    reason,
    finality_verification_id:options.finality_verification_id??null,
    signing_request_id:options.signing_request_id??null,
    admission_constructed:false,
    event_receipt_membership_verified:false,
    canonical_commitment_truth_admitted:false,
    filesystem_mutation_performed:false,
    sovereign_private_key_access_performed:false,
    wallet_access_performed:false,
    transaction_signing_performed:false,
    transaction_submission_performed:false,
    direct_rpc_call_performed:false,
    direct_network_call_performed:false,
    chain2050_write_direct_performed:false,
    authority:
      VOID_DATANET_CONTENT_COMMITMENT_FINALIZED_RECEIPT_ADMISSION_AUTHORITY_V1,
    ...(options.detail?{detail:options.detail}:{}),
  };
}
function validateFinality(value){
  if(
    !exactKeys(value,FINALITY_ROOT_KEYS)||
    value.ok!==true||
    value.marker!==
      "VOID_DATANET_CONTENT_COMMITMENT_CHAIN2050_RECONCILED_RECEIPT_FINALITY_V1"||
    value.version!==1||
    value.status!=="chain2050_reconciled_receipt_finality_verified"||
    text(value.chain_id)!=="2050"||
    value.finality_policy_id!=="mainnet0-checkpoint-finality-v1"||
    value.finality_kind!=="operator_recognized_accepted_checkpoint"||
    !SHA256.test(text(value.receipt_verification_fingerprint_sha256))||
    !CHECKPOINT_ATTESTATION_ID.test(text(value.checkpoint_attestation_id))||
    !FINALITY_VERIFICATION_ID.test(text(value.finality_verification_id))||
    !HASH.test(text(value.signed_transaction_hash))||
    value.receipt_status!=="confirmed"||
    value.transaction_status!=="1"||
    !ADDRESS.test(text(value.publisher_address))||
    !DECIMAL.test(text(value.receipt_block_number))||
    BigInt(value.receipt_block_number)<=0n||
    !HASH.test(text(value.receipt_block_hash))||
    !DECIMAL.test(text(value.observed_current_block_number))||
    !DECIMAL.test(text(value.observed_confirmation_count))||
    BigInt(value.observed_confirmation_count)<12n||
    value.minimum_confirmations!=="12"||
    !DECIMAL.test(text(value.accepted_checkpoint_height))||
    BigInt(value.accepted_checkpoint_height)<
      BigInt(value.receipt_block_number)+11n||
    !HASH.test(text(value.accepted_checkpoint_hash))||
    !SHA256.test(text(value.signer_public_key_der_sha256))||
    value.commitment_succeeded!==true||
    value.finality?.minimum_confirmation_threshold_applied!==true||
    value.finality?.minimum_confirmation_threshold_met!==true||
    value.finality?.accepted_checkpoint_membership_verified!==true||
    value.finality?.receipt_block_in_accepted_history_verified!==true||
    value.finality?.operator_recognized_canonical_checkpoint_verified!==true||
    value.finality?.chain_finality_verified!==true||
    value.finality?.protocol_consensus_finality_claimed!==false||
    value.authority?.finality_verification_only!==true||
    value.authority?.sovereign_checkpoint_signature_verified!==true||
    value.authority?.receipt_verification_bound!==true||
    value.authority?.transaction_submission_authorized!==false||
    value.authority?.automatic_retry_authorized!==false||
    value.authority?.filesystem_mutation_performed!==false||
    value.authority?.sovereign_private_key_access_performed!==false||
    value.authority?.wallet_access_performed!==false||
    value.authority?.transaction_signing_performed!==false||
    value.authority?.direct_rpc_call_performed!==false||
    value.authority?.direct_network_call_performed!==false||
    value.authority?.chain2050_write_direct_performed!==false||
    value.next_gate!=="datanet_content_commitment_finalized_receipt_admission_v1"||
    value.finality_verified!==true||
    value.protocol_consensus_finality_claimed!==false||
    value.transaction_submission_authorized!==false||
    value.automatic_retry_allowed!==false||
    value.filesystem_mutation_performed!==false||
    value.sovereign_private_key_access_performed!==false||
    value.wallet_access_performed!==false||
    value.transaction_signing_performed!==false||
    value.direct_rpc_call_performed!==false||
    value.direct_network_call_performed!==false||
    value.chain2050_write_direct_performed!==false
  ){
    return {ok:false,reason:"datanet_finalized_admission_finality_invalid"};
  }
  const material=pick(value,FINALITY_MATERIAL_KEYS);
  const expected=
    "voiddccrfv1_"+sha256(canonicalJson(material));
  if(expected!==value.finality_verification_id){
    return {ok:false,reason:"datanet_finalized_admission_finality_id_mismatch"};
  }
  return {ok:true};
}
function transactionSummary(candidate){
  if(!plain(candidate))return null;
  const calldata=text(candidate.calldata).toLowerCase();
  const from=text(candidate.from_address).toLowerCase();
  const to=text(candidate.to_address).toLowerCase();
  const nonce=text(candidate.nonce);
  const gasLimit=text(candidate.gas_limit);
  const maxFee=text(candidate.max_fee_per_gas_wei);
  const priority=text(candidate.max_priority_fee_per_gas_wei);
  if(
    candidate.transaction_type!==2||
    text(candidate.chain_id)!=="2050"||
    !ADDRESS.test(from)||
    !ADDRESS.test(to)||
    from===to||
    text(candidate.value_wei)!=="0"||
    !DECIMAL.test(nonce)||
    !/^[1-9][0-9]*$/.test(gasLimit)||
    !/^[1-9][0-9]*$/.test(maxFee)||
    !DECIMAL.test(priority)||
    BigInt(priority)>BigInt(maxFee)||
    !/^0x(?:[0-9a-f]{2})+$/.test(calldata)
  ){
    return null;
  }
  return {
    transaction_type:2,
    chain_id:"2050",
    nonce,
    from_address:from,
    to_address:to,
    value_wei:"0",
    gas_limit:gasLimit,
    max_fee_per_gas_wei:maxFee,
    max_priority_fee_per_gas_wei:priority,
    calldata_sha256:
      sha256(Buffer.from(calldata.slice(2),"hex")),
  };
}
function normalizedCandidate(candidate){
  const summary=transactionSummary(candidate);
  if(!summary)return null;
  return {
    transaction_type:2,
    chain_id:"2050",
    nonce:summary.nonce,
    from_address:summary.from_address,
    to_address:summary.to_address,
    value_wei:"0",
    calldata:text(candidate.calldata).toLowerCase(),
    gas_limit:summary.gas_limit,
    max_fee_per_gas_wei:summary.max_fee_per_gas_wei,
    max_priority_fee_per_gas_wei:summary.max_priority_fee_per_gas_wei,
  };
}
function validateSigningRequest(value,finality){
  if(
    !exactKeys(value,SIGNING_ROOT_KEYS)||
    value.ok!==true||
    value.marker!==
      "VOID_DATANET_CONTENT_COMMITMENT_EXACT_PUBLISHER_SIGNING_REQUEST_V1"||
    value.version!==1||
    value.status!=="exact_consumed_transaction_ready_for_external_signing_request"||
    text(value.chain_id)!=="2050"||
    !SIGNING_REQUEST_ID.test(text(value.signing_request_id))||
    !SHA256.test(text(value.unsigned_transaction_candidate_fingerprint_sha256))||
    !ADDRESS.test(text(value.publisher_address))||
    value.publisher_address!==finality.publisher_address||
    value.unsigned_transaction_candidate_fingerprint_sha256!==
      finality.unsigned_transaction_candidate_fingerprint_sha256||
    value.external_signer_contract?.prepare_once_required!==true||
    value.external_signer_contract?.inspect_prepared_required!==true||
    value.external_signer_contract?.signer_address_must_equal_publisher!==true||
    value.external_signer_contract?.exact_unsigned_transaction_fingerprint_required!==true||
    value.external_signer_contract?.opaque_custody_required!==true||
    value.external_signer_contract?.transaction_broadcast_authorized!==false||
    value.authority?.signing_request_only!==true||
    value.authority?.sovereign_exact_transaction_signing_authorization_verified!==true||
    value.authority?.durable_authorization_consumption_verified!==true||
    value.authority?.transaction_broadcast_authorized!==false||
    value.authority?.transaction_broadcast_performed!==false||
    value.authority?.chain2050_write_authorized!==false||
    value.authority?.chain2050_write_performed!==false||
    value.authority?.automatic_retry_authorized!==false||
    value.next_gate!==
      "external_opaque_signer_execution_and_signed_receipt_verification_outside_application_v1"||
    value.signing_request_constructed!==true||
    value.filesystem_mutation_performed!==false||
    value.sovereign_private_key_access_performed!==false||
    value.transaction_signer_access_performed!==false||
    value.wallet_access_performed!==false||
    value.transaction_signing_performed!==false||
    value.transaction_broadcast_performed!==false||
    value.chain2050_write_performed!==false
  ){
    return {ok:false,reason:"datanet_finalized_admission_signing_request_invalid"};
  }
  const material=pick(value,SIGNING_MATERIAL_KEYS);
  const expectedRequestId=
    "voiddccpsreq1_"+sha256(canonicalJson(material));
  if(expectedRequestId!==value.signing_request_id){
    return {ok:false,reason:"datanet_finalized_admission_signing_request_id_mismatch"};
  }
  const candidate=normalizedCandidate(value.unsigned_transaction_candidate);
  const summary=transactionSummary(value.unsigned_transaction_candidate);
  if(!candidate||!summary){
    return {ok:false,reason:"datanet_finalized_admission_candidate_invalid"};
  }
  const candidateFingerprint=sha256(canonicalJson(candidate));
  if(
    candidateFingerprint!==value.unsigned_transaction_candidate_fingerprint_sha256||
    canonicalJson(summary)!==canonicalJson(value.transaction_summary)
  ){
    return {ok:false,reason:"datanet_finalized_admission_candidate_binding_mismatch"};
  }
  return {ok:true,candidate,summary,candidateFingerprint};
}
function decodeCommitment(candidate){
  try{
    const parsed=COMMIT.parseTransaction({
      data:candidate.calldata,
      value:0n,
    });
    if(!parsed||parsed.name!=="commit"){
      return {ok:false,reason:"datanet_finalized_admission_commit_call_invalid"};
    }
    const objectId=String(parsed.args[0]).toLowerCase();
    const contentSha=String(parsed.args[1]).toLowerCase();
    const byteLength=BigInt(parsed.args[2]);
    if(
      !/^0x[0-9a-f]{64}$/.test(objectId)||
      !/^0x[0-9a-f]{64}$/.test(contentSha)||
      byteLength<1n||
      byteLength>268435456n
    ){
      return {ok:false,reason:"datanet_finalized_admission_commit_payload_invalid"};
    }
    const encoded=COMMIT.encodeFunctionData(
      "commit",
      [objectId,contentSha,byteLength],
    ).toLowerCase();
    if(encoded!==candidate.calldata){
      return {ok:false,reason:"datanet_finalized_admission_commit_roundtrip_mismatch"};
    }
    return {
      ok:true,
      object_id_sha256:objectId.slice(2),
      content_sha256:contentSha.slice(2),
      byte_length:byteLength.toString(),
      calldata_sha256:
        sha256(Buffer.from(candidate.calldata.slice(2),"hex")),
    };
  }catch{
    return {ok:false,reason:"datanet_finalized_admission_commit_call_invalid"};
  }
}

export function admitDatanetContentCommitmentFinalizedReceiptV1(input){
  const finality=input?.finality_verification;
  const finalityValidation=validateFinality(finality);
  if(finalityValidation.ok===false)return held(finalityValidation.reason);

  const signingValidation=
    validateSigningRequest(input?.signing_request,finality);
  if(signingValidation.ok===false){
    return held(
      signingValidation.reason,
      {finality_verification_id:finality.finality_verification_id},
    );
  }

  const decoded=decodeCommitment(signingValidation.candidate);
  if(decoded.ok===false){
    return held(
      decoded.reason,
      {
        finality_verification_id:finality.finality_verification_id,
        signing_request_id:input.signing_request.signing_request_id,
      },
    );
  }

  const material={
    marker:VOID_DATANET_CONTENT_COMMITMENT_FINALIZED_RECEIPT_ADMISSION_V1,
    version:1,
    status:"finalized_confirmed_commit_call_admitted_event_membership_pending",
    chain_id:"2050",
    finality_verification_id:finality.finality_verification_id,
    checkpoint_attestation_id:finality.checkpoint_attestation_id,
    signing_request_id:input.signing_request.signing_request_id,
    signed_transaction_hash:finality.signed_transaction_hash,
    unsigned_transaction_candidate_fingerprint_sha256:
      signingValidation.candidateFingerprint,
    registry_address:signingValidation.candidate.to_address,
    publisher_address:signingValidation.candidate.from_address,
    commitment:{
      object_id_sha256:decoded.object_id_sha256,
      content_sha256:decoded.content_sha256,
      byte_length:decoded.byte_length,
      function_signature:"commit(bytes32,bytes32,uint64)",
      calldata_sha256:decoded.calldata_sha256,
    },
    finalized_receipt:{
      transaction_status:"1",
      block_number:finality.receipt_block_number,
      block_hash:finality.receipt_block_hash,
      observed_confirmation_count:finality.observed_confirmation_count,
      accepted_checkpoint_height:finality.accepted_checkpoint_height,
      accepted_checkpoint_hash:finality.accepted_checkpoint_hash,
      finality_policy_id:finality.finality_policy_id,
      finality_kind:finality.finality_kind,
      protocol_consensus_finality_claimed:false,
    },
    verification:{
      finality_verification_id_rederived:true,
      signing_request_id_rederived:true,
      unsigned_transaction_candidate_fingerprint_rederived:true,
      exact_publisher_bound:true,
      exact_registry_bound:true,
      exact_commit_calldata_decoded:true,
      commit_calldata_roundtrip_verified:true,
      finalized_confirmed_transaction_verified:true,
      operator_recognized_checkpoint_finality_verified:true,
      content_committed_event_membership_verified:false,
      canonical_commitment_truth_admitted:false,
    },
    authority:{
      admission_artifact_only:true,
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
    next_gate:"datanet_content_commitment_finalized_event_membership_v1",
  };

  return {
    ok:true,
    ...material,
    finalized_receipt_admission_id:
      "voiddccfra1_"+sha256(canonicalJson(material)),
    admission_constructed:true,
    event_receipt_membership_verified:false,
    canonical_commitment_truth_admitted:false,
    filesystem_mutation_performed:false,
    sovereign_private_key_access_performed:false,
    wallet_access_performed:false,
    transaction_signing_performed:false,
    transaction_submission_performed:false,
    direct_rpc_call_performed:false,
    direct_network_call_performed:false,
    chain2050_write_direct_performed:false,
    authority_contract:
      VOID_DATANET_CONTENT_COMMITMENT_FINALIZED_RECEIPT_ADMISSION_AUTHORITY_V1,
  };
}
