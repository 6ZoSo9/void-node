// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025-2026 6ZoSo9

import type { Node } from "../node_core.js";

export const VOID_P2P_UDP_SWARM_RELAY_ORCHESTRATOR_V1 =
  "VOID_P2P_UDP_SWARM_RELAY_ORCHESTRATOR_V1";

export const VOID_P2P_UDP_SWARM_RELAY_ORCHESTRATOR_MAX_ROUTES_V1 = 8;
export const VOID_P2P_UDP_SWARM_RELAY_ORCHESTRATOR_SWEEP_MS_V1 = 1_000;
export const VOID_P2P_UDP_SWARM_RELAY_ORCHESTRATOR_RETRY_MS_V1 = 15_000;
export const VOID_P2P_UDP_SWARM_RELAY_ORCHESTRATOR_RESERVATION_TTL_MS_V1 =
  120_000;
export const VOID_P2P_UDP_SWARM_RELAY_ORCHESTRATOR_REFRESH_WINDOW_MS_V1 =
  30_000;

export const VOID_P2P_UDP_SWARM_RELAY_ORCHESTRATOR_AUTHORITY_V1 =
  Object.freeze({
    exact_opt_in_required: true,
    exact_relay_target_routes_required: true,
    maximum_route_count:
      VOID_P2P_UDP_SWARM_RELAY_ORCHESTRATOR_MAX_ROUTES_V1,
    authenticated_direct_relay_required: true,
    active_relay_reservation_required_before_connect: true,
    started_outgoing_relay_stream_required_before_udp_upgrade: true,
    incoming_stream_upgrade_initiation_performed: false,
    bounded_retry_backoff_required: true,
    relay_retirement_performed: false,
    peer_identity_exposed_in_status: false,
    router_configuration_required: false,
    port_forward_required: false,
    deployment_performed: false,
    service_restart_performed: false,
    wallet_signer_validator_wc_money_authority: 0,
  });

const NODE_ID_RE = /^[0-9a-f]{32}$/;

export type VoidUdpSwarmRelayOrchestrationRouteV1 = Readonly<{
  relay_node_id: string;
  target_node_id: string;
}>;

export type VoidUdpSwarmRelayOrchestratorConfigV1 = Readonly<{
  enabled: boolean;
  routes: readonly VoidUdpSwarmRelayOrchestrationRouteV1[];
}>;

type RelaySnapshotV1 = Readonly<{
  client_reservations: readonly Readonly<{
    relay_node_id: string;
    expires_at_ms: number;
  }>[];
  streams: readonly Readonly<{
    relay_node_id: string;
    remote_node_id: string;
    stream_id: string;
    outgoing: boolean;
    started: boolean;
  }>[];
}>;

type ControlSnapshotV1 = Readonly<{
  pending_requests: readonly Readonly<{
    relay_node_id: string;
    target_node_id: string;
    stream_id: string;
  }>[];
  active_routes: readonly Readonly<{
    relay_node_id: string;
    peer_node_id: string;
    stream_id: string;
  }>[];
}>;

export type VoidUdpSwarmRelayOrchestrationNodeV1 = Pick<
  Node,
  | "id"
  | "requestRelayReservation"
  | "connectViaRelay"
  | "requestUdpSwarmUpgradeV1"
> & Readonly<{
  relaySnapshot: () => RelaySnapshotV1;
  udpSwarmControlSnapshot: () => ControlSnapshotV1;
}>;

type RouteRuntimeV1 = {
  last_reservation_attempt_ms: number;
  last_connect_attempt_ms: number;
  last_upgrade_attempt_ms: number;
};

function safeNow(nowMs: number): number {
  if (!Number.isSafeInteger(nowMs) || nowMs < 0) {
    throw new Error(
      "UDP swarm relay orchestration time must be a nonnegative safe integer",
    );
  }
  return nowMs;
}

function routeKey(route: VoidUdpSwarmRelayOrchestrationRouteV1): string {
  return `${route.relay_node_id}/${route.target_node_id}`;
}

