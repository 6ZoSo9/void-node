// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025-2026 6ZoSo9

import {
  VoidRelayServerStateV1,
  type VoidRelayStreamRecordV1,
} from "./relay_v1.js";
import {
  VoidUdpRendezvousStateV1,
  normalizeVoidUdpRendezvousProbeV1,
  type VoidUdpRendezvousObservationV1,
} from "./udp_rendezvous_v1.js";
import {
  VoidUdpSwarmRelayCoordinatorV1,
  normalizeVoidUdpSwarmControlMessageV1,
  type VoidUdpSwarmRelaySessionSnapshotV1,
  type VoidUdpSwarmRendezvousTicketMessageV1,
  type VoidUdpSwarmUpgradeOfferV1,
} from "./udp_swarm_control_v1.js";

const NODE_ID_RE = /^[0-9a-f]{32}$/;

export const VOID_P2P_UDP_SWARM_RELAY_BRIDGE_AUTHORITY_V1 = Object.freeze({
  authenticated_requester_required: true,
  started_relay_stream_required: true,
  relay_stream_counterpart_binding_required: true,
  verified_peer_public_key_lookup_required: true,
  key_id_binding_reverified_by_coordinator: true,
  signed_udp_mapping_probe_required: true,
  stable_mapping_both_endpoints_required_before_offer: true,
  relay_stream_must_remain_active_until_offer: true,
  duplicate_request_id_rejected: true,
  node_core_mount_performed: false,
  udp_socket_allocation_performed: false,
  direct_transport_activation_performed: false,
  relay_retirement_authorized: false,
  relay_fallback_preserved: true,
  router_configuration_required: false,
  port_forward_required: false,
  wallet_signer_validator_wc_money_authority: 0,
});

export type VoidUdpSwarmRelayTicketDeliveryV1 = Readonly<{
  recipient_node_id: string;
  message: VoidUdpSwarmRendezvousTicketMessageV1;
}>;

export type VoidUdpSwarmRelayOfferDeliveryV1 = Readonly<{
  recipient_node_id: string;
  message: VoidUdpSwarmUpgradeOfferV1;
}>;

export type VoidUdpSwarmRelayBridgeSnapshotV1 = Readonly<{
  active_session_count: number;
  sessions: readonly Readonly<{
    request_id: string;
    session_id: string;
    stream_id: string;
    source_node_id: string;
    target_node_id: string;
  }>[];
}>;

type RouteV1 = {
  request_id: string;
  session_id: string;
  stream_id: string;
  source_node_id: string;
  target_node_id: string;
  source_ticket_id: string;
  target_ticket_id: string;
};

type AuthenticatedPublicPemLookupV1 = (nodeId: string) => string | undefined;

function safeNow(raw: number): number {
  if (!Number.isSafeInteger(raw) || raw < 0) {
    throw new Error("UDP swarm relay bridge clock is invalid");
  }
  return raw;
}

function sameStreamEndpoints(
  stream: VoidRelayStreamRecordV1,
  a: string,
  b: string,
): boolean {
  return (
    (stream.source_node_id === a && stream.target_node_id === b) ||
    (stream.source_node_id === b && stream.target_node_id === a)
  );
}

export class VoidUdpSwarmRelayBridgeV1 {
  private readonly rendezvous: VoidUdpRendezvousStateV1;
  private readonly coordinator: VoidUdpSwarmRelayCoordinatorV1;
  private readonly routes = new Map<string, RouteV1>();
  private readonly ticketSessions = new Map<string, string>();
  private readonly requestSessions = new Map<string, string>();

  constructor(
    private readonly relayState: VoidRelayServerStateV1,
    relayUdpEndpoint: string,
    private readonly authenticatedPublicPemForNodeId: AuthenticatedPublicPemLookupV1,
    private readonly allowNonPublicEndpoint = false,
  ) {
    this.rendezvous = new VoidUdpRendezvousStateV1(allowNonPublicEndpoint);
    this.coordinator = new VoidUdpSwarmRelayCoordinatorV1(
      this.rendezvous,
      relayUdpEndpoint,
      allowNonPublicEndpoint,
    );
  }

