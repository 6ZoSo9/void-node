#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  AUTHORITY,
  VOID_WC_VOID_MARKET_VAULT_DEPLOYMENT_OBSERVER_V1,
  observeWcVoidMarketVaultDeploymentV1,
} from "../tools/void-wc-void-market-vault-deployment-observer-v1.mjs";

const compiled_identity = JSON.parse(
  fs.readFileSync(
    "ops/mainnet0/wc-void-market-vault-v2-compiled-identity-v1.json",
    "utf8",
  ),
);
const creation_bytecode_hex = fs.readFileSync(
  "ops/mainnet0/wc-void-market-vault-v2-creation-bytecode.hex",
  "utf8",
);
const prep = JSON.parse(
  fs.readFileSync(
    "ops/mainnet0/wc-void-market-vault-deployment-preparation-v1.json",
    "utf8",
  ),
);
const deployerEvidence = JSON.parse(
  fs.readFileSync(
    "ops/mainnet0/wc-void-market-vault-deployer-offline-generation-evidence-v1.json",
    "utf8",
  ),
);

const DEPLOYER = "0x4444444444444444444444444444444444444444";
const SELECTED_DEPLOYER =
  "0x907ea7d0d57f5631219674bdf666a7e929613074";
const BLOCK_HASH = "0x" + "a".repeat(64);

function transportFor({
  chainId = "0x802",
  head = "0x100",
  blockHash = BLOCK_HASH,
  baseFee = "0x7",
  code = "0x",
  latestNonce = "0x0",
  pendingNonceA = "0x0",
  pendingNonceB = "0x0",
  balance = "0x100000000000000000",
  priority = "0x3b9aca00",
  estimate = "0x1e8480",
  revalidatedBlockHash = BLOCK_HASH,
} = {}) {
  const calls = {
    eth_getTransactionCount: 0,
    eth_getBlockByNumber: 0,
  };
  return async ({ method }) => {
    switch (method) {
      case "eth_chainId":
        return chainId;
      case "eth_blockNumber":
        return head;
      case "eth_getBlockByNumber":
        calls.eth_getBlockByNumber += 1;
        return {
          number: head,
          hash:
            calls.eth_getBlockByNumber === 1
              ? blockHash
              : revalidatedBlockHash,
          baseFeePerGas: baseFee,
        };
      case "eth_getCode":
        return code;
      case "eth_getTransactionCount":
        calls.eth_getTransactionCount += 1;
        if (calls.eth_getTransactionCount === 1) return latestNonce;
        if (calls.eth_getTransactionCount === 2) return pendingNonceA;
        return pendingNonceB;
      case "eth_getBalance":
        return balance;
      case "eth_maxPriorityFeePerGas":
        return priority;
      case "eth_estimateGas":
        return estimate;
      default:
        throw new Error("unexpected RPC method: " + method);
    }
  };
}

function baseInput(overrides = {}) {
  return {
    rpc_url: "http://127.0.0.1:8545/",
    deployer_address: DEPLOYER,
    max_fee_per_gas_wei: "3000000000",
    max_priority_fee_per_gas_wei: "1000000000",
    gas_limit_multiplier_bps: "12000",
    request_timeout_ms: 5000,
    max_response_bytes: 1048576,
    compiled_identity,
    creation_bytecode_hex,
    bindings: prep.bindings,
    transport: transportFor(),
    ...overrides,
  };
}

