#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";

import {
  VOID_WC_VOID_OPENING_COMMITMENT_SCHEMA_V1,
  VOID_WC_VOID_OPENING_LEDGER_DEBIT_SCHEMA_V1,
  VOID_WC_VOID_OPENING_SETTLEMENT_ADAPTER_ID_V1,
  deriveWcVoidCoupledOpeningStateV1,
  verifyWcVoidOpeningLedgerSettlementsV1,
  wcVoidOpeningCommitmentIdV1,
  wcVoidOpeningSettlementIdV1,
} from "../tools/void-wc-void-coupled-opening-v1.mjs";
import {
  VOID_WC_VOID_OPENING_EXECUTION_BINDING_V1,
  VOID_WC_VOID_OPENING_TRANSFER_CLAIM_SCHEMA_V1,
  wcVoidOpeningTransferDispositionIdV1,
} from "../tools/void-wc-void-opening-claim-binding-v1.mjs";
import {
  initialWcVoidOpeningReplayStateV1,
} from "../tools/void-wc-void-opening-replay-protection-v1.mjs";
import {
  VOID_WC_VOID_OPENING_REPLAY_PERSISTENCE_CONFIRMATION_V1,
  persistWcVoidOpeningReplayTerminalV1,
} from "../tools/void-wc-void-opening-replay-persistence-v1.mjs";
import {
  VOID_WC_VOID_OPENING_CLAIM_BINDING_PUBLICATION_CONFIRMATION_V1,
  persistWcVoidOpeningClaimBindingV1,
} from "../tools/void-wc-void-opening-claim-binding-publication-v1.mjs";
import {
  prepareVoidWcVoidOpeningDurableEvidenceCandidatePromotionV1,
} from "../tools/void-wc-void-opening-durable-evidence-candidate-promotion-v1.mjs";
import {
  VOID_WC_VOID_OPENING_DURABLE_EVIDENCE_CANONICAL_APPLICATION_AUTHORITY_V1,
  VOID_WC_VOID_OPENING_DURABLE_EVIDENCE_CANONICAL_APPLICATION_PLAN_V1,
  _internal,
  prepareVoidWcVoidOpeningDurableEvidenceCanonicalApplicationV1,
  verifyVoidWcVoidOpeningDurableEvidenceCanonicalApplicationStateV1,
  verifyVoidWcVoidOpeningDurableEvidenceCanonicalApplicationV1,
} from "../tools/void-wc-void-opening-durable-evidence-canonical-application-v1.mjs";

const COUPLED="ops/mainnet0/coupled-economic-successor-gate-candidate-v1.json";
const SUCCESSOR="ops/mainnet0/economic-evm-successor-migration-candidate-v1.json";
const PROMOTION_TOOL=
  "tools/void-wc-void-opening-durable-evidence-candidate-promotion-v1.mjs";

function git(args,{allowFail=false,env=process.env}={}){
  const result=spawnSync(
    "/usr/bin/git",
    ["--no-replace-objects","-c","core.fsmonitor=false","-c","core.hooksPath=/dev/null","-c","core.attributesFile=/dev/null","-c","core.untrackedCache=false","-c","core.preloadIndex=false","-c","submodule.recurse=false",...args],
    {cwd:process.cwd(),env,encoding:"utf8",stdio:["ignore","pipe","pipe"]},
  );
  if(result.error) throw result.error;
  if(result.status!==0&&!allowFail){
    throw new Error("proof_git_failed:"+args.join("_")+":"+String(result.stderr||""));
  }
  return result;
}

function sha256(value){
  return crypto.createHash("sha256").update(value).digest("hex");
}
function prettyBytes(value){
  return Buffer.from(JSON.stringify(value,null,2)+"\n","utf8");
}
const coupled=JSON.parse(fs.readFileSync(COUPLED,"utf8"));
const successor=JSON.parse(fs.readFileSync(SUCCESSOR,"utf8"));
const launchId=coupled.shared_post_discovery_reconciliation.coupled_launch_id;
assert.equal(
  launchId,
  "sha256:fe02b5c813adea98f55e8587759df9316f7a8d5f1123114dc851cbad863fdc26",
);
const hash=(digit)=>"sha256:"+String(digit).repeat(64);

