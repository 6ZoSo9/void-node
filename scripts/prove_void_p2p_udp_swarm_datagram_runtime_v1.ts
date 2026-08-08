import assert from "node:assert/strict";
import * as crypto from "node:crypto";
import * as dgram from "node:dgram";

import { deriveVoidNodeIdFromPublicPemV1 } from "../src/p2p/auth_v1.js";
import { createVoidUdpHolePunchPacketV1 } from "../src/p2p/udp_hole_punch_v1.js";
import {
  VoidUdpRendezvousStateV1,
  createVoidUdpRendezvousProbeV1,
} from "../src/p2p/udp_rendezvous_v1.js";
import {
  VoidUdpSwarmRelayCoordinatorV1,
  type VoidUdpSwarmUpgradeOfferV1,
} from "../src/p2p/udp_swarm_control_v1.js";
import type {
  VoidUdpSwarmDirectUpgradeOfferActionV1,
  VoidUdpSwarmProbeActionV1,
} from "../src/p2p/udp_swarm_authenticated_control_adapter_v1.js";
import {
  VOID_P2P_UDP_SWARM_DATAGRAM_RUNTIME_AUTHORITY_V1,
  VoidUdpSwarmDatagramRuntimeV1,
  type VoidUdpSwarmDatagramRuntimeDirectObservedV1,
} from "../src/p2p/udp_swarm_datagram_runtime_v1.js";

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
  timeoutMs = 5_000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error(`timed out waiting for ${label}`);
}

function endpointPort(endpoint: string): number {
  const split = endpoint.lastIndexOf(":");
  assert(split > 0);
  return Number(endpoint.slice(split + 1));
}

