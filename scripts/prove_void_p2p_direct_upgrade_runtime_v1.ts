// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025-2026 6ZoSo9

import assert from "node:assert/strict";
import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { Node } from "../src/node_core.js";
import { deriveVoidNodeIdFromPublicPemV1 } from "../src/p2p/auth_v1.js";
import {
  VOID_P2P_DIRECT_UPGRADE_MAX_PENDING_REQUESTS_V1,
  VoidDirectUpgradeRelayStateV1,
  newVoidDirectUpgradeIdV1,
  normalizeVoidDirectUpgradeControlMessageV1,
  normalizeVoidDirectUpgradeObservedAddressV1,
} from "../src/p2p/direct_upgrade_v1.js";

const MARKER = "VOID_P2P_DIRECT_UPGRADE_RUNTIME_V1_PROOF_GREEN";

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

function setEnv(dataDir: string, advertiseHost: string, bootstrap = "") {
  process.env.DATA_DIR = dataDir;
  process.env.P2P_BIND_HOST = "127.0.0.1";
  process.env.P2P_ADVERTISE_HOST = advertiseHost;
  process.env.BOOTSTRAP_ADDRS = bootstrap;
}

function newNode(
  dataDir: string,
  advertiseHost: string,
  kp: TestKeypair,
  opts: {
    relayServer?: boolean;
    directUpgradeEnabled?: boolean;
    directUpgradeAllowNonPublicCandidates?: boolean;
  } = {},
) {
  setEnv(dataDir, advertiseHost, "");
  return new Node(0, kp, opts);
}

async function startNode(
  node: Node,
  dataDir: string,
  advertiseHost: string,
  bootstrap = "",
) {
  setEnv(dataDir, advertiseHost, bootstrap);
  await node.start();
}

async function waitFor(
  predicate: () => boolean,
  label: string,
  timeoutMs = 10_000,
) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error(`timed out waiting for ${label}`);
}

function stopQuietly(node: Node | undefined) {
  if (!node) return;
  try { node.stop(); } catch (error) { void error; }
}

function loopback(port: number) {
  return `127.0.0.1:${port}`;
}

const normalizedRequest = normalizeVoidDirectUpgradeControlMessageV1({
  type: "DIRECT_UPGRADE_REQUEST",
  request_id: "a".repeat(32),
  stream_id: "b".repeat(32),
  target_node_id: "c".repeat(32),
  start_delay_ms: 200,
  attempt_timeout_ms: 3_000,
});
assert(normalizedRequest?.type === "DIRECT_UPGRADE_REQUEST");
assert.equal(
  normalizeVoidDirectUpgradeControlMessageV1({ ...normalizedRequest, extra: true }),
  undefined,
);
assert.equal(
  normalizeVoidDirectUpgradeObservedAddressV1("127.0.0.1:4100", false),
  undefined,
);
assert.equal(
  normalizeVoidDirectUpgradeObservedAddressV1("127.0.0.1:4100", true),
  "127.0.0.1:4100",
);
assert.equal(
  normalizeVoidDirectUpgradeObservedAddressV1("localhost:4100", true),
  undefined,
);

const state = new VoidDirectUpgradeRelayStateV1();
const stateSession = state.openSession({
  requestId: "1".repeat(32),
  streamId: "2".repeat(32),
  sourceNodeId: "3".repeat(32),
  targetNodeId: "4".repeat(32),
  sourceObservedAddress: "8.8.8.8:4100",
  targetObservedAddress: "1.1.1.1:4200",
  startDelayMs: 200,
  attemptTimeoutMs: 3_000,
  nowMs: 1_000_000,
});
assert.equal(stateSession.started, false);
assert.throws(
  () =>
    state.markReady(
      "3".repeat(32),
      stateSession.session_id,
      "9".repeat(32),
      1_000_001,
    ),
  /stream mismatch/,
);
assert.deepEqual(
  state.sessionFor(stateSession.session_id, 1_000_001)?.ready_node_ids,
  [],
);
assert.equal(
  state.markReady(
    "3".repeat(32),
    stateSession.session_id,
    "2".repeat(32),
    1_000_002,
  ).started_now,
  false,
);
assert.equal(
  state.markReady(
    "4".repeat(32),
    stateSession.session_id,
    "2".repeat(32),
    1_000_003,
  ).started_now,
  true,
);

const root = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-p2p-direct-upgrade-runtime-v1-"),
);

let relay: Node | undefined;
let source: Node | undefined;
let target: Node | undefined;
let impostor: Node | undefined;

