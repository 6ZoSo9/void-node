// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025-2026 6ZoSo9

export const VOID_P2P_UDP_SWARM_DIRECT_ROUTE_HEALTH_POLICY_VERSION_V1 = 1;

export const VOID_P2P_UDP_SWARM_DIRECT_ROUTE_HEALTH_MIN_WINDOW_MS_V1 = 30_000;
export const VOID_P2P_UDP_SWARM_DIRECT_ROUTE_HEALTH_MIN_CONSECUTIVE_ROUND_TRIPS_V1 = 5;
export const VOID_P2P_UDP_SWARM_DIRECT_ROUTE_HEALTH_MAX_LAST_SUCCESS_AGE_MS_V1 = 10_000;

export const VOID_P2P_UDP_SWARM_DIRECT_ROUTE_HEALTH_POLICY_AUTHORITY_V1 =
  Object.freeze({
    reads_promoted_route_health_evidence: true,
    relay_retirement_authorization_may_be_returned: true,
    relay_retirement_performed: false,
    normal_peer_map_mutation_performed: false,
    direct_route_mutation_performed: false,
    relay_socket_mutation_performed: false,
    production_udp_activation_performed: false,
    wallet_signer_validator_wc_money_authority: 0,
  });

const NODE_ID_RE = /^[0-9a-f]{32}$/;
const SAFE_TOKEN_RE = /^[^\s\u0000-\u001f\u007f]{1,128}$/;

export type VoidUdpSwarmDirectRouteHealthPolicyInputV1 = Readonly<{
  session_id: string;
  expected_peer_node_id: string;
  authenticated_peer_node_id: string | null;
  relay_node_id: string;
  relay_stream_id: string;
  direct_route_live: boolean;
  direct_route_transport: "direct" | "relay" | null;
  relay_fallback_live: boolean;
  promoted_at_ms: number;
  now_ms: number;
  consecutive_successful_round_trips: number;
  failed_round_trips_since_promotion: number;
  first_success_at_ms: number | null;
  last_success_at_ms: number | null;
}>;

export type VoidUdpSwarmDirectRouteHealthPolicyReasonV1 =
  | "binding_invalid"
  | "authenticated_identity_missing_or_invalid"
  | "authenticated_identity_mismatch"
  | "promoted_direct_route_not_live"
  | "promoted_route_not_direct"
  | "relay_fallback_not_live"
  | "clock_invalid"
  | "health_window_too_short"
  | "failed_round_trip_observed"
  | "insufficient_consecutive_successes"
  | "first_success_missing_or_invalid"
  | "last_success_missing_or_invalid"
  | "success_window_too_short"
  | "last_success_stale"
  | "relay_retirement_may_be_authorized";

export type VoidUdpSwarmDirectRouteHealthPolicyDecisionV1 = Readonly<{
  version: 1;
  action: "retain_relay" | "authorize_relay_retirement";
  reason: VoidUdpSwarmDirectRouteHealthPolicyReasonV1;
  relay_retirement_authorized: boolean;
  relay_retirement_performed: false;
  normal_peer_map_mutation_performed: false;
  direct_route_mutation_performed: false;
  relay_socket_mutation_performed: false;
}>;

function boundedNonNegativeInteger(raw: unknown): raw is number {
  return typeof raw === "number" && Number.isSafeInteger(raw) && raw >= 0;
}

function decision(
  action: VoidUdpSwarmDirectRouteHealthPolicyDecisionV1["action"],
  reason: VoidUdpSwarmDirectRouteHealthPolicyReasonV1,
): VoidUdpSwarmDirectRouteHealthPolicyDecisionV1 {
  return Object.freeze({
    version: VOID_P2P_UDP_SWARM_DIRECT_ROUTE_HEALTH_POLICY_VERSION_V1,
    action,
    reason,
    relay_retirement_authorized: action === "authorize_relay_retirement",
    relay_retirement_performed: false,
    normal_peer_map_mutation_performed: false,
    direct_route_mutation_performed: false,
    relay_socket_mutation_performed: false,
  });
}

