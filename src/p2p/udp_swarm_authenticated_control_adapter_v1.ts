// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025-2026 6ZoSo9

import * as crypto from "node:crypto";

import { deriveVoidNodeIdFromPublicPemV1 } from "./auth_v1.js";
import {
  createVoidUdpRendezvousProbeV1,
  type VoidUdpRendezvousObservationV1,
  type VoidUdpRendezvousProbeV1,
} from "./udp_rendezvous_v1.js";
import {
  normalizeVoidUdpSwarmControlMessageV1,
  type VoidUdpSwarmControlMessageV1,
  type VoidUdpSwarmUpgradeOfferV1,
  type VoidUdpSwarmUpgradeRejectV1,
} from "./udp_swarm_control_v1.js";
import { VoidUdpSwarmRelayBridgeV1 } from "./udp_swarm_relay_bridge_v1.js";

const ID_RE = /^[0-9a-f]{32}$/;
export const VOID_P2P_UDP_SWARM_CONTROL_ADAPTER_PENDING_TTL_MS_V1 = 10_000;

export const VOID_P2P_UDP_SWARM_AUTHENTICATED_CONTROL_ADAPTER_AUTHORITY_V1 = Object.freeze({
  authenticated_control_sender_required: true,
  started_local_relay_stream_required: true,
  relay_bridge_required_for_relay_request: true,
  ticket_relay_sender_binding_required: true,
  ticket_stream_peer_binding_required: true,
  signed_mapping_probes_use_existing_node_key: true,
  two_mapping_probes_emitted_per_ticket: true,
  offer_exact_session_binding_required: true,
  node_core_mount_performed: false,
  udp_socket_allocation_performed: false,
  network_send_performed: false,
  direct_transport_activation_performed: false,
  relay_retirement_authorized: false,
  relay_fallback_preserved: true,
  router_configuration_required: false,
  port_forward_required: false,
  wallet_signer_validator_wc_money_authority: 0,
});

export type VoidUdpSwarmControlDeliveryV1 = Readonly<{
  recipient_node_id: string;
  message: VoidUdpSwarmControlMessageV1;
}>;

export type VoidUdpSwarmProbeActionV1 = Readonly<{
  relay_node_id: string;
  relay_udp_endpoint: string;
  request_id: string;
  session_id: string;
  stream_id: string;
  peer_node_id: string;
  packet: VoidUdpRendezvousProbeV1;
}>;

export type VoidUdpSwarmDirectUpgradeOfferActionV1 = Readonly<{
  relay_node_id: string;
  message: VoidUdpSwarmUpgradeOfferV1;
}>;

export type VoidUdpSwarmAuthenticatedControlAdapterSnapshotV1 = Readonly<{
  pending_request_count: number;
  active_route_count: number;
  pending_requests: readonly Readonly<{
    request_id: string;
    relay_node_id: string;
    target_node_id: string;
    stream_id: string;
  }>[];
  active_routes: readonly Readonly<{
    request_id: string;
    session_id: string;
    relay_node_id: string;
    peer_node_id: string;
    stream_id: string;
    ticket_id: string;
    expires_at_ms: number;
    offer_received: boolean;
  }>[];
}>;

type PendingRequestV1 = {
  request_id: string;
  relay_node_id: string;
  target_node_id: string;
  stream_id: string;
  requested_at_ms: number;
};

type ActiveRouteV1 = {
  request_id: string;
  session_id: string;
  relay_node_id: string;
  peer_node_id: string;
  stream_id: string;
  ticket_id: string;
  expires_at_ms: number;
  offer_received: boolean;
};

type StartedRelayStreamCheckV1 = (
  relayNodeId: string,
  peerNodeId: string,
  streamId: string,
) => boolean;

function safeNow(raw: number): number {
  if (!Number.isSafeInteger(raw) || raw < 0) {
    throw new Error("UDP swarm authenticated control adapter clock is invalid");
  }
  return raw;
}

function requireId(raw: string, label: string): string {
  if (!ID_RE.test(raw)) {
    throw new Error(`UDP swarm authenticated control adapter ${label} is invalid`);
  }
  return raw;
}

function newId(): string {
  return crypto.randomBytes(16).toString("hex");
}

function freezeDeliveries(
  deliveries: VoidUdpSwarmControlDeliveryV1[],
): readonly VoidUdpSwarmControlDeliveryV1[] {
  return Object.freeze(deliveries.map((entry) => Object.freeze(entry)));
}

export class VoidUdpSwarmAuthenticatedControlAdapterV1 {
  private readonly pendingRequests = new Map<string, PendingRequestV1>();
  private readonly activeRoutes = new Map<string, ActiveRouteV1>();
  private readonly ticketSessions = new Map<string, string>();

