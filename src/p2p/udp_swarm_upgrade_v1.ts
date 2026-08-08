// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025-2026 6ZoSo9

import {
  createVoidUdpHolePunchPlanV1,
  type VoidUdpHolePunchPlanV1,
} from "./udp_hole_punch_v1.js";
import type { VoidUdpRendezvousObservationV1 } from "./udp_rendezvous_v1.js";
import {
  VoidUdpSecureSessionBootstrapV1,
  type VoidUdpSecureSessionBootstrapOptionsV1,
} from "./udp_secure_session_bootstrap_v1.js";
import type { VoidUdpPeerSocketAdapterV1 } from "./udp_peer_socket_adapter_v1.js";
import type { VoidUdpSecurePacketV1 } from "./udp_secure_reliable_transport_v1.js";
import type {
  VoidUdpAuthenticatedPathHelloV1,
  VoidUdpAuthenticatedPathProofV1,
} from "./udp_authenticated_path_v1.js";
import type { VoidUdpSecureKeyOfferV1 } from "./udp_secure_reliable_transport_v1.js";

export const VOID_P2P_UDP_SWARM_UPGRADE_VERSION_V1 = 1;

export const VOID_P2P_UDP_SWARM_UPGRADE_AUTHORITY_V1 = Object.freeze({
  authenticated_control_path_required: true,
  authenticated_rendezvous_observation_verifier_required: true,
  unverified_detached_rendezvous_observation_allowed: false,
  rendezvous_probe_signature_reverification_performed_here: false,
  stable_rendezvous_mapping_required: true,
  conflicted_rendezvous_mapping_allowed: false,
  secure_session_path_evidence_binding_inherited: true,
  secure_transport_suite_binding_inherited: true,
  crypto_agility_extension_point_inherited: true,
  quantum_safe_claimed: false,
  punch_success_defines_peer_identity: false,
  secure_socket_ready_defines_peer_promotion: false,
  normal_void_peer_auth_required_after_secure_socket: true,
  relay_retirement_before_normal_void_peer_auth_allowed: false,
  relay_fallback_preserved_on_direct_failure: true,
  bounded_offer_punch_timing_supported: true,
  runtime_node_core_mount_performed: false,
  verified_direct_cache_mutation_performed: false,
  router_configuration_required: false,
  port_forward_required: false,
  wallet_signer_validator_wc_money_authority: 0,
});

export type VoidUdpSwarmUpgradePhaseV1 =
  | "relay_only"
  | "punch_planned"
  | "secure_bootstrap"
  | "direct_socket_ready"
  | "direct_peer_authenticated"
  | "direct_failed_relay_preserved"
  | "closed";

export type VoidUdpAuthenticatedRendezvousObservationVerifierV1 = (
  observation: VoidUdpRendezvousObservationV1,
  expectedNodeId: string,
) => boolean;

export type VoidUdpSwarmUpgradeOptionsV1 = Readonly<{
  sessionId: string;
  localNodeId: string;
  remoteNodeId: string;
  localPublicPem: string;
  localPrivateKey: VoidUdpSecureSessionBootstrapOptionsV1["localPrivateKey"];
  localObservation: VoidUdpRendezvousObservationV1;
  remoteObservation: VoidUdpRendezvousObservationV1;
  startDelayMs?: number;
  attemptTimeoutMs?: number;
  verifyAuthenticatedRendezvousObservation: VoidUdpAuthenticatedRendezvousObservationVerifierV1;
  transmitSecurePacket: (packet: VoidUdpSecurePacketV1) => void | Promise<void>;
  allowNonPublicEndpoints?: boolean;
  adapterOptions?: VoidUdpSecureSessionBootstrapOptionsV1["adapterOptions"];
  onDirectSocketReady?: (socket: VoidUdpPeerSocketAdapterV1) => void;
}>;

const ID_RE = /^[0-9a-f]{32}$/;

