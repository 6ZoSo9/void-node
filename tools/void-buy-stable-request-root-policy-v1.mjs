#!/usr/bin/env node

export const VOID_BUY_VOID_STABLE_REQUEST_ROOT_POLICY_V1 =
  "VOID_BUY_VOID_STABLE_REQUEST_ROOT_POLICY_V1";

export const VOID_BUY_VOID_STABLE_REQUEST_ROOT_FRAGMENT_V1 =
  Object.freeze({
    request_root: "/var/lib/void-buy-request-journal-v1",
    runtime_systemd_manager: "user",
    runtime_user: "zoso",
    custody_user: "void-buy-custody",
    ipc_group: "void-buy-custody-ipc",
    request_dir_env: "VOID_BUY_REQUEST_DIR",
    custody_read_gid_env: "VOID_BUY_REQUEST_CUSTODY_READ_GID",
    directory_mode: "0750",
    fixed_journal_mode: "0640",
    private_sidecar_mode: "0600",
    fixed_journals: Object.freeze([
      "requests.jsonl",
      "operator-events.jsonl",
    ]),
    protected_roots: Object.freeze([
      "/var/lib/void-allocation-ledger-v1",
      "/var/lib/void-allocation-custody-v1",
    ]),
    immutable_release_prefix: "/opt/void-node-live/releases/",
  });

export const VOID_BUY_VOID_STABLE_REQUEST_ROOT_AUTHORITY_V1 =
  Object.freeze({
    source_policy_only: true,
    fixed_absolute_root_selected: true,
    immutable_release_root_forbidden: true,
    protected_allocation_roots_forbidden: true,
    preprovisioned_root_required: true,
    preprovisioned_fixed_journals_required: true,
    runtime_uid_remains_owner: true,
    custody_read_via_ipc_group_only: true,
    custody_write_authority: false,
    customer_sidecars_group_readable: false,
    operator_sidecars_group_readable: false,
    legacy_history_disposition_required_before_apply: true,
    live_host_metadata_verified: false,
    request_history_migration_authorized: false,
    service_mutation: false,
    permission_mutation: false,
    filesystem_write: false,
    payment_acceptance: false,
    public_presale_activation: false,
    funds_movement: false,
  });

const SAFE_NAME=/^[A-Za-z0-9_.@-]{1,128}$/u;
const DECIMAL=/^[1-9][0-9]{0,9}$/u;

function fail(code){throw new Error(code);}
function exactObject(value,keys,code){
  if(!value||typeof value!=="object"||Array.isArray(value))fail(code);
  const got=Object.keys(value).sort(), want=[...keys].sort();
  if(got.length!==want.length||got.some((x,i)=>x!==want[i]))fail(code);
  return value;
}
function overlaps(a,b){
  return a===b||a.startsWith(b+"/")||b.startsWith(a+"/");
}

export function classifyVoidBuyVoidStableRequestRootPolicyV1(input){
  try{
    const v=exactObject(
      input,
      [
        "request_root","runtime_systemd_manager","runtime_user","custody_user",
        "ipc_group","request_dir_env","custody_read_gid_env","directory_mode",
        "fixed_journal_mode","private_sidecar_mode","fixed_journals",
        "protected_roots","immutable_release_prefix",
      ],
      "stable_request_root_shape_invalid",
    );
    const expected=VOID_BUY_VOID_STABLE_REQUEST_ROOT_FRAGMENT_V1;
    for(const key of [
      "request_root","runtime_systemd_manager","runtime_user","custody_user",
      "ipc_group","request_dir_env","custody_read_gid_env","directory_mode",
      "fixed_journal_mode","private_sidecar_mode","immutable_release_prefix",
    ]){
      if(v[key]!==expected[key])fail("stable_request_root_"+key+"_invalid");
    }
    for(const key of ["runtime_user","custody_user","ipc_group"]){
      if(!SAFE_NAME.test(v[key]))fail("stable_request_root_identity_invalid");
    }
    if(!Array.isArray(v.fixed_journals)||
       v.fixed_journals.length!==2||
       v.fixed_journals[0]!=="requests.jsonl"||
       v.fixed_journals[1]!=="operator-events.jsonl"){
      fail("stable_request_root_fixed_journals_invalid");
    }
    if(!Array.isArray(v.protected_roots)||
       v.protected_roots.length!==2||
       v.protected_roots.some((x,i)=>x!==expected.protected_roots[i])){
      fail("stable_request_root_protected_roots_invalid");
    }
    if(!v.request_root.startsWith("/var/lib/")||
       v.request_root.startsWith(v.immutable_release_prefix)||
       v.protected_roots.some(root=>overlaps(v.request_root,root))){
      fail("stable_request_root_path_invalid");
    }
    return Object.freeze({
      ok:true,
      status:"SOURCE_POLICY_GREEN_NOT_INSTALLED",
      marker:VOID_BUY_VOID_STABLE_REQUEST_ROOT_POLICY_V1,
      version:1,
      request_root:v.request_root,
      stable_across_release_swap:true,
      runtime_user:v.runtime_user,
      custody_user:v.custody_user,
      ipc_group:v.ipc_group,
      directory_mode:v.directory_mode,
      fixed_journal_mode:v.fixed_journal_mode,
      private_sidecar_mode:v.private_sidecar_mode,
      legacy_history_disposition_required:true,
      live_host_metadata_verified:false,
      production_gate_ready:false,
      authority:VOID_BUY_VOID_STABLE_REQUEST_ROOT_AUTHORITY_V1,
    });
  }catch(error){
    return Object.freeze({
      ok:false,
      status:"HOLD",
      marker:VOID_BUY_VOID_STABLE_REQUEST_ROOT_POLICY_V1,
      reason:error instanceof Error?error.message:String(error),
      production_gate_ready:false,
      authority:VOID_BUY_VOID_STABLE_REQUEST_ROOT_AUTHORITY_V1,
    });
  }
}

export function renderVoidBuyVoidStableRequestRootDropinV1(ipcGid){
  const raw=String(ipcGid??"");
  if(!DECIMAL.test(raw))fail("stable_request_root_ipc_gid_invalid");
  const value=Number(raw);
  if(!Number.isSafeInteger(value)||value<1||value>0x7fffffff){
    fail("stable_request_root_ipc_gid_invalid");
  }
  return [
    "[Service]",
    "Environment=VOID_BUY_REQUEST_DIR=/var/lib/void-buy-request-journal-v1",
    "Environment=VOID_BUY_REQUEST_CUSTODY_READ_GID="+raw,
    "",
  ].join("\n");
}
