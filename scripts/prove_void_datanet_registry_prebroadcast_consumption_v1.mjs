#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {getCreateAddress} from "ethers";

import {
  requiredVoidDatanetRegistryDeploymentBroadcastConfirmationV1,
} from "../tools/void-datanet-registry-signed-verification-broadcast-request-v1.mjs";
import {
  VOID_DATANET_REGISTRY_PREBROADCAST_RPC_METHODS_V1,
  observeVoidDatanetRegistryPrebroadcastV1,
  validateVoidDatanetRegistryBroadcastRuntimeArtifactsV1,
  validateVoidDatanetRegistryPrebroadcastObservationV1,
} from "../tools/void-datanet-registry-prebroadcast-observer-v1.mjs";
import {
  consumeVoidDatanetRegistryBroadcastAuthorizationWithClockV1,
  VOID_DATANET_REGISTRY_SINGLE_USE_BROADCAST_AUTHORIZATION_CONSUMPTION_AUTHORITY_V1,
} from "../tools/void-datanet-registry-single-use-broadcast-authorization-consumption-v1.mjs";

function sha256(value){
  return crypto.createHash("sha256").update(value).digest("hex");
}
function canonical(value){
  if(value===null||typeof value==="string"||typeof value==="boolean") return value;
  if(typeof value==="number"&&Number.isFinite(value)) return value;
  if(Array.isArray(value)) return value.map(canonical);
  return Object.fromEntries(
    Object.keys(value).sort().map((key)=>[key,canonical(value[key])]),
  );
}
function contentId(prefix,material){
  return prefix+sha256(Buffer.from(JSON.stringify(canonical(material))));
}
function requestAndAuthorization(){
  const deployer="0x1111111111111111111111111111111111111111";
  const predicted=getCreateAddress({from:deployer,nonce:0n}).toLowerCase();
  const summary={
    transaction_type:2,
    chain_id:"2050",
    nonce:"0",
    from_address:deployer,
    to_address:null,
    value_wei:"0",
    gas_limit:"1000000",
    max_fee_per_gas_wei:"3000000000",
    max_priority_fee_per_gas_wei:"1000000000",
    predicted_contract_address:predicted,
    data_sha256:"2".repeat(64),
    data_keccak256:"0x"+"3".repeat(64),
    unsigned_transaction_hash:"0x"+"4".repeat(64),
    signed_transaction_hash:"0x"+"5".repeat(64),
    signed_serialized_transaction_sha256:"6".repeat(64),
  };
  const signedId="voiddrstx1_"+"7".repeat(64);
  const candidateId="voiddrtxc1_"+"8".repeat(64);
  const fingerprint="9".repeat(64);
  const confirmation=requiredVoidDatanetRegistryDeploymentBroadcastConfirmationV1({
    signed_transaction_id:signedId,
    signed_transaction_hash:summary.signed_transaction_hash,
    candidate_id:candidateId,
    transaction_fingerprint_sha256:fingerprint,
  });
  const requestMaterial={
    marker:"VOID_DATANET_REGISTRY_BROADCAST_AUTHORIZATION_REQUEST_V1",
    version:1,
    status:"HOLD_PENDING_EXACT_SINGLE_TRANSACTION_BROADCAST_AUTHORIZATION",
    signed_transaction_verification_id:"voiddrstv1_"+"a".repeat(64),
    signed_transaction_id:signedId,
    candidate_id:candidateId,
    signing_request_id:"voiddrsr1_"+"b".repeat(64),
    signing_authorization_id:"voiddrsa1_"+"c".repeat(64),
    consumption_record_id:"voiddrsac1_"+"d".repeat(64),
    signing_operation_id:"voiddrso1_"+"e".repeat(64),
    transaction_fingerprint_sha256:fingerprint,
    deployer_address:deployer,
    signed_at_utc:"2030-01-01T00:00:00.000Z",
    transaction_summary:summary,
    required_confirmation:confirmation,
    scope:{
      exact_single_transaction:true,
      exact_signed_transaction_only:true,
      one_submission_attempt_only:true,
      exact_contract_creation_consequence_requires_later_authorization:true,
      exact_gas_fee_spend_requires_later_authorization:true,
      additional_value_transfer_authorized:false,
      replacement_transaction_authorized:false,
      automatic_retry:false,
    },
    authority:{
      request_only:true,
      signed_transaction_bytes_output:false,
      credential_access:false,
      private_key_access:false,
      broadcaster_access:false,
      transaction_submission:false,
      transaction_broadcast_authorized:false,
      transaction_broadcast_performed:false,
      deployment_authorized:false,
      deployment_performed:false,
      chain2050_write_authorized:false,
      chain2050_write_performed:false,
      validator_mutation:false,
      token_movement:false,
      funds_movement:false,
      automatic_retry:false,
    },
    broadcast_authorized:false,
    broadcast_performed:false,
    next_gate:"explicit_exact_registry_single_transaction_broadcast_authorization_v1",
  };
  const request={
    ...requestMaterial,
    broadcast_authorization_request_id:
      contentId("voiddrbar1_",requestMaterial),
  };
  const authMaterial={
    marker:"VOID_DATANET_REGISTRY_SINGLE_TRANSACTION_BROADCAST_AUTHORIZATION_V1",
    version:1,
    status:"EXACT_SINGLE_TRANSACTION_BROADCAST_AUTHORIZED_CONSUMPTION_HOLD",
    authorized_at_utc:"2030-01-01T00:00:10.000Z",
    valid_until_utc:"2030-01-01T00:05:10.000Z",
    broadcast_authorization_request_id:request.broadcast_authorization_request_id,
    signed_transaction_verification_id:request.signed_transaction_verification_id,
    signed_transaction_id:request.signed_transaction_id,
    candidate_id:request.candidate_id,
    signing_request_id:request.signing_request_id,
    signing_authorization_id:request.signing_authorization_id,
    consumption_record_id:request.consumption_record_id,
    signing_operation_id:request.signing_operation_id,
    transaction_fingerprint_sha256:request.transaction_fingerprint_sha256,
    deployer_address:request.deployer_address,
    signed_at_utc:request.signed_at_utc,
    required_confirmation:confirmation,
    transaction_summary:summary,
    authorization_scope:{
      exact_single_transaction:true,
      exact_signed_transaction_only:true,
      exact_signed_transaction_hash:true,
      signing_lineage_bound:true,
      one_submission_attempt_only:true,
      single_use:true,
      fresh_prebroadcast_observation_required:true,
      durable_consumption_before_broadcaster_access_required:true,
      runtime_expiry_recheck_before_broadcast_required:true,
      exact_contract_creation_consequence_authorized:true,
      exact_gas_fee_spend_authorized:true,
      additional_value_transfer_authorized:false,
      replacement_transaction_authorized:false,
      automatic_retry:false,
    },
    authority:{
      operation_confirmation_verified:true,
      exact_signed_transaction_broadcast_authorized:true,
      source_authorization_artifact_only:true,
      signed_transaction_bytes_access:false,
      credential_access:false,
      private_key_access:false,
      broadcaster_access:false,
      transaction_submission_performed:false,
      transaction_broadcast_performed:false,
      deployment_performed:false,
      chain2050_write_performed:false,
      validator_mutation:false,
      token_movement:false,
      funds_movement:false,
      migration_authorized:false,
      public_activation_authorized:false,
      automatic_retry:false,
    },
    broadcast_authorized:true,
    broadcast_performed:false,
    next_gate:
      "fresh_prebroadcast_observation_then_durable_single_use_broadcast_authorization_consumption_v1",
  };
  const authorization={
    ...authMaterial,
    broadcast_authorization_id:contentId("voiddrba1_",authMaterial),
  };
  return {request,authorization,summary};
}

