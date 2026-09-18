#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  getCreateAddress,
} from "ethers";

import {
  VOID_BUY_VOID_PRESALE_FULFILLMENT_DEPLOYMENT_RESOLUTION_OBSERVER_AUTHORITY_V1,
  VOID_BUY_VOID_PRESALE_FULFILLMENT_DEPLOYMENT_RESOLUTION_OBSERVER_V1,
  observeBuyVoidPresaleFulfillmentDeploymentResolutionV1,
} from "../tools/buy-void-presale-fulfillment-deployment-resolution-observer-v1.mjs";

const ROOT = process.cwd();
const identity = JSON.parse(
  fs.readFileSync(
    path.join(
      ROOT,
      "ops/mainnet0/buy-void-presale-fulfillment-compiled-identity-v1.json",
    ),
    "utf8",
  ),
);

const DEPLOYER =
  "0x3333333333333333333333333333333333333333";
const TOKEN =
  "0x470075b85352eb86f7d089fb9ba88945f12aad94";
const FULFILLER =
  "0xc884f631c3881b8b672bfcbf019c856146cd7f73";
const PREDECESSOR =
  "0x0000000000000000000000000000000000000000";
const HEAD_HASH =
  "0x" + "6".repeat(64);
const FUTURE = getCreateAddress({
  from: DEPLOYER,
  nonce: 7,
}).toLowerCase();

function input(transport, override = {}) {
  return {
    rpc_url:
      "http://127.0.0.1:8545/",
    deployer_address: DEPLOYER,
    void_token_address: TOKEN,
    fulfiller_address: FULFILLER,
    predecessor_address: PREDECESSOR,
    max_fee_per_gas_wei:
      "3000000000",
    max_priority_fee_per_gas_wei:
      "1000000000",
    gas_limit_multiplier_bps:
      "12000",
    request_timeout_ms: 5000,
    max_response_bytes: 65536,
    compiled_identity: identity,
    transport,
    ...override,
  };
}

function fixture(options = {}) {
  const calls = [];
  let pendingReads = 0;
  let blockReads = 0;

  const transport = async (call) => {
    calls.push(structuredClone(call));
    switch (call.method) {
      case "eth_chainId":
        return options.wrongChain
          ? "0x1"
          : "0x802";
      case "eth_blockNumber":
        return "0x64";
      case "eth_getBlockByNumber":
        blockReads += 1;
        return {
          number: "0x64",
          hash:
            options.blockDrift &&
            blockReads > 1
              ? "0x" + "7".repeat(64)
              : HEAD_HASH,
          baseFeePerGas:
            options.highBaseFee
              ? "0x77359400"
              : "0x3b9aca00",
        };
      case "eth_getTransactionCount": {
        const tag = call.params?.[1];
        if (tag === "pending") {
          pendingReads += 1;
          if (
            options.pendingDrift &&
            pendingReads > 1
          ) {
            return "0x8";
          }
          return "0x7";
        }
        return "0x7";
      }
      case "eth_getBalance":
        return options.lowBalance
          ? "0x1"
          : "0x8ac7230489e80000";
      case "eth_maxPriorityFeePerGas":
        return options.highPriority
          ? "0x77359400"
          : "0x1dcd6500";
      case "eth_estimateGas":
        return "0xf4240";
      default:
        throw new Error(
          "unexpected_method:" +
            call.method,
        );
    }
  };

  return {
    calls,
    transport,
  };
}

