import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  computeAddress,
  getAddress,
} from "ethers";

export const VOID_DATANET_CONTENT_COMMITMENT_PUBLISHER_CREDENTIAL_BINDING_V1 =
  "VOID_DATANET_CONTENT_COMMITMENT_PUBLISHER_CREDENTIAL_BINDING_V1";

export const VOID_DATANET_CONTENT_COMMITMENT_PUBLISHER_CREDENTIAL_ID_V1 =
  "datanet-content-commitment-publisher-wallet-v1";

export const VOID_DATANET_CONTENT_COMMITMENT_PUBLISHER_CREDENTIAL_BINDING_AUTHORITY_V1 = {
  identity_binding_only:true,
  fixed_systemd_credential_id:true,
  arbitrary_credential_path:false,
  credential_content_access:true,
  wallet_address_derivation:true,
  raw_private_key_output:false,
  signer_object_exposed:false,
  rpc_call:false,
  transaction_revalidation:false,
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

const PRIVATE_KEY=/^(?:0x)?[0-9a-fA-F]{64}$/;
const ADDRESS=/^0x[0-9a-f]{40}$/;
const PRE_SIGN_ID=/^voiddccpsr1_[0-9a-f]{64}$/;
const MAX_CREDENTIAL_BYTES=128;

function canonicalJson(value){
  const visit=(candidate)=>{
    if(Array.isArray(candidate))return candidate.map(visit);
    if(candidate&&typeof candidate==="object"){
      return Object.fromEntries(
        Object.entries(candidate)
          .sort(([left],[right])=>left.localeCompare(right))
          .map(([key,nested])=>[key,visit(nested)]),
      );
    }
    return candidate;
  };
  return JSON.stringify(visit(value));
}

function sha256(value){
  return crypto.createHash("sha256").update(value).digest("hex");
}

function plain(value){
  return value!==null&&typeof value==="object"&&!Array.isArray(value);
}

function text(value){
  return typeof value==="string"?value.trim():"";
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

function safeErrorClass(error){
  const raw=text(error?.name||"Error");
  return /^[A-Za-z0-9._:-]{1,80}$/.test(raw)?raw:"Error";
}

function held(reason,options={}){
  return {
    ok:false,
    marker:VOID_DATANET_CONTENT_COMMITMENT_PUBLISHER_CREDENTIAL_BINDING_V1,
    version:1,
    status:"held",
    reason,
    credential_id:
      VOID_DATANET_CONTENT_COMMITMENT_PUBLISHER_CREDENTIAL_ID_V1,
    publisher_address:options.publisher_address??null,
    publisher_address_fingerprint_sha256:
      options.publisher_address?sha256(options.publisher_address):null,
    credential_binding_id:null,
    raw_private_key_output:false,
    signer_object_exposed:false,
    signing_performed:false,
    transaction_broadcast_performed:false,
    chain2050_write_performed:false,
    authority:
      VOID_DATANET_CONTENT_COMMITMENT_PUBLISHER_CREDENTIAL_BINDING_AUTHORITY_V1,
    ...(options.detail?{detail:options.detail}:{}),
  };
}

function validatePreSign(value){
  if(
    !plain(value)||
    value.ok!==true||
    value.marker!=="VOID_DATANET_CONTENT_COMMITMENT_PRE_SIGN_REVALIDATION_V1"||
    value.version!==1||
    value.status!==
      "fresh_pre_sign_revalidation_green_unsigned_transaction_candidate"||
    !PRE_SIGN_ID.test(text(value.pre_sign_revalidation_id))||
    value.nonce_stable_across_revalidation!==true
  ){
    return {ok:false,reason:"publisher_credential_pre_sign_evidence_invalid"};
  }

  const candidate=value.unsigned_transaction_candidate;
  const publisher=address(candidate?.from_address);
  const registry=address(candidate?.to_address);
  if(
    !plain(candidate)||
    candidate.transaction_type!==2||
    text(candidate.chain_id)!=="2050"||
    !publisher||
    !registry||
    publisher===registry||
    text(candidate.value_wei)!=="0"||
    !/^[0-9]+$/.test(text(candidate.nonce))||
    !/^[1-9][0-9]*$/.test(text(candidate.gas_limit))||
    !/^[1-9][0-9]*$/.test(text(candidate.max_fee_per_gas_wei))||
    !/^[0-9]+$/.test(text(candidate.max_priority_fee_per_gas_wei))||
    !/^0x[0-9a-f]+$/.test(text(candidate.calldata))
  ){
    return {ok:false,reason:"publisher_credential_unsigned_candidate_invalid"};
  }

  const freshness=value.freshness;
  if(
    !plain(freshness)||
    freshness.hardened_preflight_before_dynamic_binding!==true||
    freshness.hardened_preflight_after_dynamic_binding!==true||
    freshness.object_uncommitted_after_dynamic_binding!==true||
    freshness.pending_nonce_stable!==true||
    freshness.pending_nonce_rechecked_after_final_preflight!==true||
    freshness.prior_observation_authorizes_signing!==false||
    freshness.signer_gate_must_revalidate_again!==true
  ){
    return {ok:false,reason:"publisher_credential_freshness_contract_invalid"};
  }

  const authority=value.authority;
  if(
    !plain(authority)||
    authority.unsigned_transaction_candidate_materialized!==true||
    authority.signer_identity_bound!==false||
    authority.signer_access_authorized!==false||
    authority.wallet_access_authorized!==false||
    authority.transaction_signing_authorized!==false||
    authority.transaction_broadcast_authorized!==false||
    authority.chain2050_write_authorized!==false||
    authority.funds_action_authorized!==false||
    authority.automatic_retry_authorized!==false
  ){
    return {ok:false,reason:"publisher_credential_upstream_authority_invalid"};
  }

  if(
    value.signing_performed!==false||
    value.signer_access_performed!==false||
    value.wallet_access_performed!==false||
    value.transaction_broadcast_performed!==false||
    value.chain2050_mutation_performed!==false||
    value.funds_action_performed!==false
  ){
    return {ok:false,reason:"publisher_credential_upstream_effect_boundary_invalid"};
  }

  if(
    text(value.next_gate)!==
      "bind_exact_publisher_signer_identity_then_revalidate_immediately_before_signing"
  ){
    return {ok:false,reason:"publisher_credential_upstream_next_gate_invalid"};
  }

  return {
    ok:true,
    pre_sign_revalidation_id:text(value.pre_sign_revalidation_id),
    publisher,
    candidate,
  };
}

export function bindDatanetContentCommitmentPublisherCredentialV1(input){
  const upstream=validatePreSign(input?.pre_sign_revalidation);
  if(upstream.ok===false)return held(upstream.reason);

  const credentialsDirectory=text(input?.credentials_directory);
  if(!credentialsDirectory||!path.isAbsolute(credentialsDirectory)){
    return held(
      "publisher_credential_directory_must_be_absolute",
      {publisher_address:upstream.publisher},
    );
  }

  const normalizedDirectory=path.normalize(credentialsDirectory);
  const credentialPath=path.join(
    normalizedDirectory,
    VOID_DATANET_CONTENT_COMMITMENT_PUBLISHER_CREDENTIAL_ID_V1,
  );
  if(path.dirname(credentialPath)!==normalizedDirectory){
    return held(
      "publisher_credential_path_escape_detected",
      {publisher_address:upstream.publisher},
    );
  }

  let stat;
  try{
    stat=fs.lstatSync(credentialPath);
  }catch(error){
    return held(
      "publisher_credential_missing_or_unreadable",
      {
        publisher_address:upstream.publisher,
        detail:{error_class:safeErrorClass(error)},
      },
    );
  }

  if(stat.isSymbolicLink()){
    return held(
      "publisher_credential_symlink_forbidden",
      {publisher_address:upstream.publisher},
    );
  }
  if(!stat.isFile()){
    return held(
      "publisher_credential_not_regular_file",
      {publisher_address:upstream.publisher},
    );
  }
  if(stat.size<=0||stat.size>MAX_CREDENTIAL_BYTES){
    return held(
      "publisher_credential_size_out_of_policy",
      {
        publisher_address:upstream.publisher,
        detail:{size_bytes:stat.size},
      },
    );
  }

  const mode=stat.mode&0o777;
  if(
    (mode&0o077)!==0||
    (mode&0o400)===0||
    (mode&0o100)!==0
  ){
    return held(
      "publisher_credential_permissions_out_of_policy",
      {
        publisher_address:upstream.publisher,
        detail:{mode:mode.toString(8).padStart(3,"0")},
      },
    );
  }

  let credentialBytes;
  try{
    credentialBytes=fs.readFileSync(credentialPath);
  }catch(error){
    return held(
      "publisher_credential_read_failed",
      {
        publisher_address:upstream.publisher,
        detail:{error_class:safeErrorClass(error)},
      },
    );
  }

  let privateKey="";
  try{
    privateKey=credentialBytes.toString("utf8").trim();
  }finally{
    credentialBytes.fill(0);
  }

  if(!PRIVATE_KEY.test(privateKey)){
    privateKey="";
    return held(
      "publisher_credential_private_key_shape_invalid",
      {publisher_address:upstream.publisher},
    );
  }
  if(!privateKey.startsWith("0x"))privateKey="0x"+privateKey;

  let derived="";
  try{
    derived=address(computeAddress(privateKey));
  }catch(error){
    privateKey="";
    return held(
      "publisher_credential_address_derivation_failed",
      {
        publisher_address:upstream.publisher,
        detail:{error_class:safeErrorClass(error)},
      },
    );
  }
  privateKey="";

  if(!derived){
    return held(
      "publisher_credential_derived_address_invalid",
      {publisher_address:upstream.publisher},
    );
  }
  if(derived!==upstream.publisher){
    return held(
      "publisher_credential_address_mismatch",
      {
        publisher_address:upstream.publisher,
        detail:{
          derived_address_fingerprint_sha256:sha256(derived),
        },
      },
    );
  }

  const material={
    marker:VOID_DATANET_CONTENT_COMMITMENT_PUBLISHER_CREDENTIAL_BINDING_V1,
    version:1,
    status:"publisher_credential_identity_bound_without_signing_authority",
    chain_id:"2050",
    pre_sign_revalidation_id:upstream.pre_sign_revalidation_id,
    credential_id:
      VOID_DATANET_CONTENT_COMMITMENT_PUBLISHER_CREDENTIAL_ID_V1,
    publisher_address:upstream.publisher,
    publisher_address_fingerprint_sha256:sha256(upstream.publisher),
    credential_source:{
      regular_file:true,
      symbolic_link:false,
      mode:mode.toString(8).padStart(3,"0"),
      size_bytes:stat.size,
    },
    binding:{
      exact_candidate_publisher_match:true,
      credential_address_derived:true,
      credential_identity_only:true,
      upstream_pre_sign_is_not_bearer_signing_authority:true,
    },
    authority:{
      credential_content_access_performed:true,
      wallet_address_derivation_performed:true,
      raw_private_key_output:false,
      signer_object_exposed:false,
      rpc_call_performed:false,
      transaction_revalidation_performed:false,
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
      "revalidate_exact_bound_candidate_immediately_before_separate_signing_authorization",
  };

  return {
    ok:true,
    ...material,
    credential_binding_id:
      "voiddccpcb1_"+sha256(canonicalJson(material)),
    raw_private_key_output:false,
    signer_object_exposed:false,
    signing_performed:false,
    transaction_broadcast_performed:false,
    chain2050_write_performed:false,
    authority_contract:
      VOID_DATANET_CONTENT_COMMITMENT_PUBLISHER_CREDENTIAL_BINDING_AUTHORITY_V1,
  };
}
