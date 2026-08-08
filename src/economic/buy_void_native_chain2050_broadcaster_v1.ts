import { createHash } from "node:crypto";
import * as http from "node:http";
import { Transaction } from "ethers";
import type {
  BuyVoidNativeDeliveryBroadcasterV1,
  BuyVoidNativeDeliveryBroadcastResultV1,
} from "./buy_void_native_delivery_sign_broadcast_adapter_v1.js";

export const VOID_BUY_VOID_NATIVE_CHAIN2050_BROADCASTER_V1 =
  "VOID_BUY_VOID_NATIVE_CHAIN2050_BROADCASTER_V1";

export const VOID_BUY_VOID_NATIVE_CHAIN2050_BROADCASTER_AUTHORITY_V1 = {
  expected_chain_id: 2050,
  loopback_http_only: true,
  startup_chain_identity_probe_required: true,
  per_broadcast_chain_identity_probe_required: true,
  eth_send_raw_transaction_only_mutation: true,
  transaction_signing: false,
  wallet_access: false,
  secret_access: false,
  environment_read: false,
  filesystem_read: false,
  filesystem_write: false,
  runtime_route_mount: false,
  dependency_injection: false,
  automatic_retry: false,
  receipt_wait: false,
  raw_signed_transaction_persistence: false,
  raw_signed_transaction_output: false,
  redirect_follow: false,
  proxy_use: false,
  money_movement_when_injected_and_called: true,
} as const;

const EXPECTED_CHAIN_ID = 2050n;
const RAW_TRANSACTION = /^0x[0-9a-fA-F]+$/;
const TRANSACTION_HASH = /^0x[0-9a-f]{64}$/;
const SAFE_PROVIDER_ID = /^[A-Za-z0-9._:@/-]{0,200}$/;
const MAX_RAW_TRANSACTION_BYTES = 131_072;
const DEFAULT_TIMEOUT_MS = 5_000;
const DEFAULT_MAX_RESPONSE_BYTES = 65_536;

export type BuyVoidNativeChain2050BroadcasterPolicyV1 = {
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
  expected_chain_id: 2050n;
  request_timeout_ms: number;
  max_response_bytes: number;
};

export type BuyVoidNativeChain2050JsonRpcMethodV1 =
  | "eth_chainId"
  | "eth_sendRawTransaction";

export type BuyVoidNativeChain2050JsonRpcCallV1 = {
  rpc_url: string;
  method: BuyVoidNativeChain2050JsonRpcMethodV1;
  params: readonly unknown[];
  request_id: number;
  request_timeout_ms: number;
  max_response_bytes: number;
};

export type BuyVoidNativeChain2050JsonRpcCallReadyV1 = {
  ok: true;
  request_sent: true;
  response_received: true;
  http_status: 200;
  request_id: number;
  result: unknown;
  provider_submission_id: string;
};

export type BuyVoidNativeChain2050JsonRpcCallHeldV1 = {
  ok: false;
  request_sent: boolean;
  response_received: boolean;
  http_status: number | null;
  request_id: number;
  error_code: string;
  json_rpc_error_code: string;
  provider_submission_id: string;
};

export type BuyVoidNativeChain2050JsonRpcCallResultV1 =
  | BuyVoidNativeChain2050JsonRpcCallReadyV1
  | BuyVoidNativeChain2050JsonRpcCallHeldV1;

export type BuyVoidNativeChain2050JsonRpcTransportV1 = {
  call: (
    input: Readonly<BuyVoidNativeChain2050JsonRpcCallV1>,
  ) => Promise<BuyVoidNativeChain2050JsonRpcCallResultV1>;
};

export type BuyVoidNativeChain2050ProbeReadyV1 = {
  ok: true;
  marker: typeof VOID_BUY_VOID_NATIVE_CHAIN2050_BROADCASTER_V1;
  version: 1;
  status: "ready";
  chain_id: "2050";
  rpc_url_fingerprint_sha256: string;
  provider_submission_id: string;
  mutation_performed: false;
};

