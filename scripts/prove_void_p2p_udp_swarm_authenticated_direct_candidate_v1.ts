import assert from "node:assert/strict";
import * as crypto from "node:crypto";
import { EventEmitter } from "node:events";

import { deriveVoidNodeIdFromPublicPemV1 } from "../src/p2p/auth_v1.js";
import type { VoidUdpPeerSocketAdapterV1 } from "../src/p2p/udp_peer_socket_adapter_v1.js";
import {
  VOID_P2P_UDP_SWARM_AUTHENTICATED_DIRECT_CANDIDATE_AUTHORITY_V1,
  VoidUdpSwarmAuthenticatedDirectCandidateV1,
} from "../src/p2p/udp_swarm_authenticated_direct_candidate_v1.js";

type TestIdentity = Readonly<{
  nodeId: string;
  pubPEM: string;
}>;

class TestSocket extends EventEmitter {
  destroyed = false;
  readonly writes: Buffer[] = [];

  write(raw: Uint8Array | string): boolean {
    if (this.destroyed) return false;
    this.writes.push(
      typeof raw === "string" ? Buffer.from(raw) : Buffer.from(raw),
    );
    return true;
  }

  destroy(error?: Error): this {
    if (this.destroyed) return this;
    this.destroyed = true;
    queueMicrotask(() => {
      if (error && this.listenerCount("error") > 0) this.emit("error", error);
      this.emit("close");
    });
    return this;
  }
}

function identity(): TestIdentity {
  const { publicKey } = crypto.generateKeyPairSync("ed25519");
  const pubPEM = publicKey.export({ type: "spki", format: "pem" }).toString();
  const nodeId = deriveVoidNodeIdFromPublicPemV1(pubPEM);
  assert(nodeId);
  return Object.freeze({ nodeId, pubPEM });
}

function asPeerSocket(socket: TestSocket): VoidUdpPeerSocketAdapterV1 {
  return socket as unknown as VoidUdpPeerSocketAdapterV1;
}

function candidate(
  expected: TestIdentity,
  relay: TestIdentity,
  socket: TestSocket,
  isRelayFallbackLive: () => boolean,
  suffix: string,
): VoidUdpSwarmAuthenticatedDirectCandidateV1 {
  return new VoidUdpSwarmAuthenticatedDirectCandidateV1({
    sessionId: `session-${suffix}`,
    expectedPeerNodeId: expected.nodeId,
    relayNodeId: relay.nodeId,
    relayStreamId: `relay-stream-${suffix}`,
    transportHint: `udp-swarm:${suffix}`,
    socket: asPeerSocket(socket),
    isRelayFallbackLive,
  });
}

