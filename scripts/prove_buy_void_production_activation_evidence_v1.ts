#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  VOID_BUY_VOID_PAYMENT_KEYED_PRODUCTION_CONFIGURATION_VERIFIER_V1,
  verifyBuyVoidPaymentKeyedProductionConfigurationV1,
} from "../src/economic/buy_void_payment_keyed_production_configuration_verifier_v1.js";
import {
  VOID_BUY_VOID_ERC20_PRODUCTION_CREDENTIAL_BINDING_EVIDENCE_ID_V1,
} from "../src/economic/buy_void_erc20_production_credential_binding_evidence_v1.js";

const ROOT = process.cwd();

const candidatePath = path.join(
  ROOT,
  "ops/mainnet0/buy-void-payment-keyed-production-candidate-v1.json",
);
const evidencePath = path.join(
  ROOT,
  "ops/mainnet0/buy-void-production-activation-evidence-v1.json",
);

const candidate = JSON.parse(
  fs.readFileSync(candidatePath, "utf8"),
) as Record<string, any>;
const evidence = JSON.parse(
  fs.readFileSync(evidencePath, "utf8"),
) as Record<string, any>;

assert.equal(
  candidate.marker,
  "VOID_BUY_VOID_PAYMENT_KEYED_PRODUCTION_CANDIDATE_V1",
);
assert.equal(candidate.version, 1);
assert.equal(
  candidate.status,
  "dormant_candidate_verified_pending_activation_authorization",
);
assert.equal(
  candidate.source_main_commit,
  "98cbbe6216e9c6828fc1c18c49b5b67a5f98d5b9",
);
assert.equal(
  candidate.accepted_production_runtime_gas_ceiling,
  "320000",
);

assert.equal(
  evidence.marker,
  "VOID_BUY_VOID_PRODUCTION_ACTIVATION_EVIDENCE_V1",
);
assert.equal(evidence.version, 1);
assert.equal(evidence.chain_id, "2050");
assert.equal(
  evidence.source_main_commit,
  candidate.source_main_commit,
);

assert.equal(
  evidence.contracts.void_token,
  "0x470075b85352eb86f7d089fb9ba88945f12aad94",
);
assert.equal(
  evidence.contracts.fulfillment,
  "0xa40a43adfd174f88309173cb3daa6e09c10154a7",
);
assert.equal(
  evidence.contracts.fulfillment_wallet,
  "0xc884f631c3881b8b672bfcbf019c856146cd7f73",
);
assert.equal(
  evidence.contracts.predecessor,
  "0x0000000000000000000000000000000000000000",
);

assert.equal(evidence.deployment.receipt_status, "1");
assert.equal(evidence.deployment.block_number, "37373");
assert.equal(
  evidence.deployment.transaction_hash,
  "0x36d9763907e86f6623f2a548269211ffc8e04f69e1e05622e7486bf61708622b",
);
for (const key of [
  "confirmation_floor_satisfied",
  "creation_transaction_exact_match",
  "create_address_exact_match",
  "runtime_code_exact_match",
  "immutable_token_exact_match",
  "immutable_fulfiller_exact_match",
  "immutable_predecessor_exact_match",
  "contract_views_exact_match",
  "deployment_attested",
]) {
  assert.equal(
    evidence.deployment[key],
    true,
    "deployment evidence " + key,
  );
}
assert.equal(
  evidence.deployment.deployment_attestation_id,
  "voidbvpfda1_bdf7aa4d8821c0f724960e588f5dddecb25985c28665f525323ab0627a56d2b3",
);
assert.equal(
  evidence.deployment.checkpoint.selected_for_restart,
  true,
);