function observationEligible(
  observation: VoidUdpRendezvousObservationV1,
  expectedNodeId: string,
): boolean {
  return !!observation &&
    ID_RE.test(observation.ticket_id) &&
    observation.node_id === expectedNodeId &&
    typeof observation.observed_endpoint === "string" &&
    observation.observed_endpoint.length >= 3 &&
    Number.isSafeInteger(observation.first_seen_ms) &&
    Number.isSafeInteger(observation.last_seen_ms) &&
    observation.first_seen_ms >= 0 &&
    observation.last_seen_ms >= observation.first_seen_ms &&
    Number.isSafeInteger(observation.probe_count) &&
    observation.probe_count >= 2 &&
    observation.stable_same_rendezvous === true &&
    observation.mapping_conflicted === false;
}

function observationProvenanceAccepted(
  verifier: VoidUdpAuthenticatedRendezvousObservationVerifierV1,
  observation: VoidUdpRendezvousObservationV1,
  expectedNodeId: string,
): boolean {
  try {
    return verifier(observation, expectedNodeId) === true;
  } catch {
    return false;
  }
}

export class VoidUdpSwarmUpgradeV1 {
  private phaseValue: VoidUdpSwarmUpgradePhaseV1 = "relay_only";
  private punchPlanValue?: VoidUdpHolePunchPlanV1;
  private secureBootstrapValue?: VoidUdpSecureSessionBootstrapV1;
  private directSocketValue?: VoidUdpPeerSocketAdapterV1;
  private directSocketCallbackEmitted = false;
  private directFailureReasonValue?: string;

  constructor(private readonly options: VoidUdpSwarmUpgradeOptionsV1) {
    if (!ID_RE.test(options.sessionId)) {
      throw new Error("UDP swarm upgrade session ID is invalid");
    }
    if (!ID_RE.test(options.localNodeId) || !ID_RE.test(options.remoteNodeId)) {
      throw new Error("UDP swarm upgrade node ID is invalid");
    }
    if (options.localNodeId === options.remoteNodeId) {
      throw new Error("UDP swarm upgrade requires distinct node IDs");
    }
    if (typeof options.verifyAuthenticatedRendezvousObservation !== "function") {
      throw new Error("authenticated UDP rendezvous observation verifier is required");
    }
    if (!observationEligible(options.localObservation, options.localNodeId)) {
      throw new Error("local UDP rendezvous observation is not stable and eligible");
    }
    if (!observationEligible(options.remoteObservation, options.remoteNodeId)) {
      throw new Error("remote UDP rendezvous observation is not stable and eligible");
    }
    if (!observationProvenanceAccepted(
      options.verifyAuthenticatedRendezvousObservation,
      options.localObservation,
      options.localNodeId,
    )) {
      throw new Error("local authenticated UDP rendezvous observation provenance verification failed");
    }
    if (!observationProvenanceAccepted(
      options.verifyAuthenticatedRendezvousObservation,
      options.remoteObservation,
      options.remoteNodeId,
    )) {
      throw new Error("remote authenticated UDP rendezvous observation provenance verification failed");
    }
  }

  get phase(): VoidUdpSwarmUpgradePhaseV1 {
    return this.phaseValue;
  }

  get directSocket(): VoidUdpPeerSocketAdapterV1 | undefined {
    return this.directSocketValue;
  }

  get directFailureReason(): string | undefined {
    return this.directFailureReasonValue;
  }

  get relayRetirementAuthorized(): boolean {
    return this.phaseValue === "direct_peer_authenticated";
  }

  beginPunch(): VoidUdpHolePunchPlanV1 {
    if (this.phaseValue === "closed") {
      throw new Error("UDP swarm upgrade is closed");
    }
    if (this.phaseValue === "direct_failed_relay_preserved") {
      throw new Error("failed UDP swarm upgrade requires a fresh session");
    }
    if (this.punchPlanValue) return this.punchPlanValue;

    this.punchPlanValue = createVoidUdpHolePunchPlanV1({
      sessionId: this.options.sessionId,
      localNodeId: this.options.localNodeId,
      peerNodeId: this.options.remoteNodeId,
      peerObservedEndpoint: this.options.remoteObservation.observed_endpoint,
      startDelayMs: this.options.startDelayMs,
      attemptTimeoutMs: this.options.attemptTimeoutMs,
      allowNonPublicObservedEndpoint: this.options.allowNonPublicEndpoints === true,
    });
    this.phaseValue = "punch_planned";
    return this.punchPlanValue;
  }

