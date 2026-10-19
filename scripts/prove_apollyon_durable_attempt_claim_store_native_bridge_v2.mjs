#!/usr/bin/env node
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import {createRequire} from "node:module";
import os from "node:os";
import path from "node:path";
import {performance} from "node:perf_hooks";
import {fileURLToPath,pathToFileURL} from "node:url";
import {Worker} from "node:worker_threads";

import {canonicalApollyonClaimContractJsonV1} from "../tools/apollyon-candidate-training-attempt-claim-contract-v1.mjs";
import {serializeApollyonDurableAttemptClaimPublishRequestV2} from "../tools/apollyon-durable-attempt-claim-request-envelope-v2.mjs";
import {qualifyApollyonDurableAttemptClaimAuthorizationSlotRecordV1} from "../tools/apollyon-durable-attempt-claim-authorization-slot-v1.mjs";
import {qualifyApollyonDurableAttemptClaimStorePolicyV2} from "../tools/apollyon-durable-attempt-claim-store-contract-v2.mjs";
import {VOID_APOLLYON_CLAIM_STORE_LAYOUT_V2} from "../tools/apollyon-durable-attempt-claim-store-service-source-implementation-v2.mjs";
import {createApollyonDurableAttemptClaimStoreServiceWithLinuxTransactionV2} from "../tools/apollyon-durable-attempt-claim-store-transaction-lease-v2.mjs";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const SELF_REL="scripts/prove_apollyon_durable_attempt_claim_store_native_bridge_v2.mjs";
const JS_REL="tools/apollyon-durable-attempt-claim-store-native-bridge-v2.mjs";
const C_REL="ops/xiphos/apollyon_durable_attempt_claim_store_native_bridge_v2.c";
const PROCESS_REL="ops/xiphos/apollyon_durable_attempt_claim_native_process_identity_v2.c";
const PROCESS_HEADER_REL="ops/xiphos/apollyon_durable_attempt_claim_native_process_identity_v2.h";
const ADDON_REL="build/Release/apollyon_claim_store_native_bridge_v2.node";
const JS_BLOB="3a46492c841047431f2086f5e8c37a51c20ff2a4";
const C_BLOB="96df365a812c645e6210ea5728c8f38851019d50";
const PINNED=Object.freeze({
  [JS_REL]:JS_BLOB,
  [C_REL]:C_BLOB,
  [PROCESS_REL]:"ecc262686cdc388d08775c735c68430e737e40d5",
  [PROCESS_HEADER_REL]:"5355ffd2856e0f0c57f6e52fd1b347441b94e4d7",
  "tools/apollyon-durable-attempt-claim-store-service-source-implementation-v2.mjs":"d8fbb951e901422fcd100d3bc9fd1168c2077290",
  "tools/apollyon-durable-attempt-claim-store-transaction-lease-v2.mjs":"f485b9e6fc29eab549ebba07e1b49f24c7659092",
});
const SESSION_ID="apollyon_claim_source_session_v2:"+"e".repeat(64);
const STORE_POLICY=qualifyApollyonDurableAttemptClaimStorePolicyV2();
const uid=process.getuid();
const gid=process.getgid();
const O_DIRECTORY=fs.constants.O_DIRECTORY??0;
const O_CLOEXEC=fs.constants.O_CLOEXEC??0;
const CLEAN_ENV=Object.freeze({PATH:"/usr/bin:/bin",LANG:"C",LC_ALL:"C"});
const WRITE_PROOF_CONTROL=fs.writeSync;

// Synthetic records use the same accepted fixed schemas as the core proof.
function sha256(value){
  return crypto.createHash("sha256").update(value).digest("hex");
}
function gitBlob(bytes){
  return crypto.createHash("sha1")
    .update(Buffer.from("blob "+bytes.length+"\0","ascii"))
    .update(bytes).digest("hex");
}
function canonical(value){
  return canonicalApollyonClaimContractJsonV1(value);
}
function bytes(value){
  return Buffer.from(canonical(value)+"\n","utf8");
}
function mode(st){return st.mode&0o7777;}
function rootIdentity(st){
  return {
    dev:String(st.dev),
    ino:String(st.ino),
    mode:mode(st),
    uid:st.uid,
    gid:st.gid,
    nlink:st.nlink,
    size:st.size,
  };
}
function writeCanonical(file,value){
  fs.writeFileSync(file,bytes(value),{mode:0o600});
  fs.chmodSync(file,0o600);
}
function generationRecord(rootIdentitySha,seed="2"){
  const material={
    marker:"VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_STORE_GENERATION_V2",
    version:2,
    status:"durable_attempt_claim_store_generation_v2",
    store_policy_id:STORE_POLICY.store_policy_id,
    store_generation_id:"apollyon_claim_store_generation_v2:"+seed.repeat(64),
    root_identity_sha256:rootIdentitySha,
    genesis:true,
    predecessor_store_generation_id:null,
    claim_history_count:0,
    claim_history_sha256:"3".repeat(64),
    generation_lineage_count:1,
    generation_lineage_sha256:"4".repeat(64),
    continuity_receipt_id:"apollyon_claim_store_continuity_v2:"+"5".repeat(64),
  };
  return {
    ...material,
    store_generation_record_id:"apollyon_claim_store_generation_record_v2:"+
      sha256(Buffer.from(canonical(material),"utf8")),
  };
}
function claimRecord(generation,{terminalSeed="6",requestSeed="7",treeSeed="b"}={}){
  const material={
    marker:"VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_RECORD_V2",
    version:2,
    status:"durable_candidate_training_attempt_claim_record_v2",
    store_contract_id:"apollyon_claim_store_contract_v2:"+"1".repeat(64),
    store_policy_id:STORE_POLICY.store_policy_id,
    store_generation_id:generation.store_generation_id,
    terminal_receipt_id:"apollyon_terminal_receipt_v2:"+terminalSeed.repeat(64),
    terminal_runner_receipt_sha256:"8".repeat(64),
    authorization_id:"apollyon_authz_v1:"+"9".repeat(64),
    custody_generation_id:"apollyon_custody_generation_v1:"+"a".repeat(64),
    custody_record_sha256:"b".repeat(64),
    request_sha256:requestSeed.repeat(64),
    canonical_main:"c".repeat(40),
    canonical_tree:treeSeed.repeat(40),
    corpus_sha256:"d".repeat(64),
    parent_adapter_sha256:"e".repeat(64),
    operator_public_key_raw_sha256:"f".repeat(64),
    attempt_limit:1,
    automatic_retry_authorized:false,
  };
  return {
    ...material,
    claim_record_id:"apollyon_attempt_claim_record_v2:"+
      sha256(Buffer.from(canonical(material),"utf8")),
  };
}
function requestBundle(record){
  const request={
    claim_record:record,
    marker:"VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_REQUEST_V2",
    method:"publish_claim_v2",
    store_contract_id:record.store_contract_id,
    store_policy_id:record.store_policy_id,
    version:2,
  };
  const requestBytes=serializeApollyonDurableAttemptClaimPublishRequestV2(request);
  const publishRequestSha=sha256(requestBytes);
  const slot=qualifyApollyonDurableAttemptClaimAuthorizationSlotRecordV1({
    store_policy_id:record.store_policy_id,
    authorization_id:record.authorization_id,
    store_contract_id:record.store_contract_id,
    store_generation_id:record.store_generation_id,
    terminal_receipt_id:record.terminal_receipt_id,
    claim_record_id:record.claim_record_id,
    claim_record_sha256:sha256(bytes(record)),
    publish_request_sha256:publishRequestSha,
    attempt_limit:1,
    automatic_retry_authorized:false,
  });
  return {request,requestBytes,publishRequestSha,slot};
}
function slotLeaf(slot){
  return "authorization-slot-v1-"+
    slot.authorization_slot_id.split(":")[1]+".json";
}
function claimLeaf(record){
  return "claim-v2-"+record.claim_record_id.split(":")[1]+".json";
}
function generationLeaf(generation){
  return "store-generation-v2-"+
    generation.store_generation_id.split(":")[1]+".json";
}
function revalidationReceipt(stage,context){
  return {
    marker:"VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_STORE_LOCAL_REVALIDATION_V2",
    version:2,
    stage,
    session_binding_id:SESSION_ID,
    publish_request_sha256:context.publish_request_sha256,
    store_generation_record_id:context.generation.store_generation_record_id,
    store_generation_id:context.generation.store_generation_id,
    authorization_slot_id:context.slot.authorization_slot_id,
    authorization_slot_record_id:context.slot.authorization_slot_record_id,
    claim_record_id:context.record.claim_record_id,
    local_revalidation_passed:true,
    source_contract_only:true,
    host_proven:false,
  };
}

function fixture(){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),"void-apollyon-native-store-proof-"));
  fs.chmodSync(root,0o700);
  for(const key of ["generation_directory","authorization_slot_directory","claim_directory",
    "pending_directory","training_start_consumption_directory"]){
    fs.mkdirSync(path.join(root,VOID_APOLLYON_CLAIM_STORE_LAYOUT_V2[key]),{mode:0o700});
  }
  const active=path.join(root,VOID_APOLLYON_CLAIM_STORE_LAYOUT_V2.active_generation_leaf);
  fs.writeFileSync(active,"{}\n",{mode:0o600});
  const rootFd=fs.openSync(root,fs.constants.O_RDONLY|O_DIRECTORY|O_CLOEXEC);
  const rootHash=sha256(Buffer.from(canonical(rootIdentity(fs.fstatSync(rootFd))),"utf8"));
  const generation=generationRecord(rootHash);
  writeCanonical(active,generation);
  writeCanonical(path.join(root,VOID_APOLLYON_CLAIM_STORE_LAYOUT_V2.generation_directory,
    generationLeaf(generation)),generation);
  return {
    root,rootFd,active,generation,
    cleanup(){
      try{fs.closeSync(rootFd);}
      finally{fs.rmSync(root,{recursive:true,force:true});}
    },
  };
}
function publishInput(bundle,generation){
  return {
    authorization_slot_record:bundle.slot,
    expected_store_generation_record:generation,
    request_bytes:bundle.requestBytes,
  };
}
function observationInput(bundle,generation){
  return {
    authorization_id:bundle.request.claim_record.authorization_id,
    expected_store_generation_record:generation,
    request_bytes:bundle.requestBytes,
  };
}
function recordPaths(f,bundle){
  return {
    slot:path.join(f.root,VOID_APOLLYON_CLAIM_STORE_LAYOUT_V2.authorization_slot_directory,
      slotLeaf(bundle.slot)),
    claim:path.join(f.root,VOID_APOLLYON_CLAIM_STORE_LAYOUT_V2.claim_directory,
      claimLeaf(bundle.request.claim_record)),
  };
}
function storeSnapshot(root){
  const rows=[];
  const visit=relative=>{
    const absolute=path.join(root,relative);
    const st=fs.lstatSync(absolute,{bigint:true});
    const row={path:relative};
    for(const key of ["dev","ino","mode","uid","gid","nlink","size","mtimeNs","ctimeNs"]){
      row[key]=String(st[key]);
    }
    if(st.isFile()){
      const fd=fs.openSync(absolute,fs.constants.O_RDONLY);
      try{row.sha256=sha256(fs.readFileSync(fd));}
      finally{fs.closeSync(fd);}
    }
    rows.push(row);
    if(st.isDirectory())for(const name of fs.readdirSync(absolute).sort())visit(path.join(relative,name));
  };
  visit("");
  return rows;
}
function withReadOnlyFs(run){
  const denied=[];
  const names=["writeSync","writevSync","writeFileSync","appendFileSync","truncateSync",
    "ftruncateSync","fsyncSync","fdatasyncSync","linkSync","unlinkSync","renameSync",
    "mkdirSync","mkdtempSync","rmSync","rmdirSync","chmodSync","fchmodSync","chownSync",
    "fchownSync","symlinkSync","copyFileSync","cpSync","utimesSync","futimesSync",
  ].filter(name=>typeof fs[name]==="function");
  const originals=new Map(names.map(name=>[name,fs[name]]));
  const originalOpen=fs.openSync;
  for(const name of names)fs[name]=()=>{denied.push(name);throw new Error("fixture_readonly_denied:"+name);};
  fs.openSync=function readonlyOpen(file,flags,...args){
    if(typeof flags!=="number"||(flags&(fs.constants.O_WRONLY|fs.constants.O_RDWR|
      fs.constants.O_CREAT|fs.constants.O_TRUNC|fs.constants.O_APPEND))!==0){
      denied.push("openSync:write");throw new Error("fixture_readonly_open_denied");
    }
    assert.equal(String(file).includes(VOID_APOLLYON_CLAIM_STORE_LAYOUT_V2.pending_directory),false);
    return originalOpen(file,flags,...args);
  };
  try{return run();}
  finally{
    fs.openSync=originalOpen;
    for(const [name,original] of originals)fs[name]=original;
    assert.deepEqual(denied,[],"native peer observation invokes no filesystem mutation API");
  }
}
function descriptorSet(){return fs.readdirSync("/proc/self/fd").sort();}
function errorMessages(error){
  const out=[];
  for(let cursor=error;cursor&&out.length<16;cursor=cursor.cause){
    out.push(String(cursor.message));
    if(typeof cursor.code==="string")out.push(cursor.code);
  }
  return out;
}
function expectError(run,code){
  let observed;
  assert.throws(run,error=>{
    observed=error;
    return code===undefined||errorMessages(error).some(message=>message.includes(code));
  });
  return observed;
}
function requireNativeError(error,code){
  assert.equal(error.code,code);
  assert.equal(Number.isInteger(error.errno),true);
  assert.equal(Object.isFrozen(error.cleanup_errors),true);
  for(const row of error.cleanup_errors){
    assert.equal(Object.isFrozen(row),true);
    assert.deepEqual(Object.keys(row).sort(),["code","errno","resource"]);
  }
}
function requireSourceOnly(value){
  for(const key of ["protected_expected_identity_origin_proven","privileged_peer_role_admission_performed",
    "challenge_exchange_performed"]){
    assert.equal(value[key],false,key);
  }
}
function requireClosed(core,input,observation){
  expectError(()=>core.publishClaim(input),"apollyon_claim_store_bridge_v2_session_closed");
  expectError(()=>core.observeAuthorizationWinner(observation),"apollyon_claim_store_bridge_v2_session_closed");
  expectError(()=>core.close(),"apollyon_claim_store_bridge_v2_session_closed");
}
async function bridgeModule(){return import(pathToFileURL(path.join(ROOT,JS_REL)).href);}
function nativeModule(){return createRequire(import.meta.url)(path.join(ROOT,ADDON_REL));}