const fixture=requestAndAuthorization();
const validated=validateVoidDatanetRegistryBroadcastRuntimeArtifactsV1({
  broadcast_request:fixture.request,
  broadcast_authorization:fixture.authorization,
});
assert.equal(
  validated.authorization.broadcast_authorization_id,
  fixture.authorization.broadcast_authorization_id,
);

function replies({
  nonce="0x0",
  predictedNonce="0x0",
  code="0x",
  balance="0xde0b6b3a7640000",
  known=null,
  receipt=null,
  baseFee="0x0",
  blockHash="0x"+"f".repeat(64),
}={}){
  return [
    "0x802",
    "0x10",
    {number:"0x10",hash:blockHash,baseFeePerGas:baseFee},
    nonce,
    predictedNonce,
    code,
    balance,
    known,
    receipt,
    nonce,
    {number:"0x10",hash:blockHash,baseFeePerGas:baseFee},
  ];
}
async function observe(options={}){
  const values=replies(options);
  let at=0;
  const result=await observeVoidDatanetRegistryPrebroadcastV1({
    rpc_url:"http://127.0.0.1:18553/",
    broadcast_request:fixture.request,
    broadcast_authorization:fixture.authorization,
    observed_at_utc:"2030-01-01T00:00:30.000Z",
    transport:async()=>values[at++],
  });
  assert.equal(
    at,
    result.ok===true?VOID_DATANET_REGISTRY_PREBROADCAST_RPC_METHODS_V1.length:at,
  );
  return result;
}