function main(): void {
  const expected = identity();
  const wrong = identity();
  const relay = identity();

  assert.equal(
    VOID_P2P_UDP_SWARM_AUTHENTICATED_DIRECT_CANDIDATE_AUTHORITY_V1
      .normal_void_hello_auth_required_before_candidate_acceptance,
    true,
  );
  assert.equal(
    VOID_P2P_UDP_SWARM_AUTHENTICATED_DIRECT_CANDIDATE_AUTHORITY_V1
      .normal_void_hello_auth_performed_here,
    false,
  );
  assert.equal(
    VOID_P2P_UDP_SWARM_AUTHENTICATED_DIRECT_CANDIDATE_AUTHORITY_V1
      .normal_peer_routing_mutation_performed,
    false,
  );
  assert.equal(
    VOID_P2P_UDP_SWARM_AUTHENTICATED_DIRECT_CANDIDATE_AUTHORITY_V1
      .relay_retirement_authorized,
    false,
  );

  assert.throws(
    () =>
      new VoidUdpSwarmAuthenticatedDirectCandidateV1({
        sessionId: "bad session",
        expectedPeerNodeId: expected.nodeId,
        relayNodeId: relay.nodeId,
        relayStreamId: "relay-stream-a",
        transportHint: "udp-swarm:a",
        socket: asPeerSocket(new TestSocket()),
        isRelayFallbackLive: () => true,
      }),
    /sessionId/,
  );

  const validSocket = new TestSocket();
  let relayLive = true;
  let relayChecks = 0;
  const valid = candidate(
    expected,
    relay,
    validSocket,
    () => {
      relayChecks += 1;
      return relayLive;
    },
    "valid",
  );

  assert.equal(valid.phase, "awaiting_void_auth");
  assert.equal(valid.authorizeDirectPeerPromotion(1_000), null);
  assert.equal(validSocket.destroyed, false);

  assert.equal(
    valid.acceptNormalVoidAuthentication(expected.nodeId, expected.pubPEM, 1_100),
    true,
  );
  assert.equal(relayChecks, 1);
  assert.equal(valid.phase, "authenticated_candidate");
  assert.equal(validSocket.destroyed, false);
  let snapshot = valid.snapshot();
  assert.equal(snapshot.authenticated_peer_node_id, expected.nodeId);
  assert.equal(snapshot.authenticated_public_key_bound, true);
  assert.equal(snapshot.authenticated_at_ms, 1_100);
  assert.equal(snapshot.normal_peer_routing_mutation_performed, false);
  assert.equal(snapshot.relay_retirement_authorized, false);

  const promotion = valid.authorizeDirectPeerPromotion(1_200);
  assert(promotion);
  assert.equal(relayChecks, 2);
  assert.equal(promotion.session_id, "session-valid");
  assert.equal(promotion.peer_node_id, expected.nodeId);
  assert.equal(promotion.relay_node_id, relay.nodeId);
  assert.equal(promotion.relay_stream_id, "relay-stream-valid");
  assert.equal(promotion.transport_hint, "udp-swarm:valid");
  assert.equal(promotion.socket, asPeerSocket(validSocket));
  assert.equal(promotion.persist_direct_evidence, false);
  assert.equal(promotion.relay_retirement_authorized, false);
  assert.equal(Object.isFrozen(promotion), true);
  assert.equal(valid.phase, "promotion_authorized");
  assert.equal(valid.authorizeDirectPeerPromotion(1_300), null);
  assert.equal(valid.discard("too late"), false);
  assert.equal(validSocket.destroyed, false);
  snapshot = valid.snapshot();
  assert.equal(snapshot.promotion_authorized_at_ms, 1_200);
  assert.equal(snapshot.relay_retirement_authorized, false);

  // A cryptographically self-consistent identity that is not the exact expected
  // VOID node is rejected and the staged transport is destroyed.
  const wrongIdentitySocket = new TestSocket();
  const wrongIdentity = candidate(
    expected,
    relay,
    wrongIdentitySocket,
    () => true,
    "wrong-identity",
  );
  assert.equal(
    wrongIdentity.acceptNormalVoidAuthentication(wrong.nodeId, wrong.pubPEM, 2_000),
    false,
  );
  assert.equal(wrongIdentity.phase, "discarded");
  assert.equal(wrongIdentitySocket.destroyed, true);

  // A detached public key cannot be paired with the expected node id.
  const detachedKeySocket = new TestSocket();
  const detachedKey = candidate(
    expected,
    relay,
    detachedKeySocket,
    () => true,
    "detached-key",
  );
  assert.equal(
    detachedKey.acceptNormalVoidAuthentication(expected.nodeId, wrong.pubPEM, 2_100),
    false,
  );
  assert.equal(detachedKey.phase, "discarded");
  assert.equal(detachedKeySocket.destroyed, true);

  // Candidate admission fails closed if the continuity relay is already gone.
  const noRelayAtAuthSocket = new TestSocket();
  const noRelayAtAuth = candidate(
    expected,
    relay,
    noRelayAtAuthSocket,
    () => false,
    "no-relay-at-auth",
  );
  assert.equal(
    noRelayAtAuth.acceptNormalVoidAuthentication(
      expected.nodeId,
      expected.pubPEM,
      2_200,
    ),
    false,
  );
  assert.equal(noRelayAtAuth.phase, "discarded");
  assert.equal(noRelayAtAuthSocket.destroyed, true);

  // Relay liveness is rechecked at the separate promotion gate. Losing the
  // relay after normal auth but before promotion destroys only the candidate.
  const lostRelaySocket = new TestSocket();
  relayLive = true;
  const lostRelay = candidate(
    expected,
    relay,
    lostRelaySocket,
    () => relayLive,
    "lost-relay",
  );
  assert.equal(
    lostRelay.acceptNormalVoidAuthentication(expected.nodeId, expected.pubPEM, 2_300),
    true,
  );
  relayLive = false;
  assert.equal(lostRelay.authorizeDirectPeerPromotion(2_400), null);
  assert.equal(lostRelay.phase, "discarded");
  assert.equal(lostRelaySocket.destroyed, true);
  assert.match(
    lostRelay.snapshot().failure_reason || "",
    /relay fallback is not live/,
  );

  // A throwing liveness source is treated exactly like a dead relay.
  const throwingRelaySocket = new TestSocket();
  const throwingRelay = candidate(
    expected,
    relay,
    throwingRelaySocket,
    () => {
      throw new Error("detached relay state");
    },
    "throwing-relay",
  );
  assert.equal(
    throwingRelay.acceptNormalVoidAuthentication(
      expected.nodeId,
      expected.pubPEM,
      2_500,
    ),
    false,
  );
  assert.equal(throwingRelay.phase, "discarded");
  assert.equal(throwingRelaySocket.destroyed, true);

  const operatorDiscardSocket = new TestSocket();
  const operatorDiscard = candidate(
    expected,
    relay,
    operatorDiscardSocket,
    () => true,
    "operator-discard",
  );
  assert.equal(operatorDiscard.discard("operator cancelled candidate"), true);
  assert.equal(operatorDiscard.phase, "discarded");
  assert.equal(operatorDiscardSocket.destroyed, true);
  assert.equal(operatorDiscard.discard("again"), false);

  console.log("secure_direct_socket_candidate_state_exposed=true");
  console.log("exact_expected_peer_node_id_required=true");
  console.log("authenticated_public_key_binding_required=true");
  console.log("normal_void_hello_auth_required=true");
  console.log("normal_void_hello_auth_performed_here=false");
  console.log("relay_live_required_at_candidate_admission=true");
  console.log("relay_live_rechecked_before_promotion=true");
  console.log("wrong_authenticated_identity_accepted=false");
  console.log("detached_authenticated_public_key_accepted=false");
  console.log("promotion_authorization_one_shot=true");
  console.log("promotion_action_persist_direct_evidence=false");
  console.log("normal_peer_routing_mutation_performed=false");
  console.log("relay_retirement_authorized=false");
  console.log("node_core_mount_performed=false");
  console.log("production_udp_activation_performed=false");
  console.log("wallet_signer_validator_wc_money_authority=0");
  console.log("VOID_P2P_UDP_SWARM_AUTHENTICATED_DIRECT_CANDIDATE_V1_PROOF_GREEN");
}

main();
