import assert from "node:assert/strict";
import fs from "node:fs";
import {
  VOID_BUY_VOID_ALLOCATION_CUSTODY_LIVE_DURABILITY_ROLLBACK_AUTHORITY_V1,
  VOID_BUY_VOID_ALLOCATION_CUSTODY_LIVE_DURABILITY_ROLLBACK_CONTRACT_V1,
  VOID_BUY_VOID_ALLOCATION_CUSTODY_LIVE_DURABILITY_ROLLBACK_PARENT_PLAN_ID_V1,
  VOID_BUY_VOID_ALLOCATION_CUSTODY_LIVE_DURABILITY_ROLLBACK_REQUIRED_FUTURE_EVIDENCE_V1,
  VOID_BUY_VOID_ALLOCATION_CUSTODY_LIVE_DURABILITY_ROLLBACK_REVIEWED_PRIMITIVE_BLOBS_V1,
  classifyBuyVoidAllocationCustodyLiveDurabilityRollbackContractV1,
} from "../tools/void-buy-allocation-custody-live-durability-rollback-contract-v1.mjs";

assert.equal(
  VOID_BUY_VOID_ALLOCATION_CUSTODY_LIVE_DURABILITY_ROLLBACK_PARENT_PLAN_ID_V1,
  "voidbuyhostevplan1_665336abc8030749d2d540f412c4dc597ecece47ecb5aa9f2928529adeba5aab",
);
assert.deepEqual(
  VOID_BUY_VOID_ALLOCATION_CUSTODY_LIVE_DURABILITY_ROLLBACK_REVIEWED_PRIMITIVE_BLOBS_V1,
  {
    external_custody_qualification:
      "d2bc816b027d2aca0c236d9ec31d128b28159d7d",
    rollback_independence:
      "2d5fc24498b569f20701445d6214a8ca31e4f701",
    rollback_policy_evidence:
      "cf40d9d4a19d138d74aee849a6c02f96ee362dbb",
    second_control_composition:
      "97180cc03e3f1b2f9935191ac6aafe4b15307708",
  },
);

for (const [key, value] of Object.entries(
  VOID_BUY_VOID_ALLOCATION_CUSTODY_LIVE_DURABILITY_ROLLBACK_REQUIRED_FUTURE_EVIDENCE_V1,
)) {
  assert.equal(value, true, key);
}
assert.equal(
  VOID_BUY_VOID_ALLOCATION_CUSTODY_LIVE_DURABILITY_ROLLBACK_REQUIRED_FUTURE_EVIDENCE_V1
    .reviewed_source_generation_binding_required,
  true,
);
assert.equal(
  Object.keys(
    VOID_BUY_VOID_ALLOCATION_CUSTODY_LIVE_DURABILITY_ROLLBACK_REQUIRED_FUTURE_EVIDENCE_V1,
  ).length,
  20,
);

assert.equal(
  VOID_BUY_VOID_ALLOCATION_CUSTODY_LIVE_DURABILITY_ROLLBACK_AUTHORITY_V1
    .source_only_contract,
  true,
);
assert.equal(
  VOID_BUY_VOID_ALLOCATION_CUSTODY_LIVE_DURABILITY_ROLLBACK_AUTHORITY_V1
    .read_only_collection_sufficient,
  false,
);
assert.equal(
  VOID_BUY_VOID_ALLOCATION_CUSTODY_LIVE_DURABILITY_ROLLBACK_AUTHORITY_V1
    .separately_authorized_storage_mutation_required,
  true,
);
assert.equal(
  VOID_BUY_VOID_ALLOCATION_CUSTODY_LIVE_DURABILITY_ROLLBACK_AUTHORITY_V1
    .separately_authorized_live_rollback_test_required,
  true,
);

for (const key of [
  "production_gate_ready",
  "host_execution_authorized",
  "filesystem_read_authorized",
  "filesystem_write_authorized",
  "storage_mutation_authorized",
  "rollback_test_authorized",
  "service_mutation_authorized",
  "credential_access_authorized",
  "wallet_or_signer_access_authorized",
  "payment_acceptance_authorized",
  "public_presale_activation_authorized",
  "wc_void_market_activation_authorized",
  "transaction_submission_authorized",
  "treasury_or_liquidity_action_authorized",
  "funds_movement",
  "production_host_evidence_authority",
]) {
  assert.equal(
    VOID_BUY_VOID_ALLOCATION_CUSTODY_LIVE_DURABILITY_ROLLBACK_AUTHORITY_V1[key],
    false,
    key,
  );
}

