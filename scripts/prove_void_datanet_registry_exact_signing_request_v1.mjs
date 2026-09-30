#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";

import {
  buildVoidDatanetRegistryDeployerCredentialBindingV1,
} from "../tools/void-datanet-registry-deployer-credential-binding-v1.mjs";
import {
  runVoidDatanetRegistryCandidateFreshRevalidationV1,
} from "../tools/void-datanet-registry-candidate-fresh-revalidation-v1.mjs";
import {
  buildVoidDatanetRegistryFinalSigningReviewV1,
} from "../tools/void-datanet-registry-final-signing-review-v1.mjs";
import {
  VOID_DATANET_REGISTRY_SIGNING_AUTHORIZATION_CONFIRMATION_V1,
  buildVoidDatanetRegistryExactSigningRequestV1,
  validateVoidDatanetRegistryExactSigningRequestV1,
} from "../tools/void-datanet-registry-exact-signing-request-v1.mjs";
import {
  buildVoidDatanetRegistryUnsignedCandidateFixtureV1,
} from "./fixtures/void-datanet-registry-unsigned-candidate-fixture-v1.mjs";

function sha256(value){
  return crypto.createHash("sha256").update(value).digest("hex");
}
function canonical(value){
  if(value===null||typeof value==="string"||typeof value==="boolean") return value;
  if(typeof value==="number"&&Number.isFinite(value)) return value;
  if(Array.isArray(value)) return value.map(canonical);
  return Object.fromEntries(
    Object.keys(value).sort().map((key)=>[key,canonical(value[key])]),
  );
}
function rehashRequest(value){
  const x=structuredClone(value);
  delete x.signing_request_id;
  return "voiddrsr1_"+sha256(Buffer.from(JSON.stringify(canonical(x))));
}
function credentialObservation(fixture){
  return {
    ok:true,
    marker:"VOID_DATANET_REGISTRY_DEPLOYER_CREDENTIAL_FILE_OBSERVATION_V1",
    version:1,
    status:"credential_identity_observed_without_signer_object",
    credential_id:"datanet-content-commitment-registry-deployer-wallet-v1",
    derived_address:fixture.deployerSelection.deployer_address,
    credential_source:{
      canonical_directory:true,
      directory_private_mode:true,
      regular_file:true,
      symbolic_link:false,
      single_hard_link:true,
      owner_current_user:true,
      mode:"600",
      size_bytes:67,
    },
    credential_content_access_performed:true,
    private_key_access_performed:true,
    raw_private_key_output:false,
    private_key_digest_output:false,
    signer_object_exposed:false,
    transaction_signing_performed:false,
  };
}
function buildBinding(fixture,boundAt,repoHead){
  return buildVoidDatanetRegistryDeployerCredentialBindingV1({
    deployer_selection:fixture.deployerSelection,
    unsigned_transaction_candidate:fixture.candidate,
    candidate_evidence:fixture.candidateEvidence,
    credential_observation:credentialObservation(fixture),
    bound_at_utc:boundAt,
    bound_on_host:"Nimo",
    observed_repo_head:repoHead,
  });
}
function feeReplies({
  head=5n,
  hashDigit="8",
  balance="0xde0b6b3a7640000",
  estimate="0x100000",
}={}){
  const headHex="0x"+BigInt(head).toString(16);
  const hash="0x"+String(hashDigit).repeat(64);
  return [
    "0x802",
    headHex,
    {number:headHex,hash,baseFeePerGas:"0x0"},
    "0x0",
    balance,
    "0x0",
    "0x",
    estimate,
    "0x0",
    "0x0",
    {number:headHex,hash,baseFeePerGas:"0x0"},
  ];
}

const fixture=await buildVoidDatanetRegistryUnsignedCandidateFixtureV1();
const priorBinding=buildBinding(
  fixture,
  "2030-01-01T00:07:15.000Z",
  "a".repeat(40),
);

const replies=feeReplies();
let at=0;
const revalidation=
  await runVoidDatanetRegistryCandidateFreshRevalidationV1({
    unsigned_transaction_candidate:fixture.candidate,
    candidate_evidence:fixture.candidateEvidence,
    prior_credential_binding:priorBinding,
    deployer_selection:fixture.deployerSelection,
    activation_plan:fixture.activationPlan,
    activation_receipt:fixture.activationReceipt,
    resolution_packet:fixture.resolutionPacket,
    deployer_address:fixture.deployerSelection.deployer_address,
    publisher_address:fixture.publisherSelection.publisher_address,
    predecessor_address:fixture.predecessor,
    compiled_identity:fixture.compiledIdentity,
    observed_at_utc:"2030-01-01T00:07:20.000Z",
    transport:async()=>replies[at++],
  });
