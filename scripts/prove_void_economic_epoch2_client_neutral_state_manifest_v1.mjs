#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";

import {
  VOID_ECONOMIC_EPOCH2_CLIENT_NEUTRAL_STATE_MANIFEST_AUTHORITY_V1,
  VOID_ECONOMIC_EPOCH2_CLIENT_NEUTRAL_STATE_MANIFEST_V1,
  buildVoidEconomicEpoch2ClientNeutralStateManifestV1,
  voidEconomicEpoch2TokenBalanceStorageSlotV1,
} from "../tools/void-economic-epoch2-client-neutral-state-manifest-v1.mjs";

const sha256 = (value) =>
  crypto.createHash("sha256").update(value).digest("hex");
const runtime = (hex) => ({
  runtime_code_hex: hex,
  runtime_bytes: (hex.length - 2) / 2,
  runtime_sha256: sha256(Buffer.from(hex.slice(2), "hex")),
});

const validators = Array.from({ length: 126 }, (_, index) => ({
  reward: `0x${BigInt(index + 1).toString(16).padStart(40, "0")}`,
  controller: `0x${BigInt(index + 1001).toString(16).padStart(40, "0")}`,
}));
const storageEntries = [
  { slot: "0x" + "0".repeat(64), value: "0x" + "0".repeat(64) },
  {
    slot: "0x" + "0".repeat(63) + "2",
    value: "0x" + "0".repeat(62) + "7e",
  },
];

const stakingCode = runtime("0x60006000");
const staking = {
  address: "0x77dfeedd19a4741f299c902ad5bbe0de917a9e59",
  runtime_sha256: stakingCode.runtime_sha256,
  runtime_code_hex: stakingCode.runtime_code_hex,
  validator_count: 126,
  active_validator_count: 126,
  stake_sum_atoms: "126000000000000000000000",
  unbond_sum_atoms: "0",
  storage_entries: storageEntries,
  nonzero_storage_entries: storageEntries.slice(1),
  validators,
};
const stakingReceipt = {
  marker: "VOID_ECONOMIC_EPOCH2_STAKING_STATE_EXPORT_V1",
  status: "STAKING_STATE_EXPORT_GREEN",
  receipt_sha256: "a".repeat(64),
  staking,
};
const stakingSerialized = Buffer.from(JSON.stringify(stakingReceipt), "utf8");
const stakingEvidence = {
  receipt_file_sha256: sha256(stakingSerialized),
  receipt_material_sha256: stakingReceipt.receipt_sha256,
  staking: {
    runtime_sha256: stakingCode.runtime_sha256,
    runtime_bytes: stakingCode.runtime_bytes,
    storage_entry_count: storageEntries.length,
    nonzero_storage_entry_count: 1,
    storage_manifest_sha256: sha256(
      Buffer.from(JSON.stringify(storageEntries), "utf8"),
    ),
    nonzero_storage_manifest_sha256: sha256(
      Buffer.from(JSON.stringify(storageEntries.slice(1)), "utf8"),
    ),
    validator_manifest_sha256: sha256(
      Buffer.from(JSON.stringify(validators), "utf8"),
    ),
  },
};

function runtimePair(key, address, contract, sourcePath, codeHex) {
  const r = runtime(codeHex);
  return {
    full: {
      address,
      contract,
      source_path: sourcePath,
      source_git_blob_sha1: key.repeat(40).slice(0, 40),
      runtime_code_hex: r.runtime_code_hex,
    },
    compact: {
      address,
      contract,
      source_path: sourcePath,
      source_git_blob_sha1: key.repeat(40).slice(0, 40),
      runtime_bytes: r.runtime_bytes,
      runtime_sha256: r.runtime_sha256,
    },
  };
}

const token = runtimePair(
  "1",
  "0x470075b85352eb86f7d089fb9ba88945f12aad94",
  "VoidEpoch2TokenV1",
  "contracts/epoch2/VoidEpoch2TokenV1.sol",
  "0x6001600055",
);
const treasury = runtimePair(
  "2",
  "0x26c501a1edca3614f214face2d9b7be2aa7c864b",
  "VoidEpoch2TreasuryCustodyV1",
  "contracts/epoch2/VoidEpoch2TreasuryCustodyV1.sol",
  "0x6002600055",
);
const presale = runtimePair(
  "3",
  "0x530bc90ba74f2539a9e484ccb1be9291c3bc35ce",
  "VoidEpoch2PresaleFulfillmentV1",
  "contracts/epoch2/VoidEpoch2PresaleFulfillmentV1.sol",
  "0x6003600055",
);

