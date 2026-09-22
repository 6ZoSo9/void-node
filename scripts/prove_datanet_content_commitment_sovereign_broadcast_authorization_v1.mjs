import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  Wallet,
} from "ethers";
import {
  buildDatanetContentCommitmentSovereignBroadcastAuthorizationRequestAgainstFingerprintV1,
  buildDatanetContentCommitmentSovereignBroadcastAuthorizationRequestV1,
  verifyDatanetContentCommitmentSovereignBroadcastAuthorizationAgainstFingerprintV1,
  verifyDatanetContentCommitmentSovereignBroadcastAuthorizationV1,
  VOID_DATANET_CONTENT_COMMITMENT_SOVEREIGN_BROADCAST_AUTHORIZATION_ENVELOPE_V1,
  VOID_DATANET_CONTENT_COMMITMENT_SOVEREIGN_BROADCAST_AUTHORIZATION_AUTHORITY_V1,
} from "../tools/datanet-content-commitment-sovereign-broadcast-authorization-v1.mjs";
import {
  VOID_DATANET_CONTENT_COMMITMENT_OPAQUE_SIGNED_RECEIPT_ENVELOPE_V1,
  VOID_DATANET_CONTENT_COMMITMENT_OPAQUE_SIGNED_RECEIPT_BODY_V1,
  VOID_DATANET_CONTENT_COMMITMENT_OPAQUE_SIGNED_RECEIPT_ATTESTATION_DOMAIN_V1,
} from "../tools/datanet-content-commitment-opaque-signed-receipt-verification-v1.mjs";
import {
  canonicalJson,
  sha256,
} from "../tools/datanet-content-commitment-compiler-profile-v1.mjs";

const sovereign=crypto.generateKeyPairSync("ed25519");
const sovereignPem=sovereign.publicKey.export({type:"spki",format:"pem"}).toString();
const sovereignDer=sovereign.publicKey.export({type:"spki",format:"der"});
const sovereignFingerprint=
  crypto.createHash("sha256").update(sovereignDer).digest("hex");

const publisherWallet=new Wallet("0x"+"11".repeat(32));
const publisher=publisherWallet.address.toLowerCase();
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