function commitment(participantDigit,account,wcUnits){
  const value={
    schema:VOID_WC_VOID_OPENING_COMMITMENT_SCHEMA_V1,
    commitment_id:hash("0"),
    coupled_launch_id:launchId,
    participant_id:hash(participantDigit),
    account,
    wc_units:String(wcUnits),
  };
  value.commitment_id=wcVoidOpeningCommitmentIdV1(value);
  return value;
}
function debit(commitmentValue,amount,tsMs){
  const value={
    schema:VOID_WC_VOID_OPENING_LEDGER_DEBIT_SCHEMA_V1,
    kind:"debit",
    account:commitmentValue.account,
    amount,
    delta:-amount,
    ts_ms:tsMs,
    reason:"wc_void_opening_settlement_v1",
    settlement_id:hash("0"),
    commitment_id:commitmentValue.commitment_id,
    coupled_launch_id:launchId,
    pair:"WC_VOID",
    source_domain:"void-work-credit-ledger",
    quote_asset_form:"ledger-credit",
    quote_unit:"wc",
    quote_decimals:0,
    market_meta:{
      adapter_id:VOID_WC_VOID_OPENING_SETTLEMENT_ADAPTER_ID_V1,
      opening_only:true,
      fixed_price:false,
      protocol_wc_seed_units:"0",
    },
  };
  value.settlement_id=wcVoidOpeningSettlementIdV1(value);
  return value;
}

const first=commitment("1","application-alpha","250");
const second=commitment("2","application-beta","750");
const commitments=[first,second];
const ledgerDebits=[
  debit(first,250,1790354000001),
  debit(second,750,1790354000002),
];
const opening=deriveWcVoidCoupledOpeningStateV1({
  coupled_launch_id:launchId,
  commitments,
  ledger_debits:ledgerDebits,
});
const settlements=verifyWcVoidOpeningLedgerSettlementsV1(
  launchId,commitments,ledgerDebits,
);
const allocationByCommitment=new Map(
  opening.participant_allocations.map(v=>[v.commitment_id,v]),
);
const settlementByCommitment=new Map(
  settlements.settlements.map(v=>[v.commitment_id,v]),
);
function transferClaim(commitmentValue,recipient){
  const allocation=allocationByCommitment.get(commitmentValue.commitment_id);
  const settlement=settlementByCommitment.get(commitmentValue.commitment_id);
  const value={
    schema:VOID_WC_VOID_OPENING_TRANSFER_CLAIM_SCHEMA_V1,
    disposition_id:hash("0"),
    coupled_launch_id:launchId,
    opening_state_id:opening.opening_state_id,
    chain_id:VOID_WC_VOID_OPENING_EXECUTION_BINDING_V1.chain_id,
    network_identity:VOID_WC_VOID_OPENING_EXECUTION_BINDING_V1.network_identity,
    execution_epoch:VOID_WC_VOID_OPENING_EXECUTION_BINDING_V1.execution_epoch,
    void_token:VOID_WC_VOID_OPENING_EXECUTION_BINDING_V1.void_token,
    commitment_id:commitmentValue.commitment_id,
    settlement_id:settlement.settlement_id,
    participant_id:commitmentValue.participant_id,
    account:commitmentValue.account,
    void_recipient:recipient,
    void_atoms:allocation.void_atoms,
  };
  value.disposition_id=wcVoidOpeningTransferDispositionIdV1(value);
  return value;
}
const dispositions=[
  transferClaim(first,"0x1111111111111111111111111111111111111111"),
  transferClaim(second,"0x2222222222222222222222222222222222222222"),
];

