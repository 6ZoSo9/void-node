#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";

import {
  VOID_DATANET_REGISTRY_BROADCAST_GENERATION_CUSTODY_SERVICE_AUTHORITY_V1,
  VOID_DATANET_REGISTRY_BROADCAST_GENERATION_CUSTODY_SERVICE_CONTRACT_V1,
  VOID_DATANET_REGISTRY_BROADCAST_GENERATION_CUSTODY_SERVICE_V1,
  createVoidDatanetRegistryBroadcastGenerationCustodyServiceV1,
  handleVoidDatanetRegistryBroadcastGenerationCustodyEnvelopeV1,
  testOnlyCreateVoidDatanetRegistryBroadcastGenerationCustodyServiceV1,
} from "../tools/void-datanet-registry-broadcast-generation-custody-service-v1.mjs";
import {
  VOID_DATANET_REGISTRY_BROADCAST_GENERATION_CUSTODY_CLIENT_AUTHORITY_V1,
  createVoidDatanetRegistryBroadcastGenerationCustodyTransportV1,
} from "../tools/void-datanet-registry-broadcast-generation-custody-client-v1.mjs";

const MARKER=
  "VOID_DATANET_REGISTRY_BROADCAST_GENERATION_CUSTODY_SERVICE_V1_PROOF_GREEN";

function canonical(value){
  if(value===null||typeof value==="string"||typeof value==="boolean") return value;
  if(typeof value==="number"&&Number.isSafeInteger(value)) return value;
  if(Array.isArray(value)) return value.map(canonical);
  return Object.fromEntries(
    Object.keys(value).sort().map((key)=>[key,canonical(value[key])]),
  );
}
function canonicalJson(value){
  return JSON.stringify(canonical(value));
}
function sha256(value){
  return crypto.createHash("sha256").update(value).digest("hex");
}
function fence(seed,overrides={}){
  const identity={
    marker:"VOID_DATANET_REGISTRY_BROADCAST_GENERATION_FENCE_V1",
    version:1,
    broadcast_operation_id:"voiddrbo1_"+seed.repeat(64),
    broadcast_authorization_id:"voiddrba1_"+seed.repeat(64),
    broadcast_authorization_request_id:"voiddrbar1_"+seed.repeat(64),
    signed_transaction_id:"voiddrstx1_"+seed.repeat(64),
    signed_transaction_hash:"0x"+seed.repeat(64),
    state_store_realpath_sha256:sha256("/var/lib/void-datanet/state-"+seed),
    one_submission_attempt_only:true,
    automatic_retry_authorized:false,
    replacement_transaction_authorized:false,
  };
  return Object.freeze({
    ...identity,
    broadcast_generation_fence_id:
      "voiddrbgf1_"+sha256(Buffer.from(canonicalJson(identity))),
    observed_consumption_record_id:"voiddrbac1_"+seed.repeat(64),
    observed_state_store_root_dev:String(100+Number.parseInt(seed,16)),
    observed_state_store_root_ino:String(200+Number.parseInt(seed,16)),
    ...overrides,
  });
}

const root=fs.mkdtempSync(
  path.join(os.tmpdir(),"void-datanet-broadcast-custody-service-v1-"),
);
fs.chmodSync(root,0o700);
const socketParent=path.join(root,"run");
const fenceRoot=path.join(root,"fences");
fs.mkdirSync(socketParent,{mode:0o750});
fs.mkdirSync(fenceRoot,{mode:0o700});
fs.chmodSync(socketParent,0o750);
fs.chmodSync(fenceRoot,0o700);
const socketGroup=
  typeof process.getgid==="function"
    ? process.getgid()
    : 0;
const socketPath=path.join(socketParent,"custody.sock");
const options=Object.freeze({
  socket_path:socketPath,
  fence_root:fenceRoot,
  socket_group_gid:socketGroup,
});

const service=createVoidDatanetRegistryBroadcastGenerationCustodyServiceV1(
  options,
);

