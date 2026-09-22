#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { getCreateAddress } from "ethers";
import {
  VOID_DATANET_CONTENT_COMMITMENT_DEPLOYMENT_ATTESTATION_AUTHORITY_V1,
  VOID_DATANET_CONTENT_COMMITMENT_DEPLOYMENT_ATTESTATION_V1,
  buildDatanetContentCommitmentDeploymentDataV1,
  reconstructDatanetContentCommitmentRuntimeV1,
  verifyDatanetContentCommitmentDeploymentObservationV1,
} from "../tools/datanet-content-commitment-deployment-attestation-v1.mjs";

const ROOT=process.cwd();
const identity=JSON.parse(fs.readFileSync(
  path.join(ROOT,"ops/mainnet0/datanet-content-commitment-compiled-identity-v1.json"),
  "utf8",
));

const PUBLISHER="0x1111111111111111111111111111111111111111";
const PREDECESSOR="0x0000000000000000000000000000000000000000";
const DEPLOYER="0x3333333333333333333333333333333333333333";
const NONCE=7;
const CONTRACT=getCreateAddress({from:DEPLOYER,nonce:NONCE}).toLowerCase();
const TX_HASH="0x"+"4".repeat(64);
const DEPLOYMENT_BLOCK_HASH="0x"+"5".repeat(64);
const OBSERVATION_BLOCK_HASH="0x"+"6".repeat(64);

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

assert.equal(runtime.runtime_bytes,2910);
assert.match(runtime.runtime_sha256,/^[0-9a-f]{64}$/);
assert.match(runtime.runtime_keccak256,/^0x[0-9a-f]{64}$/);
assert.ok(runtime.runtime_code.startsWith("0x"));
assert.ok(deploymentData.deployment_data.startsWith("0x"));

function policy(override={}){
  return {
    chain_id:"2050",
    registry_contract_address:CONTRACT,
    publisher_address:PUBLISHER,
    predecessor_address:PREDECESSOR,
    min_confirmations:"12",
    ...override,
  };
}
function observation(override={}){
  return {
    chain_id:"2050",
    observation_block_number:"111",
    observation_block_hash:OBSERVATION_BLOCK_HASH,
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
    ...override,
  };
}
function verify(p=policy(),o=observation()){
  return verifyDatanetContentCommitmentDeploymentObservationV1({
    compiled_identity:identity,
    policy:p,
    observation:o,
  });
}
function heldReason(p,o){
  const value=verify(p,o);
  assert.equal(value.ok,false);
  if(value.ok) throw new Error("expected held");
  return value.reason;
}

const ready=verify();
assert.equal(ready.ok,true);
if(ready.ok===false) throw new Error(ready.reason);
assert.equal(ready.marker,VOID_DATANET_CONTENT_COMMITMENT_DEPLOYMENT_ATTESTATION_V1);
assert.equal(
  ready.status,
  "deployment_attested_genesis_lineage_held_on_fresh_object_uncommitted_preflight",
);
assert.equal(ready.registry_contract_address,CONTRACT);
assert.equal(ready.publisher_address,PUBLISHER);
assert.equal(ready.predecessor_address,PREDECESSOR);
assert.equal(ready.registry_version,"1");
assert.equal(ready.max_object_bytes,"268435456");
assert.equal(ready.observed_confirmation_count,"12");
assert.equal(ready.creation_transaction_exact_match,true);
assert.equal(ready.create_address_exact_match,true);
assert.equal(ready.runtime_code_exact_match,true);
assert.equal(ready.immutable_publisher_exact_match,true);
assert.equal(ready.immutable_predecessor_exact_match,true);
assert.equal(ready.contract_views_exact_match,true);
assert.equal(ready.genesis_predecessor,true);
assert.equal(ready.predecessor_lineage_attested,true);
assert.equal(ready.deployment_attested,true);
assert.equal(ready.object_uncommitted_preflight_verified,false);
assert.equal(ready.transaction_construction_authorized,false);
assert.equal(ready.transaction_signing_authorized,false);
assert.equal(ready.transaction_broadcast_authorized,false);
assert.equal(ready.chain2050_write_authorized,false);
assert.match(ready.deployment_attestation_id,/^voiddccda1_[0-9a-f]{64}$/);