export type BuyVoidNativeChain2050ProbeHeldV1 = {
  ok: false;
  marker: typeof VOID_BUY_VOID_NATIVE_CHAIN2050_BROADCASTER_V1;
  version: 1;
  status: "held";
  reason: string;
  chain_id: string | null;
  rpc_url_fingerprint_sha256: string | null;
  provider_submission_id: string;
  mutation_performed: false;
  detail?: Record<string, unknown>;
};

export type BuyVoidNativeChain2050ProbeDecisionV1 =
  | BuyVoidNativeChain2050ProbeReadyV1
  | BuyVoidNativeChain2050ProbeHeldV1;

export type BuyVoidNativeChain2050BroadcasterReadyV1 = {
  ok: true;
  marker: typeof VOID_BUY_VOID_NATIVE_CHAIN2050_BROADCASTER_V1;
  version: 1;
  status: "ready";
  chain_id: "2050";
  rpc_url_fingerprint_sha256: string;
  broadcaster: BuyVoidNativeDeliveryBroadcasterV1;
  authority: typeof VOID_BUY_VOID_NATIVE_CHAIN2050_BROADCASTER_AUTHORITY_V1;
};

export type BuyVoidNativeChain2050BroadcasterHeldV1 = {
  ok: false;
  marker: typeof VOID_BUY_VOID_NATIVE_CHAIN2050_BROADCASTER_V1;
  version: 1;
  status: "held";
  reason: string;
  chain_id: string | null;
  rpc_url_fingerprint_sha256: string | null;
  provider_submission_id: string;
  authority: typeof VOID_BUY_VOID_NATIVE_CHAIN2050_BROADCASTER_AUTHORITY_V1;
  detail?: Record<string, unknown>;
};

export type BuyVoidNativeChain2050BroadcasterDecisionV1 =
  | BuyVoidNativeChain2050BroadcasterReadyV1
  | BuyVoidNativeChain2050BroadcasterHeldV1;

function safeErrorClass(error: unknown): string {
  const raw = String((error as any)?.name || "Error").trim();
  return /^[A-Za-z0-9._:-]{1,80}$/.test(raw) ? raw : "Error";
}

function safeProviderSubmissionId(value: unknown): string {
  const raw = String(value || "").trim();
  return SAFE_PROVIDER_ID.test(raw) ? raw : "";
}

function normalizeHash(value: unknown): string | null {
  const raw = String(value || "").trim().toLowerCase();
  return TRANSACTION_HASH.test(raw) ? raw : null;
}

function parsePositiveInteger(
  value: unknown,
  fallback: number,
  maximum: number,
): number | null {
  if (value === undefined || value === null || value === "") return fallback;
  const raw = Number(value);
  if (!Number.isSafeInteger(raw) || raw <= 0 || raw > maximum) return null;
  return raw;
}

function parseChainId(value: unknown): bigint | null {
  try {
    if (typeof value === "bigint") return value >= 0n ? value : null;
    if (typeof value === "number") {
      if (!Number.isSafeInteger(value) || value < 0) return null;
      return BigInt(value);
    }
    const raw = String(value ?? "").trim();
    if (/^0x[0-9a-fA-F]+$/.test(raw)) return BigInt(raw);
    if (/^(0|[1-9][0-9]*)$/.test(raw)) return BigInt(raw);
    return null;
  } catch {
    return null;
  }
}

function normalizeLoopbackHostname(value: string): "127.0.0.1" | "::1" | null {
  const raw = value.trim().toLowerCase().replace(/^\[/, "").replace(/\]$/, "");
  if (raw === "127.0.0.1") return "127.0.0.1";
  if (raw === "::1") return "::1";
  return null;
}

