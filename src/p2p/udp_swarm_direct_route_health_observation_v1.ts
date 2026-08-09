// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025-2026 6ZoSo9

import { randomBytes } from "node:crypto";

export const VOID_P2P_UDP_SWARM_DIRECT_ROUTE_HEALTH_OBSERVATION_VERSION_V1 = 1;
export const VOID_P2P_UDP_SWARM_DIRECT_ROUTE_HEALTH_PROBE_INTERVAL_MS_V1 = 7_500;
export const VOID_P2P_UDP_SWARM_DIRECT_ROUTE_HEALTH_PROBE_TIMEOUT_MS_V1 = 5_000;
export const VOID_P2P_UDP_SWARM_DIRECT_ROUTE_HEALTH_MAX_PROBES_PER_SESSION_V1 = 4_096;

export const VOID_P2P_UDP_SWARM_DIRECT_ROUTE_HEALTH_OBSERVATION_AUTHORITY_V1 =
  Object.freeze({
    authenticated_probe_messages_may_be_returned: true,
    authenticated_ack_messages_may_be_returned: true,
    health_evidence_may_be_returned: true,
    network_transmission_performed: false,
    socket_mutation_performed: false,
    normal_peer_map_mutation_performed: false,
    relay_retirement_authorized: false,
    relay_retirement_performed: false,
    production_udp_activation_performed: false,
    wallet_signer_validator_wc_money_authority: 0,
  });

const NODE_ID_RE = /^[0-9a-f]{32}$/;
const PROBE_ID_RE = /^[0-9a-f]{32}$/;
const SAFE_TOKEN_RE = /^[^\s\u0000-\u001f\u007f]{1,128}$/;

function boundedNonNegativeInteger(raw: unknown): raw is number {
  return typeof raw === "number" && Number.isSafeInteger(raw) && raw >= 0;
}

function hasExactKeys(
  raw: Record<string, unknown>,
  expected: readonly string[],
): boolean {
  const actual = Object.keys(raw).sort();
  const wanted = [...expected].sort();
  return (
    actual.length === wanted.length &&
    actual.every((key, index) => key === wanted[index])
  );
}

export type VoidUdpSwarmDirectRouteHealthProbeV1 = Readonly<{
  type: "UDP_SWARM_DIRECT_ROUTE_HEALTH_PROBE";
  protocol: 1;
  session_id: string;
  probe_id: string;
  sender_node_id: string;
  recipient_node_id: string;
}>;

export type VoidUdpSwarmDirectRouteHealthAckV1 = Readonly<{
  type: "UDP_SWARM_DIRECT_ROUTE_HEALTH_ACK";
  protocol: 1;
  session_id: string;
  probe_id: string;
  sender_node_id: string;
  recipient_node_id: string;
}>;

export type VoidUdpSwarmDirectRouteHealthMessageV1 =
  | VoidUdpSwarmDirectRouteHealthProbeV1
  | VoidUdpSwarmDirectRouteHealthAckV1;

export function normalizeVoidUdpSwarmDirectRouteHealthMessageV1(
  raw: unknown,
): VoidUdpSwarmDirectRouteHealthMessageV1 | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const value = raw as Record<string, unknown>;
  if (
    !hasExactKeys(value, [
      "type",
      "protocol",
      "session_id",
      "probe_id",
      "sender_node_id",
      "recipient_node_id",
    ]) ||
    value.protocol !== VOID_P2P_UDP_SWARM_DIRECT_ROUTE_HEALTH_OBSERVATION_VERSION_V1 ||
    (value.type !== "UDP_SWARM_DIRECT_ROUTE_HEALTH_PROBE" &&
      value.type !== "UDP_SWARM_DIRECT_ROUTE_HEALTH_ACK") ||
    typeof value.session_id !== "string" ||
    !SAFE_TOKEN_RE.test(value.session_id) ||
    typeof value.probe_id !== "string" ||
    !PROBE_ID_RE.test(value.probe_id) ||
    typeof value.sender_node_id !== "string" ||
    !NODE_ID_RE.test(value.sender_node_id) ||
    typeof value.recipient_node_id !== "string" ||
    !NODE_ID_RE.test(value.recipient_node_id)
  ) {
    return null;
  }

  if (value.type === "UDP_SWARM_DIRECT_ROUTE_HEALTH_PROBE") {
    return Object.freeze({
      type: value.type,
      protocol: 1,
      session_id: value.session_id,
      probe_id: value.probe_id,
      sender_node_id: value.sender_node_id,
      recipient_node_id: value.recipient_node_id,
    });
  }
  return Object.freeze({
    type: value.type,
    protocol: 1,
    session_id: value.session_id,
    probe_id: value.probe_id,
    sender_node_id: value.sender_node_id,
    recipient_node_id: value.recipient_node_id,
  });
}

