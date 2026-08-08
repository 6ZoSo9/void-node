// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025-2026 6ZoSo9

import * as dgram from "node:dgram";
import * as net from "node:net";

import {
  createVoidUdpHolePunchPacketV1,
  createVoidUdpHolePunchPlanV1,
  decodeVoidUdpHolePunchPacketV1,
  normalizeVoidUdpObservedEndpointV1,
  type VoidUdpHolePunchPlanV1,
} from "./udp_hole_punch_v1.js";
import {
  decodeVoidUdpRendezvousProbeV1,
  encodeVoidUdpRendezvousProbeV1,
  type VoidUdpRendezvousProbeV1,
} from "./udp_rendezvous_v1.js";
import type {
  VoidUdpSwarmDirectUpgradeOfferActionV1,
  VoidUdpSwarmProbeActionV1,
} from "./udp_swarm_authenticated_control_adapter_v1.js";

export const VOID_P2P_UDP_SWARM_DATAGRAM_RUNTIME_VERSION_V1 = 1;
export const VOID_P2P_UDP_SWARM_DATAGRAM_RUNTIME_DEFAULT_BIND_PORT_V1 = 0;
export const VOID_P2P_UDP_SWARM_DATAGRAM_RUNTIME_MAX_ACTIVE_PUNCHES_V1 = 32;
export const VOID_P2P_UDP_SWARM_DATAGRAM_RUNTIME_MAX_DATAGRAM_BYTES_V1 = 64 * 1024;
export const VOID_P2P_UDP_SWARM_DATAGRAM_RUNTIME_MAX_BIND_PORT_V1 = 65_535;

const NODE_ID_RE = /^[0-9a-f]{32}$/;
const ID_RE = /^[0-9a-f]{32}$/;

export const VOID_P2P_UDP_SWARM_DATAGRAM_RUNTIME_AUTHORITY_V1 = Object.freeze({
  one_udp_socket_per_runtime: true,
  participant_default_bind_port_zero: true,
  fixed_participant_port_required: false,
  same_socket_used_for_rendezvous_and_punch: true,
  relay_endpoint_is_transport_hint_only: true,
  punch_packet_defines_peer_identity: false,
  exact_peer_observed_source_required_for_punch_acceptance: true,
  secure_transport_activation_performed: false,
  normal_void_peer_auth_still_required: true,
  relay_retirement_authorized: false,
  relay_fallback_preserved: true,
  router_configuration_required: false,
  port_forward_required: false,
  upnp_required: false,
  nat_pmp_required: false,
  wallet_signer_validator_wc_money_authority: 0,
});

export type VoidUdpSwarmDatagramRuntimeBoundV1 = Readonly<{
  address: string;
  port: number;
  family: "IPv4";
}>;

export type VoidUdpSwarmDatagramRuntimeDirectObservedV1 = Readonly<{
  session_id: string;
  peer_node_id: string;
  peer_observed_endpoint: string;
  source_address: string;
  source_port: number;
  observed_at_ms: number;
}>;

export type VoidUdpSwarmDatagramRuntimeSnapshotV1 = Readonly<{
  started: boolean;
  closed: boolean;
  bound?: VoidUdpSwarmDatagramRuntimeBoundV1;
  active_punch_count: number;
  active_punches: readonly Readonly<{
    session_id: string;
    peer_node_id: string;
    peer_observed_endpoint: string;
    packets_sent: number;
    direct_path_observed: boolean;
  }>[];
}>;

export type VoidUdpSwarmDatagramRuntimeOptionsV1 = Readonly<{
  localNodeId: string;
  bindHost?: string;
  bindPort?: number;
  allowNonPublicEndpoints?: boolean;
  onRelayRendezvousProbe?: (input: {
    packet: VoidUdpRendezvousProbeV1;
    remoteAddress: string;
    remotePort: number;
  }) => void | Promise<void>;
  onDirectPathObserved?: (
    observation: VoidUdpSwarmDatagramRuntimeDirectObservedV1,
  ) => void | Promise<void>;
}>;

type ActivePunchV1 = {
  action: VoidUdpSwarmDirectUpgradeOfferActionV1;
  plan: VoidUdpHolePunchPlanV1;
  peer_host: string;
  peer_port: number;
  timers: Set<NodeJS.Timeout>;
  packets_sent: number;
  direct_path_observed: boolean;
};

function requireNodeId(raw: string, label: string): string {
  if (!NODE_ID_RE.test(raw)) {
    throw new Error(`UDP swarm datagram runtime ${label} is invalid`);
  }
  return raw;
}

function requireId(raw: string, label: string): string {
  if (!ID_RE.test(raw)) {
    throw new Error(`UDP swarm datagram runtime ${label} is invalid`);
  }
  return raw;
}

