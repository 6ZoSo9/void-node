import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  buildDatanetContentCommitmentSovereignSingleTransactionAuthorizationRequestAgainstFingerprintV1,
  verifyDatanetContentCommitmentSovereignSingleTransactionAuthorizationAgainstFingerprintV1,
  verifyDatanetContentCommitmentSovereignSingleTransactionAuthorizationV1,
  VOID_DATANET_CONTENT_COMMITMENT_SOVEREIGN_SINGLE_TRANSACTION_AUTHORIZATION_AUTHORITY_V1,
  VOID_DATANET_CONTENT_COMMITMENT_SOVEREIGN_SINGLE_TRANSACTION_AUTHORIZATION_ENVELOPE_V1,
} from "../tools/datanet-content-commitment-sovereign-single-transaction-authorization-v1.mjs";
import {
  canonicalJson,
  sha256,
} from "../tools/datanet-content-commitment-compiler-profile-v1.mjs";

const {publicKey,privateKey}=crypto.generateKeyPairSync("ed25519");
const publicKeyPem=publicKey.export({type:"spki",format:"pem"}).toString();
const publicKeyDer=publicKey.export({type:"spki",format:"der"});
const testFingerprint=crypto.createHash("sha256").update(publicKeyDer).digest("hex");

const PUBLISHER="0x1111111111111111111111111111111111111111";
const REGISTRY="0x2222222222222222222222222222222222222222";
const candidate={
  transaction_type:2,
  chain_id:"2050",
  nonce:"9",
  from_address:PUBLISHER,
  to_address:REGISTRY,
  value_wei:"0",
  calldata:"0x1234",
  gas_limit:"60000",
  max_fee_per_gas_wei:"2000000000",
  max_priority_fee_per_gas_wei:"1000000000",
};
const candidateFingerprint=sha256(canonicalJson(candidate));

function finalReview(overrides={}){
  return {
    ok:true,
    marker:"VOID_DATANET_CONTENT_COMMITMENT_FINAL_SIGNING_REVIEW_PREFLIGHT_V1",
    version:1,
    status:
      "fresh_candidate_and_publisher_identity_ready_for_separate_signing_authorization_review",
    chain_id:"2050",
    prior_credential_binding_id:"voiddccpcb1_"+"0".repeat(64),
    fresh_pre_sign_revalidation_id:"voiddccpsr1_"+"1".repeat(64),
    fresh_credential_binding_id:"voiddccpcb1_"+"2".repeat(64),
    publisher_address:PUBLISHER,
    unsigned_transaction_candidate:candidate,
    unsigned_transaction_candidate_fingerprint_sha256:candidateFingerprint,
    revalidation:{
      full_pre_sign_revalidation_rerun:true,
      repaired_freshness_wall_reapplied:true,
      pending_nonce_rechecked_after_final_preflight:true,
      credential_identity_binding_rerun_after_fresh_pre_sign:true,
      prior_binding_used_as_lineage_only:true,
      stale_pre_sign_result_authorizes_signing:false,
    },
    authority:{
      review_artifact_only:true,
      separate_explicit_signing_authorization_required:true,
      signer_object_exposed:false,
      signer_access_authorized:false,
      wallet_access_authorized:false,
      transaction_signing_authorized:false,
      transaction_signing_performed:false,
      transaction_broadcast_authorized:false,
      transaction_broadcast_performed:false,
      chain2050_write_authorized:false,
      chain2050_write_performed:false,
      automatic_retry_authorized:false,
    },
    next_gate:
      "explicit_sovereign_single_transaction_signing_authorization_v1",
    final_signing_review_preflight_id:"voiddccfsrp1_"+"3".repeat(64),
    signer_object_exposed:false,
    signing_authorized:false,
    signing_performed:false,
    transaction_broadcast_authorized:false,
    transaction_broadcast_performed:false,
    chain2050_write_authorized:false,
    chain2050_write_performed:false,
    ...overrides,
  };
}

