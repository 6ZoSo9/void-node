#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";

import {
  importVoidEconomicEpoch2ProductionGatewayReplayBindingRuntimeEvidenceV1,
} from "../tools/void-economic-epoch2-production-gateway-replay-binding-runtime-evidence-import-v1.mjs";
import {
  promoteVoidEconomicEpoch2CrossEpochReplayProtectionV1,
} from "../tools/void-economic-epoch2-cross-epoch-replay-protection-promotion-v1.mjs";
import {
  classifyVoidEconomicEvmSuccessorMigrationV1,
} from "../tools/void-economic-evm-successor-migration-v1.mjs";

const expected={
  evidence:"9dcf63514e6bdb2daf2a099ef3676b04ed2cffc71699932190f590864f4e5d99",
  import_receipt:"ae147de5c5539341a68ff3013467ee6ec8aa1cce5efca940816787ec1a5c1be8",
  promotion:"0cf3b7a4dda7e134bbcb342f58fc8bf7cf15f7d37399c9256a347051b1b08abe",
  durable:"12699f65ad6abfdcbbde6f29e0c985375c22fb996d27cccca528cbc93223575c",
  binding:"2d140bad71f25ef2ab133094ef532bcbd490c64dc84194a313537740232aa306",
  raw_domain:"abd18f6d3231e88b0737c341991d4b98787ad84eec44c65695ab590b1bee372d",
  migration:"fcb573730cf260e87e09d504d6cf286901c23418825d5439ad102c30b8de43cc",
};
const evidenceId=
  "voide2gre1_0b6e8edc4220370e3e811f075063a6a7636fefb713f1be27e17aef319ae6719a";

const paths={
  evidence:
    "ops/mainnet0/economic-epoch2-production-gateway-replay-binding-runtime-evidence-v1.json",
  import_receipt:
    "ops/mainnet0/economic-epoch2-production-gateway-replay-binding-runtime-evidence-import-v1.json",
  promotion:
    "ops/mainnet0/economic-epoch2-cross-epoch-replay-protection-promotion-v1.json",
  durable:
    "ops/mainnet0/economic-epoch2-durable-replay-store-v1.json",
  binding:
    "ops/mainnet0/economic-epoch2-production-gateway-replay-binding-v1.json",
  raw_domain:
    "ops/mainnet0/economic-epoch2-raw-transaction-domain-v1.json",
  migration:
    "ops/mainnet0/economic-evm-successor-migration-candidate-v1.json",
};

function bytes(path){ return fs.readFileSync(path); }
function json(path){ return JSON.parse(fs.readFileSync(path,"utf8")); }
function sha256(value){
  return crypto.createHash("sha256").update(value).digest("hex");
}

const observed={};
for(const [key,path] of Object.entries(paths)){
  const b=bytes(path);
  observed[key]=b;
  if(key!=="migration"){
    assert.equal(sha256(b),expected[key],key);
  }
}

const evidence=JSON.parse(observed.evidence.toString("utf8"));
const receipt=JSON.parse(observed.import_receipt.toString("utf8"));
const committedPromotion=JSON.parse(observed.promotion.toString("utf8"));
const committedDurable=JSON.parse(observed.durable.toString("utf8"));
const committedBinding=JSON.parse(observed.binding.toString("utf8"));
const committedRaw=JSON.parse(observed.raw_domain.toString("utf8"));
const canonicalMigration=JSON.parse(observed.migration.toString("utf8"));
const committedMigration=structuredClone(canonicalMigration);
if(
  committedMigration.successor_execution_layer?.production_validator_set_bound===
  true
){
  committedMigration.successor_execution_layer.production_validator_set_bound=false;
  Reflect.deleteProperty(
    committedMigration.successor_execution_layer,
    "production_validator_set_bound_evidence",
  );
  committedMigration.funds_safety.offline_successor_equivalence_proven=false;
  Reflect.deleteProperty(
    committedMigration.funds_safety,
    "offline_successor_equivalence_evidence",
  );
  Reflect.deleteProperty(
    committedMigration.funds_safety,
    "offline_successor_equivalence_promotion",
  );
}
const replayStageMigrationBytes=Buffer.from(
  JSON.stringify(committedMigration,null,2)+"\n",
  "utf8",
);
assert.equal(sha256(replayStageMigrationBytes),expected.migration,"migration");
const contract=json(
  "ops/mainnet0/economic-epoch2-production-gateway-replay-binding-runtime-evidence-contract-v1.json",
);

