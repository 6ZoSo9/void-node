import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  Interface,
} from "ethers";
import {
  admitDatanetContentCommitmentFinalizedReceiptV1,
  VOID_DATANET_CONTENT_COMMITMENT_FINALIZED_RECEIPT_ADMISSION_AUTHORITY_V1,
} from "../tools/datanet-content-commitment-finalized-receipt-admission-v1.mjs";
import {
  canonicalJson,
  sha256,
} from "../tools/datanet-content-commitment-compiler-profile-v1.mjs";

const COMMIT=new Interface([
  "function commit(bytes32 objectIdSha256,bytes32 contentSha256,uint64 byteLength)",
]);

const PUBLISHER="0x1111111111111111111111111111111111111111";
const REGISTRY="0x2222222222222222222222222222222222222222";
const OBJECT_ID_SHA256="3".repeat(64);
const CONTENT_SHA256="4".repeat(64);
const BYTE_LENGTH=1234n;
const TX_HASH="0x"+"5".repeat(64);
const RECEIPT_BLOCK_HASH="0x"+"6".repeat(64);
const CHECKPOINT_HASH="0x"+"7".repeat(64);
const STATE_HASH="8".repeat(64);
const SOVEREIGN_FINGERPRINT="9".repeat(64);

function transactionSummary(candidate){
  return {
    transaction_type:2,
    chain_id:"2050",
    nonce:String(candidate.nonce),
    from_address:String(candidate.from_address).toLowerCase(),
    to_address:String(candidate.to_address).toLowerCase(),
    value_wei:"0",
    gas_limit:String(candidate.gas_limit),
    max_fee_per_gas_wei:String(candidate.max_fee_per_gas_wei),
    max_priority_fee_per_gas_wei:
      String(candidate.max_priority_fee_per_gas_wei),
    calldata_sha256:
      sha256(Buffer.from(String(candidate.calldata).slice(2),"hex")),
  };
}

function canonicalCandidate(calldata){
  return {
    transaction_type:2,
    chain_id:"2050",
    nonce:"9",
    from_address:PUBLISHER,
    to_address:REGISTRY,
    value_wei:"0",
    calldata,
    gas_limit:"60000",
    max_fee_per_gas_wei:"2000000000",
    max_priority_fee_per_gas_wei:"1000000000",
  };
}

function signingRequest(candidate){
  const candidateFingerprint=sha256(canonicalJson(candidate));
  const material={
    marker:"VOID_DATANET_CONTENT_COMMITMENT_EXACT_PUBLISHER_SIGNING_REQUEST_V1",
    version:1,
    status:"exact_consumed_transaction_ready_for_external_signing_request",
    chain_id:"2050",
    authorization_id:"voiddccsta1_"+"a".repeat(64),
    authorization_verification_id:"voiddccstav1_"+"b".repeat(64),
    consumption_record_id:"voiddccstac1_"+"c".repeat(64),
    final_signing_review_preflight_id:"voiddccfsrp1_"+"d".repeat(64),
    unsigned_transaction_candidate_fingerprint_sha256:candidateFingerprint,
    publisher_address:PUBLISHER,
    unsigned_transaction_candidate:candidate,
    transaction_summary:transactionSummary(candidate),
    canonical_state_store_realpath_sha256:STATE_HASH,
    external_signing_idempotency_key_sha256:"e".repeat(64),
    issued_at_utc:"2026-09-22T15:00:00.000Z",
    expires_at_utc:"2026-09-22T15:10:00.000Z",
    request_constructed_at_utc:"2026-09-22T15:06:00.000Z",
    external_signer_contract:{
      prepare_once_required:true,
      inspect_prepared_required:true,
      signer_address_must_equal_publisher:true,
      exact_unsigned_transaction_fingerprint_required:true,
      external_runtime_expiry_recheck_required:true,
      opaque_custody_required:true,
      raw_signed_transaction_application_input:false,
      raw_signed_transaction_application_output:false,
      raw_signed_transaction_application_persistence:false,
      signed_transaction_hash_output_permitted:true,
      custody_handle_fingerprint_output_permitted:true,
      transaction_broadcast_authorized:false,
    },
    authority:{
      signing_request_only:true,
      sovereign_exact_transaction_signing_authorization_verified:true,
      durable_authorization_consumption_verified:true,
      application_private_key_access_performed:false,
      application_wallet_access_performed:false,
      transaction_signer_access_performed:false,
      transaction_signing_performed:false,
      transaction_broadcast_authorized:false,
      transaction_broadcast_performed:false,
      chain2050_write_authorized:false,
      chain2050_write_performed:false,
      filesystem_mutation_performed:false,
      validator_mutation_authorized:false,
      governance_mutation_authorized:false,
      work_credit_mutation_authorized:false,
      service_action_authorized:false,
      funds_action_authorized:false,
      automatic_retry_authorized:false,
    },
    next_gate:
      "external_opaque_signer_execution_and_signed_receipt_verification_outside_application_v1",
  };
  return {
    ok:true,
    ...material,
    signing_request_id:
      "voiddccpsreq1_"+sha256(canonicalJson(material)),
    signing_request_constructed:true,
    filesystem_mutation_performed:false,
    sovereign_private_key_access_performed:false,
    transaction_signer_access_performed:false,
    wallet_access_performed:false,
    transaction_signing_performed:false,
    transaction_broadcast_performed:false,
    chain2050_write_performed:false,
    authority_contract:{fixture:true},
  };
}

