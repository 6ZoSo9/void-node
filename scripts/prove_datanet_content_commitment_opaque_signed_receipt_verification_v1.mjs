import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  Wallet,
} from "ethers";
import {
  verifyDatanetContentCommitmentOpaqueSignedReceiptV1,
  VOID_DATANET_CONTENT_COMMITMENT_OPAQUE_SIGNED_RECEIPT_ENVELOPE_V1,
  VOID_DATANET_CONTENT_COMMITMENT_OPAQUE_SIGNED_RECEIPT_BODY_V1,
  VOID_DATANET_CONTENT_COMMITMENT_OPAQUE_SIGNED_RECEIPT_ATTESTATION_DOMAIN_V1,
  VOID_DATANET_CONTENT_COMMITMENT_OPAQUE_SIGNED_RECEIPT_VERIFICATION_AUTHORITY_V1,
} from "../tools/datanet-content-commitment-opaque-signed-receipt-verification-v1.mjs";
import {
  canonicalJson,
  sha256,
} from "../tools/datanet-content-commitment-compiler-profile-v1.mjs";

const wallet=new Wallet("0x"+"11".repeat(32));
const publisher=wallet.address.toLowerCase();
const registry="0x2222222222222222222222222222222222222222";
const candidate={
  transaction_type:2,
  chain_id:"2050",
  nonce:"9",
  from_address:publisher,
  to_address:registry,
  value_wei:"0",
  calldata:"0x1234",
  gas_limit:"60000",
  max_fee_per_gas_wei:"2000000000",
  max_priority_fee_per_gas_wei:"1000000000",
};
const candidateFingerprint=sha256(canonicalJson(candidate));

function signingRequest(overrides={}){
  const material={
    marker:"VOID_DATANET_CONTENT_COMMITMENT_EXACT_PUBLISHER_SIGNING_REQUEST_V1",
    version:1,
    status:"exact_consumed_transaction_ready_for_external_signing_request",
    chain_id:"2050",
    authorization_id:"voiddccsta1_"+"1".repeat(64),
    authorization_verification_id:"voiddccstav1_"+"2".repeat(64),
    consumption_record_id:"voiddccstac1_"+"3".repeat(64),
    final_signing_review_preflight_id:"voiddccfsrp1_"+"4".repeat(64),
    unsigned_transaction_candidate_fingerprint_sha256:candidateFingerprint,
    publisher_address:publisher,
    unsigned_transaction_candidate:candidate,
    transaction_summary:{
      transaction_type:2,
      chain_id:"2050",
      nonce:"9",
      from_address:publisher,
      to_address:registry,
      value_wei:"0",
      gas_limit:"60000",
      max_fee_per_gas_wei:"2000000000",
      max_priority_fee_per_gas_wei:"1000000000",
      calldata_sha256:sha256(Buffer.from("1234","hex")),
    },
    canonical_state_store_realpath_sha256:"5".repeat(64),
    external_signing_idempotency_key_sha256:"6".repeat(64),
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
    ...overrides,
  };
}
async function receiptFor(request=signingRequest(),signer=wallet,overrides={}){
  const body={
    marker:
      VOID_DATANET_CONTENT_COMMITMENT_OPAQUE_SIGNED_RECEIPT_BODY_V1,
    version:1,
    external_signing_status:"prepared_in_opaque_custody",
    signing_request_id:request.signing_request_id,
    external_signing_idempotency_key_sha256:
      request.external_signing_idempotency_key_sha256,
    authorization_id:request.authorization_id,
    consumption_record_id:request.consumption_record_id,
    final_signing_review_preflight_id:
      request.final_signing_review_preflight_id,
    unsigned_transaction_candidate_fingerprint_sha256:
      request.unsigned_transaction_candidate_fingerprint_sha256,
    publisher_address:request.publisher_address,
    signed_transaction_hash:
      "0x"+"7".repeat(64),
    custody_handle_fingerprint_sha256:"8".repeat(64),
    signed_at_utc:"2026-09-22T15:07:00.000Z",
    raw_signed_transaction_included:false,
    transaction_broadcast_performed:false,
    chain2050_write_performed:false,
    ...overrides,
  };
  const signature=await signer.signMessage(
    VOID_DATANET_CONTENT_COMMITMENT_OPAQUE_SIGNED_RECEIPT_ATTESTATION_DOMAIN_V1+
      "\n"+canonicalJson(body),
  );
  const material={
    marker:
      VOID_DATANET_CONTENT_COMMITMENT_OPAQUE_SIGNED_RECEIPT_ENVELOPE_V1,
    version:1,
    receipt_body:body,
    publisher_attestation_signature:signature,
  };
  return {
    ...material,
    opaque_signed_receipt_id:
      "voiddccosr1_"+sha256(canonicalJson(material)),
  };
}

{
  const request=signingRequest();
  const receipt=await receiptFor(request);
  const result=verifyDatanetContentCommitmentOpaqueSignedReceiptV1({
    signing_request:request,
    opaque_signed_receipt:receipt,
  });
  assert.equal(result.ok,true);
  if(result.ok===false)throw new Error(result.reason);
  assert.equal(
    result.status,
    "opaque_signed_receipt_publisher_attestation_verified",
  );
  assert.match(
    result.opaque_signed_receipt_verification_id,
    /^voiddccosrv1_[0-9a-f]{64}$/,
  );
  assert.equal(result.publisher_address,publisher);
  assert.equal(
    result.recovered_publisher_attestation_address,
    publisher,
  );
  assert.equal(result.publisher_wallet_attestation_verified,true);
  assert.equal(
    result.verification.signed_transaction_hash_attested_by_publisher,
    true,
  );
  assert.equal(
    result.verification.raw_signed_transaction_verified_by_application,
    false,
  );
  assert.equal(result.raw_signed_transaction_accessed,false);
  assert.equal(result.transaction_broadcast_performed,false);
  assert.equal(result.chain2050_write_performed,false);
}