{
  const f = fixture();
  const result =
    await observeBuyVoidPresaleFulfillmentDeploymentResolutionV1(
      input(f.transport),
    );
  assert.equal(result.ok, true);
  if (result.ok === false) {
    throw new Error(result.reason);
  }
  assert.equal(
    result.marker,
    VOID_BUY_VOID_PRESALE_FULFILLMENT_DEPLOYMENT_RESOLUTION_OBSERVER_V1,
  );
  assert.equal(
    result.status,
    "deployment_resolution_observed_held_on_runtime_gas_ceiling_and_deployer_review",
  );
  assert.equal(
    result.read_only_observation_complete,
    true,
  );
  assert.equal(
    result.deployer_reviewed,
    false,
  );
  assert.equal(
    result.payment_keyed_runtime_gas_ceiling_resolved,
    false,
  );
  assert.equal(
    result.observation.deployer_address,
    DEPLOYER,
  );
  assert.equal(
    result.observation.latest_nonce,
    "7",
  );
  assert.equal(
    result.observation.pending_nonce,
    "7",
  );
  assert.equal(
    result.observation.pending_transactions_present,
    false,
  );
  assert.equal(
    result.observation.future_contract_address,
    FUTURE,
  );
  assert.equal(
    result.observation.base_fee_per_gas_wei,
    "1000000000",
  );
  assert.equal(
    result.observation.observed_priority_fee_per_gas_wei,
    "500000000",
  );
  assert.equal(
    result.observation.observed_two_x_base_plus_priority_wei,
    "2500000000",
  );
  assert.equal(
    result.observation.inherited_fee_caps_sufficient,
    true,
  );
  assert.equal(
    result.observation.deployment_gas_estimate,
    "1000000",
  );
  assert.equal(
    result.observation.proposed_deployment_gas_limit,
    "1200000",
  );
  assert.equal(
    result.observation.proposed_max_deployment_cost_wei,
    "3600000000000000",
  );
  assert.equal(
    result.observation.deployer_balance_sufficient_for_max_cost,
    true,
  );
  assert.equal(
    result.observation.pending_nonce_revalidated,
    true,
  );
  assert.equal(
    result.observation.observation_block_hash_revalidated,
    true,
  );
  assert.equal(
    result.observation.payment_keyed_runtime_gas_ceiling_resolved,
    false,
  );
  assert.equal(f.calls.length, 10);
  assert.deepEqual(
    [...new Set(
      f.calls.map(
        (call) => call.method,
      ),
    )].sort(),
    [
      "eth_chainId",
      "eth_blockNumber",
      "eth_getBlockByNumber",
      "eth_getTransactionCount",
      "eth_getBalance",
      "eth_maxPriorityFeePerGas",
      "eth_estimateGas",
    ].sort(),
  );
  assert.equal(
    result.signing_performed,
    false,
  );
  assert.equal(
    result.transaction_construction_performed,
    false,
  );
  assert.equal(
    result.transaction_broadcast_performed,
    false,
  );
  assert.equal(
    result.deployment_performed,
    false,
  );
}

{
  const f = fixture({
    wrongChain: true,
  });
  const result =
    await observeBuyVoidPresaleFulfillmentDeploymentResolutionV1(
      input(f.transport),
    );
  assert.equal(result.ok, false);
  if (result.ok) {
    throw new Error(
      "wrong chain unexpectedly ready",
    );
  }
  assert.equal(
    result.reason,
    "deployment_resolution_chain_id_mismatch",
  );
  assert.deepEqual(
    f.calls.map(
      (call) => call.method,
    ),
    ["eth_chainId"],
  );
}

{
  const f = fixture({
    pendingDrift: true,
  });
  const result =
    await observeBuyVoidPresaleFulfillmentDeploymentResolutionV1(
      input(f.transport),
    );
  assert.equal(result.ok, false);
  if (result.ok) {
    throw new Error(
      "pending nonce drift unexpectedly ready",
    );
  }
  assert.equal(
    result.reason,
    "deployment_resolution_revalidation_mismatch",
  );
}

{
  const f = fixture({
    blockDrift: true,
  });
  const result =
    await observeBuyVoidPresaleFulfillmentDeploymentResolutionV1(
      input(f.transport),
    );
  assert.equal(result.ok, false);
  if (result.ok) {
    throw new Error(
      "block drift unexpectedly ready",
    );
  }
  assert.equal(
    result.reason,
    "deployment_resolution_revalidation_mismatch",
  );
}

{
  const f = fixture({
    lowBalance: true,
  });
  const result =
    await observeBuyVoidPresaleFulfillmentDeploymentResolutionV1(
      input(f.transport),
    );
  assert.equal(result.ok, true);
  if (result.ok === false) {
    throw new Error(result.reason);
  }
  assert.equal(
    result.status,
    "deployment_resolution_observed_held_on_fee_or_balance_and_runtime_gas_ceiling",
  );
  assert.equal(
    result.observation.deployer_balance_sufficient_for_max_cost,
    false,
  );
}

