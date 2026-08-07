import crypto from "node:crypto";
import * as http from "node:http";
import { Transaction } from "ethers";
import {
  createBuyVoidNativeChain2050BroadcasterV1,
  type BuyVoidNativeChain2050BroadcasterPolicyV1,
  type BuyVoidNativeChain2050JsonRpcTransportV1,
} from "./buy_void_native_chain2050_broadcaster_v1.js";
import type {
  BuyVoidPreparedTransactionBroadcastRequestV1,
  BuyVoidPreparedTransactionBroadcasterDecisionV1,
  BuyVoidPreparedTransactionBroadcasterReadyV1,
  BuyVoidPreparedTransactionBroadcastReceiptV1,
} from "./buy_void_prepared_transaction_broadcast_custody_v1.js";

export const VOID_BUY_VOID_PREPARED_TRANSACTION_CHAIN2050_TRANSPORT_V1 =
  "VOID_BUY_VOID_PREPARED_TRANSACTION_CHAIN2050_TRANSPORT_V1";

export const VOID_BUY_VOID_PREPARED_TRANSACTION_CHAIN2050_TRANSPORT_AUTHORITY_V1 = {
  source_only_contract: true,
  private_broadcaster_service_transport: true,
  expected_chain_id: 2050,
  loopback_http_only: true,
  existing_chain2050_broadcaster_reused_for_submit: true,
  submit_rpc_mutation_method: "eth_sendRawTransaction",
  inspection_rpc_methods: [
    "eth_chainId",
    "eth_getTransactionByHash",
    "eth_getTransactionReceipt",
    "eth_blockNumber",
  ],
  stable_provider_submission_identity: true,
  raw_signed_transaction_private_input: true,
  raw_signed_transaction_output: false,
  raw_signed_transaction_persistence: false,
  private_key_access: false,
  wallet_access: false,
  signing: false,
  runtime_route_mount: false,
  background_loop: false,
  startup_execution: false,
  automatic_retry: false,
  production_activation: false,
  money_movement_when_submit_called: true,
} as const;

const HASH = /^0x[0-9a-f]{64}$/;
const ADDRESS = /^0x[0-9a-f]{40}$/;
const SHA256 = /^[0-9a-f]{64}$/;
const SAGA_ID = /^voidbvfsg1_[0-9a-f]{64}$/;
const BROADCAST_INTENT_ID = /^voidbvbci1_[0-9a-f]{64}$/;
const RAW = /^0x(?:[0-9a-fA-F]{2})+$/;
const HEX_QUANTITY = /^0x(?:0|[1-9a-f][0-9a-f]*)$/i;
const NATIVE_VALUE_MULTIPLIER = 1_000_000_000_000n;
const DEFAULT_TIMEOUT_MS = 5_000;
const MAX_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_RESPONSE_BYTES = 65_536;
const MAX_RESPONSE_BYTES = 1_048_576;
const MAX_REQUEST_BYTES = 32_768;
const MAX_RAW_BYTES = 256 * 1024;

const PUBLIC_REQUEST_KEYS = [
  "submission_idempotency_key_sha256",
  "saga_id",
  "attempt_id",
  "broadcast_intent_id",
  "custody_idempotency_key_sha256",
  "custody_handle_fingerprint_sha256",
  "transaction_plan_fingerprint_sha256",
  "signed_transaction_hash",
] as const;

const PRIVATE_SUBMIT_KEYS = [
  "submission_idempotency_key_sha256",
  "saga_id",
  "attempt_id",
  "broadcast_intent_id",
  "signed_transaction_hash",
  "raw_signed_transaction",
] as const;

export type BuyVoidPreparedTransactionChain2050TransportPolicyV1 = {
  rpc_url: string;
  expected_chain_id: string | number | bigint;
  request_timeout_ms?: string | number;
  max_response_bytes?: string | number;
};

type NormalizedPolicyV1 = {
  rpc_url: string;
  hostname: "127.0.0.1" | "::1";
  port: number;
  path: string;
  request_timeout_ms: number;
  max_response_bytes: number;
  rpc_url_fingerprint_sha256: string;
};

