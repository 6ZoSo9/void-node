#!/usr/bin/env node

import {
  VOID_AGENT_CREDENTIAL_REQUEST_PATH_V1,
} from "./void-agent-paid-work-credential-request-proxy-v2-edge-composition-v1.mjs";
import {
  parseVoidAgentCredentialRequestProxyV2SourceV1,
} from "./void-agent-paid-work-credential-request-proxy-v2-source-v1.mjs";
import {
  VOID_PUBLIC_EARN_CLAIM_PATH_V1,
  VOID_PUBLIC_EARN_SUBMIT_PATH_V1,
} from "./void-public-earn-proxy-v2-edge-contract-v1.mjs";

export const VOID_PUBLIC_443_PROXY_V2_DISPATCH_V1 =
  "VOID_PUBLIC_443_PROXY_V2_DISPATCH_V1";

export const VOID_PUBLIC_443_PROXY_V2_DISPATCH_AUTHORITY_V1 =
  Object.freeze({
    source_contract: true,
    one_public_443_owner_required: true,
    strict_proxy_v2_source_required: true,
    public_tls_destination_port_bound: true,
    exact_credential_route_only: true,
    exact_earn_claim_submit_routes_only: true,
    ordinary_public_frontdoor_passthrough: true,
    sensitive_proxy_preface_preserved: true,
    frontdoor_proxy_preface_stripped: true,
    source_identity_forwarded_as_http_header: false,
    forwarding_headers_trusted_for_dispatch: false,
    generic_sensitive_mutation_route_authorized: false,
    connector_process_identity_proven: false,
    downstream_listener_ownership_proven: false,
    exclusive_reachability_proven: false,
    nftables_policy_proven: false,
    tailscale_funnel_configuration_verified: false,
    runtime_integration: false,
    work_credit_write: false,
    credential_issuance: false,
    wallet_or_signer_access: false,
    transaction_broadcast: false,
    public_presale_activation: false,
    funds_movement: false,
  });

export const VOID_PUBLIC_443_DISPATCH_CREDENTIAL_V1 = "credential";
export const VOID_PUBLIC_443_DISPATCH_EARN_V1 = "earn";
export const VOID_PUBLIC_443_DISPATCH_FRONTDOOR_V1 = "frontdoor";

const MAX_HTTP_REQUEST_LINE_BYTES = 8 * 1024;
const HTTP_METHOD = /^[A-Z]{3,16}$/u;

function held(reason) {
  return Object.freeze({
    ok: false,
    status: "HOLD",
    marker: VOID_PUBLIC_443_PROXY_V2_DISPATCH_V1,
    version: 1,
    reason,
    runtime_integration: false,
    authority: VOID_PUBLIC_443_PROXY_V2_DISPATCH_AUTHORITY_V1,
  });
}

function fail(code) {
  throw new Error(code);
}

