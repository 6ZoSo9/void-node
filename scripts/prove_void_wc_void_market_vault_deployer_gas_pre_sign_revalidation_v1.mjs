#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  AUTHORITY,
  VOID_WC_VOID_MARKET_VAULT_DEPLOYER_GAS_PRE_SIGN_REVALIDATION_V1,
  revalidateWcVoidDeployerGasFundingPreSignV1,
} from "../tools/void-wc-void-market-vault-deployer-gas-pre-sign-revalidation-v1.mjs";

const authorization = JSON.parse(
  fs.readFileSync(
    "ops/mainnet0/wc-void-market-vault-deployer-gas-funding-authorization-v1.json",
    "utf8",
  ),
);
const unsigned = JSON.parse(
  fs.readFileSync(
    "ops/mainnet0/wc-void-market-vault-deployer-gas-unsigned-funding-v1.json",
    "utf8",
  ),
);

const SOURCE =
  "0xc884f631c3881b8b672bfcbf019c856146cd7f73";
const DESTINATION =
  "0x907ea7d0d57f5631219674bdf666a7e929613074";
const BLOCK_HASH = "0x" + "a".repeat(64);

function transportFor({
  chainId = "0x802",
  head = "0x100",
  blockHash = BLOCK_HASH,
  revalidatedBlockHash = BLOCK_HASH,
  baseFee = "0x7",
  sourceCode = "0x",
  destinationCode = "0x",
  sourceLatest = "0x1",
  sourcePendingA = "0x1",
  sourcePendingB = "0x1",
  destinationLatest = "0x0",
  destinationPending = "0x0",
  sourceBalance = "0x1bc16d674ec80000",
  destinationBalance = "0x0",
  priority = "0x3b9aca00",
} = {}) {
  let sourcePendingCalls = 0;
  let blockCalls = 0;

  return async ({ method, params }) => {
    switch (method) {
      case "eth_chainId":
        return chainId;
      case "eth_blockNumber":
        return head;
      case "eth_getBlockByNumber":
        blockCalls += 1;
        return {
          number: head,
          hash: blockCalls === 1 ? blockHash : revalidatedBlockHash,
          baseFeePerGas: baseFee,
        };
      case "eth_getCode":
        return String(params?.[0]).toLowerCase() === SOURCE
          ? sourceCode
          : destinationCode;
      case "eth_getTransactionCount": {
        const address = String(params?.[0]).toLowerCase();
        const tag = String(params?.[1]);
        if (address === SOURCE) {
          if (tag !== "pending") return sourceLatest;
          sourcePendingCalls += 1;
          return sourcePendingCalls === 1
            ? sourcePendingA
            : sourcePendingB;
        }
        if (address === DESTINATION) {
          return tag === "pending"
            ? destinationPending
            : destinationLatest;
        }
        throw new Error("unexpected transaction-count address");
      }
      case "eth_getBalance":
        return String(params?.[0]).toLowerCase() === SOURCE
          ? sourceBalance
          : destinationBalance;
      case "eth_maxPriorityFeePerGas":
        return priority;
      default:
        throw new Error("unexpected RPC method: " + method);
    }
  };
}

function input(overrides = {}) {
  return {
    rpc_url: "http://127.0.0.1:8545/",
    request_timeout_ms: 5000,
    max_response_bytes: 1048576,
    authorization,
    unsigned,
    transport: transportFor(),
    ...overrides,
  };
}

assert.equal(
  VOID_WC_VOID_MARKET_VAULT_DEPLOYER_GAS_PRE_SIGN_REVALIDATION_V1,
  "VOID_WC_VOID_MARKET_VAULT_DEPLOYER_GAS_PRE_SIGN_REVALIDATION_V1",
);
assert.equal(AUTHORITY.source_only_dynamic_binding, true);
assert.equal(AUTHORITY.exact_authorization_required, true);
assert.equal(AUTHORITY.exact_unsigned_transaction_required, true);
assert.equal(AUTHORITY.loopback_http_only, true);
assert.equal(AUTHORITY.canonical_chain_id, 2050);

for (const [key, value] of Object.entries(AUTHORITY)) {
  if (
    [
      "source_only_dynamic_binding",
      "exact_authorization_required",
      "exact_unsigned_transaction_required",
      "loopback_http_only",
      "canonical_chain_id",
      "exact_source_nonce_required",
      "source_balance_sufficiency_required",
      "destination_unfunded_required",
      "fee_caps_revalidated",
      "pending_nonce_revalidation_required",
      "observation_block_hash_revalidation_required",
    ].includes(key)
  ) {
    continue;
  }
  assert.equal(value, false, key);
}

