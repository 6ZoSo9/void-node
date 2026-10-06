#!/usr/bin/env node
import crypto from "node:crypto";

export const VOID_AGENT_CREDENTIAL_REQUEST_PROXY_V2_SOURCE_IDENTITY_V1 =
  "VOID_AGENT_CREDENTIAL_REQUEST_PROXY_V2_SOURCE_IDENTITY_V1";

export const VOID_AGENT_CREDENTIAL_REQUEST_PROXY_V2_SOURCE_IDENTITY_AUTHORITY_V1 =
  Object.freeze({
    source_contract: true,
    proxy_protocol_v2_parse: true,
    tcp4_source_identity: true,
    tcp6_source_identity: true,
    raw_source_address_bound: true,
    source_port_excluded_from_limiter_identity: true,
    spoofable_forwarding_headers_trusted: false,
    trusted_source_header_replaced: true,
    per_source_rate_limit_planning: true,
    local_transport_trust_proven: false,
    tailscale_funnel_configuration_verified: false,
    listener_created: false,
    public_gateway_modified: false,
    upstream_loopback_limiter_modified: false,
    runtime_integration: false,
    credential_issuance: false,
    credential_registry_write: false,
    paid_work_dispatch: false,
    work_credit_write: false,
    wallet_or_signer_access: false,
    private_key_access: false,
    transaction_construction: false,
    transaction_signing: false,
    transaction_broadcast: false,
    chain2050_write: false,
    market_activation: false,
    public_presale_activation: false,
    treasury_or_liquidity_movement: false,
    funds_movement: false,
  });

export const VOID_AGENT_CREDENTIAL_REQUEST_TRUSTED_SOURCE_HEADER_V1 =
  "x-void-trusted-funnel-source-v1";

const SIGNATURE = Buffer.from([
  0x0d, 0x0a, 0x0d, 0x0a, 0x00, 0x0d,
  0x0a, 0x51, 0x55, 0x49, 0x54, 0x0a,
]);
const HEADER_FIXED_BYTES = 16;
const IPV4_ADDRESS_BYTES = 12;
const IPV6_ADDRESS_BYTES = 36;
const MAX_PROXY_V2_HEADER_BYTES = 512;
const MAX_HEADER_COUNT = 128;
const MAX_HEADER_NAME_BYTES = 128;
const MAX_HEADER_VALUE_BYTES = 16 * 1024;
const MAX_RATE_EVENTS = 4096;
const SOURCE_KEY = /^voidcrsrc1_[0-9a-f]{64}$/u;
const HTTP_HEADER_NAME =
  /^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/u;

const SPOOFABLE_HEADERS = Object.freeze(new Set([
  "forwarded",
  "x-forwarded-for",
  "x-forwarded-host",
  "x-forwarded-proto",
  "x-real-ip",
  VOID_AGENT_CREDENTIAL_REQUEST_TRUSTED_SOURCE_HEADER_V1,
]));

function fail(code) {
  throw new Error(code);
}

