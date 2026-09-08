import assert from "node:assert/strict";
import crypto from "node:crypto";
import http from "node:http";
import fs from "node:fs";

import {
  observeBuyVoidSourceFinalityAuthenticatedCompositionV3,
  VOID_BUY_VOID_SOURCE_FINALITY_AUTHENTICATED_COMPOSITION_V3,
} from "../src/economic/buy_void_source_finality_authenticated_composition_v3.js";
import {
  VOID_BUY_VOID_CANONICAL_PRESALE_ECONOMICS_V2,
  VOID_BUY_VOID_SOURCE_FINALITY_STATIC_POLICY_V2,
} from "../src/economic/buy_void_source_finality_authority_v2.js";

const TRANSFER_TOPIC =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const TX = `0x${"1".repeat(64)}`;
const DELIVERY = `0x${"2".repeat(40)}`;
const RECEIVE = `0x${"3".repeat(40)}`;
const USDC = `0x${"4".repeat(40)}`;
const RECEIPT_HASH = `0x${"5".repeat(64)}`;
const FINAL_HASH = `0x${"6".repeat(64)}`;

function topicAddress(address: string): string {
  return `0x${"0".repeat(24)}${address.slice(2)}`;
}

function dataUint(value: bigint): string {
  return `0x${value.toString(16).padStart(64, "0")}`;
}

function block(number: bigint, hash: string) {
  return {
    number: `0x${number.toString(16)}`,
    hash,
    parentHash:
      number === 0n
        ? `0x${"0".repeat(64)}`
        : `0x${"8".repeat(64)}`,
  };
}

function receipt() {
  return {
    status: "0x1",
    transactionHash: TX,
    blockNumber: "0x64",
    blockHash: RECEIPT_HASH,
    logs: [
      {
        address: USDC,
        topics: [
          TRANSFER_TOPIC,
          topicAddress(DELIVERY),
          topicAddress(RECEIVE),
        ],
        data: dataUint(1_000_000n),
        logIndex: "0x2",
        transactionHash: TX,
        blockNumber: "0x64",
        removed: false,
      },
    ],
  };
}

type Harness = {
  url: string;
  request_count: () => number;
  close: () => Promise<void>;
};

