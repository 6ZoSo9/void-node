#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {computeAddress} from "ethers";

import {
  validateVoidDatanetRegistryUnsignedTransactionCandidateV1,
} from "./void-datanet-registry-unsigned-transaction-candidate-v1.mjs";

export const VOID_DATANET_REGISTRY_DEPLOYER_CREDENTIAL_BINDING_V1 =
  "VOID_DATANET_REGISTRY_DEPLOYER_CREDENTIAL_BINDING_V1";
export const VOID_DATANET_REGISTRY_DEPLOYER_CREDENTIAL_BINDING_CONFIRMATION_V1 =
  "bindDatanetRegistryDeployerCredentialIdentityV1";
export const VOID_DATANET_REGISTRY_DEPLOYER_CREDENTIAL_ID_V1 =
  "datanet-content-commitment-registry-deployer-wallet-v1";
export const VOID_DATANET_REGISTRY_DEPLOYER_ADDRESS_V1 =
  "0x6c93ddfcc4116574fe66d63c1c67daedc0070dbb";
export const VOID_DATANET_REGISTRY_DEPLOYER_ADDRESS_FINGERPRINT_SHA256_V1 =
  "bbf87ccd6c56e68fc486c310a12074d51a23af79df8e9c4727fe156099b864d1";
export const VOID_DATANET_REGISTRY_DEPLOYER_CEREMONY_RECEIPT_SHA256_V1 =
  "81a43d3c245b5badfa975c7ab998094359f62872600d533453df6cab8ed68cb3";
export const VOID_DATANET_REGISTRY_DEPLOYER_CEREMONY_ID_V1 =
  "20260928T121413Z";

const PRIVATE_KEY=/^(?:0x)?[0-9a-fA-F]{64}$/u;
const CANDIDATE_ID=/^voiddrtxc1_[0-9a-f]{64}$/u;
const HASH=/^0x[0-9a-f]{64}$/u;
const SHA256=/^[0-9a-f]{64}$/u;
const SHA40=/^[0-9a-f]{40}$/u;
const BINDING_ID=/^voiddrcb1_[0-9a-f]{64}$/u;
const MAX_CREDENTIAL_BYTES=128;

function sha256(value){
  return crypto.createHash("sha256").update(value).digest("hex");
}
function canonical(value){
  if(value===null||typeof value==="string"||typeof value==="boolean") return value;
  if(typeof value==="number"&&Number.isFinite(value)) return value;
  if(Array.isArray(value)) return value.map(canonical);
  if(value&&typeof value==="object"){
    return Object.fromEntries(
      Object.keys(value).sort().map((key)=>[key,canonical(value[key])]),
    );
  }
  throw new Error("unsupported_canonical_value");
}
function canonicalJson(value){
  return JSON.stringify(canonical(value));
}
function exactKeys(value,keys,label){
  if(!value||typeof value!=="object"||Array.isArray(value)){
    throw new Error(label+"_invalid");
  }
  const actual=Object.keys(value).sort();
  const expected=[...keys].sort();
  if(JSON.stringify(actual)!==JSON.stringify(expected)){
    throw new Error(label+"_keys_invalid");
  }
}
function timestamp(value,label){
  const raw=String(value||"");
  if(
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(raw)||
    !Number.isFinite(Date.parse(raw))
  ){
    throw new Error(label+"_invalid");
  }
  return raw;
}
function held(reason,options={}){
  return Object.freeze({
    ok:false,
    marker:VOID_DATANET_REGISTRY_DEPLOYER_CREDENTIAL_BINDING_V1,
    version:1,
    status:"held",
    reason,
    candidate_id:options.candidate_id??null,
    credential_id:VOID_DATANET_REGISTRY_DEPLOYER_CREDENTIAL_ID_V1,
    deployer_address:VOID_DATANET_REGISTRY_DEPLOYER_ADDRESS_V1,
    credential_content_access_performed:
      options.credential_content_access_performed===true,
    private_key_access_performed:
      options.private_key_access_performed===true,
    raw_private_key_output:false,
    private_key_digest_output:false,
    signer_object_exposed:false,
    transaction_signing_authorized:false,
    transaction_signing_performed:false,
    transaction_submission_authorized:false,
    transaction_submission_performed:false,
    transaction_broadcast_authorized:false,
    transaction_broadcast_performed:false,
    deployment_authorized:false,
    chain2050_write_authorized:false,
    funds_movement_authorized:false,
    automatic_retry_authorized:false,
  });
}