function buildRequest(review=finalReview(),expires="2026-09-22T15:10:00Z"){
  return buildDatanetContentCommitmentSovereignSingleTransactionAuthorizationRequestAgainstFingerprintV1(
    {
      final_signing_review:review,
      issued_at_utc:"2026-09-22T15:00:00Z",
      expires_at_utc:expires,
    },
    testFingerprint,
  );
}
function envelopeFor(request,signer=privateKey,pem=publicKeyPem){
  assert.equal(request.ok,true);
  const signature=crypto.sign(
    null,
    Buffer.from(request.signing_bytes_base64,"base64"),
    signer,
  ).toString("base64");
  const body={
    marker:
      VOID_DATANET_CONTENT_COMMITMENT_SOVEREIGN_SINGLE_TRANSACTION_AUTHORIZATION_ENVELOPE_V1,
    version:1,
    authorization_body:request.authorization_body,
    public_key_pem:pem,
    signature_base64:signature,
  };
  return {
    ...body,
    authorization_id:"voiddccsta1_"+sha256(canonicalJson(body)),
  };
}

{
  const request=buildRequest();
  assert.equal(request.ok,true);
  if(request.ok===false)throw new Error(request.reason);
  assert.equal(request.status,"sovereign_signature_required");
  assert.equal(
    request.authorization_body.final_signing_review_preflight_id,
    finalReview().final_signing_review_preflight_id,
  );
  assert.equal(
    request.authorization_body.unsigned_transaction_candidate_fingerprint_sha256,
    candidateFingerprint,
  );
  assert.equal(request.authorization_body.authorization_scope.single_use,true);
  assert.equal(
    request.authorization_body.authorization_scope.transaction_signing,
    true,
  );
  assert.equal(
    request.authorization_body.authorization_scope.transaction_broadcast,
    false,
  );
  assert.equal(request.sovereign_private_key_access_performed,false);
  assert.equal(request.signing_performed,false);

  const envelope=envelopeFor(request);
  const verified=
    verifyDatanetContentCommitmentSovereignSingleTransactionAuthorizationAgainstFingerprintV1(
      {
        final_signing_review:finalReview(),
        authorization_envelope:envelope,
      },
      testFingerprint,
    );
  assert.equal(verified.ok,true);
  if(verified.ok===false)throw new Error(verified.reason);
  assert.equal(
    verified.status,
    "exact_single_transaction_sovereign_authorization_verified_unconsumed",
  );
  assert.match(verified.authorization_id,/^voiddccsta1_[0-9a-f]{64}$/);
  assert.match(
    verified.authorization_verification_id,
    /^voiddccstav1_[0-9a-f]{64}$/,
  );
  assert.equal(
    verified.unsigned_transaction_candidate_fingerprint_sha256,
    candidateFingerprint,
  );
  assert.equal(verified.authorization.sovereign_signature_verified,true);
  assert.equal(
    verified.authorization.exact_single_transaction_signing_approved,
    true,
  );
  assert.equal(verified.authorization.single_use,true);
  assert.equal(verified.authorization.authorization_consumed,false);
  assert.equal(verified.authorization.consumption_record_present,false);
  assert.equal(
    verified.authorization.replay_prevention_enforced_by_this_verifier,
    false,
  );
  assert.equal(
    verified.authority.exact_transaction_signing_permitted_by_sovereign,
    true,
  );
  assert.equal(verified.authority.signer_access_performed,false);
  assert.equal(verified.authority.transaction_signing_performed,false);
  assert.equal(verified.authority.transaction_broadcast_authorized,false);
  assert.equal(verified.transaction_signing_performed,false);
  assert.equal(verified.transaction_broadcast_performed,false);
  assert.equal(verified.chain2050_write_performed,false);
}

{
  const request=buildRequest(finalReview(),"2026-09-22T15:10:01Z");
  assert.equal(request.ok,false);
  assert.equal(request.reason,"sovereign_authorization_window_invalid");
}

