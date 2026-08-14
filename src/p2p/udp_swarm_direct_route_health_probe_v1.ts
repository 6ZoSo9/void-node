// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025-2026 6ZoSo9

import * as crypto from "node:crypto";

export const VOID_P2P_UDP_SWARM_DIRECT_ROUTE_HEALTH_PROBE_PROTOCOL_VERSION_V1 = 1;
export const VOID_P2P_UDP_SWARM_DIRECT_ROUTE_HEALTH_PROBE_DEFAULT_TIMEOUT_MS_V1 =
  3_000;
export const VOID_P2P_UDP_SWARM_DIRECT_ROUTE_HEALTH_PROBE_MIN_TIMEOUT_MS_V1 =
  100;
export const VOID_P2P_UDP_SWARM_DIRECT_ROUTE_HEALTH_PROBE_MAX_TIMEOUT_MS_V1 =
  10_000;
export const VOID_P2P_UDP_SWARM_DIRECT_ROUTE_HEALTH_PROBE_MAX_SEQUENCE_V1 =
  1_000_000;

export const VOID_P2P_UDP_SWARM_DIRECT_ROUTE_HEALTH_PROBE_AUTHORITY_V1 =
  Object.freeze({
    message_objects_only: true,
    authenticated_direct_route_required_by_mount: true,
    authenticated_direct_route_verified_here: false,
    one_outstanding_probe_per_session: true,
    local_rtt_measurement_only: true,
    remote_timestamp_trusted: false,
    network_send_performed: false,
    runtime_timer_owned: false,
    socket_access_performed: false,
    node_core_mount_performed: false,
    relay_retirement_performed: false,
    normal_peer_map_mutation_performed: false,
    direct_route_mutation_performed: false,
    relay_socket_mutation_performed: false,
    production_udp_activation_performed: false,
    wallet_signer_validator_wc_money_authority: 0,
  });

const ID_RE = /^[0-9a-f]{32}$/;

export type VoidUdpSwarmDirectRouteHealthPingV1 = Readonly<{
  type: "UDP_SWARM_DIRECT_HEALTH_PING";
  protocol: 1;
  session_id: string;
  probe_id: string;
  sequence: number;
  sent_at_ms: number;
}>;

export type VoidUdpSwarmDirectRouteHealthPongV1 = Readonly<{
  type: "UDP_SWARM_DIRECT_HEALTH_PONG";
  protocol: 1;
  session_id: string;
  probe_id: string;
  sequence: number;
  sent_at_ms: number;
}>;

export type VoidUdpSwarmDirectRouteHealthProbeMessageV1 =
  | VoidUdpSwarmDirectRouteHealthPingV1
  | VoidUdpSwarmDirectRouteHealthPongV1;

export type VoidUdpSwarmDirectRouteHealthProbeResultV1 =
  | Readonly<{
      outcome: "success";
      session_id: string;
      probe_id: string;
      sequence: number;
      observed_at_ms: number;
      rtt_ms: number;
    }>
  | Readonly<{
      outcome: "failure";
      session_id: string;
      probe_id: string;
      sequence: number;
      observed_at_ms: number;
      reason: "health_probe_timeout" | "health_probe_clock_invalid";
    }>;

export type VoidUdpSwarmDirectRouteHealthProbeSnapshotV1 = Readonly<{
  version: 1;
  session_id: string;
  timeout_ms: number;
  next_sequence: number;
  pending_probe: null | Readonly<{
    probe_id: string;
    sequence: number;
    sent_at_ms: number;
  }>;
  poisoned: boolean;
  poison_reason: string | null;
  network_send_performed: false;
  runtime_timer_owned: false;
  socket_access_performed: false;
  relay_retirement_performed: false;
}>;

function safeInteger(raw: unknown, min: number, max: number): number | undefined {
  return typeof raw === "number" &&
      Number.isSafeInteger(raw) &&
      raw >= min &&
      raw <= max
    ? raw
    : undefined;
}

function exactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  return actual.length === wanted.length &&
    actual.every((key, index) => key === wanted[index]);
}