assert.equal(evidence.evidence_id,evidenceId);
assert.equal(receipt.evidence_id,evidenceId);
assert.equal(receipt.evidence_file_sha256,expected.evidence);
assert.equal(receipt.import_evaluated_at_utc,"2026-09-29T17:32:16Z");
assert.equal(receipt.verification.evidence_file_sha256_verified,true);
assert.equal(receipt.verification.evidence_id_verified,true);
assert.equal(receipt.verification.evidence_id_material_verified,true);
assert.equal(receipt.verification.runtime_evidence_semantically_verified,true);
assert.equal(receipt.verification.evidence_fresh_at_import,true);
assert.equal(receipt.verification.preexisting_marker_receipts_verified,true);
assert.equal(receipt.verification.preexisting_markers_preserved,true);
assert.equal(receipt.verification.successful_canary_added_exactly_one_marker,true);
assert.equal(receipt.verification.canary_fresh_consumed,true);
assert.equal(receipt.verification.canary_replay_rejected_after_reopen,true);
assert.equal(receipt.runtime_binding.replay_marker_count_before,1);
assert.equal(receipt.runtime_binding.replay_marker_count_after,2);

assert.equal(
  committedBinding.gates.production_gateway_replay_store_binding_verified,
  true,
);
assert.equal(committedBinding.gates.cross_epoch_replay_protection_proven,true);
assert.equal(committedBinding.gates.runtime_route_active,false);
assert.equal(committedBinding.gates.public_submission_open,false);

assert.equal(
  committedDurable.gates.production_gateway_replay_store_binding_verified,
  true,
);
assert.equal(committedDurable.gates.runtime_route_active,false);
assert.equal(committedDurable.gates.public_submission_open,false);

assert.equal(committedRaw.gates.all_production_validators_epoch_domain_enforced,true);
assert.equal(committedRaw.gates.cross_epoch_replay_protection_proven,true);
assert.equal(committedRaw.gates.migration_authorized,false);
assert.equal(committedRaw.gates.public_activation_authorized,false);

assert.equal(
  committedMigration.replay_and_epoch_safety
    .production_gateway_replay_store_binding_verified,
  true,
);
assert.equal(
  committedMigration.replay_and_epoch_safety.cross_epoch_replay_protection_proven,
  true,
);
assert.equal(committedMigration.launch_authority.chain2050_write,false);
assert.equal(committedMigration.launch_authority.transaction_broadcast,false);
assert.equal(committedMigration.launch_authority.public_activation,false);
assert.equal(committedMigration.launch_authority.money_movement,false);

const preBinding=structuredClone(committedBinding);
preBinding.status=
  "SOURCE_PRODUCTION_GATEWAY_DURABLE_REPLAY_BINDING_GREEN_LIVE_BINDING_HOLD";
preBinding.gates.production_gateway_replay_store_binding_verified=false;
preBinding.gates.cross_epoch_replay_protection_proven=false;
delete preBinding.runtime_evidence;
preBinding.threat_model.production_replay_root_not_selected=true;
preBinding.threat_model.same_uid_production_trust_not_proven=true;
preBinding.threat_model.production_service_identity_not_bound=true;

const preDurable=structuredClone(committedDurable);
preDurable.status=
  "SOURCE_RUNTIME_DURABLE_REPLAY_STORE_GREEN_PRODUCTION_BINDING_HOLD";
preDurable.gates.production_gateway_replay_store_binding_verified=false;
delete preDurable.production_runtime_binding;

const preRaw=structuredClone(committedRaw);
preRaw.status=
  "BESU_PRODUCTION_VALIDATOR_ENFORCEMENT_GREEN_CROSS_EPOCH_HOLD";
preRaw.gates.cross_epoch_replay_protection_proven=false;

const preMigration=structuredClone(committedMigration);
preMigration.replay_and_epoch_safety.cross_epoch_replay_protection_proven=false;
delete preMigration.replay_and_epoch_safety
  .production_gateway_replay_store_binding_verified;
delete preMigration.replay_and_epoch_safety
  .production_gateway_replay_binding_runtime_evidence;
