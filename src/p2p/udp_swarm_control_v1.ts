// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025-2026 6ZoSo9

import * as crypto from "node:crypto";

import { deriveVoidNodeIdFromPublicPemV1 } from "./auth_v1.js";
import { normalizeVoidUdpObservedEndpointV1 } from "./udp_hole_punch_v1.js";
import {
  VOID_P2P_UDP_RENDEZVOUS_MAX_PROBES_PER_TICKET_V1,
  VoidUdpRendezvousStateV1,
  normalizeVoidUdpRendezvousProbeV1,
  type VoidUdpRendezvousObservationV1,
  type VoidUdpRendezvousProbeV1,
  type VoidUdpRendezvousTicketV1,
} from "./udp_rendezvous_v1.js";

export const VOID_P2P_UDP_SWARM_CONTROL_PROTOCOL_VERSION_V1 = 1;
export const VOID_P2P_UDP_SWARM_CONTROL_MAX_SESSIONS_V1 = 128;
export const VOID_P2P_UDP_SWARM_CONTROL_DEFAULT_START_DELAY_MS_V1 = 100;
export const VOID_P2P_UDP_SWARM_CONTROL_DEFAULT_ATTEMPT_TIMEOUT_MS_V1 = 3_000;
export const VOID_P2P_UDP_SWARM_CONTROL_MAX_REASON_CHARS_V1 = 160;

const ID_RE = /^[0-9a-f]{32}$/;
const NODE_ID_RE = /^[0-9a-f]{32}$/;
const CONTROL_RE = /[\u0000-\u001f\u007f]/;

export type VoidUdpSwarmUpgradeRequestV1 = Readonly<{
  type: "UDP_SWARM_UPGRADE_REQUEST";
  protocol: 1;
  request_id: string;
  stream_id: string;
  target_node_id: string;
}>;

export type VoidUdpSwarmRendezvousTicketMessageV1 = Readonly<{
  type: "UDP_SWARM_RENDEZVOUS_TICKET";
  protocol: 1;
  request_id: string;
  session_id: string;
  stream_id: string;
  ticket_id: string;
  peer_node_id: string;
  relay_udp_endpoint: string;
  expires_at_ms: number;
}>;

export type VoidUdpSwarmUpgradeOfferV1 = Readonly<{
  type: "UDP_SWARM_UPGRADE_OFFER";
  protocol: 1;
  request_id: string;
  session_id: string;
  stream_id: string;
  peer_node_id: string;
  local_observed_endpoint: string;
  peer_observed_endpoint: string;
  local_observation: VoidUdpRendezvousObservationV1;
  peer_observation: VoidUdpRendezvousObservationV1;
  start_delay_ms: number;
  attempt_timeout_ms: number;
}>;

export type VoidUdpSwarmUpgradeRejectV1 = Readonly<{
  type: "UDP_SWARM_UPGRADE_REJECT";
  protocol: 1;
  request_id: string;
  reason: string;
}>;

export type VoidUdpSwarmControlMessageV1 =
  | VoidUdpSwarmUpgradeRequestV1
  | VoidUdpSwarmRendezvousTicketMessageV1
  | VoidUdpSwarmUpgradeOfferV1
  | VoidUdpSwarmUpgradeRejectV1;

export type VoidUdpSwarmRelaySessionSnapshotV1 = Readonly<{
  request_id: string;
  session_id: string;
  stream_id: string;
  source_node_id: string;
  target_node_id: string;
  source_ticket_id: string;
  target_ticket_id: string;
  source_observation?: VoidUdpRendezvousObservationV1;
  target_observation?: VoidUdpRendezvousObservationV1;
  offers_emitted: boolean;
  expires_at_ms: number;
}>;

export const VOID_P2P_UDP_SWARM_CONTROL_AUTHORITY_V1 = Object.freeze({
  authenticated_relay_stream_required: true,
  ticket_node_identity_binding_required: true,
  relay_udp_endpoint_is_transport_hint_only: true,
  stable_mapping_both_endpoints_required_before_offer: true,
  mapping_conflict_offer_allowed: false,
  offer_defines_peer_identity: false,
  normal_void_peer_auth_still_required: true,
  relay_fallback_preserved: true,
  runtime_node_core_mount_performed: false,
  router_configuration_required: false,
  port_forward_required: false,
  wallet_signer_validator_wc_money_authority: 0,
});

