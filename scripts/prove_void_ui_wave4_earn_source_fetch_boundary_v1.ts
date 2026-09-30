#!/usr/bin/env node
import assert from "node:assert/strict";
import http from "node:http";

import {
  VOID_UI_WAVE4_EARN_SOURCE_MAX_BYTES_V1,
  VOID_UI_WAVE4_EARN_SOURCE_TIMEOUT_MS_V1,
  fetchVoidUiWave4EarnSourceJsonV1,
} from "../src/ui/void_app_wave4_earn_source_fetch_v1.js";

const account="account-A";
const route=`/wc/runner/status?account=${account}`;

let mode="valid";
let streamedChunks=0;
let abortedConnections=0;

const server=http.createServer((req,res)=>{
  req.on("aborted",()=>{abortedConnections+=1;});
  const url=new URL(req.url||"/","http://127.0.0.1");

  if(url.pathname!=="/wc/runner/status"){
    res.writeHead(404,{"content-type":"application/json"});
    res.end(JSON.stringify({ok:false}));
    return;
  }

  if(mode==="redirect"){
    res.writeHead(302,{location:`/wc/reward-stats?account=${account}`});
    res.end();
    return;
  }

  if(mode==="http-error"){
    const body=Buffer.from(JSON.stringify({ok:false,error:"unavailable"}));
    res.writeHead(503,{
      "content-type":"application/json",
      "content-length":String(body.length),
    });
    res.end(body);
    return;
  }

  if(mode==="wrong-type"){
    res.writeHead(200,{"content-type":"text/plain"});
    res.end("not-json");
    return;
  }

  if(mode==="invalid-json"){
    res.writeHead(200,{"content-type":"application/json"});
    res.end("{");
    return;
  }

  if(mode==="invalid-utf8"){
    res.writeHead(200,{"content-type":"application/json"});
    res.end(Buffer.from([0xff,0xfe,0xfd]));
    return;
  }

  if(mode==="declared-oversize"){
    res.writeHead(200,{
      "content-type":"application/json",
      "content-length":"999999",
    });
    res.write("{");
    return;
  }

  if(mode==="streamed-oversize"){
    res.writeHead(200,{"content-type":"application/json"});
    let left=6;
    const send=()=>{
      if(res.destroyed||res.writableEnded||left<=0) return;
      streamedChunks+=1;
      res.write(Buffer.alloc(600,0x78));
      left-=1;
      if(left===0){
        res.end();
        return;
      }
      setTimeout(send,40);
    };
    send();
    return;
  }

  if(mode==="stall"){
    res.writeHead(200,{"content-type":"application/json"});
    res.write('{"ok":');
    return;
  }

  const body=Buffer.from(JSON.stringify({
    ok:true,
    enabled:true,
    manual_only:false,
  }));
  res.writeHead(200,{
    "content-type":"application/json; charset=utf-8",
    "content-length":String(body.length),
  });
  res.end(body);
});

await new Promise((resolve,reject)=>{
  server.once("error",reject);
  server.listen(0,"127.0.0.1",()=>resolve());
});

const address=server.address();
assert.ok(address&&typeof address==="object");
const base=`http://127.0.0.1:${address.port}`;

const run=(
  selectedMode,
  options={},
)=>{
  mode=selectedMode;
  return fetchVoidUiWave4EarnSourceJsonV1(
    base,
    route,
    options,
  );
};

try{
  assert.equal(VOID_UI_WAVE4_EARN_SOURCE_MAX_BYTES_V1,256*1024);
  assert.equal(VOID_UI_WAVE4_EARN_SOURCE_TIMEOUT_MS_V1,5000);

  {
    const result=await run("valid");
    assert.deepEqual(result,{
      ok:true,
      status:200,
      body:{ok:true,enabled:true,manual_only:false},
    });
  }

  {
    const result=await run("http-error");
    assert.deepEqual(result,{ok:false,status:503,body:null});
  }

  for(const fault of [
    "redirect",
    "wrong-type",
    "invalid-json",
    "invalid-utf8",
    "declared-oversize",
  ]){
    const result=await run(fault,{maximumBytes:1024});
    assert.deepEqual(
      result,
      {ok:false,status:0,body:null},
      `fault did not fail closed: ${fault}`,
    );
  }

  {
    streamedChunks=0;
    const result=await run("streamed-oversize",{maximumBytes:1024});
    assert.deepEqual(result,{ok:false,status:0,body:null});
    await new Promise((resolve)=>setTimeout(resolve,180));
    assert.ok(
      streamedChunks<6,
      `oversized source stream consumed fully: ${streamedChunks}`,
    );
  }

  {
    const started=Date.now();
    const result=await run("stall",{timeoutMs:100});
    const elapsed=Date.now()-started;
    assert.deepEqual(result,{ok:false,status:0,body:null});
    assert.ok(elapsed<1000,`stalled source exceeded timeout bound: ${elapsed}`);
  }

  {
    let fetchCalls=0;
    const fetchImpl=async (...args)=>{
      fetchCalls+=1;
      return fetch(...args);
    };
    const badBase=await fetchVoidUiWave4EarnSourceJsonV1(
      `http://localhost:${address.port}`,
      route,
      {fetchImpl},
    );
    assert.deepEqual(badBase,{ok:false,status:0,body:null});
    assert.equal(fetchCalls,0);

    const badLimit=await fetchVoidUiWave4EarnSourceJsonV1(
      base,
      `/jobs?account=${account}&limit=6`,
      {fetchImpl},
    );
    assert.deepEqual(badLimit,{ok:false,status:0,body:null});
    assert.equal(fetchCalls,0);
  }

  {
    let cancelled=false;
    const response=new Response(
      new ReadableStream({
        cancel(){cancelled=true;},
        start(controller){
          controller.enqueue(
            new TextEncoder().encode('{"ok":true}'),
          );
        },
      }),
      {
        status:200,
        headers:{"content-type":"application/json"},
      },
    );
    Object.defineProperty(response,"url",{
      value:`${base}/different`,
    });
    const result=await fetchVoidUiWave4EarnSourceJsonV1(
      base,
      route,
      {fetchImpl:async()=>response},
    );
    assert.deepEqual(result,{ok:false,status:0,body:null});
    assert.equal(cancelled,true);
  }

  {
    mode="valid";
    const result=await run("valid",{maximumBytes:1024});
    assert.equal(result.ok,true);
    assert.equal(result.status,200);
    assert.equal(result.body?.ok,true);
  }

  console.log("VOID_UI_WAVE4_EARN_SOURCE_FETCH_BOUNDARY_V1_GREEN");
  console.log("source_base_exact_loopback=true");
  console.log("source_routes_allowlisted=true");
  console.log("source_query_shape_bounded=true");
  console.log("redirects_rejected=true");
  console.log("final_url_exact=true");
  console.log("json_content_type_required=true");
  console.log("declared_oversize_rejected_before_buffer=true");
  console.log("streamed_oversize_cancelled_early=true");
  console.log("invalid_utf8_json_fail_closed=true");
  console.log("http_failure_preserves_status=true");
  console.log("stalled_body_timeout_bounded=true");
  console.log("valid_recovery=true");
  console.log("source_response_max_bytes=262144");
  console.log("source_timeout_ms=5000");
  console.log("authority_added=false");
} finally {
  await new Promise((resolve)=>{
    server.close(()=>resolve());
    server.closeAllConnections?.();
  });
}
