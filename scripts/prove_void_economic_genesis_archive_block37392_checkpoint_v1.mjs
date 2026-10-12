#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

const A = JSON.parse(fs.readFileSync("ops/mainnet0/economic-evm-reconciliation-a-v1.json","utf8"));
const B = JSON.parse(fs.readFileSync("ops/mainnet0/economic-evm-reconciliation-b-v1.json","utf8"));
const C = JSON.parse(fs.readFileSync("ops/mainnet0/economic-genesis-archive-block37392-checkpoint-v1.json","utf8"));

assert.equal(A.status, "READ_ONLY_RECONCILIATION_GREEN");
assert.equal(B.status, "RAW_RECONCILIATION_B_GREEN");
assert.equal(C.status, "ARCHIVE_CHECKPOINT_GREEN");

for (const key of ["chain_id","block_number","block_hash"]) {
  assert.equal(String(C[key]), String(A[key]), "checkpoint/A "+key);
  assert.equal(String(C[key]), String(B[key]), "checkpoint/B "+key);
}

assert.equal(C.checkpoint_id_sha256, "c251d3d92a0f3729f008fb7911243da0e4e2939af73f98fab2234a050c95a906");
assert.equal(C.state_sha256, "94b25d36990d32616a7328f5419f5075fee757c15a955617c79ef30497a14505");
assert.equal(C.state_bytes, 161576656);
assert.equal(C.manifest_sha256, "4d8b4f6df9c06cadcd27fd89606e846c83e8303fed9ca45c2b64f65c3baf4a1c");
assert.equal(C.complete_sha256, "191c2d2fdc55bdc099569c2bd96719fb6fafe5baa99ea61459fcc8d9b4330dbf");
assert.equal(C.checkpoint_finalized, true);
assert.equal(C.checkpoint_directory_fsync_performed, true);
assert.equal(C.production_startup_checkpoint_root_mutated, false);

for (const key of [
  "service_action",
  "credential_access",
  "wallet_access",
  "private_key_access",
  "transaction_construction",
  "transaction_signing",
  "transaction_broadcast",
  "chain2050_write",
  "token_movement",
  "funds_movement"
]) {
  assert.equal(C.authority[key], false, key);
}

assert.equal(C.interpretation.durable_archive_candidate_captured, true);
assert.equal(C.interpretation.two_independent_value_reconciliations_already_green, true);
assert.equal(C.interpretation.archive_write_freeze_proven, false);
assert.equal(C.interpretation.final_snapshot_promoted, false);

console.log("VOID_ECONOMIC_GENESIS_ARCHIVE_BLOCK37392_CHECKPOINT_V1_PROOF_GREEN");
console.log("block_number="+C.block_number);
console.log("block_hash="+C.block_hash);
console.log("state_sha256="+C.state_sha256);
console.log("durable_archive_candidate_captured=true");
console.log("two_independent_value_reconciliations_green=true");
console.log("archive_write_freeze_proven=false");
console.log("final_snapshot_promoted=false");
