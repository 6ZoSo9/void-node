#!/usr/bin/env node
// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025-2026 6ZoSo9

import assert from "node:assert/strict";
import crypto from "node:crypto";
import { EventEmitter } from "node:events";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { Node } from "../dist/node_core.js";
import {
  authenticatedDuplicateConnectionIdV1,
} from "../dist/p2p/authenticated_duplicate_arbitration_v1.js";
import {
  VOID_P2P_AUTHENTICATED_RECONNECT_MAX_BACKOFF_MS_V1,
  VOID_P2P_AUTHENTICATED_RECONNECT_MIN_BACKOFF_MS_V1,
  VOID_P2P_AUTHENTICATED_SESSION_STABLE_MS_V1,
  decideVoidP2PAuthenticatedReconnectV1,
} from "../dist/p2p/authenticated_reconnect_backoff_v1.js";

const MARKER =
  "VOID_P2P_AUTHENTICATED_DUPLICATE_RUNTIME_LIFECYCLE_V1_PROOF_GREEN";

function makeKeypair() {
  const { privateKey, publicKey } =
    crypto.generateKeyPairSync("ed25519");
  const pubPEM = publicKey
    .export({ type: "spki", format: "pem" })
    .toString();
  const nodeId = crypto
    .createHash("sha256")
    .update(pubPEM)
    .digest("hex")
    .slice(0, 32);
  return { privateKey, publicKey, pubPEM, nodeId };
}

function decodeFrameType(frame) {
  assert.ok(Buffer.isBuffer(frame), "frame must be a Buffer");
  assert.ok(frame.length >= 4, "frame is shorter than its prefix");
  const length = frame.readUInt32BE(0);
  assert.equal(frame.length, 4 + length, "non-exact frame");
  return String(
    JSON.parse(frame.subarray(4).toString("utf8"))?.type || "",
  );
}

class ControlledPeerSocket extends EventEmitter {
  constructor(label, localPort, remotePort) {
    super();
    this.label = label;
    this.localAddress = "127.0.0.1";
    this.localPort = localPort;
    this.remoteAddress = "127.0.0.1";
    this.remotePort = remotePort;
    this.destroyed = false;
    this.writableLength = 0;
    this.peer = undefined;
    this.inboundFrames = [];
    this.closeEmitted = false;
  }

  write(data) {
    assert.equal(this.destroyed, false, `${this.label}: write after destroy`);
    assert.ok(this.peer, `${this.label}: peer is not linked`);
    this.peer.inboundFrames.push(Buffer.from(data));
    return true;
  }

  deliver(type) {
    assert.equal(this.destroyed, false, `${this.label}: deliver after destroy`);
    const index = this.inboundFrames.findIndex(
      (frame) => decodeFrameType(frame) === type,
    );
    assert.notEqual(
      index,
      -1,
      `${this.label}: missing ${type}; queued=${this.inboundFrames
        .map(decodeFrameType)
        .join(",")}`,
    );
    const [frame] = this.inboundFrames.splice(index, 1);
    this.emit("data", frame);
  }

  emitCloseOnce() {
    if (this.closeEmitted) return;
    this.closeEmitted = true;
    this.emit("close");
  }

  destroy(error) {
    if (this.destroyed) return this;
    this.destroyed = true;
    queueMicrotask(() => {
      if (error) this.emit("error", error);
      this.emitCloseOnce();
    });

    const remote = this.peer;
    if (remote && !remote.destroyed) {
      // Delay remote FIN propagation so both endpoints can deliberately
      // authenticate the two physical connections in opposite orders.
      queueMicrotask(() => {
        if (!remote.destroyed) remote.destroyed = true;
        remote.emitCloseOnce();
      });
    }
    return this;
  }
}

function makeSocketPair(label, aPort, bPort) {
  const a = new ControlledPeerSocket(`${label}:a`, aPort, bPort);
  const b = new ControlledPeerSocket(`${label}:b`, bPort, aPort);
  a.peer = b;
  b.peer = a;
  return { label, a, b };
}

