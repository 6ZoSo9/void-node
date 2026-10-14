#!/usr/bin/env node

import {
  VOID_AGENT_CREDENTIAL_REQUEST_PROXY_V2_EDGE_COMPOSITION_V1,
  classifyVoidAgentCredentialRequestProxyV2EdgeCompositionV1,
} from "./void-agent-paid-work-credential-request-proxy-v2-edge-composition-v1.mjs";

export const VOID_PUBLIC_EARN_PROXY_V2_EDGE_CONTRACT_V1 =
  "VOID_PUBLIC_EARN_PROXY_V2_EDGE_CONTRACT_V1";

export const VOID_PUBLIC_EARN_CLAIM_PATH_V1 =
  "/wc/public-earning-pilot-v1/claim-ticket";
export const VOID_PUBLIC_EARN_SUBMIT_PATH_V1 =
  "/wc/public-earning-pilot-v1/submit-result";
export const VOID_PUBLIC_EARN_RATE_WINDOW_MS_V1 = 60_000;
export const VOID_PUBLIC_EARN_CLAIM_RATE_LIMIT_V1 = 6;
export const VOID_PUBLIC_EARN_SUBMIT_RATE_LIMIT_V1 = 30;

export const VOID_PUBLIC_EARN_PROXY_V2_EDGE_CONTRACT_AUTHORITY_V1 =
  Object.freeze({
    source_contract: true,
    credential_proxy_v2_edge_composition_reused: true,
    proxy_v2_source_required: true,
    public_tls_destination_port_bound: true,
    exact_claim_submit_routes_only: true,
    claim_submit_separate_rate_buckets: true,
    source_port_excluded_from_limiter_identity: true,
    spoofable_forwarding_headers_trusted: false,
    source_identity_forwarded_downstream: false,
    self_issued_executor_identity_used_for_rate_authority: false,
    bearer_capability_used_for_rate_authority: false,
    route_body_capability_checks_modified: false,
    existing_inner_adapter_limiter_modified: false,
    inner_adapter_limiter_remains_secondary: true,
    generic_mutation_route_authorized: false,
    rate_state_custody_proven: false,
    concurrent_rate_state_serialization_proven: false,
    http_parser_stream_binding_proven: false,
    connector_process_identity_proven: false,
    local_transport_trust_proven: false,
    tailscale_funnel_configuration_verified: false,
    listener_created: false,
    systemd_mutation: false,
    network_mutation: false,
    runtime_integration: false,
    paid_work_dispatch: false,
    work_credit_write: false,
    credential_issuance: false,
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
    rotation_resistant_fairness_proven: false,
    nat_independent_participant_isolation_proven: false,
    source_address_stability_proven: false,
  });

const SOURCE_KEY = /^voidcrsrc1_[0-9a-f]{64}$/u;
const MAX_RATE_EVENTS = 4096;