function requireBindPort(raw: unknown): number {
  if (
    typeof raw !== "number" ||
    !Number.isSafeInteger(raw) ||
    raw < 0 ||
    raw > VOID_P2P_UDP_SWARM_DATAGRAM_RUNTIME_MAX_BIND_PORT_V1
  ) {
    throw new Error("UDP swarm datagram runtime bind port is invalid");
  }
  return raw;
}

function parseEndpoint(
  raw: string,
  allowNonPublic: boolean,
): { canonical: string; host: string; port: number } {
  const canonical = normalizeVoidUdpObservedEndpointV1(raw, allowNonPublic);
  if (!canonical) {
    throw new Error("UDP swarm datagram runtime endpoint is ineligible");
  }

  if (canonical.startsWith("[")) {
    const close = canonical.indexOf("]:");
    if (close < 0) throw new Error("UDP swarm datagram runtime endpoint is invalid");
    const host = canonical.slice(1, close);
    const port = Number(canonical.slice(close + 2));
    if (net.isIP(host) !== 6 || !Number.isInteger(port) || port < 1 || port > 65_535) {
      throw new Error("UDP swarm datagram runtime endpoint is invalid");
    }
    return { canonical, host, port };
  }

  const split = canonical.lastIndexOf(":");
  if (split <= 0) throw new Error("UDP swarm datagram runtime endpoint is invalid");
  const host = canonical.slice(0, split);
  const port = Number(canonical.slice(split + 1));
  if (net.isIP(host) !== 4 || !Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error("UDP swarm datagram runtime endpoint is invalid");
  }
  return { canonical, host, port };
}

function endpointMatchesSource(
  endpoint: { host: string; port: number },
  sourceAddress: string,
  sourcePort: number,
): boolean {
  if (sourcePort !== endpoint.port) return false;
  if (net.isIP(endpoint.host) === 4) return sourceAddress === endpoint.host;
  try {
    const expected = new URL(`http://[${endpoint.host}]/`).hostname.toLowerCase();
    const actual = new URL(`http://[${sourceAddress}]/`).hostname.toLowerCase();
    return expected === actual;
  } catch (error) {
    void error;
    return false;
  }
}

function freezeBound(address: dgram.AddressInfo): VoidUdpSwarmDatagramRuntimeBoundV1 {
  if (address.family !== "IPv4") {
    throw new Error("UDP swarm datagram runtime v1 requires an IPv4 socket");
  }
  return Object.freeze({
    address: address.address,
    port: address.port,
    family: "IPv4",
  });
}

export class VoidUdpSwarmDatagramRuntimeV1 {
  private readonly localNodeId: string;
  private readonly bindHost: string;
  private readonly bindPort: number;
  private readonly allowNonPublicEndpoints: boolean;
  private readonly socket = dgram.createSocket("udp4");
  private readonly activePunches = new Map<string, ActivePunchV1>();
  private boundValue?: VoidUdpSwarmDatagramRuntimeBoundV1;
  private started = false;
  private closed = false;
  private starting?: Promise<VoidUdpSwarmDatagramRuntimeBoundV1>;

  constructor(private readonly options: VoidUdpSwarmDatagramRuntimeOptionsV1) {
    this.localNodeId = requireNodeId(options.localNodeId, "local node ID");
    this.bindHost = String(options.bindHost || "0.0.0.0").trim();
    if (net.isIP(this.bindHost) !== 4) {
      throw new Error("UDP swarm datagram runtime v1 bind host must be numeric IPv4");
    }
    this.bindPort = requireBindPort(
      options.bindPort ?? VOID_P2P_UDP_SWARM_DATAGRAM_RUNTIME_DEFAULT_BIND_PORT_V1,
    );
    this.allowNonPublicEndpoints = options.allowNonPublicEndpoints === true;

    this.socket.on("message", (bytes, rinfo) => {
      void this.receiveDatagram(bytes, rinfo);
    });
    this.socket.on("error", (error) => {
      if (!this.closed) {
        console.warn("VOID_P2P_UDP_SWARM_DATAGRAM_RUNTIME_V1_SOCKET_ERROR", {
          message: error.message,
        });
      }
    });
  }

  async start(): Promise<VoidUdpSwarmDatagramRuntimeBoundV1> {
    if (this.closed) throw new Error("UDP swarm datagram runtime is closed");
    if (this.boundValue) return this.boundValue;
    if (this.starting) return this.starting;

    this.starting = new Promise<VoidUdpSwarmDatagramRuntimeBoundV1>((resolve, reject) => {
      const onError = (error: Error) => {
        this.socket.off("listening", onListening);
        this.starting = undefined;
        reject(error);
      };
      const onListening = () => {
        this.socket.off("error", onError);
        try {
          const address = this.socket.address();
          if (typeof address === "string") {
            throw new Error("UDP swarm datagram runtime returned a pipe address");
          }
          this.boundValue = freezeBound(address);
          this.started = true;
          this.starting = undefined;
          resolve(this.boundValue);
        } catch (error) {
          this.starting = undefined;
          reject(error instanceof Error ? error : new Error(String(error)));
        }
      };
      this.socket.once("error", onError);
      this.socket.once("listening", onListening);
      this.socket.bind(this.bindPort, this.bindHost);
    });

    return this.starting;
  }

