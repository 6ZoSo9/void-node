#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";

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
  _internal,
  prepareVoidWcVoidLedgerCustodyCanonicalApplicationV1,
  verifyVoidWcVoidLedgerCustodyCanonicalApplicationStateV1,
  verifyVoidWcVoidLedgerCustodyCanonicalApplicationV1,
} from "../tools/void-wc-void-ledger-custody-canonical-application-v1.mjs";

const PRODUCTION="ops/mainnet0/wc-void-production-candidate-v1.json";
const COUPLED="ops/mainnet0/coupled-economic-successor-gate-candidate-v1.json";
const SUCCESSOR="ops/mainnet0/economic-evm-successor-migration-candidate-v1.json";

function git(...args){
  const result=spawnSync(
    "/usr/bin/git",
    ["--no-replace-objects","-C",process.cwd(),...args],
    {
      encoding:"utf8",
      env:{
        PATH:"/usr/bin:/bin",
        LANG:"C",
        LC_ALL:"C",
        GIT_CONFIG_NOSYSTEM:"1",
        GIT_OPTIONAL_LOCKS:"0",
        GIT_TERMINAL_PROMPT:"0",
      },
      stdio:["ignore","pipe","pipe"],
    },
  );
  assert.equal(result.status,0,result.stderr||result.stdout);
  return String(result.stdout||"").trim();
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

const plan=prepareVoidWcVoidLedgerCustodyCanonicalApplicationV1({
  ledger_import_input_bytes:inputBytes,
  ledger_import_input_file_sha256:sha256(inputBytes),
  promotion_receipt_bytes:promotionBytes,
  promotion_receipt_file_sha256:sha256(promotionBytes),
});

assert.equal(
  plan.marker,
  VOID_WC_VOID_LEDGER_CUSTODY_CANONICAL_APPLICATION_PLAN_V1,
);
assert.equal(plan.status,"LEDGER_CUSTODY_CANONICAL_APPLICATION_PREPARED");
assert.match(plan.application_plan_id,/^voidwclcca1_[0-9a-f]{64}$/u);
assert.equal(plan.application_base_head_sha,head);
assert.equal(plan.application_base_tree_sha,tree);
assert.equal(plan.promotion_id,promotion.promotion_id);
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
    "filesystem_read",
  ]);
  assert.equal(value,allowed.has(key),key);
}

const source=fs.readFileSync(
  "tools/void-wc-void-ledger-custody-canonical-application-v1.mjs",
  "utf8",
);
for(const forbidden of [
  "writeFileSync","appendFileSync","renameSync","unlinkSync",
  "systemctl","eth_sendRawTransaction","eth_sendTransaction","new Wallet(",
]){
  assert.equal(source.includes(forbidden),false,forbidden);
}
for(const required of [
  "--no-replace-objects",
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