function sha256Hex(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function held(reason) {
  return Object.freeze({
    ok: false,
    status: "HOLD",
    marker: VOID_AGENT_CREDENTIAL_REQUEST_PROXY_V2_SOURCE_IDENTITY_V1,
    version: 1,
    reason,
    local_transport_trust_proven: false,
    runtime_integration: false,
    funds_movement: false,
    authority:
      VOID_AGENT_CREDENTIAL_REQUEST_PROXY_V2_SOURCE_IDENTITY_AUTHORITY_V1,
  });
}

function parsePort(bytes, offset) {
  return bytes.readUInt16BE(offset);
}

function ipv4Display(bytes) {
  return Array.from(bytes).join(".");
}

function sourceIdentity(family, sourceAddressHex) {
  const material = Buffer.from(
    "void-agent-credential-request-proxy-v2-source-v1\0" +
      family +
      "\0" +
      sourceAddressHex,
    "utf8",
  );
  return "voidcrsrc1_" + sha256Hex(material);
}

export function parseVoidAgentCredentialRequestProxyV2SourceV1(input) {
  try {
    if (!Buffer.isBuffer(input)) {
      fail("proxy_v2_input_must_be_buffer");
    }
    if (input.length < HEADER_FIXED_BYTES) {
      fail("proxy_v2_header_incomplete");
    }
    if (!input.subarray(0, SIGNATURE.length).equals(SIGNATURE)) {
      fail("proxy_v2_signature_invalid");
    }

    const versionCommand = input[12];
    const version = versionCommand >>> 4;
    const command = versionCommand & 0x0f;
    if (version !== 0x2) {
      fail("proxy_v2_version_invalid");
    }
    if (command !== 0x1) {
      fail("proxy_v2_proxy_command_required");
    }

    const familyProtocol = input[13];
    let family;
    let addressBytes;
    if (familyProtocol === 0x11) {
      family = "tcp4";
      addressBytes = IPV4_ADDRESS_BYTES;
    } else if (familyProtocol === 0x21) {
      family = "tcp6";
      addressBytes = IPV6_ADDRESS_BYTES;
    } else {
      fail("proxy_v2_tcp4_or_tcp6_required");
    }

    const payloadBytes = input.readUInt16BE(14);
    const totalHeaderBytes = HEADER_FIXED_BYTES + payloadBytes;
    if (payloadBytes < addressBytes) {
      fail("proxy_v2_address_payload_too_short");
    }
    if (totalHeaderBytes > MAX_PROXY_V2_HEADER_BYTES) {
      fail("proxy_v2_header_too_large");
    }
    if (input.length < totalHeaderBytes) {
      fail("proxy_v2_header_truncated");
    }

    const address = input.subarray(
      HEADER_FIXED_BYTES,
      HEADER_FIXED_BYTES + addressBytes,
    );

    let sourceAddress;
    let destinationAddress;
    let sourcePort;
    let destinationPort;
    let sourceAddressHex;
    let destinationAddressHex;

    if (family === "tcp4") {
      const source = address.subarray(0, 4);
      const destination = address.subarray(4, 8);
      sourceAddress = ipv4Display(source);
      destinationAddress = ipv4Display(destination);
      sourceAddressHex = source.toString("hex");
      destinationAddressHex = destination.toString("hex");
      sourcePort = parsePort(address, 8);
      destinationPort = parsePort(address, 10);
    } else {
      const source = address.subarray(0, 16);
      const destination = address.subarray(16, 32);
      sourceAddress = null;
      destinationAddress = null;
      sourceAddressHex = source.toString("hex");
      destinationAddressHex = destination.toString("hex");
      sourcePort = parsePort(address, 32);
      destinationPort = parsePort(address, 34);
    }

    const sourceKey = sourceIdentity(family, sourceAddressHex);
    return Object.freeze({
      ok: true,
      status: "PROXY_V2_SOURCE_BOUND_NOT_TRUSTED",
      marker: VOID_AGENT_CREDENTIAL_REQUEST_PROXY_V2_SOURCE_IDENTITY_V1,
      version: 1,
      family,
      source_address: sourceAddress,
      source_address_hex: sourceAddressHex,
      source_port: sourcePort,
      destination_address: destinationAddress,
      destination_address_hex: destinationAddressHex,
      destination_port: destinationPort,
      limiter_source_key: sourceKey,
      consumed_bytes: totalHeaderBytes,
      tlv_bytes: payloadBytes - addressBytes,
      source_port_in_limiter_identity: false,
      spoofable_forwarding_headers_trusted: false,
      local_transport_trust_proven: false,
      runtime_integration: false,
      funds_movement: false,
      authority:
        VOID_AGENT_CREDENTIAL_REQUEST_PROXY_V2_SOURCE_IDENTITY_AUTHORITY_V1,
    });
  } catch (error) {
    return held(error instanceof Error ? error.message : String(error));
  }
}

function normalizeHeaderValue(value) {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && value.every((item) => typeof item === "string")) {
    return value.join(", ");
  }
  fail("proxy_v2_http_header_value_invalid");
}

export function sanitizeVoidAgentCredentialRequestProxyV2HeadersV1(
  headers,
  parsedSource,
) {
  try {
    if (
      !parsedSource ||
      parsedSource.ok !== true ||
      parsedSource.marker !==
        VOID_AGENT_CREDENTIAL_REQUEST_PROXY_V2_SOURCE_IDENTITY_V1 ||
      !SOURCE_KEY.test(String(parsedSource.limiter_source_key || ""))
    ) {
      fail("proxy_v2_trusted_source_invalid");
    }
    if (!headers || typeof headers !== "object" || Array.isArray(headers)) {
      fail("proxy_v2_http_headers_invalid");
    }

    const entries = Object.entries(headers);
    if (entries.length > MAX_HEADER_COUNT) {
      fail("proxy_v2_http_header_count_exceeded");
    }

    const out = Object.create(null);
    const removed = new Set();
    for (const [rawName, rawValue] of entries) {
      const name = String(rawName).trim().toLowerCase();
      if (
        !name ||
        Buffer.byteLength(name, "utf8") > MAX_HEADER_NAME_BYTES ||
        !HTTP_HEADER_NAME.test(name)
      ) {
        fail("proxy_v2_http_header_name_invalid");
      }
      const value = normalizeHeaderValue(rawValue);
      if (Buffer.byteLength(value, "utf8") > MAX_HEADER_VALUE_BYTES) {
        fail("proxy_v2_http_header_value_too_large");
      }
      if (SPOOFABLE_HEADERS.has(name)) {
        removed.add(name);
        continue;
      }
      if (Object.prototype.hasOwnProperty.call(out, name)) {
        fail("proxy_v2_http_header_case_collision");
      }
      out[name] = value;
    }

    out[VOID_AGENT_CREDENTIAL_REQUEST_TRUSTED_SOURCE_HEADER_V1] =
      parsedSource.limiter_source_key;

    return Object.freeze({
      ok: true,
      status: "HEADERS_SANITIZED_NOT_TRUSTED",
      marker: VOID_AGENT_CREDENTIAL_REQUEST_PROXY_V2_SOURCE_IDENTITY_V1,
      version: 1,
      headers: Object.freeze({ ...out }),
      removed_spoofable_headers: Object.freeze([...removed].sort()),
      trusted_source_header:
        VOID_AGENT_CREDENTIAL_REQUEST_TRUSTED_SOURCE_HEADER_V1,
      trusted_source_value: parsedSource.limiter_source_key,
      local_transport_trust_proven: false,
      runtime_integration: false,
      authority:
        VOID_AGENT_CREDENTIAL_REQUEST_PROXY_V2_SOURCE_IDENTITY_AUTHORITY_V1,
    });
  } catch (error) {
    return held(error instanceof Error ? error.message : String(error));
  }
}

