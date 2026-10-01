#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  VOID_WC_VOID_FINAL_COUPLED_ACTIVATION_PROMOTION_AUTHORITY_V1,
  VOID_WC_VOID_FINAL_COUPLED_ACTIVATION_PROMOTION_PREVIEW_V1,
  VOID_WC_VOID_FINAL_COUPLED_ACTIVATION_PROMOTION_V1,
  deriveVoidWcVoidFinalCoupledActivationPromotionV1,
  writeVoidWcVoidFinalCoupledActivationPromotionV1,
} from "../tools/void-wc-void-final-coupled-activation-promotion-v1.mjs";
import {
  classifyVoidWcVoidProductionReadinessV1,
} from "../tools/void-wc-void-production-readiness-v1.mjs";
import {
  classifyVoidCoupledEconomicSuccessorGateV1,
} from "../tools/void-coupled-economic-successor-gate-v1.mjs";
import {
  classifyVoidEconomicEvmSuccessorMigrationV1,
} from "../tools/void-economic-evm-successor-migration-v1.mjs";
import {
  classifyVoidWcVoidCoupledLaunchReadinessV1,
} from "../tools/void-wc-void-coupled-launch-readiness-v1.mjs";

const production = JSON.parse(
  fs.readFileSync(
    "ops/mainnet0/wc-void-production-candidate-v1.json",
    "utf8",
  ),
);
const coupled = JSON.parse(
  fs.readFileSync(
    "ops/mainnet0/coupled-economic-successor-gate-candidate-v1.json",
    "utf8",
  ),
);
const successor = JSON.parse(
  fs.readFileSync(
    "ops/mainnet0/economic-evm-successor-migration-candidate-v1.json",
    "utf8",
  ),
);

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function lineages() {
  const statuses = {
    bounded_canary:
      "CANONICAL_BOUNDED_CANARY_APPLICATION_VERIFIED_FINAL_ACTIVATION_HOLD",
    economic_epoch2_public_verification:
      "EPOCH2_PUBLIC_VERIFICATION_CANONICAL_APPLICATION_VERIFIED_SOURCE_READY",
    ledger_custody:
      "LEDGER_CUSTODY_CANONICAL_APPLICATION_VERIFIED_FINAL_ACTIVATION_HOLD",
    market_vault:
      "MARKET_VAULT_CANONICAL_APPLICATION_STATE_VERIFIED_FINAL_ACTIVATION_HOLD",
    opening_durable:
      "OPENING_DURABLE_EVIDENCE_CANONICAL_APPLICATION_VERIFIED_FINAL_ACTIVATION_HOLD",
    participant_postpurchase:
      "PARTICIPANT_CONTROL_CANONICAL_APPLICATION_VERIFIED_FINAL_ACTIVATION_HOLD",
  };
  return Object.keys(statuses).sort().map((lane, index) => ({
    lane,
    application_plan_id:
      "void_application_plan_" + lane + "_v1",
    application_plan_file_sha256:
      String(index + 1).repeat(64),
    verification_status: statuses[lane],
    verified_applied: true,
  }));
}

function repositoryIdentity() {
  const head = "a".repeat(40);
  return {
    branch: "main",
    head,
    origin: "https://github.com/6ZoSo9/void-node.git",
    remote_head: head,
    tree: "b".repeat(40),
  };
}

function readySuccessor() {
  const value = clone(successor);
  value.status = "SOURCE_READY";
  value.public_verification.successor_state_root_public_void_anchor_ready = true;
  value.public_verification.public_balance_receipt_code_verification_ready = true;
  return value;
}

function readyProductionPreFinal() {
  const value = clone(production);
  value.status = "hold";
  value.market_vault_address =
    "0x1111111111111111111111111111111111111111";
  value.market_vault_runtime_code_sha256 = "2".repeat(64);
  value.market_vault_independently_verified = true;
  value.inventory_funded = true;
  value.inventory_lock_proven = true;
  value.wc_ledger_persistence_verified = true;
  value.quote_reserve_custody_verified = true;
  value.participant_opening_claim_policy_ready = true;
  value.duplicate_replay_protection_proven = true;
  value.bounded_canary_green = true;
  value.coupled_activation_ready = false;
  return value;
}

function readyCoupledPreFinal() {
  const value = clone(coupled);
  value.status = "HOLD";
  value.gates.opening_claim_transfer_or_refund_binding_ready = true;
  value.gates.wc_ledger_persistence_verified = true;
  value.gates.quote_reserve_custody_verified = true;
  value.gates.participant_post_purchase_voidtoken_control_ready = true;
  value.gates.bounded_canary_green = true;
  value.gates.coupled_activation_ready = false;
  return value;
}

