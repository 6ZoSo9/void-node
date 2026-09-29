#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";

const json=(path)=>JSON.parse(fs.readFileSync(path,"utf8"));
const text=(path)=>fs.readFileSync(path,"utf8");
const norm=(value)=>String(value||"").toLowerCase();
const sha256=(value)=>crypto.createHash("sha256").update(value,"utf8").digest("hex");

const evidencePath="ops/mainnet0/economic-epoch2-privileged-signer-replay-fence-v1.json";
const evidence=json(evidencePath);
const roleMap=json("ops/mainnet0/economic-epoch2-ceremony-role-map-v1.json");
const authority=json("ops/mainnet0/economic-genesis-archive-authority-census-v1.json");
const nonce=json("ops/mainnet0/economic-epoch2-account-nonce-continuity-candidate-v1.json");
const closeout=json("ops/mainnet0/economic-epoch2-signed-artifact-census-closeout-v1.json");
const wcReceipt=json("docs/public/public-node-wc-to-void-redacted-settlement-receipt-v1.json");
const opsSeed=text("ops/mainnet/mainnet0-ops-treasury-seed-live.20260524-115943.md");
const candidate=json("ops/mainnet0/economic-evm-successor-migration-candidate-v1.json");

assert.equal(evidence.marker,"VOID_ECONOMIC_EPOCH2_PRIVILEGED_SIGNER_REPLAY_FENCE_V1");
assert.equal(evidence.version,1);
assert.equal(evidence.status,"PRIVILEGED_SIGNER_REPLAY_FENCE_GREEN");
assert.equal(evidence.chain_id,2050);
assert.equal(evidence.source_execution_epoch,1);
assert.equal(evidence.successor_execution_epoch,2);

assert.equal(roleMap.marker,"VOID_ECONOMIC_EPOCH2_CEREMONY_ROLE_MAP_V1");
assert.equal(roleMap.verification.ceremony_authority_mapping_verified,true);
assert.equal(roleMap.verification.successor_role_to_ceremony_address_map_verified,true);
assert.equal(roleMap.verification.ceremony_backup_continuity_verified,true);

const successorAddresses=[...new Set(
  roleMap.role_map.filter((row)=>row.address).map((row)=>norm(row.address)),
)].sort();
const expectedSuccessorAddresses=evidence.successor_privileged_authorities
  .map((row)=>norm(row.address)).sort();
assert.deepEqual(successorAddresses,expectedSuccessorAddresses);
assert.equal(successorAddresses.length,2);

const nonceByAddress=new Map(
  nonce.accounts.map((row)=>[norm(row.address),String(row.frozen_final_nonce)]),
);
for(const row of evidence.successor_privileged_authorities){
  const address=norm(row.address);
  assert.equal(nonceByAddress.has(address),false,address);
  assert.equal(row.frozen_final_nonce,"0");
}
assert.equal(evidence.key_separation.successor_privileged_address_count,2);
assert.equal(evidence.key_separation.successor_privileged_nonzero_nonce_count,0);
assert.equal(
  evidence.key_separation.every_successor_privileged_address_absent_from_frozen_nonzero_nonce_census,
  true,
);

const legacyAuthorities=Object.values(authority.authorities)
  .filter((row)=>row && row.address && norm(row.address)!=="0x0000000000000000000000000000000000000000")
  .map((row)=>norm(row.address));
const legacyOverlap=successorAddresses.filter((address)=>legacyAuthorities.includes(address));
assert.deepEqual(legacyOverlap,[]);
assert.equal(evidence.key_separation.legacy_privileged_authority_overlap_count,0);
assert.equal(evidence.key_separation.legacy_privileged_authority_reuse_by_successor,false);

for(const key of ["void_token_owner","void_treasury_admin","ops_treasury_admin","presale_fulfiller"]){
  assert.equal(authority.authorities[key].in_may23_ceremony_set,false,key);
}

assert.equal(closeout.marker,"VOID_ECONOMIC_EPOCH2_SIGNED_ARTIFACT_CENSUS_CLOSEOUT_V1");
assert.equal(closeout.decision.pending_legacy_signed_transaction_census_complete,true);
assert.equal(closeout.decision.privileged_signer_nonce_or_key_replay_fence_proven,false);
assert.equal(closeout.decision.cross_epoch_replay_protection_proven,false);
assert.equal(closeout.controlled_store_scope.precision_controlled_artifact_lane_complete,true);
assert.equal(closeout.controlled_store_scope.nimo_controlled_artifact_lane_complete,true);
assert.equal(closeout.controlled_store_scope.encrypted_void_authority_backup_lane_complete,true);
assert.equal(closeout.controlled_store_scope.additional_designated_signed_artifact_store_identified,false);

