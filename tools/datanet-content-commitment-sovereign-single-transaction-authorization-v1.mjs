import crypto from "node:crypto";
import {
  getAddress,
} from "ethers";
import {
  VOID_DATANET_PHASE0_SOVEREIGN_PRIMARY_DER_SHA256_V1,
} from "./datanet-content-commitment-object-preflight-v1.mjs";
import {
  canonicalJson,
  sha256,
} from "./datanet-content-commitment-compiler-profile-v1.mjs";

export const VOID_DATANET_CONTENT_COMMITMENT_SOVEREIGN_SINGLE_TRANSACTION_AUTHORIZATION_V1 =
  "VOID_DATANET_CONTENT_COMMITMENT_SOVEREIGN_SINGLE_TRANSACTION_AUTHORIZATION_V1";

export const VOID_DATANET_CONTENT_COMMITMENT_SOVEREIGN_SINGLE_TRANSACTION_AUTHORIZATION_REQUEST_V1 =
  "VOID_DATANET_CONTENT_COMMITMENT_SOVEREIGN_SINGLE_TRANSACTION_AUTHORIZATION_REQUEST_V1";

export const VOID_DATANET_CONTENT_COMMITMENT_SOVEREIGN_SINGLE_TRANSACTION_AUTHORIZATION_ENVELOPE_V1 =
  "VOID_DATANET_CONTENT_COMMITMENT_SOVEREIGN_SINGLE_TRANSACTION_AUTHORIZATION_ENVELOPE_V1";

export const VOID_DATANET_CONTENT_COMMITMENT_SOVEREIGN_SINGLE_TRANSACTION_AUTHORIZATION_DOMAIN_V1 =
  "void.datanet.content-commitment.sovereign-single-transaction-signing-authorization.v1";

