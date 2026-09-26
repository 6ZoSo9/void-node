#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import { Interface, id, zeroPadValue } from "ethers";

import {
  VOID_ECONOMIC_EVM_FINAL_VALUE_CENSUS_AUTHORITY_V1,
  VOID_ECONOMIC_EVM_FINAL_VALUE_CENSUS_V1,
  observeVoidEconomicEvmFinalValueCensusV1,
} from "../tools/void-economic-evm-final-value-census-v1.mjs";

const TOKEN =
  "0x470075b85352eb86f7d089fb9ba88945f12aad94";
const TREASURY =
  "0x554ecc7be6f0b7cc3d1c578c2bb848e535c02514";
const STAKING =
  "0x77dfeedd19a4741f299c902ad5bbe0de917a9e59";
const PRESALE =
  "0xa40a43adfd174f88309173cb3daa6e09c10154a7";
const HEAD_HASH = "0x" + "a".repeat(64);
const TRANSFER_TOPIC = id("Transfer(address,address,uint256)").toLowerCase();

const TOKEN_IFACE = new Interface([
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
]);
const PRESALE_IFACE = new Interface([
  "function voidToken() view returns (address)",
  "function remainingInventoryAtoms() view returns (uint256)",
  "function totalFulfilledAtoms() view returns (uint256)",
  "function maxInventoryAtoms() view returns (uint256)",
]);

function topicAddress(address) {
  return zeroPadValue(address, 32).toLowerCase();
}

function transfer(from, to, blockNumber, logIndex) {
  return {
    address: TOKEN,
    blockNumber: "0x" + blockNumber.toString(16),
    blockHash: HEAD_HASH,
    transactionHash: "0x" + String(logIndex + 1).padStart(64, "1").slice(-64),
    logIndex: "0x" + logIndex.toString(16),
    topics: [TRANSFER_TOPIC, topicAddress(from), topicAddress(to)],
    data: "0x" + "0".repeat(64),
  };
}

function fixture(options = {}) {
  const calls = [];
  const balances = new Map([
    [TREASURY, 323_207_333n * 10n ** 18n],
    [STAKING, 126_000n * 10n ** 18n],
    [PRESALE, 10_000_000n * 10n ** 18n],
  ]);
  if (options.omitPresaleBalance) balances.set(PRESALE, 0n);

  const totalSupply = options.badSupply
    ? 333_333_334n * 10n ** 18n
    : 333_333_333n * 10n ** 18n;

  const logs = [
    transfer("0x0000000000000000000000000000000000000000", TREASURY, 1, 0),
    transfer(TREASURY, STAKING, 2, 1),
    transfer(TREASURY, PRESALE, 3, 2),
  ];

  const transport = async ({ method, params }) => {
    calls.push({ method, params: structuredClone(params) });
    switch (method) {
      case "eth_chainId":
        return options.wrongChain ? "0x1" : "0x802";
      case "eth_blockNumber":
        return "0xa";
      case "eth_getBlockByNumber":
        return {
          number: "0xa",
          hash: options.blockDrift && calls.filter((x)=>x.method==="eth_getBlockByNumber").length > 1
            ? "0x" + "b".repeat(64)
            : HEAD_HASH,
        };
      case "eth_getLogs":
        return logs;
      case "eth_getCode": {
        const target = String(params?.[0] || "").toLowerCase();
        if (target === TOKEN || target === STAKING || target === PRESALE) {
          return "0x6001600055";
        }
        return "0x";
      }
      case "eth_call": {
        const tx = params?.[0] || {};
        const to = String(tx.to || "").toLowerCase();
        const data = String(tx.data || "").toLowerCase();

        if (to === TOKEN) {
          if (
            data === TOKEN_IFACE.encodeFunctionData("totalSupply").toLowerCase()
          ) {
            return TOKEN_IFACE.encodeFunctionResult("totalSupply", [totalSupply]);
          }
          const selector = TOKEN_IFACE.getFunction("balanceOf").selector.toLowerCase();
          if (data.startsWith(selector)) {
            const [owner] = TOKEN_IFACE.decodeFunctionData("balanceOf", data);
            const key = String(owner).toLowerCase();
            return TOKEN_IFACE.encodeFunctionResult(
              "balanceOf",
              [balances.get(key) || 0n],
            );
          }
        }

        if (to === PRESALE) {
          if (
            data === PRESALE_IFACE.encodeFunctionData("voidToken").toLowerCase()
          ) {
            return PRESALE_IFACE.encodeFunctionResult(
              "voidToken",
              [options.wrongPresaleToken ? STAKING : TOKEN],
            );
          }
          if (
            data === PRESALE_IFACE
              .encodeFunctionData("remainingInventoryAtoms")
              .toLowerCase()
          ) {
            return PRESALE_IFACE.encodeFunctionResult(
              "remainingInventoryAtoms",
              [options.badPresaleAccounting ? 9_000_000n * 10n ** 18n : 10_000_000n * 10n ** 18n],
            );
          }
          if (
            data === PRESALE_IFACE
              .encodeFunctionData("totalFulfilledAtoms")
              .toLowerCase()
          ) {
            return PRESALE_IFACE.encodeFunctionResult(
              "totalFulfilledAtoms",
              [0n],
            );
          }
          if (
            data === PRESALE_IFACE
              .encodeFunctionData("maxInventoryAtoms")
              .toLowerCase()
          ) {
            return PRESALE_IFACE.encodeFunctionResult(
              "maxInventoryAtoms",
              [10_000_000n * 10n ** 18n],
            );
          }
        }
        throw new Error("unexpected_eth_call");
      }
      default:
        throw new Error("unexpected_method:" + method);
    }
  };
  return { calls, transport };
}

