import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  runDatanetContentCommitmentFinalSigningReviewPreflightWithDependenciesV1,
  VOID_DATANET_CONTENT_COMMITMENT_FINAL_SIGNING_REVIEW_PREFLIGHT_AUTHORITY_V1,
} from "../tools/datanet-content-commitment-final-signing-review-preflight-v1.mjs";

const PUBLISHER="0x1111111111111111111111111111111111111111";
const REGISTRY="0x2222222222222222222222222222222222222222";
const PRIOR_ID="voiddccpcb1_"+"1".repeat(64);
const FRESH_PRE_SIGN_ID="voiddccpsr1_"+"2".repeat(64);
const FRESH_BINDING_ID="voiddccpcb1_"+"3".repeat(64);

function priorBinding(overrides={}){
  return {
    ok:true,
    marker:"VOID_DATANET_CONTENT_COMMITMENT_PUBLISHER_CREDENTIAL_BINDING_V1",
    version:1,
    status:"publisher_credential_identity_bound_without_signing_authority",
    chain_id:"2050",
    pre_sign_revalidation_id:"voiddccpsr1_"+"0".repeat(64),
    credential_binding_id:PRIOR_ID,
    publisher_address:PUBLISHER,
    binding:{
      exact_candidate_publisher_match:true,
      credential_address_derived:true,
      credential_identity_only:true,
      upstream_pre_sign_is_not_bearer_signing_authority:true,
    },
    authority:{
      raw_private_key_output:false,
      signer_object_exposed:false,
      transaction_signing_authorized:false,
      transaction_signing_performed:false,
      transaction_broadcast_authorized:false,
      transaction_broadcast_performed:false,
      chain2050_write_authorized:false,
      chain2050_write_performed:false,
    },
    raw_private_key_output:false,
    signer_object_exposed:false,
    signing_performed:false,
    transaction_broadcast_performed:false,
    chain2050_write_performed:false,
    next_gate:
      "revalidate_exact_bound_candidate_immediately_before_separate_signing_authorization",
    ...overrides,
  };
}

function freshPreSign(overrides={}){
  return {
    ok:true,
    marker:"VOID_DATANET_CONTENT_COMMITMENT_PRE_SIGN_REVALIDATION_V1",
    version:1,
    status:"fresh_pre_sign_revalidation_green_unsigned_transaction_candidate",
    pre_sign_revalidation_id:FRESH_PRE_SIGN_ID,
    freshness:{
      hardened_preflight_before_dynamic_binding:true,
      hardened_preflight_after_dynamic_binding:true,
      object_uncommitted_after_dynamic_binding:true,
      pending_nonce_stable:true,
      pending_nonce_rechecked_after_final_preflight:true,
    },
    unsigned_transaction_candidate:{
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
    },
    authority:{
      signer_identity_bound:false,
      signer_access_authorized:false,
      wallet_access_authorized:false,
      transaction_signing_authorized:false,
      transaction_broadcast_authorized:false,
      chain2050_write_authorized:false,
    },
    signing_performed:false,
    signer_access_performed:false,
    wallet_access_performed:false,
    transaction_broadcast_performed:false,
    chain2050_mutation_performed:false,
    ...overrides,
  };
}

function freshBinding(overrides={}){
  return {
    ok:true,
    marker:"VOID_DATANET_CONTENT_COMMITMENT_PUBLISHER_CREDENTIAL_BINDING_V1",
    version:1,
    status:"publisher_credential_identity_bound_without_signing_authority",
    credential_binding_id:FRESH_BINDING_ID,
    pre_sign_revalidation_id:FRESH_PRE_SIGN_ID,
    publisher_address:PUBLISHER,
    binding:{
      exact_candidate_publisher_match:true,
      credential_identity_only:true,
    },
    authority:{
      raw_private_key_output:false,
      signer_object_exposed:false,
      transaction_signing_authorized:false,
      transaction_signing_performed:false,
      transaction_broadcast_authorized:false,
      transaction_broadcast_performed:false,
      chain2050_write_authorized:false,
    },
    raw_private_key_output:false,
    signer_object_exposed:false,
    signing_performed:false,
    transaction_broadcast_performed:false,
    chain2050_write_performed:false,
    ...overrides,
  };
}