// Python creates actual anonymous pipes. Node's stdio "pipe" uses a socket pair
// and therefore cannot provide an honest fixture for the fixed FD3 pipe boundary.
const PIPE_FIXTURE=String.raw`
import base64,fcntl,json,os,signal,stat,subprocess,sys,tempfile,time,socket
plan=json.loads(sys.stdin.buffer.read())
mode=plan['mode']
temporary=tempfile.TemporaryDirectory(prefix='void-apollyon-inherited-pipe-')
owned=set()
writer=None
sockrefs=[]
def own(fd):
    owned.add(fd)
    return fd
if mode=='regular':
    name=os.path.join(temporary.name,'regular')
    with open(name,'wb') as stream: stream.write(b'{}\n')
    selected=own(os.open(name,os.O_RDONLY|os.O_NONBLOCK))
elif mode=='named_fifo':
    name=os.path.join(temporary.name,'named')
    os.mkfifo(name,0o600)
    selected=own(os.open(name,os.O_RDONLY|os.O_NONBLOCK))
    writer=own(os.open(name,os.O_WRONLY))
elif mode=='socket':
    left,right=socket.socketpair()
    left.setblocking(False)
    selected=own(left.detach())
    own(right.detach())
else:
    reader,writer=os.pipe()
    own(reader);own(writer)
    os.fchmod(reader,0o600)
    if mode!='blocking': fcntl.fcntl(reader,fcntl.F_SETFL,fcntl.fcntl(reader,fcntl.F_GETFL)|os.O_NONBLOCK)
    selected=writer if mode=='wrong_direction' else reader
    if mode=='wrong_direction': own(fcntl.fcntl(reader,fcntl.F_DUPFD_CLOEXEC,20))
saved=own(fcntl.fcntl(selected,fcntl.F_DUPFD_CLOEXEC,20))
os.dup2(saved,3,inheritable=True)
own(3)
before=fcntl.fcntl(3,fcntl.F_GETFL)
metadata=os.fstat(3)
def drop_identity():
    if plan.get('drop_uid') is not None:
        os.setgroups([])
        os.setgid(plan['drop_uid'])
        os.setuid(plan['drop_uid'])
child=None
try:
    child=subprocess.Popen([plan['node'],plan['proof'],'--pipe-child',json.dumps(plan['child'])],
        stdin=subprocess.DEVNULL,stdout=subprocess.PIPE,stderr=subprocess.PIPE,
        pass_fds=(3,),preexec_fn=drop_identity,
        env={'PATH':'/usr/bin:/bin','LANG':'C','LC_ALL':'C'},cwd='/')
    ready=child.stdout.readline()
    if ready!=b'pipe_reader_ready\n': raise RuntimeError('pipe child did not reach read boundary: '+repr(ready))
    if mode not in ('regular','named_fifo','socket','blocking','wrong_direction'):
        body=base64.b64decode(plan['body'])
        pieces=[body[:1],body[1:17],body[17:]] if mode in ('fragmented','root_owned') else [body]
        for piece in pieces:
            if piece:
                offset=0
                while offset<len(piece):
                    try: offset+=os.write(writer,piece[offset:])
                    except BrokenPipeError: break
                if mode in ('fragmented','root_owned'): time.sleep(0.025)
    if mode!='missing_eof' and writer is not None:
        os.close(writer);owned.discard(writer);writer=None
    stdout,stderr=child.communicate(timeout=9)
    result={'status':child.returncode,'stdout':stdout.decode(),'stderr':stderr.decode(),
        'flags_before':before,'flags_after':fcntl.fcntl(3,fcntl.F_GETFL),
        'pipe_uid':metadata.st_uid,'pipe_mode':stat.S_IMODE(metadata.st_mode)}
    print(json.dumps(result))
finally:
    if child is not None and child.poll() is None:
        child.kill();child.wait(timeout=3)
    for fd in owned:
        try: os.close(fd)
        except OSError as error:
            if error.errno!=9: raise
    for endpoint in sockrefs: endpoint.close()
    temporary.cleanup()
`;

// The peer creates the tested socketpair itself, then transfers one endpoint and
// its executable FD to the supervisor. SO_PEERCRED therefore names the intended
// live peer, rather than the supervisor that later launches the Node consumer.
const PEER_FIXTURE=String.raw`
import array,base64,json,os,signal,socket,subprocess,sys,time
plan=json.loads(sys.stdin.buffer.read())
supervisor,peer_control=socket.socketpair()
peer_pid=os.fork()
if peer_pid==0:
    supervisor.close()
    local,remote=socket.socketpair(socket.AF_UNIX,socket.SOCK_STREAM)
    executable=os.open('/proc/self/exe',os.O_RDONLY|os.O_CLOEXEC)
    with open('/proc/self/cmdline','rb') as stream: cmdline=stream.read()
    metadata={'peer_pid':os.getpid(),'expected_ppid':os.getppid(),
        'expected_uid':os.getuid(),'expected_gid':os.getgid(),
        'expected_supplementary_gids':os.getgroups(),
        'expected_cmdline_base64':base64.b64encode(cmdline).decode()}
    peer_control.sendmsg([json.dumps(metadata).encode()],
        [(socket.SOL_SOCKET,socket.SCM_RIGHTS,array.array('i',[remote.fileno(),executable]))])
    remote.close();os.close(executable)
    try:
        while True:
            command=peer_control.recv(64)
            if not command: os._exit(0)
            if command==b'exit': os._exit(0)
            if command==b'exec': os.execl('/bin/sleep','sleep','20')
            if command==b'half_close':
                local.shutdown(socket.SHUT_WR)
                peer_control.sendall(b'ok')
                continue
            if command==b'full_close':
                local.close()
                peer_control.sendall(b'ok')
                continue
            if command!=b'ping': os._exit(3)
    finally: os._exit(4)
peer_control.close()
data,ancillary,flags,address=supervisor.recvmsg(8192,socket.CMSG_SPACE(8))
fds=array.array('i')
for level,kind,control in ancillary:
    if level==socket.SOL_SOCKET and kind==socket.SCM_RIGHTS: fds.frombytes(control[:len(control)-(len(control)%fds.itemsize)])
if len(fds)!=2: raise RuntimeError('peer descriptor transfer failed')
metadata=json.loads(data)
metadata.update({'socket_fd':fds[0],'expected_executable_fd':fds[1],
    'control_fd':supervisor.fileno(),'case':plan['case']})
child=None
try:
    child=subprocess.Popen([plan['node'],plan['proof'],'--peer-child',json.dumps(metadata)],
        stdin=subprocess.DEVNULL,stdout=subprocess.PIPE,stderr=subprocess.PIPE,
        pass_fds=(fds[0],fds[1],supervisor.fileno()),
        env={'PATH':'/usr/bin:/bin','LANG':'C','LC_ALL':'C'},cwd='/')
    stdout,stderr=child.communicate(timeout=12)
    print(json.dumps({'status':child.returncode,'stdout':stdout.decode(),'stderr':stderr.decode()}))
finally:
    if child is not None and child.poll() is None:
        child.kill();child.wait(timeout=3)
    try: os.kill(peer_pid,signal.SIGKILL)
    except ProcessLookupError: pass
    os.waitpid(peer_pid,0)
    for fd in fds: os.close(fd)
    supervisor.close()
`;

