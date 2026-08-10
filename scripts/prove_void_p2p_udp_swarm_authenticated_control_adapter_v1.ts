// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025-2026 6ZoSo9

import assert from "node:assert/strict";
import * as crypto from "node:crypto";

import { deriveVoidNodeIdFromPublicPemV1 } from "../src/p2p/auth_v1.js";
import { VoidRelayServerStateV1 } from "../src/p2p/relay_v1.js";
import {
  VOID_P2P_UDP_SWARM_AUTHENTICATED_CONTROL_ADAPTER_AUTHORITY_V1,
  VoidUdpSwarmAuthenticatedControlAdapterV1,
} from "../src/p2p/udp_swarm_authenticated_control_adapter_v1.js";
import { VoidUdpSwarmRelayBridgeV1 } from "../src/p2p/udp_swarm_relay_bridge_v1.js";

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

async function main(): Promise<void> {
  const a = identity();
  const b = identity();
  const relay = identity();
  const impostor = identity();

  const relayState = new VoidRelayServerStateV1();
  relayState.reserve(b.nodeId, 60_000, 10_000);
  const stream = relayState.openStream(a.nodeId, b.nodeId, 10_001);
  relayState.markReady(a.nodeId, stream.stream_id, 10_002);
  assert.equal(
    relayState.markReady(b.nodeId, stream.stream_id, 10_003).started_now,
    true,
  );

  const authenticatedPem = new Map<string, string>([
    [a.nodeId, a.publicPem],
    [b.nodeId, b.publicPem],
  ]);
  const bridge = new VoidUdpSwarmRelayBridgeV1(
    relayState,
    "127.0.0.1:4700",
    (nodeId) => authenticatedPem.get(nodeId),
    true,
  );

  const hasStartedRelayStream = (
    localPeerNodeId: string,
    relayNodeId: string,
    peerNodeId: string,
    streamId: string,
  ) => {
    if (relayNodeId !== relay.nodeId) return false;
    const expectedPeer = localPeerNodeId === a.nodeId ? b.nodeId : a.nodeId;
    if (peerNodeId !== expectedPeer) return false;
    return relayState.snapshot(10_050).streams.some(
      (entry) => entry.stream_id === streamId && entry.started,
    );
  };

  const adapterA = new VoidUdpSwarmAuthenticatedControlAdapterV1({
    localNodeId: a.nodeId,
    localPublicPem: a.publicPem,
    localPrivateKey: a.privateKey,
    isStartedRelayClientStream: (relayNodeId, peerNodeId, streamId) =>
      hasStartedRelayStream(a.nodeId, relayNodeId, peerNodeId, streamId),
    allowNonPublicEndpoint: true,
  });
  const adapterB = new VoidUdpSwarmAuthenticatedControlAdapterV1({
    localNodeId: b.nodeId,
    localPublicPem: b.publicPem,
    localPrivateKey: b.privateKey,
    isStartedRelayClientStream: (relayNodeId, peerNodeId, streamId) =>
      hasStartedRelayStream(b.nodeId, relayNodeId, peerNodeId, streamId),
    allowNonPublicEndpoint: true,
  });
  const relayAdapter = new VoidUdpSwarmAuthenticatedControlAdapterV1({
    localNodeId: relay.nodeId,
    localPublicPem: relay.publicPem,
    localPrivateKey: relay.privateKey,
    isStartedRelayClientStream: () => false,
    relayBridge: bridge,
    allowNonPublicEndpoint: true,
  });

  const started = adapterA.beginUpgrade({
    relayNodeId: relay.nodeId,
    targetNodeId: b.nodeId,
    streamId: stream.stream_id,
    nowMs: 10_020,
  });
  assert.equal(started.control_delivery.recipient_node_id, relay.nodeId);
  assert.equal(started.control_delivery.message.type, "UDP_SWARM_UPGRADE_REQUEST");

  const relayTickets = relayAdapter.handleAuthenticatedControl({
    fromNodeId: a.nodeId,
    message: started.control_delivery.message,
    nowMs: 10_021,
  });
  assert.equal(relayTickets.control_deliveries.length, 2);
  assert.equal(relayTickets.udp_probe_actions.length, 0);

  const ticketDeliveryA = relayTickets.control_deliveries.find(
    (entry) => entry.recipient_node_id === a.nodeId,
  );
  const ticketDeliveryB = relayTickets.control_deliveries.find(
    (entry) => entry.recipient_node_id === b.nodeId,
  );
  assert(ticketDeliveryA && ticketDeliveryB);
  assert.equal(ticketDeliveryA.message.type, "UDP_SWARM_RENDEZVOUS_TICKET");
  assert.equal(ticketDeliveryB.message.type, "UDP_SWARM_RENDEZVOUS_TICKET");

  const aTicketResult = adapterA.handleAuthenticatedControl({
    fromNodeId: relay.nodeId,
    message: ticketDeliveryA.message,
    nowMs: 10_030,
  });
  const bTicketResult = adapterB.handleAuthenticatedControl({
    fromNodeId: relay.nodeId,
    message: ticketDeliveryB.message,
    nowMs: 10_031,
  });
  assert.equal(aTicketResult.udp_probe_actions.length, 2);
  assert.equal(bTicketResult.udp_probe_actions.length, 2);
  assert.notEqual(
    aTicketResult.udp_probe_actions[0]?.packet.nonce,
    aTicketResult.udp_probe_actions[1]?.packet.nonce,
  );
  assert.notEqual(
    bTicketResult.udp_probe_actions[0]?.packet.nonce,
    bTicketResult.udp_probe_actions[1]?.packet.nonce,
  );
  for (const action of [...aTicketResult.udp_probe_actions, ...bTicketResult.udp_probe_actions]) {
    assert.equal(action.relay_node_id, relay.nodeId);
    assert.equal(action.relay_udp_endpoint, "127.0.0.1:4700");
    assert.equal(action.stream_id, stream.stream_id);
  }

  const aProbe1 = relayAdapter.handleRelayUdpProbe({
    packet: aTicketResult.udp_probe_actions[0]?.packet,
    remoteAddress: "127.0.0.1",
    remotePort: 51_001,
    nowMs: 10_100,
  });
  assert.equal(aProbe1.observation.stable_same_rendezvous, false);
  assert.equal(aProbe1.control_deliveries.length, 0);

  const bProbe1 = relayAdapter.handleRelayUdpProbe({
    packet: bTicketResult.udp_probe_actions[0]?.packet,
    remoteAddress: "127.0.0.1",
    remotePort: 51_002,
    nowMs: 10_110,
  });
  assert.equal(bProbe1.observation.stable_same_rendezvous, false);
  assert.equal(bProbe1.control_deliveries.length, 0);

  const aProbe2 = relayAdapter.handleRelayUdpProbe({
    packet: aTicketResult.udp_probe_actions[1]?.packet,
    remoteAddress: "127.0.0.1",
    remotePort: 51_001,
    nowMs: 10_120,
  });
  assert.equal(aProbe2.observation.stable_same_rendezvous, true);
  assert.equal(aProbe2.control_deliveries.length, 0);

  const bProbe2 = relayAdapter.handleRelayUdpProbe({
    packet: bTicketResult.udp_probe_actions[1]?.packet,
    remoteAddress: "127.0.0.1",
    remotePort: 51_002,
    nowMs: 10_130,
  });
  assert.equal(bProbe2.observation.stable_same_rendezvous, true);
  assert.equal(bProbe2.control_deliveries.length, 2);

  const offerDeliveryA = bProbe2.control_deliveries.find(
    (entry) => entry.recipient_node_id === a.nodeId,
  );
  const offerDeliveryB = bProbe2.control_deliveries.find(
    (entry) => entry.recipient_node_id === b.nodeId,
  );
  assert(offerDeliveryA && offerDeliveryB);
  assert.equal(offerDeliveryA.message.type, "UDP_SWARM_UPGRADE_OFFER");
  assert.equal(offerDeliveryB.message.type, "UDP_SWARM_UPGRADE_OFFER");

  const directA = adapterA.handleAuthenticatedControl({
    fromNodeId: relay.nodeId,
    message: offerDeliveryA.message,
    nowMs: 10_131,
  });
  const directB = adapterB.handleAuthenticatedControl({
    fromNodeId: relay.nodeId,
    message: offerDeliveryB.message,
    nowMs: 10_132,
  });
  assert(directA.direct_upgrade_offer);
  assert(directB.direct_upgrade_offer);
  assert.equal(directA.direct_upgrade_offer.relay_node_id, relay.nodeId);
  assert.equal(directB.direct_upgrade_offer.relay_node_id, relay.nodeId);
  assert.equal(directA.direct_upgrade_offer.message.peer_node_id, b.nodeId);
  assert.equal(directB.direct_upgrade_offer.message.peer_node_id, a.nodeId);
  assert.equal(directA.direct_upgrade_offer.message.local_observed_endpoint, "127.0.0.1:51001");
  assert.equal(directA.direct_upgrade_offer.message.peer_observed_endpoint, "127.0.0.1:51002");
  assert.equal(directB.direct_upgrade_offer.message.local_observed_endpoint, "127.0.0.1:51002");
  assert.equal(directB.direct_upgrade_offer.message.peer_observed_endpoint, "127.0.0.1:51001");

  const snapshotA = adapterA.snapshot(10_133);
  const snapshotB = adapterB.snapshot(10_133);
  assert.equal(snapshotA.pending_request_count, 0);
  assert.equal(snapshotA.active_route_count, 1);
  assert.equal(snapshotA.active_routes[0]?.offer_received, true);
  assert.equal(snapshotB.active_route_count, 1);
  assert.equal(snapshotB.active_routes[0]?.offer_received, true);
  assert.equal(JSON.stringify(snapshotA).includes("BEGIN PUBLIC KEY"), false);
  assert.equal(JSON.stringify(snapshotB).includes("BEGIN PUBLIC KEY"), false);

  assert.throws(
    () => adapterA.handleAuthenticatedControl({
      fromNodeId: impostor.nodeId,
      message: ticketDeliveryA.message,
      nowMs: 10_140,
    }),
    /started local relay stream|duplicate rendezvous ticket/,
  );
  assert.throws(
    () => adapterA.handleAuthenticatedControl({
      fromNodeId: impostor.nodeId,
      message: offerDeliveryA.message,
      nowMs: 10_141,
    }),
    /offer route binding mismatch/,
  );

  const noStreamAdapter = new VoidUdpSwarmAuthenticatedControlAdapterV1({
    localNodeId: a.nodeId,
    localPublicPem: a.publicPem,
    localPrivateKey: a.privateKey,
    isStartedRelayClientStream: () => false,
    allowNonPublicEndpoint: true,
  });
  assert.throws(
    () => noStreamAdapter.beginUpgrade({
      relayNodeId: relay.nodeId,
      targetNodeId: b.nodeId,
      streamId: stream.stream_id,
      nowMs: 10_150,
    }),
    /started local relay stream/,
  );

  const rejectAdapter = new VoidUdpSwarmAuthenticatedControlAdapterV1({
    localNodeId: a.nodeId,
    localPublicPem: a.publicPem,
    localPrivateKey: a.privateKey,
    isStartedRelayClientStream: (relayNodeId, peerNodeId, streamId) =>
      hasStartedRelayStream(a.nodeId, relayNodeId, peerNodeId, streamId),
    allowNonPublicEndpoint: true,
  });
  const rejectPending = rejectAdapter.beginUpgrade({
    relayNodeId: relay.nodeId,
    targetNodeId: b.nodeId,
    streamId: stream.stream_id,
    nowMs: 10_160,
  });
  const rejected = rejectAdapter.handleAuthenticatedControl({
    fromNodeId: relay.nodeId,
    message: {
      type: "UDP_SWARM_UPGRADE_REJECT",
      protocol: 1,
      request_id: rejectPending.request_id,
      reason: "bounded test rejection",
    },
    nowMs: 10_161,
  });
  assert.equal(rejected.relay_reject?.reason, "bounded test rejection");
  assert.equal(rejectAdapter.snapshot(10_162).pending_request_count, 0);

  assert(relayState.closeStream(a.nodeId, stream.stream_id, 10_200));
  assert.equal(adapterA.snapshot(10_201).active_route_count, 0);
  assert.equal(adapterB.snapshot(10_201).active_route_count, 0);

  assert.throws(
    () => new VoidUdpSwarmAuthenticatedControlAdapterV1({
      localNodeId: a.nodeId,
      localPublicPem: a.publicPem,
      localPrivateKey: impostor.privateKey,
      isStartedRelayClientStream: () => false,
      allowNonPublicEndpoint: true,
    }),
    /private\/public key mismatch/,
  );

  assert.equal(VOID_P2P_UDP_SWARM_AUTHENTICATED_CONTROL_ADAPTER_AUTHORITY_V1.authenticated_control_sender_required, true);
  assert.equal(VOID_P2P_UDP_SWARM_AUTHENTICATED_CONTROL_ADAPTER_AUTHORITY_V1.started_local_relay_stream_required, true);
  assert.equal(VOID_P2P_UDP_SWARM_AUTHENTICATED_CONTROL_ADAPTER_AUTHORITY_V1.relay_bridge_required_for_relay_request, true);
  assert.equal(VOID_P2P_UDP_SWARM_AUTHENTICATED_CONTROL_ADAPTER_AUTHORITY_V1.ticket_relay_sender_binding_required, true);
  assert.equal(VOID_P2P_UDP_SWARM_AUTHENTICATED_CONTROL_ADAPTER_AUTHORITY_V1.ticket_stream_peer_binding_required, true);
  assert.equal(VOID_P2P_UDP_SWARM_AUTHENTICATED_CONTROL_ADAPTER_AUTHORITY_V1.signed_mapping_probes_use_existing_node_key, true);
  assert.equal(VOID_P2P_UDP_SWARM_AUTHENTICATED_CONTROL_ADAPTER_AUTHORITY_V1.two_mapping_probes_emitted_per_ticket, true);
  assert.equal(VOID_P2P_UDP_SWARM_AUTHENTICATED_CONTROL_ADAPTER_AUTHORITY_V1.offer_exact_session_binding_required, true);
  assert.equal(VOID_P2P_UDP_SWARM_AUTHENTICATED_CONTROL_ADAPTER_AUTHORITY_V1.node_core_mount_performed, false);
  assert.equal(VOID_P2P_UDP_SWARM_AUTHENTICATED_CONTROL_ADAPTER_AUTHORITY_V1.udp_socket_allocation_performed, false);
  assert.equal(VOID_P2P_UDP_SWARM_AUTHENTICATED_CONTROL_ADAPTER_AUTHORITY_V1.network_send_performed, false);
  assert.equal(VOID_P2P_UDP_SWARM_AUTHENTICATED_CONTROL_ADAPTER_AUTHORITY_V1.direct_transport_activation_performed, false);
  assert.equal(VOID_P2P_UDP_SWARM_AUTHENTICATED_CONTROL_ADAPTER_AUTHORITY_V1.relay_retirement_authorized, false);
  assert.equal(VOID_P2P_UDP_SWARM_AUTHENTICATED_CONTROL_ADAPTER_AUTHORITY_V1.relay_fallback_preserved, true);
  assert.equal(VOID_P2P_UDP_SWARM_AUTHENTICATED_CONTROL_ADAPTER_AUTHORITY_V1.router_configuration_required, false);
  assert.equal(VOID_P2P_UDP_SWARM_AUTHENTICATED_CONTROL_ADAPTER_AUTHORITY_V1.port_forward_required, false);
  assert.equal(VOID_P2P_UDP_SWARM_AUTHENTICATED_CONTROL_ADAPTER_AUTHORITY_V1.wallet_signer_validator_wc_money_authority, 0);

  console.log("authenticated_request_over_existing_relay_control=true");
  console.log("relay_request_bound_to_started_stream=true");
  console.log("reciprocal_identity_bound_ticket_delivery=true");
  console.log("target_accepts_ticket_without_originating_request_when_stream_binding_is_exact=true");
  console.log("signed_mapping_probes_use_existing_node_key=true");
  console.log("two_distinct_mapping_probes_emitted_per_ticket=true");
  console.log("relay_observes_stable_mapping_both_endpoints=true");
  console.log("reciprocal_upgrade_offer_delivery=true");
  console.log("offer_exact_session_stream_peer_binding=true");
  console.log("wrong_relay_ticket_or_offer_accepted=false");
  console.log("relay_reject_clears_pending_request=true");
  console.log("relay_stream_close_clears_client_route=true");
  console.log("public_snapshot_exposes_peer_pem=false");
  console.log("node_core_mount_performed=false");
  console.log("udp_socket_allocation_performed=false");
  console.log("network_send_performed=false");
  console.log("direct_transport_activation_performed=false");
  console.log("relay_retirement_authorized=false");
  console.log("relay_fallback_preserved=true");
  console.log("router_configuration_required=false");
  console.log("port_forward_required=false");
  console.log("wallet_signer_validator_wc_money_authority=0");
  console.log("VOID_P2P_UDP_SWARM_AUTHENTICATED_CONTROL_ADAPTER_V1_PROOF_GREEN");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
