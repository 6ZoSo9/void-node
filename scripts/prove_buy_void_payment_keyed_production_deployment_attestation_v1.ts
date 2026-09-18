#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  Interface,
  getCreateAddress,
} from "ethers";

import {
  VOID_BUY_VOID_PAYMENT_KEYED_PRODUCTION_DEPLOYMENT_ATTESTATION_AUTHORITY_V1,
  VOID_BUY_VOID_PAYMENT_KEYED_PRODUCTION_DEPLOYMENT_ATTESTATION_V1,
  runBuyVoidPaymentKeyedProductionDeploymentAttestationV1,
} from "../src/economic/buy_void_payment_keyed_production_deployment_attestation_v1.js";
import {
  VOID_BUY_VOID_ERC20_PRODUCTION_CREDENTIAL_BINDING_EVIDENCE_ID_V1,
  VOID_BUY_VOID_ERC20_PRODUCTION_CREDENTIAL_BINDING_EVIDENCE_RECORD_V1,
} from "../src/economic/buy_void_erc20_production_credential_binding_evidence_v1.js";

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

const {
  buildBuyVoidPresaleFulfillmentDeploymentDataV1,
  reconstructBuyVoidPresaleFulfillmentRuntimeV1,
} = await import(
  "../tools/buy-void-presale-fulfillment-deployment-attestation-v1.mjs"
);

const WALLET = String(
  VOID_BUY_VOID_ERC20_PRODUCTION_CREDENTIAL_BINDING_EVIDENCE_RECORD_V1
    .derived_wallet_address,
).toLowerCase();
const TOKEN =
  "0x1111111111111111111111111111111111111111";
const DEPLOYER =
  "0x3333333333333333333333333333333333333333";
const NONCE = 9;
const CONTRACT = getCreateAddress({
  from: DEPLOYER,
  nonce: NONCE,
}).toLowerCase();
const PREDECESSOR =
  "0x0000000000000000000000000000000000000000";
const TX_HASH =
  "0x" + "4".repeat(64);
const DEPLOY_BLOCK_HASH =
  "0x" + "5".repeat(64);
const HEAD_HASH =
  "0x" + "6".repeat(64);

const deployment =
  buildBuyVoidPresaleFulfillmentDeploymentDataV1({
    compiled_identity: identity,
    void_token_address: TOKEN,
    fulfiller_address: WALLET,
    predecessor_address: PREDECESSOR,
  });
const runtime =
  reconstructBuyVoidPresaleFulfillmentRuntimeV1({
    compiled_identity: identity,
    void_token_address: TOKEN,
    fulfiller_address: WALLET,
    predecessor_address: PREDECESSOR,
  });

const VIEWS = new Interface([
  "function voidToken() view returns (address)",
  "function fulfiller() view returns (address)",
  "function predecessor() view returns (address)",
  "function maxInventoryAtoms() view returns (uint256)",
  "function totalFulfilledAtoms() view returns (uint256)",
  "function remainingInventoryAtoms() view returns (uint256)",
]);

function candidate(
  override: Record<string, string> = {},
): Record<string, string> {
  return {
    VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENABLED:
      "0",
    VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_APPLY_ENABLED:
      "0",
    VOID_BUY_VOID_RUNTIME_DIR:
      "/var/lib/void-node/buy_void_v1/runtime-integration-v1",
    VOID_BUY_VOID_PAYMENT_KEYED_CHAIN2050_RPC_URL:
      "http://127.0.0.1:18545/",
    VOID_BUY_VOID_PAYMENT_KEYED_FULFILLMENT_CONTRACT_ADDRESS:
      CONTRACT,
    VOID_BUY_VOID_PAYMENT_KEYED_GAS_LIMIT_MULTIPLIER_BPS:
      "12000",
    VOID_BUY_VOID_PAYMENT_KEYED_MAX_GAS_LIMIT:
      "300000",
    VOID_BUY_VOID_PAYMENT_KEYED_FEE_MULTIPLIER_BPS:
      "20000",
    VOID_BUY_VOID_PAYMENT_KEYED_MAX_FEE_PER_GAS_WEI:
      "5000000000",
    VOID_BUY_VOID_PAYMENT_KEYED_MAX_PRIORITY_FEE_PER_GAS_WEI:
      "1000000000",
    VOID_BUY_VOID_DELIVERY_TOKEN_ADDRESS:
      TOKEN,
    VOID_BUY_VOID_DELIVERY_MIN_CONFIRMATIONS:
      "12",
    VOID_BUY_VOID_NATIVE_DELIVERY_WALLET_ADDRESS:
      WALLET,
    VOID_BUY_VOID_INVENTORY_POOL_ID:
      "buy-void-presale-v1",
    VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_INVENTORY_POLICY_VERSION:
      "presale-v1",
    VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_POOL_CAPACITY_VOID_UNITS:
      "10000000000000",
    VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_MAX_RESERVATION_VOID_UNITS:
      "10000000000000",
    VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_RATE_VOID_UNITS_NUMERATOR:
      "2",
    VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_RATE_VOID_UNITS_DENOMINATOR:
      "1",
    VOID_BUY_VOID_ERC20_CREDENTIAL_BINDING_EVIDENCE_ID:
      VOID_BUY_VOID_ERC20_PRODUCTION_CREDENTIAL_BINDING_EVIDENCE_ID_V1,
    CREDENTIALS_DIRECTORY:
      "/run/credentials/void-node",
    VOID_BUY_VOID_PAYMENT_KEYED_RPC_TIMEOUT_MS:
      "5000",
    VOID_BUY_VOID_PAYMENT_KEYED_RPC_MAX_RESPONSE_BYTES:
      "65536",
    ...override,
  };
}

