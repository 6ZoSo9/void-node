import crypto from "node:crypto";
import * as http from "node:http";
import {
  getAddress,
} from "ethers";
import type {
  BuyVoidNativeDeliveryTransactionPlanV1,
} from "./buy_void_native_delivery_sign_broadcast_adapter_v1.js";

export const VOID_BUY_VOID_NATIVE_EXECUTION_NONCE_FEE_PLANNER_V1 =
  "VOID_BUY_VOID_NATIVE_EXECUTION_NONCE_FEE_PLANNER_V1";

export const VOID_BUY_VOID_NATIVE_EXECUTION_NONCE_FEE_PLANNER_AUTHORITY_V1 = {
  expected_chain_id: 2050,
  server_controlled_rpc_url: true,
  loopback_http_only: true,
  execution_state_tag: "pending",
  read_only_rpc_methods: [
    "eth_chainId",
    "eth_getTransactionCount",
    "eth_gasPrice",
    "eth_getBalance",
  ],
  transaction_signing: false,
  transaction_broadcast: false,
  wallet_access: false,
  secret_access: false,
  filesystem_read: false,
  filesystem_write: false,
  runtime_route_mount: false,
  automatic_retry: false,
  receipt_wait: false,
  redirect_follow: false,
  proxy_use: false,
  money_movement: false,
} as const;

export type BuyVoidNativeExecutionNonceFeePlannerPolicyV1 = {
  rpc_url: string;
  expected_chain_id: "2050";
  fulfillment_wallet_address: string;
  native_value_wei: string | number | bigint;
  gas_limit: string | number | bigint;
  max_gas_limit: string | number | bigint;
  max_fee_per_gas_wei: string | number | bigint;
  max_priority_fee_per_gas_wei: string | number | bigint;
  fee_multiplier_bps: string | number | bigint;
  request_timeout_ms?: string | number;
  max_response_bytes?: string | number;
};

export type BuyVoidNativeExecutionPlannerRpcMethodV1 =
  | "eth_chainId"
  | "eth_getTransactionCount"
  | "eth_gasPrice"
  | "eth_getBalance";

export type BuyVoidNativeExecutionPlannerRpcCallV1 = {
  rpc_url: string;
  method: BuyVoidNativeExecutionPlannerRpcMethodV1;
  params: unknown[];
  request_id: number;
  request_timeout_ms: number;
  max_response_bytes: number;
};

export type BuyVoidNativeExecutionPlannerRpcResultV1 =
  | {
      ok: true;
      result: unknown;
      provider_submission_id: string;
      http_status: number;
    }
  | {
      ok: false;
      error_code: string;
      provider_submission_id: string;
      http_status: number;
    };

export type BuyVoidNativeExecutionPlannerTransportV1 = (
  call: Readonly<BuyVoidNativeExecutionPlannerRpcCallV1>,
) => Promise<BuyVoidNativeExecutionPlannerRpcResultV1>;

export type BuyVoidNativeExecutionNonceFeePlanReadyV1 = {
  ok: true;
  marker:
    typeof VOID_BUY_VOID_NATIVE_EXECUTION_NONCE_FEE_PLANNER_V1;
  version: 1;
  status: "planned";
  chain_id: "2050";
  wallet_address: string;
  wallet_address_fingerprint_sha256: string;
  rpc_url_fingerprint_sha256: string;
  transaction_plan: BuyVoidNativeDeliveryTransactionPlanV1;
  pending_nonce: number;
  execution_state: "pending";
  observed_gas_price_wei: string;
  computed_max_fee_per_gas_wei: string;
  configured_priority_fee_per_gas_wei: string;
  estimated_max_transaction_cost_wei: string;
  observed_wallet_balance_wei: string;
  sufficient_balance: true;
  rpc_methods_used: BuyVoidNativeExecutionPlannerRpcMethodV1[];
  mutation_performed: false;
  signing_performed: false;
  transaction_broadcast_performed: false;
};

export type BuyVoidNativeExecutionNonceFeePlanHeldV1 = {
  ok: false;
  marker:
    typeof VOID_BUY_VOID_NATIVE_EXECUTION_NONCE_FEE_PLANNER_V1;
  version: 1;
  status: "held";
  reason: string;
  rpc_url_fingerprint_sha256: string | null;
  wallet_address_fingerprint_sha256: string | null;
  rpc_methods_used: BuyVoidNativeExecutionPlannerRpcMethodV1[];
  mutation_performed: false;
  signing_performed: false;
  transaction_broadcast_performed: false;
  detail?: Record<string, unknown>;
};

