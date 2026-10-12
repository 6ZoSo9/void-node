import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  Wallet,
} from "ethers";
import {
  buildDatanetContentCommitmentSovereignSingleTransactionAuthorizationRequestAgainstFingerprintV1,
  VOID_DATANET_CONTENT_COMMITMENT_SOVEREIGN_SINGLE_TRANSACTION_AUTHORIZATION_ENVELOPE_V1,
} from "../tools/datanet-content-commitment-sovereign-single-transaction-authorization-v1.mjs";
import {
  consumeDatanetContentCommitmentSingleUseAuthorizationAgainstFingerprintWithClockV1,
} from "../tools/datanet-content-commitment-single-use-authorization-consumption-v1.mjs";
import {
  buildDatanetContentCommitmentExactPublisherSigningRequestAgainstFingerprintWithClockV1,
  buildDatanetContentCommitmentExactPublisherSigningRequestV1,
  VOID_DATANET_CONTENT_COMMITMENT_EXACT_PUBLISHER_SIGNING_REQUEST_AUTHORITY_V1,
} from "../tools/datanet-content-commitment-exact-publisher-signing-request-v1.mjs";
import {
  canonicalJson,
  sha256,
} from "../tools/datanet-content-commitment-compiler-profile-v1.mjs";

const sovereign=crypto.generateKeyPairSync("ed25519");
const sovereignPem=sovereign.publicKey.export({type:"spki",format:"pem"}).toString();
const sovereignDer=sovereign.publicKey.export({type:"spki",format:"der"});
const sovereignFingerprint=
  crypto.createHash("sha256").update(sovereignDer).digest("hex");

const publisher=new Wallet("0x"+"11".repeat(32)).address.toLowerCase();
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

function finalReview(){
  const material={
    marker:"VOID_DATANET_CONTENT_COMMITMENT_FINAL_SIGNING_REVIEW_PREFLIGHT_V1",
    version:1,
    status:
      "fresh_candidate_and_publisher_identity_ready_for_separate_signing_authorization_review",
    chain_id:"2050",
    prior_credential_binding_id:"voiddccpcb1_"+"0".repeat(64),
    fresh_pre_sign_revalidation_id:"voiddccpsr1_"+"1".repeat(64),
    fresh_credential_binding_id:"voiddccpcb1_"+"2".repeat(64),
    publisher_address:publisher,
    unsigned_transaction_candidate:candidate,
    unsigned_transaction_candidate_fingerprint_sha256:candidateFingerprint,
    revalidation:{
      full_pre_sign_revalidation_rerun:true,
      repaired_freshness_wall_reapplied:true,
      pending_nonce_rechecked_after_final_preflight:true,
      credential_identity_binding_rerun_after_fresh_pre_sign:true,
      prior_binding_used_as_lineage_only:true,
      stale_pre_sign_result_authorizes_signing:false,
    },
    authority:{
      review_artifact_only:true,
      separate_explicit_signing_authorization_required:true,
      signer_object_exposed:false,
      signer_access_authorized:false,
      wallet_access_authorized:false,
      transaction_signing_authorized:false,
      transaction_signing_performed:false,
      transaction_broadcast_authorized:false,
      transaction_broadcast_performed:false,
      chain2050_write_authorized:false,
      chain2050_write_performed:false,
      automatic_retry_authorized:false,
    },
    next_gate:
      "explicit_sovereign_single_transaction_signing_authorization_v1",
  };
  return {
    ok:true,
    ...material,
    final_signing_review_preflight_id:
      "voiddccfsrp1_"+sha256(canonicalJson(material)),
    signer_object_exposed:false,
    signing_authorized:false,
    signing_performed:false,
    transaction_broadcast_authorized:false,
    transaction_broadcast_performed:false,
    chain2050_write_authorized:false,
    chain2050_write_performed:false,
  };
}
function envelope(){
  const request=
    buildDatanetContentCommitmentSovereignSingleTransactionAuthorizationRequestAgainstFingerprintV1(
      {
        final_signing_review:finalReview(),
        issued_at_utc:"2026-09-22T15:00:00Z",
        expires_at_utc:"2026-09-22T15:10:00Z",
      },
      sovereignFingerprint,
    );
  assert.equal(request.ok,true);
  const signature=crypto.sign(
    null,
    Buffer.from(request.signing_bytes_base64,"base64"),
    sovereign.privateKey,
  ).toString("base64");
  const material={
    marker:
      VOID_DATANET_CONTENT_COMMITMENT_SOVEREIGN_SINGLE_TRANSACTION_AUTHORIZATION_ENVELOPE_V1,
    version:1,
    authorization_body:request.authorization_body,
    public_key_pem:sovereignPem,
    signature_base64:signature,
  };
  return {
    ...material,
    authorization_id:"voiddccsta1_"+sha256(canonicalJson(material)),
  };
}
function stateRoot(){
  const root=fs.mkdtempSync(
    path.join(os.tmpdir(),"void-datanet-signing-request-v1-"),
  );
  fs.chmodSync(root,0o700);
  return root;
}
function consume(root,authorization){
  const result=
    consumeDatanetContentCommitmentSingleUseAuthorizationAgainstFingerprintWithClockV1(
      {
        final_signing_review:finalReview(),
        authorization_envelope:authorization,
        state_dir:root,
      },
      sovereignFingerprint,
      Date.parse("2026-09-22T15:05:00Z"),
    );
  assert.equal(result.ok,true);
  return result;
}
const requestTime=Date.parse("2026-09-22T15:06:00Z");

