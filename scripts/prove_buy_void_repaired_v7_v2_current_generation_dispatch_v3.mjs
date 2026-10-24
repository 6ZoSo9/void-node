#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");

const HISTORICAL_BASE="be959daf147a25f594ba705c6bead1e2e622b00e";
const HISTORICAL_HEAD="af9646827b25e8103004f96525623ba248b41d2a";
const HISTORICAL_MERGE_BASE="58c140232cb7bb7fd4f8d4680a413299c74fa57e";
const RESTACK_BASE="f894cc5cbdccab0265a9a2265df45efa07170c4a";
const RESTACK_HEAD="a350ff8673c77c685bb024576ed1e887bfe42ac7";
const PROTECTED_PARENT="16563121f8d6c2a1fa7cd2f99ca4be2f88aa3cca";
const PROVIDER_PARENT="bc510343c5c418a75154bedcc445cbf1251dc037";

const SELF="scripts/prove_buy_void_repaired_v7_v2_current_generation_dispatch_v1.mjs";
const DOC="docs/architecture/buy-void-repaired-v7-v2-current-generation-dispatch-v1.md";
const FINAL_WORKFLOW=".github/workflows/buy-void-enforcement-final-protected-v7-v2-candidate-v2.yml";
const HISTORICAL_WORKFLOW=".github/workflows/buy-void-enforcement-final-protected-v7-v2-candidate-v1.yml";
const DELTA_WORKFLOW=".github/workflows/buy-void-source-finality-v7-executable-delta-candidate-v1.yml";
const V4_WORKFLOW=".github/workflows/buy-void-enforcement-final-v7-artifact-census-v4.yml";
const PROVIDER_WORKFLOW=".github/workflows/buy-void-delivery-dependency-provider-closure-post2865-lock-v1.yml";

const PREVIOUS_SUCCESSOR="scripts/prove_buy_void_repaired_v7_v2_current_generation_dispatch_v2.mjs";
const PREVIOUS_SUCCESSOR_BLOB="796cad42e6413a1894eef8dc0466848377176645";
const CURRENT_SUCCESSOR="scripts/prove_buy_void_repaired_v7_v2_current_generation_dispatch_v3.mjs";
const CURRENT_SUCCESSOR_CARRIER="29057c25f06fcb214853bc612ea7606211778f81";

const ROUTER_V6_PROOF="scripts/prove_buy_void_operator_verified_allocation_dispatch_v6.ts";
const ROUTER_V6_PROOF_BLOB="1ef5cd61a338cf726ddec59cea24932846d8d1fb";
const CANONICAL_V5_DISPATCH="scripts/prove_canonical_producer_source_generation_dispatch_v5.mjs";
const CANONICAL_V5_DISPATCH_BLOB="a9b8a5cc8d330feb2e0772042a641eb9b9a787a1";
const CANONICAL_V5_OBSERVER="scripts/prove_canonical_producer_legacy_self_http_observers_current_v5.mjs";
const CANONICAL_V5_OBSERVER_BLOB="871d3663628edcf767a77a1d0ee1f60dd5b59ad7";
const CANONICAL_V5_GUARD="runtime/canonical-producer-self-http-guard-v5.cjs";
const CANONICAL_V5_GUARD_BLOB="72a84059b2558092fe853b6305493257fca4c76c";
const CURRENT_LAUNCHER="ops/run-void-node-live-v1.sh";
const CURRENT_LAUNCHER_BLOB="bc6a17ccdf389299fb139db37e742f0b1ad9dc4e";
const CURRENT_ROUTER="src/index.ts";
const CURRENT_ROUTER_BLOB="a09661797aa4295371c036be36d82995e5233269";

const REVIEWED_PROTECTED_SUCCESSORS=Object.freeze({
  [CURRENT_LAUNCHER]:Object.freeze({
    frozen_blob:"6fb040de128ce0df16e848d61ea5f4acb62794da",
    current_blob:CURRENT_LAUNCHER_BLOB,
    mode:"100755",
  }),
  [CURRENT_ROUTER]:Object.freeze({
    frozen_blob:"123ec1792a027f93d4c9030749a0e7e136a75a44",
    current_blob:CURRENT_ROUTER_BLOB,
    mode:"100644",
  }),
});
const CURRENT_SUCCESSOR_TRIGGER_PATHS=Object.freeze([
  CURRENT_SUCCESSOR,
  ROUTER_V6_PROOF,
  CANONICAL_V5_DISPATCH,
  CANONICAL_V5_OBSERVER,
  CANONICAL_V5_GUARD,
  CURRENT_LAUNCHER,
  CURRENT_ROUTER,
]);

const SUCCESSOR_MODIFIED=Object.freeze([
  FINAL_WORKFLOW,
  HISTORICAL_WORKFLOW,
  DELTA_WORKFLOW,
  V4_WORKFLOW,
  PROVIDER_WORKFLOW,
].sort());

const MAIN_PRESERVED=Object.freeze({
  "scripts/prove_void_buy_coupled_launch_runtime_integration_current_v2.mjs":
    "59357584271c3effaaefb725d630593163b7a9e2",
  "scripts/prove_void_buy_coupled_launch_runtime_integration_generation_dispatch_v2.mjs":
    "7bc37b4ffcc2d3071bfcedfbeccc734161033b08",
});

