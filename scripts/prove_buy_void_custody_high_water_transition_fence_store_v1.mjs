#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  buildBuyVoidCustodyHighWaterTransitionFenceV1,
} from "../src/economic/buy_void_custody_high_water_transition_fence_v1.mjs";
import {
  VOID_BUY_VOID_CUSTODY_HIGH_WATER_TRANSITION_FENCE_STORE_POLICY_V1,
  createOrReadBuyVoidCustodyHighWaterTransitionFenceRecordV1,
} from "../src/economic/buy_void_custody_high_water_transition_fence_store_v1.mjs";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const STORE_SOURCE=
  "src/economic/buy_void_custody_high_water_transition_fence_store_v1.mjs";
const TRANSITION_SOURCE=
  "src/economic/buy_void_custody_high_water_transition_fence_v1.mjs";
const EXPECTED_STORE_BLOB=
  "27937f3838852da1709581dbd646d4e2e4335afe";
const EXPECTED_TRANSITION_BLOB=
  "335d7ac544805c819d385f93a74be07adc6e056a";

function blob(bytes){
  return crypto.createHash("sha1")
    .update(Buffer.from("blob "+bytes.length+"\0","utf8"))
    .update(bytes).digest("hex");
}
function shaId(ch){return "sha256:"+ch.repeat(64);}
function gen(ch){return "0x"+ch.repeat(64);}
function highWater({
  sequence,
  source=shaId("a"),
  generation=gen("b"),
  tip=shaId(String(sequence%10)),
  prefix=shaId("c"),
}){
  return Buffer.from(JSON.stringify({
    marker:"VOID_BUY_VOID_CUSTODY_LAUNCH_HIGH_WATER_V2",
    version:2,
    source_composition_id:source,
    sequence,
    generation,
    state:"active",
    tip_sha256:tip,
    journal_prefix_sha256:prefix,
  },null,2)+"\n","utf8");
}
function fixture(prefix="void-transition-fence-store-"){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),prefix));
  fs.chmodSync(root,0o700);
  return root;
}
function mode(pathname){
  return fs.lstatSync(pathname).mode & 0o7777;
}

const storeBytes=fs.readFileSync(path.join(ROOT,STORE_SOURCE));
const transitionBytes=fs.readFileSync(path.join(ROOT,TRANSITION_SOURCE));
assert.equal(blob(storeBytes),EXPECTED_STORE_BLOB);
assert.equal(blob(transitionBytes),EXPECTED_TRANSITION_BLOB);
const storeSource=storeBytes.toString("utf8");
assert.equal(storeSource.includes("unlinkSync"),false);
assert.equal(storeSource.includes("rmdirSync"),false);
assert.equal(storeSource.includes("renameSync"),false);
assert.ok(storeSource.includes("O_EXCL"));
assert.ok(storeSource.includes("O_NOFOLLOW"));
assert.ok(storeSource.includes("fs.fsyncSync(fd)"));
assert.ok(storeSource.includes("fs.fsyncSync(root.fd)"));

const policy=
  VOID_BUY_VOID_CUSTODY_HIGH_WATER_TRANSITION_FENCE_STORE_POLICY_V1;
assert.equal(policy.source_only_store,true);
assert.equal(policy.create_only_record_publication,true);
assert.equal(policy.record_deletion_allowed,false);
assert.equal(policy.stale_record_automatic_reap,false);
assert.equal(policy.partial_create_automatic_cleanup,false);
assert.equal(policy.partial_create_requires_external_recovery,true);
assert.equal(policy.high_water_write_performed,false);
assert.equal(policy.service_mounted,false);
assert.equal(policy.custody_reserve_method_enabled,false);
assert.equal(policy.custody_recover_method_enabled,false);
assert.equal(policy.production_allocation_mutation_ready,false);
assert.equal(policy.funds_moved,false);

const h1=highWater({sequence:1,generation:gen("1"),tip:shaId("1")});
const h2=highWater({sequence:3,generation:gen("2"),tip:shaId("2"),prefix:shaId("d")});
const h3=highWater({sequence:5,generation:gen("3"),tip:shaId("3"),prefix:shaId("e")});

