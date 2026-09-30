#!/usr/bin/env node
import {
  buildVoidDatanetRegistryDeployerCredentialBindingV1,
} from "../../tools/void-datanet-registry-deployer-credential-binding-v1.mjs";
import {
  runVoidDatanetRegistryCandidateFreshRevalidationV1,
} from "../../tools/void-datanet-registry-candidate-fresh-revalidation-v1.mjs";
import {
  buildVoidDatanetRegistryFinalSigningReviewV1,
} from "../../tools/void-datanet-registry-final-signing-review-v1.mjs";
import {
  buildVoidDatanetRegistryExactSigningRequestV1,
  validateVoidDatanetRegistryExactSigningRequestV1,
} from "../../tools/void-datanet-registry-exact-signing-request-v1.mjs";
import {
  buildVoidDatanetRegistryUnsignedCandidateFixtureV1,
} from "./void-datanet-registry-unsigned-candidate-fixture-v1.mjs";

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

export async function buildVoidDatanetRegistryExactSigningRequestFixtureV1(){
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
  if(at!==11||revalidation.ok!==true){
    throw new Error("exact_signing_request_fixture_revalidation_not_green");
  }

  const freshBinding=buildBinding(
    fixture,
    "2030-01-01T00:07:30.000Z",
    "b".repeat(40),
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
  validateVoidDatanetRegistryExactSigningRequestV1(
    request,
    {
      ...reviewEvidence,
      final_signing_review:review,
    },
  );

  return Object.freeze({
    ...fixture,
    priorBinding,
    revalidation,
    freshBinding,
    review,
    reviewEvidence,
    signingRequest:request,
    signingRequestEvidence:Object.freeze({
      ...reviewEvidence,
      final_signing_review:review,
    }),
  });
}