export function newVoidUdpSwarmDirectRouteHealthProbeIdV1(): string {
  return randomBytes(16).toString("hex");
}

export type VoidUdpSwarmDirectRouteHealthObservationConfigV1 = Readonly<{
  session_id: string;
  local_node_id: string;
  expected_peer_node_id: string;
  relay_node_id: string;
  relay_stream_id: string;
  promoted_at_ms: number;
  new_probe_id?: () => string;
}>;

type OutstandingProbeV1 = Readonly<{
  probe_id: string;
  sent_at_ms: number;
  deadline_at_ms: number;
}>;

export type VoidUdpSwarmDirectRouteHealthEvidenceV1 = Readonly<{
  version: 1;
  session_id: string;
  expected_peer_node_id: string;
  relay_node_id: string;
  relay_stream_id: string;
  promoted_at_ms: number;
  consecutive_successful_round_trips: number;
  failed_round_trips_since_promotion: number;
  first_success_at_ms: number | null;
  last_success_at_ms: number | null;
}>;

export type VoidUdpSwarmDirectRouteHealthObservationSnapshotV1 = Readonly<{
  version: 1;
  session_id: string;
  local_node_id: string;
  expected_peer_node_id: string;
  relay_node_id: string;
  relay_stream_id: string;
  promoted_at_ms: number;
  probes_issued: number;
  outstanding_probe: OutstandingProbeV1 | null;
  consecutive_successful_round_trips: number;
  failed_round_trips_since_promotion: number;
  first_success_at_ms: number | null;
  last_success_at_ms: number | null;
  network_transmission_performed: false;
  relay_retirement_authorized: false;
  relay_retirement_performed: false;
}>;

export class VoidUdpSwarmDirectRouteHealthObservationV1 {
  readonly session_id: string;
  readonly local_node_id: string;
  readonly expected_peer_node_id: string;
  readonly relay_node_id: string;
  readonly relay_stream_id: string;
  readonly promoted_at_ms: number;

  private readonly newProbeId: () => string;
  private readonly usedProbeIds = new Set<string>();
  private outstandingProbe: OutstandingProbeV1 | null = null;
  private lastProbeIssuedAtMs: number | null = null;
  private probesIssued = 0;
  private consecutiveSuccessfulRoundTrips = 0;
  private failedRoundTripsSincePromotion = 0;
  private firstSuccessAtMs: number | null = null;
  private lastSuccessAtMs: number | null = null;

  constructor(config: VoidUdpSwarmDirectRouteHealthObservationConfigV1) {
    if (
      !SAFE_TOKEN_RE.test(config.session_id) ||
      !NODE_ID_RE.test(config.local_node_id) ||
      !NODE_ID_RE.test(config.expected_peer_node_id) ||
      config.local_node_id === config.expected_peer_node_id ||
      !NODE_ID_RE.test(config.relay_node_id) ||
      !SAFE_TOKEN_RE.test(config.relay_stream_id) ||
      !boundedNonNegativeInteger(config.promoted_at_ms)
    ) {
      throw new Error("invalid UDP swarm direct-route health observation config");
    }
    this.session_id = config.session_id;
    this.local_node_id = config.local_node_id;
    this.expected_peer_node_id = config.expected_peer_node_id;
    this.relay_node_id = config.relay_node_id;
    this.relay_stream_id = config.relay_stream_id;
    this.promoted_at_ms = config.promoted_at_ms;
    this.newProbeId = config.new_probe_id ?? newVoidUdpSwarmDirectRouteHealthProbeIdV1;
  }

