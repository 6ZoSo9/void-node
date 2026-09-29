#!/usr/bin/env node
import http from "node:http";

import {
  VOID_ECONOMIC_EPOCH2_PUBLIC_READ_GATEWAY_V1,
  VoidEconomicEpoch2PublicReadGatewayHoldV1,
  queryVoidEconomicEpoch2PublicReadGatewayV1,
} from "../../tools/void-economic-epoch2-public-read-gateway-v1.mjs";
import {
  createVoidEconomicEpoch2PublicReadLoopbackTransportV1,
} from "../../tools/void-economic-epoch2-public-read-loopback-transport-v1.mjs";

export const VOID_ECONOMIC_EPOCH2_PUBLIC_READ_RUNTIME_V1 =
  "VOID_ECONOMIC_EPOCH2_PUBLIC_READ_RUNTIME_V1";

const EXPECTED_STATE_ROOT =
  "0x7aef6c030a691569cdb0d033f1b9333c1a07cdc9de0c0fbfb952fddbd96cc2b2";
const EXPECTED_BLOCK_HASH =
  "0x8b522cd3dad5301f2d48c2fb1a750fca1e55dfcaa8bf699423bccdb5a061d01d";
const BLOCK_NUMBER = "0x0";
const ADDRESS = /^0x[0-9a-f]{40}$/u;
const HASH = /^0x[0-9a-f]{64}$/u;
const MAX_REQUESTS_PER_MINUTE = 120;
const WINDOW_MS = 60_000;
const HOST = String(
  process.env.VOID_EPOCH2_PUBLIC_READ_HOST || "127.0.0.1",
);
const PORT = Number(
  process.env.VOID_EPOCH2_PUBLIC_READ_PORT || "4124",
);
const RPC_ENDPOINT = String(
  process.env.VOID_EPOCH2_SUCCESSOR_RPC_ENDPOINT ||
    "http://127.0.0.1:18552/",
);

if (HOST !== "127.0.0.1") {
  throw new Error("public economic read runtime must bind 127.0.0.1");
}
if (!Number.isSafeInteger(PORT) || PORT < 1024 || PORT > 65535) {
  throw new Error("invalid public economic read runtime port");
}

const binding =
  createVoidEconomicEpoch2PublicReadLoopbackTransportV1({
    endpoint: RPC_ENDPOINT,
  });
const transport = binding.transport;

let windowStartedAt = Date.now();
let windowCount = 0;

function admitRequest() {
  const now = Date.now();
  if (now - windowStartedAt >= WINDOW_MS) {
    windowStartedAt = now;
    windowCount = 0;
  }
  windowCount += 1;
  return windowCount <= MAX_REQUESTS_PER_MINUTE;
}

function sendJson(res, status, value, method = "GET") {
  const body = Buffer.from(JSON.stringify(value, null, 2) + "\n");
  res.writeHead(status, {
    "cache-control": "no-store",
    "content-type": "application/json; charset=utf-8",
    "content-length": method === "HEAD" ? "0" : String(body.length),
    "x-content-type-options": "nosniff",
    "x-void-economic-epoch2-public-read": "v1",
  });
  if (method === "HEAD") return res.end();
  res.end(body);
}

function exactSingleParam(url, name, pattern) {
  const keys = [...url.searchParams.keys()];
  if (
    keys.length !== 1 ||
    keys[0] !== name ||
    url.searchParams.getAll(name).length !== 1
  ) {
    return null;
  }
  const value = String(url.searchParams.get(name) || "").toLowerCase();
  return pattern.test(value) ? value : null;
}

async function probeSuccessor() {
  const chainId = await transport({
    method: "eth_chainId",
    params: [],
    timeout_ms: 2_000,
  });
  if (String(chainId).toLowerCase() !== "0x802") {
    throw new Error("successor_chain_id_mismatch");
  }

  const block = await transport({
    method: "eth_getBlockByNumber",
    params: [BLOCK_NUMBER, false],
    timeout_ms: 2_000,
  });
  if (
    !block ||
    String(block.number || "").toLowerCase() !== BLOCK_NUMBER ||
    String(block.hash || "").toLowerCase() !== EXPECTED_BLOCK_HASH ||
    String(block.stateRoot || "").toLowerCase() !== EXPECTED_STATE_ROOT
  ) {
    throw new Error("successor_block0_identity_mismatch");
  }

  return Object.freeze({
    chain_id: 2050,
    execution_epoch: 2,
    block_number: BLOCK_NUMBER,
    block_hash: EXPECTED_BLOCK_HASH,
    state_root: EXPECTED_STATE_ROOT,
  });
}

