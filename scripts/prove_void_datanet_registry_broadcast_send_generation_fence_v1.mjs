#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  submitVoidDatanetRegistryExactSingleBroadcastV1,
  submitVoidDatanetRegistryExactSingleBroadcastWithDependenciesV1,
} from "../tools/void-datanet-registry-exact-single-broadcast-execution-v1.mjs";
import {
  voidDatanetRegistryBroadcastOperationIdV1,
} from "../tools/void-datanet-registry-single-use-broadcast-authorization-consumption-v1.mjs";

const MARKER =
  "VOID_DATANET_REGISTRY_BROADCAST_SEND_GENERATION_FENCE_V1_PROOF_GREEN";

function sha256(value){
  return crypto.createHash("sha256").update(value).digest("hex");
}
function canonical(value){
  if(value===null||typeof value==="string"||typeof value==="boolean") return value;
  if(typeof value==="number"&&Number.isFinite(value)) return value;
  if(Array.isArray(value)) return value.map(canonical);
  if(value&&typeof value==="object"){
    return Object.fromEntries(
      Object.keys(value).sort().map((key)=>[key,canonical(value[key])]),
    );
  }
  throw new Error("unsupported_canonical_value");
}
function canonicalJson(value){
  return JSON.stringify(canonical(value));
}

const parent=fs.mkdtempSync(
  path.join(os.tmpdir(),"void-registry-broadcast-generation-fence-v1-"),
);
fs.chmodSync(parent,0o700);
const root=path.join(parent,"state");
const detached=path.join(parent,"detached-state");
const legacyFenceRoot=path.join(
  parent,
  ".void-datanet-registry-broadcast-generation-fences-v1",
);
const detachedLegacyFenceRoot=path.join(parent,"detached-legacy-fence");
fs.mkdirSync(root,{mode:0o700});
fs.chmodSync(root,0o700);
fs.mkdirSync(legacyFenceRoot,{mode:0o700});
fs.chmodSync(legacyFenceRoot,0o700);

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
  required_confirmation:
    "authorizeDatanetRegistryDeploymentBroadcastV1:generation-fence-proof",
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