export type BuyVoidNativeExecutionNonceFeePlanDecisionV1 =
  | BuyVoidNativeExecutionNonceFeePlanReadyV1
  | BuyVoidNativeExecutionNonceFeePlanHeldV1;

type NormalizedPolicyV1 = {
  rpc_url: string;
  rpc_url_fingerprint_sha256: string;
  wallet_address: string;
  wallet_address_fingerprint_sha256: string;
  expected_chain_id: bigint;
  native_value_wei: bigint;
  gas_limit: bigint;
  max_gas_limit: bigint;
  max_fee_per_gas_wei: bigint;
  max_priority_fee_per_gas_wei: bigint;
  fee_multiplier_bps: bigint;
  request_timeout_ms: number;
  max_response_bytes: number;
};

const ADDRESS = /^0x[0-9a-f]{40}$/;
const HEX_QUANTITY = /^0x(?:0|[1-9a-f][0-9a-f]*)$/i;
const SAFE_PROVIDER_ID = /^[A-Za-z0-9._:@/-]{0,200}$/;
const DEFAULT_TIMEOUT_MS = 5_000;
const DEFAULT_MAX_RESPONSE_BYTES = 65_536;
const MAX_TIMEOUT_MS = 30_000;
const MAX_RESPONSE_BYTES = 1_048_576;
const MAX_BODY_BYTES = 32_768;

function sha256Hex(value: string): string {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function safeErrorClass(error: unknown): string {
  const raw = String((error as any)?.name || "Error").trim();
  return /^[A-Za-z0-9._:-]{1,80}$/.test(raw) ? raw : "Error";
}

function normalizeAddress(value: unknown): string {
  const raw = String(value || "").trim();
  if (!/^0x[0-9a-fA-F]{40}$/.test(raw)) return "";
  try {
    const normalized = getAddress(raw).toLowerCase();
    return ADDRESS.test(normalized) ? normalized : "";
  } catch {
    return "";
  }
}

function parsePositive(value: unknown): bigint | null {
  if (typeof value === "bigint") return value > 0n ? value : null;
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value) || value <= 0) return null;
    return BigInt(value);
  }
  const raw = String(value ?? "").trim();
  if (!/^[0-9]+$/.test(raw)) return null;
  try {
    const parsed = BigInt(raw);
    return parsed > 0n ? parsed : null;
  } catch {
    return null;
  }
}

function parseNonNegative(value: unknown): bigint | null {
  if (typeof value === "bigint") return value >= 0n ? value : null;
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value) || value < 0) return null;
    return BigInt(value);
  }
  const raw = String(value ?? "").trim();
  if (!/^[0-9]+$/.test(raw)) return null;
  try {
    const parsed = BigInt(raw);
    return parsed >= 0n ? parsed : null;
  } catch {
    return null;
  }
}

function safeNumber(value: bigint): number | null {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
}

function parseBoundedNumber(
  value: unknown,
  fallback: number,
  maximum: number,
): number | null {
  const raw = String(value ?? "").trim();
  if (!raw) return fallback;
  if (!/^[0-9]+$/.test(raw)) return null;
  const parsed = Number(raw);
  return Number.isSafeInteger(parsed) && parsed > 0 && parsed <= maximum
    ? parsed
    : null;
}

function parseHexQuantity(value: unknown): bigint | null {
  const raw = String(value ?? "").trim();
  if (!HEX_QUANTITY.test(raw)) return null;
  try {
    return BigInt(raw);
  } catch {
    return null;
  }
}

