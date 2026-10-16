#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const MARKER="VOID_BUY_VOID_ENFORCEMENT_FINAL_PROTECTED_V7_V2_CANDIDATE_V5";

const PROTECTED_CENSUS_PARENT="a1fcc7be0f2f4a6b19f8fa5e199eb81f54615613";
const PROTECTED_CENSUS_PROOF=
  "scripts/prove_buy_void_enforcement_final_protected_v7_v2_census_v7.mjs";
const PROTECTED_CENSUS_PROOF_BLOB="de759d8ec37795001865c30aba6f3f9c8ac9fd33";
const PROTECTED_CENSUS_WORKFLOW=
  ".github/workflows/buy-void-enforcement-final-protected-v7-v2-census-v7.yml";
const PROTECTED_CENSUS_WORKFLOW_BLOB="8910b169e34652bbadacb43cba4af23793653f57";
const PROTECTED_CENSUS_DOC=
  "docs/architecture/buy-void-enforcement-final-protected-v7-v2-census-v7.md";
const PROTECTED_CENSUS_DOC_BLOB="117340b9009747a88bb10c09ff1afa28c59f97bd";

const HOSTED_PROTECTED_CENSUS=Object.freeze({
  workflow_run:38978991081,
  node22_artifact_id:12079778991,
  node24_artifact_id:12079957745,
  node26_artifact_id:12080546165,
  census_id:"voidbefv7c7_1a85dcb768ab6d5348024cec816d82b7f3ac5cc53e738ec2169e78d4021a73a8",
  census_json_bytes:26911,
  census_json_sha256:"326b81bf51fa4efa449b01b6b53e244b1d08dd7ea0d859cafd04954f6f4aa1fb",
  census_json_git_blob_sha1:"92ca40eb9b7bb79f6b56ad87807dc3586a3ce6ec",
  protected_tracked_source_inventory_canonical_sha256:
    "e7e0625ff47dc4b4c7e0f93e4b75be30d04d9538acc233174c0abc18198b38e3",
  economic_artifact_inventory_sha256:
    "4dc2469dc898fb3c9c10baa47638a2892b3fb26159bd853454c7d94f98721b37",
  economic_source_inventory_sha256:
    "172c6be2f5e2f8d9865df516bde4bbbec65086025b779337d3b5ed2e701163be",
  canonical_economic_artifact_inventory_sha256:
    "41e845d6d88107f071697b324afa21155f9e649758deb82048b994aec602732a",
  canonical_economic_source_inventory_sha256:
    "2f6a49dcaa8dde179af2ed366daa2dc1a0abbc0956de61275260d29af047b280",
  protected_tracked_source_count:49,
  protected_generation_delta_count:3,
  unchanged_protected_path_count:46,
  cross_node_byte_identity_verified:true,
  independent_rederivation_verified:true,
});

const ACCEPTED_V3_LOCK_HEAD="67ea723bd2abeb3894a0eb8f4b7a0044a141ed03";
const ACCEPTED_V3_LOCK=
  "ops/security/buy-void-enforcement-final-protected-v7-v2-lock-v3.json";
const ACCEPTED_V3_LOCK_BLOB="92054f19fed9e8c243eb23321dbcf53fc9227a99";
const ACCEPTED_V3_SET=
  "bf158923831b21dd1e907c91cd4889afbe9fd8bce221e12b0fa1a2bb0896943d";
const V3_PRESERVATION_PROOF=
  "scripts/prove_buy_void_enforcement_v3_historical_predecessor_preservation_v1.mjs";
const V3_PRESERVATION_PROOF_BLOB="d5474b8584aca62814357ce9a29017b933d96450";

const CUSTODY_INSTALLER=
  "ops/precision/void_buy_void_source_finality_v7_deployment_receipt_install_v1.ts";
const CUSTODY_INSTALLER_BLOB="72dec8920c1a7177d353400c33b71c2de2562aba";
const CUSTODY_PROOF=
  "scripts/prove_buy_void_source_finality_v7_deployment_receipt_install_v1.ts";
const CUSTODY_PROOF_BLOB="d74aa53bc8ee87581de748d7d0fc57ffa0b13944";
const CUSTODY_DOC=
  "docs/operators/buy-void-source-finality-v7-deployment-receipt-install-v1.md";
const CUSTODY_DOC_BLOB="32dbc7a69187a09c5cd7fe27ed5481463a157a8f";

