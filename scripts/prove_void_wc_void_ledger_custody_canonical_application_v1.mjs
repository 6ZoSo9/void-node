#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  VOID_WC_VOID_LEDGER_PERSISTENCE_AUTHORITY_V1,
  VOID_WC_VOID_LEDGER_PERSISTENCE_V1,
} from "../tools/void-wc-void-ledger-persistence-v1.mjs";
import {
  wcVoidLedgerPersistenceReviewBindingIdV1,
} from "../tools/void-wc-void-ledger-persistence-import-v1.mjs";
import {
  VOID_WC_VOID_OPENING_SETTLEMENT_ADAPTER_ID_V1,
} from "../tools/void-wc-void-coupled-opening-v1.mjs";
import {
  buildVoidWcVoidLedgerCustodyCoupledCandidatePromotionV1,
} from "../tools/void-wc-void-ledger-custody-coupled-candidate-promotion-v1.mjs";
import {
  VOID_WC_VOID_LEDGER_CUSTODY_CANONICAL_APPLICATION_AUTHORITY_V1,
  VOID_WC_VOID_LEDGER_CUSTODY_CANONICAL_APPLICATION_PLAN_V1,
  makeVoidWcVoidLedgerCustodyReviewedTreeReadOnlyV1,
  makeVoidWcVoidLedgerCustodyReviewedTreeRemovableV1,
  _internal,
  prepareVoidWcVoidLedgerCustodyCanonicalApplicationV1,
  verifyVoidWcVoidLedgerCustodyCanonicalApplicationStateV1,
  verifyVoidWcVoidLedgerCustodyCanonicalApplicationV1,
} from "../tools/void-wc-void-ledger-custody-canonical-application-v1.mjs";

const PRODUCTION="ops/mainnet0/wc-void-production-candidate-v1.json";
const COUPLED="ops/mainnet0/coupled-economic-successor-gate-candidate-v1.json";
const SUCCESSOR="ops/mainnet0/economic-evm-successor-migration-candidate-v1.json";
const REVIEWED_RUNTIME_PROFILE=JSON.parse(
  fs.readFileSync(
    "ops/security/reviewed-node-package-runtime-ethers-v1.json",
    "utf8",
  ),
);
const REVIEWED_MODULES=Object.freeze([
  "tools/void-coupled-economic-successor-gate-v1.mjs",
  "tools/void-economic-evm-successor-migration-v1.mjs",
  "tools/void-economic-intent-ttl-caps-policy-v1.mjs",
  "tools/void-economic-system-sponsored-anti-grief-policy-contract-v1.mjs",
  "tools/void-shared-market-post-discovery-state-v2.mjs",
  "tools/void-wc-void-coupled-opening-v1.mjs",
  "tools/void-wc-void-ledger-custody-coupled-candidate-promotion-v1.mjs",
  "tools/void-wc-void-ledger-persistence-import-v1.mjs",
  "tools/void-wc-void-ledger-persistence-v1.mjs",
  "tools/void-wc-void-market-vault-compiled-identity-acceptance-v1.mjs",
  "tools/void-wc-void-market-vault-compiler-identity-v1.mjs",
  "tools/void-wc-void-opening-concentration-sybil-policy-contract-v1.mjs",
  "tools/void-wc-void-opening-minimum-real-wc-depth-policy-contract-v1.mjs",
  "tools/void-wc-void-opening-nonproduction-exclusion-v1.mjs",
  "tools/void-wc-void-opening-participant-provenance-eligibility-v1.mjs",
  "tools/void-wc-void-opening-settlement-adapter-review-v1.mjs",
  "tools/void-wc-void-production-readiness-v1.mjs",
  "tools/void-wc-void-public-quote-disclosure-v1.mjs",
  "tools/void-wc-void-reverse-settlement-v1.mjs",
]);

