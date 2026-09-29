#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";

import {
  promoteVoidEconomicEpoch2ProductionValidatorRuntimeEnforcementV1,
} from "../tools/void-economic-epoch2-production-validator-runtime-enforcement-promotion-v1.mjs";
import {
  classifyVoidEconomicEvmSuccessorMigrationV1,
} from "../tools/void-economic-evm-successor-migration-v1.mjs";

const roles=["precision","nimo","xiphos"];
const expected={
  precision:{
    evidence_sha256:"d06089355eebb0e12ce5923d5723d68b078c9e4e1969a198dea80e37beeb7c36",
    import_sha256:"63745814854d431c3aef0f8bd33fe0eba61aad56d720a6ef6e8d337f892af20a",
    evidence_id:"voide2ve1_de71932e1d8b1e9545872015dcceaa755ed8fe5e89bd0d795ffd498fd2710e1b",
  },
  nimo:{
    evidence_sha256:"b1729ddf8b3bd7223f1110f9244214bcb74e201a8b4ef0ab711377d610b570ec",
    import_sha256:"c6ce50ae232404d8d2ea9e3a8864b152621692cb4f9a3c0592fb84040b6c3b71",
    evidence_id:"voide2ve1_ca2d4c54cfd0436aa8859231ef5b3b5486eaaea529575a44f7b536fbc0f53b53",
  },
  xiphos:{
    evidence_sha256:"c1c74916ee54224e1391da6d11cbc3ddd054b4d2ab9f9374a03d38354e940b3f",
    import_sha256:"d4bd9c98d0220af07b727543768034e88530e42136e257886ac6f31efee5c82e",
    evidence_id:"voide2ve1_3456e043718d9541f2cc97a699c03398f243156eab66f9dbaab1701a76ac9750",
  },
};
const canonicalHashes={
  promotion:"5c50bcb3b08d2d21557cea3326956d0bc08f3843436edb3def782ba721189b22",
};

function sha256(bytes){
  return crypto.createHash("sha256").update(bytes).digest("hex");
}
function readJson(file){
  return JSON.parse(fs.readFileSync(file,"utf8"));
}
function evidencePath(role){
  return `ops/mainnet0/economic-epoch2-production-validator-runtime-evidence-${role}-v1.json`;
}
function importPath(role){
  return `ops/mainnet0/economic-epoch2-production-validator-runtime-evidence-${role}-import-v1.json`;
}

const canonicalBinding=readJson(
  "ops/mainnet0/economic-epoch2-qbft-validator-binding-candidate-v1.json",
);
const binding=structuredClone(canonicalBinding);
if(binding?.gates?.production_validator_set_bound===true){
  binding.status="HOLD";
  binding.gates.production_validator_set_bound=false;
  binding.gates.offline_successor_equivalence_proven=false;
  Reflect.deleteProperty(binding,"production_successor_equivalence");
}
const artifact=readJson(
  "ops/mainnet0/economic-epoch2-besu-raw-transaction-validator-plugin-artifact-v1.json",
);

const promotionPath=
  "ops/mainnet0/economic-epoch2-production-validator-runtime-enforcement-promotion-v1.json";
const rawDomainPath=
  "ops/mainnet0/economic-epoch2-raw-transaction-domain-v1.json";
const migrationPath=
  "ops/mainnet0/economic-evm-successor-migration-candidate-v1.json";

const promotionBytes=fs.readFileSync(promotionPath);
const rawDomainBytes=fs.readFileSync(rawDomainPath);
const migrationBytes=fs.readFileSync(migrationPath);

assert.equal(sha256(promotionBytes),canonicalHashes.promotion);

const committedPromotion=JSON.parse(promotionBytes.toString("utf8"));
const committedRawDomain=JSON.parse(rawDomainBytes.toString("utf8"));
const committedMigration=JSON.parse(migrationBytes.toString("utf8"));

assert.equal(
  committedRawDomain.gates.all_production_validators_epoch_domain_enforced,
  true,
);
assert.equal(
  committedMigration.replay_and_epoch_safety
    .all_production_validators_epoch_domain_enforced,
  true,
);
assert.equal(
  committedMigration.replay_and_epoch_safety.cross_epoch_replay_protection_proven,
  true,
);

const postValidatorRawDomain=structuredClone(committedRawDomain);
postValidatorRawDomain.status=
  "BESU_PRODUCTION_VALIDATOR_ENFORCEMENT_GREEN_CROSS_EPOCH_HOLD";
postValidatorRawDomain.gates.cross_epoch_replay_protection_proven=false;

const postValidatorMigration=structuredClone(committedMigration);
postValidatorMigration.successor_execution_layer.production_validator_set_bound=false;
Reflect.deleteProperty(
  postValidatorMigration.successor_execution_layer,
  "production_validator_set_bound_evidence",
);
postValidatorMigration.funds_safety.offline_successor_equivalence_proven=false;
Reflect.deleteProperty(
  postValidatorMigration.funds_safety,
  "offline_successor_equivalence_evidence",
);
Reflect.deleteProperty(
  postValidatorMigration.funds_safety,
  "offline_successor_equivalence_promotion",
);
postValidatorMigration.replay_and_epoch_safety.cross_epoch_replay_protection_proven=
  false;
