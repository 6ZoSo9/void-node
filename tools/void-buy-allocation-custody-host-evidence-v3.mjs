import {
  normalizeBuyVoidAllocationCustodyUserServiceShowV2,
} from "./void-buy-allocation-custody-host-evidence-v2.mjs";

export const VOID_BUY_VOID_ALLOCATION_CUSTODY_HOST_EVIDENCE_V3 =
  "VOID_BUY_VOID_ALLOCATION_CUSTODY_HOST_EVIDENCE_V3";

export const VOID_BUY_VOID_ALLOCATION_CUSTODY_HOST_EVIDENCE_AUTHORITY_V3 =
  Object.freeze({
    source_composition_only:true,
    authenticated_private_manager_peer_required:true,
    same_authenticated_connection_unit_query_required:true,
    sanitized_loader_environment_required:true,
    fixed_libsystemd_path_required:true,
    retained_libsystemd_descriptor_required:true,
    libsystemd_symbol_provenance_required:true,
    ambient_dynamic_loader_authority:false,
    manager_pidfd_required:true,
    service_pidfd_required:true,
    manager_generation_revalidation_required:true,
    service_generation_revalidation_required:true,
    user_manager_shape_adapter_reused:true,
    generic_user_bus_authority:false,
    manager_peer_authenticated_by_valid_native_evidence:true,
    runtime_user_manager_identity_verified_by_valid_native_evidence:true,
    runtime_user_manager_cgroup_bound_by_valid_native_evidence:true,
    complete_host_evidence_collector:false,
    custody_service_v2_source_binding_proven:false,
    custody_service_v2_config_binding_proven:false,
    request_root_host_profile_bound:false,
    storage_mount_evidence_bound:false,
    socket_runtime_directory_live_verified:false,
    polkit_runtime_control_denial_live_verified:false,
    double_census_stability_verified:false,
    host_mutation:false,
    filesystem_write:false,
    service_mutation:false,
    systemd_mutation:false,
    credential_access:false,
    private_key_access:false,
    wallet_or_signer_access:false,
    rpc_call:false,
    network_call:false,
    payment_acceptance:false,
    public_presale_activation:false,
    funds_movement:false,
  });

const MARKER="VOID_BUY_VOID_USER_MANAGER_PRIVATE_UNIT_QUERY_V1_GREEN";
const BOOL_TRUE=new Set([
  "manager_peer_authenticated","same_private_fd_used_for_query",
  "sanitized_loader_environment","libsystemd_fixed_path_verified",
  "libsystemd_retained_fd_load","libsystemd_symbol_provenance_verified",
  "service_pidfd_retained","manager_pidfd_retained",
  "runtime_main_pid_kernel_bound","manager_generation_reverified",
  "service_generation_reverified",
]);
const BOOL_FALSE=new Set([
  "host_mutation","payment_acceptance","public_presale_activation","funds_movement",
]);
const EXACT_KEYS=Object.freeze([
  "runtime_uid","manager_pid","manager_gid","manager_start_ticks",
  "manager_peer_authenticated","same_private_fd_used_for_query",
  "sanitized_loader_environment","libsystemd_fixed_path_verified",
  "libsystemd_retained_fd_load","libsystemd_symbol_provenance_verified",
  "runtime_service_unit","LoadState","ActiveState","SubState","User","Group",
  "MainPID","ControlGroup","NoNewPrivileges","CapabilityBoundingSet",
  "AmbientCapabilities","service_ppid","service_start_ticks",
  "service_pidfd_retained","manager_pidfd_retained","runtime_main_pid_kernel_bound",
  "manager_generation_reverified","service_generation_reverified",
  "host_mutation","payment_acceptance","public_presale_activation","funds_movement",
]);
const UINT=/^[1-9][0-9]*$/u;
const SAFE_NAME=/^[A-Za-z_][A-Za-z0-9_.-]{0,63}$/u;
const SAFE_UNIT=/^[A-Za-z0-9_.@:-]{1,200}\.service$/u;