function fingerprintRpcUrl(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function normalizePolicy(
  input: BuyVoidNativeChain2050BroadcasterPolicyV1,
): NormalizedPolicyV1 | BuyVoidNativeChain2050ProbeHeldV1 {
  let url: URL;
  try {
    url = new URL(String(input?.rpc_url || "").trim());
  } catch {
    return probeHeld("invalid_rpc_url");
  }

  const hostname = normalizeLoopbackHostname(url.hostname);
  const port = Number(url.port || 0);
  const expectedChainId = parseChainId(input?.expected_chain_id);
  const requestTimeoutMs = parsePositiveInteger(
    input?.request_timeout_ms,
    DEFAULT_TIMEOUT_MS,
    30_000,
  );
  const maxResponseBytes = parsePositiveInteger(
    input?.max_response_bytes,
    DEFAULT_MAX_RESPONSE_BYTES,
    1_048_576,
  );

  if (url.protocol !== "http:") return probeHeld("rpc_protocol_not_allowed");
  if (!hostname) return probeHeld("rpc_host_not_loopback");
  if (!Number.isInteger(port) || port <= 0 || port > 65_535) {
    return probeHeld("rpc_port_required");
  }
  if (url.username || url.password) return probeHeld("rpc_userinfo_forbidden");
  if (url.search || url.hash) return probeHeld("rpc_query_or_fragment_forbidden");
  if (!url.pathname.startsWith("/") || url.pathname.length > 256) {
    return probeHeld("invalid_rpc_path");
  }
  if (expectedChainId !== EXPECTED_CHAIN_ID) {
    return probeHeld("expected_chain_id_must_be_2050", {
      chain_id: expectedChainId === null ? null : expectedChainId.toString(),
    });
  }
  if (requestTimeoutMs === null) return probeHeld("invalid_request_timeout_ms");
  if (maxResponseBytes === null) return probeHeld("invalid_max_response_bytes");

  const renderedHost = hostname === "::1" ? "[::1]" : hostname;
  const normalizedUrl = `http://${renderedHost}:${port}${url.pathname}`;
  return {
    rpc_url: normalizedUrl,
    hostname,
    port,
    path: url.pathname,
    expected_chain_id: 2050n,
    request_timeout_ms: requestTimeoutMs,
    max_response_bytes: maxResponseBytes,
  };
}

function probeHeld(
  reason: string,
  detail?: Record<string, unknown>,
): BuyVoidNativeChain2050ProbeHeldV1 {
  return {
    ok: false,
    marker: VOID_BUY_VOID_NATIVE_CHAIN2050_BROADCASTER_V1,
    version: 1,
    status: "held",
    reason,
    chain_id: null,
    rpc_url_fingerprint_sha256: null,
    provider_submission_id: "",
    mutation_performed: false,
    ...(detail ? { detail } : {}),
  };
}

function providerId(requestId: number, suffix: string): string {
  return safeProviderSubmissionId(
    `chain2050-rpc:${requestId}:${suffix}`,
  );
}

function hasOwn(
  record: Record<string, unknown>,
  key: string,
): boolean {
  return Object.prototype.hasOwnProperty.call(record, key);
}

function invalidTransportResult(
  input: Readonly<BuyVoidNativeChain2050JsonRpcCallV1>,
): BuyVoidNativeChain2050JsonRpcCallHeldV1 {
  return {
    ok: false,
    request_sent: input.method === "eth_sendRawTransaction",
    response_received: false,
    http_status: null,
    request_id: input.request_id,
    error_code: "transport_result_boundary_invalid",
    json_rpc_error_code: "",
    provider_submission_id: providerId(
      input.request_id,
      "boundary-invalid",
    ),
  };
}

function normalizeTransportResult(
  input: Readonly<BuyVoidNativeChain2050JsonRpcCallV1>,
  value: unknown,
): BuyVoidNativeChain2050JsonRpcCallResultV1 {
  const invalid = (): BuyVoidNativeChain2050JsonRpcCallHeldV1 =>
    invalidTransportResult(input);

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return invalid();
  }

  const record = value as Record<string, unknown>;
  const providerRaw = record.provider_submission_id;
  if (
    !hasOwn(record, "provider_submission_id") ||
    typeof providerRaw !== "string" ||
    providerRaw !== safeProviderSubmissionId(providerRaw)
  ) {
    return invalid();
  }
  const providerSubmissionId = providerRaw;

  if (record.ok === true) {
    if (
      !hasOwn(record, "ok") ||
      !hasOwn(record, "request_sent") ||
      !hasOwn(record, "response_received") ||
      !hasOwn(record, "http_status") ||
      !hasOwn(record, "request_id") ||
      record.request_sent !== true ||
      record.response_received !== true ||
      record.http_status !== 200 ||
      record.request_id !== input.request_id ||
      !hasOwn(record, "result") ||
      hasOwn(record, "error_code") ||
      hasOwn(record, "json_rpc_error_code")
    ) {
      return invalid();
    }
    return {
      ok: true,
      request_sent: true,
      response_received: true,
      http_status: 200,
      request_id: input.request_id,
      result: record.result,
      provider_submission_id: providerSubmissionId,
    };
  }

  if (record.ok === false) {
    const requestSent = record.request_sent;
    const responseReceived = record.response_received;
    const httpStatus = record.http_status;
    const errorCode = record.error_code;
    const jsonRpcErrorCode = record.json_rpc_error_code;
    if (
      !hasOwn(record, "ok") ||
      !hasOwn(record, "request_sent") ||
      !hasOwn(record, "response_received") ||
      !hasOwn(record, "http_status") ||
      !hasOwn(record, "request_id") ||
      !hasOwn(record, "error_code") ||
      !hasOwn(record, "json_rpc_error_code") ||
      typeof requestSent !== "boolean" ||
      typeof responseReceived !== "boolean" ||
      (httpStatus !== null &&
        (typeof httpStatus !== "number" ||
          !Number.isInteger(httpStatus) ||
          httpStatus < 100 ||
          httpStatus > 599)) ||
      record.request_id !== input.request_id ||
      typeof errorCode !== "string" ||
      !/^[A-Za-z0-9._:-]{1,160}$/.test(errorCode) ||
      typeof jsonRpcErrorCode !== "string" ||
      !/^(?:|-?[0-9]{1,12})$/.test(jsonRpcErrorCode) ||
      hasOwn(record, "result")
    ) {
      return invalid();
    }
    return {
      ok: false,
      request_sent: requestSent,
      response_received: responseReceived,
      http_status: httpStatus as number | null,
      request_id: input.request_id,
      error_code: errorCode,
      json_rpc_error_code: jsonRpcErrorCode,
      provider_submission_id: providerSubmissionId,
    };
  }

  return invalid();
}