for(const [label,sweep] of [
  ["precision",closeout.precision_receipt_bound_sweep],
  ["nimo",closeout.nimo_receipt_bound_sweep],
]){
  assert.equal(sweep.full_receipt_bound_content_sweep_complete,true,label);
  assert.equal(sweep.signed_chain2050_transaction_count,3,label);
  assert.equal(sweep.stale_signed_chain2050_transaction_count,3,label);
  assert.equal(sweep.requires_operator_followup_count,0,label);
  assert.equal(sweep.raw_transaction_printed,false,label);
  assert.equal(sweep.raw_transaction_persisted,false,label);
  assert.equal(sweep.transaction_broadcast,false,label);
  assert.equal(sweep.authoritative_chain2050_write,false,label);
}

assert.equal(
  evidence.serialized_artifact_fence.pending_legacy_signed_transaction_census_complete,
  true,
);
assert.equal(evidence.serialized_artifact_fence.precision_signed_chain2050_transaction_count,3);
assert.equal(evidence.serialized_artifact_fence.precision_stale_signed_chain2050_transaction_count,3);
assert.equal(evidence.serialized_artifact_fence.precision_requires_operator_followup_count,0);
assert.equal(evidence.serialized_artifact_fence.nimo_signed_chain2050_transaction_count,3);
assert.equal(evidence.serialized_artifact_fence.nimo_stale_signed_chain2050_transaction_count,3);
assert.equal(evidence.serialized_artifact_fence.nimo_requires_operator_followup_count,0);
assert.equal(
  evidence.serialized_artifact_fence
    .every_discovered_serialized_chain2050_transaction_stale_under_exact_nonce_continuity,
  true,
);

const opsSeedSigner=norm(
  opsSeed.match(/^required_signer_address:\s*(0x[0-9a-fA-F]{40})$/m)?.[1],
);
assert.equal(opsSeedSigner,"0x4e77786f32d41e40e7cef28389068d6f31f1d6a2");
assert.equal(successorAddresses.includes(opsSeedSigner),false);
assert.equal(
  norm(evidence.reviewed_unproven_hash_lineage_separation.legacy_ops_treasury_seed_signer),
  opsSeedSigner,
);
assert.equal(
  evidence.reviewed_unproven_hash_lineage_separation
    .legacy_ops_treasury_seed_signer_is_successor_privileged,
  false,
);

const defaultAnvil="0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266";
const fromHash=wcReceipt.redacted_party_hashes.from_address_sha256;
assert.equal(sha256(defaultAnvil),fromHash);
assert.equal(fromHash,evidence.reviewed_unproven_hash_lineage_separation.wc_to_void_from_address_sha256);
assert.equal(
  norm(evidence.reviewed_unproven_hash_lineage_separation
    .wc_to_void_from_address_recovered_from_public_hash),
  defaultAnvil,
);
assert.equal(successorAddresses.includes(defaultAnvil),false);
assert.equal(
  nonceByAddress.get(defaultAnvil),
  evidence.reviewed_unproven_hash_lineage_separation.wc_to_void_from_address_frozen_final_nonce,
);
assert.equal(
  evidence.reviewed_unproven_hash_lineage_separation
    .wc_to_void_from_address_is_successor_privileged,
  false,
);

assert.equal(
  candidate.replay_and_epoch_safety.privileged_signer_replay_fence_evidence,
  evidencePath,
);
assert.equal(
  candidate.replay_and_epoch_safety.privileged_signer_nonce_or_key_replay_fence_proven,
  true,
);
assert.equal(
  candidate.replay_and_epoch_safety.pending_legacy_signed_transaction_census_complete,
  true,
);
assert.equal(candidate.replay_and_epoch_safety.cross_epoch_replay_protection_proven,true);

assert.equal(evidence.decision.privileged_signer_nonce_or_key_replay_fence_proven,true);
assert.equal(evidence.decision.pending_legacy_signed_transaction_census_complete,true);
assert.equal(evidence.decision.cross_epoch_replay_protection_proven,false);
assert.equal(evidence.decision.migration_authorized,false);
assert.equal(evidence.decision.public_activation_authorized,false);
assert.equal(evidence.decision.funds_movement_authorized,false);

for(const key of [
  "rpc_call","wallet_access","private_key_access","credential_decryption",
  "transaction_construction","transaction_signing","transaction_submission",
  "transaction_broadcast","authoritative_chain2050_write","token_movement",
  "funds_movement"
]){
  assert.equal(evidence.authority[key],false,key);
}

console.log("VOID_ECONOMIC_EPOCH2_PRIVILEGED_SIGNER_REPLAY_FENCE_V1_PROOF_GREEN");
console.log("successor_privileged_address_count=2");
console.log("successor_privileged_nonzero_nonce_count=0");
console.log("legacy_privileged_authority_overlap_count=0");
console.log("pending_legacy_signed_transaction_census_complete=true");
console.log("all_discovered_serialized_chain2050_transactions_stale=true");
console.log("privileged_signer_nonce_or_key_replay_fence_proven=true");
console.log("cross_epoch_replay_protection_proven=false");
console.log("migration_authorized=false");
console.log("public_activation_authorized=false");