  openAuthenticatedRequest(input: {
    authenticatedRequesterNodeId: string;
    message: unknown;
    nowMs?: number;
  }): Readonly<{
    session: VoidUdpSwarmRelaySessionSnapshotV1;
    ticket_deliveries: readonly [
      VoidUdpSwarmRelayTicketDeliveryV1,
      VoidUdpSwarmRelayTicketDeliveryV1,
    ];
  }> {
    const nowMs = safeNow(input.nowMs ?? Date.now());
    const requesterNodeId = input.authenticatedRequesterNodeId;
    if (!NODE_ID_RE.test(requesterNodeId)) {
      throw new Error("UDP swarm relay bridge requester node ID is invalid");
    }

    this.sweep(nowMs);
    const message = normalizeVoidUdpSwarmControlMessageV1(
      input.message,
      this.allowNonPublicEndpoint,
    );
    if (!message || message.type !== "UDP_SWARM_UPGRADE_REQUEST") {
      throw new Error("UDP swarm relay bridge request is malformed");
    }
    if (this.requestSessions.has(message.request_id)) {
      throw new Error("UDP swarm relay bridge duplicate request ID rejected");
    }

    const stream = this.startedStream(message.stream_id, nowMs);
    if (!stream) {
      throw new Error("UDP swarm relay bridge requires an active started relay stream");
    }
    if (
      requesterNodeId !== stream.source_node_id &&
      requesterNodeId !== stream.target_node_id
    ) {
      throw new Error("UDP swarm relay bridge requester is not a relay stream endpoint");
    }

    const counterpartNodeId =
      requesterNodeId === stream.source_node_id
        ? stream.target_node_id
        : stream.source_node_id;
    if (message.target_node_id !== counterpartNodeId) {
      throw new Error("UDP swarm relay bridge target does not match relay stream counterpart");
    }

    const requesterPublicPem = this.authenticatedPublicPemForNodeId(requesterNodeId);
    const targetPublicPem = this.authenticatedPublicPemForNodeId(counterpartNodeId);
    if (!requesterPublicPem || !targetPublicPem) {
      throw new Error("UDP swarm relay bridge authenticated public key missing");
    }

    const opened = this.coordinator.openAuthenticatedSession({
      requestId: message.request_id,
      streamId: stream.stream_id,
      authenticatedRequesterNodeId: requesterNodeId,
      requesterPublicPem,
      targetNodeId: counterpartNodeId,
      targetPublicPem,
      streamSourceNodeId: stream.source_node_id,
      streamTargetNodeId: stream.target_node_id,
      nowMs,
    });

    const route: RouteV1 = {
      request_id: opened.session.request_id,
      session_id: opened.session.session_id,
      stream_id: opened.session.stream_id,
      source_node_id: opened.session.source_node_id,
      target_node_id: opened.session.target_node_id,
      source_ticket_id: opened.session.source_ticket_id,
      target_ticket_id: opened.session.target_ticket_id,
    };
    this.routes.set(route.session_id, route);
    this.ticketSessions.set(route.source_ticket_id, route.session_id);
    this.ticketSessions.set(route.target_ticket_id, route.session_id);
    this.requestSessions.set(route.request_id, route.session_id);

    return Object.freeze({
      session: opened.session,
      ticket_deliveries: Object.freeze([
        Object.freeze({
          recipient_node_id: route.source_node_id,
          message: opened.requester_ticket,
        }),
        Object.freeze({
          recipient_node_id: route.target_node_id,
          message: opened.target_ticket,
        }),
      ]) as readonly [
        VoidUdpSwarmRelayTicketDeliveryV1,
        VoidUdpSwarmRelayTicketDeliveryV1,
      ],
    });
  }

