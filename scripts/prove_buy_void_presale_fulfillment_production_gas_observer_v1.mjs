#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { Interface } from "ethers";

import {
  VOID_BUY_VOID_PRESALE_FULFILLMENT_PRODUCTION_GAS_OBSERVER_AUTHORITY_V1,
  VOID_BUY_VOID_PRESALE_FULFILLMENT_PRODUCTION_GAS_OBSERVER_V1,
  observeBuyVoidPresaleFulfillmentProductionGasV1,
} from "../tools/buy-void-presale-fulfillment-production-gas-observer-v1.mjs";
const ROOT = process.cwd();
const CONTRACT =
  "0x1111111111111111111111111111111111111111";
const TOKEN_ADDRESS =
  "0x470075b85352eb86f7d089fb9ba88945f12aad94";
const FULFILLER =
  "0xc884f631c3881b8b672bfcbf019c856146cd7f73";
const PREDECESSOR =
  "0x0000000000000000000000000000000000000000";
const RECIPIENT =
  "0x2222222222222222222222222222222222222222";
const PAYMENT_ID =
  "0x" + "ab".repeat(32);
const HEAD_HASH =
  "0x" + "6".repeat(64);

const FULFILLMENT = new Interface([
  "function voidToken() view returns (address)",
  "function fulfiller() view returns (address)",
  "function predecessor() view returns (address)",
  "function remainingInventoryAtoms() view returns (uint256)",
  "function isFulfilled(bytes32) view returns (bool)",
  "function fulfill(bytes32,address,uint256)",
]);

const TOKEN = new Interface([
  "function balanceOf(address) view returns (uint256)",
]);

function input(transport, override = {}) {
  return {
    rpc_url:
      "http://127.0.0.1:8545/",
    fulfillment_contract_address:
      CONTRACT,
    void_token_address:
      TOKEN_ADDRESS,
    fulfiller_address:
      FULFILLER,
    predecessor_address:
      PREDECESSOR,
    probe_payment_id:
      PAYMENT_ID,
    probe_recipient:
      RECIPIENT,
    probe_amount_atoms:
      "1000000000000000000",
    request_timeout_ms: 5000,
    max_response_bytes: 65536,
    transport,
    ...override,
  };
}

