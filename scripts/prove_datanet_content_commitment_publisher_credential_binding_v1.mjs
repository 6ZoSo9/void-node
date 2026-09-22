import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  computeAddress,
} from "ethers";
import {
  bindDatanetContentCommitmentPublisherCredentialV1,
  VOID_DATANET_CONTENT_COMMITMENT_PUBLISHER_CREDENTIAL_BINDING_AUTHORITY_V1,
  VOID_DATANET_CONTENT_COMMITMENT_PUBLISHER_CREDENTIAL_ID_V1,
} from "../tools/datanet-content-commitment-publisher-credential-binding-v1.mjs";

const PRIVATE_KEY="0x"+"11".repeat(32);
const PUBLISHER=computeAddress(PRIVATE_KEY).toLowerCase();
const REGISTRY="0x2222222222222222222222222222222222222222";

function preSign(overrides={}){
  return {
    ok:true,
    marker:"VOID_DATANET_CONTENT_COMMITMENT_PRE_SIGN_REVALIDATION_V1",
    version:1,
    status:"fresh_pre_sign_revalidation_green_unsigned_transaction_candidate",
    pre_sign_revalidation_id:"voiddccpsr1_"+"a".repeat(64),
    nonce_stable_across_revalidation:true,
    unsigned_transaction_candidate:{
      transaction_type:2,
      chain_id:"2050",
      nonce:"7",
      from_address:PUBLISHER,
      to_address:REGISTRY,
      value_wei:"0",
      calldata:"0x1234",
      gas_limit:"60000",
      max_fee_per_gas_wei:"2000000000",
      max_priority_fee_per_gas_wei:"1000000000",
    },
    freshness:{
      hardened_preflight_before_dynamic_binding:true,
      hardened_preflight_after_dynamic_binding:true,
      object_uncommitted_after_dynamic_binding:true,
      pending_nonce_stable:true,
      pending_nonce_rechecked_after_final_preflight:true,
      prior_observation_authorizes_signing:false,
      signer_gate_must_revalidate_again:true,
    },
    authority:{
      unsigned_transaction_candidate_materialized:true,
      signer_identity_bound:false,
      signer_access_authorized:false,
      wallet_access_authorized:false,
      transaction_signing_authorized:false,
      transaction_broadcast_authorized:false,
      chain2050_write_authorized:false,
      funds_action_authorized:false,
      automatic_retry_authorized:false,
    },
    signing_performed:false,
    signer_access_performed:false,
    wallet_access_performed:false,
    transaction_broadcast_performed:false,
    chain2050_mutation_performed:false,
    funds_action_performed:false,
    next_gate:
      "bind_exact_publisher_signer_identity_then_revalidate_immediately_before_signing",
    ...overrides,
  };
}

function withCredential(key=PRIVATE_KEY,mode=0o600){
  const root=fs.mkdtempSync(
    path.join(os.tmpdir(),"void-datanet-publisher-credential-v1-"),
  );
  fs.chmodSync(root,0o700);
  const credentialPath=path.join(
    root,
    VOID_DATANET_CONTENT_COMMITMENT_PUBLISHER_CREDENTIAL_ID_V1,
  );
  fs.writeFileSync(credentialPath,key+"\n",{mode});
  fs.chmodSync(credentialPath,mode);
  return {
    root,
    credentialPath,
    cleanup:()=>fs.rmSync(root,{recursive:true,force:true}),
  };
}

{
  const fixture=withCredential();
  try{
    const result=bindDatanetContentCommitmentPublisherCredentialV1({
      credentials_directory:fixture.root,
      pre_sign_revalidation:preSign(),
    });
    assert.equal(result.ok,true);
    if(result.ok===false)throw new Error(result.reason);
    assert.equal(
      result.status,
      "publisher_credential_identity_bound_without_signing_authority",
    );
    assert.match(result.credential_binding_id,/^voiddccpcb1_[0-9a-f]{64}$/);
    assert.equal(result.credential_id,
      VOID_DATANET_CONTENT_COMMITMENT_PUBLISHER_CREDENTIAL_ID_V1);
    assert.equal(result.publisher_address,PUBLISHER);
    assert.equal(result.binding.exact_candidate_publisher_match,true);
    assert.equal(result.binding.credential_address_derived,true);
    assert.equal(
      result.binding.upstream_pre_sign_is_not_bearer_signing_authority,
      true,
    );
    assert.equal(result.authority.credential_content_access_performed,true);
    assert.equal(result.authority.wallet_address_derivation_performed,true);
    assert.equal(result.authority.raw_private_key_output,false);
    assert.equal(result.authority.signer_object_exposed,false);
    assert.equal(result.authority.rpc_call_performed,false);
    assert.equal(result.authority.transaction_revalidation_performed,false);
    assert.equal(result.authority.transaction_signing_authorized,false);
    assert.equal(result.authority.transaction_signing_performed,false);
    assert.equal(result.authority.transaction_broadcast_authorized,false);
    assert.equal(result.authority.transaction_broadcast_performed,false);
    assert.equal(result.authority.chain2050_write_authorized,false);
    assert.equal(result.authority.chain2050_write_performed,false);
    assert.equal(result.signing_performed,false);
    assert.equal(result.transaction_broadcast_performed,false);
    assert.equal(result.chain2050_write_performed,false);
  }finally{
    fixture.cleanup();
  }
}

