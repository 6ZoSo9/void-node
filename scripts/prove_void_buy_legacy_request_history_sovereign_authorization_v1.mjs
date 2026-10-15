#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";

import {
  VOID_BUY_VOID_LEGACY_HISTORY_DISPOSITION_AUTHORITY_V1,
  VOID_BUY_VOID_LEGACY_HISTORY_DISPOSITION_CANDIDATE_V1,
  VOID_BUY_VOID_LEGACY_HISTORY_DISPOSITION_DECISIONS_V1,
} from "../tools/void-buy-legacy-request-history-disposition-v1.mjs";
import {
  VOID_BUY_VOID_LEGACY_HISTORY_SOVEREIGN_AUTHORIZATION_AUTHORITY_V1,
  assembleVoidBuyVoidLegacyHistorySovereignAuthorizationV1,
  buildVoidBuyVoidLegacyHistorySovereignAuthorizationRequestV1,
  canonicalVoidBuyVoidLegacyHistorySovereignAuthorizationPayloadV1,
  testOnlyBuildVoidBuyVoidLegacyHistorySovereignAuthorizationRequestAgainstFingerprintV1,
  testOnlyVerifyVoidBuyVoidLegacyHistorySovereignAuthorizationAgainstFingerprintV1,
} from "../tools/void-buy-legacy-request-history-sovereign-authorization-v1.mjs";
import {
  VOID_SOVEREIGN_PRIMARY_GOVERNANCE_DER_SHA256_V1,
  VOID_SOVEREIGN_PRIMARY_GOVERNANCE_ROLE_V1,
} from "../dist/security/void_sovereign_emergency_control_v1.js";

const D=VOID_BUY_VOID_LEGACY_HISTORY_DISPOSITION_DECISIONS_V1;
function canonical(value){
  if(value===null)return "null";
  if(typeof value==="string")return JSON.stringify(value).replace(/[\u007f-\uffff]/g,
    ch=>"\\u"+ch.charCodeAt(0).toString(16).padStart(4,"0"));
  if(typeof value==="boolean")return value?"true":"false";
  if(typeof value==="number"&&Number.isSafeInteger(value))return String(value);
  if(Array.isArray(value))return "["+value.map(canonical).join(",")+"]";
  if(value&&typeof value==="object"&&!Array.isArray(value)){
    return "{"+Object.keys(value).sort().map(k=>canonical(k)+":"+canonical(value[k])).join(",")+"}";
  }
  throw Error("noncanonical");
}
const sha256=value=>crypto.createHash("sha256").update(value).digest("hex");

const body={
  schema:"void_buy_void_legacy_history_disposition_candidate_v1",
  marker:VOID_BUY_VOID_LEGACY_HISTORY_DISPOSITION_CANDIDATE_V1,
  version:1,
  metadata_census_sha256:"sha256:"+"1".repeat(64),
  metadata_census_source_head:"c4a0046dbadc7eb681e78c49090c9a17373f8682",
  metadata_census_source_blob_sha1:"f8bfda9ff88a5278c950b1c23f5e1675e5362048",
  metadata_census_marker:"VOID_BUY_VOID_LEGACY_REQUEST_ROOT_CENSUS_V1",
  metadata_census_version:1,
  designated_hostname_matches:true,
  designated_runtime_user_matches:true,
  designated_machine_id_matches:true,
  bounded_current_candidate_set_observed:true,
  process_environment_access:false,
  external_network_calls:false,
  loopback_get_only:true,
  candidate_count:5,
  surviving_history_metadata_root_count:0,
  unverified_root_count:0,
  empty_shape_external_anchor_required_count:0,
  absent_root_count:4,
  technical_candidate_set_completeness_proven:false,
  technical_historical_origin_proven:false,
  filesystem_rollback_prevention_proven:false,
  decision:D.NO_PREANCHOR_CUSTOMER_LIABILITY_DECLARED,
  operator_id:"economic-owner-review",
  reviewed_at_utc:"2026-10-15T12:00:00.000Z",
  human_accounting_disposition_declared:true,
  sovereign_signature_required:true,
  external_witness_required:true,
  sovereign_signature_verified:false,
  external_witness_verified:false,
  historical_request_history_disposition_accepted:false,
  migration_authorized:false,
  stable_root_apply_authorized:false,
  payment_acceptance:false,
  public_presale_activation:false,
  funds_movement:false,
};
const candidate=Object.freeze({
  ok:true,
  status:"DISPOSITION_CANDIDATE_REQUIRES_SOVEREIGN_SIGNATURE_AND_EXTERNAL_WITNESS",
  ...body,
  candidate_id:"voidblrhdc1_"+sha256(Buffer.from(canonical(body),"utf8")),
  authority:VOID_BUY_VOID_LEGACY_HISTORY_DISPOSITION_AUTHORITY_V1,
});

const {publicKey,privateKey}=crypto.generateKeyPairSync("ed25519");
const der=publicKey.export({type:"spki",format:"der"});
const fingerprint=sha256(der);
const publicPem=publicKey.export({type:"spki",format:"pem"});

