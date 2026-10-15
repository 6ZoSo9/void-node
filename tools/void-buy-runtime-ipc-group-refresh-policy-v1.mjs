#!/usr/bin/env node
import { types as utilTypes } from "node:util";

export const VOID_BUY_VOID_RUNTIME_IPC_GROUP_REFRESH_POLICY_V1 =
  "VOID_BUY_VOID_RUNTIME_IPC_GROUP_REFRESH_POLICY_V1";

export const VOID_BUY_VOID_RUNTIME_IPC_GROUP_REFRESH_FRAGMENT_V1 =
  Object.freeze({
    runtime_user:"zoso",
    runtime_uid:1000,
    runtime_primary_gid:1000,
    ipc_group:"void-buy-custody-ipc",
    ipc_gid:980,
    custody_user:"void-buy-custody",
    custody_uid:994,
    staged_runtime_user:"void-buy-runtime",
    staged_runtime_uid:995,
    user_manager_unit:"user@1000.service",
    runtime_service_unit:"void-node-live.service",
    membership_add:Object.freeze([
      "/usr/sbin/usermod","--append","--groups",
      "void-buy-custody-ipc","zoso",
    ]),
    user_manager_refresh:Object.freeze([
      "/usr/bin/systemctl","restart","user@1000.service",
    ]),
    membership_rollback:Object.freeze([
      "/usr/bin/gpasswd","--delete","zoso","void-buy-custody-ipc",
    ]),
  });

export const VOID_BUY_VOID_RUNTIME_IPC_GROUP_REFRESH_AUTHORITY_V1 =
  Object.freeze({
    source_policy_only:true,
    current_runtime_identity_preserved:true,
    staged_runtime_identity_migration:false,
    distinct_ipc_group_required:true,
    account_database_membership_required:true,
    user_manager_refresh_required:true,
    runtime_service_restart_via_manager_refresh_expected:true,
    direct_user_service_supplementary_groups_shortcut_forbidden:true,
    setuid_group_helper_shortcut_forbidden:true,
    pre_refresh_active_user_service_census_required:true,
    pre_refresh_runtime_generation_receipt_required:true,
    post_refresh_manager_gid_inheritance_required:true,
    post_refresh_runtime_gid_inheritance_required:true,
    post_refresh_active_user_service_set_recovery_required:true,
    post_refresh_runtime_source_identity_required:true,
    post_refresh_runtime_readiness_required:true,
    rollback_only_if_membership_added_by_operation:true,
    rollback_user_manager_refresh_required:true,
    account_mutation:false,
    user_manager_restart:false,
    service_restart:false,
    filesystem_mutation:false,
    systemd_mutation:false,
    credential_access:false,
    wallet_or_signer_access:false,
    rpc_call:false,
    payment_acceptance:false,
    public_presale_activation:false,
    funds_movement:false,
  });

const KEYS=Object.freeze([
  "runtime_user","runtime_uid","runtime_primary_gid",
  "ipc_group","ipc_gid","custody_user","custody_uid",
  "staged_runtime_user","staged_runtime_uid",
  "user_manager_unit","runtime_service_unit",
  "membership_add","user_manager_refresh","membership_rollback",
]);

function hold(reason){
  return Object.freeze({
    ok:false,status:"HOLD",
    marker:VOID_BUY_VOID_RUNTIME_IPC_GROUP_REFRESH_POLICY_V1,
    reason,
    host_mutation_authorized:false,
    authority:VOID_BUY_VOID_RUNTIME_IPC_GROUP_REFRESH_AUTHORITY_V1,
  });
}
function exactObject(value){
  if(
    !value||typeof value!=="object"||
    utilTypes.isProxy(value)||
    Array.isArray(value)
  )throw new Error("runtime_ipc_group_refresh_shape_invalid");
  const proto=Object.getPrototypeOf(value);
  if(proto!==Object.prototype&&proto!==null)throw new Error("runtime_ipc_group_refresh_shape_invalid");
  const descriptors=Object.getOwnPropertyDescriptors(value);
  const own=Reflect.ownKeys(descriptors);
  if(own.some(key=>typeof key!=="string"))throw new Error("runtime_ipc_group_refresh_shape_invalid");
  const got=[...own].sort(),want=[...KEYS].sort();
  if(got.length!==want.length||got.some((v,i)=>v!==want[i]))throw new Error("runtime_ipc_group_refresh_shape_invalid");
  const out=Object.create(null);
  for(const key of KEYS){
    const d=descriptors[key];
    if(!d||d.enumerable!==true||!Object.hasOwn(d,"value"))throw new Error("runtime_ipc_group_refresh_accessor_invalid");
    out[key]=d.value;
  }
  return out;
}
function exactArray(value,expected,code){
  if(
    !Array.isArray(value)||
    value.length!==expected.length||
    value.some((entry,index)=>entry!==expected[index])
  )throw new Error(code);
}
function exact(value,expected,code){
  if(value!==expected)throw new Error(code);
}

export function classifyVoidBuyVoidRuntimeIpcGroupRefreshPolicyV1(input){
  try{
    const value=exactObject(input);
    const expected=VOID_BUY_VOID_RUNTIME_IPC_GROUP_REFRESH_FRAGMENT_V1;
    for(const key of [
      "runtime_user","runtime_uid","runtime_primary_gid",
      "ipc_group","ipc_gid","custody_user","custody_uid",
      "staged_runtime_user","staged_runtime_uid",
      "user_manager_unit","runtime_service_unit",
    ]){
      exact(value[key],expected[key],"runtime_ipc_group_refresh_"+key+"_invalid");
    }
    exactArray(value.membership_add,expected.membership_add,
      "runtime_ipc_group_refresh_membership_add_invalid");
    exactArray(value.user_manager_refresh,expected.user_manager_refresh,
      "runtime_ipc_group_refresh_user_manager_refresh_invalid");
    exactArray(value.membership_rollback,expected.membership_rollback,
      "runtime_ipc_group_refresh_membership_rollback_invalid");

    if(value.runtime_user===value.custody_user||value.runtime_uid===value.custody_uid){
      throw new Error("runtime_ipc_group_refresh_identity_separation_invalid");
    }
    if(value.runtime_user===value.staged_runtime_user||value.runtime_uid===value.staged_runtime_uid){
      throw new Error("runtime_ipc_group_refresh_staged_identity_alias_invalid");
    }
    if(value.runtime_primary_gid===value.ipc_gid){
      throw new Error("runtime_ipc_group_refresh_primary_group_alias_invalid");
    }

    return Object.freeze({
      ok:true,
      status:"SOURCE_POLICY_GREEN_NOT_APPLIED",
      marker:VOID_BUY_VOID_RUNTIME_IPC_GROUP_REFRESH_POLICY_V1,
      version:1,
      runtime_identity_preserved:true,
      target_supplementary_gid:value.ipc_gid,
      user_manager_refresh_required:true,
      user_manager_refresh_scope:"user@1000.service",
      expected_runtime_service_restart:true,
      pre_refresh_active_user_service_census_required:true,
      post_refresh_active_user_service_set_recovery_required:true,
      post_refresh_manager_gid_inheritance_required:true,
      post_refresh_runtime_gid_inheritance_required:true,
      rollback_membership_removal_then_manager_refresh_required:true,
      host_mutation_authorized:false,
      production_gate_ready:false,
      authority:VOID_BUY_VOID_RUNTIME_IPC_GROUP_REFRESH_AUTHORITY_V1,
    });
  }catch(error){
    return hold(error instanceof Error?error.message:String(error));
  }
}