export function validateVoidDatanetRegistryDeployerSelectionV1(selection){
  if(
    !selection||
    typeof selection!=="object"||
    Array.isArray(selection)||
    selection.marker!==
      "VOID_DATANET_CONTENT_COMMITMENT_REGISTRY_DEPLOYER_SELECTION_V1"||
    selection.version!==1||
    selection.status!=="DEPLOYER_SELECTED_SOURCE_ONLY"||
    selection.chain_id!==2050||
    selection.role!=="datanet_content_commitment_registry_deployer"||
    selection.credential_id!==
      VOID_DATANET_REGISTRY_DEPLOYER_CREDENTIAL_ID_V1||
    String(selection.deployer_address||"").toLowerCase()!==
      VOID_DATANET_REGISTRY_DEPLOYER_ADDRESS_V1||
    selection.deployer_address_fingerprint_sha256!==
      VOID_DATANET_REGISTRY_DEPLOYER_ADDRESS_FINGERPRINT_SHA256_V1||
    selection.key_type!=="secp256k1_eoa"||
    selection.selection_basis?.fresh_dedicated_key!==true||
    selection.selection_basis?.generated_on_host!=="Nimo"||
    selection.selection_basis?.generated_offline!==true||
    selection.selection_basis?.encrypted_backup_device_label!=="VOID_AUTHORITY"||
    selection.selection_basis?.encrypted_backup_verified!==true||
    selection.selection_basis?.public_ceremony_receipt_sha256!==
      VOID_DATANET_REGISTRY_DEPLOYER_CEREMONY_RECEIPT_SHA256_V1||
    selection.selection_basis?.public_ceremony_id!==
      VOID_DATANET_REGISTRY_DEPLOYER_CEREMONY_ID_V1||
    selection.selection_basis?.private_material_in_repo!==false||
    selection.separation?.publisher_deployer_distinct!==true||
    selection.separation?.legacy_treasury_reuse!==false||
    selection.separation?.role_authority_deployer_reuse!==false||
    selection.separation?.presale_deployer_reuse!==false||
    selection.authority?.credential_content_access!==false||
    selection.authority?.wallet_access!==false||
    selection.authority?.private_key_access!==false||
    selection.authority?.transaction_signing!==false||
    selection.authority?.transaction_broadcast!==false||
    selection.authority?.authoritative_chain2050_write!==false||
    selection.authority?.funds_movement!==false
  ){
    throw new Error("registry_deployer_selection_invalid");
  }
  return selection;
}

