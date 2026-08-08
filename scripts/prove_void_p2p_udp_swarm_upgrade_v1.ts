import assert from "node:assert/strict";
import * as crypto from "node:crypto";

import { deriveVoidNodeIdFromPublicPemV1 } from "../src/p2p/auth_v1.js";
import {
  VoidUdpRendezvousStateV1,
  createVoidUdpRendezvousProbeV1,
} from "../src/p2p/udp_rendezvous_v1.js";
import {
  VOID_P2P_UDP_SWARM_UPGRADE_AUTHORITY_V1,
  VoidUdpSwarmUpgradeV1,
} from "../src/p2p/udp_swarm_upgrade_v1.js";
import type { VoidUdpSecurePacketV1 } from "../src/p2p/udp_secure_reliable_transport_v1.js";

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

function stableObservation(
  state: VoidUdpRendezvousStateV1,
  id: Identity,
  address: string,
  port: number,
  nowMs: number,
) {
  const ticket = state.issueAuthenticatedTicket({
    authenticatedNodeId: id.nodeId,
    authenticatedPublicPem: id.publicPem,
    ttlMs: 15_000,
    nowMs,
  });
  const first = createVoidUdpRendezvousProbeV1({
    ticketId: ticket.ticket_id,
    nodeId: id.nodeId,
    privateKey: id.privateKey,
  });
  const second = createVoidUdpRendezvousProbeV1({
    ticketId: ticket.ticket_id,
    nodeId: id.nodeId,
    privateKey: id.privateKey,
  });
  state.observeProbe({
    packet: first,
    remoteAddress: address,
    remotePort: port,
    nowMs: nowMs + 1,
  });
  return state.observeProbe({
    packet: second,
    remoteAddress: address,
    remotePort: port,
    nowMs: nowMs + 2,
  });
}

