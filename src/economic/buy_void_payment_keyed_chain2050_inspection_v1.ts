import crypto from "node:crypto";
import * as http from "node:http";

import type {
  BuyVoidPaymentKeyedPreparationCustodyRecordV1,
} from "./buy_void_payment_keyed_preparation_custody_v1.js";
import {
  validateBuyVoidPaymentKeyedTransactionPreparationPolicyV1,
  type BuyVoidPaymentKeyedTransactionPreparationPolicyV1,
} from "./buy_void_payment_keyed_transaction_preparation_v1.js";

export const VOID_BUY_VOID_PAYMENT_KEYED_CHAIN2050_INSPECTION_V1 =
  "VOID_BUY_VOID_PAYMENT_KEYED_CHAIN2050_INSPECTION_V1";

export const VOID_BUY_VOID_PAYMENT_KEYED_CHAIN2050_INSPECTION_AUTHORITY_V1 = {
  source_only_contract: true,
  exact_custody_request_required: true,
  exact_prepared_transaction_hash_required: true,
  canonical_chain_id: "2050",
  loopback_http_only: true,
  read_only_rpc_methods: [
    "eth_chainId",
    "eth_getTransactionByHash",
  ],
  transaction_absence_is_unknown_not_not_submitted: true,
  transaction_visibility_requires_exact_binding: true,
  rpc_mutation: false,
  filesystem_read: false,
  filesystem_write: false,
  credential_access: false,
  wallet_access: false,
  signing: false,
  transaction_broadcast: false,
  automatic_retry: false,
  runtime_route_mount: false,
  money_movement: false,
} as const;

export type BuyVoidPaymentKeyedChain2050InspectionRpcMethodV1 =
  | "eth_chainId"
  | "eth_getTransactionByHash";

export type BuyVoidPaymentKeyedChain2050InspectionRpcCallV1 = {
  method: BuyVoidPaymentKeyedChain2050InspectionRpcMethodV1;
  params: readonly unknown[];
};

export type BuyVoidPaymentKeyedChain2050InspectionTransportV1 = (
  call: Readonly<BuyVoidPaymentKeyedChain2050InspectionRpcCallV1>,
) => Promise<unknown>;

export type BuyVoidPaymentKeyedChain2050InspectionInputV1 = {
  custody: BuyVoidPaymentKeyedPreparationCustodyRecordV1;
  preparation_policy: BuyVoidPaymentKeyedTransactionPreparationPolicyV1;
  transport?: BuyVoidPaymentKeyedChain2050InspectionTransportV1;
};

export type BuyVoidPaymentKeyedChain2050InspectionDecisionV1 =
  | {
      ok: true;
      status: "unknown" | "accepted";
      marker: typeof VOID_BUY_VOID_PAYMENT_KEYED_CHAIN2050_INSPECTION_V1;
      version: 1;
      attempt_id: string;
      transaction_hash: string;
      provider_submission_id: string;
      rpc_url_fingerprint_sha256: string;
      rpc_methods_used:
        BuyVoidPaymentKeyedChain2050InspectionRpcMethodV1[];
      transaction_found: boolean;
      submission_may_have_occurred: boolean;
      definitive_not_submitted: false;
      transaction_broadcast_performed: false;
      automatic_retry_allowed: false;
      money_movement_performed: false;
    }
  | {
      ok: false;
      status: "held";
      marker: typeof VOID_BUY_VOID_PAYMENT_KEYED_CHAIN2050_INSPECTION_V1;
      version: 1;
      reason: string;
      attempt_id: string | null;
      transaction_hash: string | null;
      rpc_url_fingerprint_sha256: string | null;
      rpc_methods_used:
        BuyVoidPaymentKeyedChain2050InspectionRpcMethodV1[];
      transaction_found: false;
      submission_may_have_occurred: boolean;
      definitive_not_submitted: false;
      transaction_broadcast_performed: false;
      automatic_retry_allowed: false;
      money_movement_performed: false;
      detail?: Record<string, unknown>;
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

const SHA256 = /^[0-9a-f]{64}$/;
const HASH = /^0x[0-9a-f]{64}$/;
const ADDRESS = /^0x[0-9a-f]{40}$/;
const HEX_QUANTITY = /^0x(?:0|[1-9a-f][0-9a-f]*)$/i;
const HEX_BYTES = /^0x(?:[0-9a-f]{2})*$/i;
const DEFAULT_TIMEOUT_MS = 5_000;
const MAX_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_RESPONSE_BYTES = 65_536;
const MAX_RESPONSE_BYTES = 1_048_576;
const MAX_REQUEST_BYTES = 16_384;

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : String(value ?? "").trim();
}