{
  const f = fixture({
    highBaseFee: true,
  });
  const result =
    await observeBuyVoidPresaleFulfillmentDeploymentResolutionV1(
      input(f.transport),
    );
  assert.equal(result.ok, true);
  if (result.ok === false) {
    throw new Error(result.reason);
  }
  assert.equal(
    result.status,
    "deployment_resolution_observed_held_on_fee_or_balance_and_runtime_gas_ceiling",
  );
  assert.equal(
    result.observation.inherited_fee_caps_sufficient,
    false,
  );
}

{
  const f = fixture();
  const result =
    await observeBuyVoidPresaleFulfillmentDeploymentResolutionV1(
      input(
        f.transport,
        {
          rpc_url:
            "https://example.com/",
        },
      ),
    );
  assert.equal(result.ok, false);
  if (result.ok) {
    throw new Error(
      "remote RPC unexpectedly accepted",
    );
  }
  assert.equal(
    result.reason,
    "deployment_resolution_input_invalid",
  );
  assert.equal(f.calls.length, 0);
}

{
  const f = fixture();
  const result =
    await observeBuyVoidPresaleFulfillmentDeploymentResolutionV1(
      input(
        f.transport,
        {
          deployer_address:
            "not-an-address",
        },
      ),
    );
  assert.equal(result.ok, false);
  if (result.ok) {
    throw new Error(
      "bad deployer unexpectedly accepted",
    );
  }
  assert.equal(
    result.reason,
    "deployment_resolution_input_invalid",
  );
  assert.equal(f.calls.length, 0);
}

for (const [key, expected] of Object.entries({
  explicit_deployer_address_required: true,
  canonical_chain_id: "2050",
  loopback_http_only: true,
  pending_nonce_revalidation_required: true,
  observation_block_hash_revalidation_required:
    true,
  exact_creation_data_required: true,
  create_address_derived_only: true,
  inherited_fee_caps_checked_not_changed:
    true,
  deployment_gas_limit_derived_from_estimate:
    true,
  payment_keyed_runtime_gas_ceiling_resolved:
    false,
  rpc_mutation: false,
  filesystem_read: false,
  filesystem_write: false,
  credential_access: false,
  wallet_access: false,
  signing: false,
  transaction_construction: false,
  transaction_broadcast: false,
  deployment: false,
  chain2050_mutation: false,
  inventory_funding: false,
  runtime_enablement_change: false,
  production_configuration_mutation: false,
  public_activation: false,
  automatic_retry: false,
  money_movement: false,
})) {
  assert.equal(
    VOID_BUY_VOID_PRESALE_FULFILLMENT_DEPLOYMENT_RESOLUTION_OBSERVER_AUTHORITY_V1[
      key
    ],
    expected,
    key,
  );
}

const source = fs.readFileSync(
  path.join(
    ROOT,
    "tools/buy-void-presale-fulfillment-deployment-resolution-observer-v1.mjs",
  ),
  "utf8",
);
for (const forbidden of [
  "eth_sendRawTransaction",
  "eth_sendTransaction",
  "personal_",
  "admin_",
  "debug_",
  "private_key",
  "mnemonic",
  "broadcastTransaction",
  "sendTransaction",
  "Wallet(",
  "systemctl",
]) {
  assert.equal(
    source.includes(forbidden),
    false,
    "observer contains forbidden operation " +
      forbidden,
  );
}

console.log(
  "VOID_BUY_VOID_PRESALE_FULFILLMENT_DEPLOYMENT_RESOLUTION_OBSERVER_V1_PROOF_GREEN",
);
console.log("explicit_deployer_required=true");
console.log("loopback_http_only=true");
console.log("pending_nonce_revalidated=true");
console.log("observation_block_hash_revalidated=true");
console.log("future_create_address_derived=true");
console.log("inherited_fee_caps_observed_only=true");
console.log("deployment_gas_estimate_read_only=true");
console.log("deployer_reviewed=false");
console.log("payment_keyed_runtime_gas_ceiling_resolved=false");
console.log("transaction_construction=false");
console.log("signing=false");
console.log("transaction_broadcast=false");
console.log("deployment=false");
console.log("chain2050_mutation=false");