function safeInteger(value, min, max, code) {
  if (
    !Number.isSafeInteger(value) ||
    value < min ||
    value > max
  ) {
    fail(code);
  }
  return value;
}

export function planVoidAgentCredentialRequestProxyV2RateLimitV1(input) {
  try {
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      fail("proxy_v2_rate_input_invalid");
    }
    const sourceKey = String(input.source_key || "").trim();
    if (!SOURCE_KEY.test(sourceKey)) {
      fail("proxy_v2_rate_source_key_invalid");
    }
    const nowMs = safeInteger(
      input.now_ms,
      0,
      Number.MAX_SAFE_INTEGER,
      "proxy_v2_rate_now_invalid",
    );
    const windowMs = safeInteger(
      input.window_ms,
      1_000,
      3_600_000,
      "proxy_v2_rate_window_invalid",
    );
    const maxRequests = safeInteger(
      input.max_requests_per_source,
      1,
      1000,
      "proxy_v2_rate_max_requests_invalid",
    );
    if (!Array.isArray(input.prior_events)) {
      fail("proxy_v2_rate_prior_events_invalid");
    }
    if (input.prior_events.length > MAX_RATE_EVENTS) {
      fail("proxy_v2_rate_prior_events_exceeded");
    }

    const floor = Math.max(0, nowMs - windowMs + 1);
    const retained = [];
    for (const event of input.prior_events) {
      if (
        !event ||
        typeof event !== "object" ||
        Array.isArray(event)
      ) {
        fail("proxy_v2_rate_event_invalid");
      }
      const eventSource = String(event.source_key || "").trim();
      if (!SOURCE_KEY.test(eventSource)) {
        fail("proxy_v2_rate_event_source_invalid");
      }
      const atMs = safeInteger(
        event.at_ms,
        0,
        nowMs,
        "proxy_v2_rate_event_time_invalid",
      );
      if (atMs >= floor) {
        retained.push(
          Object.freeze({
            source_key: eventSource,
            at_ms: atMs,
          }),
        );
      }
    }

    const sourceCount = retained.reduce(
      (count, event) =>
        count + (event.source_key === sourceKey ? 1 : 0),
      0,
    );
    if (sourceCount >= maxRequests) {
      return Object.freeze({
        ok: false,
        status: "RATE_LIMITED",
        marker: VOID_AGENT_CREDENTIAL_REQUEST_PROXY_V2_SOURCE_IDENTITY_V1,
        version: 1,
        reason: "credential_request_proxy_source_rate_limited",
        source_key: sourceKey,
        source_request_count: sourceCount,
        max_requests_per_source: maxRequests,
        window_ms: windowMs,
        next_events: Object.freeze(retained),
        local_transport_trust_proven: false,
        runtime_integration: false,
        authority:
          VOID_AGENT_CREDENTIAL_REQUEST_PROXY_V2_SOURCE_IDENTITY_AUTHORITY_V1,
      });
    }

    const nextEvents = [
      ...retained,
      Object.freeze({
        source_key: sourceKey,
        at_ms: nowMs,
      }),
    ];
    if (nextEvents.length > MAX_RATE_EVENTS) {
      fail("proxy_v2_rate_event_capacity_exceeded");
    }

    return Object.freeze({
      ok: true,
      status: "SOURCE_RATE_ALLOWED_NOT_MOUNTED",
      marker: VOID_AGENT_CREDENTIAL_REQUEST_PROXY_V2_SOURCE_IDENTITY_V1,
      version: 1,
      source_key: sourceKey,
      source_request_count_before: sourceCount,
      source_request_count_after: sourceCount + 1,
      max_requests_per_source: maxRequests,
      window_ms: windowMs,
      next_events: Object.freeze(nextEvents),
      local_transport_trust_proven: false,
      runtime_integration: false,
      authority:
        VOID_AGENT_CREDENTIAL_REQUEST_PROXY_V2_SOURCE_IDENTITY_AUTHORITY_V1,
    });
  } catch (error) {
    return held(error instanceof Error ? error.message : String(error));
  }
}
