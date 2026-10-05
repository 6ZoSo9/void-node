#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  VOID_ECONOMIC_EPOCH2_PRODUCTION_GATEWAY_REPLAY_BINDING_RUNTIME_EVIDENCE_V1,
  buildVoidEconomicEpoch2ProductionGatewayReplayBindingRuntimeEvidenceV1,
} from "../tools/void-economic-epoch2-production-gateway-replay-binding-runtime-evidence-v1.mjs";
import {
  VOID_ECONOMIC_EPOCH2_PRODUCTION_GATEWAY_REPLAY_BINDING_RUNTIME_EVIDENCE_IMPORT_V1,
  importVoidEconomicEpoch2ProductionGatewayReplayBindingRuntimeEvidenceV1,
} from "../tools/void-economic-epoch2-production-gateway-replay-binding-runtime-evidence-import-v1.mjs";
import {
  VOID_ECONOMIC_EPOCH2_CROSS_EPOCH_REPLAY_PROTECTION_PROMOTION_V1,
  promoteVoidEconomicEpoch2CrossEpochReplayProtectionV1,
} from "../tools/void-economic-epoch2-cross-epoch-replay-protection-promotion-v1.mjs";
import {
  classifyVoidEconomicEvmSuccessorMigrationV1,
} from "../tools/void-economic-evm-successor-migration-v1.mjs";

const read=(p)=>JSON.parse(fs.readFileSync(p,"utf8"));
const canonicalSourceBinding=read(
  "ops/mainnet0/economic-epoch2-production-gateway-replay-binding-v1.json",
);
const canonicalDurable=read(
  "ops/mainnet0/economic-epoch2-durable-replay-store-v1.json",
);
const replaySourceEquivalence=read(
  "ops/mainnet0/economic-epoch2-durable-replay-store-consume-equivalence-v1.json",
);
const contract=read(
  "ops/mainnet0/economic-epoch2-production-gateway-replay-binding-runtime-evidence-contract-v1.json",
);
const canonicalRawDomain=read(
  "ops/mainnet0/economic-epoch2-raw-transaction-domain-v1.json",
);
const canonicalMigration=read(
  "ops/mainnet0/economic-evm-successor-migration-candidate-v1.json",
);

assert.equal(
  canonicalRawDomain.gates.all_production_validators_epoch_domain_enforced,
  true,
);

assert.equal(
  replaySourceEquivalence.marker,
  "VOID_ECONOMIC_EPOCH2_DURABLE_REPLAY_STORE_CONSUME_EQUIVALENCE_V1",
);
assert.equal(
  replaySourceEquivalence.predecessor.git_blob_sha1,
  "2e4481fbf45200121356f39c278eac5b05a33596",
);
assert.equal(
  replaySourceEquivalence.successor.git_blob_sha1,
  canonicalSourceBinding.source_git_blob_sha1.durable_replay_store,
);
assert.equal(
  replaySourceEquivalence.equivalence.consume_if_fresh_exact_source_match,
  true,
);
assert.equal(
  replaySourceEquivalence.equivalence.receipt_validation_semantics_equivalent,
  true,
);
assert.equal(
  replaySourceEquivalence.equivalence.atomic_consume_path_changed,
  false,
);
assert.equal(
  replaySourceEquivalence.equivalence.runtime_evidence_carry_forward_scope,
  "atomic_consume_path_only",
);
assert.equal(
  replaySourceEquivalence.gateway.inspect_consumed_called,
  false,
);
assert.equal(
  replaySourceEquivalence.historical_runtime_evidence.evidence_file_sha256,
  canonicalSourceBinding.runtime_evidence.evidence_file_sha256,
);
assert.equal(
  replaySourceEquivalence.historical_runtime_evidence.evidence_id,
  canonicalSourceBinding.runtime_evidence.evidence_id,
);
assert.equal(
  replaySourceEquivalence.historical_runtime_evidence.import_evaluated_at_utc,
  canonicalSourceBinding.runtime_evidence.import_evaluated_at_utc,
);
assert.equal(replaySourceEquivalence.authority.runtime_canary_reexecuted,false);
assert.equal(replaySourceEquivalence.authority.atomic_consume_authority_changed,false);
assert.equal(replaySourceEquivalence.authority.runtime_route_active,false);
assert.equal(replaySourceEquivalence.authority.funds_movement,false);