export function parseVoidUdpSwarmRelayOrchestrationRoutesV1(
  raw: string | undefined,
): readonly VoidUdpSwarmRelayOrchestrationRouteV1[] {
  if (raw === undefined || raw === "") return Object.freeze([]);
  if (raw.trim() !== raw) {
    throw new Error(
      "VOID_P2P_UDP_SWARM_ORCHESTRATION_ROUTES must not contain outer whitespace",
    );
  }
  const entries = raw.split(",");
  if (
    entries.length === 0 ||
    entries.length > VOID_P2P_UDP_SWARM_RELAY_ORCHESTRATOR_MAX_ROUTES_V1
  ) {
    throw new Error(
      "VOID_P2P_UDP_SWARM_ORCHESTRATION_ROUTES has an invalid route count",
    );
  }
  const seen = new Set<string>();
  const routes = entries.map((entry) => {
    const match = entry.match(/^([0-9a-f]{32})\/([0-9a-f]{32})$/);
    if (!match) {
      throw new Error(
        "VOID_P2P_UDP_SWARM_ORCHESTRATION_ROUTES must use relay_node_id/target_node_id pairs",
      );
    }
    const relayNodeId = match[1] ?? "";
    const targetNodeId = match[2] ?? "";
    if (
      !NODE_ID_RE.test(relayNodeId) ||
      !NODE_ID_RE.test(targetNodeId) ||
      relayNodeId === targetNodeId
    ) {
      throw new Error("UDP swarm relay orchestration route is invalid");
    }
    const route = Object.freeze({
      relay_node_id: relayNodeId,
      target_node_id: targetNodeId,
    });
    const key = routeKey(route);
    if (seen.has(key)) {
      throw new Error("UDP swarm relay orchestration routes must be unique");
    }
    seen.add(key);
    return route;
  });
  return Object.freeze(routes);
}

export class VoidUdpSwarmRelayOrchestratorV1 {
  private timer: NodeJS.Timeout | null = null;
  private stopped = false;
  private readonly runtimeByRoute = new Map<string, RouteRuntimeV1>();
  private sweepCount = 0;
  private sweepFailures = 0;
  private reservationAttempts = 0;
  private reservationRequests = 0;
  private connectAttempts = 0;
  private connectRequests = 0;
  private upgradeAttempts = 0;
  private upgradeRequests = 0;
  private upgradeRejects = 0;

  constructor(
    private readonly node: VoidUdpSwarmRelayOrchestrationNodeV1,
    readonly config: VoidUdpSwarmRelayOrchestratorConfigV1,
  ) {
    if (
      config.routes.length >
      VOID_P2P_UDP_SWARM_RELAY_ORCHESTRATOR_MAX_ROUTES_V1
    ) {
      throw new Error(
        "UDP swarm relay orchestration route count exceeds the bound",
      );
    }
    if (config.enabled && config.routes.length === 0) {
      throw new Error(
        "UDP swarm relay orchestration requires at least one exact route",
      );
    }
    if (!config.enabled && config.routes.length !== 0) {
      throw new Error("UDP swarm relay orchestration routes require exact opt-in");
    }
    const seen = new Set<string>();
    for (const route of config.routes) {
      if (
        !NODE_ID_RE.test(route.relay_node_id) ||
        !NODE_ID_RE.test(route.target_node_id) ||
        route.relay_node_id === route.target_node_id ||
        route.relay_node_id === node.id ||
        route.target_node_id === node.id
      ) {
        throw new Error(
          "UDP swarm relay orchestration route is invalid for this node",
        );
      }
      const key = routeKey(route);
      if (seen.has(key)) {
        throw new Error("UDP swarm relay orchestration routes must be unique");
      }
      seen.add(key);
      this.runtimeByRoute.set(key, {
        last_reservation_attempt_ms: Number.NEGATIVE_INFINITY,
        last_connect_attempt_ms: Number.NEGATIVE_INFINITY,
        last_upgrade_attempt_ms: Number.NEGATIVE_INFINITY,
      });
    }
  }

  start(): void {
    if (this.stopped) throw new Error("UDP swarm relay orchestrator is stopped");
    if (!this.config.enabled || this.timer) return;
    try {
      this.runOnce();
    } catch (error) {
      void error;
      this.sweepFailures += 1;
    }
    this.timer = setInterval(() => {
      try {
        this.runOnce();
      } catch (error) {
        void error;
        this.sweepFailures += 1;
      }
    }, VOID_P2P_UDP_SWARM_RELAY_ORCHESTRATOR_SWEEP_MS_V1);
    this.timer.unref?.();
  }