function parseRequestLine(buffer, offset) {
  if (!Buffer.isBuffer(buffer)) {
    fail("dispatch_connection_prefix_must_be_buffer");
  }
  if (
    !Number.isSafeInteger(offset) ||
    offset < 0 ||
    offset > buffer.length
  ) {
    fail("dispatch_http_offset_invalid");
  }

  const maximumEnd = Math.min(
    buffer.length,
    offset + MAX_HTTP_REQUEST_LINE_BYTES + 2,
  );
  const view = buffer.subarray(offset, maximumEnd);
  const lineEnd = view.indexOf("\r\n", 0, "ascii");
  if (lineEnd < 0) {
    if (view.length >= MAX_HTTP_REQUEST_LINE_BYTES + 2) {
      fail("dispatch_http_request_line_too_large");
    }
    fail("dispatch_http_request_line_incomplete");
  }
  if (lineEnd < 1 || lineEnd > MAX_HTTP_REQUEST_LINE_BYTES) {
    fail("dispatch_http_request_line_invalid");
  }

  const rawLine = view.subarray(0, lineEnd);
  if ([...rawLine].some((byte) => byte < 0x20 || byte > 0x7e)) {
    fail("dispatch_http_request_line_invalid");
  }
  const line = rawLine.toString("ascii");
  const parts = line.split(" ");
  if (parts.length !== 3) {
    fail("dispatch_http_request_line_invalid");
  }
  const [method, target, version] = parts;
  if (!HTTP_METHOD.test(method)) {
    fail("dispatch_http_method_invalid");
  }
  if (
    !target.startsWith("/") ||
    target.startsWith("//") ||
    target.includes("#") ||
    target.length > 4096
  ) {
    fail("dispatch_http_target_invalid");
  }
  if (version !== "HTTP/1.1" && version !== "HTTP/1.0") {
    fail("dispatch_http_version_invalid");
  }

  const parsed = new URL(target, "http://127.0.0.1");
  if (parsed.origin !== "http://127.0.0.1") {
    fail("dispatch_http_target_invalid");
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

function sensitiveRouteForPath(pathname) {
  if (pathname === VOID_AGENT_CREDENTIAL_REQUEST_PATH_V1) {
    return VOID_PUBLIC_443_DISPATCH_CREDENTIAL_V1;
  }
  if (
    pathname === VOID_PUBLIC_EARN_CLAIM_PATH_V1 ||
    pathname === VOID_PUBLIC_EARN_SUBMIT_PATH_V1
  ) {
    return VOID_PUBLIC_443_DISPATCH_EARN_V1;
  }
  return null;
}

function classifyRoute(requestLine) {
  const normalizedSensitive =
    sensitiveRouteForPath(requestLine.pathname);
  const sensitiveTrailingSlash = [
    VOID_AGENT_CREDENTIAL_REQUEST_PATH_V1,
    VOID_PUBLIC_EARN_CLAIM_PATH_V1,
    VOID_PUBLIC_EARN_SUBMIT_PATH_V1,
  ].some((candidate) =>
    requestLine.pathname.startsWith(candidate + "/"),
  );

  if (sensitiveTrailingSlash) {
    fail("dispatch_sensitive_target_noncanonical");
  }

  if (normalizedSensitive !== null) {
    if (requestLine.method !== "POST") {
      fail("dispatch_sensitive_post_required");
    }
    if (
      requestLine.search !== "" ||
      requestLine.target !== requestLine.pathname
    ) {
      fail("dispatch_sensitive_target_noncanonical");
    }

    const exactSensitive =
      sensitiveRouteForPath(requestLine.target);
    if (exactSensitive !== normalizedSensitive) {
      fail("dispatch_sensitive_target_noncanonical");
    }
    return normalizedSensitive;
  }

  return VOID_PUBLIC_443_DISPATCH_FRONTDOOR_V1;
}

export function classifyVoidPublic443ProxyV2DispatchV1(input) {
  try {
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      fail("dispatch_input_invalid");
    }
    if (!Buffer.isBuffer(input.connection_prefix)) {
      fail("dispatch_connection_prefix_must_be_buffer");
    }

    const parsedSource =
      parseVoidAgentCredentialRequestProxyV2SourceV1(
        input.connection_prefix,
      );
    if (parsedSource.ok !== true) {
      fail("dispatch_" + String(parsedSource.reason || "proxy_v2_invalid"));
    }
    if (parsedSource.destination_port !== 443) {
      fail("dispatch_proxy_destination_port_invalid");
    }

    const requestLine = parseRequestLine(
      input.connection_prefix,
      parsedSource.consumed_bytes,
    );
    const route = classifyRoute(requestLine);
    const sensitive =
      route !== VOID_PUBLIC_443_DISPATCH_FRONTDOOR_V1;

    return Object.freeze({
      ok: true,
      status: sensitive
        ? "SENSITIVE_ROUTE_CLASSIFIED_NOT_LIVE"
        : "FRONTDOOR_ROUTE_CLASSIFIED_NOT_LIVE",
      marker: VOID_PUBLIC_443_PROXY_V2_DISPATCH_V1,
      version: 1,
      dispatch_target: route,
      forward_method: requestLine.method,
      forward_target: requestLine.target,
      proxy_consumed_bytes: parsedSource.consumed_bytes,
      http_request_line_bytes: requestLine.request_line_bytes,
      limiter_source_key: parsedSource.limiter_source_key,
      preserve_proxy_preface: sensitive,
      strip_proxy_preface: !sensitive,
      source_identity_forwarded_as_http_header: false,
      forwarding_headers_trusted_for_dispatch: false,
      public_tls_destination_port_bound: true,
      connector_process_identity_proven: false,
      downstream_listener_ownership_proven: false,
      exclusive_reachability_proven: false,
      nftables_policy_proven: false,
      tailscale_funnel_configuration_verified: false,
      runtime_integration: false,
      work_credit_write: false,
      funds_movement: false,
      authority: VOID_PUBLIC_443_PROXY_V2_DISPATCH_AUTHORITY_V1,
    });
  } catch (error) {
    return held(
      error instanceof Error ? error.message : String(error),
    );
  }
}
