// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025-2026 6ZoSo9

import * as net from "node:net";
import type * as crypto from "node:crypto";

import type { Node } from "../node_core.js";
import {
  VoidUdpSwarmSocketRuntimeV1,
  type VoidUdpSwarmSocketFamilyV1,
} from "./udp_swarm_socket_runtime_v1.js";

export const VOID_P2P_UDP_SWARM_NODE_RUNTIME_MOUNT_V1 =
  "VOID_P2P_UDP_SWARM_NODE_RUNTIME_MOUNT_V1";

export const VOID_P2P_UDP_SWARM_NODE_RUNTIME_MOUNT_AUTHORITY_V1 =
  Object.freeze({
    explicit_opt_in_required: true,
    one_udp_socket_per_mount: true,
    existing_udp_socket_runtime_reused: true,
    existing_authenticated_control_reused: true,
    normal_void_peer_authentication_required: true,
    exact_live_relay_fallback_required_before_candidate_staging: true,
    relay_preserved_during_candidate_promotion: true,
    public_status_read_only: true,
    public_status_peer_identity_exposed: false,
    public_status_observed_endpoint_exposed: false,
    automatic_relay_reservation_performed: false,
    automatic_relay_connection_performed: false,
    relay_retirement_performed: false,
    router_configuration_required: false,
    port_forward_required: false,
    upnp_required: false,
    nat_pmp_required: false,
    deployment_performed: false,
    service_restart_performed: false,
    wallet_signer_validator_wc_money_authority: 0,
  });

type EnvironmentV1 = Readonly<Record<string, string | undefined>>;

export type VoidUdpSwarmNodeRuntimeEnvironmentV1 = Readonly<{
  enabled: boolean;
  relay_server_enabled: boolean;
  relay_public_endpoint: string | null;
  family: VoidUdpSwarmSocketFamilyV1;
  bind_host: string;
  bind_port: number;
  allow_nonpublic_endpoints: boolean;
}>;

type NodeIdentityV1 = Readonly<{
  nodeId: string;
  pubPEM: string;
  privateKey: crypto.KeyObject;
}>;

type ReadonlyRouteAppV1 = Readonly<{
  get: (
    path: string,
    handler: (request: unknown, response: {
      status: (code: number) => { json: (body: unknown) => unknown };
    }) => unknown,
  ) => unknown;
}>;

function exactFlag(
  env: EnvironmentV1,
  name: string,
  fallback = false,
): boolean {
  const raw = env[name];
  if (raw === undefined || raw === "") return fallback;
  if (raw === "0") return false;
  if (raw === "1") return true;
  throw new Error(`${name} must be exact 0 or 1`);
}

function boundedPort(raw: string | undefined, fallback: number): number {
  if (raw === undefined || raw === "") return fallback;
  if (!/^(?:0|[1-9][0-9]{0,4})$/.test(raw)) {
    throw new Error("VOID_P2P_UDP_SWARM_BIND_PORT must be an unpadded integer");
  }
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < 0 || value > 65_535) {
    throw new Error("VOID_P2P_UDP_SWARM_BIND_PORT is out of range");
  }
  return value;
}

function endpointPort(raw: string): Readonly<{ family: 4 | 6; port: number }> {
  let host = "";
  let portText = "";
  const ipv6 = raw.match(/^\[([^\]]+)]:(\d+)$/);
  const ipv4 = raw.match(/^([^:[\]]+):(\d+)$/);
  if (ipv6) {
    host = ipv6[1] ?? "";
    portText = ipv6[2] ?? "";
  } else if (ipv4) {
    host = ipv4[1] ?? "";
    portText = ipv4[2] ?? "";
  }
  const family = net.isIP(host);
  const port = Number(portText);
  if (
    (family !== 4 && family !== 6) ||
    !Number.isSafeInteger(port) ||
    port < 1 ||
    port > 65_535
  ) {
    throw new Error("VOID_P2P_UDP_SWARM_RELAY_ENDPOINT must be a numeric IP:port");
  }
  return Object.freeze({ family, port });
}

