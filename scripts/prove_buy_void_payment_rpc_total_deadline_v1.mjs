#!/usr/bin/env node
// Read-only, synthetic loopback HTTP test. No real RPC, payments, signers or funds.
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";

import {
  VOID_BUY_VOID_PAYMENT_RPC_OBSERVER_AUTHORITY_V1,
  createBuyVoidPaymentHttpTransportV1,
} from "../dist/economic/buy_void_payment_rpc_observer_v1.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = "src/economic/buy_void_payment_rpc_observer_v1.ts";
const EXPECTED_SOURCE_BLOB = "c759978aa8694386a31861ed6e22983b962ef68a";
const rpcMethod = "eth_blockNumber";
const rpcParams = [];
const blob = bytes => crypto.createHash("sha1")
  .update(Buffer.from("blob " + bytes.length + "\0", "utf8"))
  .update(bytes).digest("hex");
assert.equal(blob(fs.readFileSync(path.join(ROOT, SOURCE))), EXPECTED_SOURCE_BLOB,
  "current total-deadline source Git blob must be reviewed before proof");
assert.equal(VOID_BUY_VOID_PAYMENT_RPC_OBSERVER_AUTHORITY_V1.rpc_write, false);
assert.equal(VOID_BUY_VOID_PAYMENT_RPC_OBSERVER_AUTHORITY_V1.signing, false);
assert.equal(VOID_BUY_VOID_PAYMENT_RPC_OBSERVER_AUTHORITY_V1.money_movement, false);

async function ephemeralRpc(responder, probe) {
  const sockets = new Set();
  const server = http.createServer((req, res) => {
    const chunks = [];
    let total = 0;
    req.on("data", chunk => {
      total += chunk.length;
      if(total > 8192){req.destroy();return;}
      chunks.push(chunk);
    });
    req.on("end", () => {
      if(req.method !== "POST"){res.writeHead(405);res.end();return;}
      let request;
      try {request = JSON.parse(Buffer.concat(chunks).toString("utf8"));}
      catch {res.writeHead(400);res.end();return;}
      if(request.jsonrpc!=="2.0" ||
        typeof request.id!=="number" ||
        request.method!==rpcMethod ||
        JSON.stringify(request.params)!=="[]"){
        res.writeHead(400);res.end();return;
      }
      responder(request,res);
    });
  });
  server.on("connection", socket => {
    sockets.add(socket);
    socket.once("close", () => sockets.delete(socket));
  });
  await new Promise((resolve, reject) => {
    server.once("error",reject);
    server.listen(0,"127.0.0.1",resolve);
  });
  try {
    const address=server.address();
    assert.ok(address && typeof address==="object");
    return await probe("http://127.0.0.1:"+address.port+"/");
  } finally {
    for(const socket of sockets) socket.destroy();
    await new Promise((resolve,reject)=>{
      server.close(error=>error?reject(error):resolve());
    });
  }
}
function transport(url, overrides={}) {
  const value=createBuyVoidPaymentHttpTransportV1({
    enabled:true,source_chain:"base",chain_id:8453,
    rpc_url:url,timeout_ms:800,max_response_bytes:1024,...overrides
  });
  assert.ok(!("reason" in value),"valid synthetic loopback transport required");
  return value;
}
async function requireRejection(promise, pattern, label) {
  await assert.rejects(promise, pattern, label);
}
await ephemeralRpc((input,res)=>{
  res.writeHead(200,{"content-type":"application/json"});
  res.end(JSON.stringify({jsonrpc:"2.0",id:input.id,result:"0x1234"}));
},async url=>{
  const t=transport(url);
  const [a,b]=await Promise.all([
    t.call({method:rpcMethod,params:rpcParams}),
    t.call({method:rpcMethod,params:rpcParams})
  ]);
  assert.equal(a,"0x1234");
  assert.equal(b,"0x1234");
  await requireRejection(
    t.call({method:"eth_sendRawTransaction",params:[]}),
    /payment_observer_rpc_method_not_allowed/,
    "write-method must HOLD before any HTTP call",
  );
});
console.log("rpc_positive_and_write_method_hold=true");

// Every incoming chunk arrives much faster than the 250-ms timeout.
// Socket-inactivity timeout would allow this response to continue forever;
// total-deadline timer MUST abort it even while bytes keep arriving.
await ephemeralRpc((input,res)=>{
  res.writeHead(200,{"content-type":"application/json"});
  res.write('{"jsonrpc":"2.0","id":'+input.id+',"result":"');
  let ticks=0;
  const drip=setInterval(()=>{
    if(res.destroyed||res.writableEnded){clearInterval(drip);return;}
    if(++ticks>=90){clearInterval(drip);res.end('"}');return;}
    res.write("x");
  },25);
  res.once("close",()=>clearInterval(drip));
},async url=>{
  const t=transport(url,{timeout_ms:250,max_response_bytes:8192});
  const start=performance.now();
  await requireRejection(
    t.call({method:rpcMethod,params:rpcParams}),
    /payment_observer_rpc_total_deadline_exceeded/,
    "continuous tiny response chunks must NOT reset the total deadline",
  );
  const elapsed=performance.now()-start;
  assert.ok(elapsed<1900,"absolute RPC deadline took too long");
});
console.log("slow_drip_total_wall_clock_deadline_enforced=true");

