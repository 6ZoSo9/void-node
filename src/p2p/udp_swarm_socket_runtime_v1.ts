// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025-2026 6ZoSo9

import * as crypto from "node:crypto";
import * as dgram from "node:dgram";
import * as net from "node:net";

import { deriveVoidNodeIdFromPublicPemV1 } from "./auth_v1.js";
import {
  createVoidUdpHolePunchPacketV1,
  normalizeVoidUdpHolePunchPacketV1,
  normalizeVoidUdpObservedEndpointV1,
  voidUdpHolePunchPacketMatchesPlanV1,
  type VoidUdpHolePunchPlanV1,
} from "./udp_hole_punch_v1.js";
import {
  normalizeVoidUdpAuthenticatedPathHelloV1,
  normalizeVoidUdpAuthenticatedPathProofV1,
} from "./udp_authenticated_path_v1.js";
import {
  normalizeVoidUdpRendezvousProbeV1,
  type VoidUdpRendezvousProbeV1,
} from "./udp_rendezvous_v1.js";
import type { VoidUdpPeerSocketAdapterV1 } from "./udp_peer_socket_adapter_v1.js";
import {
  normalizeVoidUdpSwarmControlMessageV1,
  type VoidUdpSwarmUpgradeOfferV1,
} from "./udp_swarm_control_v1.js";
import {
  VoidUdpSwarmUpgradeV1,
  type VoidUdpSwarmUpgradePhaseV1,
} from "./udp_swarm_upgrade_v1.js";
import type {
  VoidUdpSwarmDirectUpgradeOfferActionV1,
  VoidUdpSwarmProbeActionV1,
} from "./udp_swarm_authenticated_control_adapter_v1.js";
import type {
  VoidUdpSecureKeyOfferV1,
  VoidUdpSecurePacketV1,
} from "./udp_secure_reliable_transport_v1.js";
import {
  parseVoidReachabilityCandidateAddressV1,
} from "./reachability_runtime_v1.js";
import { formatPeerAddress } from "../types/p2p.js";

export const VOID_P2P_UDP_SWARM_SOCKET_RUNTIME_VERSION_V1 = 1;
export const VOID_P2P_UDP_SWARM_SOCKET_RUNTIME_DEFAULT_MAX_DATAGRAM_BYTES_V1 = 1_200;
export const VOID_P2P_UDP_SWARM_SOCKET_RUNTIME_DEFAULT_SECURE_PAYLOAD_BYTES_V1 = 384;
export const VOID_P2P_UDP_SWARM_SOCKET_RUNTIME_MAX_SESSIONS_V1 = 32;
export const VOID_P2P_UDP_SWARM_SOCKET_RUNTIME_MAX_PENDING_SECURE_PACKETS_V1 = 16;
export const VOID_P2P_UDP_SWARM_SOCKET_RUNTIME_HANDSHAKE_RETRY_MS_V1 = 75;

const ID_RE = /^[0-9a-f]{32}$/;

export const VOID_P2P_UDP_SWARM_SOCKET_RUNTIME_AUTHORITY_V1 = Object.freeze({
  one_bound_udp_socket_per_runtime: true,
  same_socket_rendezvous_probe_and_direct_session: true,
  ordinary_participant_fixed_port_required: false,
  ordinary_participant_default_bind_port_zero: true,
  exact_relay_observed_peer_endpoint_required: true,
  punch_packet_defines_peer_identity: false,
  secure_path_bootstrap_required: true,
  secure_reliable_transport_required: true,
  conservative_udp_datagram_limit_required: true,
  configurable_secure_payload_chunking_used: true,
  normal_void_peer_auth_still_required_after_secure_socket: true,
  normal_void_peer_authentication_performed: false,
  relay_retirement_authorized: false,
  relay_fallback_preserved: true,
  node_core_mount_performed: false,
  production_udp_activation_performed: false,
  dual_stack_single_socket_claimed: false,
  router_configuration_required: false,
  port_forward_required: false,
  upnp_required: false,
  nat_pmp_required: false,
  wallet_signer_validator_wc_money_authority: 0,
});

export type VoidUdpSwarmSocketFamilyV1 = "udp4" | "udp6";