export function normalizeVoidUdpSwarmDirectRouteHealthProbeMessageV1(
  raw: unknown,
): VoidUdpSwarmDirectRouteHealthProbeMessageV1 | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return;
  const value = raw as Record<string, unknown>;
  if (
    !exactKeys(value, [
      "type",
      "protocol",
      "session_id",
      "probe_id",
      "sequence",
      "sent_at_ms",
    ]) ||
    value.protocol !== VOID_P2P_UDP_SWARM_DIRECT_ROUTE_HEALTH_PROBE_PROTOCOL_VERSION_V1 ||
    (value.type !== "UDP_SWARM_DIRECT_HEALTH_PING" &&
      value.type !== "UDP_SWARM_DIRECT_HEALTH_PONG") ||
    typeof value.session_id !== "string" ||
    !ID_RE.test(value.session_id) ||
    typeof value.probe_id !== "string" ||
    !ID_RE.test(value.probe_id)
  ) {
    return;
  }

  const sequence = safeInteger(
    value.sequence,
    1,
    VOID_P2P_UDP_SWARM_DIRECT_ROUTE_HEALTH_PROBE_MAX_SEQUENCE_V1,
  );
  const sentAtMs = safeInteger(value.sent_at_ms, 0, Number.MAX_SAFE_INTEGER);
  if (sequence === undefined || sentAtMs === undefined) return;

  if (value.type === "UDP_SWARM_DIRECT_HEALTH_PING") {
    return Object.freeze({
      type: value.type,
      protocol: 1,
      session_id: value.session_id,
      probe_id: value.probe_id,
      sequence,
      sent_at_ms: sentAtMs,
    });
  }
  return Object.freeze({
    type: value.type,
    protocol: 1,
    session_id: value.session_id,
    probe_id: value.probe_id,
    sequence,
    sent_at_ms: sentAtMs,
  });
}

export function buildVoidUdpSwarmDirectRouteHealthPongV1(
  rawPing: unknown,
): VoidUdpSwarmDirectRouteHealthPongV1 | null {
  const ping = normalizeVoidUdpSwarmDirectRouteHealthProbeMessageV1(rawPing);
  if (!ping || ping.type !== "UDP_SWARM_DIRECT_HEALTH_PING") return null;
  return Object.freeze({
    type: "UDP_SWARM_DIRECT_HEALTH_PONG",
    protocol: 1,
    session_id: ping.session_id,
    probe_id: ping.probe_id,
    sequence: ping.sequence,
    sent_at_ms: ping.sent_at_ms,
  });
}

export class VoidUdpSwarmDirectRouteHealthProbeV1 {
  readonly sessionId: string;
  readonly timeoutMs: number;

  private nextSequenceValue = 1;
  private pending: VoidUdpSwarmDirectRouteHealthPingV1 | null = null;
  private poisonedValue = false;
  private poisonReasonValue: string | null = null;

  constructor(
    sessionId: string,
    timeoutMs = VOID_P2P_UDP_SWARM_DIRECT_ROUTE_HEALTH_PROBE_DEFAULT_TIMEOUT_MS_V1,
  ) {
    if (!ID_RE.test(sessionId)) {
      throw new Error("sessionId must be a canonical UDP Swarm session id");
    }
    const normalizedTimeout = safeInteger(
      timeoutMs,
      VOID_P2P_UDP_SWARM_DIRECT_ROUTE_HEALTH_PROBE_MIN_TIMEOUT_MS_V1,
      VOID_P2P_UDP_SWARM_DIRECT_ROUTE_HEALTH_PROBE_MAX_TIMEOUT_MS_V1,
    );
    if (normalizedTimeout === undefined) {
      throw new Error("health probe timeout is out of bounds");
    }
    this.sessionId = sessionId;
    this.timeoutMs = normalizedTimeout;
  }

  get poisoned(): boolean {
    return this.poisonedValue;
  }

  private poison(reason: string): void {
    this.poisonedValue = true;
    if (this.poisonReasonValue === null) this.poisonReasonValue = reason;
  }

