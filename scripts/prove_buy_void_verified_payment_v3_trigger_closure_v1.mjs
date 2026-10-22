#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const V3="scripts/prove_buy_void_repaired_v7_v3_current_generation_dispatch_v1.mjs";
const V2="scripts/prove_buy_void_repaired_v7_v2_current_generation_dispatch_v2.mjs";
const V1="scripts/prove_buy_void_repaired_v7_v2_current_generation_dispatch_v1.mjs";
const SELF="scripts/prove_buy_void_verified_payment_v3_trigger_closure_v1.mjs";
const DOC="docs/architecture/buy-void-verified-payment-v3-source-generation-acceptance-v1.md";
const DEDICATED=".github/workflows/buy-void-verified-payment-v3-source-generation-acceptance-v1.yml";
const V2_TRIGGER="scripts/prove_buy_void_verified_payment_v2_trigger_closure_v1.mjs";
const V2_INPUTS=Object.freeze([
  ".github/workflows/buy-void-verified-payment-transport-v2.yml",
  "scripts/prove_buy_void_v2_custody_inspect_bridge_v1.mjs",
  "scripts/prove_buy_void_verified_payment_transport_v2.ts",
  "scripts/prove_buy_void_verified_payment_v2_allocation_stage.ts",
  "src/economic/buy_void_v2_custody_inspect_bridge_v1.mjs",
  "src/economic/buy_void_verified_payment_transport_v2.ts",
  "src/economic/buy_void_verified_payment_v2_allocation_stage.ts",
]);
const CAPACITY_INPUTS=Object.freeze([
  "docs/architecture/buy-void-verified-payment-capacity-fifo-nonblocking-v2.md",
  "scripts/prove_buy_void_verified_payment_capacity_fifo_nonblocking_v2.ts",
  "src/economic/buy_void_verified_payment_capacity_admission_v1.ts",
]);
const CONSUMERS=Object.freeze([
  ".github/workflows/buy-void-enforcement-final-protected-v7-v2-candidate-v2.yml",
  ".github/workflows/buy-void-enforcement-final-protected-v7-v2-candidate-v1.yml",
  ".github/workflows/buy-void-source-finality-v7-executable-delta-candidate-v1.yml",
  ".github/workflows/buy-void-enforcement-final-v7-artifact-census-v4.yml",
  ".github/workflows/buy-void-delivery-dependency-provider-closure-post2865-lock-v1.yml",
]);
const MARKER="VOID_BUY_VOID_VERIFIED_PAYMENT_V3_TRIGGER_CLOSURE_V1_GREEN";