export type VoidUdpSwarmSocketRuntimeBoundV1 = Readonly<{
  family: VoidUdpSwarmSocketFamilyV1;
  address: string;
  port: number;
  endpoint: string;
}>;

export type VoidUdpSwarmSocketRuntimeRendezvousProbeEventV1 = Readonly<{
  packet: VoidUdpRendezvousProbeV1;
  remote_address: string;
  remote_port: number;
  remote_endpoint: string;
}>;

export type VoidUdpSwarmSocketRuntimeDirectPathEventV1 = Readonly<{
  session_id: string;
  peer_node_id: string;
  peer_observed_endpoint: string;
  received_from_endpoint: string;
  trigger: "punch" | "authenticated_path_hello";
}>;

export type VoidUdpSwarmSocketRuntimeDirectReadyEventV1 = Readonly<{
  session_id: string;
  peer_node_id: string;
  peer_observed_endpoint: string;
  socket: VoidUdpPeerSocketAdapterV1;
}>;

export type VoidUdpSwarmSocketRuntimeFailureEventV1 = Readonly<{
  session_id: string;
  peer_node_id: string;
  reason: string;
}>;

export type VoidUdpSwarmSocketRuntimeOptionsV1 = Readonly<{
  localNodeId: string;
  localPublicPem: string;
  localPrivateKey: crypto.KeyObject;
  family?: VoidUdpSwarmSocketFamilyV1;
  bindHost?: string;
  bindPort?: number;
  allowNonPublicEndpoints?: boolean;
  maxDatagramBytes?: number;
  securePayloadBytes?: number;
  onRendezvousProbe?: (
    event: VoidUdpSwarmSocketRuntimeRendezvousProbeEventV1,
  ) => void;
  onDirectPathObserved?: (
    event: VoidUdpSwarmSocketRuntimeDirectPathEventV1,
  ) => void;
  onDirectSocketReady?: (
    event: VoidUdpSwarmSocketRuntimeDirectReadyEventV1,
  ) => void;
  onUpgradeFailure?: (
    event: VoidUdpSwarmSocketRuntimeFailureEventV1,
  ) => void;
  onRuntimeError?: (error: Error) => void;
}>;

export type VoidUdpSwarmSocketRuntimeSessionSnapshotV1 = Readonly<{
  session_id: string;
  peer_node_id: string;
  relay_node_id: string;
  peer_observed_endpoint: string;
  phase: VoidUdpSwarmUpgradePhaseV1;
  direct_path_observed: boolean;
  remote_hello_accepted: boolean;
  remote_proof_accepted: boolean;
  remote_key_offer_accepted: boolean;
  direct_socket_ready: boolean;
  relay_retirement_authorized: boolean;
  rejected_wrong_endpoint_datagrams: number;
  pending_secure_packet_count: number;
}>;

export type VoidUdpSwarmSocketRuntimeSnapshotV1 = Readonly<{
  started: boolean;
  family: VoidUdpSwarmSocketFamilyV1;
  bound: VoidUdpSwarmSocketRuntimeBoundV1 | null;
  session_count: number;
  sent_datagram_count: number;
  received_datagram_count: number;
  rejected_oversize_datagram_count: number;
  max_sent_datagram_bytes: number;
  max_received_datagram_bytes: number;
  sent_by_type: Readonly<Record<string, number>>;
  sessions: readonly VoidUdpSwarmSocketRuntimeSessionSnapshotV1[];
}>;

type DestinationV1 = Readonly<{
  endpoint: string;
  host: string;
  port: number;
  family: 4 | 6;
}>;

type RoutedPacketV1 = Readonly<{
  type: string;
  session_id: string;
  source_node_id: string;
  target_node_id: string;
}>;

