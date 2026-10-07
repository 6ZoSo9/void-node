#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

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
    true,
    failureKind+" successful stop retains the advertised stale link",
  );
  await assert.rejects(
    new Promise((resolve,reject)=>{
      const socket=net.createConnection(failedSocket);
      socket.once("connect",()=>resolve());
      socket.once("error",reject);
    }),
    (error)=>error?.code==="ECONNREFUSED",
    failureKind+" stopped stale socket must fail closed",
  );
  fs.unlinkSync(failedSocket);
}

await proveStartupRollback("chmod");
await proveStartupRollback("chown");

async function proveConcurrentLifecycle(){
  const racePath=path.join(socketParent,"custody-lifecycle-race.sock");
  const raceOptions=Object.freeze({
    socket_path:racePath,
    fence_root:fenceRoot,
    socket_group_gid:socketGroup,
  });
  const raceService=
    createVoidDatanetRegistryBroadcastGenerationCustodyServiceV1(
      raceOptions,
    );
  const beforeHidden=fs.readdirSync(socketParent)
    .filter((name)=>name.startsWith(".v")).sort();
  const startResults=await Promise.allSettled([
    raceService.start(),
    raceService.start(),
  ]);
  assert.deepEqual(
    startResults.map((result)=>result.status),
    ["fulfilled","rejected"],
  );
  assert.match(
    String(startResults[1].reason?.message||""),
    /datanet_broadcast_generation_custody_lifecycle_busy/u,
  );
  assert.equal(fs.lstatSync(racePath).isSocket(),true);

  const stopResults=await Promise.allSettled([
    raceService.stop(),
    raceService.stop(),
  ]);
  assert.deepEqual(
    stopResults.map((result)=>result.status),
    ["fulfilled","rejected"],
  );
  assert.match(
    String(stopResults[1].reason?.message||""),
    /datanet_broadcast_generation_custody_lifecycle_busy/u,
  );
  assert.equal(
    fs.existsSync(racePath),
    true,
    "stale advertised socket must stay fail closed",
  );
  assert.deepEqual(
    fs.readdirSync(socketParent)
      .filter((name)=>name.startsWith(".v")).sort(),
    beforeHidden,
    "concurrent lifecycle must not leak a private listener",
  );
  await assert.rejects(
    new Promise((resolve,reject)=>{
      const socket=net.createConnection(racePath);
      socket.once("connect",()=>resolve());
      socket.once("error",reject);
    }),
    (error)=>error?.code==="ECONNREFUSED",
  );
  fs.unlinkSync(racePath);
}