const green=await observe();
assert.equal(green.ok,true);
assert.match(green.prebroadcast_observation_id,/^voiddrpbo1_[0-9a-f]{64}$/u);
assert.equal(green.status,"FRESH_PREBROADCAST_OBSERVATION_GREEN_CONSUMPTION_HOLD");
assert.equal(green.observation.deployer_pending_nonce,"0");
assert.equal(green.observation.predicted_registry_nonce,"0");
assert.equal(green.observation.predicted_registry_code,"0x");
assert.equal(green.observation.signed_transaction_already_known,false);
assert.equal(green.observation.signed_transaction_already_receipted,false);
assert.equal(green.observation.pending_nonce_revalidated,true);
assert.equal(green.observation.observation_block_hash_revalidated,true);
assert.equal(green.freshness_seconds,120);
assert.deepEqual(
  green.rpc_methods_used,
  [...VOID_DATANET_REGISTRY_PREBROADCAST_RPC_METHODS_V1],
);
assert.equal(green.signed_transaction_bytes_accessed,false);
assert.equal(green.broadcaster_access_performed,false);
assert.equal(green.transaction_broadcast_performed,false);
validateVoidDatanetRegistryPrebroadcastObservationV1(
  green,
  {
    broadcast_request:fixture.request,
    broadcast_authorization:fixture.authorization,
  },
);

{
  const result=await observe({nonce:"0x1"});
  assert.equal(result.ok,false);
  assert.equal(result.reason,"registry_prebroadcast_deployer_nonce_changed");
}
{
  const result=await observe({predictedNonce:"0x1"});
  assert.equal(result.ok,false);
  assert.equal(result.reason,"registry_prebroadcast_predicted_address_occupied");
}
{
  const result=await observe({code:"0x6000"});
  assert.equal(result.ok,false);
  assert.equal(result.reason,"registry_prebroadcast_predicted_address_occupied");
}
{
  const result=await observe({known:{hash:fixture.summary.signed_transaction_hash}});
  assert.equal(result.ok,false);
  assert.equal(result.reason,"registry_prebroadcast_signed_transaction_already_known");
}
{
  const result=await observe({receipt:{transactionHash:fixture.summary.signed_transaction_hash}});
  assert.equal(result.ok,false);
  assert.equal(
    result.reason,
    "registry_prebroadcast_signed_transaction_already_receipted",
  );
}
{
  const result=await observe({balance:"0x0"});
  assert.equal(result.ok,false);
  assert.equal(
    result.reason,
    "registry_prebroadcast_deployer_balance_insufficient",
  );
}
{
  const result=await observe({baseFee:"0xb2d05e01"});
  assert.equal(result.ok,false);
  assert.equal(result.reason,"registry_prebroadcast_base_fee_exceeds_max_fee");
}