  runOnce(nowMs = Date.now()): void {
    if (this.stopped || !this.config.enabled) return;
    const now = safeNow(nowMs);
    this.sweepCount += 1;
    const relay = this.node.relaySnapshot();
    const control = this.node.udpSwarmControlSnapshot();

    for (const route of this.config.routes) {
      const runtime = this.runtimeByRoute.get(routeKey(route));
      if (!runtime) {
        throw new Error("UDP swarm relay orchestration route state disappeared");
      }

      const reservation = relay.client_reservations.find(
        (entry) => entry.relay_node_id === route.relay_node_id,
      );
      if (
        (!reservation ||
          reservation.expires_at_ms - now <=
            VOID_P2P_UDP_SWARM_RELAY_ORCHESTRATOR_REFRESH_WINDOW_MS_V1) &&
        now - runtime.last_reservation_attempt_ms >=
          VOID_P2P_UDP_SWARM_RELAY_ORCHESTRATOR_RETRY_MS_V1
      ) {
        this.reservationAttempts += 1;
        const requestId = this.node.requestRelayReservation(
          route.relay_node_id,
          VOID_P2P_UDP_SWARM_RELAY_ORCHESTRATOR_RESERVATION_TTL_MS_V1,
        );
        if (requestId) {
          runtime.last_reservation_attempt_ms = now;
          this.reservationRequests += 1;
        }
      }
      if (!reservation || reservation.expires_at_ms <= now) continue;

      const stream = relay.streams.find(
        (entry) =>
          entry.relay_node_id === route.relay_node_id &&
          entry.remote_node_id === route.target_node_id &&
          entry.outgoing,
      );
      if (!stream) {
        if (
          now - runtime.last_connect_attempt_ms >=
          VOID_P2P_UDP_SWARM_RELAY_ORCHESTRATOR_RETRY_MS_V1
        ) {
          this.connectAttempts += 1;
          const requestId = this.node.connectViaRelay(
            route.relay_node_id,
            route.target_node_id,
          );
          if (requestId) {
            runtime.last_connect_attempt_ms = now;
            this.connectRequests += 1;
          }
        }
        continue;
      }
      if (!stream.started) continue;

      const requestExists = control.pending_requests.some(
        (entry) =>
          entry.relay_node_id === route.relay_node_id &&
          entry.target_node_id === route.target_node_id &&
          entry.stream_id === stream.stream_id,
      );
      const routeExists = control.active_routes.some(
        (entry) =>
          entry.relay_node_id === route.relay_node_id &&
          entry.peer_node_id === route.target_node_id &&
          entry.stream_id === stream.stream_id,
      );
      if (requestExists || routeExists) continue;
      if (
        now - runtime.last_upgrade_attempt_ms <
        VOID_P2P_UDP_SWARM_RELAY_ORCHESTRATOR_RETRY_MS_V1
      ) continue;

      runtime.last_upgrade_attempt_ms = now;
      this.upgradeAttempts += 1;
      const result = this.node.requestUdpSwarmUpgradeV1(
        route.relay_node_id,
        route.target_node_id,
        stream.stream_id,
      );
      if (result.ok) this.upgradeRequests += 1;
      else this.upgradeRejects += 1;
    }
  }

  status(): Readonly<Record<string, unknown>> {
    const activity = this.activity();
    return Object.freeze({
      marker: VOID_P2P_UDP_SWARM_RELAY_ORCHESTRATOR_V1,
      enabled: this.config.enabled,
      route_count: this.config.routes.length,
      stopped: this.stopped,
      counters: Object.freeze({
        sweep_count: this.sweepCount,
        sweep_failures: this.sweepFailures,
        ...activity,
        upgrade_rejects: this.upgradeRejects,
      }),
      privacy: Object.freeze({
        route_identity_exposed: false,
      }),
      authority: VOID_P2P_UDP_SWARM_RELAY_ORCHESTRATOR_AUTHORITY_V1,
    });
  }

  activity(): Readonly<{
    reservation_attempts: number;
    reservation_requests: number;
    connect_attempts: number;
    connect_requests: number;
    upgrade_attempts: number;
    upgrade_requests: number;
  }> {
    return Object.freeze({
      reservation_attempts: this.reservationAttempts,
      reservation_requests: this.reservationRequests,
      connect_attempts: this.connectAttempts,
      connect_requests: this.connectRequests,
      upgrade_attempts: this.upgradeAttempts,
      upgrade_requests: this.upgradeRequests,
    });
  }

  stop(): void {
    if (this.stopped) return;
    this.stopped = true;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