function fixture(options = {}) {
  const calls = [];
  let blockReads = 0;
  let fulfilledReads = 0;
  let contractBalanceReads = 0;
  let recipientBalanceReads = 0;

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
        };
      case "eth_getCode": {
        const target =
          String(call.params?.[0] || "")
            .toLowerCase();
        if (
          options.missingContractCode &&
          target === CONTRACT
        ) {
          return "0x";
        }
        if (
          options.missingTokenCode &&
          target === TOKEN_ADDRESS
        ) {
          return "0x";
        }
        return "0x60006000";
      }
      case "eth_getBalance":
        return options.noNativeGas
          ? "0x0"
          : "0xde0b6b3a7640000";
      case "eth_estimateGas":
        if (options.estimateFails) {
          throw new Error(
            "synthetic estimate failure",
          );
        }
        return options.highEstimate
          ? "0x4c4b40"
          : "0x2bf20";
      case "eth_call": {
        const tx = call.params?.[0] || {};
        const to =
          String(tx.to || "")
            .toLowerCase();
        const data =
          String(tx.data || "")
            .toLowerCase();

        if (to === CONTRACT) {
          if (
            data ===
            FULFILLMENT
              .encodeFunctionData(
                "voidToken",
              )
              .toLowerCase()
          ) {
            return FULFILLMENT
              .encodeFunctionResult(
                "voidToken",
                [
                  options.wrongToken
                    ? RECIPIENT
                    : TOKEN_ADDRESS,
                ],
              );
          }

          if (
            data ===
            FULFILLMENT
              .encodeFunctionData(
                "fulfiller",
              )
              .toLowerCase()
          ) {
            return FULFILLMENT
              .encodeFunctionResult(
                "fulfiller",
                [
                  options.wrongFulfiller
                    ? RECIPIENT
                    : FULFILLER,
                ],
              );
          }

          if (
            data ===
            FULFILLMENT
              .encodeFunctionData(
                "predecessor",
              )
              .toLowerCase()
          ) {
            return FULFILLMENT
              .encodeFunctionResult(
                "predecessor",
                [PREDECESSOR],
              );
          }

          if (
            data ===
            FULFILLMENT
              .encodeFunctionData(
                "remainingInventoryAtoms",
              )
              .toLowerCase()
          ) {
            return FULFILLMENT
              .encodeFunctionResult(
                "remainingInventoryAtoms",
                [
                  options.lowRemaining
                    ? 1n
                    : 10_000_000n *
                        10n ** 18n,
                ],
              );
          }

          const fulfilledSelector =
            FULFILLMENT
              .getFunction(
                "isFulfilled",
              )
              .selector.toLowerCase();
          if (
            data.startsWith(
              fulfilledSelector,
            )
          ) {
            fulfilledReads += 1;
            return FULFILLMENT
              .encodeFunctionResult(
                "isFulfilled",
                [
                  options.alreadyFulfilled ||
                  (options.fulfilledDrift &&
                    fulfilledReads > 1),
                ],
              );
          }
        }

        if (to === TOKEN_ADDRESS) {
          const decoded =
            TOKEN.decodeFunctionData(
              "balanceOf",
              data,
            );
          const owner =
            String(decoded[0])
              .toLowerCase();

          if (owner === CONTRACT) {
            contractBalanceReads += 1;
            return TOKEN
              .encodeFunctionResult(
                "balanceOf",
                [
                  options.lowContractBalance
                    ? 1n
                    : options.contractBalanceDrift &&
                        contractBalanceReads >
                          1
                      ? 8n *
                        10n ** 18n
                      : 10_000_000n *
                        10n ** 18n,
                ],
              );
          }

          if (owner === RECIPIENT) {
            recipientBalanceReads += 1;
            return TOKEN
              .encodeFunctionResult(
                "balanceOf",
                [
                  options.recipientHasBalance
                    ? 1n
                    : options.recipientBalanceDrift &&
                        recipientBalanceReads >
                          1
                      ? 1n
                      : 0n,
                ],
              );
          }
        }

        throw new Error(
          "unexpected_eth_call",
        );
      }
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
    await observeBuyVoidPresaleFulfillmentProductionGasV1(
      input(f.transport),
    );

  assert.equal(result.ok, true);
  if (result.ok === false) {
    throw new Error(result.reason);
  }

  assert.equal(
    result.marker,
    VOID_BUY_VOID_PRESALE_FULFILLMENT_PRODUCTION_GAS_OBSERVER_V1,
  );
  assert.equal(
    result.status,
    "production_gas_observed_candidate_unaccepted",
  );
  assert.equal(
    result.observation.live_estimated_transaction_gas,
    "180000",
  );
  assert.equal(
    result.observation.live_candidate_runtime_gas_ceiling,
    "270000",
  );
  assert.equal(
    result.observation.local_lower_bound_candidate,
    "320000",
  );
  assert.equal(
    result.observation.proposed_runtime_gas_ceiling,
    "320000",
  );
  assert.equal(
    result.observation.state_unchanged_after_estimate,
    true,
  );
  assert.equal(
    result.observation.block_hash_revalidated,
    true,
  );
  assert.equal(
    result.observation.real_void_token_execution_path,
    true,
  );
  assert.equal(
    result.production_runtime_gas_ceiling_accepted,
    false,
  );
  assert.equal(
    result.production_configuration_updated,
    false,
  );
  assert.equal(
    result.runtime_enablement_changed,
    false,
  );
  assert.equal(
    result.rpc_call_performed,
    true,
  );
  assert.equal(
    result.mutation_performed,
    false,
  );
  assert.equal(
    result.credential_access_performed,
    false,
  );
  assert.equal(
    result.wallet_access_performed,
    false,
  );
  assert.equal(
    result.signing_performed,
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
  assert.equal(
    result.chain2050_mutation_performed,
    false,
  );
  assert.equal(
    result.inventory_funding_performed,
    false,
  );
  assert.equal(
    result.production_configuration_mutation,
    false,
  );
  assert.equal(
    result.public_activation_performed,
    false,
  );
  assert.equal(
    result.money_movement_performed,
    false,
  );

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
      "eth_getCode",
      "eth_call",
      "eth_getBalance",
      "eth_estimateGas",
    ].sort(),
  );
}

async function heldReason(options, override = {}) {
  const f = fixture(options);
  const result =
    await observeBuyVoidPresaleFulfillmentProductionGasV1(
      input(
        f.transport,
        override,
      ),
    );
  assert.equal(result.ok, false);
  if (result.ok) {
    throw new Error(
      "expected held",
    );
  }
  return {
    reason: result.reason,
    calls: f.calls,
  };
}

assert.equal(
  (await heldReason({
    wrongChain: true,
  })).reason,
  "production_gas_observer_chain_id_mismatch",
);

assert.equal(
  (await heldReason({
    missingContractCode: true,
  })).reason,
  "production_gas_observer_code_missing",
);

assert.equal(
  (await heldReason({
    missingTokenCode: true,
  })).reason,
  "production_gas_observer_code_missing",
);

assert.equal(
  (await heldReason({
    wrongToken: true,
  })).reason,
  "production_gas_observer_preconditions_not_met",
);

assert.equal(
  (await heldReason({
    wrongFulfiller: true,
  })).reason,
  "production_gas_observer_preconditions_not_met",
);

assert.equal(
  (await heldReason({
    alreadyFulfilled: true,
  })).reason,
  "production_gas_observer_preconditions_not_met",
);

assert.equal(
  (await heldReason({
    recipientHasBalance: true,
  })).reason,
  "production_gas_observer_preconditions_not_met",
);

assert.equal(
  (await heldReason({
    lowRemaining: true,
  })).reason,
  "production_gas_observer_preconditions_not_met",
);

