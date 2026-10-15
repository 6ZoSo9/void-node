#!/usr/bin/env node
// VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_PUBLIC_INGRESS_V2
import assert from "node:assert/strict";
import crypto from "node:crypto";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { once } from "node:events";
import { spawn } from "node:child_process";

const ROOT=process.cwd();
const GATEWAY=path.join(ROOT,"ops/void-ai-agent-public-gateway-v1.mjs");
const DROPIN=path.join(ROOT,"examples/systemd/void-ai-agent-public-gateway-v1.service.d/71-agent-paid-work-credential-request-gateway-v1.conf");
const V1_PROOF=path.join(ROOT,"scripts/prove_agent_paid_work_credential_request_public_ingress_v1.mjs");
const ROUTE="/__void/agents/paid-work/credential-requests/v1";
const SOURCE_BLOB="058aa319fda0af78e044e278b099471db2e07cf6";
const V1_PROOF_BLOB="33bf8f02914cd22a9cd557e805d853903f20fb2b";

function gitBlob(bytes){
  return crypto.createHash("sha1").update(Buffer.from("blob "+bytes.length+"\0","utf8")).update(bytes).digest("hex");
}
const source=fs.readFileSync(GATEWAY);
const sourceText=source.toString("utf8");
assert.equal(gitBlob(source),SOURCE_BLOB);
assert.equal(gitBlob(fs.readFileSync(V1_PROOF)),V1_PROOF_BLOB);
for(const token of [
  "VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_DOWNSTREAM_PORT",
  "shared_gateway_credential_route_disabled: true",
  "source_downstream_split_integrated: true",
  "shared_listener_exposed: false",
  "downstream_gateway_bypass_closed: false",
  "local_transport_trust_proven: false",
  "handleCredentialDownstreamRequest",
]) assert.ok(sourceText.includes(token),"missing V2 gateway token: "+token);

const dropin=fs.readFileSync(DROPIN,"utf8");
assert.match(dropin,/VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_GATEWAY_UPSTREAM=http:\/\/127\.0\.0\.1:4113/u);
assert.match(dropin,/VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_DOWNSTREAM_PORT=4114/u);

const sha256=(body)=>crypto.createHash("sha256").update(body).digest("hex");
const sleep=(ms)=>new Promise(resolve=>setTimeout(resolve,ms));
async function listen(server){
  server.listen(0,"127.0.0.1");
  await once(server,"listening");
  const a=server.address();
  assert.ok(a&&typeof a!=="string");
  return a.port;
}
function startGateway(extraEnv={}){
  const logs=[];
  const child=spawn(process.execPath,[GATEWAY],{
    cwd:ROOT,
    env:{...process.env,
      VOID_AI_AGENT_PUBLIC_GATEWAY_PROOF_MODE:"1",
      VOID_AI_AGENT_PUBLIC_GATEWAY_PORT:"0",
      VOID_OPERATOR_WEBHOOK_RECEIVER_UPSTREAM:"",
      VOID_AGENT_PAID_WORK_SUBMISSION_RECEIVER_UPSTREAM:"",
      VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_GATEWAY_UPSTREAM:"",
      VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_DOWNSTREAM_PORT:"",
      VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_MAX_BODY_BYTES:"1024",
      VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_MAX_RESPONSE_BYTES:"4096",
      VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_TIMEOUT_MS:"3000",
      ...extraEnv},
    stdio:["ignore","pipe","pipe"],
  });
  child.stdout.on("data",chunk=>logs.push(chunk.toString("utf8")));
  child.stderr.on("data",chunk=>logs.push(chunk.toString("utf8")));
  return {child,logs};
}
async function gatewayReady(runtime){
  for(let attempt=0;attempt<120;attempt+=1){
    if(runtime.child.exitCode!==null) throw new Error("gateway exited before ready: "+runtime.logs.join(""));
    for(const line of runtime.logs.join("").split(/\r?\n/u).filter(Boolean)){
      try{
        const value=JSON.parse(line);
        if(value?.marker==="VOID_AI_AGENT_PUBLIC_GATEWAY_V1"&&value?.ready===true)return value;
      }catch(error){void error;}
    }
    await sleep(30);
  }
  throw new Error("gateway readiness timeout: "+runtime.logs.join(""));
}
async function stopGateway(runtime){
  if(runtime.child.exitCode!==null)return;
  const exit=once(runtime.child,"exit");
  runtime.child.kill("SIGTERM");
  await exit;
}
async function expectExit78(runtime){
  const [code]=await once(runtime.child,"exit");
  assert.equal(code,78,runtime.logs.join(""));
}

