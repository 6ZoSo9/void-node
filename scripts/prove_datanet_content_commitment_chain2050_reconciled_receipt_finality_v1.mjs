import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  buildDatanetContentCommitmentChain2050AcceptedCheckpointAttestationRequestAgainstFingerprintV1,
  buildDatanetContentCommitmentChain2050AcceptedCheckpointAttestationRequestV1,
  verifyDatanetContentCommitmentChain2050ReconciledReceiptFinalityAgainstFingerprintV1,
  verifyDatanetContentCommitmentChain2050ReconciledReceiptFinalityV1,
  VOID_DATANET_CONTENT_COMMITMENT_CHAIN2050_ACCEPTED_CHECKPOINT_ATTESTATION_ENVELOPE_V1,
  VOID_DATANET_CONTENT_COMMITMENT_CHAIN2050_RECONCILED_RECEIPT_FINALITY_AUTHORITY_V1,
} from "../tools/datanet-content-commitment-chain2050-reconciled-receipt-finality-v1.mjs";
import {
  canonicalJson,
  sha256,
} from "../tools/datanet-content-commitment-compiler-profile-v1.mjs";

const sovereign=crypto.generateKeyPairSync("ed25519");
const sovereignPem=
  sovereign.publicKey.export({type:"spki",format:"pem"}).toString();
const sovereignDer=
  sovereign.publicKey.export({type:"spki",format:"der"});
const sovereignFingerprint=
  crypto.createHash("sha256").update(sovereignDer).digest("hex");

