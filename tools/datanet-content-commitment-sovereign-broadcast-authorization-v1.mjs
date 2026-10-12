import crypto from "node:crypto";
import {
  VOID_DATANET_PHASE0_SOVEREIGN_PRIMARY_DER_SHA256_V1,
} from "./datanet-content-commitment-object-preflight-v1.mjs";
import {
  verifyDatanetContentCommitmentOpaqueSignedReceiptV1,
} from "./datanet-content-commitment-opaque-signed-receipt-verification-v1.mjs";
import {
  canonicalJson,
  sha256,
} from "./datanet-content-commitment-compiler-profile-v1.mjs";

export const VOID_DATANET_CONTENT_COMMITMENT_SOVEREIGN_BROADCAST_AUTHORIZATION_V1 =
  "VOID_DATANET_CONTENT_COMMITMENT_SOVEREIGN_BROADCAST_AUTHORIZATION_V1";

export const VOID_DATANET_CONTENT_COMMITMENT_SOVEREIGN_BROADCAST_AUTHORIZATION_REQUEST_V1 =
  "VOID_DATANET_CONTENT_COMMITMENT_SOVEREIGN_BROADCAST_AUTHORIZATION_REQUEST_V1";

export const VOID_DATANET_CONTENT_COMMITMENT_SOVEREIGN_BROADCAST_AUTHORIZATION_ENVELOPE_V1 =
  "VOID_DATANET_CONTENT_COMMITMENT_SOVEREIGN_BROADCAST_AUTHORIZATION_ENVELOPE_V1";

export const VOID_DATANET_CONTENT_COMMITMENT_SOVEREIGN_BROADCAST_AUTHORIZATION_DOMAIN_V1 =
  "void.datanet.content-commitment.sovereign-exact-signed-transaction-broadcast-authorization.v1";

export const VOID_DATANET_CONTENT_COMMITMENT_SOVEREIGN_BROADCAST_AUTHORIZATION_AUTHORITY_V1 = {
  source_only_signature_verification:true,
  production_sovereign_fingerprint_pinned:true,
  exact_opaque_signed_receipt_reverification_required:true,
  exact_signed_transaction_hash_required:true,
  exact_custody_handle_fingerprint_required:true,
  exact_original_unsigned_transaction_fingerprint_required:true,
  maximum_authorization_window_seconds:300,
  exact_signed_transaction_broadcast_authorization_may_be_verified:true,
  single_use_required:true,
  durable_consumption_before_broadcaster_access_required:true,
  runtime_expiry_recheck_before_broadcast_required:true,
  replay_prevention_enforced_by_this_verifier:false,
  raw_signed_transaction_required:false,
  raw_signed_transaction_accessed:false,
  sovereign_private_key_access:false,
  broadcaster_access_performed:false,
  transaction_broadcast_performed:false,
  chain2050_write_performed:false,
  filesystem_mutation:false,
  validator_mutation:false,
  governance_mutation:false,
  work_credit_mutation:false,
  service_action:false,
  funds_action:false,
  automatic_retry:false,
};

const BODY_MARKER=
  "VOID_DATANET_CONTENT_COMMITMENT_SOVEREIGN_BROADCAST_AUTHORIZATION_BODY_V1";
const ROLE="sovereign_primary_governance_attestation";
const DECISION="AUTHORIZE_EXACT_SIGNED_TRANSACTION_BROADCAST";
const AUTHORITY_MODE="SOVEREIGN_EXPLICIT_EXACT_SIGNED_TRANSACTION_BROADCAST";
const DOMAIN=
  VOID_DATANET_CONTENT_COMMITMENT_SOVEREIGN_BROADCAST_AUTHORIZATION_DOMAIN_V1;
