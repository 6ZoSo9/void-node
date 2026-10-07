#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const VOID_DATANET_REGISTRY_BROADCAST_GENERATION_CUSTODY_SERVICE_V1 =
  "VOID_DATANET_REGISTRY_BROADCAST_GENERATION_CUSTODY_SERVICE_V1";

export const VOID_DATANET_REGISTRY_BROADCAST_GENERATION_CUSTODY_SERVICE_AUTHORITY_V1 =
  Object.freeze({
    source_only_service:true,
    unix_socket_only:true,
    server_controlled_socket_path:true,
    server_controlled_fence_root:true,
    exact_request_schema_required:true,
    exact_response_schema_required:true,
    stable_fence_identity_rederived:true,
    create_only_record:true,
    descriptor_pinned_fence_root:true,
    advertised_socket_policy_before_publish:true,
    advertised_socket_unlink_on_stop:false,
    stale_advertised_socket_cleanup_external:true,
    direct_executable_activation:false,
    host_lifecycle_launcher_required:true,
    caller_selected_path:false,
    arbitrary_path_write:false,
    arbitrary_bytes_write:false,
    automatic_retry:false,
    service_started_by_import:false,
    live_host_qualification_performed:false,
    independent_custody_proven:false,
    runtime_integration:false,
    rpc_access:false,
    wallet_or_signer_access:false,
    private_key_access:false,
    transaction_construction:false,
    transaction_signing:false,
    transaction_submission:false,
    transaction_broadcast:false,
    chain2050_write:false,
    inventory_mutation:false,
    market_activation:false,
    public_presale_activation:false,
    treasury_or_liquidity_movement:false,
    funds_movement:false,
  });

const REQUEST_SCHEMA=
  "void_datanet_registry_broadcast_generation_custody_request_v1";
const RESPONSE_SCHEMA=
  "void_datanet_registry_broadcast_generation_custody_response_v1";
const RECORD_SCHEMA=
  "void_datanet_registry_broadcast_generation_custody_record_v1";
const MAX_REQUEST_BYTES=64*1024;
const MAX_RESPONSE_BYTES=64*1024;
const RESPONSE_TIMEOUT_MS=5000;
const MAX_RECORD_BYTES=64*1024;

const FENCE_ID=/^voiddrbgf1_[0-9a-f]{64}$/u;
const OP_ID=/^voiddrbo1_[0-9a-f]{64}$/u;
const AUTH_ID=/^voiddrba1_[0-9a-f]{64}$/u;
const REQUEST_ID=/^voiddrbar1_[0-9a-f]{64}$/u;
const SIGNED_ID=/^voiddrstx1_[0-9a-f]{64}$/u;
const CONSUMPTION_ID=/^voiddrbac1_[0-9a-f]{64}$/u;
const HASH=/^0x[0-9a-f]{64}$/u;
const SHA256=/^[0-9a-f]{64}$/u;
const SHA256_ID=/^sha256:[0-9a-f]{64}$/u;
const DECIMAL=/^(0|[1-9][0-9]*)$/u;

const ENVELOPE_KEYS=Object.freeze([
  "schema",
  "marker",
  "version",
  "method",
  "fence",
  "custody_receipt_sha256",
]);

const FENCE_KEYS=Object.freeze([
  "marker",
  "version",
  "broadcast_operation_id",
  "broadcast_authorization_id",
  "broadcast_authorization_request_id",
  "signed_transaction_id",
  "signed_transaction_hash",
  "state_store_realpath_sha256",
  "one_submission_attempt_only",
  "automatic_retry_authorized",
  "replacement_transaction_authorized",
  "broadcast_generation_fence_id",
  "observed_consumption_record_id",
  "observed_state_store_root_dev",
  "observed_state_store_root_ino",
]);
const RECORD_KEYS=Object.freeze([
  "schema",
  "marker",
  "version",
  "broadcast_generation_fence_id",
  "fence_identity",
  "first_observation",
  "policy",
]);
const FENCE_IDENTITY_KEYS=Object.freeze([
  "marker",
  "version",
  "broadcast_operation_id",
  "broadcast_authorization_id",
  "broadcast_authorization_request_id",
  "signed_transaction_id",
  "signed_transaction_hash",
  "state_store_realpath_sha256",
  "one_submission_attempt_only",
  "automatic_retry_authorized",
  "replacement_transaction_authorized",
]);
const FIRST_OBSERVATION_KEYS=Object.freeze([
  "observed_consumption_record_id",
  "observed_state_store_root_dev",
  "observed_state_store_root_ino",
]);
const POLICY_KEYS=Object.freeze([
  "one_submission_attempt_only",
  "automatic_retry_authorized",
  "replacement_transaction_authorized",
]);

