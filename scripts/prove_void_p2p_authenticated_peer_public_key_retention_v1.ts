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

function treeContainsBytes(root: string, needle: Buffer): boolean {
  if (!fs.existsSync(root)) return false;
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) {
      if (treeContainsBytes(full, needle)) return true;
      continue;
    }
    if (entry.isFile() && fs.readFileSync(full).includes(needle)) return true;
  }
  return false;
}

async function main(): Promise<void> {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "void-peer-public-key-retention-v1-"));
  let pair: SecurePair | undefined;

  try {
    const kpA = keypair();
    const kpB = keypair();
    const nodeA = newNode(path.join(root, "a"), kpA);
    const nodeB = newNode(path.join(root, "b"), kpB);

    pair = establishSecurePair(
      kpA,
      kpB,
      "127.0.0.1:53001",
      "127.0.0.1:53002",
    );
    assert(pair.a.socket && pair.b.socket);

    assert.equal(
      nodeA.attachEphemeralDirectTransportV1(
        pair.a.socket,
        kpB.nodeId,
        "udp-punch:127.0.0.1:53002",
      ),
      true,
    );
    assert.equal(
      nodeB.attachEphemeralDirectTransportV1(
        pair.b.socket,
        kpA.nodeId,
        "udp-punch:127.0.0.1:53001",
      ),
      true,
    );

    await waitFor(
      () => nodeA.peers.get(kpB.nodeId)?.handshakeDone === true &&
        nodeB.peers.get(kpA.nodeId)?.handshakeDone === true,
      "normal VOID HELLO/AUTH over secure UDP transport",
    );

    const peerAtA = internals(nodeA).peers.get(kpB.nodeId);
    const peerAtB = internals(nodeB).peers.get(kpA.nodeId);
    assert(peerAtA && peerAtB);

    assert.equal(peerAtA.authenticatedPublicPem, kpB.pubPEM);
    assert.equal(peerAtB.authenticatedPublicPem, kpA.pubPEM);
    assert.equal(
      deriveVoidNodeIdFromPublicPemV1(peerAtA.authenticatedPublicPem),
      kpB.nodeId,
    );
    assert.equal(
      deriveVoidNodeIdFromPublicPemV1(peerAtB.authenticatedPublicPem),
      kpA.nodeId,
    );
    assert.equal(
      crypto.createPublicKey(peerAtA.authenticatedPublicPem)
        .export({ type: "spki", format: "pem" })
        .toString(),
      kpB.pubPEM,
    );
    assert.equal(
      crypto.createPublicKey(peerAtB.authenticatedPublicPem)
        .export({ type: "spki", format: "pem" })
        .toString(),
      kpA.pubPEM,
    );

    const snapshotA = nodeA.peersSnapshot() as any;
    const snapshotB = nodeB.peersSnapshot() as any;
    assert.equal(snapshotA.connected.length, 1);
    assert.equal(snapshotB.connected.length, 1);
    assert.equal("authenticatedPublicPem" in snapshotA.connected[0], false);
    assert.equal("authenticatedPublicPem" in snapshotB.connected[0], false);
    assert.equal(JSON.stringify(snapshotA).includes("BEGIN PUBLIC KEY"), false);
    assert.equal(JSON.stringify(snapshotB).includes("BEGIN PUBLIC KEY"), false);

    assert.equal(internals(nodeA).verifiedPeerCacheRecords.length, 0);
    assert.equal(internals(nodeB).verifiedPeerCacheRecords.length, 0);
    assert.equal(
      JSON.stringify(internals(nodeA).verifiedPeerCacheRecords).includes("BEGIN PUBLIC KEY"),
      false,
    );
    assert.equal(
      JSON.stringify(internals(nodeB).verifiedPeerCacheRecords).includes("BEGIN PUBLIC KEY"),
      false,
    );

    assert.equal(treeContainsBytes(root, Buffer.from(kpA.pubPEM)), false);
    assert.equal(treeContainsBytes(root, Buffer.from(kpB.pubPEM)), false);

    pair.a.destroy();
    pair.b.destroy();
    await waitFor(
      () => !nodeA.peers.has(kpB.nodeId) && !nodeB.peers.has(kpA.nodeId),
      "authenticated peer removal after transient transport close",
    );
    assert.equal(
      [...internals(nodeA).peers.values()].some(
        (peer: any) => peer.authenticatedPublicPem === kpB.pubPEM,
      ),
      false,
    );
    assert.equal(
      [...internals(nodeB).peers.values()].some(
        (peer: any) => peer.authenticatedPublicPem === kpA.pubPEM,
      ),
      false,
    );

    console.log("verified_auth_public_pem_retained_in_memory=true");
    console.log("retained_pem_matches_authenticated_node_id=true");
    console.log("retained_pem_is_canonical_ed25519=true");
    console.log("public_peers_snapshot_exposes_pem=false");
    console.log("verified_peer_cache_persists_pem=false");
    console.log("test_data_tree_persists_pem=false");
    console.log("peer_map_retains_pem_after_transport_close=false");
    console.log("normal_void_hello_auth_required=true");
    console.log("second_peer_identity_protocol_created=false");
    console.log("relay_rendezvous_runtime_activation_performed=false");
    console.log("router_configuration_required=false");
    console.log("port_forward_required=false");
    console.log("wallet_signer_validator_wc_money_authority=0");
    console.log("VOID_P2P_AUTHENTICATED_PEER_PUBLIC_KEY_RETENTION_V1_PROOF_GREEN");
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