type MutableSessionV1 = {
  request_id: string;
  session_id: string;
  stream_id: string;
  source_node_id: string;
  target_node_id: string;
  source_ticket: VoidUdpRendezvousTicketV1;
  target_ticket: VoidUdpRendezvousTicketV1;
  source_observation?: VoidUdpRendezvousObservationV1;
  target_observation?: VoidUdpRendezvousObservationV1;
  offers_emitted: boolean;
  expires_at_ms: number;
};

type TicketRoleV1 = Readonly<{
  session_id: string;
  role: "source" | "target";
}>;

function exactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  return actual.length === wanted.length && actual.every((key, index) => key === wanted[index]);
}

function idValue(raw: unknown): string | undefined {
  return typeof raw === "string" && ID_RE.test(raw) ? raw : undefined;
}

function nodeId(raw: unknown): string | undefined {
  return typeof raw === "string" && NODE_ID_RE.test(raw) ? raw : undefined;
}

function safeInteger(raw: unknown, min: number, max: number): number | undefined {
  return typeof raw === "number" && Number.isSafeInteger(raw) && raw >= min && raw <= max
    ? raw
    : undefined;
}

function reasonText(raw: unknown): string | undefined {
  if (
    typeof raw !== "string" ||
    raw.length < 1 ||
    raw.length > VOID_P2P_UDP_SWARM_CONTROL_MAX_REASON_CHARS_V1 ||
    raw !== raw.trim() ||
    CONTROL_RE.test(raw)
  ) return;
  return raw;
}

function publicPemMatchesNodeId(publicPem: string, expectedNodeId: string): boolean {
  if (typeof publicPem !== "string" || publicPem.length < 64 || publicPem.length > 4_096) {
    return false;
  }
  try {
    const key = crypto.createPublicKey(publicPem);
    if (key.asymmetricKeyType !== "ed25519") return false;
  } catch {
    return false;
  }
  return deriveVoidNodeIdFromPublicPemV1(publicPem) === expectedNodeId;
}

function newId(): string {
  return crypto.randomBytes(16).toString("hex");
}

function normalizedEndpoint(raw: unknown, allowNonPublic: boolean): string | undefined {
  return normalizeVoidUdpObservedEndpointV1(raw, allowNonPublic);
}

function normalizedStableObservation(
  raw: unknown,
  allowNonPublicEndpoint: boolean,
): VoidUdpRendezvousObservationV1 | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return;
  const value = raw as Record<string, unknown>;
  if (!exactKeys(value, [
    "ticket_id",
    "node_id",
    "observed_endpoint",
    "first_seen_ms",
    "last_seen_ms",
    "probe_count",
    "stable_same_rendezvous",
    "mapping_conflicted",
  ])) return;
  const ticket_id = idValue(value.ticket_id);
  const node_id = nodeId(value.node_id);
  const observed_endpoint = normalizedEndpoint(
    value.observed_endpoint,
    allowNonPublicEndpoint,
  );
  const first_seen_ms = safeInteger(value.first_seen_ms, 0, Number.MAX_SAFE_INTEGER);
  const last_seen_ms = safeInteger(value.last_seen_ms, 0, Number.MAX_SAFE_INTEGER);
  const probe_count = safeInteger(
    value.probe_count,
    2,
    VOID_P2P_UDP_RENDEZVOUS_MAX_PROBES_PER_TICKET_V1,
  );
  if (
    !ticket_id ||
    !node_id ||
    !observed_endpoint ||
    first_seen_ms === undefined ||
    last_seen_ms === undefined ||
    last_seen_ms < first_seen_ms ||
    probe_count === undefined ||
    value.stable_same_rendezvous !== true ||
    value.mapping_conflicted !== false
  ) return;
  return Object.freeze({
    ticket_id,
    node_id,
    observed_endpoint,
    first_seen_ms,
    last_seen_ms,
    probe_count,
    stable_same_rendezvous: true,
    mapping_conflicted: false,
  });
}

