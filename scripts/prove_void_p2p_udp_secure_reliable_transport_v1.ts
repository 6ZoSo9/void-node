import assert from "node:assert/strict";
import * as crypto from "node:crypto";
import * as dgram from "node:dgram";

import { deriveVoidNodeIdFromPublicPemV1 } from "../src/p2p/auth_v1.js";
import {
  VOID_P2P_UDP_SECURE_RELIABLE_AUTHORITY_V1,
  VOID_P2P_UDP_SECURE_RELIABLE_MAX_IN_FLIGHT_V1,
  VOID_P2P_UDP_SECURE_RELIABLE_MAX_RETRIES_V1,
  VOID_P2P_UDP_SECURE_RELIABLE_RECV_WINDOW_V1,
  VOID_P2P_UDP_SECURE_RELIABLE_RTO_MS_V1,
  VoidUdpSecureReliableReceiverV1,
  VoidUdpSecureReliableSenderV1,
  createVoidUdpSecureKeyOfferV1,
  decryptVoidUdpSecurePacketV1,
  deriveVoidUdpSecureDirectionKeysV1,
  encodeVoidUdpSecurePacketV1,
  verifyVoidUdpSecureKeyOfferV1,
} from "../src/p2p/udp_secure_reliable_transport_v1.js";

const MARKER = "VOID_P2P_UDP_SECURE_RELIABLE_TRANSPORT_V1_PROOF_GREEN";
const SESSION = "a".repeat(32);

function identity() {
  const { privateKey, publicKey } = crypto.generateKeyPairSync("ed25519");
  const pubPEM = publicKey.export({ type: "spki", format: "pem" }).toString();
  const nodeId = deriveVoidNodeIdFromPublicPemV1(pubPEM);
  assert(nodeId);
  return { privateKey, publicKey, pubPEM, nodeId };
}