function makeNode(root, label, listenPort) {
  process.env.DATA_DIR = path.join(root, label);
  const node = new Node(0, makeKeypair());
  node.listenAddrs.push(`127.0.0.1:${listenPort}`);
  return node;
}

function peerBySocket(node, socket) {
  const matches = [...node.peers.values()].filter(
    (peer) => peer.socket === socket,
  );
  assert.equal(matches.length, 1, "socket must map to one temporary peer");
  return matches[0];
}

function authenticatedRoute(node, remoteNodeId) {
  const peer = node.peers.get(remoteNodeId);
  assert.ok(peer, `missing authenticated route to ${remoteNodeId}`);
  assert.equal(peer.handshakeDone, true);
  assert.equal(peer.id, remoteNodeId);
  assert.equal(peer.socket.destroyed, false);
  return peer;
}

async function settle(rounds = 8) {
  for (let index = 0; index < rounds; index += 1) {
    await new Promise((resolve) => setImmediate(resolve));
  }
}

function cleanup(nodes, pairs, root) {
  for (const node of nodes) {
    node.stopping = true;
    for (const peer of node.peers.values()) {
      peer.suppressReconnect = true;
    }
  }
  for (const pair of pairs) {
    pair.a.destroy();
    pair.b.destroy();
  }
  fs.rmSync(root, { recursive: true, force: true });
}

function proveMonotonicReconnectPolicy() {
  let previousBackoffMs;
  const observedDelays = [];
  for (let index = 0; index < 7; index += 1) {
    const decision = decideVoidP2PAuthenticatedReconnectV1({
      previousBackoffMs,
      authenticatedDurationMs: 1,
    });
    observedDelays.push(decision.delay_ms);
    previousBackoffMs = decision.next_backoff_ms;
    assert.equal(decision.stable_authenticated_session, false);
    assert.equal(decision.authenticated_duration_valid, true);
  }
  assert.deepEqual(
    observedDelays,
    [500, 1_000, 2_000, 4_000, 8_000, 15_000, 15_000],
  );

  const originalDateNow = Date.now;
  try {
    Date.now = () => 9_999_999_999_999;
    const forwardJump = decideVoidP2PAuthenticatedReconnectV1({
      previousBackoffMs:
        VOID_P2P_AUTHENTICATED_RECONNECT_MAX_BACKOFF_MS_V1,
      authenticatedDurationMs: 1,
    });
    assert.equal(forwardJump.stable_authenticated_session, false);
    assert.equal(
      forwardJump.delay_ms,
      VOID_P2P_AUTHENTICATED_RECONNECT_MAX_BACKOFF_MS_V1,
    );

    Date.now = () => 0;
    const backwardJump = decideVoidP2PAuthenticatedReconnectV1({
      previousBackoffMs:
        VOID_P2P_AUTHENTICATED_RECONNECT_MAX_BACKOFF_MS_V1,
      authenticatedDurationMs: 1,
    });
    assert.equal(backwardJump.stable_authenticated_session, false);
    assert.equal(
      backwardJump.delay_ms,
      VOID_P2P_AUTHENTICATED_RECONNECT_MAX_BACKOFF_MS_V1,
    );
  } finally {
    Date.now = originalDateNow;
  }

  const justShort = decideVoidP2PAuthenticatedReconnectV1({
    previousBackoffMs:
      VOID_P2P_AUTHENTICATED_RECONNECT_MAX_BACKOFF_MS_V1,
    authenticatedDurationMs:
      VOID_P2P_AUTHENTICATED_SESSION_STABLE_MS_V1 - 1,
  });
  assert.equal(justShort.stable_authenticated_session, false);
  assert.equal(
    justShort.delay_ms,
    VOID_P2P_AUTHENTICATED_RECONNECT_MAX_BACKOFF_MS_V1,
  );

  const stable = decideVoidP2PAuthenticatedReconnectV1({
    previousBackoffMs:
      VOID_P2P_AUTHENTICATED_RECONNECT_MAX_BACKOFF_MS_V1,
    authenticatedDurationMs:
      VOID_P2P_AUTHENTICATED_SESSION_STABLE_MS_V1,
  });
  assert.equal(stable.stable_authenticated_session, true);
  assert.equal(
    stable.delay_ms,
    VOID_P2P_AUTHENTICATED_RECONNECT_MIN_BACKOFF_MS_V1,
  );

  for (const malformed of [undefined, -1, Number.NaN, Infinity, "30000"]) {
    const decision = decideVoidP2PAuthenticatedReconnectV1({
      previousBackoffMs: undefined,
      authenticatedDurationMs: malformed,
    });
    assert.equal(decision.authenticated_duration_valid, false);
    assert.equal(decision.stable_authenticated_session, false);
    assert.equal(
      decision.delay_ms,
      VOID_P2P_AUTHENTICATED_RECONNECT_MAX_BACKOFF_MS_V1,
      "malformed monotonic evidence did not fail slow",
    );
  }

  const source = fs.readFileSync("src/node_core.ts", "utf8");
  assert.ok(
    source.includes('import { performance } from "node:perf_hooks";'),
    "Node runtime does not import one monotonic process clock",
  );
  assert.ok(
    source.includes(
      "peer.authenticatedAtMonotonicMs = performance.now()",
    ),
    "authentication does not bind monotonic admission time",
  );
  assert.ok(
    source.includes("const closedAtMonotonicMs = performance.now()"),
    "close does not read the same monotonic clock",
  );
  assert.equal(
    source.includes("peer.authenticatedAtMs = Date.now()"),
    false,
    "wall clock still controls authenticated stability",
  );
  assert.equal(
    source.includes("closedAtMs: Date.now()"),
    false,
    "wall clock still controls reconnect reset",
  );
}

