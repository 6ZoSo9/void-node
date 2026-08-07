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
import {
  VOID_P2P_RELAY_MAX_DATA_BYTES_V1,
  VOID_P2P_RELAY_MAX_STREAMS_PER_PEER_V1,
  VOID_P2P_RELAY_REQUEST_TIMEOUT_MS_V1,
  VoidRelayServerStateV1,
  VoidRelayVirtualSocketV1,
  newVoidRelayIdV1,
  normalizeVoidRelayControlMessageV1,
  voidRelayClientExpiryV1,
  voidRelayRequestTimedOutV1,
  voidRelayWritableQueueWithinBoundV1,
} from "../src/p2p/relay_v1.js";

const MARKER = "VOID_P2P_RELAY_RESERVATION_V1_PROOF_GREEN";

type TestKeypair = {
  privateKey: crypto.KeyObject;
  publicKey: crypto.KeyObject;
  nodeId: string;
  pubPEM: string;
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
  relayServer = false,
): Node {
  setEnv(dataDir, advertiseHost, "");
  return new Node(0, kp, { relayServer });
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

const root = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-p2p-relay-reservation-v1-"),
);

let relayA: Node | undefined;
let relayB: Node | undefined;
let target: Node | undefined;
let source: Node | undefined;
let pinClient: Node | undefined;
let pinImpostor: Node | undefined;