export type BuyVoidPreparedTransactionChain2050ReadMethodV1 =
  | "eth_chainId"
  | "eth_getTransactionByHash"
  | "eth_getTransactionReceipt"
  | "eth_blockNumber";

export type BuyVoidPreparedTransactionChain2050ReadCallV1 = {
  method: BuyVoidPreparedTransactionChain2050ReadMethodV1;
  params: readonly unknown[];
};

export type BuyVoidPreparedTransactionChain2050ReadTransportV1 = (
  call: Readonly<BuyVoidPreparedTransactionChain2050ReadCallV1>,
) => Promise<unknown>;

export type BuyVoidPreparedTransactionChain2050PrivateSubmitRequestV1 = {
  submission_idempotency_key_sha256: string;
  saga_id: string;
  attempt_id: string;
  broadcast_intent_id: string;
  signed_transaction_hash: string;
  raw_signed_transaction: string;
};

export type BuyVoidPreparedTransactionChain2050PrivateTransportV1 = {
  submit_once: (
    request: Readonly<BuyVoidPreparedTransactionChain2050PrivateSubmitRequestV1>,
  ) => Promise<BuyVoidPreparedTransactionBroadcasterDecisionV1>;
  inspect_submission: (
    request: Readonly<BuyVoidPreparedTransactionBroadcastRequestV1>,
  ) => Promise<BuyVoidPreparedTransactionBroadcasterDecisionV1>;
};

export type BuyVoidPreparedTransactionChain2050TransportReadyV1 = {
  ok: true;
  status: "ready";
  marker: typeof VOID_BUY_VOID_PREPARED_TRANSACTION_CHAIN2050_TRANSPORT_V1;
  version: 1;
  chain_id: "2050";
  rpc_url_fingerprint_sha256: string;
  transport: BuyVoidPreparedTransactionChain2050PrivateTransportV1;
  authority:
    typeof VOID_BUY_VOID_PREPARED_TRANSACTION_CHAIN2050_TRANSPORT_AUTHORITY_V1;
};

export type BuyVoidPreparedTransactionChain2050TransportHeldV1 = {
  ok: false;
  status: "held";
  marker: typeof VOID_BUY_VOID_PREPARED_TRANSACTION_CHAIN2050_TRANSPORT_V1;
  version: 1;
  reason: string;
  rpc_url_fingerprint_sha256: string | null;
  authority:
    typeof VOID_BUY_VOID_PREPARED_TRANSACTION_CHAIN2050_TRANSPORT_AUTHORITY_V1;
};

export type BuyVoidPreparedTransactionChain2050TransportDecisionV1 =
  | BuyVoidPreparedTransactionChain2050TransportReadyV1
  | BuyVoidPreparedTransactionChain2050TransportHeldV1;

export type BuyVoidPreparedTransactionChain2050TransportDependenciesV1 = {
  submit_rpc_transport?: BuyVoidNativeChain2050JsonRpcTransportV1;
  read_transport?: BuyVoidPreparedTransactionChain2050ReadTransportV1;
};