await ephemeralRpc((input,res)=>{
  res.writeHead(200,{"content-type":"application/json"});
  res.end(JSON.stringify({jsonrpc:"2.0",id:input.id,result:"x".repeat(5000)}));
},async url=>{
  await requireRejection(transport(url,{max_response_bytes:1024})
    .call({method:rpcMethod,params:rpcParams}),
    /payment_observer_rpc_response_too_large/,
    "unbounded payload must fail without loading the entire body");
});
console.log("oversized_rpc_response_rejected=true");

await ephemeralRpc((input,res)=>{
  res.writeHead(200,{"content-type":"application/json",
    "content-length":"4096"});
  res.write('{"jsonrpc":"2.0","id":'+input.id+',"result":"partial');
  setTimeout(()=>res.destroy(),25);
},async url=>{
  await requireRejection(
    transport(url,{timeout_ms:500,max_response_bytes:8192})
      .call({method:rpcMethod,params:rpcParams}),
    /payment_observer_rpc_response_aborted/,
    "premature response close must settle fail-closed",
  );
});
console.log("premature_rpc_response_rejected=true");

await ephemeralRpc((input,res)=>{
  res.writeHead(502,{"content-type":"application/json"});
  res.end(JSON.stringify({jsonrpc:"2.0",id:input.id,result:"0x1"}));
},async url=>{
  await requireRejection(transport(url)
    .call({method:rpcMethod,params:rpcParams}),
    /payment_observer_rpc_http_status/,
    "forged 502 result must be rejected");
});
console.log("forged_non2xx_result_rejected=true");

await ephemeralRpc((input,res)=>{
  res.writeHead(200,{"content-type":"application/json"});
  res.end(JSON.stringify({jsonrpc:"2.0",id:input.id+1,result:"0x1"}));
},async url=>{
  await requireRejection(transport(url)
    .call({method:rpcMethod,params:rpcParams}),
    /payment_observer_rpc_envelope_mismatch/,
    "mismatched JSON-RPC request id must fail");
});
console.log("mismatched_response_id_rejected=true");

await ephemeralRpc((input,res)=>{
  res.writeHead(200,{"content-type":"text/html"});
  res.end(JSON.stringify({jsonrpc:"2.0",id:input.id,result:"0x1"}));
},async url=>{
  await requireRejection(transport(url)
    .call({method:rpcMethod,params:rpcParams}),
    /payment_observer_rpc_content_type_invalid/,
    "unexpected content type must fail");
});
console.log("non_json_content_type_rejected=true");

await ephemeralRpc((input,res)=>{
  res.writeHead(200,{"content-type":"application/jsonp"});
  res.end(JSON.stringify({jsonrpc:"2.0",id:input.id,result:"0x1"}));
},async url=>{
  await requireRejection(transport(url)
    .call({method:rpcMethod,params:rpcParams}),
    /payment_observer_rpc_content_type_invalid/,
    "JSON-prefixed but non-JSON media type must fail");
});
console.log("json_prefix_media_type_rejected=true");

await ephemeralRpc((input,res)=>{
  res.writeHead(200,{"content-type":"application/json; charset=utf-8"});
  res.end(JSON.stringify({jsonrpc:"2.0",id:input.id,result:"0x2"}));
},async url=>{
  const value=await transport(url).call({method:rpcMethod,params:rpcParams});
  assert.equal(value,"0x2","standard JSON media parameters must remain valid");
});
console.log("json_media_type_parameters_allowed=true");

for (const errorValue of [null,false,0,""]) {
  await ephemeralRpc((input,res)=>{
    res.writeHead(200,{"content-type":"application/json"});
    res.end(JSON.stringify({
      jsonrpc:"2.0",
      id:input.id,
      result:"0x3",
      error:errorValue,
    }));
  },async url=>{
    await requireRejection(transport(url)
      .call({method:rpcMethod,params:rpcParams}),
      /payment_observer_rpc_error_response/,
      "success envelope must reject any simultaneous error member");
  });
}
console.log("mixed_result_error_envelope_rejected=true");

const disabled=createBuyVoidPaymentHttpTransportV1({
  enabled:false,source_chain:"base",chain_id:8453,
  rpc_url:"http://127.0.0.1:1",
});
assert.ok("reason" in disabled);
assert.equal(disabled.reason,"payment_observer_disabled");
const externalCleartext=createBuyVoidPaymentHttpTransportV1({
  enabled:true,source_chain:"base",chain_id:8453,
  rpc_url:"http://example.invalid/rpc",
});
assert.ok("reason" in externalCleartext);
assert.equal(externalCleartext.reason,"payment_observer_rpc_transport_not_allowed");
console.log("disabled_and_external_cleartext_rpc_rejected=true");
console.log("VOID_BUY_VOID_RPC_ABSOLUTE_DEADLINE_V1_SYNTHETIC_GREEN");
console.log("source_git_blob_verified="+EXPECTED_SOURCE_BLOB);
console.log("only_synthetic_loopback_http=true");
console.log("operator_route_modified=false");
console.log("production_payment_authority_ready=false");
console.log("wallet_or_signer_access=false");
console.log("transaction_broadcast=false");
console.log("funds_moved=false");
