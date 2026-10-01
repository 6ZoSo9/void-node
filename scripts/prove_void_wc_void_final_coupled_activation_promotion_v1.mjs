#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  VOID_WC_VOID_FINAL_COUPLED_ACTIVATION_PROMOTION_AUTHORITY_V1,
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
  const names = [
    "bounded_canary",
    "economic_epoch2_public_verification",
    "ledger_custody",
    "market_vault",
    "opening_durable",
    "participant_postpurchase",
  ];
  return names.map((lane, index) => ({
    lane,
    application_plan_id:
      "void_application_plan_" + lane + "_v1",
    applied_commit_sha:
      String(index + 1).repeat(40),
    application_receipt_sha256:
      String(index + 1).repeat(64),
    verified_applied: true,
  }));
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
for (const [key, value] of Object.entries(
  VOID_WC_VOID_FINAL_COUPLED_ACTIVATION_PROMOTION_AUTHORITY_V1,
)) {
  if (key === "source_promotion_only" ||
      key === "canonical_candidate_read" ||
      key === "git_application_lineage_read" ||
      key === "candidate_copy_derivation") {
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

const promotion =
  deriveVoidWcVoidFinalCoupledActivationPromotionV1({
    production_candidate: productionPre,
    coupled_candidate: coupledPre,
    successor_migration_candidate: successorReady,
    applied_lineages: lineages(),
  });

assert.equal(
  promotion.status,
  "FINAL_COUPLED_ACTIVATION_PROMOTION_READY_NOT_ACTIVATED",
);
assert.match(promotion.promotion_id, /^voidwcfcap1_[0-9a-f]{64}$/u);
assert.match(promotion.composition_id, /^sha256:[0-9a-f]{64}$/u);
assert.match(promotion.production_target_file_sha256, /^[0-9a-f]{64}$/u);
assert.match(promotion.production_target_git_blob_sha1, /^[0-9a-f]{40}$/u);
assert.match(promotion.coupled_target_file_sha256, /^[0-9a-f]{64}$/u);
assert.match(promotion.coupled_target_git_blob_sha1, /^[0-9a-f]{40}$/u);
assert.equal(promotion.applied_lineages.length, 6);
assert.deepEqual(promotion.final_production_fields, [
  "coupled_activation_ready",
  "status",
]);
assert.deepEqual(promotion.final_coupled_fields, [
  "gates.coupled_activation_ready",
  "status",
]);

assert.equal(promotion.production_target_candidate.status, "source_ready");
assert.equal(
  promotion.production_target_candidate.coupled_activation_ready,
  true,
);
assert.equal(promotion.coupled_target_candidate.status, "SOURCE_READY");
assert.equal(
  promotion.coupled_target_candidate.gates.coupled_activation_ready,
  true,
);
assert.deepEqual(
  promotion.successor_migration_candidate,
  successorReady,
);

const productionAfter =
  classifyVoidWcVoidProductionReadinessV1(
    promotion.production_target_candidate,
  );
assert.equal(productionAfter.ok, true);
assert.equal(productionAfter.status, "SOURCE_READY");
assert.equal(productionAfter.activation_authority, false);
assert.equal(productionAfter.funding_authority, false);

const coupledAfter =
  classifyVoidCoupledEconomicSuccessorGateV1(
    promotion.coupled_target_candidate,
    promotion.successor_migration_candidate,
  );
assert.equal(coupledAfter.ok, true);
assert.equal(coupledAfter.status, "SOURCE_READY");
assert.equal(coupledAfter.market_activation_authorized, false);
assert.equal(coupledAfter.public_presale_activation_authorized, false);
assert.equal(coupledAfter.funds_movement_authorized, false);

const composed =
  classifyVoidWcVoidCoupledLaunchReadinessV1({
    production_candidate: promotion.production_target_candidate,
    coupled_candidate: promotion.coupled_target_candidate,
    successor_migration_candidate:
      promotion.successor_migration_candidate,
  });
assert.equal(composed.ok, true);
assert.equal(composed.status, "SOURCE_READY");
assert.equal(composed.activation_authority, false);
assert.equal(composed.funding_authority, false);
assert.equal(composed.market_activation_authorized, false);
assert.equal(composed.public_presale_activation_authorized, false);
assert.equal(composed.funds_movement_authorized, false);
assert.equal(composed.composition_id, promotion.composition_id);

for (const key of [
  "canonical_candidate_files_updated",
  "runtime_activation_authorized",
  "buy_void_process_gates_enabled",
  "public_intake_enabled",
  "market_activation_authorized",
  "public_presale_activation_authorized",
  "funds_movement_authorized",
]) {
  assert.equal(promotion[key], false, key);
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
    }),
  /FINAL_COUPLED_LINEAGE_NOT_VERIFIED_APPLIED/u,
);

assert.equal(
  Object.isFrozen(promotion.production_target_candidate),
  true,
);
assert.equal(
  Object.isFrozen(promotion.production_target_candidate.authority),
  true,
);
assert.equal(
  Object.isFrozen(promotion.coupled_target_candidate.gates),
  true,
);

const outRoot = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-final-coupled-promotion-"),
);
try {
  const output = path.join(outRoot, "promotion.json");
  const persisted =
    writeVoidWcVoidFinalCoupledActivationPromotionV1(
      output,
      promotion,
    );
  assert.equal(persisted.output_path, output);
  assert.match(persisted.output_sha256, /^[0-9a-f]{64}$/u);
  assert.ok(persisted.output_bytes > 0);
  assert.equal(fs.statSync(output).mode & 0o777, 0o600);
  const parsed = JSON.parse(fs.readFileSync(output, "utf8"));
  assert.equal(parsed.promotion_id, promotion.promotion_id);
  assert.equal(
    parsed.production_target_file_sha256,
    promotion.production_target_file_sha256,
  );
  assert.equal(
    parsed.coupled_target_file_sha256,
    promotion.coupled_target_file_sha256,
  );
  assert.throws(
    () =>
      writeVoidWcVoidFinalCoupledActivationPromotionV1(
        output,
        promotion,
      ),
    /FINAL_COUPLED_OUTPUT_ALREADY_EXISTS/u,
  );
} finally {
  fs.rmSync(outRoot, { recursive: true, force: true });
}

const source = fs.readFileSync(
  "tools/void-wc-void-final-coupled-activation-promotion-v1.mjs",
  "utf8",
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
console.log("private_create_only_promotion_artifact_verified=true");
console.log("composite_source_ready_proven=true");
console.log("canonical_candidate_files_updated=false");
console.log("runtime_activation_authorized=false");
console.log("buy_void_process_gates_enabled=false");
console.log("public_intake_enabled=false");
console.log("market_activation_authorized=false");
console.log("public_presale_activation_authorized=false");
console.log("funds_movement_authorized=false");
console.log("VOID_WC_VOID_FINAL_COUPLED_ACTIVATION_PROMOTION_V1_GREEN");