function fail(code) {
  throw new Error(code);
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

function held(reason) {
  return Object.freeze({
    ok: false,
    status: "HOLD",
    marker: VOID_PUBLIC_EARN_PROXY_V2_EDGE_CONTRACT_V1,
    version: 1,
    reason,
    rate_event_state_mutation_required: false,
    rate_state_custody_proven: false,
    concurrent_rate_state_serialization_proven: false,
    http_parser_stream_binding_proven: false,
    connector_process_identity_proven: false,
    local_transport_trust_proven: false,
    tailscale_funnel_configuration_verified: false,
    listener_created: false,
    runtime_integration: false,
    work_credit_write: false,
    public_presale_activation: false,
    funds_movement: false,
    authority:
      VOID_PUBLIC_EARN_PROXY_V2_EDGE_CONTRACT_AUTHORITY_V1,
  });
}

function routeDefinition(route) {
  if (route === "claim") {
    return Object.freeze({
      route,
      path: VOID_PUBLIC_EARN_CLAIM_PATH_V1,
      max_requests_per_source:
        VOID_PUBLIC_EARN_CLAIM_RATE_LIMIT_V1,
    });
  }
  if (route === "submit") {
    return Object.freeze({
      route,
      path: VOID_PUBLIC_EARN_SUBMIT_PATH_V1,
      max_requests_per_source:
        VOID_PUBLIC_EARN_SUBMIT_RATE_LIMIT_V1,
    });
  }
  fail("public_earn_rate_route_invalid");
}

function planRate({
  sourceKey,
  route,
  nowMs,
  priorEvents,
}) {
  if (!SOURCE_KEY.test(sourceKey)) {
    fail("public_earn_rate_source_invalid");
  }
  const definition = routeDefinition(route);
  const now = safeInteger(
    nowMs,
    0,
    Number.MAX_SAFE_INTEGER,
    "public_earn_rate_now_invalid",
  );
  if (!Array.isArray(priorEvents)) {
    fail("public_earn_rate_prior_events_invalid");
  }
  if (priorEvents.length > MAX_RATE_EVENTS) {
    fail("public_earn_rate_prior_events_exceeded");
  }

  const floor = Math.max(
    0,
    now - VOID_PUBLIC_EARN_RATE_WINDOW_MS_V1 + 1,
  );
  const retained = [];
  let sourceCount = 0;

  for (const event of priorEvents) {
    if (
      !event ||
      typeof event !== "object" ||
      Array.isArray(event)
    ) {
      fail("public_earn_rate_event_invalid");
    }
    const eventSource = String(event.source_key || "").trim();
    const eventRoute = String(event.route || "").trim();
    if (!SOURCE_KEY.test(eventSource)) {
      fail("public_earn_rate_event_source_invalid");
    }
    if (eventRoute !== "claim" && eventRoute !== "submit") {
      fail("public_earn_rate_event_route_invalid");
    }
    const atMs = safeInteger(
      event.at_ms,
      0,
      now,
      "public_earn_rate_event_time_invalid",
    );
    if (atMs >= floor) {
      const kept = Object.freeze({
        source_key: eventSource,
        route: eventRoute,
        at_ms: atMs,
      });
      retained.push(kept);
      if (
        eventSource === sourceKey &&
        eventRoute === definition.route
      ) {
        sourceCount += 1;
      }
    }
  }

  if (sourceCount >= definition.max_requests_per_source) {
    return Object.freeze({
      ok: false,
      status: "RATE_LIMITED",
      reason:
        "public_earn_" +
        definition.route +
        "_proxy_source_rate_limited",
      route: definition.route,
      source_key: sourceKey,
      source_request_count: sourceCount,
      max_requests_per_source:
        definition.max_requests_per_source,
      window_ms: VOID_PUBLIC_EARN_RATE_WINDOW_MS_V1,
      next_events: Object.freeze(retained),
    });
  }

  if (retained.length >= MAX_RATE_EVENTS) {
    fail("public_earn_rate_event_capacity_exceeded");
  }
  const nextEvents = [
    ...retained,
    Object.freeze({
      source_key: sourceKey,
      route: definition.route,
      at_ms: now,
    }),
  ];

  return Object.freeze({
    ok: true,
    status: "SOURCE_RATE_ALLOWED_NOT_MOUNTED",
    route: definition.route,
    source_key: sourceKey,
    source_request_count_before: sourceCount,
    source_request_count_after: sourceCount + 1,
    max_requests_per_source:
      definition.max_requests_per_source,
    window_ms: VOID_PUBLIC_EARN_RATE_WINDOW_MS_V1,
    next_events: Object.freeze(nextEvents),
  });
}

function classifyExactEarnRoute(base) {
  const parsed = new URL(
    base.forward_target,
    "http://127.0.0.1",
  );
  const canonicalPath =
    parsed.pathname === VOID_PUBLIC_EARN_CLAIM_PATH_V1 ||
    parsed.pathname === VOID_PUBLIC_EARN_SUBMIT_PATH_V1;

  if (canonicalPath && base.forward_method !== "POST") {
    fail("public_earn_edge_post_required");
  }
  if (
    canonicalPath &&
    (
      parsed.search !== "" ||
      base.forward_target !== parsed.pathname
    )
  ) {
    fail("public_earn_edge_target_noncanonical");
  }
  if (
    base.forward_method === "POST" &&
    base.forward_target === VOID_PUBLIC_EARN_CLAIM_PATH_V1
  ) {
    return "claim";
  }
  if (
    base.forward_method === "POST" &&
    base.forward_target === VOID_PUBLIC_EARN_SUBMIT_PATH_V1
  ) {
    return "submit";
  }
  fail("public_earn_edge_route_not_allowed");
}

export function classifyVoidPublicEarnProxyV2EdgeContractV1(input) {
  try {
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      fail("public_earn_edge_input_invalid");
    }

    const base =
      classifyVoidAgentCredentialRequestProxyV2EdgeCompositionV1({
        connection_prefix: input.connection_prefix,
        headers: input.headers,
      });
    if (base.ok !== true) {
      fail("public_earn_edge_parent_" + String(base.reason || "hold"));
    }
    if (
      base.marker !==
        VOID_AGENT_CREDENTIAL_REQUEST_PROXY_V2_EDGE_COMPOSITION_V1 ||
      base.source_identity_forwarded_to_gateway !== false ||
      base.local_transport_trust_proven !== false ||
      base.http_parser_stream_binding_proven !== false
    ) {
      fail("public_earn_edge_parent_contract_invalid");
    }

    const route = classifyExactEarnRoute(base);
    const rate = planRate({
      sourceKey: base.edge_limiter_source_key,
      route,
      nowMs: input.now_ms,
      priorEvents: input.prior_events,
    });

    const common = {
      marker: VOID_PUBLIC_EARN_PROXY_V2_EDGE_CONTRACT_V1,
      version: 1,
      parent_marker:
        VOID_AGENT_CREDENTIAL_REQUEST_PROXY_V2_EDGE_COMPOSITION_V1,
      route,
      forward_method: base.forward_method,
      forward_target: base.forward_target,
      sanitized_headers: base.sanitized_headers,
      removed_spoofable_headers:
        base.removed_spoofable_headers,
      edge_limiter_source_key:
        base.edge_limiter_source_key,
      source_identity_forwarded_downstream: false,
      route_body_capability_checks_modified: false,
      existing_inner_adapter_limiter_modified: false,
      inner_adapter_limiter_remains_secondary: true,
      self_issued_executor_identity_used_for_rate_authority: false,
      bearer_capability_used_for_rate_authority: false,
      generic_mutation_route_authorized: false,
      rate_state_custody_proven: false,
      concurrent_rate_state_serialization_proven: false,
      http_parser_stream_binding_proven: false,
      connector_process_identity_proven: false,
      local_transport_trust_proven: false,
      tailscale_funnel_configuration_verified: false,
      listener_created: false,
      runtime_integration: false,
      work_credit_write: false,
      public_presale_activation: false,
      funds_movement: false,
      rotation_resistant_fairness_proven: false,
      nat_independent_participant_isolation_proven: false,
      source_address_stability_proven: false,
      authority:
        VOID_PUBLIC_EARN_PROXY_V2_EDGE_CONTRACT_AUTHORITY_V1,
    };

    if (rate.ok !== true) {
      return Object.freeze({
        ok: false,
        status: "RATE_LIMITED",
        ...common,
        reason: rate.reason,
        rate_event_state_mutation_required: false,
        source_request_count:
          rate.source_request_count,
        max_requests_per_source:
          rate.max_requests_per_source,
        window_ms: rate.window_ms,
        next_rate_events: rate.next_events,
      });
    }

    return Object.freeze({
      ok: true,
      status: "PUBLIC_EARN_SOURCE_RATE_ALLOWED_NOT_MOUNTED",
      ...common,
      rate_event_state_mutation_required: true,
      source_request_count_before:
        rate.source_request_count_before,
      source_request_count_after:
        rate.source_request_count_after,
      max_requests_per_source:
        rate.max_requests_per_source,
      window_ms: rate.window_ms,
      next_rate_events: rate.next_events,
    });
  } catch (error) {
    return held(
      error instanceof Error ? error.message : String(error),
    );
  }
}
