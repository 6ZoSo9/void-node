#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  VOID_BUY_VOID_SOURCE_FINALITY_DEPLOYMENT_RECEIPT_V1,
  buyVoidSourceFinalityDeploymentReceiptIdV7,
  buyVoidSourceFinalityEnforcementLockIdV7,
  inspectBuyVoidSourceFinalityReviewedSourceFilesV7,
} from "../../src/economic/buy_void_source_finality_generation_provenance_v7.js";

export const MARKER =
  "VOID_BUY_VOID_SOURCE_FINALITY_V7_DEPLOYMENT_RECEIPT_INSTALL_V1";
export const DEFAULT_RECEIPT_PATH =
  "/var/lib/void-source-finality-v7/deployment-receipt.json";
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const SHA40=/^[0-9a-f]{40}$/u;
const SHA256=/^[0-9a-f]{64}$/u;
const SAFE_LOCK_PATH=/^ops\/security\/[A-Za-z0-9._\/-]+\.json$/u;
const PROTECTED_DISPATCH_MARKER_V1="VOID_BUY_VOID_V7_PROTECTED_DISPATCH_V1";
const PROTECTED_NATIVE_PREENTRY_MARKER_V1="VOID_BUY_VOID_V7_NATIVE_PREENTRY_V1";
const PROTECTED_SOURCE_ROOT_V1="/opt/void-buy-void-v7-reviewed-v1";
const PROTECTED_TOOL_PATH_V1=
  "ops/precision/void_buy_void_source_finality_v7_deployment_receipt_install_v1.ts";

export const VOID_BUY_VOID_CURRENT_ENFORCEMENT_TRACKED_SOURCE_PATHS_V1=
  Object.freeze([
  "ops/precision/void_buy_void_source_finality_live_process_binding_v2_receipt_publish_v1.ts",
  "ops/precision/void_buy_void_source_finality_live_process_v2_collection_plan_v1.ts",
  "ops/precision/void_buy_void_source_finality_live_process_v2_selector_guard.c",
  "ops/precision/void_buy_void_source_finality_provider_pair_binding_receipt_install_v1.ts",
  "ops/precision/void_buy_void_source_finality_v7_deployment_receipt_install_v1.ts",
  "ops/precision/void_buy_void_source_finality_v7_native_preentry_v1.c",
  "ops/precision/void_buy_void_source_finality_v7_privileged_launcher_body_v2.bash",
  "ops/precision/void_buy_void_source_finality_v7_privileged_launcher_v1.sh",
  "ops/run-void-node-live-v1.sh",
  "ops/security/buy-void-v7-live-process-v2-selector-elf-lock-v1.json",
  "ops/security/reviewed-node-package-runtime-enforcement-post2865-v1.json",
  "package-lock.json",
  "package.json",
  "runtime/canonical-producer-self-http-guard-v4.cjs",
  "runtime/canonical-producer-source-custody-v1.cjs",
  "scripts/prove_void_buy_v7_privileged_launcher_package_runtime_v2.mjs",
  "src/economic/buy_void_auto_fulfillment_v1.ts",
  "src/economic/buy_void_broadcast_outcome_journal_v1.ts",
  "src/economic/buy_void_confirmed_state_journal_v1.ts",
  "src/economic/buy_void_crash_consistent_saga_server_policy_v1.ts",
  "src/economic/buy_void_delivery_runtime_integration_v1.ts",
  "src/economic/buy_void_delivery_sign_broadcast_adapter_v1.ts",
  "src/economic/buy_void_delivery_submission_guard_v1.ts",
  "src/economic/buy_void_erc20_delivery_receipt_reconciler_v1.ts",
  "src/economic/buy_void_erc20_execution_composition_v1.ts",
  "src/economic/buy_void_erc20_transaction_preparation_planner_v1.ts",
  "src/economic/buy_void_ethereum_public_checkout_finality_gate_v1.ts",
  "src/economic/buy_void_execution_attempt_journal_v1.ts",
  "src/economic/buy_void_filesystem_bakery_lock_v1.ts",
  "src/economic/buy_void_fulfillment_confirmation_v1.ts",
  "src/economic/buy_void_fulfillment_journal_v1.ts",
  "src/economic/buy_void_inventory_reservation_journal_v1.ts",
  "src/economic/buy_void_payment_rpc_observer_v1.ts",
  "src/economic/buy_void_pipeline_coordinator_v1.ts",
  "src/economic/buy_void_source_chain_finality_rpc_adapter_v1.ts",
  "src/economic/buy_void_source_finality_authenticated_composition_v3.ts",
  "src/economic/buy_void_source_finality_authority_v2.ts",
  "src/economic/buy_void_source_finality_execution_preflight_v1.ts",
  "src/economic/buy_void_source_finality_generation_provenance_v6.ts",
  "src/economic/buy_void_source_finality_generation_provenance_v7.ts",
  "src/economic/buy_void_source_finality_live_process_binding_v1.ts",
  "src/economic/buy_void_source_finality_live_process_binding_v2.ts",
  "src/economic/buy_void_source_finality_provider_pair_binding_v1.ts",
  "src/economic/buy_void_verified_payment_v2.ts",
  "src/index.ts",
  "tools/buy-void-crash-consistent-fulfillment-saga-v1.mjs",
  "tools/void-reviewed-node-package-runtime-v1.mjs",
  "tsconfig.build.json",
  "tsconfig.json",
  ] as const);