function fail(code){throw new Error(code);}
function exactObject(raw,keys,code){
  if(!raw||typeof raw!=="object"||Array.isArray(raw))fail(code);
  const proto=Object.getPrototypeOf(raw);
  if(proto!==Object.prototype&&proto!==null)fail(code);
  const d=Object.getOwnPropertyDescriptors(raw),own=Reflect.ownKeys(d);
  if(own.some(k=>typeof k!=="string"))fail(code);
  const got=[...own].sort(),want=[...keys].sort();
  if(got.length!==want.length||got.some((x,i)=>x!==want[i]))fail(code);
  const out=Object.create(null);
  for(const key of keys){
    const x=d[key]; if(!x||x.enumerable!==true||!Object.hasOwn(x,"value"))fail(code);
    out[key]=x.value;
  }
  return out;
}
function positive(value,code){
  const text=String(value??"");
  if(!UINT.test(text))fail(code);
  const n=Number(text); if(!Number.isSafeInteger(n)||n<=0||n>0x7fff_ffff)fail(code);
  return n;
}
function safeName(value,code){const x=String(value??"");if(!SAFE_NAME.test(x))fail(code);return x;}
function safeUnit(value,code){const x=String(value??"");if(!SAFE_UNIT.test(x))fail(code);return x;}

export function parseBuyVoidAuthenticatedUserManagerUnitQueryV1(text){
  if(typeof text!=="string"||text.length<2||text.length>64*1024||text.includes("\0")){
    fail("custody_host_evidence_v3_native_output_invalid");
  }
  const lines=text.split("\n");
  if(lines.at(-1)==="")lines.pop();
  if(lines.shift()!==MARKER)fail("custody_host_evidence_v3_native_marker_invalid");
  const out=Object.create(null);
  for(const line of lines){
    const at=line.indexOf("=");
    if(at<=0)fail("custody_host_evidence_v3_native_output_invalid");
    const key=line.slice(0,at),value=line.slice(at+1);
    if(!EXACT_KEYS.includes(key)||Object.hasOwn(out,key)){
      fail("custody_host_evidence_v3_native_output_shape_invalid");
    }
    out[key]=value;
  }
  if(Object.keys(out).length!==EXACT_KEYS.length||EXACT_KEYS.some(k=>!Object.hasOwn(out,k))){
    fail("custody_host_evidence_v3_native_output_shape_invalid");
  }
  for(const key of BOOL_TRUE)if(out[key]!=="true")fail("custody_host_evidence_v3_native_truth_invalid:"+key);
  for(const key of BOOL_FALSE)if(out[key]!=="false")fail("custody_host_evidence_v3_native_non_authority_invalid:"+key);
  for(const key of ["runtime_uid","manager_pid","manager_gid","manager_start_ticks","MainPID","service_ppid","service_start_ticks"]){
    positive(out[key],"custody_host_evidence_v3_native_integer_invalid:"+key);
  }
  if(out.service_ppid!==out.manager_pid)fail("custody_host_evidence_v3_direct_parent_invalid");
  return Object.freeze({...out});
}

