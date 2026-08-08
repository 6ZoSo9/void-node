// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025-2026 6ZoSo9

import * as crypto from "node:crypto";
import * as net from "node:net";

import { deriveVoidNodeIdFromPublicPemV1 } from "./auth_v1.js";
import { normalizeVoidUdpObservedEndpointV1 } from "./udp_hole_punch_v1.js";

export const VOID_P2P_UDP_RENDEZVOUS_PROTOCOL_VERSION_V1 = 1;
export const VOID_P2P_UDP_RENDEZVOUS_DEFAULT_TICKET_TTL_MS_V1 = 15_000;
export const VOID_P2P_UDP_RENDEZVOUS_MIN_TICKET_TTL_MS_V1 = 1_000;
export const VOID_P2P_UDP_RENDEZVOUS_MAX_TICKET_TTL_MS_V1 = 30_000;
export const VOID_P2P_UDP_RENDEZVOUS_MAX_TICKETS_V1 = 256;
export const VOID_P2P_UDP_RENDEZVOUS_MAX_PROBES_PER_TICKET_V1 = 8;
export const VOID_P2P_UDP_RENDEZVOUS_MAX_PACKET_BYTES_V1 = 1_024;

const ID_RE = /^[0-9a-f]{32}$/;
const NODE_ID_RE = /^[0-9a-f]{32}$/;
const SIGNATURE_RE = /^[0-9a-f]{128}$/;

export type VoidUdpRendezvousTicketV1 = Readonly<{
  ticket_id: string;
  node_id: string;
  issued_at_ms: number;
  expires_at_ms: number;
}>;

export type VoidUdpRendezvousProbeV1 = Readonly<{
  type: "VOID_UDP_MAP_PROBE";
  protocol: 1;
  ticket_id: string;
  node_id: string;
  nonce: string;
  signature: string;
}>;

export type VoidUdpRendezvousObservationV1 = Readonly<{
  ticket_id: string;
  node_id: string;
  observed_endpoint: string;
  first_seen_ms: number;
  last_seen_ms: number;
  probe_count: number;
  stable_same_rendezvous: boolean;
  mapping_conflicted: boolean;
}>;

export type VoidUdpRendezvousSnapshotV1 = Readonly<{
  active_ticket_count: number;
  observations: readonly VoidUdpRendezvousObservationV1[];
}>;

export const VOID_P2P_UDP_RENDEZVOUS_AUTHORITY_V1 = Object.freeze({
  ticket_issued_only_after_authenticated_control_session: true,
  ticket_defines_node_identity: false,
  observed_endpoint_defines_node_identity: false,
  udp_probe_replaces_normal_peer_authentication: false,
  cross_rendezvous_mapping_stability_required_for_direct_confidence: true,
  router_configuration_required: false,
  port_forward_required: false,
  upnp_required: false,
  nat_pmp_required: false,
  relay_fallback_preserved: true,
  direct_public_nat_traversal_claimed: false,
  runtime_integration_performed: false,
  wallet_signer_validator_wc_money_authority: 0,
});

type MutableTicketV1 = {
  ticket: VoidUdpRendezvousTicketV1;
  publicKey: crypto.KeyObject;
  seenNonces: Set<string>;
  observation?: VoidUdpRendezvousObservationV1;
};

function exactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  return actual.length === wanted.length &&
    actual.every((key, index) => key === wanted[index]);
}

function safeInteger(raw: unknown, min: number, max: number): number | undefined {
  if (typeof raw !== "number" || !Number.isSafeInteger(raw)) return;
  if (raw < min || raw > max) return;
  return raw;
}

function idValue(raw: unknown): string | undefined {
  return typeof raw === "string" && ID_RE.test(raw) ? raw : undefined;
}

function nodeId(raw: unknown): string | undefined {
  return typeof raw === "string" && NODE_ID_RE.test(raw) ? raw : undefined;
}

function signatureValue(raw: unknown): string | undefined {
  return typeof raw === "string" && SIGNATURE_RE.test(raw) ? raw : undefined;
}

