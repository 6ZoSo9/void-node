#!/usr/bin/env node
import crypto from "node:crypto";
import path from "node:path";

import {
  EXPECTED_FULFILLER,
  EXPECTED_CREDENTIAL_ID,
  classifyEpoch2InstalledCredentialPublicEvidenceV1,
  testOnlyClassifyEpoch2InstalledCredentialPublicEvidenceV1,
} from "./void-buy-void-epoch2-installed-credential-public-evidence-v1.mjs";

export const MARKER =
  "VOID_BUY_VOID_EPOCH2_AUTHENTICATED_CREDENTIAL_PUBLIC_EVIDENCE_V2";
export const STATUS =
  "AUTHENTICATED_CREDENTIAL_PUBLIC_EVIDENCE_V2_SOURCE_COMPOSITION_ONLY";
export const EXPECTED_CREDENTIAL_LOCK_ID =
  "voidbuyumqcredelflock1_65a1839c14b692349dda8cccdbe8657a9485754c5d10ffa5b57421ce87e3753c";
export const EXPECTED_QUALIFIER_MARKER =
  "VOID_BUY_VOID_USER_MANAGER_CREDENTIAL_QUERY_INSTALLED_QUALIFICATION_V1";
export const EXPECTED_QUALIFIER_NEXT_ACTION =
  "BIND_AUTHENTICATED_CREDENTIAL_METADATA_IN_EPOCH2_ATTESTATION_SUCCESSOR";
export const NEXT_ACTION =
  "BUILD_ROOT_LIVE_COMPOSITION_RUNNER_V1";

const SHA256_TAG=/^sha256:[0-9a-f]{64}$/u;
const HEX16=/^[0-9a-f]{16}$/u;
const SAFE_UINT=/^[1-9][0-9]*$/u;
const COMPOSITE_ID=/^voide2authv2_[0-9a-f]{64}$/u;

const QUALIFICATION_KEYS=Object.freeze([
  "marker","version","read_only","root_execution_required",
  "credential_lock_id","credential_installed_pair_verified",
  "credential_installed_generation_stable",
  "credential_query_preexec_path_verified",
  "double_credential_query_stable",
  "credential_metadata_same_generation_as_v6_security",
  "v6_security_qualification_composed","credential_contents_read",
  "native_output_sha256_first","native_output_sha256_second",
  "runtime_uid","manager_pid","manager_start_ticks","main_pid",
  "service_start_ticks","fragment_path","dropin_path_count",
  "credential_dropin_path","credential_source",
  "dropin_paths_canonical_bytes","load_credential_count",
  "load_credential_id","v6_kernel_cap_last_cap",
  "v6_kernel_supported_capability_mask",
  "v6_capability_bounding_set","v6_kernel_cap_bnd",
  "query_execution","host_mutation","filesystem_write",
  "service_mutation","systemd_mutation","external_network_calls",
  "private_key_access","wallet_or_signer_access",
  "request_or_payment_contents_read","payment_acceptance",
  "public_presale_activation","transaction","funds_movement",
  "production_host_evidence_authority","next_action",
]);

