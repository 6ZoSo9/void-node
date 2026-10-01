#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";

import {
  canonicalJson,
  sha256,
} from "../tools/datanet-content-commitment-compiler-profile-v1.mjs";
import {
  ECONOMIC_EPOCH2_STATE_ROOT_OBJECT_ID_SHA256_V1,
  ECONOMIC_EPOCH2_STATE_ROOT_PAYLOAD_BYTES_V1,
  ECONOMIC_EPOCH2_STATE_ROOT_PAYLOAD_SHA256_V1,
} from "../tools/void-economic-epoch2-public-void-state-root-anchor-v1.mjs";
import {
  VOID_ECONOMIC_EPOCH2_PUBLIC_STATE_ROOT_ANCHOR_IMPORT_CONFIRMATION_V1,
  VOID_ECONOMIC_EPOCH2_PUBLIC_STATE_ROOT_ANCHOR_IMPORT_CANONICAL_GIT_BLOBS_V1,
  VOID_ECONOMIC_EPOCH2_PUBLIC_STATE_ROOT_ANCHOR_IMPORT_PROMOTION_AUTHORITY_V1,
  VOID_ECONOMIC_EPOCH2_PUBLIC_STATE_ROOT_ANCHOR_IMPORT_PROMOTION_V1,
  promoteVoidEconomicEpoch2PublicStateRootAnchorImportV1,
} from "../tools/void-economic-epoch2-public-state-root-anchor-import-promotion-v1.mjs";
import {
  classifyVoidEconomicEvmSuccessorMigrationV1,
} from "../tools/void-economic-evm-successor-migration-v1.mjs";

const payload=fs.readFileSync(
  "public/public-node/evidence/economic-epoch2-public-void-state-root-anchor-v1.json",
);
const payloadJson=JSON.parse(payload.toString("utf8"));
const migration=JSON.parse(
  fs.readFileSync(
    "ops/mainnet0/economic-evm-successor-migration-candidate-v1.json",
    "utf8",
  ),
);

const registry="0x1111111111111111111111111111111111111111";
const publisher="0x2222222222222222222222222222222222222222";