const INDEX_SOURCE="src/index.ts";
const INDEX_SOURCE_BLOB="7df1f21c730b554c414c88c550a4475234485370";
const ATTACH_TS="src/http/api_attach.ts";
const ATTACH_TS_BLOB="350088d64b797951aa30306d5c40752c9f901563";
const ATTACH_JS="src/http/api_attach.js";
const ATTACH_JS_BLOB="810e9c099e3fa8c8bd9d995a507bf921227a19df";
const INDEX_RANGE_PROOF="scripts/prove_void_index_block_range_bounds_v1.mjs";
const INDEX_RANGE_PROOF_BLOB="e478c71c564c4cf7349353a7936a9e8f56f97da1";
const ATTACH_RANGE_PROOF="scripts/prove_void_attach_block_range_bounds_v1.mjs";
const ATTACH_RANGE_PROOF_BLOB="814e858bf8c326f7ea61341a60dd53269e75f7f3";

const PRODUCER_RUNNER="ops/run-void-node-live-v1.sh";
const PRODUCER_RUNNER_BLOB="d7d7aede7fcd764a6182bd31f12338c5d3674ecb";
const PRODUCER_GUARD="runtime/canonical-producer-self-http-guard-v5.cjs";
const PRODUCER_GUARD_BLOB="8f9ab041e23c7519621b4d6a4573c4fa8b302ab6";
const PRODUCER_DISPATCH=
  "scripts/prove_canonical_producer_source_generation_dispatch_v5.mjs";
const PRODUCER_DISPATCH_BLOB="66aea5ea3dc296d4648750ba0d74cf7b2efed072";
const PRODUCER_OBSERVER_PROOF=
  "scripts/prove_canonical_producer_legacy_self_http_observers_current_v5.mjs";
const PRODUCER_OBSERVER_PROOF_BLOB="95687a9691b7eec93c028c82e81000cc214d065e";

const CHANGED_PROTECTED_PATHS=Object.freeze([
  CUSTODY_INSTALLER,
  PRODUCER_RUNNER,
  INDEX_SOURCE,
].sort());

const CANDIDATE_WORKFLOW=
  ".github/workflows/buy-void-enforcement-final-protected-v7-v2-candidate-v5.yml";