function canonicalIPv6Host(address: string): string | undefined {
  try {
    const url = new URL(`http://[${address}]/`);
    if (!url.hostname.startsWith("[") || !url.hostname.endsWith("]")) return;
    return url.hostname.slice(1, -1).toLowerCase();
  } catch {
    return;
  }
}

function observedEndpoint(address: string, port: number): string | undefined {
  if (!Number.isInteger(port) || port < 1 || port > 65_535) return;
  const family = net.isIP(address);
  if (family === 4) return `${address}:${port}`;
  if (family === 6) {
    const host = canonicalIPv6Host(address);
    if (!host) return;
    return `[${host}]:${port}`;
  }
  return;
}

export function newVoidUdpRendezvousIdV1(): string {
  return crypto.randomBytes(16).toString("hex");
}

export function voidUdpRendezvousProbeTranscriptV1(input: {
  ticketId: string;
  nodeId: string;
  nonce: string;
}): Buffer {
  const ticketId = idValue(input.ticketId);
  const normalizedNodeId = nodeId(input.nodeId);
  const nonce = idValue(input.nonce);
  if (!ticketId || !normalizedNodeId || !nonce) {
    throw new Error("UDP rendezvous probe transcript input is invalid");
  }
  return Buffer.from(
    JSON.stringify({
      domain: "VOID_P2P_UDP_RENDEZVOUS_PROBE_V1",
      protocol: VOID_P2P_UDP_RENDEZVOUS_PROTOCOL_VERSION_V1,
      ticket_id: ticketId,
      node_id: normalizedNodeId,
      nonce,
    }),
    "utf8",
  );
}

export function createVoidUdpRendezvousProbeV1(input: {
  ticketId: string;
  nodeId: string;
  privateKey: crypto.KeyObject;
  nonce?: string;
}): VoidUdpRendezvousProbeV1 {
  const ticketId = idValue(input.ticketId);
  const normalizedNodeId = nodeId(input.nodeId);
  const nonce = idValue(input.nonce ?? newVoidUdpRendezvousIdV1());
  if (!ticketId || !normalizedNodeId || !nonce) {
    throw new Error("UDP rendezvous probe input is invalid");
  }
  const signature = crypto.sign(
    null,
    voidUdpRendezvousProbeTranscriptV1({
      ticketId,
      nodeId: normalizedNodeId,
      nonce,
    }),
    input.privateKey,
  ).toString("hex");
  if (!SIGNATURE_RE.test(signature)) {
    throw new Error("UDP rendezvous probe signature is invalid");
  }
  return Object.freeze({
    type: "VOID_UDP_MAP_PROBE",
    protocol: VOID_P2P_UDP_RENDEZVOUS_PROTOCOL_VERSION_V1,
    ticket_id: ticketId,
    node_id: normalizedNodeId,
    nonce,
    signature,
  });
}

export function normalizeVoidUdpRendezvousProbeV1(
  raw: unknown,
): VoidUdpRendezvousProbeV1 | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return;
  const value = raw as Record<string, unknown>;
  if (!exactKeys(value, [
    "type",
    "protocol",
    "ticket_id",
    "node_id",
    "nonce",
    "signature",
  ])) return;
  if (value.type !== "VOID_UDP_MAP_PROBE") return;
  if (value.protocol !== VOID_P2P_UDP_RENDEZVOUS_PROTOCOL_VERSION_V1) return;
  const ticket_id = idValue(value.ticket_id);
  const node_id = nodeId(value.node_id);
  const nonce = idValue(value.nonce);
  const signature = signatureValue(value.signature);
  if (!ticket_id || !node_id || !nonce || !signature) return;
  return Object.freeze({
    type: "VOID_UDP_MAP_PROBE",
    protocol: VOID_P2P_UDP_RENDEZVOUS_PROTOCOL_VERSION_V1,
    ticket_id,
    node_id,
    nonce,
    signature,
  });
}

