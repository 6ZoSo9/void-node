#!/usr/bin/env node
// Real OS-process cross-writer race: permanently fenced ACTUAL high-water
// writer, with an inert classifier and private disposable OS-temp fixtures.
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  buildBuyVoidCustodyLaunchHighWaterV2 as buildHigh,
} from "../src/economic/buy_void_custody_launch_authority_v2.mjs";
import {
  VOID_BUY_VOID_CUSTODY_PERMANENT_FENCE_DIRECTORY_V1 as FENCE,
} from "../src/economic/buy_void_custody_launch_high_water_writer_v1.mjs";
import {
  testOnlyCreateBuyVoidCustodyPermanentlyFencedLockedAdvanceV1 as createTest,
} from "../src/economic/buy_void_custody_locked_advance_v1.mjs";
import {
  buildBuyVoidCustodyHighWaterTransitionFenceV1 as buildFence,
} from "../src/economic/buy_void_custody_high_water_transition_fence_v1.mjs";

const SELF = fileURLToPath(import.meta.url);
const SOURCE = "sha256:" + "11".repeat(32);
const PRIOR = buildHigh({
  source_composition_id: SOURCE, sequence: 1,
  generation: "0x" + "22".repeat(32),
  tip_sha256: "sha256:" + "33".repeat(32),
  journal_prefix_sha256: "sha256:" + "44".repeat(32),
});
function successor(id) {
  return buildHigh({
    source_composition_id: SOURCE, sequence: 3,
    generation: "0x" + (id === "a" ? "55" : "99").repeat(32),
    tip_sha256: "sha256:" + (id === "a" ? "66" : "88").repeat(32),
    journal_prefix_sha256: "sha256:" + "77".repeat(32),
  });
}
const A = successor("a");
const B = successor("b");
const JOURNAL = Buffer.from("synthetic-two-writer-journal\n", "utf8");
const RECORD = "buy-void-custody-launch-high-water-v2.json";
function hash(bytes) {
  return "sha256:" + crypto.createHash("sha256").update(bytes).digest("hex");
}
function makeClassifier(id) {
  const next = id === "a" ? A : B;
  return observed => {
    if (!observed.generation_journal_bytes.equals(JOURNAL)) {
      return Object.freeze({ready:false, reason:"synthetic_journal_mismatch"});
    }
    if (observed.custody_high_water_bytes?.equals(PRIOR)) {
      return Object.freeze({
        ready:false, reason:"custody_launch_high_water_advance_required",
        sequence:3, generation:"0x" + (id === "a" ? "55" : "99").repeat(32),
        high_water_matches_current:false, high_water_advance_required:true,
        candidate_high_water_json:next.toString("utf8"),
        candidate_high_water_sha256:hash(next),
      });
    }
    if (observed.custody_high_water_bytes?.equals(next)) {
      return Object.freeze({
        ready:true, reason:null, high_water_matches_current:true,
        high_water_advance_required:false,
      });
    }
    return Object.freeze({
      ready:false, reason:"synthetic_competing_successor_already_published",
      high_water_matches_current:false, high_water_advance_required:false,
    });
  };
}
function fixture(name) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "void-permanent-cross-" + name + "-"));
  fs.chmodSync(root, 0o700);
  const custody = path.join(root, "custody");
  const journalDir = path.join(root, "journal");
  const receiptDir = path.join(root, "receipt");
  for (const dir of [custody, journalDir, receiptDir, path.join(custody,FENCE)]) {
    fs.mkdirSync(dir, { mode: 0o700 });
    fs.chmodSync(dir, 0o700);
  }
  const journal = path.join(journalDir, "generation.jsonl");
  const receipt = path.join(receiptDir, "activation.json");
  for (const [p,bytes] of [
    [journal,JOURNAL], [receipt,Buffer.from("synthetic-inert-receipt\n")],
    [path.join(custody,RECORD),PRIOR],
  ]) {
    fs.writeFileSync(p,bytes,{mode:0o600});
    fs.chmodSync(p,0o600);
  }
  return {
    root, custody,
    config: {
      generation_journal_path:journal,
      activation_receipt_path:receipt,
      custody_root:custody,
    },
  };
}
async function worker(root,id) {
  assert.ok(["a","b"].includes(id));
  const f = {
    generation_journal_path:path.join(root,"journal","generation.jsonl"),
    activation_receipt_path:path.join(root,"receipt","activation.json"),
    custody_root:path.join(root,"custody"),
  };
  assert.equal(fs.statSync(root).uid, process.getuid());
  assert.equal(fs.statSync(root).mode & 0o777, 0o700);
  process.stdout.write("READY\n");
  const gate = path.join(root,"go");
  const deadline = Date.now() + 15000;
  while (!fs.existsSync(gate)) {
    if (Date.now() > deadline) throw new Error("synthetic_worker_gate_timeout");
    await new Promise(resolve => setTimeout(resolve, 2));
  }
  const result = createTest(f,makeClassifier(id)).advance();
  assert.equal(typeof result.ok,"boolean");
  assert.equal(result.source_only_unmounted,true);
  assert.equal(result.production_allocation_mutation_ready,false);
  process.stdout.write("RESULT:" + JSON.stringify({
    variant:id,ok:result.ok,status:result.status,
    mutated:result.operation_performed,
  }) + "\n");
}
function spawnWorker(root,id) {
  const child = spawn(process.execPath,[SELF,"--worker",root,id],{
    stdio:["ignore","pipe","pipe"],
    env:{PATH:process.env.PATH||"/usr/bin:/bin",HOME:"/nonexistent",LANG:"C",TZ:"UTC"},
  });
  let stdout="",stderr="",readySeen=false;
  let readyResolve,readyReject;
  const ready = new Promise((resolve,reject) => {readyResolve=resolve;readyReject=reject;});
  const finished = new Promise((resolve,reject)=>{
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data",value=>{
      stdout+=value;
      if (!readySeen && stdout.includes("READY\n")) {
        readySeen=true; readyResolve();
      }
    });
    child.stderr.on("data",value=>{stderr+=value;});
    child.on("error",error=>{readyReject(error);reject(error);});
    child.on("close",code=>{
      if(!readySeen)readyReject(new Error("worker_did_not_become_ready"));
      if(code!==0)return reject(new Error("synthetic_worker_failed_"+code+" "+stderr.slice(0,300)));
      try {
        const line=stdout.split("\n").find(value=>value.startsWith("RESULT:"));
        assert.ok(line,"worker result missing");
        resolve(JSON.parse(line.slice("RESULT:".length)));
      } catch(error){reject(error);}
    });
  });
  return {ready,finished,child};
}
async function parent() {
  assert.equal(process.platform,"linux");
  assert.ok(typeof process.getuid==="function" && process.getuid()>0);
  const x=buildFence({prior_high_water_bytes:PRIOR,next_high_water_bytes:A});
  const y=buildFence({prior_high_water_bytes:PRIOR,next_high_water_bytes:B});
  assert.equal(x.transition_slot_id,y.transition_slot_id);
  assert.ok(!x.record_bytes.equals(y.record_bytes));
  for (let trial=0;trial<3;trial++) {
    const f=fixture(String(trial));
    let workers=[];
    try {
      workers=[spawnWorker(f.root,"a"),spawnWorker(f.root,"b")];
      await Promise.all(workers.map(w=>w.ready));
      fs.writeFileSync(path.join(f.root,"go"),"go\n",{mode:0o600,flag:"wx"});
      const results=await Promise.all(workers.map(w=>w.finished));
      assert.equal(results.filter(r=>r.status==="advanced"&&r.ok===true&&r.mutated===true).length,1,
        "exactly one real writer advances");
      assert.equal(results.filter(r=>r.status==="held"&&r.ok===false).length,1,
        "losing writer must HOLD");
      const winner=results.find(r=>r.ok===true);
      const wanted=winner.variant==="a"?A:B;
      const plan=winner.variant==="a"?x:y;
      assert.deepEqual(fs.readFileSync(path.join(f.custody,RECORD)),wanted,
        "published high-water matches unique winner");
      const directory=path.join(f.custody,FENCE);
      const slots=fs.readdirSync(directory);
      assert.deepEqual(slots,[plan.transition_slot_id+".json"]);
      const file=path.join(directory,slots[0]);
      assert.deepEqual(fs.readFileSync(file),plan.record_bytes,
        "permanent fence binds only the published successor");
      assert.equal(fs.statSync(file).mode&0o777,0o600);
      assert.equal(fs.readdirSync(f.custody).filter(q=>q.includes(".tmp-")).length,0,
        "in-flight temps never survive successful synthetic writer competition");
    } finally {
      for(const worker of workers) {
        if(worker.child.exitCode===null)worker.child.kill("SIGKILL");
      }
      fs.rmSync(f.root,{recursive:true,force:true});
    }
  }
  console.log("actual_two_os_processes_one_high_water_successor=true");
  console.log("permanent_same_prior_slot_prevents_competing_successor=true");
  console.log("three_independent_cross_process_trials=true");
  console.log("no_fence_overwrite_or_rollback=true");
  console.log("source_only_unmounted=true");
  console.log("production_allocation_mutation_ready=false");
  console.log("funds_moved=false");
  console.log("VOID_BUY_VOID_CUSTODY_PERMANENT_FENCED_CROSS_PROCESS_V1_GREEN");
}
const args=process.argv.slice(2);
if(args.length===3&&args[0]==="--worker")await worker(args[1],args[2]);
else if(args.length===0)await parent();
else throw new Error("fixture_only_worker_arguments_invalid");
