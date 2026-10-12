import assert from "node:assert/strict";
import * as crypto from "node:crypto";
import { EventEmitter } from "node:events";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { Node } from "../src/node_core.js";
import { deriveVoidNodeIdFromPublicPemV1 } from "../src/p2p/auth_v1.js";
import { VoidUdpSecureSessionBootstrapV1 } from "../src/p2p/udp_secure_session_bootstrap_v1.js";
import type { VoidUdpSecurePacketV1 } from "../src/p2p/udp_secure_reliable_transport_v1.js";

type TestKeypair = {
  privateKey: crypto.KeyObject;
  publicKey: crypto.KeyObject;
  nodeId: string;
  pubPEM: string;
};

type SecurePair = {
  a: VoidUdpSecureSessionBootstrapV1;
  b: VoidUdpSecureSessionBootstrapV1;
};

class TestRelaySocket extends EventEmitter {
  destroyed = false;
  readonly writes: Buffer[] = [];

  write(raw: Uint8Array | string): boolean {
    if (this.destroyed) return false;
    this.writes.push(typeof raw === "string" ? Buffer.from(raw) : Buffer.from(raw));
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

  remoteClose(_reason: string): void {
    this.destroy();
  }
}

function keypair(): TestKeypair {
  const { privateKey, publicKey } = crypto.generateKeyPairSync("ed25519");
  const pubPEM = publicKey.export({ type: "spki", format: "pem" }).toString();
  const nodeId = deriveVoidNodeIdFromPublicPemV1(pubPEM);
  assert(nodeId);
  return { privateKey, publicKey, nodeId, pubPEM };
}

function newNode(dataDir: string, kp: TestKeypair): Node {
  process.env.DATA_DIR = dataDir;
  process.env.BOOTSTRAP_ADDRS = "";
  process.env.P2P_BIND_HOST = "127.0.0.1";
  process.env.P2P_ADVERTISE_HOST = "127.0.0.1";
  return new Node(0, kp);
}

function internals(node: Node): any {
  return node as any;
}

async function waitFor(
  predicate: () => boolean,
  label: string,
  timeoutMs = 5_000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error(`timed out waiting for ${label}`);
}

function establishSecurePair(
  a: TestKeypair,
  b: TestKeypair,
  endpointA: string,
  endpointB: string,
): SecurePair {
  const sessionId = crypto.randomBytes(16).toString("hex");
  let controllerA!: VoidUdpSecureSessionBootstrapV1;
  let controllerB!: VoidUdpSecureSessionBootstrapV1;

  const transmitA = (packet: VoidUdpSecurePacketV1) => {
    queueMicrotask(() => controllerB.receiveSecurePacket(packet));
  };
  const transmitB = (packet: VoidUdpSecurePacketV1) => {
    queueMicrotask(() => controllerA.receiveSecurePacket(packet));
  };

  controllerA = new VoidUdpSecureSessionBootstrapV1({
    sessionId,
    localNodeId: a.nodeId,
    remoteNodeId: b.nodeId,
    localPublicPem: a.pubPEM,
    localPrivateKey: a.privateKey,
    localObservedEndpoint: endpointA,
    remoteObservedEndpoint: endpointB,
    allowNonPublicEndpoints: true,
    transmitSecurePacket: transmitA,
    adapterOptions: { autoRetransmit: false },
  });
  controllerB = new VoidUdpSecureSessionBootstrapV1({
    sessionId,
    localNodeId: b.nodeId,
    remoteNodeId: a.nodeId,
    localPublicPem: b.pubPEM,
    localPrivateKey: b.privateKey,
    localObservedEndpoint: endpointB,
    remoteObservedEndpoint: endpointA,
    allowNonPublicEndpoints: true,
    transmitSecurePacket: transmitB,
    adapterOptions: { autoRetransmit: false },
  });

  const helloA = controllerA.localHello();
  const helloB = controllerB.localHello();
  assert.equal(controllerA.acceptRemoteHello(helloB), true);
  assert.equal(controllerB.acceptRemoteHello(helloA), true);
  const proofA = controllerA.createLocalProof();
  const proofB = controllerB.createLocalProof();
  assert.equal(controllerA.acceptRemoteProof(proofB), true);
  assert.equal(controllerB.acceptRemoteProof(proofA), true);
  const offerA = controllerA.createLocalKeyOffer();
  const offerB = controllerB.createLocalKeyOffer();
  assert.equal(controllerA.acceptRemoteKeyOffer(offerB), true);
  assert.equal(controllerB.acceptRemoteKeyOffer(offerA), true);
  assert(controllerA.socket && controllerB.socket);
  return { a: controllerA, b: controllerB };
}

function installLiveRelayFallback(
  node: Node,
  remote: TestKeypair,
  relay: TestKeypair,
  streamId: string,
): { peer: any; socket: TestRelaySocket } {
  const socket = new TestRelaySocket();
  const peer = {
    id: remote.nodeId,
    socket,
    framer: undefined,
    addr: `relay:${relay.nodeId}/${streamId}->${remote.nodeId}`,
    listens: [],
    outbound: true,
    handshakeDone: true,
    localChallenge: "0".repeat(64),
    authenticatedPublicPem: remote.pubPEM,
    authTimer: null,
    expectedNodeId: remote.nodeId,
    suppressReconnect: true,
    attachedAtMs: Date.now(),
    outboundSeenEmitted: false,
    transport: "relay",
    relayViaNodeId: relay.nodeId,
    relayStreamId: streamId,
    persistDirectEvidence: false,
    punchCapable: false,
  };
  const core = internals(node);
  core.peers.set(remote.nodeId, peer);
  core.relayStreams.set(`${relay.nodeId}:${streamId}`, {
    relay_node_id: relay.nodeId,
    remote_node_id: remote.nodeId,
    stream_id: streamId,
    outgoing: true,
    started: true,
    socket,
  });
  return { peer, socket };
}

async function stageAndAuthenticate(
  nodeA: Node,
  nodeB: Node,
  kpA: TestKeypair,
  kpB: TestKeypair,
  relayKp: TestKeypair,
  relayFallback: { peer: any; socket: TestRelaySocket },
  streamId: string,
  endpointBase: number,
): Promise<{ pair: SecurePair; sessionId: string; candidatePeer: any }> {
  const sessionId = crypto.randomBytes(16).toString("hex");
  const pair = establishSecurePair(
    kpA,
    kpB,
    `127.0.0.1:${endpointBase}`,
    `127.0.0.1:${endpointBase + 1}`,
  );
  assert(pair.a.socket && pair.b.socket);
  assert.equal(
    nodeA.stageUdpSwarmAuthenticatedDirectCandidateV1({
      sessionId,
      expectedPeerNodeId: kpB.nodeId,
      relayNodeId: relayKp.nodeId,
      relayStreamId: streamId,
      transportHint: `udp-swarm:127.0.0.1:${endpointBase + 1}`,
      socket: pair.a.socket,
    }),
    true,
  );
  assert.equal(
    nodeB.attachEphemeralDirectTransportV1(
      pair.b.socket,
      kpA.nodeId,
      `udp-swarm-proof:127.0.0.1:${endpointBase}`,
    ),
    true,
  );

  await waitFor(
    () =>
      nodeA.udpSwarmAuthenticatedDirectCandidateSnapshotV1()
        .candidates[0]?.phase === "authenticated_candidate" &&
      nodeB.peers.get(kpA.nodeId)?.handshakeDone === true,
    "authenticated UDP candidate",
  );

  const candidatePeer = internals(nodeA).udpSwarmDirectCandidates.get(sessionId);
  assert(candidatePeer);
  assert.strictEqual(nodeA.peers.get(kpB.nodeId), relayFallback.peer);
  assert.equal(relayFallback.socket.destroyed, false);
  return { pair, sessionId, candidatePeer };
}

async function main(): Promise<void> {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "void-udp-node-promotion-v1-"));
  let pair1: SecurePair | undefined;
  let pair2: SecurePair | undefined;

  try {
    const kpA1 = keypair();
    const kpB1 = keypair();
    const relayKp1 = keypair();
    const nodeA1 = newNode(path.join(root, "a1"), kpA1);
    const nodeB1 = newNode(path.join(root, "b1"), kpB1);
    const streamId1 = crypto.randomBytes(16).toString("hex");
    const relay1 = installLiveRelayFallback(nodeA1, kpB1, relayKp1, streamId1);
    let persisted1 = 0;
    internals(nodeA1).rememberAuthenticatedPeer = () => { persisted1 += 1; };

    const staged1 = await stageAndAuthenticate(
      nodeA1, nodeB1, kpA1, kpB1, relayKp1, relay1, streamId1, 54101,
    );
    pair1 = staged1.pair;

    const promotion1 = nodeA1.promoteUdpSwarmAuthenticatedDirectCandidateV1(
      staged1.sessionId,
    );
    assert.equal(promotion1.ok, true);
    assert.strictEqual(nodeA1.peers.get(kpB1.nodeId), staged1.candidatePeer);
    assert.equal(staged1.candidatePeer.handshakeDone, true);
    assert.equal(staged1.candidatePeer.persistDirectEvidence, false);
    assert.equal(relay1.socket.destroyed, false);
    assert.equal(persisted1, 0);
    assert.equal(internals(nodeA1).udpSwarmDirectCandidates.has(staged1.sessionId), false);

    const promoted1 = nodeA1.udpSwarmPromotedDirectRouteSnapshotV1();
    assert.equal(promoted1.promoted_route_count, 1);
    assert.equal(promoted1.relay_retirement_performed, false);
    assert.equal(promoted1.routes[0]?.peer_node_id, kpB1.nodeId);
    assert.equal(promoted1.routes[0]?.direct_route_live, true);
    assert.equal(promoted1.routes[0]?.relay_fallback_live, true);
    assert.equal(promoted1.routes[0]?.persist_direct_evidence, false);
    assert.equal(promoted1.routes[0]?.relay_retirement_performed, false);

    assert.deepEqual(
      nodeA1.promoteUdpSwarmAuthenticatedDirectCandidateV1(staged1.sessionId),
      { ok: false, error: "candidate_not_staged" },
    );

    pair1.a.destroy();
    await waitFor(
      () => nodeA1.peers.get(kpB1.nodeId) === relay1.peer,
      "relay restoration after promoted direct close",
    );
    assert.equal(relay1.socket.destroyed, false);
    assert.equal(nodeA1.udpSwarmPromotedDirectRouteSnapshotV1().promoted_route_count, 0);

    const kpA2 = keypair();
    const kpB2 = keypair();
    const relayKp2 = keypair();
    const nodeA2 = newNode(path.join(root, "a2"), kpA2);
    const nodeB2 = newNode(path.join(root, "b2"), kpB2);
    const streamId2 = crypto.randomBytes(16).toString("hex");
    const relay2 = installLiveRelayFallback(nodeA2, kpB2, relayKp2, streamId2);
    const staged2 = await stageAndAuthenticate(
      nodeA2, nodeB2, kpA2, kpB2, relayKp2, relay2, streamId2, 54201,
    );
    pair2 = staged2.pair;
    assert.equal(
      nodeA2.promoteUdpSwarmAuthenticatedDirectCandidateV1(staged2.sessionId).ok,
      true,
    );
    assert.strictEqual(nodeA2.peers.get(kpB2.nodeId), staged2.candidatePeer);

    internals(nodeA2).finishRelayLocalStream(
      relayKp2.nodeId,
      streamId2,
      "proof_fallback_loss_after_promotion",
    );
    await waitFor(() => relay2.socket.destroyed === true, "retained relay fallback close");
    const promoted2 = nodeA2.udpSwarmPromotedDirectRouteSnapshotV1();
    assert.equal(promoted2.promoted_route_count, 1);
    assert.equal(promoted2.routes[0]?.direct_route_live, true);
    assert.equal(promoted2.routes[0]?.relay_fallback_live, false);
    assert.strictEqual(nodeA2.peers.get(kpB2.nodeId), staged2.candidatePeer);
    assert.equal(pair2.a.socket?.destroyed, false);

    pair2.a.destroy();
    await waitFor(() => !nodeA2.peers.has(kpB2.nodeId), "direct close without stale relay restoration");
    assert.equal(nodeA2.udpSwarmPromotedDirectRouteSnapshotV1().promoted_route_count, 0);

    console.log("authenticated_candidate_promotion_authorization_consumed_once=true");
    console.log("normal_peer_route_swapped_to_udp_direct=true");
    console.log("relay_socket_preserved_during_promotion=true");
    console.log("relay_stream_preserved_during_promotion=true");
    console.log("retained_relay_removed_from_normal_peer_map=true");
    console.log("retained_relay_fallback_is_dormant=true");
    console.log("promoted_direct_evidence_persisted=false");
    console.log("direct_close_restores_live_relay_fallback=true");
    console.log("relay_loss_preserves_live_promoted_direct_route=true");
    console.log("stale_relay_not_restored_after_fallback_loss=true");
    console.log("relay_retirement_performed=false");
    console.log("production_udp_activation_performed=false");
    console.log("wallet_signer_validator_wc_money_authority=0");
    console.log("VOID_P2P_UDP_SWARM_NODE_CANDIDATE_PROMOTION_V1_PROOF_GREEN");
  } finally {
    try { pair1?.a.destroy(); } catch (error) { void error; }
    try { pair1?.b.destroy(); } catch (error) { void error; }
    try { pair2?.a.destroy(); } catch (error) { void error; }
    try { pair2?.b.destroy(); } catch (error) { void error; }
    fs.rmSync(root, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