export function normalizeVoidUdpSwarmControlMessageV1(
  raw: unknown,
  allowNonPublicEndpoint = false,
): VoidUdpSwarmControlMessageV1 | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return;
  const value = raw as Record<string, unknown>;
  const type = value.type;
  if (value.protocol !== VOID_P2P_UDP_SWARM_CONTROL_PROTOCOL_VERSION_V1) return;

  if (type === "UDP_SWARM_UPGRADE_REQUEST") {
    if (!exactKeys(value, ["type", "protocol", "request_id", "stream_id", "target_node_id"])) return;
    const request_id = idValue(value.request_id);
    const stream_id = idValue(value.stream_id);
    const target_node_id = nodeId(value.target_node_id);
    if (!request_id || !stream_id || !target_node_id) return;
    return Object.freeze({ type, protocol: 1, request_id, stream_id, target_node_id });
  }

  if (type === "UDP_SWARM_RENDEZVOUS_TICKET") {
    if (!exactKeys(value, [
      "type", "protocol", "request_id", "session_id", "stream_id", "ticket_id",
      "peer_node_id", "relay_udp_endpoint", "expires_at_ms",
    ])) return;
    const request_id = idValue(value.request_id);
    const session_id = idValue(value.session_id);
    const stream_id = idValue(value.stream_id);
    const ticket_id = idValue(value.ticket_id);
    const peer_node_id = nodeId(value.peer_node_id);
    const relay_udp_endpoint = normalizedEndpoint(value.relay_udp_endpoint, allowNonPublicEndpoint);
    const expires_at_ms = safeInteger(value.expires_at_ms, 1, Number.MAX_SAFE_INTEGER);
    if (!request_id || !session_id || !stream_id || !ticket_id || !peer_node_id ||
        !relay_udp_endpoint || expires_at_ms === undefined) return;
    return Object.freeze({
      type, protocol: 1, request_id, session_id, stream_id, ticket_id,
      peer_node_id, relay_udp_endpoint, expires_at_ms,
    });
  }

  if (type === "UDP_SWARM_UPGRADE_OFFER") {
    if (!exactKeys(value, [
      "type", "protocol", "request_id", "session_id", "stream_id", "peer_node_id",
      "local_observed_endpoint", "peer_observed_endpoint", "local_observation",
      "peer_observation", "start_delay_ms", "attempt_timeout_ms",
    ])) return;
    const request_id = idValue(value.request_id);
    const session_id = idValue(value.session_id);
    const stream_id = idValue(value.stream_id);
    const peer_node_id = nodeId(value.peer_node_id);
    const local_observed_endpoint = normalizedEndpoint(
      value.local_observed_endpoint,
      allowNonPublicEndpoint,
    );
    const peer_observed_endpoint = normalizedEndpoint(
      value.peer_observed_endpoint,
      allowNonPublicEndpoint,
    );
    const local_observation = normalizedStableObservation(
      value.local_observation,
      allowNonPublicEndpoint,
    );
    const peer_observation = normalizedStableObservation(
      value.peer_observation,
      allowNonPublicEndpoint,
    );
    const start_delay_ms = safeInteger(value.start_delay_ms, 25, 2_000);
    const attempt_timeout_ms = safeInteger(value.attempt_timeout_ms, 1, 10_000);
    if (!request_id || !session_id || !stream_id || !peer_node_id ||
        !local_observed_endpoint || !peer_observed_endpoint ||
        !local_observation || !peer_observation ||
        peer_observation.node_id !== peer_node_id ||
        local_observation.node_id === peer_node_id ||
        local_observation.ticket_id === peer_observation.ticket_id ||
        local_observation.observed_endpoint !== local_observed_endpoint ||
        peer_observation.observed_endpoint !== peer_observed_endpoint ||
        start_delay_ms === undefined || attempt_timeout_ms === undefined) return;
    return Object.freeze({
      type, protocol: 1, request_id, session_id, stream_id, peer_node_id,
      local_observed_endpoint, peer_observed_endpoint,
      local_observation, peer_observation, start_delay_ms, attempt_timeout_ms,
    });
  }

  if (type === "UDP_SWARM_UPGRADE_REJECT") {
    if (!exactKeys(value, ["type", "protocol", "request_id", "reason"])) return;
    const request_id = idValue(value.request_id);
    const reason = reasonText(value.reason);
    if (!request_id || !reason) return;
    return Object.freeze({ type, protocol: 1, request_id, reason });
  }

  return;
}