function text(value: unknown): string {
  return String(value ?? "").trim();
}

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function directObject(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label}_object_required`);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new Error(`${label}_prototype_invalid`);
  }
  return value as Record<string, unknown>;
}

function exactKeys(
  value: Record<string, unknown>,
  expected: readonly string[],
  label: string,
): void {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) {
    throw new Error(`${label}_keys_invalid`);
  }
}

function parsePositiveBounded(
  value: unknown,
  fallback: number,
  maximum: number,
): number | null {
  if (value === undefined || value === null || value === "") return fallback;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 && parsed <= maximum
    ? parsed
    : null;
}

function parseChainId(value: unknown): bigint | null {
  try {
    if (typeof value === "bigint") return value >= 0n ? value : null;
    if (typeof value === "number") {
      return Number.isSafeInteger(value) && value >= 0 ? BigInt(value) : null;
    }
    const raw = text(value);
    if (/^0x[0-9a-f]+$/i.test(raw) || /^(0|[1-9][0-9]*)$/.test(raw)) {
      return BigInt(raw);
    }
    return null;
  } catch {
    return null;
  }
}

function parseQuantity(value: unknown): bigint | null {
  const raw = text(value);
  if (!HEX_QUANTITY.test(raw)) return null;
  try {
    return BigInt(raw);
  } catch {
    return null;
  }
}

function normalizeHash(value: unknown): string {
  const hash = text(value).toLowerCase();
  return HASH.test(hash) ? hash : "";
}

function normalizeAddress(value: unknown): string {
  const address = text(value).toLowerCase();
  return ADDRESS.test(address) ? address : "";
}

function held(reason: string): BuyVoidPreparedTransactionBroadcasterDecisionV1 {
  return { ok: false, status: "held", reason };
}

function factoryHeld(
  reason: string,
  fingerprint: string | null = null,
): BuyVoidPreparedTransactionChain2050TransportHeldV1 {
  return {
    ok: false,
    status: "held",
    marker: VOID_BUY_VOID_PREPARED_TRANSACTION_CHAIN2050_TRANSPORT_V1,
    version: 1,
    reason,
    rpc_url_fingerprint_sha256: fingerprint,
    authority:
      VOID_BUY_VOID_PREPARED_TRANSACTION_CHAIN2050_TRANSPORT_AUTHORITY_V1,
  };
}

function normalizePolicy(
  input: BuyVoidPreparedTransactionChain2050TransportPolicyV1,
): NormalizedPolicyV1 | BuyVoidPreparedTransactionChain2050TransportHeldV1 {
  let url: URL;
  try {
    url = new URL(text(input?.rpc_url));
  } catch {
    return factoryHeld("chain2050_transport_rpc_url_invalid");
  }

  const host = url.hostname.toLowerCase().replace(/^\[/, "").replace(/\]$/, "");
  const hostname =
    host === "127.0.0.1" ? "127.0.0.1" :
    host === "::1" ? "::1" :
    null;
  const port = Number(url.port || 0);
  const chainId = parseChainId(input?.expected_chain_id);
  const timeout = parsePositiveBounded(
    input?.request_timeout_ms,
    DEFAULT_TIMEOUT_MS,
    MAX_TIMEOUT_MS,
  );
  const maxBytes = parsePositiveBounded(
    input?.max_response_bytes,
    DEFAULT_MAX_RESPONSE_BYTES,
    MAX_RESPONSE_BYTES,
  );

  if (url.protocol !== "http:") {
    return factoryHeld("chain2050_transport_rpc_protocol_not_allowed");
  }
  if (!hostname) return factoryHeld("chain2050_transport_rpc_not_loopback");
  if (!Number.isInteger(port) || port <= 0 || port > 65_535) {
    return factoryHeld("chain2050_transport_rpc_port_required");
  }
  if (url.username || url.password) {
    return factoryHeld("chain2050_transport_rpc_userinfo_forbidden");
  }
  if (url.search || url.hash) {
    return factoryHeld("chain2050_transport_rpc_query_fragment_forbidden");
  }
  if (!url.pathname.startsWith("/") || url.pathname.length > 256) {
    return factoryHeld("chain2050_transport_rpc_path_invalid");
  }
  if (chainId !== 2050n) {
    return factoryHeld("chain2050_transport_expected_chain_must_be_2050");
  }
  if (timeout === null || maxBytes === null) {
    return factoryHeld("chain2050_transport_rpc_bounds_invalid");
  }

  const renderedHost = hostname === "::1" ? "[::1]" : hostname;
  const normalizedUrl = `http://${renderedHost}:${port}${url.pathname}`;
  return {
    rpc_url: normalizedUrl,
    hostname,
    port,
    path: url.pathname,
    request_timeout_ms: timeout,
    max_response_bytes: maxBytes,
    rpc_url_fingerprint_sha256: sha256(normalizedUrl),
  };
}

