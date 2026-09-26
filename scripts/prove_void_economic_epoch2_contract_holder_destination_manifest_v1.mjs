#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";

const ROOT=process.cwd();
const read=(p)=>fs.readFileSync(p);
const text=(p)=>read(p).toString("utf8");
const json=(p)=>JSON.parse(text(p));

const manifestPath=
  "ops/mainnet0/economic-epoch2-contract-holder-destination-manifest-v1.json";
const treasuryPath="contracts/epoch2/VoidEpoch2TreasuryCustodyV1.sol";
const presalePath="contracts/epoch2/VoidEpoch2PresaleFulfillmentV1.sol";
const stakingPath="contracts/mainnet/ValidatorStakingV2.sol";
const testPath="test/epoch2/VoidEpoch2CustodyContractsV1.t.sol";
const authorityPath="ops/mainnet0/economic-genesis-archive-authority-census-v1.json";
const obligationPath="ops/mainnet0/economic-genesis-archive-live-obligation-census-v1.json";
const roleMapPath="ops/mainnet0/economic-epoch2-ceremony-role-map-v1.json";
const ceremonyPath="ops/mainnet/mainnet0-key-ceremony-result-20260523-122739.md";
const bootstrapPath="script/mainnet_rebuild/VoidMainnetBootstrapDev.vaults-rebuild.s.sol";

function sha256Text(value){
  return crypto.createHash("sha256").update(value,"utf8").digest("hex");
}
function gitBlobSha1(path){
  const bytes=read(path);
  const header=Buffer.from(`blob ${bytes.length}\0`,"utf8");
  return crypto.createHash("sha1").update(header).update(bytes).digest("hex");
}
function derivedAddress(label){
  const hash=sha256Text(label);
  return "0x"+hash.slice(-40);
}

const m=json(manifestPath);
const authority=json(authorityPath);
const obligations=json(obligationPath);
const roleMap=json(roleMapPath);
const ceremony=text(ceremonyPath);
const bootstrap=text(bootstrapPath);

assert.equal(m.marker,"VOID_ECONOMIC_EPOCH2_CONTRACT_HOLDER_DESTINATION_MANIFEST_V1");
assert.equal(m.version,1);
assert.equal(m.status,"SOURCE_DESTINATION_PLAN_READY");
assert.equal(m.execution_epoch,2);
assert.equal(m.chain_id,2050);

assert.equal(
  derivedAddress(m.address_assignment.treasury_label),
  m.address_assignment.treasury_address,
);
assert.equal(
  sha256Text(m.address_assignment.treasury_label),
  m.address_assignment.treasury_sha256,
);
assert.equal(
  derivedAddress(m.address_assignment.presale_label),
  m.address_assignment.presale_address,
);
assert.equal(
  sha256Text(m.address_assignment.presale_label),
  m.address_assignment.presale_sha256,
);
assert.equal(m.address_assignment.deployer_nonce_dependency,false);
assert.equal(m.address_assignment.private_key_dependency,false);

const bySource=new Map(m.destinations.map((row)=>[row.source_label,row]));
assert.equal(bySource.size,3);

const treasury=bySource.get("VoidTreasury");
const staking=bySource.get("UpgradeStaking");
const presale=bySource.get("PresaleFulfillment");

assert.equal(treasury.mode,"REMAP_OFFLINE_STATE");
assert.equal(treasury.successor_address,m.address_assignment.treasury_address);
assert.equal(treasury.successor_source_git_blob_sha1,gitBlobSha1(treasuryPath));
assert.equal(treasury.successor_authority_role,"premine_treasury_primary");
assert.equal(treasury.successor_authority_address,"0x54ded2daa618a257093556a5f54c43805b9bd516");
assert.equal(treasury.legacy_authority_migrates,false);
assert.equal(treasury.live_transfer_required,false);

assert.equal(staking.mode,"PRESERVE_EXACT_ADDRESS_CODE_STORAGE");
assert.equal(staking.source_address,staking.successor_address);
assert.equal(staking.source_git_blob_sha1,gitBlobSha1(stakingPath));
assert.equal(staking.validator_count,"126");
assert.equal(staking.active_validator_count,"126");
assert.equal(staking.unbond_liability_atoms,"0");
assert.equal(staking.global_successor_admin_required,false);
assert.equal(staking.per_validator_controller_state_preserved,true);
assert.equal(staking.live_transfer_required,false);