function gitRun(args,{allowFail=false}={}){
  const result=spawnSync(
    "/usr/bin/git",
    [
      "--no-replace-objects",
      "-c","core.fsmonitor=false",
      "-c","core.hooksPath=/dev/null",
      "-c","core.attributesFile=/dev/null",
      "-c","core.untrackedCache=false",
      "-c","core.preloadIndex=false",
      "-c","submodule.recurse=false",
      "-C",process.cwd(),
      ...args,
    ],
    {
      encoding:"utf8",
      env:{
        PATH:"/usr/bin:/bin",
        LANG:"C",
        LC_ALL:"C",
        HOME:"/nonexistent",
        XDG_CONFIG_HOME:"/nonexistent",
        GIT_CONFIG_NOSYSTEM:"1",
        GIT_CONFIG_GLOBAL:"/dev/null",
        GIT_CONFIG_SYSTEM:"/dev/null",
        GIT_ATTR_NOSYSTEM:"1",
        GIT_OPTIONAL_LOCKS:"0",
        GIT_TERMINAL_PROMPT:"0",
        GIT_NO_REPLACE_OBJECTS:"1",
      },
      stdio:["ignore","pipe","pipe"],
    },
  );
  if(!allowFail) assert.equal(result.status,0,result.stderr||result.stdout);
  return result;
}
function git(...args){
  return String(gitRun(args).stdout||"").trim();
}
function sha256(bytes){
  return crypto.createHash("sha256").update(bytes).digest("hex");
}
function prettyBytes(value){
  return Buffer.from(JSON.stringify(value,null,2)+"\n","utf8");
}
function prettySha(value){return sha256(prettyBytes(value));}
function clone(value){return structuredClone(value);}

const productionBytes=fs.readFileSync(PRODUCTION);
const coupledBytes=fs.readFileSync(COUPLED);
const successorBytes=fs.readFileSync(SUCCESSOR);
const production=JSON.parse(productionBytes.toString("utf8"));
const coupled=JSON.parse(coupledBytes.toString("utf8"));
const successor=JSON.parse(successorBytes.toString("utf8"));
const head=git("rev-parse","HEAD");
const tree=git("rev-parse","HEAD^{tree}");
const launchId=coupled.shared_post_discovery_reconciliation.coupled_launch_id;

function importInput(){
  const receipt={
    ok:true,
    status:"PERSISTENCE_VERIFIED",
    marker:VOID_WC_VOID_LEDGER_PERSISTENCE_V1,
    version:1,
    coupled_launch_id:launchId,
    settlement_adapter_id:VOID_WC_VOID_OPENING_SETTLEMENT_ADAPTER_ID_V1,
    prestate_bytes:"0",
    observed_file_size_bytes:"4096",
    append_window_bytes:"512",
    append_window_sha256:"a".repeat(64),
    append_line_count:2,
    opening_settlement_line_count:1,
    expected_settlement_count:1,
    settlement_set_root:"sha256:"+"b".repeat(64),
    total_settled_wc_units:"25",
    exact_expected_settlement_set_present:true,
    no_extra_opening_settlement_in_window:true,
    canonical_ledger_direct_file:true,
    canonical_ledger_realpath_exact:true,
    canonical_ledger_owner_bound:true,
    canonical_ledger_not_group_or_world_writable:true,
    prestate_line_boundary_verified:true,
    stable_file_identity_during_read:true,
    stable_parent_directory_identity_during_read:true,
    ledger_persistence_verified:true,
    quote_reserve_custody_verified:true,
    ledger_write_performed:false,
    wc_balance_mutation_performed:false,
    market_activation_authority:false,
    inventory_funding_authority:false,
    public_presale_activation_authority:false,
    funds_movement_authority:false,
    authority:clone(VOID_WC_VOID_LEDGER_PERSISTENCE_AUTHORITY_V1),
  };
  const expected={
    coupled_launch_id:launchId,
    settlement_adapter_id:VOID_WC_VOID_OPENING_SETTLEMENT_ADAPTER_ID_V1,
    prestate_bytes:"0",
    settlement_set_root:receipt.settlement_set_root,
    total_settled_wc_units:receipt.total_settled_wc_units,
    expected_settlement_count:receipt.expected_settlement_count,
    binding_id:"voidwclprb1_"+"0".repeat(64),
  };
  expected.binding_id=wcVoidLedgerPersistenceReviewBindingIdV1(expected);
  return {expected,evidence:receipt};
}

const input=importInput();
const promotion=buildVoidWcVoidLedgerCustodyCoupledCandidatePromotionV1({
  candidate:coupled,
  successorMigrationCandidate:successor,
  ledgerPersistenceImportInput:input,
  ledgerPersistenceImportInputFileSha256:prettySha(input),
  candidateFileSha256:sha256(coupledBytes),
  successorCandidateFileSha256:sha256(successorBytes),
  repositoryHeadSha:head,
  repositoryTreeSha:tree,
});
const inputBytes=prettyBytes(input);
const promotionBytes=prettyBytes(promotion);

