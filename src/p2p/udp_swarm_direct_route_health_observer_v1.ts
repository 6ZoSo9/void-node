// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025-2026 6ZoSo9

import {
  evaluateVoidUdpSwarmDirectRouteHealthPolicyV1,
  type VoidUdpSwarmDirectRouteHealthPolicyDecisionV1,
  type VoidUdpSwarmDirectRouteHealthPolicyInputV1,
} from "./udp_swarm_direct_route_health_policy_v1.js";

export const VOID_P2P_UDP_SWARM_DIRECT_ROUTE_HEALTH_OBSERVER_VERSION_V1 = 1;
export const VOID_P2P_UDP_SWARM_DIRECT_ROUTE_HEALTH_OBSERVER_MAX_OBSERVATIONS_V1 =
  1_000_000;
export const VOID_P2P_UDP_SWARM_DIRECT_ROUTE_HEALTH_OBSERVER_MAX_RTT_MS_V1 =
  60_000;
export const VOID_P2P_UDP_SWARM_DIRECT_ROUTE_HEALTH_OBSERVER_MAX_FAILURE_REASON_CHARS_V1 =
  160;

export const VOID_P2P_UDP_SWARM_DIRECT_ROUTE_HEALTH_OBSERVER_AUTHORITY_V1 =
  Object.freeze({
    collects_timestamped_round_trip_observations: true,
    strict_monotonic_observation_time_required: true,
    malformed_observation_poisons_session: true,
    creates_network_probe: false,
    owns_runtime_timer: false,
    reads_or_writes_socket: false,
    node_core_mount_performed: false,
    relay_retirement_performed: false,
    normal_peer_map_mutation_performed: false,
    direct_route_mutation_performed: false,
    relay_socket_mutation_performed: false,
    production_udp_activation_performed: false,
    wallet_signer_validator_wc_money_authority: 0,
  });

const NODE_ID_RE = /^[0-9a-f]{32}$/;
const SAFE_TOKEN_RE = /^[^\s\u0000-\u001f\u007f]{1,128}$/;
const CONTROL_RE = /[\u0000-\u001f\u007f]/;

export type VoidUdpSwarmDirectRouteHealthObserverOptionsV1 = Readonly<{
  sessionId: string;
  expectedPeerNodeId: string;
  relayNodeId: string;
  relayStreamId: string;
  promotedAtMs: number;
}>;

export type VoidUdpSwarmDirectRouteHealthObserverRouteStateV1 = Readonly<{
  authenticated_peer_node_id: string | null;
  direct_route_live: boolean;
  direct_route_transport: "direct" | "relay" | null;
  relay_fallback_live: boolean;
}>;

export type VoidUdpSwarmDirectRouteHealthObserverSnapshotV1 = Readonly<{
  version: 1;
  session_id: string;
  expected_peer_node_id: string;
  relay_node_id: string;
  relay_stream_id: string;
  promoted_at_ms: number;
  accepted_observation_count: number;
  consecutive_successful_round_trips: number;
  failed_round_trips_since_promotion: number;
  first_success_at_ms: number | null;
  last_success_at_ms: number | null;
  last_failure_at_ms: number | null;
  last_observation_at_ms: number | null;
  last_rtt_ms: number | null;
  poisoned: boolean;
  poison_reason: string | null;
  relay_retirement_performed: false;
  normal_peer_map_mutation_performed: false;
  direct_route_mutation_performed: false;
  relay_socket_mutation_performed: false;
}>;

function boundedNonNegativeInteger(raw: unknown): raw is number {
  return typeof raw === "number" && Number.isSafeInteger(raw) && raw >= 0;
}

function requireNodeId(raw: unknown, label: string): string {
  if (typeof raw !== "string" || !NODE_ID_RE.test(raw)) {
    throw new Error(`${label} must be a canonical VOID node id`);
  }
  return raw;
}