type SessionV1 = {
  action: VoidUdpSwarmDirectUpgradeOfferActionV1;
  offer: VoidUdpSwarmUpgradeOfferV1;
  upgrade: VoidUdpSwarmUpgradeV1;
  plan: VoidUdpHolePunchPlanV1;
  peer: DestinationV1;
  directPathObserved: boolean;
  remoteHelloAccepted: boolean;
  remoteProofAccepted: boolean;
  remoteKeyAccepted: boolean;
  directSocket?: VoidUdpPeerSocketAdapterV1;
  pendingRemoteProof?: unknown;
  pendingRemoteKey?: unknown;
  pendingSecurePackets: unknown[];
  punchTimers: NodeJS.Timeout[];
  handshakeTimer: NodeJS.Timeout | null;
  attemptTimer: NodeJS.Timeout | null;
  rejectedWrongEndpointDatagrams: number;
  failed: boolean;
};

function boundedInteger(
  raw: unknown,
  fallback: number,
  min: number,
  max: number,
  label: string,
): number {
  if (raw === undefined) return fallback;
  if (typeof raw !== "number" || !Number.isSafeInteger(raw)) {
    throw new Error(`${label} must be an integer`);
  }
  if (raw < min || raw > max) {
    throw new Error(`${label} is out of range`);
  }
  return raw;
}

function validId(raw: unknown): raw is string {
  return typeof raw === "string" && ID_RE.test(raw);
}

function keypairMatches(
  privateKey: crypto.KeyObject,
  publicPem: string,
): boolean {
  if (
    privateKey.type !== "private" ||
    privateKey.asymmetricKeyType !== "ed25519"
  ) {
    return false;
  }
  try {
    return crypto
      .createPublicKey(privateKey)
      .export({ type: "spki", format: "pem" })
      .toString() === publicPem;
  } catch (error) {
    void error;
    return false;
  }
}

function routedPacket(raw: unknown): RoutedPacketV1 | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return;
  const value = raw as Record<string, unknown>;
  if (
    typeof value.type !== "string" ||
    !validId(value.session_id) ||
    !validId(value.source_node_id) ||
    !validId(value.target_node_id)
  ) {
    return;
  }
  return Object.freeze({
    type: value.type,
    session_id: value.session_id,
    source_node_id: value.source_node_id,
    target_node_id: value.target_node_id,
  });
}

function callbackError(raw: unknown): Error {
  return raw instanceof Error ? raw : new Error(String(raw));
}

export class VoidUdpSwarmSocketRuntimeV1 {
  private readonly family: VoidUdpSwarmSocketFamilyV1;
  private readonly bindHost: string;
  private readonly bindPort: number;
  private readonly allowNonPublicEndpoints: boolean;
  private readonly maxDatagramBytes: number;
  private readonly securePayloadBytes: number;
  private readonly socket: dgram.Socket;
  private readonly sessions = new Map<string, SessionV1>();
  private readonly sentByType = new Map<string, number>();

  private started = false;
  private stopped = false;
  private boundValue?: VoidUdpSwarmSocketRuntimeBoundV1;
  private sentDatagrams = 0;
  private receivedDatagrams = 0;
  private rejectedOversizeDatagrams = 0;
  private maxSentDatagramBytes = 0;
  private maxReceivedDatagramBytes = 0;

  constructor(private readonly options: VoidUdpSwarmSocketRuntimeOptionsV1) {
    if (!validId(options.localNodeId)) {
      throw new Error("UDP swarm socket runtime local node ID is invalid");
    }
    if (
      deriveVoidNodeIdFromPublicPemV1(options.localPublicPem) !==
      options.localNodeId
    ) {
      throw new Error("UDP swarm socket runtime local public-key binding mismatch");
    }
    if (!keypairMatches(options.localPrivateKey, options.localPublicPem)) {
      throw new Error("UDP swarm socket runtime local private/public key mismatch");
    }

    this.family = options.family ?? "udp4";
    this.bindHost = options.bindHost ?? (this.family === "udp4" ? "0.0.0.0" : "::");
    const bindFamily = net.isIP(this.bindHost);
    if (
      (this.family === "udp4" && bindFamily !== 4) ||
      (this.family === "udp6" && bindFamily !== 6)
    ) {
      throw new Error("UDP swarm socket runtime bind host/family mismatch");
    }
    this.bindPort = boundedInteger(
      options.bindPort,
      0,
      0,
      65_535,
      "UDP swarm socket runtime bind port",
    );
    this.allowNonPublicEndpoints = options.allowNonPublicEndpoints === true;
    this.maxDatagramBytes = boundedInteger(
      options.maxDatagramBytes,
      VOID_P2P_UDP_SWARM_SOCKET_RUNTIME_DEFAULT_MAX_DATAGRAM_BYTES_V1,
      1_024,
      1_400,
      "UDP swarm socket runtime max datagram bytes",
    );
    this.securePayloadBytes = boundedInteger(
      options.securePayloadBytes,
      VOID_P2P_UDP_SWARM_SOCKET_RUNTIME_DEFAULT_SECURE_PAYLOAD_BYTES_V1,
      64,
      512,
      "UDP swarm socket runtime secure payload bytes",
    );

    this.socket = dgram.createSocket(this.family);
    this.socket.on("message", (message, rinfo) => {
      this.handleDatagram(message, rinfo);
    });
    this.socket.on("error", (error) => {
      this.handleSocketError(error);
    });
  }