{
  const tempRoot=fs.mkdtempSync(
    path.join(os.tmpdir(),"void-ledger-custody-tree-symlink-"),
  );
  const treePath=path.join(tempRoot,"tree");
  const external=path.join(tempRoot,"external-sentinel.txt");
  const regular=path.join(treePath,"regular.txt");
  const executable=path.join(treePath,"executable.sh");
  const link=path.join(treePath,"absolute-link");

  fs.mkdirSync(treePath,{mode:0o700});
  fs.writeFileSync(external,"sentinel\n",{mode:0o600});
  fs.writeFileSync(regular,"regular\n",{mode:0o600});
  fs.writeFileSync(executable,"#!/usr/bin/env bash\nexit 0\n",{mode:0o700});
  fs.symlinkSync(external,link);

  const externalBefore=fs.statSync(external);
  const externalBytes=fs.readFileSync(external);

  makeVoidWcVoidLedgerCustodyReviewedTreeReadOnlyV1(treePath);
  assert.equal(fs.lstatSync(link).isSymbolicLink(),true);
  assert.equal(fs.readlinkSync(link),external);
  assert.equal(fs.statSync(regular).mode&0o777,0o400);
  assert.equal(fs.statSync(executable).mode&0o777,0o500);
  assert.equal(fs.statSync(external).mode&0o777,externalBefore.mode&0o777);
  assert.deepEqual(fs.readFileSync(external),externalBytes);

  makeVoidWcVoidLedgerCustodyReviewedTreeRemovableV1(treePath);
  assert.equal(fs.statSync(regular).mode&0o777,0o600);
  assert.equal(fs.statSync(executable).mode&0o777,0o600);
  assert.equal(fs.statSync(external).mode&0o777,externalBefore.mode&0o777);
  assert.deepEqual(fs.readFileSync(external),externalBytes);

  fs.rmSync(treePath,{recursive:true,force:true});
  assert.equal(fs.existsSync(external),true);
  assert.deepEqual(fs.readFileSync(external),externalBytes);
  fs.rmSync(tempRoot,{recursive:true,force:true});
}

{
  const tempRoot=fs.mkdtempSync(
    path.join(os.tmpdir(),"void-ledger-custody-tree-hardlink-"),
  );
  const treePath=path.join(tempRoot,"tree");
  const external=path.join(tempRoot,"external-sentinel.txt");
  const hardlink=path.join(treePath,"hardlink.txt");

  fs.mkdirSync(treePath,{mode:0o700});
  fs.writeFileSync(external,"sentinel\n",{mode:0o600});
  fs.linkSync(external,hardlink);

  const before=fs.statSync(external);
  const bytes=fs.readFileSync(external);
  assert.equal(before.nlink,2);

  assert.throws(
    ()=>makeVoidWcVoidLedgerCustodyReviewedTreeReadOnlyV1(treePath),
    /LEDGER_CUSTODY_APPLICATION_REVIEWED_FILE_DESCRIPTOR_INVALID/u,
  );
  const after=fs.statSync(external);
  assert.equal(after.mode&0o777,before.mode&0o777);
  assert.equal(after.nlink,2);
  assert.deepEqual(fs.readFileSync(external),bytes);

  fs.rmSync(treePath,{recursive:true,force:true});
  assert.equal(fs.statSync(external).nlink,1);
  fs.rmSync(tempRoot,{recursive:true,force:true});
}

{
  const packagePath="node_modules/ethers/package.json";
  const original=fs.readFileSync(packagePath);
  try{
    const text=original.toString("utf8");
    fs.writeFileSync(
      packagePath,
      Buffer.from(text.endsWith("\n")?text.slice(0,-1)+" \n":text+" ","utf8"),
    );
    assert.throws(
      ()=>prepareVoidWcVoidLedgerCustodyCanonicalApplicationV1({
        ledger_import_input_bytes:inputBytes,
        ledger_import_input_file_sha256:sha256(inputBytes),
        promotion_receipt_bytes:promotionBytes,
        promotion_receipt_file_sha256:sha256(promotionBytes),
      }),
      /LEDGER_CUSTODY_APPLICATION_REVIEWED_RUNTIME_/u,
    );
  }finally{
    fs.writeFileSync(packagePath,original);
  }
}

const plan=prepareVoidWcVoidLedgerCustodyCanonicalApplicationV1({
  ledger_import_input_bytes:inputBytes,
  ledger_import_input_file_sha256:sha256(inputBytes),
  promotion_receipt_bytes:promotionBytes,
  promotion_receipt_file_sha256:sha256(promotionBytes),
});

