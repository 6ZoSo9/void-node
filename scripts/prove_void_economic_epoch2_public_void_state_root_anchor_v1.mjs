#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";

import {
  ECONOMIC_EPOCH2_STATE_ROOT_OBJECT_ID_SHA256_V1,
  ECONOMIC_EPOCH2_STATE_ROOT_PAYLOAD_BYTES_V1,
  ECONOMIC_EPOCH2_STATE_ROOT_PAYLOAD_SHA256_V1,
  verifyEconomicEpoch2PublicVoidStateRootAnchorPayloadV1,
  VOID_ECONOMIC_EPOCH2_PUBLIC_VOID_STATE_ROOT_ANCHOR_AUTHORITY_V1,
} from "../tools/void-economic-epoch2-public-void-state-root-anchor-v1.mjs";

const payloadPath =
  "public/public-node/evidence/economic-epoch2-public-void-state-root-anchor-v1.json";
const schemaPath =
  "schemas/economic-epoch2-public-void-state-root-anchor-v1.schema.json";
const statePath =
  "public/public-node/evidence/economic-epoch2-client-neutral-state-manifest-v1.json";
const migrationPath =
  "public/public-node/evidence/economic-epoch2-migration-manifest-v2.json";
const noncePath =
  "ops/mainnet0/economic-epoch2-besu-nonce-continuity-evidence-v1.json";
const candidatePath =
  "ops/mainnet0/economic-evm-successor-migration-candidate-v1.json";
const registryPath =
  "contracts/mainnet/DatanetContentCommitmentRegistryV1.sol";
const publicIndexPath = "public/public-node/index.json";

const sha256 = (bytes) =>
  crypto.createHash("sha256").update(bytes).digest("hex");

const payloadBytes = fs.readFileSync(payloadPath);
const payload = JSON.parse(payloadBytes.toString("utf8"));
const schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));
const stateBytes = fs.readFileSync(statePath);
const state = JSON.parse(stateBytes.toString("utf8"));
const migration = JSON.parse(fs.readFileSync(migrationPath, "utf8"));
const nonceBytes = fs.readFileSync(noncePath);
const nonce = JSON.parse(nonceBytes.toString("utf8"));
const candidate = JSON.parse(fs.readFileSync(candidatePath, "utf8"));
const registry = fs.readFileSync(registryPath, "utf8");
const publicIndex = JSON.parse(fs.readFileSync(publicIndexPath, "utf8"));

assert.equal(payloadBytes.length, ECONOMIC_EPOCH2_STATE_ROOT_PAYLOAD_BYTES_V1);
assert.equal(sha256(payloadBytes), ECONOMIC_EPOCH2_STATE_ROOT_PAYLOAD_SHA256_V1);
assert.equal(
  sha256(Buffer.from(payload.object_id, "utf8")),
  ECONOMIC_EPOCH2_STATE_ROOT_OBJECT_ID_SHA256_V1,
);

const verified =
  verifyEconomicEpoch2PublicVoidStateRootAnchorPayloadV1({
    payload_bytes: payloadBytes,
  });
assert.equal(verified.ok, true);
assert.equal(verified.chain_id, "2050");
assert.equal(verified.execution_epoch, "2");
assert.equal(
  verified.object_id_sha256,
  ECONOMIC_EPOCH2_STATE_ROOT_OBJECT_ID_SHA256_V1,
);
assert.equal(
  verified.content_sha256,
  ECONOMIC_EPOCH2_STATE_ROOT_PAYLOAD_SHA256_V1,
);
assert.equal(
  verified.byte_length,
  String(ECONOMIC_EPOCH2_STATE_ROOT_PAYLOAD_BYTES_V1),
);
assert.equal(
  verified.genesis_state_root,
  "0x7aef6c030a691569cdb0d033f1b9333c1a07cdc9de0c0fbfb952fddbd96cc2b2",
);
assert.equal(verified.successor_state_root_public_void_anchor_ready, false);
assert.equal(verified.chain2050_write_authorized, false);
assert.equal(verified.transaction_signing_authorized, false);
assert.equal(verified.transaction_broadcast_authorized, false);
assert.equal(verified.migration_authorized, false);
assert.equal(verified.public_activation_authorized, false);