delete preMigration.replay_and_epoch_safety
  .production_gateway_replay_binding_runtime_import;
delete preMigration.replay_and_epoch_safety
  .cross_epoch_replay_protection_promotion;

const regeneratedReceipt=
  importVoidEconomicEpoch2ProductionGatewayReplayBindingRuntimeEvidenceV1({
    evidenceBytes:observed.evidence,
    expectedFileSha256:expected.evidence,
    expectedEvidenceId:evidenceId,
    evaluationTimeUtc:receipt.import_evaluated_at_utc,
    sourceBindingPolicy:preBinding,
    durableReplayStorePolicy:preDurable,
    runtimeEvidenceContract:contract,
    rawDomainPolicy:preRaw,
  });
assert.deepEqual(regeneratedReceipt,receipt);

const result=promoteVoidEconomicEpoch2CrossEpochReplayProtectionV1({
  evidenceBytes:observed.evidence,
  importReceipt:receipt,
  sourceBindingPolicy:preBinding,
  durableReplayStorePolicy:preDurable,
  runtimeEvidenceContract:contract,
  rawDomainPolicy:preRaw,
  migrationCandidate:preMigration,
});

assert.deepEqual(result.promotion,committedPromotion);
assert.deepEqual(result.updated_source_binding,committedBinding);
assert.deepEqual(result.updated_durable_replay_store,committedDurable);
assert.deepEqual(result.updated_raw_domain_policy,committedRaw);
assert.deepEqual(result.updated_migration_candidate,committedMigration);

assert.equal(result.promotion.verification.evidence_file_hash_verified,true);
assert.equal(result.promotion.verification.evidence_id_verified,true);
assert.equal(result.promotion.verification.evidence_semantically_reverified,true);
assert.equal(result.promotion.verification.evidence_fresh_at_import,true);
assert.equal(
  result.promotion.gates.production_gateway_replay_store_binding_verified,
  true,
);
assert.equal(result.promotion.gates.cross_epoch_replay_protection_proven,true);
assert.equal(result.promotion.gates.runtime_route_active,false);
assert.equal(result.promotion.gates.public_submission_open,false);
assert.equal(result.promotion.gates.transaction_submission,false);
assert.equal(result.promotion.gates.transaction_broadcast,false);
assert.equal(result.promotion.gates.authoritative_chain2050_write,false);
assert.equal(result.promotion.gates.migration_authorized,false);
assert.equal(result.promotion.gates.public_activation_authorized,false);
assert.equal(result.promotion.gates.funds_movement_authorized,false);

const classified=classifyVoidEconomicEvmSuccessorMigrationV1(committedMigration);
assert.equal(classified.ok,false);
assert.equal(classified.status,"HOLD");
assert.equal(
  classified.missing_gates.includes("cross_epoch_replay_protection_required"),
  false,
);
assert.equal(
  classified.missing_gates.includes(
    "production_validator_epoch_domain_enforcement_required",
  ),
  false,
);
for(const gate of [
  "offline_successor_equivalence_proof_required",
  "successor_state_root_public_void_anchor_required",
  "public_economic_verification_path_required",
]){
  assert.ok(classified.missing_gates.includes(gate),gate);
}

console.log(
  "VOID_ECONOMIC_EPOCH2_COMMITTED_REAL_CROSS_EPOCH_REPLAY_PROMOTION_V1_GREEN",
);
console.log("evidence_sha256_verified="+expected.evidence);
console.log("import_receipt_sha256_verified="+expected.import_receipt);
console.log("promotion_sha256_verified="+expected.promotion);
console.log("durable_policy_sha256_verified="+expected.durable);
console.log("binding_policy_sha256_verified="+expected.binding);
console.log("raw_domain_sha256_verified="+expected.raw_domain);
console.log("replay_stage_migration_sha256_verified="+expected.migration);
console.log("runtime_evidence_semantically_reverified=true");
console.log("runtime_evidence_fresh_at_import=true");
console.log("production_gateway_replay_store_binding_verified=true");
console.log("cross_epoch_replay_protection_proven=true");
console.log("cross_epoch_replay_protection_gate_remaining=false");
console.log("runtime_route_active=false");
console.log("public_submission_open=false");
console.log("authoritative_chain2050_write=false");
console.log("migration_authorized=false");
console.log("public_activation_authorized=false");
console.log("funds_movement=false");
