#!/usr/bin/env node
import assert from "node:assert/strict";
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
  VOID_ECONOMIC_EPOCH2_PUBLIC_STATE_ROOT_ANCHOR_ADMISSION_AUTHORITY_V1,
  VOID_ECONOMIC_EPOCH2_PUBLIC_STATE_ROOT_ANCHOR_ADMISSION_V1,
  verifyEconomicEpoch2PublicStateRootAnchorAdmissionCandidateV1,
} from "../tools/void-economic-epoch2-public-state-root-anchor-admission-v1.mjs";

const payload=fs.readFileSync(
  "public/public-node/evidence/economic-epoch2-public-void-state-root-anchor-v1.json",
);
const payloadJson=JSON.parse(payload.toString("utf8"));
const objectId=payloadJson.object_id;
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
    object_id:objectId,
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
  const eventId=
    "voiddccfem1_"+sha256(canonicalJson(material));
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

function verify(m=membership(),bytes=payload,options={}) {
  return verifyEconomicEpoch2PublicStateRootAnchorAdmissionCandidateV1({
    payload_bytes:bytes,
    finalized_event_membership:m,
    expected_registry_address:
      options.expected_registry_address??registry,
    expected_publisher_address:
      options.expected_publisher_address??publisher,
  });
}

const candidate=verify();
assert.equal(candidate.ok,true);
assert.equal(
  candidate.status,
  "CANONICAL_TRUTH_CANDIDATE_VALID_REAL_IMPORT_REQUIRED",
);
assert.equal(candidate.chain_id,"2050");
assert.equal(candidate.execution_epoch,"2");
assert.equal(candidate.object_id,objectId);
assert.equal(
  candidate.object_id_sha256,
  ECONOMIC_EPOCH2_STATE_ROOT_OBJECT_ID_SHA256_V1,
);
assert.equal(
  candidate.content_sha256,
  ECONOMIC_EPOCH2_STATE_ROOT_PAYLOAD_SHA256_V1,
);
assert.equal(
  candidate.byte_length,
  String(ECONOMIC_EPOCH2_STATE_ROOT_PAYLOAD_BYTES_V1),
);
assert.equal(candidate.registry_address,registry);
assert.equal(candidate.publisher_address,publisher);
assert.match(
  candidate.finalized_event_membership_id,
  /^voiddccfem1_[0-9a-f]{64}$/,
);
assert.match(
  candidate.canonical_commitment_truth_admission_id,
  /^voiddcccta1_[0-9a-f]{64}$/,
);
assert.match(
  candidate.commitment_id,
  /^voiddncommit1_[0-9a-f]{64}$/,
);
assert.match(
  candidate.admission_candidate_id,
  /^voide2sraca1_[0-9a-f]{64}$/,
);
assert.equal(
  candidate.successor_state_root_public_void_anchor_candidate_ready,
  true,
);
assert.equal(candidate.anchor_payload_exact_bytes_verified,true);
assert.equal(candidate.canonical_truth_admission_input_verified,true);
assert.equal(candidate.canonical_commitment_reference_matches_anchor,true);
assert.equal(candidate.exact_registry_address_bound,true);
assert.equal(candidate.exact_publisher_address_bound,true);
assert.equal(candidate.real_finalized_membership_import_verified,false);
assert.equal(candidate.successor_state_root_public_void_anchor_ready,false);
assert.equal(candidate.public_balance_receipt_code_verification_ready,false);
assert.equal(candidate.migration_authorized,false);
assert.equal(candidate.public_activation_authorized,false);
assert.equal(candidate.chain2050_write_performed,false);
assert.equal(candidate.transaction_signing_performed,false);
assert.equal(candidate.transaction_submission_performed,false);

const repeat=verify(structuredClone(membership()));
assert.equal(repeat.admission_candidate_id,candidate.admission_candidate_id);

{
  const bad=Buffer.from(payload);
  bad[bad.length-2]^=1;
  const held=verify(membership(),bad);
  assert.equal(held.ok,false);
  assert.equal(held.reason,"state_root_anchor_payload_not_verified");
}

{
  const held=verify(
    membership(),
    payload,
    {expected_registry_address:"0x3333333333333333333333333333333333333333"},
  );
  assert.equal(held.ok,false);
  assert.equal(held.reason,"state_root_anchor_registry_address_mismatch");
}

{
  const held=verify(
    membership(),
    payload,
    {expected_publisher_address:"0x3333333333333333333333333333333333333333"},
  );
  assert.equal(held.ok,false);
  assert.equal(held.reason,"state_root_anchor_publisher_address_mismatch");
}

{
  const bad=membership();
  bad.commitment.content_sha256="7".repeat(64);
  const materialKeys=[
    "marker","version","status","chain_id",
    "finalized_receipt_admission_id","finality_verification_id",
    "checkpoint_attestation_id","signed_transaction_hash",
    "registry_address","publisher_address","object_id",
    "commitment","finalized_receipt","event_receipt",
    "verification","authority","next_gate",
  ];
  const material={};
  for(const key of materialKeys)material[key]=bad[key];
  bad.finalized_event_membership_id=
    "voiddccfem1_"+sha256(canonicalJson(material));
  const held=verify(bad);
  assert.equal(held.ok,false);
  assert.equal(held.reason,"state_root_anchor_commitment_reference_mismatch");
}

for(const [key,value] of Object.entries(
  VOID_ECONOMIC_EPOCH2_PUBLIC_STATE_ROOT_ANCHOR_ADMISSION_AUTHORITY_V1,
)) {
  const expectedTrue=new Set([
    "source_only_composition",
    "anchor_payload_verification",
    "canonical_truth_admission_rederived",
  ]);
  assert.equal(expectedTrue.has(key)?value:!value,true,key);
}

const source=fs.readFileSync(
  "tools/void-economic-epoch2-public-state-root-anchor-admission-v1.mjs",
  "utf8",
);
assert.doesNotMatch(source,/eth_sendRawTransaction|eth_sendTransaction/);
assert.doesNotMatch(source,/new\s+Wallet\s*\(/);
assert.doesNotMatch(source,/writeFileSync|appendFileSync|renameSync/);
assert.match(source,/successor_state_root_public_void_anchor_ready:false/);
assert.match(source,/real_finalized_membership_import_verified:false/);

console.log(
  "VOID_ECONOMIC_EPOCH2_PUBLIC_STATE_ROOT_ANCHOR_ADMISSION_V1_PROOF_GREEN",
);
console.log("exact_anchor_payload_bound=true");
console.log("canonical_truth_admission_rederived=true");
console.log("exact_registry_address_bound=true");
console.log("exact_publisher_address_bound=true");
console.log("state_root_anchor_candidate_ready=true");
console.log("real_finalized_membership_import_verified=false");
console.log("successor_state_root_public_void_anchor_ready=false");
console.log("public_balance_receipt_code_verification_ready=false");
console.log("chain2050_write=false");
console.log("migration_authorized=false");
console.log("public_activation=false");