function address(value: unknown): string {
  const raw = text(value).toLowerCase();
  return ADDRESS.test(raw) ? raw : "";
}

function hash(value: unknown): string {
  const raw = text(value).toLowerCase();
  return HASH.test(raw) ? raw : "";
}

function quantity(value: unknown): bigint | null {
  const raw = text(value);
  if (!HEX_QUANTITY.test(raw)) return null;
  try {
    return BigInt(raw);
  } catch {
    return null;
  }
}

function positiveBounded(
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

function held(
  reason: string,
  options: {
    attempt_id?: string | null;
    transaction_hash?: string | null;
    rpc_url_fingerprint_sha256?: string | null;
    rpc_methods_used?: BuyVoidPaymentKeyedChain2050InspectionRpcMethodV1[];
    submission_may_have_occurred?: boolean;
    detail?: Record<string, unknown>;
  } = {},
): Extract<
  BuyVoidPaymentKeyedChain2050InspectionDecisionV1,
  { ok: false }
> {
  return {
    ok: false,
    status: "held",
    marker: VOID_BUY_VOID_PAYMENT_KEYED_CHAIN2050_INSPECTION_V1,
    version: 1,
    reason,
    attempt_id: options.attempt_id ?? null,
    transaction_hash: options.transaction_hash ?? null,
    rpc_url_fingerprint_sha256:
      options.rpc_url_fingerprint_sha256 ?? null,
    rpc_methods_used: options.rpc_methods_used || [],
    transaction_found: false,
    submission_may_have_occurred:
      options.submission_may_have_occurred === true,
    definitive_not_submitted: false,
    transaction_broadcast_performed: false,
    automatic_retry_allowed: false,
    money_movement_performed: false,
    ...(options.detail ? { detail: options.detail } : {}),
  };
}

function normalizedPolicy(
  input: BuyVoidPaymentKeyedTransactionPreparationPolicyV1,
):
  | { ok: true; policy: NormalizedPolicyV1 }
  | { ok: false; reason: string; fingerprint: string | null } {
  const validation =
    validateBuyVoidPaymentKeyedTransactionPreparationPolicyV1(input);
  if (validation.ok === false) {
    return {
      ok: false,
      reason: validation.reason,
      fingerprint: validation.rpc_url_fingerprint_sha256,
    };
  }

  let url: URL;
  try {
    url = new URL(text(input.rpc_url));
  } catch {
    return {
      ok: false,
      reason: "payment_keyed_chain2050_inspection_rpc_url_invalid",
      fingerprint: validation.rpc_url_fingerprint_sha256,
    };
  }
  const host = url.hostname.toLowerCase().replace(/^\[/, "").replace(/\]$/, "");
  const hostname =
    host === "127.0.0.1"
      ? "127.0.0.1"
      : host === "::1"
        ? "::1"
        : null;
  const port = Number(url.port || 80);
  const timeout = positiveBounded(
    input.request_timeout_ms,
    DEFAULT_TIMEOUT_MS,
    MAX_TIMEOUT_MS,
  );
  const maxBytes = positiveBounded(
    input.max_response_bytes,
    DEFAULT_MAX_RESPONSE_BYTES,
    MAX_RESPONSE_BYTES,
  );
  if (
    !hostname ||
    url.protocol !== "http:" ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    !Number.isInteger(port) ||
    port <= 0 ||
    port > 65_535 ||
    timeout === null ||
    maxBytes === null
  ) {
    return {
      ok: false,
      reason: "payment_keyed_chain2050_inspection_rpc_policy_invalid",
      fingerprint: validation.rpc_url_fingerprint_sha256,
    };
  }
  const renderedHost = hostname === "::1" ? "[::1]" : hostname;
  return {
    ok: true,
    policy: {
      rpc_url:
        "http://" + renderedHost + ":" + String(port) + (url.pathname || "/"),
      hostname,
      port,
      path: url.pathname || "/",
      request_timeout_ms: timeout,
      max_response_bytes: maxBytes,
      rpc_url_fingerprint_sha256:
        validation.rpc_url_fingerprint_sha256,
    },
  };
}

function createHttpTransport(
  policy: NormalizedPolicyV1,
): BuyVoidPaymentKeyedChain2050InspectionTransportV1 {
  let nextId = 0;
  return async (call) => {
    const id = ++nextId;
    const body = JSON.stringify({
      jsonrpc: "2.0",
      id,
      method: call.method,
      params: [...call.params],
    });
    if (Buffer.byteLength(body, "utf8") > MAX_REQUEST_BYTES) {
      throw new Error("payment_keyed_chain2050_inspection_request_too_large");
    }

    return await new Promise((resolve, reject) => {
      let settled = false;
      const finish = (error: Error | null, value?: unknown) => {
        if (settled) return;
        settled = true;
        if (error) reject(error);
        else resolve(value);
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
              "void-buy-payment-keyed-chain2050-inspection-v1",
          },
        },
        (response) => {
          const chunks: Buffer[] = [];
          let total = 0;
          response.on("data", (chunk: Buffer | string) => {
            const buffer = Buffer.isBuffer(chunk)
              ? chunk
              : Buffer.from(chunk);
            total += buffer.length;
            if (total > policy.max_response_bytes) {
              request.destroy(
                new Error(
                  "payment_keyed_chain2050_inspection_response_too_large",
                ),
              );
              return;
            }
            chunks.push(buffer);
          });
          response.on("end", () => {
            if (Number(response.statusCode || 0) !== 200) {
              finish(
                new Error(
                  "payment_keyed_chain2050_inspection_http_status_invalid",
                ),
              );
              return;
            }
            let payload: any;
            try {
              payload = JSON.parse(
                Buffer.concat(chunks).toString("utf8"),
              );
            } catch {
              finish(
                new Error(
                  "payment_keyed_chain2050_inspection_json_invalid",
                ),
              );
              return;
            }
            if (
              !payload ||
              payload.jsonrpc !== "2.0" ||
              payload.id !== id ||
              payload.error ||
              !Object.prototype.hasOwnProperty.call(payload, "result")
            ) {
              finish(
                new Error(
                  "payment_keyed_chain2050_inspection_rpc_envelope_invalid",
                ),
              );
              return;
            }
            finish(null, payload.result);
          });
        },
      );
      request.on("timeout", () => {
        request.destroy(
          new Error("payment_keyed_chain2050_inspection_timeout"),
        );
      });
      request.on("error", (error) => finish(error));
      request.setTimeout(policy.request_timeout_ms);
      request.end(body);
    });
  };
}

