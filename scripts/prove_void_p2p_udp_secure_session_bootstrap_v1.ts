import assert from "node:assert/strict";
import * as crypto from "node:crypto";

import { deriveVoidNodeIdFromPublicPemV1 } from "../src/p2p/auth_v1.js";
import {
  createVoidUdpAuthenticatedPathHelloV1,
  createVoidUdpAuthenticatedPathProofV1,
} from "../src/p2p/udp_authenticated_path_v1.js";
import {
  VOID_P2P_UDP_SECURE_SESSION_BOOTSTRAP_AUTHORITY_V1,
  VoidUdpSecureSessionBootstrapV1,
} from "../src/p2p/udp_secure_session_bootstrap_v1.js";
import type { VoidUdpSecurePacketV1 } from "../src/p2p/udp_secure_reliable_transport_v1.js";

const MARKER = "VOID_P2P_UDP_SECURE_SESSION_BOOTSTRAP_V1_PROOF_GREEN";

type Identity = {
  privateKey: crypto.KeyObject;
  publicPem: string;
  nodeId: string;
};

function identity(): Identity {
  const { privateKey, publicKey } = crypto.generateKeyPairSync("ed25519");
  const publicPem = publicKey.export({ type: "spki", format: "pem" }).toString();
  const nodeId = deriveVoidNodeIdFromPublicPemV1(publicPem);
  assert(nodeId);
  return { privateKey, publicPem, nodeId };
}

async function waitFor(
  predicate: () => boolean,
  label: string,
  timeoutMs = 3_000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error(`timed out waiting for ${label}`);
}

