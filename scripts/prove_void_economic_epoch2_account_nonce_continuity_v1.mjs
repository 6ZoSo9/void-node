#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";

const path =
  "ops/mainnet0/economic-epoch2-account-nonce-continuity-candidate-v1.json";
const value = JSON.parse(fs.readFileSync(path, "utf8"));

const sha256 = (text) =>
  crypto.createHash("sha256").update(text).digest("hex");

assert.equal(
  value.marker,
  "VOID_ECONOMIC_EPOCH2_ACCOUNT_NONCE_CONTINUITY_CANDIDATE_V1",
);
assert.equal(value.version, 1);
assert.equal(
  value.status,
  "CANDIDATE_NONCE_CONTINUITY_READY_BESU_READBACK_PENDING",
);

assert.deepEqual(value.source_snapshot, {
  execution_epoch: 1,
  chain_id: 2050,
  block_number: "37392",
  block_hash:
    "0x739679fd9f9b6f96213c440350980a1b590324c9152b7c394c81ce3627c94f52",
  checkpoint_id_sha256:
    "c251d3d92a0f3729f008fb7911243da0e4e2939af73f98fab2234a050c95a906",
  state_sha256:
    "94b25d36990d32616a7328f5419f5075fee757c15a955617c79ef30497a14505",
  write_rpc_frozen: true,
});

assert.equal(value.census_evidence.nonzero_nonce_account_count, 154);
assert.equal(
  value.census_evidence.canonical_nonce_tsv_sha256,
  "c8d316a3ca3739c644bfc7626715144762138cad3fb4d68bbd0e132b0dc42b70",
);
assert.equal(
  value.census_evidence.operator_receipt_sha256,
  "63d21f5a5e95c4cc2f7a945611ba64ff5aacee9cd976f411577e7c1ce6c36969",
);

assert.deepEqual(value.census_evidence.required_successor_receipt_provenance, {
  receipt_version: 2,
  repository_main_commit:
    "e211d524baa708dcaa9ad7d14892e7961f424526",
  parser_source_commit:
    "c6215d42a018198a85bd9652714345e9d91fdb5f",
  parser_source_blob: "ac99ecfe910b62b306132ccf51d53497954649ff",
  parser_source_path:
    "ops/precision/void_precision_epoch2_legacy_nonce_census_v1.sh",
  receipt_generator_commit:
    "af86c8bf6354329cd600c010addb48727b86243e",
  receipt_generator_blob: "ac5c6e22462489975a7c8051aac8182f8061d5b8",
  runtime_script_sha256:
    "e5351ae67801a909d5120d0e7d5698478ee660338853d56062121dd11fbe3635",
});
assert.notEqual(
  value.census_evidence.required_successor_receipt_provenance
    .repository_main_commit,
  value.census_evidence.required_successor_receipt_provenance
    .parser_source_commit,
);
assert.equal(value.census_evidence.successor_receipt_observed, false);
assert.deepEqual(value.census_evidence.nonce_distribution, {
  "1": 24,
  "3": 125,
  "9": 1,
  "111": 1,
  "127": 1,
  "130": 1,
  "273": 1,
});
assert.equal(value.census_evidence.maximum_nonce, "273");

assert.equal(value.continuity_policy.source_and_successor_chain_id_equal, true);
assert.equal(value.continuity_policy.source_chain_id, 2050);
assert.equal(value.continuity_policy.successor_chain_id, 2050);
assert.equal(value.continuity_policy.successor_execution_epoch, 2);
assert.equal(
  value.continuity_policy.exact_frozen_final_nonce_required_for_every_listed_account,
  true,
);
assert.equal(value.continuity_policy.nonce_reset_to_zero_forbidden, true);
assert.equal(value.continuity_policy.nonce_only_alloc_native_balance_wei, "0");
assert.equal(
  value.continuity_policy.nonce_only_alloc_code_or_storage_migration_authorized,
  false,
);
assert.equal(
  value.continuity_policy.pending_transaction_with_nonce_equal_to_frozen_final_nonce_requires_separate_census,
  true,
);
assert.equal(value.continuity_policy.raw_public_rpc_allowed, false);

assert.equal(Array.isArray(value.accounts), true);
assert.equal(value.accounts.length, 154);