function requestBinding(
  custody: BuyVoidPaymentKeyedPreparationCustodyRecordV1,
): {
  attempt_id: string;
  transaction_hash: string;
  wallet_address: string;
  transaction_to: string;
  nonce: bigint;
  gas_limit: bigint;
  max_fee_per_gas_wei: bigint;
  max_priority_fee_per_gas_wei: bigint;
  transaction_calldata: string;
} | null {
  const request = custody?.request;
  const attemptId = text(request?.attempt_id).toLowerCase();
  const transactionHash = hash(custody?.signed_transaction_hash);
  const wallet = address(request?.wallet_address);
  const target = address(request?.transaction_to);
  const calldata = text(request?.transaction_calldata).toLowerCase();
  let nonce: bigint;
  let gas: bigint;
  let maxFee: bigint;
  let priority: bigint;
  try {
    nonce = BigInt(request?.nonce);
    gas = BigInt(request?.gas_limit);
    maxFee = BigInt(request?.max_fee_per_gas_wei);
    priority = BigInt(request?.max_priority_fee_per_gas_wei);
  } catch {
    return null;
  }
  if (
    !SHA256.test(attemptId) ||
    !transactionHash ||
    !wallet ||
    !target ||
    nonce < 0n ||
    gas <= 0n ||
    maxFee <= 0n ||
    priority < 0n ||
    priority > maxFee ||
    !HEX_BYTES.test(calldata) ||
    calldata.length < 4
  ) {
    return null;
  }
  return {
    attempt_id: attemptId,
    transaction_hash: transactionHash,
    wallet_address: wallet,
    transaction_to: target,
    nonce,
    gas_limit: gas,
    max_fee_per_gas_wei: maxFee,
    max_priority_fee_per_gas_wei: priority,
    transaction_calldata: calldata,
  };
}

function exactTransaction(
  value: unknown,
  expected: ReturnType<typeof requestBinding>,
): boolean {
  if (
    !expected ||
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return false;
  }
  const tx = value as Record<string, unknown>;
  const input = text(tx.input ?? tx.data).toLowerCase();
  return (
    hash(tx.hash) === expected.transaction_hash &&
    address(tx.from) === expected.wallet_address &&
    address(tx.to) === expected.transaction_to &&
    quantity(tx.type) === 2n &&
    quantity(tx.chainId) === 2050n &&
    quantity(tx.nonce) === expected.nonce &&
    quantity(tx.gas) === expected.gas_limit &&
    quantity(tx.maxFeePerGas) === expected.max_fee_per_gas_wei &&
    quantity(tx.maxPriorityFeePerGas) ===
      expected.max_priority_fee_per_gas_wei &&
    quantity(tx.value) === 0n &&
    input === expected.transaction_calldata
  );
}