{
  const root=stateRoot();
  try{
    const authorization=envelope();
    const receipt=consume(root,authorization);
    const result=
      buildDatanetContentCommitmentExactPublisherSigningRequestAgainstFingerprintWithClockV1(
        {
          final_signing_review:finalReview(),
          authorization_envelope:authorization,
          consumption_receipt:receipt,
          state_dir:root,
          canonical_state_store_realpath_sha256:
            sha256(fs.realpathSync(root)),
        },
        sovereignFingerprint,
        requestTime,
      );
    assert.equal(result.ok,true);
    if(result.ok===false)throw new Error(result.reason);
    assert.equal(
      result.status,
      "exact_consumed_transaction_ready_for_external_signing_request",
    );
    assert.match(result.signing_request_id,/^voiddccpsreq1_[0-9a-f]{64}$/);
    assert.equal(result.authorization_id,receipt.authorization_id);
    assert.equal(result.consumption_record_id,receipt.consumption_record_id);
    assert.equal(
      result.unsigned_transaction_candidate_fingerprint_sha256,
      candidateFingerprint,
    );
    assert.deepEqual(result.unsigned_transaction_candidate,candidate);
    assert.equal(result.publisher_address,publisher);
    assert.equal(
      result.external_signer_contract.prepare_once_required,
      true,
    );
    assert.equal(
      result.external_signer_contract.inspect_prepared_required,
      true,
    );
    assert.equal(
      result.external_signer_contract.signer_address_must_equal_publisher,
      true,
    );
    assert.equal(
      result.external_signer_contract.external_runtime_expiry_recheck_required,
      true,
    );
    assert.equal(
      result.external_signer_contract.raw_signed_transaction_application_output,
      false,
    );
    assert.equal(
      result.external_signer_contract.transaction_broadcast_authorized,
      false,
    );
    assert.equal(result.filesystem_mutation_performed,false);
    assert.equal(result.transaction_signer_access_performed,false);
    assert.equal(result.transaction_signing_performed,false);
    assert.equal(result.transaction_broadcast_performed,false);
    assert.equal(result.chain2050_write_performed,false);
    assert.equal(fs.existsSync(path.join(root,"signed")),false);
  }finally{
    fs.rmSync(root,{recursive:true,force:true});
  }
}

{
  const root=stateRoot();
  try{
    const authorization=envelope();
    const receipt=consume(root,authorization);
    const result=
      buildDatanetContentCommitmentExactPublisherSigningRequestAgainstFingerprintWithClockV1(
        {
          final_signing_review:finalReview(),
          authorization_envelope:authorization,
          consumption_receipt:receipt,
          state_dir:root,
          canonical_state_store_realpath_sha256:"f".repeat(64),
        },
        sovereignFingerprint,
        requestTime,
      );
    assert.equal(result.ok,false);
    assert.equal(
      result.reason,
      "datanet_signing_request_canonical_state_store_mismatch",
    );
  }finally{
    fs.rmSync(root,{recursive:true,force:true});
  }
}

{
  const root=stateRoot();
  try{
    const authorization=envelope();
    const receipt=consume(root,authorization);
    const result=
      buildDatanetContentCommitmentExactPublisherSigningRequestAgainstFingerprintWithClockV1(
        {
          final_signing_review:finalReview(),
          authorization_envelope:authorization,
          consumption_receipt:receipt,
          state_dir:root,
          canonical_state_store_realpath_sha256:
            sha256(fs.realpathSync(root)),
        },
        sovereignFingerprint,
        Date.parse("2026-09-22T15:10:00Z"),
      );
    assert.equal(result.ok,false);
    assert.equal(result.reason,"datanet_signing_request_authorization_expired");
  }finally{
    fs.rmSync(root,{recursive:true,force:true});
  }
}

