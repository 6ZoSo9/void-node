#!/usr/bin/env node
// Root live-composition runner V4. The installed V3 native preentry remains
// runtime-policy authority; this successor separates that runtime head from the
// canonical source checkout head. Repository modules are not imported.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export const MARKER =
  "VOID_BUY_VOID_EPOCH2_AUTHENTICATED_CREDENTIAL_LIVE_COMPOSITION_V4";
export const CONFIRM =
  "RUN_AUTHENTICATED_EPOCH2_CREDENTIAL_LIVE_COMPOSITION_V3";
export const STATUS =
  "AUTHENTICATED_EPOCH2_CREDENTIAL_LIVE_COMPOSITION_V4_GREEN_SOURCE_RUNTIME_COMPATIBILITY_EXACT";
export const NEXT_ACTION =
  "BIND_V3R_AUTHENTICATED_EPOCH2_CREDENTIAL_EVIDENCE_IN_DORMANT_CANDIDATE_V3_SUCCESSOR";
export const SOURCE_NEXT_ACTION =
  "DERIVE_AND_ACCEPT_EPOCH2_LIVE_COMPOSITION_V6R3_RUNNER_POLICY_UPGRADE";

const ROOT="/home/zoso/dev/void-node";
const QUALIFIER_REL=
  "ops/precision/void_buy_void_user_manager_credential_query_installed_qualification_v3r.py";
const SEALED_REL=
  "scripts/void_buy_void_epoch2_credential_attestation_sealed_v2.mjs";
const QUALIFIER_BLOB="74c69fe8a95ed5f361a39971618f43f7c768c865";
const QUALIFIER_REPLACEMENT_REL=
  "ops/precision/void_buy_void_user_manager_credential_query_protected_replace_v3r.py";
const QUALIFIER_REPLACEMENT_BLOB="98f8b9fda89e33c50e19008268d97655aad54e6d";
const V6_QUALIFIER_REL=
  "ops/precision/void_buy_void_user_manager_query_live_qualification_v6.py";
const V6_QUALIFIER_BLOB="83bfd3f3baf5c9d2a9e21852b0f752f27d7749bc";
const V6_REPLACEMENT_REL=
  "ops/precision/void_buy_void_user_manager_query_protected_replace_v6.py";
const V6_REPLACEMENT_BLOB="f81d9fbead60593258d17dbb8720e1efc867b20f";
const CREDENTIAL_LOCK_V3R_REL=
  "ops/security/buy-void-user-manager-credential-query-elf-lock-v3r.json";
const CREDENTIAL_LOCK_V3R_BLOB="c4870f3178aebc9a0bb6557562f663b8480cfefa";
const CREDENTIAL_LOCK_V2_REL=
  "ops/security/buy-void-user-manager-credential-query-elf-lock-v2.json";
const CREDENTIAL_LOCK_V2_BLOB="b73415ce8fc95ff2d49cbde97a15d701ad5b7937";
const V6_LOCK_REL="ops/security/buy-void-user-manager-query-elf-lock-v6.json";
const V6_LOCK_BLOB="772945b639d138284fc18cc312f7b9115b10c748";
const V4_PARSER_REL="tools/void-buy-allocation-custody-host-evidence-v4.mjs";
const V4_PARSER_BLOB="223a8acf32f8c7961d61222b83c0db17075f86c6";
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

const RUNTIME_HEAD="4c80887adc2b55e327f1aaec4f58a90d0bb1a3fb";
const RUNTIME_RELEASE="/opt/void-node-live/releases/"+RUNTIME_HEAD;
const CANONICAL_GIT_DIR=ROOT+"/.git";
const SOURCE_COMPATIBILITY_KEYS=Object.freeze([
  "runtime_head","source_head","source_tree",
  "source_runtime_ancestry_bound","source_runtime_dependency_blob_equality",
  "tracked_checkout_exact","untracked_paths_enumerated",
  "untracked_paths_source_authority",
]);
const QUALIFIER_CLOSURE_SPECS=Object.freeze([
  Object.freeze(["qualifier",QUALIFIER_REL,QUALIFIER_BLOB]),
  Object.freeze(["replacement_v3r",QUALIFIER_REPLACEMENT_REL,QUALIFIER_REPLACEMENT_BLOB]),
  Object.freeze(["qualifier_v6",V6_QUALIFIER_REL,V6_QUALIFIER_BLOB]),
  Object.freeze(["replacement_v6",V6_REPLACEMENT_REL,V6_REPLACEMENT_BLOB]),
  Object.freeze(["lock_v3r",CREDENTIAL_LOCK_V3R_REL,CREDENTIAL_LOCK_V3R_BLOB]),
  Object.freeze(["lock_v2",CREDENTIAL_LOCK_V2_REL,CREDENTIAL_LOCK_V2_BLOB]),
  Object.freeze(["lock_v6",V6_LOCK_REL,V6_LOCK_BLOB]),
  Object.freeze(["parser_v4",V4_PARSER_REL,V4_PARSER_BLOB]),
]);
const SOURCE_RUNTIME_DEPENDENCY_SPECS=Object.freeze([
  ...QUALIFIER_CLOSURE_SPECS,
  Object.freeze(["sealed_v2",SEALED_REL,SEALED_BLOB]),
]);
const AUTHENTICATED_CLOSURE_ROOT="/__void_authenticated_qualifier_closure_v1__";
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
    GIT_NO_LAZY_FETCH:"1",
    GIT_TERMINAL_PROMPT:"0",
    GIT_ASKPASS:"/bin/false",
    GIT_PROTOCOL_FROM_USER:"0",
    GIT_ALLOW_PROTOCOL:"",
    GIT_PAGER:"",
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
    "--git-dir="+CANONICAL_GIT_DIR,
    "--work-tree="+ROOT,
    "-c","core.worktree="+ROOT,
    "-c","core.fileMode=true",
    "-c","core.fsmonitor=false",
    "-c","core.hooksPath=/dev/null",
    "-c","core.untrackedCache=false",
    "-c","core.sparseCheckout=false",
    "-c","core.sparseCheckoutCone=false",
    "-c","submodule.recurse=false",
    ...args,
  ],{env:cleanGitEnv(),timeout:15_000});
  if(r.status!==0)throw new Error("git_failed:"+args[0]);
  if(r.stderr!=="")throw new Error("git_unexpected_stderr:"+args[0]);
  return r.stdout;
}

