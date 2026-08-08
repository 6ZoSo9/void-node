import assert from "node:assert/strict";
import * as crypto from "node:crypto";

import { deriveVoidNodeIdFromPublicPemV1 } from "../src/p2p/auth_v1.js";
import {
  VoidUdpRendezvousStateV1,
  createVoidUdpRendezvousProbeV1,
} from "../src/p2p/udp_rendezvous_v1.js";
import {
  VOID_P2P_UDP_SWARM_CONTROL_AUTHORITY_V1,
  VoidUdpSwarmRelayCoordinatorV1,
  normalizeVoidUdpSwarmControlMessageV1,
} from "../src/p2p/udp_swarm_control_v1.js";
import { VoidUdpSwarmUpgradeV1 } from "../src/p2p/udp_swarm_upgrade_v1.js";

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

function probe(ticketId: string, id: Identity) {
  return createVoidUdpRendezvousProbeV1({
    ticketId,
    nodeId: id.nodeId,
    privateKey: id.privateKey,
  });
}

async function main(): Promise<void> {
  const a = identity();
  const b = identity();
  const impostor = identity();
  const rendezvous = new VoidUdpRendezvousStateV1(true);
  const coordinator = new VoidUdpSwarmRelayCoordinatorV1(
    rendezvous,
    "127.0.0.1:4700",
    true,
  );

  const streamId = "1".repeat(32);
  const requestId = "2".repeat(32);
  const opened = coordinator.openAuthenticatedSession({
    requestId,
    streamId,
    authenticatedRequesterNodeId: a.nodeId,
    requesterPublicPem: a.publicPem,
    targetNodeId: b.nodeId,
    targetPublicPem: b.publicPem,
    streamSourceNodeId: a.nodeId,
    streamTargetNodeId: b.nodeId,
    ticketTtlMs: 15_000,
    nowMs: 10_000,
  });

  assert.equal(opened.session.source_node_id, a.nodeId);
  assert.equal(opened.session.target_node_id, b.nodeId);
  assert.equal(opened.requester_ticket.peer_node_id, b.nodeId);
  assert.equal(opened.target_ticket.peer_node_id, a.nodeId);
  assert.equal(opened.requester_ticket.relay_udp_endpoint, "127.0.0.1:4700");
  assert.equal(opened.target_ticket.relay_udp_endpoint, "127.0.0.1:4700");
  assert.equal(
    normalizeVoidUdpSwarmControlMessageV1(opened.requester_ticket, true)?.type,
    "UDP_SWARM_RENDEZVOUS_TICKET",
  );
  assert.equal(
    normalizeVoidUdpSwarmControlMessageV1({ ...opened.requester_ticket, extra: true }, true),
    undefined,
  );

  assert.throws(
    () => coordinator.openAuthenticatedSession({
      streamId: "3".repeat(32),
      authenticatedRequesterNodeId: a.nodeId,
      requesterPublicPem: a.publicPem,
      targetNodeId: b.nodeId,
      targetPublicPem: b.publicPem,
      streamSourceNodeId: a.nodeId,
      streamTargetNodeId: impostor.nodeId,
      nowMs: 10_010,
    }),
    /relay stream endpoints/,
  );

  assert.throws(
    () => coordinator.openAuthenticatedSession({
      streamId: "4".repeat(32),
      authenticatedRequesterNodeId: a.nodeId,
      requesterPublicPem: impostor.publicPem,
      targetNodeId: b.nodeId,
      targetPublicPem: b.publicPem,
      streamSourceNodeId: a.nodeId,
      streamTargetNodeId: b.nodeId,
      nowMs: 10_020,
    }),
    /requester identity\/public-key binding mismatch/,
  );

  const a1 = coordinator.observeProbe({
    packet: probe(opened.requester_ticket.ticket_id, a),
    remoteAddress: "127.0.0.1",
    remotePort: 51_001,
    nowMs: 10_100,
  });
  assert.equal(a1.observation.stable_same_rendezvous, false);
  assert.equal(a1.offers, undefined);

  const b1 = coordinator.observeProbe({
    packet: probe(opened.target_ticket.ticket_id, b),
    remoteAddress: "127.0.0.1",
    remotePort: 51_002,
    nowMs: 10_110,
  });
  assert.equal(b1.observation.stable_same_rendezvous, false);
  assert.equal(b1.offers, undefined);

  const a2 = coordinator.observeProbe({
    packet: probe(opened.requester_ticket.ticket_id, a),
    remoteAddress: "127.0.0.1",
    remotePort: 51_001,
    nowMs: 10_120,
  });
  assert.equal(a2.observation.stable_same_rendezvous, true);
  assert.equal(a2.offers, undefined);

  const b2 = coordinator.observeProbe({
    packet: probe(opened.target_ticket.ticket_id, b),
    remoteAddress: "127.0.0.1",
    remotePort: 51_002,
    nowMs: 10_130,
  });
  assert.equal(b2.observation.stable_same_rendezvous, true);
  assert(b2.offers);
  const [offerA, offerB] = b2.offers;
  assert.equal(offerA.peer_node_id, b.nodeId);
  assert.equal(offerA.local_observed_endpoint, "127.0.0.1:51001");
  assert.equal(offerA.peer_observed_endpoint, "127.0.0.1:51002");
  assert.equal(offerB.peer_node_id, a.nodeId);
  assert.equal(offerB.local_observed_endpoint, "127.0.0.1:51002");
  assert.equal(offerB.peer_observed_endpoint, "127.0.0.1:51001");
  assert.equal(
    normalizeVoidUdpSwarmControlMessageV1(offerA, true)?.type,
    "UDP_SWARM_UPGRADE_OFFER",
  );

  const snapshot = coordinator.sessionFor(opened.session.session_id, 10_131);
  assert(snapshot?.source_observation);
  assert(snapshot?.target_observation);
  assert.equal(snapshot.offers_emitted, true);

  // The emitted observations feed the existing swarm-upgrade orchestrator exactly.
  const upgrade = new VoidUdpSwarmUpgradeV1({
    sessionId: opened.session.session_id,
    localNodeId: a.nodeId,
    remoteNodeId: b.nodeId,
    localPublicPem: a.publicPem,
    localPrivateKey: a.privateKey,
    localObservation: snapshot.source_observation,
    remoteObservation: snapshot.target_observation,
    transmitSecurePacket: () => {},
    allowNonPublicEndpoints: true,
  });
  const punchPlan = upgrade.beginPunch();
  assert.equal(punchPlan.peer_observed_endpoint, offerA.peer_observed_endpoint);
  assert.equal(punchPlan.local_node_id, a.nodeId);
  assert.equal(punchPlan.peer_node_id, b.nodeId);
  assert.equal(upgrade.relayRetirementAuthorized, false);
  upgrade.destroy();

  // Wrong-key UDP proof cannot inherit authenticated relay identity.
  const wrongKeyProbe = createVoidUdpRendezvousProbeV1({
    ticketId: opened.requester_ticket.ticket_id,
    nodeId: a.nodeId,
    privateKey: impostor.privateKey,
  });
  assert.throws(
    () => coordinator.observeProbe({
      packet: wrongKeyProbe,
      remoteAddress: "127.0.0.1",
      remotePort: 51_001,
      nowMs: 10_140,
    }),
    /signature mismatch/,
  );

  // A mapping change under one ticket fails before an offer can be released.
  const conflict = coordinator.openAuthenticatedSession({
    streamId: "5".repeat(32),
    authenticatedRequesterNodeId: a.nodeId,
    requesterPublicPem: a.publicPem,
    targetNodeId: b.nodeId,
    targetPublicPem: b.publicPem,
    streamSourceNodeId: a.nodeId,
    streamTargetNodeId: b.nodeId,
    ticketTtlMs: 15_000,
    nowMs: 11_000,
  });
  coordinator.observeProbe({
    packet: probe(conflict.requester_ticket.ticket_id, a),
    remoteAddress: "127.0.0.1",
    remotePort: 52_001,
    nowMs: 11_010,
  });
  assert.throws(
    () => coordinator.observeProbe({
      packet: probe(conflict.requester_ticket.ticket_id, a),
      remoteAddress: "127.0.0.1",
      remotePort: 52_099,
      nowMs: 11_020,
    }),
    /mapping changed/,
  );
  const conflictSnapshot = coordinator.sessionFor(conflict.session.session_id, 11_021);
  assert.equal(conflictSnapshot?.offers_emitted, false);
  assert.equal(conflictSnapshot?.target_observation, undefined);

  assert.throws(
    () => new VoidUdpSwarmRelayCoordinatorV1(
      new VoidUdpRendezvousStateV1(),
      "127.0.0.1:4700",
      false,
    ),
    /relay endpoint is invalid/,
  );

  assert.equal(VOID_P2P_UDP_SWARM_CONTROL_AUTHORITY_V1.authenticated_relay_stream_required, true);
  assert.equal(VOID_P2P_UDP_SWARM_CONTROL_AUTHORITY_V1.ticket_node_identity_binding_required, true);
  assert.equal(VOID_P2P_UDP_SWARM_CONTROL_AUTHORITY_V1.relay_udp_endpoint_is_transport_hint_only, true);
  assert.equal(VOID_P2P_UDP_SWARM_CONTROL_AUTHORITY_V1.stable_mapping_both_endpoints_required_before_offer, true);
  assert.equal(VOID_P2P_UDP_SWARM_CONTROL_AUTHORITY_V1.mapping_conflict_offer_allowed, false);
  assert.equal(VOID_P2P_UDP_SWARM_CONTROL_AUTHORITY_V1.offer_defines_peer_identity, false);
  assert.equal(VOID_P2P_UDP_SWARM_CONTROL_AUTHORITY_V1.normal_void_peer_auth_still_required, true);
  assert.equal(VOID_P2P_UDP_SWARM_CONTROL_AUTHORITY_V1.relay_fallback_preserved, true);
  assert.equal(VOID_P2P_UDP_SWARM_CONTROL_AUTHORITY_V1.runtime_node_core_mount_performed, false);
  assert.equal(VOID_P2P_UDP_SWARM_CONTROL_AUTHORITY_V1.wallet_signer_validator_wc_money_authority, 0);

  console.log("authenticated_relay_stream_required=true");
  console.log("request_bound_to_exact_relay_stream_endpoints=true");
  console.log("ticket_node_identity_binding_required=true");
  console.log("relay_udp_endpoint_transport_hint_only=true");
  console.log("signed_udp_mapping_probe_required=true");
  console.log("wrong_key_mapping_probe_accepted=false");
  console.log("stable_mapping_both_endpoints_required_before_offer=true");
  console.log("mapping_conflict_offer_allowed=false");
  console.log("reciprocal_mapping_offers_proven=true");
  console.log("swarm_upgrade_orchestrator_compatibility_proven=true");
  console.log("offer_defines_peer_identity=false");
  console.log("normal_void_peer_auth_still_required=true");
  console.log("relay_fallback_preserved=true");
  console.log("runtime_node_core_mount_performed=false");
  console.log("router_configuration_required=false");
  console.log("port_forward_required=false");
  console.log("wallet_signer_validator_wc_money_authority=0");
  console.log("VOID_P2P_UDP_SWARM_CONTROL_V1_PROOF_GREEN");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