assert.equal(
  heldReason(
    policy({predecessor_address:"0x7777777777777777777777777777777777777777"}),
    observation(),
  ),
  "deployment_attestation_nonzero_predecessor_identity_not_accepted_v1",
);
assert.equal(
  heldReason(policy(),observation({observation_block_number:"110"})),
  "deployment_attestation_confirmation_depth_insufficient",
);
assert.equal(
  heldReason(policy(),observation({
    runtime_code:runtime.runtime_code.slice(0,-2)+"01",
  })),
  "deployment_attestation_runtime_code_mismatch",
);
assert.equal(
  heldReason(policy(),observation({
    deployment_transaction:{
      ...observation().deployment_transaction,
      input:deploymentData.deployment_data.slice(0,-2)+"01",
    },
  })),
  "deployment_attestation_creation_input_mismatch",
);
assert.equal(
  heldReason(policy(),observation({
    deployment_transaction:{
      ...observation().deployment_transaction,
      nonce:NONCE+1,
    },
  })),
  "deployment_attestation_create_address_mismatch",
);
assert.equal(
  heldReason(policy(),observation({
    views:{
      ...observation().views,
      publisher_address:"0x8888888888888888888888888888888888888888",
    },
  })),
  "deployment_attestation_observation_binding_mismatch",
);
assert.equal(
  heldReason(policy(),observation({
    views:{
      ...observation().views,
      registry_version:"2",
    },
  })),
  "deployment_attestation_observation_binding_mismatch",
);
assert.equal(
  heldReason(policy(),observation({
    views:{
      ...observation().views,
      max_object_bytes:"1",
    },
  })),
  "deployment_attestation_observation_binding_mismatch",
);
assert.equal(
  heldReason(policy({min_confirmations:"13"}),observation()),
  "deployment_attestation_confirmation_depth_insufficient",
);

const mutatedIdentity=structuredClone(identity);
mutatedIdentity.artifacts.runtime_template_hex=
  mutatedIdentity.artifacts.runtime_template_hex.slice(0,-2)+"00";
const rejected=verifyDatanetContentCommitmentDeploymentObservationV1({
  compiled_identity:mutatedIdentity,
  policy:policy(),
  observation:observation(),
});
assert.equal(rejected.ok,false);
assert.equal(
  rejected.reason,
  "deployment_attestation_compiled_identity_not_accepted",
);

for(const [key,expected] of Object.entries({
  pure_observation_validation_only:true,
  accepted_compiler_identity_required:true,
  exact_creation_transaction_required:true,
  exact_create_address_required:true,
  exact_runtime_reconstruction_required:true,
  exact_view_binding_required:true,
  genesis_predecessor_only_v1:true,
  nonzero_predecessor_requires_separate_identity_acceptance:true,
  fresh_object_uncommitted_preflight_still_required:true,
  rpc_call:false,
  credential_access:false,
  wallet_access:false,
  signing:false,
  calldata_construction_for_commit:false,
  transaction_construction:false,
  transaction_broadcast:false,
  deployment:false,
  chain2050_mutation:false,
  validator_mutation:false,
  governance_mutation:false,
  runtime_service_action:false,
  work_credit_award:false,
  funds_action:false,
})){
  assert.equal(
    VOID_DATANET_CONTENT_COMMITMENT_DEPLOYMENT_ATTESTATION_AUTHORITY_V1[key],
    expected,
    key,
  );
}

const source=fs.readFileSync(
  path.join(ROOT,"tools/datanet-content-commitment-deployment-attestation-v1.mjs"),
  "utf8",
);
for(const forbidden of [
  "JsonRpcProvider",
  "fetch(",
  "broadcastTransaction",
  "sendTransaction",
  "eth_sendRawTransaction",
  "eth_sendTransaction",
  "private_key",
  "mnemonic",
  "forge create",
  "cast send",
]){
  assert.equal(source.includes(forbidden),false,"forbidden operation "+forbidden);
}

console.log("VOID_DATANET_CONTENT_COMMITMENT_DEPLOYMENT_ATTESTATION_V1_PROOF_GREEN");
console.log("accepted_compiler_identity_required=true");
console.log("creation_transaction_exact_match=true");
console.log("create_address_exact_match=true");
console.log("runtime_code_exact_match=true");
console.log("immutable_publisher_exact_match=true");
console.log("immutable_predecessor_exact_match=true");
console.log("contract_views_exact_match=true");
console.log("deployment_confirmation_floor_required=true");
console.log("genesis_predecessor_only_v1=true");
console.log("nonzero_predecessor_requires_separate_identity=true");
console.log("deployment_attested=true");
console.log("predecessor_lineage_attested=true");
console.log("object_uncommitted_preflight_verified=false");
console.log("transaction_construction_authorized=false");
console.log("transaction_signing_authorized=false");
console.log("transaction_broadcast_authorized=false");
console.log("chain2050_write_authorized=false");
console.log(
  "next_gate=fresh_chain2050_is_committed_false_preflight_for_approved_preparation_intent",
);