  get bound(): VoidUdpSwarmDatagramRuntimeBoundV1 | undefined {
    return this.boundValue;
  }

  async sendProbeAction(action: VoidUdpSwarmProbeActionV1): Promise<void> {
    this.requireStarted();
    requireNodeId(action.relay_node_id, "relay node ID");
    requireNodeId(action.peer_node_id, "peer node ID");
    requireId(action.request_id, "request ID");
    requireId(action.session_id, "session ID");
    requireId(action.stream_id, "stream ID");
    if (action.packet.node_id !== this.localNodeId) {
      throw new Error("UDP swarm datagram runtime mapping probe local identity mismatch");
    }
    if (!ID_RE.test(action.packet.ticket_id)) {
      throw new Error("UDP swarm datagram runtime mapping probe ticket is invalid");
    }

    const endpoint = parseEndpoint(
      action.relay_udp_endpoint,
      this.allowNonPublicEndpoints,
    );
    if (net.isIP(endpoint.host) !== 4) {
      throw new Error("UDP swarm datagram runtime v1 supports IPv4 relay endpoints only");
    }
    const bytes = encodeVoidUdpRendezvousProbeV1(action.packet);
    await this.sendBytes(bytes, endpoint.host, endpoint.port);
  }

  beginDirectUpgradeOffer(
    action: VoidUdpSwarmDirectUpgradeOfferActionV1,
  ): Readonly<{
    session_id: string;
    peer_node_id: string;
    peer_observed_endpoint: string;
    scheduled_send_count: number;
  }> {
    this.requireStarted();
    const message = action.message;
    requireNodeId(action.relay_node_id, "relay node ID");
    const sessionId = requireId(message.session_id, "session ID");
    const peerNodeId = requireNodeId(message.peer_node_id, "peer node ID");
    if (peerNodeId === this.localNodeId) {
      throw new Error("UDP swarm datagram runtime direct peer cannot be self");
    }
    if (this.activePunches.has(sessionId)) {
      throw new Error("UDP swarm datagram runtime direct session already active");
    }
    if (this.activePunches.size >= VOID_P2P_UDP_SWARM_DATAGRAM_RUNTIME_MAX_ACTIVE_PUNCHES_V1) {
      throw new Error("UDP swarm datagram runtime active punch capacity reached");
    }

    const peer = parseEndpoint(
      message.peer_observed_endpoint,
      this.allowNonPublicEndpoints,
    );
    if (net.isIP(peer.host) !== 4) {
      throw new Error("UDP swarm datagram runtime v1 supports IPv4 peer endpoints only");
    }

    const plan = createVoidUdpHolePunchPlanV1({
      sessionId,
      localNodeId: this.localNodeId,
      peerNodeId,
      peerObservedEndpoint: peer.canonical,
      startDelayMs: message.start_delay_ms,
      attemptTimeoutMs: message.attempt_timeout_ms,
      allowNonPublicObservedEndpoint: this.allowNonPublicEndpoints,
    });

    const active: ActivePunchV1 = {
      action,
      plan,
      peer_host: peer.host,
      peer_port: peer.port,
      timers: new Set<NodeJS.Timeout>(),
      packets_sent: 0,
      direct_path_observed: false,
    };
    this.activePunches.set(sessionId, active);

    for (let attempt = 0; attempt < plan.send_offsets_ms.length; attempt += 1) {
      const delayMs = plan.send_offsets_ms[attempt];
      const timer = setTimeout(() => {
        active.timers.delete(timer);
        if (this.closed || !this.activePunches.has(sessionId)) return;
        const packet = createVoidUdpHolePunchPacketV1({
          sessionId,
          sourceNodeId: this.localNodeId,
          targetNodeId: peerNodeId,
          attempt,
        });
        const bytes = Buffer.from(JSON.stringify(packet), "utf8");
        void this.sendBytes(bytes, active.peer_host, active.peer_port)
          .then(() => {
            active.packets_sent += 1;
          })
          .catch((error) => {
            console.warn("VOID_P2P_UDP_SWARM_DATAGRAM_RUNTIME_V1_PUNCH_SEND_FAILURE", {
              session_id: sessionId,
              peer_node_id: peerNodeId,
              reason: error instanceof Error ? error.message : String(error),
            });
          });
      }, delayMs);
      timer.unref?.();
      active.timers.add(timer);
    }

    const expiry = setTimeout(() => {
      active.timers.delete(expiry);
      if (this.activePunches.get(sessionId) === active && !active.direct_path_observed) {
        this.removePunch(sessionId);
      }
    }, plan.attempt_timeout_ms + 25);
    expiry.unref?.();
    active.timers.add(expiry);

    return Object.freeze({
      session_id: sessionId,
      peer_node_id: peerNodeId,
      peer_observed_endpoint: peer.canonical,
      scheduled_send_count: plan.send_offsets_ms.length,
    });
  }