function fail(code){
  throw new Error(code);
}

function directObject(value,keys,code){
  if(!value||typeof value!=="object"||Array.isArray(value)) fail(code);
  const proto=Object.getPrototypeOf(value);
  if(proto!==Object.prototype&&proto!==null) fail(code);
  const descriptors=Object.getOwnPropertyDescriptors(value);
  const own=Reflect.ownKeys(descriptors);
  if(own.some((key)=>typeof key!=="string")) fail(code);
  const actual=[...own].sort();
  const expected=[...keys].sort();
  if(
    actual.length!==expected.length||
    actual.some((key,index)=>key!==expected[index])
  ){
    fail(code);
  }
  const out=Object.create(null);
  for(const key of keys){
    const descriptor=descriptors[key];
    if(
      !descriptor||
      descriptor.enumerable!==true||
      !Object.hasOwn(descriptor,"value")
    ){
      fail(code);
    }
    out[key]=descriptor.value;
  }
  return Object.freeze(out);
}

function canonical(value){
  if(value===null||typeof value==="string"||typeof value==="boolean") return value;
  if(typeof value==="number"&&Number.isSafeInteger(value)) return value;
  if(Array.isArray(value)) return value.map(canonical);
  if(value&&typeof value==="object"){
    return Object.fromEntries(
      Object.keys(value).sort().map((key)=>[key,canonical(value[key])]),
    );
  }
  fail("datanet_broadcast_generation_custody_noncanonical_value");
}

function canonicalJson(value){
  return JSON.stringify(canonical(value));
}

function sha256Hex(value){
  return crypto.createHash("sha256").update(value).digest("hex");
}

function sha256Id(value){
  return "sha256:"+sha256Hex(value);
}

function absolutePath(value,code){
  const raw=String(value??"").trim();
  if(!raw||!path.isAbsolute(raw)||raw.includes("\0")) fail(code);
  const resolved=path.resolve(raw);
  if(resolved===path.parse(resolved).root) fail(code);
  return resolved;
}

function boundedInteger(value,min,max,code){
  const parsed=Number(value);
  if(!Number.isSafeInteger(parsed)||parsed<min||parsed>max) fail(code);
  return parsed;
}

function assertNoSymlinkAncestors(target,code){
  const resolved=path.resolve(target);
  const parsed=path.parse(resolved);
  let cursor=parsed.root;
  for(const segment of resolved.slice(parsed.root.length).split(path.sep).filter(Boolean)){
    cursor=path.join(cursor,segment);
    const stat=fs.lstatSync(cursor);
    if(stat.isSymbolicLink()) fail(code);
  }
}

function sameDirState(left,right){
  return (
    left.dev===right.dev&&
    left.ino===right.ino&&
    left.mode===right.mode&&
    left.nlink===right.nlink&&
    left.uid===right.uid&&
    left.gid===right.gid
  );
}

function assertDirectDirectory(directory,code,mode,gid=null){
  assertNoSymlinkAncestors(directory,code);
  const stat=fs.lstatSync(directory);
  if(
    !stat.isDirectory()||
    stat.isSymbolicLink()||
    fs.realpathSync.native(directory)!==directory||
    (typeof process.getuid==="function"&&stat.uid!==process.getuid())||
    (stat.mode&0o777)!==mode||
    (gid!==null&&stat.gid!==gid)
  ){
    fail(code);
  }
}

function openPinnedFenceRoot(root){
  assertDirectDirectory(
    root,
    "datanet_broadcast_generation_custody_fence_root_invalid",
    0o700,
  );
  const fd=fs.openSync(
    root,
    fs.constants.O_RDONLY|
      Number(fs.constants.O_DIRECTORY||0)|
      Number(fs.constants.O_NOFOLLOW||0),
  );
  try{
    const opened=fs.fstatSync(fd,{bigint:true});
    const visible=fs.lstatSync(root,{bigint:true});
    if(
      !opened.isDirectory()||
      !visible.isDirectory()||
      visible.isSymbolicLink()||
      fs.realpathSync.native(root)!==root||
      !sameDirState(opened,visible)||
      (
        typeof process.getuid==="function"&&
        opened.uid!==BigInt(process.getuid())
      )||
      Number(opened.mode&0o777n)!==0o700
    ){
      fail("datanet_broadcast_generation_custody_fence_root_not_bound");
    }
    return Object.freeze({
      fd,
      proc_path:"/proc/self/fd/"+String(fd),
      dev:String(opened.dev),
      ino:String(opened.ino),
    });
  }catch(error){
    fs.closeSync(fd);
    throw error;
  }
}