export function createBuyVoidNativeChain2050HttpTransportV1():
BuyVoidNativeChain2050JsonRpcTransportV1 {
  return {
    async call(input) {
      const normalized = normalizePolicy({
        rpc_url: input.rpc_url,
        expected_chain_id: 2050,
        request_timeout_ms: input.request_timeout_ms,
        max_response_bytes: input.max_response_bytes,
      });
      if ("reason" in normalized) {
        return {
          ok: false,
          request_sent: false,
          response_received: false,
          http_status: null,
          request_id: input.request_id,
          error_code: normalized.reason,
          json_rpc_error_code: "",
          provider_submission_id: providerId(input.request_id, "policy-held"),
        };
      }

      const body = JSON.stringify({
        jsonrpc: "2.0",
        id: input.request_id,
        method: input.method,
        params: [...input.params],
      });

      return await new Promise<BuyVoidNativeChain2050JsonRpcCallResultV1>(
        (resolve) => {
          let settled = false;
          let requestSent = false;
          const finish = (
            value: BuyVoidNativeChain2050JsonRpcCallResultV1,
          ): void => {
            if (settled) return;
            settled = true;
            resolve(value);
          };

          const request = http.request(
            {
              protocol: "http:",
              hostname: normalized.hostname,
              port: normalized.port,
              path: normalized.path,
              method: "POST",
              agent: false,
              family: normalized.hostname === "::1" ? 6 : 4,
              headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
                "Content-Length": Buffer.byteLength(body),
                Connection: "close",
              },
            },
            (response) => {
              requestSent = true;
              const chunks: Buffer[] = [];
              let bytes = 0;
              response.on("data", (chunk: Buffer | string) => {
                const buffer = Buffer.isBuffer(chunk)
                  ? chunk
                  : Buffer.from(chunk);
                bytes += buffer.length;
                if (bytes > normalized.max_response_bytes) {
                  response.destroy();
                  finish({
                    ok: false,
                    request_sent: true,
                    response_received: true,
                    http_status: response.statusCode || null,
                    request_id: input.request_id,
                    error_code: "rpc_response_too_large",
                    json_rpc_error_code: "",
                    provider_submission_id: providerId(
                      input.request_id,
                      "response-too-large",
                    ),
                  });
                  return;
                }
                chunks.push(buffer);
              });
              response.on("aborted", () => {
                finish({
                  ok: false,
                  request_sent: true,
                  response_received: true,
                  http_status: response.statusCode || null,
                  request_id: input.request_id,
                  error_code: "rpc_response_aborted",
                  json_rpc_error_code: "",
                  provider_submission_id: providerId(
                    input.request_id,
                    "response-aborted",
                  ),
                });
              });
              response.on("error", (error) => {
                finish({
                  ok: false,
                  request_sent: true,
                  response_received: true,
                  http_status: response.statusCode || null,
                  request_id: input.request_id,
                  error_code: `rpc_response_${safeErrorClass(error)}`,
                  json_rpc_error_code: "",
                  provider_submission_id: providerId(
                    input.request_id,
                    "response-error",
                  ),
                });
              });
              response.on("close", () => {
                if (settled) return;
                finish({
                  ok: false,
                  request_sent: true,
                  response_received: true,
                  http_status: response.statusCode || null,
                  request_id: input.request_id,
                  error_code: "rpc_response_closed_before_end",
                  json_rpc_error_code: "",
                  provider_submission_id: providerId(
                    input.request_id,
                    "response-closed",
                  ),
                });
              });
              response.on("end", () => {
                if (settled) return;
                const status = response.statusCode || 0;
                if (status !== 200) {
                  finish({
                    ok: false,
                    request_sent: true,
                    response_received: true,
                    http_status: status || null,
                    request_id: input.request_id,
                    error_code: "rpc_http_status_not_200",
                    json_rpc_error_code: "",
                    provider_submission_id: providerId(
                      input.request_id,
                      `http-${status || 0}`,
                    ),
                  });
                  return;
                }

                let parsed: unknown;
                try {
                  parsed = JSON.parse(Buffer.concat(chunks).toString("utf8"));
                } catch {
                  finish({
                    ok: false,
                    request_sent: true,
                    response_received: true,
                    http_status: 200,
                    request_id: input.request_id,
                    error_code: "rpc_response_not_json",
                    json_rpc_error_code: "",
                    provider_submission_id: providerId(
                      input.request_id,
                      "invalid-json",
                    ),
                  });
                  return;
                }

                if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
                  finish({
                    ok: false,
                    request_sent: true,
                    response_received: true,
                    http_status: 200,
                    request_id: input.request_id,
                    error_code: "rpc_response_not_object",
                    json_rpc_error_code: "",
                    provider_submission_id: providerId(
                      input.request_id,
                      "invalid-object",
                    ),
                  });
                  return;
                }

                const responseObject = parsed as Record<string, unknown>;
                if (responseObject.error && typeof responseObject.error === "object") {
                  const rpcError = responseObject.error as Record<string, unknown>;
                  const code = String(rpcError.code ?? "").trim();
                  finish({
                    ok: false,
                    request_sent: true,
                    response_received: true,
                    http_status: 200,
                    request_id: input.request_id,
                    error_code: "rpc_json_error",
                    json_rpc_error_code: /^-?[0-9]{1,12}$/.test(code) ? code : "",
                    provider_submission_id: providerId(
                      input.request_id,
                      /^-?[0-9]{1,12}$/.test(code)
                        ? `jsonrpc-${code.replace(/^-/, "neg")}`
                        : "jsonrpc-error",
                    ),
                  });
                  return;
                }

                if (!("result" in responseObject)) {
                  finish({
                    ok: false,
                    request_sent: true,
                    response_received: true,
                    http_status: 200,
                    request_id: input.request_id,
                    error_code: "rpc_result_missing",
                    json_rpc_error_code: "",
                    provider_submission_id: providerId(
                      input.request_id,
                      "result-missing",
                    ),
                  });
                  return;
                }

                finish({
                  ok: true,
                  request_sent: true,
                  response_received: true,
                  http_status: 200,
                  request_id: input.request_id,
                  result: responseObject.result,
                  provider_submission_id: providerId(
                    input.request_id,
                    "result",
                  ),
                });
              });
            },
          );

          request.on("finish", () => {
            requestSent = true;
          });
          request.on("error", (error) => {
            finish({
              ok: false,
              request_sent: requestSent,
              response_received: false,
              http_status: null,
              request_id: input.request_id,
              error_code: `rpc_transport_${safeErrorClass(error)}`,
              json_rpc_error_code: "",
              provider_submission_id: providerId(
                input.request_id,
                "transport-error",
              ),
            });
          });
          request.setTimeout(normalized.request_timeout_ms, () => {
            request.destroy(Object.assign(new Error("request_timeout"), {
              name: "RequestTimeout",
            }));
          });
          try {
            request.end(body);
          } catch (error) {
            finish({
              ok: false,
              request_sent: false,
              response_received: false,
              http_status: null,
              request_id: input.request_id,
              error_code: `rpc_request_${safeErrorClass(error)}`,
              json_rpc_error_code: "",
              provider_submission_id: providerId(
                input.request_id,
                "request-error",
              ),
            });
          }
        },
      );
    },
  };
}