await proveConcurrentLifecycle();

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

  const stickyClientFence=fence("f");
  const stickyClientEnvelope={
    schema:
      "void_datanet_registry_broadcast_generation_custody_request_v1",
    marker:VOID_DATANET_REGISTRY_BROADCAST_GENERATION_CUSTODY_SERVICE_V1,
    version:1,
    method:"claim",
    fence:stickyClientFence,
    custody_receipt_sha256:null,
  };
  let stickyClientResponse=null;
  await Promise.race([
    new Promise((resolve,reject)=>{
      const socket=net.createConnection(socketPath);
      let input="";
      socket.setEncoding("utf8");
      socket.once("error",reject);
      socket.once("connect",()=>{
        socket.write(JSON.stringify(stickyClientEnvelope)+"\n");
      });
      socket.on("data",(chunk)=>{
        input+=chunk;
        const newline=input.indexOf("\n");
        if(newline<0||stickyClientResponse!==null) return;
        stickyClientResponse=JSON.parse(input.slice(0,newline));
      });
      socket.once("close",()=>{
        try{
          assert(stickyClientResponse);
          assert.equal(stickyClientResponse.decision.ok,true);
          resolve();
        }catch(error){
          reject(error);
        }
      });
    }),
    new Promise((_,reject)=>setTimeout(
      ()=>reject(new Error("service_completed_response_close_timeout")),
      1500,
    )),
  ]);

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
  const originalRecord=JSON.parse(originalBytes.toString("utf8"));
  const tamperCases=[
    {
      label:"top-level-extra",
      mutate:(record)=>({...record,extra_field:"forbidden"}),
    },
    {
      label:"policy-extra",
      mutate:(record)=>({
        ...record,
        policy:{...record.policy,extra_field:"forbidden"},
      }),
    },
    {
      label:"first-observation-extra",
      mutate:(record)=>({
        ...record,
        first_observation:{
          ...record.first_observation,
          extra_field:"forbidden",
        },
      }),
    },
    {
      label:"identity-extra",
      mutate:(record)=>({
        ...record,
        fence_identity:{
          ...record.fence_identity,
          extra_field:"forbidden",
        },
      }),
    },
  ];
  for(const tamperCase of tamperCases){
    const changed=tamperCase.mutate(structuredClone(originalRecord));
    fs.writeFileSync(
      recordPath,
      JSON.stringify(changed,null,2)+"\n",
      {mode:0o600},
    );
    fs.chmodSync(recordPath,0o600);
    const tampered=await transport.assert(first,firstFence,{
      signal:new AbortController().signal,
      timeout_ms:1000,
    });
    assert.equal(tampered.ok,false,tamperCase.label);
    assert.equal(tampered.status,"held",tamperCase.label);
    assert.equal(
      tampered.independent_custody_proven,
      false,
      tamperCase.label,
    );
  }
  fs.writeFileSync(recordPath,originalBytes,{mode:0o600});
  fs.chmodSync(recordPath,0o600);

  const fifoFence=fence("b");
  const fifoPath=path.join(
    fenceRoot,
    fifoFence.broadcast_generation_fence_id+".json",
  );
  const fifoCreate=spawnSync(
    "/usr/bin/mkfifo",
    [fifoPath],
    {
      encoding:"utf8",
      stdio:["ignore","pipe","pipe"],
    },
  );
  assert.equal(
    fifoCreate.status,
    0,
    "FIFO adversary creation failed: "+String(fifoCreate.stderr||""),
  );
  fs.chmodSync(fifoPath,0o600);
  const fifoStarted=Date.now();
  const fifoDecision=await transport.claim(fifoFence,{
    signal:new AbortController().signal,
    timeout_ms:1000,
  });
  assert.equal(fifoDecision.ok,false);
  assert.equal(fifoDecision.status,"held");
  assert.equal(fifoDecision.operation_performed,false);
  assert.ok(
    Date.now()-fifoStarted<1000,
    "FIFO record must HOLD without blocking the service event loop",
  );
  fs.unlinkSync(fifoPath);

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

  const strictStringFields=[
    "broadcast_operation_id",
    "broadcast_authorization_id",
    "broadcast_authorization_request_id",
    "signed_transaction_id",
    "signed_transaction_hash",
    "state_store_realpath_sha256",
    "broadcast_generation_fence_id",
    "observed_consumption_record_id",
    "observed_state_store_root_dev",
    "observed_state_store_root_ino",
  ];
  const generationLocalFields=new Set([
    "observed_consumption_record_id",
    "observed_state_store_root_dev",
    "observed_state_store_root_ino",
  ]);
  for(const field of strictStringFields){
    const invalidFence={
      ...firstFence,
      [field]:[firstFence[field]],
    };
    if(
      field!=="broadcast_generation_fence_id"&&
      !generationLocalFields.has(field)
    ){
      const {
        broadcast_generation_fence_id:_ignoredFenceId,
        observed_consumption_record_id:_ignoredConsumption,
        observed_state_store_root_dev:_ignoredDev,
        observed_state_store_root_ino:_ignoredIno,
        ...stableIdentity
      }=invalidFence;
      invalidFence.broadcast_generation_fence_id=
        "voiddrbgf1_"+sha256(Buffer.from(canonicalJson(stableIdentity)));
    }
    const rejected=
      await handleVoidDatanetRegistryBroadcastGenerationCustodyEnvelopeV1(
        options,
        {
          ...stickyClientEnvelope,
          fence:invalidFence,
        },
      );
    assert.equal(rejected.decision.ok,false,field);
    assert.equal(rejected.decision.operation_performed,false,field);
    if(typeof invalidFence.broadcast_generation_fence_id==="string"){
      assert.equal(
        fs.existsSync(path.join(
          fenceRoot,
          invalidFence.broadcast_generation_fence_id+".json",
        )),
        generationLocalFields.has(field),
        field+" must not create a malformed new fence record",
      );
    }
  }
  const arrayReceipt=await handleVoidDatanetRegistryBroadcastGenerationCustodyEnvelopeV1(
    options,
    {
      ...stickyClientEnvelope,
      method:"assert",
      custody_receipt_sha256:[first.custody_receipt_sha256],
    },
  );
  assert.equal(arrayReceipt.decision.ok,false);
  assert.equal(arrayReceipt.decision.operation_performed,false);

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
assert.equal(
  fs.existsSync(socketPath),
  true,
  "normal stop must retain the advertised stale socket link",
);
await assert.rejects(
  new Promise((resolve,reject)=>{
    const socket=net.createConnection(socketPath);
    socket.once("connect",()=>resolve());
    socket.once("error",reject);
  }),
  (error)=>error?.code==="ECONNREFUSED",
  "stopped advertised socket must fail closed",
);

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