function closePinnedRoot(pinned){
  if(!pinned) return;
  try{
    fs.closeSync(pinned.fd);
  }catch(closeError){
    void closeError;
  }
}

function fenceIdentity(fence){
  return Object.freeze({
    marker:fence.marker,
    version:fence.version,
    broadcast_operation_id:fence.broadcast_operation_id,
    broadcast_authorization_id:fence.broadcast_authorization_id,
    broadcast_authorization_request_id:
      fence.broadcast_authorization_request_id,
    signed_transaction_id:fence.signed_transaction_id,
    signed_transaction_hash:fence.signed_transaction_hash,
    state_store_realpath_sha256:fence.state_store_realpath_sha256,
    one_submission_attempt_only:true,
    automatic_retry_authorized:false,
    replacement_transaction_authorized:false,
  });
}

function normalizeFence(raw){
  const value=directObject(
    raw,
    FENCE_KEYS,
    "datanet_broadcast_generation_custody_fence_invalid",
  );
  if(
    value.marker!=="VOID_DATANET_REGISTRY_BROADCAST_GENERATION_FENCE_V1"||
    value.version!==1||
    !OP_ID.test(String(value.broadcast_operation_id||""))||
    !AUTH_ID.test(String(value.broadcast_authorization_id||""))||
    !REQUEST_ID.test(String(value.broadcast_authorization_request_id||""))||
    !SIGNED_ID.test(String(value.signed_transaction_id||""))||
    !HASH.test(String(value.signed_transaction_hash||""))||
    !SHA256.test(String(value.state_store_realpath_sha256||""))||
    value.one_submission_attempt_only!==true||
    value.automatic_retry_authorized!==false||
    value.replacement_transaction_authorized!==false||
    !FENCE_ID.test(String(value.broadcast_generation_fence_id||""))||
    !CONSUMPTION_ID.test(String(value.observed_consumption_record_id||""))||
    !DECIMAL.test(String(value.observed_state_store_root_dev||""))||
    !DECIMAL.test(String(value.observed_state_store_root_ino||""))
  ){
    fail("datanet_broadcast_generation_custody_fence_invalid");
  }
  const normalized=Object.freeze({
    ...value,
    signed_transaction_hash:String(value.signed_transaction_hash).toLowerCase(),
  });
  const expected=
    "voiddrbgf1_"+sha256Hex(Buffer.from(canonicalJson(fenceIdentity(normalized))));
  if(normalized.broadcast_generation_fence_id!==expected){
    fail("datanet_broadcast_generation_custody_fence_id_invalid");
  }
  return normalized;
}

function normalizeEnvelope(raw){
  const value=directObject(
    raw,
    ENVELOPE_KEYS,
    "datanet_broadcast_generation_custody_request_invalid",
  );
  if(
    value.schema!==REQUEST_SCHEMA||
    value.marker!==VOID_DATANET_REGISTRY_BROADCAST_GENERATION_CUSTODY_SERVICE_V1||
    value.version!==1||
    !["claim","assert"].includes(value.method)
  ){
    fail("datanet_broadcast_generation_custody_request_invalid");
  }
  const fence=normalizeFence(value.fence);
  if(
    (value.method==="claim"&&value.custody_receipt_sha256!==null)||
    (
      value.method==="assert"&&
      !SHA256_ID.test(String(value.custody_receipt_sha256||""))
    )
  ){
    fail("datanet_broadcast_generation_custody_request_invalid");
  }
  return Object.freeze({
    schema:REQUEST_SCHEMA,
    marker:VOID_DATANET_REGISTRY_BROADCAST_GENERATION_CUSTODY_SERVICE_V1,
    version:1,
    method:value.method,
    fence,
    custody_receipt_sha256:
      value.method==="assert"
        ? String(value.custody_receipt_sha256)
        : null,
  });
}

