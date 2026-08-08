// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025-2026 6ZoSo9

import { deriveVoidNodeIdFromPublicPemV1 } from "./auth_v1.js";
import type { VoidUdpPeerSocketAdapterV1 } from "./udp_peer_socket_adapter_v1.js";

export const VOID_P2P_UDP_SWARM_AUTHENTICATED_DIRECT_CANDIDATE_VERSION_V1 = 1;

export const VOID_P2P_UDP_SWARM_AUTHENTICATED_DIRECT_CANDIDATE_AUTHORITY_V1 =
  Object.freeze({
    secure_direct_socket_may_be_staged: true,
    exact_expected_peer_node_id_required: true,
    authenticated_public_key_binding_required: true,
    normal_void_hello_auth_required_before_candidate_acceptance: true,
    normal_void_hello_auth_performed_here: false,
    relay_fallback_liveness_required_at_auth_acceptance: true,
    relay_fallback_liveness_rechecked_before_promotion: true,
    promotion_authorization_one_shot: true,
    normal_peer_routing_mutation_performed: false,
    node_core_mount_performed: false,
    relay_retirement_authorized: false,
    relay_retirement_performed: false,
    production_udp_activation_performed: false,
    router_configuration_required: false,
    port_forward_required: false,
    wallet_signer_validator_wc_money_authority: 0,
  });

const NODE_ID_RE = /^[0-9a-f]{32}$/;
const SAFE_TOKEN_RE = /^[^\s\u0000-\u001f\u007f]{1,128}$/;
const SAFE_HINT_RE = /^[^\s\u0000-\u001f\u007f]{1,256}$/;

export type VoidUdpSwarmAuthenticatedDirectCandidatePhaseV1 =
  | "awaiting_void_auth"
  | "authenticated_candidate"
  | "promotion_authorized"
  | "discarded";

export type VoidUdpSwarmAuthenticatedDirectCandidateOptionsV1 = Readonly<{
  sessionId: string;
  expectedPeerNodeId: string;
  relayNodeId: string;
  relayStreamId: string;
  transportHint: string;
  socket: VoidUdpPeerSocketAdapterV1;
  isRelayFallbackLive: () => boolean;
}>;

export type VoidUdpSwarmAuthenticatedDirectCandidatePromotionV1 = Readonly<{
  session_id: string;
  peer_node_id: string;
  relay_node_id: string;
  relay_stream_id: string;
  transport_hint: string;
  socket: VoidUdpPeerSocketAdapterV1;
  persist_direct_evidence: false;
  relay_retirement_authorized: false;
}>;

export type VoidUdpSwarmAuthenticatedDirectCandidateSnapshotV1 = Readonly<{
  version: 1;
  session_id: string;
  expected_peer_node_id: string;
  relay_node_id: string;
  relay_stream_id: string;
  transport_hint: string;
  phase: VoidUdpSwarmAuthenticatedDirectCandidatePhaseV1;
  authenticated_peer_node_id: string | null;
  authenticated_public_key_bound: boolean;
  authenticated_at_ms: number | null;
  promotion_authorized_at_ms: number | null;
  failure_reason: string | null;
  relay_retirement_authorized: false;
  normal_peer_routing_mutation_performed: false;
}>;

function requireNodeId(raw: unknown, label: string): string {
  if (typeof raw !== "string" || !NODE_ID_RE.test(raw)) {
    throw new Error(`${label} must be a canonical VOID node id`);
  }
  return raw;
}

function requireToken(raw: unknown, label: string): string {
  if (typeof raw !== "string" || !SAFE_TOKEN_RE.test(raw)) {
    throw new Error(`${label} must be a bounded token`);
  }
  return raw;
}

function requireHint(raw: unknown): string {
  if (typeof raw !== "string" || !SAFE_HINT_RE.test(raw)) {
    throw new Error("transportHint must be a bounded non-whitespace transport hint");
  }
  return raw;
}

export class VoidUdpSwarmAuthenticatedDirectCandidateV1 {
  readonly sessionId: string;
  readonly expectedPeerNodeId: string;
  readonly relayNodeId: string;
  readonly relayStreamId: string;
  readonly transportHint: string;
  readonly socket: VoidUdpPeerSocketAdapterV1;

  private readonly isRelayFallbackLive: () => boolean;
  private phaseValue: VoidUdpSwarmAuthenticatedDirectCandidatePhaseV1 =
    "awaiting_void_auth";
  private authenticatedPeerNodeId: string | null = null;
  private authenticatedPublicKeyBound = false;
  private authenticatedAtMs: number | null = null;
  private promotionAuthorizedAtMs: number | null = null;
  private failureReason: string | null = null;

  constructor(options: VoidUdpSwarmAuthenticatedDirectCandidateOptionsV1) {
    this.sessionId = requireToken(options.sessionId, "sessionId");
    this.expectedPeerNodeId = requireNodeId(
      options.expectedPeerNodeId,
      "expectedPeerNodeId",
    );
    this.relayNodeId = requireNodeId(options.relayNodeId, "relayNodeId");
    this.relayStreamId = requireToken(options.relayStreamId, "relayStreamId");
    this.transportHint = requireHint(options.transportHint);

    if (
      !options.socket ||
      typeof options.socket.on !== "function" ||
      typeof options.socket.write !== "function" ||
      typeof options.socket.destroy !== "function"
    ) {
      throw new Error("socket must expose the secure UDP peer-socket shape");
    }
    if (options.socket.destroyed) {
      throw new Error("socket must be live when the candidate is created");
    }
    if (typeof options.isRelayFallbackLive !== "function") {
      throw new Error("isRelayFallbackLive callback is required");
    }

    this.socket = options.socket;
    this.isRelayFallbackLive = options.isRelayFallbackLive;
    this.socket.on("close", () => {
      if (
        this.phaseValue !== "discarded" &&
        this.phaseValue !== "promotion_authorized"
      ) {
        this.phaseValue = "discarded";
        this.failureReason = "candidate_transport_closed";
      }
    });
  }