function stableProviderId(policy: NormalizedPolicyV1, transactionHash: string): string {
  return `chain2050:${policy.rpc_url_fingerprint_sha256.slice(0, 16)}:${transactionHash.slice(2, 18)}`;
}

function validatePublicRequest(
  raw: Readonly<BuyVoidPreparedTransactionBroadcastRequestV1>,
): BuyVoidPreparedTransactionBroadcastRequestV1 {
  const value = directObject(raw, "chain2050_transport_inspect_request");
  exactKeys(value, PUBLIC_REQUEST_KEYS, "chain2050_transport_inspect_request");
  const normalized: BuyVoidPreparedTransactionBroadcastRequestV1 = {
    submission_idempotency_key_sha256: text(
      value.submission_idempotency_key_sha256,
    ).toLowerCase(),
    saga_id: text(value.saga_id).toLowerCase(),
    attempt_id: text(value.attempt_id).toLowerCase(),
    broadcast_intent_id: text(value.broadcast_intent_id).toLowerCase(),
    custody_idempotency_key_sha256: text(
      value.custody_idempotency_key_sha256,
    ).toLowerCase(),
    custody_handle_fingerprint_sha256: text(
      value.custody_handle_fingerprint_sha256,
    ).toLowerCase(),
    transaction_plan_fingerprint_sha256: text(
      value.transaction_plan_fingerprint_sha256,
    ).toLowerCase(),
    signed_transaction_hash: normalizeHash(value.signed_transaction_hash),
  };
  if (
    !SHA256.test(normalized.submission_idempotency_key_sha256) ||
    !SAGA_ID.test(normalized.saga_id) ||
    !SHA256.test(normalized.attempt_id) ||
    !BROADCAST_INTENT_ID.test(normalized.broadcast_intent_id) ||
    !SHA256.test(normalized.custody_idempotency_key_sha256) ||
    !SHA256.test(normalized.custody_handle_fingerprint_sha256) ||
    !SHA256.test(normalized.transaction_plan_fingerprint_sha256) ||
    !normalized.signed_transaction_hash
  ) {
    throw new Error("chain2050_transport_inspect_request_invalid");
  }
  return normalized;
}

function validatePrivateSubmitRequest(
  raw: Readonly<BuyVoidPreparedTransactionChain2050PrivateSubmitRequestV1>,
): BuyVoidPreparedTransactionChain2050PrivateSubmitRequestV1 {
  const value = directObject(raw, "chain2050_transport_submit_request");
  exactKeys(value, PRIVATE_SUBMIT_KEYS, "chain2050_transport_submit_request");
  const normalized = {
    submission_idempotency_key_sha256:
      text(value.submission_idempotency_key_sha256).toLowerCase(),
    saga_id: text(value.saga_id).toLowerCase(),
    attempt_id: text(value.attempt_id).toLowerCase(),
    broadcast_intent_id: text(value.broadcast_intent_id).toLowerCase(),
    signed_transaction_hash: normalizeHash(value.signed_transaction_hash),
    raw_signed_transaction: text(value.raw_signed_transaction),
  };
  if (
    !SHA256.test(normalized.submission_idempotency_key_sha256) ||
    !SAGA_ID.test(normalized.saga_id) ||
    !SHA256.test(normalized.attempt_id) ||
    !BROADCAST_INTENT_ID.test(normalized.broadcast_intent_id) ||
    !normalized.signed_transaction_hash ||
    !RAW.test(normalized.raw_signed_transaction) ||
    normalized.raw_signed_transaction.length % 2 !== 0 ||
    Buffer.byteLength(normalized.raw_signed_transaction, "utf8") >
      MAX_RAW_BYTES * 2 + 2
  ) {
    throw new Error("chain2050_transport_submit_request_invalid");
  }

  let transaction: Transaction;
  try {
    transaction = Transaction.from(normalized.raw_signed_transaction);
  } catch {
    throw new Error("chain2050_transport_submit_transaction_parse_failed");
  }
  if (
    transaction.type !== 2 ||
    transaction.chainId !== 2050n ||
    normalizeHash(transaction.hash) !== normalized.signed_transaction_hash
  ) {
    throw new Error("chain2050_transport_submit_transaction_binding_invalid");
  }
  return normalized;
}

