#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const BASE="4a051b906b827836fd50216e80b226f8e0b23300";
const TOOL="ops/precision/void_buy_void_source_finality_v7_deployment_receipt_install_v1.ts";
const TOOL_BLOB="e0a682ea4038ca22e3a3b97da2cac29874096c46";
const TOOL_PROOF="scripts/prove_buy_void_source_finality_v7_deployment_receipt_install_v1.ts";
const TOOL_PROOF_BLOB="e634e666d3a190368ddb031f936ebbb6347b7196";
const DISPATCH="scripts/prove_buy_void_repaired_v7_v2_current_generation_dispatch_v3.mjs";
const DISPATCH_BLOB="2dd9e7024eaafe4641c0d3ac7d10f542a441bb92";
const DISPATCH_DOC="docs/architecture/buy-void-repaired-v7-v2-current-generation-dispatch-v3.md";
const DISPATCH_DOC_BLOB="36947405bbf3fede19004b9b2352d678b5632fd7";
const CANDIDATE="ops/security/buy-void-enforcement-final-protected-v7-v2-candidate-v3.json";
const CANDIDATE_BLOB="40c7d21e0f22bc2ffe079f80360af342f4d8a6aa";
const LOCK="ops/security/buy-void-enforcement-final-protected-v7-v2-lock-v3.json";
const LOCK_BLOB="f1b9d661eb3363e9bf18dbeb3610c659a54219bb";
const OLD_TOOL_BLOB="3de6e4bd1f9aa2e9c0a0889cc7c0ab489cb306c0";
const EXPECTED=Object.freeze([
  ["M",".github/workflows/buy-void-delivery-dependency-provider-closure-post2865-lock-v1.yml"],
  ["M",".github/workflows/buy-void-enforcement-final-protected-v7-v2-candidate-v1.yml"],
  ["M",".github/workflows/buy-void-enforcement-final-protected-v7-v2-candidate-v2.yml"],
  ["M",".github/workflows/buy-void-enforcement-final-v7-artifact-census-v4.yml"],
  ["A",".github/workflows/buy-void-source-finality-v7-deployment-receipt-v3-lock-plan-v1.yml"],
  ["M",".github/workflows/buy-void-source-finality-v7-executable-delta-candidate-v1.yml"],
  ["A","docs/architecture/buy-void-repaired-v7-v2-current-generation-dispatch-v3.md"],
  ["A","docs/architecture/buy-void-source-finality-v7-deployment-receipt-v3-lock-plan-v1.md"],
  ["M","ops/precision/void_buy_void_source_finality_v7_deployment_receipt_install_v1.ts"],
  ["A","scripts/prove_buy_void_repaired_v7_v2_current_generation_dispatch_v3.mjs"],
  ["M","scripts/prove_buy_void_source_finality_v7_deployment_receipt_install_v1.ts"],
  ["A","scripts/prove_buy_void_source_finality_v7_deployment_receipt_v3_lock_plan_v1.mjs"],
]);
const STABLE=Object.freeze(["dev","ino","mode","nlink","uid","gid","rdev","size","mtimeMs","ctimeMs"]);
const gitBlob=b=>crypto.createHash("sha1").update(Buffer.from("blob "+b.length+"\0")).update(b).digest("hex");
function run(command,args,{allowFail=false,timeout=300000}={}){
  const r=spawnSync(command,args,{cwd:ROOT,encoding:"utf8",stdio:["ignore","pipe","pipe"],timeout,maxBuffer:32*1024*1024,
    env:{PATH:"/usr/bin:/bin",HOME:"/nonexistent",LANG:"C",LC_ALL:"C",TZ:"UTC",GIT_CONFIG_NOSYSTEM:"1",GIT_CONFIG_GLOBAL:"/dev/null",GIT_CONFIG_SYSTEM:"/dev/null",GIT_NO_REPLACE_OBJECTS:"1",GIT_OPTIONAL_LOCKS:"0",GIT_TERMINAL_PROMPT:"0"}});
  assert.equal(r.error,undefined,String(r.error||"")); if(!allowFail)assert.equal(r.status,0,String(r.stderr||r.stdout||"")); return r;
}
function git(args){return String(run("/usr/bin/git",["--no-replace-objects","-C",ROOT,...args],{timeout:30000}).stdout||"").trim();}
function read(relative,max=1024*1024){
  const absolute=path.join(ROOT,...relative.split("/")); const before=fs.lstatSync(absolute);
  assert.ok(before.isFile()&&!before.isSymbolicLink()&&before.nlink===1&&before.size>0&&before.size<=max,"shape:"+relative);
  const noFollow=fs.constants.O_NOFOLLOW; const nonBlock=fs.constants.O_NONBLOCK;
  assert.equal(typeof noFollow,"number"); assert.equal(typeof nonBlock,"number"); let fd=-1;
  try{fd=fs.openSync(absolute,fs.constants.O_RDONLY|noFollow|nonBlock); const opened=fs.fstatSync(fd);
    for(const key of STABLE)assert.equal(opened[key],before[key],"open_drift:"+relative+":"+key);
    const chunks=[];const scratch=Buffer.alloc(Math.min(64*1024,max+1));let total=0;
    while(total<=max){const remain=max+1-total;if(remain<=0)break;const n=fs.readSync(fd,scratch,0,Math.min(scratch.length,remain),null);if(n===0)break;chunks.push(Buffer.from(scratch.subarray(0,n)));total+=n;}
    assert.ok(total<=max,"too_large:"+relative);assert.equal(total,opened.size,"short:"+relative);
    const after=fs.fstatSync(fd);for(const key of STABLE)assert.equal(after[key],opened[key],"fd_drift:"+relative+":"+key);
    const visible=fs.lstatSync(absolute);for(const key of STABLE)assert.equal(visible[key],opened[key],"visible_drift:"+relative+":"+key);
    return Buffer.concat(chunks,total);
  }finally{if(fd>=0)fs.closeSync(fd);}
}
function pin(relative,blob,max=1024*1024){const bytes=read(relative,max);assert.equal(gitBlob(bytes),blob,"blob:"+relative);assert.equal(git(["rev-parse","HEAD:"+relative]),blob,"head:"+relative);return bytes;}
function verify(){
  run("/usr/bin/git",["--no-replace-objects","-C",ROOT,"merge-base","--is-ancestor",BASE,"HEAD"],{timeout:30000});
  const rows=git(["diff","--name-status",BASE,"HEAD"]).split("\n").filter(Boolean).map(line=>{const [status,...rest]=line.split("\t");return [status,rest.join("\t")];}).sort((a,b)=>a[1].localeCompare(b[1]));
  assert.deepEqual(rows,[...EXPECTED].sort((a,b)=>a[1].localeCompare(b[1])),"delta_scope");
  const tool=pin(TOOL,TOOL_BLOB,512*1024).toString("utf8");
  const proof=pin(TOOL_PROOF,TOOL_PROOF_BLOB,512*1024).toString("utf8");
  pin(DISPATCH,DISPATCH_BLOB,2*1024*1024); pin(DISPATCH_DOC,DISPATCH_DOC_BLOB,256*1024);
  const candidate=JSON.parse(pin(CANDIDATE,CANDIDATE_BLOB,128*1024).toString("utf8"));
  const lock=JSON.parse(pin(LOCK,LOCK_BLOB,128*1024).toString("utf8"));
  const row=candidate.current_enforcement_tracked_source_inventory_v1.find(item=>item.path===TOOL);
  assert.ok(row,"tool_row_missing"); assert.equal(row.git_blob_sha1,OLD_TOOL_BLOB); assert.equal(row.git_mode,"100644");
  assert.notEqual(TOOL_BLOB,OLD_TOOL_BLOB); assert.equal(lock.candidate_evidence.git_blob_sha1,CANDIDATE_BLOB);
  assert.equal(lock.candidate_enforcement_identity_accepted,true); assert.equal(lock.production_source_finality_authority_ready,false);
  for(const token of ["readBoundedRegularFileV1","O_NOFOLLOW","O_NONBLOCK","maxBytes+1","export function readTrackedFileV1"])
    assert.ok(tool.includes(token),"tool_token:"+token);
  for(const token of ["proveProductionTrackedFileReadBoundaryV1","production_tracked_file_descriptor_bound=true","production_tracked_file_nonblocking=true","production_tracked_file_fifo_swap_rejected=true","current_enforcement_inventory_uses_bounded_descriptor=true"])
    assert.ok(proof.includes(token),"proof_token:"+token);
  const dispatch=run(process.execPath,[DISPATCH,"--receipt"]);
  const receipt=JSON.parse(dispatch.stdout);
  assert.equal(receipt.marker,"VOID_BUY_VOID_REPAIRED_V7_V2_CURRENT_GENERATION_DISPATCH_V3");
  assert.equal(receipt.reviewed_protected_drift_count,1);
  assert.equal(receipt.nonprotected_economic_drift_count,3);
  assert.equal(receipt.frozen_v4_census_proof_preserved,true);
  assert.equal(receipt.reviewed_deployment_reader_successor_bound,true);
  assert.equal(receipt.workflow_dispatch_contracts_bound,true);
  assert.equal(receipt.provider_source_blob_manifest_bound,true);
  assert.equal(receipt.provider_historical_commit_object_required,false);
  assert.equal(receipt.protected_parent_scope_manifest_bound,true);
  assert.equal(receipt.protected_parent_scope_delta_status_bound,true);
  assert.equal(receipt.protected_parent_historical_commit_object_required,false);
  assert.ok(Number.isSafeInteger(receipt.protected_parent_scope_row_count));
  assert.ok(receipt.protected_parent_scope_row_count>3);
  assert.equal(receipt.frozen_candidate_rederived_on_current_head,false);
  assert.equal(receipt.production_source_finality_authority_ready,false);
  assert.equal(receipt.public_presale_activation,false);
  assert.equal(receipt.funds_movement,false);
}
verify();
console.log("VOID_BUY_VOID_SOURCE_FINALITY_V7_DEPLOYMENT_RECEIPT_V3_LOCK_PLAN_V1_GREEN");
console.log("production_reader_descriptor_bound=true");
console.log("accepted_v3_lock_deliberately_stale_after_reader_repair=true");
console.log("v3_planner_hold_required=true");
console.log("separate_v4_candidate_lock_required=true");
console.log("service_mutation=false");
console.log("credential_wallet_signer_transaction_authority=false");
console.log("presale_activation=false");
console.log("funds_movement=false");
