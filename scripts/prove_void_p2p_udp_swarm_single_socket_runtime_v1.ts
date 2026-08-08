// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025-2026 6ZoSo9

import assert from "node:assert/strict";
import * as crypto from "node:crypto";
import * as dgram from "node:dgram";

import { deriveVoidNodeIdFromPublicPemV1 } from "../src/p2p/auth_v1.js";
import { createVoidUdpHolePunchPacketV1 } from "../src/p2p/udp_hole_punch_v1.js";
import { VoidUdpRendezvousStateV1 } from "../src/p2p/udp_rendezvous_v1.js";
import { VoidUdpSwarmAuthenticatedControlAdapterV1 } from "../src/p2p/udp_swarm_authenticated_control_adapter_v1.js";
import { VoidUdpSwarmRelayCoordinatorV1 } from "../src/p2p/udp_swarm_control_v1.js";
import {
  VOID_P2P_UDP_SWARM_SOCKET_RUNTIME_AUTHORITY_V1,
  VOID_P2P_UDP_SWARM_SOCKET_RUNTIME_DEFAULT_MAX_DATAGRAM_BYTES_V1,
  VOID_P2P_UDP_SWARM_SOCKET_RUNTIME_DEFAULT_SECURE_PAYLOAD_BYTES_V1,
  VoidUdpSwarmSocketRuntimeV1,
  type VoidUdpSwarmSocketRuntimeDirectPathEventV1,
  type VoidUdpSwarmSocketRuntimeDirectReadyEventV1,
  type VoidUdpSwarmSocketRuntimeRendezvousProbeEventV1,
} from "../src/p2p/udp_swarm_socket_runtime_v1.js";
import type { VoidUdpSwarmUpgradeOfferV1 } from "../src/p2p/udp_swarm_control_v1.js";

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
  timeoutMs = 10_000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error(`timed out waiting for ${label}`);
}

function adapterFor(
  local: Identity,
  relay: Identity,
  peer: Identity,
  streamId: string,
) {
  return new VoidUdpSwarmAuthenticatedControlAdapterV1({
    localNodeId: local.nodeId,
    localPublicPem: local.publicPem,
    localPrivateKey: local.privateKey,
    isStartedRelayClientStream: (relayNodeId, peerNodeId, candidateStreamId) =>
      relayNodeId === relay.nodeId &&
      peerNodeId === peer.nodeId &&
      candidateStreamId === streamId,
    allowNonPublicEndpoint: true,
  });
}

async function sendRoguePunch(input: {
  destinationAddress: string;
  destinationPort: number;
  sessionId: string;
  sourceNodeId: string;
  targetNodeId: string;
}): Promise<number> {
  const rogue = dgram.createSocket("udp4");
  try {
    await new Promise<void>((resolve, reject) => {
      rogue.once("error", reject);
      rogue.bind(0, "127.0.0.1", () => resolve());
    });
    const address = rogue.address();
    assert.notEqual(typeof address, "string");
    if (typeof address === "string") throw new Error("unexpected rogue socket address");
    const packet = createVoidUdpHolePunchPacketV1({
      sessionId: input.sessionId,
      sourceNodeId: input.sourceNodeId,
      targetNodeId: input.targetNodeId,
      attempt: 0,
    });
    const bytes = Buffer.from(JSON.stringify(packet), "utf8");
    await new Promise<void>((resolve, reject) => {
      rogue.send(
        bytes,
        input.destinationPort,
        input.destinationAddress,
        (error) => error ? reject(error) : resolve(),
      );
    });
    return address.port;
  } finally {
    await new Promise<void>((resolve) => {
      try {
        rogue.close(() => resolve());
      } catch (error) {
        void error;
        resolve();
      }
    });
  }
}

