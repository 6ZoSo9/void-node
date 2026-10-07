#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";

import {
  testOnlyPrepareIsolatedReviewedExecutionV1,
  testOnlyReadExactHeadSourceV1,
  testOnlyReviewedGitHeadV1,
  testOnlyRunSyntheticReviewedChildV1,
} from "../ops/precision/void-datanet-registry-exact-single-broadcast-isolated-execution-v1.mjs";

const LAUNCHER_REL=
  "ops/precision/void-datanet-registry-exact-single-broadcast-isolated-execution-v1.mjs";
const CHILD_REL=
  "ops/precision/void-datanet-registry-reviewed-execution-child-v1.mjs";
const SUPPORT_REL=
  "tools/void-datanet-registry-isolated-parent-support-v1.mjs";

function sleep(ms){
  const lock=new Int32Array(new SharedArrayBuffer(4));
  Atomics.wait(lock,0,0,ms);
}
function lineCount(file){
  if(!fs.existsSync(file))return 0;
  return fs.readFileSync(file,"utf8").split("\n").filter(Boolean).length;
}

const head=testOnlyReviewedGitHeadV1();
assert.match(head,/^[0-9a-f]{40}$/u);
for(const rel of[LAUNCHER_REL,CHILD_REL,SUPPORT_REL]){
  const source=testOnlyReadExactHeadSourceV1(rel);
  assert.match(source.blob,/^[0-9a-f]{40}$/u);
  assert.match(source.sha256,/^[0-9a-f]{64}$/u);
  assert.ok(source.bytes.length>0);
}

const childSourceText=
  testOnlyReadExactHeadSourceV1(CHILD_REL).bytes.toString("utf8");
assert.match(
  childSourceText,
  /rpc_response_aborted/u,
  "isolated child RPC must settle aborted responses",
);
assert.match(
  childSourceText,
  /rpc_response_premature_close/u,
  "isolated child RPC must settle premature response close",
);

const binding=await testOnlyPrepareIsolatedReviewedExecutionV1();
assert.equal(binding.repository_head_sha,head);
assert.equal(binding.reviewed_graph_executes_in_parent,false);
assert.equal(binding.execution_network_isolation_provided,true);
assert.equal(binding.child_stdio_null,true);
assert.equal(binding.child_ipc,false);
assert.match(binding.reviewed_execution_child_git_blob_sha1,/^[0-9a-f]{40}$/u);
assert.match(binding.reviewed_execution_child_sha256,/^[0-9a-f]{64}$/u);
assert.ok(binding.closure_count>0);

const safe=await testOnlyRunSyntheticReviewedChildV1(
  'export default [process.stdin,process.stdout,process.stderr].every('+
  's=>{const st=[];let p=s;while(p){st.push(String(p.constructor?.name||""));'+
  'p=Object.getPrototypeOf(p);}return !st.includes("Socket")&&!st.includes("TLSSocket");});',
);
assert.equal(safe.default,true);
assert.equal(safe.execution_network_isolation_provided,true);

if(typeof process.execve==="function"){
  await assert.rejects(
    ()=>testOnlyRunSyntheticReviewedChildV1(
      'export default process.execve(process.execPath,'+
      '[process.execPath,"-e","process.exit(91)"],process.env);',
    ),
    /reviewed_ambient_process_execve_forbidden/u,
  );
}

if(typeof process.getBuiltinModule==="function"){
  await assert.rejects(
    ()=>testOnlyRunSyntheticReviewedChildV1(
      'export default process.getBuiltinModule("node:net");',
    ),
    /reviewed_ambient_get_builtin_module_forbidden/u,
  );
}

const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"void-datanet-child-proof-"));
const portFile=path.join(tmp,"port");
const hitFile=path.join(tmp,"hits");
const serverCode=
  'const fs=require("fs"),net=require("net");'+
  'const portFile=process.argv[1],hitFile=process.argv[2];'+
  'const s=net.createServer(sock=>{fs.appendFileSync(hitFile,"hit\\n");'+
  'sock.once("data",()=>{sock.end("HTTP/1.1 200 OK\\r\\nContent-Length: 2\\r\\nConnection: close\\r\\n\\r\\nok");});});'+
  's.listen(0,"127.0.0.1",()=>{fs.writeFileSync(portFile,String(s.address().port));});'+
  'process.on("SIGTERM",()=>s.close(()=>process.exit(0)));';
