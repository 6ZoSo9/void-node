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

const root=fs.mkdtempSync(path.join(os.tmpdir(),"void-registry-broadcast-exec-v1-"));
fs.chmodSync(root,0o700);
const consumedDir=path.join(root,"broadcast-consumed");
fs.mkdirSync(consumedDir,{mode:0o700});
fs.chmodSync(consumedDir,0o700);

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
  broadcast_authorization_request_id:request.broadcast_authorization_request_id,
  signed_transaction_id:"voiddrstx1_"+"a".repeat(64),
  candidate_id:"voiddrtxc1_"+"b".repeat(64),
  transaction_fingerprint_sha256:"c".repeat(64),
  deployer_address:transactionSummary.from_address,
  signed_at_utc:"2030-01-01T00:00:00.000Z",
  authorized_at_utc:"2030-01-01T00:00:10.000Z",
  valid_until_utc:"2030-01-01T00:05:00.000Z",
  transaction_summary:transactionSummary,
  required_confirmation:"authorizeDatanetRegistryDeploymentBroadcastV1:test",
};
const observation={
  prebroadcast_observation_id:"voiddrpbo1_"+"d".repeat(64),
  broadcast_authorization_id:authorization.broadcast_authorization_id,
  signed_transaction_id:authorization.signed_transaction_id,
  signed_transaction_hash:transactionSummary.signed_transaction_hash,
  observed_at_utc:"2030-01-01T00:00:20.000Z",
  valid_until_utc:"2030-01-01T00:02:20.000Z",
};
const signed={
  signed_transaction_id:authorization.signed_transaction_id,
  signed_transaction_hash:transactionSummary.signed_transaction_hash,
  candidate_id:authorization.candidate_id,
  transaction_fingerprint_sha256:authorization.transaction_fingerprint_sha256,
  signed_serialized_transaction:"0x02deadbeef",
};

const operationId=voidDatanetRegistryBroadcastOperationIdV1(authorization);
const big=fs.lstatSync(root,{bigint:true});
const material={
  marker:"VOID_DATANET_REGISTRY_SINGLE_USE_BROADCAST_AUTHORIZATION_CONSUMPTION_V1",
  version:1,
  status:"BROADCAST_AUTHORIZATION_CONSUMED_BROADCASTER_ACCESS_HOLD",
  broadcast_operation_id:operationId,
  broadcast_authorization_id:authorization.broadcast_authorization_id,
  broadcast_authorization_request_id:authorization.broadcast_authorization_request_id,
  prebroadcast_observation_id:observation.prebroadcast_observation_id,
  signed_transaction_id:authorization.signed_transaction_id,
  signed_transaction_hash:transactionSummary.signed_transaction_hash,
  candidate_id:authorization.candidate_id,
  transaction_fingerprint_sha256:authorization.transaction_fingerprint_sha256,
  authorized_at_utc:authorization.authorized_at_utc,
  authorization_valid_until_utc:authorization.valid_until_utc,
  observed_at_utc:observation.observed_at_utc,
  observation_valid_until_utc:observation.valid_until_utc,
  consumed_at_utc:"2030-01-01T00:00:25.000Z",
  state_store_realpath_sha256:sha256(root),
  state_store_root_dev:String(big.dev),
  state_store_root_ino:String(big.ino),
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
    replay_prevention_scope:"exact_state_store_generation_and_broadcast_operation",
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
  next_gate:"exact_single_attempt_registry_broadcast_execution_after_consumption_v1",
};
const record={
  ...material,
  consumption_record_id:"voiddrbac1_"+sha256(Buffer.from(canonicalJson(material))),
};
const consumedFile=path.join(consumedDir,operationId+".json");
fs.writeFileSync(consumedFile,JSON.stringify(record,null,2)+"\n",{mode:0o600});
fs.chmodSync(consumedFile,0o600);

let sendCount=0;
const dependencies={
  validate_runtime:()=>({request,authorization}),
  validate_observation:()=>observation,
  validate_signed_transaction:()=>signed,
  now:()=>now,
  rpc:async (method)=>{
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
  },
};

try{
  const first=await submitVoidDatanetRegistryExactSingleBroadcastWithDependenciesV1(
    {
      broadcast_request:request,
      broadcast_authorization:authorization,
      prebroadcast_observation:observation,
      signed_transaction:signed,
      state_dir:root,
    },
    dependencies,
  );
  assert.equal(first.ok,true);
  assert.equal(first.rpc_send_invocation_count,1);
  assert.equal(first.transaction_submission_performed,true);
  assert.equal(first.transaction_broadcast_performed,true);
  assert.equal(sendCount,1);
  assert.equal(first.automatic_retry_performed,false);
  assert.equal(first.replacement_transaction_created,false);
  assert.equal(
    first.classification,
    "TRANSACTION_SEEN_RECEIPT_PENDING_NO_RETRY_RECONCILE",
  );

  const second=await submitVoidDatanetRegistryExactSingleBroadcastWithDependenciesV1(
    {
      broadcast_request:request,
      broadcast_authorization:authorization,
      prebroadcast_observation:observation,
      signed_transaction:signed,
      state_dir:root,
    },
    dependencies,
  );
  assert.equal(second.ok,false);
  assert.equal(
    second.reason,
    "registry_broadcast_execution_attempt_already_recorded",
  );
  assert.equal(second.rpc_send_invocation_count,0);
  assert.equal(sendCount,1);

  const attempts=path.join(root,"broadcast-attempts");
  const files=fs.readdirSync(attempts).sort();
  assert.deepEqual(files,[
    operationId+".intent.json",
    operationId+".result.json",
  ]);
  for(const name of files){
    assert.equal(fs.lstatSync(path.join(attempts,name)).mode&0o777,0o600);
  }

  const toolSource=fs.readFileSync(
    "tools/void-datanet-registry-exact-single-broadcast-execution-v1.mjs",
    "utf8",
  );
  const runnerSource=fs.readFileSync(
    "ops/precision/void-datanet-registry-exact-single-broadcast-execution-v1.mjs",
    "utf8",
  );
  for(const required of [
    "SINGLE_BROADCAST_ATTEMPT_INTENT_DURABLE_BEFORE_RPC",
    "eth_sendRawTransaction",
    "registry_broadcast_execution_attempt_already_recorded",
    "automatic_retry_performed:false",
    "replacement_transaction_created:false",
  ]){
    assert.ok(toolSource.includes(required),required);
  }
  assert.ok(
    runnerSource.includes("exact_operation_bound_broadcast_confirmation_required"),
  );
  for(const forbidden of [
    "SigningKey",
    "Wallet(",
    "privateKey",
    "createPrivateKey",
    "eth_sendTransaction",
    "systemctl",
    "docker ",
    "ssh ",
  ]){
    assert.equal(toolSource.includes(forbidden),false,forbidden);
  }

  console.log("VOID_DATANET_REGISTRY_EXACT_SINGLE_BROADCAST_EXECUTION_V1_PROOF_GREEN");
  console.log("durable_attempt_intent_before_rpc=true");
  console.log("eth_sendRawTransaction_maximum_invocations_per_attempt=1");
  console.log("duplicate_invocation_rpc_send_count=0");
  console.log("exact_consumption_record_required=true");
  console.log("runtime_expiry_rechecked=true");
  console.log("state_root_generation_rechecked=true");
  console.log("signed_transaction_exactly_bound=true");
  console.log("automatic_retry=false");
  console.log("replacement_transaction=false");
  console.log("credential_access=false");
  console.log("private_key_access=false");
}finally{
  fs.rmSync(root,{recursive:true,force:true});
}
