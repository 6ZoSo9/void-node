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
  VoidDirectUpgradeRelayStateV1,
  normalizeVoidDirectUpgradeControlMessageV1,
} from "../src/p2p/direct_upgrade_v1.js";
import {
  VOID_RETIRED_P2P_IDENTITIES_V1,
  isVoidRetiredP2PNodeIdV1,
} from "../src/p2p/retired_peer_identities_v1.js";
import {
  loadVoidVerifiedPeerCacheV1,
  rememberVoidAuthenticatedPeerV1,
  voidVerifiedPeerCachePathV1,
  voidVerifiedPeerDialTargetsV1,
  writeVoidVerifiedPeerCacheV1,
} from "../src/p2p/verified_peer_cache_v1.js";

const LEGACY_RAILWAY_NODE_ID = "4f93300760f94834139babd2b54d2619";
const MARKER = "VOID_P2P_RETIRED_PEER_IDENTITY_V1_PROOF_GREEN";

function keypair() {
  const { privateKey, publicKey } = crypto.generateKeyPairSync("ed25519");
  const pubPEM = publicKey.export({ type: "spki", format: "pem" }).toString();
  const nodeId = deriveVoidNodeIdFromPublicPemV1(pubPEM);
  assert(nodeId);
  return { privateKey, publicKey, nodeId, pubPEM };
}
function setEnv(dataDir: string): void {
  process.env.DATA_DIR = dataDir;
  process.env.P2P_BIND_HOST = "127.0.0.1";
  process.env.P2P_ADVERTISE_HOST = "127.0.0.1";
  process.env.BOOTSTRAP_ADDRS = "";
}
function record(nodeId: string, address: string) {
  return { node_id: nodeId, addresses: [address], last_authenticated_at_ms: Date.now() };
}
async function waitFor(predicate: () => boolean, label: string): Promise<void> {
  const deadline = Date.now() + 8000;
  while (Date.now() < deadline) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error("timed out: " + label);
}
async function listen(server: net.Server): Promise<number> {
  return await new Promise<number>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      assert(address && typeof address === "object");
      resolve(address.port);
    });
  });
}

assert(VOID_RETIRED_P2P_IDENTITIES_V1.some((entry) => entry.node_id === LEGACY_RAILWAY_NODE_ID));
assert.equal(isVoidRetiredP2PNodeIdV1(LEGACY_RAILWAY_NODE_ID), true);
assert.equal(isVoidRetiredP2PNodeIdV1("a".repeat(32)), false);
assert.equal(isVoidRetiredP2PNodeIdV1("INVALID"), false);

const root = fs.mkdtempSync(path.join(os.tmpdir(), "void-retired-peer-v1-"));
let healthy: Node | undefined;
let client: Node | undefined;
let legacyListener: net.Server | undefined;
let legacyTcpConnections = 0;
let retiredTorSocksConnections = 0;
let retiredTorSocksListener: net.Server | undefined;