export function observeVoidDatanetRegistryDeployerCredentialFileV1(input){
  const directory=String(input?.credentials_directory||"");
  if(!directory||!path.isAbsolute(directory)){
    return held("registry_deployer_credential_directory_must_be_absolute");
  }

  let directoryStat;
  let canonicalDirectory;
  try{
    directoryStat=fs.lstatSync(directory);
    canonicalDirectory=fs.realpathSync(directory);
  }catch{
    return held("registry_deployer_credential_directory_unavailable");
  }
  if(
    directoryStat.isSymbolicLink()||
    !directoryStat.isDirectory()||
    canonicalDirectory!==path.normalize(directory)||
    (directoryStat.mode&0o077)!==0
  ){
    return held("registry_deployer_credential_directory_out_of_policy");
  }

  const credentialPath=path.join(
    canonicalDirectory,
    VOID_DATANET_REGISTRY_DEPLOYER_CREDENTIAL_ID_V1,
  );
  if(path.dirname(credentialPath)!==canonicalDirectory){
    return held("registry_deployer_credential_path_escape");
  }

  let fd=-1;
  let stat;
  let bytes=null;
  let privateKey="";
  try{
    fd=fs.openSync(
      credentialPath,
      fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW,
    );
    stat=fs.fstatSync(fd);
    if(
      !stat.isFile()||
      stat.nlink!==1||
      stat.uid!==process.getuid()||
      ![0o400,0o600].includes(stat.mode&0o777)||
      stat.size<=0||
      stat.size>MAX_CREDENTIAL_BYTES
    ){
      return held("registry_deployer_credential_file_out_of_policy");
    }

    const pathStat=fs.lstatSync(credentialPath);
    if(
      pathStat.isSymbolicLink()||
      pathStat.dev!==stat.dev||
      pathStat.ino!==stat.ino||
      fs.realpathSync(credentialPath)!==credentialPath
    ){
      return held("registry_deployer_credential_file_identity_changed");
    }

    bytes=Buffer.alloc(stat.size);
    const read=fs.readSync(fd,bytes,0,bytes.length,0);
    if(read!==bytes.length){
      return held(
        "registry_deployer_credential_short_read",
        {
          credential_content_access_performed:true,
          private_key_access_performed:true,
        },
      );
    }
    privateKey=bytes.toString("utf8").trim();
    if(!PRIVATE_KEY.test(privateKey)){
      return held(
        "registry_deployer_credential_private_key_shape_invalid",
        {
          credential_content_access_performed:true,
          private_key_access_performed:true,
        },
      );
    }
    if(!privateKey.startsWith("0x")) privateKey="0x"+privateKey;

    let derivedAddress;
    try{
      derivedAddress=computeAddress(privateKey).toLowerCase();
    }catch{
      return held(
        "registry_deployer_credential_address_derivation_failed",
        {
          credential_content_access_performed:true,
          private_key_access_performed:true,
        },
      );
    }

    return Object.freeze({
      ok:true,
      marker:"VOID_DATANET_REGISTRY_DEPLOYER_CREDENTIAL_FILE_OBSERVATION_V1",
      version:1,
      status:"credential_identity_observed_without_signer_object",
      credential_id:VOID_DATANET_REGISTRY_DEPLOYER_CREDENTIAL_ID_V1,
      derived_address:derivedAddress,
      credential_source:{
        canonical_directory:true,
        directory_private_mode:true,
        regular_file:true,
        symbolic_link:false,
        single_hard_link:true,
        owner_current_user:true,
        mode:(stat.mode&0o777).toString(8).padStart(3,"0"),
        size_bytes:stat.size,
      },
      credential_content_access_performed:true,
      private_key_access_performed:true,
      raw_private_key_output:false,
      private_key_digest_output:false,
      signer_object_exposed:false,
      transaction_signing_performed:false,
    });
  }catch{
    return held(
      "registry_deployer_credential_open_or_read_failed",
      {
        credential_content_access_performed:bytes!==null,
        private_key_access_performed:bytes!==null,
      },
    );
  }finally{
    if(bytes) bytes.fill(0);
    privateKey="";
    if(fd>=0){
      try{fs.closeSync(fd);}catch{}
    }
  }
}

function validateCandidateForCredentialBindingV1(
  candidateInput,
  candidateEvidence,
  candidateValidator,
){
  if(typeof candidateValidator!=="function"){
    throw new Error("registry_deployer_candidate_validator_invalid");
  }
  const candidate=candidateValidator(candidateInput,candidateEvidence);
  if(
    !candidate||
    !CANDIDATE_ID.test(String(candidate.candidate_id||""))||
    candidate.status!==
      "UNSIGNED_SIGNABLE_TRANSACTION_CANDIDATE_READY_SIGNING_HOLD"||
    candidate.signing_authorized!==false||
    candidate.transaction?.from_address!==
      VOID_DATANET_REGISTRY_DEPLOYER_ADDRESS_V1||
    !HASH.test(String(candidate.transaction?.unsigned_transaction_hash||""))||
    !SHA256.test(String(candidate.transaction_fingerprint_sha256||""))
  ){
    throw new Error("registry_deployer_candidate_invalid");
  }
  return candidate;
}