function createHttpReadTransport(
  policy: NormalizedPolicyV1,
): BuyVoidPreparedTransactionChain2050ReadTransportV1 {
  let nextId = 1;
  return async (call) => {
    const id = nextId++;
    const body = JSON.stringify({
      jsonrpc: "2.0",
      id,
      method: call.method,
      params: [...call.params],
    });
    if (Buffer.byteLength(body, "utf8") > MAX_REQUEST_BYTES) {
      throw new Error("chain2050_transport_read_request_too_large");
    }

    return await new Promise((resolve, reject) => {
      let settled = false;
      const finish = (error: Error | null, result?: unknown): void => {
        if (settled) return;
        settled = true;
        if (error) reject(error);
        else resolve(result);
      };

      const request = http.request(
        {
          protocol: "http:",
          hostname: policy.hostname,
          port: policy.port,
          path: policy.path,
          method: "POST",
          family: policy.hostname === "::1" ? 6 : 4,
          agent: false,
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            "Content-Length": String(Buffer.byteLength(body, "utf8")),
            Connection: "close",
            "User-Agent":
              "void-buy-prepared-transaction-chain2050-transport-v1",
          },
        },
        (response) => {
          const chunks: Buffer[] = [];
          let total = 0;
          response.on("data", (chunk: Buffer | string) => {
            const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
            total += buffer.length;
            if (total > policy.max_response_bytes) {
              request.destroy(
                new Error("chain2050_transport_read_response_too_large"),
              );
              return;
            }
            chunks.push(buffer);
          });
          response.on("end", () => {
            if (Number(response.statusCode || 0) !== 200) {
              finish(new Error("chain2050_transport_read_http_status_invalid"));
              return;
            }
            const contentType = text(response.headers["content-type"]).toLowerCase();
            if (contentType && !contentType.includes("application/json")) {
              finish(new Error("chain2050_transport_read_content_type_invalid"));
              return;
            }
            let payload: Record<string, unknown>;
            try {
              payload = directObject(
                JSON.parse(Buffer.concat(chunks).toString("utf8")),
                "chain2050_transport_read_rpc_response",
              );
            } catch {
              finish(new Error("chain2050_transport_read_json_invalid"));
              return;
            }
            if (
              payload.jsonrpc !== "2.0" ||
              payload.id !== id ||
              Object.prototype.hasOwnProperty.call(payload, "error") ||
              !Object.prototype.hasOwnProperty.call(payload, "result")
            ) {
              finish(new Error("chain2050_transport_read_rpc_envelope_invalid"));
              return;
            }
            finish(null, payload.result);
          });
        },
      );
      request.on("timeout", () => {
        request.destroy(new Error("chain2050_transport_read_timeout"));
      });
      request.on("error", (error) => finish(error));
      request.setTimeout(policy.request_timeout_ms);
      request.end(body);
    });
  };
}

async function safeRead(
  transport: BuyVoidPreparedTransactionChain2050ReadTransportV1,
  method: BuyVoidPreparedTransactionChain2050ReadMethodV1,
  params: readonly unknown[],
): Promise<{ ok: true; result: unknown } | { ok: false }> {
  try {
    return { ok: true, result: await transport({ method, params }) };
  } catch {
    return { ok: false };
  }
}

function readyNonterminal(
  status: "unknown" | "accepted",
  hash: string,
  provider: string,
): BuyVoidPreparedTransactionBroadcasterReadyV1 {
  return {
    ok: true,
    status,
    transaction_hash: hash,
    provider_submission_id: provider,
    definitive_not_submitted: false,
    submission_call_performed: true,
    submission_may_have_occurred: true,
    receipt: null,
  };
}