export class VoidUdpSwarmRelayCoordinatorV1 {
  private readonly relayUdpEndpoint: string;
  private readonly sessions = new Map<string, MutableSessionV1>();
  private readonly ticketRoles = new Map<string, TicketRoleV1>();

  constructor(
    private readonly rendezvous: VoidUdpRendezvousStateV1,
    relayUdpEndpoint: string,
    private readonly allowNonPublicEndpoint = false,
  ) {
    const normalized = normalizedEndpoint(relayUdpEndpoint, allowNonPublicEndpoint);
    if (!normalized) throw new Error("UDP swarm relay endpoint is invalid");
    this.relayUdpEndpoint = normalized;
  }

  openAuthenticatedSession(input: {
    requestId?: string;
    streamId: string;
    authenticatedRequesterNodeId: string;
    requesterPublicPem: string;
    targetNodeId: string;
    targetPublicPem: string;
    streamSourceNodeId: string;
    streamTargetNodeId: string;
    ticketTtlMs?: number;
    nowMs?: number;
  }): Readonly<{
    session: VoidUdpSwarmRelaySessionSnapshotV1;
    requester_ticket: VoidUdpSwarmRendezvousTicketMessageV1;
    target_ticket: VoidUdpSwarmRendezvousTicketMessageV1;
  }> {
    const requestId = idValue(input.requestId ?? newId());
    const streamId = idValue(input.streamId);
    const requesterNodeId = nodeId(input.authenticatedRequesterNodeId);
    const targetNodeId = nodeId(input.targetNodeId);
    const streamSourceNodeId = nodeId(input.streamSourceNodeId);
    const streamTargetNodeId = nodeId(input.streamTargetNodeId);
    const nowMs = safeInteger(input.nowMs ?? Date.now(), 0, Number.MAX_SAFE_INTEGER);
    if (!requestId || !streamId || !requesterNodeId || !targetNodeId ||
        !streamSourceNodeId || !streamTargetNodeId || nowMs === undefined ||
        requesterNodeId === targetNodeId) {
      throw new Error("UDP swarm authenticated relay session input is invalid");
    }
    const streamMatches =
      (streamSourceNodeId === requesterNodeId && streamTargetNodeId === targetNodeId) ||
      (streamTargetNodeId === requesterNodeId && streamSourceNodeId === targetNodeId);
    if (!streamMatches) {
      throw new Error("UDP swarm request is not bound to the authenticated relay stream endpoints");
    }
    if (!publicPemMatchesNodeId(input.requesterPublicPem, requesterNodeId)) {
      throw new Error("UDP swarm requester identity/public-key binding mismatch");
    }
    if (!publicPemMatchesNodeId(input.targetPublicPem, targetNodeId)) {
      throw new Error("UDP swarm target identity/public-key binding mismatch");
    }

    this.sweep(nowMs);
    if (this.sessions.size >= VOID_P2P_UDP_SWARM_CONTROL_MAX_SESSIONS_V1) {
      throw new Error("UDP swarm relay coordination capacity reached");
    }

    const sourceTicket = this.rendezvous.issueAuthenticatedTicket({
      authenticatedNodeId: requesterNodeId,
      authenticatedPublicPem: input.requesterPublicPem,
      ttlMs: input.ticketTtlMs,
      nowMs,
    });
    const targetTicket = this.rendezvous.issueAuthenticatedTicket({
      authenticatedNodeId: targetNodeId,
      authenticatedPublicPem: input.targetPublicPem,
      ttlMs: input.ticketTtlMs,
      nowMs,
    });
    const sessionId = newId();
    const expiresAt = Math.min(sourceTicket.expires_at_ms, targetTicket.expires_at_ms);
    const session: MutableSessionV1 = {
      request_id: requestId,
      session_id: sessionId,
      stream_id: streamId,
      source_node_id: requesterNodeId,
      target_node_id: targetNodeId,
      source_ticket: sourceTicket,
      target_ticket: targetTicket,
      offers_emitted: false,
      expires_at_ms: expiresAt,
    };
    this.sessions.set(sessionId, session);
    this.ticketRoles.set(sourceTicket.ticket_id, { session_id: sessionId, role: "source" });
    this.ticketRoles.set(targetTicket.ticket_id, { session_id: sessionId, role: "target" });

    const requesterTicket = this.ticketMessage(session, "source");
    const targetTicketMessage = this.ticketMessage(session, "target");
    return Object.freeze({
      session: this.snapshotOne(session),
      requester_ticket: requesterTicket,
      target_ticket: targetTicketMessage,
    });
  }