function input(transport, override = {}) {
  return {
    rpc_url: "http://127.0.0.1:8545/",
    void_token_address: TOKEN,
    presale_contract_address: PRESALE,
    log_chunk_size: 2000,
    transport,
    ...override,
  };
}

{
  const f = fixture();
  const result = await observeVoidEconomicEvmFinalValueCensusV1(
    input(f.transport),
  );
  assert.equal(result.ok, true);
  assert.equal(result.status, "READ_ONLY_CENSUS_GREEN");
  assert.equal(result.marker, VOID_ECONOMIC_EVM_FINAL_VALUE_CENSUS_V1);
  assert.equal(result.observation.total_supply_atoms, "333333333000000000000000000");
  assert.equal(
    result.observation.holder_balance_sum_atoms,
    result.observation.total_supply_atoms,
  );
  assert.equal(result.observation.holder_sum_matches_total_supply, true);
  assert.equal(result.observation.nonzero_holder_count, 3);
  assert.equal(result.observation.contract_holders.length, 3);
  assert.equal(result.observation.presale.accounting_identity_holds, true);
  assert.equal(result.observation.presale.token_balance_covers_remaining, true);
  assert.equal(result.transaction_broadcast, false);
  assert.equal(result.chain_write_performed, false);
  assert.equal(result.token_movement_performed, false);
  assert.equal(result.money_movement_performed, false);

  const methods = new Set(f.calls.map(({method})=>method));
  assert.deepEqual([...methods].sort(), [
    "eth_blockNumber",
    "eth_call",
    "eth_chainId",
    "eth_getBlockByNumber",
    "eth_getCode",
    "eth_getLogs",
  ].sort());
}

{
  const f = fixture({ badSupply: true });
  const result = await observeVoidEconomicEvmFinalValueCensusV1(input(f.transport));
  assert.equal(result.ok, false);
  assert.equal(result.status, "HOLD");
  assert.equal(result.observation.holder_sum_matches_total_supply, false);
}

{
  const f = fixture({ wrongChain: true });
  const result = await observeVoidEconomicEvmFinalValueCensusV1(input(f.transport));
  assert.equal(result.ok, false);
  assert.equal(result.reason, "chain_id_mismatch");
}

{
  const f = fixture({ wrongPresaleToken: true });
  const result = await observeVoidEconomicEvmFinalValueCensusV1(input(f.transport));
  assert.equal(result.ok, false);
  assert.equal(result.reason, "presale_voidtoken_mismatch");
}

{
  const f = fixture({ blockDrift: true });
  const result = await observeVoidEconomicEvmFinalValueCensusV1(input(f.transport));
  assert.equal(result.ok, false);
  assert.equal(result.reason, "fixed_block_revalidation_failed");
}

{
  const f = fixture();
  const result = await observeVoidEconomicEvmFinalValueCensusV1(
    input(f.transport, { rpc_url: "https://example.com/" }),
  );
  assert.equal(result.ok, false);
  assert.equal(result.reason, "input_invalid");
  assert.equal(f.calls.length, 0);
}

for (const [key, expected] of Object.entries({
  chain_id: "2050",
  loopback_http_only: true,
  fixed_block_observation: true,
  credential_access: false,
  wallet_access: false,
  private_key_access: false,
  filesystem_write: false,
  transaction_construction: false,
  transaction_signing: false,
  transaction_broadcast: false,
  chain_write: false,
  token_movement: false,
  money_movement: false,
})) {
  assert.equal(
    VOID_ECONOMIC_EVM_FINAL_VALUE_CENSUS_AUTHORITY_V1[key],
    expected,
    key,
  );
}

const source = fs.readFileSync(
  "tools/void-economic-evm-final-value-census-v1.mjs",
  "utf8",
);
for (const forbidden of [
  "eth_sendRawTransaction",
  "eth_sendTransaction",
  "personal_",
  "admin_",
  "anvil_set",
  "anvil_mine",
  "privateKey",
  "Wallet(",
  "sendTransaction",
  "broadcastTransaction",
  "systemctl",
]) {
  assert.equal(source.includes(forbidden), false, forbidden);
}

console.log("VOID_ECONOMIC_EVM_FINAL_VALUE_CENSUS_V1_PROOF_GREEN");
console.log("loopback_read_only_rpc=true");
console.log("voidtoken_holders_reconstructed_from_transfer_logs=true");
console.log("fixed_block_balance_sum_equals_total_supply_required=true");
console.log("contract_held_void_identified=true");
console.log("presale_inventory_accounting_observed=true");
console.log("credential_access=false");
console.log("wallet_access=false");
console.log("transaction_signing=false");
console.log("transaction_broadcast=false");
console.log("chain_write=false");
console.log("token_movement=false");
console.log("funds_moved=false");
