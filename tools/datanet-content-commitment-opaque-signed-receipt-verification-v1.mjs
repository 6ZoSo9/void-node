import {
  getAddress,
  verifyMessage,
} from "ethers";
import {
  canonicalJson,
  sha256,
} from "./datanet-content-commitment-compiler-profile-v1.mjs";

export const VOID_DATANET_CONTENT_COMMITMENT_OPAQUE_SIGNED_RECEIPT_VERIFICATION_V1 =
  "VOID_DATANET_CONTENT_COMMITMENT_OPAQUE_SIGNED_RECEIPT_VERIFICATION_V1";

export const VOID_DATANET_CONTENT_COMMITMENT_OPAQUE_SIGNED_RECEIPT_ENVELOPE_V1 =
  "VOID_DATANET_CONTENT_COMMITMENT_OPAQUE_SIGNED_RECEIPT_ENVELOPE_V1";

export const VOID_DATANET_CONTENT_COMMITMENT_OPAQUE_SIGNED_RECEIPT_BODY_V1 =
  "VOID_DATANET_CONTENT_COMMITMENT_OPAQUE_SIGNED_RECEIPT_BODY_V1";

export const VOID_DATANET_CONTENT_COMMITMENT_OPAQUE_SIGNED_RECEIPT_ATTESTATION_DOMAIN_V1 =
  "void.datanet.content-commitment.opaque-signed-receipt.v1";

export const VOID_DATANET_CONTENT_COMMITMENT_OPAQUE_SIGNED_RECEIPT_VERIFICATION_AUTHORITY_V1 = {
  source_only_receipt_verification:true,
  exact_signing_request_required:true,
  signing_request_content_id_rederived:true,
  exact_unsigned_transaction_fingerprint_rederived:true,
  exact_transaction_summary_rederived:true,
  publisher_wallet_attestation_required:true,
  publisher_wallet_attestation_recovered_address_must_match:true,
  signed_transaction_hash_attested:true,
  custody_handle_fingerprint_attested:true,
  external_signing_idempotency_key_attested:true,
  raw_signed_transaction_required:false,
  raw_signed_transaction_verified_by_application:false,
  external_custody_inspection_still_required_for_payload_bytes:true,
  filesystem_read:false,
  filesystem_mutation:false,
  sovereign_private_key_access:false,
  transaction_signer_access:false,
  wallet_access:false,
  transaction_signing_performed:false,
  transaction_broadcast_authorized:false,
  transaction_broadcast_performed:false,
  chain2050_write_authorized:false,
  chain2050_write_performed:false,
  validator_mutation:false,
  governance_mutation:false,
  work_credit_mutation:false,
  service_action:false,
  funds_action:false,
  automatic_retry:false,
};

const DOMAIN=
  VOID_DATANET_CONTENT_COMMITMENT_OPAQUE_SIGNED_RECEIPT_ATTESTATION_DOMAIN_V1;
const ADDRESS=/^0x[0-9a-f]{40}$/;
const SHA256=/^[0-9a-f]{64}$/;
const HASH=/^0x[0-9a-f]{64}$/;
const REQUEST_ID=/^voiddccpsreq1_[0-9a-f]{64}$/;
const AUTHORIZATION_ID=/^voiddccsta1_[0-9a-f]{64}$/;
const AUTHORIZATION_VERIFICATION_ID=/^voiddccstav1_[0-9a-f]{64}$/;
const CONSUMPTION_ID=/^voiddccstac1_[0-9a-f]{64}$/;
const FINAL_REVIEW_ID=/^voiddccfsrp1_[0-9a-f]{64}$/;
const RECEIPT_ID=/^voiddccosr1_[0-9a-f]{64}$/;
const VERIFICATION_ID=/^voiddccosrv1_[0-9a-f]{64}$/;
const SIGNATURE=/^0x[0-9a-fA-F]{130}$/;