  observeProbe(input: {
    packet: unknown;
    remoteAddress: string;
    remotePort: number;
    nowMs?: number;
  }): Readonly<{
    observation: VoidUdpRendezvousObservationV1;
    offers?: readonly [VoidUdpSwarmUpgradeOfferV1, VoidUdpSwarmUpgradeOfferV1];
  }> {
    const nowMs = safeInteger(input.nowMs ?? Date.now(), 0, Number.MAX_SAFE_INTEGER);
    if (nowMs === undefined) throw new Error("UDP swarm probe time is invalid");
    this.sweep(nowMs);
    const probe = normalizeVoidUdpRendezvousProbeV1(input.packet);
    if (!probe) throw new Error("UDP swarm rendezvous probe is malformed");
    const role = this.ticketRoles.get(probe.ticket_id);
    if (!role) throw new Error("UDP swarm rendezvous ticket is not part of an active session");
    const session = this.sessions.get(role.session_id);
    if (!session || session.expires_at_ms <= nowMs) {
      throw new Error("UDP swarm relay coordination session is missing or expired");
    }
    const expectedTicket = role.role === "source" ? session.source_ticket : session.target_ticket;
    if (expectedTicket.ticket_id !== probe.ticket_id || expectedTicket.node_id !== probe.node_id) {
      throw new Error("UDP swarm rendezvous ticket/session binding mismatch");
    }

    const observation = this.rendezvous.observeProbe({
      packet: probe,
      remoteAddress: input.remoteAddress,
      remotePort: input.remotePort,
      nowMs,
    });
    if (role.role === "source") session.source_observation = observation;
    else session.target_observation = observation;

    const offers = this.maybeOffers(session);
    return Object.freeze({
      observation,
      offers: offers ? Object.freeze(offers) : undefined,
    });
  }

  sessionFor(sessionId: string, nowMs = Date.now()): VoidUdpSwarmRelaySessionSnapshotV1 | undefined {
    this.sweep(nowMs);
    const session = this.sessions.get(sessionId);
    return session ? this.snapshotOne(session) : undefined;
  }

  removePeer(nodeIdValue: string): void {
    for (const [sessionId, session] of this.sessions) {
      if (session.source_node_id === nodeIdValue || session.target_node_id === nodeIdValue) {
        this.removeSession(sessionId);
      }
    }
  }

  sweep(nowMs = Date.now()): void {
    const normalized = safeInteger(nowMs, 0, Number.MAX_SAFE_INTEGER);
    if (normalized === undefined) return;
    this.rendezvous.sweep(normalized);
    for (const [sessionId, session] of this.sessions) {
      if (session.expires_at_ms <= normalized) this.removeSession(sessionId);
    }
  }