const MAX_WINDOW_MS=300_000;
const SHA256=/^[0-9a-f]{64}$/;
const HASH=/^0x[0-9a-f]{64}$/;
const ADDRESS=/^0x[0-9a-f]{40}$/;
const SIGNING_REQUEST_ID=/^voiddccpsreq1_[0-9a-f]{64}$/;
const OPAQUE_RECEIPT_ID=/^voiddccosr1_[0-9a-f]{64}$/;
const OPAQUE_RECEIPT_VERIFICATION_ID=/^voiddccosrv1_[0-9a-f]{64}$/;
const SIGNING_AUTHORIZATION_ID=/^voiddccsta1_[0-9a-f]{64}$/;
const CONSUMPTION_ID=/^voiddccstac1_[0-9a-f]{64}$/;
const FINAL_REVIEW_ID=/^voiddccfsrp1_[0-9a-f]{64}$/;
const BROADCAST_AUTH_ID=/^voiddccba1_[0-9a-f]{64}$/;
const BROADCAST_AUTH_VERIFICATION_ID=/^voiddccbav1_[0-9a-f]{64}$/;

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
function canonicalUtc(value){
  const raw=text(value);
  if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(raw))return "";
  const ms=Date.parse(raw);
  if(!Number.isFinite(ms))return "";
  const rendered=new Date(ms).toISOString().replace(".000Z","Z");
  return rendered===raw?raw:"";
}
function validSignatureBase64(value){
  if(typeof value!=="string"||!/^[A-Za-z0-9+/]{86}==$/.test(value))return null;
  const bytes=Buffer.from(value,"base64");
  if(bytes.length!==64||bytes.toString("base64")!==value)return null;
  return bytes;
}
function publicKeyInfo(pem,expectedFingerprint){
  if(typeof pem!=="string"||!SHA256.test(expectedFingerprint)){
    return {ok:false,reason:"sovereign_broadcast_public_key_invalid"};
  }
  try{
    const key=crypto.createPublicKey({key:pem,type:"spki",format:"pem"});
    if(key.asymmetricKeyType!=="ed25519"){
      return {ok:false,reason:"sovereign_broadcast_public_key_not_ed25519"};
    }
    const canonical=key.export({type:"spki",format:"pem"}).toString();
    if(canonical!==pem){
      return {ok:false,reason:"sovereign_broadcast_public_key_not_canonical"};
    }
    const der=key.export({type:"spki",format:"der"});
    const fingerprint=crypto.createHash("sha256").update(der).digest("hex");
    if(fingerprint!==expectedFingerprint){
      return {
        ok:false,
        reason:"sovereign_broadcast_public_key_fingerprint_mismatch",
      };
    }
    return {ok:true,key,fingerprint};
  }catch{
    return {ok:false,reason:"sovereign_broadcast_public_key_invalid"};
  }
}
function held(reason,options={}){
  return {
    ok:false,
    marker:VOID_DATANET_CONTENT_COMMITMENT_SOVEREIGN_BROADCAST_AUTHORIZATION_V1,
    version:1,
    status:"held",
    reason,
    signing_request_id:options.signing_request_id??null,
    opaque_signed_receipt_id:options.opaque_signed_receipt_id??null,
    opaque_signed_receipt_verification_id:
      options.opaque_signed_receipt_verification_id??null,
    exact_signed_transaction_broadcast_authorization_verified:false,
    sovereign_private_key_access_performed:false,
    raw_signed_transaction_accessed:false,
    broadcaster_access_performed:false,
    transaction_broadcast_performed:false,
    chain2050_write_performed:false,
    filesystem_mutation_performed:false,
    authority:
      VOID_DATANET_CONTENT_COMMITMENT_SOVEREIGN_BROADCAST_AUTHORIZATION_AUTHORITY_V1,
    ...(options.detail?{detail:options.detail}:{}),
  };
}
function validateVerifiedReceipt(value){
  if(
    !plain(value)||
    value.ok!==true||
    value.marker!==
      "VOID_DATANET_CONTENT_COMMITMENT_OPAQUE_SIGNED_RECEIPT_VERIFICATION_V1"||
    value.version!==1||
    value.status!=="opaque_signed_receipt_publisher_attestation_verified"||
    text(value.chain_id)!=="2050"||
    !SIGNING_REQUEST_ID.test(text(value.signing_request_id))||
    !OPAQUE_RECEIPT_ID.test(text(value.opaque_signed_receipt_id))||
    !OPAQUE_RECEIPT_VERIFICATION_ID.test(
      text(value.opaque_signed_receipt_verification_id),
    )||
    !SIGNING_AUTHORIZATION_ID.test(text(value.authorization_id))||
    !CONSUMPTION_ID.test(text(value.consumption_record_id))||
    !FINAL_REVIEW_ID.test(text(value.final_signing_review_preflight_id))||
    !SHA256.test(text(value.external_signing_idempotency_key_sha256))||
    !SHA256.test(text(value.unsigned_transaction_candidate_fingerprint_sha256))||
    !ADDRESS.test(text(value.publisher_address))||
    value.recovered_publisher_attestation_address!==value.publisher_address||
    !HASH.test(text(value.signed_transaction_hash))||
    !SHA256.test(text(value.custody_handle_fingerprint_sha256))||
    value.publisher_wallet_attestation_verified!==true||
    value.raw_signed_transaction_accessed!==false||
    value.raw_signed_transaction_verified_by_application!==false||
    value.filesystem_mutation_performed!==false||
    value.transaction_signer_access_performed!==false||
    value.wallet_access_performed!==false||
    value.transaction_signing_performed!==false||
    value.transaction_broadcast_performed!==false||
    value.chain2050_write_performed!==false||
    value.verification?.signing_request_content_id_rederived!==true||
    value.verification?.unsigned_transaction_fingerprint_rederived!==true||
    value.verification?.transaction_summary_rederived!==true||
    value.verification?.publisher_wallet_attestation_verified!==true||
    value.verification?.signed_transaction_hash_attested_by_publisher!==true||
    value.verification?.custody_handle_fingerprint_attested_by_publisher!==true||
    value.verification?.external_signing_idempotency_key_attested_by_publisher!==true||
    value.verification?.raw_signed_transaction_accessed!==false||
    value.verification?.raw_signed_transaction_verified_by_application!==false||
    value.authority?.receipt_verification_only!==true||
    value.authority?.transaction_signer_access_performed!==false||
    value.authority?.wallet_access_performed!==false||
    value.authority?.transaction_signing_performed!==false||
    value.authority?.filesystem_mutation_performed!==false||
    value.authority?.transaction_broadcast_authorized!==false||
    value.authority?.transaction_broadcast_performed!==false||
    value.authority?.chain2050_write_authorized!==false||
    value.authority?.chain2050_write_performed!==false||
    text(value.next_gate)!==
      "explicit_sovereign_broadcast_authorization_for_exact_opaque_signed_receipt_v1"
  ){
    return {ok:false,reason:"sovereign_broadcast_verified_receipt_invalid"};
  }
  const verifiedMaterial={...value};
  delete verifiedMaterial.ok;
  delete verifiedMaterial.opaque_signed_receipt_verification_id;
  delete verifiedMaterial.publisher_wallet_attestation_verified;
  delete verifiedMaterial.raw_signed_transaction_accessed;
  delete verifiedMaterial.raw_signed_transaction_verified_by_application;
  delete verifiedMaterial.filesystem_mutation_performed;
  delete verifiedMaterial.transaction_signer_access_performed;
  delete verifiedMaterial.wallet_access_performed;
  delete verifiedMaterial.transaction_signing_performed;
  delete verifiedMaterial.transaction_broadcast_performed;
  delete verifiedMaterial.chain2050_write_performed;
  delete verifiedMaterial.authority_contract;

  const expectedVerificationId=
    "voiddccosrv1_"+sha256(canonicalJson(verifiedMaterial));
  if(value.opaque_signed_receipt_verification_id!==expectedVerificationId){
    return {
      ok:false,
      reason:"sovereign_broadcast_verified_receipt_id_mismatch",
    };
  }
  return {
    ok:true,
    signing_request_id:text(value.signing_request_id),
    opaque_signed_receipt_id:text(value.opaque_signed_receipt_id),
    opaque_signed_receipt_verification_id:expectedVerificationId,
    signing_authorization_id:text(value.authorization_id),
    consumption_record_id:text(value.consumption_record_id),
    final_signing_review_preflight_id:
      text(value.final_signing_review_preflight_id),
    external_signing_idempotency_key_sha256:
      text(value.external_signing_idempotency_key_sha256),
    unsigned_transaction_candidate_fingerprint_sha256:
      text(value.unsigned_transaction_candidate_fingerprint_sha256),
    publisher_address:text(value.publisher_address),
    signed_transaction_hash:text(value.signed_transaction_hash),
    custody_handle_fingerprint_sha256:
      text(value.custody_handle_fingerprint_sha256),
    signed_at_utc:text(value.signed_at_utc),
  };
}