{
  const root=stateRoot();
  try{
    const authorization=envelope();
    const receipt=consume(root,authorization);
    const consumedFile=path.join(root,"consumed",receipt.authorization_id+".json");
    const stored=JSON.parse(fs.readFileSync(consumedFile,"utf8"));
    stored.publisher_address=
      "0x3333333333333333333333333333333333333333";
    fs.writeFileSync(consumedFile,canonicalJson(stored)+"\n");
    fs.chmodSync(consumedFile,0o600);
    const result=
      buildDatanetContentCommitmentExactPublisherSigningRequestAgainstFingerprintWithClockV1(
        {
          final_signing_review:finalReview(),
          authorization_envelope:authorization,
          consumption_receipt:receipt,
          state_dir:root,
          canonical_state_store_realpath_sha256:
            sha256(fs.realpathSync(root)),
        },
        sovereignFingerprint,
        requestTime,
      );
    assert.equal(result.ok,false);
    assert.equal(
      result.reason,
      "datanet_signing_request_consumption_disk_validation_failed",
    );
  }finally{
    fs.rmSync(root,{recursive:true,force:true});
  }
}

{
  const root=stateRoot();
  try{
    const authorization=envelope();
    const receipt=consume(root,authorization);
    const forged=structuredClone(receipt);
    forged.unsigned_transaction_candidate_fingerprint_sha256="f".repeat(64);
    const result=
      buildDatanetContentCommitmentExactPublisherSigningRequestAgainstFingerprintWithClockV1(
        {
          final_signing_review:finalReview(),
          authorization_envelope:authorization,
          consumption_receipt:forged,
          state_dir:root,
          canonical_state_store_realpath_sha256:
            sha256(fs.realpathSync(root)),
        },
        sovereignFingerprint,
        requestTime,
      );
    assert.equal(result.ok,false);
    assert.equal(
      result.reason,
      "datanet_signing_request_consumption_receipt_invalid",
    );
  }finally{
    fs.rmSync(root,{recursive:true,force:true});
  }
}

{
  const root=stateRoot();
  try{
    const authorization=envelope();
    const receipt=consume(root,authorization);
    const production=
      buildDatanetContentCommitmentExactPublisherSigningRequestV1({
        final_signing_review:finalReview(),
        authorization_envelope:authorization,
        consumption_receipt:receipt,
        state_dir:root,
        canonical_state_store_realpath_sha256:
          sha256(fs.realpathSync(root)),
      });
    assert.equal(production.ok,false);
    assert.match(
      production.reason,
      /datanet_signing_request_authorization_held:/,
    );
  }finally{
    fs.rmSync(root,{recursive:true,force:true});
  }
}

for(const [key,expected] of Object.entries({
  source_only_request_construction:true,
  sovereign_authorization_reverified:true,
  durable_consumption_record_readback_required:true,
  canonical_state_store_fingerprint_required:true,
  runtime_expiry_recheck_required:true,
  exact_unsigned_transaction_fingerprint_rederived:true,
  exact_transaction_summary_rederived:true,
  deterministic_external_signing_idempotency_key:true,
  external_signer_prepare_once_required:true,
  external_signer_inspection_required:true,
  external_opaque_custody_required:true,
  external_signer_address_must_equal_publisher:true,
  external_signer_runtime_expiry_recheck_required:true,
  raw_signed_transaction_application_input:false,
  raw_signed_transaction_application_output:false,
  raw_signed_transaction_application_persistence:false,
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
    VOID_DATANET_CONTENT_COMMITMENT_EXACT_PUBLISHER_SIGNING_REQUEST_AUTHORITY_V1[key],
    expected,
    key,
  );
}

const source=fs.readFileSync(
  path.join(
    process.cwd(),
    "tools/datanet-content-commitment-exact-publisher-signing-request-v1.mjs",
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
  "chmodSync(",
]){
  assert.equal(source.includes(forbidden),false,"source contains "+forbidden);
}

console.log(
  "VOID_DATANET_CONTENT_COMMITMENT_EXACT_PUBLISHER_SIGNING_REQUEST_V1_PROOF_GREEN",
);
console.log("sovereign_authorization_reverified=true");
console.log("durable_consumption_record_readback_required=true");
console.log("canonical_state_store_fingerprint_required=true");
console.log("runtime_expiry_rechecked=true");
console.log("exact_unsigned_transaction_fingerprint_rederived=true");
console.log("exact_transaction_summary_rederived=true");
console.log("deterministic_external_signing_idempotency_key=true");
console.log("external_signer_prepare_once_required=true");
console.log("external_signer_inspection_required=true");
console.log("external_signer_address_must_equal_publisher=true");
console.log("external_runtime_expiry_recheck_required=true");
console.log("filesystem_mutation=false");
console.log("transaction_signer_access=false");
console.log("transaction_signing=false");
console.log("raw_signed_transaction_application_output=false");
console.log("transaction_broadcast_authorized=false");
console.log("transaction_broadcast=false");
console.log("chain2050_write=false");