export function buildVoidDatanetRegistryDeployerCredentialBindingV1(input){
  const selection=validateVoidDatanetRegistryDeployerSelectionV1(
    input?.deployer_selection,
  );
  const candidateValidator=
    input?.candidate_validator||
    validateVoidDatanetRegistryUnsignedTransactionCandidateV1;
  const candidate=validateCandidateForCredentialBindingV1(
    input?.unsigned_transaction_candidate,
    input?.candidate_evidence,
    candidateValidator,
  );

  const observation=input?.credential_observation;
  if(
    !observation||
    observation.ok!==true||
    observation.marker!==
      "VOID_DATANET_REGISTRY_DEPLOYER_CREDENTIAL_FILE_OBSERVATION_V1"||
    observation.version!==1||
    observation.status!=="credential_identity_observed_without_signer_object"||
    observation.credential_id!==
      VOID_DATANET_REGISTRY_DEPLOYER_CREDENTIAL_ID_V1||
    String(observation.derived_address||"").toLowerCase()!==
      VOID_DATANET_REGISTRY_DEPLOYER_ADDRESS_V1||
    observation.credential_source?.canonical_directory!==true||
    observation.credential_source?.directory_private_mode!==true||
    observation.credential_source?.regular_file!==true||
    observation.credential_source?.symbolic_link!==false||
    observation.credential_source?.single_hard_link!==true||
    observation.credential_source?.owner_current_user!==true||
    !["400","600"].includes(observation.credential_source?.mode)||
    !Number.isSafeInteger(observation.credential_source?.size_bytes)||
    observation.credential_source.size_bytes<=0||
    observation.credential_source.size_bytes>MAX_CREDENTIAL_BYTES||
    observation.credential_content_access_performed!==true||
    observation.private_key_access_performed!==true||
    observation.raw_private_key_output!==false||
    observation.private_key_digest_output!==false||
    observation.signer_object_exposed!==false||
    observation.transaction_signing_performed!==false
  ){
    throw new Error("registry_deployer_credential_observation_invalid");
  }

  const boundAt=timestamp(input?.bound_at_utc,"registry_deployer_bound_at");
  const candidateDeadline=timestamp(
    candidate.valid_until_utc,
    "registry_deployer_candidate_valid_until",
  );
  const boundMs=Date.parse(boundAt);
  const deadlineMs=Date.parse(candidateDeadline);
  if(boundMs>deadlineMs){
    throw new Error("registry_deployer_candidate_expired_for_binding");
  }

  const boundOnHost=String(input?.bound_on_host||"");
  const observedRepoHead=String(input?.observed_repo_head||"");
  if(boundOnHost!=="Nimo"||!SHA40.test(observedRepoHead)){
    throw new Error("registry_deployer_binding_host_or_repo_head_invalid");
  }

  const material={
    marker:VOID_DATANET_REGISTRY_DEPLOYER_CREDENTIAL_BINDING_V1,
    version:1,
    status:"DEPLOYER_CREDENTIAL_IDENTITY_BOUND_SIGNING_HOLD",
    bound_at_utc:boundAt,
    bound_on_host:boundOnHost,
    observed_repo_head:observedRepoHead,
    candidate_valid_until_utc:candidateDeadline,
    candidate_id:candidate.candidate_id,
    unsigned_transaction_hash:
      candidate.transaction.unsigned_transaction_hash,
    transaction_fingerprint_sha256:
      candidate.transaction_fingerprint_sha256,
    deployer_address:VOID_DATANET_REGISTRY_DEPLOYER_ADDRESS_V1,
    deployer_address_fingerprint_sha256:
      VOID_DATANET_REGISTRY_DEPLOYER_ADDRESS_FINGERPRINT_SHA256_V1,
    credential_id:VOID_DATANET_REGISTRY_DEPLOYER_CREDENTIAL_ID_V1,
    public_ceremony_id:
      VOID_DATANET_REGISTRY_DEPLOYER_CEREMONY_ID_V1,
    public_ceremony_receipt_sha256:
      VOID_DATANET_REGISTRY_DEPLOYER_CEREMONY_RECEIPT_SHA256_V1,
    credential_source:{
      mode:observation.credential_source.mode,
      size_bytes:observation.credential_source.size_bytes,
      canonical_directory:true,
      regular_file:true,
      single_hard_link:true,
      owner_current_user:true,
      private_path_not_recorded:true,
    },
    binding:{
      exact_candidate_deployer_match:true,
      credential_address_derived:true,
      derived_address_matches_selected_deployer:true,
      dedicated_deployer_selection_exact:true,
      candidate_still_unexpired_at_binding:true,
      identity_binding_only:true,
      prior_candidate_does_not_authorize_signing:true,
      rebind_immediately_before_signing_required:true,
    },
    authority:{
      identity_binding_only:true,
      credential_content_access_performed:true,
      private_key_access_performed:true,
      raw_private_key_output:false,
      private_key_digest_output:false,
      signer_object_exposed:false,
      rpc_call:false,
      wallet_access:false,
      deployer_funding:false,
      transaction_signing_authorized:false,
      transaction_signing_performed:false,
      transaction_submission_authorized:false,
      transaction_submission_performed:false,
      transaction_broadcast_authorized:false,
      transaction_broadcast_performed:false,
      deployment_authorized:false,
      chain2050_write_authorized:false,
      validator_mutation:false,
      token_movement:false,
      funds_movement:false,
      migration_authorized:false,
      public_activation_authorized:false,
      automatic_retry:false,
    },
    signing_authorized:false,
    next_gate:
      "fresh_read_only_candidate_revalidation_then_fresh_deployer_credential_rebinding_and_separate_exact_signing_authorization",
  };

  return Object.freeze({
    ...material,
    credential_binding_id:
      "voiddrcb1_"+sha256(Buffer.from(canonicalJson(material))),
  });
}