function recordForFence(fence){
  return Object.freeze({
    schema:RECORD_SCHEMA,
    marker:VOID_DATANET_REGISTRY_BROADCAST_GENERATION_CUSTODY_SERVICE_V1,
    version:1,
    broadcast_generation_fence_id:fence.broadcast_generation_fence_id,
    fence_identity:fenceIdentity(fence),
    first_observation:Object.freeze({
      observed_consumption_record_id:fence.observed_consumption_record_id,
      observed_state_store_root_dev:fence.observed_state_store_root_dev,
      observed_state_store_root_ino:fence.observed_state_store_root_ino,
    }),
    policy:Object.freeze({
      one_submission_attempt_only:true,
      automatic_retry_authorized:false,
      replacement_transaction_authorized:false,
    }),
  });
}

function recordName(fence){
  if(!FENCE_ID.test(fence.broadcast_generation_fence_id)){
    fail("datanet_broadcast_generation_custody_record_name_invalid");
  }
  return fence.broadcast_generation_fence_id+".json";
}

function recordPath(pinned,fence){
  return path.join(pinned.proc_path,recordName(fence));
}

function serializeRecord(record){
  return Buffer.from(JSON.stringify(record,null,2)+"\n","utf8");
}

function assertRecord(record,fence){
  const value=directObject(
    record,
    RECORD_KEYS,
    "datanet_broadcast_generation_custody_record_invalid",
  );
  const identity=directObject(
    value.fence_identity,
    FENCE_IDENTITY_KEYS,
    "datanet_broadcast_generation_custody_record_invalid",
  );
  const observation=directObject(
    value.first_observation,
    FIRST_OBSERVATION_KEYS,
    "datanet_broadcast_generation_custody_record_invalid",
  );
  const policy=directObject(
    value.policy,
    POLICY_KEYS,
    "datanet_broadcast_generation_custody_record_invalid",
  );
  if(
    value.schema!==RECORD_SCHEMA||
    value.marker!==VOID_DATANET_REGISTRY_BROADCAST_GENERATION_CUSTODY_SERVICE_V1||
    value.version!==1||
    value.broadcast_generation_fence_id!==fence.broadcast_generation_fence_id||
    canonicalJson(identity)!==canonicalJson(fenceIdentity(fence))||
    policy.one_submission_attempt_only!==true||
    policy.automatic_retry_authorized!==false||
    policy.replacement_transaction_authorized!==false||
    !CONSUMPTION_ID.test(
      String(observation.observed_consumption_record_id||""),
    )||
    !DECIMAL.test(String(observation.observed_state_store_root_dev||""))||
    !DECIMAL.test(String(observation.observed_state_store_root_ino||""))
  ){
    fail("datanet_broadcast_generation_custody_record_invalid");
  }
}

function readRecord(pinned,fence){
  const file=recordPath(pinned,fence);
  const fd=fs.openSync(
    file,
    fs.constants.O_RDONLY|Number(fs.constants.O_NOFOLLOW||0),
  );
  try{
    const before=fs.fstatSync(fd,{bigint:true});
    if(
      !before.isFile()||
      before.nlink!==1n||
      before.size<2n||
      before.size>BigInt(MAX_RECORD_BYTES)||
      Number(before.mode&0o777n)!==0o600||
      (
        typeof process.getuid==="function"&&
        before.uid!==BigInt(process.getuid())
      )
    ){
      fail("datanet_broadcast_generation_custody_record_invalid");
    }
    const bytes=Buffer.alloc(Number(before.size));
    let offset=0;
    while(offset<bytes.length){
      const count=fs.readSync(fd,bytes,offset,bytes.length-offset,offset);
      if(count<=0) fail("datanet_broadcast_generation_custody_record_short_read");
      offset+=count;
    }
    const probe=Buffer.alloc(1);
    if(fs.readSync(fd,probe,0,1,bytes.length)!==0){
      fail("datanet_broadcast_generation_custody_record_grew");
    }
    const after=fs.fstatSync(fd,{bigint:true});
    if(
      before.dev!==after.dev||
      before.ino!==after.ino||
      before.size!==after.size||
      before.mtimeNs!==after.mtimeNs||
      before.ctimeNs!==after.ctimeNs
    ){
      fail("datanet_broadcast_generation_custody_record_changed");
    }
    let parsed;
    try{
      parsed=JSON.parse(bytes.toString("utf8"));
    }catch(error){
      void error;
      fail("datanet_broadcast_generation_custody_record_invalid");
    }
    assertRecord(parsed,fence);
    return Object.freeze({
      record:parsed,
      custody_receipt_sha256:sha256Id(bytes),
    });
  }finally{
    fs.closeSync(fd);
  }
}