try {
  const relayAKp = keypair();
  const relayBKp = keypair();
  const targetKp = keypair();
  const sourceKp = keypair();

  const relayADir = path.join(root, "relay-a");
  const relayBDir = path.join(root, "relay-b");
  const targetDir = path.join(root, "target");
  const sourceDir = path.join(root, "source");

  relayA = newNode(relayADir, "127.0.0.1", relayAKp, true);
  await startNode(relayA, relayADir, "127.0.0.1");
  relayB = newNode(relayBDir, "127.0.0.1", relayBKp, true);
  await startNode(relayB, relayBDir, "127.0.0.1");

  const relayAAddr = relayA.listenAddrs[0];
  const relayBAddr = relayB.listenAddrs[0];
  assert(relayAAddr && relayBAddr);

  // Unauthenticated control must be ignored before the normal HELLO/AUTH gate.
  const beforeUnauth = relayA.relaySnapshot().server.reservation_count;
  const hp = hostPort(relayAAddr);
  const raw = net.createConnection({ host: hp.host, port: hp.port });
  await new Promise<void>((resolve, reject) => {
    raw.once("connect", resolve);
    raw.once("error", reject);
  });
  raw.write(
    encodeRaw({
      type: "RELAY_RESERVE",
      request_id: "a".repeat(32),
      ttl_ms: 60_000,
    }),
  );
  await new Promise((resolve) => setTimeout(resolve, 150));
  assert.equal(relayA.relaySnapshot().server.reservation_count, beforeUnauth);
  raw.destroy();

  // Target advertises an intentionally non-listening loopback alias, modeling
  // an outbound-only node whose direct advertised path cannot be used here.
  target = newNode(targetDir, "127.0.0.2", targetKp);
  await startNode(target, targetDir, "127.0.0.2", `${relayAAddr},${relayBAddr}`);
  await waitFor(
    () =>
      target!.peersSnapshot().connected.some((p) => p.id === relayAKp.nodeId) &&
      target!.peersSnapshot().connected.some((p) => p.id === relayBKp.nodeId),
    "target authenticated to both relays",
  );

  assert(target.requestRelayReservation(relayAKp.nodeId, 120_000));
  assert(target.requestRelayReservation(relayBKp.nodeId, 120_000));
  await waitFor(
    () => target!.relaySnapshot().client_reservations.length === 2,
    "two independent relay reservations",
  );
  assert.equal(relayA.relaySnapshot().server.reservation_count, 1);
  assert.equal(relayB.relaySnapshot().server.reservation_count, 1);

  const targetRelayBPeer = target.peers.get(relayBKp.nodeId);
  assert(targetRelayBPeer?.handshakeDone);
  const targetRelayBReservation = target
    .relaySnapshot()
    .client_reservations.find(
      (entry) => entry.relay_node_id === relayBKp.nodeId,
    );
  assert(targetRelayBReservation);
  const beforeWrongReservation = target.relaySnapshot().streams.length;
  (target as any).onRelayControlMessage(targetRelayBPeer, {
    type: "RELAY_INCOMING",
    stream_id: newVoidRelayIdV1(),
    source_node_id: keypair().nodeId,
    target_node_id: targetKp.nodeId,
    reservation_id: "0".repeat(32),
  });
  assert.equal(
    target.relaySnapshot().streams.length,
    beforeWrongReservation,
  );

  source = newNode(sourceDir, "127.0.0.3", sourceKp);
  await startNode(source, sourceDir, "127.0.0.3", `${relayAAddr},${relayBAddr}`);
  await waitFor(
    () =>
      source!.peersSnapshot().connected.some((p) => p.id === relayAKp.nodeId) &&
      source!.peersSnapshot().connected.some((p) => p.id === relayBKp.nodeId),
    "source authenticated to both relays",
  );

  await new Promise((resolve) => setTimeout(resolve, 250));
  assert.equal(
    source.peersSnapshot().connected.some((p) => p.id === targetKp.nodeId),
    false,
  );

  assert(source.connectViaRelay(relayAKp.nodeId, targetKp.nodeId));
  await waitFor(
    () =>
      (() => {
        const p = (source as any).peers.get(targetKp.nodeId);
        return (
          p?.transport === "relay" &&
          p?.relayViaNodeId === relayAKp.nodeId
        );
      })(),
    "source authenticated end-to-end through relay A",
  );
  await waitFor(
    () =>
      (() => {
        const p = (target as any).peers.get(sourceKp.nodeId);
        return (
          p?.transport === "relay" &&
          p?.relayViaNodeId === relayAKp.nodeId
        );
      })(),
    "target authenticated end-to-end through relay A",
  );

  // Relay success is not direct dialability evidence.
  assert.equal(
    source.peersSnapshot().verifiedPeers.some(
      (record) => record.node_id === targetKp.nodeId,
    ),
    false,
  );

  relayA.stop();
  relayA = undefined;
  await waitFor(
    () =>
      (source as any).peers.get(targetKp.nodeId)?.transport !== "relay",
    "relay A stream close",
  );

  assert(source.connectViaRelay(relayBKp.nodeId, targetKp.nodeId));
  await waitFor(
    () =>
      (() => {
        const p = (source as any).peers.get(targetKp.nodeId);
        return (
          p?.transport === "relay" &&
          p?.relayViaNodeId === relayBKp.nodeId
        );
      })(),
    "healthy relay B after relay A loss",
  );

  // A working direct path must supersede a relayed path.
  const targetAddress = target.server.address();
  assert(targetAddress && typeof targetAddress === "object");
  source.connect(`127.0.0.1:${targetAddress.port}`, targetKp.nodeId);
  await waitFor(
    () =>
      (source as any).peers.get(targetKp.nodeId)?.transport === "direct",
    "direct path supersedes relay path",
  );
  assert(
    source.peersSnapshot().verifiedPeers.some(
      (record) => record.node_id === targetKp.nodeId,
    ),
  );

  const publicPeerSnapshot = source.peersSnapshot() as any;
  assert.deepEqual(
    Object.keys(publicPeerSnapshot).sort(),
    ["connected", "knownAddrs", "verifiedPeers"].sort(),
  );
  for (const connectedPeer of publicPeerSnapshot.connected) {
    assert.equal("transport" in connectedPeer, false);
    assert.equal("relay_via_node_id" in connectedPeer, false);
    assert.equal("relay_stream_id" in connectedPeer, false);
  }

  // Pure state boundaries: expiration, self/loop rejection, and frame size.
  const state = new VoidRelayServerStateV1();
  const stateTarget = keypair().nodeId;
  const stateSource = keypair().nodeId;
  const now = 1_000_000;
  state.reserve(stateTarget, 1_000, now);
  assert.throws(
    () => state.openStream(stateSource, stateTarget, now + 1_001),
    /no active reservation/,
  );

  const loopState = new VoidRelayServerStateV1();
  loopState.reserve(stateTarget, 60_000, now);
  assert.throws(
    () => loopState.openStream(stateTarget, stateTarget, now),
    /self\/loop/,
  );

  assert.equal(
    normalizeVoidRelayControlMessageV1({
      type: "RELAY_DATA",
      stream_id: newVoidRelayIdV1(),
      data_b64: Buffer.alloc(
        VOID_P2P_RELAY_MAX_DATA_BYTES_V1 + 1,
        0x41,
      ).toString("base64"),
    }),
    undefined,
  );

  const requestedAt = 2_000_000;
  assert.equal(
    voidRelayClientExpiryV1(
      requestedAt,
      60_000,
      120_000,
      requestedAt + 10,
    ),
    undefined,
  );
  assert.equal(
    voidRelayClientExpiryV1(
      requestedAt,
      60_000,
      30_000,
      requestedAt + 10,
    ),
    requestedAt + 30_000,
  );
  assert.equal(
    voidRelayClientExpiryV1(
      requestedAt,
      60_000,
      30_000,
      requestedAt + 30_001,
    ),
    undefined,
  );
  assert.equal(
    voidRelayRequestTimedOutV1(
      requestedAt,
      requestedAt + VOID_P2P_RELAY_REQUEST_TIMEOUT_MS_V1,
    ),
    false,
  );
  assert.equal(
    voidRelayRequestTimedOutV1(
      requestedAt,
      requestedAt + VOID_P2P_RELAY_REQUEST_TIMEOUT_MS_V1 + 1,
    ),
    true,
  );
  assert.equal(
    voidRelayWritableQueueWithinBoundV1(0, 1024),
    true,
  );
  assert.equal(
    voidRelayWritableQueueWithinBoundV1(
      128 * 1024,
      1,
    ),
    false,
  );

  // Stale pending requests are reclaimed even if an authenticated peer ignores
  // all relay responses.
  const staleRequestId = newVoidRelayIdV1();
  (source as any).relayPendingConnects.set(staleRequestId, {
    relay_node_id: relayBKp.nodeId,
    target_node_id: targetKp.nodeId,
    requested_at_ms:
      Date.now() - VOID_P2P_RELAY_REQUEST_TIMEOUT_MS_V1 - 1,
  });
  (source as any).sweepRelayClientState(Date.now());
  assert.equal(
    (source as any).relayPendingConnects.has(staleRequestId),
    false,
  );

  // A malicious authenticated relay cannot allocate unbounded local streams,
  // and incoming setup is bound to the exact active reservation ID.
  await waitFor(
    () => target!.relaySnapshot().streams.length === 0,
    "relay B stream cleanup after direct takeover",
  );
  const capRelayPeer = target.peers.get(relayBKp.nodeId);
  assert(capRelayPeer?.handshakeDone);
  const capReservation = target
    .relaySnapshot()
    .client_reservations.find(
      (entry) => entry.relay_node_id === relayBKp.nodeId,
    );
  assert(capReservation);
  for (let index = 0; index < VOID_P2P_RELAY_MAX_STREAMS_PER_PEER_V1 + 1; index += 1) {
    let sourceNodeId = keypair().nodeId;
    while (
      sourceNodeId === targetKp.nodeId ||
      sourceNodeId === relayBKp.nodeId
    ) {
      sourceNodeId = keypair().nodeId;
    }
    (target as any).onRelayControlMessage(capRelayPeer, {
      type: "RELAY_INCOMING",
      stream_id: newVoidRelayIdV1(),
      source_node_id: sourceNodeId,
      target_node_id: targetKp.nodeId,
      reservation_id: capReservation.reservation_id,
    });
  }
  assert.equal(
    target.relaySnapshot().streams.filter(
      (entry) => entry.relay_node_id === relayBKp.nodeId,
    ).length,
    VOID_P2P_RELAY_MAX_STREAMS_PER_PEER_V1,
  );

  const collisionRelay = target.peers.get(relayBKp.nodeId);
  assert(collisionRelay);
  const collisionStreamId = newVoidRelayIdV1();
  const collisionSourceA = keypair().nodeId;
  const collisionSourceB = keypair().nodeId;
  assert.equal(
    (target as any).stageRelayEndpoint(
      collisionRelay,
      collisionStreamId,
      collisionSourceA,
      false,
    ),
    false,
  );
  // Capacity is currently full, so use a separate memory-only node for the
  // exact stream-id rebind semantic.
  const collisionNodeDir = path.join(root, "collision-node");
  const collisionNode = newNode(collisionNodeDir, "127.0.0.6", keypair());
  await startNode(collisionNode, collisionNodeDir, "127.0.0.6");
  const fakeRelayWrites: Buffer[] = [];
  const fakeRelayPeer = {
    id: relayBKp.nodeId,
    transport: "direct",
    socket: {
      writableLength: 0,
      write(data: Uint8Array | string) {
        fakeRelayWrites.push(Buffer.from(data));
        return true;
      },
    },
  };
  assert.equal(
    (collisionNode as any).stageRelayEndpoint(
      fakeRelayPeer,
      collisionStreamId,
      collisionSourceA,
      false,
    ),
    true,
  );
  assert.equal(
    (collisionNode as any).stageRelayEndpoint(
      fakeRelayPeer,
      collisionStreamId,
      collisionSourceB,
      false,
    ),
    false,
  );
  const collisionEntry = collisionNode
    .relaySnapshot()
    .streams.find((entry) => entry.stream_id === collisionStreamId);
  assert.equal(collisionEntry?.remote_node_id, collisionSourceA);
  assert(fakeRelayWrites.length >= 1);
  stopQuietly(collisionNode);

  // Explicit expected-node-id pin on a relayed virtual transport.
  const pinClientDir = path.join(root, "pin-client");
  const pinImpostorDir = path.join(root, "pin-impostor");
  const pinClientKp = keypair();
  const pinImpostorKp = keypair();
  const expectedDifferentKp = keypair();

  pinClient = newNode(pinClientDir, "127.0.0.4", pinClientKp);
  await startNode(pinClient, pinClientDir, "127.0.0.4");
  pinImpostor = newNode(pinImpostorDir, "127.0.0.5", pinImpostorKp);
  await startNode(pinImpostor, pinImpostorDir, "127.0.0.5");

  const memoryStream = newVoidRelayIdV1();
  let socketA!: VoidRelayVirtualSocketV1;
  let socketB!: VoidRelayVirtualSocketV1;
  socketA = new VoidRelayVirtualSocketV1(
    memoryStream,
    (data) => socketB.feedBase64(data),
    (reason) => socketB.remoteClose(reason),
  );
  socketB = new VoidRelayVirtualSocketV1(
    memoryStream,
    (data) => socketA.feedBase64(data),
    (reason) => socketA.remoteClose(reason),
  );

  const relayIdentityWarnings: unknown[][] = [];
  const originalWarn = console.warn;
  console.warn = (...args: unknown[]) => {
    relayIdentityWarnings.push(args);
    originalWarn(...args);
  };

  (pinClient as any).attachSocket(
    socketA,
    `relay:memory/${memoryStream}`,
    true,
    expectedDifferentKp.nodeId,
    undefined,
    "relay",
    "f".repeat(32),
    memoryStream,
  );
  socketA.activate();
  (pinImpostor as any).attachSocket(
    socketB,
    `relay:memory/${memoryStream}`,
    false,
    pinClientKp.nodeId,
    undefined,
    "relay",
    "e".repeat(32),
    memoryStream,
  );
  socketB.activate();

  await new Promise((resolve) => setTimeout(resolve, 350));
  console.warn = originalWarn;
  assert.equal(
    pinClient.peersSnapshot().connected.some(
      (p) => p.id === pinImpostorKp.nodeId,
    ),
    false,
  );
  assert(
    relayIdentityWarnings.some(
      (entry) =>
        entry[0] === "VOID_P2P_RELAY_DESTINATION_IDENTITY_MISMATCH_V1",
    ),
  );
  assert.equal(
    relayIdentityWarnings.some(
      (entry) =>
        entry[0] === "VOID_P2P_VERIFIED_PEER_CACHE_IDENTITY_MISMATCH_V1" &&
        typeof entry[1] === "object" &&
        entry[1] !== null &&
        String((entry[1] as any).address || "").startsWith("relay:"),
    ),
    false,
  );

  console.log("[PASS] unauthenticated socket cannot reserve relay capacity");
  console.log("[PASS] target holds two independent authenticated relay reservations");
  console.log("[PASS] relay A preserves end-to-end VOID peer authentication");
  console.log("[PASS] relay success is not promoted to verified-direct cache evidence");
  console.log("[PASS] relay B remains usable after relay A disappears");
  console.log("[PASS] healthy direct path supersedes relayed transport");
  console.log("[PASS] expired reservations, relay loops, and oversized frames fail closed");
  console.log("[PASS] relay reservation TTL is bounded by the local request clock");
  console.log("[PASS] ignored relay requests expire and free pending capacity");
  console.log("[PASS] relay forwarding queue has an explicit byte ceiling");
  console.log("[PASS] incoming streams require the exact active reservation ID");
  console.log("[PASS] authenticated relay cannot allocate unbounded local streams");
  console.log("[PASS] relay stream ID cannot be rebound to a different endpoint");
  console.log("[PASS] public peer snapshot shape does not expose relay internals");
  console.log("[PASS] stream-ID adversarial fixture uses a real bounded sink socket");
  console.log("[PASS] relayed identity mismatch uses relay-specific truth logging");

  console.log(MARKER);
  console.log("authenticated_reservation_required=true");
  console.log("end_to_end_peer_auth_preserved=true");
  console.log("relay_defines_node_identity=false");
  console.log("identity_mismatched_destination_accepted=false");
  console.log("multiple_relay_reservations_independent=true");
  console.log("healthy_relay_connected_with_dead_sibling=true");
  console.log("direct_path_suppressed_by_relay=false");
  console.log("relayed_peer_promoted_to_verified_direct_cache=false");
  console.log("relay_reservation_client_ttl_bounded=true");
  console.log("relay_pending_request_timeout_bounded=true");
  console.log("relay_forwarding_queue_bounded=true");
  console.log("incoming_reservation_id_bound=true");
  console.log("relay_local_stream_allocation_bounded=true");
  console.log("relay_stream_id_rebind_accepted=false");
  console.log("public_peer_snapshot_relay_metadata_exposed=false");
  console.log("relay_transport_confidentiality_claimed=false");
  console.log("relay_transport_integrity_claimed=false");
  console.log("relay_rebind_fixture_socket_write_failure=false");
  console.log("relay_identity_mismatch_log_semantic=true");
  console.log("expired_reservation_used=false");
  console.log("oversized_relay_frame_accepted=false");
  console.log("relay_loop_accepted=false");
  console.log("single_required_relay=false");
  console.log("cloud_provider_dependency=false");
  console.log("dns_provider_dependency=false");
  console.log("tailnet_dependency=false");
  console.log("deployment_performed=false");
  console.log("wallet_signer_validator_wc_money_authority=0");
} finally {
  stopQuietly(pinImpostor);
  stopQuietly(pinClient);
  stopQuietly(source);
  stopQuietly(target);
  stopQuietly(relayB);
  stopQuietly(relayA);

  delete process.env.BOOTSTRAP_ADDRS;
  delete process.env.P2P_BIND_HOST;
  delete process.env.P2P_ADVERTISE_HOST;
  delete process.env.DATA_DIR;

  await new Promise((resolve) => setTimeout(resolve, 150));
  fs.rmSync(root, { recursive: true, force: true });
}
