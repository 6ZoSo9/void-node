#!/usr/bin/env node
import crypto from "node:crypto";

import {
  VOID_SOVEREIGN_PRIMARY_GOVERNANCE_DER_SHA256_V1,
  VOID_SOVEREIGN_PRIMARY_GOVERNANCE_ROLE_V1,
  verifyVoidEd25519SignatureAgainstFingerprintV1,
} from "../dist/security/void_sovereign_emergency_control_v1.js";
import {
  VOID_BUY_VOID_LEGACY_HISTORY_DISPOSITION_AUTHORITY_V1,
  VOID_BUY_VOID_LEGACY_HISTORY_DISPOSITION_CANDIDATE_V1,
  VOID_BUY_VOID_LEGACY_HISTORY_DISPOSITION_DECISIONS_V1,
} from "./void-buy-legacy-request-history-disposition-v1.mjs";

export const VOID_BUY_VOID_LEGACY_HISTORY_SOVEREIGN_AUTHORIZATION_REQUEST_V1 =
  "VOID_BUY_VOID_LEGACY_HISTORY_SOVEREIGN_AUTHORIZATION_REQUEST_V1";
export const VOID_BUY_VOID_LEGACY_HISTORY_SOVEREIGN_AUTHORIZATION_V1 =
  "VOID_BUY_VOID_LEGACY_HISTORY_SOVEREIGN_AUTHORIZATION_V1";
export const VOID_BUY_VOID_LEGACY_HISTORY_SOVEREIGN_AUTHORIZATION_DOMAIN_V1 =
  "void.buy.void.legacy-history.sovereign-authorization.v1";

export const VOID_BUY_VOID_LEGACY_HISTORY_SOVEREIGN_AUTHORIZATION_AUTHORITY_V1 =
  Object.freeze({
    source_only_authorization_verifier: true,
    exact_disposition_candidate_required: true,
    disposition_candidate_id_rederived: true,
    canonical_candidate_sha256_bound: true,
    sovereign_primary_governance_key_required: true,
    sovereign_ed25519_signature_required: true,
    external_witness_required_after_signature: true,
    sovereign_signature_verified_by_source: true,
    external_witness_verified: false,
    historical_request_history_disposition_accepted: false,
    migration_authorized: false,
    stable_root_apply_authorized: false,
    service_mutation: false,
    filesystem_write: false,
    request_or_payment_contents_read: false,
    private_key_access: false,
    payment_acceptance: false,
    public_presale_activation: false,
    funds_movement: false,
  });

const D=VOID_BUY_VOID_LEGACY_HISTORY_DISPOSITION_DECISIONS_V1;
const HEX64=/^[0-9a-f]{64}$/u;
const SHA256_ID=/^sha256:[0-9a-f]{64}$/u;
const CANDIDATE_ID=/^voidblrhdc1_[0-9a-f]{64}$/u;
const REQUEST_ID=/^voidblrhsr1_[0-9a-f]{64}$/u;
const AUTH_ID=/^voidblrhsa1_[0-9a-f]{64}$/u;
const SAFE_OPERATOR=/^[A-Za-z0-9_.:@/-]{1,128}$/u;
const UTC=/^20[0-9]{2}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\.[0-9]{3})?Z$/u;

const CANDIDATE_BODY_KEYS=Object.freeze([
  "schema","marker","version",
  "metadata_census_sha256","metadata_census_source_head",
  "metadata_census_source_blob_sha1","metadata_census_marker",
  "metadata_census_version","designated_hostname_matches",
  "designated_runtime_user_matches","designated_machine_id_matches",
  "bounded_current_candidate_set_observed","process_environment_access",
  "external_network_calls","loopback_get_only","candidate_count",
  "surviving_history_metadata_root_count","unverified_root_count",
  "empty_shape_external_anchor_required_count","absent_root_count",
  "technical_candidate_set_completeness_proven",
  "technical_historical_origin_proven","filesystem_rollback_prevention_proven",
  "decision","operator_id","reviewed_at_utc",
  "human_accounting_disposition_declared",
  "sovereign_signature_required","external_witness_required",
  "sovereign_signature_verified","external_witness_verified",
  "historical_request_history_disposition_accepted","migration_authorized",
  "stable_root_apply_authorized","payment_acceptance",
  "public_presale_activation","funds_movement",
]);
const CANDIDATE_KEYS=Object.freeze([
  "ok","status",...CANDIDATE_BODY_KEYS,"candidate_id","authority",
]);
const REQUEST_BODY_KEYS=Object.freeze([
  "marker","version","domain","chain_id",
  "candidate_id","candidate_canonical_sha256",
  "decision","operator_id","candidate_reviewed_at_utc",
  "authorization_issued_at_utc","signer_role",
  "signer_public_key_der_sha256","signature_algorithm",
]);
const REQUEST_KEYS=Object.freeze([...REQUEST_BODY_KEYS,"request_id"]);
const AUTH_KEYS=Object.freeze([
  ...REQUEST_BODY_KEYS,"request_id","signature_base64","authorization_id",
]);

