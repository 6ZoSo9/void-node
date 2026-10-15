export const VOID_BUY_VOID_ALLOCATION_CUSTODY_HOST_EVIDENCE_V4 =
  "VOID_BUY_VOID_ALLOCATION_CUSTODY_HOST_EVIDENCE_V4";

export const VOID_BUY_VOID_ALLOCATION_CUSTODY_HOST_EVIDENCE_AUTHORITY_V4 =
  Object.freeze({
    source_composition_only:true,
    authenticated_private_manager_peer_required:true,
    same_authenticated_connection_unit_query_required:true,
    sanitized_loader_environment_required:true,
    fixed_libsystemd_path_required:true,
    retained_libsystemd_descriptor_required:true,
    libsystemd_symbol_provenance_required:true,
    manager_pidfd_required:true,
    service_pidfd_required:true,
    manager_generation_revalidation_required:true,
    service_generation_revalidation_required:true,
    no_new_privileges_required:true,
    private_users_false_required:true,
    kernel_active_capabilities_zero_required:true,
    configured_kernel_bounding_set_equality_required:true,
    complete_host_evidence_collector:false,
    request_root_host_profile_bound:false,
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

const MARKER="VOID_BUY_VOID_USER_MANAGER_PRIVATE_UNIT_QUERY_V2_GREEN";
const TRUE_KEYS=new Set([
  "manager_peer_authenticated",
  "same_private_fd_used_for_query",
  "sanitized_loader_environment",
  "libsystemd_fixed_path_verified",
  "libsystemd_retained_fd_load",
  "libsystemd_symbol_provenance_verified",
  "configured_kernel_bounding_set_equal",
  "kernel_active_capabilities_zero",
  "service_pidfd_retained",
  "manager_pidfd_retained",
  "runtime_main_pid_kernel_bound",
  "manager_generation_reverified",
  "service_generation_reverified",
]);
const FALSE_KEYS=new Set([
  "host_mutation",
  "payment_acceptance",
  "public_presale_activation",
  "funds_movement",
]);
const EXACT_KEYS=Object.freeze([
  "runtime_uid",
  "manager_pid",
  "manager_gid",
  "manager_start_ticks",
  "manager_peer_authenticated",
  "same_private_fd_used_for_query",
  "sanitized_loader_environment",
  "libsystemd_fixed_path_verified",
  "libsystemd_retained_fd_load",
  "libsystemd_symbol_provenance_verified",
  "runtime_service_unit",
  "LoadState",
  "ActiveState",
  "SubState",
  "User",
  "Group",
  "MainPID",
  "ControlGroup",
  "NoNewPrivileges",
  "PrivateUsers",
  "CapabilityBoundingSet",
  "AmbientCapabilities",
  "KernelNoNewPrivs",
  "KernelCapInh",
  "KernelCapPrm",
  "KernelCapEff",
  "KernelCapBnd",
  "KernelCapAmb",
  "configured_kernel_bounding_set_equal",
  "kernel_active_capabilities_zero",
  "service_ppid",
  "service_start_ticks",
  "service_pidfd_retained",
  "manager_pidfd_retained",
  "runtime_main_pid_kernel_bound",
  "manager_generation_reverified",
  "service_generation_reverified",
  "host_mutation",
  "payment_acceptance",
  "public_presale_activation",
  "funds_movement",
]);
const UINT=/^[1-9][0-9]*$/u;
const HEX64=/^[0-9a-f]{16}$/u;
const SAFE_NAME=/^[A-Za-z_][A-Za-z0-9_.-]{0,63}$/u;
const SAFE_UNIT=/^[A-Za-z0-9_.@:-]{1,200}\.service$/u;

function fail(code){throw new Error(code);}
function positive(value,code){
  const text=String(value??"");
  if(!UINT.test(text))fail(code);
  const n=Number(text);
  if(!Number.isSafeInteger(n)||n<=0||n>0x7fff_ffff)fail(code);
  return n;
}
function safeName(value,code){
  const x=String(value??"");
  if(!SAFE_NAME.test(x))fail(code);
  return x;
}
function safeUnit(value,code){
  const x=String(value??"");
  if(!SAFE_UNIT.test(x))fail(code);
  return x;
}
function exactObject(raw,keys,code){
  if(!raw||typeof raw!=="object"||Array.isArray(raw))fail(code);
  const proto=Object.getPrototypeOf(raw);
  if(proto!==Object.prototype&&proto!==null)fail(code);
  const descriptors=Object.getOwnPropertyDescriptors(raw);
  const own=Reflect.ownKeys(descriptors);
  if(own.some(k=>typeof k!=="string"))fail(code);
  const got=[...own].sort(),want=[...keys].sort();
  if(got.length!==want.length||got.some((x,i)=>x!==want[i]))fail(code);
  const out=Object.create(null);
  for(const key of keys){
    const d=descriptors[key];
    if(!d||d.enumerable!==true||!Object.hasOwn(d,"value"))fail(code);
    out[key]=d.value;
  }
  return out;
}
function hexMask(value,key){
  const x=String(value??"");
  if(!HEX64.test(x))fail("custody_host_evidence_v4_native_hex_invalid:"+key);
  return x;
}

export function parseBuyVoidAuthenticatedUserManagerUnitQueryV2(text){
  if(typeof text!=="string"||text.length<2||text.length>64*1024||text.includes("\0")){
    fail("custody_host_evidence_v4_native_output_invalid");
  }
  const lines=text.split("\n");
  if(lines.at(-1)==="")lines.pop();
  if(lines.shift()!==MARKER)fail("custody_host_evidence_v4_native_marker_invalid");
  const out=Object.create(null);
  for(const line of lines){
    const at=line.indexOf("=");
    if(at<=0)fail("custody_host_evidence_v4_native_output_invalid");
    const key=line.slice(0,at),value=line.slice(at+1);
    if(!EXACT_KEYS.includes(key)||Object.hasOwn(out,key)){
      fail("custody_host_evidence_v4_native_output_shape_invalid");
    }
    out[key]=value;
  }
  if(Object.keys(out).length!==EXACT_KEYS.length||EXACT_KEYS.some(k=>!Object.hasOwn(out,k))){
    fail("custody_host_evidence_v4_native_output_shape_invalid");
  }
  for(const key of TRUE_KEYS){
    if(out[key]!=="true")fail("custody_host_evidence_v4_native_truth_invalid:"+key);
  }
  for(const key of FALSE_KEYS){
    if(out[key]!=="false")fail("custody_host_evidence_v4_native_non_authority_invalid:"+key);
  }
  for(const key of [
    "runtime_uid","manager_pid","manager_gid","manager_start_ticks",
    "MainPID","service_ppid","service_start_ticks",
  ]){
    positive(out[key],"custody_host_evidence_v4_native_integer_invalid:"+key);
  }
  for(const key of [
    "CapabilityBoundingSet","AmbientCapabilities","KernelCapInh","KernelCapPrm",
    "KernelCapEff","KernelCapBnd","KernelCapAmb",
  ])hexMask(out[key],key);

  if(out.LoadState!=="loaded"||out.ActiveState!=="active"||out.SubState!=="running"){
    fail("custody_host_evidence_v4_runtime_state_invalid");
  }
  if(out.User!==""||out.Group!==""){
    fail("custody_host_evidence_v4_runtime_implicit_identity_invalid");
  }
  if(out.NoNewPrivileges!=="yes"||out.KernelNoNewPrivs!=="1"){
    fail("custody_host_evidence_v4_runtime_nnp_invalid");
  }
  if(out.PrivateUsers!=="no"){
    fail("custody_host_evidence_v4_private_users_invalid");
  }
  if(out.AmbientCapabilities!=="0000000000000000"||
     out.KernelCapInh!=="0000000000000000"||
     out.KernelCapPrm!=="0000000000000000"||
     out.KernelCapEff!=="0000000000000000"||
     out.KernelCapAmb!=="0000000000000000"){
    fail("custody_host_evidence_v4_active_capability_state_invalid");
  }
  if(out.KernelCapBnd!==out.CapabilityBoundingSet){
    fail("custody_host_evidence_v4_bounding_set_mismatch");
  }
  if(out.service_ppid!==out.manager_pid){
    fail("custody_host_evidence_v4_direct_parent_invalid");
  }
  return Object.freeze({...out});
}

export function classifyBuyVoidAllocationCustodyAuthenticatedUserServiceV4(raw,config){
  const c=exactObject(
    config,
    ["runtime_user","runtime_group","runtime_uid","runtime_service_unit"],
    "custody_host_evidence_v4_config_invalid",
  );
  const runtimeUser=safeName(c.runtime_user,"custody_host_evidence_v4_runtime_user_invalid");
  const runtimeGroup=safeName(c.runtime_group,"custody_host_evidence_v4_runtime_group_invalid");
  const runtimeUid=positive(c.runtime_uid,"custody_host_evidence_v4_runtime_uid_invalid");
  const unit=safeUnit(c.runtime_service_unit,"custody_host_evidence_v4_runtime_unit_invalid");
  if(typeof raw!=="string")fail("custody_host_evidence_v4_native_transcript_required");
  const native=parseBuyVoidAuthenticatedUserManagerUnitQueryV2(raw);
  const n=exactObject(native,EXACT_KEYS,"custody_host_evidence_v4_native_object_invalid");
  if(Number(n.runtime_uid)!==runtimeUid||n.runtime_service_unit!==unit){
    fail("custody_host_evidence_v4_native_binding_mismatch");
  }
  if(positive(n.service_ppid,"custody_host_evidence_v4_service_ppid_invalid")!==
     positive(n.manager_pid,"custody_host_evidence_v4_manager_pid_invalid")){
    fail("custody_host_evidence_v4_direct_parent_invalid");
  }
  const expectedControlGroup=
    "/user.slice/user-"+runtimeUid+".slice/user@"+runtimeUid+
    ".service/app.slice/"+unit;
  if(n.ControlGroup!==expectedControlGroup){
    fail("custody_host_evidence_v4_control_group_invalid");
  }

  return Object.freeze({
    marker:VOID_BUY_VOID_ALLOCATION_CUSTODY_HOST_EVIDENCE_V4,
    status:"AUTHENTICATED_USER_MANAGER_UNIT_EVIDENCE_V4_GREEN_HOST_EVIDENCE_STILL_INCOMPLETE",
    runtime_service_manager:"user",
    runtime_user:runtimeUser,
    runtime_group:runtimeGroup,
    runtime_uid:runtimeUid,
    runtime_service_unit:unit,
    manager_pid:positive(n.manager_pid,"custody_host_evidence_v4_manager_pid_invalid"),
    manager_gid:positive(n.manager_gid,"custody_host_evidence_v4_manager_gid_invalid"),
    manager_start_ticks:String(n.manager_start_ticks),
    main_pid:positive(n.MainPID,"custody_host_evidence_v4_main_pid_invalid"),
    service_start_ticks:String(n.service_start_ticks),
    control_group:n.ControlGroup,
    no_new_privileges:true,
    private_users:false,
    capability_bounding_set_hex:n.CapabilityBoundingSet,
    ambient_capabilities_hex:n.AmbientCapabilities,
    kernel_no_new_privileges:true,
    kernel_cap_inh_hex:n.KernelCapInh,
    kernel_cap_prm_hex:n.KernelCapPrm,
    kernel_cap_eff_hex:n.KernelCapEff,
    kernel_cap_bnd_hex:n.KernelCapBnd,
    kernel_cap_amb_hex:n.KernelCapAmb,
    configured_kernel_bounding_set_equal:true,
    kernel_active_capabilities_zero:true,
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
    request_root_host_profile_bound:false,
    production_host_evidence_authority:false,
    host_mutation:false,
    payment_acceptance:false,
    public_presale_activation:false,
    funds_movement:false,
  });
}