assert.equal(
  VOID_WC_VOID_MARKET_VAULT_DEPLOYMENT_OBSERVER_V1,
  "VOID_WC_VOID_MARKET_VAULT_DEPLOYMENT_OBSERVER_V1",
);
assert.equal(AUTHORITY.explicit_deployer_address_required, true);
assert.equal(AUTHORITY.loopback_http_only, true);
assert.equal(AUTHORITY.canonical_chain_id, 2050);
assert.equal(
  deployerEvidence.marker,
  "VOID_WC_VOID_MARKET_VAULT_DEPLOYER_OFFLINE_GENERATION_EVIDENCE_V1",
);
assert.equal(deployerEvidence.chain_id, 2050);
assert.equal(deployerEvidence.host_label, "Nimo");
assert.equal(
  deployerEvidence.deployer_address.toLowerCase(),
  SELECTED_DEPLOYER,
);
assert.equal(
  deployerEvidence.public_identity_sha256,
  "7e0522e971060ae1bbe1011b01c2d64bb84234c0f7069701a4459f351ee113ac",
);
assert.equal(deployerEvidence.generation.network_offline_proven, true);
assert.equal(deployerEvidence.generation.role_reuse, false);
assert.equal(deployerEvidence.generation.private_key_mode, "600");
assert.equal(deployerEvidence.generation.private_key_printed, false);
assert.equal(deployerEvidence.generation.private_key_exported, false);
assert.equal(
  deployerEvidence.control_path.key_availability_verified_at_generation,
  true,
);
assert.equal(deployerEvidence.approval.deployer_selected, true);
assert.equal(deployerEvidence.approval.deployer_funding_authorized, false);
assert.equal(deployerEvidence.approval.deployment_authorized, false);
for (const [key, value] of Object.entries(AUTHORITY)) {
  if (
    [
      "explicit_deployer_address_required",
      "loopback_http_only",
      "canonical_chain_id",
      "read_only_rpc_methods",
      "pending_nonce_revalidation_required",
      "observation_block_hash_revalidation_required",
      "exact_authorized_constructor_payload_required",
      "create_address_derived_only",
    ].includes(key)
  ) {
    continue;
  }
  assert.equal(value, false, key);
}

{
  const result = await observeWcVoidMarketVaultDeploymentV1(baseInput());
  assert.equal(result.ok, true);
  assert.equal(result.status, "OBSERVED_READY_FOR_REVIEW");
  assert.equal(result.observation.chain_id, "2050");
  assert.equal(result.observation.deployer_address, DEPLOYER);
  assert.equal(result.observation.deployer_has_code, false);
  assert.equal(result.observation.latest_nonce, "0");
  assert.equal(result.observation.pending_nonce, "0");
  assert.equal(result.observation.pending_transactions_present, false);
  assert.match(
    result.observation.predicted_contract_address,
    /^0x[0-9a-f]{40}$/,
  );
  assert.equal(result.observation.base_fee_per_gas_wei, "7");
  assert.equal(
    result.observation.observed_priority_fee_per_gas_wei,
    "1000000000",
  );
  assert.equal(result.observation.fee_caps_sufficient, true);
  assert.equal(result.observation.deployment_gas_estimate, "2000000");
  assert.equal(result.observation.proposed_deployment_gas_limit, "2400000");
  assert.equal(
    result.observation.proposed_max_deployment_cost_wei,
    "7200000000000000",
  );
  assert.equal(
    result.observation.deployer_balance_sufficient_for_max_cost,
    true,
  );
  assert.match(result.observation.deployment_data_sha256, /^[0-9a-f]{64}$/);
  assert.equal(
    result.observation.exact_authorized_constructor_payload_bound,
    true,
  );
  assert.equal(result.observation.pending_nonce_revalidated, true);
  assert.equal(result.observation.observation_block_hash_revalidated, true);
  assert.equal(result.deployment_authorized, false);
  assert.equal(result.transaction_construction_performed, false);
  assert.equal(result.transaction_signing_performed, false);
  assert.equal(result.transaction_broadcast_performed, false);
  assert.equal(result.deployment_performed, false);
  assert.equal(result.deployer_funding_performed, false);
  assert.equal(result.inventory_funding_performed, false);
  assert.equal(result.market_activation_performed, false);
  assert.equal(result.public_presale_activation_performed, false);
  assert.equal(result.funds_movement_performed, false);
}

{
  const selected = await observeWcVoidMarketVaultDeploymentV1(
    baseInput({
      deployer_address: SELECTED_DEPLOYER,
      transport: transportFor(),
    }),
  );
  assert.equal(selected.ok, true);
  assert.equal(
    selected.observation.deployer_address,
    SELECTED_DEPLOYER,
  );
  assert.equal(selected.deployment_authorized, false);
  assert.equal(selected.deployer_funding_performed, false);
}

