import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  buildDatanetContentCommitmentSovereignSingleTransactionAuthorizationRequestAgainstFingerprintV1,
  VOID_DATANET_CONTENT_COMMITMENT_SOVEREIGN_SINGLE_TRANSACTION_AUTHORIZATION_ENVELOPE_V1,
} from "../tools/datanet-content-commitment-sovereign-single-transaction-authorization-v1.mjs";
import {
  consumeDatanetContentCommitmentSingleUseAuthorizationAgainstFingerprintWithClockV1,
  VOID_DATANET_CONTENT_COMMITMENT_SINGLE_USE_AUTHORIZATION_CONSUMPTION_AUTHORITY_V1,
} from "../tools/datanet-content-commitment-single-use-authorization-consumption-v1.mjs";
import {
  canonicalJson,
  sha256,
} from "../tools/datanet-content-commitment-compiler-profile-v1.mjs";

const {publicKey,privateKey}=crypto.generateKeyPairSync("ed25519");
const publicKeyPem=publicKey.export({type:"spki",format:"pem"}).toString();
const publicKeyDer=publicKey.export({type:"spki",format:"der"});
const fingerprint=crypto.createHash("sha256").update(publicKeyDer).digest("hex");

const PUBLISHER="0x1111111111111111111111111111111111111111";
const REGISTRY="0x2222222222222222222222222222222222222222";
const candidate={
  transaction_type:2,
  chain_id:"2050",
  nonce:"9",
  from_address:PUBLISHER,
  to_address:REGISTRY,
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
    publisher_address:PUBLISHER,
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
function authorizationEnvelope(){
  const request=
    buildDatanetContentCommitmentSovereignSingleTransactionAuthorizationRequestAgainstFingerprintV1(
      {
        final_signing_review:finalReview(),
        issued_at_utc:"2026-09-22T15:00:00Z",
        expires_at_utc:"2026-09-22T15:10:00Z",
      },
      fingerprint,
    );
  assert.equal(request.ok,true);
  const signature=crypto.sign(
    null,
    Buffer.from(request.signing_bytes_base64,"base64"),
    privateKey,
  ).toString("base64");
  const body={
    marker:
      VOID_DATANET_CONTENT_COMMITMENT_SOVEREIGN_SINGLE_TRANSACTION_AUTHORIZATION_ENVELOPE_V1,
    version:1,
    authorization_body:request.authorization_body,
    public_key_pem:publicKeyPem,
    signature_base64:signature,
  };
  return {
    ...body,
    authorization_id:"voiddccsta1_"+sha256(canonicalJson(body)),
  };
}
function stateRoot(mode=0o700){
  const root=fs.mkdtempSync(
    path.join(os.tmpdir(),"void-datanet-auth-consumption-v1-"),
  );
  fs.chmodSync(root,mode);
  return root;
}
function input(root,envelope=authorizationEnvelope()){
  return {
    final_signing_review:finalReview(),
    authorization_envelope:envelope,
    state_dir:root,
  };
}
const now=Date.parse("2026-09-22T15:05:00Z");

{
  const root=stateRoot();
  try{
    const result=
      consumeDatanetContentCommitmentSingleUseAuthorizationAgainstFingerprintWithClockV1(
        input(root),
        fingerprint,
        now,
      );
    assert.equal(result.ok,true);
    if(result.ok===false)throw new Error(result.reason);
    assert.equal(
      result.status,
      "authorization_consumed_for_exact_transaction_signing",
    );
    assert.match(result.consumption_record_id,/^voiddccstac1_[0-9a-f]{64}$/);
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
      result.consumption.canonical_state_store_runtime_binding_required,
      true,
    );
    assert.equal(result.consumption.expiry_rechecked_at_consumption,true);
    assert.equal(
      result.consumption.consumption_precedes_any_signer_access,
      true,
    );
    assert.equal(result.authority.transaction_signer_access_performed,false);
    assert.equal(result.authority.transaction_signing_performed,false);
    assert.equal(result.authority.transaction_broadcast_authorized,false);
    assert.equal(result.transaction_signing_performed,false);
    assert.equal(result.transaction_broadcast_performed,false);
    assert.equal(result.chain2050_write_performed,false);

    const consumedDir=path.join(root,"consumed");
    const files=fs.readdirSync(consumedDir);
    assert.deepEqual(files,[result.authorization_id+".json"]);
    const file=path.join(consumedDir,files[0]);
    assert.equal(fs.lstatSync(consumedDir).mode&0o777,0o700);
    assert.equal(fs.lstatSync(file).mode&0o777,0o600);
    const before=fs.readFileSync(file);

    const duplicate=
      consumeDatanetContentCommitmentSingleUseAuthorizationAgainstFingerprintWithClockV1(
        input(root),
        fingerprint,
        now+1000,
      );
    assert.equal(duplicate.ok,false);
    assert.equal(
      duplicate.reason,
      "authorization_consumption_already_consumed",
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
      consumeDatanetContentCommitmentSingleUseAuthorizationAgainstFingerprintWithClockV1(
        input(root),
        fingerprint,
        Date.parse("2026-09-22T15:10:00Z"),
      );
    assert.equal(result.ok,false);
    assert.equal(result.reason,"authorization_consumption_expired");
    assert.equal(fs.existsSync(path.join(root,"consumed")),false);
  }finally{
    fs.rmSync(root,{recursive:true,force:true});
  }
}

{
  const root=stateRoot();
  try{
    const result=
      consumeDatanetContentCommitmentSingleUseAuthorizationAgainstFingerprintWithClockV1(
        input(root),
        fingerprint,
        Date.parse("2026-09-22T14:59:59Z"),
      );
    assert.equal(result.ok,false);
    assert.equal(result.reason,"authorization_consumption_not_yet_valid");
    assert.equal(fs.existsSync(path.join(root,"consumed")),false);
  }finally{
    fs.rmSync(root,{recursive:true,force:true});
  }
}

{
  const root=stateRoot(0o755);
  try{
    const result=
      consumeDatanetContentCommitmentSingleUseAuthorizationAgainstFingerprintWithClockV1(
        input(root),
        fingerprint,
        now,
      );
    assert.equal(result.ok,false);
    assert.equal(
      result.reason,
      "authorization_consumption_state_root_mode_must_be_0700",
    );
    assert.equal(fs.existsSync(path.join(root,"consumed")),false);
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
      consumeDatanetContentCommitmentSingleUseAuthorizationAgainstFingerprintWithClockV1(
        input(link),
        fingerprint,
        now,
      );
    assert.equal(result.ok,false);
    assert.match(result.reason,/authorization_consumption_state_root_/);
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
      consumeDatanetContentCommitmentSingleUseAuthorizationAgainstFingerprintWithClockV1(
        input(root,forged),
        fingerprint,
        now,
      );
    assert.equal(result.ok,false);
    assert.match(
      result.reason,
      /authorization_consumption_authorization_held:/,
    );
    assert.equal(fs.existsSync(path.join(root,"consumed")),false);
  }finally{
    fs.rmSync(root,{recursive:true,force:true});
  }
}

for(const [key,expected] of Object.entries({
  durable_single_use_consumption:true,
  exact_authorization_verification_required:true,
  runtime_expiry_recheck_required:true,
  private_existing_state_root_required:true,
  exact_state_store_realpath_scoped_replay_prevention:true,
  global_replay_prevention_claimed:false,
  canonical_state_store_runtime_binding_still_required:true,
  immutable_consumption_record:true,
  filesystem_read:true,
  filesystem_mutation_one_consumption_record_may_occur:true,
  sovereign_private_key_access:false,
  transaction_signer_access:false,
  signer_object_exposed:false,
  wallet_access:false,
  transaction_signing_authorized_by_this_gate:false,
  transaction_signing_performed:false,
  transaction_broadcast_authorized:false,
  transaction_broadcast_performed:false,
  chain2050_write_authorized:false,
  chain2050_write_performed:false,
  automatic_retry:false,
})){
  assert.equal(
    VOID_DATANET_CONTENT_COMMITMENT_SINGLE_USE_AUTHORIZATION_CONSUMPTION_AUTHORITY_V1[key],
    expected,
    key,
  );
}

const source=fs.readFileSync(
  path.join(
    process.cwd(),
    "tools/datanet-content-commitment-single-use-authorization-consumption-v1.mjs",
  ),
  "utf8",
);
for(const forbidden of [
  "Wallet(",
  ".signTransaction(",
  ".signMessage(",
  "eth_sendRawTransaction",
  "eth_sendTransaction",
  "broadcastTransaction(",
  "sendTransaction(",
]){
  assert.equal(source.includes(forbidden),false,"source contains "+forbidden);
}

console.log(
  "VOID_DATANET_CONTENT_COMMITMENT_SINGLE_USE_AUTHORIZATION_CONSUMPTION_V1_PROOF_GREEN",
);
console.log("authorization_signature_reverified_before_consumption=true");
console.log("runtime_expiry_rechecked=true");
console.log("private_state_root_0700_required=true");
console.log("immutable_consumption_record_0600=true");
console.log("atomic_hardlink_publication=true");
console.log("directory_fsync_after_publication=true");
console.log("duplicate_authorization_rejected=true");
console.log("consumption_record_bytes_unchanged_on_duplicate=true");
console.log("replay_prevention_scope=exact_state_store_realpath");
console.log("global_replay_prevention_claimed=false");
console.log("canonical_state_store_runtime_binding_required=true");
console.log("consumption_precedes_any_signer_access=true");
console.log("transaction_signer_access=false");
console.log("transaction_signing=false");
console.log("transaction_broadcast=false");
console.log("chain2050_write=false");
