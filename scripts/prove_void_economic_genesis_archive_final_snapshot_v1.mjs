#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

const freeze = JSON.parse(
  fs.readFileSync(
    "ops/mainnet0/economic-genesis-archive-epoch1-freeze-v2.json",
    "utf8",
  ),
);
const snapshot = JSON.parse(
  fs.readFileSync(
    "ops/mainnet0/economic-genesis-archive-final-snapshot-v1.json",
    "utf8",
  ),
);
const candidate = JSON.parse(
  fs.readFileSync(
    "ops/mainnet0/economic-evm-successor-migration-candidate-v1.json",
    "utf8",
  ),
);

assert.equal(freeze.status, "EPOCH1_ARCHIVE_WRITE_FREEZE_GREEN");
assert.equal(snapshot.status, "FINAL_EPOCH1_SNAPSHOT");
assert.equal(snapshot.final_block_number, "37392");
assert.equal(
  snapshot.final_block_hash,
  "0x739679fd9f9b6f96213c440350980a1b590324c9152b7c394c81ce3627c94f52",
);
assert.equal(
  snapshot.durable_archive_checkpoint.state_sha256,
  "94b25d36990d32616a7328f5419f5075fee757c15a955617c79ef30497a14505",
);
assert.equal(
  snapshot.durable_archive_checkpoint.manifest_sha256,
  "4d8b4f6df9c06cadcd27fd89606e846c83e8303fed9ca45c2b64f65c3baf4a1c",
);
assert.equal(snapshot.reconciliation.path_a_green, true);
assert.equal(snapshot.reconciliation.path_b_green, true);
assert.equal(snapshot.reconciliation.independent_paths_agree, true);
assert.equal(snapshot.freeze.write_freeze_proven, true);
assert.equal(snapshot.freeze.service_active_after, "inactive");
assert.equal(snapshot.freeze.service_enabled_after, "disabled");
assert.equal(snapshot.freeze.port_8545_listener_count_after, 0);
assert.equal(snapshot.freeze.automatic_restart_guard_present, true);

assert.equal(snapshot.void_token.nonzero_holder_count, 3);
assert.equal(
  snapshot.void_token.total_supply_atoms,
  "333333333000000000000000000",
);
assert.equal(
  snapshot.void_token.holder_balance_sum_atoms,
  snapshot.void_token.total_supply_atoms,
);
assert.equal(snapshot.void_token.holder_sum_matches_total_supply, true);

const holders = new Map(
  snapshot.void_token.nonzero_holders.map((row) => [row.label, row]),
);
assert.equal(
  holders.get("VoidTreasury")?.balance_atoms,
  "323207333000000000000000000",
);
assert.equal(
  holders.get("UpgradeStaking")?.balance_atoms,
  "126000000000000000000000",
);
assert.equal(
  holders.get("PresaleFulfillment")?.balance_atoms,
  "10000000000000000000000000",
);
assert.equal(snapshot.presale.remaining_inventory_atoms, "10000000000000000000000000");
assert.equal(snapshot.presale.total_fulfilled_atoms, "0");
assert.equal(snapshot.presale.accounting_identity_holds, true);

assert.equal(
  candidate.source_execution_layer.latest_authoritative_snapshot_block,
  snapshot.final_block_number,
);
assert.equal(
  candidate.source_execution_layer.latest_authoritative_snapshot_block_hash,
  snapshot.final_block_hash,
);
assert.equal(
  candidate.source_execution_layer.state_dump_sha256,
  snapshot.durable_archive_checkpoint.state_sha256,
);
assert.equal(
  candidate.source_execution_layer.archive_manifest_sha256,
  snapshot.durable_archive_checkpoint.manifest_sha256,
);
assert.equal(
  candidate.token_conservation.final_snapshot_total_supply_atomic,
  snapshot.void_token.total_supply_atoms,
);
assert.equal(candidate.token_conservation.final_snapshot_total_supply_verified, true);
assert.equal(candidate.token_conservation.every_nonzero_holder_enumerated, true);
assert.equal(
  candidate.token_conservation.aggregate_holder_sum_matches_final_snapshot_total_supply,
  true,
);
assert.equal(candidate.minimal_economic_state_policy.live_value_holder_census_complete, true);
assert.equal(candidate.funds_safety.final_snapshot_identity_verified, true);
assert.equal(candidate.funds_safety.independent_snapshot_reconciliation_1_green, true);
assert.equal(candidate.funds_safety.independent_snapshot_reconciliation_2_green, true);
assert.equal(
  candidate.replay_and_epoch_safety.legacy_write_rpc_disabled_before_successor_activation,
  true,
);
assert.equal(candidate.public_verification.source_snapshot_public_evidence_ready, true);

// These remain intentionally open until epoch-2 evidence exists.
assert.equal(candidate.minimal_economic_state_policy.live_obligation_contract_census_complete, false);
assert.equal(candidate.minimal_economic_state_policy.contract_holder_destination_manifest_ready, false);
assert.equal(candidate.funds_safety.offline_successor_equivalence_proven, false);
assert.equal(candidate.replay_and_epoch_safety.pending_legacy_signed_transaction_census_complete, false);
assert.equal(candidate.public_verification.successor_genesis_or_state_manifest_public_evidence_ready, false);
assert.equal(candidate.launch_authority.transaction_broadcast, false);
assert.equal(candidate.launch_authority.token_movement, false);
assert.equal(candidate.launch_authority.money_movement, false);

console.log("VOID_ECONOMIC_GENESIS_ARCHIVE_FINAL_SNAPSHOT_V1_PROOF_GREEN");
console.log("final_block=37392");
console.log("final_supply_atoms=333333333000000000000000000");
console.log("nonzero_holder_count=3");
console.log("epoch1_write_freeze_proven=true");
console.log("two_independent_reconciliations_green=true");
console.log("successor_equivalence_proven=false");
console.log("migration_authorized=false");
console.log("funds_moved=false");