// Historical V1 inventory and proofs are immutable. This successor approves
// *only* the exact three ADD-only modules below for source-only inspection;
// no mounted route, custody reservation, or customer-payment authority follows.
const LEGACY_NONPROTECTED_ECONOMIC_DRIFT=Object.freeze([
  "src/economic/buy_void_public_request_under_launch_lock_v1.ts",
  "src/economic/buy_void_request_custody_read_policy_v1.ts",
  "src/economic/buy_void_verified_payment_capacity_admission_v1.ts",
].sort());
const V2_ADDED_ECONOMIC_SOURCE_BLOBS=Object.freeze({
  "src/economic/buy_void_v2_custody_inspect_bridge_v1.mjs":
    "45ade2941e28a51e4dbb4884dfcbe9ec549022e6",
  "src/economic/buy_void_verified_payment_transport_v2.ts":
    "61dc219117538f2894b170ac98bb56806f69f430",
  "src/economic/buy_void_verified_payment_v2_allocation_stage.ts":
    "6efb2be5f03ff87290ef376d7852d22db22900f8",
});
const V2_HISTORICAL_SOURCE_BASE="1d8c8804d75fa12e1fa9fcfffe7bc93940fbd56c";
const V2_HISTORICAL_ADDITION_HEAD="0628d81259fed779ea3bb6c4d067b66b19a3e577";
const V2_HISTORICAL_ADDITION_TREE="282648386bb2f0b79f95af398de61f231e79504c";
const V2_HISTORICAL_WORKFLOW_BLOB="650360be459bd04083c0fceaf42696ac985abe22";
const V2_HISTORICAL_SOURCE_FILES=Object.freeze({
  ".github/workflows/buy-void-verified-payment-transport-v2.yml":
    "650360be459bd04083c0fceaf42696ac985abe22",
  "scripts/prove_buy_void_v2_custody_inspect_bridge_v1.mjs":
    "d0a81327e43a76e7b8171d975b7dde981483219f",
  "scripts/prove_buy_void_verified_payment_transport_v2.ts":
    "2714988acfbcded3d4779ef79a141cd3e39b1426",
  "scripts/prove_buy_void_verified_payment_v2_allocation_stage.ts":
    "d447fad19edbb0897166f67ab2e435fe34d5e164",
  "src/economic/buy_void_v2_custody_inspect_bridge_v1.mjs":
    "84d956baa930c2edc8142942a8fd6fd8dc4cdf17",
  "src/economic/buy_void_verified_payment_transport_v2.ts":
    "61dc219117538f2894b170ac98bb56806f69f430",
  "src/economic/buy_void_verified_payment_v2_allocation_stage.ts":
    "ef397b7377a87326187f5e2e9882d6e4bdc0a4f8",
});
const V2_SOURCE_BASE="61b0f81b2112aab32e3dc16084fe2d43178ec4da";
const V2_ACCEPTED_ADDITION_HEAD="f84d380d41e3aefd3c96b3fa956f5f7addf9f908";
const V2_ACCEPTED_ADDITION_TREE="6d03b668ca51cc7ffa115c164955d09dc9b13e70";
const V2_LANDED_MAIN_HEAD="652197dc8df36f0f2004d50c6bbf95369790e2d1";
const V2_LANDED_MAIN_TREE="00e5dd00386372e533c945141dd857f663fdf036";
const V2_FROZEN_V1_PROOF_BLOB="4e123302d25dd0a83923032d2dc0f40c8937e77f";
const V2_ACCEPTED_SOURCE_FILES=Object.freeze({
  ".github/workflows/buy-void-verified-payment-transport-v2.yml":
    "0cc7e50febb6d289c343e188a10e63bbd22053d6",
  "scripts/prove_buy_void_v2_custody_inspect_bridge_v1.mjs":
    "b87945fb2d7df4af4740fc28ae467f8f660361e3",
  "scripts/prove_buy_void_verified_payment_transport_v2.ts":
    "2714988acfbcded3d4779ef79a141cd3e39b1426",
  "scripts/prove_buy_void_verified_payment_v2_allocation_stage.ts":
    "addd7842edb7f0e851d1e589d4303c0dc6e2756f",
  ...V2_ADDED_ECONOMIC_SOURCE_BLOBS,
});
const V2_SOURCE_FILES=Object.freeze({
  ".github/workflows/buy-void-verified-payment-transport-v2.yml":
    "6d9c8e821ba70f28183bc2d879b95b7e2f829be1",
  "scripts/prove_buy_void_v2_custody_inspect_bridge_v1.mjs":
    "b87945fb2d7df4af4740fc28ae467f8f660361e3",
  "scripts/prove_buy_void_verified_payment_transport_v2.ts":
    "2714988acfbcded3d4779ef79a141cd3e39b1426",
  "scripts/prove_buy_void_verified_payment_v2_allocation_stage.ts":
    "addd7842edb7f0e851d1e589d4303c0dc6e2756f",
  ...V2_ADDED_ECONOMIC_SOURCE_BLOBS,
});
const NONPROTECTED_ECONOMIC_DRIFT=Object.freeze([
  ...LEGACY_NONPROTECTED_ECONOMIC_DRIFT,
  ...Object.keys(V2_ADDED_ECONOMIC_SOURCE_BLOBS),
].sort());

const CANDIDATE_PROOF="scripts/prove_buy_void_enforcement_final_protected_v7_v2_candidate_v2.mjs";
const CANDIDATE_PROOF_BLOB="5cb990d0ef680f80292bed5f6b28c11d4ee1ffed";
const LOCK_PROOF="scripts/prove_buy_void_enforcement_final_protected_v7_v2_lock_v2.mjs";
const LOCK_PROOF_BLOB="9428c0adb10d624593c7882a9e483f33baa9f292";
const V4_CENSUS_PROOF="scripts/prove_buy_void_enforcement_final_v7_artifact_census_v4.mjs";
const V4_CENSUS_PROOF_BLOB="f0e1334da67309c1aeb98a2fa19e5ff77424955f";
const CANDIDATE_FILE="ops/security/buy-void-enforcement-final-protected-v7-v2-candidate-v2.json";
const CANDIDATE_BLOB="4e23ecbb64eb26c14f5ab15af85eb86d59c3a718";
const CANDIDATE_BYTES=16342;
const CANDIDATE_SHA256="092a97373013d32dda610df7363587fa3a669f33248a37420b07541d12d892bb";
const CANDIDATE_SET="05d7648032223f74a05d89200ef23a76a5265ef2a3a26e52c7f51ce3b33bc852";
const LOCK_FILE="ops/security/buy-void-enforcement-final-protected-v7-v2-lock-v2.json";
const LOCK_BLOB="589845615654da8b688764377b34296267ac0063";
const CENSUS_ID="voidbefv7c4_9c8fa20632d3cfb431c0d13229153d19f076613720c7402e5374eab1f833401d";
const CENSUS_SHA256="c9d910cd461b87c6b4722ada7505ceffe9a8d3c266387f3d9bbebddaf8f586f8";
const PROTECTED_INVENTORY="224e8c4b63b231e40b1abf4982127a6e2b999724642c4360c10ca21887bbc0a2";

const PROVIDER_EVIDENCE="ops/security/buy-void-delivery-dependency-provider-closure-post2865-v1.json";
const PROVIDER_EVIDENCE_BLOB="b08c03912e0f66742f06f314bf5e1f5cad81f20f";
const PROVIDER_CANDIDATE_PROOF="scripts/prove_buy_void_delivery_dependency_provider_closure_v1.mjs";
const PROVIDER_CANDIDATE_PROOF_BLOB="bc9473b4fd79eae50f4e86ca24968d3328cdcf22";

