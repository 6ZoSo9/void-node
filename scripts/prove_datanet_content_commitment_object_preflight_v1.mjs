#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  Interface,
  getCreateAddress,
} from "ethers";
import {
  buildDatanetContentCommitmentDeploymentDataV1,
  reconstructDatanetContentCommitmentRuntimeV1,
  verifyDatanetContentCommitmentDeploymentObservationV1,
} from "../tools/datanet-content-commitment-deployment-attestation-v1.mjs";
import {
  buildDatanetPhase0CanonicalPreparationIntentAgainstFingerprintV1,
} from "../scripts/datanet_phase0_canonical_preparation_intent_v1.ts";
import {
  VOID_DATANET_CONTENT_COMMITMENT_OBJECT_PREFLIGHT_OBSERVER_AUTHORITY_V1,
  observeDatanetContentCommitmentObjectPreflightV1,
} from "../tools/datanet-content-commitment-object-preflight-observer-v1.mjs";

const ROOT=process.cwd();
const identity=JSON.parse(fs.readFileSync(
  path.join(ROOT,"ops/mainnet0/datanet-content-commitment-compiled-identity-v1.json"),
  "utf8",
));

// Reuse a minimal synthetic approved intent shape directly; its content-derived ID
// is computed with the same canonical serializer by importing the builder would
// require a full signed packet fixture. The verifier itself checks the ID.
import {
  canonicalJson,
  sha256,
} from "../tools/datanet-content-commitment-compiler-profile-v1.mjs";

const OBJECT_ID="11".repeat(32);
const CONTENT_SHA="22".repeat(32);
const BYTE_LENGTH=128;

const intentBody={
  marker:"VOID_DATANET_PHASE0_CANONICAL_PREPARATION_INTENT_V1",
  version:1,
  status:"PREPARATION_INTENT_ONLY",
  chain_id:2050,
  phase:0,
  authority_mode:"PHASE0_OPERATOR_ROOTED",
  assembly:{
    assembly_id:"voiddppa1_"+"3".repeat(64),
    assembly_manifest_sha256:"4".repeat(64),
    candidate_id:"voiddcp1_"+"5".repeat(32),
    promotion_candidate_sha256:"6".repeat(64),
  },
  sovereign_review:{
    decision_id:"voiddpsr1_"+"7".repeat(64),
    decision_sha256:"8".repeat(64),
    sequence:"0",
    signer_role:"sovereign_primary_governance_attestation",
    signer_public_key_der_sha256:"9".repeat(64),
    decision:"APPROVE_FOR_SEPARATE_CANONICAL_PREPARATION",
    separate_canonical_preparation_eligible:true,
  },
  target_contract_source:{
    contract_name:"DatanetContentCommitmentRegistryV1",
    source_path:"contracts/mainnet/DatanetContentCommitmentRegistryV1.sol",
    source_sha256:"a".repeat(64),
    source_bytes:4003,
    registry_version:1,
    max_object_bytes:268435456,
    function_signature:"commit(bytes32,bytes32,uint64)",
  },
  commitment:{
    object_id_sha256:OBJECT_ID,
    content_sha256:CONTENT_SHA,
    byte_length:BYTE_LENGTH,
  },
  deployment_binding:{
    status:"UNBOUND_REQUIRED",
    registry_address:null,
    publisher_address:null,
    predecessor_address:null,
  },
  required_preflight:{
    exact_chain_id_verified:false,
    registry_deployment_verified:false,
    deployed_code_matches_reviewed_source:false,
    publisher_binding_verified:false,
    predecessor_lineage_verified:false,
    object_uncommitted_verified:false,
    fresh_read_only_is_committed_check_required:true,
  },
  post_commit_requirements:{
    content_committed_event_receipt_membership_required:true,
    receipt_revalidation_required:true,
    canonical_block_binding_required:true,
    accepted_checkpoint_membership_required:true,
    chain_finality_required:true,
  },
  authority:{
    preparation_intent_only:true,
    deployment_authorized:false,
    contract_selection_authorized:false,
    registry_address_selection_authorized:false,
    publisher_selection_authorized:false,
    predecessor_selection_authorized:false,
    transaction_construction_authorized:false,
    calldata_construction_authorized:false,
    transaction_signing_authorized:false,
    transaction_broadcast_authorized:false,
    chain2050_write_authorized:false,
    validator_authority_granted:false,
    governance_mutation_authorized:false,
    runtime_service_action:false,
    wallet_or_signer_access:false,
    work_credit_award_authorized:false,
    funds_action:false,
    automatic_promotion:false,
  },
  next_gate:"REVIEWED_DEPLOYMENT_AND_LINEAGE_BINDING_REQUIRED",
};
const intent={
  ...intentBody,
  preparation_intent_id:"voiddcpi1_"+sha256(canonicalJson(intentBody)),
};