  get phase(): VoidUdpSwarmAuthenticatedDirectCandidatePhaseV1 {
    return this.phaseValue;
  }

  private relayFallbackLive(): boolean {
    try {
      return this.isRelayFallbackLive() === true;
    } catch {
      return false;
    }
  }

  private failClosed(reason: string): false {
    this.phaseValue = "discarded";
    this.failureReason = reason;
    if (!this.socket.destroyed) {
      this.socket.destroy(new Error(reason));
    }
    return false;
  }

  acceptNormalVoidAuthentication(
    authenticatedNodeIdInput: string,
    authenticatedPublicPem: string,
    nowMs = Date.now(),
  ): boolean {
    if (this.phaseValue !== "awaiting_void_auth") return false;

    const authenticatedNodeId =
      typeof authenticatedNodeIdInput === "string" &&
      NODE_ID_RE.test(authenticatedNodeIdInput)
        ? authenticatedNodeIdInput
        : null;
    if (!authenticatedNodeId) {
      return this.failClosed("normal VOID authentication returned an invalid node id");
    }

    let derivedNodeId: string | null = null;
    try {
      derivedNodeId =
        deriveVoidNodeIdFromPublicPemV1(authenticatedPublicPem) ?? null;
    } catch {
      derivedNodeId = null;
    }
    if (!derivedNodeId || derivedNodeId !== authenticatedNodeId) {
      return this.failClosed(
        "normal VOID authentication public key does not bind to authenticated node id",
      );
    }
    if (authenticatedNodeId !== this.expectedPeerNodeId) {
      return this.failClosed(
        "normal VOID authentication does not match expected peer node id",
      );
    }
    if (!Number.isSafeInteger(nowMs) || nowMs < 0) {
      return this.failClosed("normal VOID authentication timestamp is invalid");
    }
    if (!this.relayFallbackLive()) {
      return this.failClosed(
        "relay fallback is not live at authenticated-candidate admission",
      );
    }

    this.authenticatedPeerNodeId = authenticatedNodeId;
    this.authenticatedPublicKeyBound = true;
    this.authenticatedAtMs = nowMs;
    this.phaseValue = "authenticated_candidate";
    return true;
  }

  authorizeDirectPeerPromotion(
    nowMs = Date.now(),
  ): VoidUdpSwarmAuthenticatedDirectCandidatePromotionV1 | null {
    if (this.phaseValue !== "authenticated_candidate") return null;
    if (
      this.authenticatedPeerNodeId !== this.expectedPeerNodeId ||
      !this.authenticatedPublicKeyBound
    ) {
      this.failClosed("authenticated candidate identity binding was lost");
      return null;
    }
    if (!Number.isSafeInteger(nowMs) || nowMs < 0) {
      this.failClosed("direct-peer promotion timestamp is invalid");
      return null;
    }
    if (!this.relayFallbackLive()) {
      this.failClosed("relay fallback is not live at direct-peer promotion gate");
      return null;
    }

    this.phaseValue = "promotion_authorized";
    this.promotionAuthorizedAtMs = nowMs;
    return Object.freeze({
      session_id: this.sessionId,
      peer_node_id: this.expectedPeerNodeId,
      relay_node_id: this.relayNodeId,
      relay_stream_id: this.relayStreamId,
      transport_hint: this.transportHint,
      socket: this.socket,
      persist_direct_evidence: false,
      relay_retirement_authorized: false,
    });
  }

  discard(reason = "candidate_discarded"): boolean {
    if (
      this.phaseValue === "discarded" ||
      this.phaseValue === "promotion_authorized"
    ) {
      return false;
    }
    const normalized =
      typeof reason === "string" && reason.length > 0 && reason.length <= 256
        ? reason
        : "candidate_discarded";
    return this.failClosed(normalized) === false;
  }

  snapshot(): VoidUdpSwarmAuthenticatedDirectCandidateSnapshotV1 {
    return Object.freeze({
      version: VOID_P2P_UDP_SWARM_AUTHENTICATED_DIRECT_CANDIDATE_VERSION_V1,
      session_id: this.sessionId,
      expected_peer_node_id: this.expectedPeerNodeId,
      relay_node_id: this.relayNodeId,
      relay_stream_id: this.relayStreamId,
      transport_hint: this.transportHint,
      phase: this.phaseValue,
      authenticated_peer_node_id: this.authenticatedPeerNodeId,
      authenticated_public_key_bound: this.authenticatedPublicKeyBound,
      authenticated_at_ms: this.authenticatedAtMs,
      promotion_authorized_at_ms: this.promotionAuthorizedAtMs,
      failure_reason: this.failureReason,
      relay_retirement_authorized: false,
      normal_peer_routing_mutation_performed: false,
    });
  }
}