  constructor(private readonly options: {
    localNodeId: string;
    localPublicPem: string;
    localPrivateKey: crypto.KeyObject;
    isStartedRelayClientStream: StartedRelayStreamCheckV1;
    relayBridge?: VoidUdpSwarmRelayBridgeV1;
    allowNonPublicEndpoint?: boolean;
  }) {
    requireId(options.localNodeId, "local node ID");
    if (deriveVoidNodeIdFromPublicPemV1(options.localPublicPem) !== options.localNodeId) {
      throw new Error("UDP swarm authenticated control adapter local public-key binding mismatch");
    }
    const publicKey = crypto.createPublicKey(options.localPublicPem);
    if (publicKey.asymmetricKeyType !== "ed25519") {
      throw new Error("UDP swarm authenticated control adapter local key is not Ed25519");
    }
    const keyCheck = Buffer.from("VOID_P2P_UDP_SWARM_AUTHENTICATED_CONTROL_ADAPTER_V1", "utf8");
    const signature = crypto.sign(null, keyCheck, options.localPrivateKey);
    if (!crypto.verify(null, keyCheck, publicKey, signature)) {
      throw new Error("UDP swarm authenticated control adapter local private/public key mismatch");
    }
  }

  beginUpgrade(input: {
    relayNodeId: string;
    targetNodeId: string;
    streamId: string;
    nowMs?: number;
  }): Readonly<{
    request_id: string;
    control_delivery: VoidUdpSwarmControlDeliveryV1;
  }> {
    const nowMs = safeNow(input.nowMs ?? Date.now());
    const relayNodeId = requireId(input.relayNodeId, "relay node ID");
    const targetNodeId = requireId(input.targetNodeId, "target node ID");
    const streamId = requireId(input.streamId, "relay stream ID");
    if (
      relayNodeId === this.options.localNodeId ||
      targetNodeId === this.options.localNodeId ||
      relayNodeId === targetNodeId
    ) {
      throw new Error("UDP swarm authenticated control adapter upgrade endpoints are invalid");
    }

    this.sweep(nowMs);
    if (!this.options.isStartedRelayClientStream(relayNodeId, targetNodeId, streamId)) {
      throw new Error("UDP swarm authenticated control adapter requires a started local relay stream");
    }

    let requestId = "";
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const candidate = newId();
      if (!this.pendingRequests.has(candidate)) {
        requestId = candidate;
        break;
      }
    }
    if (!requestId) {
      throw new Error("UDP swarm authenticated control adapter request ID allocation collision");
    }

    const message = normalizeVoidUdpSwarmControlMessageV1({
      type: "UDP_SWARM_UPGRADE_REQUEST",
      protocol: 1,
      request_id: requestId,
      stream_id: streamId,
      target_node_id: targetNodeId,
    });
    if (!message || message.type !== "UDP_SWARM_UPGRADE_REQUEST") {
      throw new Error("UDP swarm authenticated control adapter request normalization failed");
    }

    this.pendingRequests.set(requestId, {
      request_id: requestId,
      relay_node_id: relayNodeId,
      target_node_id: targetNodeId,
      stream_id: streamId,
      requested_at_ms: nowMs,
    });

