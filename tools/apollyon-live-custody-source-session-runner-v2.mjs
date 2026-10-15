#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";

import {
  prepareApollyonReviewedExecutionTreeV2,
  cleanupApollyonReviewedExecutionTreeV2,
} from "./apollyon-designated-host-custody-live-qualification-v2.mjs";
import {
  runApollyonV2RawCollectorAdapterV1,
} from "./apollyon-v2-raw-collector-adapter-v1.mjs";
import {
  composeApollyonCandidateTrainingPreclaimV2,
} from "./apollyon-candidate-training-preclaim-v2.mjs";
import {
  createApollyonAuthorizationCustodyClientV1,
} from "./apollyon-authorization-custody-client-v1.mjs";
import {
  qualifyApollyonCandidateTrainingAttemptClaimContractV2,
} from "./apollyon-candidate-training-attempt-claim-contract-v2.mjs";
import {
  canonicalApollyonClaimContractJsonV1,
} from "./apollyon-candidate-training-attempt-claim-contract-v1.mjs";
import {
  VOID_APOLLYON_CUSTODY_SERVICE_UNIT_BLOB_SHA1_V1,
  VOID_APOLLYON_CUSTODY_SERVICE_UNIT_FRAGMENT_PATH_V1,
  finalizeApollyonLiveCustodyServiceSourceSessionBindingV2,
} from "./apollyon-live-custody-service-source-session-binding-v2.mjs";

export const VOID_APOLLYON_LIVE_CUSTODY_SOURCE_SESSION_RUNNER_V2 =
  "VOID_APOLLYON_LIVE_CUSTODY_SOURCE_SESSION_RUNNER_V2";

export const VOID_APOLLYON_LIVE_CUSTODY_SOURCE_SESSION_RUNNER_AUTHORITY_V2 =
  Object.freeze({
    installed_private_closure_required:true,
    live_worktree_invocation_supported:false,
    xiphos_root_required:true,
    training_service_start_stop:true,
    training_service_enable:false,
    current_v2_raw_observation_count:2,
    installed_isolation_same_pid_observation:true,
    custody_service_action:false,
    custody_service_af_unix_query:true,
    durable_attempt_claim:false,
    training_execution:false,
    candidate_weight_mutation:false,
    operator_private_key_access:false,
    production_signing:false,
    wallet_access:false,
    transaction_signing:false,
    transaction_broadcast:false,
    funds_movement:false,
  });

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const TRAINING_UNIT="void-apollyon-training-bus-isolation-v1.service";
const TRAINING_ENTRYPOINT=
  "/opt/void-apollyon-training-v1/apollyon_candidate_training_entrypoint_v1";
const ISOLATION_OBSERVER_REL=
  "ops/xiphos/apollyon_installed_training_bus_isolation_qualification_v1.py";
const CUSTODY_LAUNCHER_V2_BLOB_SHA1=
  "d23ff045d8c355401fed499c6bcffd503ba4c7fd";
const NODE_BIN="/usr/bin/node";
const PYTHON_BIN="/usr/bin/python3";
const ED25519_SPKI_PREFIX=Buffer.from("302a300506032b6570032100","hex");
const AUTH_ID=/^apollyon_authz_v1:([0-9a-f]{64})$/u;
const HASH64=/^[0-9a-f]{64}$/u;
const INVOCATION_ID=/^[0-9a-f]{32}$/u;
const SAFE_NAME=/^[A-Za-z_][A-Za-z0-9_.-]{0,63}$/u;
const SAFE_UNIT=/^[A-Za-z0-9_.@-]+\.service$/u;
const MAX_RECORD_BYTES=64*1024;
const MAX_CHILD_BYTES=256*1024;

