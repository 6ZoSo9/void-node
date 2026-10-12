#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";

import {
  promoteVoidEconomicEpoch2ProductionSuccessorEquivalenceV1,
} from "../tools/void-economic-epoch2-production-successor-equivalence-promotion-v1.mjs";
import {
  classifyVoidEconomicEvmSuccessorMigrationV1,
} from "../tools/void-economic-evm-successor-migration-v1.mjs";

const expected={
  evidence:"5006aa32a298c0fbcea6395e75201af66fedacde5b664ac953699dfb2f0c061b",
  promotion:"a8f1143a9a37ff424e3053e8bc9db4d974f89a3cbec0f06d6356ada8e9f6c91a",
  binding:"169a1a1e4941bc3e85bc5afe27aff98e11f7729edc6f08deecedc0829c7d9960",
  migration:"59b3970ee6210dbeab4f635b7b3cd6779b605d472d87c7e4d5fb3e8d7c69036f",
};
const evidenceId=
  "voide2pse1_a10332cc6dcd89bc0988d865946185a22e9a448ce94bde7861512af2b1b8e973";

const paths={
  evidence:
    "ops/mainnet0/economic-epoch2-production-successor-equivalence-evidence-v1.json",
  promotion:
    "ops/mainnet0/economic-epoch2-production-successor-equivalence-promotion-v1.json",
  binding:
    "ops/mainnet0/economic-epoch2-qbft-validator-binding-candidate-v1.json",
  migration:
    "ops/mainnet0/economic-evm-successor-migration-candidate-v1.json",
};

const bytes=(p)=>fs.readFileSync(p);
const json=(p)=>JSON.parse(fs.readFileSync(p,"utf8"));
const sha256=(b)=>crypto.createHash("sha256").update(b).digest("hex");

const observed={};
for(const [key,p] of Object.entries(paths)){
  observed[key]=bytes(p);
  assert.equal(sha256(observed[key]),expected[key],key);
}

const evidence=JSON.parse(observed.evidence.toString("utf8"));
const promotion=JSON.parse(observed.promotion.toString("utf8"));
const binding=JSON.parse(observed.binding.toString("utf8"));
const migration=JSON.parse(observed.migration.toString("utf8"));

assert.equal(evidence.evidence_id,evidenceId);
assert.equal(evidence.runtime_artifacts.state_root,
  "0x7aef6c030a691569cdb0d033f1b9333c1a07cdc9de0c0fbfb952fddbd96cc2b2");
assert.equal(evidence.consensus.validator_roster_readback_exact,true);
assert.equal(evidence.gates.production_validator_set_bound,true);
assert.equal(evidence.gates.offline_successor_equivalence_proven,true);
assert.equal(evidence.gates.cross_epoch_replay_protection_proven,true);
assert.equal(evidence.gates.successor_state_root_public_void_anchor_ready,false);
assert.equal(evidence.gates.public_balance_receipt_code_verification_ready,false);

assert.equal(binding.gates.production_validator_set_bound,true);
assert.equal(binding.gates.offline_successor_equivalence_proven,true);
assert.equal(
  binding.production_successor_equivalence.evidence_file_sha256,
  expected.evidence,
);
assert.equal(
  binding.production_successor_equivalence.evidence_id,
  evidenceId,
);

assert.equal(
  migration.successor_execution_layer.production_validator_set_bound,
  true,
);
assert.equal(
  migration.funds_safety.offline_successor_equivalence_proven,
  true,
);
assert.equal(
  migration.replay_and_epoch_safety.cross_epoch_replay_protection_proven,
  true,
);
assert.equal(
  migration.public_verification.successor_state_root_public_void_anchor_ready,
  false,
);
assert.equal(
  migration.public_verification.public_balance_receipt_code_verification_ready,
  false,
);
assert.equal(migration.launch_authority.chain2050_write,false);
assert.equal(migration.launch_authority.transaction_broadcast,false);
assert.equal(migration.launch_authority.public_activation,false);
assert.equal(migration.launch_authority.money_movement,false);

const preBinding=structuredClone(binding);
preBinding.status="HOLD";
preBinding.gates.production_validator_set_bound=false;
preBinding.gates.offline_successor_equivalence_proven=false;
delete preBinding.production_successor_equivalence;

const preMigration=structuredClone(migration);
preMigration.successor_execution_layer.production_validator_set_bound=false;
delete preMigration.successor_execution_layer
  .production_validator_set_bound_evidence;
preMigration.funds_safety.offline_successor_equivalence_proven=false;
delete preMigration.funds_safety.offline_successor_equivalence_evidence;
delete preMigration.funds_safety.offline_successor_equivalence_promotion;

const regenerated=
  promoteVoidEconomicEpoch2ProductionSuccessorEquivalenceV1({
    evidenceBytes:observed.evidence,
    expectedFileSha256:expected.evidence,
    expectedEvidenceId:evidenceId,
    bindingCandidate:preBinding,
    migrationCandidate:preMigration,
  });

assert.deepEqual(regenerated.promotion,promotion);
assert.deepEqual(regenerated.updated_qbft_binding,binding);
assert.deepEqual(regenerated.updated_migration_candidate,migration);

assert.equal(regenerated.promotion.gates.production_validator_set_bound,true);
assert.equal(regenerated.promotion.gates.offline_successor_equivalence_proven,true);
assert.equal(regenerated.promotion.gates.cross_epoch_replay_protection_proven,true);
assert.equal(
  regenerated.promotion.gates.successor_state_root_public_void_anchor_ready,
  false,
);
assert.equal(
  regenerated.promotion.gates.public_balance_receipt_code_verification_ready,
  false,
);
assert.equal(regenerated.promotion.gates.authoritative_chain2050_write,false);
assert.equal(regenerated.promotion.gates.migration_authorized,false);
assert.equal(regenerated.promotion.gates.public_activation_authorized,false);
assert.equal(regenerated.promotion.gates.funds_movement_authorized,false);

const held=classifyVoidEconomicEvmSuccessorMigrationV1(migration);
assert.equal(held.ok,false);
assert.equal(held.status,"HOLD");
for(const gate of [
  "offline_successor_equivalence_proof_required",
  "production_validator_epoch_domain_enforcement_required",
  "cross_epoch_replay_protection_required",
]){
  assert.equal(held.missing_gates.includes(gate),false,gate);
}
for(const gate of [
  "successor_state_root_public_void_anchor_required",
  "public_economic_verification_path_required",
]){
  assert.equal(held.missing_gates.includes(gate),true,gate);
}

console.log(
  "VOID_ECONOMIC_EPOCH2_COMMITTED_REAL_PRODUCTION_SUCCESSOR_EQUIVALENCE_V1_GREEN",
);
console.log("evidence_sha256_verified="+expected.evidence);
console.log("promotion_sha256_verified="+expected.promotion);
console.log("qbft_binding_sha256_verified="+expected.binding);
console.log("migration_candidate_sha256_verified="+expected.migration);
console.log("production_state_root="+evidence.runtime_artifacts.state_root);
console.log("production_validator_set_bound=true");
console.log("offline_successor_equivalence_proven=true");
console.log("offline_successor_equivalence_gate_remaining=false");
console.log("cross_epoch_replay_protection_proven=true");
console.log("successor_state_root_public_void_anchor_ready=false");
console.log("public_balance_receipt_code_verification_ready=false");
console.log("authoritative_chain2050_write=false");
console.log("migration_authorized=false");
console.log("public_activation_authorized=false");
console.log("funds_movement=false");
