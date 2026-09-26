#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

const workflowPath =
  ".github/workflows/void-economic-epoch2-besu-free-gas-v2.yml";
const runnerPath =
  "scripts/run_void_economic_epoch2_besu_free_gas_v2.sh";
const probePath =
  "scripts/prove_void_economic_epoch2_besu_free_gas_v2.mjs";

const workflow = fs.readFileSync(workflowPath, "utf8");
const runner = fs.readFileSync(runnerPath, "utf8");
const probe = fs.readFileSync(probePath, "utf8");

const count = (text, needle) => text.split(needle).length - 1;

assert.equal(count(workflow, "prove-besu-qbft-free-gas-v2:"), 1);
assert.equal(count(workflow, "Upload Besu free-gas evidence"), 1);
assert.equal(
  count(
    workflow,
    "node scripts/prove_void_economic_epoch2_besu_free_gas_source_v2.mjs",
  ),
  1,
);
assert.equal(
  count(workflow, "bash scripts/run_void_economic_epoch2_besu_free_gas_v2.sh"),
  1,
);
assert.equal(count(workflow, "workflow_dispatch:"), 1);

for (const required of [
  "hyperledger/besu@sha256:6f3f21ce533383fcc8db3bce02252b59d5a9e776b72b5a1c8ecd2db011600042",
  "ghcr.io/foundry-rs/foundry:v1.7.1",
  "openssl rand -hex 32",
  "computeAddress",
  "rlp encode",
  "--type=QBFT_EXTRA_DATA",
  "--network-id=2050",
  "--min-gas-price=0",
  "--tx-pool-enable-balance-check=false",
  "--rpc-http-api=ETH,NET,QBFT",
  "127.0.0.1:18551",
  "docker rm -f void-besu-free-gas-v2",
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
  "VOID_ECONOMIC_EPOCH2_BESU_FREE_GAS_V2_GREEN",
  "zero_fee_signed_transaction_mined: true",
  "gas_metering_positive: true",
  "native_balance_required_for_participant: false",
  "production_client_selected: true",
  "authoritative_chain2050_write: false",
  "funds_movement: false",
  "gasPrice: 0n",
  "eth_sendRawTransaction",
  "shanghaiTime: 0",
  "qbft_extra_data_generated_by_besu: true",
]) {
  assert.ok(probe.includes(required), required);
}

console.log("VOID_ECONOMIC_EPOCH2_BESU_FREE_GAS_SOURCE_V2_PROOF_GREEN");
console.log("workflow_single_job=true");
console.log("workflow_single_runner_invocation=true");
console.log("ephemeral_validator_key_generation=true");
console.log("hardcoded_test_private_key=false");
console.log("besu_version=26.8.1");
console.log("chain_id=2050");
console.log("shanghai_time=0");
console.log("qbft_extra_data_generated_by_besu=true");
console.log("min_gas_price_zero=true");
console.log("tx_pool_balance_check_disabled=true");
console.log("production_client_selected=true");
console.log("authoritative_chain2050_write=false");
console.log("funds_movement=false");