assert.equal(presale.mode,"REMAP_OFFLINE_STATE");
assert.equal(presale.successor_address,m.address_assignment.presale_address);
assert.equal(presale.successor_source_git_blob_sha1,gitBlobSha1(presalePath));
assert.equal(presale.successor_authority_role,"launch_operator_signer");
assert.equal(presale.successor_authority_address,"0x0f0b8aa14e1c9764fa8e4fa8b38fd3d3b8c2498a");
assert.equal(presale.legacy_authority_migrates,false);
assert.equal(presale.source_total_fulfilled_atoms,"0");
assert.equal(presale.successor_initial_total_fulfilled_atoms,"0");
assert.equal(presale.live_transfer_required,false);

const sourceSum=m.destinations.reduce(
  (sum,row)=>sum+BigInt(row.source_balance_atoms),0n);
const successorSum=m.destinations.reduce(
  (sum,row)=>sum+BigInt(row.successor_initial_balance_atoms),0n);
assert.equal(sourceSum,333333333000000000000000000n);
assert.equal(successorSum,sourceSum);
assert.equal(BigInt(m.token_holder_transition.planned_supply_delta_atoms),0n);
assert.equal(m.token_holder_transition.live_token_transfer_required,false);
assert.equal(m.participant_eoa_transition.source_nonzero_eoa_holder_count,0);
assert.equal(m.participant_eoa_transition.same_address_balance_rule_satisfied_vacuously,true);

assert.equal(m.void_token.preserve_same_address,true);
assert.equal(m.void_token.preserve_runtime_identity,true);
assert.equal(m.void_token.preserve_total_supply,true);
assert.equal(m.void_token.successor_owner_role_verified,false);
assert.equal(m.void_token.legacy_owner_migrates,false);

assert.equal(authority.authorities.void_treasury_admin.in_may23_ceremony_set,false);
assert.equal(authority.authorities.presale_fulfiller.in_may23_ceremony_set,false);
assert.equal(authority.disposition_evidence.void_token_legacy_owner_must_not_migrate,true);
assert.equal(obligations.coverage.live_obligation_contract_census_complete,true);

assert.equal(roleMap.marker,"VOID_ECONOMIC_EPOCH2_CEREMONY_ROLE_MAP_V1");
assert.equal(roleMap.status,"SOURCE_ROLE_MAP_READY");
assert.ok(
  bootstrap.includes("new VoidToken(R.selectedPremineVault)"),
  "retained token owner bootstrap binding",
);

const mappedRoles=new Map(
  roleMap.role_map.map((row)=>[row.successor_surface,row]),
);
assert.equal(
  mappedRoles.get("VoidToken.owner")?.successor_role,
  "premine_treasury_primary",
);
assert.equal(
  mappedRoles.get("VoidToken.owner")?.address,
  "0x54ded2daa618a257093556a5f54c43805b9bd516",
);
assert.equal(
  mappedRoles.get("VoidEpoch2TreasuryCustodyV1.authority")?.address,
  "0x54ded2daa618a257093556a5f54c43805b9bd516",
);
assert.equal(
  mappedRoles.get("VoidEpoch2PresaleFulfillmentV1.fulfiller")?.address,
  "0x0f0b8aa14e1c9764fa8e4fa8b38fd3d3b8c2498a",
);
assert.equal(
  mappedRoles.get("ValidatorStakingV2.global_admin")?.successor_role,
  "none",
);

for(const address of [
  "0x54ded2DAA618a257093556A5F54c43805b9BD516",
  "0x0F0B8Aa14e1c9764fa8E4FA8b38fd3D3b8C2498A",
]){
  assert.ok(ceremony.includes(address), address);
}

