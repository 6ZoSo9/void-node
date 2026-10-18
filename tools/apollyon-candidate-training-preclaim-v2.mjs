#!/usr/bin/env node
import crypto from "node:crypto";
import {
  qualifyApollyonCustodyHostPolicyV2,
} from "./apollyon-custody-host-policy-qualification-v2.mjs";
import {
  qualifyApollyonDesignatedHostCustodyLivePairV2,
} from "./apollyon-designated-host-custody-live-qualification-v2.mjs";

export const VOID_APOLLYON_CANDIDATE_TRAINING_PRECLAIM_V2 =
  "VOID_APOLLYON_CANDIDATE_TRAINING_PRECLAIM_V2";

export const VOID_APOLLYON_CANDIDATE_TRAINING_PRECLAIM_AUTHORITY_V2 =
  Object.freeze({
    source_only_composition:true,
    current_v2_custody_required:true,
    installed_live_isolation_required:true,
    same_training_process_generation_required:true,
    historical_v84_v1_sufficient:false,
    live_service_source_identity_required:true,
    live_service_source_identity_proven:false,
    same_live_custody_session_binding_required:true,
    same_live_custody_session_binding_proven:false,
    durable_attempt_claim_required:true,
    durable_attempt_claim_performed:false,
    attempt_claim_authorized:false,
    attempt_claimed:false,
    training_execution_authorized:false,
    training_execution_performed:false,
    candidate_weight_mutation_performed:false,
    generation_execution_performed:false,
    filesystem_read:false,
    filesystem_write:false,
    network_access:false,
    service_action:false,
    credential_access:false,
    wallet_or_signer_access:false,
    transaction:false,
    funds_movement:false,
  });

const CURRENT_V2_POLICY_BLOB_SHA1 =
  "db5493a513a42780865e7194580eec3b770dc8e1";
const CURRENT_V2_LIVE_QUALIFIER_BLOB_SHA1 =
  "435e23d26fa32405e36d5dad17b033ea4ec910e0";
const INSTALLED_ISOLATION_QUALIFIER_BLOB_SHA1 =
  "1fdb495aafa136119d50f41410b015930d9fc90d";

const ISOLATION_MARKER =
  "VOID_APOLLYON_INSTALLED_TRAINING_BUS_ISOLATION_QUALIFICATION_V1";
const V2_EVIDENCE_MARKER =
  "VOID_APOLLYON_CUSTODY_HOST_POLICY_EVIDENCE_V2";
const HASH64=/^[0-9a-f]{64}$/u;
const QUAL_ID=/^apollyon_training_isolation_live_v1:[0-9a-f]{64}$/u;
const V2_LIVE_ID=/^apollyon_custody_live_v2:[0-9a-f]{64}$/u;

function fail(code){ throw new Error(code); }
function sha256(value){
  return crypto.createHash("sha256").update(value).digest("hex");
}
function canonicalize(value){
  if(value===null||typeof value==="string"||typeof value==="boolean")return value;
  if(typeof value==="number"){
    if(!Number.isSafeInteger(value))fail("apollyon_preclaim_v2_noncanonical_number");
    return value;
  }
  if(Array.isArray(value))return value.map(canonicalize);
  if(value&&typeof value==="object"){
    const out={};
    for(const key of Object.keys(value).sort())out[key]=canonicalize(value[key]);
    return out;
  }
  fail("apollyon_preclaim_v2_noncanonical_value");
}
export function canonicalApollyonPreclaimV2Json(value){
  return JSON.stringify(canonicalize(value));
}
function exactKeys(value,expected,code){
  if(!value||typeof value!=="object"||Array.isArray(value))fail(code);
  const actual=Object.keys(value).sort();
  const wanted=[...expected].sort();
  if(actual.length!==wanted.length||actual.some((key,index)=>key!==wanted[index]))fail(code);
}
function requireFalse(value,keys,code){
  for(const key of keys)if(value[key]!==false)fail(code);
}
function requireTrue(value,keys,code){
  for(const key of keys)if(value[key]!==true)fail(code);
}