assert.equal(
  VOID_WC_VOID_FINAL_COUPLED_ACTIVATION_PROMOTION_V1,
  "VOID_WC_VOID_FINAL_COUPLED_ACTIVATION_PROMOTION_V1",
);
assert.equal(
  VOID_WC_VOID_FINAL_COUPLED_ACTIVATION_PROMOTION_PREVIEW_V1,
  "VOID_WC_VOID_FINAL_COUPLED_ACTIVATION_PROMOTION_PREVIEW_V1",
);
for (const [key, value] of Object.entries(
  VOID_WC_VOID_FINAL_COUPLED_ACTIVATION_PROMOTION_AUTHORITY_V1,
)) {
  if (key === "source_promotion_only" ||
      key === "canonical_candidate_read" ||
      key === "git_application_lineage_read" ||
      key === "candidate_copy_derivation" ||
      key === "create_only_private_output") {
    assert.equal(value, true, key);
  } else {
    assert.equal(value, false, key);
  }
}

const currentProduction =
  classifyVoidWcVoidProductionReadinessV1(production);
assert.equal(currentProduction.ok, false);
assert.equal(currentProduction.status, "HOLD");

const currentSuccessor =
  classifyVoidEconomicEvmSuccessorMigrationV1(successor);
assert.equal(currentSuccessor.ok, false);
assert.equal(currentSuccessor.status, "HOLD");

const productionPre = readyProductionPreFinal();
const coupledPre = readyCoupledPreFinal();
const successorReady = readySuccessor();

const successorDecision =
  classifyVoidEconomicEvmSuccessorMigrationV1(successorReady);
assert.equal(successorDecision.ok, true);
assert.equal(successorDecision.status, "SOURCE_READY");
assert.equal(successorDecision.migration_authorized, false);
assert.equal(successorDecision.public_activation_authorized, false);
assert.equal(successorDecision.money_movement_authorized, false);

const productionBefore =
  classifyVoidWcVoidProductionReadinessV1(productionPre);
assert.equal(productionBefore.ok, false);
assert.equal(productionBefore.reason, "production_gates_incomplete");
assert.deepEqual(
  productionBefore.missing_gates,
  ["coupled_activation_ready_required"],
);

const coupledBefore =
  classifyVoidCoupledEconomicSuccessorGateV1(coupledPre, successorReady);
assert.equal(coupledBefore.ok, false);
assert.equal(coupledBefore.reason, "coupled_economic_gates_incomplete");
assert.deepEqual(
  coupledBefore.missing_gates,
  ["coupled_activation_ready_required"],
);

const preview =
  deriveVoidWcVoidFinalCoupledActivationPromotionV1({
    production_candidate: productionPre,
    coupled_candidate: coupledPre,
    successor_migration_candidate: successorReady,
    applied_lineages: lineages(),
    repository_identity: repositoryIdentity(),
  });

assert.equal(
  preview.marker,
  VOID_WC_VOID_FINAL_COUPLED_ACTIVATION_PROMOTION_PREVIEW_V1,
);
assert.equal(
  preview.status,
  "FINAL_COUPLED_STRUCTURAL_PREVIEW_NOT_SOURCE_VERIFIED",
);
assert.match(preview.preview_id, /^voidwcfcappreview1_[0-9a-f]{64}$/u);
assert.equal(Object.hasOwn(preview, "promotion_id"), false);
assert.equal(preview.authority.source_promotion_only, false);
assert.equal(preview.authority.canonical_candidate_read, false);
assert.equal(preview.authority.git_application_lineage_read, false);
assert.equal(preview.authority.create_only_private_output, false);
assert.match(preview.composition_id, /^sha256:[0-9a-f]{64}$/u);
assert.equal(preview.repository_head_sha, "a".repeat(40));
assert.equal(preview.repository_tree_sha, "b".repeat(40));
assert.equal(
  preview.canonical_remote_url,
  "https://github.com/6ZoSo9/void-node.git",
);
assert.equal(preview.remote_main_sha, "a".repeat(40));
assert.match(preview.production_source_file_sha256, /^[0-9a-f]{64}$/u);
assert.match(preview.production_source_git_blob_sha1, /^[0-9a-f]{40}$/u);
assert.match(preview.coupled_source_file_sha256, /^[0-9a-f]{64}$/u);
assert.match(preview.coupled_source_git_blob_sha1, /^[0-9a-f]{40}$/u);
assert.match(preview.successor_source_file_sha256, /^[0-9a-f]{64}$/u);
assert.match(preview.successor_source_git_blob_sha1, /^[0-9a-f]{40}$/u);
assert.match(preview.production_target_file_sha256, /^[0-9a-f]{64}$/u);
assert.match(preview.production_target_git_blob_sha1, /^[0-9a-f]{40}$/u);
assert.match(preview.coupled_target_file_sha256, /^[0-9a-f]{64}$/u);
assert.match(preview.coupled_target_git_blob_sha1, /^[0-9a-f]{40}$/u);
assert.equal(preview.applied_lineages.length, 6);
assert.deepEqual(preview.final_production_fields, [
  "coupled_activation_ready",
  "status",
]);
assert.deepEqual(preview.final_coupled_fields, [
  "gates.coupled_activation_ready",
  "status",
]);

