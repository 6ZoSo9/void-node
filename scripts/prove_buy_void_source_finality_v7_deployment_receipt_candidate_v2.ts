#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildBuyVoidSourceFinalityV7DeploymentReceiptV1,
  inspectAcceptedEnforcementLockV1,
} from "../ops/precision/void_buy_void_source_finality_v7_deployment_receipt_install_v1.js";
import {
  classifyBuyVoidSourceFinalityDeploymentReceiptV7,
  inspectBuyVoidSourceFinalityReviewedSourceFilesV7,
} from "../src/economic/buy_void_source_finality_generation_provenance_v7.js";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const MARKER="VOID_BUY_VOID_SOURCE_FINALITY_V7_DEPLOYMENT_RECEIPT_CANDIDATE_V2";
const PARENT="89d5e9aea60f2702068ed0de041038d651401520";
const TARGET_COMMIT="3dc143bb16d7c1d1d5e0f674881cf12621818661";
const TARGET_TREE="21e7fae2d3dfeb6a918c11799ae6644c6ca70a64";
const TARGET_PARENT="b9d8ad7aec19592b104d47da4a496710d4fde8db";

const LOCK_PATH="ops/security/buy-void-enforcement-final-protected-v7-v2-lock-v5.json";
const LOCK_BLOB="3c341f2de794f0922d5d1af2d1574cee6450c0d5";
const CANDIDATE_PATH="ops/security/buy-void-enforcement-final-protected-v7-v2-candidate-v5.json";
const CANDIDATE_BLOB="ef9d39fb22f7d4225f6f8abe6bb84c1f11acb8bc";
const CANDIDATE_SET="ea6f7203779174302bd8f01219055dd5a126c8475e18dcb301e60e9a2481acbc";
const INVENTORY_SHA256="8fed6dc4bf5707123e720737fa5757ab3b62f2bf8cefa993eb56d43ff346198f";

const INSTALLER_PATH="ops/precision/void_buy_void_source_finality_v7_deployment_receipt_install_v1.ts";
const INSTALLER_BLOB="f2d5288d6c1b639df6d9dcb1c174046ec9287f3b";
const PROVENANCE_PATH="src/economic/buy_void_source_finality_generation_provenance_v7.ts";
const PROVENANCE_BLOB="390ff1a2ff0437cd8c8693e7807c12275df42573";
const REVIEWED_SOURCE_SHA256="18d63ea70fc3a7a4d0ce3d427205717e2c72c40eb145fe677eb4ab6e869acb24";
const REVIEWED_SOURCE_COUNT="10";
const EXPECTED_LOCK_SHA256="b043f8a4bb45fe1619fdf6ba393cd7d9e40b23461e625bfac9e8c6e12cd4d28c";
const EXPECTED_LOCK_ID="voidbenfl1_91f58f23fd9452a23491801d227c654971ab9d0f5149ccc65dec5363a18472ac";
const EXPECTED_RECEIPT_ID="voidbsfdep1_351215ea3296d4935a4ae845d8f975166a8da20723ce9a56f94d9f4c21f25244";
const EXPECTED_RECEIPT_SHA256="2990e9bdef4793cc02f1dc0d502c1854f321f40202774e1e94939be9248efba6";
const EXPECTED_RECEIPT_BYTES=1136;

const SELF="scripts/prove_buy_void_source_finality_v7_deployment_receipt_candidate_v2.ts";
const DOC="docs/architecture/buy-void-source-finality-v7-deployment-receipt-candidate-v2.md";
const WORKFLOW=".github/workflows/buy-void-source-finality-v7-deployment-receipt-candidate-v2.yml";
const OWNED=Object.freeze([WORKFLOW,DOC,SELF].sort());

const sha256=(bytes:Buffer)=>crypto.createHash("sha256").update(bytes).digest("hex");

function runGit(args:string[]):string{
  return execFileSync("/usr/bin/git",[
    "--no-replace-objects",
    "-c","core.hooksPath=/dev/null",
    "-c","core.fsmonitor=false",
    "-C",ROOT,
    ...args,
  ],{
    encoding:"utf8",
    env:{
      PATH:"/usr/bin:/bin",
      HOME:"/nonexistent",
      LANG:"C",
      LC_ALL:"C",
      TZ:"UTC",
      GIT_CONFIG_NOSYSTEM:"1",
      GIT_CONFIG_GLOBAL:"/dev/null",
      GIT_CONFIG_SYSTEM:"/dev/null",
      GIT_NO_REPLACE_OBJECTS:"1",
      GIT_OPTIONAL_LOCKS:"0",
      GIT_TERMINAL_PROMPT:"0",
      GIT_ASKPASS:"/bin/false",
    },
  }).trim();
}