const upstreamCalls=[];
const upstream=http.createServer(async(req,res)=>{
  const chunks=[];
  for await(const chunk of req)chunks.push(Buffer.from(chunk));
  const body=Buffer.concat(chunks);
  upstreamCalls.push({method:req.method,url:req.url,body,headers:req.headers});
  const payload=Buffer.from(JSON.stringify({
    marker:"VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_GATEWAY_RESPONSE_V1",
    version:1,ok:true,duplicate:false,
    receipt:{request_id:"voidapwcrq1_"+"a".repeat(64)},
    credential_created:false,credential_registry_mutated:false,
    receiver_restart:false,credential_issuance_authorized:false,
  })+"\n");
  res.writeHead(202,{"content-type":"application/json; charset=utf-8","content-length":String(payload.length),"cache-control":"no-store"});
  res.end(payload);
});
const upstreamPort=await listen(upstream);

const runtime=startGateway({
  VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_GATEWAY_UPSTREAM:`http://127.0.0.1:${upstreamPort}`,
  VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_DOWNSTREAM_PORT:"0",
});
const ready=await gatewayReady(runtime);
assert.equal(ready.shared_gateway_credential_route_disabled,true);
assert.equal(ready.source_downstream_split_integrated,true);
assert.equal(ready.downstream_gateway_bypass_closed,false);
assert.equal(ready.local_transport_trust_proven,false);
assert.equal(ready.bounded_paid_work_credential_request_proxy_authority,true);
assert.equal(ready.paid_work_credential_request_route.shared_listener_exposed,false);
assert.equal(ready.paid_work_credential_request_route.dedicated_listener_host,"127.0.0.1");
assert(Number.isSafeInteger(ready.paid_work_credential_request_route.dedicated_listener_port));
assert(ready.paid_work_credential_request_route.dedicated_listener_port>0);

const sharedBase=`http://127.0.0.1:${ready.port}`;
const dedicatedBase=`http://127.0.0.1:${ready.paid_work_credential_request_route.dedicated_listener_port}`;
const validBody=Buffer.from(JSON.stringify({
  marker:"VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_V1",version:1,
  request_id:"voidapwcrq1_"+"b".repeat(64),requested_scope:"agent_paid_work_submit",
})+"\n");
const validHash=sha256(validBody);

const shared=await fetch(sharedBase+ROUTE,{method:"POST",headers:{"content-type":"application/json","x-void-payload-sha256":validHash},body:validBody});
assert.equal(shared.status,404);
assert.equal(upstreamCalls.length,0);

const valid=await fetch(dedicatedBase+ROUTE,{
  method:"POST",
  headers:{"content-type":"application/json","x-void-payload-sha256":validHash,
    "x-forwarded-for":"203.0.113.9","forwarded":"for=203.0.113.9","x-void-proxy-v2-source-key":"caller-controlled"},
  body:validBody,redirect:"manual",
});
assert.equal(valid.status,202);
assert.equal(valid.headers.get("x-void-agent-paid-work-credential-request-route"),"v1");
assert.equal(upstreamCalls.length,1);
for(const h of ["x-forwarded-for","forwarded","x-void-proxy-v2-source-key"]){
  assert.equal(upstreamCalls[0].headers[h],undefined,"source identity header leaked downstream: "+h);
}
const method=await fetch(dedicatedBase+ROUTE,{method:"GET"});
assert.equal(method.status,405);
const query=await fetch(dedicatedBase+ROUTE+"?x=1",{method:"POST",headers:{"content-type":"application/json","x-void-payload-sha256":validHash},body:validBody});
assert.equal(query.status,400);
assert.equal((await query.json()).error,"query_not_allowed");
const sibling=await fetch(dedicatedBase+ROUTE+"/status");
assert.equal(sibling.status,404);
assert.equal(upstreamCalls.length,1);
await stopGateway(runtime);

const disabled=startGateway();
const disabledReady=await gatewayReady(disabled);
assert.equal(disabledReady.bounded_paid_work_credential_request_proxy_authority,false);
assert.equal(disabledReady.paid_work_credential_request_route.dedicated_listener_port,null);
const disabledShared=await fetch(`http://127.0.0.1:${disabledReady.port}${ROUTE}`,{
  method:"POST",headers:{"content-type":"application/json","x-void-payload-sha256":validHash},body:validBody,
});
assert.equal(disabledShared.status,404);
await stopGateway(disabled);

await expectExit78(startGateway({VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_GATEWAY_UPSTREAM:`http://127.0.0.1:${upstreamPort}`}));
await expectExit78(startGateway({VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_DOWNSTREAM_PORT:"4114"}));

await new Promise((resolve,reject)=>upstream.close(error=>error?reject(error):resolve()));
console.log("VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_PUBLIC_INGRESS_V2_GREEN");
console.log("shared_gateway_credential_route_disabled=true");
console.log("dedicated_credential_downstream_listener=true");
console.log("source_identity_forwarded_to_gateway=false");
console.log("inner_global_limiter_preserved=true");
console.log("downstream_gateway_bypass_closed=false");
console.log("local_transport_trust_proven=false");
console.log("runtime_integration=false");
console.log("credential_issuance_authority=false");
console.log("funds_movement=false");
