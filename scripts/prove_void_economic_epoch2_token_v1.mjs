#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import crypto from "node:crypto";

const sourcePath = "contracts/epoch2/VoidEpoch2TokenV1.sol";
const testPath = "test/epoch2/VoidEpoch2TokenV1.t.sol";
const evidencePath =
  "ops/mainnet0/economic-epoch2-legacy-token-semantic-census-v1.json";

const source = fs.readFileSync(sourcePath, "utf8");
const tests = fs.readFileSync(testPath, "utf8");
const evidence = JSON.parse(fs.readFileSync(evidencePath, "utf8"));

function gitBlobSha1(path) {
  const bytes = fs.readFileSync(path);
  const header = Buffer.from(`blob ${bytes.length}\0`, "utf8");
  return crypto.createHash("sha1").update(header).update(bytes).digest("hex");
}

assert.equal(
  evidence.marker,
  "VOID_ECONOMIC_EPOCH2_LEGACY_TOKEN_SEMANTIC_CENSUS_V1",
);
assert.equal(evidence.status, "SEMANTIC_CENSUS_GREEN");
assert.equal(
  evidence.receipt_file_sha256,
  "6edcb7c55e49fdffb373cf34d5ad4ab7358889cf6b91aabf3859565b4f98dd93",
);
assert.equal(
  evidence.receipt_material_sha256,
  "16d911b39a453cc70a08c47049c99722238c3c3e79b93534f4a857e16a0c3f3c",
);
assert.equal(
  evidence.edge_receipt.receipt_file_sha256,
  "020973ae2158b3b478a995938c7457c256f301768957adbb68bc40d12d59e7dd",
);
assert.equal(
  evidence.edge_receipt.receipt_material_sha256,
  "1b4d775a84cd50ea2925028d42cc0a606994828ac40f58a3ef809a5ef343876a",
);
assert.equal(
  evidence.transfer_from_positive_override_receipt.receipt_file_sha256,
  "bddc15dd74afa4fab6113cfb667bc97eaa31b22bffe8220286401e1f93231b62",
);
assert.equal(
  evidence.transfer_from_positive_override_receipt.receipt_material_sha256,
  "86714c7b15f40d1c7a21d047beb886a84238bb70bb913109b8cab01c14484052",
);
assert.equal(
  evidence.transfer_from_positive_override_receipt.allowance_storage_key,
  "0x0a9aa33a130b1f4cb715f8bd763f25186b809a560cde4a390b97e1bde11cfd44",
);
assert.equal(
  evidence.transfer_from_positive_override_receipt.call_succeeded,
  true,
);
assert.equal(
  evidence.transfer_from_positive_override_receipt.decoded_true,
  true,
);
assert.equal(
  evidence.transfer_from_positive_override_receipt.post_override_allowance_atoms,
  "0",
);
assert.equal(
  evidence.transfer_from_positive_override_receipt.override_persisted,
  false,
);
assert.equal(evidence.void_token.name, "VoidStones");
assert.equal(evidence.void_token.symbol, "VOID");
assert.equal(evidence.void_token.decimals, "18");
assert.equal(
  evidence.void_token.PREMINE_atoms,
  "333333333000000000000000000",
);
assert.equal(
  evidence.void_token.MAX_SUPPLY_atoms,
  "666666666000000000000000000",
);
assert.equal(
  evidence.void_token.successor_owner_target,
  "0x54ded2daa618a257093556a5f54c43805b9bd516",
);
assert.equal(evidence.getter_surface.maxSupply, false);
assert.equal(evidence.getter_surface.cap, false);
assert.equal(evidence.current_allowance_state.nonzero_allowance_count, 0);
assert.equal(
  evidence.observed_write_simulations.mint_one_atom_from_legacy_owner
    .call_succeeded,
  true,
);
assert.equal(
  evidence.observed_write_simulations.mint_one_atom_from_non_owner
    .revert_contains,
  "VoidToken: not owner",
);
assert.equal(
  evidence.observed_write_simulations
    .mint_one_atom_above_MAX_SUPPLY_from_owner.revert_contains,
  "VoidToken: cap exceeded",
);
assert.equal(
  evidence.observed_write_simulations.mint_to_zero_from_owner.revert_contains,
  "VoidToken: mint to zero",
);
assert.equal(
  evidence.observed_write_simulations.transfer_zero_amount_from_funded_holder
    .call_succeeded,
  true,
);
assert.equal(
  evidence.observed_write_simulations.transfer_one_atom_to_zero_from_funded_holder
    .revert_contains,
  "VoidToken: transfer to zero",
);
assert.equal(
  evidence.observed_write_simulations.transfer_one_atom_from_zero_balance_caller
    .revert_contains,
  "VoidToken: balance too low",
);
assert.equal(
  evidence.observed_write_simulations.transfer_zero_amount_from_zero_balance_caller
    .call_succeeded,
  true,
);
assert.equal(
  evidence.observed_write_simulations.transfer_one_atom_to_self_from_funded_holder
    .call_succeeded,
  true,
);
assert.equal(
  evidence.observed_write_simulations.approve_zero_spender_one_atom
    .revert_contains,
  "VoidToken: approve to zero",
);
assert.equal(
  evidence.observed_write_simulations.approve_nonzero_spender_zero_amount
    .call_succeeded,
  true,
);
assert.equal(
  evidence.observed_write_simulations.transfer_from_without_allowance_one_atom
    .revert_contains,
  "VoidToken: allowance exceeded",
);
assert.equal(
  evidence.observed_write_simulations.transfer_from_without_allowance_zero_amount
    .call_succeeded,
  true,
);
assert.equal(
  evidence.observed_write_simulations.transfer_from_without_allowance_zero_to_zero
    .revert_contains,
  "VoidToken: transfer to zero",
);
assert.equal(
  evidence.observed_write_simulations.mint_zero_amount_from_owner_to_nonzero
    .call_succeeded,
  true,
);
assert.equal(
  evidence.observed_write_simulations.mint_zero_amount_from_non_owner_to_nonzero
    .revert_contains,
  "VoidToken: not owner",
);
assert.equal(
  evidence.observed_write_simulations.mint_zero_amount_from_owner_to_zero
    .revert_contains,
  "VoidToken: mint to zero",
);
assert.equal(
  evidence.observed_write_simulations
    .transfer_from_positive_with_read_only_allowance_override.call_succeeded,
  true,
);
assert.equal(
  evidence.observed_write_simulations
    .transfer_from_positive_with_read_only_allowance_override.decoded_true,
  true,
);
assert.equal(
  evidence.observed_write_simulations
    .transfer_from_positive_with_read_only_allowance_override.override_persisted,
  false,
);
assert.equal(evidence.interpretation.legacy_owner_runtime_embedded, true);
assert.equal(evidence.interpretation.exact_legacy_runtime_reuse_allowed, false);
assert.equal(evidence.interpretation.successor_runtime_rebuild_required, true);
assert.equal(
  evidence.interpretation.confirmed_semantic_equivalence_surface_complete,
  true,
);
assert.equal(evidence.interpretation.edge_census_green, true);
assert.equal(
  evidence.interpretation.unobserved_erc20_edge_behavior_requires_separate_review,
  false,
);
assert.deepEqual(evidence.interpretation.remaining_unobserved_behavior, []);
assert.equal(
  evidence.interpretation.successor_runtime_semantic_equivalence_supported,
  true,
);

