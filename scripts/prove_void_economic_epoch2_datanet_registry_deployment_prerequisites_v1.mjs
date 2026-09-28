#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

const packet = JSON.parse(
  fs.readFileSync(
    "ops/mainnet0/economic-epoch2-datanet-registry-deployment-prerequisites-v1.json",
    "utf8",
  ),
);
const compiled = JSON.parse(
  fs.readFileSync(
    "ops/mainnet0/datanet-content-commitment-compiled-identity-v1.json",
    "utf8",
  ),
);
const migration = JSON.parse(
  fs.readFileSync(
    "ops/mainnet0/economic-evm-successor-migration-candidate-v1.json",
    "utf8",
  ),
);
const anchor = JSON.parse(
  fs.readFileSync(
    "public/public-node/evidence/economic-epoch2-public-void-state-root-anchor-v1.json",
    "utf8",
  ),
);

assert.equal(
  packet.marker,
  "VOID_ECONOMIC_EPOCH2_DATANET_REGISTRY_DEPLOYMENT_PREREQUISITES_V1",
);
assert.equal(packet.version, 1);
assert.equal(
  packet.status,
  "HOLD_FRESH_READ_ONLY_DEPLOYER_NONCE_BALANCE_AND_CREATE_ADDRESS_RESOLUTION_REQUIRED",
);
assert.equal(packet.chain_id, 2050);
assert.equal(packet.execution_epoch, 2);

assert.deepEqual(packet.anchor_tuple, {
  object_id: anchor.object_id,
  object_id_sha256: anchor.commitment.object_id_sha256,
  content_sha256:
    "e0d6cff588a13315f7a63ff246895440b2d2faf858d8f228912a508ffa88f4d4",
  byte_length: 3203,
});

assert.equal(
  packet.registry_source.contract_path,
  compiled.source.contract_path,
);
assert.equal(
  packet.registry_source.contract_name,
  compiled.source.contract_name,
);
assert.equal(
  packet.registry_source.contract_source_sha256,
  compiled.source.contract_source_sha256,
);
assert.equal(
  packet.registry_source.compiled_identity_id,
  compiled.identity_id,
);
assert.equal(
  packet.registry_source.constructor_signature,
  compiled.deployment_identity_requirements.constructor_signature,
);
assert.equal(
  packet.registry_source.registry_version,
  compiled.deployment_identity_requirements.live_registry_version_must_equal,
);
assert.equal(
  packet.registry_source.max_object_bytes,
  compiled.deployment_identity_requirements.live_max_object_bytes_must_equal,
);

assert.equal(
  packet.deployment_policy.predecessor_mode,
  "GENESIS_ZERO_PREDECESSOR_ONLY_V1",
);
assert.equal(
  packet.deployment_policy.predecessor_address,
  "0x0000000000000000000000000000000000000000",
);
assert.equal(packet.deployment_policy.publisher_selection_required, false);
assert.equal(
  packet.deployment_policy.publisher_address,
  "0x926aa1d35824e6957fae1a05510e6cc6a0d57be6",
);
assert.equal(
  packet.deployment_policy.publisher_selection_artifact,
  "ops/mainnet0/datanet-content-commitment-publisher-selection-v1.json",
);
assert.equal(
  packet.deployment_policy.publisher_selection_receipt_sha256,
  "119d634591a324d6b5cd4736ff97d21ad527a69ad6f4a6982fc6ebd360ce701a",
);
assert.equal(packet.deployment_policy.deployer_selection_required, false);
assert.equal(
  packet.deployment_policy.deployer_address,
  "0x6c93ddfcc4116574fe66d63c1c67daedc0070dbb",
);
assert.equal(
  packet.deployment_policy.deployer_credential_id,
  "datanet-content-commitment-registry-deployer-wallet-v1",
);
assert.equal(
  packet.deployment_policy.deployer_selection_artifact,
  "ops/mainnet0/datanet-content-commitment-registry-deployer-selection-v1.json",
);
assert.equal(
  packet.deployment_policy.deployer_selection_receipt_sha256,
  "81a43d3c245b5badfa975c7ab998094359f62872600d533453df6cab8ed68cb3",
);
assert.equal(packet.deployment_policy.deployer_nonce_observation_required, true);
assert.equal(packet.deployment_policy.deployer_native_balance_observation_required, true);
assert.equal(packet.deployment_policy.predicted_registry_address_vacancy_required, true);
assert.equal(
  packet.deployment_policy.publisher_credential_id,
  "datanet-content-commitment-publisher-wallet-v1",
);
assert.equal(
  packet.deployment_policy.implicit_publisher_selection_forbidden,
  true,
);
assert.equal(packet.deployment_policy.registry_contract_address, null);
assert.equal(packet.deployment_policy.deployment_transaction_evidence_present, false);
assert.equal(packet.deployment_policy.deployment_block_evidence_present, false);
assert.equal(packet.deployment_policy.minimum_confirmations, "12");