  private validateNow(nowMs: number): void {
    if (!boundedNonNegativeInteger(nowMs) || nowMs < this.promoted_at_ms) {
      throw new Error("invalid direct-route health observation clock");
    }
  }

  private recordFailure(): void {
    this.failedRoundTripsSincePromotion += 1;
    this.consecutiveSuccessfulRoundTrips = 0;
  }

  advanceV1(nowMs: number): { timed_out: boolean; probe_id: string | null } {
    this.validateNow(nowMs);
    const outstanding = this.outstandingProbe;
    if (!outstanding || nowMs <= outstanding.deadline_at_ms) {
      return { timed_out: false, probe_id: null };
    }
    this.outstandingProbe = null;
    this.recordFailure();
    return { timed_out: true, probe_id: outstanding.probe_id };
  }

  issueProbeV1(nowMs: number):
    | {
        ok: true;
        message: VoidUdpSwarmDirectRouteHealthProbeV1;
        deadline_at_ms: number;
      }
    | {
        ok: false;
        error:
          | "probe_outstanding"
          | "probe_interval_not_elapsed"
          | "probe_budget_exhausted"
          | "probe_id_invalid"
          | "probe_id_reused";
      } {
    this.validateNow(nowMs);
    this.advanceV1(nowMs);
    if (this.outstandingProbe) return { ok: false, error: "probe_outstanding" };
    if (
      this.lastProbeIssuedAtMs !== null &&
      nowMs - this.lastProbeIssuedAtMs <
        VOID_P2P_UDP_SWARM_DIRECT_ROUTE_HEALTH_PROBE_INTERVAL_MS_V1
    ) {
      return { ok: false, error: "probe_interval_not_elapsed" };
    }
    if (this.probesIssued >= VOID_P2P_UDP_SWARM_DIRECT_ROUTE_HEALTH_MAX_PROBES_PER_SESSION_V1) {
      return { ok: false, error: "probe_budget_exhausted" };
    }

    const probeId = this.newProbeId();
    if (!PROBE_ID_RE.test(probeId)) return { ok: false, error: "probe_id_invalid" };
    if (this.usedProbeIds.has(probeId)) return { ok: false, error: "probe_id_reused" };

    const deadlineAtMs = nowMs + VOID_P2P_UDP_SWARM_DIRECT_ROUTE_HEALTH_PROBE_TIMEOUT_MS_V1;
    if (!Number.isSafeInteger(deadlineAtMs)) {
      throw new Error("direct-route health probe deadline overflow");
    }
    this.usedProbeIds.add(probeId);
    this.probesIssued += 1;
    this.lastProbeIssuedAtMs = nowMs;
    this.outstandingProbe = Object.freeze({
      probe_id: probeId,
      sent_at_ms: nowMs,
      deadline_at_ms: deadlineAtMs,
    });

    return {
      ok: true,
      message: Object.freeze({
        type: "UDP_SWARM_DIRECT_ROUTE_HEALTH_PROBE",
        protocol: 1,
        session_id: this.session_id,
        probe_id: probeId,
        sender_node_id: this.local_node_id,
        recipient_node_id: this.expected_peer_node_id,
      }),
      deadline_at_ms: deadlineAtMs,
    };
  }

  buildAckForAuthenticatedProbeV1(
    authenticatedPeerNodeId: string,
    raw: unknown,
  ):
    | { ok: true; message: VoidUdpSwarmDirectRouteHealthAckV1 }
    | {
        ok: false;
        error:
          | "message_invalid"
          | "message_not_probe"
          | "authenticated_peer_mismatch"
          | "probe_binding_mismatch";
      } {
    const message = normalizeVoidUdpSwarmDirectRouteHealthMessageV1(raw);
    if (!message) return { ok: false, error: "message_invalid" };
    if (message.type !== "UDP_SWARM_DIRECT_ROUTE_HEALTH_PROBE") {
      return { ok: false, error: "message_not_probe" };
    }
    if (authenticatedPeerNodeId !== this.expected_peer_node_id) {
      return { ok: false, error: "authenticated_peer_mismatch" };
    }
    if (
      message.session_id !== this.session_id ||
      message.sender_node_id !== this.expected_peer_node_id ||
      message.recipient_node_id !== this.local_node_id
    ) {
      return { ok: false, error: "probe_binding_mismatch" };
    }
    return {
      ok: true,
      message: Object.freeze({
        type: "UDP_SWARM_DIRECT_ROUTE_HEALTH_ACK",
        protocol: 1,
        session_id: this.session_id,
        probe_id: message.probe_id,
        sender_node_id: this.local_node_id,
        recipient_node_id: this.expected_peer_node_id,
      }),
    };
  }