async function proveTwoEndpointConvergence() {
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), "void-p2p-two-endpoint-runtime-v1-"),
  );
  const oldDataDir = process.env.DATA_DIR;
  const nodeA = makeNode(root, "a", 47101);
  const nodeB = makeNode(root, "b", 47102);
  const pairs = [
    makeSocketPair("connection-1", 55101, 47102),
    makeSocketPair("connection-2", 55102, 47102),
  ];

  let reconnectCallsA = 0;
  let reconnectCallsB = 0;
  const cleanupCallsA = [];
  const cleanupCallsB = [];

  nodeA.connect = () => {
    reconnectCallsA += 1;
  };
  nodeB.connect = () => {
    reconnectCallsB += 1;
  };

  const originalCleanupA = nodeA.handlePeerTransportClose;
  const originalCleanupB = nodeB.handlePeerTransportClose;
  nodeA.handlePeerTransportClose = function (peer) {
    cleanupCallsA.push({
      peer_id: peer.id,
      current_route: this.peers.get(peer.id) === peer,
    });
    return originalCleanupA.call(this, peer);
  };
  nodeB.handlePeerTransportClose = function (peer) {
    cleanupCallsB.push({
      peer_id: peer.id,
      current_route: this.peers.get(peer.id) === peer,
    });
    return originalCleanupB.call(this, peer);
  };

  try {
    for (const pair of pairs) {
      nodeA.attachSocket(
        pair.a,
        `127.0.0.1:${pair.a.remotePort}`,
        true,
        nodeB.id,
        nodeB.listenAddrs[0],
      );
      nodeB.attachSocket(
        pair.b,
        `127.0.0.1:${pair.b.remotePort}`,
        false,
      );
    }

    const records = pairs.map((pair) => ({
      pair,
      peerA: peerBySocket(nodeA, pair.a),
      peerB: peerBySocket(nodeB, pair.b),
    }));

    // HELLO on both endpoints queues real signed AUTH frames generated by the
    // actual auth_v1 runtime contract.
    for (const record of records) {
      record.pair.a.deliver("HELLO");
      record.pair.b.deliver("HELLO");
      assert.ok(record.peerA.remoteHello);
      assert.ok(record.peerB.remoteHello);

      record.connectionIdA =
        authenticatedDuplicateConnectionIdV1(
          record.peerA.localChallenge,
          record.peerA.remoteHello.challenge,
        );
      record.connectionIdB =
        authenticatedDuplicateConnectionIdV1(
          record.peerB.localChallenge,
          record.peerB.remoteHello.challenge,
        );
      assert.equal(
        record.connectionIdA,
        record.connectionIdB,
        "endpoints derived different physical-connection identities",
      );
    }

    records.sort((left, right) =>
      left.connectionIdA.localeCompare(right.connectionIdA),
    );
    const low = records[0];
    const high = records[1];
    assert.ok(low.connectionIdA < high.connectionIdA);

    // Opposite authentication order:
    // A first mounts the high-ID connection; B first mounts the low-ID
    // connection. A must replace; B must reject. Both must retain low.
    high.pair.a.deliver("AUTH");
    low.pair.b.deliver("AUTH");
    low.pair.a.deliver("AUTH");
    high.pair.b.deliver("AUTH");

    await settle();

    assert.equal(
      [...nodeA.peers.values()].filter((peer) => peer.handshakeDone).length,
      1,
    );
    assert.equal(
      [...nodeB.peers.values()].filter((peer) => peer.handshakeDone).length,
      1,
    );
    assert.equal(
      [...nodeA.peers.keys()].some((id) => id.startsWith("?-")),
      false,
    );
    assert.equal(
      [...nodeB.peers.keys()].some((id) => id.startsWith("?-")),
      false,
    );

    const routeA = authenticatedRoute(nodeA, nodeB.id);
    const routeB = authenticatedRoute(nodeB, nodeA.id);
    assert.equal(routeA.authenticatedConnectionId, low.connectionIdA);
    assert.equal(routeB.authenticatedConnectionId, low.connectionIdA);
    assert.equal(routeA.socket.peer, routeB.socket);
    assert.equal(routeB.socket.peer, routeA.socket);
    assert.equal(routeA.outbound, true);
    assert.equal(routeB.outbound, false);

    // The two loser closes are stale/unauthenticated generations, not current
    // identity owners. They may not clear survivor-wide routing state.
    assert.deepEqual(cleanupCallsA, []);
    assert.deepEqual(cleanupCallsB, []);

    await new Promise((resolve) => setTimeout(resolve, 650));
    assert.equal(reconnectCallsA, 0);
    assert.equal(reconnectCallsB, 0);
    assert.equal(nodeA.peers.get(nodeB.id), routeA);
    assert.equal(nodeB.peers.get(nodeA.id), routeB);

    return {
      winner: low.connectionIdA,
      reconnectCallsA,
      reconnectCallsB,
    };
  } finally {
    nodeA.handlePeerTransportClose = originalCleanupA;
    nodeB.handlePeerTransportClose = originalCleanupB;
    cleanup([nodeA, nodeB], pairs, root);
    if (oldDataDir === undefined) delete process.env.DATA_DIR;
    else process.env.DATA_DIR = oldDataDir;
    await settle();
  }
}

proveMonotonicReconnectPolicy();
const convergence = await proveTwoEndpointConvergence();

console.log(MARKER);
console.log("actual_node_attach_socket_path=true");
console.log("actual_auth_v1_hello_auth_contract=true");
console.log("controlled_peer_socket_lifecycle=true");
console.log("real_tcp_transport_used=false");
console.log("two_same_direction_physical_connections=true");
console.log("reversed_endpoint_authentication_order=true");
console.log("same_physical_socket_convergence=true");
console.log("temporary_peer_cleanup=true");
console.log("persistent_authenticated_route_count_per_endpoint=1");
console.log("duplicate_loser_identity_cleanup_calls=0");
console.log("duplicate_loser_reconnect_calls=0");
console.log("authenticated_stability_clock=monotonic");
console.log("wall_clock_forward_jump_resets_backoff=false");
console.log("wall_clock_backward_jump_resets_backoff=false");
console.log("malformed_monotonic_duration_fails_slow=true");
console.log(`winning_connection_id=${convergence.winner}`);