function sha256(bytes){
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function exactObject(value,keys){
  if(!value||typeof value!=="object"||Array.isArray(value)||
     Object.getPrototypeOf(value)!==Object.prototype)return false;
  const got=Object.keys(value).sort();
  const want=[...keys].sort();
  return got.length===want.length&&got.every((key,index)=>key===want[index]);
}

function positiveInt(value){
  const raw=String(value??"");
  if(!SAFE_UINT.test(raw))return null;
  const n=Number(raw);
  return Number.isSafeInteger(n)&&n>0?n:null;
}

function canonicalAbsolute(value){
  if(typeof value!=="string"||value.length<2||value.length>=4096||
     !value.startsWith("/")||value.includes("\0")||
     value.includes("\n")||value.includes("\r"))return null;
  if(path.posix.normalize(value)!==value||value.includes("//"))return null;
  const parts=value.slice(1).split("/");
  if(parts.some((part)=>part===""||part==="."||part===".."))return null;
  return value;
}

function hold(reason){
  return Object.freeze({
    ok:false,
    status:"HOLD",
    reason,
    composite_evidence_id:null,
    authenticated_private_manager_fields_crosschecked:false,
    qualification_provenance_authenticated:false,
    main_pid_crosscheck:false,
    loadcredential_binding_crosscheck:false,
    service_cgroup_hash_crosscheck:false,
    public_user_bus_sufficient_authority:false,
    production_runtime_authority:false,
    live_payment_signing_authorized:false,
    transaction_sign_or_broadcast_authorized:false,
    public_presale_activation_authorized:false,
    wc_void_market_activation_authorized:false,
    funds_movement_authorized:false,
    next_action:NEXT_ACTION,
  });
}

function validateQualification(q){
  if(!exactObject(q,QUALIFICATION_KEYS))return "qualification_shape_invalid";
  if(q.marker!==EXPECTED_QUALIFIER_MARKER||q.version!==1){
    return "qualification_header_invalid";
  }
  for(const key of [
    "read_only","root_execution_required",
    "credential_installed_pair_verified",
    "credential_installed_generation_stable",
    "credential_query_preexec_path_verified",
    "double_credential_query_stable",
    "credential_metadata_same_generation_as_v6_security",
    "v6_security_qualification_composed","query_execution",
  ]){
    if(q[key]!==true)return "qualification_truth_invalid:"+key;
  }
  for(const key of [
    "credential_contents_read","host_mutation","filesystem_write",
    "service_mutation","systemd_mutation","external_network_calls",
    "private_key_access","wallet_or_signer_access",
    "request_or_payment_contents_read","payment_acceptance",
    "public_presale_activation","transaction","funds_movement",
    "production_host_evidence_authority",
  ]){
    if(q[key]!==false)return "qualification_non_authority_invalid:"+key;
  }
  if(q.credential_lock_id!==EXPECTED_CREDENTIAL_LOCK_ID){
    return "credential_lock_id_invalid";
  }
  if(q.load_credential_id!==EXPECTED_CREDENTIAL_ID||
     q.load_credential_count!==1){
    return "credential_identity_invalid";
  }
  if(q.next_action!==EXPECTED_QUALIFIER_NEXT_ACTION){
    return "qualification_next_action_invalid";
  }
  if(!SHA256_TAG.test(String(q.native_output_sha256_first||""))||
     !SHA256_TAG.test(String(q.native_output_sha256_second||""))||
     q.native_output_sha256_first!==q.native_output_sha256_second){
    return "credential_native_evidence_not_stable";
  }
  for(const key of [
    "runtime_uid","manager_pid","manager_start_ticks",
    "main_pid","service_start_ticks",
  ]){
    if(positiveInt(q[key])===null)return "qualification_integer_invalid:"+key;
  }
  for(const key of ["dropin_path_count","dropin_paths_canonical_bytes"]){
    if(!Number.isSafeInteger(q[key])||q[key]<0){
      return "qualification_integer_invalid:"+key;
    }
  }
  if(q.dropin_path_count>32||q.dropin_paths_canonical_bytes>16*1024){
    return "qualification_bounds_invalid";
  }
  if(canonicalAbsolute(q.fragment_path)===null||
     canonicalAbsolute(q.credential_dropin_path)===null||
     canonicalAbsolute(q.credential_source)===null){
    return "qualification_path_invalid";
  }
  if(path.posix.basename(q.credential_dropin_path)!==
     "97-buy-void-epoch2-fulfiller-credential-v1.conf"){
    return "credential_dropin_invalid";
  }
  if(!Number.isSafeInteger(q.v6_kernel_cap_last_cap)||
     q.v6_kernel_cap_last_cap<0||q.v6_kernel_cap_last_cap>63){
    return "kernel_cap_last_cap_invalid";
  }
  for(const key of [
    "v6_kernel_supported_capability_mask",
    "v6_capability_bounding_set","v6_kernel_cap_bnd",
  ]){
    if(!HEX16.test(String(q[key]||""))){
      return "qualification_capability_mask_invalid:"+key;
    }
  }
  if(q.v6_capability_bounding_set!==q.v6_kernel_cap_bnd){
    return "qualification_bounding_set_mismatch";
  }
  return null;
}

function expectedServiceCgroupLine(runtimeUid){
  return "0::/user.slice/user-"+String(runtimeUid)+
    ".slice/user@"+String(runtimeUid)+
    ".service/app.slice/void-node-live.service\n";
}

function classify(record,qualification,expectedFulfiller){
  const base=expectedFulfiller===EXPECTED_FULFILLER
    ? classifyEpoch2InstalledCredentialPublicEvidenceV1(record)
    : testOnlyClassifyEpoch2InstalledCredentialPublicEvidenceV1(
        record,expectedFulfiller
      );
  if(!base.ok)return hold("sealed_public_evidence_invalid:"+base.reason);

  const qualificationError=validateQualification(qualification);
  if(qualificationError!==null)return hold(qualificationError);

  if(record.credential_id!==qualification.load_credential_id){
    return hold("credential_id_crosscheck_failed");
  }
  if(record.systemd.main_pid!==qualification.main_pid){
    return hold("main_pid_crosscheck_failed");
  }

  const binding=qualification.load_credential_id+":"+qualification.credential_source;
  if(sha256(Buffer.from(binding,"utf8"))!==
     record.systemd.loadcredential_binding_sha256){
    return hold("loadcredential_binding_crosscheck_failed");
  }

  const cgroupLine=expectedServiceCgroupLine(qualification.runtime_uid);
  if(sha256(Buffer.from(cgroupLine,"utf8"))!==
     record.systemd.main_pid_cgroup_sha256){
    return hold("service_cgroup_hash_crosscheck_failed");
  }

  const body={
    marker:MARKER,
    version:2,
    sealed_evidence_id:record.evidence_id,
    credential_lock_id:qualification.credential_lock_id,
    credential_native_output_sha256:qualification.native_output_sha256_first,
    runtime_uid:qualification.runtime_uid,
    manager_pid:qualification.manager_pid,
    manager_start_ticks:String(qualification.manager_start_ticks),
    main_pid:qualification.main_pid,
    service_start_ticks:String(qualification.service_start_ticks),
    source_head:record.source_head,
    source_tree:record.source_tree,
    signer_address:base.signer_address,
    authenticated_private_manager_fields_crosschecked:true,
    qualification_provenance_authenticated:false,
    main_pid_crosscheck:true,
    loadcredential_binding_crosscheck:true,
    service_cgroup_hash_crosscheck:true,
    public_user_bus_sufficient_authority:false,
    production_runtime_authority:false,
    credentials_directory_process_metadata_signature_bound:true,
    active_signing_capability_cryptographically_verified:true,
    runtime_source_binding_signature_bound:true,
    live_payment_signing_authorized:false,
    transaction_sign_or_broadcast_authorized:false,
    public_presale_activation_authorized:false,
    wc_void_market_activation_authorized:false,
    funds_movement_authorized:false,
  };
  const compositeEvidenceId=
    "voide2authv2_"+sha256(Buffer.from(JSON.stringify(body),"utf8"));

  return Object.freeze({
    ok:true,
    status:STATUS,
    reason:null,
    composite_evidence_id:compositeEvidenceId,
    sealed_evidence_id:record.evidence_id,
    source_head:record.source_head,
    source_tree:record.source_tree,
    signer_address:base.signer_address,
    credential_lock_id:qualification.credential_lock_id,
    authenticated_private_manager_fields_crosschecked:true,
    qualification_provenance_authenticated:false,
    main_pid_crosscheck:true,
    loadcredential_binding_crosscheck:true,
    service_cgroup_hash_crosscheck:true,
    public_user_bus_sufficient_authority:false,
    production_runtime_authority:false,
    credentials_directory_process_metadata_signature_bound:true,
    active_signing_capability_cryptographically_verified:true,
    runtime_source_binding_signature_bound:true,
    live_payment_signing_authorized:false,
    transaction_sign_or_broadcast_authorized:false,
    public_presale_activation_authorized:false,
    wc_void_market_activation_authorized:false,
    funds_movement_authorized:false,
    next_action:NEXT_ACTION,
  });
}

export function classifyEpoch2AuthenticatedCredentialPublicEvidenceV2(
  record,qualification
){
  return classify(record,qualification,EXPECTED_FULFILLER);
}

export function testOnlyClassifyEpoch2AuthenticatedCredentialPublicEvidenceV2(
  record,qualification,expectedFulfiller
){
  return classify(record,qualification,String(expectedFulfiller||"").toLowerCase());
}

export function isCompositeEvidenceIdV2(value){
  return COMPOSITE_ID.test(String(value||""));
}
