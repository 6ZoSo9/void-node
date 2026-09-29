#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";

import {
  VOID_ECONOMIC_EPOCH2_PRODUCTION_SUCCESSOR_EQUIVALENCE_EVIDENCE_V1,
  buildVoidEconomicEpoch2ProductionSuccessorEquivalenceEvidenceV1,
} from "../tools/void-economic-epoch2-production-successor-equivalence-evidence-v1.mjs";
import {
  VOID_ECONOMIC_EPOCH2_PRODUCTION_SUCCESSOR_EQUIVALENCE_PROMOTION_V1,
  promoteVoidEconomicEpoch2ProductionSuccessorEquivalenceV1,
} from "../tools/void-economic-epoch2-production-successor-equivalence-promotion-v1.mjs";
import {
  classifyVoidEconomicEvmSuccessorMigrationV1,
} from "../tools/void-economic-evm-successor-migration-v1.mjs";

const read=(p)=>JSON.parse(fs.readFileSync(p,"utf8"));
const binding=read(
  "ops/mainnet0/economic-epoch2-qbft-validator-binding-candidate-v1.json",
);
const migration=read(
  "ops/mainnet0/economic-evm-successor-migration-candidate-v1.json",
);

assert.equal(binding.gates.production_validator_set_bound,false);
assert.equal(binding.gates.offline_successor_equivalence_proven,false);
assert.equal(
  migration.successor_execution_layer.production_validator_set_bound,
  false,
);
assert.equal(
  migration.funds_safety.offline_successor_equivalence_proven,
  false,
);
assert.equal(
  migration.replay_and_epoch_safety.cross_epoch_replay_protection_proven,
  true,
);
assert.equal(
  migration.replay_and_epoch_safety
    .all_production_validators_epoch_domain_enforced,
  true,
);

const facts={
  marker:"VOID_ECONOMIC_EPOCH2_PRODUCTION_SUCCESSOR_EQUIVALENCE_FACTS_V1",
  version:1,
  hostname:"zoso-Precision-Tower-7810",
  source_commit:"1".repeat(40),
  state_manifest_file_sha256:
    "affe08799c73320c6fc4efe4a91772cc1c64f6a3ff6e75c2698ea87d27e306d9",
  state_manifest_material_sha256:
    "286034e3adb1654c13899b959075fcfa2504a6942c83ec52febb156bd0ea2a4f",
  qbft_binding_file_sha256:
    "32b4bac996c952286e7005bac27dbccbaa81f4adc9c6072bff7f9485122e1143",
  qbft_extra_data_evidence_file_sha256:
    "c4a98142cc09ddc2c2a2036ffe5a59a1f7e06ff4b213a2d09f39d20bb698adee",
  qbft_extra_data_sha256:
    "3449e754ec65555e90ea70cdf830f4a8a18946ee5b6221fcf5ad1a748a98c181",
  besu_image:
    "hyperledger/besu@sha256:6f3f21ce533383fcc8db3bce02252b59d5a9e776b72b5a1c8ecd2db011600042",
  genesis_file_sha256:"2".repeat(64),
  builder_evidence_file_sha256:"3".repeat(64),
  state_equivalence_receipt_sha256:"4".repeat(64),
  nonce_continuity_evidence_file_sha256:
    "b89723b6e67a05d7e79b0d5d3c90b32d91dcdb3d08de3b8f685309f887cdd876",
  chain_id:2050,
  network_id:"2050",
  block_number:"0",
  block_hash:"0x"+"5".repeat(64),
  state_root:
    "0x7aef6c030a691569cdb0d033f1b9333c1a07cdc9de0c0fbfb952fddbd96cc2b2",
  nonce_continuity_state_root:
    "0x7aef6c030a691569cdb0d033f1b9333c1a07cdc9de0c0fbfb952fddbd96cc2b2",
  state_root_matches_nonce_continuity_equivalence:true,
  block0_extra_data_exact:true,
  production_qbft_extra_data_bound_into_genesis:true,
  validator_roster_readback_exact:true,
  production_validator_count:3,
  required_validator_quorum:2,
  byzantine_fault_tolerance:0,
  validators:[
    "0xf00436d7e27cec6cd24723ee5a78ce24c0ef5863",
    "0x02f967953386188397b992c208239d3a25180db6",
    "0x461bf06270d9d28962f7570182c061b828799b66",
  ],
  client_specific_state_equivalence_proven:true,
  verified_storage_entry_count:1268,
  native_balance_sum_wei:"0",
  successor_total_supply_atoms:"333333333000000000000000000",
  successor_holder_sum_atoms:"333333333000000000000000000",
  nonce_continuity_account_count:154,
  nonce_only_alloc_account_count:152,
  maximum_nonce:"273",
  all_nonce_readbacks_exact:true,
  all_nonce_only_native_balances_zero:true,
  all_retired_nonce_only_code_absent:true,
  known_retained_raw_transaction_stale_under_exact_nonce_continuity:true,
  production_validator_set_bound:true,
  offline_successor_equivalence_proven:true,
  rpc_scope:"isolated_loopback_disposable_besu",
  p2p_enabled:false,
  discovery_enabled:false,
  transaction_construction:false,
  transaction_signing:false,
  transaction_submission:false,
  transaction_broadcast:false,
  authoritative_chain2050_write:false,
  wallet_access:false,
  private_key_access:false,
  credential_content_access:false,
  validator_mutation:false,
  token_movement:false,
  funds_movement:false,
  migration_authorized:false,
  public_activation_authorized:false,
};