const malformedHeldParent=path.join(root,"malformed-held-run");
fs.mkdirSync(malformedHeldParent,{mode:0o750});
fs.chmodSync(malformedHeldParent,0o750);
const malformedHeldSocket=path.join(malformedHeldParent,"custody.sock");
const malformedHeldServer=net.createServer((socket)=>{
  socket.setEncoding("utf8");
  let input="";
  socket.on("data",(chunk)=>{
    input+=chunk;
    const newline=input.indexOf("\n");
    if(newline<0) return;
    const envelope=JSON.parse(input.slice(0,newline));
    const requestSha256=
      "sha256:"+sha256(Buffer.from(canonicalJson(envelope)));
    socket.end(JSON.stringify({
      schema:
        "void_datanet_registry_broadcast_generation_custody_response_v1",
      marker:VOID_DATANET_REGISTRY_BROADCAST_GENERATION_CUSTODY_SERVICE_V1,
      version:1,
      request_sha256:requestSha256,
      decision:{
        ok:false,
        status:"held",
        reason:"synthetic_hold",
        broadcast_generation_fence_id:null,
        custody_receipt_sha256:null,
        source_service_contract_proven:true,
        independent_custody_proven:false,
        live_host_qualification_performed:false,
        operation_performed:true,
        rpc_access:true,
        transaction_broadcast:false,
        funds_movement:false,
        extra_field:"forbidden",
      },
    })+"\n");
  });
});
await new Promise((resolve,reject)=>{
  malformedHeldServer.once("error",reject);
  malformedHeldServer.listen(malformedHeldSocket,resolve);
});
fs.chmodSync(malformedHeldSocket,0o660);
if(typeof process.getuid==="function"){
  fs.chownSync(malformedHeldSocket,-1,socketGroup);
}
try{
  const malformedHeldTransport=
    createVoidDatanetRegistryBroadcastGenerationCustodyTransportV1({
      socket_path:malformedHeldSocket,
      connect_timeout_ms:500,
      response_timeout_ms:500,
      max_response_bytes:64*1024,
    });
  await assert.rejects(
    malformedHeldTransport.claim(fence("e"),{
      signal:new AbortController().signal,
      timeout_ms:1000,
    }),
    /client_response_invalid/u,
  );
}finally{
  await new Promise((resolve)=>malformedHeldServer.close(()=>resolve()));
}

