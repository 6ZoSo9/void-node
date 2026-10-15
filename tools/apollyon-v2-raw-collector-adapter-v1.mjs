#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {spawnSync} from "node:child_process";

export const VOID_APOLLYON_V2_RAW_COLLECTOR_ADAPTER_V1 =
  "VOID_APOLLYON_V2_RAW_COLLECTOR_ADAPTER_V1";

export const VOID_APOLLYON_V2_RAW_COLLECTOR_ADAPTER_AUTHORITY_V1 =
  Object.freeze({
    reviewed_private_collector_required:true,
    trusted_python_descriptor_required:true,
    raw_v2_evidence_only:true,
    current_v2_policy_evaluation:false,
    current_v2_preclaim_composition:false,
    process_execution_capability:true,
    filesystem_read:true,
    filesystem_write:false,
    external_network_access:false,
    service_action:false,
    attempt_claim:false,
    training_execution:false,
    candidate_weight_mutation:false,
    credential_access:false,
    wallet_or_signer_access:false,
    transaction:false,
    funds_movement:false,
  });

const COLLECTOR_BLOB_SHA1="2a285b5b1da2597a8b9eae6d08cd42d010bf7f71";
const PYTHON_PATH="/usr/bin/python3";
const RAW_MARKER="VOID_APOLLYON_CUSTODY_HOST_POLICY_EVIDENCE_V2";
const SUCCESS_MARKER="live_host_evidence_collected=true";
const SAFE_NAME=/^[A-Za-z_][A-Za-z0-9_.-]{0,63}$/u;
const SAFE_UNIT=/^[A-Za-z0-9_.@-]+\.service$/u;
const MAX_STDOUT_BYTES=128*1024;
const MAX_STDERR_BYTES=32*1024;
const MAX_MS=20_000;

function fail(code){throw new Error(code);}
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
  if(typeof value!=="string"||!SAFE_UNIT.test(value))fail("apollyon_v2_raw_adapter_service_unit_invalid");
  return value;
}
function safePid(value){
  const text=String(value);
  if(!/^[1-9][0-9]{0,9}$/u.test(text))fail("apollyon_v2_raw_adapter_training_pid_invalid");
  const parsed=Number(text);
  if(!Number.isSafeInteger(parsed)||parsed<1||parsed>0x7fff_ffff)fail("apollyon_v2_raw_adapter_training_pid_invalid");
  return text;
}
function assertTrustedDirectoryChain(directory,code){
  const absolute=path.resolve(directory);
  if(absolute!==directory)fail(code);
  const parsed=path.parse(absolute);
  let cursor=parsed.root;
  const inspect=(pathname)=>{
    const st=fs.lstatSync(pathname);
    if(st.isSymbolicLink()||!st.isDirectory()||st.uid!==0||(st.mode&0o022)!==0)fail(code);
  };
  inspect(cursor);
  for(const segment of absolute.slice(parsed.root.length).split(path.sep).filter(Boolean)){
    cursor=path.join(cursor,segment);
    inspect(cursor);
  }
}
function openTrustedPython(){
  const code="apollyon_v2_raw_adapter_python_untrusted";
  assertTrustedDirectoryChain(path.dirname(PYTHON_PATH),code);
  const canonicalPath=fs.realpathSync.native(PYTHON_PATH);
  if(!path.isAbsolute(canonicalPath)||path.resolve(canonicalPath)!==canonicalPath)fail(code);
  assertTrustedDirectoryChain(path.dirname(canonicalPath),code);
  const before=fs.lstatSync(canonicalPath);
  if(
    before.isSymbolicLink()||!before.isFile()||before.uid!==0||before.nlink!==1||
    (before.mode&0o022)!==0||(before.mode&0o111)===0||
    (before.mode&0o6000)!==0
  )fail(code);
  const fd=fs.openSync(
    canonicalPath,
    fs.constants.O_RDONLY|Number(fs.constants.O_NOFOLLOW||0),
  );
  const opened=fs.fstatSync(fd);
  const visible=fs.lstatSync(canonicalPath);
  if(
    opened.dev!==before.dev||opened.ino!==before.ino||opened.size!==before.size||
    visible.dev!==opened.dev||visible.ino!==opened.ino||visible.size!==opened.size
  ){
    fs.closeSync(fd);
    fail(code);
  }
  return fd;
}

export function buildApollyonV2RawCollectorArgsV1(config){
  if(!config||typeof config!=="object"||Array.isArray(config))fail("apollyon_v2_raw_adapter_config_invalid");
  const expected=[
    "custody_user","ipc_group","service_unit","socket_path","state_root",
    "training_pid","training_user",
  ];
  if(Object.keys(config).sort().join("\n")!==expected.sort().join("\n")){
    fail("apollyon_v2_raw_adapter_config_invalid");
  }
  return [
    "--training-user",safeName(config.training_user,"apollyon_v2_raw_adapter_training_user_invalid"),
    "--training-pid",safePid(config.training_pid),
    "--custody-user",safeName(config.custody_user,"apollyon_v2_raw_adapter_custody_user_invalid"),
    "--ipc-group",safeName(config.ipc_group,"apollyon_v2_raw_adapter_ipc_group_invalid"),
    "--state-root",exactAbs(config.state_root,"apollyon_v2_raw_adapter_state_root_invalid"),
    "--socket-path",exactAbs(config.socket_path,"apollyon_v2_raw_adapter_socket_path_invalid"),
    "--service-unit",safeUnit(config.service_unit),
    "--ttl-ms","300000",
  ];
}