function receiptVerification(candidateFingerprint){
  return {
    ok:true,
    marker:
      "VOID_DATANET_CONTENT_COMMITMENT_RECONCILED_BROADCAST_RECEIPT_VERIFICATION_V1",
    version:1,
    status:"reconciled_broadcast_receipt_verified_finality_pending",
    chain_id:"2050",
    broadcast_authorization_id:"voiddccba1_"+"1".repeat(64),
    broadcast_consumption_record_id:"voiddccbac1_"+"2".repeat(64),
    submission_intent_id:"voiddccbasi1_"+"3".repeat(64),
    submission_idempotency_key_sha256:"4".repeat(64),
    signed_transaction_hash:TX_HASH,
    publisher_address:PUBLISHER,
    unsigned_transaction_candidate_fingerprint_sha256:candidateFingerprint,
    canonical_state_store_realpath_sha256:STATE_HASH,
    reconciliation_status:"confirmed",
    reconciled_at_utc:"2026-09-22T15:11:00.000Z",
    receipt_observed_at_utc:"2026-09-22T15:20:00.000Z",
    receipt:{
      status:"confirmed",
      transaction_status:"1",
      transaction_hash:TX_HASH,
      block_number:"100",
      block_hash:RECEIPT_BLOCK_HASH,
      current_block_number:"120",
      confirmation_count:"21",
      from_address:PUBLISHER,
      provider_observation_id:"synthetic-provider-v1",
    },
    verification:{
      exact_transaction_hash_verified:true,
      exact_publisher_verified:true,
      terminal_status_consistent:true,
      receipt_block_hash_present:true,
      confirmation_arithmetic_verified:true,
      minimum_confirmation_threshold_applied:false,
      accepted_checkpoint_membership_verified:false,
      chain_finality_verified:false,
    },
    authority:{
      terminal_reconciliation_verified:true,
      durable_consumption_record_verified:true,
      durable_submission_intent_verified:true,
      canonical_state_store_verified:true,
      metadata_only_receipt_request:true,
      receipt_observer_invoked:true,
      submit_method_invoked:false,
      transaction_submission_authorized:false,
      automatic_retry_authorized:false,
      filesystem_mutation_performed:false,
      sovereign_private_key_access_performed:false,
      wallet_access_performed:false,
      transaction_signing_performed:false,
      direct_rpc_call_performed:false,
      direct_network_call_performed:false,
      chain2050_write_direct_performed:false,
    },
    next_gate:"chain2050_reconciled_receipt_finality_v1",
    receipt_observer_invoked:true,
    submit_method_invoked:false,
    transaction_submission_authorized:false,
    automatic_retry_allowed:false,
    receipt_verified:true,
    finality_verified:false,
    raw_signed_transaction_accessed:false,
    opaque_custody_handle_accessed:false,
    filesystem_mutation_performed:false,
    sovereign_private_key_access_performed:false,
    wallet_access_performed:false,
    transaction_signing_performed:false,
    direct_rpc_call_performed:false,
    direct_network_call_performed:false,
    chain2050_write_direct_performed:false,
    authority_contract:{fixture:true},
  };
}

