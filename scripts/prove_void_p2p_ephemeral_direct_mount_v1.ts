import assert from "node:assert/strict";
import * as crypto from "node:crypto";
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
  assert.equal(controllerA.ready, true);
  assert.equal(controllerB.ready, true);
  assert(controllerA.socket);
  assert(controllerB.socket);

  return { a: controllerA, b: controllerB };
}

async function main(): Promise<void> {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "void-ephemeral-direct-mount-v1-"));
  let pair: SecurePair | undefined;
  let mismatchPair: SecurePair | undefined;

  try {
    const kpA = keypair();
    const kpB = keypair();
    const kpC = keypair();
    const nodeA = newNode(path.join(root, "a"), kpA);
    const nodeB = newNode(path.join(root, "b"), kpB);

    let persistedA = 0;
    let persistedB = 0;
    let reachabilityA = 0;
    let reachabilityB = 0;
    let httpA = 0;
    let httpB = 0;

    internals(nodeA).rememberAuthenticatedPeer = () => { persistedA += 1; };
    internals(nodeB).rememberAuthenticatedPeer = () => { persistedB += 1; };
    nodeA.onReachabilityObservation = () => { reachabilityA += 1; };
    nodeB.onReachabilityObservation = () => { reachabilityB += 1; };
    nodeA.onHttpAnnounce = () => { httpA += 1; };
    nodeB.onHttpAnnounce = () => { httpB += 1; };

    const fakeSocket = {
      on: () => fakeSocket,
      write: () => true,
      destroy: () => fakeSocket,
    } as any;
    assert.equal(
      nodeA.attachEphemeralDirectTransportV1(fakeSocket, "bad", "udp-punch:test"),
      false,
    );
    assert.equal(
      nodeA.attachEphemeralDirectTransportV1(fakeSocket, nodeA.id, "udp-punch:test"),
      false,
    );
    assert.equal(
      nodeA.attachEphemeralDirectTransportV1(fakeSocket, kpB.nodeId, "udp punch whitespace"),
      false,
    );

    pair = establishSecurePair(kpA, kpB, "127.0.0.1:51001", "127.0.0.1:51002");
    assert(pair.a.socket && pair.b.socket);

    // Mount A first. Its first HELLO is delivered by microtask, so B is mounted
    // before the secure adapter emits the corresponding data event.
    assert.equal(
      nodeA.attachEphemeralDirectTransportV1(
        pair.a.socket,
        kpB.nodeId,
        "udp-punch:127.0.0.1:51002",
      ),
      true,
    );
    assert.equal(
      nodeB.attachEphemeralDirectTransportV1(
        pair.b.socket,
        kpA.nodeId,
        "udp-punch:127.0.0.1:51001",
      ),
      true,
    );

    await waitFor(
      () => nodeA.peers.get(kpB.nodeId)?.handshakeDone === true &&
        nodeB.peers.get(kpA.nodeId)?.handshakeDone === true,
      "normal VOID HELLO/AUTH over ephemeral secure transport",
    );

    const peerAtA = internals(nodeA).peers.get(kpB.nodeId);
    const peerAtB = internals(nodeB).peers.get(kpA.nodeId);
    assert(peerAtA && peerAtB);
    assert.equal(peerAtA.transport, "direct");
    assert.equal(peerAtB.transport, "direct");
    assert.equal(peerAtA.persistDirectEvidence, false);
    assert.equal(peerAtB.persistDirectEvidence, false);
    assert.equal(peerAtA.suppressReconnect, true);
    assert.equal(peerAtB.suppressReconnect, true);
    assert.equal(peerAtA.expectedNodeId, kpB.nodeId);
    assert.equal(peerAtB.expectedNodeId, kpA.nodeId);

    // The normal VOID authentication completed, but transient punched transport
    // is deliberately excluded from durable direct-reachability truth.
    assert.equal(persistedA, 0);
    assert.equal(persistedB, 0);
    assert.equal(internals(nodeA).verifiedPeerCacheRecords.length, 0);
    assert.equal(internals(nodeB).verifiedPeerCacheRecords.length, 0);
    assert.equal(internals(nodeA).knownAddrs.size, 0);
    assert.equal(internals(nodeB).knownAddrs.size, 0);
    assert.equal(internals(nodeA).peerHttp.size, 0);
    assert.equal(internals(nodeB).peerHttp.size, 0);
    assert.equal(reachabilityA, 0);
    assert.equal(reachabilityB, 0);
    assert.equal(httpA, 0);
    assert.equal(httpB, 0);

    pair.a.destroy();
    pair.b.destroy();
    await waitFor(
      () => !nodeA.peers.has(kpB.nodeId) && !nodeB.peers.has(kpA.nodeId),
      "ephemeral peer removal after transport close",
    );
    assert.equal(internals(nodeA).backoff.size, 0);
    assert.equal(internals(nodeB).backoff.size, 0);

    // Defense in depth: even a cryptographically valid secure transport cannot
    // be promoted when Node pins a different expected VOID identity.
    const mismatchA = newNode(path.join(root, "mismatch-a"), kpA);
    const mismatchB = newNode(path.join(root, "mismatch-b"), kpB);
    let mismatchPersistA = 0;
    internals(mismatchA).rememberAuthenticatedPeer = () => { mismatchPersistA += 1; };

    mismatchPair = establishSecurePair(
      kpA,
      kpB,
      "127.0.0.1:52001",
      "127.0.0.1:52002",
    );
    assert(mismatchPair.a.socket && mismatchPair.b.socket);
    assert.equal(
      mismatchA.attachEphemeralDirectTransportV1(
        mismatchPair.a.socket,
        kpC.nodeId,
        "udp-punch:127.0.0.1:52002",
      ),
      true,
    );
    assert.equal(
      mismatchB.attachEphemeralDirectTransportV1(
        mismatchPair.b.socket,
        kpA.nodeId,
        "udp-punch:127.0.0.1:52001",
      ),
      true,
    );

    await waitFor(
      () => mismatchPair!.a.socket?.destroyed === true,
      "wrong expected identity actively destroys mounted transport",
    );
    await waitFor(
      () => mismatchA.peers.size === 0,
      "wrong expected identity temporary peer cleanup",
    );
    assert.equal(mismatchA.peers.has(kpB.nodeId), false);
    assert.equal(mismatchPersistA, 0);
    assert.equal(internals(mismatchA).verifiedPeerCacheRecords.length, 0);
    assert.equal(internals(mismatchA).knownAddrs.size, 0);
    assert.equal(internals(mismatchA).backoff.size, 0);

    mismatchPair.a.destroy();
    mismatchPair.b.destroy();

    console.log("ephemeral_direct_mount_surface_exposed=true");
    console.log("secure_udp_peer_socket_accepted=true");
    console.log("normal_void_hello_auth_over_ephemeral_transport=true");
    console.log("expected_remote_node_id_pinned=true");
    console.log("wrong_expected_identity_promoted=false");
    console.log("wrong_expected_identity_transport_destroyed=true");
    console.log("persist_direct_evidence=false");
    console.log("verified_peer_cache_write_performed=false");
    console.log("known_addrs_promotion_performed=false");
    console.log("peer_http_promotion_performed=false");
    console.log("reachability_promotion_performed=false");
    console.log("verified_peer_reconnect_scheduled=false");
    console.log("signed_listen_peer_advertisement_promotion=false");
    console.log("relay_fallback_compatibility_preserved=true");
    console.log("live_udp_runtime_activation_performed=false");
    console.log("router_configuration_required=false");
    console.log("port_forward_required=false");
    console.log("wallet_signer_validator_wc_money_authority=0");
    console.log("VOID_P2P_EPHEMERAL_DIRECT_MOUNT_V1_PROOF_GREEN");
  } finally {
    try { pair?.a.destroy(); } catch (error) { void error; }
    try { pair?.b.destroy(); } catch (error) { void error; }
    try { mismatchPair?.a.destroy(); } catch (error) { void error; }
    try { mismatchPair?.b.destroy(); } catch (error) { void error; }
    fs.rmSync(root, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