const t12=buildBuyVoidCustodyHighWaterTransitionFenceV1({
  prior_high_water_bytes:h1,
  next_high_water_bytes:h2,
});
const t13=buildBuyVoidCustodyHighWaterTransitionFenceV1({
  prior_high_water_bytes:h1,
  next_high_water_bytes:h3,
});
assert.equal(t12.transition_slot_id,t13.transition_slot_id);
assert.notEqual(t12.record_sha256,t13.record_sha256);

{
  const root=fixture();
  try{
    const created=createOrReadBuyVoidCustodyHighWaterTransitionFenceRecordV1({
      fence_root:root,
      expected_record_bytes:t12.record_bytes,
    });
    assert.equal(created.status,"created");
    assert.equal(created.operation_performed,true);
    assert.equal(created.record_deletion_allowed,false);
    assert.equal(created.high_water_write_performed,false);

    const file=path.join(root,t12.transition_slot_id+".json");
    assert.equal(fs.existsSync(file),true);
    assert.equal(mode(file),0o600);
    assert.ok(fs.readFileSync(file).equals(t12.record_bytes));

    const replay=createOrReadBuyVoidCustodyHighWaterTransitionFenceRecordV1({
      fence_root:root,
      expected_record_bytes:t12.record_bytes,
    });
    assert.equal(replay.status,"exists_same_transition");
    assert.equal(replay.operation_performed,false);

    assert.throws(
      ()=>createOrReadBuyVoidCustodyHighWaterTransitionFenceRecordV1({
        fence_root:root,
        expected_record_bytes:t13.record_bytes,
      }),
      /custody_hw_transition_fence_competing_successor_same_prior/u,
    );
    assert.ok(fs.readFileSync(file).equals(t12.record_bytes),
      "competing successor changed permanent slot");
  }finally{
    fs.rmSync(root,{recursive:true,force:true});
  }
}

{
  const root=fixture();
  try{
    const file=path.join(root,t12.transition_slot_id+".json");
    fs.writeFileSync(file,"{",{mode:0o600});
    const before=fs.readFileSync(file);
    assert.throws(
      ()=>createOrReadBuyVoidCustodyHighWaterTransitionFenceRecordV1({
        fence_root:root,
        expected_record_bytes:t12.record_bytes,
      }),
      /custody_hw_transition_fence_record_json_invalid/u,
    );
    assert.ok(fs.readFileSync(file).equals(before),
      "malformed permanent slot was auto-cleaned");
  }finally{
    fs.rmSync(root,{recursive:true,force:true});
  }
}

{
  const root=fixture();
  try{
    const target=path.join(root,"target");
    fs.writeFileSync(target,"x",{mode:0o600});
    const file=path.join(root,t12.transition_slot_id+".json");
    fs.symlinkSync("target",file);
    assert.throws(
      ()=>createOrReadBuyVoidCustodyHighWaterTransitionFenceRecordV1({
        fence_root:root,
        expected_record_bytes:t12.record_bytes,
      }),
      /custody_hw_transition_fence_store_existing_record_shape_invalid/u,
    );
    assert.equal(fs.lstatSync(file).isSymbolicLink(),true);
  }finally{
    fs.rmSync(root,{recursive:true,force:true});
  }
}

{
  const root=fixture();
  try{
    fs.chmodSync(root,0o750);
    assert.throws(
      ()=>createOrReadBuyVoidCustodyHighWaterTransitionFenceRecordV1({
        fence_root:root,
        expected_record_bytes:t12.record_bytes,
      }),
      /custody_hw_transition_fence_store_private_root_owner_mode_required/u,
    );
  }finally{
    fs.chmodSync(root,0o700);
    fs.rmSync(root,{recursive:true,force:true});
  }
}

