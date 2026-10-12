#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  getAddress,
  getCreateAddress,
} from "ethers";

import {
  reviewBuyVoidPresaleFulfillmentDeployerCandidateV1,
} from "../tools/buy-void-presale-fulfillment-deployer-selection-v1.mjs";
import {
  buildBuyVoidPresaleFulfillmentDeploymentDataV1,
} from "../tools/buy-void-presale-fulfillment-deployment-attestation-v1.mjs";

const ROOT = process.cwd();
const evidence = JSON.parse(
  fs.readFileSync(
    path.join(
      ROOT,
      "ops/mainnet0/buy-void-presale-fulfillment-deployer-resolution-v1.json",
    ),
    "utf8",
  ),
);
const identity = JSON.parse(
  fs.readFileSync(
    path.join(
      ROOT,
      "ops/mainnet0/buy-void-presale-fulfillment-compiled-identity-v1.json",
    ),
    "utf8",
  ),
);

assert.equal(
  evidence.marker,
  "VOID_BUY_VOID_PRESALE_FULFILLMENT_DEPLOYER_RESOLUTION_EVIDENCE_V1",
);
assert.equal(evidence.version, 1);
assert.equal(evidence.chain_id, "2050");
assert.equal(
  evidence.source_commit,
  "97fe0138e4ff32b60c8b744e4fffd94e8786a294",
);
assert.equal(
  evidence.deployer_address,
  "0x2b4d94ce678ec0bc17924b83236b714339c70b9d",
);
assert.equal(evidence.operator_selected_candidate, true);
assert.equal(evidence.known_role_collision, false);

const staticReview =
  reviewBuyVoidPresaleFulfillmentDeployerCandidateV1(
    evidence.deployer_address,
  );

assert.equal(staticReview.ok, true);
if (staticReview.ok === false) {
  throw new Error(staticReview.reason);
}
assert.equal(staticReview.known_role_collision, false);
assert.equal(staticReview.candidate_selected, false);
assert.equal(staticReview.human_selection_required, true);

const deployer = getAddress(evidence.deployer_address);
const pendingNonce = BigInt(
  evidence.observation.pending_nonce,
);
assert.equal(pendingNonce, 0n);
assert.equal(
  evidence.observation.latest_nonce,
  evidence.observation.pending_nonce,
);
assert.equal(
  evidence.observation.pending_transactions_present,
  false,
);

assert.equal(
  getCreateAddress({
    from: deployer,
    nonce: pendingNonce,
  }).toLowerCase(),
  evidence.observation.future_contract_address,
);

const estimate = BigInt(
  evidence.observation.deployment_gas_estimate,
);
const multiplier = BigInt(
  evidence.observation.deployment_gas_multiplier_bps,
);
const padded =
  (estimate * multiplier + 9999n) / 10000n;

assert.equal(
  padded.toString(),
  evidence.observation.proposed_deployment_gas_limit,
);

const maxFee = BigInt(
  evidence.observation.inherited_max_fee_per_gas_wei,
);
assert.equal(
  (
    padded * maxFee
  ).toString(),
  evidence.observation.proposed_max_deployment_cost_wei,
);

const baseFee = BigInt(
  evidence.observation.base_fee_per_gas_wei,
);
const priority = BigInt(
  evidence.observation.observed_priority_fee_per_gas_wei,
);
const priorityCap = BigInt(
  evidence.observation.inherited_max_priority_fee_per_gas_wei,
);
const observedFeeNeed =
  baseFee * 2n + priority;

assert.equal(
  observedFeeNeed.toString(),
  evidence.observation.observed_two_x_base_plus_priority_wei,
);
assert.equal(priority <= priorityCap, true);
assert.equal(observedFeeNeed <= maxFee, true);
assert.equal(
  evidence.observation.inherited_fee_caps_sufficient,
  true,
);
assert.equal(
  evidence.observation.deployer_balance_wei,
  "0",
);
assert.equal(
  evidence.observation.deployer_balance_sufficient_for_max_cost,
  false,
);

const deploymentData =
  buildBuyVoidPresaleFulfillmentDeploymentDataV1({
    compiled_identity: identity,
    void_token_address:
      "0x470075b85352eb86f7d089fb9ba88945f12aad94",
    fulfiller_address:
      "0xc884f631c3881b8b672bfcbf019c856146cd7f73",
    predecessor_address:
      "0x0000000000000000000000000000000000000000",
  });

assert.equal(
  deploymentData.deployment_data_keccak256,
  evidence.observation.constructor_deployment_data_keccak256,
);
assert.equal(
  evidence.observation.exact_creation_data_bound,
  true,
);
assert.equal(
  evidence.observation.pending_nonce_revalidated,
  true,
);
assert.equal(
  evidence.observation.observation_block_hash_revalidated,
  true,
);
assert.equal(
  evidence.runtime_gas.production_runtime_gas_ceiling_accepted,
  false,
);

for (const [key, expected] of Object.entries({
  source_only_evidence: true,
  rpc_call: false,
  credential_access: false,
  wallet_access: false,
  private_key_access: false,
  transaction_construction: false,
  signing: false,
  transaction_broadcast: false,
  deployment: false,
  chain2050_mutation: false,
  deployer_funding: false,
  inventory_funding: false,
  production_configuration_mutation: false,
  runtime_enablement_change: false,
  public_activation: false,
  money_movement: false,
})) {
  assert.equal(
    evidence.authority[key],
    expected,
    key,
  );
}

const activationSource = fs.readFileSync(
  path.join(
    ROOT,
    "src/economic/buy_void_payment_keyed_runtime_activation_configuration_contract_v1.ts",
  ),
  "utf8",
);

for (const required of [
  'fulfillment_deployer_resolution_evidence_source_ready: true',
  '"ops/mainnet0/buy-void-presale-fulfillment-deployer-resolution-v1.json"',
  'deployer_candidate_selected: true',
  'human_deployer_selection_required: false',
  'deployer_address_resolved: true',
  'deployer_address:',
  '"0x2b4d94ce678ec0bc17924b83236b714339c70b9d"',
  'deployment_nonce_resolved: true',
  'deployment_nonce: "0"',
  'resulting_contract_address_resolved: true',
  'resulting_contract_address:',
  '"0xa40a43adfd174f88309173cb3daa6e09c10154a7"',
  'deployer_balance_sufficient_for_max_cost: false',
  'unsigned_deployment_transaction_constructed: false',
  'deployment_authorized: false',
]) {
  assert.equal(
    activationSource.includes(required),
    true,
    required,
  );
}

console.log(
  "VOID_BUY_VOID_PRESALE_FULFILLMENT_DEPLOYER_RESOLUTION_EVIDENCE_V1_PROOF_GREEN",
);
console.log("operator_selected_candidate=true");
console.log("known_role_collision=false");
console.log("deployer_address_resolved=true");
console.log("deployment_nonce_resolved=true");
console.log("pending_nonce=0");
console.log("future_contract_address_resolved=true");
console.log("deployment_gas_estimate=982843");
console.log("proposed_deployment_gas_limit=1179412");
console.log("proposed_max_deployment_cost_wei=3538236000000000");
console.log("deployer_balance_sufficient_for_max_cost=false");
console.log("production_runtime_gas_ceiling_accepted=false");
console.log("transaction_construction=false");
console.log("signing=false");
console.log("transaction_broadcast=false");
console.log("deployment=false");
console.log("chain2050_mutation=false");
console.log("funds_action=false");