function requireToken(raw: unknown, label: string): string {
  if (typeof raw !== "string" || !SAFE_TOKEN_RE.test(raw)) {
    throw new Error(`${label} must be a bounded token`);
  }
  return raw;
}

function validFailureReason(raw: unknown): raw is string {
  return (
    typeof raw === "string" &&
    raw.length >= 1 &&
    raw.length <=
      VOID_P2P_UDP_SWARM_DIRECT_ROUTE_HEALTH_OBSERVER_MAX_FAILURE_REASON_CHARS_V1 &&
    raw === raw.trim() &&
    !CONTROL_RE.test(raw)
  );
}

export class VoidUdpSwarmDirectRouteHealthObserverV1 {
  readonly sessionId: string;
  readonly expectedPeerNodeId: string;
  readonly relayNodeId: string;
  readonly relayStreamId: string;
  readonly promotedAtMs: number;

  private acceptedObservationCount = 0;
  private consecutiveSuccessfulRoundTrips = 0;
  private failedRoundTripsSincePromotion = 0;
  private firstSuccessAtMs: number | null = null;
  private lastSuccessAtMs: number | null = null;
  private lastFailureAtMs: number | null = null;
  private lastObservationAtMs: number | null = null;
  private lastRttMs: number | null = null;
  private poisonedValue = false;
  private poisonReasonValue: string | null = null;

  constructor(options: VoidUdpSwarmDirectRouteHealthObserverOptionsV1) {
    this.sessionId = requireToken(options.sessionId, "sessionId");
    this.expectedPeerNodeId = requireNodeId(
      options.expectedPeerNodeId,
      "expectedPeerNodeId",
    );
    this.relayNodeId = requireNodeId(options.relayNodeId, "relayNodeId");
    this.relayStreamId = requireToken(options.relayStreamId, "relayStreamId");
    if (!boundedNonNegativeInteger(options.promotedAtMs)) {
      throw new Error("promotedAtMs must be a non-negative safe integer");
    }
    this.promotedAtMs = options.promotedAtMs;
  }

  get poisoned(): boolean {
    return this.poisonedValue;
  }

  private poison(reason: string): false {
    this.poisonedValue = true;
    if (this.poisonReasonValue === null) this.poisonReasonValue = reason;
    return false;
  }

  private acceptObservationTime(observedAtMs: unknown): observedAtMs is number {
    if (this.poisonedValue) return false;
    if (!boundedNonNegativeInteger(observedAtMs)) {
      return this.poison("observation timestamp is invalid");
    }
    if (observedAtMs < this.promotedAtMs) {
      return this.poison("observation predates direct-route promotion");
    }
    if (
      this.lastObservationAtMs !== null &&
      observedAtMs <= this.lastObservationAtMs
    ) {
      return this.poison("observation timestamp is not strictly monotonic");
    }
    if (
      this.acceptedObservationCount >=
      VOID_P2P_UDP_SWARM_DIRECT_ROUTE_HEALTH_OBSERVER_MAX_OBSERVATIONS_V1
    ) {
      return this.poison("observation capacity exhausted");
    }
    return true;
  }

  recordSuccessfulRoundTrip(observedAtMs: number, rttMs: number): boolean {
    if (!this.acceptObservationTime(observedAtMs)) return false;
    if (
      !boundedNonNegativeInteger(rttMs) ||
      rttMs > VOID_P2P_UDP_SWARM_DIRECT_ROUTE_HEALTH_OBSERVER_MAX_RTT_MS_V1
    ) {
      return this.poison("round-trip latency is invalid or out of bounds");
    }
    if (
      this.consecutiveSuccessfulRoundTrips >=
      VOID_P2P_UDP_SWARM_DIRECT_ROUTE_HEALTH_OBSERVER_MAX_OBSERVATIONS_V1
    ) {
      return this.poison("successful round-trip counter exhausted");
    }

    this.acceptedObservationCount += 1;
    this.consecutiveSuccessfulRoundTrips += 1;
    this.firstSuccessAtMs ??= observedAtMs;
    this.lastSuccessAtMs = observedAtMs;
    this.lastObservationAtMs = observedAtMs;
    this.lastRttMs = rttMs;
    return true;
  }