// The control process really forks the publisher. Each process creates its own
// tested SOCK_STREAM pair, so neither SO_PEERCRED nor PPid is a fixture label.
// Separate SOCK_SEQPACKET management pairs transfer descriptors and coordinate
// faults; none of the fixtures starts a listener or substitutes a socket mock.
const SESSION_FIXTURE=String.raw`
import array,base64,hashlib,json,os,signal,socket,subprocess,sys,threading,time
plan=json.loads(sys.stdin.buffer.read())
def management_pair():
    return socket.socketpair(socket.AF_UNIX,socket.SOCK_SEQPACKET)
def send_packet(channel,value,fds=()):
    body=json.dumps(value).encode()
    if fds: channel.sendmsg([body],[(socket.SOL_SOCKET,socket.SCM_RIGHTS,array.array('i',fds))])
    else: channel.sendall(body)
def receive_packet(channel,descriptors=0):
    if not descriptors: return json.loads(channel.recv(262144))
    data,ancillary,flags,address=channel.recvmsg(8192,socket.CMSG_SPACE(descriptors*4))
    fds=array.array('i')
    for level,kind,control in ancillary:
        if level==socket.SOL_SOCKET and kind==socket.SCM_RIGHTS:
            fds.frombytes(control[:len(control)-(len(control)%fds.itemsize)])
    if len(fds)!=descriptors: raise RuntimeError('session descriptor transfer failed')
    return json.loads(data),list(fds)
def introduce(channel):
    local,remote=socket.socketpair(socket.AF_UNIX,socket.SOCK_STREAM)
    remote.setsockopt(socket.SOL_SOCKET,socket.SO_SNDBUF,4096)
    if plan['case']!='session_missing_inline': remote.setsockopt(socket.SOL_SOCKET,socket.SO_OOBINLINE,1)
    # Linux asm-generic/socket.h defines SO_PEEK_OFF as 42; Python may not expose it.
    if plan['case']=='session_nondefault_peek': remote.setsockopt(socket.SOL_SOCKET,42,1)
    executable=os.open('/proc/self/exe',os.O_RDONLY|os.O_CLOEXEC)
    with open('/proc/self/cmdline','rb') as stream: command=stream.read()
    metadata={'peer_pid':os.getpid(),'expected_ppid':os.getppid(),
        'expected_uid':os.getuid(),'expected_gid':os.getgid(),
        'expected_supplementary_gids':os.getgroups(),
        'expected_cmdline_base64':base64.b64encode(command).decode()}
    send_packet(channel,metadata,(remote.fileno(),executable))
    remote.close();os.close(executable)
    return local
def serve_management(channel,local,role):
    result={'role':role,'received_base64':'','eof':False,'challenge_base64':'',
        'sent_response':False,'rights_sent':False}
    finished=threading.Event()
    drain=threading.Event()
    started=False
    def wire(config):
        try:
            case=plan['case']
            if role=='publisher':
                body=base64.b64decode(config['body'])
                if case=='session_request_rights':
                    transferred=os.open('/dev/null',os.O_RDONLY|os.O_CLOEXEC)
                    try:
                        count=local.sendmsg([body],[(socket.SOL_SOCKET,socket.SCM_RIGHTS,array.array('i',[transferred]))])
                        if count<=0: raise RuntimeError('request ancillary descriptor was not sent')
                        result['rights_sent']=True
                        pieces=[body[count:]]
                    finally: os.close(transferred)
                else: pieces=[body[:1],body[1:17],body[17:]]
                for piece in pieces:
                    if piece: local.sendall(piece)
                    if case=='session_valid': time.sleep(0.015)
                if case=='session_request_delayed_extra':
                    time.sleep(0.075);local.sendall(b'x')
                if case!='session_request_no_eof': local.shutdown(socket.SHUT_WR)
                if case=='native_session_response_timeout': drain.wait(9)
            else:
                challenge=b''
                while len(challenge)<32:
                    fragment=local.recv(32-len(challenge))
                    if not fragment: break
                    challenge+=fragment
                result['challenge_base64']=base64.b64encode(challenge).decode()
                if len(challenge)==32:
                    response=challenge+bytes.fromhex(config['digest'])
                    if case=='session_wrong_challenge': response=bytes([response[0]^1])+response[1:]
                    if case=='session_wrong_digest': response=response[:32]+bytes([response[32]^1])+response[33:]
                    if case=='session_challenge_short': response=response[:63]
                    if case=='session_challenge_extra': response+=b'x'
                    if case=='session_challenge_rights':
                        transferred=os.open('/dev/null',os.O_RDONLY|os.O_CLOEXEC)
                        try:
                            count=local.sendmsg([response],[(socket.SOL_SOCKET,socket.SCM_RIGHTS,array.array('i',[transferred]))])
                            if count<=0: raise RuntimeError('challenge ancillary descriptor was not sent')
                            result['rights_sent']=True
                            pieces=[response[count:]]
                        finally: os.close(transferred)
                    else: pieces=[response[:1],response[1:31],response[31:]]
                    for piece in pieces:
                        if not piece: continue
                        local.sendall(piece)
                        if case=='session_valid': time.sleep(0.015)
                    if case=='session_challenge_delayed_extra':
                        time.sleep(0.075);local.sendall(b'x')
                    result['sent_response']=True
                    if case!='session_challenge_no_eof': local.shutdown(socket.SHUT_WR)
            received=bytearray()
            while True:
                fragment=local.recv(113)
                if not fragment:
                    result['eof']=True;break
                received.extend(fragment)
                if len(received)>131072: raise RuntimeError('fixture response bound exceeded')
            result['received_base64']=base64.b64encode(received).decode()
        except (OSError,RuntimeError) as error:
            result['wire_error']=type(error).__name__+': '+str(error)
        finally: finished.set()
    while True:
        raw=channel.recv(262144)
        if not raw: return
        command=json.loads(raw)
        action=command['action']
        if action=='start':
            if started: raise RuntimeError('fixture cannot start twice')
            started=True
            # Early data/EOF must be queued before the service starts reading.
            if role=='control' and plan['case']=='session_control_early_bytes':
                local.sendall(b'x')
            if role=='control' and plan['case']=='session_control_early_eof':
                local.shutdown(socket.SHUT_WR)
            if role=='control' and plan['case']=='session_control_urgent':
                local.send(b'x',socket.MSG_OOB)
            threading.Thread(target=wire,args=(command,),daemon=True).start()
            send_packet(channel,{'ok':True})
        elif action=='exit': os._exit(0)
        elif action=='exec': os.execl('/bin/sleep','sleep','20')
        elif action=='full_close':
            try: local.shutdown(socket.SHUT_RDWR)
            except OSError: pass
            local.close();send_packet(channel,{'ok':True})
        elif action=='shutdown_read':
            local.shutdown(socket.SHUT_RD);send_packet(channel,{'ok':True})
        elif action=='result':
            drain.set()
            if started and not finished.wait(3): raise RuntimeError('fixture wire result did not finish')
            send_packet(channel,result)
        else: raise RuntimeError('unknown session fixture action')
def publisher_main(channel):
    local=introduce(channel)
    try: serve_management(channel,local,'publisher')
    except BaseException as error:
        try: send_packet(channel,{'fixture_error':repr(error)})
        except OSError: pass
        raise
    finally: local.close();channel.close()
supervisor,control_management=management_pair()
control_pid=os.fork()
if control_pid==0:
    supervisor.close()
    local=introduce(control_management)
    child_pid=None
    try:
        if plan['case']!='session_wrong_parent':
            publisher_supervisor,publisher_management=management_pair()
            child_pid=os.fork()
            if child_pid==0:
                publisher_supervisor.close();local.close();control_management.close()
                try: publisher_main(publisher_management)
                finally: os._exit(0)
            publisher_management.close()
            metadata,fds=receive_packet(publisher_supervisor,2)
            send_packet(control_management,metadata,(*fds,publisher_supervisor.fileno()))
            for fd in fds: os.close(fd)
            publisher_supervisor.close()
        serve_management(control_management,local,'control')
    except BaseException as error:
        try: send_packet(control_management,{'fixture_error':repr(error)})
        except OSError: pass
        raise
    finally:
        if child_pid is not None:
            try: os.kill(child_pid,signal.SIGKILL)
            except ProcessLookupError: pass
            try: os.waitpid(child_pid,0)
            except ChildProcessError: pass
        local.close();control_management.close();os._exit(0)
control_management.close()
control,control_fds=receive_packet(supervisor,2)
unrelated=None
if plan['case']=='session_wrong_parent':
    publisher_supervisor,publisher_management=management_pair()
    unrelated=os.fork()
    if unrelated==0:
        supervisor.close();publisher_supervisor.close()
        for fd in control_fds: os.close(fd)
        try: publisher_main(publisher_management)
        finally: os._exit(0)
    publisher_management.close()
    publisher,publisher_fds=receive_packet(publisher_supervisor,2)
    publisher_management_fd=publisher_supervisor.detach()
else:
    publisher,publisher_fds=receive_packet(supervisor,3)
    publisher_management_fd=publisher_fds.pop()
for metadata,fds,management in [(control,control_fds,supervisor.fileno()),
        (publisher,publisher_fds,publisher_management_fd)]:
    metadata.update({'socket_fd':fds[0],'expected_executable_fd':fds[1],'control_fd':management})
all_fds=control_fds+publisher_fds+[supervisor.fileno(),publisher_management_fd]
child=None
try:
    child=subprocess.Popen([plan['node'],plan['proof'],'--session-child',
        json.dumps({'case':plan['case'],'control':control,'publisher':publisher})],
        stdin=subprocess.DEVNULL,stdout=subprocess.PIPE,stderr=subprocess.PIPE,
        pass_fds=tuple(all_fds),env={'PATH':'/usr/bin:/bin','LANG':'C','LC_ALL':'C'},cwd='/')
    # Only the Node child now owns borrowed service endpoints. Keeping copies in
    # the supervisor would mask EOF and make acknowledgement evidence dishonest.
    for fd in control_fds+publisher_fds+[publisher_management_fd]: os.close(fd)
    supervisor.close()
    stdout,stderr=child.communicate(timeout=14)
    print(json.dumps({'status':child.returncode,'stdout':stdout.decode(),'stderr':stderr.decode()}))
finally:
    if child is not None and child.poll() is None: child.kill();child.wait(timeout=3)
    for pid in [publisher['peer_pid'],control_pid]:
        try: os.kill(pid,signal.SIGKILL)
        except ProcessLookupError: pass
    for pid in [control_pid,unrelated]:
        if pid is not None:
            try: os.waitpid(pid,0)
            except ChildProcessError: pass
`;

// Linker interception is used only in the disposable fault binary. Ordinary
// session cases above exercise the unwrapped send(2) and real socket pressure.
const SESSION_SEND_FAULT_FIXTURE=String.raw`
#define _GNU_SOURCE
#include <errno.h>
#include <stdlib.h>
#include <string.h>
#include <sys/socket.h>

ssize_t __real_send(int fd,const void *buffer,size_t length,int flags);
ssize_t __wrap_send(int fd,const void *buffer,size_t length,int flags) {
  static int sent = 0;
  const char *fault = getenv("APOLLYON_TEST_SESSION_SEND_FAULT");
  if (fault && strcmp(fault,"partial") == 0) {
    if (sent) { errno = EIO; return -1; }
    ssize_t result = __real_send(fd,buffer,length > 11U ? 11U : length,flags);
    if (result > 0) sent = 1;
    return result;
  }
  ssize_t result = __real_send(fd,buffer,length,flags);
  if (result > 0 && fault && strcmp(fault,"after_send_close") == 0) {
    (void)setenv("APOLLYON_TEST_CLOSE_FAULT","1",1);
  }
  return result;
}
`;

// This wrapper is compiled only into a second disposable proof binary.
const CLOSE_FAULT_FIXTURE=String.raw`
#define _GNU_SOURCE
#include <errno.h>
#include <fcntl.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>

int __real_close(int fd);

/* Test-only linker interception. It is never linked into the production addon.
 * Trigger after handle construction, close one real pidfd, recycle its number,
 * and report EIO to exercise Linux close uncertainty without a native API hook. */
int __wrap_close(int fd) {
  static int triggered = 0;
  const char *enabled = getenv("APOLLYON_TEST_CLOSE_FAULT");
  if (!triggered && enabled && strcmp(enabled, "1") == 0) {
    char path[80];
    char target[128];
    int size = snprintf(path, sizeof(path), "/proc/self/fd/%d", fd);
    ssize_t length = size > 0 && size < (int)sizeof(path) ?
      readlink(path, target, sizeof(target) - 1U) : -1;
    if (length >= 0) {
      target[length] = '\0';
      if (strcmp(target, "anon_inode:[pidfd]") == 0) {
        triggered = 1;
        if (__real_close(fd) != 0) return -1;
        int replacement = open("/dev/null", O_RDONLY | O_CLOEXEC);
        char number[32];
        if (replacement != fd) {
          if (replacement >= 0) (void)__real_close(replacement);
          (void)setenv("APOLLYON_TEST_RECYCLED_FD", "mismatch", 1);
        } else {
          (void)snprintf(number, sizeof(number), "%d", replacement);
          (void)setenv("APOLLYON_TEST_RECYCLED_FD", number, 1);
        }
        errno = EIO;
        return -1;
      }
    }
  }
  return __real_close(fd);
}
`;