export type BuyVoidCurrentEnforcementTrackedSourceRowV1=Readonly<{
  path:string;
  git_blob_sha1:string;
  git_mode:"100644"|"100755";
}>;

function currentSourceBlobV1(bytes:Buffer):string{
  return crypto.createHash("sha1")
    .update(Buffer.from("blob "+String(bytes.length)+"\0","utf8"))
    .update(bytes).digest("hex");
}

const MAX_CURRENT_ENFORCEMENT_SOURCE_BYTES_V1=16*1024*1024;
const STABLE_FILE_STAT_FIELDS_V1=Object.freeze([
  "dev","ino","mode","nlink","uid","gid","rdev","size","mtimeMs","ctimeMs",
] as const);

function readBoundedRegularFileV1(
  absolute:string,
  relative:string,
  maxBytes:number,
  errorPrefix:string,
){
  assert.ok(Number.isSafeInteger(maxBytes)&&maxBytes>0&&
    maxBytes<Number.MAX_SAFE_INTEGER,
    errorPrefix+"_max_bytes_invalid:"+relative);
  const before=fs.lstatSync(absolute);
  assert.ok(before.isFile()&&!before.isSymbolicLink()&&before.nlink===1&&
    before.size>0&&before.size<=maxBytes,
    errorPrefix+"_shape_invalid:"+relative);
  const openConstants=fs.constants as typeof fs.constants & {
    O_NOFOLLOW?:number;
    O_NONBLOCK?:number;
  };
  const noFollow=openConstants.O_NOFOLLOW;
  const nonBlock=openConstants.O_NONBLOCK;
  if(typeof noFollow!=="number")throw Error(errorPrefix+"_nofollow_unavailable");
  if(typeof nonBlock!=="number")throw Error(errorPrefix+"_nonblock_unavailable");
  let fd=-1;
  try{
    fd=fs.openSync(absolute,fs.constants.O_RDONLY|noFollow|nonBlock);
    const opened=fs.fstatSync(fd);
    assert.ok(opened.isFile()&&opened.nlink===1&&opened.size>0&&
      opened.size<=maxBytes,
      errorPrefix+"_opened_shape_invalid:"+relative);
    for(const key of STABLE_FILE_STAT_FIELDS_V1){
      assert.equal(opened[key],before[key],
        errorPrefix+"_open_generation_mismatch:"+relative+":"+key);
    }
    const chunks:Buffer[]=[];
    const scratch=Buffer.alloc(Math.min(64*1024,maxBytes+1));
    let total=0;
    while(total<=maxBytes){
      const remaining=maxBytes+1-total;
      if(remaining<=0)break;
      const count=fs.readSync(
        fd,scratch,0,Math.min(scratch.length,remaining),null,
      );
      if(count===0)break;
      chunks.push(Buffer.from(scratch.subarray(0,count)));
      total+=count;
    }
    assert.ok(total<=maxBytes,
      errorPrefix+"_size_limit_exceeded:"+relative);
    assert.equal(total,opened.size,
      errorPrefix+"_short_or_grown_read:"+relative);
    const after=fs.fstatSync(fd);
    for(const key of STABLE_FILE_STAT_FIELDS_V1){
      assert.equal(after[key],opened[key],
        errorPrefix+"_descriptor_generation_changed:"+relative+":"+key);
    }
    const visible=fs.lstatSync(absolute);
    for(const key of STABLE_FILE_STAT_FIELDS_V1){
      assert.equal(visible[key],opened[key],
        errorPrefix+"_visible_generation_changed:"+relative+":"+key);
    }
    return Object.freeze({bytes:Buffer.concat(chunks,total),stat:opened});
  }finally{
    if(fd>=0)fs.closeSync(fd);
  }
}