function bind(socket: dgram.Socket): Promise<dgram.AddressInfo> {
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

function send(socket: dgram.Socket, bytes: Uint8Array, port: number): Promise<void> {
  return new Promise((resolve, reject) => {
    socket.send(bytes, port, "127.0.0.1", (error) => error ? reject(error) : resolve());
  });
}

async function main(): Promise<void> {
  const idA = identity();
  const idB = identity();
  const xA = crypto.generateKeyPairSync("x25519");
  const xB = crypto.generateKeyPairSync("x25519");

  const endpointA = "127.0.0.1:51001";
  const endpointB = "127.0.0.1:51002";

  const offerA = createVoidUdpSecureKeyOfferV1({
    sessionId: SESSION,
    sourceNodeId: idA.nodeId,
    targetNodeId: idB.nodeId,
    ed25519PublicPem: idA.pubPEM,
    ed25519PrivateKey: idA.privateKey,
    x25519PublicKey: xA.publicKey,
    sourceObservedEndpoint: endpointA,
    targetObservedEndpoint: endpointB,
    nonce: "1".repeat(32),
    allowNonPublicObservedEndpoint: true,
  });
  const offerB = createVoidUdpSecureKeyOfferV1({
    sessionId: SESSION,
    sourceNodeId: idB.nodeId,
    targetNodeId: idA.nodeId,
    ed25519PublicPem: idB.pubPEM,
    ed25519PrivateKey: idB.privateKey,
    x25519PublicKey: xB.publicKey,
    sourceObservedEndpoint: endpointB,
    targetObservedEndpoint: endpointA,
    nonce: "2".repeat(32),
    allowNonPublicObservedEndpoint: true,
  });

  const verifiedA = verifyVoidUdpSecureKeyOfferV1(offerA, {
    sessionId: SESSION,
    sourceNodeId: idA.nodeId,
    targetNodeId: idB.nodeId,
    sourceObservedEndpoint: endpointA,
    targetObservedEndpoint: endpointB,
    allowNonPublicObservedEndpoint: true,
  });
  const verifiedB = verifyVoidUdpSecureKeyOfferV1(offerB, {
    sessionId: SESSION,
    sourceNodeId: idB.nodeId,
    targetNodeId: idA.nodeId,
    sourceObservedEndpoint: endpointB,
    targetObservedEndpoint: endpointA,
    allowNonPublicObservedEndpoint: true,
  });
  assert(verifiedA && verifiedB);

  const tamperedOffer = { ...offerA, sig: `${offerA.sig[0] === "0" ? "1" : "0"}${offerA.sig.slice(1)}` };
  assert.equal(verifyVoidUdpSecureKeyOfferV1(tamperedOffer, {
    sessionId: SESSION,
    sourceNodeId: idA.nodeId,
    targetNodeId: idB.nodeId,
    sourceObservedEndpoint: endpointA,
    targetObservedEndpoint: endpointB,
    allowNonPublicObservedEndpoint: true,
  }), undefined);

  const endpointSubstitution = { ...offerA, source_observed_endpoint: "127.0.0.1:51999" };
  assert.equal(verifyVoidUdpSecureKeyOfferV1(endpointSubstitution, {
    sessionId: SESSION,
    sourceNodeId: idA.nodeId,
    targetNodeId: idB.nodeId,
    sourceObservedEndpoint: "127.0.0.1:51999",
    targetObservedEndpoint: endpointB,
    allowNonPublicObservedEndpoint: true,
  }), undefined);

  const keysA = deriveVoidUdpSecureDirectionKeysV1({
    localX25519PrivateKey: xA.privateKey,
    localOffer: verifiedA,
    remoteOffer: verifiedB,
  });
  const keysB = deriveVoidUdpSecureDirectionKeysV1({
    localX25519PrivateKey: xB.privateKey,
    localOffer: verifiedB,
    remoteOffer: verifiedA,
  });
  assert(keysA.send_key.equals(keysB.recv_key));
  assert(keysA.recv_key.equals(keysB.send_key));
  assert(keysA.send_nonce_prefix.equals(keysB.recv_nonce_prefix));
  assert(keysA.recv_nonce_prefix.equals(keysB.send_nonce_prefix));
  assert(!keysA.send_key.equals(keysA.recv_key));

  const wrongX = crypto.generateKeyPairSync("x25519");
  assert.throws(() => deriveVoidUdpSecureDirectionKeysV1({
    localX25519PrivateKey: wrongX.privateKey,
    localOffer: verifiedA,
    remoteOffer: verifiedB,
  }));

  const senderA = new VoidUdpSecureReliableSenderV1(keysA);
  const receiverB = new VoidUdpSecureReliableReceiverV1(keysB);

  const p0 = senderA.createData(Buffer.from("zero"), -1, 0);
  const p1 = senderA.createData(Buffer.from("one"), -1, 0);
  const p2 = senderA.createData(Buffer.from("two"), -1, 0);

  const outOfOrder = receiverB.receive(p1);
  assert.equal(outOfOrder.accepted, true);
  assert.equal(outOfOrder.delivered.length, 0);
  assert.equal(outOfOrder.ack_seq, -1);
  assert.equal(receiverB.bufferedCount(), 1);

  const closesGap = receiverB.receive(p0);
  assert.deepEqual(closesGap.delivered.map((b) => b.toString()), ["zero", "one"]);
  assert.equal(closesGap.ack_seq, 1);
  assert.equal(receiverB.bufferedCount(), 0);

  const replay = receiverB.receive(p1);
  assert.equal(replay.accepted, false);
  assert.equal(replay.replay, true);

  const tamperedCipher = Buffer.from(p2.ciphertext_b64, "base64");
  tamperedCipher[0] ^= 0x01;
  assert.equal(decryptVoidUdpSecurePacketV1({
    ...p2,
    ciphertext_b64: tamperedCipher.toString("base64"),
  }, keysB), undefined);

  assert.equal(senderA.acknowledge(1), 2);
  const notDue = senderA.retransmitDue(1, VOID_P2P_UDP_SECURE_RELIABLE_RTO_MS_V1 - 1);
  assert.equal(notDue.packets.length, 0);
  const due = senderA.retransmitDue(1, VOID_P2P_UDP_SECURE_RELIABLE_RTO_MS_V1);
  assert.equal(due.packets.length, 1);
  assert.notEqual(due.packets[0].packet_no, p2.packet_no);
  assert.equal(due.packets[0].data_seq, p2.data_seq);

  const recovered = receiverB.receive(due.packets[0]);
  assert.deepEqual(recovered.delivered.map((b) => b.toString()), ["two"]);
  assert.equal(recovered.ack_seq, 2);

  const senderB = new VoidUdpSecureReliableSenderV1(keysB);
  const receiverA = new VoidUdpSecureReliableReceiverV1(keysA);
  const ackPacket = senderB.createAck(2);
  const ackResult = receiverA.receive(ackPacket);
  assert.equal(ackResult.accepted, true);
  assert.equal(ackResult.peer_ack_seq, 2);
  assert.equal(ackResult.delivered.length, 0);
  assert.equal(senderA.acknowledge(ackResult.peer_ack_seq), 1);
  assert.equal(senderA.pendingCount(), 0);

  const farPacket = encodeVoidUdpSecurePacketV1({
    keys: keysA,
    kind: "data",
    packetNo: 100,
    dataSeq: VOID_P2P_UDP_SECURE_RELIABLE_RECV_WINDOW_V1 + 100,
    ackSeq: -1,
    plaintext: Buffer.from("too-far"),
  });
  const farResult = receiverB.receive(farPacket);
  assert.equal(farResult.accepted, false);

  const boundedSender = new VoidUdpSecureReliableSenderV1(keysA);
  for (let i = 0; i < VOID_P2P_UDP_SECURE_RELIABLE_MAX_IN_FLIGHT_V1; i += 1) {
    boundedSender.createData(Buffer.from(`m-${i}`), -1, 0);
  }
  assert.throws(() => boundedSender.createData(Buffer.from("overflow"), -1, 0));

  const exhaustedSender = new VoidUdpSecureReliableSenderV1(keysA);
  exhaustedSender.createData(Buffer.from("eventually-hold"), -1, 0);
  let exhausted: readonly number[] = [];
  for (let retry = 1; retry <= VOID_P2P_UDP_SECURE_RELIABLE_MAX_RETRIES_V1 + 1; retry += 1) {
    const result = exhaustedSender.retransmitDue(
      -1,
      retry * VOID_P2P_UDP_SECURE_RELIABLE_RTO_MS_V1,
    );
    exhausted = result.exhausted_data_seqs;
  }
  assert.deepEqual(exhausted, [0]);
  assert.equal(exhaustedSender.pendingCount(), 0);

  const socketA = dgram.createSocket("udp4");
  const socketB = dgram.createSocket("udp4");
  try {
    const [addrA, addrB] = await Promise.all([bind(socketA), bind(socketB)]);
    const wireSender = new VoidUdpSecureReliableSenderV1(keysA);
    const wireReceiver = new VoidUdpSecureReliableReceiverV1(keysB);
    const packet = wireSender.createData(Buffer.from("encrypted-wire-payload"), -1, 10_000);
    const wireReceived = new Promise<string>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("secure UDP wire proof timed out")), 2_000);
      socketB.once("message", (bytes) => {
        try {
          const parsed = JSON.parse(bytes.toString("utf8"));
          const result = wireReceiver.receive(parsed);
          assert.equal(result.accepted, true);
          assert.equal(result.delivered.length, 1);
          clearTimeout(timer);
          resolve(result.delivered[0].toString());
        } catch (error) {
          clearTimeout(timer);
          reject(error);
        }
      });
    });
    await send(socketA, Buffer.from(JSON.stringify(packet)), addrB.port);
    assert.equal(await wireReceived, "encrypted-wire-payload");
    assert(addrA.port > 0 && addrB.port > 0);
  } finally {
    socketA.close();
    socketB.close();
  }

  assert.equal(VOID_P2P_UDP_SECURE_RELIABLE_AUTHORITY_V1.x25519_ephemeral_key_agreement_required, true);
  assert.equal(VOID_P2P_UDP_SECURE_RELIABLE_AUTHORITY_V1.x25519_offer_ed25519_bound, true);
  assert.equal(VOID_P2P_UDP_SECURE_RELIABLE_AUTHORITY_V1.aes_256_gcm_payload_protection, true);
  assert.equal(VOID_P2P_UDP_SECURE_RELIABLE_AUTHORITY_V1.ordered_delivery_supported, true);
  assert.equal(VOID_P2P_UDP_SECURE_RELIABLE_AUTHORITY_V1.bounded_retransmission_supported, true);
  assert.equal(VOID_P2P_UDP_SECURE_RELIABLE_AUTHORITY_V1.packet_replay_rejected, true);
  assert.equal(VOID_P2P_UDP_SECURE_RELIABLE_AUTHORITY_V1.unbounded_retry_allowed, false);
  assert.equal(VOID_P2P_UDP_SECURE_RELIABLE_AUTHORITY_V1.congestion_control_claimed, false);
  assert.equal(VOID_P2P_UDP_SECURE_RELIABLE_AUTHORITY_V1.runtime_peer_promotion_performed, false);
  assert.equal(VOID_P2P_UDP_SECURE_RELIABLE_AUTHORITY_V1.verified_direct_cache_mutation_performed, false);
  assert.equal(VOID_P2P_UDP_SECURE_RELIABLE_AUTHORITY_V1.relay_fallback_preserved, true);
  assert.equal(VOID_P2P_UDP_SECURE_RELIABLE_AUTHORITY_V1.router_configuration_required, false);
  assert.equal(VOID_P2P_UDP_SECURE_RELIABLE_AUTHORITY_V1.port_forward_required, false);
  assert.equal(VOID_P2P_UDP_SECURE_RELIABLE_AUTHORITY_V1.wallet_signer_validator_wc_money_authority, 0);

  console.log("real_udp_secure_payload_exchange_proven=true");
  console.log("x25519_ephemeral_key_agreement_required=true");
  console.log("x25519_offer_ed25519_bound=true");
  console.log("aes_256_gcm_payload_confidentiality_integrity=true");
  console.log("tampered_ciphertext_accepted=false");
  console.log("packet_replay_accepted=false");
  console.log("out_of_order_delivery_reordered_correctly=true");
  console.log("dropped_packet_retransmission_recovered=true");
  console.log("encrypted_ack_supported=true");
  console.log("send_window_bounded=true");
  console.log("receive_window_bounded=true");
  console.log("retransmission_retry_limit_bounded=true");
  console.log("unbounded_retry_allowed=false");
  console.log("congestion_control_claimed=false");
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
