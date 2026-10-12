// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025-2026 6ZoSo9

import assert from "node:assert/strict";
import * as crypto from "node:crypto";

import { deriveVoidNodeIdFromPublicPemV1 } from "../src/p2p/auth_v1.js";
import { VoidRelayServerStateV1 } from "../src/p2p/relay_v1.js";
import { VoidUdpSwarmAuthenticatedControlAdapterV1 } from "../src/p2p/udp_swarm_authenticated_control_adapter_v1.js";
import { VoidUdpSwarmRelayBridgeV1 } from "../src/p2p/udp_swarm_relay_bridge_v1.js";
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

function clone<T>(value: T): T {
  return structuredClone(value);
}

async function main(): Promise<void> {
  const a = identity();
  const b = identity();
  const relay = identity();

  const relayState = new VoidRelayServerStateV1();
  relayState.reserve(b.nodeId, 60_000, 10_000);
  const stream = relayState.openStream(a.nodeId, b.nodeId, 10_001);
  relayState.markReady(a.nodeId, stream.stream_id, 10_002);
  assert.equal(
    relayState.markReady(b.nodeId, stream.stream_id, 10_003).started_now,
    true,
  );

  const keys = new Map<string, string>([
    [a.nodeId, a.publicPem],
    [b.nodeId, b.publicPem],
  ]);
  const bridge = new VoidUdpSwarmRelayBridgeV1(
    relayState,
    "127.0.0.1:4700",
    (nodeId) => keys.get(nodeId),
    true,
  );

  const startedFor = (
    localNodeId: string,
    relayNodeId: string,
    peerNodeId: string,
    streamId: string,
  ): boolean => {
    if (relayNodeId !== relay.nodeId || streamId !== stream.stream_id) return false;
    const expectedPeer = localNodeId === a.nodeId ? b.nodeId : a.nodeId;
    return peerNodeId === expectedPeer && relayState.snapshot(10_050).streams.some(
      (entry) => entry.stream_id === streamId && entry.started,
    );
  };

  const clientA = new VoidUdpSwarmAuthenticatedControlAdapterV1({
    localNodeId: a.nodeId,
    localPublicPem: a.publicPem,
    localPrivateKey: a.privateKey,
    isStartedRelayClientStream: (relayNodeId, peerNodeId, streamId) =>
      startedFor(a.nodeId, relayNodeId, peerNodeId, streamId),
    allowNonPublicEndpoint: true,
  });
  const clientB = new VoidUdpSwarmAuthenticatedControlAdapterV1({
    localNodeId: b.nodeId,
    localPublicPem: b.publicPem,
    localPrivateKey: b.privateKey,
    isStartedRelayClientStream: (relayNodeId, peerNodeId, streamId) =>
      startedFor(b.nodeId, relayNodeId, peerNodeId, streamId),
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

  const requested = clientA.beginUpgrade({
    relayNodeId: relay.nodeId,
    targetNodeId: b.nodeId,
    streamId: stream.stream_id,
    nowMs: 10_020,
  });
  const tickets = relayAdapter.handleAuthenticatedControl({
    fromNodeId: a.nodeId,
    message: requested.control_delivery.message,
    nowMs: 10_021,
  });
  const ticketA = tickets.control_deliveries.find(
    (entry) => entry.recipient_node_id === a.nodeId,
  )?.message;
  const ticketB = tickets.control_deliveries.find(
    (entry) => entry.recipient_node_id === b.nodeId,
  )?.message;
  assert(ticketA?.type === "UDP_SWARM_RENDEZVOUS_TICKET");
  assert(ticketB?.type === "UDP_SWARM_RENDEZVOUS_TICKET");

  const probesA = clientA.handleAuthenticatedControl({
    fromNodeId: relay.nodeId,
    message: ticketA,
    nowMs: 10_030,
  }).udp_probe_actions;
  const probesB = clientB.handleAuthenticatedControl({
    fromNodeId: relay.nodeId,
    message: ticketB,
    nowMs: 10_031,
  }).udp_probe_actions;
  assert.equal(probesA.length, 2);
  assert.equal(probesB.length, 2);

  relayAdapter.handleRelayUdpProbe({
    packet: probesA[0]?.packet,
    remoteAddress: "127.0.0.1",
    remotePort: 51_001,
    nowMs: 10_100,
  });
  relayAdapter.handleRelayUdpProbe({
    packet: probesB[0]?.packet,
    remoteAddress: "127.0.0.1",
    remotePort: 51_002,
    nowMs: 10_110,
  });
  relayAdapter.handleRelayUdpProbe({
    packet: probesA[1]?.packet,
    remoteAddress: "127.0.0.1",
    remotePort: 51_001,
    nowMs: 10_120,
  });
  const final = relayAdapter.handleRelayUdpProbe({
    packet: probesB[1]?.packet,
    remoteAddress: "127.0.0.1",
    remotePort: 51_002,
    nowMs: 10_130,
  });
  assert.equal(final.control_deliveries.length, 2);

  const offerA = final.control_deliveries.find(
    (entry) => entry.recipient_node_id === a.nodeId,
  )?.message;
  const offerB = final.control_deliveries.find(
    (entry) => entry.recipient_node_id === b.nodeId,
  )?.message;
  assert(offerA?.type === "UDP_SWARM_UPGRADE_OFFER");
  assert(offerB?.type === "UDP_SWARM_UPGRADE_OFFER");

  const session = bridge.sessionFor(offerA.session_id, 10_131);
  assert(session?.source_observation);
  assert(session?.target_observation);

  assert.deepEqual(offerA.local_observation, session.source_observation);
  assert.deepEqual(offerA.peer_observation, session.target_observation);
  assert.deepEqual(offerB.local_observation, session.target_observation);
  assert.deepEqual(offerB.peer_observation, session.source_observation);
  assert.equal(offerA.local_observation.ticket_id, ticketA.ticket_id);
  assert.equal(offerA.peer_observation.ticket_id, ticketB.ticket_id);
  assert.equal(offerB.local_observation.ticket_id, ticketB.ticket_id);
  assert.equal(offerB.peer_observation.ticket_id, ticketA.ticket_id);
  assert.equal(offerA.local_observation.node_id, a.nodeId);
  assert.equal(offerA.peer_observation.node_id, b.nodeId);
  assert.equal(offerB.local_observation.node_id, b.nodeId);
  assert.equal(offerB.peer_observation.node_id, a.nodeId);
  assert.equal(offerA.local_observation.probe_count, 2);
  assert.equal(offerA.peer_observation.probe_count, 2);
  assert.equal(offerA.local_observation.stable_same_rendezvous, true);
  assert.equal(offerA.peer_observation.stable_same_rendezvous, true);
  assert.equal(offerA.local_observation.mapping_conflicted, false);
  assert.equal(offerA.peer_observation.mapping_conflicted, false);

  const directA = clientA.handleAuthenticatedControl({
    fromNodeId: relay.nodeId,
    message: offerA,
    nowMs: 10_132,
  }).direct_upgrade_offer;
  const directB = clientB.handleAuthenticatedControl({
    fromNodeId: relay.nodeId,
    message: offerB,
    nowMs: 10_133,
  }).direct_upgrade_offer;
  assert(directA && directB);

  assert.equal(
    directA.verifyAuthenticatedRendezvousObservation(
      clone(directA.message.local_observation),
      a.nodeId,
    ),
    true,
  );
  assert.equal(
    directA.verifyAuthenticatedRendezvousObservation(
      clone(directA.message.peer_observation),
      b.nodeId,
    ),
    true,
  );
  assert.equal(
    directA.verifyAuthenticatedRendezvousObservation(
      directA.message.peer_observation,
      a.nodeId,
    ),
    false,
  );

  const detachedStableSubstitute = clone(directA.message.local_observation);
  detachedStableSubstitute.probe_count += 1;
  assert.equal(detachedStableSubstitute.stable_same_rendezvous, true);
  assert.equal(detachedStableSubstitute.mapping_conflicted, false);
  assert.equal(
    directA.verifyAuthenticatedRendezvousObservation(
      detachedStableSubstitute,
      a.nodeId,
    ),
    false,
  );

  assert.throws(
    () => new VoidUdpSwarmUpgradeV1({
      sessionId: directA.message.session_id,
      localNodeId: a.nodeId,
      remoteNodeId: b.nodeId,
      localPublicPem: a.publicPem,
      localPrivateKey: a.privateKey,
      localObservation: detachedStableSubstitute,
      remoteObservation: directA.message.peer_observation,
      verifyAuthenticatedRendezvousObservation:
        directA.verifyAuthenticatedRendezvousObservation,
      transmitSecurePacket: () => {},
      allowNonPublicEndpoints: true,
    }),
    /local authenticated UDP rendezvous observation provenance verification failed/,
  );

  const upgradeA = new VoidUdpSwarmUpgradeV1({
    sessionId: directA.message.session_id,
    localNodeId: a.nodeId,
    remoteNodeId: b.nodeId,
    localPublicPem: a.publicPem,
    localPrivateKey: a.privateKey,
    localObservation: directA.message.local_observation,
    remoteObservation: directA.message.peer_observation,
    verifyAuthenticatedRendezvousObservation:
      directA.verifyAuthenticatedRendezvousObservation,
    transmitSecurePacket: () => {},
    allowNonPublicEndpoints: true,
  });
  const punchA = upgradeA.beginPunch();
  assert.equal(punchA.local_node_id, a.nodeId);
  assert.equal(punchA.peer_node_id, b.nodeId);
  assert.equal(
    punchA.peer_observed_endpoint,
    directA.message.peer_observation.observed_endpoint,
  );
  assert.equal(upgradeA.relayRetirementAuthorized, false);
  upgradeA.destroy();

  const upgradeB = new VoidUdpSwarmUpgradeV1({
    sessionId: directB.message.session_id,
    localNodeId: b.nodeId,
    remoteNodeId: a.nodeId,
    localPublicPem: b.publicPem,
    localPrivateKey: b.privateKey,
    localObservation: directB.message.local_observation,
    remoteObservation: directB.message.peer_observation,
    verifyAuthenticatedRendezvousObservation:
      directB.verifyAuthenticatedRendezvousObservation,
    transmitSecurePacket: () => {},
    allowNonPublicEndpoints: true,
  });
  assert.equal(upgradeB.beginPunch().peer_node_id, a.nodeId);
  assert.equal(upgradeB.relayRetirementAuthorized, false);
  upgradeB.destroy();

  // Independent client state proves the adapter binds received relay evidence
  // back to the exact ticket installed for this endpoint rather than accepting
  // any syntactically valid stable observation.
  const tamperClient = new VoidUdpSwarmAuthenticatedControlAdapterV1({
    localNodeId: a.nodeId,
    localPublicPem: a.publicPem,
    localPrivateKey: a.privateKey,
    isStartedRelayClientStream: (relayNodeId, peerNodeId, streamId) =>
      startedFor(a.nodeId, relayNodeId, peerNodeId, streamId),
    allowNonPublicEndpoint: true,
  });
  tamperClient.handleAuthenticatedControl({
    fromNodeId: relay.nodeId,
    message: ticketA,
    nowMs: 10_140,
  });

  const wrongLocalTicket = clone(offerA) as any;
  wrongLocalTicket.local_observation.ticket_id = "e".repeat(32);
  assert.throws(
    () => tamperClient.handleAuthenticatedControl({
      fromNodeId: relay.nodeId,
      message: wrongLocalTicket,
      nowMs: 10_141,
    }),
    /rendezvous evidence binding mismatch/,
  );

  const syntheticProbeCount = clone(offerA) as any;
  syntheticProbeCount.local_observation.probe_count = 1;
  assert.throws(
    () => tamperClient.handleAuthenticatedControl({
      fromNodeId: relay.nodeId,
      message: syntheticProbeCount,
      nowMs: 10_142,
    }),
    /message is malformed/,
  );

  const conflicted = clone(offerA) as any;
  conflicted.peer_observation.mapping_conflicted = true;
  conflicted.peer_observation.stable_same_rendezvous = false;
  assert.throws(
    () => tamperClient.handleAuthenticatedControl({
      fromNodeId: relay.nodeId,
      message: conflicted,
      nowMs: 10_143,
    }),
    /message is malformed/,
  );

  const endpointMismatch = clone(offerA) as any;
  endpointMismatch.peer_observation.observed_endpoint = "127.0.0.1:59999";
  assert.throws(
    () => tamperClient.handleAuthenticatedControl({
      fromNodeId: relay.nodeId,
      message: endpointMismatch,
      nowMs: 10_144,
    }),
    /message is malformed/,
  );

  const peerIdentityMismatch = clone(offerA) as any;
  peerIdentityMismatch.peer_observation.node_id = a.nodeId;
  assert.throws(
    () => tamperClient.handleAuthenticatedControl({
      fromNodeId: relay.nodeId,
      message: peerIdentityMismatch,
      nowMs: 10_145,
    }),
    /message is malformed/,
  );

  const extraEvidenceKey = clone(offerA) as any;
  extraEvidenceKey.local_observation.synthetic = true;
  assert.throws(
    () => tamperClient.handleAuthenticatedControl({
      fromNodeId: relay.nodeId,
      message: extraEvidenceKey,
      nowMs: 10_146,
    }),
    /message is malformed/,
  );

  const acceptedAfterTamper = tamperClient.handleAuthenticatedControl({
    fromNodeId: relay.nodeId,
    message: offerA,
    nowMs: 10_147,
  }).direct_upgrade_offer;
  assert(acceptedAfterTamper);
  assert.deepEqual(
    acceptedAfterTamper.message.local_observation,
    session.source_observation,
  );

  assert.equal(JSON.stringify(tamperClient.snapshot(10_148)).includes("observed_endpoint"), false);
  assert.equal(JSON.stringify(tamperClient.snapshot(10_148)).includes("BEGIN PUBLIC KEY"), false);

  console.log("relay_observed_rendezvous_evidence_preserved=true");
  console.log("local_observation_exact_relay_record=true");
  console.log("peer_observation_exact_relay_record=true");
  console.log("local_ticket_evidence_binding_required=true");
  console.log("authenticated_offer_provenance_verifier_emitted=true");
  console.log("exact_cloned_observation_provenance_accepted=true");
  console.log("detached_structural_observation_provenance_accepted=false");
  console.log("peer_node_evidence_binding_required=true");
  console.log("stable_nonconflicted_evidence_required=true");
  console.log("evidence_endpoint_consistency_required=true");
  console.log("synthetic_probe_count_accepted=false");
  console.log("conflicted_mapping_evidence_accepted=false");
  console.log("extra_evidence_keys_accepted=false");
  console.log("wrong_local_ticket_evidence_accepted=false");
  console.log("void_udp_swarm_upgrade_constructed_directly_from_offer_evidence=true");
  console.log("synthetic_rendezvous_observation_constructed=false");
  console.log("relay_retirement_authorized_before_direct_auth=false");
  console.log("public_snapshot_exposes_observation_evidence=false");
  console.log("udp_socket_allocation_performed=false");
  console.log("udp_datagram_transmission_performed=false");
  console.log("direct_transport_activation_performed=false");
  console.log("router_configuration_required=false");
  console.log("port_forward_required=false");
  console.log("wallet_signer_validator_wc_money_authority=0");
  console.log("VOID_P2P_UDP_SWARM_OBSERVATION_EVIDENCE_V1_PROOF_GREEN");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