export function classifyBuyVoidAllocationCustodyAuthenticatedUserServiceV3(raw,config){
  const c=exactObject(config,["runtime_user","runtime_group","runtime_uid","runtime_service_unit"],"custody_host_evidence_v3_config_invalid");
  const runtimeUser=safeName(c.runtime_user,"custody_host_evidence_v3_runtime_user_invalid");
  const runtimeGroup=safeName(c.runtime_group,"custody_host_evidence_v3_runtime_group_invalid");
  const runtimeUid=positive(c.runtime_uid,"custody_host_evidence_v3_runtime_uid_invalid");
  const unit=safeUnit(c.runtime_service_unit,"custody_host_evidence_v3_runtime_unit_invalid");
  const native=typeof raw==="string"?parseBuyVoidAuthenticatedUserManagerUnitQueryV1(raw):raw;
  const n=exactObject(native,EXACT_KEYS,"custody_host_evidence_v3_native_object_invalid");
  if(Number(n.runtime_uid)!==runtimeUid||n.runtime_service_unit!==unit){
    fail("custody_host_evidence_v3_native_binding_mismatch");
  }
  for(const key of BOOL_TRUE)if(String(n[key])!=="true")fail("custody_host_evidence_v3_native_truth_invalid:"+key);
  for(const key of BOOL_FALSE)if(String(n[key])!=="false")fail("custody_host_evidence_v3_native_non_authority_invalid:"+key);
  const managerPid=positive(n.manager_pid,"custody_host_evidence_v3_manager_pid_invalid");
  const mainPid=positive(n.MainPID,"custody_host_evidence_v3_main_pid_invalid");
  if(positive(n.service_ppid,"custody_host_evidence_v3_service_ppid_invalid")!==managerPid){
    fail("custody_host_evidence_v3_direct_parent_invalid");
  }
  const rawShow=[
    "LoadState="+n.LoadState,"ActiveState="+n.ActiveState,"SubState="+n.SubState,
    "User="+n.User,"Group="+n.Group,"MainPID="+n.MainPID,
    "ControlGroup="+n.ControlGroup,"NoNewPrivileges="+n.NoNewPrivileges,
    "CapabilityBoundingSet="+n.CapabilityBoundingSet,
    "AmbientCapabilities="+n.AmbientCapabilities,"",
  ].join("\n");
  const shape=normalizeBuyVoidAllocationCustodyUserServiceShowV2(rawShow,{
    runtime_user:runtimeUser,runtime_group:runtimeGroup,runtime_uid:runtimeUid,
    runtime_service_unit:unit,
  });
  if(shape.main_pid!==mainPid||shape.manager_peer_authenticated!==false||
     shape.runtime_user_manager_identity_verified!==false||
     shape.runtime_user_manager_cgroup_bound!==false){
    fail("custody_host_evidence_v3_adapter_composition_invalid");
  }
  return Object.freeze({
    marker:VOID_BUY_VOID_ALLOCATION_CUSTODY_HOST_EVIDENCE_V3,
    status:"AUTHENTICATED_USER_MANAGER_UNIT_EVIDENCE_V3_GREEN_HOST_EVIDENCE_STILL_INCOMPLETE",
    runtime_service_manager:"user",
    runtime_user:runtimeUser,
    runtime_group:runtimeGroup,
    runtime_uid:runtimeUid,
    runtime_service_unit:unit,
    manager_pid:managerPid,
    manager_gid:positive(n.manager_gid,"custody_host_evidence_v3_manager_gid_invalid"),
    manager_start_ticks:String(n.manager_start_ticks),
    main_pid:mainPid,
    service_start_ticks:String(n.service_start_ticks),
    control_group:shape.control_group,
    no_new_privileges:true,
    capability_bounding_set:Object.freeze([]),
    ambient_capabilities:Object.freeze([]),
    manager_peer_authenticated:true,
    same_authenticated_connection_unit_query:true,
    sanitized_loader_environment:true,
    libsystemd_fixed_path_verified:true,
    libsystemd_retained_fd_load:true,
    libsystemd_symbol_provenance_verified:true,
    runtime_user_manager_identity_verified:true,
    runtime_user_manager_cgroup_bound:true,
    runtime_main_pid_kernel_bound:true,
    manager_and_service_pidfds_retained:true,
    manager_and_service_generation_reverified:true,
    complete_host_evidence_collector:false,
    custody_service_v2_source_binding_proven:false,
    custody_service_v2_config_binding_proven:false,
    request_root_host_profile_bound:false,
    storage_mount_evidence_bound:false,
    socket_runtime_directory_live_verified:false,
    polkit_runtime_control_denial_live_verified:false,
    double_census_stability_verified:false,
    production_host_evidence_authority:false,
    host_mutation:false,
    payment_acceptance:false,
    public_presale_activation:false,
    funds_movement:false,
  });
}