async function pipeChild(plan){
  if(plan.worker_first){
    const borrowedBefore=fs.fstatSync(3,{bigint:true});
    fs.writeSync(1,"pipe_reader_ready\n");
    const worker=new Worker(`
      const {parentPort,workerData}=require('node:worker_threads');
      const crypto=require('node:crypto');
      const bytes=require(workerData).readInheritedPublisherRequest();
      parentPort.postMessage(crypto.createHash('sha256').update(bytes).digest('hex'));
    `,{eval:true,workerData:path.join(ROOT,ADDON_REL)});
    try{
      let digest;
      const exit=await new Promise((resolve,reject)=>{
        const timer=setTimeout(()=>reject(new Error("fixture_worker_first_timeout")),7000);
        worker.on("message",value=>{digest=value;});
        worker.once("error",error=>{clearTimeout(timer);reject(error);});
        worker.once("exit",code=>{clearTimeout(timer);resolve(code);});
      });
      assert.equal(exit,0);
      assert.equal(digest,plan.expected_sha256);
      // This is the main environment's first addon load, after the first owner
      // environment has exited. An unload/reload must not reset one-shot state.
      const native=nativeModule();
      requireNativeError(expectError(()=>native.readInheritedPublisherRequest(),
        "APOLLYON_NATIVE_PIPE_ALREADY_ATTEMPTED"),"APOLLYON_NATIVE_PIPE_ALREADY_ATTEMPTED");
      const borrowedAfter=fs.fstatSync(3,{bigint:true});
      assert.equal(borrowedAfter.dev,borrowedBefore.dev);
      assert.equal(borrowedAfter.ino,borrowedBefore.ino);
      fs.writeSync(1,JSON.stringify({ok:true,uid,gid,worker_first_unload_once:true})+"\n");
    }finally{await worker.terminate();}
    return;
  }
  const native=nativeModule();
  const bridge=await bridgeModule();
  const borrowedBefore=fs.fstatSync(3,{bigint:true});
  const before=descriptorSet();
  let result;
  let failure;
  if(plan.reject_arguments){
    expectError(()=>bridge.readApollyonDurableAttemptClaimPublisherForwardFromInheritedPipeV2({}),
      "apollyon_claim_store_bridge_v2_pipe_arguments_invalid");
  }
  fs.writeSync(1,"pipe_reader_ready\n");
  const started=performance.now();
  try{
    if(plan.native_only){
      result=native.readInheritedPublisherRequest();
      assert.equal(Buffer.isBuffer(result),true);
      assert.equal(result.length,plan.expected_length);
      assert.equal(sha256(result),plan.expected_sha256);
    }else{
      result=bridge.readApollyonDurableAttemptClaimPublisherForwardFromInheritedPipeV2();
      assert.equal(result.publish_request_sha256,plan.expected_sha256);
      const first=result.exact_request_bytes;
      assert.equal(sha256(first),plan.expected_sha256);
      first.fill(0x21);
      assert.equal(sha256(result.exact_request_bytes),plan.expected_sha256,
        "forward access returns a copy of the exact native-read frame");
    }
  }catch(error){failure=error;}
  const elapsed=performance.now()-started;
  if(plan.expected_error){
    assert.notEqual(failure,undefined,"negative pipe case reaches a bounded rejection");
    if(plan.expected_error!=="request_rejected")requireNativeError(failure,plan.expected_error);
  }else if(failure){throw failure;}
  const borrowedAfter=fs.fstatSync(3,{bigint:true});
  assert.equal(borrowedAfter.dev,borrowedBefore.dev);
  assert.equal(borrowedAfter.ino,borrowedBefore.ino,"the caller's inherited descriptor remains open");
  assert.deepEqual(descriptorSet(),before,"every private pipe descriptor is closed on success or failure");
  const second=expectError(()=>native.readInheritedPublisherRequest(),"APOLLYON_NATIVE_PIPE_ALREADY_ATTEMPTED");
  requireNativeError(second,"APOLLYON_NATIVE_PIPE_ALREADY_ATTEMPTED");
  if(plan.expected_error==="APOLLYON_NATIVE_PIPE_TIMEOUT"){
    assert.ok(elapsed>=4500&&elapsed<7500,"missing EOF uses one bounded total deadline");
  }
  if(plan.worker_once){
    const worker=new Worker(`
      const {parentPort,workerData}=require('node:worker_threads');
      try{require(workerData).readInheritedPublisherRequest();parentPort.postMessage('unexpected_success');}
      catch(error){parentPort.postMessage(error.code);}
    `,{eval:true,workerData:path.join(ROOT,ADDON_REL)});
    try{
      const message=await new Promise((resolve,reject)=>{
        const timer=setTimeout(()=>reject(new Error("fixture_worker_once_timeout")),5000);
        worker.once("message",value=>{clearTimeout(timer);resolve(value);});
        worker.once("error",error=>{clearTimeout(timer);reject(error);});
      });
      assert.equal(message,"APOLLYON_NATIVE_PIPE_ALREADY_ATTEMPTED",
        "a second Node worker cannot reset the process-wide inherited-frame read");
    }finally{await worker.terminate();}
  }
  fs.writeSync(1,JSON.stringify({ok:true,uid,gid,elapsed_ms:elapsed,
    error:failure?.code??null,borrowed_descriptor_preserved:true,private_descriptors_closed:true})+"\n");
}

function peerConfig(plan){
  return {
    socket_fd:plan.socket_fd,
    expected_ppid:plan.expected_ppid,
    expected_uid:plan.expected_uid,
    expected_gid:plan.expected_gid,
    expected_supplementary_gids:[...plan.expected_supplementary_gids],
    expected_executable_fd:plan.expected_executable_fd,
    expected_cmdline_bytes:Buffer.from(plan.expected_cmdline_base64,"base64"),
  };
}
function nativeOpen(native,peer){
  return native.openPeerIdentity(peer.socket_fd,peer.expected_ppid,peer.expected_uid,
    peer.expected_gid,peer.expected_supplementary_gids,peer.expected_executable_fd,
    peer.expected_cmdline_bytes);
}
function adapterConfig(f,peer,revalidate=(stage,context)=>revalidationReceipt(stage,context)){
  return {root_fd:f.rootFd,claim_uid:uid,claim_gid:gid,session_binding_id:SESSION_ID,revalidate,
    peer_identity:peer};
}
function transitionPeer(plan,command){
  const originalExe=fs.readlinkSync("/proc/"+plan.peer_pid+"/exe");
  // This write targets the proof's private control socket, never the claim store.
  WRITE_PROOF_CONTROL(plan.control_fd,command);
  const deadline=performance.now()+3000;
  while(performance.now()<deadline){
    try{
      if(command==="exec"){
        if(fs.readlinkSync("/proc/"+plan.peer_pid+"/exe")!==originalExe)return;
      }else{
        const fd=fs.openSync("/proc/"+plan.peer_pid+"/stat",fs.constants.O_RDONLY);
        let stat;
        try{stat=fs.readFileSync(fd,"utf8");}
        finally{fs.closeSync(fd);}
        if(stat.slice(stat.lastIndexOf(")")+2).startsWith("Z "))return;
      }
    }catch(error){if(error.code==="ENOENT"||error.code==="ESRCH")return;throw error;}
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,5);
  }
  assert.fail("fixture peer did not complete its "+command+" transition");
}
function replaceBorrowed(fd,decoy){
  fs.closeSync(fd);
  const replacement=fs.openSync(decoy,fs.constants.O_RDONLY);
  assert.equal(replacement,fd,"the borrowed descriptor number is actually reused");
}
function commandPeerSocket(plan,command){
  WRITE_PROOF_CONTROL(plan.control_fd,command);
  const acknowledgement=Buffer.alloc(2);
  const count=fs.readSync(plan.control_fd,acknowledgement,0,2,null);
  assert.equal(count,2);
  assert.equal(acknowledgement.toString("ascii"),"ok");
}

async function nativePeerCases(plan,native){
  const peer=peerConfig(plan);
  const baseline=descriptorSet();
  if(plan.case==="native_valid"){
    commandPeerSocket(plan,"half_close");
    const handle=nativeOpen(native,peer);
    assert.equal(typeof handle,"object");
    assert.deepEqual(Object.keys(handle),[],"the native peer handle exposes no file descriptors");
    assert.equal(descriptorSet().length,baseline.length+3,"pidfd, executable, and socket remain privately owned");
    const retained=descriptorSet();
    assert.equal(native.revalidatePeerIdentity(handle),undefined);
    assert.deepEqual(descriptorSet(),retained,"revalidation does not leak a replacement observation pidfd");
    peer.expected_cmdline_bytes.fill(0x3f);
    peer.expected_supplementary_gids.push(65533);
    replaceBorrowed(plan.socket_fd,"/dev/null");
    replaceBorrowed(plan.expected_executable_fd,"/dev/zero");
    assert.equal(native.revalidatePeerIdentity(handle),undefined,
      "retained socket, executable and expected bytes survive borrowed descriptor and input reuse");
    assert.equal(native.closePeerIdentity(handle),undefined);
    assert.deepEqual(descriptorSet(),baseline);
    assert.equal(native.closePeerIdentity(handle),undefined,"native close is idempotent after clean release");
    requireNativeError(expectError(()=>native.revalidatePeerIdentity(handle),"APOLLYON_NATIVE_PEER_CLOSED"),
      "APOLLYON_NATIVE_PEER_CLOSED");
    for(const forged of [{},null,Object.freeze({}),new Proxy({}, {})]){
      requireNativeError(expectError(()=>native.revalidatePeerIdentity(forged),"APOLLYON_NATIVE_INVALID_ARGUMENT"),
        "APOLLYON_NATIVE_INVALID_ARGUMENT");
      requireNativeError(expectError(()=>native.closePeerIdentity(forged),"APOLLYON_NATIVE_INVALID_ARGUMENT"),
        "APOLLYON_NATIVE_INVALID_ARGUMENT");
    }
    assert.deepEqual(descriptorSet(),baseline);
  }else if(plan.case==="native_wrong_identity"){
    const otherExecutable=fs.openSync("/bin/sleep",fs.constants.O_RDONLY);
    const withDecoy=descriptorSet();
    try{
      const changedCmdline=Buffer.from(peer.expected_cmdline_bytes);
      changedCmdline[0]^=1;
      const wrong=[
        {...peer,expected_ppid:peer.expected_ppid+1},
        {...peer,expected_uid:peer.expected_uid===65533?65532:peer.expected_uid+1},
        {...peer,expected_gid:peer.expected_gid===65533?65532:peer.expected_gid+1},
        {...peer,expected_supplementary_gids:[65533]},
        {...peer,expected_executable_fd:otherExecutable},
        {...peer,expected_cmdline_bytes:changedCmdline},
        {...peer,socket_fd:otherExecutable},
      ];
      for(const expected of wrong){
        const error=expectError(()=>nativeOpen(native,expected));
        assert.ok(["APOLLYON_NATIVE_PEER_DESCRIPTOR","APOLLYON_NATIVE_PEER_IDENTITY"].includes(error.code));
        requireNativeError(error,error.code);
        assert.deepEqual(descriptorSet(),withDecoy,"rejected identity closes every partially acquired descriptor");
      }
      requireNativeError(expectError(()=>nativeOpen(native,{...peer,
        expected_cmdline_bytes:Buffer.from(new SharedArrayBuffer(peer.expected_cmdline_bytes.length)),
      }),"APOLLYON_NATIVE_INVALID_ARGUMENT"),"APOLLYON_NATIVE_INVALID_ARGUMENT");
      assert.deepEqual(descriptorSet(),withDecoy,"native shared-memory rejection occurs without descriptor acquisition");
    }finally{fs.closeSync(otherExecutable);}
    assert.deepEqual(descriptorSet(),baseline);
  }else{
    const handle=nativeOpen(native,peer);
    if(plan.case==="native_full_close"){
      commandPeerSocket(plan,"full_close");
      assert.equal(fs.existsSync("/proc/"+plan.peer_pid+"/exe"),true,
        "full connection closure is rejected even while the peer process is alive");
    }else transitionPeer(plan,plan.case==="native_exec"?"exec":"exit");
    const error=expectError(()=>native.revalidatePeerIdentity(handle));
    assert.ok(["APOLLYON_NATIVE_PEER_EXITED","APOLLYON_NATIVE_PEER_IDENTITY",
      "APOLLYON_NATIVE_PEER_TRANSPORT"].includes(error.code),error.code);
    requireNativeError(error,error.code);
    assert.deepEqual(descriptorSet(),baseline,"identity failure automatically closes the retained native session");
    native.closePeerIdentity(handle);
    requireNativeError(expectError(()=>native.revalidatePeerIdentity(handle),"APOLLYON_NATIVE_PEER_CLOSED"),
      "APOLLYON_NATIVE_PEER_CLOSED");
  }
}

function nativeCloseFaultCase(plan,native){
  const peer=peerConfig(plan);
  const baseline=descriptorSet();
  const handle=nativeOpen(native,peer);
  let replacement;
  try{
    if(plan.case==="native_fault_primary")commandPeerSocket(plan,"full_close");
    process.env.APOLLYON_TEST_CLOSE_FAULT="1";
    const error=expectError(()=>plan.case==="native_fault_explicit"
      ?native.closePeerIdentity(handle):native.revalidatePeerIdentity(handle));
    const expectedPrimary=plan.case==="native_fault_primary"
      ?"APOLLYON_NATIVE_PEER_TRANSPORT":"APOLLYON_NATIVE_CLOSE_FAILED";
    requireNativeError(error,expectedPrimary);
    assert.deepEqual(error.cleanup_errors,[{
      resource:plan.case==="native_fault_temporary"?"temporary_pidfd":"peer_pidfd",
      code:"APOLLYON_NATIVE_CLOSE_FAILED",errno:os.constants.errno.EIO,
    }]);
    const text=process.env.APOLLYON_TEST_RECYCLED_FD;
    assert.match(text??"",/^[0-9]+$/u,"the wrapper closed and actually recycled the same descriptor number");
    replacement=Number(text);
    assert.equal(fs.readlinkSync("/proc/self/fd/"+replacement),"/dev/null");
    assert.equal(descriptorSet().length,baseline.length+1,
      "other private descriptors were cleaned; only the independently recycled descriptor remains");
    for(let attempt=0;attempt<2;attempt+=1){
      if(plan.case==="native_fault_temporary"){
        assert.equal(native.closePeerIdentity(handle),undefined);
      }else{
        requireNativeError(expectError(()=>native.closePeerIdentity(handle),"APOLLYON_NATIVE_CLOSE_FAILED"),
          "APOLLYON_NATIVE_CLOSE_FAILED");
      }
      requireNativeError(expectError(()=>native.revalidatePeerIdentity(handle),"APOLLYON_NATIVE_PEER_CLOSED"),
        "APOLLYON_NATIVE_PEER_CLOSED");
      assert.equal(fs.readlinkSync("/proc/self/fd/"+replacement),"/dev/null",
        "later close and revalidation calls never retry the recycled descriptor number");
    }
  }finally{
    delete process.env.APOLLYON_TEST_CLOSE_FAULT;
    delete process.env.APOLLYON_TEST_RECYCLED_FD;
    if(replacement!==undefined)fs.closeSync(replacement);
  }
  assert.deepEqual(descriptorSet(),baseline);
}