function deps(options={}){
  const calls=[];
  return {
    calls,
    dependencies:{
      pre_sign_runner:async(input)=>{
        calls.push(["pre_sign_runner",input]);
        if(options.preSignThrow)throw new Error("pre-sign boom");
        return options.preSignResult??freshPreSign();
      },
      credential_binder:async(input)=>{
        calls.push(["credential_binder",input]);
        if(options.bindingThrow)throw new Error("binding boom");
        return options.bindingResult??freshBinding();
      },
    },
  };
}

{
  const d=deps();
  const result=
    await runDatanetContentCommitmentFinalSigningReviewPreflightWithDependenciesV1(
      {
        prior_credential_binding:priorBinding(),
        pre_sign_input:{sentinel:"fresh-input"},
        credentials_directory:"/synthetic/credentials",
      },
      d.dependencies,
    );
  assert.equal(result.ok,true);
  if(result.ok===false)throw new Error(result.reason);
  assert.equal(
    result.status,
    "fresh_candidate_and_publisher_identity_ready_for_separate_signing_authorization_review",
  );
  assert.match(
    result.final_signing_review_preflight_id,
    /^voiddccfsrp1_[0-9a-f]{64}$/,
  );
  assert.equal(result.prior_credential_binding_id,PRIOR_ID);
  assert.equal(result.fresh_pre_sign_revalidation_id,FRESH_PRE_SIGN_ID);
  assert.equal(result.fresh_credential_binding_id,FRESH_BINDING_ID);
  assert.equal(result.publisher_address,PUBLISHER);
  assert.equal(result.unsigned_transaction_candidate.nonce,"9");
  assert.equal(result.revalidation.full_pre_sign_revalidation_rerun,true);
  assert.equal(
    result.revalidation.credential_identity_binding_rerun_after_fresh_pre_sign,
    true,
  );
  assert.equal(result.authority.review_artifact_only,true);
  assert.equal(
    result.authority.separate_explicit_signing_authorization_required,
    true,
  );
  assert.equal(result.authority.transaction_signing_authorized,false);
  assert.equal(result.authority.transaction_broadcast_authorized,false);
  assert.equal(result.authority.chain2050_write_authorized,false);
  assert.equal(result.signing_performed,false);
  assert.equal(result.transaction_broadcast_performed,false);
  assert.equal(result.chain2050_write_performed,false);
  assert.deepEqual(
    d.calls.map(([name])=>name),
    ["pre_sign_runner","credential_binder"],
  );
  assert.equal(
    d.calls[1][1].pre_sign_revalidation.pre_sign_revalidation_id,
    FRESH_PRE_SIGN_ID,
  );
}

{
  let touched=false;
  const result=
    await runDatanetContentCommitmentFinalSigningReviewPreflightWithDependenciesV1(
      {
        prior_credential_binding:priorBinding({
          authority:{
            ...priorBinding().authority,
            transaction_signing_authorized:true,
          },
        }),
      },
      {
        pre_sign_runner:async()=>{touched=true;return freshPreSign();},
        credential_binder:async()=>{touched=true;return freshBinding();},
      },
    );
  assert.equal(result.ok,false);
  assert.equal(result.reason,"final_signing_review_prior_binding_invalid");
  assert.equal(touched,false);
}

{
  const d=deps({
    preSignResult:{ok:false,reason:"nonce_changed"},
  });
  const result=
    await runDatanetContentCommitmentFinalSigningReviewPreflightWithDependenciesV1(
      {prior_credential_binding:priorBinding(),pre_sign_input:{}},
      d.dependencies,
    );
  assert.equal(result.ok,false);
  assert.equal(
    result.reason,
    "final_signing_review_fresh_pre_sign_held:nonce_changed",
  );
  assert.deepEqual(d.calls.map(([name])=>name),["pre_sign_runner"]);
}

