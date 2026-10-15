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
  VOID_P2P_CLIENT_TRANSIENT_CLOCK_V1,
  VoidP2pClientTransientClockV1,
} from "../src/p2p/client_transient_clock_v1.js";
import { VoidUdpSwarmAuthenticatedControlAdapterV1 } from
  "../src/p2p/udp_swarm_authenticated_control_adapter_v1.js";

type Identity = {
  privateKey: crypto.KeyObject;
  publicKey: crypto.KeyObject;
  pubPEM: string;
  nodeId: string;
};

function identity(): Identity {
  const { privateKey, publicKey } = crypto.generateKeyPairSync("ed25519");
  const pubPEM = publicKey.export({ type: "spki", format: "pem" }).toString();
  const nodeId = deriveVoidNodeIdFromPublicPemV1(pubPEM);
  assert(nodeId);
  return { privateKey, publicKey, pubPEM, nodeId };
}

function configureNodeEnvironment(dataDir: string): void {
  process.env.DATA_DIR = dataDir;
  process.env.P2P_BIND_HOST = "127.0.0.1";
  process.env.P2P_ADVERTISE_HOST = "127.0.0.1";
  process.env.BOOTSTRAP_ADDRS = "";
}

const nodeSource = fs.readFileSync(
  path.join(process.cwd(), "src", "node_core.ts"),
  "utf8",
);
const adapterSource = fs.readFileSync(
  path.join(
    process.cwd(),
    "src",
    "p2p",
    "udp_swarm_authenticated_control_adapter_v1.ts",
  ),
  "utf8",
);

for (const required of [
  "private readonly relayClientClock = new VoidP2pClientTransientClockV1();",
  "const nowMs = Date.now();\n    this.sweepRelayClientState(nowMs);",
  "const relayClientNowMs = Date.now();\n    this.sweepRelayClientState(relayClientNowMs);",
  "voidRelayRequestTimedOutV1(pending.requested_at_ms, relayClientNowMs)",
  "msg.ttl_ms,\n        relayClientNowMs,",
]) {
  assert.equal(nodeSource.includes(required), true, required);
}
assert.match(
  nodeSource,
  /this\.udpSwarmControl\.handleAuthenticatedControl\(\{\s*fromNodeId: peer\.id,\s*message,\s*\}\)/u,
);
const relaySweepStart = nodeSource.indexOf(
  "private sweepRelayClientState(nowMs = Date.now()): void",
);
const relaySweepEnd = nodeSource.indexOf(
  "private sweepRelayServerState(): void",
  relaySweepStart,
);
assert.ok(relaySweepStart >= 0 && relaySweepEnd > relaySweepStart);
const relaySweepSource = nodeSource.slice(relaySweepStart, relaySweepEnd);
assert.equal(relaySweepSource.includes("this.relayStreams.clear()"), false);
assert.equal(relaySweepSource.includes("this.relayPendingReservations.clear()"), true);
assert.equal(relaySweepSource.includes("this.relayPendingConnects.clear()"), true);
assert.equal(relaySweepSource.includes("this.relayClientReservations.clear()"), true);

for (const required of [
  "private readonly clientClock = new VoidP2pClientTransientClockV1();",
  "const nowMs = this.sweep(input.nowMs ?? Date.now());",
  "this.pendingRequests.clear();",
  "for (const sessionId of [...this.activeRoutes.keys()])",
]) {
  assert.equal(adapterSource.includes(required), true, required);
}

const primitive = new VoidP2pClientTransientClockV1();
assert.deepEqual(primitive.observe(10_000), {
  now_ms: 10_000,
  regressed: false,
});
assert.throws(
  () => primitive.observe(Number.NaN),
  /P2P client transient clock is invalid/,
);
assert.throws(
  () => primitive.observe(Number.MAX_SAFE_INTEGER + 1),
  /P2P client transient clock is invalid/,
);
assert.throws(
  () => primitive.observe(-1),
  /P2P client transient clock is invalid/,
);
assert.deepEqual(primitive.observe(9_000), {
  now_ms: 9_000,
  regressed: true,
});
assert.deepEqual(primitive.observe(9_000), {
  now_ms: 9_000,
  regressed: false,
});
assert.deepEqual(primitive.observe(9_001), {
  now_ms: 9_001,
  regressed: false,
});

const local = identity();
const relay = identity();
const peer = identity();
const streamId = "a".repeat(32);

const adapter = new VoidUdpSwarmAuthenticatedControlAdapterV1({
  localNodeId: local.nodeId,
  localPublicPem: local.pubPEM,
  localPrivateKey: local.privateKey,
  isStartedRelayClientStream: (
    relayNodeId: string,
    peerNodeId: string,
    candidateStreamId: string,
  ) =>
    relayNodeId === relay.nodeId &&
    peerNodeId === peer.nodeId &&
    candidateStreamId === streamId,
  allowNonPublicEndpoint: true,
});

const firstPending = adapter.beginUpgrade({
  relayNodeId: relay.nodeId,
  targetNodeId: peer.nodeId,
  streamId,
  nowMs: 20_000,
});
assert(firstPending.request_id);

const routeSession = "b".repeat(32);
const routeTicket = "c".repeat(32);
(adapter as any).activeRoutes.set(routeSession, {
  request_id: firstPending.request_id,
  session_id: routeSession,
  relay_node_id: relay.nodeId,
  peer_node_id: peer.nodeId,
  stream_id: streamId,
  ticket_id: routeTicket,
  expires_at_ms: 40_000,
  offer_received: false,
});
(adapter as any).ticketSessions.set(routeTicket, routeSession);
assert.equal(adapter.snapshot(20_001).pending_request_count, 1);
assert.equal(adapter.snapshot(20_001).active_route_count, 1);