const MAX_ACTUAL_ANCESTRY_COMMITS=4096;
const MAX_ACTUAL_COMMIT_PARENTS=64;

function rawCommitParents(oid,gitFn=git){
  if(!SHA40.test(String(oid||""))){
    throw new Error("source_runtime_actual_object_oid_invalid");
  }
  if(gitFn(["cat-file","-t",oid]).trim()!=="commit"){
    throw new Error("source_runtime_actual_object_not_commit");
  }
  const raw=gitFn(["cat-file","-p",oid]);
  if(typeof raw!=="string"||Buffer.byteLength(raw,"utf8")>MAX_OUTPUT){
    throw new Error("source_runtime_actual_object_commit_invalid");
  }
  const split=raw.indexOf("\n\n");
  const header=split>=0?raw.slice(0,split):raw;
  const lines=header.split("\n");
  if(lines.length<1||!/^tree [0-9a-f]{40}$/u.test(lines[0])){
    throw new Error("source_runtime_actual_object_commit_header_invalid");
  }
  const parents=[];
  for(const line of lines){
    if(!line.startsWith("parent "))continue;
    const parent=line.slice("parent ".length);
    if(!SHA40.test(parent)){
      throw new Error("source_runtime_actual_object_parent_invalid");
    }
    parents.push(parent);
    if(parents.length>MAX_ACTUAL_COMMIT_PARENTS){
      throw new Error("source_runtime_actual_object_parent_bound_exceeded");
    }
  }
  return parents;
}

function requireActualObjectAncestry(sourceHead,gitFn=git){
  if(!SHA40.test(String(sourceHead||""))){
    throw new Error("source_runtime_actual_object_source_invalid");
  }
  const pending=[sourceHead];
  const seen=new Set();
  while(pending.length){
    const oid=pending.pop();
    if(seen.has(oid))continue;
    seen.add(oid);
    if(seen.size>MAX_ACTUAL_ANCESTRY_COMMITS){
      throw new Error("source_runtime_actual_object_ancestry_bound_exceeded");
    }
    if(oid===RUNTIME_HEAD)return true;
    const parents=rawCommitParents(oid,gitFn);
    for(let index=parents.length-1;index>=0;index--){
      if(!seen.has(parents[index]))pending.push(parents[index]);
    }
  }
  throw new Error("source_runtime_actual_object_ancestry_not_found");
}

function validateSourceCompatibility(value,expectedHead){
  if(!value||typeof value!=="object"||Array.isArray(value)||
     !exactKeys(value,SOURCE_COMPATIBILITY_KEYS)){
    throw new Error("source_compatibility_shape_invalid");
  }
  if(value.runtime_head!==expectedHead||expectedHead!==RUNTIME_HEAD||
     !SHA40.test(String(value.source_head||""))||
     !SHA40.test(String(value.source_tree||""))||
     value.source_runtime_ancestry_bound!==true||
     value.source_runtime_dependency_blob_equality!==true||
     value.tracked_checkout_exact!==true||
     value.untracked_paths_enumerated!==false||
     value.untracked_paths_source_authority!==false){
    throw new Error("source_compatibility_value_invalid");
  }
}