const sourceBinding=structuredClone(canonicalSourceBinding);
const durable=structuredClone(canonicalDurable);
const rawDomain=structuredClone(canonicalRawDomain);
const migration=structuredClone(canonicalMigration);

if(
  canonicalSourceBinding.gates?.production_gateway_replay_store_binding_verified===true
){
  sourceBinding.status=
    "SOURCE_PRODUCTION_GATEWAY_DURABLE_REPLAY_BINDING_GREEN_LIVE_BINDING_HOLD";
  sourceBinding.gates.production_gateway_replay_store_binding_verified=false;
  sourceBinding.gates.cross_epoch_replay_protection_proven=false;
  delete sourceBinding.runtime_evidence;
  sourceBinding.threat_model.production_replay_root_not_selected=true;
  sourceBinding.threat_model.same_uid_production_trust_not_proven=true;
  sourceBinding.threat_model.production_service_identity_not_bound=true;

  durable.status=
    "SOURCE_RUNTIME_DURABLE_REPLAY_STORE_GREEN_PRODUCTION_BINDING_HOLD";
  durable.gates.production_gateway_replay_store_binding_verified=false;
  delete durable.production_runtime_binding;

  rawDomain.status=
    "BESU_PRODUCTION_VALIDATOR_ENFORCEMENT_GREEN_CROSS_EPOCH_HOLD";
  rawDomain.gates.cross_epoch_replay_protection_proven=false;

  migration.replay_and_epoch_safety.cross_epoch_replay_protection_proven=false;
  delete migration.replay_and_epoch_safety
    .production_gateway_replay_store_binding_verified;
  delete migration.replay_and_epoch_safety
    .production_gateway_replay_binding_runtime_evidence;
  delete migration.replay_and_epoch_safety
    .production_gateway_replay_binding_runtime_import;
  Reflect.deleteProperty(
    migration.replay_and_epoch_safety,
    "cross_epoch_replay_protection_promotion",
  );

  migration.successor_execution_layer.production_validator_set_bound=false;
  Reflect.deleteProperty(
    migration.successor_execution_layer,
    "production_validator_set_bound_evidence",
  );
  migration.funds_safety.offline_successor_equivalence_proven=false;
  Reflect.deleteProperty(
    migration.funds_safety,
    "offline_successor_equivalence_evidence",
  );
  Reflect.deleteProperty(
    migration.funds_safety,
    "offline_successor_equivalence_promotion",
  );
}

assert.equal(rawDomain.gates.cross_epoch_replay_protection_proven,false);
assert.equal(
  migration.replay_and_epoch_safety.all_production_validators_epoch_domain_enforced,
  true,
);
assert.equal(
  migration.replay_and_epoch_safety.cross_epoch_replay_protection_proven,
  false,
);