{
  const result =
    await revalidateWcVoidDeployerGasFundingPreSignV1(input());
  assert.equal(result.ok, true);
  assert.equal(
    result.status,
    "GREEN_FRESH_PRE_SIGN_REVALIDATION_READY_FOR_SEPARATE_EXACT_SIGNING_AND_BROADCAST_AUTHORIZATION",
  );
  assert.equal(
    result.authorization_id,
    "voidwcvdgfa1_b2255123b21f6bfef86ea5aa288bcfd8a86d7d46e3a94f6b861bdadacb416392",
  );
  assert.equal(
    result.unsigned_transaction_hash,
    "0xe0ffe7279501b1c334b7a0b0e67081ab2813db7d407970aa6c9ea9f6882da3e9",
  );
  assert.equal(
    result.unsigned_serialized_sha256,
    "5e25fb995cf853fa3942bb4e6aa364c9746d0f411f87b55cac15b06b12b352fd",
  );
  assert.equal(result.observation.chain_id, "2050");
  assert.equal(result.observation.source_address, SOURCE);
  assert.equal(result.observation.source_latest_nonce, "1");
  assert.equal(result.observation.source_pending_nonce, "1");
  assert.equal(result.observation.destination_address, DESTINATION);
  assert.equal(result.observation.destination_balance_wei, "0");
  assert.equal(result.observation.destination_latest_nonce, "0");
  assert.equal(result.observation.destination_pending_nonce, "0");
  assert.equal(result.observation.source_has_code, false);
  assert.equal(result.observation.destination_has_code, false);
  assert.equal(result.observation.source_balance_sufficient, true);
  assert.equal(result.observation.destination_unfunded, true);
  assert.equal(result.observation.pending_nonce_revalidated, true);
  assert.equal(
    result.observation.observation_block_hash_revalidated,
    true,
  );
  assert.equal(result.signing_authorized, false);
  assert.equal(result.transaction_broadcast_authorized, false);
  assert.equal(result.chain2050_write_authorized, false);
  assert.equal(result.funds_movement_authorized, false);
}

async function held(transport, reason) {
  const result =
    await revalidateWcVoidDeployerGasFundingPreSignV1(
      input({ transport }),
    );
  assert.equal(result.ok, false, reason);
  assert.equal(result.status, "HOLD", reason);
  assert.equal(result.reason, reason);
  assert.equal(result.signing_authorized, false);
  assert.equal(result.transaction_broadcast_authorized, false);
  assert.equal(result.chain2050_write_authorized, false);
  assert.equal(result.funds_movement_authorized, false);
}

await held(transportFor({ chainId: "0x1" }), "chain_id_mismatch");
await held(transportFor({ sourceCode: "0x6000" }), "source_has_code");
await held(
  transportFor({ destinationCode: "0x6000" }),
  "destination_has_code",
);
await held(
  transportFor({
    sourceLatest: "0x2",
    sourcePendingA: "0x2",
    sourcePendingB: "0x2",
  }),
  "source_nonce_mismatch",
);
await held(
  transportFor({ sourceBalance: "0x1" }),
  "source_balance_insufficient",
);
await held(
  transportFor({ destinationBalance: "0x1" }),
  "destination_already_changed",
);
await held(
  transportFor({ destinationLatest: "0x1", destinationPending: "0x1" }),
  "destination_already_changed",
);
await held(
  transportFor({ priority: "0x77359400" }),
  "fee_caps_insufficient",
);
await held(
  transportFor({ sourcePendingB: "0x2" }),
  "revalidation_mismatch",
);
await held(
  transportFor({
    revalidatedBlockHash: "0x" + "b".repeat(64),
  }),
  "revalidation_mismatch",
);

{
  const wrongAuthorization = structuredClone(authorization);
  wrongAuthorization.nonce = "2";
  const result =
    await revalidateWcVoidDeployerGasFundingPreSignV1(
      input({ authorization: wrongAuthorization }),
    );
  assert.equal(result.ok, false);
  assert.equal(result.reason, "authorization_binding_invalid");
}

{
  const wrongUnsigned = structuredClone(unsigned);
  wrongUnsigned.transaction.unsigned_transaction_hash =
    "0x" + "0".repeat(64);
  const result =
    await revalidateWcVoidDeployerGasFundingPreSignV1(
      input({ unsigned: wrongUnsigned }),
    );
  assert.equal(result.ok, false);
  assert.equal(result.reason, "unsigned_artifact_binding_invalid");
}

{
  const result =
    await revalidateWcVoidDeployerGasFundingPreSignV1(
      input({ rpc_url: "https://example.com/" }),
    );
  assert.equal(result.ok, false);
  assert.equal(result.reason, "rpc_policy_invalid");
}

const source = fs.readFileSync(
  "tools/void-wc-void-market-vault-deployer-gas-pre-sign-revalidation-v1.mjs",
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

console.log(
  "VOID_WC_VOID_MARKET_VAULT_DEPLOYER_GAS_PRE_SIGN_REVALIDATION_V1_PROOF_GREEN",
);
console.log(
  "authorization_id=voidwcvdgfa1_b2255123b21f6bfef86ea5aa288bcfd8a86d7d46e3a94f6b861bdadacb416392",
);
console.log(
  "unsigned_transaction_hash=0xe0ffe7279501b1c334b7a0b0e67081ab2813db7d407970aa6c9ea9f6882da3e9",
);
console.log("exact_source_nonce_required=1");
console.log("destination_unfunded_required=true");
console.log("source_balance_sufficiency_required=true");
console.log("fee_caps_revalidated=true");
console.log("credential_access=false");
console.log("private_key_access=false");
console.log("transaction_signing=false");
console.log("transaction_broadcast=false");
console.log("chain2050_write=false");
console.log("funds_movement=false");
