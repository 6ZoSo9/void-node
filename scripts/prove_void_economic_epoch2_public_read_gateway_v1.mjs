#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";

import {
  VOID_ECONOMIC_EPOCH2_PUBLIC_READ_GATEWAY_AUTHORITY_V1,
  VOID_ECONOMIC_EPOCH2_PUBLIC_READ_GATEWAY_V1,
  VoidEconomicEpoch2PublicReadGatewayHoldV1,
  queryVoidEconomicEpoch2PublicReadGatewayV1,
} from "../tools/void-economic-epoch2-public-read-gateway-v1.mjs";

const ADDRESS =
  "0x1111111111111111111111111111111111111111";
const OTHER_ADDRESS =
  "0x2222222222222222222222222222222222222222";
const TX_HASH = "0x" + "a".repeat(64);
const BLOCK_HASH = "0x" + "b".repeat(64);
const STATE_ROOT = "0x" + "c".repeat(64);
const OTHER_BLOCK_HASH = "0x" + "d".repeat(64);
const BLOCK_NUMBER = "0x10";

function block(overrides = {}) {
  return {
    number: BLOCK_NUMBER,
    hash: BLOCK_HASH,
    stateRoot: STATE_ROOT,
    ...overrides,
  };
}

function receipt(overrides = {}) {
  return {
    transactionHash: TX_HASH,
    blockNumber: BLOCK_NUMBER,
    blockHash: BLOCK_HASH,
    status: "0x1",
    from: ADDRESS,
    to: OTHER_ADDRESS,
    ...overrides,
  };
}

function request(kind, overrides = {}) {
  if (kind === "receipt") {
    return {
      marker: VOID_ECONOMIC_EPOCH2_PUBLIC_READ_GATEWAY_V1,
      version: 1,
      kind,
      transaction_hash: TX_HASH,
      ...overrides,
    };
  }
  return {
    marker: VOID_ECONOMIC_EPOCH2_PUBLIC_READ_GATEWAY_V1,
    version: 1,
    kind,
    address: ADDRESS,
    block_number: BLOCK_NUMBER,
    ...overrides,
  };
}

function transportFixture({
  chainId = "0x802",
  blockReads = [block(), block()],
  balance = "0x2a",
  code = "0x6000",
  receiptReads = [receipt(), receipt()],
} = {}) {
  const calls = [];
  let blockIndex = 0;
  let receiptIndex = 0;

  const transport = async ({ method, params, timeout_ms }) => {
    calls.push({ method, params, timeout_ms });
    if (method === "eth_chainId") return chainId;
    if (method === "eth_getBlockByNumber") {
      return blockReads[
        Math.min(blockIndex++, blockReads.length - 1)
      ];
    }
    if (method === "eth_getBalance") return balance;
    if (method === "eth_getCode") return code;
    if (method === "eth_getTransactionReceipt") {
      return receiptReads[
        Math.min(receiptIndex++, receiptReads.length - 1)
      ];
    }
    throw new Error("unexpected_rpc_method:" + method);
  };

  return { transport, calls };
}

async function expectHold(run, reason) {
  let thrown = null;
  try {
    await run();
  } catch (error) {
    thrown = error;
  }
  assert(thrown, "expected hold: " + reason);
  assert(
    thrown instanceof VoidEconomicEpoch2PublicReadGatewayHoldV1,
    "wrong error: " + String(thrown),
  );
  assert.equal(thrown.reason, reason);
}

const balanceTransport = transportFixture();
const balanceResult =
  await queryVoidEconomicEpoch2PublicReadGatewayV1({
    request: request("balance"),
    transport: balanceTransport.transport,
    timeoutMs: 1000,
  });
