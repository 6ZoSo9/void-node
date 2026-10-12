import crypto from "node:crypto";
import {
  VOID_DATANET_PHASE0_SOVEREIGN_PRIMARY_DER_SHA256_V1,
} from "./datanet-content-commitment-object-preflight-v1.mjs";
import {
  canonicalJson,
  sha256,
} from "./datanet-content-commitment-compiler-profile-v1.mjs";

export const VOID_DATANET_CONTENT_COMMITMENT_CHAIN2050_RECONCILED_RECEIPT_FINALITY_V1 =
  "VOID_DATANET_CONTENT_COMMITMENT_CHAIN2050_RECONCILED_RECEIPT_FINALITY_V1";

export const VOID_DATANET_CONTENT_COMMITMENT_CHAIN2050_ACCEPTED_CHECKPOINT_ATTESTATION_REQUEST_V1 =
  "VOID_DATANET_CONTENT_COMMITMENT_CHAIN2050_ACCEPTED_CHECKPOINT_ATTESTATION_REQUEST_V1";

export const VOID_DATANET_CONTENT_COMMITMENT_CHAIN2050_ACCEPTED_CHECKPOINT_ATTESTATION_ENVELOPE_V1 =
  "VOID_DATANET_CONTENT_COMMITMENT_CHAIN2050_ACCEPTED_CHECKPOINT_ATTESTATION_ENVELOPE_V1";

export const VOID_DATANET_CONTENT_COMMITMENT_CHAIN2050_ACCEPTED_CHECKPOINT_ATTESTATION_DOMAIN_V1 =
  "void.datanet.content-commitment.chain2050-reconciled-receipt-finality.v1";

export const VOID_DATANET_CONTENT_COMMITMENT_CHAIN2050_RECONCILED_RECEIPT_FINALITY_AUTHORITY_V1 = {
  source_only_finality_verification:true,
  exact_reconciled_receipt_verification_required:true,
  minimum_confirmations_required:"12",
  minimum_confirmation_threshold_applied:true,
  sovereign_signed_accepted_checkpoint_attestation_required:true,
  operator_recognized_checkpoint_policy:true,
  accepted_checkpoint_membership_verified:true,
  protocol_consensus_finality_claimed:false,
  submission_authority:false,
  automatic_retry:false,
  filesystem_read:false,
  filesystem_mutation:false,
  sovereign_private_key_access:false,
  wallet_access:false,
  transaction_signing:false,
  direct_rpc_transport:false,
  direct_network_transport:false,
  chain2050_write_direct:false,
  validator_mutation:false,
  governance_mutation:false,
  work_credit_mutation:false,
  funds_action_direct:false,
};

const DOMAIN=
  VOID_DATANET_CONTENT_COMMITMENT_CHAIN2050_ACCEPTED_CHECKPOINT_ATTESTATION_DOMAIN_V1;
const BODY_MARKER=
  "VOID_DATANET_CONTENT_COMMITMENT_CHAIN2050_ACCEPTED_CHECKPOINT_ATTESTATION_BODY_V1";
const DECISION=
  "ACCEPT_RECEIPT_BLOCK_IN_MAINNET0_CANONICAL_CHECKPOINT_HISTORY";
const POLICY="mainnet0-checkpoint-finality-v1";
const FINALITY_KIND="operator_recognized_accepted_checkpoint";
const MIN_CONFIRMATIONS=12n;
const SHA256=/^[0-9a-f]{64}$/;
const HASH=/^0x[0-9a-f]{64}$/;
const ADDRESS=/^0x[0-9a-f]{40}$/;
const AUTHORIZATION_ID=/^voiddccba1_[0-9a-f]{64}$/;
const CONSUMPTION_ID=/^voiddccbac1_[0-9a-f]{64}$/;
const INTENT_ID=/^voiddccbasi1_[0-9a-f]{64}$/;
const ATTESTATION_ID=/^voiddccfca1_[0-9a-f]{64}$/;
const FINALITY_VERIFICATION_ID=/^voiddccrfv1_[0-9a-f]{64}$/;
const SAFE_PROVIDER_ID=/^[A-Za-z0-9._:@/-]{0,200}$/;