function runtimeBoundary() {
  return Object.freeze({
    production_successor_rpc_endpoint_selected: true,
    exact_production_genesis_read_replica: true,
    p2p_enabled: false,
    discovery_enabled: false,
    raw_public_rpc_allowed: false,
    transaction_construction: false,
    transaction_signing: false,
    transaction_submission: false,
    transaction_broadcast: false,
    authoritative_chain2050_write: false,
    wallet_access: false,
    private_key_access: false,
    credential_content_access: false,
    validator_mutation: false,
    token_movement: false,
    funds_movement: false,
    migration_authorized: false,
    public_activation_authorized: false,
  });
}

const server = http.createServer(async (req, res) => {
  const method = String(req.method || "GET").toUpperCase();
  if (method !== "GET" && method !== "HEAD") {
    return sendJson(
      res,
      405,
      { ok: false, error: "method_not_allowed" },
      method,
    );
  }
  if (!admitRequest()) {
    return sendJson(
      res,
      429,
      { ok: false, error: "rate_limit_exceeded" },
      method,
    );
  }

  let url;
  try {
    url = new URL(req.url || "/", "http://127.0.0.1");
  } catch {
    return sendJson(res, 400, { ok: false, error: "invalid_url" }, method);
  }

  try {
    const block = await probeSuccessor();

    if (
      url.pathname ===
      "/public-node/economic/epoch2/read-status-v1.json"
    ) {
      if (url.search) {
        return sendJson(
          res,
          400,
          { ok: false, error: "query_not_allowed" },
          method,
        );
      }
      return sendJson(
        res,
        200,
        {
          ok: true,
          marker: VOID_ECONOMIC_EPOCH2_PUBLIC_READ_RUNTIME_V1,
          status: "INACTIVE_SUCCESSOR_PUBLIC_READ_RUNTIME_READY",
          ...block,
          query_kinds: ["balance", "code", "receipt"],
          balance_code_block_fixed_to_genesis: true,
          live_receipt_lookup_transport_verified: true,
          successful_receipt_semantics_source_proven: true,
          live_balance_receipt_code_gateway_ready: true,
          runtime_route_active: true,
          public_gateway_active: false,
          ...runtimeBoundary(),
        },
        method,
      );
    }

    if (
      url.pathname ===
        "/public-node/economic/epoch2/balance-v1" ||
      url.pathname ===
        "/public-node/economic/epoch2/code-v1"
    ) {
      const address = exactSingleParam(url, "address", ADDRESS);
      if (!address) {
        return sendJson(
          res,
          400,
          { ok: false, error: "canonical_address_required" },
          method,
        );
      }
      const kind = url.pathname.endsWith("/balance-v1")
        ? "balance"
        : "code";
      const result =
        await queryVoidEconomicEpoch2PublicReadGatewayV1({
          request: {
            marker: VOID_ECONOMIC_EPOCH2_PUBLIC_READ_GATEWAY_V1,
            version: 1,
            kind,
            address,
            block_number: BLOCK_NUMBER,
          },
          transport,
          timeoutMs: 2_000,
        });
      if (
        result?.ok !== true ||
        result?.block_hash !== EXPECTED_BLOCK_HASH ||
        result?.state_root !== EXPECTED_STATE_ROOT
      ) {
        throw new Error("bounded_read_result_identity_mismatch");
      }
      return sendJson(
        res,
        200,
        {
          ok: true,
          marker: VOID_ECONOMIC_EPOCH2_PUBLIC_READ_RUNTIME_V1,
          status: "LIVE_SUCCESSOR_PUBLIC_READ_VERIFIED",
          query_kind: kind,
          source_evidence_id: result.evidence_id,
          block_number: result.block_number,
          block_hash: result.block_hash,
          state_root: result.state_root,
          address: result.address,
          result: result.result,
          exact_block_identity_revalidated:
            result.exact_block_identity_revalidated === true,
          live_balance_receipt_code_gateway_ready: true,
          runtime_route_active: true,
          public_gateway_active: false,
          ...runtimeBoundary(),
        },
        method,
      );
    }

    if (
      url.pathname ===
      "/public-node/economic/epoch2/receipt-v1"
    ) {
      const transactionHash =
        exactSingleParam(url, "tx", HASH);
      if (!transactionHash) {
        return sendJson(
          res,
          400,
          { ok: false, error: "canonical_transaction_hash_required" },
          method,
        );
      }

      try {
        const result =
          await queryVoidEconomicEpoch2PublicReadGatewayV1({
            request: {
              marker: VOID_ECONOMIC_EPOCH2_PUBLIC_READ_GATEWAY_V1,
              version: 1,
              kind: "receipt",
              transaction_hash: transactionHash,
            },
            transport,
            timeoutMs: 2_000,
          });
        return sendJson(
          res,
          200,
          {
            ok: true,
            marker: VOID_ECONOMIC_EPOCH2_PUBLIC_READ_RUNTIME_V1,
            status: "LIVE_SUCCESSOR_RECEIPT_VERIFIED",
            receipt_found: true,
            source_evidence_id: result.evidence_id,
            transaction_hash: result.transaction_hash,
            block_number: result.block_number,
            block_hash: result.block_hash,
            state_root: result.state_root,
            receipt_status: result.receipt_status,
            receipt_from: result.receipt_from,
            receipt_to: result.receipt_to,
            exact_receipt_identity_revalidated:
              result.exact_receipt_identity_revalidated === true,
            exact_block_identity_revalidated:
              result.exact_block_identity_revalidated === true,
            live_receipt_lookup_transport_verified: true,
            successful_receipt_semantics_source_proven: true,
            live_balance_receipt_code_gateway_ready: true,
            runtime_route_active: true,
            public_gateway_active: false,
            ...runtimeBoundary(),
          },
          method,
        );
      } catch (error) {
        if (
          error instanceof
            VoidEconomicEpoch2PublicReadGatewayHoldV1 &&
          error.reason === "receipt_not_found"
        ) {
          return sendJson(
            res,
            404,
            {
              ok: true,
              marker:
                VOID_ECONOMIC_EPOCH2_PUBLIC_READ_RUNTIME_V1,
              status:
                "LIVE_SUCCESSOR_RECEIPT_LOOKUP_VERIFIED_NOT_FOUND",
              receipt_found: false,
              transaction_hash: transactionHash,
              block_number: block.block_number,
              block_hash: block.block_hash,
              state_root: block.state_root,
              live_receipt_lookup_transport_verified: true,
              successful_receipt_semantics_source_proven: true,
              live_balance_receipt_code_gateway_ready: true,
              runtime_route_active: true,
              public_gateway_active: false,
              ...runtimeBoundary(),
            },
            method,
          );
        }
        throw error;
      }
    }

    return sendJson(
      res,
      404,
      { ok: false, error: "route_not_public" },
      method,
    );
  } catch (error) {
    return sendJson(
      res,
      503,
      {
        ok: false,
        marker: VOID_ECONOMIC_EPOCH2_PUBLIC_READ_RUNTIME_V1,
        error: "successor_read_runtime_unavailable",
        detail: String(error?.reason || error?.message || error),
        live_balance_receipt_code_gateway_ready: false,
        runtime_route_active: false,
        public_gateway_active: false,
        authoritative_chain2050_write: false,
        funds_movement: false,
      },
      method,
    );
  }
});

server.listen(PORT, HOST, () => {
  console.log(
    VOID_ECONOMIC_EPOCH2_PUBLIC_READ_RUNTIME_V1 +
      " host=" + HOST +
      " port=" + String(PORT) +
      " rpc_endpoint=loopback_only" +
      " production_successor_rpc_endpoint_selected=true" +
      " raw_public_rpc_allowed=false" +
      " authoritative_chain2050_write=false" +
      " funds_movement=false",
  );
});
