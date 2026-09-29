#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  VOID_ECONOMIC_EPOCH2_CROSS_EPOCH_REPLAY_CLOSURE_AUTHORITY_V1,
  VOID_ECONOMIC_EPOCH2_CROSS_EPOCH_REPLAY_CLOSURE_V1,
  classifyVoidEconomicEpoch2CrossEpochReplayClosureV1,
} from "../tools/void-economic-epoch2-cross-epoch-replay-closure-v1.mjs";

function readJson(path) {
  return JSON.parse(fs.readFileSync(path, "utf8"));
}

const migration = readJson(
  "ops/mainnet0/economic-evm-successor-migration-candidate-v1.json",
);
const rawDomain = readJson(
  "ops/mainnet0/economic-epoch2-raw-transaction-domain-v1.json",
);
const gateway = readJson(
  "ops/mainnet0/economic-epoch2-production-gateway-replay-binding-v1.json",
);
const fence = readJson(
  "ops/mainnet0/economic-epoch2-privileged-signer-replay-fence-v1.json",
);
const census = readJson(
  "ops/mainnet0/economic-epoch2-signed-artifact-census-closeout-v1.json",
);
const binding = readJson(
  "ops/mainnet0/economic-epoch2-qbft-validator-binding-candidate-v1.json",
);

function classify(overrides = {}) {
  return classifyVoidEconomicEpoch2CrossEpochReplayClosureV1({
    migration_candidate:
      overrides.migration_candidate ?? migration,
    raw_domain_policy:
      overrides.raw_domain_policy ?? rawDomain,
    gateway_replay_binding:
      overrides.gateway_replay_binding ?? gateway,
    privileged_signer_replay_fence:
      overrides.privileged_signer_replay_fence ?? fence,
    signed_artifact_census_closeout:
      overrides.signed_artifact_census_closeout ?? census,
    qbft_binding_candidate:
      overrides.qbft_binding_candidate ?? binding,
  });
}

const canonical = classify();
assert.equal(canonical.ok, true);
assert.equal(
  canonical.status,
  "SOURCE_CLOSURE_READY_LIVE_RUNTIME_HOLD",
);
assert.equal(
  canonical.marker,
  VOID_ECONOMIC_EPOCH2_CROSS_EPOCH_REPLAY_CLOSURE_V1,
);
assert.match(canonical.closure_id, /^sha256:[0-9a-f]{64}$/u);
assert.deepEqual(
  canonical.validator_roles,
  ["precision", "nimo", "xiphos"],
);
assert.equal(canonical.validator_count, 3);
assert.equal(
  canonical.pending_legacy_signed_transaction_census_complete,
  true,
);
assert.equal(
  canonical.privileged_signer_nonce_or_key_replay_fence_proven,
  true,
);
assert.equal(canonical.raw_transaction_epoch_domain_defined, true);
assert.equal(canonical.raw_transaction_epoch_domain_runtime_proven, true);
assert.equal(canonical.durable_replay_store_source_bound, true);
assert.equal(
  canonical.all_production_validators_epoch_domain_enforced,
  false,
);
assert.equal(
  canonical.production_gateway_replay_store_binding_verified,
  false,
);
assert.deepEqual(canonical.missing_live_gates, [
  "all_production_validators_epoch_domain_enforced",
  "production_gateway_replay_store_binding_verified",
]);
assert.equal(canonical.source_prerequisites_verified, true);
assert.equal(
  canonical.upstream_live_evidence_semantically_verified,
  false,
);
assert.equal(
  canonical.cross_epoch_replay_protection_promotable,
  false,
);
assert.equal(canonical.cross_epoch_replay_protection_proven, false);
assert.equal(canonical.migration_authorized, false);
assert.equal(canonical.public_activation_authorized, false);
assert.equal(canonical.funds_movement_authorized, false);

const promotedMigration = structuredClone(migration);
promotedMigration.replay_and_epoch_safety
  .all_production_validators_epoch_domain_enforced = true;

const promotedRawDomain = structuredClone(rawDomain);
promotedRawDomain.gates
  .all_production_validators_epoch_domain_enforced = true;

const promotedGateway = structuredClone(gateway);
promotedGateway.gates
  .production_gateway_replay_store_binding_verified = true;

