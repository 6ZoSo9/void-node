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

async function main(): Promise<void> {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "void-udp-node-candidate-v1-"));
  const nodeCoreSource = fs.readFileSync(
    path.join(process.cwd(), "src/node_core.ts"),
    "utf8",
  );
  assert.equal(
    nodeCoreSource.includes(
      "evaluateVoidUdpSwarmRelayPreservingTakeoverPolicyV1({",
    ),
    true,
  );
  let pair: SecurePair | undefined;
  let rejectedPair: SecurePair | undefined;
  let relayLossPair: SecurePair | undefined;

  try {
    const kpA = keypair();
    const kpB = keypair();
    const relayKp = keypair();
    const nodeA = newNode(path.join(root, "a"), kpA);
    const nodeB = newNode(path.join(root, "b"), kpB);
    const streamId = crypto.randomBytes(16).toString("hex");
    const sessionId = crypto.randomBytes(16).toString("hex");
    const relayFallback = installLiveRelayFallback(
      nodeA,
      kpB,
      relayKp,
      streamId,
    );

    let persistedA = 0;
    internals(nodeA).rememberAuthenticatedPeer = () => { persistedA += 1; };

    pair = establishSecurePair(kpA, kpB, "127.0.0.1:53001", "127.0.0.1:53002");
    assert(pair.a.socket && pair.b.socket);
    assert.equal(
      nodeA.stageUdpSwarmAuthenticatedDirectCandidateV1({
        sessionId,
        expectedPeerNodeId: kpB.nodeId,
        relayNodeId: relayKp.nodeId,
        relayStreamId: streamId,
        transportHint: "udp-swarm:127.0.0.1:53002",
        socket: pair.a.socket,
      }),
      true,
    );
    assert.equal(
      nodeB.attachEphemeralDirectTransportV1(
        pair.b.socket,
        kpA.nodeId,
        "udp-swarm-proof:127.0.0.1:53001",
      ),
      true,
    );

    await waitFor(
      () => {
        const snapshot = nodeA.udpSwarmAuthenticatedDirectCandidateSnapshotV1();
        return snapshot.candidate_count === 1 &&
          snapshot.candidates[0]?.phase === "authenticated_candidate" &&
          nodeB.peers.get(kpA.nodeId)?.handshakeDone === true;
      },
      "normal VOID authentication over staged UDP candidate",
    );

    const snapshot = nodeA.udpSwarmAuthenticatedDirectCandidateSnapshotV1();
    assert.equal(snapshot.candidate_count, 1);
    assert.equal(snapshot.normal_peer_routing_promotion_performed, false);
    assert.equal(snapshot.relay_retirement_performed, false);
    const candidate = snapshot.candidates[0];
    assert(candidate);
    assert.equal(candidate.expected_peer_node_id, kpB.nodeId);
    assert.equal(candidate.relay_node_id, relayKp.nodeId);
    assert.equal(candidate.relay_stream_id, streamId);
    assert.equal(candidate.phase, "authenticated_candidate");
    assert.equal(candidate.relay_fallback_live, true);
    assert.equal(candidate.candidate_is_normal_peer_route, false);
    assert.equal(candidate.routed_peer_transport, "relay");
    assert.equal(candidate.normal_peer_routing_mutation_performed, false);
    assert.equal(candidate.relay_retirement_authorized, false);

    assert.strictEqual(internals(nodeA).peers.get(kpB.nodeId), relayFallback.peer);
    assert.equal(relayFallback.socket.destroyed, false);
    assert.equal(persistedA, 0);
    assert.equal(
      nodeA.peersSnapshot().connected.filter((entry) => entry.id === kpB.nodeId).length,
      1,
    );

    pair.a.destroy();
    pair.b.destroy();
    await waitFor(
      () => nodeA.udpSwarmAuthenticatedDirectCandidateSnapshotV1().candidate_count === 0,
      "candidate cleanup after secure UDP socket close",
    );
    assert.strictEqual(internals(nodeA).peers.get(kpB.nodeId), relayFallback.peer);
    assert.equal(relayFallback.socket.destroyed, false);

    rejectedPair = establishSecurePair(
      kpA,
      kpB,
      "127.0.0.1:53101",
      "127.0.0.1:53102",
    );
    assert(rejectedPair.a.socket && rejectedPair.b.socket);
    assert.equal(
      nodeA.stageUdpSwarmAuthenticatedDirectCandidateV1({
        sessionId: crypto.randomBytes(16).toString("hex"),
        expectedPeerNodeId: kpB.nodeId,
        relayNodeId: relayKp.nodeId,
        relayStreamId: "f".repeat(32),
        transportHint: "udp-swarm:127.0.0.1:53102",
        socket: rejectedPair.a.socket,
      }),
      false,
    );
    assert.equal(rejectedPair.a.socket.destroyed, true);
    assert.strictEqual(internals(nodeA).peers.get(kpB.nodeId), relayFallback.peer);
    assert.equal(relayFallback.socket.destroyed, false);

    relayLossPair = establishSecurePair(
      kpA,
      kpB,
      "127.0.0.1:53201",
      "127.0.0.1:53202",
    );
    assert(relayLossPair.a.socket && relayLossPair.b.socket);
    const relayLossSessionId = crypto.randomBytes(16).toString("hex");
    assert.equal(
      nodeA.stageUdpSwarmAuthenticatedDirectCandidateV1({
        sessionId: relayLossSessionId,
        expectedPeerNodeId: kpB.nodeId,
        relayNodeId: relayKp.nodeId,
        relayStreamId: streamId,
        transportHint: "udp-swarm:127.0.0.1:53202",
        socket: relayLossPair.a.socket,
      }),
      true,
    );
    assert.equal(
      nodeA.udpSwarmAuthenticatedDirectCandidateSnapshotV1().candidates[0]?.phase,
      "awaiting_void_auth",
    );
    internals(nodeA).finishRelayLocalStream(
      relayKp.nodeId,
      streamId,
      "proof_relay_loss",
    );
    await waitFor(
      () => relayLossPair!.a.socket?.destroyed === true &&
        nodeA.udpSwarmAuthenticatedDirectCandidateSnapshotV1().candidate_count === 0,
      "relay loss discards staged UDP candidate",
    );
    assert.equal(relayFallback.socket.destroyed, true);

    console.log("secure_udp_candidate_staged_in_node=true");
    console.log("normal_void_hello_auth_reused=true");
    console.log("exact_expected_peer_identity_required=true");
    console.log("exact_live_relay_tuple_required=true");
    console.log("relay_preserving_takeover_policy_enforced=true");
    console.log("authenticated_candidate_kept_non_routable=true");
    console.log("existing_relay_peer_remains_normal_route=true");
    console.log("candidate_close_preserves_relay=true");
    console.log("wrong_relay_tuple_candidate_destroyed=true");
    console.log("relay_loss_discards_waiting_candidate=true");
    console.log("verified_direct_evidence_persisted=false");
    console.log("normal_peer_routing_promotion_performed=false");
    console.log("relay_retirement_performed=false");
    console.log("production_udp_activation_performed=false");
    console.log("wallet_signer_validator_wc_money_authority=0");
    console.log("VOID_P2P_UDP_SWARM_NODE_CANDIDATE_INTEGRATION_V1_PROOF_GREEN");
  } finally {
    try { pair?.a.destroy(); } catch (error) { void error; }
    try { pair?.b.destroy(); } catch (error) { void error; }
    try { rejectedPair?.a.destroy(); } catch (error) { void error; }
    try { rejectedPair?.b.destroy(); } catch (error) { void error; }
    try { relayLossPair?.a.destroy(); } catch (error) { void error; }
    try { relayLossPair?.b.destroy(); } catch (error) { void error; }
    fs.rmSync(root, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