  recordFailedRoundTrip(observedAtMs: number, reason: string): boolean {
    if (!this.acceptObservationTime(observedAtMs)) return false;
    if (!validFailureReason(reason)) {
      return this.poison("round-trip failure reason is invalid");
    }
    if (
      this.failedRoundTripsSincePromotion >=
      VOID_P2P_UDP_SWARM_DIRECT_ROUTE_HEALTH_OBSERVER_MAX_OBSERVATIONS_V1
    ) {
      return this.poison("failed round-trip counter exhausted");
    }

    this.acceptedObservationCount += 1;
    this.failedRoundTripsSincePromotion += 1;
    this.consecutiveSuccessfulRoundTrips = 0;
    this.lastFailureAtMs = observedAtMs;
    this.lastObservationAtMs = observedAtMs;
    this.lastRttMs = null;
    return true;
  }

  policyInput(
    routeState: VoidUdpSwarmDirectRouteHealthObserverRouteStateV1,
    nowMs: number,
  ): VoidUdpSwarmDirectRouteHealthPolicyInputV1 {
    const failClosedFailureCount =
      this.poisonedValue && this.failedRoundTripsSincePromotion === 0
        ? 1
        : this.failedRoundTripsSincePromotion;

    return Object.freeze({
      session_id: this.sessionId,
      expected_peer_node_id: this.expectedPeerNodeId,
      authenticated_peer_node_id: routeState.authenticated_peer_node_id,
      relay_node_id: this.relayNodeId,
      relay_stream_id: this.relayStreamId,
      direct_route_live: routeState.direct_route_live,
      direct_route_transport: routeState.direct_route_transport,
      relay_fallback_live: routeState.relay_fallback_live,
      promoted_at_ms: this.promotedAtMs,
      now_ms: nowMs,
      consecutive_successful_round_trips:
        this.consecutiveSuccessfulRoundTrips,
      failed_round_trips_since_promotion: failClosedFailureCount,
      first_success_at_ms: this.firstSuccessAtMs,
      last_success_at_ms: this.lastSuccessAtMs,
    });
  }

  evaluate(
    routeState: VoidUdpSwarmDirectRouteHealthObserverRouteStateV1,
    nowMs: number,
  ): VoidUdpSwarmDirectRouteHealthPolicyDecisionV1 {
    return evaluateVoidUdpSwarmDirectRouteHealthPolicyV1(
      this.policyInput(routeState, nowMs),
    );
  }

  snapshot(): VoidUdpSwarmDirectRouteHealthObserverSnapshotV1 {
    return Object.freeze({
      version: VOID_P2P_UDP_SWARM_DIRECT_ROUTE_HEALTH_OBSERVER_VERSION_V1,
      session_id: this.sessionId,
      expected_peer_node_id: this.expectedPeerNodeId,
      relay_node_id: this.relayNodeId,
      relay_stream_id: this.relayStreamId,
      promoted_at_ms: this.promotedAtMs,
      accepted_observation_count: this.acceptedObservationCount,
      consecutive_successful_round_trips:
        this.consecutiveSuccessfulRoundTrips,
      failed_round_trips_since_promotion: this.failedRoundTripsSincePromotion,
      first_success_at_ms: this.firstSuccessAtMs,
      last_success_at_ms: this.lastSuccessAtMs,
      last_failure_at_ms: this.lastFailureAtMs,
      last_observation_at_ms: this.lastObservationAtMs,
      last_rtt_ms: this.lastRttMs,
      poisoned: this.poisonedValue,
      poison_reason: this.poisonReasonValue,
      relay_retirement_performed: false,
      normal_peer_map_mutation_performed: false,
      direct_route_mutation_performed: false,
      relay_socket_mutation_performed: false,
    });
  }
}