for (const required of [
  'string public constant name = "VoidStones";',
  'string public constant symbol = "VOID";',
  "uint8 public constant decimals = 18;",
  "uint256 public constant PREMINE = 333_333_333 ether;",
  "uint256 public constant MAX_SUPPLY = 666_666_666 ether;",
  "0x54ded2DAA618a257093556A5F54c43805b9BD516",
  "uint256 public totalSupply;",
  "mapping(address => uint256) public balanceOf;",
  "mapping(address => mapping(address => uint256)) public allowance;",
  "function transfer(address to, uint256 amount)",
  "function approve(address spender, uint256 amount)",
  "function transferFrom(",
  "function mint(address to, uint256 amount)",
  '"VoidToken: not owner"',
  '"VoidToken: cap exceeded"',
  '"VoidToken: mint to zero"',
  '"VoidToken: balance too low"',
  '"VoidToken: allowance exceeded"',
  "event Transfer(",
  "event Approval(",
]) {
  assert.ok(source.includes(required), required);
}

for (const forbidden of [
  "0x0d66fcdf95d38f7db6b4206bf183f34cd816c2aa",
  "transferOwnership",
  "function maxSupply(",
  "function cap(",
  "delegatecall",
  "selfdestruct",
]) {
  assert.equal(
    source.toLowerCase().includes(forbidden.toLowerCase()),
    false,
    forbidden,
  );
}