async function callTransport(
  transport: BuyVoidNativeChain2050JsonRpcTransportV1,
  input: BuyVoidNativeChain2050JsonRpcCallV1,
): Promise<BuyVoidNativeChain2050JsonRpcCallResultV1> {
  try {
    const response: unknown = await transport.call(input);
    return normalizeTransportResult(input, response);
  } catch (error) {
    return {
      ok: false,
      request_sent: input.method === "eth_sendRawTransaction",
      response_received: false,
      http_status: null,
      request_id: input.request_id,
      error_code: `transport_throw_${safeErrorClass(error)}`,
      json_rpc_error_code: "",
      provider_submission_id: providerId(
        input.request_id,
        "transport-throw",
      ),
    };
  }
}

async function probeNormalized(
  policy: NormalizedPolicyV1,
  transport: BuyVoidNativeChain2050JsonRpcTransportV1,
  requestId: number,
): Promise<BuyVoidNativeChain2050ProbeDecisionV1> {
  const response = await callTransport(transport, {
    rpc_url: policy.rpc_url,
    method: "eth_chainId",
    params: [],
    request_id: requestId,
    request_timeout_ms: policy.request_timeout_ms,
    max_response_bytes: policy.max_response_bytes,
  });
  const fingerprint = fingerprintRpcUrl(policy.rpc_url);

  if ("error_code" in response) {
    return {
      ...probeHeld("chain_identity_probe_failed", {
        error_code: response.error_code,
        http_status: response.http_status,
      }),
      rpc_url_fingerprint_sha256: fingerprint,
      provider_submission_id: response.provider_submission_id,
    };
  }

  const chainId = parseChainId(response.result);
  if (chainId === null) {
    return {
      ...probeHeld("chain_identity_response_invalid"),
      rpc_url_fingerprint_sha256: fingerprint,
      provider_submission_id: response.provider_submission_id,
    };
  }
  if (chainId !== policy.expected_chain_id) {
    return {
      ...probeHeld("chain_identity_mismatch", {
        observed_chain_id: chainId.toString(),
      }),
      chain_id: chainId.toString(),
      rpc_url_fingerprint_sha256: fingerprint,
      provider_submission_id: response.provider_submission_id,
    };
  }

  return {
    ok: true,
    marker: VOID_BUY_VOID_NATIVE_CHAIN2050_BROADCASTER_V1,
    version: 1,
    status: "ready",
    chain_id: "2050",
    rpc_url_fingerprint_sha256: fingerprint,
    provider_submission_id: response.provider_submission_id,
    mutation_performed: false,
  };
}