function createRecord(pinned,fence){
  const file=recordPath(pinned,fence);
  const record=recordForFence(fence);
  const bytes=serializeRecord(record);
  let fd=-1;
  try{
    try{
      fd=fs.openSync(
        file,
        fs.constants.O_WRONLY|
          fs.constants.O_CREAT|
          fs.constants.O_EXCL|
          Number(fs.constants.O_NOFOLLOW||0),
        0o600,
      );
    }catch(error){
      if(error?.code==="EEXIST") return Object.freeze({status:"exists"});
      throw error;
    }
    fs.writeFileSync(fd,bytes);
    fs.fchmodSync(fd,0o600);
    fs.fsyncSync(fd);
    const created=fs.fstatSync(fd,{bigint:true});
    if(
      !created.isFile()||
      created.nlink!==1n||
      created.size!==BigInt(bytes.length)||
      Number(created.mode&0o777n)!==0o600||
      (
        typeof process.getuid==="function"&&
        created.uid!==BigInt(process.getuid())
      )
    ){
      fail("datanet_broadcast_generation_custody_record_create_invalid");
    }
    fs.fsyncSync(pinned.fd);
    return Object.freeze({
      status:"created",
      custody_receipt_sha256:sha256Id(bytes),
    });
  }finally{
    bytes.fill(0);
    if(fd>=0) fs.closeSync(fd);
  }
}

function success(status,fenceId,receipt,operationPerformed){
  return Object.freeze({
    ok:true,
    status,
    broadcast_generation_fence_id:fenceId,
    custody_receipt_sha256:receipt,
    source_service_contract_proven:true,
    independent_custody_proven:false,
    live_host_qualification_performed:false,
    operation_performed:operationPerformed,
    rpc_access:false,
    transaction_broadcast:false,
    funds_movement:false,
  });
}

function held(reason){
  const safe=/^[a-z][a-z0-9_]{2,179}$/u.test(String(reason||""))
    ? String(reason)
    : "datanet_broadcast_generation_custody_held";
  return Object.freeze({
    ok:false,
    status:"held",
    reason:safe,
    broadcast_generation_fence_id:null,
    custody_receipt_sha256:null,
    source_service_contract_proven:true,
    independent_custody_proven:false,
    live_host_qualification_performed:false,
    operation_performed:false,
    rpc_access:false,
    transaction_broadcast:false,
    funds_movement:false,
  });
}

function responseEnvelope(requestSha256,decision){
  return Object.freeze({
    schema:RESPONSE_SCHEMA,
    marker:VOID_DATANET_REGISTRY_BROADCAST_GENERATION_CUSTODY_SERVICE_V1,
    version:1,
    request_sha256:requestSha256,
    decision,
  });
}

function normalizeOptions(raw){
  const value=directObject(
    raw,
    ["socket_path","fence_root","socket_group_gid"],
    "datanet_broadcast_generation_custody_options_invalid",
  );
  const socketPath=absolutePath(
    value.socket_path,
    "datanet_broadcast_generation_custody_socket_path_invalid",
  );
  const fenceRoot=absolutePath(
    value.fence_root,
    "datanet_broadcast_generation_custody_fence_root_invalid",
  );
  const socketParent=path.dirname(socketPath);
  if(
    socketParent===fenceRoot||
    socketParent.startsWith(fenceRoot+path.sep)||
    fenceRoot.startsWith(socketParent+path.sep)
  ){
    fail("datanet_broadcast_generation_custody_paths_not_separated");
  }
  return Object.freeze({
    socket_path:socketPath,
    fence_root:fenceRoot,
    socket_group_gid:boundedInteger(
      value.socket_group_gid,
      0,
      0x7fff_ffff,
      "datanet_broadcast_generation_custody_socket_group_invalid",
    ),
  });
}