async function adapterCases(plan,bridge){
  const f=fixture();
  const peer=peerConfig(plan);
  const bundle=requestBundle(claimRecord(f.generation));
  const input=publishInput(bundle,f.generation);
  const observation=observationInput(bundle,f.generation);
  const beforeDescriptors=descriptorSet();
  const create=bridge.createApollyonDurableAttemptClaimStoreServiceWithNativePeerV2;
  let core;
  let closed=false;
  try{
    if(plan.case==="adapter_config"){
      const cfg=adapterConfig(f,peer);
      let getters=0;
      let traps=0;
      const accessor={...cfg};
      Object.defineProperty(accessor,"peer_identity",{enumerable:true,get(){getters+=1;return peer;}});
      const peerAccessor={...peer};
      Object.defineProperty(peerAccessor,"socket_fd",{enumerable:true,get(){getters+=1;return plan.socket_fd;}});
      const groups=[1];
      Object.defineProperty(groups,"0",{enumerable:true,get(){getters+=1;return 1;}});
      const proxy=new Proxy(peer,{get(){traps+=1;assert.fail();},ownKeys(){traps+=1;assert.fail();}});
      const revoked=Proxy.revocable(peer,{});revoked.revoke();
      const shared=Buffer.from(new SharedArrayBuffer(peer.expected_cmdline_bytes.length));
      const invalid=[accessor,{...cfg,peer_identity:peerAccessor},{...cfg,extra:true},
        {...cfg,peer_identity:proxy},{...cfg,peer_identity:revoked.proxy},
        {...cfg,peer_identity:{...peer,expected_supplementary_gids:groups}},
        {...cfg,peer_identity:{...peer,expected_cmdline_bytes:shared}},
        {...cfg,peer_identity:{...peer,expected_cmdline_bytes:Buffer.from("missing NUL")}},
        {...cfg,revalidate:async()=>({})},{...cfg,revalidate:function*(){yield {};}}];
      for(const candidate of invalid){
        const error=expectError(()=>create(candidate));
        assert.ok(error.message.startsWith("apollyon_claim_store_bridge_v2_"));
        assert.deepEqual(descriptorSet(),beforeDescriptors,
          "invalid adapter input acquires no retained native descriptor");
      }
      assert.equal(getters,0);
      assert.equal(traps,0);
      assert.deepEqual(fs.readdirSync(path.join(f.root,
        VOID_APOLLYON_CLAIM_STORE_LAYOUT_V2.authorization_slot_directory)),[]);
      closed=true;
      return;
    }

    let callbackCount=0;
    let installedThen=false;
    let thenGetterCalls=0;
    let nestedGetterCalls=0;
    const originalThen=Object.getOwnPropertyDescriptor(Object.prototype,"then");
    let cmdlineGetterCalls=0;
    if(plan.case==="adapter_valid"){
      commandPeerSocket(plan,"half_close");
      Object.defineProperty(peer.expected_cmdline_bytes,"byteLength",{
        configurable:true,get(){cmdlineGetterCalls+=1;assert.fail("caller Buffer byteLength getter invoked");},
      });
    }
    const callback=(stage,context)=>{
      callbackCount+=1;
      if(plan.case==="adapter_valid"){
        expectError(()=>core.close(),"apollyon_claim_store_bridge_v2_reentry");
        expectError(()=>core.observeAuthorizationWinner(observation),"apollyon_claim_store_bridge_v2_reentry");
      }
      const stageToExit=plan.case==="adapter_before_slot"?"before_slot_publication":
        plan.case==="adapter_after_slot"?"after_slot_before_claim":
          plan.case==="adapter_before_ack"?"before_success_ack":null;
      if(stage===stageToExit)transitionPeer(plan,"exit");
      const receipt=revalidationReceipt(stage,context);
      if(plan.case==="adapter_receipt_prototype"&&!installedThen){
        installedThen=true;
        Object.defineProperty(Object.prototype,"then",{configurable:true,get(){
          thenGetterCalls+=1;
          fs.chmodSync(f.root,0o755);
          throw new Error("fixture_receipt_prototype_getter_was_executed");
        }});
      }
      if(plan.case==="adapter_receipt_nested"){
        receipt.authorization_slot_id={get unexpected(){
          nestedGetterCalls+=1;fs.chmodSync(f.root,0o755);return "caller";
        }};
      }
      return receipt;
    };
    try{
      core=create(adapterConfig(f,peer,callback));
      assert.equal(Object.isFrozen(core),true);
      assert.equal(core.native_peer_runtime_integration_present,true);
      requireSourceOnly(core);
      assert.equal(descriptorSet().length,beforeDescriptors.length+3);

      if(plan.case==="adapter_valid"||plan.case==="adapter_receipt_prototype"){
        if(plan.case==="adapter_valid"){
          assert.equal(cmdlineGetterCalls,0);
          delete peer.expected_cmdline_bytes.byteLength;
          peer.expected_cmdline_bytes.fill(0x7f);
        }
        const published=core.publishClaim(input);
        assert.equal(published.status,"store_core_transaction_complete_source_only");
        assert.equal(published.success_response.durability_proven,true);
        assert.equal(published.production_claim_store_mutation_performed,false);
        assert.equal(published.production_durable_attempt_claim_performed,false);
        assert.equal(callbackCount,3);
        if(installedThen){
          if(originalThen)Object.defineProperty(Object.prototype,"then",originalThen);
          else delete Object.prototype.then;
          installedThen=false;
        }
        assert.equal(thenGetterCalls,0,"receipt prototype getters cannot run after native revalidation");
        const storeBefore=storeSnapshot(f.root);
        const held=descriptorSet();
        const observed=withReadOnlyFs(()=>core.observeAuthorizationWinner(observation));
        assert.equal(observed.status,"authorization_winner_observed_source_only");
        assert.equal(observed.protected_store_origin_proven,false);
        assert.equal(observed.activation_capability_issuance_authorized,false);
        assert.equal(callbackCount,3,"observation does not call the local publisher revalidator");
        assert.deepEqual(storeSnapshot(f.root),storeBefore);
        assert.deepEqual(descriptorSet(),held,
          "the same three native descriptors survive successful publish and observe");
        core.close();closed=true;
        requireClosed(core,input,observation);
        assert.deepEqual(descriptorSet(),beforeDescriptors);
        return;
      }

      const before=storeSnapshot(f.root);
      if(plan.case==="adapter_peer_before")transitionPeer(plan,"exit");
      if(plan.case==="adapter_core_failure"){
        const invalid={...input,request_bytes:Buffer.from("{}\n")};
        const error=expectError(()=>core.publishClaim(invalid),"apollyon_claim_store_bridge_v2_operation_failed");
        assert.equal(error.cleanup_errors.length,0);
        closed=true;
        assert.deepEqual(storeSnapshot(f.root),before);
      }else if(plan.case==="adapter_cleanup_publish"||plan.case==="adapter_cleanup_observe"){
        if(plan.case==="adapter_cleanup_observe")core.publishClaim(input);
        const readonlyBefore=storeSnapshot(f.root);
        const originalOpen=fs.openSync;
        const originalClose=fs.closeSync;
        const rootDescriptors=[];
        let injected=false;
        fs.openSync=function observedOpen(file,flags,...args){
          const fd=originalOpen(file,flags,...args);
          if(String(file)==="/proc/self/fd/"+f.rootFd&&(flags&O_DIRECTORY)!==0)rootDescriptors.push(fd);
          return fd;
        };
        fs.closeSync=function observedClose(fd){
          const result=originalClose(fd);
          if(!injected&&rootDescriptors.length===2&&fd===rootDescriptors[1]){
            injected=true;
            transitionPeer(plan,"exit");
          }
          return result;
        };
        try{
          const error=expectError(()=>plan.case==="adapter_cleanup_observe"
            ?withReadOnlyFs(()=>core.observeAuthorizationWinner(observation)):core.publishClaim(input),
          "apollyon_claim_store_bridge_v2_operation_failed");
          assert.equal(error.core_store_mutation_may_have_occurred,plan.case==="adapter_cleanup_publish");
          assert.equal(injected,true,"peer exit happens after core-root close and before native post-check");
          closed=true;
        }finally{fs.openSync=originalOpen;fs.closeSync=originalClose;}
        if(plan.case==="adapter_cleanup_observe")assert.deepEqual(storeSnapshot(f.root),readonlyBefore);
        const files=recordPaths(f,bundle);
        assert.equal(fs.existsSync(files.slot),true);
        assert.equal(fs.existsSync(files.claim),true);
      }else{
        const error=expectError(()=>core.publishClaim(input),"apollyon_claim_store_bridge_v2_operation_failed");
        closed=true;
        if(plan.case==="adapter_receipt_nested"){
          assert.ok(errorMessages(error).some(message=>
            message.includes("apollyon_claim_store_bridge_v2_revalidation_receipt_invalid")));
          assert.equal(nestedGetterCalls,0,"nested accessor receipt data is rejected without evaluation");
        }else if(plan.case==="adapter_peer_before"){
          assert.ok(errorMessages(error).some(message=>message.startsWith("APOLLYON_NATIVE_")));
        }else{
          assert.ok(errorMessages(error).some(message=>
            message.includes("apollyon_claim_store_impl_v2_revalidation_failed:")),
          "the core preserves its accepted stage failure shape around native callback rejection");
        }
        const files=recordPaths(f,bundle);
        const slotExpected=plan.case==="adapter_after_slot"||plan.case==="adapter_before_ack";
        const claimExpected=plan.case==="adapter_before_ack";
        assert.equal(fs.existsSync(files.slot),slotExpected);
        assert.equal(fs.existsSync(files.claim),claimExpected);
        if(!slotExpected)assert.deepEqual(storeSnapshot(f.root),before);
        if(plan.case==="adapter_peer_before")assert.equal(error.core_store_mutation_may_have_occurred,false);
      }
      requireClosed(core,input,observation);
      assert.deepEqual(descriptorSet(),beforeDescriptors,
        "operation failure closes native identity resources as well as core and lock descriptors");
    }finally{
      if(installedThen){
        if(originalThen)Object.defineProperty(Object.prototype,"then",originalThen);
        else delete Object.prototype.then;
      }
    }
  }finally{
    if(core&&!closed)core.close();
    f.cleanup();
  }
}

async function peerChild(plan){
  const native=nativeModule();
  if(plan.case.startsWith("native_fault_"))nativeCloseFaultCase(plan,native);
  else if(plan.case.startsWith("native_"))await nativePeerCases(plan,native);
  else await adapterCases(plan,await bridgeModule());
  fs.writeSync(1,JSON.stringify({ok:true,case:plan.case,uid,gid})+"\n");
}