function signingRequest(){
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
  };
}
async function opaqueReceipt(request=signingRequest(),wallet=publisherWallet){
  const body={
    marker:VOID_DATANET_CONTENT_COMMITMENT_OPAQUE_SIGNED_RECEIPT_BODY_V1,
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
    signed_transaction_hash:"0x"+"7".repeat(64),
    custody_handle_fingerprint_sha256:"8".repeat(64),
    signed_at_utc:"2026-09-22T15:07:00.000Z",
    raw_signed_transaction_included:false,
    transaction_broadcast_performed:false,
    chain2050_write_performed:false,
  };
  const signature=await wallet.signMessage(
    VOID_DATANET_CONTENT_COMMITMENT_OPAQUE_SIGNED_RECEIPT_ATTESTATION_DOMAIN_V1+
      "\n"+canonicalJson(body),
  );
  const material={
    marker:VOID_DATANET_CONTENT_COMMITMENT_OPAQUE_SIGNED_RECEIPT_ENVELOPE_V1,
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
async function buildRequest(expires="2026-09-22T15:13:00Z"){
  return buildDatanetContentCommitmentSovereignBroadcastAuthorizationRequestAgainstFingerprintV1(
    {
      signing_request:signingRequest(),
      opaque_signed_receipt:await opaqueReceipt(),
      issued_at_utc:"2026-09-22T15:08:00Z",
      expires_at_utc:expires,
    },
    sovereignFingerprint,
  );
}
function envelopeFor(request,privateKey=sovereign.privateKey,pem=sovereignPem){
  assert.equal(request.ok,true);
  const signature=crypto.sign(
    null,
    Buffer.from(request.signing_bytes_base64,"base64"),
    privateKey,
  ).toString("base64");
  const material={
    marker:
      VOID_DATANET_CONTENT_COMMITMENT_SOVEREIGN_BROADCAST_AUTHORIZATION_ENVELOPE_V1,
    version:1,
    authorization_body:request.authorization_body,
    public_key_pem:pem,
    signature_base64:signature,
  };
  return {
    ...material,
    broadcast_authorization_id:
      "voiddccba1_"+sha256(canonicalJson(material)),
  };
}

{
  const request=await buildRequest();
  assert.equal(request.ok,true);
  if(request.ok===false)throw new Error(request.reason);
  assert.equal(request.status,"sovereign_broadcast_signature_required");
  assert.equal(
    request.authorization_body.signed_transaction_hash,
    "0x"+"7".repeat(64),
  );
  assert.equal(
    request.authorization_body.custody_handle_fingerprint_sha256,
    "8".repeat(64),
  );
  assert.equal(
    request.authorization_body.authorization_scope.exact_signed_transaction_broadcast,
    true,
  );
  assert.equal(
    request.authorization_body.authorization_scope.single_use,
    true,
  );
  assert.equal(request.raw_signed_transaction_accessed,false);
  assert.equal(request.transaction_broadcast_performed,false);

  const envelope=envelopeFor(request);
  const verified=
    verifyDatanetContentCommitmentSovereignBroadcastAuthorizationAgainstFingerprintV1(
      {
        signing_request:signingRequest(),
        opaque_signed_receipt:await opaqueReceipt(),
        authorization_envelope:envelope,
      },
      sovereignFingerprint,
    );
  assert.equal(verified.ok,true);
  if(verified.ok===false)throw new Error(verified.reason);
  assert.equal(
    verified.status,
    "exact_signed_transaction_broadcast_authorization_verified_unconsumed",
  );
  assert.match(
    verified.broadcast_authorization_verification_id,
    /^voiddccbav1_[0-9a-f]{64}$/,
  );
  assert.equal(
    verified.authorization.exact_signed_transaction_broadcast_approved,
    true,
  );
  assert.equal(verified.authorization.authorization_consumed,false);
  assert.equal(
    verified.authorization.replay_prevention_enforced_by_this_verifier,
    false,
  );
  assert.equal(
    verified.authority.exact_signed_transaction_broadcast_permitted_by_sovereign,
    true,
  );
  assert.equal(verified.broadcaster_access_performed,false);
  assert.equal(verified.transaction_broadcast_performed,false);
  assert.equal(verified.chain2050_write_performed,false);
}

{
  const tooLong=await buildRequest("2026-09-22T15:13:01Z");
  assert.equal(tooLong.ok,false);
  assert.equal(tooLong.reason,"sovereign_broadcast_window_invalid");
}

{
  const request=await buildRequest();
  const envelope=envelopeFor(request);
  envelope.authorization_body={
    ...envelope.authorization_body,
    signed_transaction_hash:"0x"+"9".repeat(64),
  };
  const verified=
    verifyDatanetContentCommitmentSovereignBroadcastAuthorizationAgainstFingerprintV1(
      {
        signing_request:signingRequest(),
        opaque_signed_receipt:await opaqueReceipt(),
        authorization_envelope:envelope,
      },
      sovereignFingerprint,
    );
  assert.equal(verified.ok,false);
  assert.equal(verified.reason,"sovereign_broadcast_body_mismatch");
}

{
  const request=await buildRequest();
  const envelope=envelopeFor(request);
  envelope.signature_base64="A".repeat(86)+"==";
  const verified=
    verifyDatanetContentCommitmentSovereignBroadcastAuthorizationAgainstFingerprintV1(
      {
        signing_request:signingRequest(),
        opaque_signed_receipt:await opaqueReceipt(),
        authorization_envelope:envelope,
      },
      sovereignFingerprint,
    );
  assert.equal(verified.ok,false);
  assert.match(
    verified.reason,
    /sovereign_broadcast_signature_(?:invalid|encoding_invalid)/,
  );
}

{
  const productionRequest=
    buildDatanetContentCommitmentSovereignBroadcastAuthorizationRequestV1({
      signing_request:signingRequest(),
      opaque_signed_receipt:await opaqueReceipt(),
      issued_at_utc:"2026-09-22T15:08:00Z",
      expires_at_utc:"2026-09-22T15:13:00Z",
    });
  assert.equal(productionRequest.ok,true);
  const envelope=envelopeFor(productionRequest);
  const verified=
    verifyDatanetContentCommitmentSovereignBroadcastAuthorizationV1({
      signing_request:signingRequest(),
      opaque_signed_receipt:await opaqueReceipt(),
      authorization_envelope:envelope,
    });
  assert.equal(verified.ok,false);
  assert.equal(
    verified.reason,
    "sovereign_broadcast_public_key_fingerprint_mismatch",
  );
}

for(const [key,expected] of Object.entries({
  source_only_signature_verification:true,
  production_sovereign_fingerprint_pinned:true,
  exact_opaque_signed_receipt_reverification_required:true,
  exact_signed_transaction_hash_required:true,
  exact_custody_handle_fingerprint_required:true,
  exact_original_unsigned_transaction_fingerprint_required:true,
  maximum_authorization_window_seconds:300,
  exact_signed_transaction_broadcast_authorization_may_be_verified:true,
  single_use_required:true,
  durable_consumption_before_broadcaster_access_required:true,
  runtime_expiry_recheck_before_broadcast_required:true,
  replay_prevention_enforced_by_this_verifier:false,
  raw_signed_transaction_required:false,
  raw_signed_transaction_accessed:false,
  sovereign_private_key_access:false,
  broadcaster_access_performed:false,
  transaction_broadcast_performed:false,
  chain2050_write_performed:false,
  filesystem_mutation:false,
  automatic_retry:false,
})){
  assert.equal(
    VOID_DATANET_CONTENT_COMMITMENT_SOVEREIGN_BROADCAST_AUTHORIZATION_AUTHORITY_V1[key],
    expected,
    key,
  );
}

const source=fs.readFileSync(
  path.join(
    process.cwd(),
    "tools/datanet-content-commitment-sovereign-broadcast-authorization-v1.mjs",
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
  "VOID_DATANET_CONTENT_COMMITMENT_SOVEREIGN_BROADCAST_AUTHORIZATION_V1_PROOF_GREEN",
);
console.log("opaque_signed_receipt_reverified=true");
console.log("signed_transaction_hash_bound=true");
console.log("custody_handle_fingerprint_bound=true");
console.log("original_unsigned_transaction_fingerprint_bound=true");
console.log("publisher_identity_bound=true");
console.log("authorization_window_max_seconds=300");
console.log("sovereign_ed25519_signature_verified=true");
console.log("single_use_required=true");
console.log("durable_consumption_before_broadcaster_access_required=true");
console.log("runtime_expiry_recheck_before_broadcast_required=true");
console.log("replay_prevention_enforced_by_this_verifier=false");
console.log("production_test_key_rejected=true");
console.log("raw_signed_transaction_accessed=false");
console.log("broadcaster_access=false");
console.log("transaction_broadcast=false");
console.log("chain2050_write=false");
