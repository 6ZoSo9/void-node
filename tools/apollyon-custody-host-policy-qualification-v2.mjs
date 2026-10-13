#!/usr/bin/env node
import crypto from "node:crypto";
import {
  VOID_APOLLYON_CUSTODY_HOST_POLICY_AUTHORITY_V1,
  VOID_APOLLYON_CUSTODY_HOST_POLICY_EVIDENCE_V1,
  canonicalApollyonCustodyHostPolicyJsonV1,
  qualifyApollyonCustodyHostPolicyV1,
} from "./apollyon-custody-host-policy-qualification-v1.mjs";

export const VOID_APOLLYON_CUSTODY_HOST_POLICY_QUALIFICATION_V2 =
  "VOID_APOLLYON_CUSTODY_HOST_POLICY_QUALIFICATION_V2";
export const VOID_APOLLYON_CUSTODY_HOST_POLICY_EVIDENCE_V2 =
  "VOID_APOLLYON_CUSTODY_HOST_POLICY_EVIDENCE_V2";
export const VOID_APOLLYON_CUSTODY_HOST_POLICY_AUTHORITY_V2 = Object.freeze({
  ...VOID_APOLLYON_CUSTODY_HOST_POLICY_AUTHORITY_V1,
  historical_v1_classifier_reused:true,
  socket_parent_retained_ancestor_binding:true,
  socket_parent_training_rename_unlink_denied_required:true,
});
const MAX_ANCESTORS=128;
function fail(code){throw new Error(code);}
function exactKeys(value,expected,code){
  if(!value||typeof value!=="object"||Array.isArray(value))fail(code);
  const actual=Object.keys(value).sort();
  const wanted=[...expected].sort();
  if(actual.length!==wanted.length||actual.some((key,index)=>key!==wanted[index]))fail(code);
}
function normalizeSocketParentV2(value){
  const code="apollyon_custody_policy_v2_socket_parent_invalid";
  exactKeys(value,[
    "custody_uid_write_allowed","direct","mode","owner_gid","owner_uid",
    "retained_ancestor_count","retained_ancestors_direct",
    "retained_ancestors_group_other_writable","retained_ancestors_root_owned",
    "retained_ancestors_symlink_free","symlink",
    "training_uid_rename_unlink_denied","training_uid_traverse_allowed",
    "training_uid_write_denied",
  ],code);
  if(!Number.isSafeInteger(value.retained_ancestor_count)||
     value.retained_ancestor_count<2||value.retained_ancestor_count>MAX_ANCESTORS||
     value.retained_ancestors_root_owned!==true||
     value.retained_ancestors_direct!==true||
     value.retained_ancestors_symlink_free!==true||
     value.retained_ancestors_group_other_writable!==false||
     value.training_uid_rename_unlink_denied!==true){
    fail(code);
  }
  return Object.freeze({...value});
}
function historicalV1Input(input,sp){
  return Object.freeze({
    consumed_directory:input.consumed_directory,
    evidence_snapshot:input.evidence_snapshot,
    identities:input.identities,
    marker:VOID_APOLLYON_CUSTODY_HOST_POLICY_EVIDENCE_V1,
    service:input.service,
    socket:input.socket,
    socket_parent:Object.freeze({
      custody_uid_write_allowed:sp.custody_uid_write_allowed,
      direct:sp.direct,mode:sp.mode,owner_gid:sp.owner_gid,owner_uid:sp.owner_uid,
      symlink:sp.symlink,
      training_uid_traverse_allowed:sp.training_uid_traverse_allowed,
      training_uid_write_denied:sp.training_uid_write_denied,
    }),
    source_binding:input.source_binding,
    state_root:input.state_root,
    target_host:input.target_host,
    verification_now_ms:input.verification_now_ms,
    version:1,
  });
}
export function qualifyApollyonCustodyHostPolicyV2(input){
  exactKeys(input,[
    "consumed_directory","evidence_snapshot","identities","marker","service",
    "socket","socket_parent","source_binding","state_root","target_host",
    "verification_now_ms","version",
  ],"apollyon_custody_policy_v2_input_invalid");
  if(input.marker!==VOID_APOLLYON_CUSTODY_HOST_POLICY_EVIDENCE_V2||
     input.version!==2||input.target_host!=="Xiphos"){
    fail("apollyon_custody_policy_v2_input_invalid");
  }
  const socketParent=normalizeSocketParentV2(input.socket_parent);
  const v1=qualifyApollyonCustodyHostPolicyV1(historicalV1Input(input,socketParent));
  if(v1.ok!==true||v1.status!=="source_policy_qualified"){
    fail("apollyon_custody_policy_v2_historical_v1_reuse_failed");
  }
  const normalized=Object.freeze({...input,socket_parent:socketParent});
  const qualificationId="apollyon_custody_policy_v2:"+
    crypto.createHash("sha256")
      .update(canonicalApollyonCustodyHostPolicyJsonV1(normalized)).digest("hex");
  return Object.freeze({
    ok:true,marker:VOID_APOLLYON_CUSTODY_HOST_POLICY_QUALIFICATION_V2,
    version:2,status:"source_policy_qualified",qualification_id:qualificationId,
    historical_v1_qualification_id:v1.qualification_id,target_host:"Xiphos",
    source_binding_verified:true,historical_v1_classifier_reused:true,
    evidence_freshness_checked:true,identity_separation_qualified:true,
    state_root_policy_qualified:true,consumed_directory_policy_qualified:true,
    socket_parent_policy_qualified:true,
    socket_parent_retained_ancestor_policy_qualified:true,
    socket_parent_training_rename_unlink_policy_qualified:true,
    socket_policy_qualified:true,service_hardening_policy_qualified:true,
    custody_uid_process_exclusivity_evidence_qualified:true,
    verification_clock_authority_proven:false,
    evidence_generation_monotonicity_proven:false,
    live_host_qualification_performed:false,independent_custody_proven:false,
    production_gate_ready:false,attempt_claimed:false,
    training_execution_performed:false,wallet_access_performed:false,
    funds_movement_performed:false,
    next_gate:"designated_host_read_only_custody_evidence_collection_v2",
    authority:VOID_APOLLYON_CUSTODY_HOST_POLICY_AUTHORITY_V2,
  });
}