function sessionCommand(peer,value,reply=true){
  const body=Buffer.from(JSON.stringify(value),"utf8");
  assert.equal(WRITE_PROOF_CONTROL(peer.control_fd,body),body.length);
  if(!reply)return;
  const response=Buffer.alloc(262144);
  const count=fs.readSync(peer.control_fd,response,0,response.length,null);
  assert.ok(count>0,"session fixture management channel remains live: "+peer.fixture_case);
  const replyValue=JSON.parse(response.subarray(0,count).toString("utf8"));
  if(replyValue.fixture_error)assert.fail("session fixture "+peer.fixture_case+": "+replyValue.fixture_error);
  return replyValue;
}
function sessionTransition(peer,command){
  const originalExe=fs.readlinkSync("/proc/"+peer.peer_pid+"/exe");
  sessionCommand(peer,{action:command},false);
  const deadline=performance.now()+3000;
  while(performance.now()<deadline){
    try{
      if(command==="exec"){
        if(fs.readlinkSync("/proc/"+peer.peer_pid+"/exe")!==originalExe)return;
      }else{
        const stat=fs.readFileSync("/proc/"+peer.peer_pid+"/stat","utf8");
        if(stat.slice(stat.lastIndexOf(")")+2).startsWith("Z "))return;
      }
    }catch(error){if(error.code==="ENOENT"||error.code==="ESRCH")return;throw error;}
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,5);
  }
  assert.fail("session fixture peer did not complete "+command);
}
function startSessionWire(plan,body,digest=sha256(body)){
  assert.equal(sessionCommand(plan.control,{action:"start",digest}).ok,true);
  assert.equal(sessionCommand(plan.publisher,{action:"start",body:body.toString("base64")}).ok,true);
}
function finishSessionWire(plan,dead=new Set()){
  for(const peer of [plan.control,plan.publisher]){
    fs.closeSync(peer.socket_fd);
    fs.closeSync(peer.expected_executable_fd);
  }
  const results={};
  for(const role of ["control","publisher"]){
    if(dead.has(role))continue;
    results[role]=sessionCommand(plan[role],{action:"result"});
    results[role].received=Buffer.from(results[role].received_base64,"base64");
  }
  if(results.control)assert.equal(results.control.received.length,0,
    "the control connection never receives the publisher success response");
  return results;
}
function nativeSessionPair(native,plan){
  const control=nativeOpen(native,peerConfig(plan.control));
  let publisher;
  try{publisher=nativeOpen(native,peerConfig(plan.publisher));}
  catch(error){native.closePeerIdentity(control);throw error;}
  return {control,publisher};
}
function closeNativePair(native,pair){
  let first;
  for(const handle of [pair.control,pair.publisher]){
    try{native.closePeerIdentity(handle);}catch(error){first??=error;}
  }
  if(first)throw first;
}
function requireSessionClosed(session,input){
  expectError(()=>session.servePublisherRequest(input),"apollyon_claim_store_session_v2_session_closed");
  expectError(()=>session.close(),"apollyon_claim_store_session_v2_session_closed");
}
function assertDurableWinner(f,bundle){
  const before=storeSnapshot(f.root);
  const reader=createApollyonDurableAttemptClaimStoreServiceWithLinuxTransactionV2({
    root_fd:f.rootFd,claim_uid:uid,claim_gid:gid,session_binding_id:SESSION_ID,
    revalidate:(stage,context)=>revalidationReceipt(stage,context),
  });
  const winner=withReadOnlyFs(()=>reader.observeAuthorizationWinner(observationInput(bundle,f.generation)));
  assert.equal(winner.status,"authorization_winner_observed_source_only");
  assert.equal(winner.activation_capability_issuance_authorized,false);
  assert.deepEqual(storeSnapshot(f.root),before,"late session failure preserves an observable durable winner");
}

async function nativeSessionCases(plan,native){
  const baseline=descriptorSet();
  const pair=nativeSessionPair(native,plan);
  assert.equal(descriptorSet().length,baseline.length+6);
  let wire;
  try{
    assert.equal(native.revalidatePeerPair(pair.control,pair.publisher),undefined);
    if(plan.case==="native_session_pair_rules"){
      requireNativeError(expectError(()=>native.revalidatePeerPair(pair.control,pair.control),
        "APOLLYON_NATIVE_PAIR_IDENTITY"),"APOLLYON_NATIVE_PAIR_IDENTITY");
      closeNativePair(native,pair);
      assert.deepEqual(descriptorSet(),baseline);
      const swapped=nativeSessionPair(native,plan);
      requireNativeError(expectError(()=>native.revalidatePeerPair(swapped.publisher,swapped.control),
        "APOLLYON_NATIVE_PAIR_IDENTITY"),"APOLLYON_NATIVE_PAIR_IDENTITY");
      closeNativePair(native,swapped);
      const reused=nativeSessionPair(native,plan);
      requireNativeError(expectError(()=>native.sendPublisherPeerResponse(reused.control,reused.publisher,
        Buffer.from("premature\n")),"APOLLYON_NATIVE_PAIR_STATE"),"APOLLYON_NATIVE_PAIR_STATE");
      expectError(()=>native.readPublisherPeerRequest(reused.control,reused.publisher));
      expectError(()=>native.exchangePeerChallenge(reused.control,reused.publisher,Buffer.alloc(32)));
      closeNativePair(native,reused);
    }else{
      const request=plan.case==="native_session_response_large"
        ?Buffer.alloc(65536,0x71):Buffer.from("native exact request fixture\n");
      startSessionWire(plan,request);
      const observed=native.readPublisherPeerRequest(pair.control,pair.publisher);
      assert.deepEqual(observed,request);
      if(plan.case==="native_session_repair"){
        const replacement=nativeOpen(native,peerConfig(plan.publisher));
        try{
          requireNativeError(expectError(()=>native.exchangePeerChallenge(pair.control,replacement,
            Buffer.from(sha256(request),"hex")),"APOLLYON_NATIVE_PAIR_STATE"),"APOLLYON_NATIVE_PAIR_STATE");
        }finally{native.closePeerIdentity(replacement);}
        closeNativePair(native,pair);
        assert.deepEqual(descriptorSet(),baseline);
        wire=finishSessionWire(plan);
        assert.equal(wire.publisher.received.length,0);
        return;
      }
      assert.equal(native.exchangePeerChallenge(pair.control,pair.publisher,
        Buffer.from(sha256(request),"hex")),undefined);
      const response=Buffer.alloc(65536,0x5a);
      const started=performance.now();
      if(plan.case==="native_session_response_timeout"){
        const error=expectError(()=>native.sendPublisherPeerResponse(pair.control,pair.publisher,response),
          "APOLLYON_NATIVE_RESPONSE_TIMEOUT");
        requireNativeError(error,"APOLLYON_NATIVE_RESPONSE_TIMEOUT");
        const elapsed=performance.now()-started;
        assert.ok(elapsed>=4500&&elapsed<7500,"response backpressure obeys one bounded total deadline");
      }else{
        assert.equal(native.sendPublisherPeerResponse(pair.control,pair.publisher,response),undefined);
        // A second send cannot duplicate an acknowledgement on the same pair.
        expectError(()=>native.sendPublisherPeerResponse(pair.control,pair.publisher,response));
      }
      closeNativePair(native,pair);
      assert.deepEqual(descriptorSet(),baseline);
      wire=finishSessionWire(plan);
      if(plan.case==="native_session_response_timeout"){
        assert.ok(wire.publisher.received.length>0&&wire.publisher.received.length<response.length,
          "actual socket pressure permits a partial prefix without claiming complete delivery");
        assert.deepEqual(wire.publisher.received,response.subarray(0,wire.publisher.received.length));
      }else{
        assert.deepEqual(wire.publisher.received,response);
        assert.equal(wire.publisher.eof,true,"successful native send explicitly terminates its write half");
      }
    }
  }finally{closeNativePair(native,pair);}
  if(!wire){
    assert.deepEqual(descriptorSet(),baseline);
    finishSessionWire(plan);
  }
}