    return Object.freeze({
      request_id: requestId,
      control_delivery: Object.freeze({
        recipient_node_id: relayNodeId,
        message,
      }),
    });
  }

  handleAuthenticatedControl(input: {
    fromNodeId: string;
    message: unknown;
    nowMs?: number;
  }): Readonly<{
    control_deliveries: readonly VoidUdpSwarmControlDeliveryV1[];
    udp_probe_actions: readonly VoidUdpSwarmProbeActionV1[];
    direct_upgrade_offer?: VoidUdpSwarmDirectUpgradeOfferActionV1;
    relay_reject?: VoidUdpSwarmUpgradeRejectV1;
  }> {
    const nowMs = safeNow(input.nowMs ?? Date.now());
    const fromNodeId = requireId(input.fromNodeId, "authenticated sender node ID");
    this.sweep(nowMs);

    const message = normalizeVoidUdpSwarmControlMessageV1(
      input.message,
      this.options.allowNonPublicEndpoint === true,
    );
    if (!message) {
      throw new Error("UDP swarm authenticated control adapter message is malformed");
    }

    if (message.type === "UDP_SWARM_UPGRADE_REQUEST") {
      const bridge = this.options.relayBridge;
      if (!bridge) {
        throw new Error("UDP swarm authenticated control adapter relay bridge is unavailable");
      }
      const opened = bridge.openAuthenticatedRequest({
        authenticatedRequesterNodeId: fromNodeId,
        message,
        nowMs,
      });
      return Object.freeze({
        control_deliveries: freezeDeliveries(
          opened.ticket_deliveries.map((entry) => ({
            recipient_node_id: entry.recipient_node_id,
            message: entry.message,
          })),
        ),
        udp_probe_actions: Object.freeze([]),
      });
    }

    if (message.type === "UDP_SWARM_RENDEZVOUS_TICKET") {
      if (message.expires_at_ms <= nowMs) {
        throw new Error("UDP swarm authenticated control adapter rendezvous ticket is expired");
      }
      if (message.peer_node_id === this.options.localNodeId) {
        throw new Error("UDP swarm authenticated control adapter rendezvous peer is self");
      }
      if (
        !this.options.isStartedRelayClientStream(
          fromNodeId,
          message.peer_node_id,
          message.stream_id,
        )
      ) {
        throw new Error("UDP swarm authenticated control adapter ticket is not bound to a started local relay stream");
      }

      const pending = this.pendingRequests.get(message.request_id);
      if (
        pending &&
        (
          pending.relay_node_id !== fromNodeId ||
          pending.target_node_id !== message.peer_node_id ||
          pending.stream_id !== message.stream_id
        )
      ) {
        throw new Error("UDP swarm authenticated control adapter ticket mismatches pending request");
      }
      if (this.activeRoutes.has(message.session_id) || this.ticketSessions.has(message.ticket_id)) {
        throw new Error("UDP swarm authenticated control adapter duplicate rendezvous ticket rejected");
      }

      const route: ActiveRouteV1 = {
        request_id: message.request_id,
        session_id: message.session_id,
        relay_node_id: fromNodeId,
        peer_node_id: message.peer_node_id,
        stream_id: message.stream_id,
        ticket_id: message.ticket_id,
        expires_at_ms: message.expires_at_ms,
        offer_received: false,
      };
      this.activeRoutes.set(route.session_id, route);
      this.ticketSessions.set(route.ticket_id, route.session_id);
      if (pending) this.pendingRequests.delete(message.request_id);

      const first = createVoidUdpRendezvousProbeV1({
        ticketId: route.ticket_id,
        nodeId: this.options.localNodeId,
        privateKey: this.options.localPrivateKey,
      });
      let second: VoidUdpRendezvousProbeV1 | undefined;
      for (let attempt = 0; attempt < 8; attempt += 1) {
        const candidate = createVoidUdpRendezvousProbeV1({
          ticketId: route.ticket_id,
          nodeId: this.options.localNodeId,
          privateKey: this.options.localPrivateKey,
        });
        if (candidate.nonce !== first.nonce) {
          second = candidate;
          break;
        }
      }
      if (!second) {
        this.removeRoute(route.session_id);
        throw new Error("UDP swarm authenticated control adapter probe nonce allocation collision");
      }

      const action = (packet: VoidUdpRendezvousProbeV1): VoidUdpSwarmProbeActionV1 =>
        Object.freeze({
          relay_node_id: fromNodeId,
          relay_udp_endpoint: message.relay_udp_endpoint,
          request_id: route.request_id,
          session_id: route.session_id,
          stream_id: route.stream_id,
          peer_node_id: route.peer_node_id,
          packet,
        });

      return Object.freeze({
        control_deliveries: Object.freeze([]),
        udp_probe_actions: Object.freeze([action(first), action(second)]),
      });
    }

    if (message.type === "UDP_SWARM_UPGRADE_OFFER") {
      const route = this.activeRoutes.get(message.session_id);
      if (!route) {
        throw new Error("UDP swarm authenticated control adapter offer has no active route");
      }
      if (
        route.relay_node_id !== fromNodeId ||
        route.request_id !== message.request_id ||
        route.stream_id !== message.stream_id ||
        route.peer_node_id !== message.peer_node_id
      ) {
        throw new Error("UDP swarm authenticated control adapter offer route binding mismatch");
      }
      if (route.expires_at_ms <= nowMs) {
        this.removeRoute(route.session_id);
        throw new Error("UDP swarm authenticated control adapter offer route expired");
      }
      if (
        !this.options.isStartedRelayClientStream(
          route.relay_node_id,
          route.peer_node_id,
          route.stream_id,
        )
      ) {
        this.removeRoute(route.session_id);
        throw new Error("UDP swarm authenticated control adapter offer lost relay fallback stream");
      }
      if (route.offer_received) {
        throw new Error("UDP swarm authenticated control adapter duplicate upgrade offer rejected");
      }
      route.offer_received = true;
      return Object.freeze({
        control_deliveries: Object.freeze([]),
        udp_probe_actions: Object.freeze([]),
        direct_upgrade_offer: Object.freeze({
          relay_node_id: fromNodeId,
          message,
        }),
      });
    }

    const pending = this.pendingRequests.get(message.request_id);
    if (pending) {
      if (pending.relay_node_id !== fromNodeId) {
        throw new Error("UDP swarm authenticated control adapter reject sender mismatch");
      }
      this.pendingRequests.delete(message.request_id);
    }
    return Object.freeze({
      control_deliveries: Object.freeze([]),
      udp_probe_actions: Object.freeze([]),
      relay_reject: message,
    });
  }

  handleRelayUdpProbe(input: {
    packet: unknown;
    remoteAddress: string;
    remotePort: number;
    nowMs?: number;
  }): Readonly<{
    observation: VoidUdpRendezvousObservationV1;
    control_deliveries: readonly VoidUdpSwarmControlDeliveryV1[];
  }> {
    const nowMs = safeNow(input.nowMs ?? Date.now());
    const bridge = this.options.relayBridge;
    if (!bridge) {
      throw new Error("UDP swarm authenticated control adapter relay bridge is unavailable");
    }
    this.sweep(nowMs);
    const observed = bridge.observeRelayUdpProbe({
      packet: input.packet,
      remoteAddress: input.remoteAddress,
      remotePort: input.remotePort,
      nowMs,
    });
    return Object.freeze({
      observation: observed.observation,
      control_deliveries: freezeDeliveries(
        observed.offer_deliveries.map((entry) => ({
          recipient_node_id: entry.recipient_node_id,
          message: entry.message,
        })),
      ),
    });
  }

  removeAuthenticatedPeer(nodeId: string): void {
    if (!ID_RE.test(nodeId)) return;
    this.options.relayBridge?.removeAuthenticatedPeer(nodeId);
    for (const [requestId, pending] of this.pendingRequests) {
      if (pending.relay_node_id === nodeId || pending.target_node_id === nodeId) {
        this.pendingRequests.delete(requestId);
      }
    }
    for (const route of [...this.activeRoutes.values()]) {
      if (route.relay_node_id === nodeId || route.peer_node_id === nodeId) {
        this.removeRoute(route.session_id);
      }
    }
  }

  sweep(nowMs = Date.now()): void {
    const now = safeNow(nowMs);
    this.options.relayBridge?.sweep(now);
    for (const [requestId, pending] of this.pendingRequests) {
      if (now - pending.requested_at_ms > VOID_P2P_UDP_SWARM_CONTROL_ADAPTER_PENDING_TTL_MS_V1) {
        this.pendingRequests.delete(requestId);
      }
    }
    for (const route of [...this.activeRoutes.values()]) {
      if (
        route.expires_at_ms <= now ||
        !this.options.isStartedRelayClientStream(
          route.relay_node_id,
          route.peer_node_id,
          route.stream_id,
        )
      ) {
        this.removeRoute(route.session_id);
      }
    }
  }

  snapshot(nowMs = Date.now()): VoidUdpSwarmAuthenticatedControlAdapterSnapshotV1 {
    const now = safeNow(nowMs);
    this.sweep(now);
    const pendingRequests = [...this.pendingRequests.values()]
      .map((entry) => Object.freeze({
        request_id: entry.request_id,
        relay_node_id: entry.relay_node_id,
        target_node_id: entry.target_node_id,
        stream_id: entry.stream_id,
      }))
      .sort((a, b) => a.request_id.localeCompare(b.request_id));
    const activeRoutes = [...this.activeRoutes.values()]
      .map((entry) => Object.freeze({
        request_id: entry.request_id,
        session_id: entry.session_id,
        relay_node_id: entry.relay_node_id,
        peer_node_id: entry.peer_node_id,
        stream_id: entry.stream_id,
        ticket_id: entry.ticket_id,
        expires_at_ms: entry.expires_at_ms,
        offer_received: entry.offer_received,
      }))
      .sort((a, b) => a.session_id.localeCompare(b.session_id));
    return Object.freeze({
      pending_request_count: pendingRequests.length,
      active_route_count: activeRoutes.length,
      pending_requests: Object.freeze(pendingRequests),
      active_routes: Object.freeze(activeRoutes),
    });
  }

  private removeRoute(sessionId: string): void {
    const route = this.activeRoutes.get(sessionId);
    if (!route) return;
    this.activeRoutes.delete(sessionId);
    this.ticketSessions.delete(route.ticket_id);
  }
}
