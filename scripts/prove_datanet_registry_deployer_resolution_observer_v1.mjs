#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {getCreateAddress} from "ethers";

import {
  VOID_DATANET_REGISTRY_DEPLOYER_RESOLUTION_OBSERVER_AUTHORITY_V1,
  VOID_DATANET_REGISTRY_DEPLOYER_RESOLUTION_OBSERVER_V1,
  observeDatanetRegistryDeployerResolutionV1,
} from "../tools/datanet-content-commitment-registry-deployer-resolution-observer-v1.mjs";

const ROOT=process.cwd();
const identity=JSON.parse(fs.readFileSync(
  path.join(ROOT,"ops/mainnet0/datanet-content-commitment-compiled-identity-v1.json"),
  "utf8",
));

const DEPLOYER="0x6c93ddfcc4116574fe66d63c1c67daedc0070dbb";
const PUBLISHER="0x926aa1d35824e6957fae1a05510e6cc6a0d57be6";
const PREDECESSOR="0x0000000000000000000000000000000000000000";
const HEAD_HASH="0x"+"6".repeat(64);
const FUTURE=getCreateAddress({from:DEPLOYER,nonce:0}).toLowerCase();

function input(transport,override={}){
  return {
    rpc_url:"http://127.0.0.1:8545/",
    deployer_address:DEPLOYER,
    publisher_address:PUBLISHER,
    predecessor_address:PREDECESSOR,
    compiled_identity:identity,
    request_timeout_ms:5000,
    max_response_bytes:65536,
    transport,
    ...override,
  };
}

function fixture(options={}){
  const calls=[];
  let deployerPendingReads=0;
  let blockReads=0;
  const transport=async(call)=>{
    calls.push(structuredClone(call));
    switch(call.method){
      case "eth_chainId":
        return options.wrongChain?"0x1":"0x802";
      case "eth_blockNumber":
        return "0x64";
      case "eth_getBlockByNumber":
        blockReads+=1;
        return {
          number:"0x64",
          hash:options.blockDrift&&blockReads>1
            ?"0x"+"7".repeat(64)
            :HEAD_HASH,
        };
      case "eth_getTransactionCount": {
        const [addr,tag]=call.params||[];
        if(String(addr).toLowerCase()===DEPLOYER&&tag==="pending"){
          deployerPendingReads+=1;
          if(options.pendingDrift&&deployerPendingReads>1) return "0x1";
          return options.pendingPresent?"0x1":"0x0";
        }
        if(String(addr).toLowerCase()===DEPLOYER) return "0x0";
        if(String(addr).toLowerCase()===FUTURE){
          return options.predictedNonceOccupied?"0x1":"0x0";
        }
        throw new Error("unexpected_nonce_address:"+addr);
      }
      case "eth_getBalance":
        return "0x0";
      case "eth_getCode":
        assert.equal(String(call.params?.[0]).toLowerCase(),FUTURE);
        return options.codeOccupied?"0x6000":"0x";
      default:
        throw new Error("unexpected_method:"+call.method);
    }
  };
  return {calls,transport};
}

{
  const f=fixture();
  const result=await observeDatanetRegistryDeployerResolutionV1(input(f.transport));
  assert.equal(result.ok,true);
  if(result.ok===false) throw new Error(result.reason);
  assert.equal(result.marker,VOID_DATANET_REGISTRY_DEPLOYER_RESOLUTION_OBSERVER_V1);
  assert.equal(
    result.status,
    "read_only_deployer_resolution_green_ready_for_source_evidence_binding",
  );
  assert.equal(result.ready_for_source_evidence_binding,true);
  assert.equal(result.observation.chain_id,"2050");
  assert.equal(result.observation.deployer_address,DEPLOYER);
  assert.equal(result.observation.publisher_address,PUBLISHER);
  assert.equal(result.observation.predecessor_address,PREDECESSOR);
  assert.equal(result.observation.latest_nonce,"0");
  assert.equal(result.observation.pending_nonce,"0");
  assert.equal(result.observation.pending_transactions_present,false);
  assert.equal(result.observation.deployer_balance_wei,"0");
  assert.equal(result.observation.predicted_registry_contract_address,FUTURE);
  assert.equal(result.observation.predicted_registry_address_nonce,"0");
  assert.equal(result.observation.predicted_registry_address_code,"0x");
  assert.equal(result.observation.predicted_registry_address_vacant,true);
  assert.match(
    result.observation.constructor_deployment_data_keccak256,
    /^0x[0-9a-f]{64}$/,
  );
  assert.equal(result.observation.exact_creation_data_bound,true);
  assert.equal(result.observation.pending_nonce_revalidated,true);
  assert.equal(result.observation.observation_block_hash_revalidated,true);
  assert.equal(f.calls.length,10);
  assert.deepEqual(
    [...new Set(f.calls.map(x=>x.method))].sort(),
    [
      "eth_chainId",
      "eth_blockNumber",
      "eth_getBlockByNumber",
      "eth_getTransactionCount",
      "eth_getBalance",
      "eth_getCode",
    ].sort(),
  );
  assert.equal(result.rpc_call_performed,true);
  assert.equal(result.mutation_performed,false);
  assert.equal(result.credential_access_performed,false);
  assert.equal(result.wallet_access_performed,false);
  assert.equal(result.private_key_access_performed,false);
  assert.equal(result.transaction_construction_performed,false);
  assert.equal(result.transaction_signing_performed,false);
  assert.equal(result.transaction_submission_performed,false);
  assert.equal(result.transaction_broadcast_performed,false);
  assert.equal(result.deployment_performed,false);
  assert.equal(result.chain2050_mutation_performed,false);
  assert.equal(result.deployer_funding_performed,false);
  assert.equal(result.funds_action_performed,false);
  assert.equal(result.automatic_retry_allowed,false);
}

