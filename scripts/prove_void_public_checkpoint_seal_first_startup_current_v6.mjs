#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const OLD_HEAD="5c8ce0f1a2dc7f45e522bcbd513ae3f4872117bc";
const OLD_BLOB="240414e313f44f80d57f4e349be2f1ab3d72fe66";
const REVIEWED_MAIN_HEAD="cd7dfcf89fcbe62b5ece9a1e39543b525115a7a8";
const REVIEWED_MAIN_BLOB="1fde828c97175560f98ab070af33eefc595f8002";
const REVIEWED_V2_BLOB="b03a985c9c4a3dc78ebe3221ee1f2d8b87023b27";
const NEW_BLOB="a09661797aa4295371c036be36d82995e5233269";
const FROZEN_CURRENT_V4_PROOF_GIT_BLOB="7b0a2e99cd9df06c5a4d5b7da21873cf4c288ed5";
const FROZEN_CURRENT_V5_PROOF_GIT_BLOB="01bd8df01944457b3f4ffc846e62f765015eb7d3";
const previous=execFileSync("git",["show",OLD_HEAD+":src/index.ts"],{maxBuffer:8*1024*1024});
const priorMain=execFileSync("git",["show",REVIEWED_MAIN_HEAD+":src/index.ts"],{maxBuffer:8*1024*1024});
const current=fs.readFileSync("src/index.ts");
function gitBlob(b){return crypto.createHash("sha1").update(
  Buffer.from("blob "+b.length+"\0")).update(b).digest("hex");}
const frozenV4Proof=fs.readFileSync(
  "scripts/prove_void_public_checkpoint_seal_first_startup_current_v4.mjs",
);
assert.equal(
  gitBlob(frozenV4Proof),
  FROZEN_CURRENT_V4_PROOF_GIT_BLOB,
  "frozen checkpoint current V4 proof changed",
);
const frozenV5Proof=fs.readFileSync(
  "scripts/prove_void_public_checkpoint_seal_first_startup_current_v5.mjs",
);
assert.equal(
  gitBlob(frozenV5Proof),
  FROZEN_CURRENT_V5_PROOF_GIT_BLOB,
  "frozen checkpoint current V5 proof changed",
);
assert.equal(gitBlob(previous),OLD_BLOB,"historical source must remain bound");
assert.equal(gitBlob(priorMain),REVIEWED_MAIN_BLOB,
  "frozen seal-first main source must remain bound");
assert.equal(gitBlob(current),NEW_BLOB,"candidate source identity");
assert.ok(current.length<=3852487,"src/index.ts original hard byte ceiling");
const old=previous.toString("utf8"),
  baseline=priorMain.toString("utf8"),
  s=current.toString("utf8");
function once(text,needle,replacement,label){
  const p=text.split(needle);assert.equal(p.length,2,"nonunique "+label);
  return p[0]+replacement+p[1];
}
let expected=once(old,
  "/* Optional legacy helper (safe to keep for scripts/tests) */\n"+
  "const __apiSegStore =\n"+
  "new SegStore(DATA_DIR, { segmentMaxBytes: 8 * 1024 * 1024, sparseEvery: 16 } as any);",
  "/* Bind legacy helper after Node's inherited-seal admission. */\n"+
  "let __apiSegStore: SegStore | null = null;","eager SegStore");
const priorSchedule=expected.indexOf('  if (process.env.VOID_SKIP_AUTOREPAIR === "1") {');
const priorScheduleEnd=expected.indexOf("  /* ---------- boot node ---------- */",priorSchedule);
assert.ok(priorSchedule>0&&priorScheduleEnd>priorSchedule);
const originalBranch=expected.slice(priorSchedule,priorScheduleEnd);
assert.equal(originalBranch.split("autoRepairDataDir(DATA_DIR").length,2);
expected=expected.slice(0,priorSchedule)+expected.slice(priorScheduleEnd);
const tail="    udpSwarmAllowNonPublicEndpoint:\n"+
  "      udpSwarmRuntimeConfig.allow_nonpublic_endpoints,\n  });";
const ctorPos=expected.indexOf("  const node = new Node(P2P_PORT, kp, {");
const afterCtor=expected.indexOf(tail,ctorPos)+tail.length;
assert.ok(ctorPos>0&&afterCtor>ctorPos);
expected=expected.slice(0,afterCtor)+"\n  __apiSegStore = node.store;\n"+
  originalBranch+expected.slice(afterCtor);
// The original frozen V1 proof *must still reject* the modified Buy VOID
// source generation. Qualify its historical exact two-hunk checkpoint change
// on the immutable reviewed main snapshot first, then separately authenticate
// the current generation's complete inherited startup segment byte-for-byte.
assert.equal(baseline,expected,
  "frozen main must equal exactly the historic two-hunk seal-first repair");
const markerStart="  const node = new Node(P2P_PORT, kp, {";
const markerEnd="\n// [ADD] expose live node globally";
const mainStart=baseline.indexOf(markerStart);
const mainEnd=baseline.indexOf(markerEnd,mainStart);
const successorStart=s.indexOf(markerStart);
const successorEnd=s.indexOf(markerEnd,successorStart);
assert.ok(mainStart>=0&&mainEnd>mainStart&&
  successorStart>=0&&successorEnd>successorStart,
  "closed checkpoint startup slice missing");
