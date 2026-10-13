#!/usr/bin/env node
import crypto from "node:crypto";
import http from "node:http";
import net from "node:net";
import process from "node:process";

import {
  VOID_AGENT_CREDENTIAL_REQUEST_MAX_BODY_BYTES_V1,
  VOID_AGENT_CREDENTIAL_REQUEST_MAX_RESPONSE_BYTES_V1,
  VOID_AGENT_CREDENTIAL_REQUEST_PATH_V1,
  VOID_AGENT_CREDENTIAL_REQUEST_TIMEOUT_MS_V1,
  classifyVoidAgentCredentialRequestProxyV2EdgeCompositionV1,
} from "../tools/void-agent-paid-work-credential-request-proxy-v2-edge-composition-v1.mjs";
import {
  parseVoidAgentCredentialRequestProxyV2SourceV1,
} from "../tools/void-agent-paid-work-credential-request-proxy-v2-source-v1.mjs";
import {
  createVoidAgentCredentialRequestProxyV2RateStateV1,
} from "../tools/void-agent-paid-work-credential-request-proxy-v2-rate-state-v1.mjs";

const MARKER="VOID_AGENT_CREDENTIAL_REQUEST_PROXY_V2_EDGE_RUNTIME_V1";
const HOST="127.0.0.1";
const MAX_PROXY_HEADER_BYTES=512;
const MAX_HTTP_HEADER_BYTES=32*1024;
const MAX_CONNECTION_BYTES=
  MAX_PROXY_HEADER_BYTES+
  MAX_HTTP_HEADER_BYTES+
  VOID_AGENT_CREDENTIAL_REQUEST_MAX_BODY_BYTES_V1;
const HEADER_NAME=/^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/u;
const proofMode=process.env.VOID_AGENT_CREDENTIAL_REQUEST_PROXY_V2_EDGE_PROOF_MODE==="1";

function fail(code){throw new Error(code);}
function integer(raw,min,max,code,{allowZero=false}={}){
  const text=String(raw??"").trim();
  if(!/^(0|[1-9][0-9]*)$/u.test(text))fail(code);
  const value=Number(text);
  if(!Number.isSafeInteger(value)||value>max||(value===0?!allowZero:value<min))fail(code);
  return value;
}
function parsePort(name,{allowProofZero=false}={}){
  const value=integer(
    process.env[name],
    1024,
    65535,
    "edge_config_port_invalid:"+name,
    {allowZero:allowProofZero&&proofMode},
  );
  return value;
}
function parseUpstream(){
  const raw=String(
    process.env.VOID_AGENT_CREDENTIAL_REQUEST_PROXY_V2_GATEWAY_UPSTREAM||"",
  ).trim();
  let url;
  try{url=new URL(raw);}catch{fail("edge_gateway_upstream_invalid");}
  if(
    url.protocol!=="http:"||
    url.hostname!=="127.0.0.1"||
    url.username||url.password||
    url.pathname!=="/"||
    url.search||url.hash||
    !url.port
  ) fail("edge_gateway_upstream_invalid");
  const port=integer(url.port,1024,65535,"edge_gateway_upstream_invalid");
  return Object.freeze({url,port});
}
function requiredAbsoluteStateFile(){
  const value=String(
    process.env.VOID_AGENT_CREDENTIAL_REQUEST_PROXY_V2_RATE_STATE_FILE||"",
  ).trim();
  if(!value.startsWith("/")||value.includes("\0"))fail("edge_rate_state_file_invalid");
  return value;
}
const listenPort=parsePort(
  "VOID_AGENT_CREDENTIAL_REQUEST_PROXY_V2_EDGE_PORT",
  {allowProofZero:true},
);
const gateway=parseUpstream();
if(listenPort!==0&&listenPort===gateway.port)fail("edge_listener_upstream_port_collision");
const stateFile=requiredAbsoluteStateFile();
const windowMs=integer(
  process.env.VOID_AGENT_CREDENTIAL_REQUEST_PROXY_V2_RATE_WINDOW_MS||"60000",
  1000,3600000,"edge_rate_window_invalid",
);
const maxRequests=integer(
  process.env.VOID_AGENT_CREDENTIAL_REQUEST_PROXY_V2_MAX_REQUESTS_PER_SOURCE||"30",
  1,1000,"edge_rate_limit_invalid",
);
const rateState=createVoidAgentCredentialRequestProxyV2RateStateV1({
  state_file:stateFile,
  window_ms:windowMs,
  max_requests_per_source:maxRequests,
});