function normalizePolicy(
  input: BuyVoidNativeExecutionNonceFeePlannerPolicyV1,
):
  | { ok: true; policy: NormalizedPolicyV1 }
  | { ok: false; reason: string; detail?: Record<string, unknown> } {
  const rawUrl = String(input?.rpc_url || "").trim();
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(rawUrl);
  } catch {
    return { ok: false, reason: "invalid_rpc_url" };
  }

  if (
    parsedUrl.protocol !== "http:" ||
    parsedUrl.username ||
    parsedUrl.password ||
    parsedUrl.hash
  ) {
    return { ok: false, reason: "rpc_url_must_be_loopback_http" };
  }

  const hostname = parsedUrl.hostname.toLowerCase();
  if (
    hostname !== "127.0.0.1" &&
    hostname !== "::1" &&
    hostname !== "localhost"
  ) {
    return { ok: false, reason: "rpc_url_must_be_loopback_http" };
  }

  const wallet = normalizeAddress(input?.fulfillment_wallet_address);
  if (!wallet) {
    return { ok: false, reason: "invalid_fulfillment_wallet_address" };
  }

  if (String(input?.expected_chain_id || "") !== "2050") {
    return { ok: false, reason: "invalid_expected_chain_id" };
  }

  const nativeValue = parsePositive(input?.native_value_wei);
  const gasLimit = parsePositive(input?.gas_limit);
  const maxGasLimit = parsePositive(input?.max_gas_limit);
  const maxFee = parsePositive(input?.max_fee_per_gas_wei);
  const priorityFee = parseNonNegative(
    input?.max_priority_fee_per_gas_wei,
  );
  const multiplier = parsePositive(input?.fee_multiplier_bps);

  if (
    nativeValue === null ||
    gasLimit === null ||
    maxGasLimit === null ||
    gasLimit > maxGasLimit ||
    maxFee === null ||
    priorityFee === null ||
    priorityFee > maxFee ||
    multiplier === null ||
    multiplier < 10_000n ||
    multiplier > 50_000n
  ) {
    return { ok: false, reason: "invalid_nonce_fee_planner_policy" };
  }

  const timeout = parseBoundedNumber(
    input?.request_timeout_ms,
    DEFAULT_TIMEOUT_MS,
    MAX_TIMEOUT_MS,
  );
  const maxResponse = parseBoundedNumber(
    input?.max_response_bytes,
    DEFAULT_MAX_RESPONSE_BYTES,
    MAX_RESPONSE_BYTES,
  );
  if (timeout === null || maxResponse === null) {
    return { ok: false, reason: "invalid_rpc_transport_bounds" };
  }

  parsedUrl.pathname = parsedUrl.pathname || "/";
  const normalizedUrl = parsedUrl.toString();

  return {
    ok: true,
    policy: {
      rpc_url: normalizedUrl,
      rpc_url_fingerprint_sha256: sha256Hex(normalizedUrl),
      wallet_address: wallet,
      wallet_address_fingerprint_sha256: sha256Hex(wallet),
      expected_chain_id: 2050n,
      native_value_wei: nativeValue,
      gas_limit: gasLimit,
      max_gas_limit: maxGasLimit,
      max_fee_per_gas_wei: maxFee,
      max_priority_fee_per_gas_wei: priorityFee,
      fee_multiplier_bps: multiplier,
      request_timeout_ms: timeout,
      max_response_bytes: maxResponse,
    },
  };
}

function held(
  reason: string,
  options: {
    policy?: NormalizedPolicyV1;
    methods?: BuyVoidNativeExecutionPlannerRpcMethodV1[];
    detail?: Record<string, unknown>;
  } = {},
): BuyVoidNativeExecutionNonceFeePlanHeldV1 {
  return {
    ok: false,
    marker: VOID_BUY_VOID_NATIVE_EXECUTION_NONCE_FEE_PLANNER_V1,
    version: 1,
    status: "held",
    reason,
    rpc_url_fingerprint_sha256:
      options.policy?.rpc_url_fingerprint_sha256 ?? null,
    wallet_address_fingerprint_sha256:
      options.policy?.wallet_address_fingerprint_sha256 ?? null,
    rpc_methods_used: options.methods || [],
    mutation_performed: false,
    signing_performed: false,
    transaction_broadcast_performed: false,
    ...(options.detail ? { detail: options.detail } : {}),
  };
}

function safeProviderId(value: unknown): string {
  const raw = String(value || "");
  return SAFE_PROVIDER_ID.test(raw) ? raw : "";
}