for (const deployer of [
  "0x2b4d94ce678ec0bc17924b83236b714339c70b9d",
  "0x2f1e0005e865b772b268bd8c797bf3eaa901d97e",
  "0xc884f631c3881b8b672bfcbf019c856146cd7f73",
  "0xe1f147b6b2671f140c4107fa4a1dd5f7cbd06d0b",
  "0x470075b85352eb86f7d089fb9ba88945f12aad94",
]) {
  const result = await observeWcVoidMarketVaultDeploymentV1(
    baseInput({ deployer_address: deployer }),
  );
  assert.equal(result.ok, false, deployer);
  assert.equal(result.reason, "deployment_observer_input_invalid", deployer);
}

{
  const result = await observeWcVoidMarketVaultDeploymentV1(
    baseInput({ rpc_url: "http://example.com:8545/" }),
  );
  assert.equal(result.ok, false);
  assert.equal(result.reason, "deployment_observer_input_invalid");
}

{
  const result = await observeWcVoidMarketVaultDeploymentV1(
    baseInput({ transport: transportFor({ chainId: "0x1" }) }),
  );
  assert.equal(result.ok, false);
  assert.equal(result.reason, "chain_id_mismatch");
}

{
  const result = await observeWcVoidMarketVaultDeploymentV1(
    baseInput({ transport: transportFor({ code: "0x6000" }) }),
  );
  assert.equal(result.ok, false);
  assert.equal(result.reason, "deployer_has_code");
}

{
  const result = await observeWcVoidMarketVaultDeploymentV1(
    baseInput({
      transport: transportFor({
        pendingNonceA: "0x1",
        pendingNonceB: "0x2",
      }),
    }),
  );
  assert.equal(result.ok, false);
  assert.equal(result.reason, "revalidation_mismatch");
}

{
  const result = await observeWcVoidMarketVaultDeploymentV1(
    baseInput({
      transport: transportFor({
        revalidatedBlockHash: "0x" + "b".repeat(64),
      }),
    }),
  );
  assert.equal(result.ok, false);
  assert.equal(result.reason, "revalidation_mismatch");
}

{
  const result = await observeWcVoidMarketVaultDeploymentV1(
    baseInput({
      transport: transportFor({
        balance: "0x0",
      }),
    }),
  );
  assert.equal(result.ok, true);
  assert.equal(result.status, "OBSERVED_HOLD_ON_FEE_OR_BALANCE");
  assert.equal(
    result.observation.deployer_balance_sufficient_for_max_cost,
    false,
  );
}

const source = fs.readFileSync(
  "tools/void-wc-void-market-vault-deployment-observer-v1.mjs",
  "utf8",
);
for (const forbidden of [
  "eth_sendRawTransaction",
  "eth_sendTransaction",
  "broadcastTransaction",
  "sendTransaction",
  "--private-key",
  "mnemonic",
]) {
  assert.equal(source.includes(forbidden), false, forbidden);
}

console.log("VOID_WC_VOID_MARKET_VAULT_DEPLOYMENT_OBSERVER_V1_PROOF_GREEN");
console.log("loopback_http_only=true");
console.log("canonical_chain_id=2050");
console.log("old_presale_deployer_reuse=false");
console.log("vault_role_reuse=false");
console.log("selected_deployer=" + SELECTED_DEPLOYER);
console.log("selected_deployer_generation_evidence_committed=true");
console.log("pending_nonce_revalidation_required=true");
console.log("observation_block_hash_revalidation_required=true");
console.log("exact_authorized_constructor_payload_required=true");
console.log("transaction_construction=false");
console.log("transaction_signing=false");
console.log("transaction_broadcast=false");
console.log("deployment=false");
console.log("deployer_funding=false");
console.log("inventory_funding=false");
console.log("market_activation=false");
console.log("public_presale_activation=false");
console.log("funds_movement=false");