async function sessionAdapterCases(plan,bridge){
  const f=fixture();
  const bundle=requestBundle(claimRecord(f.generation));
  const input={expected_store_generation_record:structuredClone(f.generation)};
  const baseline=descriptorSet();
  const before=storeSnapshot(f.root);
  const create=bridge.createApollyonDurableAttemptClaimStoreServiceWithNativeSessionV2;
  const peers={control_peer_identity:peerConfig(plan.control),publisher_peer_identity:peerConfig(plan.publisher)};
  const cfg={root_fd:f.rootFd,claim_uid:uid,claim_gid:gid,session_binding_id:SESSION_ID,
    revalidate:(stage,context)=>revalidationReceipt(stage,context),...peers};
  let session;
  let closed=false;
  const dead=new Set();
  let result;
  let failure;
  let callbacks=0;
  let getters=0;
  let installedToJson=false;
  const originalToJson=Object.getOwnPropertyDescriptor(Object.prototype,"toJSON");
  let cleanupInjected=false;
  let recycled;
  try{
    if(plan.case==="session_config"){
      const accessor={...cfg};
      Object.defineProperty(accessor,"control_peer_identity",{enumerable:true,get(){getters+=1;return peers.control_peer_identity;}});
      const peerAccessor={...peers.publisher_peer_identity};
      Object.defineProperty(peerAccessor,"socket_fd",{enumerable:true,get(){getters+=1;return plan.publisher.socket_fd;}});
      const bad=[accessor,{...cfg,publisher_peer_identity:peerAccessor},{...cfg,peer_identity:peers.control_peer_identity},
        {...cfg,revalidate:async()=>({})},{...cfg,revalidate:function*(){yield {};}},
        {...cfg,publisher_peer_identity:new Proxy(peers.publisher_peer_identity,{get(){getters+=1;assert.fail();}})}];
      for(const candidate of bad){
        expectError(()=>create(candidate));
        assert.deepEqual(descriptorSet(),baseline);
      }
      assert.equal(getters,0);
      session=create(cfg);
      const operationAccessor={};
      Object.defineProperty(operationAccessor,"expected_store_generation_record",{
        enumerable:true,get(){getters+=1;return f.generation;},
      });
      expectError(()=>session.servePublisherRequest(operationAccessor),
        "apollyon_claim_store_session_v2_operation_input_invalid");
      closed=true;
      assert.equal(getters,0);
      requireSessionClosed(session,input);
      assert.deepEqual(descriptorSet(),baseline);
      assert.deepEqual(storeSnapshot(f.root),before);
      finishSessionWire(plan);
      return;
    }
    if(plan.case==="session_role_swap"){
      [cfg.control_peer_identity,cfg.publisher_peer_identity]=[cfg.publisher_peer_identity,cfg.control_peer_identity];
    }
    if(plan.case==="session_duplicate_peer")cfg.publisher_peer_identity={...cfg.control_peer_identity};
    const invalidPair=["session_wrong_parent","session_role_swap","session_duplicate_peer",
      "session_missing_inline","session_nondefault_peek"].includes(plan.case);
    if(invalidPair){
      const error=expectError(()=>create(cfg),"apollyon_claim_store_session_v2_initialization_failed");
      assert.ok(errorMessages(error).includes(["session_missing_inline","session_nondefault_peek"].includes(plan.case)
        ?"APOLLYON_NATIVE_PAIR_SOCKET_OPTIONS":"APOLLYON_NATIVE_PAIR_IDENTITY"));
      assert.deepEqual(descriptorSet(),baseline,"both native peers close after pair admission failure");
      assert.deepEqual(storeSnapshot(f.root),before);
      finishSessionWire(plan);
      closed=true;
      return;
    }
    cfg.revalidate=(stage,context)=>{
      callbacks+=1;
      if(plan.case==="session_valid"){
        expectError(()=>session.close(),"apollyon_claim_store_session_v2_reentry");
        expectError(()=>session.servePublisherRequest(input),"apollyon_claim_store_session_v2_reentry");
        assert.equal(context.publish_request_sha256,bundle.publishRequestSha);
      }
      if(plan.case==="session_generation_alias"){
        input.expected_store_generation_record.store_generation_id="apollyon_claim_store_generation_v2:"+"f".repeat(64);
      }
      if(plan.case==="session_control_before_slot"&&stage==="before_slot_publication"){
        sessionTransition(plan.control,"exit");dead.add("control");
      }
      if(plan.case==="session_publisher_after_slot"&&stage==="after_slot_before_claim"){
        sessionTransition(plan.publisher,"exec");dead.add("publisher");
      }
      if(plan.case==="session_control_before_ack"&&stage==="before_success_ack"){
        sessionTransition(plan.control,"exec");dead.add("control");
      }
      if(plan.case==="session_callback_tojson"&&stage==="before_success_ack"){
        installedToJson=true;
        Object.defineProperty(Object.prototype,"toJSON",{configurable:true,get(){
          getters+=1;throw new Error("fixture_toJSON_getter_was_executed");
        }});
      }
      if(stage==="before_success_ack"&&plan.case==="session_ack_partial"){
        process.env.APOLLYON_TEST_SESSION_SEND_FAULT="partial";
      }
      if(stage==="before_success_ack"&&plan.case==="session_ack_after_send_close"){
        process.env.APOLLYON_TEST_SESSION_SEND_FAULT="after_send_close";
      }
      const receipt=revalidationReceipt(stage,context);
      if(plan.case==="session_callback_async")return Promise.reject(new Error("fixture_async_local_receipt"));
      return receipt;
    };
    if(plan.case==="session_valid")for(const peer of Object.values(peers)){
      Object.defineProperty(peer.expected_cmdline_bytes,"byteLength",{
        configurable:true,get(){getters+=1;assert.fail("session cmdline getter invoked");},
      });
    }
    session=create(cfg);
    assert.equal(Object.isFrozen(session),true);
    assert.equal(session.publishClaim,undefined);
    assert.equal(session.observeAuthorizationWinner,undefined);
    assert.equal(session.challenge_exchange_implementation_present,true);
    assert.equal(session.protected_expected_identity_origin_proven,false);
    assert.equal(session.privileged_peer_role_admission_performed,false);
    assert.equal(descriptorSet().length,baseline.length+6,"both original peer handles remain retained");
    if(plan.case==="session_valid")for(const peer of Object.values(peers)){
      assert.equal(getters,0);
      delete peer.expected_cmdline_bytes.byteLength;
      peer.expected_cmdline_bytes.fill(0x21);
      peer.expected_supplementary_gids.push(65533);
    }
    let body=bundle.requestBytes;
    if(plan.case==="session_request_empty")body=Buffer.alloc(0);
    if(plan.case==="session_request_malformed")body=Buffer.from("{}\n");
    if(plan.case==="session_request_oversize")body=Buffer.alloc(65537,0x61);
    startSessionWire(plan,body);
    const originalOpen=fs.openSync;
    const originalClose=fs.closeSync;
    const roots=[];
    if(plan.case==="session_publisher_cleanup"||plan.case==="session_ack_shutdown"){
      fs.openSync=function observedOpen(file,flags,...args){
        const fd=originalOpen(file,flags,...args);
        if(String(file)==="/proc/self/fd/"+f.rootFd&&(flags&O_DIRECTORY)!==0)roots.push(fd);
        return fd;
      };
      fs.closeSync=function observedClose(fd){
        const value=originalClose(fd);
        if(!cleanupInjected&&roots.length===2&&fd===roots[1]){
          cleanupInjected=true;
          if(plan.case==="session_publisher_cleanup"){
            sessionTransition(plan.publisher,"exec");dead.add("publisher");
          }else assert.equal(sessionCommand(plan.publisher,{action:"shutdown_read"}).ok,true);
        }
        return value;
      };
    }
    const started=performance.now();
    try{result=session.servePublisherRequest(input);}
    catch(error){failure=error;}
    finally{
      fs.openSync=originalOpen;fs.closeSync=originalClose;
      if(installedToJson){
        if(originalToJson)Object.defineProperty(Object.prototype,"toJSON",originalToJson);
        else delete Object.prototype.toJSON;
        installedToJson=false;
      }
      delete process.env.APOLLYON_TEST_SESSION_SEND_FAULT;
      delete process.env.APOLLYON_TEST_CLOSE_FAULT;
    }
    const elapsed=performance.now()-started;
    closed=true;
    const successful=plan.case==="session_valid"||plan.case==="session_generation_alias";
    if(successful){
      if(failure)throw failure;
      assert.equal(result.status,"store_core_transaction_complete_source_only");
      assert.equal(result.success_response.durability_proven,true);
      assert.equal(Object.isFrozen(result.native_session),true);
      for(const field of ["challenge_exchange_performed","direct_parent_lineage_observed",
        "response_transmission_completed","native_handles_closed"]){
        assert.equal(result.native_session[field],true,field);
      }
      for(const field of ["response_receipt_confirmed","protected_expected_identity_origin_proven",
        "privileged_peer_role_admission_performed","cross_uid_host_qualification_performed"]){
        assert.equal(result.native_session[field],false,field);
      }
      assert.equal(callbacks,3);
      assertDurableWinner(f,bundle);
    }else{
      assert.notEqual(failure,undefined,"negative session must not return a success object: "+plan.case);
      assert.ok(errorMessages(failure).some(value=>value.includes("apollyon_claim_store_session_v2_")),
        errorMessages(failure).join("\n"));
      assert.equal(Object.isFrozen(failure.cleanup_errors),true);
      if(plan.case==="session_request_no_eof"||plan.case==="session_challenge_no_eof"){
        assert.ok(elapsed>=4500&&elapsed<7500,"session request/challenge requires EOF within its total deadline");
      }
      if(plan.case==="session_request_rights")assert.ok(errorMessages(failure).includes("APOLLYON_NATIVE_REQUEST_FRAME"));
      if(plan.case==="session_challenge_rights")assert.ok(errorMessages(failure).some(message=>
        message.includes("apollyon_claim_store_impl_v2_revalidation_failed:before_slot_publication:")&&
        message.includes("Peer frame contains truncated or unsupported ancillary input")),
      errorMessages(failure).join("\n"));
      const late=["session_publisher_after_slot","session_control_before_ack","session_publisher_cleanup",
        "session_ack_shutdown","session_callback_tojson","session_ack_partial","session_ack_after_send_close"];
      const slotExpected=late.includes(plan.case);
      const claimExpected=slotExpected&&plan.case!=="session_publisher_after_slot";
      const files=recordPaths(f,bundle);
      assert.equal(fs.existsSync(files.slot),slotExpected,"slot conservation: "+plan.case);
      assert.equal(fs.existsSync(files.claim),claimExpected,"claim conservation: "+plan.case);
      if(!slotExpected)assert.deepEqual(storeSnapshot(f.root),before,
        "all early protocol and local revalidation failures precede durable store mutation");
      if(claimExpected)assertDurableWinner(f,bundle);
      if(plan.case==="session_ack_partial"||plan.case==="session_ack_after_send_close"){
        assert.equal(failure.core_store_mutation_may_have_occurred,true);
        assert.equal(failure.response_delivery_may_have_occurred,true,
          "a send or later close failure cannot claim that no peer observed response bytes");
      }else if(plan.case!=="session_ack_shutdown")assert.equal(failure.response_delivery_may_have_occurred,false);
      if(plan.case==="session_publisher_cleanup"||plan.case==="session_ack_shutdown")assert.equal(cleanupInjected,true);
      assert.equal(getters,0,"caller serialization and buffer accessors never execute across the session boundary");
    }
    requireSessionClosed(session,input);
    if(plan.case==="session_ack_after_send_close"){
      assert.match(process.env.APOLLYON_TEST_RECYCLED_FD??"",/^[0-9]+$/u);
      recycled=Number(process.env.APOLLYON_TEST_RECYCLED_FD);
      assert.equal(fs.readlinkSync("/proc/self/fd/"+recycled),"/dev/null");
      assert.equal(descriptorSet().length,baseline.length+1,
        "post-send close uncertainty cleans both peers and leaves the recycled descriptor alone");
      fs.closeSync(recycled);recycled=undefined;
      delete process.env.APOLLYON_TEST_RECYCLED_FD;
    }
    assert.deepEqual(descriptorSet(),baseline,"both retained peer handles and all core/lease descriptors close");
    const wire=finishSessionWire(plan,dead);
    if(plan.case==="session_request_rights")assert.equal(wire.publisher.rights_sent,true);
    if(plan.case==="session_challenge_rights")assert.equal(wire.control.rights_sent,true);
    if(successful){
      assert.deepEqual(wire.publisher.received,bytes(result.success_response),
        "the publisher receives only the accepted exact canonical success response");
      assert.equal(wire.publisher.eof,true);
      assert.equal(Buffer.from(wire.control.challenge_base64,"base64").length,32);
      assert.equal(wire.control.sent_response,true);
    }else if(wire.publisher){
      if(plan.case==="session_ack_partial"){
        assert.equal(wire.publisher.received.length,11);
        assert.throws(()=>JSON.parse(wire.publisher.received.toString("utf8")));
      }else if(plan.case==="session_ack_after_send_close"){
        assert.ok(wire.publisher.received.length>11,
          "a late cleanup failure may occur after a complete response was visible on the live socket");
        const visible=JSON.parse(wire.publisher.received.toString("utf8"));
        assert.equal(visible.durability_proven,true);
      }else assert.equal(wire.publisher.received.length,0,"failure before native send emits no success bytes");
    }
    if(plan.case==="session_callback_async")await new Promise(resolve=>setImmediate(resolve));
  }finally{
    if(installedToJson){
      if(originalToJson)Object.defineProperty(Object.prototype,"toJSON",originalToJson);
      else delete Object.prototype.toJSON;
    }
    delete process.env.APOLLYON_TEST_SESSION_SEND_FAULT;
    delete process.env.APOLLYON_TEST_CLOSE_FAULT;
    delete process.env.APOLLYON_TEST_RECYCLED_FD;
    if(recycled!==undefined)fs.closeSync(recycled);
    if(session&&!closed)session.close();
    f.cleanup();
  }
}

async function sessionChild(plan){
  plan.control.fixture_case=plan.case;
  plan.publisher.fixture_case=plan.case;
  const native=nativeModule();
  if(plan.case.startsWith("native_session_"))await nativeSessionCases(plan,native);
  else await sessionAdapterCases(plan,await bridgeModule());
  fs.writeSync(1,JSON.stringify({ok:true,case:plan.case,uid,gid})+"\n");
}

function parseMainArguments(args){
  let headers;
  let rootPipeOnly=false;
  for(let index=0;index<args.length;index+=1){
    if(args[index]==="--node-headers"&&headers===undefined&&index+1<args.length){
      headers=path.resolve(args[++index]);
    }else if(args[index]==="--root-owned-pipe-only"&&!rootPipeOnly)rootPipeOnly=true;
    else assert.fail("unsupported native proof argument: "+args[index]);
  }
  assert.notEqual(headers,undefined,"--node-headers must select the public Node C headers for the source build");
  for(const name of ["node_api.h","node_api_types.h","js_native_api.h","js_native_api_types.h"]){
    assert.equal(fs.statSync(path.join(headers,name)).isFile(),true,name);
  }
  assert.equal(process.platform,"linux");
  if(rootPipeOnly)assert.equal(uid,0,"root-owned inherited pipe proof starts with actual UID0");
  else assert.ok(uid>=1&&uid<=65533&&gid>=1&&gid<=65533,
    "native store proof requires an actual non-root UID and GID");
  return {headers,rootPipeOnly};
}
function copySourceClosure(snapshot){
  const copied=new Set();
  const copy=relative=>{
    if(copied.has(relative))return;
    const source=path.resolve(ROOT,relative);
    assert.ok(source.startsWith(ROOT+path.sep),"source dependency remains inside the repository");
    const body=fs.readFileSync(source);
    const target=path.join(snapshot,relative);
    fs.mkdirSync(path.dirname(target),{recursive:true,mode:0o755});
    fs.writeFileSync(target,body,{mode:0o644});
    copied.add(relative);
    if(relative.endsWith(".mjs")){
      for(const match of body.toString("utf8").matchAll(/\bfrom\s+["']([^"']+)["']/gu)){
        if(!match[1].startsWith("."))continue;
        const dependency=path.relative(ROOT,path.resolve(path.dirname(source),match[1]));
        copy(dependency);
      }
    }
  };
  for(const relative of [SELF_REL,JS_REL,C_REL,PROCESS_REL,PROCESS_HEADER_REL])copy(relative);
  return copied;
}
function runFixture(fixturePath,plan){
  const result=spawnSync("/usr/bin/python3",["-I","-B",fixturePath],{
    input:JSON.stringify(plan),encoding:"utf8",stdio:["pipe","pipe","pipe"],
    env:CLEAN_ENV,cwd:"/",shell:false,timeout:17000,killSignal:"SIGKILL",maxBuffer:65536,
  });
  assert.equal(result.error,undefined,String(result.error));
  assert.equal(result.status,0,"fixture failed:\n"+String(result.stderr)+"\n"+String(result.stdout));
  const outcome=JSON.parse(result.stdout);
  assert.equal(outcome.status,0,"native child failed ["+(plan.case??plan.mode)+"]:\n"+outcome.stderr+"\n"+outcome.stdout);
  const child=JSON.parse(outcome.stdout);
  assert.equal(child.ok,true);
  return {outcome,child};
}