function membership(overrides={}) {
  const material={
    marker:"VOID_DATANET_CONTENT_COMMITMENT_FINALIZED_EVENT_MEMBERSHIP_V1",
    version:1,
    status:
      "finalized_content_committed_event_membership_verified_canonical_truth_pending",
    chain_id:"2050",
    finalized_receipt_admission_id:
      "voiddccfra1_"+"4".repeat(64),
    finality_verification_id:
      "voiddccrfv1_"+"5".repeat(64),
    checkpoint_attestation_id:
      "voiddccfca1_"+"6".repeat(64),
    signed_transaction_hash:"0x"+"1".repeat(64),
    registry_address:registry,
    publisher_address:publisher,
    object_id:payloadJson.object_id,
    commitment:{
      object_id_sha256:
        ECONOMIC_EPOCH2_STATE_ROOT_OBJECT_ID_SHA256_V1,
      content_sha256:
        ECONOMIC_EPOCH2_STATE_ROOT_PAYLOAD_SHA256_V1,
      byte_length:
        String(ECONOMIC_EPOCH2_STATE_ROOT_PAYLOAD_BYTES_V1),
      function_signature:"commit(bytes32,bytes32,uint64)",
      calldata_sha256:"8".repeat(64),
    },
    finalized_receipt:{
      block_number:"100",
      block_hash:"0x"+"2".repeat(64),
      accepted_checkpoint_height:"111",
      accepted_checkpoint_hash:"0x"+"3".repeat(64),
      finality_policy_id:"mainnet0-checkpoint-finality-v1",
      finality_kind:"operator_recognized_accepted_checkpoint",
      protocol_consensus_finality_claimed:false,
    },
    event_receipt:{
      log_index:"7",
      receipt_fingerprint_sha256:"9".repeat(64),
      receipt_revalidation_verified:true,
      canonical_block_hash_verified:true,
      event_receipt_membership_verified:true,
    },
    verification:{
      finalized_receipt_admission_id_rederived:true,
      commitment_receipt_verifier_invoked:true,
      exact_transaction_hash_bound:true,
      exact_registry_bound:true,
      exact_finalized_block_number_bound:true,
      exact_finalized_block_hash_bound:true,
      exact_object_digest_bound:true,
      exact_content_digest_bound:true,
      exact_byte_length_bound:true,
      event_receipt_membership_verified:true,
      canonical_commitment_truth_admitted:false,
    },
    authority:{
      source_only_membership_binding:true,
      transaction_submission_authorized:false,
      automatic_retry_authorized:false,
      filesystem_mutation_performed:false,
      sovereign_private_key_access_performed:false,
      wallet_access_performed:false,
      transaction_signing_performed:false,
      direct_rpc_call_performed:false,
      direct_network_call_performed:false,
      chain2050_write_direct_performed:false,
      validator_mutation_authorized:false,
      governance_mutation_authorized:false,
      work_credit_mutation_authorized:false,
      funds_action_authorized:false,
    },
    next_gate:
      "datanet_content_commitment_canonical_commitment_truth_admission_v1",
  };
  Object.assign(material,overrides);
  const eventId="voiddccfem1_"+sha256(canonicalJson(material));
  return {
    ok:true,
    ...material,
    finalized_event_membership_id:eventId,
    event_receipt_membership_verified:true,
    canonical_commitment_truth_admitted:false,
    protocol_consensus_finality_claimed:false,
    filesystem_mutation_performed:false,
    sovereign_private_key_access_performed:false,
    wallet_access_performed:false,
    transaction_signing_performed:false,
    transaction_submission_performed:false,
    direct_rpc_call_performed:false,
    direct_network_call_performed:false,
    chain2050_write_direct_performed:false,
    authority_contract:{
      source_only_membership_binding:true,
      finalized_admission_required:true,
      admission_id_rederived:true,
      commitment_receipt_verifier_invoked:true,
      exact_transaction_binding_required:true,
      exact_registry_binding_required:true,
      exact_finalized_block_binding_required:true,
      exact_object_digest_binding_required:true,
      exact_content_digest_binding_required:true,
      exact_byte_length_binding_required:true,
      event_receipt_membership_verified:true,
      canonical_commitment_truth_admitted:false,
      protocol_consensus_finality_claimed:false,
      filesystem_read:false,
      filesystem_mutation:false,
      sovereign_private_key_access:false,
      wallet_access:false,
      transaction_signing:false,
      transaction_submission:false,
      direct_rpc_transport:false,
      direct_network_transport:false,
      chain2050_write_direct:false,
      validator_mutation:false,
      governance_mutation:false,
      work_credit_mutation:false,
      funds_action:false,
      automatic_retry:false,
    },
  };
}

function bytes(value) {
  return Buffer.from(JSON.stringify(value,null,2)+"\n","utf8");
}