{
  const cache=_internal.testOnlyReviewedExecutionCacheSnapshotV1();
  assert.notEqual(cache,null);
  assert.equal(fs.existsSync(cache.runner_file),true);
  fs.chmodSync(cache.runner_file,0o600);
  fs.appendFileSync(cache.runner_file,"\n// hostile cached runner mutation\n");
  assert.throws(
    ()=>prepareVoidWcVoidLedgerCustodyCanonicalApplicationV1({
      ledger_import_input_bytes:inputBytes,
      ledger_import_input_file_sha256:sha256(inputBytes),
      promotion_receipt_bytes:promotionBytes,
      promotion_receipt_file_sha256:sha256(promotionBytes),
    }),
    /LEDGER_CUSTODY_APPLICATION_REVIEWED_RUNNER_SHA256_MISMATCH/u,
  );
  _internal.testOnlyClearReviewedExecutionCacheV1();
}

{
  const rebuilt=prepareVoidWcVoidLedgerCustodyCanonicalApplicationV1({
    ledger_import_input_bytes:inputBytes,
    ledger_import_input_file_sha256:sha256(inputBytes),
    promotion_receipt_bytes:promotionBytes,
    promotion_receipt_file_sha256:sha256(promotionBytes),
  });
  assert.equal(rebuilt.application_plan_id,plan.application_plan_id);
  const cache=_internal.testOnlyReviewedExecutionCacheSnapshotV1();
  assert.notEqual(cache,null);
  assert.equal(cache.private_module_paths.length>0,true);
  const moduleFile=path.join(
    cache.execution_root,
    cache.private_module_paths[0],
  );
  fs.chmodSync(moduleFile,0o600);
  fs.appendFileSync(moduleFile,"\n// hostile cached module mutation\n");
  assert.throws(
    ()=>prepareVoidWcVoidLedgerCustodyCanonicalApplicationV1({
      ledger_import_input_bytes:inputBytes,
      ledger_import_input_file_sha256:sha256(inputBytes),
      promotion_receipt_bytes:promotionBytes,
      promotion_receipt_file_sha256:sha256(promotionBytes),
    }),
    /LEDGER_CUSTODY_APPLICATION_REVIEWED_PRIVATE_MODULE_.*_GIT_BLOB_MISMATCH/u,
  );
  _internal.testOnlyClearReviewedExecutionCacheV1();
}

{
  const toolPath =
    "tools/void-wc-void-ledger-custody-canonical-application-v1.mjs";
  const original = fs.readFileSync(toolPath);
  try {
    git("update-index", "--assume-unchanged", toolPath);
    fs.appendFileSync(toolPath, "\n// hidden parent-tool mutation\n");
    assert.throws(
      () => prepareVoidWcVoidLedgerCustodyCanonicalApplicationV1({
        ledger_import_input_bytes: inputBytes,
        ledger_import_input_file_sha256: sha256(inputBytes),
        promotion_receipt_bytes: promotionBytes,
        promotion_receipt_file_sha256: sha256(promotionBytes),
      }),
      /LEDGER_CUSTODY_APPLICATION_TOOL_WORKTREE_DRIFT/u,
    );
  } finally {
    fs.writeFileSync(toolPath, original);
    git("update-index", "--no-assume-unchanged", toolPath);
  }
}

{
  const remoteBefore = _internal.canonicalRemoteMainHead();
  assert.match(remoteBefore, /^[0-9a-f]{40}$/u);

  const urlKey =
    "url.https://127.0.0.1:1/ledger-custody-hostile/.insteadOf";
  const sslKey = "http.sslVerify";
  const priorUrl = gitRun(
    ["config", "--local", "--no-includes", "--get-all", urlKey],
    { allowFail: true },
  );
  const priorSsl = gitRun(
    ["config", "--local", "--no-includes", "--get-all", sslKey],
    { allowFail: true },
  );
  const priorUrlValues = priorUrl.status === 0
    ? String(priorUrl.stdout || "").split("\n").filter(Boolean)
    : [];
  const priorSslValues = priorSsl.status === 0
    ? String(priorSsl.stdout || "").split("\n").filter(Boolean)
    : [];
  try {
    git(
      "config", "--local", "--no-includes", "--add",
      urlKey, "https://github.com/6ZoSo9/void-node.git",
    );
    git(
      "config", "--local", "--no-includes", "--replace-all",
      sslKey, "false",
    );
    const remoteUnderHostileLocalConfig =
      _internal.canonicalRemoteMainHead();
    assert.equal(remoteUnderHostileLocalConfig, remoteBefore);
  } finally {
    gitRun(
      ["config", "--local", "--no-includes", "--unset-all", urlKey],
      { allowFail: true },
    );
    for (const value of priorUrlValues) {
      git("config", "--local", "--no-includes", "--add", urlKey, value);
    }
    gitRun(
      ["config", "--local", "--no-includes", "--unset-all", sslKey],
      { allowFail: true },
    );
    for (const value of priorSslValues) {
      git("config", "--local", "--no-includes", "--add", sslKey, value);
    }
  }
}