function decideWithPinnedRoot(pinned,envelope){
  const fence=envelope.fence;
  if(envelope.method==="claim"){
    const created=createRecord(pinned,fence);
    if(created.status==="created"){
      return success(
        "created",
        fence.broadcast_generation_fence_id,
        created.custody_receipt_sha256,
        true,
      );
    }
    const existing=readRecord(pinned,fence);
    return success(
      "exists",
      fence.broadcast_generation_fence_id,
      existing.custody_receipt_sha256,
      false,
    );
  }
  const existing=readRecord(pinned,fence);
  if(existing.custody_receipt_sha256!==envelope.custody_receipt_sha256){
    return held("datanet_broadcast_generation_custody_receipt_mismatch");
  }
  return success(
    "asserted",
    fence.broadcast_generation_fence_id,
    existing.custody_receipt_sha256,
    false,
  );
}

export async function handleVoidDatanetRegistryBroadcastGenerationCustodyEnvelopeV1(
  rawOptions,
  rawEnvelope,
){
  let requestSha256=sha256Id(Buffer.from("invalid","utf8"));
  let options;
  let envelope;
  let pinned=null;
  try{
    options=normalizeOptions(rawOptions);
    envelope=normalizeEnvelope(rawEnvelope);
    requestSha256=sha256Id(
      Buffer.from(canonicalJson(envelope),"utf8"),
    );
    pinned=openPinnedFenceRoot(options.fence_root);
    return responseEnvelope(
      requestSha256,
      decideWithPinnedRoot(pinned,envelope),
    );
  }catch(error){
    return responseEnvelope(
      requestSha256,
      held(
        error instanceof Error
          ? error.message
          : "datanet_broadcast_generation_custody_held",
      ),
    );
  }finally{
    closePinnedRoot(pinned);
  }
}

function writeResponse(socket,response){
  const line=JSON.stringify(response)+"\n";
  const output=
    Buffer.byteLength(line,"utf8")>MAX_RESPONSE_BYTES
      ? JSON.stringify(
          responseEnvelope(
            sha256Id(Buffer.from("oversize","utf8")),
            held("datanet_broadcast_generation_custody_response_too_large"),
          ),
        )+"\n"
      : line;
  socket.write(output);
  socket.destroySoon();
}