function inspectCurrentTrackedSourceRowV1(
  repositoryRoot:string,
  relative:string,
):BuyVoidCurrentEnforcementTrackedSourceRowV1{
  assert.ok(
    (VOID_BUY_VOID_CURRENT_ENFORCEMENT_TRACKED_SOURCE_PATHS_V1 as readonly string[])
      .includes(relative),
    "current_enforcement_source_path_not_required:"+relative,
  );
  const absolute=path.join(repositoryRoot,...relative.split("/"));
  const stable=readBoundedRegularFileV1(
    absolute,relative,MAX_CURRENT_ENFORCEMENT_SOURCE_BYTES_V1,
    "current_enforcement_source",
  );
  const visibleBlob=currentSourceBlobV1(stable.bytes);
  const headBlob=git(repositoryRoot,["rev-parse","--verify","HEAD:"+relative]);
  assert.equal(visibleBlob,headBlob,
    "current_enforcement_source_worktree_blob_mismatch:"+relative);
  const entry=git(repositoryRoot,["ls-tree","HEAD","--",relative]);
  const match=entry.match(/^(100644|100755) blob ([0-9a-f]{40})\t(.+)$/u);
  assert.ok(match,"current_enforcement_source_tree_entry_invalid:"+relative);
  assert.equal(match[2],headBlob,
    "current_enforcement_source_tree_blob_mismatch:"+relative);
  assert.equal(match[3],relative,
    "current_enforcement_source_tree_path_mismatch:"+relative);
  const visibleMode:(("100644"|"100755"))=
    (stable.stat.mode&0o111)!==0?"100755":"100644";
  assert.equal(visibleMode,match[1],
    "current_enforcement_source_worktree_mode_mismatch:"+relative);
  return Object.freeze({
    path:relative,
    git_blob_sha1:headBlob,
    git_mode:visibleMode,
  });
}

export function inspectBuyVoidCurrentEnforcementTrackedSourceInventoryV1(
  repositoryRoot:string=ROOT,
):readonly BuyVoidCurrentEnforcementTrackedSourceRowV1[]{
  return Object.freeze(
    VOID_BUY_VOID_CURRENT_ENFORCEMENT_TRACKED_SOURCE_PATHS_V1.map(
      relative=>inspectCurrentTrackedSourceRowV1(repositoryRoot,relative),
    ),
  );
}

export function assertBuyVoidCandidateCurrentEnforcementTrackedSourceInventoryV1(
  candidate:unknown,
  repositoryRoot:string=ROOT,
):void{
  assert.ok(candidate&&typeof candidate==="object"&&!Array.isArray(candidate),
    "accepted_enforcement_candidate_object_required");
  const rows=(candidate as any).current_enforcement_tracked_source_inventory_v1;
  assert.ok(Array.isArray(rows),
    "accepted_enforcement_candidate_current_source_inventory_missing");
  const current=inspectBuyVoidCurrentEnforcementTrackedSourceInventoryV1(
    repositoryRoot,
  );
  assert.equal(rows.length,current.length,
    "accepted_enforcement_candidate_current_source_inventory_count_mismatch");
  for(let index=0;index<current.length;index+=1){
    const row=rows[index];
    assert.ok(row&&typeof row==="object"&&!Array.isArray(row),
      "accepted_enforcement_candidate_current_source_inventory_row_invalid");
    assert.deepEqual(
      Object.keys(row).sort(),
      ["git_blob_sha1","git_mode","path"],
      "accepted_enforcement_candidate_current_source_inventory_row_shape",
    );
    assert.deepEqual(
      row,
      current[index],
      "accepted_enforcement_candidate_current_source_inventory_mismatch:"+
        current[index].path,
    );
  }
}

function git(repositoryRoot:string,args:string[]):string{
  const root=path.resolve(repositoryRoot);
  assert.equal(root,repositoryRoot,"repository_root_not_canonical");
  return execFileSync("/usr/bin/git",[
    "--no-replace-objects",
    "-c","core.hooksPath=/dev/null",
    "-c","core.attributesFile=/dev/null",
    "-c","core.fsmonitor=false",
    "-c","core.untrackedCache=false",
    "-c","core.preloadIndex=false",
    "-c","submodule.recurse=false",
    "-c","safe.directory="+root,
    "-C",root,
    ...args,
  ],{
    encoding:"utf8",
    timeout:15_000,
    maxBuffer:1024*1024,
    stdio:["ignore","pipe","pipe"],
    env:{
      PATH:"/usr/bin:/bin",
      HOME:"/nonexistent",
      LANG:"C",
      LC_ALL:"C",
      TZ:"UTC",
      GIT_CONFIG_NOSYSTEM:"1",
      GIT_CONFIG_GLOBAL:"/dev/null",
      GIT_CONFIG_SYSTEM:"/dev/null",
      GIT_OPTIONAL_LOCKS:"0",
      GIT_NO_REPLACE_OBJECTS:"1",
      GIT_TERMINAL_PROMPT:"0",
    },
  }).trim();
}

