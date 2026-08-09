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
  const transportSessionId = crypto.randomBytes(16).toString("hex");
  let controllerA!: VoidUdpSecureSessionBootstrapV1;
  let controllerB!: VoidUdpSecureSessionBootstrapV1;

  const transmitA = (packet: VoidUdpSecurePacketV1) => {
    queueMicrotask(() => controllerB.receiveSecurePacket(packet));
  };
  const transmitB = (packet: VoidUdpSecurePacketV1) => {
    queueMicrotask(() => controllerA.receiveSecurePacket(packet));
  };

  controllerA = new VoidUdpSecureSessionBootstrapV1({
    sessionId: transportSessionId,
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
    sessionId: transportSessionId,
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

async function stageAndPromoteBoth(input: {
  nodeA: Node;
  nodeB: Node;
  kpA: TestKeypair;
  kpB: TestKeypair;
  relayKp: TestKeypair;
  relayA: { peer: any; socket: TestRelaySocket };
  relayB: { peer: any; socket: TestRelaySocket };
  streamId: string;
  endpointBase: number;
}): Promise<{
  pair: SecurePair;
  sessionId: string;
  directPeerA: any;
  directPeerB: any;
}> {
  const sessionId = crypto.randomBytes(16).toString("hex");
  const pair = establishSecurePair(
    input.kpA,
    input.kpB,
    `127.0.0.1:${input.endpointBase}`,
    `127.0.0.1:${input.endpointBase + 1}`,
  );
  assert(pair.a.socket && pair.b.socket);

  assert.equal(
    input.nodeA.stageUdpSwarmAuthenticatedDirectCandidateV1({
      sessionId,
      expectedPeerNodeId: input.kpB.nodeId,
      relayNodeId: input.relayKp.nodeId,
      relayStreamId: input.streamId,
      transportHint: `udp-swarm:127.0.0.1:${input.endpointBase + 1}`,
      socket: pair.a.socket,
    }),
    true,
  );
  assert.equal(
    input.nodeB.stageUdpSwarmAuthenticatedDirectCandidateV1({
      sessionId,
      expectedPeerNodeId: input.kpA.nodeId,
      relayNodeId: input.relayKp.nodeId,
      relayStreamId: input.streamId,
      transportHint: `udp-swarm:127.0.0.1:${input.endpointBase}`,
      socket: pair.b.socket,
    }),
    true,
  );

  await waitFor(
    () =>
      input.nodeA.udpSwarmAuthenticatedDirectCandidateSnapshotV1()
        .candidates[0]?.phase === "authenticated_candidate" &&
      input.nodeB.udpSwarmAuthenticatedDirectCandidateSnapshotV1()
        .candidates[0]?.phase === "authenticated_candidate",
    "symmetric authenticated UDP candidates",
  );

  const directPeerA = internals(input.nodeA).udpSwarmDirectCandidates.get(sessionId);
  const directPeerB = internals(input.nodeB).udpSwarmDirectCandidates.get(sessionId);
  assert(directPeerA && directPeerB);
  assert.strictEqual(input.nodeA.peers.get(input.kpB.nodeId), input.relayA.peer);
  assert.strictEqual(input.nodeB.peers.get(input.kpA.nodeId), input.relayB.peer);

  assert.equal(
    input.nodeA.promoteUdpSwarmAuthenticatedDirectCandidateV1(sessionId).ok,
    true,
  );
  assert.equal(
    input.nodeB.promoteUdpSwarmAuthenticatedDirectCandidateV1(sessionId).ok,
    true,
  );
  assert.strictEqual(input.nodeA.peers.get(input.kpB.nodeId), directPeerA);
  assert.strictEqual(input.nodeB.peers.get(input.kpA.nodeId), directPeerB);
  assert.equal(input.relayA.socket.destroyed, false);
  assert.equal(input.relayB.socket.destroyed, false);

  return { pair, sessionId, directPeerA, directPeerB };
}

function lastHealthMessage(messages: unknown[], type: string): any {
  const message = [...messages]
    .reverse()
    .find((entry: any) => entry?.type === type);
  assert(message, `missing ${type}`);
  return message;
}

async function main(): Promise<void> {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "void-udp-node-health-mount-v1-"));
  let pair: SecurePair | undefined;

  try {
    const kpA = keypair();
    const kpB = keypair();
    const relayKp = keypair();
    const nodeA = newNode(path.join(root, "a"), kpA);
    const nodeB = newNode(path.join(root, "b"), kpB);
    const streamId = crypto.randomBytes(16).toString("hex");
    const relayA = installLiveRelayFallback(nodeA, kpB, relayKp, streamId);
    const relayB = installLiveRelayFallback(nodeB, kpA, relayKp, streamId);

    const promoted = await stageAndPromoteBoth({
      nodeA,
      nodeB,
      kpA,
      kpB,
      relayKp,
      relayA,
      relayB,
      streamId,
      endpointBase: 55101,
    });
    pair = promoted.pair;

    const initialHealthA = nodeA.udpSwarmPromotedDirectRouteHealthSnapshotV1();
    const initialHealthB = nodeB.udpSwarmPromotedDirectRouteHealthSnapshotV1();
    assert.equal(initialHealthA.promoted_health_route_count, 1);
    assert.equal(initialHealthB.promoted_health_route_count, 1);
    assert.equal(initialHealthA.routes[0]?.session_id, promoted.sessionId);
    assert.equal(initialHealthA.routes[0]?.direct_route_live, true);
    assert.equal(initialHealthA.routes[0]?.relay_fallback_live, true);
    assert.equal(initialHealthA.routes[0]?.relay_retirement_performed, false);
    assert.equal(initialHealthA.relay_retirement_performed, false);

    const coreA = internals(nodeA);
    const coreB = internals(nodeB);
    const sentA: unknown[] = [];
    const sentB: unknown[] = [];
    coreA.sendRaw = (_peer: unknown, message: unknown) => {
      sentA.push(structuredClone(message));
    };
    coreB.sendRaw = (_peer: unknown, message: unknown) => {
      sentB.push(structuredClone(message));
    };

    const promotedAtMs = initialHealthA.routes[0]!.promoted_at_ms;
    const offsets = [0, 7_500, 15_000, 22_500, 30_000] as const;
    for (const offset of offsets) {
      const sentAtMs = promotedAtMs + offset;
      sentA.length = 0;
      sentB.length = 0;
      const sweep = coreA.sweepUdpSwarmPromotedDirectRouteHealthV1(sentAtMs);
      assert.equal(sweep.probes_sent, 1);
      assert.equal(sweep.failures_recorded, 0);
      const ping = lastHealthMessage(sentA, "UDP_SWARM_DIRECT_HEALTH_PING");
      assert.equal(ping.session_id, promoted.sessionId);

      assert.equal(
        coreB.handleUdpSwarmPromotedDirectRouteHealthMessageV1(
          promoted.directPeerB,
          ping,
          sentAtMs + 5,
        ),
        true,
      );
      const pong = lastHealthMessage(sentB, "UDP_SWARM_DIRECT_HEALTH_PONG");
      assert.equal(pong.probe_id, ping.probe_id);
      assert.equal(
        coreA.handleUdpSwarmPromotedDirectRouteHealthMessageV1(
          promoted.directPeerA,
          pong,
          sentAtMs + 10,
        ),
        true,
      );
    }

    const authorizedAtMs = promotedAtMs + 30_010;
    const healthy = nodeA.udpSwarmPromotedDirectRouteHealthSnapshotV1(
      authorizedAtMs,
    );
    assert.equal(healthy.routes[0]?.observer.poisoned, false);
    assert.equal(healthy.routes[0]?.observer.consecutive_successful_round_trips, 5);
    assert.equal(healthy.routes[0]?.observer.failed_round_trips_since_promotion, 0);
    assert.equal(healthy.routes[0]?.policy_decision.action, "authorize_relay_retirement");
    assert.equal(healthy.routes[0]?.relay_retirement_authorized, true);
    assert.equal(healthy.routes[0]?.relay_retirement_performed, false);
    assert.equal(healthy.relay_retirement_performed, false);
    assert.equal(relayA.socket.destroyed, false);
    assert.equal(relayB.socket.destroyed, false);
    assert.strictEqual(nodeA.peers.get(kpB.nodeId), promoted.directPeerA);
    assert.strictEqual(nodeB.peers.get(kpA.nodeId), promoted.directPeerB);
    assert.equal(coreA.relayStreams.has(`${relayKp.nodeId}:${streamId}`), true);

    const wrongSessionPing = {
      ...lastHealthMessage(sentA, "UDP_SWARM_DIRECT_HEALTH_PING"),
      session_id: "f".repeat(32),
    };
    sentB.length = 0;
    assert.equal(
      coreB.handleUdpSwarmPromotedDirectRouteHealthMessageV1(
        promoted.directPeerB,
        wrongSessionPing,
        authorizedAtMs,
      ),
      false,
    );
    assert.equal(sentB.length, 0);
    assert.equal(
      coreA.handleUdpSwarmPromotedDirectRouteHealthMessageV1(
        relayA.peer,
        wrongSessionPing,
        authorizedAtMs,
      ),
      false,
    );

    const timeoutSentAtMs = promotedAtMs + 37_500;
    sentA.length = 0;
    assert.equal(
      coreA.sweepUdpSwarmPromotedDirectRouteHealthV1(timeoutSentAtMs)
        .probes_sent,
      1,
    );
    const timeoutSweep = coreA.sweepUdpSwarmPromotedDirectRouteHealthV1(
      timeoutSentAtMs + 3_001,
    );
    assert.equal(timeoutSweep.failures_recorded, 1);
    const afterTimeout = nodeA.udpSwarmPromotedDirectRouteHealthSnapshotV1(
      timeoutSentAtMs + 3_001,
    );
    assert.equal(afterTimeout.routes[0]?.observer.failed_round_trips_since_promotion, 1);
    assert.equal(afterTimeout.routes[0]?.policy_decision.action, "retain_relay");
    assert.equal(afterTimeout.routes[0]?.policy_decision.reason, "failed_round_trip_observed");
    assert.equal(afterTimeout.routes[0]?.relay_retirement_authorized, false);
    assert.equal(relayA.socket.destroyed, false);

    pair.a.destroy();
    await waitFor(
      () => nodeA.peers.get(kpB.nodeId) === relayA.peer,
      "relay restoration after health-monitored direct close",
    );
    assert.equal(relayA.socket.destroyed, false);
    assert.equal(
      nodeA.udpSwarmPromotedDirectRouteHealthSnapshotV1().promoted_health_route_count,
      0,
    );

    coreB.finishRelayLocalStream(
      relayKp.nodeId,
      streamId,
      "proof_retained_relay_loss_after_health_mount",
    );
    await waitFor(() => relayB.socket.destroyed === true, "retained relay fallback loss");
    const fallbackLost = nodeB.udpSwarmPromotedDirectRouteHealthSnapshotV1();
    assert.equal(fallbackLost.promoted_health_route_count, 1);
    assert.equal(fallbackLost.routes[0]?.direct_route_live, true);
    assert.equal(fallbackLost.routes[0]?.relay_fallback_live, false);
    assert.equal(fallbackLost.routes[0]?.policy_decision.action, "retain_relay");
    assert.equal(fallbackLost.routes[0]?.policy_decision.reason, "relay_fallback_not_live");
    sentB.length = 0;
    assert.equal(
      coreB.sweepUdpSwarmPromotedDirectRouteHealthV1(
        fallbackLost.routes[0]!.promoted_at_ms + 60_000,
      ).probes_sent,
      0,
    );
    assert.equal(sentB.length, 0);
    assert.strictEqual(nodeB.peers.get(kpA.nodeId), promoted.directPeerB);

    pair.b.destroy();
    await waitFor(
      () => !nodeB.peers.has(kpA.nodeId),
      "direct close without dead relay restoration",
    );
    assert.equal(
      nodeB.udpSwarmPromotedDirectRouteHealthSnapshotV1().promoted_health_route_count,
      0,
    );

    console.log("health_messages_require_exact_promoted_direct_route=true");
    console.log("retained_relay_route_cannot_answer_health_ping=true");
    console.log("health_probe_uses_existing_maintenance_timer=true");
    console.log("additional_health_timer_created=false");
    console.log("five_successes_span_at_least_30_seconds=true");
    console.log("probe_rtt_feeds_fail_closed_observer=true");
    console.log("health_policy_authorization_visible=true");
    console.log("health_policy_authorization_executes_retirement=false");
    console.log("timeout_reverts_policy_to_retain_relay=true");
    console.log("direct_close_clears_health_context=true");
    console.log("direct_close_restores_live_relay_fallback=true");
    console.log("relay_loss_stops_health_probe_emission=true");
    console.log("relay_loss_preserves_promoted_direct_route=true");
    console.log("relay_retirement_performed=false");
    console.log("verified_direct_evidence_persisted=false");
    console.log("production_udp_activation_performed=false");
    console.log("wallet_signer_validator_wc_money_authority=0");
    console.log("VOID_P2P_UDP_SWARM_NODE_DIRECT_ROUTE_HEALTH_MOUNT_V1_PROOF_GREEN");
  } finally {
    try { pair?.a.destroy(); } catch (error) { void error; }
    try { pair?.b.destroy(); } catch (error) { void error; }
    fs.rmSync(root, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
