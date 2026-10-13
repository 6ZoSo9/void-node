#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  createApollyonAuthorizationCustodyClientV1,
} from "./apollyon-authorization-custody-client-v1.mjs";
import {
  canonicalApollyonClaimContractJsonV1,
  qualifyApollyonCandidateTrainingAttemptClaimContractV1,
} from "./apollyon-candidate-training-attempt-claim-contract-v1.mjs";

export const VOID_APOLLYON_CANDIDATE_TRAINING_ATTEMPT_LIVE_CUSTODY_BINDING_V1 =
  "VOID_APOLLYON_CANDIDATE_TRAINING_ATTEMPT_LIVE_CUSTODY_BINDING_V1";

export const VOID_APOLLYON_CANDIDATE_TRAINING_ATTEMPT_LIVE_CUSTODY_BINDING_AUTHORITY_V1 =
  Object.freeze({
    read_only:true,
    designated_host_only:true,
    exact_v84_blob_required:true,
    exact_v85_blob_required:true,
    exact_v81_client_blob_required:true,
    exact_custody_launcher_blob_required:true,
    live_service_source_identity_required:true,
    live_service_source_identity_proof_capability:true,
    live_service_source_identity_proven_by_import:false,
    loader_environment_clean_required:true,
    caller_supplied_evidence:false,
    live_v84_qualification_required:true,
    live_custody_assertion_required:true,
    exact_custody_record_required:true,
    retained_state_root_descriptor:true,
    retained_consumed_descriptor:true,
    stable_socket_identity_required:true,
    stable_service_process_identity_required:true,
    same_live_custody_session_binding_required:true,
    same_live_custody_session_binding_proof_capability:true,
    same_live_custody_session_binding_proven_by_import:false,
    durable_attempt_claim_required:true,
    durable_attempt_claim_performed:false,
    attempt_claim:false,
    training_execution:false,
    candidate_weight_mutation:false,
    generation_execution:false,
    operator_private_key_access:false,
    production_signing:false,
    wallet_access:false,
    transaction_signing:false,
    transaction_broadcast:false,
    funds_movement:false,
    host_mutation:false,
    service_action:false,
    external_network_access:false,
    af_unix_custody_query:true,
    persistent_receipt_write:false,
  });

const HERE=dirname(fileURLToPath(import.meta.url));
const ROOT=resolve(HERE,"..");
const V84=resolve(ROOT,"tools/apollyon-designated-host-custody-live-qualification-v1.mjs");
const V85=resolve(ROOT,"tools/apollyon-candidate-training-attempt-claim-contract-v1.mjs");
const V81=resolve(ROOT,"tools/apollyon-authorization-custody-client-v1.mjs");
const LAUNCHER_SOURCE=resolve(ROOT,"tools/apollyon-authorization-custody-launcher-v1.mjs");
const V84_BLOB_SHA1="3dae4db82a9316eaa88f475cec41ddc05a441536";
const V85_BLOB_SHA1="f97fafb0148527ae3a954e2752faef8c7fc9e88e";
const V81_BLOB_SHA1="fb31dbbda76c94f0ad08e38094c151a24a78b486";
const LAUNCHER_BLOB_SHA1="5004d8c6ff15be9dbc234ce71dc7a83d8e601052";
const NODE_BIN="/usr/bin/node";
const ED25519_SPKI_PREFIX=Buffer.from("302a300506032b6570032100","hex");
const AUTH_ID=/^apollyon_authz_v1:([0-9a-f]{64})$/u;
const HASH64=/^[0-9a-f]{64}$/u;
const SAFE_NAME=/^[A-Za-z_][A-Za-z0-9_.-]{0,63}$/u;
const SAFE_UNIT=/^[A-Za-z0-9_.@-]+\.service$/u;
const MAX_RECORD_BYTES=64*1024;
const MAX_V84_BYTES=128*1024;
const MAX_V84_MS=45_000;