export function encodeVoidUdpRendezvousProbeV1(
  probe: VoidUdpRendezvousProbeV1,
): Buffer {
  const normalized = normalizeVoidUdpRendezvousProbeV1(probe);
  if (!normalized) throw new Error("UDP rendezvous probe is invalid");
  const bytes = Buffer.from(JSON.stringify(normalized), "utf8");
  if (bytes.length > VOID_P2P_UDP_RENDEZVOUS_MAX_PACKET_BYTES_V1) {
    throw new Error("UDP rendezvous probe exceeds byte limit");
  }
  return bytes;
}

export function decodeVoidUdpRendezvousProbeV1(
  raw: Uint8Array,
): VoidUdpRendezvousProbeV1 | undefined {
  if (!(raw instanceof Uint8Array)) return;
  if (
    raw.byteLength < 2 ||
    raw.byteLength > VOID_P2P_UDP_RENDEZVOUS_MAX_PACKET_BYTES_V1
  ) return;
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(raw).toString("utf8"));
  } catch {
    return;
  }
  return normalizeVoidUdpRendezvousProbeV1(parsed);
}

export class VoidUdpRendezvousStateV1 {
  private readonly tickets = new Map<string, MutableTicketV1>();

  constructor(private readonly allowNonPublicObservedEndpoint = false) {}

  issueAuthenticatedTicket(input: {
    authenticatedNodeId: string;
    authenticatedPublicPem: string;
    ttlMs?: number;
    nowMs?: number;
  }): VoidUdpRendezvousTicketV1 {
    const authenticatedNodeId = nodeId(input.authenticatedNodeId);
    const ttlMs = safeInteger(
      input.ttlMs ?? VOID_P2P_UDP_RENDEZVOUS_DEFAULT_TICKET_TTL_MS_V1,
      VOID_P2P_UDP_RENDEZVOUS_MIN_TICKET_TTL_MS_V1,
      VOID_P2P_UDP_RENDEZVOUS_MAX_TICKET_TTL_MS_V1,
    );
    const nowMs = safeInteger(
      input.nowMs ?? Date.now(),
      0,
      Number.MAX_SAFE_INTEGER,
    );
    if (!authenticatedNodeId || ttlMs === undefined || nowMs === undefined) {
      throw new Error("UDP rendezvous authenticated ticket input is invalid");
    }
    if (
      typeof input.authenticatedPublicPem !== "string" ||
      input.authenticatedPublicPem.length < 64 ||
      input.authenticatedPublicPem.length > 4_096
    ) {
      throw new Error("UDP rendezvous authenticated public key is invalid");
    }

    let publicKey: crypto.KeyObject;
    try {
      publicKey = crypto.createPublicKey(input.authenticatedPublicPem);
    } catch {
      throw new Error("UDP rendezvous authenticated public key is invalid");
    }
    const derived = deriveVoidNodeIdFromPublicPemV1(input.authenticatedPublicPem);
    if (derived !== authenticatedNodeId) {
      throw new Error("UDP rendezvous node ID/public-key binding mismatch");
    }

    this.sweep(nowMs);
    if (this.tickets.size >= VOID_P2P_UDP_RENDEZVOUS_MAX_TICKETS_V1) {
      throw new Error("UDP rendezvous ticket capacity reached");
    }

    let ticketId = "";
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const candidate = newVoidUdpRendezvousIdV1();
      if (!this.tickets.has(candidate)) {
        ticketId = candidate;
        break;
      }
    }
    if (!ticketId) throw new Error("UDP rendezvous ticket allocation collision");

    const expiresAtMs = nowMs + ttlMs;
    if (!Number.isSafeInteger(expiresAtMs)) {
      throw new Error("UDP rendezvous ticket expiry overflow");
    }

