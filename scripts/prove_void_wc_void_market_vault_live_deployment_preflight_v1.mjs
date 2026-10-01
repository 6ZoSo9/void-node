#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";

import {
  VOID_WC_VOID_MARKET_VAULT_LIVE_DEPLOYMENT_PREFLIGHT_AUTHORITY_V1,
  VOID_WC_VOID_MARKET_VAULT_LIVE_DEPLOYMENT_PREFLIGHT_V1,
  collectVoidWcVoidMarketVaultLiveDeploymentObservationsV1,
  validateLoopbackRpcUrlV1,
} from "../tools/void-wc-void-market-vault-live-deployment-preflight-v1.mjs";

const REMOTE = "https://github.com/6ZoSo9/void-node.git";
const VOID_TOKEN = "0x470075b85352eb86f7d089fb9ba88945f12aad94";
const OPENING_INVENTORY = 10000000000000000000000000n;
const DEPLOYER = "0x" + "1".repeat(40);
const INVENTORY_SOURCE = "0x" + "2".repeat(40);
const LAUNCH_CONTROLLER = "0x" + "3".repeat(40);
const NOW = 2_000_000_000n;

function canonicalJson(value) {
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number" && Number.isSafeInteger(value)) {
    return String(value);
  }
  if (Array.isArray(value)) return "[" + value.map(canonicalJson).join(",") + "]";
  if (value && typeof value === "object") {
    return (
      "{" +
      Object.keys(value)
        .sort()
        .map((key) => JSON.stringify(key) + ":" + canonicalJson(value[key]))
        .join(",") +
      "}"
    );
  }
  throw new Error("proof_canonical_value_invalid");
}