  async start(): Promise<VoidUdpSwarmSocketRuntimeBoundV1> {
    if (this.stopped) {
      throw new Error("UDP swarm socket runtime cannot restart after stop");
    }
    if (this.started && this.boundValue) return this.boundValue;

    await new Promise<void>((resolve, reject) => {
      const onListening = () => {
        this.socket.off("error", onBindError);
        resolve();
      };
      const onBindError = (error: Error) => {
        this.socket.off("listening", onListening);
        reject(error);
      };
      this.socket.once("listening", onListening);
      this.socket.once("error", onBindError);
      this.socket.bind(this.bindPort, this.bindHost);
    });

    const address = this.socket.address();
    if (typeof address === "string") {
      throw new Error("UDP swarm socket runtime expected IP socket address");
    }
    const endpoint = formatPeerAddress(address.address, address.port);
    if (!endpoint) {
      throw new Error("UDP swarm socket runtime bound endpoint is invalid");
    }
    this.boundValue = Object.freeze({
      family: this.family,
      address: address.address,
      port: address.port,
      endpoint,
    });
    this.started = true;
    return this.boundValue;
  }

  async stop(): Promise<void> {
    if (this.stopped) return;
    this.stopped = true;
    this.started = false;
    for (const state of this.sessions.values()) {
      this.clearSessionTimers(state);
      state.upgrade.destroy();
    }
    this.sessions.clear();

    await new Promise<void>((resolve) => {
      try {
        this.socket.close(() => resolve());
      } catch (error) {
        void error;
        resolve();
      }
    });
  }

  bound(): VoidUdpSwarmSocketRuntimeBoundV1 | undefined {
    return this.boundValue;
  }

  async sendRendezvousProbeAction(
    action: VoidUdpSwarmProbeActionV1,
  ): Promise<void> {
    this.requireStarted();
    const probe = normalizeVoidUdpRendezvousProbeV1(action.packet);
    if (!probe || probe.node_id !== this.options.localNodeId) {
      throw new Error("UDP swarm socket runtime rendezvous probe identity mismatch");
    }
    const destination = this.destination(action.relay_udp_endpoint);
    await this.sendObject(probe, destination, probe.type);
  }

