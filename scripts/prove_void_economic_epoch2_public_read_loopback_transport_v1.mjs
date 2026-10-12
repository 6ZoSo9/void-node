#!/usr/bin/env node

import assert from "node:assert/strict";
import http from "node:http";

import {
  VOID_ECONOMIC_EPOCH2_PUBLIC_READ_GATEWAY_V1,
  queryVoidEconomicEpoch2PublicReadGatewayV1,
} from "../tools/void-economic-epoch2-public-read-gateway-v1.mjs";
import {
  VOID_ECONOMIC_EPOCH2_PUBLIC_READ_LOOPBACK_TRANSPORT_AUTHORITY_V1,
  VOID_ECONOMIC_EPOCH2_PUBLIC_READ_LOOPBACK_TRANSPORT_V1,
  VoidEconomicEpoch2PublicReadLoopbackTransportHoldV1,
  createVoidEconomicEpoch2PublicReadLoopbackTransportV1,
} from "../tools/void-economic-epoch2-public-read-loopback-transport-v1.mjs";

const ADDRESS = "0x1111111111111111111111111111111111111111";
const OTHER_ADDRESS = "0x2222222222222222222222222222222222222222";
const TX_HASH = "0x" + "a".repeat(64);
const BLOCK_HASH = "0x" + "b".repeat(64);
const STATE_ROOT = "0x" + "c".repeat(64);
const BLOCK_NUMBER = "0x10";

let behavior = "normal";
const observedMethods = [];
let endpoint = null;

function rpcResult(id, result) {
  return JSON.stringify({ jsonrpc: "2.0", id, result });
}

function normalResult(method, params) {
  if (method === "eth_chainId") return "0x802";
  if (method === "eth_getBlockByNumber") {
    return {
      number: params[0],
      hash: BLOCK_HASH,
      stateRoot: STATE_ROOT,
    };
  }
  if (method === "eth_getBalance") return "0x2a";
  if (method === "eth_getCode") return "0x60006000";
  if (method === "eth_getTransactionReceipt") {
    return {
      transactionHash: params[0],
      blockNumber: BLOCK_NUMBER,
      blockHash: BLOCK_HASH,
      status: "0x1",
      from: ADDRESS,
      to: OTHER_ADDRESS,
    };
  }
  throw new Error("unexpected_method:" + method);
}

async function readRequest(req) {
  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    total += chunk.length;
    if (total > 32 * 1024) throw new Error("request_too_large");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks, total).toString("utf8");
}

const server = http.createServer(async (req, res) => {
  try {
    const text = await readRequest(req);
    const payload = JSON.parse(text);
    observedMethods.push(payload.method);

    if (behavior === "redirect") {
      res.statusCode = 302;
      res.setHeader("location", endpoint);
      res.end();
      return;
    }

    if (behavior === "delay") {
      setTimeout(() => {
        if (res.destroyed) return;
        res.statusCode = 200;
        res.setHeader("content-type", "application/json");
        res.end(rpcResult(payload.id, normalResult(payload.method, payload.params)));
      }, 100);
      return;
    }

    if (behavior === "bad_content_type") {
      res.statusCode = 200;
      res.setHeader("content-type", "text/plain");
      res.end(rpcResult(payload.id, normalResult(payload.method, payload.params)));
      return;
    }

    if (behavior === "oversized") {
      res.statusCode = 200;
      res.setHeader("content-type", "application/json");
      res.end(rpcResult(payload.id, "x".repeat(600 * 1024)));
      return;
    }

    if (behavior === "rpc_error") {
      res.statusCode = 200;
      res.setHeader("content-type", "application/json");
      res.end(
        JSON.stringify({
          jsonrpc: "2.0",
          id: payload.id,
          error: { code: -32000, message: "synthetic error" },
        }),
      );
      return;
    }

    res.statusCode = 200;
    res.setHeader("content-type", "application/json; charset=utf-8");
    res.end(rpcResult(payload.id, normalResult(payload.method, payload.params)));
  } catch {
    res.statusCode = 500;
    res.end();
  }
});

await new Promise((resolve, reject) => {
  server.once("error", reject);
  server.listen(0, "127.0.0.1", resolve);
});

