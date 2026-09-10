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
function processIdentity(p) {
  for(const key of ["pid","parent_pid"]) assert(Number.isSafeInteger(p[key])&&p[key]>0);
  assert(typeof p.start_ticks==="string"&&/^[1-9][0-9]{0,31}$/.test(p.start_ticks));
  return {pid:p.pid,parent_pid:p.parent_pid,start_ticks:p.start_ticks};
}
function census(p, minimumDescriptors=0) {
  processIdentity(p);assert.equal(p.alive,true);assert(!p.incomplete);runtime(p.runtime);
  assert(Array.isArray(p.argv)&&p.argv.length>0&&p.argv.length<=16&&p.argv.every(x=>typeof x==="string"&&x.length<=4096));
  const f=p.retained_executables;
  assert(Array.isArray(f)&&f.length>=minimumDescriptors&&f.length<=256);
  assert(f.every(x=>Number.isSafeInteger(x)&&x>=0)&&new Set(f).size===f.length);
}
function sameProcess(a,b) {eq(processIdentity(a),processIdentity(b));eq(a.argv,b.argv);eq(a.runtime,b.runtime);}
function captureProcesses(v,parent,children) {
  assert.equal(v.parent_pid,parent.pid);
  assert(Array.isArray(v.spawned_child_pids)&&v.spawned_child_pids.length===children);
  assert(v.spawned_child_pids.every(p=>Number.isSafeInteger(p)&&p>0&&p!==parent.pid));
  assert.equal(new Set(v.spawned_child_pids).size,children);
}
function retired(r,capture) {
  eq(r.parent,{pid:capture.parent_pid,alive:false});
  eq(r.children,capture.spawned_child_pids.map(pid=>({pid,alive:false})));
  assert(Number.isInteger(r.retirement_ticks)&&r.retirement_ticks>=0&&r.retirement_ticks<64);
}
const sourceCache=new Map();
function buildSource(h) {
  if(sourceCache.has(h)) return sourceCache.get(h);
  const rows=git("ls-tree","-rz","--full-tree",h).toString().split("\0").filter(Boolean);assert(rows.length<=65536);
  const selected=rows.filter(row=>{const p=row.slice(row.indexOf("\t")+1);return p.startsWith("src/")||/\.(mjs|cjs|js)$/.test(p)||
    ["package.json","package-lock.json","tsconfig.build.json",".github/workflows/void-nimo-build-admission-v1.yml"].includes(p);
  }).map(row=>{const m=/^(100644|100755) blob ([0-9a-f]{40})\t(.+)$/.exec(row);assert(m);return {path:m[3],blob:m[2]};});
  assert(selected.length>0&&selected.length<=32768);
  // One bounded batch reads committed bytes once per source head, never once per receipt.
  const response=spawnSync("/usr/bin/git",["--no-replace-objects","cat-file","--batch"],{
    input:selected.map(x=>x.blob).join("\n")+"\n",env:{PATH:"/usr/bin:/bin",LANG:"C"},timeout:20000,maxBuffer:516*1024*1024});
  assert.equal(response.status,0);const bytes=response.stdout;let offset=0,total=0;
  const members=selected.map(member=>{
    const end=bytes.indexOf(10,offset);assert(end>offset&&end-offset<100);
    const header=/^([0-9a-f]{40}) blob ([0-9]+)$/.exec(bytes.subarray(offset,end).toString());assert(header);assert.equal(header[1],member.blob);
    const size=Number(header[2]);assert(Number.isSafeInteger(size)&&size>=0&&size<=32*1024*1024);
    offset=end+1;const content=bytes.subarray(offset,offset+size);assert.equal(content.length,size);offset+=size;assert.equal(bytes[offset++],10);
    total+=size;assert(total<=512*1024*1024);
    assert.equal(crypto.createHash("sha1").update(`blob ${size}\0`).update(content).digest("hex"),member.blob);
    return {path:member.path,bytes:size,sha256:sha(content)};
  });
  assert.equal(offset,bytes.length);
  const result={head:h,tree:git("rev-parse",`${h}^{tree}`).toString().trim(),members,aggregate_sha256:sha(canonical(members))};
  sourceCache.set(h,result);return result;
}
function inputs(v,h) {
  assert.equal(v.plan.head,h);assert.equal(v.plan.tree,git("rev-parse",`${h}^{tree}`).toString().trim());runtime(v.plan.runtime);
  assert.equal(v.plan.runtime_sha256,v.plan.runtime.sha256);assert.equal(v.plan_sha256,sha(canonical(v.plan)+"\n"));
  const b=v.build_receipt;assert.equal(v.plan.build_receipt_sha256,sha(canonical(b)+"\n"));eq(b.runtime,v.plan.runtime);
  assert.equal(b.source.head,h);assert.equal(b.source.tree,v.plan.tree);assert.equal(b.source.aggregate_sha256,sha(canonical(b.source.members)));
  assert.equal(b.generation,generation);assert.equal(b.actual_void_node_started,false);assert.equal(b.public_onboarding_accepted,false);
  for(const d of ["dist","dependencies"]) {assert.equal(b[d].aggregate_sha256,sha(canonical(b[d].members)));assert.equal(b[d].members.reduce((n,m)=>n+m.bytes,0),b[d].bytes);}
  eq(b.source,buildSource(h));
}
function recorded(v,parent,child) {
  const p=v.plan,r=v.record,b=v.build_receipt;assert(r);eq(processIdentity(parent),r.parent);eq(processIdentity(child),r.child);
  assert.equal(r.child.parent_pid,r.parent.pid);eq(v.spawned_child_pids,[r.child.pid]);
  eq(r.executed_runtime,{parent:p.runtime,child:p.runtime});eq(r.source,{head:p.head,tree:p.tree});assert.equal(r.plan_sha256,v.plan_sha256);
  eq(r.build,{receipt_sha256:p.build_receipt_sha256,head:p.head,dist_sha256:b.dist.aggregate_sha256,
    dependencies_sha256:b.dependencies.aggregate_sha256,source_sha256:b.source.aggregate_sha256,runtime:p.runtime});
}
function admitted(v) {
  const p=v.plan,r=v.record,t=v.terminal;assert(v.entry&&r&&t);eq(v.entry.parent.runtime,p.runtime);eq(v.entry.child.runtime,p.runtime);
  census(v.entry.parent,2);census(v.entry.child,2);captureProcesses(v,v.entry.parent,1);recorded(v,v.entry.parent,v.entry.child);
  eq(r.executed_runtime,{parent:p.runtime,child:p.runtime});eq(r.build.runtime,p.runtime);eq(r.source,{head,tree});assert.equal(r.plan_sha256,v.plan_sha256);
  assert.equal(r.child.pid,v.entry.child.pid);assert.equal(r.parent.pid,v.entry.parent.pid);assert.equal(r.child.parent_pid,r.parent.pid);
  assert.equal(t.record_sha256,sha(canonical(r)+"\n"));assert.equal(t.nonce,r.nonce);eq(t.executed_runtime,r.executed_runtime);
  eq(t.observation.executed_runtime,r.executed_runtime);assert.equal(t.observation_sha256,sha(canonical(t.observation)));
  eq(processIdentity(t.observation.node_process),r.child);eq(t.observation.node_process.argv,v.entry.child.argv);
  assert.equal(t.observation.source.head,r.source.head);assert.equal(t.observation.source.tree,r.source.tree);
  const {path:runtimePath,...observedRuntime}=t.observation.runtime;eq(observedRuntime,p.runtime);assert.equal(runtimePath,v.entry.child.argv[0]);
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
  assert.equal(r.binaries.a.version,controller.version);assert.equal(r.binaries.b.version,controller.version);
  assert(Number.isSafeInteger(r.controller_pid)&&r.controller_pid>0);assert.equal(r.before.parent.parent_pid,r.controller_pid);
  assert.equal(r.binaries.a.sha256,controller.sha256);assert.equal(r.binaries.a.bytes,controller.bytes);assert.notEqual(r.binaries.a.sha256,r.binaries.b.sha256);
  eq(r.before.parent.runtime,r.binaries.a);eq(r.at_b.parent.runtime,r.binaries.a);eq(r.after.parent.runtime,r.binaries.a);
  eq(r.at_b.pathname,r.binaries.b);eq(r.after.pathname,cut===4?r.binaries.a:r.binaries.b);
  for(const phase of [r.before,r.at_b,r.after]) {
    census(phase.parent,cut>=2?1:0);sameProcess(r.before.parent,phase.parent);
    if(cut>=3) {census(phase.child,2);sameProcess(r.before.child,phase.child);assert.equal(phase.child.parent_pid,phase.parent.pid);}
    else assert.equal(phase.child,null);
  }
  captureProcesses(r.affected,r.before.parent,old||cut===1||s==="recovery-2"?0:1);
  retired(r.retirement,r.affected);inputs(r.affected,old?predecessor:head);assert.equal(r.affected.terminal,null);
  if(old) {assert.equal(r.predecessor_result.sha256,r.binaries.b.sha256);assert.equal(r.predecessor_result.bytes,r.binaries.b.bytes);assert.equal(r.fresh,null);return;}
  eq(r.affected.plan.runtime,cut===1?r.binaries.b:r.binaries.a);
  if(cut<=3)assert.equal(r.affected.entry,null);if(cut<=2)assert.equal(r.affected.record,null);
  if(cut>=2)assert(r.before.parent.retained_executables.length>=1);
  if(cut>=3) {eq(r.before.child.runtime,r.binaries.a);recorded(r.affected,r.before.parent,r.before.child);}
  if(cut===4) {census(r.affected.entry.parent,2);census(r.affected.entry.child,2);sameProcess(r.affected.entry.parent,r.before.parent);sameProcess(r.affected.entry.child,r.before.child);}
  if(s.startsWith("recovery")) {
    assert.equal(r.affected.exit.signal,"SIGKILL");inputs(r.fresh,head);admitted(r.fresh);retired(r.reconstruction.retirement,r.fresh);
    for(const key of ["version","bytes","sha256"])assert.equal(r.fresh.plan.runtime[key],controller[key]);
    assert.equal(r.fresh.record.parent.parent_pid,r.controller_pid);
    assert(r.reconstruction.ticks>0&&r.reconstruction.ticks<64);
    const timing=r.reconstruction.timing;assert(timing.preparation_ms>0&&timing.startup_ms>0);
    assert(Math.abs(timing.total_ms-(timing.preparation_ms+timing.startup_ms))<=4*Number.EPSILON*Math.max(1,timing.total_ms));assert.equal(r.reconstruction.ticks,Math.ceil(timing.total_ms/100));assert.equal(r.reconstruction.fresh_inputs_reacquired,true);assert.equal(r.reconstruction.old_session_adopted,false);
    assert.notEqual(r.fresh.plan.data_root,r.affected.plan.data_root);assert.notEqual(r.fresh.record.parent.pid,r.before.parent.pid);
    if(r.affected.record)assert.notEqual(r.fresh.record.nonce,r.affected.record.nonce);
  } else {assert.equal(r.fresh,null);assert.equal(r.reconstruction,null);assert.notEqual(r.affected.exit.code,0);}
}
function set(m) {
  const folder=path.join(input,`runtime-raw-${m}`),expected=scenarios.map(s=>`node-${m}-${s}.json`);eq(fs.readdirSync(folder).sort(),[...expected].sort());
  const members=expected.map(name=>({name,...read(path.join(folder,name))})),controller=members[0].value.controller_runtime;
  members.forEach((r,i)=>verify(r.value,scenarios[i],m,controller));return {members,controller};
}
function rejectionCases(sample,m,controller) {
  const rehashObservation=r=>{r.fresh.terminal.observation_sha256=sha(canonical(r.fresh.terminal.observation));};
  const repin=(r,f=r.fresh)=>{
    const b=f.build_receipt,p=f.plan,record=f.record;
    b.source.aggregate_sha256=sha(canonical(b.source.members));
    p.runtime_sha256=p.runtime.sha256;p.build_receipt_sha256=sha(canonical(b)+"\n");f.plan_sha256=sha(canonical(p)+"\n");
    record.plan_sha256=f.plan_sha256;record.build.receipt_sha256=p.build_receipt_sha256;record.build.source_sha256=b.source.aggregate_sha256;
    if(f.terminal){f.terminal.record_sha256=sha(canonical(record)+"\n");rehashObservation(r);}
  };
  const replaceRuntime=(r,key,value)=>{
    const f=r.fresh;
    for(const identity of [f.plan.runtime,f.build_receipt.runtime,f.entry.parent.runtime,f.entry.child.runtime,
      f.record.executed_runtime.parent,f.record.executed_runtime.child,f.record.build.runtime,
      f.terminal.executed_runtime.parent,f.terminal.executed_runtime.child,f.terminal.observation.runtime,
      f.terminal.observation.executed_runtime.parent,f.terminal.observation.executed_runtime.child])identity[key]=value;
    repin(r);
  };
  const mutations=[
    ["stale-head",r=>r.head="0".repeat(40)],["cross-runtime",r=>r.controller_runtime.sha256="0".repeat(64)],
    ["a-b-hybrid",r=>r.fresh.record.executed_runtime.child=r.binaries.b],["pathname-only",r=>delete r.fresh.record.executed_runtime],
    ["changed-inode",r=>r.fresh.entry.child.runtime.ino++],["stale-record",r=>r.fresh.terminal.record_sha256="0".repeat(64)],
    ["partial-aggregate",r=>delete r.reconstruction],["unretired-child",r=>r.retirement.children[0].alive=true],
    ["late-reconstruction",r=>r.reconstruction.ticks=64],["missing-child-fd",r=>r.fresh.entry.child.retained_executables=[]],
    ["acceptance-promotion",r=>r.public_onboarding_accepted=true],
    ["unrelated-observed-process",r=>{r.fresh.terminal.observation.node_process.pid=987654321;r.fresh.terminal.observation.node_process.start_ticks="1";rehashObservation(r);}],
    ["changed-parent-start",r=>r.fresh.entry.parent.start_ticks="1"],["changed-child-start",r=>r.fresh.entry.child.start_ticks="1"],
    ["omitted-retired-children",r=>r.retirement.children=[]],["unrelated-retired-parent",r=>r.retirement.parent.pid=987654321],
    ["unrelated-retired-fresh-child",r=>r.reconstruction.retirement.children[0].pid=987654322],
    ["negative-retained-fd",r=>r.fresh.entry.child.retained_executables=[-1,2]],["duplicate-retained-fd",r=>r.fresh.entry.parent.retained_executables=[2,2]],
    ["missing-spawned-child",r=>r.affected.spawned_child_pids=[]],["duplicate-spawned-child",r=>r.fresh.spawned_child_pids.push(r.fresh.spawned_child_pids[0])],
    ["omitted-build-source",r=>{r.fresh.build_receipt.source.members=r.fresh.build_receipt.source.members.filter(x=>x.path!==names[0]);repin(r);}],
    ["changed-build-source-bytes",r=>{r.fresh.build_receipt.source.members.find(x=>x.path===names[0]).bytes++;repin(r);}],
    ["changed-fresh-runtime-version",r=>replaceRuntime(r,"version",m===26?"v24.20.0":"v26.8.1")],
    ["changed-fresh-runtime-bytes",r=>replaceRuntime(r,"bytes",r.fresh.plan.runtime.bytes+1)],
    ["changed-fresh-runtime-hash",r=>replaceRuntime(r,"sha256","0".repeat(64))],
    ["observation-runtime-disagreement",r=>{r.fresh.terminal.observation.runtime.sha256="0".repeat(64);rehashObservation(r);}],
    ["changed-affected-runtime-version",r=>{
      const version=m===26?"v24.20.0":"v26.8.1";
      for(const identity of [r.binaries.a,r.binaries.b,r.before.parent.runtime,r.before.child.runtime,
        r.at_b.parent.runtime,r.at_b.child.runtime,r.at_b.pathname,r.after.parent.runtime,r.after.child.runtime,r.after.pathname,
        r.affected.plan.runtime,r.affected.build_receipt.runtime,r.affected.record.build.runtime,
        r.affected.record.executed_runtime.parent,r.affected.record.executed_runtime.child])identity.version=version;
      repin(r,r.affected);
    }],
    ["changed-replacement-version",r=>{for(const identity of [r.binaries.b,r.at_b.pathname,r.after.pathname])identity.version=m===26?"v24.20.0":"v26.8.1";}],
    ["unrelated-fresh-controller",r=>{r.fresh.entry.parent.parent_pid=987654321;r.fresh.record.parent.parent_pid=987654321;repin(r);}]

  ];
  for(const [name,mutate] of mutations){const r=structuredClone(sample);mutate(r);assert.throws(()=>verify(r,sample.scenario,m,controller),undefined,name);}
  const expected=scenarios.map(s=>`node-${m}-${s}.json`);
  for(const [name,mutate] of [["missing",a=>a.pop()],["duplicate",a=>a[1]=a[0]],["reordered",a=>a.reverse()]]){const a=[...expected];mutate(a);assert.throws(()=>eq(a,expected),undefined,name);}
  return ["missing","duplicate","reordered",...mutations.map(x=>x[0])];
}
const {members,controller}=set(major);assert.equal(Number(process.versions.node.split(".")[0]),major);
const fd=fs.openSync("/proc/self/exe","r"),hash=crypto.createHash("sha256"),buffer=Buffer.alloc(65536);let count=0;
try{for(let i=0;i<=4096;i++){const n=fs.readSync(fd,buffer,0,buffer.length,null);if(!n)break;count+=n;hash.update(buffer.subarray(0,n));}}finally{fs.closeSync(fd);}
assert.equal(controller.sha256,hash.digest("hex"));assert.equal(controller.bytes,count);assert.equal(controller.version,process.version);
const rejections=rejectionCases(members[7].value,major,controller);
fs.mkdirSync(output,{recursive:true});const publish=(name,value)=>{const b=canonical(value)+"\n";fs.writeFileSync(path.join(output,name),b,{flag:"wx",mode:0o600});return {sha256:sha(b),bytes:Buffer.byteLength(b)};};
const aggregate={marker:"EXECUTED_RUNTIME_RECOVERY_GREEN",head,tree,source,generation,major,controller_runtime:controller,
  members:members.map(({name,sha256,bytes})=>({name,sha256,bytes})),predecessor_mismatches:1,mutation_schedules:4,reconstructions:4,
  schedule_and_verifier_executions:10,rejection_cases:rejections,
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