assert.equal(balanceResult.ok, true);
assert.equal(
  balanceResult.status,
  "SOURCE_PUBLIC_READ_QUERY_VERIFIED",
);
assert.equal(balanceResult.query_kind, "balance");
assert.equal(balanceResult.chain_id, 2050);
assert.equal(balanceResult.execution_epoch, 2);
assert.equal(balanceResult.block_number, BLOCK_NUMBER);
assert.equal(balanceResult.block_hash, BLOCK_HASH);
assert.equal(balanceResult.state_root, STATE_ROOT);
assert.equal(balanceResult.address, ADDRESS);
assert.deepEqual(balanceResult.result, {
  balance_wei: "42",
  balance_wei_hex: "0x2a",
});
assert.match(balanceResult.evidence_id, /^sha256:[0-9a-f]{64}$/);
assert.equal(balanceResult.exact_block_identity_revalidated, true);
assert.equal(balanceResult.public_economic_read_gateway_source_ready, true);
assert.equal(balanceResult.live_balance_receipt_code_gateway_ready, false);
assert.equal(
  balanceResult.public_balance_receipt_code_verification_ready,
  false,
);
assert.equal(balanceResult.runtime_route_active, false);
assert.equal(balanceResult.public_gateway_active, false);
assert.equal(balanceResult.migration_authorized, false);
assert.equal(balanceResult.public_activation_authorized, false);
assert.equal(balanceResult.funds_movement, false);
assert.deepEqual(
  balanceTransport.calls.map((call) => call.method),
  [
    "eth_chainId",
    "eth_getBlockByNumber",
    "eth_getBalance",
    "eth_getBlockByNumber",
  ],
);

const repeatBalanceTransport = transportFixture();
const repeatBalance =
  await queryVoidEconomicEpoch2PublicReadGatewayV1({
    request: structuredClone(request("balance")),
    transport: repeatBalanceTransport.transport,
    timeoutMs: 1000,
  });
assert.equal(repeatBalance.evidence_id, balanceResult.evidence_id);

const codeTransport = transportFixture({ code: "0x60006000" });
const codeResult =
  await queryVoidEconomicEpoch2PublicReadGatewayV1({
    request: request("code"),
    transport: codeTransport.transport,
    timeoutMs: 1000,
  });
assert.equal(codeResult.query_kind, "code");
assert.equal(codeResult.result.code, "0x60006000");
assert.equal(codeResult.result.code_bytes, 4);
assert.match(codeResult.result.code_sha256, /^[0-9a-f]{64}$/);
assert.deepEqual(
  codeTransport.calls.map((call) => call.method),
  [
    "eth_chainId",
    "eth_getBlockByNumber",
    "eth_getCode",
    "eth_getBlockByNumber",
  ],
);

const receiptTransport = transportFixture();
const receiptResult =
  await queryVoidEconomicEpoch2PublicReadGatewayV1({
    request: request("receipt"),
    transport: receiptTransport.transport,
    timeoutMs: 1000,
  });
assert.equal(receiptResult.query_kind, "receipt");
assert.equal(receiptResult.transaction_hash, TX_HASH);
assert.equal(receiptResult.receipt_status, "0x1");
assert.equal(receiptResult.receipt_from, ADDRESS);
assert.equal(receiptResult.receipt_to, OTHER_ADDRESS);
assert.equal(receiptResult.block_number, BLOCK_NUMBER);
assert.equal(receiptResult.block_hash, BLOCK_HASH);
assert.equal(receiptResult.state_root, STATE_ROOT);
assert.equal(receiptResult.exact_receipt_identity_revalidated, true);
assert.equal(receiptResult.exact_block_identity_revalidated, true);
assert.deepEqual(
  receiptTransport.calls.map((call) => call.method),
  [
    "eth_chainId",
    "eth_getTransactionReceipt",
    "eth_getBlockByNumber",
    "eth_getTransactionReceipt",
    "eth_getBlockByNumber",
  ],
);

{
  const t = transportFixture({ chainId: "0x1" });
  await expectHold(
    () =>
      queryVoidEconomicEpoch2PublicReadGatewayV1({
        request: request("balance"),
        transport: t.transport,
        timeoutMs: 1000,
      }),
    "read_rpc_chain_id_mismatch",
  );
}