function requireSourceRuntimeCompatibility(expectedHead,gitFn=git){
  if(expectedHead!==RUNTIME_HEAD){
    throw new Error("runtime_expected_head_mismatch");
  }
  const sourceHead=gitFn(["rev-parse","--verify","HEAD"]).trim();
  const sourceTree=gitFn(["rev-parse","--verify","HEAD^{tree}"]).trim();
  if(!SHA40.test(sourceHead)||!SHA40.test(sourceTree)){
    throw new Error("source_generation_identity_invalid");
  }
  if(gitFn(["branch","--show-current"]).trim()!=="main"){
    throw new Error("branch_not_main");
  }
  if(gitFn(["status","--porcelain=v1","--untracked-files=no"])!==""){
    throw new Error("tracked_checkout_not_exact");
  }
  // Runtime-sensitive authority may only move forward through raw commit
  // parent headers. Revision-walk metadata such as grafts is never authority.
  requireActualObjectAncestry(sourceHead,gitFn);

  for(const [_label,relative,expectedBlob] of SOURCE_RUNTIME_DEPENDENCY_SPECS){
    const runtimeBlob=gitFn(["rev-parse",RUNTIME_HEAD+":"+relative]).trim();
    const sourceBlob=gitFn(["rev-parse",sourceHead+":"+relative]).trim();
    if(runtimeBlob!==expectedBlob||sourceBlob!==expectedBlob){
      throw new Error("source_runtime_dependency_blob_mismatch:"+relative);
    }
  }
  const result=Object.freeze({
    runtime_head:RUNTIME_HEAD,
    source_head:sourceHead,
    source_tree:sourceTree,
    source_runtime_ancestry_bound:true,
    source_runtime_dependency_blob_equality:true,
    tracked_checkout_exact:true,
    untracked_paths_enumerated:false,
    untracked_paths_source_authority:false,
  });
  validateSourceCompatibility(result,expectedHead);
  return result;
}
function gitObject(expectedHead,relative,expectedBlob){
  const r=runAsRuntimeUser(GIT,[
    "-c","core.fsmonitor=false",
    "-c","core.hooksPath=/dev/null",
    "-c","core.untrackedCache=false",
    "-c","submodule.recurse=false",
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

const QUALIFICATION_HOLD_KEYS=Object.freeze([
  "status","reason","query_execution_state","credential_contents_read",
  "host_mutation","filesystem_write","service_mutation","systemd_mutation",
  "payment_acceptance","public_presale_activation","wc_void_market_activation",
  "transaction","funds_movement","production_host_evidence_authority",
]);

export function parseQualificationHoldStdout(stdout){
  if(typeof stdout!=="string"||stdout.length<1||
     Buffer.byteLength(stdout,"utf8")>MAX_OUTPUT||stdout.includes("\0")){
    throw new Error("qualification_hold_output_invalid");
  }
  const lines=stdout.split("\n");
  if(lines.at(-1)==="")lines.pop();
  if(lines.length!==1+QUALIFICATION_HOLD_KEYS.length||
     lines.shift()!==QUALIFIER_MARKER){
    throw new Error("qualification_hold_shape_invalid");
  }
  const out={};
  const allowed=new Set(QUALIFICATION_HOLD_KEYS);
  for(const line of lines){
    const at=line.indexOf("=");
    if(at<=0)throw new Error("qualification_hold_shape_invalid");
    const key=line.slice(0,at);
    const value=line.slice(at+1);
    if(!allowed.has(key)||Object.hasOwn(out,key)){
      throw new Error("qualification_hold_shape_invalid");
    }
    out[key]=value;
  }
  if(!exactKeys(out,QUALIFICATION_HOLD_KEYS)||
     out.status!=="HOLD"||
     out.query_execution_state!=="unknown_or_partial"||
     out.credential_contents_read!=="false"||
     out.host_mutation!=="false"||
     out.filesystem_write!=="false"||
     out.service_mutation!=="false"||
     out.systemd_mutation!=="false"||
     out.payment_acceptance!=="false"||
     out.public_presale_activation!=="false"||
     out.wc_void_market_activation!=="false"||
     out.transaction!=="false"||
     out.funds_movement!=="false"||
     out.production_host_evidence_authority!=="false"){
    throw new Error("qualification_hold_contract_invalid");
  }
  const reason=safeReason(out.reason);
  if(reason==="unknown"){
    throw new Error("qualification_hold_reason_invalid");
  }
  return Object.freeze({...out,reason});
}

export function qualificationProcessFailure(result){
  const status=result?.status;
  if(status===2&&result?.stderr===""){
    try{
      const hold=parseQualificationHoldStdout(String(result?.stdout??""));
      return new Error("credential_qualification_hold:"+hold.reason);
    }catch{
      // Malformed output is not a reviewed qualification HOLD.
    }
  }
  return new Error("credential_qualification_failed:"+String(status));
}

function qualificationClosure(expectedHead,gitObjectFn=gitObject){
  const closure={};
  try{
    for(const [label,relative,blob] of QUALIFIER_CLOSURE_SPECS){
      closure[label]=gitObjectFn(expectedHead,relative,blob);
    }
    return closure;
  }catch(error){
    for(const value of Object.values(closure)){
      if(Buffer.isBuffer(value))value.fill(0);
    }
    throw error;
  }
}

function requireAuthenticatedClosureNamespaceAbsent(){
  try{
    fs.lstatSync(AUTHENTICATED_CLOSURE_ROOT);
  }catch(error){
    if(error?.code==="ENOENT")return;
    throw new Error("authenticated_closure_namespace_check_failed");
  }
  throw new Error("authenticated_closure_namespace_present");
}

function pythonBootstrap(closure){
  const encoded={};
  for(const [key,value] of Object.entries(closure)){
    encoded[key]=value.toString("base64");
  }
  const expected={
    qualifier:QUALIFIER_BLOB,
    replacement_v3r:QUALIFIER_REPLACEMENT_BLOB,
    qualifier_v6:V6_QUALIFIER_BLOB,
    replacement_v6:V6_REPLACEMENT_BLOB,
    lock_v3r:CREDENTIAL_LOCK_V3R_BLOB,
    lock_v2:CREDENTIAL_LOCK_V2_BLOB,
    lock_v6:V6_LOCK_BLOB,
    parser_v4:V4_PARSER_BLOB,
  };
  const paths={
    qualifier:path.posix.join(AUTHENTICATED_CLOSURE_ROOT,QUALIFIER_REL),
    replacement_v3r:path.posix.join(AUTHENTICATED_CLOSURE_ROOT,QUALIFIER_REPLACEMENT_REL),
    qualifier_v6:path.posix.join(AUTHENTICATED_CLOSURE_ROOT,V6_QUALIFIER_REL),
    replacement_v6:path.posix.join(AUTHENTICATED_CLOSURE_ROOT,V6_REPLACEMENT_REL),
    lock_v3r:path.posix.join(AUTHENTICATED_CLOSURE_ROOT,CREDENTIAL_LOCK_V3R_REL),
    lock_v2:path.posix.join(AUTHENTICATED_CLOSURE_ROOT,CREDENTIAL_LOCK_V2_REL),
    lock_v6:path.posix.join(AUTHENTICATED_CLOSURE_ROOT,V6_LOCK_REL),
    parser_v4:path.posix.join(AUTHENTICATED_CLOSURE_ROOT,V4_PARSER_REL),
  };
  return [
    "import base64,hashlib,sys,types",
    "payload="+JSON.stringify(encoded),
    "expected="+JSON.stringify(expected),
    "paths="+JSON.stringify(paths),
    "raw={k:base64.b64decode(v) for k,v in payload.items()}",
    "def git_blob(data):",
    " return hashlib.sha1(b'blob '+str(len(data)).encode('ascii')+b'\\0'+data).hexdigest()",
    "for key,want in expected.items():",
    " if git_blob(raw[key])!=want: raise RuntimeError('closure_blob_mismatch:'+key)",
    "def module_from(label,name):",
    " m=types.ModuleType(name)",
    " m.__file__=paths[label]",
    " m.__package__=''",
    " exec(compile(raw[label],paths[label],'exec',dont_inherit=True),m.__dict__)",
    " return m",
    "def make_v3_replacement():",
    " m=module_from('replacement_v3r','void_buy_void_user_manager_credential_query_protected_replace_v3r_exact')",
    " if str(m.LOCK_PATH)!=paths['lock_v3r'] or str(m.V2_LOCK_PATH)!=paths['lock_v2']: raise m.ReplaceError('closure_path_contract_mismatch')",
    " def repo_bytes(p):",
    "  p=str(p)",
    "  if p==paths['lock_v3r']: return raw['lock_v3r']",
    "  if p==paths['lock_v2']: return raw['lock_v2']",
    "  raise m.ReplaceError('root_checkout_lock_read_forbidden')",
    " m._direct_repo_bytes=repo_bytes",
    " return m",
    "def make_v6_replacement():",
    " m=module_from('replacement_v6','void_buy_void_user_manager_query_protected_replace_v6_exact')",
    " if str(m.LOCK_PATH)!=paths['lock_v6']: raise m.ReplaceError('closure_path_contract_mismatch')",
    " def repo_bytes(p):",
    "  if str(p)==paths['lock_v6']: return raw['lock_v6']",
    "  raise m.ReplaceError('root_checkout_lock_read_forbidden')",
    " m._direct_repo_bytes=repo_bytes",
    " return m",
    "def make_v6_qualifier():",
    " v6=module_from('qualifier_v6','void_buy_void_user_manager_query_live_qualification_v6_exact')",
    " if str(v6.REPLACE_SOURCE)!=paths['replacement_v6'] or str(v6.V4_PARSER_SOURCE)!=paths['parser_v4']: raise v6.QualificationError('closure_path_contract_mismatch')",
    " def no_source(_p): raise v6.QualificationError('root_checkout_source_read_forbidden')",
    " v6._direct_source_bytes=no_source",
    " def load_replacement():",
    "  if git_blob(raw['replacement_v6'])!=v6.REPLACE_SOURCE_GIT_BLOB_SHA1: raise v6.QualificationError('replacement_source_blob_mismatch')",
    "  if git_blob(raw['parser_v4'])!=v6.V4_PARSER_GIT_BLOB_SHA1: raise v6.QualificationError('v4_parser_source_blob_mismatch')",
    "  m=make_v6_replacement()",
    "  lock=m.accepted_lock()",
    "  if m.GREEN_STATE!='V6_GREEN_WITH_V1_V2_PREDECESSORS': raise v6.QualificationError('replacement_green_state_contract_mismatch')",
    "  if lock.get('lock_id')!='voidbuyumqelflock6_3627a98945579452b01c79b4d114c54d858122496f2b20a20ddfd7fae6b0307c': raise v6.QualificationError('corrected_v6_lock_id_mismatch')",
    "  return m",
    " v6._load_replacement=load_replacement",
    " return v6",
    "q=module_from('qualifier','void_buy_void_user_manager_credential_query_installed_qualification_v3r_exact')",
    "if str(q.REPLACEMENT_SOURCE)!=paths['replacement_v3r'] or str(q.V6_QUALIFIER_SOURCE)!=paths['qualifier_v6']: raise q.QualificationError('closure_path_contract_mismatch')",
    "def no_source(_p): raise q.QualificationError('root_checkout_source_read_forbidden')",
    "q._direct_source_bytes=no_source",
    "def load_dependencies():",
    " if git_blob(raw['replacement_v3r'])!=q.REPLACEMENT_SOURCE_GIT_BLOB_SHA1: raise q.QualificationError('replacement_source_blob_mismatch')",
    " replacement=make_v3_replacement()",
    " lock=replacement.accepted_lock()",
    " if lock.get('lock_id')!=q.LOCK_ID: raise q.QualificationError('credential_v3r_lock_id_mismatch')",
    " if replacement.LOCK_ID!=q.LOCK_ID: raise q.QualificationError('replacement_lock_id_mismatch')",
    " if replacement.V3_QUERY_SHA256!='d60e5719a4d785dbfaca90074ed3313ef9e0cae84c3f933af44d7faf84763923': raise q.QualificationError('replacement_v3_query_identity_mismatch')",
    " if git_blob(raw['qualifier_v6'])!=q.V6_QUALIFIER_SOURCE_GIT_BLOB_SHA1: raise q.QualificationError('v6_qualifier_source_blob_mismatch')",
    " return replacement,make_v6_qualifier()",
    "q._load_dependencies=load_dependencies",
    "sys.argv=[paths['qualifier'],'--run']",
    "try:",
    " rc=q.main()",
    "except q.QualificationError as exc:",
    " print(q.MARKER)",
    " print('status=HOLD')",
    " print('reason='+str(exc))",
    " print('query_execution_state=unknown_or_partial')",
    " print('credential_contents_read=false')",
    " print('host_mutation=false')",
    " print('filesystem_write=false')",
    " print('service_mutation=false')",
    " print('systemd_mutation=false')",
    " print('payment_acceptance=false')",
    " print('public_presale_activation=false')",
    " print('wc_void_market_activation=false')",
    " print('transaction=false')",
    " print('funds_movement=false')",
    " print('production_host_evidence_authority=false')",
    " rc=2",
    "raise SystemExit(rc)",
    "",
  ].join("\n");
}

function runQualification(expectedHead){
  const closure=qualificationClosure(expectedHead);
  try{
    requireAuthenticatedClosureNamespaceAbsent();
    const bootstrap=pythonBootstrap(closure);
    if(bootstrap.includes(ROOT)){
      throw new Error("authenticated_closure_bootstrap_user_checkout_path");
    }
    const r=run(PYTHON,["-I","-B","-"],{
      env:cleanRootEnv(),
      input:bootstrap,
      timeout:60_000,
    });
    requireAuthenticatedClosureNamespaceAbsent();
    if(r.status!==0)throw qualificationProcessFailure(r);
    if(r.stderr!=="")throw new Error("credential_qualification_unexpected_stderr");
    const parsed=parseQualificationStdout(r.stdout);
    validateQualification(parsed);
    return parsed;
  }finally{
    for(const value of Object.values(closure)){
      if(Buffer.isBuffer(value))value.fill(0);
    }
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

function requireTrustedRuntimeRelease(){
  const components=[
    "/",
    "/opt",
    "/opt/void-node-live",
    "/opt/void-node-live/releases",
    RUNTIME_RELEASE,
  ];
  for(const candidate of components){
    let real;
    try{real=fs.realpathSync(candidate);}
    catch{throw new Error("runtime_release_path_unavailable");}
    if(real!==candidate){
      throw new Error("runtime_release_path_not_canonical");
    }
    let st;
    try{st=fs.lstatSync(candidate,{bigint:true});}
    catch{throw new Error("runtime_release_path_unavailable");}
    const mode=st.mode&0o7777n;
    if(!st.isDirectory()||st.isSymbolicLink()||
       st.uid!==0n||st.gid!==0n||(mode&0o022n)!==0n){
      throw new Error("runtime_release_path_untrusted");
    }
  }
  return RUNTIME_RELEASE;
}

function runSealedProbe(expectedHead){
  const runtimeRelease=requireTrustedRuntimeRelease();
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
      cwd:runtimeRelease,
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
  sourceCompatibility,
  qualification,
  sealedRecord,
}){
  validateSourceCompatibility(sourceCompatibility,expectedHead);
  const body={
    marker:MARKER,
    version:4,
    status:STATUS,
    source_head:expectedHead,
    runtime_head:expectedHead,
    source_checkout_head:sourceCompatibility.source_head,
    source_checkout_tree:sourceCompatibility.source_tree,
    source_runtime_ancestry_bound:true,
    source_runtime_dependency_blob_equality:true,
    tracked_source_checkout_exact:true,
    untracked_paths_enumerated:false,
    untracked_paths_source_authority:false,
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
      "voide2livecomp4_"+sha256(Buffer.from(canonical(body),"utf8")),
  });
}

function plan(){
  console.log(MARKER);
  console.log("mode=plan");
  console.log("source_generation=v4_source_runtime_compatibility");
  console.log("runtime_expected_head="+RUNTIME_HEAD);
  console.log("source_checkout_head_runtime_observed=true");
  console.log("source_checkout_tree_runtime_observed=true");
  console.log("source_runtime_ancestry_required=true");
  console.log("source_runtime_actual_object_ancestry_required=true");
  console.log("tracked_source_checkout_exact_required=true");
  console.log("runtime_source_dependency_blob_equality_required=true");
  console.log("root_qualification_dependency_closure_git_object_bound=true");
  console.log("root_checkout_dependency_path_reads_forbidden=true");
  console.log("root_qualification_closure_path_contract_bound=true");
  console.log("qualifier_closure_unprivileged_git_read_required=true");
  console.log("untracked_paths_enumerated=false");
  console.log("untracked_paths_source_authority=false");
  console.log("git_lazy_fetch_disabled=true");
  console.log("git_transport_disabled=true");
  console.log("git_prompt_and_askpass_disabled=true");
  console.log("canonical_git_dir_worktree_pinned=true");
  console.log("sealed_probe_runtime_release_cwd_required=true");
  console.log("runtime_release_root_custody_required=true");
  console.log("runtime_release="+RUNTIME_RELEASE);
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
  const syntheticSourceCompatibility={
    runtime_head:RUNTIME_HEAD,
    source_head:"2".repeat(40),
    source_tree:"3".repeat(40),
    source_runtime_ancestry_bound:true,
    source_runtime_dependency_blob_equality:true,
    tracked_checkout_exact:true,
    untracked_paths_enumerated:false,
    untracked_paths_source_authority:false,
  };
  const receipt=buildReceipt({
    expectedHead:RUNTIME_HEAD,
    sourceCompatibility:syntheticSourceCompatibility,
    qualification:q,
    sealedRecord:sealed,
  });
  if(!/^voide2livecomp4_[0-9a-f]{64}$/u.test(receipt.receipt_id)){
    throw new Error("receipt_id_self_test_failed");
  }
  if(receipt.version!==4||
     receipt.runtime_head!==RUNTIME_HEAD||
     receipt.source_checkout_head!=="2".repeat(40)||
     receipt.source_checkout_tree!=="3".repeat(40)||
     receipt.source_runtime_ancestry_bound!==true||
     receipt.source_runtime_dependency_blob_equality!==true||
     receipt.tracked_source_checkout_exact!==true||
     receipt.untracked_paths_enumerated!==false||
     receipt.untracked_paths_source_authority!==false||
     receipt.production_host_evidence_authority!==false||
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


  const nestedHoldText=[
    QUALIFIER_MARKER,
    "status=HOLD",
    "reason=v6_security_qualification_hold:protected_v6_generation_not_green",
    "query_execution_state=unknown_or_partial",
    "credential_contents_read=false",
    "host_mutation=false",
    "filesystem_write=false",
    "service_mutation=false",
    "systemd_mutation=false",
    "payment_acceptance=false",
    "public_presale_activation=false",
    "wc_void_market_activation=false",
    "transaction=false",
    "funds_movement=false",
    "production_host_evidence_authority=false",
    "",
  ].join("\n");
  const nestedHold=parseQualificationHoldStdout(nestedHoldText);
  if(nestedHold.reason!==
     "v6_security_qualification_hold:protected_v6_generation_not_green"){
    throw new Error("qualification_hold_reason_self_test_failed");
  }
  const mappedHold=qualificationProcessFailure({
    status:2,stderr:"",stdout:nestedHoldText,
  });
  if(mappedHold.message!==
     "credential_qualification_hold:"+
     "v6_security_qualification_hold:protected_v6_generation_not_green"){
    throw new Error("qualification_hold_process_mapping_failed");
  }
  let malformedHoldRejected=false;
  const forgedHoldText=
    nestedHoldText.replace("transaction=false","transaction=true");
  try{
    parseQualificationHoldStdout(forgedHoldText);
  }catch{malformedHoldRejected=true;}
  if(!malformedHoldRejected){
    throw new Error("qualification_hold_authority_adversary_accepted");
  }
  if(qualificationProcessFailure({
       status:2,stderr:"",stdout:forgedHoldText,
     }).message!=="credential_qualification_failed:2"){
    throw new Error("forged_qualification_hold_reclassified");
  }
  if(qualificationProcessFailure({
       status:1,stderr:"Traceback: synthetic",stdout:"",
     }).message!=="credential_qualification_failed:1"){
    throw new Error("unexpected_qualification_exit_reclassified");
  }

  let checkoutCount=0;
  const stableSource={
    runtime_head:RUNTIME_HEAD,
    source_head:"4".repeat(40),
    source_tree:"5".repeat(40),
    source_runtime_ancestry_bound:true,
    source_runtime_dependency_blob_equality:true,
    tracked_checkout_exact:true,
    untracked_paths_enumerated:false,
    untracked_paths_source_authority:false,
  };
  const stableSequence=runSensitiveSequence({
    expectedHead:RUNTIME_HEAD,
    checkoutFn:()=>{checkoutCount+=1; return {...stableSource};},
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
      expectedHead:RUNTIME_HEAD,
      checkoutFn:()=>{
        driftChecks+=1;
        if(driftChecks===2)throw new Error("late_source_drift");
        return {
          runtime_head:RUNTIME_HEAD,
          source_head:"6".repeat(40),
          source_tree:"7".repeat(40),
          source_runtime_ancestry_bound:true,
          source_runtime_dependency_blob_equality:true,
          tracked_checkout_exact:true,
          untracked_paths_enumerated:false,
          untracked_paths_source_authority:false,
        };
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

  const gitEnv=cleanGitEnv();
  for(const [key,value] of Object.entries({
    GIT_NO_LAZY_FETCH:"1",
    GIT_TERMINAL_PROMPT:"0",
    GIT_ASKPASS:"/bin/false",
    GIT_PROTOCOL_FROM_USER:"0",
    GIT_ALLOW_PROTOCOL:"",
    GIT_PAGER:"",
    GIT_CONFIG_NOSYSTEM:"1",
    GIT_CONFIG_GLOBAL:"/dev/null",
    GIT_CONFIG_SYSTEM:"/dev/null",
  })){
    if(gitEnv[key]!==value){
      throw new Error("git_environment_self_test_failed:"+key);
    }
  }

  const closureCalls=[];
  const testClosure=qualificationClosure(
    "1".repeat(40),
    (head,relative,blob)=>{
      closureCalls.push([head,relative,blob]);
      return Buffer.from(blob,"ascii");
    },
  );
  if(closureCalls.length!==QUALIFIER_CLOSURE_SPECS.length||
     closureCalls.length!==8||
     Object.keys(testClosure).sort().join(",")!==
       QUALIFIER_CLOSURE_SPECS.map((row)=>row[0]).sort().join(",")){
    throw new Error("qualification_closure_self_test_failed");
  }
  for(let i=0;i<QUALIFIER_CLOSURE_SPECS.length;i++){
    const [label,relative,blob]=QUALIFIER_CLOSURE_SPECS[i];
    const [headGot,relativeGot,blobGot]=closureCalls[i];
    if(headGot!=="1".repeat(40)||relativeGot!==relative||blobGot!==blob||
       testClosure[label].toString("ascii")!==blob){
      throw new Error("qualification_closure_identity_self_test_failed:"+label);
    }
  }
  requireAuthenticatedClosureNamespaceAbsent();
  const bootstrapProbe=pythonBootstrap(testClosure);
  if(!bootstrapProbe.includes(AUTHENTICATED_CLOSURE_ROOT)||
     bootstrapProbe.includes(ROOT)){
    throw new Error("qualification_bootstrap_namespace_self_test_failed");
  }
  let syntheticReadHeld=false;
  try{
    fs.readFileSync(
      path.posix.join(AUTHENTICATED_CLOSURE_ROOT,QUALIFIER_REL),
    );
  }catch(error){
    syntheticReadHeld=error?.code==="ENOENT";
  }
  if(!syntheticReadHeld){
    throw new Error("qualification_bootstrap_namespace_read_self_test_failed");
  }
  for(const required of [
    "root_checkout_source_read_forbidden",
    "root_checkout_lock_read_forbidden",
    "q._direct_source_bytes=no_source",
    "v6._direct_source_bytes=no_source",
    "m._direct_repo_bytes=repo_bytes",
    "q._load_dependencies=load_dependencies",
    "v6._load_replacement=load_replacement",
    "closure_path_contract_mismatch",
  ]){
    if(!bootstrapProbe.includes(required)){
      throw new Error("qualification_bootstrap_guard_self_test_failed:"+required);
    }
  }
  if(bootstrapProbe.includes("'__name__':'__main__'")||
     bootstrapProbe.includes("path.read_bytes()")){
    throw new Error("qualification_bootstrap_unsafe_path_self_test_failed");
  }
  for(const value of Object.values(testClosure))value.fill(0);

  if(SOURCE_RUNTIME_DEPENDENCY_SPECS.length!==9){
    throw new Error("source_runtime_dependency_set_cardinality_invalid");
  }
  const driftSourceHead="8".repeat(40);
  const driftSourceTree="9".repeat(40);
  const driftRelative=V6_QUALIFIER_REL;
  let driftHeld=false;
  const driftGit=(args)=>{
    if(args[0]==="rev-parse"&&args[1]==="--verify"&&args[2]==="HEAD"){
      return driftSourceHead+"\n";
    }
    if(args[0]==="rev-parse"&&args[1]==="--verify"&&args[2]==="HEAD^{tree}"){
      return driftSourceTree+"\n";
    }
    if(args[0]==="branch"&&args[1]==="--show-current")return "main\n";
    if(args[0]==="status")return "";
    if(args[0]==="cat-file"&&args[1]==="-t")return "commit\n";
    if(args[0]==="cat-file"&&args[1]==="-p"){
      if(args[2]===driftSourceHead){
        return "tree "+driftSourceTree+"\nparent "+RUNTIME_HEAD+
          "\nauthor test <test@example.invalid> 0 +0000"+
          "\ncommitter test <test@example.invalid> 0 +0000\n\nsource\n";
      }
      if(args[2]===RUNTIME_HEAD){
        return "tree "+driftSourceTree+
          "\nauthor test <test@example.invalid> 0 +0000"+
          "\ncommitter test <test@example.invalid> 0 +0000\n\nruntime\n";
      }
    }
    if(args[0]==="rev-parse"&&args.length===2){
      const spec=args[1];
      for(const [_label,relative,blob] of SOURCE_RUNTIME_DEPENDENCY_SPECS){
        if(spec===RUNTIME_HEAD+":"+relative)return blob+"\n";
        if(spec===driftSourceHead+":"+relative){
          if(relative===driftRelative)return "0".repeat(40)+"\n";
          return blob+"\n";
        }
      }
    }
    throw new Error("source_runtime_dependency_drift_fixture_query");
  };
  try{
    requireSourceRuntimeCompatibility(RUNTIME_HEAD,driftGit);
  }catch(error){
    driftHeld=String(error?.message||error)===
      "source_runtime_dependency_blob_mismatch:"+driftRelative;
  }
  if(!driftHeld){
    throw new Error("nested_source_runtime_dependency_drift_not_rejected");
  }

  const graftSourceHead="a".repeat(40);
  const graftParent="b".repeat(40);
  const graftTree="c".repeat(40);
  let graftMergeBaseCalled=false;
  const graftGit=(args)=>{
    if(args[0]==="rev-parse"&&args[1]==="--verify"&&args[2]==="HEAD"){
      return graftSourceHead+"\n";
    }
    if(args[0]==="rev-parse"&&args[1]==="--verify"&&args[2]==="HEAD^{tree}"){
      return graftTree+"\n";
    }
    if(args[0]==="branch"&&args[1]==="--show-current")return "main\n";
    if(args[0]==="status")return "";
    if(args[0]==="merge-base"){
      graftMergeBaseCalled=true;
      return "";
    }
    if(args[0]==="cat-file"&&args[1]==="-t")return "commit\n";
    if(args[0]==="cat-file"&&args[1]==="-p"){
      if(args[2]===graftSourceHead){
        return "tree "+graftTree+"\nparent "+graftParent+
          "\nauthor test <test@example.invalid> 0 +0000"+
          "\ncommitter test <test@example.invalid> 0 +0000\n\nsource\n";
      }
      if(args[2]===graftParent){
        return "tree "+graftTree+
          "\nauthor test <test@example.invalid> 0 +0000"+
          "\ncommitter test <test@example.invalid> 0 +0000\n\nparent\n";
      }
    }
    throw new Error("source_runtime_graft_fixture_query");
  };
  let graftHeld=false;
  try{
    requireSourceRuntimeCompatibility(RUNTIME_HEAD,graftGit);
  }catch(error){
    graftHeld=String(error?.message||error)===
      "source_runtime_actual_object_ancestry_not_found";
  }
  if(!graftHeld||graftMergeBaseCalled){
    throw new Error("source_runtime_graft_ancestry_not_rejected");
  }

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
  console.log("nested_qualification_hold_reason_preserved=true");
  console.log("qualification_process_exit_mapping_proven=true");
  console.log("unexpected_qualification_exit_not_reclassified_as_hold=true");
  console.log("runner_parent_credential_content_access=false");
  console.log("runtime_policy_head_preserved=true");
  console.log("source_checkout_head_runtime_observed=true");
  console.log("source_runtime_ancestry_required=true");
  console.log("source_runtime_actual_object_ancestry_required=true");
  console.log("tracked_source_checkout_exact_required=true");
  console.log("source_runtime_dependency_blob_equality_required=true");
  console.log("source_runtime_complete_dependency_set_bound=true");
  console.log("nested_source_runtime_dependency_drift_rejected=true");
  console.log("source_runtime_graft_ancestry_rejected=true");
  console.log("root_qualification_dependency_closure_git_object_bound=true");
  console.log("authenticated_closure_synthetic_namespace=true");
  console.log("authenticated_closure_namespace_absent_required=true");
  console.log("root_qualification_user_checkout_file_namespace=false");
  console.log("root_checkout_dependency_path_reads_forbidden=true");
  console.log("root_qualification_closure_path_contract_bound=true");
  console.log("qualifier_closure_unprivileged_git_read_required=true");
  console.log("untracked_paths_enumerated=false");
  console.log("untracked_paths_source_authority=false");
  console.log("git_lazy_fetch_disabled=true");
  console.log("git_transport_disabled=true");
  console.log("git_prompt_and_askpass_disabled=true");
  console.log("canonical_git_dir_worktree_pinned=true");
  console.log("sealed_probe_runtime_release_cwd_required=true");
  console.log("runtime_release_root_custody_required=true");
  console.log("sealed_child_credential_content_access=true");
  console.log("nontransaction_signature_only=true");
  console.log("transaction=false");
  console.log("funds_movement=false");
}

function runSensitiveSequence({
  expectedHead,
  checkoutFn=requireSourceRuntimeCompatibility,
  qualificationFn=runQualification,
  sealedFn=runSealedProbe,
  crossFn=crossCheck,
}){
  const sourceBefore=checkoutFn(expectedHead);
  validateSourceCompatibility(sourceBefore,expectedHead);

  const before=qualificationFn(expectedHead);
  const sealedRecord=sealedFn(expectedHead);
  const after=qualificationFn(expectedHead);

  if(canonical(before)!==canonical(after)){
    throw new Error("qualification_changed_across_sealed_probe");
  }
  crossFn(sealedRecord,before);

  // Close the source-generation window after all sensitive observations and
  // before constructing or emitting a receipt.
  const sourceAfter=checkoutFn(expectedHead);
  validateSourceCompatibility(sourceAfter,expectedHead);
  if(canonical(sourceBefore)!==canonical(sourceAfter)){
    throw new Error("source_compatibility_changed_across_sensitive_sequence");
  }

  return buildReceipt({
    expectedHead,
    sourceCompatibility:sourceBefore,
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