assert.equal(at,11);
assert.equal(revalidation.ok,true);

const freshBinding=buildBinding(
  fixture,
  "2030-01-01T00:07:30.000Z",
  "b".repeat(40),
);
assert.notEqual(
  freshBinding.credential_binding_id,
  priorBinding.credential_binding_id,
);

const reviewEvidence={
  unsigned_transaction_candidate:fixture.candidate,
  candidate_evidence:fixture.candidateEvidence,
  prior_credential_binding:priorBinding,
  candidate_revalidation_receipt:revalidation.receipt,
  fresh_fee_funding_packet:revalidation.fresh_fee_funding_packet,
  fresh_credential_binding:freshBinding,
  deployer_selection:fixture.deployerSelection,
};
const review=buildVoidDatanetRegistryFinalSigningReviewV1({
  ...reviewEvidence,
  evaluated_at_utc:"2030-01-01T00:07:40.000Z",
});

const request=buildVoidDatanetRegistryExactSigningRequestV1({
  ...reviewEvidence,
  final_signing_review:review,
  requested_at_utc:review.evaluated_at_utc,
});
assert.equal(
  request.status,
  "HOLD_PENDING_EXACT_SINGLE_TRANSACTION_SIGNING_AUTHORIZATION",
);
assert.match(request.signing_request_id,/^voiddrsr1_[0-9a-f]{64}$/u);
assert.equal(request.candidate_id,fixture.candidate.candidate_id);
assert.equal(request.final_signing_review_id,review.final_signing_review_id);
assert.equal(
  request.transaction_summary.unsigned_transaction_hash,
  fixture.candidate.transaction.unsigned_transaction_hash,
);
assert.equal(
  request.transaction_fingerprint_sha256,
  fixture.candidate.transaction_fingerprint_sha256,
);
assert.equal(
  request.transaction_summary.from_address,
  fixture.candidate.transaction.from_address,
);
assert.equal(request.transaction_summary.chain_id,"2050");
assert.equal(request.transaction_summary.transaction_type,2);
assert.equal(
  request.transaction_summary.nonce,
  fixture.candidate.transaction.nonce,
);
assert.equal(
  request.transaction_summary.predicted_contract_address,
  fixture.candidate.transaction.predicted_contract_address,
);
assert.equal(
  request.transaction_summary.data_sha256,
  fixture.candidate.transaction.data_sha256,
);
assert.equal(
  request.transaction_summary.data_keccak256,
  fixture.candidate.transaction.data_keccak256,
);
assert.equal(request.verification.final_signing_review_exact,true);
assert.equal(request.verification.final_signing_review_unexpired,true);
assert.equal(
  request.verification.separate_operation_bound_signing_authorization_required,
  true,
);
assert.equal(request.verification.broadcast_remains_separate,true);
assert.equal(request.authority.source_request_only,true);
for(const [key,value] of Object.entries(request.authority)){
  if(key==="source_request_only") assert.equal(value,true,key);
  else assert.equal(value,false,key);
}
assert.equal(request.signing_authorized,false);
assert.equal(
  request.required_confirmation,
  VOID_DATANET_REGISTRY_SIGNING_AUTHORIZATION_CONFIRMATION_V1,
);
assert.equal(
  request.required_confirmation,
  "authorizeDatanetRegistryDeploymentSigningV1",
);
assert.equal(
  validateVoidDatanetRegistryExactSigningRequestV1(
    request,
    {
      ...reviewEvidence,
      final_signing_review:review,
    },
  ),
  request,
);

