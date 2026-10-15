#!/usr/bin/env node
import path from "node:path";

export const VOID_BUY_VOID_ALLOCATION_CUSTODY_HOST_EVIDENCE_V2 =
  "VOID_BUY_VOID_ALLOCATION_CUSTODY_HOST_EVIDENCE_V2";

export const VOID_BUY_VOID_ALLOCATION_CUSTODY_HOST_EVIDENCE_AUTHORITY_V2 =
  Object.freeze({
    source_policy_only:true,
    runtime_manager_adapter_only:true,
    read_only_observation_plan:true,
    user_systemd_runtime_manager_supported:true,
    exact_runtime_user_bus_required:true,
    exact_runtime_user_bus_path_selected:true,
    manager_peer_authenticated:false,
    runtime_user_manager_identity_derived:false,
    runtime_user_manager_cgroup_bound:false,
    reported_control_group_shape_validated:true,
    implicit_user_unit_identity_normalized_only_after_verification:false,
    v1_host_collector_reused:false,
    complete_host_evidence_collector:false,
    service_v2_source_binding_proven:false,
    service_v2_config_binding_proven:false,
    custody_service_runtime_directory_policy_bound:false,
    host_read_performed:false,
    host_mutation:false,
    filesystem_write:false,
    service_mutation:false,
    systemd_mutation:false,
    daemon_reload:false,
    mount_mutation:false,
    permission_mutation:false,
    credential_access:false,
    private_key_access:false,
    wallet_or_signer_access:false,
    rpc_call:false,
    network_call:false,
    payment_acceptance:false,
    public_presale_activation:false,
    funds_movement:false,
  });

const SAFE_NAME=/^[A-Za-z_][A-Za-z0-9_.-]{0,63}$/u;
const SAFE_UNIT=/^[A-Za-z0-9_.@:-]{1,200}\.service$/u;
const UINT=/^[1-9][0-9]*$/u;

function fail(code){throw new Error(code);}
function exactObject(raw,keys,code){
  if(!raw||typeof raw!=="object"||Array.isArray(raw)){
    fail(code);
  }
  const proto=Object.getPrototypeOf(raw);
  if(proto!==Object.prototype&&proto!==null)fail(code);
  const descriptors=Object.getOwnPropertyDescriptors(raw);
  const own=Reflect.ownKeys(descriptors);
  if(own.some(key=>typeof key!=="string"))fail(code);
  const got=[...own].sort(),want=[...keys].sort();
  if(got.length!==want.length||got.some((v,i)=>v!==want[i]))fail(code);
  const out=Object.create(null);
  for(const key of keys){
    const d=descriptors[key];
    if(!d||d.enumerable!==true||!Object.hasOwn(d,"value"))fail(code);
    out[key]=d.value;
  }
  return Object.freeze(out);
}
function safeName(raw,code){
  const value=String(raw??"");
  if(!SAFE_NAME.test(value))fail(code);
  return value;
}
function safeUnit(raw,code){
  const value=String(raw??"");
  if(!SAFE_UNIT.test(value))fail(code);
  return value;
}
function positive(raw,code){
  const text=String(raw??"").trim();
  if(!UINT.test(text))fail(code);
  const value=Number(text);
  if(!Number.isSafeInteger(value)||value<=0||value>0x7fff_ffff)fail(code);
  return value;
}
function parseShow(raw){
  const out=Object.create(null);
  for(const line of String(raw??"").split("\n")){
    if(!line)continue;
    const at=line.indexOf("=");
    if(at<=0)fail("custody_host_evidence_v2_user_show_invalid");
    const key=line.slice(0,at),value=line.slice(at+1);
    if(Object.hasOwn(out,key))fail("custody_host_evidence_v2_user_show_invalid");
    out[key]=value;
  }
  return out;
}

