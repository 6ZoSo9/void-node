#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  Interface,
  getCreateAddress,
} from "ethers";

import {
  buildBuyVoidPresaleFulfillmentDeploymentDataV1,
  reconstructBuyVoidPresaleFulfillmentRuntimeV1,
} from "../tools/buy-void-presale-fulfillment-deployment-attestation-v1.mjs";
import {
  VOID_BUY_VOID_PRESALE_FULFILLMENT_DEPLOYMENT_OBSERVER_AUTHORITY_V1,
  VOID_BUY_VOID_PRESALE_FULFILLMENT_DEPLOYMENT_OBSERVER_V1,
  observeBuyVoidPresaleFulfillmentDeploymentV1,
} from "../tools/buy-void-presale-fulfillment-deployment-observer-v1.mjs";

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

const TOKEN =
  "0x1111111111111111111111111111111111111111";
const FULFILLER =
  "0x2222222222222222222222222222222222222222";
const PREDECESSOR =
  "0x0000000000000000000000000000000000000000";
const DEPLOYER =
  "0x3333333333333333333333333333333333333333";
const NONCE = 7;
const CONTRACT = getCreateAddress({
  from: DEPLOYER,
  nonce: NONCE,
}).toLowerCase();
const TX_HASH =
  "0x" + "4".repeat(64);
const DEPLOY_BLOCK_HASH =
  "0x" + "5".repeat(64);
const HEAD_HASH =
  "0x" + "6".repeat(64);

const VIEWS = new Interface([
  "function voidToken() view returns (address)",
  "function fulfiller() view returns (address)",
  "function predecessor() view returns (address)",
  "function maxInventoryAtoms() view returns (uint256)",
  "function totalFulfilledAtoms() view returns (uint256)",
  "function remainingInventoryAtoms() view returns (uint256)",
]);

const deployment =
  buildBuyVoidPresaleFulfillmentDeploymentDataV1({
    compiled_identity: identity,
    void_token_address: TOKEN,
    fulfiller_address: FULFILLER,
    predecessor_address: PREDECESSOR,
  });
const runtime =
  reconstructBuyVoidPresaleFulfillmentRuntimeV1({
    compiled_identity: identity,
    void_token_address: TOKEN,
    fulfiller_address: FULFILLER,
    predecessor_address: PREDECESSOR,
  });

function encodeResult(name, values) {
  return VIEWS.encodeFunctionResult(
    name,
    values,
  );
}