async function main(args){
  const options=parseMainArguments(args);
  for(const [relative,expected] of Object.entries(PINNED)){
    assert.equal(gitBlob(fs.readFileSync(path.join(ROOT,relative))),expected,relative);
  }
  const temporary=fs.mkdtempSync(path.join(os.tmpdir(),"void-apollyon-native-bridge-proof-"));
  fs.chmodSync(temporary,0o755);
  const snapshot=path.join(temporary,"snapshot");
  try{
    const copied=copySourceClosure(snapshot);
    assert.ok(copied.has("tools/apollyon-durable-attempt-claim-store-transaction-lease-v2.mjs"));
    const addon=path.join(snapshot,ADDON_REL);
    fs.mkdirSync(path.dirname(addon),{recursive:true,mode:0o755});
    const compileAddon=(extraSources=[],extraLinkerFlags=[])=>{
      const compile=spawnSync("/usr/bin/cc",[
        "-std=c11","-Wall","-Wextra","-Werror","-pedantic","-fPIC","-shared","-DNAPI_VERSION=8",
        "-I",options.headers,path.join(snapshot,C_REL),path.join(snapshot,PROCESS_REL),
        ...extraSources,...extraLinkerFlags,"-ldl","-o",addon,
      ],{cwd:snapshot,env:CLEAN_ENV,encoding:"utf8",shell:false,timeout:20000,
        killSignal:"SIGKILL",maxBuffer:65536});
      assert.equal(compile.error,undefined,String(compile.error));
      assert.equal(compile.status,0,"native compilation failed:\n"+String(compile.stderr));
      fs.chmodSync(addon,0o644);
    };
    compileAddon();
    const pipeFixture=path.join(temporary,"pipe_fixture.py");
    const peerFixture=path.join(temporary,"peer_fixture.py");
    const sessionFixture=path.join(temporary,"session_fixture.py");
    fs.writeFileSync(pipeFixture,PIPE_FIXTURE,{mode:0o644});
    fs.writeFileSync(peerFixture,PEER_FIXTURE,{mode:0o644});
    fs.writeFileSync(sessionFixture,SESSION_FIXTURE,{mode:0o644});
    const proof=path.join(snapshot,SELF_REL);
    const record=claimRecord(generationRecord("a".repeat(64)));
    const bundle=requestBundle(record);
    const runPipe=(mode,body,child={})=>{
      const result=runFixture(pipeFixture,{
        node:process.execPath,proof,mode,body:body.toString("base64"),
        ...(options.rootPipeOnly?{drop_uid:1000}:{}),
        child:{expected_sha256:sha256(body),...child},
      });
      assert.equal(result.outcome.flags_after,result.outcome.flags_before,
        "reading or rejecting an inherited descriptor does not change its shared flags");
      return result;
    };
    if(options.rootPipeOnly){
      const {outcome,child}=runPipe("root_owned",bundle.requestBytes,{reject_arguments:true});
      assert.equal(outcome.pipe_uid,0);
      assert.equal(outcome.pipe_mode,0o600);
      assert.equal(child.uid,1000);
      assert.equal(child.gid,1000);
      console.log("VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_STORE_ROOT_OWNED_PIPE_V2_PROOF_GREEN");
      console.log("root_owned_mode0600_anonymous_pipe_consumed_by_uid1000=true");
      console.log("root_owned_pipe_borrowed_fd_and_flags_preserved=true");
      console.log("root_owned_pipe_exact_fragmented_bytes_and_eof_proven=true");
      return;
    }

    runPipe("fragmented",bundle.requestBytes,{worker_once:true,reject_arguments:true});
    runPipe("worker_first",bundle.requestBytes,{worker_first:true});
    runPipe("exact_limit",Buffer.alloc(65536,0x61),{native_only:true,expected_length:65536});
    runPipe("oversized",Buffer.alloc(65537,0x61),{expected_error:"APOLLYON_NATIVE_PIPE_TOO_LARGE"});
    runPipe("missing_eof",bundle.requestBytes,{expected_error:"APOLLYON_NATIVE_PIPE_TIMEOUT"});
    for(const mode of ["regular","named_fifo","socket","blocking","wrong_direction"]){
      runPipe(mode,Buffer.alloc(0),{expected_error:"APOLLYON_NATIVE_PIPE_DESCRIPTOR"});
    }
    for(const body of [Buffer.alloc(0),Buffer.from([0xff]),
      Buffer.concat([bundle.requestBytes,Buffer.from(" ")])]){
      runPipe("malformed",body,{expected_error:"request_rejected"});
    }
    for(const kind of ["native_valid","native_wrong_identity","native_exit","native_exec","native_full_close",
      "adapter_valid","adapter_config","adapter_receipt_prototype","adapter_receipt_nested",
      "adapter_core_failure","adapter_peer_before","adapter_before_slot","adapter_after_slot",
      "adapter_before_ack","adapter_cleanup_publish","adapter_cleanup_observe"]){
      runFixture(peerFixture,{node:process.execPath,proof,case:kind});
    }
    for(const kind of ["native_session_pair_rules","native_session_repair","native_session_response_large","native_session_response_timeout",
      "session_valid","session_config","session_wrong_parent","session_role_swap","session_duplicate_peer",
      "session_missing_inline","session_nondefault_peek","session_control_urgent","session_request_empty","session_request_malformed",
      "session_request_oversize","session_request_delayed_extra","session_request_no_eof","session_request_rights",
      "session_control_early_bytes","session_control_early_eof","session_wrong_challenge","session_wrong_digest",
      "session_challenge_short","session_challenge_extra","session_challenge_delayed_extra","session_challenge_no_eof",
      "session_challenge_rights",
      "session_callback_async","session_callback_tojson","session_generation_alias","session_control_before_slot",
      "session_publisher_after_slot","session_control_before_ack","session_publisher_cleanup","session_ack_shutdown"]){
      runFixture(sessionFixture,{node:process.execPath,proof,case:kind});
    }
    // The 29 original and 35 two-peer fixtures use the production source build.
    // These three fault cases use a separate temporary compile with linker-only
    // close interception, without adding a production native hook or export.
    const closeFaultSource=path.join(temporary,"native_close_fault.c");
    fs.writeFileSync(closeFaultSource,CLOSE_FAULT_FIXTURE,{mode:0o644});
    compileAddon([closeFaultSource],["-Wl,--wrap=close"]);
    for(const kind of ["native_fault_explicit","native_fault_temporary","native_fault_primary"]){
      runFixture(peerFixture,{node:process.execPath,proof,case:kind});
    }
    const sendFaultSource=path.join(temporary,"native_session_send_fault.c");
    fs.writeFileSync(sendFaultSource,SESSION_SEND_FAULT_FIXTURE,{mode:0o644});
    compileAddon([closeFaultSource,sendFaultSource],["-Wl,--wrap=close","-Wl,--wrap=send"]);
    for(const kind of ["session_ack_partial","session_ack_after_send_close"]){
      runFixture(sessionFixture,{node:process.execPath,proof,case:kind});
    }
  }finally{fs.rmSync(temporary,{recursive:true,force:true});}

  console.log("VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_STORE_NATIVE_BRIDGE_V2_PROOF_GREEN");
  console.log("native_bridge_exact_source_and_process_parent_blobs_pinned=true");
  console.log("native_bridge_strict_napi8_source_build_in_disposable_snapshot=true");
  console.log("inherited_anonymous_pipe_fragmented_exact_request_and_eof_proven=true");
  console.log("inherited_pipe_65536_byte_limit_and_oversize_rejection_proven=true");
  console.log("inherited_pipe_missing_eof_total_deadline_proven=true");
  console.log("inherited_pipe_type_direction_and_existing_nonblock_required=true");
  console.log("inherited_pipe_borrowed_descriptor_and_flags_preserved=true");
  console.log("inherited_pipe_private_descriptor_cleanup_on_all_results=true");
  console.log("inherited_pipe_one_attempt_including_failure_and_worker_environments=true");
  console.log("inherited_pipe_one_attempt_survives_initial_worker_exit_and_addon_reload=true");
  console.log("native_pipe_bytes_pass_directly_to_exact_forward_parser=true");
  console.log("native_peer_real_socket_credentials_and_process_identity_proven=true");
  console.log("native_peer_pidfd_executable_socket_retained_until_close=true");
  console.log("native_peer_borrowed_descriptor_and_expected_bytes_reuse_cannot_redirect=true");
  console.log("native_peer_wrong_parent_uid_gid_groups_executable_cmdline_rejected=true");
  console.log("native_peer_shared_memory_expected_bytes_rejected_before_descriptor_acquisition=true");
  console.log("native_peer_uncertain_retained_pidfd_close_is_not_retried=true");
  console.log("native_peer_uncertain_temporary_pidfd_close_cleans_retained_session=true");
  console.log("native_peer_primary_failure_preserved_with_native_cleanup_error=true");
  console.log("native_peer_forged_and_closed_handles_rejected=true");
  console.log("native_peer_exit_exec_and_full_connection_close_poison_and_cleanup=true");
  console.log("native_peer_half_closed_sender_remains_valid_for_publication=true");
  console.log("native_adapter_publish_observe_and_explicit_close_proven=true");
  console.log("native_adapter_readonly_observation_preserved=true");
  console.log("native_adapter_config_proxies_accessors_shared_bytes_rejected=true");
  console.log("native_adapter_cmdline_byte_length_getter_not_invoked=true");
  console.log("native_adapter_receipt_prototype_getter_not_invoked=true");
  console.log("native_adapter_nested_receipt_getter_rejected_without_invocation=true");
  console.log("native_adapter_reentry_does_not_close_active_peer_session=true");
  console.log("native_adapter_core_failure_closes_and_poisons_session=true");
  console.log("native_adapter_peer_failure_before_slot_prevents_store_mutation=true");
  console.log("native_adapter_peer_failure_after_slot_or_claim_suppresses_ack=true");
  console.log("native_adapter_peer_retained_through_core_cleanup_and_postcheck=true");
  console.log("native_session_real_control_parent_and_distinct_publisher_socket_identity_proven=true");
  console.log("native_session_wrong_parent_duplicate_and_reversed_roles_rejected=true");
  console.log("native_session_required_inline_urgent_byte_handling_and_urgent_input_rejection_proven=true");
  console.log("native_session_pair_phase_order_and_one_use_after_failure_proven=true");
  console.log("native_session_fragmented_actual_request_challenge_and_canonical_response_proven=true");
  console.log("native_session_exact_request_bound_empty_malformed_and_delayed_extra_rejected=true");
  console.log("native_session_missing_request_eof_total_deadline_proven=true");
  console.log("native_session_prechallenge_control_bytes_and_eof_rejected=true");
  console.log("native_session_wrong_challenge_echo_and_request_digest_rejected=true");
  console.log("native_session_short_extra_delayed_extra_and_missing_challenge_eof_rejected=true");
  console.log("native_session_request_and_challenge_ancillary_descriptors_rejected_without_leak=true");
  console.log("native_session_challenge_exchange_performed=true");
  console.log("native_session_challenge_failure_precedes_store_mutation=true");
  console.log("native_session_existing_core_durable_winner_and_readonly_observer_preserved=true");
  console.log("native_session_no_raw_publish_or_observe_entrypoint_exposed=true");
  console.log("native_session_config_and_operation_accessors_rejected_without_invocation=true");
  console.log("native_session_cmdline_and_generation_input_aliases_cannot_redirect=true");
  console.log("native_session_async_local_receipt_observed_rejected_and_session_closed=true");
  console.log("native_session_callback_serialization_getter_rejected_without_invocation=true");
  console.log("native_session_reentry_rejected_without_closing_active_pair=true");
  console.log("native_session_peer_exit_or_exec_at_each_publication_boundary_suppresses_ack=true");
  console.log("native_session_both_peers_retained_through_core_cleanup_and_response_boundary=true");
  console.log("native_session_actual_response_backpressure_partial_progress_and_deadline_proven=true");
  console.log("native_session_partial_response_failure_preserves_durable_winner_and_delivery_uncertainty=true");
  console.log("native_session_postsend_close_failure_does_not_claim_response_suppression=true");
  console.log("native_session_both_native_handles_closed_before_local_return=true");
  console.log("native_session_control_receives_no_publisher_success_response=true");
  console.log("native_session_successful_transmission_is_not_confirmed_peer_receipt=true");
  console.log("native_session_privileged_roles_installed_origin_and_cross_uid_host_proof=false");
  console.log("native_peer_expected_identity_origin_proven=false");
  console.log("privileged_peer_role_admission_performed=false");
  console.log("challenge_exchange_performed=false");
  console.log("listener_started=false");
  console.log("production_claim_store_mutation_performed=false");
  console.log("training_execution_authorized=false");
  console.log("funds_movement=false");
}

if(process.argv[2]==="--pipe-child"){
  assert.equal(process.argv.length,4);
  await pipeChild(JSON.parse(process.argv[3]));
}else if(process.argv[2]==="--peer-child"){
  assert.equal(process.argv.length,4);
  await peerChild(JSON.parse(process.argv[3]));
}else if(process.argv[2]==="--session-child"){
  assert.equal(process.argv.length,4);
  await sessionChild(JSON.parse(process.argv[3]));
}else await main(process.argv.slice(2));