function jsonBytes(value){
  return Buffer.from(JSON.stringify(value)+"\n","utf8");
}
function statusText(status){
  return new Map([
    [202,"Accepted"],[400,"Bad Request"],[404,"Not Found"],
    [405,"Method Not Allowed"],[408,"Request Timeout"],
    [411,"Length Required"],[413,"Payload Too Large"],
    [415,"Unsupported Media Type"],[429,"Too Many Requests"],
    [502,"Bad Gateway"],[503,"Service Unavailable"],
  ]).get(status)||"Response";
}
function send(socket,status,body,extraHeaders={}){
  if(socket.destroyed)return;
  const bytes=Buffer.isBuffer(body)?body:jsonBytes(body);
  const lines=[
    `HTTP/1.1 ${status} ${statusText(status)}`,
    "Connection: close",
    "Cache-Control: no-store",
    "Content-Type: application/json; charset=utf-8",
    `Content-Length: ${bytes.length}`,
  ];
  for(const [name,value] of Object.entries(extraHeaders)){
    if(/[\r\n]/u.test(String(value)))continue;
    lines.push(name+": "+String(value));
  }
  socket.end(Buffer.concat([
    Buffer.from(lines.join("\r\n")+"\r\n\r\n","ascii"),
    bytes,
  ]));
}
function parseHeaders(bytes){
  if([...bytes].some(b=>b===0||b===10||b===13&&false)){}
  const text=bytes.toString("latin1");
  const lines=text.split("\r\n");
  const requestLine=lines.shift();
  if(!requestLine)fail("edge_http_request_line_missing");
  const headers=Object.create(null);
  for(const line of lines){
    if(!line)continue;
    if(/^[ \t]/u.test(line))fail("edge_http_obs_fold_forbidden");
    const colon=line.indexOf(":");
    if(colon<1)fail("edge_http_header_invalid");
    const rawName=line.slice(0,colon);
    if(!HEADER_NAME.test(rawName))fail("edge_http_header_name_invalid");
    const name=rawName.toLowerCase();
    if(Object.prototype.hasOwnProperty.call(headers,name))fail("edge_http_duplicate_header");
    const value=line.slice(colon+1).trim();
    if(/[\u0000-\u0008\u000a-\u001f\u007f]/u.test(value)){
      fail("edge_http_header_value_invalid");
    }
    headers[name]=value;
  }
  return Object.freeze({requestLine,headers:Object.freeze({...headers})});
}
function tryDecode(buffer){
  if(buffer.length>MAX_CONNECTION_BYTES)fail("edge_connection_bytes_exceeded");
  if(buffer.length<16)return null;
  const proxyBytes=16+buffer.readUInt16BE(14);
  if(proxyBytes>MAX_PROXY_HEADER_BYTES)fail("edge_proxy_header_too_large");
  if(buffer.length<proxyBytes)return null;
  const parsedSource=parseVoidAgentCredentialRequestProxyV2SourceV1(buffer);
  if(parsedSource.ok!==true)fail("edge_"+String(parsedSource.reason||"proxy_invalid"));
  const headerEnd=buffer.indexOf("\r\n\r\n",proxyBytes,"ascii");
  if(headerEnd<0){
    if(buffer.length-proxyBytes>MAX_HTTP_HEADER_BYTES)fail("edge_http_headers_too_large");
    return null;
  }
  const headerBytes=buffer.subarray(proxyBytes,headerEnd);
  if(headerBytes.length>MAX_HTTP_HEADER_BYTES)fail("edge_http_headers_too_large");
  const decoded=parseHeaders(headerBytes);
  if(decoded.headers["transfer-encoding"]!==undefined)fail("edge_transfer_encoding_forbidden");
  if(decoded.headers.expect!==undefined||decoded.headers.upgrade!==undefined){
    fail("edge_http_upgrade_forbidden");
  }
  const rawLength=decoded.headers["content-length"];
  if(rawLength===undefined)fail("edge_content_length_required");
  const bodyBytes=integer(
    rawLength,0,VOID_AGENT_CREDENTIAL_REQUEST_MAX_BODY_BYTES_V1,
    "edge_content_length_invalid",{allowZero:true},
  );
  const bodyStart=headerEnd+4;
  const expected=bodyStart+bodyBytes;
  if(buffer.length<expected)return null;
  if(buffer.length>expected)fail("edge_http_trailing_bytes_forbidden");

  const edge=classifyVoidAgentCredentialRequestProxyV2EdgeCompositionV1({
    connection_prefix:buffer.subarray(0,headerEnd+2),
    headers:decoded.headers,
    now_ms:Date.now(),
    window_ms:windowMs,
    max_requests_per_source:maxRequests,
    prior_events:[],
  });
  if(
    edge.ok!==true||
    edge.status!=="CREDENTIAL_SOURCE_RATE_ALLOWED_NOT_TRUSTED"||
    edge.forward_method!=="POST"||
    edge.forward_target!==VOID_AGENT_CREDENTIAL_REQUEST_PATH_V1
  ){
    fail("edge_credential_request_not_admitted:"+String(edge.reason||edge.status));
  }

  const contentType=String(decoded.headers["content-type"]||"")
    .split(";",1)[0].trim().toLowerCase();
  if(contentType!=="application/json")fail("edge_application_json_required");
  const body=buffer.subarray(bodyStart,expected);
  const digest=crypto.createHash("sha256").update(body).digest("hex");
  const declared=String(decoded.headers["x-void-payload-sha256"]||"").toLowerCase();
  if(!/^[0-9a-f]{64}$/u.test(declared))fail("edge_payload_sha256_required");
  if(declared!==digest)fail("edge_payload_sha256_mismatch");
  try{JSON.parse(body.toString("utf8"));}catch{fail("edge_invalid_json");}

  return Object.freeze({
    parsedSource,
    edge,
    body:Buffer.from(body),
    bodySha:digest,
  });
}
function readOneRequest(socket){
  return new Promise((resolve,reject)=>{
    let buffer=Buffer.alloc(0);
    let settled=false;
    const cleanup=()=>{
      socket.off("data",onData);
      socket.off("error",onError);
      socket.off("end",onEnd);
      socket.off("timeout",onTimeout);
    };
    const finish=(fn,value)=>{
      if(settled)return;
      settled=true;
      cleanup();
      fn(value);
    };
    const onError=(error)=>finish(reject,error);
    const onEnd=()=>finish(reject,new Error("edge_client_ended_before_request"));
    const onTimeout=()=>finish(reject,new Error("edge_client_request_timeout"));
    const onData=(chunk)=>{
      if(settled)return;
      try{
        buffer=Buffer.concat([buffer,Buffer.from(chunk)]);
        const decoded=tryDecode(buffer);
        if(decoded)finish(resolve,decoded);
      }catch(error){finish(reject,error);}
    };
    socket.on("data",onData);
    socket.once("error",onError);
    socket.once("end",onEnd);
    socket.once("timeout",onTimeout);
    socket.setTimeout(VOID_AGENT_CREDENTIAL_REQUEST_TIMEOUT_MS_V1);
  });
}
function forwardToGateway(request){
  return new Promise((resolve,reject)=>{
    const upstream=http.request({
      protocol:"http:",
      hostname:"127.0.0.1",
      port:gateway.port,
      method:"POST",
      path:VOID_AGENT_CREDENTIAL_REQUEST_PATH_V1,
      headers:{
        accept:"application/json",
        "content-type":"application/json",
        "content-length":String(request.body.length),
        "user-agent":"void-agent-credential-request-proxy-v2-edge-v1",
        "x-void-payload-sha256":request.bodySha,
        connection:"close",
      },
      timeout:VOID_AGENT_CREDENTIAL_REQUEST_TIMEOUT_MS_V1,
    },response=>{
      const chunks=[];
      let total=0;
      let done=false;
      const rejectOnce=(error)=>{
        if(done)return;
        done=true;
        response.destroy();
        reject(error);
      };
      response.on("data",chunk=>{
        if(done)return;
        total+=chunk.length;
        if(total>VOID_AGENT_CREDENTIAL_REQUEST_MAX_RESPONSE_BYTES_V1){
          rejectOnce(new Error("edge_gateway_response_too_large"));
          return;
        }
        chunks.push(Buffer.from(chunk));
      });
      response.once("error",rejectOnce);
      response.once("end",()=>{
        if(done)return;
        done=true;
        const status=Number(response.statusCode);
        if(!Number.isSafeInteger(status)||status<100||status>599){
          reject(new Error("edge_gateway_status_invalid"));
          return;
        }
        resolve(Object.freeze({
          status,
          body:Buffer.concat(chunks),
        }));
      });
    });
    upstream.once("timeout",()=>upstream.destroy(new Error("edge_gateway_timeout")));
    upstream.once("error",reject);
    upstream.end(request.body);
  });
}
function classifyClientError(error){
  const code=String(error?.message||error||"edge_error");
  if(code.includes("timeout"))return [408,"request_timeout"];
  if(code.includes("too_large")||code.includes("bytes_exceeded"))return [413,"request_too_large"];
  if(code.includes("application_json"))return [415,"application_json_required"];
  if(code.includes("content_length_required"))return [411,"content_length_required"];
  return [400,code.slice(0,160)];
}

