#!/usr/bin/env node

export const VOID_ECONOMIC_EPOCH2_PUBLIC_READ_LOOPBACK_TRANSPORT_V1 =
  "VOID_ECONOMIC_EPOCH2_PUBLIC_READ_LOOPBACK_TRANSPORT_V1";

export const VOID_ECONOMIC_EPOCH2_PUBLIC_READ_LOOPBACK_TRANSPORT_AUTHORITY_V1 =
  Object.freeze({
    source_only: true,
    loopback_only: true,
    read_only_rpc_methods_only: true,
    redirects_forbidden: true,
    bounded_response_bytes: true,
    bounded_timeout: true,
    production_successor_rpc_endpoint_selected: false,
    live_balance_receipt_code_gateway_ready: false,
    public_balance_receipt_code_verification_ready: false,
    runtime_route_active: false,
    public_gateway_active: false,
    credential_content_access: false,
    wallet_access: false,
    private_key_access: false,
    transaction_construction: false,
    transaction_signing: false,
    transaction_submission: false,
    transaction_broadcast: false,
    authoritative_chain2050_write: false,
    wc_mutation: false,
    validator_mutation: false,
    token_movement: false,
    funds_movement: false,
    migration_authorized: false,
    public_activation_authorized: false,
  });

export class VoidEconomicEpoch2PublicReadLoopbackTransportHoldV1 extends Error {
  constructor(reason, detail = null) {
    super(reason);
    this.name = "VoidEconomicEpoch2PublicReadLoopbackTransportHoldV1";
    this.reason = reason;
    this.detail = detail;
  }
}

const ALLOWED_METHODS = Object.freeze(new Set([
  "eth_chainId",
  "eth_getBlockByNumber",
  "eth_getBalance",
  "eth_getCode",
  "eth_getTransactionReceipt",
]));
const MAX_TIMEOUT_MS = 5_000;
const MAX_RESPONSE_BYTES = 512 * 1024;
const REQUEST_KEYS = Object.freeze(["method", "params", "timeout_ms"]);

function hold(reason, detail = null) {
  throw new VoidEconomicEpoch2PublicReadLoopbackTransportHoldV1(reason, detail);
}

function exactDataObject(value, keys, reason) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    hold(reason);
  }
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) hold(reason);
  let descriptors;
  try {
    descriptors = Object.getOwnPropertyDescriptors(value);
  } catch {
    hold(reason);
  }
  const actual = Reflect.ownKeys(descriptors);
  if (actual.some((key) => typeof key !== "string")) hold(reason);
  const expected = [...keys].sort();
  const sorted = actual.sort();
  if (
    sorted.length !== expected.length ||
    sorted.some((key, index) => key !== expected[index])
  ) {
    hold(reason);
  }

  const out = Object.create(null);
  for (const key of keys) {
    const descriptor = descriptors[key];
    if (
      !descriptor ||
      descriptor.enumerable !== true ||
      !Object.hasOwn(descriptor, "value")
    ) {
      hold(reason);
    }
    out[key] = descriptor.value;
  }
  return Object.freeze(out);
}

function canonicalEndpoint(value) {
  if (typeof value !== "string" || value.length > 128) {
    hold("read_transport_endpoint_invalid");
  }
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    hold("read_transport_endpoint_invalid");
  }

  if (
    parsed.protocol !== "http:" ||
    parsed.hostname !== "127.0.0.1" ||
    parsed.username !== "" ||
    parsed.password !== "" ||
    parsed.pathname !== "/" ||
    parsed.search !== "" ||
    parsed.hash !== "" ||
    parsed.port === ""
  ) {
    hold("read_transport_endpoint_not_canonical_loopback");
  }

  const port = Number(parsed.port);
  if (!Number.isSafeInteger(port) || port < 1024 || port > 65535) {
    hold("read_transport_endpoint_port_invalid");
  }

  const canonical = `http://127.0.0.1:${port}/`;
  if (parsed.href !== canonical || value !== canonical) {
    hold("read_transport_endpoint_not_canonical_loopback");
  }
  return canonical;
}