export const VOID_DATANET_CONTENT_COMMITMENT_SOVEREIGN_SINGLE_TRANSACTION_AUTHORIZATION_AUTHORITY_V1 = {
  source_only_signature_verification:true,
  production_sovereign_fingerprint_pinned:true,
  exact_final_review_preflight_required:true,
  exact_unsigned_transaction_fingerprint_required:true,
  exact_transaction_summary_required:true,
  maximum_authorization_window_seconds:600,
  exact_single_transaction_signing_authorization_may_be_verified:true,
  single_use_required:true,
  durable_consumption_before_signing_required:true,
  runtime_expiry_recheck_before_signing_required:true,
  replay_prevention_enforced_by_this_verifier:false,
  sovereign_private_key_access:false,
  signer_object_exposed:false,
  signer_access_performed:false,
  wallet_access_performed:false,
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

const BODY_MARKER=
  "VOID_DATANET_CONTENT_COMMITMENT_SOVEREIGN_SINGLE_TRANSACTION_AUTHORIZATION_BODY_V1";
const ROLE="sovereign_primary_governance_attestation";
const DECISION="AUTHORIZE_EXACT_SINGLE_TRANSACTION_SIGNING";
const AUTHORITY_MODE="SOVEREIGN_EXPLICIT_SINGLE_TRANSACTION_SIGNING";
const DOMAIN=
  VOID_DATANET_CONTENT_COMMITMENT_SOVEREIGN_SINGLE_TRANSACTION_AUTHORIZATION_DOMAIN_V1;
const MAX_WINDOW_MS=600_000;
const SHA256=/^[0-9a-f]{64}$/;
const ADDRESS=/^0x[0-9a-f]{40}$/;
const FINAL_REVIEW_ID=/^voiddccfsrp1_[0-9a-f]{64}$/;
const PRE_SIGN_ID=/^voiddccpsr1_[0-9a-f]{64}$/;
const CREDENTIAL_BINDING_ID=/^voiddccpcb1_[0-9a-f]{64}$/;
const AUTHORIZATION_ID=/^voiddccsta1_[0-9a-f]{64}$/;

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
    return {ok:false,reason:"sovereign_authorization_public_key_invalid"};
  }
  try{
    const key=crypto.createPublicKey({key:pem,type:"spki",format:"pem"});
    if(key.asymmetricKeyType!=="ed25519"){
      return {ok:false,reason:"sovereign_authorization_public_key_not_ed25519"};
    }
    const canonical=key.export({type:"spki",format:"pem"}).toString();
    if(canonical!==pem){
      return {ok:false,reason:"sovereign_authorization_public_key_not_canonical"};
    }
    const der=key.export({type:"spki",format:"der"});
    const fingerprint=crypto.createHash("sha256").update(der).digest("hex");
    if(fingerprint!==expectedFingerprint){
      return {
        ok:false,
        reason:"sovereign_authorization_public_key_fingerprint_mismatch",
      };
    }
    return {ok:true,key,fingerprint};
  }catch{
    return {ok:false,reason:"sovereign_authorization_public_key_invalid"};
  }
}
function held(reason,detail){
  return {
    ok:false,
    marker:
      VOID_DATANET_CONTENT_COMMITMENT_SOVEREIGN_SINGLE_TRANSACTION_AUTHORIZATION_V1,
    version:1,
    status:"held",
    reason,
    exact_single_transaction_signing_authorization_verified:false,
    sovereign_private_key_access_performed:false,
    signer_object_exposed:false,
    signer_access_performed:false,
    wallet_access_performed:false,
    transaction_signing_performed:false,
    transaction_broadcast_performed:false,
    chain2050_write_performed:false,
    authority:
      VOID_DATANET_CONTENT_COMMITMENT_SOVEREIGN_SINGLE_TRANSACTION_AUTHORIZATION_AUTHORITY_V1,
    ...(detail?{detail}:{}),
  };
}
function validateFinalReview(value){
  if(
    !plain(value)||
    value.ok!==true||
    value.marker!==
      "VOID_DATANET_CONTENT_COMMITMENT_FINAL_SIGNING_REVIEW_PREFLIGHT_V1"||
    value.version!==1||
    value.status!==
      "fresh_candidate_and_publisher_identity_ready_for_separate_signing_authorization_review"||
    text(value.chain_id)!=="2050"||
    !FINAL_REVIEW_ID.test(text(value.final_signing_review_preflight_id))||
    !CREDENTIAL_BINDING_ID.test(text(value.prior_credential_binding_id))||
    !PRE_SIGN_ID.test(text(value.fresh_pre_sign_revalidation_id))||
    !CREDENTIAL_BINDING_ID.test(text(value.fresh_credential_binding_id))||
    !SHA256.test(text(value.unsigned_transaction_candidate_fingerprint_sha256))
  ){
    return {ok:false,reason:"sovereign_authorization_final_review_invalid"};
  }

  const publisher=address(value.publisher_address);
  const candidate=value.unsigned_transaction_candidate;
  const to=address(candidate?.to_address);
  const from=address(candidate?.from_address);
  const nonce=text(candidate?.nonce);
  const gasLimit=text(candidate?.gas_limit);
  const maxFee=text(candidate?.max_fee_per_gas_wei);
  const priority=text(candidate?.max_priority_fee_per_gas_wei);
  const calldata=text(candidate?.calldata);
  if(
    !publisher||
    !plain(candidate)||
    candidate.transaction_type!==2||
    text(candidate.chain_id)!=="2050"||
    from!==publisher||
    !to||
    to===publisher||
    text(candidate.value_wei)!=="0"||
    !/^(0|[1-9][0-9]*)$/.test(nonce)||
    !/^[1-9][0-9]*$/.test(gasLimit)||
    !/^[1-9][0-9]*$/.test(maxFee)||
    !/^(0|[1-9][0-9]*)$/.test(priority)||
    !/^0x(?:[0-9a-f]{2})+$/.test(calldata)
  ){
    return {ok:false,reason:"sovereign_authorization_candidate_invalid"};
  }

  const candidateFingerprint=sha256(canonicalJson(candidate));
  if(
    candidateFingerprint!==
      value.unsigned_transaction_candidate_fingerprint_sha256
  ){
    return {
      ok:false,
      reason:"sovereign_authorization_candidate_fingerprint_mismatch",
    };
  }

  if(
    value.revalidation?.full_pre_sign_revalidation_rerun!==true||
    value.revalidation?.repaired_freshness_wall_reapplied!==true||
    value.revalidation?.pending_nonce_rechecked_after_final_preflight!==true||
    value.revalidation?.credential_identity_binding_rerun_after_fresh_pre_sign!==true||
    value.revalidation?.prior_binding_used_as_lineage_only!==true||
    value.revalidation?.stale_pre_sign_result_authorizes_signing!==false
  ){
    return {
      ok:false,
      reason:"sovereign_authorization_revalidation_contract_invalid",
    };
  }

  if(
    value.authority?.review_artifact_only!==true||
    value.authority?.separate_explicit_signing_authorization_required!==true||
    value.authority?.signer_object_exposed!==false||
    value.authority?.signer_access_authorized!==false||
    value.authority?.wallet_access_authorized!==false||
    value.authority?.transaction_signing_authorized!==false||
    value.authority?.transaction_signing_performed!==false||
    value.authority?.transaction_broadcast_authorized!==false||
    value.authority?.transaction_broadcast_performed!==false||
    value.authority?.chain2050_write_authorized!==false||
    value.authority?.chain2050_write_performed!==false||
    value.authority?.automatic_retry_authorized!==false||
    value.signer_object_exposed!==false||
    value.signing_authorized!==false||
    value.signing_performed!==false||
    value.transaction_broadcast_authorized!==false||
    value.transaction_broadcast_performed!==false||
    value.chain2050_write_authorized!==false||
    value.chain2050_write_performed!==false||
    text(value.next_gate)!==
      "explicit_sovereign_single_transaction_signing_authorization_v1"
  ){
    return {
      ok:false,
      reason:"sovereign_authorization_upstream_authority_invalid",
    };
  }

  const finalReviewMaterial={
    marker:value.marker,
    version:value.version,
    status:value.status,
    chain_id:value.chain_id,
    prior_credential_binding_id:value.prior_credential_binding_id,
    fresh_pre_sign_revalidation_id:value.fresh_pre_sign_revalidation_id,
    fresh_credential_binding_id:value.fresh_credential_binding_id,
    publisher_address:value.publisher_address,
    unsigned_transaction_candidate:value.unsigned_transaction_candidate,
    unsigned_transaction_candidate_fingerprint_sha256:
      value.unsigned_transaction_candidate_fingerprint_sha256,
    revalidation:value.revalidation,
    authority:value.authority,
    next_gate:value.next_gate,
  };
  const expectedFinalReviewId=
    "voiddccfsrp1_"+sha256(canonicalJson(finalReviewMaterial));
  if(value.final_signing_review_preflight_id!==expectedFinalReviewId){
    return {
      ok:false,
      reason:"sovereign_authorization_final_review_id_mismatch",
    };
  }

  return {
    ok:true,
    final_signing_review_preflight_id:expectedFinalReviewId,
    fresh_pre_sign_revalidation_id:text(value.fresh_pre_sign_revalidation_id),
    fresh_credential_binding_id:text(value.fresh_credential_binding_id),
    publisher_address:publisher,
    candidate,
    candidate_fingerprint:candidateFingerprint,
    transaction_summary:{
      transaction_type:2,
      chain_id:"2050",
      nonce,
      from_address:publisher,
      to_address:to,
      value_wei:"0",
      gas_limit:gasLimit,
      max_fee_per_gas_wei:maxFee,
      max_priority_fee_per_gas_wei:priority,
      calldata_sha256:sha256(Buffer.from(calldata.slice(2),"hex")),
    },
  };
}