const totalSupplyIndex = source.indexOf("uint256 public totalSupply;");
const balanceIndex = source.indexOf(
  "mapping(address => uint256) public balanceOf;",
);
const allowanceIndex = source.indexOf(
  "mapping(address => mapping(address => uint256)) public allowance;",
);
assert.ok(totalSupplyIndex >= 0, "totalSupply declaration missing");
assert.ok(balanceIndex > totalSupplyIndex, "balanceOf storage order");
assert.ok(allowanceIndex > balanceIndex, "allowance storage order");

for (const required of [
  "test_metadataAndAuthorityMatchObservedLegacySurface",
  "test_frozenSupplyAndThreeHolderBalancesImportExactly",
  "test_transferAndApproveReturnTrueLikeObservedLegacyCalls",
  "test_transferFromUsesAllowanceAndReturnsTrue",
  "test_mintIsCeremonyOwnerOnlyAndLegacyOwnerHasNoPower",
  "test_mintCapMatchesObservedLegacyBoundary",
  "test_mintToZeroMatchesObservedLegacyFailure",
  "test_edgeTransferSemanticsMatchFrozenLegacyCensus",
  "test_edgeApproveSemanticsMatchFrozenLegacyCensus",
  "test_edgeTransferFromSemanticsMatchFrozenLegacyCensus",
  "test_edgeMintZeroSemanticsMatchFrozenLegacyCensus",
  "test_noOwnershipTransferSurface",
  "test_allowanceStorageRootIsDeterministicForGenesisImport",
]) {
  assert.ok(tests.includes(required), required);
}

for (const key of [
  "authoritative_epoch1_service_action",
  "authoritative_epoch1_rpc_call",
  "authoritative_chain2050_write",
  "isolated_transaction_submission",
  "wallet_access",
  "private_key_access",
  "credential_content_access",
  "transaction_construction",
  "transaction_signing",
  "transaction_broadcast",
  "token_movement",
  "funds_movement",
  "successor_state_mutation",
  "successor_genesis_build",
  "public_activation",
]) {
  assert.equal(evidence.authority[key], false, key);
}

console.log("VOID_ECONOMIC_EPOCH2_TOKEN_V1_SOURCE_PROOF_GREEN");
console.log(`source_blob_sha1=${gitBlobSha1(sourcePath)}`);
console.log(`test_blob_sha1=${gitBlobSha1(testPath)}`);
console.log("canonical_address_preserved=true");
console.log("legacy_runtime_reused=false");
console.log("owner=premine_treasury_primary");
console.log("observed_metadata_bound=true");
console.log("observed_mint_boundary_bound=true");
console.log("observed_erc20_edge_semantics_bound=true");
console.log("genesis_storage_layout_explicit=true");
console.log("full_semantic_equivalence_claimed=true");
console.log("successor_genesis_build=false");
console.log("migration_authorized=false");