  startDirectUpgrade(
    rawAction: VoidUdpSwarmDirectUpgradeOfferActionV1,
  ): Readonly<{
    session_id: string;
    peer_node_id: string;
    peer_observed_endpoint: string;
    plan: VoidUdpHolePunchPlanV1;
  }> {
    this.requireStarted();
    if (this.sessions.size >= VOID_P2P_UDP_SWARM_SOCKET_RUNTIME_MAX_SESSIONS_V1) {
      throw new Error("UDP swarm socket runtime session capacity reached");
    }
    if (!validId(rawAction.relay_node_id)) {
      throw new Error("UDP swarm socket runtime relay node ID is invalid");
    }
    const normalized = normalizeVoidUdpSwarmControlMessageV1(
      rawAction.message,
      this.allowNonPublicEndpoints,
    );
    if (!normalized || normalized.type !== "UDP_SWARM_UPGRADE_OFFER") {
      throw new Error("UDP swarm socket runtime direct-upgrade offer is invalid");
    }
    if (normalized.local_observation.node_id !== this.options.localNodeId) {
      throw new Error("UDP swarm socket runtime local observation identity mismatch");
    }
    if (this.sessions.has(normalized.session_id)) {
      throw new Error("UDP swarm socket runtime duplicate session rejected");
    }

    const peer = this.destination(normalized.peer_observation.observed_endpoint);
    let state!: SessionV1;
    const upgrade = new VoidUdpSwarmUpgradeV1({
      sessionId: normalized.session_id,
      localNodeId: this.options.localNodeId,
      remoteNodeId: normalized.peer_node_id,
      localPublicPem: this.options.localPublicPem,
      localPrivateKey: this.options.localPrivateKey,
      localObservation: normalized.local_observation,
      remoteObservation: normalized.peer_observation,
      startDelayMs: normalized.start_delay_ms,
      attemptTimeoutMs: normalized.attempt_timeout_ms,
      verifyAuthenticatedRendezvousObservation:
        rawAction.verifyAuthenticatedRendezvousObservation,
      allowNonPublicEndpoints: this.allowNonPublicEndpoints,
      adapterOptions: {
        maxPayloadBytes: this.securePayloadBytes,
      },
      transmitSecurePacket: (packet) =>
        this.sendObject(packet, peer, packet.type),
      onDirectSocketReady: (socket) => {
        this.markDirectSocketReady(state, socket);
      },
    });
    const plan = upgrade.beginPunch();
    state = {
      action: Object.freeze({
        relay_node_id: rawAction.relay_node_id,
        message: normalized,
        verifyAuthenticatedRendezvousObservation:
          rawAction.verifyAuthenticatedRendezvousObservation,
      }),
      offer: normalized,
      upgrade,
      plan,
      peer,
      directPathObserved: false,
      remoteHelloAccepted: false,
      remoteProofAccepted: false,
      remoteKeyAccepted: false,
      pendingSecurePackets: [],
      punchTimers: [],
      handshakeTimer: null,
      attemptTimer: null,
      rejectedWrongEndpointDatagrams: 0,
      failed: false,
    };
    this.sessions.set(normalized.session_id, state);
    this.schedulePunchBurst(state);
    state.attemptTimer = setTimeout(() => {
      if (!state.directSocket && !state.failed) {
        this.failSession(state, "direct UDP attempt timed out");
      }
    }, plan.attempt_timeout_ms);
    state.attemptTimer.unref?.();

    return Object.freeze({
      session_id: normalized.session_id,
      peer_node_id: normalized.peer_node_id,
      peer_observed_endpoint: peer.endpoint,
      plan,
    });
  }

  snapshot(): VoidUdpSwarmSocketRuntimeSnapshotV1 {
    const sessions = [...this.sessions.values()]
      .map((state) => Object.freeze({
        session_id: state.offer.session_id,
        peer_node_id: state.offer.peer_node_id,
        relay_node_id: state.action.relay_node_id,
        peer_observed_endpoint: state.peer.endpoint,
        phase: state.upgrade.phase,
        direct_path_observed: state.directPathObserved,
        remote_hello_accepted: state.remoteHelloAccepted,
        remote_proof_accepted: state.remoteProofAccepted,
        remote_key_offer_accepted: state.remoteKeyAccepted,
        direct_socket_ready: !!state.directSocket,
        relay_retirement_authorized: state.upgrade.relayRetirementAuthorized,
        rejected_wrong_endpoint_datagrams:
          state.rejectedWrongEndpointDatagrams,
        pending_secure_packet_count: state.pendingSecurePackets.length,
      }))
      .sort((a, b) => a.session_id.localeCompare(b.session_id));
    const sentByType = Object.fromEntries(
      [...this.sentByType.entries()].sort((a, b) => a[0].localeCompare(b[0])),
    );
    return Object.freeze({
      started: this.started,
      family: this.family,
      bound: this.boundValue ?? null,
      session_count: sessions.length,
      sent_datagram_count: this.sentDatagrams,
      received_datagram_count: this.receivedDatagrams,
      rejected_oversize_datagram_count: this.rejectedOversizeDatagrams,
      max_sent_datagram_bytes: this.maxSentDatagramBytes,
      max_received_datagram_bytes: this.maxReceivedDatagramBytes,
      sent_by_type: Object.freeze(sentByType),
      sessions: Object.freeze(sessions),
    });
  }