function finalityVerification(receipt){
  const material={
    marker:
      "VOID_DATANET_CONTENT_COMMITMENT_CHAIN2050_RECONCILED_RECEIPT_FINALITY_V1",
    version:1,
    status:"chain2050_reconciled_receipt_finality_verified",
    chain_id:"2050",
    finality_policy_id:"mainnet0-checkpoint-finality-v1",
    finality_kind:"operator_recognized_accepted_checkpoint",
    receipt_verification_fingerprint_sha256:
      sha256(canonicalJson(receipt)),
    checkpoint_attestation_id:"voiddccfca1_"+"5".repeat(64),
    signed_transaction_hash:TX_HASH,
    receipt_status:"confirmed",
    transaction_status:"1",
    publisher_address:PUBLISHER,
    receipt_block_number:"100",
    receipt_block_hash:RECEIPT_BLOCK_HASH,
    observed_current_block_number:"120",
    observed_confirmation_count:"21",
    minimum_confirmations:"12",
    accepted_checkpoint_height:"120",
    accepted_checkpoint_hash:CHECKPOINT_HASH,
    signer_public_key_der_sha256:SOVEREIGN_FINGERPRINT,
    commitment_succeeded:true,
    finality:{
      minimum_confirmation_threshold_applied:true,
      minimum_confirmation_threshold_met:true,
      accepted_checkpoint_membership_verified:true,
      receipt_block_in_accepted_history_verified:true,
      operator_recognized_canonical_checkpoint_verified:true,
      chain_finality_verified:true,
      protocol_consensus_finality_claimed:false,
    },
    authority:{
      finality_verification_only:true,
      sovereign_checkpoint_signature_verified:true,
      receipt_verification_bound:true,
      transaction_submission_authorized:false,
      automatic_retry_authorized:false,
      filesystem_mutation_performed:false,
      sovereign_private_key_access_performed:false,
      wallet_access_performed:false,
      transaction_signing_performed:false,
      direct_rpc_call_performed:false,
      direct_network_call_performed:false,
      chain2050_write_direct_performed:false,
    },
    next_gate:"datanet_content_commitment_finalized_receipt_admission_v1",
  };
  return {
    ok:true,
    ...material,
    finality_verification_id:
      "voiddccrfv1_"+sha256(canonicalJson(material)),
    finality_verified:true,
    protocol_consensus_finality_claimed:false,
    transaction_submission_authorized:false,
    automatic_retry_allowed:false,
    filesystem_mutation_performed:false,
    sovereign_private_key_access_performed:false,
    wallet_access_performed:false,
    transaction_signing_performed:false,
    direct_rpc_call_performed:false,
    direct_network_call_performed:false,
    chain2050_write_direct_performed:false,
    authority_contract:{fixture:true},
  };
}

function fixture(calldata){
  const candidate=canonicalCandidate(calldata);
  const signing=signingRequest(candidate);
  const receipt=receiptVerification(
    signing.unsigned_transaction_candidate_fingerprint_sha256,
  );
  const finality=finalityVerification(receipt);
  return {
    candidate,
    signing,
    receipt,
    finality,
    input:{
      signing_request:signing,
      receipt_verification:receipt,
      finality_verification:finality,
    },
  };
}