export function buildDatanetContentCommitmentSovereignBroadcastAuthorizationRequestAgainstFingerprintV1(
  input,
  expectedSovereignFingerprint,
){
  if(!SHA256.test(text(expectedSovereignFingerprint))){
    return held("sovereign_broadcast_expected_fingerprint_invalid");
  }

  let verifiedReceipt;
  try{
    verifiedReceipt=verifyDatanetContentCommitmentOpaqueSignedReceiptV1({
      signing_request:input?.signing_request,
      opaque_signed_receipt:input?.opaque_signed_receipt,
    });
  }catch(error){
    return held("sovereign_broadcast_receipt_verifier_failed",{
      detail:{error_class:text(error?.name||"Error").slice(0,80)},
    });
  }
  if(verifiedReceipt?.ok===false){
    return held(
      "sovereign_broadcast_receipt_held:"+text(verifiedReceipt.reason),
    );
  }

  const receipt=validateVerifiedReceipt(verifiedReceipt);
  if(receipt.ok===false)return held(receipt.reason);

  const issued=canonicalUtc(input?.issued_at_utc);
  const expires=canonicalUtc(input?.expires_at_utc);
  if(!issued||!expires){
    return held("sovereign_broadcast_time_invalid",{
      signing_request_id:receipt.signing_request_id,
      opaque_signed_receipt_id:receipt.opaque_signed_receipt_id,
      opaque_signed_receipt_verification_id:
        receipt.opaque_signed_receipt_verification_id,
    });
  }
  const issuedMs=Date.parse(issued);
  const expiresMs=Date.parse(expires);
  const windowMs=expiresMs-issuedMs;
  if(windowMs<=0||windowMs>MAX_WINDOW_MS){
    return held("sovereign_broadcast_window_invalid",{
      signing_request_id:receipt.signing_request_id,
      opaque_signed_receipt_id:receipt.opaque_signed_receipt_id,
      opaque_signed_receipt_verification_id:
        receipt.opaque_signed_receipt_verification_id,
    });
  }
  const signedAtMs=Date.parse(receipt.signed_at_utc);
  if(!Number.isFinite(signedAtMs)||issuedMs<signedAtMs){
    return held("sovereign_broadcast_issued_before_external_signing",{
      signing_request_id:receipt.signing_request_id,
      opaque_signed_receipt_id:receipt.opaque_signed_receipt_id,
      opaque_signed_receipt_verification_id:
        receipt.opaque_signed_receipt_verification_id,
    });
  }

  const authorizationBody={
    marker:BODY_MARKER,
    version:1,
    chain_id:"2050",
    authority_mode:AUTHORITY_MODE,
    decision:DECISION,
    opaque_signed_receipt_verification_id:
      receipt.opaque_signed_receipt_verification_id,
    opaque_signed_receipt_id:receipt.opaque_signed_receipt_id,
    signing_request_id:receipt.signing_request_id,
    signing_authorization_id:receipt.signing_authorization_id,
    consumption_record_id:receipt.consumption_record_id,
    final_signing_review_preflight_id:
      receipt.final_signing_review_preflight_id,
    external_signing_idempotency_key_sha256:
      receipt.external_signing_idempotency_key_sha256,
    unsigned_transaction_candidate_fingerprint_sha256:
      receipt.unsigned_transaction_candidate_fingerprint_sha256,
    publisher_address:receipt.publisher_address,
    signed_transaction_hash:receipt.signed_transaction_hash,
    custody_handle_fingerprint_sha256:
      receipt.custody_handle_fingerprint_sha256,
    signed_at_utc:receipt.signed_at_utc,
    issued_at_utc:issued,
    expires_at_utc:expires,
    signer_role:ROLE,
    signer_public_key_der_sha256:expectedSovereignFingerprint,
    signature_algorithm:"Ed25519",
    signature_domain:DOMAIN,
    authorization_scope:{
      exact_signed_transaction_broadcast:true,
      exact_signed_transaction_hash:true,
      exact_custody_handle_fingerprint:true,
      original_unsigned_transaction_fingerprint_bound:true,
      raw_signed_transaction_application_access:false,
      single_use:true,
      durable_consumption_before_broadcaster_access_required:true,
      runtime_expiry_recheck_before_broadcast_required:true,
      automatic_retry:false,
    },
  };
  const signingBytes=Buffer.from(
    DOMAIN+"\n"+canonicalJson(authorizationBody),
    "utf8",
  );

  return {
    ok:true,
    marker:
      VOID_DATANET_CONTENT_COMMITMENT_SOVEREIGN_BROADCAST_AUTHORIZATION_REQUEST_V1,
    version:1,
    status:"sovereign_broadcast_signature_required",
    authorization_body:authorizationBody,
    authorization_body_sha256:sha256(canonicalJson(authorizationBody)),
    signing_bytes_base64:signingBytes.toString("base64"),
    raw_signed_transaction_accessed:false,
    sovereign_private_key_access_performed:false,
    broadcaster_access_performed:false,
    transaction_broadcast_performed:false,
    chain2050_write_performed:false,
  };
}