export async function inspectBuyVoidPaymentKeyedChain2050V1(
  input: BuyVoidPaymentKeyedChain2050InspectionInputV1,
): Promise<BuyVoidPaymentKeyedChain2050InspectionDecisionV1> {
  const expected = requestBinding(input?.custody);
  if (!expected) {
    return held("payment_keyed_chain2050_inspection_custody_invalid");
  }
  const normalized = normalizedPolicy(input?.preparation_policy);
  if (normalized.ok === false) {
    return held(normalized.reason, {
      attempt_id: expected.attempt_id,
      transaction_hash: expected.transaction_hash,
      rpc_url_fingerprint_sha256: normalized.fingerprint,
    });
  }
  const policy = normalized.policy;
  const provider =
    "chain2050:" +
    policy.rpc_url_fingerprint_sha256.slice(0, 16) +
    ":" +
    expected.transaction_hash.slice(2, 18);
  const methods: BuyVoidPaymentKeyedChain2050InspectionRpcMethodV1[] = [];
  const transport = input.transport || createHttpTransport(policy);

  const call = async (
    method: BuyVoidPaymentKeyedChain2050InspectionRpcMethodV1,
    params: readonly unknown[],
  ): Promise<
    | { ok: true; value: unknown }
    | {
        ok: false;
        decision: Extract<
          BuyVoidPaymentKeyedChain2050InspectionDecisionV1,
          { ok: false }
        >;
      }
  > => {
    methods.push(method);
    try {
      return {
        ok: true,
        value: await transport({ method, params }),
      };
    } catch (error) {
      return {
        ok: false,
        decision: held(
          "payment_keyed_chain2050_inspection_rpc_call_failed",
          {
            attempt_id: expected.attempt_id,
            transaction_hash: expected.transaction_hash,
            rpc_url_fingerprint_sha256:
              policy.rpc_url_fingerprint_sha256,
            rpc_methods_used: [...methods],
            submission_may_have_occurred: true,
            detail: {
              method,
              error_class:
                text((error as Error)?.name || "Error").slice(0, 80),
            },
          },
        ),
      };
    }
  };

  const chain = await call("eth_chainId", []);
  if (chain.ok === false) return chain.decision;
  if (quantity(chain.value) !== 2050n) {
    return held(
      "payment_keyed_chain2050_inspection_chain_id_mismatch",
      {
        attempt_id: expected.attempt_id,
        transaction_hash: expected.transaction_hash,
        rpc_url_fingerprint_sha256:
          policy.rpc_url_fingerprint_sha256,
        rpc_methods_used: methods,
        submission_may_have_occurred: true,
      },
    );
  }

  const transaction = await call(
    "eth_getTransactionByHash",
    [expected.transaction_hash],
  );
  if (transaction.ok === false) return transaction.decision;
  if (transaction.value === null) {
    return {
      ok: true,
      status: "unknown",
      marker: VOID_BUY_VOID_PAYMENT_KEYED_CHAIN2050_INSPECTION_V1,
      version: 1,
      attempt_id: expected.attempt_id,
      transaction_hash: expected.transaction_hash,
      provider_submission_id: provider,
      rpc_url_fingerprint_sha256:
        policy.rpc_url_fingerprint_sha256,
      rpc_methods_used: methods,
      transaction_found: false,
      submission_may_have_occurred: true,
      definitive_not_submitted: false,
      transaction_broadcast_performed: false,
      automatic_retry_allowed: false,
      money_movement_performed: false,
    };
  }
  if (!exactTransaction(transaction.value, expected)) {
    return held(
      "payment_keyed_chain2050_inspection_transaction_binding_invalid",
      {
        attempt_id: expected.attempt_id,
        transaction_hash: expected.transaction_hash,
        rpc_url_fingerprint_sha256:
          policy.rpc_url_fingerprint_sha256,
        rpc_methods_used: methods,
        submission_may_have_occurred: true,
      },
    );
  }

  return {
    ok: true,
    status: "accepted",
    marker: VOID_BUY_VOID_PAYMENT_KEYED_CHAIN2050_INSPECTION_V1,
    version: 1,
    attempt_id: expected.attempt_id,
    transaction_hash: expected.transaction_hash,
    provider_submission_id: provider,
    rpc_url_fingerprint_sha256:
      policy.rpc_url_fingerprint_sha256,
    rpc_methods_used: methods,
    transaction_found: true,
    submission_may_have_occurred: true,
    definitive_not_submitted: false,
    transaction_broadcast_performed: false,
    automatic_retry_allowed: false,
    money_movement_performed: false,
  };
}