function createVoidDatanetRegistryBroadcastGenerationCustodyServiceInternalV1(
  rawOptions,
  testOnlySocketPolicyFailure=null,
){
  const options=normalizeOptions(rawOptions);
  if(
    ![null,"chmod","chown"].includes(testOnlySocketPolicyFailure)
  ){
    fail("datanet_broadcast_generation_custody_test_hook_invalid");
  }
  let server=null;
  let pinned=null;
  let started=false;
  let boundSocketIdentity=null;
  let boundListenPath=null;
  let queue=Promise.resolve();
  const sockets=new Set();

  const enqueue=(operation)=>{
    const run=queue.then(operation,operation);
    queue=run.then(()=>undefined,()=>undefined);
    return run;
  };

  const resourceState=()=>Object.freeze({
    started,
    server_present:server!==null,
    server_listening:Boolean(server?.listening),
    pinned_root_open:pinned!==null,
    bound_socket_identity:boundSocketIdentity!==null,
    private_listen_path_bound:boundListenPath!==null,
    accepted_socket_count:sockets.size,
  });

  const sameSocketIdentity=(identity,stat)=>
    identity!==null&&
    String(stat.dev)===identity.dev&&
    String(stat.ino)===identity.ino;

  function freshBoundListenPath(){
    const parent=path.dirname(options.socket_path);
    for(let attempt=0;attempt<64;attempt++){
      const candidate=path.join(
        parent,
        ".v"+crypto.randomBytes(2).toString("hex"),
      );
      try{
        fs.lstatSync(candidate);
      }catch(error){
        if(error?.code==="ENOENT") return candidate;
        throw error;
      }
    }
    fail(
      "datanet_broadcast_generation_custody_private_listen_path_unavailable",
    );
  }

  async function cleanupResources(){
    for(const socket of sockets) socket.destroy();

    if(server!==null&&server.listening){
      await new Promise((resolve)=>server.close(()=>resolve()));
    }

    await queue.catch(()=>undefined);
    closePinnedRoot(pinned);
    pinned=null;

    if(boundListenPath!==null){
      try{
        const hidden=fs.lstatSync(boundListenPath,{bigint:true});
        if(
          boundSocketIdentity!==null&&
          hidden.isSocket()&&
          sameSocketIdentity(boundSocketIdentity,hidden)
        ){
          fs.unlinkSync(boundListenPath);
        }
      }catch(error){
        if(error?.code!=="ENOENT") throw error;
      }
    }

    boundListenPath=null;
    boundSocketIdentity=null;
    server=null;
    started=false;
  }

  async function start(){
    if(started) fail("datanet_broadcast_generation_custody_service_already_started");
    assertDirectDirectory(
      path.dirname(options.socket_path),
      "datanet_broadcast_generation_custody_socket_parent_invalid",
      0o750,
      options.socket_group_gid,
    );
    assertDirectDirectory(
      options.fence_root,
      "datanet_broadcast_generation_custody_fence_root_invalid",
      0o700,
    );
    if(
      typeof process.getgroups==="function"&&
      !process.getgroups().includes(options.socket_group_gid)&&
      (
        typeof process.getgid!=="function"||
        process.getgid()!==options.socket_group_gid
      )
    ){
      fail("datanet_broadcast_generation_custody_socket_group_not_granted");
    }
    try{
      fs.lstatSync(options.socket_path);
      fail("datanet_broadcast_generation_custody_socket_path_exists");
    }catch(error){
      if(
        error instanceof Error&&
        error.message==="datanet_broadcast_generation_custody_socket_path_exists"
      ){
        throw error;
      }
      if(error?.code!=="ENOENT") throw error;
    }

    pinned=openPinnedFenceRoot(options.fence_root);
    server=net.createServer((socket)=>{
      sockets.add(socket);
      socket.setEncoding("utf8");
      socket.setTimeout(RESPONSE_TIMEOUT_MS);
      let input="";
      let requestAccepted=false;
      let responded=false;
      let totalTimer=null;
      const finishHeld=(reason)=>{
        if(responded||socket.destroyed) return;
        responded=true;
        writeResponse(
          socket,
          responseEnvelope(
            sha256Id(Buffer.from("invalid","utf8")),
            held(reason),
          ),
        );
      };
      totalTimer=setTimeout(
        ()=>finishHeld(
          "datanet_broadcast_generation_custody_request_total_timeout",
        ),
        RESPONSE_TIMEOUT_MS,
      );
      socket.on("close",()=>{
        if(totalTimer!==null) clearTimeout(totalTimer);
        sockets.delete(socket);
      });
      socket.on("error",(error)=>{void error;});
      socket.on("timeout",()=>{
        finishHeld("datanet_broadcast_generation_custody_request_timeout");
      });
      socket.on("data",(chunk)=>{
        if(requestAccepted||responded) return;
        input+=chunk;
        if(Buffer.byteLength(input,"utf8")>MAX_REQUEST_BYTES){
          finishHeld("datanet_broadcast_generation_custody_request_too_large");
          return;
        }
        const newline=input.indexOf("\n");
        if(newline<0) return;
        const first=input.slice(0,newline);
        const trailing=input.slice(newline+1);
        if(trailing.length!==0||first.length===0){
          finishHeld("datanet_broadcast_generation_custody_request_invalid");
          return;
        }
        requestAccepted=true;
        void enqueue(async()=>{
          if(responded) return;
          let requestSha256=sha256Id(Buffer.from("invalid","utf8"));
          try{
            const raw=JSON.parse(first);
            const envelope=normalizeEnvelope(raw);
            requestSha256=sha256Id(
              Buffer.from(canonicalJson(envelope),"utf8"),
            );
            const decision=decideWithPinnedRoot(pinned,envelope);
            if(responded) return;
            responded=true;
            writeResponse(
              socket,
              responseEnvelope(
                requestSha256,
                decision,
              ),
            );
          }catch(error){
            if(responded) return;
            responded=true;
            writeResponse(
              socket,
              responseEnvelope(
                requestSha256,
                held(
                  error instanceof Error
                    ? error.message
                    : "datanet_broadcast_generation_custody_request_invalid",
                ),
              ),
            );
          }
        });
      });
    });

    try{
      boundListenPath=freshBoundListenPath();
      await new Promise((resolve,reject)=>{
        server.once("error",reject);
        server.listen(boundListenPath,resolve);
      });

      const hidden=fs.lstatSync(boundListenPath,{bigint:true});
      if(!hidden.isSocket()||hidden.isSymbolicLink()){
        fail("datanet_broadcast_generation_custody_bound_socket_invalid");
      }
      boundSocketIdentity=Object.freeze({
        dev:String(hidden.dev),
        ino:String(hidden.ino),
      });

      if(testOnlySocketPolicyFailure==="chmod"){
        fail("test_only_datanet_broadcast_generation_custody_chmod_failure");
      }
      fs.chmodSync(boundListenPath,0o660);

      if(testOnlySocketPolicyFailure==="chown"){
        fail("test_only_datanet_broadcast_generation_custody_chown_failure");
      }
      if(typeof process.getuid==="function"){
        fs.chownSync(
          boundListenPath,
          -1,
          options.socket_group_gid,
        );
      }

      const configured=fs.lstatSync(boundListenPath,{bigint:true});
      if(
        !configured.isSocket()||
        configured.isSymbolicLink()||
        !sameSocketIdentity(boundSocketIdentity,configured)||
        Number(configured.mode&0o777n)!==0o660||
        configured.gid!==BigInt(options.socket_group_gid)
      ){
        fail(
          "datanet_broadcast_generation_custody_private_socket_policy_invalid",
        );
      }

      fs.linkSync(boundListenPath,options.socket_path);
      const advertised=fs.lstatSync(options.socket_path,{bigint:true});
      if(
        !advertised.isSocket()||
        advertised.isSymbolicLink()||
        !sameSocketIdentity(boundSocketIdentity,advertised)||
        advertised.nlink<2n||
        Number(advertised.mode&0o777n)!==0o660||
        advertised.gid!==BigInt(options.socket_group_gid)
      ){
        fail(
          "datanet_broadcast_generation_custody_advertised_socket_binding_invalid",
        );
      }

      started=true;
      return Object.freeze({
        ok:true,
        status:"started_source_service",
        live_host_qualification_performed:false,
        independent_custody_proven:false,
        runtime_integration:false,
        transaction_broadcast:false,
        funds_movement:false,
      });
    }catch(primary){
      let cleanupError=null;
      try{
        await cleanupResources();
      }catch(error){
        cleanupError=error;
      }
      if(cleanupError!==null){
        throw new AggregateError(
          [primary,cleanupError],
          "datanet_broadcast_generation_custody_startup_cleanup_failed",
        );
      }
      throw primary;
    }
  }

  async function stop(){
    if(
      !started&&
      server===null&&
      pinned===null&&
      boundSocketIdentity===null&&
      boundListenPath===null&&
      sockets.size===0
    ){
      return;
    }
    await cleanupResources();
  }

  const api={start,stop,options};
  if(testOnlySocketPolicyFailure!==null){
    api.testOnlyResourceState=resourceState;
  }
  return Object.freeze(api);
}