const ROOT_KEYS=[
  "ok","marker","version","status","chain_id",
  "broadcast_authorization_id","broadcast_consumption_record_id",
  "submission_intent_id","submission_idempotency_key_sha256",
  "signed_transaction_hash","publisher_address",
  "unsigned_transaction_candidate_fingerprint_sha256",
  "canonical_state_store_realpath_sha256","reconciliation_status",
  "reconciled_at_utc","receipt_observed_at_utc",
  "receipt","verification","authority","next_gate",
  "receipt_observer_invoked","submit_method_invoked",
  "transaction_submission_authorized","automatic_retry_allowed",
  "receipt_verified","finality_verified",
  "raw_signed_transaction_accessed","opaque_custody_handle_accessed",
  "filesystem_mutation_performed","sovereign_private_key_access_performed",
  "wallet_access_performed","transaction_signing_performed",
  "direct_rpc_call_performed","direct_network_call_performed",
  "chain2050_write_direct_performed","authority_contract",
];
const RECEIPT_KEYS=[
  "status","transaction_status","transaction_hash","block_number","block_hash",
  "current_block_number","confirmation_count","from_address",
  "provider_observation_id",
];
const VERIFICATION_KEYS=[
  "exact_transaction_hash_verified","exact_publisher_verified",
  "terminal_status_consistent","receipt_block_hash_present",
  "confirmation_arithmetic_verified","minimum_confirmation_threshold_applied",
  "accepted_checkpoint_membership_verified","chain_finality_verified",
];
const AUTHORITY_KEYS=[
  "terminal_reconciliation_verified","durable_consumption_record_verified",
  "durable_submission_intent_verified","canonical_state_store_verified",
  "metadata_only_receipt_request","receipt_observer_invoked",
  "submit_method_invoked","transaction_submission_authorized",
  "automatic_retry_authorized","filesystem_mutation_performed",
  "sovereign_private_key_access_performed","wallet_access_performed",
  "transaction_signing_performed","direct_rpc_call_performed",
  "direct_network_call_performed","chain2050_write_direct_performed",
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
function decimal(value){
  const raw=text(value);
  return /^(0|[1-9][0-9]*)$/.test(raw)?raw:"";
}
function canonicalIso(value){
  const raw=text(value);
  const ms=Date.parse(raw);
  if(!raw||!Number.isFinite(ms))return "";
  return new Date(ms).toISOString()===raw?raw:"";
}
function validSignatureBase64(value){
  if(typeof value!=="string"||!/^[A-Za-z0-9+/]{86}==$/.test(value))return null;
  const bytes=Buffer.from(value,"base64");
  if(bytes.length!==64||bytes.toString("base64")!==value)return null;
  return bytes;
}
function publicKeyInfo(pem,expectedFingerprint){
  if(typeof pem!=="string"||!SHA256.test(text(expectedFingerprint))){
    return {ok:false,reason:"datanet_finality_public_key_invalid"};
  }
  try{
    const key=crypto.createPublicKey({key:pem,type:"spki",format:"pem"});
    if(key.asymmetricKeyType!=="ed25519"){
      return {ok:false,reason:"datanet_finality_public_key_not_ed25519"};
    }
    const canonical=key.export({type:"spki",format:"pem"}).toString();
    if(canonical!==pem){
      return {ok:false,reason:"datanet_finality_public_key_not_canonical"};
    }
    const der=key.export({type:"spki",format:"der"});
    const fingerprint=crypto.createHash("sha256").update(der).digest("hex");
    if(fingerprint!==expectedFingerprint){
      return {ok:false,reason:"datanet_finality_public_key_fingerprint_mismatch"};
    }
    return {ok:true,key,fingerprint};
  }catch{
    return {ok:false,reason:"datanet_finality_public_key_invalid"};
  }
}
function held(reason,options={}){
  return {
    ok:false,
    marker:
      VOID_DATANET_CONTENT_COMMITMENT_CHAIN2050_RECONCILED_RECEIPT_FINALITY_V1,
    version:1,
    status:"held",
    reason,
    signed_transaction_hash:options.signed_transaction_hash??null,
    checkpoint_attestation_id:options.checkpoint_attestation_id??null,
    finality_verified:false,
    protocol_consensus_finality_claimed:false,
    transaction_submission_authorized:false,
    automatic_retry_allowed:false,
    filesystem_mutation_performed:false,
    sovereign_private_key_access_performed:false,
    wallet_access_performed:false,
    transaction_signing_performed:false,
    direct_rpc_call_performed:false,
    direct_network_call_performed:false,
    chain2050_write_direct_performed:false,
    authority:
      VOID_DATANET_CONTENT_COMMITMENT_CHAIN2050_RECONCILED_RECEIPT_FINALITY_AUTHORITY_V1,
    ...(options.detail?{detail:options.detail}:{}),
  };
}
function validateReceiptVerification(value){
  if(
    !exactKeys(value,ROOT_KEYS)||
    value.ok!==true||
    value.marker!==
      "VOID_DATANET_CONTENT_COMMITMENT_RECONCILED_BROADCAST_RECEIPT_VERIFICATION_V1"||
    value.version!==1||
    value.status!=="reconciled_broadcast_receipt_verified_finality_pending"||
    text(value.chain_id)!=="2050"||
    !AUTHORIZATION_ID.test(text(value.broadcast_authorization_id))||
    !CONSUMPTION_ID.test(text(value.broadcast_consumption_record_id))||
    !INTENT_ID.test(text(value.submission_intent_id))||
    !SHA256.test(text(value.submission_idempotency_key_sha256))||
    !HASH.test(text(value.signed_transaction_hash))||
    !ADDRESS.test(text(value.publisher_address))||
    !SHA256.test(text(value.unsigned_transaction_candidate_fingerprint_sha256))||
    !SHA256.test(text(value.canonical_state_store_realpath_sha256))||
    !["confirmed","reverted"].includes(text(value.reconciliation_status))||
    !canonicalIso(value.reconciled_at_utc)||
    !canonicalIso(value.receipt_observed_at_utc)||
    !exactKeys(value.receipt,RECEIPT_KEYS)||
    !exactKeys(value.verification,VERIFICATION_KEYS)||
    !exactKeys(value.authority,AUTHORITY_KEYS)||
    text(value.receipt.status)!==text(value.reconciliation_status)||
    text(value.receipt.transaction_hash)!==text(value.signed_transaction_hash)||
    !["0","1"].includes(text(value.receipt.transaction_status))||
    (value.receipt.status==="confirmed"&&value.receipt.transaction_status!=="1")||
    (value.receipt.status==="reverted"&&value.receipt.transaction_status!=="0")||
    !decimal(value.receipt.block_number)||
    BigInt(value.receipt.block_number)<=0n||
    !HASH.test(text(value.receipt.block_hash))||
    !decimal(value.receipt.current_block_number)||
    BigInt(value.receipt.current_block_number)<BigInt(value.receipt.block_number)||
    !decimal(value.receipt.confirmation_count)||
    !ADDRESS.test(text(value.receipt.from_address))||
    value.receipt.from_address!==value.publisher_address||
    !SAFE_PROVIDER_ID.test(text(value.receipt.provider_observation_id))||
    value.verification.exact_transaction_hash_verified!==true||
    value.verification.exact_publisher_verified!==true||
    value.verification.terminal_status_consistent!==true||
    value.verification.receipt_block_hash_present!==true||
    value.verification.confirmation_arithmetic_verified!==true||
    value.verification.minimum_confirmation_threshold_applied!==false||
    value.verification.accepted_checkpoint_membership_verified!==false||
    value.verification.chain_finality_verified!==false||
    value.authority.terminal_reconciliation_verified!==true||
    value.authority.durable_consumption_record_verified!==true||
    value.authority.durable_submission_intent_verified!==true||
    value.authority.canonical_state_store_verified!==true||
    value.authority.metadata_only_receipt_request!==true||
    value.authority.receipt_observer_invoked!==true||
    value.authority.submit_method_invoked!==false||
    value.authority.transaction_submission_authorized!==false||
    value.authority.automatic_retry_authorized!==false||
    value.authority.filesystem_mutation_performed!==false||
    value.authority.sovereign_private_key_access_performed!==false||
    value.authority.wallet_access_performed!==false||
    value.authority.transaction_signing_performed!==false||
    value.authority.direct_rpc_call_performed!==false||
    value.authority.direct_network_call_performed!==false||
    value.authority.chain2050_write_direct_performed!==false||
    value.receipt_observer_invoked!==true||
    value.submit_method_invoked!==false||
    value.transaction_submission_authorized!==false||
    value.automatic_retry_allowed!==false||
    value.receipt_verified!==true||
    value.finality_verified!==false||
    value.raw_signed_transaction_accessed!==false||
    value.opaque_custody_handle_accessed!==false||
    value.filesystem_mutation_performed!==false||
    value.sovereign_private_key_access_performed!==false||
    value.wallet_access_performed!==false||
    value.transaction_signing_performed!==false||
    value.direct_rpc_call_performed!==false||
    value.direct_network_call_performed!==false||
    value.chain2050_write_direct_performed!==false||
    text(value.next_gate)!=="chain2050_reconciled_receipt_finality_v1"
  ){
    return {ok:false,reason:"datanet_finality_receipt_verification_invalid"};
  }
  const observed=
    BigInt(value.receipt.current_block_number)-
    BigInt(value.receipt.block_number)+
    1n;
  if(
    observed<=0n||
    observed.toString()!==value.receipt.confirmation_count
  ){
    return {ok:false,reason:"datanet_finality_confirmation_arithmetic_invalid"};
  }
  return {
    ok:true,
    fingerprint_sha256:sha256(canonicalJson(value)),
    status:value.receipt.status,
    transaction_status:value.receipt.transaction_status,
    transaction_hash:value.signed_transaction_hash,
    publisher_address:value.publisher_address,
    block_number:value.receipt.block_number,
    block_hash:value.receipt.block_hash,
    current_block_number:value.receipt.current_block_number,
    confirmation_count:value.receipt.confirmation_count,
  };
}

export function buildDatanetContentCommitmentChain2050AcceptedCheckpointAttestationRequestAgainstFingerprintV1(
  input,
  expectedSovereignFingerprint,
){
  const receipt=validateReceiptVerification(input?.receipt_verification);
  if(receipt.ok===false)return held(receipt.reason);
  if(!SHA256.test(text(expectedSovereignFingerprint))){
    return held(
      "datanet_finality_expected_fingerprint_invalid",
      {signed_transaction_hash:receipt.transaction_hash},
    );
  }
  if(BigInt(receipt.confirmation_count)<MIN_CONFIRMATIONS){
    return held(
      "datanet_finality_minimum_confirmations_not_met",
      {signed_transaction_hash:receipt.transaction_hash},
    );
  }
  const checkpointHeight=decimal(input?.accepted_checkpoint_height);
  const checkpointHash=text(input?.accepted_checkpoint_hash).toLowerCase();
  const issuedAt=canonicalIso(input?.issued_at_utc);
  if(
    !checkpointHeight||
    BigInt(checkpointHeight)<=0n||
    !HASH.test(checkpointHash)||
    !issuedAt
  ){
    return held(
      "datanet_finality_checkpoint_attestation_input_invalid",
      {signed_transaction_hash:receipt.transaction_hash},
    );
  }
  if(
    BigInt(checkpointHeight)<
      BigInt(receipt.block_number)+MIN_CONFIRMATIONS-1n
  ){
    return held(
      "datanet_finality_checkpoint_too_early_for_threshold",
      {signed_transaction_hash:receipt.transaction_hash},
    );
  }
  const body={
    marker:BODY_MARKER,
    version:1,
    chain_id:"2050",
    decision:DECISION,
    finality_policy_id:POLICY,
    finality_kind:FINALITY_KIND,
    receipt_verification_fingerprint_sha256:
      receipt.fingerprint_sha256,
    signed_transaction_hash:receipt.transaction_hash,
    receipt_status:receipt.status,
    transaction_status:receipt.transaction_status,
    publisher_address:receipt.publisher_address,
    receipt_block_number:receipt.block_number,
    receipt_block_hash:receipt.block_hash,
    observed_current_block_number:receipt.current_block_number,
    observed_confirmation_count:receipt.confirmation_count,
    minimum_confirmations:"12",
    minimum_confirmation_threshold_met:true,
    accepted_checkpoint_height:checkpointHeight,
    accepted_checkpoint_hash:checkpointHash,
    receipt_block_in_accepted_history:true,
    operator_recognized_canonical:true,
    protocol_consensus_finality_claimed:false,
    issued_at_utc:issuedAt,
    signer_role:"sovereign_primary_governance_attestation",
    signer_public_key_der_sha256:expectedSovereignFingerprint,
    signature_algorithm:"Ed25519",
    signature_domain:DOMAIN,
  };
  const signingBytes=Buffer.from(
    DOMAIN+"\n"+canonicalJson(body),
    "utf8",
  );
  return {
    ok:true,
    marker:
      VOID_DATANET_CONTENT_COMMITMENT_CHAIN2050_ACCEPTED_CHECKPOINT_ATTESTATION_REQUEST_V1,
    version:1,
    status:"sovereign_accepted_checkpoint_signature_required",
    attestation_body:body,
    attestation_body_sha256:sha256(canonicalJson(body)),
    signing_bytes_base64:signingBytes.toString("base64"),
    sovereign_private_key_access_performed:false,
    transaction_submission_authorized:false,
    chain2050_write_direct_performed:false,
  };
}

export function buildDatanetContentCommitmentChain2050AcceptedCheckpointAttestationRequestV1(
  input,
){
  return buildDatanetContentCommitmentChain2050AcceptedCheckpointAttestationRequestAgainstFingerprintV1(
    input,
    VOID_DATANET_PHASE0_SOVEREIGN_PRIMARY_DER_SHA256_V1,
  );
}

export function verifyDatanetContentCommitmentChain2050ReconciledReceiptFinalityAgainstFingerprintV1(
  input,
  expectedSovereignFingerprint,
){
  const envelope=input?.checkpoint_attestation_envelope;
  if(
    !exactKeys(
      envelope,
      [
        "marker","version","attestation_body","public_key_pem",
        "signature_base64","checkpoint_attestation_id",
      ],
    )||
    envelope.marker!==
      VOID_DATANET_CONTENT_COMMITMENT_CHAIN2050_ACCEPTED_CHECKPOINT_ATTESTATION_ENVELOPE_V1||
    envelope.version!==1||
    !ATTESTATION_ID.test(text(envelope.checkpoint_attestation_id))
  ){
    return held("datanet_finality_attestation_envelope_invalid");
  }
  const body=envelope.attestation_body;
  const request=
    buildDatanetContentCommitmentChain2050AcceptedCheckpointAttestationRequestAgainstFingerprintV1(
      {
        receipt_verification:input?.receipt_verification,
        accepted_checkpoint_height:body?.accepted_checkpoint_height,
        accepted_checkpoint_hash:body?.accepted_checkpoint_hash,
        issued_at_utc:body?.issued_at_utc,
      },
      expectedSovereignFingerprint,
    );
  if(request.ok===false){
    return held(
      "datanet_finality_request_rebuild_held:"+request.reason,
      {checkpoint_attestation_id:text(envelope.checkpoint_attestation_id)||null},
    );
  }
  if(canonicalJson(body)!==canonicalJson(request.attestation_body)){
    return held(
      "datanet_finality_attestation_body_mismatch",
      {
        signed_transaction_hash:
          request.attestation_body.signed_transaction_hash,
        checkpoint_attestation_id:envelope.checkpoint_attestation_id,
      },
    );
  }
  const keyInfo=publicKeyInfo(
    envelope.public_key_pem,
    expectedSovereignFingerprint,
  );
  if(keyInfo.ok===false){
    return held(
      keyInfo.reason,
      {
        signed_transaction_hash:body.signed_transaction_hash,
        checkpoint_attestation_id:envelope.checkpoint_attestation_id,
      },
    );
  }
  const signature=validSignatureBase64(envelope.signature_base64);
  if(!signature){
    return held(
      "datanet_finality_signature_encoding_invalid",
      {
        signed_transaction_hash:body.signed_transaction_hash,
        checkpoint_attestation_id:envelope.checkpoint_attestation_id,
      },
    );
  }
  if(
    !crypto.verify(
      null,
      Buffer.from(request.signing_bytes_base64,"base64"),
      keyInfo.key,
      signature,
    )
  ){
    return held(
      "datanet_finality_signature_invalid",
      {
        signed_transaction_hash:body.signed_transaction_hash,
        checkpoint_attestation_id:envelope.checkpoint_attestation_id,
      },
    );
  }
  const envelopeMaterial={
    marker:envelope.marker,
    version:envelope.version,
    attestation_body:body,
    public_key_pem:envelope.public_key_pem,
    signature_base64:envelope.signature_base64,
  };
  const expectedAttestationId=
    "voiddccfca1_"+sha256(canonicalJson(envelopeMaterial));
  if(envelope.checkpoint_attestation_id!==expectedAttestationId){
    return held(
      "datanet_finality_attestation_id_mismatch",
      {
        signed_transaction_hash:body.signed_transaction_hash,
        checkpoint_attestation_id:envelope.checkpoint_attestation_id,
      },
    );
  }

  const commitmentSucceeded=body.receipt_status==="confirmed";
  const verified={
    marker:
      VOID_DATANET_CONTENT_COMMITMENT_CHAIN2050_RECONCILED_RECEIPT_FINALITY_V1,
    version:1,
    status:"chain2050_reconciled_receipt_finality_verified",
    chain_id:"2050",
    finality_policy_id:POLICY,
    finality_kind:FINALITY_KIND,
    receipt_verification_fingerprint_sha256:
      body.receipt_verification_fingerprint_sha256,
    checkpoint_attestation_id:expectedAttestationId,
    signed_transaction_hash:body.signed_transaction_hash,
    receipt_status:body.receipt_status,
    transaction_status:body.transaction_status,
    publisher_address:body.publisher_address,
    receipt_block_number:body.receipt_block_number,
    receipt_block_hash:body.receipt_block_hash,
    observed_current_block_number:body.observed_current_block_number,
    observed_confirmation_count:body.observed_confirmation_count,
    minimum_confirmations:"12",
    accepted_checkpoint_height:body.accepted_checkpoint_height,
    accepted_checkpoint_hash:body.accepted_checkpoint_hash,
    signer_public_key_der_sha256:keyInfo.fingerprint,
    commitment_succeeded:commitmentSucceeded,
    finality:{
      minimum_confirmation_threshold_applied:true,
      minimum_confirmation_threshold_met:true,
      accepted_checkpoint_membership_verified:true,
      receipt_block_in_accepted_history_verified:true,
      operator_recognized_canonical_checkpoint_verified:true,
      chain_finality_verified:true,
      protocol_consensus_finality_claimed:false,
    },
    authority:{
      finality_verification_only:true,
      sovereign_checkpoint_signature_verified:true,
      receipt_verification_bound:true,
      transaction_submission_authorized:false,
      automatic_retry_authorized:false,
      filesystem_mutation_performed:false,
      sovereign_private_key_access_performed:false,
      wallet_access_performed:false,
      transaction_signing_performed:false,
      direct_rpc_call_performed:false,
      direct_network_call_performed:false,
      chain2050_write_direct_performed:false,
    },
    next_gate:
      commitmentSucceeded
        ?"datanet_content_commitment_finalized_receipt_admission_v1"
        :"datanet_content_commitment_reverted_terminal_closeout_v1",
  };
  const result={
    ok:true,
    ...verified,
    finality_verification_id:
      "voiddccrfv1_"+sha256(canonicalJson(verified)),
    finality_verified:true,
    protocol_consensus_finality_claimed:false,
    transaction_submission_authorized:false,
    automatic_retry_allowed:false,
    filesystem_mutation_performed:false,
    sovereign_private_key_access_performed:false,
    wallet_access_performed:false,
    transaction_signing_performed:false,
    direct_rpc_call_performed:false,
    direct_network_call_performed:false,
    chain2050_write_direct_performed:false,
    authority_contract:
      VOID_DATANET_CONTENT_COMMITMENT_CHAIN2050_RECONCILED_RECEIPT_FINALITY_AUTHORITY_V1,
  };
  if(!FINALITY_VERIFICATION_ID.test(result.finality_verification_id)){
    return held(
      "datanet_finality_verification_id_invalid",
      {
        signed_transaction_hash:body.signed_transaction_hash,
        checkpoint_attestation_id:expectedAttestationId,
      },
    );
  }
  return result;
}

export function verifyDatanetContentCommitmentChain2050ReconciledReceiptFinalityV1(
  input,
){
  return verifyDatanetContentCommitmentChain2050ReconciledReceiptFinalityAgainstFingerprintV1(
    input,
    VOID_DATANET_PHASE0_SOVEREIGN_PRIMARY_DER_SHA256_V1,
  );
}