function stateRoot(mode=0o700){
  const root=fs.mkdtempSync(
    path.join(os.tmpdir(),"void-registry-broadcast-consumption-v1-"),
  );
  fs.chmodSync(root,mode);
  return root;
}
const consumeAt=Date.parse("2030-01-01T00:01:00.000Z");
{
  const root=stateRoot();
  try{
    const result=
      consumeVoidDatanetRegistryBroadcastAuthorizationWithClockV1(
        {
          broadcast_request:fixture.request,
          broadcast_authorization:fixture.authorization,
          prebroadcast_observation:green,
          state_dir:root,
        },
        consumeAt,
      );
    assert.equal(result.ok,true);
    assert.equal(
      result.status,
      "BROADCAST_AUTHORIZATION_CONSUMED_BROADCASTER_ACCESS_HOLD",
    );
    assert.match(result.consumption_record_id,/^voiddrbac1_[0-9a-f]{64}$/u);
    assert.match(result.broadcast_operation_id,/^voiddrbo1_[0-9a-f]{64}$/u);
    assert.equal(result.consumption.authorization_consumed,true);
    assert.equal(
      result.consumption.consumption_precedes_any_broadcaster_access,
      true,
    );
    assert.equal(result.authority.signed_transaction_bytes_accessed,false);
    assert.equal(result.authority.broadcaster_access_performed,false);
    assert.equal(result.authority.transaction_submission_performed,false);
    assert.equal(result.authority.transaction_broadcast_performed,false);
    assert.equal(result.authority.chain2050_write_performed,false);
    assert.equal(result.signed_transaction_bytes_accessed,false);
    assert.equal(result.broadcaster_access_performed,false);
    assert.equal(result.transaction_broadcast_performed,false);

    const consumedDir=path.join(root,"broadcast-consumed");
    const files=fs.readdirSync(consumedDir);
    assert.deepEqual(files,[result.broadcast_operation_id+".json"]);
    assert.equal(fs.lstatSync(consumedDir).mode&0o777,0o700);
    const recordFile=path.join(consumedDir,files[0]);
    assert.equal(fs.lstatSync(recordFile).mode&0o777,0o600);
    const before=fs.readFileSync(recordFile);

    const duplicate=
      consumeVoidDatanetRegistryBroadcastAuthorizationWithClockV1(
        {
          broadcast_request:fixture.request,
          broadcast_authorization:fixture.authorization,
          prebroadcast_observation:green,
          state_dir:root,
        },
        consumeAt+1000,
      );
    assert.equal(duplicate.ok,false);
    assert.equal(
      duplicate.reason,
      "registry_broadcast_consumption_already_consumed",
    );
    assert.deepEqual(fs.readFileSync(recordFile),before);
  }finally{
    fs.rmSync(root,{recursive:true,force:true});
  }
}
{
  const root=stateRoot();
  try{
    const result=
      consumeVoidDatanetRegistryBroadcastAuthorizationWithClockV1(
        {
          broadcast_request:fixture.request,
          broadcast_authorization:fixture.authorization,
          prebroadcast_observation:green,
          state_dir:root,
        },
        Date.parse("2030-01-01T00:03:00.000Z"),
      );
    assert.equal(result.ok,false);
    assert.equal(
      result.reason,
      "registry_broadcast_consumption_prebroadcast_expired_or_inactive",
    );
    assert.equal(fs.existsSync(path.join(root,"broadcast-consumed")),false);
  }finally{
    fs.rmSync(root,{recursive:true,force:true});
  }
}
{
  const root=stateRoot(0o755);
  try{
    const result=
      consumeVoidDatanetRegistryBroadcastAuthorizationWithClockV1(
        {
          broadcast_request:fixture.request,
          broadcast_authorization:fixture.authorization,
          prebroadcast_observation:green,
          state_dir:root,
        },
        consumeAt,
      );
    assert.equal(result.ok,false);
    assert.equal(
      result.reason,
      "registry_broadcast_consumption_state_root_mode_must_be_0700",
    );
  }finally{
    fs.rmSync(root,{recursive:true,force:true});
  }
}
{
  const bad=structuredClone(fixture.authorization);
  bad.authority.broadcaster_access=true;
  const material=structuredClone(bad);
  delete material.broadcast_authorization_id;
  bad.broadcast_authorization_id=contentId("voiddrba1_",material);
  assert.throws(
    ()=>validateVoidDatanetRegistryBroadcastRuntimeArtifactsV1({
      broadcast_request:fixture.request,
      broadcast_authorization:bad,
    }),
    /registry_prebroadcast_authorization_authority_mismatch:broadcaster_access/u,
  );
}

