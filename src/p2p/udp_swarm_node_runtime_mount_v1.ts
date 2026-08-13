// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025-2026 6ZoSo9

import * as net from "node:net";
import type * as crypto from "node:crypto";

import type { Node } from "../node_core.js";
import {
  VoidUdpSwarmSocketRuntimeV1,
  type VoidUdpSwarmSocketFamilyV1,
} from "./udp_swarm_socket_runtime_v1.js";
import {
  VOID_P2P_UDP_SWARM_RELAY_ORCHESTRATOR_MAX_ROUTES_V1,
  VOID_P2P_UDP_SWARM_RELAY_ORCHESTRATOR_V1,
  VoidUdpSwarmRelayOrchestratorV1,
  parseVoidUdpSwarmRelayOrchestrationRoutesV1,
  type VoidUdpSwarmRelayOrchestrationRouteV1,
} from "./udp_swarm_relay_orchestrator_v1.js";
import {
  VOID_P2P_UDP_SWARM_PUBLIC_RELAY_INTRODUCTION_COLLECTOR_V1,
  VOID_P2P_UDP_SWARM_PUBLIC_RELAY_INTRODUCTION_AUTHORITY_V1,
  VoidUdpSwarmPublicRelayIntroductionCollectorV1,
  type VoidUdpSwarmPublicRelayIntroductionCollectorMountOptionsV1,
} from "./udp_swarm_public_relay_introduction_collector_v1.js";

export const VOID_P2P_UDP_SWARM_NODE_RUNTIME_MOUNT_V1 =
  "VOID_P2P_UDP_SWARM_NODE_RUNTIME_MOUNT_V1";

export const VOID_P2P_UDP_SWARM_VERIFIED_DISCOVERY_COMPOSITION_MARKER_V1 =
  "void_p2p_udp_swarm_verified_discovery_composition_v1";

export const VOID_P2P_UDP_SWARM_VERIFIED_DISCOVERY_MAX_LEASE_MS_V1 =
  10 * 60_000;

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
    automatic_udp_upgrade_initiation_performed: false,
    verified_discovery_runtime_activation_supported: true,
    verified_discovery_expiry_lease_required: true,
    public_relay_introduction_collector_supported: true,
    public_relay_introduction_collector_auto_started: false,
    public_relay_introduction_transport_is_authority: false,
    unverified_runtime_routes_accepted: false,
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
  orchestration_enabled: boolean;
  orchestration_routes: readonly VoidUdpSwarmRelayOrchestrationRouteV1[];
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

const VERIFIED_DISCOVERY_RESULT_KEYS_V1 = Object.freeze([
  "marker",
  "record_id",
  "manifest_id",
  "discovery_id",
  "expires_at",
  "route_count",
  "source_count",
  "relay_count",
  "target_count",
  "relay_failure_domain_count",
  "n_minus_one_relay_coverage_verified",
  "environment",
  "transport_is_authority",
  "wallet_signer_validator_wc_money_authority",
  "network_io_implemented",
  "environment_mutation_performed",
  "launcher_activation_performed",
  "deployment_performed",
  "service_restart_performed",
].sort());

const VERIFIED_DISCOVERY_ENVIRONMENT_KEYS_V1 = Object.freeze([
  "VOID_P2P_UDP_SWARM_ORCHESTRATION_ENABLED",
  "VOID_P2P_UDP_SWARM_ORCHESTRATION_ROUTES",
].sort());

type UnknownRecordV1 = Record<string, unknown>;

export type VoidUdpSwarmVerifiedDiscoveryActivationV1 = Readonly<{
  discovery_id: string;
  expires_at_ms: number;
  routes: readonly VoidUdpSwarmRelayOrchestrationRouteV1[];
}>;

function exactRecord(
  value: unknown,
  keys: readonly string[],
  label: string,
): UnknownRecordV1 {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  const record = value as UnknownRecordV1;
  if (JSON.stringify(Object.keys(record).sort()) !== JSON.stringify(keys)) {
    throw new Error(`${label} keys mismatch`);
  }
  return record;
}

function boundedPositiveInteger(
  value: unknown,
  maximum: number,
  label: string,
): number {
  if (
    !Number.isSafeInteger(value) ||
    Number(value) < 1 ||
    Number(value) > maximum
  ) {
    throw new Error(`${label} is outside its bound`);
  }
  return Number(value);
}

