import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";

import {
  observeBuyVoidSourceFinalityGenerationProvenanceV4,
  verifyBuyVoidSourceFinalityRuntimeSourceFilesV4,
  VOID_BUY_VOID_SOURCE_FINALITY_GENERATION_PROVENANCE_AUTHORITY_V4,
  VOID_BUY_VOID_SOURCE_FINALITY_GENERATION_PROVENANCE_V4,
  VOID_BUY_VOID_SOURCE_FINALITY_REVIEWED_RUNTIME_SOURCES_V4,
  VOID_BUY_VOID_SOURCE_FINALITY_REVIEWED_SOURCE_FILES_SHA256_V4,
} from "../src/economic/buy_void_source_finality_generation_provenance_v4.js";
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
  requestCount: () => number;
  close: () => Promise<void>;
};

async function createHarness(): Promise<Harness> {
  let count = 0;
  const server = http.createServer((request, response) => {
    const chunks: Buffer[] = [];
    request.on("data", (chunk: Buffer | string) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    request.on("end", () => {
      try {
        count += 1;
        const body = JSON.parse(Buffer.concat(chunks).toString("utf8")) as {
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
          throw new Error(`unexpected RPC method ${body.method}`);
        }
        response.statusCode = 200;
        response.setHeader("content-type", "application/json");
        response.end(JSON.stringify({ jsonrpc: "2.0", id: body.id, result }));
      } catch (error) {
        response.statusCode = 500;
        response.end(String(error));
      }
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
    throw new Error("loopback address unavailable");
  }
  return {
    url: `http://127.0.0.1:${address.port}/`,
    requestCount: () => count,
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

function input(url: string) {
  return {
    request: {
      request_id: "req-generation-provenance-v4-1",
      source_chain: "base",
      tx_hash: TX,
      delivery_address: DELIVERY,
      receive_address: RECEIVE,
      usdc_amount: "1",
      quoted_void: "2",
    },
    policy: {
      source_finality_policy: {
        enabled: true,
        source_chain: "base",
        chain_id: "8453",
        rpc_url: url,
        rpc_url_fingerprint_sha256: fingerprint(url),
        rpc_identity: "base-loopback-generation-v4",
        finality_adapter_id: "base-finalized-tag-generation-v4",
        min_confirmations: "5",
        usdc_contract: USDC,
        receive_address: RECEIVE,
        timeout_ms: "1000",
        max_response_bytes: "262144",
      },
      authority_policy_generation: {
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
            rpc_identity: "base-loopback-generation-v4",
            rpc_url_fingerprint_sha256: fingerprint(url),
            finality_adapter_id: "base-finalized-tag-generation-v4",
            min_confirmations: "5",
          },
          {
            source_chain: "ethereum",
            evm_chain_id: "1",
            usdc_contract: `0x${"9".repeat(40)}`,
            receive_address: `0x${"a".repeat(40)}`,
            rpc_identity: "ethereum-generation-v4",
            rpc_url_fingerprint_sha256: "b".repeat(64),
            finality_adapter_id: "ethereum-finalized-tag-generation-v4",
            min_confirmations: "5",
          },
        ],
        economics: { ...VOID_BUY_VOID_CANONICAL_PRESALE_ECONOMICS_V2 },
      },
      total_timeout_ms: "5000",
    },
  } as any;
}

function gitBlobSha1(bytes: Buffer): string {
  return crypto
    .createHash("sha1")
    .update(Buffer.from(`blob ${bytes.length}\0`, "utf8"))
    .update(bytes)
    .digest("hex");
}

let passed = 0;
async function test(name: string, fn: () => Promise<void> | void) {
  await fn();
  passed += 1;
  console.log(`PASS ${name}`);
}

await test("runtime source-file verifier binds the exact five reviewed Git blobs", () => {
  const result = verifyBuyVoidSourceFinalityRuntimeSourceFilesV4();
  if (!result.ok) throw new Error(result.reason);
  assert.equal(result.reviewed_source_files_verified, true);
  assert.equal(result.verified_source_file_count, "5");
  assert.equal(result.verification_mode, "runtime_git_blob_identity_v1");
  assert.equal(
    result.reviewed_source_files_sha256,
    VOID_BUY_VOID_SOURCE_FINALITY_REVIEWED_SOURCE_FILES_SHA256_V4,
  );
  assert.match(result.reviewed_source_files_sha256, /^[0-9a-f]{64}$/);
});

await test("independent proof recomputes every reviewed runtime Git blob", () => {
  assert.equal(VOID_BUY_VOID_SOURCE_FINALITY_REVIEWED_RUNTIME_SOURCES_V4.length, 5);
  for (const record of VOID_BUY_VOID_SOURCE_FINALITY_REVIEWED_RUNTIME_SOURCES_V4) {
    const bytes = fs.readFileSync(record.path);
    assert.equal(gitBlobSha1(bytes), record.git_blob_sha1, record.path);
    const tampered = Buffer.from(bytes);
    tampered[0] = tampered[0] ^ 1;
    assert.notEqual(gitBlobSha1(tampered), record.git_blob_sha1, record.path);
  }
});

await test("V4 checks reviewed source files before dynamically entering V3", async () => {
  const harness = await createHarness();
  try {
    const result = await observeBuyVoidSourceFinalityGenerationProvenanceV4(
      input(harness.url),
    );
    if (!result.ok) throw new Error(result.reason);
    assert.equal(result.status, "source_finality_reviewed_source_files_verified");
    assert.equal(result.marker, VOID_BUY_VOID_SOURCE_FINALITY_GENERATION_PROVENANCE_V4);
    assert.equal(result.version, 4);
    assert.equal(result.reviewed_source_files_verified, true);
    assert.equal(result.source_generation_verified, false);
    assert.equal(result.deployed_artifact_generation_verified, false);
    assert.equal(result.authenticated_transport_identity_verified, true);
    assert.equal(result.total_operation_deadline_verified, true);
    assert.equal(result.observation_generated_in_composition, true);
    assert.equal(result.remote_provider_identity_verified, false);
    assert.equal(result.ancestry_verified, false);
    assert.equal(result.provider_quorum_verified, false);
    assert.equal(result.production_source_finality_authority_ready, false);
    assert.equal(result.verified_source_file_count, "5");
    assert.equal(result.source_file_verification_mode, "runtime_git_blob_identity_v1");
    assert.equal(result.transaction_hash, TX);
    assert.equal(result.receipt_block_hash, RECEIPT_HASH);
    assert.equal(result.finalized_reference_block_hash, FINAL_HASH);
    assert.equal(harness.requestCount(), 10);
  } finally {
    await harness.close();
  }
});

await test("caller cannot inject a generation manifest or provenance assertion", async () => {
  const harness = await createHarness();
  try {
    const value = input(harness.url);
    value.source_generation = {
      source_generation_verified: true,
      reviewed_source_files_sha256: "f".repeat(64),
    };
    const result = await observeBuyVoidSourceFinalityGenerationProvenanceV4(value);
    assert.equal(result.ok, false);
    assert.equal(
      result.reason,
      "source_finality_v3_source_finality_composition_input_shape",
    );
    assert.equal(harness.requestCount(), 0);
  } finally {
    await harness.close();
  }
});

await test("transport-policy failure still occurs before any RPC", async () => {
  const harness = await createHarness();
  try {
    const value = input(harness.url);
    value.policy.source_finality_policy.rpc_url_fingerprint_sha256 = "f".repeat(64);
    const result = await observeBuyVoidSourceFinalityGenerationProvenanceV4(value);
    assert.equal(result.ok, false);
    assert.equal(harness.requestCount(), 0);
  } finally {
    await harness.close();
  }
});

await test("authority preserves the deployed-generation HOLD", () => {
  const authority = VOID_BUY_VOID_SOURCE_FINALITY_GENERATION_PROVENANCE_AUTHORITY_V4;
  assert.equal(authority.caller_generation_assertion_accepted, false);
  assert.equal(authority.reviewed_source_files_verification_required, true);
  assert.equal(authority.reviewed_source_files_verified_on_success, true);
  assert.equal(authority.source_generation_verified_on_success, false);
  assert.equal(authority.deployed_artifact_generation_verified, false);
  assert.equal(authority.remote_provider_identity_verified, false);
  assert.equal(authority.ancestry_verified, false);
  assert.equal(authority.provider_quorum_verified, false);
  assert.equal(authority.production_source_finality_authority_ready, false);
  assert.equal(authority.runtime_source_filesystem_write, false);
  assert.equal(authority.rpc_write, false);
  assert.equal(authority.wallet_access, false);
  assert.equal(authority.signing, false);
  assert.equal(authority.transaction_construction, false);
  assert.equal(authority.transaction_broadcast, false);
  assert.equal(authority.inventory_mutation, false);
  assert.equal(authority.chain2050_mutation, false);
  assert.equal(authority.public_presale_activation, false);
  assert.equal(authority.money_movement, false);
});

await test("source verifies files before dynamic V3 entry and contains no source mutation", () => {
  const source = fs.readFileSync(
    "src/economic/buy_void_source_finality_generation_provenance_v4.ts",
    "utf8",
  );
  const verifyIndex = source.indexOf(
    "const sourceFiles = verifyBuyVoidSourceFinalityRuntimeSourceFilesV4()",
  );
  const importIndex = source.indexOf(
    'await import("./buy_void_source_finality_authenticated_composition_v3.js")',
  );
  assert.ok(verifyIndex >= 0);
  assert.ok(importIndex > verifyIndex);
  assert.equal(source.includes("process.env"), false);
  assert.equal(source.includes("app.post("), false);
  assert.equal(source.includes("listen("), false);
  assert.equal(source.includes("writeFile"), false);
  assert.equal(source.includes("unlink"), false);
  assert.equal(source.includes("rename"), false);
  assert.equal(source.includes("caller_generation_assertion_accepted: true"), false);
  assert.equal(source.includes("source_generation_verified_on_success: true"), false);
  assert.equal(source.includes("deployed_artifact_generation_verified: true"), false);
  assert.equal(source.includes("production_source_finality_authority_ready: true"), false);
});

console.log(JSON.stringify({
  marker: "VOID_BUY_VOID_SOURCE_FINALITY_GENERATION_PROVENANCE_V4_GREEN",
  cases_passed: passed,
  cases_total: passed,
  reviewed_source_file_count: 5,
  reviewed_source_files_verified_on_success: true,
  source_generation_verified_on_success: false,
  caller_generation_assertion_accepted: false,
  deployed_artifact_generation_verified: false,
  authenticated_transport_identity_verified: true,
  total_operation_deadline_verified: true,
  remote_provider_identity_verified: false,
  ancestry_verified: false,
  provider_quorum_verified: false,
  production_source_finality_authority_ready: false,
  external_rpc_executed_by_proof: false,
  loopback_rpc_only: true,
  wallet_access: false,
  signing: false,
  transaction_broadcast: false,
  inventory_mutation: false,
  chain2050_mutation: false,
  money_movement: false,
}, null, 2));
console.log("VOID_BUY_VOID_SOURCE_FINALITY_GENERATION_PROVENANCE_V4_GREEN");
