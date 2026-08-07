// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025-2026 6ZoSo9

import * as crypto from "node:crypto";

import {
  createVoidUdpAuthenticatedPathHelloV1,
  createVoidUdpAuthenticatedPathProofV1,
  normalizeVoidUdpAuthenticatedPathHelloV1,
  verifyVoidUdpAuthenticatedPathProofV1,
  type VoidUdpAuthenticatedPathHelloV1,
  type VoidUdpAuthenticatedPathProofV1,
} from "./udp_authenticated_path_v1.js";
import {
  VoidUdpSecureReliableReceiverV1,
  VoidUdpSecureReliableSenderV1,
  createVoidUdpSecureKeyOfferV1,
  deriveVoidUdpSecureDirectionKeysV1,
  verifyVoidUdpSecureKeyOfferV1,
  type VoidUdpSecureKeyOfferV1,
  type VoidUdpSecurePacketV1,
} from "./udp_secure_reliable_transport_v1.js";
import {
  VoidUdpPeerSocketAdapterV1,
  type VoidUdpPeerSocketAdapterOptionsV1,
  type VoidUdpPeerSocketPacketTransmitV1,
} from "./udp_peer_socket_adapter_v1.js";

export const VOID_P2P_UDP_SECURE_SESSION_BOOTSTRAP_VERSION_V1 = 1;

export const VOID_P2P_UDP_SECURE_SESSION_BOOTSTRAP_AUTHORITY_V1 = Object.freeze({
  mutual_ed25519_path_auth_required: true,
  exact_observed_endpoint_binding_required: true,
  signed_x25519_offer_required: true,
  x25519_offer_must_match_authenticated_identity: true,
  secure_reliable_transport_required: true,
  peer_socket_adapter_required: true,
  ready_before_remote_path_proof: false,
  ready_before_local_path_proof: false,
  ready_before_reciprocal_key_offers: false,
  runtime_node_core_mount_performed: false,
  runtime_peer_promotion_performed: false,
  verified_direct_cache_mutation_performed: false,
  relay_fallback_preserved: true,
  router_configuration_required: false,
  port_forward_required: false,
  wallet_signer_validator_wc_money_authority: 0,
});

export type VoidUdpSecureSessionBootstrapPhaseV1 =
  | "awaiting_remote_hello"
  | "awaiting_path_proofs"
  | "awaiting_key_offers"
  | "ready"
  | "closed";

export type VoidUdpSecureSessionBootstrapOptionsV1 = Readonly<{
  sessionId: string;
  localNodeId: string;
  remoteNodeId: string;
  localPublicPem: string;
  localPrivateKey: crypto.KeyObject;
  localObservedEndpoint: string;
  remoteObservedEndpoint: string;
  transmitSecurePacket: VoidUdpPeerSocketPacketTransmitV1;
  allowNonPublicEndpoints?: boolean;
  adapterOptions?: VoidUdpPeerSocketAdapterOptionsV1;
  onReady?: (socket: VoidUdpPeerSocketAdapterV1) => void;
}>;