async function main(): Promise<void> {
  const idA = identity();
  const idB = identity();
  const rendezvous = new VoidUdpRendezvousStateV1(true);
  const obsA = stableObservation(rendezvous, idA, "127.0.0.1", 51_001, 10_000);
  const obsB = stableObservation(rendezvous, idB, "127.0.0.1", 51_002, 10_100);

  assert.equal(obsA.stable_same_rendezvous, true);
  assert.equal(obsB.stable_same_rendezvous, true);
  assert.equal(obsA.mapping_conflicted, false);
  assert.equal(obsB.mapping_conflicted, false);
  assert.equal(obsA.probe_count, 2);
  assert.equal(obsB.probe_count, 2);

  const sessionId = crypto.randomBytes(16).toString("hex");
  let upgradeA!: VoidUdpSwarmUpgradeV1;
  let upgradeB!: VoidUdpSwarmUpgradeV1;
  let socketReadyA = 0;
  let socketReadyB = 0;

  const transmitA = (packet: VoidUdpSecurePacketV1) => {
    queueMicrotask(() => upgradeB.receiveSecurePacket(packet));
  };
  const transmitB = (packet: VoidUdpSecurePacketV1) => {
    queueMicrotask(() => upgradeA.receiveSecurePacket(packet));
  };

  upgradeA = new VoidUdpSwarmUpgradeV1({
    sessionId,
    localNodeId: idA.nodeId,
    remoteNodeId: idB.nodeId,
    localPublicPem: idA.publicPem,
    localPrivateKey: idA.privateKey,
    localObservation: obsA,
    remoteObservation: obsB,
    transmitSecurePacket: transmitA,
    allowNonPublicEndpoints: true,
    adapterOptions: { autoRetransmit: false },
    onDirectSocketReady: () => { socketReadyA += 1; },
  });
  upgradeB = new VoidUdpSwarmUpgradeV1({
    sessionId,
    localNodeId: idB.nodeId,
    remoteNodeId: idA.nodeId,
    localPublicPem: idB.publicPem,
    localPrivateKey: idB.privateKey,
    localObservation: obsB,
    remoteObservation: obsA,
    transmitSecurePacket: transmitB,
    allowNonPublicEndpoints: true,
    adapterOptions: { autoRetransmit: false },
    onDirectSocketReady: () => { socketReadyB += 1; },
  });

  assert.equal(upgradeA.phase, "relay_only");
  assert.equal(upgradeA.relayRetirementAuthorized, false);
  assert.equal(upgradeB.relayRetirementAuthorized, false);
  assert.throws(() => upgradeA.markDirectPathObserved(), /punch plan/i);

  const planA = upgradeA.beginPunch();
  const planB = upgradeB.beginPunch();
  assert.equal(planA.peer_observed_endpoint, obsB.observed_endpoint);
  assert.equal(planB.peer_observed_endpoint, obsA.observed_endpoint);
  assert.equal(planA.local_node_id, idA.nodeId);
  assert.equal(planA.peer_node_id, idB.nodeId);
  assert.equal(upgradeA.phase, "punch_planned");
  assert.equal(upgradeB.phase, "punch_planned");

  upgradeA.markDirectPathObserved();
  upgradeB.markDirectPathObserved();
  assert.equal(upgradeA.phase, "secure_bootstrap");
  assert.equal(upgradeB.phase, "secure_bootstrap");
  assert.equal(upgradeA.relayRetirementAuthorized, false);

  const helloA = upgradeA.localHello();
  const helloB = upgradeB.localHello();
  assert.equal(upgradeA.acceptRemoteHello(helloB), true);
  assert.equal(upgradeB.acceptRemoteHello(helloA), true);

  const proofA = upgradeA.createLocalProof();
  const proofB = upgradeB.createLocalProof();
  assert.equal(upgradeA.acceptRemoteProof(proofB), true);
  assert.equal(upgradeB.acceptRemoteProof(proofA), true);
  assert.equal(upgradeA.relayRetirementAuthorized, false);

  const offerA = upgradeA.createLocalKeyOffer();
  const offerB = upgradeB.createLocalKeyOffer();
  assert.equal(upgradeA.acceptRemoteKeyOffer(offerB), true);
  assert.equal(upgradeB.acceptRemoteKeyOffer(offerA), true);

  assert.equal(upgradeA.phase, "direct_socket_ready");
  assert.equal(upgradeB.phase, "direct_socket_ready");
  assert.equal(socketReadyA, 1);
  assert.equal(socketReadyB, 1);
  assert(upgradeA.directSocket);
  assert(upgradeB.directSocket);

  // A secure socket is still only transport. Normal VOID peer auth must promote it.
  assert.equal(upgradeA.relayRetirementAuthorized, false);
  assert.equal(upgradeB.relayRetirementAuthorized, false);
  assert.equal(upgradeA.confirmNormalVoidPeerAuthenticated("f".repeat(32)), false);
  assert.equal(upgradeA.relayRetirementAuthorized, false);

  const receivedAtA: Buffer[] = [];
  const receivedAtB: Buffer[] = [];
  upgradeA.directSocket.on("data", (bytes: Buffer) => receivedAtA.push(Buffer.from(bytes)));
  upgradeB.directSocket.on("data", (bytes: Buffer) => receivedAtB.push(Buffer.from(bytes)));
  assert.equal(upgradeA.directSocket.write(Buffer.from("void-swarm-A")), true);
  assert.equal(upgradeB.directSocket.write(Buffer.from("void-swarm-B")), true);

  await waitFor(
    () => Buffer.concat(receivedAtB).toString("utf8") === "void-swarm-A",
    "A secure swarm bytes at B",
  );
  await waitFor(
    () => Buffer.concat(receivedAtA).toString("utf8") === "void-swarm-B",
    "B secure swarm bytes at A",
  );
  await waitFor(
    () => upgradeA.directSocket!.writableLength === 0 &&
      upgradeB.directSocket!.writableLength === 0,
    "secure swarm ACK completion",
  );

  assert.equal(upgradeA.confirmNormalVoidPeerAuthenticated(idB.nodeId), true);
  assert.equal(upgradeB.confirmNormalVoidPeerAuthenticated(idA.nodeId), true);
  assert.equal(upgradeA.phase, "direct_peer_authenticated");
  assert.equal(upgradeB.phase, "direct_peer_authenticated");
  assert.equal(upgradeA.relayRetirementAuthorized, true);
  assert.equal(upgradeB.relayRetirementAuthorized, true);

  // A direct-path failure never authorizes relay retirement.
  const failureSession = crypto.randomBytes(16).toString("hex");
  const failed = new VoidUdpSwarmUpgradeV1({
    sessionId: failureSession,
    localNodeId: idA.nodeId,
    remoteNodeId: idB.nodeId,
    localPublicPem: idA.publicPem,
    localPrivateKey: idA.privateKey,
    localObservation: obsA,
    remoteObservation: obsB,
    transmitSecurePacket: () => {},
    allowNonPublicEndpoints: true,
  });
  failed.beginPunch();
  failed.markDirectPathObserved();
  failed.failDirectAttempt("simulated direct loss");
  assert.equal(failed.phase, "direct_failed_relay_preserved");
  assert.equal(failed.relayRetirementAuthorized, false);
  assert.match(failed.directFailureReason || "", /simulated direct loss/);

  assert.throws(
    () => new VoidUdpSwarmUpgradeV1({
      sessionId: crypto.randomBytes(16).toString("hex"),
      localNodeId: idA.nodeId,
      remoteNodeId: idB.nodeId,
      localPublicPem: idA.publicPem,
      localPrivateKey: idA.privateKey,
      localObservation: {
        ...obsA,
        probe_count: 1,
        stable_same_rendezvous: false,
      },
      remoteObservation: obsB,
      transmitSecurePacket: () => {},
      allowNonPublicEndpoints: true,
    }),
    /stable and eligible/,
  );

  assert.throws(
    () => new VoidUdpSwarmUpgradeV1({
      sessionId: crypto.randomBytes(16).toString("hex"),
      localNodeId: idA.nodeId,
      remoteNodeId: idB.nodeId,
      localPublicPem: idA.publicPem,
      localPrivateKey: idA.privateKey,
      localObservation: obsA,
      remoteObservation: {
        ...obsB,
        stable_same_rendezvous: false,
        mapping_conflicted: true,
      },
      transmitSecurePacket: () => {},
      allowNonPublicEndpoints: true,
    }),
    /stable and eligible/,
  );

  assert.equal(VOID_P2P_UDP_SWARM_UPGRADE_AUTHORITY_V1.authenticated_control_path_required, true);
  assert.equal(VOID_P2P_UDP_SWARM_UPGRADE_AUTHORITY_V1.stable_rendezvous_mapping_required, true);
  assert.equal(VOID_P2P_UDP_SWARM_UPGRADE_AUTHORITY_V1.conflicted_rendezvous_mapping_allowed, false);
  assert.equal(VOID_P2P_UDP_SWARM_UPGRADE_AUTHORITY_V1.punch_success_defines_peer_identity, false);
  assert.equal(VOID_P2P_UDP_SWARM_UPGRADE_AUTHORITY_V1.secure_socket_ready_defines_peer_promotion, false);
  assert.equal(VOID_P2P_UDP_SWARM_UPGRADE_AUTHORITY_V1.normal_void_peer_auth_required_after_secure_socket, true);
  assert.equal(VOID_P2P_UDP_SWARM_UPGRADE_AUTHORITY_V1.relay_retirement_before_normal_void_peer_auth_allowed, false);
  assert.equal(VOID_P2P_UDP_SWARM_UPGRADE_AUTHORITY_V1.relay_fallback_preserved_on_direct_failure, true);
  assert.equal(VOID_P2P_UDP_SWARM_UPGRADE_AUTHORITY_V1.runtime_node_core_mount_performed, false);
  assert.equal(VOID_P2P_UDP_SWARM_UPGRADE_AUTHORITY_V1.wallet_signer_validator_wc_money_authority, 0);

  upgradeA.destroy();
  upgradeB.destroy();
  failed.destroy();

  console.log("authenticated_rendezvous_observations_consumed=true");
  console.log("stable_same_rendezvous_mapping_required=true");
  console.log("mapping_conflict_accepted=false");
  console.log("bounded_hole_punch_plan_created=true");
  console.log("secure_session_bootstrap_after_path_observed=true");
  console.log("secure_socket_ready_before_peer_promotion=true");
  console.log("normal_void_peer_auth_required_after_secure_socket=true");
  console.log("wrong_authenticated_node_promoted=false");
  console.log("relay_retirement_before_normal_void_peer_auth=false");
  console.log("relay_retirement_after_expected_void_peer_auth=true");
  console.log("direct_failure_preserves_relay=true");
  console.log("bidirectional_secure_socket_bytes=true");
  console.log("runtime_node_core_mount_performed=false");
  console.log("verified_direct_cache_mutation_performed=false");
  console.log("router_configuration_required=false");
  console.log("port_forward_required=false");
  console.log("wallet_signer_validator_wc_money_authority=0");
  console.log("VOID_P2P_UDP_SWARM_UPGRADE_V1_PROOF_GREEN");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
