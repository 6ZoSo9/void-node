import crypto from "node:crypto";
import http from "node:http";
import https from "node:https";
import type {
  BuyVoidRequestV1,
} from "./buy_void_auto_fulfillment_v1.js";
import type {
  BuyVoidTransactionReceiptV2,
} from "./buy_void_verified_payment_v2.js";

export const VOID_BUY_VOID_PAYMENT_RPC_OBSERVER_V1 =
  "VOID_BUY_VOID_PAYMENT_RPC_OBSERVER_V1";

export const VOID_BUY_VOID_PAYMENT_RPC_OBSERVER_AUTHORITY_V1 = {
  server_controlled_rpc_policy: true,
  rpc_read: true,
  rpc_write: false,
  allowed_rpc_methods: [
    "eth_chainId",
    "eth_getTransactionReceipt",
    "eth_blockNumber",
  ],
  wallet_access: false,
  signing: false,
  transaction_broadcast: false,
  filesystem_write: false,
  runtime_route_mount: false,
  background_loop: false,
  money_movement: false,
} as const;

const HEX_32 = /^0x[0-9a-f]{64}$/;
const CHAIN = /^(base|ethereum)$/;
const DEFAULT_TIMEOUT_MS = 8_000;
const DEFAULT_MAX_RESPONSE_BYTES = 262_144;
const MAX_TIMEOUT_MS = 30_000;
const MAX_RESPONSE_BYTES = 1_048_576;

export type BuyVoidPaymentRpcMethodV1 =
  | "eth_chainId"
  | "eth_getTransactionReceipt"
  | "eth_blockNumber";

export type BuyVoidPaymentRpcCallV1 = {
  method: BuyVoidPaymentRpcMethodV1;
  params: unknown[];
};

export type BuyVoidPaymentRpcTransportV1 = {
  call(input: BuyVoidPaymentRpcCallV1): Promise<unknown>;
};

export type BuyVoidPaymentRpcObserverPolicyV1 = {
  enabled: boolean;
  source_chain: "base" | "ethereum";
  chain_id: string | number;
  rpc_url: string;
  timeout_ms?: string | number;
  max_response_bytes?: string | number;
};

export type BuyVoidPaymentObservationReadyV1 = {
  ok: true;
  status: "observed";
  marker: typeof VOID_BUY_VOID_PAYMENT_RPC_OBSERVER_V1;
  source_chain: "base" | "ethereum";
  chain_id: string;
  payment_transaction_hash: string;
  receipt: BuyVoidTransactionReceiptV2;
  receipt_block_number: string;
  current_block_number: string;
  rpc_url_fingerprint_sha256: string;
  rpc_methods_used: BuyVoidPaymentRpcMethodV1[];
};

export type BuyVoidPaymentObservationHeldV1 = {
  ok: false;
  status: "held";
  marker: typeof VOID_BUY_VOID_PAYMENT_RPC_OBSERVER_V1;
  reason: string;
  detail?: Record<string, unknown>;
};

export type BuyVoidPaymentObservationDecisionV1 =
  | BuyVoidPaymentObservationReadyV1
  | BuyVoidPaymentObservationHeldV1;

type NormalizedPolicyV1 = {
  source_chain: "base" | "ethereum";
  chain_id: bigint;
  rpc_url: URL;
  timeout_ms: number;
  max_response_bytes: number;
  rpc_url_fingerprint_sha256: string;
};

function held(
  reason: string,
  detail?: Record<string, unknown>,
): BuyVoidPaymentObservationHeldV1 {
  return {
    ok: false,
    status: "held",
    marker: VOID_BUY_VOID_PAYMENT_RPC_OBSERVER_V1,
    reason,
    ...(detail ? { detail } : {}),
  };
}

function safeErrorClass(error: unknown): string {
  return String(
    (error as { name?: unknown })?.name || "Error",
  ).slice(0, 80);
}

function normalizeHash(value: unknown): string {
  const hash = String(value || "").trim().toLowerCase();
  return HEX_32.test(hash) ? hash : "";
}

function parseNonNegativeInteger(value: unknown): bigint | null {
  if (typeof value === "bigint") {
    return value >= 0n ? value : null;
  }
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value) || value < 0) return null;
    return BigInt(value);
  }

  const raw = String(value ?? "").trim().toLowerCase();
  if (!raw) return null;

  try {
    if (/^0x[0-9a-f]+$/.test(raw) || /^[0-9]+$/.test(raw)) {
      const parsed = BigInt(raw);
      return parsed >= 0n ? parsed : null;
    }
  } catch {
    return null;
  }

  return null;
}

function boundedInteger(
  value: unknown,
  fallback: number,
  maximum: number,
): number {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.min(parsed, maximum);
}