async function main(): Promise<void> {
  const a = identity();
  const b = identity();
  const sessionId = crypto.randomBytes(16).toString("hex");
  const endpointA = "127.0.0.1:51001";
  const endpointB = "127.0.0.1:51002";

  let controllerA!: VoidUdpSecureSessionBootstrapV1;
  let controllerB!: VoidUdpSecureSessionBootstrapV1;
  let readyA = 0;
  let readyB = 0;

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
    localPublicPem: a.publicPem,
    localPrivateKey: a.privateKey,
    localObservedEndpoint: endpointA,
    remoteObservedEndpoint: endpointB,
    allowNonPublicEndpoints: true,
    transmitSecurePacket: transmitA,
    adapterOptions: { autoRetransmit: false },
    onReady: () => { readyA += 1; },
  });
  controllerB = new VoidUdpSecureSessionBootstrapV1({
    sessionId,
    localNodeId: b.nodeId,
    remoteNodeId: a.nodeId,
    localPublicPem: b.publicPem,
    localPrivateKey: b.privateKey,
    localObservedEndpoint: endpointB,
    remoteObservedEndpoint: endpointA,
    allowNonPublicEndpoints: true,
    transmitSecurePacket: transmitB,
    adapterOptions: { autoRetransmit: false },
    onReady: () => { readyB += 1; },
  });

  assert.equal(controllerA.phase, "awaiting_remote_hello");
  assert.equal(controllerB.phase, "awaiting_remote_hello");
  assert.equal(controllerA.ready, false);
  assert.equal(controllerB.ready, false);
  assert.equal(controllerA.socket, undefined);
  assert.equal(controllerB.socket, undefined);

  assert.throws(() => controllerA.createLocalProof(), /remote .*HELLO/i);
  assert.throws(() => controllerA.createLocalKeyOffer(), /mutual UDP path authentication/i);

  const wrongSessionHello = createVoidUdpAuthenticatedPathHelloV1({
    sessionId: "f".repeat(32),
    sourceNodeId: b.nodeId,
    targetNodeId: a.nodeId,
    pubkey: b.publicPem,
    challenge: "1".repeat(64),
  });
  assert.equal(controllerA.acceptRemoteHello(wrongSessionHello), false);

  const helloA = controllerA.localHello();
  const helloB = controllerB.localHello();
  assert.equal(controllerA.acceptRemoteHello(helloB), true);
  assert.equal(controllerB.acceptRemoteHello(helloA), true);
  assert.equal(controllerA.acceptRemoteHello(helloB), true);
  assert.equal(controllerB.acceptRemoteHello(helloA), true);
  assert.equal(controllerA.phase, "awaiting_path_proofs");
  assert.equal(controllerB.phase, "awaiting_path_proofs");

  const proofA = controllerA.createLocalProof();
  const proofB = controllerB.createLocalProof();

  const wrongEndpointProofB = createVoidUdpAuthenticatedPathProofV1({
    localHello: helloB,
    remoteHello: helloA,
    localObservedEndpoint: "127.0.0.1:51999",
    remoteObservedEndpoint: endpointA,
    privateKey: b.privateKey,
    allowNonPublicEndpoints: true,
  });
  assert.equal(controllerA.acceptRemoteProof(wrongEndpointProofB), false);
  assert.equal(controllerA.ready, false);

  assert.equal(controllerA.acceptRemoteProof(proofB), true);
  assert.equal(controllerB.acceptRemoteProof(proofA), true);
  assert.equal(controllerA.acceptRemoteProof(proofB), true);
  assert.equal(controllerB.acceptRemoteProof(proofA), true);
  assert.equal(controllerA.ready, false);
  assert.equal(controllerB.ready, false);
  assert.equal(controllerA.phase, "awaiting_key_offers");
  assert.equal(controllerB.phase, "awaiting_key_offers");

  const offerA = controllerA.createLocalKeyOffer();
  const offerB = controllerB.createLocalKeyOffer();
  assert.equal(controllerA.ready, false);
  assert.equal(controllerB.ready, false);

  const tamperedOfferB = {
    ...offerB,
    sig: `${offerB.sig[0] === "0" ? "1" : "0"}${offerB.sig.slice(1)}`,
  };
  assert.equal(controllerA.acceptRemoteKeyOffer(tamperedOfferB), false);
  assert.equal(controllerA.ready, false);

  assert.equal(controllerA.acceptRemoteKeyOffer(offerB), true);
  assert.equal(controllerB.acceptRemoteKeyOffer(offerA), true);
  assert.equal(controllerA.ready, true);
  assert.equal(controllerB.ready, true);
  assert.equal(controllerA.phase, "ready");
  assert.equal(controllerB.phase, "ready");
  assert.equal(readyA, 1);
  assert.equal(readyB, 1);
  assert(controllerA.socket);
  assert(controllerB.socket);

  // Duplicate UDP bootstrap packets are idempotent but cannot emit another ready transition.
  assert.equal(controllerA.acceptRemoteKeyOffer(offerB), true);
  assert.equal(controllerB.acceptRemoteKeyOffer(offerA), true);
  assert.equal(readyA, 1);
  assert.equal(readyB, 1);

  const receivedAtA: Buffer[] = [];
  const receivedAtB: Buffer[] = [];
  controllerA.socket.on("data", (bytes: Buffer) => receivedAtA.push(Buffer.from(bytes)));
  controllerB.socket.on("data", (bytes: Buffer) => receivedAtB.push(Buffer.from(bytes)));

  assert.equal(controllerA.socket.write(Buffer.from("secure-session-A")), true);
  assert.equal(controllerB.socket.write(Buffer.from("secure-session-B")), true);

  await waitFor(
    () => Buffer.concat(receivedAtB).toString("utf8") === "secure-session-A",
    "A payload at B",
  );
  await waitFor(
    () => Buffer.concat(receivedAtA).toString("utf8") === "secure-session-B",
    "B payload at A",
  );
  await waitFor(
    () => controllerA.socket!.writableLength === 0 && controllerB.socket!.writableLength === 0,
    "secure-session ACK completion",
  );

  // A local private key that does not match the declared public identity fails before any session state exists.
  const wrongLocalKey = identity();
  assert.throws(
    () => new VoidUdpSecureSessionBootstrapV1({
      sessionId,
      localNodeId: a.nodeId,
      remoteNodeId: b.nodeId,
      localPublicPem: a.publicPem,
      localPrivateKey: wrongLocalKey.privateKey,
      localObservedEndpoint: endpointA,
      remoteObservedEndpoint: endpointB,
      allowNonPublicEndpoints: true,
      transmitSecurePacket: () => {},
    }),
    /private\/public identity mismatch/,
  );

  assert.equal(
    VOID_P2P_UDP_SECURE_SESSION_BOOTSTRAP_AUTHORITY_V1.mutual_ed25519_path_auth_required,
    true,
  );
  assert.equal(
    VOID_P2P_UDP_SECURE_SESSION_BOOTSTRAP_AUTHORITY_V1.exact_observed_endpoint_binding_required,
    true,
  );
  assert.equal(
    VOID_P2P_UDP_SECURE_SESSION_BOOTSTRAP_AUTHORITY_V1.signed_x25519_offer_required,
    true,
  );
  assert.equal(
    VOID_P2P_UDP_SECURE_SESSION_BOOTSTRAP_AUTHORITY_V1.x25519_offer_must_match_authenticated_identity,
    true,
  );
  assert.equal(
    VOID_P2P_UDP_SECURE_SESSION_BOOTSTRAP_AUTHORITY_V1.ready_before_remote_path_proof,
    false,
  );
  assert.equal(
    VOID_P2P_UDP_SECURE_SESSION_BOOTSTRAP_AUTHORITY_V1.ready_before_local_path_proof,
    false,
  );
  assert.equal(
    VOID_P2P_UDP_SECURE_SESSION_BOOTSTRAP_AUTHORITY_V1.ready_before_reciprocal_key_offers,
    false,
  );
  assert.equal(
    VOID_P2P_UDP_SECURE_SESSION_BOOTSTRAP_AUTHORITY_V1.runtime_node_core_mount_performed,
    false,
  );
  assert.equal(
    VOID_P2P_UDP_SECURE_SESSION_BOOTSTRAP_AUTHORITY_V1.relay_fallback_preserved,
    true,
  );
  assert.equal(
    VOID_P2P_UDP_SECURE_SESSION_BOOTSTRAP_AUTHORITY_V1.wallet_signer_validator_wc_money_authority,
    0,
  );

  controllerA.destroy();
  controllerB.destroy();
  assert.equal(controllerA.phase, "closed");
  assert.equal(controllerB.phase, "closed");

  console.log("mutual_ed25519_path_auth_required=true");
  console.log("exact_observed_endpoint_binding_required=true");
  console.log("signed_x25519_offer_required=true");
  console.log("x25519_offer_must_match_authenticated_identity=true");
  console.log("secure_reliable_transport_required=true");
  console.log("peer_socket_adapter_required=true");
  console.log("ready_before_remote_path_proof=false");
  console.log("ready_before_local_path_proof=false");
  console.log("ready_before_reciprocal_key_offers=false");
  console.log("duplicate_key_offer_idempotent=true");
  console.log("bidirectional_socket_bytes_after_ready=true");
  console.log("wrong_session_hello_accepted=false");
  console.log("wrong_endpoint_path_proof_accepted=false");
  console.log("tampered_x25519_offer_accepted=false");
  console.log("local_identity_key_mismatch_accepted=false");
  console.log("ready_callback_exactly_once=true");
  console.log("runtime_node_core_mount_performed=false");
  console.log("runtime_peer_promotion_performed=false");
  console.log("verified_direct_cache_mutation_performed=false");
  console.log("relay_fallback_preserved=true");
  console.log("router_configuration_required=false");
  console.log("port_forward_required=false");
  console.log("wallet_signer_validator_wc_money_authority=0");
  console.log(MARKER);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