function digest(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

async function promote({
  membershipValue=membership(),
  confirmation=
    VOID_ECONOMIC_EPOCH2_PUBLIC_STATE_ROOT_ANCHOR_IMPORT_CONFIRMATION_V1,
  expectedSha=null,
  registryAddress=registry,
  publisherAddress=publisher,
  extraInput={},
}={}) {
  const membershipBytes=bytes(membershipValue);
  return promoteVoidEconomicEpoch2PublicStateRootAnchorImportV1({
    membershipBytes,
    expectedMembershipSha256:expectedSha??digest(membershipBytes),
    expectedRegistryAddress:registryAddress,
    expectedPublisherAddress:publisherAddress,
    reviewConfirmation:confirmation,
    ...extraInput,
  });
}

const result=await promote();
assert.equal(
  result.promotion.marker,
  VOID_ECONOMIC_EPOCH2_PUBLIC_STATE_ROOT_ANCHOR_IMPORT_PROMOTION_V1,
);
assert.equal(result.promotion.version,1);
assert.equal(
  result.promotion.status,
  "STATE_ROOT_PUBLIC_VOID_ANCHOR_PROMOTED_PUBLIC_READ_GATE_PENDING",
);
assert.match(result.promotion.promotion_id,/^voide2sraip1_[0-9a-f]{64}$/u);
assert.equal(
  result.promotion.verification.reviewed_membership_file_sha256_verified,
  true,
);
assert.equal(
  result.promotion.verification.explicit_review_confirmation_verified,
  true,
);
assert.equal(
  result.promotion.verification.canonical_git_blob_set_verified,
  true,
);
assert.equal(
  result.promotion.verification.verified_before_authority_module_load,
  true,
);
assert.equal(
  result.promotion.verification.caller_supplied_canonical_inputs_rejected,
  true,
);
assert.equal(
  result.promotion.verification.classifier_admission_execution_source_bound,
  true,
);
assert.equal(
  result.promotion.canonical_source.binding,
  "exact_reviewed_git_blob_set_v1",
);
assert.equal(result.promotion.canonical_source.exact_git_blob_sha1_verified,true);
assert.equal(
  result.promotion.canonical_source.verified_before_authority_module_load,
  true,
);
assert.equal(result.promotion.canonical_source.caller_supplied_anchor_payload,false);
assert.equal(
  result.promotion.canonical_source.caller_supplied_migration_candidate,
  false,
);
assert.equal(
  result.promotion.canonical_source.classifier_admission_execution_source_bound,
  true,
);
for(const [name,binding] of Object.entries(
  VOID_ECONOMIC_EPOCH2_PUBLIC_STATE_ROOT_ANCHOR_IMPORT_CANONICAL_GIT_BLOBS_V1,
)) {
  assert.equal(result.promotion.canonical_source.files[name].path,binding.path);
  assert.equal(
    result.promotion.canonical_source.files[name].git_blob_sha1,
    binding.git_blob_sha1,
  );
  assert.match(
    result.promotion.canonical_source.files[name].file_sha256,
    /^[0-9a-f]{64}$/u,
  );
}
assert.equal(
  result.promotion.verification.canonical_truth_admission_rederived,
  true,
);
assert.equal(
  result.promotion.verification.real_finalized_membership_import_verified,
  true,
);
assert.equal(
  result.promotion.verification.successor_state_root_public_void_anchor_ready,
  true,
);
assert.equal(
  result.promotion.verification.migration_classifier_status,
  "HOLD",
);
assert.deepEqual(
  result.promotion.verification.remaining_migration_gates,
  ["public_economic_verification_path_required"],
);

assert.equal(
  migration.public_verification.successor_state_root_public_void_anchor_ready,
  false,
);
assert.equal(
  result.updated_migration_candidate.public_verification
    .successor_state_root_public_void_anchor_ready,
  true,
);
assert.equal(
  result.updated_migration_candidate.public_verification
    .public_balance_receipt_code_verification_ready,
  false,
);
const classified=classifyVoidEconomicEvmSuccessorMigrationV1(
  result.updated_migration_candidate,
);
assert.equal(classified.status,"HOLD");
assert.deepEqual(
  classified.missing_gates,
  ["public_economic_verification_path_required"],
);

const repeat=await promote();
assert.equal(repeat.promotion.promotion_id,result.promotion.promotion_id);

await assert.rejects(
  ()=>promote({expectedSha:"0".repeat(64)}),
  /reviewed_membership_sha256_mismatch/,
);
await assert.rejects(
  ()=>promote({confirmation:"wrong"}),
  /review_confirmation_required/,
);
await assert.rejects(
  ()=>promote({
    registryAddress:"0x3333333333333333333333333333333333333333",
  }),
  /state_root_anchor_admission_candidate_invalid/,
);
await assert.rejects(
  ()=>promote({
    publisherAddress:"0x3333333333333333333333333333333333333333",
  }),
  /state_root_anchor_admission_candidate_invalid/,
);

{
  const already=structuredClone(migration);
  already.public_verification.successor_state_root_public_void_anchor_ready=true;
  await assert.rejects(
    ()=>promote({extraInput:{migrationCandidate:already}}),
    /promotion_input_keys_invalid/,
  );
}

{
  const noncanonical=structuredClone(migration);
  noncanonical.public_verification
    .public_balance_receipt_code_verification_ready=true;

  const wouldBePromoted=structuredClone(noncanonical);
  wouldBePromoted.public_verification
    .successor_state_root_public_void_anchor_ready=true;
  const wouldBeClassified=
    classifyVoidEconomicEvmSuccessorMigrationV1(wouldBePromoted);
  assert.equal(wouldBeClassified.status,"SOURCE_READY");

  await assert.rejects(
    ()=>promote({extraInput:{migrationCandidate:noncanonical}}),
    /promotion_input_keys_invalid/,
  );
  await assert.rejects(
    ()=>promote({extraInput:{payloadBytes:payload}}),
    /promotion_input_keys_invalid/,
  );
}

for(const [key,value] of Object.entries(
  VOID_ECONOMIC_EPOCH2_PUBLIC_STATE_ROOT_ANCHOR_IMPORT_PROMOTION_AUTHORITY_V1,
)) {
  const expectedTrue=new Set([
    "source_promotion_only",
    "reviewed_membership_digest_required",
    "explicit_review_confirmation_required",
    "canonical_truth_admission_rederived",
    "reviewed_git_blob_binding_required",
    "canonical_source_filesystem_read",
    "candidate_copy_only",
    "derived_output_write",
  ]);
  assert.equal(expectedTrue.has(key)?value:!value,true,key);
}

const source=fs.readFileSync(
  "tools/void-economic-epoch2-public-state-root-anchor-import-promotion-v1.mjs",
  "utf8",
);
assert.doesNotMatch(source,/eth_sendRawTransaction|eth_sendTransaction/u);
assert.doesNotMatch(source,/new\s+Wallet\s*\(/u);
assert.doesNotMatch(source,/child_process|\bfetch\s*\(/u);
assert.doesNotMatch(source,/git\s+(?:add|commit|push|merge|checkout|reset)/u);
assert.doesNotMatch(
  source,
  /from "\.\/void-economic-epoch2-public-state-root-anchor-admission-v1\.mjs"/u,
);
assert.doesNotMatch(
  source,
  /from "\.\/void-economic-evm-successor-migration-v1\.mjs"/u,
);
assert.match(source,/await import\(/u);
assert.match(source,/reviewed_membership_sha256_mismatch/u);
assert.match(source,/review_confirmation_required/u);
assert.match(source,/canonical_source_git_blob_mismatch/u);
assert.match(source,/promotion_input_keys_invalid/u);
assert.match(source,/public_economic_verification_path_required/u);

console.log(
  "VOID_ECONOMIC_EPOCH2_PUBLIC_STATE_ROOT_ANCHOR_IMPORT_PROMOTION_V1_PROOF_GREEN",
);
console.log("reviewed_membership_digest_required=true");
console.log("explicit_review_confirmation_required=true");
console.log("canonical_git_blob_set_verified=true");
console.log("verified_before_authority_module_load=true");
console.log("caller_supplied_canonical_inputs_rejected=true");
console.log("noncanonical_public_read_gate_source_ready_adversary_rejected=true");
console.log("canonical_truth_admission_rederived=true");
console.log("real_finalized_membership_import_verified=true");
console.log("successor_state_root_public_void_anchor_ready=true");
console.log("canonical_candidate_mutated=false");
console.log("remaining_migration_gate=public_economic_verification_path_required");
console.log("chain2050_write=false");
console.log("transaction_submission=false");
console.log("migration_authorized=false");
console.log("public_activation=false");
console.log("funds_movement=false");
