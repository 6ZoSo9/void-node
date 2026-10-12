// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025-2026 6ZoSo9

import assert from "node:assert/strict";
import * as crypto from "node:crypto";

import { deriveVoidNodeIdFromPublicPemV1 } from "../src/p2p/auth_v1.js";
import { VoidRelayServerStateV1 } from "../src/p2p/relay_v1.js";
import {
  createVoidUdpRendezvousProbeV1,
  type VoidUdpRendezvousProbeV1,
} from "../src/p2p/udp_rendezvous_v1.js";
import {
  VOID_P2P_UDP_SWARM_RELAY_BRIDGE_AUTHORITY_V1,
  VoidUdpSwarmRelayBridgeV1,
} from "../src/p2p/udp_swarm_relay_bridge_v1.js";

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

function upgradeRequest(
  requestId: string,
  streamId: string,
  targetNodeId: string,
) {
  return {
    type: "UDP_SWARM_UPGRADE_REQUEST" as const,
    protocol: 1 as const,
    request_id: requestId,
    stream_id: streamId,
    target_node_id: targetNodeId,
  };
}

function signedProbe(ticketId: string, claimed: Identity): VoidUdpRendezvousProbeV1 {
  return createVoidUdpRendezvousProbeV1({
    ticketId,
    nodeId: claimed.nodeId,
    privateKey: claimed.privateKey,
  });
}

function wrongKeyProbe(
  ticketId: string,
  claimedNodeId: string,
  wrongPrivateKey: crypto.KeyObject,
): VoidUdpRendezvousProbeV1 {
  return createVoidUdpRendezvousProbeV1({
    ticketId,
    nodeId: claimedNodeId,
    privateKey: wrongPrivateKey,
  });
}