const commitCalldata=COMMIT.encodeFunctionData(
  "commit",
  ["0x"+OBJECT_ID_SHA256,"0x"+CONTENT_SHA256,BYTE_LENGTH],
).toLowerCase();

{
  const f=fixture(commitCalldata);
  const result=admitDatanetContentCommitmentFinalizedReceiptV1(f.input);
  assert.equal(result.ok,true);
  if(result.ok===false)throw new Error(result.reason);
  assert.equal(
    result.status,
    "finalized_confirmed_commit_call_admitted_event_membership_pending",
  );
  assert.match(result.finalized_receipt_admission_id,/^voiddccfra1_[0-9a-f]{64}$/);
  assert.equal(result.finality_verification_id,f.finality.finality_verification_id);
  assert.equal(
    result.receipt_verification_fingerprint_sha256,
    sha256(canonicalJson(f.receipt)),
  );
  assert.equal(result.signing_request_id,f.signing.signing_request_id);
  assert.equal(
    result.unsigned_transaction_candidate_fingerprint_sha256,
    f.signing.unsigned_transaction_candidate_fingerprint_sha256,
  );
  assert.equal(result.registry_address,REGISTRY);
  assert.equal(result.publisher_address,PUBLISHER);
  assert.deepEqual(result.commitment,{
    object_id_sha256:OBJECT_ID_SHA256,
    content_sha256:CONTENT_SHA256,
    byte_length:BYTE_LENGTH.toString(),
    function_signature:"commit(bytes32,bytes32,uint64)",
    calldata_sha256:sha256(Buffer.from(commitCalldata.slice(2),"hex")),
  });
  assert.equal(result.finalized_receipt.transaction_status,"1");
  assert.equal(result.finalized_receipt.block_number,"100");
  assert.equal(result.finalized_receipt.block_hash,RECEIPT_BLOCK_HASH);
  assert.equal(result.finalized_receipt.finality_policy_id,"mainnet0-checkpoint-finality-v1");
  assert.equal(
    result.finalized_receipt.finality_kind,
    "operator_recognized_accepted_checkpoint",
  );
  assert.equal(result.finalized_receipt.protocol_consensus_finality_claimed,false);
  assert.equal(result.verification.finality_verification_id_rederived,true);
  assert.equal(result.verification.signing_request_id_rederived,true);
  assert.equal(
    result.verification.unsigned_transaction_candidate_fingerprint_rederived,
    true,
  );
  assert.equal(result.verification.exact_commit_calldata_decoded,true);
  assert.equal(result.verification.commit_calldata_roundtrip_verified,true);
  assert.equal(result.verification.finalized_confirmed_transaction_verified,true);
  assert.equal(
    result.verification.operator_recognized_checkpoint_finality_verified,
    true,
  );
  assert.equal(result.verification.content_committed_event_membership_verified,false);
  assert.equal(result.verification.canonical_commitment_truth_admitted,false);
  assert.equal(result.event_receipt_membership_verified,false);
  assert.equal(result.canonical_commitment_truth_admitted,false);
  assert.equal(
    result.next_gate,
    "datanet_content_commitment_finalized_event_membership_v1",
  );
  assert.equal(result.transaction_submission_performed,false);
  assert.equal(result.direct_rpc_call_performed,false);
  assert.equal(result.direct_network_call_performed,false);
  assert.equal(result.chain2050_write_direct_performed,false);
}

{
  const f=fixture(commitCalldata);
  f.finality.receipt_status="reverted";
  const result=admitDatanetContentCommitmentFinalizedReceiptV1(f.input);
  assert.equal(result.ok,false);
  assert.equal(result.reason,"datanet_finalized_admission_finality_invalid");
}

{
  const f=fixture(commitCalldata);
  f.finality.finality_verification_id="voiddccrfv1_"+"0".repeat(64);
  const result=admitDatanetContentCommitmentFinalizedReceiptV1(f.input);
  assert.equal(result.ok,false);
  assert.equal(result.reason,"datanet_finalized_admission_finality_id_mismatch");
}