const server=net.createServer(socket=>{
  void (async()=>{
    let request;
    try{request=await readOneRequest(socket);}
    catch(error){
      const [status,code]=classifyClientError(error);
      send(socket,status,{ok:false,error:code});
      return;
    }
    let admitted;
    try{admitted=await rateState.admit(request.parsedSource,Date.now());}
    catch(error){
      process.stderr.write(MARKER+" rate_state_error="+String(error)+"\n");
      send(socket,503,{ok:false,error:"credential_source_rate_state_unavailable"});
      return;
    }
    if(admitted.ok!==true){
      if(admitted.status==="RATE_LIMITED"){
        send(socket,429,{
          ok:false,
          error:"credential_request_proxy_source_rate_limited",
          retry_after_ms:windowMs,
        },{"Retry-After":String(Math.ceil(windowMs/1000))});
        return;
      }
      send(socket,503,{ok:false,error:"credential_source_rate_state_hold"});
      return;
    }
    try{
      const response=await forwardToGateway(request);
      send(socket,response.status,response.body);
    }catch(error){
      process.stderr.write(MARKER+" gateway_error="+String(error)+"\n");
      send(socket,502,{ok:false,error:"credential_request_gateway_failed"});
    }
  })();
});
server.maxConnections=128;
server.on("error",error=>{
  process.stderr.write(MARKER+" server_error="+String(error)+"\n");
  process.exitCode=1;
});
function shutdown(signal){
  server.close(error=>{
    if(error){
      process.stderr.write(MARKER+" shutdown_error="+String(error)+"\n");
      process.exit(1);
    }
    process.stdout.write(MARKER+" stopped signal="+signal+"\n");
    process.exit(0);
  });
  setTimeout(()=>process.exit(1),5000).unref();
}
process.on("SIGINT",()=>shutdown("SIGINT"));
process.on("SIGTERM",()=>shutdown("SIGTERM"));

server.listen({host:HOST,port:listenPort,exclusive:true},()=>{
  const address=server.address();
  if(!address||typeof address==="string")fail("edge_listener_address_invalid");
  process.stdout.write(JSON.stringify({
    marker:MARKER,
    ready:true,
    host:address.address,
    port:address.port,
    gateway_host:"127.0.0.1",
    gateway_port:gateway.port,
    state_file:stateFile,
    source_rate_window_ms:windowMs,
    source_rate_max_requests:maxRequests,
    proxy_v2_required:true,
    public_tls_destination_port_required:443,
    exact_credential_post_only:true,
    http_parser_stream_binding_proven:true,
    credential_route_limits_enforced:true,
    durable_rate_state_source_proven:true,
    admitted_event_persisted_before_forward:true,
    source_identity_forwarded_to_gateway:false,
    multi_process_lock_proven:false,
    live_state_custody_proven:false,
    local_transport_trust_proven:false,
    tailscale_funnel_configuration_verified:false,
    runtime_integration:false,
    credential_issuance_authority:false,
    work_credit_write:false,
    funds_movement:false,
  })+"\n");
});