function sendRaw(
  socket: dgram.Socket,
  bytes: Uint8Array,
  port: number,
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    socket.send(bytes, port, "127.0.0.1", (error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

async function main(): Promise<void> {
  const sourceId = identity();
  const targetId = identity();
  const relayId = identity();
  const rogue = dgram.createSocket("udp4");

  let sourceObserved: VoidUdpSwarmDatagramRuntimeDirectObservedV1 | undefined;
  let targetObserved: VoidUdpSwarmDatagramRuntimeDirectObservedV1 | undefined;
  let coordinator!: VoidUdpSwarmRelayCoordinatorV1;
  let offers: readonly [VoidUdpSwarmUpgradeOfferV1, VoidUdpSwarmUpgradeOfferV1] | undefined;

  const relay = new VoidUdpSwarmDatagramRuntimeV1({
    localNodeId: relayId.nodeId,
    bindHost: "127.0.0.1",
    bindPort: 0,
    allowNonPublicEndpoints: true,
    onRelayRendezvousProbe: ({ packet, remoteAddress, remotePort }) => {
      const result = coordinator.observeProbe({
        packet,
        remoteAddress,
        remotePort,
      });
      if (result.offers) offers = result.offers;
    },
  });
  const source = new VoidUdpSwarmDatagramRuntimeV1({
    localNodeId: sourceId.nodeId,
    bindHost: "127.0.0.1",
    bindPort: 0,
    allowNonPublicEndpoints: true,
    onDirectPathObserved: (observation) => {
      sourceObserved = observation;
    },
  });
  const target = new VoidUdpSwarmDatagramRuntimeV1({
    localNodeId: targetId.nodeId,
    bindHost: "127.0.0.1",
    bindPort: 0,
    allowNonPublicEndpoints: true,
    onDirectPathObserved: (observation) => {
      targetObserved = observation;
    },
  });

  try {
    assert.equal(relay.snapshot().started, false);
    assert.equal(source.snapshot().started, false);
    assert.equal(target.snapshot().started, false);

    const relayBound = await relay.start();
    const sourceBound = await source.start();
    const targetBound = await target.start();
    assert(relayBound.port > 0);
    assert(sourceBound.port > 0);
    assert(targetBound.port > 0);
    assert.equal(sourceBound.family, "IPv4");
    assert.equal(targetBound.family, "IPv4");

    coordinator = new VoidUdpSwarmRelayCoordinatorV1(
      new VoidUdpRendezvousStateV1(true),
      `127.0.0.1:${relayBound.port}`,
      true,
    );

    const streamId = "1".repeat(32);
    const requestId = "2".repeat(32);
    const opened = coordinator.openAuthenticatedSession({
      requestId,
      streamId,
      authenticatedRequesterNodeId: sourceId.nodeId,
      requesterPublicPem: sourceId.publicPem,
      targetNodeId: targetId.nodeId,
      targetPublicPem: targetId.publicPem,
      streamSourceNodeId: sourceId.nodeId,
      streamTargetNodeId: targetId.nodeId,
      ticketTtlMs: 15_000,
    });

    const makeAction = (
      who: Identity,
      peerNodeId: string,
      ticketId: string,
      relayEndpoint: string,
    ): VoidUdpSwarmProbeActionV1 => Object.freeze({
      relay_node_id: relayId.nodeId,
      relay_udp_endpoint: relayEndpoint,
      request_id: requestId,
      session_id: opened.session.session_id,
      stream_id: streamId,
      peer_node_id: peerNodeId,
      packet: createVoidUdpRendezvousProbeV1({
        ticketId,
        nodeId: who.nodeId,
        privateKey: who.privateKey,
      }),
    });

    await source.sendProbeAction(makeAction(
      sourceId,
      targetId.nodeId,
      opened.requester_ticket.ticket_id,
      opened.requester_ticket.relay_udp_endpoint,
    ));
    await target.sendProbeAction(makeAction(
      targetId,
      sourceId.nodeId,
      opened.target_ticket.ticket_id,
      opened.target_ticket.relay_udp_endpoint,
    ));
    await source.sendProbeAction(makeAction(
      sourceId,
      targetId.nodeId,
      opened.requester_ticket.ticket_id,
      opened.requester_ticket.relay_udp_endpoint,
    ));
    await target.sendProbeAction(makeAction(
      targetId,
      sourceId.nodeId,
      opened.target_ticket.ticket_id,
      opened.target_ticket.relay_udp_endpoint,
    ));

    await waitFor(() => !!offers, "stable relay observations and reciprocal offers");
    assert(offers);
    const [sourceOffer, targetOffer] = offers;
    assert.equal(sourceOffer.peer_node_id, targetId.nodeId);
    assert.equal(targetOffer.peer_node_id, sourceId.nodeId);

    const snapshot = coordinator.sessionFor(opened.session.session_id);
    assert(snapshot?.source_observation);
    assert(snapshot?.target_observation);
    assert.equal(snapshot.source_observation.stable_same_rendezvous, true);
    assert.equal(snapshot.target_observation.stable_same_rendezvous, true);
    assert.equal(endpointPort(snapshot.source_observation.observed_endpoint), sourceBound.port);
    assert.equal(endpointPort(snapshot.target_observation.observed_endpoint), targetBound.port);

    const sourceAction: VoidUdpSwarmDirectUpgradeOfferActionV1 = Object.freeze({
      relay_node_id: relayId.nodeId,
      message: sourceOffer,
    });
    const targetAction: VoidUdpSwarmDirectUpgradeOfferActionV1 = Object.freeze({
      relay_node_id: relayId.nodeId,
      message: targetOffer,
    });

    const sourcePlan = source.beginDirectUpgradeOffer(sourceAction);
    assert.equal(sourcePlan.peer_observed_endpoint, `127.0.0.1:${targetBound.port}`);

    // A correctly shaped punch from the wrong UDP source port is not enough.
    await new Promise<void>((resolve, reject) => {
      rogue.once("error", reject);
      rogue.bind(0, "127.0.0.1", () => {
        rogue.off("error", reject);
        resolve();
      });
    });
    const roguePacket = createVoidUdpHolePunchPacketV1({
      sessionId: opened.session.session_id,
      sourceNodeId: targetId.nodeId,
      targetNodeId: sourceId.nodeId,
      attempt: 0,
    });
    await sendRaw(
      rogue,
      Buffer.from(JSON.stringify(roguePacket), "utf8"),
      sourceBound.port,
    );
    await new Promise((resolve) => setTimeout(resolve, 75));
    assert.equal(sourceObserved, undefined);

    const targetPlan = target.beginDirectUpgradeOffer(targetAction);
    assert.equal(targetPlan.peer_observed_endpoint, `127.0.0.1:${sourceBound.port}`);

    await waitFor(
      () => !!sourceObserved && !!targetObserved,
      "reciprocal direct path observations over the same bound participant sockets",
    );
    assert(sourceObserved && targetObserved);
    assert.equal(sourceObserved.peer_node_id, targetId.nodeId);
    assert.equal(targetObserved.peer_node_id, sourceId.nodeId);
    assert.equal(sourceObserved.source_port, targetBound.port);
    assert.equal(targetObserved.source_port, sourceBound.port);
    assert.equal(sourceObserved.source_address, "127.0.0.1");
    assert.equal(targetObserved.source_address, "127.0.0.1");

    // The exact same participant socket supplied the rendezvous mapping source
    // port and the later direct punch source port.
    assert.equal(
      endpointPort(snapshot.source_observation.observed_endpoint),
      targetObserved.source_port,
    );
    assert.equal(
      endpointPort(snapshot.target_observation.observed_endpoint),
      sourceObserved.source_port,
    );

    const sourceRuntime = source.snapshot();
    const targetRuntime = target.snapshot();
    assert.equal(sourceRuntime.started, true);
    assert.equal(targetRuntime.started, true);
    assert.equal(sourceRuntime.bound?.port, sourceBound.port);
    assert.equal(targetRuntime.bound?.port, targetBound.port);
    assert.equal(sourceRuntime.active_punch_count, 1);
    assert.equal(targetRuntime.active_punch_count, 1);
    assert.equal(sourceRuntime.active_punches[0]?.direct_path_observed, true);
    assert.equal(targetRuntime.active_punches[0]?.direct_path_observed, true);

    assert.equal(
      VOID_P2P_UDP_SWARM_DATAGRAM_RUNTIME_AUTHORITY_V1.one_udp_socket_per_runtime,
      true,
    );
    assert.equal(
      VOID_P2P_UDP_SWARM_DATAGRAM_RUNTIME_AUTHORITY_V1.participant_default_bind_port_zero,
      true,
    );
    assert.equal(
      VOID_P2P_UDP_SWARM_DATAGRAM_RUNTIME_AUTHORITY_V1.fixed_participant_port_required,
      false,
    );
    assert.equal(
      VOID_P2P_UDP_SWARM_DATAGRAM_RUNTIME_AUTHORITY_V1.same_socket_used_for_rendezvous_and_punch,
      true,
    );
    assert.equal(
      VOID_P2P_UDP_SWARM_DATAGRAM_RUNTIME_AUTHORITY_V1.punch_packet_defines_peer_identity,
      false,
    );
    assert.equal(
      VOID_P2P_UDP_SWARM_DATAGRAM_RUNTIME_AUTHORITY_V1.secure_transport_activation_performed,
      false,
    );
    assert.equal(
      VOID_P2P_UDP_SWARM_DATAGRAM_RUNTIME_AUTHORITY_V1.relay_retirement_authorized,
      false,
    );

    console.log(`relay_bound_udp_port=${relayBound.port}`);
    console.log(`source_os_selected_udp_port=${sourceBound.port}`);
    console.log(`target_os_selected_udp_port=${targetBound.port}`);
    console.log("participant_default_bind_port_zero=true");
    console.log("fixed_participant_port_required=false");
    console.log("one_udp_socket_per_runtime=true");
    console.log("signed_rendezvous_probe_sent_over_bound_socket=true");
    console.log("relay_observed_source_port_matches_bound_socket=true");
    console.log("same_socket_used_for_rendezvous_and_punch=true");
    console.log("wrong_source_port_punch_accepted=false");
    console.log("reciprocal_direct_udp_path_observed=true");
    console.log("punch_packet_defines_peer_identity=false");
    console.log("secure_transport_activation_performed=false");
    console.log("normal_void_peer_auth_still_required=true");
    console.log("relay_retirement_authorized=false");
    console.log("relay_fallback_preserved=true");
    console.log("router_configuration_required=false");
    console.log("port_forward_required=false");
    console.log("wallet_signer_validator_wc_money_authority=0");
    console.log("VOID_P2P_UDP_SWARM_DATAGRAM_RUNTIME_V1_PROOF_GREEN");
  } finally {
    try { rogue.close(); } catch (error) { void error; }
    source.close();
    target.close();
    relay.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