export function validateVoidDatanetRegistryDeployerCredentialBindingV1(
  binding,
  evidence,
){
  if(
    !binding||
    typeof binding!=="object"||
    Array.isArray(binding)||
    binding.marker!==VOID_DATANET_REGISTRY_DEPLOYER_CREDENTIAL_BINDING_V1||
    binding.version!==1||
    binding.status!=="DEPLOYER_CREDENTIAL_IDENTITY_BOUND_SIGNING_HOLD"||
    !BINDING_ID.test(String(binding.credential_binding_id||""))||
    binding.bound_on_host!=="Nimo"||
    !SHA40.test(String(binding.observed_repo_head||""))||
    binding.signing_authorized!==false||
    binding.next_gate!==
      "fresh_read_only_candidate_revalidation_then_fresh_deployer_credential_rebinding_and_separate_exact_signing_authorization"
  ){
    throw new Error("registry_deployer_credential_binding_invalid");
  }

  const material=structuredClone(binding);
  const id=material.credential_binding_id;
  delete material.credential_binding_id;
  const expectedId=
    "voiddrcb1_"+sha256(Buffer.from(canonicalJson(material)));
  if(id!==expectedId){
    throw new Error("registry_deployer_credential_binding_id_mismatch");
  }

  const expectedAuthority={
    identity_binding_only:true,
    credential_content_access_performed:true,
    private_key_access_performed:true,
    raw_private_key_output:false,
    private_key_digest_output:false,
    signer_object_exposed:false,
    rpc_call:false,
    wallet_access:false,
    deployer_funding:false,
    transaction_signing_authorized:false,
    transaction_signing_performed:false,
    transaction_submission_authorized:false,
    transaction_submission_performed:false,
    transaction_broadcast_authorized:false,
    transaction_broadcast_performed:false,
    deployment_authorized:false,
    chain2050_write_authorized:false,
    validator_mutation:false,
    token_movement:false,
    funds_movement:false,
    migration_authorized:false,
    public_activation_authorized:false,
    automatic_retry:false,
  };
  exactKeys(
    binding.authority,
    Object.keys(expectedAuthority),
    "registry_deployer_binding_authority",
  );
  for(const [key,value] of Object.entries(expectedAuthority)){
    if(binding.authority[key]!==value){
      throw new Error("registry_deployer_binding_authority_mismatch:"+key);
    }
  }

  const expectedBinding={
    exact_candidate_deployer_match:true,
    credential_address_derived:true,
    derived_address_matches_selected_deployer:true,
    dedicated_deployer_selection_exact:true,
    candidate_still_unexpired_at_binding:true,
    identity_binding_only:true,
    prior_candidate_does_not_authorize_signing:true,
    rebind_immediately_before_signing_required:true,
  };
  exactKeys(
    binding.binding,
    Object.keys(expectedBinding),
    "registry_deployer_binding_facts",
  );
  for(const [key,value] of Object.entries(expectedBinding)){
    if(binding.binding[key]!==value){
      throw new Error("registry_deployer_binding_fact_mismatch:"+key);
    }
  }

  const observation={
    ok:true,
    marker:"VOID_DATANET_REGISTRY_DEPLOYER_CREDENTIAL_FILE_OBSERVATION_V1",
    version:1,
    status:"credential_identity_observed_without_signer_object",
    credential_id:VOID_DATANET_REGISTRY_DEPLOYER_CREDENTIAL_ID_V1,
    derived_address:VOID_DATANET_REGISTRY_DEPLOYER_ADDRESS_V1,
    credential_source:{
      canonical_directory:true,
      directory_private_mode:true,
      regular_file:true,
      symbolic_link:false,
      single_hard_link:true,
      owner_current_user:true,
      mode:binding.credential_source?.mode,
      size_bytes:binding.credential_source?.size_bytes,
    },
    credential_content_access_performed:true,
    private_key_access_performed:true,
    raw_private_key_output:false,
    private_key_digest_output:false,
    signer_object_exposed:false,
    transaction_signing_performed:false,
  };

  let rebuilt;
  try{
    rebuilt=buildVoidDatanetRegistryDeployerCredentialBindingV1({
      deployer_selection:evidence?.deployer_selection,
      unsigned_transaction_candidate:evidence?.unsigned_transaction_candidate,
      candidate_evidence:evidence?.candidate_evidence,
      credential_observation:observation,
      bound_at_utc:binding.bound_at_utc,
      bound_on_host:binding.bound_on_host,
      observed_repo_head:binding.observed_repo_head,
    });
  }catch(error){
    throw new Error(
      "registry_deployer_credential_binding_evidence_rebuild_failed:"+
      String(error?.message||error).slice(0,160),
    );
  }
  if(canonicalJson(rebuilt)!==canonicalJson(binding)){
    throw new Error("registry_deployer_credential_binding_evidence_rebuild_mismatch");
  }
  return binding;
}