const request=
  testOnlyBuildVoidBuyVoidLegacyHistorySovereignAuthorizationRequestAgainstFingerprintV1(
    candidate,
    "2026-10-15T12:05:00.000Z",
    fingerprint,
  );
assert.match(request.request_id,/^voidblrhsr1_[0-9a-f]{64}$/u);
assert.equal(request.signer_role,VOID_SOVEREIGN_PRIMARY_GOVERNANCE_ROLE_V1);
assert.equal(request.signature_algorithm,"Ed25519");
const payload=canonicalVoidBuyVoidLegacyHistorySovereignAuthorizationPayloadV1(request);
const signature=crypto.sign(null,payload,privateKey).toString("base64");
const authorization=assembleVoidBuyVoidLegacyHistorySovereignAuthorizationV1(
  request,signature
);
assert.match(authorization.authorization_id,/^voidblrhsa1_[0-9a-f]{64}$/u);

const verified=
  testOnlyVerifyVoidBuyVoidLegacyHistorySovereignAuthorizationAgainstFingerprintV1({
    candidate,
    authorization,
    public_key_pem:publicPem,
    expected_fingerprint:fingerprint,
  });
assert.equal(verified.ok,true);
if(!verified.ok)throw Error("unexpected hold");
assert.equal(verified.sovereign_signature_verified,true);
assert.equal(verified.external_witness_verified,false);
assert.equal(verified.historical_request_history_disposition_accepted,false);
assert.equal(verified.stable_root_apply_authorized,false);
assert.equal(verified.payment_acceptance,false);
assert.equal(verified.public_presale_activation,false);
assert.equal(verified.funds_movement,false);

const badSig={...authorization,signature_base64:Buffer.alloc(64).toString("base64")};
assert.equal(
  testOnlyVerifyVoidBuyVoidLegacyHistorySovereignAuthorizationAgainstFingerprintV1({
    candidate,authorization:badSig,public_key_pem:publicPem,
    expected_fingerprint:fingerprint,
  }).ok,
  false,
);
const badCandidate={...candidate,decision:D.UNRESOLVED_HOLD};
assert.equal(
  testOnlyVerifyVoidBuyVoidLegacyHistorySovereignAuthorizationAgainstFingerprintV1({
    candidate:badCandidate,authorization,public_key_pem:publicPem,
    expected_fingerprint:fingerprint,
  }).ok,
  false,
);
assert.equal(
  testOnlyVerifyVoidBuyVoidLegacyHistorySovereignAuthorizationAgainstFingerprintV1({
    candidate,authorization,public_key_pem:publicPem,
    expected_fingerprint:"f".repeat(64),
  }).ok,
  false,
);
const tampered={...authorization,candidate_canonical_sha256:"0".repeat(64)};
assert.equal(
  testOnlyVerifyVoidBuyVoidLegacyHistorySovereignAuthorizationAgainstFingerprintV1({
    candidate,authorization:tampered,public_key_pem:publicPem,
    expected_fingerprint:fingerprint,
  }).ok,
  false,
);

const productionRequest=
  buildVoidBuyVoidLegacyHistorySovereignAuthorizationRequestV1(
    candidate,"2026-10-15T12:05:00.000Z"
  );
assert.equal(
  productionRequest.signer_public_key_der_sha256,
  VOID_SOVEREIGN_PRIMARY_GOVERNANCE_DER_SHA256_V1,
);
assert.equal(
  productionRequest.signer_role,
  VOID_SOVEREIGN_PRIMARY_GOVERNANCE_ROLE_V1,
);

for(const [key,expected] of Object.entries({
  source_only_authorization_verifier:true,
  exact_disposition_candidate_required:true,
  disposition_candidate_id_rederived:true,
  canonical_candidate_sha256_bound:true,
  sovereign_primary_governance_key_required:true,
  sovereign_ed25519_signature_required:true,
  external_witness_required_after_signature:true,
  sovereign_signature_verified_by_source:true,
  external_witness_verified:false,
  historical_request_history_disposition_accepted:false,
  migration_authorized:false,
  stable_root_apply_authorized:false,
  service_mutation:false,
  filesystem_write:false,
  request_or_payment_contents_read:false,
  private_key_access:false,
  payment_acceptance:false,
  public_presale_activation:false,
  funds_movement:false,
})){
  assert.equal(
    VOID_BUY_VOID_LEGACY_HISTORY_SOVEREIGN_AUTHORIZATION_AUTHORITY_V1[key],
    expected,key
  );
}

console.log("VOID_BUY_VOID_LEGACY_HISTORY_SOVEREIGN_AUTHORIZATION_V1_PROOF_GREEN");
console.log("candidate_id_rederived=true");
console.log("candidate_canonical_sha256_bound=true");
console.log("ed25519_signature_verified=true");
console.log("production_signer_fingerprint_pinned=true");
console.log("test_key_cannot_become_production_authority=true");
console.log("external_witness_verified=false");
console.log("historical_request_history_disposition_accepted=false");
console.log("stable_root_apply_authorized=false");
console.log("payment_acceptance=false");
console.log("public_presale_activation=false");
console.log("funds_movement=false");
