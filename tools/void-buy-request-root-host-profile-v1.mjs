#!/usr/bin/env node
import crypto from "node:crypto";
import { pathToFileURL } from "node:url";

export const VOID_BUY_VOID_REQUEST_ROOT_HOST_PROFILE_V1 =
  "VOID_BUY_VOID_REQUEST_ROOT_HOST_PROFILE_V1";
export const VOID_BUY_VOID_REQUEST_ROOT_HOST_PROFILE_SCHEMA_V1 =
  "void_buy_void_request_root_host_profile_v1";

export const VOID_BUY_VOID_REQUEST_ROOT_HOST_EXPECTED_V1 = Object.freeze({
  host:"zoso-Precision-Tower-7810",
  request_root:"/var/lib/void-buy-requests-v1",
  runtime_user:"zoso",
  runtime_uid:1000,
  runtime_gid:1000,
  runtime_service_manager:"user-systemd",
  runtime_service_unit:"void-node-live.service",
  ipc_group:"void-buy-custody-ipc",
  ipc_gid:980,
  request_root_owner_uid:1000,
  request_root_group_gid:980,
  request_root_mode:"0750",
  fixed_journals:Object.freeze([
    Object.freeze({
      name:"requests.jsonl",
      owner_uid:1000,
      group_gid:980,
      mode:"0640",
    }),
    Object.freeze({
      name:"operator-events.jsonl",
      owner_uid:1000,
      group_gid:980,
      mode:"0640",
    }),
  ]),
  customer_sidecar_mode:"0600",
  operator_sidecar_mode:"0600",
  environment:Object.freeze({
    VOID_BUY_REQUEST_DIR:"/var/lib/void-buy-requests-v1",
    VOID_BUY_REQUEST_CUSTODY_READ_GID:"980",
  }),
});

export const VOID_BUY_VOID_REQUEST_ROOT_HOST_PROFILE_AUTHORITY_V1 =
  Object.freeze({
    source_profile_only:true,
    stable_request_root_path_selected:true,
    immutable_release_tree_forbidden:true,
    runtime_uid_remains_owner:true,
    custody_ipc_gid_read_only_visibility_selected:true,
    fixed_journal_preprovisioning_required:true,
    fixed_journal_group_write_forbidden:true,
    customer_sidecars_remain_private:true,
    operator_sidecars_remain_private:true,
    parent_path_live_reverification_required:true,
    historical_request_data_disposition_proven:false,
    existing_request_data_migration_authorized:false,
    request_root_provisioned:false,
    runtime_environment_installed:false,
    runtime_group_membership_mutation:false,
    service_restart:false,
    host_mutation:false,
    custody_write_authority:false,
    payment_acceptance:false,
    public_presale_activation:false,
    funds_movement:false,
  });

function canonicalize(value){
  if(Array.isArray(value)) return value.map(canonicalize);
  if(value&&typeof value==="object"){
    return Object.fromEntries(
      Object.keys(value).sort().map(key=>[key,canonicalize(value[key])]),
    );
  }
  return value;
}
export function canonicalJsonV1(value){
  return JSON.stringify(canonicalize(value));
}
function sha256(value){
  return crypto.createHash("sha256").update(value).digest("hex");
}
const BODY=Object.freeze({
  schema:VOID_BUY_VOID_REQUEST_ROOT_HOST_PROFILE_SCHEMA_V1,
  marker:VOID_BUY_VOID_REQUEST_ROOT_HOST_PROFILE_V1,
  version:1,
  expected:VOID_BUY_VOID_REQUEST_ROOT_HOST_EXPECTED_V1,
  authority:VOID_BUY_VOID_REQUEST_ROOT_HOST_PROFILE_AUTHORITY_V1,
});
export const VOID_BUY_VOID_REQUEST_ROOT_HOST_PROFILE_ID_V1 =
  "voidbuyreqroot1_"+sha256(Buffer.from(canonicalJsonV1(BODY)+"\n","utf8"));

function hold(reason){
  return Object.freeze({
    ok:false,
    status:"HOLD",
    marker:VOID_BUY_VOID_REQUEST_ROOT_HOST_PROFILE_V1,
    version:1,
    reason,
    profile_id:VOID_BUY_VOID_REQUEST_ROOT_HOST_PROFILE_ID_V1,
    authority:VOID_BUY_VOID_REQUEST_ROOT_HOST_PROFILE_AUTHORITY_V1,
  });
}
export function classifyBuyVoidRequestRootHostProfileV1(observed){
  if(!observed||typeof observed!=="object"||Array.isArray(observed)){
    return hold("buy_void_request_root_host_profile_observation_invalid");
  }
  if(canonicalJsonV1(observed)!==
     canonicalJsonV1(VOID_BUY_VOID_REQUEST_ROOT_HOST_EXPECTED_V1)){
    return hold("buy_void_request_root_host_profile_identity_mismatch");
  }
  return Object.freeze({
    ok:true,
    status:"SOURCE_EXPECTED_REQUEST_ROOT_PROFILE_GREEN",
    marker:VOID_BUY_VOID_REQUEST_ROOT_HOST_PROFILE_V1,
    version:1,
    profile_id:VOID_BUY_VOID_REQUEST_ROOT_HOST_PROFILE_ID_V1,
    stable_request_root_path_selected:true,
    request_root_provisioned:false,
    runtime_environment_installed:false,
    historical_request_data_disposition_proven:false,
    host_mutation:false,
    payment_acceptance:false,
    public_presale_activation:false,
    funds_movement:false,
    authority:VOID_BUY_VOID_REQUEST_ROOT_HOST_PROFILE_AUTHORITY_V1,
  });
}
export function inspectBuyVoidRequestRootHostProfileV1(){
  return Object.freeze({...BODY,profile_id:VOID_BUY_VOID_REQUEST_ROOT_HOST_PROFILE_ID_V1});
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const p=inspectBuyVoidRequestRootHostProfileV1();
  console.log(VOID_BUY_VOID_REQUEST_ROOT_HOST_PROFILE_V1);
  console.log("profile_id="+p.profile_id);
  console.log("request_root="+p.expected.request_root);
  console.log("runtime_uid="+p.expected.runtime_uid);
  console.log("ipc_gid="+p.expected.ipc_gid);
  console.log("request_root_mode="+p.expected.request_root_mode);
  console.log("journal_mode=0640");
  console.log("request_root_provisioned=false");
  console.log("runtime_environment_installed=false");
  console.log("historical_request_data_disposition_proven=false");
  console.log("host_mutation=false");
  console.log("public_presale_activation=false");
  console.log("funds_movement=false");
}
