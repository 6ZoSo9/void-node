#!/usr/bin/env node

import crypto from "node:crypto";

export const VOID_APOLLYON_CUSTODY_HOST_POLICY_QUALIFICATION_V2 =
  "VOID_APOLLYON_CUSTODY_HOST_POLICY_QUALIFICATION_V2";
export const VOID_APOLLYON_CUSTODY_HOST_POLICY_EVIDENCE_V2 =
  "VOID_APOLLYON_CUSTODY_HOST_POLICY_EVIDENCE_V2";

export const VOID_APOLLYON_CUSTODY_REVIEWED_SOURCE_V2 = Object.freeze({
  custody_core_blob_sha1:"f9f18db5bbfeea466202ef0d7babe08c3c401d66",
  custody_service_blob_sha1:"8961572ba5834371b1229f790a1960940fc74935",
  custody_client_blob_sha1:"fb31dbbda76c94f0ad08e38094c151a24a78b486",
});

export const VOID_APOLLYON_CUSTODY_HOST_POLICY_AUTHORITY_V2 =
  Object.freeze({
    source_only_classifier:true,
    host_io:false,
    filesystem_read:false,
    filesystem_write:false,
    process_execution:false,
    systemd_action:false,
    user_group_mutation:false,
    ownership_permission_mutation:false,
    service_installation:false,
    service_start_stop:false,
    network_access:false,
    operator_private_key_access:false,
    production_signing:false,
    attempt_claim:false,
    training_execution:false,
    candidate_weight_mutation:false,
    generation_execution:false,
    wallet_access:false,
    transaction_signing:false,
    transaction_broadcast:false,
    funds_movement:false,
    verification_clock_authority_proven:false,
    evidence_generation_monotonicity_proven:false,
    live_host_qualification_performed:false,
    independent_custody_proven:false,
    production_gate_ready:false,
  });

const SHA1=/^[0-9a-f]{40}$/u;
const SHA256=/^[0-9a-f]{64}$/u;
const MAX_UID_GID=0x7fff_ffff;
const MAX_EVIDENCE_TTL_MS=5*60*1000;

function fail(code){
  throw new Error(code);
}

function exactKeys(value,expected,code){
  if(!value||typeof value!=="object"||Array.isArray(value))fail(code);
  const actual=Object.keys(value).sort();
  const wanted=[...expected].sort();
  if(
    actual.length!==wanted.length||
    actual.some((key,index)=>key!==wanted[index])
  ){
    fail(code);
  }
}

function int(value,min,max,code){
  if(!Number.isSafeInteger(value)||value<min||value>max)fail(code);
  return value;
}

function bool(value,expected,code){
  if(value!==expected)fail(code);
}

function string(value,expected,code){
  if(value!==expected)fail(code);
}

function sortedUniqueIntArray(value,code){
  if(!Array.isArray(value))fail(code);
  const out=value.map((item)=>int(item,1,MAX_UID_GID,code));
  for(let i=1;i<out.length;i+=1){
    if(out[i-1]>=out[i])fail(code);
  }
  return Object.freeze(out);
}

function canonicalize(value){
  if(value===null||typeof value==="string"||typeof value==="boolean")return value;
  if(typeof value==="number"){
    if(!Number.isSafeInteger(value))fail("apollyon_custody_policy_noncanonical_number");
    return value;
  }
  if(Array.isArray(value))return value.map(canonicalize);
  if(value&&typeof value==="object"){
    return Object.fromEntries(
      Object.keys(value).sort().map((key)=>[key,canonicalize(value[key])]),
    );
  }
  fail("apollyon_custody_policy_noncanonical_value");
}

export function canonicalApollyonCustodyHostPolicyJsonV2(value){
  return JSON.stringify(canonicalize(value));
}

function sha256(value){
  return crypto.createHash("sha256").update(value).digest("hex");
}

function normalizeEvidenceSnapshot(value,verificationNowMs){
  exactKeys(
    value,
    [
      "boot_id_sha256",
      "evidence_generation",
      "expires_at_ms",
      "observed_at_ms",
    ],
    "apollyon_custody_policy_evidence_snapshot_invalid",
  );
  const observed=int(
    value.observed_at_ms,
    1,
    Number.MAX_SAFE_INTEGER,
    "apollyon_custody_policy_evidence_snapshot_invalid",
  );
  const expires=int(
    value.expires_at_ms,
    1,
    Number.MAX_SAFE_INTEGER,
    "apollyon_custody_policy_evidence_snapshot_invalid",
  );
  int(
    value.evidence_generation,
    1,
    Number.MAX_SAFE_INTEGER,
    "apollyon_custody_policy_evidence_snapshot_invalid",
  );
  if(typeof value.boot_id_sha256!=="string"||!SHA256.test(value.boot_id_sha256)){
    fail("apollyon_custody_policy_evidence_snapshot_invalid");
  }
  if(
    observed>verificationNowMs||
    expires<=verificationNowMs||
    expires<=observed||
    expires-observed>MAX_EVIDENCE_TTL_MS
  ){
    fail("apollyon_custody_policy_evidence_freshness_invalid");
  }
  return Object.freeze({...value});
}