async function proveStartupRollback(failureKind){
  const failedSocket=path.join(
    socketParent,
    "custody-"+failureKind+".sock",
  );
  const failedOptions=Object.freeze({
    socket_path:failedSocket,
    fence_root:fenceRoot,
    socket_group_gid:socketGroup,
  });
  const failedService=
    testOnlyCreateVoidDatanetRegistryBroadcastGenerationCustodyServiceV1(
      failedOptions,
      failureKind,
    );

  await assert.rejects(
    failedService.start(),
    new RegExp(
      "test_only_datanet_broadcast_generation_custody_"+
      failureKind+
      "_failure",
      "u",
    ),
  );

  assert.deepEqual(
    failedService.testOnlyResourceState(),
    {
      started:false,
      server_present:false,
      server_listening:false,
      pinned_root_open:false,
      bound_socket_identity:false,
      private_listen_path_bound:false,
      accepted_socket_count:0,
    },
  );
  assert.equal(
    fs.existsSync(failedSocket),
    false,
    failureKind+" startup failure must remove the Unix socket path",
  );

  const retry=
    createVoidDatanetRegistryBroadcastGenerationCustodyServiceV1(
      failedOptions,
    );
  const retryStarted=await retry.start();
  assert.equal(retryStarted.ok,true);
  assert.equal(fs.existsSync(failedSocket),true);
  await retry.stop();
  assert.equal(
    fs.existsSync(failedSocket),
    false,
    failureKind+" cleanup must leave the same path reusable",
  );
}

await proveStartupRollback("chmod");
await proveStartupRollback("chown");

async function proveReplacementSocketPreservedOnStop(){
  const replacedPath=path.join(socketParent,"custody-replacement.sock");
  const replacedOptions=Object.freeze({
    socket_path:replacedPath,
    fence_root:fenceRoot,
    socket_group_gid:socketGroup,
  });
  const replacedService=
    createVoidDatanetRegistryBroadcastGenerationCustodyServiceV1(
      replacedOptions,
    );
  const successor=net.createServer((socket)=>socket.end("successor\n"));
  let successorStarted=false;
  try{
    await replacedService.start();
    const original=fs.lstatSync(replacedPath,{bigint:true});
    assert.equal(original.isSocket(),true);

    fs.unlinkSync(replacedPath);
    await new Promise((resolve,reject)=>{
      successor.once("error",reject);
      successor.listen(replacedPath,resolve);
    });
    successorStarted=true;
    fs.chmodSync(replacedPath,0o660);
    if(typeof process.getuid==="function"){
      fs.chownSync(replacedPath,-1,socketGroup);
    }
    const successorBefore=fs.lstatSync(replacedPath,{bigint:true});
    assert.equal(successorBefore.isSocket(),true);
    assert.notEqual(String(successorBefore.ino),String(original.ino));

    await replacedService.stop();

    const successorAfter=fs.lstatSync(replacedPath,{bigint:true});
    assert.equal(successorAfter.isSocket(),true);
    assert.equal(String(successorAfter.dev),String(successorBefore.dev));
    assert.equal(String(successorAfter.ino),String(successorBefore.ino));
    assert.equal(successor.listening,true);

    const reply=await new Promise((resolve,reject)=>{
      const socket=net.createConnection(replacedPath);
      let input="";
      socket.setEncoding("utf8");
      socket.once("error",reject);
      socket.on("data",(chunk)=>{input+=chunk;});
      socket.on("end",()=>resolve(input));
    });
    assert.equal(reply,"successor\n");
  }finally{
    try{
      await replacedService.stop();
    }catch(error){
      void error;
    }
    if(successorStarted){
      await new Promise((resolve)=>successor.close(()=>resolve()));
    }
  }
  assert.equal(
    fs.existsSync(replacedPath),
    false,
    "successor owns normal unlink only after its own close",
  );
}

await proveReplacementSocketPreservedOnStop();

