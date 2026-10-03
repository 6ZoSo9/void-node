#!/usr/bin/env node
// VOID_WC_VOID_MARKET_VAULT_ISOLATED_GAS_CENSUS_V2
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import { execFileSync } from "node:child_process";

const VAULT = "contracts/mainnet/WCVoidMarketVaultV2.sol";
const TOKEN = "contracts/epoch2/VoidEpoch2TokenV1.sol";
const TEST = "test/mainnet/WCVoidMarketVaultV2GasCensusV2.t.sol";
const DOC = "docs/operators/wc-void-market-vault-isolated-gas-census-v2.md";
const WORKFLOW =
  ".github/workflows/void-wc-void-market-vault-isolated-gas-census-v2.yml";
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
const EXPECTED_FOUNDRY_IMAGE_ID =
  "sha256:186542c36fbcb76ba9e7cbf6711dfed201218f40e762b77a6a2240f8aa6afadb";
const OBSERVED_HEAD = "1c56a9c0ec074ec198610864462634a66ce26722";
const EXPECTED_TEST_SHA256 =
  "bcc5cf5d02a75e979ca201289fc55a951aed11dff8af497aee5f95846767729a";
const EXPECTED_FIRST_ISOLATED_TX_GAS = "133515";
const EXPECTED_SUBSEQUENT_ISOLATED_TX_GAS = "99303";

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

function forbid(source, token, label = token) {
  assert.equal(source.includes(token), false, `forbidden ${label}`);
}

const test = read(TEST);
const doc = read(DOC);
const workflow = read(WORKFLOW);
const accepted = JSON.parse(read(ACCEPTED));
const holderManifest = JSON.parse(read(HOLDER_MANIFEST));
const testSha256 = crypto.createHash("sha256").update(test).digest("hex");

assert.equal(testSha256, EXPECTED_TEST_SHA256);
git("merge-base", "--is-ancestor", OBSERVED_HEAD, "HEAD");
assert.equal(
  git("rev-parse", `${OBSERVED_HEAD}:${TEST}`),
  git("rev-parse", `HEAD:${TEST}`),
);
assert.equal(git("rev-parse", `HEAD:${VAULT}`), EXPECTED_VAULT_BLOB);
assert.equal(git("rev-parse", `HEAD:${TOKEN}`), EXPECTED_TOKEN_BLOB);

assert.equal(accepted?.accepted_identity?.identity_id, EXPECTED_VAULT_ID);
assert.equal(
  accepted?.source?.contract_source_sha256,
  EXPECTED_VAULT_SOURCE_SHA256,
);
assert.equal(accepted?.compiler_profile?.semantic_version, "0.8.24");
assert.equal(
  accepted?.compiler_profile?.release,
  "0.8.24+commit.e11b9ed9",
);
assert.equal(accepted?.compiler_profile?.evm_version, "paris");
assert.equal(accepted?.compiler_profile?.optimizer_enabled, false);
assert.equal(accepted?.compiler_profile?.optimizer_runs, 200);
assert.equal(accepted?.compiler_profile?.via_ir, false);
assert.equal(
  holderManifest?.void_token?.successor_runtime_source_path,
  TOKEN,
);
assert.equal(
  holderManifest?.void_token?.successor_runtime_source_git_blob_sha1,
  EXPECTED_TOKEN_BLOB,
);
assert.equal(holderManifest?.void_token?.successor_runtime_reviewed, true);
assert.equal(
  holderManifest?.void_token?.successor_runtime_semantic_equivalence_verified,
  true,
);

for (const required of [
  'import "../../contracts/mainnet/WCVoidMarketVaultV2.sol";',
  'import "../../contracts/epoch2/VoidEpoch2TokenV1.sol";',
  "SIGNED_INTENT_MAX_GAS = 3_000_000",
  "vm.prank(TOKEN_OWNER);",
  "token.mint(address(vault), CAP);",
  "vm.prank(EXECUTOR);",
  "vault.settleVoid(LAUNCH, settlementId, recipient, amountAtoms);",
  "snapshotGasLastCall(string calldata name)",
  "isolatedTxGas = vm.snapshotGasLastCall(snapshotName);",
  "_isolated_tx_gas",
  "gas_census_v2_exceeds_signed_intent_max",
  "settle_void_first",
  "settle_void_subsequent",
]) {
  need(test, required);
}

