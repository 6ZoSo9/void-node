#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

const c=JSON.parse(fs.readFileSync("ops/mainnet0/economic-epoch1-write-surface-census-v1.json","utf8"));
const p=JSON.parse(fs.readFileSync("ops/mainnet0/economic-genesis-archive-block37392-checkpoint-v1.json","utf8"));

assert.equal(c.status,"READ_ONLY_WRITE_SURFACE_CENSUS_GREEN");
assert.equal(c.block_number_before,"37392");
assert.equal(c.block_number_after,"37392");
assert.equal(c.block_hash,p.block_hash);
assert.equal(c.head_stable_at_reconciled_snapshot,true);
assert.equal(c.zero_unlocked_accounts,true);
assert.equal(c.listener.count,1);
assert.equal(c.listener.exe_sha256,"b47362d2159aa0f2f575320e5e529bb5a91093cb62dc6bd30c0022018aa9f738");
assert.equal(c.runtime.void_private_chain2050_rpc_service_active,true);
assert.equal(c.runtime.void_private_chain2050_rpc_service_enabled,true);
assert.equal(c.runtime.void_wc_relayer_active,false);
assert.equal(c.runtime.void_wc_relayer_enabled,false);
assert.equal(c.runtime.void_workcredits_devnet_http_active,false);
assert.equal(c.runtime.void_workcredits_devnet_http_enabled,false);
assert.equal(c.runtime.established_8545_connection_count_after_observation,0);
assert.equal(c.buy_void.full_runtime_status_available,true);
assert.equal(c.buy_void.full_runtime_enabled,false);
assert.equal(c.buy_void.full_runtime_apply_enabled,false);
assert.equal(c.buy_void.full_runtime_apply_blocked,true);
assert.equal(c.classification.known_wc_writer_services_inactive,true);
assert.equal(c.classification.ready_for_service_quiesce_gate,true);
assert.equal(c.classification.archive_write_freeze_proven,false);
assert.equal(c.classification.final_snapshot_promoted,false);

for(const key of [
  "service_action","signal_action","process_kill","systemd_mutation",
  "credential_content_access","environment_content_access","wallet_access",
  "private_key_access","transaction_construction","transaction_signing",
  "transaction_broadcast","chain2050_write","token_movement","funds_movement"
]) assert.equal(c.authority[key],false,key);

console.log("VOID_ECONOMIC_EPOCH1_WRITE_SURFACE_CENSUS_V1_PROOF_GREEN");
console.log("ready_for_service_quiesce_gate=true");
console.log("archive_write_freeze_proven=false");
console.log("final_snapshot_promoted=false");