assert.equal(sha256(stateBytes), payload.evidence.public_state_manifest_file_sha256);
assert.equal(
  state.manifest_material_sha256,
  payload.evidence.public_state_manifest_material_sha256,
);
assert.equal(state.chain_id, payload.chain_id);
assert.equal(state.execution_epoch, payload.execution_epoch);
assert.equal(state.gates.migration_authorized, false);
assert.equal(state.gates.public_activation_authorized, false);

assert.equal(
  migration.migration_manifest_material_sha256,
  payload.evidence.public_migration_manifest_material_sha256,
);
assert.equal(
  migration.material.successor_state.genesis_block_hash,
  payload.anchor.genesis_block_hash,
);
assert.equal(
  migration.material.successor_state.genesis_state_root,
  payload.anchor.genesis_state_root,
);
assert.equal(
  migration.material.successor_state.client,
  payload.anchor.client,
);
assert.equal(
  migration.material.successor_state.client_version,
  payload.anchor.client_version,
);
assert.equal(
  migration.material.successor_state.client_repo_digest,
  payload.anchor.client_repo_digest,
);
assert.equal(
  migration.material.successor_state.void_token_address,
  payload.economic_identity.void_token_address,
);
assert.equal(
  migration.material.successor_state.void_token_total_supply_atoms,
  payload.economic_identity.void_token_total_supply_atoms,
);
assert.equal(
  migration.material.successor_state.economic_state_account_count,
  payload.economic_identity.economic_state_account_count,
);
assert.equal(
  migration.material.successor_state.verified_storage_entry_count,
  payload.economic_identity.verified_storage_entry_count,
);

assert.equal(
  sha256(nonceBytes),
  payload.evidence.besu_nonce_continuity_evidence_file_sha256,
);
assert.equal(nonce.besu.genesis_block_hash, payload.anchor.genesis_block_hash);
assert.equal(nonce.besu.genesis_state_root, payload.anchor.genesis_state_root);
assert.equal(nonce.besu.name, payload.anchor.client);
assert.equal(nonce.besu.version, payload.anchor.client_version);
assert.equal(nonce.besu.repo_digest, payload.anchor.client_repo_digest);
assert.equal(nonce.authority.authoritative_chain2050_write, false);
assert.equal(nonce.authority.transaction_signing, false);
assert.equal(nonce.authority.transaction_broadcast, false);

assert.equal(
  candidate.public_verification
    .successor_genesis_or_state_manifest_public_evidence_ready,
  true,
);
assert.equal(
  candidate.public_verification.successor_state_root_public_void_anchor_ready,
  false,
);
assert.equal(
  candidate.public_verification.public_balance_receipt_code_verification_ready,
  false,
);
assert.equal(candidate.launch_authority.chain2050_write, false);
assert.equal(candidate.launch_authority.transaction_signing, false);
assert.equal(candidate.launch_authority.transaction_broadcast, false);
assert.equal(candidate.launch_authority.public_activation, false);
assert.equal(candidate.launch_authority.money_movement, false);

const anchorRoutes = publicIndex.routes.filter(
  (row) =>
    row.route ===
      "/public-node/evidence/economic-epoch2-public-void-state-root-anchor-v1.json",
);
assert.equal(anchorRoutes.length, 1);
assert.deepEqual(anchorRoutes[0], {
  kind: "economic_epoch2_public_void_state_root_anchor_payload",
  label: "Epoch-2 public VOID state-root anchor payload",
  method: "GET",
  public_safe: true,
  read_only: true,
  route: "/public-node/evidence/economic-epoch2-public-void-state-root-anchor-v1.json",
  status: "anchor_payload_public_chain2050_commitment_pending",
  file_sha256: ECONOMIC_EPOCH2_STATE_ROOT_PAYLOAD_SHA256_V1,
  object_id: payload.object_id,
  object_id_sha256: ECONOMIC_EPOCH2_STATE_ROOT_OBJECT_ID_SHA256_V1,
  byte_length: ECONOMIC_EPOCH2_STATE_ROOT_PAYLOAD_BYTES_V1,
  successor_state_root_public_void_anchor_ready: false,
  migration_authorized: false,
  public_activation_authorized: false,
});