function plain(value){
  return value!==null&&typeof value==="object"&&!Array.isArray(value);
}
function text(value){
  return typeof value==="string"?value.trim():"";
}
function exactKeys(value,expected){
  return plain(value)&&
    JSON.stringify(Object.keys(value).sort())===
      JSON.stringify([...expected].sort());
}
function address(value){
  const raw=text(value);
  if(!/^0x[0-9a-fA-F]{40}$/.test(raw))return "";
  try{
    const normalized=getAddress(raw).toLowerCase();
    return ADDRESS.test(normalized)?normalized:"";
  }catch{
    return "";
  }
}
function canonicalUtc(value){
  const raw=text(value);
  if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(raw)){
    return "";
  }
  const ms=Date.parse(raw);
  if(!Number.isFinite(ms))return "";
  return new Date(ms).toISOString()===
    (raw.includes(".")?raw:raw.replace("Z",".000Z"))
    ?raw
    :"";
}
function held(reason,options={}){
  return {
    ok:false,
    marker:
      VOID_DATANET_CONTENT_COMMITMENT_OPAQUE_SIGNED_RECEIPT_VERIFICATION_V1,
    version:1,
    status:"held",
    reason,
    signing_request_id:options.signing_request_id??null,
    opaque_signed_receipt_id:options.opaque_signed_receipt_id??null,
    publisher_wallet_attestation_verified:false,
    raw_signed_transaction_accessed:false,
    raw_signed_transaction_verified_by_application:false,
    filesystem_mutation_performed:false,
    transaction_signer_access_performed:false,
    wallet_access_performed:false,
    transaction_signing_performed:false,
    transaction_broadcast_performed:false,
    chain2050_write_performed:false,
    authority:
      VOID_DATANET_CONTENT_COMMITMENT_OPAQUE_SIGNED_RECEIPT_VERIFICATION_AUTHORITY_V1,
    ...(options.detail?{detail:options.detail}:{}),
  };
}
function transactionSummary(candidate){
  if(!plain(candidate))return null;
  const from=address(candidate.from_address);
  const to=address(candidate.to_address);
  const calldata=text(candidate.calldata);
  const nonce=text(candidate.nonce);
  const gasLimit=text(candidate.gas_limit);
  const maxFee=text(candidate.max_fee_per_gas_wei);
  const priority=text(candidate.max_priority_fee_per_gas_wei);
  if(
    candidate.transaction_type!==2||
    text(candidate.chain_id)!=="2050"||
    !from||
    !to||
    from===to||
    text(candidate.value_wei)!=="0"||
    !/^(0|[1-9][0-9]*)$/.test(nonce)||
    !/^[1-9][0-9]*$/.test(gasLimit)||
    !/^[1-9][0-9]*$/.test(maxFee)||
    !/^(0|[1-9][0-9]*)$/.test(priority)||
    BigInt(priority)>BigInt(maxFee)||
    !/^0x(?:[0-9a-f]{2})+$/.test(calldata)
  )return null;
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
    calldata_sha256:sha256(Buffer.from(calldata.slice(2),"hex")),
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
    calldata:text(candidate.calldata),
    gas_limit:summary.gas_limit,
    max_fee_per_gas_wei:summary.max_fee_per_gas_wei,
    max_priority_fee_per_gas_wei:summary.max_priority_fee_per_gas_wei,
  };
}
function validateSigningRequest(value){
  if(
    !plain(value)||
    value.ok!==true||
    value.marker!==
      "VOID_DATANET_CONTENT_COMMITMENT_EXACT_PUBLISHER_SIGNING_REQUEST_V1"||
    value.version!==1||
    value.status!==
      "exact_consumed_transaction_ready_for_external_signing_request"||
    text(value.chain_id)!=="2050"||
    !REQUEST_ID.test(text(value.signing_request_id))||
    !AUTHORIZATION_ID.test(text(value.authorization_id))||
    !AUTHORIZATION_VERIFICATION_ID.test(
      text(value.authorization_verification_id),
    )||
    !CONSUMPTION_ID.test(text(value.consumption_record_id))||
    !FINAL_REVIEW_ID.test(text(value.final_signing_review_preflight_id))||
    !SHA256.test(text(value.unsigned_transaction_candidate_fingerprint_sha256))||
    !SHA256.test(text(value.canonical_state_store_realpath_sha256))||
    !SHA256.test(text(value.external_signing_idempotency_key_sha256))
  ){
    return {ok:false,reason:"opaque_signed_receipt_signing_request_invalid"};
  }

  const publisher=address(value.publisher_address);
  const candidate=normalizedCandidate(value.unsigned_transaction_candidate);
  const summary=transactionSummary(value.unsigned_transaction_candidate);
  if(
    !publisher||
    !candidate||
    candidate.from_address!==publisher||
    canonicalJson(summary)!==canonicalJson(value.transaction_summary)
  ){
    return {
      ok:false,
      reason:"opaque_signed_receipt_signing_request_candidate_invalid",
    };
  }
  const candidateFingerprint=sha256(canonicalJson(candidate));
  if(
    candidateFingerprint!==
      value.unsigned_transaction_candidate_fingerprint_sha256
  ){
    return {
      ok:false,
      reason:"opaque_signed_receipt_signing_request_fingerprint_mismatch",
    };
  }

  const issued=canonicalUtc(value.issued_at_utc);
  const expires=canonicalUtc(value.expires_at_utc);
  const constructed=canonicalUtc(value.request_constructed_at_utc);
  if(!issued||!expires||!constructed){
    return {
      ok:false,
      reason:"opaque_signed_receipt_signing_request_time_invalid",
    };
  }
  const issuedMs=Date.parse(issued);
  const expiresMs=Date.parse(expires);
  const constructedMs=Date.parse(constructed);
  if(
    constructedMs<issuedMs||
    constructedMs>=expiresMs
  ){
    return {
      ok:false,
      reason:"opaque_signed_receipt_signing_request_time_order_invalid",
    };
  }

  if(
    value.external_signer_contract?.prepare_once_required!==true||
    value.external_signer_contract?.inspect_prepared_required!==true||
    value.external_signer_contract?.signer_address_must_equal_publisher!==true||
    value.external_signer_contract?.exact_unsigned_transaction_fingerprint_required!==true||
    value.external_signer_contract?.external_runtime_expiry_recheck_required!==true||
    value.external_signer_contract?.opaque_custody_required!==true||
    value.external_signer_contract?.raw_signed_transaction_application_input!==false||
    value.external_signer_contract?.raw_signed_transaction_application_output!==false||
    value.external_signer_contract?.raw_signed_transaction_application_persistence!==false||
    value.external_signer_contract?.signed_transaction_hash_output_permitted!==true||
    value.external_signer_contract?.custody_handle_fingerprint_output_permitted!==true||
    value.external_signer_contract?.transaction_broadcast_authorized!==false
  ){
    return {
      ok:false,
      reason:"opaque_signed_receipt_external_signer_contract_invalid",
    };
  }

  if(
    value.authority?.signing_request_only!==true||
    value.authority?.sovereign_exact_transaction_signing_authorization_verified!==true||
    value.authority?.durable_authorization_consumption_verified!==true||
    value.authority?.application_private_key_access_performed!==false||
    value.authority?.application_wallet_access_performed!==false||
    value.authority?.transaction_signer_access_performed!==false||
    value.authority?.transaction_signing_performed!==false||
    value.authority?.transaction_broadcast_authorized!==false||
    value.authority?.transaction_broadcast_performed!==false||
    value.authority?.chain2050_write_authorized!==false||
    value.authority?.chain2050_write_performed!==false||
    value.authority?.filesystem_mutation_performed!==false||
    value.filesystem_mutation_performed!==false||
    value.sovereign_private_key_access_performed!==false||
    value.transaction_signer_access_performed!==false||
    value.wallet_access_performed!==false||
    value.transaction_signing_performed!==false||
    value.transaction_broadcast_performed!==false||
    value.chain2050_write_performed!==false||
    text(value.next_gate)!==
      "external_opaque_signer_execution_and_signed_receipt_verification_outside_application_v1"
  ){
    return {
      ok:false,
      reason:"opaque_signed_receipt_signing_request_authority_invalid",
    };
  }

  const material={
    marker:value.marker,
    version:value.version,
    status:value.status,
    chain_id:value.chain_id,
    authorization_id:value.authorization_id,
    authorization_verification_id:value.authorization_verification_id,
    consumption_record_id:value.consumption_record_id,
    final_signing_review_preflight_id:value.final_signing_review_preflight_id,
    unsigned_transaction_candidate_fingerprint_sha256:
      value.unsigned_transaction_candidate_fingerprint_sha256,
    publisher_address:value.publisher_address,
    unsigned_transaction_candidate:value.unsigned_transaction_candidate,
    transaction_summary:value.transaction_summary,
    canonical_state_store_realpath_sha256:
      value.canonical_state_store_realpath_sha256,
    external_signing_idempotency_key_sha256:
      value.external_signing_idempotency_key_sha256,
    issued_at_utc:value.issued_at_utc,
    expires_at_utc:value.expires_at_utc,
    request_constructed_at_utc:value.request_constructed_at_utc,
    external_signer_contract:value.external_signer_contract,
    authority:value.authority,
    next_gate:value.next_gate,
  };
  const expectedId=
    "voiddccpsreq1_"+sha256(canonicalJson(material));
  if(value.signing_request_id!==expectedId){
    return {
      ok:false,
      reason:"opaque_signed_receipt_signing_request_id_mismatch",
    };
  }

  return {
    ok:true,
    signing_request_id:expectedId,
    authorization_id:text(value.authorization_id),
    authorization_verification_id:text(value.authorization_verification_id),
    consumption_record_id:text(value.consumption_record_id),
    final_signing_review_preflight_id:
      text(value.final_signing_review_preflight_id),
    candidate_fingerprint:candidateFingerprint,
    publisher_address:publisher,
    external_signing_idempotency_key_sha256:
      text(value.external_signing_idempotency_key_sha256),
    issued_at_utc:issued,
    expires_at_utc:expires,
    request_constructed_at_utc:constructed,
    expires_ms:expiresMs,
  };
}
function validateReceiptEnvelope(value){
  if(
    !exactKeys(
      value,
      [
        "marker","version","receipt_body",
        "publisher_attestation_signature","opaque_signed_receipt_id",
      ],
    )||
    value.marker!==
      VOID_DATANET_CONTENT_COMMITMENT_OPAQUE_SIGNED_RECEIPT_ENVELOPE_V1||
    value.version!==1||
    !RECEIPT_ID.test(text(value.opaque_signed_receipt_id))||
    !SIGNATURE.test(text(value.publisher_attestation_signature))
  ){
    return {ok:false,reason:"opaque_signed_receipt_envelope_invalid"};
  }
  const body=value.receipt_body;
  if(
    !exactKeys(
      body,
      [
        "marker","version","external_signing_status",
        "signing_request_id","external_signing_idempotency_key_sha256",
        "authorization_id","consumption_record_id",
        "final_signing_review_preflight_id",
        "unsigned_transaction_candidate_fingerprint_sha256",
        "publisher_address","signed_transaction_hash",
        "custody_handle_fingerprint_sha256","signed_at_utc",
        "raw_signed_transaction_included",
        "transaction_broadcast_performed","chain2050_write_performed",
      ],
    )||
    body.marker!==
      VOID_DATANET_CONTENT_COMMITMENT_OPAQUE_SIGNED_RECEIPT_BODY_V1||
    body.version!==1||
    body.external_signing_status!=="prepared_in_opaque_custody"||
    !REQUEST_ID.test(text(body.signing_request_id))||
    !SHA256.test(text(body.external_signing_idempotency_key_sha256))||
    !AUTHORIZATION_ID.test(text(body.authorization_id))||
    !CONSUMPTION_ID.test(text(body.consumption_record_id))||
    !FINAL_REVIEW_ID.test(text(body.final_signing_review_preflight_id))||
    !SHA256.test(text(body.unsigned_transaction_candidate_fingerprint_sha256))||
    !address(body.publisher_address)||
    !HASH.test(text(body.signed_transaction_hash).toLowerCase())||
    !SHA256.test(text(body.custody_handle_fingerprint_sha256))||
    !canonicalUtc(body.signed_at_utc)||
    body.raw_signed_transaction_included!==false||
    body.transaction_broadcast_performed!==false||
    body.chain2050_write_performed!==false
  ){
    return {ok:false,reason:"opaque_signed_receipt_body_invalid"};
  }
  const withoutId={
    marker:value.marker,
    version:value.version,
    receipt_body:body,
    publisher_attestation_signature:value.publisher_attestation_signature,
  };
  const expectedId=
    "voiddccosr1_"+sha256(canonicalJson(withoutId));
  if(value.opaque_signed_receipt_id!==expectedId){
    return {ok:false,reason:"opaque_signed_receipt_id_mismatch"};
  }
  return {
    ok:true,
    body,
    signature:text(value.publisher_attestation_signature),
    receipt_id:expectedId,
  };
}
function attestationMessage(body){
  return DOMAIN+"\n"+canonicalJson(body);
}