{
  const d=deps({
    preSignResult:freshPreSign({
      freshness:{
        ...freshPreSign().freshness,
        pending_nonce_rechecked_after_final_preflight:false,
      },
    }),
  });
  const result=
    await runDatanetContentCommitmentFinalSigningReviewPreflightWithDependenciesV1(
      {prior_credential_binding:priorBinding(),pre_sign_input:{}},
      d.dependencies,
    );
  assert.equal(result.ok,false);
  assert.equal(result.reason,"final_signing_review_fresh_pre_sign_invalid");
  assert.deepEqual(d.calls.map(([name])=>name),["pre_sign_runner"]);
}

{
  const d=deps({
    preSignResult:freshPreSign({
      unsigned_transaction_candidate:{
        ...freshPreSign().unsigned_transaction_candidate,
        from_address:"0x4444444444444444444444444444444444444444",
      },
    }),
  });
  const result=
    await runDatanetContentCommitmentFinalSigningReviewPreflightWithDependenciesV1(
      {prior_credential_binding:priorBinding(),pre_sign_input:{}},
      d.dependencies,
    );
  assert.equal(result.ok,false);
  assert.equal(result.reason,"final_signing_review_publisher_lineage_changed");
  assert.deepEqual(d.calls.map(([name])=>name),["pre_sign_runner"]);
}

{
  const d=deps({
    bindingResult:{ok:false,reason:"publisher_credential_address_mismatch"},
  });
  const result=
    await runDatanetContentCommitmentFinalSigningReviewPreflightWithDependenciesV1(
      {
        prior_credential_binding:priorBinding(),
        pre_sign_input:{},
        credentials_directory:"/synthetic/credentials",
      },
      d.dependencies,
    );
  assert.equal(result.ok,false);
  assert.equal(
    result.reason,
    "final_signing_review_fresh_credential_binding_held:"+
      "publisher_credential_address_mismatch",
  );
  assert.deepEqual(
    d.calls.map(([name])=>name),
    ["pre_sign_runner","credential_binder"],
  );
}

{
  const d=deps({
    bindingResult:freshBinding({
      pre_sign_revalidation_id:"voiddccpsr1_"+"f".repeat(64),
    }),
  });
  const result=
    await runDatanetContentCommitmentFinalSigningReviewPreflightWithDependenciesV1(
      {
        prior_credential_binding:priorBinding(),
        pre_sign_input:{},
        credentials_directory:"/synthetic/credentials",
      },
      d.dependencies,
    );
  assert.equal(result.ok,false);
  assert.equal(
    result.reason,
    "final_signing_review_fresh_credential_binding_invalid",
  );
}

for(const [key,expected] of Object.entries({
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
})){
  assert.equal(
    VOID_DATANET_CONTENT_COMMITMENT_FINAL_SIGNING_REVIEW_PREFLIGHT_AUTHORITY_V1[key],
    expected,
    key,
  );
}

const source=fs.readFileSync(
  path.join(
    process.cwd(),
    "tools/datanet-content-commitment-final-signing-review-preflight-v1.mjs",
  ),
  "utf8",
);
for(const forbidden of [
  ".signTransaction(",
  ".signMessage(",
  "Wallet(",
  "eth_sendRawTransaction",
  "eth_sendTransaction",
  "broadcastTransaction(",
  "sendTransaction(",
]){
  assert.equal(source.includes(forbidden),false,"source contains "+forbidden);
}

console.log(
  "VOID_DATANET_CONTENT_COMMITMENT_FINAL_SIGNING_REVIEW_PREFLIGHT_V1_PROOF_GREEN",
);
console.log("prior_credential_binding_lineage_required=true");
console.log("fresh_pre_sign_revalidation_rerun=true");
console.log("fresh_credential_binding_rerun=true");
console.log("freshness_wall_reapplied=true");
console.log("post_preflight_nonce_check_required=true");
console.log("publisher_lineage_change_rejected=true");
console.log("stale_binding_not_used_as_signing_authority=true");
console.log("review_artifact_only=true");
console.log("separate_explicit_signing_authorization_required=true");
console.log("signer_object_exposed=false");
console.log("signing_authorized=false");
console.log("signing=false");
console.log("transaction_broadcast=false");
console.log("chain2050_write=false");