assert.equal(baseline.indexOf(markerStart,mainStart+1),-1,
  "frozen source may not have duplicate node boot constructors");
assert.equal(s.indexOf(markerStart,successorStart+1),-1,
  "new generation may not have duplicate node boot constructors");
assert.equal(s.slice(successorStart,successorEnd),
  baseline.slice(mainStart,mainEnd),
  "new Buy VOID source must preserve the reviewed checkpoint startup code");
assert.equal((s.match(/new\s+SegStore\s*\(/gu)||[]).length,0);
assert.equal(s.split("__apiSegStore").length,old.split("__apiSegStore").length+1);
const start=s.indexOf("  const node = new Node(P2P_PORT, kp, {");
const binding=s.indexOf("  __apiSegStore = node.store;");
const repair=s.indexOf('  if (process.env.VOID_SKIP_AUTOREPAIR === "1") {');
const next=s.indexOf("  await node.start();");
const regionEnd=s.indexOf("\n// [ADD] expose live node globally",repair);
assert.ok(start<binding&&binding<repair&&repair<regionEnd&&regionEnd<next,
  "only real Node seal admission can precede generic repair scheduling");

const actualStartup=s.slice(start,regionEnd);
function fixture(reject,skip){
  const events=[],timers=[],store=Object.freeze({identity:"admitted-store"});
  let admitted=false;
  class Node {
    store=store;
    constructor(){events.push("node-constructor");if(reject)throw Error("synthetic_seal_rejected");admitted=true;}
  }
  const program=[
    "async function run(){",
    "let __apiSegStore=null, storageRepairState='pending', storageRepairError='';",
    "let storageRepairFinishedAt=0, storageRepairStartedAt=0;",
    "const P2P_PORT=4700, kp={}, ALLOW_EMPTY_BLOCKS=false, DATA_DIR='/synthetic/test';",
    "const udpSwarmRuntimeConfig={relay_server_enabled:false,relay_public_endpoint:null,allow_nonpublic_endpoints:false};",
    actualStartup,
    "return {node,alias:__apiSegStore,state:()=>storageRepairState};",
    "}",
    "globalThis.syntheticRun=run;"
  ].join("\n");
  const transpiled=ts.transpileModule(program,{
    compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None},
    reportDiagnostics:true
  });
  assert.equal(transpiled.diagnostics.length,0,"actual TypeScript startup slice compiles");
  const ctx=vm.createContext({
    Node,Date,Promise,
    process:{env:skip?{VOID_SKIP_AUTOREPAIR:"1"}:{}},
    setTimeout:(f,delay)=>{assert.equal(delay,1);events.push("repair-scheduled");timers.push(f);},
    autoRepairDataDir:()=>{assert.ok(admitted,"repair before inherited seal");events.push("repair-executed");},
    console:{log(){},error(){throw Error("unexpected error");}},
  });
  vm.runInContext(transpiled.outputText,ctx,{timeout:2000});
  return {run:ctx.syntheticRun,events,timers,store};
}
const failed=fixture(true,false);
await assert.rejects(()=>failed.run(),/synthetic_seal_rejected/);
assert.deepEqual(failed.events,["node-constructor"]);
assert.equal(failed.timers.length,0,"failed inherited seal must not schedule repair");

const normal=fixture(false,false),ok=await normal.run();
assert.equal(ok.alias,ok.node.store);
assert.equal(ok.alias,normal.store);
assert.equal(ok.state(),"pending","no premature repair-ready");
assert.deepEqual(normal.events,["node-constructor","repair-scheduled"]);
assert.equal(normal.timers.length,1);
normal.timers[0]();
await new Promise(resolve=>setImmediate(resolve));
assert.equal(ok.state(),"green","normal repair eventually green");
assert.deepEqual(normal.events,["node-constructor","repair-scheduled","repair-executed"]);

const skipped=fixture(false,true),noRepair=await skipped.run();
assert.equal(noRepair.state(),"skipped");
assert.equal(noRepair.alias,skipped.store);
assert.deepEqual(skipped.events,["node-constructor"]);
assert.equal(skipped.timers.length,0);

console.log("VOID_PUBLIC_CHECKPOINT_SEAL_FIRST_STARTUP_CURRENT_V6_PROOF_GREEN");
console.log("frozen_checkpoint_v4_proof_unchanged=true");
console.log("frozen_checkpoint_v5_proof_unchanged=true");
console.log("frozen_seal_first_v1_proof_unchanged=true");
console.log("reviewed_checkpoint_v2_predecessor_identity_recorded=true");
console.log("current_index_source_generation_exact=true");
console.log("inherited_checkpoint_startup_bytes_identical=true");
console.log("historical_two_hunk_checkpoint_patch_exact=true");
console.log("exact_historical_and_new_git_blobs_verified=true");
console.log("src_index_original_hard_size_ceiling_preserved=true");
console.log("eager_duplicate_segstore_removed=true");
console.log("legacy_observers_rebound_to_admitted_store=true");
console.log("failed_inherited_node_admission_schedules_no_repair=true");
console.log("normal_repair_runs_only_after_node_constructor=true");
console.log("normal_readiness_not_premature=true");
console.log("explicit_skip_behavior_preserved=true");
console.log("outside_machine_acceptance_proven=false");
console.log("service_mutation=false");
console.log("wallet_signer_or_funds_access=false");