{
  const t = transportFixture({
    blockReads: [
      block(),
      block({ hash: OTHER_BLOCK_HASH }),
    ],
  });
  await expectHold(
    () =>
      queryVoidEconomicEpoch2PublicReadGatewayV1({
        request: request("balance"),
        transport: t.transport,
        timeoutMs: 1000,
      }),
    "block_identity_changed_during_read",
  );
}

{
  const t = transportFixture({
    blockReads: [
      block(),
      block({ stateRoot: "0x" + "e".repeat(64) }),
    ],
  });
  await expectHold(
    () =>
      queryVoidEconomicEpoch2PublicReadGatewayV1({
        request: request("code"),
        transport: t.transport,
        timeoutMs: 1000,
      }),
    "block_identity_changed_during_read",
  );
}

{
  const t = transportFixture({
    receiptReads: [
      receipt(),
      receipt({ status: "0x0" }),
    ],
  });
  await expectHold(
    () =>
      queryVoidEconomicEpoch2PublicReadGatewayV1({
        request: request("receipt"),
        transport: t.transport,
        timeoutMs: 1000,
      }),
    "receipt_changed_during_read",
  );
}

{
  const t = transportFixture({
    receiptReads: [
      receipt({ transactionHash: "0x" + "f".repeat(64) }),
    ],
  });
  await expectHold(
    () =>
      queryVoidEconomicEpoch2PublicReadGatewayV1({
        request: request("receipt"),
        transport: t.transport,
        timeoutMs: 1000,
      }),
    "receipt_transaction_hash_mismatch",
  );
}

{
  const t = transportFixture({
    receiptReads: [
      receipt({ blockHash: OTHER_BLOCK_HASH }),
    ],
  });
  await expectHold(
    () =>
      queryVoidEconomicEpoch2PublicReadGatewayV1({
        request: request("receipt"),
        transport: t.transport,
        timeoutMs: 1000,
      }),
    "receipt_block_hash_mismatch",
  );
}

{
  const t = transportFixture({ balance: "0x00" });
  await expectHold(
    () =>
      queryVoidEconomicEpoch2PublicReadGatewayV1({
        request: request("balance"),
        transport: t.transport,
        timeoutMs: 1000,
      }),
    "balance_result_invalid",
  );
}

{
  const t = transportFixture({
    code: "0x" + "00".repeat(128 * 1024 + 1),
  });
  await expectHold(
    () =>
      queryVoidEconomicEpoch2PublicReadGatewayV1({
        request: request("code"),
        transport: t.transport,
        timeoutMs: 1000,
      }),
    "code_result_above_bound",
  );
}

{
  const t = transportFixture();
  await expectHold(
    () =>
      queryVoidEconomicEpoch2PublicReadGatewayV1({
        request: request("balance", { block_number: "0x010" }),
        transport: t.transport,
        timeoutMs: 1000,
      }),
    "request_block_number_invalid",
  );
  assert.equal(t.calls.length, 0);
}

{
  const t = transportFixture();
  const withExtra =
    await queryVoidEconomicEpoch2PublicReadGatewayV1({
      request: {
        ...request("balance"),
        extra: true,
      },
      transport: t.transport,
      timeoutMs: 1000,
    });
  assert.equal(withExtra.evidence_id, balanceResult.evidence_id);
  assert.equal(withExtra.result.balance_wei, "42");
}

{
  let ownKeysCalls = 0;
  const hostile = new Proxy(request("balance"), {
    ownKeys() {
      ownKeysCalls += 1;
      throw new Error("ownKeys must not run");
    },
  });
  const t = transportFixture();
  const result =
    await queryVoidEconomicEpoch2PublicReadGatewayV1({
      request: hostile,
      transport: t.transport,
      timeoutMs: 1000,
    });
  assert.equal(result.evidence_id, balanceResult.evidence_id);
  assert.equal(ownKeysCalls, 0);
}