const PUBLISHER="0x1111111111111111111111111111111111111111";
const PREDECESSOR="0x0000000000000000000000000000000000000000";
const DEPLOYER="0x3333333333333333333333333333333333333333";
const NONCE=7;
const CONTRACT=getCreateAddress({from:DEPLOYER,nonce:NONCE}).toLowerCase();
const TX_HASH="0x"+"4".repeat(64);
const DEPLOYMENT_BLOCK_HASH="0x"+"5".repeat(64);
const HEAD_HASH="0x"+"6".repeat(64);

const deploymentData=buildDatanetContentCommitmentDeploymentDataV1({
  compiled_identity:identity,
  publisher_address:PUBLISHER,
  predecessor_address:PREDECESSOR,
});
const runtime=reconstructDatanetContentCommitmentRuntimeV1({
  compiled_identity:identity,
  publisher_address:PUBLISHER,
  predecessor_address:PREDECESSOR,
});
const deployment=verifyDatanetContentCommitmentDeploymentObservationV1({
  compiled_identity:identity,
  policy:{
    chain_id:"2050",
    registry_contract_address:CONTRACT,
    publisher_address:PUBLISHER,
    predecessor_address:PREDECESSOR,
    min_confirmations:"12",
  },
  observation:{
    chain_id:"2050",
    observation_block_number:"111",
    observation_block_hash:HEAD_HASH,
    contract_address:CONTRACT,
    deployment_transaction:{
      hash:TX_HASH,
      from:DEPLOYER,
      to:null,
      nonce:NONCE,
      input:deploymentData.deployment_data,
      value_wei:"0",
      chain_id:"2050",
    },
    deployment_receipt:{
      transaction_hash:TX_HASH,
      status:"1",
      block_number:"100",
      block_hash:DEPLOYMENT_BLOCK_HASH,
      contract_address:CONTRACT,
    },
    runtime_code:runtime.runtime_code,
    views:{
      registry_version:"1",
      max_object_bytes:"268435456",
      publisher_address:PUBLISHER,
      predecessor_address:PREDECESSOR,
    },
  },
});
assert.equal(deployment.ok,true);

const VIEWS=new Interface([
  "function registryVersion() view returns (uint256)",
  "function maxObjectBytes() view returns (uint64)",
  "function publisher() view returns (address)",
  "function predecessor() view returns (address)",
  "function isCommitted(bytes32 objectIdSha256) view returns (bool)",
]);

function encodeResult(name,values){
  return VIEWS.encodeFunctionResult(name,values);
}
function fixture(options={}){
  const calls=[];
  let blockReads=0;
  let committedReads=0;
  const transport=async(call)=>{
    calls.push(structuredClone(call));
    switch(call.method){
      case "eth_chainId":
        return options.wrongChain?"0x1":"0x802";
      case "eth_blockNumber":
        return "0x6f";
      case "eth_getBlockByNumber":
        blockReads+=1;
        return {
          number:"0x6f",
          hash:options.reorg&&blockReads>1
            ?"0x"+"7".repeat(64)
            :HEAD_HASH,
        };
      case "eth_getCode":
        return options.codeTamper
          ? runtime.runtime_code.slice(0,-2)+"01"
          : runtime.runtime_code;
      case "eth_call":{
        const data=String(call.params?.[0]?.data||"").toLowerCase();
        for(const name of [
          "registryVersion","maxObjectBytes","publisher","predecessor","isCommitted",
        ]){
          if(data.startsWith(VIEWS.getFunction(name).selector.toLowerCase())){
            if(name==="registryVersion")return encodeResult(name,[1n]);
            if(name==="maxObjectBytes")return encodeResult(name,[268435456n]);
            if(name==="publisher")return encodeResult(name,[PUBLISHER]);
            if(name==="predecessor")return encodeResult(name,[PREDECESSOR]);
            if(name==="isCommitted"){
              committedReads+=1;
              return encodeResult(name,[
                options.committed===true||
                (options.commitDrift===true&&committedReads>1),
              ]);
            }
          }
        }
        throw new Error("unexpected_eth_call");
      }
      default:
        throw new Error("unexpected_rpc_method:"+call.method);
    }
  };
  return {calls,transport};
}
function input(transport,override={}){
  return {
    rpc_url:"http://127.0.0.1:18545/",
    request_timeout_ms:5000,
    max_response_bytes:65536,
    compiled_identity:identity,
    deployment_attestation:deployment,
    preparation_intent:intent,
    transport,
    ...override,
  };
}

