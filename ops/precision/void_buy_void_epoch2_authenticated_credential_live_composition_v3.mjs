#!/usr/bin/env node
// Root live-composition runner V3. This source composes the V3R authenticated
// credential transcript. Live authority still requires a separately accepted
// and installed V3 native preentry. Repository modules are not imported.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export const MARKER =
  "VOID_BUY_VOID_EPOCH2_AUTHENTICATED_CREDENTIAL_LIVE_COMPOSITION_V3";
export const CONFIRM =
  "RUN_AUTHENTICATED_EPOCH2_CREDENTIAL_LIVE_COMPOSITION_V3";
export const STATUS =
  "AUTHENTICATED_EPOCH2_CREDENTIAL_LIVE_COMPOSITION_V3_GREEN";
export const NEXT_ACTION =
  "BIND_V3R_AUTHENTICATED_EPOCH2_CREDENTIAL_EVIDENCE_IN_DORMANT_CANDIDATE_SUCCESSOR";
export const SOURCE_NEXT_ACTION =
  "DERIVE_AND_ACCEPT_EPOCH2_LIVE_COMPOSITION_V3_NATIVE_PREENTRY";

const ROOT="/home/zoso/dev/void-node";
const QUALIFIER_REL=
  "ops/precision/void_buy_void_user_manager_credential_query_installed_qualification_v3r.py";
const SEALED_REL=
  "scripts/void_buy_void_epoch2_credential_attestation_sealed_v2.mjs";
const QUALIFIER_BLOB="70b74ff2f09f5aef86eec39b8f643d8f2ebb63f5";
const SEALED_BLOB="14cbe81e27d04fee77cbe75225ce308bf8561a7b";
const SEALED_CONFIRM=
  "probeBuyVoidEpoch2InstalledCredentialSigningCapabilitySealedV2";
const EXPECTED_CREDENTIAL_ID="buy-void-epoch2-fulfiller-v1";
const EXPECTED_CREDENTIAL_LOCK_ID=
  "voidbuyumqcredelflock3r_8b064214e22ce54ac193b426f38b9d6a7ea4cee07b38b68c8d1eeb6c51de6f34";
const EXPECTED_FULFILLER=
  "0x0f0b8aa14e1c9764fa8e4fa8b38fd3d3b8c2498a";
const QUALIFIER_MARKER=
  "VOID_BUY_VOID_USER_MANAGER_CREDENTIAL_QUERY_INSTALLED_QUALIFICATION_V3R";
const QUALIFIER_NEXT_ACTION=
  "BIND_V3R_AUTHENTICATED_CREDENTIAL_METADATA_IN_EPOCH2_LIVE_COMPOSITION_SUCCESSOR";
const SEALED_MARKER=
  "VOID_BUY_VOID_EPOCH2_CREDENTIAL_ATTESTATION_SEALED_V2";
const SEALED_STATUS=
  "EPOCH2_INSTALLED_CREDENTIAL_SIGNING_CAPABILITY_GREEN";
const RUNTIME_UID=1000;
const RUNTIME_GID=1000;
const RUNTIME_HOME="/home/zoso";
const GIT="/usr/bin/git";
const PYTHON="/usr/bin/python3";
const NODE="/usr/bin/node";
const SETPRIV="/usr/bin/setpriv";
const FIXED_ROOT="/opt/void-buy-void-epoch2-live-composition-v3";
const FIXED_PREENTRY=
  FIXED_ROOT+"/void_buy_void_epoch2_live_composition_native_preentry_v3";
const FIXED_RUNNER=
  FIXED_ROOT+"/void_buy_void_epoch2_authenticated_credential_live_composition_v3.mjs";
const PREENTRY_MARKER=
  "VOID_BUY_VOID_EPOCH2_NATIVE_PREENTRY_V3";
const PREENTRY_ENV="VOID_BUY_VOID_EPOCH2_NATIVE_PREENTRY_V3";
const PREENTRY_RUNNER_FD_ENV="VOID_BUY_VOID_EPOCH2_NATIVE_PREENTRY_V3_RUNNER_FD";
const PREENTRY_PROOF_FD_ENV="VOID_BUY_VOID_EPOCH2_NATIVE_PREENTRY_V3_PROOF_FD";
const PREENTRY_PROOF_SCHEMA="VOID_BUY_VOID_EPOCH2_NATIVE_PARENT_PROOF_V3";
const MAX_OUTPUT=2*1024*1024;
const SHA40=/^[0-9a-f]{40}$/u;
const HEX64=/^[0-9a-f]{64}$/u;
const SEALED_ID=/^voide2sealed2_[0-9a-f]{64}$/u;
const QUALIFICATION_KEYS=Object.freeze([
  "marker","version","read_only","root_execution_required",
  "credential_lock_id","credential_v3r_generation_verified",
  "credential_v1_predecessor_verified","credential_v2_predecessor_verified",
  "credential_installed_generation_stable",
  "credential_query_preexec_path_verified","double_credential_query_stable",
  "complete_dropin_set_hash_stable","complete_credential_set_hash_stable",
  "credential_metadata_same_generation_as_v6_security",
  "v6_security_qualification_composed","credential_contents_read",
  "native_output_sha256_first","native_output_sha256_second",
  "runtime_uid","manager_pid","manager_start_ticks","main_pid",
  "service_start_ticks","fragment_path","dropin_path_count",
  "credential_dropin_match_count","credential_dropin_path",
  "dropin_paths_canonical_bytes","dropin_paths_canonical_sha256",
  "load_credential_count","load_credential_target_match_count",
  "load_credential_canonical_bytes","load_credential_canonical_sha256",
  "load_credential_id","credential_source","v6_kernel_cap_last_cap",
  "v6_kernel_supported_capability_mask","v6_capability_bounding_set",
  "v6_kernel_cap_bnd","query_execution","host_mutation","filesystem_write",
  "service_mutation","systemd_mutation","external_network_calls",
  "private_key_access","wallet_or_signer_access",
  "request_or_payment_contents_read","payment_acceptance",
  "public_presale_activation","wc_void_market_activation","transaction",
  "funds_movement","production_host_evidence_authority","next_action",
]);