{
  const hostile = new Proxy(request("balance"), {
    getOwnPropertyDescriptor(target, key) {
      if (key === "address") throw new Error("descriptor trap");
      return Reflect.getOwnPropertyDescriptor(target, key);
    },
  });
  const t = transportFixture();
  await expectHold(
    () =>
      queryVoidEconomicEpoch2PublicReadGatewayV1({
        request: hostile,
        transport: t.transport,
        timeoutMs: 1000,
      }),
    "balance_or_code_request_shape_invalid",
  );
  assert.equal(t.calls.length, 0);
}

{
  const { proxy, revoke } = Proxy.revocable(request("receipt"), {});
  revoke();
  const t = transportFixture();
  await expectHold(
    () =>
      queryVoidEconomicEpoch2PublicReadGatewayV1({
        request: proxy,
        transport: t.transport,
        timeoutMs: 1000,
      }),
    "request_kind_missing",
  );
  assert.equal(t.calls.length, 0);
}

await expectHold(
  () =>
    queryVoidEconomicEpoch2PublicReadGatewayV1({
      request: request("balance"),
      transport: async () => await new Promise(() => {}),
      timeoutMs: 10,
    }),
  "read_rpc_timeout",
);

for (const [key, value] of Object.entries(
  VOID_ECONOMIC_EPOCH2_PUBLIC_READ_GATEWAY_AUTHORITY_V1,
)) {
  const allowed = new Set([
    "source_only",
    "injected_read_only_rpc_transport_required",
    "exact_block_binding_required",
    "bounded_query_surface",
  ]);
  assert.equal(value, allowed.has(key), key);
}

const source = fs.readFileSync(
  "tools/void-economic-epoch2-public-read-gateway-v1.mjs",
  "utf8",
);
for (const forbidden of [
  "eth_sendRawTransaction",
  "eth_sendTransaction",
  "new Wallet(",
  "writeFileSync",
  "appendFileSync",
  "renameSync",
  "systemctl",
  "process.env",
]) {
  assert.equal(source.includes(forbidden), false, forbidden);
}
for (const method of [
  "eth_chainId",
  "eth_getBalance",
  "eth_getCode",
  "eth_getTransactionReceipt",
  "eth_getBlockByNumber",
]) {
  assert.ok(source.includes(method), method);
}
assert.doesNotMatch(source, /Object\.getOwnPropertyDescriptors|Reflect\.ownKeys/u);
assert.match(source, /function snapshotFields/);
assert.doesNotMatch(source, /function exactObject/);
assert.doesNotMatch(source, /https?:\/\//u);
assert.match(source, /live_balance_receipt_code_gateway_ready: false/);
assert.match(
  source,
  /public_balance_receipt_code_verification_ready: false/,
);
assert.match(source, /runtime_route_active: false/);
assert.match(source, /public_gateway_active: false/);

console.log("VOID_ECONOMIC_EPOCH2_PUBLIC_READ_GATEWAY_V1_PROOF_GREEN");
console.log("exact_chain_id_2050_required=true");
console.log("exact_block_number_required=true");
console.log("block_hash_and_state_root_revalidated=true");
console.log("balance_read_source_ready=true");
console.log("code_read_source_ready=true");
console.log("receipt_read_source_ready=true");
console.log("receipt_identity_revalidated=true");
console.log("bounded_code_bytes=131072");
console.log("bounded_rpc_timeout_ms=5000");
console.log("caller_controlled_key_enumeration=false");
console.log("unrecognized_request_fields_ignored_before_normalization=true");
console.log("required_field_accessors_or_traps_hold=true");
console.log("arbitrary_rpc_method=false");
console.log("default_rpc_transport=false");
console.log("runtime_route_active=false");
console.log("live_balance_receipt_code_gateway_ready=false");
console.log("public_balance_receipt_code_verification_ready=false");
console.log("migration_authorized=false");
console.log("public_activation_authorized=false");
console.log("funds_movement=false");