const server=spawn(
  process.execPath,
  ["-e",serverCode,portFile,hitFile],
  {stdio:["ignore","ignore","ignore"]},
);
try{
  for(let i=0;i<100&&!fs.existsSync(portFile);i+=1)sleep(25);
  assert.ok(fs.existsSync(portFile),"control server did not publish port");
  const port=Number(fs.readFileSync(portFile,"utf8"));
  assert.ok(Number.isInteger(port)&&port>0&&port<65536);
  assert.equal(lineCount(hitFile),0);

  const stdioEscape=
    'const streams=[process.stdin,process.stdout,process.stderr];'+
    'for(const stream of streams){let p=stream;while(p){const C=p.constructor;'+
    'if(typeof C==="function"){try{const s=new C();if(s&&typeof s.connect==="function"){'+
    'await new Promise(resolve=>{let done=false;const finish=()=>{if(done)return;done=true;'+
    'try{s.destroy();}catch{}resolve();};s.once?.("connect",finish);s.once?.("error",finish);'+
    'setTimeout(finish,150);s.connect(port,"127.0.0.1");});}}catch{}}p=Object.getPrototypeOf(p);}}'+
    'export default true;';
  const escaped=await testOnlyRunSyntheticReviewedChildV1(
    'const port='+String(port)+';'+stdioEscape,
    {timeoutMs:4000},
  );
  assert.equal(escaped.default,true);
  sleep(100);
  assert.equal(
    lineCount(hitFile),
    0,
    "stdio constructor/prototype chain must create zero loopback sockets",
  );

  const approved=await testOnlyRunSyntheticReviewedChildV1(
    'import * as http from "node:http";'+
    'const port='+String(port)+';'+
    'export default await new Promise((resolve,reject)=>{'+
    'const req=http.request({hostname:"127.0.0.1",port,path:"/",method:"GET",agent:false},res=>{'+
    'res.resume();res.on("end",()=>resolve(res.statusCode===200));});'+
    'req.on("error",reject);req.end();});',
    {networkCapable:true,timeoutMs:4000},
  );
  assert.equal(approved.default,true);
  for(let i=0;i<20&&lineCount(hitFile)<1;i+=1)sleep(25);
  assert.equal(lineCount(hitFile),1,"approved reviewed node:http control must connect exactly once");

  await assert.rejects(
    ()=>testOnlyRunSyntheticReviewedChildV1(
      'while(true){} export default true;',
      {timeoutMs:150},
    ),
    /reviewed_child_process_error/u,
  );
  assert.equal(lineCount(hitFile),1,"timed-out reviewed child must not create a network retry");

  const detached=path.join(tmp,"detached-output.json");
  const replacement=path.join(tmp,"replacement-output.json");
  const descriptorBound=await testOnlyRunSyntheticReviewedChildV1(
    'export default true;',
    {
      afterOpen({output}){
        fs.renameSync(output,detached);
        fs.writeFileSync(replacement,"replacement\n",{mode:0o600});
        fs.renameSync(replacement,output);
      },
    },
  );
  assert.equal(descriptorBound.default,true);
  assert.ok(fs.existsSync(detached));
  const detachedValue=JSON.parse(fs.readFileSync(detached,"utf8"));
  assert.equal(detachedValue.ok,true);
  assert.equal(
    fs.existsSync(replacement),
    false,
    "replacement pathname must have been consumed by the attacker rename",
  );
}finally{
  server.kill("SIGTERM");
  sleep(50);
  if(server.exitCode===null)server.kill("SIGKILL");
  fs.rmSync(tmp,{recursive:true,force:true});
}

const launcher=testOnlyReadExactHeadSourceV1(LAUNCHER_REL);
const direct=spawnSync(
  process.execPath,
  [path.resolve(LAUNCHER_REL)],
  {cwd:process.cwd(),encoding:"utf8",stdio:["ignore","pipe","pipe"],
   env:{PATH:"/usr/bin:/bin",LANG:"C",LC_ALL:"C"}},
);
assert.notEqual(direct.status,0);
assert.match(direct.stderr,/reviewed_git_object_bootstrap_required/u);

const streamed=spawnSync(
  process.execPath,
  ["--input-type=module","-"],
  {
    cwd:process.cwd(),
    input:launcher.bytes,
    encoding:"utf8",
    stdio:["pipe","pipe","pipe"],
    env:{
      PATH:"/usr/bin:/bin",LANG:"C",LC_ALL:"C",
      VOID_DATANET_REGISTRY_REVIEWED_LAUNCHER_BLOB_SHA1:launcher.blob,
    },
  },
);
assert.notEqual(streamed.status,0);
assert.match(streamed.stderr,/precision_host_required|missing_argument:/u);

console.log("VOID_DATANET_REGISTRY_ISOLATED_REVIEWED_EXECUTION_V1_GREEN");
console.log("reviewed_graph_executes_in_parent=false");
console.log("child_stdio_null=true");
console.log("child_ipc=false");
console.log("stdio_constructor_network_escape_rejected=true");
console.log("approved_reviewed_node_http_control_green=true");
console.log("process_execve_denied=true");
console.log("descriptor_bound_child_output=true");
console.log("abnormal_child_exit_fails_closed=true");
console.log("execution_network_isolation_provided=true");
console.log("live_rpc_performed=false");
console.log("transaction_broadcast_performed=false");