function writeConsumptionForRoot(targetRoot){
  const targetConsumedDir=path.join(targetRoot,"broadcast-consumed");
  fs.mkdirSync(targetConsumedDir,{mode:0o700});
  fs.chmodSync(targetConsumedDir,0o700);
  const targetBig=fs.lstatSync(targetRoot,{bigint:true});
  const material={
    marker:
      "VOID_DATANET_REGISTRY_SINGLE_USE_BROADCAST_AUTHORIZATION_CONSUMPTION_V1",
    version:1,
    status:"BROADCAST_AUTHORIZATION_CONSUMED_BROADCASTER_ACCESS_HOLD",
    broadcast_operation_id:operationId,
    broadcast_authorization_id:authorization.broadcast_authorization_id,
    broadcast_authorization_request_id:
      authorization.broadcast_authorization_request_id,
    prebroadcast_observation_id:observation.prebroadcast_observation_id,
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
    state_store_realpath_sha256:sha256(targetRoot),
    state_store_root_dev:String(targetBig.dev),
    state_store_root_ino:String(targetBig.ino),
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
  const record={
    ...material,
    consumption_record_id:
      "voiddrbac1_"+sha256(Buffer.from(canonicalJson(material))),
  };
  const targetFile=path.join(targetConsumedDir,operationId+".json");
  fs.writeFileSync(
    targetFile,
    JSON.stringify(record,null,2)+"\n",
    {mode:0o600},
  );
  fs.chmodSync(targetFile,0o600);
  return record;
}

writeConsumptionForRoot(root);

let simulatedNetworkSends=0;
let rootReplacementPerformed=false;
let replacementConsumption=null;
const externalFenceStore=new Map();

function externalFenceKey(fence){
  return fence.state_store_realpath_sha256+":"+fence.broadcast_operation_id;
}
async function claimGenerationFence(fence){
  const key=externalFenceKey(fence);
  const existing=externalFenceStore.get(key);
  if(existing){
    return Object.freeze({...existing,status:"exists"});
  }
  const claim=Object.freeze({
    status:"created",
    broadcast_generation_fence_id:fence.broadcast_generation_fence_id,
    custody_receipt_sha256:
      "sha256:"+sha256(Buffer.from("external-custody:"+canonicalJson(fence))),
    independent_custody_proven:true,
  });
  externalFenceStore.set(key,claim);
  return claim;
}
async function assertGenerationFence(claim,fence){
  const existing=externalFenceStore.get(externalFenceKey(fence));
  return (
    existing?.broadcast_generation_fence_id===
      claim.broadcast_generation_fence_id&&
    existing?.custody_receipt_sha256===claim.custody_receipt_sha256&&
    existing?.independent_custody_proven===true
  );
}

const baseDependencies={
  validate_runtime:()=>({request,authorization}),
  validate_observation:()=>observation,
  validate_signed_transaction:()=>signed,
  claim_generation_fence:claimGenerationFence,
  assert_generation_fence:assertGenerationFence,
  now:()=>now,
};

const malformedRoot=path.join(parent,"malformed-custody-state");
fs.mkdirSync(malformedRoot,{mode:0o700});
fs.chmodSync(malformedRoot,0o700);
writeConsumptionForRoot(malformedRoot);
let malformedClaimRpcCalls=0;
const malformedClaim=
  await submitVoidDatanetRegistryExactSingleBroadcastWithDependenciesV1(
    {
      broadcast_request:request,
      broadcast_authorization:authorization,
      prebroadcast_observation:observation,
      signed_transaction:signed,
      state_dir:malformedRoot,
      confirmation:authorization.required_confirmation,
    },
    {
      ...baseDependencies,
      claim_generation_fence:async()=>Object.freeze({status:"created"}),
      rpc:async()=>{
        malformedClaimRpcCalls+=1;
        throw new Error("malformed_custody_claim_must_not_reach_rpc");
      },
    },
  );
assert.equal(malformedClaim.ok,false);
assert.equal(
  malformedClaim.reason,
  "registry_broadcast_execution_generation_fence_failed",
);
assert.equal(malformedClaimRpcCalls,0);
assert.equal(
  fs.existsSync(path.join(malformedRoot,"broadcast-attempts")),
  false,
);

const revalidationRoot=path.join(parent,"revalidation-hold-state");
fs.mkdirSync(revalidationRoot,{mode:0o700});
fs.chmodSync(revalidationRoot,0o700);
writeConsumptionForRoot(revalidationRoot);
let revalidationRpcCalls=0;
const revalidationHold=
  await submitVoidDatanetRegistryExactSingleBroadcastWithDependenciesV1(
    {
      broadcast_request:request,
      broadcast_authorization:authorization,
      prebroadcast_observation:observation,
      signed_transaction:signed,
      state_dir:revalidationRoot,
      confirmation:authorization.required_confirmation,
    },
    {
      ...baseDependencies,
      claim_generation_fence:async(fence)=>Object.freeze({
        status:"created",
        broadcast_generation_fence_id:
          fence.broadcast_generation_fence_id,
        custody_receipt_sha256:
          "sha256:"+
          sha256(Buffer.from("revalidation:"+canonicalJson(fence))),
        independent_custody_proven:true,
      }),
      assert_generation_fence:async()=>false,
      rpc:async()=>{
        revalidationRpcCalls+=1;
        throw new Error("failed_custody_revalidation_must_not_reach_rpc");
      },
    },
  );
assert.equal(revalidationHold.ok,false);
assert.equal(
  revalidationHold.reason,
  "registry_broadcast_execution_final_pre_send_gate_failed",
);
assert.equal(revalidationHold.transaction_submission_performed,false);
assert.equal(revalidationRpcCalls,0);
assert.equal(
  fs.existsSync(
    path.join(
      revalidationRoot,
      "broadcast-attempts",
      operationId+".intent.json",
    ),
  ),
  true,
);

const firstDependencies={
  ...baseDependencies,
  rpc:async (method)=>{
    if(method==="eth_sendRawTransaction"){
      assert.equal(rootReplacementPerformed,false);
      fs.renameSync(root,detached);
      fs.renameSync(legacyFenceRoot,detachedLegacyFenceRoot);
      fs.mkdirSync(root,{mode:0o700});
      fs.mkdirSync(legacyFenceRoot,{mode:0o700});
      fs.chmodSync(root,0o700);
      replacementConsumption=writeConsumptionForRoot(root);
      rootReplacementPerformed=true;
      simulatedNetworkSends+=1;
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
  const first=
    await submitVoidDatanetRegistryExactSingleBroadcastWithDependenciesV1(
      {
        broadcast_request:request,
        broadcast_authorization:authorization,
        prebroadcast_observation:observation,
        signed_transaction:signed,
        state_dir:root,
        confirmation:authorization.required_confirmation,
      },
      firstDependencies,
    );

  assert.equal(rootReplacementPerformed,true);
  assert.equal(simulatedNetworkSends,1);
  assert.equal(first.ok,true);
  assert.equal(first.rpc_send_invocation_count,1);
  assert.equal(first.transaction_submission_performed,true);
  assert.equal(first.transaction_broadcast_performed,true);
  assert.equal(first.operation_fence_recorded,true);
  assert.equal(first.state_generation_descriptor_bound,true);
  assert.match(
    first.broadcast_generation_fence_id,
    /^voiddrbgf1_[0-9a-f]{64}$/u,
  );
  assert.equal(first.automatic_retry_performed,false);
  assert.equal(first.replacement_transaction_created,false);
  assert(replacementConsumption);

  assert.equal(externalFenceStore.size,1);
  const storedClaim=externalFenceStore.get(
    sha256(root)+":"+operationId,
  );
  assert(storedClaim);
  assert.equal(
    storedClaim.broadcast_generation_fence_id,
    first.broadcast_generation_fence_id,
  );
  assert.equal(first.independent_generation_custody_proven,true);
  assert.equal(
    first.generation_fence_custody_receipt_sha256,
    storedClaim.custody_receipt_sha256,
  );
  assert.equal(fs.existsSync(detachedLegacyFenceRoot),true);
  assert.equal(fs.readdirSync(legacyFenceRoot).length,0);

  const detachedAttempts=path.join(detached,"broadcast-attempts");
  assert.equal(fs.existsSync(detachedAttempts),true);
  assert.deepEqual(
    fs.readdirSync(detachedAttempts).sort(),
    [
      operationId+".intent.json",
      operationId+".result.json",
    ],
  );
  const detachedIntent=JSON.parse(
    fs.readFileSync(
      path.join(detachedAttempts,operationId+".intent.json"),
      "utf8",
    ),
  );
  assert.equal(
    detachedIntent.broadcast_generation_fence_id,
    first.broadcast_generation_fence_id,
  );
  const detachedResult=JSON.parse(
    fs.readFileSync(
      path.join(detachedAttempts,operationId+".result.json"),
      "utf8",
    ),
  );
  assert.equal(
    detachedResult.broadcast_generation_fence_id,
    first.broadcast_generation_fence_id,
  );

  assert.equal(
    fs.existsSync(path.join(root,"broadcast-attempts")),
    false,
    "replacement root must not inherit the detached attempt namespace",
  );

  let secondRpcCalls=0;
  const second=
    await submitVoidDatanetRegistryExactSingleBroadcastWithDependenciesV1(
      {
        broadcast_request:request,
        broadcast_authorization:authorization,
        prebroadcast_observation:observation,
        signed_transaction:signed,
        state_dir:root,
        confirmation:authorization.required_confirmation,
      },
      {
        ...baseDependencies,
        now:()=>now+1000,
        rpc:async ()=>{
          secondRpcCalls+=1;
          throw new Error("replacement_root_must_not_reopen_send");
        },
      },
    );
  assert.equal(second.ok,false);
  assert.equal(
    second.reason,
    "registry_broadcast_execution_attempt_already_recorded",
  );
  assert.equal(second.rpc_send_invocation_count,0);
  assert.equal(second.transaction_submission_performed,false);
  assert.equal(second.transaction_broadcast_performed,false);
  assert.equal(second.operation_fence_recorded,true);
  assert.equal(second.independent_generation_custody_proven,true);
  assert.equal(
    second.broadcast_generation_fence_id,
    first.broadcast_generation_fence_id,
  );
  assert.notEqual(
    replacementConsumption.consumption_record_id,
    consumption.consumption_record_id,
  );
  assert.equal(secondRpcCalls,0);
  assert.equal(simulatedNetworkSends,1);
  assert.equal(
    fs.existsSync(path.join(root,"broadcast-attempts")),
    false,
    "external fence must stop replacement generation before attempt-store creation",
  );

  const core=fs.readFileSync(
    "tools/void-datanet-registry-exact-single-broadcast-execution-v1.mjs",
    "utf8",
  );
  for(const required of [
    "claim_generation_fence",
    "assert_generation_fence",
    "normalizeExternalGenerationFenceClaimV1",
    "broadcast_generation_fence_id",
    "generation_fence_custody_receipt_sha256",
    "operation_fence_recorded:true",
    "independent_generation_custody_proven:true",
    "state_generation_descriptor_bound:true",
    "eth_sendRawTransaction",
    "automatic_retry_performed:false",
    "replacement_transaction_created:false",
  ]){
    assert.ok(core.includes(required),required);
  }
  assert.doesNotMatch(core,/GENERATION_FENCE_NAMESPACE/u);
  assert.doesNotMatch(core,/operationFenceDirectoryV1\(root\)/u);
  assert.match(
    core,
    /registry_broadcast_execution_external_generation_custody_required/u,
  );

  const productionHold=
    await submitVoidDatanetRegistryExactSingleBroadcastV1({});
  assert.equal(productionHold.ok,false);
  assert.equal(
    productionHold.reason,
    "registry_broadcast_execution_external_generation_custody_required",
  );
  assert.equal(productionHold.transaction_submission_performed,false);

  console.log(MARKER);
  console.log("external_generation_custody_dependency_required=true");
  console.log("operation_fence_durable_before_attempt_intent=true");
  console.log("legacy_sibling_fence_rename_does_not_reopen_operation=true");
  console.log("generation_fence_identity_stable_across_retry_time=true");
  console.log("generation_fence_identity_stable_across_root_generation=true");
  console.log("production_wrapper_fail_closed_without_custody=true");
  console.log("malformed_external_custody_claim_zero_rpc=true");
  console.log("failed_external_custody_revalidation_zero_rpc=true");
  console.log("original_attempt_directory_descriptor_bound=true");
  console.log("root_replacement_after_final_gate_simulated=true");
  console.log("first_simulated_network_send_count=1");
  console.log("replacement_generation_rpc_send_count=0");
  console.log("replacement_generation_attempt_store_created=false");
  console.log("detached_original_intent_reachable=true");
  console.log("detached_original_result_reachable=true");
  console.log("duplicate_invocation_zero_send=true");
  console.log("automatic_retry_performed=false");
  console.log("replacement_transaction_created=false");
  console.log("live_rpc_performed=false");
  console.log("signed_artifact_execution_performed=false");
  console.log("credential_access=false");
  console.log("private_key_access=false");
  console.log("chain2050_write=false");
  console.log("funds_movement=false");
}finally{
  fs.rmSync(parent,{recursive:true,force:true});
}
