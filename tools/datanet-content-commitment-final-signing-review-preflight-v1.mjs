import {
  runDatanetContentCommitmentPreSignRevalidationV1,
} from "./datanet-content-commitment-pre-sign-revalidation-v1.mjs";
import {
  bindDatanetContentCommitmentPublisherCredentialV1,
} from "./datanet-content-commitment-publisher-credential-binding-v1.mjs";
import {
  canonicalJson,
  sha256,
} from "./datanet-content-commitment-compiler-profile-v1.mjs";

export const VOID_DATANET_CONTENT_COMMITMENT_FINAL_SIGNING_REVIEW_PREFLIGHT_V1 =
  "VOID_DATANET_CONTENT_COMMITMENT_FINAL_SIGNING_REVIEW_PREFLIGHT_V1";

export const VOID_DATANET_CONTENT_COMMITMENT_FINAL_SIGNING_REVIEW_PREFLIGHT_AUTHORITY_V1 = {
  source_only_composition:true,
  prior_credential_binding_lineage_required:true,
  fresh_pre_sign_revalidation_required:true,
  fresh_credential_binding_required:true,
  fresh_candidate_exact_binding_required:true,
  explicit_separate_signing_authorization_still_required:true,
  signer_object_exposed:false,
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

const ADDRESS=/^0x[0-9a-f]{40}$/;
const PRIOR_BINDING_ID=/^voiddccpcb1_[0-9a-f]{64}$/;
const PRE_SIGN_ID=/^voiddccpsr1_[0-9a-f]{64}$/;

function text(value){
  return typeof value==="string"?value.trim():"";
}
function plain(value){
  return value!==null&&typeof value==="object"&&!Array.isArray(value);
}

function held(reason,options={}){
  return {
    ok:false,
    marker:VOID_DATANET_CONTENT_COMMITMENT_FINAL_SIGNING_REVIEW_PREFLIGHT_V1,
    version:1,
    status:"held",
    reason,
    prior_credential_binding_id:options.prior_credential_binding_id??null,
    fresh_pre_sign_revalidation_id:options.fresh_pre_sign_revalidation_id??null,
    fresh_credential_binding_id:options.fresh_credential_binding_id??null,
    signer_object_exposed:false,
    signing_authorized:false,
    signing_performed:false,
    transaction_broadcast_authorized:false,
    transaction_broadcast_performed:false,
    chain2050_write_authorized:false,
    chain2050_write_performed:false,
    authority:
      VOID_DATANET_CONTENT_COMMITMENT_FINAL_SIGNING_REVIEW_PREFLIGHT_AUTHORITY_V1,
    ...(options.detail?{detail:options.detail}:{}),
  };
}

function validatePriorBinding(value){
  if(
    !plain(value)||
    value.ok!==true||
    value.marker!==
      "VOID_DATANET_CONTENT_COMMITMENT_PUBLISHER_CREDENTIAL_BINDING_V1"||
    value.version!==1||
    value.status!==
      "publisher_credential_identity_bound_without_signing_authority"||
    text(value.chain_id)!=="2050"||
    !PRIOR_BINDING_ID.test(text(value.credential_binding_id))||
    !PRE_SIGN_ID.test(text(value.pre_sign_revalidation_id))||
    !ADDRESS.test(text(value.publisher_address))||
    value.binding?.exact_candidate_publisher_match!==true||
    value.binding?.credential_address_derived!==true||
    value.binding?.credential_identity_only!==true||
    value.binding?.upstream_pre_sign_is_not_bearer_signing_authority!==true||
    value.authority?.raw_private_key_output!==false||
    value.authority?.signer_object_exposed!==false||
    value.authority?.transaction_signing_authorized!==false||
    value.authority?.transaction_signing_performed!==false||
    value.authority?.transaction_broadcast_authorized!==false||
    value.authority?.transaction_broadcast_performed!==false||
    value.authority?.chain2050_write_authorized!==false||
    value.authority?.chain2050_write_performed!==false||
    value.raw_private_key_output!==false||
    value.signer_object_exposed!==false||
    value.signing_performed!==false||
    value.transaction_broadcast_performed!==false||
    value.chain2050_write_performed!==false||
    text(value.next_gate)!==
      "revalidate_exact_bound_candidate_immediately_before_separate_signing_authorization"
  ){
    return {ok:false,reason:"final_signing_review_prior_binding_invalid"};
  }
  return {
    ok:true,
    credential_binding_id:text(value.credential_binding_id),
    publisher_address:text(value.publisher_address),
  };
}

function validateFreshPreSign(value){
  if(
    !plain(value)||
    value.ok!==true||
    value.marker!=="VOID_DATANET_CONTENT_COMMITMENT_PRE_SIGN_REVALIDATION_V1"||
    value.version!==1||
    value.status!==
      "fresh_pre_sign_revalidation_green_unsigned_transaction_candidate"||
    !PRE_SIGN_ID.test(text(value.pre_sign_revalidation_id))||
    value.freshness?.hardened_preflight_before_dynamic_binding!==true||
    value.freshness?.hardened_preflight_after_dynamic_binding!==true||
    value.freshness?.object_uncommitted_after_dynamic_binding!==true||
    value.freshness?.pending_nonce_stable!==true||
    value.freshness?.pending_nonce_rechecked_after_final_preflight!==true||
    value.authority?.signer_identity_bound!==false||
    value.authority?.signer_access_authorized!==false||
    value.authority?.wallet_access_authorized!==false||
    value.authority?.transaction_signing_authorized!==false||
    value.authority?.transaction_broadcast_authorized!==false||
    value.authority?.chain2050_write_authorized!==false||
    value.signing_performed!==false||
    value.signer_access_performed!==false||
    value.wallet_access_performed!==false||
    value.transaction_broadcast_performed!==false||
    value.chain2050_mutation_performed!==false
  ){
    return {ok:false,reason:"final_signing_review_fresh_pre_sign_invalid"};
  }
  const candidate=value.unsigned_transaction_candidate;
  const publisher=text(candidate?.from_address);
  if(
    !plain(candidate)||
    candidate.transaction_type!==2||
    text(candidate.chain_id)!=="2050"||
    !ADDRESS.test(publisher)
  ){
    return {ok:false,reason:"final_signing_review_fresh_candidate_invalid"};
  }
  return {
    ok:true,
    pre_sign_revalidation_id:text(value.pre_sign_revalidation_id),
    publisher_address:publisher,
    candidate,
  };
}

function validateFreshBinding(value,fresh){
  if(
    !plain(value)||
    value.ok!==true||
    value.marker!==
      "VOID_DATANET_CONTENT_COMMITMENT_PUBLISHER_CREDENTIAL_BINDING_V1"||
    value.version!==1||
    value.status!==
      "publisher_credential_identity_bound_without_signing_authority"||
    !PRIOR_BINDING_ID.test(text(value.credential_binding_id))||
    text(value.pre_sign_revalidation_id)!==fresh.pre_sign_revalidation_id||
    text(value.publisher_address)!==fresh.publisher_address||
    value.binding?.exact_candidate_publisher_match!==true||
    value.binding?.credential_identity_only!==true||
    value.authority?.raw_private_key_output!==false||
    value.authority?.signer_object_exposed!==false||
    value.authority?.transaction_signing_authorized!==false||
    value.authority?.transaction_signing_performed!==false||
    value.authority?.transaction_broadcast_authorized!==false||
    value.authority?.transaction_broadcast_performed!==false||
    value.authority?.chain2050_write_authorized!==false||
    value.raw_private_key_output!==false||
    value.signer_object_exposed!==false||
    value.signing_performed!==false||
    value.transaction_broadcast_performed!==false||
    value.chain2050_write_performed!==false
  ){
    return {ok:false,reason:"final_signing_review_fresh_credential_binding_invalid"};
  }
  return {
    ok:true,
    credential_binding_id:text(value.credential_binding_id),
  };
}

export async function runDatanetContentCommitmentFinalSigningReviewPreflightWithDependenciesV1(
  input,
  dependencies,
){
  const prior=validatePriorBinding(input?.prior_credential_binding);
  if(prior.ok===false)return held(prior.reason);

  if(
    !dependencies||
    typeof dependencies.pre_sign_runner!=="function"||
    typeof dependencies.credential_binder!=="function"
  ){
    return held("final_signing_review_dependencies_invalid",{
      prior_credential_binding_id:prior.credential_binding_id,
    });
  }

  let freshRaw;
  try{
    freshRaw=await dependencies.pre_sign_runner(input?.pre_sign_input);
  }catch(error){
    return held("final_signing_review_fresh_pre_sign_runner_failed",{
      prior_credential_binding_id:prior.credential_binding_id,
      detail:{error_class:text(error?.name||"Error").slice(0,80)},
    });
  }
  if(freshRaw?.ok===false){
    return held(
      "final_signing_review_fresh_pre_sign_held:"+text(freshRaw.reason),
      {prior_credential_binding_id:prior.credential_binding_id},
    );
  }

  const fresh=validateFreshPreSign(freshRaw);
  if(fresh.ok===false){
    return held(fresh.reason,{
      prior_credential_binding_id:prior.credential_binding_id,
    });
  }

  if(fresh.publisher_address!==prior.publisher_address){
    return held("final_signing_review_publisher_lineage_changed",{
      prior_credential_binding_id:prior.credential_binding_id,
      fresh_pre_sign_revalidation_id:fresh.pre_sign_revalidation_id,
    });
  }

  let bindingRaw;
  try{
    bindingRaw=await dependencies.credential_binder({
      credentials_directory:input?.credentials_directory,
      pre_sign_revalidation:freshRaw,
    });
  }catch(error){
    return held("final_signing_review_fresh_credential_binder_failed",{
      prior_credential_binding_id:prior.credential_binding_id,
      fresh_pre_sign_revalidation_id:fresh.pre_sign_revalidation_id,
      detail:{error_class:text(error?.name||"Error").slice(0,80)},
    });
  }
  if(bindingRaw?.ok===false){
    return held(
      "final_signing_review_fresh_credential_binding_held:"+
        text(bindingRaw.reason),
      {
        prior_credential_binding_id:prior.credential_binding_id,
        fresh_pre_sign_revalidation_id:fresh.pre_sign_revalidation_id,
      },
    );
  }

  const binding=validateFreshBinding(bindingRaw,fresh);
  if(binding.ok===false){
    return held(binding.reason,{
      prior_credential_binding_id:prior.credential_binding_id,
      fresh_pre_sign_revalidation_id:fresh.pre_sign_revalidation_id,
    });
  }

  const candidateFingerprint=sha256(canonicalJson(fresh.candidate));
  const material={
    marker:VOID_DATANET_CONTENT_COMMITMENT_FINAL_SIGNING_REVIEW_PREFLIGHT_V1,
    version:1,
    status:
      "fresh_candidate_and_publisher_identity_ready_for_separate_signing_authorization_review",
    chain_id:"2050",
    prior_credential_binding_id:prior.credential_binding_id,
    fresh_pre_sign_revalidation_id:fresh.pre_sign_revalidation_id,
    fresh_credential_binding_id:binding.credential_binding_id,
    publisher_address:fresh.publisher_address,
    unsigned_transaction_candidate:fresh.candidate,
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
      validator_mutation_authorized:false,
      governance_mutation_authorized:false,
      work_credit_mutation_authorized:false,
      service_action_authorized:false,
      funds_action_authorized:false,
      automatic_retry_authorized:false,
    },
    next_gate:
      "explicit_sovereign_single_transaction_signing_authorization_v1",
  };

  return {
    ok:true,
    ...material,
    final_signing_review_preflight_id:
      "voiddccfsrp1_"+sha256(canonicalJson(material)),
    signer_object_exposed:false,
    signing_authorized:false,
    signing_performed:false,
    transaction_broadcast_authorized:false,
    transaction_broadcast_performed:false,
    chain2050_write_authorized:false,
    chain2050_write_performed:false,
    authority_contract:
      VOID_DATANET_CONTENT_COMMITMENT_FINAL_SIGNING_REVIEW_PREFLIGHT_AUTHORITY_V1,
  };
}

export async function runDatanetContentCommitmentFinalSigningReviewPreflightV1(
  input,
){
  return await runDatanetContentCommitmentFinalSigningReviewPreflightWithDependenciesV1(
    input,
    {
      pre_sign_runner:runDatanetContentCommitmentPreSignRevalidationV1,
      credential_binder:bindDatanetContentCommitmentPublisherCredentialV1,
    },
  );
}