{
  const fixture=withCredential("0x"+"22".repeat(32));
  try{
    const result=bindDatanetContentCommitmentPublisherCredentialV1({
      credentials_directory:fixture.root,
      pre_sign_revalidation:preSign(),
    });
    assert.equal(result.ok,false);
    assert.equal(result.reason,"publisher_credential_address_mismatch");
    assert.equal(result.raw_private_key_output,false);
  }finally{
    fixture.cleanup();
  }
}

{
  const fixture=withCredential(PRIVATE_KEY,0o644);
  try{
    const result=bindDatanetContentCommitmentPublisherCredentialV1({
      credentials_directory:fixture.root,
      pre_sign_revalidation:preSign(),
    });
    assert.equal(result.ok,false);
    assert.equal(
      result.reason,
      "publisher_credential_permissions_out_of_policy",
    );
  }finally{
    fixture.cleanup();
  }
}

{
  const root=fs.mkdtempSync(
    path.join(os.tmpdir(),"void-datanet-publisher-symlink-v1-"),
  );
  const target=path.join(root,"target");
  const credentialPath=path.join(
    root,
    VOID_DATANET_CONTENT_COMMITMENT_PUBLISHER_CREDENTIAL_ID_V1,
  );
  fs.writeFileSync(target,PRIVATE_KEY+"\n",{mode:0o600});
  fs.symlinkSync(target,credentialPath);
  try{
    const result=bindDatanetContentCommitmentPublisherCredentialV1({
      credentials_directory:root,
      pre_sign_revalidation:preSign(),
    });
    assert.equal(result.ok,false);
    assert.equal(result.reason,"publisher_credential_symlink_forbidden");
  }finally{
    fs.rmSync(root,{recursive:true,force:true});
  }
}

{
  const fixture=withCredential("not-a-key");
  try{
    const result=bindDatanetContentCommitmentPublisherCredentialV1({
      credentials_directory:fixture.root,
      pre_sign_revalidation:preSign(),
    });
    assert.equal(result.ok,false);
    assert.equal(
      result.reason,
      "publisher_credential_private_key_shape_invalid",
    );
  }finally{
    fixture.cleanup();
  }
}

{
  const result=bindDatanetContentCommitmentPublisherCredentialV1({
    credentials_directory:"relative/path",
    pre_sign_revalidation:preSign(),
  });
  assert.equal(result.ok,false);
  assert.equal(
    result.reason,
    "publisher_credential_directory_must_be_absolute",
  );
}

for(const bad of [
  {marker:"FORGED"},
  {nonce_stable_across_revalidation:false},
  {freshness:{
    ...preSign().freshness,
    pending_nonce_rechecked_after_final_preflight:false,
  }},
  {authority:{
    ...preSign().authority,
    transaction_signing_authorized:true,
  }},
  {signing_performed:true},
]){
  const result=bindDatanetContentCommitmentPublisherCredentialV1({
    credentials_directory:"/definitely/not/read",
    pre_sign_revalidation:preSign(bad),
  });
  assert.equal(result.ok,false);
  assert.match(result.reason,/publisher_credential_/);
  assert.notEqual(result.reason,"publisher_credential_missing_or_unreadable");
}

for(const [key,expected] of Object.entries({
  identity_binding_only:true,
  fixed_systemd_credential_id:true,
  arbitrary_credential_path:false,
  credential_content_access:true,
  wallet_address_derivation:true,
  raw_private_key_output:false,
  signer_object_exposed:false,
  rpc_call:false,
  transaction_revalidation:false,
  transaction_signing_authorized:false,
  transaction_signing_performed:false,
  transaction_broadcast_authorized:false,
  transaction_broadcast_performed:false,
  chain2050_write_authorized:false,
  chain2050_write_performed:false,
  validator_mutation:false,
  governance_mutation:false,
  work_credit_mutation:false,
  service_action:false,
  funds_action:false,
  automatic_retry:false,
})){
  assert.equal(
    VOID_DATANET_CONTENT_COMMITMENT_PUBLISHER_CREDENTIAL_BINDING_AUTHORITY_V1[key],
    expected,
    key,
  );
}

const source=fs.readFileSync(
  path.join(
    process.cwd(),
    "tools/datanet-content-commitment-publisher-credential-binding-v1.mjs",
  ),
  "utf8",
);
for(const forbidden of [
  ".signTransaction(",
  ".signMessage(",
  "new Wallet(",
  "Wallet(",
  "JsonRpcProvider",
  "\"eth_sendRawTransaction\"",
  "\"eth_sendTransaction\"",
  "broadcastTransaction(",
  "sendTransaction(",
  "http.request(",
  "https.request(",
  "fetch(",
]){
  assert.equal(source.includes(forbidden),false,"source contains "+forbidden);
}

console.log(
  "VOID_DATANET_CONTENT_COMMITMENT_PUBLISHER_CREDENTIAL_BINDING_V1_PROOF_GREEN",
);
console.log("fixed_systemd_credential_id=true");
console.log("exact_candidate_publisher_match=true");
console.log("credential_address_derivation_only=true");
console.log("credential_permissions_fail_closed=true");
console.log("credential_symlink_rejected=true");
console.log("wrong_credential_address_rejected=true");
console.log("forged_upstream_authority_rejected_before_credential_read=true");
console.log("raw_private_key_output=false");
console.log("signer_object_exposed=false");
console.log("rpc_call=false");
console.log("transaction_revalidation=false");
console.log("signing=false");
console.log("transaction_broadcast=false");
console.log("chain2050_write=false");