function normalizePolicy(
  policy: BuyVoidPaymentRpcObserverPolicyV1,
): NormalizedPolicyV1 | BuyVoidPaymentObservationHeldV1 {
  if (policy?.enabled !== true) {
    return held("payment_observer_disabled");
  }

  const sourceChain = String(
    policy.source_chain || "",
  ).trim().toLowerCase();
  if (!CHAIN.test(sourceChain)) {
    return held("invalid_payment_observer_source_chain");
  }

  const chainId = parseNonNegativeInteger(policy.chain_id);
  if (chainId === null || chainId <= 0n) {
    return held("invalid_payment_observer_chain_id");
  }

  let rpcUrl: URL;
  try {
    rpcUrl = new URL(String(policy.rpc_url || "").trim());
  } catch {
    return held("invalid_payment_observer_rpc_url");
  }

  if (rpcUrl.username || rpcUrl.password || rpcUrl.hash) {
    return held("payment_observer_rpc_url_credentials_forbidden");
  }

  const loopbackHost =
    rpcUrl.hostname === "127.0.0.1" ||
    rpcUrl.hostname === "::1" ||
    rpcUrl.hostname === "localhost";
  const allowedProtocol =
    rpcUrl.protocol === "https:" ||
    (rpcUrl.protocol === "http:" && loopbackHost);
  if (!allowedProtocol) {
    return held("payment_observer_rpc_transport_not_allowed");
  }

  return {
    source_chain: sourceChain as "base" | "ethereum",
    chain_id: chainId,
    rpc_url: rpcUrl,
    timeout_ms: boundedInteger(
      policy.timeout_ms,
      DEFAULT_TIMEOUT_MS,
      MAX_TIMEOUT_MS,
    ),
    max_response_bytes: boundedInteger(
      policy.max_response_bytes,
      DEFAULT_MAX_RESPONSE_BYTES,
      MAX_RESPONSE_BYTES,
    ),
    rpc_url_fingerprint_sha256: crypto
      .createHash("sha256")
      .update(rpcUrl.toString(), "utf8")
      .digest("hex"),
  };
}

export function createBuyVoidPaymentHttpTransportV1(
  policy: BuyVoidPaymentRpcObserverPolicyV1,
): BuyVoidPaymentRpcTransportV1 | BuyVoidPaymentObservationHeldV1 {
  const normalized = normalizePolicy(policy);
  if ("reason" in normalized) return normalized;

  let requestId = 0;

  return {
    async call(input: BuyVoidPaymentRpcCallV1): Promise<unknown> {
      if (
        !VOID_BUY_VOID_PAYMENT_RPC_OBSERVER_AUTHORITY_V1
          .allowed_rpc_methods.includes(input.method)
      ) {
        throw new Error("payment_observer_rpc_method_not_allowed");
      }

      const currentRequestId = ++requestId;
      const payload = Buffer.from(
        JSON.stringify({
          jsonrpc: "2.0",
          id: currentRequestId,
          method: input.method,
          params: input.params,
        }),
        "utf8",
      );

      const client =
        normalized.rpc_url.protocol === "https:" ? https : http;

      return new Promise((resolve, reject) => {
        const request = client.request(
          normalized.rpc_url,
          {
            method: "POST",
            headers: {
              "content-type": "application/json",
              accept: "application/json",
              "content-length": String(payload.byteLength),
            },
            timeout: normalized.timeout_ms,
          },
          (response) => {
            const chunks: Buffer[] = [];
            let size = 0;

            response.on("data", (chunk: Buffer | string) => {
              const value = Buffer.isBuffer(chunk)
                ? chunk
                : Buffer.from(chunk);
              size += value.byteLength;
              if (size > normalized.max_response_bytes) {
                request.destroy(
                  new Error("payment_observer_rpc_response_too_large"),
                );
                return;
              }
              chunks.push(value);
            });

            response.on("end", () => {
              if (
                typeof response.statusCode !== "number" ||
                response.statusCode < 200 ||
                response.statusCode >= 300
              ) {
                reject(
                  new Error("payment_observer_rpc_http_status"),
                );
                return;
              }

              const contentType = String(
                response.headers["content-type"] || "",
              ).toLowerCase();
              if (!contentType.startsWith("application/json")) {
                reject(
                  new Error("payment_observer_rpc_content_type_invalid"),
                );
                return;
              }

              let decoded: unknown;
              try {
                decoded = JSON.parse(
                  Buffer.concat(chunks).toString("utf8"),
                );
              } catch {
                reject(
                  new Error("payment_observer_rpc_invalid_json"),
                );
                return;
              }

              if (
                !decoded ||
                typeof decoded !== "object" ||
                Array.isArray(decoded)
              ) {
                reject(
                  new Error("payment_observer_rpc_invalid_envelope"),
                );
                return;
              }

              const envelope = decoded as Record<string, unknown>;
              if (
                envelope.jsonrpc !== "2.0" ||
                envelope.id !== currentRequestId
              ) {
                reject(
                  new Error("payment_observer_rpc_envelope_mismatch"),
                );
                return;
              }
              if (envelope.error) {
                reject(
                  new Error("payment_observer_rpc_error_response"),
                );
                return;
              }
              if (!Object.prototype.hasOwnProperty.call(envelope, "result")) {
                reject(
                  new Error("payment_observer_rpc_result_missing"),
                );
                return;
              }

              resolve(envelope.result);
            });
          },
        );

        request.on("timeout", () => {
          request.destroy(
            new Error("payment_observer_rpc_timeout"),
          );
        });
        request.on("error", reject);
        request.end(payload);
      });
    },
  };
}