  markDirectPathObserved(): void {
    if (this.phaseValue === "closed") {
      throw new Error("UDP swarm upgrade is closed");
    }
    if (!this.punchPlanValue) {
      throw new Error("UDP punch plan is required before direct-path observation");
    }
    if (this.secureBootstrapValue) return;

    this.secureBootstrapValue = new VoidUdpSecureSessionBootstrapV1({
      sessionId: this.options.sessionId,
      localNodeId: this.options.localNodeId,
      remoteNodeId: this.options.remoteNodeId,
      localPublicPem: this.options.localPublicPem,
      localPrivateKey: this.options.localPrivateKey,
      localObservedEndpoint: this.options.localObservation.observed_endpoint,
      remoteObservedEndpoint: this.options.remoteObservation.observed_endpoint,
      transmitSecurePacket: this.options.transmitSecurePacket,
      allowNonPublicEndpoints: this.options.allowNonPublicEndpoints,
      adapterOptions: this.options.adapterOptions,
      onReady: (socket) => {
        if (this.phaseValue === "closed" || this.phaseValue === "direct_failed_relay_preserved") {
          socket.destroy();
          return;
        }
        this.directSocketValue = socket;
        this.phaseValue = "direct_socket_ready";
        if (!this.directSocketCallbackEmitted) {
          this.directSocketCallbackEmitted = true;
          this.options.onDirectSocketReady?.(socket);
        }
      },
    });
    this.phaseValue = "secure_bootstrap";
  }

  localHello(): VoidUdpAuthenticatedPathHelloV1 {
    return this.bootstrap().localHello();
  }

  acceptRemoteHello(raw: unknown): boolean {
    return this.bootstrap().acceptRemoteHello(raw);
  }

  createLocalProof(): VoidUdpAuthenticatedPathProofV1 {
    return this.bootstrap().createLocalProof();
  }

  acceptRemoteProof(raw: unknown): boolean {
    return this.bootstrap().acceptRemoteProof(raw);
  }

  createLocalKeyOffer(): VoidUdpSecureKeyOfferV1 {
    return this.bootstrap().createLocalKeyOffer();
  }

  acceptRemoteKeyOffer(raw: unknown): boolean {
    return this.bootstrap().acceptRemoteKeyOffer(raw);
  }

  receiveSecurePacket(raw: unknown): boolean {
    if (!this.secureBootstrapValue) return false;
    return this.secureBootstrapValue.receiveSecurePacket(raw);
  }

  tick(nowMs = Date.now()): void {
    this.secureBootstrapValue?.tick(nowMs);
  }

  confirmNormalVoidPeerAuthenticated(authenticatedNodeId: string): boolean {
    if (this.phaseValue !== "direct_socket_ready" || !this.directSocketValue) {
      return false;
    }
    if (authenticatedNodeId !== this.options.remoteNodeId) {
      return false;
    }
    this.phaseValue = "direct_peer_authenticated";
    return true;
  }

  failDirectAttempt(reason: string | Error): void {
    if (this.phaseValue === "closed" || this.phaseValue === "direct_peer_authenticated") {
      return;
    }
    this.directFailureReasonValue =
      reason instanceof Error ? reason.message : String(reason || "direct UDP attempt failed");
    this.secureBootstrapValue?.destroy(
      reason instanceof Error ? reason : new Error(this.directFailureReasonValue),
    );
    this.directSocketValue = undefined;
    this.phaseValue = "direct_failed_relay_preserved";
  }

  destroy(): void {
    if (this.phaseValue === "closed") return;
    this.secureBootstrapValue?.destroy();
    this.directSocketValue = undefined;
    this.phaseValue = "closed";
  }

  private bootstrap(): VoidUdpSecureSessionBootstrapV1 {
    if (!this.secureBootstrapValue) {
      throw new Error("direct UDP path must be observed before secure bootstrap packets");
    }
    return this.secureBootstrapValue;
  }
}