export function createBuyVoidNativeExecutionPlannerHttpTransportV1():
  BuyVoidNativeExecutionPlannerTransportV1 {
  return async (
    call: Readonly<BuyVoidNativeExecutionPlannerRpcCallV1>,
  ): Promise<BuyVoidNativeExecutionPlannerRpcResultV1> => {
    const body = JSON.stringify({
      jsonrpc: "2.0",
      id: call.request_id,
      method: call.method,
      params: call.params,
    });
    if (Buffer.byteLength(body, "utf8") > MAX_BODY_BYTES) {
      return {
        ok: false,
        error_code: "request_body_too_large",
        provider_submission_id: "",
        http_status: 0,
      };
    }

    return await new Promise((resolve) => {
      let settled = false;
      const finish = (
        value: BuyVoidNativeExecutionPlannerRpcResultV1,
      ) => {
        if (settled) return;
        settled = true;
        resolve(value);
      };

      const url = new URL(call.rpc_url);
      const request = http.request(
        {
          protocol: "http:",
          hostname: url.hostname,
          port: url.port || "80",
          path: `${url.pathname}${url.search}`,
          method: "POST",
          headers: {
            "content-type": "application/json",
            "content-length": String(
              Buffer.byteLength(body, "utf8"),
            ),
            "user-agent":
              "void-buy-void-native-execution-planner-v1",
          },
          timeout: call.request_timeout_ms,
        },
        (response) => {
          const chunks: Buffer[] = [];
          let total = 0;

          response.on("data", (chunk: Buffer) => {
            total += chunk.length;
            if (total > call.max_response_bytes) {
              request.destroy(
                new Error("response_size_limit_exceeded"),
              );
              return;
            }
            chunks.push(chunk);
          });

          response.on("end", () => {
            const httpStatus = Number(response.statusCode || 0);
            const contentType = String(
              response.headers["content-type"] || "",
            ).toLowerCase();
            if (!contentType.includes("application/json")) {
              finish({
                ok: false,
                error_code: "response_content_type_invalid",
                provider_submission_id: "",
                http_status: httpStatus,
              });
              return;
            }

            let payload: any;
            try {
              payload = JSON.parse(
                Buffer.concat(chunks).toString("utf8"),
              );
            } catch {
              finish({
                ok: false,
                error_code: "response_json_invalid",
                provider_submission_id: "",
                http_status: httpStatus,
              });
              return;
            }

            const providerId = safeProviderId(
              response.headers["x-request-id"] ||
                response.headers["x-provider-request-id"] ||
                "",
            );

            if (
              !payload ||
              payload.jsonrpc !== "2.0" ||
              payload.id !== call.request_id
            ) {
              finish({
                ok: false,
                error_code: "json_rpc_envelope_invalid",
                provider_submission_id: providerId,
                http_status: httpStatus,
              });
              return;
            }

            if (
              httpStatus < 200 ||
              httpStatus >= 300 ||
              payload.error
            ) {
              finish({
                ok: false,
                error_code: "json_rpc_call_failed",
                provider_submission_id: providerId,
                http_status: httpStatus,
              });
              return;
            }

            finish({
              ok: true,
              result: payload.result,
              provider_submission_id: providerId,
              http_status: httpStatus,
            });
          });
        },
      );

      request.on("timeout", () => {
        request.destroy(new Error("request_timeout"));
      });
      request.on("error", (error) => {
        finish({
          ok: false,
          error_code:
            String((error as Error)?.message || "") ===
            "response_size_limit_exceeded"
              ? "response_size_limit_exceeded"
              : String((error as Error)?.message || "") ===
                  "request_timeout"
                ? "request_timeout"
                : "transport_error",
          provider_submission_id: "",
          http_status: 0,
        });
      });
      request.end(body);
    });
  };
}

async function rpc(
  transport: BuyVoidNativeExecutionPlannerTransportV1,
  policy: NormalizedPolicyV1,
  method: BuyVoidNativeExecutionPlannerRpcMethodV1,
  params: unknown[],
  requestId: number,
  methods: BuyVoidNativeExecutionPlannerRpcMethodV1[],
): Promise<
  | { ok: true; result: unknown }
  | { ok: false; decision: BuyVoidNativeExecutionNonceFeePlanHeldV1 }
> {
  methods.push(method);
  let response: BuyVoidNativeExecutionPlannerRpcResultV1;
  try {
    response = await transport({
      rpc_url: policy.rpc_url,
      method,
      params,
      request_id: requestId,
      request_timeout_ms: policy.request_timeout_ms,
      max_response_bytes: policy.max_response_bytes,
    });
  } catch (error) {
    return {
      ok: false,
      decision: held("rpc_transport_exception", {
        policy,
        methods,
        detail: { error_class: safeErrorClass(error) },
      }),
    };
  }
  if ("error_code" in response) {
    return {
      ok: false,
      decision: held("rpc_call_failed", {
        policy,
        methods,
        detail: {
          method,
          error_code: response.error_code,
          http_status: response.http_status,
        },
      }),
    };
  }
  return { ok: true, result: response.result };
}

