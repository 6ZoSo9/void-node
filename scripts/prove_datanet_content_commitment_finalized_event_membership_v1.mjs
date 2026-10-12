import assert from "node:assert/strict";
import crypto from "node:crypto";
import { Interface } from "ethers";
import {
  bindDatanetContentCommitmentFinalizedEventMembershipV1,
  VOID_DATANET_CONTENT_COMMITMENT_FINALIZED_EVENT_MEMBERSHIP_AUTHORITY_V1,
} from "../tools/datanet-content-commitment-finalized-event-membership-v1.mjs";
import {
  canonicalJson,
  sha256,
} from "../tools/datanet-content-commitment-compiler-profile-v1.mjs";

const registry="0x1111111111111111111111111111111111111111";
const publisher="0x2222222222222222222222222222222222222222";
const txHash="0x"+"5".repeat(64);
const blockHash="0x"+"6".repeat(64);
const parentHash="0x"+"7".repeat(64);
const objectId="void-object:finalized-event-membership-v1";
const contentSha256="8".repeat(64);
const byteLength="4096";
const blockNumber="100";
const logIndex="7";

const eventInterface=new Interface([
  "event ContentCommitted(bytes32 indexed objectIdSha256, bytes32 indexed contentSha256, uint64 byteLength, uint256 committedAtBlock)",
]);
const event=eventInterface.getEvent("ContentCommitted");
if(!event)throw new Error("ContentCommitted event unavailable");