export function parseApollyonV2RawCollectorOutputV1(stdout,stderr){
  if(
    typeof stdout!=="string"||typeof stderr!=="string"||
    Buffer.byteLength(stdout,"utf8")>MAX_STDOUT_BYTES||
    Buffer.byteLength(stderr,"utf8")>MAX_STDERR_BYTES||
    !stdout.endsWith("\n")||stdout.slice(0,-1).includes("\n")||
    !stderr.includes(SUCCESS_MARKER)
  )fail("apollyon_v2_raw_adapter_output_invalid");
  let value;
  try{value=JSON.parse(stdout.slice(0,-1));}
  catch{fail("apollyon_v2_raw_adapter_json_invalid");}
  if(canonical(value)+"\n"!==stdout)fail("apollyon_v2_raw_adapter_noncanonical");
  if(
    !value||value.marker!==RAW_MARKER||value.version!==2||
    value.target_host!=="Xiphos"||
    value.service_control?.inherited_system_bus_descriptor_absence_required!==true||
    value.service_control?.inherited_system_bus_descriptor_absence_proven!==false||
    value.service_control?.absolute_runtime_service_control_denial_proven!==false||
    value.service_control?.runtime_can_control_service!==null||
    value.service?.runtime_can_control_service!==null
  )fail("apollyon_v2_raw_adapter_boundary_invalid");
  return Object.freeze(value);
}

function openReviewedCollector(prepared){
  if(!prepared||typeof prepared!=="object"||typeof prepared.root!=="string"||typeof prepared.collector!=="string"){
    fail("apollyon_v2_raw_adapter_prepared_invalid");
  }
  const root=path.resolve(prepared.root);
  const collector=path.resolve(prepared.collector);
  if(root!==prepared.root||collector!==prepared.collector||!collector.startsWith(root+path.sep)){
    fail("apollyon_v2_raw_adapter_prepared_invalid");
  }
  const before=fs.lstatSync(collector);
  if(
    before.isSymbolicLink()||!before.isFile()||before.nlink!==1||
    before.uid!==process.geteuid?.()||(before.mode&0o777)!==0o400||
    before.size<1||before.size>2*1024*1024
  )fail("apollyon_v2_raw_adapter_collector_invalid");
  const fd=fs.openSync(
    collector,
    fs.constants.O_RDONLY|Number(fs.constants.O_NOFOLLOW||0)|Number(fs.constants.O_NONBLOCK||0),
  );
  const opened=fs.fstatSync(fd);
  const bytes=fs.readFileSync(fd);
  const after=fs.fstatSync(fd);
  if(
    opened.dev!==before.dev||opened.ino!==before.ino||opened.size!==before.size||
    after.dev!==opened.dev||after.ino!==opened.ino||after.size!==opened.size||
    gitBlobSha1(bytes)!==COLLECTOR_BLOB_SHA1
  ){
    fs.closeSync(fd);
    fail("apollyon_v2_raw_adapter_collector_identity_mismatch");
  }
  return fd;
}

export function runApollyonV2RawCollectorAdapterV1(prepared,config){
  const args=buildApollyonV2RawCollectorArgsV1(config);
  const collectorFd=openReviewedCollector(prepared);
  let pythonFd=null;
  try{
    pythonFd=openTrustedPython();
    const result=spawnSync(
      "/proc/self/fd/4",
      ["-I","-B","/proc/self/fd/3",...args],
      {
        encoding:"utf8",
        env:{PATH:"/usr/sbin:/usr/bin:/sbin:/bin",LC_ALL:"C",PYTHONDONTWRITEBYTECODE:"1"},
        timeout:MAX_MS,
        maxBuffer:MAX_STDOUT_BYTES+MAX_STDERR_BYTES,
        windowsHide:true,
        stdio:["ignore","pipe","pipe",collectorFd,pythonFd],
      },
    );
    if(result.error)fail("apollyon_v2_raw_adapter_execution_failed");
    if(result.signal!==null)fail("apollyon_v2_raw_adapter_signaled");
    if(result.status!==0){
      const match=String(result.stderr??"").match(/^HOLD=([a-z0-9_]+)$/mu);
      fail("apollyon_v2_raw_adapter_collector_held:"+(match?.[1]??"unknown"));
    }
    return parseApollyonV2RawCollectorOutputV1(
      String(result.stdout??""),
      String(result.stderr??""),
    );
  }finally{
    fs.closeSync(collectorFd);
    if(pythonFd!==null)fs.closeSync(pythonFd);
  }
}