export async function runVoidDatanetRegistryDeployerCredentialBindingV1(
  input,
  dependencies={},
){
  if(
    input?.confirmation!==
      VOID_DATANET_REGISTRY_DEPLOYER_CREDENTIAL_BINDING_CONFIRMATION_V1
  ){
    return held(
      "registry_deployer_credential_binding_confirmation_required",
      {candidate_id:input?.unsigned_transaction_candidate?.candidate_id??null},
    );
  }

  const candidateValidator=
    dependencies.candidate_validator||
    validateVoidDatanetRegistryUnsignedTransactionCandidateV1;
  try{
    validateVoidDatanetRegistryDeployerSelectionV1(input?.deployer_selection);
    validateCandidateForCredentialBindingV1(
      input?.unsigned_transaction_candidate,
      input?.candidate_evidence,
      candidateValidator,
    );
  }catch{
    return held(
      "registry_deployer_public_binding_input_invalid",
      {candidate_id:input?.unsigned_transaction_candidate?.candidate_id??null},
    );
  }

  const observer=
    dependencies.credential_observer||
    observeVoidDatanetRegistryDeployerCredentialFileV1;
  if(typeof observer!=="function"){
    return held("registry_deployer_credential_observer_invalid");
  }

  let observation;
  try{
    observation=await observer({
      credentials_directory:input?.credentials_directory,
    });
  }catch{
    return held("registry_deployer_credential_observer_failed");
  }
  if(observation?.ok!==true){
    return observation;
  }

  try{
    const binding=buildVoidDatanetRegistryDeployerCredentialBindingV1({
      deployer_selection:input?.deployer_selection,
      unsigned_transaction_candidate:input?.unsigned_transaction_candidate,
      candidate_evidence:input?.candidate_evidence,
      candidate_validator:candidateValidator,
      credential_observation:observation,
      bound_at_utc:input?.bound_at_utc,
      bound_on_host:input?.bound_on_host,
      observed_repo_head:input?.observed_repo_head,
    });
    return Object.freeze({
      ok:true,
      binding,
      raw_private_key_output:false,
      private_key_digest_output:false,
      signer_object_exposed:false,
      signing_performed:false,
      transaction_submission_performed:false,
      transaction_broadcast_performed:false,
      chain2050_write_performed:false,
      funds_movement_performed:false,
    });
  }catch(error){
    return held(
      "registry_deployer_credential_binding_rejected",
      {
        candidate_id:input?.unsigned_transaction_candidate?.candidate_id??null,
        credential_content_access_performed:true,
        private_key_access_performed:true,
      },
    );
  }
}