assert.equal(roleMap.verification.all_selected_addresses_are_recorded_may23_addresses,true);
assert.equal(roleMap.verification.old_anvil_privileged_addresses_receive_successor_power,false);
assert.equal(roleMap.verification.new_key_generation_required,false);
assert.equal(roleMap.verification.secret_material_required_in_repo,false);
assert.equal(roleMap.verification.ceremony_authority_mapping_verified,true);
assert.equal(roleMap.verification.successor_role_to_ceremony_address_map_verified,true);
assert.equal(roleMap.verification.ceremony_backup_continuity_verified,false);

for(const row of roleMap.role_map){
  if(row.legacy_address){
    assert.notEqual(row.address,row.legacy_address);
    assert.equal(row.legacy_address_migrates,false);
  }
}

const treasurySource=text(treasuryPath);
const presaleSource=text(presalePath);
const tests=text(testPath);

for(const required of [
  "address public constant voidToken",
  "address public constant authority",
  "uint256 public constant executionEpoch = 2",
  "mapping(bytes32 => bool) public executed",
  "function release(",
  "ActionAlreadyExecuted",
  "TokenTransferFailed",
]){
  assert.ok(treasurySource.includes(required),required);
}
for(const forbidden of [
  "0x4e77786f32d41e40e7cef28389068d6f31f1d6a2",
  "constructor(",
  "delegatecall",
  "selfdestruct",
]){
  assert.equal(treasurySource.toLowerCase().includes(forbidden.toLowerCase()),false,forbidden);
}

for(const required of [
  "address public constant voidToken",
  "address public constant fulfiller",
  "uint256 public constant executionEpoch = 2",
  "uint256 public constant maxInventoryAtoms = 10_000_000 ether",
  "function fulfill(",
  "AlreadyFulfilled",
  "InventoryExceeded",
  "TokenTransferFailed",
]){
  assert.ok(presaleSource.includes(required),required);
}
for(const forbidden of [
  "0xc884f631c3881b8b672bfcbf019c856146cd7f73",
  "constructor(",
  "delegatecall",
  "selfdestruct",
]){
  assert.equal(presaleSource.toLowerCase().includes(forbidden.toLowerCase()),false,forbidden);
}

for(const required of [
  "test_constantsBindCanonicalTokenEpochAndCeremonyRoles",
  "test_treasuryReleaseIsCeremonyBoundAndReplaySafe",
  "test_treasuryFailedTransferRollsBackActionIdentity",
  "test_presaleIsCeremonyBoundPaymentKeyedAndInventoryCapped",
  "test_presaleFailedTransferRollsBackPaymentIdentity",
]){
  assert.ok(tests.includes(required),required);
}

assert.equal(m.review.contract_holder_destination_manifest_complete,true);
assert.equal(m.review.successor_custody_source_review_complete,true);
assert.equal(m.review.foundry_adversarial_tests_required,true);
assert.equal(m.review.foundry_adversarial_tests_green,true);
assert.equal(m.review.foundry_evidence.conclusion,"success");
assert.equal(m.review.foundry_evidence.run_id,"36258456816");
assert.equal(m.review.voidtoken_owner_role_mapping_still_required,true);
assert.equal(m.review.offline_successor_build_still_required,true);
assert.equal(m.review.source_successor_equivalence_still_required,true);

for(const key of [
  "rpc_call","state_export","genesis_build","wallet_access","private_key_access",
  "transaction_construction","transaction_signing","transaction_broadcast",
  "chain2050_write","token_movement","contract_deployment","public_activation",
  "money_movement"
]){
  assert.equal(m.authority[key],false,key);
}

console.log("VOID_ECONOMIC_EPOCH2_CONTRACT_HOLDER_DESTINATION_MANIFEST_V1_PROOF_GREEN");
console.log("destination_count=3");
console.log("treasury_mode=REMAP_OFFLINE_STATE");
console.log("staking_mode=PRESERVE_EXACT_ADDRESS_CODE_STORAGE");
console.log("presale_mode=REMAP_OFFLINE_STATE");
console.log("planned_supply_delta_atoms=0");
console.log("live_transfer_required=false");
console.log("voidtoken_owner_role=premine_treasury_primary");
console.log("ceremony_authority_mapping_verified=true");
console.log("ceremony_backup_continuity_verified=false");
console.log("foundry_adversarial_tests_green=true");
console.log("migration_authorized=false");