assert.equal(
  evidence.inventory_funding.target_atoms,
  "10000000000000000000000000",
);
assert.equal(
  evidence.inventory_funding.send_to_ops.receipt_status,
  "1",
);
assert.equal(
  evidence.inventory_funding.send_to_ops.selected_for_restart,
  true,
);
assert.equal(
  evidence.inventory_funding.ops_spend.receipt_status,
  "1",
);
assert.equal(
  evidence.inventory_funding.post_state.inventory_funding_verified,
  true,
);
assert.equal(
  evidence.inventory_funding.post_state.fulfillment_balance_atoms,
  evidence.inventory_funding.target_atoms,
);
assert.equal(
  evidence.inventory_funding.post_state.max_inventory_atoms,
  evidence.inventory_funding.target_atoms,
);
assert.equal(
  evidence.inventory_funding.post_state.total_fulfilled_atoms,
  "0",
);
assert.equal(
  evidence.inventory_funding.post_state.remaining_inventory_atoms,
  evidence.inventory_funding.target_atoms,
);
assert.equal(
  evidence.inventory_funding.checkpoint.selected_for_restart,
  true,
);

const gas = evidence.production_gas_observation;
assert.equal(gas.live_estimated_transaction_gas, "149005");
assert.equal(gas.live_candidate_multiplier_bps, "15000");
assert.equal(gas.rounding_quantum_gas, "10000");
assert.equal(gas.live_candidate_runtime_gas_ceiling, "230000");
assert.equal(gas.local_lower_bound_candidate, "320000");
assert.equal(
  gas.accepted_production_runtime_gas_ceiling,
  "320000",
);
assert.equal(
  gas.production_runtime_gas_ceiling_accepted,
  true,
);
assert.equal(gas.state_unchanged_after_estimate, true);
assert.equal(gas.real_void_token_execution_path, true);

const estimate = BigInt(gas.live_estimated_transaction_gas);
const multiplier = BigInt(gas.live_candidate_multiplier_bps);
const quantum = BigInt(gas.rounding_quantum_gas);
const lowerBound = BigInt(gas.local_lower_bound_candidate);
const multiplied =
  (estimate * multiplier + 10_000n - 1n) / 10_000n;
const rounded =
  ((multiplied + quantum - 1n) / quantum) * quantum;
assert.equal(
  rounded.toString(),
  gas.live_candidate_runtime_gas_ceiling,
);
assert.equal(
  (rounded > lowerBound ? rounded : lowerBound).toString(),
  gas.accepted_production_runtime_gas_ceiling,
);

const config = candidate.candidate_configuration as Record<string, string>;

assert.equal(
  config.VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENABLED,
  "0",
);
assert.equal(
  config.VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_APPLY_ENABLED,
  "0",
);
assert.equal(
  config.VOID_BUY_VOID_PAYMENT_KEYED_CHAIN2050_RPC_URL,
  "http://127.0.0.1:8545/",
);
assert.equal(
  config.VOID_BUY_VOID_PAYMENT_KEYED_FULFILLMENT_CONTRACT_ADDRESS,
  evidence.contracts.fulfillment,
);
assert.equal(
  config.VOID_BUY_VOID_DELIVERY_TOKEN_ADDRESS,
  evidence.contracts.void_token,
);
assert.equal(
  config.VOID_BUY_VOID_NATIVE_DELIVERY_WALLET_ADDRESS,
  evidence.contracts.fulfillment_wallet,
);
assert.equal(
  config.VOID_BUY_VOID_PAYMENT_KEYED_GAS_LIMIT_MULTIPLIER_BPS,
  gas.live_candidate_multiplier_bps,
);
assert.equal(
  config.VOID_BUY_VOID_PAYMENT_KEYED_MAX_GAS_LIMIT,
  gas.accepted_production_runtime_gas_ceiling,
);
assert.equal(
  config.VOID_BUY_VOID_PAYMENT_KEYED_MAX_FEE_PER_GAS_WEI,
  "3000000000",
);
assert.equal(
  config.VOID_BUY_VOID_PAYMENT_KEYED_MAX_PRIORITY_FEE_PER_GAS_WEI,
  "1000000000",
);
assert.equal(
  config.VOID_BUY_VOID_DELIVERY_MIN_CONFIRMATIONS,
  "3",
);
assert.equal(
  config.VOID_BUY_VOID_ERC20_CREDENTIAL_BINDING_EVIDENCE_ID,
  VOID_BUY_VOID_ERC20_PRODUCTION_CREDENTIAL_BINDING_EVIDENCE_ID_V1,
);

