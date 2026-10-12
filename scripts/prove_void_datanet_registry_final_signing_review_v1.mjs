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
  validateVoidDatanetRegistryFinalSigningReviewEvidenceV1,
  validateVoidDatanetRegistryFinalSigningReviewV1,
} from "../tools/void-datanet-registry-final-signing-review-v1.mjs";
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
function rehashReview(value){
  const x=structuredClone(value);
  delete x.final_signing_review_id;
  return "voiddrfsr1_"+sha256(Buffer.from(JSON.stringify(canonical(x))));
}
function rehashCandidateRevalidation(value){
  const x=structuredClone(value);
  delete x.candidate_revalidation_id;
  for(const key of [
    "rpc_methods_used",
    "credential_access_performed",
    "private_key_access_performed",
    "transaction_signing_performed",
    "transaction_submission_performed",
    "transaction_broadcast_performed",
    "chain2050_mutation_performed",
    "funds_movement_performed",
  ]) delete x[key];
  return "voiddrcfr1_"+sha256(Buffer.from(JSON.stringify(canonical(x))));
}
function feeReplies({
  head=5n,
  hashDigit="8",
  balance="0x0",
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

const fixture=await buildVoidDatanetRegistryUnsignedCandidateFixtureV1();
const priorBinding=buildBinding(
  fixture,
  "2030-01-01T00:07:15.000Z",
  "a".repeat(40),
);

const replies=feeReplies();
let at=0;
const revalidationResult=
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
assert.equal(revalidationResult.ok,true);
assert.equal(
  revalidationResult.receipt.continuity.candidate_maximum_gas_cost_wei,
  "0",
);
assert.equal(
  revalidationResult.fresh_fee_funding_packet.observation.deployer_balance_wei,
  "0",
);

const freshBinding=buildBinding(
  fixture,
  "2030-01-01T00:07:30.000Z",
  "b".repeat(40),
);
assert.notEqual(
  freshBinding.credential_binding_id,
  priorBinding.credential_binding_id,
);

const evidence={
  unsigned_transaction_candidate:fixture.candidate,
  candidate_evidence:fixture.candidateEvidence,
  prior_credential_binding:priorBinding,
  candidate_revalidation_receipt:revalidationResult.receipt,
  fresh_fee_funding_packet:revalidationResult.fresh_fee_funding_packet,
  fresh_credential_binding:freshBinding,
  deployer_selection:fixture.deployerSelection,
};
const review=buildVoidDatanetRegistryFinalSigningReviewV1({
  ...evidence,
  evaluated_at_utc:"2030-01-01T00:07:40.000Z",
});
assert.equal(
  review.status,
  "FINAL_SIGNING_REVIEW_GREEN_SINGLE_TRANSACTION_AUTHORIZATION_REQUIRED",
);
assert.match(review.final_signing_review_id,/^voiddrfsr1_[0-9a-f]{64}$/u);
assert.equal(review.candidate_id,fixture.candidate.candidate_id);
assert.equal(
  review.unsigned_transaction_hash,
  fixture.candidate.transaction.unsigned_transaction_hash,
);
assert.equal(
  review.transaction_fingerprint_sha256,
  fixture.candidate.transaction_fingerprint_sha256,
);
assert.equal(
  review.candidate_revalidation_id,
  revalidationResult.receipt.candidate_revalidation_id,
);
assert.equal(
  review.prior_credential_binding_id,
  priorBinding.credential_binding_id,
);
assert.equal(
  review.fresh_credential_binding_id,
  freshBinding.credential_binding_id,
);
assert.equal(review.verification.fresh_credential_binding_after_revalidation,true);
assert.equal(review.verification.fresh_binding_distinct_from_prior_binding,true);
assert.equal(review.verification.separate_signing_authorization_required,true);
assert.equal(review.authority.review_artifact_only,true);
assert.equal(review.authority.credential_access,false);
assert.equal(review.authority.private_key_access,false);
assert.equal(review.authority.transaction_signing_authorized,false);
assert.equal(review.authority.transaction_signing,false);
assert.equal(review.signing_authorized,false);
assert.equal(
  validateVoidDatanetRegistryFinalSigningReviewV1(review),
  review,
);
assert.equal(
  validateVoidDatanetRegistryFinalSigningReviewEvidenceV1(review,evidence),
  review,
);

{
  assert.throws(
    ()=>buildVoidDatanetRegistryFinalSigningReviewV1({
      ...evidence,
      fresh_credential_binding:priorBinding,
      evaluated_at_utc:"2030-01-01T00:07:40.000Z",
    }),
    /final_review_fresh_credential_binding_mismatch/u,
  );
}
{
  const earlyBinding=buildBinding(
    fixture,
    "2030-01-01T00:07:19.000Z",
    "b".repeat(40),
  );
  assert.throws(
    ()=>buildVoidDatanetRegistryFinalSigningReviewV1({
      ...evidence,
      fresh_credential_binding:earlyBinding,
      evaluated_at_utc:"2030-01-01T00:07:40.000Z",
    }),
    /final_review_freshness_or_order_invalid/u,
  );
}
{
  const lateBinding=buildBinding(
    fixture,
    "2030-01-01T00:08:25.000Z",
    "b".repeat(40),
  );
  assert.throws(
    ()=>buildVoidDatanetRegistryFinalSigningReviewV1({
      ...evidence,
      fresh_credential_binding:lateBinding,
      evaluated_at_utc:"2030-01-01T00:08:26.000Z",
    }),
    /final_review_freshness_or_order_invalid/u,
  );
}
{
  const badReceipt=structuredClone(revalidationResult.receipt);
  badReceipt.continuity.candidate_maximum_gas_cost_wei="1";
  badReceipt.candidate_revalidation_id=
    rehashCandidateRevalidation(badReceipt);
  assert.throws(
    ()=>buildVoidDatanetRegistryFinalSigningReviewV1({
      ...evidence,
      candidate_revalidation_receipt:badReceipt,
      evaluated_at_utc:"2030-01-01T00:07:40.000Z",
    }),
    /final_review_revalidation_live_state_mismatch/u,
  );
}
{
  const bad=structuredClone(review);
  bad.authority.transaction_signing_authorized=true;
  bad.final_signing_review_id=rehashReview(bad);
  assert.throws(
    ()=>validateVoidDatanetRegistryFinalSigningReviewV1(bad),
    /final_signing_review_authority_mismatch:transaction_signing_authorized/u,
  );
}
{
  const bad=structuredClone(review);
  bad.fresh_credential_binding_id=priorBinding.credential_binding_id;
  bad.final_signing_review_id=rehashReview(bad);
  assert.throws(
    ()=>validateVoidDatanetRegistryFinalSigningReviewEvidenceV1(bad,evidence),
    /final_signing_review_evidence_rebuild_mismatch/u,
  );
}

const runner=fs.readFileSync(
  "ops/precision/void-datanet-registry-final-signing-review-v1.mjs",
  "utf8",
);
for(const required of [
  "PRIOR_CREDENTIAL_BINDING_JSON",
  "CANDIDATE_REVALIDATION_JSON",
  "FRESH_CREDENTIAL_BINDING_JSON",
  "review_artifact_only=true",
  "credential_access=false",
  "private_key_access=false",
  "wallet_access=false",
  "signer_object_exposed=false",
  "transaction_signing_authorized=false",
  "transaction_signing=false",
  "transaction_submission=false",
  "transaction_broadcast=false",
  "chain2050_mutation=false",
  "funds_movement=false",
  "signing_authorized=false",
]){
  assert.ok(runner.includes(required),required);
}
for(const forbidden of [
  "bindDatanetRegistryDeployerCredentialIdentityV1",
  "credentials_directory",
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

console.log("VOID_DATANET_REGISTRY_FINAL_SIGNING_REVIEW_V1_PROOF_GREEN");
console.log("candidate_exact=true");
console.log("fresh_candidate_revalidation_exact=true");
console.log("prior_credential_binding_lineage_only=true");
console.log("fresh_credential_binding_distinct=true");
console.log("fresh_credential_binding_after_revalidation=true");
console.log("fresh_credential_binding_within_revalidation_window=true");
console.log("candidate_maximum_gas_cost_funded=true");
console.log("review_artifact_only=true");
console.log("credential_access=false");
console.log("private_key_access=false");
console.log("wallet_access=false");
console.log("signer_object_exposed=false");
console.log("transaction_signing_authorized=false");
console.log("transaction_signing=false");
console.log("transaction_submission=false");
console.log("transaction_broadcast=false");
console.log("chain2050_mutation=false");
console.log("funds_movement=false");
console.log("signing_authorized=false");