assert.equal(
  (await heldReason({
    lowContractBalance: true,
  })).reason,
  "production_gas_observer_preconditions_not_met",
);

assert.equal(
  (await heldReason({
    noNativeGas: true,
  })).reason,
  "production_gas_observer_preconditions_not_met",
);

assert.equal(
  (await heldReason({
    estimateFails: true,
  })).reason,
  "production_gas_observer_rpc_failed",
);

assert.equal(
  (await heldReason({
    fulfilledDrift: true,
  })).reason,
  "production_gas_observer_post_estimate_revalidation_mismatch",
);

assert.equal(
  (await heldReason({
    contractBalanceDrift: true,
  })).reason,
  "production_gas_observer_post_estimate_revalidation_mismatch",
);

assert.equal(
  (await heldReason({
    recipientBalanceDrift: true,
  })).reason,
  "production_gas_observer_post_estimate_revalidation_mismatch",
);

assert.equal(
  (await heldReason({
    blockDrift: true,
  })).reason,
  "production_gas_observer_post_estimate_revalidation_mismatch",
);

{
  const f = fixture();
  const result =
    await observeBuyVoidPresaleFulfillmentProductionGasV1(
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
    "production_gas_observer_input_invalid",
  );
  assert.equal(f.calls.length, 0);
}

{
  const f = fixture({
    highEstimate: true,
  });
  const result =
    await observeBuyVoidPresaleFulfillmentProductionGasV1(
      input(f.transport),
    );
  assert.equal(result.ok, true);
  if (result.ok === false) {
    throw new Error(result.reason);
  }
  assert.equal(
    result.observation.live_estimated_transaction_gas,
    "5000000",
  );
  assert.equal(
    result.observation.live_candidate_runtime_gas_ceiling,
    "7500000",
  );
  assert.equal(
    result.observation.proposed_runtime_gas_ceiling,
    "7500000",
  );
  assert.equal(
    result.production_runtime_gas_ceiling_accepted,
    false,
  );
}

const evidenceSource = fs.readFileSync(
  path.join(
    ROOT,
    "src/economic/buy_void_presale_fulfillment_local_gas_evidence_v1.ts",
  ),
  "utf8",
);

for (const required of [
  'measured_fulfill_call_gas:\n      "131047"',
  'local_candidate_runtime_gas_ceiling:\n      "320000"',
  "production_runtime_gas_ceiling_accepted:\n      false",
  'production_void_token_source_present_in_repository:\n      false',
  'exact_proven_head:\n      "f6d296772fd41dc57d3fae726e87c4ead2f10664"',
  'merged_main_commit:\n      "61e57ef10e64b372165c3ce390b9ac17456bf235"',
]) {
  assert.equal(
    evidenceSource.includes(required),
    true,
    "evidence source missing " + required,
  );
}

for (const [key, expected] of Object.entries({
  canonical_chain_id: "2050",
  loopback_http_only: true,
  fixed_block_observation: true,
  real_void_token_execution_path_required:
    true,
  zero_balance_probe_recipient_required:
    true,
  unused_payment_id_required: true,
  fulfillment_contract_inventory_required:
    true,
  estimate_gas_only: true,
  post_estimate_state_revalidation_required:
    true,
  local_lower_bound_evidence_required:
    true,
  candidate_ceiling_not_accepted: true,
  rpc_mutation: false,
  filesystem_read: false,
  filesystem_write: false,
  credential_access: false,
  wallet_access: false,
  signing: false,
  transaction_broadcast: false,
  deployment: false,
  chain2050_mutation: false,
  inventory_funding: false,
  production_configuration_mutation: false,
  runtime_enablement_change: false,
  public_activation: false,
  automatic_retry: false,
  money_movement: false,
})) {
  assert.equal(
    VOID_BUY_VOID_PRESALE_FULFILLMENT_PRODUCTION_GAS_OBSERVER_AUTHORITY_V1[
      key
    ],
    expected,
    key,
  );
}

const observerSource = fs.readFileSync(
  path.join(
    ROOT,
    "tools/buy-void-presale-fulfillment-production-gas-observer-v1.mjs",
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
    observerSource.includes(forbidden),
    false,
    "observer contains forbidden operation " +
      forbidden,
  );
}

console.log(
  "VOID_BUY_VOID_PRESALE_FULFILLMENT_PRODUCTION_GAS_OBSERVER_V1_PROOF_GREEN",
);
console.log("local_mock_call_gas=131047");
console.log("local_lower_bound_candidate=320000");
console.log("local_candidate_accepted=false");
console.log("real_void_token_path_required=true");
console.log("unused_payment_id_required=true");
console.log("zero_balance_recipient_required=true");
console.log("inventory_required_before_live_estimate=true");
console.log("state_revalidated_after_estimate=true");
console.log("production_runtime_gas_ceiling_accepted=false");
console.log("transaction_broadcast=false");
console.log("deployment=false");
console.log("chain2050_mutation=false");