const homeDir="/home/zoso";
const hostName="zoso-Precision-Tower-7810";
const stateDir=path.join(
  homeDir,
  ".local",
  "state",
  "void-economic-epoch2-public-submission-gateway-v1",
);
const facts={
  marker:"VOID_ECONOMIC_EPOCH2_PRODUCTION_GATEWAY_REPLAY_BINDING_RUNTIME_FACTS_V1",
  version:1,
  hostname:hostName,
  service_identity:"void-economic-epoch2-public-submission-gateway-v1.service",
  service_active:true,
  service_main_pid:4242,
  service_uid:1000,
  operator_uid:1000,
  node_exec_path:"/usr/bin/node",
  unit_file_path:path.join(
    homeDir,
    ".config",
    "systemd",
    "user",
    "void-economic-epoch2-public-submission-gateway-v1.service",
  ),
  unit_file_sha256:"1".repeat(64),
  status_file_path:path.join(stateDir,"status-v1.json"),
  status_file_sha256:"2".repeat(64),
  runtime_marker:"VOID_ECONOMIC_EPOCH2_INACTIVE_PUBLIC_SUBMISSION_GATEWAY_RUNTIME_V1",
  gateway_binding_marker:"VOID_ECONOMIC_EPOCH2_PRODUCTION_GATEWAY_REPLAY_BINDING_V1",
  durable_replay_store_marker:"VOID_ECONOMIC_EPOCH2_DURABLE_REPLAY_STORE_V1",
  replay_root:path.join(stateDir,"replay-v1"),
  replay_root_realpath:path.join(stateDir,"replay-v1"),
  replay_root_dev:"123",
  replay_root_ino:"456",
  replay_root_uid:1000,
  replay_root_gid:1000,
  replay_root_mode:"700",
  same_uid_production_trust_proven:true,
  production_replay_root_selected:true,
  production_service_identity_bound:true,
  unit_af_unix_only:true,
  unit_no_new_privileges:true,
  unit_protect_system_strict:true,
  unit_protect_home_read_only:true,
  unit_umask_0077:true,
  runtime_route_active:false,
  public_submission_open:false,
  canary_digest:"0x"+"a".repeat(64),
  canary_fresh_consumed:true,
  canary_replay_rejected_after_reopen:true,
  replay_marker_count_before:1,
  replay_marker_count_after:2,
  preexisting_marker_receipts_verified:true,
  preexisting_markers_preserved:true,
  successful_canary_added_exactly_one_marker:true,
  bounded_canary_replay_store_mutation:true,
  production_store_mutation_scope:
    "one_new_synthetic_digest_marker_preserving_preexisting_markers",
  ephemeral_test_signer_used:true,
  ephemeral_signer_private_key_persisted:false,
  operator_wallet_access:false,
  rpc_call:false,
  transaction_construction:false,
  transaction_signing:false,
  transaction_submission:false,
  transaction_broadcast:false,
  authoritative_chain2050_write:false,
  credential_content_access:false,
  validator_mutation:false,
  token_movement:false,
  funds_movement:false,
  migration_authorized:false,
  public_activation_authorized:false,
};

const evidence=
  buildVoidEconomicEpoch2ProductionGatewayReplayBindingRuntimeEvidenceV1({
    facts,
    observedAtUtc:"2030-01-01T00:00:00Z",
    validUntilUtc:"2030-01-01T00:30:00Z",
    hostName,
    homeDir,
  });
assert.equal(
  evidence.marker,
  VOID_ECONOMIC_EPOCH2_PRODUCTION_GATEWAY_REPLAY_BINDING_RUNTIME_EVIDENCE_V1,
);
const evidenceBytes=Buffer.from(JSON.stringify(evidence,null,2)+"\n","utf8");
const evidenceSha=crypto.createHash("sha256").update(evidenceBytes).digest("hex");

const receipt=
  importVoidEconomicEpoch2ProductionGatewayReplayBindingRuntimeEvidenceV1({
    evidenceBytes,
    expectedFileSha256:evidenceSha,
    expectedEvidenceId:evidence.evidence_id,
    evaluationTimeUtc:"2030-01-01T00:10:00Z",
    sourceBindingPolicy:sourceBinding,
    durableReplayStorePolicy:durable,
    runtimeEvidenceContract:contract,
    rawDomainPolicy:rawDomain,
  });

assert.equal(
  receipt.marker,
  VOID_ECONOMIC_EPOCH2_PRODUCTION_GATEWAY_REPLAY_BINDING_RUNTIME_EVIDENCE_IMPORT_V1,
);
assert.equal(
  receipt.status,
  "PRODUCTION_GATEWAY_REPLAY_BINDING_RUNTIME_EVIDENCE_IMPORTED_PROMOTION_HOLD",
);
assert.equal(receipt.evidence_file_sha256,evidenceSha);
assert.equal(receipt.evidence_id,evidence.evidence_id);
assert.equal(receipt.verification.runtime_evidence_semantically_verified,true);
assert.equal(receipt.verification.evidence_fresh_at_import,true);
assert.equal(receipt.verification.preexisting_marker_receipts_verified,true);
assert.equal(receipt.verification.preexisting_markers_preserved,true);
assert.equal(receipt.verification.successful_canary_added_exactly_one_marker,true);
assert.equal(receipt.gates.production_gateway_replay_store_binding_verified,false);
assert.equal(receipt.gates.cross_epoch_replay_protection_proven,false);
assert.equal(receipt.gates.runtime_route_active,false);
assert.equal(receipt.gates.public_submission_open,false);