function fixture(options: {
  wrongChain?: boolean;
  codeAbsent?: boolean;
} = {}) {
  const calls: Array<{
    method: string;
    params: unknown[];
  }> = [];

  const transport = async (call: {
    method: string;
    params: unknown[];
  }) => {
    calls.push(structuredClone(call));
    switch (call.method) {
      case "eth_chainId":
        return options.wrongChain
          ? "0x1"
          : "0x802";
      case "eth_blockNumber":
        return "0x6f";
      case "eth_getBlockByNumber":
        return {
          number: "0x6f",
          hash: HEAD_HASH,
        };
      case "eth_getTransactionByHash":
        return {
          hash: TX_HASH,
          from: DEPLOYER,
          to: null,
          nonce: "0x9",
          input:
            deployment.deployment_data,
          value: "0x0",
          chainId: "0x802",
        };
      case "eth_getTransactionReceipt":
        return {
          transactionHash: TX_HASH,
          status: "0x1",
          blockNumber: "0x64",
          blockHash:
            DEPLOY_BLOCK_HASH,
          contractAddress: CONTRACT,
        };
      case "eth_getCode":
        return options.codeAbsent
          ? "0x"
          : runtime.runtime_code;
      case "eth_call": {
        const data = String(
          (call.params?.[0] as any)?.data ||
            "",
        ).toLowerCase();
        for (const name of [
          "voidToken",
          "fulfiller",
          "predecessor",
          "maxInventoryAtoms",
          "totalFulfilledAtoms",
          "remainingInventoryAtoms",
        ]) {
          if (
            data ===
            VIEWS.encodeFunctionData(
              name,
            ).toLowerCase()
          ) {
            if (name === "voidToken") {
              return VIEWS.encodeFunctionResult(
                name,
                [TOKEN],
              );
            }
            if (name === "fulfiller") {
              return VIEWS.encodeFunctionResult(
                name,
                [WALLET],
              );
            }
            if (name === "predecessor") {
              return VIEWS.encodeFunctionResult(
                name,
                [PREDECESSOR],
              );
            }
            if (
              name ===
              "maxInventoryAtoms"
            ) {
              return VIEWS.encodeFunctionResult(
                name,
                [
                  10_000_000n *
                    10n ** 18n,
                ],
              );
            }
            if (
              name ===
              "totalFulfilledAtoms"
            ) {
              return VIEWS.encodeFunctionResult(
                name,
                [0n],
              );
            }
            if (
              name ===
              "remainingInventoryAtoms"
            ) {
              return VIEWS.encodeFunctionResult(
                name,
                [
                  10_000_000n *
                    10n ** 18n,
                ],
              );
            }
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
    await runBuyVoidPaymentKeyedProductionDeploymentAttestationV1({
      candidate_configuration:
        candidate(),
      compiled_identity: identity,
      deployment_transaction_hash:
        TX_HASH,
      transport: f.transport,
    });
  assert.equal(result.ok, true);
  if (result.ok === false) {
    throw new Error(result.reason);
  }
  assert.equal(
    result.marker,
    VOID_BUY_VOID_PAYMENT_KEYED_PRODUCTION_DEPLOYMENT_ATTESTATION_V1,
  );
  assert.equal(
    result.status,
    "production_deployment_attested_held_on_inventory_funding",
  );
  assert.equal(
    result.production_configuration_verified,
    true,
  );
  assert.equal(
    result.deployment_attested,
    true,
  );
  assert.equal(
    result.predecessor_lineage_attested,
    true,
  );
  assert.equal(
    result.genesis_predecessor,
    true,
  );
  assert.equal(
    result.inventory_funding_verified,
    false,
  );
  assert.equal(
    result.runtime_activation_authorized,
    false,
  );
  assert.equal(
    result.public_activation_authorized,
    false,
  );
  assert.equal(
    result.fulfillment_contract_address,
    CONTRACT,
  );
  assert.equal(
    result.void_token_address,
    TOKEN,
  );
  assert.equal(
    result.fulfillment_wallet_address,
    WALLET,
  );
  assert.equal(
    result.deployment_transaction_hash,
    TX_HASH,
  );
  assert.equal(
    result.deployment_attestation
      .deployment_attested,
    true,
  );
  assert.equal(
    result.next_gate,
    "presale_inventory_funding_attestation_and_separate_activation_authorization",
  );
  assert.equal(f.calls.length, 14);
}

{
  const f = fixture();
  const result =
    await runBuyVoidPaymentKeyedProductionDeploymentAttestationV1({
      candidate_configuration:
        candidate({
          VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENABLED:
            "1",
        }),
      compiled_identity: identity,
      deployment_transaction_hash:
        TX_HASH,
      transport: f.transport,
    });
  assert.equal(result.ok, false);
  if (result.ok) {
    throw new Error(
      "enabled candidate unexpectedly ready",
    );
  }
  assert.match(
    result.reason,
    /^production_deployment_attestation_configuration_held:/,
  );
  assert.equal(f.calls.length, 0);
}

{
  const f = fixture();
  const result =
    await runBuyVoidPaymentKeyedProductionDeploymentAttestationV1({
      candidate_configuration:
        candidate({
          VOID_BUY_VOID_PAYMENT_KEYED_FULFILLMENT_CONTRACT_ADDRESS:
            "0x7777777777777777777777777777777777777777",
        }),
      compiled_identity: identity,
      deployment_transaction_hash:
        TX_HASH,
      transport: f.transport,
    });
  assert.equal(result.ok, false);
  if (result.ok) {
    throw new Error(
      "wrong configured contract unexpectedly ready",
    );
  }
  assert.match(
    result.reason,
    /^production_deployment_attestation_observer_held:/,
  );
}

{
  const f = fixture({
    wrongChain: true,
  });
  const result =
    await runBuyVoidPaymentKeyedProductionDeploymentAttestationV1({
      candidate_configuration:
        candidate(),
      compiled_identity: identity,
      deployment_transaction_hash:
        TX_HASH,
      transport: f.transport,
    });
  assert.equal(result.ok, false);
  if (result.ok) {
    throw new Error(
      "wrong chain unexpectedly ready",
    );
  }
  assert.match(
    result.reason,
    /^production_deployment_attestation_observer_held:/,
  );
}

{
  const f = fixture();
  const result =
    await runBuyVoidPaymentKeyedProductionDeploymentAttestationV1({
      candidate_configuration:
        candidate({
          VOID_BUY_VOID_NATIVE_DELIVERY_WALLET_ADDRESS:
            "0x8888888888888888888888888888888888888888",
        }),
      compiled_identity: identity,
      deployment_transaction_hash:
        TX_HASH,
      transport: f.transport,
    });
  assert.equal(result.ok, false);
  if (result.ok) {
    throw new Error(
      "wrong wallet unexpectedly ready",
    );
  }
  assert.match(
    result.reason,
    /^production_deployment_attestation_configuration_held:/,
  );
  assert.equal(f.calls.length, 0);
}

{
  const f = fixture();
  const result =
    await runBuyVoidPaymentKeyedProductionDeploymentAttestationV1({
      candidate_configuration:
        candidate(),
      compiled_identity: identity,
      deployment_transaction_hash:
        "invalid",
      transport: f.transport,
    });
  assert.equal(result.ok, false);
  if (result.ok) {
    throw new Error(
      "invalid tx hash unexpectedly ready",
    );
  }
  assert.equal(
    result.reason,
    "production_deployment_attestation_transaction_hash_invalid",
  );
  assert.equal(f.calls.length, 0);
}

for (const [key, expected] of Object.entries({
  production_configuration_verifier_required:
    true,
  candidate_runtime_must_remain_disabled:
    true,
  candidate_runtime_apply_must_remain_disabled:
    true,
  candidate_policy_is_server_binding_source:
    true,
  observer_rpc_fingerprint_must_match_verified_candidate:
    true,
  compiled_identity_required: true,
  deployment_transaction_hash_required: true,
  genesis_predecessor_only_v1: true,
  loopback_read_only_rpc_possible: true,
  rpc_mutation: false,
  credential_access: false,
  wallet_access: false,
  signing: false,
  transaction_broadcast: false,
  deployment: false,
  chain2050_mutation: false,
  inventory_funding: false,
  runtime_enablement_change: false,
  public_activation: false,
  automatic_retry: false,
  money_movement: false,
})) {
  assert.equal(
    (VOID_BUY_VOID_PAYMENT_KEYED_PRODUCTION_DEPLOYMENT_ATTESTATION_AUTHORITY_V1 as any)[key],
    expected,
    key,
  );
}

console.log(
  "VOID_BUY_VOID_PAYMENT_KEYED_PRODUCTION_DEPLOYMENT_ATTESTATION_V1_PROOF_GREEN",
);
console.log("verified_dormant_candidate_required=true");
console.log("candidate_policy_drives_observer=true");
console.log("arbitrary_wallet_policy_forbidden=true");
console.log("arbitrary_contract_policy_forbidden=true");
console.log("accepted_compiler_identity_required=true");
console.log("read_only_chain2050_observation=true");
console.log("genesis_predecessor_only_v1=true");
console.log("deployment_attested=true");
console.log("inventory_funding_verified=false");
console.log("runtime_activation_authorized=false");
console.log("public_activation_authorized=false");