{
  const request=signingRequest();
  const wrongWallet=new Wallet("0x"+"22".repeat(32));
  const receipt=await receiptFor(request,wrongWallet);
  const result=verifyDatanetContentCommitmentOpaqueSignedReceiptV1({
    signing_request:request,
    opaque_signed_receipt:receipt,
  });
  assert.equal(result.ok,false);
  assert.equal(
    result.reason,
    "opaque_signed_receipt_publisher_attestation_signer_mismatch",
  );
}

{
  const request=signingRequest();
  const receipt=await receiptFor(request);
  receipt.receipt_body.signed_transaction_hash="0x"+"9".repeat(64);
  const result=verifyDatanetContentCommitmentOpaqueSignedReceiptV1({
    signing_request:request,
    opaque_signed_receipt:receipt,
  });
  assert.equal(result.ok,false);
  assert.equal(result.reason,"opaque_signed_receipt_id_mismatch");
}

{
  const request=signingRequest();
  const receipt=await receiptFor(request,wallet,{
    signed_at_utc:"2026-09-22T15:10:00.000Z",
  });
  const result=verifyDatanetContentCommitmentOpaqueSignedReceiptV1({
    signing_request:request,
    opaque_signed_receipt:receipt,
  });
  assert.equal(result.ok,false);
  assert.equal(result.reason,"opaque_signed_receipt_signed_time_invalid");
}

{
  const request=signingRequest();
  const receipt=await receiptFor(request);
  receipt.receipt_body.raw_signed_transaction="0x1234";
  const material={
    marker:receipt.marker,
    version:receipt.version,
    receipt_body:receipt.receipt_body,
    publisher_attestation_signature:receipt.publisher_attestation_signature,
  };
  receipt.opaque_signed_receipt_id=
    "voiddccosr1_"+sha256(canonicalJson(material));
  const result=verifyDatanetContentCommitmentOpaqueSignedReceiptV1({
    signing_request:request,
    opaque_signed_receipt:receipt,
  });
  assert.equal(result.ok,false);
  assert.equal(result.reason,"opaque_signed_receipt_body_invalid");
}

{
  const request=signingRequest({
    signing_request_id:"voiddccpsreq1_"+"f".repeat(64),
  });
  const receipt=await receiptFor(request);
  const result=verifyDatanetContentCommitmentOpaqueSignedReceiptV1({
    signing_request:request,
    opaque_signed_receipt:receipt,
  });
  assert.equal(result.ok,false);
  assert.equal(
    result.reason,
    "opaque_signed_receipt_signing_request_id_mismatch",
  );
}

for(const [key,expected] of Object.entries({
  source_only_receipt_verification:true,
  exact_signing_request_required:true,
  signing_request_content_id_rederived:true,
  exact_unsigned_transaction_fingerprint_rederived:true,
  exact_transaction_summary_rederived:true,
  publisher_wallet_attestation_required:true,
  publisher_wallet_attestation_recovered_address_must_match:true,
  signed_transaction_hash_attested:true,
  custody_handle_fingerprint_attested:true,
  external_signing_idempotency_key_attested:true,
  raw_signed_transaction_required:false,
  raw_signed_transaction_verified_by_application:false,
  external_custody_inspection_still_required_for_payload_bytes:true,
  filesystem_read:false,
  filesystem_mutation:false,
  sovereign_private_key_access:false,
  transaction_signer_access:false,
  wallet_access:false,
  transaction_signing_performed:false,
  transaction_broadcast_authorized:false,
  transaction_broadcast_performed:false,
  chain2050_write_authorized:false,
  chain2050_write_performed:false,
  automatic_retry:false,
})){
  assert.equal(
    VOID_DATANET_CONTENT_COMMITMENT_OPAQUE_SIGNED_RECEIPT_VERIFICATION_AUTHORITY_V1[key],
    expected,
    key,
  );
}

const source=fs.readFileSync(
  path.join(
    process.cwd(),
    "tools/datanet-content-commitment-opaque-signed-receipt-verification-v1.mjs",
  ),
  "utf8",
);
for(const forbidden of [
  "Wallet(",
  ".signTransaction(",
  ".signMessage(",
  "crypto.sign(",
  "createPrivateKey",
  "eth_sendRawTransaction",
  "eth_sendTransaction",
  "broadcastTransaction(",
  "sendTransaction(",
  "writeFileSync(",
  "mkdirSync(",
  "linkSync(",
  "renameSync(",
  "unlinkSync(",
]){
  assert.equal(source.includes(forbidden),false,"source contains "+forbidden);
}

console.log(
  "VOID_DATANET_CONTENT_COMMITMENT_OPAQUE_SIGNED_RECEIPT_VERIFICATION_V1_PROOF_GREEN",
);
console.log("signing_request_content_id_rederived=true");
console.log("exact_unsigned_transaction_fingerprint_rederived=true");
console.log("exact_transaction_summary_rederived=true");
console.log("publisher_wallet_attestation_verified=true");
console.log("publisher_attestation_address_matches_exact_publisher=true");
console.log("signed_transaction_hash_attested_by_publisher=true");
console.log("custody_handle_fingerprint_attested_by_publisher=true");
console.log("external_signing_idempotency_key_attested_by_publisher=true");
console.log("raw_signed_transaction_accessed=false");
console.log("raw_signed_transaction_verified_by_application=false");
console.log("filesystem_mutation=false");
console.log("transaction_signer_access=false");
console.log("transaction_signing=false");
console.log("transaction_broadcast_authorized=false");
console.log("transaction_broadcast=false");
console.log("chain2050_write=false");