export function verifyDatanetContentCommitmentOpaqueSignedReceiptV1(input){
  const request=validateSigningRequest(input?.signing_request);
  if(request.ok===false)return held(request.reason);

  const envelope=validateReceiptEnvelope(input?.opaque_signed_receipt);
  if(envelope.ok===false){
    return held(envelope.reason,{
      signing_request_id:request.signing_request_id,
    });
  }
  const body=envelope.body;
  if(
    body.signing_request_id!==request.signing_request_id||
    body.external_signing_idempotency_key_sha256!==
      request.external_signing_idempotency_key_sha256||
    body.authorization_id!==request.authorization_id||
    body.consumption_record_id!==request.consumption_record_id||
    body.final_signing_review_preflight_id!==
      request.final_signing_review_preflight_id||
    body.unsigned_transaction_candidate_fingerprint_sha256!==
      request.candidate_fingerprint||
    address(body.publisher_address)!==request.publisher_address
  ){
    return held("opaque_signed_receipt_request_binding_mismatch",{
      signing_request_id:request.signing_request_id,
      opaque_signed_receipt_id:envelope.receipt_id,
    });
  }
  const signedAtMs=Date.parse(body.signed_at_utc);
  const constructedMs=Date.parse(request.request_constructed_at_utc);
  if(
    !Number.isFinite(signedAtMs)||
    signedAtMs<constructedMs||
    signedAtMs>=request.expires_ms
  ){
    return held("opaque_signed_receipt_signed_time_invalid",{
      signing_request_id:request.signing_request_id,
      opaque_signed_receipt_id:envelope.receipt_id,
    });
  }

  let recovered="";
  try{
    recovered=address(
      verifyMessage(
        attestationMessage(body),
        envelope.signature,
      ),
    );
  }catch{
    return held("opaque_signed_receipt_publisher_attestation_invalid",{
      signing_request_id:request.signing_request_id,
      opaque_signed_receipt_id:envelope.receipt_id,
    });
  }
  if(!recovered||recovered!==request.publisher_address){
    return held("opaque_signed_receipt_publisher_attestation_signer_mismatch",{
      signing_request_id:request.signing_request_id,
      opaque_signed_receipt_id:envelope.receipt_id,
    });
  }

  const verified={
    marker:
      VOID_DATANET_CONTENT_COMMITMENT_OPAQUE_SIGNED_RECEIPT_VERIFICATION_V1,
    version:1,
    status:"opaque_signed_receipt_publisher_attestation_verified",
    chain_id:"2050",
    signing_request_id:request.signing_request_id,
    opaque_signed_receipt_id:envelope.receipt_id,
    authorization_id:request.authorization_id,
    consumption_record_id:request.consumption_record_id,
    final_signing_review_preflight_id:
      request.final_signing_review_preflight_id,
    external_signing_idempotency_key_sha256:
      request.external_signing_idempotency_key_sha256,
    unsigned_transaction_candidate_fingerprint_sha256:
      request.candidate_fingerprint,
    publisher_address:request.publisher_address,
    recovered_publisher_attestation_address:recovered,
    signed_transaction_hash:
      text(body.signed_transaction_hash).toLowerCase(),
    custody_handle_fingerprint_sha256:
      text(body.custody_handle_fingerprint_sha256),
    signed_at_utc:body.signed_at_utc,
    verification:{
      signing_request_content_id_rederived:true,
      unsigned_transaction_fingerprint_rederived:true,
      transaction_summary_rederived:true,
      publisher_wallet_attestation_verified:true,
      signed_transaction_hash_attested_by_publisher:true,
      custody_handle_fingerprint_attested_by_publisher:true,
      external_signing_idempotency_key_attested_by_publisher:true,
      raw_signed_transaction_accessed:false,
      raw_signed_transaction_verified_by_application:false,
      external_custody_inspection_still_required_for_payload_bytes:true,
    },
    authority:{
      receipt_verification_only:true,
      transaction_signer_access_performed:false,
      wallet_access_performed:false,
      transaction_signing_performed:false,
      filesystem_mutation_performed:false,
      transaction_broadcast_authorized:false,
      transaction_broadcast_performed:false,
      chain2050_write_authorized:false,
      chain2050_write_performed:false,
      validator_mutation_authorized:false,
      governance_mutation_authorized:false,
      work_credit_mutation_authorized:false,
      service_action_authorized:false,
      funds_action_authorized:false,
      automatic_retry_authorized:false,
    },
    next_gate:
      "explicit_sovereign_broadcast_authorization_for_exact_opaque_signed_receipt_v1",
  };

  return {
    ok:true,
    ...verified,
    opaque_signed_receipt_verification_id:
      "voiddccosrv1_"+sha256(canonicalJson(verified)),
    publisher_wallet_attestation_verified:true,
    raw_signed_transaction_accessed:false,
    raw_signed_transaction_verified_by_application:false,
    filesystem_mutation_performed:false,
    transaction_signer_access_performed:false,
    wallet_access_performed:false,
    transaction_signing_performed:false,
    transaction_broadcast_performed:false,
    chain2050_write_performed:false,
    authority_contract:
      VOID_DATANET_CONTENT_COMMITMENT_OPAQUE_SIGNED_RECEIPT_VERIFICATION_AUTHORITY_V1,
  };
}