{
  const f=fixture(commitCalldata);
  f.receipt.receipt.provider_observation_id="changed-provider";
  const result=admitDatanetContentCommitmentFinalizedReceiptV1(f.input);
  assert.equal(result.ok,false);
  assert.equal(
    result.reason,
    "datanet_finalized_admission_receipt_fingerprint_mismatch",
  );
}

{
  const f=fixture(commitCalldata);
  f.signing.signing_request_id="voiddccpsreq1_"+"0".repeat(64);
  const result=admitDatanetContentCommitmentFinalizedReceiptV1(f.input);
  assert.equal(result.ok,false);
  assert.equal(
    result.reason,
    "datanet_finalized_admission_signing_request_id_mismatch",
  );
}

{
  const f=fixture(commitCalldata);
  f.signing.unsigned_transaction_candidate.gas_limit="60001";
  const material={...f.signing};
  delete material.ok;
  delete material.signing_request_id;
  delete material.signing_request_constructed;
  delete material.filesystem_mutation_performed;
  delete material.sovereign_private_key_access_performed;
  delete material.transaction_signer_access_performed;
  delete material.wallet_access_performed;
  delete material.transaction_signing_performed;
  delete material.transaction_broadcast_performed;
  delete material.chain2050_write_performed;
  delete material.authority_contract;
  f.signing.signing_request_id=
    "voiddccpsreq1_"+sha256(canonicalJson(material));
  const result=admitDatanetContentCommitmentFinalizedReceiptV1(f.input);
  assert.equal(result.ok,false);
  assert.equal(
    result.reason,
    "datanet_finalized_admission_candidate_binding_mismatch",
  );
}

{
  const f=fixture("0x1234");
  const result=admitDatanetContentCommitmentFinalizedReceiptV1(f.input);
  assert.equal(result.ok,false);
  assert.equal(
    result.reason,
    "datanet_finalized_admission_commit_call_invalid",
  );
}

for(const [key,expected] of Object.entries({
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
})){
  assert.equal(
    VOID_DATANET_CONTENT_COMMITMENT_FINALIZED_RECEIPT_ADMISSION_AUTHORITY_V1[key],
    expected,
    key,
  );
}

const source=fs.readFileSync(
  path.join(
    process.cwd(),
    "tools/datanet-content-commitment-finalized-receipt-admission-v1.mjs",
  ),
  "utf8",
);
for(const forbidden of [
  "eth_sendRawTransaction",
  "eth_sendTransaction",
  "sendRawTransaction(",
  "sendTransaction(",
  "broadcastTransaction(",
  "node:net",
  "node:http",
  "node:https",
  "fetch(",
  "writeFileSync(",
  "mkdirSync(",
  "linkSync(",
  "renameSync(",
  "unlinkSync(",
  "createPrivateKey",
  ".signTransaction(",
]){
  assert.equal(source.includes(forbidden),false,"source contains "+forbidden);
}
assert.equal(source.includes("event_receipt_membership_verified:true"),false);
assert.equal(source.includes("canonical_commitment_truth_admitted:true"),false);

console.log(
  "VOID_DATANET_CONTENT_COMMITMENT_FINALIZED_RECEIPT_ADMISSION_V1_PROOF_GREEN",
);
console.log("finality_verification_id_rederived=true");
console.log("receipt_verification_fingerprint_bound=true");
console.log("signing_request_id_rederived=true");
console.log("unsigned_candidate_fingerprint_rederived=true");
console.log("commit_calldata_decoded_and_roundtripped=true");
console.log("finalized_confirmed_transaction_required=true");
console.log("operator_recognized_checkpoint_finality_verified=true");
console.log("event_receipt_membership_verified=false");
console.log("canonical_commitment_truth_admitted=false");
console.log("transaction_submission=false");
console.log("rpc_call=false");
console.log("chain2050_write=false");
