// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025-2026 6ZoSo9

import assert from "node:assert/strict";
import * as crypto from "node:crypto";
import * as dgram from "node:dgram";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { Node } from "../src/node_core.js";
import { deriveVoidNodeIdFromPublicPemV1 } from "../src/p2p/auth_v1.js";
import {
  createVoidUdpSwarmNodeRuntimeMountV1,
  readVoidUdpSwarmNodeRuntimeEnvironmentV1,
  registerVoidUdpSwarmNodeRuntimeReadonlyRouteV1,
  type VoidUdpSwarmNodeRuntimeEnvironmentV1,
  type VoidUdpSwarmNodeRuntimeMountV1,
} from "../src/p2p/udp_swarm_node_runtime_mount_v1.js";

type TestKeypair = {
  privateKey: crypto.KeyObject;
  publicKey: crypto.KeyObject;
  nodeId: string;
  pubPEM: string;
};

type NewNodeOptions = {
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

function setNodeEnvironment(
  dataDir: string,
  advertiseHost: string,
  bootstrap = "",
): void {
  process.env.DATA_DIR = dataDir;
  process.env.P2P_BIND_HOST = "127.0.0.1";
  process.env.P2P_ADVERTISE_HOST = advertiseHost;
  process.env.BOOTSTRAP_ADDRS = bootstrap;
}

function newNode(
  dataDir: string,
  advertiseHost: string,
  identity: TestKeypair,
  options: NewNodeOptions = {},
): Node {
  setNodeEnvironment(dataDir, advertiseHost);
  return new Node(0, identity, options);
}

async function startNode(
  node: Node,
  dataDir: string,
  advertiseHost: string,
  bootstrap = "",
): Promise<void> {
  setNodeEnvironment(dataDir, advertiseHost, bootstrap);
  await node.start();
}

async function waitFor(
  predicate: () => boolean,
  label: string,
  timeoutMs = 15_000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error(`timed out waiting for ${label}`);
}

async function reserveLoopbackUdpPort(): Promise<number> {
  const socket = dgram.createSocket("udp4");
  await new Promise<void>((resolve, reject) => {
    socket.once("error", reject);
    socket.bind(0, "127.0.0.1", resolve);
  });
  const address = socket.address();
  assert.notEqual(typeof address, "string");
  const port = typeof address === "string" ? 0 : address.port;
  await new Promise<void>((resolve) => socket.close(() => resolve()));
  assert(port > 0);
  return port;
}

function participantRuntimeConfig(
  route?: Readonly<{ relayNodeId: string; targetNodeId: string }>,
): VoidUdpSwarmNodeRuntimeEnvironmentV1 {
  return readVoidUdpSwarmNodeRuntimeEnvironmentV1({
    NODE_ENV: "test",
    VOID_P2P_UDP_SWARM_RUNTIME_ENABLED: "1",
    VOID_P2P_UDP_SWARM_TEST_ALLOW_NONPUBLIC_ENDPOINTS: "1",
    VOID_P2P_UDP_SWARM_FAMILY: "udp4",
    VOID_P2P_UDP_SWARM_BIND_HOST: "127.0.0.1",
    VOID_P2P_UDP_SWARM_BIND_PORT: "0",
    VOID_P2P_UDP_SWARM_ORCHESTRATION_ENABLED: route ? "1" : "0",
    VOID_P2P_UDP_SWARM_ORCHESTRATION_ROUTES: route
      ? `${route.relayNodeId}/${route.targetNodeId}`
      : "",
  });
}

function relayRuntimeConfig(
  port: number,
): VoidUdpSwarmNodeRuntimeEnvironmentV1 {
  return readVoidUdpSwarmNodeRuntimeEnvironmentV1({
    NODE_ENV: "test",
    VOID_P2P_RELAY_SERVER_ENABLED: "1",
    VOID_P2P_UDP_SWARM_RUNTIME_ENABLED: "1",
    VOID_P2P_UDP_SWARM_TEST_ALLOW_NONPUBLIC_ENDPOINTS: "1",
    VOID_P2P_UDP_SWARM_FAMILY: "udp4",
    VOID_P2P_UDP_SWARM_BIND_HOST: "127.0.0.1",
    VOID_P2P_UDP_SWARM_BIND_PORT: String(port),
    VOID_P2P_UDP_SWARM_RELAY_ENDPOINT: `127.0.0.1:${port}`,
  });
}

async function stopMountQuietly(
  mount: VoidUdpSwarmNodeRuntimeMountV1 | undefined,
): Promise<void> {
  if (!mount) return;
  try {
    await mount.stop();
  } catch (error) {
    console.warn(
      `[cleanup] mount.stop() failed: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

function stopNodeQuietly(node: Node | undefined): void {
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

async function main(): Promise<void> {
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), "void-p2p-udp-swarm-node-runtime-mount-v1-"),
  );
  let relay: Node | undefined;
  let target: Node | undefined;
  let source: Node | undefined;
  let relayMount: VoidUdpSwarmNodeRuntimeMountV1 | undefined;
  let targetMount: VoidUdpSwarmNodeRuntimeMountV1 | undefined;
  let sourceMount: VoidUdpSwarmNodeRuntimeMountV1 | undefined;

  try {
    const disabled = readVoidUdpSwarmNodeRuntimeEnvironmentV1({});
    assert.equal(disabled.enabled, false);
    assert.equal(disabled.bind_port, 0);
    assert.equal(disabled.relay_public_endpoint, null);
    assert.throws(
      () => readVoidUdpSwarmNodeRuntimeEnvironmentV1({
        VOID_P2P_UDP_SWARM_RUNTIME_ENABLED: "yes",
      }),
      /exact 0 or 1/,
    );
    assert.throws(
      () => readVoidUdpSwarmNodeRuntimeEnvironmentV1({
        VOID_P2P_UDP_SWARM_TEST_ALLOW_NONPUBLIC_ENDPOINTS: "1",
      }),
      /requires NODE_ENV=test/,
    );
    assert.throws(
      () => readVoidUdpSwarmNodeRuntimeEnvironmentV1({
        VOID_P2P_UDP_SWARM_RUNTIME_ENABLED: "1",
        VOID_P2P_UDP_SWARM_RELAY_ENDPOINT: "198.51.100.8:4700",
      }),
      /requires the UDP runtime and relay server/,
    );
    assert.throws(
      () => readVoidUdpSwarmNodeRuntimeEnvironmentV1({
        VOID_P2P_RELAY_SERVER_ENABLED: "1",
        VOID_P2P_UDP_SWARM_RUNTIME_ENABLED: "1",
        VOID_P2P_UDP_SWARM_BIND_PORT: "4701",
        VOID_P2P_UDP_SWARM_RELAY_ENDPOINT: "198.51.100.8:4700",
      }),
      /must match the configured family and bind port/,
    );
    assert.throws(
      () => readVoidUdpSwarmNodeRuntimeEnvironmentV1({
        VOID_P2P_UDP_SWARM_RUNTIME_ENABLED: "1",
        VOID_P2P_UDP_SWARM_ORCHESTRATION_ROUTES:
          `${"a".repeat(32)}/${"b".repeat(32)}`,
      }),
      /require exact opt-in/,
    );
    assert.throws(
      () => readVoidUdpSwarmNodeRuntimeEnvironmentV1({
        VOID_P2P_UDP_SWARM_ORCHESTRATION_ENABLED: "1",
        VOID_P2P_UDP_SWARM_ORCHESTRATION_ROUTES:
          `${"a".repeat(32)}/${"b".repeat(32)}`,
      }),
      /requires the UDP runtime/,
    );

    const relayIdentity = keypair();
    const targetIdentity = keypair();
    const sourceIdentity = keypair();
    const relayDir = path.join(root, "relay");
    const targetDir = path.join(root, "target");
    const sourceDir = path.join(root, "source");
    const relayUdpPort = await reserveLoopbackUdpPort();
    const relayEndpoint = `127.0.0.1:${relayUdpPort}`;

    const disabledIdentity = keypair();
    const disabledNode = newNode(
      path.join(root, "disabled"),
      "127.0.0.4",
      disabledIdentity,
    );
    const disabledMount = await createVoidUdpSwarmNodeRuntimeMountV1({
      node: disabledNode,
      identity: disabledIdentity,
      config: disabled,
    });
    assert.equal(disabledMount.status().started, false);
    assert.equal(disabledMount.status().bound, null);
    assert.equal(disabledNode.onUdpSwarmProbeAction, undefined);
    assert.equal(disabledNode.onUdpSwarmDirectUpgradeOffer, undefined);
    await disabledMount.stop();

    relay = newNode(relayDir, "127.0.0.1", relayIdentity, {
      relayServer: true,
      udpSwarmRelayEndpoint: relayEndpoint,
      udpSwarmAllowNonPublicEndpoint: true,
    });
    await startNode(relay, relayDir, "127.0.0.1");
    await assert.rejects(
      createVoidUdpSwarmNodeRuntimeMountV1({
        node: relay,
        identity: targetIdentity,
        config: relayRuntimeConfig(relayUdpPort),
      }),
      /identity does not match the Node/,
    );
    relayMount = await createVoidUdpSwarmNodeRuntimeMountV1({
      node: relay,
      identity: relayIdentity,
      config: relayRuntimeConfig(relayUdpPort),
    });
    const relayAddress = relay.listenAddrs[0];
    assert(relayAddress);

    // The target advertises a different loopback address so the source cannot
    // silently replace this proof's relay path with a direct TCP connection.
    target = newNode(targetDir, "127.0.0.2", targetIdentity, {
      udpSwarmAllowNonPublicEndpoint: true,
    });
    await startNode(target, targetDir, "127.0.0.2", relayAddress);
    targetMount = await createVoidUdpSwarmNodeRuntimeMountV1({
      node: target,
      identity: targetIdentity,
      config: participantRuntimeConfig(),
    });
    await waitFor(
      () => target!.peers.get(relayIdentity.nodeId)?.handshakeDone === true,
      "target authenticated direct control peer to relay",
    );
    assert(target.requestRelayReservation(relayIdentity.nodeId, 60_000));
    await waitFor(
      () => target!.relaySnapshot().client_reservations.some(
        (entry) => entry.relay_node_id === relayIdentity.nodeId,
      ),
      "target relay reservation",
    );

    source = newNode(sourceDir, "127.0.0.3", sourceIdentity, {
      udpSwarmAllowNonPublicEndpoint: true,
    });
    await startNode(source, sourceDir, "127.0.0.3", relayAddress);
    sourceMount = await createVoidUdpSwarmNodeRuntimeMountV1({
      node: source,
      identity: sourceIdentity,
      config: participantRuntimeConfig({
        relayNodeId: relayIdentity.nodeId,
        targetNodeId: targetIdentity.nodeId,
      }),
    });
    await waitFor(
      () => source!.peers.get(relayIdentity.nodeId)?.handshakeDone === true,
      "source authenticated direct control peer to relay",
    );

    await waitFor(
      () => {
        const peer = source!.peers.get(targetIdentity.nodeId);
        return peer?.handshakeDone === true && peer.transport === "relay";
      },
      "source authenticated end-to-end relay transport",
    );
    await waitFor(
      () => {
        const peer = target!.peers.get(sourceIdentity.nodeId);
        return peer?.handshakeDone === true && peer.transport === "relay";
      },
      "target authenticated end-to-end relay transport",
    );

    const sourceRelayStream = source.relaySnapshot().streams.find(
      (entry) =>
        entry.relay_node_id === relayIdentity.nodeId &&
        entry.remote_node_id === targetIdentity.nodeId &&
        entry.started,
    );
    const targetRelayStream = target.relaySnapshot().streams.find(
      (entry) =>
        entry.relay_node_id === relayIdentity.nodeId &&
        entry.remote_node_id === sourceIdentity.nodeId &&
        entry.started,
    );
    assert(sourceRelayStream && targetRelayStream);
    assert.equal(sourceRelayStream.stream_id, targetRelayStream.stream_id);

    await waitFor(
      () => source!.udpSwarmPromotedDirectRouteSnapshotV1().promoted_route_count === 1,
      "source normal-authenticated UDP candidate promotion",
    );
    await waitFor(
      () => target!.udpSwarmPromotedDirectRouteSnapshotV1().promoted_route_count === 1,
      "target normal-authenticated UDP candidate promotion",
    );
    assert.equal(source.peers.get(targetIdentity.nodeId)?.transport, "direct");
    assert.equal(target.peers.get(sourceIdentity.nodeId)?.transport, "direct");

    const sourceStatus = sourceMount.status();
    const targetStatus = targetMount.status();
    const relayStatus = relayMount.status();
    assert.equal(sourceStatus.enabled, true);
    assert.equal((sourceStatus.bound as { port: number }).port > 0, true);
    assert.equal((targetStatus.bound as { port: number }).port > 0, true);
    assert.equal((relayStatus.bound as { port: number }).port, relayUdpPort);
    assert.equal(
      (sourceStatus.node as { promoted_route_count: number })
        .promoted_route_count,
      1,
    );
    assert.equal(
      (sourceStatus.authority as { automatic_relay_connection_performed: boolean })
        .automatic_relay_connection_performed,
      true,
    );
    assert.equal(
      (sourceStatus.authority as {
        automatic_udp_upgrade_initiation_performed: boolean;
      }).automatic_udp_upgrade_initiation_performed,
      true,
    );
    const orchestrationCounters = (
      sourceStatus.orchestration as {
        counters: {
          reservation_requests: number;
          connect_requests: number;
          upgrade_requests: number;
        };
      }
    ).counters;
    assert.equal(orchestrationCounters.reservation_requests > 0, true);
    assert.equal(orchestrationCounters.connect_requests > 0, true);
    assert.equal(orchestrationCounters.upgrade_requests > 0, true);
    assert.equal(
      (sourceStatus.authority as { relay_retirement_performed: boolean })
        .relay_retirement_performed,
      false,
    );
    const publicStatusText = JSON.stringify(sourceStatus);
    for (const privateValue of [
      relayIdentity.nodeId,
      targetIdentity.nodeId,
      sourceIdentity.nodeId,
      sourceRelayStream.stream_id,
      "127.0.0.1",
    ]) {
      assert.equal(publicStatusText.includes(privateValue), false);
    }

    let registeredPath = "";
    let registeredHandler: ((request: unknown, response: any) => unknown) | undefined;
    registerVoidUdpSwarmNodeRuntimeReadonlyRouteV1({
      get: (routePath, handler) => {
        registeredPath = routePath;
        registeredHandler = handler;
      },
    }, sourceMount);
    assert.equal(registeredPath, "/p2p/udp-swarm/runtime-v1");
    let responseCode = 0;
    let responseBody: unknown;
    registeredHandler?.({}, {
      status: (code: number) => ({
        json: (body: unknown) => {
          responseCode = code;
          responseBody = body;
        },
      }),
    });
    assert.equal(responseCode, 200);
    assert.deepEqual(responseBody, sourceMount.status());

    const promotedSourcePeer = source.peers.get(targetIdentity.nodeId);
    assert(promotedSourcePeer && promotedSourcePeer.transport === "direct");
    promotedSourcePeer.socket.destroy(new Error("proof direct-path loss"));
    await waitFor(
      () => source!.peers.get(targetIdentity.nodeId)?.transport === "relay",
      "preserved relay fallback after direct-path loss",
    );
    assert.equal(
      source.udpSwarmPromotedDirectRouteSnapshotV1().promoted_route_count,
      0,
    );

    console.log(JSON.stringify({
      marker: "VOID_P2P_UDP_SWARM_NODE_RUNTIME_MOUNT_PROOF_V1",
      status: "green",
      checks: {
        exact_opt_in_environment: true,
        disabled_mount_allocated_udp_socket: false,
        node_identity_mismatch_rejected: true,
        real_single_udp_socket_per_process: true,
        authenticated_control_composed: true,
        secure_udp_socket_staged: true,
        normal_void_peer_authentication_completed: true,
        normal_peer_route_promoted: true,
        live_relay_fallback_preserved: true,
        sanitized_readonly_status: true,
        automatic_relay_orchestration_performed: true,
        relay_retirement_performed: false,
      },
    }, null, 2));
  } finally {
    await stopMountQuietly(sourceMount);
    await stopMountQuietly(targetMount);
    await stopMountQuietly(relayMount);
    stopNodeQuietly(source);
    stopNodeQuietly(target);
    stopNodeQuietly(relay);
    fs.rmSync(root, { recursive: true, force: true });
  }
}

await main();