function samePacket(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function canonicalPrivateKeyMatchesPublicPem(
  privateKey: crypto.KeyObject,
  publicPem: string,
): boolean {
  if (privateKey.type !== "private" || privateKey.asymmetricKeyType !== "ed25519") {
    return false;
  }
  try {
    const derived = crypto
      .createPublicKey(privateKey)
      .export({ type: "spki", format: "pem" })
      .toString();
    return derived === publicPem;
  } catch {
    return false;
  }
}

export class VoidUdpSecureSessionBootstrapV1 {
  private readonly sessionIdValue: string;
  private readonly localNodeIdValue: string;
  private readonly remoteNodeIdValue: string;
  private readonly localPublicPemValue: string;
  private readonly localPrivateKeyValue: crypto.KeyObject;
  private readonly localObservedEndpointValue: string;
  private readonly remoteObservedEndpointValue: string;
  private readonly allowNonPublicEndpointsValue: boolean;
  private readonly transmitSecurePacketValue: VoidUdpPeerSocketPacketTransmitV1;
  private readonly adapterOptionsValue: VoidUdpPeerSocketAdapterOptionsV1;
  private readonly onReadyValue?: (socket: VoidUdpPeerSocketAdapterV1) => void;

  private readonly localHelloValue: VoidUdpAuthenticatedPathHelloV1;
  private remoteHelloValue?: VoidUdpAuthenticatedPathHelloV1;
  private localProofValue?: VoidUdpAuthenticatedPathProofV1;
  private remoteProofValue?: VoidUdpAuthenticatedPathProofV1;

  private readonly x25519 = crypto.generateKeyPairSync("x25519");
  private localKeyOfferValue?: VoidUdpSecureKeyOfferV1;
  private remoteKeyOfferValue?: VoidUdpSecureKeyOfferV1;

  private socketValue?: VoidUdpPeerSocketAdapterV1;
  private closed = false;
  private readyCallbackEmitted = false;

  constructor(options: VoidUdpSecureSessionBootstrapOptionsV1) {
    if (!canonicalPrivateKeyMatchesPublicPem(options.localPrivateKey, options.localPublicPem)) {
      throw new Error("UDP secure-session local Ed25519 private/public identity mismatch");
    }

    this.sessionIdValue = options.sessionId;
    this.localNodeIdValue = options.localNodeId;
    this.remoteNodeIdValue = options.remoteNodeId;
    this.localPublicPemValue = options.localPublicPem;
    this.localPrivateKeyValue = options.localPrivateKey;
    this.localObservedEndpointValue = options.localObservedEndpoint;
    this.remoteObservedEndpointValue = options.remoteObservedEndpoint;
    this.allowNonPublicEndpointsValue = options.allowNonPublicEndpoints === true;
    this.transmitSecurePacketValue = options.transmitSecurePacket;
    this.adapterOptionsValue = options.adapterOptions ?? {};
    this.onReadyValue = options.onReady;

    this.localHelloValue = createVoidUdpAuthenticatedPathHelloV1({
      sessionId: this.sessionIdValue,
      sourceNodeId: this.localNodeIdValue,
      targetNodeId: this.remoteNodeIdValue,
      pubkey: this.localPublicPemValue,
    });
  }

  get phase(): VoidUdpSecureSessionBootstrapPhaseV1 {
    if (this.closed) return "closed";
    if (this.socketValue) return "ready";
    if (!this.remoteHelloValue) return "awaiting_remote_hello";
    if (!this.localProofValue || !this.remoteProofValue) return "awaiting_path_proofs";
    return "awaiting_key_offers";
  }

  get ready(): boolean {
    return !!this.socketValue && !this.closed;
  }

  get socket(): VoidUdpPeerSocketAdapterV1 | undefined {
    return this.socketValue;
  }

  localHello(): VoidUdpAuthenticatedPathHelloV1 {
    return this.localHelloValue;
  }

  acceptRemoteHello(raw: unknown): boolean {
    if (this.closed || this.socketValue) return false;
    const hello = normalizeVoidUdpAuthenticatedPathHelloV1(raw);
    if (!hello) return false;
    if (
      hello.session_id !== this.sessionIdValue ||
      hello.source_node_id !== this.remoteNodeIdValue ||
      hello.target_node_id !== this.localNodeIdValue
    ) {
      return false;
    }
    if (this.remoteHelloValue) return samePacket(this.remoteHelloValue, hello);
    this.remoteHelloValue = hello;
    return true;
  }

  createLocalProof(): VoidUdpAuthenticatedPathProofV1 {
    if (this.closed) throw new Error("UDP secure-session bootstrap is closed");
    if (!this.remoteHelloValue) {
      throw new Error("remote UDP authenticated-path HELLO is required before local proof");
    }
    if (this.localProofValue) return this.localProofValue;

    this.localProofValue = createVoidUdpAuthenticatedPathProofV1({
      localHello: this.localHelloValue,
      remoteHello: this.remoteHelloValue,
      localObservedEndpoint: this.localObservedEndpointValue,
      remoteObservedEndpoint: this.remoteObservedEndpointValue,
      privateKey: this.localPrivateKeyValue,
      allowNonPublicEndpoints: this.allowNonPublicEndpointsValue,
    });
    return this.localProofValue;
  }

  acceptRemoteProof(raw: unknown): boolean {
    if (this.closed || !this.remoteHelloValue) return false;
    const proof = verifyVoidUdpAuthenticatedPathProofV1({
      rawProof: raw,
      expectedRemoteHello: this.remoteHelloValue,
      localHello: this.localHelloValue,
      expectedRemoteObservedEndpoint: this.remoteObservedEndpointValue,
      localObservedEndpoint: this.localObservedEndpointValue,
      allowNonPublicEndpoints: this.allowNonPublicEndpointsValue,
    });
    if (!proof) return false;
    if (this.remoteProofValue) return samePacket(this.remoteProofValue, proof);
    this.remoteProofValue = proof;
    this.maybeReady();
    return true;
  }

  createLocalKeyOffer(): VoidUdpSecureKeyOfferV1 {
    if (this.closed) throw new Error("UDP secure-session bootstrap is closed");
    if (!this.remoteHelloValue || !this.localProofValue || !this.remoteProofValue) {
      throw new Error("mutual UDP path authentication is required before key offer");
    }
    if (this.localKeyOfferValue) return this.localKeyOfferValue;

    this.localKeyOfferValue = createVoidUdpSecureKeyOfferV1({
      sessionId: this.sessionIdValue,
      sourceNodeId: this.localNodeIdValue,
      targetNodeId: this.remoteNodeIdValue,
      ed25519PublicPem: this.localPublicPemValue,
      ed25519PrivateKey: this.localPrivateKeyValue,
      x25519PublicKey: this.x25519.publicKey,
      sourceObservedEndpoint: this.localObservedEndpointValue,
      targetObservedEndpoint: this.remoteObservedEndpointValue,
      allowNonPublicObservedEndpoint: this.allowNonPublicEndpointsValue,
    });
    this.maybeReady();
    return this.localKeyOfferValue;
  }

  acceptRemoteKeyOffer(raw: unknown): boolean {
    if (
      this.closed ||
      !this.remoteHelloValue ||
      !this.localProofValue ||
      !this.remoteProofValue
    ) {
      return false;
    }

    const offer = verifyVoidUdpSecureKeyOfferV1(raw, {
      sessionId: this.sessionIdValue,
      sourceNodeId: this.remoteNodeIdValue,
      targetNodeId: this.localNodeIdValue,
      sourceObservedEndpoint: this.remoteObservedEndpointValue,
      targetObservedEndpoint: this.localObservedEndpointValue,
      allowNonPublicObservedEndpoint: this.allowNonPublicEndpointsValue,
    });
    if (!offer) return false;
    if (offer.ed25519_pubkey !== this.remoteHelloValue.pubkey) return false;

    if (this.remoteKeyOfferValue) {
      return samePacket(this.remoteKeyOfferValue, offer);
    }
    this.remoteKeyOfferValue = offer;
    this.maybeReady();
    return true;
  }

  receiveSecurePacket(raw: VoidUdpSecurePacketV1 | unknown): boolean {
    if (this.closed || !this.socketValue) return false;
    return this.socketValue.receivePacket(raw);
  }

  tick(nowMs = Date.now()): void {
    if (this.closed || !this.socketValue) return;
    this.socketValue.tick(nowMs);
  }

  destroy(error?: Error): void {
    if (this.closed) return;
    this.closed = true;
    this.socketValue?.destroy(error);
  }

  private maybeReady(): void {
    if (
      this.closed ||
      this.socketValue ||
      !this.remoteHelloValue ||
      !this.localProofValue ||
      !this.remoteProofValue ||
      !this.localKeyOfferValue ||
      !this.remoteKeyOfferValue
    ) {
      return;
    }

    if (this.remoteKeyOfferValue.ed25519_pubkey !== this.remoteHelloValue.pubkey) {
      throw new Error("remote X25519 offer identity differs from authenticated path identity");
    }

    const keys = deriveVoidUdpSecureDirectionKeysV1({
      localX25519PrivateKey: this.x25519.privateKey,
      localOffer: this.localKeyOfferValue,
      remoteOffer: this.remoteKeyOfferValue,
    });
    const sender = new VoidUdpSecureReliableSenderV1(keys);
    const receiver = new VoidUdpSecureReliableReceiverV1(keys);
    this.socketValue = new VoidUdpPeerSocketAdapterV1(
      sender,
      receiver,
      this.transmitSecurePacketValue,
      this.adapterOptionsValue,
    );

    if (!this.readyCallbackEmitted) {
      this.readyCallbackEmitted = true;
      this.onReadyValue?.(this.socketValue);
    }
  }
}