function fail(code){ throw new Error(code); }
function sha256(value){ return crypto.createHash("sha256").update(value).digest("hex"); }
function gitBlobSha1(bytes){
  return crypto.createHash("sha1")
    .update(Buffer.from(`blob ${bytes.length}\0`,"ascii"))
    .update(bytes)
    .digest("hex");
}
function assertBlob(pathname,expected,code){
  if(gitBlobSha1(fs.readFileSync(pathname))!==expected)fail(code);
}
function rootOwnedPinnedBlob(pathname,expected,code){
  const file=exactAbs(pathname,code);
  assertNoSymlinkAncestors(file,code);
  if(fs.realpathSync.native(file)!==file)fail(code);
  const before=fs.lstatSync(file,{bigint:true});
  if(
    !before.isFile()||before.isSymbolicLink()||before.uid!==0n||
    Number(before.mode&0o022n)!==0||before.nlink!==1n||before.size<1n||before.size>1024n*1024n
  )fail(code);
  const fd=fs.openSync(file,fs.constants.O_RDONLY|Number(fs.constants.O_NOFOLLOW||0));
  try{
    const opened=fs.fstatSync(fd,{bigint:true});
    if(
      opened.dev!==before.dev||opened.ino!==before.ino||opened.uid!==before.uid||
      opened.gid!==before.gid||opened.mode!==before.mode||opened.nlink!==before.nlink||
      opened.size!==before.size
    )fail(code);
    const bytes=fs.readFileSync(fd);
    const after=fs.fstatSync(fd,{bigint:true});
    const visible=fs.lstatSync(file,{bigint:true});
    if(
      after.dev!==opened.dev||after.ino!==opened.ino||after.size!==opened.size||
      after.mtimeNs!==opened.mtimeNs||after.ctimeNs!==opened.ctimeNs||
      visible.dev!==after.dev||visible.ino!==after.ino||visible.size!==after.size||
      visible.mtimeNs!==after.mtimeNs||visible.ctimeNs!==after.ctimeNs||
      gitBlobSha1(bytes)!==expected
    )fail(code);
    return identity(after);
  }finally{fs.closeSync(fd);}
}
function publicKeyRawFingerprint(pathname){
  const file=exactAbs(pathname,"apollyon_live_binding_public_key_path_invalid");
  assertNoSymlinkAncestors(file,"apollyon_live_binding_public_key_path_invalid");
  if(fs.realpathSync.native(file)!==file)fail("apollyon_live_binding_public_key_path_invalid");
  const before=fs.lstatSync(file,{bigint:true});
  if(
    !before.isFile()||before.isSymbolicLink()||Number(before.mode&0o022n)!==0||
    before.nlink!==1n||before.size<32n||before.size>8192n
  )fail("apollyon_live_binding_public_key_metadata_invalid");
  const fd=fs.openSync(file,fs.constants.O_RDONLY|Number(fs.constants.O_NOFOLLOW||0));
  let bytes;
  try{
    const opened=fs.fstatSync(fd,{bigint:true});
    if(opened.dev!==before.dev||opened.ino!==before.ino||opened.size!==before.size)fail("apollyon_live_binding_public_key_identity_invalid");
    bytes=fs.readFileSync(fd);
    const after=fs.fstatSync(fd,{bigint:true});
    if(after.dev!==opened.dev||after.ino!==opened.ino||after.size!==opened.size||after.mtimeNs!==opened.mtimeNs||after.ctimeNs!==opened.ctimeNs){
      fail("apollyon_live_binding_public_key_changed");
    }
  }finally{fs.closeSync(fd);}
  let key;
  try{key=crypto.createPublicKey(bytes);}catch{fail("apollyon_live_binding_public_key_invalid");}
  if(key.asymmetricKeyType!=="ed25519")fail("apollyon_live_binding_public_key_type_invalid");
  const der=key.export({type:"spki",format:"der"});
  if(der.length!==44||!der.subarray(0,12).equals(ED25519_SPKI_PREFIX))fail("apollyon_live_binding_public_key_spki_invalid");
  return sha256(der.subarray(12));
}
function canonicalGid(value){
  if(typeof value!=="string"||!/^(?:0|[1-9][0-9]*)$/u.test(value))fail("apollyon_live_binding_socket_group_gid_invalid");
  const gid=Number(value);
  if(!Number.isSafeInteger(gid)||gid<0||gid>0x7fff_ffff)fail("apollyon_live_binding_socket_group_gid_invalid");
  return String(gid);
}
function canonical(value){ return canonicalApollyonClaimContractJsonV1(value); }
function exactAbs(value,code){
  if(typeof value!=="string"||!path.isAbsolute(value)||path.resolve(value)!==value||value.includes("\0"))fail(code);
  return value;
}
function safeName(value,code){ if(typeof value!=="string"||!SAFE_NAME.test(value))fail(code); return value; }
function safeUnit(value){ if(typeof value!=="string"||!SAFE_UNIT.test(value))fail("apollyon_live_binding_service_unit_invalid"); return value; }
function identity(st){
  return Object.freeze({
    dev:String(st.dev),ino:String(st.ino),uid:String(st.uid),gid:String(st.gid),
    mode:Number(st.mode&0o777n),nlink:String(st.nlink),
  });
}
function sameIdentity(a,b){
  return a.dev===b.dev&&a.ino===b.ino&&a.uid===b.uid&&a.gid===b.gid&&a.mode===b.mode&&a.nlink===b.nlink;
}
function assertNoSymlinkAncestors(target,code){
  const parsed=path.parse(target);
  let cursor=parsed.root;
  for(const segment of target.slice(parsed.root.length).split(path.sep).filter(Boolean)){
    cursor=path.join(cursor,segment);
    if(fs.lstatSync(cursor,{bigint:true}).isSymbolicLink())fail(code);
  }
}
function openPinnedDirectory(directory,expectedMode,code){
  assertNoSymlinkAncestors(directory,code);
  const visible=fs.lstatSync(directory,{bigint:true});
  if(!visible.isDirectory()||visible.isSymbolicLink()||fs.realpathSync.native(directory)!==directory||Number(visible.mode&0o777n)!==expectedMode)fail(code);
  const fd=fs.openSync(directory,fs.constants.O_RDONLY|Number(fs.constants.O_DIRECTORY||0)|Number(fs.constants.O_NOFOLLOW||0));
  const opened=fs.fstatSync(fd,{bigint:true});
  if(!opened.isDirectory()||!sameIdentity(opened,visible)){fs.closeSync(fd);fail(code);}
  return Object.freeze({fd,path:directory,proc_path:"/proc/self/fd/"+String(fd),identity:identity(opened)});
}
function closePinned(value){ if(value)try{fs.closeSync(value.fd);}catch{} }
function assertPinnedStable(pinned,code){
  const visible=fs.lstatSync(pinned.path,{bigint:true});
  const opened=fs.fstatSync(pinned.fd,{bigint:true});
  if(!visible.isDirectory()||visible.isSymbolicLink()||fs.realpathSync.native(pinned.path)!==pinned.path||
     !sameIdentity(opened,visible)||!sameIdentity(identity(opened),pinned.identity))fail(code);
}
function socketIdentity(socketPath){
  assertNoSymlinkAncestors(socketPath,"apollyon_live_binding_socket_alias_rejected");
  const st=fs.lstatSync(socketPath,{bigint:true});
  if(!st.isSocket()||st.isSymbolicLink()||fs.realpathSync.native(socketPath)!==socketPath)fail("apollyon_live_binding_socket_invalid");
  return identity(st);
}
function assertSocketStable(socketPath,expected){
  if(!sameIdentity(socketIdentity(socketPath),expected))fail("apollyon_live_binding_socket_identity_drift");
}
function launcherArgv(bytes,config){
  if(bytes.length<3||bytes.length>64*1024||bytes[bytes.length-1]!==0)fail("apollyon_live_binding_service_cmdline_invalid");
  const argv=bytes.subarray(0,-1).toString("utf8").split("\0");
  if(argv.length!==12||argv.some((value)=>value===""))fail("apollyon_live_binding_service_cmdline_invalid");
  if(!path.isAbsolute(argv[0])||fs.realpathSync.native(argv[0])!==fs.realpathSync.native(NODE_BIN)){
    fail("apollyon_live_binding_node_executable_mismatch");
  }
  if(argv[1]!==config.service_entrypoint)fail("apollyon_live_binding_service_entrypoint_mismatch");
  const options={};
  for(let i=2;i<argv.length;i+=2){
    if(!argv[i].startsWith("--")||argv[i+1]===undefined)fail("apollyon_live_binding_service_cmdline_invalid");
    const name=argv[i].slice(2).replaceAll("-","_");
    if(Object.hasOwn(options,name))fail("apollyon_live_binding_service_cmdline_invalid");
    options[name]=argv[i+1];
  }
  const expected=["expected_operator_public_key_raw_sha256","operator_public_key_file","socket_group_gid","socket_path","state_root"];
  if(Object.keys(options).sort().join("\n")!==expected.sort().join("\n"))fail("apollyon_live_binding_service_cmdline_invalid");
  if(
    options.socket_path!==config.socket_path||
    options.state_root!==config.state_root||
    options.socket_group_gid!==canonicalGid(config.socket_group_gid)||
    options.expected_operator_public_key_raw_sha256!==config.expected_operator_public_key_raw_sha256||
    options.operator_public_key_file!==config.operator_public_key_file
  )fail("apollyon_live_binding_service_configuration_mismatch");
  return argv;
}
function assertLoaderEnvironment(pid){
  let bytes;
  try{bytes=fs.readFileSync(`/proc/${pid}/environ`);}catch{fail("apollyon_live_binding_service_environment_unreadable");}
  if(bytes.length>1024*1024)fail("apollyon_live_binding_service_environment_invalid");
  const entries=bytes.toString("utf8").split("\0").filter(Boolean);
  for(const forbidden of ["NODE_OPTIONS","NODE_PATH","LD_PRELOAD","LD_LIBRARY_PATH"]){
    if(entries.some((entry)=>entry.startsWith(forbidden+"=")&&entry!==forbidden+"=")){
      fail("apollyon_live_binding_loader_environment_forbidden");
    }
  }
  return sha256(bytes);
}
function serviceProcessIdentity(unit,config){
  rootOwnedPinnedBlob(config.service_entrypoint,LAUNCHER_BLOB_SHA1,"apollyon_live_binding_launcher_blob_mismatch");
  if(publicKeyRawFingerprint(config.operator_public_key_file)!==config.expected_operator_public_key_raw_sha256){
    fail("apollyon_live_binding_public_key_fingerprint_mismatch");
  }
  const nodeReal=fs.realpathSync.native(NODE_BIN);
  const nodeStat=fs.lstatSync(nodeReal,{bigint:true});
  if(!nodeStat.isFile()||nodeStat.isSymbolicLink()||nodeStat.uid!==0n||Number(nodeStat.mode&0o022n)!==0){
    fail("apollyon_live_binding_node_executable_invalid");
  }
  const safe=safeUnit(unit);
  const result=spawnSync("/usr/bin/systemctl",["show",safe,"--no-pager","--property=MainPID","--value"],{
    encoding:"utf8",timeout:8000,maxBuffer:4096,
    env:{PATH:"/usr/sbin:/usr/bin:/sbin:/bin",LC_ALL:"C"},windowsHide:true,
  });
  if(result.error||result.signal!==null||result.status!==0)fail("apollyon_live_binding_service_probe_failed");
  const raw=String(result.stdout??"").trim();
  if(!/^[1-9][0-9]*$/u.test(raw))fail("apollyon_live_binding_main_pid_invalid");
  const pid=Number(raw);
  if(!Number.isSafeInteger(pid)||pid<=0)fail("apollyon_live_binding_main_pid_invalid");
  let statText,cmdline;
  try{
    statText=fs.readFileSync(`/proc/${pid}/stat`,"utf8");
    cmdline=fs.readFileSync(`/proc/${pid}/cmdline`);
  }catch{fail("apollyon_live_binding_service_process_missing");}
  const close=statText.lastIndexOf(")");
  if(close<0)fail("apollyon_live_binding_service_stat_invalid");
  const fields=statText.slice(close+2).trim().split(/\s+/u);
  if(fields.length<20||!/^[0-9]+$/u.test(fields[19]))fail("apollyon_live_binding_service_stat_invalid");
  let exe;
  try{exe=fs.realpathSync.native(`/proc/${pid}/exe`);}catch{fail("apollyon_live_binding_service_executable_unreadable");}
  if(exe!==nodeReal)fail("apollyon_live_binding_node_executable_mismatch");
  const argv=launcherArgv(cmdline,config);
  const environment_sha256=assertLoaderEnvironment(pid);
  return Object.freeze({
    pid,
    starttime_ticks:fields[19],
    node_executable_realpath:nodeReal,
    node_executable_identity:identity(nodeStat),
    launcher_blob_sha1:LAUNCHER_BLOB_SHA1,
    launcher_argv_sha256:sha256(cmdline),
    loader_environment_sha256:environment_sha256,
    operator_public_key_raw_sha256:config.expected_operator_public_key_raw_sha256,
    service_entrypoint:config.service_entrypoint,
  });
}
function assertServiceStable(unit,config,expected){
  const current=serviceProcessIdentity(unit,config);
  if(canonical(current)!==canonical(expected)){
    fail("apollyon_live_binding_service_process_identity_drift");
  }
}
function v84Args(config){
  return [
    V84,
    "--training-user",safeName(config.training_user,"apollyon_live_binding_training_user_invalid"),
    "--custody-user",safeName(config.custody_user,"apollyon_live_binding_custody_user_invalid"),
    "--ipc-group",safeName(config.ipc_group,"apollyon_live_binding_ipc_group_invalid"),
    "--state-root",exactAbs(config.state_root,"apollyon_live_binding_state_root_invalid"),
    "--socket-path",exactAbs(config.socket_path,"apollyon_live_binding_socket_path_invalid"),
    "--service-unit",safeUnit(config.service_unit),
  ];
}
function runV84(config){
  const result=spawnSync("/usr/bin/node",v84Args(config),{
    encoding:"utf8",timeout:MAX_V84_MS,maxBuffer:MAX_V84_BYTES,
    env:{PATH:"/usr/sbin:/usr/bin:/sbin:/bin",LC_ALL:"C"},windowsHide:true,
  });
  if(result.error)fail("apollyon_live_binding_v84_execution_failed");
  if(result.signal!==null)fail("apollyon_live_binding_v84_signaled");
  if(result.status!==0){
    const match=String(result.stderr??"").match(/^HOLD=([^\n]+)$/mu);
    fail("apollyon_live_binding_v84_held:"+(match?.[1]??"unknown"));
  }
  const stdout=String(result.stdout??"");
  if(Buffer.byteLength(stdout,"utf8")>MAX_V84_BYTES||!stdout.endsWith("\n")||stdout.slice(0,-1).includes("\n")){
    fail("apollyon_live_binding_v84_output_invalid");
  }
  let value;
  try{value=JSON.parse(stdout.slice(0,-1));}catch{fail("apollyon_live_binding_v84_json_invalid");}
  if(canonical(value)+"\n"!==stdout)fail("apollyon_live_binding_v84_noncanonical");
  return value;
}
function readCustodyRecord(consumed,authorizationId){
  const match=AUTH_ID.exec(authorizationId);
  if(!match)fail("apollyon_live_binding_authorization_id_invalid");
  const file=path.join(consumed.proc_path,match[1]+".json");
  const st=fs.lstatSync(file,{bigint:true});
  if(!st.isFile()||st.isSymbolicLink()||st.nlink!==1n||Number(st.mode&0o777n)!==0o600||st.size<2n||st.size>BigInt(MAX_RECORD_BYTES)){
    fail("apollyon_live_binding_custody_record_metadata_invalid");
  }
  const fd=fs.openSync(file,fs.constants.O_RDONLY|Number(fs.constants.O_NOFOLLOW||0));
  try{
    const before=fs.fstatSync(fd,{bigint:true});
    if(!before.isFile()||!sameIdentity(st,before)){
      fail("apollyon_live_binding_custody_record_open_identity_mismatch");
    }
    const bytes=fs.readFileSync(fd);
    const after=fs.fstatSync(fd,{bigint:true});
    const visibleAfter=fs.lstatSync(file,{bigint:true});
    if(
      !after.isFile()||
      visibleAfter.isSymbolicLink()||
      !sameIdentity(before,after)||
      !sameIdentity(after,visibleAfter)||
      before.size!==after.size||
      before.mtimeNs!==after.mtimeNs||
      before.ctimeNs!==after.ctimeNs||
      after.size!==visibleAfter.size||
      after.mtimeNs!==visibleAfter.mtimeNs||
      after.ctimeNs!==visibleAfter.ctimeNs||
      BigInt(bytes.length)!==after.size
    ){
      fail("apollyon_live_binding_custody_record_changed");
    }
    const text=bytes.toString("utf8");
    const parsed=JSON.parse(text);
    if(canonical(parsed)+"\n"!==text)fail("apollyon_live_binding_custody_record_noncanonical");
    return Object.freeze({record:parsed,record_sha256:sha256(bytes)});
  }finally{fs.closeSync(fd);}
}
function finalizeApollyonCandidateTrainingAttemptLiveCustodyBindingV1(input){
  const contract=qualifyApollyonCandidateTrainingAttemptClaimContractV1({
    live_qualification:input.live_qualification,
    custody_assertion:input.custody_assertion,
    custody_record:input.custody_record,
  });
  if(input.custody_record_sha256!==contract.custody_record_sha256)fail("apollyon_live_binding_record_hash_mismatch");
  for(const value of [input.state_root_identity_sha256,input.consumed_directory_identity_sha256,input.socket_identity_sha256,input.service_process_identity_sha256]){
    if(typeof value!=="string"||!HASH64.test(value))fail("apollyon_live_binding_identity_hash_invalid");
  }
  const material={
    marker:VOID_APOLLYON_CANDIDATE_TRAINING_ATTEMPT_LIVE_CUSTODY_BINDING_V1,
    version:1,status:"live_custody_binding_qualified_unclaimed",target_host:"Xiphos",
    v84_blob_sha1:V84_BLOB_SHA1,v85_blob_sha1:V85_BLOB_SHA1,v81_client_blob_sha1:V81_BLOB_SHA1,
    custody_launcher_blob_sha1:LAUNCHER_BLOB_SHA1,
    live_qualification_id:contract.live_qualification_id,claim_contract_id:contract.claim_contract_id,
    custody_generation_id:contract.custody_generation_id,custody_record_sha256:contract.custody_record_sha256,
    authorization_id:contract.authorization_id,request_sha256:contract.request_sha256,
    canonical_main:contract.canonical_main,canonical_tree:contract.canonical_tree,
    corpus_sha256:contract.corpus_sha256,parent_adapter_sha256:contract.parent_adapter_sha256,
    state_root_identity_sha256:input.state_root_identity_sha256,
    consumed_directory_identity_sha256:input.consumed_directory_identity_sha256,
    socket_identity_sha256:input.socket_identity_sha256,
    service_process_identity_sha256:input.service_process_identity_sha256,
    live_service_source_identity_required:true,live_service_source_identity_proven:true,
    loader_environment_clean:true,
    same_live_custody_session_binding_required:true,same_live_custody_session_binding_proven:true,
    live_socket_identity_stable:true,service_process_identity_stable:true,state_root_identity_stable:true,consumed_directory_identity_stable:true,
    durable_attempt_claim_required:true,durable_attempt_claim_performed:false,attempt_claimed:false,
    training_execution_authorized:false,training_execution_performed:false,candidate_weight_mutation_performed:false,
    generation_execution_performed:false,operator_private_key_access_performed:false,production_signing_performed:false,
    wallet_access_performed:false,transaction_signing_performed:false,transaction_broadcast_performed:false,
    funds_movement_performed:false,host_mutation_performed:false,service_action_performed:false,
    external_network_access_performed:false,persistent_receipt_write_performed:false,
    next_gate:"durable_candidate_training_attempt_claim_executor_v1",
  };
  return Object.freeze({...material,live_binding_id:"apollyon_live_binding_v1:"+sha256(Buffer.from(canonical(material),"utf8")),
    authority:VOID_APOLLYON_CANDIDATE_TRAINING_ATTEMPT_LIVE_CUSTODY_BINDING_AUTHORITY_V1});
}
function parseCli(argv){
  const out={};
  for(let i=0;i<argv.length;i+=2){const key=argv[i],value=argv[i+1];if(value===undefined||!key.startsWith("--"))fail("apollyon_live_binding_arguments_invalid");out[key.slice(2).replaceAll("-","_")]=value;}
  const expected=[
    "training_user","custody_user","ipc_group","state_root","socket_path","service_unit","authorization_id",
    "service_entrypoint","operator_public_key_file","expected_operator_public_key_raw_sha256","socket_group_gid",
  ];
  if(Object.keys(out).sort().join("\n")!==expected.sort().join("\n"))fail("apollyon_live_binding_arguments_invalid");
  if(!AUTH_ID.test(out.authorization_id))fail("apollyon_live_binding_authorization_id_invalid");
  if(!HASH64.test(out.expected_operator_public_key_raw_sha256))fail("apollyon_live_binding_operator_fingerprint_invalid");
  out.service_entrypoint=exactAbs(out.service_entrypoint,"apollyon_live_binding_service_entrypoint_invalid");
  out.operator_public_key_file=exactAbs(out.operator_public_key_file,"apollyon_live_binding_public_key_path_invalid");
  out.socket_group_gid=canonicalGid(out.socket_group_gid);
  return out;
}
export async function runApollyonCandidateTrainingAttemptLiveCustodyBindingV1(config){
  if(process.geteuid?.()!==0)fail("apollyon_live_binding_root_required");
  assertBlob(V84,V84_BLOB_SHA1,"apollyon_live_binding_v84_blob_mismatch");
  assertBlob(V85,V85_BLOB_SHA1,"apollyon_live_binding_v85_blob_mismatch");
  assertBlob(V81,V81_BLOB_SHA1,"apollyon_live_binding_v81_blob_mismatch");
  assertBlob(LAUNCHER_SOURCE,LAUNCHER_BLOB_SHA1,"apollyon_live_binding_launcher_source_blob_mismatch");
  rootOwnedPinnedBlob(config.service_entrypoint,LAUNCHER_BLOB_SHA1,"apollyon_live_binding_launcher_blob_mismatch");
  if(publicKeyRawFingerprint(config.operator_public_key_file)!==config.expected_operator_public_key_raw_sha256){
    fail("apollyon_live_binding_public_key_fingerprint_mismatch");
  }
  const stateRoot=exactAbs(config.state_root,"apollyon_live_binding_state_root_invalid");
  const consumedPath=path.join(stateRoot,"consumed");
  const socketPath=exactAbs(config.socket_path,"apollyon_live_binding_socket_path_invalid");
  const root=openPinnedDirectory(stateRoot,0o700,"apollyon_live_binding_state_root_invalid");
  let consumed=null;
  try{
    consumed=openPinnedDirectory(consumedPath,0o700,"apollyon_live_binding_consumed_invalid");
    const socketBefore=socketIdentity(socketPath);
    const serviceBefore=serviceProcessIdentity(config.service_unit,config);
    const live=runV84(config);
    assertPinnedStable(root,"apollyon_live_binding_state_root_drift");
    assertPinnedStable(consumed,"apollyon_live_binding_consumed_drift");
    assertSocketStable(socketPath,socketBefore);
    assertServiceStable(config.service_unit,config,serviceBefore);
    const client=createApollyonAuthorizationCustodyClientV1({socket_path:socketPath});
    const assertion=await client.assertConsumed(config.authorization_id,{timeout_ms:5000});
    assertPinnedStable(root,"apollyon_live_binding_state_root_drift");
    assertPinnedStable(consumed,"apollyon_live_binding_consumed_drift");
    assertSocketStable(socketPath,socketBefore);
    assertServiceStable(config.service_unit,config,serviceBefore);
    const record=readCustodyRecord(consumed,config.authorization_id);
    if(record.record.operator_public_key_raw_sha256!==config.expected_operator_public_key_raw_sha256){
      fail("apollyon_live_binding_custody_record_operator_fingerprint_mismatch");
    }
    assertPinnedStable(root,"apollyon_live_binding_state_root_drift");
    assertPinnedStable(consumed,"apollyon_live_binding_consumed_drift");
    assertSocketStable(socketPath,socketBefore);
    assertServiceStable(config.service_unit,config,serviceBefore);
    const idHash=value=>sha256(Buffer.from(canonical(value),"utf8"));
    return finalizeApollyonCandidateTrainingAttemptLiveCustodyBindingV1({
      live_qualification:live,custody_assertion:assertion,custody_record:record.record,
      custody_record_sha256:record.record_sha256,
      state_root_identity_sha256:idHash(root.identity),
      consumed_directory_identity_sha256:idHash(consumed.identity),
      socket_identity_sha256:idHash(socketBefore),
      service_process_identity_sha256:idHash(serviceBefore),
    });
  }finally{closePinned(consumed);closePinned(root);}
}
async function main(){
  const config=parseCli(process.argv.slice(2));
  process.stdout.write(canonical(await runApollyonCandidateTrainingAttemptLiveCustodyBindingV1(config))+"\n");
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===path.resolve(process.argv[1])){
  try{await main();}catch(error){process.stderr.write(`HOLD=${String(error?.message||error)}\n`);process.stderr.write("read_only=true\nhost_mutation=false\nservice_action=false\nattempt_claim=false\ntraining_execution=false\n");process.exitCode=2;}
}