function sha256(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function qualificationId(value) {
  const copy = structuredClone(value);
  delete copy.qualification_id;
  return "voidwcvrdq1_" + sha256(Buffer.from(canonicalJson(copy), "utf8"));
}

function hex(value) {
  return "0x" + BigInt(value).toString(16);
}

function word(value) {
  return "0x" + BigInt(value).toString(16).padStart(64, "0");
}

function sourceIdentity() {
  return Object.freeze({
    head: "a".repeat(40),
    tree: "b".repeat(40),
    canonical_remote_url: REMOTE,
  });
}

function qualification(overrides = {}) {
  const deploymentData = "0x6001600055";
  const deploymentBytes = Buffer.from(deploymentData.slice(2), "hex");
  const value = {
    marker: "VOID_WC_VOID_MARKET_VAULT_ROLE_DEPLOYMENT_QUALIFICATION_V1",
    version: 1,
    status: "QUALIFIED_DEPLOYMENT_PREPARATION_READY_NOT_AUTHORIZED",
    chain_id: 2050,
    execution_epoch: 2,
    coupled_launch_id:
      "sha256:fe02b5c813adea98f55e8587759df9316f7a8d5f1123114dc851cbad863fdc26",
    source_binding: {
      source_head_sha: "a".repeat(40),
      source_tree_sha: "b".repeat(40),
      canonical_remote_url: REMOTE,
    },
    launch_controller: {
      address: LAUNCH_CONTROLLER,
      control_verified: true,
      role_binding_authorized: false,
      reverified_at_unix: String(NOW - 60n),
      valid_until_unix: String(NOW + 600n),
    },
    deployment_preparation: {
      deployment_data_hex: deploymentData,
      deployment_data_bytes: deploymentBytes.length,
      deployment_data_sha256: sha256(deploymentBytes),
      exact_creation_payload_ready: true,
      deployer_selected: false,
      nonce_observed: false,
      fee_observed: false,
      transaction_envelope_ready: false,
      deployment_authorized: false,
      inventory_funding_authorized: false,
    },
    next_gate:
      "separately_authorized_exact_market_vault_deployment_and_inventory_lock",
    authority: {
      deployment: false,
      inventory_funding: false,
      transaction_signing: false,
      transaction_broadcast: false,
      funds_movement: false,
    },
  };

  function merge(target, patch) {
    for (const [key, patchValue] of Object.entries(patch)) {
      if (
        patchValue &&
        typeof patchValue === "object" &&
        !Array.isArray(patchValue) &&
        target[key] &&
        typeof target[key] === "object" &&
        !Array.isArray(target[key])
      ) {
        merge(target[key], patchValue);
      } else {
        target[key] = patchValue;
      }
    }
  }
  merge(value, overrides);
  value.qualification_id = qualificationId(value);
  return value;
}

function rpcFixture({
  chainId = 2050n,
  deployerBalance = 10n ** 18n,
  gasPrice = 1_000_000_000n,
  gasEstimate = 250_000n,
  inventoryBalance = OPENING_INVENTORY,
  nonceBefore = 7n,
  nonceAfter = nonceBefore,
  confirmationHash,
  confirmationStateRoot,
} = {}) {
  const block = {
    number: "0x64",
    hash: "0x" + "1".repeat(64),
    stateRoot: "0x" + "2".repeat(64),
  };
  let nonceCalls = 0;
  const calls = [];

  const rpc = async (method, params) => {
    calls.push({ method, params: structuredClone(params) });
    if (method === "eth_chainId") return hex(chainId);
    if (method === "eth_getBlockByNumber") {
      if (params[0] === "latest") return block;
      assert.equal(params[0], block.number);
      return {
        ...block,
        hash: confirmationHash ?? block.hash,
        stateRoot: confirmationStateRoot ?? block.stateRoot,
      };
    }
    if (method === "eth_getTransactionCount") {
      nonceCalls += 1;
      assert.equal(params[0], DEPLOYER);
      assert.equal(params[1], "pending");
      return hex(nonceCalls === 1 ? nonceBefore : nonceAfter);
    }
    if (method === "eth_getBalance") {
      assert.deepEqual(params, [DEPLOYER, block.number]);
      return hex(deployerBalance);
    }
    if (method === "eth_gasPrice") return hex(gasPrice);
    if (method === "eth_estimateGas") {
      assert.equal(params.length, 2);
      assert.equal(params[0].from, DEPLOYER);
      assert.equal(params[0].value, "0x0");
      assert.equal(params[0].data, "0x6001600055");
      assert.equal(params[1], block.number);
      return hex(gasEstimate);
    }
    if (method === "eth_call") {
      assert.equal(params.length, 2);
      assert.equal(params[0].to, VOID_TOKEN);
      assert.equal(
        params[0].data,
        "0x70a08231" + INVENTORY_SOURCE.slice(2).padStart(64, "0"),
      );
      assert.equal(params[1], block.number);
      return word(inventoryBalance);
    }
    throw new Error("unexpected_method:" + method);
  };

  return Object.freeze({ rpc, calls, block });
}

async function collect(options = {}) {
  const fixture = rpcFixture(options.rpc || {});
  const result =
    await collectVoidWcVoidMarketVaultLiveDeploymentObservationsV1({
      rpc: fixture.rpc,
      qualification: options.qualification || qualification(),
      sourceIdentity: options.sourceIdentity || sourceIdentity(),
      deployerAddress: DEPLOYER,
      inventorySourceAddress: INVENTORY_SOURCE,
      nowUnix: options.nowUnix ?? NOW.toString(),
    });
  return { result, fixture };
}

async function rejectsAsync(fn, pattern) {
  let error = null;
  try {
    await fn();
  } catch (caught) {
    error = caught;
  }
  assert(error instanceof Error);
  assert.match(error.message, pattern);
}

assert.equal(
  VOID_WC_VOID_MARKET_VAULT_LIVE_DEPLOYMENT_PREFLIGHT_V1,
  "VOID_WC_VOID_MARKET_VAULT_LIVE_DEPLOYMENT_PREFLIGHT_V1",
);

const trueKeys = new Set([
  "live_observation_only",
  "exact_current_qualification_required",
  "qualification_content_id_rederived",
  "private_qualification_input_descriptor_bound",
  "loopback_rpc_required",
  "rpc_redirect_forbidden",
  "read_only_rpc",
  "operator_selected_public_deployer",
  "operator_selected_public_inventory_source",
  "stable_pending_nonce_required",
  "coherent_block_observation_required",
  "block_bound_deployment_gas_estimate_required",
  "bare_deployment_cost_observation",
  "inventory_balance_observation",
]);
for (const [key, value] of Object.entries(
  VOID_WC_VOID_MARKET_VAULT_LIVE_DEPLOYMENT_PREFLIGHT_AUTHORITY_V1,
)) {
  assert.equal(value, trueKeys.has(key), key);
}
assert.equal(
  VOID_WC_VOID_MARKET_VAULT_LIVE_DEPLOYMENT_PREFLIGHT_AUTHORITY_V1
    .qualification_reexecution_performed,
  false,
);

const green = await collect();
assert.equal(
  green.result.status,
  "LIVE_DEPLOYMENT_OBSERVATION_GREEN_NOT_AUTHORIZED",
);
assert.equal(green.result.preflight_ready, true);
assert.match(green.result.preflight_id, /^voidwcmvldp1_[0-9a-f]{64}$/u);
assert.equal(green.result.chain_id, 2050);
assert.equal(green.result.source_binding.source_head_sha, "a".repeat(40));
assert.equal(
  green.result.qualification.qualification_id,
  qualification().qualification_id,
);
assert.equal(
  green.result.qualification.qualification_reexecution_performed,
  false,
);
assert.equal(green.result.operator_selection.deployer_address, DEPLOYER);
assert.equal(
  green.result.operator_selection.inventory_source_address,
  INVENTORY_SOURCE,
);
assert.equal(green.result.operator_selection.selection_authorized, false);
assert.equal(green.result.chain_observation.pending_deployer_nonce, "7");
assert.equal(green.result.chain_observation.pending_nonce_stable, true);
assert.equal(green.result.chain_observation.observed_deployment_gas_estimate, "250000");
assert.equal(
  green.result.chain_observation.bare_estimated_deployment_cost_wei,
  "250000000000000",
);
assert.equal(green.result.chain_observation.bare_gas_balance_sufficient, true);
assert.equal(green.result.chain_observation.gas_limit_policy_selected, false);
assert.equal(green.result.chain_observation.fee_policy_selected, false);
assert.equal(green.result.chain_observation.transaction_envelope_ready, false);
assert.equal(
  green.result.inventory_observation.required_opening_inventory_atoms,
  OPENING_INVENTORY.toString(),
);
assert.equal(
  green.result.inventory_observation.observed_inventory_source_balance_atoms,
  OPENING_INVENTORY.toString(),
);
assert.equal(green.result.inventory_observation.inventory_balance_sufficient, true);
assert.equal(green.result.inventory_observation.funding_transaction_ready, false);
assert.equal(green.result.inventory_observation.funding_authorized, false);
assert.equal(
  green.result.next_gate,
  "explicit_deployment_authorization_and_transaction_construction",
);

assert.deepEqual(
  green.fixture.calls.map((row) => row.method),
  [
    "eth_chainId",
    "eth_getBlockByNumber",
    "eth_getTransactionCount",
    "eth_getBalance",
    "eth_gasPrice",
    "eth_estimateGas",
    "eth_call",
    "eth_getTransactionCount",
    "eth_getBlockByNumber",
  ],
);

const noGas = await collect({
  rpc: { deployerBalance: 1n },
});
assert.equal(
  noGas.result.status,
  "LIVE_DEPLOYMENT_OBSERVATION_HOLD_NOT_AUTHORIZED",
);
assert.equal(noGas.result.preflight_ready, false);
assert.equal(noGas.result.chain_observation.bare_gas_balance_sufficient, false);
assert.equal(noGas.result.inventory_observation.inventory_balance_sufficient, true);

const noInventory = await collect({
  rpc: { inventoryBalance: OPENING_INVENTORY - 1n },
});
assert.equal(
  noInventory.result.status,
  "LIVE_DEPLOYMENT_OBSERVATION_HOLD_NOT_AUTHORIZED",
);
assert.equal(noInventory.result.preflight_ready, false);
assert.equal(noInventory.result.chain_observation.bare_gas_balance_sufficient, true);
assert.equal(
  noInventory.result.inventory_observation.inventory_balance_sufficient,
  false,
);

await rejectsAsync(
  () => collect({ rpc: { chainId: 1n } }),
  /market_vault_live_preflight_wrong_chain/u,
);

await rejectsAsync(
  () => collect({ rpc: { nonceBefore: 7n, nonceAfter: 8n } }),
  /market_vault_live_preflight_pending_nonce_changed/u,
);

await rejectsAsync(
  () =>
    collect({
      rpc: { confirmationHash: "0x" + "f".repeat(64) },
    }),
  /market_vault_live_preflight_observed_block_changed/u,
);

await rejectsAsync(
  () =>
    collect({
      qualification: qualification({
        source_binding: { source_head_sha: "c".repeat(40) },
      }),
    }),
  /market_vault_live_preflight_qualification_source_generation_mismatch/u,
);

await rejectsAsync(
  () =>
    collect({
      qualification: qualification({
        launch_controller: {
          valid_until_unix: String(NOW - 1n),
        },
      }),
    }),
  /market_vault_live_preflight_qualification_not_current/u,
);

{
  const bad = qualification();
  bad.deployment_preparation.deployment_data_sha256 = "0".repeat(64);
  bad.qualification_id = qualificationId(bad);
  await rejectsAsync(
    () => collect({ qualification: bad }),
    /market_vault_live_preflight_deployment_data_identity_mismatch/u,
  );
}

{
  const bad = qualification();
  bad.deployment_preparation.deployment_authorized = true;
  bad.qualification_id = qualificationId(bad);
  await rejectsAsync(
    () => collect({ qualification: bad }),
    /market_vault_live_preflight_deployment_preparation_invalid/u,
  );
}

assert.equal(
  validateLoopbackRpcUrlV1("http://127.0.0.1:8545"),
  "http://127.0.0.1:8545/",
);
assert.equal(
  validateLoopbackRpcUrlV1("http://localhost:8545/rpc"),
  "http://localhost:8545/rpc",
);
assert.match(
  validateLoopbackRpcUrlV1("http://[::1]:8545"),
  /^http:\/\/\[::1\]:8545\/$/u,
);
for (const url of [
  "http://example.com:8545",
  "http://127.0.0.1:8545/?x=1",
  "http://user:pass@127.0.0.1:8545",
  "ftp://127.0.0.1:8545",
]) {
  assert.throws(
    () => validateLoopbackRpcUrlV1(url),
    /market_vault_live_preflight_/u,
  );
}

const source = fs.readFileSync(
  "tools/void-wc-void-market-vault-live-deployment-preflight-v1.mjs",
  "utf8",
);
for (const forbidden of [
  "eth_sendRawTransaction",
  "eth_sendTransaction",
  "personal_sign",
  "eth_signTransaction",
  "new Wallet(",
  "signTransaction(",
  "systemctl",
]) {
  assert.equal(source.includes(forbidden), false, forbidden);
}
for (const required of [
  'redirect: "error"',
  '"eth_getTransactionCount"',
  '"eth_getBalance"',
  '"eth_gasPrice"',
  '"eth_estimateGas"',
  '"eth_call"',
  "O_NOFOLLOW",
  "fstatSync",
  "qualification_reexecution_performed: false",
  "transaction_envelope_construction: false",
  "deployment: false",
  "inventory_funding: false",
  "funds_movement: false",
]) {
  assert.equal(source.includes(required), true, required);
}

console.log("VOID_WC_VOID_MARKET_VAULT_LIVE_DEPLOYMENT_PREFLIGHT_V1_PROOF");
console.log("injected_rpc_only=true");
console.log("loopback_rpc_required=true");
console.log("rpc_redirect_forbidden=true");
console.log("same_block_balance_inventory_and_gas_estimate=true");
console.log("stable_pending_nonce_required=true");
console.log("bare_gas_sufficiency_observation_only=true");
console.log("inventory_balance_observation_only=true");
console.log("qualification_reexecution_performed=false");
console.log("transaction_envelope_ready=false");
console.log("deployment_authorized=false");
console.log("inventory_funding_authorized=false");
console.log("transaction_signing=false");
console.log("transaction_broadcast=false");
console.log("funds_movement=false");
console.log("VOID_WC_VOID_MARKET_VAULT_LIVE_DEPLOYMENT_PREFLIGHT_V1_GREEN");