export function validateApollyonInstalledIsolationReceiptV1(receipt){
  exactKeys(receipt,[
    "absolute_runtime_service_control_denial_proven","attempt_claim","authority",
    "candidate_weight_mutation","canonical_installed_qualification_complete",
    "inherited_system_bus_descriptor_absence_proven",
    "installed_preentry_binary_identity_proven",
    "installed_training_entrypoint_identity_proven","installed_unit_identity_proven",
    "live","live_systemd_enforcement_proven","marker","materials","next_gate",
    "qualification_id","service_action_performed","service_active_after_observation",
    "service_enabled","status","target_host","training_execution","version",
  ],"apollyon_preclaim_v2_isolation_receipt_invalid");
  if(
    receipt.marker!==ISOLATION_MARKER||receipt.version!==1||
    receipt.status!=="installed_training_bus_isolation_live_generation_observed"||
    receipt.target_host!=="Xiphos"||
    !QUAL_ID.test(receipt.qualification_id)||
    receipt.next_gate!=="apollyon_candidate_training_preclaim_v2"
  )fail("apollyon_preclaim_v2_isolation_receipt_invalid");
  requireTrue(receipt,[
    "installed_unit_identity_proven","installed_preentry_binary_identity_proven",
    "installed_training_entrypoint_identity_proven","live_systemd_enforcement_proven",
    "inherited_system_bus_descriptor_absence_proven",
    "absolute_runtime_service_control_denial_proven",
    "canonical_installed_qualification_complete","service_active_after_observation",
  ],"apollyon_preclaim_v2_isolation_receipt_invalid");
  requireFalse(receipt,[
    "service_action_performed","service_enabled","training_execution","attempt_claim",
    "candidate_weight_mutation",
  ],"apollyon_preclaim_v2_isolation_receipt_invalid");

  exactKeys(receipt.materials,[
    "entrypoint_bytes","entrypoint_sha256","preentry_bytes","preentry_sha256",
    "unit_git_blob_sha1",
  ],"apollyon_preclaim_v2_isolation_materials_invalid");
  if(
    receipt.materials.unit_git_blob_sha1!=="62fbabe1cf7ae0d940f5d96e19b06282f841267b"||
    receipt.materials.preentry_bytes!==17352||
    receipt.materials.preentry_sha256!=="6e2885ceddf83bc9bf4636768ce6f046ab357268b0959cfa71bcbb766909cb47"||
    receipt.materials.entrypoint_bytes!==17384||
    receipt.materials.entrypoint_sha256!=="7a1ec91b612998824e37aa0f8522a94d7ceffe9f4f21e0702fe0a0d5ca5bdd9a"
  )fail("apollyon_preclaim_v2_isolation_materials_invalid");

  exactKeys(receipt.live,[
    "boot_id_sha256","capability_sets_zero","entrypoint_path","gid_slots",
    "inherited_fds_ge_3_absent","mainpid","no_new_privileges",
    "process_start_time_ticks","systemd_cgroup_verified","uid_slots",
  ],"apollyon_preclaim_v2_live_generation_invalid");
  if(
    !Number.isSafeInteger(receipt.live.mainpid)||receipt.live.mainpid<=0||
    !Number.isSafeInteger(receipt.live.process_start_time_ticks)||
    receipt.live.process_start_time_ticks<=0||
    !HASH64.test(receipt.live.boot_id_sha256)||
    receipt.live.entrypoint_path!==
      "/opt/void-apollyon-training-v1/apollyon_candidate_training_entrypoint_v1"||
    !Array.isArray(receipt.live.uid_slots)||receipt.live.uid_slots.length!==4||
    !Array.isArray(receipt.live.gid_slots)||receipt.live.gid_slots.length!==4||
    receipt.live.no_new_privileges!==true||
    receipt.live.capability_sets_zero!==true||
    receipt.live.inherited_fds_ge_3_absent!==true||
    receipt.live.systemd_cgroup_verified!==true
  )fail("apollyon_preclaim_v2_live_generation_invalid");

  exactKeys(receipt.authority,[
    "attempt_claim","candidate_weight_mutation","credential_access",
    "exact_installed_entrypoint_required","exact_installed_preentry_required",
    "exact_installed_unit_required","existing_live_pid_observation_supported",
    "funds_movement","live_host_required","root_required","service_enable",
    "service_start_stop_required_for_standalone_live_qualify","training_execution",
    "transaction","wallet_or_signer_access",
  ],"apollyon_preclaim_v2_isolation_authority_invalid");
  requireTrue(receipt.authority,[
    "live_host_required","root_required","exact_installed_unit_required",
    "exact_installed_preentry_required","exact_installed_entrypoint_required",
    "service_start_stop_required_for_standalone_live_qualify",
    "existing_live_pid_observation_supported",
  ],"apollyon_preclaim_v2_isolation_authority_invalid");
  requireFalse(receipt.authority,[
    "service_enable","training_execution","attempt_claim","candidate_weight_mutation",
    "credential_access","wallet_or_signer_access","transaction","funds_movement",
  ],"apollyon_preclaim_v2_isolation_authority_invalid");

  const material=structuredClone(receipt);
  delete material.qualification_id;
  const expected="apollyon_training_isolation_live_v1:"+
    sha256(Buffer.from(canonicalApollyonPreclaimV2Json(material),"utf8"));
  if(expected!==receipt.qualification_id){
    fail("apollyon_preclaim_v2_isolation_receipt_id_invalid");
  }
  return Object.freeze(structuredClone(receipt));
}