const stickyHeldParent=path.join(root,"sticky-held-run");
fs.mkdirSync(stickyHeldParent,{mode:0o750});
fs.chmodSync(stickyHeldParent,0o750);
const stickyHeldSocket=path.join(stickyHeldParent,"custody.sock");
let stickyHeldPeerClosed=false;
let resolveStickyHeldClose;
const stickyHeldClose=new Promise((resolve)=>{
  resolveStickyHeldClose=resolve;
});
const stickyHeldServer=net.createServer((socket)=>{
  socket.setEncoding("utf8");
  socket.on("close",()=>{
    stickyHeldPeerClosed=true;
    resolveStickyHeldClose();
  });
  let input="";
  socket.on("data",(chunk)=>{
    input+=chunk;
    const newline=input.indexOf("\n");
    if(newline<0) return;
    const envelope=JSON.parse(input.slice(0,newline));
    const requestSha256=
      "sha256:"+sha256(Buffer.from(canonicalJson(envelope)));
    socket.write(JSON.stringify({
      schema:
        "void_datanet_registry_broadcast_generation_custody_response_v1",
      marker:VOID_DATANET_REGISTRY_BROADCAST_GENERATION_CUSTODY_SERVICE_V1,
      version:1,
      request_sha256:requestSha256,
      decision:{
        ok:false,
        status:"held",
        reason:"synthetic_hold",
        broadcast_generation_fence_id:null,
        custody_receipt_sha256:null,
        source_service_contract_proven:true,
        independent_custody_proven:false,
        live_host_qualification_performed:false,
        operation_performed:false,
        rpc_access:false,
        transaction_broadcast:false,
        funds_movement:false,
      },
    })+"\n");
  });
});
await new Promise((resolve,reject)=>{
  stickyHeldServer.once("error",reject);
  stickyHeldServer.listen(stickyHeldSocket,resolve);
});
fs.chmodSync(stickyHeldSocket,0o660);
if(typeof process.getuid==="function"){
  fs.chownSync(stickyHeldSocket,-1,socketGroup);
}
try{
  const stickyHeldTransport=
    createVoidDatanetRegistryBroadcastGenerationCustodyTransportV1({
      socket_path:stickyHeldSocket,
      connect_timeout_ms:500,
      response_timeout_ms:500,
      max_response_bytes:64*1024,
    });
  const heldDecision=await stickyHeldTransport.claim(fence("1"),{
    signal:new AbortController().signal,
    timeout_ms:1000,
  });
  assert.equal(heldDecision.ok,false);
  assert.equal(heldDecision.reason,"synthetic_hold");
  await Promise.race([
    stickyHeldClose,
    new Promise((_,reject)=>setTimeout(
      ()=>reject(new Error("client_completed_response_close_timeout")),
      1500,
    )),
  ]);
  assert.equal(stickyHeldPeerClosed,true);
}finally{
  await new Promise((resolve)=>stickyHeldServer.close(()=>resolve()));
}

const directService=spawnSync(
  process.execPath,
  ["tools/void-datanet-registry-broadcast-generation-custody-service-v1.mjs"],
  {
    cwd:process.cwd(),
    encoding:"utf8",
    env:{
      PATH:process.env.PATH||"/usr/bin:/bin",
      LANG:"C",
      LC_ALL:"C",
    },
    timeout:5000,
  },
);
assert.notEqual(directService.status,0);
assert.match(
  directService.stderr,
  /datanet_broadcast_generation_custody_direct_executable_activation_not_authorized/u,
);

