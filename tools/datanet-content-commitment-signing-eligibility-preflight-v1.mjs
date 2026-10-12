import {
  VOID_DATANET_PHASE0_SOVEREIGN_PRIMARY_DER_SHA256_V1,
} from "./datanet-content-commitment-object-preflight-v1.mjs";
import {
  runDatanetContentCommitmentPreSignRevalidationAgainstFingerprintV1,
} from "./datanet-content-commitment-pre-sign-revalidation-v1.mjs";
import {
  bindDatanetContentCommitmentPublisherCredentialV1,
} from "./datanet-content-commitment-publisher-credential-binding-v1.mjs";
import {
  canonicalJson,
  sha256,
} from "./datanet-content-commitment-compiler-profile-v1.mjs";

export const VOID_DATANET_CONTENT_COMMITMENT_SIGNING_ELIGIBILITY_PREFLIGHT_V1 =
  "VOID_DATANET_CONTENT_COMMITMENT_SIGNING_ELIGIBILITY_PREFLIGHT_V1";

export const VOID_DATANET_CONTENT_COMMITMENT_SIGNING_ELIGIBILITY_PREFLIGHT_AUTHORITY_V1 = {
  live_read_only_chain2050_revalidation:true,
  two_complete_pre_sign_revalidations_required:true,
  fixed_publisher_credential_binding_between_revalidations:true,
  exact_unsigned_candidate_stability_required:true,
  credential_content_access:true,
  wallet_address_derivation:true,
  raw_private_key_output:false,
  signer_object_exposed:false,
  separate_sovereign_one_shot_authorization_required:true,
  eligibility_is_not_bearer_signing_authority:true,
  production_transport_injection_allowed:false,
  production_fingerprint_transport_injection_allowed:false,
  transaction_signing_authorized:false,
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

function text(value){
  return typeof value==="string"?value.trim():"";
}

function same(valueA,valueB){
  return canonicalJson(valueA)===canonicalJson(valueB);
}

function held(reason,options={}){
  return {
    ok:false,
    marker:VOID_DATANET_CONTENT_COMMITMENT_SIGNING_ELIGIBILITY_PREFLIGHT_V1,
    version:1,
    status:"held",
    reason,
    first_pre_sign_revalidation_id:
      options.first_pre_sign_revalidation_id??null,
    publisher_credential_binding_id:
      options.publisher_credential_binding_id??null,
    final_pre_sign_revalidation_id:
      options.final_pre_sign_revalidation_id??null,
    transaction_candidate_sha256:null,
    eligible_for_separate_sovereign_one_shot_signing_authorization:false,
    this_receipt_is_bearer_signing_authority:false,
    raw_private_key_output:false,
    signer_object_exposed:false,
    signing_performed:false,
    transaction_broadcast_performed:false,
    chain2050_write_performed:false,
    authority:
      VOID_DATANET_CONTENT_COMMITMENT_SIGNING_ELIGIBILITY_PREFLIGHT_AUTHORITY_V1,
    ...(options.detail?{detail:options.detail}:{}),
  };
}

export async function runDatanetContentCommitmentSigningEligibilityPreflightAgainstFingerprintV1(
  input,
  expectedSovereignFingerprint,
){
  if(
    input?.transport!==undefined&&
    expectedSovereignFingerprint===
      VOID_DATANET_PHASE0_SOVEREIGN_PRIMARY_DER_SHA256_V1
  ){
    return held(
      "signing_eligibility_production_fingerprint_transport_injection_forbidden",
    );
  }

  const first=
    await runDatanetContentCommitmentPreSignRevalidationAgainstFingerprintV1(
      input,
      expectedSovereignFingerprint,
    );
  if(first.ok===false){
    return held(
      "signing_eligibility_first_revalidation_held:"+first.reason,
    );
  }

  const binding=bindDatanetContentCommitmentPublisherCredentialV1({
    credentials_directory:input?.credentials_directory,
    pre_sign_revalidation:first,
  });
  if(binding.ok===false){
    return held(
      "signing_eligibility_publisher_credential_binding_held:"+binding.reason,
      {
        first_pre_sign_revalidation_id:first.pre_sign_revalidation_id,
      },
    );
  }

  const final=
    await runDatanetContentCommitmentPreSignRevalidationAgainstFingerprintV1(
      input,
      expectedSovereignFingerprint,
    );
  if(final.ok===false){
    return held(
      "signing_eligibility_final_revalidation_held:"+final.reason,
      {
        first_pre_sign_revalidation_id:first.pre_sign_revalidation_id,
        publisher_credential_binding_id:binding.credential_binding_id,
      },
    );
  }

  if(
    text(first.unsigned_call_plan_id)!==
      text(final.unsigned_call_plan_id)
  ){
    return held(
      "signing_eligibility_unsigned_call_plan_changed",
      {
        first_pre_sign_revalidation_id:first.pre_sign_revalidation_id,
        publisher_credential_binding_id:binding.credential_binding_id,
        final_pre_sign_revalidation_id:final.pre_sign_revalidation_id,
      },
    );
  }

  if(
    text(first.policy_fingerprint_sha256)!==
      text(final.policy_fingerprint_sha256)||
    text(first.rpc_url_fingerprint_sha256)!==
      text(final.rpc_url_fingerprint_sha256)
  ){
    return held(
      "signing_eligibility_policy_or_rpc_binding_changed",
      {
        first_pre_sign_revalidation_id:first.pre_sign_revalidation_id,
        publisher_credential_binding_id:binding.credential_binding_id,
        final_pre_sign_revalidation_id:final.pre_sign_revalidation_id,
      },
    );
  }

  if(
    !same(
      first.unsigned_transaction_candidate,
      final.unsigned_transaction_candidate,
    )
  ){
    return held(
      "signing_eligibility_unsigned_candidate_changed_across_credential_binding",
      {
        first_pre_sign_revalidation_id:first.pre_sign_revalidation_id,
        publisher_credential_binding_id:binding.credential_binding_id,
        final_pre_sign_revalidation_id:final.pre_sign_revalidation_id,
      },
    );
  }

  const candidate=final.unsigned_transaction_candidate;
  if(
    text(binding.publisher_address)!==text(candidate?.from_address)||
    text(binding.pre_sign_revalidation_id)!==
      text(first.pre_sign_revalidation_id)||
    binding.binding?.exact_candidate_publisher_match!==true||
    binding.binding?.credential_identity_only!==true||
    binding.authority?.raw_private_key_output!==false||
    binding.authority?.signer_object_exposed!==false||
    binding.authority?.transaction_signing_authorized!==false||
    binding.authority?.transaction_signing_performed!==false||
    binding.authority?.transaction_broadcast_authorized!==false||
    binding.authority?.transaction_broadcast_performed!==false||
    binding.authority?.chain2050_write_authorized!==false||
    binding.authority?.chain2050_write_performed!==false
  ){
    return held(
      "signing_eligibility_credential_binding_contract_invalid",
      {
        first_pre_sign_revalidation_id:first.pre_sign_revalidation_id,
        publisher_credential_binding_id:binding.credential_binding_id,
        final_pre_sign_revalidation_id:final.pre_sign_revalidation_id,
      },
    );
  }

  if(
    final.freshness?.hardened_preflight_before_dynamic_binding!==true||
    final.freshness?.hardened_preflight_after_dynamic_binding!==true||
    final.freshness?.object_uncommitted_after_dynamic_binding!==true||
    final.freshness?.pending_nonce_stable!==true||
    final.freshness?.pending_nonce_rechecked_after_final_preflight!==true||
    final.freshness?.prior_observation_authorizes_signing!==false||
    final.freshness?.signer_gate_must_revalidate_again!==true
  ){
    return held(
      "signing_eligibility_final_freshness_contract_invalid",
      {
        first_pre_sign_revalidation_id:first.pre_sign_revalidation_id,
        publisher_credential_binding_id:binding.credential_binding_id,
        final_pre_sign_revalidation_id:final.pre_sign_revalidation_id,
      },
    );
  }

  if(
    final.authority?.signer_identity_bound!==false||
    final.authority?.signer_access_authorized!==false||
    final.authority?.wallet_access_authorized!==false||
    final.authority?.transaction_signing_authorized!==false||
    final.authority?.transaction_broadcast_authorized!==false||
    final.authority?.chain2050_write_authorized!==false||
    final.authority?.funds_action_authorized!==false||
    final.authority?.automatic_retry_authorized!==false||
    final.signing_performed!==false||
    final.signer_access_performed!==false||
    final.wallet_access_performed!==false||
    final.transaction_broadcast_performed!==false||
    final.chain2050_mutation_performed!==false||
    final.funds_action_performed!==false
  ){
    return held(
      "signing_eligibility_final_authority_contract_invalid",
      {
        first_pre_sign_revalidation_id:first.pre_sign_revalidation_id,
        publisher_credential_binding_id:binding.credential_binding_id,
        final_pre_sign_revalidation_id:final.pre_sign_revalidation_id,
      },
    );
  }

  const candidateSha256=sha256(canonicalJson(candidate));
  const material={
    marker:VOID_DATANET_CONTENT_COMMITMENT_SIGNING_ELIGIBILITY_PREFLIGHT_V1,
    version:1,
    status:
      "fresh_candidate_and_publisher_identity_stable_eligible_for_separate_sovereign_one_shot_authorization",
    chain_id:"2050",
    sovereign_review_fingerprint_sha256:expectedSovereignFingerprint,
    unsigned_call_plan_id:final.unsigned_call_plan_id,
    first_pre_sign_revalidation_id:first.pre_sign_revalidation_id,
    publisher_credential_binding_id:binding.credential_binding_id,
    final_pre_sign_revalidation_id:final.pre_sign_revalidation_id,
    publisher_address:binding.publisher_address,
    publisher_address_fingerprint_sha256:
      binding.publisher_address_fingerprint_sha256,
    final_observation_block_number:
      final.final_observation_block_number,
    final_observation_block_hash:
      final.final_observation_block_hash,
    policy_fingerprint_sha256:final.policy_fingerprint_sha256,
    rpc_url_fingerprint_sha256:final.rpc_url_fingerprint_sha256,
    transaction_candidate:candidate,
    transaction_candidate_sha256:candidateSha256,
    stability:{
      complete_revalidation_before_credential_binding:true,
      credential_identity_bound_to_first_fresh_candidate:true,
      complete_revalidation_after_credential_binding:true,
      exact_unsigned_candidate_stable_across_credential_binding:true,
      policy_fingerprint_stable_across_credential_binding:true,
      rpc_url_fingerprint_stable_across_credential_binding:true,
      final_object_uncommitted:true,
      final_pending_nonce_stable:true,
      final_pending_nonce_rechecked_after_final_preflight:true,
    },
    eligibility:{
      eligible_for_separate_sovereign_one_shot_signing_authorization:true,
      separate_sovereign_authorization_still_required:true,
      this_receipt_is_bearer_signing_authority:false,
      later_signer_must_rederive_exact_transaction:true,
      later_signer_must_match_publisher_address:true,
      later_signer_must_revalidate_chain_freshness_again:true,
      broadcast_requires_separate_gate:true,
    },
    authority:{
      read_only_chain2050_rpc_performed:true,
      credential_content_access_performed:true,
      wallet_address_derivation_performed:true,
      raw_private_key_output:false,
      signer_object_exposed:false,
      production_transport_injection_allowed:false,
      production_fingerprint_transport_injection_allowed:false,
      transaction_signing_authorized:false,
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
      "sovereign_one_shot_datanet_signing_authorization_without_broadcast_v1",
  };

  return {
    ok:true,
    ...material,
    signing_eligibility_preflight_id:
      "voiddccsep1_"+sha256(canonicalJson(material)),
    eligible_for_separate_sovereign_one_shot_signing_authorization:true,
    this_receipt_is_bearer_signing_authority:false,
    raw_private_key_output:false,
    signer_object_exposed:false,
    signing_performed:false,
    transaction_broadcast_performed:false,
    chain2050_write_performed:false,
    authority_contract:
      VOID_DATANET_CONTENT_COMMITMENT_SIGNING_ELIGIBILITY_PREFLIGHT_AUTHORITY_V1,
  };
}

export async function runDatanetContentCommitmentSigningEligibilityPreflightV1(
  input,
){
  if(input?.transport!==undefined){
    return held("signing_eligibility_production_transport_injection_forbidden");
  }
  return await runDatanetContentCommitmentSigningEligibilityPreflightAgainstFingerprintV1(
    input,
    VOID_DATANET_PHASE0_SOVEREIGN_PRIMARY_DER_SHA256_V1,
  );
}