function sameReadGeneration(a,b,label){
  for(const key of ["dev","ino","uid","gid","mode","nlink","size","mtimeMs","ctimeMs"]){
    assert.equal(b[key],a[key],label+":"+key);
  }
}
function readFromRoot(root,relative,max=1024*1024){
  assert.ok(Number.isSafeInteger(max)&&max>0,"read_max_invalid");
  assert.ok(!path.isAbsolute(relative),"absolute_path:"+relative);
  const parts=relative.split("/");
  assert.ok(parts.length>0&&parts.every(part=>
    part!=="."&&part!==".."&&/^[A-Za-z0-9_.-]+$/u.test(part)
  ),"unsafe_path:"+relative);
  const visiblePath=path.join(root,...parts);
  const before=fs.lstatSync(visiblePath);
  assert.ok(
    before.isFile()&&!before.isSymbolicLink()&&before.nlink===1&&
    before.size>0&&before.size<=max,
    "invalid_file:"+relative,
  );

  const directoryFlags=
    fs.constants.O_RDONLY|fs.constants.O_CLOEXEC|
    fs.constants.O_NOFOLLOW|fs.constants.O_NONBLOCK|fs.constants.O_DIRECTORY;
  const leafFlags=
    fs.constants.O_RDONLY|fs.constants.O_CLOEXEC|
    fs.constants.O_NOFOLLOW|fs.constants.O_NONBLOCK;
  const dirFds=[];
  let leafFd=-1;
  try{
    let dirFd=fs.openSync(root,directoryFlags);
    dirFds.push(dirFd);
    assert.ok(fs.fstatSync(dirFd).isDirectory(),"root_not_directory");
    for(const component of parts.slice(0,-1)){
      const nextPath="/proc/self/fd/"+String(dirFd)+"/"+component;
      const nextFd=fs.openSync(nextPath,directoryFlags);
      assert.ok(
        fs.fstatSync(nextFd).isDirectory(),
        "path_component_not_directory:"+component,
      );
      dirFds.push(nextFd);
      dirFd=nextFd;
    }
    const leafPath="/proc/self/fd/"+String(dirFd)+"/"+parts.at(-1);
    leafFd=fs.openSync(leafPath,leafFlags);
    const opened=fs.fstatSync(leafFd);
    assert.ok(
      opened.isFile()&&opened.nlink===1&&opened.size>0&&opened.size<=max,
      "opened_file_invalid:"+relative,
    );
    sameReadGeneration(before,opened,"file_changed_before_open:"+relative);

    const bytes=Buffer.alloc(opened.size);
    let offset=0;
    while(offset<bytes.length){
      const got=fs.readSync(leafFd,bytes,offset,bytes.length-offset,null);
      assert.ok(got>0,"short_read:"+relative);
      offset+=got;
    }
    const extra=Buffer.alloc(1);
    assert.equal(
      fs.readSync(leafFd,extra,0,1,null),
      0,
      "file_grew_during_read:"+relative,
    );

    const after=fs.fstatSync(leafFd);
    const visibleAfter=fs.lstatSync(visiblePath);
    sameReadGeneration(opened,after,"file_changed_during_read:"+relative);
    sameReadGeneration(after,visibleAfter,"visible_file_changed:"+relative);
    return bytes.toString("utf8");
  }finally{
    if(leafFd>=0)fs.closeSync(leafFd);
    for(let i=dirFds.length-1;i>=0;i--)fs.closeSync(dirFds[i]);
  }
}
function read(relative,max=1024*1024){
  return readFromRoot(ROOT,relative,max);
}
function selfTestBoundedReader(){
  const root=fs.mkdtempSync("/tmp/void-v3-trigger-bounded-reader-");
  const nested=path.join(root,"nested");
  const leaf=path.join(nested,"target");
  const displaced=leaf+".regular";
  fs.mkdirSync(nested,{mode:0o700});
  fs.writeFileSync(leaf,Buffer.from("accepted","utf8"),{mode:0o600});
  assert.equal(readFromRoot(root,"nested/target",1024),"accepted");

  const originalOpen=fs.openSync;
  let leafOpenObserved=false;
  let fifoSubstituted=false;
  try{
    fs.openSync=function(target,flags,...rest){
      const targetText=String(target);
      if(
        !fifoSubstituted&&
        targetText.startsWith("/proc/self/fd/")&&
        targetText.endsWith("/target")&&
        (Number(flags)&fs.constants.O_DIRECTORY)===0
      ){
        leafOpenObserved=true;
        assert.equal(
          Number(flags)&fs.constants.O_NONBLOCK,
          fs.constants.O_NONBLOCK,
          "bounded_reader_nonblocking_flag_missing",
        );
        assert.equal(
          Number(flags)&fs.constants.O_NOFOLLOW,
          fs.constants.O_NOFOLLOW,
          "bounded_reader_nofollow_flag_missing",
        );
        fs.renameSync(leaf,displaced);
        const mk=spawnSync("/usr/bin/mkfifo",["-m","600",leaf],{
          encoding:"utf8",
          stdio:["ignore","pipe","pipe"],
          timeout:5000,
          env:{PATH:"/usr/bin:/bin",HOME:"/nonexistent",LANG:"C",LC_ALL:"C",TZ:"UTC"},
        });
        assert.equal(mk.error,undefined,String(mk.error||""));
        assert.equal(mk.status,0,String(mk.stderr||""));
        fifoSubstituted=true;
      }
      return originalOpen.call(fs,target,flags,...rest);
    };
    let held=false;
    try{readFromRoot(root,"nested/target",1024);}
    catch{held=true;}
    assert.equal(held,true,"fifo_substitution_not_rejected");
  }finally{
    fs.openSync=originalOpen;
    if(fs.existsSync(displaced)){
      assert.equal(fs.readFileSync(displaced,"utf8"),"accepted");
    }
    fs.rmSync(root,{recursive:true,force:true});
  }
  assert.equal(leafOpenObserved,true,"bounded_reader_leaf_open_not_observed");
  assert.equal(fifoSubstituted,true,"bounded_reader_fifo_fixture_not_exercised");
}