export function evaluateVoidUdpSwarmDirectRouteHealthPolicyV1(
  input: VoidUdpSwarmDirectRouteHealthPolicyInputV1,
): VoidUdpSwarmDirectRouteHealthPolicyDecisionV1 {
  if (
    !SAFE_TOKEN_RE.test(input.session_id) ||
    !NODE_ID_RE.test(input.expected_peer_node_id) ||
    !NODE_ID_RE.test(input.relay_node_id) ||
    !SAFE_TOKEN_RE.test(input.relay_stream_id)
  ) {
    return decision("retain_relay", "binding_invalid");
  }

  if (
    !input.authenticated_peer_node_id ||
    !NODE_ID_RE.test(input.authenticated_peer_node_id)
  ) {
    return decision(
      "retain_relay",
      "authenticated_identity_missing_or_invalid",
    );
  }
  if (input.authenticated_peer_node_id !== input.expected_peer_node_id) {
    return decision("retain_relay", "authenticated_identity_mismatch");
  }

  if (input.direct_route_live !== true) {
    return decision("retain_relay", "promoted_direct_route_not_live");
  }
  if (input.direct_route_transport !== "direct") {
    return decision("retain_relay", "promoted_route_not_direct");
  }
  if (input.relay_fallback_live !== true) {
    return decision("retain_relay", "relay_fallback_not_live");
  }

  if (
    !boundedNonNegativeInteger(input.promoted_at_ms) ||
    !boundedNonNegativeInteger(input.now_ms) ||
    input.now_ms < input.promoted_at_ms
  ) {
    return decision("retain_relay", "clock_invalid");
  }
  if (
    input.now_ms - input.promoted_at_ms <
    VOID_P2P_UDP_SWARM_DIRECT_ROUTE_HEALTH_MIN_WINDOW_MS_V1
  ) {
    return decision("retain_relay", "health_window_too_short");
  }

  if (
    !boundedNonNegativeInteger(input.failed_round_trips_since_promotion) ||
    input.failed_round_trips_since_promotion !== 0
  ) {
    return decision("retain_relay", "failed_round_trip_observed");
  }
  if (
    !boundedNonNegativeInteger(input.consecutive_successful_round_trips) ||
    input.consecutive_successful_round_trips <
      VOID_P2P_UDP_SWARM_DIRECT_ROUTE_HEALTH_MIN_CONSECUTIVE_ROUND_TRIPS_V1
  ) {
    return decision("retain_relay", "insufficient_consecutive_successes");
  }

  if (
    input.first_success_at_ms === null ||
    !boundedNonNegativeInteger(input.first_success_at_ms) ||
    input.first_success_at_ms < input.promoted_at_ms ||
    input.first_success_at_ms > input.now_ms
  ) {
    return decision("retain_relay", "first_success_missing_or_invalid");
  }
  if (
    input.last_success_at_ms === null ||
    !boundedNonNegativeInteger(input.last_success_at_ms) ||
    input.last_success_at_ms < input.first_success_at_ms ||
    input.last_success_at_ms > input.now_ms
  ) {
    return decision("retain_relay", "last_success_missing_or_invalid");
  }
  if (
    input.last_success_at_ms - input.first_success_at_ms <
    VOID_P2P_UDP_SWARM_DIRECT_ROUTE_HEALTH_MIN_WINDOW_MS_V1
  ) {
    return decision("retain_relay", "success_window_too_short");
  }
  if (
    input.now_ms - input.last_success_at_ms >
    VOID_P2P_UDP_SWARM_DIRECT_ROUTE_HEALTH_MAX_LAST_SUCCESS_AGE_MS_V1
  ) {
    return decision("retain_relay", "last_success_stale");
  }

  return decision(
    "authorize_relay_retirement",
    "relay_retirement_may_be_authorized",
  );
}
