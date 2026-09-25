#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

const deployed = JSON.parse(
  fs.readFileSync("ops/mainnet/void-mainnet.deployed.json", "utf8"),
);
const candidate = JSON.parse(
  fs.readFileSync("ops/mainnet0/wc-void-production-candidate-v1.json", "utf8"),
);
const privateCheckpoint = fs.readFileSync(
  "docs/operations/void-private-chain2050-checkpoint-v1.md",
  "utf8",
);
const nativeStore = fs.readFileSync(
  "docs/operators/native-account-state-store-contract-v1.md",
  "utf8",
);
const presaleContract = fs.readFileSync(
  "src/economic/buy_void_payment_keyed_runtime_activation_configuration_contract_v1.ts",
  "utf8",
);
const identityDoc = fs.readFileSync(
  "docs/operators/coupled-economic-execution-layer-identity-v1.md",
  "utf8",
);

assert.equal(deployed.chainId, 2050);
assert.equal(deployed.source_of_truth_rpc, "http://127.0.0.1:8545");
assert.match(
  String(deployed.contracts.VoidToken || "").toLowerCase(),
  /^0x470075b85352eb86f7d089fb9ba88945f12aad94$/,
);

assert.match(
  privateCheckpoint,
  /private Chain-2050 Anvil RPC used by bounded VOID economic tooling/,
);
assert.match(privateCheckpoint, /anvil_dumpState/);

assert.match(nativeStore, /source-only and unmounted/);
assert.match(nativeStore, /module mounted: false/);
assert.match(nativeStore, /canonical block executor wired: false/);

assert.equal(candidate.economic_execution_layer_identity_resolved, false);
assert.equal(
  candidate.economic_execution_layer_public_verification_ready,
  false,
);
assert.equal(candidate.native_gas_currency_supply_accounting_ready, false);

for (const marker of [
  "economic_execution_layer_identity_not_resolved",
  "economic_execution_layer_public_verification_not_ready",
  "native_gas_currency_supply_accounting_not_ready",
]) {
  assert.ok(presaleContract.includes(marker), marker);
}

for (const marker of [
  "current_economic_rpc_is_private_anvil: true",
  "public_p2p_chain_and_private_evm_relationship_requires_explicit_resolution: true",
  "independent_public_voidtoken_verification_required: true",
  "native_gas_currency_supply_accounting_required: true",
]) {
  assert.ok(presaleContract.includes(marker), marker);
}

assert.match(
  identityDoc,
  /Current audited source does \*\*not\*\* prove that the private Anvil block\/state\s+history is the same history as the public P2P\/block runtime/m,
);
assert.match(
  identityDoc,
  /economic_execution_layer_identity_resolved=false/,
);
assert.match(
  identityDoc,
  /economic_execution_layer_public_verification_ready=false/,
);
assert.match(
  identityDoc,
  /native_gas_currency_supply_accounting_ready=false/,
);

assert.match(identityDoc, /Explicit economic EVM layer/);
assert.match(identityDoc, /Canonical-chain migration/);
assert.match(identityDoc, /performs no RPC call/);

console.log("VOID_COUPLED_ECONOMIC_EXECUTION_LAYER_IDENTITY_V1_PROOF_GREEN");
console.log("economic_rpc_private_anvil=true");
console.log("public_private_execution_history_binding_proven=false");
console.log("native_account_store_runtime_mounted=false");
console.log("economic_execution_layer_identity_resolved=false");
console.log("economic_execution_layer_public_verification_ready=false");
console.log("native_gas_currency_supply_accounting_ready=false");
console.log("public_economic_activation_authorized=false");
console.log("funds_moved=false");
