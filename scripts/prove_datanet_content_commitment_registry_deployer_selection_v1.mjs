#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";

const selectionPath =
  "ops/mainnet0/datanet-content-commitment-registry-deployer-selection-v1.json";
const publisherPath =
  "ops/mainnet0/datanet-content-commitment-publisher-selection-v1.json";
const prereqPath =
  "ops/mainnet0/economic-epoch2-datanet-registry-deployment-prerequisites-v1.json";
const schemaPath =
  "schemas/datanet-content-commitment-registry-deployer-selection-v1.schema.json";

const selection=JSON.parse(fs.readFileSync(selectionPath,"utf8"));
const publisher=JSON.parse(fs.readFileSync(publisherPath,"utf8"));
const prereq=JSON.parse(fs.readFileSync(prereqPath,"utf8"));
const schema=JSON.parse(fs.readFileSync(schemaPath,"utf8"));

const sha256=(value)=>crypto.createHash("sha256").update(value).digest("hex");

assert.equal(selection.marker,"VOID_DATANET_CONTENT_COMMITMENT_REGISTRY_DEPLOYER_SELECTION_V1");
assert.equal(selection.version,1);
assert.equal(selection.status,"DEPLOYER_SELECTED_SOURCE_ONLY");
assert.equal(selection.chain_id,2050);
assert.equal(selection.role,"datanet_content_commitment_registry_deployer");
assert.equal(selection.credential_id,"datanet-content-commitment-registry-deployer-wallet-v1");
assert.equal(selection.deployer_address,"0x6c93ddfcc4116574fe66d63c1c67daedc0070dbb");
assert.equal(selection.deployer_address_fingerprint_sha256,sha256(selection.deployer_address));

assert.deepEqual(selection.selection_basis,{
  fresh_dedicated_key:true,
  generated_on_host:"Nimo",
  generated_offline:true,
  encrypted_backup_device_label:"VOID_AUTHORITY",
  encrypted_backup_verified:true,
  public_ceremony_receipt_sha256:
    "81a43d3c245b5badfa975c7ab998094359f62872600d533453df6cab8ed68cb3",
  public_ceremony_id:"20260928T121413Z",
  private_material_in_repo:false,
});

assert.equal(selection.separation.publisher_address,publisher.publisher_address);
assert.equal(selection.separation.publisher_deployer_distinct,true);
assert.notEqual(selection.deployer_address,publisher.publisher_address);
assert.equal(selection.separation.legacy_treasury_reuse,false);
assert.equal(selection.separation.role_authority_deployer_reuse,false);
assert.equal(selection.separation.presale_deployer_reuse,false);

assert.equal(selection.deployment_boundary.predecessor_mode,"GENESIS_ZERO_PREDECESSOR_ONLY_V1");
assert.equal(selection.deployment_boundary.predecessor_address,"0x0000000000000000000000000000000000000000");
assert.equal(selection.deployment_boundary.deployer_nonce_observed,false);
assert.equal(selection.deployment_boundary.deployer_nonce,null);
assert.equal(selection.deployment_boundary.registry_contract_address,null);
assert.equal(selection.deployment_boundary.registry_address_vacancy_observed,false);
assert.equal(selection.deployment_boundary.deployer_native_balance_observed,false);
assert.equal(selection.deployment_boundary.deployment_data_bound,false);
assert.equal(selection.deployment_boundary.unsigned_deployment_plan_materialized,false);
assert.equal(selection.deployment_boundary.funding_authorized,false);
assert.equal(selection.deployment_boundary.deployment_authorized,false);
assert.equal(selection.deployment_boundary.transaction_construction_authorized,false);
assert.equal(selection.deployment_boundary.transaction_signing_authorized,false);
assert.equal(selection.deployment_boundary.transaction_broadcast_authorized,false);
assert.equal(selection.deployment_boundary.chain2050_write_authorized,false);

for(const [key,value] of Object.entries(selection.authority)){
  if(key==="source_only") assert.equal(value,true,key);
  else assert.equal(value,false,key);
}

assert.equal(
  prereq.status,
  "HOLD_FRESH_READ_ONLY_DEPLOYER_NONCE_BALANCE_AND_CREATE_ADDRESS_RESOLUTION_REQUIRED",
);
assert.equal(prereq.deployment_policy.deployer_selection_required,false);
assert.equal(prereq.deployment_policy.deployer_address,selection.deployer_address);
assert.equal(
  prereq.deployment_policy.deployer_credential_id,
  selection.credential_id,
);
assert.equal(
  prereq.deployment_policy.deployer_selection_artifact,
  selectionPath,
);
assert.equal(
  prereq.deployment_policy.deployer_selection_receipt_sha256,
  selection.selection_basis.public_ceremony_receipt_sha256,
);
assert.equal(prereq.current_truth.deployer_selected,true);
assert.equal(prereq.current_truth.deployer_selection_source_bound,true);
assert.equal(prereq.current_truth.deployer_nonce_observed,false);
assert.equal(prereq.current_truth.registry_contract_address_resolved,false);
assert.equal(prereq.current_truth.registry_deployed_and_attested,false);
assert.equal(prereq.current_truth.successor_state_root_public_void_anchor_ready,false);

assert.equal(schema.type,"object");
assert.equal(schema.additionalProperties,false);
assert.deepEqual([...schema.required].sort(),Object.keys(selection).sort());

console.log("VOID_DATANET_CONTENT_COMMITMENT_REGISTRY_DEPLOYER_SELECTION_V1_GREEN");
console.log("deployer_address="+selection.deployer_address);
console.log("deployer_address_fingerprint_sha256="+selection.deployer_address_fingerprint_sha256);
console.log("public_ceremony_receipt_sha256="+selection.selection_basis.public_ceremony_receipt_sha256);
console.log("fresh_dedicated_key=true");
console.log("publisher_deployer_distinct=true");
console.log("deployer_nonce_observed=false");
console.log("registry_contract_address_resolved=false");
console.log("funding_authorized=false");
console.log("deployment_authorized=false");
console.log("transaction_signing=false");
console.log("transaction_broadcast=false");
console.log("chain2050_write=false");