try {
  legacyListener = net.createServer((socket) => {
    legacyTcpConnections += 1;
    socket.destroy();
  });
  const legacyPort = await listen(legacyListener);
  const legacyAddress = "127.0.0.1:" + legacyPort;
  const healthyKeys = keypair();
  const clientKeys = keypair();
  assert.equal(isVoidRetiredP2PNodeIdV1(healthyKeys.nodeId), false);
  assert.notEqual(clientKeys.nodeId, healthyKeys.nodeId);

  setEnv(path.join(root, "healthy"));
  healthy = new Node(0, healthyKeys);
  await healthy.start();
  const healthyAddress = healthy.listenAddrs[0];
  assert(healthyAddress);

  const clientDir = path.join(root, "client");
  const cachePath = voidVerifiedPeerCachePathV1(clientDir);
  fs.mkdirSync(path.dirname(cachePath), { recursive: true, mode: 0o700 });
  const legacyRecord = record(LEGACY_RAILWAY_NODE_ID, legacyAddress);
  const healthyRecord = record(healthyKeys.nodeId, healthyAddress);
  fs.writeFileSync(cachePath, JSON.stringify({ version: 1, peers: [legacyRecord, healthyRecord] }) + "\n", { mode: 0o600 });

  const rawBeforeRead = fs.readFileSync(cachePath, "utf8");
  const loaded = loadVoidVerifiedPeerCacheV1(cachePath);
  assert.equal(loaded.valid, true, loaded.reason);
  assert.deepEqual(loaded.records.map((peer) => peer.node_id), [healthyKeys.nodeId]);
  assert.equal(fs.readFileSync(cachePath, "utf8"), rawBeforeRead, "loading must not rewrite cache");

  const targets = voidVerifiedPeerDialTargetsV1([legacyRecord, healthyRecord], clientKeys.nodeId);
  assert.deepEqual(targets.map((target) => target.node_id), [healthyKeys.nodeId]);
  assert.throws(
    () => writeVoidVerifiedPeerCacheV1(cachePath, [legacyRecord, healthyRecord]),
    /refusing to persist retired/,
  );
  assert.equal(fs.readFileSync(cachePath, "utf8"), rawBeforeRead);
  assert.throws(
    () => rememberVoidAuthenticatedPeerV1(cachePath, clientKeys.nodeId, LEGACY_RAILWAY_NODE_ID, [legacyAddress]),
    /refusing retired authenticated/,
  );

  setEnv(clientDir);
  client = new Node(0, clientKeys);
  await client.start();
  await waitFor(
    () => client!.peersSnapshot().connected.some((peer) => peer.id === healthyKeys.nodeId),
    "nonretired peer reconnect",
  );
  await new Promise((resolve) => setTimeout(resolve, 600));
  assert.equal(legacyTcpConnections, 0, "retired cache entry must not be dialed");
  assert.equal(client.peersSnapshot().connected.some((peer) => peer.id === LEGACY_RAILWAY_NODE_ID), false);
  assert.equal(client.peersSnapshot().verifiedPeers.some((peer) => peer.node_id === LEGACY_RAILWAY_NODE_ID), false);

  // Even a caller explicitly holding the retired node-ID pin cannot dial it.
  client.connect(legacyAddress, LEGACY_RAILWAY_NODE_ID);
  await new Promise((resolve) => setTimeout(resolve, 250));
  assert.equal(legacyTcpConnections, 0, "explicit pinned reconnect must refuse retired identity");

  // The direct-upgrade control boundary must reject the retired identity before
  // a relay session, local upgrade session, timer, or TCP attempt can exist.
  const directRequestId = "1".repeat(32);
  const directStreamId = "2".repeat(32);
  const directSessionId = "3".repeat(32);
  assert.equal(
    normalizeVoidDirectUpgradeControlMessageV1({
      type: "DIRECT_UPGRADE_REQUEST",
      request_id: directRequestId,
      stream_id: directStreamId,
      target_node_id: LEGACY_RAILWAY_NODE_ID,
      start_delay_ms: 50,
      attempt_timeout_ms: 1000,
    }, true),
    undefined,
  );
  assert.equal(
    normalizeVoidDirectUpgradeControlMessageV1({
      type: "DIRECT_UPGRADE_OFFER",
      request_id: directRequestId,
      session_id: directSessionId,
      stream_id: directStreamId,
      peer_node_id: LEGACY_RAILWAY_NODE_ID,
      peer_observed_address: legacyAddress,
      start_delay_ms: 50,
      attempt_timeout_ms: 1000,
    }, true),
    undefined,
  );

  const acceptedDirectRequest = normalizeVoidDirectUpgradeControlMessageV1({
    type: "DIRECT_UPGRADE_REQUEST",
    request_id: directRequestId,
    stream_id: directStreamId,
    target_node_id: healthyKeys.nodeId,
    start_delay_ms: 50,
    attempt_timeout_ms: 1000,
  }, true);
  assert.equal(acceptedDirectRequest?.type, "DIRECT_UPGRADE_REQUEST");

  const directRelayState = new VoidDirectUpgradeRelayStateV1();
  assert.throws(
    () => directRelayState.openSession({
      requestId: directRequestId,
      streamId: directStreamId,
      sourceNodeId: clientKeys.nodeId,
      targetNodeId: LEGACY_RAILWAY_NODE_ID,
      sourceObservedAddress: healthyAddress,
      targetObservedAddress: legacyAddress,
      startDelayMs: 50,
      attemptTimeoutMs: 1000,
      allowNonPublicObservedAddress: true,
    }),
    /direct-upgrade relay session input is invalid/,
  );
  assert.equal(directRelayState.snapshot().session_count, 0);

  const healthyDirectSession = directRelayState.openSession({
    requestId: directRequestId,
    streamId: directStreamId,
    sourceNodeId: clientKeys.nodeId,
    targetNodeId: healthyKeys.nodeId,
    sourceObservedAddress: legacyAddress,
    targetObservedAddress: healthyAddress,
    startDelayMs: 50,
    attemptTimeoutMs: 1000,
    allowNonPublicObservedAddress: true,
  });
  assert.equal(healthyDirectSession.target_node_id, healthyKeys.nodeId);
  assert.equal(directRelayState.snapshot().session_count, 1);
  directRelayState.removePeer(healthyKeys.nodeId);
  assert.equal(directRelayState.snapshot().session_count, 0);
  assert.equal(legacyTcpConnections, 0, "retired direct-upgrade control must not open TCP");

  // A retired Tor target must never open a SOCKS connection, reserve a Tor dial
  // slot, or seed a reconnection backoff even when a caller passes the target
  // directly to the Tor-specific runtime functions. No actual Tor host is used.
  retiredTorSocksListener = net.createServer((socket) => {
    retiredTorSocksConnections += 1;
    socket.destroy();
  });
  const socksPort = await listen(retiredTorSocksListener);
  const onion = "a".repeat(56) + ".onion";
  const retiredTorTarget = Object.freeze({
    introduction_id: "test-retired-tor",
    endpoint: `tor://${onion}:4700`,
    onion_hostname: onion,
    onion_port: 4700,
    expected_node_id: LEGACY_RAILWAY_NODE_ID,
    socks_host: "127.0.0.1",
    socks_port: socksPort,
    timeout_ms: 1000,
  });
  (client as any).scheduleTorBootstrapReconnectV1(retiredTorTarget);
  await (client as any).connectTorBootstrapIntroductionV1(retiredTorTarget);
  await new Promise((resolve) => setTimeout(resolve, 100));
  assert.equal(retiredTorSocksConnections, 0, "retired Tor identity must not connect to SOCKS");
  assert.equal(
    (client as any).torBootstrapDialing.has(retiredTorTarget.endpoint),
    false,
    "retired Tor identity must not reserve a Tor dial slot",
  );
  assert.equal(
    (client as any).torBootstrapBackoff.has(retiredTorTarget.endpoint),
    false,
    "retired Tor identity must not schedule a retry",
  );

  // Ephemeral socket mounts refuse a retired identity before any AUTH work.
  // On rejection the unused socket remains owned by its caller.
  const rejectedEphemeralSocket = new net.Socket();
  assert.equal(
    client.attachEphemeralDirectTransportV1(
      rejectedEphemeralSocket,
      LEGACY_RAILWAY_NODE_ID,
      "retired:test-peer",
    ),
    false,
  );
  assert.equal(rejectedEphemeralSocket.destroyed, false);
  rejectedEphemeralSocket.destroy();

  // The next normal authenticated cache write removes stale legacy entries,
  // preserving legitimate identities. No startup-time filesystem write occurs.
  const durableAfterAuth = JSON.parse(fs.readFileSync(cachePath, "utf8"));
  assert(durableAfterAuth.peers.some((peer: {node_id: string}) => peer.node_id === healthyKeys.nodeId));
  assert(durableAfterAuth.peers.every((peer: {node_id: string}) => peer.node_id !== LEGACY_RAILWAY_NODE_ID));

  console.log("retired_identity_authenticated_admission_policy=true");
  console.log("legacy_record_not_loaded_or_redialed=true");
  console.log("retired_direct_upgrade_control_and_relay_session_blocked=true");
  console.log("retired_tor_pre_dial_and_reconnect_blocked=true");
  console.log("retired_ephemeral_socket_admission_blocked=true");
  console.log("unrelated_peer_authentication_preserved=true");
  console.log("legacy_record_pruned_by_normal_cache_write=true");
  console.log("wallet_or_signer_access=false");
  console.log(MARKER);
} finally {
  try {
    client?.stop();
  } catch (error) {
    console.warn("VOID_P2P_RETIRED_PEER_V1_CLIENT_CLEANUP_FAILURE_VISIBLE", error);
  }
  try {
    healthy?.stop();
  } catch (error) {
    console.warn("VOID_P2P_RETIRED_PEER_V1_HEALTHY_CLEANUP_FAILURE_VISIBLE", error);
  }
  if (legacyListener) await new Promise<void>((resolve) => legacyListener!.close(() => resolve()));
  if (retiredTorSocksListener) {
    await new Promise<void>((resolve) => retiredTorSocksListener!.close(() => resolve()));
  }
  fs.rmSync(root, { recursive: true, force: true });
}