function pin(relative:string,blob:string):void{
  assert.equal(runGit(["rev-parse","HEAD:"+relative]),blob,"blob_drift:"+relative);
}

function verifyScope():void{
  runGit(["merge-base","--is-ancestor",PARENT,"HEAD"]);
  assert.equal(runGit(["merge-base",PARENT,"HEAD"]),PARENT);
  const rows=runGit(["diff","--name-status",PARENT,"HEAD","--"])
    .split(/\n/u).filter(Boolean);
  assert.equal(rows.length,OWNED.length,"receipt_candidate_scope_count");
  const actual=rows.map(row=>{
    const match=row.match(/^A\t(.+)$/u);
    assert.ok(match,"receipt_candidate_scope_not_add_only:"+row);
    return match[1];
  }).sort();
  assert.deepEqual(actual,OWNED,"receipt_candidate_scope_paths");
  runGit(["diff","--check",PARENT,"HEAD"]);
  assert.equal(runGit(["status","--porcelain=v1","--untracked-files=all"]),"",
    "hosted_checkout_not_clean");
}

function derive(){
  verifyScope();
  pin(LOCK_PATH,LOCK_BLOB);
  pin(CANDIDATE_PATH,CANDIDATE_BLOB);
  pin(INSTALLER_PATH,INSTALLER_BLOB);
  pin(PROVENANCE_PATH,PROVENANCE_BLOB);

  assert.equal(runGit(["rev-parse",TARGET_COMMIT+"^{tree}"]),TARGET_TREE);
  assert.equal(
    runGit(["rev-list","--parents","-n","1",TARGET_COMMIT]),
    TARGET_COMMIT+" "+TARGET_PARENT,
  );
  runGit(["merge-base","--is-ancestor",TARGET_COMMIT,"HEAD"]);

  const lock=inspectAcceptedEnforcementLockV1(LOCK_PATH,ROOT);
  assert.equal(lock.path,LOCK_PATH);
  assert.equal(lock.accepted_enforcement_lock_git_blob_sha1,LOCK_BLOB);
  assert.equal(lock.accepted_enforcement_set_sha256,CANDIDATE_SET);
  assert.equal(lock.accepted_enforcement_lock_sha256,EXPECTED_LOCK_SHA256);
  assert.equal(lock.accepted_enforcement_lock_id,EXPECTED_LOCK_ID);
  assert.equal(lock.current_enforcement_tracked_source_inventory_verified,true);

  const sources=inspectBuyVoidSourceFinalityReviewedSourceFilesV7();
  assert.equal(sources.reviewed_source_file_count,REVIEWED_SOURCE_COUNT);
  assert.equal(sources.reviewed_source_files_sha256,REVIEWED_SOURCE_SHA256);

  const built=buildBuyVoidSourceFinalityV7DeploymentReceiptV1({
    process_source_commit:TARGET_COMMIT,
    process_source_tree:TARGET_TREE,
    accepted_enforcement_lock:lock,
  });
  assert.equal(built.reviewed_source_file_count,REVIEWED_SOURCE_COUNT);
  assert.equal(built.reviewed_source_files_sha256,REVIEWED_SOURCE_SHA256);
  assert.match(built.receipt_id,/^voidbsfdep1_[0-9a-f]{64}$/u);
  assert.equal(built.receipt.receipt_id,built.receipt_id);
  assert.equal(built.receipt_id,EXPECTED_RECEIPT_ID);
  assert.equal(sha256(built.bytes),EXPECTED_RECEIPT_SHA256);
  assert.equal(built.bytes.length,EXPECTED_RECEIPT_BYTES);
  assert.equal(built.receipt.process_source_commit,TARGET_COMMIT);
  assert.equal(built.receipt.process_source_tree,TARGET_TREE);
  assert.equal(built.receipt.process_source_branch,"main");
  assert.equal(built.receipt.accepted_enforcement_set_sha256,CANDIDATE_SET);
  assert.equal(built.receipt.candidate_enforcement_identity_accepted,true);
  assert.equal(built.receipt.complete_executable_closure_verified,true);

  const classified=classifyBuyVoidSourceFinalityDeploymentReceiptV7({
    receipt:built.receipt,
    process_source_identity:{
      marker:"VOID_NODE_PROCESS_SOURCE_IDENTITY_V1",
      commit:TARGET_COMMIT,
      tree:TARGET_TREE,
      branch:"main",
    },
    reviewed_source_files_sha256:REVIEWED_SOURCE_SHA256,
    reviewed_source_file_count:REVIEWED_SOURCE_COUNT,
  });
  assert.equal(classified.ok,true);
  assert.equal(classified.status,"deployment_generation_verified");
  assert.equal(classified.source_generation_verified,true);
  assert.equal(classified.deployed_artifact_generation_verified,true);

  const candidate=JSON.parse(
    execFileSync("/usr/bin/git",["-C",ROOT,"show","HEAD:"+CANDIDATE_PATH],{
      encoding:"utf8",
      env:{
        PATH:"/usr/bin:/bin",HOME:"/nonexistent",LANG:"C",LC_ALL:"C",TZ:"UTC",
        GIT_CONFIG_NOSYSTEM:"1",GIT_CONFIG_GLOBAL:"/dev/null",
        GIT_CONFIG_SYSTEM:"/dev/null",GIT_NO_REPLACE_OBJECTS:"1",
        GIT_OPTIONAL_LOCKS:"0",GIT_TERMINAL_PROMPT:"0",GIT_ASKPASS:"/bin/false",
      },
    }),
  );
  assert.equal(candidate.current_enforcement_tracked_source_inventory_sha256,INVENTORY_SHA256);
  assert.equal(candidate.candidate_enforcement_set_sha256,CANDIDATE_SET);
  assert.equal(candidate.candidate_enforcement_identity_accepted,false);

  return Object.freeze({
    bytes:built.bytes,
    receipt:built.receipt,
    receipt_id:built.receipt_id,
    receipt_sha256:sha256(built.bytes),
    receipt_bytes:built.bytes.length,
    accepted_enforcement_lock_id:lock.accepted_enforcement_lock_id,
    accepted_enforcement_lock_sha256:lock.accepted_enforcement_lock_sha256,
    accepted_enforcement_lock_git_blob_sha1:lock.accepted_enforcement_lock_git_blob_sha1,
  });
}