const verification =
  verifyBuyVoidPaymentKeyedProductionConfigurationV1(
    config,
  );
if (verification.ok === false) {
  throw new Error(verification.reason);
}
assert.equal(verification.ok, true);
assert.equal(
  verification.marker,
  VOID_BUY_VOID_PAYMENT_KEYED_PRODUCTION_CONFIGURATION_VERIFIER_V1,
);
assert.equal(
  verification.candidate_configuration_values_verified,
  true,
);
assert.equal(
  verification.runtime_remains_disabled,
  true,
);
assert.equal(
  verification.runtime_apply_remains_disabled,
  true,
);
assert.equal(
  verification.credential_wallet_binding_verified,
  true,
);
assert.equal(
  verification.canonical_presale_economics_verified,
  true,
);
assert.equal(
  verification.fulfillment_contract_address,
  evidence.contracts.fulfillment,
);
assert.equal(
  verification.void_token_address,
  evidence.contracts.void_token,
);
assert.equal(
  verification.fulfillment_wallet_address,
  evidence.contracts.fulfillment_wallet,
);
assert.equal(
  verification.max_token_amount_atoms,
  evidence.inventory_funding.target_atoms,
);

for (const value of [
  candidate,
  evidence,
]) {
  const serialized = JSON.stringify(value).toLowerCase();
  for (const forbidden of [
    "private_key",
    "privatekey",
    "mnemonic",
    "raw_signed_transaction",
    "wallet-secrets.json",
  ]) {
    assert.equal(
      serialized.includes(forbidden),
      false,
      "forbidden secret-bearing field: " + forbidden,
    );
  }
}

for (const [key, expected] of Object.entries({
  runtime_enabled: false,
  runtime_apply_enabled: false,
  service_mutation: false,
  credential_read: false,
  wallet_access: false,
  signing: false,
  transaction_broadcast: false,
  funds_action: false,
  public_activation: false,
  automatic_retry: false,
})) {
  assert.equal(candidate.authority[key], expected, key);
}

assert.equal(
  evidence.activation_boundary.production_configuration_candidate_created,
  true,
);
assert.equal(evidence.activation_boundary.runtime_enabled, false);
assert.equal(evidence.activation_boundary.runtime_apply_enabled, false);
assert.equal(evidence.activation_boundary.service_mutation, false);
assert.equal(evidence.activation_boundary.credential_read, false);
assert.equal(evidence.activation_boundary.wallet_access, false);
assert.equal(evidence.activation_boundary.signing, false);
assert.equal(evidence.activation_boundary.transaction_broadcast, false);
assert.equal(evidence.activation_boundary.funds_action, false);
assert.equal(evidence.activation_boundary.public_activation, false);
assert.equal(evidence.activation_boundary.automatic_retry, false);

console.log(
  "VOID_BUY_VOID_PRODUCTION_ACTIVATION_EVIDENCE_V1_PROOF_GREEN",
);
console.log(
  "source_main_commit=" +
    candidate.source_main_commit,
);
console.log(
  "deployment_attested=true",
);
console.log(
  "inventory_funding_verified=true",
);
console.log(
  "inventory_checkpoint_selected=true",
);
console.log(
  "real_void_token_live_estimated_transaction_gas=149005",
);
console.log(
  "production_runtime_gas_ceiling_accepted=true",
);
console.log(
  "accepted_production_runtime_gas_ceiling=320000",
);
console.log(
  "production_configuration_candidate_verified=true",
);
console.log(
  "configuration_fingerprint_sha256=" +
    verification.configuration_fingerprint_sha256,
);
console.log(
  "preparation_policy_fingerprint_sha256=" +
    verification.preparation_policy_fingerprint_sha256,
);
console.log(
  "receipt_policy_fingerprint_sha256=" +
    verification.receipt_policy_fingerprint_sha256,
);
console.log(
  "runtime_enabled=false",
);
console.log(
  "runtime_apply_enabled=false",
);
console.log(
  "service_mutation=false",
);
console.log(
  "public_activation=false",
);
console.log(
  "next_gate=host_runtime_configuration_preparation_with_runtime_still_disabled",
);
