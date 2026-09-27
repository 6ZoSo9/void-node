#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";

const readJson = (path) => JSON.parse(fs.readFileSync(path, "utf8"));
const canonical = (value) => {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  return "{" + Object.keys(value).sort()
    .map((key) => JSON.stringify(key) + ":" + canonical(value[key]))
    .join(",") + "}";
};
const sha256 = (value) =>
  crypto.createHash("sha256").update(value, "utf8").digest("hex");

function jsonFilesUnder(root) {
  const out = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const path = root + "/" + entry.name;
    if (entry.isDirectory()) {
      out.push(...jsonFilesUnder(path));
    } else if (entry.isFile() && entry.name.endsWith(".json")) {
      out.push(path);
    }
  }
  return out.sort();
}

function collectSignedTransactionHashes(value, out) {
  if (Array.isArray(value)) {
    for (const item of value) collectSignedTransactionHashes(item, out);
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, item] of Object.entries(value)) {
    if (
      key === "signed_transaction_hash" &&
      typeof item === "string" &&
      /^0x[0-9a-f]{64}$/.test(item)
    ) {
      out.add(item);
    }
    collectSignedTransactionHashes(item, out);
  }
}

const registry = readJson(
  "ops/mainnet0/economic-epoch2-known-signed-transaction-lineages-v1.json",
);
const nonceCandidate = readJson(
  "ops/mainnet0/economic-epoch2-account-nonce-continuity-candidate-v1.json",
);
const deployment = readJson(
  "ops/mainnet0/chain2050-role-authority-signed-transaction-verification-precision-v1.json",
);
const deploymentCheckpoint = readJson(
  "ops/mainnet0/chain2050-role-authority-checkpoint-request-precision-evidence-v1.json",
);
const fundingRequest = readJson(
  "ops/mainnet0/chain2050-role-authority-sovereign-owner-gas-funding-request-evidence-v1.json",
);
const fundingReceipt = readJson(
  "ops/mainnet0/chain2050-role-authority-sovereign-owner-gas-funding-receipt-evidence-v1.json",
);
const appendRequest = readJson(
  "ops/mainnet0/chain2050-role-authority-sovereign-genesis-append-request-evidence-v1.json",
);
const appendReceipt = readJson(
  "ops/mainnet0/chain2050-role-authority-sovereign-genesis-append-reconciliation-evidence-v1.json",
);

assert.equal(
  registry.marker,
  "VOID_ECONOMIC_EPOCH2_KNOWN_SIGNED_TRANSACTION_LINEAGES_V1",
);
assert.equal(registry.version, 1);
assert.equal(
  registry.status,
  "KNOWN_REPOSITORY_EVIDENCE_LINEAGES_BOUND_GLOBAL_CENSUS_HOLD",
);
assert.deepEqual(registry.source_snapshot, {
  execution_epoch: 1,
  chain_id: 2050,
  final_block_number: "37392",
  final_block_hash:
    "0x739679fd9f9b6f96213c440350980a1b590324c9152b7c394c81ce3627c94f52",
  frozen_nonce_census_sha256:
    "c8d316a3ca3739c644bfc7626715144762138cad3fb4d68bbd0e132b0dc42b70",
});
assert.equal(registry.lineages.length, 3);

const byId = new Map(registry.lineages.map((row) => [row.id, row]));
assert.equal(byId.size, 3);

const nonceByAddress = new Map(
  nonceCandidate.accounts.map((row) => [
    row.address,
    row.frozen_final_nonce,
  ]),
);

const deploy = byId.get("role_authority_deployment");
assert(deploy);
assert.equal(deploy.signer_address, deployment.signer_address);
assert.equal(deploy.transaction_nonce, deployment.nonce);
assert.equal(deploy.signed_transaction_hash, deployment.signed_transaction_hash);
assert.equal(
  deploy.signed_artifact_sha256,
  deployment.signed_transaction_file_sha256,
);
assert.equal(deploy.signed_artifact_digest_kind, "file_sha256");
assert.equal(deployment.chain_id, "2050");
assert.equal(
  deploy.included_epoch1_block,
  deploymentCheckpoint.deployment_block_number,
);
assert.equal(
  deploymentCheckpoint.signed_transaction_hash,
  deploy.signed_transaction_hash,
);

const funding = byId.get("sovereign_owner_gas_funding");
assert(funding);
assert.equal(funding.signer_address, fundingRequest.source.address);
assert.equal(funding.transaction_nonce, fundingRequest.transaction.nonce);
assert.equal(
  funding.signed_transaction_hash,
  fundingReceipt.signed_transaction_hash,
);
assert.equal(
  funding.signed_artifact_sha256,
  fundingReceipt.signed_serialized_sha256,
);
assert.equal(funding.signed_artifact_digest_kind, "serialized_sha256");
assert.equal(fundingRequest.transaction.chain_id, "2050");
assert.equal(funding.included_epoch1_block, fundingReceipt.receipt.block_number);