assert.equal(
  plan.marker,
  VOID_WC_VOID_LEDGER_CUSTODY_CANONICAL_APPLICATION_PLAN_V1,
);
assert.equal(plan.status,"LEDGER_CUSTODY_CANONICAL_APPLICATION_PREPARED");
assert.match(plan.application_plan_id,/^voidwclcca1_[0-9a-f]{64}$/u);
assert.equal(plan.application_base_head_sha,head);
assert.equal(plan.application_base_tree_sha,tree);
assert.equal(plan.promotion_id,promotion.promotion_id);
assert.deepEqual(
  Object.keys(plan.reviewed_execution_module_git_blobs).sort(),
  [...REVIEWED_MODULES].sort(),
);
assert.equal(
  plan.reviewed_runtime_profile_id,
  REVIEWED_RUNTIME_PROFILE.profile_id,
);
assert.equal(
  plan.reviewed_runtime_packages_aggregate_sha256,
  REVIEWED_RUNTIME_PROFILE.packages_aggregate_sha256,
);
assert.equal(plan.reviewed_execution_permission_fenced,true);
assert.equal(
  plan.reviewed_execution_ancestor_package_resolution_allowed,
  false,
);
assert.equal(plan.reviewed_execution_network_isolation_provided,false);
assert.equal(
  plan.production_target_candidate.wc_ledger_persistence_verified,
  true,
);
assert.equal(
  plan.production_target_candidate.quote_reserve_custody_verified,
  true,
);
assert.equal(
  plan.coupled_target_candidate.gates.wc_ledger_persistence_verified,
  true,
);
assert.equal(
  plan.coupled_target_candidate.gates.quote_reserve_custody_verified,
  true,
);
assert.equal(plan.production_target_candidate.status,"hold");
assert.equal(plan.coupled_target_candidate.status,"HOLD");
assert.equal(plan.production_target_candidate.coupled_activation_ready,false);
assert.equal(plan.coupled_target_candidate.gates.coupled_activation_ready,false);
assert.deepEqual(
  plan.promoted_production_fields,
  ["quote_reserve_custody_verified","wc_ledger_persistence_verified"],
);
assert.deepEqual(
  plan.promoted_coupled_gates,
  ["quote_reserve_custody_verified","wc_ledger_persistence_verified"],
);

{
  const hostile=fs.mkdtempSync(
    path.join(os.tmpdir(),"void-ledger-custody-hostile-env-"),
  );
  const home=path.join(hostile,"home");
  const fsmonitor=path.join(hostile,"fake-fsmonitor.sh");
  const fsmonitorSentinel=path.join(hostile,"fsmonitor-invoked");
  const nodeHook=path.join(hostile,"node-hook.cjs");
  const nodeSentinel=path.join(hostile,"node-options-invoked");
  fs.mkdirSync(home,{recursive:true});
  fs.writeFileSync(
    fsmonitor,
    "#!/bin/sh\nprintf 'invoked\\n' >> "+JSON.stringify(fsmonitorSentinel)+"\nexit 92\n",
    {mode:0o755},
  );
  fs.writeFileSync(
    nodeHook,
    "require('node:fs').writeFileSync("+
      JSON.stringify(nodeSentinel)+",'invoked\\n');\n",
    "utf8",
  );

  const priorFsmonitor=gitRun(
    ["config","--local","--no-includes","--get-all","core.fsmonitor"],
    {allowFail:true},
  );
  const priorValues=priorFsmonitor.status===0
    ? String(priorFsmonitor.stdout||"").split("\n").filter(Boolean)
    : [];
  const saved=new Map();
  for(const key of [
    "HOME","XDG_CONFIG_HOME","NODE_OPTIONS","NODE_PATH",
    "LD_PRELOAD","LD_LIBRARY_PATH","GIT_CONFIG_COUNT",
    "GIT_CONFIG_KEY_0","GIT_CONFIG_VALUE_0",
  ]){
    saved.set(
      key,
      Object.prototype.hasOwnProperty.call(process.env,key)
        ? process.env[key]
        : undefined,
    );
  }
  try{
    gitRun([
      "config","--local","--no-includes","--replace-all",
      "core.fsmonitor",fsmonitor,
    ]);
    process.env.HOME=home;
    process.env.XDG_CONFIG_HOME=home;
    process.env.NODE_OPTIONS="--require="+nodeHook;
    process.env.NODE_PATH=path.join(hostile,"ambient-node-modules");
    process.env.LD_PRELOAD=path.join(hostile,"fake-preload.so");
    process.env.LD_LIBRARY_PATH=hostile;
    process.env.GIT_CONFIG_COUNT="1";
    process.env.GIT_CONFIG_KEY_0="core.fsmonitor";
    process.env.GIT_CONFIG_VALUE_0=fsmonitor;

    const hostilePlan=prepareVoidWcVoidLedgerCustodyCanonicalApplicationV1({
      ledger_import_input_bytes:inputBytes,
      ledger_import_input_file_sha256:sha256(inputBytes),
      promotion_receipt_bytes:promotionBytes,
      promotion_receipt_file_sha256:sha256(promotionBytes),
    });
    assert.equal(hostilePlan.application_plan_id,plan.application_plan_id);
    assert.equal(fs.existsSync(fsmonitorSentinel),false);
    assert.equal(fs.existsSync(nodeSentinel),false);
  }finally{
    gitRun(
      ["config","--local","--no-includes","--unset-all","core.fsmonitor"],
      {allowFail:true},
    );
    for(const value of priorValues){
      gitRun(["config","--local","--no-includes","--add","core.fsmonitor",value]);
    }
    for(const [key,value] of saved){
      if(value===undefined) delete process.env[key];
      else process.env[key]=value;
    }
    fs.rmSync(hostile,{recursive:true,force:true});
  }
}