function normalizeSourceBinding(value){
  exactKeys(
    value,
    [
      "custody_client_blob_sha1",
      "custody_core_blob_sha1",
      "custody_service_blob_sha1",
    ],
    "apollyon_custody_policy_source_binding_invalid",
  );
  for(const key of Object.keys(VOID_APOLLYON_CUSTODY_REVIEWED_SOURCE_V2)){
    if(
      typeof value[key]!=="string"||
      !SHA1.test(value[key])||
      value[key]!==VOID_APOLLYON_CUSTODY_REVIEWED_SOURCE_V2[key]
    ){
      fail("apollyon_custody_policy_source_binding_invalid");
    }
  }
  return Object.freeze({...value});
}

function normalizeIdentities(value){
  exactKeys(
    value,
    [
      "custody_gid",
      "custody_supplementary_gids",
      "custody_uid",
      "ipc_gid",
      "training_gid",
      "training_supplementary_gids",
      "training_uid",
    ],
    "apollyon_custody_policy_identities_invalid",
  );
  const trainingUid=int(
    value.training_uid,1,MAX_UID_GID,
    "apollyon_custody_policy_identities_invalid",
  );
  const trainingGid=int(
    value.training_gid,1,MAX_UID_GID,
    "apollyon_custody_policy_identities_invalid",
  );
  const custodyUid=int(
    value.custody_uid,1,MAX_UID_GID,
    "apollyon_custody_policy_identities_invalid",
  );
  const custodyGid=int(
    value.custody_gid,1,MAX_UID_GID,
    "apollyon_custody_policy_identities_invalid",
  );
  const ipcGid=int(
    value.ipc_gid,1,MAX_UID_GID,
    "apollyon_custody_policy_identities_invalid",
  );
  const trainingGroups=sortedUniqueIntArray(
    value.training_supplementary_gids,
    "apollyon_custody_policy_identities_invalid",
  );
  const custodyGroups=sortedUniqueIntArray(
    value.custody_supplementary_gids,
    "apollyon_custody_policy_identities_invalid",
  );

  if(
    trainingUid===custodyUid||
    trainingGid===custodyGid||
    ipcGid===trainingGid||
    ipcGid===custodyGid||
    !trainingGroups.includes(ipcGid)||
    !custodyGroups.includes(ipcGid)||
    trainingGroups.includes(custodyGid)||
    custodyGroups.includes(trainingGid)
  ){
    fail("apollyon_custody_policy_identity_separation_invalid");
  }

  return Object.freeze({
    training_uid:trainingUid,
    training_gid:trainingGid,
    custody_uid:custodyUid,
    custody_gid:custodyGid,
    ipc_gid:ipcGid,
    training_supplementary_gids:trainingGroups,
    custody_supplementary_gids:custodyGroups,
  });
}

function normalizeStateRoot(value,identities){
  exactKeys(
    value,
    [
      "direct",
      "mode",
      "owner_gid",
      "owner_uid",
      "realpath_canonical",
      "retained_ancestor_count",
      "retained_ancestors_direct",
      "retained_ancestors_group_other_writable",
      "retained_ancestors_root_owned",
      "retained_ancestors_symlink_free",
      "symlink",
      "training_uid_rename_unlink_denied",
      "training_uid_write_denied",
    ],
    "apollyon_custody_policy_state_root_invalid",
  );
  if(
    value.owner_uid!==identities.custody_uid||
    value.owner_gid!==identities.custody_gid||
    value.mode!=="0700"||
    value.direct!==true||
    value.symlink!==false||
    value.realpath_canonical!==true||
    !Number.isSafeInteger(value.retained_ancestor_count)||
    value.retained_ancestor_count<2||
    value.retained_ancestors_root_owned!==true||
    value.retained_ancestors_direct!==true||
    value.retained_ancestors_symlink_free!==true||
    value.retained_ancestors_group_other_writable!==false||
    value.training_uid_write_denied!==true||
    value.training_uid_rename_unlink_denied!==true
  ){
    fail("apollyon_custody_policy_state_root_invalid");
  }
  return Object.freeze({...value});
}

