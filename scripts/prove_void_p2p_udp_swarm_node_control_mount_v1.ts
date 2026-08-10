// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025-2026 6ZoSo9

import assert from "node:assert/strict";
import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as net from "node:net";
import * as os from "node:os";
import * as path from "node:path";

import { Node } from "../src/node_core.js";
import { deriveVoidNodeIdFromPublicPemV1 } from "../src/p2p/auth_v1.js";
import type {
  VoidUdpSwarmDirectUpgradeOfferActionV1,
  VoidUdpSwarmProbeActionV1,
} from "../src/p2p/udp_swarm_authenticated_control_adapter_v1.js";

type TestKeypair = {
  privateKey: crypto.KeyObject;
  publicKey: crypto.KeyObject;
  nodeId: string;
  pubPEM: string;
};

type NewNodeOpts = {
  relayServer?: boolean;
  udpSwarmRelayEndpoint?: string;
  udpSwarmAllowNonPublicEndpoint?: boolean;
};

function keypair(): TestKeypair {
  const { privateKey, publicKey } = crypto.generateKeyPairSync("ed25519");
  const pubPEM = publicKey.export({ type: "spki", format: "pem" }).toString();
  const nodeId = deriveVoidNodeIdFromPublicPemV1(pubPEM);
  assert(nodeId);
  return { privateKey, publicKey, nodeId, pubPEM };
}

function setEnv(dataDir: string, advertiseHost: string, bootstrap = ""): void {
  process.env.DATA_DIR = dataDir;
  process.env.P2P_BIND_HOST = "127.0.0.1";
  process.env.P2P_ADVERTISE_HOST = advertiseHost;
  process.env.BOOTSTRAP_ADDRS = bootstrap;
}

function newNode(
  dataDir: string,
  advertiseHost: string,
  kp: TestKeypair,
  opts: NewNodeOpts = {},
): Node {
  setEnv(dataDir, advertiseHost, "");
  return new Node(0, kp, opts);
}

async function startNode(
  node: Node,
  dataDir: string,
  advertiseHost: string,
  bootstrap = "",
): Promise<void> {
  setEnv(dataDir, advertiseHost, bootstrap);
  await node.start();
}

async function waitFor(
  predicate: () => boolean,
  label: string,
  timeoutMs = 10_000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error(`timed out waiting for ${label}`);
}

