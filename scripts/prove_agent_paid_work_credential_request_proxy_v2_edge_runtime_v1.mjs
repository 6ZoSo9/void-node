#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { once } from "node:events";
import { spawn } from "node:child_process";

const ROOT=process.cwd();
const ADAPTER=path.join(ROOT,"ops/void-agent-credential-request-proxy-v2-edge-v1.mjs");
const UNIT=path.join(ROOT,"examples/systemd/void-agent-credential-request-proxy-v2-edge-v1.service");
const ROUTE="/__void/agents/paid-work/credential-requests/v1";
const adapterSource=fs.readFileSync(ADAPTER,"utf8");
assert.match(adapterSource,/const HTTP_HEADER_TERMINATOR_BYTES=4;/u);
assert.match(
  adapterSource,
  /MAX_PROXY_HEADER_BYTES\+\s*MAX_HTTP_HEADER_BYTES\+\s*HTTP_HEADER_TERMINATOR_BYTES\+\s*VOID_AGENT_CREDENTIAL_REQUEST_MAX_BODY_BYTES_V1/su,
);
assert.match(
  adapterSource,
  /const bodyStart=headerEnd\+HTTP_HEADER_TERMINATOR_BYTES;/u,
);
assert.doesNotMatch(adapterSource,/const bodyStart=headerEnd\+4;/u);
const SIGNATURE=Buffer.from([0x0d,0x0a,0x0d,0x0a,0x00,0x0d,0x0a,0x51,0x55,0x49,0x54,0x0a]);

function proxy4(a,b,c,d,sourcePort=50000){
  const address=Buffer.alloc(12);
  address.set([a,b,c,d],0);
  address.set([127,0,0,1],4);
  address.writeUInt16BE(sourcePort,8);
  address.writeUInt16BE(443,10);
  const header=Buffer.alloc(16);
  SIGNATURE.copy(header,0);
  header[12]=0x21;
  header[13]=0x11;
  header.writeUInt16BE(address.length,14);
  return Buffer.concat([header,address]);
}
function requestBytes(proxy,body,{hash,extraHeaders=[]}={}){
  const digest=hash??crypto.createHash("sha256").update(body).digest("hex");
  const lines=[
    "POST "+ROUTE+" HTTP/1.1",
    "Host: public.example",
    "Content-Type: application/json",
    "Content-Length: "+body.length,
    "X-Void-Payload-Sha256: "+digest,
    ...extraHeaders,
    "Connection: close",
    "",
    "",
  ];
  return Buffer.concat([proxy,Buffer.from(lines.join("\r\n"),"ascii"),body]);
}
async function listen(server){
  server.listen(0,"127.0.0.1");
  await once(server,"listening");
  const a=server.address();
  assert.ok(a&&typeof a!=="string");
  return a.port;
}
async function sendRawChunks(port,writes){
  const socket=net.createConnection({host:"127.0.0.1",port});
  socket.setNoDelay(true);
  const chunks=[];
  socket.on("data",chunk=>chunks.push(Buffer.from(chunk)));
  await once(socket,"connect");
  for(const [index,bytes] of writes.entries()){
    socket.write(bytes);
    if(index+1<writes.length){
      await new Promise(resolve=>setTimeout(resolve,20));
    }
  }
  await once(socket,"close");
  const response=Buffer.concat(chunks).toString("utf8");
  const split=response.indexOf("\r\n\r\n");
  assert(split>0,response);
  const head=response.slice(0,split);
  const body=response.slice(split+4);
  const match=/^HTTP\/1\.1 (\d{3}) /u.exec(head);
  assert(match,response);
  return {status:Number(match[1]),head,body};
}
async function sendRaw(port,bytes){
  return sendRawChunks(port,[[bytes]]);
}
function maxHeaderRequestParts(proxy,body){
  const digest=crypto.createHash("sha256").update(body).digest("hex");
  const lines=[
    "POST "+ROUTE+" HTTP/1.1",
    "Host: public.example",
    "Content-Type: application/json",
    "Content-Length: "+body.length,
    "X-Void-Payload-Sha256: "+digest,
    "Connection: close",
    "X-Pad: ",
  ];
  const prefix=Buffer.from(lines.join("\r\n"),"ascii");
  const fillerBytes=32*1024-prefix.length;
  assert(fillerBytes>=0);
  const header=Buffer.concat([prefix,Buffer.alloc(fillerBytes,0x61)]);
  assert.equal(header.length,32*1024);
  const terminator=Buffer.from("\r\n\r\n","ascii");
  return Object.freeze({
    beforeTerminator:Buffer.concat([proxy,header]),
    firstTerminatorByte:terminator.subarray(0,1),
    restAndBody:Buffer.concat([terminator.subarray(1),body]),
  });
}
function startAdapter({port,gatewayPort,stateFile,maxRequests=1}){
  const logs=[];
  const child=spawn(process.execPath,[ADAPTER],{
    cwd:ROOT,
    env:{...process.env,
      VOID_AGENT_CREDENTIAL_REQUEST_PROXY_V2_EDGE_PROOF_MODE:"1",
      VOID_AGENT_CREDENTIAL_REQUEST_PROXY_V2_EDGE_PORT:String(port),
      VOID_AGENT_CREDENTIAL_REQUEST_PROXY_V2_GATEWAY_UPSTREAM:`http://127.0.0.1:${gatewayPort}`,
      VOID_AGENT_CREDENTIAL_REQUEST_PROXY_V2_RATE_STATE_FILE:stateFile,
      VOID_AGENT_CREDENTIAL_REQUEST_PROXY_V2_RATE_WINDOW_MS:"60000",
      VOID_AGENT_CREDENTIAL_REQUEST_PROXY_V2_MAX_REQUESTS_PER_SOURCE:String(maxRequests),
    },
    stdio:["ignore","pipe","pipe"],
  });
  child.stdout.on("data",chunk=>logs.push(chunk.toString("utf8")));
  child.stderr.on("data",chunk=>logs.push(chunk.toString("utf8")));
  return {child,logs};
}
async function ready(runtime){
  for(let i=0;i<120;i+=1){
    if(runtime.child.exitCode!==null)throw new Error(runtime.logs.join(""));
    for(const line of runtime.logs.join("").split(/\r?\n/u).filter(Boolean)){
      try{
        const value=JSON.parse(line);
        if(value?.marker==="VOID_AGENT_CREDENTIAL_REQUEST_PROXY_V2_EDGE_RUNTIME_V1"&&value.ready===true)return value;
      }catch(error){void error;}
    }
    await new Promise(resolve=>setTimeout(resolve,25));
  }
  throw new Error("adapter readiness timeout: "+runtime.logs.join(""));
}
async function stop(runtime){
  if(runtime.child.exitCode!==null)return;
  const exit=once(runtime.child,"exit");
  runtime.child.kill("SIGTERM");
  await exit;
}

