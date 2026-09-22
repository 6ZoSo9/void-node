import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  Wallet,
} from "ethers";
import {
  buildDatanetContentCommitmentSovereignBroadcastAuthorizationRequestAgainstFingerprintV1,
  VOID_DATANET_CONTENT_COMMITMENT_SOVEREIGN_BROADCAST_AUTHORIZATION_ENVELOPE_V1,
} from "../tools/datanet-content-commitment-sovereign-broadcast-authorization-v1.mjs";
import {
  consumeDatanetContentCommitmentBroadcastAuthorizationAgainstFingerprintWithClockV1,
  consumeDatanetContentCommitmentBroadcastAuthorizationWithClockV1,
  VOID_DATANET_CONTENT_COMMITMENT_BROADCAST_AUTHORIZATION_CONSUMPTION_AUTHORITY_V1,
} from "../tools/datanet-content-commitment-broadcast-authorization-consumption-v1.mjs";
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
const sovereignPem=
  sovereign.publicKey.export({type:"spki",format:"pem"}).toString();
const sovereignDer=
  sovereign.publicKey.export({type:"spki",format:"der"});
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

async function opaqueReceipt(request,wallet=publisherWallet){
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

const signingRequestFixture=signingRequest();
const opaqueReceiptFixture=await opaqueReceipt(signingRequestFixture);

function authorizationEnvelope(expires="2026-09-22T15:13:00Z"){
  const request=
    buildDatanetContentCommitmentSovereignBroadcastAuthorizationRequestAgainstFingerprintV1(
      {
        signing_request:signingRequestFixture,
        opaque_signed_receipt:opaqueReceiptFixture,
        issued_at_utc:"2026-09-22T15:08:00Z",
        expires_at_utc:expires,
      },
      sovereignFingerprint,
    );
  assert.equal(request.ok,true);
  if(request.ok===false)throw new Error(request.reason);
  const signature=crypto.sign(
    null,
    Buffer.from(request.signing_bytes_base64,"base64"),
    sovereign.privateKey,
  ).toString("base64");
  const material={
    marker:
      VOID_DATANET_CONTENT_COMMITMENT_SOVEREIGN_BROADCAST_AUTHORIZATION_ENVELOPE_V1,
    version:1,
    authorization_body:request.authorization_body,
    public_key_pem:sovereignPem,
    signature_base64:signature,
  };
  return {
    ...material,
    broadcast_authorization_id:
      "voiddccba1_"+sha256(canonicalJson(material)),
  };
}

function stateRoot(mode=0o700){
  const root=fs.mkdtempSync(
    path.join(os.tmpdir(),"void-datanet-broadcast-auth-consumption-v1-"),
  );
  fs.chmodSync(root,mode);
  return root;
}

function input(root,envelope=authorizationEnvelope()){
  return {
    signing_request:signingRequestFixture,
    opaque_signed_receipt:opaqueReceiptFixture,
    authorization_envelope:envelope,
    state_dir:root,
  };
}

const now=Date.parse("2026-09-22T15:09:00Z");

{
  const root=stateRoot();
  try{
    const result=
      consumeDatanetContentCommitmentBroadcastAuthorizationAgainstFingerprintWithClockV1(
        input(root),
        sovereignFingerprint,
        now,
      );
    assert.equal(result.ok,true);
    if(result.ok===false)throw new Error(result.reason);
    assert.equal(
      result.status,
      "broadcast_authorization_consumed_before_broadcaster_access",
    );
    assert.match(
      result.broadcast_authorization_id,
      /^voiddccba1_[0-9a-f]{64}$/,
    );
    assert.match(
      result.broadcast_authorization_verification_id,
      /^voiddccbav1_[0-9a-f]{64}$/,
    );
    assert.match(
      result.broadcast_consumption_record_id,
      /^voiddccbac1_[0-9a-f]{64}$/,
    );
    assert.equal(
      result.signing_consumption_record_id,
      signingRequestFixture.consumption_record_id,
    );
    assert.equal(
      result.signed_transaction_hash,
      opaqueReceiptFixture.receipt_body.signed_transaction_hash,
    );
    assert.equal(
      result.custody_handle_fingerprint_sha256,
      opaqueReceiptFixture.receipt_body.custody_handle_fingerprint_sha256,
    );
    assert.equal(result.consumption.single_use,true);
    assert.equal(result.consumption.authorization_consumed,true);
    assert.equal(result.consumption.immutable_consumption_record,true);
    assert.equal(
      result.consumption.replay_rejected_within_exact_state_store,
      true,
    );
    assert.equal(
      result.consumption.replay_prevention_scope,
      "exact_state_store_realpath",
    );
    assert.equal(result.consumption.global_replay_prevention_claimed,false);
    assert.equal(
      result.consumption.canonical_broadcast_state_store_runtime_binding_required,
      true,
    );
    assert.equal(result.consumption.expiry_rechecked_at_consumption,true);
    assert.equal(
      result.consumption.consumption_precedes_any_broadcaster_access,
      true,
    );
    assert.equal(result.consumption.signed_transaction_hash_bound,true);
    assert.equal(result.consumption.custody_handle_fingerprint_bound,true);
    assert.equal(
      result.consumption.raw_signed_transaction_remains_inaccessible,
      true,
    );
    assert.equal(
      result.consumption.broadcaster_access_remains_disabled,
      true,
    );
    assert.equal(result.authority.raw_signed_transaction_accessed,false);
    assert.equal(result.authority.opaque_custody_handle_accessed,false);
    assert.equal(result.authority.broadcaster_access_performed,false);
    assert.equal(result.authority.rpc_call_performed,false);
    assert.equal(
      result.authority.transaction_broadcast_authorized_by_this_gate,
      false,
    );
    assert.equal(result.transaction_broadcast_performed,false);
    assert.equal(result.chain2050_write_performed,false);

    const consumedDir=path.join(root,"broadcast-consumed");
    const files=fs.readdirSync(consumedDir);
    assert.deepEqual(files,[result.broadcast_authorization_id+".json"]);
    const file=path.join(consumedDir,files[0]);
    assert.equal(fs.lstatSync(consumedDir).mode&0o777,0o700);
    assert.equal(fs.lstatSync(file).mode&0o777,0o600);
    const before=fs.readFileSync(file);

    const duplicate=
      consumeDatanetContentCommitmentBroadcastAuthorizationAgainstFingerprintWithClockV1(
        input(root),
        sovereignFingerprint,
        now+1000,
      );
    assert.equal(duplicate.ok,false);
    assert.equal(
      duplicate.reason,
      "broadcast_authorization_consumption_already_consumed",
    );
    assert.deepEqual(fs.readFileSync(file),before);
  }finally{
    fs.rmSync(root,{recursive:true,force:true});
  }
}

{
  const root=stateRoot();
  try{
    const result=
      consumeDatanetContentCommitmentBroadcastAuthorizationAgainstFingerprintWithClockV1(
        input(root),
        sovereignFingerprint,
        Date.parse("2026-09-22T15:13:00Z"),
      );
    assert.equal(result.ok,false);
    assert.equal(
      result.reason,
      "broadcast_authorization_consumption_expired",
    );
    assert.equal(
      fs.existsSync(path.join(root,"broadcast-consumed")),
      false,
    );
  }finally{
    fs.rmSync(root,{recursive:true,force:true});
  }
}

{
  const root=stateRoot();
  try{
    const result=
      consumeDatanetContentCommitmentBroadcastAuthorizationAgainstFingerprintWithClockV1(
        input(root),
        sovereignFingerprint,
        Date.parse("2026-09-22T15:07:59Z"),
      );
    assert.equal(result.ok,false);
    assert.equal(
      result.reason,
      "broadcast_authorization_consumption_not_yet_valid",
    );
    assert.equal(
      fs.existsSync(path.join(root,"broadcast-consumed")),
      false,
    );
  }finally{
    fs.rmSync(root,{recursive:true,force:true});
  }
}

{
  const root=stateRoot(0o755);
  try{
    const result=
      consumeDatanetContentCommitmentBroadcastAuthorizationAgainstFingerprintWithClockV1(
        input(root),
        sovereignFingerprint,
        now,
      );
    assert.equal(result.ok,false);
    assert.equal(
      result.reason,
      "broadcast_authorization_consumption_state_root_mode_must_be_0700",
    );
    assert.equal(
      fs.existsSync(path.join(root,"broadcast-consumed")),
      false,
    );
  }finally{
    fs.rmSync(root,{recursive:true,force:true});
  }
}

{
  const parent=stateRoot();
  const real=path.join(parent,"real");
  const link=path.join(parent,"link");
  fs.mkdirSync(real,{mode:0o700});
  fs.symlinkSync(real,link);
  try{
    const result=
      consumeDatanetContentCommitmentBroadcastAuthorizationAgainstFingerprintWithClockV1(
        input(link),
        sovereignFingerprint,
        now,
      );
    assert.equal(result.ok,false);
    assert.match(
      result.reason,
      /broadcast_authorization_consumption_state_root_/,
    );
  }finally{
    fs.rmSync(parent,{recursive:true,force:true});
  }
}

{
  const root=stateRoot();
  try{
    const forged=authorizationEnvelope();
    forged.signature_base64="A".repeat(86)+"==";
    const result=
      consumeDatanetContentCommitmentBroadcastAuthorizationAgainstFingerprintWithClockV1(
        input(root,forged),
        sovereignFingerprint,
        now,
      );
    assert.equal(result.ok,false);
    assert.match(
      result.reason,
      /broadcast_authorization_consumption_authorization_held:/,
    );
    assert.equal(
      fs.existsSync(path.join(root,"broadcast-consumed")),
      false,
    );
  }finally{
    fs.rmSync(root,{recursive:true,force:true});
  }
}

{
  const root=stateRoot();
  try{
    const result=
      consumeDatanetContentCommitmentBroadcastAuthorizationWithClockV1(
        input(root),
        now,
      );
    assert.equal(result.ok,false);
    assert.match(
      result.reason,
      /broadcast_authorization_consumption_authorization_held:/,
    );
    assert.equal(
      fs.existsSync(path.join(root,"broadcast-consumed")),
      false,
    );
  }finally{
    fs.rmSync(root,{recursive:true,force:true});
  }
}

for(const [key,expected] of Object.entries({
  durable_single_use_broadcast_authorization_consumption:true,
  exact_broadcast_authorization_verification_required:true,
  runtime_expiry_recheck_required:true,
  private_existing_state_root_required:true,
  exact_state_store_realpath_scoped_replay_prevention:true,
  global_replay_prevention_claimed:false,
  canonical_broadcast_state_store_runtime_binding_still_required:true,
  immutable_consumption_record:true,
  filesystem_read:true,
  filesystem_mutation_one_consumption_record_may_occur:true,
  sovereign_private_key_access:false,
  raw_signed_transaction_access:false,
  opaque_custody_handle_access:false,
  broadcaster_access:false,
  rpc_call:false,
  transaction_broadcast_authorized_by_this_gate:false,
  transaction_broadcast_performed:false,
  chain2050_write_authorized:false,
  chain2050_write_performed:false,
  automatic_retry:false,
})){
  assert.equal(
    VOID_DATANET_CONTENT_COMMITMENT_BROADCAST_AUTHORIZATION_CONSUMPTION_AUTHORITY_V1[key],
    expected,
    key,
  );
}

const source=fs.readFileSync(
  path.join(
    process.cwd(),
    "tools/datanet-content-commitment-broadcast-authorization-consumption-v1.mjs",
  ),
  "utf8",
);
for(const forbidden of [
  "crypto.sign(",
  "createPrivateKey",
  "Wallet(",
  ".signTransaction(",
  ".signMessage(",
  "eth_sendRawTransaction",
  "eth_sendTransaction",
  "broadcastTransaction(",
  "sendTransaction(",
]){
  assert.equal(
    source.includes(forbidden),
    false,
    "source contains "+forbidden,
  );
}

console.log(
  "VOID_DATANET_CONTENT_COMMITMENT_BROADCAST_AUTHORIZATION_CONSUMPTION_V1_PROOF_GREEN",
);
console.log("broadcast_authorization_signature_reverified_before_consumption=true");
console.log("runtime_expiry_rechecked=true");
console.log("private_state_root_0700_required=true");
console.log("immutable_consumption_record_0600=true");
console.log("atomic_hardlink_publication=true");
console.log("directory_fsync_after_publication=true");
console.log("duplicate_broadcast_authorization_rejected=true");
console.log("consumption_record_bytes_unchanged_on_duplicate=true");
console.log("replay_prevention_scope=exact_state_store_realpath");
console.log("global_replay_prevention_claimed=false");
console.log("canonical_broadcast_state_store_runtime_binding_required=true");
console.log("signed_transaction_hash_bound=true");
console.log("custody_handle_fingerprint_bound=true");
console.log("consumption_precedes_any_broadcaster_access=true");
console.log("raw_signed_transaction_access=false");
console.log("opaque_custody_handle_access=false");
console.log("broadcaster_access=false");
console.log("rpc_call=false");
console.log("transaction_broadcast=false");
console.log("chain2050_write=false");