assert.equal(preview.production_target_candidate.status, "source_ready");
assert.equal(
  preview.production_target_candidate.coupled_activation_ready,
  true,
);
assert.equal(preview.coupled_target_candidate.status, "SOURCE_READY");
assert.equal(
  preview.coupled_target_candidate.gates.coupled_activation_ready,
  true,
);
assert.deepEqual(
  preview.successor_migration_candidate,
  successorReady,
);

const productionAfter =
  classifyVoidWcVoidProductionReadinessV1(
    preview.production_target_candidate,
  );
assert.equal(productionAfter.ok, true);
assert.equal(productionAfter.status, "SOURCE_READY");
assert.equal(productionAfter.activation_authority, false);
assert.equal(productionAfter.funding_authority, false);

const coupledAfter =
  classifyVoidCoupledEconomicSuccessorGateV1(
    preview.coupled_target_candidate,
    preview.successor_migration_candidate,
  );
assert.equal(coupledAfter.ok, true);
assert.equal(coupledAfter.status, "SOURCE_READY");
assert.equal(coupledAfter.market_activation_authorized, false);
assert.equal(coupledAfter.public_presale_activation_authorized, false);
assert.equal(coupledAfter.funds_movement_authorized, false);

const composed =
  classifyVoidWcVoidCoupledLaunchReadinessV1({
    production_candidate: preview.production_target_candidate,
    coupled_candidate: preview.coupled_target_candidate,
    successor_migration_candidate:
      preview.successor_migration_candidate,
  });
assert.equal(composed.ok, true);
assert.equal(composed.status, "SOURCE_READY");
assert.equal(composed.activation_authority, false);
assert.equal(composed.funding_authority, false);
assert.equal(composed.market_activation_authorized, false);
assert.equal(composed.public_presale_activation_authorized, false);
assert.equal(composed.funds_movement_authorized, false);
assert.equal(composed.composition_id, preview.composition_id);

for (const key of [
  "canonical_candidate_files_updated",
  "runtime_activation_authorized",
  "buy_void_process_gates_enabled",
  "public_intake_enabled",
  "market_activation_authorized",
  "public_presale_activation_authorized",
  "funds_movement_authorized",
]) {
  assert.equal(preview[key], false, key);
}

assert.throws(
  () =>
    deriveVoidWcVoidFinalCoupledActivationPromotionV1({
      production_candidate: {
        ...productionPre,
        bounded_canary_green: false,
      },
      coupled_candidate: coupledPre,
      successor_migration_candidate: successorReady,
      applied_lineages: lineages(),
      repository_identity: repositoryIdentity(),
    }),
  /FINAL_COUPLED_PRODUCTION_NONFINAL_GATES_REMAIN/u,
);

assert.throws(
  () =>
    deriveVoidWcVoidFinalCoupledActivationPromotionV1({
      production_candidate: productionPre,
      coupled_candidate: {
        ...coupledPre,
        gates: {
          ...coupledPre.gates,
          participant_post_purchase_voidtoken_control_ready: false,
        },
      },
      successor_migration_candidate: successorReady,
      applied_lineages: lineages(),
      repository_identity: repositoryIdentity(),
    }),
  /FINAL_COUPLED_ECONOMIC_NONFINAL_GATES_REMAIN/u,
);

assert.throws(
  () =>
    deriveVoidWcVoidFinalCoupledActivationPromotionV1({
      production_candidate: productionPre,
      coupled_candidate: coupledPre,
      successor_migration_candidate: successor,
      applied_lineages: lineages(),
      repository_identity: repositoryIdentity(),
    }),
  /FINAL_COUPLED_SUCCESSOR_NOT_SOURCE_READY/u,
);