export function readVoidUdpSwarmNodeRuntimeEnvironmentV1(
  env: EnvironmentV1 = process.env,
): VoidUdpSwarmNodeRuntimeEnvironmentV1 {
  const enabled = exactFlag(env, "VOID_P2P_UDP_SWARM_RUNTIME_ENABLED");
  const relayServerEnabled = exactFlag(env, "VOID_P2P_RELAY_SERVER_ENABLED");
  const allowNonpublicEndpoints = exactFlag(
    env,
    "VOID_P2P_UDP_SWARM_TEST_ALLOW_NONPUBLIC_ENDPOINTS",
  );
  if (allowNonpublicEndpoints && env.NODE_ENV !== "test") {
    throw new Error(
      "VOID_P2P_UDP_SWARM_TEST_ALLOW_NONPUBLIC_ENDPOINTS requires NODE_ENV=test",
    );
  }

  const familyRaw = env.VOID_P2P_UDP_SWARM_FAMILY || "udp4";
  if (familyRaw !== "udp4" && familyRaw !== "udp6") {
    throw new Error("VOID_P2P_UDP_SWARM_FAMILY must be udp4 or udp6");
  }
  const family = familyRaw;
  const bindHost =
    env.VOID_P2P_UDP_SWARM_BIND_HOST ||
    (family === "udp4" ? "0.0.0.0" : "::");
  const bindFamily = net.isIP(bindHost);
  if (
    (family === "udp4" && bindFamily !== 4) ||
    (family === "udp6" && bindFamily !== 6)
  ) {
    throw new Error("VOID_P2P_UDP_SWARM_BIND_HOST does not match the UDP family");
  }
  const bindPort = boundedPort(env.VOID_P2P_UDP_SWARM_BIND_PORT, 0);

  const relayPublicEndpoint =
    String(env.VOID_P2P_UDP_SWARM_RELAY_ENDPOINT || "").trim() || null;
  if (relayPublicEndpoint) {
    if (!enabled || !relayServerEnabled) {
      throw new Error(
        "VOID_P2P_UDP_SWARM_RELAY_ENDPOINT requires the UDP runtime and relay server",
      );
    }
    if (bindPort === 0) {
      throw new Error(
        "a UDP rendezvous relay requires an explicit nonzero bind port",
      );
    }
    const endpoint = endpointPort(relayPublicEndpoint);
    if (
      endpoint.port !== bindPort ||
      (family === "udp4" && endpoint.family !== 4) ||
      (family === "udp6" && endpoint.family !== 6)
    ) {
      throw new Error(
        "UDP rendezvous relay endpoint must match the configured family and bind port",
      );
    }
  }

  return Object.freeze({
    enabled,
    relay_server_enabled: relayServerEnabled,
    relay_public_endpoint: relayPublicEndpoint,
    family,
    bind_host: bindHost,
    bind_port: bindPort,
    allow_nonpublic_endpoints: allowNonpublicEndpoints,
  });
}

function addressClass(address: string | null): string | null {
  if (!address) return null;
  if (address === "0.0.0.0" || address === "::") return "wildcard";
  if (address === "127.0.0.1" || address === "::1") return "loopback";
  const family = net.isIP(address);
  return family === 4 ? "numeric_ipv4" : family === 6 ? "numeric_ipv6" : null;
}

export class VoidUdpSwarmNodeRuntimeMountV1 {
  private runtime?: VoidUdpSwarmSocketRuntimeV1;
  private promotionTimer: NodeJS.Timeout | null = null;
  private callbacksInstalled = false;
  private installedProbeCallback?: Node["onUdpSwarmProbeAction"];
  private installedDirectOfferCallback?: Node["onUdpSwarmDirectUpgradeOffer"];
  private started = false;
  private stopped = false;
  private probeSendFailures = 0;
  private relayProbeRejects = 0;
  private directOfferRejects = 0;
  private candidateStageRejects = 0;
  private candidatePromotions = 0;
  private candidatePromotionRejects = 0;
  private runtimeErrors = 0;

  constructor(
    private readonly node: Node,
    private readonly identity: NodeIdentityV1,
    readonly config: VoidUdpSwarmNodeRuntimeEnvironmentV1,
  ) {}