for (const forbidden of [
  "_intrinsicGas(",
  "gasUsed = 21_000",
  "measuredTransactionGas",
  "executionGas + intrinsicGas",
  "_execution_gas",
  "_intrinsic_gas",
  "createFork(",
  "selectFork(",
  "rpcUrl",
  "ffi(",
  "broadcast(",
  "startBroadcast(",
  "privateKey",
]) {
  forbid(test, forbidden, `test:${forbidden}`);
}

for (const required of [
  "replacement measurement-only evidence",
  "generation 2 pinned",
  OBSERVED_HEAD,
  EXPECTED_TEST_SHA256,
  EXPECTED_FOUNDRY_IMAGE_ID,
  EXPECTED_FIRST_ISOLATED_TX_GAS,
  EXPECTED_SUBSEQUENT_ISOLATED_TX_GAS,
  "--isolate",
  "does not add intrinsic gas a second time",
  "snapshotGasLastCall",
  "3,000,000",
  "does not select",
  "These are measurement inputs for #2364, not a selected sponsorship budget.",
]) {
  need(doc, required, `doc:${required}`);
}
for (const forbidden of ["155967", "121743"]) {
  forbid(doc, forbidden, `doc-old-v1-value:${forbidden}`);
}

for (const required of [
  "ghcr.io/foundry-rs/foundry:v1.7.1",
  "--use 0.8.24",
  "--evm-version paris",
  "--isolate",
  "--gas-report",
  "FORGE_SNAPSHOT_EMIT=false",
  "-vvvv",
  "WCVoidMarketVaultV2GasCensusV2.t.sol",
  "settle_void_first_isolated_tx_gas",
  "settle_void_subsequent_isolated_tx_gas",
  EXPECTED_VAULT_BLOB,
  EXPECTED_TOKEN_BLOB,
  EXPECTED_FOUNDRY_IMAGE_ID,
  OBSERVED_HEAD,
  EXPECTED_TEST_SHA256,
  EXPECTED_FIRST_ISOLATED_TX_GAS,
  EXPECTED_SUBSEQUENT_ISOLATED_TX_GAS,
]) {
  need(workflow, required, `workflow:${required}`);
}

for (const forbidden of [
  "--optimize",
  "--optimizer-runs",
  "settle_void_first_execution_gas",
  "settle_void_first_intrinsic_gas",
  "settle_void_first_measured_tx_gas",
  "settle_void_subsequent_execution_gas",
  "settle_void_subsequent_intrinsic_gas",
  "settle_void_subsequent_measured_tx_gas",
  "155967",
  "121743",
]) {
  forbid(workflow, forbidden, `workflow:${forbidden}`);
}

console.log("VOID_WC_VOID_MARKET_VAULT_ISOLATED_GAS_CENSUS_V2_PROOF_GREEN");
console.log(`vault_git_blob_sha1=${EXPECTED_VAULT_BLOB}`);
console.log(`token_git_blob_sha1=${EXPECTED_TOKEN_BLOB}`);
console.log(`accepted_vault_identity_id=${EXPECTED_VAULT_ID}`);
console.log(`gas_test_sha256=${testSha256}`);
console.log(`foundry_image_id=${EXPECTED_FOUNDRY_IMAGE_ID}`);
console.log(`observed_head=${OBSERVED_HEAD}`);
console.log(`pinned_first_isolated_tx_gas=${EXPECTED_FIRST_ISOLATED_TX_GAS}`);
console.log(`pinned_subsequent_isolated_tx_gas=${EXPECTED_SUBSEQUENT_ISOLATED_TX_GAS}`);
console.log("forge_isolate_required=true");
console.log("manual_intrinsic_addition=false");
console.log("generation2_measurement_pinned=true");
console.log("production_rpc=false");
console.log("production_transaction=false");
console.log("production_budget_selected=false");