function assertProtectedSourceRootCustodyV1(root:string):void{
  let cursor=root;
  for(;;){
    const st=fs.lstatSync(cursor);
    assert.ok(st.isDirectory()&&!st.isSymbolicLink(),
      "protected_dispatch_source_ancestor_not_directory:"+cursor);
    assert.equal(st.uid,0,"protected_dispatch_source_ancestor_not_root_owned:"+cursor);
    assert.equal(st.mode&0o022,0,
      "protected_dispatch_source_ancestor_group_or_world_writable:"+cursor);
    if(cursor==="/")break;
    const next=path.dirname(cursor);
    assert.notEqual(next,cursor,"protected_dispatch_source_ancestor_walk_stalled");
    cursor=next;
  }
}

export function assertBuyVoidV7ProtectedDispatchAdmissionV1(
  expectedToolPath:string,
  repositoryRoot:string=ROOT,
):void{
  assert.equal(
    process.env.VOID_BUY_VOID_V7_PROTECTED_DISPATCH,
    PROTECTED_DISPATCH_MARKER_V1,
    "protected_dispatch_context_required",
  );
  assert.equal(
    process.env.VOID_BUY_VOID_V7_NATIVE_PREENTRY,
    PROTECTED_NATIVE_PREENTRY_MARKER_V1,
    "protected_dispatch_native_preentry_required",
  );
  assert.ok(
    typeof process.getuid==="function"&&process.getuid()===0,
    "protected_dispatch_root_required",
  );
  const dispatchPid=Number(process.env.VOID_BUY_VOID_V7_PROTECTED_DISPATCH_PID||"");
  assert.ok(
    Number.isSafeInteger(dispatchPid)&&dispatchPid>0&&dispatchPid===process.pid,
    "protected_dispatch_process_identity_mismatch",
  );
  const root=path.resolve(repositoryRoot);
  assert.equal(root,repositoryRoot,"protected_dispatch_repository_root_not_canonical");
  assert.equal(root,PROTECTED_SOURCE_ROOT_V1,"protected_dispatch_source_root_mismatch");
  assert.equal(fs.realpathSync.native(root),root,"protected_dispatch_source_root_alias");
  assertProtectedSourceRootCustodyV1(root);
  const commit=git(root,["rev-parse","--verify","HEAD^{commit}"]).toLowerCase();
  const tree=git(root,["rev-parse","--verify","HEAD^{tree}"]).toLowerCase();
  const branch=git(root,["symbolic-ref","--short","-q","HEAD"]);
  const status=git(root,["status","--porcelain=v1","--untracked-files=all"]);
  assert.equal(
    process.env.VOID_BUY_VOID_V7_PROTECTED_SOURCE_ROOT,
    root,
    "protected_dispatch_source_root_binding_mismatch",
  );
  assert.equal(
    process.env.VOID_BUY_VOID_V7_PROTECTED_SOURCE_COMMIT,
    commit,
    "protected_dispatch_source_commit_mismatch",
  );
  assert.equal(
    process.env.VOID_BUY_VOID_V7_PROTECTED_SOURCE_TREE,
    tree,
    "protected_dispatch_source_tree_mismatch",
  );
  assert.equal(branch,"main","protected_dispatch_source_branch_mismatch");
  assert.equal(status,"","protected_dispatch_source_tree_dirty");
  assert.equal(expectedToolPath,"ops/precision/void_buy_void_source_finality_v7_deployment_receipt_install_v1.ts","protected_dispatch_tool_contract_mismatch");
  assert.equal(
    process.env.VOID_BUY_VOID_V7_PROTECTED_TOOL_PATH,
    expectedToolPath,
    "protected_dispatch_tool_path_mismatch",
  );
  const toolAbsolute=path.join(root,...expectedToolPath.split("/"));
  assert.equal(
    fs.realpathSync.native(toolAbsolute),
    toolAbsolute,
    "protected_dispatch_tool_path_alias",
  );
  const toolStat=fs.lstatSync(toolAbsolute);
  assert.ok(
    toolStat.isFile()&&!toolStat.isSymbolicLink()&&toolStat.nlink===1&&
    toolStat.uid===0&&(toolStat.mode&0o022)===0,
    "protected_dispatch_tool_custody_invalid",
  );
  const invoked=path.resolve(String(process.argv[1]||""));
  assert.equal(
    fs.realpathSync.native(invoked),
    toolAbsolute,
    "protected_dispatch_invoked_tool_mismatch",
  );
  const trackedBlob=git(root,["rev-parse","--verify","HEAD:"+expectedToolPath]);
  const visibleBlob=git(root,["hash-object","--",expectedToolPath]);
  assert.equal(visibleBlob,trackedBlob,"protected_dispatch_tool_worktree_blob_mismatch");
  assert.equal(
    process.env.VOID_BUY_VOID_V7_PROTECTED_TOOL_GIT_BLOB_SHA1,
    trackedBlob,
    "protected_dispatch_tool_blob_binding_mismatch",
  );
}