function canonicalRequest(value) {
  const request = exactDataObject(
    value,
    REQUEST_KEYS,
    "read_transport_request_shape_invalid",
  );

  if (
    typeof request.method !== "string" ||
    !ALLOWED_METHODS.has(request.method)
  ) {
    hold("read_transport_method_forbidden");
  }

  if (
    !Array.isArray(request.params) ||
    Object.getPrototypeOf(request.params) !== Array.prototype ||
    request.params.length > 3
  ) {
    hold("read_transport_params_invalid");
  }

  for (let index = 0; index < request.params.length; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(
      request.params,
      String(index),
    );
    if (
      !descriptor ||
      !Object.hasOwn(descriptor, "value") ||
      descriptor.enumerable !== true
    ) {
      hold("read_transport_params_invalid");
    }
  }

  if (
    !Number.isSafeInteger(request.timeout_ms) ||
    request.timeout_ms < 1 ||
    request.timeout_ms > MAX_TIMEOUT_MS
  ) {
    hold("read_transport_timeout_invalid");
  }

  let body;
  try {
    body = JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: request.method,
      params: request.params,
    });
  } catch {
    hold("read_transport_request_json_invalid");
  }
  if (body.length > 16 * 1024) {
    hold("read_transport_request_above_bound");
  }

  return Object.freeze({
    method: request.method,
    timeout_ms: request.timeout_ms,
    body,
  });
}

async function readBoundedResponse(response) {
  if (!response.body || typeof response.body.getReader !== "function") {
    hold("read_transport_response_body_unavailable");
  }
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!(value instanceof Uint8Array)) {
        hold("read_transport_response_chunk_invalid");
      }
      total += value.byteLength;
      if (total > MAX_RESPONSE_BYTES) {
        try {
          await reader.cancel();
        } catch {
          // Cancellation is best-effort after the hard size rejection.
        }
        hold("read_transport_response_above_bound");
      }
      chunks.push(Buffer.from(value));
    }
  } catch (error) {
    if (
      error instanceof VoidEconomicEpoch2PublicReadLoopbackTransportHoldV1
    ) {
      throw error;
    }
    hold("read_transport_response_read_failed");
  }

  return Buffer.concat(chunks, total);
}

function normalizeRpcEnvelope(raw) {
  if (
    raw === null ||
    typeof raw !== "object" ||
    Array.isArray(raw) ||
    Object.getPrototypeOf(raw) !== Object.prototype
  ) {
    hold("read_transport_rpc_envelope_invalid");
  }

  if (raw.jsonrpc !== "2.0" || raw.id !== 1) {
    hold("read_transport_rpc_envelope_invalid");
  }

  const hasResult = Object.hasOwn(raw, "result");
  const hasError = Object.hasOwn(raw, "error");
  if (hasResult === hasError) {
    hold("read_transport_rpc_envelope_invalid");
  }
  if (hasError) {
    hold("read_transport_rpc_error");
  }
  return raw.result;
}

export function createVoidEconomicEpoch2PublicReadLoopbackTransportV1({
  endpoint,
}) {
  const canonical = canonicalEndpoint(endpoint);

  return Object.freeze({
    marker: VOID_ECONOMIC_EPOCH2_PUBLIC_READ_LOOPBACK_TRANSPORT_V1,
    endpoint_class: "canonical_ipv4_loopback_http",
    production_successor_rpc_endpoint_selected: false,
    live_balance_receipt_code_gateway_ready: false,
    public_balance_receipt_code_verification_ready: false,
    runtime_route_active: false,
    public_gateway_active: false,
    authority:
      VOID_ECONOMIC_EPOCH2_PUBLIC_READ_LOOPBACK_TRANSPORT_AUTHORITY_V1,

    async transport(rawRequest) {
      const request = canonicalRequest(rawRequest);
      const controller = new AbortController();
      let timer = null;
      try {
        timer = setTimeout(
          () => controller.abort(),
          request.timeout_ms,
        );
        const response = await fetch(canonical, {
          method: "POST",
          redirect: "error",
          headers: Object.freeze({
            "content-type": "application/json",
            accept: "application/json",
          }),
          body: request.body,
          signal: controller.signal,
        });

        if (response.status !== 200) {
          hold("read_transport_http_status_invalid", {
            status: response.status,
          });
        }
        const contentType = response.headers.get("content-type") || "";
        if (!/^application\/json(?:;|$)/iu.test(contentType)) {
          hold("read_transport_content_type_invalid");
        }

        const bytes = await readBoundedResponse(response);
        let decoded;
        try {
          decoded = JSON.parse(bytes.toString("utf8"));
        } catch {
          hold("read_transport_response_json_invalid");
        }
        return normalizeRpcEnvelope(decoded);
      } catch (error) {
        if (
          error instanceof VoidEconomicEpoch2PublicReadLoopbackTransportHoldV1
        ) {
          throw error;
        }
        if (controller.signal.aborted) {
          hold("read_transport_timeout");
        }
        hold("read_transport_http_failed");
      } finally {
        if (timer !== null) clearTimeout(timer);
      }
    },
  });
}
