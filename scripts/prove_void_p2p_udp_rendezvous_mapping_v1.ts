// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025-2026 6ZoSo9

import assert from "node:assert/strict";
import * as crypto from "node:crypto";

import { deriveVoidNodeIdFromPublicPemV1 } from "../src/p2p/auth_v1.js";
import {
  VOID_P2P_UDP_RENDEZVOUS_AUTHORITY_V1,
  VOID_P2P_UDP_RENDEZVOUS_MAX_PACKET_BYTES_V1,
  VoidUdpRendezvousStateV1,
  createVoidUdpRendezvousProbeV1,
  decodeVoidUdpRendezvousProbeV1,
  encodeVoidUdpRendezvousProbeV1,
  normalizeVoidUdpRendezvousProbeV1,
  voidUdpRendezvousProbeTranscriptV1,
} from "../src/p2p/udp_rendezvous_v1.js";

const MARKER = "VOID_P2P_UDP_RENDEZVOUS_MAPPING_V1_PROOF_GREEN";

function keypair() {
  const { privateKey, publicKey } = crypto.generateKeyPairSync("ed25519");
  const pubPEM = publicKey.export({ type: "spki", format: "pem" }).toString();
  const nodeId = deriveVoidNodeIdFromPublicPemV1(pubPEM);
  assert(nodeId);
  return { privateKey, publicKey, pubPEM, nodeId };
}

const alice = keypair();
const impostor = keypair();
const now = 1_786_128_000_000;

const state = new VoidUdpRendezvousStateV1(true);
const ticket = state.issueAuthenticatedTicket({
  authenticatedNodeId: alice.nodeId,
  authenticatedPublicPem: alice.pubPEM,
  ttlMs: 10_000,
  nowMs: now,
});

assert.equal(ticket.node_id, alice.nodeId);
assert.equal(ticket.issued_at_ms, now);
assert.equal(ticket.expires_at_ms, now + 10_000);
assert.match(ticket.ticket_id, /^[0-9a-f]{32}$/);

const nonceA = "1".repeat(32);
const probeA = createVoidUdpRendezvousProbeV1({
  ticketId: ticket.ticket_id,
  nodeId: alice.nodeId,
  privateKey: alice.privateKey,
  nonce: nonceA,
});

const encodedA = encodeVoidUdpRendezvousProbeV1(probeA);
assert(encodedA.length <= VOID_P2P_UDP_RENDEZVOUS_MAX_PACKET_BYTES_V1);
assert.deepEqual(decodeVoidUdpRendezvousProbeV1(encodedA), probeA);

const transcript = voidUdpRendezvousProbeTranscriptV1({
  ticketId: ticket.ticket_id,
  nodeId: alice.nodeId,
  nonce: nonceA,
});
assert.equal(
  crypto.verify(null, transcript, alice.publicKey, Buffer.from(probeA.signature, "hex")),
  true,
);

const first = state.observeProbe({
  packet: probeA,
  remoteAddress: "127.0.0.1",
  remotePort: 41_700,
  nowMs: now + 100,
});
assert.equal(first.node_id, alice.nodeId);
assert.equal(first.observed_endpoint, "127.0.0.1:41700");
assert.equal(first.probe_count, 1);
assert.equal(first.stable_same_rendezvous, false);
assert.equal(first.mapping_conflicted, false);

const probeB = createVoidUdpRendezvousProbeV1({
  ticketId: ticket.ticket_id,
  nodeId: alice.nodeId,
  privateKey: alice.privateKey,
  nonce: "2".repeat(32),
});
const second = state.observeProbe({
  packet: probeB,
  remoteAddress: "127.0.0.1",
  remotePort: 41_700,
  nowMs: now + 200,
});
assert.equal(second.probe_count, 2);
assert.equal(second.stable_same_rendezvous, true);
assert.equal(second.mapping_conflicted, false);

assert.throws(
  () => state.observeProbe({
    packet: probeA,
    remoteAddress: "127.0.0.1",
    remotePort: 41_700,
    nowMs: now + 300,
  }),
  /replay rejected/,
);

const wrongSignature = createVoidUdpRendezvousProbeV1({
  ticketId: ticket.ticket_id,
  nodeId: alice.nodeId,
  privateKey: impostor.privateKey,
  nonce: "3".repeat(32),
});
assert.throws(
  () => state.observeProbe({
    packet: wrongSignature,
    remoteAddress: "127.0.0.1",
    remotePort: 41_700,
    nowMs: now + 400,
  }),
  /signature mismatch/,
);

const changedMappingProbe = createVoidUdpRendezvousProbeV1({
  ticketId: ticket.ticket_id,
  nodeId: alice.nodeId,
  privateKey: alice.privateKey,
  nonce: "4".repeat(32),
});
assert.throws(
  () => state.observeProbe({
    packet: changedMappingProbe,
    remoteAddress: "127.0.0.1",
    remotePort: 41_701,
    nowMs: now + 500,
  }),
  /mapping changed within one ticket/,
);
const conflicted = state.snapshot(now + 501).observations[0];
assert(conflicted);
assert.equal(conflicted.mapping_conflicted, true);
assert.equal(conflicted.stable_same_rendezvous, false);