const runtimeArtifact = {
  marker: "VOID_ECONOMIC_EPOCH2_RUNTIME_BYTECODE_MANIFEST_V1",
  status: "COMPILED_RUNTIME_MANIFEST_GREEN",
  runtimes: {
    void_token: token.full,
    treasury_custody: treasury.full,
    presale_fulfillment: presale.full,
  },
};
const runtimeCompact = {
  runtimes: {
    void_token: token.compact,
    treasury_custody: treasury.compact,
    presale_fulfillment: presale.compact,
  },
};

const destinationManifest = {
  void_token: {
    successor_runtime_semantic_equivalence_verified: true,
  },
  token_holder_transition: {
    planned_supply_delta_atoms: "0",
    live_token_transfer_required: false,
  },
};

const manifest = buildVoidEconomicEpoch2ClientNeutralStateManifestV1({
  stakingReceipt,
  stakingEvidence,
  runtimeArtifact,
  runtimeCompact,
  destinationManifest,
});

assert.equal(
  manifest.marker,
  VOID_ECONOMIC_EPOCH2_CLIENT_NEUTRAL_STATE_MANIFEST_V1,
);
assert.equal(manifest.status, "CLIENT_NEUTRAL_STATE_MANIFEST_GREEN");
assert.equal(manifest.chain_id, 2050);
assert.equal(manifest.execution_epoch, 2);
assert.equal(manifest.accounts.length, 4);
assert.equal(
  manifest.token_state.total_supply_atoms,
  "333333333000000000000000000",
);
assert.equal(
  manifest.token_state.holder_sum_atoms,
  manifest.token_state.total_supply_atoms,
);
assert.equal(manifest.token_state.successor_nonzero_holder_count, 3);
assert.equal(manifest.token_state.allowances_nonzero_count, 0);
assert.equal(
  manifest.staking_state.stake_sum_atoms,
  "126000000000000000000000",
);
assert.equal(manifest.staking_state.unbond_sum_atoms, "0");
assert.equal(manifest.staking_state.exact_address_runtime_storage_preserved, true);
assert.equal(manifest.gates.token_behavioral_semantic_equivalence, true);
assert.equal(manifest.gates.staking_exact_state_bound, true);
assert.equal(manifest.gates.offline_successor_equivalence_proven, false);
assert.equal(manifest.gates.client_specific_genesis_built, false);
assert.equal(manifest.gates.migration_authorized, false);
assert.equal(manifest.gates.public_activation_authorized, false);
assert.match(manifest.manifest_material_sha256, /^[0-9a-f]{64}$/);

const tokenSlot = voidEconomicEpoch2TokenBalanceStorageSlotV1(
  "0x26c501a1edca3614f214face2d9b7be2aa7c864b",
);
assert.match(tokenSlot, /^0x[0-9a-f]{64}$/);
assert.notEqual(
  tokenSlot,
  voidEconomicEpoch2TokenBalanceStorageSlotV1(
    "0x530bc90ba74f2539a9e484ccb1be9291c3bc35ce",
  ),
);

assert.equal(
  manifest.excluded_from_client_neutral_manifest.native_gas_accounting,
  true,
);
assert.equal(
  manifest.excluded_from_client_neutral_manifest.consensus_or_client_genesis_fields,
  true,
);

for (const key of [
  "rpc_call",
  "authoritative_chain2050_write",
  "state_export_from_live_rpc",
  "genesis_client_selection",
  "client_specific_genesis_build",
  "runtime_process_start",
  "wallet_access",
  "private_key_access",
  "credential_content_access",
  "transaction_construction",
  "transaction_signing",
  "transaction_broadcast",
  "token_movement",
  "funds_movement",
  "contract_deployment",
  "public_activation",
]) {
  assert.equal(
    VOID_ECONOMIC_EPOCH2_CLIENT_NEUTRAL_STATE_MANIFEST_AUTHORITY_V1[key],
    false,
    key,
  );
}
assert.equal(
  VOID_ECONOMIC_EPOCH2_CLIENT_NEUTRAL_STATE_MANIFEST_AUTHORITY_V1.local_input_read,
  true,
);
assert.equal(
  VOID_ECONOMIC_EPOCH2_CLIENT_NEUTRAL_STATE_MANIFEST_AUTHORITY_V1.local_output_write,
  true,
);

console.log("VOID_ECONOMIC_EPOCH2_CLIENT_NEUTRAL_STATE_MANIFEST_V1_PROOF_GREEN");
console.log("account_count=4");
console.log("successor_nonzero_holder_count=3");
console.log("token_supply_conserved=true");
console.log("staking_exact_state_bound=true");
console.log("token_behavioral_semantic_equivalence=true");
console.log("native_gas_accounting_excluded=true");
console.log("client_specific_genesis_built=false");
console.log("migration_authorized=false");
console.log("public_activation_authorized=false");