  private maybeOffers(
    session: MutableSessionV1,
  ): [VoidUdpSwarmUpgradeOfferV1, VoidUdpSwarmUpgradeOfferV1] | undefined {
    if (session.offers_emitted) return;
    const source = session.source_observation;
    const target = session.target_observation;
    if (!source || !target) return;
    if (
      source.node_id !== session.source_node_id ||
      target.node_id !== session.target_node_id ||
      source.stable_same_rendezvous !== true ||
      target.stable_same_rendezvous !== true ||
      source.mapping_conflicted ||
      target.mapping_conflicted
    ) return;

    const sourceOffer = this.offerMessage(
      session,
      session.target_node_id,
      source,
      target,
    );
    const targetOffer = this.offerMessage(
      session,
      session.source_node_id,
      target,
      source,
    );
    session.offers_emitted = true;
    return [sourceOffer, targetOffer];
  }

  private ticketMessage(
    session: MutableSessionV1,
    role: "source" | "target",
  ): VoidUdpSwarmRendezvousTicketMessageV1 {
    const ticket = role === "source" ? session.source_ticket : session.target_ticket;
    const peerNodeId = role === "source" ? session.target_node_id : session.source_node_id;
    const message: VoidUdpSwarmRendezvousTicketMessageV1 = {
      type: "UDP_SWARM_RENDEZVOUS_TICKET",
      protocol: 1,
      request_id: session.request_id,
      session_id: session.session_id,
      stream_id: session.stream_id,
      ticket_id: ticket.ticket_id,
      peer_node_id: peerNodeId,
      relay_udp_endpoint: this.relayUdpEndpoint,
      expires_at_ms: ticket.expires_at_ms,
    };
    const normalized = normalizeVoidUdpSwarmControlMessageV1(
      message,
      this.allowNonPublicEndpoint,
    );
    if (!normalized || normalized.type !== "UDP_SWARM_RENDEZVOUS_TICKET") {
      throw new Error("UDP swarm rendezvous ticket message failed normalization");
    }
    return normalized;
  }

  private offerMessage(
    session: MutableSessionV1,
    peerNodeId: string,
    localObservation: VoidUdpRendezvousObservationV1,
    peerObservation: VoidUdpRendezvousObservationV1,
  ): VoidUdpSwarmUpgradeOfferV1 {
    const message: VoidUdpSwarmUpgradeOfferV1 = {
      type: "UDP_SWARM_UPGRADE_OFFER",
      protocol: 1,
      request_id: session.request_id,
      session_id: session.session_id,
      stream_id: session.stream_id,
      peer_node_id: peerNodeId,
      local_observed_endpoint: localObservation.observed_endpoint,
      peer_observed_endpoint: peerObservation.observed_endpoint,
      local_observation: localObservation,
      peer_observation: peerObservation,
      start_delay_ms: VOID_P2P_UDP_SWARM_CONTROL_DEFAULT_START_DELAY_MS_V1,
      attempt_timeout_ms: VOID_P2P_UDP_SWARM_CONTROL_DEFAULT_ATTEMPT_TIMEOUT_MS_V1,
    };
    const normalized = normalizeVoidUdpSwarmControlMessageV1(
      message,
      this.allowNonPublicEndpoint,
    );
    if (!normalized || normalized.type !== "UDP_SWARM_UPGRADE_OFFER") {
      throw new Error("UDP swarm upgrade offer failed normalization");
    }
    return normalized;
  }

  private snapshotOne(session: MutableSessionV1): VoidUdpSwarmRelaySessionSnapshotV1 {
    return Object.freeze({
      request_id: session.request_id,
      session_id: session.session_id,
      stream_id: session.stream_id,
      source_node_id: session.source_node_id,
      target_node_id: session.target_node_id,
      source_ticket_id: session.source_ticket.ticket_id,
      target_ticket_id: session.target_ticket.ticket_id,
      source_observation: session.source_observation,
      target_observation: session.target_observation,
      offers_emitted: session.offers_emitted,
      expires_at_ms: session.expires_at_ms,
    });
  }

  private removeSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    this.sessions.delete(sessionId);
    this.ticketRoles.delete(session.source_ticket.ticket_id);
    this.ticketRoles.delete(session.target_ticket.ticket_id);
  }
}

export type { VoidUdpRendezvousProbeV1 };