function readyNotSubmitted(
  hash: string,
  provider: string,
): BuyVoidPreparedTransactionBroadcasterReadyV1 {
  return {
    ok: true,
    status: "not_submitted",
    transaction_hash: hash,
    provider_submission_id: provider,
    definitive_not_submitted: true,
    submission_call_performed: false,
    submission_may_have_occurred: false,
    receipt: null,
  };
}

function parseTransactionObservation(
  value: unknown,
  expectedHash: string,
): {
  hash: string;
  from_address: string;
  to_address: string;
  value_wei: bigint;
  amount_units: string;
} | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const object = value as Record<string, unknown>;
  const hash = normalizeHash(object.hash);
  const from = normalizeAddress(object.from);
  const to = normalizeAddress(object.to);
  const chainId = parseChainId(object.chainId);
  const valueWei = parseQuantity(object.value);
  if (
    hash !== expectedHash ||
    !from ||
    !to ||
    chainId !== 2050n ||
    valueWei === null ||
    valueWei <= 0n ||
    valueWei % NATIVE_VALUE_MULTIPLIER !== 0n
  ) {
    return null;
  }
  return {
    hash,
    from_address: from,
    to_address: to,
    value_wei: valueWei,
    amount_units: (valueWei / NATIVE_VALUE_MULTIPLIER).toString(),
  };
}

function parseTerminalReceipt(
  receiptValue: unknown,
  transaction: ReturnType<typeof parseTransactionObservation>,
  expectedHash: string,
  currentBlockValue: unknown,
): {
  status: "confirmed" | "reverted";
  receipt: BuyVoidPreparedTransactionBroadcastReceiptV1;
} | null {
  if (
    !transaction ||
    !receiptValue ||
    typeof receiptValue !== "object" ||
    Array.isArray(receiptValue)
  ) {
    return null;
  }
  const receipt = receiptValue as Record<string, unknown>;
  const hash = normalizeHash(receipt.transactionHash);
  const from = normalizeAddress(receipt.from);
  const to = normalizeAddress(receipt.to);
  const blockNumber = parseQuantity(receipt.blockNumber);
  const blockHash = normalizeHash(receipt.blockHash);
  const rpcStatus = parseQuantity(receipt.status);
  const currentBlock = parseQuantity(currentBlockValue);
  if (
    hash !== expectedHash ||
    from !== transaction.from_address ||
    to !== transaction.to_address ||
    blockNumber === null ||
    blockNumber <= 0n ||
    !blockHash ||
    (rpcStatus !== 0n && rpcStatus !== 1n) ||
    currentBlock === null ||
    currentBlock < blockNumber
  ) {
    return null;
  }
  const confirmations = currentBlock - blockNumber + 1n;
  return {
    status: rpcStatus === 1n ? "confirmed" : "reverted",
    receipt: {
      chain_id: "2050",
      transaction_hash: expectedHash,
      transaction_status: rpcStatus === 1n ? 1 : 0,
      block_number: blockNumber.toString(),
      block_hash: blockHash,
      current_block_number: currentBlock.toString(),
      confirmation_count: confirmations.toString(),
      from_address: transaction.from_address,
      to_address: transaction.to_address,
      amount_units: transaction.amount_units,
    },
  };
}