function pullRequestPaths(source,relative){
  const lines=source.split("\n");
  const onIndex=lines.indexOf("on:");
  assert.notEqual(onIndex,-1,"workflow_on_missing:"+relative);
  const prIndex=lines.indexOf("  pull_request:",onIndex+1);
  assert.notEqual(prIndex,-1,"workflow_pull_request_missing:"+relative);
  const pathsIndex=lines.indexOf("    paths:",prIndex+1);
  assert.notEqual(pathsIndex,-1,"workflow_paths_missing:"+relative);
  const paths=[];
  for(let index=pathsIndex+1;index<lines.length;index+=1){
    const line=lines[index];
    const match=line.match(/^      - "([^"]+)"$/u);
    if(match){paths.push(match[1]);continue;}
    if(line.trim()==="")continue;
    if(/^ {0,4}\S/u.test(line))break;
    assert.fail("workflow_paths_shape_invalid:"+relative+":"+(index+1));
  }
  assert.ok(paths.length>0,"workflow_paths_empty:"+relative);
  assert.equal(new Set(paths).size,paths.length,"workflow_paths_duplicate:"+relative);
  return new Set(paths);
}
function requirePath(set,relative,workflow){
  assert.ok(set.has(relative),"workflow_trigger_missing:"+workflow+":"+relative);
}

selfTestBoundedReader();

const dedicatedSource=read(DEDICATED);
const dedicatedPaths=pullRequestPaths(dedicatedSource,DEDICATED);
for(const relative of [
  V3,V2,V1,SELF,DOC,DEDICATED,V2_TRIGGER,
  ...V2_INPUTS,...CAPACITY_INPUTS,...CONSUMERS,
]){
  requirePath(dedicatedPaths,relative,DEDICATED);
}
assert.ok(dedicatedSource.includes(`node --check ${SELF}`),"dedicated_trigger_proof_check_missing");
assert.ok(dedicatedSource.includes(`node ${SELF}`),"dedicated_trigger_proof_run_missing");
assert.ok(dedicatedSource.includes(MARKER),"dedicated_trigger_proof_marker_missing");

for(const workflow of CONSUMERS){
  const source=read(workflow);
  const paths=pullRequestPaths(source,workflow);
  requirePath(paths,workflow,workflow);
  requirePath(paths,V2,workflow);
  requirePath(paths,V3,workflow);
  assert.ok(source.includes(`node ${V3} --self-test`),
    "consumer_v3_invocation_missing:"+workflow);
  assert.ok(!source.includes(`node ${V2} --self-test`),
    "consumer_v2_still_current_dispatch:"+workflow);
  assert.ok(source.includes(V1),"consumer_historical_trigger_missing:"+workflow);
}

console.log("v3_trigger_reader_descriptor_bound=true");
console.log("v3_trigger_reader_fifo_swap_rejected=true");
console.log(MARKER);
console.log("v2_source_input_count="+V2_INPUTS.length);
console.log("capacity_composition_input_count="+CAPACITY_INPUTS.length);
console.log("v3_composed_input_count="+(V2_INPUTS.length+CAPACITY_INPUTS.length));
console.log("v3_dedicated_trigger_closure=true");
console.log("protected_consumer_count="+CONSUMERS.length);
console.log("protected_consumers_dispatch_v3=true");
console.log("historical_v1_and_v2_triggers_preserved=true");
console.log("payment_acceptance=false");
console.log("public_presale_activation=false");
console.log("funds_movement=false");