function fail(code){throw new Error(code);}
function exactObject(value,keys,code){
  if(!value||typeof value!=="object"||Array.isArray(value))fail(code);
  const got=Object.keys(value).sort(),want=[...keys].sort();
  if(got.length!==want.length||got.some((x,i)=>x!==want[i]))fail(code);
  return value;
}
function canonical(value){
  if(value===null)return "null";
  if(typeof value==="string")return JSON.stringify(value).replace(/[\u007f-\uffff]/g,
    ch=>"\\u"+ch.charCodeAt(0).toString(16).padStart(4,"0"));
  if(typeof value==="boolean")return value?"true":"false";
  if(typeof value==="number"&&Number.isSafeInteger(value))return String(value);
  if(Array.isArray(value))return "["+value.map(canonical).join(",")+"]";
  if(value&&typeof value==="object"&&!Array.isArray(value)){
    return "{"+Object.keys(value).sort()
      .map(key=>canonical(key)+":"+canonical(value[key])).join(",")+"}";
  }
  fail("legacy_history_sovereign_authorization_noncanonical_value");
}
function sha256(value){
  return crypto.createHash("sha256").update(value).digest("hex");
}
function safeCount(value,code){
  if(!Number.isSafeInteger(value)||value<0||value>1000000)fail(code);
  return value;
}
function exactUtc(value,code){
  if(typeof value!=="string"||!UTC.test(value)||!Number.isFinite(Date.parse(value)))fail(code);
  return value;
}
function candidateBody(candidate){
  return Object.freeze(Object.fromEntries(
    CANDIDATE_BODY_KEYS.map(key=>[key,candidate[key]])
  ));
}
function validateCandidate(raw){
  const c=exactObject(raw,CANDIDATE_KEYS,
    "legacy_history_sovereign_authorization_candidate_shape_invalid");
  if(
    c.ok!==true||
    c.schema!=="void_buy_void_legacy_history_disposition_candidate_v1"||
    c.marker!==VOID_BUY_VOID_LEGACY_HISTORY_DISPOSITION_CANDIDATE_V1||
    c.version!==1||
    !SHA256_ID.test(String(c.metadata_census_sha256||""))||
    c.metadata_census_source_head!=="c4a0046dbadc7eb681e78c49090c9a17373f8682"||
    c.metadata_census_source_blob_sha1!=="f8bfda9ff88a5278c950b1c23f5e1675e5362048"||
    c.metadata_census_marker!=="VOID_BUY_VOID_LEGACY_REQUEST_ROOT_CENSUS_V1"||
    c.metadata_census_version!==1||
    c.designated_hostname_matches!==true||
    c.designated_runtime_user_matches!==true||
    c.designated_machine_id_matches!==true||
    c.process_environment_access!==false||
    c.external_network_calls!==false||
    c.loopback_get_only!==true||
    c.technical_candidate_set_completeness_proven!==false||
    c.technical_historical_origin_proven!==false||
    c.filesystem_rollback_prevention_proven!==false||
    !Object.values(D).includes(c.decision)||
    !SAFE_OPERATOR.test(String(c.operator_id||""))||
    c.human_accounting_disposition_declared!==
      (c.decision!==D.UNRESOLVED_HOLD)||
    c.sovereign_signature_required!==true||
    c.external_witness_required!==true||
    c.sovereign_signature_verified!==false||
    c.external_witness_verified!==false||
    c.historical_request_history_disposition_accepted!==false||
    c.migration_authorized!==false||
    c.stable_root_apply_authorized!==false||
    c.payment_acceptance!==false||
    c.public_presale_activation!==false||
    c.funds_movement!==false
  )fail("legacy_history_sovereign_authorization_candidate_invalid");
  for(const key of [
    "candidate_count","surviving_history_metadata_root_count",
    "unverified_root_count","empty_shape_external_anchor_required_count",
    "absent_root_count",
  ])safeCount(c[key],"legacy_history_sovereign_authorization_candidate_count_invalid");
  exactUtc(c.reviewed_at_utc,
    "legacy_history_sovereign_authorization_candidate_review_time_invalid");
  const expectedStatus=c.decision===D.UNRESOLVED_HOLD
    ?"UNRESOLVED_HOLD_CANDIDATE"
    :"DISPOSITION_CANDIDATE_REQUIRES_SOVEREIGN_SIGNATURE_AND_EXTERNAL_WITNESS";
  if(c.status!==expectedStatus)fail("legacy_history_sovereign_authorization_candidate_status_invalid");
  if(c.decision===D.NO_PREANCHOR_CUSTOMER_LIABILITY_DECLARED&&(
      c.bounded_current_candidate_set_observed!==true||
      c.surviving_history_metadata_root_count!==0||
      c.unverified_root_count!==0
  ))fail("legacy_history_sovereign_authorization_no_liability_candidate_invalid");
  if(c.decision===D.SURVIVING_HISTORY_REQUIRES_MIGRATION&&
     c.surviving_history_metadata_root_count<1){
    fail("legacy_history_sovereign_authorization_migration_candidate_invalid");
  }
  if(canonical(c.authority)!==canonical(VOID_BUY_VOID_LEGACY_HISTORY_DISPOSITION_AUTHORITY_V1)){
    fail("legacy_history_sovereign_authorization_candidate_authority_invalid");
  }
  const body=candidateBody(c);
  const expectedId="voidblrhdc1_"+sha256(Buffer.from(canonical(body),"utf8"));
  if(!CANDIDATE_ID.test(String(c.candidate_id||""))||c.candidate_id!==expectedId){
    fail("legacy_history_sovereign_authorization_candidate_id_invalid");
  }
  return Object.freeze({...c});
}
function requestBody(candidate,issuedAtUtc,expectedFingerprint){
  const c=validateCandidate(candidate);
  exactUtc(issuedAtUtc,"legacy_history_sovereign_authorization_issue_time_invalid");
  if(!HEX64.test(expectedFingerprint)){
    fail("legacy_history_sovereign_authorization_signer_fingerprint_invalid");
  }
  if(Date.parse(issuedAtUtc)<Date.parse(c.reviewed_at_utc)){
    fail("legacy_history_sovereign_authorization_predates_candidate_review");
  }
  return Object.freeze({
    marker:VOID_BUY_VOID_LEGACY_HISTORY_SOVEREIGN_AUTHORIZATION_REQUEST_V1,
    version:1,
    domain:VOID_BUY_VOID_LEGACY_HISTORY_SOVEREIGN_AUTHORIZATION_DOMAIN_V1,
    chain_id:2050,
    candidate_id:c.candidate_id,
    candidate_canonical_sha256:sha256(Buffer.from(canonical(c),"utf8")),
    decision:c.decision,
    operator_id:c.operator_id,
    candidate_reviewed_at_utc:c.reviewed_at_utc,
    authorization_issued_at_utc:issuedAtUtc,
    signer_role:VOID_SOVEREIGN_PRIMARY_GOVERNANCE_ROLE_V1,
    signer_public_key_der_sha256:expectedFingerprint,
    signature_algorithm:"Ed25519",
  });
}
function buildRequestAgainstFingerprint(candidate,issuedAtUtc,expectedFingerprint){
  const body=requestBody(candidate,issuedAtUtc,expectedFingerprint);
  return Object.freeze({
    ...body,
    request_id:"voidblrhsr1_"+sha256(Buffer.from(canonical(body),"utf8")),
  });
}
export function buildVoidBuyVoidLegacyHistorySovereignAuthorizationRequestV1(
  candidate,
  authorizationIssuedAtUtc,
){
  return buildRequestAgainstFingerprint(
    candidate,
    authorizationIssuedAtUtc,
    VOID_SOVEREIGN_PRIMARY_GOVERNANCE_DER_SHA256_V1,
  );
}
export function testOnlyBuildVoidBuyVoidLegacyHistorySovereignAuthorizationRequestAgainstFingerprintV1(
  candidate,
  authorizationIssuedAtUtc,
  expectedFingerprint,
){
  return buildRequestAgainstFingerprint(
    candidate,authorizationIssuedAtUtc,expectedFingerprint
  );
}
export function canonicalVoidBuyVoidLegacyHistorySovereignAuthorizationPayloadV1(request){
  const r=exactObject(request,REQUEST_KEYS,
    "legacy_history_sovereign_authorization_request_shape_invalid");
  const body=Object.freeze(Object.fromEntries(
    REQUEST_BODY_KEYS.map(key=>[key,r[key]])
  ));
  const expected="voidblrhsr1_"+sha256(Buffer.from(canonical(body),"utf8"));
  if(!REQUEST_ID.test(String(r.request_id||""))||r.request_id!==expected){
    fail("legacy_history_sovereign_authorization_request_id_invalid");
  }
  return Buffer.from(canonical(body),"utf8");
}
export function assembleVoidBuyVoidLegacyHistorySovereignAuthorizationV1(
  request,
  signatureBase64,
){
  canonicalVoidBuyVoidLegacyHistorySovereignAuthorizationPayloadV1(request);
  if(typeof signatureBase64!=="string"||signatureBase64.length<1){
    fail("legacy_history_sovereign_authorization_signature_missing");
  }
  const unsigned=Object.freeze({...request,signature_base64:signatureBase64});
  return Object.freeze({
    ...unsigned,
    authorization_id:"voidblrhsa1_"+
      sha256(Buffer.from(canonical(unsigned),"utf8")),
  });
}
function verifyAgainstFingerprint({candidate,authorization,public_key_pem,expected_fingerprint}){
  try{
    const c=validateCandidate(candidate);
    const a=exactObject(authorization,AUTH_KEYS,
      "legacy_history_sovereign_authorization_shape_invalid");
    const expectedRequest=buildRequestAgainstFingerprint(
      c,a.authorization_issued_at_utc,expected_fingerprint
    );
    for(const key of REQUEST_KEYS){
      if(a[key]!==expectedRequest[key]){
        fail("legacy_history_sovereign_authorization_request_binding_mismatch");
      }
    }
    if(!AUTH_ID.test(String(a.authorization_id||""))){
      fail("legacy_history_sovereign_authorization_id_invalid");
    }
    const unsigned=Object.freeze(Object.fromEntries(
      [...REQUEST_KEYS,"signature_base64"].map(key=>[key,a[key]])
    ));
    const expectedAuthId="voidblrhsa1_"+
      sha256(Buffer.from(canonical(unsigned),"utf8"));
    if(a.authorization_id!==expectedAuthId){
      fail("legacy_history_sovereign_authorization_id_invalid");
    }
    const verification=verifyVoidEd25519SignatureAgainstFingerprintV1(
      public_key_pem,
      expected_fingerprint,
      canonicalVoidBuyVoidLegacyHistorySovereignAuthorizationPayloadV1(
        expectedRequest
      ),
      a.signature_base64,
    );
    if(verification.ok!==true){
      fail("legacy_history_sovereign_authorization_signature_"+
        String(verification.code||"invalid").toLowerCase());
    }
    return Object.freeze({
      ok:true,
      status:c.decision===D.UNRESOLVED_HOLD
        ?"SOVEREIGN_HOLD_SIGNATURE_VERIFIED_EXTERNAL_WITNESS_REQUIRED"
        :"SOVEREIGN_SIGNATURE_VERIFIED_EXTERNAL_WITNESS_REQUIRED",
      marker:VOID_BUY_VOID_LEGACY_HISTORY_SOVEREIGN_AUTHORIZATION_V1,
      version:1,
      authorization_id:a.authorization_id,
      request_id:a.request_id,
      candidate_id:c.candidate_id,
      candidate_canonical_sha256:a.candidate_canonical_sha256,
      decision:c.decision,
      operator_id:c.operator_id,
      signer_role:a.signer_role,
      signer_public_key_der_sha256:verification.public_key_der_sha256,
      sovereign_signature_verified:true,
      external_witness_required:true,
      external_witness_verified:false,
      historical_request_history_disposition_accepted:false,
      migration_authorized:false,
      stable_root_apply_authorized:false,
      payment_acceptance:false,
      public_presale_activation:false,
      funds_movement:false,
      authority:VOID_BUY_VOID_LEGACY_HISTORY_SOVEREIGN_AUTHORIZATION_AUTHORITY_V1,
    });
  }catch(error){
    return Object.freeze({
      ok:false,
      status:"HOLD",
      marker:VOID_BUY_VOID_LEGACY_HISTORY_SOVEREIGN_AUTHORIZATION_V1,
      reason:error instanceof Error?error.message:String(error),
      sovereign_signature_verified:false,
      external_witness_verified:false,
      historical_request_history_disposition_accepted:false,
      stable_root_apply_authorized:false,
      payment_acceptance:false,
      public_presale_activation:false,
      funds_movement:false,
      authority:VOID_BUY_VOID_LEGACY_HISTORY_SOVEREIGN_AUTHORIZATION_AUTHORITY_V1,
    });
  }
}
export function verifyVoidBuyVoidLegacyHistorySovereignAuthorizationV1(input){
  return verifyAgainstFingerprint({
    ...input,
    expected_fingerprint:VOID_SOVEREIGN_PRIMARY_GOVERNANCE_DER_SHA256_V1,
  });
}
export function testOnlyVerifyVoidBuyVoidLegacyHistorySovereignAuthorizationAgainstFingerprintV1(input){
  return verifyAgainstFingerprint(input);
}