function receiptVerification(status="confirmed",confirmations="12"){
  const block=100n;
  const count=BigInt(confirmations);
  const current=block+count-1n;
  const confirmed=status==="confirmed";
  return {
    ok:true,
    marker:
      "VOID_DATANET_CONTENT_COMMITMENT_RECONCILED_BROADCAST_RECEIPT_VERIFICATION_V1",
    version:1,
    status:"reconciled_broadcast_receipt_verified_finality_pending",
    chain_id:"2050",
    broadcast_authorization_id:"voiddccba1_"+"a".repeat(64),
    broadcast_consumption_record_id:"voiddccbac1_"+"b".repeat(64),
    submission_intent_id:"voiddccbasi1_"+"c".repeat(64),
    submission_idempotency_key_sha256:"d".repeat(64),
    signed_transaction_hash:"0x"+"e".repeat(64),
    publisher_address:"0x1111111111111111111111111111111111111111",
    unsigned_transaction_candidate_fingerprint_sha256:"f".repeat(64),
    canonical_state_store_realpath_sha256:"1".repeat(64),
    reconciliation_status:status,
    reconciled_at_utc:"2026-09-22T15:50:00.000Z",
    receipt_observed_at_utc:"2026-09-22T15:55:00.000Z",
    receipt:{
      status,
      transaction_status:confirmed?"1":"0",
      transaction_hash:"0x"+"e".repeat(64),
      block_number:block.toString(),
      block_hash:"0x"+"2".repeat(64),
      current_block_number:current.toString(),
      confirmation_count:confirmations,
      from_address:"0x1111111111111111111111111111111111111111",
      provider_observation_id:"synthetic-observer-1",
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
    authority_contract:{},
  };
}

function requestFor(status="confirmed",confirmations="12",checkpointHeight="111"){
  return buildDatanetContentCommitmentChain2050AcceptedCheckpointAttestationRequestAgainstFingerprintV1(
    {
      receipt_verification:receiptVerification(status,confirmations),
      accepted_checkpoint_height:checkpointHeight,
      accepted_checkpoint_hash:"0x"+"3".repeat(64),
      issued_at_utc:"2026-09-22T16:00:00.000Z",
    },
    sovereignFingerprint,
  );
}

function envelopeFor(request,privateKey=sovereign.privateKey,pem=sovereignPem){
  assert.equal(request.ok,true);
  if(request.ok===false)throw new Error(request.reason);
  const signature=crypto.sign(
    null,
    Buffer.from(request.signing_bytes_base64,"base64"),
    privateKey,
  ).toString("base64");
  const material={
    marker:
      VOID_DATANET_CONTENT_COMMITMENT_CHAIN2050_ACCEPTED_CHECKPOINT_ATTESTATION_ENVELOPE_V1,
    version:1,
    attestation_body:request.attestation_body,
    public_key_pem:pem,
    signature_base64:signature,
  };
  return {
    ...material,
    checkpoint_attestation_id:
      "voiddccfca1_"+sha256(canonicalJson(material)),
  };
}

{
  const request=requestFor();
  assert.equal(request.ok,true);
  if(request.ok===false)throw new Error(request.reason);
  assert.equal(
    request.status,
    "sovereign_accepted_checkpoint_signature_required",
  );
  assert.equal(request.attestation_body.minimum_confirmations,"12");
  assert.equal(
    request.attestation_body.minimum_confirmation_threshold_met,
    true,
  );
  assert.equal(
    request.attestation_body.receipt_block_in_accepted_history,
    true,
  );
  assert.equal(
    request.attestation_body.operator_recognized_canonical,
    true,
  );
  assert.equal(
    request.attestation_body.protocol_consensus_finality_claimed,
    false,
  );

  const envelope=envelopeFor(request);
  const result=
    verifyDatanetContentCommitmentChain2050ReconciledReceiptFinalityAgainstFingerprintV1(
      {
        receipt_verification:receiptVerification(),
        checkpoint_attestation_envelope:envelope,
      },
      sovereignFingerprint,
    );
  assert.equal(result.ok,true);
  if(result.ok===false)throw new Error(result.reason);
  assert.equal(
    result.status,
    "chain2050_reconciled_receipt_finality_verified",
  );
  assert.match(result.finality_verification_id,/^voiddccrfv1_[0-9a-f]{64}$/);
  assert.equal(result.finality_policy_id,"mainnet0-checkpoint-finality-v1");
  assert.equal(result.finality_kind,"operator_recognized_accepted_checkpoint");
  assert.equal(result.observed_confirmation_count,"12");
  assert.equal(result.minimum_confirmations,"12");
  assert.equal(result.finality.minimum_confirmation_threshold_applied,true);
  assert.equal(result.finality.minimum_confirmation_threshold_met,true);
  assert.equal(result.finality.accepted_checkpoint_membership_verified,true);
  assert.equal(
    result.finality.receipt_block_in_accepted_history_verified,
    true,
  );
  assert.equal(
    result.finality.operator_recognized_canonical_checkpoint_verified,
    true,
  );
  assert.equal(result.finality.chain_finality_verified,true);
  assert.equal(result.finality.protocol_consensus_finality_claimed,false);
  assert.equal(result.protocol_consensus_finality_claimed,false);
  assert.equal(result.commitment_succeeded,true);
  assert.equal(
    result.next_gate,
    "datanet_content_commitment_finalized_receipt_admission_v1",
  );
  assert.equal(result.transaction_submission_authorized,false);
  assert.equal(result.chain2050_write_direct_performed,false);
}

{
  const request=requestFor("reverted");
  const envelope=envelopeFor(request);
  const result=
    verifyDatanetContentCommitmentChain2050ReconciledReceiptFinalityAgainstFingerprintV1(
      {
        receipt_verification:receiptVerification("reverted"),
        checkpoint_attestation_envelope:envelope,
      },
      sovereignFingerprint,
    );
  assert.equal(result.ok,true);
  if(result.ok===false)throw new Error(result.reason);
  assert.equal(result.receipt_status,"reverted");
  assert.equal(result.transaction_status,"0");
  assert.equal(result.commitment_succeeded,false);
  assert.equal(
    result.next_gate,
    "datanet_content_commitment_reverted_terminal_closeout_v1",
  );
  assert.equal(result.finality_verified,true);
}

{
  const request=requestFor("confirmed","11","111");
  assert.equal(request.ok,false);
  assert.equal(
    request.reason,
    "datanet_finality_minimum_confirmations_not_met",
  );
}

{
  const request=requestFor("confirmed","12","110");
  assert.equal(request.ok,false);
  assert.equal(
    request.reason,
    "datanet_finality_checkpoint_too_early_for_threshold",
  );
}

{
  const request=requestFor();
  const envelope=envelopeFor(request);
  envelope.attestation_body={
    ...envelope.attestation_body,
    accepted_checkpoint_hash:"0x"+"4".repeat(64),
  };
  const result=
    verifyDatanetContentCommitmentChain2050ReconciledReceiptFinalityAgainstFingerprintV1(
      {
        receipt_verification:receiptVerification(),
        checkpoint_attestation_envelope:envelope,
      },
      sovereignFingerprint,
    );
  assert.equal(result.ok,false);
  assert.equal(result.reason,"datanet_finality_attestation_body_mismatch");
}

{
  const request=requestFor();
  const envelope=envelopeFor(request);
  envelope.signature_base64="A".repeat(86)+"==";
  const result=
    verifyDatanetContentCommitmentChain2050ReconciledReceiptFinalityAgainstFingerprintV1(
      {
        receipt_verification:receiptVerification(),
        checkpoint_attestation_envelope:envelope,
      },
      sovereignFingerprint,
    );
  assert.equal(result.ok,false);
  assert.match(
    result.reason,
    /datanet_finality_signature_(?:invalid|encoding_invalid)/,
  );
}

{
  const productionRequest=
    buildDatanetContentCommitmentChain2050AcceptedCheckpointAttestationRequestV1(
      {
        receipt_verification:receiptVerification(),
        accepted_checkpoint_height:"111",
        accepted_checkpoint_hash:"0x"+"3".repeat(64),
        issued_at_utc:"2026-09-22T16:00:00.000Z",
      },
    );
  assert.equal(productionRequest.ok,true);
  const envelope=envelopeFor(productionRequest);
  const result=
    verifyDatanetContentCommitmentChain2050ReconciledReceiptFinalityV1({
      receipt_verification:receiptVerification(),
      checkpoint_attestation_envelope:envelope,
    });
  assert.equal(result.ok,false);
  assert.equal(
    result.reason,
    "datanet_finality_public_key_fingerprint_mismatch",
  );
}

for(const [key,expected] of Object.entries({
  source_only_finality_verification:true,
  exact_reconciled_receipt_verification_required:true,
  minimum_confirmations_required:"12",
  minimum_confirmation_threshold_applied:true,
  sovereign_signed_accepted_checkpoint_attestation_required:true,
  operator_recognized_checkpoint_policy:true,
  accepted_checkpoint_membership_verified:true,
  protocol_consensus_finality_claimed:false,
  submission_authority:false,
  automatic_retry:false,
  filesystem_read:false,
  filesystem_mutation:false,
  sovereign_private_key_access:false,
  wallet_access:false,
  transaction_signing:false,
  direct_rpc_transport:false,
  direct_network_transport:false,
  chain2050_write_direct:false,
  validator_mutation:false,
  governance_mutation:false,
  work_credit_mutation:false,
  funds_action_direct:false,
})){
  assert.equal(
    VOID_DATANET_CONTENT_COMMITMENT_CHAIN2050_RECONCILED_RECEIPT_FINALITY_AUTHORITY_V1[key],
    expected,
    key,
  );
}

const source=fs.readFileSync(
  path.join(
    process.cwd(),
    "tools/datanet-content-commitment-chain2050-reconciled-receipt-finality-v1.mjs",
  ),
  "utf8",
);
for(const forbidden of [
  "crypto.sign(",
  "createPrivateKey",
  "privateKey",
  "Wallet(",
  "eth_sendRawTransaction",
  "eth_sendTransaction",
  "sendTransaction(",
  "broadcastTransaction(",
  "node:fs",
  "node:net",
  "node:http",
  "node:https",
  "fetch(",
]){
  assert.equal(
    source.includes(forbidden),
    false,
    "source contains "+forbidden,
  );
}

console.log(
  "VOID_DATANET_CONTENT_COMMITMENT_CHAIN2050_RECONCILED_RECEIPT_FINALITY_V1_PROOF_GREEN",
);
console.log("minimum_confirmations=12");
console.log("minimum_confirmation_threshold_applied=true");
console.log("sovereign_checkpoint_signature_verified=true");
console.log("accepted_checkpoint_membership_verified=true");
console.log("operator_recognized_canonical_checkpoint_verified=true");
console.log("chain_finality_verified=true");
console.log("protocol_consensus_finality_claimed=false");
console.log("confirmed_routes_to_admission=true");
console.log("reverted_routes_to_terminal_closeout=true");
console.log("production_test_key_rejected=true");
console.log("transaction_submission_authorized=false");
console.log("filesystem_mutation=false");
console.log("direct_rpc_call=false");
console.log("chain2050_write=false");
