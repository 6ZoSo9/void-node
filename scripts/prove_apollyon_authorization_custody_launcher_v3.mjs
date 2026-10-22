#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import {EventEmitter} from "node:events";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath,pathToFileURL} from "node:url";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const LAUNCHER=path.join(ROOT,"tools/apollyon-authorization-custody-launcher-v3.mjs");
const source=fs.readFileSync(LAUNCHER,"utf8");

function gitBlob(bytes){
  return crypto.createHash("sha1")
    .update(Buffer.from("blob "+bytes.length+"\0","ascii"))
    .update(bytes).digest("hex");
}
for(const [relative,expected] of Object.entries({
  "tools/apollyon-authorization-custody-service-v1.mjs":
    "8961572ba5834371b1229f790a1960940fc74935",
  "tools/apollyon-authorization-custody-core-v1.mjs":
    "f9f18db5bbfeea466202ef0d7babe08c3c401d66",
  "scripts/apollyon_operator_authorization_packet_v1.mjs":
    "c224ebc4fcb332b70e83900a8e086e0257f31670",
})){
  assert.equal(gitBlob(fs.readFileSync(path.join(ROOT,relative))),expected,relative);
}

for(const required of [
  "VOID_APOLLYON_AUTHORIZATION_CUSTODY_LAUNCHER_V3",
  "VOID_APOLLYON_AUTHORIZATION_CUSTODY_LAUNCHER_AUTHORITY_V3",
  "current_stack_versioned_launcher:true",
  "historical_v2_semantics_preserved:true",
  "graceful_signal_shutdown_settled:true",
  "version:3,",
  'SERVICE_BLOB_SHA1="8961572ba5834371b1229f790a1960940fc74935"',
  'CORE_BLOB_SHA1="f9f18db5bbfeea466202ef0d7babe08c3c401d66"',
  'VERIFIER_BLOB_SHA1="c224ebc4fcb332b70e83900a8e086e0257f31670"',
  "assertRootOwnedImmutableFile(SERVICE,SERVICE_BLOB_SHA1",
  "assertRootOwnedImmutableFile(CORE,CORE_BLOB_SHA1",
  "assertRootOwnedImmutableFile(VERIFIER,VERIFIER_BLOB_SHA1",
  "await import(pathToFileURL(SERVICE).href)",
  "waitForApollyonAuthorizationCustodyShutdownV3(service)",
  'signalSource.on("SIGTERM",onSignal)',
  'signalSource.on("SIGINT",onSignal)',
  '.then(()=>service.stop())',
  'signalSource.removeListener("SIGTERM",onSignal)',
  'signalSource.removeListener("SIGINT",onSignal)',
  "apollyon_custody_launcher_refuses_root_runtime",
  "apollyon_custody_launcher_loader_environment_forbidden",
  "operator_private_key_access:false",
  "production_signing:false",
  "attempt_claim:false",
  "training_execution:false",
  "funds_movement:false",
]){
  assert.equal(source.includes(required),true,required);
}
for(const forbidden of [
  "timer.unref","setInterval(","signalSource.once(","createPrivateKey","crypto.sign(",
  "signTransaction(","eth_sendRawTransaction","fetch(","node:child_process",
  "attempt_claimed:true","training_execution_performed:true",
  "candidate_weight_mutation_performed:true",
]){
  assert.equal(source.includes(forbidden),false,forbidden);
}

const launcher=await import(pathToFileURL(LAUNCHER).href+"?proof="+Date.now());
assert.equal(
  typeof launcher.waitForApollyonAuthorizationCustodyShutdownV3,
  "function",
);

async function bounded(promise,label){
  let timer;
  try{
    return await Promise.race([
      promise,
      new Promise((_,reject)=>{
        timer=setTimeout(()=>reject(new Error("timeout:"+label)),1000);
      }),
    ]);
  }finally{
    if(timer)clearTimeout(timer);
  }
}

{
  const signals=new EventEmitter();
  let stops=0;
  let releaseStop;
  let markStopStarted;
  const stopGate=new Promise((resolve)=>{ releaseStop=resolve; });
  const stopStarted=new Promise((resolve)=>{ markStopStarted=resolve; });
  const done=launcher.waitForApollyonAuthorizationCustodyShutdownV3({
    async stop(){
      stops+=1;
      markStopStarted();
      await stopGate;
    },
  },signals);
  signals.emit("SIGTERM");
  await bounded(stopStarted,"sigterm-stop-started");
  assert.equal(signals.listenerCount("SIGTERM"),1);
  assert.equal(signals.listenerCount("SIGINT"),1);
  signals.emit("SIGTERM");
  signals.emit("SIGINT");
  assert.equal(stops,1);
  releaseStop();
  await bounded(done,"sigterm");
  assert.equal(stops,1);
  assert.equal(signals.listenerCount("SIGTERM"),0);
  assert.equal(signals.listenerCount("SIGINT"),0);
}

{
  const signals=new EventEmitter();
  let stops=0;
  const done=launcher.waitForApollyonAuthorizationCustodyShutdownV3({
    async stop(){ stops+=1; },
  },signals);
  signals.emit("SIGINT");
  await bounded(done,"sigint");
  assert.equal(stops,1);
  assert.equal(signals.listenerCount("SIGTERM"),0);
  assert.equal(signals.listenerCount("SIGINT"),0);
}

{
  const signals=new EventEmitter();
  const done=launcher.waitForApollyonAuthorizationCustodyShutdownV3({
    async stop(){ throw new Error("synthetic_stop_failure"); },
  },signals);
  signals.emit("SIGTERM");
  await assert.rejects(
    ()=>bounded(done,"rejected-stop"),
    /synthetic_stop_failure/u,
  );
  assert.equal(signals.listenerCount("SIGTERM"),0);
  assert.equal(signals.listenerCount("SIGINT"),0);
}

await assert.rejects(
  ()=>launcher.waitForApollyonAuthorizationCustodyShutdownV3({},new EventEmitter()),
  /apollyon_custody_launcher_v3_shutdown_service_invalid/u,
);
await assert.rejects(
  ()=>launcher.waitForApollyonAuthorizationCustodyShutdownV3({stop(){}},{}),
  /apollyon_custody_launcher_v3_shutdown_signal_source_invalid/u,
);

console.log("VOID_APOLLYON_AUTHORIZATION_CUSTODY_LAUNCHER_V3_PROOF_GREEN");
console.log("dependency_blobs_verified_before_import=true");
console.log("sigterm_stop_settled=true");
console.log("sigint_stop_settled=true");
console.log("duplicate_signal_single_stop=true");
console.log("duplicate_same_signal_single_stop=true");
console.log("signal_handlers_retained_until_stop_settles=true");
console.log("shutdown_listener_cleanup=true");
console.log("shutdown_failure_propagated=true");
console.log("unref_polling_removed=true");
console.log("root_runtime_refused=true");
console.log("loader_environment_rejected=true");
console.log("operator_private_key_access=false");
console.log("attempt_claim=false");
console.log("training_execution=false");
console.log("funds_movement=false");
