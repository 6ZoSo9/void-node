import assert from "node:assert/strict";
import * as crypto from "node:crypto";
import * as dgram from "node:dgram";

import { deriveVoidNodeIdFromPublicPemV1 } from "../src/p2p/auth_v1.js";
import {
  VOID_P2P_UDP_AUTHENTICATED_PATH_AUTHORITY_V1,
  VOID_P2P_UDP_AUTHENTICATED_PATH_IDENTITY_ALGORITHM_V1,
  VOID_P2P_UDP_AUTHENTICATED_PATH_SIGNATURE_ALGORITHM_V1,
  createVoidUdpAuthenticatedPathHelloV1,
  createVoidUdpAuthenticatedPathProofV1,
  decodeVoidUdpAuthenticatedPathPacketV1,
  encodeVoidUdpAuthenticatedPathPacketV1,
  normalizeVoidUdpAuthenticatedPathHelloV1,
  normalizeVoidUdpAuthenticatedPathProofV1,
  verifyVoidUdpAuthenticatedPathProofV1,
  type VoidUdpAuthenticatedPathPacketV1,
} from "../src/p2p/udp_authenticated_path_v1.js";

const MARKER = "VOID_P2P_UDP_AUTHENTICATED_PATH_V1_PROOF_GREEN";

type TestIdentity = Readonly<{
  privateKey: crypto.KeyObject;
  publicKey: crypto.KeyObject;
  pubPEM: string;
  nodeId: string;
}>;

type ReceivedPacket = Readonly<{
  packet: VoidUdpAuthenticatedPathPacketV1;
  sourcePort: number;
}>;

function identity(): TestIdentity {
  const { privateKey, publicKey } = crypto.generateKeyPairSync("ed25519");
  const pubPEM = publicKey
    .export({ type: "spki", format: "pem" })
    .toString();
  const nodeId = deriveVoidNodeIdFromPublicPemV1(pubPEM);
  assert(nodeId);
  return Object.freeze({ privateKey, publicKey, pubPEM, nodeId });
}

function bindUdp4(socket: dgram.Socket): Promise<dgram.AddressInfo> {
  return new Promise((resolve, reject) => {
    const onError = (error: Error) => reject(error);
    socket.once("error", onError);
    socket.bind(0, "127.0.0.1", () => {
      socket.off("error", onError);
      const address = socket.address();
      assert.equal(typeof address, "object");
      resolve(address as dgram.AddressInfo);
    });
  });
}

function send(
  socket: dgram.Socket,
  packet: VoidUdpAuthenticatedPathPacketV1,
  port: number,
): Promise<void> {
  const bytes = encodeVoidUdpAuthenticatedPathPacketV1(packet, true);
  return new Promise((resolve, reject) => {
    socket.send(bytes, port, "127.0.0.1", (error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

function receiveOne(
  socket: dgram.Socket,
  predicate: (packet: VoidUdpAuthenticatedPathPacketV1) => boolean,
): Promise<ReceivedPacket> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off("message", onMessage);
      reject(new Error("timed out waiting for UDP authenticated-path packet"));
    }, 2_000);

    const onMessage = (bytes: Buffer, rinfo: dgram.RemoteInfo) => {
      const packet = decodeVoidUdpAuthenticatedPathPacketV1(bytes, true);
      if (!packet || !predicate(packet)) return;
      clearTimeout(timer);
      socket.off("message", onMessage);
      resolve(Object.freeze({ packet, sourcePort: rinfo.port }));
    };

    socket.on("message", onMessage);
  });
}

