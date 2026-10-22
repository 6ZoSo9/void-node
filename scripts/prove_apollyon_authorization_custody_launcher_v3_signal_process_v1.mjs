#!/usr/bin/env node
import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import path from "node:path";
import {fileURLToPath,pathToFileURL} from "node:url";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const LAUNCHER=path.join(
  ROOT,
  "tools/apollyon-authorization-custody-launcher-v3.mjs",
);
const launcherUrl=pathToFileURL(LAUNCHER).href;

async function runSignal(signal){
  const childSource=`
    import {
      waitForApollyonAuthorizationCustodyShutdownV3,
    } from ${JSON.stringify(launcherUrl)};
    const serviceLifetimeHandle=setTimeout(()=>{},10_000);
    const service={
      async stop(){
        process.stdout.write("STOP_BEGIN\\n");
        clearTimeout(serviceLifetimeHandle);
        await new Promise((resolve)=>setTimeout(resolve,100));
        process.stdout.write("STOP_SETTLED\\n");
      },
    };
    const shutdownPromise=
      waitForApollyonAuthorizationCustodyShutdownV3(service,process);
    process.stdout.write("READY\\n");
    await shutdownPromise;
    process.stdout.write("TOP_LEVEL_AWAIT_SETTLED\\n");
  `;

  const child=spawn(
    process.execPath,
    ["--input-type=module","--eval",childSource],
    {
      cwd:ROOT,
      stdio:["ignore","pipe","pipe"],
      env:{
        PATH:process.env.PATH??"/usr/bin:/bin",
        LC_ALL:"C",
      },
    },
  );

  let stdout="";
  let stderr="";
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data",(chunk)=>{ stdout+=chunk; });
  child.stderr.on("data",(chunk)=>{ stderr+=chunk; });

  await new Promise((resolve,reject)=>{
    const timeout=setTimeout(
      ()=>reject(new Error("child_ready_timeout:"+signal)),
      3000,
    );
    const onData=()=>{
      if(!stdout.includes("READY\n"))return;
      clearTimeout(timeout);
      child.stdout.off("data",onData);
      resolve();
    };
    child.stdout.on("data",onData);
    child.once("error",(error)=>{
      clearTimeout(timeout);
      reject(error);
    });
  });

  const exitPromise=new Promise((resolve,reject)=>{
    const timeout=setTimeout(()=>{
      child.kill("SIGKILL");
      reject(new Error("child_exit_timeout:"+signal));
    },3000);
    child.once("close",(code,childSignal)=>{
      clearTimeout(timeout);
      resolve({code,childSignal});
    });
    child.once("error",(error)=>{
      clearTimeout(timeout);
      reject(error);
    });
  });

  assert.equal(child.kill(signal),true);

  await new Promise((resolve,reject)=>{
    const timeout=setTimeout(
      ()=>reject(new Error("child_stop_begin_timeout:"+signal)),
      1000,
    );
    const onData=()=>{
      if(!stdout.includes("STOP_BEGIN\n"))return;
      clearTimeout(timeout);
      child.stdout.off("data",onData);
      resolve();
    };
    child.stdout.on("data",onData);
  });

  assert.equal(child.kill(signal),true);
  const result=await exitPromise;

  assert.deepEqual(result,{code:0,childSignal:null});
  assert.equal((stdout.match(/STOP_BEGIN\n/gu)??[]).length,1,stdout);
  assert.equal((stdout.match(/STOP_SETTLED\n/gu)??[]).length,1,stdout);
  assert.equal(stdout.includes("TOP_LEVEL_AWAIT_SETTLED\n"),true,stdout);
  assert.equal(stderr.includes("unsettled top-level await"),false,stderr);
  assert.equal(stderr.includes("Warning:"),false,stderr);
  assert.equal(stdout.includes("STOP_SETTLED\n"),true,stdout);
  return {signal,stdout,stderr};
}

const term=await runSignal("SIGTERM");
const intr=await runSignal("SIGINT");

assert.equal(term.stderr,"");
assert.equal(intr.stderr,"");

console.log("VOID_APOLLYON_AUTHORIZATION_CUSTODY_LAUNCHER_V3_SIGNAL_PROCESS_V1_PROOF_GREEN");
console.log("sigterm_child_exit_zero=true");
console.log("sigint_child_exit_zero=true");
console.log("duplicate_same_signal_child_survives=true");
console.log("duplicate_same_signal_single_stop=true");
console.log("service_lifetime_reference_modeled=true");
console.log("service_stop_settled_before_exit=true");
console.log("top_level_await_settled=true");
console.log("unsettled_top_level_await_warning_absent=true");
console.log("operator_private_key_access=false");
console.log("attempt_claim=false");
console.log("training_execution=false");
console.log("funds_movement=false");
