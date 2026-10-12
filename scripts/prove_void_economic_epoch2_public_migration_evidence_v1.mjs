#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";

function strictJsonParse(raw, label = "json") {
  let index = 0;

  function fail(reason) {
    throw new Error(label + ": " + reason + " at byte " + index);
  }

  function ws() {
    while (
      index < raw.length &&
      (raw[index] === " " ||
        raw[index] === "\n" ||
        raw[index] === "\r" ||
        raw[index] === "\t")
    ) {
      index += 1;
    }
  }

  function stringToken() {
    if (raw[index] !== '"') fail("string_expected");
    const start = index;
    index += 1;
    while (index < raw.length) {
      const ch = raw[index];
      if (ch === '"') {
        index += 1;
        const token = raw.slice(start, index);
        try {
          return JSON.parse(token);
        } catch {
          fail("invalid_string");
        }
      }
      if (ch === "\\") {
        index += 1;
        if (index >= raw.length) fail("unterminated_escape");
        if (raw[index] === "u") {
          for (let offset = 1; offset <= 4; offset += 1) {
            if (!/[0-9a-fA-F]/.test(raw[index + offset] || "")) {
              fail("invalid_unicode_escape");
            }
          }
          index += 5;
          continue;
        }
        if (!/["\\/bfnrt]/.test(raw[index])) fail("invalid_escape");
        index += 1;
        continue;
      }
      if (ch.charCodeAt(0) < 0x20) fail("control_character_in_string");
      index += 1;
    }
    fail("unterminated_string");
  }

  function literal(expected) {
    if (raw.slice(index, index + expected.length) !== expected) {
      fail("invalid_literal");
    }
    index += expected.length;
  }

  function numberToken() {
    const match = raw.slice(index).match(
      /^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?/,
    );
    if (!match) fail("invalid_number");
    index += match[0].length;
  }

  function value() {
    ws();
    const ch = raw[index];
    if (ch === "{") return object();
    if (ch === "[") return array();
    if (ch === '"') {
      stringToken();
      return;
    }
    if (ch === "t") return literal("true");
    if (ch === "f") return literal("false");
    if (ch === "n") return literal("null");
    return numberToken();
  }

  function object() {
    index += 1;
    ws();
    const keys = new Set();
    if (raw[index] === "}") {
      index += 1;
      return;
    }
    while (true) {
      ws();
      const key = stringToken();
      if (keys.has(key)) fail("duplicate_object_key:" + key);
      keys.add(key);
      ws();
      if (raw[index] !== ":") fail("colon_expected");
      index += 1;
      value();
      ws();
      if (raw[index] === "}") {
        index += 1;
        return;
      }
      if (raw[index] !== ",") fail("comma_expected");
      index += 1;
    }
  }

  function array() {
    index += 1;
    ws();
    if (raw[index] === "]") {
      index += 1;
      return;
    }
    while (true) {
      value();
      ws();
      if (raw[index] === "]") {
        index += 1;
        return;
      }
      if (raw[index] !== ",") fail("comma_expected");
      index += 1;
    }
  }

  value();
  ws();
  if (index !== raw.length) fail("trailing_data");
  return JSON.parse(raw);
}

const readJson = (path) =>
  strictJsonParse(fs.readFileSync(path, "utf8"), path);

assert.throws(
  () => strictJsonParse('{"chain_id":1,"chain_id":2050}', "duplicate_root"),
  /duplicate_object_key:chain_id/,
);
assert.throws(
  () =>
    strictJsonParse(
      '{"outer":{"execution_epoch":99,"execution_epoch":2}}',
      "duplicate_nested",
    ),
  /duplicate_object_key:execution_epoch/,
);

const canonical = (value) => {
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  if (value && typeof value === "object") {
    return "{" + Object.keys(value).sort()
      .map((key) => JSON.stringify(key) + ":" + canonical(value[key]))
      .join(",") + "}";
  }
  return JSON.stringify(value);
};
const sha256 = (value) =>
  crypto.createHash("sha256").update(value, "utf8").digest("hex");

function assertExactTopLevelKeys(value, expected, label) {
  assert(value && typeof value === "object" && !Array.isArray(value), label);
  assert.deepEqual(
    Object.keys(value).sort(),
    [...expected].sort(),
    label + ": top-level schema drift",
  );
}

const packetPath =
  "public/public-node/evidence/economic-epoch2-migration-manifest-v1.json";
const sourcePath =
  "ops/mainnet0/economic-genesis-archive-final-snapshot-v1.json";
const clientNeutralPath =
  "ops/mainnet0/economic-epoch2-client-neutral-state-manifest-evidence-v1.json";
const besuNoncePath =
  "ops/mainnet0/economic-epoch2-besu-nonce-continuity-evidence-v1.json";
const custodyPath =
  "ops/mainnet0/economic-epoch2-contract-holder-destination-manifest-v1.json";
const publicStatePath =
  "public/public-node/evidence/economic-epoch2-client-neutral-state-manifest-v1.json";
const publicStateRoute =
  "/public-node/evidence/economic-epoch2-client-neutral-state-manifest-v1.json";
const publicStateFileSha256 =
  "affe08799c73320c6fc4efe4a91772cc1c64f6a3ff6e75c2698ea87d27e306d9";
const publicStateMaterialSha256 =
  "286034e3adb1654c13899b959075fcfa2504a6942c83ec52febb156bd0ea2a4f";

const packet = readJson(packetPath);

assertExactTopLevelKeys(packet, [
  "marker",
  "version",
  "status",
  "migration_manifest_hash_algorithm",
  "migration_manifest_material_sha256",
  "material",
  "publication",
  "authority",
], "public_migration_packet");
assertExactTopLevelKeys(packet.material, [
  "chain_id",
  "execution_epoch",
  "source_snapshot",
  "successor_state",
  "custody",
], "public_migration_packet.material");
assertExactTopLevelKeys(packet.material.source_snapshot, [
  "evidence_path",
  "evidence_file_sha256",
  "final_block_number",
  "final_block_hash",
  "state_sha256",
  "archive_manifest_sha256",
  "archive_complete_sha256",
], "public_migration_packet.material.source_snapshot");
assertExactTopLevelKeys(packet.material.successor_state, [
  "client",
  "client_version",
  "client_repo_digest",
  "client_neutral_manifest_evidence_path",
  "client_neutral_manifest_evidence_file_sha256",
  "client_neutral_manifest_file_sha256",
  "client_neutral_manifest_material_sha256",
  "besu_nonce_continuity_evidence_path",
  "besu_nonce_continuity_evidence_file_sha256",
  "genesis_block_hash",
  "genesis_state_root",
  "alloc_account_count",
  "economic_state_account_count",
  "verified_storage_entry_count",
  "frozen_nonce_census_sha256",
  "void_token_address",
  "void_token_total_supply_atoms",
  "void_token_nonzero_holder_count",
], "public_migration_packet.material.successor_state");
assertExactTopLevelKeys(packet.material.custody, [
  "destination_manifest_path",
  "destination_manifest_file_sha256",
  "treasury_address",
  "staking_address",
  "presale_address",
  "source_successor_total_atoms",
  "planned_supply_delta_atoms",
  "live_token_transfer_required",
], "public_migration_packet.material.custody");
assertExactTopLevelKeys(packet.publication, [
  "public_path",
  "public_route",
  "migration_manifest_content_addressed",
  "successor_genesis_or_state_manifest_public_evidence_ready",
  "successor_state_root_public_void_anchor_ready",
  "public_balance_receipt_code_verification_ready",
  "live_balance_receipt_code_gateway_ready",
  "migration_authorized",
  "public_activation_authorized",
], "public_migration_packet.publication");
assertExactTopLevelKeys(packet.authority, [
  "source_only",
  "runtime_mutation",
  "rpc_call",
  "wallet_or_signer_access",
  "private_key_access",
  "transaction_construction",
  "transaction_signing",
  "transaction_submission",
  "transaction_broadcast",
  "authoritative_chain2050_write",
  "token_movement",
  "funds_movement",
  "migration_activation",
  "public_activation",
], "public_migration_packet.authority");

assert.equal(packet.material.source_snapshot.evidence_path, sourcePath);
assert.equal(
  packet.material.successor_state.client_neutral_manifest_evidence_path,
  clientNeutralPath,
);
assert.equal(
  packet.material.successor_state.besu_nonce_continuity_evidence_path,
  besuNoncePath,
);
assert.equal(packet.material.custody.destination_manifest_path, custodyPath);

const sourceRaw = fs.readFileSync(
  packet.material.source_snapshot.evidence_path,
  "utf8",
);
assert.equal(
  sha256(sourceRaw),
  packet.material.source_snapshot.evidence_file_sha256,
);
assert.equal(
  packet.material.source_snapshot.evidence_file_sha256,
  "8e9f4f3f2d1b040bda4623248f1adc8c14751ff20d521bf9ca2e839bb56e8bd3",
);
const source = strictJsonParse(
  sourceRaw,
  packet.material.source_snapshot.evidence_path,
);

const custodyRaw = fs.readFileSync(
  packet.material.custody.destination_manifest_path,
  "utf8",
);
assert.equal(
  sha256(custodyRaw),
  packet.material.custody.destination_manifest_file_sha256,
);
assert.equal(
  packet.material.custody.destination_manifest_file_sha256,
  "780105036467e228258b32a4e37ca245bd5461b41d6248434aa69a424adf1d33",
);

const clientNeutralRaw = fs.readFileSync(
  packet.material.successor_state.client_neutral_manifest_evidence_path,
  "utf8",
);
assert.equal(
  sha256(clientNeutralRaw),
  packet.material.successor_state.client_neutral_manifest_evidence_file_sha256,
);
assert.equal(
  packet.material.successor_state.client_neutral_manifest_evidence_file_sha256,
  "1df92da07261530a6d1457189510d46ae844906eb05215a23566fecf9c6674b3",
);
const clientNeutral = strictJsonParse(
  clientNeutralRaw,
  packet.material.successor_state.client_neutral_manifest_evidence_path,
);

const besuNonceRaw = fs.readFileSync(
  packet.material.successor_state.besu_nonce_continuity_evidence_path,
  "utf8",
);
assert.equal(
  sha256(besuNonceRaw),
  packet.material.successor_state.besu_nonce_continuity_evidence_file_sha256,
);
assert.equal(
  packet.material.successor_state.besu_nonce_continuity_evidence_file_sha256,
  "b89723b6e67a05d7e79b0d5d3c90b32d91dcdb3d08de3b8f685309f887cdd876",
);
const besuNonce = strictJsonParse(
  besuNonceRaw,
  packet.material.successor_state.besu_nonce_continuity_evidence_path,
);
const custody = strictJsonParse(
  custodyRaw,
  packet.material.custody.destination_manifest_path,
);
const candidate = readJson(
  "ops/mainnet0/economic-evm-successor-migration-candidate-v1.json",
);
const publicStateRaw = fs.readFileSync(publicStatePath, "utf8");
assert.equal(sha256(publicStateRaw), publicStateFileSha256);
const publicState = strictJsonParse(publicStateRaw, publicStatePath);
const index = readJson("public/public-node/index.json");

assertExactTopLevelKeys(source, [
  "marker",
  "version",
  "status",
  "execution_epoch",
  "chain_id",
  "source_implementation",
  "source_disposition",
  "final_block_number",
  "final_block_hash",
  "void_token",
  "presale",
  "durable_archive_checkpoint",
  "reconciliation",
  "freeze",
  "promotion",
], "source_snapshot");
assertExactTopLevelKeys(source.promotion, [
  "final_snapshot_identity_verified",
  "all_nonzero_value_holders_enumerated",
  "final_supply_verified",
  "legacy_write_rpc_disabled",
  "source_snapshot_public_evidence_ready",
  "successor_equivalence_proven",
  "contract_holder_destination_manifest_ready",
  "live_obligation_contract_census_complete",
  "migration_authorized",
  "public_activation_authorized",
  "funds_movement_authorized",
], "source_snapshot.promotion");
assert.deepEqual(source.promotion, {
  final_snapshot_identity_verified: true,
  all_nonzero_value_holders_enumerated: true,
  final_supply_verified: true,
  legacy_write_rpc_disabled: true,
  source_snapshot_public_evidence_ready: true,
  successor_equivalence_proven: false,
  contract_holder_destination_manifest_ready: false,
  live_obligation_contract_census_complete: false,
  migration_authorized: false,
  public_activation_authorized: false,
  funds_movement_authorized: false,
});

assertExactTopLevelKeys(clientNeutral, [
  "marker",
  "version",
  "status",
  "source_commit",
  "manifest_filename",
  "manifest_file_sha256",
  "manifest_material_sha256",
  "account_count",
  "successor_holder_count",
  "token_total_supply_atoms",
  "staking_storage_entry_count",
  "staking_storage_manifest_sha256",
  "token_behavioral_semantic_equivalence",
  "staking_exact_state_bound",
  "native_gas_accounting_excluded",
  "client_specific_genesis_built",
  "offline_successor_equivalence_proven",
  "migration_authorized",
  "public_activation_authorized",
  "authority",
], "client_neutral_state_evidence");
assert.equal(Object.hasOwn(clientNeutral, "chain_id"), false);
assert.equal(Object.hasOwn(clientNeutral, "execution_epoch"), false);
assert.equal(clientNeutral.token_behavioral_semantic_equivalence, true);
assert.equal(clientNeutral.staking_exact_state_bound, true);
assertExactTopLevelKeys(clientNeutral.authority, [
  "authoritative_chain2050_write",
  "token_movement",
  "funds_movement",
], "client_neutral_state_evidence.authority");
assert.deepEqual(clientNeutral.authority, {
  authoritative_chain2050_write: false,
  token_movement: false,
  funds_movement: false,
});

assertExactTopLevelKeys(besuNonce, [
  "marker",
  "version",
  "status",
  "source_commit",
  "verifier_branch_head_at_observation",
  "precision_receipt",
  "source_state",
  "besu",
  "state_equivalence",
  "nonce_continuity",
  "gates",
  "authority",
], "besu_nonce_continuity_evidence");
assert.equal(Object.hasOwn(besuNonce, "chain_id"), false);
assert.equal(Object.hasOwn(besuNonce, "execution_epoch"), false);
assertExactTopLevelKeys(besuNonce.gates, [
  "frozen_epoch1_nonce_census_bound",
  "successor_genesis_nonce_continuity_built",
  "besu_nonce_readback_proven",
  "pending_legacy_signed_transaction_census_complete",
  "execution_epoch_bound_in_public_gateway",
  "privileged_signer_nonce_or_key_replay_fence_proven",
  "cross_epoch_replay_protection_proven",
  "production_validator_set_bound",
  "offline_successor_equivalence_proven",
  "migration_authorized",
  "public_activation_authorized",
], "besu_nonce_continuity_evidence.gates");
assert.deepEqual(besuNonce.gates, {
  frozen_epoch1_nonce_census_bound: true,
  successor_genesis_nonce_continuity_built: true,
  besu_nonce_readback_proven: true,
  pending_legacy_signed_transaction_census_complete: false,
  execution_epoch_bound_in_public_gateway: false,
  privileged_signer_nonce_or_key_replay_fence_proven: false,
  cross_epoch_replay_protection_proven: false,
  production_validator_set_bound: false,
  offline_successor_equivalence_proven: false,
  migration_authorized: false,
  public_activation_authorized: false,
});
assertExactTopLevelKeys(besuNonce.authority, [
  "authoritative_epoch1_rpc_call",
  "authoritative_chain2050_write",
  "wallet_access",
  "private_key_access",
  "transaction_construction",
  "transaction_signing",
  "transaction_submission",
  "transaction_broadcast",
  "token_movement",
  "funds_movement",
], "besu_nonce_continuity_evidence.authority");
assert.deepEqual(besuNonce.authority, {
  authoritative_epoch1_rpc_call: false,
  authoritative_chain2050_write: false,
  wallet_access: false,
  private_key_access: false,
  transaction_construction: false,
  transaction_signing: false,
  transaction_submission: false,
  transaction_broadcast: false,
  token_movement: false,
  funds_movement: false,
});

assertExactTopLevelKeys(custody, [
  "marker",
  "version",
  "status",
  "execution_epoch",
  "chain_id",
  "address_assignment",
  "void_token",
  "destinations",
  "token_holder_transition",
  "participant_eoa_transition",
  "review",
  "authority",
], "custody_destination_manifest");
assertExactTopLevelKeys(custody.authority, [
  "source_only",
  "rpc_call",
  "state_export",
  "genesis_build",
  "wallet_access",
  "private_key_access",
  "transaction_construction",
  "transaction_signing",
  "transaction_broadcast",
  "chain2050_write",
  "token_movement",
  "contract_deployment",
  "public_activation",
  "money_movement",
], "custody_destination_manifest.authority");
assert.deepEqual(custody.authority, {
  source_only: true,
  rpc_call: false,
  state_export: false,
  genesis_build: false,
  wallet_access: false,
  private_key_access: false,
  transaction_construction: false,
  transaction_signing: false,
  transaction_broadcast: false,
  chain2050_write: false,
  token_movement: false,
  contract_deployment: false,
  public_activation: false,
  money_movement: false,
});

assertExactTopLevelKeys(custody.token_holder_transition, [
  "source_nonzero_holder_count",
  "successor_planned_nonzero_holder_count",
  "source_total_atoms",
  "successor_planned_total_atoms",
  "planned_supply_delta_atoms",
  "old_void_treasury_balance_after_import_atoms",
  "old_presale_balance_after_import_atoms",
  "upgrade_staking_balance_preserved_atoms",
  "new_treasury_balance_atoms",
  "new_presale_balance_atoms",
  "live_token_transfer_required",
], "custody_destination_manifest.token_holder_transition");
assert.equal(
  custody.token_holder_transition.old_void_treasury_balance_after_import_atoms,
  "0",
);
assert.equal(
  custody.token_holder_transition.old_presale_balance_after_import_atoms,
  "0",
);

assertExactTopLevelKeys(custody.void_token, [
  "address",
  "preserve_same_address",
  "preserve_runtime_identity",
  "preserve_total_supply",
  "preserve_balance_accounting",
  "final_source_total_supply_atoms",
  "successor_owner_role_verified",
  "legacy_owner",
  "legacy_owner_migrates",
  "legacy_runtime_reuse_forbidden",
  "successor_runtime_rebuild_required",
  "successor_runtime_reviewed",
  "successor_runtime_semantic_equivalence_verified",
  "successor_owner_address",
  "historical_voidtoken_source_available_in_current_repositories",
  "successor_runtime_source_path",
  "successor_runtime_source_git_blob_sha1",
  "successor_runtime_test_path",
  "successor_runtime_test_git_blob_sha1",
], "custody_destination_manifest.void_token");
assert.deepEqual(
  {
    address: custody.void_token.address,
    preserve_same_address: custody.void_token.preserve_same_address,
    preserve_runtime_identity: custody.void_token.preserve_runtime_identity,
    successor_owner_role_verified:
      custody.void_token.successor_owner_role_verified,
    legacy_owner: custody.void_token.legacy_owner,
    legacy_owner_migrates: custody.void_token.legacy_owner_migrates,
    legacy_runtime_reuse_forbidden:
      custody.void_token.legacy_runtime_reuse_forbidden,
    successor_runtime_rebuild_required:
      custody.void_token.successor_runtime_rebuild_required,
    successor_runtime_reviewed:
      custody.void_token.successor_runtime_reviewed,
    successor_runtime_semantic_equivalence_verified:
      custody.void_token.successor_runtime_semantic_equivalence_verified,
    successor_owner_address: custody.void_token.successor_owner_address,
  },
  {
    address: "0x470075b85352eb86f7d089fb9ba88945f12aad94",
    preserve_same_address: true,
    preserve_runtime_identity: false,
    successor_owner_role_verified: true,
    legacy_owner: "0x0d66fcdf95d38f7db6b4206bf183f34cd816c2aa",
    legacy_owner_migrates: false,
    legacy_runtime_reuse_forbidden: true,
    successor_runtime_rebuild_required: true,
    successor_runtime_reviewed: true,
    successor_runtime_semantic_equivalence_verified: true,
    successor_owner_address:
      "0x54ded2daa618a257093556a5f54c43805b9bd516",
  },
);

assert.equal(Array.isArray(custody.destinations), true);
assert.equal(custody.destinations.length, 3);
const custodyDestinations = new Map(
  custody.destinations.map((row) => [row.source_label, row]),
);
assert.equal(custodyDestinations.size, 3);

const treasuryDestination = custodyDestinations.get("VoidTreasury");
assert(treasuryDestination);
assertExactTopLevelKeys(treasuryDestination, [
  "source_label",
  "source_address",
  "source_balance_atoms",
  "mode",
  "successor_label",
  "successor_address",
  "successor_source_path",
  "successor_source_git_blob_sha1",
  "successor_authority_role",
  "successor_authority_address",
  "legacy_authority_address",
  "legacy_authority_migrates",
  "successor_initial_balance_atoms",
  "source_successor_balance_delta_atoms",
  "live_transfer_required",
], "custody_destination_manifest.destinations.VoidTreasury");
assert.deepEqual(
  {
    mode: treasuryDestination.mode,
    successor_authority_role: treasuryDestination.successor_authority_role,
    successor_authority_address:
      treasuryDestination.successor_authority_address,
    legacy_authority_address: treasuryDestination.legacy_authority_address,
    legacy_authority_migrates: treasuryDestination.legacy_authority_migrates,
    live_transfer_required: treasuryDestination.live_transfer_required,
  },
  {
    mode: "REMAP_OFFLINE_STATE",
    successor_authority_role: "premine_treasury_primary",
    successor_authority_address:
      "0x54ded2daa618a257093556a5f54c43805b9bd516",
    legacy_authority_address:
      "0x4e77786f32d41e40e7cef28389068d6f31f1d6a2",
    legacy_authority_migrates: false,
    live_transfer_required: false,
  },
);

const stakingDestination = custodyDestinations.get("UpgradeStaking");
assert(stakingDestination);
assertExactTopLevelKeys(stakingDestination, [
  "source_label",
  "source_address",
  "source_balance_atoms",
  "mode",
  "successor_label",
  "successor_address",
  "source_path",
  "source_git_blob_sha1",
  "source_runtime_sha256",
  "validator_count",
  "active_validator_count",
  "attributed_liability_atoms",
  "unbond_liability_atoms",
  "global_successor_admin_required",
  "per_validator_controller_state_preserved",
  "successor_initial_balance_atoms",
  "source_successor_balance_delta_atoms",
  "live_transfer_required",
], "custody_destination_manifest.destinations.UpgradeStaking");
assert.equal(stakingDestination.mode, "PRESERVE_EXACT_ADDRESS_CODE_STORAGE");
assert.equal(stakingDestination.global_successor_admin_required, false);
assert.equal(stakingDestination.per_validator_controller_state_preserved, true);
assert.equal(stakingDestination.live_transfer_required, false);

const presaleDestination = custodyDestinations.get("PresaleFulfillment");
assert(presaleDestination);
assertExactTopLevelKeys(presaleDestination, [
  "source_label",
  "source_address",
  "source_balance_atoms",
  "mode",
  "successor_label",
  "successor_address",
  "successor_source_path",
  "successor_source_git_blob_sha1",
  "successor_authority_role",
  "successor_authority_address",
  "legacy_authority_address",
  "legacy_authority_migrates",
  "source_total_fulfilled_atoms",
  "successor_initial_total_fulfilled_atoms",
  "source_remaining_inventory_atoms",
  "successor_initial_balance_atoms",
  "source_successor_balance_delta_atoms",
  "live_transfer_required",
], "custody_destination_manifest.destinations.PresaleFulfillment");
assert.deepEqual(
  {
    mode: presaleDestination.mode,
    successor_authority_role: presaleDestination.successor_authority_role,
    successor_authority_address:
      presaleDestination.successor_authority_address,
    legacy_authority_address: presaleDestination.legacy_authority_address,
    legacy_authority_migrates: presaleDestination.legacy_authority_migrates,
    live_transfer_required: presaleDestination.live_transfer_required,
  },
  {
    mode: "REMAP_OFFLINE_STATE",
    successor_authority_role: "launch_operator_signer",
    successor_authority_address:
      "0x0f0b8aa14e1c9764fa8e4fa8b38fd3d3b8c2498a",
    legacy_authority_address:
      "0xc884f631c3881b8b672bfcbf019c856146cd7f73",
    legacy_authority_migrates: false,
    live_transfer_required: false,
  },
);

// Bind source supply/holder truth through the successor evidence chain.
assert.equal(source.void_token.holder_sum_matches_total_supply, true);
assert.equal(
  source.void_token.holder_balance_sum_atoms,
  source.void_token.total_supply_atoms,
);
assert.equal(
  clientNeutral.token_total_supply_atoms,
  source.void_token.total_supply_atoms,
);
assert.equal(
  custody.void_token.final_source_total_supply_atoms,
  source.void_token.total_supply_atoms,
);
assert.equal(
  custody.token_holder_transition.source_total_atoms,
  source.void_token.total_supply_atoms,
);
assert.equal(
  custody.token_holder_transition.successor_planned_total_atoms,
  source.void_token.total_supply_atoms,
);
assert.equal(
  packet.material.successor_state.void_token_total_supply_atoms,
  source.void_token.total_supply_atoms,
);
assert.equal(
  packet.material.custody.source_successor_total_atoms,
  source.void_token.total_supply_atoms,
);

assert.equal(
  source.void_token.nonzero_holders.length,
  source.void_token.nonzero_holder_count,
);
assert.equal(
  clientNeutral.successor_holder_count,
  source.void_token.nonzero_holder_count,
);
assert.equal(
  custody.token_holder_transition.source_nonzero_holder_count,
  source.void_token.nonzero_holder_count,
);
assert.equal(
  custody.token_holder_transition.successor_planned_nonzero_holder_count,
  source.void_token.nonzero_holder_count,
);
assert.equal(
  packet.material.successor_state.void_token_nonzero_holder_count,
  source.void_token.nonzero_holder_count,
);

const sourceHoldersByLabel = new Map(
  source.void_token.nonzero_holders.map((row) => [row.label, row]),
);
assert.equal(sourceHoldersByLabel.size, source.void_token.nonzero_holder_count);

for (const destination of custody.destinations) {
  const sourceHolder = sourceHoldersByLabel.get(destination.source_label);
  assert(sourceHolder, `missing source holder for ${destination.source_label}`);
  assert.equal(destination.source_address, sourceHolder.address);
  assert.equal(destination.source_balance_atoms, sourceHolder.balance_atoms);
  assert.equal(
    destination.successor_initial_balance_atoms,
    destination.source_balance_atoms,
  );
  assert.equal(destination.source_successor_balance_delta_atoms, "0");
  assert.equal(destination.live_transfer_required, false);
}

assert.equal(
  treasuryDestination.successor_address,
  custody.address_assignment.treasury_address,
);
assert.equal(
  treasuryDestination.successor_address,
  packet.material.custody.treasury_address,
);
assert.equal(
  treasuryDestination.successor_initial_balance_atoms,
  custody.token_holder_transition.new_treasury_balance_atoms,
);

assert.equal(stakingDestination.successor_address, stakingDestination.source_address);
assert.equal(
  stakingDestination.successor_address,
  packet.material.custody.staking_address,
);
assert.equal(
  stakingDestination.successor_initial_balance_atoms,
  custody.token_holder_transition.upgrade_staking_balance_preserved_atoms,
);

assert.equal(
  presaleDestination.successor_address,
  custody.address_assignment.presale_address,
);
assert.equal(
  presaleDestination.successor_address,
  packet.material.custody.presale_address,
);
assert.equal(
  presaleDestination.successor_initial_balance_atoms,
  custody.token_holder_transition.new_presale_balance_atoms,
);
assert.equal(
  presaleDestination.source_remaining_inventory_atoms,
  presaleDestination.source_balance_atoms,
);

const sourceHolderBalanceSum = source.void_token.nonzero_holders.reduce(
  (sum, row) => sum + BigInt(row.balance_atoms),
  0n,
);
const successorDestinationBalanceSum = custody.destinations.reduce(
  (sum, row) => sum + BigInt(row.successor_initial_balance_atoms),
  0n,
);
assert.equal(
  sourceHolderBalanceSum.toString(),
  source.void_token.total_supply_atoms,
);
assert.equal(
  successorDestinationBalanceSum.toString(),
  custody.token_holder_transition.successor_planned_total_atoms,
);
assert.equal(
  (
    successorDestinationBalanceSum - sourceHolderBalanceSum
  ).toString(),
  custody.token_holder_transition.planned_supply_delta_atoms,
);

assert.deepEqual(
  {
    marker: source.marker,
    version: source.version,
    status: source.status,
    chain_id: source.chain_id,
    execution_epoch: source.execution_epoch,
  },
  {
    marker: "VOID_ECONOMIC_GENESIS_ARCHIVE_FINAL_SNAPSHOT_V1",
    version: 1,
    status: "FINAL_EPOCH1_SNAPSHOT",
    chain_id: 2050,
    execution_epoch: 1,
  },
);

assert.equal(
  clientNeutral.marker,
  "VOID_ECONOMIC_EPOCH2_CLIENT_NEUTRAL_STATE_MANIFEST_EVIDENCE_V1",
);
assert.equal(clientNeutral.version, 1);
assert.equal(clientNeutral.status, "CLIENT_NEUTRAL_STATE_MANIFEST_GREEN");
assert.match(clientNeutral.source_commit, /^[0-9a-f]{40}$/);
assert.match(
  clientNeutral.manifest_filename,
  /^void_economic_epoch2_client_neutral_state_manifest_v1_/,
);
assert.equal(clientNeutral.migration_authorized, false);
assert.equal(clientNeutral.public_activation_authorized, false);
assert.equal(clientNeutral.authority.authoritative_chain2050_write, false);
assert.equal(clientNeutral.authority.token_movement, false);
assert.equal(clientNeutral.authority.funds_movement, false);

assert.equal(
  besuNonce.marker,
  "VOID_ECONOMIC_EPOCH2_BESU_NONCE_CONTINUITY_EVIDENCE_V1",
);
assert.equal(besuNonce.version, 1);
assert.equal(
  besuNonce.status,
  "BESU_NONCE_CONTINUITY_AND_ECONOMIC_STATE_EQUIVALENCE_GREEN",
);
assert.match(besuNonce.source_commit, /^[0-9a-f]{40}$/);
assert.equal(
  besuNonce.source_state.client_neutral_state_manifest_file_sha256,
  clientNeutral.manifest_file_sha256,
);
assert.equal(besuNonce.source_state.frozen_epoch1_block_number, "37392");
assert.equal(
  besuNonce.source_state.frozen_epoch1_block_hash,
  "0x739679fd9f9b6f96213c440350980a1b590324c9152b7c394c81ce3627c94f52",
);
assert.equal(
  besuNonce.source_state.frozen_epoch1_state_sha256,
  source.durable_archive_checkpoint.state_sha256,
);
assert.equal(besuNonce.gates.migration_authorized, false);
assert.equal(besuNonce.gates.public_activation_authorized, false);
assert.equal(besuNonce.authority.authoritative_chain2050_write, false);
assert.equal(besuNonce.authority.transaction_broadcast, false);

assert.deepEqual(
  {
    marker: custody.marker,
    version: custody.version,
    status: custody.status,
    chain_id: custody.chain_id,
    execution_epoch: custody.execution_epoch,
  },
  {
    marker: "VOID_ECONOMIC_EPOCH2_CONTRACT_HOLDER_DESTINATION_MANIFEST_V1",
    version: 1,
    status: "SOURCE_DESTINATION_PLAN_READY",
    chain_id: 2050,
    execution_epoch: 2,
  },
);
assert.equal(custody.authority.chain2050_write, false);
assert.equal(custody.authority.token_movement, false);
assert.equal(custody.authority.money_movement, false);

assert.equal(
  packet.marker,
  "VOID_ECONOMIC_EPOCH2_PUBLIC_MIGRATION_EVIDENCE_V1",
);
assert.equal(packet.version, 1);
assert.equal(
  packet.status,
  "PUBLIC_MIGRATION_MANIFEST_READY_SUCCESSOR_STATE_ARTIFACT_HOLD",
);
assert.equal(
  packet.migration_manifest_hash_algorithm,
  "sha256-canonical-json-v1",
);
assert.equal(
  sha256(canonical(packet.material)),
  packet.migration_manifest_material_sha256,
);
assert.equal(
  packet.migration_manifest_material_sha256,
  "7793624324ce6b171f43c1f8089af7edfbbc8c5144eefe911688128600847572",
);

assert.equal(packet.material.chain_id, 2050);
assert.equal(packet.material.execution_epoch, 2);

assert.equal(
  packet.material.source_snapshot.final_block_number,
  source.final_block_number,
);
assert.equal(
  packet.material.source_snapshot.final_block_hash,
  source.final_block_hash,
);
assert.equal(
  packet.material.source_snapshot.state_sha256,
  source.durable_archive_checkpoint.state_sha256,
);
assert.equal(
  packet.material.source_snapshot.archive_manifest_sha256,
  source.durable_archive_checkpoint.manifest_sha256,
);
assert.equal(
  packet.material.source_snapshot.archive_complete_sha256,
  source.durable_archive_checkpoint.complete_sha256,
);
assert.equal(source.promotion.source_snapshot_public_evidence_ready, true);

assert.equal(
  packet.material.successor_state.client_neutral_manifest_file_sha256,
  clientNeutral.manifest_file_sha256,
);
assert.equal(
  packet.material.successor_state.client_neutral_manifest_material_sha256,
  clientNeutral.manifest_material_sha256,
);
assert.equal(
  packet.material.successor_state.void_token_total_supply_atoms,
  clientNeutral.token_total_supply_atoms,
);
assert.equal(
  packet.material.successor_state.void_token_nonzero_holder_count,
  clientNeutral.successor_holder_count,
);

assert.equal(packet.material.successor_state.client, besuNonce.besu.name);
assert.equal(
  packet.material.successor_state.client_version,
  besuNonce.besu.version,
);
assert.equal(
  packet.material.successor_state.client_repo_digest,
  besuNonce.besu.repo_digest,
);
assert.equal(
  packet.material.successor_state.genesis_block_hash,
  besuNonce.besu.genesis_block_hash,
);
assert.equal(
  packet.material.successor_state.genesis_state_root,
  besuNonce.besu.genesis_state_root,
);
assert.equal(
  packet.material.successor_state.alloc_account_count,
  besuNonce.state_equivalence.alloc_account_count,
);
assert.equal(
  packet.material.successor_state.economic_state_account_count,
  besuNonce.state_equivalence.economic_state_account_count,
);
assert.equal(
  packet.material.successor_state.verified_storage_entry_count,
  besuNonce.state_equivalence.verified_storage_entry_count,
);
assert.equal(
  packet.material.successor_state.frozen_nonce_census_sha256,
  besuNonce.nonce_continuity.canonical_nonce_tsv_sha256,
);
assert.equal(besuNonce.nonce_continuity.all_nonce_readbacks_exact, true);
assert.equal(besuNonce.nonce_continuity.all_nonce_only_native_balances_zero, true);
assert.equal(besuNonce.nonce_continuity.all_retired_nonce_only_code_absent, true);

assert.equal(
  packet.material.successor_state.void_token_address,
  custody.void_token.address,
);
assert.equal(
  packet.material.custody.treasury_address,
  custody.address_assignment.treasury_address,
);
assert.equal(
  packet.material.custody.staking_address,
  custody.destinations.find((row) => row.source_label === "UpgradeStaking")
    .successor_address,
);
assert.equal(
  packet.material.custody.presale_address,
  custody.address_assignment.presale_address,
);
assert.equal(
  packet.material.custody.source_successor_total_atoms,
  custody.token_holder_transition.successor_planned_total_atoms,
);
assert.equal(
  packet.material.custody.planned_supply_delta_atoms,
  custody.token_holder_transition.planned_supply_delta_atoms,
);
assert.equal(
  packet.material.custody.live_token_transfer_required,
  custody.token_holder_transition.live_token_transfer_required,
);

assert.deepEqual(packet.publication, {
  public_path: packetPath,
  public_route: "/public-node/evidence/economic-epoch2-migration-manifest-v1.json",
  migration_manifest_content_addressed: true,
  successor_genesis_or_state_manifest_public_evidence_ready: false,
  successor_state_root_public_void_anchor_ready: false,
  public_balance_receipt_code_verification_ready: false,
  live_balance_receipt_code_gateway_ready: false,
  migration_authorized: false,
  public_activation_authorized: false,
});

assert.equal(
  candidate.public_verification.migration_manifest_content_addressed,
  true,
);
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

const migrationRoutes = index.routes.filter(
  (row) =>
    row.route ===
      "/public-node/evidence/economic-epoch2-migration-manifest-v1.json",
);
assert.equal(
  migrationRoutes.length,
  1,
  "public index must contain exactly one migration evidence route",
);
const [route] = migrationRoutes;
assertExactTopLevelKeys(route, [
  "kind",
  "label",
  "method",
  "public_safe",
  "read_only",
  "route",
  "status",
  "migration_authorized",
  "public_activation_authorized",
  "successor_state_artifact_public",
], "public_index.economic_epoch2_migration_evidence_route");
assert.deepEqual(route, {
  kind: "economic_epoch2_migration_evidence",
  label: "Epoch-2 economic migration evidence",
  method: "GET",
  public_safe: true,
  read_only: true,
  route: "/public-node/evidence/economic-epoch2-migration-manifest-v1.json",
  status: "content_addressed_migration_manifest_ready_successor_state_artifact_public",
  migration_authorized: false,
  public_activation_authorized: false,
  successor_state_artifact_public: true,
});

assert.deepEqual(
  {
    marker: publicState.marker,
    version: publicState.version,
    status: publicState.status,
    chain_id: publicState.chain_id,
    execution_epoch: publicState.execution_epoch,
    account_count: publicState.accounts.length,
    material_sha256: publicState.manifest_material_sha256,
    migration_authorized: publicState.gates.migration_authorized,
    public_activation_authorized: publicState.gates.public_activation_authorized,
  },
  {
    marker: "VOID_ECONOMIC_EPOCH2_CLIENT_NEUTRAL_STATE_MANIFEST_V1",
    version: 1,
    status: "CLIENT_NEUTRAL_STATE_MANIFEST_GREEN",
    chain_id: 2050,
    execution_epoch: 2,
    account_count: 4,
    material_sha256: publicStateMaterialSha256,
    migration_authorized: false,
    public_activation_authorized: false,
  },
);

const publicStateRoutes = index.routes.filter(
  (row) => row.route === publicStateRoute,
);
assert.equal(
  publicStateRoutes.length,
  1,
  "public index must contain exactly one successor state manifest route",
);
const [publicStateIndexRoute] = publicStateRoutes;
assertExactTopLevelKeys(publicStateIndexRoute, [
  "kind",
  "label",
  "method",
  "public_safe",
  "read_only",
  "route",
  "status",
  "file_sha256",
  "material_sha256",
  "migration_authorized",
  "public_activation_authorized",
], "public_index.economic_epoch2_state_manifest_route");
assert.deepEqual(publicStateIndexRoute, {
  kind: "economic_epoch2_client_neutral_state_manifest",
  label: "Epoch-2 client-neutral successor state manifest",
  method: "GET",
  public_safe: true,
  read_only: true,
  route: publicStateRoute,
  status: "exact_state_manifest_publicly_retrievable",
  file_sha256: publicStateFileSha256,
  material_sha256: publicStateMaterialSha256,
  migration_authorized: false,
  public_activation_authorized: false,
});

assert.deepEqual(packet.authority, {
  source_only: true,
  runtime_mutation: false,
  rpc_call: false,
  wallet_or_signer_access: false,
  private_key_access: false,
  transaction_construction: false,
  transaction_signing: false,
  transaction_submission: false,
  transaction_broadcast: false,
  authoritative_chain2050_write: false,
  token_movement: false,
  funds_movement: false,
  migration_activation: false,
  public_activation: false,
});

console.log("VOID_ECONOMIC_EPOCH2_PUBLIC_MIGRATION_EVIDENCE_V1_GREEN");
console.log("migration_manifest_content_addressed=true");
console.log("advertised_evidence_paths_exactly_verified=true");
console.log("allowlisted_evidence_identity_schemas_verified=true");
console.log("allowlisted_evidence_top_level_schemas_closed=true");
console.log("duplicate_json_object_keys_rejected_before_parse=true");
console.log("public_packet_nested_schemas_closed=true");
console.log("referenced_evidence_nested_authority_schemas_closed=true");
console.log("referenced_evidence_nested_authority_values_exact=true");
console.log("custody_voidtoken_authority_mapping_exact=true");
console.log("custody_destination_authority_mappings_exact=true");
console.log("custody_destination_schemas_closed=true");
console.log("source_successor_supply_conservation_bound=true");
console.log("source_successor_holder_count_bound=true");
console.log("custody_destination_source_map_bound=true");
console.log("custody_destination_successor_map_bound=true");
console.log("custody_destination_balance_conservation_bound=true");
console.log("source_snapshot_file_sha256_bound=true");
console.log("custody_destination_manifest_file_sha256_bound=true");
console.log("client_neutral_evidence_file_sha256_bound=true");
console.log("besu_nonce_evidence_file_sha256_bound=true");
console.log("client_neutral_semantic_equivalence_predicates_true=true");
console.log("retired_holder_post_import_balances_zero=true");
console.log("public_index_migration_route_unique=true");
console.log("public_index_migration_route_schema_closed=true");
console.log("public_state_manifest_file_sha256_bound=true");
console.log("public_state_manifest_material_sha256_bound=true");
console.log("public_state_manifest_index_route_unique=true");
console.log("public_state_manifest_index_route_schema_closed=true");
console.log("public_index_migration_route_status_public_exact=true");
console.log("successor_evidence_contradictory_chain_epoch_fields_rejected=true");
console.log("migration_manifest_material_sha256=" + packet.migration_manifest_material_sha256);
console.log("successor_genesis_or_state_manifest_public_evidence_ready=true");
console.log("successor_genesis_block_hash=" + packet.material.successor_state.genesis_block_hash);
console.log("successor_genesis_state_root=" + packet.material.successor_state.genesis_state_root);
console.log("successor_state_root_public_void_anchor_ready=false");
console.log("public_balance_receipt_code_verification_ready=false");
console.log("migration_authorized=false");
console.log("public_activation=false");