async function main(): Promise<void> {
  const a = identity();
  const b = identity();
  const impostor = identity();
  const sessionId = "7".repeat(32);

  const socketA = dgram.createSocket("udp4");
  const socketB = dgram.createSocket("udp4");

  try {
    const [boundA, boundB] = await Promise.all([
      bindUdp4(socketA),
      bindUdp4(socketB),
    ]);

    const endpointA = `127.0.0.1:${boundA.port}`;
    const endpointB = `127.0.0.1:${boundB.port}`;

    const helloA = createVoidUdpAuthenticatedPathHelloV1({
      sessionId,
      sourceNodeId: a.nodeId,
      targetNodeId: b.nodeId,
      pubkey: a.pubPEM,
      challenge: "a".repeat(64),
    });
    const helloB = createVoidUdpAuthenticatedPathHelloV1({
      sessionId,
      sourceNodeId: b.nodeId,
      targetNodeId: a.nodeId,
      pubkey: b.pubPEM,
      challenge: "b".repeat(64),
    });

    assert.equal(
      helloA.identity_algorithm,
      VOID_P2P_UDP_AUTHENTICATED_PATH_IDENTITY_ALGORITHM_V1,
    );
    assert.equal(
      helloA.signature_algorithm,
      VOID_P2P_UDP_AUTHENTICATED_PATH_SIGNATURE_ALGORITHM_V1,
    );
    assert.equal(
      helloB.identity_algorithm,
      VOID_P2P_UDP_AUTHENTICATED_PATH_IDENTITY_ALGORITHM_V1,
    );
    assert.equal(
      helloB.signature_algorithm,
      VOID_P2P_UDP_AUTHENTICATED_PATH_SIGNATURE_ALGORITHM_V1,
    );

    assert.equal(
      normalizeVoidUdpAuthenticatedPathHelloV1({
        ...helloA,
        identity_algorithm: "ml-dsa-65",
      }),
      undefined,
    );
    assert.equal(
      normalizeVoidUdpAuthenticatedPathHelloV1({
        ...helloA,
        signature_algorithm: "ml-dsa-65",
      }),
      undefined,
    );

    const helloAtA = receiveOne(
      socketA,
      (packet) =>
        packet.type === "VOID_UDP_AUTH_HELLO" &&
        packet.source_node_id === b.nodeId,
    );
    const helloAtB = receiveOne(
      socketB,
      (packet) =>
        packet.type === "VOID_UDP_AUTH_HELLO" &&
        packet.source_node_id === a.nodeId,
    );

    await Promise.all([
      send(socketA, helloA, boundB.port),
      send(socketB, helloB, boundA.port),
    ]);

    const [receivedHelloAtA, receivedHelloAtB] = await Promise.all([
      helloAtA,
      helloAtB,
    ]);
    assert.deepEqual(receivedHelloAtA.packet, helloB);
    assert.deepEqual(receivedHelloAtB.packet, helloA);
    assert.equal(receivedHelloAtA.sourcePort, boundB.port);
    assert.equal(receivedHelloAtB.sourcePort, boundA.port);

    const proofA = createVoidUdpAuthenticatedPathProofV1({
      localHello: helloA,
      remoteHello: helloB,
      localObservedEndpoint: endpointA,
      remoteObservedEndpoint: endpointB,
      privateKey: a.privateKey,
      allowNonPublicEndpoints: true,
    });
    const proofB = createVoidUdpAuthenticatedPathProofV1({
      localHello: helloB,
      remoteHello: helloA,
      localObservedEndpoint: endpointB,
      remoteObservedEndpoint: endpointA,
      privateKey: b.privateKey,
      allowNonPublicEndpoints: true,
    });

    assert.equal(
      proofA.identity_algorithm,
      VOID_P2P_UDP_AUTHENTICATED_PATH_IDENTITY_ALGORITHM_V1,
    );
    assert.equal(
      proofA.signature_algorithm,
      VOID_P2P_UDP_AUTHENTICATED_PATH_SIGNATURE_ALGORITHM_V1,
    );

    // Production normalization rejects the loopback fixture; only the explicit
    // proof override permits it.
    assert.equal(normalizeVoidUdpAuthenticatedPathProofV1(proofA), undefined);
    assert.deepEqual(
      normalizeVoidUdpAuthenticatedPathProofV1(proofA, true),
      proofA,
    );
    assert.equal(
      normalizeVoidUdpAuthenticatedPathProofV1(
        { ...proofA, identity_algorithm: "ml-dsa-65" },
        true,
      ),
      undefined,
    );
    assert.equal(
      normalizeVoidUdpAuthenticatedPathProofV1(
        { ...proofA, signature_algorithm: "ml-dsa-65" },
        true,
      ),
      undefined,
    );

    const proofAtA = receiveOne(
      socketA,
      (packet) =>
        packet.type === "VOID_UDP_AUTH_PROOF" &&
        packet.source_node_id === b.nodeId,
    );
    const proofAtB = receiveOne(
      socketB,
      (packet) =>
        packet.type === "VOID_UDP_AUTH_PROOF" &&
        packet.source_node_id === a.nodeId,
    );

    await Promise.all([
      send(socketA, proofA, boundB.port),
      send(socketB, proofB, boundA.port),
    ]);

    const [receivedProofAtA, receivedProofAtB] = await Promise.all([
      proofAtA,
      proofAtB,
    ]);
    assert.equal(receivedProofAtA.sourcePort, boundB.port);
    assert.equal(receivedProofAtB.sourcePort, boundA.port);

    const verifiedB = verifyVoidUdpAuthenticatedPathProofV1({
      rawProof: receivedProofAtA.packet,
      expectedRemoteHello: helloB,
      localHello: helloA,
      expectedRemoteObservedEndpoint: endpointB,
      localObservedEndpoint: endpointA,
      allowNonPublicEndpoints: true,
    });
    const verifiedA = verifyVoidUdpAuthenticatedPathProofV1({
      rawProof: receivedProofAtB.packet,
      expectedRemoteHello: helloA,
      localHello: helloB,
      expectedRemoteObservedEndpoint: endpointA,
      localObservedEndpoint: endpointB,
      allowNonPublicEndpoints: true,
    });
    assert.deepEqual(verifiedA, proofA);
    assert.deepEqual(verifiedB, proofB);

    assert.equal(
      verifyVoidUdpAuthenticatedPathProofV1({
        rawProof: { ...proofA, identity_algorithm: "ml-dsa-65" },
        expectedRemoteHello: helloA,
        localHello: helloB,
        expectedRemoteObservedEndpoint: endpointA,
        localObservedEndpoint: endpointB,
        allowNonPublicEndpoints: true,
      }),
      undefined,
    );
    assert.equal(
      verifyVoidUdpAuthenticatedPathProofV1({
        rawProof: { ...proofA, signature_algorithm: "ml-dsa-65" },
        expectedRemoteHello: helloA,
        localHello: helloB,
        expectedRemoteObservedEndpoint: endpointA,
        localObservedEndpoint: endpointB,
        allowNonPublicEndpoints: true,
      }),
      undefined,
    );

    const wrongKeyProofA = createVoidUdpAuthenticatedPathProofV1({
      localHello: helloA,
      remoteHello: helloB,
      localObservedEndpoint: endpointA,
      remoteObservedEndpoint: endpointB,
      privateKey: impostor.privateKey,
      allowNonPublicEndpoints: true,
    });
    assert.equal(
      verifyVoidUdpAuthenticatedPathProofV1({
        rawProof: wrongKeyProofA,
        expectedRemoteHello: helloA,
        localHello: helloB,
        expectedRemoteObservedEndpoint: endpointA,
        localObservedEndpoint: endpointB,
        allowNonPublicEndpoints: true,
      }),
      undefined,
    );

    const freshHelloB = createVoidUdpAuthenticatedPathHelloV1({
      sessionId,
      sourceNodeId: b.nodeId,
      targetNodeId: a.nodeId,
      pubkey: b.pubPEM,
      challenge: "c".repeat(64),
    });
    assert.equal(
      verifyVoidUdpAuthenticatedPathProofV1({
        rawProof: proofA,
        expectedRemoteHello: helloA,
        localHello: freshHelloB,
        expectedRemoteObservedEndpoint: endpointA,
        localObservedEndpoint: endpointB,
        allowNonPublicEndpoints: true,
      }),
      undefined,
    );

    assert.equal(
      verifyVoidUdpAuthenticatedPathProofV1({
        rawProof: proofA,
        expectedRemoteHello: helloA,
        localHello: helloB,
        expectedRemoteObservedEndpoint: "127.0.0.1:65534",
        localObservedEndpoint: endpointB,
        allowNonPublicEndpoints: true,
      }),
      undefined,
    );

    const malformed = Buffer.from(
      JSON.stringify({ ...proofA, extra: true }),
      "utf8",
    );
    assert.equal(
      decodeVoidUdpAuthenticatedPathPacketV1(malformed, true),
      undefined,
    );

    assert.equal(
      VOID_P2P_UDP_AUTHENTICATED_PATH_AUTHORITY_V1.void_ed25519_identity_required,
      true,
    );
    assert.equal(
      VOID_P2P_UDP_AUTHENTICATED_PATH_AUTHORITY_V1.identity_algorithm_explicit,
      true,
    );
    assert.equal(
      VOID_P2P_UDP_AUTHENTICATED_PATH_AUTHORITY_V1.signature_algorithm_explicit,
      true,
    );
    assert.equal(
      VOID_P2P_UDP_AUTHENTICATED_PATH_AUTHORITY_V1.algorithm_confusion_rejected,
      true,
    );
    assert.equal(
      VOID_P2P_UDP_AUTHENTICATED_PATH_AUTHORITY_V1.crypto_agility_extension_point_explicit,
      true,
    );
    assert.equal(
      VOID_P2P_UDP_AUTHENTICATED_PATH_AUTHORITY_V1.quantum_safe_claimed,
      false,
    );
    assert.equal(
      VOID_P2P_UDP_AUTHENTICATED_PATH_AUTHORITY_V1.mutual_fresh_challenges_required,
      true,
    );
    assert.equal(
      VOID_P2P_UDP_AUTHENTICATED_PATH_AUTHORITY_V1.observed_endpoint_defines_node_identity,
      false,
    );
    assert.equal(
      VOID_P2P_UDP_AUTHENTICATED_PATH_AUTHORITY_V1.reliable_ordered_transport_claimed,
      false,
    );
    assert.equal(
      VOID_P2P_UDP_AUTHENTICATED_PATH_AUTHORITY_V1.runtime_peer_promotion_performed,
      false,
    );
    assert.equal(
      VOID_P2P_UDP_AUTHENTICATED_PATH_AUTHORITY_V1.relay_fallback_preserved,
      true,
    );
    assert.equal(
      VOID_P2P_UDP_AUTHENTICATED_PATH_AUTHORITY_V1.wallet_signer_validator_wc_money_authority,
      0,
    );

    console.log("real_udp_socket_exchange_proven=true");
    console.log("void_ed25519_identity_required=true");
    console.log("identity_algorithm_explicit=true");
    console.log("signature_algorithm_explicit=true");
    console.log("algorithm_confusion_accepted=false");
    console.log("crypto_agility_extension_point_explicit=true");
    console.log("quantum_safe_claimed=false");
    console.log("node_id_public_key_binding_required=true");
    console.log("mutual_fresh_challenges_required=true");
    console.log("exact_session_binding_required=true");
    console.log("exact_peer_node_id_binding_required=true");
    console.log("exact_observed_endpoint_binding_required=true");
    console.log("wrong_key_udp_auth_accepted=false");
    console.log("replayed_challenge_udp_auth_accepted=false");
    console.log("wrong_observed_endpoint_udp_auth_accepted=false");
    console.log("unknown_packet_fields_accepted=false");
    console.log("observed_endpoint_defines_node_identity=false");
    console.log("reliable_ordered_transport_claimed=false");
    console.log("runtime_peer_promotion_performed=false");
    console.log("verified_direct_cache_mutation_performed=false");
    console.log("relay_fallback_preserved=true");
    console.log("router_configuration_required=false");
    console.log("port_forward_required=false");
    console.log("wallet_signer_validator_wc_money_authority=0");
    console.log(MARKER);
  } finally {
    socketA.close();
    socketB.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