const append = byId.get("sovereign_genesis_registry_append");
assert(append);
assert.equal(append.signer_address, appendRequest.transaction.signer_address);
assert.equal(append.transaction_nonce, appendRequest.transaction.nonce);
assert.equal(append.signed_transaction_hash, appendReceipt.signed_transaction_hash);
assert.equal(append.signed_artifact_sha256, null);
assert.equal(
  append.signed_artifact_digest_kind,
  "not_published_in_repository_evidence",
);
assert.equal(appendRequest.transaction.chain_id, "2050");
assert.equal(append.included_epoch1_block, appendReceipt.receipt.block_number);

const discoveredSignedHashes = new Set();
for (const path of jsonFilesUnder("ops/mainnet0")) {
  const value = readJson(path);
  collectSignedTransactionHashes(value, discoveredSignedHashes);
}
assert.deepEqual(
  [...discoveredSignedHashes].sort(),
  registry.lineages.map((row) => row.signed_transaction_hash).sort(),
  "ops/mainnet0 signed_transaction_hash set diverges from registry",
);

const hashes = new Set();
for (const row of registry.lineages) {
  assert.match(row.signer_address, /^0x[0-9a-f]{40}$/);
  assert.match(row.transaction_nonce, /^(?:0|[1-9][0-9]*)$/);
  assert.match(row.signed_transaction_hash, /^0x[0-9a-f]{64}$/);
  assert.match(row.included_epoch1_block, /^(?:0|[1-9][0-9]*)$/);
  assert.match(row.frozen_final_nonce, /^(?:0|[1-9][0-9]*)$/);
  assert.equal(hashes.has(row.signed_transaction_hash), false);
  hashes.add(row.signed_transaction_hash);
  assert.equal(
    nonceByAddress.get(row.signer_address),
    row.frozen_final_nonce,
    row.id + ": frozen nonce mismatch",
  );
  assert(
    BigInt(row.transaction_nonce) < BigInt(row.frozen_final_nonce),
    row.id + ": transaction is not stale under frozen nonce continuity",
  );
  assert(
    BigInt(row.included_epoch1_block) <=
      BigInt(registry.source_snapshot.final_block_number),
    row.id + ": transaction lies after the frozen snapshot",
  );
  assert.equal(row.stale_under_exact_nonce_continuity, true);
  assert(Array.isArray(row.evidence) && row.evidence.length >= 2);
}

assert.equal(
  sha256(canonical(registry.lineages)),
  registry.lineage_set_sha256,
);
assert.equal(
  registry.lineage_set_sha256,
  "c906c8bcee5670b128145eac60356be1bbaeec0c73f6807b4ee9f659a0ac35cc",
);

assert.deepEqual(registry.interpretation, {
  known_repository_evidence_lineage_count: 3,
  all_known_repository_lineages_included_by_epoch1_freeze: true,
  all_known_repository_lineages_stale_under_exact_nonce_continuity: true,
  repository_evidence_is_exhaustive_signed_artifact_census: false,
  off_repo_signed_artifact_census_required: true,
  pending_legacy_signed_transaction_census_complete: false,
  privileged_signer_nonce_or_key_replay_fence_proven: false,
  cross_epoch_replay_protection_proven: false,
  migration_authorized: false,
  public_activation_authorized: false,
});

assert.deepEqual(registry.authority, {
  source_only: true,
  filesystem_scan: false,
  credential_access: false,
  wallet_access: false,
  private_key_access: false,
  transaction_construction: false,
  transaction_signing: false,
  transaction_broadcast: false,
  authoritative_chain2050_write: false,
  token_movement: false,
  funds_movement: false,
});

console.log("VOID_ECONOMIC_EPOCH2_KNOWN_SIGNED_TRANSACTION_LINEAGES_V1_GREEN");
console.log("known_repository_evidence_lineage_count=3");
console.log("ops_mainnet0_signed_transaction_hash_set_exhaustive=true");
console.log("all_known_repository_lineages_stale_under_exact_nonce_continuity=true");
console.log("repository_evidence_is_exhaustive_signed_artifact_census=false");
console.log("off_repo_signed_artifact_census_required=true");
console.log("pending_legacy_signed_transaction_census_complete=false");
console.log("privileged_signer_nonce_or_key_replay_fence_proven=false");
console.log("cross_epoch_replay_protection_proven=false");
console.log("migration_authorized=false");
console.log("public_activation=false");
