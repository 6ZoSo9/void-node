#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

const target=JSON.parse(fs.readFileSync(
  "ops/mainnet0/datanet-registry-deployer-resolution-target-v1.json",
  "utf8",
));
const schema=JSON.parse(fs.readFileSync(
  "schemas/datanet-registry-deployer-resolution-target-v1.schema.json",
  "utf8",
));
const runner=fs.readFileSync(
  "ops/precision/void-datanet-registry-deployer-resolution-precision-v1.mjs",
  "utf8",
);
const migration=JSON.parse(fs.readFileSync(
  "ops/mainnet0/economic-evm-successor-migration-candidate-v1.json",
  "utf8",
));

const currentTruth=fs.readFileSync(
  "ops/mainnet/CURRENT_TRUTH.md",
  "utf8",
);

assert.equal(target.marker,"VOID_DATANET_REGISTRY_DEPLOYER_RESOLUTION_TARGET_V1");
assert.equal(target.version,1);
assert.equal(target.status,"HOLD_PRODUCTION_EPOCH2_RPC_TARGET_NOT_SELECTED");
assert.equal(target.chain_id,2050);
assert.equal(target.execution_epoch,2);

assert.deepEqual(target.production_execution_layer,{
  client:"Besu",
  client_version:"26.8.1",
  production_rpc_target_selected:false,
  rpc_url:null,
  rpc_url_fingerprint_sha256:null,
  runtime_active_verified:false,
  exact_genesis_bound:false,
  production_validator_set_bound:false,
  migration_authorized:false,
  public_activation_authorized:false,
});

assert.equal(
  target.forbidden_as_production_resolution_targets.legacy_epoch1_archive_rpc,
  "http://127.0.0.1:8545/",
);
assert.equal(
  target.forbidden_as_production_resolution_targets.isolated_successor_equivalence_rpc,
  "http://127.0.0.1:18550/",
);
assert.equal(
  target.forbidden_as_production_resolution_targets.isolated_besu_free_gas_rpc,
  "http://127.0.0.1:18551/",
);
assert.equal(
  target.forbidden_as_production_resolution_targets.isolated_besu_nonce_continuity_rpc,
  "http://127.0.0.1:18552/",
);

assert.equal(
  target.selected_deployer.address,
  "0x6c93ddfcc4116574fe66d63c1c67daedc0070dbb",
);
assert.equal(
  target.selected_publisher.address,
  "0x926aa1d35824e6957fae1a05510e6cc6a0d57be6",
);

for(const [key,value] of Object.entries(target.authority)){
  if(key==="source_only") assert.equal(value,true,key);
  else assert.equal(value,false,key);
}

assert.equal(
  migration.source_execution_layer.rpc,
  "http://127.0.0.1:8545",
);
assert.equal(
  migration.source_execution_layer.disposition,
  "immutable_economic_genesis_archive",
);
assert.equal(
  migration.source_execution_layer.future_write_authority,
  false,
);
assert.equal(
  migration.successor_execution_layer.production_validator_set_bound,
  false,
);
assert.equal(migration.launch_authority.public_activation,false);

assert.equal(
  runner.includes('process.env.VOID_CHAIN2050_RPC_URL||"http://127.0.0.1:8545/"'),
  false,
);
assert.equal(
  runner.includes("datanet-registry-deployer-resolution-target-v1.json"),
  true,
);
assert.equal(
  runner.includes("datanet_deployer_resolution_production_epoch2_rpc_target_not_selected"),
  true,
);
assert.equal(
  runner.includes("datanet_deployer_resolution_requested_rpc_target_mismatch"),
  true,
);
assert.equal(
  runner.includes("rpc_url:selectedRpcUrl"),
  true,
);

assert.match(
  currentTruth,
  /The source\s+correction is now merged: the runner has \*\*no default RPC\*\*/,
);
assert.match(
  currentTruth,
  /HOLD_PRODUCTION_EPOCH2_RPC_TARGET_NOT_SELECTED/,
);
assert.match(
  currentTruth,
  /still unselected \(\`rpc_url=null\`\)/,
);
assert.doesNotMatch(
  currentTruth,
  /is being retired: deployer resolution must use/,
);
for(const forbiddenTarget of [
  "127.0.0.1:8545",
  "18550",
  "18551",
  "18552",
]){
  assert.equal(currentTruth.includes(forbiddenTarget),true,forbiddenTarget);
}

for(const forbidden of [
  '"http://127.0.0.1:18550/"',
  '"http://127.0.0.1:18551/"',
  '"http://127.0.0.1:18552/"',
]){
  assert.equal(runner.includes(forbidden),false,forbidden);
}

assert.equal(schema.type,"object");
assert.equal(schema.additionalProperties,false);
assert.deepEqual([...schema.required].sort(),Object.keys(target).sort());

console.log("VOID_DATANET_REGISTRY_DEPLOYER_RESOLUTION_TARGET_V1_GREEN");
console.log("production_rpc_target_selected=false");
console.log("legacy_epoch1_archive_rpc_forbidden=true");
console.log("isolated_proof_rpcs_forbidden=true");
console.log("environment_override_requires_exact_source_bound_target=true");
console.log("current_truth_matches_source_bound_hold=true");
console.log("rpc_call=false");
console.log("deployment=false");
console.log("chain2050_mutation=false");