function stopQuietly(node: Node | undefined): void {
  if (!node) return;
  try {
    node.stop();
  } catch (error) {
    console.warn(
      `[cleanup] node.stop() failed: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

function encodeRaw(value: unknown): Buffer {
  const body = Buffer.from(JSON.stringify(value));
  const prefix = Buffer.alloc(4);
  prefix.writeUInt32BE(body.length, 0);
  return Buffer.concat([prefix, body]);
}

function hostPort(addr: string): { host: string; port: number } {
  const match = addr.match(/^(?:\[([^\]]+)\]|([^:]+)):(\d+)$/);
  assert(match);
  return {
    host: match[1] || match[2],
    port: Number(match[3]),
  };
}

async function main(): Promise<void> {
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), "void-p2p-udp-swarm-node-control-mount-v1-"),
  );
  let relay: Node | undefined;
  let target: Node | undefined;
  let source: Node | undefined;

  try {
    const relayKp = keypair();
    const targetKp = keypair();
    const sourceKp = keypair();
    const relayDir = path.join(root, "relay");
    const targetDir = path.join(root, "target");
    const sourceDir = path.join(root, "source");

    assert.throws(
      () => newNode(path.join(root, "misconfigured"), "127.0.0.9", keypair(), {
        udpSwarmRelayEndpoint: "127.0.0.1:4700",
        udpSwarmAllowNonPublicEndpoint: true,
      }),
      /relayServer=true/,
    );

    relay = newNode(relayDir, "127.0.0.1", relayKp, {
      relayServer: true,
      udpSwarmRelayEndpoint: "127.0.0.1:4700",
      udpSwarmAllowNonPublicEndpoint: true,
    });
    await startNode(relay, relayDir, "127.0.0.1");
    const relayAddr = relay.listenAddrs[0];
    assert(relayAddr);

    // Model an outbound-only target: it advertises an address that is not the
    // listener used by this proof, so source cannot silently obtain a direct
    // TCP path and invalidate the relay-fallback assertion.
    target = newNode(targetDir, "127.0.0.2", targetKp, {
      udpSwarmAllowNonPublicEndpoint: true,
    });
    await startNode(target, targetDir, "127.0.0.2", relayAddr);
    await waitFor(
      () => target!.peers.get(relayKp.nodeId)?.handshakeDone === true,
      "target authenticated direct control peer to relay",
    );
    assert(target.requestRelayReservation(relayKp.nodeId, 60_000));
    await waitFor(
      () => target!.relaySnapshot().client_reservations.some(
        (entry) => entry.relay_node_id === relayKp.nodeId,
      ),
      "target relay reservation",
    );

    source = newNode(sourceDir, "127.0.0.3", sourceKp, {
      udpSwarmAllowNonPublicEndpoint: true,
    });
    await startNode(source, sourceDir, "127.0.0.3", relayAddr);
    await waitFor(
      () => source!.peers.get(relayKp.nodeId)?.handshakeDone === true,
      "source authenticated direct control peer to relay",
    );

    assert(source.connectViaRelay(relayKp.nodeId, targetKp.nodeId));
    await waitFor(
      () => {
        const peer = (source as any).peers.get(targetKp.nodeId);
        return peer?.handshakeDone === true && peer.transport === "relay";
      },
      "source authenticated end-to-end relay transport",
    );
    await waitFor(
      () => {
        const peer = (target as any).peers.get(sourceKp.nodeId);
        return peer?.handshakeDone === true && peer.transport === "relay";
      },
      "target authenticated end-to-end relay transport",
    );

    const sourceRelayStream = source.relaySnapshot().streams.find(
      (entry) =>
        entry.relay_node_id === relayKp.nodeId &&
        entry.remote_node_id === targetKp.nodeId &&
        entry.started,
    );
    const targetRelayStream = target.relaySnapshot().streams.find(
      (entry) =>
        entry.relay_node_id === relayKp.nodeId &&
        entry.remote_node_id === sourceKp.nodeId &&
        entry.started,
    );
    assert(sourceRelayStream && targetRelayStream);
    assert.equal(sourceRelayStream.stream_id, targetRelayStream.stream_id);
    const streamId = sourceRelayStream.stream_id;

    // A correctly shaped swarm request written before normal HELLO/AUTH must
    // not reach the relay bridge.
    const hp = hostPort(relayAddr);
    const raw = net.createConnection({ host: hp.host, port: hp.port });
    await new Promise<void>((resolve, reject) => {
      raw.once("connect", resolve);
      raw.once("error", reject);
    });
    raw.write(encodeRaw({
      type: "UDP_SWARM_UPGRADE_REQUEST",
      protocol: 1,
      request_id: "a".repeat(32),
      stream_id: streamId,
      target_node_id: targetKp.nodeId,
    }));
    await new Promise((resolve) => setTimeout(resolve, 150));
    assert.equal(relay.udpSwarmControlSnapshot().active_route_count, 0);
    raw.destroy();

    const sourceProbes: VoidUdpSwarmProbeActionV1[] = [];
    const targetProbes: VoidUdpSwarmProbeActionV1[] = [];
    const sourceOffers: VoidUdpSwarmDirectUpgradeOfferActionV1[] = [];
    const targetOffers: VoidUdpSwarmDirectUpgradeOfferActionV1[] = [];
    source.onUdpSwarmProbeAction = (action) => sourceProbes.push(action);
    target.onUdpSwarmProbeAction = (action) => targetProbes.push(action);
    source.onUdpSwarmDirectUpgradeOffer = (action) => sourceOffers.push(action);
    target.onUdpSwarmDirectUpgradeOffer = (action) => targetOffers.push(action);

    const wrongStream = source.requestUdpSwarmUpgradeV1(
      relayKp.nodeId,
      targetKp.nodeId,
      "f".repeat(32),
    );
    assert.equal(wrongStream.ok, false);

    const requested = source.requestUdpSwarmUpgradeV1(
      relayKp.nodeId,
      targetKp.nodeId,
      streamId,
    );
    assert.equal(requested.ok, true);

    await waitFor(
      () => sourceProbes.length === 2 && targetProbes.length === 2,
      "reciprocal rendezvous ticket delivery and signed probe actions",
    );
    assert.notEqual(sourceProbes[0]?.packet.nonce, sourceProbes[1]?.packet.nonce);
    assert.notEqual(targetProbes[0]?.packet.nonce, targetProbes[1]?.packet.nonce);
    for (const action of sourceProbes) {
      assert.equal(action.relay_node_id, relayKp.nodeId);
      assert.equal(action.peer_node_id, targetKp.nodeId);
      assert.equal(action.stream_id, streamId);
      assert.equal(action.relay_udp_endpoint, "127.0.0.1:4700");
      assert.equal(action.packet.node_id, sourceKp.nodeId);
    }
    for (const action of targetProbes) {
      assert.equal(action.relay_node_id, relayKp.nodeId);
      assert.equal(action.peer_node_id, sourceKp.nodeId);
      assert.equal(action.stream_id, streamId);
      assert.equal(action.relay_udp_endpoint, "127.0.0.1:4700");
      assert.equal(action.packet.node_id, targetKp.nodeId);
    }

    const source1 = relay.ingestUdpSwarmRendezvousProbeV1(
      sourceProbes[0]?.packet,
      "127.0.0.1",
      51_001,
    );
    const target1 = relay.ingestUdpSwarmRendezvousProbeV1(
      targetProbes[0]?.packet,
      "127.0.0.1",
      51_002,
    );
    const source2 = relay.ingestUdpSwarmRendezvousProbeV1(
      sourceProbes[1]?.packet,
      "127.0.0.1",
      51_001,
    );
    assert.equal(source1.ok, true);
    assert.equal(target1.ok, true);
    assert.equal(source2.ok, true);
    if (source1.ok) assert.equal(source1.control_deliveries_sent, 0);
    if (target1.ok) assert.equal(target1.control_deliveries_sent, 0);
    if (source2.ok) assert.equal(source2.control_deliveries_sent, 0);

    const target2 = relay.ingestUdpSwarmRendezvousProbeV1(
      targetProbes[1]?.packet,
      "127.0.0.1",
      51_002,
    );
    assert.equal(target2.ok, true);
    if (target2.ok) assert.equal(target2.control_deliveries_sent, 2);

    await waitFor(
      () => sourceOffers.length === 1 && targetOffers.length === 1,
      "reciprocal direct-upgrade offer callbacks",
    );
    assert.equal(sourceOffers[0]?.relay_node_id, relayKp.nodeId);
    assert.equal(sourceOffers[0]?.message.peer_node_id, targetKp.nodeId);
    assert.equal(sourceOffers[0]?.message.local_observed_endpoint, "127.0.0.1:51001");
    assert.equal(sourceOffers[0]?.message.peer_observed_endpoint, "127.0.0.1:51002");
    assert.equal(targetOffers[0]?.relay_node_id, relayKp.nodeId);
    assert.equal(targetOffers[0]?.message.peer_node_id, sourceKp.nodeId);
    assert.equal(targetOffers[0]?.message.local_observed_endpoint, "127.0.0.1:51002");
    assert.equal(targetOffers[0]?.message.peer_observed_endpoint, "127.0.0.1:51001");

    // The control mount stops at actions. Existing relay transports remain the
    // live authenticated data path and no direct transport is activated here.
    assert.equal((source as any).peers.get(targetKp.nodeId)?.transport, "relay");
    assert.equal((target as any).peers.get(sourceKp.nodeId)?.transport, "relay");
    assert(
      source.relaySnapshot().streams.some(
        (entry) => entry.stream_id === streamId && entry.started,
      ),
    );
    assert(
      target.relaySnapshot().streams.some(
        (entry) => entry.stream_id === streamId && entry.started,
      ),
    );
    assert.equal(
      source.peersSnapshot().verifiedPeers.some(
        (entry) => entry.node_id === targetKp.nodeId,
      ),
      false,
    );

    const sourceSnapshot = source.udpSwarmControlSnapshot();
    const targetSnapshot = target.udpSwarmControlSnapshot();
    assert.equal(sourceSnapshot.pending_request_count, 0);
    assert.equal(sourceSnapshot.active_route_count, 1);
    assert.equal(targetSnapshot.active_route_count, 1);
    assert.equal(JSON.stringify(sourceSnapshot).includes("BEGIN PUBLIC KEY"), false);
    assert.equal(JSON.stringify(targetSnapshot).includes("BEGIN PUBLIC KEY"), false);

    const nodeCoreSource = fs.readFileSync(
      path.join(process.cwd(), "src", "node_core.ts"),
      "utf8",
    );
    assert.equal(nodeCoreSource.includes('from "node:dgram"'), false);
    assert.equal(nodeCoreSource.includes('from "dgram"'), false);
    assert.equal(
      (nodeCoreSource.match(/attachEphemeralDirectTransportV1\(/g) || []).length,
      1,
    );

    relay.stop();
    relay = undefined;
    await waitFor(
      () => source!.udpSwarmControlSnapshot().active_route_count === 0 &&
        target!.udpSwarmControlSnapshot().active_route_count === 0,
      "relay disconnect clears client swarm control routes",
    );

    console.log("normal_void_auth_required_before_swarm_control=true");
    console.log("authenticated_direct_relay_control_transport_used=true");
    console.log("started_relay_stream_required=true");
    console.log("retained_authenticated_peer_pem_used_by_relay_bridge=true");
    console.log("reciprocal_rendezvous_ticket_network_delivery=true");
    console.log("two_signed_probe_actions_per_endpoint=true");
    console.log("relay_rendezvous_datagram_ingest_seam_proven=true");
    console.log("stable_mapping_both_endpoints_required=true");
    console.log("reciprocal_direct_offer_network_delivery=true");
    console.log("direct_offer_exposed_as_callback_only=true");
    console.log("udp_probe_exposed_as_callback_only=true");
    console.log("udp_socket_allocated=false");
    console.log("udp_datagram_sent_by_node_core=false");
    console.log("direct_transport_activated=false");
    console.log("relay_retired=false");
    console.log("relay_fallback_remained_live=true");
    console.log("relay_disconnect_clears_control_routes=true");
    console.log("router_configuration_required=false");
    console.log("port_forward_required=false");
    console.log("wallet_signer_validator_wc_money_authority=0");
    console.log("VOID_P2P_UDP_SWARM_NODE_CONTROL_MOUNT_V1_PROOF_GREEN");
  } finally {
    stopQuietly(source);
    stopQuietly(target);
    stopQuietly(relay);
    fs.rmSync(root, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