export async function createBuyVoidPreparedTransactionChain2050TransportV1(
  policyInput: BuyVoidPreparedTransactionChain2050TransportPolicyV1,
  dependencies: BuyVoidPreparedTransactionChain2050TransportDependenciesV1 = {},
): Promise<BuyVoidPreparedTransactionChain2050TransportDecisionV1> {
  const policy = normalizePolicy(policyInput);
  if ("reason" in policy) return policy;

  const nativePolicy: BuyVoidNativeChain2050BroadcasterPolicyV1 = {
    rpc_url: policy.rpc_url,
    expected_chain_id: 2050,
    request_timeout_ms: policy.request_timeout_ms,
    max_response_bytes: policy.max_response_bytes,
  };
  const native = await createBuyVoidNativeChain2050BroadcasterV1(
    nativePolicy,
    dependencies.submit_rpc_transport,
  );
  if ("reason" in native) {
    return factoryHeld(
      "chain2050_transport_native_broadcaster_not_ready",
      policy.rpc_url_fingerprint_sha256,
    );
  }

  const readTransport =
    dependencies.read_transport || createHttpReadTransport(policy);

  const transport: BuyVoidPreparedTransactionChain2050PrivateTransportV1 = {
    async submit_once(rawRequest) {
      let request: BuyVoidPreparedTransactionChain2050PrivateSubmitRequestV1;
      try {
        request = validatePrivateSubmitRequest(rawRequest);
      } catch {
        return held("chain2050_transport_submit_request_held");
      }
      const provider = stableProviderId(policy, request.signed_transaction_hash);
      let result;
      try {
        result = await native.broadcaster.broadcast_signed_transaction(
          request.raw_signed_transaction,
        );
      } catch {
        return held("chain2050_transport_submit_failed");
      }

      if (
        result.accepted === true &&
        normalizeHash(result.transaction_hash) === request.signed_transaction_hash
      ) {
        return readyNonterminal(
          "accepted",
          request.signed_transaction_hash,
          provider,
        );
      }
      if (result.submission_may_have_occurred === false) {
        return readyNotSubmitted(request.signed_transaction_hash, provider);
      }
      return readyNonterminal(
        "unknown",
        request.signed_transaction_hash,
        provider,
      );
    },

    async inspect_submission(rawRequest) {
      let request: BuyVoidPreparedTransactionBroadcastRequestV1;
      try {
        request = validatePublicRequest(rawRequest);
      } catch {
        return held("chain2050_transport_inspect_request_held");
      }
      const hash = request.signed_transaction_hash;
      const provider = stableProviderId(policy, hash);

      const chain = await safeRead(readTransport, "eth_chainId", []);
      if (!chain.ok || parseChainId(chain.result) !== 2050n) {
        return held("chain2050_transport_chain_identity_held");
      }

      const receipt = await safeRead(
        readTransport,
        "eth_getTransactionReceipt",
        [hash],
      );
      if (!receipt.ok) {
        return held("chain2050_transport_receipt_read_held");
      }

      const transaction = await safeRead(
        readTransport,
        "eth_getTransactionByHash",
        [hash],
      );
      if (!transaction.ok) {
        return held("chain2050_transport_transaction_read_held");
      }

      if (receipt.result === null) {
        if (transaction.result === null) {
          return readyNonterminal("unknown", hash, provider);
        }
        if (!parseTransactionObservation(transaction.result, hash)) {
          return held("chain2050_transport_transaction_binding_held");
        }
        return readyNonterminal("accepted", hash, provider);
      }

      const observedTransaction = parseTransactionObservation(
        transaction.result,
        hash,
      );
      if (!observedTransaction) {
        return held("chain2050_transport_transaction_binding_held");
      }

      const currentBlock = await safeRead(readTransport, "eth_blockNumber", []);
      if (!currentBlock.ok) {
        return held("chain2050_transport_block_number_read_held");
      }

      const terminal = parseTerminalReceipt(
        receipt.result,
        observedTransaction,
        hash,
        currentBlock.result,
      );
      if (!terminal) {
        return held("chain2050_transport_receipt_binding_held");
      }

      return {
        ok: true,
        status: terminal.status,
        transaction_hash: hash,
        provider_submission_id: provider,
        definitive_not_submitted: false,
        submission_call_performed: true,
        submission_may_have_occurred: true,
        receipt: terminal.receipt,
      };
    },
  };

  return {
    ok: true,
    status: "ready",
    marker: VOID_BUY_VOID_PREPARED_TRANSACTION_CHAIN2050_TRANSPORT_V1,
    version: 1,
    chain_id: "2050",
    rpc_url_fingerprint_sha256: policy.rpc_url_fingerprint_sha256,
    transport,
    authority:
      VOID_BUY_VOID_PREPARED_TRANSACTION_CHAIN2050_TRANSPORT_AUTHORITY_V1,
  };
}
