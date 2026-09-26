#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

const snapshot=JSON.parse(fs.readFileSync(
  "ops/mainnet0/economic-genesis-archive-final-snapshot-v1.json","utf8"));
const staking=JSON.parse(fs.readFileSync(
  "ops/mainnet0/economic-genesis-archive-staking-obligation-census-v1.json","utf8"));
const live=JSON.parse(fs.readFileSync(
  "ops/mainnet0/economic-genesis-archive-live-obligation-census-v1.json","utf8"));
const candidate=JSON.parse(fs.readFileSync(
  "ops/mainnet0/economic-evm-successor-migration-candidate-v1.json","utf8"));

assert.equal(snapshot.status,"FINAL_EPOCH1_SNAPSHOT");
assert.equal(staking.status,"STAKING_OBLIGATION_CENSUS_GREEN");
assert.equal(live.status,"LIVE_OBLIGATION_CENSUS_GREEN");
assert.equal(live.source_snapshot.block_number,snapshot.final_block_number);
assert.equal(live.source_snapshot.block_hash,snapshot.final_block_hash);
assert.equal(live.source_snapshot.total_supply_atoms,snapshot.void_token.total_supply_atoms);

assert.equal(staking.isolated_replay.block_number,snapshot.final_block_number);
assert.equal(staking.isolated_replay.block_hash,snapshot.final_block_hash);
assert.equal(staking.isolated_replay.authoritative,false);
assert.equal(staking.isolated_replay.cleaned_up,true);
assert.equal(staking.post_analysis.authoritative_epoch1_service_active,"inactive");
assert.equal(staking.post_analysis.authoritative_epoch1_service_enabled,"disabled");
assert.equal(staking.post_analysis.authoritative_8545_listener_count,0);
assert.equal(staking.post_analysis.archive_freeze_reverified,true);

const s=staking.staking;
assert.equal(s.validator_count,"126");
assert.equal(s.active_validator_count,"126");
assert.equal(s.pending_activation_count,"0");
assert.equal(s.pending_exit_count,"0");
assert.equal(s.jailed_count,"0");
assert.equal(s.nonzero_unbond_count,"0");
assert.equal(s.stake_sum_atoms,"126000000000000000000000");
assert.equal(s.unbond_sum_atoms,"0");
assert.equal(s.attributed_liability_atoms,s.token_balance_atoms);
assert.equal(s.liability_sum_matches_token_balance,true);
assert.equal(s.all_validator_records_enumerated,true);
assert.equal(s.controller_reverse_mappings_exact,true);

assert.equal(live.value_buckets.length,3);
const byLabel=new Map(live.value_buckets.map((row)=>[row.label,row]));
assert.equal(byLabel.get("VoidTreasury")?.balance_atoms,"323207333000000000000000000");
assert.equal(byLabel.get("UpgradeStaking")?.balance_atoms,"126000000000000000000000");
assert.equal(byLabel.get("UpgradeStaking")?.validator_count,"126");
assert.equal(byLabel.get("UpgradeStaking")?.active_validator_count,"126");
assert.equal(byLabel.get("UpgradeStaking")?.unbond_sum_atoms,"0");
assert.equal(byLabel.get("UpgradeStaking")?.liability_sum_matches_balance,true);
assert.equal(byLabel.get("PresaleFulfillment")?.balance_atoms,"10000000000000000000000000");
assert.equal(byLabel.get("PresaleFulfillment")?.remaining_inventory_atoms,"10000000000000000000000000");
assert.equal(byLabel.get("PresaleFulfillment")?.total_fulfilled_atoms,"0");
assert.equal(byLabel.get("PresaleFulfillment")?.open_fulfillment_liability_atoms,"0");

assert.equal(live.coverage.every_nonzero_voidtoken_holder_covered,true);
assert.equal(live.coverage.contract_holder_count,3);
assert.equal(live.coverage.live_obligation_contract_census_complete,true);
assert.equal(live.coverage.all_contract_held_void_attributed_to_named_bucket,true);
assert.equal(live.coverage.destination_manifest_complete,false);
assert.equal(live.coverage.successor_custody_review_complete,false);

assert.equal(candidate.minimal_economic_state_policy.live_value_holder_census_complete,true);
assert.equal(candidate.minimal_economic_state_policy.live_obligation_contract_census_complete,true);
assert.equal(candidate.minimal_economic_state_policy.contract_holder_destination_manifest_ready,true);
assert.equal(candidate.minimal_economic_state_policy.successor_custody_contracts_reviewed,true);
assert.equal(candidate.funds_safety.offline_successor_equivalence_proven,false);
assert.equal(candidate.launch_authority.transaction_broadcast,false);
assert.equal(candidate.launch_authority.token_movement,false);
assert.equal(candidate.launch_authority.money_movement,false);

console.log("VOID_ECONOMIC_GENESIS_ARCHIVE_LIVE_OBLIGATION_CENSUS_V1_PROOF_GREEN");
console.log("value_bucket_count=3");
console.log("validator_count=126");
console.log("active_validator_count=126");
console.log("staking_liability_atoms=126000000000000000000000");
console.log("presale_remaining_inventory_atoms=10000000000000000000000000");
console.log("presale_total_fulfilled_atoms=0");
console.log("live_obligation_contract_census_complete=true");
console.log("contract_holder_destination_manifest_ready=true");
console.log("migration_authorized=false");