const evidence=
  buildVoidEconomicEpoch2ProductionSuccessorEquivalenceEvidenceV1({
    facts,
    observedAtUtc:"2030-01-01T00:00:00Z",
    hostName:"zoso-Precision-Tower-7810",
  });

assert.equal(
  evidence.marker,
  VOID_ECONOMIC_EPOCH2_PRODUCTION_SUCCESSOR_EQUIVALENCE_EVIDENCE_V1,
);
assert.equal(
  evidence.status,
  "PRODUCTION_VALIDATOR_BOUND_OFFLINE_SUCCESSOR_EQUIVALENCE_EVIDENCE_GREEN",
);
assert.equal(evidence.consensus.production_validator_set_bound,true);
assert.equal(
  evidence.economic_state.offline_successor_equivalence_proven,
  true,
);
assert.equal(evidence.gates.production_validator_set_bound,true);
assert.equal(evidence.gates.offline_successor_equivalence_proven,true);
assert.equal(evidence.gates.cross_epoch_replay_protection_proven,true);
assert.equal(
  evidence.gates.successor_state_root_public_void_anchor_ready,
  false,
);
assert.equal(
  evidence.gates.public_balance_receipt_code_verification_ready,
  false,
);
assert.equal(evidence.gates.migration_authorized,false);
assert.equal(evidence.gates.public_activation_authorized,false);
assert.match(evidence.evidence_id,/^voide2pse1_[0-9a-f]{64}$/);

const evidenceBytes=Buffer.from(
  JSON.stringify(evidence,null,2)+"\n",
  "utf8",
);
const evidenceSha=
  crypto.createHash("sha256").update(evidenceBytes).digest("hex");

const result=
  promoteVoidEconomicEpoch2ProductionSuccessorEquivalenceV1({
    evidenceBytes,
    expectedFileSha256:evidenceSha,
    expectedEvidenceId:evidence.evidence_id,
    bindingCandidate:binding,
    migrationCandidate:migration,
  });