  createPing(nowMs = Date.now()): VoidUdpSwarmDirectRouteHealthPingV1 | null {
    if (this.poisonedValue || this.pending) return null;
    const sentAtMs = safeInteger(nowMs, 0, Number.MAX_SAFE_INTEGER);
    if (sentAtMs === undefined) {
      this.poison("health probe local clock is invalid");
      return null;
    }
    if (
      this.nextSequenceValue >
      VOID_P2P_UDP_SWARM_DIRECT_ROUTE_HEALTH_PROBE_MAX_SEQUENCE_V1
    ) {
      this.poison("health probe sequence capacity exhausted");
      return null;
    }

    const ping = Object.freeze({
      type: "UDP_SWARM_DIRECT_HEALTH_PING" as const,
      protocol: 1 as const,
      session_id: this.sessionId,
      probe_id: crypto.randomBytes(16).toString("hex"),
      sequence: this.nextSequenceValue,
      sent_at_ms: sentAtMs,
    });
    this.nextSequenceValue += 1;
    this.pending = ping;
    return ping;
  }

  acceptPong(
    rawPong: unknown,
    observedAtMs = Date.now(),
  ): VoidUdpSwarmDirectRouteHealthProbeResultV1 | null {
    if (this.poisonedValue || !this.pending) return null;
    const pong = normalizeVoidUdpSwarmDirectRouteHealthProbeMessageV1(rawPong);
    if (!pong || pong.type !== "UDP_SWARM_DIRECT_HEALTH_PONG") return null;
    const pending = this.pending;
    if (
      pong.session_id !== pending.session_id ||
      pong.probe_id !== pending.probe_id ||
      pong.sequence !== pending.sequence ||
      pong.sent_at_ms !== pending.sent_at_ms
    ) {
      return null;
    }

    const observed = safeInteger(observedAtMs, 0, Number.MAX_SAFE_INTEGER);
    if (observed === undefined || observed < pending.sent_at_ms) {
      this.pending = null;
      this.poison("health probe local clock moved before probe send time");
      return Object.freeze({
        outcome: "failure",
        session_id: pending.session_id,
        probe_id: pending.probe_id,
        sequence: pending.sequence,
        observed_at_ms: pending.sent_at_ms,
        reason: "health_probe_clock_invalid",
      });
    }

    this.pending = null;
    const rttMs = observed - pending.sent_at_ms;
    if (rttMs > this.timeoutMs) {
      return Object.freeze({
        outcome: "failure",
        session_id: pending.session_id,
        probe_id: pending.probe_id,
        sequence: pending.sequence,
        observed_at_ms: observed,
        reason: "health_probe_timeout",
      });
    }
    return Object.freeze({
      outcome: "success",
      session_id: pending.session_id,
      probe_id: pending.probe_id,
      sequence: pending.sequence,
      observed_at_ms: observed,
      rtt_ms: rttMs,
    });
  }

  expirePending(
    nowMs = Date.now(),
  ): VoidUdpSwarmDirectRouteHealthProbeResultV1 | null {
    if (this.poisonedValue || !this.pending) return null;
    const pending = this.pending;
    const observed = safeInteger(nowMs, 0, Number.MAX_SAFE_INTEGER);
    if (observed === undefined || observed < pending.sent_at_ms) {
      this.pending = null;
      this.poison("health probe local clock moved before probe send time");
      return Object.freeze({
        outcome: "failure",
        session_id: pending.session_id,
        probe_id: pending.probe_id,
        sequence: pending.sequence,
        observed_at_ms: pending.sent_at_ms,
        reason: "health_probe_clock_invalid",
      });
    }
    if (observed - pending.sent_at_ms <= this.timeoutMs) return null;

    this.pending = null;
    return Object.freeze({
      outcome: "failure",
      session_id: pending.session_id,
      probe_id: pending.probe_id,
      sequence: pending.sequence,
      observed_at_ms: observed,
      reason: "health_probe_timeout",
    });
  }

  snapshot(): VoidUdpSwarmDirectRouteHealthProbeSnapshotV1 {
    return Object.freeze({
      version: VOID_P2P_UDP_SWARM_DIRECT_ROUTE_HEALTH_PROBE_PROTOCOL_VERSION_V1,
      session_id: this.sessionId,
      timeout_ms: this.timeoutMs,
      next_sequence: this.nextSequenceValue,
      pending_probe: this.pending
        ? Object.freeze({
            probe_id: this.pending.probe_id,
            sequence: this.pending.sequence,
            sent_at_ms: this.pending.sent_at_ms,
          })
        : null,
      poisoned: this.poisonedValue,
      poison_reason: this.poisonReasonValue,
      network_send_performed: false,
      runtime_timer_owned: false,
      socket_access_performed: false,
      relay_retirement_performed: false,
    });
  }
}