export function buildDatanetContentCommitmentSovereignSingleTransactionAuthorizationRequestAgainstFingerprintV1(
  input,
  expectedSovereignFingerprint,
){
  if(!SHA256.test(text(expectedSovereignFingerprint))){
    return held("sovereign_authorization_expected_fingerprint_invalid");
  }
  const finalReview=validateFinalReview(input?.final_signing_review);
  if(finalReview.ok===false)return held(finalReview.reason);

  const issued=canonicalUtc(input?.issued_at_utc);
  const expires=canonicalUtc(input?.expires_at_utc);
  if(!issued||!expires){
    return held("sovereign_authorization_time_invalid");
  }
  const issuedMs=Date.parse(issued);
  const expiresMs=Date.parse(expires);
  const windowMs=expiresMs-issuedMs;
  if(windowMs<=0||windowMs>MAX_WINDOW_MS){
    return held("sovereign_authorization_window_invalid");
  }

  const authorizationBody={
    marker:BODY_MARKER,
    version:1,
    chain_id:"2050",
    authority_mode:AUTHORITY_MODE,
    decision:DECISION,
    final_signing_review_preflight_id:
      finalReview.final_signing_review_preflight_id,
    fresh_pre_sign_revalidation_id:
      finalReview.fresh_pre_sign_revalidation_id,
    fresh_credential_binding_id:
      finalReview.fresh_credential_binding_id,
    unsigned_transaction_candidate_fingerprint_sha256:
      finalReview.candidate_fingerprint,
    publisher_address:finalReview.publisher_address,
    transaction_summary:finalReview.transaction_summary,
    issued_at_utc:issued,
    expires_at_utc:expires,
    signer_role:ROLE,
    signer_public_key_der_sha256:expectedSovereignFingerprint,
    signature_algorithm:"Ed25519",
    signature_domain:DOMAIN,
    authorization_scope:{
      exact_single_transaction:true,
      transaction_signing:true,
      transaction_broadcast:false,
      chain2050_write:false,
      automatic_retry:false,
      single_use:true,
      durable_consumption_before_signing_required:true,
      runtime_expiry_recheck_before_signing_required:true,
    },
  };
  const signingBytes=Buffer.from(
    DOMAIN+"\n"+canonicalJson(authorizationBody),
    "utf8",
  );

  return {
    ok:true,
    marker:
      VOID_DATANET_CONTENT_COMMITMENT_SOVEREIGN_SINGLE_TRANSACTION_AUTHORIZATION_REQUEST_V1,
    version:1,
    status:"sovereign_signature_required",
    authorization_body:authorizationBody,
    authorization_body_sha256:sha256(canonicalJson(authorizationBody)),
    signing_bytes_base64:signingBytes.toString("base64"),
    sovereign_private_key_access_performed:false,
    signing_performed:false,
    transaction_broadcast_performed:false,
    chain2050_write_performed:false,
  };
}