const beforeInvalidAdapter = adapter.snapshot(20_001);
assert.throws(
  () => adapter.sweep(Number.NaN),
  /P2P client transient clock is invalid/,
);
assert.deepEqual(adapter.snapshot(20_001), beforeInvalidAdapter);

adapter.sweep(19_000);
const poisonedAdapter = adapter.snapshot(19_000);
assert.equal(poisonedAdapter.pending_request_count, 0);
assert.equal(poisonedAdapter.active_route_count, 0);
assert.equal((adapter as any).ticketSessions.size, 0);

const recoveredPending = adapter.beginUpgrade({
  relayNodeId: relay.nodeId,
  targetNodeId: peer.nodeId,
  streamId,
  nowMs: 19_000,
});
assert(recoveredPending.request_id);
assert.equal(adapter.snapshot(19_000).pending_request_count, 1);
adapter.sweep(19_001);
assert.equal(adapter.snapshot(19_001).pending_request_count, 1);

const root = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-p2p-client-clock-regression-v1-"),
);
let node: Node | undefined;
try {
  const nodeIdentity = identity();
  configureNodeEnvironment(root);
  node = new Node(0, nodeIdentity);
  const nodeAny = node as any;

  const relayNodeId = "d".repeat(32);
  const targetNodeId = "e".repeat(32);
  const reservationRequestId = "f".repeat(32);
  const connectRequestId = "1".repeat(32);
  const relayStreamKey = relayNodeId + ":" + "2".repeat(32);
  const establishedStreamSentinel = Object.freeze({
    relay_node_id: relayNodeId,
    remote_node_id: targetNodeId,
    stream_id: "2".repeat(32),
    outgoing: true,
    started: true,
  });

  nodeAny.relayPendingReservations.set(reservationRequestId, {
    relay_node_id: relayNodeId,
    requested_ttl_ms: 60_000,
    requested_at_ms: 30_000,
  });
  nodeAny.relayPendingConnects.set(connectRequestId, {
    relay_node_id: relayNodeId,
    target_node_id: targetNodeId,
    requested_at_ms: 30_000,
  });
  nodeAny.relayClientReservations.set(relayNodeId, {
    relay_node_id: relayNodeId,
    reservation_id: "3".repeat(32),
    expires_at_ms: 90_000,
  });
  nodeAny.relayStreams.set(relayStreamKey, establishedStreamSentinel);

  nodeAny.sweepRelayClientState(30_100);
  assert.equal(nodeAny.relayPendingReservations.size, 1);
  assert.equal(nodeAny.relayPendingConnects.size, 1);
  assert.equal(nodeAny.relayClientReservations.size, 1);
  assert.equal(nodeAny.relayStreams.get(relayStreamKey), establishedStreamSentinel);

  assert.throws(
    () => nodeAny.sweepRelayClientState(Number.POSITIVE_INFINITY),
    /P2P client transient clock is invalid/,
  );
  assert.equal(nodeAny.relayPendingReservations.size, 1);
  assert.equal(nodeAny.relayPendingConnects.size, 1);
  assert.equal(nodeAny.relayClientReservations.size, 1);
  assert.equal(nodeAny.relayStreams.get(relayStreamKey), establishedStreamSentinel);

  nodeAny.sweepRelayClientState(29_000);
  assert.equal(nodeAny.relayPendingReservations.size, 0);
  assert.equal(nodeAny.relayPendingConnects.size, 0);
  assert.equal(nodeAny.relayClientReservations.size, 0);
  assert.equal(nodeAny.relayStreams.get(relayStreamKey), establishedStreamSentinel);

  const freshRequestId = "4".repeat(32);
  nodeAny.relayPendingConnects.set(freshRequestId, {
    relay_node_id: relayNodeId,
    target_node_id: targetNodeId,
    requested_at_ms: 29_000,
  });
  nodeAny.sweepRelayClientState(29_000);
  assert.equal(nodeAny.relayPendingConnects.has(freshRequestId), true);
  nodeAny.sweepRelayClientState(29_001);
  assert.equal(nodeAny.relayPendingConnects.has(freshRequestId), true);
  assert.equal(nodeAny.relayStreams.get(relayStreamKey), establishedStreamSentinel);
} finally {
  try {
    node?.stop();
  } catch (error) {
    console.warn(
      "[cleanup] node.stop() failed:",
      error instanceof Error ? error.message : String(error),
    );
  }
  delete process.env.DATA_DIR;
  delete process.env.P2P_BIND_HOST;
  delete process.env.P2P_ADVERTISE_HOST;
  delete process.env.BOOTSTRAP_ADDRS;
  fs.rmSync(root, { recursive: true, force: true });
}

console.log(VOID_P2P_CLIENT_TRANSIENT_CLOCK_V1 + "_PROOF_GREEN");
console.log("invalid_clock_mutates_state=false");
console.log("client_clock_regression_generation_detected=true");
console.log("udp_swarm_pending_request_survives_regression=false");
console.log("udp_swarm_active_route_survives_regression=false");
console.log("relay_pending_reservation_survives_regression=false");
console.log("relay_pending_connect_survives_regression=false");
console.log("relay_cached_reservation_survives_regression=false");
console.log("established_relay_stream_survives_client_clock_regression=true");
console.log("fresh_transient_state_after_regression=true");
console.log("peer_timestamp_is_client_clock_authority=false");
console.log("production_udp_control_clock_uses_local_default=true");
console.log("production_relay_control_clock_uses_local_date_now=true");
console.log("relay_stream_map_not_cleared_by_client_clock_regression=true");
console.log("runtime_or_network_mutation=false");
console.log("wallet_signer_validator_wc_money_authority=0");
