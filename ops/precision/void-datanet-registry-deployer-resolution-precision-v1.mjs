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

const repoHead=execFileSync("git",["rev-parse","HEAD"],{
  cwd:ROOT,
  encoding:"utf8",
  stdio:["ignore","pipe","ignore"],
}).trim();

const result=await observeDatanetRegistryDeployerResolutionV1({
  rpc_url:process.env.VOID_CHAIN2050_RPC_URL||"http://127.0.0.1:8545/",
  deployer_address:deployer.deployer_address,
  publisher_address:publisher.publisher_address,
  predecessor_address:"0x0000000000000000000000000000000000000000",
  compiled_identity:identity,
  request_timeout_ms:5000,
  max_response_bytes:65536,
});

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
