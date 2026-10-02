#!/usr/bin/env node
// VOID_WC_VOID_MARKET_VAULT_GAS_CENSUS_V1
import assert from "node:assert/strict";
import fs from "node:fs";
import { execFileSync } from "node:child_process";

const VAULT = "contracts/mainnet/WCVoidMarketVaultV2.sol";
const TOKEN = "contracts/epoch2/VoidEpoch2TokenV1.sol";
const TEST = "test/mainnet/WCVoidMarketVaultV2GasCensus.t.sol";
const DOC = "docs/operators/wc-void-market-vault-gas-census-v1.md";
const WORKFLOW = ".github/workflows/void-wc-void-market-vault-gas-census-v1.yml";
const ACCEPTED =
  "ops/mainnet0/wc-void-market-vault-compiled-identity-acceptance-v1.json";
const HOLDER_MANIFEST =
  "ops/mainnet0/economic-epoch2-contract-holder-destination-manifest-v1.json";

const EXPECTED_VAULT_BLOB = "bd11190e2c22f58ac60918ecdf603f53427cadd0";
const EXPECTED_TOKEN_BLOB = "7c4297aadbc17b6214b4dde1f1766523cb499923";
const EXPECTED_VAULT_ID =
  "voidwcvci1_51841520b1db294e44023c127bbe7caa28d8f87a97c788109b6609222941125a";
const EXPECTED_VAULT_SOURCE_SHA256 =
  "2ac773c7580f5a5d477d12da62e1a597d64c174395af8b20b721873a63138925";

function read(path) {
  return fs.readFileSync(path, "utf8");
}

function git(...args) {
  return execFileSync("/usr/bin/git", ["--no-replace-objects", ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    env: {
      PATH: "/usr/bin:/bin",
      HOME: process.env.HOME || "/tmp",
      LANG: "C",
      LC_ALL: "C",
      GIT_CONFIG_NOSYSTEM: "1",
      GIT_CONFIG_GLOBAL: "/dev/null",
      GIT_OPTIONAL_LOCKS: "0",
    },
  }).trim();
}

function need(source, token, label = token) {
  assert.ok(source.includes(token), `missing ${label}`);
}

const test = read(TEST);
const doc = read(DOC);
const workflow = read(WORKFLOW);
const accepted = JSON.parse(read(ACCEPTED));
const holderManifest = JSON.parse(read(HOLDER_MANIFEST));

assert.equal(git("rev-parse", `HEAD:${VAULT}`), EXPECTED_VAULT_BLOB);
assert.equal(git("rev-parse", `HEAD:${TOKEN}`), EXPECTED_TOKEN_BLOB);

assert.equal(
  accepted?.accepted_identity?.identity_id,
  EXPECTED_VAULT_ID,
);
assert.equal(
  accepted?.source?.contract_source_sha256,
  EXPECTED_VAULT_SOURCE_SHA256,
);
assert.equal(
  accepted?.compiler_profile?.semantic_version,
  "0.8.24",
);
assert.equal(
  accepted?.compiler_profile?.release,
  "0.8.24+commit.e11b9ed9",
);
assert.equal(
  accepted?.compiler_profile?.evm_version,
  "paris",
);
assert.equal(
  accepted?.compiler_profile?.optimizer_enabled,
  false,
);
assert.equal(
  accepted?.compiler_profile?.optimizer_runs,
  200,
);
assert.equal(
  accepted?.compiler_profile?.via_ir,
  false,
);
assert.equal(
  holderManifest?.void_token?.successor_runtime_source_path,
  TOKEN,
);
assert.equal(
  holderManifest?.void_token?.successor_runtime_source_git_blob_sha1,
  EXPECTED_TOKEN_BLOB,
);
assert.equal(
  holderManifest?.void_token?.successor_runtime_reviewed,
  true,
);
assert.equal(
  holderManifest?.void_token?.successor_runtime_semantic_equivalence_verified,
  true,
);

for (const required of [
  'import "../../contracts/mainnet/WCVoidMarketVaultV2.sol";',
  'import "../../contracts/epoch2/VoidEpoch2TokenV1.sol";',
  "SIGNED_INTENT_MAX_GAS = 3_000_000",
  "TOKEN_OWNER =",
  "0x54ded2DAA618a257093556A5F54c43805b9BD516",
  "vm.prank(TOKEN_OWNER);",
  "token.mint(address(vault), CAP);",
  "vm.prank(EXECUTOR);",
  "vault.settleVoid(LAUNCH, settlementId, recipient, amountAtoms);",
  "snapshotGasLastCall(string calldata name)",
  "executionGas = vm.snapshotGasLastCall(snapshotName);",
  "gasUsed = 21_000;",
  "callData[i] == bytes1(0) ? 4 : 16",
  "measuredTransactionGas = executionGas + intrinsicGas;",
  "gas_census_exceeds_signed_intent_max",
  "settle_void_first",
  "settle_void_subsequent",
]) {
  need(test, required);
}

for (const forbidden of [
  "createFork(",
  "selectFork(",
  "rpcUrl",
  "ffi(",
  "broadcast(",
  "startBroadcast(",
  "privateKey",
]) {
  assert.equal(
    test.includes(forbidden),
    false,
    `gas census must remain isolated: ${forbidden}`,
  );
}

for (const required of [
  "measurement-only",
  "3,000,000",
  "VoidEpoch2TokenV1",
  "WCVoidMarketVaultV2",
  "does not select",
  "snapshotGasLastCall",
]) {
  need(doc, required, `doc:${required}`);
}

for (const required of [
  "ghcr.io/foundry-rs/foundry:v1.7.1",
  "--use 0.8.24",
  "--evm-version paris",
  "--gas-report",
  "FORGE_SNAPSHOT_EMIT=false",
  "-vvvv",
  "WCVoidMarketVaultV2GasCensus.t.sol",
  "settle_void_first_execution_gas",
  "settle_void_first_measured_tx_gas",
  "settle_void_subsequent_execution_gas",
  "settle_void_subsequent_measured_tx_gas",
  EXPECTED_VAULT_BLOB,
  EXPECTED_TOKEN_BLOB,
]) {
  need(workflow, required, `workflow:${required}`);
}


for (const forbidden of ["--optimize", "--optimizer-runs"]) {
  assert.equal(
    workflow.includes(forbidden),
    false,
    `workflow must preserve optimizer-disabled profile: ${forbidden}`,
  );
}

console.log("VOID_WC_VOID_MARKET_VAULT_GAS_CENSUS_V1_PROOF_GREEN");
console.log(`vault_git_blob_sha1=${EXPECTED_VAULT_BLOB}`);
console.log(`token_git_blob_sha1=${EXPECTED_TOKEN_BLOB}`);
console.log(`accepted_vault_identity_id=${EXPECTED_VAULT_ID}`);
console.log("isolated_foundry_measurement=true");
console.log("production_rpc=false");
console.log("production_transaction=false");
console.log("production_budget_selected=false");