function sha256(bytes){
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function gitBlobSha1(bytes){
  return crypto.createHash("sha1")
    .update(Buffer.from("blob "+bytes.length+"\0","utf8"))
    .update(bytes)
    .digest("hex");
}

function canonical(value){
  if(value===null)return "null";
  if(typeof value==="boolean")return value?"true":"false";
  if(typeof value==="string")return JSON.stringify(value);
  if(typeof value==="number"){
    if(!Number.isSafeInteger(value))throw new Error("noncanonical_number");
    return String(value);
  }
  if(Array.isArray(value))return "["+value.map(canonical).join(",")+"]";
  if(!value||typeof value!=="object")throw new Error("noncanonical_value");
  return "{"+Object.keys(value).sort()
    .map((key)=>JSON.stringify(key)+":"+canonical(value[key])).join(",")+"}";
}

function exactKeys(value,expected){
  if(!value||typeof value!=="object"||Array.isArray(value)||
     Object.getPrototypeOf(value)!==Object.prototype)return false;
  const got=Object.keys(value).sort();
  const want=[...expected].sort();
  return got.length===want.length&&
    got.every((key,index)=>key===want[index]);
}

function capabilityMaskForLastCap(lastCap){
  if(!Number.isSafeInteger(lastCap)||lastCap<0||lastCap>63){
    throw new Error("qualification_kernel_cap_last_cap_invalid");
  }
  const mask=lastCap===63
    ? ((1n<<64n)-1n)
    : ((1n<<BigInt(lastCap+1))-1n);
  return mask.toString(16).padStart(16,"0");
}

function cleanGitEnv(){
  return {
    PATH:"/usr/bin:/bin",
    HOME:RUNTIME_HOME,
    LANG:"C",
    LC_ALL:"C",
    GIT_OPTIONAL_LOCKS:"0",
    GIT_NO_REPLACE_OBJECTS:"1",
    GIT_CONFIG_NOSYSTEM:"1",
    GIT_CONFIG_GLOBAL:"/dev/null",
    GIT_CONFIG_SYSTEM:"/dev/null",
  };
}

function cleanRootEnv(){
  return {PATH:"/usr/bin:/bin",LANG:"C",LC_ALL:"C"};
}

function safeReason(value){
  const text=String(value??"unknown")
    .replace(/[^A-Za-z0-9_.:-]+/gu,"_")
    .slice(0,240);
  return text||"unknown";
}

function run(command,args,options={}){
  const result=spawnSync(command,args,{
    cwd:options.cwd??ROOT,
    env:options.env??cleanRootEnv(),
    encoding:"utf8",
    input:options.input,
    stdio:["pipe","pipe","pipe"],
    timeout:options.timeout??60_000,
    maxBuffer:MAX_OUTPUT,
  });
  if(result.error)throw new Error("spawn_error:"+safeReason(result.error.message));
  return result;
}

function assertTrustedExecutable(file){
  const real=fs.realpathSync(file);
  const st=fs.lstatSync(real,{bigint:true});
  if(!st.isFile()||st.isSymbolicLink()||st.uid!==0n||
     (st.mode&0o022n)!==0n){
    throw new Error("trusted_executable_invalid:"+path.basename(file));
  }
  return real;
}

function sameFileIdentity(left,right){
  return left.dev===right.dev&&
    left.ino===right.ino&&
    left.uid===right.uid&&
    left.gid===right.gid&&
    left.mode===right.mode&&
    left.nlink===right.nlink&&
    left.size===right.size;
}

function readProcStartTicks(pid){
  if(!Number.isSafeInteger(pid)||pid<=1){
    throw new Error("native_preentry_process_pid_invalid");
  }
  const raw=fs.readFileSync("/proc/"+String(pid)+"/stat","utf8");
  const right=raw.lastIndexOf(")");
  if(right<0||raw[right+1]!==" "){
    throw new Error("native_preentry_process_stat_invalid");
  }
  const fields=raw.slice(right+2).trim().split(/\s+/u);
  const value=fields[19];
  if(!/^[1-9][0-9]*$/u.test(String(value||""))){
    throw new Error("native_preentry_process_start_ticks_invalid");
  }
  return String(value);
}

function parseNativeParentProof(fd){
  let raw;
  try{
    raw=fs.readFileSync(fd,{encoding:"utf8"});
  }finally{
    try{fs.closeSync(fd);}catch(closeError){void closeError;}
  }
  if(Buffer.byteLength(raw,"utf8")<2||Buffer.byteLength(raw,"utf8")>2048){
    throw new Error("native_preentry_parent_proof_size_invalid");
  }
  let proof;
  try{proof=JSON.parse(raw);}
  catch{throw new Error("native_preentry_parent_proof_json_invalid");}
  if(!proof||typeof proof!=="object"||Array.isArray(proof)){
    throw new Error("native_preentry_parent_proof_object_invalid");
  }
  const keys=Object.keys(proof).sort();
  const expected=[
    "schema",
    "parent_pid",
    "parent_start_ticks",
    "child_pid",
    "child_start_ticks",
    "preentry_dev",
    "preentry_ino",
    "runner_dev",
    "runner_ino",
    "node_dev",
    "node_ino",
    "expected_head",
  ].sort();
  if(JSON.stringify(keys)!==JSON.stringify(expected)){
    throw new Error("native_preentry_parent_proof_schema_invalid");
  }
  if(proof.schema!==PREENTRY_PROOF_SCHEMA||
     !Number.isSafeInteger(proof.parent_pid)||proof.parent_pid<=1||
     !Number.isSafeInteger(proof.child_pid)||proof.child_pid<=1||
     !SHA40.test(String(proof.expected_head||""))){
    throw new Error("native_preentry_parent_proof_identity_invalid");
  }
  for(const key of [
    "parent_start_ticks","child_start_ticks",
    "preentry_dev","preentry_ino",
    "runner_dev","runner_ino",
    "node_dev","node_ino",
  ]){
    if(!/^[1-9][0-9]*$/u.test(String(proof[key]||""))){
      throw new Error("native_preentry_parent_proof_field_invalid:"+key);
    }
  }
  return Object.freeze(proof);
}

function revalidateNativePreentry(proof,expectedHead){
  if(proof.expected_head!==expectedHead){
    throw new Error("native_preentry_expected_head_proof_mismatch");
  }
  if(process.pid!==proof.child_pid||process.ppid!==proof.parent_pid){
    throw new Error("native_preentry_parent_child_pid_mismatch");
  }
  if(readProcStartTicks(process.pid)!==proof.child_start_ticks||
     readProcStartTicks(process.ppid)!==proof.parent_start_ticks){
    throw new Error("native_preentry_parent_child_generation_mismatch");
  }

  let parentExe;
  try{parentExe=fs.realpathSync.native("/proc/"+String(process.ppid)+"/exe");}
  catch{throw new Error("native_preentry_parent_executable_unavailable");}
  if(parentExe!==FIXED_PREENTRY){
    throw new Error("native_preentry_parent_executable_mismatch");
  }

  const preentry=fs.lstatSync(FIXED_PREENTRY,{bigint:true});
  const visibleRunner=fs.lstatSync(FIXED_RUNNER,{bigint:true});
  const node=fs.lstatSync(fs.realpathSync(NODE),{bigint:true});
  const fdRaw=String(process.env[PREENTRY_RUNNER_FD_ENV]??"");
  if(!/^[0-9]{1,3}$/u.test(fdRaw)){
    throw new Error("native_preentry_runner_fd_invalid");
  }
  const runnerFd=Number(fdRaw);
  if(!Number.isSafeInteger(runnerFd)||runnerFd<3){
    throw new Error("native_preentry_runner_fd_invalid");
  }
  const retainedRunner=fs.fstatSync(runnerFd,{bigint:true});

  const pairs=[
    ["preentry_dev",preentry.dev],
    ["preentry_ino",preentry.ino],
    ["runner_dev",retainedRunner.dev],
    ["runner_ino",retainedRunner.ino],
    ["node_dev",node.dev],
    ["node_ino",node.ino],
  ];
  for(const [key,value] of pairs){
    if(String(value)!==proof[key]){
      throw new Error("native_preentry_installed_generation_mismatch:"+key);
    }
  }
  if(!retainedRunner.isFile()||visibleRunner.isSymbolicLink()||
     !visibleRunner.isFile()||retainedRunner.uid!==0n||
     (retainedRunner.mode&0o022n)!==0n||
     !sameFileIdentity(retainedRunner,visibleRunner)){
    throw new Error("native_preentry_runner_generation_invalid");
  }
  if(fs.realpathSync(process.execPath)!==fs.realpathSync(NODE)){
    throw new Error("native_preentry_node_executable_mismatch");
  }
  return true;
}

function requireNativePreentry(expectedHead){
  if(process.argv[1]!==FIXED_RUNNER){
    throw new Error("native_preentry_fixed_runner_required");
  }
  if(process.env[PREENTRY_ENV]!==PREENTRY_MARKER){
    throw new Error("native_preentry_marker_required");
  }
  for(const name of [
    "NODE_OPTIONS","NODE_PATH","LD_PRELOAD","LD_LIBRARY_PATH","LD_AUDIT",
  ]){
    if(Object.hasOwn(process.env,name)){
      throw new Error("native_preentry_loader_environment_not_clean:"+name);
    }
  }
  const proofFdRaw=String(process.env[PREENTRY_PROOF_FD_ENV]??"");
  if(!/^[0-9]{1,3}$/u.test(proofFdRaw)){
    throw new Error("native_preentry_proof_fd_invalid");
  }
  const proofFd=Number(proofFdRaw);
  if(!Number.isSafeInteger(proofFd)||proofFd<3){
    throw new Error("native_preentry_proof_fd_invalid");
  }
  const proof=parseNativeParentProof(proofFd);
  revalidateNativePreentry(proof,expectedHead);
  return proof;
}

function runAsRuntimeUser(command,args,options={}){
  return run(SETPRIV,[
    "--no-new-privs",
    "--reuid="+String(RUNTIME_UID),
    "--regid="+String(RUNTIME_GID),
    "--clear-groups",
    command,
    ...args,
  ],{
    cwd:options.cwd??ROOT,
    env:options.env??cleanGitEnv(),
    input:options.input,
    timeout:options.timeout??60_000,
  });
}

function git(args){
  const r=runAsRuntimeUser(GIT,[
    "-c","core.fsmonitor=false",
    "-c","core.hooksPath=/dev/null",
    ...args,
  ],{env:cleanGitEnv(),timeout:15_000});
  if(r.status!==0)throw new Error("git_failed:"+args[0]);
  if(r.stderr!=="")throw new Error("git_unexpected_stderr:"+args[0]);
  return r.stdout;
}

function requireExactCheckout(expectedHead){
  if(!SHA40.test(expectedHead))throw new Error("expected_head_invalid");
  const head=git(["rev-parse","--verify","HEAD"]).trim();
  if(head!==expectedHead)throw new Error("expected_head_mismatch");
  if(git(["branch","--show-current"]).trim()!=="main"){
    throw new Error("branch_not_main");
  }
  if(git(["status","--porcelain=v1","--untracked-files=all"])!==""){
    throw new Error("worktree_not_clean");
  }
  return head;
}

function gitObject(expectedHead,relative,expectedBlob){
  const r=runAsRuntimeUser(GIT,[
    "-c","core.fsmonitor=false",
    "-c","core.hooksPath=/dev/null",
    "show",expectedHead+":"+relative,
  ],{env:cleanGitEnv(),timeout:15_000});
  if(r.status!==0||r.stderr!=="")throw new Error("git_object_unavailable:"+relative);
  const bytes=Buffer.from(r.stdout,"utf8");
  if(gitBlobSha1(bytes)!==expectedBlob){
    bytes.fill(0);
    throw new Error("git_object_blob_mismatch:"+relative);
  }
  return bytes;
}

export function parseQualificationStdout(stdout){
  if(typeof stdout!=="string"||stdout.length<1||
     Buffer.byteLength(stdout,"utf8")>MAX_OUTPUT){
    throw new Error("qualification_output_invalid");
  }
  const lines=stdout.split("\n").filter((line)=>line.length>0);
  const matches=lines.filter((line)=>line.startsWith("result_json="));
  if(matches.length!==1)throw new Error("qualification_result_json_cardinality");
  let value;
  try{value=JSON.parse(matches[0].slice("result_json=".length));}
  catch{throw new Error("qualification_result_json_invalid");}
  if(!value||typeof value!=="object"||Array.isArray(value)){
    throw new Error("qualification_result_object_invalid");
  }
  return value;
}

function validateQualification(q){
  if(!exactKeys(q,QUALIFICATION_KEYS)){
    throw new Error("qualification_shape_invalid");
  }
  for(const [key,want] of Object.entries({
    marker:QUALIFIER_MARKER,
    version:3,
    read_only:true,
    root_execution_required:true,
    credential_lock_id:EXPECTED_CREDENTIAL_LOCK_ID,
    credential_v3r_generation_verified:true,
    credential_v1_predecessor_verified:true,
    credential_v2_predecessor_verified:true,
    credential_installed_generation_stable:true,
    credential_query_preexec_path_verified:true,
    double_credential_query_stable:true,
    complete_dropin_set_hash_stable:true,
    complete_credential_set_hash_stable:true,
    credential_metadata_same_generation_as_v6_security:true,
    v6_security_qualification_composed:true,
    credential_contents_read:false,
    credential_dropin_match_count:1,
    load_credential_target_match_count:1,
    load_credential_id:EXPECTED_CREDENTIAL_ID,
    query_execution:true,
    host_mutation:false,
    filesystem_write:false,
    service_mutation:false,
    systemd_mutation:false,
    external_network_calls:false,
    private_key_access:false,
    wallet_or_signer_access:false,
    request_or_payment_contents_read:false,
    payment_acceptance:false,
    public_presale_activation:false,
    wc_void_market_activation:false,
    transaction:false,
    funds_movement:false,
    production_host_evidence_authority:false,
    next_action:QUALIFIER_NEXT_ACTION,
  })){
    if(q?.[key]!==want)throw new Error("qualification_field_invalid:"+key);
  }
  if(!Number.isSafeInteger(q.runtime_uid)||q.runtime_uid!==RUNTIME_UID||
     !Number.isSafeInteger(q.main_pid)||q.main_pid<=1||
     !Number.isSafeInteger(q.manager_pid)||q.manager_pid<=1){
    throw new Error("qualification_identity_invalid");
  }
  if(!/^[1-9][0-9]*$/u.test(String(q.manager_start_ticks||""))||
     !/^[1-9][0-9]*$/u.test(String(q.service_start_ticks||""))){
    throw new Error("qualification_generation_ticks_invalid");
  }
  for(const [key,value] of [
    ["fragment_path",q.fragment_path],
    ["credential_dropin_path",q.credential_dropin_path],
    ["credential_source",q.credential_source],
  ]){
    if(typeof value!=="string"||!path.posix.isAbsolute(value)||
       path.posix.normalize(value)!==value||value.includes("//")){
      throw new Error("qualification_path_invalid:"+key);
    }
  }
  if(path.posix.basename(q.credential_dropin_path)!==
     "97-buy-void-epoch2-fulfiller-credential-v1.conf"){
    throw new Error("qualification_credential_dropin_invalid");
  }
  if(!Number.isSafeInteger(q.dropin_path_count)||q.dropin_path_count<1||
     q.dropin_path_count>64||
     !Number.isSafeInteger(q.dropin_paths_canonical_bytes)||
     q.dropin_paths_canonical_bytes<1||
     q.dropin_paths_canonical_bytes>64*1024){
    throw new Error("qualification_dropin_set_bounds_invalid");
  }
  if(!Number.isSafeInteger(q.load_credential_count)||
     q.load_credential_count<1||q.load_credential_count>32||
     !Number.isSafeInteger(q.load_credential_canonical_bytes)||
     q.load_credential_canonical_bytes<1||
     q.load_credential_canonical_bytes>64*1024){
    throw new Error("qualification_credential_set_bounds_invalid");
  }
  for(const key of [
    "dropin_paths_canonical_sha256",
    "load_credential_canonical_sha256",
  ]){
    if(!/^[0-9a-f]{64}$/u.test(String(q[key]||""))){
      throw new Error("qualification_complete_set_hash_invalid:"+key);
    }
  }
  if(typeof q.native_output_sha256_first!=="string"||
     q.native_output_sha256_first!==q.native_output_sha256_second||
     !/^sha256:[0-9a-f]{64}$/u.test(q.native_output_sha256_first)){
    throw new Error("qualification_native_transcript_invalid");
  }
  for(const key of [
    "v6_kernel_supported_capability_mask",
    "v6_capability_bounding_set",
    "v6_kernel_cap_bnd",
  ]){
    if(!/^[0-9a-f]{16}$/u.test(String(q[key]||""))){
      throw new Error("qualification_capability_mask_invalid:"+key);
    }
  }
  const supported=capabilityMaskForLastCap(q.v6_kernel_cap_last_cap);
  if(q.v6_kernel_supported_capability_mask!==supported||
     q.v6_capability_bounding_set!==q.v6_kernel_cap_bnd||
     (BigInt("0x"+q.v6_kernel_cap_bnd)&~BigInt("0x"+supported))!==0n){
    throw new Error("qualification_capability_binding_invalid");
  }
}

function pythonBootstrap(source){
  const absolute=path.join(ROOT,QUALIFIER_REL);
  const encoded=source.toString("base64");
  return [
    "import base64,sys",
    "source=base64.b64decode("+JSON.stringify(encoded)+")",
    "path="+JSON.stringify(absolute),
    "sys.argv=[path,'--run']",
    "scope={'__name__':'__main__','__file__':path,'__package__':''}",
    "exec(compile(source,path,'exec',dont_inherit=True),scope)",
    "",
  ].join("\n");
}

function runQualification(expectedHead){
  const source=gitObject(expectedHead,QUALIFIER_REL,QUALIFIER_BLOB);
  try{
    const bootstrap=pythonBootstrap(source);
    const r=run(PYTHON,["-I","-B","-"],{
      env:cleanRootEnv(),
      input:bootstrap,
      timeout:60_000,
    });
    if(r.status!==0)throw new Error("credential_qualification_failed:"+String(r.status));
    if(r.stderr!=="")throw new Error("credential_qualification_unexpected_stderr");
    const parsed=parseQualificationStdout(r.stdout);
    validateQualification(parsed);
    return parsed;
  }finally{
    source.fill(0);
  }
}

function validateSealedRecord(record,expectedHead){
  if(!record||typeof record!=="object"||Array.isArray(record)){
    throw new Error("sealed_record_invalid");
  }
  for(const [key,want] of Object.entries({
    marker:SEALED_MARKER,
    version:2,
    status:SEALED_STATUS,
    source_head:expectedHead,
    source_branch:"main",
    sealed_probe_git_blob:SEALED_BLOB,
    credential_id:EXPECTED_CREDENTIAL_ID,
    immutable_fulfiller:EXPECTED_FULFILLER,
    credential_content_read:true,
    immutable_fulfiller_identity_proven:true,
    active_signing_capability_proven:true,
    privileged_first_entry_authenticated:false,
    credential_generation_retained_through_signing:true,
    credential_generation_revalidated_after_final_observation:true,
    credential_generation_revalidated_immediately_before_close:true,
    root_owned_node_binary_verified:true,
    node_loader_environment_empty:true,
    native_loader_environment_empty:true,
    raw_private_key_output:false,
    private_key_string_materialization:false,
    raw_signed_transaction_output:false,
    rpc_call_performed:false,
    transaction_constructed:false,
    transaction_broadcast_performed:false,
    transaction_submission_performed:false,
    filesystem_write_performed:false,
    runtime_activation_authorized:false,
    public_payment_acceptance_authorized:false,
    presale_activation_authorized:false,
    funds_movement:false,
  })){
    if(record[key]!==want)throw new Error("sealed_field_invalid:"+key);
  }
  if(!SEALED_ID.test(String(record.evidence_id||""))||
     !SHA40.test(String(record.source_tree||""))||
     record.systemd?.service!=="void-node-live.service"||
     !Number.isSafeInteger(record.systemd?.main_pid)||
     record.systemd.main_pid<=1||
     !HEX64.test(String(record.systemd?.loadcredential_binding_sha256||""))||
     !HEX64.test(String(record.systemd?.main_pid_cgroup_sha256||""))){
    throw new Error("sealed_binding_invalid");
  }
  if(record.systemd.process_source_commit!==expectedHead||
     record.systemd.process_source_tree!==record.source_tree||
     record.systemd.process_source_branch!=="main"){
    throw new Error("sealed_process_source_invalid");
  }
}

function runSealedProbe(expectedHead){
  const source=gitObject(expectedHead,SEALED_REL,SEALED_BLOB);
  try{
    const r=runAsRuntimeUser(NODE,[
      "--input-type=module",
      "-",
      "--probe",
      "--confirm",
      SEALED_CONFIRM,
      "--expected-head",
      expectedHead,
    ],{
      env:cleanGitEnv(),
      input:source,
      timeout:45_000,
    });
    if(r.status!==0){
      let reason="sealed_probe_failed:"+String(r.status);
      try{
        const held=JSON.parse(String(r.stderr||""));
        if(held&&typeof held.reason==="string")reason=held.reason;
      }catch(parseError){
        if(parseError instanceof Error)void parseError.message;
      }
      throw new Error(reason);
    }
    if(r.stderr!=="")throw new Error("sealed_probe_unexpected_stderr");
    let record;
    try{record=JSON.parse(r.stdout);}
    catch{throw new Error("sealed_probe_json_invalid");}
    validateSealedRecord(record,expectedHead);
    return record;
  }finally{
    source.fill(0);
  }
}

function crossCheck(record,q){
  if(record.systemd.main_pid!==q.main_pid){
    throw new Error("main_pid_crosscheck_failed");
  }
  const binding=q.load_credential_id+":"+q.credential_source;
  if(sha256(Buffer.from(binding,"utf8"))!==
     record.systemd.loadcredential_binding_sha256){
    throw new Error("loadcredential_binding_crosscheck_failed");
  }
  const cgroup=
    "0::/user.slice/user-"+String(q.runtime_uid)+
    ".slice/user@"+String(q.runtime_uid)+
    ".service/app.slice/void-node-live.service\n";
  if(sha256(Buffer.from(cgroup,"utf8"))!==
     record.systemd.main_pid_cgroup_sha256){
    throw new Error("service_cgroup_hash_crosscheck_failed");
  }
}

export function buildReceipt({
  expectedHead,
  qualification,
  sealedRecord,
}){
  const body={
    marker:MARKER,
    version:3,
    status:STATUS,
    source_head:expectedHead,
    sealed_public_evidence:sealedRecord,
    credential_lock_id:qualification.credential_lock_id,
    credential_qualification_sha256:
      sha256(Buffer.from(canonical(qualification),"utf8")),
    credential_complete_dropin_set_sha256:
      qualification.dropin_paths_canonical_sha256,
    credential_complete_dropin_set_count:
      qualification.dropin_path_count,
    credential_complete_credential_set_sha256:
      qualification.load_credential_canonical_sha256,
    credential_complete_credential_set_count:
      qualification.load_credential_count,
    credential_epoch2_target_match_count:
      qualification.load_credential_target_match_count,
    runtime_uid:qualification.runtime_uid,
    manager_pid:qualification.manager_pid,
    manager_start_ticks:String(qualification.manager_start_ticks),
    main_pid:qualification.main_pid,
    service_start_ticks:String(qualification.service_start_ticks),
    signer_address:sealedRecord.immutable_fulfiller,
    qualification_provenance_authenticated_by_runner:true,
    privileged_first_entry_authenticated:true,
    native_preentry_policy_bound:true,
    root_node_descriptor_execution_bound:true,
    runner_retained_descriptor_bound:true,
    native_parent_retained_for_child_lifetime:true,
    native_parent_process_generation_bound:true,
    native_parent_installed_generation_bound:true,
    native_parent_revalidated_after_sensitive_sequence:true,
    stdin_javascript_source_forbidden:true,
    qualification_stable_before_after_sealed_probe:true,
    checkout_revalidated_after_sensitive_sequence:true,
    complete_dropin_set_bound_across_signing_window:true,
    complete_credential_set_bound_across_signing_window:true,
    main_pid_crosscheck:true,
    loadcredential_binding_crosscheck:true,
    service_cgroup_hash_crosscheck:true,
    public_user_bus_sufficient_authority:false,
    credential_content_access_in_sealed_child:true,
    credential_content_access_in_runner_parent:false,
    private_key_material_in_sealed_child:true,
    private_key_output:false,
    nontransaction_signature_performed:true,
    transaction_constructed:false,
    transaction_submitted:false,
    transaction_broadcast:false,
    rpc_call:false,
    filesystem_write:false,
    host_mutation:false,
    service_mutation:false,
    systemd_mutation:false,
    payment_acceptance:false,
    public_presale_activation:false,
    wc_void_market_activation:false,
    funds_movement:false,
    production_host_evidence_authority:false,
    next_action:NEXT_ACTION,
  };
  return Object.freeze({
    ...body,
    receipt_id:
      "voide2livecomp3_"+sha256(Buffer.from(canonical(body),"utf8")),
  });
}

function plan(){
  console.log(MARKER);
  console.log("mode=plan");
  console.log("source_generation=v3r_credential_composition");
  console.log("protected_native_entry_accepted_by_this_pr=false");
  console.log("protected_native_entry_install_authorized=false");
  console.log("live_execution_authorized=false");
  console.log("future_v3_native_preentry_required_for_live=true");
  console.log("root_owned_fixed_runner_required=true");
  console.log("retained_runner_descriptor_required=true");
  console.log("native_parent_retained_for_child_lifetime_required=true");
  console.log("native_parent_process_generation_proof_required=true");
  console.log("native_parent_installed_generation_proof_required=true");
  console.log("native_parent_revalidation_after_sensitive_sequence_required=true");
  console.log("root_node_descriptor_execution_required=true");
  console.log("stdin_javascript_source_forbidden=true");
  console.log("root_required_for_future_run=true");
  console.log("runtime_uid="+String(RUNTIME_UID));
  console.log("credential_v3r_v6_qualification_required=true");
  console.log("complete_dropin_set_hash_binding_required=true");
  console.log("complete_credential_set_hash_binding_required=true");
  console.log("qualification_before_after_sealed_probe_required=true");
  console.log("checkout_revalidation_after_sensitive_sequence_required=true");
  console.log("sealed_git_object_probe_required=true");
  console.log("sealed_probe_runs_as_runtime_uid=true");
  console.log("credential_content_access=false");
  console.log("private_key_access=false");
  console.log("nontransaction_signature=false");
  console.log("transaction=false");
  console.log("rpc_call=false");
  console.log("filesystem_write=false");
  console.log("host_mutation=false");
  console.log("service_mutation=false");
  console.log("systemd_mutation=false");
  console.log("payment_acceptance=false");
  console.log("public_presale_activation=false");
  console.log("wc_void_market_activation=false");
  console.log("funds_movement=false");
  console.log("production_host_evidence_authority=false");
  console.log("next_action="+SOURCE_NEXT_ACTION);
}

function selfTest(){
  const synthetic={
    marker:"x",
    version:1,
    main_pid:4242,
    nested:{a:true,b:"z"},
  };
  const stdout="marker\nresult_json="+JSON.stringify(synthetic)+"\n";
  const parsed=parseQualificationStdout(stdout);
  if(canonical(parsed)!==canonical(synthetic)){
    throw new Error("qualification_parser_self_test_failed");
  }
  const q={
    marker:QUALIFIER_MARKER,
    version:3,
    read_only:true,
    root_execution_required:true,
    credential_lock_id:EXPECTED_CREDENTIAL_LOCK_ID,
    credential_v3r_generation_verified:true,
    credential_v1_predecessor_verified:true,
    credential_v2_predecessor_verified:true,
    credential_installed_generation_stable:true,
    credential_query_preexec_path_verified:true,
    double_credential_query_stable:true,
    complete_dropin_set_hash_stable:true,
    complete_credential_set_hash_stable:true,
    credential_metadata_same_generation_as_v6_security:true,
    v6_security_qualification_composed:true,
    credential_contents_read:false,
    native_output_sha256_first:"sha256:"+"c".repeat(64),
    native_output_sha256_second:"sha256:"+"c".repeat(64),
    runtime_uid:1000,
    manager_pid:2693,
    manager_start_ticks:"1409",
    main_pid:4242,
    service_start_ticks:"998877",
    fragment_path:"/usr/lib/systemd/user/void-node-live.service",
    dropin_path_count:2,
    credential_dropin_match_count:1,
    credential_dropin_path:
      "/home/zoso/.config/systemd/user/void-node-live.service.d/"+
      "97-buy-void-epoch2-fulfiller-credential-v1.conf",
    dropin_paths_canonical_bytes:256,
    dropin_paths_canonical_sha256:"a".repeat(64),
    load_credential_count:4,
    load_credential_target_match_count:1,
    load_credential_canonical_bytes:512,
    load_credential_canonical_sha256:"b".repeat(64),
    load_credential_id:EXPECTED_CREDENTIAL_ID,
    credential_source:"/home/zoso/.local/share/void-epoch2/credential",
    v6_kernel_cap_last_cap:40,
    v6_kernel_supported_capability_mask:"000001ffffffffff",
    v6_capability_bounding_set:"000001ffffffffff",
    v6_kernel_cap_bnd:"000001ffffffffff",
    query_execution:true,
    host_mutation:false,
    filesystem_write:false,
    service_mutation:false,
    systemd_mutation:false,
    external_network_calls:false,
    private_key_access:false,
    wallet_or_signer_access:false,
    request_or_payment_contents_read:false,
    payment_acceptance:false,
    public_presale_activation:false,
    wc_void_market_activation:false,
    transaction:false,
    funds_movement:false,
    production_host_evidence_authority:false,
    next_action:QUALIFIER_NEXT_ACTION,
  };
  validateQualification(q);
  const sealed={
    evidence_id:"voide2sealed1_"+"b".repeat(64),
    immutable_fulfiller:EXPECTED_FULFILLER,
  };
  const receipt=buildReceipt({
    expectedHead:"c".repeat(40),
    qualification:q,
    sealedRecord:sealed,
  });
  if(!/^voide2livecomp3_[0-9a-f]{64}$/u.test(receipt.receipt_id)){
    throw new Error("receipt_id_self_test_failed");
  }
  if(receipt.production_host_evidence_authority!==false||
     receipt.transaction_constructed!==false||
     receipt.funds_movement!==false||
     receipt.credential_content_access_in_runner_parent!==false||
     receipt.privileged_first_entry_authenticated!==true||
     receipt.native_parent_retained_for_child_lifetime!==true||
     receipt.native_parent_process_generation_bound!==true||
     receipt.native_parent_installed_generation_bound!==true||
     receipt.native_parent_revalidated_after_sensitive_sequence!==true||
     receipt.stdin_javascript_source_forbidden!==true||
     receipt.complete_dropin_set_bound_across_signing_window!==true||
     receipt.complete_credential_set_bound_across_signing_window!==true||
     receipt.credential_complete_dropin_set_sha256!=="a".repeat(64)||
     receipt.credential_complete_credential_set_sha256!=="b".repeat(64)){
    throw new Error("authority_self_test_failed");
  }
  for(const mutate of [
    (x)=>{x.load_credential_count=33;},
    (x)=>{x.dropin_path_count=65;},
    (x)=>{x.load_credential_target_match_count=2;},
    (x)=>{x.dropin_paths_canonical_sha256="g".repeat(64);},
    (x)=>{x.manager_start_ticks="0";},
    (x)=>{x.v6_kernel_supported_capability_mask="ffffffffffffffff";},
    (x)=>{x.payment_acceptance=true;},
  ]){
    const bad=structuredClone(q);
    mutate(bad);
    let held=false;
    try{validateQualification(bad);}catch{held=true;}
    if(!held)throw new Error("qualification_adversary_accepted");
  }


  let checkoutCount=0;
  const stableSequence=runSensitiveSequence({
    expectedHead:"d".repeat(40),
    checkoutFn:()=>{checkoutCount+=1; return "d".repeat(40);},
    qualificationFn:()=>({...q}),
    sealedFn:()=>({...sealed}),
    crossFn:()=>{},
  });
  if(checkoutCount!==2||
     stableSequence.checkout_revalidated_after_sensitive_sequence!==true){
    throw new Error("final_checkout_revalidation_self_test_failed");
  }

  let driftChecks=0;
  try{
    runSensitiveSequence({
      expectedHead:"e".repeat(40),
      checkoutFn:()=>{
        driftChecks+=1;
        if(driftChecks===2)throw new Error("late_source_drift");
        return "e".repeat(40);
      },
      qualificationFn:()=>({...q}),
      sealedFn:()=>({...sealed}),
      crossFn:()=>{},
    });
  }catch(error){
    if(error?.message!=="late_source_drift")throw error;
  }
  if(driftChecks!==2){
    throw new Error("late_source_drift_not_detected");
  }

  let preAuthFailure=null;
  try{
    runLiveLifecycle({
      expectedHead:"f".repeat(40),
      confirm:CONFIRM,
      euidFn:()=>0,
      nativeFn:()=>{throw new Error("pre_native_auth_injected_failure");},
      trustedExecutablesFn:()=>{},
      sensitiveFn:()=>{throw new Error("pre_auth_sensitive_unreachable");},
      revalidateFn:()=>{},
      emitFn:()=>{},
    });
  }catch(error){
    preAuthFailure=error;
  }
  if(preAuthFailure===null||
     buildHoldReceipt(preAuthFailure).privileged_first_entry_authenticated!==false){
    throw new Error("pre_native_auth_hold_receipt_not_false");
  }

  let postAuthFailure=null;
  try{
    runLiveLifecycle({
      expectedHead:"1".repeat(40),
      confirm:CONFIRM,
      euidFn:()=>0,
      nativeFn:()=>({native_proof:true}),
      trustedExecutablesFn:()=>{},
      sensitiveFn:()=>{throw new Error("post_native_auth_injected_failure");},
      revalidateFn:()=>{},
      emitFn:()=>{},
    });
  }catch(error){
    postAuthFailure=error;
  }
  if(postAuthFailure===null||
     buildHoldReceipt(postAuthFailure).privileged_first_entry_authenticated!==true){
    throw new Error("post_native_auth_hold_receipt_not_true");
  }
  privilegedFirstEntryAuthenticatedForInvocation=false;

  console.log(MARKER+"_SELF_TEST_GREEN");
  console.log("native_preentry_required_for_live=true");
  console.log("native_parent_retained_for_child_lifetime=true");
  console.log("native_parent_process_generation_bound=true");
  console.log("native_parent_installed_generation_bound=true");
  console.log("native_parent_revalidated_after_sensitive_sequence=true");
  console.log("qualification_parser_closed=true");
  console.log("receipt_content_addressed=true");
  console.log("final_checkout_revalidation_required=true");
  console.log("late_source_drift_blocks_receipt=true");
  console.log("pre_native_auth_failure_receipt_false=true");
  console.log("post_native_auth_failure_receipt_true=true");
  console.log("truthful_hold_lifecycle_stage=true");
  console.log("runner_parent_credential_content_access=false");
  console.log("sealed_child_credential_content_access=true");
  console.log("nontransaction_signature_only=true");
  console.log("transaction=false");
  console.log("funds_movement=false");
}

function runSensitiveSequence({
  expectedHead,
  checkoutFn=requireExactCheckout,
  qualificationFn=runQualification,
  sealedFn=runSealedProbe,
  crossFn=crossCheck,
}){
  checkoutFn(expectedHead);

  const before=qualificationFn(expectedHead);
  const sealedRecord=sealedFn(expectedHead);
  const after=qualificationFn(expectedHead);

  if(canonical(before)!==canonical(after)){
    throw new Error("qualification_changed_across_sealed_probe");
  }
  crossFn(sealedRecord,before);

  // Close the source-generation window after all sensitive observations and
  // before constructing or emitting a receipt.
  checkoutFn(expectedHead);

  return buildReceipt({
    expectedHead,
    qualification:before,
    sealedRecord,
  });
}

let privilegedFirstEntryAuthenticatedForInvocation=false;

function runLiveLifecycle({
  expectedHead,
  confirm,
  euidFn=()=>(
    typeof process.geteuid==="function" ? process.geteuid() : -1
  ),
  nativeFn=requireNativePreentry,
  trustedExecutablesFn=()=>{
    assertTrustedExecutable(GIT);
    assertTrustedExecutable(PYTHON);
    assertTrustedExecutable(NODE);
    assertTrustedExecutable(SETPRIV);
  },
  sensitiveFn=runSensitiveSequence,
  revalidateFn=revalidateNativePreentry,
  emitFn=(receipt)=>console.log(JSON.stringify(receipt,null,2)),
}){
  privilegedFirstEntryAuthenticatedForInvocation=false;
  if(confirm!==CONFIRM)throw new Error("explicit_live_confirmation_required");
  if(euidFn()!==0){
    throw new Error("root_required_for_live_composition");
  }

  const nativeProof=nativeFn(expectedHead);
  privilegedFirstEntryAuthenticatedForInvocation=true;

  trustedExecutablesFn();
  const receipt=sensitiveFn({expectedHead});
  revalidateFn(nativeProof,expectedHead);
  emitFn(receipt);
  return receipt;
}

function live(expectedHead,confirm){
  return runLiveLifecycle({expectedHead,confirm});
}

function main(){
  const args=process.argv.slice(2);
  if(args.length===1&&args[0]==="--self-test"){
    selfTest();
    return;
  }
  if(args.length===1&&args[0]==="--plan"){
    plan();
    return;
  }
  if(args[0]==="--run"){
    const confirmAt=args.indexOf("--confirm");
    const headAt=args.indexOf("--expected-head");
    const confirm=confirmAt>=0?args[confirmAt+1]:"";
    const expectedHead=headAt>=0?args[headAt+1]:"";
    if(!expectedHead)throw new Error("expected_head_required");
    live(expectedHead,confirm);
    return;
  }
  throw new Error(
    "usage: runner --self-test | --plan | --run --confirm <token> --expected-head <sha>"
  );
}

function buildHoldReceipt(error){
  return Object.freeze({
    marker:MARKER+"_HOLD",
    status:"HOLD",
    reason:safeReason(error?.message||error),
    credential_content_access_state:"unknown_or_partial_if_live_started",
    private_key_output:false,
    transaction_constructed:false,
    transaction_submitted:false,
    transaction_broadcast:false,
    rpc_call:false,
    filesystem_write:false,
    host_mutation:false,
    service_mutation:false,
    systemd_mutation:false,
    payment_acceptance:false,
    public_presale_activation:false,
    wc_void_market_activation:false,
    funds_movement:false,
    production_host_evidence_authority:false,
    privileged_first_entry_authenticated:
      privilegedFirstEntryAuthenticatedForInvocation,
  });
}

function printHold(error){
  console.error(JSON.stringify(buildHoldReceipt(error),null,2));
}

const directFileExecution=process.argv[1]&&
  path.resolve(process.argv[1])===fileURLToPath(import.meta.url);

if(directFileExecution){
  try{main();}catch(error){printHold(error);process.exitCode=2;}
}