try{
  const started=await service.start();
  assert.equal(started.ok,true);
  assert.equal(started.independent_custody_proven,false);
  assert.equal(started.live_host_qualification_performed,false);

  const socketStat=fs.lstatSync(socketPath);
  assert.equal(socketStat.isSocket(),true);
  assert.equal(socketStat.mode&0o777,0o660);
  assert.equal(socketStat.gid,socketGroup);

  const transport=
    createVoidDatanetRegistryBroadcastGenerationCustodyTransportV1({
      socket_path:socketPath,
      connect_timeout_ms:500,
      response_timeout_ms:500,
      max_response_bytes:64*1024,
    });

  const firstFence=fence("a");
  const c1=new AbortController();
  const first=await transport.claim(firstFence,{
    signal:c1.signal,
    timeout_ms:1000,
  });
  assert.equal(first.ok,true);
  assert.equal(first.status,"created");
  assert.equal(first.operation_performed,true);
  assert.equal(first.independent_custody_proven,false);
  assert.equal(first.live_host_qualification_performed,false);
  assert.match(first.custody_receipt_sha256,/^sha256:[0-9a-f]{64}$/u);

  const asserted=await transport.assert(first,firstFence,{
    signal:new AbortController().signal,
    timeout_ms:1000,
  });
  assert.equal(asserted.ok,true);
  assert.equal(asserted.status,"asserted");
  assert.equal(
    asserted.custody_receipt_sha256,
    first.custody_receipt_sha256,
  );

  const replay=await transport.claim(firstFence,{
    signal:new AbortController().signal,
    timeout_ms:1000,
  });
  assert.equal(replay.ok,true);
  assert.equal(replay.status,"exists");
  assert.equal(replay.operation_performed,false);
  assert.equal(
    replay.custody_receipt_sha256,
    first.custody_receipt_sha256,
  );

  const replacement=fence("a",{
    observed_consumption_record_id:"voiddrbac1_"+"b".repeat(64),
    observed_state_store_root_dev:"999",
    observed_state_store_root_ino:"1000",
  });
  assert.equal(
    replacement.broadcast_generation_fence_id,
    firstFence.broadcast_generation_fence_id,
  );
  const replacementReplay=await transport.claim(replacement,{
    signal:new AbortController().signal,
    timeout_ms:1000,
  });
  assert.equal(replacementReplay.ok,true);
  assert.equal(replacementReplay.status,"exists");
  assert.equal(
    replacementReplay.custody_receipt_sha256,
    first.custody_receipt_sha256,
  );

  const recordPath=path.join(
    fenceRoot,
    firstFence.broadcast_generation_fence_id+".json",
  );
  assert.equal(fs.existsSync(recordPath),true);
  const originalBytes=fs.readFileSync(recordPath);
  fs.writeFileSync(recordPath,"{}\n",{mode:0o600});
  fs.chmodSync(recordPath,0o600);
  const tampered=await transport.assert(first,firstFence,{
    signal:new AbortController().signal,
    timeout_ms:1000,
  });
  assert.equal(tampered.ok,false);
  assert.equal(tampered.status,"held");
  assert.equal(tampered.independent_custody_proven,false);
  fs.writeFileSync(recordPath,originalBytes,{mode:0o600});
  fs.chmodSync(recordPath,0o600);

  const injected=await handleVoidDatanetRegistryBroadcastGenerationCustodyEnvelopeV1(
    options,
    {
      schema:
        "void_datanet_registry_broadcast_generation_custody_request_v1",
      marker:VOID_DATANET_REGISTRY_BROADCAST_GENERATION_CUSTODY_SERVICE_V1,
      version:1,
      method:"claim",
      fence:firstFence,
      custody_receipt_sha256:null,
      fence_root:"/tmp/attacker",
    },
  );
  assert.equal(injected.decision.ok,false);
  assert.equal(injected.decision.operation_performed,false);

  const secondFence=fence("c");
  const second=await transport.claim(secondFence,{
    signal:new AbortController().signal,
    timeout_ms:1000,
  });
  assert.equal(second.ok,true);
  assert.equal(second.status,"created");
  assert.notEqual(
    second.broadcast_generation_fence_id,
    first.broadcast_generation_fence_id,
  );
}finally{
  await service.stop();
}

const hungParent=path.join(root,"hung-run");
fs.mkdirSync(hungParent,{mode:0o750});
fs.chmodSync(hungParent,0o750);
const hungSocket=path.join(hungParent,"custody.sock");
let hungAccepted=0;
let hungClosed=0;
let resolveHungClose;
const hungClosePromise=new Promise((resolve)=>{
  resolveHungClose=resolve;
});
const hungServer=net.createServer((socket)=>{
  hungAccepted+=1;
  socket.on("close",()=>{
    hungClosed+=1;
    resolveHungClose();
  });
  socket.resume();
});
await new Promise((resolve,reject)=>{
  hungServer.once("error",reject);
  hungServer.listen(hungSocket,resolve);
});
fs.chmodSync(hungSocket,0o660);
if(typeof process.getuid==="function"){
  fs.chownSync(hungSocket,-1,socketGroup);
}
try{
  const hungTransport=
    createVoidDatanetRegistryBroadcastGenerationCustodyTransportV1({
      socket_path:hungSocket,
      connect_timeout_ms:500,
      response_timeout_ms:1000,
      max_response_bytes:64*1024,
    });
  const controller=new AbortController();
  const timer=setTimeout(
    ()=>controller.abort(new Error("synthetic_custody_abort")),
    50,
  );
  await assert.rejects(
    hungTransport.claim(fence("d"),{
      signal:controller.signal,
      timeout_ms:1000,
    }),
    /synthetic_custody_abort/u,
  );
  clearTimeout(timer);
  await Promise.race([
    hungClosePromise,
    new Promise((_,reject)=>setTimeout(
      ()=>reject(new Error("hung_socket_close_timeout")),
      1000,
    )),
  ]);
  assert.equal(hungAccepted,1);
  assert.equal(hungClosed,1);
}finally{
  await new Promise((resolve)=>hungServer.close(()=>resolve()));
}

