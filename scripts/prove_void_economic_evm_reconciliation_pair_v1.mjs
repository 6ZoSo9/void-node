#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

const A = JSON.parse(fs.readFileSync("ops/mainnet0/economic-evm-reconciliation-a-v1.json","utf8"));
const B = JSON.parse(fs.readFileSync("ops/mainnet0/economic-evm-reconciliation-b-v1.json","utf8"));

assert.equal(A.status, "READ_ONLY_RECONCILIATION_GREEN");
assert.equal(B.status, "RAW_RECONCILIATION_B_GREEN");

for (const key of [
  "chain_id",
  "block_number",
  "block_hash",
  "void_token",
  "void_token_runtime_sha256",
  "transfer_log_count",
  "discovered_holder_address_count",
  "nonzero_holder_count",
  "contract_holder_count",
  "total_supply_atoms",
  "holder_balance_sum_atoms"
]) {
  assert.equal(String(B[key]), String(A[key]), key);
}

assert.equal(A.holder_sum_matches_total_supply, true);
assert.equal(B.holder_sum_matches_total_supply, true);
assert.equal(B.head_before, A.block_number);
assert.equal(B.head_after, A.block_number);
assert.equal(B.comparison_to_reconciliation_a.exact_block_identity_match, true);
assert.equal(B.comparison_to_reconciliation_a.archive_head_unchanged_since_a, true);
assert.equal(B.comparison_to_reconciliation_a.archive_head_unchanged_during_b, true);

for (const key of [
  "address",
  "token_balance_atoms",
  "remaining_inventory_atoms",
  "total_fulfilled_atoms",
  "max_inventory_atoms",
  "accounting_identity_holds",
  "token_balance_covers_remaining"
]) {
  assert.equal(String(B.presale[key]), String(A.presale[key]), "presale."+key);
}

assert.equal(A.interpretation.final_snapshot_promoted, false);
assert.equal(B.interpretation.final_snapshot_promoted, false);
assert.equal(A.interpretation.archive_write_freeze_proven, false);
assert.equal(B.interpretation.archive_write_freeze_proven, false);

console.log("VOID_ECONOMIC_EVM_RECONCILIATION_PAIR_V1_GREEN");
console.log("block_number="+A.block_number);
console.log("block_hash="+A.block_hash);
console.log("two_independent_reconciliations_agree=true");
console.log("archive_head_unchanged_between_reconciliations=true");
console.log("final_snapshot_promoted=false");
console.log("archive_write_freeze_proven=false");
