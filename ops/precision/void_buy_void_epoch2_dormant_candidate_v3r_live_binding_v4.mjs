#!/usr/bin/env node
// Current-generation dormant-candidate credential binding.
// Live authority requires this reviewed Git object on stdin.
// Caller-supplied live receipts are never accepted.
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export const MARKER =
  "VOID_BUY_VOID_EPOCH2_DORMANT_CANDIDATE_V3R_LIVE_BINDING_V4";
export const CONFIRM =
  "RUN_EPOCH2_DORMANT_CANDIDATE_V3R_LIVE_BINDING_V4";
export const STATUS =
  "EPOCH2_DYNAMIC_SOURCE_RUNTIME_SIGNER_AND_AUTHENTICATED_CREDENTIAL_PROVEN_REMAINING_GATES_HOLD";
export const NEXT_ACTION =
  "QUALIFY_LIVE_EXACT_CHAIN_RECEIPT_AND_EITHER_ZERO_FEE_ENVELOPE_OR_PER_PAYMENT_NATIVE_GAS_FUNDING";

const ROOT="/home/zoso/dev/void-node";
const RUNTIME_HEAD="4c80887adc2b55e327f1aaec4f58a90d0bb1a3fb";
const RUNTIME_TREE="de12c9d2d5e475d435d21da3b047d7b63b69e2b7";
const CANDIDATE_REL=
  "ops/mainnet0/buy-void-payment-keyed-epoch2-dormant-candidate-v4.json";
const CANDIDATE_BLOB="e569c9211e01f14c7c00dd1c5041d4dfb0817609";

const FIXED_NATIVE=
  "/opt/void-buy-void-epoch2-live-composition-v3/"+
  "void_buy_void_epoch2_live_composition_native_preentry_v3";
const BINDER_PREENTRY_ROOT=
  "/opt/void-buy-void-epoch2-dormant-v3r-binding-v4";
const FIXED_BINDER_PREENTRY=
  BINDER_PREENTRY_ROOT+
  "/void_buy_void_epoch2_dormant_candidate_v3r_binding_native_preentry_v4";
const FIXED_BINDER_SOURCE=
  BINDER_PREENTRY_ROOT+
  "/void_buy_void_epoch2_dormant_candidate_v3r_live_binding_v4.mjs";
const BINDER_PREENTRY_MARKER=
  "VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_NATIVE_PREENTRY_V4";
const BINDER_PREENTRY_ENV=
  "VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_NATIVE_PREENTRY_V4";
const BINDER_FD_ENV=
  "VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_NATIVE_PREENTRY_V4_BINDER_FD";
const BINDER_PROOF_FD_ENV=
  "VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_NATIVE_PREENTRY_V4_PROOF_FD";
const BINDER_PROOF_SCHEMA=
  "VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_NATIVE_PARENT_PROOF_V4";
const FIXED_NODE="/usr/bin/node";
const NATIVE_CONFIRM=
  "RUN_AUTHENTICATED_EPOCH2_CREDENTIAL_LIVE_COMPOSITION_V3";
// Independently accepted repository candidate #V6R2. A different installed
// generation HOLDS rather than using a root-owned filename as code authority.
const ACCEPTED_NATIVE_LOCK_V6R2_ID=
  "voidbuye2nativecandlock6r2_ab95f15c8f2731adf6bfd97dfd5467495c90bdb5ee267948efc6a522be74b417";
const ACCEPTED_NATIVE_LOCK_V6R2_BLOB=
  "bc3cb6d7843447ed1f0f769c2d298bb76dac8b1b";
const ACCEPTED_NATIVE_BINARY_SHA256=
  "85f9b772e27e1e74199188c838ca107c91cdbc6e08ac20c47e8988c258073de8";
const ACCEPTED_NATIVE_BINARY_BYTES=726976;

const QUALIFIER_REL=
  "ops/precision/void_buy_void_user_manager_credential_query_installed_qualification_v3r.py";
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
const SEALED_REL=
  "scripts/void_buy_void_epoch2_credential_attestation_sealed_v2.mjs";
const SEALED_BLOB="14cbe81e27d04fee77cbe75225ce308bf8561a7b";
const SOURCE_RUNTIME_DEPENDENCY_SPECS=Object.freeze([
  Object.freeze(["qualifier",QUALIFIER_REL,QUALIFIER_BLOB]),
  Object.freeze(["replacement_v3r",QUALIFIER_REPLACEMENT_REL,QUALIFIER_REPLACEMENT_BLOB]),
  Object.freeze(["qualifier_v6",V6_QUALIFIER_REL,V6_QUALIFIER_BLOB]),
  Object.freeze(["replacement_v6",V6_REPLACEMENT_REL,V6_REPLACEMENT_BLOB]),
  Object.freeze(["lock_v3r",CREDENTIAL_LOCK_V3R_REL,CREDENTIAL_LOCK_V3R_BLOB]),
  Object.freeze(["lock_v2",CREDENTIAL_LOCK_V2_REL,CREDENTIAL_LOCK_V2_BLOB]),
  Object.freeze(["lock_v6",V6_LOCK_REL,V6_LOCK_BLOB]),
  Object.freeze(["parser_v4",V4_PARSER_REL,V4_PARSER_BLOB]),
  Object.freeze(["sealed_v2",SEALED_REL,SEALED_BLOB]),
]);

const CHILD_MARKER=
  "VOID_BUY_VOID_EPOCH2_AUTHENTICATED_CREDENTIAL_LIVE_COMPOSITION_V4";
const CHILD_STATUS=
  "AUTHENTICATED_EPOCH2_CREDENTIAL_LIVE_COMPOSITION_V4_GREEN_SOURCE_RUNTIME_COMPATIBILITY_EXACT";
const CHILD_NEXT_ACTION=
  "BIND_V3R_AUTHENTICATED_EPOCH2_CREDENTIAL_EVIDENCE_IN_DORMANT_CANDIDATE_V3_SUCCESSOR";
const CHILD_RECEIPT=/^voide2livecomp4_[0-9a-f]{64}$/u;
const SEALED_MARKER=
  "VOID_BUY_VOID_EPOCH2_CREDENTIAL_ATTESTATION_SEALED_V2";
const SEALED_ID=/^voide2sealed2_[0-9a-f]{64}$/u;

const CANDIDATE_MARKER=
  "VOID_BUY_VOID_PAYMENT_KEYED_EPOCH2_DORMANT_CANDIDATE_V4";
const CANDIDATE_STATUS=
  "EPOCH2_SOURCE_CANDIDATE_SIGNER_CONTROL_PROVEN_CREDENTIAL_AND_ACTIVATION_HOLD";
const EXPECTED_FULFILLER=
  "0x0f0b8aa14e1c9764fa8e4fa8b38fd3d3b8c2498a";
const EXPECTED_PRESALE=
  "0x530bc90ba74f2539a9e484ccb1be9291c3bc35ce";
const EXPECTED_CREDENTIAL_ID="buy-void-epoch2-fulfiller-v1";
const EXPECTED_CREDENTIAL_LOCK=
  "voidbuyumqcredelflock3r_"+
  "8b064214e22ce54ac193b426f38b9d6a7ea4cee07b38b68c8d1eeb6c51de6f34";
const EXPECTED_SOURCE_BINDING=
  "5fde8cc7fcd0493619c105ac9f367063fbdacd74e8ae50df76454c6d298206f1";

const RUNTIME_UID=1000;
const RUNTIME_GID=1000;
const RUNTIME_HOME="/home/zoso";
const GIT="/usr/bin/git";
const PYTHON="/usr/bin/python3";
const SETPRIV="/usr/bin/setpriv";
const CANONICAL_GIT_DIR=ROOT+"/.git";
const MAX_OUTPUT=8*1024*1024;
const SHA40=/^[0-9a-f]{40}$/u;
const HEX64=/^[0-9a-f]{64}$/u;