export function inspectRepositoryIdentityV1(repositoryRoot:string=ROOT){
  const commit=git(repositoryRoot,["rev-parse","--verify","HEAD^{commit}"]).toLowerCase();
  const tree=git(repositoryRoot,["rev-parse","--verify","HEAD^{tree}"]).toLowerCase();
  const branch=git(repositoryRoot,["symbolic-ref","--short","-q","HEAD"]);
  const status=git(repositoryRoot,["status","--porcelain=v1"]);
  assert.match(commit,SHA40,"repository_commit_invalid");
  assert.match(tree,SHA40,"repository_tree_invalid");
  assert.equal(branch,"main","repository_branch_not_main");
  assert.equal(status,"","repository_not_clean");
  return Object.freeze({commit,tree,branch:"main" as const});
}

const sha256=(bytes:Buffer)=>crypto.createHash("sha256").update(bytes).digest("hex");
const gitBlobSha1=(bytes:Buffer)=>crypto.createHash("sha1")
  .update(Buffer.from("blob "+String(bytes.length)+"\0","utf8"))
  .update(bytes).digest("hex");

export function readTrackedFileV1(
  repositoryRoot:string,
  relative:string,
  maxBytes=1024*1024,
){
  assert.match(relative,SAFE_LOCK_PATH,"accepted_enforcement_lock_path_invalid");
  assert.equal(path.posix.normalize(relative),relative,
    "accepted_enforcement_lock_path_not_normalized");
  assert.equal(relative.split("/").includes(".."),false,
    "accepted_enforcement_lock_path_escape");
  const absolute=path.join(repositoryRoot,...relative.split("/"));
  const stable=readBoundedRegularFileV1(
    absolute,relative,maxBytes,"accepted_enforcement_file",
  );
  const blob=gitBlobSha1(stable.bytes);
  assert.equal(git(repositoryRoot,["rev-parse","HEAD:"+relative]),blob,
    "accepted_enforcement_file_not_exact_head");
  return Object.freeze({
    bytes:stable.bytes,
    git_blob_sha1:blob,
    sha256:sha256(stable.bytes),
  });
}