assert.equal(
  result.promotion.marker,
  VOID_ECONOMIC_EPOCH2_PRODUCTION_SUCCESSOR_EQUIVALENCE_PROMOTION_V1,
);
assert.equal(
  result.promotion.status,
  "PRODUCTION_VALIDATOR_SET_BOUND_OFFLINE_SUCCESSOR_EQUIVALENCE_PROMOTED_PUBLIC_EVIDENCE_HOLD",
);
assert.equal(result.promotion.gates.production_validator_set_bound,true);
assert.equal(
  result.promotion.gates.offline_successor_equivalence_proven,
  true,
);
assert.equal(
  result.promotion.gates.all_production_validators_epoch_domain_enforced,
  true,
);
assert.equal(
  result.promotion.gates.cross_epoch_replay_protection_proven,
  true,
);
assert.equal(
  result.promotion.gates.successor_state_root_public_void_anchor_ready,
  false,
);
assert.equal(
  result.promotion.gates.public_balance_receipt_code_verification_ready,
  false,
);
assert.equal(result.promotion.gates.runtime_route_active,false);
assert.equal(result.promotion.gates.public_submission_open,false);
assert.equal(result.promotion.gates.authoritative_chain2050_write,false);
assert.equal(result.promotion.gates.migration_authorized,false);
assert.equal(result.promotion.gates.public_activation_authorized,false);
assert.equal(result.promotion.gates.funds_movement_authorized,false);

assert.equal(
  result.updated_qbft_binding.gates.production_validator_set_bound,
  true,
);
assert.equal(
  result.updated_qbft_binding.gates.offline_successor_equivalence_proven,
  true,
);
assert.equal(
  result.updated_migration_candidate.successor_execution_layer
    .production_validator_set_bound,
  true,
);
assert.equal(
  result.updated_migration_candidate.funds_safety
    .offline_successor_equivalence_proven,
  true,
);

const held=
  classifyVoidEconomicEvmSuccessorMigrationV1(
    result.updated_migration_candidate,
  );
assert.equal(held.ok,false);
assert.equal(held.status,"HOLD");
assert.equal(
  held.missing_gates.includes("offline_successor_equivalence_proof_required"),
  false,
);
assert.equal(
  held.missing_gates.includes("cross_epoch_replay_protection_required"),
  false,
);
assert.equal(
  held.missing_gates.includes(
    "production_validator_epoch_domain_enforcement_required",
  ),
  false,
);
assert.equal(
  held.missing_gates.includes("successor_state_root_public_void_anchor_required"),
  true,
);
assert.equal(
  held.missing_gates.includes("public_economic_verification_path_required"),
  true,
);

{
  const bad=structuredClone(facts);
  bad.state_root="0x"+"6".repeat(64);
  assert.throws(
    ()=>buildVoidEconomicEpoch2ProductionSuccessorEquivalenceEvidenceV1({
      facts:bad,
      observedAtUtc:"2030-01-01T00:00:00Z",
      hostName:"zoso-Precision-Tower-7810",
    }),
    /production_successor_equivalence_facts_invalid/,
  );
}

{
  const bad=structuredClone(facts);
  bad.validators=[...bad.validators].reverse();
  assert.throws(
    ()=>buildVoidEconomicEpoch2ProductionSuccessorEquivalenceEvidenceV1({
      facts:bad,
      observedAtUtc:"2030-01-01T00:00:00Z",
      hostName:"zoso-Precision-Tower-7810",
    }),
    /production_successor_equivalence_facts_invalid/,
  );
}

{
  assert.throws(
    ()=>promoteVoidEconomicEpoch2ProductionSuccessorEquivalenceV1({
      evidenceBytes,
      expectedFileSha256:"0".repeat(64),
      expectedEvidenceId:evidence.evidence_id,
      bindingCandidate:binding,
      migrationCandidate:migration,
    }),
    /evidence_file_sha256_mismatch/,
  );
}

console.log(
  "VOID_ECONOMIC_EPOCH2_PRODUCTION_SUCCESSOR_EQUIVALENCE_V1_PROOF_GREEN",
);
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