  private requireStarted(): void {
    if (!this.started || this.stopped || !this.boundValue) {
      throw new Error("UDP swarm socket runtime is not started");
    }
  }

  private destination(raw: string): DestinationV1 {
    const endpoint = normalizeVoidUdpObservedEndpointV1(
      raw,
      this.allowNonPublicEndpoints,
    );
    const parsed = endpoint
      ? parseVoidReachabilityCandidateAddressV1(endpoint)
      : undefined;
    if (!endpoint || !parsed || (parsed.family !== 4 && parsed.family !== 6)) {
      throw new Error("UDP swarm socket runtime destination is invalid");
    }
    if (
      (this.family === "udp4" && parsed.family !== 4) ||
      (this.family === "udp6" && parsed.family !== 6)
    ) {
      throw new Error("UDP swarm socket runtime destination family mismatch");
    }
    return Object.freeze({
      endpoint,
      host: parsed.host,
      port: parsed.port,
      family: parsed.family,
    });
  }

  private async sendObject(
    value: unknown,
    destination: DestinationV1,
    packetType: string,
  ): Promise<void> {
    this.requireStarted();
    const bytes = Buffer.from(JSON.stringify(value), "utf8");
    if (bytes.length < 2 || bytes.length > this.maxDatagramBytes) {
      throw new Error(
        `UDP swarm socket runtime datagram size ${bytes.length} exceeds bound ${this.maxDatagramBytes}`,
      );
    }
    await new Promise<void>((resolve, reject) => {
      this.socket.send(bytes, destination.port, destination.host, (error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
    this.sentDatagrams += 1;
    this.maxSentDatagramBytes = Math.max(this.maxSentDatagramBytes, bytes.length);
    this.sentByType.set(packetType, (this.sentByType.get(packetType) ?? 0) + 1);
  }

  private handleDatagram(message: Buffer, rinfo: dgram.RemoteInfo): void {
    this.receivedDatagrams += 1;
    this.maxReceivedDatagramBytes = Math.max(
      this.maxReceivedDatagramBytes,
      message.length,
    );
    if (message.length < 2 || message.length > this.maxDatagramBytes) {
      this.rejectedOversizeDatagrams += 1;
      return;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(message.toString("utf8"));
    } catch (error) {
      void error;
      return;
    }

    const probe = normalizeVoidUdpRendezvousProbeV1(parsed);
    if (probe) {
      const remoteEndpoint = formatPeerAddress(rinfo.address, rinfo.port);
      if (!remoteEndpoint) return;
      try {
        this.options.onRendezvousProbe?.(Object.freeze({
          packet: probe,
          remote_address: rinfo.address,
          remote_port: rinfo.port,
          remote_endpoint: remoteEndpoint,
        }));
      } catch (error) {
        this.reportRuntimeError(callbackError(error));
      }
      return;
    }

    const route = routedPacket(parsed);
    if (!route || route.target_node_id !== this.options.localNodeId) return;
    const state = this.sessions.get(route.session_id);
    if (!state || route.source_node_id !== state.offer.peer_node_id) return;

    const remoteEndpoint = formatPeerAddress(rinfo.address, rinfo.port);
    if (!remoteEndpoint || remoteEndpoint !== state.peer.endpoint) {
      state.rejectedWrongEndpointDatagrams += 1;
      return;
    }

    if (route.type === "VOID_UDP_PUNCH") {
      const punch = normalizeVoidUdpHolePunchPacketV1(parsed);
      if (punch && voidUdpHolePunchPacketMatchesPlanV1(punch, state.plan)) {
        this.observeDirectPath(state, remoteEndpoint, "punch");
      }
      return;
    }

    if (route.type === "VOID_UDP_AUTH_HELLO") {
      const hello = normalizeVoidUdpAuthenticatedPathHelloV1(parsed);
      if (!hello) return;
      this.observeDirectPath(
        state,
        remoteEndpoint,
        "authenticated_path_hello",
      );
      if (state.failed) return;
      if (state.upgrade.acceptRemoteHello(hello)) {
        state.remoteHelloAccepted = true;
        this.progressHandshake(state);
      }
      return;
    }

    if (route.type === "VOID_UDP_AUTH_PROOF") {
      const proof = normalizeVoidUdpAuthenticatedPathProofV1(
        parsed,
        this.allowNonPublicEndpoints,
      );
      if (!proof) return;
      if (!state.directPathObserved || !state.remoteHelloAccepted) {
        state.pendingRemoteProof = proof;
        return;
      }
      if (state.upgrade.acceptRemoteProof(proof)) {
        state.remoteProofAccepted = true;
        state.pendingRemoteProof = undefined;
        this.progressHandshake(state);
      }
      return;
    }

    if (route.type === "VOID_UDP_SECURE_KEY") {
      if (!state.directPathObserved || !state.remoteProofAccepted) {
        state.pendingRemoteKey = parsed;
        return;
      }
      if (state.upgrade.acceptRemoteKeyOffer(parsed)) {
        state.remoteKeyAccepted = true;
        state.pendingRemoteKey = undefined;
        this.progressHandshake(state);
      }
      return;
    }

    if (route.type === "VOID_UDP_SECURE_PACKET") {
      if (state.directSocket) {
        state.upgrade.receiveSecurePacket(parsed);
        return;
      }
      if (
        state.directPathObserved &&
        state.pendingSecurePackets.length <
          VOID_P2P_UDP_SWARM_SOCKET_RUNTIME_MAX_PENDING_SECURE_PACKETS_V1
      ) {
        state.pendingSecurePackets.push(parsed);
      }
    }
  }

  private schedulePunchBurst(state: SessionV1): void {
    state.plan.send_offsets_ms.forEach((offsetMs, attempt) => {
      const timer = setTimeout(() => {
        if (state.failed || state.directSocket || this.stopped) return;
        let packet;
        try {
          packet = createVoidUdpHolePunchPacketV1({
            sessionId: state.plan.session_id,
            sourceNodeId: this.options.localNodeId,
            targetNodeId: state.plan.peer_node_id,
            attempt,
          });
        } catch (error) {
          this.failSession(state, callbackError(error).message);
          return;
        }
        void this.sendObject(packet, state.peer, packet.type).catch((error) => {
          this.failSession(state, callbackError(error).message);
        });
      }, offsetMs);
      timer.unref?.();
      state.punchTimers.push(timer);
    });
  }

  private observeDirectPath(
    state: SessionV1,
    remoteEndpoint: string,
    trigger: "punch" | "authenticated_path_hello",
  ): void {
    if (state.failed) return;
    if (!state.directPathObserved) {
      try {
        state.upgrade.markDirectPathObserved();
      } catch (error) {
        this.failSession(state, callbackError(error).message);
        return;
      }
      state.directPathObserved = true;
      try {
        this.options.onDirectPathObserved?.(Object.freeze({
          session_id: state.offer.session_id,
          peer_node_id: state.offer.peer_node_id,
          peer_observed_endpoint: state.peer.endpoint,
          received_from_endpoint: remoteEndpoint,
          trigger,
        }));
      } catch (error) {
        this.reportRuntimeError(callbackError(error));
      }
      state.handshakeTimer = setInterval(() => {
        this.progressHandshake(state);
      }, VOID_P2P_UDP_SWARM_SOCKET_RUNTIME_HANDSHAKE_RETRY_MS_V1);
      state.handshakeTimer.unref?.();
    }
    this.progressHandshake(state);
  }

  private progressHandshake(state: SessionV1): void {
    if (state.failed || state.directSocket || !state.directPathObserved || this.stopped) {
      return;
    }
    let hello;
    try {
      hello = state.upgrade.localHello();
    } catch (error) {
      this.failSession(state, callbackError(error).message);
      return;
    }
    void this.sendObject(hello, state.peer, hello.type).catch((error) => {
      this.failSession(state, callbackError(error).message);
    });
    if (!state.remoteHelloAccepted) return;

    let proof;
    try {
      proof = state.upgrade.createLocalProof();
    } catch (error) {
      this.failSession(state, callbackError(error).message);
      return;
    }
    void this.sendObject(proof, state.peer, proof.type).catch((error) => {
      this.failSession(state, callbackError(error).message);
    });

    if (state.pendingRemoteProof && !state.remoteProofAccepted) {
      const pending = state.pendingRemoteProof;
      state.pendingRemoteProof = undefined;
      if (state.upgrade.acceptRemoteProof(pending)) {
        state.remoteProofAccepted = true;
      }
    }
    if (!state.remoteProofAccepted) return;

    let keyOffer: VoidUdpSecureKeyOfferV1;
    try {
      keyOffer = state.upgrade.createLocalKeyOffer();
    } catch (error) {
      this.failSession(state, callbackError(error).message);
      return;
    }
    void this.sendObject(keyOffer, state.peer, keyOffer.type).catch((error) => {
      this.failSession(state, callbackError(error).message);
    });

    if (state.pendingRemoteKey && !state.remoteKeyAccepted) {
      const pending = state.pendingRemoteKey;
      state.pendingRemoteKey = undefined;
      if (state.upgrade.acceptRemoteKeyOffer(pending)) {
        state.remoteKeyAccepted = true;
      }
    }
  }

  private markDirectSocketReady(
    state: SessionV1,
    socket: VoidUdpPeerSocketAdapterV1,
  ): void {
    if (state.failed || this.stopped) {
      socket.destroy();
      return;
    }
    state.directSocket = socket;
    this.clearPunchAndHandshakeTimers(state);
    if (state.attemptTimer) {
      clearTimeout(state.attemptTimer);
      state.attemptTimer = null;
    }

    const pending = state.pendingSecurePackets.splice(0);
    for (const packet of pending) state.upgrade.receiveSecurePacket(packet);

    try {
      this.options.onDirectSocketReady?.(Object.freeze({
        session_id: state.offer.session_id,
        peer_node_id: state.offer.peer_node_id,
        peer_observed_endpoint: state.peer.endpoint,
        socket,
      }));
    } catch (error) {
      this.reportRuntimeError(callbackError(error));
    }
  }

  private failSession(state: SessionV1, reason: string): void {
    if (state.failed || state.directSocket) return;
    state.failed = true;
    state.upgrade.failDirectAttempt(reason);
    this.clearSessionTimers(state);
    try {
      this.options.onUpgradeFailure?.(Object.freeze({
        session_id: state.offer.session_id,
        peer_node_id: state.offer.peer_node_id,
        reason,
      }));
    } catch (error) {
      this.reportRuntimeError(callbackError(error));
    }
  }

  private clearPunchAndHandshakeTimers(state: SessionV1): void {
    for (const timer of state.punchTimers.splice(0)) clearTimeout(timer);
    if (state.handshakeTimer) {
      clearInterval(state.handshakeTimer);
      state.handshakeTimer = null;
    }
  }

  private clearSessionTimers(state: SessionV1): void {
    this.clearPunchAndHandshakeTimers(state);
    if (state.attemptTimer) {
      clearTimeout(state.attemptTimer);
      state.attemptTimer = null;
    }
  }

  private handleSocketError(error: Error): void {
    this.reportRuntimeError(error);
    for (const state of this.sessions.values()) {
      if (!state.failed && !state.upgrade.relayRetirementAuthorized) {
        if (state.directSocket) {
          state.directSocket.destroy(error);
          state.directSocket = undefined;
        }
        state.failed = true;
        state.upgrade.failDirectAttempt(error);
        this.clearSessionTimers(state);
      }
    }
  }

  private reportRuntimeError(error: Error): void {
    try {
      this.options.onRuntimeError?.(error);
    } catch (callbackFailure) {
      console.warn("VOID_P2P_UDP_SWARM_SOCKET_RUNTIME_V1_ERROR_CALLBACK_FAILURE", {
        original_error: error.message,
        callback_error:
          callbackFailure instanceof Error
            ? callbackFailure.message
            : String(callbackFailure),
      });
    }
  }
}