const malformedParent=path.join(root,"malformed-response-run");
fs.mkdirSync(malformedParent,{mode:0o750});
fs.chmodSync(malformedParent,0o750);
const malformedSocket=path.join(malformedParent,"custody.sock");
let responseMutation=null;
const malformedServer=net.createServer((socket)=>{
  socket.setEncoding("utf8");
  let input="";
  socket.on("error",(error)=>{void error;});
  socket.on("data",(chunk)=>{
    input+=chunk;
    const newline=input.indexOf("\n");
    if(newline<0) return;
    const envelope=JSON.parse(input.slice(0,newline));
    const response={
      schema:"void_datanet_registry_broadcast_generation_custody_response_v1",
      marker:VOID_DATANET_REGISTRY_BROADCAST_GENERATION_CUSTODY_SERVICE_V1,
      version:1,
      request_sha256:"sha256:"+sha256(Buffer.from(canonicalJson(envelope))),
      decision:responseMutation({
        ok:true,
        status:envelope.method==="claim"?"created":"asserted",
        broadcast_generation_fence_id:
          envelope.fence.broadcast_generation_fence_id,
        custody_receipt_sha256:
          envelope.method==="claim"
            ? "sha256:"+"b".repeat(64)
            : envelope.custody_receipt_sha256,
        source_service_contract_proven:true,
        independent_custody_proven:false,
        live_host_qualification_performed:false,
        operation_performed:envelope.method==="claim",
        rpc_access:false,
        transaction_broadcast:false,
        funds_movement:false,
      }),
    };
    socket.end(JSON.stringify(response)+"\n");
  });
});
await new Promise((resolve,reject)=>{
  malformedServer.once("error",reject);
  malformedServer.listen(malformedSocket,resolve);
});
fs.chmodSync(malformedSocket,0o660);
if(typeof process.getuid==="function"){
  fs.chownSync(malformedSocket,-1,socketGroup);
}
try{
  const malformedTransport=
    createVoidDatanetRegistryBroadcastGenerationCustodyTransportV1({
      socket_path:malformedSocket,
      connect_timeout_ms:500,
      response_timeout_ms:500,
      max_response_bytes:64*1024,
    });
  const responseCases=[
    {
      label:"claim_cannot_be_asserted",
      method:"claim",
      mutate:(decision)=>({
        ...decision,
        status:"asserted",
        operation_performed:false,
      }),
    },
    {
      label:"claim_cannot_cross_fence",
      method:"claim",
      mutate:(decision)=>({
        ...decision,
        broadcast_generation_fence_id:"voiddrbgf1_"+"d".repeat(64),
      }),
    },
    {
      label:"assert_cannot_be_created",
      method:"assert",
      mutate:(decision)=>({
        ...decision,
        status:"created",
        operation_performed:true,
      }),
    },
    {
      label:"assert_cannot_change_receipt",
      method:"assert",
      mutate:(decision)=>({
        ...decision,
        custody_receipt_sha256:"sha256:"+"f".repeat(64),
      }),
    },
    {
      label:"held_reason_must_be_string",
      method:"claim",
      mutate:(decision)=>({
        ...decision,
        ok:false,
        status:"held",
        reason:["synthetic_hold"],
        broadcast_generation_fence_id:null,
        custody_receipt_sha256:null,
        operation_performed:false,
      }),
    },
  ];
  for(const testCase of responseCases){
    responseMutation=testCase.mutate;
    const call=testCase.method==="claim"
      ? malformedTransport.claim(
        fence("e"),
        {signal:new AbortController().signal,timeout_ms:1000},
      )
      : malformedTransport.assert(
        {custody_receipt_sha256:"sha256:"+"a".repeat(64)},
        fence("e"),
        {signal:new AbortController().signal,timeout_ms:1000},
      );
    await assert.rejects(
      call,
      /datanet_broadcast_generation_custody_client_response_invalid/u,
      testCase.label,
    );
  }

  // The peer echoes the digest of the *sent* request but forges success
  // against a fence ID mutated by its caller after request serialization.
  const mutableFence={...fence("e")};
  const forgedFenceId="voiddrbgf1_"+"d".repeat(64);
  responseMutation=(decision)=>({
    ...decision,
    broadcast_generation_fence_id:forgedFenceId,
  });
  const inFlight=malformedTransport.claim(mutableFence,{
    signal:new AbortController().signal,
    timeout_ms:1000,
  });
  mutableFence.broadcast_generation_fence_id=forgedFenceId;
  await assert.rejects(
    inFlight,
    /datanet_broadcast_generation_custody_client_response_invalid/u,
    "a caller mutation must not change the accepted fence after send",
  );
}finally{
  await new Promise((resolve)=>malformedServer.close(()=>resolve()));
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
  "Number(fs.constants.O_NONBLOCK||0)",
  "/proc/self/fd/",
  "RECORD_KEYS",
  "FENCE_IDENTITY_KEYS",
  "FIRST_OBSERVATION_KEYS",
  "POLICY_KEYS",
  "fs.fsyncSync",
  "server_controlled_fence_root:true",
  "freshBoundListenPath",
  "fs.linkSync(boundListenPath,options.socket_path)",
  "advertised_socket_policy_before_publish:true",
  "advertised_socket_unlink_on_stop:false",
  "direct_executable_activation:false",
  "host_lifecycle_launcher_required:true",
  "socket.destroySoon()",
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
  "serializedRequest.fence?.broadcast_generation_fence_id",
  "typeof value.reason!==\"string\"",
  "context.signal",
  "socket.destroy",
  "connect_timeout_ms",
  "response_timeout_ms",
  "caller_selected_socket_per_request:false",
  "HELD_DECISION_KEYS",
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
console.log("record_exact_schema_required=true");
console.log("nested_record_exact_schema_required=true");
console.log("caller_selected_path=false");
console.log("malformed_fence_identifier_arrays_rejected=true");
console.log("malformed_assert_receipt_array_rejected=true");
console.log("cross_method_and_cross_fence_success_rejected=true");
console.log("concurrent_start_stop_single_owner=true");
console.log("concurrent_lifecycle_private_listener_leak=false");
console.log("replacement_socket_preserved_on_old_listener_close=true");
console.log("advertised_socket_policy_before_publish=true");
console.log("advertised_socket_unlink_on_stop=false");
console.log("stopped_advertised_socket_fails_closed=true");
console.log("held_response_exact_schema_required=true");
console.log("service_completed_response_forces_socket_close=true");
console.log("client_completed_response_destroys_socket=true");
console.log("direct_executable_activation=false");
console.log("host_lifecycle_launcher_required=true");
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