  async start(): Promise<void> {
    if (this.stopped) throw new Error("UDP swarm Node runtime mount is stopped");
    if (this.started) return;
    if (!this.config.enabled) {
      this.started = true;
      return;
    }
    if (this.node.onUdpSwarmProbeAction || this.node.onUdpSwarmDirectUpgradeOffer) {
      throw new Error("UDP swarm Node callbacks are already mounted");
    }
    if (this.node.id !== this.identity.nodeId) {
      throw new Error("UDP swarm Node runtime identity does not match the Node");
    }

    const runtime = new VoidUdpSwarmSocketRuntimeV1({
      localNodeId: this.identity.nodeId,
      localPublicPem: this.identity.pubPEM,
      localPrivateKey: this.identity.privateKey,
      family: this.config.family,
      bindHost: this.config.bind_host,
      bindPort: this.config.bind_port,
      allowNonPublicEndpoints: this.config.allow_nonpublic_endpoints,
      onRendezvousProbe: (event) => {
        const result = this.node.ingestUdpSwarmRendezvousProbeV1(
          event.packet,
          event.remote_address,
          event.remote_port,
        );
        if (!result.ok) this.relayProbeRejects += 1;
      },
      onDirectSocketReady: (event) => {
        try {
          const staged = this.node.stageUdpSwarmAuthenticatedDirectCandidateV1({
            sessionId: event.session_id,
            expectedPeerNodeId: event.peer_node_id,
            relayNodeId: this.relayNodeId(event.session_id),
            relayStreamId: this.relayStreamId(event.session_id),
            transportHint: `udp-swarm:${event.session_id}`,
            socket: event.socket,
          });
          if (!staged) this.candidateStageRejects += 1;
        } catch (error) {
          this.candidateStageRejects += 1;
          event.socket.destroy(
            error instanceof Error ? error : new Error(String(error)),
          );
        }
      },
      onUpgradeFailure: () => {
        this.directOfferRejects += 1;
      },
      onRuntimeError: () => {
        this.runtimeErrors += 1;
      },
    });
    this.runtime = runtime;
    try {
      await runtime.start();
    } catch (error) {
      this.runtime = undefined;
      await runtime.stop();
      throw error;
    }

    this.node.onUdpSwarmProbeAction = (action) => {
      void runtime.sendRendezvousProbeAction(action).catch(() => {
        this.probeSendFailures += 1;
      });
    };
    this.installedProbeCallback = this.node.onUdpSwarmProbeAction;
    this.node.onUdpSwarmDirectUpgradeOffer = (action) => {
      try {
        runtime.startDirectUpgrade(action);
      } catch (error) {
        void error;
        this.directOfferRejects += 1;
      }
    };
    this.installedDirectOfferCallback =
      this.node.onUdpSwarmDirectUpgradeOffer;
    this.callbacksInstalled = true;

    this.promotionTimer = setInterval(() => {
      try {
        this.promoteReadyCandidates();
      } catch (error) {
        void error;
        this.runtimeErrors += 1;
      }
    }, 100);
    this.promotionTimer.unref?.();
    this.started = true;
  }

  private relayNodeId(sessionId: string): string {
    const session = this.runtime?.snapshot().sessions.find(
      (entry) => entry.session_id === sessionId,
    );
    if (!session) throw new Error("UDP swarm runtime session disappeared");
    return session.relay_node_id;
  }

  private relayStreamId(sessionId: string): string {
    const control = this.node.udpSwarmControlSnapshot();
    const route = control.active_routes.find(
      (entry) => entry.session_id === sessionId,
    );
    if (!route) throw new Error("UDP swarm control route disappeared");
    return route.stream_id;
  }

  private promoteReadyCandidates(): void {
    const mountedSessionIds = new Set(
      this.runtime?.snapshot().sessions.map((entry) => entry.session_id) ?? [],
    );
    const snapshot = this.node.udpSwarmAuthenticatedDirectCandidateSnapshotV1();
    for (const candidate of snapshot.candidates) {
      if (!mountedSessionIds.has(candidate.session_id)) continue;
      if (candidate.phase !== "authenticated_candidate") continue;
      const result = this.node.promoteUdpSwarmAuthenticatedDirectCandidateV1(
        candidate.session_id,
      );
      if (result.ok) this.candidatePromotions += 1;
      else this.candidatePromotionRejects += 1;
    }
  }