async function createHarness(delayMs = 0): Promise<Harness> {
  let requestCount = 0;

  const server = http.createServer((request, response) => {
    const chunks: Buffer[] = [];
    request.on("data", (chunk: Buffer | string) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    request.on("end", () => {
      void (async () => {
        if (delayMs > 0) {
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
        if (response.destroyed) return;

        requestCount += 1;
        const body = JSON.parse(Buffer.concat(chunks).toString("utf8")) as {
          jsonrpc: string;
          id: number;
          method: string;
          params: unknown[];
        };

        let result: unknown;
        if (body.method === "eth_chainId") {
          result = "0x2105";
        } else if (body.method === "eth_getTransactionReceipt") {
          result = receipt();
        } else if (body.method === "eth_blockNumber") {
          result = "0x78";
        } else if (body.method === "eth_getBlockByNumber") {
          const tag = String(body.params?.[0] ?? "");
          if (tag === "finalized" || tag === "0x6e") {
            result = block(110n, FINAL_HASH);
          } else if (tag === "0x64") {
            result = block(100n, RECEIPT_HASH);
          } else {
            throw new Error(`unexpected block tag ${tag}`);
          }
        } else {
          throw new Error(`unexpected method ${body.method}`);
        }

        response.statusCode = 200;
        response.setHeader("content-type", "application/json");
        response.end(JSON.stringify({
          jsonrpc: "2.0",
          id: body.id,
          result,
        }));
      })().catch((error) => {
        if (!response.destroyed) {
          response.statusCode = 500;
          response.end(String(error));
        }
      });
    });
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", reject);
      resolve();
    });
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("loopback harness address unavailable");
  }

  return {
    url: `http://127.0.0.1:${address.port}/`,
    request_count: () => requestCount,
    close: () => new Promise<void>((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
      server.closeAllConnections();
    }),
  };
}

function fingerprint(url: string): string {
  return crypto
    .createHash("sha256")
    .update(new URL(url).toString(), "utf8")
    .digest("hex");
}

function request() {
  return {
    request_id: "req-finality-composition-1",
    source_chain: "base",
    tx_hash: TX,
    delivery_address: DELIVERY,
    receive_address: RECEIVE,
    usdc_amount: "1",
    quoted_void: "2",
  } as any;
}

function sourcePolicy(url: string, overrides: Record<string, unknown> = {}) {
  return {
    enabled: true,
    source_chain: "base",
    chain_id: "8453",
    rpc_url: url,
    rpc_url_fingerprint_sha256: fingerprint(url),
    rpc_identity: "base-loopback-auth-v3",
    finality_adapter_id: "base-finalized-tag-v3",
    min_confirmations: "5",
    usdc_contract: USDC,
    receive_address: RECEIVE,
    timeout_ms: "1000",
    max_response_bytes: "262144",
    ...overrides,
  } as any;
}

function authorityPolicy(url: string) {
  return {
    schema: "void_buy_void_source_finality_static_policy_v2",
    marker: VOID_BUY_VOID_SOURCE_FINALITY_STATIC_POLICY_V2,
    version: 2,
    rail_order: ["base", "ethereum"],
    rails: [
      {
        source_chain: "base",
        evm_chain_id: "8453",
        usdc_contract: USDC,
        receive_address: RECEIVE,
        rpc_identity: "base-loopback-auth-v3",
        rpc_url_fingerprint_sha256: fingerprint(url),
        finality_adapter_id: "base-finalized-tag-v3",
        min_confirmations: "5",
      },
      {
        source_chain: "ethereum",
        evm_chain_id: "1",
        usdc_contract: `0x${"9".repeat(40)}`,
        receive_address: `0x${"a".repeat(40)}`,
        rpc_identity: "ethereum-auth-v3",
        rpc_url_fingerprint_sha256: "b".repeat(64),
        finality_adapter_id: "ethereum-finalized-tag-v3",
        min_confirmations: "5",
      },
    ],
    economics: { ...VOID_BUY_VOID_CANONICAL_PRESALE_ECONOMICS_V2 },
  } as any;
}

function input(url: string, totalTimeoutMs: string | number = "5000") {
  return {
    request: request(),
    policy: {
      source_finality_policy: sourcePolicy(url),
      authority_policy_generation: authorityPolicy(url),
      total_timeout_ms: totalTimeoutMs,
    },
  } as any;
}

let passed = 0;
async function test(name: string, fn: () => Promise<void> | void) {
  await fn();
  passed += 1;
  console.log(`PASS ${name}`);
}

await test("module-owned loopback transport completes exact source-finality composition", async () => {
  const harness = await createHarness();
  try {
    const result = await observeBuyVoidSourceFinalityAuthenticatedCompositionV3(
      input(harness.url),
    );
    assert.equal(result.ok, true);
    assert.equal(result.status, "source_finality_authenticated_composed");
    assert.equal(result.authenticated_transport_identity_verified, true);
    assert.equal(result.total_operation_deadline_verified, true);
    assert.equal(result.observation_generated_in_composition, true);
    assert.equal(result.remote_provider_identity_verified, false);
    assert.equal(result.source_generation_verified, false);
    assert.equal(result.production_source_finality_authority_ready, false);
    assert.equal(result.observed_rpc_call_count, "10");
    assert.equal(result.transaction_hash, TX);
    assert.equal(result.receipt_block_hash, RECEIPT_HASH);
    assert.equal(result.finalized_reference_block_hash, FINAL_HASH);
    assert.equal(harness.request_count(), 10);
  } finally {
    await harness.close();
  }
});

await test("total deadline stops a cumulative multi-call operation", async () => {
  const harness = await createHarness(35);
  try {
    const result = await observeBuyVoidSourceFinalityAuthenticatedCompositionV3(
      input(harness.url, "60"),
    );
    assert.equal(result.ok, false);
    assert.equal(result.reason, "source_finality_total_deadline_exceeded");
    assert.ok(harness.request_count() < 10);
  } finally {
    await harness.close();
  }
});

await test("RPC fingerprint mismatch fails before any network call", async () => {
  const harness = await createHarness();
  try {
    const value = input(harness.url);
    value.policy.source_finality_policy.rpc_url_fingerprint_sha256 =
      "f".repeat(64);
    const result = await observeBuyVoidSourceFinalityAuthenticatedCompositionV3(value);
    assert.equal(result.ok, false);
    assert.equal(harness.request_count(), 0);
  } finally {
    await harness.close();
  }
});

await test("caller transport injection is rejected by closed composition input", async () => {
  const harness = await createHarness();
  try {
    const value = input(harness.url);
    value.transport = { call: async () => null };
    const result = await observeBuyVoidSourceFinalityAuthenticatedCompositionV3(value);
    assert.equal(result.ok, false);
    assert.equal(result.reason, "source_finality_composition_input_shape");
    assert.equal(harness.request_count(), 0);
  } finally {
    await harness.close();
  }
});

await test("source-finality policy rejects unknown fields before network", async () => {
  const harness = await createHarness();
  try {
    const value = input(harness.url);
    value.policy.source_finality_policy.unexpected = true;
    const result = await observeBuyVoidSourceFinalityAuthenticatedCompositionV3(value);
    assert.equal(result.ok, false);
    assert.equal(harness.request_count(), 0);
  } finally {
    await harness.close();
  }
});

await test("total timeout has a finite hard maximum", async () => {
  const harness = await createHarness();
  try {
    const result = await observeBuyVoidSourceFinalityAuthenticatedCompositionV3(
      input(harness.url, "120001"),
    );
    assert.equal(result.ok, false);
    assert.equal(harness.request_count(), 0);
  } finally {
    await harness.close();
  }
});

await test("result binds module transport identity and composition policy digests", async () => {
  const harness = await createHarness();
  try {
    const result = await observeBuyVoidSourceFinalityAuthenticatedCompositionV3(
      input(harness.url),
    );
    assert.equal(result.ok, true);
    assert.match(result.transport_identity_sha256, /^[0-9a-f]{64}$/);
    assert.match(result.composition_policy_sha256, /^[0-9a-f]{64}$/);
    assert.equal(result.total_timeout_ms, "5000");
    assert.equal(result.expected_rpc_call_count, "10");
  } finally {
    await harness.close();
  }
});

await test("candidate retains no wallet signing transaction inventory or money authority", async () => {
  const harness = await createHarness();
  try {
    const result = await observeBuyVoidSourceFinalityAuthenticatedCompositionV3(
      input(harness.url),
    );
    assert.equal(result.ok, true);
    assert.equal(result.wallet_access, false);
    assert.equal(result.signing, false);
    assert.equal(result.transaction_construction, false);
    assert.equal(result.transaction_broadcast, false);
    assert.equal(result.inventory_mutation, false);
    assert.equal(result.money_movement, false);
  } finally {
    await harness.close();
  }
});

await test("source exposes no caller transport parameter or production route mount", () => {
  const source = fs.readFileSync(
    "src/economic/buy_void_source_finality_authenticated_composition_v3.ts",
    "utf8",
  );
  assert.equal(source.includes("transport?:"), false);
  assert.equal(source.includes("app.post("), false);
  assert.equal(source.includes("listen("), false);
  assert.equal(source.includes("wallet" + "_access: true"), false);
});

console.log(JSON.stringify({
  marker: "VOID_BUY_VOID_SOURCE_FINALITY_AUTHENTICATED_COMPOSITION_V3_GREEN",
  cases_passed: passed,
  cases_total: passed,
  authenticated_transport_identity_verified: true,
  remote_provider_identity_verified: false,
  total_operation_deadline_verified: true,
  observation_generated_in_composition: true,
  source_generation_verified: false,
  ancestry_verified: false,
  provider_quorum_verified: false,
  production_source_finality_authority_ready: false,
  external_rpc_executed_by_proof: false,
  loopback_rpc_only: true,
  wallet_access: false,
  signing: false,
  transaction_broadcast: false,
  inventory_mutation: false,
  money_movement: false,
}, null, 2));
console.log("VOID_BUY_VOID_SOURCE_FINALITY_AUTHENTICATED_COMPOSITION_V3_GREEN");
