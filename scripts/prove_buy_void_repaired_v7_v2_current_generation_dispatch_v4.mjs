#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import {spawnSync} from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const BASE="1b15fcf5070e7b8a8aa4b9348de88cf11be2ef26";
const PARENT_TREE="338ff5b264dd441c8bb16bb2fb425b85d4285b89";
const SELF="scripts/prove_buy_void_repaired_v7_v2_current_generation_dispatch_v4.mjs";
const DOC="docs/architecture/buy-void-repaired-v7-v2-current-generation-dispatch-v4.md";
const TOOL="ops/precision/void_buy_void_source_finality_v7_deployment_receipt_install_v1.ts";
const TOOL_BLOB="e0a682ea4038ca22e3a3b97da2cac29874096c46";
const TOOL_PROOF="scripts/prove_buy_void_source_finality_v7_deployment_receipt_install_v1.ts";
const TOOL_PROOF_BLOB="e634e666d3a190368ddb031f936ebbb6347b7196";
const DISPATCH_V3="scripts/prove_buy_void_repaired_v7_v2_current_generation_dispatch_v3.mjs";
const DISPATCH_V3_BLOB="2dd9e7024eaafe4641c0d3ac7d10f542a441bb92";
const DISPATCH_V3_DOC="docs/architecture/buy-void-repaired-v7-v2-current-generation-dispatch-v3.md";
const DISPATCH_V3_DOC_BLOB="36947405bbf3fede19004b9b2352d678b5632fd7";
const V3_CANDIDATE="ops/security/buy-void-enforcement-final-protected-v7-v2-candidate-v3.json";
const V3_CANDIDATE_BLOB="40c7d21e0f22bc2ffe079f80360af342f4d8a6aa";
const V3_CANDIDATE_SHA="7f9c032bb3685d0d45f439123878af0ba366bd587e29a98df3270f0f13808c96";
const V3_CANDIDATE_SET="4d06da56a3fa3fa7891c64a0c7191756c344effb62b330a1b003bd4952dc0223";
const V3_INV="65880eb31fd75bc07b8c568ada5a4903a2c178108408e2a8390c15b3cafb7589";
const V3_LOCK="ops/security/buy-void-enforcement-final-protected-v7-v2-lock-v3.json";
const V3_LOCK_BLOB="f1b9d661eb3363e9bf18dbeb3610c659a54219bb";
const V4_CANDIDATE="ops/security/buy-void-enforcement-final-protected-v7-v2-candidate-v4.json";
const V4_CANDIDATE_BLOB="ec00f0c552e600fff38e4998e4beb128c93b481d";
const V4_CANDIDATE_SHA="fbf3d5fbc1efad92c7bb5bb3fb45f686d1bddb95d4a7c34cadbd862b69318c60";
const V4_CANDIDATE_SET="00e8ca31370f9c6c4fa77185ed05a9ed0554e0b2036b6c5f2e937e7839c67b1a";
const V4_CANDIDATE_BYTES=17788;
const V4_PROOF="scripts/prove_buy_void_enforcement_final_protected_v7_v2_candidate_v4.mjs";
const V4_PROOF_BLOB="3a7401202fee374f2a7da3f5efc0d29976f9792a";
const INV="c87299b5d3ab7efad7b946ea3cbdc3b01bcae828141e864785743cd3d5f8e21d";
const EXPECTED_DELTA=Object.freeze([["M",".github/workflows/buy-void-delivery-dependency-provider-closure-post2865-lock-v1.yml"],["M",".github/workflows/buy-void-enforcement-final-protected-v7-v2-candidate-v1.yml"],["M",".github/workflows/buy-void-enforcement-final-protected-v7-v2-candidate-v2.yml"],["M",".github/workflows/buy-void-enforcement-final-v7-artifact-census-v4.yml"],["M",".github/workflows/buy-void-source-finality-v7-deployment-receipt-v3-lock-plan-v1.yml"],["M",".github/workflows/buy-void-source-finality-v7-executable-delta-candidate-v1.yml"],["A","docs/architecture/buy-void-repaired-v7-v2-current-generation-dispatch-v4.md"],["A","docs/architecture/buy-void-enforcement-final-protected-v7-v2-deployment-successor-v4.md"],["A","ops/security/buy-void-enforcement-final-protected-v7-v2-candidate-v4.json"],["A","scripts/prove_buy_void_enforcement_final_protected_v7_v2_candidate_v4.mjs"],["A","scripts/prove_buy_void_repaired_v7_v2_current_generation_dispatch_v4.mjs"]]);
const PROVIDER_EVIDENCE_HEAD="bc510343c5c418a75154bedcc445cbf1251dc037";
const PROVIDER_EVIDENCE_TREE="7e21075ccd632ea11f4d424424b348217a013dfe";
const PROVIDER_EVIDENCE="ops/security/buy-void-delivery-dependency-provider-closure-post2865-v1.json";
const PROVIDER_EVIDENCE_BLOB="b08c03912e0f66742f06f314bf5e1f5cad81f20f";
const PROVIDER_CANDIDATE_PROOF="scripts/prove_buy_void_delivery_dependency_provider_closure_v1.mjs";
const PROVIDER_CANDIDATE_PROOF_BLOB="bc9473b4fd79eae50f4e86ca24968d3328cdcf22";
const PROVIDER_SOURCE_ROWS=Object.freeze([
  {
    "git_blob_sha1":"5b23824bf0a0f33b193e1cfc022fcfb5b898b022",
    "git_mode":"100644",
    "path":"src/economic/buy_void_delivery_runtime_integration_v1.ts"
  },
  {
    "git_blob_sha1":"2deaee8ae4e0fbd909b417eef96a76012174c668",
    "git_mode":"100644",
    "path":"src/economic/buy_void_delivery_sign_broadcast_adapter_v1.ts"
  },
  {
    "git_blob_sha1":"f84ca60a37c77ae7691ec6970c59f123de4f73b7",
    "git_mode":"100644",
    "path":"src/economic/buy_void_delivery_submission_guard_v1.ts"
  },
  {
    "git_blob_sha1":"158cbf14fa2b566632c096a22e484b651cd44f6d",
    "git_mode":"100644",
    "path":"src/economic/buy_void_epoch2_fulfillment_access_list_v1.ts"
  },
  {
    "git_blob_sha1":"08e8849e1736d20c0737e493853732970c0f31a5",
    "git_mode":"100644",
    "path":"src/economic/buy_void_erc20_chain2050_broadcaster_v1.ts"
  },
  {
    "git_blob_sha1":"05d9094f507ade72591f1e8c4983085c2259f949",
    "git_mode":"100644",
    "path":"src/economic/buy_void_erc20_chain2050_total_deadline_transport_v1.ts"
  },
  {
    "git_blob_sha1":"e5651535bde060c91e988beb324aa8e5621d2857",
    "git_mode":"100644",
    "path":"src/economic/buy_void_erc20_delivery_dependency_bootstrap_v1.ts"
  },
  {
    "git_blob_sha1":"d110159db9d20a8ce85391f4bdb154b9a6ddefde",
    "git_mode":"100644",
    "path":"src/economic/buy_void_erc20_delivery_dependency_injection_v1.ts"
  },
  {
    "git_blob_sha1":"0999f773bdc4befb3e82676304f0d69f5cab42ef",
    "git_mode":"100644",
    "path":"src/economic/buy_void_erc20_production_credential_binding_evidence_v1.ts"
  },
  {
    "git_blob_sha1":"28b50301609c16838903ee49e62ba91cd4660e88",
    "git_mode":"100644",
    "path":"src/economic/buy_void_native_chain2050_broadcaster_v1.ts"
  },
  {
    "git_blob_sha1":"5fd9296d10d810b1976c159578f13cca5d1594fe",
    "git_mode":"100644",
    "path":"src/economic/buy_void_native_fulfillment_wallet_credential_signer_v1.ts"
  },
  {
    "git_blob_sha1":"00dad9a345dcbdc9d96bc0f61543f8d0db63e0ac",
    "git_mode":"100644",
    "path":"src/economic/buy_void_runtime_integration_v1.ts"
  }
]);
const PROVIDER_SUPPORT_ROWS=Object.freeze([
  {
    "git_blob_sha1":"15b5c82ea36f13079a2f9e8863722f654eb3f201",
    "git_mode":"100644",
    "path":"package-lock.json"
  },
  {
    "git_blob_sha1":"14fbdf5717b07fd4c734f5da7a8e84ed59bee93f",
    "git_mode":"100644",
    "path":"package.json"
  },
  {
    "git_blob_sha1":"bc9473b4fd79eae50f4e86ca24968d3328cdcf22",
    "git_mode":"100644",
    "path":"scripts/prove_buy_void_delivery_dependency_provider_closure_v1.mjs"
  },
  {
    "git_blob_sha1":"d43e7f3fa03d20159f7b92aca4c8a56e738cd2fb",
    "git_mode":"100644",
    "path":"tsconfig.build.json"
  }
]);
const WORKFLOWS=Object.freeze([[".github/workflows/buy-void-enforcement-final-protected-v7-v2-candidate-v2.yml","CURRENT_PROTECTED_INTEGRATION_DISPATCH_V4","receipt"],[".github/workflows/buy-void-enforcement-final-protected-v7-v2-candidate-v1.yml","HISTORICAL_V1_REFUSAL_CURRENT_V2_DISPATCH_V4","historical-self-test"],[".github/workflows/buy-void-source-finality-v7-executable-delta-candidate-v1.yml","CURRENT_PROTECTED_INTEGRATION_DISPATCH_V4","receipt"],[".github/workflows/buy-void-enforcement-final-v7-artifact-census-v4.yml","CURRENT_PROTECTED_INTEGRATION_DISPATCH_V4","receipt"],[".github/workflows/buy-void-delivery-dependency-provider-closure-post2865-lock-v1.yml","CURRENT_PROTECTED_INTEGRATION_DISPATCH_V4","receipt"]]);
const ARTIFACT_PATHS=Object.freeze(["dist/economic/buy_void_auto_fulfillment_v1.js","dist/economic/buy_void_broadcast_outcome_journal_v1.js","dist/economic/buy_void_confirmed_state_journal_v1.js","dist/economic/buy_void_crash_consistent_saga_server_policy_v1.js","dist/economic/buy_void_delivery_runtime_integration_v1.js","dist/economic/buy_void_delivery_sign_broadcast_adapter_v1.js","dist/economic/buy_void_delivery_submission_guard_v1.js","dist/economic/buy_void_erc20_delivery_receipt_reconciler_v1.js","dist/economic/buy_void_erc20_execution_composition_v1.js","dist/economic/buy_void_erc20_transaction_preparation_planner_v1.js","dist/economic/buy_void_execution_attempt_journal_v1.js","dist/economic/buy_void_filesystem_bakery_lock_v1.js","dist/economic/buy_void_fulfillment_confirmation_v1.js","dist/economic/buy_void_fulfillment_journal_v1.js","dist/economic/buy_void_inventory_reservation_journal_v1.js","dist/economic/buy_void_payment_rpc_observer_v1.js","dist/economic/buy_void_pipeline_coordinator_v1.js","dist/economic/buy_void_source_chain_finality_rpc_adapter_v1.js","dist/economic/buy_void_source_finality_authenticated_composition_v3.js","dist/economic/buy_void_source_finality_authority_v2.js","dist/economic/buy_void_source_finality_execution_preflight_v1.js","dist/economic/buy_void_source_finality_generation_provenance_v6.js","dist/economic/buy_void_verified_payment_v2.js","dist/economic/buy_void_source_finality_generation_provenance_v7.js","dist/economic/buy_void_source_finality_live_process_binding_v1.js","dist/economic/buy_void_source_finality_live_process_binding_v2.js","dist/economic/buy_void_source_finality_provider_pair_binding_v1.js","dist/economic/buy_void_ethereum_public_checkout_finality_gate_v1.js"]);
const STAT_FIELDS=Object.freeze(["dev","ino","mode","nlink","uid","gid","rdev","size","mtimeMs","ctimeMs"]);