{
  const actual=fixture("void-transition-fence-real-");
  const link=actual+"-symlink";
  try{
    fs.symlinkSync(actual,link);
    assert.throws(
      ()=>createOrReadBuyVoidCustodyHighWaterTransitionFenceRecordV1({
        fence_root:link,
        expected_record_bytes:t12.record_bytes,
      }),
      /custody_hw_transition_fence_store_ancestor_not_direct_directory/u,
    );
  }finally{
    try{fs.unlinkSync(link);}catch{}
    fs.rmSync(actual,{recursive:true,force:true});
  }
}

async function childRace(root,recordBytes){
  const moduleUrl=pathToFileURL(path.join(
    ROOT,
    "src/economic/buy_void_custody_high_water_transition_fence_store_v1.mjs",
  )).href;
  const code=[
    'import {createOrReadBuyVoidCustodyHighWaterTransitionFenceRecordV1 as run} from '+JSON.stringify(moduleUrl)+';',
    'const root=process.env.FENCE_ROOT;',
    'const bytes=Buffer.from(process.env.FENCE_RECORD_B64,"base64");',
    'try{const out=run({fence_root:root,expected_record_bytes:bytes});',
    'process.stdout.write(JSON.stringify({ok:true,status:out.status})+"\\n");}',
    'catch(error){process.stdout.write(JSON.stringify({ok:false,error:String(error?.message||error)})+"\\n");process.exitCode=3;}',
  ].join("");
  return await new Promise((resolve,reject)=>{
    const child=spawn(process.execPath,["--input-type=module","-e",code],{
      env:{
        ...process.env,
        FENCE_ROOT:root,
        FENCE_RECORD_B64:recordBytes.toString("base64"),
      },
      stdio:["ignore","pipe","pipe"],
    });
    let stdout="",stderr="";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data",c=>{stdout+=c;});
    child.stderr.on("data",c=>{stderr+=c;});
    child.once("error",reject);
    child.once("exit",codeValue=>{
      try{
        const line=stdout.trim().split(/\r?\n/u).filter(Boolean).at(-1);
        assert.ok(line,"child produced no result:"+stderr);
        resolve({exit:codeValue,result:JSON.parse(line)});
      }catch(error){reject(error);}
    });
  });
}

{
  const root=fixture("void-transition-fence-race-");
  try{
    const [a,b]=await Promise.all([
      childRace(root,t12.record_bytes),
      childRace(root,t13.record_bytes),
    ]);
    const results=[a,b];
    assert.equal(results.filter(x=>x.result.ok===true).length,1,
      "exactly one competing successor must own create-only slot");
    assert.equal(results.filter(x=>x.result.ok===false).length,1);
    const loser=results.find(x=>x.result.ok===false);
    assert.match(
      loser.result.error,
      /custody_hw_transition_fence_(?:competing_successor_same_prior|record_json_invalid)|custody_hw_transition_fence_store_existing_record_/u,
      "loser must fail closed on winner's slot",
    );
    const file=path.join(root,t12.transition_slot_id+".json");
    const actual=fs.readFileSync(file);
    assert.ok(actual.equals(t12.record_bytes)||actual.equals(t13.record_bytes));
  }finally{
    fs.rmSync(root,{recursive:true,force:true});
  }
}

console.log("VOID_BUY_VOID_CUSTODY_HIGH_WATER_TRANSITION_FENCE_STORE_V1_GREEN");
console.log("store_source_blob="+EXPECTED_STORE_BLOB);
console.log("transition_source_blob="+EXPECTED_TRANSITION_BLOB);
console.log("create_only_record_created_and_fsynced=true");
console.log("exact_replay_performs_no_second_write=true");
console.log("same_prior_competing_successor_rejected=true");
console.log("malformed_existing_slot_retained_fail_closed=true");
console.log("symlink_slot_rejected_without_cleanup=true");
console.log("private_root_exact_0700_required=true");
console.log("root_symlink_rejected=true");
console.log("independent_process_competition_exactly_one_winner=true");
console.log("record_deletion_allowed=false");
console.log("partial_create_automatic_cleanup=false");
console.log("high_water_write_performed=false");
console.log("service_mounted=false");
console.log("custody_reserve_method_enabled=false");
console.log("custody_recover_method_enabled=false");
console.log("production_allocation_mutation_ready=false");
console.log("funds_moved=false");