function fixture(options = {}) {
  const calls = [];
  let blockReads = 0;
  let receiptReads = 0;

  const transport = async (call) => {
    calls.push(structuredClone(call));
    switch (call.method) {
      case "eth_chainId":
        return options.wrongChain
          ? "0x1"
          : "0x802";
      case "eth_blockNumber":
        return "0x6f";
      case "eth_getBlockByNumber": {
        blockReads += 1;
        return {
          number: "0x6f",
          hash:
            options.reorg &&
            blockReads > 1
              ? "0x" + "7".repeat(64)
              : HEAD_HASH,
        };
      }
      case "eth_getTransactionByHash":
        return options.missingTx
          ? null
          : {
              hash: TX_HASH,
              from: DEPLOYER,
              to: null,
              nonce: "0x7",
              input:
                deployment.deployment_data,
              value: "0x0",
              chainId: "0x802",
            };
      case "eth_getTransactionReceipt":
        receiptReads += 1;
        if (options.missingReceipt) {
          return null;
        }
        return {
          transactionHash: TX_HASH,
          status: "0x1",
          blockNumber: "0x64",
          blockHash:
            options.receiptDrift &&
            receiptReads > 1
              ? "0x" + "8".repeat(64)
              : DEPLOY_BLOCK_HASH,
          contractAddress: CONTRACT,
        };
      case "eth_getCode":
        return options.codeAbsent
          ? "0x"
          : runtime.runtime_code;
      case "eth_call": {
        const data =
          String(
            call.params?.[0]?.data || "",
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
              return encodeResult(
                name,
                [TOKEN],
              );
            }
            if (name === "fulfiller") {
              return encodeResult(
                name,
                [FULFILLER],
              );
            }
            if (name === "predecessor") {
              return encodeResult(
                name,
                [PREDECESSOR],
              );
            }
            if (
              name ===
              "maxInventoryAtoms"
            ) {
              return encodeResult(
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
              return encodeResult(
                name,
                [0n],
              );
            }
            if (
              name ===
              "remainingInventoryAtoms"
            ) {
              return encodeResult(
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
          "unexpected_rpc_method:" +
            call.method,
        );
    }
  };

  return {
    calls,
    transport,
  };
}

function input(
  transport,
  override = {},
) {
  return {
    rpc_url:
      "http://127.0.0.1:18545/",
    fulfillment_contract_address:
      CONTRACT,
    void_token_address: TOKEN,
    fulfiller_address: FULFILLER,
    predecessor_address: PREDECESSOR,
    deployment_transaction_hash:
      TX_HASH,
    min_confirmations: "12",
    request_timeout_ms: 5000,
    max_response_bytes: 65536,
    compiled_identity: identity,
    transport,
    ...override,
  };
}

{
  const f = fixture();
  const result =
    await observeBuyVoidPresaleFulfillmentDeploymentV1(
      input(f.transport),
    );
  assert.equal(result.ok, true);
  if (result.ok === false) {
    throw new Error(result.reason);
  }
  assert.equal(
    result.marker,
    VOID_BUY_VOID_PRESALE_FULFILLMENT_DEPLOYMENT_OBSERVER_V1,
  );
  assert.equal(
    result.status,
    "deployment_attested_genesis_lineage_held_on_inventory_funding",
  );
  assert.equal(
    result.fixed_block_observation,
    true,
  );
  assert.equal(
    result.observation_block_hash_revalidated,
    true,
  );
  assert.equal(
    result.deployment_receipt_revalidated,
    true,
  );
  assert.equal(
    result.attestation.deployment_attested,
    true,
  );
  assert.equal(
    result.attestation.inventory_funding_verified,
    false,
  );
  assert.equal(
    result.observation.contract_address,
    CONTRACT,
  );
  assert.equal(
    result.observation.views
      .void_token_address,
    TOKEN,
  );
  assert.equal(
    result.observation.views
      .fulfiller_address,
    FULFILLER,
  );
  assert.equal(
    result.observation.views
      .predecessor_address,
    PREDECESSOR,
  );
  assert.equal(
    f.calls.length,
    14,
  );
  assert.deepEqual(
    [...new Set(f.calls.map((x) => x.method))].sort(),
    [
      "eth_blockNumber",
      "eth_call",
      "eth_chainId",
      "eth_getBlockByNumber",
      "eth_getCode",
      "eth_getTransactionByHash",
      "eth_getTransactionReceipt",
    ].sort(),
  );
  for (const call of f.calls) {
    if (
      call.method === "eth_getCode" ||
      call.method === "eth_call"
    ) {
      const blockTag =
        call.method === "eth_getCode"
          ? call.params[1]
          : call.params[1];
      assert.equal(
        blockTag,
        "0x6f",
      );
    }
  }
}

{
  const f = fixture({
    wrongChain: true,
  });
  const result =
    await observeBuyVoidPresaleFulfillmentDeploymentV1(
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
    "deployment_observer_chain_id_mismatch",
  );
  assert.deepEqual(
    f.calls.map((x) => x.method),
    ["eth_chainId"],
  );
}

{
  const f = fixture({
    reorg: true,
  });
  const result =
    await observeBuyVoidPresaleFulfillmentDeploymentV1(
      input(f.transport),
    );
  assert.equal(result.ok, false);
  if (result.ok) throw new Error("reorg unexpectedly ready");
  assert.equal(
    result.reason,
    "deployment_observer_revalidation_mismatch",
  );
}

{
  const f = fixture({
    receiptDrift: true,
  });
  const result =
    await observeBuyVoidPresaleFulfillmentDeploymentV1(
      input(f.transport),
    );
  assert.equal(result.ok, false);
  if (result.ok) throw new Error("receipt drift unexpectedly ready");
  assert.equal(
    result.reason,
    "deployment_observer_revalidation_mismatch",
  );
}

{
  const f = fixture({
    codeAbsent: true,
  });
  const result =
    await observeBuyVoidPresaleFulfillmentDeploymentV1(
      input(f.transport),
    );
  assert.equal(result.ok, false);
  if (result.ok) throw new Error("code absent unexpectedly ready");
  assert.equal(
    result.reason,
    "deployment_observer_contract_code_absent",
  );
}

{
  const f = fixture({
    missingTx: true,
  });
  const result =
    await observeBuyVoidPresaleFulfillmentDeploymentV1(
      input(f.transport),
    );
  assert.equal(result.ok, false);
  if (result.ok) throw new Error("missing tx unexpectedly ready");
  assert.equal(
    result.reason,
    "deployment_observer_deployment_transaction_not_visible",
  );
}

{
  const f = fixture();
  const result =
    await observeBuyVoidPresaleFulfillmentDeploymentV1(
      input(
        f.transport,
        {
          rpc_url:
            "https://example.com/",
        },
      ),
    );
  assert.equal(result.ok, false);
  if (result.ok) throw new Error("remote RPC unexpectedly ready");
  assert.equal(
    result.reason,
    "deployment_observer_input_invalid",
  );
  assert.equal(
    f.calls.length,
    0,
  );
}

for (const [key, expected] of Object.entries({
  canonical_chain_id: "2050",
  loopback_http_only: true,
  fixed_block_observation: true,
  block_hash_revalidation_required: true,
  deployment_receipt_revalidation_required:
    true,
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
  runtime_enablement_change: false,
  public_activation: false,
  automatic_retry: false,
  money_movement: false,
})) {
  assert.equal(
    VOID_BUY_VOID_PRESALE_FULFILLMENT_DEPLOYMENT_OBSERVER_AUTHORITY_V1[
      key
    ],
    expected,
    key,
  );
}

const observerSource = fs.readFileSync(
  path.join(
    ROOT,
    "tools/buy-void-presale-fulfillment-deployment-observer-v1.mjs",
  ),
  "utf8",
);
for (const forbidden of [
  "eth_sendRawTransaction",
  "eth_sendTransaction",
  "personal_",
  "admin_",
  "debug_",
  "JsonRpcProvider",
  "Wallet(",
  "private_key",
  "mnemonic",
  "broadcastTransaction",
  "sendTransaction",
]) {
  assert.equal(
    observerSource.includes(forbidden),
    false,
    "observer contains forbidden operation " +
      forbidden,
  );
}

console.log(
  "VOID_BUY_VOID_PRESALE_FULFILLMENT_DEPLOYMENT_OBSERVER_V1_PROOF_GREEN",
);
console.log("loopback_http_only=true");
console.log("fixed_block_observation=true");
console.log("block_hash_revalidated=true");
console.log("deployment_receipt_revalidated=true");
console.log("read_only_rpc_method_allowlist=true");
console.log("exact_runtime_attestation_reused=true");
console.log("deployment_performed=false");
console.log("chain2050_mutation=false");
console.log("inventory_funding=false");
console.log("runtime_activation=false");
console.log("public_activation=false");