  status(): Readonly<Record<string, unknown>> {
    const runtime = this.runtime?.snapshot();
    const phases: Record<string, number> = {};
    for (const session of runtime?.sessions ?? []) {
      phases[session.phase] = (phases[session.phase] ?? 0) + 1;
    }
    const candidates = this.node.udpSwarmAuthenticatedDirectCandidateSnapshotV1();
    const promoted = this.node.udpSwarmPromotedDirectRouteSnapshotV1();
    const mountedSessionIds = new Set(
      runtime?.sessions.map((entry) => entry.session_id) ?? [],
    );
    return Object.freeze({
      marker: VOID_P2P_UDP_SWARM_NODE_RUNTIME_MOUNT_V1,
      enabled: this.config.enabled,
      started: runtime?.started === true,
      stopped: this.stopped,
      role: this.config.relay_public_endpoint
        ? "rendezvous_relay"
        : "participant",
      family: this.config.family,
      bound: runtime?.bound
        ? Object.freeze({
            address_class: addressClass(runtime.bound.address),
            port: runtime.bound.port,
            raw_address_exposed: false,
          })
        : null,
      relay_public_endpoint_configured:
        this.config.relay_public_endpoint !== null,
      runtime: Object.freeze({
        session_count: runtime?.session_count ?? 0,
        session_phases: Object.freeze(phases),
        sent_datagram_count: runtime?.sent_datagram_count ?? 0,
        received_datagram_count: runtime?.received_datagram_count ?? 0,
        rejected_oversize_datagram_count:
          runtime?.rejected_oversize_datagram_count ?? 0,
      }),
      node: Object.freeze({
        staged_candidate_count: candidates.candidates.filter((entry) =>
          mountedSessionIds.has(entry.session_id)
        ).length,
        promoted_route_count: promoted.routes.filter((entry) =>
          mountedSessionIds.has(entry.session_id)
        ).length,
        relay_retirement_performed: false,
      }),
      counters: Object.freeze({
        probe_send_failures: this.probeSendFailures,
        relay_probe_rejects: this.relayProbeRejects,
        direct_offer_rejects: this.directOfferRejects,
        candidate_stage_rejects: this.candidateStageRejects,
        candidate_promotions: this.candidatePromotions,
        candidate_promotion_rejects: this.candidatePromotionRejects,
        runtime_errors: this.runtimeErrors,
      }),
      privacy: Object.freeze({
        peer_identity_exposed: false,
        observed_endpoint_exposed: false,
        node_private_key_exposed: false,
      }),
      authority: VOID_P2P_UDP_SWARM_NODE_RUNTIME_MOUNT_AUTHORITY_V1,
    });
  }

  async stop(): Promise<void> {
    if (this.stopped) return;
    this.stopped = true;
    if (this.promotionTimer) {
      clearInterval(this.promotionTimer);
      this.promotionTimer = null;
    }
    if (this.callbacksInstalled) {
      if (this.node.onUdpSwarmProbeAction === this.installedProbeCallback) {
        this.node.onUdpSwarmProbeAction = undefined;
      }
      if (
        this.node.onUdpSwarmDirectUpgradeOffer ===
        this.installedDirectOfferCallback
      ) {
        this.node.onUdpSwarmDirectUpgradeOffer = undefined;
      }
      this.installedProbeCallback = undefined;
      this.installedDirectOfferCallback = undefined;
      this.callbacksInstalled = false;
    }
    const runtime = this.runtime;
    this.runtime = undefined;
    if (runtime) await runtime.stop();
  }
}

export async function createVoidUdpSwarmNodeRuntimeMountV1(options: {
  node: Node;
  identity: NodeIdentityV1;
  config: VoidUdpSwarmNodeRuntimeEnvironmentV1;
}): Promise<VoidUdpSwarmNodeRuntimeMountV1> {
  const mount = new VoidUdpSwarmNodeRuntimeMountV1(
    options.node,
    options.identity,
    options.config,
  );
  await mount.start();
  return mount;
}

export function registerVoidUdpSwarmNodeRuntimeReadonlyRouteV1(
  app: ReadonlyRouteAppV1,
  mount: VoidUdpSwarmNodeRuntimeMountV1,
): void {
  app.get("/p2p/udp-swarm/runtime-v1", (_request, response) =>
    response.status(200).json(mount.status()),
  );
}
