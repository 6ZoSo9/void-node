#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const SUCCESSOR="scripts/prove_buy_void_repaired_v7_v2_current_generation_dispatch_v3.mjs";
const PREDECESSOR="scripts/prove_buy_void_repaired_v7_v2_current_generation_dispatch_v2.mjs";
const CAPACITY_SOURCE="src/economic/buy_void_verified_payment_capacity_admission_v1.ts";
const CAPACITY_PROOF="scripts/prove_buy_void_verified_payment_capacity_fifo_nonblocking_v2.ts";
const HISTORICAL="scripts/prove_buy_void_repaired_v7_v2_current_generation_dispatch_v1.mjs";
const SELF="scripts/prove_buy_void_verified_payment_v3_trigger_closure_v1.mjs";
const DOC="docs/architecture/buy-void-verified-payment-v3-fifo-composed-source-generation-v1.md";
const DEDICATED=".github/workflows/buy-void-verified-payment-v3-fifo-composed-source-generation-v1.yml";
const CONSUMERS=Object.freeze([
  ".github/workflows/buy-void-enforcement-final-protected-v7-v2-candidate-v2.yml",
  ".github/workflows/buy-void-enforcement-final-protected-v7-v2-candidate-v1.yml",
  ".github/workflows/buy-void-source-finality-v7-executable-delta-candidate-v1.yml",
  ".github/workflows/buy-void-enforcement-final-v7-artifact-census-v4.yml",
  ".github/workflows/buy-void-delivery-dependency-provider-closure-post2865-lock-v1.yml",
]);
const COMPATIBILITY=Object.freeze([
  "scripts/prove_buy_void_canonical_caller_request_v2.ts",
  "scripts/prove_buy_void_legacy_operator_status_exact_identity_v2.ts",
  "scripts/prove_buy_void_operator_verified_allocation_dispatch_v7.ts",
  "scripts/prove_buy_void_verified_payment_allocation_handoff_dual_rail_v4.ts",
  "scripts/prove_buy_void_verified_payment_allocation_handoff_first_original_v5.ts",
  "scripts/prove_void_buy_request_root_runtime_topology_census_v3.py",
  "scripts/prove_void_buy_stable_request_root_policy_v2.mjs",
  ".github/workflows/buy-void-canonical-caller-request-v1.yml",
  ".github/workflows/buy-void-current-presale-source-tuple-v3.yml",
  ".github/workflows/buy-void-current-presale-source-tuple-v4.yml",
  ".github/workflows/buy-void-legacy-operator-status-exact-identity-v1.yml",
  ".github/workflows/buy-void-operator-verified-allocation-dispatch-v2.yml",
  ".github/workflows/buy-void-request-root-runtime-topology-census-v2.yml",
  ".github/workflows/buy-void-runtime-integration-v1.yml",
  ".github/workflows/buy-void-stable-request-root-policy-v1.yml",
  ".github/workflows/buy-void-verified-payment-v2-source-generation-acceptance-v1.yml",
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
      assert.ok(fs.fstatSync(nextFd).isDirectory(),
        "path_component_not_directory:"+component);
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
    assert.equal(fs.readSync(leafFd,extra,0,1,null),0,
      "file_grew_during_read:"+relative);
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
        !fifoSubstituted&&targetText.startsWith("/proc/self/fd/")&&
        targetText.endsWith("/target")&&
        (Number(flags)&fs.constants.O_DIRECTORY)===0
      ){
        leafOpenObserved=true;
        assert.equal(Number(flags)&fs.constants.O_NONBLOCK,
          fs.constants.O_NONBLOCK,"bounded_reader_nonblocking_flag_missing");
        assert.equal(Number(flags)&fs.constants.O_NOFOLLOW,
          fs.constants.O_NOFOLLOW,"bounded_reader_nofollow_flag_missing");
        fs.renameSync(leaf,displaced);
        const mk=spawnSync("/usr/bin/mkfifo",["-m","600",leaf],{
          encoding:"utf8",stdio:["ignore","pipe","pipe"],timeout:5000,
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

function objectBody(source,name){
  const marker=`const ${name}=Object.freeze({`;
  const start=source.indexOf(marker);
  assert.notEqual(start,-1,"object_marker_missing:"+name);
  const bodyStart=start+marker.length;
  const end=source.indexOf("\n});",bodyStart);
  assert.notEqual(end,-1,"object_end_missing:"+name);
  return source.slice(bodyStart,end);
}

function quotedObjectKeys(body,name){
  const keys=[...body.matchAll(/^\s*"([^"]+)":\s*$/gmu)].map(match=>match[1]);
  assert.equal(new Set(keys).size,keys.length,"duplicate_object_key:"+name);
  return keys;
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
    if(match){
      paths.push(match[1]);
      continue;
    }
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

const successorSource=read(SUCCESSOR);
const addedBody=objectBody(successorSource,"V2_ADDED_ECONOMIC_SOURCE_BLOBS");
const sourceBody=objectBody(successorSource,"V2_SOURCE_FILES");
assert.ok(sourceBody.includes("...V2_ADDED_ECONOMIC_SOURCE_BLOBS,"),
  "v2_source_spread_missing");
const sourceFiles=[
  ...quotedObjectKeys(sourceBody,"V2_SOURCE_FILES"),
  ...quotedObjectKeys(addedBody,"V2_ADDED_ECONOMIC_SOURCE_BLOBS"),
].sort();
assert.equal(sourceFiles.length,7,"v2_source_file_count");
assert.equal(new Set(sourceFiles).size,7,"v2_source_file_duplicate");

const dedicatedSource=read(DEDICATED);
const dedicatedPaths=pullRequestPaths(dedicatedSource,DEDICATED);
for(const relative of sourceFiles)requirePath(dedicatedPaths,relative,DEDICATED);
for(const relative of [SUCCESSOR,PREDECESSOR,HISTORICAL,CAPACITY_SOURCE,CAPACITY_PROOF,SELF,DOC,DEDICATED,...CONSUMERS,...COMPATIBILITY]){
  requirePath(dedicatedPaths,relative,DEDICATED);
}
assert.ok(dedicatedSource.includes(`node --check ${SELF}`),"dedicated_trigger_proof_check_missing");
assert.ok(dedicatedSource.includes(`node ${SELF}`),"dedicated_trigger_proof_run_missing");
assert.ok(dedicatedSource.includes(MARKER),"dedicated_trigger_proof_marker_missing");

for(const workflow of CONSUMERS){
  const source=read(workflow);
  const paths=pullRequestPaths(source,workflow);
  requirePath(paths,workflow,workflow);
  requirePath(paths,SUCCESSOR,workflow);
  requirePath(paths,PREDECESSOR,workflow);
  assert.ok(source.includes(`node ${SUCCESSOR} --self-test`),
    "consumer_v2_invocation_missing:"+workflow);
  assert.ok(source.includes(HISTORICAL),
    "consumer_historical_trigger_missing:"+workflow);
}

console.log("v3_trigger_reader_descriptor_bound=true");
console.log("v3_trigger_reader_fifo_swap_rejected=true");
console.log(MARKER);
console.log("v2_source_file_count="+sourceFiles.length);
console.log("v2_source_file_triggers_complete=true");
console.log("capacity_fifo_source_and_proof_triggers_complete=true");
console.log("protected_consumer_count="+CONSUMERS.length);
console.log("compatibility_trigger_count="+COMPATIBILITY.length);
console.log("compatibility_successor_triggers_complete=true");
console.log("protected_consumer_definitions_trigger_dedicated_gate=true");
console.log("alternative_compulsory_trigger_bound=true");
console.log("historical_v1_source_proof_preserved=true");
console.log("payment_acceptance=false");
console.log("public_presale_activation=false");
console.log("funds_movement=false");