async function main(): Promise<void> {
  const a = identity();
  const b = identity();
  const impostor = identity();
  const keys = new Map<string, string>([
    [a.nodeId, a.publicPem],
    [b.nodeId, b.publicPem],
  ]);

  const relayState = new VoidRelayServerStateV1();
  relayState.reserve(b.nodeId, 60_000, 10_000);
  const stream = relayState.openStream(a.nodeId, b.nodeId, 10_001);
  assert.equal(relayState.markReady(a.nodeId, stream.stream_id, 10_002).started_now, false);
  const started = relayState.markReady(b.nodeId, stream.stream_id, 10_003);
  assert.equal(started.started_now, true);
  assert.equal(started.stream.started, true);

  const bridge = new VoidUdpSwarmRelayBridgeV1(
    relayState,
    "127.0.0.1:4700",
    (nodeId) => keys.get(nodeId),
    true,
  );

  const requestId = "2".repeat(32);
  const request = upgradeRequest(requestId, stream.stream_id, b.nodeId);
  const opened = bridge.openAuthenticatedRequest({
    authenticatedRequesterNodeId: a.nodeId,
    message: request,
    nowMs: 10_010,
  });

  assert.equal(opened.session.stream_id, stream.stream_id);
  assert.equal(opened.session.source_node_id, a.nodeId);
  assert.equal(opened.session.target_node_id, b.nodeId);
  assert.equal(opened.ticket_deliveries.length, 2);

  const ticketA = opened.ticket_deliveries.find(
    (entry) => entry.recipient_node_id === a.nodeId,
  )?.message;
  const ticketB = opened.ticket_deliveries.find(
    (entry) => entry.recipient_node_id === b.nodeId,
  )?.message;
  assert(ticketA && ticketB);
  assert.equal(ticketA.peer_node_id, b.nodeId);
  assert.equal(ticketB.peer_node_id, a.nodeId);
  assert.equal(ticketA.stream_id, stream.stream_id);
  assert.equal(ticketB.stream_id, stream.stream_id);
  assert.equal(ticketA.relay_udp_endpoint, "127.0.0.1:4700");
  assert.equal(ticketB.relay_udp_endpoint, "127.0.0.1:4700");

  assert.throws(
    () => bridge.openAuthenticatedRequest({
      authenticatedRequesterNodeId: a.nodeId,
      message: request,
      nowMs: 10_011,
    }),
    /duplicate request ID/,
  );

  assert.throws(
    () => bridge.openAuthenticatedRequest({
      authenticatedRequesterNodeId: impostor.nodeId,
      message: upgradeRequest("3".repeat(32), stream.stream_id, b.nodeId),
      nowMs: 10_012,
    }),
    /requester is not a relay stream endpoint/,
  );

  assert.throws(
    () => bridge.openAuthenticatedRequest({
      authenticatedRequesterNodeId: a.nodeId,
      message: upgradeRequest("4".repeat(32), stream.stream_id, impostor.nodeId),
      nowMs: 10_013,
    }),
    /target does not match relay stream counterpart/,
  );

  const incompleteState = new VoidRelayServerStateV1();
  incompleteState.reserve(b.nodeId, 60_000, 20_000);
  const incompleteStream = incompleteState.openStream(a.nodeId, b.nodeId, 20_001);
  incompleteState.markReady(a.nodeId, incompleteStream.stream_id, 20_002);
  const incompleteBridge = new VoidUdpSwarmRelayBridgeV1(
    incompleteState,
    "127.0.0.1:4700",
    (nodeId) => keys.get(nodeId),
    true,
  );
  assert.throws(
    () => incompleteBridge.openAuthenticatedRequest({
      authenticatedRequesterNodeId: a.nodeId,
      message: upgradeRequest("5".repeat(32), incompleteStream.stream_id, b.nodeId),
      nowMs: 20_003,
    }),
    /active started relay stream/,
  );

  const missingKeyBridge = new VoidUdpSwarmRelayBridgeV1(
    relayState,
    "127.0.0.1:4700",
    (nodeId) => nodeId === a.nodeId ? a.publicPem : undefined,
    true,
  );
  assert.throws(
    () => missingKeyBridge.openAuthenticatedRequest({
      authenticatedRequesterNodeId: a.nodeId,
      message: upgradeRequest("6".repeat(32), stream.stream_id, b.nodeId),
      nowMs: 10_014,
    }),
    /authenticated public key missing/,
  );

  const wrongKeyBridge = new VoidUdpSwarmRelayBridgeV1(
    relayState,
    "127.0.0.1:4700",
    (nodeId) => nodeId === a.nodeId ? a.publicPem : impostor.publicPem,
    true,
  );
  assert.throws(
    () => wrongKeyBridge.openAuthenticatedRequest({
      authenticatedRequesterNodeId: a.nodeId,
      message: upgradeRequest("7".repeat(32), stream.stream_id, b.nodeId),
      nowMs: 10_015,
    }),
    /target identity\/public-key binding mismatch/,
  );

  assert.throws(
    () => bridge.observeRelayUdpProbe({
      packet: wrongKeyProbe(ticketA.ticket_id, a.nodeId, impostor.privateKey),
      remoteAddress: "127.0.0.1",
      remotePort: 51_001,
      nowMs: 10_020,
    }),
    /signature mismatch/,
  );

  const a1 = bridge.observeRelayUdpProbe({
    packet: signedProbe(ticketA.ticket_id, a),
    remoteAddress: "127.0.0.1",
    remotePort: 51_001,
    nowMs: 10_100,
  });
  assert.equal(a1.observation.stable_same_rendezvous, false);
  assert.equal(a1.offer_deliveries.length, 0);

  const b1 = bridge.observeRelayUdpProbe({
    packet: signedProbe(ticketB.ticket_id, b),
    remoteAddress: "127.0.0.1",
    remotePort: 51_002,
    nowMs: 10_110,
  });
  assert.equal(b1.observation.stable_same_rendezvous, false);
  assert.equal(b1.offer_deliveries.length, 0);

  const a2 = bridge.observeRelayUdpProbe({
    packet: signedProbe(ticketA.ticket_id, a),
    remoteAddress: "127.0.0.1",
    remotePort: 51_001,
    nowMs: 10_120,
  });
  assert.equal(a2.observation.stable_same_rendezvous, true);
  assert.equal(a2.offer_deliveries.length, 0);

  const b2 = bridge.observeRelayUdpProbe({
    packet: signedProbe(ticketB.ticket_id, b),
    remoteAddress: "127.0.0.1",
    remotePort: 51_002,
    nowMs: 10_130,
  });
  assert.equal(b2.observation.stable_same_rendezvous, true);
  assert.equal(b2.offer_deliveries.length, 2);

  const offerForA = b2.offer_deliveries.find(
    (entry) => entry.recipient_node_id === a.nodeId,
  )?.message;
  const offerForB = b2.offer_deliveries.find(
    (entry) => entry.recipient_node_id === b.nodeId,
  )?.message;
  assert(offerForA && offerForB);
  assert.equal(offerForA.peer_node_id, b.nodeId);
  assert.equal(offerForA.local_observed_endpoint, "127.0.0.1:51001");
  assert.equal(offerForA.peer_observed_endpoint, "127.0.0.1:51002");
  assert.equal(offerForB.peer_node_id, a.nodeId);
  assert.equal(offerForB.local_observed_endpoint, "127.0.0.1:51002");
  assert.equal(offerForB.peer_observed_endpoint, "127.0.0.1:51001");

  const snapshot = bridge.snapshot(10_131);
  assert.equal(snapshot.active_session_count, 1);
  assert.equal(snapshot.sessions[0]?.stream_id, stream.stream_id);
  assert.equal(JSON.stringify(snapshot).includes("BEGIN PUBLIC KEY"), false);

  const conflict = bridge.openAuthenticatedRequest({
    authenticatedRequesterNodeId: a.nodeId,
    message: upgradeRequest("8".repeat(32), stream.stream_id, b.nodeId),
    nowMs: 11_000,
  });
  const conflictTicketA = conflict.ticket_deliveries.find(
    (entry) => entry.recipient_node_id === a.nodeId,
  )?.message;
  assert(conflictTicketA);
  bridge.observeRelayUdpProbe({
    packet: signedProbe(conflictTicketA.ticket_id, a),
    remoteAddress: "127.0.0.1",
    remotePort: 52_001,
    nowMs: 11_010,
  });
  assert.throws(
    () => bridge.observeRelayUdpProbe({
      packet: signedProbe(conflictTicketA.ticket_id, a),
      remoteAddress: "127.0.0.1",
      remotePort: 52_099,
      nowMs: 11_020,
    }),
    /mapping changed/,
  );
  assert.equal(
    bridge.sessionFor(conflict.session.session_id, 11_021)?.offers_emitted,
    false,
  );

  const closeBound = bridge.openAuthenticatedRequest({
    authenticatedRequesterNodeId: a.nodeId,
    message: upgradeRequest("9".repeat(32), stream.stream_id, b.nodeId),
    nowMs: 12_000,
  });
  const closeTicketA = closeBound.ticket_deliveries.find(
    (entry) => entry.recipient_node_id === a.nodeId,
  )?.message;
  assert(closeTicketA);
  assert(relayState.closeStream(a.nodeId, stream.stream_id, 12_010));
  assert.throws(
    () => bridge.observeRelayUdpProbe({
      packet: signedProbe(closeTicketA.ticket_id, a),
      remoteAddress: "127.0.0.1",
      remotePort: 53_001,
      nowMs: 12_020,
    }),
    /no active relay-bound session|no longer active/,
  );
  assert.equal(bridge.sessionFor(closeBound.session.session_id, 12_021), undefined);

  assert.equal(VOID_P2P_UDP_SWARM_RELAY_BRIDGE_AUTHORITY_V1.authenticated_requester_required, true);
  assert.equal(VOID_P2P_UDP_SWARM_RELAY_BRIDGE_AUTHORITY_V1.started_relay_stream_required, true);
  assert.equal(VOID_P2P_UDP_SWARM_RELAY_BRIDGE_AUTHORITY_V1.relay_stream_counterpart_binding_required, true);
  assert.equal(VOID_P2P_UDP_SWARM_RELAY_BRIDGE_AUTHORITY_V1.verified_peer_public_key_lookup_required, true);
  assert.equal(VOID_P2P_UDP_SWARM_RELAY_BRIDGE_AUTHORITY_V1.key_id_binding_reverified_by_coordinator, true);
  assert.equal(VOID_P2P_UDP_SWARM_RELAY_BRIDGE_AUTHORITY_V1.signed_udp_mapping_probe_required, true);
  assert.equal(VOID_P2P_UDP_SWARM_RELAY_BRIDGE_AUTHORITY_V1.stable_mapping_both_endpoints_required_before_offer, true);
  assert.equal(VOID_P2P_UDP_SWARM_RELAY_BRIDGE_AUTHORITY_V1.relay_stream_must_remain_active_until_offer, true);
  assert.equal(VOID_P2P_UDP_SWARM_RELAY_BRIDGE_AUTHORITY_V1.duplicate_request_id_rejected, true);
  assert.equal(VOID_P2P_UDP_SWARM_RELAY_BRIDGE_AUTHORITY_V1.node_core_mount_performed, false);
  assert.equal(VOID_P2P_UDP_SWARM_RELAY_BRIDGE_AUTHORITY_V1.udp_socket_allocation_performed, false);
  assert.equal(VOID_P2P_UDP_SWARM_RELAY_BRIDGE_AUTHORITY_V1.direct_transport_activation_performed, false);
  assert.equal(VOID_P2P_UDP_SWARM_RELAY_BRIDGE_AUTHORITY_V1.relay_retirement_authorized, false);
  assert.equal(VOID_P2P_UDP_SWARM_RELAY_BRIDGE_AUTHORITY_V1.relay_fallback_preserved, true);
  assert.equal(VOID_P2P_UDP_SWARM_RELAY_BRIDGE_AUTHORITY_V1.router_configuration_required, false);
  assert.equal(VOID_P2P_UDP_SWARM_RELAY_BRIDGE_AUTHORITY_V1.port_forward_required, false);
  assert.equal(VOID_P2P_UDP_SWARM_RELAY_BRIDGE_AUTHORITY_V1.wallet_signer_validator_wc_money_authority, 0);

  console.log("authenticated_requester_required=true");
  console.log("started_relay_stream_required=true");
  console.log("relay_stream_counterpart_binding_required=true");
  console.log("verified_peer_public_key_lookup_required=true");
  console.log("key_id_binding_reverified_by_coordinator=true");
  console.log("duplicate_request_id_rejected=true");
  console.log("signed_udp_mapping_probe_required=true");
  console.log("wrong_key_mapping_probe_accepted=false");
  console.log("stable_mapping_both_endpoints_required_before_offer=true");
  console.log("mapping_conflict_offer_allowed=false");
  console.log("reciprocal_ticket_delivery_proven=true");
  console.log("reciprocal_upgrade_offer_delivery_proven=true");
  console.log("relay_stream_must_remain_active_until_offer=true");
  console.log("public_snapshot_exposes_peer_pem=false");
  console.log("node_core_mount_performed=false");
  console.log("udp_socket_allocation_performed=false");
  console.log("direct_transport_activation_performed=false");
  console.log("relay_retirement_authorized=false");
  console.log("relay_fallback_preserved=true");
  console.log("router_configuration_required=false");
  console.log("port_forward_required=false");
  console.log("wallet_signer_validator_wc_money_authority=0");
  console.log("VOID_P2P_AUTHENTICATED_RELAY_UDP_RENDEZVOUS_BRIDGE_V1_PROOF_GREEN");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