const result=
  promoteVoidEconomicEpoch2CrossEpochReplayProtectionV1({
    evidenceBytes,
    importReceipt:receipt,
    sourceBindingPolicy:sourceBinding,
    durableReplayStorePolicy:durable,
    runtimeEvidenceContract:contract,
    rawDomainPolicy:rawDomain,
    migrationCandidate:migration,
  });

assert.equal(
  result.promotion.marker,
  VOID_ECONOMIC_EPOCH2_CROSS_EPOCH_REPLAY_PROTECTION_PROMOTION_V1,
);
assert.equal(
  result.promotion.status,
  "CROSS_EPOCH_REPLAY_PROTECTION_PROMOTED_INACTIVE_ROUTE_MIGRATION_HOLD",
);
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

assert.equal(
  result.updated_source_binding.gates
    .production_gateway_replay_store_binding_verified,
  true,
);
assert.equal(
  result.updated_source_binding.gates.cross_epoch_replay_protection_proven,
  true,
);
assert.equal(result.updated_source_binding.gates.runtime_route_active,false);
assert.equal(result.updated_source_binding.gates.public_submission_open,false);

assert.equal(
  result.updated_durable_replay_store.gates
    .production_gateway_replay_store_binding_verified,
  true,
);
assert.equal(
  result.updated_raw_domain_policy.gates.cross_epoch_replay_protection_proven,
  true,
);
assert.equal(
  result.updated_migration_candidate.replay_and_epoch_safety
    .production_gateway_replay_store_binding_verified,
  true,
);
assert.equal(
  result.updated_migration_candidate.replay_and_epoch_safety
    .cross_epoch_replay_protection_proven,
  true,
);

const classified=
  classifyVoidEconomicEvmSuccessorMigrationV1(
    result.updated_migration_candidate,
  );
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
assert.equal(
  classified.missing_gates.includes("offline_successor_equivalence_proof_required"),
  true,
);
assert.equal(
  classified.missing_gates.includes("successor_state_root_public_void_anchor_required"),
  true,
);
assert.equal(
  classified.missing_gates.includes("public_economic_verification_path_required"),
  true,
);

{
  assert.throws(
    ()=>importVoidEconomicEpoch2ProductionGatewayReplayBindingRuntimeEvidenceV1({
      evidenceBytes,
      expectedFileSha256:"0".repeat(64),
      expectedEvidenceId:evidence.evidence_id,
      evaluationTimeUtc:"2030-01-01T00:10:00Z",
      sourceBindingPolicy:sourceBinding,
      durableReplayStorePolicy:durable,
      runtimeEvidenceContract:contract,
      rawDomainPolicy:rawDomain,
    }),
    /evidence_file_sha256_mismatch/,
  );
}

{
  assert.throws(
    ()=>importVoidEconomicEpoch2ProductionGatewayReplayBindingRuntimeEvidenceV1({
      evidenceBytes,
      expectedFileSha256:evidenceSha,
      expectedEvidenceId:evidence.evidence_id,
      evaluationTimeUtc:"2030-01-01T00:40:00Z",
      sourceBindingPolicy:sourceBinding,
      durableReplayStorePolicy:durable,
      runtimeEvidenceContract:contract,
      rawDomainPolicy:rawDomain,
    }),
    /runtime_evidence_not_current/,
  );
}

{
  const badMigration=structuredClone(migration);
  badMigration.replay_and_epoch_safety.privileged_signer_nonce_or_key_replay_fence_proven=false;
  assert.throws(
    ()=>promoteVoidEconomicEpoch2CrossEpochReplayProtectionV1({
      evidenceBytes,
      importReceipt:receipt,
      sourceBindingPolicy:sourceBinding,
      durableReplayStorePolicy:durable,
      runtimeEvidenceContract:contract,
      rawDomainPolicy:rawDomain,
      migrationCandidate:badMigration,
    }),
    /cross_epoch_replay_prerequisite_missing:privileged_signer_nonce_or_key_replay_fence_proven/,
  );
}

console.log(
  "VOID_ECONOMIC_EPOCH2_REPLAY_RUNTIME_IMPORT_PROMOTION_V1_PROOF_GREEN",
);
console.log("replay_consume_source_equivalence_verified=true");
console.log("runtime_canary_reexecuted=false");
console.log("runtime_evidence_hash_verified=true");
console.log("runtime_evidence_id_verified=true");
console.log("runtime_evidence_semantically_verified=true");
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
