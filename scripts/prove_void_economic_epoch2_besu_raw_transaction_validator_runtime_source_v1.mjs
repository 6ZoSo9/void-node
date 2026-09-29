#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

const workflowPath =
  ".github/workflows/void-economic-epoch2-besu-raw-transaction-validator-runtime-v1.yml";
const runnerPath =
  "scripts/run_void_economic_epoch2_besu_raw_transaction_validator_runtime_v1.sh";
const verifierPath =
  "scripts/prove_void_economic_epoch2_besu_raw_transaction_validator_runtime_v1.mjs";
const pomPath = "besu-plugins/epoch2-raw-transaction-domain-v1/pom.xml";

const workflow = fs.readFileSync(workflowPath, "utf8");
const runner = fs.readFileSync(runnerPath, "utf8");
const verifier = fs.readFileSync(verifierPath, "utf8");
const pom = fs.readFileSync(pomPath, "utf8");

const count = (value, needle) => value.split(needle).length - 1;

assert.ok(
  workflow.includes(
    '"scripts/run_void_economic_epoch2_besu_raw_transaction_validator_runtime_v1.sh"',
  ),
);
assert.equal(
  count(
    workflow,
    "bash scripts/run_void_economic_epoch2_besu_raw_transaction_validator_runtime_v1.sh",
  ),
  1,
);
assert.ok(
  workflow.includes(
    '"scripts/prove_void_economic_epoch2_besu_raw_transaction_validator_runtime_source_v1.mjs"',
  ),
);
assert.equal(
  count(
    workflow,
    "node scripts/prove_void_economic_epoch2_besu_raw_transaction_validator_runtime_source_v1.mjs",
  ),
  1,
);
assert.equal(count(workflow, "Upload hosted Besu raw-domain runtime evidence"), 1);
assert.equal(count(workflow, "workflow_dispatch:"), 1);

for (const required of [
  "hyperledger/besu@sha256:6f3f21ce533383fcc8db3bce02252b59d5a9e776b72b5a1c8ecd2db011600042",
  "mvn -B -ntp",
  "maven_reproducible_build_proven=true",
  "BESU_OPTS=-Dbesu.plugins.dir=/plugins",
  "--plugins=VoidEpoch2RawTransactionDomainPlugin",
  "--Xplugins-external-enabled=true",
  "127.0.0.1:18553",
  "Registered plugin of type org.voidnetwork.besu.epoch2.VoidEpoch2RawTransactionDomainPlugin",
  "Registered new transaction validator rule",
  "openssl rand -hex 32",
  "rlp encode",
  "--type=QBFT_EXTRA_DATA",
  "--network-id=2050",
  "--min-gas-price=0",
  "--tx-pool-enable-balance-check=false",
  "docker rm -f",
  'rm -f "$validator/key"',
]) {
  assert.ok(runner.includes(required), required);
}

for (const forbidden of [
  "seed.nullfeed.org",
  "voidchain.org",
  "eth_sendTransaction",
  "cast send",
  "anvil_setBalance",
  "--plugin-continue-on-error=true",
]) {
  assert.equal(runner.includes(forbidden), false, forbidden);
}

for (const required of [
  'Wallet.createRandom()',
  'EXPECTED_PLUGIN_RPC_MESSAGE = "Plugin has marked the transaction as invalid"',
  '"legacy_type0"',
  '"missing_marker"',
  '"wrong_marker"',
  '"duplicate_marker"',
  "valid_marked_type2_accepted_and_mined=true",
  "plugin_artifact_content_addressed: true",
  "besu_transaction_validation_rule_runtime_proven: true",
  "all_production_validators_epoch_domain_enforced: false",
  "cross_epoch_replay_protection_proven: false",
  "production_rpc_contact: false",
  "authoritative_chain2050_write: false",
  "funds_movement: false",
]) {
  assert.ok(verifier.includes(required), required);
}

for (const forbidden of [
  "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a841ab56a7703780e24",
  "0x8b3a350cf5c34c9194ca3a545d0e4f7d",
  "process.env.PRIVATE_KEY",
  "process.env.WALLET",
]) {
  assert.equal(verifier.includes(forbidden), false, forbidden);
}

assert.ok(
  pom.includes(
    "<project.build.outputTimestamp>2026-09-29T00:00:00Z</project.build.outputTimestamp>",
  ),
);
assert.ok(pom.includes("<maven.compiler.release>25</maven.compiler.release>"));
assert.ok(pom.includes("<besu.version>26.8.1</besu.version>"));

console.log(
  "VOID_ECONOMIC_EPOCH2_BESU_RAW_TRANSACTION_VALIDATOR_RUNTIME_SOURCE_V1_GREEN",
);
console.log("pinned_besu_digest=true");
console.log("reproducible_plugin_jar_required=true");
console.log("ephemeral_validator_key_generation=true");
console.log("ephemeral_transaction_signer_generation=true");
console.log("plugin_requested_by_exact_simple_class_name=true");
console.log("plugin_registration_log_required=true");
console.log("loopback_rpc_only=true");
console.log("production_rpc_contact=false");
console.log("user_wallet_access=false");
console.log("authoritative_chain2050_write=false");
console.log("funds_movement=false");