export function buildDatanetContentCommitmentSovereignSingleTransactionAuthorizationRequestV1(
  input,
){
  return buildDatanetContentCommitmentSovereignSingleTransactionAuthorizationRequestAgainstFingerprintV1(
    input,
    VOID_DATANET_PHASE0_SOVEREIGN_PRIMARY_DER_SHA256_V1,
  );
}

export function verifyDatanetContentCommitmentSovereignSingleTransactionAuthorizationAgainstFingerprintV1(
  input,
  expectedSovereignFingerprint,
){
  const envelope=input?.authorization_envelope;
  if(
    !exactKeys(
      envelope,
      [
        "marker","version","authorization_body","public_key_pem",
        "signature_base64","authorization_id",
      ],
    )||
    envelope.marker!==
      VOID_DATANET_CONTENT_COMMITMENT_SOVEREIGN_SINGLE_TRANSACTION_AUTHORIZATION_ENVELOPE_V1||
    envelope.version!==1||
    !AUTHORIZATION_ID.test(text(envelope.authorization_id))
  ){
    return held("sovereign_authorization_envelope_invalid");
  }

  const body=envelope.authorization_body;
  const request=
    buildDatanetContentCommitmentSovereignSingleTransactionAuthorizationRequestAgainstFingerprintV1(
      {
        final_signing_review:input?.final_signing_review,
        issued_at_utc:body?.issued_at_utc,
        expires_at_utc:body?.expires_at_utc,
      },
      expectedSovereignFingerprint,
    );
  if(request.ok===false){
    return held(
      "sovereign_authorization_request_rebuild_held:"+request.reason,
    );
  }
  if(canonicalJson(body)!==canonicalJson(request.authorization_body)){
    return held("sovereign_authorization_body_mismatch");
  }

  const keyInfo=publicKeyInfo(
    envelope.public_key_pem,
    expectedSovereignFingerprint,
  );
  if(keyInfo.ok===false)return held(keyInfo.reason);

  const signature=validSignatureBase64(envelope.signature_base64);
  if(!signature){
    return held("sovereign_authorization_signature_encoding_invalid");
  }
  const signingBytes=Buffer.from(request.signing_bytes_base64,"base64");
  if(!crypto.verify(null,signingBytes,keyInfo.key,signature)){
    return held("sovereign_authorization_signature_invalid");
  }

  const envelopeWithoutId={
    marker:envelope.marker,
    version:envelope.version,
    authorization_body:body,
    public_key_pem:envelope.public_key_pem,
    signature_base64:envelope.signature_base64,
  };
  const expectedAuthorizationId=
    "voiddccsta1_"+sha256(canonicalJson(envelopeWithoutId));
  if(envelope.authorization_id!==expectedAuthorizationId){
    return held("sovereign_authorization_id_mismatch");
  }

  const verified={
    marker:
      VOID_DATANET_CONTENT_COMMITMENT_SOVEREIGN_SINGLE_TRANSACTION_AUTHORIZATION_V1,
    version:1,
    status:"exact_single_transaction_sovereign_authorization_verified_unconsumed",
    chain_id:"2050",
    authorization_id:expectedAuthorizationId,
    final_signing_review_preflight_id:
      body.final_signing_review_preflight_id,
    fresh_pre_sign_revalidation_id:body.fresh_pre_sign_revalidation_id,
    fresh_credential_binding_id:body.fresh_credential_binding_id,
    unsigned_transaction_candidate_fingerprint_sha256:
      body.unsigned_transaction_candidate_fingerprint_sha256,
    publisher_address:body.publisher_address,
    transaction_summary:body.transaction_summary,
    issued_at_utc:body.issued_at_utc,
    expires_at_utc:body.expires_at_utc,
    signer_public_key_der_sha256:keyInfo.fingerprint,
    authorization:{
      sovereign_signature_verified:true,
      exact_single_transaction_signing_approved:true,
      single_use:true,
      authorization_consumed:false,
      consumption_record_present:false,
      durable_consumption_before_signing_required:true,
      runtime_expiry_recheck_before_signing_required:true,
      replay_prevention_enforced_by_this_verifier:false,
    },
    authority:{
      authorization_evidence_only:true,
      exact_transaction_signing_permitted_by_sovereign:true,
      sovereign_private_key_access_performed:false,
      signer_object_exposed:false,
      signer_access_performed:false,
      wallet_access_performed:false,
      transaction_signing_performed:false,
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
      "durable_single_use_authorization_consumption_before_exact_transaction_signing_v1",
  };

  return {
    ok:true,
    ...verified,
    authorization_verification_id:
      "voiddccstav1_"+sha256(canonicalJson(verified)),
    sovereign_private_key_access_performed:false,
    signer_object_exposed:false,
    signer_access_performed:false,
    wallet_access_performed:false,
    transaction_signing_performed:false,
    transaction_broadcast_performed:false,
    chain2050_write_performed:false,
    authority_contract:
      VOID_DATANET_CONTENT_COMMITMENT_SOVEREIGN_SINGLE_TRANSACTION_AUTHORIZATION_AUTHORITY_V1,
  };
}

export function verifyDatanetContentCommitmentSovereignSingleTransactionAuthorizationV1(
  input,
){
  return verifyDatanetContentCommitmentSovereignSingleTransactionAuthorizationAgainstFingerprintV1(
    input,
    VOID_DATANET_PHASE0_SOVEREIGN_PRIMARY_DER_SHA256_V1,
  );
}