assert.equal(compiled.unresolved.registry_contract_address, null);
assert.equal(compiled.unresolved.deployment_transaction_hash, null);
assert.equal(compiled.unresolved.deployment_block_hash, null);
assert.equal(compiled.unresolved.publisher_address, null);
assert.equal(compiled.unresolved.predecessor_address, null);
assert.equal(compiled.unresolved.predecessor_lineage_attested, false);
assert.equal(compiled.unresolved.transaction_construction_authorized, false);
assert.equal(compiled.unresolved.transaction_signing_authorized, false);
assert.equal(compiled.unresolved.transaction_broadcast_authorized, false);
assert.equal(compiled.unresolved.chain2050_write_authorized, false);

assert.equal(
  migration.ceremony_key_continuity.recorded_public_addresses
    .premine_treasury_primary,
  "0x54ded2daa618a257093556a5f54c43805b9bd516",
);
assert.equal(
  packet.legacy_authority_context.legacy_void_treasury_admin_address,
  "0x4e77786f32d41e40e7cef28389068d6f31f1d6a2",
);
assert.equal(
  packet.legacy_authority_context.legacy_void_treasury_admin_migrates,
  false,
);
assert.equal(
  packet.legacy_authority_context
    .legacy_address_is_not_automatic_datanet_publisher,
  true,
);

assert.equal(packet.current_truth.compiled_identity_reviewed, true);
assert.equal(packet.current_truth.compiled_identity_committed, false);
assert.equal(packet.current_truth.registry_deployed_and_attested, false);
assert.equal(packet.current_truth.predecessor_lineage_attested, false);
assert.equal(packet.current_truth.publisher_selected, true);
assert.equal(packet.current_truth.publisher_selection_source_bound, true);
assert.equal(packet.current_truth.deployer_selected, true);
assert.equal(packet.current_truth.deployer_selection_source_bound, true);
assert.equal(packet.current_truth.deployer_nonce_observed, false);
assert.equal(packet.current_truth.deployer_native_balance_observed, false);
assert.equal(packet.current_truth.registry_contract_address_resolved, false);
assert.equal(packet.current_truth.predicted_registry_address_vacancy_observed, false);
assert.equal(packet.current_truth.anchor_payload_publicly_retrievable, true);
assert.equal(packet.current_truth.anchor_payload_chain2050_committed, false);
assert.equal(
  packet.current_truth.successor_state_root_public_void_anchor_ready,
  false,
);

assert.equal(
  migration.public_verification
    .successor_genesis_or_state_manifest_public_evidence_ready,
  true,
);
assert.equal(
  migration.public_verification.successor_state_root_public_void_anchor_ready,
  false,
);

for (const [key, value] of Object.entries(packet.authority)) {
  if (key === "source_only") {
    assert.equal(value, true, key);
  } else {
    assert.equal(value, false, key);
  }
}

assert.equal(
  packet.next_gate,
  "fresh_read_only_chain2050_deployer_nonce_balance_and_create_address_vacancy_resolution",
);

console.log(
  "VOID_ECONOMIC_EPOCH2_DATANET_REGISTRY_DEPLOYMENT_PREREQUISITES_V1_GREEN",
);
console.log("publisher_selected=true");
console.log("publisher_selection_source_bound=true");
console.log("deployer_selected=true");
console.log("deployer_selection_source_bound=true");
console.log("deployer_nonce_observed=false");
console.log("registry_contract_address_resolved=false");
console.log("implicit_legacy_publisher_reuse=false");
console.log("predecessor_mode=GENESIS_ZERO_PREDECESSOR_ONLY_V1");
console.log("registry_deployed_and_attested=false");
console.log("transaction_construction=false");
console.log("transaction_signing=false");
console.log("transaction_broadcast=false");
console.log("chain2050_write=false");
console.log("successor_state_root_public_void_anchor_ready=false");