const gatewayCalls=[];
const gateway=http.createServer(async(req,res)=>{
  const chunks=[];
  for await(const chunk of req)chunks.push(Buffer.from(chunk));
  const body=Buffer.concat(chunks);
  gatewayCalls.push({method:req.method,url:req.url,headers:req.headers,body});
  const payload=Buffer.from(JSON.stringify({ok:true,accepted_for_review:true})+"\n");
  res.writeHead(202,{"content-type":"application/json","content-length":String(payload.length),"cache-control":"no-store"});
  res.end(payload);
});
const gatewayPort=await listen(gateway);
const root=fs.mkdtempSync(path.join(os.tmpdir(),"void-credential-edge-v1-"));
fs.chmodSync(root,0o700);
const stateFile=path.join(root,"rate-state.json");
try{
  let runtime=startAdapter({port:0,gatewayPort,stateFile,maxRequests:1});
  let info=await ready(runtime);
  assert.equal(info.host,"127.0.0.1");
  assert.equal(info.proxy_v2_required,true);
  assert.equal(info.http_parser_stream_binding_proven,true);
  assert.equal(info.admitted_event_persisted_before_forward,true);
  assert.equal(info.local_transport_trust_proven,false);
  assert.equal(info.runtime_integration,false);

  const body=Buffer.from(JSON.stringify({
    marker:"VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_V1",
    version:1,
    request_id:"voidapwcrq1_"+"c".repeat(64),
    requested_scope:"agent_paid_work_submit",
  })+"\n");

  const a1=await sendRaw(info.port,requestBytes(proxy4(203,0,113,10),body,{
    extraHeaders:[
      "Forwarded: for=198.51.100.9",
      "X-Forwarded-For: 198.51.100.9",
      "X-Void-Proxy-V2-Source-Key: caller-selected",
    ],
  }));
  assert.equal(a1.status,202);
  assert.equal(gatewayCalls.length,1);
  assert.equal(gatewayCalls[0].method,"POST");
  assert.equal(gatewayCalls[0].url,ROUTE);
  assert.equal(gatewayCalls[0].body.equals(body),true);
  assert.equal(gatewayCalls[0].headers.forwarded,undefined);
  assert.equal(gatewayCalls[0].headers["x-forwarded-for"],undefined);
  assert.equal(gatewayCalls[0].headers["x-void-proxy-v2-source-key"],undefined);

  const a2=await sendRaw(info.port,requestBytes(proxy4(203,0,113,10,50001),body));
  assert.equal(a2.status,429);
  assert.equal(gatewayCalls.length,1);

  const b1=await sendRaw(info.port,requestBytes(proxy4(203,0,113,11),body));
  assert.equal(b1.status,202);
  assert.equal(gatewayCalls.length,3);

  const boundaryParts=maxHeaderRequestParts(proxy4(203,0,113,13),body);
  const boundary=await sendRawChunks(info.port,[
    [boundaryParts.beforeTerminator],
    [boundaryParts.firstTerminatorByte],
    [boundaryParts.restAndBody],
  ]);
  assert.equal(boundary.status,202);
  assert.equal(gatewayCalls.length,3);

  const badHash=await sendRaw(info.port,requestBytes(proxy4(203,0,113,12),body,{hash:"0".repeat(64)}));
  assert.equal(badHash.status,400);
  const state=JSON.parse(fs.readFileSync(stateFile,"utf8"));
  assert.equal(state.events.length,3,"invalid request must not debit durable source rate state");

  const direct=await sendRaw(info.port,requestBytes(Buffer.alloc(0),body));
  assert.equal(direct.status,400);
  assert.equal(gatewayCalls.length,3);

  const oversizedProxy=Buffer.alloc(16);
  SIGNATURE.copy(oversizedProxy,0);
  oversizedProxy[12]=0x21;
  oversizedProxy[13]=0x11;
  oversizedProxy.writeUInt16BE(497,14);
  const oversized=await sendRaw(
    info.port,
    requestBytes(oversizedProxy,body),
  );
  assert.equal(oversized.status,413);
  assert.equal(gatewayCalls.length,3);

  await stop(runtime);
  runtime=startAdapter({port:0,gatewayPort,stateFile,maxRequests:1});
  info=await ready(runtime);
  const replay=await sendRaw(info.port,requestBytes(proxy4(203,0,113,10),body));
  assert.equal(replay.status,429,"restart must preserve durable source debit");
  await stop(runtime);

  const unit=fs.readFileSync(UNIT,"utf8");
  for(const line of [
    "User=voidcrededge",
    "Group=voidcrededge",
    "StateDirectory=void-agent-credential-request-proxy-v2-edge-v1",
    "StateDirectoryMode=0700",
    "Environment=VOID_AGENT_CREDENTIAL_REQUEST_PROXY_V2_EDGE_PORT=9899",
    "Environment=VOID_AGENT_CREDENTIAL_REQUEST_PROXY_V2_GATEWAY_UPSTREAM=http://127.0.0.1:4114",
    "NoNewPrivileges=true",
    "RestrictAddressFamilies=AF_INET",
    "CapabilityBoundingSet=",
    "AmbientCapabilities=",
  ])assert.ok(unit.includes(line),line);

  console.log("VOID_AGENT_CREDENTIAL_REQUEST_PROXY_V2_EDGE_RUNTIME_V1_GREEN");
  console.log("proxy_v2_stream_bound=true");
  console.log("max_http_header_split_terminator_accepted=true");
  console.log("exact_credential_post_only=true");
  console.log("durable_rate_debit_before_forward=true");
  console.log("same_source_ephemeral_port_rotation_isolated=false");
  console.log("caller_a_exhaustion_does_not_deny_caller_b=true");
  console.log("spoofable_source_headers_forwarded=false");
  console.log("restart_rate_state_preserved=true");
  console.log("local_transport_trust_proven=false");
  console.log("tailscale_funnel_configuration_verified=false");
  console.log("runtime_integration=false");
  console.log("funds_movement=false");
}finally{
  await new Promise((resolve,reject)=>gateway.close(error=>error?reject(error):resolve()));
  fs.rmSync(root,{recursive:true,force:true});
}
