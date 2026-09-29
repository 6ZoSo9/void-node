#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  VOID_ECONOMIC_EVM_SUCCESSOR_MIGRATION_V1,
  classifyVoidEconomicEvmSuccessorMigrationV1,
} from "../tools/void-economic-evm-successor-migration-v1.mjs";

import {
  VOID_COUPLED_ECONOMIC_SUCCESSOR_GATE_V1,
  classifyVoidCoupledEconomicSuccessorGateFromDecisionV1,
} from "../tools/void-coupled-economic-successor-gate-v1.mjs";

const successorCandidate = JSON.parse(
  fs.readFileSync(
    "ops/mainnet0/economic-evm-successor-migration-candidate-v1.json",
    "utf8",
  ),
);
const coupledCandidate = JSON.parse(
  fs.readFileSync(
    "ops/mainnet0/coupled-economic-successor-gate-candidate-v1.json",
    "utf8",
  ),
);

const readySuccessorCandidate = structuredClone(successorCandidate);

Object.assign(readySuccessorCandidate.ceremony_key_continuity, {
  ceremony_backup_continuity_verified: true,
  successor_role_to_ceremony_address_map_verified: true,
});

Object.assign(readySuccessorCandidate.funds_safety, {
  offline_successor_equivalence_proven: true,
});

Object.assign(readySuccessorCandidate.replay_and_epoch_safety, {
  execution_epoch_bound_in_public_gateway: true,
  privileged_signer_nonce_or_key_replay_fence_proven: true,
  pending_legacy_signed_transaction_census_complete: true,
  raw_transaction_epoch_domain_defined: true,
  raw_transaction_epoch_domain_source_proven: true,
  besu_transaction_validation_rule_implemented: true,
  plugin_artifact_content_addressed: true,
  plugin_artifact_runtime_identity_verified: true,
  besu_transaction_validation_rule_runtime_proven: true,
  all_production_validators_epoch_domain_enforced: true,
  cross_epoch_replay_protection_proven: true,
});

Object.assign(readySuccessorCandidate.public_verification, {
  migration_manifest_content_addressed: true,
  successor_genesis_or_state_manifest_public_evidence_ready: true,
  successor_state_root_public_void_anchor_ready: true,
  public_balance_receipt_code_verification_ready: true,
});

const successorReady =
  classifyVoidEconomicEvmSuccessorMigrationV1(readySuccessorCandidate);

assert.equal(successorReady.ok, true);
assert.equal(successorReady.status, "SOURCE_READY");
assert.equal(
  successorReady.marker,
  VOID_ECONOMIC_EVM_SUCCESSOR_MIGRATION_V1,
);
assert.equal(successorReady.voidtoken_same_address_preserved, true);
assert.equal(successorReady.voidtoken_legacy_runtime_reused, false);
assert.equal(successorReady.voidtoken_successor_runtime_reviewed, true);
assert.equal(
  successorReady.voidtoken_successor_runtime_semantic_equivalence_verified,
  true,
);
assert.equal(
  successorReady.voidtoken_balance_and_supply_equivalence_verified,
  true,
);
assert.equal(
  Object.hasOwn(successorReady, "voidtoken_runtime_identity_verified"),
  false,
);

const readyCoupledCandidate = structuredClone(coupledCandidate);
readyCoupledCandidate.status = "SOURCE_READY";
for (const key of Object.keys(readyCoupledCandidate.gates)) {
  readyCoupledCandidate.gates[key] = true;
}

const coupledReady =
  classifyVoidCoupledEconomicSuccessorGateFromDecisionV1(
    readyCoupledCandidate,
    successorReady,
  );

assert.equal(coupledReady.ok, true);
assert.equal(coupledReady.status, "SOURCE_READY");
assert.equal(coupledReady.marker, VOID_COUPLED_ECONOMIC_SUCCESSOR_GATE_V1);
assert.equal(coupledReady.chain_id, 2050);
assert.equal(coupledReady.execution_epoch, 2);
assert.equal(coupledReady.successor_migration_authorized, false);
assert.equal(coupledReady.market_activation_authorized, false);
assert.equal(coupledReady.public_presale_activation_authorized, false);
assert.equal(coupledReady.funds_movement_authorized, false);

{
  const obsoleteRuntimeIdentityOnly = structuredClone(successorReady);
  obsoleteRuntimeIdentityOnly.voidtoken_runtime_identity_verified = true;
  obsoleteRuntimeIdentityOnly.voidtoken_successor_runtime_reviewed = false;

  const held = classifyVoidCoupledEconomicSuccessorGateFromDecisionV1(
    readyCoupledCandidate,
    obsoleteRuntimeIdentityOnly,
  );
  assert.equal(held.ok, false);
  assert.equal(held.status, "HOLD");
  assert.equal(
    held.missing_gates.includes(
      "economic_successor_migration_source_ready_required",
    ),
    true,
  );
}

{
  const semanticMismatch = structuredClone(successorReady);
  semanticMismatch.voidtoken_successor_runtime_semantic_equivalence_verified =
    false;

  const held = classifyVoidCoupledEconomicSuccessorGateFromDecisionV1(
    readyCoupledCandidate,
    semanticMismatch,
  );
  assert.equal(held.ok, false);
  assert.equal(held.status, "HOLD");
}

{
  const legacyReuse = structuredClone(successorReady);
  legacyReuse.voidtoken_legacy_runtime_reused = true;

  const held = classifyVoidCoupledEconomicSuccessorGateFromDecisionV1(
    readyCoupledCandidate,
    legacyReuse,
  );
  assert.equal(held.ok, false);
  assert.equal(held.status, "HOLD");
}

const coupledSource = fs.readFileSync(
  "tools/void-coupled-economic-successor-gate-v1.mjs",
  "utf8",
);

assert.doesNotMatch(
  coupledSource,
  /decision\.voidtoken_runtime_identity_verified\s*===\s*true/,
);
assert.match(
  coupledSource,
  /decision\.voidtoken_legacy_runtime_reused\s*===\s*false/,
);
assert.match(
  coupledSource,
  /decision\.voidtoken_successor_runtime_reviewed\s*===\s*true/,
);
assert.match(
  coupledSource,
  /decision\.voidtoken_successor_runtime_semantic_equivalence_verified\s*===\s*true/,
);

console.log("VOID_COUPLED_SUCCESSOR_RUNTIME_SEMANTIC_SEAM_V1_GREEN");
console.log("obsolete_runtime_identity_predicate_removed=true");
console.log("voidtoken_same_address_preserved=true");
console.log("voidtoken_legacy_runtime_reused=false");
console.log("voidtoken_successor_runtime_reviewed=true");
console.log("voidtoken_successor_runtime_semantic_equivalence_verified=true");
console.log("upstream_source_ready_shape_composes=true");
console.log("migration_authorized=false");
console.log("market_activation=false");
console.log("funds_movement=false");