const temp=fs.mkdtempSync(path.join(os.tmpdir(),"void-opening-canonical-application-"));
try{
  fs.chmodSync(temp,0o700);
  const dataDir=path.join(temp,"data");
  const wcDir=path.join(dataDir,"wc_v1");
  fs.mkdirSync(wcDir,{recursive:true,mode:0o700});
  fs.chmodSync(dataDir,0o700);
  fs.chmodSync(wcDir,0o700);

  const replay=persistWcVoidOpeningReplayTerminalV1({
    data_dir:dataDir,
    recorded_at_utc:"2030-01-01T00:00:00Z",
    confirmation:VOID_WC_VOID_OPENING_REPLAY_PERSISTENCE_CONFIRMATION_V1,
    before_state:initialWcVoidOpeningReplayStateV1(launchId),
    coupled_launch_id:launchId,
    commitments,
    ledger_debits:ledgerDebits,
    mode:"finalize",
    dispositions,
  });
  assert.equal(replay.ok,true);
  const binding=persistWcVoidOpeningClaimBindingV1({
    data_dir:dataDir,
    confirmation:VOID_WC_VOID_OPENING_CLAIM_BINDING_PUBLICATION_CONFIRMATION_V1,
    coupled_launch_id:launchId,
    commitments,
    ledger_debits:ledgerDebits,
    mode:"finalize",
    dispositions,
  });
  assert.equal(binding.ok,true);
  assert.equal(binding.binding_id,replay.binding_id);

  const request={
    commitments,
    coupled_launch_id:launchId,
    data_dir:dataDir,
    dispositions,
    ledger_debits:ledgerDebits,
    mode:"finalize",
  };
  const requestFile=path.join(temp,"request.json");
  fs.writeFileSync(requestFile,prettyBytes(request),{mode:0o600});
  fs.chmodSync(requestFile,0o600);
  const requestSha=sha256(fs.readFileSync(requestFile));

  const promotion=
    prepareVoidWcVoidOpeningDurableEvidenceCandidatePromotionV1({
      requestFile,
      requestFileSha256:requestSha,
    });
  const promotionBytes=prettyBytes(promotion);

  const plan=
    prepareVoidWcVoidOpeningDurableEvidenceCanonicalApplicationV1({
      request_file:requestFile,
      request_file_sha256:requestSha,
      promotion_receipt_bytes:promotionBytes,
      promotion_receipt_file_sha256:sha256(promotionBytes),
    });

  assert.equal(
    plan.marker,
    VOID_WC_VOID_OPENING_DURABLE_EVIDENCE_CANONICAL_APPLICATION_PLAN_V1,
  );
  assert.equal(
    plan.status,
    "OPENING_DURABLE_EVIDENCE_CANONICAL_APPLICATION_PREPARED",
  );
  assert.match(plan.application_plan_id,/^voidwcodca1_[0-9a-f]{64}$/u);
  assert.equal(plan.promotion_id,promotion.promotion_id);
  assert.equal(plan.binding_id,binding.binding_id);
  assert.equal(plan.replay_terminal_capsule_id,replay.capsule_id);
  assert.equal(plan.durable_claim_binding_verified,true);
  assert.equal(plan.durable_replay_terminal_verified,true);

  assert.equal(
    plan.production_target_candidate.participant_opening_claim_policy_ready,
    true,
  );
  assert.equal(
    plan.production_target_candidate.duplicate_replay_protection_proven,
    true,
  );
  assert.equal(
    plan.coupled_target_candidate.gates
      .opening_claim_transfer_or_refund_binding_ready,
    true,
  );
  assert.equal(plan.production_target_candidate.bounded_canary_green,false);
  assert.equal(plan.production_target_candidate.coupled_activation_ready,false);
  assert.equal(plan.coupled_target_candidate.gates.bounded_canary_green,false);
  assert.equal(plan.coupled_target_candidate.gates.coupled_activation_ready,false);
  assert.equal(plan.production_target_candidate.status,"hold");
  assert.equal(plan.coupled_target_candidate.status,"HOLD");

  assert.equal(
    plan.production_before.missing_gates.includes(
      "participant_opening_claim_policy_required",
    ),
    true,
  );
  assert.equal(
    plan.production_before.missing_gates.includes(
      "duplicate_replay_protection_required",
    ),
    true,
  );
  assert.equal(
    plan.production_after.missing_gates.includes(
      "participant_opening_claim_policy_required",
    ),
    false,
  );
  assert.equal(
    plan.production_after.missing_gates.includes(
      "duplicate_replay_protection_required",
    ),
    false,
  );
  assert.equal(
    plan.coupled_before.missing_gates.includes(
      "opening_claim_transfer_or_refund_binding_required",
    ),
    true,
  );
  assert.equal(
    plan.coupled_after.missing_gates.includes(
      "opening_claim_transfer_or_refund_binding_required",
    ),
    false,
  );

  const pure=
    verifyVoidWcVoidOpeningDurableEvidenceCanonicalApplicationStateV1({
      plan,
      productionCandidate:plan.production_target_candidate,
      coupledCandidate:plan.coupled_target_candidate,
      successorCandidate:successor,
    });
  assert.equal(pure.ok,true);
  assert.equal(
    pure.status,
    "OPENING_DURABLE_APPLICATION_STATE_VERIFIED_FINAL_ACTIVATION_HOLD",
  );
  assert.equal(pure.durable_claim_binding_verified,true);
  assert.equal(pure.durable_replay_terminal_verified,true);
  assert.equal(pure.bounded_canary_green,false);
  assert.equal(pure.coupled_activation_ready,false);

  const planBytes=prettyBytes(plan);
  assert.throws(
    ()=>verifyVoidWcVoidOpeningDurableEvidenceCanonicalApplicationV1({
      application_plan_bytes:planBytes,
      application_plan_file_sha256:sha256(planBytes),
    }),
    /OPENING_DURABLE_APPLICATION_APPLIED_BRANCH_NOT_MAIN/u,
  );

  {
    const bad=structuredClone(promotion);
    bad.promoted_production_candidate.inventory_funded=true;
    const bytes=prettyBytes(bad);
    assert.throws(
      ()=>prepareVoidWcVoidOpeningDurableEvidenceCanonicalApplicationV1({
        request_file:requestFile,
        request_file_sha256:requestSha,
        promotion_receipt_bytes:bytes,
        promotion_receipt_file_sha256:sha256(bytes),
      }),
      /OPENING_DURABLE_APPLICATION_REVIEWED_PROMOTION_RECEIPT_MISMATCH/u,
    );
  }

  {
    const forged=structuredClone(plan);
    forged.production_target_candidate.inventory_funded=true;
    const targetBytes=_internal.prettyBytes(forged.production_target_candidate);
    forged.production_target_file_sha256=_internal.sha256(targetBytes);
    forged.production_target_git_blob_sha1=_internal.gitBlobSha1(targetBytes);
    const body=structuredClone(forged);
    delete body.application_plan_id;
    forged.application_plan_id=
      "voidwcodca1_"+
      _internal.sha256(Buffer.from(_internal.canonicalJson(body),"utf8"));
    assert.throws(
      ()=>verifyVoidWcVoidOpeningDurableEvidenceCanonicalApplicationStateV1({
        plan:forged,
        productionCandidate:forged.production_target_candidate,
        coupledCandidate:forged.coupled_target_candidate,
        successorCandidate:successor,
      }),
      /OPENING_DURABLE_APPLICATION_PRODUCTION_CHANGE_SCOPE_INVALID/u,
    );
  }

  {
    const sentinelDir=path.join(temp,"hostile-env");
    fs.mkdirSync(sentinelDir,{mode:0o700});
    const fsmonitor=path.join(sentinelDir,"fsmonitor.sh");
    const localSentinel=path.join(sentinelDir,"local-fsmonitor-ran");
    const globalSentinel=path.join(sentinelDir,"global-fsmonitor-ran");
    fs.writeFileSync(
      fsmonitor,
      "#!/bin/sh\n: > \""+localSentinel.replaceAll("\\","\\\\").replaceAll('"','\\"')+"\"\nexit 0\n",
      {mode:0o700},
    );
    const home=path.join(sentinelDir,"home");
    fs.mkdirSync(home,{mode:0o700});
    const globalMonitor=path.join(sentinelDir,"global-fsmonitor.sh");
    fs.writeFileSync(
      globalMonitor,
      "#!/bin/sh\n: > \""+globalSentinel.replaceAll("\\","\\\\").replaceAll('"','\\"')+"\"\nexit 0\n",
      {mode:0o700},
    );
    fs.writeFileSync(
      path.join(home,".gitconfig"),
      "[core]\n\tfsmonitor = "+globalMonitor+"\n",
      {mode:0o600},
    );

    const previous={
      HOME:process.env.HOME,
      XDG_CONFIG_HOME:process.env.XDG_CONFIG_HOME,
      GIT_CONFIG_GLOBAL:process.env.GIT_CONFIG_GLOBAL,
      LD_DEBUG:process.env.LD_DEBUG,
      LD_DEBUG_OUTPUT:process.env.LD_DEBUG_OUTPUT,
      NODE_OPTIONS:process.env.NODE_OPTIONS,
      NODE_PATH:process.env.NODE_PATH,
    };
    const loaderSentinel=path.join(sentinelDir,"loader");
    try{
      git(["config","--local","core.fsmonitor",fsmonitor]);
      process.env.HOME=home;
      process.env.XDG_CONFIG_HOME=home;
      process.env.GIT_CONFIG_GLOBAL=path.join(home,".gitconfig");
      process.env.LD_DEBUG="libs";
      process.env.LD_DEBUG_OUTPUT=loaderSentinel;
      process.env.NODE_OPTIONS="--trace-warnings";
      process.env.NODE_PATH=path.join(sentinelDir,"fake-node-path");

      const hostilePlan=
        prepareVoidWcVoidOpeningDurableEvidenceCanonicalApplicationV1({
          request_file:requestFile,
          request_file_sha256:requestSha,
          promotion_receipt_bytes:promotionBytes,
          promotion_receipt_file_sha256:sha256(promotionBytes),
        });
      assert.equal(hostilePlan.application_plan_id,plan.application_plan_id);
      assert.equal(fs.existsSync(localSentinel),false);
      assert.equal(fs.existsSync(globalSentinel),false);
      assert.equal(
        fs.readdirSync(sentinelDir).some(name=>name.startsWith("loader.")),
        false,
      );
    }finally{
      git(["config","--local","--unset-all","core.fsmonitor"],{allowFail:true});
      for(const [key,value] of Object.entries(previous)){
        if(value===undefined) delete process.env[key];
        else process.env[key]=value;
      }
    }
  }

  {
    const original=fs.readFileSync(PROMOTION_TOOL);
    try{
      git(["update-index","--assume-unchanged",PROMOTION_TOOL]);
      fs.writeFileSync(
        PROMOTION_TOOL,
        Buffer.concat([
          original,
          Buffer.from("\nthrow new Error(\"UNREVIEWED_WORKTREE_PROMOTION_EXECUTED\");\n"),
        ]),
      );
      const hiddenWorktreePlan=
        prepareVoidWcVoidOpeningDurableEvidenceCanonicalApplicationV1({
          request_file:requestFile,
          request_file_sha256:requestSha,
          promotion_receipt_bytes:promotionBytes,
          promotion_receipt_file_sha256:sha256(promotionBytes),
        });
      assert.equal(hiddenWorktreePlan.application_plan_id,plan.application_plan_id);
    }finally{
      fs.writeFileSync(PROMOTION_TOOL,original);
      git(["update-index","--no-assume-unchanged",PROMOTION_TOOL],{allowFail:true});
    }
  }

  {
    const head=String(git(["rev-parse","HEAD"]).stdout||"").trim();
    const parent=String(git(["rev-parse","HEAD^"]).stdout||"").trim();
    assert.match(head,/^[0-9a-f]{40}$/u);
    assert.match(parent,/^[0-9a-f]{40}$/u);
    try{
      git(["replace",head,parent]);
      const replacementPlan=
        prepareVoidWcVoidOpeningDurableEvidenceCanonicalApplicationV1({
          request_file:requestFile,
          request_file_sha256:requestSha,
          promotion_receipt_bytes:promotionBytes,
          promotion_receipt_file_sha256:sha256(promotionBytes),
        });
      assert.equal(replacementPlan.application_plan_id,plan.application_plan_id);
    }finally{
      git(["replace","-d",head],{allowFail:true});
    }
  }

  {
    const changed=JSON.parse(fs.readFileSync(requestFile,"utf8"));
    changed.mode="abort";
    const changedBytes=prettyBytes(changed);
    fs.writeFileSync(requestFile,changedBytes,{mode:0o600});
    assert.throws(
      ()=>prepareVoidWcVoidOpeningDurableEvidenceCanonicalApplicationV1({
        request_file:requestFile,
        request_file_sha256:requestSha,
        promotion_receipt_bytes:promotionBytes,
        promotion_receipt_file_sha256:sha256(promotionBytes),
      }),
      /promotion_request_sha256_mismatch/u,
    );
  }

  for(const [key,value] of Object.entries(
    VOID_WC_VOID_OPENING_DURABLE_EVIDENCE_CANONICAL_APPLICATION_AUTHORITY_V1,
  )){
    const allowed=new Set([
      "source_only_application",
      "exact_private_request_required",
      "exact_promotion_receipt_required",
      "durable_promotion_reexecution_required",
      "canonical_head_candidate_bytes_required",
      "reviewed_repository_generation_required",
      "exact_three_field_source_delta",
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

  const source=fs.readFileSync(
    "tools/void-wc-void-opening-durable-evidence-canonical-application-v1.mjs",
    "utf8",
  );
  for(const forbidden of [
    "appendFileSync","renameSync","systemctl",
    "eth_sendRawTransaction","eth_sendTransaction","new Wallet(",
  ]){
    assert.equal(source.includes(forbidden),false,forbidden);
  }
  for(const required of [
    "--no-replace-objects",
    "core.fsmonitor=false",
    "GIT_CONFIG_GLOBAL",
    "reviewedModuleClosure",
    "void-reviewed-node-package-runtime-v1.mjs",
    "--permission",
    "--allow-child-process",
    "OPENING_DURABLE_APPLICATION_PLAN_BASE_SOURCE_MISMATCH",
    "OPENING_DURABLE_APPLICATION_PRODUCTION_CHANGE_SCOPE_INVALID",
    "OPENING_DURABLE_APPLICATION_COUPLED_CHANGE_SCOPE_INVALID",
    "final_coupled_activation_required:true",
  ]){
    assert.equal(source.includes(required),true,required);
  }

  console.log(
    "VOID_WC_VOID_OPENING_DURABLE_EVIDENCE_CANONICAL_APPLICATION_V1_PROOF_GREEN",
  );
  console.log("real_temp_claim_persistence_verified=true");
  console.log("real_temp_replay_persistence_verified=true");
  console.log("durable_promotion_reexecuted=true");
  console.log("reviewed_git_object_execution=true");
  console.log("reviewed_ethers_runtime=true");
  console.log("permission_fenced_execution=true");
  console.log("ambient_git_loader_overrides_ignored=true");
  console.log("hidden_worktree_promotion_not_executed=true");
  console.log("git_replacement_refs_ignored=true");
  console.log("canonical_source_prestates_bound=true");
  console.log("forged_application_plan_held=true");
  console.log("exact_three_field_delta_prepared=true");
  console.log("bounded_canary_green=false");
  console.log("coupled_activation_ready=false");
  console.log("repository_source_write=false");
  console.log("market_activation=false");
  console.log("public_presale_activation=false");
  console.log("funds_movement=false");
}finally{
  fs.rmSync(temp,{recursive:true,force:true});
}