export function parseVoidUdpSwarmVerifiedDiscoveryActivationV1(
  raw: unknown,
  localNodeId: string,
  nowMs = Date.now(),
): VoidUdpSwarmVerifiedDiscoveryActivationV1 {
  if (!Number.isSafeInteger(nowMs) || nowMs < 0) {
    throw new Error("verified discovery activation time is invalid");
  }
  if (!/^[0-9a-f]{32}$/.test(localNodeId)) {
    throw new Error("verified discovery activation local node ID is invalid");
  }
  const result = exactRecord(
    raw,
    VERIFIED_DISCOVERY_RESULT_KEYS_V1,
    "verified discovery composition result",
  );
  if (!Object.isFrozen(result)) {
    throw new Error("verified discovery composition result must be frozen");
  }
  const environment = exactRecord(
    result.environment,
    VERIFIED_DISCOVERY_ENVIRONMENT_KEYS_V1,
    "verified discovery orchestration environment",
  );
  if (!Object.isFrozen(environment)) {
    throw new Error(
      "verified discovery orchestration environment must be frozen",
    );
  }
  if (
    result.marker !==
      VOID_P2P_UDP_SWARM_VERIFIED_DISCOVERY_COMPOSITION_MARKER_V1 ||
    !/^voidpbr2_[0-9a-f]{64}$/.test(String(result.record_id || "")) ||
    !/^voidpbm1_[0-9a-f]{64}$/.test(String(result.manifest_id || "")) ||
    !/^voidpud1_[0-9a-f]{64}$/.test(String(result.discovery_id || ""))
  ) {
    throw new Error("verified discovery composition identity is invalid");
  }
  if (
    result.n_minus_one_relay_coverage_verified !== true ||
    result.transport_is_authority !== false ||
    result.wallet_signer_validator_wc_money_authority !== 0 ||
    result.network_io_implemented !== false ||
    result.environment_mutation_performed !== false ||
    result.launcher_activation_performed !== false ||
    result.deployment_performed !== false ||
    result.service_restart_performed !== false
  ) {
    throw new Error("verified discovery composition authority boundary changed");
  }
  if (
    environment.VOID_P2P_UDP_SWARM_ORCHESTRATION_ENABLED !== "1" ||
    typeof environment.VOID_P2P_UDP_SWARM_ORCHESTRATION_ROUTES !== "string"
  ) {
    throw new Error("verified discovery orchestration contract is invalid");
  }

  const expiresAtText = String(result.expires_at || "");
  const expiresAtMs = Date.parse(expiresAtText);
  if (
    !Number.isFinite(expiresAtMs) ||
    new Date(expiresAtMs).toISOString() !== expiresAtText ||
    expiresAtMs <= nowMs ||
    expiresAtMs - nowMs >
      VOID_P2P_UDP_SWARM_VERIFIED_DISCOVERY_MAX_LEASE_MS_V1
  ) {
    throw new Error("verified discovery activation lease is invalid or expired");
  }

  const routes = parseVoidUdpSwarmRelayOrchestrationRoutesV1(
    environment.VOID_P2P_UDP_SWARM_ORCHESTRATION_ROUTES,
  );
  const routeCount = boundedPositiveInteger(
    result.route_count,
    VOID_P2P_UDP_SWARM_RELAY_ORCHESTRATOR_MAX_ROUTES_V1,
    "route count",
  );
  const sourceCount = boundedPositiveInteger(
    result.source_count,
    32,
    "source count",
  );
  const relayCount = boundedPositiveInteger(
    result.relay_count,
    VOID_P2P_UDP_SWARM_RELAY_ORCHESTRATOR_MAX_ROUTES_V1,
    "relay count",
  );
  const targetCount = boundedPositiveInteger(
    result.target_count,
    VOID_P2P_UDP_SWARM_RELAY_ORCHESTRATOR_MAX_ROUTES_V1,
    "target count",
  );
  const failureDomainCount = boundedPositiveInteger(
    result.relay_failure_domain_count,
    VOID_P2P_UDP_SWARM_RELAY_ORCHESTRATOR_MAX_ROUTES_V1,
    "relay failure-domain count",
  );
  const exactRelayCount = new Set(
    routes.map((route) => route.relay_node_id),
  ).size;
  const exactTargetCount = new Set(
    routes.map((route) => route.target_node_id),
  ).size;
  if (
    routeCount !== routes.length ||
    routeCount < 2 ||
    sourceCount < 2 ||
    relayCount < 2 ||
    relayCount !== exactRelayCount ||
    relayCount > routeCount ||
    targetCount !== exactTargetCount ||
    targetCount > routeCount ||
    failureDomainCount < 2 ||
    failureDomainCount > relayCount
  ) {
    throw new Error("verified discovery composition counts are inconsistent");
  }
  if (
    routes.some(
      (route) =>
        route.relay_node_id === localNodeId ||
        route.target_node_id === localNodeId,
    )
  ) {
    throw new Error("verified discovery contains a local or self route");
  }

  return Object.freeze({
    discovery_id: String(result.discovery_id),
    expires_at_ms: expiresAtMs,
    routes,
  });
}

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
  const orchestrationEnabled = exactFlag(
    env,
    "VOID_P2P_UDP_SWARM_ORCHESTRATION_ENABLED",
  );
  const orchestrationRoutes = parseVoidUdpSwarmRelayOrchestrationRoutesV1(
    env.VOID_P2P_UDP_SWARM_ORCHESTRATION_ROUTES,
  );
  if (orchestrationEnabled && !enabled) {
    throw new Error("UDP swarm relay orchestration requires the UDP runtime");
  }
  if (orchestrationEnabled && orchestrationRoutes.length === 0) {
    throw new Error(
      "UDP swarm relay orchestration requires at least one exact route",
    );
  }
  if (!orchestrationEnabled && orchestrationRoutes.length !== 0) {
    throw new Error("UDP swarm relay orchestration routes require exact opt-in");
  }

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
    orchestration_enabled: orchestrationEnabled,
    orchestration_routes: orchestrationRoutes,
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
  private orchestrator?: VoidUdpSwarmRelayOrchestratorV1;
  private publicRelayIntroductionCollector?:
    VoidUdpSwarmPublicRelayIntroductionCollectorV1;
  private promotionTimer: NodeJS.Timeout | null = null;
  private verifiedDiscoveryExpiryTimer: NodeJS.Timeout | null = null;
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
  private verifiedDiscoveryActive = false;
  private verifiedDiscoveryId: string | null = null;
  private verifiedDiscoveryActivations = 0;
  private verifiedDiscoveryClears = 0;
  private verifiedDiscoveryExpiryClears = 0;
  private verifiedDiscoveryRejects = 0;

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
    const orchestrator = new VoidUdpSwarmRelayOrchestratorV1(this.node, {
      enabled: this.config.orchestration_enabled,
      routes: this.config.orchestration_routes,
    });

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
    this.orchestrator = orchestrator;
    orchestrator.start();
    this.started = true;
  }

  activateVerifiedDiscoveryCompositionV1(
    raw: unknown,
  ): Readonly<{
    changed: boolean;
    route_count: number;
    revision: number;
    discovery_id: string;
  }> {
    if (this.stopped) throw new Error("UDP swarm Node runtime mount is stopped");
    if (!this.started || !this.runtime || !this.orchestrator) {
      throw new Error("UDP swarm Node runtime mount is not active");
    }

    const nowMs = Date.now();
    let activation: VoidUdpSwarmVerifiedDiscoveryActivationV1;
    try {
      activation = parseVoidUdpSwarmVerifiedDiscoveryActivationV1(
        raw,
        this.node.id,
        nowMs,
      );
    } catch (error) {
      this.verifiedDiscoveryRejects += 1;
      throw error;
    }

    let replacement: Readonly<{
      changed: boolean;
      route_count: number;
      revision: number;
    }>;
    try {
      replacement = this.orchestrator.replaceVerifiedDiscoveryRoutesV1(
        activation.routes,
      );
    } catch (error) {
      this.verifiedDiscoveryRejects += 1;
      throw error;
    }

    if (this.verifiedDiscoveryExpiryTimer) {
      clearTimeout(this.verifiedDiscoveryExpiryTimer);
      this.verifiedDiscoveryExpiryTimer = null;
    }
    this.verifiedDiscoveryActive = true;
    this.verifiedDiscoveryId = activation.discovery_id;
    this.verifiedDiscoveryActivations += 1;
    const expectedDiscoveryId = activation.discovery_id;
    const delayMs = Math.max(1, activation.expires_at_ms - Date.now());
    this.verifiedDiscoveryExpiryTimer = setTimeout(() => {
      this.verifiedDiscoveryExpiryTimer = null;
      if (
        this.stopped ||
        !this.verifiedDiscoveryActive ||
        this.verifiedDiscoveryId !== expectedDiscoveryId
      ) return;
      try {
        const cleared = this.clearVerifiedDiscoveryCompositionV1();
        if (cleared.changed) this.verifiedDiscoveryExpiryClears += 1;
      } catch (error) {
        void error;
        this.runtimeErrors += 1;
      }
    }, delayMs);
    this.verifiedDiscoveryExpiryTimer.unref?.();

    return Object.freeze({
      ...replacement,
      discovery_id: activation.discovery_id,
    });
  }

  clearVerifiedDiscoveryCompositionV1(): Readonly<{
    changed: boolean;
    route_count: number;
    revision: number;
  }> {
    if (this.stopped) throw new Error("UDP swarm Node runtime mount is stopped");
    if (!this.started || !this.runtime || !this.orchestrator) {
      throw new Error("UDP swarm Node runtime mount is not active");
    }
    if (this.verifiedDiscoveryExpiryTimer) {
      clearTimeout(this.verifiedDiscoveryExpiryTimer);
      this.verifiedDiscoveryExpiryTimer = null;
    }
    const result = this.orchestrator.clearVerifiedDiscoveryRoutesV1();
    if (this.verifiedDiscoveryActive) this.verifiedDiscoveryClears += 1;
    this.verifiedDiscoveryActive = false;
    this.verifiedDiscoveryId = null;
    return result;
  }

  async startPublicRelayIntroductionCollectorV1(
    options: VoidUdpSwarmPublicRelayIntroductionCollectorMountOptionsV1,
  ): Promise<VoidUdpSwarmPublicRelayIntroductionCollectorV1> {
    if (this.stopped) throw new Error("UDP swarm Node runtime mount is stopped");
    if (!this.started || !this.runtime || !this.orchestrator) {
      throw new Error("UDP swarm Node runtime mount is not active");
    }
    if (this.publicRelayIntroductionCollector) {
      throw new Error("public relay introduction collector is already mounted");
    }
    const collector = new VoidUdpSwarmPublicRelayIntroductionCollectorV1({
      ...options,
      node: this.node,
      activateVerifiedComposition: (raw) =>
        this.activateVerifiedDiscoveryCompositionV1(raw),
    });
    this.publicRelayIntroductionCollector = collector;
    try {
      await collector.start();
    } catch (error) {
      if (this.publicRelayIntroductionCollector === collector) {
        this.publicRelayIntroductionCollector = undefined;
      }
      collector.stop();
      throw error;
    }
    return collector;
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
    const orchestrationActivity = this.orchestrator?.activity();
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
      orchestration: this.orchestrator?.status() ?? Object.freeze({
        marker: VOID_P2P_UDP_SWARM_RELAY_ORCHESTRATOR_V1,
        enabled: false,
        route_count: 0,
        stopped: this.stopped,
      }),
      verified_discovery: Object.freeze({
        active: this.verifiedDiscoveryActive,
        expiry_lease_required: true,
        discovery_identity_exposed: false,
      }),
      public_relay_introduction:
        this.publicRelayIntroductionCollector?.status() ??
        Object.freeze({
          marker:
            VOID_P2P_UDP_SWARM_PUBLIC_RELAY_INTRODUCTION_COLLECTOR_V1,
          started: false,
          stopped: this.stopped,
          running: false,
          authority:
            VOID_P2P_UDP_SWARM_PUBLIC_RELAY_INTRODUCTION_AUTHORITY_V1,
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
        verified_discovery_activations: this.verifiedDiscoveryActivations,
        verified_discovery_clears: this.verifiedDiscoveryClears,
        verified_discovery_expiry_clears: this.verifiedDiscoveryExpiryClears,
        verified_discovery_rejects: this.verifiedDiscoveryRejects,
      }),
      privacy: Object.freeze({
        peer_identity_exposed: false,
        observed_endpoint_exposed: false,
        node_private_key_exposed: false,
      }),
      authority: Object.freeze({
        ...VOID_P2P_UDP_SWARM_NODE_RUNTIME_MOUNT_AUTHORITY_V1,
        automatic_relay_reservation_performed:
          (orchestrationActivity?.reservation_requests ?? 0) > 0,
        automatic_relay_connection_performed:
          (orchestrationActivity?.connect_requests ?? 0) > 0,
        automatic_udp_upgrade_initiation_performed:
          (orchestrationActivity?.upgrade_requests ?? 0) > 0,
      }),
    });
  }

  async stop(): Promise<void> {
    if (this.stopped) return;
    this.stopped = true;
    if (this.promotionTimer) {
      clearInterval(this.promotionTimer);
      this.promotionTimer = null;
    }
    if (this.verifiedDiscoveryExpiryTimer) {
      clearTimeout(this.verifiedDiscoveryExpiryTimer);
      this.verifiedDiscoveryExpiryTimer = null;
    }
    this.verifiedDiscoveryActive = false;
    this.verifiedDiscoveryId = null;
    this.publicRelayIntroductionCollector?.stop();
    this.publicRelayIntroductionCollector = undefined;
    this.orchestrator?.stop();
    this.orchestrator = undefined;
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