{
  const expiredAt=
    new Date(Date.parse(review.valid_until_utc)+1_000).toISOString();
  assert.throws(
    ()=>buildVoidDatanetRegistryExactSigningRequestV1({
      ...reviewEvidence,
      final_signing_review:review,
      requested_at_utc:expiredAt,
    }),
    /registry_signing_request_time_invalid/u,
  );
}
{
  const badReview=structuredClone(review);
  badReview.signing_authorized=true;
  const material=structuredClone(badReview);
  delete material.final_signing_review_id;
  badReview.final_signing_review_id=
    "voiddrfsr1_"+sha256(Buffer.from(JSON.stringify(canonical(material))));
  assert.throws(
    ()=>buildVoidDatanetRegistryExactSigningRequestV1({
      ...reviewEvidence,
      final_signing_review:badReview,
      requested_at_utc:review.evaluated_at_utc,
    }),
    /final_signing_review_authority_mismatch|final_signing_review_evidence_rebuild/u,
  );
}
{
  const bad=structuredClone(request);
  bad.authority.transaction_signing=true;
  bad.signing_request_id=rehashRequest(bad);
  assert.throws(
    ()=>validateVoidDatanetRegistryExactSigningRequestV1(
      bad,
      {
        ...reviewEvidence,
        final_signing_review:review,
      },
    ),
    /registry_signing_request_authority_mismatch:transaction_signing/u,
  );
}
{
  const bad=structuredClone(request);
  bad.transaction_summary.nonce="1";
  bad.signing_request_id=rehashRequest(bad);
  assert.throws(
    ()=>validateVoidDatanetRegistryExactSigningRequestV1(
      bad,
      {
        ...reviewEvidence,
        final_signing_review:review,
      },
    ),
    /registry_signing_request_evidence_rebuild_mismatch/u,
  );
}
{
  const bad=structuredClone(request);
  bad.transaction_summary.unsigned_serialized_transaction_sha256=
    "0".repeat(64);
  bad.signing_request_id=rehashRequest(bad);
  assert.throws(
    ()=>validateVoidDatanetRegistryExactSigningRequestV1(
      bad,
      {
        ...reviewEvidence,
        final_signing_review:review,
      },
    ),
    /registry_signing_request_evidence_rebuild_mismatch/u,
  );
}
{
  const bad=structuredClone(request);
  bad.required_confirmation="anythingElse";
  bad.signing_request_id=rehashRequest(bad);
  assert.throws(
    ()=>validateVoidDatanetRegistryExactSigningRequestV1(
      bad,
      {
        ...reviewEvidence,
        final_signing_review:review,
      },
    ),
    /registry_signing_request_contract_invalid/u,
  );
}

const runner=fs.readFileSync(
  "ops/precision/void-datanet-registry-exact-signing-request-v1.mjs",
  "utf8",
);
for(const required of [
  "CANDIDATE_JSON",
  "FINAL_SIGNING_REVIEW_JSON",
  "source_request_only=true",
  "rpc_call=false",
  "credential_access=false",
  "private_key_access=false",
  "wallet_access=false",
  "signer_object_exposed=false",
  "signing_authorized=false",
  "transaction_signing=false",
  "signed_transaction_export=false",
  "transaction_submission=false",
  "transaction_broadcast=false",
  "deployment=false",
  "chain2050_mutation=false",
  "funds_movement=false",
  "required_confirmation=",
]){
  assert.ok(runner.includes(required),required);
}
for(const forbidden of [
  "SigningKey",
  "Wallet(",
  "privateKey",
  "eth_sendRawTransaction",
  "eth_sendTransaction",
  "systemctl",
  "docker ",
  "ssh ",
  "sudo ",
]){
  assert.equal(runner.includes(forbidden),false,forbidden);
}

console.log("VOID_DATANET_REGISTRY_EXACT_SIGNING_REQUEST_V1_PROOF_GREEN");
console.log("candidate_exact=true");
console.log("final_signing_review_exact=true");
console.log("exact_unsigned_transaction_hash_bound=true");
console.log("exact_transaction_fingerprint_bound=true");
console.log("exact_deployer_bound=true");
console.log("fresh_candidate_revalidation_bound=true");
console.log("fresh_deployer_credential_binding_bound=true");
console.log("source_request_only=true");
console.log("required_confirmation=authorizeDatanetRegistryDeploymentSigningV1");
console.log("rpc_call=false");
console.log("credential_access=false");
console.log("private_key_access=false");
console.log("wallet_access=false");
console.log("signer_object_exposed=false");
console.log("signing_authorized=false");
console.log("transaction_signing=false");
console.log("signed_transaction_export=false");
console.log("transaction_submission=false");
console.log("transaction_broadcast=false");
console.log("deployment=false");
console.log("chain2050_mutation=false");
console.log("funds_movement=false");