{
  const authorityPath=
    "tools/void-wc-void-ledger-custody-coupled-candidate-promotion-v1.mjs";
  const original=fs.readFileSync(authorityPath);
  try{
    git("update-index","--assume-unchanged",authorityPath);
    fs.appendFileSync(authorityPath,"\n// hidden hostile worktree mutation\n");
    const hiddenPlan=prepareVoidWcVoidLedgerCustodyCanonicalApplicationV1({
      ledger_import_input_bytes:inputBytes,
      ledger_import_input_file_sha256:sha256(inputBytes),
      promotion_receipt_bytes:promotionBytes,
      promotion_receipt_file_sha256:sha256(promotionBytes),
    });
    assert.equal(hiddenPlan.application_plan_id,plan.application_plan_id);
  }finally{
    fs.writeFileSync(authorityPath,original);
    git("update-index","--no-assume-unchanged",authorityPath);
  }
}
assert.equal(
  plan.production_before.missing_gates.includes(
    "wc_ledger_persistence_verification_required",
  ),
  true,
);
assert.equal(
  plan.production_before.missing_gates.includes(
    "quote_reserve_custody_verification_required",
  ),
  true,
);
assert.equal(
  plan.production_after.missing_gates.includes(
    "wc_ledger_persistence_verification_required",
  ),
  false,
);
assert.equal(
  plan.production_after.missing_gates.includes(
    "quote_reserve_custody_verification_required",
  ),
  false,
);
assert.equal(
  plan.coupled_before.missing_gates.includes(
    "wc_ledger_persistence_verification_required",
  ),
  true,
);
assert.equal(
  plan.coupled_before.missing_gates.includes(
    "quote_reserve_custody_verification_required",
  ),
  true,
);
assert.equal(
  plan.coupled_after.missing_gates.includes(
    "wc_ledger_persistence_verification_required",
  ),
  false,
);
assert.equal(
  plan.coupled_after.missing_gates.includes(
    "quote_reserve_custody_verification_required",
  ),
  false,
);

const pure=verifyVoidWcVoidLedgerCustodyCanonicalApplicationStateV1({
  plan,
  productionCandidate:plan.production_target_candidate,
  coupledCandidate:plan.coupled_target_candidate,
  successorCandidate:successor,
});
assert.equal(pure.ok,true);
assert.equal(
  pure.status,
  "LEDGER_CUSTODY_APPLICATION_STATE_VERIFIED_FINAL_ACTIVATION_HOLD",
);
assert.equal(pure.wc_ledger_persistence_verified,true);
assert.equal(pure.quote_reserve_custody_verified,true);
assert.equal(pure.coupled_activation_ready,false);

const planBytes=prettyBytes(plan);
assert.throws(
  ()=>verifyVoidWcVoidLedgerCustodyCanonicalApplicationV1({
    application_plan_bytes:planBytes,
    application_plan_file_sha256:sha256(planBytes),
  }),
  /LEDGER_CUSTODY_APPLICATION_APPLIED_BRANCH_NOT_MAIN/u,
);

