#!/usr/bin/env node
// Independent byte-first oracle. No production admission code imported.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
const [input, output, generation, majorText, mode] = process.argv.slice(2), major = Number(majorText);
assert.equal(process.argv.length, 7); assert([22,24,26].includes(major) && ["single","matrix"].includes(mode));
assert(/^[A-Za-z0-9-]{1,80}$/.test(generation));
const canonical = v => JSON.stringify(v, (_, x) => x && typeof x === "object" && !Array.isArray(x) ? Object.fromEntries(Object.keys(x).sort().map(k => [k,x[k]])) : x);
const sha = b => crypto.createHash("sha256").update(b).digest("hex"), eq = (a,b) => assert.equal(canonical(a),canonical(b));
const git = (...args) => { const r = spawnSync("/usr/bin/git", ["--no-replace-objects", ...args], { env:{PATH:"/usr/bin:/bin",LANG:"C"},timeout:20000,maxBuffer:32*1024*1024 }); assert.equal(r.status,0); return r.stdout; };
const head = git("rev-parse","HEAD").toString().trim(), tree = git("rev-parse","HEAD^{tree}").toString().trim();
const predecessor = "f6d1e41d5e85715a01ed805a0bcb1e75f25a2fa1";
const scenarios = ["predecessor",...[1,2,3,4].map(n=>`mutation-${n}`),...[1,2,3,4].map(n=>`recovery-${n}`)];
const names = ["scripts/lib/void_nimo_executed_runtime_v1.mjs", "scripts/lib/void_nimo_build_admission_v1.mjs",
  "scripts/lib/void_nimo_fresh_sync_session_v1.mjs", "scripts/run_void_public_bootstrap_supervisor_v1.mjs",
  "scripts/run_void_public_bootstrap_child_v1.mjs", "scripts/lib/void_nimo_node_process_observation_v1.mjs",
  "tools/void-nimo-no-tailnet-acceptance-v1.mjs", "scripts/lib/void_public_seed_common_v1.mjs",
  "scripts/prove_void_nimo_executed_runtime_v1.mjs", "scripts/verify_void_nimo_executed_runtime_v1.mjs",
  "scripts/fixtures/nimo-executed-runtime-v1/parent.mjs", "scripts/fixtures/nimo-fresh-sync-v1/node.mjs",
  ".github/workflows/void-nimo-executed-runtime-v1.yml"];