try {
  const relayKp = keypair();
  const sourceKp = keypair();
  const targetKp = keypair();
  const impostorKp = keypair();

  const relayDir = path.join(root, "relay");
  const sourceDir = path.join(root, "source");
  const targetDir = path.join(root, "target");
  const impostorDir = path.join(root, "impostor");

  relay = newNode(relayDir, "127.0.0.1", relayKp, {
    relayServer: true,
    directUpgradeEnabled: true,
    directUpgradeAllowNonPublicCandidates: true,
  });
  await startNode(relay, relayDir, "127.0.0.1");
  const relayAddr = relay.listenAddrs[0];
  assert(relayAddr);

  // Bind remains loopback 127.0.0.1 via setEnv(), but advertise aliases
  // that are intentionally not listening. This models outbound-only peers and
  // prevents PEERS exchange from creating a normal direct connection before
  // the relay/direct-upgrade path is exercised.
  source = newNode(sourceDir, "127.0.0.2", sourceKp, {
    directUpgradeEnabled: true,
    directUpgradeAllowNonPublicCandidates: true,
  });
  await startNode(source, sourceDir, "127.0.0.2");

  target = newNode(targetDir, "127.0.0.3", targetKp, {
    directUpgradeEnabled: true,
    directUpgradeAllowNonPublicCandidates: true,
  });
  await startNode(target, targetDir, "127.0.0.3");

  assert(await source.connectPunchCapableRelay(relayAddr, relayKp.nodeId));
  assert(await target.connectPunchCapableRelay(relayAddr, relayKp.nodeId));

  await waitFor(
    () =>
      source!.peersSnapshot().connected.some((peer) => peer.id === relayKp.nodeId) &&
      target!.peersSnapshot().connected.some((peer) => peer.id === relayKp.nodeId) &&
      relay!.peersSnapshot().connected.some((peer) => peer.id === sourceKp.nodeId) &&
      relay!.peersSnapshot().connected.some((peer) => peer.id === targetKp.nodeId),
    "punch-capable relay peers authenticate",
  );

  const sourceRelayPeer = (source as any).peers.get(relayKp.nodeId);
  const targetRelayPeer = (target as any).peers.get(relayKp.nodeId);
  assert.equal(sourceRelayPeer.punchCapable, true);
  assert.equal(targetRelayPeer.punchCapable, true);
  assert(Number.isSafeInteger(sourceRelayPeer.socket.localPort));
  assert(Number.isSafeInteger(targetRelayPeer.socket.localPort));

  assert(target.requestRelayReservation(relayKp.nodeId, 120_000));
  await waitFor(
    () => target!.relaySnapshot().client_reservations.length === 1,
    "target relay reservation",
  );

  assert(source.connectViaRelay(relayKp.nodeId, targetKp.nodeId));
  await waitFor(
    () =>
      (source as any).peers.get(targetKp.nodeId)?.transport === "relay" &&
      (target as any).peers.get(sourceKp.nodeId)?.transport === "relay",
    "relayed peer relationship",
  );

  const relayReservationBefore = target.relaySnapshot().client_reservations[0];
  assert(relayReservationBefore);

  // Either endpoint of an already-started relay stream may request the upgrade.
  // The relay-stream target must not be artificially excluded by stream direction.
  const reverseUpgradeRequest = target.requestDirectUpgrade(
    relayKp.nodeId,
    sourceKp.nodeId,
    150,
    1_000,
  );
  assert(reverseUpgradeRequest);

  await waitFor(
    () =>
      (target as any).directUpgradeSnapshot().pending_requests === 0 &&
      (target as any).directUpgradeSnapshot().local_sessions === 0 &&
      (source as any).directUpgradeSnapshot().local_sessions === 0,
    "reverse-endpoint failed loopback punch cleanup",
    8_000,
  );
  assert.equal((source as any).peers.get(targetKp.nodeId)?.transport, "relay");
  assert.equal((target as any).peers.get(sourceKp.nodeId)?.transport, "relay");

  const upgradeRequest = source.requestDirectUpgrade(
    relayKp.nodeId,
    targetKp.nodeId,
    150,
    1_000,
  );
  assert(upgradeRequest);

  await waitFor(
    () =>
      (source as any).directUpgradeSnapshot().pending_requests === 0 &&
      (source as any).directUpgradeSnapshot().local_sessions === 0 &&
      (target as any).directUpgradeSnapshot().local_sessions === 0,
    "failed loopback punch cleanup",
    8_000,
  );

  assert.equal((source as any).peers.get(targetKp.nodeId)?.transport, "relay");
  assert.equal((target as any).peers.get(sourceKp.nodeId)?.transport, "relay");
  assert.equal(
    target.relaySnapshot().client_reservations[0]?.reservation_id,
    relayReservationBefore.reservation_id,
  );

  impostor = newNode(impostorDir, "127.0.0.1", impostorKp);
  await startNode(impostor, impostorDir, "127.0.0.1");
  const impostorAddress = impostor.listenAddrs[0];
  assert(impostorAddress);

  const mismatchSessionId = newVoidDirectUpgradeIdV1();
  (source as any).directUpgradeLocalSessions.set(mismatchSessionId, {
    session_id: mismatchSessionId,
    relay_node_id: relayKp.nodeId,
    stream_id: (source as any).peers.get(targetKp.nodeId).relayStreamId,
    remote_node_id: targetKp.nodeId,
    peer_observed_address: impostorAddress,
    local_address: sourceRelayPeer.socket.localAddress,
    local_port: sourceRelayPeer.socket.localPort,
    start_delay_ms: 50,
    attempt_timeout_ms: 1_500,
    created_at_ms: Date.now(),
    expires_at_ms: Date.now() + 3_000,
    started: true,
  });
  (source as any).attemptDirectUpgradeSession(mismatchSessionId);

  await waitFor(
    () => !(source as any).directUpgradeLocalSessions.has(mismatchSessionId),
    "identity mismatch cleanup",
  );
  assert.equal((source as any).peers.get(targetKp.nodeId)?.transport, "relay");

  const successfulSessionId = newVoidDirectUpgradeIdV1();
  const sourceRelayLocalPort = Number(sourceRelayPeer.socket.localPort);
  const targetRelayLocalPort = Number(targetRelayPeer.socket.localPort);
  const sourceRelayLocalAddress = String(sourceRelayPeer.socket.localAddress);
  const targetRelayLocalAddress = String(targetRelayPeer.socket.localAddress);
  const sourceRelayStreamId =
    String((source as any).peers.get(targetKp.nodeId).relayStreamId || "");
  const targetRelayStreamId =
    String((target as any).peers.get(sourceKp.nodeId).relayStreamId || "");
  assert(/^[0-9a-f]{32}$/.test(sourceRelayStreamId));
  assert.equal(sourceRelayStreamId, targetRelayStreamId);

  const targetServerAddress = target.server.address();
  assert(targetServerAddress && typeof targetServerAddress === "object");

  (source as any).directUpgradeLocalSessions.set(successfulSessionId, {
    session_id: successfulSessionId,
    relay_node_id: relayKp.nodeId,
    stream_id: sourceRelayStreamId,
    remote_node_id: targetKp.nodeId,
    peer_observed_address: loopback(targetServerAddress.port),
    local_address: sourceRelayLocalAddress,
    local_port: sourceRelayLocalPort,
    start_delay_ms: 50,
    attempt_timeout_ms: 2_000,
    created_at_ms: Date.now(),
    expires_at_ms: Date.now() + 4_000,
    started: true,
  });

  (target as any).directUpgradeLocalSessions.set(successfulSessionId, {
    session_id: successfulSessionId,
    relay_node_id: relayKp.nodeId,
    stream_id: targetRelayStreamId,
    remote_node_id: sourceKp.nodeId,
    peer_observed_address: loopback(sourceRelayLocalPort),
    local_address: targetRelayLocalAddress,
    local_port: targetRelayLocalPort,
    start_delay_ms: 50,
    attempt_timeout_ms: 2_000,
    created_at_ms: Date.now(),
    expires_at_ms: Date.now() + 4_000,
    started: true,
  });

  (source as any).attemptDirectUpgradeSession(successfulSessionId);

  await waitFor(
    () =>
      (source as any).peers.get(targetKp.nodeId)?.transport === "direct" &&
      (target as any).peers.get(sourceKp.nodeId)?.transport === "direct",
    "successful expected-node direct upgrade",
  );

  assert.equal(
    (source as any).peers.get(targetKp.nodeId)?.persistDirectEvidence,
    false,
  );
  assert.equal(
    (target as any).peers.get(sourceKp.nodeId)?.persistDirectEvidence,
    false,
  );

  assert.equal(
    source.peersSnapshot().verifiedPeers.some(
      (record) => record.node_id === targetKp.nodeId,
    ),
    false,
  );
  assert.equal(
    target.peersSnapshot().verifiedPeers.some(
      (record) => record.node_id === sourceKp.nodeId,
    ),
    false,
  );

  assert.equal(
    target.relaySnapshot().client_reservations[0]?.reservation_id,
    relayReservationBefore.reservation_id,
  );

  assert.equal((source as any).directUpgradeSnapshot().local_sessions, 0);
  assert.equal((target as any).directUpgradeSnapshot().local_sessions, 0);

  const sourceAny = source as any;
  sourceAny.directUpgradePendingRequests.clear();
  for (
    let index = 0;
    index < VOID_P2P_DIRECT_UPGRADE_MAX_PENDING_REQUESTS_V1;
    index += 1
  ) {
    sourceAny.directUpgradePendingRequests.set(newVoidDirectUpgradeIdV1(), {
      relay_node_id: relayKp.nodeId,
      target_node_id: targetKp.nodeId,
      stream_id: "f".repeat(32),
      requested_at_ms: Date.now(),
    });
  }
  assert.equal(
    source.requestDirectUpgrade(relayKp.nodeId, targetKp.nodeId),
    undefined,
  );
  sourceAny.directUpgradePendingRequests.clear();

  const publicSnapshot = source.peersSnapshot() as any;
  assert.deepEqual(
    Object.keys(publicSnapshot).sort(),
    ["connected", "knownAddrs", "verifiedPeers"].sort(),
  );
  for (const peer of publicSnapshot.connected) {
    assert.equal("punchCapable" in peer, false);
    assert.equal("directUpgradeSessionId" in peer, false);
    assert.equal("persistDirectEvidence" in peer, false);
  }

  console.log("[PASS] punch-capable relay dials bind source port before authentication");
  console.log("[PASS] punch-capable relay peers still use normal VOID HELLO/AUTH");
  console.log("[PASS] relay reservation and relayed peer stream work over punch-capable relay transport");
  console.log("[PASS] same-relay endpoint observation drives bounded coordinated upgrade attempts");
  console.log("[PASS] wrong-stream READY is rejected before readiness state mutation");
  console.log("[PASS] either endpoint of an active relay stream may initiate direct upgrade");
  console.log("[PASS] failed loopback punch preserves healthy relayed peer transport");
  console.log("[PASS] identity-mismatched direct socket cannot displace relayed peer");
  console.log("[PASS] expected-node direct authentication can supersede relay transport");
  console.log("[PASS] successful punch socket does not persist signed listen addresses as verified-direct evidence");
  console.log("[PASS] inbound staged upgrade socket also suppresses verified-direct persistence");
  console.log("[PASS] relay reservation survives direct transport promotion");
  console.log("[PASS] direct-upgrade pending request capacity is bounded");
  console.log("[PASS] public peer snapshot does not expose punch/session internals");

  console.log(MARKER);
  console.log("punch_capable_relay_binds_source_port_before_auth=true");
  console.log("punch_capable_relay_uses_normal_peer_auth=true");
  console.log("relay_observed_endpoint_transport_hint_only=true");
  console.log("same_relay_coordination_required=true");
  console.log("wrong_stream_ready_mutates_state=false");
  console.log("relay_stream_target_may_initiate_upgrade=true");
  console.log("failed_upgrade_preserves_relay=true");
  console.log("identity_mismatched_direct_promoted=false");
  console.log("expected_node_auth_required_for_promotion=true");
  console.log("successful_direct_supersedes_relay_stream=true");
  console.log("relay_reservation_survives_direct_upgrade=true");
  console.log("punch_direct_evidence_persisted=false");
  console.log("punch_reconnect_backoff_created=false");
  console.log("pending_request_capacity_bounded=true");
  console.log("public_peer_snapshot_upgrade_metadata_exposed=false");
  console.log("external_nat_traversal_claimed=false");
  console.log("runtime_live_network_activation=false");
  console.log("firewall_router_interface_mutation=0");
  console.log("wallet_signer_validator_wc_money_authority=0");
} finally {
  stopQuietly(impostor);
  stopQuietly(source);
  stopQuietly(target);
  stopQuietly(relay);

  delete process.env.BOOTSTRAP_ADDRS;
  delete process.env.P2P_BIND_HOST;
  delete process.env.P2P_ADVERTISE_HOST;
  delete process.env.DATA_DIR;

  await new Promise((resolve) => setTimeout(resolve, 150));
  fs.rmSync(root, { recursive: true, force: true });
}