function normalizeReceipt(
  value: unknown,
  expectedHash: string,
): {
  receipt: BuyVoidTransactionReceiptV2;
  block_number: bigint;
} | BuyVoidPaymentObservationHeldV1 {
  if (!value) return held("payment_receipt_not_found");
  if (typeof value !== "object" || Array.isArray(value)) {
    return held("invalid_payment_receipt_shape");
  }

  const raw = value as Record<string, unknown>;
  const transactionHash = normalizeHash(raw.transactionHash);
  if (!transactionHash || transactionHash !== expectedHash) {
    return held("payment_receipt_transaction_hash_mismatch");
  }

  const blockNumber = parseNonNegativeInteger(raw.blockNumber);
  if (blockNumber === null || blockNumber <= 0n) {
    return held("payment_receipt_block_number_missing");
  }

  if (!Array.isArray(raw.logs)) {
    return held("payment_receipt_logs_missing");
  }

  return {
    receipt: {
      status: raw.status,
      transactionHash,
      blockNumber: raw.blockNumber,
      logs: raw.logs,
    },
    block_number: blockNumber,
  };
}

export async function observeBuyVoidPaymentV1(input: {
  request: BuyVoidRequestV1;
  policy: BuyVoidPaymentRpcObserverPolicyV1;
  transport?: BuyVoidPaymentRpcTransportV1;
}): Promise<BuyVoidPaymentObservationDecisionV1> {
  const normalized = normalizePolicy(input?.policy);
  if ("reason" in normalized) return normalized;

  const requestChainRaw = String(
    input?.request?.source_chain || "",
  ).trim().toLowerCase();
  const requestChain =
    requestChainRaw === "eth" ? "ethereum" : requestChainRaw;
  if (requestChain !== normalized.source_chain) {
    return held("payment_observer_request_chain_mismatch");
  }

  const transactionHash = normalizeHash(
    input?.request?.tx_hash,
  );
  if (!transactionHash) {
    return held("payment_observer_request_tx_hash_invalid");
  }

  const transport =
    input.transport ||
    createBuyVoidPaymentHttpTransportV1(input.policy);
  if ("reason" in transport) return transport;

  const methods: BuyVoidPaymentRpcMethodV1[] = [];

  try {
    methods.push("eth_chainId");
    const observedChainId = parseNonNegativeInteger(
      await transport.call({
        method: "eth_chainId",
        params: [],
      }),
    );
    if (
      observedChainId === null ||
      observedChainId !== normalized.chain_id
    ) {
      return held("payment_observer_chain_id_mismatch", {
        expected_chain_id: normalized.chain_id.toString(),
        observed_chain_id:
          observedChainId === null
            ? ""
            : observedChainId.toString(),
      });
    }

    methods.push("eth_getTransactionReceipt");
    const rawReceipt = await transport.call({
      method: "eth_getTransactionReceipt",
      params: [transactionHash],
    });
    const normalizedReceipt = normalizeReceipt(
      rawReceipt,
      transactionHash,
    );
    if ("reason" in normalizedReceipt) {
      return normalizedReceipt;
    }

    methods.push("eth_blockNumber");
    const currentBlock = parseNonNegativeInteger(
      await transport.call({
        method: "eth_blockNumber",
        params: [],
      }),
    );
    if (
      currentBlock === null ||
      currentBlock < normalizedReceipt.block_number
    ) {
      return held("payment_observer_current_block_invalid", {
        receipt_block_number:
          normalizedReceipt.block_number.toString(),
        current_block_number:
          currentBlock === null ? "" : currentBlock.toString(),
      });
    }

    return {
      ok: true,
      status: "observed",
      marker: VOID_BUY_VOID_PAYMENT_RPC_OBSERVER_V1,
      source_chain: normalized.source_chain,
      chain_id: normalized.chain_id.toString(),
      payment_transaction_hash: transactionHash,
      receipt: normalizedReceipt.receipt,
      receipt_block_number:
        normalizedReceipt.block_number.toString(),
      current_block_number: currentBlock.toString(),
      rpc_url_fingerprint_sha256:
        normalized.rpc_url_fingerprint_sha256,
      rpc_methods_used: methods,
    };
  } catch (error) {
    return held("payment_observer_rpc_call_failed", {
      error_class: safeErrorClass(error),
      methods_completed: methods,
    });
  }
}