  observeRelayUdpProbe(input: {
    packet: unknown;
    remoteAddress: string;
    remotePort: number;
    nowMs?: number;
  }): Readonly<{
    observation: VoidUdpRendezvousObservationV1;
    offer_deliveries: readonly VoidUdpSwarmRelayOfferDeliveryV1[];
  }> {
    const nowMs = safeNow(input.nowMs ?? Date.now());
    this.sweep(nowMs);
    const packet = normalizeVoidUdpRendezvousProbeV1(input.packet);
    if (!packet) throw new Error("UDP swarm relay bridge probe is malformed");

    const sessionId = this.ticketSessions.get(packet.ticket_id);
    const route = sessionId ? this.routes.get(sessionId) : undefined;
    if (!route) {
      throw new Error("UDP swarm relay bridge probe has no active relay-bound session");
    }
    const stream = this.startedStream(route.stream_id, nowMs);
    if (!stream || !sameStreamEndpoints(stream, route.source_node_id, route.target_node_id)) {
      this.removeRoute(route.session_id);
      throw new Error("UDP swarm relay bridge relay stream is no longer active");
    }

    const observed = this.coordinator.observeProbe({
      packet,
      remoteAddress: input.remoteAddress,
      remotePort: input.remotePort,
      nowMs,
    });
    if (!observed.offers) {
      return Object.freeze({
        observation: observed.observation,
        offer_deliveries: Object.freeze([]),
      });
    }

    const deliveries: VoidUdpSwarmRelayOfferDeliveryV1[] = [];
    for (const offer of observed.offers) {
      let recipientNodeId: string;
      if (offer.peer_node_id === route.target_node_id) {
        recipientNodeId = route.source_node_id;
      } else if (offer.peer_node_id === route.source_node_id) {
        recipientNodeId = route.target_node_id;
      } else {
        throw new Error("UDP swarm relay bridge offer peer is outside relay session");
      }
      deliveries.push(Object.freeze({
        recipient_node_id: recipientNodeId,
        message: offer,
      }));
    }
    if (deliveries.length !== 2) {
      throw new Error("UDP swarm relay bridge expected reciprocal upgrade offers");
    }

    return Object.freeze({
      observation: observed.observation,
      offer_deliveries: Object.freeze(deliveries),
    });
  }

  sessionFor(
    sessionId: string,
    nowMs = Date.now(),
  ): VoidUdpSwarmRelaySessionSnapshotV1 | undefined {
    const now = safeNow(nowMs);
    this.sweep(now);
    if (!this.routes.has(sessionId)) return;
    return this.coordinator.sessionFor(sessionId, now);
  }

  removeAuthenticatedPeer(nodeId: string): void {
    if (!NODE_ID_RE.test(nodeId)) return;
    this.coordinator.removePeer(nodeId);
    for (const route of [...this.routes.values()]) {
      if (route.source_node_id === nodeId || route.target_node_id === nodeId) {
        this.removeRoute(route.session_id);
      }
    }
  }

  sweep(nowMs = Date.now()): void {
    const now = safeNow(nowMs);
    this.coordinator.sweep(now);
    const activeStreams = this.relayState.snapshot(now).streams;
    for (const route of [...this.routes.values()]) {
      const session = this.coordinator.sessionFor(route.session_id, now);
      const stream = activeStreams.find((entry) => entry.stream_id === route.stream_id);
      if (
        !session ||
        !stream ||
        !stream.started ||
        !sameStreamEndpoints(stream, route.source_node_id, route.target_node_id)
      ) {
        this.removeRoute(route.session_id);
      }
    }
  }

  snapshot(nowMs = Date.now()): VoidUdpSwarmRelayBridgeSnapshotV1 {
    const now = safeNow(nowMs);
    this.sweep(now);
    const sessions = [...this.routes.values()]
      .map((route) => Object.freeze({
        request_id: route.request_id,
        session_id: route.session_id,
        stream_id: route.stream_id,
        source_node_id: route.source_node_id,
        target_node_id: route.target_node_id,
      }))
      .sort((a, b) => a.session_id.localeCompare(b.session_id));
    return Object.freeze({
      active_session_count: sessions.length,
      sessions: Object.freeze(sessions),
    });
  }

  private startedStream(
    streamId: string,
    nowMs: number,
  ): VoidRelayStreamRecordV1 | undefined {
    return this.relayState
      .snapshot(nowMs)
      .streams
      .find((stream) => stream.stream_id === streamId && stream.started);
  }

  private removeRoute(sessionId: string): void {
    const route = this.routes.get(sessionId);
    if (!route) return;
    this.routes.delete(sessionId);
    this.ticketSessions.delete(route.source_ticket_id);
    this.ticketSessions.delete(route.target_ticket_id);
    this.requestSessions.delete(route.request_id);
  }
}