delete postValidatorMigration.replay_and_epoch_safety
  .production_gateway_replay_store_binding_verified;
delete postValidatorMigration.replay_and_epoch_safety
  .production_gateway_replay_binding_runtime_evidence;
delete postValidatorMigration.replay_and_epoch_safety
  .production_gateway_replay_binding_runtime_import;
delete postValidatorMigration.replay_and_epoch_safety
  .cross_epoch_replay_protection_promotion;

const rawDomainStart=structuredClone(postValidatorRawDomain);
rawDomainStart.status="BESU_RUNTIME_VALIDATOR_GREEN_PRODUCTION_ENFORCEMENT_HOLD";
rawDomainStart.besu_validation_boundary.all_production_validators_enforce_rule=false;
rawDomainStart.gates.all_production_validators_epoch_domain_enforced=false;

const migrationStart=structuredClone(postValidatorMigration);
migrationStart.replay_and_epoch_safety
  .all_production_validators_epoch_domain_enforced=false;
delete migrationStart.replay_and_epoch_safety
  .production_validator_runtime_enforcement_evidence;

const evidenceBytesByRole=Object.create(null);
const importReceiptsByRole=Object.create(null);

for(const role of roles){
  const eBytes=fs.readFileSync(evidencePath(role));
  const iBytes=fs.readFileSync(importPath(role));
  const receipt=JSON.parse(iBytes.toString("utf8"));
  const evidence=JSON.parse(eBytes.toString("utf8"));

  assert.equal(sha256(eBytes),expected[role].evidence_sha256);
  assert.equal(sha256(iBytes),expected[role].import_sha256);
  assert.equal(evidence.evidence_id,expected[role].evidence_id);
  assert.equal(receipt.evidence_id,expected[role].evidence_id);
  assert.equal(receipt.evidence_file_sha256,expected[role].evidence_sha256);
  assert.equal(receipt.verification.runtime_evidence_semantically_verified,true);
  assert.equal(receipt.verification.evidence_fresh_at_import,true);
  assert.equal(receipt.gates.all_production_validators_epoch_domain_enforced,false);
  assert.equal(receipt.gates.cross_epoch_replay_protection_proven,false);

  evidenceBytesByRole[role]=eBytes;
  importReceiptsByRole[role]=receipt;
}

const result=
  promoteVoidEconomicEpoch2ProductionValidatorRuntimeEnforcementV1({
    bindingCandidate:binding,
    rawDomainPolicy:rawDomainStart,
    pluginArtifactManifest:artifact,
    migrationCandidate:migrationStart,
    evidenceBytesByRole,
    importReceiptsByRole,
  });

assert.deepEqual(result.promotion,committedPromotion);
assert.deepEqual(result.updated_raw_domain_policy,postValidatorRawDomain);
assert.deepEqual(result.updated_migration_candidate,postValidatorMigration);

assert.equal(
  result.promotion.verification.all_three_import_receipts_verified,
  true,
);
assert.equal(
  result.promotion.verification.all_three_evidence_file_hashes_verified,
  true,
);
assert.equal(
  result.promotion.verification.all_three_runtime_rows_semantically_verified,
  true,
);
assert.equal(
  result.promotion.gates.all_production_validators_epoch_domain_enforced,
  true,
);
assert.equal(
  result.promotion.gates.cross_epoch_replay_protection_proven,
  false,
);
assert.equal(result.promotion.gates.migration_authorized,false);
assert.equal(result.promotion.gates.public_activation_authorized,false);
assert.equal(result.promotion.gates.funds_movement_authorized,false);

const classified=
  classifyVoidEconomicEvmSuccessorMigrationV1(
    result.updated_migration_candidate,
  );
assert.equal(classified.ok,false);
assert.equal(classified.status,"HOLD");
assert.equal(
  classified.missing_gates.includes(
    "production_validator_epoch_domain_enforcement_required",
  ),
  false,
);
assert.equal(
  classified.missing_gates.includes("cross_epoch_replay_protection_required"),
  true,
);

console.log(
  "VOID_ECONOMIC_EPOCH2_COMMITTED_REAL_VALIDATOR_RUNTIME_ENFORCEMENT_V1_GREEN",
);
console.log("validator_count=3");
console.log("real_machine_evidence_hashes_verified=true");
console.log("real_machine_import_receipts_verified=true");
console.log("real_machine_runtime_rows_semantically_reverified=true");
console.log("canonical_promotion_bytes_verified=true");
console.log("validator_stage_reconstructed_from_canonical_replay_state=true");
console.log("all_production_validators_epoch_domain_enforced=true");
console.log("production_validator_epoch_domain_enforcement_gate_remaining=false");
console.log("cross_epoch_replay_protection_proven=false");
console.log("cross_epoch_replay_protection_gate_remaining=true");
console.log("migration_authorized=false");
console.log("public_activation_authorized=false");