function fail(code){throw new Error(code);}
function sha256(value){return crypto.createHash("sha256").update(value).digest("hex");}
function gitBlobSha1(bytes){
  return crypto.createHash("sha1")
    .update(Buffer.from("blob "+bytes.length+"\0","ascii"))
    .update(bytes).digest("hex");
}
function sortJson(value){
  if(Array.isArray(value))return value.map(sortJson);
  if(value&&typeof value==="object"){
    const out={};
    for(const key of Object.keys(value).sort())out[key]=sortJson(value[key]);
    return out;
  }
  return value;
}
function canonical(value){return JSON.stringify(sortJson(value));}
function exactAbs(value,code){
  if(typeof value!=="string"||!path.isAbsolute(value)||path.resolve(value)!==value||value.includes("\0"))fail(code);
  return value;
}
function safeName(value,code){
  if(typeof value!=="string"||!SAFE_NAME.test(value))fail(code);
  return value;
}
function safeUnit(value){
  if(typeof value!=="string"||!SAFE_UNIT.test(value))fail("apollyon_live_runner_custody_unit_invalid");
  return value;
}
function canonicalGid(value){
  const text=String(value);
  if(!/^(?:0|[1-9][0-9]*)$/u.test(text))fail("apollyon_live_runner_socket_gid_invalid");
  const parsed=Number(text);
  if(!Number.isSafeInteger(parsed)||parsed<0||parsed>0x7fff_ffff)fail("apollyon_live_runner_socket_gid_invalid");
  return String(parsed);
}
function identity(st){
  return Object.freeze({
    dev:String(st.dev),ino:String(st.ino),uid:String(st.uid),gid:String(st.gid),
    mode:Number(st.mode&0o777n),nlink:String(st.nlink),size:String(st.size),
  });
}
function sameIdentity(a,b){
  return a.dev===b.dev&&a.ino===b.ino&&a.uid===b.uid&&a.gid===b.gid&&
    a.mode===b.mode&&a.nlink===b.nlink&&a.size===b.size;
}
function assertNoSymlinkAncestors(target,code){
  const parsed=path.parse(target);
  let cursor=parsed.root;
  for(const segment of target.slice(parsed.root.length).split(path.sep).filter(Boolean)){
    cursor=path.join(cursor,segment);
    if(fs.lstatSync(cursor).isSymbolicLink())fail(code);
  }
}
function assertRootProtectedAncestors(target,code){
  const parsed=path.parse(target);
  let cursor=parsed.root;
  const parent=path.dirname(target);
  for(const segment of parent.slice(parsed.root.length).split(path.sep).filter(Boolean)){
    cursor=path.join(cursor,segment);
    const st=fs.lstatSync(cursor,{bigint:true});
    if(!st.isDirectory()||st.isSymbolicLink()||st.uid!==0n||Number(st.mode&0o022n)!==0)fail(code);
  }
}
function rootOwnedPinnedBlob(pathname,expected,code){
  const file=exactAbs(pathname,code);
  assertNoSymlinkAncestors(file,code);
  assertRootProtectedAncestors(file,code);
  if(fs.realpathSync.native(file)!==file)fail(code);
  const before=fs.lstatSync(file,{bigint:true});
  if(
    !before.isFile()||before.isSymbolicLink()||before.uid!==0n||
    Number(before.mode&0o022n)!==0||before.nlink!==1n||
    before.size<1n||before.size>2n*1024n*1024n
  )fail(code);
  const fd=fs.openSync(file,fs.constants.O_RDONLY|Number(fs.constants.O_NOFOLLOW||0));
  try{
    const opened=fs.fstatSync(fd,{bigint:true});
    const bytes=fs.readFileSync(fd);
    const after=fs.fstatSync(fd,{bigint:true});
    const visible=fs.lstatSync(file,{bigint:true});
    if(
      !sameIdentity(identity(before),identity(opened))||
      !sameIdentity(identity(opened),identity(after))||
      !sameIdentity(identity(after),identity(visible))||
      gitBlobSha1(bytes)!==expected
    )fail(code);
    return identity(after);
  }finally{fs.closeSync(fd);}
}
function openPinnedDirectory(directory,expectedMode,code){
  const target=exactAbs(directory,code);
  assertNoSymlinkAncestors(target,code);
  const before=fs.lstatSync(target,{bigint:true});
  if(
    !before.isDirectory()||before.isSymbolicLink()||
    fs.realpathSync.native(target)!==target||
    Number(before.mode&0o777n)!==expectedMode
  )fail(code);
  const fd=fs.openSync(
    target,
    fs.constants.O_RDONLY|Number(fs.constants.O_DIRECTORY||0)|Number(fs.constants.O_NOFOLLOW||0),
  );
  const opened=fs.fstatSync(fd,{bigint:true});
  if(!sameIdentity(identity(before),identity(opened))){
    fs.closeSync(fd);fail(code);
  }
  return Object.freeze({fd,path:target,proc_path:"/proc/self/fd/"+String(fd),identity:identity(opened)});
}
function closePinned(value){
  if(!value)return;
  try{fs.closeSync(value.fd);}
  catch(error){
    throw new Error("apollyon_live_runner_pinned_descriptor_close_failed",{cause:error});
  }
}
function assertPinnedStable(pinned,code){
  const opened=fs.fstatSync(pinned.fd,{bigint:true});
  const visible=fs.lstatSync(pinned.path,{bigint:true});
  if(
    !visible.isDirectory()||visible.isSymbolicLink()||
    fs.realpathSync.native(pinned.path)!==pinned.path||
    !sameIdentity(identity(opened),pinned.identity)||
    !sameIdentity(identity(visible),pinned.identity)
  )fail(code);
}
function socketIdentity(socketPath){
  assertNoSymlinkAncestors(socketPath,"apollyon_live_runner_socket_alias");
  const st=fs.lstatSync(socketPath,{bigint:true});
  if(!st.isSocket()||st.isSymbolicLink()||fs.realpathSync.native(socketPath)!==socketPath){
    fail("apollyon_live_runner_socket_invalid");
  }
  return identity(st);
}
function assertSocketStable(socketPath,expected){
  if(!sameIdentity(socketIdentity(socketPath),expected))fail("apollyon_live_runner_socket_drift");
}
function processStartTicks(pid){
  const text=fs.readFileSync("/proc/"+String(pid)+"/stat","utf8");
  const close=text.lastIndexOf(")");
  if(close<0)fail("apollyon_live_runner_proc_stat_invalid");
  const fields=text.slice(close+2).trim().split(/\s+/u);
  if(fields.length<20||!/^[1-9][0-9]*$/u.test(fields[19]))fail("apollyon_live_runner_proc_stat_invalid");
  return fields[19];
}
function runSystemctl(args,check=true){
  const result=spawnSync("/usr/bin/systemctl",args,{
    encoding:"utf8",timeout:15_000,maxBuffer:64*1024,
    env:{PATH:"/usr/sbin:/usr/bin:/sbin:/bin",LC_ALL:"C"},windowsHide:true,
  });
  if(result.error||result.signal!==null||(check&&result.status!==0))fail("apollyon_live_runner_systemctl_failed");
  return result;
}
function systemdValue(unit,property){
  return String(runSystemctl(["show",unit,"--property="+property,"--value"]).stdout??"").trim();
}
function serviceEnabled(unit){
  const r=runSystemctl(["is-enabled",unit],false);
  return String(r.stdout??"").trim()==="enabled";
}
function waitTrainingEntrypoint(){
  const deadline=Date.now()+5000;
  while(Date.now()<deadline){
    const raw=systemdValue(TRAINING_UNIT,"MainPID");
    if(/^[1-9][0-9]*$/u.test(raw)){
      const pid=Number(raw);
      try{
        if(fs.realpathSync.native("/proc/"+raw+"/exe")===TRAINING_ENTRYPOINT){
          return Object.freeze({pid,start_time_ticks:processStartTicks(pid)});
        }
      }catch(error){
        if(error?.code!=="ENOENT"&&error?.code!=="ESRCH"){
          fail("apollyon_live_runner_training_exe_probe_failed");
        }
      }
    }
  }
  fail("apollyon_live_runner_training_exec_transition_unproven");
}
function openTrustedExecutable(requested,code){
  const canonicalPath=fs.realpathSync.native(requested);
  assertRootProtectedAncestors(canonicalPath,code);
  const before=fs.lstatSync(canonicalPath,{bigint:true});
  if(
    !before.isFile()||before.isSymbolicLink()||before.uid!==0n||before.nlink!==1n||
    Number(before.mode&0o022n)!==0||(Number(before.mode)&0o111)===0||
    (Number(before.mode)&0o6000)!==0
  )fail(code);
  const fd=fs.openSync(canonicalPath,fs.constants.O_RDONLY|Number(fs.constants.O_NOFOLLOW||0));
  const opened=fs.fstatSync(fd,{bigint:true});
  const visible=fs.lstatSync(canonicalPath,{bigint:true});
  if(!sameIdentity(identity(before),identity(opened))||!sameIdentity(identity(opened),identity(visible))){
    fs.closeSync(fd);fail(code);
  }
  return fd;
}
function runIsolationObserver(pid){
  const script=path.join(ROOT,ISOLATION_OBSERVER_REL);
  const pythonFd=openTrustedExecutable(PYTHON_BIN,"apollyon_live_runner_python_untrusted");
  try{
    const result=spawnSync("/proc/self/fd/"+String(pythonFd),[
      "-I","-B",script,"--observe-live-pid",String(pid),
    ],{
      encoding:"utf8",timeout:15_000,maxBuffer:MAX_CHILD_BYTES,
      env:{PATH:"/usr/sbin:/usr/bin:/sbin:/bin",LC_ALL:"C",PYTHONDONTWRITEBYTECODE:"1"},
      windowsHide:true,
    });
    if(result.error||result.signal!==null||result.status!==0)fail("apollyon_live_runner_isolation_observer_failed");
    const stdout=String(result.stdout??"");
    if(!stdout.endsWith("\n")||stdout.slice(0,-1).includes("\n"))fail("apollyon_live_runner_isolation_output_invalid");
    const value=JSON.parse(stdout.slice(0,-1));
    if(canonical(value)+"\n"!==stdout)fail("apollyon_live_runner_isolation_noncanonical");
    return value;
  }finally{fs.closeSync(pythonFd);}
}
function publicKeyRawFingerprint(pathname){
  const file=exactAbs(pathname,"apollyon_live_runner_public_key_path_invalid");
  assertNoSymlinkAncestors(file,"apollyon_live_runner_public_key_path_invalid");
  const before=fs.lstatSync(file,{bigint:true});
  if(
    !before.isFile()||before.isSymbolicLink()||Number(before.mode&0o022n)!==0||
    before.nlink!==1n||before.size<32n||before.size>8192n
  )fail("apollyon_live_runner_public_key_metadata_invalid");
  const fd=fs.openSync(file,fs.constants.O_RDONLY|Number(fs.constants.O_NOFOLLOW||0));
  let bytes;
  try{
    const opened=fs.fstatSync(fd,{bigint:true});
    if(opened.dev!==before.dev||opened.ino!==before.ino||opened.size!==before.size){
      fail("apollyon_live_runner_public_key_identity_invalid");
    }
    bytes=fs.readFileSync(fd);
  }finally{fs.closeSync(fd);}
  let key;
  try{key=crypto.createPublicKey(bytes);}catch{fail("apollyon_live_runner_public_key_invalid");}
  if(key.asymmetricKeyType!=="ed25519")fail("apollyon_live_runner_public_key_type_invalid");
  const der=key.export({type:"spki",format:"der"});
  if(der.length!==44||!der.subarray(0,12).equals(ED25519_SPKI_PREFIX)){
    fail("apollyon_live_runner_public_key_spki_invalid");
  }
  return sha256(der.subarray(12));
}
function launcherArgv(bytes,config){
  if(bytes.length<3||bytes.length>64*1024||bytes[bytes.length-1]!==0){
    fail("apollyon_live_runner_custody_cmdline_invalid");
  }
  const argv=bytes.subarray(0,-1).toString("utf8").split("\0");
  if(argv.length!==12||argv.some((v)=>v===""))fail("apollyon_live_runner_custody_cmdline_invalid");
  if(fs.realpathSync.native(argv[0])!==fs.realpathSync.native(NODE_BIN)){
    fail("apollyon_live_runner_custody_node_mismatch");
  }
  if(argv[1]!==config.custody_service_entrypoint){
    fail("apollyon_live_runner_custody_entrypoint_mismatch");
  }
  const options={};
  for(let i=2;i<argv.length;i+=2){
    if(!argv[i].startsWith("--")||argv[i+1]===undefined)fail("apollyon_live_runner_custody_cmdline_invalid");
    const name=argv[i].slice(2).replaceAll("-","_");
    if(Object.hasOwn(options,name))fail("apollyon_live_runner_custody_cmdline_invalid");
    options[name]=argv[i+1];
  }
  const expected=[
    "expected_operator_public_key_raw_sha256","operator_public_key_file",
    "socket_group_gid","socket_path","state_root",
  ];
  if(Object.keys(options).sort().join("\n")!==expected.sort().join("\n")){
    fail("apollyon_live_runner_custody_cmdline_invalid");
  }
  if(
    options.socket_path!==config.socket_path||
    options.state_root!==config.state_root||
    options.socket_group_gid!==config.socket_group_gid||
    options.expected_operator_public_key_raw_sha256!==config.expected_operator_public_key_raw_sha256||
    options.operator_public_key_file!==config.operator_public_key_file
  )fail("apollyon_live_runner_custody_configuration_mismatch");
}
function loaderEnvironmentEvidence(pid,expectedInvocationId){
  const bytes=fs.readFileSync("/proc/"+String(pid)+"/environ");
  if(bytes.length>1024*1024)fail("apollyon_live_runner_custody_environment_invalid");
  const entries=bytes.toString("utf8").split("\0").filter(Boolean);
  for(const name of ["NODE_OPTIONS","NODE_PATH","LD_PRELOAD","LD_LIBRARY_PATH"]){
    if(entries.some((e)=>e.startsWith(name+"=")&&e!==name+"=")){
      fail("apollyon_live_runner_custody_loader_environment_forbidden");
    }
  }
  const invocation=entries
    .filter((entry)=>entry.startsWith("INVOCATION_ID="))
    .map((entry)=>entry.slice("INVOCATION_ID=".length));
  if(
    invocation.length!==1||
    !INVOCATION_ID.test(invocation[0])||
    invocation[0]!==expectedInvocationId
  )fail("apollyon_live_runner_custody_invocation_environment_mismatch");
  return Object.freeze({
    loader_environment_sha256:sha256(bytes),
    systemd_invocation_id:invocation[0],
    loader_environment_clean:true,
  });
}
function custodyServiceIdentity(config){
  const fragment=systemdValue(config.service_unit,"FragmentPath");
  if(fragment!==VOID_APOLLYON_CUSTODY_SERVICE_UNIT_FRAGMENT_PATH_V1){
    fail("apollyon_live_runner_custody_service_fragment_invalid");
  }
  if(systemdValue(config.service_unit,"DropInPaths")!==""){
    fail("apollyon_live_runner_custody_service_dropins_forbidden");
  }
  const unitIdentity=rootOwnedPinnedBlob(
    fragment,
    VOID_APOLLYON_CUSTODY_SERVICE_UNIT_BLOB_SHA1_V1,
    "apollyon_live_runner_custody_service_unit_invalid",
  );
  const invocationId=systemdValue(config.service_unit,"InvocationID");
  if(!INVOCATION_ID.test(invocationId)){
    fail("apollyon_live_runner_custody_invocation_id_invalid");
  }
  const launcherIdentity=rootOwnedPinnedBlob(
    config.custody_service_entrypoint,
    CUSTODY_LAUNCHER_V2_BLOB_SHA1,
    "apollyon_live_runner_custody_launcher_invalid",
  );
  if(publicKeyRawFingerprint(config.operator_public_key_file)!==
     config.expected_operator_public_key_raw_sha256){
    fail("apollyon_live_runner_public_key_fingerprint_mismatch");
  }
  const raw=systemdValue(config.service_unit,"MainPID");
  if(!/^[1-9][0-9]*$/u.test(raw))fail("apollyon_live_runner_custody_mainpid_invalid");
  const pid=Number(raw);
  const exe=fs.realpathSync.native("/proc/"+raw+"/exe");
  if(exe!==fs.realpathSync.native(NODE_BIN))fail("apollyon_live_runner_custody_node_mismatch");
  const cmdline=fs.readFileSync("/proc/"+raw+"/cmdline");
  launcherArgv(cmdline,config);
  const loader=loaderEnvironmentEvidence(pid,invocationId);
  const value={
    pid,
    start_time_ticks:processStartTicks(pid),
    node_executable_realpath:exe,
    launcher_blob_sha1:CUSTODY_LAUNCHER_V2_BLOB_SHA1,
    launcher_identity:launcherIdentity,
    launcher_argv_sha256:sha256(cmdline),
    loader_environment_sha256:loader.loader_environment_sha256,
    loader_environment_clean:loader.loader_environment_clean,
    custody_service_unit_blob_sha1:VOID_APOLLYON_CUSTODY_SERVICE_UNIT_BLOB_SHA1_V1,
    service_unit_fragment_path:VOID_APOLLYON_CUSTODY_SERVICE_UNIT_FRAGMENT_PATH_V1,
    service_unit_identity:unitIdentity,
    service_dropins_absent:true,
    service_manager_preexec_environment_sanitized:true,
    systemd_invocation_id:loader.systemd_invocation_id,
    operator_public_key_raw_sha256:config.expected_operator_public_key_raw_sha256,
  };
  return Object.freeze(value);
}
function assertCustodyServiceStable(config,expected){
  if(canonical(custodyServiceIdentity(config))!==canonical(expected)){
    fail("apollyon_live_runner_custody_process_drift");
  }
}
function readCustodyRecord(consumed,authorizationId){
  const match=AUTH_ID.exec(authorizationId);
  if(!match)fail("apollyon_live_runner_authorization_id_invalid");
  const file=path.join(consumed.proc_path,match[1]+".json");
  const before=fs.lstatSync(file,{bigint:true});
  if(
    !before.isFile()||before.isSymbolicLink()||before.nlink!==1n||
    Number(before.mode&0o777n)!==0o600||before.size<2n||
    before.size>BigInt(MAX_RECORD_BYTES)
  )fail("apollyon_live_runner_custody_record_metadata_invalid");
  const fd=fs.openSync(file,fs.constants.O_RDONLY|Number(fs.constants.O_NOFOLLOW||0));
  try{
    const opened=fs.fstatSync(fd,{bigint:true});
    if(!sameIdentity(identity(before),identity(opened))){
      fail("apollyon_live_runner_custody_record_open_drift");
    }
    const bytes=fs.readFileSync(fd);
    const after=fs.fstatSync(fd,{bigint:true});
    const visible=fs.lstatSync(file,{bigint:true});
    if(
      !sameIdentity(identity(opened),identity(after))||
      !sameIdentity(identity(after),identity(visible))||
      BigInt(bytes.length)!==after.size
    )fail("apollyon_live_runner_custody_record_changed");
    const text=bytes.toString("utf8");
    const parsed=JSON.parse(text);
    if(canonicalApollyonClaimContractJsonV1(parsed)+"\n"!==text){
      fail("apollyon_live_runner_custody_record_noncanonical");
    }
    return Object.freeze({record:parsed,record_sha256:sha256(bytes)});
  }finally{fs.closeSync(fd);}
}
function parseCli(argv){
  if(argv.length===1&&argv[0]==="--self-test")return Object.freeze({self_test:true});
  if(argv.length%2!==0)fail("apollyon_live_runner_arguments_invalid");
  const out={};
  for(let i=0;i<argv.length;i+=2){
    const key=argv[i],value=argv[i+1];
    if(!key?.startsWith("--")||value===undefined)fail("apollyon_live_runner_arguments_invalid");
    const name=key.slice(2).replaceAll("-","_");
    if(Object.hasOwn(out,name))fail("apollyon_live_runner_arguments_invalid");
    out[name]=value;
  }
  const expected=[
    "authorization_id","custody_service_entrypoint","custody_user",
    "expected_operator_public_key_raw_sha256","ipc_group","operator_public_key_file",
    "service_unit","socket_group_gid","socket_path","state_root","training_user",
  ];
  if(Object.keys(out).sort().join("\n")!==expected.sort().join("\n")){
    fail("apollyon_live_runner_arguments_invalid");
  }
  if(!AUTH_ID.test(out.authorization_id)||!HASH64.test(out.expected_operator_public_key_raw_sha256)){
    fail("apollyon_live_runner_arguments_invalid");
  }
  return Object.freeze({
    self_test:false,
    authorization_id:out.authorization_id,
    training_user:safeName(out.training_user,"apollyon_live_runner_training_user_invalid"),
    custody_user:safeName(out.custody_user,"apollyon_live_runner_custody_user_invalid"),
    ipc_group:safeName(out.ipc_group,"apollyon_live_runner_ipc_group_invalid"),
    state_root:exactAbs(out.state_root,"apollyon_live_runner_state_root_invalid"),
    socket_path:exactAbs(out.socket_path,"apollyon_live_runner_socket_path_invalid"),
    service_unit:safeUnit(out.service_unit),
    custody_service_entrypoint:exactAbs(
      out.custody_service_entrypoint,
      "apollyon_live_runner_custody_entrypoint_invalid",
    ),
    operator_public_key_file:exactAbs(
      out.operator_public_key_file,
      "apollyon_live_runner_public_key_path_invalid",
    ),
    expected_operator_public_key_raw_sha256:out.expected_operator_public_key_raw_sha256,
    socket_group_gid:canonicalGid(out.socket_group_gid),
  });
}
function selfTest(){
  const sample="123 (entry v1) S "+Array.from({length:39},(_,i)=>String(i+1)).join(" ");
  const close=sample.lastIndexOf(")");
  const fields=sample.slice(close+2).trim().split(/\s+/u);
  if(fields[19]!=="19")fail("apollyon_live_runner_self_test_stat");
  if(VOID_APOLLYON_LIVE_CUSTODY_SOURCE_SESSION_RUNNER_AUTHORITY_V2.durable_attempt_claim!==false){
    fail("apollyon_live_runner_self_test_authority");
  }
  process.stdout.write(VOID_APOLLYON_LIVE_CUSTODY_SOURCE_SESSION_RUNNER_V2+"_SELF_TEST=GREEN\n");
  process.stdout.write("live_worktree_invocation_supported=false\n");
  process.stdout.write("training_service_start_stop=true\n");
  process.stdout.write("current_v2_raw_observation_count=2\n");
  process.stdout.write("custody_service_action=false\n");
  process.stdout.write("service_manager_preexec_environment_boundary=true\n");
  process.stdout.write("root_owned_service_unit_generation_required=true\n");
  process.stdout.write("systemd_invocation_binding_required=true\n");
  process.stdout.write("durable_attempt_claim=false\n");
  process.stdout.write("training_execution=false\n");
}
export async function runApollyonLiveCustodySourceSessionRunnerV2(config){
  if(process.geteuid?.()!==0)fail("apollyon_live_runner_root_required");
  if(process.env.VOID_APOLLYON_LIVE_SESSION_PRIVATE_CLOSURE!==
     "VOID_APOLLYON_LIVE_SESSION_PRIVATE_CLOSURE_V2"){
    fail("apollyon_live_runner_private_closure_required");
  }
  if(serviceEnabled(TRAINING_UNIT))fail("apollyon_live_runner_training_service_enabled");
  if(systemdValue(TRAINING_UNIT,"ActiveState")==="active"){
    fail("apollyon_live_runner_training_service_already_active");
  }

  const stateRoot=openPinnedDirectory(config.state_root,0o700,"apollyon_live_runner_state_root_invalid");
  let consumed=null;
  let prepared=null;
  let trainingStarted=false;
  try{
    consumed=openPinnedDirectory(
      path.join(config.state_root,"consumed"),0o700,
      "apollyon_live_runner_consumed_invalid",
    );
    const socketBefore=socketIdentity(config.socket_path);
    const custodyBefore=custodyServiceIdentity(config);

    runSystemctl(["start",TRAINING_UNIT]);
    trainingStarted=true;
    const training=waitTrainingEntrypoint();

    const isolation=runIsolationObserver(training.pid);
    if(
      isolation.live?.mainpid!==training.pid||
      String(isolation.live?.process_start_time_ticks)!==training.start_time_ticks
    )fail("apollyon_live_runner_isolation_generation_mismatch");

    prepared=prepareApollyonReviewedExecutionTreeV2(ROOT);
    const rawConfig={
      training_user:config.training_user,
      training_pid:training.pid,
      custody_user:config.custody_user,
      ipc_group:config.ipc_group,
      state_root:config.state_root,
      socket_path:config.socket_path,
      service_unit:config.service_unit,
    };
    const first=runApollyonV2RawCollectorAdapterV1(prepared,rawConfig);
    const second=runApollyonV2RawCollectorAdapterV1(prepared,rawConfig);
    const preclaim=composeApollyonCandidateTrainingPreclaimV2({
      first_v2_evidence:first,
      installed_isolation_receipt:isolation,
      second_v2_evidence:second,
    });

    assertPinnedStable(stateRoot,"apollyon_live_runner_state_root_drift");
    assertPinnedStable(consumed,"apollyon_live_runner_consumed_drift");
    assertSocketStable(config.socket_path,socketBefore);
    assertCustodyServiceStable(config,custodyBefore);

    const client=createApollyonAuthorizationCustodyClientV1({
      socket_path:config.socket_path,
    });
    const assertion=await client.assertConsumed(config.authorization_id,{timeout_ms:5000});

    assertPinnedStable(stateRoot,"apollyon_live_runner_state_root_drift");
    assertPinnedStable(consumed,"apollyon_live_runner_consumed_drift");
    assertSocketStable(config.socket_path,socketBefore);
    assertCustodyServiceStable(config,custodyBefore);

    const row=readCustodyRecord(consumed,config.authorization_id);
    if(row.record_sha256!==assertion.record_sha256){
      fail("apollyon_live_runner_custody_record_hash_mismatch");
    }
    if(row.record.operator_public_key_raw_sha256!==
       config.expected_operator_public_key_raw_sha256){
      fail("apollyon_live_runner_custody_operator_fingerprint_mismatch");
    }

    const claim=qualifyApollyonCandidateTrainingAttemptClaimContractV2({
      preclaim,
      custody_assertion:assertion,
      custody_record:row.record,
    });

    assertPinnedStable(stateRoot,"apollyon_live_runner_state_root_drift");
    assertPinnedStable(consumed,"apollyon_live_runner_consumed_drift");
    assertSocketStable(config.socket_path,socketBefore);
    assertCustodyServiceStable(config,custodyBefore);
    if(
      systemdValue(TRAINING_UNIT,"MainPID")!==String(training.pid)||
      processStartTicks(training.pid)!==training.start_time_ticks
    )fail("apollyon_live_runner_training_generation_drift");

    const idHash=(value)=>sha256(Buffer.from(canonical(value),"utf8"));
    const binding=finalizeApollyonLiveCustodyServiceSourceSessionBindingV2({
      claim_contract:claim,
      session_evidence:{
        authorization_id:claim.authorization_id,
        custody_generation_id:claim.custody_generation_id,
        custody_record_sha256:claim.custody_record_sha256,
        operator_public_key_raw_sha256:claim.operator_public_key_raw_sha256,
        custody_launcher_blob_sha1:CUSTODY_LAUNCHER_V2_BLOB_SHA1,
        custody_service_unit_blob_sha1:custodyBefore.custody_service_unit_blob_sha1,
        service_unit_fragment_path:custodyBefore.service_unit_fragment_path,
        service_manager_preexec_environment_sanitized:
          custodyBefore.service_manager_preexec_environment_sanitized,
        service_dropins_absent:custodyBefore.service_dropins_absent,
        systemd_invocation_id:custodyBefore.systemd_invocation_id,
        state_root_identity_sha256:idHash(stateRoot.identity),
        consumed_directory_identity_sha256:idHash(consumed.identity),
        socket_identity_sha256:idHash(socketBefore),
        service_process_identity_sha256:idHash(custodyBefore),
        loader_environment_clean:custodyBefore.loader_environment_clean,
        state_root_identity_stable:true,
        consumed_directory_identity_stable:true,
        socket_identity_stable:true,
        service_process_identity_stable:true,
      },
    });

    return Object.freeze({
      marker:VOID_APOLLYON_LIVE_CUSTODY_SOURCE_SESSION_RUNNER_V2,
      version:2,
      status:"live_source_session_binding_complete_training_service_pending_stop",
      binding,
      training_pid:training.pid,
      training_process_start_time_ticks:training.start_time_ticks,
      training_service_enabled:false,
      durable_attempt_claim_performed:false,
      training_execution_performed:false,
      candidate_weight_mutation_performed:false,
      custody_service_action_performed:false,
      funds_movement_performed:false,
    });
  }finally{
    if(prepared!==null)cleanupApollyonReviewedExecutionTreeV2(prepared);
    if(trainingStarted)runSystemctl(["stop",TRAINING_UNIT],false);
    closePinned(consumed);
    closePinned(stateRoot);
  }
}
async function main(){
  const config=parseCli(process.argv.slice(2));
  if(config.self_test){selfTest();return;}
  const result=await runApollyonLiveCustodySourceSessionRunnerV2(config);
  if(systemdValue(TRAINING_UNIT,"ActiveState")==="active"){
    fail("apollyon_live_runner_training_service_failed_to_stop");
  }
  if(serviceEnabled(TRAINING_UNIT)){
    fail("apollyon_live_runner_training_service_became_enabled");
  }
  process.stdout.write(canonical({
    ...result,
    status:"live_source_session_binding_complete_training_service_stopped",
    training_service_active_after:false,
  })+"\n");
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===path.resolve(process.argv[1])){
  try{await main();}
  catch(error){
    process.stderr.write("HOLD="+String(error?.message||error)+"\n");
    process.stderr.write(
      "training_service_enable=false\ndurable_attempt_claim=false\n"+
      "training_execution=false\ncandidate_weight_mutation=false\n"+
      "operator_private_key_access=false\nfunds_movement=false\n"
    );
    process.exitCode=2;
  }
}