{
  const f=fixture();
  const result=await observeDatanetContentCommitmentObjectPreflightV1(
    input(f.transport),
  );
  assert.equal(result.ok,true);
  if(result.ok===false)throw new Error(result.reason);
  assert.equal(
    result.status,
    "object_uncommitted_verified_ready_for_separate_unsigned_transaction_plan",
  );
  assert.equal(result.preflight.object_uncommitted_preflight_verified,true);
  assert.equal(result.preflight.ready_for_separate_unsigned_transaction_plan,true);
  assert.equal(result.preflight.commit_calldata_construction_authorized,false);
  assert.equal(result.preflight.transaction_construction_authorized,false);
  assert.equal(result.preflight.transaction_signing_authorized,false);
  assert.equal(result.preflight.transaction_broadcast_authorized,false);
  assert.equal(result.preflight.chain2050_write_authorized,false);
  assert.equal(result.fixed_block_observation,true);
  assert.equal(result.block_hash_revalidated,true);
  assert.equal(result.repeated_is_committed_verified,true);
  assert.deepEqual(
    [...new Set(f.calls.map(x=>x.method))].sort(),
    ["eth_blockNumber","eth_call","eth_chainId","eth_getBlockByNumber","eth_getCode"].sort(),
  );
  assert.equal(f.calls.filter(x=>x.method==="eth_call").length,6);
  for(const call of f.calls){
    if(call.method==="eth_getCode"||call.method==="eth_call"){
      assert.equal(call.params[1],"0x6f");
    }
  }
}

{
  const f=fixture({committed:true});
  const result=await observeDatanetContentCommitmentObjectPreflightV1(input(f.transport));
  assert.equal(result.ok,false);
  assert.match(result.reason,/object_already_committed/);
}
{
  const f=fixture({commitDrift:true});
  const result=await observeDatanetContentCommitmentObjectPreflightV1(input(f.transport));
  assert.equal(result.ok,false);
  assert.match(result.reason,/object_already_committed/);
}
{
  const f=fixture({reorg:true});
  const result=await observeDatanetContentCommitmentObjectPreflightV1(input(f.transport));
  assert.equal(result.ok,false);
  assert.equal(result.reason,"object_preflight_observer_block_revalidation_mismatch");
}
{
  const f=fixture({codeTamper:true});
  const result=await observeDatanetContentCommitmentObjectPreflightV1(input(f.transport));
  assert.equal(result.ok,false);
  assert.equal(result.reason,"object_preflight_observer_runtime_mismatch");
}
{
  const f=fixture({wrongChain:true});
  const result=await observeDatanetContentCommitmentObjectPreflightV1(input(f.transport));
  assert.equal(result.ok,false);
  assert.equal(result.reason,"object_preflight_observer_chain_id_mismatch");
}
{
  const f=fixture();
  const result=await observeDatanetContentCommitmentObjectPreflightV1(
    input(f.transport,{rpc_url:"https://example.com/"}),
  );
  assert.equal(result.ok,false);
  assert.equal(result.reason,"object_preflight_observer_input_invalid");
  assert.equal(f.calls.length,0);
}

for(const [key,expected] of Object.entries({
  canonical_chain_id:"2050",
  loopback_http_only:true,
  fixed_block_observation:true,
  block_hash_revalidation_required:true,
  repeated_is_committed_required:true,
  rpc_mutation:false,
  filesystem_read:false,
  filesystem_write:false,
  credential_access:false,
  wallet_access:false,
  signing:false,
  commit_calldata_construction:false,
  transaction_construction:false,
  transaction_signing:false,
  transaction_broadcast:false,
  deployment:false,
  chain2050_mutation:false,
  automatic_retry:false,
  funds_action:false,
})){
  assert.equal(
    VOID_DATANET_CONTENT_COMMITMENT_OBJECT_PREFLIGHT_OBSERVER_AUTHORITY_V1[key],
    expected,
    key,
  );
}

const observerSource=fs.readFileSync(
  path.join(ROOT,"tools/datanet-content-commitment-object-preflight-observer-v1.mjs"),
  "utf8",
);
for(const forbidden of [
  "eth_sendRawTransaction",
  "eth_sendTransaction",
  "personal_",
  "admin_",
  "debug_",
  "JsonRpcProvider",
  "Wallet(",
  "private_key",
  "mnemonic",
  "broadcastTransaction",
  "sendTransaction",
]){
  assert.equal(observerSource.includes(forbidden),false,"observer contains "+forbidden);
}

console.log("VOID_DATANET_CONTENT_COMMITMENT_OBJECT_PREFLIGHT_OBSERVER_V1_PROOF_GREEN");
console.log("approved_preparation_intent_bound=true");
console.log("deployment_attestation_bound=true");
console.log("loopback_http_only=true");
console.log("fixed_block_observation=true");
console.log("block_hash_revalidated=true");
console.log("runtime_code_reverified=true");
console.log("registry_views_reverified=true");
console.log("is_committed_repeated=true");
console.log("object_uncommitted_preflight_verified=true");
console.log("ready_for_separate_unsigned_transaction_plan=true");
console.log("commit_calldata_constructed=false");
console.log("transaction_constructed=false");
console.log("transaction_signing=false");
console.log("transaction_broadcast=false");
console.log("chain2050_mutation=false");