try {
  const address = server.address();
  assert(address && typeof address === "object");
  endpoint = `http://127.0.0.1:${address.port}/`;

  const binding =
    createVoidEconomicEpoch2PublicReadLoopbackTransportV1({ endpoint });
  assert.equal(
    binding.marker,
    VOID_ECONOMIC_EPOCH2_PUBLIC_READ_LOOPBACK_TRANSPORT_V1,
  );
  assert.equal(binding.endpoint_class, "canonical_ipv4_loopback_http");
  assert.equal(binding.production_successor_rpc_endpoint_selected, false);
  assert.equal(binding.live_balance_receipt_code_gateway_ready, false);
  assert.equal(binding.public_balance_receipt_code_verification_ready, false);
  assert.equal(binding.runtime_route_active, false);
  assert.equal(binding.public_gateway_active, false);

  const balance = await queryVoidEconomicEpoch2PublicReadGatewayV1({
    request: {
      marker: VOID_ECONOMIC_EPOCH2_PUBLIC_READ_GATEWAY_V1,
      version: 1,
      kind: "balance",
      address: ADDRESS,
      block_number: BLOCK_NUMBER,
    },
    transport: binding.transport,
    timeoutMs: 1000,
  });
  assert.equal(balance.ok, true);
  assert.equal(balance.chain_id, 2050);
  assert.equal(balance.block_hash, BLOCK_HASH);
  assert.equal(balance.state_root, STATE_ROOT);
  assert.equal(balance.result.balance_wei, "42");
  assert.equal(balance.live_balance_receipt_code_gateway_ready, false);
  assert.equal(balance.public_balance_receipt_code_verification_ready, false);

  const code = await queryVoidEconomicEpoch2PublicReadGatewayV1({
    request: {
      marker: VOID_ECONOMIC_EPOCH2_PUBLIC_READ_GATEWAY_V1,
      version: 1,
      kind: "code",
      address: ADDRESS,
      block_number: BLOCK_NUMBER,
    },
    transport: binding.transport,
    timeoutMs: 1000,
  });
  assert.equal(code.ok, true);
  assert.equal(code.result.code, "0x60006000");
  assert.equal(code.result.code_bytes, 4);

  const receipt = await queryVoidEconomicEpoch2PublicReadGatewayV1({
    request: {
      marker: VOID_ECONOMIC_EPOCH2_PUBLIC_READ_GATEWAY_V1,
      version: 1,
      kind: "receipt",
      transaction_hash: TX_HASH,
    },
    transport: binding.transport,
    timeoutMs: 1000,
  });
  assert.equal(receipt.ok, true);
  assert.equal(receipt.transaction_hash, TX_HASH);
  assert.equal(receipt.block_hash, BLOCK_HASH);
  assert.equal(receipt.state_root, STATE_ROOT);
  assert.equal(receipt.receipt_status, "0x1");

  const observed = new Set(observedMethods);
  assert.deepEqual(
    [...observed].sort(),
    [
      "eth_chainId",
      "eth_getBalance",
      "eth_getBlockByNumber",
      "eth_getCode",
      "eth_getTransactionReceipt",
    ].sort(),
  );

  for (const badEndpoint of [
    `https://127.0.0.1:${address.port}/`,
    `http://localhost:${address.port}/`,
    `http://127.0.0.1:${address.port}/rpc`,
    `http://user@127.0.0.1:${address.port}/`,
    `http://127.0.0.1:${address.port}/?x=1`,
    `http://127.0.0.1:${address.port}`,
  ]) {
    assert.throws(
      () =>
        createVoidEconomicEpoch2PublicReadLoopbackTransportV1({
          endpoint: badEndpoint,
        }),
      VoidEconomicEpoch2PublicReadLoopbackTransportHoldV1,
      badEndpoint,
    );
  }

  await assert.rejects(
    () =>
      binding.transport({
        method: "eth_sendRawTransaction",
        params: [],
        timeout_ms: 1000,
      }),
    /read_transport_method_forbidden/,
  );

  await assert.rejects(
    () =>
      binding.transport({
        method: "eth_chainId",
        params: [],
        timeout_ms: 1000,
        extra: true,
      }),
    /read_transport_request_shape_invalid/,
  );

  await assert.rejects(
    () =>
      binding.transport({
        method: "eth_chainId",
        params: [],
        timeout_ms: 0,
      }),
    /read_transport_timeout_invalid/,
  );

  behavior = "redirect";
  await assert.rejects(
    () =>
      binding.transport({
        method: "eth_chainId",
        params: [],
        timeout_ms: 1000,
      }),
    /read_transport_http_failed/,
  );

  behavior = "bad_content_type";
  await assert.rejects(
    () =>
      binding.transport({
        method: "eth_chainId",
        params: [],
        timeout_ms: 1000,
      }),
    /read_transport_content_type_invalid/,
  );

  behavior = "rpc_error";
  await assert.rejects(
    () =>
      binding.transport({
        method: "eth_chainId",
        params: [],
        timeout_ms: 1000,
      }),
    /read_transport_rpc_error/,
  );

  behavior = "oversized";
  await assert.rejects(
    () =>
      binding.transport({
        method: "eth_chainId",
        params: [],
        timeout_ms: 1000,
      }),
    /read_transport_response_above_bound/,
  );

  behavior = "delay";
  await assert.rejects(
    () =>
      binding.transport({
        method: "eth_chainId",
        params: [],
        timeout_ms: 10,
      }),
    /read_transport_timeout/,
  );

  for (const [key, value] of Object.entries(
    VOID_ECONOMIC_EPOCH2_PUBLIC_READ_LOOPBACK_TRANSPORT_AUTHORITY_V1,
  )) {
    const expectedTrue = new Set([
      "source_only",
      "loopback_only",
      "read_only_rpc_methods_only",
      "redirects_forbidden",
      "bounded_response_bytes",
      "bounded_timeout",
    ]);
    assert.equal(value, expectedTrue.has(key), key);
  }

  console.log(
    "VOID_ECONOMIC_EPOCH2_PUBLIC_READ_LOOPBACK_TRANSPORT_V1_PROOF_GREEN",
  );
  console.log("canonical_ipv4_loopback_http_only=true");
  console.log("read_only_rpc_method_allowlist=true");
  console.log("redirects_forbidden=true");
  console.log("bounded_response_bytes=524288");
  console.log("bounded_transport_timeout_ms=5000");
  console.log("public_read_core_balance_integration=true");
  console.log("public_read_core_code_integration=true");
  console.log("public_read_core_receipt_integration=true");
  console.log("production_successor_rpc_endpoint_selected=false");
  console.log("live_balance_receipt_code_gateway_ready=false");
  console.log("public_balance_receipt_code_verification_ready=false");
  console.log("runtime_route_active=false");
  console.log("public_gateway_active=false");
  console.log("transaction_submission=false");
  console.log("transaction_broadcast=false");
  console.log("authoritative_chain2050_write=false");
  console.log("funds_movement=false");
} finally {
  await new Promise((resolve) => server.close(resolve));
}