const good = Object.freeze({
  rollback_independence_policy_qualified: true,
  live_policy_observation_proven: true,
  policy_file_installation_proven: true,
  external_transport_authenticated: true,
  external_witness_storage_proven: true,
  live_remote_read_performed: true,
  live_remote_append_performed: true,
  external_second_control_domain_qualified: true,
  external_second_control_policy_binding_proven: true,
  post_cycle_live_policy_observation_bound: true,
});

const ready =
  classifyBuyVoidAllocationCustodyLiveDurabilityRollbackContractV1(good);
assert.equal(
  ready.marker,
  VOID_BUY_VOID_ALLOCATION_CUSTODY_LIVE_DURABILITY_ROLLBACK_CONTRACT_V1,
);
assert.equal(
  ready.status,
  "source_prerequisites_bound_controlled_challenge_required",
);
assert.equal(ready.source_contract_ready, true);
assert.equal(ready.reviewed_prerequisites_bound, true);
assert.deepEqual(ready.missing_prerequisites, []);
assert.equal(ready.read_only_collection_sufficient, false);
assert.equal(ready.controlled_live_challenge_required, true);
assert.equal(
  ready.next_action,
  "SEPARATELY_AUTHORIZE_NONCUSTOMER_CUSTODY_DURABILITY_ROLLBACK_CHALLENGE_V1",
);

for (const key of [
  "live_durable_storage_proven",
  "rollback_resistance_proven",
  "protected_high_water_custody_proven",
  "independent_custody_proven",
  "production_gate_ready",
  "host_execution_authorized",
  "storage_mutation_authorized",
  "rollback_test_authorized",
  "payment_acceptance_authorized",
  "public_presale_activation_authorized",
  "wc_void_market_activation_authorized",
  "transaction_submission_authorized",
  "treasury_or_liquidity_action_authorized",
  "funds_movement",
  "production_host_evidence_authority",
]) {
  assert.equal(ready[key], false, key);
}

for (const key of Object.keys(good)) {
  const held =
    classifyBuyVoidAllocationCustodyLiveDurabilityRollbackContractV1({
      ...good,
      [key]: false,
    });
  assert.equal(held.status, "held", key);
  assert.equal(held.reason, "reviewed_prerequisites_missing", key);
  assert.equal(held.source_contract_ready, false, key);
  assert.ok(held.missing_prerequisites.includes(key), key);
}

const smuggled =
  classifyBuyVoidAllocationCustodyLiveDurabilityRollbackContractV1({
    ...good,
    live_durable_storage_proven: true,
  });
assert.equal(smuggled.status, "held");
assert.equal(smuggled.reason, "input_shape_invalid");
assert.equal(smuggled.live_durable_storage_proven, false);
assert.equal(smuggled.rollback_resistance_proven, false);
assert.equal(smuggled.independent_custody_proven, false);

const source = fs.readFileSync(
  "tools/void-buy-allocation-custody-live-durability-rollback-contract-v1.mjs",
  "utf8",
);
for (const forbidden of [
  "node:fs",
  "child_process",
  "node:net",
  "node:http",
  "node:https",
  "systemctl",
  "/usr/bin/sudo",
  "execFile",
  "spawn(",
  "writeFile",
]) {
  assert.equal(source.includes(forbidden), false, forbidden);
}

console.log(
  "VOID_BUY_VOID_ALLOCATION_CUSTODY_LIVE_DURABILITY_ROLLBACK_CONTRACT_V1_PROOF_GREEN",
);
console.log("parent_host_evidence_plan_bound=true");
console.log("reviewed_lane2_primitives_bound=true");
console.log("runtime_economic_tree_unchanged=true");
console.log("read_only_collection_sufficient=false");
console.log("controlled_live_challenge_required=true");
console.log("non_customer_canary_domain_required=true");
console.log("operation_bound_authorization_required=true");
console.log("reviewed_source_generation_binding_required=true");
console.log("live_rollback_test_required=true");
console.log("live_durable_storage_proven=false");
console.log("rollback_resistance_proven=false");
console.log("protected_high_water_custody_proven=false");
console.log("independent_custody_proven=false");
console.log("host_execution_authorized=false");
console.log("storage_mutation_authorized=false");
console.log("rollback_test_authorized=false");
console.log("payment_acceptance_authorized=false");
console.log("public_presale_activation_authorized=false");
console.log("funds_movement=false");
console.log(
  "next_action=SEPARATELY_AUTHORIZE_NONCUSTOMER_CUSTODY_DURABILITY_ROLLBACK_CHALLENGE_V1",
);