{
  const request=buildRequest();
  const envelope=envelopeFor(request);
  const forgedReview=finalReview({
    unsigned_transaction_candidate:{
      ...candidate,
      nonce:"10",
    },
  });
  const result=
    verifyDatanetContentCommitmentSovereignSingleTransactionAuthorizationAgainstFingerprintV1(
      {
        final_signing_review:forgedReview,
        authorization_envelope:envelope,
      },
      testFingerprint,
    );
  assert.equal(result.ok,false);
  assert.match(result.reason,/sovereign_authorization_request_rebuild_held:/);
}

{
  const request=buildRequest();
  const envelope=envelopeFor(request);
  envelope.authorization_body={
    ...envelope.authorization_body,
    decision:"HOLD",
  };
  const result=
    verifyDatanetContentCommitmentSovereignSingleTransactionAuthorizationAgainstFingerprintV1(
      {
        final_signing_review:finalReview(),
        authorization_envelope:envelope,
      },
      testFingerprint,
    );
  assert.equal(result.ok,false);
  assert.equal(result.reason,"sovereign_authorization_body_mismatch");
}

{
  const request=buildRequest();
  const envelope=envelopeFor(request);
  envelope.signature_base64="A".repeat(86)+"==";
  const result=
    verifyDatanetContentCommitmentSovereignSingleTransactionAuthorizationAgainstFingerprintV1(
      {
        final_signing_review:finalReview(),
        authorization_envelope:envelope,
      },
      testFingerprint,
    );
  assert.equal(result.ok,false);
  assert.match(
    result.reason,
    /sovereign_authorization_signature_(?:invalid|encoding_invalid)/,
  );
}

{
  const request=buildRequest();
  const envelope=envelopeFor(request);
  const result=
    verifyDatanetContentCommitmentSovereignSingleTransactionAuthorizationV1({
      final_signing_review:finalReview(),
      authorization_envelope:envelope,
    });
  assert.equal(result.ok,false);
  assert.equal(
    result.reason,
    "sovereign_authorization_public_key_fingerprint_mismatch",
  );
}

for(const [key,expected] of Object.entries({
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
  automatic_retry:false,
})){
  assert.equal(
    VOID_DATANET_CONTENT_COMMITMENT_SOVEREIGN_SINGLE_TRANSACTION_AUTHORIZATION_AUTHORITY_V1[key],
    expected,
    key,
  );
}

const source=fs.readFileSync(
  path.join(
    process.cwd(),
    "tools/datanet-content-commitment-sovereign-single-transaction-authorization-v1.mjs",
  ),
  "utf8",
);
for(const forbidden of [
  "crypto.sign(",
  "createPrivateKey",
  "privateKey",
  "Wallet(",
  ".signTransaction(",
  ".signMessage(",
  "eth_sendRawTransaction",
  "eth_sendTransaction",
  "broadcastTransaction(",
  "sendTransaction(",
]){
  assert.equal(source.includes(forbidden),false,"source contains "+forbidden);
}

console.log(
  "VOID_DATANET_CONTENT_COMMITMENT_SOVEREIGN_SINGLE_TRANSACTION_AUTHORIZATION_V1_PROOF_GREEN",
);
console.log("production_sovereign_fingerprint_pinned=true");
console.log("exact_final_review_preflight_bound=true");
console.log("exact_unsigned_transaction_fingerprint_bound=true");
console.log("exact_transaction_summary_bound=true");
console.log("authorization_window_max_seconds=600");
console.log("sovereign_ed25519_signature_verified=true");
console.log("single_use_required=true");
console.log("durable_consumption_before_signing_required=true");
console.log("runtime_expiry_recheck_before_signing_required=true");
console.log("replay_prevention_enforced_by_this_verifier=false");
console.log("production_test_key_rejected=true");
console.log("sovereign_private_key_access=false");
console.log("signer_object_exposed=false");
console.log("signer_access=false");
console.log("transaction_signing_performed=false");
console.log("transaction_broadcast_authorized=false");
console.log("transaction_broadcast=false");
console.log("chain2050_write=false");