function sha256(bytes){
  return crypto.createHash("sha256").update(bytes).digest("hex");
}
function gitBlob(bytes){
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
function safeReason(value){
  const text=String(value??"unknown")
    .replace(/[^A-Za-z0-9_.:-]+/gu,"_").slice(0,240);
  return text||"unknown";
}
function cleanGitEnv(){
  return {
    PATH:"/usr/bin:/bin",HOME:RUNTIME_HOME,LANG:"C",LC_ALL:"C",TZ:"UTC",
    GIT_OPTIONAL_LOCKS:"0",GIT_NO_REPLACE_OBJECTS:"1",
    GIT_NO_LAZY_FETCH:"1",GIT_TERMINAL_PROMPT:"0",
    GIT_ASKPASS:"/bin/false",GIT_PROTOCOL_FROM_USER:"0",
    GIT_ALLOW_PROTOCOL:"",GIT_PAGER:"",
    GIT_CONFIG_NOSYSTEM:"1",GIT_CONFIG_GLOBAL:"/dev/null",
    GIT_CONFIG_SYSTEM:"/dev/null",
  };
}
function cleanRootEnv(){
  return {PATH:"/usr/bin:/bin",LANG:"C",LC_ALL:"C",TZ:"UTC"};
}
// Privileged first exec is bound to retained exact tool FDs. Never fall
// back to a checked-then-reopened executable pathname.
function requireRuntimeUidNonwritable(candidate,label){
  if(typeof process.geteuid!=="function"||process.geteuid()!==0)return;
  const script=[
    "import fs from 'node:fs';",
    "const p=process.argv[1];",
    "try{fs.accessSync(p,fs.constants.W_OK);process.exit(3);}",
    "catch(e){if(e&&(e.code==='EACCES'||e.code==='EPERM'))process.exit(0);process.exit(4);}",
  ].join("");
  const r=spawnSync("/proc/self/exe",["--input-type=module","-e",script,candidate],{
    uid:RUNTIME_UID,gid:RUNTIME_GID,cwd:"/",
    env:{PATH:"/usr/bin:/bin",HOME:"/nonexistent",LANG:"C",LC_ALL:"C"},
    encoding:"utf8",stdio:["ignore","pipe","pipe"],
    timeout:10_000,maxBuffer:64*1024,
  });
  if(r.error||r.status!==0||r.stdout!==""||r.stderr!=="")
    throw new Error("trusted_executable_runtime_uid_writable:"+label);
}
function requireRootOwnedExecutableAncestors(real,label){
  const root=path.parse(real).root;
  let prefix=root;
  const check=(p)=>{
    const st=fs.lstatSync(p,{bigint:true});
    if(!st.isDirectory()||st.isSymbolicLink()||st.uid!==0n||
       st.gid!==0n||(st.mode&0o022n)!==0n)
      throw new Error("trusted_executable_ancestor_invalid:"+label);
    requireRuntimeUidNonwritable(p,label+"_ancestor");
  };
  check(prefix);
  for(const name of path.relative(root,path.dirname(real)).split(path.sep).filter(Boolean)){
    prefix=path.join(prefix,name);check(prefix);
  }
}
function sameTrustedExecutableGeneration(a,b){
  return sameFileIdentity(a,b)&&a.mtimeNs===b.mtimeNs&&a.ctimeNs===b.ctimeNs;
}
function verifyRetainedNativeElfBytes(t,expectedBytes,expectedDigest){
  // The source fixture tests this parser; root execution uses the constant
  // pinned V6R2 wrapper below, never caller-selected ELF identities.
  if(!Number.isSafeInteger(expectedBytes)||expectedBytes<120||
     expectedBytes>16*1024*1024||!HEX64.test(expectedDigest))
    throw new Error("trusted_native_expected_identity_invalid");
  const st=fs.fstatSync(t.fd,{bigint:true});
  if(!st.isFile()||st.size!==BigInt(expectedBytes))
    throw new Error("trusted_native_binary_size_not_accepted");
  const digest=crypto.createHash("sha256");
  const chunk=Buffer.allocUnsafe(64*1024);
  let pos=0;
  while(pos<expectedBytes){
    const want=Math.min(chunk.length,expectedBytes-pos);
    const read=fs.readSync(t.fd,chunk,0,want,pos);
    if(read<=0)throw new Error("trusted_native_binary_short_read");
    digest.update(chunk.subarray(0,read));
    pos+=read;
  }
  if(digest.digest("hex")!==expectedDigest)
    throw new Error("trusted_native_binary_sha256_not_accepted");
  // ELF64 LE, System V x86-64 ET_EXEC and an exact PHDR shape, without a
  // dynamic interpreter or PT_DYNAMIC. Shebang/non-ELF execution is refused.
  const hdr=Buffer.alloc(64);
  if(fs.readSync(t.fd,hdr,0,hdr.length,0)!==hdr.length||
     hdr.subarray(0,4).toString("hex")!=="7f454c46"||
     hdr[4]!==2||hdr[5]!==1||hdr[6]!==1||
     hdr.readUInt16LE(16)!==2||hdr.readUInt16LE(18)!==62||
     hdr.readUInt32LE(20)!==1||hdr.readUInt16LE(52)!==64||
     hdr.readUInt16LE(54)!==56)
    throw new Error("trusted_native_static_elf_identity_invalid");
  const phoff=hdr.readBigUInt64LE(32);
  const phnum=hdr.readUInt16LE(56);
  if(phnum<1||phnum>128||phoff<BigInt(64)||
     phoff+BigInt(phnum)*56n>BigInt(expectedBytes))
    throw new Error("trusted_native_program_header_bounds_invalid");
  const ph=Buffer.alloc(56);
  let loads=0;
  for(let i=0;i<phnum;i++){
    const offset=Number(phoff)+i*56;
    if(fs.readSync(t.fd,ph,0,ph.length,offset)!==ph.length)
      throw new Error("trusted_native_program_header_short_read");
    const type=ph.readUInt32LE(0);
    if(type===3||type===2)
      throw new Error("trusted_native_dynamic_interpreter_forbidden");
    if(type===1){
      const segmentOffset=ph.readBigUInt64LE(8);
      const segmentFileSize=ph.readBigUInt64LE(32);
      const segmentMemorySize=ph.readBigUInt64LE(40);
      if(segmentMemorySize<segmentFileSize||
         segmentOffset+segmentFileSize>BigInt(expectedBytes))
        throw new Error("trusted_native_load_segment_bounds_invalid");
      loads++;
    }
  }
  if(loads<1)throw new Error("trusted_native_load_segments_missing");
  // Check all inode/custody fields again after reading from the retained FD.
  const after=fs.fstatSync(t.fd,{bigint:true});
  const visible=fs.lstatSync(t.real,{bigint:true});
  if(!sameTrustedExecutableGeneration(st,after)||
     !sameTrustedExecutableGeneration(after,visible))
    throw new Error("trusted_native_binary_generation_changed_during_hash");
}
function requirePinnedNativeExecutionClosure(t){
  if(!t||t.label!=="native")
    throw new Error("trusted_native_label_invalid");
  verifyRetainedNativeElfBytes(
    t,ACCEPTED_NATIVE_BINARY_BYTES,ACCEPTED_NATIVE_BINARY_SHA256,
  );
}
function revalidateRetainedTrustedExecutable(t){
  // A retained leaf FD alone cannot authenticate a configured symlink alias.
  // Reject any symlink added to the original lexical chain before execution.
  requireRootOwnedExecutableAncestors(t.real,t.label);
  if(fs.realpathSync.native(t.real)!==t.real)
    throw new Error("trusted_executable_path_canonical_generation_changed:"+t.label);
  const held=fs.fstatSync(t.fd,{bigint:true});
  const visible=fs.lstatSync(t.real,{bigint:true});
  if(!visible.isFile()||visible.isSymbolicLink()||visible.uid!==0n||
     visible.gid!==0n||visible.nlink!==1n||
     (visible.mode&0o022n)!==0n||(visible.mode&0o111n)===0n||
     !sameTrustedExecutableGeneration(t.opened,held)||
     !sameTrustedExecutableGeneration(held,visible))
    throw new Error("trusted_executable_generation_changed:"+t.label);
  requireRuntimeUidNonwritable(t.real,t.label+"_leaf");
  if(t.label==="native")requirePinnedNativeExecutionClosure(t);
}
function openRetainedTrustedExecutable(file,label){
  // Authenticate the *configured* lexical path before any realpath call can
  // follow a symlink through a runtime-user-writable ancestor.
  if(typeof file!=="string"||!path.isAbsolute(file)||
     path.resolve(file)!==file||file.includes("\0"))
    throw new Error("trusted_executable_configured_path_not_canonical:"+label);
  requireRootOwnedExecutableAncestors(file,label);
  const st=fs.lstatSync(file,{bigint:true});
  if(st.isSymbolicLink()||!st.isFile())
    throw new Error("trusted_executable_configured_leaf_invalid:"+label);
  const real=fs.realpathSync.native(file);
  if(real!==file)
    throw new Error("trusted_executable_configured_path_not_canonical:"+label);
  if(!st.isFile()||st.isSymbolicLink()||st.uid!==0n||st.gid!==0n||
     st.nlink!==1n||(st.mode&0o022n)!==0n||(st.mode&0o111n)===0n)
    throw new Error("trusted_executable_invalid:"+label);
  if(!fs.constants.O_NOFOLLOW||!fs.constants.O_NONBLOCK)
    throw new Error("trusted_executable_open_flags_unavailable");
  const fd=fs.openSync(real,
    fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW|fs.constants.O_NONBLOCK);
  let success=false;
  try{
    if(fd<3)throw new Error("trusted_executable_standard_fd_collision:"+label);
    const opened=fs.fstatSync(fd,{bigint:true});
    if(!sameTrustedExecutableGeneration(st,opened))
      throw new Error("trusted_executable_rebound:"+label);
    const t={fd,real,label,opened};
    revalidateRetainedTrustedExecutable(t);
    success=true;return t;
  }finally{if(!success)fs.closeSync(fd);}
}
function closeRetainedTrustedExecutable(t){
  if(t&&Number.isInteger(t.fd)&&t.fd>=3){fs.closeSync(t.fd);t.fd=-1;}
}
function runRetainedTrustedExecutable(t,args,opt={}){
  revalidateRetainedTrustedExecutable(t);
  const stdio=[opt.stdinIgnore===true?"ignore":"pipe","pipe","pipe"];
  while(stdio.length<=t.fd)stdio.push("ignore");
  stdio[t.fd]=t.fd;
  if(typeof opt.beforeSpawn==="function")opt.beforeSpawn();
  revalidateRetainedTrustedExecutable(t);
  const r=spawnSync("/proc/self/fd/"+String(t.fd),args,{
    cwd:opt.cwd??"/",env:opt.env??cleanRootEnv(),
    input:opt.input,encoding:"utf8",stdio,
    timeout:opt.timeout??60_000,maxBuffer:MAX_OUTPUT,
  });
  try{
    if(r.error)throw new Error("spawn_error:"+safeReason(r.error.message));
    return r;
  }finally{revalidateRetainedTrustedExecutable(t);}
}
let activeRootExecutionTools=null;
function openRootExecutionTools(){
  const setpriv=openRetainedTrustedExecutable(SETPRIV,"setpriv");
  let gitTool=null,nativeTool=null;
  try{
    gitTool=openRetainedTrustedExecutable(GIT,"git");
    nativeTool=openRetainedTrustedExecutable(FIXED_NATIVE,"native");
    const tools={
      setpriv,git:gitTool,native:nativeTool,
      revalidate(){
        for(const t of [setpriv,gitTool,nativeTool])
          revalidateRetainedTrustedExecutable(t);
      },
      close(){
        let failure=null;
        for(const t of [nativeTool,gitTool,setpriv]){
          try{revalidateRetainedTrustedExecutable(t);}
          catch(error){if(!failure)failure=error;}
          try{closeRetainedTrustedExecutable(t);}
          catch(error){if(!failure)failure=error;}
        }
        if(failure)throw failure;
      },
    };
    tools.revalidate();return tools;
  }catch(error){
    for(const t of [nativeTool,gitTool,setpriv])
      if(t)try{closeRetainedTrustedExecutable(t);}catch{/**/}
    throw error;
  }
}
function requireActiveRootExecutionTools(){
  if(activeRootExecutionTools===null)
    throw new Error("root_execution_tools_not_retained");
  activeRootExecutionTools.revalidate();
  return activeRootExecutionTools;
}
function sameFileIdentity(left,right){
  return left.dev===right.dev&&left.ino===right.ino&&
    left.uid===right.uid&&left.gid===right.gid&&
    left.mode===right.mode&&left.nlink===right.nlink&&
    left.size===right.size;
}
function readProcStartTicks(pid){
  if(!Number.isSafeInteger(pid)||pid<=1){
    throw new Error("binder_preentry_process_pid_invalid");
  }
  const raw=fs.readFileSync("/proc/"+String(pid)+"/stat","utf8");
  const right=raw.lastIndexOf(")");
  if(right<0||raw[right+1]!==" "){
    throw new Error("binder_preentry_process_stat_invalid");
  }
  const fields=raw.slice(right+2).trim().split(/\s+/u);
  const value=fields[19];
  if(!/^[1-9][0-9]*$/u.test(String(value||""))){
    throw new Error("binder_preentry_process_start_ticks_invalid");
  }
  return String(value);
}
function parseBinderParentProof(fd){
  let raw;
  try{raw=fs.readFileSync(fd,{encoding:"utf8"});}
  finally{try{fs.closeSync(fd);}catch(closeError){void closeError;}}
  if(Buffer.byteLength(raw,"utf8")<2||Buffer.byteLength(raw,"utf8")>2048){
    throw new Error("binder_preentry_parent_proof_size_invalid");
  }
  let proof;
  try{proof=JSON.parse(raw);}
  catch{throw new Error("binder_preentry_parent_proof_json_invalid");}
  if(!proof||typeof proof!=="object"||Array.isArray(proof)){
    throw new Error("binder_preentry_parent_proof_object_invalid");
  }
  const keys=Object.keys(proof).sort();
  const expected=[
    "schema","parent_pid","parent_start_ticks","child_pid","child_start_ticks",
    "preentry_dev","preentry_ino","binder_dev","binder_ino",
    "node_dev","node_ino","source_head","runtime_head",
    "binder_sha256","binder_bytes",
  ].sort();
  if(JSON.stringify(keys)!==JSON.stringify(expected)){
    throw new Error("binder_preentry_parent_proof_schema_invalid");
  }
  if(proof.schema!==BINDER_PROOF_SCHEMA||
     !Number.isSafeInteger(proof.parent_pid)||proof.parent_pid<=1||
     !Number.isSafeInteger(proof.child_pid)||proof.child_pid<=1||
     !SHA40.test(String(proof.source_head||""))||
     !SHA40.test(String(proof.runtime_head||""))||
     !HEX64.test(String(proof.binder_sha256||""))||
     !Number.isSafeInteger(proof.binder_bytes)||
     proof.binder_bytes<1||proof.binder_bytes>4*1024*1024){
    throw new Error("binder_preentry_parent_proof_identity_invalid");
  }
  for(const key of [
    "parent_start_ticks","child_start_ticks",
    "preentry_dev","preentry_ino","binder_dev","binder_ino",
    "node_dev","node_ino",
  ]){
    if(!/^[1-9][0-9]*$/u.test(String(proof[key]||""))){
      throw new Error("binder_preentry_parent_proof_field_invalid:"+key);
    }
  }
  return Object.freeze(proof);
}
/* Authenticated executed snapshot and currently installed file are
 * distinct evidence. Rehash the retained installed FD against the native
 * parent's compile-bound source digest, including terminal path identity. */
function requireCurrentInstalledBinderBytes(fd,installedPath,expectedBytes,expectedSha){
  if(!Number.isSafeInteger(expectedBytes)||expectedBytes<1||
     expectedBytes>4*1024*1024||!HEX64.test(String(expectedSha||""))){
    throw new Error("binder_preentry_installed_source_expected_identity_invalid");
  }
  const before=fs.fstatSync(fd,{bigint:true});
  const visibleBefore=fs.lstatSync(installedPath,{bigint:true});
  if(!before.isFile()||!visibleBefore.isFile()||
     visibleBefore.isSymbolicLink()||before.size!==BigInt(expectedBytes)||
     !sameTrustedExecutableGeneration(before,visibleBefore)){
    throw new Error("binder_preentry_installed_source_generation_changed");
  }
  const digest=crypto.createHash("sha256");
  const buffer=Buffer.allocUnsafe(8192);
  let remaining=expectedBytes;
  let offset=0;
  while(remaining>0){
    const want=Math.min(buffer.length,remaining);
    const n=fs.readSync(fd,buffer,0,want,offset);
    if(n<1||n>want)throw new Error("binder_preentry_installed_source_short_read");
    digest.update(buffer.subarray(0,n));
    remaining-=n;offset+=n;
  }
  if(fs.readSync(fd,buffer,0,1,offset)!==0){
    throw new Error("binder_preentry_installed_source_grew");
  }
  const after=fs.fstatSync(fd,{bigint:true});
  const visibleAfter=fs.lstatSync(installedPath,{bigint:true});
  if(!sameTrustedExecutableGeneration(before,after)||
     !sameTrustedExecutableGeneration(after,visibleAfter)){
    throw new Error("binder_preentry_installed_source_generation_changed");
  }
  if(digest.digest("hex")!==expectedSha){
    throw new Error("binder_preentry_installed_source_digest_not_accepted");
  }
  return true;
}
function revalidateBinderPreentry(proof,sourceHead,runtimeHead){
  if(proof.source_head!==sourceHead){
    throw new Error("binder_preentry_source_head_proof_mismatch");
  }
  if(proof.runtime_head!==runtimeHead){
    throw new Error("binder_preentry_runtime_head_proof_mismatch");
  }
  if(process.pid!==proof.child_pid||process.ppid!==proof.parent_pid){
    throw new Error("binder_preentry_parent_child_pid_mismatch");
  }
  if(readProcStartTicks(process.pid)!==proof.child_start_ticks||
     readProcStartTicks(process.ppid)!==proof.parent_start_ticks){
    throw new Error("binder_preentry_parent_child_generation_mismatch");
  }
  let parentExe;
  try{parentExe=fs.realpathSync.native("/proc/"+String(process.ppid)+"/exe");}
  catch{throw new Error("binder_preentry_parent_executable_unavailable");}
  if(parentExe!==FIXED_BINDER_PREENTRY){
    throw new Error("binder_preentry_parent_executable_mismatch");
  }
  const preentry=fs.lstatSync(FIXED_BINDER_PREENTRY,{bigint:true});
  const parentActual=fs.statSync(
    "/proc/"+String(process.ppid)+"/exe",
    {bigint:true},
  );
  const visibleBinder=fs.lstatSync(FIXED_BINDER_SOURCE,{bigint:true});
  const visibleNode=fs.lstatSync(fs.realpathSync(FIXED_NODE),{bigint:true});
  const nodeActual=fs.statSync("/proc/self/exe",{bigint:true});
  if(!sameFileIdentity(preentry,parentActual)){
    throw new Error("binder_preentry_parent_running_generation_mismatch");
  }
  if(!sameFileIdentity(visibleNode,nodeActual)){
    throw new Error("binder_preentry_node_running_generation_mismatch");
  }
  const fdRaw=String(process.env[BINDER_FD_ENV]??"");
  if(!/^[0-9]{1,3}$/u.test(fdRaw)){
    throw new Error("binder_preentry_binder_fd_invalid");
  }
  const binderFd=Number(fdRaw);
  if(!Number.isSafeInteger(binderFd)||binderFd<3){
    throw new Error("binder_preentry_binder_fd_invalid");
  }
  const retainedBinder=fs.fstatSync(binderFd,{bigint:true});
  const pairs=[
    ["preentry_dev",preentry.dev],["preentry_ino",preentry.ino],
    ["binder_dev",retainedBinder.dev],["binder_ino",retainedBinder.ino],
    ["node_dev",visibleNode.dev],["node_ino",visibleNode.ino],
  ];
  for(const [key,value] of pairs){
    if(String(value)!==proof[key]){
      throw new Error("binder_preentry_installed_generation_mismatch:"+key);
    }
  }
  if(!retainedBinder.isFile()||visibleBinder.isSymbolicLink()||
     !visibleBinder.isFile()||retainedBinder.uid!==0n||
     (retainedBinder.mode&0o022n)!==0n||
     !sameTrustedExecutableGeneration(retainedBinder,visibleBinder)){
    throw new Error("binder_preentry_binder_generation_invalid");
  }
  requireCurrentInstalledBinderBytes(
    binderFd,FIXED_BINDER_SOURCE,proof.binder_bytes,proof.binder_sha256,
  );
  if(fs.realpathSync(process.execPath)!==fs.realpathSync(FIXED_NODE)){
    throw new Error("binder_preentry_node_executable_mismatch");
  }
  return true;
}
function requireBinderPreentry(sourceHead,runtimeHead){
  if(process.argv[1]!=="-"){
    throw new Error("binder_native_stdin_entry_required");
  }
  if(process.env[BINDER_PREENTRY_ENV]!==BINDER_PREENTRY_MARKER){
    throw new Error("binder_native_parent_marker_required");
  }
  for(const name of [
    "NODE_OPTIONS","NODE_PATH","LD_PRELOAD","LD_LIBRARY_PATH","LD_AUDIT",
    "PYTHONPATH","PYTHONHOME",
  ]){
    if(Object.hasOwn(process.env,name)){
      throw new Error("binder_preentry_loader_environment_not_clean:"+name);
    }
  }
  const proofRaw=String(process.env[BINDER_PROOF_FD_ENV]??"");
  if(!/^[0-9]{1,3}$/u.test(proofRaw)){
    throw new Error("binder_preentry_proof_fd_invalid");
  }
  const proofFd=Number(proofRaw);
  if(!Number.isSafeInteger(proofFd)||proofFd<3){
    throw new Error("binder_preentry_proof_fd_invalid");
  }
  const proof=parseBinderParentProof(proofFd);
  revalidateBinderPreentry(proof,sourceHead,runtimeHead);
  return proof;
}

function runAsRuntimeUser(command,args,options={}){
  const tools=requireActiveRootExecutionTools();
  if(command!==GIT)throw new Error("runtime_command_not_retained");
  const childCommandFd=tools.setpriv.fd===3?4:3;
  const maxFd=Math.max(tools.setpriv.fd,childCommandFd);
  const stdio=["pipe","pipe","pipe"];
  while(stdio.length<=maxFd)stdio.push("ignore");
  stdio[tools.setpriv.fd]=tools.setpriv.fd;
  stdio[childCommandFd]=tools.git.fd;
  tools.revalidate();
  const r=spawnSync("/proc/self/fd/"+String(tools.setpriv.fd),[
    "--no-new-privs",
    "--reuid="+String(RUNTIME_UID),
    "--regid="+String(RUNTIME_GID),
    "--clear-groups",
    "/proc/self/fd/"+String(childCommandFd),
    ...args,
  ],{
    cwd:options.cwd??ROOT,env:options.env??cleanGitEnv(),
    input:options.input,encoding:"utf8",stdio,
    timeout:options.timeout??30_000,maxBuffer:MAX_OUTPUT,
  });
  try{
    if(r.error)throw new Error("spawn_error:"+safeReason(r.error.message));
    return r;
  }finally{tools.revalidate();}
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
  if(r.status!==0)throw new Error("git_failed:"+String(args[0]));
  if(r.stderr!=="")throw new Error("git_unexpected_stderr:"+String(args[0]));
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
function sourceCompatibility(expectedRuntimeHead,gitFn=git){
  if(expectedRuntimeHead!==RUNTIME_HEAD){
    throw new Error("runtime_expected_head_mismatch");
  }
  const sourceHead=gitFn(["rev-parse","--verify","HEAD"]).trim();
  const sourceTree=gitFn(["rev-parse","--verify","HEAD^{tree}"]).trim();
  if(!SHA40.test(sourceHead)||!SHA40.test(sourceTree)){
    throw new Error("source_generation_identity_invalid");
  }
  if(gitFn(["branch","--show-current"]).trim()!=="main"){
    throw new Error("source_branch_not_main");
  }
  if(gitFn(["status","--porcelain=v1","--untracked-files=no"])!==""){
    throw new Error("tracked_source_checkout_not_exact");
  }
  requireActualObjectAncestry(sourceHead,gitFn);
  for(const [_label,relative,expectedBlob] of SOURCE_RUNTIME_DEPENDENCY_SPECS){
    const runtimeBlob=gitFn(["rev-parse",RUNTIME_HEAD+":"+relative]).trim();
    const sourceBlob=gitFn(["rev-parse",sourceHead+":"+relative]).trim();
    if(runtimeBlob!==expectedBlob||sourceBlob!==expectedBlob){
      throw new Error("source_runtime_dependency_blob_mismatch:"+relative);
    }
  }
  const candidateBlob=gitFn(["rev-parse",sourceHead+":"+CANDIDATE_REL]).trim();
  if(candidateBlob!==CANDIDATE_BLOB){
    throw new Error("source_candidate_blob_mismatch");
  }
  const finalHead=gitFn(["rev-parse","--verify","HEAD"]).trim();
  const finalTree=gitFn(["rev-parse","--verify","HEAD^{tree}"]).trim();
  if(finalHead!==sourceHead||finalTree!==sourceTree||
     gitFn(["branch","--show-current"]).trim()!=="main"||
     gitFn(["status","--porcelain=v1","--untracked-files=no"])!==""){
    throw new Error("source_generation_changed_during_compatibility");
  }
  return Object.freeze({
    runtime_head:RUNTIME_HEAD,
    source_head:sourceHead,
    source_tree:sourceTree,
    source_runtime_actual_object_ancestry:true,
    source_runtime_dependency_count:SOURCE_RUNTIME_DEPENDENCY_SPECS.length,
    source_runtime_complete_dependency_set_bound:true,
    tracked_source_checkout_exact:true,
    untracked_paths_enumerated:false,
    untracked_paths_source_authority:false,
  });
}
function gitObject(expectedHead,relative,expectedBlob){
  if(!SHA40.test(String(expectedHead||""))){
    throw new Error("git_object_expected_head_invalid");
  }
  const raw=Buffer.from(git(["cat-file","blob",expectedHead+":"+relative]),"utf8");
  if(gitBlob(raw)!==expectedBlob){
    raw.fill(0);
    throw new Error("git_object_blob_mismatch:"+relative);
  }
  return raw;
}
function validateChildReceipt(receipt,expectedHead,compatibility){
  if(!compatibility||typeof compatibility!=="object"||
     !SHA40.test(String(compatibility.source_head||""))||
     !SHA40.test(String(compatibility.source_tree||""))){
    throw new Error("child_source_compatibility_invalid");
  }
  const required={
    marker:CHILD_MARKER,
    version:4,
    status:CHILD_STATUS,
    source_head:expectedHead,
    runtime_head:expectedHead,
    source_checkout_head:compatibility.source_head,
    source_checkout_tree:compatibility.source_tree,
    source_runtime_ancestry_bound:true,
    source_runtime_dependency_blob_equality:true,
    tracked_source_checkout_exact:true,
    untracked_paths_enumerated:false,
    untracked_paths_source_authority:false,
    credential_lock_id:EXPECTED_CREDENTIAL_LOCK,
    runtime_uid:RUNTIME_UID,
    signer_address:EXPECTED_FULFILLER,
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
    next_action:CHILD_NEXT_ACTION,
  };
  for(const [key,want] of Object.entries(required)){
    if(receipt?.[key]!==want)throw new Error("child_receipt_field_invalid:"+key);
  }
  if(!CHILD_RECEIPT.test(String(receipt.receipt_id||""))||
     !Number.isSafeInteger(receipt.manager_pid)||receipt.manager_pid<=1||
     !Number.isSafeInteger(receipt.main_pid)||receipt.main_pid<=1||
     typeof receipt.manager_start_ticks!=="string"||
     !/^[1-9][0-9]*$/u.test(receipt.manager_start_ticks)||
     typeof receipt.service_start_ticks!=="string"||
     !/^[1-9][0-9]*$/u.test(receipt.service_start_ticks)||
     !HEX64.test(String(receipt.credential_complete_dropin_set_sha256||""))||
     !HEX64.test(String(receipt.credential_complete_credential_set_sha256||""))||
     receipt.credential_epoch2_target_match_count!==1){
    throw new Error("child_receipt_identity_invalid");
  }
  const sealed=receipt.sealed_public_evidence;
  if(!sealed||typeof sealed!=="object"||Array.isArray(sealed)||
     sealed.marker!==SEALED_MARKER||sealed.version!==2||
     !SEALED_ID.test(String(sealed.evidence_id||""))||
     sealed.source_head!==expectedHead||
     sealed.immutable_fulfiller!==EXPECTED_FULFILLER||
     sealed.credential_id!==EXPECTED_CREDENTIAL_ID||
     sealed.systemd?.main_pid!==receipt.main_pid||
     sealed.transaction_constructed!==false||
     sealed.rpc_call_performed!==false||
     sealed.transaction_broadcast_performed!==false||
     sealed.funds_movement!==false){
    throw new Error("child_sealed_evidence_invalid");
  }
  const copy={...receipt};
  delete copy.receipt_id;
  const expected="voide2livecomp4_"+
    sha256(Buffer.from(canonical(copy),"utf8"));
  if(receipt.receipt_id!==expected){
    throw new Error("child_receipt_id_mismatch");
  }
}
function runNativeLive(runtimeHead,compatibility){
  const tools=requireActiveRootExecutionTools();
  const r=runRetainedTrustedExecutable(tools.native,[
    "--run","--confirm",NATIVE_CONFIRM,"--expected-head",runtimeHead,
  ],{
    env:cleanRootEnv(),
    stdinIgnore:true,
    timeout:120_000,
  });
  if(r.status!==0){
    throw new Error("native_live_composition_failed:"+String(r.status));
  }
  if(r.stderr!=="")throw new Error("native_live_composition_unexpected_stderr");
  let receipt;
  try{receipt=JSON.parse(r.stdout);}
  catch{throw new Error("native_live_composition_json_invalid");}
  validateChildReceipt(receipt,runtimeHead,compatibility);
  return receipt;
}
function loadCandidate(expectedHead){
  const raw=gitObject(expectedHead,CANDIDATE_REL,CANDIDATE_BLOB);
  try{
    let candidate;
    try{candidate=JSON.parse(raw.toString("utf8"));}
    catch{throw new Error("dormant_candidate_json_invalid");}
    validateCandidate(candidate);
    return candidate;
  }finally{raw.fill(0);}
}
function validateCandidate(c){
  if(c?.marker!==CANDIDATE_MARKER||c.version!==4||
     c.status!==CANDIDATE_STATUS||c.canonical_chain_id!==2050||
     c.execution_epoch!==2||c.epoch2_presale_contract!==EXPECTED_PRESALE||
     c.epoch2_fulfiller_public_address!==EXPECTED_FULFILLER){
    throw new Error("dormant_candidate_header_invalid");
  }
  const cfg=c.candidate_configuration;
  if(!cfg||cfg.VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENABLED!=="0"||
     cfg.VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_APPLY_ENABLED!=="0"||
     cfg.VOID_BUY_VOID_PAYMENT_KEYED_FULFILLMENT_CONTRACT_ADDRESS!==EXPECTED_PRESALE||
     cfg.VOID_BUY_VOID_NATIVE_DELIVERY_WALLET_ADDRESS!==EXPECTED_FULFILLER||
     cfg.VOID_BUY_VOID_EPOCH2_CREDENTIAL_SOURCE_BINDING_ID!==EXPECTED_SOURCE_BINDING){
    throw new Error("dormant_candidate_configuration_invalid");
  }
  const s=c.signer_credential_state;
  if(!s||s.signer_offchain_control_proven!==true||
     !HEX64.test(String(s.signer_control_evidence_id_sha256||""))||
     !HEX64.test(String(s.signer_control_message_sha256||""))||
     !SHA40.test(String(s.signer_control_source_head||""))||
     !SHA40.test(String(s.signer_control_source_tree||""))||
     s.systemd_credential_identity_proven!==false||
     s.epoch2_credential_binding_evidence_id!==null||
     s.legacy_wallet_credential_reuse_authorized!==false||
     s.credential_path_selected!==false||
     s.private_key_material_read!==false){
    throw new Error("dormant_candidate_signer_state_invalid");
  }
  const expectedGates=[
    "independently_attest_systemd_credential_identity_and_active_signing_capability",
    "bind_accepted_epoch2_signer_evidence_to_current_runtime_source_generation",
    "qualify_live_exact_chain_receipt_and_either_zero_fee_envelope_or_per_payment_native_gas_funding",
    "complete_current_chain_2050_one_payment_one_fulfillment_canary",
    "coupled_presale_and_wc_void_market_sovereign_activation",
  ];
  if(canonical(c.explicit_remaining_gates)!==canonical(expectedGates)){
    throw new Error("dormant_candidate_remaining_gates_invalid");
  }
  const authority=c.authority;
  if(!authority||authority.candidate_only!==true){
    throw new Error("dormant_candidate_authority_invalid");
  }
  for(const [key,value] of Object.entries(authority)){
    if(key!=="candidate_only"&&value!==false){
      throw new Error("dormant_candidate_authority_overclaim:"+key);
    }
  }
}
function buildBindingReceipt(compatibility,candidate,child){
  validateCandidate(candidate);
  validateChildReceipt(child,RUNTIME_HEAD,compatibility);
  const remainingGates=[
    "qualify_live_exact_chain_receipt_and_either_zero_fee_envelope_or_per_payment_native_gas_funding",
    "complete_current_chain_2050_one_payment_one_fulfillment_canary",
    "coupled_presale_and_wc_void_market_sovereign_activation",
  ];
  const body={
    marker:MARKER,version:4,status:STATUS,
    source_head:compatibility.source_head,
    source_tree:compatibility.source_tree,
    runtime_head:RUNTIME_HEAD,runtime_tree:RUNTIME_TREE,
    source_runtime_actual_object_ancestry:true,
    source_runtime_complete_dependency_set_bound:true,
    source_runtime_dependency_count:SOURCE_RUNTIME_DEPENDENCY_SPECS.length,
    tracked_source_checkout_exact:true,
    untracked_paths_enumerated:false,
    untracked_paths_source_authority:false,
    source_candidate_path:CANDIDATE_REL,
    source_candidate_git_blob:CANDIDATE_BLOB,
    source_candidate_marker:candidate.marker,
    signer_control_evidence_id_sha256:
      candidate.signer_credential_state.signer_control_evidence_id_sha256,
    signer_control_message_sha256:
      candidate.signer_credential_state.signer_control_message_sha256,
    signer_control_source_head:
      candidate.signer_credential_state.signer_control_source_head,
    source_runtime_compatibility_sha256:
      sha256(Buffer.from(canonical(compatibility),"utf8")),
    runtime_policy_authenticated_by_native_preentry:true,
    runtime_policy_runtime_head:RUNTIME_HEAD,
    authenticated_credential_live_receipt:child,
    authenticated_credential_live_receipt_id:child.receipt_id,
    authenticated_credential_live_receipt_sha256:
      sha256(Buffer.from(canonical(child),"utf8")),
    child_runner_v4_receipt_bound:true,
    child_runner_v4_source_checkout_bound:true,
    canonical_chain_id:2050,execution_epoch:2,
    epoch2_presale_contract:EXPECTED_PRESALE,
    epoch2_fulfiller_public_address:EXPECTED_FULFILLER,
    signer_credential_state:{
      signer_offchain_control_proven:true,
      systemd_credential_identity_proven:true,
      active_signing_capability_proven:true,
      runtime_source_generation_bound:true,
      source_runtime_compatibility_exact:true,
      authenticated_private_manager_generation_bound:true,
      native_parent_installed_generation_bound:true,
      runner_v4_source_checkout_bound:true,
      epoch2_authenticated_credential_receipt_id:child.receipt_id,
      legacy_wallet_credential_reuse_authorized:false,
      private_key_material_read_in_sealed_child:true,
      private_key_material_output:false,
      transaction_signing_proven:false,
    },
    explicit_remaining_gates:remainingGates,
    customer_safe_to_pay:false,
    authority:{
      candidate_only:true,operational_configuration_selected:false,
      credential_or_wallet_access:false,service_mutation:false,signer_access:false,
      transaction_signing:false,transaction_broadcast:false,
      public_presale_activation:false,wc_void_market_activation:false,
      funds_movement:false,automatic_retry:false,
    },
    production_host_evidence_authority:false,next_action:NEXT_ACTION,
  };
  return Object.freeze({
    ...body,
    binding_receipt_id:
      "voide2candbind3r4_"+sha256(Buffer.from(canonical(body),"utf8")),
  });
}
function plan(){
  console.log(MARKER);
  console.log("mode=plan");
  console.log("source_head_runtime_observed=true");
  console.log("source_tree_runtime_observed=true");
  console.log("runtime_head="+RUNTIME_HEAD);
  console.log("runtime_policy_sha256_compile_constant_absent=true");
  console.log("runtime_policy_authenticated_by_native_preentry_required=true");
  console.log("source_runtime_actual_object_ancestry_required=true");
  console.log("source_runtime_revision_walk_metadata_authority=false");
  console.log("source_runtime_dependency_count="+String(SOURCE_RUNTIME_DEPENDENCY_SPECS.length));
  console.log("source_runtime_complete_dependency_set_bound=true");
  console.log("tracked_source_checkout_exact_required=true");
  console.log("untracked_paths_enumerated=false");
  console.log("untracked_paths_source_authority=false");
  console.log("native_binder_first_entry_required_for_live=true");
  console.log("private_binder_parent_proof_required_for_live=true");
  console.log("binder_parent_proof_binds_source_and_runtime_heads=true");
  console.log("caller_stdin_alone_authority=false");
  console.log("root_required_for_run=true");
  console.log("root_setpriv_git_native_retained_first_exec_required=true");
  console.log("trusted_executable_ancestor_and_runtime_acl_custody_required=true");
  console.log("exact_dormant_candidate_v4_current_source_git_object_required=true");
  console.log("source_compatibility_before_after_sensitive_sequence_required=true");
  console.log("fixed_runtime_native_v3_live_composition_required=true");
  console.log("runner_v4_child_receipt_required=true");
  console.log("runner_v4_child_source_checkout_crosscheck_required=true");
  console.log("runtime_native_receives_runtime_policy_head_only=true");
  console.log("historical_compat_v3_source_authority=false");
  console.log("canonical_checkout_rewind_performed=false");
  console.log("installed_policy_mutation=false");
  console.log("arbitrary_live_receipt_input_accepted=false");
  console.log("signer_control_predecessor_evidence_required=true");
  console.log("credential_content_access=false");
  console.log("private_key_access=false");
  console.log("signing=false");
  console.log("transaction=false");
  console.log("payment_acceptance=false");
  console.log("customer_safe_to_pay=false");
  console.log("public_presale_activation=false");
  console.log("wc_void_market_activation=false");
  console.log("funds_movement=false");
  console.log("production_host_evidence_authority=false");
  console.log("next_action=SEPARATELY_AUTHORIZE_EPOCH2_V3R_DORMANT_CANDIDATE_LIVE_BINDING_V4");
}
function proveRetainedNativeElfParserFixture(){
  // Disposable nonexecuted ELF; never a privileged live native child.
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"void-native-parser-v4-"));
  const file=path.join(dir,"nonexecuted-elf");
  let fd=-1;
  const sample=Buffer.alloc(120);
  sample.set([0x7f,0x45,0x4c,0x46,2,1,1],0);
  sample.writeUInt16LE(2,16);sample.writeUInt16LE(62,18);
  sample.writeUInt32LE(1,20);sample.writeBigUInt64LE(64n,32);
  sample.writeUInt16LE(64,52);sample.writeUInt16LE(56,54);
  sample.writeUInt16LE(1,56);sample.writeUInt32LE(1,64);
  const verify=(bytes,expected,shaOverride)=>{
    fs.writeFileSync(file,bytes);
    let reason="";
    try{verifyRetainedNativeElfBytes(
      {fd,real:file,label:"fixture"},bytes.length,shaOverride??sha256(bytes),
    );}catch(error){reason=String(error?.message||error);}
    if(reason!==expected)throw new Error(
      "native_parser_negative_missing:"+expected+":"+reason,
    );
  };
  try{
    fs.writeFileSync(file,sample,{flag:"wx",mode:0o600});
    fd=fs.openSync(file,fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW);
    verifyRetainedNativeElfBytes({fd,real:file},sample.length,sha256(sample));
    const tampered=Buffer.from(sample);tampered[119]=0xff;
    verify(tampered,"trusted_native_binary_sha256_not_accepted",sha256(sample));
    const script=Buffer.from(sample);script[0]=0x23;
    verify(script,"trusted_native_static_elf_identity_invalid");
    const badPh=Buffer.from(sample);badPh.writeBigUInt64LE(100n,32);
    verify(badPh,"trusted_native_program_header_bounds_invalid");
    const interp=Buffer.from(sample);interp.writeUInt32LE(3,64);
    verify(interp,"trusted_native_dynamic_interpreter_forbidden");
    const dynamic=Buffer.from(sample);dynamic.writeUInt32LE(2,64);
    verify(dynamic,"trusted_native_dynamic_interpreter_forbidden");
    const noLoad=Buffer.from(sample);noLoad.writeUInt32LE(4,64);
    verify(noLoad,"trusted_native_load_segments_missing");
    // Each branch of the PT_LOAD extent OR must fail on its own.
    // If only one branch were present, these two negatives would not HOLD.
    const badMemoryOnly=Buffer.from(sample);
    badMemoryOnly.writeBigUInt64LE(1n,64+32); // p_filesz, inside file
    badMemoryOnly.writeBigUInt64LE(0n,64+40); // p_memsz < p_filesz
    verify(badMemoryOnly,"trusted_native_load_segment_bounds_invalid");
    const badFileOnly=Buffer.from(sample);
    badFileOnly.writeBigUInt64LE(200n,64+32); // p_filesz beyond ELF end
    badFileOnly.writeBigUInt64LE(200n,64+40); // p_memsz >= p_filesz
    verify(badFileOnly,"trusted_native_load_segment_bounds_invalid");
    const badOffsetFileOnly=Buffer.from(sample);
    badOffsetFileOnly.writeBigUInt64LE(110n,64+8); // p_offset
    badOffsetFileOnly.writeBigUInt64LE(20n,64+32); // p_filesz
    badOffsetFileOnly.writeBigUInt64LE(20n,64+40); // p_memsz
    verify(badOffsetFileOnly,"trusted_native_load_segment_bounds_invalid");
    fs.writeFileSync(file,sample);
    const read=fs.readSync;
    let shortInjected=false;
    try{
      fs.readSync=(n,...args)=>{
        if(n===fd&&!shortInjected){shortInjected=true;return 0;}
        return read(n,...args);
      };
      let held=false;
      try{verifyRetainedNativeElfBytes({fd,real:file},sample.length,sha256(sample));}
      catch(error){held=String(error?.message||"")==="trusted_native_binary_short_read";}
      if(!held||!shortInjected)throw new Error("native_parser_short_read_not_rejected");
    }finally{fs.readSync=read;}
    let driftInjected=false;
    try{
      fs.readSync=(n,...args)=>{
        const got=read(n,...args);
        if(n===fd&&!driftInjected){
          driftInjected=true;
          fs.utimesSync(file,new Date(0),new Date(123456789000));
        }
        return got;
      };
      let held=false;
      try{verifyRetainedNativeElfBytes({fd,real:file},sample.length,sha256(sample));}
      catch(error){
        held=String(error?.message||"")==="trusted_native_binary_generation_changed_during_hash";
      }
      if(!held||!driftInjected)throw new Error("native_parser_generation_drift_not_rejected");
    }finally{fs.readSync=read;}
  }finally{
    if(fd>=0)fs.closeSync(fd);
    fs.unlinkSync(file);fs.rmdirSync(dir);
  }
}
function proveInstalledBinderReceiptGenerationFixture(){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"void-e2-binder-receipt-"));
  const file=path.join(dir,"binder-fixture.mjs");
  const accepted=Buffer.alloc(4096,0x41);
  const substituted=Buffer.alloc(4096,0x42);
  let fd=-1;
  try{
    fs.writeFileSync(file,accepted,{mode:0o600});
    fd=fs.openSync(file,fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW);
    const bound=sha256(accepted);
    requireCurrentInstalledBinderBytes(fd,file,accepted.length,bound);
    const original=fs.fstatSync(fd,{bigint:true});
    fs.writeFileSync(file,substituted);
    const modified=fs.fstatSync(fd,{bigint:true});
    if(!sameFileIdentity(original,modified)){
      throw new Error("binder_receipt_same_inode_mutation_fixture_invalid");
    }
    let refused=false;
    try{requireCurrentInstalledBinderBytes(fd,file,accepted.length,bound);}
    catch(error){
      refused=/binder_preentry_installed_source_(generation_changed|digest_not_accepted)/u
        .test(String(error?.message||""));
    }
    if(!refused)throw new Error("binder_receipt_same_inode_content_mutation_accepted");
    fs.unlinkSync(file);
    fs.writeFileSync(file,accepted,{mode:0o600});
    let rebound=false;
    try{requireCurrentInstalledBinderBytes(fd,file,accepted.length,bound);}
    catch(error){
      rebound=String(error?.message||"")
        .includes("binder_preentry_installed_source_generation_changed");
    }
    if(!rebound)throw new Error("binder_receipt_visible_path_rebind_accepted");
  }finally{
    // Disposable evidence may not silently swallow cleanup failures.
    // The private fixture has exactly one file and directory to remove.
    if(fd>=0)fs.closeSync(fd);
    if(fs.existsSync(file))fs.unlinkSync(file);
    fs.rmdirSync(dir);
  }
}
function selfTest(){
  proveInstalledBinderReceiptGenerationFixture();
  proveRetainedNativeElfParserFixture();
  // The static public Git tool is safe to exercise under an unprivileged
  // Actions runner. No protected credentials or native live runtime execute.
  const selfGit=openRetainedTrustedExecutable(GIT,"git_self_test");
  const selfSetpriv=openRetainedTrustedExecutable(SETPRIV,"setpriv_self_test");
  try{
    const version=runRetainedTrustedExecutable(selfGit,["--version"],{
      cwd:"/",env:cleanRootEnv(),timeout:10_000,
    });
    if(version.status!==0||
       !String(version.stdout||"").startsWith("git version ")||
       version.stderr!==""){
      throw new Error("retained_git_actual_exec_self_test_failed");
    }
    let ancestorHeld=false;
    try{requireRootOwnedExecutableAncestors("/tmp/void-unsafe-exec","fixture");}
    catch{ancestorHeld=true;}
    if(!ancestorHeld)throw new Error("trusted_ancestor_self_test_failed");
    let reboundHeld=false;
    try{
      runRetainedTrustedExecutable(
        {...selfGit,real:selfSetpriv.real},["--version"],{
          cwd:"/",env:cleanRootEnv(),timeout:10_000,
        },
      );
    }catch(error){
      reboundHeld=String(error?.message||"")
        .includes("trusted_executable_generation_changed");
    }
    if(!reboundHeld)throw new Error("retained_path_rebind_self_test_failed");
    // A cosmetically normalized path aliases the trusted ELF but must not
    // pass as an authority-bearing configured pathname.
    let lexicalAliasHeld=false;
    try{
      openRetainedTrustedExecutable("/usr/bin/../bin/git","lexical_alias_fixture");
    }catch(error){
      lexicalAliasHeld=String(error?.message||"")
        .includes("trusted_executable_configured_path_not_canonical");
    }
    if(!lexicalAliasHeld)throw new Error("configured_lexical_alias_self_test_failed");
    // Ubuntu 24.04 normally uses a /bin -> /usr/bin symlink. If present,
    // the configured symlink *ancestor* must HOLD before realpath is called.
    if(fs.lstatSync("/bin").isSymbolicLink()){
      let symlinkAncestorHeld=false;
      try{
        openRetainedTrustedExecutable("/bin/git","symlinked_ancestor_fixture");
      }catch(error){
        symlinkAncestorHeld=String(error?.message||"")
          .includes("trusted_executable_ancestor_invalid");
      }
      if(!symlinkAncestorHeld)
        throw new Error("configured_symlink_ancestor_self_test_failed");
    }
    // An unrelated root-owned ELF is never native-child authority even if
    // its path, ACL, inode and ownership would pass generic custody checks.
    let wrongNativeHeld=false;
    try{openRetainedTrustedExecutable(GIT,"native");}
    catch(error){
      wrongNativeHeld=String(error?.message||"").includes(
        "trusted_native_binary_size_not_accepted",
      )||String(error?.message||"").includes(
        "trusted_native_binary_sha256_not_accepted",
      );
    }
    if(!wrongNativeHeld)
      throw new Error("trusted_root_native_wrong_binary_self_test_failed");
  }finally{
    closeRetainedTrustedExecutable(selfSetpriv);
    closeRetainedTrustedExecutable(selfGit);
  }

  if(SOURCE_RUNTIME_DEPENDENCY_SPECS.length!==9){
    throw new Error("runtime_compatibility_identity_self_test_failed");
  }
  const fakeSource="1".repeat(40);
  const fakeTree="2".repeat(40);
  const fakeRuntimeTree="3".repeat(40);
  function fakeGit(args){
    const joined=args.join(" ");
    if(joined==="rev-parse --verify HEAD")return fakeSource+"\n";
    if(joined==="rev-parse --verify HEAD^{tree}")return fakeTree+"\n";
    if(joined==="branch --show-current")return "main\n";
    if(joined==="status --porcelain=v1 --untracked-files=no")return "";
    if(args[0]==="cat-file"&&args[1]==="-t")return "commit\n";
    if(args[0]==="cat-file"&&args[1]==="-p"){
      if(args[2]===fakeSource)return "tree "+fakeTree+"\nparent "+RUNTIME_HEAD+"\n\nsource\n";
      if(args[2]===RUNTIME_HEAD)return "tree "+fakeRuntimeTree+"\n\nruntime\n";
      throw new Error("fake_commit_unknown");
    }
    if(args[0]==="rev-parse"&&args.length===2&&args[1].includes(":")){
      const [head,relative]=args[1].split(":",2);
      if(relative===CANDIDATE_REL&&head===fakeSource)return CANDIDATE_BLOB+"\n";
      const row=SOURCE_RUNTIME_DEPENDENCY_SPECS.find((entry)=>entry[1]===relative);
      if(row&&(head===fakeSource||head===RUNTIME_HEAD))return row[2]+"\n";
    }
    throw new Error("fake_git_unhandled:"+joined);
  }
  const compat=sourceCompatibility(RUNTIME_HEAD,fakeGit);
  if(compat.source_head!==fakeSource||compat.source_tree!==fakeTree||
     compat.source_runtime_dependency_count!==9||
     compat.source_runtime_actual_object_ancestry!==true){
    throw new Error("source_compatibility_self_test_failed");
  }
  const sealed={
    marker:SEALED_MARKER,
    version:2,
    evidence_id:"voide2sealed2_"+"4".repeat(64),
    source_head:RUNTIME_HEAD,
    immutable_fulfiller:EXPECTED_FULFILLER,
    credential_id:EXPECTED_CREDENTIAL_ID,
    systemd:{main_pid:4242},
    transaction_constructed:false,
    rpc_call_performed:false,
    transaction_broadcast_performed:false,
    funds_movement:false,
  };
  const childBody={
    marker:CHILD_MARKER,
    version:4,
    status:CHILD_STATUS,
    source_head:RUNTIME_HEAD,
    runtime_head:RUNTIME_HEAD,
    source_checkout_head:compat.source_head,
    source_checkout_tree:compat.source_tree,
    source_runtime_ancestry_bound:true,
    source_runtime_dependency_blob_equality:true,
    tracked_source_checkout_exact:true,
    untracked_paths_enumerated:false,
    untracked_paths_source_authority:false,
    sealed_public_evidence:sealed,
    credential_lock_id:EXPECTED_CREDENTIAL_LOCK,
    credential_qualification_sha256:"5".repeat(64),
    credential_complete_dropin_set_sha256:"6".repeat(64),
    credential_complete_dropin_set_count:2,
    credential_complete_credential_set_sha256:"7".repeat(64),
    credential_complete_credential_set_count:4,
    credential_epoch2_target_match_count:1,
    runtime_uid:RUNTIME_UID,
    manager_pid:2693,
    manager_start_ticks:"1409",
    main_pid:4242,
    service_start_ticks:"998877",
    signer_address:EXPECTED_FULFILLER,
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
    next_action:CHILD_NEXT_ACTION,
  };
  const child=Object.freeze({
    ...childBody,
    receipt_id:"voide2livecomp4_"+
      sha256(Buffer.from(canonical(childBody),"utf8")),
  });
  validateChildReceipt(child,RUNTIME_HEAD,compat);
  let childDriftRejected=false;
  try{
    validateChildReceipt(
      {...child,source_checkout_head:"8".repeat(40)},
      RUNTIME_HEAD,
      compat,
    );
  }catch(error){
    childDriftRejected=
      String(error?.message||error)==="child_receipt_field_invalid:source_checkout_head";
  }
  if(!childDriftRejected){
    throw new Error("runner_v4_child_source_checkout_drift_not_rejected");
  }
  function fakeGraftOnly(args){
    if(args[0]==="cat-file"&&args[1]==="-t")return "commit\n";
    if(args[0]==="cat-file"&&args[1]==="-p"){
      if(args[2]===fakeSource)return "tree "+fakeTree+"\n\nsource\n";
      if(args[2]===RUNTIME_HEAD)return "tree "+fakeRuntimeTree+"\n\nruntime\n";
    }
    return fakeGit(args);
  }
  let graftRejected=false;
  try{requireActualObjectAncestry(fakeSource,fakeGraftOnly);}
  catch(error){
    graftRejected=String(error?.message||error)==="source_runtime_actual_object_ancestry_not_found";
  }
  if(!graftRejected)throw new Error("graft_only_ancestry_not_rejected");
  console.log(MARKER+"_SELF_TEST_GREEN");
  console.log("source_head_compile_constant_absent=true");
  console.log("source_tree_compile_constant_absent=true");
  console.log("source_head_runtime_observed=true");
  console.log("source_tree_runtime_observed=true");
  console.log("runtime_head_exact=true");
  console.log("runtime_policy_head_preserved=true");
  console.log("runtime_policy_sha256_compile_constant_absent=true");
  console.log("runtime_policy_authenticated_by_native_preentry=true");
  console.log("source_runtime_actual_object_ancestry_required=true");
  console.log("source_runtime_graft_only_ancestry_rejected=true");
  console.log("source_runtime_dependency_count=9");
  console.log("source_runtime_complete_dependency_set_bound=true");
  console.log("tracked_source_checkout_exact_required=true");
  console.log("untracked_paths_enumerated=false");
  console.log("untracked_paths_source_authority=false");
  console.log("historical_compat_v3_source_authority=false");
  console.log("runner_v4_child_receipt_required=true");
  console.log("runner_v4_child_source_checkout_crosscheck=true");
  console.log("runner_v4_child_source_checkout_drift_rejected=true");
  console.log("native_binder_first_entry_required_for_live=true");
  console.log("binder_root_setpriv_retained_first_exec=true");
  console.log("binder_native_child_retained_first_exec=true");
  console.log("binder_root_executable_ancestor_custody_required=true");
  console.log("binder_runtime_uid_acl_custody_required=true");
  console.log("binder_retained_exec_path_rebind_rejected=true");
  console.log("binder_configured_original_path_custody_required=true");
  console.log("binder_configured_symlink_alias_rejected=true");
  console.log("binder_native_retained_fd_sha256_and_size_required=true");
  console.log("binder_native_static_no_interp_elf_required=true");
  console.log("binder_native_fake_elf_parser_positive_and_negatives_green=true");
  console.log("binder_native_parser_short_read_and_generation_drift_rejected=true");
  console.log("binder_native_load_segment_shape_bound=true");
  console.log("binder_native_ptload_mem_extent_independent_negative=true");
  console.log("binder_native_ptload_file_extent_independent_negative=true");
  console.log("binder_native_ptload_offset_plus_file_extent_negative=true");
  console.log("binder_wrong_root_owned_native_rejected_before_exec=true");
  console.log("binder_parent_proof_binds_source_and_runtime_heads=true");
  console.log("binder_native_parent_digest_binds_final_installed_source=true");
  console.log("binder_terminal_retained_fd_sha256_rechecked=true");
  console.log("binder_same_inode_size_inplace_mutation_receipt_rejected=true");
  console.log("binder_visible_source_path_rebind_receipt_rejected=true");
  console.log("runtime_native_receives_runtime_policy_head_only=true");
  console.log("canonical_checkout_rewind_performed=false");
  console.log("installed_policy_mutation=false");
  console.log("customer_safe_to_pay=false");
  console.log("transaction=false");
  console.log("public_presale_activation=false");
  console.log("wc_void_market_activation=false");
  console.log("funds_movement=false");
}
function live(sourceHead,runtimeHead,confirm){
  if(confirm!==CONFIRM)throw new Error("explicit_live_confirmation_required");
  if(runtimeHead!==RUNTIME_HEAD||!SHA40.test(String(sourceHead||""))){
    throw new Error("source_runtime_generation_not_accepted");
  }
  const binderProof=requireBinderPreentry(sourceHead,runtimeHead);
  if(typeof process.geteuid!=="function"||process.geteuid()!==0){
    throw new Error("root_required_for_live_binding");
  }
  const tools=openRootExecutionTools();
  activeRootExecutionTools=tools;
  try{
    const before=sourceCompatibility(runtimeHead);
    if(before.source_head!==sourceHead){
      throw new Error("binder_preentry_source_head_not_current");
    }
    const candidate=loadCandidate(before.source_head);
    const child=runNativeLive(runtimeHead,before);
    const after=sourceCompatibility(runtimeHead);
    if(canonical(before)!==canonical(after)){
      throw new Error("source_generation_changed_across_sensitive_sequence");
    }
    revalidateBinderPreentry(binderProof,before.source_head,runtimeHead);
    tools.revalidate();
    const receipt=buildBindingReceipt(before,candidate,child);
    console.log(JSON.stringify(receipt,null,2));
  }finally{
    activeRootExecutionTools=null;
    tools.close();
  }
}
function main(){
  const args=process.argv.slice(2);
  if(args.length===1&&args[0]==="--self-test"){selfTest();return;}
  if(args.length===1&&args[0]==="--plan"){plan();return;}
  if(args[0]==="--run"){
    const confirmAt=args.indexOf("--confirm");
    const sourceAt=args.indexOf("--source-head");
    const runtimeAt=args.indexOf("--runtime-head");
    const confirm=confirmAt>=0?args[confirmAt+1]:"";
    const sourceHead=sourceAt>=0?args[sourceAt+1]:"";
    const runtimeHead=runtimeAt>=0?args[runtimeAt+1]:"";
    if(!sourceHead)throw new Error("source_head_required");
    if(!runtimeHead)throw new Error("runtime_head_required");
    live(sourceHead,runtimeHead,confirm);
    return;
  }
  throw new Error(
    "usage: binder --self-test | --plan | --run --confirm <token> --source-head <sha> --runtime-head <sha>"
  );
}
function printHold(error){
  console.error(JSON.stringify({
    marker:MARKER+"_HOLD",status:"HOLD",reason:safeReason(error?.message||error),
    live_composition_state:"unknown_or_partial_if_live_started",
    credential_content_access_state:"unknown_or_partial_if_live_started",
    private_key_output:false,transaction_constructed:false,
    transaction_submitted:false,transaction_broadcast:false,
    filesystem_write:false,host_mutation:false,service_mutation:false,
    systemd_mutation:false,payment_acceptance:false,customer_safe_to_pay:false,
    public_presale_activation:false,wc_void_market_activation:false,
    funds_movement:false,production_host_evidence_authority:false,
  },null,2));
}
const directFileExecution=process.argv[1]&&process.argv[1]!=="-"&&
  path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(process.argv[1]==="-"){
  try{main();}catch(error){printHold(error);process.exitCode=2;}
}else if(directFileExecution){
  if(process.argv.slice(2).includes("--run")){
    printHold(new Error("binder_native_first_entry_required"));
    process.exitCode=2;
  }else{
    try{main();}catch(error){printHold(error);process.exitCode=2;}
  }
}