export function buildBuyVoidAllocationCustodyUserSystemctlInvocationV2(input){
  const value=exactObject(input,[
    "runtime_user","runtime_uid","runtime_home","systemctl_args",
  ],"custody_host_evidence_v2_input_invalid");
  const user=safeName(value.runtime_user,"custody_host_evidence_v2_runtime_user_invalid");
  const uid=positive(value.runtime_uid,"custody_host_evidence_v2_runtime_uid_invalid");
  const home=String(value.runtime_home??"");
  if(!path.isAbsolute(home)||path.resolve(home)!==home||home.includes("\0")){
    fail("custody_host_evidence_v2_runtime_home_invalid");
  }
  if(
    !Array.isArray(value.systemctl_args)||
    value.systemctl_args.length<1||
    value.systemctl_args.some(x=>typeof x!=="string"||x.includes("\0"))
  ){
    fail("custody_host_evidence_v2_systemctl_args_invalid");
  }
  return Object.freeze({
    command:"/usr/sbin/runuser",
    args:Object.freeze([
      "-u",user,"--",
      "/usr/bin/env","-i",
      "HOME="+home,
      "XDG_RUNTIME_DIR=/run/user/"+String(uid),
      "DBUS_SESSION_BUS_ADDRESS=unix:path=/run/user/"+String(uid)+"/bus",
      "PATH=/usr/sbin:/usr/bin:/sbin:/bin",
      "LANG=C","LC_ALL=C","TZ=UTC",
      "/usr/bin/systemctl","--user",...value.systemctl_args,
    ]),
  });
}

export function normalizeBuyVoidAllocationCustodyUserServiceShowV2(raw,input){
  const value=exactObject(input,[
    "runtime_user","runtime_group","runtime_uid","runtime_service_unit",
  ],"custody_host_evidence_v2_input_invalid");
  const user=safeName(value.runtime_user,"custody_host_evidence_v2_runtime_user_invalid");
  const group=safeName(value.runtime_group,"custody_host_evidence_v2_runtime_group_invalid");
  const uid=positive(value.runtime_uid,"custody_host_evidence_v2_runtime_uid_invalid");
  const unit=safeUnit(value.runtime_service_unit,"custody_host_evidence_v2_runtime_unit_invalid");
  const show=parseShow(raw);
  const keys=[
    "LoadState","ActiveState","SubState",
    "User","Group","MainPID","ControlGroup",
    "NoNewPrivileges","CapabilityBoundingSet","AmbientCapabilities",
  ];
  for(const key of keys){
    if(!Object.hasOwn(show,key))fail("custody_host_evidence_v2_user_show_invalid");
  }
  if(show.LoadState!=="loaded"||show.ActiveState!=="active"||show.SubState!=="running"){
    fail("custody_host_evidence_v2_runtime_service_not_active");
  }
  if(show.User!==""||show.Group!==""){
    fail("custody_host_evidence_v2_explicit_user_group_forbidden");
  }
  const pid=positive(show.MainPID,"custody_host_evidence_v2_runtime_pid_invalid");
  const expectedCgroup=
    "/user.slice/user-"+uid+".slice/user@"+uid+".service/app.slice/"+unit;
  if(show.ControlGroup!==expectedCgroup){
    fail("custody_host_evidence_v2_runtime_cgroup_invalid");
  }
  if(String(show.NoNewPrivileges).toLowerCase()!=="yes"){
    fail("custody_host_evidence_v2_runtime_nnp_invalid");
  }
  if(String(show.CapabilityBoundingSet).trim()!==""){
    fail("custody_host_evidence_v2_runtime_bounding_set_invalid");
  }
  if(String(show.AmbientCapabilities).trim()!==""){
    fail("custody_host_evidence_v2_runtime_ambient_caps_invalid");
  }
  return Object.freeze({
    runtime_service_manager:"user",
    runtime_user:user,
    runtime_group:group,
    runtime_uid:uid,
    runtime_service_unit:unit,
    main_pid:pid,
    control_group:show.ControlGroup,
    no_new_privileges:true,
    capability_bounding_set:Object.freeze([]),
    ambient_capabilities:Object.freeze([]),
    reported_control_group_shape_validated:true,
    manager_peer_authenticated:false,
    runtime_user_manager_identity_verified:false,
    runtime_user_manager_cgroup_bound:false,
    identity_normalization:
      "untrusted_user_systemctl_shape_only_v2",
    production_host_evidence_authority:false,
  });
}