export function buildDatanetContentCommitmentSovereignBroadcastAuthorizationRequestV1(
  input,
){
  return buildDatanetContentCommitmentSovereignBroadcastAuthorizationRequestAgainstFingerprintV1(
    input,
    VOID_DATANET_PHASE0_SOVEREIGN_PRIMARY_DER_SHA256_V1,
  );
}

export function verifyDatanetContentCommitmentSovereignBroadcastAuthorizationAgainstFingerprintV1(
  input,
  expectedSovereignFingerprint,
){
  const envelope=input?.authorization_envelope;
  if(
    !exactKeys(
      envelope,
      [
        "marker","version","authorization_body","public_key_pem",
        "signature_base64","broadcast_authorization_id",
      ],
    )||
    envelope.marker!==
      VOID_DATANET_CONTENT_COMMITMENT_SOVEREIGN_BROADCAST_AUTHORIZATION_ENVELOPE_V1||
    envelope.version!==1||
    !BROADCAST_AUTH_ID.test(text(envelope.broadcast_authorization_id))
  ){
    return held("sovereign_broadcast_envelope_invalid");
  }

  const body=envelope.authorization_body;
  const request=
    buildDatanetContentCommitmentSovereignBroadcastAuthorizationRequestAgainstFingerprintV1(
      {
        signing_request:input?.signing_request,
        opaque_signed_receipt:input?.opaque_signed_receipt,
        issued_at_utc:body?.issued_at_utc,
        expires_at_utc:body?.expires_at_utc,
      },
      expectedSovereignFingerprint,
    );
  if(request.ok===false){
    return held("sovereign_broadcast_request_rebuild_held:"+request.reason);
  }
  if(canonicalJson(body)!==canonicalJson(request.authorization_body)){
    return held("sovereign_broadcast_body_mismatch");
  }

  const keyInfo=publicKeyInfo(
    envelope.public_key_pem,
    expectedSovereignFingerprint,
  );
  if(keyInfo.ok===false)return held(keyInfo.reason);

  const signature=validSignatureBase64(envelope.signature_base64);
  if(!signature){
    return held("sovereign_broadcast_signature_encoding_invalid");
  }
  const signingBytes=Buffer.from(request.signing_bytes_base64,"base64");
  if(!crypto.verify(null,signingBytes,keyInfo.key,signature)){
    return held("sovereign_broadcast_signature_invalid");
  }

  const envelopeWithoutId={
    marker:envelope.marker,
    version:envelope.version,
    authorization_body:body,
    public_key_pem:envelope.public_key_pem,
    signature_base64:envelope.signature_base64,
  };
  const expectedAuthorizationId=
    "voiddccba1_"+sha256(canonicalJson(envelopeWithoutId));
  if(envelope.broadcast_authorization_id!==expectedAuthorizationId){
    return held("sovereign_broadcast_authorization_id_mismatch");
  }

  const verified={
    marker:
      VOID_DATANET_CONTENT_COMMITMENT_SOVEREIGN_BROADCAST_AUTHORIZATION_V1,
    version:1,
    status:"exact_signed_transaction_broadcast_authorization_verified_unconsumed",
    chain_id:"2050",
    broadcast_authorization_id:expectedAuthorizationId,
    opaque_signed_receipt_verification_id:
      body.opaque_signed_receipt_verification_id,
    opaque_signed_receipt_id:body.opaque_signed_receipt_id,
    signing_request_id:body.signing_request_id,
    signing_authorization_id:body.signing_authorization_id,
    consumption_record_id:body.consumption_record_id,
    final_signing_review_preflight_id:
      body.final_signing_review_preflight_id,
    external_signing_idempotency_key_sha256:
      body.external_signing_idempotency_key_sha256,
    unsigned_transaction_candidate_fingerprint_sha256:
      body.unsigned_transaction_candidate_fingerprint_sha256,
    publisher_address:body.publisher_address,
    signed_transaction_hash:body.signed_transaction_hash,
    custody_handle_fingerprint_sha256:
      body.custody_handle_fingerprint_sha256,
    signed_at_utc:body.signed_at_utc,
    issued_at_utc:body.issued_at_utc,
    expires_at_utc:body.expires_at_utc,
    signer_public_key_der_sha256:keyInfo.fingerprint,
    authorization:{
      sovereign_signature_verified:true,
      exact_signed_transaction_broadcast_approved:true,
      single_use:true,
      authorization_consumed:false,
      consumption_record_present:false,
      durable_consumption_before_broadcaster_access_required:true,
      runtime_expiry_recheck_before_broadcast_required:true,
      replay_prevention_enforced_by_this_verifier:false,
    },
    authority:{
      authorization_evidence_only:true,
      exact_signed_transaction_broadcast_permitted_by_sovereign:true,
      sovereign_private_key_access_performed:false,
      raw_signed_transaction_accessed:false,
      broadcaster_access_performed:false,
      transaction_broadcast_performed:false,
      chain2050_write_performed:false,
      filesystem_mutation_performed:false,
      validator_mutation_authorized:false,
      governance_mutation_authorized:false,
      work_credit_mutation_authorized:false,
      service_action_authorized:false,
      funds_action_authorized:false,
      automatic_retry_authorized:false,
    },
    next_gate:
      "durable_single_use_broadcast_authorization_consumption_before_broadcaster_access_v1",
  };

  return {
    ok:true,
    ...verified,
    broadcast_authorization_verification_id:
      "voiddccbav1_"+sha256(canonicalJson(verified)),
    exact_signed_transaction_broadcast_authorization_verified:true,
    sovereign_private_key_access_performed:false,
    raw_signed_transaction_accessed:false,
    broadcaster_access_performed:false,
    transaction_broadcast_performed:false,
    chain2050_write_performed:false,
    filesystem_mutation_performed:false,
    authority_contract:
      VOID_DATANET_CONTENT_COMMITMENT_SOVEREIGN_BROADCAST_AUTHORIZATION_AUTHORITY_V1,
  };
}

export function verifyDatanetContentCommitmentSovereignBroadcastAuthorizationV1(
  input,
){
  return verifyDatanetContentCommitmentSovereignBroadcastAuthorizationAgainstFingerprintV1(
    input,
    VOID_DATANET_PHASE0_SOVEREIGN_PRIMARY_DER_SHA256_V1,
  );
}