export async function planBuyVoidNativeExecutionNonceFeeV1(
  input: BuyVoidNativeExecutionNonceFeePlannerPolicyV1,
  transport: BuyVoidNativeExecutionPlannerTransportV1 =
    createBuyVoidNativeExecutionPlannerHttpTransportV1(),
): Promise<BuyVoidNativeExecutionNonceFeePlanDecisionV1> {
  const normalized = normalizePolicy(input);
  if ("reason" in normalized) {
    return held(normalized.reason, {
      detail: normalized.detail,
    });
  }

  const policy = normalized.policy;
  const methods: BuyVoidNativeExecutionPlannerRpcMethodV1[] = [];
  let requestId = 1;

  const chain = await rpc(
    transport,
    policy,
    "eth_chainId",
    [],
    requestId++,
    methods,
  );
  if ("decision" in chain) return chain.decision;
  const chainId = parseHexQuantity(chain.result);
  if (chainId === null) {
    return held("chain_id_response_invalid", { policy, methods });
  }
  if (chainId !== policy.expected_chain_id) {
    return held("chain_id_mismatch", {
      policy,
      methods,
      detail: { observed_chain_id: chainId.toString() },
    });
  }

  const nonceResponse = await rpc(
    transport,
    policy,
    "eth_getTransactionCount",
    [policy.wallet_address, "pending"],
    requestId++,
    methods,
  );
  if ("decision" in nonceResponse) return nonceResponse.decision;
  const nonceValue = parseHexQuantity(nonceResponse.result);
  const nonce = nonceValue === null ? null : safeNumber(nonceValue);
  if (nonce === null) {
    return held("pending_nonce_response_invalid", {
      policy,
      methods,
    });
  }

  const gasResponse = await rpc(
    transport,
    policy,
    "eth_gasPrice",
    [],
    requestId++,
    methods,
  );
  if ("decision" in gasResponse) return gasResponse.decision;
  const gasPrice = parseHexQuantity(gasResponse.result);
  if (gasPrice === null || gasPrice <= 0n) {
    return held("gas_price_response_invalid", { policy, methods });
  }

  const balanceResponse = await rpc(
    transport,
    policy,
    "eth_getBalance",
    [policy.wallet_address, "pending"],
    requestId++,
    methods,
  );
  if ("decision" in balanceResponse) return balanceResponse.decision;
  const balance = parseHexQuantity(balanceResponse.result);
  if (balance === null) {
    return held("wallet_balance_response_invalid", {
      policy,
      methods,
    });
  }

  const multiplied =
    (gasPrice * policy.fee_multiplier_bps + 9_999n) / 10_000n;
  if (multiplied > policy.max_fee_per_gas_wei) {
    return held("computed_fee_exceeds_policy_cap", {
      policy,
      methods,
      detail: {
        observed_gas_price_wei: gasPrice.toString(),
        computed_max_fee_per_gas_wei: multiplied.toString(),
        max_fee_per_gas_wei:
          policy.max_fee_per_gas_wei.toString(),
      },
    });
  }
  if (policy.max_priority_fee_per_gas_wei > multiplied) {
    return held("priority_fee_exceeds_computed_max_fee", {
      policy,
      methods,
    });
  }

  const maximumCost =
    policy.native_value_wei +
    policy.gas_limit * multiplied;
  if (balance < maximumCost) {
    return held("fulfillment_wallet_balance_insufficient", {
      policy,
      methods,
      detail: {
        observed_wallet_balance_wei: balance.toString(),
        required_maximum_wei: maximumCost.toString(),
      },
    });
  }

  return {
    ok: true,
    marker: VOID_BUY_VOID_NATIVE_EXECUTION_NONCE_FEE_PLANNER_V1,
    version: 1,
    status: "planned",
    chain_id: "2050",
    wallet_address: policy.wallet_address,
    wallet_address_fingerprint_sha256:
      policy.wallet_address_fingerprint_sha256,
    rpc_url_fingerprint_sha256:
      policy.rpc_url_fingerprint_sha256,
    transaction_plan: {
      chain_id: "2050",
      nonce,
      gas_limit: policy.gas_limit.toString(),
      max_fee_per_gas_wei: multiplied.toString(),
      max_priority_fee_per_gas_wei:
        policy.max_priority_fee_per_gas_wei.toString(),
    },
    pending_nonce: nonce,
    execution_state: "pending",
    observed_gas_price_wei: gasPrice.toString(),
    computed_max_fee_per_gas_wei: multiplied.toString(),
    configured_priority_fee_per_gas_wei:
      policy.max_priority_fee_per_gas_wei.toString(),
    estimated_max_transaction_cost_wei:
      maximumCost.toString(),
    observed_wallet_balance_wei: balance.toString(),
    sufficient_balance: true,
    rpc_methods_used: methods,
    mutation_performed: false,
    signing_performed: false,
    transaction_broadcast_performed: false,
  };
}