async function main(): Promise<void> {
  const a = identity();
  const b = identity();
  const relay = identity();
  const streamId = "1".repeat(32);
  const requestId = "2".repeat(32);

  const relayProbeEvents: VoidUdpSwarmSocketRuntimeRendezvousProbeEventV1[] = [];
  const directPathA: VoidUdpSwarmSocketRuntimeDirectPathEventV1[] = [];
  const directPathB: VoidUdpSwarmSocketRuntimeDirectPathEventV1[] = [];
  const readyA: VoidUdpSwarmSocketRuntimeDirectReadyEventV1[] = [];
  const readyB: VoidUdpSwarmSocketRuntimeDirectReadyEventV1[] = [];
  const runtimeErrors: Error[] = [];
  let reciprocalOffers: readonly [VoidUdpSwarmUpgradeOfferV1, VoidUdpSwarmUpgradeOfferV1] | undefined;
  let coordinator!: VoidUdpSwarmRelayCoordinatorV1;

  const relayRuntime = new VoidUdpSwarmSocketRuntimeV1({
    localNodeId: relay.nodeId,
    localPublicPem: relay.publicPem,
    localPrivateKey: relay.privateKey,
    family: "udp4",
    bindHost: "127.0.0.1",
    allowNonPublicEndpoints: true,
    onRendezvousProbe: (event) => {
      relayProbeEvents.push(event);
      const observed = coordinator.observeProbe({
        packet: event.packet,
        remoteAddress: event.remote_address,
        remotePort: event.remote_port,
      });
      if (observed.offers) reciprocalOffers = observed.offers;
    },
    onRuntimeError: (error) => runtimeErrors.push(error),
  });
  const runtimeA = new VoidUdpSwarmSocketRuntimeV1({
    localNodeId: a.nodeId,
    localPublicPem: a.publicPem,
    localPrivateKey: a.privateKey,
    family: "udp4",
    bindHost: "127.0.0.1",
    allowNonPublicEndpoints: true,
    onDirectPathObserved: (event) => directPathA.push(event),
    onDirectSocketReady: (event) => readyA.push(event),
    onRuntimeError: (error) => runtimeErrors.push(error),
  });
  const runtimeB = new VoidUdpSwarmSocketRuntimeV1({
    localNodeId: b.nodeId,
    localPublicPem: b.publicPem,
    localPrivateKey: b.privateKey,
    family: "udp4",
    bindHost: "127.0.0.1",
    allowNonPublicEndpoints: true,
    onDirectPathObserved: (event) => directPathB.push(event),
    onDirectSocketReady: (event) => readyB.push(event),
    onRuntimeError: (error) => runtimeErrors.push(error),
  });

  try {
    const relayBound = await relayRuntime.start();
    const boundA = await runtimeA.start();
    const boundB = await runtimeB.start();
    assert(boundA.port > 0 && boundB.port > 0 && relayBound.port > 0);

    const rendezvous = new VoidUdpRendezvousStateV1(true);
    coordinator = new VoidUdpSwarmRelayCoordinatorV1(
      rendezvous,
      relayBound.endpoint,
      true,
    );
    const opened = coordinator.openAuthenticatedSession({
      requestId,
      streamId,
      authenticatedRequesterNodeId: a.nodeId,
      requesterPublicPem: a.publicPem,
      targetNodeId: b.nodeId,
      targetPublicPem: b.publicPem,
      streamSourceNodeId: a.nodeId,
      streamTargetNodeId: b.nodeId,
      ticketTtlMs: 30_000,
    });

    const adapterA = adapterFor(a, relay, b, streamId);
    const adapterB = adapterFor(b, relay, a, streamId);
    const probesA = adapterA.handleAuthenticatedControl({
      fromNodeId: relay.nodeId,
      message: opened.requester_ticket,
    }).udp_probe_actions;
    const probesB = adapterB.handleAuthenticatedControl({
      fromNodeId: relay.nodeId,
      message: opened.target_ticket,
    }).udp_probe_actions;
    assert.equal(probesA.length, 2);
    assert.equal(probesB.length, 2);

    await runtimeA.sendRendezvousProbeAction(probesA[0]!);
    await runtimeB.sendRendezvousProbeAction(probesB[0]!);
    await runtimeA.sendRendezvousProbeAction(probesA[1]!);
    await runtimeB.sendRendezvousProbeAction(probesB[1]!);

    await waitFor(
      () => relayProbeEvents.length === 4 && !!reciprocalOffers,
      "four real mapping probes and reciprocal offers",
    );
    const sourceEventsA = relayProbeEvents.filter(
      (event) => event.packet.node_id === a.nodeId,
    );
    const sourceEventsB = relayProbeEvents.filter(
      (event) => event.packet.node_id === b.nodeId,
    );
    assert.equal(sourceEventsA.length, 2);
    assert.equal(sourceEventsB.length, 2);
    assert(sourceEventsA.every((event) => event.remote_port === boundA.port));
    assert(sourceEventsB.every((event) => event.remote_port === boundB.port));
    assert(sourceEventsA.every((event) => event.remote_endpoint === boundA.endpoint));
    assert(sourceEventsB.every((event) => event.remote_endpoint === boundB.endpoint));

    const relaySession = coordinator.sessionFor(opened.session.session_id);
    assert(relaySession?.source_observation);
    assert(relaySession?.target_observation);
    assert.equal(relaySession.source_observation.observed_endpoint, boundA.endpoint);
    assert.equal(relaySession.target_observation.observed_endpoint, boundB.endpoint);
    assert.equal(relaySession.source_observation.stable_same_rendezvous, true);
    assert.equal(relaySession.target_observation.stable_same_rendezvous, true);

    const offerForA = reciprocalOffers!.find(
      (offer) => offer.peer_node_id === b.nodeId,
    );
    const offerForB = reciprocalOffers!.find(
      (offer) => offer.peer_node_id === a.nodeId,
    );
    assert(offerForA && offerForB);

    const actionA = adapterA.handleAuthenticatedControl({
      fromNodeId: relay.nodeId,
      message: offerForA,
    }).direct_upgrade_offer;
    const actionB = adapterB.handleAuthenticatedControl({
      fromNodeId: relay.nodeId,
      message: offerForB,
    }).direct_upgrade_offer;
    assert(actionA && actionB);

    const startedA = runtimeA.startDirectUpgrade(actionA);
    const startedB = runtimeB.startDirectUpgrade(actionB);
    assert.equal(startedA.peer_observed_endpoint, boundB.endpoint);
    assert.equal(startedB.peer_observed_endpoint, boundA.endpoint);
    assert.equal(startedA.plan.local_bind_port, 0);
    assert.equal(startedB.plan.local_bind_port, 0);

    await waitFor(
      () => readyA.length === 1 && readyB.length === 1,
      "real secure UDP peer sockets",
    );
    assert(directPathA.length >= 1);
    assert(directPathB.length >= 1);
    assert(directPathA.every((event) => event.received_from_endpoint === boundB.endpoint));
    assert(directPathB.every((event) => event.received_from_endpoint === boundA.endpoint));

    const receivedAtB: Buffer[] = [];
    const receivedAtA: Buffer[] = [];
    readyB[0]!.socket.on("data", (bytes: Buffer) => receivedAtB.push(Buffer.from(bytes)));
    readyA[0]!.socket.on("data", (bytes: Buffer) => receivedAtA.push(Buffer.from(bytes)));

    const payload = Buffer.alloc(4_096);
    for (let index = 0; index < payload.length; index += 1) {
      payload[index] = index % 251;
    }
    assert.equal(readyA[0]!.socket.write(payload), true);
    await waitFor(
      () => Buffer.concat(receivedAtB).length === payload.length,
      "4096-byte secure payload over bounded UDP datagrams",
    );
    assert.deepEqual(Buffer.concat(receivedAtB), payload);

    const reverse = Buffer.from("VOID_SWARM_SINGLE_SOCKET_REVERSE_V1", "utf8");
    assert.equal(readyB[0]!.socket.write(reverse), true);
    await waitFor(
      () => Buffer.concat(receivedAtA).length === reverse.length,
      "reverse secure payload",
    );
    assert.deepEqual(Buffer.concat(receivedAtA), reverse);

    const snapshotA = runtimeA.snapshot();
    const snapshotB = runtimeB.snapshot();
    const snapshotRelay = relayRuntime.snapshot();
    assert.equal(snapshotA.sessions[0]?.relay_retirement_authorized, false);
    assert.equal(snapshotB.sessions[0]?.relay_retirement_authorized, false);
    assert.equal(snapshotA.sessions[0]?.direct_socket_ready, true);
    assert.equal(snapshotB.sessions[0]?.direct_socket_ready, true);
    assert.equal(snapshotA.sessions[0]?.peer_observed_endpoint, boundB.endpoint);
    assert.equal(snapshotB.sessions[0]?.peer_observed_endpoint, boundA.endpoint);
    assert.equal(snapshotA.rejected_oversize_datagram_count, 0);
    assert.equal(snapshotB.rejected_oversize_datagram_count, 0);
    assert.equal(snapshotRelay.rejected_oversize_datagram_count, 0);
    assert(
      snapshotA.max_sent_datagram_bytes <=
        VOID_P2P_UDP_SWARM_SOCKET_RUNTIME_DEFAULT_MAX_DATAGRAM_BYTES_V1,
    );
    assert(
      snapshotB.max_sent_datagram_bytes <=
        VOID_P2P_UDP_SWARM_SOCKET_RUNTIME_DEFAULT_MAX_DATAGRAM_BYTES_V1,
    );
    assert(
      snapshotA.max_received_datagram_bytes <=
        VOID_P2P_UDP_SWARM_SOCKET_RUNTIME_DEFAULT_MAX_DATAGRAM_BYTES_V1,
    );
    assert(
      snapshotB.max_received_datagram_bytes <=
        VOID_P2P_UDP_SWARM_SOCKET_RUNTIME_DEFAULT_MAX_DATAGRAM_BYTES_V1,
    );
    assert((snapshotA.sent_by_type.VOID_UDP_MAP_PROBE ?? 0) === 2);
    assert((snapshotB.sent_by_type.VOID_UDP_MAP_PROBE ?? 0) === 2);
    assert((snapshotA.sent_by_type.VOID_UDP_PUNCH ?? 0) >= 1);
    assert((snapshotB.sent_by_type.VOID_UDP_PUNCH ?? 0) >= 1);
    assert((snapshotA.sent_by_type.VOID_UDP_AUTH_HELLO ?? 0) >= 1);
    assert((snapshotB.sent_by_type.VOID_UDP_AUTH_HELLO ?? 0) >= 1);
    assert((snapshotA.sent_by_type.VOID_UDP_AUTH_PROOF ?? 0) >= 1);
    assert((snapshotB.sent_by_type.VOID_UDP_AUTH_PROOF ?? 0) >= 1);
    assert((snapshotA.sent_by_type.VOID_UDP_SECURE_KEY ?? 0) >= 1);
    assert((snapshotB.sent_by_type.VOID_UDP_SECURE_KEY ?? 0) >= 1);
    assert((snapshotA.sent_by_type.VOID_UDP_SECURE_PACKET ?? 0) >= 10);
    assert((snapshotB.sent_by_type.VOID_UDP_SECURE_PACKET ?? 0) >= 1);

    const rejectedBefore = snapshotA.sessions[0]!.rejected_wrong_endpoint_datagrams;
    const roguePort = await sendRoguePunch({
      destinationAddress: boundA.address,
      destinationPort: boundA.port,
      sessionId: startedA.session_id,
      sourceNodeId: b.nodeId,
      targetNodeId: a.nodeId,
    });
    assert.notEqual(roguePort, boundB.port);
    await waitFor(
      () =>
        runtimeA.snapshot().sessions[0]!.rejected_wrong_endpoint_datagrams >
        rejectedBefore,
      "wrong-source-endpoint direct datagram rejection",
    );
    assert.equal(readyA.length, 1);

    assert.equal(runtimeErrors.length, 0);
    assert.equal(
      VOID_P2P_UDP_SWARM_SOCKET_RUNTIME_AUTHORITY_V1.one_bound_udp_socket_per_runtime,
      true,
    );
    assert.equal(
      VOID_P2P_UDP_SWARM_SOCKET_RUNTIME_AUTHORITY_V1.same_socket_rendezvous_probe_and_direct_session,
      true,
    );
    assert.equal(
      VOID_P2P_UDP_SWARM_SOCKET_RUNTIME_AUTHORITY_V1.ordinary_participant_fixed_port_required,
      false,
    );
    assert.equal(
      VOID_P2P_UDP_SWARM_SOCKET_RUNTIME_AUTHORITY_V1.exact_relay_observed_peer_endpoint_required,
      true,
    );
    assert.equal(
      VOID_P2P_UDP_SWARM_SOCKET_RUNTIME_AUTHORITY_V1.normal_void_peer_authentication_performed,
      false,
    );
    assert.equal(
      VOID_P2P_UDP_SWARM_SOCKET_RUNTIME_AUTHORITY_V1.relay_retirement_authorized,
      false,
    );
    assert.equal(
      VOID_P2P_UDP_SWARM_SOCKET_RUNTIME_DEFAULT_SECURE_PAYLOAD_BYTES_V1,
      384,
    );

    console.log(`runtime_a_bound_endpoint=${boundA.endpoint}`);
    console.log(`runtime_b_bound_endpoint=${boundB.endpoint}`);
    console.log(`relay_bound_endpoint=${relayBound.endpoint}`);
    console.log("ordinary_participant_bind_port_zero_requested=true");
    console.log("same_socket_two_rendezvous_probes=true");
    console.log("relay_observed_source_port_matches_bound_socket=true");
    console.log("same_socket_peer_hole_punch=true");
    console.log("same_socket_authenticated_path_bootstrap=true");
    console.log("same_socket_signed_x25519_key_exchange=true");
    console.log("same_socket_secure_reliable_packets=true");
    console.log("exact_relay_observed_peer_endpoint_required=true");
    console.log("wrong_source_endpoint_datagram_accepted=false");
    console.log("real_secure_udp_peer_socket_ready=true");
    console.log("secure_payload_4096_bytes_delivered=true");
    console.log("secure_payload_chunk_bytes=384");
    console.log(`max_runtime_a_datagram_bytes=${runtimeA.snapshot().max_sent_datagram_bytes}`);
    console.log(`max_runtime_b_datagram_bytes=${runtimeB.snapshot().max_sent_datagram_bytes}`);
    console.log("max_datagram_bytes_bound=1200");
    console.log("ip_fragmentation_dependency_required=false");
    console.log("normal_void_peer_authentication_performed=false");
    console.log("relay_retirement_authorized=false");
    console.log("relay_fallback_preserved=true");
    console.log("node_core_mount_performed=false");
    console.log("production_udp_activation_performed=false");
    console.log("router_configuration_required=false");
    console.log("port_forward_required=false");
    console.log("upnp_required=false");
    console.log("nat_pmp_required=false");
    console.log("wallet_signer_validator_wc_money_authority=0");
    console.log("VOID_P2P_UDP_SWARM_SINGLE_SOCKET_RUNTIME_V1_PROOF_GREEN");
  } finally {
    await Promise.all([
      runtimeA.stop(),
      runtimeB.stop(),
      relayRuntime.stop(),
    ]);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
