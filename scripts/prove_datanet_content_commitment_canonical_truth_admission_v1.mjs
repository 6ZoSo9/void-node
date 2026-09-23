import assert from "node:assert/strict";
import crypto from "node:crypto";
import {
  admitDatanetContentCommitmentCanonicalTruthV1,
  VOID_DATANET_CHAIN_COMMITMENT_V1,
  VOID_DATANET_CONTENT_COMMITMENT_CANONICAL_TRUTH_AUTHORITY_V1,
} from "../tools/datanet-content-commitment-canonical-truth-admission-v1.mjs";
import {
  canonicalJson,
  sha256,
} from "../tools/datanet-content-commitment-compiler-profile-v1.mjs";

const objectId="datanet-object-canonical-truth-v1";
const objectDigest=crypto.createHash("sha256").update(Buffer.from(objectId,"utf8")).digest("hex");
const txHash="0x"+"1".repeat(64);
const blockHash="0x"+"2".repeat(64);
const checkpointHash="0x"+"3".repeat(64);

function eventMembership(){
  const material={
    marker:"VOID_DATANET_CONTENT_COMMITMENT_FINALIZED_EVENT_MEMBERSHIP_V1",
    version:1,
    status:"finalized_content_committed_event_membership_verified_canonical_truth_pending",
    chain_id:"2050",
    finalized_receipt_admission_id:"voiddccfra1_"+"4".repeat(64),
    finality_verification_id:"voiddccrfv1_"+"5".repeat(64),
    checkpoint_attestation_id:"voiddccfca1_"+"6".repeat(64),
    signed_transaction_hash:txHash,
    registry_address:"0x1111111111111111111111111111111111111111",
    publisher_address:"0x2222222222222222222222222222222222222222",
    object_id:objectId,
    commitment:{
      object_id_sha256:objectDigest,
      content_sha256:"7".repeat(64),
      byte_length:"4096",
      function_signature:"commit(bytes32,bytes32,uint64)",
      calldata_sha256:"8".repeat(64),
    },
    finalized_receipt:{
      block_number:"100",
      block_hash:blockHash,
      accepted_checkpoint_height:"111",
      accepted_checkpoint_hash:checkpointHash,
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
    next_gate:"datanet_content_commitment_canonical_commitment_truth_admission_v1",
  };
  return {
    ok:true,
    ...material,
    finalized_event_membership_id:"voiddccfem1_"+sha256(canonicalJson(material)),
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
function admit(v=eventMembership()){
  return admitDatanetContentCommitmentCanonicalTruthV1({finalized_event_membership:v});
}
function recomputeEventId(v){
  const keys=[
    "marker","version","status","chain_id","finalized_receipt_admission_id",
    "finality_verification_id","checkpoint_attestation_id","signed_transaction_hash",
    "registry_address","publisher_address","object_id","commitment",
    "finalized_receipt","event_receipt","verification","authority","next_gate",
  ];
  const material={};for(const k of keys)material[k]=v[k];
  v.finalized_event_membership_id="voiddccfem1_"+sha256(canonicalJson(material));
}

const green=admit();
assert.equal(green.ok,true);
assert.equal(green.status,"canonical_chain2050_content_commitment_truth_admitted_reconstruction_authority_pending");
assert.match(green.canonical_commitment_truth_admission_id,/^voiddcccta1_[0-9a-f]{64}$/);
assert.equal(green.event_receipt_membership_verified,true);
assert.equal(green.canonical_commitment_truth_admitted,true);
assert.equal(green.protocol_consensus_finality_claimed,false);
assert.equal(green.reconstruction_authority_granted,false);
assert.equal(green.next_gate,"datanet_chain_peer_reconstruction_canonical_commitment_integration_v1");

const ref=green.commitment_reference;
assert.equal(ref.marker,VOID_DATANET_CHAIN_COMMITMENT_V1);
assert.equal(ref.version,1);
assert.deepEqual(
  Object.keys(ref).sort(),
  [
    "accepted_checkpoint_id","byte_length","chain_id","checkpoint_block_hash",
    "checkpoint_height","commitment_id","commitment_log_index",
    "commitment_transaction_hash","content_sha256","marker","object_id","version",
  ].sort(),
);
assert.equal(ref.chain_id,"2050");
assert.equal(ref.object_id,objectId);
assert.equal(ref.content_sha256,"7".repeat(64));
assert.equal(ref.byte_length,"4096");
assert.equal(ref.checkpoint_height,"111");
assert.equal(ref.checkpoint_block_hash,checkpointHash);
assert.equal(ref.accepted_checkpoint_id,"mainnet0-checkpoint-finality-v1");
assert.equal(ref.commitment_transaction_hash,txHash);
assert.equal(ref.commitment_log_index,"7");
assert.match(ref.commitment_id,/^voiddncommit1_[0-9a-f]{64}$/);

const tamperedId=eventMembership();
tamperedId.finalized_event_membership_id="voiddccfem1_"+"f".repeat(64);
let out=admit(tamperedId);
assert.equal(out.ok,false);
assert.equal(out.reason,"datanet_canonical_truth_event_membership_id_mismatch");

const badObject=eventMembership();
badObject.object_id="different-object-v1";
recomputeEventId(badObject);
out=admit(badObject);
assert.equal(out.ok,false);
assert.equal(out.reason,"datanet_canonical_truth_object_id_digest_mismatch");

const oldCheckpoint=eventMembership();
oldCheckpoint.finalized_receipt.accepted_checkpoint_height="99";
recomputeEventId(oldCheckpoint);
out=admit(oldCheckpoint);
assert.equal(out.ok,false);
assert.equal(out.reason,"datanet_canonical_truth_checkpoint_precedes_receipt");

const wrongPolicy=eventMembership();
wrongPolicy.finalized_receipt.finality_policy_id="other-policy-v1";
recomputeEventId(wrongPolicy);
out=admit(wrongPolicy);
assert.equal(out.ok,false);
assert.equal(out.reason,"datanet_canonical_truth_event_membership_invalid");

const eventFalse=eventMembership();
eventFalse.event_receipt_membership_verified=false;
out=admit(eventFalse);
assert.equal(out.ok,false);
assert.equal(out.reason,"datanet_canonical_truth_event_membership_invalid");

assert.equal(VOID_DATANET_CONTENT_COMMITMENT_CANONICAL_TRUTH_AUTHORITY_V1.canonical_commitment_truth_admitted,true);
assert.equal(VOID_DATANET_CONTENT_COMMITMENT_CANONICAL_TRUTH_AUTHORITY_V1.reconstruction_authority_granted,false);
assert.equal(VOID_DATANET_CONTENT_COMMITMENT_CANONICAL_TRUTH_AUTHORITY_V1.independent_custody_verified,false);
assert.equal(VOID_DATANET_CONTENT_COMMITMENT_CANONICAL_TRUTH_AUTHORITY_V1.replication_policy_verified,false);

console.log("VOID_DATANET_CONTENT_COMMITMENT_CANONICAL_TRUTH_ADMISSION_V1_PROOF_GREEN");
console.log("finalized_event_membership_id_rederived=true");
console.log("accepted_checkpoint_policy_bound=true");
console.log("object_id_preimage_verified=true");
console.log("canonical_commitment_reference_emitted=true");
console.log("canonical_commitment_truth_admitted=true");
console.log("event_receipt_membership_verified=true");
console.log("protocol_consensus_finality_claimed=false");
console.log("reconstruction_authority_granted=false");
console.log("independent_custody_verified=false");
console.log("replication_policy_verified=false");
console.log("selected_bytes_custody_bound=false");
console.log("rpc_call=false");
console.log("transaction_submission=false");
console.log("chain2050_write=false");