  cancelDirectSession(sessionId: string): boolean {
    if (!ID_RE.test(sessionId)) return false;
    return this.removePunch(sessionId);
  }

  snapshot(): VoidUdpSwarmDatagramRuntimeSnapshotV1 {
    const activePunches = [...this.activePunches.values()]
      .map((active) => Object.freeze({
        session_id: active.plan.session_id,
        peer_node_id: active.plan.peer_node_id,
        peer_observed_endpoint: active.plan.peer_observed_endpoint,
        packets_sent: active.packets_sent,
        direct_path_observed: active.direct_path_observed,
      }))
      .sort((a, b) => a.session_id.localeCompare(b.session_id));
    return Object.freeze({
      started: this.started,
      closed: this.closed,
      bound: this.boundValue,
      active_punch_count: activePunches.length,
      active_punches: Object.freeze(activePunches),
    });
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    for (const sessionId of [...this.activePunches.keys()]) this.removePunch(sessionId);
    try {
      this.socket.close();
    } catch (error) {
      void error;
    }
  }

  private requireStarted(): void {
    if (this.closed) throw new Error("UDP swarm datagram runtime is closed");
    if (!this.started || !this.boundValue) {
      throw new Error("UDP swarm datagram runtime is not started");
    }
  }

  private async receiveDatagram(bytes: Buffer, rinfo: dgram.RemoteInfo): Promise<void> {
    if (this.closed || bytes.length < 2 || bytes.length > VOID_P2P_UDP_SWARM_DATAGRAM_RUNTIME_MAX_DATAGRAM_BYTES_V1) {
      return;
    }

    const rendezvousProbe = decodeVoidUdpRendezvousProbeV1(bytes);
    if (rendezvousProbe && this.options.onRelayRendezvousProbe) {
      try {
        await this.options.onRelayRendezvousProbe({
          packet: rendezvousProbe,
          remoteAddress: rinfo.address,
          remotePort: rinfo.port,
        });
      } catch (error) {
        console.warn("VOID_P2P_UDP_SWARM_DATAGRAM_RUNTIME_V1_RELAY_PROBE_REJECT", {
          reason: error instanceof Error ? error.message : String(error),
        });
      }
      return;
    }

    const punch = decodeVoidUdpHolePunchPacketV1(bytes);
    if (!punch || punch.target_node_id !== this.localNodeId) return;
    const active = this.activePunches.get(punch.session_id);
    if (!active || active.direct_path_observed) return;
    if (
      punch.source_node_id !== active.plan.peer_node_id ||
      punch.attempt >= active.plan.burst_count ||
      !endpointMatchesSource(
        { host: active.peer_host, port: active.peer_port },
        rinfo.address,
        rinfo.port,
      )
    ) {
      return;
    }

    active.direct_path_observed = true;

    const observation = Object.freeze({
      session_id: active.plan.session_id,
      peer_node_id: active.plan.peer_node_id,
      peer_observed_endpoint: active.plan.peer_observed_endpoint,
      source_address: rinfo.address,
      source_port: rinfo.port,
      observed_at_ms: Date.now(),
    });
    try {
      await this.options.onDirectPathObserved?.(observation);
    } catch (error) {
      console.warn("VOID_P2P_UDP_SWARM_DATAGRAM_RUNTIME_V1_DIRECT_OBSERVED_CALLBACK_FAILURE", {
        session_id: active.plan.session_id,
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private sendBytes(bytes: Uint8Array, host: string, port: number): Promise<void> {
    this.requireStarted();
    if (
      !(bytes instanceof Uint8Array) ||
      bytes.byteLength < 1 ||
      bytes.byteLength > VOID_P2P_UDP_SWARM_DATAGRAM_RUNTIME_MAX_DATAGRAM_BYTES_V1 ||
      net.isIP(host) !== 4 ||
      !Number.isInteger(port) ||
      port < 1 ||
      port > 65_535
    ) {
      return Promise.reject(new Error("UDP swarm datagram runtime send input is invalid"));
    }
    return new Promise<void>((resolve, reject) => {
      this.socket.send(bytes, port, host, (error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  }

  private removePunch(sessionId: string): boolean {
    const active = this.activePunches.get(sessionId);
    if (!active) return false;
    this.activePunches.delete(sessionId);
    for (const timer of active.timers) clearTimeout(timer);
    active.timers.clear();
    return true;
  }
}