export function createVoidDatanetRegistryBroadcastGenerationCustodyServiceV1(
  rawOptions,
){
  return createVoidDatanetRegistryBroadcastGenerationCustodyServiceInternalV1(
    rawOptions,
    null,
  );
}

export function testOnlyCreateVoidDatanetRegistryBroadcastGenerationCustodyServiceV1(
  rawOptions,
  socketPolicyFailure,
){
  return createVoidDatanetRegistryBroadcastGenerationCustodyServiceInternalV1(
    rawOptions,
    socketPolicyFailure,
  );
}

export const VOID_DATANET_REGISTRY_BROADCAST_GENERATION_CUSTODY_SERVICE_CONTRACT_V1 =
  Object.freeze({
    request_schema:REQUEST_SCHEMA,
    response_schema:RESPONSE_SCHEMA,
    record_schema:RECORD_SCHEMA,
    max_request_bytes:MAX_REQUEST_BYTES,
    max_response_bytes:MAX_RESPONSE_BYTES,
    response_timeout_ms:RESPONSE_TIMEOUT_MS,
    server_controlled_socket_path:true,
    server_controlled_fence_root:true,
    stable_fence_identity_rederived:true,
    caller_selected_path:false,
    arbitrary_bytes_write:false,
    source_service_contract_only:true,
    advertised_socket_policy_before_publish:true,
    advertised_socket_unlink_on_stop:false,
    stale_advertised_socket_cleanup_external:true,
    direct_executable_activation:false,
    host_lifecycle_launcher_required:true,
    independent_custody_proven:false,
    live_host_qualification_performed:false,
  });

const invoked=
  process.argv[1]&&
  path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(invoked){
  fail(
    "datanet_broadcast_generation_custody_direct_executable_activation_not_authorized",
  );
}
