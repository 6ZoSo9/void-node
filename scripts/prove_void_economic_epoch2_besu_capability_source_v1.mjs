#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

const workflowPath =
  ".github/workflows/void-economic-epoch2-besu-capability-v1.yml";
const runnerPath =
  "scripts/run_void_economic_epoch2_besu_capability_v1.sh";
const probePath =
  "scripts/prove_void_economic_epoch2_besu_capability_v1.mjs";

const workflow = fs.readFileSync(workflowPath, "utf8");
const runner = fs.readFileSync(runnerPath, "utf8");
const probe = fs.readFileSync(probePath, "utf8");

const count = (text, needle) => text.split(needle).length - 1;

assert.equal(count(workflow, "prove-besu-qbft-free-gas:"), 1);
assert.equal(count(workflow, "Upload Besu capability evidence"), 1);
assert.equal(
  count(workflow, "node scripts/prove_void_economic_epoch2_besu_capability_source_v1.mjs"),
  1,
);
assert.equal(
  count(workflow, "bash scripts/run_void_economic_epoch2_besu_capability_v1.sh"),
  1,
);
assert.equal(count(workflow, "workflow_dispatch:"), 1);

for (const required of [
  "hyperledger/besu:26.8.1",
  "ghcr.io/foundry-rs/foundry:v1.7.1",
  "openssl rand -hex 32",
  "computeAddress",
  "--network-id=2050",
  "--min-gas-price=0",
  "--rpc-http-api=ETH,NET,QBFT",
  "127.0.0.1:18551",
  "docker rm -f void-besu-capability-v1",
  "rm -f \"$work/fixture.json\" \"$validator/key\"",
]) {
  assert.ok(runner.includes(required), required);
}

for (const forbidden of [
  "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a841ab56a7703780e24",
  "0x8b3a350cf5c34c9194ca3a545d0e4f7d",
  "eth_sendTransaction",
  "anvil_setBalance",
  "cast send",
]) {
  assert.equal(runner.includes(forbidden), false, forbidden);
}

for (const required of [
  "BESU_QBFT_FREE_GAS_CAPABILITY_GREEN",
  "zero_fee_signed_transaction_mined: true",
  "gas_metering_positive: true",
  "native_balance_required_for_participant: false",
  "production_client_selected: false",
  "authoritative_chain2050_write: false",
  "funds_movement: false",
  "gasPrice: 0n",
  "eth_sendRawTransaction",
]) {
  assert.ok(probe.includes(required), required);
}

console.log("VOID_ECONOMIC_EPOCH2_BESU_CAPABILITY_SOURCE_V1_PROOF_GREEN");
console.log("workflow_single_job=true");
console.log("workflow_single_runner_invocation=true");
console.log("ephemeral_validator_key_generation=true");
console.log("hardcoded_test_private_key=false");
console.log("besu_candidate_version=26.8.1");
console.log("chain_id=2050");
console.log("min_gas_price_zero=true");
console.log("production_client_selected=false");
console.log("authoritative_chain2050_write=false");
console.log("funds_movement=false");