function normalizeConsumedDirectory(value,identities){
  exactKeys(
    value,
    [
      "direct",
      "mode",
      "owner_gid",
      "owner_uid",
      "parent_bound_to_state_root",
      "symlink",
      "training_uid_rename_unlink_denied",
      "training_uid_write_denied",
    ],
    "apollyon_custody_policy_consumed_directory_invalid",
  );
  if(
    value.owner_uid!==identities.custody_uid||
    value.owner_gid!==identities.custody_gid||
    value.mode!=="0700"||
    value.direct!==true||
    value.symlink!==false||
    value.parent_bound_to_state_root!==true||
    value.training_uid_write_denied!==true||
    value.training_uid_rename_unlink_denied!==true
  ){
    fail("apollyon_custody_policy_consumed_directory_invalid");
  }
  return Object.freeze({...value});
}

function normalizeSocketParent(value,identities){
  exactKeys(
    value,
    [
      "custody_uid_write_allowed",
      "direct",
      "mode",
      "owner_gid",
      "owner_uid",
      "retained_ancestor_count",
      "retained_ancestors_direct",
      "retained_ancestors_group_other_writable",
      "retained_ancestors_root_owned",
      "retained_ancestors_symlink_free",
      "symlink",
      "training_uid_rename_unlink_denied",
      "training_uid_traverse_allowed",
      "training_uid_write_denied",
    ],
    "apollyon_custody_policy_socket_parent_invalid",
  );
  if(
    value.owner_uid!==identities.custody_uid||
    value.owner_gid!==identities.ipc_gid||
    value.mode!=="0750"||
    value.direct!==true||
    value.symlink!==false||
    !Number.isSafeInteger(value.retained_ancestor_count)||
    value.retained_ancestor_count<2||
    value.retained_ancestors_root_owned!==true||
    value.retained_ancestors_direct!==true||
    value.retained_ancestors_symlink_free!==true||
    value.retained_ancestors_group_other_writable!==false||
    value.custody_uid_write_allowed!==true||
    value.training_uid_traverse_allowed!==true||
    value.training_uid_write_denied!==true||
    value.training_uid_rename_unlink_denied!==true
  ){
    fail("apollyon_custody_policy_socket_parent_invalid");
  }
  return Object.freeze({...value});
}

function normalizeSocket(value,identities){
  exactKeys(
    value,
    [
      "custody_uid_connect_allowed",
      "mode",
      "owner_gid",
      "owner_uid",
      "training_uid_connect_allowed",
      "type",
    ],
    "apollyon_custody_policy_socket_invalid",
  );
  if(
    value.owner_uid!==identities.custody_uid||
    value.owner_gid!==identities.ipc_gid||
    value.mode!=="0660"||
    value.type!=="AF_UNIX_socket"||
    value.training_uid_connect_allowed!==true||
    value.custody_uid_connect_allowed!==true
  ){
    fail("apollyon_custody_policy_socket_invalid");
  }
  return Object.freeze({...value});
}

