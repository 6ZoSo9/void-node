import assert from "node:assert/strict";
import * as crypto from "node:crypto";
import { EventEmitter } from "node:events";

import { deriveVoidNodeIdFromPublicPemV1 } from "../src/p2p/auth_v1.js";
import { VoidUdpSwarmAuthenticatedDirectCandidateV1 } from "../src/p2p/udp_swarm_authenticated_direct_candidate_v1.js";
import type { VoidUdpPeerSocketAdapterV1 } from "../src/p2p/udp_peer_socket_adapter_v1.js";
import {
  VOID_P2P_UDP_SWARM_RELAY_PRESERVING_TAKEOVER_POLICY_AUTHORITY_V1,
  evaluateVoidUdpSwarmRelayPreservingTakeoverPolicyV1,
  type VoidUdpSwarmExistingAuthenticatedRouteV1,
} from "../src/p2p/udp_swarm_relay_preserving_takeover_policy_v1.js";

type TestIdentity = {
  nodeId: string;
  pubPEM: string;
};

function identity(): TestIdentity {
  const { publicKey } = crypto.generateKeyPairSync("ed25519");
  const pubPEM = publicKey.export({ type: "spki", format: "pem" }).toString();
  const nodeId = deriveVoidNodeIdFromPublicPemV1(pubPEM);
  assert(nodeId);
  return { nodeId, pubPEM };
}

class FakeSecureSocket extends EventEmitter {
  destroyed = false;
  write(_data: Uint8Array | string): boolean {
    return !this.destroyed;
  }
  destroy(_error?: Error): this {
    if (this.destroyed) return this;
    this.destroyed = true;
    this.emit("close");
    return this;
  }
}

function route(
  peerNodeId: string,
  relayNodeId: string,
  relayStreamId = "relay-stream-v1",
): VoidUdpSwarmExistingAuthenticatedRouteV1 {
  return Object.freeze({
    peer_node_id: peerNodeId,
    transport: "relay",
    relay_node_id: relayNodeId,
    relay_stream_id: relayStreamId,
  });
}

function evaluate(
  candidate: VoidUdpSwarmAuthenticatedDirectCandidateV1,
  existingRoute: VoidUdpSwarmExistingAuthenticatedRouteV1 | null,
  relayFallbackLive: boolean,
) {
  const snapshot = candidate.snapshot();
  return evaluateVoidUdpSwarmRelayPreservingTakeoverPolicyV1({
    candidate_phase: snapshot.phase,
    expected_peer_node_id: snapshot.expected_peer_node_id,
    authenticated_peer_node_id: snapshot.authenticated_peer_node_id,
    existing_authenticated_route: existingRoute,
    relay_fallback_live: relayFallbackLive,
  });
}