const sha=b=>crypto.createHash("sha256").update(b).digest("hex");
const blob=b=>crypto.createHash("sha1").update(Buffer.from("blob "+b.length+"\0")).update(b).digest("hex");
function canonical(v){
  if(v===null||typeof v==="boolean"||typeof v==="string")return JSON.stringify(v);
  if(typeof v==="number"){assert.ok(Number.isSafeInteger(v));return String(v);}
  if(Array.isArray(v))return "["+v.map(canonical).join(",")+"]";
  assert.ok(v&&typeof v==="object"&&!Array.isArray(v));
  return "{"+Object.keys(v).sort().map(k=>JSON.stringify(k)+":"+canonical(v[k])).join(",")+"}";
}
function run(command,args,{timeout=300000,allowFail=false}={}){
  const r=spawnSync(command,args,{
    cwd:ROOT,encoding:"utf8",stdio:["ignore","pipe","pipe"],timeout,maxBuffer:32*1024*1024,
    env:{PATH:"/usr/bin:/bin",HOME:"/nonexistent",LANG:"C",LC_ALL:"C",TZ:"UTC",
      NODE_ENV:"test",GIT_CONFIG_NOSYSTEM:"1",GIT_CONFIG_GLOBAL:"/dev/null",
      GIT_CONFIG_SYSTEM:"/dev/null",GIT_NO_REPLACE_OBJECTS:"1",
      GIT_OPTIONAL_LOCKS:"0",GIT_TERMINAL_PROMPT:"0"}
  });
  assert.equal(r.error,undefined,String(r.error||""));
  if(!allowFail)assert.equal(r.status,0,String(r.stderr||r.stdout||""));
  return r;
}
const git=args=>String(run("/usr/bin/git",["--no-replace-objects","-C",ROOT,...args],{timeout:30000}).stdout||"").trim();
function sameStat(actual,expected,label){for(const key of STAT_FIELDS)assert.equal(actual[key],expected[key],label+":"+key);}
function inspect(relative,max=4*1024*1024){
  assert.ok(!path.isAbsolute(relative)&&!relative.split("/").includes(".."),"unsafe_path:"+relative);
  const absolute=path.join(ROOT,...relative.split("/"));
  const before=fs.lstatSync(absolute);
  assert.ok(before.isFile()&&!before.isSymbolicLink()&&before.nlink===1&&before.size>0&&before.size<=max,
    "invalid_file:"+relative);
  assert.equal(typeof fs.constants.O_NOFOLLOW,"number","nofollow_unavailable");
  assert.equal(typeof fs.constants.O_NONBLOCK,"number","nonblock_unavailable");
  let fd=-1;
  try{
    fd=fs.openSync(absolute,fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW|fs.constants.O_NONBLOCK);
    const opened=fs.fstatSync(fd);
    assert.ok(opened.isFile()&&opened.nlink===1&&opened.size>0&&opened.size<=max,"invalid_opened_file:"+relative);
    sameStat(opened,before,"open_drift:"+relative);
    const chunks=[];const scratch=Buffer.alloc(Math.min(64*1024,max+1));let total=0;
    while(total<=max){const want=Math.min(scratch.length,max+1-total);if(want===0)break;
      const n=fs.readSync(fd,scratch,0,want,null);if(n===0)break;chunks.push(Buffer.from(scratch.subarray(0,n)));total+=n;}
    assert.ok(total<=max,"file_too_large:"+relative);
    assert.equal(total,opened.size,"short_or_grown_read:"+relative);
    sameStat(fs.fstatSync(fd),opened,"descriptor_drift:"+relative);
    sameStat(fs.lstatSync(absolute),opened,"visible_drift:"+relative);
    return {bytes:Buffer.concat(chunks,total),stat:opened};
  }finally{if(fd>=0)fs.closeSync(fd);}
}
const read=(relative,max=4*1024*1024)=>inspect(relative,max).bytes;
function pin(relative,expected,max=4*1024*1024){
  const b=read(relative,max);assert.equal(blob(b),expected,"blob:"+relative);
  assert.equal(git(["rev-parse","HEAD:"+relative]),expected,"head:"+relative);return b;
}
function treeMode(relative){
  const row=git(["ls-tree","HEAD","--",relative]);
  const m=row.match(/^(100644|100755) blob ([0-9a-f]{40})\t(.+)$/u);
  assert.ok(m&&m[3]===relative,"tree_entry_invalid:"+relative);return m[1];
}
function sourcePath(artifact){return "src/economic/"+path.basename(artifact,".js")+".ts";}
function verifyScope(){
  run("/usr/bin/git",["--no-replace-objects","-C",ROOT,"merge-base","--is-ancestor",BASE,"HEAD"],{timeout:30000});
  assert.equal(git(["rev-parse",BASE+"^{tree}"]),PARENT_TREE,"parent_tree_drift");
  const rows=git(["diff","--name-status",BASE,"HEAD"]).split("\n").filter(Boolean)
    .map(line=>{const [status,...rest]=line.split("\t");return [status,rest.join("\t")];})
    .sort((a,b)=>a[1].localeCompare(b[1]));
  assert.deepEqual(rows,[...EXPECTED_DELTA].sort((a,b)=>a[1].localeCompare(b[1])),"dispatch_v4_delta_scope");
  const economic=git(["diff","--name-only",BASE,"HEAD","--","src/economic","package.json","package-lock.json","tsconfig.build.json"]);
  assert.equal(economic,"","economic_or_provider_scope_changed");
}
function verifyCandidate(){
  const v3Bytes=pin(V3_CANDIDATE,V3_CANDIDATE_BLOB,128*1024);
  assert.equal(sha(v3Bytes),V3_CANDIDATE_SHA);
  const v3=JSON.parse(v3Bytes);
  assert.equal(v3.candidate_enforcement_set_sha256,V3_CANDIDATE_SET);
  assert.equal(v3.current_enforcement_tracked_source_inventory_sha256,V3_INV);
  const lock=JSON.parse(pin(V3_LOCK,V3_LOCK_BLOB,128*1024));
  assert.equal(lock.candidate_evidence?.git_blob_sha1,V3_CANDIDATE_BLOB);
  assert.equal(lock.candidate_enforcement_identity_accepted,true);
  const bytes=pin(V4_CANDIDATE,V4_CANDIDATE_BLOB,128*1024);
  assert.equal(bytes.length,V4_CANDIDATE_BYTES);
  assert.equal(sha(bytes),V4_CANDIDATE_SHA);
  pin(V4_PROOF,V4_PROOF_BLOB,1024*1024);
  const c=JSON.parse(bytes);
  assert.equal(c.schema,"void_buy_void_enforcement_final_protected_v7_v2_candidate_v4");
  assert.equal(c.marker,"VOID_BUY_VOID_ENFORCEMENT_FINAL_PROTECTED_V7_V2_CANDIDATE_V4");
  assert.equal(c.version,4);assert.equal(c.current_enforcement_parent,BASE);
  assert.equal(c.current_enforcement_tracked_source_inventory_count,49);
  assert.equal(c.current_enforcement_tracked_source_inventory_sha256,INV);
  assert.equal(c.candidate_enforcement_set_sha256,V4_CANDIDATE_SET);
  const body={...c};delete body.candidate_enforcement_set_sha256;
  assert.equal(sha(Buffer.from(canonical(body),"utf8")),V4_CANDIDATE_SET,"candidate_set_rederive");
  assert.equal(c.candidate_enforcement_identity_accepted,false);
  assert.equal(c.production_source_finality_authority_ready,false);
  assert.equal(c.public_presale_activation,false);
  assert.equal(c.funds_movement,false);
  const rows=c.current_enforcement_tracked_source_inventory_v1;
  assert.ok(Array.isArray(rows)&&rows.length===49);
  let predecessorDrift=0;
  for(let i=0;i<rows.length;i++){
    const row=rows[i],before=v3.current_enforcement_tracked_source_inventory_v1[i];
    assert.equal(row.path,before.path);assert.equal(row.git_mode,before.git_mode);
    const observed=inspect(row.path,16*1024*1024);
    const currentBlob=git(["rev-parse","HEAD:"+row.path]);
    assert.equal(blob(observed.bytes),currentBlob,"current_inventory_visible_blob_drift:"+row.path);
    assert.equal(currentBlob,row.git_blob_sha1,"current_inventory_blob_drift:"+row.path);
    const currentMode=treeMode(row.path);
    assert.equal(currentMode,row.git_mode,"current_inventory_mode_drift:"+row.path);
    const visibleMode=(observed.stat.mode&0o111)!==0?"100755":"100644";
    assert.equal(visibleMode,currentMode,"current_inventory_visible_mode_drift:"+row.path);
    if(row.git_blob_sha1!==before.git_blob_sha1){
      predecessorDrift++;assert.equal(row.path,TOOL);
      assert.equal(before.git_blob_sha1,"3de6e4bd1f9aa2e9c0a0889cc7c0ab489cb306c0");
      assert.equal(row.git_blob_sha1,TOOL_BLOB);
    }
  }
  assert.equal(predecessorDrift,1);
  assert.equal(sha(Buffer.from(canonical(rows),"utf8")),INV);
  return c;
}
function verifyBuiltCensus(candidate){
  const artifacts=ARTIFACT_PATHS.map(relative=>{const b=read(relative,2*1024*1024);return {path:relative,bytes:b.length,sha256:sha(b)};});
  const sources=[...new Set(ARTIFACT_PATHS.map(sourcePath))].sort().map(relative=>{
    const observed=inspect(relative,4*1024*1024);const b=observed.bytes;const sourceBlob=blob(b);
    assert.equal(git(["rev-parse","HEAD:"+relative]),sourceBlob,"census_source_head_mismatch:"+relative);
    const sourceMode=treeMode(relative);
    const visibleMode=(observed.stat.mode&0o111)!==0?"100755":"100644";
    assert.equal(visibleMode,sourceMode,"census_source_mode_mismatch:"+relative);
    return {path:relative,bytes:b.length,git_blob_sha1:sourceBlob,sha256:sha(b)};
  });
  assert.equal(artifacts.length,28);assert.equal(sources.length,28);
  assert.equal(sha(Buffer.from(JSON.stringify(artifacts),"utf8")),candidate.hosted_census_evidence.artifact_inventory_sha256);
  assert.equal(sha(Buffer.from(JSON.stringify(sources),"utf8")),candidate.hosted_census_evidence.source_inventory_sha256);
  assert.equal(sha(Buffer.from(canonical(artifacts),"utf8")),candidate.current_inventory_evidence.canonical_artifact_inventory_sha256);
  assert.equal(sha(Buffer.from(canonical(sources),"utf8")),candidate.current_inventory_evidence.canonical_source_inventory_sha256);
}
function verifyProviderIdentity(){
  const evidence=JSON.parse(pin(PROVIDER_EVIDENCE,PROVIDER_EVIDENCE_BLOB,128*1024).toString("utf8"));
  assert.equal(evidence.marker,"VOID_BUY_VOID_DELIVERY_DEPENDENCY_PROVIDER_CLOSURE_V1");
  assert.equal(evidence.repository_head_sha,PROVIDER_EVIDENCE_HEAD);
  assert.equal(evidence.repository_tree_sha,PROVIDER_EVIDENCE_TREE);
  assert.equal(evidence.provider_closure_sha256,"3b6be7b9efdc7f70b6f270f77208efab2f7321136a54cc76a7e1d34c57bd4945");
  assert.equal(evidence.provider_static_module_closure_verified,true);
  assert.equal(evidence.dynamic_module_loader_present,false);
  assert.equal(PROVIDER_SOURCE_ROWS.length,12,"provider_source_manifest_count");
  assert.equal(PROVIDER_SUPPORT_ROWS.length,4,"provider_support_manifest_count");
  assert.deepEqual(
    evidence.provider_source_paths,
    PROVIDER_SOURCE_ROWS.map(row=>row.path),
    "provider_source_path_manifest_drift",
  );
  const support=Object.fromEntries(PROVIDER_SUPPORT_ROWS.map(row=>[row.path,row]));
  assert.equal(Object.keys(support).length,PROVIDER_SUPPORT_ROWS.length,"provider_support_path_duplicate");
  assert.equal(evidence.package_json_git_blob_sha1,support["package.json"].git_blob_sha1,
    "provider_package_json_manifest_drift");
  assert.equal(evidence.package_lock_git_blob_sha1,support["package-lock.json"].git_blob_sha1,
    "provider_package_lock_manifest_drift");
  assert.equal(PROVIDER_CANDIDATE_PROOF_BLOB,support[PROVIDER_CANDIDATE_PROOF].git_blob_sha1,
    "provider_candidate_proof_manifest_drift");
  for(const row of [...PROVIDER_SOURCE_ROWS,...PROVIDER_SUPPORT_ROWS]){
    assert.deepEqual(Object.keys(row).sort(),["git_blob_sha1","git_mode","path"],
      "provider_manifest_row_shape:"+row.path);
    assert.match(row.git_blob_sha1,/^[0-9a-f]{40}$/u,"provider_manifest_blob_invalid:"+row.path);
    assert.ok(row.git_mode==="100644"||row.git_mode==="100755",
      "provider_manifest_mode_invalid:"+row.path);
    pin(row.path,row.git_blob_sha1,4*1024*1024);
    assert.equal(treeMode(row.path),row.git_mode,"provider_manifest_mode_drift:"+row.path);
  }
  const identities=[evidence.server_runtime_identity,evidence.delivery_consumer_identity,evidence.delivery_adapter_identity,...evidence.provider_runtime_artifacts];
  const seen=new Set();
  for(const identity of identities){
    if(seen.has(identity.path))continue; seen.add(identity.path);
    const bytes=read(identity.path,2*1024*1024);
    assert.equal(bytes.length,identity.bytes,"provider_artifact_bytes_drift:"+identity.path);
    assert.equal(sha(bytes),identity.sha256,"provider_artifact_sha256_drift:"+identity.path);
  }
  return evidence;
}
function verifyPredecessorAndReader(){
  const d3=pin(DISPATCH_V3,DISPATCH_V3_BLOB,4*1024*1024).toString("utf8");
  pin(DISPATCH_V3_DOC,DISPATCH_V3_DOC_BLOB,512*1024);
  const tool=pin(TOOL,TOOL_BLOB,512*1024).toString("utf8");
  const proof=pin(TOOL_PROOF,TOOL_PROOF_BLOB,512*1024).toString("utf8");
  for(const token of [
    'schema:"void_buy_void_repaired_v7_v2_current_generation_dispatch_v3"',
    "frozen_v4_census_proof_preserved:true",
    "nonprotected_economic_drift_count:NONPROTECTED_ECONOMIC_DRIFT.length",
  ])assert.ok(d3.includes(token),"dispatch_v3_token_missing:"+token);
  for(const token of ["function readBoundedRegularFileV1(","O_NOFOLLOW","O_NONBLOCK","maxBytes+1","export function readTrackedFileV1("])
    assert.ok(tool.includes(token),"tool_token_missing:"+token);
  for(const token of ["proveProductionTrackedFileReadBoundaryV1","production_tracked_file_fifo_swap_rejected=true",
    "current_enforcement_inventory_uses_bounded_descriptor=true"])
    assert.ok(proof.includes(token),"tool_proof_token_missing:"+token);
}
function assertionVariables(text,field){
  const rx=new RegExp(
    "assert\\.equal\\(\\s*([A-Za-z_$][A-Za-z0-9_$]*)\\."+field+
      "\\s*,\\s*(true|false)\\s*,?\\s*\\);",
    "g",
  );
  return [...text.matchAll(rx)].map(match=>[match[1],match[2]]);
}
function assertionVariableCounts(text,field,value){
  const found=new Map();
  for(const [variable,actualValue] of assertionVariables(text,field)){
    if(actualValue!==value)continue;
    found.set(variable,(found.get(variable)||0)+1);
  }
  return found;
}
function verifyWorkflows(){
  for(const [relative,marker,contract] of WORKFLOWS){
    const text=read(relative,1024*1024).toString("utf8");
    assert.ok(text.includes(marker),"workflow_marker_missing:"+relative);
    assert.ok(text.includes(SELF),"workflow_dispatch_v4_missing:"+relative);
    assert.equal(text.includes("node "+DISPATCH_V3),false,"active_dispatch_v3_invocation_remains:"+relative);
    if(contract==="receipt"){
      assert.ok(text.includes("node "+SELF+" --receipt"),"receipt_invocation_missing:"+relative);
      const successors=assertionVariableCounts(
        text,"reviewed_deployment_reader_successor_bound","true",
      );
      assert.ok(successors.size>0,"reader_assertion_missing:"+relative);
      for(const [variable,requiredCount] of successors){
        for(const [field,value] of [
          ["workflow_dispatch_contracts_bound","true"],
          ["production_tracked_file_nonblocking","true"],
          ["production_tracked_file_fifo_swap_rejected","true"],
          ["current_v4_candidate_inventory_preserved","true"],
          ["v4_candidate_rederived_on_current_head","true"],
          ["v4_candidate_enforcement_identity_accepted","false"],
        ]){
          const actualCount=assertionVariableCounts(text,field,value).get(variable)||0;
          assert.ok(actualCount>=requiredCount,
            "workflow_v4_assertion_missing:"+relative+":"+variable+":"+field+
              ":expected_at_least="+requiredCount+":actual="+actualCount);
        }
      }
    }else{
      assert.ok(text.includes("node "+SELF+" --self-test"),"historical_self_test_missing:"+relative);
      assert.equal(text.includes("node "+SELF+" --receipt"),false,"historical_receipt_forbidden:"+relative);
    }
  }
}
function verify(){
  verifyScope();
  const candidate=verifyCandidate();
  verifyBuiltCensus(candidate);
  const provider=verifyProviderIdentity();
  verifyPredecessorAndReader();
  verifyWorkflows();
  return Object.freeze({
    schema:"void_buy_void_repaired_v7_v2_current_generation_dispatch_v4",
    marker:"VOID_BUY_VOID_REPAIRED_V7_V2_CURRENT_GENERATION_DISPATCH_V4",
    version:4,
    repository:"6ZoSo9/void-node",
    predecessor_dispatch_v3_git_blob_sha1:DISPATCH_V3_BLOB,
    protected_path_count:49,
    protected_path_identity_preserved:false,
    frozen_protected_inventory_preserved:true,
    reviewed_protected_drift_count:1,
    reviewed_deployment_reader_successor_bound:true,
    workflow_dispatch_contracts_bound:true,
    production_tracked_file_nonblocking:true,
    production_tracked_file_fifo_swap_rejected:true,
    reviewed_range_index_successor_preserved:true,
    frozen_candidate_json_sha256:V3_CANDIDATE_SHA,
    frozen_candidate_enforcement_set_sha256:V3_CANDIDATE_SET,
    frozen_candidate_rederived_on_current_head:false,
    frozen_lock_identity_preserved:true,
    current_v4_candidate_inventory_preserved:true,
    v4_candidate_json_sha256:V4_CANDIDATE_SHA,
    v4_candidate_enforcement_set_sha256:V4_CANDIDATE_SET,
    v4_candidate_rederived_on_current_head:true,
    v4_candidate_enforcement_identity_accepted:false,
    current_built_census_identity_matches_frozen_v4:true,
    frozen_v4_census_proof_preserved:true,
    provider_source_path_count:provider.provider_source_paths.length,
    provider_source_identity_preserved:true,
    provider_source_blob_manifest_bound:true,
    provider_historical_commit_object_required:false,
    protected_parent_scope_manifest_bound:true,
    protected_parent_scope_delta_status_bound:true,
    protected_parent_historical_commit_object_required:false,
    protected_parent_scope_row_count:248,
    nonprotected_economic_drift_count:3,
    provider_built_artifact_identity_preserved:true,
    current_generation_integration_verified:true,
    candidate_enforcement_identity_accepted:false,
    deployed_artifact_generation_verified:false,
    runtime_mount_authority:false,
    production_source_finality_authority_ready:false,
    public_presale_activation:false,
    funds_movement:false,
  });
}
const arg=process.argv[2]||"--self-test";
if(arg==="--receipt"){
  process.stdout.write(JSON.stringify(verify(),null,2)+"\n");
}else if(arg==="--workflow-contract-self-test"){
  verifyWorkflows();console.log("VOID_BUY_VOID_REPAIRED_V7_V2_CURRENT_GENERATION_DISPATCH_V4_WORKFLOW_CONTRACT_SELF_TEST_GREEN");
}else if(arg==="--self-test"){
  const r=verify();
  console.log("VOID_BUY_VOID_REPAIRED_V7_V2_CURRENT_GENERATION_DISPATCH_V4_GREEN");
  for(const key of [
    "protected_path_count","reviewed_protected_drift_count","reviewed_deployment_reader_successor_bound",
    "workflow_dispatch_contracts_bound","production_tracked_file_nonblocking",
    "production_tracked_file_fifo_swap_rejected","current_v4_candidate_inventory_preserved",
    "v4_candidate_rederived_on_current_head","v4_candidate_enforcement_identity_accepted",
    "frozen_v4_census_proof_preserved","provider_built_artifact_identity_preserved",
    "nonprotected_economic_drift_count",
    "production_source_finality_authority_ready","public_presale_activation","funds_movement"
  ])console.log(key+"="+r[key]);
}else{
  throw Error("usage: "+SELF+" [--self-test|--workflow-contract-self-test|--receipt]");
}