for (const required of [
  "contract DatanetContentCommitmentRegistryV1",
  "uint64 internal constant _MAX_OBJECT_BYTES = 268_435_456;",
  "address public immutable publisher;",
  "function isCommitted(bytes32 objectIdSha256)",
  "function commit(",
  "if (msg.sender != publisher) revert NotPublisher();",
  "if (isCommitted(objectIdSha256))",
  "emit ContentCommitted(",
]) {
  assert.ok(registry.includes(required), required);
}
assert.equal(
  payload.commitment.registry_contract,
  "DatanetContentCommitmentRegistryV1",
);
assert.equal(
  payload.commitment.function_signature,
  "commit(bytes32,bytes32,uint64)",
);
assert.equal(payload.commitment.max_object_bytes, 268435456);
assert.ok(payloadBytes.length <= payload.commitment.max_object_bytes);

assert.equal(schema.type, "object");
assert.equal(schema.additionalProperties, false);
assert.deepEqual(
  [...schema.required].sort(),
  Object.keys(payload).sort(),
);
assert.equal(schema.properties.marker.const, payload.marker);
assert.equal(schema.properties.object_id.const, payload.object_id);
assert.equal(
  schema.properties.commitment.properties.object_id_sha256.const,
  payload.commitment.object_id_sha256,
);
assert.equal(
  schema.properties.gates.properties
    .successor_state_root_public_void_anchor_ready.const,
  false,
);

for (const [key, expected] of Object.entries(
  VOID_ECONOMIC_EPOCH2_PUBLIC_VOID_STATE_ROOT_ANCHOR_AUTHORITY_V1,
)) {
  assert.equal(payload.authority[key], expected, key);
}

{
  const changed = Buffer.from(payloadBytes);
  changed[changed.length - 2] =
    changed[changed.length - 2] === 0x7d ? 0x20 : 0x7d;
  const held =
    verifyEconomicEpoch2PublicVoidStateRootAnchorPayloadV1({
      payload_bytes: changed,
    });
  assert.equal(held.ok, false);
  assert.equal(held.reason, "anchor_payload_exact_bytes_mismatch");
}

{
  const extended = Buffer.concat([payloadBytes, Buffer.from("\n")]);
  const held =
    verifyEconomicEpoch2PublicVoidStateRootAnchorPayloadV1({
      payload_bytes: extended,
    });
  assert.equal(held.ok, false);
  assert.equal(held.reason, "anchor_payload_exact_bytes_mismatch");
}

console.log("VOID_ECONOMIC_EPOCH2_PUBLIC_VOID_STATE_ROOT_ANCHOR_V1_PROOF_GREEN");
console.log("object_id=" + verified.object_id);
console.log("object_id_sha256=" + verified.object_id_sha256);
console.log("content_sha256=" + verified.content_sha256);
console.log("byte_length=" + verified.byte_length);
console.log("genesis_block_hash=" + verified.genesis_block_hash);
console.log("genesis_state_root=" + verified.genesis_state_root);
console.log("existing_datanet_commitment_registry_reused=true");
console.log("accepted_checkpoint_policy_id=" + verified.accepted_checkpoint_policy_id);
console.log("canonical_truth_admission_required=true");
console.log("public_index_anchor_payload_route_unique=true");
console.log("public_index_anchor_payload_gate_false=true");
console.log("successor_genesis_or_state_manifest_public_evidence_ready=true");
console.log("successor_state_root_public_void_anchor_ready=false");
console.log("public_balance_receipt_code_verification_ready=false");
console.log("chain2050_write=false");
console.log("transaction_signing=false");
console.log("transaction_broadcast=false");
console.log("migration_authorized=false");
console.log("public_activation=false");