const args=process.argv.slice(2);
if(args.length===1&&args[0]==="--derive"){
  process.stdout.write(derive().bytes);
}else if(args.length===0||(args.length===1&&args[0]==="--self-test")){
  const value=derive();
  console.log(MARKER+"_GREEN");
  console.log("target_commit="+TARGET_COMMIT);
  console.log("target_tree="+TARGET_TREE);
  console.log("candidate_enforcement_set_sha256="+CANDIDATE_SET);
  console.log("accepted_enforcement_lock_git_blob_sha1="+value.accepted_enforcement_lock_git_blob_sha1);
  console.log("accepted_enforcement_lock_sha256="+value.accepted_enforcement_lock_sha256);
  console.log("accepted_enforcement_lock_id="+value.accepted_enforcement_lock_id);
  console.log("reviewed_source_files_sha256="+REVIEWED_SOURCE_SHA256);
  console.log("reviewed_source_file_count="+REVIEWED_SOURCE_COUNT);
  console.log("receipt_id="+value.receipt_id);
  console.log("receipt_sha256="+value.receipt_sha256);
  console.log("receipt_bytes="+String(value.receipt_bytes));
  console.log("in_memory_candidate_classifier_status=deployment_generation_verified");
  console.log("in_memory_candidate_source_generation_verified=true");
  console.log("in_memory_candidate_would_classify_deployed=true");
  console.log("actual_installed_deployment_generation_verified=false");
  console.log("source_authentication_scope=clean_hosted_checkout_candidate_only");
  console.log("hostile_worktree_independent_execution=false");
  console.log("privileged_or_offline_source_authentication_authority=false");
  console.log("receipt_install_called=false");
  console.log("filesystem_mutation=false");
  console.log("service_mutation=false");
  console.log("credential_wallet_signer_transaction_authority=false");
  console.log("presale_activation=false");
  console.log("funds_movement=false");
}else{
  throw Error("usage: "+SELF+" [--derive|--self-test]");
}