{
  const badReceipt=clone(promotion);
  badReceipt.promoted_candidate.gates.opening_claim_transfer_or_refund_binding_ready=true;
  const bytes=prettyBytes(badReceipt);
  assert.throws(
    ()=>prepareVoidWcVoidLedgerCustodyCanonicalApplicationV1({
      ledger_import_input_bytes:inputBytes,
      ledger_import_input_file_sha256:sha256(inputBytes),
      promotion_receipt_bytes:bytes,
      promotion_receipt_file_sha256:sha256(bytes),
    }),
    /LEDGER_CUSTODY_APPLICATION_REVIEWED_PROMOTION_RECEIPT_MISMATCH/u,
  );
}

{
  const forged=clone(plan);
  forged.production_target_candidate.inventory_funded=true;
  const targetBytes=_internal.prettyBytes(forged.production_target_candidate);
  forged.production_target_file_sha256=_internal.sha256(targetBytes);
  forged.production_target_git_blob_sha1=_internal.gitBlobSha1(targetBytes);
  const material=clone(forged);
  delete material.application_plan_id;
  forged.application_plan_id=
    "voidwclcca1_"+
    _internal.sha256(
      Buffer.from(_internal.canonicalJson(material),"utf8"),
    );
  assert.throws(
    ()=>verifyVoidWcVoidLedgerCustodyCanonicalApplicationStateV1({
      plan:forged,
      productionCandidate:forged.production_target_candidate,
      coupledCandidate:forged.coupled_target_candidate,
      successorCandidate:successor,
    }),
    /LEDGER_CUSTODY_APPLICATION_PRODUCTION_CHANGE_SCOPE_INVALID/u,
  );
}

{
  const badInput=clone(input);
  badInput.evidence.quote_reserve_custody_verified=false;
  const badInputBytes=prettyBytes(badInput);
  assert.throws(
    ()=>prepareVoidWcVoidLedgerCustodyCanonicalApplicationV1({
      ledger_import_input_bytes:badInputBytes,
      ledger_import_input_file_sha256:sha256(badInputBytes),
      promotion_receipt_bytes:promotionBytes,
      promotion_receipt_file_sha256:sha256(promotionBytes),
    }),
  );
}

for(const [key,value] of Object.entries(
  VOID_WC_VOID_LEDGER_CUSTODY_CANONICAL_APPLICATION_AUTHORITY_V1,
)){
  const allowed=new Set([
    "source_only_application",
    "exact_ledger_import_input_required",
    "exact_promotion_receipt_required",
    "promotion_reexecution_required",
    "canonical_head_candidate_bytes_required",
    "reviewed_repository_generation_required",
    "exact_four_field_source_delta",
    "canonical_classifier_reexecution",
    "reviewed_git_commit_required",
    "reviewed_git_object_execution_required",
    "reviewed_package_runtime_required",
    "permission_fenced_execution_required",
    "minimal_git_environment_required",
    "ambient_loader_tool_overrides_ignored",
    "execution_child_process_limited_to_reviewed_git",
    "private_temporary_filesystem_write",
    "filesystem_read",
    "filesystem_write",
  ]);
  assert.equal(value,allowed.has(key),key);
}

const focusedWorkflow=fs.readFileSync(
  ".github/workflows/void-wc-void-ledger-custody-canonical-application-v1.yml",
  "utf8",
);
const prStart=focusedWorkflow.indexOf("  pull_request:\n");
const pushStart=focusedWorkflow.indexOf("  push:\n");
const permissionsStart=focusedWorkflow.indexOf("\npermissions:\n");
assert(prStart>=0&&pushStart>prStart&&permissionsStart>pushStart);

const pathToken=/^\s*-\s+"([^"]+)"\s*$/gmu;
const collectPaths=(block)=>
  [...block.matchAll(pathToken)].map((match)=>match[1]).sort();
const pullPaths=collectPaths(focusedWorkflow.slice(prStart,pushStart));
const pushPaths=collectPaths(focusedWorkflow.slice(pushStart,permissionsStart));
assert(pullPaths.length>0);
assert.deepEqual(pushPaths,pullPaths);
assert.equal(new Set(pullPaths).size,pullPaths.length);