const source = {head,tree,members:names.map(p=>{const b=git("show",`${head}:${p}`);return {path:p,bytes:b.length,sha256:sha(b)};})};
function read(file) {
  const fd=fs.openSync(file,fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW);
  try { const s=fs.fstatSync(fd);assert(s.isFile()&&s.nlink===1&&s.size>0&&s.size<=4*1024*1024);
    const b=fs.readFileSync(fd),v=JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(b));assert.equal(b.length,s.size);
    for(const k of ["dev","ino","size","mtimeMs","ctimeMs"])assert.equal(s[k],fs.fstatSync(fd)[k]);
    assert.equal(b.toString(),canonical(v)+"\n");return {value:v,sha256:sha(b),bytes:b.length};
  } finally {fs.closeSync(fd);}
}
function runtime(r) {eq(Object.keys(r).sort(),["bytes","dev","ino","sha256","version"]);for(const k of ["bytes","dev","ino"])assert(Number.isSafeInteger(r[k])&&r[k]>0);assert(r.bytes<=256*1024*1024&&/^[0-9a-f]{64}$/.test(r.sha256)&&/^v(?:22|24|26)\.[0-9]+\.[0-9]+$/.test(r.version));}
function retired(r) {assert.equal(r.parent.alive,false);assert(r.children.every(x=>x.alive===false));assert(Number.isInteger(r.retirement_ticks)&&r.retirement_ticks>=0&&r.retirement_ticks<64);}
function inputs(v,h) {
  assert.equal(v.plan.head,h);assert.equal(v.plan.tree,git("rev-parse",`${h}^{tree}`).toString().trim());runtime(v.plan.runtime);
  assert.equal(v.plan.runtime_sha256,v.plan.runtime.sha256);assert.equal(v.plan_sha256,sha(canonical(v.plan)+"\n"));
  const b=v.build_receipt;assert.equal(v.plan.build_receipt_sha256,sha(canonical(b)+"\n"));eq(b.runtime,v.plan.runtime);
  assert.equal(b.source.head,h);assert.equal(b.source.tree,v.plan.tree);assert.equal(b.source.aggregate_sha256,sha(canonical(b.source.members)));
  assert.equal(b.generation,generation);assert.equal(b.actual_void_node_started,false);assert.equal(b.public_onboarding_accepted,false);
  for(const d of ["dist","dependencies"]) {assert.equal(b[d].aggregate_sha256,sha(canonical(b[d].members)));assert.equal(b[d].members.reduce((n,m)=>n+m.bytes,0),b[d].bytes);}
  const member=b.source.members.find(m=>m.path==="scripts/lib/void_nimo_build_admission_v1.mjs");const bytes=git("show",`${h}:${member.path}`);assert.equal(member.sha256,sha(bytes));
}
function admitted(v) {
  const p=v.plan,r=v.record,t=v.terminal;assert(v.entry&&r&&t);eq(v.entry.parent.runtime,p.runtime);eq(v.entry.child.runtime,p.runtime);
  assert(v.entry.parent.retained_executables.length>=2&&v.entry.child.retained_executables.length>=2);
  eq(r.executed_runtime,{parent:p.runtime,child:p.runtime});eq(r.build.runtime,p.runtime);eq(r.source,{head,tree});assert.equal(r.plan_sha256,v.plan_sha256);
  assert.equal(r.child.pid,v.entry.child.pid);assert.equal(r.parent.pid,v.entry.parent.pid);assert.equal(r.child.parent_pid,r.parent.pid);
  assert.equal(t.record_sha256,sha(canonical(r)+"\n"));assert.equal(t.nonce,r.nonce);eq(t.executed_runtime,r.executed_runtime);
  eq(t.observation.executed_runtime,r.executed_runtime);assert.equal(t.observation_sha256,sha(canonical(t.observation)));
  eq(t.source,r.source);eq(t.child,r.child);eq(t.data,r.data);assert.equal(t.cooperative_session_bound,true);
  assert.equal(t.actual_external_join_proven,false);assert.equal(t.public_onboarding_accepted,false);assert.equal(r.starting_entries,0);
}
function verify(r,s,m,controller) {
  assert.equal(r.schema,"void_nimo_executed_runtime_schedule_v1");assert.equal(r.head,head);assert.equal(r.tree,tree);eq(r.source,source);
  assert.equal(r.generation,generation);assert.equal(r.scenario,s);assert.equal(r.major,m);eq(r.controller_runtime,controller);runtime(controller);
  assert.equal(Number(controller.version.slice(1).split(".")[0]),m);assert.equal(r.cleanup_completed,true);
  assert.equal(r.synthetic_node_and_build_inventory,true);assert.equal(r.actual_void_node_started,false);assert.equal(r.public_onboarding_accepted,false);
  eq(r.oracle,{interval_ms:100,recovery_limit_ticks:64});const old=s==="predecessor",cut=old?1:Number(s.split("-")[1]);assert.equal(r.cut,cut);
  runtime(r.binaries.a);runtime(r.binaries.b);assert.equal(r.binaries.replacement_version_verified,true);
  assert.equal(r.binaries.a.sha256,controller.sha256);assert.equal(r.binaries.a.bytes,controller.bytes);assert.notEqual(r.binaries.a.sha256,r.binaries.b.sha256);
  eq(r.before.parent.runtime,r.binaries.a);eq(r.at_b.parent.runtime,r.binaries.a);eq(r.after.parent.runtime,r.binaries.a);
  eq(r.at_b.pathname,r.binaries.b);eq(r.after.pathname,cut===4?r.binaries.a:r.binaries.b);
  assert.equal(r.before.parent.alive,true);assert(!r.before.parent.incomplete&&!r.at_b.parent.incomplete&&!r.after.parent.incomplete);
  retired(r.retirement);inputs(r.affected,old?predecessor:head);assert.equal(r.affected.terminal,null);
  if(old) {assert.equal(r.predecessor_result.sha256,r.binaries.b.sha256);assert.equal(r.predecessor_result.bytes,r.binaries.b.bytes);assert.equal(r.fresh,null);return;}
  eq(r.affected.plan.runtime,cut===1?r.binaries.b:r.binaries.a);
  if(cut<=3)assert.equal(r.affected.entry,null);if(cut<=2)assert.equal(r.affected.record,null);
  if(cut>=2)assert(r.before.parent.retained_executables.length>=1);
  if(cut>=3) {eq(r.before.child.runtime,r.binaries.a);assert(r.before.child.retained_executables.length>=2);eq(r.affected.record.executed_runtime,{parent:r.binaries.a,child:r.binaries.a});}
  if(cut===4) {eq(r.affected.entry.parent.runtime,r.binaries.a);eq(r.affected.entry.child.runtime,r.binaries.a);}
  if(s.startsWith("recovery")) {
    assert.equal(r.affected.exit.signal,"SIGKILL");inputs(r.fresh,head);admitted(r.fresh);retired(r.reconstruction.retirement);
    assert(r.reconstruction.ticks>0&&r.reconstruction.ticks<64);
    const timing=r.reconstruction.timing;assert(timing.preparation_ms>0&&timing.startup_ms>0);
    assert.equal(timing.total_ms,timing.preparation_ms+timing.startup_ms);assert.equal(r.reconstruction.ticks,Math.ceil(timing.total_ms/100));assert.equal(r.reconstruction.fresh_inputs_reacquired,true);assert.equal(r.reconstruction.old_session_adopted,false);
    assert.notEqual(r.fresh.plan.data_root,r.affected.plan.data_root);assert.notEqual(r.fresh.record.parent.pid,r.before.parent.pid);
    if(r.affected.record)assert.notEqual(r.fresh.record.nonce,r.affected.record.nonce);
  } else {assert.equal(r.fresh,null);assert.equal(r.reconstruction,null);assert.notEqual(r.affected.exit.code,0);}
}
function set(m) {
  const folder=path.join(input,`runtime-raw-${m}`),expected=scenarios.map(s=>`node-${m}-${s}.json`);eq(fs.readdirSync(folder).sort(),[...expected].sort());
  const members=expected.map(name=>({name,...read(path.join(folder,name))})),controller=members[0].value.controller_runtime;
  members.forEach((r,i)=>verify(r.value,scenarios[i],m,controller));return {members,controller};
}
const {members,controller}=set(major);assert.equal(Number(process.versions.node.split(".")[0]),major);
const fd=fs.openSync("/proc/self/exe","r"),hash=crypto.createHash("sha256"),buffer=Buffer.alloc(65536);let count=0;
try{for(let i=0;i<=4096;i++){const n=fs.readSync(fd,buffer,0,buffer.length,null);if(!n)break;count+=n;hash.update(buffer.subarray(0,n));}}finally{fs.closeSync(fd);}
assert.equal(controller.sha256,hash.digest("hex"));assert.equal(controller.bytes,count);assert.equal(controller.version,process.version);
const sample=members[7].value,mutations=[
  ["stale-head",r=>r.head="0".repeat(40)],["cross-runtime",r=>r.controller_runtime.sha256="0".repeat(64)],
  ["a-b-hybrid",r=>r.fresh.record.executed_runtime.child=r.binaries.b], ["pathname-only",r=>delete r.fresh.record.executed_runtime],
  ["changed-inode",r=>r.fresh.entry.child.runtime.ino++],["stale-record",r=>r.fresh.terminal.record_sha256="0".repeat(64)],
  ["partial-aggregate",r=>delete r.reconstruction],["unretired-child",r=>r.retirement.children[0].alive=true],
  ["late-reconstruction",r=>r.reconstruction.ticks=64],["missing-child-fd",r=>r.fresh.entry.child.retained_executables=[]],
  ["acceptance-promotion",r=>r.public_onboarding_accepted=true]
];
for(const [name,mutate] of mutations){const r=structuredClone(sample);mutate(r);assert.throws(()=>verify(r,sample.scenario,major,controller),undefined,name);}
for(const [name,mutate] of [["missing",a=>a.pop()],["duplicate",a=>a[1]=a[0]],["reordered",a=>a.reverse()]]){const a=members.map(m=>m.name);mutate(a);assert.throws(()=>eq(a,scenarios.map(s=>`node-${major}-${s}.json`)),undefined,name);}
fs.mkdirSync(output,{recursive:true});const publish=(name,value)=>{const b=canonical(value)+"\n";fs.writeFileSync(path.join(output,name),b,{flag:"wx",mode:0o600});return {sha256:sha(b),bytes:Buffer.byteLength(b)};};
const aggregate={marker:"EXECUTED_RUNTIME_RECOVERY_GREEN",head,tree,source,generation,major,controller_runtime:controller,
  members:members.map(({name,sha256,bytes})=>({name,sha256,bytes})),predecessor_mismatches:1,mutation_schedules:4,reconstructions:4,
  schedule_and_verifier_executions:10,rejection_cases:["missing","duplicate","reordered",...mutations.map(x=>x[0])],
  actual_void_node_started:false,public_onboarding_accepted:false};
const captured=publish(`node-${major}-aggregate.json`,aggregate);console.log(canonical({...aggregate,aggregate_sha256:captured.sha256,aggregate_bytes:captured.bytes}));
if(mode==="matrix") {
  assert.equal(major,26);const all=[];
  for(const m of [22,24]){const saved=read(path.join(input,`runtime-verified-${m}`,`node-${m}-aggregate.json`)),checked=set(m);
    eq(saved.value,{...aggregate,major:m,controller_runtime:checked.controller,members:checked.members.map(({name,sha256,bytes})=>({name,sha256,bytes}))});all.push({major:m,sha256:saved.sha256,bytes:saved.bytes});}
  all.push({major,...captured});const matrix={marker:"VOID_NIMO_EXECUTED_RUNTIME_MATRIX_V1_GREEN",head,tree,generation,members:all,
    schedule_and_verifier_executions:30,predecessor_mismatches:3,mutation_schedules:12,reconstructions:12,actual_void_node_started:false,public_onboarding_accepted:false};
  const b=publish("matrix.json",matrix);console.log(canonical({...matrix,aggregate_sha256:b.sha256,aggregate_bytes:b.bytes}));
}
