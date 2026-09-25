#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

const evidence = JSON.parse(
  fs.readFileSync(
    "ops/mainnet0/wc-void-market-vault-deployment-observation-evidence-v1.json",
    "utf8",
  ),
);
const candidate = JSON.parse(
  fs.readFileSync(
    "ops/mainnet0/wc-void-production-candidate-v1.json",
    "utf8",
  ),
);

assert.equal(
  evidence.marker,
  "VOID_WC_VOID_MARKET_VAULT_DEPLOYMENT_OBSERVATION_EVIDENCE_V1",
);
assert.equal(evidence.version, 1);
assert.equal(evidence.status, "observed_hold_on_deployer_balance");
assert.equal(
  evidence.source_head,
  "36300133daf8e85c032613e3a66fb8612b9307c4",
);
assert.equal(evidence.chain_id, 2050);
assert.equal(
  evidence.deployer_address,
  "0x907ea7d0d57f5631219674bdf666a7e929613074",
);
assert.equal(
  evidence.observation_json_sha256,
  "f4154d928766c74cad326643c2f46ad0322b917fae593e94a030d8d80046ce5c",
);

const o = evidence.observation;
assert.equal(o.block_number, "37392");
assert.equal(
  o.block_hash,
  "0x739679fd9f9b6f96213c440350980a1b590324c9152b7c394c81ce3627c94f52",
);
assert.equal(o.deployer_has_code, false);
assert.equal(o.latest_nonce, "0");
assert.equal(o.pending_nonce, "0");
assert.equal(o.pending_transactions_present, false);
assert.equal(
  o.predicted_contract_address,
  "0x210b006e39a78d02330ae648262025d8fa22e9f0",
);
assert.equal(o.deployer_balance_wei, "0");
assert.equal(o.base_fee_per_gas_wei, "7");
assert.equal(o.observed_priority_fee_per_gas_wei, "1000000000");
assert.equal(o.proposed_max_fee_per_gas_wei, "3000000000");
assert.equal(o.proposed_max_priority_fee_per_gas_wei, "1000000000");
assert.equal(o.observed_two_x_base_plus_priority_wei, "1000000014");
assert.equal(o.fee_caps_sufficient, true);
assert.equal(o.deployment_gas_estimate, "1852535");
assert.equal(o.deployment_gas_multiplier_bps, "12000");
assert.equal(o.proposed_deployment_gas_limit, "2223042");
assert.equal(o.proposed_max_deployment_cost_wei, "6669126000000000");
assert.equal(o.deployer_balance_sufficient_for_max_cost, false);
assert.equal(
  o.deployment_data_sha256,
  "1b305177c47ec43cbfc69b59646e6ab8b7a3d7eb53adfc08ff3d8f9ece5e73a7",
);
assert.equal(o.exact_authorized_constructor_payload_bound, true);
assert.equal(o.pending_nonce_revalidated, true);
assert.equal(o.observation_block_hash_revalidated, true);

assert.equal(evidence.decision.observation_verified, true);
assert.equal(evidence.decision.deployer_identity_verified, true);
assert.equal(evidence.decision.nonce_verified, true);
assert.equal(evidence.decision.predicted_contract_address_verified, true);
assert.equal(evidence.decision.fee_caps_sufficient, true);
assert.equal(evidence.decision.deployment_gas_envelope_verified, true);
assert.equal(evidence.decision.deployer_balance_sufficient, false);
assert.equal(
  evidence.decision.next_gate,
  "separate_bounded_deployer_gas_funding_authorization",
);

for (const [key, value] of Object.entries(evidence.authority)) {
  if (key === "source_only_evidence") {
    assert.equal(value, true, key);
  } else {
    assert.equal(value, false, key);
  }
}

assert.equal(
  candidate.market_vault_deployer_observation_evidence_path,
  "ops/mainnet0/wc-void-market-vault-deployment-observation-evidence-v1.json",
);
assert.equal(
  candidate.market_vault_deployer_observation_json_sha256,
  evidence.observation_json_sha256,
);
assert.equal(
  candidate.market_vault_deployer_observation_block_number,
  o.block_number,
);
assert.equal(
  candidate.market_vault_deployer_observation_block_hash,
  o.block_hash,
);
assert.equal(candidate.market_vault_deployer_observation_verified, true);
assert.equal(candidate.market_vault_deployer_pending_nonce, o.pending_nonce);
assert.equal(
  candidate.market_vault_predicted_contract_address.toLowerCase(),
  o.predicted_contract_address,
);
assert.equal(
  candidate.market_vault_deployment_gas_estimate,
  o.deployment_gas_estimate,
);
assert.equal(
  candidate.market_vault_proposed_deployment_gas_limit,
  o.proposed_deployment_gas_limit,
);
assert.equal(
  candidate.market_vault_proposed_max_deployment_cost_wei,
  o.proposed_max_deployment_cost_wei,
);
assert.equal(
  candidate.market_vault_deployer_balance_wei,
  o.deployer_balance_wei,
);
assert.equal(candidate.market_vault_deployer_balance_sufficient, false);
assert.equal(candidate.market_vault_fee_caps_sufficient, true);

console.log(
  "VOID_WC_VOID_MARKET_VAULT_DEPLOYMENT_OBSERVATION_EVIDENCE_V1_PROOF_GREEN",
);
console.log("deployer_address=" + evidence.deployer_address);
console.log("pending_nonce=0");
console.log(
  "predicted_contract_address=" + o.predicted_contract_address,
);
console.log("deployment_gas_estimate=" + o.deployment_gas_estimate);
console.log(
  "proposed_deployment_gas_limit=" + o.proposed_deployment_gas_limit,
);
console.log(
  "proposed_max_deployment_cost_wei=" +
    o.proposed_max_deployment_cost_wei,
);
console.log("fee_caps_sufficient=true");
console.log("deployer_balance_wei=0");
console.log("deployer_balance_sufficient=false");
console.log("deployment_authorized=false");
console.log("deployer_funding_authorized=false");
console.log("transaction_signing=false");
console.log("transaction_broadcast=false");
console.log("deployment=false");
console.log("inventory_funding=false");
console.log("market_activation=false");
console.log("public_presale_activation=false");
console.log("funds_movement=false");
