import assert from "node:assert/strict";
import crypto from "node:crypto";
import http from "node:http";

import {
  observeBuyVoidSourceFinalityAuthenticatedCompositionV3,
} from "../src/economic/buy_void_source_finality_authenticated_composition_v3.js";
import {
  VOID_BUY_VOID_CANONICAL_PRESALE_ECONOMICS_V2,
  VOID_BUY_VOID_SOURCE_FINALITY_STATIC_POLICY_V2,
} from "../src/economic/buy_void_source_finality_authority_v2.js";

const TX = `0x${"1".repeat(64)}`;
const DELIVERY = `0x${"2".repeat(40)}`;
const RECEIVE = `0x${"3".repeat(40)}`;
const USDC = `0x${"4".repeat(40)}`;

function fingerprint(url: string): string {
  return crypto
    .createHash("sha256")
    .update(new URL(url).toString(), "utf8")
    .digest("hex");
}

function compositionInput(url: string) {
  const rpcFingerprint = fingerprint(url);
  return {
    request: {
      request_id: "req-finality-truncated-response-1",
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
        rpc_url_fingerprint_sha256: rpcFingerprint,
        rpc_identity: "base-loopback-truncated-v3",
        finality_adapter_id: "base-finalized-tag-truncated-v3",
        min_confirmations: "5",
        usdc_contract: USDC,
        receive_address: RECEIVE,
        timeout_ms: "5000",
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
            rpc_identity: "base-loopback-truncated-v3",
            rpc_url_fingerprint_sha256: rpcFingerprint,
            finality_adapter_id: "base-finalized-tag-truncated-v3",
            min_confirmations: "5",
          },
          {
            source_chain: "ethereum",
            evm_chain_id: "1",
            usdc_contract: `0x${"9".repeat(40)}`,
            receive_address: `0x${"a".repeat(40)}`,
            rpc_identity: "ethereum-truncated-v3",
            rpc_url_fingerprint_sha256: "b".repeat(64),
            finality_adapter_id: "ethereum-finalized-tag-truncated-v3",
            min_confirmations: "5",
          },
        ],
        economics: { ...VOID_BUY_VOID_CANONICAL_PRESALE_ECONOMICS_V2 },
      },
      total_timeout_ms: "5000",
    },
  } as any;
}

let requestCount = 0;
const server = http.createServer((request, response) => {
  const chunks: Buffer[] = [];
  request.on("data", (chunk: Buffer | string) => {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  });
  request.on("end", () => {
    requestCount += 1;
    const body = JSON.parse(Buffer.concat(chunks).toString("utf8")) as {
      id: number;
    };

    response.statusCode = 200;
    response.setHeader("content-type", "application/json");
    response.setHeader("content-length", "4096");
    response.flushHeaders();
    response.write(`{"jsonrpc":"2.0","id":${body.id},"result":"0x2`);
    setTimeout(() => response.destroy(), 10);
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
  throw new Error("loopback truncated-response harness address unavailable");
}
const url = `http://127.0.0.1:${address.port}/`;

try {
  const outcome = await Promise.race([
    observeBuyVoidSourceFinalityAuthenticatedCompositionV3(
      compositionInput(url),
    ).then((result) => ({ kind: "result" as const, result })),
    new Promise<{ kind: "watchdog" }>((resolve) => {
      setTimeout(() => resolve({ kind: "watchdog" }), 750);
    }),
  ]);

  assert.equal(outcome.kind, "result", "truncated response must settle before watchdog");
  if (outcome.kind !== "result") {
    throw new Error("truncated response did not settle");
  }
  assert.equal(outcome.result.ok, false);
  assert.equal(requestCount, 1);
} finally {
  server.closeAllConnections();
  await new Promise<void>((resolve) => server.close(() => resolve()));
}

console.log(JSON.stringify({
  marker: "VOID_BUY_VOID_SOURCE_FINALITY_AUTHENTICATED_COMPOSITION_V3_TRUNCATED_RESPONSE_GREEN",
  truncated_response_settles: true,
  watchdog_ms: 750,
  total_timeout_ms: 5000,
  external_rpc_executed_by_proof: false,
  loopback_rpc_only: true,
  wallet_access: false,
  signing: false,
  transaction_broadcast: false,
  money_movement: false,
}, null, 2));
console.log("VOID_BUY_VOID_SOURCE_FINALITY_AUTHENTICATED_COMPOSITION_V3_TRUNCATED_RESPONSE_GREEN");
