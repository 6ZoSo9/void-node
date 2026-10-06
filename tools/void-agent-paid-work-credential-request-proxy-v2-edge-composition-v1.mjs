#!/usr/bin/env node

import {
  VOID_AGENT_CREDENTIAL_REQUEST_PROXY_V2_SOURCE_IDENTITY_V1,
  parseVoidAgentCredentialRequestProxyV2SourceV1,
  planVoidAgentCredentialRequestProxyV2RateLimitV1,
  sanitizeVoidAgentCredentialRequestProxyV2HeadersV1,
} from "./void-agent-paid-work-credential-request-proxy-v2-source-v1.mjs";

export const VOID_AGENT_CREDENTIAL_REQUEST_PROXY_V2_EDGE_COMPOSITION_V1 =
  "VOID_AGENT_CREDENTIAL_REQUEST_PROXY_V2_EDGE_COMPOSITION_V1";

export const VOID_AGENT_CREDENTIAL_REQUEST_PROXY_V2_EDGE_COMPOSITION_AUTHORITY_V1 =
  Object.freeze({
    source_contract: true,
    proxy_v2_source_required: true,
    proxy_v2_source_contract_reused: true,
    http_request_line_bound: true,
    all_forwarded_headers_sanitized: true,
    credential_route_source_rate_planning: true,
    noncredential_route_passthrough: true,
    credential_route_limits_bound: true,
    source_identity_forwarded_to_gateway: false,
    upstream_loopback_limiter_modified: false,
    rotation_resistant_fairness_proven: false,
    nat_independent_participant_isolation_proven: false,
    source_address_stability_proven: false,
    local_transport_trust_proven: false,
    tailscale_funnel_configuration_verified: false,
    listener_created: false,
    public_gateway_modified: false,
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

export const VOID_AGENT_CREDENTIAL_REQUEST_PATH_V1 =
  "/__void/agents/paid-work/credential-requests/v1";
export const VOID_AGENT_CREDENTIAL_REQUEST_MAX_BODY_BYTES_V1 = 64 * 1024;
export const VOID_AGENT_CREDENTIAL_REQUEST_TIMEOUT_MS_V1 = 15_000;
export const VOID_AGENT_CREDENTIAL_REQUEST_MAX_RESPONSE_BYTES_V1 =
  4 * 1024 * 1024;

const MAX_HTTP_REQUEST_LINE_BYTES = 8 * 1024;
const HTTP_METHOD = /^[A-Z]{3,16}$/u;
const HTTP_REQUEST_LINE = /^[\x20-\x7e]+$/u;

function held(reason) {
  return Object.freeze({
    ok: false,
    status: "HOLD",
    marker: VOID_AGENT_CREDENTIAL_REQUEST_PROXY_V2_EDGE_COMPOSITION_V1,
    version: 1,
    reason,
    local_transport_trust_proven: false,
    rotation_resistant_fairness_proven: false,
    runtime_integration: false,
    funds_movement: false,
    authority:
      VOID_AGENT_CREDENTIAL_REQUEST_PROXY_V2_EDGE_COMPOSITION_AUTHORITY_V1,
  });
}

function parseHttpRequestLine(connectionPrefix, offset) {
  if (!Buffer.isBuffer(connectionPrefix)) {
    throw new Error("edge_connection_prefix_must_be_buffer");
  }
  if (!Number.isSafeInteger(offset) || offset < 0 || offset > connectionPrefix.length) {
    throw new Error("edge_http_offset_invalid");
  }
  const maximumEnd = Math.min(
    connectionPrefix.length,
    offset + MAX_HTTP_REQUEST_LINE_BYTES + 2,
  );
  const view = connectionPrefix.subarray(offset, maximumEnd);
  const lineEnd = view.indexOf("\r\n", 0, "ascii");
  if (lineEnd < 0) {
    throw new Error("edge_http_request_line_incomplete");
  }
  if (lineEnd < 1 || lineEnd > MAX_HTTP_REQUEST_LINE_BYTES) {
    throw new Error("edge_http_request_line_invalid");
  }
  const line = view.subarray(0, lineEnd).toString("ascii");
  if (!HTTP_REQUEST_LINE.test(line)) {
    throw new Error("edge_http_request_line_invalid");
  }
  const parts = line.split(" ");
  if (parts.length !== 3) {
    throw new Error("edge_http_request_line_invalid");
  }
  const [method, target, version] = parts;
  if (!HTTP_METHOD.test(method)) {
    throw new Error("edge_http_method_invalid");
  }
  if (
    !target.startsWith("/") ||
    target.startsWith("//") ||
    target.includes("#") ||
    target.length > 4096
  ) {
    throw new Error("edge_http_target_invalid");
  }
  if (version !== "HTTP/1.1" && version !== "HTTP/1.0") {
    throw new Error("edge_http_version_invalid");
  }
  const parsed = new URL(target, "http://127.0.0.1");
  if (parsed.origin !== "http://127.0.0.1") {
    throw new Error("edge_http_target_invalid");
  }
  return Object.freeze({
    method,
    target,
    pathname: parsed.pathname,
    search: parsed.search,
    http_version: version.slice(5),
    request_line_bytes: lineEnd + 2,
  });
}

function baseSuccess(parsedSource, sanitized, requestLine) {
  return {
    marker: VOID_AGENT_CREDENTIAL_REQUEST_PROXY_V2_EDGE_COMPOSITION_V1,
    version: 1,
    proxy_source_marker:
      VOID_AGENT_CREDENTIAL_REQUEST_PROXY_V2_SOURCE_IDENTITY_V1,
    proxy_consumed_bytes: parsedSource.consumed_bytes,
    http_request_line_bytes: requestLine.request_line_bytes,
    forward_method: requestLine.method,
    forward_target: requestLine.target,
    sanitized_headers: sanitized.headers,
    removed_spoofable_headers: sanitized.removed_spoofable_headers,
    edge_limiter_source_key: sanitized.limiter_source_key,
    source_identity_forwarded_to_gateway: false,
    credential_route_limits: Object.freeze({
      max_body_bytes: VOID_AGENT_CREDENTIAL_REQUEST_MAX_BODY_BYTES_V1,
      upstream_timeout_ms: VOID_AGENT_CREDENTIAL_REQUEST_TIMEOUT_MS_V1,
      max_response_bytes:
        VOID_AGENT_CREDENTIAL_REQUEST_MAX_RESPONSE_BYTES_V1,
    }),
    upstream_loopback_limiter_modified: false,
    local_transport_trust_proven: false,
    tailscale_funnel_configuration_verified: false,
    rotation_resistant_fairness_proven: false,
    nat_independent_participant_isolation_proven: false,
    source_address_stability_proven: false,
    runtime_integration: false,
    funds_movement: false,
    authority:
      VOID_AGENT_CREDENTIAL_REQUEST_PROXY_V2_EDGE_COMPOSITION_AUTHORITY_V1,
  };
}

export function classifyVoidAgentCredentialRequestProxyV2EdgeCompositionV1(
  input,
) {
  try {
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      throw new Error("edge_input_invalid");
    }
    if (!Buffer.isBuffer(input.connection_prefix)) {
      throw new Error("edge_connection_prefix_must_be_buffer");
    }

    const parsedSource = parseVoidAgentCredentialRequestProxyV2SourceV1(
      input.connection_prefix,
    );
    if (parsedSource.ok !== true) {
      throw new Error("edge_" + parsedSource.reason);
    }
    const requestLine = parseHttpRequestLine(
      input.connection_prefix,
      parsedSource.consumed_bytes,
    );
    const sanitized = sanitizeVoidAgentCredentialRequestProxyV2HeadersV1(
      input.headers,
      parsedSource,
    );
    if (sanitized.ok !== true) {
      throw new Error("edge_" + sanitized.reason);
    }

    const base = baseSuccess(parsedSource, sanitized, requestLine);
    const credentialPost =
      requestLine.method === "POST" &&
      requestLine.target === VOID_AGENT_CREDENTIAL_REQUEST_PATH_V1;

    if (!credentialPost) {
      return Object.freeze({
        ok: true,
        status: "FORWARD_SANITIZED_NOT_TRUSTED",
        ...base,
        credential_source_rate_applied: false,
        rate_event_state_mutation_required: false,
        next_rate_events: null,
      });
    }

    const rate = planVoidAgentCredentialRequestProxyV2RateLimitV1({
      parsed_source: parsedSource,
      now_ms: input.now_ms,
      window_ms: input.window_ms,
      max_requests_per_source: input.max_requests_per_source,
      prior_events: input.prior_events,
    });
    if (rate.ok !== true) {
      return Object.freeze({
        ok: false,
        status: rate.status === "RATE_LIMITED" ? "RATE_LIMITED" : "HOLD",
        ...base,
        reason: rate.reason,
        credential_source_rate_applied: true,
        rate_event_state_mutation_required: false,
        next_rate_events: rate.next_events ?? null,
      });
    }

    return Object.freeze({
      ok: true,
      status: "CREDENTIAL_SOURCE_RATE_ALLOWED_NOT_TRUSTED",
      ...base,
      credential_source_rate_applied: true,
      rate_event_state_mutation_required: true,
      next_rate_events: rate.next_events,
      source_request_count_before: rate.source_request_count_before,
      source_request_count_after: rate.source_request_count_after,
      max_requests_per_source: rate.max_requests_per_source,
      window_ms: rate.window_ms,
    });
  } catch (error) {
    return held(error instanceof Error ? error.message : String(error));
  }
}
