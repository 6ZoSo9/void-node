#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  submitVoidDatanetRegistryExactSingleBroadcastWithDependenciesV1,
} from "../tools/void-datanet-registry-exact-single-broadcast-execution-v1.mjs";
import {
  voidDatanetRegistryBroadcastOperationIdV1,
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
function canonicalJson(value){
  return JSON.stringify(canonical(value));
}

const sandbox=fs.mkdtempSync(
  path.join(os.tmpdir(),"void-datanet-send-generation-v1-"),
);
fs.chmodSync(sandbox,0o700);
const stateRoot=path.join(sandbox,"state");
const replacementRoot=path.join(sandbox,"replacement");
const displacedRoot=path.join(sandbox,"displaced");
const guardRoot=path.join(sandbox,"external-send-guards");
for(const directory of [stateRoot,replacementRoot,guardRoot]){
  fs.mkdirSync(directory,{mode:0o700});
  fs.chmodSync(directory,0o700);
}

const now=Date.parse("2030-01-01T00:00:30.000Z");
const request={
  broadcast_authorization_request_id:"voiddrbar1_"+"1".repeat(64),
};
const transactionSummary={
  transaction_type:2,
  chain_id:"2050",
  nonce:"0",
  from_address:"0x"+"2".repeat(40),
  to_address:null,
  value_wei:"0",
  gas_limit:"846479",
  max_fee_per_gas_wei:"0",
  max_priority_fee_per_gas_wei:"0",
  predicted_contract_address:"0x"+"3".repeat(40),
  data_sha256:"4".repeat(64),
  data_keccak256:"0x"+"5".repeat(64),
  unsigned_transaction_hash:"0x"+"6".repeat(64),
  signed_transaction_hash:"0x"+"7".repeat(64),
  signed_serialized_transaction_sha256:"8".repeat(64),
};
const authorization={
  broadcast_authorization_id:"voiddrba1_"+"9".repeat(64),
  broadcast_authorization_request_id:
    request.broadcast_authorization_request_id,
  signed_transaction_id:"voiddrstx1_"+"a".repeat(64),
  candidate_id:"voiddrtxc1_"+"b".repeat(64),
  transaction_fingerprint_sha256:"c".repeat(64),
  deployer_address:transactionSummary.from_address,
  signed_at_utc:"2030-01-01T00:00:00.000Z",
  authorized_at_utc:"2030-01-01T00:00:10.000Z",
  valid_until_utc:"2030-01-01T00:05:00.000Z",
  transaction_summary:transactionSummary,
  required_confirmation:
    "authorizeDatanetRegistryDeploymentBroadcastV1:test",
};
const observation={
  prebroadcast_observation_id:"voiddrpbo1_"+"d".repeat(64),
  broadcast_authorization_id:
    authorization.broadcast_authorization_id,
  signed_transaction_id:authorization.signed_transaction_id,
  signed_transaction_hash:transactionSummary.signed_transaction_hash,
  observed_at_utc:"2030-01-01T00:00:20.000Z",
  valid_until_utc:"2030-01-01T00:02:20.000Z",
};
const signed={
  signed_transaction_id:authorization.signed_transaction_id,
  signed_transaction_hash:transactionSummary.signed_transaction_hash,
  candidate_id:authorization.candidate_id,
  transaction_fingerprint_sha256:
    authorization.transaction_fingerprint_sha256,
  signed_serialized_transaction:"0x02deadbeef",
};

const operationId=
  voidDatanetRegistryBroadcastOperationIdV1(authorization);

function consumptionRecordFor(directory,canonicalPath){
  const stat=fs.lstatSync(directory,{bigint:true});
  const material={
    marker:
      "VOID_DATANET_REGISTRY_SINGLE_USE_BROADCAST_AUTHORIZATION_CONSUMPTION_V1",
    version:1,
    status:"BROADCAST_AUTHORIZATION_CONSUMED_BROADCASTER_ACCESS_HOLD",
    broadcast_operation_id:operationId,
    broadcast_authorization_id:
      authorization.broadcast_authorization_id,
    broadcast_authorization_request_id:
      authorization.broadcast_authorization_request_id,
    prebroadcast_observation_id:
      observation.prebroadcast_observation_id,
    signed_transaction_id:authorization.signed_transaction_id,
    signed_transaction_hash:transactionSummary.signed_transaction_hash,
    candidate_id:authorization.candidate_id,
    transaction_fingerprint_sha256:
      authorization.transaction_fingerprint_sha256,
    authorized_at_utc:authorization.authorized_at_utc,
    authorization_valid_until_utc:authorization.valid_until_utc,
    observed_at_utc:observation.observed_at_utc,
    observation_valid_until_utc:observation.valid_until_utc,
    consumed_at_utc:"2030-01-01T00:00:25.000Z",
    state_store_realpath_sha256:sha256(canonicalPath),
    state_store_root_dev:String(stat.dev),
    state_store_root_ino:String(stat.ino),
    transaction_summary:transactionSummary,
    consumption:{
      exact_single_transaction:true,
      exact_signed_transaction_only:true,
      one_submission_attempt_only:true,
      single_use:true,
      authorization_consumed:true,
      immutable_consumption_record:true,
      stable_broadcast_operation_slot:true,
      state_store_generation_bound:true,
      descriptor_relative_publication:true,
      replay_rejected_within_exact_state_store_generation:true,
      replay_prevention_scope:
        "exact_state_store_generation_and_broadcast_operation",
      global_replay_prevention_claimed:false,
      authorization_expiry_rechecked_at_entry:true,
      authorization_expiry_rechecked_before_publication:true,
      prebroadcast_freshness_rechecked_at_entry:true,
      prebroadcast_freshness_rechecked_before_publication:true,
      consumption_precedes_any_broadcaster_access:true,
      signed_transaction_hash_bound:true,
    },
    authority:{
      filesystem_mutation_performed:true,
      signed_transaction_bytes_accessed:false,
      credential_access_performed:false,
      private_key_access_performed:false,
      broadcaster_access_authorized_by_this_gate:false,
      broadcaster_access_performed:false,
      rpc_call_performed:false,
      transaction_submission_authorized_by_this_gate:false,
      transaction_submission_performed:false,
      transaction_broadcast_authorized_by_this_gate:false,
      transaction_broadcast_performed:false,
      deployment_authorized:false,
      deployment_performed:false,
      chain2050_write_authorized:false,
      chain2050_write_performed:false,
      validator_mutation:false,
      token_movement:false,
      funds_movement:false,
      migration_authorized:false,
      public_activation_authorized:false,
      automatic_retry:false,
    },
    next_gate:
      "exact_single_attempt_registry_broadcast_execution_after_consumption_v1",
  };
  return {
    ...material,
    consumption_record_id:
      "voiddrbac1_"+sha256(Buffer.from(canonicalJson(material))),
  };
}

function installConsumption(directory,canonicalPath){
  const consumed=path.join(directory,"broadcast-consumed");
  fs.mkdirSync(consumed,{mode:0o700});
  fs.chmodSync(consumed,0o700);
  const record=consumptionRecordFor(directory,canonicalPath);
  const file=path.join(consumed,operationId+".json");
  fs.writeFileSync(file,JSON.stringify(record,null,2)+"\n",{mode:0o600});
  fs.chmodSync(file,0o600);
  return record;
}

installConsumption(stateRoot,stateRoot);
installConsumption(replacementRoot,stateRoot);

let sendCount=0;
let swapCount=0;
const rpc=async (method)=>{
  if(method==="eth_sendRawTransaction"){
    sendCount+=1;
    return transactionSummary.signed_transaction_hash;
  }
  if(method==="eth_getTransactionByHash"){
    return {hash:transactionSummary.signed_transaction_hash};
  }
  if(method==="eth_getTransactionReceipt") return null;
  if(method==="eth_getCode") return "0x";
  if(method==="eth_getTransactionCount") return "0x1";
  throw new Error("unexpected_rpc_method:"+method);
};
const baseDependencies={
  validate_runtime:()=>({request,authorization}),
  validate_observation:()=>observation,
  validate_signed_transaction:()=>signed,
  now:()=>now,
  rpc,
  test_only_guard_root:guardRoot,
};

try{
  const first=
    await submitVoidDatanetRegistryExactSingleBroadcastWithDependenciesV1(
      {
        broadcast_request:request,
        broadcast_authorization:authorization,
        prebroadcast_observation:observation,
        signed_transaction:signed,
        state_dir:stateRoot,
        confirmation:authorization.required_confirmation,
      },
      {
        ...baseDependencies,
        test_only_after_send_guard_before_rpc:async ({
          state_root,
          send_guard_file,
          send_guard_id,
          broadcast_operation_id,
        })=>{
          assert.equal(state_root,stateRoot);
          assert.equal(broadcast_operation_id,operationId);
          assert.ok(/^voiddrbsg1_[0-9a-f]{64}$/u.test(send_guard_id));
          assert.equal(fs.existsSync(send_guard_file),true);
          swapCount+=1;
          fs.renameSync(stateRoot,displacedRoot);
          fs.renameSync(replacementRoot,stateRoot);
        },
      },
    );

  assert.equal(first.ok,true);
  assert.equal(first.rpc_send_invocation_count,1);
  assert.equal(first.transaction_submission_performed,true);
  assert.equal(first.transaction_broadcast_performed,true);
  assert.equal(sendCount,1);
  assert.equal(swapCount,1);
  assert.ok(/^voiddrbsg1_[0-9a-f]{64}$/u.test(first.send_guard_id));

  const guardFiles=fs.readdirSync(guardRoot).sort();
  assert.deepEqual(guardFiles,[operationId+".json"]);
  const guard=JSON.parse(
    fs.readFileSync(path.join(guardRoot,guardFiles[0]),"utf8"),
  );
  assert.equal(
    guard.status,
    "SINGLE_BROADCAST_SEND_GUARD_DURABLE_OUTSIDE_STATE_ROOT",
  );
  assert.equal(guard.broadcast_operation_id,operationId);
  assert.equal(guard.send_guard_id,first.send_guard_id);
  assert.equal(guard.one_submission_attempt_only,true);
  assert.equal(guard.automatic_retry_authorized,false);
  assert.equal(guard.replacement_transaction_authorized,false);

  assert.equal(
    fs.existsSync(path.join(stateRoot,"broadcast-attempts",operationId+".result.json")),
    false,
    "replacement visible state root must not receive original attempt result",
  );
  assert.equal(
    fs.existsSync(
      path.join(displacedRoot,"broadcast-attempts",operationId+".intent.json"),
    ),
    true,
    "validated original generation must retain durable intent after rename",
  );
  assert.equal(
    fs.existsSync(
      path.join(displacedRoot,"broadcast-attempts",operationId+".result.json"),
    ),
    true,
    "validated original generation must receive terminal result through pinned fd",
  );

  const second=
    await submitVoidDatanetRegistryExactSingleBroadcastWithDependenciesV1(
      {
        broadcast_request:request,
        broadcast_authorization:authorization,
        prebroadcast_observation:observation,
        signed_transaction:signed,
        state_dir:stateRoot,
        confirmation:authorization.required_confirmation,
      },
      baseDependencies,
    );

  assert.equal(second.ok,false);
  assert.equal(
    second.reason,
    "registry_broadcast_execution_send_guard_already_recorded",
  );
  assert.equal(second.rpc_send_invocation_count,0);
  assert.equal(second.transaction_submission_performed,false);
  assert.equal(second.transaction_broadcast_performed,false);
  assert.equal(sendCount,1);

  const replacementAttempts=path.join(stateRoot,"broadcast-attempts");
  assert.equal(fs.existsSync(replacementAttempts),true);
  assert.equal(
    fs.existsSync(path.join(replacementAttempts,operationId+".intent.json")),
    true,
    "replacement generation may record a local spent intent before external guard HOLD",
  );
  assert.equal(
    fs.existsSync(path.join(replacementAttempts,operationId+".result.json")),
    false,
    "replacement generation must never record a send result",
  );

  const tool=fs.readFileSync(
    "tools/void-datanet-registry-exact-single-broadcast-execution-v1.mjs",
    "utf8",
  );
  for(const required of [
    "SINGLE_BROADCAST_SEND_GUARD_DURABLE_OUTSIDE_STATE_ROOT",
    "registry_broadcast_execution_send_guard_already_recorded",
    "registry_broadcast_execution_send_guard_inside_state_root",
    "readPinnedPrivateJson(intentFile)",
    'const attemptsPinned="/proc/self/fd/"+String(attemptsFd)',
    "production_guard_root:true",
  ]){
    assert.ok(tool.includes(required),required);
  }
  for(const forbidden of [
    "eth_sendTransaction",
    "automatic_retry_authorized:true",
    "replacement_transaction_authorized:true",
  ]){
    assert.equal(tool.includes(forbidden),false,forbidden);
  }

  console.log(
    "VOID_DATANET_REGISTRY_BROADCAST_SEND_GENERATION_SERIALIZATION_V1_PROOF_GREEN",
  );
  console.log("root_replaced_after_final_generation_check=true");
  console.log("first_send_count=1");
  console.log("replacement_generation_additional_send_count=0");
  console.log("external_operation_guard_survives_root_replacement=true");
  console.log("original_attempt_store_descriptor_pinned_through_send=true");
  console.log("replacement_root_does_not_receive_original_result=true");
  console.log("duplicate_operation_guard_hold=true");
  console.log("automatic_retry=false");
  console.log("replacement_transaction=false");
  console.log("real_rpc=false");
  console.log("private_key_access=false");
  console.log("funds_movement=false");
}finally{
  fs.rmSync(sandbox,{recursive:true,force:true});
}