const productionState = new VoidUdpRendezvousStateV1(false);
const productionTicket = productionState.issueAuthenticatedTicket({
  authenticatedNodeId: alice.nodeId,
  authenticatedPublicPem: alice.pubPEM,
  ttlMs: 5_000,
  nowMs: now,
});
const privateEndpointProbe = createVoidUdpRendezvousProbeV1({
  ticketId: productionTicket.ticket_id,
  nodeId: alice.nodeId,
  privateKey: alice.privateKey,
  nonce: "5".repeat(32),
});
assert.throws(
  () => productionState.observeProbe({
    packet: privateEndpointProbe,
    remoteAddress: "127.0.0.1",
    remotePort: 47_000,
    nowMs: now + 1,
  }),
  /observed endpoint is not eligible/,
);

const expiredState = new VoidUdpRendezvousStateV1(true);
const expiredTicket = expiredState.issueAuthenticatedTicket({
  authenticatedNodeId: alice.nodeId,
  authenticatedPublicPem: alice.pubPEM,
  ttlMs: 1_000,
  nowMs: now,
});
const expiredProbe = createVoidUdpRendezvousProbeV1({
  ticketId: expiredTicket.ticket_id,
  nodeId: alice.nodeId,
  privateKey: alice.privateKey,
  nonce: "6".repeat(32),
});
assert.throws(
  () => expiredState.observeProbe({
    packet: expiredProbe,
    remoteAddress: "127.0.0.1",
    remotePort: 47_000,
    nowMs: now + 1_001,
  }),
  /ticket is missing or expired/,
);

assert.throws(
  () => new VoidUdpRendezvousStateV1(true).issueAuthenticatedTicket({
    authenticatedNodeId: alice.nodeId,
    authenticatedPublicPem: impostor.pubPEM,
    nowMs: now,
  }),
  /node ID\/public-key binding mismatch/,
);

assert.equal(normalizeVoidUdpRendezvousProbeV1({ ...probeA, extra: true }), undefined);
assert.equal(decodeVoidUdpRendezvousProbeV1(Buffer.from("not-json")), undefined);
assert.equal(
  decodeVoidUdpRendezvousProbeV1(
    Buffer.alloc(VOID_P2P_UDP_RENDEZVOUS_MAX_PACKET_BYTES_V1 + 1),
  ),
  undefined,
);

assert.equal(
  VOID_P2P_UDP_RENDEZVOUS_AUTHORITY_V1.ticket_issued_only_after_authenticated_control_session,
  true,
);
assert.equal(VOID_P2P_UDP_RENDEZVOUS_AUTHORITY_V1.ticket_defines_node_identity, false);
assert.equal(VOID_P2P_UDP_RENDEZVOUS_AUTHORITY_V1.observed_endpoint_defines_node_identity, false);
assert.equal(
  VOID_P2P_UDP_RENDEZVOUS_AUTHORITY_V1.udp_probe_replaces_normal_peer_authentication,
  false,
);
assert.equal(
  VOID_P2P_UDP_RENDEZVOUS_AUTHORITY_V1.cross_rendezvous_mapping_stability_required_for_direct_confidence,
  true,
);
assert.equal(VOID_P2P_UDP_RENDEZVOUS_AUTHORITY_V1.router_configuration_required, false);
assert.equal(VOID_P2P_UDP_RENDEZVOUS_AUTHORITY_V1.port_forward_required, false);
assert.equal(VOID_P2P_UDP_RENDEZVOUS_AUTHORITY_V1.relay_fallback_preserved, true);
assert.equal(VOID_P2P_UDP_RENDEZVOUS_AUTHORITY_V1.direct_public_nat_traversal_claimed, false);
assert.equal(VOID_P2P_UDP_RENDEZVOUS_AUTHORITY_V1.runtime_integration_performed, false);
assert.equal(VOID_P2P_UDP_RENDEZVOUS_AUTHORITY_V1.wallet_signer_validator_wc_money_authority, 0);

console.log(MARKER);
console.log("authenticated_control_ticket_required=true");
console.log("ticket_node_id_public_key_binding_required=true");
console.log("udp_probe_signature_required=true");
console.log("udp_probe_replay_accepted=false");
console.log("wrong_key_udp_probe_accepted=false");
console.log("private_observed_endpoint_production_accepted=false");
console.log("same_rendezvous_mapping_repeat_stable=true");
console.log("same_ticket_mapping_change_accepted=false");
console.log("cross_rendezvous_mapping_stability_required=true");
console.log("observed_endpoint_defines_node_identity=false");
console.log("normal_void_peer_auth_still_required=true");
console.log("router_configuration_required=false");
console.log("port_forward_required=false");
console.log("relay_fallback_preserved=true");
console.log("direct_public_nat_traversal_claimed=false");
console.log("runtime_integration_performed=false");
console.log("wallet_signer_validator_wc_money_authority=0");