const missingLineage = lineages().slice(1);
assert.throws(
  () =>
    deriveVoidWcVoidFinalCoupledActivationPromotionV1({
      production_candidate: productionPre,
      coupled_candidate: coupledPre,
      successor_migration_candidate: successorReady,
      applied_lineages: missingLineage,
      repository_identity: repositoryIdentity(),
    }),
  /FINAL_COUPLED_LINEAGE_COUNT_INVALID/u,
);

const unverifiedLineages = lineages();
unverifiedLineages[0] = {
  ...unverifiedLineages[0],
  verified_applied: false,
};
assert.throws(
  () =>
    deriveVoidWcVoidFinalCoupledActivationPromotionV1({
      production_candidate: productionPre,
      coupled_candidate: coupledPre,
      successor_migration_candidate: successorReady,
      applied_lineages: unverifiedLineages,
      repository_identity: repositoryIdentity(),
    }),
  /FINAL_COUPLED_LINEAGE_NOT_VERIFIED_APPLIED/u,
);

assert.equal(
  Object.isFrozen(preview.production_target_candidate),
  true,
);
assert.equal(
  Object.isFrozen(preview.production_target_candidate.authority),
  true,
);
assert.equal(
  Object.isFrozen(preview.coupled_target_candidate.gates),
  true,
);

const outRoot = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-final-coupled-promotion-"),
);
try {
  const output = path.join(outRoot, "promotion.json");
  assert.throws(
    () =>
      writeVoidWcVoidFinalCoupledActivationPromotionV1(
        output,
        preview,
      ),
    /FINAL_COUPLED_OUTPUT_PROMOTION_INVALID/u,
  );
  assert.equal(fs.existsSync(output), false);

  const forged = {
    ...structuredClone(preview),
    marker: VOID_WC_VOID_FINAL_COUPLED_ACTIVATION_PROMOTION_V1,
    status: "FINAL_COUPLED_ACTIVATION_PROMOTION_READY_NOT_ACTIVATED",
    promotion_id: "voidwcfcap1_" + "0".repeat(64),
  };
  delete forged.preview_id;
  assert.throws(
    () =>
      writeVoidWcVoidFinalCoupledActivationPromotionV1(
        output,
        forged,
      ),
    /FINAL_COUPLED_OUTPUT_PROMOTION_INVALID/u,
  );
  assert.equal(fs.existsSync(output), false);
} finally {
  fs.rmSync(outRoot, { recursive: true, force: true });
}

const source = fs.readFileSync(
  "tools/void-wc-void-final-coupled-activation-promotion-v1.mjs",
  "utf8",
);
for (const required of [
  "FINAL_COUPLED_VERIFIED_SOURCE_CAPABILITY",
  "deriveVerifiedVoidWcVoidFinalCoupledActivationPromotionV1",
  "VERIFIED_SOURCE_PROMOTIONS.has(promotion)",
  "FINAL_COUPLED_STRUCTURAL_PREVIEW_NOT_SOURCE_VERIFIED",
]) {
  assert.equal(source.includes(required), true, required);
}
assert.equal(
  source.includes(
    "export function deriveVerifiedVoidWcVoidFinalCoupledActivationPromotionV1",
  ),
  false,
  "verified derivation must remain module-private",
);

for (const forbidden of [
  "eth_sendRawTransaction",
  "systemctl",
  "daemon-reload",
  "new Wallet(",
  "signTransaction(",
]) {
  assert.equal(source.includes(forbidden), false, forbidden);
}

console.log("VOID_WC_VOID_FINAL_COUPLED_ACTIVATION_PROMOTION_V1_PROOF");
console.log("successor_source_ready_required=true");
console.log("six_upstream_applied_lineages_required=true");
console.log("production_nonfinal_gates_must_already_be_green=true");
console.log("coupled_nonfinal_gates_must_already_be_green=true");
console.log("exact_final_production_change_scope=true");
console.log("exact_final_coupled_change_scope=true");
console.log("exact_target_file_hashes_bound=true");
console.log("synthetic_preview_cannot_mint_authoritative_promotion=true");
console.log("synthetic_preview_authoritative_writer_rejected=true");
console.log("verified_cli_private_capability_required=true");
console.log("composite_source_ready_proven=true");
console.log("canonical_candidate_files_updated=false");
console.log("runtime_activation_authorized=false");
console.log("buy_void_process_gates_enabled=false");
console.log("public_intake_enabled=false");
console.log("market_activation_authorized=false");
console.log("public_presale_activation_authorized=false");
console.log("funds_movement_authorized=false");
console.log("VOID_WC_VOID_FINAL_COUPLED_ACTIVATION_PROMOTION_V1_GREEN");