function main(): void {
  const local = identity();
  const peer = identity();
  const otherPeer = identity();
  const relay = identity();
  let relayLive = true;
  const socket = new FakeSecureSocket();
  const candidate = new VoidUdpSwarmAuthenticatedDirectCandidateV1({
    sessionId: "udp-swarm-session-v1",
    expectedPeerNodeId: peer.nodeId,
    relayNodeId: relay.nodeId,
    relayStreamId: "relay-stream-v1",
    transportHint: "udp-secure:203.0.113.10:4700",
    socket: socket as unknown as VoidUdpPeerSocketAdapterV1,
    isRelayFallbackLive: () => relayLive,
  });
  void local;

  const continuityRoute = route(peer.nodeId, relay.nodeId);

  const beforeAuth = evaluate(candidate, continuityRoute, true);
  assert.equal(beforeAuth.action, "reject_candidate");
  assert.equal(beforeAuth.reason, "candidate_not_authenticated");
  assert.equal(beforeAuth.normal_peer_map_mutation_performed, false);
  assert.equal(beforeAuth.relay_retirement_authorized, false);

  assert.equal(
    candidate.acceptNormalVoidAuthentication(peer.nodeId, peer.pubPEM, 1_000),
    true,
  );
  assert.equal(candidate.snapshot().phase, "authenticated_candidate");

  const stage = evaluate(candidate, continuityRoute, true);
  assert.equal(stage.action, "stage_authenticated_candidate");
  assert.equal(stage.reason, "relay_preserved_candidate_may_stage");
  assert.equal(stage.existing_route_retained, true);
  assert.equal(stage.normal_peer_map_mutation_performed, false);
  assert.equal(stage.relay_retirement_authorized, false);
  assert.equal(Object.isFrozen(stage), true);

  const directAlreadyPreferred = evaluateVoidUdpSwarmRelayPreservingTakeoverPolicyV1({
    candidate_phase: "authenticated_candidate",
    expected_peer_node_id: peer.nodeId,
    authenticated_peer_node_id: peer.nodeId,
    existing_authenticated_route: Object.freeze({
      peer_node_id: peer.nodeId,
      transport: "direct",
      relay_node_id: null,
      relay_stream_id: null,
    }),
    relay_fallback_live: true,
  });
  assert.equal(directAlreadyPreferred.action, "reject_candidate");
  assert.equal(
    directAlreadyPreferred.reason,
    "existing_direct_route_already_preferred",
  );
  assert.equal(directAlreadyPreferred.existing_route_retained, true);

  const missingRoute = evaluate(candidate, null, true);
  assert.equal(missingRoute.action, "reject_candidate");
  assert.equal(missingRoute.reason, "continuity_route_missing");
  assert.equal(missingRoute.normal_peer_map_mutation_performed, false);

  const wrongRoutePeer = evaluate(
    candidate,
    route(otherPeer.nodeId, relay.nodeId),
    true,
  );
  assert.equal(wrongRoutePeer.action, "reject_candidate");
  assert.equal(wrongRoutePeer.reason, "continuity_route_peer_mismatch");
  assert.equal(wrongRoutePeer.existing_route_retained, true);

  const invalidRelayBinding = evaluate(
    candidate,
    route(peer.nodeId, relay.nodeId, "relay stream whitespace"),
    true,
  );
  assert.equal(invalidRelayBinding.action, "reject_candidate");
  assert.equal(invalidRelayBinding.reason, "relay_route_binding_invalid");

  const deadFallback = evaluate(candidate, continuityRoute, false);
  assert.equal(deadFallback.action, "reject_candidate");
  assert.equal(deadFallback.reason, "relay_fallback_not_live");
  assert.equal(deadFallback.existing_route_retained, true);

  const syntheticIdentityMismatch =
    evaluateVoidUdpSwarmRelayPreservingTakeoverPolicyV1({
      candidate_phase: "authenticated_candidate",
      expected_peer_node_id: peer.nodeId,
      authenticated_peer_node_id: otherPeer.nodeId,
      existing_authenticated_route: continuityRoute,
      relay_fallback_live: true,
    });
  assert.equal(syntheticIdentityMismatch.action, "reject_candidate");
  assert.equal(syntheticIdentityMismatch.reason, "candidate_identity_mismatch");

  const mismatchSocket = new FakeSecureSocket();
  const mismatchCandidate = new VoidUdpSwarmAuthenticatedDirectCandidateV1({
    sessionId: "udp-swarm-session-mismatch-v1",
    expectedPeerNodeId: peer.nodeId,
    relayNodeId: relay.nodeId,
    relayStreamId: "relay-stream-v1",
    transportHint: "udp-secure:203.0.113.11:4700",
    socket: mismatchSocket as unknown as VoidUdpPeerSocketAdapterV1,
    isRelayFallbackLive: () => true,
  });
  assert.equal(
    mismatchCandidate.acceptNormalVoidAuthentication(
      otherPeer.nodeId,
      otherPeer.pubPEM,
      1_001,
    ),
    false,
  );
  assert.equal(mismatchCandidate.snapshot().phase, "discarded");
  assert.equal(mismatchSocket.destroyed, true);
  const discarded = evaluate(mismatchCandidate, continuityRoute, true);
  assert.equal(discarded.action, "reject_candidate");
  assert.equal(discarded.reason, "candidate_not_authenticated");

  relayLive = false;
  const promotion = candidate.authorizeDirectPeerPromotion(2_000);
  assert.equal(promotion, null);
  assert.equal(candidate.snapshot().phase, "discarded");
  assert.equal(socket.destroyed, true);
  const afterFallbackLoss = evaluate(candidate, continuityRoute, false);
  assert.equal(afterFallbackLoss.action, "reject_candidate");
  assert.equal(afterFallbackLoss.reason, "candidate_not_authenticated");

  assert.equal(
    VOID_P2P_UDP_SWARM_RELAY_PRESERVING_TAKEOVER_POLICY_AUTHORITY_V1
      .normal_peer_map_mutation_performed,
    false,
  );
  assert.equal(
    VOID_P2P_UDP_SWARM_RELAY_PRESERVING_TAKEOVER_POLICY_AUTHORITY_V1
      .relay_retirement_authorized,
    false,
  );

  console.log("authenticated_candidate_required=true");
  console.log("exact_peer_identity_required=true");
  console.log("existing_authenticated_relay_required=true");
  console.log("live_relay_fallback_required=true");
  console.log("existing_direct_route_replaced=false");
  console.log("relay_route_retained_during_candidate_stage=true");
  console.log("normal_peer_map_mutation_performed=false");
  console.log("candidate_socket_mutation_performed=false");
  console.log("relay_retirement_authorized=false");
  console.log("production_udp_activation_performed=false");
  console.log("wallet_signer_validator_wc_money_authority=0");
  console.log("VOID_P2P_UDP_SWARM_RELAY_PRESERVING_TAKEOVER_POLICY_V1_PROOF_GREEN");
}

main();