for(const [key,value] of Object.entries({
  durable_single_use_consumption:true,
  exact_authorization_rebuild_required:true,
  fresh_prebroadcast_observation_required:true,
  runtime_expiry_recheck_required:true,
  private_existing_state_root_required:true,
  state_store_generation_binding_required:true,
  stable_broadcast_operation_slot_required:true,
  descriptor_relative_publication:true,
  immutable_consumption_record:true,
  signed_transaction_bytes_access:false,
  broadcaster_access_authorized_by_this_gate:false,
  broadcaster_access_performed:false,
  transaction_submission_authorized_by_this_gate:false,
  transaction_submission_performed:false,
  transaction_broadcast_authorized_by_this_gate:false,
  transaction_broadcast_performed:false,
  chain2050_write_authorized:false,
  chain2050_write_performed:false,
  automatic_retry:false,
})){
  assert.equal(
    VOID_DATANET_REGISTRY_SINGLE_USE_BROADCAST_AUTHORIZATION_CONSUMPTION_AUTHORITY_V1[key],
    value,
    key,
  );
}

for(const file of [
  "ops/precision/void-datanet-registry-prebroadcast-observer-v1.mjs",
  "ops/precision/void-datanet-registry-broadcast-authorization-consumption-v1.mjs",
]){
  const source=fs.readFileSync(file,"utf8");
  for(const forbidden of [
    "--signed-transaction",
    "signed_serialized_transaction",
    "eth_sendRawTransaction",
    "eth_sendTransaction",
    "SigningKey",
    "Wallet(",
    "privateKey",
    "ssh ",
    "docker run",
    "systemctl --user start",
    "systemctl --user restart",
  ]){
    assert.equal(source.includes(forbidden),false,file+":"+forbidden);
  }
}
const observerRunner=fs.readFileSync(
  "ops/precision/void-datanet-registry-prebroadcast-observer-v1.mjs",
  "utf8",
);
assert.ok(observerRunner.includes("read_only_rpc_observation_complete="));
assert.ok(observerRunner.includes("signed_transaction_bytes_accessed=false"));
const consumeRunner=fs.readFileSync(
  "ops/precision/void-datanet-registry-broadcast-authorization-consumption-v1.mjs",
  "utf8",
);
assert.ok(consumeRunner.includes("broadcaster_access=false"));
assert.ok(consumeRunner.includes("rpc_call=false"));

console.log("VOID_DATANET_REGISTRY_PREBROADCAST_CONSUMPTION_V1_PROOF_GREEN");
console.log("fresh_prebroadcast_validity_seconds=120");
console.log("exact_read_only_rpc_method_count=11");
console.log("signed_hash_not_already_known_required=true");
console.log("signed_hash_not_already_receipted_required=true");
console.log("pending_nonce_stable_required=true");
console.log("predicted_create_address_vacant_required=true");
console.log("deployer_maximum_gas_cost_funded_required=true");
console.log("base_fee_not_above_max_fee_required=true");
console.log("durable_single_use_consumption=true");
console.log("duplicate_consumption_rejected=true");
console.log("state_store_generation_bound=true");
console.log("signed_transaction_bytes_access=false");
console.log("broadcaster_access=false");
console.log("transaction_submission=false");
console.log("transaction_broadcast=false");
console.log("chain2050_write=false");
console.log("funds_movement=false");
