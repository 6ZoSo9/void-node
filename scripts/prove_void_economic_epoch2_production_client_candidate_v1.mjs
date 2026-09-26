#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

const path =
  "ops/mainnet0/economic-epoch2-production-client-candidate-v1.json";
const c = JSON.parse(fs.readFileSync(path, "utf8"));

assert.equal(c.marker, "VOID_ECONOMIC_EPOCH2_PRODUCTION_CLIENT_CANDIDATE_V1");
assert.equal(c.version, 1);
assert.equal(c.status, "CANDIDATE_RUNTIME_PROBE_GREEN_GENESIS_PENDING");
assert.equal(c.chain_id, 2050);
assert.equal(c.execution_epoch, 2);

assert.equal(c.client.name, "Besu");
assert.equal(c.client.project, "besu-eth/besu");
assert.equal(c.client.version, "26.8.1");
assert.equal(c.client.docker_image, "hyperledger/besu:26.8.1");
assert.equal(
  c.client.docker_image_digest_sha256,
  "6f3f21ce533383fcc8db3bce02252b59d5a9e776b72b5a1c8ecd2db011600042",
);
assert.equal(
  c.client.docker_image_id_sha256,
  "f3713c713ca4f9e89c09e1478d2a85116ba9ce8343129d709420ba2af009598b",
);
assert.equal(
  c.client.version_output,
  "besu/v26.8.1/linux-x86_64/openjdk-java-25",
);
assert.equal(c.client.release_commit, "d97cbd6");
assert.equal(c.client.production_non_dev_client, true);

assert.equal(c.consensus.engine, "QBFT");
assert.equal(c.consensus.external_consensus_client_required, false);
assert.equal(c.consensus.block_header_validator_selection, true);
assert.equal(c.consensus.block_period_seconds, 5);
assert.equal(c.consensus.epoch_length, 30000);
assert.equal(c.consensus.request_timeout_seconds, 10);
assert.equal(c.consensus.production_validator_set_bound, false);
assert.equal(
  c.consensus.offline_placeholder_qbft_extra_data,
  "0xf87aa00000000000000000000000000000000000000000000000000000000000000000f854941000000000000000000000000000000000000001942000000000000000000000000000000000000002943000000000000000000000000000000000000003944000000000000000000000000000000000000004c080c0",
);
assert.equal(c.consensus.placeholder_private_keys_exist, false);
assert.equal(c.consensus.placeholder_validator_authority, false);
assert.equal(
  c.consensus.placeholder_validator_set_must_not_ship_to_production,
  true,
);
assert.deepEqual(
  c.consensus.placeholder_validator_set_for_offline_genesis_proof_only,
  [
    "0x1000000000000000000000000000000000000001",
    "0x2000000000000000000000000000000000000002",
    "0x3000000000000000000000000000000000000003",
    "0x4000000000000000000000000000000000000004",
  ],
);

assert.equal(c.genesis_profile.chain_id, 2050);
assert.equal(c.genesis_profile.berlin_block, 0);
assert.equal(c.genesis_profile.london_block, 0);
assert.equal(c.genesis_profile.zero_base_fee, true);
assert.equal(c.genesis_profile.base_fee_per_gas, "0x0");
assert.equal(c.genesis_profile.gas_limit, "0xbebc200");
assert.equal(c.genesis_profile.contract_size_limit, 24576);
assert.equal(c.genesis_profile.alloc_support_required.balance, true);
assert.equal(c.genesis_profile.alloc_support_required.code, true);
assert.equal(c.genesis_profile.alloc_support_required.storage, true);
assert.equal(
  c.genesis_profile.exact_client_neutral_state_manifest_required,
  true,
);
assert.equal(c.genesis_profile.expected_account_count, 4);
assert.equal(
  c.genesis_profile.default_prefunded_dev_accounts_forbidden,
  true,
);
assert.equal(
  c.genesis_profile.native_balance_prefunding_for_economic_accounts_forbidden,
  true,
);

assert.equal(c.free_gas_profile.gas_metering_required, true);
assert.equal(c.free_gas_profile.transaction_gas_price_target, "0");
assert.equal(c.free_gas_profile.min_gas_price, "0");
assert.equal(c.free_gas_profile.tx_pool_enable_balance_check, false);
assert.equal(c.free_gas_profile.zero_base_fee, true);
assert.equal(c.free_gas_profile.participant_native_gas_balance_required, false);
assert.equal(c.free_gas_profile.native_gas_is_economic_asset, false);
assert.equal(c.free_gas_profile.hidden_native_gas_market_forbidden, true);

assert.equal(c.public_surface.raw_public_rpc_allowed, false);
assert.equal(c.public_surface.public_read_gateway_required, true);
assert.equal(
  c.public_surface.bounded_signed_submission_gateway_required,
  true,
);

for (const key of [
  "exact_docker_digest_required",
  "besu_version_output_required",
  "qbft_extra_data_generated_by_besu_required",
  "zero_base_fee_config_parse_required",
  "code_storage_genesis_alloc_required",
  "client_specific_state_readback_required",
]) {
  assert.equal(c.evidence_requirements[key], true, key);
}

for (const key of [
  "docker_digest_pinned",
  "besu_version_verified",
  "qbft_extra_data_verified",
  "free_gas_cli_surface_verified",
]) {
  assert.equal(c.gates[key], true, key);
}

for (const key of [
  "client_specific_genesis_built",
  "client_specific_state_equivalence_proven",
  "production_validator_set_bound",
  "offline_successor_equivalence_proven",
  "migration_authorized",
  "public_activation_authorized",
]) {
  assert.equal(c.gates[key], false, key);
}

assert.equal(c.authority.source_only, true);
assert.equal(c.authority.docker_pull_allowed_in_ci, true);
for (const key of [
  "local_process_start",
  "rpc_call",
  "wallet_access",
  "private_key_access",
  "credential_content_access",
  "transaction_construction",
  "transaction_signing",
  "transaction_submission",
  "transaction_broadcast",
  "chain2050_write",
  "token_movement",
  "funds_movement",
  "contract_deployment",
  "public_activation",
]) {
  assert.equal(c.authority[key], false, key);
}

console.log("VOID_ECONOMIC_EPOCH2_PRODUCTION_CLIENT_CANDIDATE_V1_PROOF_GREEN");
console.log("client=Besu");
console.log("client_version=26.8.1");
console.log("consensus=QBFT");
console.log("chain_id=2050");
console.log("zero_base_fee=true");
console.log("min_gas_price=0");
console.log("participant_native_gas_balance_required=false");
console.log("production_validator_set_bound=false");
console.log("besu_runtime_probe_green=true");
console.log("docker_digest_pinned=true");
console.log("qbft_extra_data_verified=true");
console.log("free_gas_cli_surface_verified=true");
console.log("client_specific_genesis_built=false");
console.log("offline_successor_equivalence_proven=false");
console.log("migration_authorized=false");
console.log("public_activation_authorized=false");