export function inspectAcceptedEnforcementLockV1(
  relativePath:string,
  repositoryRoot:string=ROOT,
){
  const lockFile=readTrackedFileV1(repositoryRoot,relativePath,256*1024);
  const lock=JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(lockFile.bytes));
  assert.equal(lock?.repository,"6ZoSo9/void-node","accepted_enforcement_lock_repository_invalid");
  assert.match(String(lock?.candidate_head||""),SHA40,
    "accepted_enforcement_lock_candidate_head_invalid");
  assert.equal(lock?.complete_executable_closure_verified,true,
    "accepted_enforcement_lock_closure_not_verified");
  assert.equal(lock?.candidate_enforcement_identity_accepted,true,
    "accepted_enforcement_lock_not_accepted");
  for(const key of [
    "deployed_artifact_generation_verified","runtime_mount_authority",
    "production_source_finality_authority_ready","public_presale_activation",
    "funds_movement",
  ])assert.equal(lock?.[key],false,"accepted_enforcement_lock_authority_overclaim:"+key);

  const evidence=lock?.candidate_evidence;
  assert.ok(evidence&&typeof evidence==="object"&&!Array.isArray(evidence),
    "accepted_enforcement_candidate_evidence_missing");
  const set=String(evidence.candidate_enforcement_set_sha256||"").toLowerCase();
  assert.match(set,SHA256,"accepted_enforcement_set_invalid");
  const candidatePath=String(evidence.path||"");
  const candidateFile=readTrackedFileV1(repositoryRoot,candidatePath,1024*1024);
  assert.equal(candidateFile.bytes.length,evidence.bytes,
    "accepted_enforcement_candidate_bytes_mismatch");
  assert.equal(candidateFile.sha256,evidence.sha256,
    "accepted_enforcement_candidate_sha256_mismatch");
  assert.equal(candidateFile.git_blob_sha1,evidence.git_blob_sha1,
    "accepted_enforcement_candidate_git_blob_mismatch");
  const candidate=JSON.parse(
    new TextDecoder("utf-8",{fatal:true}).decode(candidateFile.bytes),
  );
  assert.equal(candidate?.candidate_enforcement_set_sha256,set,
    "accepted_enforcement_candidate_set_mismatch");
  assert.equal(candidate?.complete_executable_closure_verified,true,
    "accepted_enforcement_candidate_closure_not_verified");
  assert.equal(candidate?.candidate_enforcement_identity_accepted,false,
    "accepted_enforcement_candidate_must_be_unaccepted");
  assertBuyVoidCandidateCurrentEnforcementTrackedSourceInventoryV1(
    candidate,
    repositoryRoot,
  );

  const accepted_enforcement_lock_id=buyVoidSourceFinalityEnforcementLockIdV7({
    accepted_enforcement_set_sha256:set,
    accepted_enforcement_lock_git_blob_sha1:lockFile.git_blob_sha1,
    accepted_enforcement_lock_sha256:lockFile.sha256,
  });
  return Object.freeze({
    path:relativePath,
    accepted_enforcement_set_sha256:set,
    accepted_enforcement_lock_git_blob_sha1:lockFile.git_blob_sha1,
    accepted_enforcement_lock_sha256:lockFile.sha256,
    accepted_enforcement_lock_id,
    current_enforcement_tracked_source_inventory_verified:true as const,
  });
}

export function buildBuyVoidSourceFinalityV7DeploymentReceiptV1(input:{
  process_source_commit:string;
  process_source_tree:string;
  accepted_enforcement_lock:Readonly<{
    accepted_enforcement_set_sha256:string;
    accepted_enforcement_lock_git_blob_sha1:string;
    accepted_enforcement_lock_sha256:string;
    accepted_enforcement_lock_id:string;
    current_enforcement_tracked_source_inventory_verified:true;
  }>;
}){
  const commit=String(input.process_source_commit||"").trim().toLowerCase();
  const tree=String(input.process_source_tree||"").trim().toLowerCase();
  assert.match(commit,SHA40,"process_source_commit_invalid");
  assert.match(tree,SHA40,"process_source_tree_invalid");
  const sources=inspectBuyVoidSourceFinalityReviewedSourceFilesV7();
  const lock=input.accepted_enforcement_lock;
  assert.match(lock.accepted_enforcement_set_sha256,SHA256,
    "accepted_enforcement_set_invalid");
  assert.match(lock.accepted_enforcement_lock_git_blob_sha1,SHA40,
    "accepted_enforcement_lock_git_blob_invalid");
  assert.match(lock.accepted_enforcement_lock_sha256,SHA256,
    "accepted_enforcement_lock_sha256_invalid");
  assert.equal(
    lock.accepted_enforcement_lock_id,
    buyVoidSourceFinalityEnforcementLockIdV7(lock),
    "accepted_enforcement_lock_id_invalid",
  );
  assert.equal(
    lock.current_enforcement_tracked_source_inventory_verified,
    true,
    "accepted_enforcement_current_source_inventory_not_verified",
  );
  const body={
    accepted_enforcement_lock_git_blob_sha1:
      lock.accepted_enforcement_lock_git_blob_sha1,
    accepted_enforcement_lock_id:lock.accepted_enforcement_lock_id,
    accepted_enforcement_lock_sha256:lock.accepted_enforcement_lock_sha256,
    accepted_enforcement_set_sha256:lock.accepted_enforcement_set_sha256,
    candidate_enforcement_identity_accepted:true,
    complete_executable_closure_verified:true,
    marker:VOID_BUY_VOID_SOURCE_FINALITY_DEPLOYMENT_RECEIPT_V1,
    process_source_branch:"main",
    process_source_commit:commit,
    process_source_marker:"VOID_NODE_PROCESS_SOURCE_IDENTITY_V1",
    process_source_tree:tree,
    reviewed_source_file_count:sources.reviewed_source_file_count,
    reviewed_source_files_sha256:sources.reviewed_source_files_sha256,
    status:"DEPLOYED_SOURCE_FINALITY_GENERATION_ACCEPTED",
    version:1,
  };
  const receipt_id=buyVoidSourceFinalityDeploymentReceiptIdV7(body);
  const receipt=Object.freeze({...body,receipt_id});
  const bytes=Buffer.from(JSON.stringify(receipt,null,2)+"\n","utf8");
  assert.ok(bytes.length>0&&bytes.length<=64*1024,"receipt_size_invalid");
  return Object.freeze({
    receipt,
    bytes,
    reviewed_source_files_sha256:sources.reviewed_source_files_sha256,
    reviewed_source_file_count:sources.reviewed_source_file_count,
    receipt_id,
  });
}