function objectDigest(value=objectId){
  return crypto.createHash("sha256").update(Buffer.from(value,"utf8")).digest("hex");
}
function encodedEvent(options={}){
  return eventInterface.encodeEventLog(event,[
    options.objectIdSha256??("0x"+objectDigest()),
    options.contentSha256??("0x"+contentSha256),
    options.byteLength??BigInt(byteLength),
    options.committedAtBlock??BigInt(blockNumber),
  ]);
}
function log(options={}){
  const encoded=encodedEvent(options);
  return {
    address:options.address??registry,
    topics:encoded.topics,
    data:encoded.data,
    transactionHash:options.transactionHash??txHash,
    blockNumber:options.blockNumber??"0x64",
    blockHash:options.blockHash??blockHash,
    logIndex:options.logIndex??"0x7",
    removed:options.removed??false,
  };
}
function receipt(options={}){
  return {
    transactionHash:options.transactionHash??txHash,
    status:options.status??"0x1",
    blockNumber:options.blockNumber??"0x64",
    blockHash:options.blockHash??blockHash,
    logs:options.logs??[log(options.logOptions??{})],
  };
}
function canonicalBlock(options={}){
  return {
    number:options.number??"0x64",
    hash:options.hash??blockHash,
    parentHash:options.parentHash??parentHash,
  };
}
function receiptInput(){
  return {
    chain_id:"2050",
    registry_address:registry,
    object_id:objectId,
    content_sha256:contentSha256,
    byte_length:byteLength,
    transaction_hash:txHash,
    log_index:logIndex,
    receipt_before:receipt(),
    receipt_after:receipt(),
    canonical_block_before:canonicalBlock(),
    canonical_block_after:canonicalBlock(),
  };
}
function admission(){
  const material={
    marker:"VOID_DATANET_CONTENT_COMMITMENT_FINALIZED_RECEIPT_ADMISSION_V1",
    version:1,
    status:"finalized_confirmed_commit_call_admitted_event_membership_pending",
    chain_id:"2050",
    finality_verification_id:"voiddccrfv1_"+"1".repeat(64),
    receipt_verification_fingerprint_sha256:"2".repeat(64),
    checkpoint_attestation_id:"voiddccfca1_"+"3".repeat(64),
    signing_request_id:"voiddccpsreq1_"+"4".repeat(64),
    signed_transaction_hash:txHash,
    unsigned_transaction_candidate_fingerprint_sha256:"9".repeat(64),
    registry_address:registry,
    publisher_address:publisher,
    commitment:{
      object_id_sha256:objectDigest(),
      content_sha256:contentSha256,
      byte_length:byteLength,
      function_signature:"commit(bytes32,bytes32,uint64)",
      calldata_sha256:"a".repeat(64),
    },
    finalized_receipt:{
      transaction_status:"1",
      block_number:blockNumber,
      block_hash:blockHash,
      observed_confirmation_count:"12",
      accepted_checkpoint_height:"111",
      accepted_checkpoint_hash:"0x"+"b".repeat(64),
      finality_policy_id:"mainnet0-checkpoint-finality-v1",
      finality_kind:"operator_recognized_accepted_checkpoint",
      protocol_consensus_finality_claimed:false,
    },
    verification:{
      finality_verification_id_rederived:true,
      signing_request_id_rederived:true,
      unsigned_transaction_candidate_fingerprint_rederived:true,
      exact_publisher_bound:true,
      exact_registry_bound:true,
      exact_commit_calldata_decoded:true,
      commit_calldata_roundtrip_verified:true,
      finalized_confirmed_transaction_verified:true,
      operator_recognized_checkpoint_finality_verified:true,
      content_committed_event_membership_verified:false,
      canonical_commitment_truth_admitted:false,
    },
    authority:{
      admission_artifact_only:true,
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
    next_gate:"datanet_content_commitment_finalized_event_membership_v1",
  };
  return {
    ok:true,
    ...material,
    finalized_receipt_admission_id:"voiddccfra1_"+sha256(canonicalJson(material)),
    admission_constructed:true,
    event_receipt_membership_verified:false,
    canonical_commitment_truth_admitted:false,
    filesystem_mutation_performed:false,
    sovereign_private_key_access_performed:false,
    wallet_access_performed:false,
    transaction_signing_performed:false,
    transaction_submission_performed:false,
    direct_rpc_call_performed:false,
    direct_network_call_performed:false,
    chain2050_write_direct_performed:false,
    authority_contract:{
      source_only_admission:true,
      exact_finality_verification_required:true,
      exact_signing_request_rederivation_required:true,
      exact_unsigned_candidate_fingerprint_rederived:true,
      exact_commit_calldata_decoded:true,
      finalized_confirmed_transaction_required:true,
      operator_recognized_checkpoint_finality_required:true,
      protocol_consensus_finality_claimed:false,
      event_receipt_membership_verified:false,
      canonical_commitment_truth_admitted:false,
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
function bind(a=admission(),r=receiptInput()){
  return bindDatanetContentCommitmentFinalizedEventMembershipV1({
    finalized_admission:a,
    commitment_receipt_input:r,
  });
}
function expectHeld(reason,mutateAdmission,mutateReceipt){
  const a=structuredClone(admission());
  const r=structuredClone(receiptInput());
  mutateAdmission?.(a);
  mutateReceipt?.(r);
  const out=bind(a,r);
  assert.equal(out.ok,false,reason);
  assert.equal(out.reason,reason);
}

const green=bind();
assert.equal(green.ok,true);
assert.equal(green.status,"finalized_content_committed_event_membership_verified_canonical_truth_pending");
assert.match(green.finalized_event_membership_id,/^voiddccfem1_[0-9a-f]{64}$/);
assert.equal(green.chain_id,"2050");
assert.equal(green.signed_transaction_hash,txHash);
assert.equal(green.registry_address,registry);
assert.equal(green.object_id,objectId);
assert.equal(green.commitment.object_id_sha256,objectDigest());
assert.equal(green.commitment.content_sha256,contentSha256);
assert.equal(green.commitment.byte_length,byteLength);
assert.equal(green.finalized_receipt.block_number,blockNumber);
assert.equal(green.finalized_receipt.block_hash,blockHash);
assert.equal(green.event_receipt.log_index,logIndex);
assert.equal(green.event_receipt.event_receipt_membership_verified,true);
assert.equal(green.event_receipt.receipt_revalidation_verified,true);
assert.equal(green.event_receipt.canonical_block_hash_verified,true);
assert.equal(green.event_receipt_membership_verified,true);
assert.equal(green.canonical_commitment_truth_admitted,false);
assert.equal(green.protocol_consensus_finality_claimed,false);
assert.equal(green.next_gate,"datanet_content_commitment_canonical_commitment_truth_admission_v1");
assert.equal(green.filesystem_mutation_performed,false);
assert.equal(green.wallet_access_performed,false);
assert.equal(green.transaction_signing_performed,false);
assert.equal(green.transaction_submission_performed,false);
assert.equal(green.direct_rpc_call_performed,false);
assert.equal(green.direct_network_call_performed,false);
assert.equal(green.chain2050_write_direct_performed,false);

assert.equal(
  VOID_DATANET_CONTENT_COMMITMENT_FINALIZED_EVENT_MEMBERSHIP_AUTHORITY_V1.event_receipt_membership_verified,
  true,
);
assert.equal(
  VOID_DATANET_CONTENT_COMMITMENT_FINALIZED_EVENT_MEMBERSHIP_AUTHORITY_V1.canonical_commitment_truth_admitted,
  false,
);

expectHeld(
  "datanet_finalized_event_membership_admission_id_mismatch",
  (a)=>{a.finalized_receipt_admission_id="voiddccfra1_"+"f".repeat(64);},
);
expectHeld(
  "datanet_finalized_event_membership_binding_mismatch",
  (a)=>{
    a.signed_transaction_hash="0x"+"c".repeat(64);
    const keys=[
      "marker","version","status","chain_id","finality_verification_id",
      "receipt_verification_fingerprint_sha256","checkpoint_attestation_id",
      "signing_request_id","signed_transaction_hash",
      "unsigned_transaction_candidate_fingerprint_sha256",
      "registry_address","publisher_address","commitment","finalized_receipt",
      "verification","authority","next_gate",
    ];
    const m={}; for(const k of keys)m[k]=a[k];
    a.finalized_receipt_admission_id="voiddccfra1_"+sha256(canonicalJson(m));
  },
);
expectHeld(
  "datanet_finalized_event_membership_binding_mismatch",
  undefined,
  (r)=>{
    const otherRegistry="0x3333333333333333333333333333333333333333";
    r.registry_address=otherRegistry;
    for(const k of ["receipt_before","receipt_after"]){
      r[k].logs[0].address=otherRegistry;
    }
  },
);
expectHeld(
  "datanet_finalized_event_membership_binding_mismatch",
  undefined,
  (r)=>{
    const otherObjectId="void-object:other";
    const wrong=encodedEvent({objectIdSha256:"0x"+objectDigest(otherObjectId)});
    for(const k of ["receipt_before","receipt_after"]){
      r[k].logs[0].topics=wrong.topics;
      r[k].logs[0].data=wrong.data;
    }
    r.object_id=otherObjectId;
  },
);
expectHeld(
  "datanet_finalized_event_membership_binding_mismatch",
  undefined,
  (r)=>{
    const wrong="e".repeat(64);
    r.content_sha256=wrong;
    const encoded=encodedEvent({contentSha256:"0x"+wrong});
    for(const k of ["receipt_before","receipt_after"]){
      r[k].logs[0].topics=encoded.topics;
      r[k].logs[0].data=encoded.data;
    }
  },
);
expectHeld(
  "datanet_finalized_event_membership_binding_mismatch",
  undefined,
  (r)=>{
    r.byte_length="8192";
    const encoded=encodedEvent({byteLength:8192n});
    for(const k of ["receipt_before","receipt_after"]){
      r[k].logs[0].topics=encoded.topics;
      r[k].logs[0].data=encoded.data;
    }
  },
);
expectHeld(
  "datanet_finalized_event_membership_binding_mismatch",
  (a)=>{
    a.finalized_receipt.block_hash="0x"+"f".repeat(64);
    const keys=[
      "marker","version","status","chain_id","finality_verification_id",
      "receipt_verification_fingerprint_sha256","checkpoint_attestation_id",
      "signing_request_id","signed_transaction_hash",
      "unsigned_transaction_candidate_fingerprint_sha256",
      "registry_address","publisher_address","commitment","finalized_receipt",
      "verification","authority","next_gate",
    ];
    const m={}; for(const k of keys)m[k]=a[k];
    a.finalized_receipt_admission_id="voiddccfra1_"+sha256(canonicalJson(m));
  },
);
expectHeld(
  "datanet_finalized_event_membership_receipt_verification_failed",
  undefined,
  (r)=>{r.receipt_after.logs[0].removed=true;},
);

console.log("VOID_DATANET_CONTENT_COMMITMENT_FINALIZED_EVENT_MEMBERSHIP_V1_PROOF_GREEN");
console.log("finalized_receipt_admission_id_rederived=true");
console.log("commitment_receipt_verifier_invoked=true");
console.log("exact_transaction_hash_bound=true");
console.log("exact_registry_bound=true");
console.log("exact_finalized_block_bound=true");
console.log("exact_object_digest_bound=true");
console.log("exact_content_digest_bound=true");
console.log("exact_byte_length_bound=true");
console.log("event_receipt_membership_verified=true");
console.log("canonical_commitment_truth_admitted=false");
console.log("protocol_consensus_finality_claimed=false");
console.log("rpc_call=false");
console.log("transaction_submission=false");
console.log("chain2050_write=false");