  ingestAuthenticatedAckV1(
    authenticatedPeerNodeId: string,
    raw: unknown,
    nowMs: number,
  ):
    | { ok: true; round_trip_ms: number }
    | {
        ok: false;
        error:
          | "message_invalid"
          | "message_not_ack"
          | "authenticated_peer_mismatch"
          | "ack_binding_mismatch"
          | "probe_not_outstanding"
          | "probe_id_mismatch"
          | "probe_timed_out";
      } {
    this.validateNow(nowMs);
    const message = normalizeVoidUdpSwarmDirectRouteHealthMessageV1(raw);
    if (!message) return { ok: false, error: "message_invalid" };
    if (message.type !== "UDP_SWARM_DIRECT_ROUTE_HEALTH_ACK") {
      return { ok: false, error: "message_not_ack" };
    }
    if (authenticatedPeerNodeId !== this.expected_peer_node_id) {
      return { ok: false, error: "authenticated_peer_mismatch" };
    }
    if (
      message.session_id !== this.session_id ||
      message.sender_node_id !== this.expected_peer_node_id ||
      message.recipient_node_id !== this.local_node_id
    ) {
      return { ok: false, error: "ack_binding_mismatch" };
    }

    const outstanding = this.outstandingProbe;
    if (!outstanding) return { ok: false, error: "probe_not_outstanding" };
    if (message.probe_id !== outstanding.probe_id) {
      return { ok: false, error: "probe_id_mismatch" };
    }
    if (nowMs > outstanding.deadline_at_ms) {
      this.advanceV1(nowMs);
      return { ok: false, error: "probe_timed_out" };
    }

    const roundTripMs = nowMs - outstanding.sent_at_ms;
    this.outstandingProbe = null;
    this.consecutiveSuccessfulRoundTrips += 1;
    if (this.firstSuccessAtMs === null) this.firstSuccessAtMs = nowMs;
    this.lastSuccessAtMs = nowMs;
    return { ok: true, round_trip_ms: roundTripMs };
  }

  evidenceV1(): VoidUdpSwarmDirectRouteHealthEvidenceV1 {
    return Object.freeze({
      version: 1,
      session_id: this.session_id,
      expected_peer_node_id: this.expected_peer_node_id,
      relay_node_id: this.relay_node_id,
      relay_stream_id: this.relay_stream_id,
      promoted_at_ms: this.promoted_at_ms,
      consecutive_successful_round_trips: this.consecutiveSuccessfulRoundTrips,
      failed_round_trips_since_promotion: this.failedRoundTripsSincePromotion,
      first_success_at_ms: this.firstSuccessAtMs,
      last_success_at_ms: this.lastSuccessAtMs,
    });
  }

  snapshotV1(): VoidUdpSwarmDirectRouteHealthObservationSnapshotV1 {
    return Object.freeze({
      version: 1,
      session_id: this.session_id,
      local_node_id: this.local_node_id,
      expected_peer_node_id: this.expected_peer_node_id,
      relay_node_id: this.relay_node_id,
      relay_stream_id: this.relay_stream_id,
      promoted_at_ms: this.promoted_at_ms,
      probes_issued: this.probesIssued,
      outstanding_probe: this.outstandingProbe,
      consecutive_successful_round_trips: this.consecutiveSuccessfulRoundTrips,
      failed_round_trips_since_promotion: this.failedRoundTripsSincePromotion,
      first_success_at_ms: this.firstSuccessAtMs,
      last_success_at_ms: this.lastSuccessAtMs,
      network_transmission_performed: false,
      relay_retirement_authorized: false,
      relay_retirement_performed: false,
    });
  }
}