    const ticket = Object.freeze({
      ticket_id: ticketId,
      node_id: authenticatedNodeId,
      issued_at_ms: nowMs,
      expires_at_ms: expiresAtMs,
    });
    this.tickets.set(ticketId, {
      ticket,
      publicKey,
      seenNonces: new Set<string>(),
    });
    return ticket;
  }

  observeProbe(input: {
    packet: unknown;
    remoteAddress: string;
    remotePort: number;
    nowMs?: number;
  }): VoidUdpRendezvousObservationV1 {
    const nowMs = safeInteger(
      input.nowMs ?? Date.now(),
      0,
      Number.MAX_SAFE_INTEGER,
    );
    if (nowMs === undefined) {
      throw new Error("UDP rendezvous observation time is invalid");
    }
    this.sweep(nowMs);

    const packet = normalizeVoidUdpRendezvousProbeV1(input.packet);
    if (!packet) throw new Error("UDP rendezvous probe is malformed");
    const entry = this.tickets.get(packet.ticket_id);
    if (!entry) throw new Error("UDP rendezvous ticket is missing or expired");
    if (entry.ticket.node_id !== packet.node_id) {
      throw new Error("UDP rendezvous ticket/node binding mismatch");
    }
    if (entry.seenNonces.has(packet.nonce)) {
      throw new Error("UDP rendezvous probe replay rejected");
    }
    if (entry.seenNonces.size >= VOID_P2P_UDP_RENDEZVOUS_MAX_PROBES_PER_TICKET_V1) {
      throw new Error("UDP rendezvous probe budget exhausted");
    }

    const verified = crypto.verify(
      null,
      voidUdpRendezvousProbeTranscriptV1({
        ticketId: packet.ticket_id,
        nodeId: packet.node_id,
        nonce: packet.nonce,
      }),
      entry.publicKey,
      Buffer.from(packet.signature, "hex"),
    );
    if (!verified) throw new Error("UDP rendezvous probe signature mismatch");

    const rawEndpoint = observedEndpoint(input.remoteAddress, input.remotePort);
    const endpoint = normalizeVoidUdpObservedEndpointV1(
      rawEndpoint,
      this.allowNonPublicObservedEndpoint,
    );
    if (!endpoint) {
      throw new Error("UDP rendezvous observed endpoint is not eligible");
    }

    entry.seenNonces.add(packet.nonce);

    if (entry.observation && entry.observation.observed_endpoint !== endpoint) {
      const conflicted = Object.freeze({
        ...entry.observation,
        last_seen_ms: nowMs,
        probe_count: entry.observation.probe_count + 1,
        stable_same_rendezvous: false,
        mapping_conflicted: true,
      });
      entry.observation = conflicted;
      throw new Error("UDP rendezvous mapping changed within one ticket");
    }

    const previous = entry.observation;
    const observation = Object.freeze({
      ticket_id: packet.ticket_id,
      node_id: packet.node_id,
      observed_endpoint: endpoint,
      first_seen_ms: previous?.first_seen_ms ?? nowMs,
      last_seen_ms: nowMs,
      probe_count: (previous?.probe_count ?? 0) + 1,
      stable_same_rendezvous: (previous?.probe_count ?? 0) + 1 >= 2,
      mapping_conflicted: false,
    });
    entry.observation = observation;
    return observation;
  }

  sweep(nowMs = Date.now()): void {
    const normalizedNow = safeInteger(nowMs, 0, Number.MAX_SAFE_INTEGER);
    if (normalizedNow === undefined) return;
    for (const [ticketId, entry] of this.tickets) {
      if (entry.ticket.expires_at_ms <= normalizedNow) {
        this.tickets.delete(ticketId);
      }
    }
  }

  snapshot(nowMs = Date.now()): VoidUdpRendezvousSnapshotV1 {
    this.sweep(nowMs);
    const observations = [...this.tickets.values()]
      .map((entry) => entry.observation)
      .filter((value): value is VoidUdpRendezvousObservationV1 => !!value)
      .sort((a, b) => a.ticket_id.localeCompare(b.ticket_id));
    return Object.freeze({
      active_ticket_count: this.tickets.size,
      observations: Object.freeze(observations),
    });
  }
}