const promotionInputs = classify({
  migration_candidate: promotedMigration,
  raw_domain_policy: promotedRawDomain,
  gateway_replay_binding: promotedGateway,
});
assert.equal(
  promotionInputs.status,
  "PROMOTION_INPUTS_PRESENT_UPSTREAM_LIVE_EVIDENCE_REVALIDATION_REQUIRED",
);
assert.deepEqual(promotionInputs.missing_live_gates, []);
assert.equal(
  promotionInputs.all_production_validators_epoch_domain_enforced,
  true,
);
assert.equal(
  promotionInputs.production_gateway_replay_store_binding_verified,
  true,
);
assert.equal(
  promotionInputs.cross_epoch_replay_protection_promotable,
  true,
);
assert.equal(
  promotionInputs.upstream_live_evidence_semantically_verified,
  false,
);
assert.equal(
  promotionInputs.cross_epoch_replay_protection_proven,
  false,
);
assert.equal(promotionInputs.migration_authorized, false);
assert.equal(promotionInputs.public_activation_authorized, false);
assert.equal(promotionInputs.funds_movement_authorized, false);

{
  const bad = structuredClone(promotedMigration);
  bad.replay_and_epoch_safety.cross_epoch_replay_protection_proven =
    true;
  assert.throws(
    () => classify({
      migration_candidate: bad,
      raw_domain_policy: promotedRawDomain,
      gateway_replay_binding: promotedGateway,
    }),
    /cross_epoch_replay_migration_prerequisite_mismatch/,
  );
}

{
  const bad = structuredClone(rawDomain);
  bad.gates.all_production_validators_epoch_domain_enforced = true;
  assert.throws(
    () => classify({ raw_domain_policy: bad }),
    /cross_epoch_replay_validator_gate_disagreement/,
  );
}

{
  const bad = structuredClone(fence);
  bad.decision.privileged_signer_nonce_or_key_replay_fence_proven =
    false;
  assert.throws(
    () => classify({ privileged_signer_replay_fence: bad }),
    /cross_epoch_replay_privileged_signer_fence_invalid/,
  );
}

{
  const bad = structuredClone(census);
  bad.decision.pending_legacy_signed_transaction_census_complete =
    false;
  assert.throws(
    () => classify({ signed_artifact_census_closeout: bad }),
    /cross_epoch_replay_signed_artifact_census_invalid/,
  );
}

{
  const bad = structuredClone(binding);
  bad.qbft.production_binding_entries[0].machine_role = "other";
  assert.throws(
    () => classify({ qbft_binding_candidate: bad }),
    /cross_epoch_replay_qbft_binding_identity_set_invalid/,
  );
}

for (const [key, value] of Object.entries(
  VOID_ECONOMIC_EPOCH2_CROSS_EPOCH_REPLAY_CLOSURE_AUTHORITY_V1,
)) {
  if (key === "source_classification_only") {
    assert.equal(value, true, key);
  } else {
    assert.equal(value, false, key);
  }
}

const source = fs.readFileSync(
  "tools/void-economic-epoch2-cross-epoch-replay-closure-v1.mjs",
  "utf8",
);
for (const forbidden of [
  "JsonRpcProvider(",
  "eth_sendRawTransaction",
  "eth_sendTransaction",
  "new Wallet(",
  "writeFileSync",
  "appendFileSync",
  "renameSync",
  "systemctl",
]) {
  assert.equal(source.includes(forbidden), false, forbidden);
}

console.log(
  "VOID_ECONOMIC_EPOCH2_CROSS_EPOCH_REPLAY_CLOSURE_V1_PROOF_GREEN",
);
console.log("source_prerequisites_verified=true");
console.log(
  "canonical_missing_live_gate_1=all_production_validators_epoch_domain_enforced",
);
console.log(
  "canonical_missing_live_gate_2=production_gateway_replay_store_binding_verified",
);
console.log(
  "synthetic_live_flags_still_require_upstream_revalidation=true",
);
console.log(
  "upstream_live_evidence_semantically_verified=false",
);
console.log("cross_epoch_replay_protection_proven=false");
console.log("migration_authorized=false");
console.log("public_activation_authorized=false");
console.log("funds_movement=false");