export async function probeBuyVoidNativeChain2050BroadcasterV1(
  policyInput: BuyVoidNativeChain2050BroadcasterPolicyV1,
  transport: BuyVoidNativeChain2050JsonRpcTransportV1 =
    createBuyVoidNativeChain2050HttpTransportV1(),
): Promise<BuyVoidNativeChain2050ProbeDecisionV1> {
  const policy = normalizePolicy(policyInput);
  if ("reason" in policy) return policy;
  return probeNormalized(policy, transport, 1);
}

export async function createBuyVoidNativeChain2050BroadcasterV1(
  policyInput: BuyVoidNativeChain2050BroadcasterPolicyV1,
  transport: BuyVoidNativeChain2050JsonRpcTransportV1 =
    createBuyVoidNativeChain2050HttpTransportV1(),
): Promise<BuyVoidNativeChain2050BroadcasterDecisionV1> {
  const policy = normalizePolicy(policyInput);
  if ("reason" in policy) {
    return {
      ...policy,
      authority: VOID_BUY_VOID_NATIVE_CHAIN2050_BROADCASTER_AUTHORITY_V1,
    };
  }

  let nextRequestId = 1;
  const startupProbe = await probeNormalized(
    policy,
    transport,
    nextRequestId++,
  );
  if ("reason" in startupProbe) {
    return {
      ...startupProbe,
      authority: VOID_BUY_VOID_NATIVE_CHAIN2050_BROADCASTER_AUTHORITY_V1,
    };
  }

  const broadcaster: BuyVoidNativeDeliveryBroadcasterV1 = {
    async broadcast_signed_transaction(
      rawSignedTransaction,
    ): Promise<BuyVoidNativeDeliveryBroadcastResultV1> {
      const raw = String(rawSignedTransaction || "").trim();
      if (
        !RAW_TRANSACTION.test(raw) ||
        raw.length % 2 !== 0 ||
        (raw.length - 2) / 2 > MAX_RAW_TRANSACTION_BYTES
      ) {
        return {
          accepted: false,
          provider_submission_id: "chain2050-local-invalid-raw",
          submission_may_have_occurred: false,
        };
      }

      let transaction: Transaction;
      try {
        transaction = Transaction.from(raw);
      } catch {
        return {
          accepted: false,
          provider_submission_id: "chain2050-local-parse-failed",
          submission_may_have_occurred: false,
        };
      }

      const expectedHash = normalizeHash(transaction.hash);
      if (!expectedHash) {
        return {
          accepted: false,
          provider_submission_id: "chain2050-local-hash-missing",
          submission_may_have_occurred: false,
        };
      }
      if (transaction.chainId !== policy.expected_chain_id) {
        return {
          accepted: false,
          transaction_hash: expectedHash,
          provider_submission_id: "chain2050-local-chain-mismatch",
          submission_may_have_occurred: false,
        };
      }

      const liveProbe = await probeNormalized(
        policy,
        transport,
        nextRequestId++,
      );
      if ("reason" in liveProbe) {
        return {
          accepted: false,
          transaction_hash: expectedHash,
          provider_submission_id: liveProbe.provider_submission_id,
          submission_may_have_occurred: false,
        };
      }

      const response = await callTransport(transport, {
        rpc_url: policy.rpc_url,
        method: "eth_sendRawTransaction",
        params: [raw],
        request_id: nextRequestId++,
        request_timeout_ms: policy.request_timeout_ms,
        max_response_bytes: policy.max_response_bytes,
      });

      if ("error_code" in response) {
        return {
          accepted: false,
          transaction_hash: expectedHash,
          provider_submission_id: response.provider_submission_id,
          submission_may_have_occurred:
            response.request_sent || response.response_received,
        };
      }

      const returnedHash = normalizeHash(response.result);
      if (returnedHash !== expectedHash) {
        return {
          accepted: false,
          transaction_hash: returnedHash || expectedHash,
          provider_submission_id: response.provider_submission_id,
          submission_may_have_occurred: true,
        };
      }

      return {
        accepted: true,
        transaction_hash: expectedHash,
        provider_submission_id: response.provider_submission_id,
        submission_may_have_occurred: true,
      };
    },
  };

  return {
    ok: true,
    marker: VOID_BUY_VOID_NATIVE_CHAIN2050_BROADCASTER_V1,
    version: 1,
    status: "ready",
    chain_id: "2050",
    rpc_url_fingerprint_sha256:
      startupProbe.rpc_url_fingerprint_sha256,
    broadcaster,
    authority: VOID_BUY_VOID_NATIVE_CHAIN2050_BROADCASTER_AUTHORITY_V1,
  };
}