function validateRootAncestorsV1(absolute:string){
  let current=path.dirname(absolute);
  for(;;){
    const st=fs.lstatSync(current);
    assert.ok(st.isDirectory()&&!st.isSymbolicLink(),
      "receipt_ancestor_not_direct_directory:"+current);
    assert.equal(st.uid,0,"receipt_ancestor_not_root_owned:"+current);
    assert.equal(st.mode&0o022,0,"receipt_ancestor_group_or_world_writable:"+current);
    if(current==="/")break;
    const parent=path.dirname(current);
    assert.notEqual(parent,current,"receipt_ancestor_walk_stalled");
    current=parent;
  }
}

function verifyFinalV1(absolute:string,expected:Buffer){
  const st=fs.lstatSync(absolute);
  assert.ok(st.isFile()&&!st.isSymbolicLink(),"receipt_leaf_not_regular");
  assert.equal(st.uid,0,"receipt_leaf_not_root_owned");
  assert.equal(st.nlink,1,"receipt_leaf_link_count_invalid");
  assert.equal(st.mode&0o777,0o444,"receipt_leaf_mode_invalid");
  const got=fs.readFileSync(absolute);
  assert.ok(got.equals(expected),"receipt_leaf_bytes_mismatch");
}

export function installRootCustodiedReceiptV1(input:{
  absolute_path:string;
  bytes:Buffer;
}):Readonly<{created:boolean;already_matching:boolean}>{
  if(process.platform!=="linux")throw Error("linux_required");
  if(typeof process.getuid!=="function"||process.getuid()!==0)
    throw Error("root_required_for_deployment_receipt_install");
  const absolute=path.resolve(input.absolute_path);
  assert.equal(absolute,input.absolute_path,"receipt_path_not_canonical");
  assert.ok(path.isAbsolute(absolute),"receipt_path_not_absolute");
  assert.ok(Buffer.isBuffer(input.bytes)&&input.bytes.length>0&&
    input.bytes.length<=64*1024,"receipt_bytes_invalid");

  const parent=path.dirname(absolute);
  fs.mkdirSync(parent,{recursive:true,mode:0o755});
  fs.chownSync(parent,0,0);
  fs.chmodSync(parent,0o755);
  validateRootAncestorsV1(absolute);

  if(fs.existsSync(absolute)){
    verifyFinalV1(absolute,input.bytes);
    return Object.freeze({created:false,already_matching:true});
  }

  const leaf=path.basename(absolute);
  assert.match(leaf,/^[A-Za-z0-9._-]{3,120}$/u,"receipt_leaf_name_invalid");
  const temp=path.join(parent,
    "."+leaf+".tmp-"+String(process.pid)+"-"+String(Date.now()));
  let fd=-1;
  try{
    fd=fs.openSync(temp,
      fs.constants.O_WRONLY|fs.constants.O_CREAT|fs.constants.O_EXCL|
        fs.constants.O_NOFOLLOW,
      0o600);
    let offset=0;
    while(offset<input.bytes.length){
      const written=fs.writeSync(fd,input.bytes,offset,input.bytes.length-offset,offset);
      assert.ok(written>0,"receipt_short_write");
      offset+=written;
    }
    fs.fsyncSync(fd);
    fs.fchmodSync(fd,0o444);
    fs.fsyncSync(fd);
    fs.closeSync(fd); fd=-1;

    try{
      fs.linkSync(temp,absolute);
    }catch(error:any){
      if(error?.code!=="EEXIST")throw error;
      verifyFinalV1(absolute,input.bytes);
      fs.unlinkSync(temp);
      const dirFd=fs.openSync(parent,fs.constants.O_RDONLY|fs.constants.O_DIRECTORY);
      try{fs.fsyncSync(dirFd);}finally{fs.closeSync(dirFd);}
      return Object.freeze({created:false,already_matching:true});
    }
    fs.unlinkSync(temp);
    const dirFd=fs.openSync(parent,fs.constants.O_RDONLY|fs.constants.O_DIRECTORY);
    try{fs.fsyncSync(dirFd);}finally{fs.closeSync(dirFd);}
    verifyFinalV1(absolute,input.bytes);
    return Object.freeze({created:true,already_matching:false});
  }finally{
    if(fd>=0)fs.closeSync(fd);
    if(fs.existsSync(temp))fs.unlinkSync(temp);
  }
}