function requireRawV2Boundary(evidence,receipt){
  if(
    !evidence||typeof evidence!=="object"||Array.isArray(evidence)||
    evidence.marker!==V2_EVIDENCE_MARKER||evidence.version!==2||
    evidence.target_host!=="Xiphos"||
    !evidence.service_control||!evidence.service||
    !evidence.identities||!evidence.evidence_snapshot
  )fail("apollyon_preclaim_v2_raw_v2_evidence_invalid");
  const control=evidence.service_control;
  if(
    control.inherited_system_bus_descriptor_absence_required!==true||
    control.inherited_system_bus_descriptor_absence_proven!==false||
    control.absolute_runtime_service_control_denial_proven!==false||
    control.runtime_can_control_service!==null||
    evidence.service.runtime_can_control_service!==null
  )fail("apollyon_preclaim_v2_raw_v2_boundary_not_unproven");
  if(
    control.training_pid!==receipt.live.mainpid||
    String(control.training_process_start_time_ticks)!==
      String(receipt.live.process_start_time_ticks)||
    evidence.evidence_snapshot.boot_id_sha256!==receipt.live.boot_id_sha256||
    control.training_uid!==evidence.identities.training_uid||
    receipt.live.uid_slots.some((uid)=>uid!==control.training_uid)||
    receipt.live.gid_slots.some((gid)=>gid!==evidence.identities.training_gid)
  )fail("apollyon_preclaim_v2_same_process_generation_mismatch");
}

export function augmentApollyonV2EvidenceWithIsolationV1(evidence,receipt){
  const accepted=validateApollyonInstalledIsolationReceiptV1(receipt);
  requireRawV2Boundary(evidence,accepted);
  const out=structuredClone(evidence);
  out.service_control.inherited_system_bus_descriptor_absence_proven=true;
  out.service_control.absolute_runtime_service_control_denial_proven=true;
  out.service_control.runtime_can_control_service=false;
  out.service.runtime_can_control_service=false;
  return out;
}

export function composeApollyonCandidateTrainingPreclaimV2(input){
  exactKeys(input,[
    "first_v2_evidence","installed_isolation_receipt","second_v2_evidence",
  ],"apollyon_preclaim_v2_input_invalid");
  const receipt=validateApollyonInstalledIsolationReceiptV1(
    input.installed_isolation_receipt,
  );
  const first=augmentApollyonV2EvidenceWithIsolationV1(
    input.first_v2_evidence,receipt,
  );
  const second=augmentApollyonV2EvidenceWithIsolationV1(
    input.second_v2_evidence,receipt,
  );
  const live=qualifyApollyonDesignatedHostCustodyLivePairV2(
    first,second,qualifyApollyonCustodyHostPolicyV2,
  );
  if(
    !live||live.status!==
      "live_host_namespace_custody_v2_qualified_source_identity_unproven"||
    !V2_LIVE_ID.test(live.live_qualification_id)||
    live.live_service_source_identity_proven!==false||
    live.same_live_custody_session_binding_proven!==false||
    live.attempt_claimed!==false||
    live.training_execution_performed!==false
  )fail("apollyon_preclaim_v2_current_v2_result_invalid");

  const material={
    marker:VOID_APOLLYON_CANDIDATE_TRAINING_PRECLAIM_V2,
    version:2,
    status:"current_v2_custody_composed_with_live_training_isolation",
    target_host:"Xiphos",
    current_v2_policy_blob_sha1:CURRENT_V2_POLICY_BLOB_SHA1,
    current_v2_live_qualifier_blob_sha1:CURRENT_V2_LIVE_QUALIFIER_BLOB_SHA1,
    installed_isolation_qualifier_blob_sha1:INSTALLED_ISOLATION_QUALIFIER_BLOB_SHA1,
    installed_isolation_qualification_id:receipt.qualification_id,
    current_v2_live_qualification_id:live.live_qualification_id,
    training_pid:receipt.live.mainpid,
    training_process_start_time_ticks:String(receipt.live.process_start_time_ticks),
    boot_id_sha256:receipt.live.boot_id_sha256,
    same_training_process_generation_bound:true,
    descriptor_absence_composed_into_v2:true,
    absolute_service_control_denial_composed_into_v2:true,
    historical_v84_v1_sufficient:false,
    live_service_source_identity_required:true,
    live_service_source_identity_proven:false,
    same_live_custody_session_binding_required:true,
    same_live_custody_session_binding_proven:false,
    durable_attempt_claim_required:true,
    durable_attempt_claim_performed:false,
    attempt_claim_authorized:false,
    attempt_claimed:false,
    training_execution_authorized:false,
    training_execution_performed:false,
    candidate_weight_mutation_performed:false,
    generation_execution_performed:false,
    next_gate:"live_custody_service_source_identity_binding_v2",
    authority:VOID_APOLLYON_CANDIDATE_TRAINING_PRECLAIM_AUTHORITY_V2,
  };
  return Object.freeze({
    ...material,
    preclaim_id:"apollyon_preclaim_v2:"+
      sha256(Buffer.from(canonicalApollyonPreclaimV2Json(material),"utf8")),
  });
}