const accessorOptions={
  socket_path:socketPath,
  connect_timeout_ms:500,
  response_timeout_ms:500,
  max_response_bytes:64*1024,
};
let accessorReads=0;
Object.defineProperty(accessorOptions,"socket_path",{
  enumerable:true,
  get(){
    accessorReads+=1;
    return socketPath;
  },
});
assert.throws(
  ()=>createVoidDatanetRegistryBroadcastGenerationCustodyTransportV1(
    accessorOptions,
  ),
  /client_options_invalid/u,
);
assert.equal(accessorReads,0);

const serviceSource=fs.readFileSync(
  "tools/void-datanet-registry-broadcast-generation-custody-service-v1.mjs",
  "utf8",
);
const clientSource=fs.readFileSync(
  "tools/void-datanet-registry-broadcast-generation-custody-client-v1.mjs",
  "utf8",
);
for(const required of [
  "O_EXCL",
  "O_NOFOLLOW",
  "/proc/self/fd/",
  "fs.fsyncSync",
  "server_controlled_fence_root:true",
  "freshBoundListenPath",
  "fs.linkSync(boundListenPath,options.socket_path)",
  "independent_custody_proven:false",
]){
  assert.ok(serviceSource.includes(required),required);
}
for(const forbidden of [
  "eth_sendRawTransaction",
  "wallet.connect",
]){
  assert.equal(serviceSource.includes(forbidden),false,forbidden);
}
for(const required of [
  "abort_signal_required:true",
  "context.signal",
  "socket.destroy",
  "connect_timeout_ms",
  "response_timeout_ms",
  "caller_selected_socket_per_request:false",
]){
  assert.ok(clientSource.includes(required),required);
}

for(const [key,value] of Object.entries(
  VOID_DATANET_REGISTRY_BROADCAST_GENERATION_CUSTODY_SERVICE_AUTHORITY_V1,
)){
  if([
    "source_only_service",
    "unix_socket_only",
    "server_controlled_socket_path",
    "server_controlled_fence_root",
    "exact_request_schema_required",
    "exact_response_schema_required",
    "stable_fence_identity_rederived",
    "create_only_record",
    "descriptor_pinned_fence_root",
  ].includes(key)){
    assert.equal(value,true,key);
  }
}
assert.equal(
  VOID_DATANET_REGISTRY_BROADCAST_GENERATION_CUSTODY_SERVICE_CONTRACT_V1
    .independent_custody_proven,
  false,
);
assert.equal(
  VOID_DATANET_REGISTRY_BROADCAST_GENERATION_CUSTODY_CLIENT_AUTHORITY_V1
    .abort_destroys_socket,
  true,
);

console.log(MARKER);
console.log("stable_fence_identity_rederived=true");
console.log("create_only_record=true");
console.log("same_path_replacement_maps_to_existing_slot=true");
console.log("record_tamper_holds=true");
console.log("caller_selected_path=false");
console.log("replacement_socket_preserved_on_old_listener_close=true");
console.log("abort_signal_destroys_unresponsive_socket=true");
console.log("startup_chmod_failure_rolls_back_all_resources=true");
console.log("startup_chown_failure_rolls_back_all_resources=true");
console.log("startup_failure_same_path_retry_succeeds=true");
console.log("source_service_contract_only=true");
console.log("independent_custody_proven=false");
console.log("live_host_qualification_performed=false");
console.log("runtime_integration=false");
console.log("transaction_broadcast=false");
console.log("funds_movement=false");

fs.rmSync(root,{recursive:true,force:true});