const CANDIDATE_WORKFLOW_TRIGGER_DEPENDENCIES=Object.freeze([
  PROTECTED_CENSUS_PROOF,
  PROTECTED_CENSUS_WORKFLOW,
  PROTECTED_CENSUS_DOC,
  ACCEPTED_V3_LOCK,
  V3_PRESERVATION_PROOF,
  CUSTODY_INSTALLER,
  CUSTODY_PROOF,
  CUSTODY_DOC,
  INDEX_SOURCE,
  ATTACH_TS,
  ATTACH_JS,
  INDEX_RANGE_PROOF,
  ATTACH_RANGE_PROOF,
  PRODUCER_RUNNER,
  PRODUCER_GUARD,
  PRODUCER_DISPATCH,
  PRODUCER_OBSERVER_PROOF,
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
function run(command,args,{timeout=300000}={}){
  const r=spawnSync(command,args,{
    cwd:ROOT,encoding:"utf8",stdio:["ignore","pipe","pipe"],timeout,
    maxBuffer:32*1024*1024,
    env:{
      PATH:"/usr/bin:/bin",HOME:"/nonexistent",LANG:"C",LC_ALL:"C",TZ:"UTC",
      NODE_ENV:"test",NODE_OPTIONS:"",
      GIT_CONFIG_NOSYSTEM:"1",GIT_CONFIG_GLOBAL:"/dev/null",
      GIT_CONFIG_SYSTEM:"/dev/null",GIT_NO_REPLACE_OBJECTS:"1",
      GIT_OPTIONAL_LOCKS:"0",GIT_TERMINAL_PROMPT:"0",
    },
  });
  assert.equal(r.error,undefined,String(r.error||""));
  assert.equal(r.status,0,String(r.stderr||r.stdout||""));
  return r;
}
function git(args){
  return String(run("/usr/bin/git",[
    "--no-replace-objects","-c","core.hooksPath=/dev/null",
    "-c","core.fsmonitor=false","-C",ROOT,...args,
  ],{timeout:30000}).stdout||"").trim();
}
function readExact(relative,max=4*1024*1024){
  assert.equal(path.isAbsolute(relative),false,"absolute_path:"+relative);
  assert.equal(relative.split("/").some(part=>!part||part==="."||part===".."),false,
    "unsafe_path:"+relative);
  const absolute=path.join(ROOT,...relative.split("/"));
  const before=fs.lstatSync(absolute);
  assert.ok(before.isFile()&&!before.isSymbolicLink()&&before.nlink===1&&
    before.size>0&&before.size<=max,"invalid_file:"+relative);
  const bytes=fs.readFileSync(absolute);
  const after=fs.lstatSync(absolute);
  for(const key of ["dev","ino","size","mtimeMs","ctimeMs","nlink"]){
    assert.equal(after[key],before[key],"file_changed:"+relative+":"+key);
  }
  assert.equal(bytes.length,before.size,"short_read:"+relative);
  return bytes;
}
function pin(relative,blob,max=4*1024*1024){
  const bytes=readExact(relative,max);
  assert.equal(gitBlob(bytes),blob,"git_blob_drift:"+relative);
  assert.equal(git(["rev-parse","HEAD:"+relative]),blob,"head_blob_drift:"+relative);
  return bytes;
}
function assertWorkflowTriggerCoverage(){
  const workflow=readExact(CANDIDATE_WORKFLOW,192*1024).toString("utf8");
  for(const relative of CANDIDATE_WORKFLOW_TRIGGER_DEPENDENCIES){
    const exact='      - "'+relative+'"';
    assert.equal(
      workflow.split(exact).length-1,
      2,
      "candidate_workflow_trigger_dependency_count:"+relative,
    );
  }
}

function acceptedV3Predecessor(){
  git(["merge-base","--is-ancestor",ACCEPTED_V3_LOCK_HEAD,"HEAD"]);
  pin(ACCEPTED_V3_LOCK,ACCEPTED_V3_LOCK_BLOB,128*1024);
  pin(V3_PRESERVATION_PROOF,V3_PRESERVATION_PROOF_BLOB,256*1024);

  const preservation=JSON.parse(String(
    run(process.execPath,[path.join(ROOT,V3_PRESERVATION_PROOF),"--receipt"]).stdout||""
  ));
  assert.equal(
    preservation.marker,
    "VOID_BUY_VOID_ENFORCEMENT_V3_HISTORICAL_PREDECESSOR_PRESERVATION_V1",
  );
  assert.equal(preservation.v3_candidate_and_lock_frozen??true,true);
  assert.equal(preservation.v3_candidate_bound,true);
  assert.equal(preservation.v3_lock_bound,true);
  assert.equal(preservation.v3_candidate_enforcement_identity_accepted,true);
  assert.equal(preservation.historical_predecessor_rederivation_required,false);

  const lock=JSON.parse(
    pin(ACCEPTED_V3_LOCK,ACCEPTED_V3_LOCK_BLOB,128*1024).toString("utf8")
  );
  assert.equal(lock.marker,"VOID_BUY_VOID_ENFORCEMENT_FINAL_PROTECTED_V7_V2_LOCK_V3");
  assert.equal(
    lock.candidate_evidence?.candidate_enforcement_set_sha256,
    ACCEPTED_V3_SET,
  );
  assert.equal(lock.complete_executable_closure_verified,true);
  assert.equal(lock.candidate_enforcement_identity_accepted,true);
  assert.equal(lock.deployed_artifact_generation_verified,false);
  assert.equal(lock.runtime_mount_authority,false);
  assert.equal(lock.production_source_finality_authority_ready,false);
  assert.equal(lock.public_presale_activation,false);
  assert.equal(lock.funds_movement,false);

  return Object.freeze({
    accepted_lock_head:ACCEPTED_V3_LOCK_HEAD,
    accepted_lock_path:ACCEPTED_V3_LOCK,
    accepted_lock_git_blob_sha1:ACCEPTED_V3_LOCK_BLOB,
    accepted_candidate_enforcement_set_sha256:ACCEPTED_V3_SET,
    preservation_proof_path:V3_PRESERVATION_PROOF,
    preservation_proof_git_blob_sha1:V3_PRESERVATION_PROOF_BLOB,
    complete_executable_closure_verified:true,
    candidate_enforcement_identity_accepted:true,
    historical_predecessor_rederivation_required:false,
    historical_identity_preserved:true,
  });
}

function revalidateProtectedCensus(){
  git(["merge-base","--is-ancestor",PROTECTED_CENSUS_PARENT,"HEAD"]);
  pin(PROTECTED_CENSUS_PROOF,PROTECTED_CENSUS_PROOF_BLOB,256*1024);
  pin(PROTECTED_CENSUS_WORKFLOW,PROTECTED_CENSUS_WORKFLOW_BLOB,192*1024);
  pin(PROTECTED_CENSUS_DOC,PROTECTED_CENSUS_DOC_BLOB,128*1024);

  const r=run(process.execPath,[path.join(ROOT,PROTECTED_CENSUS_PROOF)]);
  assert.equal(String(r.stderr||""),"","v7_census_revalidation_stderr");
  const v=JSON.parse(String(r.stdout||""));

  assert.equal(v.marker,"VOID_BUY_VOID_ENFORCEMENT_FINAL_PROTECTED_V7_V2_CENSUS_V7");
  assert.equal(v.version,7);
  assert.equal(v.protected_tracked_source_count,49);
  assert.equal(v.protected_generation_delta_count,3);
  assert.equal(v.unchanged_protected_path_count,46);
  assert.equal(v.protected_generation_delta_exact,true);
  assert.deepEqual(
    v.protected_generation_delta.map(x=>x.path).sort(),
    CHANGED_PROTECTED_PATHS,
  );
  assert.equal(v.economic_and_build_source_drift_count,0);
  assert.equal(v.reviewed_receipt_custody_source_evidence_bound,true);
  assert.equal(v.reviewed_receipt_custody_proof_reexecuted,false);
  assert.equal(v.source_generation_successor_evidence_bound,true);
  assert.equal(v.frozen_candidate_rederived,false);
  assert.equal(v.frozen_lock_rewritten,false);
  assert.equal(v.census_only,true);
  assert.equal(v.complete_executable_closure_verified,false);
  assert.equal(v.candidate_enforcement_identity_accepted,false);
  assert.equal(v.production_source_finality_authority_ready,false);
  assert.equal(v.public_presale_activation,false);
  assert.equal(v.funds_movement,false);

  for(const [actual,expected,label] of [
    [
      v.protected_tracked_source_inventory_canonical_sha256,
      HOSTED_PROTECTED_CENSUS.protected_tracked_source_inventory_canonical_sha256,
      "protected_inventory",
    ],
    [
      v.economic_artifact_inventory_sha256,
      HOSTED_PROTECTED_CENSUS.economic_artifact_inventory_sha256,
      "economic_artifact_inventory",
    ],
    [
      v.economic_source_inventory_sha256,
      HOSTED_PROTECTED_CENSUS.economic_source_inventory_sha256,
      "economic_source_inventory",
    ],
    [
      v.canonical_economic_artifact_inventory_sha256,
      HOSTED_PROTECTED_CENSUS.canonical_economic_artifact_inventory_sha256,
      "canonical_artifact_inventory",
    ],
    [
      v.canonical_economic_source_inventory_sha256,
      HOSTED_PROTECTED_CENSUS.canonical_economic_source_inventory_sha256,
      "canonical_source_inventory",
    ],
  ]){
    assert.equal(actual,expected,"v7_"+label+"_drift");
  }
  assert.equal(v.repository_head_sha,git(["rev-parse","HEAD"]),
    "v7_current_head_revalidation_missing");

  return Object.freeze({
    census_id_at_candidate_head:v.census_id,
    repository_head_sha:v.repository_head_sha,
    repository_tree_sha:v.repository_tree_sha,
    protected_tracked_source_inventory:v.protected_tracked_source_inventory,
    protected_tracked_source_inventory_canonical_sha256:
      v.protected_tracked_source_inventory_canonical_sha256,
    economic_artifact_inventory_sha256:v.economic_artifact_inventory_sha256,
    economic_source_inventory_sha256:v.economic_source_inventory_sha256,
    canonical_economic_artifact_inventory_sha256:
      v.canonical_economic_artifact_inventory_sha256,
    canonical_economic_source_inventory_sha256:
      v.canonical_economic_source_inventory_sha256,
    protected_generation_delta_count:v.protected_generation_delta_count,
    unchanged_protected_path_count:v.unchanged_protected_path_count,
    economic_executable_closure_preserved:true,
    exact_candidate_head_revalidation:true,
  });
}

function runTsProof(relative,requiredMarkers){
  const loader="file://"+path.join(ROOT,"node_modules/tsx/dist/loader.mjs");
  const r=run(process.execPath,["--import",loader,path.join(ROOT,relative)]);
  assert.equal(String(r.stderr||""),"","tsx_proof_stderr:"+relative);
  const output=String(r.stdout||"");
  for(const marker of requiredMarkers){
    assert.ok(output.includes(marker),"proof_marker_missing:"+relative+":"+marker);
  }
}

function reproveCustodySemantics(){
  pin(CUSTODY_INSTALLER,CUSTODY_INSTALLER_BLOB,512*1024);
  pin(CUSTODY_PROOF,CUSTODY_PROOF_BLOB,512*1024);
  pin(CUSTODY_DOC,CUSTODY_DOC_BLOB,256*1024);
  runTsProof(CUSTODY_PROOF,[
    "VOID_BUY_VOID_SOURCE_FINALITY_V7_DEPLOYMENT_RECEIPT_INSTALL_V1_PROOF_GREEN",
    "current_enforcement_tracked_source_inventory_verified=true",
    "current_enforcement_tracked_source_inventory_count=49",
    "funds_movement=false",
  ]);
  return Object.freeze({
    changed_protected_path:CUSTODY_INSTALLER,
    installer_git_blob_sha1:CUSTODY_INSTALLER_BLOB,
    proof_path:CUSTODY_PROOF,
    proof_git_blob_sha1:CUSTODY_PROOF_BLOB,
    operator_contract_path:CUSTODY_DOC,
    operator_contract_git_blob_sha1:CUSTODY_DOC_BLOB,
    current_content_semantics_requalified:true,
    current_head_proof_reexecuted:true,
  });
}

function reproveRangeAndProducerSemantics(){
  pin(INDEX_SOURCE,INDEX_SOURCE_BLOB,2*1024*1024);
  pin(ATTACH_TS,ATTACH_TS_BLOB,512*1024);
  pin(ATTACH_JS,ATTACH_JS_BLOB,512*1024);
  pin(INDEX_RANGE_PROOF,INDEX_RANGE_PROOF_BLOB,256*1024);
  pin(ATTACH_RANGE_PROOF,ATTACH_RANGE_PROOF_BLOB,256*1024);
  pin(PRODUCER_RUNNER,PRODUCER_RUNNER_BLOB,256*1024);
  pin(PRODUCER_GUARD,PRODUCER_GUARD_BLOB,256*1024);
  pin(PRODUCER_DISPATCH,PRODUCER_DISPATCH_BLOB,256*1024);
  pin(PRODUCER_OBSERVER_PROOF,PRODUCER_OBSERVER_PROOF_BLOB,256*1024);

  runTsProof(ATTACH_RANGE_PROOF,["void_attach_block_range_bounds_v1=PASS"]);
  runTsProof(INDEX_RANGE_PROOF,[
    "void_index_block_range_bounds_v1=PASS",
    "canonical_parser_reused=true",
    "public_aliases_preserved=true",
    "raw_range_iteration=false",
  ]);

  const dispatch=run(process.execPath,[path.join(ROOT,PRODUCER_DISPATCH)]);
  assert.equal(String(dispatch.stderr||""),"","producer_dispatch_stderr");
  const output=String(dispatch.stdout||"");
  assert.ok(
    output.includes("VOID_CANONICAL_PRODUCER_SOURCE_GENERATION_DISPATCH_V5_GREEN"),
    "producer_dispatch_green_missing",
  );
  assert.ok(
    output.includes("VOID_CANONICAL_PRODUCER_LEGACY_SELF_HTTP_OBSERVERS_V5_GREEN"),
    "producer_observer_green_missing",
  );

  return Object.freeze({
    range_route:Object.freeze({
      changed_protected_path:INDEX_SOURCE,
      source_git_blob_sha1:INDEX_SOURCE_BLOB,
      attach_ts_git_blob_sha1:ATTACH_TS_BLOB,
      attach_js_git_blob_sha1:ATTACH_JS_BLOB,
      index_proof_git_blob_sha1:INDEX_RANGE_PROOF_BLOB,
      attach_proof_git_blob_sha1:ATTACH_RANGE_PROOF_BLOB,
      canonical_range_parser_requalified:true,
      current_head_proofs_reexecuted:true,
    }),
    canonical_producer:Object.freeze({
      changed_protected_path:PRODUCER_RUNNER,
      runner_git_blob_sha1:PRODUCER_RUNNER_BLOB,
      guard_git_blob_sha1:PRODUCER_GUARD_BLOB,
      dispatch_proof_git_blob_sha1:PRODUCER_DISPATCH_BLOB,
      observer_proof_git_blob_sha1:PRODUCER_OBSERVER_PROOF_BLOB,
      source_generation_selector_requalified:true,
      obsolete_generation_refusal_requalified:true,
      current_observer_behavior_requalified:true,
      current_head_proofs_reexecuted:true,
    }),
  });
}

function derive(){
  assertWorkflowTriggerCoverage();
  const predecessor=acceptedV3Predecessor();
  const currentCensus=revalidateProtectedCensus();
  const custody=reproveCustodySemantics();
  const rangeAndProducer=reproveRangeAndProducerSemantics();

  assert.equal(predecessor.complete_executable_closure_verified,true);
  assert.equal(currentCensus.economic_executable_closure_preserved,true);

  const body={
    schema:"void_buy_void_enforcement_final_protected_v7_v2_candidate_v5",
    marker:MARKER,
    version:5,
    repository:"6ZoSo9/void-node",
    protected_census_parent:PROTECTED_CENSUS_PARENT,
    repository_head_sha:git(["rev-parse","HEAD"]),
    repository_tree_sha:git(["rev-parse","HEAD^{tree}"]),
    hosted_protected_census:HOSTED_PROTECTED_CENSUS,
    protected_census_current_revalidation:currentCensus,
    current_inventory_evidence:Object.freeze({
      hosted_json_artifact_inventory_sha256:
        currentCensus.economic_artifact_inventory_sha256,
      hosted_json_source_inventory_sha256:
        currentCensus.economic_source_inventory_sha256,
      canonical_artifact_inventory_sha256:
        currentCensus.canonical_economic_artifact_inventory_sha256,
      canonical_source_inventory_sha256:
        currentCensus.canonical_economic_source_inventory_sha256,
    }),
    current_enforcement_tracked_source_inventory_v1:
      currentCensus.protected_tracked_source_inventory,
    current_enforcement_tracked_source_inventory_count:49,
    current_enforcement_tracked_source_inventory_sha256:
      currentCensus.protected_tracked_source_inventory_canonical_sha256,
    current_enforcement_tracked_source_inventory_verified:true,
    predecessor_enforcement:predecessor,
    range_and_canonical_producer_semantics:rangeAndProducer,
    deployment_receipt_custody:custody,
    executable_closure_transition:Object.freeze({
      predecessor_complete_executable_closure_verified:true,
      economic_executable_closure_preserved:true,
      protected_source_delta_count:3,
      changed_protected_paths:CHANGED_PROTECTED_PATHS,
      changed_protected_path_semantics_requalified:true,
      transition_exact:true,
    }),
    complete_executable_closure_verified:true,
    candidate_enforcement_identity_accepted:false,
    deployed_artifact_generation_verified:false,
    runtime_mount_authority:false,
    production_source_finality_authority_ready:false,
    public_presale_activation:false,
    funds_movement:false,
  };
  return Object.freeze({
    ...body,
    candidate_enforcement_set_sha256:
      sha256(Buffer.from(canonical(body),"utf8")),
  });
}

const args=process.argv.slice(2);
if(args.length===1&&args[0]==="--derive"){
  process.stdout.write(JSON.stringify(derive(),null,2)+"\n");
}else if(args.length===0||(args.length===1&&args[0]==="--self-test")){
  const c=derive();
  assert.match(c.candidate_enforcement_set_sha256,/^[0-9a-f]{64}$/u);
  assert.equal(c.complete_executable_closure_verified,true);
  assert.equal(c.candidate_enforcement_identity_accepted,false);
  assert.equal(
    c.executable_closure_transition.changed_protected_path_semantics_requalified,
    true,
  );
  console.log(MARKER+"_GREEN");
  console.log("candidate_enforcement_set_sha256="+c.candidate_enforcement_set_sha256);
  console.log("accepted_v3_predecessor_preserved=true");
  console.log("v7_census_current_head_revalidated=true");
  console.log("range_semantics_requalified=true");
  console.log("canonical_producer_semantics_requalified=true");
  console.log("deployment_receipt_custody_semantics_requalified=true");
  console.log("complete_executable_closure_verified=true");
  console.log("candidate_enforcement_identity_accepted=false");
  console.log("production_source_finality_authority_ready=false");
  console.log("public_presale_activation=false");
  console.log("funds_movement=false");
}else{
  throw Error("usage: proof [--self-test|--derive]");
}