function parseArgs(argv:string[]){
  const out={
    mode:"" as "--plan"|"--apply"|"",
    expected_commit:"",
    expected_tree:"",
    receipt_path:DEFAULT_RECEIPT_PATH,
    accepted_enforcement_lock_path:"",
    confirm:false,
  };
  for(let i=0;i<argv.length;i+=1){
    const a=argv[i];
    if(a==="--plan"||a==="--apply")out.mode=a;
    else if(a==="--expected-commit")out.expected_commit=String(argv[++i]||"");
    else if(a==="--expected-tree")out.expected_tree=String(argv[++i]||"");
    else if(a==="--receipt-path")out.receipt_path=String(argv[++i]||"");
    else if(a==="--accepted-enforcement-lock-path")
      out.accepted_enforcement_lock_path=String(argv[++i]||"");
    else if(a==="--confirm-create-v7-deployment-receipt")out.confirm=true;
    else throw Error("unknown_argument:"+a);
  }
  assert.ok(out.mode,"mode_required");
  assert.match(out.expected_commit,SHA40,"expected_commit_required");
  assert.match(out.expected_tree,SHA40,"expected_tree_required");
  assert.match(out.accepted_enforcement_lock_path,SAFE_LOCK_PATH,
    "accepted_enforcement_lock_path_required");
  return out;
}

function main(){
  const args=parseArgs(process.argv.slice(2));
  if(args.mode==="--apply"){
    assertBuyVoidV7ProtectedDispatchAdmissionV1(PROTECTED_TOOL_PATH_V1);
  }
  const repo=inspectRepositoryIdentityV1();
  assert.equal(repo.commit,args.expected_commit,"expected_commit_mismatch");
  assert.equal(repo.tree,args.expected_tree,"expected_tree_mismatch");
  const acceptedLock=inspectAcceptedEnforcementLockV1(
    args.accepted_enforcement_lock_path,
  );
  const built=buildBuyVoidSourceFinalityV7DeploymentReceiptV1({
    process_source_commit:repo.commit,
    process_source_tree:repo.tree,
    accepted_enforcement_lock:acceptedLock,
  });

  console.log("marker="+MARKER);
  console.log("mode="+args.mode);
  console.log("source_mutation=false");
  console.log("service_mutation=false");
  console.log("credential_access=false");
  console.log("wallet_access=false");
  console.log("signing=false");
  console.log("transaction_broadcast=false");
  console.log("chain2050_mutation=false");
  console.log("presale_activation=false");
  console.log("funds_movement=false");
  console.log("process_source_commit="+repo.commit);
  console.log("process_source_tree="+repo.tree);
  console.log("reviewed_source_file_count="+built.reviewed_source_file_count);
  console.log("reviewed_source_files_sha256="+built.reviewed_source_files_sha256);
  console.log("accepted_enforcement_lock_path="+acceptedLock.path);
  console.log("accepted_enforcement_lock_id="+
    acceptedLock.accepted_enforcement_lock_id);
  console.log("accepted_enforcement_lock_git_blob_sha1="+
    acceptedLock.accepted_enforcement_lock_git_blob_sha1);
  console.log("accepted_enforcement_lock_sha256="+
    acceptedLock.accepted_enforcement_lock_sha256);
  console.log("accepted_enforcement_set_sha256="+
    acceptedLock.accepted_enforcement_set_sha256);
  console.log("receipt_id="+built.receipt_id);
  console.log("receipt_path="+args.receipt_path);

  if(args.mode==="--plan"){
    console.log("filesystem_mutation=false");
    console.log("status=PLAN_GREEN");
    return;
  }
  if(!args.confirm)throw Error("explicit_receipt_create_confirmation_required");
  assert.equal(path.resolve(args.receipt_path),DEFAULT_RECEIPT_PATH,
    "production_receipt_path_must_be_default");
  const result=installRootCustodiedReceiptV1({
    absolute_path:DEFAULT_RECEIPT_PATH,
    bytes:built.bytes,
  });
  console.log("filesystem_mutation="+String(result.created));
  console.log("receipt_created="+String(result.created));
  console.log("receipt_already_matching="+String(result.already_matching));
  console.log("status=DEPLOYMENT_RECEIPT_INSTALLED_GREEN");
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{main();}catch(error:any){
    console.error("marker="+MARKER+"_HOLD");
    console.error("reason="+String(error?.message||error));
    process.exitCode=2;
  }
}