{
  const f=fixture({wrongChain:true});
  const result=await observeDatanetRegistryDeployerResolutionV1(input(f.transport));
  assert.equal(result.ok,false);
  assert.equal(result.reason,"datanet_deployer_resolution_chain_id_mismatch");
  assert.deepEqual(f.calls.map(x=>x.method),["eth_chainId"]);
}

{
  const f=fixture({pendingDrift:true});
  const result=await observeDatanetRegistryDeployerResolutionV1(input(f.transport));
  assert.equal(result.ok,false);
  assert.equal(result.reason,"datanet_deployer_resolution_revalidation_mismatch");
}

{
  const f=fixture({pendingPresent:true});
  const result=await observeDatanetRegistryDeployerResolutionV1(input(f.transport));
  assert.equal(result.ok,true);
  if(result.ok===false) throw new Error(result.reason);
  assert.equal(result.ready_for_source_evidence_binding,false);
  assert.equal(
    result.status,
    "read_only_deployer_resolution_observed_held_on_pending_or_occupied_address",
  );
  assert.equal(result.observation.pending_transactions_present,true);
}

{
  const f=fixture({codeOccupied:true});
  const result=await observeDatanetRegistryDeployerResolutionV1(input(f.transport));
  assert.equal(result.ok,true);
  if(result.ok===false) throw new Error(result.reason);
  assert.equal(result.ready_for_source_evidence_binding,false);
  assert.equal(result.observation.predicted_registry_address_vacant,false);
}

{
  const f=fixture({predictedNonceOccupied:true});
  const result=await observeDatanetRegistryDeployerResolutionV1(input(f.transport));
  assert.equal(result.ok,true);
  if(result.ok===false) throw new Error(result.reason);
  assert.equal(result.ready_for_source_evidence_binding,false);
  assert.equal(result.observation.predicted_registry_address_vacant,false);
}

{
  const f=fixture();
  const result=await observeDatanetRegistryDeployerResolutionV1(
    input(f.transport,{rpc_url:"https://example.com/"}),
  );
  assert.equal(result.ok,false);
  assert.equal(result.reason,"datanet_deployer_resolution_input_invalid");
  assert.equal(f.calls.length,0);
}

for(const [key,expected] of Object.entries({
  canonical_chain_id:"2050",
  explicit_deployer_address_required:true,
  exact_publisher_address_required:true,
  genesis_zero_predecessor_only:true,
  accepted_compiled_identity_required:true,
  loopback_http_only:true,
  deployer_pending_nonce_revalidation_required:true,
  observation_block_hash_revalidation_required:true,
  predicted_create_address_derived_only:true,
  predicted_address_nonce_zero_required:true,
  predicted_address_code_empty_required:true,
  exact_constructor_deployment_data_bound:true,
  rpc_mutation:false,
  filesystem_secret_read:false,
  filesystem_write:false,
  credential_access:false,
  wallet_access:false,
  private_key_access:false,
  transaction_construction:false,
  transaction_signing:false,
  transaction_submission:false,
  transaction_broadcast:false,
  deployment:false,
  chain2050_mutation:false,
  deployer_funding:false,
  funds_action:false,
  automatic_retry:false,
})){
  assert.equal(
    VOID_DATANET_REGISTRY_DEPLOYER_RESOLUTION_OBSERVER_AUTHORITY_V1[key],
    expected,
    key,
  );
}

const source=fs.readFileSync(
  path.join(ROOT,"tools/datanet-content-commitment-registry-deployer-resolution-observer-v1.mjs"),
  "utf8",
);
for(const forbidden of [
  "eth_sendRawTransaction",
  "eth_sendTransaction",
  "personal_",
  "admin_",
  "debug_",
  "private_key",
  "mnemonic",
  "broadcastTransaction",
  "sendTransaction",
  "Wallet(",
  "systemctl",
]){
  assert.equal(source.includes(forbidden),false,"observer contains forbidden operation "+forbidden);
}

console.log("VOID_DATANET_REGISTRY_DEPLOYER_RESOLUTION_OBSERVER_V1_PROOF_GREEN");
console.log("loopback_http_only=true");
console.log("deployer_pending_nonce_revalidated=true");
console.log("predicted_create_address_derived=true");
console.log("predicted_address_nonce_zero_required=true");
console.log("predicted_address_code_empty_required=true");
console.log("exact_constructor_deployment_data_bound=true");
console.log("transaction_construction=false");
console.log("transaction_signing=false");
console.log("transaction_broadcast=false");
console.log("deployment=false");
console.log("chain2050_mutation=false");