const addresses = new Set();
const distribution = new Map();
let prior = "";
let maximum = 0n;
for (const entry of value.accounts) {
  assert.match(entry.address, /^0x[0-9a-f]{40}$/);
  assert.match(entry.frozen_final_nonce, /^(?:0|[1-9][0-9]*)$/);
  const nonce = BigInt(entry.frozen_final_nonce);
  assert(nonce > 0n, "all listed nonces must be nonzero");
  assert(prior < entry.address, "accounts must be strictly address-sorted");
  prior = entry.address;
  assert.equal(addresses.has(entry.address), false, "duplicate address");
  addresses.add(entry.address);
  distribution.set(
    entry.frozen_final_nonce,
    (distribution.get(entry.frozen_final_nonce) || 0) + 1,
  );
  if (nonce > maximum) maximum = nonce;
}

assert.equal(addresses.size, 154);
assert.equal(maximum, 273n);
assert.deepEqual(
  Object.fromEntries(
    [...distribution.entries()].sort((a, b) => Number(a[0]) - Number(b[0])),
  ),
  value.census_evidence.nonce_distribution,
);

const tsv = value.accounts
  .map((entry) => `${entry.address}\t${entry.frozen_final_nonce}\n`)
  .join("");
assert.equal(
  sha256(tsv),
  value.census_evidence.canonical_nonce_tsv_sha256,
);

const known = value.known_retained_raw_transaction;
assert.equal(
  known.signed_transaction_hash,
  "0x8da8cc5a8e126158bdc0e003c5521699939d95a26a72a933969cf6de15d88dd4",
);
assert.equal(
  known.signed_transaction_file_sha256,
  "96b5d004284e511c12b40f2de627c9a214656e025883b8cd7adec1b82348334d",
);
assert.equal(
  known.signer_address,
  "0x4d0a1149d13b03448c56ee6582d161159c5e537f",
);
assert.equal(known.transaction_nonce, "0");
assert.equal(known.frozen_final_account_nonce, "1");
assert.equal(known.included_epoch1_block, "37379");
assert.equal(known.stale_under_exact_nonce_continuity, true);

const knownAccount = value.accounts.find(
  (entry) => entry.address === known.signer_address,
);
assert(knownAccount, "known retained signer missing from nonce census");
assert.equal(
  knownAccount.frozen_final_nonce,
  known.frozen_final_account_nonce,
);
assert(
  BigInt(known.transaction_nonce) < BigInt(knownAccount.frozen_final_nonce),
  "known retained raw transaction must be stale under exact nonce continuity",
);

assert.equal(value.gates.frozen_epoch1_nonce_census_bound, true);
assert.equal(value.gates.exact_nonce_continuity_candidate_ready, true);
for (const gate of [
  "successor_genesis_nonce_continuity_built",
  "besu_nonce_readback_proven",
  "pending_legacy_signed_transaction_census_complete",
  "execution_epoch_bound_in_public_gateway",
  "privileged_signer_nonce_or_key_replay_fence_proven",
  "cross_epoch_replay_protection_proven",
  "migration_authorized",
  "public_activation_authorized",
]) {
  assert.equal(value.gates[gate], false, gate);
}

assert.deepEqual(value.authority, {
  source_only: true,
  rpc_call: false,
  service_action: false,
  wallet_access: false,
  private_key_access: false,
  transaction_construction: false,
  transaction_signing: false,
  transaction_broadcast: false,
  authoritative_chain2050_write: false,
  token_movement: false,
  funds_movement: false,
});

console.log("VOID_ECONOMIC_EPOCH2_ACCOUNT_NONCE_CONTINUITY_V1_PROOF_GREEN");
console.log("source_execution_epoch=1");
console.log("successor_execution_epoch=2");
console.log("chain_id=2050");
console.log("nonzero_nonce_account_count=154");
console.log("canonical_nonce_tsv_sha256=" + sha256(tsv));
console.log("maximum_nonce=273");
console.log("known_retained_raw_transaction_nonce=0");
console.log("known_signer_frozen_final_nonce=1");
console.log("known_retained_raw_transaction_stale_under_exact_nonce_continuity=true");
console.log("successor_genesis_nonce_continuity_built=false");
console.log("besu_nonce_readback_proven=false");
console.log("pending_legacy_signed_transaction_census_complete=false");
console.log("cross_epoch_replay_protection_proven=false");
console.log("migration_authorized=false");
console.log("public_activation_authorized=false");