function normalizeService(value,identities){
  exactKeys(
    value,
    [
      "ambient_capabilities",
      "capability_bounding_set",
      "custody_uid_only_reviewed_service",
      "group_gid",
      "lock_personality",
      "manager",
      "no_new_privileges",
      "private_devices",
      "private_tmp",
      "protect_control_groups",
      "protect_home",
      "protect_kernel_logs",
      "protect_kernel_modules",
      "protect_kernel_tunables",
      "protect_system",
      "read_write_targets",
      "restrict_address_families",
      "restrict_realtime",
      "restrict_suid_sgid",
      "runtime_can_control_service",
      "supplementary_gids",
      "umask",
      "user_uid",
    ],
    "apollyon_custody_policy_service_invalid",
  );
  const supplementary=sortedUniqueIntArray(
    value.supplementary_gids,
    "apollyon_custody_policy_service_invalid",
  );
  if(
    value.manager!=="system"||
    value.user_uid!==identities.custody_uid||
    value.group_gid!==identities.custody_gid||
    value.umask!=="0077"||
    value.no_new_privileges!==true||
    value.private_tmp!==true||
    value.private_devices!==true||
    value.protect_system!=="strict"||
    value.protect_home!==true||
    value.protect_kernel_tunables!==true||
    value.protect_kernel_modules!==true||
    value.protect_kernel_logs!==true||
    value.protect_control_groups!==true||
    value.lock_personality!==true||
    value.restrict_suid_sgid!==true||
    value.restrict_realtime!==true||
    !Array.isArray(value.capability_bounding_set)||
    value.capability_bounding_set.length!==0||
    !Array.isArray(value.ambient_capabilities)||
    value.ambient_capabilities.length!==0||
    !Array.isArray(value.restrict_address_families)||
    value.restrict_address_families.length!==1||
    value.restrict_address_families[0]!=="AF_UNIX"||
    !Array.isArray(value.read_write_targets)||
    value.read_write_targets.length!==2||
    value.read_write_targets[0]!=="socket_parent"||
    value.read_write_targets[1]!=="state_root"||
    supplementary.length!==1||
    supplementary[0]!==identities.ipc_gid||
    value.runtime_can_control_service!==false||
    value.custody_uid_only_reviewed_service!==true
  ){
    fail("apollyon_custody_policy_service_invalid");
  }
  return Object.freeze({
    ...value,
    supplementary_gids:supplementary,
    capability_bounding_set:Object.freeze([]),
    ambient_capabilities:Object.freeze([]),
    restrict_address_families:Object.freeze(["AF_UNIX"]),
    read_write_targets:Object.freeze(["socket_parent","state_root"]),
  });
}

export function qualifyApollyonCustodyHostPolicyV2(input){
  exactKeys(
    input,
    [
      "consumed_directory",
      "evidence_snapshot",
      "identities",
      "marker",
      "service",
      "socket",
      "socket_parent",
      "source_binding",
      "state_root",
      "target_host",
      "verification_now_ms",
      "version",
    ],
    "apollyon_custody_policy_input_invalid",
  );
  if(
    input.marker!==VOID_APOLLYON_CUSTODY_HOST_POLICY_EVIDENCE_V2||
    input.version!==1||
    input.target_host!=="Xiphos"
  ){
    fail("apollyon_custody_policy_input_invalid");
  }
  const now=int(
    input.verification_now_ms,
    1,
    Number.MAX_SAFE_INTEGER,
    "apollyon_custody_policy_verification_clock_invalid",
  );

  const sourceBinding=normalizeSourceBinding(input.source_binding);
  const identities=normalizeIdentities(input.identities);
  const evidenceSnapshot=normalizeEvidenceSnapshot(input.evidence_snapshot,now);
  const stateRoot=normalizeStateRoot(input.state_root,identities);
  const consumedDirectory=
    normalizeConsumedDirectory(input.consumed_directory,identities);
  const socketParent=normalizeSocketParent(input.socket_parent,identities);
  const socket=normalizeSocket(input.socket,identities);
  const service=normalizeService(input.service,identities);

  const normalized=Object.freeze({
    marker:VOID_APOLLYON_CUSTODY_HOST_POLICY_EVIDENCE_V2,
    version:2,
    target_host:"Xiphos",
    verification_now_ms:now,
    evidence_snapshot:evidenceSnapshot,
    source_binding:sourceBinding,
    identities,
    state_root:stateRoot,
    consumed_directory:consumedDirectory,
    socket_parent:socketParent,
    socket,
    service,
  });

  return Object.freeze({
    ok:true,
    marker:VOID_APOLLYON_CUSTODY_HOST_POLICY_QUALIFICATION_V2,
    version:2,
    status:"source_policy_qualified",
    qualification_id:
      "apollyon_custody_policy_v2:"+
      sha256(canonicalApollyonCustodyHostPolicyJsonV2(normalized)),
    target_host:"Xiphos",
    source_binding_verified:true,
    evidence_freshness_checked:true,
    identity_separation_qualified:true,
    state_root_policy_qualified:true,
    consumed_directory_policy_qualified:true,
    socket_parent_policy_qualified:true,
    socket_policy_qualified:true,
    service_hardening_policy_qualified:true,
    custody_uid_process_exclusivity_evidence_qualified:true,
    verification_clock_authority_proven:false,
    evidence_generation_monotonicity_proven:false,
    live_host_qualification_performed:false,
    independent_custody_proven:false,
    production_gate_ready:false,
    attempt_claimed:false,
    training_execution_performed:false,
    wallet_access_performed:false,
    funds_movement_performed:false,
    next_gate:"designated_host_read_only_custody_evidence_collection_v1",
    authority:VOID_APOLLYON_CUSTODY_HOST_POLICY_AUTHORITY_V2,
  });
}