const ARTIFACT_PATHS=Object.freeze([
  "dist/economic/buy_void_auto_fulfillment_v1.js",
  "dist/economic/buy_void_broadcast_outcome_journal_v1.js",
  "dist/economic/buy_void_confirmed_state_journal_v1.js",
  "dist/economic/buy_void_crash_consistent_saga_server_policy_v1.js",
  "dist/economic/buy_void_delivery_runtime_integration_v1.js",
  "dist/economic/buy_void_delivery_sign_broadcast_adapter_v1.js",
  "dist/economic/buy_void_delivery_submission_guard_v1.js",
  "dist/economic/buy_void_erc20_delivery_receipt_reconciler_v1.js",
  "dist/economic/buy_void_erc20_execution_composition_v1.js",
  "dist/economic/buy_void_erc20_transaction_preparation_planner_v1.js",
  "dist/economic/buy_void_execution_attempt_journal_v1.js",
  "dist/economic/buy_void_filesystem_bakery_lock_v1.js",
  "dist/economic/buy_void_fulfillment_confirmation_v1.js",
  "dist/economic/buy_void_fulfillment_journal_v1.js",
  "dist/economic/buy_void_inventory_reservation_journal_v1.js",
  "dist/economic/buy_void_payment_rpc_observer_v1.js",
  "dist/economic/buy_void_pipeline_coordinator_v1.js",
  "dist/economic/buy_void_source_chain_finality_rpc_adapter_v1.js",
  "dist/economic/buy_void_source_finality_authenticated_composition_v3.js",
  "dist/economic/buy_void_source_finality_authority_v2.js",
  "dist/economic/buy_void_source_finality_execution_preflight_v1.js",
  "dist/economic/buy_void_source_finality_generation_provenance_v6.js",
  "dist/economic/buy_void_verified_payment_v2.js",
  "dist/economic/buy_void_source_finality_generation_provenance_v7.js",
  "dist/economic/buy_void_source_finality_live_process_binding_v1.js",
  "dist/economic/buy_void_source_finality_live_process_binding_v2.js",
  "dist/economic/buy_void_source_finality_provider_pair_binding_v1.js",
  "dist/economic/buy_void_ethereum_public_checkout_finality_gate_v1.js",
]);

const sha256=b=>crypto.createHash("sha256").update(b).digest("hex");
const gitBlob=b=>crypto.createHash("sha1")
  .update(Buffer.from("blob "+b.length+"\0","utf8")).update(b).digest("hex");

function canonical(v){
  if(v===null||typeof v==="boolean"||typeof v==="string")return JSON.stringify(v);
  if(typeof v==="number"){assert.ok(Number.isSafeInteger(v));return String(v);}
  if(Array.isArray(v))return "["+v.map(canonical).join(",")+"]";
  assert.ok(v&&typeof v==="object"&&!Array.isArray(v));
  return "{"+Object.keys(v).sort().map(k=>JSON.stringify(k)+":"+canonical(v[k])).join(",")+"}";
}

