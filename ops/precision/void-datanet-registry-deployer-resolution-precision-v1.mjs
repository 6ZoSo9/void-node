#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {execFileSync} from "node:child_process";

import {
  observeDatanetRegistryDeployerResolutionV1,
} from "../../tools/datanet-content-commitment-registry-deployer-resolution-observer-v1.mjs";

const ROOT=process.cwd();
const readJson=(p)=>JSON.parse(fs.readFileSync(path.join(ROOT,p),"utf8"));

const identity=readJson("ops/mainnet0/datanet-content-commitment-compiled-identity-v1.json");
const publisher=readJson("ops/mainnet0/datanet-content-commitment-publisher-selection-v1.json");
const deployer=readJson("ops/mainnet0/datanet-content-commitment-registry-deployer-selection-v1.json");
const target=readJson("ops/mainnet0/datanet-registry-deployer-resolution-target-v1.json");

const repoHead=execFileSync("git",["rev-parse","HEAD"],{
  cwd:ROOT,
  encoding:"utf8",
  stdio:["ignore","pipe","ignore"],
}).trim();

let result;
let targetBoundary=null;

const selectedRpcUrl=
  target?.production_execution_layer?.production_rpc_target_selected===true&&
  typeof target?.production_execution_layer?.rpc_url==="string"&&
  target.production_execution_layer.rpc_url.length>0
    ?target.production_execution_layer.rpc_url
    :null;

const requestedRpcUrl=
  typeof process.env.VOID_CHAIN2050_RPC_URL==="string"&&
  process.env.VOID_CHAIN2050_RPC_URL.trim().length>0
    ?process.env.VOID_CHAIN2050_RPC_URL.trim()
    :null;

if(
  target?.marker!=="VOID_DATANET_REGISTRY_DEPLOYER_RESOLUTION_TARGET_V1"||
  target?.chain_id!==2050||
  target?.execution_epoch!==2
){
  targetBoundary={
    ok:false,
    reason:"datanet_deployer_resolution_target_artifact_invalid",
  };
}else if(selectedRpcUrl===null){
  targetBoundary={
    ok:false,
    reason:"datanet_deployer_resolution_production_epoch2_rpc_target_not_selected",
  };
}else if(requestedRpcUrl!==null&&requestedRpcUrl!==selectedRpcUrl){
  targetBoundary={
    ok:false,
    reason:"datanet_deployer_resolution_requested_rpc_target_mismatch",
  };
}

if(targetBoundary!==null){
  result={
    ok:false,
    status:"held",
    marker:"VOID_DATANET_REGISTRY_DEPLOYER_RESOLUTION_OBSERVER_V1",
    version:1,
    reason:targetBoundary.reason,
    rpc_url_fingerprint_sha256:
      target?.production_execution_layer?.rpc_url_fingerprint_sha256??null,
    rpc_methods_used:[],
    observation:null,
    rpc_call_performed:false,
    mutation_performed:false,
    credential_access_performed:false,
    wallet_access_performed:false,
    private_key_access_performed:false,
    transaction_construction_performed:false,
    transaction_signing_performed:false,
    transaction_submission_performed:false,
    transaction_broadcast_performed:false,
    deployment_performed:false,
    chain2050_mutation_performed:false,
    deployer_funding_performed:false,
    funds_action_performed:false,
    automatic_retry_allowed:false,
  };
}else{
  result=await observeDatanetRegistryDeployerResolutionV1({
    rpc_url:selectedRpcUrl,
    deployer_address:deployer.deployer_address,
    publisher_address:publisher.publisher_address,
    predecessor_address:"0x0000000000000000000000000000000000000000",
    compiled_identity:identity,
    request_timeout_ms:5000,
    max_response_bytes:65536,
  });
}

const packet={
  marker:"VOID_DATANET_REGISTRY_DEPLOYER_RESOLUTION_PRECISION_V1",
  version:1,
  observed_at_utc:new Date().toISOString(),
  observed_on_host:os.hostname(),
  observed_repo_head:repoHead,
  publisher_selection_receipt_sha256:
    publisher.selection_basis.public_ceremony_receipt_sha256,
  deployer_selection_receipt_sha256:
    deployer.selection_basis.public_ceremony_receipt_sha256,
  resolution_target_status:target.status,
  selected_rpc_url:target.production_execution_layer.rpc_url,
  observer:result,
  authority:{
    read_only_rpc_observation:true,
    filesystem_secret_read:false,
    credential_access:false,
    wallet_access:false,
    private_key_access:false,
    deployer_funding:false,
    transaction_construction:false,
    transaction_signing:false,
    transaction_submission:false,
    transaction_broadcast:false,
    deployment:false,
    chain2050_mutation:false,
    funds_action:false,
  },
  decision:
    result.ok===true&&
    result.ready_for_source_evidence_binding===true
      ?"GREEN_READ_ONLY_DATANET_DEPLOYER_RESOLUTION_READY_FOR_SOURCE_BINDING"
      :"HOLD_READ_ONLY_DATANET_DEPLOYER_RESOLUTION_NOT_READY",
};

process.stdout.write(JSON.stringify(packet,null,2)+"\n");
if(packet.decision!=="GREEN_READ_ONLY_DATANET_DEPLOYER_RESOLUTION_READY_FOR_SOURCE_BINDING"){
  process.exitCode=2;
}