for(const requiredPath of [
  ...REVIEWED_MODULES,
  "tools/void-reviewed-node-package-runtime-v1.mjs",
  "ops/security/reviewed-node-package-runtime-ethers-v1.json",
  "scripts/prove_void_reviewed_node_package_runtime_v1.mjs",
  "package.json",
  "package-lock.json",
]){
  assert.equal(pullPaths.includes(requiredPath),true,requiredPath);
}

const source=fs.readFileSync(
  "tools/void-wc-void-ledger-custody-canonical-application-v1.mjs",
  "utf8",
);
for(const forbidden of [
  "systemctl","eth_sendRawTransaction","eth_sendTransaction","new Wallet(",
  'from "./void-wc-void-ledger-custody-coupled-candidate-promotion-v1.mjs";',
  'from "./void-wc-void-production-readiness-v1.mjs";',
  'from "./void-coupled-economic-successor-gate-v1.mjs";',
]){
  assert.equal(source.includes(forbidden),false,forbidden);
}
for(const required of [
  "--no-replace-objects",
  "core.fsmonitor=false",
  "GIT_CONFIG_GLOBAL",
  "reviewedModuleClosure",
  "makeVoidWcVoidLedgerCustodyReviewedTreeReadOnlyV1",
  "makeVoidWcVoidLedgerCustodyReviewedTreeRemovableV1",
  "readBoundPrivateRegularFile",
  "assertPrivateExecutionStaticBinding",
  "LEDGER_CUSTODY_APPLICATION_REVIEWED_RUNNER",
  "testOnlyReviewedExecutionCacheSnapshotV1",
  "O_NOFOLLOW",
  "O_DIRECTORY",
  "fstatSync",
  "fchmodSync",
  "stat.nlink!==1",
  "materializeReviewedNodePackageRuntimeV1",
  "verifyMaterializedReviewedNodePackageRuntimeV1",
  "--permission",
  "--allow-child-process",
  "LEDGER_CUSTODY_APPLICATION_REVIEWED_AUTHORITY_EXECUTION_FAILED",
  "LEDGER_CUSTODY_APPLICATION_APPLIED_HEAD_NOT_REMOTE_MAIN",
  "LEDGER_CUSTODY_APPLICATION_TOOL_WORKTREE_DRIFT",
  "http.sslVerify=true",
  'cwd:"/"',
  "buildVoidWcVoidLedgerCustodyCoupledCandidatePromotionV1",
  "classifyVoidWcVoidProductionReadinessV1",
  "classifyVoidCoupledEconomicSuccessorGateV1",
  "LEDGER_CUSTODY_APPLICATION_PLAN_BASE_SOURCE_MISMATCH",
  "LEDGER_CUSTODY_APPLICATION_PRODUCTION_CHANGE_SCOPE_INVALID",
  "LEDGER_CUSTODY_APPLICATION_COUPLED_CHANGE_SCOPE_INVALID",
  "final_coupled_activation_required:true",
]){
  assert.equal(source.includes(required),true,required);
}

console.log(
  "VOID_WC_VOID_LEDGER_CUSTODY_CANONICAL_APPLICATION_V1_PROOF_GREEN",
);
console.log("ledger_import_reexecuted=true");
console.log("candidate_promotion_reexecuted=true");
console.log("reviewed_git_object_execution_verified=true");
console.log("reviewed_ethers_runtime_verified=true");
console.log("permission_fenced_execution=true");
console.log("private_execution_bytes_reverified_before_spawn=true");
console.log("cached_runner_tamper_held=true");
console.log("cached_module_tamper_held=true");
console.log("reviewed_execution_symlink_boundary_green=true");
console.log("reviewed_execution_hardlink_rejected=true");
console.log("reviewed_execution_chmod_descriptor_bound=true");
console.log("focused_workflow_trigger_symmetry_green=true");
console.log("ancestor_package_resolution_allowed=false");
console.log("ambient_git_and_node_overrides_ignored=true");
console.log("hidden_worktree_authority_mutation_ignored=true");
console.log("parent_tool_worktree_binding_verified=true");
console.log("canonical_remote_local_config_ignored=true");
console.log("canonical_remote_tls_verify_forced=true");
console.log("canonical_source_prestates_bound=true");
console.log("forged_application_plan_held=true");
console.log("exact_four_field_delta_prepared=true");
console.log("wc_ledger_persistence_verified=true");
console.log("quote_reserve_custody_verified=true");
console.log("production_status_remains_hold=true");
console.log("coupled_status_remains_hold=true");
console.log("coupled_activation_ready=false");
console.log("repository_source_write=false");
console.log("market_activation=false");
console.log("public_presale_activation=false");
console.log("funds_movement=false");