function run(command,args,{timeout=300000,allowFail=false}={}){
  const r=spawnSync(command,args,{
    cwd:ROOT,encoding:"utf8",stdio:["ignore","pipe","pipe"],timeout,
    maxBuffer:32*1024*1024,
    env:{PATH:"/usr/bin:/bin",HOME:"/nonexistent",LANG:"C",LC_ALL:"C",TZ:"UTC",
      NODE_ENV:"test",GIT_CONFIG_NOSYSTEM:"1",GIT_CONFIG_GLOBAL:"/dev/null",
      GIT_CONFIG_SYSTEM:"/dev/null",GIT_NO_REPLACE_OBJECTS:"1",
      GIT_OPTIONAL_LOCKS:"0",GIT_TERMINAL_PROMPT:"0"},
  });
  assert.equal(r.error,undefined,String(r.error||""));
  if(!allowFail)assert.equal(r.status,0,String(r.stderr||r.stdout||""));
  return r;
}
function git(args){return String(run("/usr/bin/git",["--no-replace-objects","-C",ROOT,...args],{timeout:30000}).stdout||"").trim();}
function names(a,b,...paths){
  return git(["diff","--name-only",a,b,"--",...paths]).split("\n").filter(Boolean).sort();
}
function sameReadGeneration(a,b,label){
  for(const key of ["dev","ino","uid","gid","mode","nlink","size","mtimeMs","ctimeMs"]){
    assert.equal(b[key],a[key],label+":"+key);
  }
}
function readFromRoot(root,relative,max=4*1024*1024){
  assert.ok(Number.isSafeInteger(max)&&max>0,"read_max_invalid");
  assert.ok(!path.isAbsolute(relative),"absolute_path:"+relative);
  const parts=relative.split("/");
  assert.ok(parts.length>0&&parts.every(part=>
    part!=="."&&part!==".."&&/^[A-Za-z0-9_.-]+$/u.test(part)
  ),"unsafe_path:"+relative);
  const visiblePath=path.join(root,...parts);
  const before=fs.lstatSync(visiblePath);
  assert.ok(before.isFile()&&!before.isSymbolicLink()&&before.nlink===1&&
    before.size>0&&before.size<=max,"invalid_file:"+relative);
  const directoryFlags=fs.constants.O_RDONLY|fs.constants.O_CLOEXEC|
    fs.constants.O_NOFOLLOW|fs.constants.O_NONBLOCK|fs.constants.O_DIRECTORY;
  const leafFlags=fs.constants.O_RDONLY|fs.constants.O_CLOEXEC|
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
    assert.ok(opened.isFile()&&opened.nlink===1&&opened.size>0&&opened.size<=max,
      "opened_file_invalid:"+relative);
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
    return bytes;
  }finally{
    if(leafFd>=0)fs.closeSync(leafFd);
    for(let i=dirFds.length-1;i>=0;i--)fs.closeSync(dirFds[i]);
  }
}
function read(relative,max=4*1024*1024){
  return readFromRoot(ROOT,relative,max);
}
function selfTestBoundedReader(){
  const root=fs.mkdtempSync("/tmp/void-v2-source-bounded-reader-");
  const nested=path.join(root,"nested");
  const leaf=path.join(nested,"target");
  const displaced=leaf+".regular";
  fs.mkdirSync(nested,{mode:0o700});
  fs.writeFileSync(leaf,Buffer.from("accepted","utf8"),{mode:0o600});
  assert.equal(readFromRoot(root,"nested/target",1024).toString("utf8"),"accepted");
  const originalOpen=fs.openSync;
  let leafOpenObserved=false;
  let fifoSubstituted=false;
  try{
    fs.openSync=function(target,flags,...rest){
      const targetText=String(target);
      if(!fifoSubstituted&&targetText.startsWith("/proc/self/fd/")&&
          targetText.endsWith("/target")&&
          (Number(flags)&fs.constants.O_DIRECTORY)===0){
        leafOpenObserved=true;
        assert.equal(Number(flags)&fs.constants.O_NONBLOCK,fs.constants.O_NONBLOCK,
          "bounded_reader_nonblocking_flag_missing");
        assert.equal(Number(flags)&fs.constants.O_NOFOLLOW,fs.constants.O_NOFOLLOW,
          "bounded_reader_nofollow_flag_missing");
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
    try{readFromRoot(root,"nested/target",1024);}catch{held=true;}
    assert.equal(held,true,"fifo_substitution_not_rejected");
  }finally{
    fs.openSync=originalOpen;
    if(fs.existsSync(displaced))assert.equal(fs.readFileSync(displaced,"utf8"),"accepted");
    fs.rmSync(root,{recursive:true,force:true});
  }
  assert.equal(leafOpenObserved,true,"bounded_reader_leaf_open_not_observed");
  assert.equal(fifoSubstituted,true,"bounded_reader_fifo_fixture_not_exercised");
}
function pin(relative,blob,max=4*1024*1024){
  const bytes=read(relative,max);
  assert.equal(gitBlob(bytes),blob,"git_blob_drift:"+relative);
  assert.equal(git(["rev-parse","HEAD:"+relative]),blob,"head_blob_drift:"+relative);
  return bytes;
}
function treeBlob(ref,relative){return git(["rev-parse",ref+":"+relative]);}
function treeMode(ref,relative){
  const row=git(["ls-tree",ref,"--",relative]);
  const m=row.match(/^(100644|100755) blob ([0-9a-f]{40})\t(.+)$/u);
  assert.ok(m,"tree_entry_invalid:"+ref+":"+relative);
  assert.equal(m[3],relative,"tree_path_mismatch:"+relative);
  return m[1];
}
function sourcePath(artifact){return "src/economic/"+path.basename(artifact,".js")+".ts";}

function verifyRestackScope(){
  git(["cat-file","-e",HISTORICAL_BASE+"^{commit}"]);
  git(["cat-file","-e",HISTORICAL_HEAD+"^{commit}"]);
  git(["cat-file","-e",HISTORICAL_MERGE_BASE+"^{commit}"]);
  git(["cat-file","-e",RESTACK_BASE+"^{commit}"]);
  git(["cat-file","-e",RESTACK_HEAD+"^{commit}"]);
  git(["merge-base","--is-ancestor",RESTACK_BASE,RESTACK_HEAD]);
  git(["merge-base","--is-ancestor",RESTACK_HEAD,"HEAD"]);
  assert.equal(
    git(["merge-base",HISTORICAL_BASE,HISTORICAL_HEAD]),
    HISTORICAL_MERGE_BASE,
    "historical_merge_base_drift",
  );

  const historical=names(HISTORICAL_MERGE_BASE,HISTORICAL_HEAD);
  const restacked=names(RESTACK_BASE,RESTACK_HEAD);
  assert.equal(historical.length,106,"historical_reconciliation_path_count");
  assert.equal(restacked.length,106,"accepted_restack_path_count");

  const expected=historical
    .filter(relative=>!Object.hasOwn(MAIN_PRESERVED,relative))
    .concat([SELF,DOC])
    .sort();
  assert.deepEqual(restacked,expected,"accepted_restack_path_set_drift");

  for(const [relative,blob] of Object.entries(MAIN_PRESERVED)){
    assert.ok(historical.includes(relative),"historical_main_preserved_path_missing:"+relative);
    assert.ok(!restacked.includes(relative),"accepted_restack_main_preserved_path_reintroduced:"+relative);
    assert.equal(treeBlob(RESTACK_BASE,relative),blob,"restack_base_preserved_blob_drift:"+relative);
    assert.equal(treeBlob(RESTACK_HEAD,relative),blob,"accepted_restack_preserved_blob_drift:"+relative);
    assert.equal(treeBlob("HEAD",relative),blob,"current_head_preserved_blob_drift:"+relative);
  }

  assert.ok(
    restacked.includes(SELF)&&restacked.includes(DOC),
    "dispatch_files_missing_from_accepted_restack_delta",
  );
  for(const relative of restacked){
    if(!historical.includes(relative))continue;
    if(SUCCESSOR_MODIFIED.includes(relative))continue;
    assert.equal(
      treeBlob(RESTACK_HEAD,relative),
      treeBlob(HISTORICAL_HEAD,relative),
      "restacked_historical_blob_drift:"+relative,
    );
    assert.equal(
      treeMode(RESTACK_HEAD,relative),
      treeMode(HISTORICAL_HEAD,relative),
      "restacked_historical_mode_drift:"+relative,
    );
  }
  for(const relative of SUCCESSOR_MODIFIED){
    assert.ok(
      historical.includes(relative)&&restacked.includes(relative),
      "successor_path_scope_missing:"+relative,
    );
    assert.notEqual(
      treeBlob(RESTACK_HEAD,relative),
      treeBlob(HISTORICAL_HEAD,relative),
      "successor_path_not_updated:"+relative,
    );
  }
}
function verifyV2AcceptedSourceAdditions(){
  git(["cat-file","-e",V2_HISTORICAL_ADDITION_HEAD+"^{commit}"]);
  git(["cat-file","-e",V2_ACCEPTED_ADDITION_HEAD+"^{commit}"]);
  git(["cat-file","-e",V2_LANDED_MAIN_HEAD+"^{commit}"]);
  git(["merge-base","--is-ancestor",V2_HISTORICAL_ADDITION_HEAD,V2_ACCEPTED_ADDITION_HEAD]);
  // #3692 landed by squash merge. Preserve the exact accepted branch as
  // immutable evidence, but bind current/future execution to the permanent
  // landed-main carrier rather than requiring impossible branch ancestry.
  git(["merge-base","--is-ancestor",V2_LANDED_MAIN_HEAD,"HEAD"]);
  assert.equal(
    git(["rev-parse",V2_HISTORICAL_ADDITION_HEAD+"^{tree}"]),
    V2_HISTORICAL_ADDITION_TREE,
    "v2_historical_head_tree_changed",
  );
  assert.equal(
    git(["rev-parse",V2_ACCEPTED_ADDITION_HEAD+"^{tree}"]),
    V2_ACCEPTED_ADDITION_TREE,
    "v2_accepted_head_tree_changed",
  );
  assert.equal(
    git(["rev-parse",V2_LANDED_MAIN_HEAD+"^{tree}"]),
    V2_LANDED_MAIN_TREE,
    "v2_landed_main_tree_changed",
  );

  assert.deepEqual(
    Object.keys(V2_HISTORICAL_SOURCE_FILES).sort(),
    Object.keys(V2_ACCEPTED_SOURCE_FILES).sort(),
    "v2_historical_accepted_source_key_set_mismatch",
  );
  assert.deepEqual(
    Object.keys(V2_ACCEPTED_SOURCE_FILES).sort(),
    Object.keys(V2_SOURCE_FILES).sort(),
    "v2_accepted_current_source_key_set_mismatch",
  );
  const expected=Object.keys(V2_ACCEPTED_SOURCE_FILES)
    .map(relative=>"A\t"+relative).sort();
  const historicalActual=git([
    "diff","--name-status",V2_HISTORICAL_SOURCE_BASE,
    V2_HISTORICAL_ADDITION_HEAD,"--",
  ]).split("\n").filter(Boolean).sort();
  assert.deepEqual(
    historicalActual,expected,
    "v2_historical_source_addition_scope_changed",
  );
  const acceptedActual=git([
    "diff","--name-status",V2_SOURCE_BASE,V2_ACCEPTED_ADDITION_HEAD,"--",
  ]).split("\n").filter(Boolean).sort();
  assert.deepEqual(acceptedActual,expected,"v2_accepted_source_addition_scope_changed");

  const currentTransitions=Object.keys(V2_SOURCE_FILES)
    .filter(relative=>
      V2_SOURCE_FILES[relative]!==V2_ACCEPTED_SOURCE_FILES[relative]);
  assert.deepEqual(
    currentTransitions,
    [".github/workflows/buy-void-verified-payment-transport-v2.yml"],
    "v2_current_source_transition_set_invalid",
  );

  pin(SELF,V2_FROZEN_V1_PROOF_BLOB,64*1024);
  for(const [relative,acceptedBlob] of Object.entries(V2_ACCEPTED_SOURCE_FILES)){
    const historicalBlob=V2_HISTORICAL_SOURCE_FILES[relative];
    const currentBlob=V2_SOURCE_FILES[relative];
    assert.equal(typeof historicalBlob,"string",
      "v2_historical_blob_missing:"+relative);
    assert.equal(typeof currentBlob,"string",
      "v2_current_blob_missing:"+relative);
    assert.equal(
      git(["ls-tree",V2_HISTORICAL_SOURCE_BASE,"--",relative]),
      "",
      "v2_historical_new_path_not_absent_at_source_base:"+relative,
    );
    assert.equal(
      treeBlob(V2_HISTORICAL_ADDITION_HEAD,relative),historicalBlob,
      "v2_historical_head_blob_drift:"+relative,
    );
    assert.equal(
      git(["ls-tree",V2_SOURCE_BASE,"--",relative]),
      "",
      "v2_new_path_not_absent_at_source_base:"+relative,
    );
    assert.equal(
      treeBlob(V2_ACCEPTED_ADDITION_HEAD,relative),acceptedBlob,
      "v2_accepted_head_blob_drift:"+relative,
    );
    assert.equal(
      treeBlob(V2_LANDED_MAIN_HEAD,relative),currentBlob,
      "v2_landed_main_source_blob_drift:"+relative,
    );
    assert.equal(
      treeBlob("HEAD",relative),currentBlob,
      "v2_successor_head_blob_drift:"+relative,
    );
    if(relative!==".github/workflows/buy-void-verified-payment-transport-v2.yml"){
      assert.equal(currentBlob,acceptedBlob,
        "v2_unreviewed_current_source_transition:"+relative);
    }
    assert.equal(treeMode(V2_HISTORICAL_ADDITION_HEAD,relative),"100644",
      "v2_historical_source_mode_drift:"+relative);
    assert.equal(treeMode("HEAD",relative),"100644",
      "v2_added_source_mode_drift:"+relative);
    pin(relative,currentBlob,256*1024);
  }
  assert.equal(Object.keys(V2_ACCEPTED_SOURCE_FILES).length,7);
  assert.equal(Object.keys(V2_SOURCE_FILES).length,7);
  assert.equal(Object.keys(V2_ADDED_ECONOMIC_SOURCE_BLOBS).length,3);
  return true;
}

function verifyFrozenEvidence(){
  pin(CANDIDATE_PROOF,CANDIDATE_PROOF_BLOB,256*1024);
  pin(LOCK_PROOF,LOCK_PROOF_BLOB,256*1024);
  pin(V4_CENSUS_PROOF,V4_CENSUS_PROOF_BLOB,256*1024);

  const candidateBytes=pin(CANDIDATE_FILE,CANDIDATE_BLOB,64*1024);
  assert.equal(candidateBytes.length,CANDIDATE_BYTES,"candidate_bytes");
  assert.equal(sha256(candidateBytes),CANDIDATE_SHA256,"candidate_sha256");
  const c=JSON.parse(candidateBytes.toString("utf8"));
  assert.equal(c.marker,"VOID_BUY_VOID_ENFORCEMENT_FINAL_PROTECTED_V7_V2_CANDIDATE_V2");
  assert.equal(c.candidate_enforcement_set_sha256,CANDIDATE_SET);
  assert.equal(c.protected_census_evidence?.census_id,CENSUS_ID);
  assert.equal(c.protected_census_evidence?.census_json_sha256,CENSUS_SHA256);
  assert.equal(c.current_enforcement_tracked_source_inventory_sha256,PROTECTED_INVENTORY);
  assert.equal(c.current_enforcement_tracked_source_inventory_count,49);
  assert.equal(c.current_enforcement_tracked_source_inventory_v1?.length,49);
  assert.equal(c.complete_executable_closure_verified,true);
  assert.equal(c.candidate_enforcement_identity_accepted,false);
  assert.equal(c.production_source_finality_authority_ready,false);
  assert.equal(c.public_presale_activation,false);
  assert.equal(c.funds_movement,false);

  const lockBytes=pin(LOCK_FILE,LOCK_BLOB,64*1024);
  const l=JSON.parse(lockBytes.toString("utf8"));
  assert.equal(l.marker,"VOID_BUY_VOID_ENFORCEMENT_FINAL_PROTECTED_V7_V2_LOCK_V2");
  assert.equal(l.candidate_evidence?.git_blob_sha1,CANDIDATE_BLOB);
  assert.equal(l.candidate_evidence?.sha256,CANDIDATE_SHA256);
  assert.equal(l.candidate_evidence?.candidate_enforcement_set_sha256,CANDIDATE_SET);
  assert.equal(l.protected_census_evidence?.census_id,CENSUS_ID);
  assert.equal(l.current_enforcement_tracked_source_inventory_sha256,PROTECTED_INVENTORY);
  assert.equal(l.candidate_enforcement_identity_accepted,true);
  assert.equal(l.deployed_artifact_generation_verified,false);
  assert.equal(l.runtime_mount_authority,false);
  assert.equal(l.production_source_finality_authority_ready,false);
  assert.equal(l.public_presale_activation,false);
  assert.equal(l.funds_movement,false);
  return {candidate:c,lock:l};
}

function verifyProtectedCurrentIdentity(candidate){
  const rows=candidate.current_enforcement_tracked_source_inventory_v1;
  assert.equal(rows.length,49);
  const paths=rows.map(row=>row.path);
  assert.equal(new Set(paths).size,49,"protected_path_duplicate");
  assert.deepEqual(
    Object.keys(REVIEWED_PROTECTED_SUCCESSORS).sort(),
    [CURRENT_LAUNCHER,CURRENT_ROUTER].sort(),
    "reviewed_protected_successor_scope_drift",
  );
  let unchangedCount=0;
  let successorCount=0;
  for(const row of rows){
    const successor=REVIEWED_PROTECTED_SUCCESSORS[row.path];
    if(successor){
      assert.equal(row.git_blob_sha1,successor.frozen_blob,
        "frozen_successor_predecessor_blob_drift:"+row.path);
      assert.equal(row.git_mode,successor.mode,
        "frozen_successor_predecessor_mode_drift:"+row.path);
      assert.equal(treeBlob("HEAD",row.path),successor.current_blob,
        "reviewed_protected_successor_blob_drift:"+row.path);
      assert.equal(treeMode("HEAD",row.path),successor.mode,
        "reviewed_protected_successor_mode_drift:"+row.path);
      successorCount+=1;
      continue;
    }
    assert.equal(treeBlob("HEAD",row.path),row.git_blob_sha1,
      "protected_blob_drift:"+row.path);
    assert.equal(treeMode("HEAD",row.path),row.git_mode,
      "protected_mode_drift:"+row.path);
    unchangedCount+=1;
  }
  assert.equal(unchangedCount,47,"unchanged_protected_path_count");
  assert.equal(successorCount,2,"reviewed_protected_successor_count");
  assert.equal(
    sha256(Buffer.from(canonical(rows),"utf8")),
    candidate.current_enforcement_tracked_source_inventory_sha256,
    "frozen_protected_inventory_digest_drift",
  );

  const economicDrift=names(
    PROTECTED_PARENT,"HEAD",
    "src/economic","package.json","package-lock.json","tsconfig.build.json",
  );
  assert.deepEqual(economicDrift,NONPROTECTED_ECONOMIC_DRIFT,
    "unexpected_post_census_economic_drift");
  const protectedSet=new Set(paths);
  for(const relative of LEGACY_NONPROTECTED_ECONOMIC_DRIFT){
    assert.equal(protectedSet.has(relative),false,
      "allowed_drift_entered_protected_inventory:"+relative);
    assert.equal(
      treeBlob("HEAD",relative),
      treeBlob(RESTACK_BASE,relative),
      "reconciliation_modified_allowed_current_main_drift:"+relative,
    );
  }
  for(const [relative,blob] of Object.entries(V2_ADDED_ECONOMIC_SOURCE_BLOBS)){
    assert.equal(protectedSet.has(relative),false,
      "v2_added_source_entered_frozen_protected_inventory:"+relative);
    assert.equal(treeBlob("HEAD",relative),blob,
      "v2_added_economic_source_not_exact:"+relative);
  }
  return Object.freeze({paths,unchanged_count:unchangedCount,successor_count:successorCount});
}

function verifyReviewedProtectedSuccessors(){
  git(["cat-file","-e",CURRENT_SUCCESSOR_CARRIER+"^{commit}"]);
  git(["merge-base","--is-ancestor",CURRENT_SUCCESSOR_CARRIER,"HEAD"]);
  pin(PREVIOUS_SUCCESSOR,PREVIOUS_SUCCESSOR_BLOB,256*1024);
  pin(CURRENT_ROUTER,CURRENT_ROUTER_BLOB,4*1024*1024);
  pin(CURRENT_LAUNCHER,CURRENT_LAUNCHER_BLOB,256*1024);
  pin(ROUTER_V6_PROOF,ROUTER_V6_PROOF_BLOB,256*1024);
  pin(CANONICAL_V5_DISPATCH,CANONICAL_V5_DISPATCH_BLOB,256*1024);
  pin(CANONICAL_V5_OBSERVER,CANONICAL_V5_OBSERVER_BLOB,512*1024);
  pin(CANONICAL_V5_GUARD,CANONICAL_V5_GUARD_BLOB,512*1024);

  const router=run(process.execPath,["--import","tsx",ROUTER_V6_PROOF],{timeout:180000});
  const routerOut=String(router.stdout||"");
  for(const marker of [
    "VOID_BUY_VOID_OPERATOR_ALLOCATION_DISPATCH_SOURCE_CANDIDATE_V6_GREEN",
    "frozen_dispatcher_v5_proof_unchanged=true",
    "reviewed_router_source_blob="+CURRENT_ROUTER_BLOB,
    "mounted_verified_allocation_dispatch=false",
    "funds_moved=false",
  ]){
    assert.ok(routerOut.includes(marker),"router_v6_successor_marker_missing:"+marker);
  }

  const producer=run(process.execPath,[CANONICAL_V5_DISPATCH],{timeout:180000});
  const producerOut=String(producer.stdout||"");
  assert.ok(
    producerOut.includes("VOID_CANONICAL_PRODUCER_SOURCE_GENERATION_DISPATCH_V5_GREEN"),
    "canonical_producer_v5_dispatch_green_missing",
  );
  assert.ok(
    producerOut.includes('"source_blob":"'+CURRENT_ROUTER_BLOB+'"'),
    "canonical_producer_v5_source_blob_missing",
  );
  assert.ok(
    producerOut.includes('"selected_guard":"'+CANONICAL_V5_GUARD+'"'),
    "canonical_producer_v5_guard_binding_missing",
  );
  assert.ok(
    producerOut.includes('"service_or_source_deployment_changed":false'),
    "canonical_producer_v5_deployment_authority_expanded",
  );
  assert.ok(
    producerOut.includes('"signer_or_wallet_access":false'),
    "canonical_producer_v5_signer_authority_expanded",
  );
  assert.ok(
    producerOut.includes('"launch_authority":false'),
    "canonical_producer_v5_launch_authority_expanded",
  );
  return true;
}

function verifyBuiltCensusIdentity(candidate){
  const artifacts=ARTIFACT_PATHS.map(relative=>{
    const b=read(relative,2*1024*1024);
    return {path:relative,bytes:b.length,sha256:sha256(b)};
  });
  const sources=[...new Set(ARTIFACT_PATHS.map(sourcePath))].sort().map(relative=>{
    const b=read(relative,4*1024*1024);
    const blob=gitBlob(b);
    assert.equal(treeBlob("HEAD",relative),blob,"census_source_head_mismatch:"+relative);
    return {path:relative,bytes:b.length,git_blob_sha1:blob,sha256:sha256(b)};
  });
  assert.equal(artifacts.length,28);
  assert.equal(sources.length,28);
  assert.equal(
    sha256(Buffer.from(JSON.stringify(artifacts),"utf8")),
    candidate.hosted_census_evidence.artifact_inventory_sha256,
    "hosted_artifact_inventory_drift",
  );
  assert.equal(
    sha256(Buffer.from(JSON.stringify(sources),"utf8")),
    candidate.hosted_census_evidence.source_inventory_sha256,
    "hosted_source_inventory_drift",
  );
  assert.equal(
    sha256(Buffer.from(canonical(artifacts),"utf8")),
    candidate.current_inventory_evidence.canonical_artifact_inventory_sha256,
    "canonical_artifact_inventory_drift",
  );
  assert.equal(
    sha256(Buffer.from(canonical(sources),"utf8")),
    candidate.current_inventory_evidence.canonical_source_inventory_sha256,
    "canonical_source_inventory_drift",
  );
}

function verifyProviderIdentity(){
  const evidenceBytes=pin(PROVIDER_EVIDENCE,PROVIDER_EVIDENCE_BLOB,128*1024);
  pin(PROVIDER_CANDIDATE_PROOF,PROVIDER_CANDIDATE_PROOF_BLOB,256*1024);
  const provider=JSON.parse(evidenceBytes.toString("utf8"));
  assert.equal(provider.marker,"VOID_BUY_VOID_DELIVERY_DEPENDENCY_PROVIDER_CLOSURE_V1");
  assert.equal(provider.repository_head_sha,PROVIDER_PARENT);
  assert.equal(provider.provider_closure_sha256,"3b6be7b9efdc7f70b6f270f77208efab2f7321136a54cc76a7e1d34c57bd4945");
  assert.equal(provider.provider_static_module_closure_verified,true);
  assert.equal(provider.dynamic_module_loader_present,false);

  const inputs=[
    ...provider.provider_source_paths,
    "package.json",
    "package-lock.json",
    "tsconfig.build.json",
    PROVIDER_CANDIDATE_PROOF,
  ];
  assert.deepEqual(names(PROVIDER_PARENT,"HEAD",...inputs),[],"provider_input_drift");

  const identities=[
    provider.server_runtime_identity,
    provider.delivery_consumer_identity,
    provider.delivery_adapter_identity,
    ...provider.provider_runtime_artifacts,
  ];
  const seen=new Set();
  for(const identity of identities){
    if(seen.has(identity.path))continue;
    seen.add(identity.path);
    const bytes=read(identity.path,2*1024*1024);
    assert.equal(bytes.length,identity.bytes,"provider_artifact_bytes_drift:"+identity.path);
    assert.equal(sha256(bytes),identity.sha256,"provider_artifact_sha256_drift:"+identity.path);
  }
  return provider;
}

function verifyWorkflowDispatch(){
  const rows=[
    [FINAL_WORKFLOW,"CURRENT_PROTECTED_INTEGRATION_DISPATCH_V3"],
    [HISTORICAL_WORKFLOW,"HISTORICAL_V1_REFUSAL_CURRENT_V3_DISPATCH_V3"],
    [DELTA_WORKFLOW,"CURRENT_PROTECTED_INTEGRATION_DISPATCH_V3"],
    [V4_WORKFLOW,"CURRENT_PROTECTED_INTEGRATION_DISPATCH_V3"],
    [PROVIDER_WORKFLOW,"CURRENT_PROTECTED_INTEGRATION_DISPATCH_V3"],
  ];
  for(const [relative,marker] of rows){
    const source=read(relative,256*1024).toString("utf8");
    assert.ok(source.includes(marker),"v3_workflow_dispatch_marker_missing:"+relative);
    assert.ok(source.includes(SELF),"historical_v1_trigger_missing:"+relative);
    assert.ok(source.includes(PREVIOUS_SUCCESSOR),"historical_v2_trigger_missing:"+relative);
    assert.ok(source.includes(CURRENT_SUCCESSOR),"v3_workflow_trigger_missing:"+relative);
    assert.ok(source.includes("V3_PROTECTED_SUCCESSOR_ASSERTION_V1"),
      "v3_protected_successor_marker_missing:"+relative);
    assert.ok(source.includes(
      "historical_v2_candidate_enforcement_identity_accepted,true"),
      "v3_historical_acceptance_assertion_missing:"+relative);
    assert.ok(source.includes("candidate_enforcement_identity_accepted,false"),
      "v3_current_acceptance_false_assertion_missing:"+relative);
    assert.ok(source.includes("node "+CURRENT_SUCCESSOR+" --self-test"),
      "v3_workflow_invocation_missing:"+relative);
    assert.ok(!source.includes("node "+PREVIOUS_SUCCESSOR+" --self-test"),
      "historical_v2_proof_still_current_dispatch:"+relative);
    for(const dependency of CURRENT_SUCCESSOR_TRIGGER_PATHS){
      const token='- "'+dependency+'"';
      assert.equal(
        source.split(token).length-1,
        2,
        "v3_trigger_dependency_count:"+relative+":"+dependency,
      );
    }
  }
}

function verify(){
  verifyRestackScope();
  verifyV2AcceptedSourceAdditions();
  const frozen=verifyFrozenEvidence();
  const protected=verifyProtectedCurrentIdentity(frozen.candidate);
  verifyReviewedProtectedSuccessors();
  verifyBuiltCensusIdentity(frozen.candidate);
  const provider=verifyProviderIdentity();
  verifyWorkflowDispatch();
  return Object.freeze({
    schema:"void_buy_void_repaired_v7_v2_current_generation_dispatch_v3",
    marker:"VOID_BUY_VOID_REPAIRED_V7_V2_CURRENT_GENERATION_DISPATCH_V3",
    version:3,
    repository:"6ZoSo9/void-node",
    historical_head:HISTORICAL_HEAD,
    restack_base:RESTACK_BASE,
    accepted_restack_head:RESTACK_HEAD,
    protected_parent:PROTECTED_PARENT,
    protected_path_count:protected.paths.length,
    frozen_protected_inventory_preserved:true,
    protected_path_identity_preserved:false,
    unchanged_protected_path_count:protected.unchanged_count,
    reviewed_protected_successor_count:protected.successor_count,
    current_protected_successor_binding_verified:true,
    current_router_v6_successor_verified:true,
    canonical_producer_v5_successor_verified:true,
    frozen_candidate_json_sha256:CANDIDATE_SHA256,
    frozen_candidate_enforcement_set_sha256:CANDIDATE_SET,
    frozen_candidate_rederived_on_current_head:false,
    frozen_lock_identity_preserved:true,
    frozen_v4_census_proof_preserved:true,
    current_built_census_identity_matches_frozen_v4:true,
    nonprotected_economic_drift_paths:NONPROTECTED_ECONOMIC_DRIFT,
    nonprotected_economic_drift_count:NONPROTECTED_ECONOMIC_DRIFT.length,
    nonprotected_economic_drift_preserved_from_restack_base:false,
    historical_economic_drift_preserved_from_restack_base:true,
    accepted_v2_add_only_head:V2_ACCEPTED_ADDITION_HEAD,
    accepted_v2_add_only_tree:V2_ACCEPTED_ADDITION_TREE,
    accepted_v2_branch_evidence_preserved:true,
    landed_v2_source_acceptance_main_head:V2_LANDED_MAIN_HEAD,
    landed_v2_source_acceptance_main_tree:V2_LANDED_MAIN_TREE,
    landed_v2_source_acceptance_carrier_bound:true,
    added_v2_economic_source_count:3,
    verified_payment_v2_add_only_source_paths_verified:true,
    previous_source_dispatch_proof_unchanged:true,
    verified_payment_v2_route_mounted:false,
    five_historical_workflow_successors_bound:true,
    successor_workflow_dispatch_independently_approved:false,
    payment_allocation_custody_authority:false,
    source_finality_authentication_verified:false,
    independent_source_acceptance_complete:false,
    provider_source_path_count:provider.provider_source_paths.length,
    provider_source_identity_preserved:true,
    provider_built_artifact_identity_preserved:true,
    current_generation_integration_verified:true,
    historical_v2_candidate_enforcement_identity_accepted:true,
    candidate_enforcement_identity_accepted:false,
    current_v2_consumer_acceptance_split_assertions_bound:true,
    current_v3_protected_successor_assertions_bound:true,
    successor_runtime_generation_accepted:false,
    deployed_artifact_generation_verified:false,
    runtime_mount_authority:false,
    production_source_finality_authority_ready:false,
    public_presale_activation:false,
    funds_movement:false,
  });
}

function assertCurrentV2AcceptanceSplit(receipt){
  assert.equal(receipt.historical_v2_candidate_enforcement_identity_accepted,true,
    "historical_v2_candidate_identity_acceptance_lost");
  assert.equal(receipt.candidate_enforcement_identity_accepted,false,
    "current_v2_candidate_identity_must_remain_unaccepted");
  assert.equal(receipt.independent_source_acceptance_complete,false,
    "current_v2_independent_source_acceptance_must_remain_false");
  assert.equal(receipt.successor_runtime_generation_accepted,false,
    "current_v2_successor_runtime_acceptance_must_remain_false");
  return receipt;
}
function selfTestCurrentV2AcceptanceSplit(receipt){
  assert.throws(
    ()=>assertCurrentV2AcceptanceSplit({
      ...receipt,candidate_enforcement_identity_accepted:true,
    }),
    /current_v2_candidate_identity_must_remain_unaccepted/u,
  );
}

const args=process.argv.slice(2);
if(args.length===0||(args.length===1&&args[0]==="--self-test")){
  selfTestBoundedReader();
  const receipt=assertCurrentV2AcceptanceSplit(verify());
  selfTestCurrentV2AcceptanceSplit(receipt);
  console.log("VOID_BUY_VOID_REPAIRED_V7_V2_CURRENT_GENERATION_DISPATCH_V3_GREEN");
  console.log("v2_source_reader_descriptor_bound=true");
  console.log("v2_source_reader_fifo_swap_rejected=true");
  console.log("v2_seven_add_only_paths_exact=true");
  console.log("v2_current_transport_workflow_successor_bound=true");
  console.log("accepted_v2_branch_evidence_preserved=true");
  console.log("landed_v2_source_acceptance_carrier_bound=true");
  console.log("v2_three_new_economic_sources_pinned=true");
  console.log("v2_five_workflow_dispatches_bound=true");
  console.log("historical_v1_source_proof_preserved=true");
  console.log("payment_acceptance=false");
  console.log("verified_payment_v2_route_mounted=false");
  console.log("independent_source_acceptance_complete=false");
  console.log("frozen_protected_inventory_preserved="+receipt.frozen_protected_inventory_preserved);
  console.log("protected_path_identity_preserved="+receipt.protected_path_identity_preserved);
  console.log("protected_path_count="+receipt.protected_path_count);
  console.log("unchanged_protected_path_count="+receipt.unchanged_protected_path_count);
  console.log("reviewed_protected_successor_count="+receipt.reviewed_protected_successor_count);
  console.log("current_protected_successor_binding_verified="+receipt.current_protected_successor_binding_verified);
  console.log("current_router_v6_successor_verified="+receipt.current_router_v6_successor_verified);
  console.log("canonical_producer_v5_successor_verified="+receipt.canonical_producer_v5_successor_verified);
  console.log("nonprotected_economic_drift_count="+receipt.nonprotected_economic_drift_count);
  console.log("provider_source_identity_preserved="+receipt.provider_source_identity_preserved);
  console.log("current_built_census_identity_matches_frozen_v4="+receipt.current_built_census_identity_matches_frozen_v4);
  console.log("frozen_candidate_rederived_on_current_head=false");
  console.log("current_generation_integration_verified=true");
  console.log("historical_v2_candidate_enforcement_identity_accepted="+
    receipt.historical_v2_candidate_enforcement_identity_accepted);
  console.log("candidate_enforcement_identity_accepted="+
    receipt.candidate_enforcement_identity_accepted);
  console.log("current_v2_consumer_acceptance_split_assertions_bound="+
    receipt.current_v2_consumer_acceptance_split_assertions_bound);
  console.log("current_v3_protected_successor_assertions_bound="+
    receipt.current_v3_protected_successor_assertions_bound);
  console.log("unqualified_current_acceptance_promotion_rejected=true");
  console.log("deployment_or_runtime_authority=false");
  console.log("public_presale_activation=false");
  console.log("funds_movement=false");
}else if(args.length===1&&args[0]==="--receipt"){
  process.stdout.write(JSON.stringify(
    assertCurrentV2AcceptanceSplit(verify()),null,2,
  )+"\n");
}else{
  throw new Error("usage: prove_buy_void_repaired_v7_v2_current_generation_dispatch_v3.mjs [--self-test|--receipt]");
}
